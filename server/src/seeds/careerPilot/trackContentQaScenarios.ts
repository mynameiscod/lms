/**
 * Career-track placement content: QA Scenario Rounds (QA_SCENARIO_ROUNDS), QA / SDET, batch QA4.
 *
 * The rounds of a QA or SDET loop that are not question-and-answer: the "test this feature" round, a timed bug hunt
 * with written reports, the automation take-home, the SDET live-coding round, then a timed scenario set. Each round
 * unit walks one full example — what the interviewer is testing, what you say aloud and in what order, how it is
 * scored and how candidates fail — and refers back to the track's test design, exploratory testing, bug reports,
 * pytest framework, Playwright, API testing and flaky-test lessons by title rather than re-teaching them.
 *
 * Verified on a Windows laptop with Python 3.13, Flask 3.1, pytest 9.1, Playwright 1.64 for Python with
 * pytest-playwright 0.10 in the installed Google Chrome (channel "chrome"), requests 2.34, jsonschema 4.26 and
 * Hypothesis 6.170: RechargeWala, the bug-hunt demo (one Flask file, nine planted defects), was built and every finding
 * was reproduced by a Playwright script whose output is quoted; the take-home skeleton (conftest that starts the app,
 * a page object, an API client, UI and API tests, strict xfail for known bugs) was run and its output is quoted,
 * including a real failure caused by a mistyped regex; the live-coding solutions and their pytest and Hypothesis tests
 * were run, first versions' real failures included. Companies, people and data are fictional.
 *
 * Default skill TEST_DESIGN; AUTOMATION_TAKEHOME measures UI_TEST_AUTOMATION and LIVE_CODING_ROUND AUTOMATED_TESTING;
 * in the checkpoint, ck() names those skills.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_QA_SCENARIO_ROUNDS_BUNDLES: PilotBundle[] = [
  /* ── TEST_THIS_ROUND ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_SCENARIO_ROUNDS_TEST_THIS_ROUND',
    notes: `"Test this pen." "Test a lift." "Test the login page." "Test WhatsApp's send button." The "test this" round turns
up in service-company walk-ins in Chennai, product-company loops in Bengaluru and GCC QA panels in Hyderabad. It runs
15–25 minutes, spoken, sometimes with a whiteboard. **The interviewer is testing whether you think in risks and
techniques, not whether you can list a hundred tests.** Sixty unordered ideas score below fifteen grouped under the
risks that matter, with boundaries named exactly and one sentence on what you would automate.

You already have the tools: *Equivalence Partitions and Boundary Values*, *Decision Tables and Cause-Effect*,
*State Transition Testing*, *Exploratory Testing and Heuristics* (SFDIPOT, Goldilocks, Interruptions, Double and
parallel) and *From User Stories to Test Cases*. This round is using them aloud, in order, under a clock.

## The frame, in order

| Minutes (of 20) | Step | What you do |
|---|---|---|
| 0–3 | Clarify | Who uses it, what it must do, limits, platforms — ask, then write assumptions in a corner |
| 3–6 | Risks | What would hurt most: money, security, data, lock-out, reputation — rank the top three aloud |
| 6–9 | Model | Inputs, outputs, states, rules — say "this is a state machine" or "this is a decision table" |
| 9–16 | Tests by technique | Partitions and exact boundaries, rules, states, negatives, interruptions |
| 16–18 | Beyond function | Security, performance, accessibility, compatibility — one or two each, tied to a risk |
| 18–20 | Close | Priority order, what you automate at which level, what you would take back to the product manager |

## A full round

**Interviewer:** "Kosh Bank, a fictional bank, is adding an OTP screen after password login on its mobile app. Test it."

**Candidate asks, and the interviewer answers.** OTP length? Six digits by SMS, valid three minutes. Attempts? Five
wrong attempts lock login for 30 minutes. Resend? Allowed after 30 seconds, at most three per login. Does a new OTP
cancel the old one? "What do you think?" — "I would expect so; I'll write it down as an assumption and test it."
Platforms? Android and iOS, English and Hindi, SMS autofill on Android.

**Assumptions, written in a corner:** only the latest OTP is valid; the lock is per account, not per device; every
timer is measured on the server.

**Risks, ranked aloud.** "One: someone without the phone gets in — a wrong, old or reused OTP accepted, or unlimited
guessing. Two: genuine customers locked out — a valid OTP rejected, expiry too early, a late SMS. Three: this is the
door to a bank account, so any failure here becomes a support-call storm on salary day."

**Model.** "This is a state machine with a few numeric limits." Sent → Verified on the right OTP; Sent → Sent with one
attempt fewer on a wrong one; Locked on the fifth wrong one; Expired after 180 seconds; a resend starts a new Sent
with one resend fewer.

**Tests, grouped as said aloud:**

- **Partitions and boundaries.** Six correct digits; five digits (is Verify disabled?); a seventh digit (does the
  field stop at six?); letters; a pasted "123 456"; an OTP with a leading zero, "012345", because an OTP stored as a
  number becomes 12345. Expiry: submit at 179 seconds (accepted) and 181 seconds (rejected), and ask what exactly 180
  means. Attempts: the fourth wrong attempt shows "1 attempt left", the fifth locks; the right OTP after four wrong
  ones is accepted. Lock: still locked at 29:59, open at 30:00. Resend: disabled at 29 seconds, enabled at 30; the
  third resend allowed, a fourth refused.
- **States and rules.** After a resend, the old OTP is rejected. A used OTP cannot be used again. An OTP from a login
  on one phone does not verify a login on another. A lock on one device holds on the second.
- **Negatives and interruptions.** Leave the app to read the SMS and come back — the countdown is still right. Kill
  the app mid-OTP. Turn the network off as Verify is pressed — one tap must not count as two attempts. Double-tap
  Verify. SMS 1 arriving after SMS 2 — only the latest works.
- **Beyond function.** Security: the OTP never appears in an API response, a log line or an analytics event; the
  attempt limit holds when the verify API is called directly, not only in the app; the error does not say which digit
  was wrong. Accessibility: TalkBack reads the field's label, six separate boxes behave as one field, the countdown is
  announced now and then, not every second. Hindi messages fit the screen. Performance: ask the p95 target for the
  verify call at the 9 a.m. salary-day peak.

**Close.** "With one day I would do security and lock-out first — old OTP, reuse, the attempt limit, the limit at the
API — then the expiry and resend boundaries, then interruptions. I'd automate the rules at API level with a
controllable clock, because waiting three minutes per expiry test and 30 for a lock is slow and flaky, and keep one UI
test for the happy path and one for the lock message. I'd ask the product manager whether a lock sends the customer
an SMS and what support sees."

Odds worth saying if guessing comes up: six digits are 1,000,000 combinations, so five tries guess one OTP with a
chance of 5 in 1,000,000 (0.0005%) — which is why the limit and the lock matter more than the length.

## How it is scored

| Area | Weight | Full marks when |
|---|---|---|
| Clarifying and assumptions | 15% | asks about limits, timers and platforms first; writes down what was not answered |
| Risk-led priority | 25% | names and ranks the risks, and the test order follows them |
| Technique and coverage | 30% | boundaries said as values (179 and 181), states and rules, negatives, interruptions |
| Beyond functional | 15% | security, accessibility, performance tied to this feature, not recited |
| Communication and close | 15% | grouped, calm, ends with priorities, automation levels and open questions |

**Ways to lose:** listing tests before asking anything; "enter a valid OTP, enter an invalid OTP" and stopping;
"check boundary values" without saying which values; forgetting time — expiry, lock duration, countdown; testing only
through the screen and never saying the limit must hold at the API; no answer to "you have one hour"; arguing with the
interviewer's constraint instead of writing it down; reciting "performance, security, usability" with nothing behind
the words.`,
    workedExample: `**Interviewer: "Test this ceiling fan with a remote." (an object question, eight minutes)**

**Answered badly.** "Check the fan rotates. Check speed 1, 2, 3, 4, 5. Check the remote works. Check the colour.
Check the light. Check it is not noisy. Check the box. Check the price..." — twenty tests, no order, no questions.

Why it fails: no user, no risk, no limits, and "check it is not noisy" cannot pass or fail.

**Answered well.** "Who is it for and where — a home in Chennai or a shop? Which voltage range does it claim? How far
should the remote work? Does it remember its speed after a power cut?" (Home, 180 to 250 volts, 10 metres, yes.)

"Risks first. Safety: a blade or the canopy coming loose, a shock, overheating. Then function: it runs at every
speed and the remote controls the right fan. Then claims: noise and energy figures on the box.

Model: speed is a state machine, 0 to 5, changed by the remote and the wall regulator; the remote is pairing plus
range.

Tests. Each speed step up and down, and 5 to 0 directly; after a power cut, back at the remembered speed; voltage at
180 and 250, and a dip to 170 — it must stop safely, not hum and overheat; the remote at 9.5 and 10.5 metres, through a
door, with weak batteries; two fans in one room — does one remote drive both? Mounting: run 8 hours at speed 5, check
wobble and the canopy screws. Humidity and heat for a coastal summer. Noise measured against the claimed decibel
figure at a stated distance, so it can fail.

Priority: safety and mounting first, then voltage and power-cut behaviour, then the remote, then claims. If this were
software I'd automate the speed state machine; for a fan, a rig that cycles speeds overnight."

Why it works: the same frame as the OTP screen — clarify, risks, model, tests with real limits, beyond function,
priority — in eight minutes. Interviewers ask object questions to see whether the frame is yours or memorised for
login pages.`,
    mcqs: [
      mcq('Kosh Bank\'s OTP is valid for 180 seconds. Which expiry tests should the candidate name aloud?', [
        ['Submit at 179 seconds and at 181 seconds, and ask what exactly 180 means', true],
        ['Submit once at 90 seconds, the middle of the valid period, to stay safe', false],
        ['Submit at 0 seconds and at 360 seconds, the two extremes of the timer', false],
        ['Submit after waiting one full minute, then after waiting two full minutes', false],
      ], 'Boundary tests sit just inside and just outside the limit, and the exact value is ambiguous until someone decides it, so asking is part of the answer. A mid-range value or far extremes test the partitions but would miss an off-by-one at the limit.'),
      mcq('Why does the candidate want a test hook to control the clock before automating Kosh Bank\'s expiry and lock tests?', [
        ['Waiting three minutes per expiry and 30 for a lock makes the suite slow and flaky', true],
        ['Mobile operating systems block automated tests from reading the device clock', false],
        ['The OTP cannot be read by an automated test unless the clock has been frozen', false],
        ['Clock hooks are required by RBI rules for every test of a banking login screen', false],
      ], 'Real waits stretch a run by minutes per test and make timing-sensitive checks fragile; a controllable server clock or a shortened timer in test builds keeps them fast and exact. The other options invent restrictions — reading the OTP is solved with a test SMS hook, not a frozen clock.'),
      mcq('Twelve minutes in, the interviewer says "you only have one hour of testing before release." Which reply scores best?', [
        ['Security and lock-out first — old and reused OTPs, the attempt limit, the limit at the API', true],
        ['Run every test idea listed so far, but quickly, and skip writing down any of the results', false],
        ['Start with the Hindi translations, because they are the fastest tests to finish in an hour', false],
        ['Ask for the release to be moved, because an hour is too short to test anything properly', false],
      ], 'The priority comes from the ranked risks: a security hole or a lock-out of genuine users does the most damage, so those tests come first. Rushing everything without evidence, choosing tests by speed, or refusing the constraint all ignore what the question is checking.'),
    ],
    checkpoint: [
      mcq('Asked to "test the UPI Pay button", a candidate immediately recites 40 test cases. What is missing first?', [
        ['Questions about limits and users, and the ranked risks that would order those cases', true],
        ['More test cases, since 40 is too few for any feature that moves the customer\'s money', false],
        ['A test-case template with IDs, preconditions and steps, written before saying anything', false],
        ['A list of the automation tools that will be used to execute all 40 of the test cases', false],
      ], 'Without clarifying the limits and ranking the risks, 40 cases have no order and may miss the dangerous ones, such as a double debit. More cases, a template or a tool list add volume or ceremony, not the risk-led thinking the round scores.'),
      mcq('After four wrong OTPs the tester enters the correct one and expects login to succeed. Which technique does this test come from?', [
        ['State transition testing — the attempt count moves the screen towards the lock state', true],
        ['Equivalence partitioning of the six OTP digits into valid and invalid character sets', false],
        ['Pairwise testing of the operating system, language and network type combinations', false],
        ['Decision table testing of the resend button, its 30-second timer and the resend limit', false],
      ], 'The screen\'s behaviour depends on its history — how many wrong attempts came before — which is exactly what state transition testing models; the test checks the last transition before Locked. Digit partitions, pairwise sets and the resend rules test other parts of the feature.'),
      mcq('Kosh Bank enforces the five-attempt limit only in the mobile app. Which test exposes that?', [
        ['Call the verify API directly six times with wrong OTPs and check the sixth is refused', true],
        ['Enter five wrong OTPs in the app and check that the lock message is shown on screen', false],
        ['Reinstall the app after four wrong attempts and check that the counter starts at zero', false],
        ['Enter wrong OTPs on two phones and check that each phone shows its own lock message', false],
      ], 'If the limit lives only in the app, anyone calling the API can keep guessing; only a test at the API proves the server enforces it. The in-app test passes even with the flaw, and the reinstall and two-phone tests still go through the app that holds the limit.'),
    ],
  },

  /* ── BUG_HUNT_ROUND ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_SCENARIO_ROUNDS_BUG_HUNT_ROUND',
    notes: `Some product companies and most QA-focused start-ups give a hands-on round: a small app, its spec, 25 minutes to
explore, 15 to write your best reports, then a 10-minute debrief. **The interviewer is testing whether you find the bugs
that matter first and report them so a developer can fix them without asking you anything.** Finding twelve cosmetic
issues scores below finding the double charge and writing it up well.

This is *Exploratory Testing and Heuristics* with a stopwatch, and *Defects: Finding, Reporting and the Bug Lifecycle*
under pressure.

## The demo app: RechargeWala

RechargeWala is a fictional mobile-recharge page (one Flask file) built for this lesson with nine planted bugs. The spec
the candidate gets:

- Mobile number: 10 digits starting 6–9; spaces and a +91 prefix are allowed and stripped.
- Operator: required. Amount: whole rupees, Rs 10 to Rs 5,000 inclusive.
- Convenience fee: Rs 2 on amounts under Rs 200.
- Coupon FIRST50: Rs 50 off amounts of Rs 500 or more, once per recharge.
- Pay: one transaction per click; the confirmation shows the transaction id.
- Recent recharges: the last three, shown by nickname or number.

## The 25 minutes, in order

| Minutes | What you do |
|---|---|
| 0–3 | Read the spec. Underline every number (a boundary) and every rule (a decision) |
| 3–5 | The happy path once — the money tour — to learn the app and get a baseline |
| 5–20 | Charters by risk: money (total, fee, coupon); limits (Goldilocks on every field); double and parallel (double-click Pay, Apply twice); after an error; follow the data (nickname into the list); behind the screen (DevTools Network) |
| 20–25 | Re-run each finding once and write down the exact steps and values |

Behind the screen means opening the Network tab to see what the page sends, and replaying the request with an API
client. In a hiring exercise you are allowed to; on any other site you test only what you own or are authorised to
test.

## What the hunt found

Every finding below was reproduced by a Playwright script against the running app; this is its real output:

    F1 9-digit mobile -> Recharge successful. Transaction RW1001
    F2 amount 5000 -> Amount must be between Rs 10 and Rs 5,000
    F2 amount 4999 -> Recharge successful. Transaction RW1002
    F3 amount 199 -> total shown Rs 1992
    F3 amount 200 -> total shown Rs 200
    F3 amount 10 -> total shown Rs 102
    F4 one Apply   -> Rs 549
    F4 second Apply-> Rs 499
    F5 double-click Pay -> transactions: 2
    F6 after fixing number -> error visible: True | result: Recharge successful. Transaction RW1005
    F7 nickname rendered as HTML -> <b> elements in list: 1
    F8a API amount 0 -> 201 0
    F8b API discount 590 on 599 -> 201 discount stored 590
    F9 get_by_label('Amount') -> TimeoutError
        labels on page: ['Mobile number', 'Operator', 'Nickname (optional)', 'Coupon']

| ID | Finding | Severity | Charter that finds it |
|---|---|---|---|
| F5 | A double-click on Pay creates two recharges | Critical | Double and parallel |
| F8 | The API accepts amount 0 and stores whatever discount the browser sends | Critical | Behind the screen |
| F4 | FIRST50 takes Rs 50 off again on every Apply click | High | Double and parallel |
| F3 | Under Rs 200 the total is text joined to the fee: 199 shows Rs 1992, 10 shows Rs 102 | High | Money |
| F1 | A 9-digit number is accepted and recharged | High | Limits |
| F2 | Rs 5,000, the stated maximum, is rejected | Medium | Limits |
| F7 | The nickname is rendered as HTML in Recent recharges | Medium (security) | Follow the data |
| F9 | The Amount field has no label, so screen readers announce nothing | Medium (accessibility) | Behind the screen |
| F6 | The mobile error stays on screen after the number is fixed and the recharge succeeds | Low | After an error |

Two details separate a strong hunt. **F3 is one bug, not two** — 10 and 199 fail the same way, so one report carries
both examples. And **following the data on F3** shows the request body carried amount 199 with no fee at all: the
screen shows ten times too much while the fee is never charged. F7 is reported with the harmless test only — a
nickname of <b>Amma</b> that appeared bold — and the words "user input rendered as HTML"; no attack strings.

Nobody finds all nine in 25 minutes. A strong candidate finds five or six, including at least one money bug and one
double-action bug, and writes the top three or four properly.

## How it is scored

| Area | Weight | Full marks when |
|---|---|---|
| Findings | 35% | weighted by severity: money, double actions and the server trusting the browser count most |
| Report quality | 30% | title, exact steps and data, expected against actual, evidence, severity with a reason |
| Approach | 20% | charters by risk, notes kept, the request inspected, not only the screen |
| Debrief | 15% | explains the order, says what was not covered, suggests the regression test |

**Ways to lose:** cosmetic bugs only; twelve bugs in one report; "coupon not working" with no steps; no expected
result; twenty minutes on one bug; two reports for one cause; arguing with the spec; never opening the Network tab;
writing "the app is very buggy" in the summary instead of the three that matter.`,
    workedExample: `**The reports for F5, as two candidates wrote them**

**Weak.**

    Title: payment issue
    Steps: click pay
    Result: it is not working properly, please check

Why it fails: no data, no expected result, no evidence, and "click pay" does not reproduce it — a single click works.

**Strong.**

    Title: Double-clicking Pay creates two recharges (customer charged twice)
    Environment: RechargeWala build under test, Chrome on Windows 11, http://127.0.0.1:5077
    Precondition: no recharges in history (POST /test/reset)
    Steps:
      1. Mobile 9845012345, operator Jio, amount 299
      2. Double-click Pay (two clicks within about 0.3 s)
    Expected: one recharge; Pay disabled while the request is in flight
    Actual: two transactions created for one intent; GET /api/recharges returns 2 entries
    Frequency: 3 of 3 attempts. A single click creates 1.
    Evidence: screen recording; the two POST /api/recharge calls in the Network tab
    Severity: Critical — duplicate debit, refunds and support load on every slow network
    Notes: the server also accepts the duplicate, so disabling the button alone is not enough;
           an idempotency key per recharge would make the second call harmless

**And F4, in the same shape, shorter:**

    Title: FIRST50 discount is applied again on each Apply click (Rs 100 off after two clicks)
    Steps: amount 599, coupon FIRST50, click Apply twice
    Expected: Rs 549 after any number of clicks ("once per recharge")
    Actual: Rs 549 after the first click, Rs 499 after the second
    Severity: High — direct revenue loss, easy to find by accident

**In the debrief:** "I ranked F5 and F8 first because they lose money on every slow network and for anyone who
replays a request. I did not cover operator-specific plans or Hindi. For regression I'd add an API test that posts the
same recharge twice with one key and expects one transaction, and a UI test that the button disables."

Why it works: a developer can reproduce each one in a minute, the severity has a reason, and the suggestion turns the
bug into a lasting test.`,
    mcqs: [
      mcq('On RechargeWala, amount 199 shows "Total: Rs 1992" and amount 10 shows "Rs 102". What is the most likely cause?', [
        ['The amount is read as text, so adding the fee joins "2" onto the end of it', true],
        ['The fee is being multiplied by ten instead of added once to the amount', false],
        ['The page is showing the paise value of the total instead of the rupees', false],
        ['The coupon discount is applied in reverse on amounts below Rs 200 only', false],
      ], 'Both totals are the amount with "2" written after it — exactly what string concatenation produces when a text field\'s value meets "+". Multiplying by ten would give 1990, paise would give 19,900 and 20,200, and FIRST50 only applies at Rs 500 or more.'),
      mcq('Why does the strong candidate rank "double-click Pay creates two recharges" above "the mobile error stays on screen"?', [
        ['It charges a customer twice for one recharge, a direct money loss', true],
        ['It was found earlier in the session, so it should be written first', false],
        ['Visual bugs are never reported in a hiring exercise of this kind', false],
        ['Double-click bugs are always easier for developers to fix quickly', false],
      ], 'Severity follows impact: a duplicate debit costs money and support effort, while a stale message is cosmetic. The order you found things in, a supposed ban on visual bugs, or how easy a fix is do not decide severity.'),
      mcq('RechargeWala\'s page blocks amount 0, but posting {"amount": 0} to /api/recharge returns 201. Which report title is best?', [
        ['Recharge API accepts amount 0 — the server does not validate the amount range', true],
        ['Amount validation is broken everywhere on the recharge page and needs a re-check', false],
        ['Front-end validation should be removed, since the server ignores it completely', false],
        ['Security issue: hackers can break the whole recharge system using a single call', false],
      ], 'A good title names the component, the behaviour and the impact precisely: the server accepts what the spec forbids. The page\'s check works, so "broken everywhere" is wrong, removing client validation is not the fix, and a vague alarmist title helps nobody triage.'),
    ],
    checkpoint: [
      mcq('A bug-hunt round gives a seven-rule spec and 25 minutes. What belongs in the first five minutes?', [
        ['Read the spec marking each number and rule, then run the happy path once', true],
        ['Start writing reports from the spec for the bugs the app will probably have', false],
        ['Open the Network tab and replay requests before looking at the page itself', false],
        ['Test the Hindi and dark-mode versions first, since few candidates look there', false],
      ], 'Numbers are boundaries and rules are decisions, so marking them gives the charters; one happy path teaches the app and gives a baseline. Reports need observed behaviour, the API is easier to read once the flow is known, and edge themes come after the money paths.'),
      mcq('Amounts 10 and 199 both show a wrong total on RechargeWala, while 200 is right. How should they be reported?', [
        ['As one report with both examples, since they share one cause below Rs 200', true],
        ['As two reports, because each wrong amount is its own defect for the developer', false],
        ['As one report for 199 only, since Rs 10 is too small an amount to matter here', false],
        ['Not at all until the developer explains the fee rule and why 200 is different', false],
      ], 'Both fail the same way in the same partition (under Rs 200, where the fee applies), so one report with two examples lets the developer fix and verify one cause. Splitting creates duplicates, dropping an example hides the pattern, and the spec already states the fee rule.'),
      mcq('In the hunt, a nickname of <b>Amma</b> appears bold in Recent recharges. How should a QA candidate report it?', [
        ['As user input rendered as HTML, with that harmless repro and a security severity', true],
        ['By trying a list of attack scripts from the internet to prove how bad it could get', false],
        ['As a cosmetic font issue, since bold text in a list does not affect any customer', false],
        ['Not at all, because security findings belong to a separate penetration test team', false],
      ], 'The harmless repro proves input is being treated as markup, which is enough for a developer to fix the rendering; testers report it as a security defect on an app they are authorised to test. Running attack payloads goes beyond that, calling it cosmetic misses the risk, and staying silent loses the finding.'),
    ],
  },

  /* ── AUTOMATION_TAKEHOME ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_SCENARIO_ROUNDS_AUTOMATION_TAKEHOME',
    notes: `Automation and SDET roles often send a take-home: "Automate the recharge flow and its API with a framework of
your choice; three days; send a Git repository with a README." A reviewer then spends 20–30 minutes on it, and if it
passes, a call where you defend it. **The reviewer is testing whether a stranger can run your suite in one command,
whether the structure would survive fifty more tests, and whether you chose tests by risk.** A repo with 40 happy-path
tests and time.sleep everywhere loses to one with twelve well-chosen, reliable tests and an honest README.

The parts come from *Designing a Test Automation Framework*, *Fixtures, Scopes and conftest at Scale*, *Page Objects
and Test Structure*, *Locators That Do Not Break*, *Auto-Waiting and Web-First Assertions* and *API Tests in Python
with requests and pytest*.

## What reviewers check

| Area | Weight | Full marks when |
|---|---|---|
| Runs as documented | 25% | a clean clone, the README's commands, green (or explained) on the first try |
| Structure | 20% | page objects, an API client, fixtures, config by environment variable, no copy-paste |
| Test choice | 20% | happy path plus boundaries, rules and negatives chosen by risk; UI and API each where they fit |
| Reliability | 20% | no sleeps, web-first assertions, each test independent with its own data or a reset |
| README and findings | 15% | how to run, what is covered and what is not, bugs found and how the suite shows them |

## Spend six hours like this

1. **Hour 1 — explore by hand** and write the test list: the RechargeWala spec gives the boundaries (Rs 10 and
   5,000), the fee rule, FIRST50 and one-transaction-per-click.
2. **Hour 2 — the skeleton end to end:** one UI test and one API test green, with the app started by a fixture.
3. **Hours 3–4 — the rest of the list**, bugs marked as you find them.
4. **Hour 5 — run it three times, then from a fresh clone** in a new folder with a new virtual environment.
5. **Hour 6 — the README.**

## The skeleton

    takehome/
      README.md  requirements.txt  pytest.ini  conftest.py
      demo_app/app.py                      # the app under test (normally a URL in the brief)
      framework/api_client.py              # RechargeApi: recharge(), history()
      framework/pages/recharge_page.py     # RechargePage: open(), fill(), apply_coupon(), pay()
      tests/ui/test_recharge_ui.py
      tests/api/test_recharge_api.py

pytest.ini registers the ui and api markers with --strict-markers and sets --browser-channel chrome. The heart of
conftest.py:

    @pytest.fixture(scope="session")
    def base_url():
        """Use BASE_URL if given; otherwise start the demo app on a free port for this session."""
        if os.getenv("BASE_URL"):
            yield os.environ["BASE_URL"].rstrip("/")
            return
        from demo_app.app import app
        server = make_server("127.0.0.1", 0, app, threaded=True)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        yield f"http://127.0.0.1:{server.server_port}"
        server.shutdown()

    @pytest.fixture(autouse=True)
    def clean_state(base_url):
        requests.post(base_url + "/test/reset", timeout=5)   # every test starts with no recharges

Port 0 lets the operating system pick a free port, so the suite runs on any machine. The page object keeps locators in
one place — get_by_label and get_by_role, except one line: self.amount = page.locator("#amount"), commented "no label
for Amount: logged as BUG-9". A UI test and a known bug:

    def test_first50_takes_50_off_an_eligible_amount(rp):
        rp.fill("9845012345", "Jio", "599")
        rp.apply_coupon("FIRST50")
        expect(rp.total).to_have_text("Rs 549")

    @pytest.mark.xfail(strict=True, reason="BUG-4: FIRST50 applies again on each click")
    def test_first50_cannot_be_applied_twice(rp):
        rp.fill("9845012345", "Jio", "599")
        rp.apply_coupon("FIRST50")
        rp.apply_coupon("FIRST50")
        expect(rp.total).to_have_text("Rs 549", timeout=2000)

The API tests validate the 201 body with a JSON Schema and parametrise the out-of-range amounts 0, -5 and 5001 under
one strict xfail for BUG-8. **Strict xfail** keeps the suite green while the bugs stay visible in the summary, and if a
developer fixes BUG-4 the test passes unexpectedly, strict turns that into a failure, and someone removes the marker.

## The real run

    $ python -m pytest -q
    ..xxx..xx..x                                                             [100%]
    XFAIL tests/api/test_recharge_api.py::test_out_of_range_amount_is_rejected[0] - BUG-8: server accepts out-of-range amounts
    XFAIL tests/api/test_recharge_api.py::test_out_of_range_amount_is_rejected[-5] - BUG-8: server accepts out-of-range amounts
    XFAIL tests/api/test_recharge_api.py::test_out_of_range_amount_is_rejected[5001] - BUG-8: server accepts out-of-range amounts
    XFAIL tests/ui/test_recharge_ui.py::test_fee_added_below_200[chromium] - BUG-3: fee is string-concatenated, 199 shows Rs 1992
    XFAIL tests/ui/test_recharge_ui.py::test_first50_cannot_be_applied_twice[chromium] - BUG-4: FIRST50 applies again on each click
    XFAIL tests/ui/test_recharge_ui.py::test_amount_at_upper_boundary_is_accepted[chromium] - BUG-2: Rs 5,000 (the upper boundary) is rejected
    6 passed, 6 xfailed in 17.67s

    $ python -m pytest -q -m api
    2 passed, 7 deselected, 3 xfailed in 3.31s

The first run of this skeleton was not green, and the reason is a lesson: the schema's pattern had been typed in a way
that lost its backslash, and the run said

    E           jsonschema.exceptions.ValidationError: 'RW1001' does not match '^RWd+$'
    FAILED tests/api/test_recharge_api.py::test_recharge_returns_201_and_a_valid_body
    1 failed, 5 passed, 6 xfailed in 19.28s

A test bug, not an app bug — writing the pattern as a raw string, r"^RW\\d+$", fixed it. Read every red test before
you call it a defect, and never hand in a red run without an explanation.

## Ways to lose

- The README says "run the tests" with no commands, versions or browser setup — the reviewer's first run fails.
- time.sleep(3) before assertions; XPaths copied from DevTools; one 200-line test doing everything.
- Tests that pass alone and fail together because nothing resets the data.
- The URL and a password hard-coded in the tests; a committed virtual environment or .env file.
- Failing tests left red with no word on whether they are bugs or broken tests.
- Generated code you cannot explain on the call — "why a session-scoped fixture here?" ends the interview.`,
    workedExample: `**The README a reviewer can run, and the call afterwards**

    # RechargeWala automation (take-home)
    ## Run
        python -m venv .venv && .venv\\Scripts\\activate     (macOS/Linux: source .venv/bin/activate)
        pip install -r requirements.txt
        python -m pytest            # starts the demo app itself; uses installed Google Chrome
        BASE_URL=https://staging.example python -m pytest   # against a deployed build
        No Chrome? playwright install chromium, and remove --browser-channel chrome from pytest.ini
    ## Covered (12 tests, about 20 s)
        UI: happy path, FIRST50, fee under Rs 200, amount boundaries 10 / 4999 / 5000
        API: 201 and schema, history, amounts 0 / -5 / 5001
    ## Bugs found (marked xfail strict; the run lists them)
        BUG-2 Rs 5,000 rejected; BUG-3 fee joined as text; BUG-4 FIRST50 repeats;
        BUG-8 API accepts any amount; BUG-9 Amount has no label (locator by id)
        Found by hand, not automated yet: double-click Pay creates two recharges
    ## Not covered, and next
        Double-click Pay (needs an idempotency check at the API), mobile validation,
        accessibility scan, CI workflow, parallel runs with pytest-xdist

**The call. Reviewer: "Why is BUG-8 an xfail and not a skip?"**

"A skip does not run the test, so if the server starts validating, nobody notices. With xfail(strict=True) the test
runs every time; while the bug is there the run shows it, and when it is fixed the unexpected pass fails the build, so
the marker comes off and the test protects the fix."

**"How does this grow to 500 tests?"**

"The structure already separates pages, the API client and data. I'd add a data layer for test accounts, run in
parallel with pytest-xdist — which needs each worker to have its own data instead of one global reset — arrange state
through the API rather than the UI, and run the API tests on every pull request and the UI set on merge."

Why it works: the README answers the reviewer's first three questions before they are asked, it is honest about what
is missing, and every answer on the call names a mechanism rather than a slogan.`,
    mcqs: [
      mcq('The take-home\'s conftest starts the demo app with make_server("127.0.0.1", 0, app). Why port 0?', [
        ['The operating system picks a free port, so the suite runs on any machine', true],
        ['Port 0 makes the server reachable from other machines on the same network', false],
        ['Port 0 tells Flask to reload the app automatically when the code changes', false],
        ['Port 0 runs the server without threads, which keeps the tests deterministic', false],
      ], 'Binding to port 0 asks the OS for any unused port, and the fixture reads the real one from server.server_port, so a reviewer\'s busy port 5000 cannot break the run. The bind address, not the port, controls reachability, and port 0 has nothing to do with reloading or threading.'),
      mcq('Why does the take-home mark known bugs with @pytest.mark.xfail(strict=True) instead of leaving the tests red?', [
        ['The run stays green while listing each bug, and fails once a bug is fixed so the marker goes', true],
        ['Strict xfail retries the failing test three times before it reports any result to the run', false],
        ['Strict xfail hides the failing tests from the summary so that reviewers see a clean report', false],
        ['Red tests are rejected by pytest-playwright, which stops the browser for the rest of the run', false],
      ], 'xfail documents an expected failure with its reason in the summary; strict turns an unexpected pass into a failure, prompting removal of the marker when the bug is fixed. It does not retry, it does not hide anything — the reasons appear in the -ra summary — and red tests do not stop the browser.'),
      mcq('The reviewer clones the repo, runs pytest and gets Playwright\'s "Executable doesn\'t exist" error. What should the README have said?', [
        ['Which browser the suite uses, and the playwright install command if it is missing', true],
        ['That the tests should be run as administrator so that Playwright can open a browser', false],
        ['That pytest must be run twice, because the first run only downloads the browsers', false],
        ['That reviewers should switch to Selenium, which finds any installed browser itself', false],
      ], 'Playwright needs either its downloaded browsers (playwright install) or a channel pointing at an installed browser such as Chrome; the README must say which and how. Admin rights, a second run or a different tool are not the cause or the fix.'),
    ],
    checkpoint: [
      mcq('A take-home test calls time.sleep(3) and then checks the total with a plain assert. What would a reviewer rather see?', [
        ['expect(total).to_have_text("Rs 549"), which retries until the text matches or times out', true],
        ['time.sleep(5) instead of time.sleep(3), so that a slow CI machine has time to catch up', false],
        ['A try/except around the assert that retries the whole test once if the total is wrong', false],
        ['page.wait_for_timeout(3000), which is Playwright\'s own version of the sleep and is safe', false],
      ], 'A web-first assertion waits exactly as long as needed and fails with a clear message, so it is both faster and more reliable than a fixed wait. A longer sleep is still a guess, retrying the whole test hides real failures, and wait_for_timeout is the same fixed wait.'),
      mcq('In the take-home\'s page object every locator uses get_by_label or get_by_role except page.locator("#amount"). Why is that acceptable?', [
        ['Amount has no associated label (BUG-9); the comment says so and the bug is reported', true],
        ['IDs are always the best locator, so the other fields should have used them as well', false],
        ['get_by_label does not work on number inputs, so an ID is required for amount fields', false],
        ['Mixing locator styles makes the page object harder to break when the markup changes', false],
      ], 'User-facing locators are preferred, but get_by_label cannot find an unlabelled field; using the id with a note, and reporting the accessibility bug, is honest and fixable. IDs are not always best, get_by_label works on any labelled input, and mixing styles has no benefit of its own.'),
      mcq('A take-home suite passes test by test but two tests fail when the whole suite runs. What is the most likely cause?', [
        ['Shared state: nothing resets the data, so one test\'s recharges leak into another', true],
        ['The browser is too slow to run more than one test in a single pytest session', false],
        ['pytest runs tests in a random order by default, which breaks page objects', false],
        ['Markers such as ui and api cannot be used in the same run of the test suite', false],
      ], 'Pass-alone, fail-together is the signature of order dependence through shared data, such as a history list a later test expects to be empty; an autouse reset fixture or per-test data fixes it. Browsers handle many tests, pytest\'s default order is file order, and markers combine freely.'),
    ],
  },

  /* ── LIVE_CODING_ROUND ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_SCENARIO_ROUNDS_LIVE_CODING_ROUND',
    notes: `SDET loops at product companies and GCCs include a 45-minute coding round in a shared editor. The problems are
practical rather than puzzle-hard: strings (reverse words, palindromes, anagrams, first non-repeating character,
run-length encoding), collections (duplicates, frequencies, grouping, merging), and parsing (log lines, CSV, comparing
two JSON responses). **The interviewer is testing working code, edge-case thinking and — the SDET twist — whether you
test your own solution as seriously as someone else's.** A candidate who writes the edge cases as tests first and finds
their own bug scores above one whose clever code is never run.

pytest itself is from *pytest: Writing and Running Tests* and *Data-Driven and Parametrised Tests*; Hypothesis from
the same pytest-framework topic.

## The loop, every problem

1. **Restate and ask** (2 min): input format, what counts as invalid, size, the exact output.
2. **Examples and edge cases, said as tests** (3 min): empty input, one item, ties, bad lines, case, unicode.
3. **Simplest correct code** (10–15 min), talking as you go.
4. **Run the tests, read every failure aloud** (5 min).
5. **Complexity** (1 min), then the follow-ups.

## Problem 1 — the 5xx endpoints in a log

**Prompt:** "Given application log lines, return the three endpoints with the most 5xx responses." A sample line:

    2026-10-24T19:02:12+05:30 ERROR checkout POST /api/pay 502 3001ms

**Ask aloud:** is POST /api/pay?retry=1 the same endpoint? (Yes.) Ties? (By name.) Bad lines? (Skip them, but count
them.) Is 429 a failure? (Not for this question.)

**First version**, written fast:

    def top_failing_endpoints(lines, n=3):
        counts = Counter()
        for line in lines:
            parts = line.split(" ")
            status = int(parts[5])
            if status >= 500:
                counts[f"{parts[3]} {parts[4]}"] += 1
        return sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:n]

Then three tests from the questions: ranking on four clean lines, a "--- log rotated ---" line added, and a retry with
a query string. The real run:

    >           status = int(parts[5])
    E           IndexError: list index out of range
    E       AssertionError: assert ('POST /api/pay', 2) in [('GET /api/search', 2), ('POST /api/pay', 1), ('POST /api/pay?retry=1', 1)]
    FAILED test_logs_first.py::test_survives_a_rotation_marker - IndexError: list...
    FAILED test_logs_first.py::test_query_string_is_the_same_endpoint - Assertion...
    2 failed, 1 passed in 2.29s

Say it: "Two of my own edge cases fail — the rotation line has fewer fields, and I kept the query string."

**Final version:**

    def top_failing_endpoints(lines, n=3):
        """Top n (endpoint, 5xx count) pairs, most failures first, ties by name; plus malformed-line count."""
        counts, malformed = Counter(), 0
        for line in lines:
            parts = line.split()                       # any run of whitespace
            if len(parts) != 7 or not parts[5].isdigit():
                malformed += 1
                continue
            method, path, status = parts[3], parts[4].split("?")[0], int(parts[5])
            if 500 <= status <= 599:
                counts[f"{method} {path}"] += 1
        return sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:n], malformed

Its tests: ranking with ties, the query string, malformed lines (a blank line, "garbage", a non-numeric status), 429
and 201 not counted, n of 0, 1 and 99, and empty input. Real output:

    test_logs.py::test_counts_only_5xx_and_ranks_by_count_then_name PASSED   [ 12%]
    test_logs.py::test_query_string_is_not_a_separate_endpoint PASSED        [ 25%]
    test_logs.py::test_malformed_lines_are_counted_not_fatal PASSED          [ 37%]
    test_logs.py::test_429_and_2xx_are_not_failures PASSED                   [ 50%]
    test_logs.py::test_n_limits_the_result[0-0] PASSED                       [ 62%]
    test_logs.py::test_n_limits_the_result[1-1] PASSED                       [ 75%]
    test_logs.py::test_n_limits_the_result[99-3] PASSED                      [ 87%]
    test_logs.py::test_empty_input PASSED                                    [100%]
    ============================== 8 passed in 0.59s ==============================

**Complexity:** one pass over L lines, then sorting E distinct failing endpoints: O(L + E log E) time, O(E) memory.
For a 20 GB file, the same loop reads it line by line from the file handle; heapq.nsmallest(n, ...) avoids the full
sort when E is large.

## Problem 2 — run-length encoding

**Prompt:** compress("aaabcc") gives "a3b1c2". The first version counted runs inside the loop and returned. Six
parametrised cases ran against both versions; the first version failed five:

    E       AssertionError: assert 'a3b1' == 'a3b1c2'
    E       AssertionError: assert '' == 'z1'
    E       AssertionError: assert 'a2' == 'a2A2'
    FAILED test_rle.py::test_compress[aaabcc-a3b1c2-compress_v1] - AssertionError...
    5 failed, 7 passed in 1.09s

Every failure is missing its last run: the loop appends a run only when the next character differs, so the final run
is never written. The fix is one line after the loop, out.append(f"{s[-1]}{count}"), guarded by "if not s: return ''".

## Problem 3 — what changed between two API responses

**Prompt:** "List the paths where two JSON responses differ." A recursive diff over dicts and lists; sorted keys keep
the output stable. The test compares an order before and after a release:

    assert diff(V1, v2) == [
        "coupon: only in right",
        "items: length 1 != 2",
        "items[0].qty: 2 != 3",
        "total_paise: 59900 != '59900'",
        "upi: only in left",
    ]

It passed, as did "identical documents have no diff" and diff({"paid": 1}, {"paid": True}) == ["paid: 1 != True"]. In
Python 1 == True, so the function compares types too: an API that starts sending true for 1, or "59900" for 59900,
has changed its contract — the same schema drift you met in *API Tests in Python with requests and pytest*.

## How it is scored

| Area | Weight | Full marks when |
|---|---|---|
| Problem solving | 30% | correct, readable code; clarifying questions before typing |
| Testing your own code | 30% | edge cases named first, real tests run, failures read and fixed aloud |
| Communication | 20% | thinking aloud, no long silences, accepts hints |
| Complexity and follow-ups | 20% | time and memory stated; adapts to bigger input or a new rule |

**Ways to lose:** coding in silence for 15 minutes; never running the code; "it works" from one happy example;
crashing on the first malformed line; reaching for regex or a library before the simple loop works; not knowing what
Counter or sorted with a key does; arguing that edge cases "would not happen in production" — in a log, they always do.`,
    workedExample: `**Follow-up: "How would you know compress is right for every input, not just your six?"**

**Answered weakly.** "I'd add more test cases — maybe fifty strings."

Why it is weak: fifty strings you thought of share your blind spots.

**Answered well.** "I'd write the inverse, decompress, and test the property that matters for any input:
decompress(compress(s)) == s. Hypothesis generates the inputs and shrinks a failure to the smallest one."

    def decompress(code: str) -> str:
        """'a3b1c2' -> 'aaabcc'."""
        return "".join(ch * int(n) for ch, n in re.findall(r"(\\D)(\\d+)", code))

    @given(st.text())
    def test_round_trip(s):
        assert decompress(compress(s)) == s

The real run:

    E       AssertionError: assert '' == '0'
    E       Failing test case: test_round_trip(
    E           s='0',
    E       )
    1 failed in 2.56s

"Hypothesis found it in under three seconds: compress('0') is '01', and the format cannot tell the character 0 from
a count. That is a design flaw in the encoding, not a typo. Two options: agree with the interviewer that inputs are
letters only, and say so in the docstring and the generator — or change the format, for example a separator, or
always writing the count before the character."

    @given(st.text(alphabet=st.characters(categories=["Lu", "Ll"])))
    def test_round_trip_for_letters(s):
        assert decompress(compress(s)) == s

    1 passed in 0.79s

Why it works: the candidate tests a property instead of examples, reads the minimal failing case, explains the cause
in one sentence, and offers a decision with its trade-off instead of quietly narrowing the test until it passes.`,
    mcqs: [
      mcq('The first top_failing_endpoints crashed with IndexError on "--- log rotated ---". What is the best fix?', [
        ['Check the field count and skip the line, counting it as malformed', true],
        ['Wrap the whole loop in try/except and return an empty list on error', false],
        ['Delete rotation markers from the log file before the function runs', false],
        ['Use parts[-2] for the status so that short lines still have a value', false],
      ], 'Validating the shape of each line and counting the bad ones keeps the result correct and makes data problems visible. A try/except around the loop throws away every good line after the first bad one, editing the input hides the problem, and parts[-2] on a short line reads the wrong field.'),
      mcq('compress_v1("aaabcc") returned "a3b1" instead of "a3b1c2". Why?', [
        ['A run is appended only when the next character differs, so the last is never written', true],
        ['The loop starts at index 1, so the first character of the string is never counted', false],
        ['The count is reset to 0 instead of 1, so every run after the first is one too short', false],
        ['f-strings cannot join a character to an integer, so the last run is silently dropped', false],
      ], 'Every failing case lost exactly its final run, the signature of a missing flush after the loop. Starting at index 1 is correct because each comparison looks back at i - 1, the counts shown are right, and f-strings format integers without trouble.'),
      mcq('diff({"paid": 1}, {"paid": True}) reports a difference although 1 == True in Python. Why does the function compare types?', [
        ['An API that changes 1 to true has changed its contract, and clients may parse it differently', true],
        ['Python raises a TypeError when an integer and a boolean are compared with the == operator', false],
        ['JSON has no boolean type, so a true in a response always means the server has a defect', false],
        ['Comparing types is faster than comparing values, so it keeps the recursion from timing out', false],
      ], 'Equal in Python is not equal on the wire: a typed client (Java, TypeScript, a JSON Schema) treats 1 and true differently, so the change is drift worth reporting. Python compares them without error, JSON does have booleans, and speed is not the reason.'),
    ],
    checkpoint: [
      mcq('Before coding the log problem, which edge cases should the candidate say aloud as tests?', [
        ['Empty input, a malformed line, a query string, 4xx not counted, and a tie', true],
        ['Only the sample line from the prompt, since more cases waste interview time', false],
        ['A one-gigabyte file, before checking that any small example returns correctly', false],
        ['Every HTTP status code from 100 to 599, each as a separate parametrised test', false],
      ], 'Those five cases come straight from the clarifying questions and each one breaks a naive solution, as the first version showed. One sample proves little, a huge file comes after correctness, and hundreds of status codes test one comparison many times.'),
      mcq('Hypothesis reports s=\'0\' as the falsifying example for decompress(compress(s)) == s. What does it show?', [
        ['The encoding cannot tell a digit character apart from a count, a design flaw', true],
        ['Hypothesis has a bug with strings that start with a zero and should be ignored', false],
        ['compress returns None for one-character strings, so decompress cannot run', false],
        ['The test is flaky, because Hypothesis generates different inputs on each run', false],
      ], 'compress("0") is "01", which decompress cannot split into character and count; the minimal example points at the format, not a typo. Hypothesis is behaving correctly, compress returns a string for one character, and Hypothesis replays its saved failing example, so this is not flakiness.'),
      mcq('The interviewer asks for the complexity of top_failing_endpoints over L lines with E distinct failing endpoints. Which answer is right?', [
        ['O(L + E log E) time and O(E) memory for the counts', true],
        ['O(L log L) time, because every log line is sorted once', false],
        ['O(L × E) time, because each line searches the counter', false],
        ['O(1) time, because Counter lookups are constant time', false],
      ], 'One pass over the lines does constant-time Counter updates, and only the E failing endpoints are sorted. Lines are never sorted, a dict lookup does not scan the other keys, and constant-time lookups still happen once per line, so the total cannot be O(1).'),
    ],
  },

  /* ── TIMED_SCENARIOS ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_SCENARIO_ROUNDS_TIMED_SCENARIOS',
    notes: `Three QA scenario questions, **15 minutes each**, run like the real round. Ask a friend to read the prompt and to
answer your questions with the facts given here and nothing more. Say your approach first, then the steps, then the
decision and what would change it. Compare with the model answer and score yourself on the rubric. Companies and data
are fictional.

## Scenario A — "Charged twice since Friday's release" (a production escape)

**Prompt.** "ShubhPay's app released on Friday. By Saturday morning support has 40 tickets: customers charged twice
for one mobile recharge. You are the QA engineer on the team. What do you do?"

**Facts to give when asked.** Friday's release added "retry the payment call once on timeout" in the app. The app's
timeout is 8 seconds. On Friday evening the payment gateway's p95 latency rose to 9 seconds. The payment API takes no
idempotency key. The release passed every regression test; all tests ran against a gateway stub that answers in 200 ms.

**Model answer.**
1. **Contain first:** ask for the retry to be switched off by its feature flag or the release rolled back; give
   support a holding reply; operations start refunds from the duplicate list.
2. **Reproduce:** put the stub's delay at 9 seconds — longer than the timeout — pay once, and see two debits. Now the
   cause is proven, not guessed.
3. **Why the tests missed it:** the stub only ever answered fast, so the retry path never ran; no test sent the same
   payment twice.
4. **Verify the fix:** the server accepts an idempotency key per payment; tests send the same key twice and expect one
   debit, with the stub slow, fast and failing.
5. **Prevent:** a rule that every money-moving POST carries a key; a slow-gateway test in the suite; an alert on
   duplicate debits per customer in five minutes. Write the incident note without blame.

## Scenario B — "The flaky checkout test" (automation)

**Prompt.** "Our Playwright test for the FIRST50 coupon fails about one run in ten in CI, never on laptops. The team
wants to delete it. What do you do?"

**Facts to give when asked.** The failure is always "assert 'Rs 599' == 'Rs 549'". The test clicks Apply, calls
page.wait_for_timeout(500), then compares page.text_content("#total") with an ordinary assert. In the trace, the
coupon response arrives 600–900 ms after the click on failing runs. CI machines are smaller than laptops.

**Model answer.**
1. **Don't delete; quarantine:** move it out of the blocking set with a ticket and an owner — it guards a money rule
   (*Managing Flaky Tests and Test Health*).
2. **Read the evidence:** the trace shows the total was read before the coupon response arrived; the "flake" is a
   timing assumption in the test, not a product bug.
3. **Fix the cause:** replace the fixed wait and plain assert with expect(locator).to_have_text("Rs 549"), which
   retries until it matches (*Auto-Waiting and Web-First Assertions*).
4. **Prove it:** run the test 50 times in CI on the small machine; zero failures before it rejoins the blocking set.
5. **Prevent:** flag wait_for_timeout in code review, and track each test's failure rate on the CI dashboard.

## Scenario C — "Release tomorrow, one day to test" (prioritisation)

**Prompt.** "Release is tomorrow at 10 a.m. There are 420 manual regression cases and you have one tester-day. What do
you run?"

**Facts to give when asked.** This release changes the FIRST50 coupon rules and upgrades the payment SDK. A manual case
takes about 6 minutes. The automated API suite of 300 tests runs in 15 minutes in CI.

**Model answer.**
1. **Size it:** 7 working hours at 6 minutes a case is about 70 cases — a sixth of 420. Choosing is the job.
2. **Impact first:** cases touching the coupon and payment flows, the SDK across the main UPI apps and a card, and
   FIRST50's boundaries (Rs 499, 500, 501, applied twice).
3. **Then breadth cheaply:** run the automated suite for everything it covers; a 20-minute smoke of the untouched
   critical flows — login, recharge, history.
4. **Keep an hour for exploration** of the changed areas — scripted cases miss what nobody wrote down.
5. **Say what was not tested**, in writing, and let the product owner accept that risk or move the date.

## Rubric (each scenario, out of 20)

| Area | Points | Full marks when |
|---|---|---|
| Structure | 5 | contain, investigate, fix, prevent — or size, prioritise, report — in a sensible order |
| Evidence | 5 | the cause proven by a reproduction, a trace or a number, not guessed |
| Test thinking | 5 | the missing test named and designed; boundaries and conditions exact |
| Communication | 5 | who is told what, risks written down, no blame |

40 or more across the three is a pass for most junior rounds; 50 or more is strong. A score below 3 in any area shows
what to practise next — most often *Evidence*, where answers name a fix without proving the cause.`,
    mcqs: [
      mcq('In Scenario A, ShubhPay\'s gateway p95 is 9 seconds and the app retries once after an 8-second timeout. Why are customers charged twice?', [
        ['The first call still succeeds after the timeout, and the retry pays a second time', true],
        ['The gateway charges every request twice whenever its latency is above 8 seconds', false],
        ['The app sends both calls at the same moment, before the timeout has even started', false],
        ['Support staff refunded the first payment, and the customer then paid once again', false],
      ], 'A client timeout does not cancel the server\'s work: the slow first payment completes, and the retry, with no idempotency key, creates a second one. The gateway is not double-charging by itself, the retry follows the timeout, and refunds come after the tickets.'),
      mcq('Why does Scenario A\'s model answer reproduce the bug with a 9-second stub before discussing the fix?', [
        ['It proves the cause, so the fix can be tested against the same condition', true],
        ['A reproduction is required before anyone is allowed to roll back a release', false],
        ['It shows the gateway team that the slowness is entirely their own problem', false],
        ['Stubs are faster than the real gateway, so the meeting finishes earlier', false],
      ], 'A reproduction turns a theory into evidence and gives the exact condition the fix and its regression test must cover. Containment does not wait for it, it is not about blame, and speed is not the point.'),
      mcq('In Scenario B the failure is always "assert \'Rs 599\' == \'Rs 549\'" after a 500 ms wait. What is the real cause?', [
        ['The total is read before the coupon response arrives; the test assumes timing', true],
        ['The coupon rule is broken on CI and gives no discount one time in every ten', false],
        ['Playwright reads stale text from its cache when CI machines run out of memory', false],
        ['The CI browser is a different version that formats rupee amounts differently', false],
      ], 'The trace shows the response arriving after 600–900 ms, so on slow runs the test reads the old total; the product applies the coupon correctly every time. Playwright does not cache text, and a formatting difference would fail every run, not one in ten.'),
      mcq('In Scenario C, a manual case takes 6 minutes and the tester has 7 hours. About how many of the 420 cases can be run?', [
        ['About 70', true],
        ['About 42', false],
        ['About 120', false],
        ['About 210', false],
      ], '7 hours × 60 = 420 minutes, and 420 / 6 = 70 cases — a sixth of the suite, which is why prioritising by the change is the answer. 42 divides by ten minutes a case, and 120 or 210 assume a much faster pace than the facts give.'),
      mcq('Rehearsing Scenario B, Rohit says "change it to expect().to_have_text()" but cannot say why the test failed only sometimes. Which rubric area loses most?', [
        ['Evidence', true],
        ['Structure', false],
        ['Test thinking', false],
        ['Communication', false],
      ], 'He has the right fix but has not shown the cause — the response arriving after the fixed wait on slow runs — which is what Evidence scores. His steps may still be in order and well explained; the rubric separates the areas to show what to practise.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_SCENARIO_ROUNDS_CHECKPOINT',
    notes: `Ten scenario questions across the topic: the "test this" round, the bug hunt and its reports, the automation
take-home, the SDET live-coding round and the timed scenarios. Answer each as you would aloud in the room: questions
and risks before test cases, evidence before a verdict, and a test for every bug you find.`,
    checkpoint: [
      mcq('A "test this" prompt says: "Test the seat-selection screen of a bus booking app." What should the candidate do first?', [
        ['Ask about seat rules, holds and limits, then rank the risks such as double booking', true],
        ['List every seat on the bus layout and write one test case for each of the seats', false],
        ['Describe the automation framework that would run the seat-selection test cases', false],
        ['Start with colour contrast of the seat map, since it is the quickest thing to check', false],
      ], 'Clarifying the rules (how long a hold lasts, how many seats per booking, ladies\' seats) and ranking risks like two users booking one seat gives the answer its order. Enumerating seats is volume without risk, the framework comes later, and quick checks are not the priority.'),
      mcq('A booking allows at most 6 seats. Which tests does a strong candidate name for that limit?', [
        ['Select 6 seats (allowed) and try a 7th (refused), plus 1 seat and none', true],
        ['Select 3 seats, the middle of the range, since it represents all valid counts', false],
        ['Select every seat on the bus, because the largest input finds the most bugs', false],
        ['Select 6 seats only, since the maximum is the one value the spec mentions', false],
      ], 'Boundary values sit at and just past each edge — 6 and 7 at the top, 1 and 0 at the bottom. A mid-range value tests the partition but misses off-by-one errors, the whole bus tests one invalid value, and 6 alone never checks the refusal.'),
      mcq('In a bug hunt, the total looks right on screen but the Pay request body carries a different amount. Which charter found it?', [
        ['Following the data behind the screen, in the browser\'s Network tab', true],
        ['The Goldilocks heuristic applied to the length of the name field', false],
        ['A tour of the least-used features, such as the help and FAQ pages', false],
        ['Checking the page against the company\'s brand colours and fonts', false],
      ], 'Comparing what the page shows with what it sends is the only way to see this kind of money bug; the screen alone looks fine. Field-size, back-alley and brand checks look elsewhere.'),
      mcq('Which bug report title would a developer act on fastest?', [
        ['FIRST50 applies again on each Apply click: Rs 100 off after two clicks on Rs 599', true],
        ['Coupon functionality is not working as expected and needs to be checked urgently', false],
        ['Multiple issues found on the payment page during testing, details in the comments', false],
        ['Discount problem — the developer should please look into the coupon calculation', false],
      ], 'A good title names the feature, the action and the observed result with values, so triage can happen from the title alone. The others are vague, bundle several issues, or ask the developer to rediscover the bug.'),
      ck('UI_TEST_AUTOMATION', 'A take-home reviewer finds the base URL and a test password typed into five test files. What should the candidate have done?', [
        ['Read them from environment variables or config, with a safe local default', true],
        ['Put them in a comment at the top of each file so reviewers can find them', false],
        ['Commit a .env file with the real values so that the suite runs anywhere', false],
        ['Encrypt them in the test files with base64 so they are no longer visible', false],
      ], 'Configuration from the environment lets one suite run locally, in CI and against staging without edits, and keeps secrets out of the repository. Comments and committed .env files still publish them, and base64 is an encoding anyone can reverse.'),
      ck('UI_TEST_AUTOMATION', 'On the take-home call the reviewer asks why the suite arranges a recharge through the API before checking it in the UI history. Which answer is strongest?', [
        ['It is faster and less flaky than clicking through, and keeps the UI test on one behaviour', true],
        ['The UI cannot create recharges at all, so the API is the only way to get test data', false],
        ['API calls do not need a running server, so the test still passes if the app is down', false],
        ['Reviewers always prefer API calls, so using them makes the take-home score higher', false],
      ], 'Setting up state through the API removes slow, fragile UI steps that are not under test, so a failure points at the history view. The UI can create recharges, API calls still need the server, and "reviewers like it" is not a reason.'),
      ck('AUTOMATED_TESTING', 'In a live-coding round, a candidate\'s function passes the one example in the prompt. What should come next?', [
        ['Run tests for the edge cases named earlier and read each failure aloud', true],
        ['Declare it finished, since the example from the prompt has passed once', false],
        ['Rewrite it in one line with a comprehension to show advanced Python', false],
        ['Ask the interviewer to supply the test cases that will be used to grade', false],
      ], 'The SDET round scores testing your own code; the edge cases — empty input, bad lines, ties — are where first versions break, as both worked problems showed. One example proves little, a one-liner adds risk, and the tests are yours to write.'),
      ck('AUTOMATED_TESTING', 'A candidate\'s round-trip property test fails, and they narrow the generator until it passes without saying anything. What is wrong?', [
        ['They hid a real limitation instead of stating it and agreeing the input domain', true],
        ['Nothing — narrowing the generator is the normal way to fix a property test', false],
        ['Property tests should never be used in interviews, so it should be deleted', false],
        ['They should have raised the number of examples so the failure disappears', false],
      ], 'Restricting inputs can be right, but only as a stated decision ("letters only", written in the docstring) after explaining the failure; silently narrowing hides the flaw. More examples would not make a real counter-example disappear, and property tests are a strength in this round.'),
      mcq('A production escape is reported: users charged twice after a release. What is the QA engineer\'s first move?', [
        ['Help contain it — flag off or roll back — and then reproduce the cause', true],
        ['Write the root-cause document before anyone touches the live release', false],
        ['Find which tester signed off the release and report it to the manager', false],
        ['Add fifty new UI tests for the payment page before doing anything else', false],
      ], 'Customers are losing money now, so containment comes first, then a reproduction to prove the cause. A document can wait, blame helps nobody, and tests written before the cause is known may not cover it.'),
      mcq('With one day before release and far more cases than time, which statement belongs in the QA engineer\'s report?', [
        ['The list of what was not tested, so the product owner can accept that risk', true],
        ['A statement that the release is fully tested, since the priority cases passed', false],
        ['A request to skip the next release so that every case can be run beforehand', false],
        ['Nothing about coverage, because only the test results matter to a manager', false],
      ], 'Prioritising means some cases were not run; writing that down turns a hidden risk into a decision someone owns. Claiming full testing is untrue, refusing the constraint does not help, and results without coverage hide what was left out.'),
    ],
  },
];
