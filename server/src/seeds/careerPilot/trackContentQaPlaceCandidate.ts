/**
 * Career-track content: The QA Candidate (QA_PLACE_CANDIDATE), QA / SDET, batch QA4 — the last topic of Year-4
 * placement for the QA / SDET track. The shared Year-4 packs teach resume format, aptitude, HR and generic mocks; this
 * is the testing version: a resume whose every claim can be checked (tests, defects found, run time, flakiness), a
 * framework repository that runs, ISTQB and tool certifications with the manual → automation → SDET path in India, and
 * one complete QA / SDET interview loop. Modelled on DE_PLACE_CANDIDATE.
 *
 * The evidence throughout is the track's capstone (QA_CAPSTONE, ShopSathi, the fictional Lucknow festive-goods shop with
 * nine planted defects). Figures quoted for it are the capstone's own reference run (22 tests; buggy build 10 failed,
 * 12 passed in 20.39 s; fixed build 22 passed in 24.51 s; the rules file 11 tests in 2.08 s; seven of nine defects by
 * the pytest suite and the search lock by Locust; p95 570 ms against 300 ms, fixed 38 ms and 130 ms in two runs;
 * 7.24 s in one process against 17.09 s with -n 4). They are labelled as the reference run; students replace each one
 * with the figures from their own logs. The capstone gives no flakiness figures, so the flakiness bullet is a template.
 * Certifications are described by what they prove and who asks for them — no exam prices, passing scores, question
 * counts or durations, and no salary figures; the notes send students to istqb.org and each vendor's page. Verified
 * (scratchpad qa_place_candidate, Python 3.13): the round-0 SQL check ran on SQLite and DuckDB 2.0 with identical
 * results (and the inner-join version that loses an order); the round-3 flaky-test classifier printed the output
 * quoted, its five pytest tests passed (pytest 9), and the naive line-counting version printed the wrong counts quoted.
 *
 * Attribution: the topic is multi-skill (PLACEMENT_READINESS default, PORTFOLIO_EVIDENCE, INTERVIEW_PERFORMANCE).
 * Every checkpoint question names its skill with ck(), within what its unit declares; practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const PR = 'PLACEMENT_READINESS';
const PE = 'PORTFOLIO_EVIDENCE';
const IP = 'INTERVIEW_PERFORMANCE';

export const TRACK_QA_PLACE_CANDIDATE_BUNDLES: PilotBundle[] = [
  /* ── RESUME ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PLACE_CANDIDATE_RESUME',
    notes: `The shared Year-4 resume pack covers format, length and the basics. This unit is the **QA and SDET** version: the
resume that gets through the filter for roles titled "Software Test Engineer — Trainee", "QA Engineer", "Automation
Test Engineer", "Quality Engineer" or "SDET-1", and a framework repository a reviewer can clone and run. Every
applicant lists the same words — Selenium, Postman, JIRA, "manual and automation testing" — so the list proves
nothing; a tester is judged by what the suite covers, what it found, how long it runs, and whether its red means
anything.

## Who reads it, and what they filter on

| Employer | Typical first filter | What wins the shortlist |
|---|---|---|
| Product companies (Bengaluru, Hyderabad, Pune, Gurugram) | SDET roles: coding (DSA in Python or Java), an automation framework, API testing | A framework repo that runs, tests at the right level, defects with evidence |
| Global capability centres (banks, retailers, insurers) | Selenium or Playwright, API testing, SQL, Java or Python, agile process | Clean framework code, CI, clear defect reports, process discipline |
| IT services and testing consultancies | Testing fundamentals, test case writing, SQL, one automation tool, often ISTQB Foundation | Fundamentals answered crisply, a certification done or booked, willingness to learn the client's stack |
| Startups | Can you own quality alone: API and UI automation, CI, exploratory testing, release calls | A suite in CI, a quality report with a ship or no-ship call |

Services firms often place freshers on manual or functional testing of a client application first; product teams
hiring SDETs test coding as hard as developers. Many employers run a **background verification** after the offer —
education and certifications checked with the issuer through your certificate number. A claim that cannot survive
that check is not worth the risk.

## The skills line a filter searches

Use the job description's spellings, grouped, and only what you can defend for ten minutes:

    Languages:     Python (pytest, requests), Java (Selenium WebDriver, TestNG — coursework level), SQL
    UI automation: Playwright (page objects, web-first assertions, traces), Selenium WebDriver (explicit waits)
    API testing:   REST, status codes and negative tests, JSON Schema, auth and two-user authorisation, Postman
    Performance:   Locust (workload model, thresholds, percentiles); k6 concepts
    Test design:   partitions, boundaries, decision tables, state transitions, exploratory charters
    CI and tools:  GitHub Actions, pytest-xdist, JUnit and HTML reports, Git, JIRA-style defect tracking
    Baselines:     form-label and cookie-flag checks; accessibility and security testing basics (authorised only)

Leave out what you only watched: Appium, JMeter, Cypress, Tosca, LoadRunner, "AI-based testing" — unless you used
them. If a JD names a tool you know only by its equivalent, write the one you used and map it aloud ("I wrote the
load test in Locust; JMeter has the same ideas: thread groups are users, assertions are checks, and I would set the
same p95 threshold"). **Every word on this line is a question in the automation round** — "Selenium" means "explicit
or implicit wait, and why not Thread.sleep?"; "Postman" means "how do you chain a token into the next request?".

## Bullets: what you tested + the evidence + the result

A QA bullet is credible when it names the product, the method and numbers someone could recount. The four numbers
panels trust are **tests** (how many, at which level), **defects found** (and how many were known to exist),
**run time** (and on what machine), and **flakiness** (measured, then reduced).

- Weak: "Performed manual and automation testing using Selenium, Postman and JIRA to ensure quality."
- Coverage: "22 automated tests on a pytest framework: business rules, schemas and two-user authorisation at the
  API; page-object Playwright journeys for what only the browser shows; label and cookie baselines."
- Defects: "Found 7 of 9 planted defects with the suite and an 8th (a global lock on search) with Locust; each one
  reported with steps and pinned by an xfail(strict=True) test that turns red when the fix lands."
- Speed: "Measured pytest-xdist on the 22-test suite: 7.24 s in one process, 17.09 s with -n 4, because each
  worker starts its own app and browser; kept one process until the suite runs for minutes."
- Performance: "Locust test with thresholds in code: p95 570 ms against a 300 ms target at 30 users; isolated the
  cause to search, confirmed by a fixed build (p95 38 ms and 130 ms in two runs, lab laptop, not capacity)."
- Flakiness (your own table): "Ran the regression suite ten times; one checkout test failed 2 of 10 on a race with
  the cart call; replaced a fixed wait with a web-first assertion, then 0 of 10."

Those are the capstone's **reference run** figures — replace every one with yours and keep the pytest output, the
Locust summary and the ten-run table behind each number. Never present a laptop load test as production capacity.
"7 of 9 planted defects" beats "7 defects": it gives the denominator. Say in the README what you missed.

## A framework repository that runs

"Runs" means a reviewer can clone it, run one or two commands and watch the suite start the app, test it and report:

    shopsathi-quality/
      README.md            what is tested and why, the results table, how to run, what is NOT covered
      TEST-CASES.md        each rule with its technique (boundaries, decision table) and case ids
      DEFECTS.md           one report per defect: steps, expected, actual, evidence, severity, the test id
      QUALITY-REPORT.md    results by area, open defects, the ship or no-ship recommendation
      app/                 the system under test (never a real company's site)
      tests/api/           rules, negatives, schemas, two-user authorisation
      tests/ui/            page objects and journeys; no sleeps; locators by role, label or test id
      perf/locustfile.py   workload model and thresholds in code
      conftest.py          starts the app, resets data, reads config from environment variables
      .github/workflows/   smoke on push, regression on pull request, load nightly; a link to a real run
      requirements.txt     pinned versions; one command installs everything

The README leads with a results table: tests by level, the buggy and fixed runs, defects found out of planted, run
time and machine, flakiness over ten runs, and the load verdict. A short recording of a red test and the Locust
threshold failing carries what a reviewer will not run.

## What never to publish

- **Credentials** — test-account passwords for a real system, tokens, a .env file. Rotate anything ever committed;
  deleting it leaves it in git history.
- **Real personal data** — screenshots of a client's app with customer names, phone numbers or UPI ids. Synthetic
  users (asha@example.test) do the same job.
- **An employer's or client's work** — internship test cases, defect lists, screenshots or framework code, even with
  the names changed.
- **Tests or scans against sites you do not own** — automating a real bank's or e-commerce site's login, or
  pointing a scanner at it, is not a portfolio piece; it may be illegal. Test your own builds.

## Copies for different roles — the facts never change, only the order

| Target | Lead with | Push down |
|---|---|---|
| SDET at a product company | Framework design, coding, CI, API tests | Manual test case counts |
| Automation test engineer at a GCC | Playwright or Selenium, page objects, API, CI reports | Locust internals |
| QA engineer at a services firm | Test design, defect reports, SQL checks, ISTQB status, one tool | Framework internals |
| Performance-leaning role | Locust thresholds, percentiles, the bottleneck story | UI journeys |

LinkedIn and Naukri use the same spellings and the same numbers; pin the framework repository in Featured.`,
    workedExample: `**A weak QA resume section, rewritten.** Sneha, B.Tech 2026, sends:

    SKILLS: Manual Testing, Automation Testing, Selenium, Appium, JMeter, Postman, Cypress, Playwright, TestNG,
            Cucumber, JIRA, LoadRunner, Agile, SDLC, STLC
    PROJECTS
    1. Automated testing of Amazon website using Selenium.
    2. Tested an e-commerce application and found 50+ bugs.
    3. Achieved 100% test coverage.

**What a QA panel sees.** Fifteen tool names and no evidence of depth in any. Project 1 automates a real company's
production site she does not own: it cannot be run reliably, proves nothing about her design, and the panel will ask
whether she had permission. "50+ bugs" in an unnamed app has no denominator and no reports to read. "100% coverage" of
what — lines, requirements, risks? Nobody believes it, and the first follow-up exposes it.

**Step 1 — inventory what is true.** Her capstone is ShopSathi: a pytest framework with an API client, Playwright page
objects, rules tested at the API with boundaries and a decision table, a two-user authorisation test, a JSON Schema,
label and cookie baselines, Locust with thresholds, and a GitHub Actions workflow. Her own run matched the reference
closely: 22 tests, 7 of 9 planted defects found by the suite, the search lock found by Locust; she also found the
search-spaces defect in an exploratory charter. Her ten-run table showed one flaky checkout test, fixed. She did the
Selenium with Java lessons and TestNG exercises, but has never run Appium, JMeter, Cypress or LoadRunner.

**Step 2 — rewrite.**

    ShopSathi — test strategy and automation for a festive-goods shop      github.com/sneha-k/shopsathi-quality
    Python, pytest, Playwright, requests, JSON Schema, Locust, GitHub Actions
     - 22 automated tests, rules at the API (boundaries, decision table), UI journeys with page objects; found
       all 9 planted defects: 7 by the suite, the search lock by Locust, one by an exploratory charter.
     - Two-user test showed any customer could read any order (API only; the UI hid it); reported, pinned with
       xfail(strict=True).
     - Locust thresholds in code: p95 570 ms vs 300 ms target; isolated search and a global lock; fix re-run.
     - Ten-run flakiness check: one checkout test failed 2/10 on a race; web-first assertion, then 0/10.

    SKILLS
    Python (pytest, requests) | Playwright | Selenium WebDriver + TestNG (Java, coursework) | API testing, JSON Schema
    Test design (boundaries, decision tables, state models) | Locust | GitHub Actions | SQL | Git

**Step 3 — remove what must go.** Appium, JMeter, Cypress, Cucumber and LoadRunner come off. The Amazon project goes
entirely. "100% coverage" goes; her README instead lists what is not covered (Firefox, a screen-reader pass). For a JD
asking for JMeter she keeps the truth and maps it: "my load test is Locust; the workload model, thresholds and
percentile reading carry over, and I can show the k6 version I wrote from the documentation".`,
    mcqs: [
      mcq('Aditya\'s portfolio project is "Selenium automation of the IRCTC login and booking pages". What is the main problem with it as evidence?', [
        ['He does not own the site, cannot rely on it, and automating it may breach its terms', true],
        ['Selenium is out of date, so any project built on it now counts against a QA candidate', false],
        ['Railway booking is too simple a domain to show any real test design skill to a panel', false],
        ['Login pages are never automated in real teams, so the project shows the wrong habits', false],
      ], 'A live third-party site changes under you, has captchas and limits, and was not his to automate; a panel learns nothing about his design and may question his judgement. Selenium is still widely used, the domain is not the issue, and login flows are automated everywhere — on the team\'s own builds.'),
      mcq('Which README line gives a QA reviewer the most checkable evidence about Meera\'s ShopSathi suite?', [
        ['Tests by level, buggy and fixed runs, 7 of 9 planted defects found, run time and machine', true],
        ['"A robust, scalable, enterprise-grade automation framework that follows industry best practice"', false],
        ['A screenshot of the final green CI run on the day she submitted, with every job showing a tick', false],
        ['"100% test coverage achieved", with a link to the pytest documentation page about coverage', false],
      ], 'Counts by level, both runs, a denominator for defects and the machine can all be checked against the logs. Adjectives say nothing, one green run hides whether the suite can go red, and "100% coverage" names no measure.'),
      mcq('Rakesh\'s bullet says "Found 7 defects". Why does "Found 7 of 9 planted defects" read as stronger to a panel?', [
        ['It gives the denominator, so the reader can judge how thorough the testing was', true],
        ['It is shorter, and panels prefer the shortest bullet that still carries a number', false],
        ['Planted defects count double, since they are harder to find than ordinary bugs', false],
        ['It hides the two missed defects better than the plain count of seven ever could', false],
      ], 'Seven found means little until you know how many there were; "of 9" shows 78% and invites the honest follow-up about the two missed. It is not shorter, planted defects are not weighted, and it reveals the misses rather than hiding them.'),
    ],
    checkpoint: [
      ck(PR, 'Varun\'s bullet reads "Performed manual and automation testing using Selenium, Postman and JIRA to ensure quality". Which rewrite would a QA lead trust most?', [
        ['The product and method in one line, the tests by level, and the defects found out of known', true],
        ['The same bullet with "ensure quality" replaced by "drive world-class quality", to sound senior', false],
        ['Every testing tool he has heard of, so the bullet matches as many recruiter filters as it can', false],
        ['"Detail-oriented tester passionate about delivering bug-free software" in place of the bullet', false],
      ], 'A credible bullet names what was tested, how, and numbers someone can check. Stronger adjectives, a pile of tool names or a personality line give the panel nothing to probe and nothing to believe.'),
      ck(PE, 'Which item best backs Kavya\'s bullet "Reduced flaky failures in the checkout suite from 2 in 10 runs to 0 in 10"?', [
        ['Both ten-run tables, the trace that showed the race, and the commit that fixed it', true],
        ['A README sentence saying she follows best practice for stability in every test', false],
        ['A screenshot of one green CI run taken on the morning she submitted the project', false],
        ['A course certificate on test automation whose syllabus covered flaky test handling', false],
      ], 'The claim is a before-and-after measurement, so the evidence is the two measurements plus the cause and the fix. A sentence, one green run or a certificate says nothing about how often this suite failed.'),
      ck(PE, 'Nitin did his best testing work in an internship at a banking GCC. A recruiter asks to see his test cases. What should he share?', [
        ['The same techniques applied to ShopSathi in his own repository, and the internship in general terms', true],
        ['The internship test cases with the bank\'s name and screen names replaced, since the logic is generic', false],
        ['The full internship defect list, since recruiters are bound by law to keep it confidential', false],
        ['Screenshots of the bank app\'s test environment, with account numbers blurred out first', false],
      ], 'Internship test cases, defects and screens belong to the employer, and renaming or blurring still leaks them. Showing the same skill on his own project is honest, and describing the work in general terms is allowed.'),
    ],
  },

  /* ── CERTIFICATIONS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PLACE_CANDIDATE_CERTIFICATIONS',
    notes: `Testing is one of the few software careers in India where a certification is named in many entry job descriptions:
ISTQB Foundation turns up in services and consultancy postings, and some GCCs list it as "preferred". This unit
covers what the ISTQB levels and the tool certificates prove, who asks for them, a sensible order for this track's
graduate, and the career path from manual testing to SDET and beyond. **Exam names, syllabus versions, prices,
passing scores, question counts, durations and the list of modules change** — read istqb.org (and the page of the
ISTQB member board or exam provider you book with) before you book anything, and do not trust a number from a forum
or a training institute's advertisement.

## What a certification proves — and what it does not

A certification proves you passed an exam on a defined body of knowledge on a given date. It does **not** prove you
can find the coupon-cap bug or make a flaky test stable, which is why the panel asks about your capstone regardless.
Certifications help in three ways: they get a resume past a filter that names them; they give a shared vocabulary
(the services firm's client and your team lead both speak ISTQB terms); and they give a structured syllabus for
areas you have met only in passing. Test Plans, Test Strategy and Risk-Based Testing and the test design lessons
already gave you most of the Foundation ideas; the exam tests ISTQB's own definitions and wording.

## ISTQB, in outline

ISTQB (International Software Testing Qualifications Board) defines syllabi; exams are run by its member boards and
accredited exam providers, listed on istqb.org. The portfolio is reorganised from time to time, so treat this as the
shape, not a booking guide:

| Level | Examples | What it proves | When |
|---|---|---|---|
| Foundation | Certified Tester Foundation Level (CTFL) | Testing vocabulary, principles, the test process, static testing, test design techniques, test management basics, tools | Now: the entry certificate many postings name |
| Foundation extensions | Agile Tester and similar | Testing in agile teams | Optional; useful for agile-heavy clients |
| Specialist modules | Test automation, performance, security, mobile, testing AI-based systems, and others | One area in depth | After real work in that area |
| Advanced | Test Analyst, Technical Test Analyst, Test Management | Deeper analysis, technical testing or test management | After a year or more of work; Foundation is required first |
| Expert | Expert-level modules | Leading and improving testing across an organisation | Years into a career |

Notes that matter when choosing:

- **Foundation is the one worth doing as a fresher** if your targets name it — services firms, consultancies and some
  GCCs. Product companies hiring SDETs rarely filter on it; they filter on code.
- **Read the current Foundation syllabus** from istqb.org. It is free, and the exam asks for its definitions
  ("error, defect, failure"; the seven principles; the techniques by name), not your preferred words.
- **Not yet:** Advanced and Expert levels. They assume work experience, and some exam providers ask for proof of it.
- **Beware look-alikes.** A training institute's "ISTQB-style" course certificate is not an ISTQB certificate. The
  real one carries a certificate number that an employer can check with the issuing board.

## Tool certificates

| Certificate | What it is | Who asks |
|---|---|---|
| "Selenium certification" | The Selenium project does not run an exam; these are course-completion certificates from training providers | Nobody who reads closely — the repo matters more |
| Playwright | The project runs no certification exam; certificates you see are course completions | Same as above |
| Postman's learning badges | Free badges from Postman's own learning programme for API basics | Occasionally named in services postings; small but honest |
| Tricentis Tosca certifications | Vendor certifications for the Tosca tool, through Tricentis's academy | Services firms on SAP and enterprise testing projects that use Tosca |
| Cloud fundamentals (AWS, Microsoft) | Vendor exams on cloud basics | Useful later if your team tests cloud services; not a QA filter |

A course-completion certificate is fine on a resume if it is labelled as one ("Course: Selenium with Java, provider,
year"). It is not a "certification", and your capstone proves more than it does.

## A sensible order for this track's graduate

| Your target | First | Then | Later, with experience |
|---|---|---|---|
| QA engineer at a services firm or consultancy | ISTQB Foundation | Whatever the first project names (often Tosca or a cloud fundamentals exam) | An Advanced module |
| Automation engineer at a GCC | Your repo first; ISTQB Foundation if postings name it | A test automation specialist module once you automate at work | Advanced Technical Test Analyst |
| SDET at a product company | No certification; the coding round and the framework decide | — | Specialist modules if your team values them |
| Performance or security leaning | ISTQB Foundation | The matching specialist module, after real work in it | — |

One certification at a time, **applying in parallel**. The order comes from counting what your own target JDs name.

## The QA career path in India

| Role | What the job is | What gets you there |
|---|---|---|
| QA engineer / test engineer (manual or functional) | Understand requirements, design and run test cases, report defects, regression before releases | Test design, clear defect reports, SQL, domain sense |
| Automation test engineer | Build and maintain UI and API suites on an existing framework | One tool deeply (Playwright or Selenium), API testing, Git, CI basics |
| SDET | Builds the test system: frameworks, test data tools, mocks, CI pipelines; often reviews developers' tests | Real coding (DSA rounds), framework design, CI, the capstone |
| Performance engineer | Workload models, load tests, bottleneck analysis with developers and ops | Locust, k6 or JMeter, percentiles, profiling, usually after a first role |
| Security tester | Authorised security testing of the team's own applications | Security fundamentals, then specialist training and certification |
| QA lead / test manager / quality coach | Strategy, estimates, release calls, coaching a team | Years of testing, judgement, communication |

The common Indian path is manual or functional testing, then automation, then SDET or a specialist area — but a
strong framework repository can start you at automation or SDET directly. Titles are inconsistent: an "SDET" at one
company writes Selenium scripts all day, and a "QA engineer" at another owns the CI pipeline — read the
responsibilities. Many SDETs later move to development, DevOps or SRE; the testing mindset travels well.

## Choosing a first role

| Employer | What you get | What it costs you |
|---|---|---|
| Product company | Real ownership, code review, modern tools | Few entry SDET openings; a developer-level coding bar |
| GCC | Mature process, structured training, automation programmes | Narrower scope at first; hours sometimes aligned to another time zone |
| IT services or testing consultancy | Training, many domains (banking, retail, telecom), a certification push | You may start on manual regression of a client app; bonds and service agreements are common |
| Startup | Breadth: you are the whole quality function | Little mentoring; testing may be squeezed before every release |

Ask in every interview: what the first six months are, how much of the work is manual against automated, whether
juniors write automation that is reviewed and merged, who decides a release, how certification is supported, and any
bond or service agreement. Six months of executing someone else's spreadsheet of test cases teaches less than one
month of writing reviewed automation.`,
    workedExample: `**Choosing a certification and a first role — two candidates, the same question.** Both finished the track and the
ShopSathi capstone. Both ask: "Should I do ISTQB first?"

**Lakshmi** wants a QA or automation role in Chennai or Hyderabad. Her shortlist of twenty postings (three services
firms, two testing consultancies, GCCs, a few product companies) names: Selenium in eleven, Playwright in five, API
testing in fourteen, SQL in nine, and ISTQB Foundation in seven — six of them services firms and consultancies, as
"required" or "preferred". Two postings name Tosca.

A weak plan: "ISTQB Foundation, then Agile Tester, then the Advanced Test Analyst, then a Tosca certificate and a
Selenium certificate, and only then apply." That is many months and several exam fees before one application, an
Advanced module she cannot sensibly take yet, and a "Selenium certificate" that is only a course completion.

A strong plan, written out:

    Goal:          QA / automation engineer, services firm or GCC, applying from this month
    Evidence now:  ShopSathi repo (22 tests, API + Playwright + Locust, CI), resume rewritten
    First:         ISTQB Foundation — named in 7 of 20, mostly by the employers I want first
    Study:         the current syllabus from istqb.org; mock questions from my exam provider only
    Not now:       Agile Tester and Advanced (not named; Advanced needs experience), Tosca (2 of 20; learn on the job)
    Also:          one Selenium + Java framework in my repo, since 11 of 20 name Selenium
    Apply:         now, in parallel — "ISTQB Foundation, exam booked for <month>" is honest

**Arjun** wants an SDET role at a Bengaluru product company. His shortlist never names ISTQB; it names Python or
Java, data structures, a framework, API testing and CI. A certification is not his bottleneck: his coding round is.
His plan: two coding problems a day with tests written for his own solution, deepen the capstone framework
(fixtures for test data, a contract test, a cleaner CI matrix), and revisit ISTQB only if a GCC he meets asks for it.

**What the two plans share.** Each starts from real job descriptions, not a forum list; each counts what the target
employers name; each applies while studying; and each can say in one sentence why this certification or none. That
sentence is the answer to "Why did you choose this certification?"`,
    mcqs: [
      mcq('Pooja has finished the track and targets QA roles at IT services firms and testing consultancies. Which first certification fits her best?', [
        ['ISTQB Foundation, the one her target postings name most often', true],
        ['ISTQB Advanced Test Manager, so her resume stands above other freshers', false],
        ['A Selenium certification from a training institute, which every firm checks', false],
        ['A cloud fundamentals exam, since every QA filter now asks for cloud first', false],
      ], 'Foundation matches what services firms and consultancies name, and the track covered most of its ideas. Advanced modules assume experience and require Foundation, a "Selenium certification" is a course completion since the project runs no exam, and cloud exams are not a QA filter.'),
      mcq('A training institute advertises a "Selenium Certified Professional" exam as "the official Selenium certification". What should Harish know?', [
        ['The Selenium project runs no exam; this is a course certificate to label as one', true],
        ['It is official, because the Selenium project licenses its exams to every institute', false],
        ['It replaces ISTQB Foundation, since a tool certificate ranks above a syllabus exam', false],
        ['It must be listed as "certification", since employers verify every institute course', false],
      ], 'Selenium is an open-source project with no certification exam, so anything advertised is a provider\'s course completion; it can go on a resume labelled as a course. It does not replace ISTQB, it is not licensed by the project, and calling it a certification misleads a reader.'),
      mcq('Why does the CERTIFICATIONS unit tell Ganesh not to take an ISTQB Advanced module straight after the track?', [
        ['Advanced modules assume work experience and need Foundation first', true],
        ['Advanced modules are retired, and only Foundation is still offered', false],
        ['Advanced modules are only for Java testers, and the track used Python', false],
        ['Advanced modules can be taken only after an employer nominates you', false],
      ], 'The Advanced levels build on Foundation and on testing experience, and some providers ask for proof of it. They are not retired, they are language-neutral, and individuals can book them; but they make sense after a year or more of work.'),
    ],
    checkpoint: [
      ck(PR, 'Suresh has finished the track and wants an automation role at a GCC. Which certification plan is strongest?', [
        ['Count what his target postings name, take the most-named one, and apply while he prepares', true],
        ['Pass ISTQB Foundation, Agile Tester and two Advanced modules before sending one application', false],
        ['Skip certifications entirely, since a framework repo replaces them in every employer\'s filter', false],
        ['Collect course certificates for Selenium, Playwright and Cypress, since tools matter most', false],
      ], 'A plan driven by his own postings answers the real filter while the capstone carries the interview, and applying in parallel loses no time. Stacking exams delays everything (and Advanced assumes experience), some filters do name ISTQB, and course certificates are not certifications.'),
      ck(PR, 'Two offers: a testing consultancy where Anjali would run manual regression on a client\'s banking app, and a startup where she would own all the automation alone. She wants to become an SDET. What should decide it?', [
        ['Which role has her writing automation that is reviewed and merged in her first year', true],
        ['Always the startup, because only startups let freshers write automation that matters', false],
        ['Always the consultancy, because SDET roles are open only to those who did manual first', false],
        ['Whichever pays more, since the kind of employer makes no difference on an SDET path', false],
      ], 'SDET skill grows from writing test code with feedback, so the deciding facts are the work and the review in each offer. Either "always" rule ignores the specifics, manual testing first is common but not required, and pay alone says nothing about what the first years teach.'),
      ck(PR, 'In an interview Rahul is asked, "Why ISTQB Foundation and not a tool certificate?" Which answer is strongest?', [
        ['Most of his target postings name it, and it gives the shared vocabulary his clients will use', true],
        ['Tool certificates are worthless now and no Indian employer has taken one seriously in years', false],
        ['ISTQB was the only exam his college placement cell was offering vouchers for that semester', false],
        ['His seniors told him the Foundation exam is the easiest one to clear, so he picked it first', false],
      ], 'A strong answer gives reasons tied to his goal and his targets. Dismissing other credentials, or pointing to vouchers or friends, shows no judgement of his own.'),
    ],
  },

  /* ── MOCK_LOOP ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PLACE_CANDIDATE_MOCK_LOOP',
    notes: `One complete interview day for an **entry QA engineer, automation engineer or SDET** role in India — the shape most
product companies, GCCs and the stronger services and consultancy teams use; services mass hiring often merges
rounds 1 and 2 and drops round 3. Pay varies widely by city, employer and role; check current figures for each
company rather than trusting a forum. Run it with a friend or mentor as interviewer, in one day, with real timers. The
question banks are the other placement topics: QA / SDET Interview Questions for rounds 1 and 2, QA Scenario Rounds
for the testing, bug-hunt and live-coding practice. Your evidence in every round is ShopSathi.

## Round 0 — Online assessment (75–90 min, proctored)

| Section | Time | What it is |
|---|---|---|
| Aptitude | 20 min | quant, logical, reading comprehension |
| Testing MCQs | 15 min | fundamentals, test design techniques, defect lifecycle — ISTQB-style wording |
| SQL | 20 min | a verification query over a small schema, run against hidden data |
| Coding (SDET roles) | 30 min | one Python or Java problem with hidden tests |

**SQL sample.** "orders(order_id, subtotal_paise, discount_paise, delivery_paise, total_paise) and
order_lines(order_id, product_id, qty, price_paise). Delivery is Rs 49 and free when the subtotal is Rs 499 or more.
List every order whose stored figures cannot be right, with the first problem found."

    WITH line_totals AS (
      SELECT order_id, SUM(qty * price_paise) AS lines_paise
      FROM order_lines GROUP BY order_id
    )
    SELECT o.order_id,
           CASE
             WHEN l.order_id IS NULL                THEN 'no lines'
             WHEN o.subtotal_paise <> l.lines_paise THEN 'subtotal <> lines'
             WHEN o.delivery_paise <> CASE WHEN o.subtotal_paise >= 49900 THEN 0 ELSE 4900 END
                                                    THEN 'delivery rule R1'
             WHEN o.total_paise <> o.subtotal_paise - o.discount_paise + o.delivery_paise
                                                    THEN 'total <> parts'
           END AS problem
    FROM orders o
    LEFT JOIN line_totals l ON l.order_id = o.order_id
    WHERE l.order_id IS NULL
       OR o.subtotal_paise <> l.lines_paise
       OR o.delivery_paise <> CASE WHEN o.subtotal_paise >= 49900 THEN 0 ELSE 4900 END
       OR o.total_paise <> o.subtotal_paise - o.discount_paise + o.delivery_paise
    ORDER BY o.order_id;

On a seven-order sample it returned, in SQLite and DuckDB alike:

    (5002, 'delivery rule R1')     Rs 499.00 subtotal charged Rs 49 delivery — ShopSathi's SS-1
    (5006, 'no lines')             an order with no lines at all
    (5007, 'total <> parts')       59800 + 0 should be 59800, stored 59900

The traps: **LEFT JOIN, not JOIN** — the inner-join version returned only 5002 and 5007 and silently lost the order
with no lines; **>= at the boundary** (5001, the same Rs 499 cart with free delivery, is correct and must not be
listed); **integer paise**, never floats. Say aloud what the query does not check: order 5005 took Rs 239.85 off a
Rs 1,599 hamper and passes every rule above. A follow-up "WHERE discount_paise > 15000" finds it — ShopSathi's
coupon-cap defect, SS-2.

## Round 1 — Testing fundamentals and "test this" (45 min)

Six or seven questions, then a design task: "Severity or priority — give an example where they differ", "Smoke or
sanity?", "What goes in a defect report a developer can act on?", "Where would you put the delivery-boundary test,
and why not in the UI?" Then: "Test the seat-selection screen of a bus-booking app." Risks first (double booking,
payment taken with no seat, ladies' seat rules), then partitions, boundaries, states and negatives, aloud.

**Scored on:** structure, techniques named and used, risk before volume, connected to something you built.

## Round 2 — Automation (45–60 min)

"Walk me through your framework." Share the repo; explain conftest, the API client, page objects, configuration by
environment variable. Then live: "Write a Playwright test that logs in and checks the cart total", or the same in
Selenium with Java for a Java-stack team. Expect: "Why get_by_role over XPath?", "Explicit or implicit waits?", "A
test passes locally and fails in CI one run in five — what do you do?", "How do you test that Ravi cannot read
Asha's order?", "Why is your load test not in every pull request?"

**Scored on:** stable locators, no sleeps, assertions in tests not page objects, a cause before a retry.

## Round 3 — Coding (SDET roles, 45 min)

"Lines from ten CI runs look like run=3 test=ui/test_checkout.py::test_upi_pay outcome=failed. Return the flaky tests
(passed in some runs, failed in others) with failures and runs, most failures first, and separately the tests that
failed every run. Ignore skipped results and junk lines; a line repeated in one run counts once." Then: "Write the
tests for your solution."

    def classify(lines):
        outcomes = defaultdict(dict)                     # test -> {run: outcome}
        for line in lines:
            fields = dict(part.split("=", 1) for part in line.split() if "=" in part)
            test, run, outcome = fields.get("test"), fields.get("run"), fields.get("outcome")
            if not test or not run or outcome not in ("passed", "failed"):
                continue
            outcomes[test][run] = outcome                # a repeated line overwrites, not double-counts
        flaky, broken = [], []
        for test, by_run in outcomes.items():
            fails = sum(1 for o in by_run.values() if o == "failed")
            if fails == len(by_run):
                broken.append(test)
            elif fails:
                flaky.append((test, fails, len(by_run)))
        flaky.sort(key=lambda t: (-t[1], t[0]))
        return flaky, sorted(broken)

On a sample of four runs (with a skipped result, a duplicated line in run 3 and a summary line) it printed:

    FLAKY  ui/test_checkout.py::test_upi_pay  failed 2 of 4 runs
    FLAKY  ui/test_search.py::test_kurta_results  failed 1 of 3 runs
    BROKEN api/test_cart.py::test_delivery_boundary

A naive version that counts lines printed "test_upi_pay failed 3 of 5" (the duplicate counted twice) and
"test_kurta_results failed 1 of 4" (the skipped run counted as a run). Five tests — an empty log, a test failing every
run, a duplicated line, skipped and junk lines, the tie-break on name — gave "5 passed in 0.92s". Say what it is for:
the input to the ten-run flakiness table, where a broken test needs a fix today and a flaky one needs its cause.

## Round 4 — Hiring manager: the escaped defect (30 min)

"Customers were charged Rs 49 delivery on Rs 499 carts for three days after our release. Your suite was green. Walk
me through it." A strong candidate states the method: confirm and size it (which orders, how many — the round-0
query), stop the harm (a hotfix or a feature flag; refunds are the business's call, with your list), then why the
suite missed it (no test at exactly Rs 499? a test at the UI only? a test marked xfail and forgotten?), then the guard
(a boundary case at the API, a review of other money rules for the same gap). Variants: "a flaky test hid a real
failure for a week", "the release was pushed despite your no-ship report".

Then the people questions: "A developer says your bug is 'works as designed'." → the spec line, the evidence, and the
product owner decides. "You deleted shared test data in the staging database by mistake." → stop, tell the team at
once, help restore, write a blameless note and a guard (a test-only reset, never shared data) — never hide it.

**Scored on:** a hypothesis before each step, evidence over opinion, a guard not just a fix, ownership.

## Round 5 — HR (15 min)

"Will you do manual testing if the project needs it?", "Relocation and the service agreement?", "Expected CTC?" —
honest and consistent with your resume. Ask your own questions: the first six months, manual against automated work,
code review for test code, who decides a release, certification support.

## Scoring sheet (1–4 per row)

| Row | 1 | 4 |
|---|---|---|
| Test design | A list of happy paths | Risks first; partitions, boundaries and negatives named |
| Automation | Sleeps, XPath by position, asserts in page objects | Stable locators, web-first waits, right level for each check |
| Coding | Counts lines, misses edge cases | Correct, edge cases named and tested |
| Evidence | "The suite is robust" | Tests, defects out of planted, run time and flakiness from the capstone |
| Communication | Rambling or jargon | A defect explained so a product owner can decide |
| Integrity | Bluffs, hides mistakes | "I don't know — here is how I'd find out"; owns errors |

## Debrief template (fill within an hour)

    Round / interviewer role:
    Questions asked, verbatim:
    Answered well — why:
    Weak or blank — the question + what a strong answer contains:
    Facts I could not recall (syntax, tool behaviour, ISTQB terms):
    Fix before the next loop (max 3, each with a date):`,
    mcqs: [
      mcq('In the round-0 SQL check, why must the query join order_lines with LEFT JOIN rather than JOIN?', [
        ['An order with no lines has no match, and an inner join silently drops it', true],
        ['An inner join counts each order once per line, so subtotals come out doubled', false],
        ['SQLite does not support inner joins between a table and a CTE in one query', false],
        ['LEFT JOIN runs faster on small tables, and the hidden tests have a time limit', false],
      ], 'Order 5006 has no lines; the inner-join version returned only 5002 and 5007 and lost it. The line totals are grouped before the join, so nothing is doubled; SQLite joins CTEs fine; and speed is not the point — correctness is.'),
      mcq('Order 5001 has a Rs 499.00 subtotal and Rs 0 delivery. Why must the check NOT list it?', [
        ['Delivery is free at Rs 499 or more, so 5001 obeys rule R1 exactly', true],
        ['Its total is under Rs 500, so delivery rules never apply to it at all', false],
        ['The query only checks orders whose subtotal is above Rs 1,000 or more', false],
        ['It has only one line, and orders with a single line are skipped by design', false],
      ], 'R1 says free from Rs 499, so >= 49900 is correct and 5001 is fine; 5002, the same cart charged Rs 49, is the defect. Rules apply below Rs 500 too (5003 pays delivery), the query checks every order, and single-line orders are checked like any other.'),
      mcq('In the round-3 flaky-test problem, run 3 reports test_upi_pay as failed twice. What should the solution count?', [
        ['One failure in run 3, because outcomes are per run, not per line', true],
        ['Two failures, because each line is a separate test execution', false],
        ['None, since a duplicated line means the run itself is corrupt', false],
        ['Three runs for that test, one for each line ever seen in run 3', false],
      ], 'The question asks how many runs a test failed in, so a repeated line in one run counts once; the naive line counter reported "failed 3 of 5" instead of 2 of 4. Throwing the run away loses real data, and lines are not runs.'),
      mcq('Round 2: "A test passes locally and fails in CI one run in five." Which first answer scores best?', [
        ['Open the CI trace of a failure and find what raced, then fix the cause', true],
        ['Add a retry of three to the test, since a pass on retry proves it works', false],
        ['Increase every timeout in the suite to sixty seconds to cover slow runners', false],
        ['Delete the test, since a test that fails without a code change is useless', false],
      ], 'Managing Flaky Tests and Test Health: measure it, read the trace, fix the cause or quarantine with an owner and a date. A silent retry hides real failures, blanket timeouts slow the suite and hide races, and deleting the test removes the protection it gave.'),
      mcq('After the mock day, Rohit\'s debrief says "Automation round went badly". Which rewrite is most useful?', [
        ['"Used XPath by position and a sleep; rewrite three tests with roles and web-first waits by 12 Nov"', true],
        ['"Automation round went badly; I will revise all of Playwright and Selenium over the next month"', false],
        ['"The live task was far harder than anything a fresher would ever be asked to do at a real job"', false],
        ['"I was nervous in the automation round, so I must try to stay much calmer in the next one"', false],
      ], 'A useful debrief names the exact gap and a dated fix. Revising everything, blaming the task or noting nerves gives nothing specific to practise before the next loop.'),
    ],
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PLACE_CANDIDATE_CHECKPOINT',
    notes: `This checkpoint measures the judgement a QA hiring panel looks for: a resume whose every claim has evidence behind it,
a framework that runs and leaks nothing, certifications chosen for a reason, and method and honesty across the
interview day.

Recall the rules of this topic:
- **Every claim is checkable** — tests by level, defects out of known, run time and flakiness from a log or a table.
- **Nothing published that should not be** — no credentials, real personal data, employer work, or tests of sites you do not own.
- **Method before answers**, and mistakes owned out loud.

Each question is a scenario. Pick what a strong candidate would actually do.`,
    checkpoint: [
      ck(PR, 'Deepak\'s skills line reads "Selenium, Appium, JMeter, Cypress, Playwright, Tosca, LoadRunner, Cucumber, Postman". He used Playwright, Postman and some Selenium. What should he do?', [
        ['Cut it to what he used, grouped by area, each one something he can defend for ten minutes', true],
        ['Keep the list, because a long line of tools shows the breadth an automation role is after', false],
        ['Add more tools, since recruiters match keywords and the longest line wins the first filter', false],
        ['Keep the list but mark the unused tools "familiar", so that nobody can call them false later', false],
      ], 'Every item on the line becomes an automation-round question; unused tools fail the first follow-up and cost trust in the rest. "Familiar" is still a claim he cannot back, and breadth without depth is not what panels reward.'),
      ck(PR, 'A services firm\'s JD says "ISTQB Foundation preferred". Swathi has the capstone and her exam is booked for next month. How should her resume show it?', [
        ['"ISTQB Foundation (exam booked, month)", with the capstone leading', true],
        ['"ISTQB certified", since she expects to pass before anyone checks', false],
        ['Nothing, since an unfinished exam counts against a fresh candidate', false],
        ['"ISTQB equivalent", since the track covered most of the syllabus', false],
      ], 'True status is honest and still answers a "preferred" line; claiming a pass in advance fails background verification against the certificate number. Hiding it wastes a relevant signal, and "equivalent" is a claim nobody can check.'),
      ck(PR, 'Imran has offers from a GCC automation team and a services firm where he would execute a client\'s manual regression spreadsheet. He wants to become an SDET. Which question matters most?', [
        ['Whether he will write and merge reviewed test automation in his first year', true],
        ['Which office is nearer his flat, since commute time matters every single day', false],
        ['Which company has more LinkedIn followers, since brand helps the next switch', false],
        ['Which offer has the more senior-sounding title, since titles set the next level', false],
      ], 'His goal is SDET work, so the deciding fact is whether the first year builds test-code skill with feedback. Commute, brand and title matter less than the work he will actually do.'),
      ck(PE, 'Which file should NOT be in Ritu\'s public test-framework repository?', [
        ['A .env with the staging password of the company where she interned', true],
        ['DEFECTS.md, with one report per planted defect and its test id', false],
        ['The Locust file with its workload model and thresholds in code', false],
        ['A conftest that starts the app and resets data before each test', false],
      ], 'A real credential in a public repository is exposed to everyone and stays in git history; it must be rotated and removed. Defect reports, the load test and the fixtures are exactly what reviewers want to see.'),
      ck(PE, 'Manish\'s README claims "the suite catches access-control bugs". What makes this claim checkable?', [
        ['The two-user test failing on the buggy build, its report, and passing on the fix', true],
        ['A sentence saying every endpoint was reviewed carefully for security issues', false],
        ['A screenshot of the order page refusing a different user in the browser UI', false],
        ['A link to the OWASP page that explains broken access control in general', false],
      ], 'The claim is about catching a defect, so the evidence must show the test going red on the defect and green on the fix. A sentence proves nothing, the UI hid ShopSathi\'s bug while the API leaked, and a general page is not his suite.'),
      ck(PE, 'Bhavya\'s resume says "found all defects in ShopSathi". Her suite found 7 of 9 and she found one more by exploring. What should it say?', [
        ['"8 of 9 planted defects: 7 by the suite, 1 by an exploratory charter"', true],
        ['"All defects found", since 8 of 9 is close enough to count as all', false],
        ['"9 of 9", since the last one would surely have been found with more time', false],
        ['Leave numbers out, since a missed defect makes the project look weak', false],
      ], 'The true count with its source is credible and invites a good conversation about the one missed. Rounding up or claiming the ninth fails the first follow-up, and dropping the numbers throws away her strongest evidence.'),
      ck(IP, 'In round 2 Yamini is asked how Selenium Grid distributes sessions to nodes, and she is unsure of the detail. What should she do?', [
        ['Say what she knows, name the gap, say where she would check it, and why it matters', true],
        ['Give a confident, detailed answer anyway, since pausing looks under-prepared', false],
        ['Say Grid is outdated and nobody uses it, so the question does not really matter', false],
        ['Steer the answer to her Playwright work, where she is far more confident instead', false],
      ], 'Panels score honesty at the edge of knowledge; a confident wrong answer is worse than a named gap. Grid is still widely used, and dodging leaves the gap where the panel can see it.'),
      ck(IP, 'In the escaped-defect round, the interviewer adds: "There was a test at exactly Rs 499, and it was marked xfail." How should Kiran change his answer?', [
        ['A known defect shipped under its marker: ask why, and add a release check on open xfails', true],
        ['Keep insisting that a boundary test was missing, since changing course looks indecisive', false],
        ['Blame pytest for allowing xfail at all, and propose banning every marker from the suite', false],
        ['Ask the interviewer to name who added the marker, so that person can be held responsible', false],
      ], 'New evidence changes the cause: the gap was in process, not in coverage, so the guard is a release check on known failures (strict=True would have flagged a fix, not a ship). Sticking to a disproved theory, blaming the tool or looking for someone to blame all fail the method.'),
      ck(IP, 'A panellist asks Neha: "Why are only a few of your 22 tests in the browser?" Which answer is strongest?', [
        ['Rules are checked at the API in milliseconds; the browser covers what only it shows', true],
        ['Browser tests are always flaky in CI, so she avoided them wherever she possibly could', false],
        ['Playwright cannot test money rules, so they had to go to the API layer instead', false],
        ['The capstone brief set a limit on UI tests, so she wrote only what it allowed', false],
      ], 'Each check belongs at the lowest level that can catch it, and her suite shows it: the rules file ran 11 tests in about two seconds. Browser tests are not always flaky, Playwright can assert totals (her boundary test did), and no limit was set — it was her design choice.'),
      ck(IP, 'In the HR round, Gopal is asked: "Will you do manual testing if the project needs it?" He wants automation but is willing. What is the best answer?', [
        ['Yes, honestly, with how he would use it to find what to automate, and ask the mix', true],
        ['Say he loves manual testing, because any hesitation now will cost him the offer', false],
        ['Say he will only accept automation work, and hope they make an exception later', false],
        ['Avoid the question and talk about his framework, so that the topic of manual work quietly drops', false],
      ], 'An honest yes that links manual work to automation, plus a question about the mix, builds trust and tells him what the job is. Overstating, refusing and hoping, or dodging all create problems after joining.'),
    ],
  },
];
