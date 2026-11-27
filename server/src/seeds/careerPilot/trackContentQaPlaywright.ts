/**
 * Career-track content: Playwright (QA_PLAYWRIGHT), QA / SDET, batch QA2.
 *
 * Browser automation with Playwright for Python and pytest: first tests and the pytest-playwright plugin, locators
 * that survive markup changes, auto-waiting and web-first assertions, page objects, network mocking with page.route,
 * reusing login state and arranging data through the API, and debugging failing and flaky tests from a trace. It
 * builds on "pytest: Writing and Running Tests", "Fixtures and Parametrised Tests" and "Mocking and Isolating Code"
 * (Python Full Stack track) and on this track's "Fixtures, Scopes and conftest at Scale" and "Markers, Plugins and
 * Reports"; those are referred to by title, not re-taught.
 *
 * One fictional app runs through the topic: SaleKart, a small Flask shop with a login, search, a cart, a UPI checkout
 * page that calls /api/pay, and a "Today's deals" panel that loads after 0.3 to 2 seconds. Every output quoted is
 * real output from Python 3.13, pytest 9.1, Playwright 1.64 for Python and pytest-playwright 0.10, run against that
 * app with the installed Google Chrome (channel "chrome") and Microsoft Edge (channel "msedge"). Not run: Firefox and
 * WebKit (their browser builds were not downloaded on the machine, and the real "Executable doesn't exist" error is
 * quoted), video recording (needs Playwright's ffmpeg download, error quoted), and the trace viewer's window, which
 * is described from the Playwright documentation; the trace files themselves were produced and read with the
 * "playwright trace" command line.
 *
 * Skill: UI_TEST_AUTOMATION throughout.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_QA_PLAYWRIGHT_BUNDLES: PilotBundle[] = [
  /* ── PW_FIRST_TESTS ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PLAYWRIGHT_PW_FIRST_TESTS',
    notes: `SaleKart is a small Bengaluru e-commerce shop getting ready for its Diwali sale. Before every release someone
clicks through the same journey by hand: open the home page, search for earbuds, add them to the cart, log in, pay
with UPI. That takes twenty minutes, and on the third release in a week it gets skipped. A browser test does the
same clicks in seconds, on every pull request, and never gets bored.

Browser tests sit at the top of the test pyramid you met in "Test Levels, Types and the Test Pyramid": they are the
slowest and most fragile tests you own, so you keep them few and spend them on journeys a user really takes. Logic
belongs in unit tests; one browser test per important journey, plus its important failure paths, is the target.

## What Playwright is

Playwright is a library from Microsoft that drives real browsers: Chromium (Chrome and Edge), Firefox and WebKit
(the engine behind Safari). Your Python code sends commands over a protocol to the browser; nothing is injected into
the page you test. The Python package has a synchronous API (what this topic uses, and what pytest-playwright gives
you) and an async one for asyncio programs.

Four objects, from the outside in:

- **Playwright** starts browser types: p.chromium, p.firefox, p.webkit.
- **Browser** is one running browser process. Starting it is the slow part, so a test run starts it once.
- **BrowserContext** is a fresh, private profile inside that browser, like an incognito window: its own cookies,
  local storage and cache. Creating one takes milliseconds, so every test gets its own. This is how tests stay
  independent: no login or cart leaks from one test to the next.
- **Page** is a tab in a context. Almost everything you do (goto, click, fill, expect) is on a page or a locator.

## Installing

    pip install pytest-playwright      # brings in playwright and the pytest plugin
    playwright install chromium        # downloads Playwright's own browser build
    playwright install --with-deps     # on a Linux CI image: browsers plus system libraries

If downloads are blocked (a common situation on a locked-down office laptop), use a browser that is already
installed through a channel: launch(channel="chrome") or channel="msedge". On the machine these notes were run on,
nothing had been downloaded, and asking for the other engines failed honestly:

    firefox  -> BrowserType.launch: Executable doesn't exist at ...\\ms-playwright\\firefox-1555\\firefox\\firefox.exe
    webkit   -> BrowserType.launch: Executable doesn't exist at ...\\ms-playwright\\webkit-2370\\Playwright.exe
    chromium {'channel': 'msedge'} -> started

The fix for the first two is "playwright install firefox webkit", not a code change.

## A first script, without pytest

With SaleKart running (python app.py serves it on http://127.0.0.1:5761):

    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")   # the installed Google Chrome
        page = browser.new_page()
        page.goto("http://127.0.0.1:5761/")
        print("title:", page.title())
        page.get_by_label("Search products").fill("kurta")
        page.get_by_role("button", name="Search").click()
        print("url:", page.url)
        print("first result:", page.get_by_role("heading", level=2).first.inner_text())
        browser.close()

    title: Home | SaleKart
    url: http://127.0.0.1:5761/search?q=kurta
    first result: Cotton Kurta, Indigo

Notice there is no wait anywhere. click() waited for the button to be visible, enabled and stable before clicking,
and the next call waited for the results page. Playwright's waiting is built in; the next lessons rely on that.

## The pytest-playwright plugin

A script is fine for exploring; a test suite needs pytest. The plugin gives you fixtures, the same way your own
fixtures in "Fixtures and Parametrised Tests" did:

- **browser** (one per worker, session scope), **context** and **page** (new for every test), **browser_name**.
- **base_url**, so page.goto("/login") means "the app under test", whatever environment that is.
- Command-line options: --browser chromium|firefox|webkit (repeat it to run each test on several),
  --browser-channel chrome, --headed, --slowmo 500, --base-url, and the --tracing / --screenshot / --video options
  used in the last lesson. Browsers run headless by default.

SaleKart's conftest.py starts the app on a free port for the whole run and hands the address to the plugin by
overriding base_url:

    @pytest.fixture(scope="session")
    def base_url():
        app = create_app(markup=os.environ.get("MARKUP", "v1"))
        server = make_server("127.0.0.1", 0, app, threaded=True)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        yield f"http://127.0.0.1:{server.server_port}"
        server.shutdown()

The first three tests:

    def test_search_finds_earbuds(page: Page):
        page.goto("/")
        page.get_by_label("Search products").fill("earbuds")
        page.get_by_role("button", name="Search").click()
        expect(page).to_have_url(re.compile(r"/search\\?q=earbuds"))
        expect(page.get_by_role("heading", name="Tarang Wireless Earbuds")).to_be_visible()

    def test_wrong_password_shows_error(page: Page):
        page.goto("/login")
        page.get_by_label("Email").fill("asha@example.test")
        page.get_by_label("Password").fill("wrong-password")
        page.get_by_role("button", name="Sign in").click()
        expect(page.get_by_role("alert")).to_have_text("Invalid email or password")

    $ pytest tests/test_first.py --browser-channel chrome -v
    tests/test_first.py::test_home_page_has_sale_heading[chromium] PASSED    [ 33%]
    tests/test_first.py::test_search_finds_earbuds[chromium] PASSED          [ 66%]
    tests/test_first.py::test_wrong_password_shows_error[chromium] PASSED    [100%]
    3 passed in 4.14s

The [chromium] in each id is the plugin parametrising the test by browser; with --browser chromium --browser
firefox every test would appear twice.

## Habits from the first day

- **Assert what a user sees.** A heading, an alert, a URL, a cart count, not a CSS class or an internal variable.
- **Use expect() for every check on the page.** It retries until the condition holds or a timeout passes; a plain
  assert on page.inner_text() checks once (the waits lesson shows what that costs).
- **One journey per test, independent of every other test.** Each test gets a fresh context; never rely on the test
  before it having logged in.
- **Watch it when it is new.** pytest --headed --slowmo 500 runs it in a visible window at human speed;
  PWDEBUG=1 opens the Playwright Inspector to step through it (both from the documentation).
- **Record, then rewrite.** "playwright codegen <url>" records your clicks as code. It is a quick way to discover
  locators, but its output is a draft: rename, restructure and add the assertions it cannot guess.

With pytest-xdist from "Markers, Plugins and Reports", the same suite runs in parallel, each worker with its own
browser and its own copy of the app: 21 tests on four workers printed "21 passed in 35.96s".`,
    workedExample: `**Scenario.** A manual test case from SaleKart's sheet: "TC-SRCH-07. Search for a product that does not
exist. Expected: the page says no products match, shows no product cards, and the search term stays in the search
box so the user can correct it." Automate it.

**Step 1: one test, one behaviour each.** The case checks two different things (the message and the box), so it
becomes two tests; when one fails, its name says which behaviour broke.

    def test_search_with_no_match_says_so(page: Page):
        page.goto("/")
        page.get_by_label("Search products").fill("laptop")
        page.get_by_role("button", name="Search").click()
        expect(page.get_by_role("heading", level=1)).to_have_text('Results for "laptop"')
        expect(page.get_by_text('No products match "laptop".')).to_be_visible()
        expect(page.get_by_role("listitem")).to_have_count(0)

    def test_search_keeps_query_in_box(page: Page):
        ...same three steps...
        expect(page.get_by_label("Search products")).to_have_value("laptop", timeout=2000)

**Step 2: run them.** The first passes. The second fails:

    E   AssertionError: Locator expected to have Value 'laptop'
    E   Actual value: None
    E   Error: element(s) not found
    E   Aria snapshot:
    E   - heading "Results for \\"laptop\\"" [level=1]
    E   - paragraph: No products match "laptop".

**Step 3: read the failure before touching the test.** "element(s) not found" plus the snapshot of the page says
the results page has no search box at all. The test is right; the app does not meet the written expectation.

**Step 4: report, do not "fix" the test.** Raise it with the evidence: steps, expected (box keeps "laptop"),
actual (results page has no search box), and the aria snapshot. Mark the test xfail with the bug id until it is
fixed, so the suite stays green without hiding the gap:

    @pytest.mark.xfail(reason="SK-212: results page has no search box", strict=True)

strict=True makes the test fail loudly the day the bug is fixed, reminding you to remove the marker.`,
    mcqs: [
      mcq('Every SaleKart test needs its own cookies and cart, yet starting a browser takes seconds. What does pytest-playwright do by default?', [
        ['Starts one browser per worker and gives each test a new context and page', true],
        ['Starts a new browser process for each test so that no state can leak', false],
        ['Shares one page between all tests and clears its cookies between them', false],
        ['Shares one context per test file and opens a new tab for each test', false],
      ], 'The browser fixture is session-scoped while context and page are new for every test; a context is a private profile that costs milliseconds. A browser per test is slow for no gain, and sharing a page or a context lets cookies, storage and open requests leak between tests.'),
      mcq('page.goto("/login") fails with "Cannot navigate to invalid URL" in a plain script, though the same line works in the pytest suite. Why?', [
        ['The script\'s context has no base_url, so "/login" is not a full address', true],
        ['The script uses the sync API, which only accepts full https:// addresses', false],
        ['The pytest suite runs headless, which is what allows relative navigation', false],
        ['The login route needs a cookie that only the pytest page fixture sets up', false],
      ], 'A relative path only works when the context was created with base_url; pytest-playwright passes it from the base_url fixture, a bare browser.new_page() has none, and the real error is "Protocol error (Page.navigate): Cannot navigate to invalid URL". The sync API takes http URLs, headless mode does not affect navigation, and no cookie is involved.'),
      mcq('A new joiner records the checkout flow with playwright codegen and wants to commit the output as the test. What is the right advice?', [
        ['Use it as a draft: keep good locators, add assertions and structure', true],
        ['Commit it as recorded, because generated code is always the most stable', false],
        ['Throw it away, because recorded code can never run in a CI pipeline', false],
        ['Commit it, but wrap every recorded line in a retry loop to be safe', false],
      ], 'Codegen captures actions and suggests locators, but it cannot know what to check or how to structure the suite, so its output is a starting point. Recorded code does run in CI, it is not automatically stable, and retry loops around every line hide real failures.'),
    ],
    checkpoint: [
      mcq('A SaleKart test logs in, and the next test in the same file finds itself already logged in. With pytest-playwright\'s defaults, what is most likely wrong?', [
        ['A custom fixture shares one page or context across tests', true],
        ['The browser fixture is session-scoped, so cookies persist', false],
        ['Headless Chrome keeps session cookies between its tests', false],
        ['The two tests were collected from the same test module', false],
      ], 'By default each test gets a new context, which has empty cookies; state leaking means someone widened the scope of a page or context fixture. Sharing the browser process does not share cookies, headless mode keeps no profile, and tests in one module still get separate contexts.'),
      mcq('An office laptop blocks "playwright install", but Google Chrome is installed. How can the team still run its Playwright tests there?', [
        ['Run pytest with --browser-channel chrome to use the installed Chrome', true],
        ['Run pytest with --browser firefox, which needs no extra download step', false],
        ['Set headless to False, which makes Playwright use the system browser', false],
        ['Replace Playwright with codegen, which records tests without a browser', false],
      ], 'A channel tells Playwright to launch a branded browser already on the machine, Chrome or Edge. Firefox and WebKit need Playwright\'s own builds (the run failed with "Executable doesn\'t exist"), headed mode still uses the same executable, and codegen itself needs a browser.'),
      mcq('Which check belongs in a first browser test for "search for earbuds"?', [
        ['A heading named Tarang Wireless Earbuds is visible on the results page', true],
        ['The search function in the Flask code returns a list of matching dicts', false],
        ['The results page response arrives in under 200 ms on the CI runner', false],
        ['The results container has the CSS class product-grid--loaded applied', false],
      ], 'A browser test should check what a user sees after the journey. The return value of a Python function is a unit-test concern, response time is a performance check, and a CSS class is an implementation detail that can change without the feature breaking.'),
    ],
  },
  /* ── LOCATORS ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PLAYWRIGHT_LOCATORS',
    notes: `Most browser tests that "suddenly broke" were not broken by a bug. They were broken by a designer. The button
still works and the user can still search; the test cannot find the button any more because it was looking for
"the button inside the form inside the first div of the body". This lesson is about finding elements the way a
user does, so the test only breaks when the user's experience breaks.

## The locator that broke

A tester copied an XPath from Chrome DevTools ("Copy full XPath") for SaleKart's Search button:

    def test_search_with_xpath(page: Page):
        page.set_default_timeout(3000)
        search(page, "mug")
        page.locator("xpath=/html/body/div[1]/form/button").click()      # copied from DevTools
        expect(page.get_by_role("heading", name="Chai Mug Set of 4")).to_be_visible()

    def test_search_with_role(page: Page):
        search(page, "mug")
        page.get_by_role("button", name="Search").click()
        expect(page.get_by_role("heading", name="Chai Mug Set of 4")).to_be_visible()

Against the current markup both pass. Then marketing adds a "Diwali Dhamaka: up to 40% off" banner above the page
and wraps the form in a card (the app's MARKUP=v2 switch). Nothing a user does has changed. The run:

    $ MARKUP=v2 pytest tests/test_locators.py -k "xpath or role" --browser-channel chrome
    E   playwright._impl._errors.TimeoutError: Locator.click: Timeout 3000ms exceeded.
    E   Call log:
    E     - waiting for locator("xpath=/html/body/div[1]/form/button")
    FAILED tests/test_locators.py::test_search_with_xpath[chromium]
    1 failed, 1 passed

div[1] is now the banner, which has no form. The role locator did not notice the change, because a button named
"Search" is still on the page. Worse than a failure is the absolute path that still matches, but now points at a
different element: the test clicks the wrong thing and fails somewhere far away, or passes when it should not.

## Locators a user would recognise

Playwright's documentation recommends, in roughly this order:

- **page.get_by_role(role, name=...)**: button, link, heading, textbox, checkbox, listitem, row, alert, status,
  dialog. The name is the accessible name: a button's text, an input's label, an aria-label. This is how screen
  readers find elements, so it tracks what users experience.
- **page.get_by_label("Email")**: form fields by their label text.
- **page.get_by_placeholder(...)**, **page.get_by_alt_text(...)**, **page.get_by_title(...)**.
- **page.get_by_text("No products match")**: non-interactive text such as messages.
- **page.get_by_test_id("cart-count")**: matches data-testid by default. Use it where there is no good role or
  text: a badge, a total, a canvas. It is a contract with developers ("do not rename this"); change the attribute
  with playwright.selectors.set_test_id_attribute("data-qa") if your team uses another one.
- **page.locator("css or xpath")**: last. Stable ids and data attributes are fine; layout paths, nth-child chains and
  generated class names (css-1x9f3k) are not.

A useful side effect: when you cannot find a control by role or label, a screen-reader user probably cannot use it
either. An icon-only button with no aria-label is an accessibility bug worth reporting, not a reason to fall back to
XPath.

## How names match

name= matches a case-insensitive substring by default. On a page with "Pay now" and a disabled "Pay later":

    get_by_role("button", name="Pay").count()              -> 2
    get_by_role("button", name="Pay", exact=True).count()  -> 0

Use exact=True, or a full name, when one name is a prefix of another ("Add" and "Add to cart").

## Strict mode: one locator, one element

Actions on a locator demand exactly one match. Searching "tarang" shows two products, each with an Add to cart
button:

    page.goto("/search?q=tarang")
    page.get_by_role("button", name="Add to cart").click()

    E   Error: Locator.click: Error: strict mode violation: get_by_role("button", name="Add to cart") resolved to 2 elements:
    E       1) <button type="button" onclick="addToCart(1, this)">Add to cart</button> aka get_by_role("listitem").filter(has_text="Tarang Wireless Earbuds Rs").get_by_role("button")
    E       2) <button type="button" onclick="addToCart(2, this)">Add to cart</button> aka get_by_role("listitem").filter(has_text="Tarang Neckband Earphones Rs").get_by_role("button")

Strict mode is a gift: without it the test would click whichever came first and you would test the wrong product.
The error even suggests a unique locator for each.

## Chaining and filtering

Narrow from a container the user would describe ("the Neckband card"), then find inside it:

    neckband = page.get_by_role("listitem").filter(has_text="Tarang Neckband Earphones")
    neckband.get_by_role("button", name="Add to cart").click()
    expect(neckband.get_by_role("button")).to_have_text("Added")
    expect(page.get_by_test_id("cart-count")).to_have_text("1")

filter(has_text=...) keeps containers containing that text; filter(has=locator) keeps containers that contain a
matching element, which is stricter (has=page.get_by_role("heading", name=...) will not match a product whose
description merely mentions the name). Other tools: .first, .last and .nth(i), which you should use only when
order is the requirement ("the first result is the best match"), never to silence a strict-mode error.

Locators are lazy. page.get_by_role(...) finds nothing when you create it; it searches every time you act or
assert. So you can define locators once (in a page object, two lessons from now) and use them after the page
re-renders, with no "stale element" problem of the kind Selenium users know.

## Frames and shadow DOM

Payment widgets often sit in an iframe. page.frame_locator("iframe[title='UPI payment']") returns something you
chain locators from, as above (per the documentation; SaleKart has no iframe). Playwright's role, text and CSS
locators also pierce open shadow DOM by default; XPath does not.

## A short rule

Ask "how would I tell a colleague to find this?" If the answer is "the Search button" or "the price in the Kurta
card", write exactly that. If the answer is "the third div", the page is missing something a user needs, or you
are testing layout rather than behaviour.`,
    workedExample: `**Scenario.** A test must add the Tarang Neckband Earphones to the cart from the search results for
"tarang". The obvious line fails with a strict-mode violation (two Add to cart buttons). Fix it properly.

**Step 1: read the error.** "resolved to 2 elements" lists both buttons and suggests
get_by_role("listitem").filter(has_text="Tarang Neckband Earphones Rs").get_by_role("button"). The suggestion is a
good hint but is tied to the "Rs" that follows the name; you can write something clearer.

**Step 2: describe it the way a user would.** "In the Neckband card, press Add to cart":

    neckband = page.get_by_role("listitem").filter(
        has=page.get_by_role("heading", name="Tarang Neckband Earphones"))
    neckband.get_by_role("button", name="Add to cart").click()

Using has= with the card's heading means a future card whose description says "pairs well with Tarang Neckband
Earphones" cannot match by accident.

**Step 3: assert the outcome, inside and outside the card.**

    expect(neckband.get_by_role("button")).to_have_text("Added")
    expect(page.get_by_test_id("cart-count")).to_have_text("1")

**Step 4: run it.** The has_text version passed in test_locators.py (the file printed "1 failed, 3 passed", the one
failure being the ambiguous example kept there on purpose), and the has= version is the one SaleKart's page object
uses in the next lessons, where it passed too.

**What not to do.** page.get_by_role("button", name="Add to cart").nth(1) also passes today. It encodes "the
second product", so the day search results are sorted by price it adds the earbuds instead and the test still
passes, checking the wrong product. A locator should fail when it can no longer find the thing you meant.`,
    mcqs: [
      mcq('After a promo banner is added to the top of SaleKart\'s page, a test using xpath=/html/body/div[1]/form/button times out while the role-based test still passes. Why?', [
        ['The absolute path counted divs, and the banner is now the first div', true],
        ['XPath locators always wait for 3 seconds before trying to match anything', false],
        ['The banner covered the Search button, so XPath could not click it there', false],
        ['Role locators are cached from the first run, so they never see any change', false],
      ], 'div[1] now means the banner, which has no form, so the path matches nothing and the click times out. XPath has no special wait, the button was not covered (the role locator clicked it), and locators are never cached; they are resolved again on every action.'),
      mcq('get_by_role("button", name="Add to cart").click() fails with "strict mode violation ... resolved to 2 elements" on a results page. What is the best fix?', [
        ['Find the product card first, then the Add to cart button inside it', true],
        ['Add .first so that the click always goes to the earliest matching button', false],
        ['Switch to an XPath that selects the second button by its index position', false],
        ['Turn strict mode off for the test so the click picks the first visible match', false],
      ], 'Scoping to the card says which product you mean, so the test fails if that product is missing. .first and an index both encode position, so sorting changes silently retarget the click, and strict mode cannot be turned off for locator actions; it exists to catch exactly this ambiguity.'),
      mcq('A cart badge shows only a number and has no label or role. Which locator suits it best?', [
        ['get_by_test_id("cart-count") on a data-testid agreed with the developers', true],
        ['locator(".hdr > span:nth-child(3)") copied from the browser developer tools', false],
        ['get_by_text("1"), because the badge shows the number one after adding', false],
        ['locator("xpath=//span[contains(@class, \'badge\')]"), filtered by its colour', false],
      ], 'A test id is a stable contract for elements without a meaningful role or text. The nth-child path breaks when the header changes, get_by_text("1") matches any "1" on the page and stops working when the count changes, and class names chosen for styling are not a contract.'),
    ],
    checkpoint: [
      mcq('A page has a "Pay now" button and a disabled "Pay later" button. What does get_by_role("button", name="Pay").count() return?', [
        ['2, because name matches a case-insensitive substring by default', true],
        ['0, because no button has the exact accessible name of just "Pay"', false],
        ['1, because disabled buttons are left out of every role query result', false],
        ['It raises a strict mode violation as soon as the locator is created', false],
      ], 'Without exact=True the name is matched as a case-insensitive substring, so both buttons count; with exact=True the count was 0. Disabled buttons still have the button role, and strictness applies when you act on a locator, not when you count it.'),
      mcq('Which locator for the login form\'s email field is most resilient to redesigns?', [
        ['page.get_by_label("Email")', true],
        ['page.locator("#login-form input:first-of-type")', false],
        ['page.locator("xpath=//form/div[1]/input")', false],
        ['page.locator("input.css-9kx2fw")', false],
      ], 'The label is what users read, and it survives layout and styling changes. The first-of-type and positional XPath break when fields are reordered or wrapped, and a generated class name changes with every build of the CSS.'),
      mcq('Why can a page object define locators in its __init__ and still use them after the page has re-rendered?', [
        ['Locators are lazy: they search the page again on every action', true],
        ['Playwright caches each element handle and refreshes it each second', false],
        ['Page objects take a fresh copy of the DOM whenever they are used', false],
        ['pytest-playwright reruns __init__ before each locator is called', false],
      ], 'A locator stores how to find an element, not the element, and resolves it at the moment of each action or assertion, which is why Playwright has no stale-element problem. There is no timed cache refresh, page objects do not copy the DOM, and the plugin does not rerun constructors.'),
    ],
  },
  /* ── WAITS_ASSERTIONS ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PLAYWRIGHT_WAITS_ASSERTIONS',
    notes: `A browser test talks to a page that is busy: requests in flight, scripts rendering, animations running. Most
flaky browser tests are a test checking something a moment before or after it is true. Playwright gives you two
tools so that you never have to guess the moment: auto-waiting actions and web-first assertions.

## The panel that loads "in about a second"

SaleKart's home page shows "Loading deals..." and then fetches /api/deals, which takes 0.3 to 2 seconds (like a
real recommendation service on sale day). A tester watched it load a few times and wrote:

    @pytest.mark.parametrize("run", range(20))
    def test_deals_with_sleep(page: Page, run):
        page.goto("/")
        time.sleep(1)                                    # "the deals usually load in a second"
        assert page.locator("#deals-status").inner_text() == "3 deals today"

Twenty runs:

    E   AssertionError: assert 'Loading deals...' == '3 deals today'
    9 failed, 11 passed

Run again: 10 failed, 10 passed. Nothing in the app is broken; the test reads the text once, at a moment it chose
by guessing. Raising the sleep to 2.5 seconds would make it pass here, but every run now pays 2.5 seconds even when
the deals arrive in 0.3, and the day the CI machine is slower than your laptop it fails again. A fixed sleep is
always too long or too short; usually both, on different days.

The web-first version:

    @pytest.mark.parametrize("run", range(20))
    def test_deals_web_first(page: Page, run):
        page.goto("/")
        expect(page.locator("#deals-status")).to_have_text("3 deals today")

    20 passed

expect() polls the page until the text matches or the timeout (5 seconds by default) runs out. It waits exactly as
long as this run needs and no longer.

## Actions wait for you

Before click(), fill(), check() and the other actions, Playwright waits until the element is attached to the page,
visible, stable (not animating), enabled and able to receive the click (not covered by an overlay); fill() also
needs it editable. If that never happens you get a timeout with a call log that says which check it was stuck on.
Clicking a disabled "Pay later" button:

    Locator.click: Timeout 1500ms exceeded.
    Call log:
      - waiting for get_by_role("button", name="Pay later")
        - locator resolved to <button disabled>Pay later</button>
      - attempting click action
        - waiting for element to be visible, enabled and stable

That is why the first lesson's tests needed no waits around clicks and navigation.

## What does not wait

The read-once methods: inner_text(), text_content(), input_value(), get_attribute(), count(), and the is_ methods
(is_visible(), is_enabled(), is_checked()), which answer immediately and never wait. Any plain assert built on them
is a snapshot. SaleKart's Add to cart calls /api/cart (0.1 to 0.8 seconds) and then updates the cart badge:

    page.get_by_role("button", name="Add to cart").click()
    assert page.get_by_test_id("cart-count").inner_text() == "1"
    E   AssertionError: assert '0' == '1'
    10 failed

    page.get_by_role("button", name="Add to cart").click()
    expect(page.get_by_test_id("cart-count")).to_have_text("1")
    10 passed

The click finished when the click happened, not when the server answered. Use read-once methods to get a value you
need for a later step (an order number), never to check the page.

## The assertions you will use most

- Locators: to_be_visible, to_be_hidden, to_have_text, to_contain_text, to_have_value, to_have_count,
  to_be_enabled, to_be_disabled, to_be_checked, to_have_attribute, to_have_class.
- Page: to_have_url, to_have_title.
- Negation: not_to_be_visible, not_to_have_text and so on. These wait for the condition to become false, which is
  how you check a spinner went away.

to_have_text with a string matches the whole text (whitespace normalised); to_contain_text matches a part; both
take a compiled regular expression:

    status text: "Payment successful. Ref UPI-4F2A9C"
    to_have_text("Payment successful")       -> fails: Actual value: Payment successful. Ref UPI-4F2A9C
    to_contain_text("Payment successful")    -> passes
    to_have_text(re.compile(r"^Payment successful\\. Ref UPI-[0-9A-F]{6}$"))  -> passes

The regex is the strongest: it checks the format of the reference without knowing its value.

## Reading a failed expect

    E   AssertionError: Locator expected to have text '4 deals today'
    E   Actual value: 3 deals today
    E   Call log:
    E     - Expect "to_have_text" locator("#deals-status") with timeout 3000ms
    E       5 × locator resolved to <p id="deals-status">Loading deals...</p>
    E         - unexpected value "Loading deals..."
    E       4 × locator resolved to <p id="deals-status">3 deals today</p>
    E         - unexpected value "3 deals today"
    E   Aria snapshot:
    E   - paragraph: 3 deals today

It tells you what it expected, the last value it saw, and the history: five polls saw the loading text and four
saw the final text. Here the expectation was wrong, not the page (there really are three deals).

## Timeouts

- expect: 5 seconds by default; per call with timeout=, or for the run with expect.set_options(timeout=10_000).
- Actions and navigation: 30 seconds by default; page.set_default_timeout() and set_default_navigation_timeout().
- Set them from what the product promises ("deals within 3 seconds"), not by doubling whenever a test fails. A
  bigger timeout makes a failing test slower to fail; it does not make a broken page work.

## Waiting for something that is not on the screen

When the next step depends on a request finishing rather than on something visible, wait for the response:

    with page.expect_response("**/api/cart") as resp:
        page.get_by_role("button", name="Add to cart").click()
    assert resp.value.ok

page.wait_for_timeout(ms) exists for debugging only. Playwright's documentation also discourages
wait_for_load_state("networkidle") for tests: it waits for no network traffic for half a second, which is slow
and never arrives on pages that poll.`,
    workedExample: `**Scenario.** A Hyderabad ed-tech company's results page shows "Fetching your result..." and then the
student's grade; the API behind it takes from a fraction of a second to a few seconds on results day. Its old test
is the SaleKart deals test in disguise:

    page.goto("/result/22B81A0501")
    time.sleep(3)
    assert page.locator("#grade").inner_text() == "A"
    assert page.locator("#loading").is_visible() is False

**Step 1: name the moment you are waiting for.** Not "three seconds"; "the grade is shown and the loading message
is gone". Both are visible facts, so both become expect calls.

**Step 2: rewrite.**

    page.goto("/result/22B81A0501")
    expect(page.get_by_text("Fetching your result")).to_be_hidden(timeout=10_000)
    expect(page.get_by_test_id("grade")).to_have_text("A")

to_be_hidden waits until the message disappears. The 10-second timeout is not a guess: the product's agreed limit is
"result within 8 seconds on results day", so the test fails exactly when that promise is broken.

**Step 3: check it waits only as long as needed.** On SaleKart the equivalent change took the deals test from 9 of
20 runs failing to 20 of 20 passing, and each run waited only for the deals it actually got (0.3 to 2 seconds),
instead of a fixed second that was too short, or 2.5 that is always too long.

**Step 4: what about the is_visible() line?** It was never a check. is_visible() answers immediately; right after a
sleep it happened to be False most of the time, and on a slow day it would have been True and failed. Any is_ or
inner_text() inside an assert on page state should become an expect.

**Step 5: put the rule in the review checklist.** "No time.sleep or wait_for_timeout in tests; no assert on
inner_text, is_visible or count for page state." Both are easy to search for in a pull request.`,
    mcqs: [
      mcq('A test sleeps one second and then asserts the deals text. Over 20 runs it failed 9 times with "Loading deals...". What is the right change?', [
        ['Replace the sleep and assert with expect(...).to_have_text(...)', true],
        ['Raise the sleep to five seconds so even slow runs have time to load', false],
        ['Wrap the assert in a loop that retries it up to three times in a row', false],
        ['Mark the test flaky with a rerun marker so CI retries failures once', false],
      ], 'expect polls until the text appears and then continues, so it is as fast as the page allows and fails only if the deals never come. A longer sleep wastes time on every run and still fails on a slower machine, a hand-written retry loop rebuilds expect badly, and rerunning hides the race instead of removing it.'),
      mcq('Which line actually waits for the cart badge to update after clicking Add to cart?', [
        ['expect(page.get_by_test_id("cart-count")).to_have_text("1")', true],
        ['assert page.get_by_test_id("cart-count").inner_text() == "1"', false],
        ['assert page.get_by_test_id("cart-count").is_visible() is True', false],
        ['assert page.get_by_test_id("cart-count").count() == 1 in total', false],
      ], 'Only the web-first assertion retries until the badge shows 1. inner_text reads once and failed 10 runs out of 10 with \'0\' == \'1\', is_visible answers immediately and the badge is visible anyway, and count only says the badge exists, not what it shows.'),
      mcq('The status reads "Payment successful. Ref UPI-4F2A9C". Why does expect(status).to_have_text("Payment successful") fail?', [
        ['A string passed to to_have_text must match the full text', true],
        ['to_have_text is case-sensitive about trailing punctuation', false],
        ['The status element is a paragraph, which to_have_text skips', false],
        ['The assertion times out because the status is still loading', false],
      ], 'to_have_text with a string compares the whole (whitespace-normalised) text, so the reference makes it differ; to_contain_text or a regular expression would pass. Punctuation is not the issue, any element works, and the failure message showed the final text, so it was not still loading.'),
    ],
    checkpoint: [
      mcq('A click on a SaleKart button times out, and the call log ends with "waiting for element to be visible, enabled and stable". What is the most likely state of the button?', [
        ['It is disabled, so the click is waiting for it to be enabled', true],
        ['It does not exist, so the locator cannot resolve to any element', false],
        ['It matches two elements, so strict mode is still deciding which', false],
        ['It is enabled, but the page has not finished its network traffic', false],
      ], 'The log shows the locator resolved to an element and the click is stuck on actionability; the disabled "Pay later" button produced exactly this. A missing element stays at "waiting for" the locator, two matches fail at once with a strict-mode error, and clicks do not wait for network quiet.'),
      mcq('Which statement about Playwright timeouts is right?', [
        ['expect retries for 5 seconds by default; actions default to 30 seconds', true],
        ['expect checks once, then waits for the timeout before it reports failure', false],
        ['Actions and expect share one 30-second timeout that cannot be changed', false],
        ['Timeouts apply only to navigation; clicks and fills never time out at all', false],
      ], 'Web-first assertions poll up to their own default of 5 seconds, while actions and navigation default to 30, and both can be set per call or per page. expect polls rather than checking once, the two are set separately, and clicks do time out (the disabled button failed after 1,500 ms).'),
      mcq('A test must check that the "Loading deals..." text has gone before it reads the deals. Which line does that?', [
        ['expect(page.get_by_text("Loading deals")).to_be_hidden()', true],
        ['assert not page.get_by_text("Loading deals").is_visible()', false],
        ['page.wait_for_load_state("networkidle") and then continue', false],
        ['page.wait_for_timeout(2000) and then read the deals list', false],
      ], 'to_be_hidden waits until the message disappears and fails clearly if it never does. is_visible answers once, at whatever moment it runs; networkidle is discouraged by the documentation as slow and unreliable on pages that keep polling; and a fixed wait is a sleep under another name.'),
    ],
  },
  /* ── PAGE_OBJECTS ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PLAYWRIGHT_PAGE_OBJECTS',
    notes: `By the end of the sale-day sprint SaleKart has forty browser tests, and twenty-six of them start with the same
four lines: go to /login, fill Email, fill Password, click Sign in. Then the designer renames the field to "Email
address". Twenty-six files change in one pull request, and two are missed. The page object model exists to make
that a one-line change.

## The idea

A page object is a class that knows one page (or one component) of the app: how to find its elements and how to do
the things a user does there. Tests talk to page objects in the language of the product ("log in as Asha", "add the
earbuds to the cart"); only page objects know about labels, roles and test ids.

SaleKart's pages module:

    class Header:
        """A component: the nav bar every page shares."""
        def __init__(self, page: Page):
            self.cart_count = page.get_by_test_id("cart-count")
            self.signed_in_as = page.get_by_text("Signed in as")

    class LoginPage:
        def __init__(self, page: Page):
            self.page = page
            self.email = page.get_by_label("Email")
            self.password = page.get_by_label("Password")
            self.submit = page.get_by_role("button", name="Sign in")
            self.error = page.get_by_role("alert")

        def open(self):
            self.page.goto("/login")
            return self

        def login(self, email: str, password: str):
            self.email.fill(email)
            self.password.fill(password)
            self.submit.click()

    class SearchPage:
        def __init__(self, page: Page):
            self.page = page
            self.header = Header(page)
            self.box = page.get_by_label("Search products")

        def search(self, text: str):
            self.page.goto("/")
            self.box.fill(text)
            self.page.get_by_role("button", name="Search").click()
            return self

        def product(self, name: str) -> Locator:
            return self.page.get_by_role("listitem").filter(
                has=self.page.get_by_role("heading", name=name))

        def add_to_cart(self, name: str):
            item = self.product(name)
            item.get_by_role("button", name="Add to cart").click()
            item.get_by_role("button", name="Added").wait_for()   # the page's own "done" signal

    class CartPage:
        def __init__(self, page: Page):
            self.page = page
            self.rows = page.get_by_role("table", name="Cart items").get_by_role("row")
            self.total = page.get_by_test_id("cart-total")

        def open(self):
            self.page.goto("/cart")
            return self

Because locators are lazy (the previous lesson), defining them in __init__ is safe: nothing is looked up until a
method or a test uses them.

## Tests that read like the story

    @pytest.fixture
    def logged_in_page(page: Page) -> Page:
        LoginPage(page).open().login("asha@example.test", "Sale@2026")
        expect(page.get_by_text("Signed in as asha@example.test")).to_be_visible()
        return page

    def test_two_items_in_cart_total(logged_in_page: Page):
        shop = SearchPage(logged_in_page)
        shop.search("tarang")
        shop.add_to_cart("Tarang Wireless Earbuds")
        shop.add_to_cart("Tarang Neckband Earphones")
        expect(shop.header.cart_count).to_have_text("2")

        cart = CartPage(logged_in_page).open()
        expect(cart.rows).to_have_count(2)
        expect(cart.total).to_have_text("Rs 2198")

    $ pytest tests/test_pom.py --browser-channel chrome -q
    3 passed

The fixture checks the login worked before handing over the page. If login breaks, every test that needs it
errors in setup with a message about login, instead of failing three steps later on an empty cart.

## Rules that keep page objects useful

- **Assertions live in tests.** A page object offers locators (cart.total) and actions (add_to_cart); the test
  decides what is expected. A page object that asserts hides the expectation from the reader and cannot be reused
  for the negative case ("login with a wrong password shows an error" uses the same login() method).
- **Waiting for the page to be ready is not an assertion.** add_to_cart waits for the "Added" label because the
  next action depends on the server having answered; that is synchronisation that belongs with the action. It is
  also why the page-object tests never hit the cart race you will meet in the flaky-tests lesson.
- **Methods are user actions, named in product language:** login, search, add_to_cart, pay_with_upi. Not
  click_button_2 or fill_field.
- **Components for shared pieces.** The header, a date picker, a product card: one class, composed into the pages
  that contain it. Prefer composition to a deep BasePage inheritance tree, which turns into a place for everything.
- **No test data inside page objects.** Emails, products and amounts come from the test or from fixtures, so the
  same page object serves every case.
- **Return the next page when navigation is the point.** open() returns self for chaining; a method that always
  lands on another page may return that page's object. Do not force it for actions that can go either way.
- **No sleeps, no try/except that swallows failures,** and no "if the button exists then click it" logic. A page
  object that guesses hides bugs.

## Wiring page objects into pytest

Small fixtures make tests shorter still, and conftest.py from "Fixtures, Scopes and conftest at Scale" is where they
go:

    @pytest.fixture
    def login_page(page) -> LoginPage:
        return LoginPage(page)

    def test_login_rejects_wrong_password(login_page):
        login_page.open().login("asha@example.test", "sale@2026")
        expect(login_page.error).to_have_text("Invalid email or password")

## A layout that scales

    tests/
      conftest.py          # base_url, browser options, logged-in fixtures
      test_search.py       # one file per feature, a few journeys each
      test_cart.py
      test_checkout.py
    pages/
      __init__.py          # or one module per page
      components.py        # Header, ProductCard
    data/                  # users and products per environment

The base URL comes from configuration (--base-url or the base_url fixture), never from a page object, so the same
suite runs against a developer's machine, QA and staging.

## When page objects are too much

A ten-test suite for a single form does not need a framework. Introduce page objects when the same page appears in
several tests; until then, plain tests with good locators are easier to read. Teams also use the "screenplay"
pattern (actors, tasks and questions) for very large suites; it solves the same problem with more ceremony, and you
should recognise the name in interviews.`,
    workedExample: `**Scenario.** A pull request adds this test for SaleKart's checkout page. Review it and restructure it with page
objects.

    def test_checkout(page):
        page.goto("/login")
        page.locator("#email").fill("asha@example.test")
        page.locator("#password").fill("Sale@2026")
        page.locator("form button").click()
        time.sleep(1)
        page.goto("/search?q=mug")
        page.locator("li.product button").click()
        time.sleep(1)
        page.goto("/checkout")
        assert "449" in page.content()

**Step 1: list the problems.** The ids are tolerable, but "form button" and "li.product button" are tag paths that
break or turn ambiguous with the next markup change; login is repeated inline; two sleeps (slow and racy);
"449 in page.content()" passes if 449 appears anywhere, even in a product id; and a test named after a page instead
of a behaviour.

**Step 2: decide the behaviour.** "The checkout page charges the cart total": one mug, Rs 449.

**Step 3: rewrite with the existing page objects, and one new one.**

    class CheckoutPage:
        def __init__(self, page: Page):
            self.page = page
            self.amount = page.get_by_test_id("amount")
            self.upi_id = page.get_by_label("UPI ID")
            self.pay_now = page.get_by_role("button", name="Pay now")

        def open(self):
            self.page.goto("/checkout")
            return self

    def test_checkout_amount_is_cart_total(logged_in_page):
        SearchPage(logged_in_page).search("mug").add_to_cart("Chai Mug Set of 4")
        checkout = CheckoutPage(logged_in_page).open()
        expect(checkout.amount).to_have_text("449")

search() returns self, so the add follows in one line; add_to_cart waits for "Added" instead of sleeping, and the
assertion targets the amount element exactly. Run together with the login_page version of the wrong-password test
shown above, it printed "2 passed".

**Step 4: count what changed.** If the "Email" label is renamed, one line in LoginPage changes, and every test that
logs in keeps working. The review comment to leave: "Moved the selectors into page objects; replaced sleeps with the
page's own done signal; asserted on the amount element instead of the page source."`,
    mcqs: [
      mcq('A SaleKart LoginPage.login() method ends with expect(page.get_by_text("Signed in as")).to_be_visible(). Why does that cause trouble?', [
        ['The same method cannot be used for the wrong-password test', true],
        ['expect calls are not allowed inside a class that is not a test', false],
        ['The method would then run more slowly than the same check in a test', false],
        ['Page objects cannot import expect from the playwright sync_api module', false],
      ], 'Hard-wiring the success check into login() makes every caller expect success, so a negative test of a wrong password would fail inside the page object. expect works anywhere and costs the same in a class or a test; the problem is design, not speed or imports.'),
      mcq('add_to_cart() in SaleKart\'s SearchPage waits for the button to read "Added" before returning. Is that an assertion hidden in a page object?', [
        ['No: it waits for the server to answer so the next step is safe', true],
        ['Yes: any wait in a page object should be moved into each test', false],
        ['Yes: it should be replaced by a fixed sleep inside the method', false],
        ['No: wait_for is ignored unless pytest runs with the -s option', false],
      ], 'Waiting for the page\'s own "done" signal is synchronisation that belongs with the action, so callers do not race the /api/cart call. Moving it into every test duplicates it, a sleep reintroduces the race, and wait_for works regardless of pytest output options.'),
      mcq('Which page object method name fits the model best?', [
        ['checkout.pay_with_upi("asha@okbank")', true],
        ['checkout.click_second_button()', false],
        ['checkout.fill_input_and_submit()', false],
        ['checkout.do_step_three_of_flow()', false],
      ], 'Methods should be user actions in product language, so a test reads like the story and survives layout changes. Button positions, generic field actions and step numbers describe the implementation or the script order, not what the user does.'),
    ],
    checkpoint: [
      mcq('Twenty-six SaleKart tests type into get_by_label("Email"), and the label becomes "Email address". With a page object model, how many places change?', [
        ['One: the email locator in the LoginPage class', true],
        ['Twenty-six: each test still holds its own copy', false],
        ['None: role locators adapt to renamed labels', false],
        ['Two: the LoginPage and the conftest fixture', false],
      ], 'Tests call LoginPage.login(), so the label lives in one place. Without page objects every copy changes; get_by_label does not guess new label text; and a fixture that calls login() needs no change because it never mentions the label.'),
      mcq('Where should the expected cart total ("Rs 2198") be written?', [
        ['In the test, as expect(cart.total).to_have_text("Rs 2198")', true],
        ['In CartPage, as a method named check_total_is_2198()', false],
        ['In conftest.py, as a session-scoped expected_total fixture', false],
        ['In the Header component, which shows the total on every page', false],
      ], 'Page objects expose the total; the test owns the expectation, so readers see what is checked and other tests can expect other totals. A hard-coded check method, a shared fixture value and a component that does not even show the total all hide or misplace the expectation.'),
      mcq('A logged_in_page fixture logs in and returns the page. Why should it also check that login worked before returning?', [
        ['So a login failure is reported in setup as a login problem', true],
        ['So pytest can cache the login cookie across the whole run', false],
        ['So the browser context is promoted to the session scope', false],
        ['So that the tests using it no longer need any assertions', false],
      ], 'Checking in the fixture makes a broken login error clearly in setup, instead of each test failing later on an empty cart or a redirect. It does not cache cookies or change the fixture scope, and tests still need their own assertions about their own behaviour.'),
    ],
  },
  /* ── NETWORK_AUTH ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PLAYWRIGHT_NETWORK_AUTH',
    notes: `Two things make browser suites slow and shallow. Every test logs in through the form, though only one test is about
logging in. And every test talks to the real payment service, so nobody ever tests what the page does when UPI
is down, which on sale day is exactly when it matters. This lesson takes control of both: the login state and the
network.

## Log in once, reuse the state

A BrowserContext's cookies and local storage can be saved to a file and loaded into new contexts. Log in through the
UI once per run, save, and start every other test already logged in:

    AUTH = Path(__file__).parent.parent / ".auth" / "asha.json"

    @pytest.fixture(scope="session")
    def asha_state(browser: Browser, base_url) -> str:
        context = browser.new_context(base_url=base_url)
        page = context.new_page()
        LoginPage(page).open().login("asha@example.test", "Sale@2026")
        expect(page.get_by_text("Signed in as")).to_be_visible()
        AUTH.parent.mkdir(exist_ok=True)
        context.storage_state(path=AUTH)
        context.close()
        return str(AUTH)

    @pytest.fixture
    def asha(new_context, asha_state) -> Page:
        return new_context(storage_state=asha_state).new_page()

new_context is pytest-playwright's fixture for extra contexts: it applies the run's options (base_url, tracing) and
closes the context after the test. What the file holds:

    cookies: [('session', '127.0.0.1', True)]
    origins: []

One HttpOnly session cookie and no local storage. Timed over ten runs each against SaleKart (which spends about 0.4
seconds checking a password, like a real auth service):

    UI login each time : median 0.93 s
    saved storage_state: median 0.31 s

Six hundred milliseconds a test is ten minutes a day on a 1,000-test suite run a few times a day, and the login form
still has its own tests.

Things to get right:

- **The file is a credential.** It holds a live session. Put .auth/ in .gitignore, use test accounts only, and read
  their passwords from environment variables or the CI secret store.
- **Sessions expire.** Create the state at the start of each run (as the session fixture does), not once a month.
- **Shared users collide.** If the cart lives on the server per user, two parallel tests logged in as the same user
  share a cart. With pytest-xdist, give each worker its own user (worker_id is a fixture xdist provides) or each test
  its own data. SaleKart keeps the cart in the session cookie, so each context gets its own copy; most real shops
  do not.

## Log in through the API instead

If the app has a login API, the form is not needed at all. page.request is an API client that shares the context's
cookies, so a session it creates is the browser's session:

    r = page.request.post("/api/login", data={"email": "asha@example.test", "password": "Sale@2026"})
    api login: 200 {'user': 'asha@example.test'}
    page.goto("/cart")      # "Your cart", not the login page

A wrong password gave 401 {'error': 'invalid'}, so check r.ok in the fixture rather than assuming.

## Arrange through the API, act and assert through the UI

A checkout test does not need to search and click Add to cart; another test covers that. Put the cart in place
through the API, then test only the checkout page:

    def add_via_api(page: Page, product_id: int):
        r = page.request.post("/api/cart", data={"product_id": product_id})
        assert r.ok, r.status

data= with a dict is sent as JSON. The same idea builds orders, coupons or a user with a saved address in
milliseconds, instead of a minute of clicking. ("Test Data" in this track covered creating and cleaning up such data.)

## Mocking the network with page.route

page.route(url_pattern, handler) intercepts matching requests from that page; context.route does it for every page
in the context. The handler decides: route.fulfill(...) answers with your response, route.abort(...) fails the
request, route.continue_(...) sends it on (optionally changed), and route.fetch() gets the real response so you can
modify it.

The payment gateway is down:

    def test_gateway_502_shows_no_money_taken(asha: Page):
        asha.route("**/api/pay", lambda route: route.fulfill(status=502, json={"status": "FAILED"}))
        add_via_api(asha, 1)
        asha.goto("/checkout")
        asha.get_by_label("UPI ID").fill("asha@okbank")
        asha.get_by_role("button", name="Pay now").click()
        expect(asha.get_by_role("alert")).to_have_text("Payment failed. No money was taken. Try again.")

The phone loses signal mid-payment:

    asha.route("**/api/pay", lambda route: route.abort("internetdisconnected"))
    ...
    expect(asha.get_by_role("alert")).to_contain_text("Network problem")

Both passed. Neither state can be produced reliably against a real gateway, and both are where real users lose
money or trust.

## Checking what the page sent

A route handler sees the request, so the test can check the page sent the right thing:

    sent = []
    def fake_pay(route: Route):
        sent.append(route.request.post_data_json)
        route.fulfill(json={"status": "SUCCESS", "ref": "UPI-TEST01"})

    asha.route("**/api/pay", fake_pay)
    add_via_api(asha, 1)        # earbuds, 1299
    add_via_api(asha, 4)        # bottle, 349
    ...
    expect(asha.get_by_role("status")).to_have_text("Payment successful. Ref UPI-TEST01")
    assert sent == [{"upi_id": "asha@okbank", "amount": 1648}]

## Changing a real response

To test an empty state without changing the server, fetch the real response and edit it:

    def empty_deals(route: Route):
        real = route.fetch()
        body = real.json()        # ['Earbuds at Rs 1,299', 'Kurtas from Rs 799', 'Mugs at Rs 449']
        body["deals"] = []
        route.fulfill(response=real, json=body)

## Waiting for, and checking, real traffic

Without mocking, page.expect_response waits for a response and lets you check it:

    with asha.expect_response("**/api/pay") as resp:
        asha.get_by_role("button", name="Pay now").click()
    assert resp.value.status == 200

## Where mocking stops

A mock is your belief about the API. If the real API renames "ref" to "reference", every mocked test stays green
while production breaks. So: keep a few end-to-end tests against the real backend in an integrated environment,
mock in the many tests that are about the page's behaviour, and let contract tests (the API testing topic) keep
your mocks honest. Never point tests at a real payment gateway with real money; use the provider's sandbox or a mock.
Playwright can also replay recorded traffic from a HAR file (page.route_from_har, per the documentation), which
is handy for third-party APIs you cannot run locally.`,
    workedExample: `**Scenario.** SaleKart's product owner asks: "What does the home page show on a day with no deals?" There is
no way to make the real deals service return nothing in QA. Find out with a test.

**Step 1: intercept and change the real response.** Keep the real status and headers; empty only the list.

    def test_deals_service_returns_nothing(page: Page):
        def empty_deals(route: Route):
            real = route.fetch()
            body = real.json()
            body["deals"] = []
            route.fulfill(response=real, json=body)

        page.route("**/api/deals", empty_deals)
        page.goto("/")
        expect(page.locator("#deals-status")).to_have_text("0 deals today")

**Step 2: run it.** It passed: the page says "0 deals today" above an empty list. The route was registered before
goto, which matters: a route added after the request was sent intercepts nothing.

**Step 3: decide whether that is right.** The test proves what the page does, not what it should do. "0 deals
today" is grammatical but unhelpful on a sale page; the product owner wants "No deals right now. Check back at 6
pm." That is a change request, written up with the test as the way to reproduce it. When the page changes, the
expected text in the test changes with it, and it becomes the regression test for the empty state.

**Step 4: cover the other failures the same way.** fulfill(status=500) for a broken service and abort("timedout")
for a hung one. On SaleKart today, neither shows anything but "Loading deals..." forever, because the page's script
has no error handling; that is a second, more serious bug, and the kind only network control can find before
users do.

**Step 5: keep one real test.** One test without the route checks the real service still answers in the agreed
shape, so the mocked ones do not drift from reality.`,
    mcqs: [
      mcq('A session fixture logs in once and saves storage_state to .auth/asha.json. What must the team do with that file?', [
        ['Keep it out of git, since it holds a live session cookie', true],
        ['Commit it, so CI can skip the login step on every run', false],
        ['Encrypt it with the test password before each test run', false],
        ['Share it on the team drive so testers can log in quickly', false],
      ], 'The saved state contains a working session (here an HttpOnly session cookie), so it is a credential: ignore it in git and recreate it each run. Committing or sharing it leaks access and goes stale, and encrypting it with the password that is already a secret adds nothing.'),
      mcq('A test registers page.route("**/api/deals", ...) after page.goto("/"), and the mock never takes effect. Why?', [
        ['The deals request had already been sent before the route existed', true],
        ['page.route only works on requests made from inside an iframe', false],
        ['The glob pattern needs the full host name to match any request', false],
        ['route.fulfill can only change status codes, not response bodies', false],
      ], 'Routes intercept requests made after they are registered, and the home page fetches deals while loading, so the route must come before goto. Routes work on the page\'s own requests, ** globs match any host, and fulfill can set the body, headers and status.'),
      mcq('Why use page.request.post("/api/cart", ...) rather than requests.post(...) to put items in the cart before a checkout test?', [
        ['page.request shares the browser context\'s cookies and session', true],
        ['requests cannot send a JSON body to an API running locally', false],
        ['page.request retries failed calls automatically until they pass', false],
        ['requests is blocked by Playwright while a browser test is running', false],
      ], 'Items must land in the same session the browser uses, and page.request sends and stores the context\'s cookies. requests can send JSON fine but has its own separate cookie jar, page.request does not retry, and Playwright does not block other libraries.'),
    ],
    checkpoint: [
      mcq('How do you test that SaleKart\'s checkout shows "No money was taken" when the payment gateway returns 502?', [
        ['page.route("**/api/pay") with route.fulfill(status=502) before paying', true],
        ['Stop the QA payment service while the test runs and restart it after', false],
        ['Pay with an invalid UPI ID, which makes the gateway answer with a 502', false],
        ['Wait for a real gateway outage and run the suite during that window', false],
      ], 'Fulfilling the request with a 502 produces the failure on demand, for this test only. Stopping a shared service breaks everyone else\'s tests, an invalid UPI ID returns 400 (a different path), and waiting for an outage is not a test.'),
      mcq('Login through the UI took a median 0.93 s and loading a saved storage_state 0.31 s. When should a suite still log in through the form?', [
        ['In the tests whose subject is the login form itself', true],
        ['In every test, because saved state can never be trusted', false],
        ['Never, because the login form is covered by unit tests', false],
        ['Only in tests that run on Firefox, which ignores saved state', false],
      ], 'The login form needs its own browser tests, including the failure cases; every other test can start logged in. Saved state is reliable when recreated each run, unit tests do not prove the form works in a browser, and Firefox loads storage_state like any other browser.'),
      mcq('All checkout tests mock /api/pay, and the real API renames its "ref" field to "reference". What happens to the suite?', [
        ['It stays green while real payments show a broken reference', true],
        ['It turns red, since mocks are checked against the real API', false],
        ['It errors at once, because route.fulfill validates its JSON', false],
        ['It is unaffected, and so is production, since both use mocks', false],
      ], 'A mock returns whatever you wrote, so the page is tested against the old shape and nothing fails. Playwright does not compare mocks with the real API or validate JSON fields, which is why a few real end-to-end tests and contract tests are needed.'),
    ],
  },
  /* ── DEBUG_FLAKY ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PLAYWRIGHT_DEBUG_FLAKY',
    notes: `A browser test that fails every time is good news: it is telling you something, and you can ask it again. A test
that fails one run in three is harder. It failed at 2 a.m. on a CI machine you cannot log in to, and by the time you
look, it passes. The answer is to make every failure leave evidence behind, and Playwright's trace is the best
evidence a browser test can leave.

## Make failures leave evidence

pytest-playwright records artefacts from the command line:

    pytest --browser-channel chrome --tracing retain-on-failure --screenshot only-on-failure

Each failing test gets a folder under test-results/, named after the test id:

    test-results/tests-test-debug-py-test-cart-total-formatting-chromium/trace.zip          254307
    test-results/tests-test-debug-py-test-cart-total-formatting-chromium/test-failed-1.png   15905
    test-results/tests-test-debug-py-test-bottle-reaches-cart-chromium-1/trace.zip          195068
    test-results/tests-test-debug-py-test-bottle-reaches-cart-chromium-1/test-failed-1.png   11797

retain-on-failure records every test but keeps only the failures' traces, so passing runs cost a little time and no
disk. Each run starts with a fresh test-results folder, so in CI upload it as a build artefact before it is gone.
--video retain-on-failure adds a recording; on this machine it failed with "Video rendering requires ffmpeg
binary ... playwright install ffmpeg", because Playwright's ffmpeg had not been downloaded. Traces need nothing
extra and are more useful than video anyway.

Outside the plugin, record a trace yourself:

    context.tracing.start(screenshots=True, snapshots=True, sources=True)
    ...the steps...
    context.tracing.stop(path="trace.zip")

## The trace viewer

"playwright show-trace trace.zip" opens the viewer, or drop the file on trace.playwright.dev, which per the
documentation opens it in your browser without uploading it. From the documentation, the viewer shows:

- **Actions**: every Playwright call in order, with its locator and duration, and a timeline of screenshots along
  the top.
- **Snapshots**: for each action, a full DOM snapshot before, during (with the click point marked) and after it,
  which you can inspect like a live page: pick an element, try a locator against it.
- **Call log** for the selected action: what it waited for and how long.
- **Console, Network, Errors and Source** tabs: browser console output, every request with its status and timing,
  the failure with its stack, and the test source line by line.

Recent versions also read traces on the command line, which is handy on a CI machine. For one failing run of a
SaleKart test (columns trimmed):

    $ playwright trace open trace.zip
      Actions: 11   Duration: 4.3s
    $ playwright trace actions
       7. 0:01.424  Navigate             /search?q=bottle               112ms
       8. 0:01.562  Click                getByRole('button', { name: 'Add to cart' })   154ms
       9. 0:01.727  Wait for timeout                                   412ms
      10. 0:02.150  Navigate             /cart                           89ms
    $ playwright trace requests
       5. 0:01.448  GET   200  search?q=bottle     51ms
       6. 0:01.709  POST  ERR  cart                   -
       7. 0:02.168  GET   200  cart                34ms
    $ playwright trace errors
      ✗ Expect "to_have_count" getByRole('table', { name: 'Cart items' }).getByRole('row')
        at test_debug.py:28

## A flaky test, start to finish

The test:

    @pytest.mark.parametrize("run", range(10))
    def test_bottle_reaches_cart(shopper: Page, run):
        shopper.goto("/search?q=bottle")
        shopper.get_by_role("button", name="Add to cart").click()
        shopper.wait_for_timeout(400)          # "long enough for the cart call"
        CartPage(shopper).open()
        expect(CartPage(shopper).rows).to_have_count(1, timeout=2000)

**Reproduce by repetition.** One run proves nothing. Parametrising over range(10) (or the pytest-repeat plugin's
--count) gave 7 failed of 10, and on a second run 5 of 10, each with:

    E   AssertionError: Locator expected to have count '1'
    E   Actual value: 0

**Read the trace.** The requests list says it: POST /api/cart started at 1.709 s and never got a response (ERR);
the navigation to /cart at 2.150 s cancelled it. The server takes 0.1 to 0.8 seconds to answer the cart call, the
test waited 0.4, and when the answer was slower the browser left the page first. The cart update (a new session
cookie) never arrived.

**Fix the cause.** Wait for the thing the next step depends on, the response:

    with shopper.expect_response("**/api/cart") as resp:
        shopper.get_by_role("button", name="Add to cart").click()
    assert resp.value.ok
    CartPage(shopper).open()
    expect(CartPage(shopper).rows).to_have_count(1)

    10 passed

**Ask what the user sees.** The flaky test found a real problem: a shopper who taps Add to cart and then Cart
quickly can lose the item, with the button having said nothing. That is a bug report (disable navigation or show a
pending state until the cart call returns), not just a test fix.

## Where flakiness comes from

- **Timing:** sleeps, read-once asserts, navigating before a request finishes. Fix with expect and expect_response.
- **Shared state:** two tests on one user or one cart, data left by an earlier test, order-dependent tests. Fix with
  data per test and fresh contexts.
- **Environment:** a slow CI machine, a shared QA backend under load, third-party scripts. Fix by mocking what you
  do not own and sizing timeouts from the product's promises.
- **Time and randomness:** tests that break at midnight IST, on the 31st, or with a random product order.
- **The app itself:** real races, like the cart above. Those are bugs, and the test is doing its job.

## Quarantine honestly

When a flaky test cannot be fixed today, take it out of the merge gate without losing it: a quarantine marker that
the gate deselects and a nightly job still runs, with a ticket, an owner and a date. Automatic retries
(pytest-rerunfailures, --reruns 2) can keep a pipeline moving, but only if retried passes are reported and counted;
a retry that silently turns red into green hides exactly the races users will hit. Never "fix" a flaky test by
deleting its assertion or doubling every timeout. Measuring flakiness across a whole suite comes later in "Managing
Flaky Tests and Test Health".`,
    workedExample: `**Scenario.** Overnight, test_cart_total_formatting failed on CI. You have its artefacts: trace.zip and
test-failed-1.png. Decide what happened, without rerunning anything yet.

**Step 1: read the pytest output.**

    E   AssertionError: Locator expected to have text 'Rs 2,198'
    E   Actual value: Rs 2198
    E   Call log:
    E     - Expect "to_have_text" get_by_test_id("cart-total") with timeout 3000ms
    E       9 × locator resolved to <strong data-testid="cart-total">Rs 2198</strong>
    E         - unexpected value "Rs 2198"

Nine polls over three seconds all saw the same value. This is not a timing problem; the page settled on "Rs 2198".

**Step 2: confirm in the trace.** The actions list shows the login, the search, both add_to_cart calls finishing
with "Added", and the cart page loading; the network list shows every request returning 200. The screenshot shows
both items and "Total: Rs 2198". The data is right; only the format differs.

**Step 3: decide whose mistake it is.** Check the requirement, not your memory. If SaleKart's style guide says
amounts are shown in Indian format with a thousands separator (Rs 2,198, and Rs 1,02,450 for a lakh and more), it is
an app bug: raise it with the screenshot and the expected format, and keep the test failing or xfail it with the
bug id. If no such rule exists, the test invented a requirement; change the expectation and ask the product owner
whether the format should be specified.

**Step 4: classify it.** A deterministic failure (same value every poll, every run) is not flaky, and rerunning
it is wasted time. Flaky means the same code sometimes passes, like the cart race; the trace's timing and network
columns are where those show themselves.

**Step 5: write it up.** "test_cart_total_formatting fails deterministically: total shown as Rs 2198, test expects
Rs 2,198. Trace and screenshot attached. Not flaky. Needs a decision on the currency format (style guide section?)."`,
    mcqs: [
      mcq('Which pytest-playwright option keeps a trace only for tests that fail?', [
        ['--tracing retain-on-failure', true],
        ['--tracing on --screenshot off', false],
        ['--screenshot only-on-failure', false],
        ['--video retain-on-failure', false],
      ], 'retain-on-failure records every test and keeps the trace only when the test fails. --tracing on keeps a trace for every test, --screenshot only-on-failure keeps a picture but no trace, and the video option records video, which on this machine also needed Playwright\'s ffmpeg download.'),
      mcq('A flaky cart test\'s trace shows POST /api/cart with status ERR and the navigation to /cart starting before it finished. What is the cause?', [
        ['The test navigated away before the cart call answered, cancelling it', true],
        ['The cart API rejected the request because it had no CSRF token', false],
        ['The trace viewer marks every POST as ERR when snapshots are enabled', false],
        ['The cart table locator was wrong, so it counted rows of another table', false],
      ], 'ERR with no response, followed by an earlier-than-expected navigation, means the browser abandoned the request when it left the page. A rejected request would show a 4xx status, the viewer reports real statuses (other requests show 200), and the locator matched the right table, which simply had no rows.'),
      mcq('A test fails 1 run in 4 on CI. The team wants to turn on pytest-rerunfailures with --reruns 2. Under what condition is that acceptable?', [
        ['Retried passes are reported, and the test has an owner and a fix date', true],
        ['The retries happen only on CI, so local runs still show the failures', false],
        ['The rerun count stays at two or below, which keeps the run time small', false],
        ['The test only covers a page that is low priority for the product team', false],
      ], 'Retries keep the pipeline moving only if the flakiness stays visible and someone is fixing the cause. Hiding it on CI is exactly where it is noticed, the number of reruns does not change that it hides a race, and low-priority pages can still have real bugs behind a flaky test.'),
      mcq('How does a team look at a trace.zip produced on a CI machine?', [
        ['Download it and run playwright show-trace, or open trace.playwright.dev', true],
        ['Open it in a text editor, since the trace is a plain log of each line', false],
        ['Rerun the test on CI with --headed so the trace plays in that browser', false],
        ['Unzip it and open the screenshots, since that is all a trace contains', false],
      ], 'The trace viewer, locally or at trace.playwright.dev, shows actions, DOM snapshots, network and console. The zip is not a text log, CI machines have no screen for --headed, and a trace holds far more than screenshots: snapshots, network entries, sources and the call log.'),
    ],
    checkpoint: [
      mcq('An expect failure says "9 × locator resolved to ... Rs 2198 - unexpected value" for the whole timeout. What does that tell you?', [
        ['The page settled on Rs 2198, so it is not a timing issue', true],
        ['The locator matched nine elements, a strict mode problem', false],
        ['The test should be rerun nine times to confirm the result', false],
        ['The timeout was too short for the cart total to update', false],
      ], 'Nine polls all saw the same final value, so the page was stable and the difference is real (a format or a wrong expectation). The count is polls, not matches; reruns of a deterministic failure add nothing; and a longer timeout would only see the same value for longer.'),
      mcq('A SaleKart test passes alone but fails when the suite runs with -n 4, and every test logs in as the same user whose cart lives on the server. What is the likely cause?', [
        ['Parallel tests change the same user\'s cart at the same time', true],
        ['pytest-xdist workers share one browser context between them', false],
        ['Playwright cannot run more than one Chrome process on a machine', false],
        ['The base_url fixture gives each worker a different app version', false],
      ], 'Shared server-side state is a classic source of flakiness: one worker empties or adds to the cart another is checking. Each xdist worker has its own browser and contexts, several Chrome processes run fine, and each worker starts the same app code.'),
      mcq('Which response to a flaky browser test is honest quarantine?', [
        ['Deselect it from the merge gate, run it nightly, with a ticket and owner', true],
        ['Delete the assertion that fails sometimes and keep the rest of the test', false],
        ['Double every timeout in the file until the test stops failing on CI', false],
        ['Skip it with no reason given, so that the pipeline stays green again', false],
      ], 'Quarantine removes the test from the gate while keeping it running and owned, so the race still gets fixed. Deleting the assertion stops it testing anything, doubling timeouts slows the suite without fixing a race, and an unexplained skip is forgotten.'),
    ],
  },
  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PLAYWRIGHT_DEBUGGING',
    notes: `Six Playwright tests that went wrong on SaleKart. In each one, read the symptom, find the cause from the evidence, and
change only what the cause needs. Every message below is real output from Playwright for Python with the installed
Chrome. Two of the six are worse than a failure: a test that passes while checking nothing.

## 1. The relative URL that is not a URL

**Symptom.** A helper script that worked in the pytest suite fails on its first line:

    page.goto("/")
    Page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL

**Cause.** The script made its page with browser.new_page(), which has no base_url. In the suite, pytest-playwright
creates every context with the base_url fixture's value, so "/" means the app under test.

**Fix.** Create the context with browser.new_context(base_url="http://127.0.0.1:5761"), or use the plugin's page or
new_context fixture. Do not hard-code full URLs in tests: the base URL is configuration, different on a laptop, QA
and staging.

## 2. The click that waits forever

**Symptom.**

    Locator.click: Timeout 1500ms exceeded.
    Call log:
      - waiting for get_by_role("button", name="Pay later")
        - locator resolved to <button disabled>Pay later</button>
      - attempting click action
        - waiting for element to be visible, enabled and stable

**Cause.** The locator found the button; the call log shows the click waiting for it to become enabled. The button
is disabled, by design or because an earlier step (a terms checkbox, a valid UPI ID) did not happen.

**Fix.** If the test is about the button being unavailable, assert it: expect(button).to_be_disabled(). If the
button should be enabled, find the missing step. Do not reach for click(force=True), which skips the actionability
checks and clicks a button a real user cannot press.

## 3. The "no error" check that passed while the error was coming

**Symptom.** A test meant to prove a payment shows no error passes, even with an invalid UPI ID that the server
rejects:

    setup_checkout(page, "asha-okbank")                    # no @: the server answers 400 after 0.5 s
    expect(page.get_by_role("alert")).to_have_count(0)     # "no error shown"
    passed; a moment later the alert says: Payment failed. No money was taken. Try again.

**Cause.** A negative assertion is satisfied at once if the thing is not there yet. The click returned as soon as it
was done, the payment call was still in flight, and "zero alerts" was true for that first instant.

**Fix.** Wait for the positive outcome first, then check the absence:

    expect(page.get_by_role("status")).to_contain_text("Payment successful", timeout=3000)
    expect(page.get_by_role("alert")).to_have_count(0)

Now the same invalid UPI ID fails the test, as it should: Locator expected to contain text 'Payment successful',
Actual value: None. Before trusting any "nothing happened" check, run it once against a page where the thing does
happen.

## 4. The mock that never fires

**Symptom.** A test for the empty-deals state mocks /api/deals to return no deals, yet the page shows the real
"3 deals today", and the expectation of "0 deals today" fails.

    page.goto("/")
    page.route("**/api/deals", lambda r: r.fulfill(json={"deals": []}))

**Cause.** The home page requests the deals while it loads. By the time goto() returned, the request had gone to
the real server; a route only intercepts requests made after it is registered.

**Fix.** Register the route before goto(). For routes every test needs (blocking analytics, say), put them on the
context in a fixture so they exist before any page loads.

## 5. Text that is right but does not match

**Symptom.**

    expect(page.get_by_role("status")).to_have_text("Payment successful")
    AssertionError: Locator expected to have text 'Payment successful'
    Actual value: Payment successful. Ref UPI-4F2A9C

**Cause.** to_have_text with a string compares the whole text. The page is right.

**Fix.** Decide what you mean. If the reference matters, check its format with a regular expression
(re.compile(r"^Payment successful\\. Ref UPI-[0-9A-F]{6}$") passed); if only the message matters,
to_contain_text("Payment successful"). Do not copy today's random reference into the test; it changes every run.

## 6. The browser that is not there

**Symptom.** The mini project asks for Chromium and Firefox. With --browser firefox, every test errors in setup:

    BrowserType.launch: Executable doesn't exist at ...\\ms-playwright\\firefox-1555\\firefox\\firefox.exe

And --video retain-on-failure errors in every test with "Video rendering requires ffmpeg binary ... playwright
install ffmpeg".

**Cause.** The playwright Python package does not contain browsers. Firefox, WebKit, Playwright's own Chromium and
the ffmpeg used for video are separate downloads, tied to the package version; upgrading the package without
re-running the install gives the same error with a new path.

**Fix.** playwright install firefox (and ffmpeg) on the machine or in the CI image, re-run after every Playwright
upgrade, and on Linux CI use playwright install --with-deps for the system libraries. Where downloads are blocked,
the branded channels (--browser-channel chrome or msedge) use browsers already installed, but they are all
Chromium: they do not stand in for Firefox or Safari coverage, and the report should say so.`,
    mcqs: [
      mcq('A test asserts expect(page.get_by_role("alert")).to_have_count(0) straight after clicking Pay now, and it passes even for a UPI ID the server rejects. Why?', [
        ['Zero alerts was true at once, before the 400 response arrived', true],
        ['to_have_count(0) is ignored by Playwright when the role is alert', false],
        ['The alert has no accessible name, so get_by_role never matches it', false],
        ['The click waited for the response, and the response was cached', false],
      ], 'A negative assertion passes as soon as the condition holds, and the error appears only after the 0.5 s server call; wait for the positive outcome first. Count assertions work for every role, a role locator matches without a name, and the click returned before the response arrived.'),
      mcq('Clicking "Pay later" times out and the call log ends with "waiting for element to be visible, enabled and stable". The button is disabled until a terms box is ticked. What is the right fix?', [
        ['Tick the terms box first, or assert the button is disabled if that is the test', true],
        ['Use click(force=True) so Playwright skips the checks and presses the button', false],
        ['Raise the click timeout to 30 seconds so the button has longer to enable', false],
        ['Replace the role locator with an XPath to the button so it can be clicked', false],
      ], 'The timeout reflects the real state of the page: the button cannot be pressed until the missing step happens. force=True clicks something a user cannot, a longer timeout waits for an event that never comes, and a different locator finds the same disabled button.'),
      mcq('A test registers page.route for /api/deals after goto("/") and sees the real deals. Where should the route be registered?', [
        ['Before goto, or on the context in a fixture that runs first', true],
        ['After goto, but followed by page.reload() to apply the change', false],
        ['Inside the expect call, using its route= keyword argument', false],
        ['In the Flask app, so the server returns an empty deals list', false],
      ], 'Routes affect requests made after they exist, so register them before the page loads. Reloading after the route does work but loads the page twice for no reason, expect has no route argument, and changing the server changes it for every other test too.'),
      mcq('Tests pass with --browser-channel chrome, but --browser firefox fails with "Executable doesn\'t exist". What should the test report say?', [
        ['Firefox was not run; its build must be installed with playwright install', true],
        ['Firefox passed too, because Playwright reuses Chrome\'s engine for Firefox', false],
        ['Firefox is not supported by Playwright for Python, only by the JS version', false],
        ['Firefox failed, so the app has a Firefox bug that should be raised today', false],
      ], 'The error is about a missing browser build, not the app; the honest report is "not run" until playwright install firefox is done. Playwright drives a real Firefox build, not Chrome, Python supports Firefox, and no test reached the app, so there is no evidence of an app bug.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PLAYWRIGHT_PRACTICE',
    notes: `Nine exercises on SaleKart. Write your answer before reading ours; where an answer is a test, it was run with
pytest-playwright and the installed Chrome, and it passed. The shopper fixture used below logs in through the API:

    @pytest.fixture
    def shopper(page: Page) -> Page:
        r = page.request.post("/api/login", data={"email": "asha@example.test", "password": "Sale@2026"})
        assert r.ok
        return page

## 1. Name the locators (easy)

Write a locator for: the email field, the Sign in button, the error after a wrong password, the cart badge, and the
price inside the Cotton Kurta card on the results page.

**Answer.**

    page.get_by_label("Email")
    page.get_by_role("button", name="Sign in")
    page.get_by_role("alert")
    page.get_by_test_id("cart-count")
    page.get_by_role("listitem").filter(has=page.get_by_role("heading", name="Cotton Kurta, Indigo")).locator(".price")

The last one scopes to the card by its heading, then uses a class inside it. A class inside a well-scoped card is
acceptable; asking for a data-testid on the price would be better.

## 2. Remove the sleep (easy)

    page.get_by_role("button", name="Pay now").click()
    time.sleep(2)
    assert "Payment successful" in page.locator("#result").inner_text()

**Answer.**

    page.get_by_role("button", name="Pay now").click()
    expect(page.get_by_role("status")).to_contain_text("Payment successful")

It waits only as long as the payment takes and reports the actual text if it fails.

## 3. Pick the assertion (easy)

The heading reads: Results for "earbuds". Which of to_have_text, to_contain_text or a regular expression would you
use, and why?

**Answer.** to_have_text('Results for "earbuds"'): the whole heading is fixed and known, so a full match is the
strictest check that is still correct. to_contain_text("earbuds") would also pass for a heading that wrongly said
"No results for earbuds". Regular expressions are for text with a variable part, like a payment reference.

## 4. Same product twice (medium)

Add the steel bottle (product 4) to the cart twice and check the cart shows quantity 2 and a total of Rs 698.

**Answer.**

    def test_same_product_twice(shopper: Page):
        for _ in range(2):
            shopper.request.post("/api/cart", data={"product_id": 4})
        cart = CartPage(shopper).open()
        row = cart.rows.filter(has_text="Steel Water Bottle 1L")
        expect(row.get_by_role("cell").nth(1)).to_have_text("2")
        expect(cart.total).to_have_text("Rs 698")

The cart is arranged through the API because this test is about the cart page, not the Add to cart button.

## 5. A page object for checkout (medium)

Write CheckoutPage with locators for the amount, the UPI ID field and the Pay now button, an open() method and a
pay_with_upi(upi_id) action. Keep assertions out.

**Answer.**

    class CheckoutPage:
        def __init__(self, page: Page):
            self.page = page
            self.amount = page.get_by_test_id("amount")
            self.upi_id = page.get_by_label("UPI ID")
            self.pay_now = page.get_by_role("button", name="Pay now")
            self.success = page.get_by_role("status")
            self.error = page.get_by_role("alert")

        def open(self):
            self.page.goto("/checkout")
            return self

        def pay_with_upi(self, upi_id: str):
            self.upi_id.fill(upi_id)
            self.pay_now.click()

## 6. A payment that times out (medium)

Test that a hung payment call shows the network message and no success message.

**Answer.**

    def test_payment_timeout(shopper: Page):
        shopper.route("**/api/pay", lambda route: route.abort("timedout"))
        shopper.request.post("/api/cart", data={"product_id": 4})
        shopper.goto("/checkout")
        shopper.get_by_label("UPI ID").fill("asha@okbank")
        shopper.get_by_role("button", name="Pay now").click()
        expect(shopper.get_by_role("alert")).to_have_text("Network problem. Check your connection and try again.")
        expect(shopper.get_by_role("status")).to_have_count(0)

The absence check comes after the alert appeared, so it cannot pass too early (Debugging, case 3).

## 7. Search terms, data-driven (medium)

Cover one match, case-insensitivity, surrounding spaces and an empty term in one parametrised test with readable
ids ("Data-Driven and Parametrised Tests" showed ids=).

**Answer.**

    @pytest.mark.parametrize("term, names", [
        ("earbuds", ["Tarang Wireless Earbuds"]),
        ("TARANG", ["Tarang Wireless Earbuds", "Tarang Neckband Earphones"]),
        ("  mug  ", ["Chai Mug Set of 4"]),
        ("", []),
    ], ids=["one-match", "case-insensitive", "spaces-trimmed", "empty-term"])
    def test_search_terms(page: Page, term, names):
        SearchPage(page).search(term)
        expect(page.get_by_role("listitem").get_by_role("heading")).to_have_text(names)

to_have_text with a list checks every heading, in order, and the count; an empty list means "no results". All four
passed.

## 8. Login state per worker (medium)

The suite runs with -n 4 and the cart lives on the server, so each pytest-xdist worker needs its own user. Write the
session fixture.

**Answer.**

    @pytest.fixture(scope="session")
    def user_state(browser, base_url, worker_id, tmp_path_factory) -> str:
        email = USERS[worker_id]                    # "gw0", "gw1"...; "master" without xdist
        context = browser.new_context(base_url=base_url)
        r = context.request.post("/api/login", data={"email": email, "password": PASSWORDS[email]})
        assert r.ok, r.status
        path = tmp_path_factory.mktemp(f"auth-{worker_id}") / "state.json"
        context.storage_state(path=path)
        context.close()
        return str(path)

With xdist each worker is its own process with its own session fixtures, so each logs in once. A version of this
fixture passed with -n 2 and without xdist (worker_id "master"). Passwords come from the environment in a real suite.

## 9. Read the evidence (hard)

A checkout test fails at expect(status).to_contain_text("Payment successful"). Its trace's requests show
"POST 400 pay", and the fill action before it shows the value "asha okbank". What happened, and what do you do?

**Answer.** The test typed a UPI ID with a space instead of @, the server rejected it (the real response was
400 {'reason': 'invalid UPI ID', 'status': 'FAILED'}), and the page correctly showed "Payment failed". The test data
is wrong, not the app. Fix the data, and keep the case as a deliberate negative test: invalid UPI ID shows the
failure alert. One wrong value gave you a second test.`,
    mcqs: [
      mcq('In practice exercise 3, why is to_have_text(\'Results for "earbuds"\') better than to_contain_text("earbuds")?', [
        ['The contain check would also pass for a wrong heading that mentions earbuds', true],
        ['to_contain_text cannot match text inside quotation marks on any heading', false],
        ['to_have_text retries for longer than to_contain_text does by default', false],
        ['to_contain_text works only on paragraphs and not on any heading element', false],
      ], 'When the whole text is known, a full match is the strictest correct check; a partial match accepts "No results for earbuds" too. Both handle quotes, both share the same default timeout, and both work on any element.'),
      mcq('Exercise 4 adds the bottle to the cart through page.request rather than by clicking Add to cart twice. What is the reason?', [
        ['The test is about the cart page, and another test covers the button', true],
        ['Clicking Add to cart twice is blocked by strict mode on the results', false],
        ['page.request is the only way to add the same product more than once', false],
        ['The cart page ignores any items that were added through the browser', false],
      ], 'Arranging through the API keeps the test fast and focused on what it checks. Two clicks on one button are allowed (strict mode is about matching several elements), the UI could add it twice too, and the cart shows items however they were added.'),
      mcq('In exercise 7, what does expect(headings).to_have_text([]) check for the empty search term?', [
        ['That no product headings are shown at all', true],
        ['That every heading has an empty text value', false],
        ['Nothing, since an empty list is always ignored', false],
        ['That the search box itself is empty again', false],
      ], 'With a list, to_have_text checks the count and each text in order, so an empty list means zero matching elements. It does not test for empty strings, an empty list is a real expectation (it would fail with one result), and the search box is not part of that locator.'),
      mcq('With pytest-xdist, why is the per-worker login fixture in exercise 8 session-scoped rather than function-scoped?', [
        ['Each worker logs in once and reuses the saved state for its tests', true],
        ['Session scope makes all workers share one login across processes', false],
        ['Function-scoped fixtures cannot call context.request in a worker', false],
        ['xdist refuses to run any fixture that has the function scope set', false],
      ], 'Session scope runs once per worker process, so each worker pays for one login and every test loads the file. Workers are separate processes and never share a session fixture, function-scoped fixtures can use the request API, and xdist runs function-scoped fixtures normally.'),
      mcq('A checkout test fails, and the trace shows the test typed "asha okbank" and the pay call returned 400. What is the best next step?', [
        ['Fix the test data, and keep an invalid-UPI test as a negative case', true],
        ['Raise a bug that the payment API rejects UPI IDs from test users', false],
        ['Mock /api/pay to return 200 so that the test passes on any input', false],
        ['Rerun the test three times to see whether the 400 was a one-off', false],
      ], 'The page behaved correctly for an invalid ID, so the mistake is in the test data, and the accidental case is worth keeping on purpose. The API was right to reject it, mocking success hides the input the page actually sent, and a deterministic 400 will not change on rerun.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PLAYWRIGHT_INTERVIEW_QUESTION',
    notes: `Four questions that automation-tester and SDET interviews ask about Playwright, at product companies, GCCs and
service companies alike, with an answer that scores well and the follow-up a good interviewer asks next. Practise
them aloud; two minutes each. Interviewers listen for specifics from your own suite, so swap SaleKart for a project
you built.

## Q1. "How does Playwright handle waits? How is that different from Selenium?"

**Model answer.** "Playwright waits automatically in two places. Before an action like click or fill, it waits
until the element is attached, visible, stable, enabled and not covered, so I do not write waits around clicks. And
its expect assertions are web-first: expect(locator).to_have_text(...) keeps polling until the condition holds or the
timeout, five seconds by default, runs out. In Selenium the waiting is mine to write: explicit waits with
WebDriverWait and expected conditions, and I have to avoid mixing them with implicit waits. In practice the biggest
change is that I never use sleeps. On a demo shop I measured it: a test that slept one second before reading a
deals panel failed 9 times out of 20, and the web-first version passed 20 out of 20 and was faster."

**Follow-up.** "What if the next step depends on an API call, not on something visible?" — "Then I wait for the
response itself: with page.expect_response('**/api/cart') as resp, click, and assert resp.value.ok. I found a flaky
cart test that navigated away while that call was still in flight; the trace showed the request cancelled. Waiting
for the response fixed it, ten passes out of ten."

## Q2. "Your UI tests pass locally but fail randomly in CI. What do you do?"

**Model answer.** "First I make failures leave evidence: run with tracing on failure and screenshots, and upload
test-results as a CI artefact. Then I reproduce by repetition, running the test ten or twenty times, because one
run proves nothing. I open the trace and look at the timing and network: was a request cancelled or slow, did an
action happen before the page was ready, did an assertion read a value once. Then I group the cause: timing, shared
state between tests or parallel workers, environment like a slow shared backend, time and date, or a real race in
the app. I fix that cause, not the symptom, and if I cannot fix it today, I quarantine it out of the merge gate
with a ticket and an owner, still running nightly."

**Follow-up.** "Why not just add retries?" — "Retries can keep a pipeline moving, but only if retried passes are
reported and counted, otherwise they hide exactly the races users hit. The flaky cart test I mentioned was also
a real bug: a shopper who moved to the cart quickly lost the item. A silent retry would have hidden that."

## Q3. "How would you structure a Playwright framework for a team?"

**Model answer.** "pytest with pytest-playwright. Page objects for each page and shared components such as the
header, holding locators and user actions, with assertions in the tests. Locators by role, label and test id, agreed
with developers. Fixtures in conftest: base_url from configuration so the same suite runs on QA and staging,
logged-in pages from a saved storage_state created once per run, and factories that create test data through the
API. Markers for smoke and regression, pytest-xdist for parallel runs, traces and screenshots on failure, and an
HTML report in CI. Browser tests stay few, on the main journeys and their key failure paths; API and unit tests
take the rest."

**Follow-up.** "How do you avoid logging in in every test?" — "A session fixture logs in once, through the UI or the
login API, and saves storage_state; every test then gets a new context loaded from that file. On my demo that took a
test's start from about 0.9 seconds to 0.3. The file is a live session, so it is git-ignored, and with parallel
workers each worker gets its own user if the server keeps state per user."

## Q4. "How would you test what the UI does when the payment gateway fails?"

**Model answer.** "I would not wait for the gateway to fail. I intercept the call with page.route and fulfil it with
a 502, or abort it to simulate a dropped connection, then check the page shows the right message: on my demo,
'Payment failed. No money was taken. Try again.' and a separate network message for the abort. In the same
handler I can check the request the page sent, for example that the amount equals the cart total."

**Follow-up.** "Isn't mocking risky?" — "Yes, a mock is my belief about the API, and if the real API changes, mocked
tests stay green. So I keep a few end-to-end tests against the real backend or the provider's sandbox, and contract
tests on the API to keep the mocks honest. Mocks are for the page's behaviour in states I cannot otherwise
produce."`,
    mcqs: [
      mcq('An interviewer asks how you would wait for an element in Playwright. Which answer shows the best understanding?', [
        ['Actions auto-wait for actionability and expect retries until its timeout', true],
        ['A WebDriverWait with expected conditions, set up before each and every click', false],
        ['An implicit wait set to ten seconds once at the start of each test session', false],
        ['A short sleep after each navigation, so the page always has time to load', false],
      ], 'Playwright\'s actions wait for the element to be actionable and its web-first assertions poll, so explicit waits are rarely needed. WebDriverWait and implicit waits are Selenium mechanisms, and sleeps are the cause of slow, flaky suites rather than a waiting strategy.'),
      mcq('Asked "would you add retries for flaky tests?", which answer is strongest?', [
        ['Only with retried passes reported, while the cause is being fixed', true],
        ['Yes, three retries on every test, so that CI is green on most days', false],
        ['No, flaky tests should be deleted as soon as they fail more than once', false],
        ['Yes, but only for tests that were written by somebody else in the team', false],
      ], 'Retries are acceptable as a visible, temporary measure while someone fixes the cause; silent retries hide real races. Blanket retries mask bugs, deleting a test throws away coverage of a journey, and who wrote the test has nothing to do with it.'),
      mcq('An interviewer asks how you would test a UPI payment failure screen. Which answer is most practical?', [
        ['Mock the pay call with page.route to return a 502, and check the message', true],
        ['Use a real UPI account with too little balance so that the payment fails', false],
        ['Ask the developers to add a hidden button on the page that shows the error', false],
        ['Stop the payment service in the shared QA environment during the test run', false],
      ], 'Routing the request produces the failure on demand, for one test, without touching shared systems or real money. Real accounts and real money have no place in tests, a hidden test-only button tests something users never see, and stopping a shared service breaks everyone else\'s work.'),
    ],
  },

  /* ── MINI_PROJECT ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PLAYWRIGHT_MINI_PROJECT',
    notes: `## The brief

You have joined the QA team of a fictional Bengaluru e-commerce start-up three weeks before its Diwali sale. The shop
has no browser tests; releases are checked by hand, and the last sale-day release broke checkout for forty minutes.
Your job: a Playwright suite the team can run on every pull request, that covers the journeys that make money and
the failures that lose it, runs on two browser engines in parallel, and leaves a trace behind for every failure.

## The app under test

Run a demo e-commerce app locally. Two choices:

- **The lesson's SaleKart**, extended by you: login, search, a cart, a UPI checkout page that calls /api/pay, a
  "Today's deals" panel that loads slowly, and the API endpoints /api/login and /api/cart. Add an order confirmation
  page and a "remove from cart" button; real apps have both.
- **Your own small shop** in Flask or FastAPI with the same features. Building it teaches you what a test can and
  cannot see, but keep it small: the project is the test suite.

Either way the app must start from one command, and your conftest.py should start it for the test run (as SaleKart's
base_url fixture did), so a reviewer runs everything with one pytest command. Use synthetic data only: test users
on example.test, fictional products, fake UPI IDs such as asha@okbank. Never point a test at a real payment
provider.

## What to test

At least twenty tests, chosen by risk, not by page. A starting list:

- **Search:** one match, several matches, no match, case and spaces, and the result count.
- **Cart:** add one, add the same product twice (quantity and total), add two products, remove one, the badge count,
  the cart surviving a page reload, and the cart needing a login.
- **Login:** success, wrong password, empty fields, and being sent back to the page you came from.
- **Checkout with a mocked /api/pay:** success with the reference format checked by a regular expression; a 502
  ("No money was taken"); a dropped connection; an invalid UPI ID; and the request body the page sends (amount
  equals the cart total).
- **One unmocked end-to-end journey:** search, add, log in, pay against your app's real /api/pay, see the
  confirmation.
- **The slow deals panel:** shown when the service is slow, the empty state, and the error state (route.fetch and
  fulfill, as in "Network Mocking, Auth State and API Setup").

If you use the lesson's SaleKart unchanged, at least three real defects are waiting for you: the results page has no
search box, the deals panel shows "Loading deals..." forever when its API fails, and a shopper who goes to the
cart straight after Add to cart can lose the item. Find them with tests, report them, and mark those tests xfail
with the bug id and strict=True.

## How the suite must be built

- **Page objects** for every page and a component for the header; locators by role, label or test id; assertions
  only in tests.
- **No sleeps and no wait_for_timeout** anywhere; every check on the page through expect.
- **Login once per run** with storage_state saved by a session fixture (or through the login API), file
  git-ignored; one test file covers the login form itself.
- **Arrange through the API** wherever the step is not what the test is about.
- **Markers** smoke (five fast tests for every push) and regression (everything), registered in pytest.ini.
- **Configuration**: base URL from --base-url or the fixture, browser options on the command line, no hard-coded
  hosts in tests.

## Two browsers, in parallel

The target run:

    pytest --browser chromium --browser firefox -n 4 --tracing retain-on-failure --screenshot only-on-failure

--browser twice runs every test on both engines; -n 4 (pytest-xdist) spreads them over four workers, each with its
own app instance if your conftest starts one per worker. Install the browsers with playwright install chromium
firefox (on Linux CI, playwright install --with-deps chromium firefox).

If your laptop cannot download browsers, say so in the README, run locally with --browser-channel chrome, and run the
two-engine job in CI. A GitHub Actions job is enough; this outline follows the documented setup and was not run
for these notes:

    jobs:
      ui-tests:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-python@v5
            with: { python-version: "3.12" }
          - run: pip install -r requirements.txt
          - run: playwright install --with-deps chromium firefox
          - run: pytest -m regression --browser chromium --browser firefox -n 4 --tracing retain-on-failure
          - uses: actions/upload-artifact@v4
            if: failure()
            with: { name: test-results, path: test-results/ }

Report the browser coverage honestly: Chrome and Edge channels are both Chromium, and neither stands in for Firefox
or WebKit.

## Traces for every failure

Hand in the test-results folder from a run with failures (your xfail defects and one deliberately broken test are
enough), and for each failure write three lines in FAILURES.md: what failed, what the trace shows (the action, the
request, the snapshot), and the cause. Then hunt flakiness: run the whole suite ten times (a loop, or
pytest-repeat's --count), record pass and fail counts per test, and for any test that failed even once, find the
cause from its trace and fix it or quarantine it with an owner and a date.

## Milestones

1. **Day 1:** the app runs from one command; conftest starts it; three smoke tests pass on Chromium.
2. **Day 2:** page objects and the search and cart tests; no sleeps.
3. **Day 3:** login once per run, API arrangement, checkout tests with mocked payment states and one real journey.
4. **Day 4:** markers, two browsers, parallel run, traces; the ten-run flakiness report.
5. **Day 5:** defects raised, FAILURES.md, README, a final clean run.

## What to hand in

A repository with app/, pages/, tests/, conftest.py, pytest.ini, requirements.txt and .gitignore (with .auth/ and
test-results/); the CI workflow; README.md (how to run, what is covered and why, browser coverage actually achieved,
known gaps); DEFECTS.md (each defect with steps, expected, actual, evidence); FAILURES.md; the flakiness table; and
the test-results folder with traces and screenshots from the failing run.`,
    assignment: {
      title: 'Sale-Day Browser Suite: Playwright Tests for a Demo E-Commerce App',
      description: 'For a demo e-commerce app you run locally, build a Playwright and pytest suite with page objects that covers search, cart, login and UPI checkout, mocks the payment API for its failure states, logs in once per run, runs on Chromium and Firefox in parallel, and hands in a trace for every failure with a written diagnosis.',
      instructions: `1. Run a demo shop locally (the lesson's SaleKart extended with an order confirmation page and remove-from-cart, or your own small Flask or FastAPI shop) with synthetic data only; conftest.py must start it for the run.
2. Write page objects for every page and a Header component; use role, label or test-id locators; keep assertions in tests; no time.sleep or wait_for_timeout anywhere.
3. Write at least 20 tests across search, cart, login and checkout, chosen by risk, including the failure paths listed in the brief and one unmocked end-to-end journey.
4. Log in once per run with storage_state (git-ignored) or the login API; arrange carts through the API wherever the UI step is not the subject of the test.
5. Mock /api/pay with page.route for success (reference checked by regex), 502, a dropped connection and an invalid UPI ID, and assert the request body the page sends.
6. Register smoke and regression markers; run the suite with --browser chromium --browser firefox -n 4 --tracing retain-on-failure, locally or in a CI job you provide; state exactly which browsers were really run.
7. Report every defect you find in DEFECTS.md, mark its test xfail with the bug id and strict=True, and diagnose each failure in FAILURES.md from its trace.
8. Run the suite ten times, tabulate pass and fail counts per test, and fix or honestly quarantine any test that failed even once.
9. Write the README: setup in under 10 minutes, how to run smoke and regression, coverage and its gaps, and browser coverage achieved.`,
      rubric: [
        { criterion: 'Test design and coverage', description: 'At least 20 tests chosen by risk across search, cart, login and checkout, including failure paths, empty and error states, and one real end-to-end journey; each test checks one behaviour a user would notice.', maxPoints: 20 },
        { criterion: 'Locators, waiting and assertions', description: 'Role, label and test-id locators scoped sensibly; no sleeps or fixed waits; every page check through expect, with absence checks only after a positive outcome; regular expressions for variable text.', maxPoints: 20 },
        { criterion: 'Structure: page objects, fixtures and configuration', description: 'Page objects and a shared component with product-language methods and no assertions; fixtures in conftest; base URL and browsers from configuration; markers registered; login once per run with the state file git-ignored.', maxPoints: 20 },
        { criterion: 'Network control and test data', description: 'page.route used for success, 502, dropped connection and invalid input, with the request body asserted; data arranged through the API; synthetic data only; no real payment provider touched.', maxPoints: 15 },
        { criterion: 'Cross-browser, parallel run and CI', description: 'Suite runs on Chromium and Firefox with pytest-xdist, locally or in a working CI job that uploads test-results; browser coverage reported honestly.', maxPoints: 10 },
        { criterion: 'Failure evidence, defects and flakiness', description: 'A trace and screenshot for every failure with a correct three-line diagnosis; defects written so a developer can act on them; a ten-run flakiness table with causes found and fixed or quarantined with an owner.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    mcqs: [
      mcq('The brief asks for Chromium and Firefox, but your laptop cannot download Firefox for Playwright. What should the hand-in say and do?', [
        ['Run Chrome locally, run both engines in CI, and state which ran where', true],
        ['Run with Chrome and Edge channels and report that as two browser engines', false],
        ['Skip Firefox and leave browser coverage out of the README so it is not marked', false],
        ['Copy the Chromium results into a Firefox column, since the engines match', false],
      ], 'Honest coverage means running what you can, running the rest where browsers can be installed, and saying which is which. Chrome and Edge are both Chromium, so they are one engine; leaving it out of the README hides a gap, and the engines are different, so copied results are false.'),
      mcq('Your suite finds that SaleKart\'s results page has no search box. What should happen to the test?', [
        ['Raise the defect, then mark the test xfail with the bug id and strict=True', true],
        ['Delete the test, because a test that fails on the current build is broken', false],
        ['Change the expectation to match the page, so the suite stays green today', false],
        ['Leave it failing with no note, so the build stays red until someone asks', false],
      ], 'A known defect is recorded, and the test documents it and turns red the day the fix lands, reminding you to remove the marker. Deleting it loses the check, rewriting it to match the bug makes the test assert the defect, and an unexplained red build trains people to ignore red builds.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PLAYWRIGHT_CHECKPOINT',
    notes: `Ten questions across the topic: the pytest-playwright setup, locators, auto-waiting and web-first assertions, page
objects, login state and network mocking, and debugging failures and flaky tests from traces. Answer without notes;
the result shows which lesson to revisit.`,
    checkpoint: [
      mcq('Why can every pytest-playwright test have its own login and cart without paying the cost of starting a browser each time?', [
        ['Each test gets a new BrowserContext inside one browser per worker', true],
        ['The page fixture clears cookies and storage after every single test', false],
        ['Each test runs in a new headless browser process started in parallel', false],
        ['The plugin restores a browser snapshot taken before the first test ran', false],
      ], 'A context is an isolated profile that is cheap to create, so isolation per test costs milliseconds while the browser is shared. The page is new rather than cleaned, browsers are not started per test, and no snapshot is restored.'),
      mcq('Which SaleKart locator keeps working after a banner is added above the search form?', [
        ['page.get_by_role("button", name="Search")', true],
        ['page.locator("xpath=/html/body/div[1]/form/button")', false],
        ['page.locator("body > div:nth-child(2) > form > button")', false],
        ['page.locator("button").nth(0)', false],
      ], 'A role and accessible name describe the button the way a user does, so layout changes do not affect it; it passed with the banner while the absolute XPath timed out. The nth-child path and nth(0) depend on position, which the banner changed.'),
      mcq('Clicking the only Add to cart button for a product succeeds, but get_by_role("button", name="Add to cart").click() fails on a page with two products. What should the test do?', [
        ['Scope to the product card by its heading, then click the button in it', true],
        ['Use .first, since the first product in the list is always the intended one', false],
        ['Use a CSS selector that ignores strict mode for buttons on result pages', false],
        ['Add a wait so that only one of the two buttons is visible at the time', false],
      ], 'Strict mode found two matches; naming the card makes the test click the intended product and fail if it is missing. .first silently depends on order, strict mode applies to CSS locators too, and waiting does not make one of two visible buttons disappear.'),
      mcq('Why does assert page.get_by_test_id("cart-count").inner_text() == "1" fail straight after clicking Add to cart, when expect(...).to_have_text("1") passes?', [
        ['inner_text reads once, before the cart call has answered', true],
        ['inner_text returns the text with the badge\'s HTML tags', false],
        ['The test id locator only works inside expect assertions', false],
        ['to_have_text compares numbers, inner_text compares text', false],
      ], 'The click returns before the server responds, and inner_text reads the badge at that instant (\'0\' in every one of 10 runs); expect keeps polling until it shows 1. inner_text returns visible text without tags, test-id locators work everywhere, and both compare strings.'),
      mcq('A payment status reads "Payment successful. Ref UPI-4F2A9C", with a new reference each run. Which assertion checks it properly?', [
        ['to_have_text with a regular expression for the reference format', true],
        ['to_have_text("Payment successful. Ref UPI-4F2A9C") copied in', false],
        ['to_contain_text("Ref"), since any reference proves the success', false],
        ['to_be_visible() on the status, since the text is not important', false],
      ], 'A regex such as Ref UPI-[0-9A-F]{6} checks the message and the shape of the reference without its random value. Copying today\'s reference fails tomorrow, "Ref" alone would accept a malformed reference, and visibility says nothing about whether the status reports success.'),
      mcq('Where should the expectation "the cart total is Rs 2198" live in a page-object suite?', [
        ['In the test, using the cart page\'s total locator', true],
        ['In CartPage.open(), which checks it after loading', false],
        ['In the Header component, beside the cart badge', false],
        ['In conftest.py, as a fixture all tests receive', false],
      ], 'Page objects provide locators and actions; tests own expectations, so each test can expect its own total and readers see what is checked. An assertion in open() breaks every other use of the page, the header does not show the total, and a shared fixture value hides the expectation.'),
      mcq('A suite logs in once per run and saves storage_state. Which of these is a real risk of that approach to manage?', [
        ['Parallel tests sharing one user can collide on server-side state', true],
        ['The saved state makes every test slower than a login through the form', false],
        ['Contexts created from saved state cannot use page.route for mocking', false],
        ['storage_state files cannot hold HttpOnly cookies, so logins are lost', false],
      ], 'If the server keeps a cart per user, parallel tests as one user interfere, so give each worker its own user. Saved state was faster (0.31 s against 0.93 s), routing works in any context, and the saved file did hold the HttpOnly session cookie.'),
      mcq('A test for the "no deals" state registers its route for /api/deals after page.goto("/") and sees real deals. What is the fix?', [
        ['Register the route before the navigation that triggers the request', true],
        ['Change the route glob from "**/api/deals" to the full deals URL', false],
        ['Use route.continue_() instead of route.fulfill() in the handler', false],
        ['Add expect_response for /api/deals around the route registration', false],
      ], 'The page requested deals while loading, before the route existed, so the route must come first. The glob already matched, continue_ would send the request to the real server anyway, and expect_response waits for a response rather than intercepting one.'),
      mcq('A flaky test\'s trace shows POST /api/cart with no response and the next navigation starting before it could finish. Which fix addresses the cause?', [
        ['Wrap the click in expect_response for /api/cart and check that it is ok', true],
        ['Increase the fixed wait after the click from 400 to 1000 milliseconds', false],
        ['Rerun the test automatically up to three times when the count is wrong', false],
        ['Raise the to_have_count timeout on the cart page from 2 to 10 seconds', false],
      ], 'The navigation cancelled the in-flight cart call, so the test must wait for that response; it then passed 10 out of 10. A longer fixed wait is still a guess, reruns hide the race, and a longer timeout on the cart page cannot bring back an item that was never saved.'),
      mcq('An expect on the cart total fails with the same value on all nine polls and in every run. How should it be classified and handled?', [
        ['As a deterministic failure: check the requirement, then fix the test or raise a bug', true],
        ['As a flaky test: add it to quarantine and rerun it nightly until it starts to pass', false],
        ['As a timing problem: raise the expect timeout until the value finally changes', false],
        ['As an environment issue: rerun it on a faster CI machine before looking further', false],
      ], 'A stable wrong value is not flaky or slow; it is a real difference between the page and the expectation, so compare both with the requirement. Quarantine is for intermittent failures, a longer timeout sees the same value, and machine speed does not change a settled value.'),
    ],
  },
];
