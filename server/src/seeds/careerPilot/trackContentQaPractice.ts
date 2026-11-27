/**
 * Career-track content: Testing as a Practice (QA_TESTING_PRACTICE), QA / SDET, batch QA1.
 *
 * What a QA engineer and an SDET do at work before any tool is chosen: the roles, test levels and types, test
 * strategy and plans led by risk, defect reports and triage, and testing inside an agile team (acceptance criteria,
 * Given-When-Then, three amigos, shift-left). It builds on the years' "What a Test Is Actually For", "Testing What
 * Should Fail", "Unit, Integration or End to End" and the Python Full Stack track's "pytest: Writing and Running
 * Tests" and "Fixtures and Parametrised Tests"; pytest itself is not re-taught. Test-design techniques are QA_TEST_DESIGN.
 *
 * One demo app runs through the topic: KiranaKart, a fictional grocery-ordering API (Flask) with six planted bugs:
 * free delivery at exactly 500 rupees (BUG-1), the SALE10 cap of 100 never applied (BUG-2), the coupon stacking when
 * applied twice (BUG-3), zero and negative quantities accepted (BUG-4), five-digit pincodes accepted (BUG-5) and a
 * typo in the confirmation (BUG-6). Every pytest run, curl call and JSON response quoted in the notes is real output
 * from Python 3.13, Flask (Werkzeug 3.1) and pytest 9 against that app on synthetic data, including the failures.
 * Not run: Jira, Azure DevOps and Cucumber/behave/pytest-bdd (Gherkin is shown as text and mirrored by a parametrised
 * pytest test that was run); tool screens are described, not reproduced.
 *
 * Skills: TESTING_FUNDAMENTALS by default; BUG_REPORTS is TECHNICAL_COMMUNICATION, and checkpoint questions elsewhere
 * that are plainly about writing defect reports use ck('TECHNICAL_COMMUNICATION', ...).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_QA_TESTING_PRACTICE_BUNDLES: PilotBundle[] = [
  /* ── QA_ROLE ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TESTING_PRACTICE_QA_ROLE',
    notes: `In "What a Test Is Actually For" you learnt that a test protects you from the mistake you will make next month. A
QA engineer makes that a job: finding out, on purpose and early, how a product can let its users down, and telling the
team in a form they can act on. This topic uses one small app all the way through, so start by meeting it.

## The demo app: KiranaKart

KiranaKart is a fictional grocery-ordering API (Flask, about 90 lines) that a Pune start-up is about to put behind its
Diwali-sale campaign. Its rules, as the product manager wrote them in story KK-212 and its neighbours:

    Catalogue    ATTA5 Atta 5 kg 250 | DAL1 Toor dal 1 kg 160 | GHEE1 Ghee 1 L 610 (stock 6) | TEA250 Tea 135 (stock 0)
    Quantity     1 to 10 per line, never more than stock
    Delivery     40 rupees; free when the subtotal is 500 or more
    Coupon       SALE10: 10% off a subtotal of 300 or more, at most 100 off, once per cart
    Checkout     a 6-digit Indian pincode that does not start with 0

    POST /api/carts                    -> {"cart_id": 1}
    POST /api/carts/<id>/items         {"sku": "ATTA5", "qty": 2}
    POST /api/carts/<id>/coupon        {"code": "SALE10"}
    POST /api/carts/<id>/checkout      {"pincode": "560034"}

The developers think it is ready. It has six bugs in it, planted on purpose, and by the end of this topic you will have
found them, reported them, planned the testing that should have caught them and written the acceptance criteria that
would have prevented some of them. You can run it yourself: save app.py and pricing.py, pip install flask pytest,
and run python app.py.

## Quality is a team outcome

The oldest mistake in software is to treat QA as a gate at the end: developers "finish", throw the build over the wall,
and testers "find bugs". It fails for three reasons. Bugs found late cost more (the developer has moved on, the fix
touches code other features now depend on). A tester at the end can only report what is wrong, not stop it being built
wrong. And a team that thinks quality is the tester's job writes less careful code. Modern teams say it plainly:
**the team owns quality; the QA engineer owns the testing expertise.**

## The roles you will see in job posts

- **QA engineer / test engineer.** Understands the product and its users, designs tests (what to check and why),
  runs exploratory sessions, writes and maintains test cases, reports and follows up defects, and judges release
  readiness. Increasingly also automates API and UI checks. In IT services you may hear "manual tester"; the
  title is fading, the thinking is not.
- **SDET (software development engineer in test).** A developer whose product is the test system: the automation
  framework, test data tooling, mocks and stubs, CI pipelines that run the suites, flaky-test tracking. An SDET
  interview has a coding round; product companies and GCCs in Bengaluru and Hyderabad hire for this title.
- **Automation tester.** Between the two: writes Playwright, Selenium or API suites on a framework someone
  else designed.
- **Test lead / QA manager.** Owns the strategy across teams, estimates, chooses tools, reports quality to
  leadership and grows the testers.

All of them share one skill this topic builds: deciding **what is worth testing, how deeply, and how to say what you
found.**

## Where testing sits: SDLC and STLC

The **SDLC** (software development life cycle) is requirements, design, build, test, release, maintain, whether done
once (waterfall) or every two weeks (agile). The **STLC** (software testing life cycle) is the tester's parallel track:

    1. Requirement analysis   read stories and rules, list what is testable, ask about gaps
    2. Test planning          strategy, scope, risks, environments, entry and exit criteria
    3. Test design            test cases and data, automation candidates
    4. Environment setup      a build, a database, accounts, test data
    5. Execution              run, log results, raise defects, retest fixes
    6. Closure                summary report, lessons, what to automate next

The important point: step 1 starts when the requirement is written, not when the code is. Reading KK-212 on day one,
a tester would ask "Is the 500-rupee free-delivery line before or after the coupon?" and "Can SALE10 be applied twice?"
Two of the six bugs live exactly there.

## What "done" means

A story is done when it meets the team's **definition of done (DoD)**, a checklist agreed in advance, for example:
code reviewed, unit tests written and passing, acceptance criteria verified, no open defect of severity High or
above, API and regression suites green in CI, release notes updated. "The developer says it works" is not on the list.
QA's job is to make the DoD honest: each line is checked, with evidence, not ticked from memory.

## Verification, validation and what testing cannot do

**Verification** asks "did we build it right?" (does it match the spec: is the fee 40 below 500?). **Validation** asks
"did we build the right thing?" (do shoppers understand why delivery was charged?). Testing shows the presence of bugs,
never their absence: KiranaKart could pass every case you write and still fail on a case you did not think of. That is
why testers prioritise by risk (the lesson after next, "Test Plans, Test Strategy and Risk-Based Testing"), rather than chase "complete" testing, which is impossible
(ISTQB lists both as testing principles; check the official ISTQB site for the current Foundation syllabus).

## A day in the life

A QA engineer at a mid-size product company typically: joins stand-up, reviews two new stories for testability,
pairs with a developer on the API tests for a fix, runs a 60-minute exploratory session on the new checkout, triages
four new defects with the lead, and checks why last night's regression run had three failures (two real, one flaky).
Notice how little of it is "clicking through test cases".`,
    workedExample: `**Scenario.** Story KK-212 ("SALE10 coupon") reaches the sprint. You are the only QA engineer on a team of four
developers. Show what you do at each STLC step, using the real app.

**1. Requirement analysis (day 1, before code).** You list questions and get answers in writing on the story:
"Is free delivery judged before or after the discount?" (before: on the subtotal). "Can the coupon be applied twice?"
(no, once per cart). "Is the code case-sensitive?" (yes: sale10 is invalid).

**2. Planning.** One line in the sprint test plan: coupon and delivery rules are high risk (money, Diwali traffic), so
boundary values get automated API tests and a 45-minute exploratory session.

**3. Design.** Cases from the rules: subtotal 299 (refused), 300 (30 off), 1000 (100 off), 1220 (capped at 100),
applied twice (counted once), subtotal exactly 500 (free delivery).

**4-5. Execution.** The API checks run with pytest against the build:

    FAILED test_api.py::test_quantity_out_of_range_is_rejected[0] - AssertionErro...
    FAILED test_api.py::test_quantity_out_of_range_is_rejected[-2] - AssertionErr...
    FAILED test_api.py::test_coupon_applied_twice_counts_once - assert 100 == 50
    FAILED test_api.py::test_bad_pincode_is_rejected[56003] - assert 201 == 400
    FAILED test_pricing.py::test_delivery_fee_boundary[500-0] - assert 40 == 0
    FAILED test_pricing.py::test_coupon_discount[1220-100] - assert 122 == 100
    6 failed, 11 passed in 1.78s

Six failures, five distinct bugs (BUG-6, the typo, needs a human eye). You raise one defect per bug, not one per failed
test, each with steps and evidence ("Defects: Finding, Reporting and the Bug Lifecycle" shows how).

**6. Closure.** At the sprint review you report: "Coupon and delivery: 17 checks, 5 defects found, 2 High fixed and
retested, 3 open with agreed dates. Not tested: load on sale day (out of scope, planned for the performance sprint)."
Saying what was not tested is part of the job.`,
    mcqs: [
      mcq('KiranaKart\'s manager says "the testers will catch any bugs before release, so developers can move faster." What is the strongest reply?', [
        ['Testing finds bugs late and cannot prove their absence; quality has to be built in by the whole team', true],
        ['Testers can catch every bug if they are given enough time and complete test case documents', false],
        ['Developers should test their own code, so the QA role can be removed from the team', false],
        ['The reply should be to add more regression test cases at the end of each sprint', false],
      ], 'Testing shows the presence of bugs, not their absence, and late discovery is the expensive kind; so quality is a team outcome with QA expertise in it. No amount of time makes testing complete, removing QA throws away the expertise, and more end-of-sprint cases keeps the gate-at-the-end model that is the problem.'),
      mcq('A job post asks for an "SDET" at a Bengaluru GCC. Which responsibility most clearly marks that role out from a QA engineer?', [
        ['Building and maintaining the test automation framework and its CI runs', true],
        ['Reviewing user stories for testability during sprint planning sessions', false],
        ['Running exploratory sessions on new features and logging the defects', false],
        ['Deciding whether the release is ready based on the open defect list', false],
      ], 'An SDET is a developer whose product is the test system: frameworks, tooling, pipelines; hence the coding round. Story review and exploratory testing are core QA engineer work, and release-readiness judgement belongs to QA engineers and leads; an SDET may do them too, but they do not define the role.'),
      mcq('In the STLC, when should requirement analysis for story KK-212 begin?', [
        ['As soon as the story is written, before any code exists', true],
        ['When the developer moves the story to "ready for QA"', false],
        ['After the first build is deployed to the shared QA test server', false],
        ['During regression testing just before the release date', false],
      ], 'Questions such as "is free delivery judged before or after the coupon?" are cheapest to answer before code is written; two of the planted bugs sit in such gaps. Waiting for "ready for QA" or a deployed build turns a question into a defect, and regression time is the latest and most expensive point.'),
    ],
    checkpoint: [
      mcq('"Did we build it right?" and "did we build the right thing?" are the two questions behind which pair of terms?', [
        ['Verification and validation', true],
        ['Smoke testing and sanity testing', false],
        ['Static testing and dynamic testing', false],
        ['Alpha testing and beta testing', false],
      ], 'Verification checks the product against its specification; validation checks that the specification meets the users\' need. Smoke and sanity are quick build checks, static and dynamic differ in whether code runs, and alpha and beta differ in who tests and where.'),
      mcq('KiranaKart\'s definition of done includes "no open defect of severity High or above". A developer marks a story done with one High defect open "because it will be fixed next sprint". What should QA do?', [
        ['Point out the story does not meet the agreed DoD and raise it with the team', true],
        ['Lower the defect\'s severity to Medium so that the story can be closed', false],
        ['Accept the story as done, since the fix has already been scheduled', false],
        ['Close the defect and reopen it next sprint so the board looks clean', false],
      ], 'The DoD is a team agreement; QA keeps it honest by checking each line with evidence and raising a miss, and the team (often with the product owner) decides what to do. Changing severity or closing the defect to fit the board falsifies the record, and scheduling a fix does not make the story done.'),
      mcq('Which statement about testing KiranaKart is true?', [
        ['Passing every written case still cannot prove the app has no bugs', true],
        ['Testing every input combination is possible for an API this small', false],
        ['A full regression run at the end makes requirement reviews unnecessary', false],
        ['Bugs found in production cost about the same to fix as early ones', false],
      ], 'Testing shows the presence of defects, not their absence; that is why effort is directed by risk. Even a tiny API has effectively unbounded inputs (quantities, pincodes, cart orders), a late regression run cannot replace early reviews, and late defects cost far more to fix.'),
    ],
  },

  /* ── LEVELS_TYPES ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TESTING_PRACTICE_LEVELS_TYPES',
    notes: `"Unit, Integration or End to End" taught a developer's view of choosing a level. A QA engineer needs the full map,
because the words below are what plans, interviews and Jira fields use, and each answers a different risk.

## Test levels: how much of the system is under test

- **Unit (component) testing.** One function or class, in isolation, fast. KiranaKart: delivery_fee(500) should be 0.
  Usually written by developers; QA reviews which cases are missing.
- **Integration testing.** Pieces working together: the route, the pricing module and the cart store; or our API and
  a payment provider. KiranaKart: POST an item and read the cart total back through Flask's test client.
- **System testing.** The whole deployed product, end to end, against the requirements: a browser or API client
  against a real server, database and configuration. Most QA execution lives here.
- **Acceptance testing.** Does it meet the business need? User acceptance testing (UAT) by the business, alpha
  (in-house) and beta (real users), and contractual or regulatory acceptance (a bank's sign-off).

The same rule can be checked at several levels. The free-delivery boundary is cheapest as a unit test:

    @pytest.mark.parametrize("subtotal, fee", [(499, 40), (500, 0), (501, 0)])
    def test_delivery_fee_boundary(subtotal, fee):
        assert delivery_fee(subtotal) == fee

    FAILED test_pricing.py::test_delivery_fee_boundary[500-0] - assert 40 == 0

That is BUG-1, found in milliseconds. But a unit test cannot tell you whether the route actually calls delivery_fee,
or whether the checkout total adds it. That takes an integration test through the API:

    def test_happy_path_order(client, cart):
        add(client, cart, "ATTA5", 1)
        add(client, cart, "DAL1", 1)
        r = client.post(f"/api/carts/{cart}/checkout", json={"pincode": "560034"})
        assert r.status_code == 201
        assert r.get_json()["total"] == 250 + 160 + 40

## Test types: what quality you are checking

- **Functional.** Does it do the right thing: totals, validations, states.
- **Non-functional.** How well: performance (the Performance Testing topic), security (Mobile, Accessibility and Security Checks), usability,
  accessibility, compatibility across browsers and devices, reliability, localisation (Hindi and Tamil labels).
- **Structural (white-box).** Based on the code: branches, coverage. "Coverage, Test Design and TDD" covered what
  coverage proves and does not.
- **Change-related.** Confirmation testing (retesting: the fixed bug is fixed) and **regression testing** (the fix
  broke nothing else).

## Smoke, sanity and regression

These three are confused in every interview, so pin them down:

    Smoke       Broad and shallow. "Is this build worth testing at all?" Can I create a cart, add an item,
                check out? Run on every deployment, minutes long. Fails -> reject the build.
    Sanity      Narrow and quick, after a small change or fix. "Does the changed area basically work?"
                After the coupon fix: apply SALE10 on a 1220 cart, see 100 off.
    Regression  Broad and deep. "Did anything that worked before stop working?" The full suite, mostly
                automated, run nightly or before release.

In pytest a smoke subset is a marker:

    @pytest.mark.smoke
    def test_happy_path_order(client, cart): ...

    $ pytest -q -m smoke
    1 passed, 16 deselected in 1.10s

## The test pyramid, and its critics

Mike Cohn's pyramid says: many unit tests at the base, fewer integration (service/API) tests in the middle, few UI
end-to-end tests at the top. The reasons are cost and feedback: KiranaKart's 7 unit checks run in about a second,
while one browser test of the same rules takes seconds, needs a server and fails for reasons unrelated to pricing.

The critics have a point. The **ice-cream cone** (mostly manual and UI tests, few unit tests) is the anti-pattern many
Indian service projects inherit, and it is slow and flaky. But the **testing trophy** (Kent C. Dodds) argues that
integration tests give the best confidence per test for web apps, because most bugs live in how parts connect;
BUG-3 (the coupon stacking) is invisible to a unit test of coupon_discount and caught by one API test. The useful
reading: push each check to the **lowest level that can catch the risk**, and keep a thin layer of end-to-end tests for
the journeys that make money.

## Static and dynamic testing

Dynamic testing runs the code. **Static testing** examines artefacts without running them: reviewing the story,
reading the code, linting. Reading KK-212 and asking "once per cart?" is static testing, and it is the cheapest bug
you will ever find.

## Choosing: risk first, then level, then type

For each risk ask: what could go wrong, how would it show, and what is the cheapest test that would see it?

    Risk                                          Level           Type
    Fee wrong at exactly 500                      unit            functional, boundary
    Coupon applied twice stacks                   integration     functional (state)
    Checkout total ignores delivery               integration     functional
    Page unusable on a 5-inch phone               system          compatibility, usability
    Sale-day traffic of 2,000 orders a minute     system          performance (load)
    Business disagrees with discount wording      acceptance      UAT`,
    workedExample: `**Scenario.** The KiranaKart team has two days before the Diwali sale. The lead asks you for "the tests that matter" for
the cart and checkout, and which level each belongs at. Do it from risk, and run what you can.

**Step 1: list the risks, money first.** Wrong totals (fee, discount), invalid orders accepted (quantity, pincode),
out-of-stock sold, and the sale-day load.

**Step 2: push each to the lowest level that can see it.** Fee and discount arithmetic are pure functions: unit tests
with boundaries (499, 500, 501; 299, 300, 1000, 1220). Stacking, quantity limits, stock and pincode validation live in
the routes and their state: API-level integration tests through the Flask test client. Load and phone layout are
system tests for later.

**Step 3: run them.** 17 checks, under two seconds:

    $ pytest -q
    .FF..FF....F....F                                                        [100%]
    6 failed, 11 passed in 1.78s

Unit level caught BUG-1 (fee at 500) and BUG-2 (cap): assert 40 == 0 and assert 122 == 100. API level caught BUG-3
(assert 100 == 50 after a second SALE10), BUG-4 (quantities 0 and -2 returned 201, not 400) and BUG-5 (pincode 56003
returned 201). The out-of-stock test passed: TEA250 is refused correctly.

**Step 4: what this does not cover.** BUG-6 is a spelling mistake in the confirmation text; no assertion was
looking for it, which is why exploratory and acceptance testing still matter. Nothing here proves the app survives
sale-day load, and nothing checks the mobile layout.

**Step 5: tag the smoke set.** The happy-path order gets @pytest.mark.smoke, so every deployment runs it in about a
second (1 passed, 16 deselected) before anyone spends time on a broken build.`,
    mcqs: [
      mcq('After the coupon-cap fix is deployed, you spend ten minutes checking that SALE10 on a 1,220-rupee cart now gives exactly 100 off and nothing obvious near it broke. What kind of testing is that?', [
        ['Sanity testing of the changed area', true],
        ['Smoke testing of the whole new build', false],
        ['Full regression testing of the product', false],
        ['User acceptance testing by the business', false],
      ], 'Sanity testing is narrow and quick, aimed at the area a small change touched. Smoke is broad and shallow across the whole build to decide whether it is testable, regression is broad and deep, and UAT is the business confirming the need is met.'),
      mcq('A unit test of coupon_discount passes, yet applying SALE10 twice through the API gives 244 off. Why did the unit test not catch it?', [
        ['The stacking lives in the route and cart state, which a unit test of the function never exercises', true],
        ['The unit test used parametrize, which hides failures that occur only on a second call', false],
        ['Unit tests cannot test money calculations, which need a system-level test to be trusted', false],
        ['The unit test should have mocked the Flask route so that it could see both coupon calls', false],
      ], 'BUG-3 is in how the route sums one discount per applied coupon; coupon_discount itself is called correctly. An API (integration) test sees it. Parametrize does not hide failures, unit tests are the best place for arithmetic, and mocking the route would remove exactly the code that has the bug.'),
      mcq('A project has 40 unit tests, 30 API tests and 600 manual UI test cases run before every release. What is the usual name for this shape, and its main problem?', [
        ['An ice-cream cone: slow, costly feedback that arrives late', true],
        ['A test pyramid: the right balance for a web application', false],
        ['A testing trophy: integration tests give the best confidence', false],
        ['A diamond: too many API tests compared with the UI layer', false],
      ], 'Mostly manual UI tests over a thin automated base is the ice-cream cone anti-pattern: every release waits on slow, repetitive runs. A pyramid has the most tests at the bottom, the trophy weights integration tests, and here the API layer is not the problem.'),
    ],
    checkpoint: [
      mcq('Which check belongs at the unit level for KiranaKart?', [
        ['delivery_fee returns 0 for a subtotal of exactly 500', true],
        ['A shopper can check out from a phone browser in Hindi', false],
        ['The order total includes the fee after a real checkout', false],
        ['Two thousand orders a minute keep latency under a second', false],
      ], 'A pure function with a boundary value is the cheapest, fastest unit test. Phone and language checks are system-level compatibility and localisation, the checkout total needs the route and pricing together (integration), and throughput is a system-level performance test.'),
      mcq('Which statement correctly separates smoke testing from regression testing?', [
        ['Smoke decides if a build is testable; regression checks old behaviour still works', true],
        ['Smoke is always manual, while regression testing is always automated', false],
        ['Smoke runs only just before a release; regression runs on every single commit', false],
        ['Smoke checks one fixed bug; regression checks the bug\'s neighbours', false],
      ], 'Smoke is broad and shallow on a new build; regression is broad and deep, looking for anything previously working that broke. Either can be manual or automated, smoke usually runs on every deployment (not only before release), and checking one fix is confirmation or sanity testing.'),
      mcq('Reviewing story KK-212 and asking "can SALE10 be applied twice?" before any code exists is an example of what?', [
        ['Static testing', true],
        ['Regression testing', false],
        ['Acceptance testing', false],
        ['Integration testing', false],
      ], 'Static testing examines an artefact (here a requirement) without running anything, and it is the cheapest way to find a defect. Regression and integration testing run code, and acceptance testing checks a built product against business needs.'),
    ],
  },

  /* ── PLAN_STRATEGY ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TESTING_PRACTICE_PLAN_STRATEGY',
    notes: `Nobody has time to test everything, and KiranaKart showed why: even a 90-line API has more inputs than you could ever
try. A test strategy and a test plan are how a team decides, in advance and in writing, where its limited testing time
goes, and how it will know when it has done enough.

## Strategy versus plan

- A **test strategy** is the long-lived approach for a product or organisation: which levels and types of testing,
  the automation approach and tools, environments, how defects are managed, what quality gates block a release.
  It changes rarely. "API rules are automated in pytest and run on every merge; UI end-to-end covers the five
  money journeys only; performance tests run before every sale event."
- A **test plan** applies the strategy to one release, sprint or feature: what is in and out of scope this time,
  who tests what, the schedule, the risks, entry and exit criteria. It is short-lived and specific.

Standards such as IEEE 829 (older) and ISO/IEC/IEEE 29119-3 list the sections; in practice a good plan for a sprint
fits on one or two pages, and a 40-page template nobody reads is worse than none.

## What a plan contains

    Scope / out of scope    features and rules being tested; what is deliberately not tested, and why
    Approach                levels and types per area, manual vs automated, exploratory sessions
    Risks                   product risks (what could fail) and project risks (what could stop testing)
    Environments and data   build, URL, database, accounts, test data, third-party sandboxes
    Entry criteria          when testing can start
    Exit criteria           when testing is done enough to decide on release
    Schedule and estimate   effort and dates, with assumptions
    Roles                   who tests, who triages, who signs off
    Deliverables            test cases, automation, defect reports, the summary report

"Out of scope" is the line people skip and later regret. Writing "load testing is out of scope for this sprint" turns a
hidden gap into a decision someone made.

## Entry and exit criteria

**Entry criteria** stop the team wasting time on a build that is not ready: build deployed to the QA environment,
smoke suite passing, stories have acceptance criteria, test data loaded, payment sandbox reachable.

**Exit criteria** say when testing can stop and a release decision can be made. Good ones are measurable and
risk-weighted:

    - All planned High-risk test cases executed; 95% of all planned cases executed
    - No open Critical or High defects; Medium defects reviewed and accepted by the product owner
    - Regression suite green in CI on the release build
    - Every requirement traced to at least one executed test

Bad exit criteria are the kind a team can meet by gaming: "100% of test cases passed" invites deleting or skipping the
failing ones (the Debugging lesson shows that happening). Exit criteria inform the release decision; the product owner
and team still make it, and may release with known, accepted issues.

## Risk-based testing

Risk = **likelihood** that something fails x **impact** if it does. Score each area (1 to 5 each), multiply, and spend
effort in that order. Likelihood rises with complexity, new code, many changes, an inexperienced team or a history of
defects; impact rises with money, legal exposure (the DPDP Act for personal data), reputation and the number of users.

KiranaKart before the Diwali sale:

    Area                        Likelihood  Impact  Risk  Testing depth
    SALE10 coupon rules             4         5      20   boundaries automated + exploratory session
    Quantity and stock checks       3         5      15   negative and boundary API tests
    Delivery fee rule               3         4      12   boundary unit tests
    Pincode validation              3         3       9   partition tests (valid, short, long, letters)
    Cart creation and reading       1         5       5   smoke test only
    Confirmation message text       2         1       2   one look during exploratory session

Two lessons hide in the table. First, impact is not likelihood: cart creation would be catastrophic if broken but
almost cannot break, so a smoke test is enough. Second, the scores are a conversation starter, not physics; the value
is that the product owner and developers argue about them with you before testing, not after.

Product risks (the coupon may stack) are different from **project risks** (the payment sandbox may be down for two days;
the only tester may be on leave). A plan lists both, with a mitigation for each project risk.

## Estimating

Three practical methods:

- **Work breakdown.** List tasks (design 25 cases, automate 12 API checks, 2 exploratory sessions, retest), estimate
  each, add them up, then add time for defects and retesting (often 20 to 30 per cent on a new feature).
- **Three-point (PERT).** For each task, optimistic O, most likely M and pessimistic P; estimate = (O + 4M + P) / 6.
  Automating the coupon checks: O = 4 h, M = 6 h, P = 14 h gives (4 + 24 + 14) / 6 = 7 hours. The spread (4 to 14)
  tells the lead how uncertain you are, which a single number hides.
- **Ratio from history.** If testing took about 40% of development effort on the last three similar features, start
  there and adjust for risk.

State assumptions in the estimate ("assumes the payment sandbox is available from day 1"), so when one breaks, the
re-plan is obvious rather than a surprise.

## Living documents

A plan changes when the sprint changes. Keep it in the team wiki next to the stories, version it, and update the risk
table when a defect cluster appears: three bugs in the coupon area in one day raises its likelihood score, and the
plan should say what you now do differently.`,
    workedExample: `**Scenario.** The KiranaKart sale release (build 1.4.0) goes out on Thursday. It is Monday. Write the one-page test plan
the lead asked for, from the risk table.

**Scope.** Cart, coupon SALE10, delivery fee, quantity and stock limits, checkout pincode, confirmation. **Out of
scope:** load testing (planned separately before the sale with the Performance Testing approach), payment gateway
(not in this build), Android app (separate plan).

**Approach.** Coupon, quantity and fee rules: boundary and negative cases automated with pytest through the API, run in
CI on every merge. Exploratory: two 45-minute sessions, charters "coupon abuse" and "odd carts". Pincode: partition
tests. Smoke: one happy-path order, every deployment.

**Entry criteria.** Build 1.4.0 on the QA server; smoke passing; KK-212 to KK-216 have acceptance criteria; synthetic
catalogue loaded (no real customer data).

**Exit criteria.** All High-risk cases executed; no open Critical or High defects; Medium defects accepted in writing by
the product owner; regression green in CI on the release build.

**Estimate (three-point, hours).**

    Task                              O    M    P    (O + 4M + P) / 6
    Design coupon/fee/qty cases       2    3    6    3.3
    Automate API checks               4    6   14    7.0
    Exploratory sessions (2)          1.5  1.5  3    1.8
    Retesting fixes                   2    4    8    4.3
    Total                                            16.4  -> about 2.5 days for one tester

**Risks.** Product: coupon and quantity rules (scores 20 and 15). Project: one tester; if the build slips past Tuesday,
exploratory sessions shrink to one and the plan says so.

**What happened.** The first run raised five defects by Monday afternoon; BUG-2, BUG-3 and BUG-4 were High (money).
Exit criteria were not met on Wednesday morning, so the lead could say precisely why the release needed one more day,
with evidence, rather than "QA is not comfortable".`,
    mcqs: [
      mcq('Which item belongs in KiranaKart\'s long-lived test strategy rather than in the plan for build 1.4.0?', [
        ['API rules are automated in pytest and run in CI on every merge', true],
        ['Load testing is out of scope for this release of the sale build', false],
        ['Exploratory sessions on Tuesday cover coupon abuse and odd carts', false],
        ['Entry: build 1.4.0 is deployed to the QA server by Monday morning', false],
      ], 'The strategy is the lasting approach (levels, tools, automation policy). Scope for this release, a specific schedule of sessions and the entry condition naming one build are all plan content that changes every release.'),
      mcq('Two areas score: cart creation, likelihood 1 and impact 5; coupon rules, likelihood 4 and impact 5. How should testing effort be split?', [
        ['Most effort on the coupon rules; a smoke check on cart creation', true],
        ['Equal effort on both, because each has the maximum impact score', false],
        ['Most effort on cart creation, because nothing works without it', false],
        ['No testing of cart creation, since its likelihood is the lowest', false],
      ], 'Risk combines likelihood and impact (20 against 5), so the coupon rules earn depth; a catastrophic but unlikely failure still deserves a cheap smoke check. Equal effort ignores likelihood, and dropping cart creation entirely ignores its impact.'),
      mcq('Automating a check has estimates of 2 hours optimistic, 5 hours most likely and 14 hours pessimistic. What is the three-point (PERT) estimate?', [
        ['6 hours', true],
        ['5 hours', false],
        ['7 hours', false],
        ['8 hours', false],
      ], '(O + 4M + P) / 6 = (2 + 20 + 14) / 6 = 36 / 6 = 6 hours. 5 is just the most likely value, 7 is the simple average of the three, and 8 ignores the weighting; the formula pulls towards M but respects the long pessimistic tail.'),
    ],
    checkpoint: [
      mcq('Which exit criterion is the most useful for deciding whether KiranaKart 1.4.0 can be released?', [
        ['No open Critical or High defects, and all High-risk cases executed', true],
        ['One hundred per cent of the written test cases have a Passed status', false],
        ['Every tester has signed the test summary report for the release', false],
        ['The test team has used all of the hours estimated in the plan', false],
      ], 'Good exit criteria are measurable and tied to risk. "100% passed" invites skipping or deleting failing cases, signatures say nothing about quality, and spending the estimate measures effort, not readiness.'),
      mcq('The only payment-sandbox account may be blocked for two days during the test window. How should the plan record this?', [
        ['As a project risk with a mitigation, such as a mock or a second account', true],
        ['As a product risk scored for likelihood and impact on the shoppers', false],
        ['As an exit criterion that must be met before release is approved', false],
        ['It should not be recorded, as it is outside the test team\'s control', false],
      ], 'A threat to the testing work itself is a project risk and needs a mitigation in the plan. Product risks are ways the software could fail its users, an exit criterion is a condition for finishing, and unrecorded risks are exactly the ones that surprise the team.'),
      mcq('Why should a test plan state what is out of scope?', [
        ['It turns a hidden gap into a decision someone made and can revisit', true],
        ['It reduces the number of test cases that need to be written by testers', false],
        ['It is required by ISO 29119 before any testing is allowed to start', false],
        ['It moves the responsibility for those areas to the development team', false],
      ], 'Writing "load testing out of scope" makes the gap visible so the owner can accept it or fund it. Reducing cases is a side effect, not the purpose; standards describe plan contents rather than gate testing, and stating scope does not reassign responsibility.'),
    ],
  },

  /* ── BUG_REPORTS ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TESTING_PRACTICE_BUG_REPORTS',
    notes: `Finding a bug is half the job. The other half is a report that makes a busy developer able to reproduce it in two
minutes and a product owner able to decide its priority in one. Testers are judged, rightly, on both halves.

## A bad report

This one was filed against KiranaKart on the first test day:

    Title:    Cart not working
    Steps:    Add items and checkout
    Expected: Should work
    Actual:   Wrong total
    Severity: Critical

The developer replied "Works for me" and moved it to Cannot Reproduce. Every field failed: which cart, which items,
which total, what does "work" mean, wrong by how much, on which build? A report that needs a conversation to be
understood waits until someone has time for the conversation.

## The good version (BUG-4)

    Title:     Negative quantity accepted in cart: GHEE1 x1 + DAL1 x-2 checks out at 330 instead of being refused
    Build/env: KiranaKart 1.4.0, QA server, API (no browser), 28 Oct 2026
    Preconds:  New cart. Catalogue: GHEE1 610, DAL1 160
    Steps:     1. POST /api/carts
               2. POST /api/carts/3/items {"sku": "GHEE1", "qty": 1}
               3. POST /api/carts/3/items {"sku": "DAL1", "qty": -2}
               4. POST /api/carts/3/checkout {"pincode": "560034"}
    Expected:  Step 3 returns 400 "qty must be 1 to 10" (rule: quantity 1 to 10 per line, story KK-209)
    Actual:    Step 3 returns 201 and the cart becomes
               {"items": {"DAL1": -2, "GHEE1": 1}, "subtotal": 290, "delivery": 40, "total": 330}
               Step 4 returns 201 {"order_id": "KK-1003", "total": 330}: 610 of ghee sold for 330.
               qty 0 is also accepted (adds a line with quantity 0).
    Repro:     5/5
    Severity:  Critical (money lost on every abusive order; no workaround on our side)
    Priority:  P1 (sale starts Thursday)
    Evidence:  pytest test_quantity_out_of_range_is_rejected[0] and [-2] fail: assert 201 == 400

The anatomy, field by field:

- **Title.** What is wrong, where, under what condition, in one line someone can search for. Not "bug in cart".
- **Environment.** Build number, environment, client (browser and version, device, OS, API). Bugs that depend on
  environment are unreproducible without it.
- **Preconditions and data.** Account, cart state, catalogue prices. Synthetic data only; never paste a real
  customer's phone number or address into a ticket (the DPDP Act applies to Jira too).
- **Steps.** Numbered, minimal, exact values. If you needed eight steps, try to cut to the fewest that still fail.
- **Expected,** with its source (story, rule, spec). Without a source, "expected" is your opinion.
- **Actual,** with exact numbers, messages and status codes. Copy, do not paraphrase.
- **Reproducibility.** 5/5, or 2/10 and under what conditions. Intermittent bugs are real; say so honestly.
- **Evidence.** A curl command and response, a screenshot with the area marked, a short screen recording, logs with
  timestamps, the failing test's name. A HAR file from the browser's network tab for UI bugs.

One bug per report. "Coupon problems" holding BUG-2 and BUG-3 cannot be half-fixed and closed.

## Severity versus priority

**Severity** is the technical impact on the system or user: Critical (data loss, money, crash, no workaround), High
(major feature broken, workaround painful), Medium, Low (cosmetic). The tester proposes it.

**Priority** is how soon the business wants it fixed: P1 now, P2 this release, P3 later. The product owner decides it,
usually in triage, because it depends on business context the tester may not have.

They are independent, and interviewers love the off-diagonal cases:

- **High severity, low priority:** the yearly GST export crashes when a cart has 500 lines. Severe, but nobody runs
  it until March and no cart has 500 lines; fix next release.
- **Low severity, high priority:** the home banner says "Diwali Sale ends 13 Oct" when it ends 3 Nov. Nothing is broken
  technically, but every shopper sees it on sale day; fix today.
- BUG-6, "placed sucessfully", is low severity and usually low priority, unless marketing is screenshotting the
  confirmation for an advert this week.

## The defect lifecycle

Names differ between tools, but the shape is the same:

    New -> Triaged/Open -> Assigned -> In Progress -> Fixed (Resolved) -> Ready for Retest
        -> Verified -> Closed
    Side exits: Rejected (not a bug, works as designed), Duplicate, Cannot Reproduce,
                Deferred (accepted, fix later)
    Back edge:  Retest fails -> Reopened -> Assigned

Two rules keep it honest. The tester who raised it (or another tester) verifies the fix on a build that contains it,
with the original steps and a check of the neighbourhood. And "Cannot Reproduce" goes back to the reporter for more
detail, not into a graveyard.

## Triage

A short, regular meeting (daily near a release) where the QA lead, a developer lead and the product owner go through new
defects: is it a bug, is it a duplicate, what are severity and priority, who owns it, which release. Come with the
evidence ready; triage is where a clear report earns its keep, because a vague one takes ten minutes of the meeting.

## Jira in practice

A bug is an issue of type Bug with fields for summary, description, environment, priority, affects version, fix
version, component, labels, attachments, and links ("is caused by", "blocks", "relates to" the story). Teams track
release readiness with JQL filters, for example:

    project = KK AND issuetype = Bug AND statusCategory != Done AND priority in (Highest, High)
    ORDER BY priority DESC, created ASC

Severity is often a custom field, because Jira's built-in field is Priority. Azure DevOps, Linear and GitHub Issues
have the same ideas under other names. Link each bug to its story and to the automated test that now guards it.`,
    workedExample: `**Scenario.** During the "coupon abuse" exploratory session you notice the discount on a ghee order looks large. Turn
that hunch into two reports a developer can act on.

**Step 1: reproduce with the smallest case, outside the UI.** Against the QA server (curl output as it printed):

    $ curl -s -X POST localhost:5055/api/carts
    {"cart_id":1}
    $ curl -s -X POST localhost:5055/api/carts/1/items -H "Content-Type: application/json" -d '{"sku":"GHEE1","qty":2}'
    {"cart_id":1,"delivery":0,"discount":0,"items":{"GHEE1":2},"subtotal":1220,"total":1220}
    $ curl -s -X POST localhost:5055/api/carts/1/coupon -H "Content-Type: application/json" -d '{"code":"SALE10"}'
    {"cart_id":1,"delivery":0,"discount":122,"items":{"GHEE1":2},"subtotal":1220,"total":1098}

10% of 1220 is 122; the rule caps it at 100. That is one bug.

**Step 2: keep probing the same area.** Apply it again:

    $ curl -s -i -X POST localhost:5055/api/carts/1/coupon -H "Content-Type: application/json" -d '{"code":"SALE10"}'
    HTTP/1.1 200 OK
    (other headers trimmed)
    {"cart_id":1,"delivery":0,"discount":244,"items":{"GHEE1":2},"subtotal":1220,"total":976}

A second, separate bug: the coupon stacks. Two causes, two fixes, so two reports.

**Step 3: write them.**

    BUG-2  SALE10 discount not capped at 100: 1220 subtotal gets 122 off
      Expected 100 off, total 1120 (KK-212: "10% off, at most 100 off").
      Actual 122 off, total 1098. Severity High, proposed P1.
    BUG-3  SALE10 can be applied repeatedly: second apply doubles discount to 244
      Expected second apply refused or ignored, discount stays 100 (KK-212: "once per cart").
      Actual 200 OK, discount 244, total 976. Severity Critical (unbounded with repeats), proposed P1.

Each carries the curl lines above as evidence, the build number and "Repro 5/5".

**Step 4: link and guard.** Link both to KK-212 and add the failing pytest checks (test_coupon_discount[1220-100],
test_coupon_applied_twice_counts_once) so that the fix is verified by a test that stays in the regression suite.`,
    mcqs: [
      mcq('A report says "Coupon not working. Expected: should work. Actual: wrong total." Which single addition would help the developer most?', [
        ['Exact steps with values and the actual and expected totals', true],
        ['A higher severity so the defect is looked at more quickly', false],
        ['The tester\'s opinion of which function contains the bug', false],
        ['A note that the defect was also seen by another tester', false],
      ], 'Reproduction needs exact steps, data and the numbers (122 against 100). A higher severity without information only wastes triage time, guessing the faulty function is the developer\'s job and often wrong, and a second witness adds no detail.'),
      mcq('On sale morning the home banner shows "Diwali Sale ends 13 Oct" instead of 3 Nov. Ordering works perfectly. How are severity and priority best set?', [
        ['Low severity, high priority', true],
        ['High severity, high priority', false],
        ['Low severity, low priority', false],
        ['High severity, low priority', false],
      ], 'Nothing is functionally broken (low severity), but every shopper sees wrong sale information today (high priority). Severity measures technical impact and priority measures business urgency; treating them as one scale gives the wrong answer here.'),
      mcq('Testing finds that SALE10 is not capped and also stacks when applied twice. How should these be reported?', [
        ['As two separate defects, each linked to story KK-212', true],
        ['As one defect titled "Coupon problems" listing both issues', false],
        ['As one defect, with the second added later as a comment', false],
        ['As a comment on story KK-212 instead of any defect report', false],
      ], 'Two causes need two fixes and two verifications; a combined report cannot be half-fixed and closed cleanly. A comment on the story is lost once the story is closed and is not tracked through triage and retest.'),
    ],
    checkpoint: [
      mcq('Which title best follows good practice for BUG-5?', [
        ['Checkout accepts 5-digit pincode 56003 and places the order', true],
        ['Pincode validation bug found in the checkout API endpoint', false],
        ['URGENT!!! Checkout is broken and accepting wrong values', false],
        ['Regex fullmatch pattern allows 4 to 5 digits after the first digit', false],
      ], 'A good title states what is wrong, where and with what input, so it can be found and triaged. "Pincode validation bug" says nowhere what fails, capitals and urgency are noise, and a title about the regex guesses the cause instead of describing the behaviour.'),
      mcq('Who normally has the final say on a defect\'s priority, and why?', [
        ['The product owner, because priority depends on business context', true],
        ['The tester, because the tester found and reproduced the defect', false],
        ['The developer, because only they know how long the fix will take', false],
        ['The QA lead, because priority is a measure of technical impact', false],
      ], 'Priority is business urgency, decided (usually in triage) by the product owner with input from QA and development. The tester proposes severity, effort informs but does not decide priority, and technical impact is severity, not priority.'),
      mcq('A developer moves BUG-4 to Fixed. What should happen before it is Closed?', [
        ['A tester retests on a build with the fix, with the original steps and nearby cases', true],
        ['The developer confirms that the unit tests pass on their own machine for the fix', false],
        ['The product owner reads the change and closes it if the code diff looks right', false],
        ['The defect is closed at once, and reopened if a shopper reports it once more', false],
      ], 'Verification on a build containing the fix, with the original steps plus a look around (qty 0 and -2, and 11), is the tester\'s job and guards against partial fixes. Local unit tests and reading the diff do not prove the deployed behaviour, and waiting for a shopper is how bugs reach production twice.'),
    ],
  },

  /* ── AGILE_QA ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TESTING_PRACTICE_AGILE_QA',
    notes: `Most QA jobs in India today sit inside a Scrum or Kanban team: five to nine people, two-week sprints, one backlog. The
tester is not a department downstream; the tester is in the room when the story is shaped. This lesson is how that
works day to day, and why it catches bugs earlier than any test tool.

## Testing inside the sprint

    Refinement    tester reads upcoming stories, asks questions, flags untestable ones
    Planning      testing effort is part of each story's estimate, not a separate "QA story"
    Daily         tester tests stories as they finish, pairs with developers on fixes
    Review/demo   tester shows what was tested, what was found and what was not covered
    Retro         tester brings data: where defects came from, what slowed testing

The anti-pattern to recognise is the **mini-waterfall**: developers code for nine days and hand everything over on day
nine, so testing is squeezed into the last afternoon, or spills into a "QA sprint" that runs one sprint behind. The fix is
to finish stories one at a time (smaller stories, limits on work in progress) so testing flows through the sprint, and to
automate the checks for a story inside the same sprint.

## Acceptance criteria

A user story says who wants what and why: "As a shopper, I want to apply SALE10 at checkout so that I save money in the
Diwali sale." Its **acceptance criteria** are the conditions that must be true for the product owner to accept it. They
are written before development and agreed by the team. Vague criteria make vague software:

    Weak:   "Coupon should give the correct discount."
    Strong: "SALE10 gives 10% off a subtotal of 300 or more, at most 100 off, once per cart.
             Below 300 it is refused with a message. The code is case-sensitive.
             Free delivery is judged on the subtotal before the discount."

Notice that every sentence of the strong version is testable, and that two of them (once per cart; judged before the
discount) answer questions that would otherwise have become bugs.

Acceptance criteria belong to one story. The **definition of done** applies to every story (reviewed, tested,
automated, no open High defects). A story is finished when it meets both.

## Three amigos

Before a story is pulled into a sprint, three perspectives look at it together for 20 to 30 minutes: the **business**
(product owner: what problem, what rules), **development** (how it could be built, what is hard) and **testing** (what
could go wrong, what is missing). The tester's questions are the point. For KK-212 they were:

    - What happens if SALE10 is applied twice?                       -> once per cart
    - Is the 500 free-delivery line before or after the discount?    -> before
    - Is "sale10" accepted?                                          -> no, case-sensitive
    - What does a shopper with a 299 cart see?                       -> a message, no discount
    - What if items are removed after the coupon and the subtotal drops below 300?  -> open: PO to decide

The last answer was "we don't know yet", which is a good outcome: the question is now on the story rather than in
production.

## BDD and Gherkin

Behaviour-driven development writes the agreed examples in a structured, readable form, **Given-When-Then**, so the same
text is a specification, a conversation record and (with a tool) an executable test:

    Feature: SALE10 Diwali coupon
      Background:
        Given a new cart

      Scenario: Coupon refused below the minimum
        Given the cart holds 1 x DAL1
        When the shopper applies coupon "SALE10"
        Then the coupon is refused with "coupon needs a subtotal of 300 or more"
        And the total is 200

      Scenario Outline: Discount and delivery on an eligible cart
        Given the cart holds <qty> x <sku>
        When the shopper applies coupon "SALE10"
        Then the discount is <discount>
        And the total is <total>

        Examples:
          | sku   | qty | discount | total |
          | DAL1  | 2   | 32       | 328   |
          | ATTA5 | 2   | 50       | 450   |
          | GHEE1 | 2   | 100      | 1120  |

Given sets up state, When is the one action, Then checks the outcome. Write steps in the language of the business
(**declarative**: "the cart holds 2 x GHEE1"), not of the screen (imperative: "I click the plus button twice and then
click Apply"); UI wording changes every sprint, rules do not. One behaviour per scenario. Scenario Outline with Examples
is how boundaries are listed without copying scenarios.

Tools bind each step to code: Cucumber (Java, JavaScript), behave and pytest-bdd (Python), SpecFlow/Reqnroll (.NET).
The binding is a thin layer; the value of BDD is the conversation, and a team can get most of it by writing the
examples and mirroring them in ordinary tests. Here the outline above is mirrored with pytest.mark.parametrize (a
pytest-bdd binding was not run for this lesson):

    test_acceptance.py::test_sale10[below-minimum] PASSED
    test_acceptance.py::test_sale10[just-eligible] PASSED
    test_acceptance.py::test_sale10[free-delivery] FAILED      assert 490 == 450
    test_acceptance.py::test_sale10[cap-applies] FAILED        assert 122 == 100

The "free-delivery" example is the interesting one. A 500 subtotal with 50 off should total 450 with free delivery
(judged before the discount). The app charged delivery, because of BUG-1 (fee only above 500). Without the three amigos
answer, a developer could have "fixed" this by judging delivery after the discount, which is a different, and wrong,
rule.

## Shift-left, and a little shift-right

**Shift-left** means moving testing activities earlier: reviewing stories (static testing), testability built into the
design (an API to set up test data, stable ids in the UI), unit and API tests written with the code, tests run on every
pull request, and testers reviewing developers' tests. Every step left makes a defect cheaper.

**Shift-right** complements it: feature flags, canary releases to 5% of users, production monitoring and alerts on
error rates, because some problems only appear with real traffic and real devices. Neither replaces the other.

## What a tester does when there is no tester role

Some product teams have no dedicated QA; developers test. In those teams an SDET or "quality coach" builds the
frameworks, teaches test design, and reviews the riskiest stories. The skills in this topic are the same; the title
changes.`,
    workedExample: `**Scenario.** Story KK-214 arrives in refinement: "As a shopper, I want free delivery on bigger orders so that I order
more in the sale. AC: delivery is free on orders of 500 and above." Run your part of the three amigos and leave the
team with examples they can test.

**Step 1: find the ambiguity.** "Orders of 500" could mean the subtotal, the total after discount, or the total after
delivery. Ask, and write the answer in the AC: "free when the subtotal before any discount is 500 or more".

**Step 2: ask about boundaries and odd cases.** Exactly 500? (free). 499? (40). A cart that drops below 500 after an
item is removed? (fee comes back). Negative quantities making the subtotal look small? That one surprises the
developer, and becomes a separate story for quantity validation (it was BUG-4).

**Step 3: write the examples as Gherkin.**

    Scenario Outline: Delivery fee depends on the subtotal
      Given the cart holds items worth <subtotal>
      When the shopper views the cart
      Then the delivery fee is <fee>

      Examples:
        | subtotal | fee |
        | 499      | 40  |
        | 500      | 0   |
        | 501      | 0   |

**Step 4: make them executable the same day.** The developer adds the parametrised unit test; on the current build it
fails exactly where the story's boundary is:

    FAILED test_pricing.py::test_delivery_fee_boundary[500-0] - assert 40 == 0

**Step 5: agree the done line.** The story is done when the three examples pass in CI, the API test for a 500 cart
passes, and the product owner has seen it on the QA server. The failing example is not a QA finding at the end of the
sprint; it is the developer's to-do list on day one. That is shift-left in one story.`,
    mcqs: [
      mcq('Developers finish all stories on day nine of a ten-day sprint and the tester works late on day ten. What is the best structural fix?', [
        ['Smaller stories finished one at a time, so testing flows through the sprint', true],
        ['A separate QA sprint after each development sprint for all of the testing', false],
        ['More testers on day ten so that the same work fits into the final afternoon', false],
        ['Drop testing from the definition of done when the sprint runs out of time', false],
      ], 'The mini-waterfall is a flow problem; finishing stories one by one, with limits on work in progress, spreads testing across the sprint. A QA sprint puts feedback a sprint behind, extra testers on day ten keeps the late-feedback shape, and dropping testing from done hides the problem.'),
      mcq('Which Gherkin step is written in the declarative style a BDD team should prefer?', [
        ['Given the cart holds 2 x GHEE1', true],
        ['Given I click the plus button twice on Ghee', false],
        ['When I type SALE10 into the box with id coupon-input', false],
        ['Then the red label under the Apply button disappears', false],
      ], 'Declarative steps describe business state and rules, so they survive UI redesigns. Clicking buttons, typing into an element by id and checking a label\'s colour are imperative UI details that break when the screen changes, and they hide the rule being specified.'),
      mcq('In a three amigos session, which question from the tester is most valuable for story KK-212 (SALE10)?', [
        ['If items are removed after the coupon and the subtotal drops below 300, what happens?', true],
        ['Which Python library will the developers use to round the discount amount in code?', false],
        ['How many test cases should I write for this story to match the sprint estimate?', false],
        ['Can the developers send me the build earlier this sprint so that I can start testing?', false],
      ], 'The tester\'s job in three amigos is to expose missing rules and edge cases before code exists; this one had no answer yet and went onto the story. The library choice is an implementation detail, the case count follows from the rules, and build timing is a planning matter rather than a gap in the story.'),
    ],
    checkpoint: [
      mcq('What is the difference between acceptance criteria and the definition of done?', [
        ['Acceptance criteria are specific to one story; the DoD applies to every story', true],
        ['Acceptance criteria are written by testers; the DoD is written by developers', false],
        ['Acceptance criteria apply after release; the DoD applies before the release', false],
        ['They are two names for the same checklist, used in different agile frameworks such as Scrum', false],
      ], 'Acceptance criteria state the rules one story must meet; the DoD is the team-wide quality checklist (reviewed, tested, automated, no open High defects). Both are agreed by the team, both apply before acceptance, and they are different lists.'),
      mcq('In Given-When-Then, what does the "When" step describe?', [
        ['The single action whose outcome the scenario checks', true],
        ['The state the system must be in before the scenario', false],
        ['The expected result that the scenario will assert', false],
        ['The test data rows used by the Scenario Outline', false],
      ], 'Given sets up state, When is the one action under test, Then checks the outcome; the Examples table supplies the rows for an outline. A scenario with several When steps is usually testing several behaviours at once.'),
      mcq('Which practice is an example of shifting testing left on KiranaKart?', [
        ['Reviewing story KK-214\'s acceptance criteria before development starts', true],
        ['Rolling the sale build out to five per cent of shoppers as a canary', false],
        ['Alerting on the error rate of the checkout API in production at night', false],
        ['Running a full manual regression pass on the day before the release', false],
      ], 'Shift-left moves testing earlier; a requirement review is the earliest. Canary releases and production alerting are shift-right practices (valuable, but later), and a manual regression pass the day before release is the late-gate model shift-left is moving away from.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TESTING_PRACTICE_DEBUGGING',
    notes: `Testing practice goes wrong in recognisable ways: tests that cannot fail, tests that fail for the wrong reason, reports
nobody can reproduce, and numbers that look green while the product is red. Each case below happened on the KiranaKart
project; the pytest output is real. For each: the symptom, the cause, and the one fix.

## 1. The test that cannot fail

**Symptom.** BUG-2 (coupon cap) reached the QA server even though the developer had "a test for the cap", and it passed:

    def test_coupon_is_capped_at_100():
        c = create_app().test_client()
        cid = c.post("/api/carts").get_json()["cart_id"]
        c.post(f"/api/carts/{cid}/items", json={"sku": "GHEE1", "qty": 2})
        r = c.post(f"/api/carts/{cid}/coupon", json={"code": "SALE10"})
        r.get_json()["discount"] == 100

    $ pytest -q dbg/test_d1_no_assert.py
    1 passed in 0.44s

**Cause.** The last line is a comparison whose result is thrown away; there is no assert. The test exercises the code
but checks nothing.

**Fix.** Add assert. Then prove the test can fail: run it against the known-bad build first:

    FAILED dbg/test_d1_no_assert.py::test_coupon_is_capped_at_100 - assert 122 ==...
    1 failed in 0.66s

A new test you have never seen fail is a test you have not verified. Reviewers should look for
asserts in every test the way they look for error handling in code.

## 2. The expected value copied from the app

**Symptom.** The delivery boundary had a test, it passed, and BUG-1 shipped anyway:

    def test_delivery_at_500():
        # expected value copied from what the app returned on the tester's laptop
        assert delivery_fee(500) == 40

**Cause.** The test's **oracle** (where the expected value comes from) was the system under test. The rule says
"free from 500"; the app said 40, so the test enshrined the bug.

**Fix.** Expected values come from the requirement, the product owner, or an independent calculation, never from
running the code. Write "rule KK-214: free from 500" next to the case. When the app and the spec disagree, that is a
question or a defect, not a test to update.

## 3. Tests that pass or fail depending on order

**Symptom.** test_first_cart_has_no_items fails in the full run with a leftover item, and fails differently when run on
its own; in CI, where tests are split across workers, the failure moves around from run to run:

    client = create_app().test_client()   # one app, one cart store, shared by every test

    def test_new_cart_starts_empty():
        cid = client.post("/api/carts").get_json()["cart_id"]
        client.post(f"/api/carts/{cid}/items", json={"sku": "ATTA5", "qty": 1})
        assert cid == 1

    def test_first_cart_has_no_items():
        assert client.get("/api/carts/1").get_json()["items"] == {}

    $ pytest -q dbg/test_d2_shared.py
    FAILED dbg/test_d2_shared.py::test_first_cart_has_no_items - AssertionError: ...
    E         Left contains 1 more item:
    E         {'ATTA5': 1}

    $ pytest -q dbg/test_d2_shared.py -k first_cart
    E       KeyError: 'items'

**Cause.** Shared state at module level: the second test depends on the cart the first one created (together it
finds the ATTA5; alone, cart 1 does not exist and the 404 body has no "items"). The test is checking the history of the
test run, not the product.

**Fix.** Each test creates what it needs through a fixture (a fresh create_app() and its own cart), as the client and
cart fixtures in test_api.py do. "Fixtures and Parametrised Tests" covered the mechanics; the testing principle is
independence: any test, alone or in any order, gives the same answer.

## 4. "Cannot reproduce"

**Symptom.** "SALE10 coupon is rejected" was closed as Cannot Reproduce. The developer tried a big cart and it worked.

**Cause.** The report omitted the data. Reproducing it with the details the tester had not written down:

    ATTA5 x1, apply SALE10   -> 400 {'error': 'coupon needs a subtotal of 300 or more'}
    ATTA5 x1, apply sale10   -> 400 {'error': 'unknown coupon'}

The tester's cart was 250, below the minimum, and the app behaved as specified. The real finding, if any, is that the
message does not tell the shopper how much more to add, which is a usability suggestion, not a defect.

**Fix.** Steps with exact data, the actual response copied verbatim, and the expected result with its source. Writing
the expected result with its rule beside it often shows the tester, before anyone else, that it is not a bug.

## 5. Green by skipping

**Symptom.** The release report said "regression: 100% passed" and the exit criterion was met. Two days later shoppers
got 122 off. The run's last line was the clue:

    $ pytest -q -rs dbg/test_d5_skipped.py
    SKIPPED [1] dbg\\test_d5_skipped.py:4: fails on 1.4.0, check later
    SKIPPED [1] dbg\\test_d5_skipped.py:11: fails on 1.4.0, check later
    5 passed, 2 skipped in 0.40s

**Cause.** Failing cases were marked skip to get a clean run, and the exit criterion counted only failures. The failing
tests were telling the truth.

**Fix.** Never skip a test because it fails. If a known bug is accepted for release, mark it xfail with the defect id and
strict=True, so it shows in every report and turns into a failure the moment the bug is fixed and someone forgets to
remove the marker:

    pytest.param(500, 0, marks=pytest.mark.xfail(reason="BUG-1 KK-231: fee at exactly 500", strict=True))

    $ pytest -q -rx dbg/test_d5_xfail.py
    XFAIL dbg/test_d5_xfail.py::test_delivery_fee_boundary[500-0] - BUG-1 KK-231: fee at exactly 500
    2 passed, 1 xfailed in 0.56s

And write exit criteria that count skipped and xfailed tests as "not passed".

## The pattern

Every case is the same mistake in a different place: something looked like evidence and was not. Before trusting a
green result, ask what would have made it red.`,
    mcqs: [
      mcq('A new test for the coupon cap passes on the first run against a build known to have the bug. What should you suspect first?', [
        ['The test does not actually assert on the discount', true],
        ['Someone else fixed the bug in the meantime on that build', false],
        ['The test framework is caching an earlier result', false],
        ['The coupon cap bug only appears in production', false],
      ], 'A test that passes against a known-bad build is not checking what it claims; the commonest cause is a missing assert (a bare comparison). Check the build before assuming a fix, pytest does not cache results that way, and the bug reproduces locally, so "only in production" does not fit.'),
      mcq('test_first_cart_has_no_items passes in one run order and fails in another. What is the most likely cause?', [
        ['Tests share state, so one depends on what another created', true],
        ['The Flask test client is too slow when run under parallel workers', false],
        ['The assertion compares dictionaries in a different order', false],
        ['pytest picks tests at random unless they are numbered', false],
      ], 'Order-dependent results mean shared state: here a module-level app whose cart store carries data between tests. The test client is in-process, so speed is not the issue; dict equality ignores key order; and pytest runs tests in file order by default.'),
      mcq('Your test asserts delivery_fee(500) == 40 because that is what the app returned. The story says delivery is free from 500. What is wrong?', [
        ['The expected value came from the system under test instead of the requirement', true],
        ['The test should use parametrize so that 499, 500 and 501 are all checked', false],
        ['The test checks a pure function and should go through the API instead', false],
        ['The test needs a fixture to create a fresh cart before checking the fee', false],
      ], 'The oracle must be independent of the code; copying the app\'s answer turns a bug into a passing test. Parametrising, testing through the API or adding fixtures could all be good ideas, but every one of them would still assert the wrong expected value.'),
      mcq('A known bug will ship and the team accepts it. How should its failing test be handled?', [
        ['Mark it xfail with the defect id and strict=True', true],
        ['Mark it skip until the next release has been planned', false],
        ['Delete it and re-create it after the fix ships', false],
        ['Change the expected value to match the bug', false],
      ], 'A strict xfail keeps the known failure visible in every report and fails the run once the bug is fixed, prompting removal of the marker. Skip hides it from "passed" counts, deleting loses the check, and changing the expected value turns the test into a guard for the bug.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TESTING_PRACTICE_PRACTICE',
    notes: `Nine exercises on KiranaKart and two other fictional products, easiest first. Write your answer before reading the one
below it. The app responses quoted come from the real KiranaKart build used in the lessons.

## 1. Level and type (easy)

For each check, name the test level and the type: (a) coupon_discount(1220) returns 100; (b) adding GHEE1 then reading
the cart through the API shows subtotal 610; (c) a Tamil-speaking shopper can complete an order on a mid-range Android
phone; (d) the regional manager signs off the sale flow before launch.

**Answer.** (a) Unit, functional (boundary of the cap). (b) Integration, functional. (c) System, non-functional
(localisation and compatibility; usability too). (d) Acceptance (UAT), functional against the business need.

## 2. Smoke, sanity or regression? (easy)

(a) Build 1.4.1 lands at 9 a.m.; you create a cart, add an item and check out before anything else. (b) After the
pincode fix you try 56003, 560034 and 056003 and nothing more. (c) The nightly run of all 240 automated checks.

**Answer.** (a) Smoke: is the build testable at all. (b) Sanity: narrow check of the changed area. (c) Regression:
broad check that nothing that worked has broken.

## 3. Score the risks (easy)

A bus-booking app, BusYatri, adds three features. Scores are likelihood x impact (1 to 5): seat selection map (new
code, complex: 4, impact 4), refund on cancellation (changed code: 3, money: 5), profile photo upload (2, 2). Rank them
and say how deep each goes.

**Answer.** Seat map 16, refund 15, photo 4. Seat map first: boundary and state tests for double booking plus an
exploratory session; refund a close second (15): every refund rule automated, because it is money; photo upload (4):
a couple of checks (size limit, wrong file type). Note how close 15 and 16 are; that is a discussion, not a ranking.

## 4. Three-point estimate (easy)

Testing the refund rules: optimistic 3 h, most likely 5 h, pessimistic 13 h. Give the estimate and what the spread tells
the lead.

**Answer.** (3 + 4 x 5 + 13) / 6 = 36 / 6 = 6 hours. The spread (3 to 13) says the work is uncertain, probably because
the refund rules are not fully known; the lead should get them clarified rather than just plan for 6.

## 5. Severity and priority (medium)

Set severity and priority for: (a) BUG-6, "placed sucessfully" on the confirmation; (b) the app crashes when a shopper
in the Andaman pincode range (744xxx) checks out, and KiranaKart does not deliver there yet; (c) BUG-3, the coupon
stacks; (d) the logo shows the old brand colour on the login screen, and the rebrand campaign launches tomorrow.

**Answer.** (a) Low, low (unless the text is used in marketing this week). (b) High severity (a crash), low priority
(no shopper can reach that path until the region launches); fix before launch there. (c) Critical, P1: money lost with
no limit. (d) Low severity, high priority: cosmetic, but the business needs it for tomorrow.

## 6. Rewrite a report (medium)

Rewrite this as a report a developer can act on: "Pincode check broken. Expected: proper validation. Actual: wrong
pincode accepted."

**Answer.**

    Title:     Checkout accepts 5-digit pincode 56003 and places the order
    Build/env: KiranaKart 1.4.0, QA server, API
    Steps:     1. POST /api/carts  2. POST /api/carts/4/items {"sku": "ATTA5", "qty": 1}
               3. POST /api/carts/4/checkout {"pincode": "56003"}
    Expected:  400 "invalid pincode" (rule KK-215: 6 digits, not starting with 0)
    Actual:    201 {"order_id": "KK-1004", "total": 290, "message": "Your order is placed sucessfully"}
    Also:      560034 accepted (correct); 056003, 5600345 and 56OO34 refused (correct)
    Repro:     5/5    Severity: High (undeliverable orders)    Proposed priority: P2

The "Also" line saves the developer time: it shows exactly which partition is wrong.

## 7. Write the Gherkin (medium)

Write a Scenario Outline for the pincode rule with at least five examples.

**Answer.**

    Scenario Outline: Only valid Indian pincodes are accepted at checkout
      Given a cart holding 1 x ATTA5
      When the shopper checks out with pincode "<pincode>"
      Then the checkout is <result>

      Examples:
        | pincode | result   |
        | 560034  | accepted |
        | 56003   | refused  |
        | 5600345 | refused  |
        | 056003  | refused  |
        | 56OO34  | refused  |

The second row fails on build 1.4.0; that is BUG-5.

## 8. Find the gaps (medium)

Story: "As a shopper, I can cancel my order and get a refund. AC: cancelled orders are refunded." List the questions you
would ask at three amigos.

**Answer.** Until when can an order be cancelled (before packing, before dispatch)? Full or partial refund; is the
delivery fee refunded; what about a SALE10 discount? Refund to which method (UPI, card, wallet) and in how many days?
Can part of an order be cancelled? What does the shopper see, and is there a confirmation message or SMS? What if the
payment is still pending? Who can cancel (shopper, support agent)? Each answer becomes a testable criterion.

## 9. Judge the exit criteria (hard)

A plan says: "Exit: 100% of test cases executed and passed; zero open defects." Critique it and rewrite it.

**Answer.** "100% passed" can be met by skipping or deleting failing cases (the Debugging lesson's "green by
skipping"), and "zero open defects" is rarely realistic and pushes people to close or downgrade bugs. Rewrite:

    - All High-risk cases executed; at least 95% of all planned cases executed
    - Skipped and xfailed tests reported and counted as not passed
    - No open Critical or High defects; open Medium/Low defects reviewed and accepted by the PO
    - Regression suite green in CI on the release build`,
    mcqs: [
      mcq('BusYatri\'s refund rules score likelihood 3 and impact 5; its photo upload scores 2 and 2. Which plan matches risk-based testing?', [
        ['Automate every refund rule and give photo upload a couple of checks', true],
        ['Test both to the same depth so that no feature is treated unfairly', false],
        ['Test photo upload first, as it is quick to finish and clear off', false],
        ['Skip photo upload entirely and spend every hour on the refunds', false],
      ], 'Risk 15 against 4 says the refunds earn depth, while a low-risk feature still gets a few cheap checks. Equal depth ignores risk, ordering by ease optimises the to-do list rather than the product, and zero testing leaves a known gap nobody accepted.'),
      mcq('The app crashes at checkout for a pincode range KiranaKart does not serve yet. How should it be classified?', [
        ['High severity, low priority until that region launches', true],
        ['Low severity, high priority because crashes look bad', false],
        ['Low severity, low priority because no one reaches it', false],
        ['High severity, high priority as every crash is urgent', false],
      ], 'A crash is a severe failure, but no shopper can reach that path yet, so it can wait for the region\'s launch (and must be fixed before it). Severity does not drop because few users hit it, and priority is not automatically high because the failure is a crash.'),
      mcq('Testing the cancellation feature has estimates of 3, 5 and 13 hours (optimistic, likely, pessimistic). What is the PERT estimate?', [
        ['6 hours', true],
        ['5 hours', false],
        ['7 hours', false],
        ['13 hours', false],
      ], '(3 + 4 x 5 + 13) / 6 = 36 / 6 = 6. 5 is the most likely value alone, 7 is the plain average of the three, and 13 is the pessimistic case; the weighted formula sits between them.'),
      mcq('Which Gherkin row would catch BUG-5 on KiranaKart build 1.4.0?', [
        ['| 56003 | refused |', true],
        ['| 560034 | accepted |', false],
        ['| 056003 | refused |', false],
        ['| 5600345 | refused |', false],
      ], 'BUG-5 lets a five-digit pincode through, so only the five-digit example fails on that build. The valid pincode is accepted correctly, a leading zero is refused correctly, and the seven-digit value is refused correctly; those rows pass.'),
      mcq('Which question is the most useful one to ask about "cancelled orders are refunded"?', [
        ['Is the delivery fee refunded, and what happens to a SALE10 discount?', true],
        ['Should the refund button be green or blue on the order details page?', false],
        ['Which developer is writing the refund code during this sprint?', false],
        ['How many test cases will the refund story need in the test plan?', false],
      ], 'It exposes missing money rules that would otherwise become defects. Button colour is a design detail, who codes it is planning, and the number of cases follows from the rules once they are known.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TESTING_PRACTICE_INTERVIEW_QUESTION',
    notes: `Four questions that come up in almost every QA and SDET first round in India, from service companies to product
start-ups, with a model answer and the follow-up a good answer earns. Answer aloud first; say it in under two minutes.

## 1. "What is the difference between severity and priority? Give an example where they differ."

**Model answer.** Severity is the technical impact of the defect on the system or user, proposed by the tester. Priority
is how urgently the business wants it fixed, decided by the product owner, usually in triage. They are independent.
High severity, low priority: a report export that crashes, but only for a yearly report nobody runs until March. Low
severity, high priority: the sale banner shows the wrong end date on sale day; nothing is broken, but every customer sees
it. On a grocery API I tested, a coupon that stacked when applied twice was both Critical and P1, because money was lost
with no upper limit.

**Follow-up.** "Who should set priority, and what if the developer disagrees?" Answer: the product owner sets it with
input; disagreements go to triage with evidence (how many users, money, a workaround), not to a comment war in the ticket.

## 2. "Explain smoke, sanity and regression testing."

**Model answer.** Smoke is broad and shallow, on a new build, to decide whether it is worth testing: create a cart, add
an item, check out. Sanity is narrow and quick, after a small change or fix, to check that area basically works. Regression
is broad and deep, to check that nothing that used to work has broken; it is the suite we automate first because we run
it the most. In pytest I keep smoke as a marker, so "pytest -m smoke" runs in seconds on every deployment.

**Follow-up.** "Your regression suite takes four hours. What do you do?" Answer: push checks down the pyramid (API
instead of UI where possible), run in parallel, split a fast smoke and a critical-path suite for every merge from the full
nightly run, and delete tests that duplicate each other. (Quality in CI covers this in depth.)

## 3. "You have two days to test a release and no test cases exist. What do you do?"

**Model answer.** I would not try to test everything. First, an hour with the product owner and developers to list what
changed and what could hurt most: money, login, data loss, the main user journeys. I score those by likelihood and impact
and write a one-page plan: in scope, out of scope, approach, exit criteria. Day one: smoke, then the highest-risk areas
with boundary and negative cases, automating the API checks that will be needed again; one time-boxed exploratory
session on the riskiest feature. Day two: retest fixes, regression around them, then the next risks. I report daily with
what was tested, what was found and what was not covered, so the release decision is made with known risks.

**Follow-up.** "What if the release date cannot move and there are open High defects?" Answer: my job is to make the risk
visible with evidence (impact, workaround, users affected); the product owner decides. Options include a feature flag to
switch the risky feature off, a hotfix plan, or releasing with a known-issue note.

## 4. "What makes a good bug report?"

**Model answer.** A developer can reproduce it without talking to me. A title that says what fails, where, with what
input; build and environment; preconditions and test data; minimal numbered steps with exact values; expected result
with its source (story or rule); actual result copied exactly, including status codes and messages; reproducibility;
evidence such as a screenshot, a curl command and response, logs or a HAR file; severity. One bug per report, and no real
customer data in it. Then I link it to the story and, once fixed, to the automated test that guards it.

**Follow-up.** "A developer closes your bug as Cannot Reproduce. What next?" Answer: reproduce it again myself on the
same build, compare environment and data (different account, cart value, browser, feature flag), add what was missing,
and if it is intermittent, say so with frequency and conditions. Often the missing detail is the data: a coupon rejected
on a 250-rupee cart was correct behaviour, and writing the expected result with its rule showed that.`,
    mcqs: [
      mcq('In an interview you are asked for a "low severity, high priority" example. Which answer fits best?', [
        ['The sale banner shows the wrong end date on the sale\'s first morning', true],
        ['A yearly tax export crashes for carts holding over five hundred lines', false],
        ['Checkout accepts negative quantities and sells goods below their cost', false],
        ['The order history page loads slowly for users with very old accounts', false],
      ], 'Nothing is technically broken, yet every customer sees wrong information today, so it is urgent. The tax export crash is high severity and low priority, negative quantities are high on both, and a slow page for few users is a performance issue of moderate severity and usually modest priority.'),
      mcq('Asked what to do with two days, no test cases and a release to test, which opening shows the strongest judgement?', [
        ['List what changed and what could hurt most, then plan by risk', true],
        ['Write full test cases for every feature before testing anything', false],
        ['Run exploratory testing on the whole app until time runs out', false],
        ['Automate a UI regression suite first so the next release is faster', false],
      ], 'Risk-led planning spends two days where failure would hurt most and makes gaps explicit. Writing every case first uses up the window, unstructured exploration has no priorities or report, and building UI automation first delays any feedback on this release.'),
      mcq('A developer marks your defect "Cannot Reproduce". What is the best first step?', [
        ['Reproduce it again and compare build, data and environment', true],
        ['Reopen it at once with a higher severity to get attention', false],
        ['Accept the resolution, because the developer knows the code', false],
        ['Escalate it to the QA manager to overrule the developer', false],
      ], 'Most "cannot reproduce" cases come from missing data or environment details; reproducing and comparing finds what to add, or shows it was not a bug. Raising severity or escalating adds pressure without information, and accepting it unexamined may let a real bug go.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TESTING_PRACTICE_CHECKPOINT',
    notes: `Ten questions across the whole topic: the QA and SDET roles, test levels and types, plans and risk, defect reports and
triage, and testing in an agile team. Answer without notes; any you miss point to the lesson to reread.`,
    checkpoint: [
      mcq('Which activity is part of the STLC "requirement analysis" step?', [
        ['Asking whether free delivery is judged before or after the discount', true],
        ['Retesting the delivery fix on build 1.4.1 with the original steps', false],
        ['Writing the closure report that lists everything that was not tested at all', false],
        ['Loading synthetic catalogue data on the QA server before testing', false],
      ], 'Requirement analysis reads stories and rules for gaps and testability, before code exists. Retesting a fix is execution, the report is closure, and loading data is environment setup.'),
      mcq('For KiranaKart, which risk is best caught by an integration (API) test rather than a unit test?', [
        ['The coupon discount being counted again when applied twice', true],
        ['coupon_discount returning 30 for a subtotal of exactly 300', false],
        ['delivery_fee returning 40 for a subtotal of exactly 499', false],
        ['coupon_discount returning 0 for a subtotal of exactly 299', false],
      ], 'The stacking lives in the route and cart state, which only a test through the API exercises. The other three are pure-function boundaries, cheapest and clearest as unit tests.'),
      mcq('What is the main argument of the "testing trophy" against a strict test pyramid?', [
        ['Integration tests give the most confidence per test for most web apps', true],
        ['UI end-to-end tests should outnumber all other kinds of automated test', false],
        ['Unit tests are no longer useful once a team has static type checking', false],
        ['Manual testing finds more bugs than automation and should be the base', false],
      ], 'The trophy keeps unit tests and static checks but weights integration tests, since many bugs live where parts connect. It does not favour UI tests (that is closer to the ice-cream cone), does not discard unit tests, and is about automated tests rather than a manual base.'),
      mcq('Which pair correctly distinguishes a test strategy from a test plan?', [
        ['Strategy: lasting approach for the product; plan: one release\'s scope and schedule', true],
        ['Strategy: written by testers alone; plan: written by the product owner alone', false],
        ['Strategy: a list of every test case; plan: the summary of results at the end', false],
        ['Strategy: required only in waterfall projects; plan: required only in agile projects', false],
      ], 'The strategy sets the long-lived approach (levels, tools, automation, gates); the plan applies it to one release, sprint or feature. Neither is a case list or a results report, both are team documents, and both exist in agile and waterfall work.'),
      mcq('Risk is scored as likelihood x impact. Which change to KiranaKart would most raise the likelihood score of the coupon area?', [
        ['Three defects were found in the coupon code in the first day of testing', true],
        ['The sale is expected to bring twice as many shoppers as last year\'s', false],
        ['The coupon now applies to the most expensive items in the catalogue', false],
        ['The marketing team will feature the coupon in a television campaign', false],
      ], 'A defect cluster is strong evidence that more defects are nearby, so likelihood rises. More shoppers, higher-value items and a TV campaign all raise the impact of a coupon failure, not the chance that the code is wrong.'),
      ck('TECHNICAL_COMMUNICATION', 'Which "Expected" line in a KiranaKart defect report is written best?', [
        ['Expected: 100 off, total 1120 (KK-212: 10% off, at most 100)', true],
        ['Expected: the discount should be correct and work properly', false],
        ['Expected: the coupon should behave the same as it did before', false],
        ['Expected: developer to fix the coupon calculation this sprint', false],
      ], 'A good expected result gives exact values and cites the rule they come from, so anyone can check it. "Correct" and "as before" are opinions without a source, and asking for a fix is a request, not an expected behaviour.'),
      ck('TECHNICAL_COMMUNICATION', 'A tester\'s report contains a real customer\'s phone number and address copied from a production order. What is the problem?', [
        ['Personal data is now spread into the tracker; synthetic or masked data should be used', true],
        ['Nothing, because the bug tracker is internal and only the project team can open it', false],
        ['The report is too long; the address should be moved into an attached text file', false],
        ['The phone number should be included, but the address must be removed from it', false],
      ], 'Defect trackers are widely shared and long-lived; copying real personal data into them breaks data-protection duties such as the DPDP Act. Being internal does not make it acceptable, attaching it is the same exposure, and the phone number is personal data too.'),
      mcq('In the defect lifecycle, what should happen when a retest of a "Fixed" defect still fails?', [
        ['It is Reopened with the new evidence and returns to the developer', true],
        ['A new defect is raised and the old one is closed as a duplicate', false],
        ['It is marked Deferred so that the release can go ahead on time', false],
        ['It is marked Verified, since the developer has already changed code', false],
      ], 'A failed retest sends the same defect back with the new evidence, keeping its history together. A new defect splits that history, deferral is a business decision rather than a retest result, and a code change that does not fix the behaviour is not verification.'),
      mcq('In a three amigos session, who brings which perspective?', [
        ['Product owner the business rules, developer the build, tester the risks', true],
        ['Tester the business rules, developer the risks, product owner the build', false],
        ['Scrum master the rules, tester the build, developer the release dates', false],
        ['Product owner the risks, tester the build, developer the business rules', false],
      ], 'Three amigos joins the business view (what problem, which rules), the development view (how it can be built) and the testing view (what can go wrong, what is missing) before work starts. The other pairings swap the roles and lose the reason for the meeting.'),
      mcq('A release report says "regression 100% passed", but the run ended "212 passed, 9 skipped". What should a QA engineer conclude?', [
        ['Nine checks did not run; the report overstates what was verified', true],
        ['Skipped tests count as passed, so the report is entirely accurate', false],
        ['The run was flaky, so it should simply be retried until it is clean', false],
        ['Skipped tests are always obsolete and can be safely deleted later', false],
      ], 'Skipped tests verified nothing, so "100% passed" is misleading; find out why each was skipped, and use strict xfail with a defect id for accepted known bugs. Skips are not passes, nothing indicates flakiness, and skipped tests may be the ones hiding real failures.'),
    ],
  },
];
