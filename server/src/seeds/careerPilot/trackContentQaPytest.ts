/**
 * Career-track content: A pytest Test Framework (QA_PYTEST_FRAMEWORK), QA / SDET, batch QA2.
 *
 * From "a folder of pytest files" to a framework a team can grow: layers (config, transport client, service
 * client, fixtures, data, reports), configuration per environment, fixtures and scopes at scale, factories,
 * data-driven tests from CSV and JSON, property-based tests with Hypothesis, markers, pytest-xdist and reports.
 * It builds on the Python Full Stack track's pytest topic (JT_PY_TESTING: "pytest: Writing and Running Tests",
 * "Fixtures and Parametrised Tests", "Mocking and Isolating Code"), which already teaches assert, yield
 * fixtures, scope basics, conftest.py, parametrize with ids, registering markers and --strict-markers; those are
 * referred to by title, not re-taught.
 *
 * One fictional company runs through the topic: KiranaKart, a Bengaluru grocery-delivery start-up with a small
 * Flask API (carts, coupons such as DIWALI10, pincode serviceability, orders behind a slow UPI gateway stub) and
 * two planted bugs (a coupon minimum that excludes the minimum itself, and a rupee formatter that drops the
 * leading zero of the paise). Every output quoted is real output from Python 3.13 with pytest 9.1,
 * pytest-xdist 3.8, pytest-html 4.2, Hypothesis 6.170, Flask 3.1 and requests 2.34, run on an 8-core Windows
 * laptop (pytest prints Windows paths with backslashes; timings vary from run to run). Not run: Allure
 * (allure-pytest and the Allure CLI are not installed; written from their documentation and marked as such)
 * and pytest-rerunfailures (written from its documentation).
 *
 * The topic is single-skill (AUTOMATED_TESTING), so no question names a skillKey.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_QA_PYTEST_FRAMEWORK_BUNDLES: PilotBundle[] = [
  /* ── FRAMEWORK_DESIGN ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PYTEST_FRAMEWORK_FRAMEWORK_DESIGN',
    notes: `KiranaKart delivers groceries in Bengaluru and Hyderabad. Six weeks before the Diwali sale its QA team has 300 API
tests in one folder. Every file builds its own URL from a hard-coded staging host, logs in with an OTP pasted into
the code, and sleeps two seconds "for the payment to finish". Pointing the suite at the new pre-production host
took a day of search-and-replace, and nobody can add a test without copying forty lines from another one.

You can already write pytest tests, fixtures and parametrised tests ("pytest: Writing and Running Tests",
"Fixtures and Parametrised Tests"). A framework is what you add so that the 300th test is as easy to write as
the third: a few layers, one place for each decision, and conventions everyone follows.

## The layers

    kiranakart-tests/
      pytest.ini                 # how pytest runs: paths, options, markers, log level
      config/local.json          # one file per environment: base URL, timeouts,
      config/staging.json        #   test phone, a serviceable pincode (no secrets)
      framework/
        config.py                # load_settings(env) -> Settings
        clients/api_client.py    # transport: base URL, timeout, auth header, logging
        clients/shop.py          # service layer: login, new_cart, add_item, apply_coupon...
        data.py                  # load parametrised cases from CSV and JSON
      tests/
        conftest.py              # fixtures that wire the layers together
        data/coupons.csv         # cases a tester can add without writing Python
        api/test_cart.py  api/test_coupons.py  api/test_orders.py
        unit/test_money_props.py

Each layer changes for one reason. The host moves: one JSON file. The auth scheme changes: one client class.
An endpoint is added: one service method. A coupon rule is added: one CSV row. If one change forces edits in
twenty test files, a layer is missing.

**The rule for tests:** no URLs, tokens, timeouts, sleeps or raw requests calls in a test. A test reads like the
story it checks:

    def test_subtotal_is_price_times_quantity(make_cart):
        cart = make_cart({"ATTA-5KG": 2, "SALT-1KG": 3})
        assert cart["subtotal_paise"] == 2 * 28900 + 3 * 2800

## Configuration per environment

The environment is chosen on the command line; a hook in the root conftest adds the option:

    def pytest_addoption(parser):
        parser.addoption("--env", default="local", help="which config/<env>.json to test against")

    @pytest.fixture(scope="session")
    def settings(request):
        return load_settings(request.config.getoption("--env"))

load_settings reads config/<env>.json into a frozen dataclass, lets environment variables override the file
(KK_BASE_URL, so CI can point anywhere) and takes secrets only from the environment. Mistakes fail with a message
that says what to do:

    E   ValueError: unknown environment 'prod'; known: ['local', 'staging']
    E   ValueError: KK_TEST_OTP is not set; export it or put it in your CI secrets

Secrets (OTPs, API keys, passwords) never go in config files or code: config files are committed, and a committed
secret is a leaked secret. Locally they come from your shell; in CI from the secret store.

For the local environment the framework starts the app itself, on a port the operating system picks, so two runs
never fight over port 5000. For a remote environment it checks /health once and stops the whole run if the host is
down, instead of failing 300 tests one by one:

    ! _pytest.outcomes.Exit: staging is not reachable at https://staging.kiranakart.example: ConnectionError !

That run exited with code 3 (passed to pytest.exit), so CI can tell "environment down" from "tests failed" (1).

## The two client layers

**Transport** (ApiClient) wraps one requests.Session: base URL, default timeout, the Authorization header and a
log line per request. Every request passes through it, so adding a header, a retry on connection errors or a
correlation id is a one-line change.

**Service** (ShopApi) has one method per business action. Methods a test checks return the response untouched,
because tests check refusals as well as successes. Setup helpers such as login and new_cart assert their own
success with a clear message, because a test that cannot even create a cart should stop there.

The log line pays for itself on the first failure. With log_level = INFO in pytest.ini, pytest prints the request
trail of the failing test only:

    E       AssertionError: DIWALI10 on subtotal 49900 paise: expected 200, got 422 {'error': 'minimum order 499 not met'}
    ------------------------------ Captured log call ------------------------------
    INFO     kk.api:api_client.py:21 POST /api/carts -> 201
    INFO     kk.api:api_client.py:21 POST /api/carts/11/items -> 200
    INFO     kk.api:api_client.py:21 POST /api/carts/11/items -> 200
    INFO     kk.api:api_client.py:21 GET /api/carts/11 -> 200
    INFO     kk.api:api_client.py:21 POST /api/carts/11/coupon -> 422

## pytest.ini is part of the framework

    [pytest]
    testpaths = tests
    pythonpath = .
    addopts = -ra --strict-markers
    log_level = INFO
    markers =
        smoke: fast checks that the build is alive; runs on every pull request
        regression: the full functional suite; runs nightly
        slow: takes more than a second (payment gateway, big data sets)
        payments: touches the order and payment flow

pythonpath = . lets tests import framework without installing it; -ra lists every non-pass at the end.

## Where test data lives

- **Reference data** (products, pincodes, coupon definitions) belongs to the environment; tests read it.
- **Data a test changes** is created by the test through factory fixtures (next lesson) and deleted afterwards.
- **Case tables** (inputs and expected results) live in tests/data as CSV or JSON, next to the tests.
- **Secrets** live in the environment, never in the repository.

## What keeps a framework easy to extend

- Composition, not deep inheritance: fixtures and small client classes, not a BaseTest with forty helpers.
- No utils.py junk drawer; every helper has a layer.
- Fixtures documented with a docstring, so pytest --fixtures is the framework's manual.
- A README with the three commands a new joiner needs: install, run smoke locally, run against staging.

The same layering holds for UI suites: page objects take the place of the service layer (the Playwright topic
builds them), and the browser takes the place of the HTTP session.`,
    workedExample: `**Scenario.** A KiranaKart tester wrote this before the framework existed. Move it into the framework.

    def test_order():
        s = requests.Session()
        t = s.post("https://staging.kiranakart.example/api/login",
                   json={"phone": "+919000000001", "otp": "246810"}).json()["token"]
        s.headers["Authorization"] = "Bearer " + t
        c = s.post("https://staging.kiranakart.example/api/carts").json()
        s.post(f"https://staging.kiranakart.example/api/carts/{c['id']}/items", json={"sku": "ATTA-5KG", "qty": 1})
        time.sleep(2)
        r = s.post("https://staging.kiranakart.example/api/orders", json={"cart_id": c["id"], "pincode": "560034"})
        assert r.status_code == 201

**Step 1: list what does not belong in a test.** The host (config), the phone and pincode (config), the OTP (a
secret, so the environment), login and the auth header (a session fixture plus the transport client), cart
creation (a factory fixture that also cleans up), the sleep (nothing waits on it: the order call itself blocks
until the gateway answers), and the raw URLs (service methods).

**Step 2: what is left is the story.**

    @pytest.mark.smoke
    def test_order_is_placed(shop, make_cart, settings):
        cart = make_cart({"ATTA-5KG": 1})
        r = shop.place_order(cart["id"], settings.serviceable_pincode)
        assert r.status_code == 201 and r.json()["status"] == "PLACED"

**Step 3: check it runs in both places.** Locally the framework starts the app; KK_TEST_OTP=246810 and
pytest -m smoke gave 4 passed, 39 deselected in 0.88s. With --env staging and the host unreachable, the run stopped
at once with the "staging is not reachable" message and exit code 3, instead of four connection tracebacks.

**Step 4: see what the test pulls in.** pytest --fixtures-per-test lists api_client, base_url, make_cart, settings
and shop for this test, with each fixture's file and line: the wiring is visible without reading conftest.py.

**What to say in a review.** "Tests contain only the story. The host is in config, the OTP is in the environment,
and setup goes through fixtures that clean up. Moving to a new environment is a new JSON file."`,
    mcqs: [
      mcq('KiranaKart\'s 300 API tests each build URLs from a hard-coded staging host, and the suite must now run against a pre-production host. What change fixes this for good?', [
        ['Base URL from per-environment config chosen with --env, overridable by a variable', true],
        ['A search-and-replace of the staging host with the new host across every test file', false],
        ['A BASE_URL constant at the top of conftest.py that is edited before every run', false],
        ['Asking the developers to point the staging DNS name at the pre-production servers', false],
      ], 'The host is a property of the environment, so it lives in one config file per environment and is picked at run time; a variable override lets CI aim anywhere. Search-and-replace must be redone for every move, an edited constant is easy to commit by mistake, and changing DNS breaks staging for everyone else.'),
      mcq('In the layered KiranaKart framework, where should the Authorization header and the default request timeout be set?', [
        ['In the transport client that every request passes through', true],
        ['In each test, so that a reader can see exactly what was sent', false],
        ['In every service method that calls a protected endpoint', false],
        ['In an autouse fixture that patches requests.Session', false],
      ], 'One class sends every request, so cross-cutting concerns such as auth, timeouts and logging belong there and change in one place. Repeating them in tests or service methods multiplies edits, and patching requests globally hides the behaviour and also affects code that should not be touched.'),
      mcq('Why does ShopApi.apply_coupon return the response instead of asserting a 200 itself?', [
        ['Tests check refusals too, so the verdict belongs in the test', true],
        ['Assertions outside test modules are not rewritten, so they never fail', false],
        ['Returning the raw response makes the HTTP call measurably faster', false],
        ['pytest reports only assertion errors raised inside test functions', false],
      ], 'The coupon tests expect 200 for valid cases and 404 or 422 for the rest, so the service method must not decide what success means. Asserts in helper modules still raise AssertionError (they just lose the detailed rewrite), speed is unaffected, and pytest reports any exception from any module.'),
    ],
    checkpoint: [
      mcq('The framework needs the KK_TEST_OTP secret to log in. Where should its value come from?', [
        ['An environment variable, set in your shell or by the CI secret store', true],
        ['config/staging.json, stored next to the base URL for that environment', false],
        ['A constant in conftest.py, since only the test code ever needs to read it', false],
        ['The addopts line in pytest.ini, so that every run passes it automatically', false],
      ], 'Config files, conftest.py and pytest.ini are all committed to the repository, and a committed secret is a leaked one. The environment keeps the value out of git; locally it comes from your shell and in CI from the secret store.'),
      mcq('At the start of a run against staging, the framework finds the host down. Which behaviour serves the team best?', [
        ['Stop the session at once with a message that names the host', true],
        ['Let every test fail with its own connection error and traceback', false],
        ['Skip every test quietly so the pipeline stays green until it is back', false],
        ['Retry each request for five minutes before failing that one test', false],
      ], 'One clear message and a distinct exit code (3 in the demo) say "environment down", not "300 bugs". Hundreds of identical tracebacks bury the cause, silent skips report a green build that tested nothing, and long per-request retries turn a two-second answer into hours.'),
      mcq('A new endpoint, GET /api/slots, needs tests. In a well-layered framework, what is normally added?', [
        ['One service method and a test file that calls it', true],
        ['A new client class with its own session, base URL and timeout', false],
        ['A new environment JSON file listing the URL of the slots endpoint', false],
        ['A base test class with a slots helper that every test class inherits', false],
      ], 'The transport, config and fixtures already exist; a new endpoint needs only its business method and its tests. A second client duplicates the transport, config files hold per-environment values rather than endpoint paths, and a base-class helper couples every test to code it does not use.'),
    ],
  },

  /* ── FIXTURES_DEEP ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PYTEST_FRAMEWORK_FIXTURES_DEEP',
    notes: `"Fixtures and Parametrised Tests" taught yield fixtures, the five scopes and conftest.py. A framework has dozens of
fixtures used by hundreds of tests, so the questions change: what order do they run in, which scope does each
deserve, how does cleanup survive a failure, and how do you stop tests depending on each other through fixtures?

## See the order: --setup-show

    pytest --setup-show tests/api/test_cart.py::test_new_cart_is_empty tests/api/test_cart.py::test_two_carts_do_not_share_items

    SETUP    S settings
    SETUP    S base_url (fixtures used: settings)
    SETUP    S api_client (fixtures used: base_url, settings)
    SETUP    S shop (fixtures used: api_client, settings)
            SETUP    F make_cart (fixtures used: shop)
            tests/api/test_cart.py::test_new_cart_is_empty (fixtures used: api_client, base_url, make_cart, request, settings, shop) .
            TEARDOWN F make_cart
            SETUP    F make_cart (fixtures used: shop)
            tests/api/test_cart.py::test_two_carts_do_not_share_items (fixtures used: ...) .
            TEARDOWN F make_cart
    TEARDOWN S shop
    TEARDOWN S api_client
    TEARDOWN S base_url
    TEARDOWN S settings

S, M and F are session, module and function. Dependencies are set up first and torn down last, in exact
reverse order. The server, client and login happen once; the cart factory is fresh for every test.

Inside one fixture, code after yield and finalizers added with request.addfinalizer both run at teardown. A demo
fixture that registered a finalizer before its yield printed, with -s:

    [cart] create cart
    [test_one] body
    [cart] after yield: log cart contents
    [cart] finalizer: delete cart
    [autouse] end test_one

## Choosing a scope

- **session**: expensive and read-only, or shared on purpose: settings, the app server, an HTTP session, a
  logged-in client, a browser instance.
- **function** (the default): anything a test changes: carts, orders, customers, a browser page.
- **module / class**: rare; for a read-only object that is expensive per file, such as a large parsed report.

The test: **if a test could change it, it is function-scoped.** A session-scoped dict or cart that one test
mutates is how "passes alone, fails in the suite" starts.

## Factories as fixtures

A fixture gives one object; a factory fixture gives a function, so a test makes as many objects as it needs, with
overrides, and the fixture deletes all of them:

    @pytest.fixture
    def make_cart(shop):
        """Factory: make_cart({"ATTA-5KG": 1}) -> cart dict. Deletes every cart it made."""
        made = []

        def make(items=None):
            cart = shop.new_cart()
            made.append(cart["id"])          # registered for cleanup BEFORE anything can fail
            for sku, qty in (items or {}).items():
                r = shop.add_item(cart["id"], sku, qty)
                assert r.status_code == 200, f"could not add {qty} x {sku}: {r.text}"
            return shop.cart(cart["id"]).json()

        yield make
        for cid in reversed(made):
            shop.delete_cart(cid)

The order of those two lines matters. Code after yield runs only if the fixture reached its yield. A fixture that
creates something and then fails before yielding leaks it. A demo with two fixtures, both adding an out-of-stock
item after creating a cart; one cleans up after yield, the other registers a finalizer first:

    ERROR test_leak.py::test_leaky - RuntimeError: 409 not enough stock
    ERROR test_leak.py::test_safe - RuntimeError: 409 not enough stock
    FAILED test_leak.py::test_zz_what_is_left - assert {1} == set()

Cart 1 (cleanup after yield) leaked; cart 2 (finalizer registered first) was removed. Register cleanup the moment
the resource exists.

## conftest.py at scale

- **tests/conftest.py**: fixtures every test may use (settings, server, clients, factories).
- **tests/api/conftest.py**, **tests/ui/conftest.py**: fixtures only that folder needs.
- **Overriding**: a fixture with the same name in a deeper conftest wins for tests below it. A demo where
  tests/conftest.py makes a regular user and tests/vip/conftest.py redefines user as gold: the vip test got gold,
  the others regular.
- **Plugins**: when the root conftest grows past a few hundred lines, move fixtures into framework/fixtures.py and
  load them with pytest_plugins = ["framework.fixtures"] in the root conftest (pytest only honours pytest_plugins
  there).

## Parametrised and indirect fixtures

A fixture with params runs every test that uses it once per value; ids name the runs:

    @pytest.fixture(params=["customer", "delivery_partner"], ids=["as-customer", "as-partner"])
    def role(request):
        return request.param

indirect=True sends a parametrize value to the fixture of that name instead of the test:

    @pytest.mark.parametrize("user", ["regular", "gold"], indirect=True)
    def test_free_delivery_threshold(user): ...

    test_roles.py::test_can_see_orders_page[as-customer] PASSED
    test_roles.py::test_can_see_orders_page[as-partner] PASSED
    test_roles.py::test_free_delivery_threshold[regular] PASSED
    test_roles.py::test_free_delivery_threshold[gold] PASSED

## Hidden coupling, and how to see it

- A wide-scoped fixture that hands out something mutable.
- An autouse fixture that does real work (logs in, seeds data) for tests that never needed it.
- A test that relies on another test's leftovers, which passes only in file order.
- A fixture that requests five others "just in case", so every test pays for all of them.

pytest --fixtures-per-test shows what each test pulls in; --setup-show shows when. Parallel runs expose order
dependence at once: under pytest-xdist each worker is a separate process with its own session fixtures, so a
"once per session" fixture runs once per worker (the next lessons show the output and the fix).`,
    workedExample: `**Scenario.** KiranaKart adds delivery slots: a customer books a 2-hour slot for an order, and a slot holds at most
20 orders. Design the fixtures for its tests before writing them.

**Step 1: list what tests need and who changes it.**

    settings, server, logged-in client   read-only for every test         -> session (already exist)
    a cart with items                    each test fills its own          -> function factory (make_cart)
    a placed order                       each test places its own         -> function factory (make_order)
    a slot with free capacity            booking changes its count        -> function factory (make_slot)

**Step 2: write make_order on top of make_cart, cleanup registered first.**

    @pytest.fixture
    def make_order(shop, make_cart, settings, request):
        def make(items=None):
            cart = make_cart(items or {"ATTA-5KG": 1})
            r = shop.place_order(cart["id"], settings.serviceable_pincode)
            assert r.status_code == 201, f"order failed: {r.text}"
            order = r.json()
            request.addfinalizer(lambda: shop.cancel_order(order["id"]))
            return order
        return make

Because make_order requests make_cart, pytest tears make_order down first: orders are cancelled before their carts
are deleted, the children-before-parents rule from "Test Data" without writing it by hand.

**Step 3: resist the tempting shortcut.** "Create one slot per session and let every test book into it" is fast
and wrong: the 21st booking fails, the result depends on how many tests ran before, and under xdist each worker
gets its own copy anyway. A function-scoped make_slot(capacity=20) keeps each test's count its own; the test for
"slot full" asks for make_slot(capacity=1) and books twice.

**Step 4: check the wiring.** Run one slot test with --setup-show: session fixtures once at the top, then
make_cart, make_order and make_slot as F lines, and their TEARDOWN lines in reverse order after the test. If a
session fixture appears that the test does not need, an autouse fixture is doing too much.

(The slots endpoint and cancel_order are the design exercise; the cart factory, the setup-show order and the
finalizer behaviour above were run on the demo framework.)`,
    mcqs: [
      mcq('A test uses settings (session), api (module) and cart (function). When is each torn down, as --setup-show reports it?', [
        ['cart after each test, api after the module, settings at session end', true],
        ['settings first, then api, then cart, in the order they were set up', false],
        ['All three after every test, since every test requested all of them', false],
        ['cart and api after each test, and settings only at the session end', false],
      ], 'Each fixture lives as long as its scope and teardown runs in reverse order of setup, so the demo showed TEARDOWN F cart after each test, TEARDOWN M api after the file and TEARDOWN S settings last. Setup order is not teardown order, and requesting a wide-scoped fixture does not shorten its life.'),
      mcq('A fixture creates a cart, adds an out-of-stock item that raises a 409 error, and only then yields. The test errors at setup. What happens to the cart?', [
        ['It stays, because code after the yield never runs', true],
        ['It is deleted, because teardown always runs on errors', false],
        ['It is deleted at session end with the other fixtures', false],
        ['pytest undoes everything the fixture did before failing', false],
      ], 'The yield was never reached, so there is no teardown to run; the demo left cart 1 behind (assert {1} == set()). Registering cleanup with request.addfinalizer, or appending to the factory list, before the risky step fixed it. pytest has no undo for side effects in the system under test.'),
      mcq('With pytest-xdist and -n 3, a session-scoped fixture prints "seeding reference data". How many times can the line appear?', [
        ['Up to three, once in each worker process that uses it', true],
        ['Once, since session scope means once for the whole run', false],
        ['Once per test, because xdist resets every fixture each time', false],
        ['Never, because xdist workers skip session-scoped fixtures', false],
      ], 'Each xdist worker is its own pytest process with its own session, so the demo printed the line in gw0, gw1 and gw2. That is fine for a read-only client, but anything that must happen exactly once needs coordination, such as a file lock.'),
    ],
    checkpoint: [
      mcq('Which KiranaKart fixture is a good candidate for session scope?', [
        ['The logged-in ShopApi client that tests use but never change', true],
        ['The cart factory, so later tests can reuse carts made earlier', false],
        ['A cart with DIWALI10 applied, since many tests need a discount', false],
        ['A stock dictionary that the order tests decrease as they buy', false],
      ], 'A logged-in client is costly to create and no test alters it, so one per session is safe. Carts, applied coupons and stock counts are changed by tests; sharing them makes results depend on which tests ran first.'),
      mcq('tests/conftest.py and tests/vip/conftest.py both define a fixture named user. Which one does a test in tests/vip/ receive?', [
        ['The one in tests/vip/conftest.py, the nearest definition', true],
        ['The one in tests/conftest.py, the first definition loaded', false],
        ['Neither; collection stops with a duplicate fixture error', false],
        ['Both; the test runs once with each definition of user', false],
      ], 'A fixture in a deeper conftest overrides one with the same name higher up, for tests in that folder and below; the demo test in vip/ received the gold user. Duplicate names are allowed and are how overriding works, and overriding never multiplies runs the way params do.'),
      mcq('A test has @pytest.mark.parametrize("user", ["regular", "gold"], indirect=True). What does indirect=True change?', [
        ['Each value goes to the user fixture as request.param', true],
        ['The strings replace the fixture and go straight to the test', false],
        ['The user fixture runs once and gets both values', false],
        ['The values become module globals the test can read', false],
      ], 'With indirect, pytest still creates two test runs, but hands each value to the fixture called user, which builds the real object from request.param. Without indirect the test would receive the bare strings, and in neither case does one fixture call see both values.'),
    ],
  },

  /* ── DATA_DRIVEN ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PYTEST_FRAMEWORK_DATA_DRIVEN',
    notes: `KiranaKart's coupon rules fit in a table: DIWALI10 gives 10% off orders of at least Rs 499, capped at Rs 150; FLAT50
gives Rs 50 off orders of at least Rs 299; MONSOON20 has expired; codes are case-insensitive. One test function
with one row per rule is a data-driven test. You met parametrize and ids in "Fixtures and Parametrised Tests";
this lesson is about running a framework on tables of cases and keeping the failures readable.

## Ids are the first thing anyone reads

When a data-driven test fails at 2 a.m., the id is the only thing in the CI summary. Collected ids from a demo:

    test_ids.py::test_no_ids[case0]
    test_ids.py::test_no_ids[case1]
    test_ids.py::test_duplicate_ids[small0]
    test_ids.py::test_duplicate_ids[small1]
    test_ids.py::test_stacked[560034-DIWALI10]
    test_ids.py::test_values_as_ids[5-Rs 0.05]

Dicts get case0, case1, which say nothing; duplicate ids get a numeric suffix silently; stacked parametrize
decorators multiply (2 pincodes x 2 codes = 4 tests) and join their ids; simple values become the id themselves.
Rule: give every row an explicit, unique, meaningful id (diwali10-exactly-min, not row7).

## Cases in a CSV file

Testers and business analysts can add rows to a CSV without touching Python. tests/data/coupons.csv:

    case_id,items,code,expected_status,expected_discount_paise
    diwali10-above-min,ATTA-5KG:1;DAL-1KG:1;SALT-1KG:1,DIWALI10,200,5270
    diwali10-exactly-min,ATTA-5KG:1;DAL-1KG:1,DIWALI10,200,4990
    diwali10-below-min,ATTA-5KG:1;TEA-250G:1;SALT-1KG:1,DIWALI10,422,0
    diwali10-capped,GHEE-1L:3,DIWALI10,200,15000
    flat50-exactly-min,ATTA-5KG:1;CORIANDER:1,FLAT50,200,5000
    flat50-below-min,ATTA-5KG:1,FLAT50,422,0
    lowercase-code,ATTA-5KG:1;DAL-1KG:1;SALT-1KG:1,diwali10,200,5270
    expired-monsoon20,GHEE-1L:2,MONSOON20,422,0
    unknown-code,ATTA-5KG:1,FREEFOOD,404,0

The rows come from the boundaries you learned in "Equivalence Partitions and Boundary Values": below, exactly at
and above each minimum, and past the cap. The expected discounts were worked out by hand from the rule (52,700
paise x 10% = 5,270), never by the formula the app uses; a copied formula shares the app's bugs.

The loader in framework/data.py turns rows into pytest.param objects with the row's own id:

    DATA_DIR = Path(__file__).resolve().parent.parent / "tests" / "data"

    def csv_cases(name, id_field="case_id"):
        with open(DATA_DIR / name, newline="", encoding="utf-8-sig") as f:
            rows = list(csv.DictReader(f))
        return [pytest.param(row, id=row[id_field]) for row in rows]

Two details came from real failures (the debugging unit shows them): the path is built from __file__, not the
current directory, and utf-8-sig strips the byte-order mark Excel adds.

    @pytest.mark.parametrize("case", csv_cases("coupons.csv"))
    def test_coupon_rules(shop, make_cart, case):
        cart = make_cart(parse_items(case["items"]))
        r = shop.apply_coupon(cart["id"], case["code"])
        assert r.status_code == int(case["expected_status"]), (
            f"{case['code']} on subtotal {cart['subtotal_paise']} paise: "
            f"expected {case['expected_status']}, got {r.status_code} {r.json()}")
        after = shop.cart(cart["id"]).json()
        assert after["discount_paise"] == int(case["expected_discount_paise"])

CSV gives you strings; convert explicitly (int(...)) and the conversion fails loudly if a row is malformed.

## A failure that explains itself

    FAILED tests/api/test_coupons.py::test_coupon_rules[diwali10-exactly-min]
    E   AssertionError: DIWALI10 on subtotal 49900 paise: expected 200, got 422 {'error': 'minimum order 499 not met'}
    FAILED tests/api/test_coupons.py::test_coupon_rules[flat50-exactly-min]
    E   AssertionError: FLAT50 on subtotal 29900 paise: expected 200, got 422 {'error': 'minimum order 299 not met'}

Seven rows passed and the only two failures are both "exactly at the minimum": the pattern names the bug before
anyone opens the code. The app checked subtotal <= minimum instead of subtotal < minimum. After the fix the whole
suite printed 42 passed, 1 xfailed.

## JSON for typed and nested cases

JSON keeps types (true, null, numbers) and allows nesting, and a row can carry its own mark:

    {"id": "chennai-not-yet", "pincode": "600001", "serviceable": false, "city": null},
    {"id": "pune-launch-next-month", "pincode": "411001", "serviceable": true, "city": "Pune",
     "xfail": "KK-412: Pune launch not deployed yet"}

The loader adds pytest.mark.xfail(reason=..., strict=True) to rows with an xfail key. strict matters: the day Pune
went live the row reported FAILED with [XPASS(strict)] KK-412: Pune launch not deployed yet, which tells someone to
delete the mark. Without strict it would quietly say XPASS forever.

## When not to data-drive

- Rows that need different steps are different tests; an if inside a data-driven test means two tests.
- One row, one behaviour. A row that checks five things fails for five reasons.
- Hundreds of rows through a slow API cost minutes; push the combinations down to unit tests of the rule.

## Property-based testing, in outline

Example tables test the cases you thought of. A property test states something that must hold for every input and
lets a library search for a counter-example. With Hypothesis:

    from hypothesis import given, strategies as st

    @given(st.integers(min_value=-10**12, max_value=10**12))
    def test_format_then_parse_gives_back_the_amount(paise):
        assert parse_inr(format_inr(paise)) == paise

Hypothesis tried random integers, found a failure and shrank it to the simplest one:

    E       AssertionError: assert 10 == 1
    E        +  where 10 = parse_inr('Rs 0.1')
    E        +    where 'Rs 0.1' = format_inr(1)
    E       Failing test case: test_format_then_parse_gives_back_the_amount(
    E           paise=1,
    E       )

The formatter wrote one paisa as "Rs 0.1", dropping the leading zero. The same bug made the cart page show
"Rs 14,805.0". The fix was {p:02d}; afterwards --hypothesis-show-statistics reported 100 passing, 0 failing.

Good properties for testers: round trips (format then parse, export then import), invariants (a discount is never
negative, never above its cap, a total never below zero), and agreement with a simple slow version. Pin a found
bug with @example(paise=1) so it is always tried. Use property tests on functions, where thousands of calls take
a second, not through a slow API.`,
    workedExample: `**Scenario.** Product adds a rule before the Diwali sale: DIWALI10 must not apply to carts that contain only ghee (a
margin decision). Extend the coupon tests without writing a new test function.

**Step 1: design the rows from the rule.** Partitions: ghee only, ghee plus something else, no ghee. Boundaries
still matter for the minimum, and the cap still applies:

    diwali10-ghee-only,GHEE-1L:1,DIWALI10,422,0
    diwali10-ghee-and-atta,GHEE-1L:1;ATTA-5KG:1,DIWALI10,200,9380
    diwali10-ghee-only-capped,GHEE-1L:3,DIWALI10,422,0

Work out the middle row by hand: 64,900 + 28,900 = 93,800 paise, 10% is 9,380, under the 15,000 cap.

**Step 2: notice the clash.** The existing row diwali10-capped (GHEE-1L:3, expecting 15000) contradicts the new rule.
Data-driven suites make contradictions visible: two rows, same input, different expectations. Change that row to
use a mixed cart, and keep its purpose (testing the cap): GHEE-1L:2;ATTA-5KG:1 is 158,700 paise, 10% is 15,870,
capped to 15000.

**Step 3: run against the old build first.** The new rule is not implemented yet, so diwali10-ghee-only and
diwali10-ghee-only-capped should fail with "expected 422, got 200". A new test that passes before the feature exists
is testing nothing.

**Step 4: keep the failure readable.** The assertion message already prints the code, the subtotal and the
response, so a failing row reads "DIWALI10 on subtotal 64900 paise: expected 422, got 200 {...}" without a rerun.

**Step 5: add a property for the rule.** For any cart (a Hypothesis strategy of SKU-quantity dicts) the computed
discount is 0 when every SKU is GHEE-1L, and otherwise between 0 and 15,000 paise. Run it against the pricing
function, not the API, so 100 examples take well under a second.

(The rule, rows and property are the design exercise; the loader, the coupon failures and the Hypothesis output
quoted in the notes come from the demo framework.)`,
    mcqs: [
      mcq('A test is parametrised over a list of dicts with no ids. What ids does pytest give the runs?', [
        ['case0, case1 and so on, which say nothing about the data', true],
        ['The dict contents, shortened so they fit the terminal width', false],
        ['The dict keys joined by hyphens, such as amount-code', false],
        ['The source line number of each dict in the test file', false],
      ], 'pytest cannot turn a dict into a short id, so it falls back to the argument name plus an index, as the demo collected test_no_ids[case0] and [case1]. Dict contents and keys are not used, and line numbers are never part of an id; pass id= on each pytest.param instead.'),
      mcq('coupons.csv was last saved from Excel. Collection now fails with KeyError: \'case_id\', though printing the header line shows case_id first. What is the likely cause?', [
        ['Excel added a byte-order mark, which became part of the first header name', true],
        ['DictReader lower-cases headers, and the loader asks for a mixed-case key', false],
        ['pytest reads data files before conftest.py, so the header is not loaded', false],
        ['The file was opened without newline="", so the header row was skipped', false],
      ], 'A UTF-8 byte-order mark is invisible when printed but is glued to the first field, so the key is not plain case_id; opening with encoding="utf-8-sig" strips it. DictReader keeps header case, pytest does not read data files at all, and newline="" affects line endings inside fields, not whether the header is read.'),
      mcq('In a run of nine coupon rows, only diwali10-exactly-min and flat50-exactly-min fail, both with 422. What does that pattern suggest first?', [
        ['The minimum-order check excludes the minimum itself', true],
        ['Both rows have wrong expected values in the CSV file', false],
        ['Both coupons are switched off in the test environment', false],
        ['The cart factory adds items in an unexpected order', false],
      ], 'Rows above and below the minimum pass, and only the two rows exactly at a minimum fail, which points at the boundary: the app used <= instead of <. Inactive coupons would fail every row for those codes, wrong expectations in two unrelated rows would be a coincidence, and item order cannot change a subtotal.'),
    ],
    checkpoint: [
      mcq('Hypothesis reports a failing round-trip property for format_inr at paise=1. Why such a small value?', [
        ['It shrinks a failure to the simplest input that still fails', true],
        ['It always tries 0, 1 and 2 before any of the random values', false],
        ['The strategy limited the integers it could draw to tiny ones', false],
        ['Only an amount of exactly one paisa is affected by the bug', false],
      ], 'After finding any failing input, Hypothesis searches for a simpler one that fails the same way and reports that, which makes the bug obvious ("Rs 0.1"). It does not use a fixed first list, the strategy allowed values up to 10^12, and every amount with fewer than ten paise is affected.'),
      mcq('A JSON row for Pune carries xfail with strict=True until the launch. Pune goes live. What does the next run report for that row?', [
        ['FAILED with XPASS(strict), so someone removes the mark', true],
        ['XPASS as a warning only, and the run stays fully green', false],
        ['Passed, since the API now returns the right city name', false],
        ['Skipped, because xfail rows are never run at all', false],
      ], 'A strict xfail that unexpectedly passes is a failure, which is the point: the demo printed [XPASS(strict)] KK-412 and forced the cleanup. Non-strict xfail would report XPASS and stay green indefinitely, and xfail tests do run; only skip stops them running.'),
      mcq('Which expected value makes a data-driven discount test meaningful?', [
        ['One worked out by hand from the coupon rule and written into the row', true],
        ['One computed inside the test with the formula the app itself uses', false],
        ['One copied from the app response the first time the test was run', false],
        ['One read from the same database table the app reads its rules from', false],
      ], 'An independent expected value can disagree with the app, which is how a bug shows up. Reusing the app formula, copying its first output or reading the same rule table all make the test agree with whatever the app does, bugs included.'),
    ],
  },

  /* ── MARKERS_REPORTS ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PYTEST_FRAMEWORK_MARKERS_REPORTS',
    notes: `KiranaKart's suite now has 43 tests and will have 2,000 by next year. Three questions come with size: which tests
run when, how to run them faster, and how to show the results to people who do not read terminals. "pytest:
Writing and Running Tests" covered registering markers and --strict-markers; this lesson is about using them.

## A marker plan

    smoke       the build is alive: health, login, cart, one order      every pull request, under 2 minutes
    regression  the full functional suite                               nightly and before a release
    slow        anything over a second (payment gateway, big data)     excluded from quick local runs
    payments    touches orders and payment                              run when payment code changes

Mark a whole module with pytestmark = [pytest.mark.payments, pytest.mark.slow]. Combine with and, or, not:

    pytest --co -q -m smoke
    tests/api/test_cart.py::test_new_cart_is_empty
    tests/api/test_health.py::test_health_is_ok
    tests/api/test_health.py::test_login_rejects_a_wrong_otp
    tests/api/test_orders.py::test_order_is_placed
    4/43 tests collected (39 deselected) in 1.53s

    pytest -q -m "smoke and not slow"
    3 passed, 40 deselected in 1.79s

--co (collect only) previews a selection before you trust it in CI.

**A trap --strict-markers does not catch.** It rejects unregistered markers in decorators, not typos in -m:

    pytest -q -m "smok"
    43 deselected in 2.89s

Exit code 5 ("no tests collected"). That fails a CI step, as it should; never hide it with || true.

## pytest exit codes

0 all passed; 1 some tests failed; 2 interrupted (Ctrl+C or collection errors); 3 internal error; 4 usage error
(a bad option); 5 no tests collected. The framework uses pytest.exit(..., returncode=3) when the environment is
unreachable, so the pipeline can label that run "environment down".

## Plugins are code that loads on every run

pytest -VV lists registered plugins. The shared training venv auto-loaded thirteen plugin entry points (from locust, langsmith, hydra
and others) just because they were installed. Timing one tiny test: 3.2 to 3.7 s with autoload, about 1.4 s with
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 and the needed plugins named with -p (xdist.plugin, _hypothesis_pytestplugin,
pytest_html.plugin). Give the framework its own virtual environment and pinned requirements so a run does not
depend on what else happens to be installed.

## Parallel runs with pytest-xdist

pytest -n auto starts one worker process per CPU core and hands tests out to them. Real timings, 43 tests, 17 of
which wait on the payment-gateway stub:

    gateway wait 1 s:   serial 19.58s      -n auto 16.19s
    gateway wait 3 s:   serial 61.57s      -n auto 18.27s     -n 4 18.98s     -n auto --dist loadfile 59.79s

With a 1-second wait, starting eight Python workers cost almost all the gain; parallelism pays when tests wait (on
browsers, networks, gateways), not when the suite is already quick. --dist loadfile sends each file to one worker,
and all 17 slow tests live in test_orders.py, so one worker did nearly all the work.

Distribution modes: load (default: any free worker takes the next test), loadscope (a module or class stays on
one worker), loadfile, and loadgroup (tests marked @pytest.mark.xdist_group(name="ghee-stock") stay together and get
ids such as test_a_buy_two_ghee@ghee-stock).

**What parallel runs break.** Each worker is a separate process: its own globals, its own session fixtures (in the
framework, its own app server on its own port). Tests that relied on each other's leftovers fail. Two tests sharing
a stock count passed serially and failed under -n 3:

    [gw1] [ 80%] FAILED test_stock.py::test_b_stock_after_purchase
    E       assert 5 == 3

The fix is to make each test create its own state. xdist_group would hide the coupling, not remove it.

**Once-per-run work.** A session fixture runs once per worker. When something must happen once (seeding shared
data, starting one container), the pytest-xdist documentation suggests a file lock in the base temp folder that all
workers share: the first worker does the work and writes the result; the others read it.

    @pytest.fixture(scope="session")
    def reference_data(tmp_path_factory, worker_id):
        if worker_id == "master":                    # not under xdist
            return seed()
        root = tmp_path_factory.getbasetemp().parent
        marker = root / "reference.json"
        with FileLock(str(marker) + ".lock"):
            if marker.is_file():
                return json.loads(marker.read_text())
            data = seed()
            marker.write_text(json.dumps(data))
            return data

With -n 3 the plain version printed "seeding reference data" in gw0, gw1 and gw2; the locked version once.

## Retries

pytest-rerunfailures (written from its documentation; not installed here) adds --reruns 2 --reruns-delay 1 and
@pytest.mark.flaky(reruns=2), and reports reruns separately. A rerun hides a problem unless it is counted and
owned: rerun only tests with a ticket against them. "Managing Flaky Tests and Test Health" in Quality in CI goes
further.

## Reports

- **JUnit XML**, built in: --junitxml=out/junit.xml. Every CI server reads it.
- **pytest-html**: --html=out/report.html --self-contained-html writes one shareable file with each test's result,
  duration, log and failure. Run: "Generated html report: file:///.../out/smoke.html". A conftest hook sets the
  title, and pytest-metadata adds the environment:

      @pytest.hookimpl(optionalhook=True)
      def pytest_html_report_title(report):
          report.title = "KiranaKart API regression"

- **Allure** (from the allure-pytest documentation; not run here): pip install allure-pytest, run pytest
  --alluredir=allure-results, then the Allure command-line tool (a separate install that needs Java) builds the
  report with allure serve allure-results or allure generate. In tests, @allure.feature and @allure.story group
  results, with allure.step("apply coupon"): shows steps, and allure.attach(body, name="response",
  attachment_type=allure.attachment_type.JSON) attaches evidence. Trends need the history folder from the previous
  report copied into the new results.`,
    workedExample: `**Scenario.** KiranaKart's pipeline should give a pull request a verdict in under two minutes and run everything
nightly with a report the product manager can open. Set up the commands.

**Step 1: the pull-request run.** Only smoke, in parallel, stopping early if the build is clearly broken:

    pytest -m smoke -n auto --maxfail=5 --junitxml=out/junit-smoke.xml

--maxfail=5 stops after five failures: if login is broken, 300 identical failures add nothing.

**Step 2: the nightly run.** Everything, in parallel, with both reports:

    pytest -m "regression or smoke" -n auto --junitxml=out/junit.xml --html=out/report.html --self-contained-html

On the demo with the 3-second gateway stub, -n auto finished in 18.27s against 61.57s serial.

**Step 3: decide the distribution mode.** The slow tests are all in test_orders.py, so --dist loadfile would put
them on one worker (59.79s in the demo). Default load is right here. If one file's tests must share a worker
because they share a scarce resource (one test UPI account), mark them with xdist_group and use --dist loadgroup.

**Step 4: treat exit codes deliberately.** 1 means failures (red build, report attached); 3 from the framework means
the environment was down (page the environment owner, do not file bugs); 5 means the marker expression selected
nothing (fix the pipeline).

**Step 5: check the report really says what ran.** Open report.html: the title is "KiranaKart API regression", the
environment table shows Environment: local, and each failed test has its captured request log. A report that does
not say which environment it tested is not evidence of anything.

**What to say in a review.** "Smoke on every PR in parallel, full regression nightly, JUnit for CI and HTML for
people. Exit codes separate a broken build from a broken environment."`,
    mcqs: [
      mcq('A CI job runs pytest -m "smok", a typo for smoke, with --strict-markers in addopts. What happens?', [
        ['Every test is deselected and pytest exits with code 5', true],
        ['--strict-markers stops the run with an unknown marker error', false],
        ['Every test runs, because no marker matched the expression', false],
        ['pytest warns about the typo and runs the smoke tests anyway', false],
      ], 'The -m expression is matched against each test\'s markers; nothing has "smok", so all 43 were deselected and the exit code was 5. --strict-markers checks markers used in decorators, not the -m expression, and pytest never guesses what you meant.'),
      mcq('Seventeen order tests each wait 3 s on a payment stub, and all of them are in test_orders.py. Which run gave almost no speed-up over serial?', [
        ['-n auto with --dist loadfile', true],
        ['-n auto with the default load', false],
        ['-n 4 with the default load', false],
        ['-n auto with --dist loadgroup', false],
      ], 'loadfile sends a whole file to one worker, so the 17 slow tests ran one after another: 59.79s against 61.57s serial. Default load spread them (18.27s with -n auto, 18.98s with -n 4), and loadgroup only keeps marked groups together, of which there were none.'),
      mcq('A conftest defines pytest_html_report_title. On a machine where pytest-html is not loaded, every run stops with "unknown hook". What is the fix?', [
        ['Mark the hook with @pytest.hookimpl(optionalhook=True)', true],
        ['Move the hook into a test module so that it loads later', false],
        ['Register pytest-html as a marker in the pytest.ini file', false],
        ['Rename the hook to pytest_report_header, a core pytest hook', false],
      ], 'pytest validates every pytest_* function in a conftest against known hooks; optionalhook=True says "use this only if a plugin defines it". Hooks are not collected from test modules, markers have nothing to do with plugins, and pytest_report_header sets terminal header lines, not the HTML title.'),
    ],
    checkpoint: [
      mcq('Two stock tests pass serially, but under -n 3 one fails with assert 5 == 3 because it relied on the other running first. What is the real fix?', [
        ['Have each test set up the stock state it needs itself', true],
        ['Put both tests in one xdist_group so they share a worker', false],
        ['Run the whole suite serially, since parallel runs mislead', false],
        ['Add --reruns 2 so the test passes on a lucky worker', false],
      ], 'The failure exposed hidden order dependence; removing it makes the test correct in any order, serial or parallel. A group or a serial run hides the dependence, and reruns turn a deterministic design fault into a random green.'),
      mcq('Reference data must be seeded exactly once per run, even with -n auto. Which approach matches the pytest-xdist documentation?', [
        ['A file lock in the shared base temp folder; the first worker writes the data', true],
        ['A session-scoped fixture, which xdist shares across all its worker processes', false],
        ['An autouse fixture that seeds only when worker_id equals gw0, the first worker', false],
        ['A global variable set in conftest.py, which every worker then reads in turn', false],
      ], 'Workers share the parent of getbasetemp(), so a FileLock there lets exactly one seed and the rest read the result, as the demo showed. Session fixtures and globals are per process, and seeding only in gw0 races: other workers may need the data before gw0 has run that fixture.'),
      mcq('What does running pytest --alluredir=allure-results produce, according to the allure-pytest documentation?', [
        ['Raw result files that the Allure tool turns into a report', true],
        ['A finished HTML report that opens directly in a browser', false],
        ['A JUnit XML file that any CI server can read unchanged', false],
        ['A summary table printed in the terminal after the run', false],
      ], 'allure-pytest writes JSON results and attachments; the separate Allure command-line tool builds the report with allure serve or allure generate. A self-contained HTML file is what pytest-html makes, and JUnit XML comes from the built-in --junitxml option.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PYTEST_FRAMEWORK_DEBUGGING',
    notes: `Six things that broke while building the KiranaKart framework. In each, the tests themselves were fine; the framework
around them was wrong. Every message below is real pytest output from the demo (Windows paths shortened).

## 1. One missing secret, four errors

**Symptom.** A new joiner runs the smoke suite and gets a screen of identical tracebacks:

    ERROR tests/api/test_cart.py::test_new_cart_is_empty - ValueError: KK_TEST_OT...
    ERROR tests/api/test_health.py::test_health_is_ok - ValueError: KK_TEST_OTP i...
    ERROR tests/api/test_health.py::test_login_rejects_a_wrong_otp - ValueError: ...
    ERROR tests/api/test_orders.py::test_order_is_placed - ValueError: KK_TEST_OT...
    39 deselected, 4 errors in 0.80s

With 2,000 tests it would be 2,000 errors.

**Cause.** Settings are loaded inside a session fixture. When a fixture raises during setup, pytest caches the
error and reports it again for every test that requests the fixture.

**Fix.** Check configuration once, before any test, and fail as a usage error:

    def pytest_sessionstart(session):
        try:
            session.config.stash[SETTINGS_KEY] = load_settings(session.config.getoption("--env"))
        except ValueError as exc:
            raise pytest.UsageError(str(exc))

Now the run prints one line, ERROR: KK_TEST_OTP is not set; export it or put it in your CI secrets, and exits
with code 4. The settings fixture returns the stashed value.

## 2. A report hook that breaks every run

**Symptom.** Runs work in CI but crash on a laptop before collecting anything:

    INTERNALERROR> pluggy._manager.PluginValidationError: unknown hook 'pytest_html_report_title' in plugin
    <module 'conftest' from '...\\tests\\conftest.py'>
    no tests ran in 0.02s

**Cause.** The laptop did not load pytest-html, and pytest checks every pytest_* function in a conftest against the
hooks it knows. Without the plugin, pytest_html_report_title is unknown.

**Fix.** @pytest.hookimpl(optionalhook=True) on hooks that belong to a plugin, and the plugin in the framework's
requirements file so laptops and CI match.

## 3. Cases that load only from one folder

**Symptom.** pytest passes when run inside demo_data, and fails at collection from the project root:

    E   FileNotFoundError: [Errno 2] No such file or directory: 'dup.csv'
    !!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!

**Cause.** open("dup.csv") resolves against the current directory, and CI, IDEs and colleagues all start pytest
from different places.

**Fix.** Build data paths from the module: Path(__file__).resolve().parent / "data" / name.

## 4. A header that is there but cannot be found

**Symptom.** After a business analyst added rows in Excel:

    E   KeyError: 'case_id'
    ERROR test_bom.py - KeyError: 'case_id'

Printing the header shows case_id,amount.

**Cause.** Excel saved the file with a UTF-8 byte-order mark. csv read it as part of the first column name, which
became '\\ufeffcase_id'.

**Fix.** open(..., encoding="utf-8-sig"), which strips a byte-order mark if present and is harmless if not.

## 5. Green serially, red in parallel

**Symptom.** The nightly job moved to -n 3:

    [gw1] [ 80%] FAILED test_stock.py::test_b_stock_after_purchase
    E       assert 5 == 3

**Cause.** test_b checked the stock after test_a's purchase, so it only passed when test_a had already run in the
same process. Under xdist they landed on different workers, each with its own copy of the stock.

**Fix.** test_b buys what it needs and asserts on its own purchase. Order dependence is a bug in the tests even
when the serial run is green; xdist just made it visible.

## 6. A cart that outlives its test

**Symptom.** Staging slowly fills with carts named after tests, and a check at the end of a demo run fails:

    ERROR test_leak.py::test_leaky - RuntimeError: 409 not enough stock
    FAILED test_leak.py::test_zz_what_is_left - assert {1} == set()

**Cause.** The fixture created the cart, then added an item, which raised, so the fixture never reached its yield
and its cleanup never ran.

**Fix.** Register cleanup as soon as the resource exists (request.addfinalizer, or append to the factory's list
first); the same demo with the finalizer registered first left nothing behind.`,
    mcqs: [
      mcq('A missing KK_TEST_OTP makes every one of 2,000 tests report the same ValueError from a session fixture. Which change gives one clear message instead?', [
        ['Validate settings in pytest_sessionstart and raise pytest.UsageError', true],
        ['Change the settings fixture from session scope to function scope', false],
        ['Wrap each test body in try/except ValueError and call pytest.skip', false],
        ['Add -x to addopts so the run stops after the very first error only', false],
      ], 'Checking once before any test and raising UsageError printed a single "ERROR: KK_TEST_OTP is not set" line with exit code 4. Function scope would repeat the error even more, skipping hides a broken setup as a green run, and -x still shows a traceback while saying nothing about the cause being configuration.'),
      mcq('A data-driven test collects fine when pytest is started inside its folder but fails with FileNotFoundError from the project root. What is the fix?', [
        ['Build the data path from the module file, not the working folder', true],
        ['Always start pytest from the folder that contains the data files', false],
        ['Add the data folder to pythonpath in the pytest.ini configuration', false],
        ['Move the CSV file into the root folder next to the pytest.ini file', false],
      ], 'open() with a bare name resolves against the current directory, which differs between CI, IDEs and people; Path(__file__).resolve().parent makes it fixed. Telling everyone where to stand is fragile, pythonpath affects imports and not open(), and moving the file only works until someone runs from elsewhere.'),
      mcq('After the suite moves to pytest -n 3, test_b fails with assert 5 == 3, though it passes in every serial run. What does this show?', [
        ['test_b depended on state left by another test in the same process', true],
        ['pytest-xdist corrupts shared module state when it copies it to workers', false],
        ['The workers ran out of memory and reset their globals during the run', false],
        ['Three workers are too many for this suite and -n 2 should be used', false],
      ], 'Each worker is an independent process, so test_b only saw the decreased stock when test_a happened to run first in the same worker. xdist does not copy or corrupt state, memory was not involved, and a lucky -n 2 placement only hides the dependence.'),
      mcq('A fixture creates a cart, adds an item that can fail, and deletes the cart after yield. Some runs leak carts. Which rewrite stops the leak?', [
        ['Register the delete with request.addfinalizer right after creating the cart', true],
        ['Move the delete into the test body so it runs after the test assertions', false],
        ['Change the fixture to session scope so the delete runs once at the end', false],
        ['Wrap the yield in try/finally so the delete runs even if the test fails', false],
      ], 'The leak happens when the item step raises before yield; only a finalizer registered before that step still runs. A delete in the test is skipped when an assertion fails, session scope keeps one cart for everyone, and try/finally around the yield does not help because the code never reaches it.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PYTEST_FRAMEWORK_PRACTICE',
    notes: `Eight exercises on the KiranaKart framework. Try each before reading the answer.

## 1. An environment option (easy)

Add --env to pytest, defaulting to local, and a session fixture that loads config/<env>.json.

**Answer.**

    def pytest_addoption(parser):
        parser.addoption("--env", default="local", help="which config/<env>.json to test against")

    @pytest.fixture(scope="session")
    def settings(request):
        return load_settings(request.config.getoption("--env"))

pytest_addoption must live in a plugin or a conftest pytest loads at start-up (the one at the top of your test paths),
because options must exist before tests are collected.

## 2. Pick the scopes (easy)

The base URL; a requests.Session logged in as the test customer; a cart; a Playwright browser; a Playwright page;
the coupon table read from CSV.

**Answer.** Base URL, session, browser and the parsed table: session (read-only or expensive). Cart and page:
function (tests change them). If you are unsure, function scope is the safe default; widen only for cost.

## 3. A factory that cannot leak (medium)

Write make_order(items) on top of make_cart; each order must be cancelled after the test even if placing it fails.

**Answer.** Register the cancel before anything that can fail after the order exists:

    @pytest.fixture
    def make_order(shop, make_cart, settings, request):
        def make(items=None):
            cart = make_cart(items or {"ATTA-5KG": 1})
            r = shop.place_order(cart["id"], settings.serviceable_pincode)
            assert r.status_code == 201, f"order failed: {r.text}"
            order = r.json()
            request.addfinalizer(lambda: shop.cancel_order(order["id"]))
            return order
        return make

If placing fails, no order exists and the cart factory still deletes the cart.

## 4. Predict --setup-show (medium)

settings (session), api (module, uses settings), an autouse function fixture tag_log, and cart (function, uses
api). Two tests in one file use cart. Write the SETUP and TEARDOWN lines.

**Answer.** From the real run:

    SETUP    S settings
        SETUP    M api (fixtures used: settings)
            SETUP    F tag_log
            SETUP    F cart (fixtures used: api)
            test_order.py::test_one ...
            TEARDOWN F cart
            TEARDOWN F tag_log
            (the same four F lines for test_two)
        TEARDOWN M api
    TEARDOWN S settings

Autouse fixtures are set up before the fixtures a test names, and everything is torn down in reverse.

## 5. Pincode cases in JSON (medium)

Write cases for Koramangala 560034 (Bengaluru), Gachibowli 500081 (Hyderabad), Chennai 600001 (not served) and Pune
411001 (served from next month, ticket KK-412), with readable ids.

**Answer.** One object per case with an id, and xfail on Pune with strict=True added by the loader:

    {"id": "pune-launch-next-month", "pincode": "411001", "serviceable": true, "city": "Pune",
     "xfail": "KK-412: Pune launch not deployed yet"}

Expected: 4 passed, 1 xfailed today; 1 failed with XPASS(strict) on launch day, which tells you to remove the mark.

## 6. Marker expressions (easy)

Write -m expressions for: (a) smoke tests that do not touch payments; (b) everything except slow tests; (c) payment
tests that are part of regression.

**Answer.** (a) -m "smoke and not payments"; (b) -m "not slow"; (c) -m "payments and regression". Preview each with
--co -q before putting it in CI; a typo selects nothing and exits with code 5.

## 7. A property that finds its own mistake (medium)

Write a Hypothesis property for discount_for(subtotal, code): the discount is between 0 and the coupon's cap, and
never above the subtotal.

**Answer.** The first version, over any subtotal from 0 and any code, failed at once:

    E       assert 5000 <= 0
    E       Failing test case: test_discount_never_exceeds_cap_or_subtotal(
    E           subtotal=0,
    E           code='FLAT50',
    E       )

FLAT50 on an empty cart gives Rs 50 off a Rs 0 order. That is not an app bug: the minimum-order check runs before
the discount. The property was missing a precondition. Adding assume(subtotal >= COUPONS[code]["min_paise"])
passed, but the statistics showed 100 passing and 175 invalid examples: most generated inputs were thrown away.
Better is to generate valid inputs directly, for example by drawing the code first and then a subtotal from
st.integers(min_value=that coupon's minimum).

## 8. Plan the parallel run (hard)

The suite takes 61.57s serially; 17 tests wait 3 s each on the gateway stub and all of them sit in test_orders.py.
Choose the xdist options and say what you expect.

**Answer.** -n auto with the default load distribution: the slow tests spread across workers (18.27s measured; -n 4
gave 18.98s, because only 17 tests are slow). Not --dist loadfile, which keeps the file on one worker (59.79s). Check
first that no test depends on another's leftovers, and that session fixtures which must run once use a file lock.`,
    mcqs: [
      mcq('In practice exercise 7, why did the first discount property fail with subtotal=0 and code FLAT50?', [
        ['It lacked the minimum-order precondition the app checks first', true],
        ['FLAT50 in the app really does give money off an empty cart', false],
        ['Hypothesis cannot draw zero from integers with min_value=0', false],
        ['sampled_from picked a coupon that was not in the COUPONS table', false],
      ], 'discount_for assumes the minimum-order rule has already passed; the property ignored that, so an empty cart produced a Rs 50 discount on Rs 0. The app refuses that coupon before the discount runs, zero is a valid draw (it was the counter-example), and sampled_from only picks from the table it was given.'),
      mcq('Adding assume(...) made the discount property pass, with 100 passing and 175 invalid examples. What should be improved?', [
        ['Generate subtotals that meet the minimum directly instead', true],
        ['Raise max_examples to 1,000 so more valid cases are found', false],
        ['Remove assume, because Hypothesis ignores its results anyway', false],
        ['Nothing; a high share of invalid examples improves coverage', false],
      ], 'Every rejected example is wasted work, and Hypothesis gives up if too many are rejected; drawing the subtotal from the coupon minimum upwards makes every example useful. More examples multiply the waste, assume really does discard inputs, and rejected inputs add no coverage.'),
      mcq('Which -m expression selects payment tests that are part of the regression suite?', [
        ['-m "payments and regression"', true],
        ['-m "payments or regression"', false],
        ['-m "payments regression"', false],
        ['-m "payments, regression"', false],
      ], 'and requires both markers on a test. or selects tests carrying either marker, far more than wanted, and a space or comma between names is not valid syntax: pytest stops with "Wrong expression passed to -m" and exit code 4.'),
      mcq('In exercise 4, an autouse function fixture tag_log and a requested fixture cart both apply to test_one. What does --setup-show print first for that test?', [
        ['SETUP F tag_log, then SETUP F cart', true],
        ['SETUP F cart, then SETUP F tag_log', false],
        ['Only SETUP F cart; autouse is hidden', false],
        ['Both at once, on one SETUP line', false],
      ], 'Autouse fixtures are instantiated before the fixtures a test requests at the same scope, and the real run printed tag_log first. --setup-show lists autouse fixtures like any other, one line each.'),
      mcq('The 61.57 s suite has 17 slow tests, all in test_orders.py. Why did -n 4 (18.98 s) run almost as fast as -n auto on eight cores (18.27 s)?', [
        ['Only 17 tests are slow, so four workers already share most of the wait', true],
        ['pytest-xdist ignores -n auto and caps the run at four workers on Windows', false],
        ['The extra four workers were idle because loadfile was the default mode', false],
        ['The gateway stub can only serve four requests at the same time anyway', false],
      ], 'With four workers the 17 three-second waits become about five rounds; eight workers need about three, but each extra worker also costs start-up time, so the totals came out close. -n auto used every core, default distribution is load (not loadfile), and each worker ran its own server.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PYTEST_FRAMEWORK_INTERVIEW_QUESTION',
    notes: `Four questions that come up in automation tester and SDET interviews at product companies, GCCs and service
companies, with an answer that scores well and the follow-up a good interviewer asks next. Say each aloud in about
two minutes, using your own framework's details.

## Q1. "Explain the framework you built."

**Model answer.** "It is a pytest framework for a grocery-delivery API, in layers. Config: one JSON file per
environment, picked with --env, with environment variables overriding the host and supplying secrets. A transport
client wraps a requests.Session with the base URL, timeout, auth header and a log line per request. A service layer
has one method per business action, so tests read like the story. Fixtures in conftest wire it up: settings,
server and a logged-in client are session-scoped; carts and orders come from factory fixtures that delete what
they create. Test cases live in CSV and JSON next to the tests. Markers split smoke from regression, xdist runs it
in parallel, and CI gets JUnit XML plus an HTML report. Adding an endpoint is one method; adding a case is one row."

**Follow-up.** "What would you change?" — "Validate config once at session start instead of in a fixture, so a
missing secret gives one error rather than one per test. And give the framework its own pinned environment; a
shared one auto-loaded plugins we did not use and added two seconds to every worker's start-up."

## Q2. "How do you do data-driven testing in pytest?"

**Model answer.** "parametrize, fed from files when non-programmers maintain the cases. A loader reads CSV with
utf-8-sig, builds the path from the module file, and returns pytest.param objects with a meaningful id per row and
optional marks such as a strict xfail with a ticket number. Expected values are worked out from the rule, not
computed with the app's formula. The assertion message prints the inputs and the response, so a failing row
explains itself: when two rows exactly at the coupon minimum failed and the rows around them passed, the bug was
obvious from the CI summary."

**Follow-up.** "When would you not use it?" — "When rows need different steps; that is two tests. And for large
input spaces on pure functions I add a Hypothesis property, which found a formatting bug at one paisa that no row
in our table covered."

## Q3. "How do you run tests in parallel, and what went wrong?"

**Model answer.** "pytest-xdist with -n auto. Each worker is a separate process, so it needs its own server port and
its own data. Two things went wrong: a test that relied on another test's purchase failed under three workers, and
we fixed the test, not the scheduling; and a session fixture that seeded data ran once per worker, so we used a file
lock in the shared temp directory. Parallelism also is not free: for a quick suite, worker start-up ate the gain;
for the payment tests that wait on a gateway, it cut 61 seconds to 18."

**Follow-up.** "How would you split across machines?" — "xdist parallelises on one machine. Across CI machines we
shard the test list, which the Quality in CI topic covers, and keep the same rule: no test depends on another."

## Q4. "Fixture scope versus conftest: what is the difference?"

**Model answer.** "Scope is how long one instance of a fixture lives: function, class, module, package or session.
conftest.py is where a fixture is visible: the directory and everything below it, without imports. They are
independent. I put framework-wide fixtures in the root conftest, folder-specific ones lower down, and choose the
scope by one rule: if a test can change it, it is function-scoped."

**Follow-up.** "How do you see what a test uses?" — "--fixtures-per-test lists each test's fixtures and where they
are defined; --setup-show prints the setup and teardown order with S, M and F for the scope."`,
    mcqs: [
      mcq('Asked "explain the framework you built", which opening shows the most real experience?', [
        ['The layers, what lives in each, and what one change touches', true],
        ['The list of libraries used, with the version number of each', false],
        ['The number of test cases written and the pass rate achieved', false],
      ], 'Interviewers want to hear design: config, clients, fixtures, data and reports, and how cheap it is to add an endpoint or a case. Library versions and counts say nothing about whether the framework is maintainable, and a pass rate depends on the product, not the framework.'),
      mcq('An interviewer asks how you keep data-driven failures readable. Which answer is strongest?', [
        ['Meaningful ids per row and an assert message that prints inputs and the response', true],
        ['Printing every row and its response to the console with print before asserting', false],
        ['One test function per row, copied from a template, so each has its own name', false],
      ], 'Ids appear in the CI summary and the message carries the evidence, so a failure explains itself without a rerun. Printing everything buries the failing row in output for passing ones, and copied functions lose the single place to change the steps.'),
      mcq('Asked what broke when you moved to pytest-xdist, which answer shows the right lesson?', [
        ['A test relied on another test\'s state, so we made it set up its own', true],
        ['Some tests failed in parallel, so we moved those tests to a serial job', false],
        ['Parallel runs were flaky, so we added three automatic retries to them', false],
      ], 'Fixing the dependence makes the test correct in any order, which is what parallel runs reveal. A serial job and retries keep the hidden coupling and add a slower or less trustworthy pipeline.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PYTEST_FRAMEWORK_CHECKPOINT',
    notes: `Ten questions across the topic: framework layers and configuration, fixtures and scopes at scale, data-driven and
property-based tests, markers, parallel runs and reports. Answer without notes; the result shows which lesson to
revisit.`,
    checkpoint: [
      mcq('A test file contains a URL, an OTP, a time.sleep(2) and three raw requests.post calls. Which framework layer should the OTP move to?', [
        ['The environment, read when settings are loaded', true],
        ['The service layer, next to the login method', false],
        ['The config JSON file of each environment it runs in', false],
        ['A fixture constant in the root conftest', false],
      ], 'The OTP is a secret, so it must come from an environment variable or the CI secret store. The service layer, config files and conftest are all committed to the repository, which would leak it.'),
      mcq('The demo framework starts its own Flask server for the local environment on port 0. Why port 0?', [
        ['The operating system picks a free port, so runs and workers never clash', true],
        ['Port 0 is reserved for test traffic and skips the firewall on every OS', false],
        ['Flask treats port 0 as a signal to run without debug mode and reloader', false],
        ['requests sends calls to port 0 straight to the in-process server object', false],
      ], 'Binding to port 0 asks the OS for any free port, which the fixture then reads from the server; each xdist worker got its own. Port 0 is not a firewall bypass, it has no meaning to Flask\'s debug settings, and requests connects to whatever real port the URL names.'),
      mcq('With --setup-show, which line appears last for a run of two tests that share session, module and function fixtures?', [
        ['TEARDOWN S for the first session fixture that was set up', true],
        ['TEARDOWN F for the function fixture of the second test', false],
        ['TEARDOWN M for the module fixture used by both tests', false],
        ['SETUP S for the session fixture, repeated at the end', false],
      ], 'Teardown is in reverse order of setup, so the first session fixture set up is the last torn down, as TEARDOWN S settings closed the demo run. Function and module teardowns come earlier, and setup lines never repeat at the end.'),
      mcq('make_cart appends each cart id to its list immediately after creating the cart, before adding items. What does that ordering protect against?', [
        ['A cart leaking when adding an item fails inside the factory', true],
        ['Two tests receiving the same cart id from the API server', false],
        ['Carts being deleted before the test has finished with them', false],
        ['The factory adding the same item twice to the one cart', false],
      ], 'The teardown deletes everything in the list, so a cart is cleaned up even when a later add_item assertion fails. Ids come from the server and are unique anyway, deletion happens only after the test, and the ordering does not affect how many items are added.'),
      mcq('A CSV of coupon cases loads with open(DATA_DIR / name, encoding="utf-8-sig"), where DATA_DIR comes from __file__. Which two failures does that line prevent?', [
        ['A missing file when run elsewhere, and a mark hiding a header', true],
        ['Duplicate case ids, and rows with an empty expected value', false],
        ['Slow loading of large files, and Windows line endings in rows', false],
        ['Non-ASCII product names, and amounts with a comma separator', false],
      ], 'Building the path from __file__ makes it independent of the working folder, and utf-8-sig strips an Excel byte-order mark that would otherwise turn case_id into an unknown key. Duplicate ids, empty values and comma amounts need their own checks, and speed is not the issue.'),
      mcq('Which of these is the best candidate for a Hypothesis property test?', [
        ['A pure function that formats paise as rupees with Indian digit grouping', true],
        ['An order endpoint that waits on the payment gateway stub on every call', false],
        ['A Playwright test that books a delivery slot through the website', false],
        ['A smoke test that checks the /health endpoint returns status ok', false],
      ], 'Property tests run a function hundreds of times with generated inputs, which suits fast pure functions; format_inr took well under a second for 100 examples and the property found the missing zero. A slow endpoint or a browser flow would take minutes per property, and a health check has no input space to explore.'),
      mcq('A row must be expected to fail until ticket KK-412 ships, and the team must notice the day it starts passing. Which mark fits?', [
        ['xfail with strict=True and the ticket as the reason', true],
        ['skip with the ticket as the reason, removed by hand', false],
        ['xfail without strict, so the run stays green either way', false],
        ['A custom marker named KK_412, registered in pytest.ini', false],
      ], 'Strict xfail turns an unexpected pass into a failure, which forces the mark to be removed. skip never runs the test, so nobody learns it now passes; non-strict xfail reports XPASS quietly; and a custom marker only labels the test without changing its outcome.'),
      mcq('A pipeline step runs pytest -m smoke on every pull request. Which addition makes sure the step really selects the tests the team expects?', [
        ['Preview the selection with pytest --co -q -m smoke', true],
        ['Add --strict-markers so that typos in -m are rejected', false],
        ['Add -p no:cacheprovider so markers are re-read', false],
        ['Add -v so every deselected test name is printed', false],
      ], 'Collect-only shows exactly which tests the expression picks (4/43 in the demo) without running them. --strict-markers does not check -m expressions, the cache provider has nothing to do with markers, and -v lists the tests that run, not the deselected ones.'),
      mcq('A suite of quick unit tests takes 19 s serially and 16 s with -n auto on eight cores. What is the most likely reason the gain is small?', [
        ['Starting eight worker processes costs about as much as it saves', true],
        ['pytest-xdist runs unit tests serially unless they are marked slow', false],
        ['The default load mode sends every test to the first worker it starts', false],
        ['Eight workers need eight CPUs each, so they slow each other down', false],
      ], 'Each worker is a fresh Python process that imports pytest, plugins and the code under test; when tests are fast, that start-up eats the gain, as with the 1-second gateway wait (19.58s against 16.19s). xdist has no slow-only rule, load hands tests to any free worker, and each worker uses one process, not eight CPUs.'),
      mcq('The product manager wants a test report to open in a browser from an email attachment. Which command produces it?', [
        ['pytest --html=out/report.html --self-contained-html', true],
        ['pytest --junitxml=out/report.xml with a browser viewer', false],
        ['pytest --alluredir=out/report.html for one HTML page', false],
        ['pytest -ra > out/report.html to save the summary text', false],
      ], 'pytest-html with --self-contained-html writes one file with styles and data embedded, so it works as an attachment. JUnit XML is for CI servers, --alluredir writes raw result files that still need the Allure tool, and redirecting terminal text does not make an HTML report.'),
    ],
  },
];
