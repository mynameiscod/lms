/**
 * Career-track content: Capstone: A Test Strategy and Automation Suite (QA_CAPSTONE), QA / SDET, batch QA3 — the
 * track's capstone. Nothing is re-taught; every unit points back to the lesson that taught the idea.
 *
 * The student scopes, designs, automates, load-tests, runs in CI, reports on and defends the testing of one product
 * with a web app and an API. Option A (recommended) is ShopSathi, a fictional Lucknow festive-goods shop: a spec is
 * given in the Brief, and the reference build (one Flask file) carries nine planted defects across UI, API,
 * performance, accessibility and security, listed only in the Defence unit for after the hand-in. Option B is an
 * ed-tech results-day portal built from a spec; Option C is OWASP Juice Shop run locally in Docker, for automation and
 * the authorised baseline checks only. All data is synthetic.
 *
 * Verified by running, on a Windows laptop (Python 3.13): the ShopSathi reference build and its fixed build (Flask 3.1);
 * the pytest framework (conftest starting the app, a test-only reset, an API client); Playwright 1.64 with
 * pytest-playwright 0.10 and page objects in the installed Google Chrome (channel "chrome"); API tests with requests
 * 2.34 and jsonschema 4.26 (boundaries, a decision table, partitions, a schema, two-user authorisation); xfail with
 * strict=True on both builds; the label and cookie baselines; pytest-xdist 3.8 timings; Locust 2.47 headless runs
 * with thresholds in the locustfile (the mixed load, per-endpoint isolation runs with tags, buggy and fixed). Every
 * output quoted is real. The GitHub Actions workflow was parsed with PyYAML, not run. NOT run: Firefox (not
 * downloaded on the machine; left to CI), k6, axe-core, OWASP ZAP and Docker (written from their documentation and
 * marked so).
 *
 * Attribution: the topic is [UI_TEST_AUTOMATION, API_TESTING, PERFORMANCE_TESTING, TEST_DESIGN], default
 * UI_TEST_AUTOMATION; BUILD_AUTOMATION declares UI_TEST_AUTOMATION and API_TESTING, BUILD_QUALITY PERFORMANCE_TESTING
 * and TEST_DESIGN. Checkpoint questions on a skill other than UI_TEST_AUTOMATION name it with ck(); questions drawn
 * from the CI, accessibility and security lessons are tagged with the capstone skill they exercise.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const API = 'API_TESTING';
const PERF = 'PERFORMANCE_TESTING';
const DESIGN = 'TEST_DESIGN';

export const TRACK_QA_CAPSTONE_BUNDLES: PilotBundle[] = [
  /* ── BRIEF ─────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_CAPSTONE_BRIEF',
    notes: `**A QA hiring panel does not ask you to define regression testing. It hands you a product and asks four
questions: what would you test first, what did you automate and why, what did you find, and would you ship it on
Friday?** This capstone gives you answers with evidence. You will take one product with a web app and an API, decide
where its risks are, design the tests, build UI and API automation on a framework a team could extend, load-test the
path that matters on a sale evening, run all of it in CI, add accessibility and security baselines, and write the
release report a manager can act on.

You have every piece. QA1 gave you Testing as a Practice, Test Design, and Test Data and SQL for Testers. QA2 gave you
A pytest Test Framework, Playwright, Selenium with Java and API Testing. QA3 gave you Performance Testing, Quality in CI,
and Mobile, Accessibility and Security Checks. Nothing here is new; the capstone is about joining them and choosing.

## Three products, one standard

| | **Option A — ShopSathi (recommended)** | **Option B — ResultSetu** | **Option C — OWASP Juice Shop** |
|---|---|---|---|
| What | A fictional Lucknow shop for kurtas, diyas and gift hampers, with Diwali sale evenings | A fictional ed-tech results portal: log in on results day, see marks, pay for re-evaluation by UPI | The OWASP Foundation's deliberately insecure open-source shop, run on your laptop in Docker |
| You get | The spec below and a reference build with nine planted defects | Stories you turn into a spec; you build it and a batch-mate plants defects | A full app and REST API with no spec: you write the test basis by exploring |
| The hard question | "Free delivery is 'Rs 499 or more'. Prove it." | "Results go live at 10:00 and everyone logs in at 10:01. Will it hold?" | "Which known weaknesses would your baseline checks actually catch?" |

All three are graded on the same rubric. **Option A is recommended**: its defects are planted and recorded, so a
reviewer can say how many you found and how many you missed. Option C runs only on your own machine
(docker run --rm -p 3000:3000 bkimminich/juice-shop, from the project's documentation); automate its UI and API and keep
to the authorised baseline checks from Security Testing Basics for QA. Its hacking challenges are out of scope here.

## The ShopSathi spec (your test basis)

Pages: /, /search?q=, /login, /cart, /checkout, /orders/<id>. The JSON API uses a Bearer token from /api/login.

| Endpoint | Contract |
|---|---|
| POST /api/login | {email, password} gives 200 {token, user_id}; a wrong password gives 401 |
| GET /api/products?q= | {items: [product], count}; no token needed |
| GET /api/products/<id> | {id, name, category, price_paise (integer), in_stock}; 404 if unknown |
| GET /api/cart | lines, subtotal_paise, discount_paise, delivery_paise, total_paise, coupon |
| POST /api/cart/items | {product_id, qty} sets the line; 422 for a bad quantity or product |
| POST /api/cart/coupon | {code}; 422 for an unknown code |
| POST /api/orders | {upi_id}: 201 with a Location header; 409 empty cart; 422 invalid UPI ID; 402 declined |
| GET /api/orders/<id> | The caller's own order only; anyone else's is 404 |
| POST /api/test/reset | Test builds only: reseed the catalogue, empty every cart, delete orders |

Business rules:

- **R1** Delivery costs Rs 49 and is free when the subtotal is Rs 499 or more.
- **R2** FESTIVE15 takes 15% off the subtotal, capped at Rs 150.
- **R3** At most 5 of any product per order, enforced by the UI and the API.
- **R4** Search ignores case and surrounding spaces.
- **R5** A UPI ID is handle@bank in lower case; any ID at @failbank is declined with "no money was taken".
- **R6** Money is integer paise in the API; the UI shows rupees with two decimals.
- **R7** On a sale evening (30 shoppers at once in the lab) p95 latency stays under 300 ms with under 1% errors;
  every form field has a label; the session cookie is HttpOnly with a SameSite attribute.

Two synthetic users (asha@example.test and ravi@example.test) and eight products from Rs 199 to Rs 1,599.

The reference build is one Flask file of about 300 lines, started with python shopsathi.py --port 5055; your mentor
shares it. **Nine defects are planted** across UI, API, performance, accessibility and security. They are not listed
here: finding them is the work. If you build ShopSathi yourself from this spec, ask a batch-mate to plant at least six
defects in your copy, from different areas, and to keep the list sealed until your report is in.

## Risks first

Before any code (Test Plans, Test Strategy and Risk-Based Testing):

| Risk | Impact | Likelihood | Where it is tested |
|---|---|---|---|
| A wrong total: delivery, coupon or quantity rules | Overcharging or lost money on the busiest day | High: rules with boundaries | API tests for every rule; two UI journeys show the same numbers |
| One customer sees another's order | Personal data exposed | Medium | API tests with two logged-in users |
| Checkout slow on a sale evening | Lost sales in the best hour of the year | Medium | Locust with thresholds, nightly and before a sale |
| Checkout unusable with a screen reader | Customers shut out | Medium | A label check in CI; a manual keyboard pass |
| Search silently misses products | Lost sales nobody reports | Medium | API partitions; one UI test |
| The UI and the API disagree on a rule | A bug only partners or the app hit | Medium | The rule tested once at each layer |

## The strategy in one picture

    many  API tests: rules, negatives, auth, schemas          every push, seconds
    few   UI journeys with page objects, two engines          every pull request
    one   load test with thresholds                           nightly, and before a sale
    plus  baselines: labelled fields, cookie flags            every pull request
    plus  exploratory charters                                each release, by a person

Push each check to the lowest level that can catch it (Test Levels, Types and the Test Pyramid). The delivery
boundary is three API tests that take milliseconds, plus one UI test proving the screen shows the number the API
computed. Forty UI tests of the same rule would be slower, flakier and no more convincing.

## Milestones (about four weeks part-time)

| Milestone | Done when |
|---|---|
| M1 — Plan | TEST-STRATEGY.md: scope, risks, levels, environments, entry and exit criteria, what is out |
| M2 — Design | TEST-CASES.md: partitions, boundaries, a decision table, a state model, traced to R1–R7 |
| M3 — Automate | UI suite with page objects, API suite with schemas and auth, data that cleans up |
| M4 — Quality | Load test with thresholds, CI with reports and traces, accessibility and security baselines |
| M5 — Report and defend | DEFECTS.md, QUALITY-REPORT.md with a ship or no-ship call, the demo rehearsed |

## What "done" means

A reviewer clones the repository, installs the requirements and runs pytest -m smoke: the app starts by itself and the
smoke tests finish in under a minute. They open the CI run and find the HTML report and a trace for every failure.
They read DEFECTS.md and reproduce each defect from its steps. They read QUALITY-REPORT.md and know whether to ship,
and what would change the answer.`,
    workedExample: `**A one-page TEST-STRATEGY.md for ShopSathi (abridged).**

**Scope.** In: search, cart, login and checkout in the web app; the JSON API; performance of search and cart on a sale
evening; accessibility of checkout; baseline security of sessions and order access. Out: the real UPI gateway (the
app's @failbank rule stands in for a decline), email and SMS, the admin side, mobile apps, browsers beyond Chromium
and Firefox.

**Test basis and open questions.** Spec rules R1–R7 and the API table. Raised before testing, as From User Stories to Test
Cases taught: Q1, does "Rs 499 or more" apply before or after FESTIVE15?
Assumed before (the subtotal) until the product owner answers. Q2, is the limit of five per product or per order? The
spec says per product.

**Levels and tools.** API (pytest, requests, jsonschema): every rule with its boundaries and negatives, a token check
on every protected endpoint, two-user checks on orders, a schema for each response type. UI (Playwright with
pytest-playwright and page objects): six to eight journeys that prove the screens show what the API computed and that
checkout completes. Performance (Locust): the sale-evening mix of search, product and add-to-cart at 6:3:1, 30 users,
p95 under 300 ms, errors under 1%. Baselines: an unlabelled-field check on every page; cookie flags. Exploratory: two
45-minute charters, "Explore checkout with unusual UPI IDs and the back button to discover payment-state bugs" and
"Explore search with spaces, mixed case and transliterated Hindi to discover missed products".

**Environments and data.** conftest starts a local build for each run; synthetic users and products; a test-only reset
before and after every test. The same suite runs against a shared environment by setting SHOP_URL, where reset is
replaced by deleting what each test created.

**Entry criteria.** The build starts from one command and smoke passes. **Exit criteria.** No open Critical or High
defect without a written product decision; every rule R1–R7 has at least one passing or known-failing test; load
thresholds met; no unlabelled field on checkout.

**Risks to the testing itself.** Firefox may not download on a locked-down laptop, so it runs in CI. The lab load test
shares one laptop with the app, so its numbers compare builds; they are not a capacity figure for production.`,
    mcqs: [
      mcq('ShopSathi\'s rule R1 makes delivery free from Rs 499. Where should most of the tests for that boundary live?', [
        ['Three API tests just below, on and above Rs 499, and one UI test that the screen shows the same delivery', true],
        ['A Playwright test for each boundary value, since only the browser shows a shopper what they are finally charged', false],
        ['One long UI journey with a large cart, because a correct grand total proves every rule beneath it', false],
        ['Nowhere in automation: a rule this simple is checked once by hand during the exploratory charter', false],
      ], 'Test Levels, Types and the Test Pyramid: put each check at the lowest level that can catch it, so the boundary is cheap API tests and one UI test proves the screen agrees. Browser tests per value are slow and flaky, a single large cart never touches the boundary, and a manual check is not repeated on the next release.'),
      mcq('Why is Option A, ShopSathi, the recommended product for the capstone?', [
        ['Its defects are planted and recorded, so a reviewer can say how many you found and missed', true],
        ['Its spec is complete and unambiguous, so no question ever needs to go to a product owner', false],
        ['It needs no coding at all, because its tests can be recorded with a browser plug-in instead', false],
        ['It is the only option whose API can be automated in Python with requests and jsonschema', false],
      ], 'A known set of planted defects turns "I tested it" into a measurable result. The spec does have gaps (whether R1 applies before or after the coupon), the capstone is a coded framework, and Juice Shop and ResultSetu APIs can be tested with the same Python tools.'),
      mcq('A teammate wants the capstone judged on test count: "aim for 300 automated tests". What does the strategy say instead?', [
        ['Judge it on risks covered and defects found, with each rule tested at the lowest level that catches it', true],
        ['Agree, since a larger suite always finds more defects and a reviewer cannot easily argue with the number itself', false],
        ['Aim for 300 UI tests in particular, since the browser is the layer that real shoppers actually use', false],
        ['Count lines of test code instead, because one long test can cover what several short tests would', false],
      ], 'Test Plans, Test Strategy and Risk-Based Testing put effort where the risk is; three hundred tests of easy paths can miss the coupon cap entirely. A bigger UI suite is slower and flakier, and lines of code measure effort rather than what is protected.'),
    ],
    checkpoint: [
      ck(DESIGN, 'ShopSathi\'s spec says delivery is free "on orders of Rs 499 or more" but not whether that is before or after FESTIVE15. What should the tester do first?', [
        ['Raise it with the product owner, record the assumption, and test against the answer', true],
        ['Pick whichever reading makes more of the existing tests pass, and then move on', false],
        ['Test both readings and report whichever one fails as the defect in the build', false],
        ['Leave the delivery rule out of scope until a later release has clarified it', false],
      ], 'An ambiguity in the test basis is a question for the people who own the rule (From User Stories to Test Cases); the assumption is written down so the tests can be corrected if the answer differs. Choosing the passing reading hides a possible bug, one of the "both readings" reports is always wrong, and dropping a money rule ignores the top risk.'),
      ck(API, 'Which ShopSathi risk is tested by API tests that log in as two different customers?', [
        ['One customer reading another customer\'s order through /api/orders/<id>', true],
        ['The search page missing products when the query ends with a space', false],
        ['The checkout field for the UPI ID having no label for screen readers', false],
        ['Search latency rising past 300 ms when thirty shoppers browse the catalogue at once', false],
      ], 'Authorisation is about who may read what, so the test needs a second identity that must be refused (Testing Authentication, Authorisation and Input Handling). Search spaces are an input partition, the label is an accessibility check, and latency is a load test; none needs two users.'),
      mcq('ShopSathi\'s strategy plans only six to eight UI journeys. Why so few?', [
        ['Rules are tested below; the journeys prove screens show the API\'s numbers and checkout works', true],
        ['Playwright tests are too flaky to rely on, so the API suite stands in for every screen as well', false],
        ['Each journey must run on two engines, and the CI runner cannot fit more than eight in an hour', false],
        ['The reference build has only eight pages, and the rule is one UI test per page in the app', false],
      ], 'A small set of journeys checks what only the browser can show, while rules and negatives sit in fast API tests (Test Levels, Types and the Test Pyramid). Playwright is reliable when written well, eight journeys take minutes not hours, and tests follow risks rather than a per-page quota.'),
    ],
  },

  /* ── BUILD_AUTOMATION ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_CAPSTONE_BUILD_AUTOMATION',
    notes: `**The build half: designed test cases traced to the spec, a Playwright suite with page objects, an API suite
with schemas and authorisation tests, and test data that cleans up after itself, on a framework a new teammate could
extend on their second day.** It draws on Test Design (all of it), Test Data: Creating, Masking and Cleaning Up, A pytest
Test Framework, Playwright (Locators That Do Not Break; Page Objects and Test Structure) and API Testing (What to Test in
an API; API Tests in Python with requests and pytest; Testing Authentication, Authorisation and Input Handling).

Everything quoted below was run against the ShopSathi reference build on a Windows laptop: Python 3.13, pytest 9.1,
Playwright 1.64 with pytest-playwright 0.10 in the installed Google Chrome (--browser-channel chrome), requests 2.34
and jsonschema 4.26. The outputs are real, failures included.

## The repository

    shopsathi-quality/
      README.md  TEST-STRATEGY.md  TEST-CASES.md  DEFECTS.md  QUALITY-REPORT.md
      requirements.txt  pytest.ini  conftest.py
      app/shopsathi.py              the product under test (or your build of it)
      pages/__init__.py             LoginPage, SearchPage, CartPage, CheckoutPage
      schemas/product.json  cart.json  order.json
      tests/api/  test_cart_rules_api.py  test_products_api.py
      tests/ui/   test_cart_ui.py  test_baseline_checks.py
      perf/locustfile.py                                    (next unit)
      .github/workflows/quality.yml                         (next unit)

pytest.ini registers the markers smoke and regression with --strict-markers, as Markers, Plugins and Reports taught.

## Step 1 — Design before you automate

TEST-CASES.md comes first. Each rule gets the technique that fits it.

**R1 delivery: boundaries on the subtotal.** The ideal values are Rs 498, 499 and 500. The catalogue can make Rs 498
(a Clay Diya Pack at 199 and a Rangoli Kit at 299) and Rs 499 (the Brass Diya Set), but no combination of its prices
makes exactly Rs 500. Either add a test product through a data fixture or take the nearest value above, Rs 598 (two
Rangoli Kits), and write down why. That is a test-data decision, and a reviewer will ask about it.

| ID | Cart | Subtotal | Expected delivery |
|---|---|---|---|
| DEL-01 | Clay Diya Pack + Rangoli Kit | Rs 498 | Rs 49 |
| DEL-02 | Brass Diya Set | Rs 499 | free |
| DEL-03 | 2 x Rangoli Kit | Rs 598 | free |

**R2 FESTIVE15: a decision table.** Conditions: is the code valid, and does 15% exceed Rs 150? Three rules: valid and
under the cap (15% off; a Rs 999 dupatta gives Rs 149.85), valid and over the cap (exactly Rs 150 off; a Rs 1,599
hamper), invalid (422 "unknown coupon").

**R3 quantity: partitions.** 0 and below, 1 to 5, 6 and above, not a number. Boundaries 0, 1, 5, 6, plus "two".

**Checkout: a state model.** A cart becomes an order only on a successful payment; a decline (402), an invalid UPI ID
(422) or an empty cart (409) leaves the cart as it was (State Transition Testing). Each transition gets one API test,
and the happy path gets one UI journey.

Trace each case to its rule: use the case id in the test id, as below, so the report shows "DEL-02" next to a failure.

## Step 2 — The framework skeleton

conftest.py starts the app for the run, cleans state around every test and offers logged-in API clients:

    @pytest.fixture(scope="session")
    def base_url():
        if os.environ.get("SHOP_URL"):            # point the same suite at a shared environment
            yield os.environ["SHOP_URL"]; return
        server = make_server("127.0.0.1", 0, create_app(fixed=FIXED), threaded=True)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        yield f"http://127.0.0.1:{server.server_port}"
        server.shutdown()

    @pytest.fixture(autouse=True)
    def clean_state(base_url):
        requests.post(f"{base_url}/api/test/reset", timeout=5)
        yield
        requests.post(f"{base_url}/api/test/reset", timeout=5)

    class ApiClient:
        def __init__(self, base_url):
            self.base, self.s = base_url, requests.Session()
        def login(self, email, password):
            r = self.s.post(f"{self.base}/api/login", json={"email": email, "password": password}, timeout=5)
            r.raise_for_status()
            self.s.headers["Authorization"] = f"Bearer {r.json()['token']}"
            return self
        # get() and post() prefix the base URL and set a timeout

    @pytest.fixture
    def asha_api(base_url): return ApiClient(base_url).login("asha@example.test", "Asha@2026")

pytest-playwright's page.goto("/login") uses the same base_url fixture, so UI and API tests hit one server. Port 0
asks the operating system for a free port, so two runs on one machine never collide. The reset endpoint exists only
in test builds; against a shared environment, each test deletes what it created instead (a factory fixture that
records ids and removes them in teardown, as in Test Data: Creating, Masking and Cleaning Up).

## Step 3 — UI tests with page objects

    class SearchPage:
        def __init__(self, page: Page):
            self.page = page
            self.box = page.get_by_label("Search products")
            self.status = page.get_by_role("status")

        def search(self, text: str):
            self.page.goto("/")
            self.box.fill(text)
            self.page.get_by_role("button", name="Search").click()
            return self

        def add_to_cart(self, name: str, qty: int = 1):
            card = self.page.get_by_role("listitem").filter(
                has=self.page.get_by_role("heading", name=name))
            card.get_by_label("Quantity").select_option(str(qty))
            card.get_by_role("button", name="Add to cart").click()

    class CartPage:
        def __init__(self, page: Page):
            self.rows = page.get_by_role("table", name="Cart items").get_by_role("row")
            self.subtotal = page.get_by_test_id("subtotal")
            self.delivery = page.get_by_test_id("delivery")
            self.total = page.get_by_test_id("total")

    @pytest.mark.regression
    def test_free_delivery_at_exactly_499(signed_in: Page):
        SearchPage(signed_in).search("brass").add_to_cart("Brass Diya Set of 6")
        cart = CartPage(signed_in)
        expect(cart.subtotal).to_have_text("Rs 499.00")
        expect(cart.delivery).to_have_text("Rs 0.00")

signed_in logs in through LoginPage and checks "Signed in as" before handing over the page, as in Page Objects and
Test Structure. A second test searches "kurta", expects "2 results", adds a kurta and two clay-diya packs and checks the
Rs 1,697.00 total; it passed. The boundary test did not:

    >       expect(cart.delivery).to_have_text("Rs 0.00")
    E       AssertionError: Locator expected to have text 'Rs 0.00'
    E       Actual value: Rs 49.00
    E       Call log:
    E         - Expect "to_have_text" get_by_test_id("delivery") with timeout 5000ms
    E         - waiting for get_by_test_id("delivery")
    E           14 × locator resolved to <span data-testid="delivery">Rs 49.00</span>
    E              - unexpected value "Rs 49.00"

Read it like a tester: the subtotal assertion passed, so the cart held exactly Rs 499; the web-first assertion retried
for five seconds and the value never changed, so this is not a timing problem. Delivery was charged on the boundary.

## Step 4 — The API suite

The same rule at the API layer, with the case ids as test ids:

    @pytest.mark.parametrize("lines, subtotal, delivery", [
        pytest.param([(DIYA_CLAY, 1), (RANGOLI, 1)], 49800, 4900, id="DEL-01 Rs 498 pays delivery"),
        pytest.param([(DIYA_BRASS, 1)], 49900, 0, id="DEL-02 Rs 499 is free"),
        pytest.param([(RANGOLI, 2)], 59800, 0, id="DEL-03 Rs 598 is free"),
    ])
    def test_delivery_boundary(asha_api, lines, subtotal, delivery):
        cart = cart_with(asha_api, *lines)
        assert (cart["subtotal_paise"], cart["delivery_paise"]) == (subtotal, delivery)

With the coupon decision table, the quantity partitions and a "no token gives 401" test, the rules file ran 11 tests:

    FAILED tests/api/test_cart_rules_api.py::test_delivery_boundary[DEL-02 Rs 499 is free]
    FAILED tests/api/test_cart_rules_api.py::test_festive15_discount[CPN-02 capped at Rs 150]
    FAILED tests/api/test_cart_rules_api.py::test_quantity_partitions[QTY-6] - As...
    3 failed, 8 passed in 2.08s

    E   assert (49900, 4900) == (49900, 0)
    E   assert 23985 == 15000
    E   AssertionError: {... 'name': 'Clay Diya Pack of 12', 'product_id': 104, 'qty': 6, ...}

Three rules broken. DEL-02 confirms the UI failure is in the rule, not the screen. The coupon took Rs 239.85 off a
Rs 1,599 hamper: the cap was never applied. And the API accepted six of one product, although the UI's quantity list
stops at five: the rule lives only in the page, so anyone calling the API directly (a partner, the mobile app, a
script) bypasses it. Two layers disagreeing is a defect of its own.

**Schemas.** schemas/product.json says price_paise is an integer, the fields are required and no others are allowed.
The list endpoint matched it. The detail endpoint, for three products:

    E   assert ["price_paise...pe 'integer'"] == []
    E     Left contains one more item: "price_paise: '129900' is not of type 'integer'"

The same field is a number in the list and a string in the detail: schema drift. A client that adds prices from the
detail page gets "129900129900" in JavaScript. The helper prints each error with its path, so the failure names the
field without anyone opening the response.

**Authorisation with two users.** Asha places an order; Ravi asks for it by the Location URL:

    def test_customer_cannot_read_another_customers_order(asha_api, ravi_api):
        asha_api.post("/api/cart/items", json={"product_id": 104, "qty": 1})
        placed = asha_api.post("/api/orders", json={"upi_id": "asha@okbank"})
        assert placed.status_code == 201
        order_url = placed.headers["Location"]
        assert asha_api.get(order_url).status_code == 200
        assert ravi_api.get(order_url).status_code == 404   # not 403: do not confirm it exists

    E       AssertionError: assert 200 == 404
    E        +  where 200 = <Response [200]>.status_code
    E        +    where <Response [200]> = get('/api/orders/5001')

Any logged-in customer can read any order: name, items, amount and UPI reference. That is the most serious defect so
far, and it is invisible in the UI, whose order page checks the owner. Only an API test with a second identity sees it.

## Step 5 — Known defects in a green-or-red suite

Report each defect in DEFECTS.md (Defects: Finding, Reporting and the Bug Lifecycle), then mark its test so the
suite stays readable without hiding the bug:

    @pytest.mark.xfail(strict=True, reason="SS-1: delivery charged at exactly Rs 499")

On the buggy build: "XFAIL ... SS-1: delivery charged at exactly Rs 499", 1 xfailed. On the fixed build the same test
passes, and strict=True turns that into a failure: "[XPASS(strict)] SS-1: delivery charged at exactly Rs 499",
1 failed. The red build is the reminder to remove the marker and close the defect.

## The whole run

    $ pytest --browser-channel chrome                       buggy build
    10 failed, 12 passed in 20.39s
    $ SHOP_BUILD=fixed pytest --browser-channel chrome      fixed build
    22 passed in 24.51s

The 22 include the four baseline checks of the next unit. The reference build has nine planted defects; this suite
found seven of them. One of the two it missed will only show under load (next unit); the other is waiting in one of
the rules R1–R7 for an exploratory session or a better partition.

## Deliverables

1. TEST-CASES.md: every rule R1–R7 with its technique (partitions, boundaries, decision table, state model), the case
   ids, and the test-data decisions such as Rs 598.
2. The framework: conftest that starts the app and cleans up, an API client, configuration by environment variable,
   registered markers.
3. Page objects for login, search, cart and checkout; at least six UI journeys; no sleeps; assertions only in tests.
4. API tests: every rule with boundaries and negatives, a schema per response type, 401 without a token, two-user
   authorisation on orders.
5. DEFECTS.md with a report per defect, and the matching tests marked xfail(strict=True) with the defect id.

## Acceptance checks

- pytest -m smoke runs from a clean clone with one command and starts the app itself.
- Every test can run alone, in any order and in parallel (each starts from reset state).
- No time.sleep or wait_for_timeout anywhere; every UI check is a web-first expect.
- Every defect in DEFECTS.md has a failing (or xfail) test that reproduces it.

## Common traps

- **Testing rules only through the UI.** Slow, flaky, and blind to the API that bypasses the UI's limits.
- **One user in the API suite.** Authorisation defects need a second identity that must be refused.
- **Asserting status codes only.** The schema drift returned 200 every time.
- **Tests that depend on each other's data.** Reset or delete per test; never rely on run order.`,
    mcqs: [
      mcq('ShopSathi\'s UI quantity list stops at 5, but POST /api/cart/items accepted qty 6. How should this be reported?', [
        ['As a defect: the limit lives only in the page, so any client calling the API bypasses it', true],
        ['As not a defect, because no real shopper can choose 6 from a list that stops at the value 5', false],
        ['As a UI defect, because the quantity list ought to offer every value that the API accepts', false],
        ['As a test defect, since API tests should only use values that the user interface can produce', false],
      ], 'Business rules must hold at the API, because partners, apps and scripts call it directly (Testing Authentication, Authorisation and Input Handling). Widening the list makes the breach easy for everyone, and API tests exist precisely to send what the UI cannot.'),
      mcq('The test for the R1 boundary needs a cart worth exactly Rs 500, but no combination of ShopSathi\'s prices makes it. What is the sound choice?', [
        ['Add a test product through a fixture, or use the nearest value above, Rs 598, and record why', true],
        ['Drop the "just above" case, because the on-boundary case at Rs 499 already covers the rule', false],
        ['Change a product\'s price in the shared catalogue for the run and leave it for the next tests', false],
        ['Test Rs 500 through the UI only, by typing the amount into the cart total field directly', false],
      ], 'Boundary analysis wants values on both sides; when the data cannot produce them, you create the data or take the nearest value and say so (Test Data: Creating, Masking and Cleaning Up). Dropping a side halves the boundary, leaking a price change breaks other tests, and the cart total is not an input.'),
    ],
    assignment: {
      title: 'Capstone: Test Design, UI and API Automation',
      description: 'For the product you chose in the Brief, design traced test cases from the spec, and build the UI and API automation on a pytest framework a team could extend: page objects in Playwright, API tests with schemas, negatives and two-user authorisation, test data that cleans up, and every defect found reported and reproduced.',
      instructions: `Build the automation for the option you chose in the Brief, as described in this unit's notes, against a
build you run on your laptop. Submit a link to the repository (or a zip) and a short screen recording of a full run.

**Submit:**

1. TEST-CASES.md: each rule with the technique used, case ids traced to the rule, and the test-data decisions you made.
2. The framework: conftest that starts the app and resets or deletes data around each test, an API client, base URL
   from configuration, markers registered with --strict-markers, a README with one-command setup.
3. The UI suite: page objects for every page you test, role, label or test-id locators, at least six journeys chosen
   by risk, no sleeps, assertions only in tests.
4. The API suite: every business rule with boundaries and negatives, one JSON Schema per response type, 401 without a
   token, and authorisation tested with a second user.
5. DEFECTS.md: one report per defect (steps, expected, actual, evidence, severity), each with a test marked
   xfail(strict=True) and the defect id.
6. The output of a full run on your build, and, if you built the app yourself, the fixed build passing everything.

**Before you submit,** go through each acceptance check in the notes and point to where it is met.`,
      rubric: [
        { criterion: 'Test design and traceability', description: 'Partitions, boundaries, a decision table and a state model applied where they fit; case ids traced to every rule; test-data limits recognised and decided in writing.', maxPoints: 20 },
        { criterion: 'Framework structure', description: 'conftest starts the app and isolates every test; an API client; configuration by environment; markers registered; a new test needs no copy-paste of setup.', maxPoints: 15 },
        { criterion: 'UI automation', description: 'Page objects with product-language methods and no assertions; resilient locators; web-first assertions with no sleeps; journeys chosen by risk; the fixture checks login before use.', maxPoints: 20 },
        { criterion: 'API automation', description: 'Every rule with negatives at the API; schemas for every response type with readable failures; 401 and two-user authorisation tests; status, body and headers asserted.', maxPoints: 20 },
        { criterion: 'Defects found and reported', description: 'Planted defects found (or a batch-mate\'s list matched); reports a developer can reproduce; severity justified; each defect pinned by an xfail(strict=True) test.', maxPoints: 15 },
        { criterion: 'Runnability and honesty', description: 'One-command setup from a clean clone; tests independent and parallel-safe; browsers actually run and anything not run stated plainly.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  /* ── BUILD_QUALITY ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_CAPSTONE_BUILD_QUALITY',
    notes: `**The quality half: a load test with thresholds that finds a real bottleneck, the suites running in CI with
reports and traces, accessibility and security baselines, and the quality report that turns all of it into a release
decision.** It draws on Performance Testing (Performance Testing: Questions Before Tools; Reading Performance Numbers;
Load Tests with Locust and k6; Finding the Bottleneck), Quality in CI (Running Tests in CI; Fast Feedback: Parallelism,
Sharding and Test Selection; Managing Flaky Tests and Test Health; A Quality Strategy for a Product) and Mobile,
Accessibility and Security Checks (Accessibility Testing; Security Testing Basics for QA).

The Locust runs below are real: Locust 2.47 against the ShopSathi reference build on Flask's threaded development
server, both on one laptop. The workflow was parsed with PyYAML, not run on GitHub. k6, axe-core and OWASP ZAP were not
installed; their snippets are written from the documentation and marked so.

## Part 1 — The load test

The question first, as Performance Testing: Questions Before Tools insisted: "Can ShopSathi serve a sale evening, 30
shoppers at once in the lab, with p95 under 300 ms and under 1% errors?" The workload model comes from what shoppers do:
search six times, open three products, add one to the cart, with 0.5 to 1.5 seconds of thinking in between.

    class Shopper(HttpUser):
        wait_time = between(0.5, 1.5)

        def on_start(self):
            email, pw = random.choice(USERS)
            r = self.client.post("/api/login", json={"email": email, "password": pw}, name="/api/login")
            self.client.headers["Authorization"] = f"Bearer {r.json()['token']}"

        @tag("search")
        @task(6)
        def search(self):
            self.client.get("/api/products", params={"q": random.choice(TERMS)}, name="/api/products?q=")

        @tag("browse")
        @task(3)
        def product(self):
            self.client.get(f"/api/products/{random.randint(101, 108)}", name="/api/products/[id]")
        # add_to_cart, tagged "cart", weight 1

    @events.quitting.add_listener
    def thresholds(environment, **_):
        total = environment.stats.total
        p95 = total.get_response_time_percentile(0.95)
        verdict = []
        if total.fail_ratio > 0.01: verdict.append(f"failure ratio {total.fail_ratio:.2%} > 1%")
        if p95 > 300: verdict.append(f"p95 {p95:.0f} ms > 300 ms")
        environment.process_exit_code = 1 if verdict else 0
        print("THRESHOLDS:", "FAIL - " + "; ".join(verdict) if verdict else f"PASS (p95 {p95:.0f} ms)")

The name= argument groups /api/products/101 to /108 into one row; without it the report has eight rows of a few
requests each. The thresholds live in the file, so CI fails on a breach without anyone reading the table.

**Run 1, the reference build:** locust -f perf/locustfile.py --headless -u 30 -r 10 -t 20s --only-summary (output
abridged: columns and rows trimmed, numbers as printed)

    THRESHOLDS: FAIL - p95 570 ms > 300 ms
    Name                    # reqs  # fails |  Avg   Min   Max   Med | req/s
    /api/cart/items             37   0(0%)  |  139    10   787    45 |  2.04
    /api/login                  30   0(0%)  |   55    28    91    56 |  1.65
    /api/products/[id]         125   0(0%)  |   91     9  1114    34 |  6.88
    /api/products?q=           276   0(0%)  |  157    40  1190    99 | 15.20
    Aggregated                 468   0(0%)  |  132     9  1190    71 | 25.77

    Percentiles                 50%   90%   95%   99%  100%
    /api/products?q=             99   280   620   800  1200
    Aggregated                   71   270   570   790  1200
    exit code: 1

The median of 71 ms looks healthy; the p95 of 570 ms fails, and one shopper in a hundred waited about 0.8 seconds.
Averages and medians hide the tail (Reading Performance Numbers). No errors: the system is slow, not broken.

## Part 2 — Finding the bottleneck

Isolate before you guess. Same build, one kind of request at a time, using the tags (--tags search):

| Run | Users | req/s | Median ms | p95 ms | Verdict |
|---|---|---|---|---|---|
| product detail only | 30 | 30.17 | 9 | 66 | PASS |
| search only | 10 | 10.17 | 37 | 96 | PASS |
| search only | 30 | 27.69 | 73 | 210 | PASS |
| search only | 60 | 33.68 | 770 | 910 | FAIL |
| search only, fixed build | 60 | 54.15 | 36 | 46 | PASS |

From 30 to 60 users, search throughput rose by only 6 requests a second while the median went up tenfold. **Flat
throughput with exploding latency is a queue in front of something that serves one request at a time.** And 1 / 33.68
is 0.0297 seconds: one search's 30 ms "database call". The code confirms it: every search holds one global lock
around that call, so searches line up behind each other. That is the eighth planted defect. In real systems the same
shape comes from a connection pool of one, a synchronised block or a table lock (Finding the Bottleneck).

Notice also that in Run 1, product detail's p95 rose to about 500 ms although it never takes the lock: on one small
server, a queue slows its neighbours. That is why you isolate before blaming an endpoint.

**Run 2, the fixed build, same mix:** THRESHOLDS: PASS (p95 38 ms), exit code 0. An earlier run of the same build on
the same laptop gave p95 130 ms. Report a range from at least three runs, not one number, and say that Locust and the
app shared a laptop: these numbers compare builds; they are not production capacity.

**The same test in k6** (written from the k6 documentation, not run here), for teams that use it:

    import http from 'k6/http';
    import { check, sleep } from 'k6';
    export const options = {
      vus: 30, duration: '60s',
      thresholds: { http_req_duration: ['p(95)<300'], http_req_failed: ['rate<0.01'] },
    };
    export default function () {
      const r = http.get('http://127.0.0.1:5055/api/products?q=diya');
      check(r, { 'status is 200': (res) => res.status === 200 });
      sleep(1);
    }

## Part 3 — Accessibility and security baselines

Two cheap checks run with the UI suite on every pull request. They do not replace axe, a screen-reader pass or a
scanner; they stop the commonest regressions from coming back.

    UNLABELLED = """() => [...document.querySelectorAll('input:not([type=hidden]), select, textarea')]
      .filter(el => !(el.labels && el.labels.length) && !el.getAttribute('aria-label')
                    && !el.getAttribute('aria-labelledby'))
      .map(el => el.outerHTML)"""

    @pytest.mark.parametrize("path", ["/", "/login", "/checkout"])
    def test_every_form_field_has_a_label(page, path):
        LoginPage(page).open().login("asha@example.test", "Asha@2026")
        page.goto(path)
        assert page.evaluate(UNLABELLED) == []

    def test_session_cookie_flags(base_url):
        r = requests.post(f"{base_url}/login", data={...}, allow_redirects=False, timeout=5)
        cookie = r.headers["Set-Cookie"]
        assert "HttpOnly" in cookie
        assert "SameSite=Lax" in cookie or "SameSite=Strict" in cookie

On the reference build:

    E   Left contains one more item: '<input name="upi_id" placeholder="yourname@bank">'
    E   AssertionError: assert 'HttpOnly' in 'session=eyJlbWFp...; Path=/'
    2 failed, 2 passed in 4.08s

The UPI field on checkout has a placeholder and no label: a screen reader announces "edit text" and nothing else, and
the hint vanishes as soon as a sighted user types (Accessibility Testing). And the session cookie can be read by any
script on the page, with no SameSite attribute. On the fixed build: 4 passed.

**Going deeper, in outline.** axe-core finds far more than one rule: inject it from its npm package and run it
(axe-core's documentation; not run here, the package was not installed):

    page.add_script_tag(path="node_modules/axe-core/axe.min.js")
    violations = page.evaluate("async () => (await axe.run()).violations")

Then a keyboard-only pass of checkout, by hand, because automation cannot judge whether the focus order makes sense.
For security, an authorised OWASP ZAP baseline scan against your own local build only (the zap-baseline.py script in
the project's Docker image; see the ZAP documentation for the current image name) reports missing headers and cookie
flags passively. Never point a scanner at a site you do not own or have written permission to test.

## Part 4 — Quality in CI

    name: quality
    on:
      pull_request:
      workflow_dispatch:
      push: { branches: [main] }
      schedule:
        - cron: "30 20 * * *"         # 02:00 IST: nightly regression and load
    concurrency:
      group: quality-\${{ github.ref }}
      cancel-in-progress: true
    jobs:
      smoke:                          # every push: under two minutes
        runs-on: ubuntu-latest
        timeout-minutes: 10
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-python@v5
            with: { python-version: "3.12", cache: pip }
          - run: pip install -r requirements.txt
          - run: playwright install --with-deps chromium
          - run: pytest -m smoke --junitxml=reports/smoke.xml
      regression:
        needs: smoke
        strategy: { fail-fast: false, matrix: { browser: [chromium, firefox] } }
        steps:                        # checkout, Python, install as above, then:
          - run: >
              pytest -m regression -n 4 --browser \${{ matrix.browser }}
              --tracing retain-on-failure --screenshot only-on-failure
              --junitxml=reports/regression-\${{ matrix.browser }}.xml
              --html=reports/regression-\${{ matrix.browser }}.html --self-contained-html
          - uses: actions/upload-artifact@v4
            if: always()
            with:
              name: regression-\${{ matrix.browser }}
              path: |
                reports/
                test-results/
      load:
        if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
        needs: smoke
        # start the app in the background, wait for it, run Locust with --csv reports/load,
        # upload reports/; the locustfile's exit code fails the job on a threshold breach

(Abridged: the full file gives every job runs-on, a timeout and the same set-up steps.) What each choice buys, from
Running Tests in CI: smoke gates everything else; the browser matrix runs Firefox where it can be installed
(this laptop could not download it); fail-fast: false lets the Firefox result arrive even if Chromium fails; reports
upload on failure, which is when you need them; the load test runs nightly and on demand, not on every pull request,
because shared runners are noisy and a 60-second load test per commit teaches people to ignore it.

Parsing the file with PyYAML before pushing caught nothing broken, and one surprise:

    top keys: ['name', True, 'concurrency', 'jobs']
    jobs: {'smoke': (None, 5), 'regression': ('smoke', 6), 'load': ('smoke', 7)}

YAML 1.1 reads a bare on as the boolean true. GitHub's own parser handles it; your scripts that read workflow files
must look up True, or the key must be quoted.

**Is -n 4 faster?** On this laptop, the 22-test suite on the fixed build took 7.24 s in one process, 12.51 s with
-n 2 and 17.09 s with -n 4: each worker starts its own app and its own Chrome. Parallelism pays when a suite runs for
minutes; measure before you turn it on (Fast Feedback: Parallelism, Sharding and Test Selection).

**Flakiness.** Run the regression suite ten times (a loop, or pytest-repeat's --count) and tabulate passes per test.
Any test that failed even once gets a cause from its trace and a fix, or a quarantine with an owner and a date
(Managing Flaky Tests and Test Health). A retry that hides a failure is not a fix.

## Part 5 — The quality report

QUALITY-REPORT.md is one page a manager reads before a release:

| Area | Result | Evidence |
|---|---|---|
| Rules R1–R3 | 3 defects: delivery at Rs 499, coupon cap, API quantity limit | tests DEL-02, CPN-02, QTY-6 |
| API contract | Schema drift on product detail | test_product_detail_matches_schema |
| Access control | Any customer can read any order | the two-user test |
| Performance | p95 570 ms against a 300 ms target; search serialised by a lock | Locust runs and the isolation table |
| Accessibility | Checkout UPI field unlabelled | the label check |
| Security baseline | Session cookie without HttpOnly or SameSite | the cookie check |

**Recommendation: not ready for the sale.** Must fix: order access (data exposure), the coupon cap and delivery
boundary (money), the search lock (sale-evening latency), the unlabelled payment field. May ship with a dated fix: the
schema drift if no client reads the detail price yet, and the cookie flags. What would change the answer: those fixes
retested, the regression suite green twice in a row, and the load test passing three runs in a row.

## Deliverables

1. perf/locustfile.py with a workload model, thresholds in code, runs on your build and on the fix, and the isolation
   table that names the bottleneck.
2. .github/workflows/quality.yml: smoke on every push, regression across two engines with reports and traces, a
   nightly load job; a link to a real run if you pushed it.
3. The baseline checks in the suite; an axe or keyboard pass on checkout, written up.
4. A ten-run flakiness table and what you did about each flaky test.
5. QUALITY-REPORT.md with the recommendation, and the conditions that would change it.

## Common traps

- **Reporting the average.** The tail is what users feel; report p95 and p99 with the request count.
- **A load test with no question and no threshold.** It produces a graph and no decision.
- **Load testing on every pull request.** Noisy, slow and soon ignored; nightly and before a release.
- **Counting Chrome and Edge as two engines.** Both are Chromium.`,
    mcqs: [
      mcq('In ShopSathi\'s search-only runs, going from 30 to 60 users raised throughput from 27.69 to 33.68 req/s while the median went from 73 to 770 ms. What does that shape point to?', [
        ['A queue in front of a resource that serves one request at a time', true],
        ['A failing network card, since errors would appear before slowness', false],
        ['Locust running short of CPU, so it under-reports the real latency', false],
        ['Normal warm-up: latency settles once the server caches the queries', false],
      ], 'Flat throughput with sharply rising latency means work is waiting, not being done faster (Finding the Bottleneck); 1 / 33.68 is about 30 ms, the length of one search\'s locked call. There were no errors, a starved load generator usually shows lower throughput and wider spread rather than a clean ceiling, and a 20-second steady run is not warm-up.'),
      mcq('Why does ShopSathi\'s workflow run the Locust test nightly and on demand instead of on every pull request?', [
        ['Shared runners make results noisy, and a slow gate on every commit soon gets ignored', true],
        ['GitHub Actions does not allow a job to start a background server process during a workflow run', false],
        ['Locust cannot run headless in CI, so it needs a person watching its web dashboard', false],
        ['Load tests must run on Windows, and the pull-request jobs all use Ubuntu runners', false],
      ], 'Running Tests in CI matched each check to the cadence it can support: load numbers from shared runners vary from run to run, so a nightly trend and a pre-release run are worth more than a noisy gate. Background servers work in Actions, Locust has a headless mode, and it runs on Linux.'),
      mcq('The fixed build passed the load threshold with p95 38 ms in one run and 130 ms in an earlier run on the same laptop. What should QUALITY-REPORT.md say?', [
        ['Report the range from at least three runs and say the lab numbers compare builds only', true],
        ['Report the 38 ms run, since the best run shows what the system can really achieve', false],
        ['Report the average of the two runs, about 84 ms, as the production p95 for the release', false],
        ['Report nothing until both runs agree exactly, because varying numbers mean a bad test', false],
      ], 'Variance is normal when the load generator and the app share a machine; a range from repeated runs is honest, and the lab cannot stand in for production capacity (Reading Performance Numbers). Picking the best run flatters the build, averaging percentiles from two runs is not a percentile, and runs never agree exactly.'),
    ],
    assignment: {
      title: 'Capstone: Performance, CI and the Quality Report',
      description: 'Run the product\'s quality checks the way a team would: a load test with a workload model and thresholds that finds and explains a bottleneck, the suites in CI with reports and traces across two browser engines, accessibility and security baselines, a flakiness measurement, and a one-page quality report with a release recommendation.',
      instructions: `Extend the repository from the previous unit, as described in this unit's notes. Load tests and security
checks run only against builds you run yourself. Submit the repository (or a zip), a recording of the load runs, and,
if you pushed the workflow, a link to a run.

**Submit:**

1. A Locust (or k6) test with a workload model from user behaviour, thresholds that set the exit code, results on your
   build and on a fixed build (or the reference fix), at least three runs each, and the isolation runs that name the
   bottleneck.
2. A GitHub Actions workflow: smoke on every push, regression on two engines with JUnit and HTML reports and traces on
   failure, a nightly or on-demand load job. Parse it before pushing, and state whether it actually ran.
3. The label and cookie baselines in the suite, plus an axe run or a written keyboard-and-screen-reader pass of checkout.
4. A ten-run flakiness table, with the cause and action for every test that failed even once.
5. QUALITY-REPORT.md: results by area with evidence, the open defects by severity, a ship or no-ship recommendation,
   and what would change it.

**Before you submit,** check every deliverable in the notes and point to where it is met.`,
      rubric: [
        { criterion: 'Load test design and thresholds', description: 'A question first; a workload model from behaviour; grouped request names; thresholds in code that fail the run; repeated runs reported as a range.', maxPoints: 20 },
        { criterion: 'Finding and explaining the bottleneck', description: 'Endpoints isolated; throughput and percentiles read together; the cause named with evidence and confirmed by a fix and a re-run.', maxPoints: 20 },
        { criterion: 'CI pipeline', description: 'Smoke gate, regression on two engines, reports and traces uploaded on failure, load on a sensible cadence; the file parsed and its run status stated honestly.', maxPoints: 20 },
        { criterion: 'Accessibility and security baselines', description: 'Label and cookie checks in the suite; a deeper axe or manual pass; scans only on builds you own; limits of automation stated.', maxPoints: 15 },
        { criterion: 'Flakiness and suite health', description: 'A ten-run table; causes found from traces; fixes or quarantines with an owner and a date; no retries hiding failures.', maxPoints: 10 },
        { criterion: 'The quality report', description: 'One page; results by area with evidence; severities justified; a clear recommendation and the conditions that would change it.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },

  /* ── DEFENCE ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_CAPSTONE_DEFENCE',
    notes: `**A QA hiring panel (a senior SDET, a QA lead, sometimes the engineering manager) wants to watch your suite
catch a bug, not hear you describe it.** Twelve minutes of demo, twenty of questions. This unit is the script, three
drills, the questions with what a strong answer contains, and, at the end, the list of defects planted in ShopSathi.

## The twelve-minute demo

| Time | Show | Say |
|---|---|---|
| 0:00–1:00 | The product and its risks | ShopSathi, the risk table, why API tests carry the rules |
| 1:00–2:30 | The strategy | The levels picture; what runs on push, on pull request, nightly |
| 2:30–5:00 | **A live run** | pytest -m smoke, then one red regression test and its message |
| 5:00–7:00 | **A defect, end to end** | The two-user order test failing; the report in DEFECTS.md; the xfail(strict) marker |
| 7:00–9:00 | **The bottleneck** | The failing threshold, the isolation table, the lock, the fixed run |
| 9:00–10:30 | CI and health | The workflow run or the parsed file; reports and a trace; the flakiness table |
| 10:30–12:00 | The release call | QUALITY-REPORT.md: not ready, why, and what would change it |

Run the whole demo twice the day before, and record each live step. If the browser or the network misbehaves on the
day, say so, play the recording and carry on: the panel is also watching how you handle a failure.

## The three drills

**A live red test.** Keep one command ready that runs a single failing test with a short traceback (--tb=short), and
read the failure aloud: what was expected, what came back, what that means for a customer. "Rs 49 delivery was
charged on an Rs 499 cart; the rule says free from Rs 499; every customer on the boundary pays Rs 49 too much."

**The fixed build turns the marker red.** Switch to the fixed build and run the xfail test: "[XPASS(strict)] SS-1".
Explain why that is the behaviour you want: the suite tells you the day the fix lands.

**A flaky-test story.** Have one ready from your own ten-run table: which test flaked, how often, what the trace
showed (an action that raced a network call, a shared piece of data, an animation), what you changed, and the next
ten runs. If nothing flaked, say how you would have found out, and show the table anyway.

## The questions, and what a strong answer contains

1. **"What did you test first, and why?"** The risk table: money rules and order access, then sale-evening latency.
2. **"Why so few UI tests?"** Rules at the API in milliseconds; the browser for what only the browser shows; the
   pyramid with numbers from your suite.
3. **"How do you choose locators?"** Role, label, test id; never layout XPath; the page objects own them.
4. **"Your UI test passed but the API accepted six. How?"** The limit lived in the page; partners and scripts bypass
   it; a rule must be enforced, and tested, where data enters.
5. **"How do you test authorisation?"** Two identities; the second must be refused; 404 rather than 403 so the API does
   not confirm the order exists.
6. **"What does p95 mean, and why not the average?"** 95% of requests were faster; the tail is what users feel.
7. **"How did you find the bottleneck?"** Isolate by endpoint; throughput flat while latency rises; 1 / 33.68 is
   30 ms; the lock; the fix and the re-run.
8. **"Your load test ran on a laptop. What is it worth?"** A comparison between builds and a found bottleneck; not a
   capacity number; what a production-like run would need.
9. **"How do you handle a flaky test?"** Measure it, find the cause from the trace, fix or quarantine with an owner
   and a date; retries never hide a failure silently.
10. **"What did automation not catch?"** Name the defects you found only by exploring, and the ones you missed.
11. **"Would you ship this on Friday?"** No, with the list and the conditions. A tester informs the decision; the
    product owner makes it with that information.
12. **"Selenium or Playwright for a new team?"** The trade-offs from Selenium Grid, and Selenium versus Playwright:
    the team's language, existing grid and skills, auto-waiting, tracing; no single right answer.

## The planted defects (read after you hand in)

| Id | Area | Defect | How the reference suite found it |
|---|---|---|---|
| SS-1 | Rule R1 | Delivery charged at exactly Rs 499 (more-than instead of or-more) | DEL-02 and the UI boundary test |
| SS-2 | Rule R2 | FESTIVE15 cap never applied | CPN-02, the decision table |
| SS-3 | Access | Any customer can read any order | The two-user API test |
| SS-4 | Contract | price_paise is a string on product detail | The JSON Schema |
| SS-5 | Rule R4 | Search does not strip spaces: "hamper " finds nothing | Not by the suite: an exploratory charter or a better partition |
| SS-6 | Rule R3 | The API accepts more than five of a product | QTY-6 |
| SS-7 | Accessibility | Checkout UPI field has no label | The label check |
| SS-8 | Performance | One global lock around every search | The Locust thresholds and isolation runs |
| SS-9 | Security | Session cookie without HttpOnly or SameSite | The cookie check |

Scoring guide for reviewers: seven or more found with evidence is strong; finding SS-5 shows that exploratory testing
was really done. A defect found and well reported counts for more than two found and described vaguely.

## Rehearse with these

Answer each in under a minute, aloud: the top three risks and where each is tested; the one defect you would fix
first and why; the bottleneck in two sentences; what your suite cannot see.`,
    mcqs: [
      mcq('A panellist asks why ShopSathi\'s two-user test expects 404, not 403, when Ravi requests Asha\'s order. Which answer is strongest?', [
        ['404 does not confirm that the order exists, so ids cannot be probed for valid orders', true],
        ['403 is reserved for expired tokens, so the API cannot return it for another user\'s order', false],
        ['404 is faster for the server to produce than 403, which matters on a sale evening', false],
        ['The spec does not matter here, because any 4xx status proves the access was refused', false],
      ], 'Returning 404 for someone else\'s resource avoids telling a caller which ids are real (Testing Authentication, Authorisation and Input Handling), and the spec says 404, so the test follows it. 403 is not about expired tokens (that is 401), speed is irrelevant, and accepting any 4xx would let a contract change pass unnoticed.'),
      mcq('During the demo the fixed build turns the SS-1 test red with "[XPASS(strict)]". How should the student explain it?', [
        ['Intended: the defect is fixed, so the marker must come off and the defect be closed', true],
        ['A problem: strict mode is too sensitive, so it should be switched off before any live demos', false],
        ['A flaky test: an expected failure that passes means the test depends on timing', false],
        ['A broken build: the fix must have changed the delivery rule for every other cart', false],
      ], 'strict=True makes an unexpected pass fail the run, which is exactly how the suite notices a fix and prompts closing the defect (Markers, Plugins and Reports). It is not flakiness, since it passes every time on the fixed build, and it says nothing about other carts, which have their own tests.'),
      mcq('The panel asks: "Your load test ran on a laptop. What is it worth?" Which reply shows the most judgement?', [
        ['It compares builds and found a real bottleneck; it is not a capacity figure for production', true],
        ['It is as good as a production test, since the same code runs in both of those places', false],
        ['Nothing, because only a test on production hardware can say anything about performance', false],
        ['It proves ShopSathi can serve 30 users in production, since the lab held exactly 30', false],
      ], 'A lab run is good at relative comparisons and at exposing behaviour such as a serialised lock; it cannot predict production capacity because the hardware, server and data differ (Finding the Bottleneck). Calling it worthless throws away a real finding, and treating it as a capacity number over-claims.'),
      mcq('Asked "What did your automation not catch?", which answer helps a ShopSathi candidate most?', [
        ['The search-spaces defect, found only in the exploratory charter, and the partition I added after', true],
        ['Nothing: the suite covers all the rules, so every defect in the build was found by automation', false],
        ['Only the cosmetic issues, since automation catches every functional defect by design anyway', false],
        ['Performance problems, because Locust tests are not real automation and run outside of pytest', false],
      ], 'Panels trust candidates who know their suite\'s blind spots and close them (Exploratory Testing and Heuristics). Claiming completeness is not credible, automation misses functional defects that no test anticipated, and a Locust run with thresholds in CI is automation.'),
      mcq('In the demo, why show a failing test\'s message aloud instead of only the red summary line?', [
        ['The message shows expected against actual and what that means for a customer', true],
        ['The summary line is printed only when pytest runs with the verbose option on', false],
        ['Panels mark down any demo whose tests do not fail at least once in the run', false],
        ['Reading the traceback aloud fills the time if the browser takes long to start', false],
      ], 'A failure is evidence only when someone can read what was expected, what happened and why it matters; that is the skill a panel is testing (Defects: Finding, Reporting and the Bug Lifecycle). The summary prints without -v, a red test is not a scoring rule, and filler talk wastes the panel\'s time.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_CAPSTONE_CHECKPOINT',
    notes: `Ten scenario questions across the whole QA / SDET track: test design, test data, UI automation with Playwright
and Selenium, API testing, performance, CI and flaky tests, and accessibility and security checks, at the level a QA
hiring panel expects. Choose what you would actually do, and be ready to say why.`,
    checkpoint: [
      ck(DESIGN, 'A bus-booking app gives 10% off for 4 to 9 seats and 20% for 10 or more, up to 15 seats per booking. Which seat counts make the smallest strong boundary set?', [
        ['0, 1, 3, 4, 9, 10, 15 and 16', true],
        ['1, 5, 10 and 15, one from each band', false],
        ['4, 9, 10 and 15, the limits in the rule', false],
        ['Every count from 1 to 15, to be completely sure', false],
      ], 'Boundary value analysis takes the values on both sides of each edge, including just outside the valid range (Equivalence Partitions and Boundary Values). One value per band misses off-by-one errors, the rule\'s own limits miss the values just outside them, and testing every value wastes effort while still skipping 0 and 16.'),
      mcq('A Playwright test clicks "Add to cart" and immediately opens the cart, which is empty one run in ten. The add calls an API in the background. What is the right fix?', [
        ['Wait for the page\'s own signal that the add finished, such as the button reading "Added"', true],
        ['Add time.sleep(2) after the click, which is long enough for the API to finish on every machine', false],
        ['Retry the whole test up to three times in CI, so that the occasional failure goes away', false],
        ['Switch to an XPath locator for the cart link, which Playwright resolves more reliably', false],
      ], 'The race is between the next action and a request in flight, so synchronise on the outcome the user would see (Auto-Waiting and Web-First Assertions). A sleep is slow and still loses on a slow day, retries hide the race, and the locator was never the problem.'),
      mcq('In a Selenium suite, a test fails with StaleElementReferenceException after the product list refreshes. What is the cause and fix?', [
        ['The stored element was replaced in the DOM; find it again after the refresh, inside an explicit wait', true],
        ['The implicit wait is too short; raise it to 30 seconds so that the element has enough time to appear again', false],
        ['The driver lost its session; restart the browser in the test and log in again before the next step', false],
        ['The element is hidden by a banner; scroll it into view with JavaScript and click it through script', false],
      ], 'A stale reference points at a node that no longer exists, so the fix is to locate it afresh once the new content is ready (Waits in Selenium). Implicit waits do not refresh old references, the session is fine, and a hidden element raises a different exception.'),
      ck(API, 'An API returns 200 for GET /orders/77 and the body matches the schema. Which test would still catch a serious defect the schema check cannot?', [
        ['The same request made with another customer\'s token must be refused', true],
        ['The same request repeated ten times returns the same body each time', false],
        ['The response time of the request stays under one second in the test', false],
        ['The Content-Type header of the response includes application/json', false],
      ], 'A schema says the shape is right, not who may see it; only a second identity reveals broken object-level authorisation (Testing Authentication, Authorisation and Input Handling). Repeating a GET, timing it and checking the header are useful but cannot reveal data served to the wrong person.'),
      ck(API, 'A team\'s order service calls a payment provider that has no sandbox for failures. How should the API tests cover the "provider times out" case?', [
        ['Point the service at a mock provider that delays past the timeout, and assert the safe outcome', true],
        ['Call the real provider during its busiest hour, when timeouts are most likely to happen anyway', false],
        ['Skip the case, since a timeout depends on the provider and is not the order service\'s behaviour', false],
        ['Lower the client timeout to one millisecond in production, so that the case happens on its own', false],
      ], 'A service mock makes a rare failure repeatable on demand (Contract Testing and Service Mocks), so the test can check that no order is confirmed and no money is double-taken. Waiting for real timeouts is unrepeatable, the order service owns how it handles them, and changing production settings to test is dangerous.'),
      ck(PERF, 'A load test report shows an average latency of 120 ms and calls the release "fast". p99 is 2.4 s at 300 requests a second. What should a tester say?', [
        ['One request in a hundred takes over 2 s, three a second at this rate; the average hides it', true],
        ['The average is what matters, since most users see a latency close to the 120 ms figure', false],
        ['The p99 is noise from a few slow clients, so it should be dropped from the report', false],
        ['The test is wrong, because no system can have an average of 120 ms with a p99 of 2.4 s', false],
      ], 'Percentiles show what real users feel; at 300 requests a second, 1% is three slow requests every second (Reading Performance Numbers). Averages are pulled down by fast requests, dropping the tail hides the problem, and a long tail with a low average is common.'),
      ck(PERF, 'A soak test of an exam portal holds steady load for six hours. Response times creep up hour by hour and memory never falls back. What does that suggest?', [
        ['A leak or unbounded growth that a short load test would never have shown', true],
        ['The load generator getting tired, since six hours is longer than it supports', false],
        ['A normal warm-up curve that settles once caches are full after a few hours', false],
        ['A database index that is missing, which always shows up in the first minute', false],
      ], 'Soak tests exist to find what grows with time, such as leaked memory, connections or a cache with no limit (Performance Testing: Questions Before Tools). Warm-up settles within minutes rather than worsening, generators do not tire, and a missing index slows requests from the start rather than creeping.'),
      mcq('A test fails about one run in twenty in CI and never locally. The team proposes adding three automatic retries. What should happen instead?', [
        ['Measure it, find the cause from the CI trace, then fix it or quarantine it with an owner and a date', true],
        ['Accept the retries, since a test that passes on the second try has shown the feature does work', false],
        ['Delete the test, because a test that cannot pass every time in CI is worse than having no test', false],
        ['Run it only locally from now on, since that is the environment where the test always passes', false],
      ], 'Flaky tests are either a test bug or a real intermittent product bug, and only the cause tells you which (Managing Flaky Tests and Test Health). Silent retries hide both, deleting loses coverage, and hiding a CI-only failure ignores the environment users are closest to.'),
      mcq('A login form passes an automated accessibility scan with no violations. What can the tester still not conclude?', [
        ['That keyboard and screen-reader users can actually complete it: that needs a manual pass', true],
        ['That every input has a programmatic label, which the scan has already checked on its own', false],
        ['That the colour contrast of the text meets the ratio the scanner was configured to check', false],
        ['That images on the form have alt attributes, since that is one of the scanner\'s own rules', false],
      ], 'Automated checks catch rule violations such as missing labels, contrast and alt text, but not whether the focus order, announcements and flow make sense (Accessibility Testing). The other three are exactly what a scan does verify.'),
      ck(DESIGN, 'A manager asks for a quality strategy for a UPI payments feature with one week of testing before launch. Which plan shows judgement?', [
        ['Rank risks, test money rules and failures at the API, automate a few journeys, explore the rest', true],
        ['Automate every screen first, since a full UI suite gives the most confidence before a launch', false],
        ['Run only exploratory sessions, because automation cannot be written in a single week at all', false],
        ['Test everything equally, so that no part of the feature can be said to have been neglected', false],
      ], 'A strategy spends limited time where the risk is and at the cheapest level that catches each problem (A Quality Strategy for a Product; Test Plans, Test Strategy and Risk-Based Testing). A full UI suite first is slow and brittle, a week is plenty for focused automation, and equal effort means too little on the payment paths.'),
    ],
  },
];
