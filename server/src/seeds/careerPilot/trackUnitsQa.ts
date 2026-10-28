import { TopicSeed } from './year1MegaCurriculum';
import { u } from './year4UnitKit';
import { ending } from './trackUnitsWeb';
import { interview } from './trackUnitsPlacement';

/**
 * Career-track content for QA / SDET — the engineer who proves software wrong before users do. The
 * track stands on Core Python, Git, the years' testing, test design, API, HTTP and debugging lessons,
 * and the Python Full Stack track's pytest topic (packs CORE_PYTHON, GIT_TOOLS, QA_YEAR_BASICS); these
 * topics add what a QA engineer or SDET does at work: design tests, automate the browser with
 * Playwright and Selenium, test APIs, test performance, run quality in CI, and cover mobile,
 * accessibility and basic security checks.
 *
 * Python is the main language (pytest, Playwright, Selenium, requests, Locust); one topic teaches the
 * Java stack many Indian employers ask for (Selenium with Java, TestNG, REST Assured). Everything runs
 * locally against demo apps the student owns or runs. Skills: TEST_DESIGN, UI_TEST_AUTOMATION,
 * API_TESTING and PERFORMANCE_TESTING (careerSkillTaxonomy.ts), with the years' testing skills.
 */

/** Batch QA1: foundations — testing as a practice, test design, test data and SQL for testers. */
export const TRACK_QA_FOUNDATIONS: Record<string, TopicSeed> = {
  /* ── Testing as a practice ── */
  QA_TESTING_PRACTICE: { category: 'UNIVERSAL', units: [
    u('QA_ROLE', 'What QA Engineers and SDETs Do', 'Quality as a team outcome, the QA engineer, SDET and test-lead roles, where testing sits in the SDLC and STLC, and what "done" means.',
      ['Explain what a QA engineer and an SDET are responsible for and where they fit in a team'], 35),
    u('LEVELS_TYPES', 'Test Levels, Types and the Test Pyramid', 'Unit, integration, system and acceptance testing; functional and non-functional; smoke, sanity and regression; and the test pyramid and its critics.',
      ['Choose the right level and type of test for a given risk'], 40, { after: ['QA_ROLE'] }),
    u('PLAN_STRATEGY', 'Test Plans, Test Strategy and Risk-Based Testing', 'What a test plan and a test strategy contain, entry and exit criteria, estimating, and spending effort where the risk is.',
      ['Write a test strategy and plan that put effort where the risk is'], 40, { after: ['LEVELS_TYPES'] }),
    u('BUG_REPORTS', 'Defects: Finding, Reporting and the Bug Lifecycle', 'A bug report a developer can act on, severity versus priority, the defect lifecycle, triage, and Jira in practice.',
      ['Write defect reports that get bugs fixed and run a triage'], 40, { after: ['PLAN_STRATEGY'] }),
    u('AGILE_QA', 'QA in Agile Teams and Shift-Left Testing', 'Testing in sprints, acceptance criteria and BDD (Given-When-Then), three amigos, definition of done, and testing earlier.',
      ['Work as a tester inside an agile team from story to release'], 35, { after: ['BUG_REPORTS'] }),
    ...ending('Testing as a Practice', 'AGILE_QA', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── Test design ── */
  QA_TEST_DESIGN: { category: 'UNIVERSAL', units: [
    u('PARTITIONS_BOUNDARIES', 'Equivalence Partitions and Boundary Values', 'Splitting inputs into classes that behave alike, picking boundary values, and the off-by-one bugs boundaries catch.',
      ['Derive a small set of tests from input partitions and their boundaries'], 40),
    u('DECISION_TABLES', 'Decision Tables and Cause-Effect', 'Business rules with several conditions, building and reducing a decision table, and turning it into tests.',
      ['Test business rules with combinations of conditions using decision tables'], 40, { after: ['PARTITIONS_BOUNDARIES'] }),
    u('STATE_TRANSITIONS', 'State Transition Testing', 'States, events and guards, valid and invalid transitions, and testing an order or a payment through its life.',
      ['Model a feature as states and transitions and test every path that matters'], 40, { after: ['DECISION_TABLES'] }),
    u('COMBINATORIAL', 'Pairwise and Combinatorial Testing', 'Why testing every combination is impossible, pairwise coverage, and generating a small covering set.',
      ['Cover many settings and browsers with a small pairwise test set'], 35, { after: ['STATE_TRANSITIONS'] }),
    u('EXPLORATORY', 'Exploratory Testing and Heuristics', 'Charters and sessions, test heuristics and tours, note-taking, and finding the bugs scripts miss.',
      ['Run a time-boxed exploratory session from a charter and report what it found'], 40, { after: ['COMBINATORIAL'] }),
    u('FROM_STORIES', 'From User Stories to Test Cases', 'Reading acceptance criteria for gaps, writing clear test cases, traceability, and keeping a test suite small and current.',
      ['Turn user stories into a traceable, maintainable set of test cases'], 35, { after: ['EXPLORATORY'] }),
    ...ending('Test Design', 'FROM_STORIES', { project: ['MINI_PROJECT', 'Mini Project — Test Design for a Bus-Ticket Booking Flow',
      'For a bus-ticket booking web app: from its user stories, design the tests with partitions, boundaries, a decision table for fares and discounts, and a state model for bookings, run an exploratory session, and report the defects you find.'] }),
  ] },

  /* ── Test data and SQL for testers ── */
  QA_TEST_DATA_SQL: { category: 'UNIVERSAL', units: [
    u('SQL_FOR_TESTERS', 'SQL for Testers: Verifying What Really Happened', 'Checking what an action actually wrote to the database, joins to follow a record, and catching duplicates and orphans.',
      ['Verify an application\'s behaviour by querying the database it writes to'], 40),
    u('TEST_DATA', 'Test Data: Creating, Masking and Cleaning Up', 'Seeding data for a test, factories and fixtures, synthetic data, masking production copies, and leaving no trace.',
      ['Create and clean up the data a test needs, without using real personal data'], 40, { after: ['SQL_FOR_TESTERS'] }),
    u('DATA_TESTING', 'Testing Reports, Exports and Data Pipelines', 'Reconciling totals, testing a CSV export or a report, and the checks a tester adds to a data flow.',
      ['Test reports, exports and data flows for correctness'], 35, { after: ['TEST_DATA'] }),
    ...ending('Test Data and SQL for Testers', 'DATA_TESTING', { minutes: [40, 50, 35, 40] }),
  ] },
};

/** Batch QA2: automation — pytest frameworks, Playwright, Selenium with Java, API testing. */
export const TRACK_QA_AUTOMATION: Record<string, TopicSeed> = {
  /* ── A pytest test framework ── */
  QA_PYTEST_FRAMEWORK: { category: 'UNIVERSAL', units: [
    u('FRAMEWORK_DESIGN', 'Designing a Test Automation Framework', 'Layers of a framework, configuration per environment, where test data lives, and what makes a framework easy to extend.',
      ['Design the structure of a test automation framework a team can grow'], 40),
    u('FIXTURES_DEEP', 'Fixtures, Scopes and conftest at Scale', 'Fixture scopes and teardown, factories as fixtures, sharing through conftest, and avoiding hidden coupling between tests.',
      ['Organise fixtures so tests are independent, fast and readable'], 40, { after: ['FRAMEWORK_DESIGN'] }),
    u('DATA_DRIVEN', 'Data-Driven and Parametrised Tests', 'parametrize with ids, loading cases from CSV or JSON, property-based testing in outline, and keeping failures readable.',
      ['Drive one test through many inputs with clear failure messages'], 35, { after: ['FIXTURES_DEEP'] }),
    u('MARKERS_REPORTS', 'Markers, Plugins and Reports', 'Markers for smoke and regression, pytest-xdist for parallel runs, retries, and HTML and Allure reports.',
      ['Select, parallelise and report a large test suite'], 35, { after: ['DATA_DRIVEN'] }),
    ...ending('A pytest Test Framework', 'MARKERS_REPORTS', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── Playwright ── */
  QA_PLAYWRIGHT: { category: 'UNIVERSAL', units: [
    u('PW_FIRST_TESTS', 'Playwright: First Browser Tests', 'Installing Playwright for Python, launching browsers, navigating, and the pytest-playwright plugin.',
      ['Write and run browser tests with Playwright and pytest'], 40),
    u('LOCATORS', 'Locators That Do Not Break', 'Role, label and text locators, test ids, chaining and filtering, and why XPath on layout is brittle.',
      ['Find elements with locators that survive UI changes'], 45, { after: ['PW_FIRST_TESTS'] }),
    u('WAITS_ASSERTIONS', 'Auto-Waiting and Web-First Assertions', 'How Playwright waits, expect assertions that retry, timeouts, and why sleep() makes tests slow and flaky.',
      ['Synchronise tests with the page without fixed sleeps'], 40, { after: ['LOCATORS'] }),
    u('PAGE_OBJECTS', 'Page Objects and Test Structure', 'The page object model, components, keeping assertions in tests, and fixtures for logged-in pages.',
      ['Structure browser tests with page objects that stay maintainable'], 40, { after: ['WAITS_ASSERTIONS'] }),
    u('NETWORK_AUTH', 'Network Mocking, Auth State and API Setup', 'Routing and mocking requests, reusing login state, setting up data through the API, and testing error states.',
      ['Control the network and login state to make browser tests fast and focused'], 40, { after: ['PAGE_OBJECTS'] }),
    u('DEBUG_FLAKY', 'Traces, Screenshots and Flaky Tests', 'The trace viewer, screenshots and video on failure, finding the cause of a flaky test, and quarantining honestly.',
      ['Debug a failing or flaky browser test from its trace'], 40, { after: ['NETWORK_AUTH'] }),
    ...ending('Playwright', 'DEBUG_FLAKY', { project: ['MINI_PROJECT', 'Mini Project — A Browser Test Suite for an E-Commerce Demo App',
      'For a demo e-commerce app you run locally: automate search, cart, checkout and login with Playwright and page objects, mock the payment API, run the suite across Chromium and Firefox in parallel, and hand in traces for every failure.'] }),
  ] },

  /* ── Selenium with Java ── */
  QA_SELENIUM_JAVA: { category: 'UNIVERSAL', units: [
    u('JAVA_FOR_TESTERS', 'Java for Testers', 'Enough Java to automate: classes and objects, collections, exceptions, Maven and project layout.',
      ['Read and write the Java a Selenium framework is built from'], 40),
    u('WEBDRIVER', 'Selenium WebDriver', 'WebDriver and drivers, locating elements, actions, frames, windows and alerts.',
      ['Automate browser actions with Selenium WebDriver in Java'], 45, { after: ['JAVA_FOR_TESTERS'] }),
    u('SELENIUM_WAITS', 'Waits in Selenium', 'Implicit versus explicit waits, ExpectedConditions, stale elements, and why mixing waits causes delays.',
      ['Synchronise Selenium tests correctly with explicit waits'], 40, { after: ['WEBDRIVER'] }),
    u('TESTNG_POM', 'TestNG, Page Objects and Data Providers', 'TestNG annotations, groups and data providers, the page object model in Java, and reports.',
      ['Build a TestNG-based Selenium framework with page objects'], 45, { after: ['SELENIUM_WAITS'] }),
    u('GRID_COMPARE', 'Selenium Grid, and Selenium versus Playwright', 'Running tests in parallel on Selenium Grid or a cloud grid, and choosing between Selenium and Playwright for a team.',
      ['Run Selenium tests in parallel and choose the right tool for a project'], 35, { after: ['TESTNG_POM'] }),
    ...ending('Selenium with Java', 'GRID_COMPARE', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── API testing ── */
  QA_API_TESTING: { category: 'UNIVERSAL', units: [
    u('API_TEST_DESIGN', 'What to Test in an API', 'Status codes, headers, bodies and schemas, positive and negative cases, idempotency, pagination and errors.',
      ['Design the tests an API needs, including the negative cases'], 40),
    u('POSTMAN', 'Postman and Newman', 'Collections, environments and variables, test scripts, and running collections in CI with Newman.',
      ['Build and run an API test collection with Postman and Newman'], 40, { after: ['API_TEST_DESIGN'] }),
    u('PYTHON_API_TESTS', 'API Tests in Python with requests and pytest', 'Sessions and auth, fixtures for clients and data, asserting on bodies, and checking schemas with jsonschema.',
      ['Automate API tests in Python with clear assertions and schema checks'], 45, { after: ['POSTMAN'] }),
    u('AUTH_SECURITY_API', 'Testing Authentication, Authorisation and Input Handling', 'Tokens and expiry, role-based access, one user reading another\'s data, and validation of bad input — from the defender\'s side.',
      ['Test that an API enforces authentication, authorisation and input rules'], 40, { after: ['PYTHON_API_TESTS'] }),
    u('CONTRACTS_MOCKS', 'Contract Testing and Service Mocks', 'Consumer-driven contracts with Pact in outline, mocking downstream services, and testing microservices in isolation.',
      ['Use contracts and mocks to test services without their whole system'], 40, { after: ['AUTH_SECURITY_API'] }),
    u('REST_ASSURED', 'REST Assured for Java Teams', 'The same API tests in Java with REST Assured and TestNG, for teams whose framework is Java.',
      ['Write API tests in Java with REST Assured'], 35, { after: ['CONTRACTS_MOCKS'] }),
    ...ending('API Testing', 'REST_ASSURED', { project: ['MINI_PROJECT', 'Mini Project — API Test Suite for a Food-Ordering Service',
      'For a food-ordering API you run locally: design and automate positive, negative, auth and schema tests in pytest, add a Postman collection run by Newman, mock the payment provider, and report the defects with evidence.'] }),
  ] },
};

/** Batch QA3: quality engineering — performance, quality in CI, mobile/accessibility/security, capstone. */
export const TRACK_QA_ENGINEERING: Record<string, TopicSeed> = {
  /* ── Performance testing ── */
  QA_PERFORMANCE: { category: 'UNIVERSAL', units: [
    u('PERF_BASICS', 'Performance Testing: Questions Before Tools', 'Load, stress, spike, soak and capacity tests, the question each answers, and workload models from real traffic.',
      ['Choose the right kind of performance test for a question about capacity'], 40),
    u('METRICS', 'Reading Performance Numbers', 'Throughput, latency percentiles, errors, saturation, why averages lie, and coordinated omission in outline.',
      ['Read latency percentiles and throughput correctly and spot misleading results'], 40, { after: ['PERF_BASICS'] }),
    u('LOCUST_K6', 'Load Tests with Locust and k6', 'Writing user behaviour in Locust (Python) and k6 (JavaScript), ramping load, thresholds and checks.',
      ['Write and run a load test with Locust or k6 and set pass/fail thresholds'], 45, { after: ['METRICS'] }),
    u('JMETER', 'JMeter in Practice', 'Thread groups, samplers, timers, assertions, CSV data and non-GUI runs — for teams that use JMeter.',
      ['Build and run a JMeter test plan from the command line'], 35, { after: ['LOCUST_K6'] }),
    u('FIND_BOTTLENECK', 'Finding the Bottleneck', 'Correlating load with server metrics, database and connection-pool limits, and reporting a performance result.',
      ['Find where a system breaks under load and report it with evidence'], 40, { after: ['JMETER'] }),
    ...ending('Performance Testing', 'FIND_BOTTLENECK', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── Quality in CI ── */
  QA_CI_QUALITY: { category: 'UNIVERSAL', units: [
    u('TESTS_IN_CI', 'Running Tests in CI', 'Test stages in a GitHub Actions pipeline, browsers in CI, artefacts and reports, and failing the build for the right reasons.',
      ['Run unit, API and browser tests in a CI pipeline with useful reports'], 40),
    u('SPEED_PARALLEL', 'Fast Feedback: Parallelism, Sharding and Test Selection', 'Parallel and sharded runs, smoke suites on every commit, and running only the tests a change affects.',
      ['Keep a growing test suite fast enough to run on every change'], 40, { after: ['TESTS_IN_CI'] }),
    u('FLAKY_MANAGEMENT', 'Managing Flaky Tests and Test Health', 'Measuring flakiness, quarantine with an owner and a deadline, retries done honestly, and test-suite health metrics.',
      ['Measure and reduce flaky tests without hiding real failures'], 35, { after: ['SPEED_PARALLEL'] }),
    u('QUALITY_STRATEGY', 'A Quality Strategy for a Product', 'The test portfolio across levels, quality gates, production monitoring as testing, and quality metrics that matter.',
      ['Write a quality strategy that balances speed, cost and risk for a product'], 40, { after: ['FLAKY_MANAGEMENT'] }),
    ...ending('Quality in CI', 'QUALITY_STRATEGY', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── Mobile, accessibility and security checks ── */
  QA_MOBILE_A11Y_SECURITY: { category: 'UNIVERSAL', units: [
    u('MOBILE_TESTING', 'Mobile App Testing and Appium', 'What is different about mobile (devices, OS versions, networks, permissions), emulators and real devices, and Appium in outline.',
      ['Plan and start automating tests for a mobile app'], 40),
    u('ACCESSIBILITY', 'Accessibility Testing', 'WCAG in outline, keyboard and screen-reader checks, automated checks with axe, and what automation cannot see.',
      ['Test a web page for accessibility with tools and by hand'], 40, { after: ['MOBILE_TESTING'] }),
    u('SECURITY_FOR_QA', 'Security Testing Basics for QA', 'The OWASP Top 10 as a tester sees it, input and access checks, and running an authorised baseline scan with OWASP ZAP — on apps you own.',
      ['Add basic, authorised security checks to a test plan'], 40, { after: ['ACCESSIBILITY'] }),
    u('CROSS_BROWSER', 'Cross-Browser and Visual Testing', 'Browser and device matrices, cloud device farms, and visual regression testing with screenshots and its pitfalls.',
      ['Cover browsers and devices efficiently and catch visual regressions'], 35, { after: ['SECURITY_FOR_QA'] }),
    ...ending('Mobile, Accessibility and Security Checks', 'CROSS_BROWSER', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── The QA/SDET capstone ── */
  QA_CAPSTONE: { category: 'UNIVERSAL', units: [
    u('BRIEF', 'The Capstone: A Test Strategy and Automation Suite for a Real Product', 'A product with a web app and an API (e-commerce, ed-tech or banking demo): risks, a strategy, and the plan for the suite.',
      ['Scope the testing of a product — risks, strategy and an automation plan'], 45),
    u('BUILD_AUTOMATION', 'Capstone Build — Test Design, UI and API Automation', 'Designed test cases, a Playwright suite with page objects, an API suite with schema and auth tests, and test data that cleans up.',
      ['Build the UI and API automation for the product on a framework a team could extend'], 300, { unitType: 'PROJECT', after: ['BRIEF'], skillKeys: ['UI_TEST_AUTOMATION', 'API_TESTING'] }),
    u('BUILD_QUALITY', 'Capstone Build — Performance, CI and the Quality Report', 'A load test with thresholds, the suites running in CI with reports, accessibility and baseline security checks, and the quality report for release.',
      ['Run the product\'s quality checks in CI and report release readiness with evidence'], 240, { unitType: 'PROJECT', after: ['BUILD_AUTOMATION'], skillKeys: ['PERFORMANCE_TESTING', 'TEST_DESIGN'] }),
    u('DEFENCE', 'Demo Day: Presenting and Defending the Test Strategy', 'A live run of the suites, a flaky-test story, the defects found, and the questions a QA hiring panel asks.',
      ['Demo the test suites and defend the strategy under questioning'], 45, { unitType: 'PRACTICE', after: ['BUILD_QUALITY'] }),
    u('CHECKPOINT', 'Capstone — Checkpoint', 'Where you actually are across the whole track, measured rather than felt.',
      ['Show QA and SDET judgement at the standard a hiring panel expects'], 40, { unitType: 'CHECKPOINT', after: ['DEFENCE'] }),
  ] },
};

/**
 * Batch QA4: Year-4 placement for QA / SDET. Aptitude, coding rounds, core CS, HR and mocks are the
 * shared placement packs; these add the QA/SDET interview, scenario rounds and the candidate.
 */
export const TRACK_QA_PLACE: Record<string, TopicSeed> = {
  /* ── The QA / SDET interview ── */
  QA_IV: { category: 'UNIVERSAL', units: interview('QA / SDET Interview', [
    ['IV_FUNDAMENTALS', 'Testing Fundamentals Questions', 'Levels and types, the pyramid, test plans, severity versus priority, the defect lifecycle and agile QA.', ['TESTING_FUNDAMENTALS']],
    ['IV_TEST_DESIGN', 'Test Design Questions', 'Partitions, boundaries, decision tables, state transitions and "test this pen / lift / login" questions.', ['TEST_DESIGN']],
    ['IV_UI_AUTOMATION', 'UI Automation Questions', 'Locators, waits, page objects, flaky tests, Playwright versus Selenium, and framework design.', ['UI_TEST_AUTOMATION']],
    ['IV_API_TESTING', 'API Testing Questions', 'Status codes, negative and auth tests, schemas, Postman, contract testing and test data.', ['API_TESTING']],
    ['IV_PERF_CI', 'Performance and CI Questions', 'Load versus stress, percentiles, finding bottlenecks, tests in CI, parallelism and quality gates.', ['PERFORMANCE_TESTING']],
  ]) },

  /* ── Scenario rounds ── */
  QA_SCENARIO_ROUNDS: { category: 'UNIVERSAL', units: [
    u('TEST_THIS_ROUND', 'The "Test This Feature" Round', 'Given a feature or an object, producing a structured set of tests aloud: risks first, then partitions, boundaries and negatives.',
      ['Answer a "test this" question with a structured, risk-led set of tests'], 40),
    u('BUG_HUNT_ROUND', 'The Bug-Hunt and Bug-Report Round', 'Exploring a buggy demo app under time, then writing the reports a developer can act on.',
      ['Find bugs under time pressure and report them clearly'], 40, { after: ['TEST_THIS_ROUND'] }),
    u('AUTOMATION_TAKEHOME', 'The Automation Take-Home', 'A typical take-home: automate a flow and an API with a small framework, and a README a reviewer can run.',
      ['Deliver an automation take-home that gets a call-back'], 45, { after: ['BUG_HUNT_ROUND'] }),
    u('LIVE_CODING_ROUND', 'The SDET Live-Coding Round', 'Coding problems SDETs are asked (strings, collections, parsing logs), plus writing the tests for your own solution.',
      ['Solve an SDET coding problem and test your own solution aloud'], 45, { after: ['AUTOMATION_TAKEHOME'] }),
    u('TIMED_SCENARIOS', 'Timed Scenario Set', 'Three QA scenario questions under time, with model answers and how each is scored.',
      ['Answer timed QA scenarios with structure and evidence'], 50, { unitType: 'PRACTICE', after: ['LIVE_CODING_ROUND'] }),
    u('CHECKPOINT', 'QA Scenario Rounds — Checkpoint', 'Where you actually are on this, measured rather than felt.',
      ['Show structured QA scenario thinking at interview standard'], 40, { unitType: 'CHECKPOINT', after: ['TIMED_SCENARIOS'] }),
  ] },

  /* ── The QA candidate ── */
  QA_PLACE_CANDIDATE: { category: 'UNIVERSAL', units: [
    u('RESUME', 'A QA / SDET Resume and Portfolio', 'The skills line recruiters filter on, bullets with evidence (tests, defects found, run time, flakiness cut), and a framework repository that runs.',
      ['Write a QA resume and portfolio whose every claim can be checked'], 45, { skillKeys: ['PLACEMENT_READINESS', 'PORTFOLIO_EVIDENCE'] }),
    u('CERTIFICATIONS', 'Certifications and the QA Career Path', 'ISTQB levels and what each proves, manual QA to automation to SDET, and choosing a first role in India.',
      ['Plan certifications and a first QA or SDET role that fit your goals'], 35, { after: ['RESUME'], skillKeys: ['PLACEMENT_READINESS'] }),
    u('MOCK_LOOP', 'The QA / SDET Interview Loop — Mock', 'Online test, a testing round, an automation round, a coding round, a manager round and HR — as one mock day, with the debrief.',
      ['Go through a complete QA or SDET interview loop and act on its debrief'], 60, { unitType: 'PRACTICE', after: ['CERTIFICATIONS'], skillKeys: ['INTERVIEW_PERFORMANCE'] }),
    u('CHECKPOINT', 'QA Placement — Checkpoint', 'Where you actually are on this, measured rather than felt.',
      ['Show the judgement a QA hiring panel looks for'], 40, { unitType: 'CHECKPOINT', after: ['MOCK_LOOP'] }),
  ] },
};
