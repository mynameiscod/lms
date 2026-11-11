import { SeedBook } from '../types';

const book: SeedBook = {
  slug: 'track-qa-sdet',
  title: 'QA / SDET (Test Automation) Interview Questions',
  kind: 'topic',
  subject: 'QA / SDET (Test Automation)',
  description: 'The 40 questions QA and SDET freshers face: testing fundamentals, test design and APIs, pytest and Selenium, Playwright, API and performance testing, CI quality gates and real scenarios.',
  color: '#15803d',
  emblem: '🧪',
  audience: 'careerpilot',
  stages: ['specialize', 'placement'],
  tracks: ['QA_SDET'],
  order: 213,
  chapters: [
    {
      title: 'Testing Fundamentals',
      questions: [
        {
          q: `What is the difference between verification and validation? How are QA, QC and testing different?`,
          a: `- **Verification** asks "are we building the product **right**?" It checks documents, designs and code against specifications, usually **without running** the software: reviews, walkthroughs, inspections, static analysis.
- **Validation** asks "are we building the **right** product?" It checks that the working software meets the user's real needs, **by running** it: functional testing, system testing, user acceptance testing.

**QA vs QC vs testing**
- **Quality Assurance (QA)** is process-focused and preventive: defining standards, review processes, test strategy and CI checks so defects are less likely to be introduced.
- **Quality Control (QC)** is product-focused and detective: examining the product to find defects.
- **Testing** is the main QC activity: executing the software to find bugs and give information about quality.

Example: a team agreeing that every pull request needs a review and passing automated tests is QA; running the regression suite on the release build is QC through testing.`,
          d: 'easy',
          at: 'TCS, Infosys, Wipro, Cognizant',
          tip: `One-line memory aid: verification = right product build, validation = right product. Then give an example of each.`,
        },
        {
          q: `Explain the levels of testing: unit, integration, system and acceptance.`,
          a: `| Level | What is tested | Who usually does it | Example |
|---|---|---|---|
| **Unit** | One function, method or class in isolation | Developers (SDETs help) | \`calculate_gst(1000)\` returns 180 |
| **Integration** | How modules or services work together | Developers, SDETs | Order service correctly calls the payment service and saves the result |
| **System** | The complete application end to end, against requirements | QA team | Browse, add to cart, pay and receive confirmation email |
| **Acceptance (UAT)** | Whether it meets business needs and is ready to release | Client, business users, product owner | A store manager confirms the refund flow matches policy |

Notes worth adding:
- Integration testing can be **big bang** (all at once) or **incremental** (top-down with stubs, bottom-up with drivers).
- Acceptance has variants: **alpha** (at the developer's site) and **beta** (real users in the real environment).
- In the **test pyramid**, you want many fast unit tests, fewer integration tests and only a small number of slow end-to-end UI tests.`,
          d: 'easy',
          at: 'Service companies, product companies',
          tip: `Give a tiny example for each level from the same app; it shows you understand the scope difference.`,
        },
        {
          q: `What is the difference between smoke testing and sanity testing?`,
          a: `| | Smoke testing | Sanity testing |
|---|---|---|
| Question | "Is this build stable enough to test at all?" | "Does this specific fix or change work?" |
| When | On every new build, before detailed testing | After a bug fix or small change, on a fairly stable build |
| Scope | Broad and shallow: the critical paths | Narrow and deep: the changed area and close neighbours |
| Documented | Usually scripted, often automated | Often unscripted, quick |
| If it fails | Build is rejected back to developers | The fix is rejected |

Example for an e-commerce app:
- **Smoke**: the app opens, login works, search returns products, cart and checkout pages load. If login is broken, there is no point running 500 test cases.
- **Sanity**: developers fixed "coupon code not applied for amounts over 10,000". You check that coupon on several amounts and confirm the cart total and checkout still look right.

Smoke testing is sometimes called **build verification testing (BVT)**, and it is usually the first job in a CI pipeline after deployment.`,
          d: 'easy',
          at: 'TCS, Infosys, Accenture, Capgemini',
          tip: `Use the same app for both examples; the contrast in scope becomes obvious.`,
        },
        {
          q: `What is the difference between regression testing and retesting?`,
          a: `- **Retesting** (confirmation testing): running the **failed test cases again** after a bug is fixed, to confirm **that bug** is really gone. It targets known defects, uses the same steps and data, and cannot be planned before the fix exists.
- **Regression testing**: running **previously passing tests** after any change (fix, new feature, configuration, upgrade) to make sure **nothing else broke**. It covers areas that were working.

| | Retesting | Regression |
|---|---|---|
| Purpose | Confirm a fix | Catch side effects |
| Test cases | The ones that failed | The ones that passed |
| Automation | Usually manual | Best candidate for automation |
| Priority | Done first | After retesting |

Example: bug "Forgot password email not sent" is fixed. Retesting = request a reset and confirm the email arrives. Regression = also run login, sign-up, profile update and other email notifications, because the developer changed the shared email service.

Since regression runs on every release, it is the main reason teams build automation suites.`,
          d: 'easy',
          at: 'Service companies, product companies',
          tip: `Link regression to automation; for an SDET role that is the point that matters.`,
        },
        {
          q: `Explain the Software Testing Life Cycle (STLC) with entry and exit criteria.`,
          a: `1. **Requirement analysis**: study requirements, ask questions, identify what is testable, build a requirement traceability matrix (RTM). *Entry*: requirements available. *Exit*: clarified requirements, RTM.
2. **Test planning**: scope, approach, tools, environments, effort, schedule, risks, roles. *Exit*: approved test plan.
3. **Test case design**: write test cases and scripts, prepare test data, review them. *Exit*: reviewed test cases and data.
4. **Test environment setup**: servers, builds, accounts, test data loaded; run a smoke test. *Exit*: environment ready and smoke test passed.
5. **Test execution**: run tests, log defects, retest fixes, run regression. *Exit*: planned tests executed, defects logged and tracked.
6. **Test closure**: test summary report, metrics (pass rate, defect density, open bugs by severity), lessons learned. *Exit*: sign-off.

**Entry criteria** are conditions that must be true before a phase starts; **exit criteria** decide when it is done. Example exit criteria for execution: "100% of critical tests run, 95% pass, no open critical or high-severity defects".

In Agile, the same activities happen inside every sprint instead of as long phases.`,
          d: 'medium',
          at: 'Service companies, product companies',
          tip: `Give one concrete exit criterion with numbers; interviewers often ask "when do you stop testing?"`,
        },
        {
          q: `Explain the bug (defect) life cycle.`,
          a: `The usual states in tools like Jira:

1. **New**: the tester logs the bug with steps, expected and actual results, evidence.
2. **Assigned**: the lead or manager assigns it to a developer.
3. **Open / In progress**: the developer analyses and fixes it.
4. **Fixed / Resolved**: the fix is done and deployed to the test environment.
5. **Retest / Ready for QA**: the tester verifies the fix.
6. **Closed**: the fix works and no side effects are found.
7. **Reopened**: the bug still occurs; it goes back to the developer.

Other outcomes a developer or triage meeting may set:
- **Rejected / Not a bug**: works as designed.
- **Duplicate**: already reported.
- **Deferred**: real but postponed to a later release, usually low priority.
- **Cannot reproduce**: the developer could not see it; the tester adds details (environment, data, video, logs).

\`\`\`text
New → Assigned → Open → Fixed → Retest → Closed
                                   ↓
                               Reopened → Open
\`\`\``,
          d: 'medium',
          at: 'TCS, Infosys, Wipro, Cognizant',
          tip: `Mention what you do when a bug is marked "cannot reproduce": add logs, data, environment and a screen recording.`,
        },
        {
          q: `What is the difference between severity and priority? Give an example of each combination.`,
          a: `- **Severity**: how much the defect hurts the **system's functionality**. Set by the tester.
- **Priority**: how **urgently** it should be fixed, based on business impact and the release plan. Set by the product owner or lead.

| Combination | Example (banking app) |
|---|---|
| High severity, high priority | Fund transfer fails for all users |
| High severity, low priority | App crashes when exporting a statement older than 10 years, a feature almost nobody uses |
| Low severity, high priority | Bank's name or logo is misspelt on the login page; it does not break anything but embarrasses the brand |
| Low severity, low priority | Slight misalignment of a label on the "About us" page |

Typical scales: severity = Critical / Major / Minor / Trivial (or Blocker), priority = P1 to P4 or High / Medium / Low.

The two usually move together, but the mixed cases are the point of the question: priority depends on **who sees it and when**, not only on technical damage.`,
          d: 'medium',
          at: 'Service companies, product companies',
          tip: `Always have the two mixed examples ready; "low severity, high priority" is the one they ask for.`,
        },
        {
          q: `You have two days to test a release that would normally take two weeks. How do you decide what to test?`,
          a: `Use **risk-based testing**: test the areas where failure is most likely and most costly, first.

1. **List features and score risk** = likelihood × impact.
   - Likelihood: new or changed code, complex logic, areas with past bugs, many integrations.
   - Impact: money (payments, refunds), security (login, permissions), legal or compliance, number of users affected.
2. **Prioritise**:
   - P1: critical user journeys (sign-up, login, search, checkout, payment) plus everything changed in this release.
   - P2: features that share code with the changes (impact analysis with developers helps).
   - P3: stable, low-use areas, only if time remains.
3. **Use what is fast**: run the automated regression and API suites in parallel on day one while you test the changed areas manually and with exploratory sessions.
4. **Communicate**: tell stakeholders what was tested, what was **not** tested and the remaining risk, so the release decision is made with open eyes. Do not quietly skip tests.
5. **After release**: monitor errors and logs closely, and plan the skipped testing in the next cycle.`,
          d: 'hard',
          at: 'Product companies',
          tip: `The phrase "I will report what was not tested" shows maturity; testers own information, not the release decision.`,
        },
      ],
    },
    {
      title: 'Test Design, Test Data and Debugging',
      questions: [
        {
          q: `What are black-box, white-box and grey-box testing?`,
          a: `- **Black-box testing**: you test through inputs and outputs without seeing the code. Based on requirements. Techniques: equivalence partitioning, boundary value analysis, decision tables, state transition, use cases. Most functional and UI testing is black box.
- **White-box testing**: you test with knowledge of the internal code and structure. Techniques: statement, branch and path coverage, testing loops and conditions. Usually done by developers and SDETs in unit tests.
- **Grey-box testing**: partial knowledge of internals. For example, while testing the UI you also check the database table, read API responses in browser DevTools or look at logs to confirm the right thing happened behind the screen.

Example: testing a "transfer money" feature.
- Black box: transfer 500 from the UI and check both balances on screen.
- Grey box: also query the \`transactions\` table and confirm one debit and one credit row with the same reference.
- White box: unit tests covering every branch of \`transfer()\`, including insufficient balance and daily limit.

An SDET works across all three.`,
          d: 'easy',
          at: 'Service companies, product companies',
          tip: `Give one sentence of grey-box from your own project (checking the DB or network tab); it is very relatable.`,
        },
        {
          q: `Explain equivalence partitioning with an example.`,
          a: `**Equivalence partitioning (EP)** divides inputs into groups (partitions) that the system should treat the same way. Testing one value from each partition is enough, because if one value works, the others in that group should too. It cuts the number of tests without losing coverage.

Example: an insurance form accepts **age 18 to 60**.

| Partition | Range | Valid? | Test value |
|---|---|---|---|
| Below range | ≤ 17 | Invalid | 10 |
| In range | 18–60 | Valid | 35 |
| Above range | ≥ 61 | Invalid | 75 |
| Non-numeric | letters, symbols | Invalid | "abc" |
| Empty | blank | Invalid | "" |

So five tests cover the field instead of trying every age.

Rules of thumb:
- Make partitions for **invalid** inputs too: wrong type, empty, too long.
- Test invalid partitions **one at a time**; if two invalid values are in one test, an error message may hide the second problem.
- EP is almost always combined with **boundary value analysis**, because bugs cluster at the edges of partitions.`,
          d: 'easy',
          at: 'Service companies',
          tip: `Always add the non-numeric and empty partitions; most candidates stop at below, inside and above.`,
        },
        {
          q: `Which HTTP methods and status codes must a tester know?`,
          a: `**Methods**

| Method | Use | Idempotent? |
|---|---|---|
| GET | Read data | Yes |
| POST | Create a resource or trigger an action | No |
| PUT | Replace a resource completely | Yes |
| PATCH | Update part of a resource | Not guaranteed |
| DELETE | Remove a resource | Yes |

**Idempotent** means repeating the same request has the same effect as sending it once, a good thing to test (for example, retrying a payment must not charge twice).

**Status codes**
- **2xx success**: 200 OK, 201 Created (after POST), 204 No Content (after DELETE).
- **3xx redirection**: 301 Moved Permanently, 302 Found, 304 Not Modified.
- **4xx client error**: 400 Bad Request (invalid input), 401 Unauthorized (not logged in or bad token), 403 Forbidden (logged in but not allowed), 404 Not Found, 409 Conflict (duplicate), 422 Unprocessable Content (validation failed), 429 Too Many Requests.
- **5xx server error**: 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout.

A **5xx on bad input is a bug**: invalid data should get a 4xx with a clear message.`,
          d: 'easy',
          at: 'Product companies, service companies',
          tip: `Know 401 vs 403 precisely; it is the most common follow-up.`,
        },
        {
          q: `Explain boundary value analysis and automate the tests with pytest.`,
          a: `**Boundary value analysis (BVA)** tests the edges of each valid range, because off-by-one mistakes (\`>\` instead of \`>=\`) cause many bugs. For a range **min to max**, test min−1, min, min+1, max−1, max, max+1 (the three-value version); the two-value version uses min−1, min, max, max+1.

Example: a password must be **8 to 16 characters**. Boundary lengths: 7, 8, 9, 15, 16, 17.

\`\`\`python
import pytest

def is_valid_password_length(pwd: str) -> bool:
    return 8 <= len(pwd) <= 16

@pytest.mark.parametrize(
    "length, expected",
    [(7, False), (8, True), (9, True), (15, True), (16, True), (17, False)],
)
def test_password_length_boundaries(length, expected):
    assert is_valid_password_length("a" * length) is expected
\`\`\`

\`parametrize\` turns one test function into six separate test cases, each reported on its own, so a failure shows exactly which boundary broke.

Combine with equivalence partitioning: EP picks one value from the middle of each group, BVA adds the edges.`,
          d: 'medium',
          at: 'Service companies, product companies',
          tip: `Write the six numbers before the code; it proves you understand the technique, not just the syntax.`,
        },
        {
          q: `What is decision table testing? Build one for a discount rule.`,
          a: `A **decision table** lists every combination of conditions and the expected action for each. It is used when business rules combine several conditions, where it is easy to miss a case.

Rule: "**Members** get 10% off. Orders **above ₹2,000** get free delivery. Members with orders above ₹2,000 also get a **₹100 voucher**."

| | R1 | R2 | R3 | R4 |
|---|---|---|---|---|
| Is member? | Y | Y | N | N |
| Order > ₹2,000? | Y | N | Y | N |
| 10% off | ✓ | ✓ | – | – |
| Free delivery | ✓ | – | ✓ | – |
| ₹100 voucher | ✓ | – | – | – |

With **n** yes/no conditions there are **2^n** rules (here 2^2 = 4). Each rule becomes at least one test case; add boundary values too (an order of exactly ₹2,000 falls in "No" here).

Benefits: complete coverage of combinations, and the table often reveals **gaps in the requirement itself** (what if a member uses a coupon too?), which you raise before coding starts.`,
          d: 'medium',
          at: 'Product companies',
          tip: `Mention that the table exposes missing requirements; that is the business value interviewers like.`,
        },
        {
          q: `How do you create and manage test data for automated tests?`,
          a: `Good test data is **independent, repeatable and safe**.

- **Create data per test**: each test sets up what it needs (often through the API, which is faster than the UI) and cleans up afterwards. Tests that share accounts break each other when run in parallel.
- **Unique values**: add a timestamp or UUID to emails and usernames so reruns do not hit "already exists".
- **Fake but realistic data**: libraries like **Faker** generate names, addresses and phone numbers.
- **Never copy real customer data** into test environments. If production-like data is needed, use masked or anonymised copies.
- **Keep data out of code**: JSON, CSV or YAML files, or factory functions, and config per environment.
- **Edge-case data**: long names, Unicode (Tamil, Hindi text), emoji, apostrophes like O'Brien, zero and negative amounts.

\`\`\`python
import uuid
import pytest
from faker import Faker

fake = Faker("en_IN")

@pytest.fixture
def new_user(api):
    payload = {"name": fake.name(), "email": f"qa_{uuid.uuid4().hex[:8]}@test.example"}
    user = api.post("/users", json=payload).json()
    yield user
    api.delete(f"/users/{user['id']}")
\`\`\``,
          d: 'medium',
          at: 'Product companies',
          tip: `"Create through the API, test through the UI" is a strong phrase for SDET interviews.`,
        },
        {
          q: `How do you write a good bug report, and how do you gather evidence when debugging an issue in a web app?`,
          a: `**A good bug report** lets a developer reproduce the issue without asking you anything:
- **Title**: short and specific: "Checkout: coupon SAVE10 not applied when cart total > ₹10,000".
- **Environment**: build or version, URL, browser and version, device, OS, test account.
- **Steps to reproduce**: numbered and minimal.
- **Expected vs actual result**.
- **Evidence**: screenshot or screen recording, console errors, the failing network request and response, log lines, request ID.
- **Severity and priority**, and how often it happens (always or 3 in 10).

**Gathering evidence with browser DevTools**
- **Network tab**: find the failing request; note the status code, request payload and response body. A 500 points to the backend; a 200 with wrong data may be a backend logic bug; a correct response with a wrong screen is a frontend bug.
- **Console tab**: JavaScript errors and stack traces.
- **Application tab**: cookies, local storage, tokens.
- **Server logs** (Kibana, CloudWatch) searched by request ID or time.

Narrowing down which layer is at fault before reporting saves the team hours.`,
          d: 'medium',
          at: 'Service companies, product companies',
          tip: `Saying "I check the network tab to see if it is frontend or backend" is exactly what SDET interviewers want.`,
        },
        {
          q: `Explain state transition testing with an example. How is it different from pairwise testing?`,
          a: `**State transition testing** is used when the system's behaviour depends on its **current state** and past events. You model states, events and transitions, then test valid transitions **and** invalid ones.

Example: an ATM PIN entry. The card is blocked after **3 wrong attempts**.

| Current state | Event | Next state |
|---|---|---|
| Attempt 1 | Correct PIN | Access granted |
| Attempt 1 | Wrong PIN | Attempt 2 |
| Attempt 2 | Wrong PIN | Attempt 3 |
| Attempt 3 | Wrong PIN | Card blocked |
| Attempt 2 / 3 | Correct PIN | Access granted, counter reset |
| Card blocked | Correct PIN | Still blocked (invalid transition) |

Tests should cover every transition at least once, plus **invalid** events such as entering the correct PIN on a blocked card. Order statuses are another classic example.

**Pairwise (all-pairs) testing** solves a different problem: too many **combinations of independent inputs**. Instead of testing every combination of, say, 3 browsers × 3 OS × 4 languages (36), it picks a smaller set where **every pair of values appears at least once** (about 12 cases here), because most bugs are caused by one value or an interaction between two. Tools like PICT generate the set.`,
          d: 'hard',
          at: 'Product companies',
          tip: `State transition = behaviour over time; pairwise = combinations of settings. Say that contrast in one line.`,
        },
      ],
    },
    {
      title: 'Automation with pytest and Selenium',
      questions: [
        {
          q: `Which test cases should you automate, and which should stay manual?`,
          a: `**Good candidates for automation**
- **Regression tests** that run every release.
- **Smoke tests** run on every build.
- Data-driven tests: the same flow with many inputs (BVA and EP values).
- API tests: fast, stable and cheap to maintain.
- Tests needed on many browsers or devices.
- Setup tasks: creating test data and users.

**Keep manual (or do not automate yet)**
- **Exploratory testing** and usability: does it feel right, is it confusing?
- Features that change every sprint; the scripts would break constantly.
- One-time tests.
- Visual and design judgement (though visual comparison tools help).
- Things that are very hard to automate reliably, such as CAPTCHA or real OTP SMS (use test hooks or test numbers instead).

**Return on investment**: automation costs time to build and maintain, and pays back when a test runs many times. A stable, high-value, frequently run test is the best first choice.

Also follow the **test pyramid**: push checks down to unit and API level where possible and keep UI end-to-end tests for the critical journeys only.`,
          d: 'easy',
          at: 'Service companies, product companies',
          tip: `Mention the test pyramid; interviewers want an SDET who avoids automating everything through the UI.`,
        },
        {
          q: `What is pytest? How does it find tests, and why is it preferred over unittest?`,
          a: `**pytest** is the most widely used Python test framework. It is the base for UI (Selenium, Playwright) and API automation suites.

How it discovers tests (by default):
- Files named \`test_*.py\` or \`*_test.py\`
- Functions named \`test_*\`
- Methods named \`test_*\` inside classes named \`Test*\` (no \`__init__\`)

\`\`\`python
# test_cart.py
def add_item(cart, item, qty):
    cart[item] = cart.get(item, 0) + qty
    return cart

def test_add_new_item():
    assert add_item({}, "pen", 2) == {"pen": 2}

def test_add_existing_item():
    assert add_item({"pen": 1}, "pen", 2)["pen"] == 3
\`\`\`

\`\`\`bash
pytest -v                     # verbose
pytest test_cart.py::test_add_new_item   # one test
pytest -x                     # stop at first failure
\`\`\`

Why teams choose it over \`unittest\`:
- Plain \`assert\` with clear failure messages (pytest shows the values).
- Powerful **fixtures** for setup and teardown.
- **parametrize** for data-driven tests.
- **Markers** to group and select tests.
- Large plugin ecosystem: pytest-html, pytest-xdist (parallel), pytest-playwright, pytest-rerunfailures.
- It can also run existing \`unittest\` tests.`,
          d: 'easy',
          at: 'Product companies',
          tip: `Name two plugins you have used; it proves real usage.`,
        },
        {
          q: `Explain the Selenium WebDriver architecture and the locator strategies.`,
          a: `**Architecture (Selenium 4)**
1. Your test script uses a **client library** (Java, Python, C#, JavaScript).
2. It sends commands using the **W3C WebDriver protocol** (HTTP and JSON).
3. A **browser driver** (chromedriver, geckodriver, msedgedriver) receives them and controls the browser.
4. The browser performs the action and the result goes back.

Since Selenium 4.6, **Selenium Manager** downloads the right driver automatically. **Selenium Grid** runs tests on many machines and browsers in parallel.

**Locators**, in a sensible order of preference:
1. **ID**: fastest and unique, if stable.
2. **Name**
3. **CSS selector**: flexible and fast, for example \`button[data-testid='login']\`.
4. **XPath**: can move up the DOM and match text, such as \`//button[text()='Login']\`; avoid long absolute paths.
5. Link text, partial link text, class name, tag name.

\`\`\`java
WebElement email = driver.findElement(By.id("email"));
driver.findElement(By.cssSelector("[data-testid='login-btn']")).click();
\`\`\`

Ask developers to add \`data-testid\` attributes: they do not change when styling changes, which keeps tests stable.`,
          d: 'easy',
          at: 'TCS, Infosys, Cognizant, Capgemini',
          tip: `Say why absolute XPath is bad (breaks on any layout change); it is a standard follow-up.`,
        },
        {
          q: `What are pytest fixtures? Explain scopes, yield teardown and conftest.py.`,
          a: `A **fixture** is a function that prepares something a test needs (a browser, an API client, a logged-in user, test data) and cleans it up after. Tests ask for a fixture by naming it as a parameter.

\`\`\`python
# conftest.py — fixtures here are available to all tests in this folder and below
import pytest
from selenium import webdriver

@pytest.fixture(scope="session")
def base_url():
    return "https://staging.shop.example"

@pytest.fixture
def driver():
    drv = webdriver.Chrome()
    drv.implicitly_wait(0)
    yield drv          # the test runs here
    drv.quit()         # teardown runs even if the test fails

# test_home.py
def test_title(driver, base_url):
    driver.get(base_url)
    assert "Shop" in driver.title
\`\`\`

**Scopes** decide how often a fixture is created:
- \`function\` (default): fresh for every test, safest.
- \`class\`, \`module\`: shared within a class or file.
- \`session\`: once for the whole run, for expensive things like config or an auth token.

Code after \`yield\` is the teardown. **conftest.py** holds shared fixtures and hooks without imports. Fixtures can use other fixtures, and \`autouse=True\` applies one to every test automatically.`,
          d: 'medium',
          at: 'Product companies',
          tip: `Explain why a browser fixture is usually function-scoped: tests stay independent.`,
        },
        {
          q: `How do you use markers and parametrize in pytest to organise and select tests?`,
          a: `**Markers** tag tests so you can choose which ones to run.

\`\`\`python
import pytest

@pytest.mark.smoke
def test_login_page_loads(driver): ...

@pytest.mark.skip(reason="Feature disabled until next sprint")
def test_wallet_topup(): ...

@pytest.mark.xfail(reason="Known bug JIRA-1423")
def test_coupon_on_sale_items(): ...

@pytest.mark.parametrize("email, error", [
    ("", "Email is required"),
    ("ravi@", "Enter a valid email"),
    ("a" * 250 + "@x.com", "Email is too long"),
], ids=["empty", "no-domain", "too-long"])
def test_signup_email_errors(email, error, signup_page):
    signup_page.submit(email=email)
    assert signup_page.error_text() == error
\`\`\`

Register custom markers in \`pytest.ini\` so typos are caught:

\`\`\`ini
[pytest]
markers =
    smoke: quick checks run on every deploy
    regression: full suite
\`\`\`

Running subsets:

\`\`\`bash
pytest -m smoke                 # only smoke tests
pytest -m "regression and not slow"
pytest -k "login"               # names containing "login"
\`\`\`

\`skip\` never runs the test; \`xfail\` runs it and expects failure (reported as XPASS if it unexpectedly passes).`,
          d: 'medium',
          at: 'Product companies',
          tip: `Using \`ids=\` for readable test names is a small touch that impresses reviewers.`,
        },
        {
          q: `What are implicit, explicit and fluent waits in Selenium? Which should you use?`,
          a: `Web pages load parts at different times, so tests must wait for elements.

- **Implicit wait**: one global setting; every \`find_element\` keeps retrying up to N seconds. Simple, but it applies everywhere, only waits for presence (not visibility or clickability) and mixing it with explicit waits can cause unpredictable delays.
- **Explicit wait**: wait for a **specific condition** on a specific element. This is the recommended approach.
- **Fluent wait**: an explicit wait with a custom polling interval and exceptions to ignore.

\`\`\`python
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

wait = WebDriverWait(driver, timeout=10, poll_frequency=0.5)
button = wait.until(EC.element_to_be_clickable((By.ID, "pay-now")))
button.click()
wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".order-success")))
\`\`\`

\`\`\`java
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
wait.until(ExpectedConditions.elementToBeClickable(By.id("pay-now"))).click();
\`\`\`

**Never use \`time.sleep()\` / \`Thread.sleep()\`** as a fix: it is either too short (flaky) or too long (slow suite).`,
          d: 'medium',
          at: 'Service companies, product companies',
          tip: `Say "explicit waits, no sleeps, don't mix with implicit waits" and you have covered the follow-ups.`,
        },
        {
          q: `What is the Page Object Model? Show a simple example in Python.`,
          a: `**Page Object Model (POM)** puts each page's locators and actions in its own class. Tests then call readable methods instead of raw Selenium code. When the UI changes, you fix one page class, not fifty tests.

\`\`\`python
# pages/login_page.py
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class LoginPage:
    EMAIL = (By.ID, "email")
    PASSWORD = (By.ID, "password")
    SUBMIT = (By.CSS_SELECTOR, "[data-testid='login-btn']")
    ERROR = (By.CSS_SELECTOR, ".error-message")

    def __init__(self, driver, base_url):
        self.driver, self.base_url = driver, base_url
        self.wait = WebDriverWait(driver, 10)

    def open(self):
        self.driver.get(f"{self.base_url}/login")
        return self

    def login(self, email, password):
        self.driver.find_element(*self.EMAIL).send_keys(email)
        self.driver.find_element(*self.PASSWORD).send_keys(password)
        self.driver.find_element(*self.SUBMIT).click()

    def error_text(self):
        return self.wait.until(EC.visibility_of_element_located(self.ERROR)).text

# tests/test_login.py
def test_wrong_password(driver, base_url):
    page = LoginPage(driver, base_url).open()
    page.login("ravi@test.example", "wrong")
    assert page.error_text() == "Invalid email or password"
\`\`\`

Rule: page classes **do actions and return data**; **assertions stay in tests**.`,
          d: 'medium',
          at: 'Product companies, service companies',
          tip: `State the rule "no asserts inside page objects"; it shows you have maintained a real framework.`,
        },
        {
          q: `What causes flaky tests and how do you fix them? How do you handle StaleElementReferenceException?`,
          a: `A **flaky test** passes and fails on the same code. It destroys trust in the suite: people start ignoring red builds.

Common causes and fixes:
- **Timing**: clicking before the element is ready. Use explicit waits on the right condition; remove sleeps.
- **Shared test data**: two tests use the same account in parallel. Create unique data per test.
- **Test order dependence**: test B relies on test A. Make every test set up its own state.
- **Environment**: slow staging servers, third-party services. Mock or stub external services; add health checks before the run.
- **Animations and pop-ups**: wait for them to finish, or disable animations in test builds.
- **Brittle locators**: use \`data-testid\` instead of long XPath.

**StaleElementReferenceException** happens when you hold a reference to an element and the page re-renders it (common in React or Angular apps): the old reference now points to a removed DOM node. Fix it by **finding the element again** right before using it, usually inside an explicit wait, instead of storing elements in variables for long.

Process: track flaky tests, **quarantine** them so they do not block the pipeline, fix the root cause quickly, and use retries (pytest-rerunfailures) only as a temporary measure, never as the fix.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Say "retries hide flakiness, they don't fix it"; interviewers test for exactly this attitude.`,
        },
      ],
    },
    {
      title: 'Playwright, API and Performance Testing',
      questions: [
        {
          q: `What is Playwright and how is it different from Selenium?`,
          a: `**Playwright** is an open-source browser automation framework from Microsoft. It supports Python, JavaScript/TypeScript, Java and .NET, and drives Chromium, Firefox and WebKit (Safari's engine).

| | Selenium | Playwright |
|---|---|---|
| Protocol | W3C WebDriver through browser drivers | Talks to browsers directly with its own protocol |
| Waiting | You add explicit waits | **Auto-waits** for elements to be visible, enabled and stable before acting |
| Assertions | Use the test framework's | Built-in web-first assertions that retry (\`expect(...).to_have_text\`) |
| Isolation | New browser per test is slow | Lightweight **browser contexts**, like fresh incognito profiles |
| Extras | Grid for scaling | Network interception, trace viewer, video, codegen recorder, API testing |
| Ecosystem | Very mature, huge community, real browsers like Safari via drivers | Newer, growing fast |

Selenium is still widely used in service companies and existing suites; many product companies choose Playwright for new projects because tests are faster and less flaky. Knowing both is the safest position for a fresher.`,
          d: 'easy',
          at: 'Product companies',
          tip: `Auto-waiting and browser contexts are the two points that answer "why Playwright?"`,
        },
        {
          q: `What is API testing and what do you check in an API test?`,
          a: `**API testing** checks the backend directly by sending HTTP requests and validating the responses, without the UI. It is faster and more stable than UI testing and finds bugs earlier.

What to check:
- **Status code**: 200, 201, 400, 401, 404 as expected.
- **Response body**: correct values, correct data types, required fields present; validate against a **JSON schema**.
- **Headers**: \`Content-Type: application/json\`, caching and security headers.
- **Business rules**: totals calculated correctly, state changes stored (GET after POST returns the new item).
- **Negative cases**: missing fields, wrong types, very long strings, invalid IDs. These should give 4xx with a helpful error, never 500.
- **Authentication and authorisation**: no token gives 401; another user's data gives 403 or 404.
- **Idempotency** of PUT and DELETE; duplicate POST handling.
- **Response time** within an agreed limit.

Tools: **Postman** (manual and collections, Newman for CI), Python **requests + pytest**, Playwright's API request context, REST Assured (Java).`,
          d: 'easy',
          at: 'Product companies, service companies',
          tip: `Mention testing one user's token against another user's data; authorisation bugs are serious and common.`,
        },
        {
          q: `Write a Playwright test in Python for a login flow.`,
          a: `With the **pytest-playwright** plugin (\`pip install pytest-playwright\`, then \`playwright install\`), you get a ready \`page\` fixture.

\`\`\`python
# test_login.py
import re
from playwright.sync_api import Page, expect

BASE = "https://staging.shop.example"

def test_successful_login(page: Page):
    page.goto(f"{BASE}/login")
    page.get_by_label("Email").fill("ravi@test.example")
    page.get_by_label("Password").fill("Secret@123")
    page.get_by_role("button", name="Log in").click()

    expect(page).to_have_url(re.compile(".*/dashboard"))
    expect(page.get_by_role("heading", name="Welcome, Ravi")).to_be_visible()

def test_wrong_password_shows_error(page: Page):
    page.goto(f"{BASE}/login")
    page.get_by_label("Email").fill("ravi@test.example")
    page.get_by_label("Password").fill("wrong")
    page.get_by_role("button", name="Log in").click()
    expect(page.get_by_text("Invalid email or password")).to_be_visible()
\`\`\`

Points to explain:
- **User-facing locators** (\`get_by_role\`, \`get_by_label\`, \`get_by_text\`, \`get_by_test_id\`) match how users see the page and survive styling changes.
- No waits needed: actions auto-wait, and \`expect\` retries until the condition is true or the timeout passes.
- Run with \`pytest --headed\` to watch, or \`pytest --browser firefox\`; \`playwright codegen <url>\` records a starting script.`,
          d: 'medium',
          at: 'Product companies',
          tip: `Prefer \`get_by_role\` over CSS in your answer; it is Playwright's recommended style.`,
        },
        {
          q: `Write an API test in Python with requests and pytest that creates a resource and verifies it.`,
          a: `\`\`\`python
# test_users_api.py
import uuid
import pytest
import requests

BASE = "https://staging-api.shop.example"

@pytest.fixture
def session():
    s = requests.Session()
    s.headers.update({"Authorization": "Bearer TEST_TOKEN"})  # read from env in real suites
    yield s
    s.close()

def test_create_and_fetch_user(session):
    email = f"qa_{uuid.uuid4().hex[:8]}@test.example"

    created = session.post(f"{BASE}/users", json={"name": "Asha", "email": email}, timeout=10)
    assert created.status_code == 201
    body = created.json()
    assert body["email"] == email
    assert isinstance(body["id"], int)

    fetched = session.get(f"{BASE}/users/{body['id']}", timeout=10)
    assert fetched.status_code == 200
    assert fetched.json()["name"] == "Asha"

    session.delete(f"{BASE}/users/{body['id']}", timeout=10)

def test_create_user_without_email_is_rejected(session):
    r = session.post(f"{BASE}/users", json={"name": "Asha"}, timeout=10)
    assert r.status_code in (400, 422)
\`\`\`

Good practices shown: a shared \`Session\` for headers and connection reuse, unique data per run, a **timeout** on every call, checking both status and body, verifying the write with a GET, cleaning up, and a negative test. In a real suite the token and base URL come from environment variables.`,
          d: 'medium',
          at: 'Product companies',
          tip: `Always add \`timeout=\`; a request without one can hang a CI job forever.`,
        },
        {
          q: `How do you handle authentication in automated tests without logging in through the UI every time?`,
          a: `Logging in through the UI in every test is slow and adds flakiness. Log in **once** and reuse the session.

**Playwright: save storage state**
\`\`\`python
# conftest.py
import pytest

@pytest.fixture(scope="session")
def auth_state(browser, tmp_path_factory):
    path = tmp_path_factory.mktemp("auth") / "state.json"
    context = browser.new_context()
    page = context.new_page()
    page.goto("https://staging.shop.example/login")
    page.get_by_label("Email").fill("ravi@test.example")
    page.get_by_label("Password").fill("Secret@123")
    page.get_by_role("button", name="Log in").click()
    page.wait_for_url("**/dashboard")
    context.storage_state(path=path)   # cookies and local storage
    context.close()
    return path

@pytest.fixture
def logged_in_page(browser, auth_state):
    context = browser.new_context(storage_state=auth_state)
    yield context.new_page()
    context.close()
\`\`\`

**Other options**
- Get a token from the **login API** and set it as a cookie or header.
- For API tests, fetch a token once per session and reuse it.
- Keep one or two UI tests that check the real login screen itself.
- Credentials come from environment variables or CI secrets, never committed.`,
          d: 'medium',
          at: 'Product companies',
          tip: `Point out you still keep a real UI login test; skipping login everywhere else is about speed, not coverage.`,
        },
        {
          q: `What are load, stress, spike and soak testing? Which metrics do you report?`,
          a: `| Type | What you do | What you learn |
|---|---|---|
| **Load** | Apply the expected peak load, such as 2,000 concurrent users | Does it meet response-time goals at normal peak? |
| **Stress** | Increase load beyond peak until it breaks | The breaking point and how it fails (graceful errors or crash) |
| **Spike** | Jump suddenly from low to very high load | Can it absorb a flash sale or exam-result rush; does autoscaling react in time? |
| **Soak (endurance)** | Moderate load for hours | Memory leaks, connection exhaustion, slow degradation |

**Metrics to report**
- **Response time percentiles**: p50, **p95**, p99. Averages hide slow users.
- **Throughput**: requests per second.
- **Error rate**: % of failed requests (5xx, timeouts).
- **Concurrent users** at each stage.
- **Server-side resources**: CPU, memory, DB connections, queue lengths (from monitoring tools).

Example goal: "At 500 requests per second, p95 under 800 ms and errors below 1%."

Tools: **JMeter**, **k6**, **Locust** (Python), Gatling. Test in an environment sized like production, and never against production without permission.`,
          d: 'medium',
          at: 'Product companies, service companies',
          tip: `Quote p95, not average; it is the metric performance teams actually use.`,
        },
        {
          q: `Write a simple load test with Locust and explain how you would read the results.`,
          a: `**Locust** writes load tests as Python code; each simulated user runs the tasks.

\`\`\`python
# locustfile.py
from locust import HttpUser, task, between

class Shopper(HttpUser):
    wait_time = between(1, 3)   # think time between actions, in seconds

    def on_start(self):
        r = self.client.post("/api/login", json={"email": "load@test.example", "password": "Secret@123"})
        self.client.headers["Authorization"] = f"Bearer {r.json()['token']}"

    @task(5)                    # weight: browsing is 5x more common than adding to cart
    def browse(self):
        self.client.get("/api/products?page=1", name="/api/products")

    @task(1)
    def add_to_cart(self):
        self.client.post("/api/cart", json={"productId": 42, "qty": 1})
\`\`\`

\`\`\`bash
locust -f locustfile.py --host https://staging.shop.example \\
  --headless -u 500 -r 50 -t 10m --csv results
\`\`\`

\`-u 500\` users, spawned at \`-r 50\` per second, for 10 minutes.

**Reading results**
- Watch p95 and error rate **as users ramp up**. The point where p95 starts climbing steeply is the capacity limit.
- If throughput stops rising while users increase, something is saturated: correlate with server CPU, DB connections and slow query logs.
- Errors appearing under load (timeouts, 503s) point to connection pools, thread limits or autoscaling that is too slow.
- Compare with the agreed goals and with the previous release to catch performance regressions.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Explain the \`name=\` argument: it groups URLs with query strings so stats stay readable.`,
        },
        {
          q: `How do you mock or intercept network calls in Playwright, and when should you?`,
          a: `Playwright can intercept any request the page makes and **fulfil it with fake data, change it, or block it**. Useful when:
- The backend is not ready yet, but the UI is.
- You need hard-to-create states: empty list, server error, a slow response, a 10,000-item list.
- A third-party service (payment, maps) is slow or unreliable in test environments.

\`\`\`python
from playwright.sync_api import Page, expect

def test_shows_empty_state(page: Page):
    page.route("**/api/orders", lambda route: route.fulfill(json=[]))
    page.goto("https://staging.shop.example/orders")
    expect(page.get_by_text("You have no orders yet")).to_be_visible()

def test_shows_error_banner_on_500(page: Page):
    page.route("**/api/orders", lambda route: route.fulfill(status=500, body="boom"))
    page.goto("https://staging.shop.example/orders")
    expect(page.get_by_role("alert")).to_contain_text("Something went wrong")

def test_blocks_analytics(page: Page):
    page.route("**/analytics/**", lambda route: route.abort())
    page.goto("https://staging.shop.example")
\`\`\`

**Caution**: a mocked test proves the UI handles a response, not that the real backend sends it. Keep real end-to-end tests for critical journeys and use **API or contract tests** to make sure the real responses match what the mocks assume.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Mentioning the risk of mocks drifting from reality shows senior-level judgement.`,
        },
      ],
    },
    {
      title: 'Scenarios and project questions',
      questions: [
        {
          q: `Explain the automation framework you built in your project.`,
          a: `Describe it layer by layer in about two minutes:

1. **Application and scope**: "An e-commerce web app; I automated 60 UI tests for login, search, cart and checkout and 40 API tests."
2. **Stack**: "Python, pytest, Playwright (or Selenium) for UI, requests for API, Faker for data, pytest-html or Allure for reports."
3. **Structure**:
\`\`\`text
framework/
  pages/          # page objects
  api/            # API client helpers
  tests/ui/  tests/api/
  data/           # JSON/CSV test data
  config/         # dev / staging settings
  conftest.py     # fixtures: browser, logged-in user, API session
  pytest.ini      # markers: smoke, regression
\`\`\`
4. **Design choices**: Page Object Model, fixtures for setup and teardown, test data created through APIs, explicit waits or Playwright auto-waits, environment chosen by a command-line option or environment variable.
5. **CI**: "Runs in GitHub Actions on every pull request; smoke on each deploy, full regression nightly; screenshots and traces saved on failure."
6. **Results and a challenge**: "Regression went from 2 days manual to 25 minutes; I fixed flaky tests by replacing sleeps with waits."`,
          d: 'easy',
          at: 'Service companies, product companies',
          tip: `Have the repository ready to share on screen; interviewers often ask to see one page object and one test.`,
        },
        {
          q: `Write test cases for a login page.`,
          a: `Group them so the interviewer sees structure:

**Functional (positive)**
- Valid email and password logs in and opens the dashboard.
- "Remember me" keeps the user logged in after closing the browser.
- Login works with the Enter key as well as the button.

**Functional (negative)**
- Wrong password, unregistered email: generic message "Invalid email or password" (does not reveal which one is wrong).
- Empty email, empty password, both empty: field-level validation messages.
- Invalid email format (\`ravi@\`, \`ravi.com\`).
- Leading or trailing spaces in email handled sensibly.

**Security**
- Password field is masked; password not visible in URL or logs.
- Account locked or CAPTCHA after N failed attempts.
- SQL injection (\`' OR '1'='1\`) and script input do not break or bypass login.
- Login over HTTPS only; session cookie is \`HttpOnly\` and \`Secure\`.
- Back button after logout does not show the dashboard.

**UI and usability**
- Labels, placeholders, tab order, "Forgot password" link works.
- Works on Chrome, Firefox, Safari and on mobile screen sizes.

**Performance**: login responds within the agreed time under load.`,
          d: 'easy',
          at: 'TCS, Infosys, Wipro, Accenture',
          tip: `Grouping by category matters more than the number of cases; mention security cases without being asked.`,
        },
        {
          q: `How do you run automated tests in a CI pipeline and use them as a quality gate?`,
          a: `A GitHub Actions example that runs API and UI tests on every pull request:

\`\`\`yaml
name: tests
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements.txt
      - run: playwright install --with-deps chromium
      - run: pytest -m "smoke or api" -n 4 --junitxml=report.xml --tracing=retain-on-failure
        env:
          BASE_URL: \${{ vars.STAGING_URL }}
          TEST_PASSWORD: \${{ secrets.TEST_PASSWORD }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: |
            report.xml
            test-results/
\`\`\`

**Quality gates** turn results into decisions:
- Branch protection makes this job **required**, so a failing test blocks the merge.
- Unit test coverage threshold and static checks (linting, security scan) run in the same pipeline.
- Smoke tests run after every deployment; a failure stops promotion to the next environment.
- Full regression runs nightly or before a release.
- Reports and traces are uploaded even on failure (\`if: always()\`) so anyone can debug.

\`-n 4\` uses pytest-xdist to run four workers in parallel.`,
          d: 'medium',
          at: 'Product companies',
          tip: `\`if: always()\` for artifacts is a detail that shows you have debugged real CI failures.`,
        },
        {
          q: `A developer marks your bug as "Not reproducible". What do you do?`,
          a: `Treat it as a communication problem to solve, not an argument to win.

1. **Reproduce it again yourself** on the latest build. Maybe it was fixed by another change; if so, close it.
2. **Compare environments**: build version, browser and version, OS, device, screen size, test environment, feature flags, user role and account data. Many "not reproducible" bugs depend on specific data (a user with an expired plan, a cart with a discounted item).
3. **Add evidence**: screen recording, exact timestamps, the failing network request and response, console errors, server log lines or request ID.
4. **Narrow the steps**: find the minimum steps and the exact data. Check whether it is intermittent (how often in 10 tries) or timing-related.
5. **Show the developer**: a five-minute call or screen share usually ends the confusion.
6. **If still intermittent**, keep it open with the frequency noted and ask for extra logging around that area so the next occurrence gives a clear cause.

Update the bug report with whatever you learn, so the history is useful for the next person.`,
          d: 'medium',
          at: 'Service companies, product companies',
          tip: `Show you collaborate with developers; interviewers listen for attitude as much as technique.`,
        },
        {
          q: `How would you test a UPI payment or checkout feature?`,
          a: `**Functional**
- Successful payment: order is created once, status "Paid", confirmation screen, email or SMS sent, inventory reduced.
- Payment **failed** or **declined**: order not confirmed, user can retry, no stock reduced.
- User **cancels** at the UPI app, or the request **times out**: clear message, order in a pending or failed state, no charge.
- Amount checks: totals, GST, coupons, delivery fee; boundary amounts (minimum, maximum transaction limits).

**Hard cases**
- **Double click** on Pay or browser refresh: no double charge (idempotency).
- **Pending** status that resolves later: the app updates when the payment gateway's webhook or status check arrives.
- Money debited but order failed: refund flow triggers automatically.
- Network loss during payment; app killed and reopened.

**Security**: amount cannot be changed in the request (server recalculates), webhooks are verified by signature, card or UPI details never logged.

**How**: use the payment gateway's **sandbox** and its test credentials and simulated outcomes, API tests for order and webhook logic, mocked responses for rare states, and a small set of real low-value transactions in production smoke tests if the business allows.`,
          d: 'medium',
          at: 'Product companies',
          tip: `Double charge, pending state and "debited but no order" are the three cases that make this answer stand out.`,
        },
        {
          q: `Your regression suite takes three hours. How would you make it faster without losing coverage?`,
          a: `**Measure first**: find the slowest tests and steps (\`pytest --durations=20\`, CI timing).

**Run in parallel**
- pytest-xdist (\`-n auto\`) on one machine, or split the suite across several CI jobs (sharding). Tests must be independent with their own data for this to work.

**Make each test cheaper**
- Log in once with saved session state instead of through the UI every test.
- Create test data through APIs or database seeding, not UI flows.
- Replace \`sleep\` with proper waits.
- Headless browsers in CI.

**Push tests down the pyramid**
- Many UI tests only check business rules. Move those checks to API or unit level, which run in milliseconds, and keep UI tests for real user journeys.
- Remove duplicates: five UI tests that all walk through the same checkout can become one journey plus API tests for the variations.

**Run the right tests at the right time**
- Smoke on every commit, impacted or tagged tests on pull requests, full regression nightly.
- Use markers to pick tests for the changed module.

**Fix flaky tests**, since reruns waste time too. The goal is feedback in minutes on pull requests and complete coverage overnight.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Moving checks from UI to API level is the answer that marks an SDET rather than a manual-to-automation tester.`,
        },
        {
          q: `It is the night before a release and you find a critical bug. What do you do?`,
          a: `1. **Confirm it quickly**: reproduce it, check it is not an environment or data problem, and note the exact steps and impact.
2. **Assess impact**: how many users, which journey (payments and login are worse than a settings page), is there data loss or a security risk, is there a workaround?
3. **Raise it immediately** with full facts to the QA lead, developer and product owner, in the agreed channel. Do not wait for the morning stand-up and do not keep it to yourself.
4. **Help the decision, do not make it alone.** Typical options:
   - Fix now, then retest the fix and run targeted regression around it.
   - Release without the affected feature using a **feature flag** or by reverting that change.
   - Delay the release.
   - Release with a known issue and a workaround, if the impact is low.
5. **If a fix goes in**, verify it and rerun smoke and the related regression tests; a rushed fix can break something else.
6. **Afterwards**: ask why it was found so late and add a test or check (automation, earlier review) so it is caught sooner next time.

The tester's job is to give clear, timely information about risk; the release decision belongs to the team and product owner.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Feature flags and reverting one change are practical options interviewers like to hear besides "delay the release".`,
        },
        {
          q: `Design a test automation framework from scratch for a web application with UI and API tests.`,
          a: `**Choices and reasons**
- **Language and runner**: Python + pytest, matching the team's skills; fixtures, markers and plugins cover most needs.
- **UI**: Playwright (auto-waits, contexts, tracing) or Selenium if the company standard requires it.
- **API**: requests (or Playwright's API context) wrapped in a small client class.

**Layers**
1. **Config**: base URLs and credentials per environment from environment variables or a config file; a command-line option selects the environment.
2. **Core**: browser and API session fixtures, logging, retry and wait helpers.
3. **Page objects / components**: locators and actions, no assertions.
4. **API clients and data builders**: create users, products and orders quickly; Faker for values.
5. **Tests**: short, readable, independent, tagged with markers (smoke, regression, module).
6. **Reporting**: Allure or pytest-html, screenshots, traces and logs on failure.

**Quality of the framework itself**
- Coding standards, linting, code review for test code.
- Parallel-safe: unique data, no shared state.
- Runs locally with one command and in CI on pull requests, with nightly regression.
- Docker image or pinned dependencies so runs are reproducible.
- A short README so a new team member writes a first test on day one.

Start small with smoke tests for critical journeys, prove value, then grow.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Justify each tool choice with a reason; "because it is popular" is not a reason.`,
        },
      ],
    },
  ],
};

export default book;
