/**
 * Career-track placement content: QA / SDET Interview Questions (QA_IV), QA / SDET, batch QA4.
 *
 * Interview versions of what the track taught: testing as a practice (QA_TESTING_PRACTICE), test design
 * (QA_TEST_DESIGN), UI automation (QA_PLAYWRIGHT, QA_SELENIUM_JAVA, QA_PYTEST_FRAMEWORK), API testing
 * (QA_API_TESTING, QA_TEST_DATA_SQL), and performance and CI (QA_PERFORMANCE, QA_CI_QUALITY). Each set gives the
 * question, what the interviewer is testing, a model answer to say aloud, the follow-up a good answer earns and the
 * weak answer that loses the round. The topics' own INTERVIEW_QUESTION units already ask the definition of severity
 * and priority, smoke/sanity/regression, a release with no test cases, a good bug report, the 18-to-60 age field,
 * partitions versus boundaries, 192 combinations, exploratory versus ad hoc, waits in Playwright and Selenium,
 * flaky CI runs, framework structure, stale elements, Selenium versus Playwright, POST /orders, 401 versus 403,
 * Postman versus code, contract testing, load/stress/spike/soak, p95 versus the average, finding a bottleneck and
 * users for a sale day; these sets ask the next questions a panel asks, and refer back instead.
 *
 * Context: QA engineer, automation tester and SDET roles for freshers at product companies, GCCs, IT services and
 * start-ups. What was run (Python 3.13, venv in the scratchpad): Playwright 1.64 on the system Chrome (strict mode,
 * shadow DOM, iframes, new tabs, dialogs, upload and download, an XPath); Selenium 4 with Chrome (shadow_root,
 * frames, windows, alerts); pytest against a small Flask app with requests and jsonschema (pagination, schema,
 * idempotency) and a login-lockout model; every percentile, flake-rate, sharding and Little's-law figure in
 * Python. Not run: k6, JMeter, Postman/Newman, Appium, GitHub Actions itself — written from the documentation.
 *
 * Attribution: the topic is multi-skill. Each IV_* unit declares one skill and its checkpoint questions name it with
 * ck(); the CHECKPOINT unit spreads its ten over the five skills. Practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_QA_IV_BUNDLES: PilotBundle[] = [
  /* ── IV_FUNDAMENTALS ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_IV_IV_FUNDAMENTALS',
    notes: `The fundamentals slot opens nearly every QA round in India, from a services company's campus drive to an SDET loop
at a GCC. The topic set in "Testing as a Practice" already drilled the definition of severity and priority, smoke versus
sanity versus regression, two days with no test cases, and a good bug report. Once you have said those well, the panel
goes one level down. These are the questions that follow, with the technique that turns a textbook line into an answer.

## Q1. "Verification versus validation. Give me one from your own project."

**Testing:** whether you can apply the pair, not just recite "did we build it right / did we build the right thing".

**Model answer.** "Verification checks the product against what was specified: reviewing the story, reading the
code, and running tests whose expected results come from the spec. Validation checks that what was specified solves
the user's problem: a demo to the product owner, user acceptance testing, a usability session, a beta, analytics after
release. On an ed-tech results page we verified that the percentage showed to two decimals, as the story said, and
every test passed. In the usability session, three of five students looked for 'Pass' or 'Fail' first and could not
find it. Verification passed, validation failed, and the fix was a story change, not a bug fix."

**Follow-up:** "Can a product pass validation and fail verification?" — "Yes. The spec said a four-digit OTP, the app
sends six digits and users are perfectly happy. That is still a mismatch I raise, because either the code or the spec
must change, and the next tester reads the spec."

**Weak answer:** "Verification is static testing and validation is dynamic testing." Reviews are verification, but a
test executed against the spec is verification too; the pair is about what you compare against, not whether code runs.

## Q2. "Rate these five defects for severity and priority."

**Testing:** triage judgement. The definition was asked already; now you apply it, out loud, with reasons.

    Defect                                                        Severity   Priority
    UPI debited, order not created, about 0.3% of payments        Critical   P1
    Old logo on the login page on the day of the rebrand          Low        P1
    App crashes on a 25 MB photo upload (limit is 5 MB)           Major      P2
    Spelling mistake in the footer of the Terms page              Trivial    P4
    Annual tax certificate download fails (used in June, it is    High       P3 now,
      October)                                                                P1 by May

"The UPI one loses customers' money and trust, so it is top on both, and support needs a refund process today even
before the fix. The logo is cosmetic but marketing is live, so it is fixed first. The crash should be a clean 'file too
large' message: severity is about the crash, priority depends on how many users hit it, which I would check in the
logs. The last one shows that priority moves with the calendar while severity does not."

**Follow-up:** "The developer says the UPI one is the bank's problem." — "Maybe the bank's callback is late, but our
handling is ours: the order should sit in a pending state, a reconciliation job should match it against the bank
reference, and the customer should get the order or an automatic refund. I would attach the transaction references and
our logs, not argue."

**Weak answer:** "Every payment bug is a blocker" or ranking by how annoying the bug felt.

## Q3. "Your bug came back as 'Works as designed'. What now?"

**Testing:** the defect lifecycle as people use it, and whether you can disagree without a fight.

**Model answer.** "Rejected means the team thinks it is not a bug. First I check where my expected result came from.
If the story or a rule says otherwise, I quote it and reopen with that link. If the spec is silent, it is a
requirement gap, not a code defect: I take it to the product owner, who decides, and if it is wanted it becomes a story.
I do not reopen the same ticket three times. Deferred is different: everyone agrees it is a bug, and it will be fixed
in a later release, so it stays visible in the known-issues list."

**Follow-up:** "How do you measure how good the testing was?" — "Defect removal efficiency for the release: found
before release divided by all found. We found 184 and customers found 16, so 184 / 200 = 92%, and leakage is 8%. Then I
look at each escaped bug: no test existed, a test existed but checked the wrong thing, or the environment differed
from production. Each answer has a different fix."

**Weak answer:** "The number of test cases I executed" or "the number of bugs I raised."

## Q4. "Test strategy versus test plan. What is in your test plan?"

**Testing:** whether you have written one, or only heard of them.

**Model answer.** "The strategy is the long-lived approach for a product or organisation: test levels, what is
automated, environments, tools, how defects flow. It changes rarely. A test plan applies it to one release or
project: scope and out of scope, approach per feature, environments and data, people and schedule, risks with
mitigations, entry and exit criteria, deliverables. In an agile team my plan for a release fits on one page; ISO/IEC/IEEE
29119-3 lists the full set of headings if a client asks for the formal document."

**Follow-up:** "Give me exit criteria." — "Measurable ones: no open Critical or High defect without a product-owner
sign-off; every critical-path case executed; regression pass rate of at least 95% with every failure explained; the
p95 latency target met in the load test. 'Testing complete' is not an exit criterion."

## Q5. "What does shift-left look like in your sprint?"

**Model answer.** "In refinement I ask testability questions and help write acceptance criteria as examples, before a
line of code: is 'free delivery above 499' inclusive, what happens on the 500th coupon. During the sprint I test stories
as they land, write the API checks in the same sprint, and pair with the developer on unit tests for the risky rule.
The story is done only when its tests are in the pipeline. Shift-right is the other half: feature flags, monitoring
and canary releases, because some bugs only appear with real traffic."

**Follow-up:** "Three stories reach you on the last day of the sprint." — "I test the riskiest first and say clearly
what is not tested, then raise it in the retro: smaller stories, a work-in-progress limit, testing on a branch build.
Quietly working the weekend hides the problem."

## Q6. "Explain the test pyramid. When would you not follow it?"

**Model answer.** "Many fast unit tests, fewer API or service tests, a few UI journeys, because cost and feedback time
grow as you go up. It is a guide about cost, not a quota. On a legacy app with no unit tests I would start with a few
end-to-end characterisation tests to protect the main journeys before anyone refactors, then push checks down."

**Follow-up:** "Your team has 900 UI tests and 40 API tests." — "That is the ice-cream cone. I would find the UI tests
that only check a validation rule or a calculation and move them to API tests, keep UI tests for journeys and
rendering, and delete duplicates. Speed and flakiness both improve."

## How you are judged

Strong answers use an example from a real or demo project and a number where one exists. Weak answers are textbook
lines with no example, or a single sentence that stops before the follow-up starts.`,
    workedExample: `**Question: "Last release, customers reported 16 bugs in the first two weeks. Your manager asks what went wrong in QA.
What do you do?"**

**A weak answer (heard often):**

"We will add more test cases and do more regression next time."

What the panel hears: no analysis, more of the same, and no idea which kind of miss happened.

**A strong answer:**

"First the number in context. We found 184 defects before release, customers found 16, so defect removal efficiency
was 184 / 200 = 92% and leakage 8%. I would compare that with the last few releases before calling it bad.

Then I would classify each of the 16, with the developer who fixed it:

- **No test existed:** the requirement was never written down, such as the refund path when a UPI callback arrives
  after 15 minutes. Fix: add it to the risk list and the story template.
- **A test existed but missed it:** for example, our test used a 1-item cart and the bug needed 2 coupons. Fix:
  improve the test design, a boundary or a decision-table rule we skipped.
- **Environment difference:** it only happened with production data volumes or a real bank. Fix: better test data
  or a sandbox check.
- **Not a test problem:** a configuration change made directly in production. Fix: a process change, not more tests.

Then weight by severity: four Highs on payments matter more than twelve cosmetic issues. I would present one slide:
DRE, the four buckets with counts, the top three changes, and which escaped bugs now have an automated test guarding
them. Next release I would report the same numbers, so we know whether the changes worked."

**Why it scores:** a metric with its arithmetic, a root-cause classification instead of blame, fixes that differ per
cause, and a way to check the fix worked.`,
    mcqs: [
      mcq('A results-portal story said "show the percentage to two decimals". Every test of that passed, but in a usability session students could not tell whether they had passed. What happened?', [
        ['Verification passed and validation failed, so the story itself needs changing', true],
        ['Validation passed and verification failed, so the developer must fix the code', false],
        ['Both passed, because the tests matched the story and the users were consulted', false],
        ['Neither applies, since usability is a non-functional type and not either one', false],
      ], 'The product matched its spec (verification) but the spec did not meet the users\' need (validation), so the fix is a story change. The code met the spec, so it is not a verification failure; and a usability session is precisely a validation activity, not something outside the pair.'),
      mcq('Before release a team found 184 defects; customers reported 16 more in the first month. What is the defect removal efficiency?', [
        ['92%, because 184 of the 200 defects in total were found before release', true],
        ['91.3%, because 16 divided by 184 is subtracted from one hundred per cent', false],
        ['8.7%, because 16 escaped defects are divided by the 184 found in testing', false],
        ['100%, because every reported defect was eventually found and then fixed', false],
      ], 'DRE is defects found before release divided by all defects found, 184 / 200 = 0.92. Dividing 16 by 184 uses the wrong denominator (it gives 8.7%, not leakage), and a defect a customer found was not removed by testing, however quickly it was fixed afterwards.'),
      mcq('A tester\'s bug comes back "Rejected: works as designed", and the story says nothing about that case. What should the tester do?', [
        ['Raise it with the product owner as a requirement gap and let them decide', true],
        ['Reopen the bug with a higher severity so that the developer looks again', false],
        ['Close it and add a comment, since only the developer can decide on bugs', false],
        ['Mark it as Deferred so it stays open until the next release is planned', false],
      ], 'When the spec is silent, neither tester nor developer can call it a defect; the product owner decides and it may become a story. Reopening with more severity is a fight, not evidence; closing silently loses the question; and Deferred means an agreed bug postponed, which this is not yet.'),
    ],
    checkpoint: [
      ck('TESTING_FUNDAMENTALS', 'An annual tax-certificate download fails. It is October, and the feature is used only in June and July. How should severity and priority be set?', [
        ['High severity now, with a low priority that rises before June', true],
        ['Low severity and low priority, as almost nobody uses it today', false],
        ['High severity and P1 now, because severity always sets priority', false],
        ['Low severity now, rising to High severity as June comes closer', false],
      ], 'Severity is the impact when the feature is used and does not change with the date; priority is business urgency and moves with the calendar. Usage today does not make the failure less severe, priority is not derived from severity, and it is priority, not severity, that rises.'),
      ck('TESTING_FUNDAMENTALS', 'Which exit criterion for a release can a test lead actually check on the release day?', [
        ['No open Critical or High defect without a product-owner sign-off', true],
        ['Testing is complete and the team feels the build is good enough', false],
        ['All the possible inputs have been tested for every changed screen', false],
        ['The developers confirm that every bug fix has worked on their own', false],
      ], 'An exit criterion must be measurable from evidence, such as defect counts by severity with sign-off. "Complete" and "feels good" are opinions, testing every possible input is impossible, and developers checking their own fixes replaces retesting rather than measuring readiness.'),
      ck('TESTING_FUNDAMENTALS', 'A team has 900 UI tests and 40 API tests, and the nightly run takes five hours with frequent flaky failures. What does the pyramid suggest first?', [
        ['Move rule and calculation checks from the UI tests down to API tests', true],
        ['Add retries to the UI tests until the nightly run is green each morning', false],
        ['Delete the API tests, since the UI tests already cover the same paths', false],
        ['Run the 900 UI tests weekly and the 40 API tests on each commit instead', false],
      ], 'Many UI tests check things an API test can check faster and more reliably; pushing them down shrinks the slow, flaky layer. Retries hide the flakiness, deleting API tests makes the shape worse, and running UI tests weekly delays feedback without fixing the imbalance.'),
    ],
  },

  /* ── IV_TEST_DESIGN ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_IV_IV_TEST_DESIGN',
    notes: `"Test this pen", "test a lift", "test a login page": every QA candidate in India hears one of these, and most answer
with a list of forty things in random order. The panel is not counting tests. It is watching whether you ask what the
thing is for, find the risks, and then use the techniques from Test Design: partitions, boundaries, decision tables,
state transitions. The topic set already asked the 18-to-60 age field, partitions versus boundaries, 192 combinations
and exploratory testing; these are the open-ended questions that come next. The login lockout below ran under pytest.

## The shape of every "test this" answer

1. **Clarify** (30 seconds): who uses it, for what, what does it promise? 2. **Risks** first: what would hurt the user
or the business most? 3. **Techniques** by area: functional, boundaries, negative, state, non-functional. 4.
**Prioritise** aloud: "If I had ten minutes, these three." The structure is what scores; the list is the evidence.

## Q1. "Test this pen."

**Testing:** structure under ambiguity. There is no spec, so your questions are part of the answer.

**Model answer.** "What kind of pen, and who is it for? I will assume a ball pen sold to students for board exams,
which claims about 1,000 metres of writing. The risks for that user: it stops mid-exam, it smudges, it leaks in a bag.

- **Functional:** writes at first touch; a continuous line without skips; on ruled, thin and glossy paper; at
  different angles; after the cap has been off for ten minutes.
- **Boundaries and claims:** measure the writing length on a plotter against the 1,000 m claim; the click mechanism
  for 10,000 clicks; writing at 5 and 45 degrees Celsius, because a bag in a Rajasthan summer gets hot.
- **Negative:** drop from desk height onto the nib; a cabin-pressure change on a flight; writing on damp paper.
- **Usability:** grip over a three-hour paper; a left-handed writer dragging a hand over fresh ink.
- **Safety and compliance:** a vented cap so a child cannot choke on it; non-toxic ink; labelling.

With ten minutes and three pens: ink flow over a long continuous line, smudging for a left-handed writer, and a
leak test after heat, because those match the exam risk."

**Follow-up:** "What if it is a pen for astronauts?" — The same structure with different risks: zero gravity,
pressure, temperature extremes and outgassing. The interviewer is checking the method transfers.

**Weak answer:** forty tests with no question asked and no priority.

## Q2. "Test a lift."

**Testing:** state transition testing on a physical system, plus safety thinking.

**Model answer.** "Clarify: a passenger lift in a ten-floor office, single car, rated 8 persons or 544 kg. It is a
state machine, so I list states and events first:

    States:  Idle(floor), Moving up, Moving down, Doors opening, Doors open, Doors closing, Overloaded, Out of service
    Events:  hall call (up/down), car call, door sensor blocked, load changed, power cut, fire signal

- **Valid transitions:** a call from floor 7 while idle at 2 moves up, stops, opens; a car call to 9 on the way up is
  served on the way; doors reopen when the sensor is blocked while closing.
- **Invalid transitions, the safety tests:** the car must never move with doors open, and doors must never open
  between floors. I test each event in each state, not only the happy path.
- **Boundaries:** 544 kg moves, 545 kg holds the doors open with the overload alarm; no up button on floor 10 and no
  down button on the ground floor; ten car calls at once.
- **Failure:** a power cut with the automatic rescue device moving to the nearest floor and opening; the alarm and
  intercom; fire mode returning to the ground floor.
- **Non-functional:** waiting time at the morning peak, door timing for a wheelchair user, braille and audio
  announcements."

**Follow-up:** "The controller is software. What would you automate?" — "The state machine, with simulated sensors
and a fake clock, so every state and event pair runs in milliseconds; then hardware-in-the-loop tests for timing."

## Q3. "Test a login page."

**Model answer.** "Functional: valid login; wrong password; unknown user; empty fields; a username with spaces
around it; email case-insensitive, password case-sensitive. Security, on our own QA environment: the error does not
say which field was wrong; the password is masked and not in the URL or logs; the session cookie is HttpOnly and
Secure; the same limits apply when I call the login API directly. Lockout is a state machine, and that is where I find
real bugs." The rule: three consecutive wrong passwords lock the account for 15 minutes. Four tests, one per path:

    # three more tests: wrong x3 -> LOCKED; locked at minute 2, still LOCKED at 16; OK at 17
    def test_success_resets_the_counter():
        assert run([("x", 0), ("x", 1), ("Kiran@123", 2), ("x", 3), ("x", 4)]) == \\
            ["WRONG", "WRONG", "OK", "WRONG", "WRONG"]

    ...F
    E   At index 3 diff: 'LOCKED' != 'WRONG'
    FAILED test_login.py::test_success_resets_the_counter
    1 failed, 3 passed in 0.93s

"The obvious test passed. The transition 'success resets the counter' was missing in the code, so a user who mistyped
twice on Monday was locked out by one typo on Tuesday. Only a state-based test sequence finds that."

**Follow-up:** "And forgot password?" — Expiry boundaries of the reset link, a link used twice, a new link
invalidating the old one, and the same response whether or not the email exists.

## Q4. "When would you use a decision table? Show me."

**Model answer.** "When the outcome depends on a combination of conditions. A grocery app: delivery is free if
you are a member, or the cart is at least 499, or you apply FREEDEL on your first order. Three conditions give 2^3 = 8
rules. For the fee alone they collapse to four: member (anything else), not member with 499+, not member under 499
with FREEDEL, and none, which pays 40. But there is a second action, 'mark FREEDEL used', and the table makes me ask:
if a member applies FREEDEL, is the coupon consumed even though delivery was already free? The story did not say. That
question is the bug the table finds before any code exists."

**Follow-up:** "When do you keep all eight rules?" — "When the code checks the conditions in a way that can
interact, such as an order of if-statements, or when an action other than the fee depends on them."

## Q5. "Here is a story with three acceptance criteria. How many test cases will you write?"

**Model answer.** "There is no fixed number. Each criterion gets at least one positive and one negative case, each
input rule its partitions and boundaries, and then I add what the criteria do not say: errors, a second device,
retries. I write them as Given/When/Then so the product owner can review them, and link each to its criterion so
coverage is visible. For a typical story that comes to 10 to 20; I would rather show the derivation than the count."

## How you are judged

Clarify, risks, techniques, priority. Strong candidates name the technique as they use it ("that is a boundary",
"this is a state transition") and pick their top three without being asked.`,
    workedExample: `**Question: "Test the seat-selection screen of a bus-booking app." (asked at a travel start-up in Bengaluru)**

**A weak answer:**

"I will check that seats can be selected, that booked seats cannot be selected, colours, and that payment works."

What the panel hears: four unrelated checks, no questions, nothing about two people booking the same seat.

**A strong answer, spoken in about three minutes:**

"Two questions first: how many seats can one booking hold, and are there ladies-only seats? I will assume a limit
of 6 and some seats reserved for women.

**Risks:** two users getting the same seat; the fare total being wrong; a user stuck with a held seat after payment
fails.

**Partitions and boundaries:** select 1, 6 and try a 7th seat; deselect and reselect; the fare for 0, 1 and 6 seats,
lower and upper berth prices mixed.

**Decision table** for a ladies-only seat: passenger gender female or male, booking for self or for someone else,
seat ladies-only or not. The male-self-ladies-seat rule must be refused with a clear message.

**State transitions** for one seat: Available, Held (by me), Held (by someone else), Booked, Released. Hold
expires after 10 minutes: test at 9:59 and 10:00. Payment failure must move Held back to Available. Two browsers
selecting the same seat at the same second: one must win, the other must see a refusal, never a double booking.

**Non-functional:** the seat map on a small phone, screen-reader labels such as 'Seat 14, lower berth, available,
680 rupees', and the seat map loading time on a slow network.

With ten minutes I would do the double-booking race, the hold expiry with payment failure, and the 7th seat."

**Why it scores:** clarifying questions, risks before tests, three named techniques applied to this screen, and a
priority without being asked.`,
    mcqs: [
      mcq('An interviewer says "Test this pen" and nothing else. What should the first 30 seconds of the answer contain?', [
        ['Questions about what kind of pen it is, who uses it and what it claims', true],
        ['A list of every functional test that applies to a pen, in quick order', false],
        ['The ISTQB definition of black-box testing, to show the theory is known', false],
        ['A statement that a pen cannot be tested properly without a written spec', false],
      ], 'With no spec, clarifying the user and the claims is what lets you find the risks and prioritise. A list without context scores low, a definition does not test the pen, and refusing to test without a spec fails the exercise the question is checking.'),
      mcq('A lift is rated 8 persons or 544 kg. Which pair of loads is the boundary test for the overload alarm?', [
        ['544 kg should move normally and 545 kg should trigger the alarm', true],
        ['500 kg should move normally and 600 kg should trigger the alarm', false],
        ['0 kg should not move at all and 544 kg should trigger the alarm', false],
        ['8 people should move normally and 9 people should trigger it', false],
      ], 'The boundary is the last valid value and the first invalid one either side of the rated load. 500 and 600 are partition values that miss an off-by-one, 544 is valid rather than overloaded, and people are not a reliable measure when the controller weighs the load.'),
      mcq('The login lockout passes "three wrong passwords lock the account" but fails "two wrong, one correct, two wrong". Which design technique produced the second test?', [
        ['State transition testing, following the success-resets-counter path', true],
        ['Equivalence partitioning of passwords into valid and invalid groups', false],
        ['Boundary value analysis on the three-attempt limit and one more try', false],
        ['Pairwise testing of the username and password values used together', false],
      ], 'The bug is a missing transition, a successful login not resetting the failure count, found only by a sequence of events through the states. Partitions and boundaries look at single inputs or the limit itself, and pairwise combines parameters rather than ordering events.'),
    ],
    checkpoint: [
      ck('TEST_DESIGN', 'Free delivery applies to members, to carts of 499 or more, or with FREEDEL on a first order. How many rules does the full decision table have before collapsing?', [
        ['8, since three yes-or-no conditions give two to the power three', true],
        ['3, one rule for each condition that can make delivery free', false],
        ['4, the number of different outcomes the customer can see', false],
        ['6, two values for each of the three conditions added up', false],
      ], 'Each of three binary conditions doubles the combinations: 2 x 2 x 2 = 8. Three or four rules is the collapsed table after don\'t-cares, which is a later step, and adding the values (2 + 2 + 2) is not how combinations grow.'),
      ck('TEST_DESIGN', 'For a lift, which test checks an invalid transition rather than a valid one?', [
        ['Pressing a car call while the doors are open, and checking it does not move', true],
        ['Calling the lift from floor 7 while it waits idle on floor 2 with doors shut', false],
        ['Blocking the door sensor while the doors close, and checking they reopen', false],
        ['Pressing floor 9 inside the car while it is already moving up past floor 4', false],
      ], 'Moving with the doors open is a transition that must never happen, so the test proves the system refuses it. Answering a hall call, reopening on an obstruction and serving a car call on the way are all valid transitions the lift is designed to make.'),
      ck('TEST_DESIGN', 'A bus seat can be held for 10 minutes during payment. Which pair of tests checks the expiry boundary?', [
        ['Pay at 9 minutes 59 seconds, and try to pay again at 10 minutes 0 seconds', true],
        ['Pay at 5 minutes, and try to pay again at 15 minutes after the hold', false],
        ['Pay at once, and try to pay again after logging out and back in', false],
        ['Pay at 10 minutes, and try to pay again at 20 minutes after hold', false],
      ], 'The values either side of the 10-minute limit catch a < written as <= and vice versa. 5 and 15 minutes are inside each partition but miss the edge, logging out tests the session not the timer, and 10 and 20 minutes test only one side of the boundary.'),
    ],
  },

  /* ── IV_UI_AUTOMATION ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_IV_IV_UI_AUTOMATION',
    notes: `The automation round is where a panel checks that you have driven a real browser, not only read about one. The topic
sets in Playwright and Selenium with Java already asked how each tool waits, flaky CI runs, how to structure a
framework, mocking a failing payment gateway, implicit versus explicit waits, stale elements, explaining your
framework and Selenium versus Playwright. These are the "how do you handle..." questions that come next. Every
output below is real: Playwright 1.64 and Selenium 4, both on Chrome, against small local pages.

## Q1. "Which locator would you use, and write me an XPath for this button."

**Testing:** locator judgement, and whether you can write XPath when an interviewer insists.

**Model answer.** "In order of preference: role with an accessible name, label, a test id agreed with developers,
then CSS, and XPath when I need to move through the structure, for example 'the button in the row that contains this
product'. Never an absolute XPath like /html/body/div[3]/ul/li[2]/button, which breaks when any wrapper changes.
Playwright is strict, so an ambiguous locator fails loudly instead of clicking the first match. On a shop page with
two Add to cart buttons:"

    Locator.click: Error: strict mode violation: get_by_role("button", name="Add to cart") resolved to 2 elements:
        1) <button>Add to cart</button> aka get_by_role("listitem").filter(has_text="Steel bottle Add to cart")...
        2) <button>Add to cart</button> aka get_by_role("listitem").filter(has_text="Cotton kurta Add to cart")...

"I scope it to the row, either way:"

    page.get_by_role("listitem").filter(has_text="Cotton kurta").get_by_role("button", name="Add to cart")
    //li[contains(., 'Cotton kurta')]//button[normalize-space()='Add to cart']

Both matched exactly one element in Playwright, and the XPath found the same button in Selenium.

**Follow-up:** "contains(text(), ...) or contains(., ...)?" — "text() looks only at the element's own text nodes, so
it misses text inside a child span; the dot uses the whole string value of the element. normalize-space() removes
stray whitespace around a label."

**Weak answer:** "I copy the XPath from DevTools."

## Q2. "How do you handle iframes, new tabs and alerts?"

**Model answer.** "An iframe is a separate document, so a locator on the page does not see inside it. In Playwright,
frame_locator('iframe') then the locator; in Selenium, switch_to.frame and back with switch_to.default_content.
Without that, Playwright just waits ('Locator.fill: Timeout 1500ms exceeded.' in my run) and Selenium throws
NoSuchElementException. A link with target=_blank opens a new page: Playwright gives it to me with
context.expect_page(); Selenium makes me wait for two window handles and switch to the new one. For a confirm()
dialog, Playwright dismisses dialogs by default, so my 'Cancel order' button printed 'Kept' until I registered
page.once('dialog', lambda d: d.accept()), then 'Order cancelled'. In Selenium, wait for alert_is_present, read
alert.text, then accept()."

**Follow-up:** "Why does the default dismissal matter?" — "A test that clicks Cancel and asserts nothing passes while
nothing was cancelled. I assert the dialog's message and the result."

## Q3. "The element is inside a shadow DOM. Now what?"

**Model answer.** "Web components put their markup in a shadow root. Playwright's CSS and role locators pierce
open shadow roots, so get_by_label('Pincode').fill('560001') just worked. Selenium's find_element by ID raised
NoSuchElementException; Selenium 4 needs the host first:"

    pin = driver.find_element(By.ID, "host").shadow_root.find_element(By.CSS_SELECTOR, "#pin")

"XPath does not cross a shadow boundary in either tool, and a closed shadow root is not reachable from outside;
for that I ask the developers for a test hook."

## Q4. "How do you test file upload and download?"

**Model answer.** "I never drive the operating system's file dialog. For upload I set the file on the input:
set_input_files in Playwright, send_keys with an absolute path on the input in Selenium. For download, Playwright's
expect_download gives me the file; I save it and assert its contents, not just that a click happened:"

    upload: marksheet.pdf (13 bytes)
    download: ticket-PNR4521.txt -> PNR4521 SEAT 14

"I also test the rules: a file above the size limit, a wrong type, a file name with spaces and Hindi characters."

**Follow-up:** "The download is a PDF." — "I extract the text with a PDF library and check the fields that matter, such
as the PNR and amount; comparing bytes fails because PDFs embed timestamps."

## Q5. "How do you automate a flow with OTP or CAPTCHA?"

**Model answer.** "I do not try to beat a CAPTCHA; that is the control working. In test environments the team
provides a switch: CAPTCHA disabled or a test key that always passes, and a fixed OTP for test numbers, or an
internal API that returns the last OTP for a test account. One separate test checks the real CAPTCHA and OTP are on
in staging, so the switch cannot leak to production."

## Q6. "What would you not automate?"

**Model answer.** "Anything run once, anything whose UI changes every sprint, and judgements a person makes better,
such as whether a layout looks right or copy reads well. I automate what runs often and costs a lot by hand: smoke,
regression of critical journeys, data-heavy checks. My rule: if it will run more than a few times and the result is a
clear pass or fail, it is a candidate."

**Follow-up:** "Your manager wants 100% automation." — "I would show the cost: each UI test has upkeep. I would offer
100% of the regression pack for the critical journeys, with the rest left to exploratory sessions."

## How you are judged

Strong answers show code or an error message they have seen, and say what the test asserts after the action. Weak
answers stop at "I switch to the frame".`,
    workedExample: `**Question: "Automate this: on a railway-booking demo, the user searches a train, a 'Fare details' link opens a
new tab, the payment page shows the card form inside an iframe, and Cancel shows a confirm() dialog. Talk me through it."**

**A weak answer:**

"I will find each element by XPath from DevTools, add Thread.sleep(3000) after every click, and switch to the new
window and frame."

What the panel hears: brittle locators, guessed waits, and nothing asserted.

**A strong answer:**

"Search: get_by_label('From'), get_by_label('To'), the date, then the Search button by role. I assert the results
list has at least one train with expect(...).to_have_count, which waits for the results.

Fare details: wrap the click in context.expect_page(), take the new page, wait for its load state, assert the fare
breakdown sums to the total shown, then close it and continue on the original page. In Selenium I would wait for two
window handles and switch back afterwards.

Payment: frame_locator for the gateway iframe, then get_by_label('Card number'). If the iframe comes from the real
gateway's domain, I would rather use its sandbox card numbers in one end-to-end test and mock the gateway response
with page.route in the rest, which the Playwright topic showed.

Cancel: register page.once('dialog') before the click, assert the message says 'Cancel booking?', accept it, and
assert the booking status reads Cancelled. Then the reverse test: dismiss, and assert it is still Confirmed.

No sleeps anywhere: every wait is an action's auto-wait or a web-first assertion. Each step lives in a page object:
SearchPage, FarePage, PaymentPage. On failure the trace shows which step broke."

**Why it scores:** the right API for each of the three contexts, assertions after every step, both sides of the
dialog tested, and a reason for mocking only part of the payment.`,
    mcqs: [
      mcq('In Playwright, get_by_role("button", name="Add to cart").click() fails with "strict mode violation ... resolved to 2 elements". What is the right fix?', [
        ['Scope the locator to the product row, e.g. filter the list item by its text', true],
        ['Add .first to the locator so that Playwright clicks the topmost match found', false],
        ['Switch to an absolute XPath copied from DevTools so the path is fully unique', false],
        ['Raise the action timeout so Playwright waits for only one button to be left', false],
      ], 'Scoping to the row states which product the test means and keeps one match. .first silently picks whichever comes first and breaks when the order changes, an absolute XPath breaks with any layout change, and waiting longer cannot remove the second button.'),
      mcq('A Playwright test clicks "Cancel order", which calls confirm(), and no dialog handler is registered. What happens?', [
        ['Playwright dismisses the dialog, so confirm() returns false', true],
        ['The test hangs until the timeout, waiting for the dialog', false],
        ['Playwright accepts the dialog, so confirm() returns true', false],
        ['The click raises an error that a dialog was not handled', false],
      ], 'By default Playwright auto-dismisses dialogs, so confirm() returns false and the order is kept, which a test without an assertion will not notice. It does not hang, does not accept by default, and does not raise; register page.once("dialog") to accept and assert the message.'),
      mcq('In Selenium 4, an input with id "pin" lives in an open shadow root under a div with id "host". Which call reaches it?', [
        ['driver.find_element(By.ID, "host").shadow_root.find_element(By.CSS_SELECTOR, "#pin")', true],
        ['driver.find_element(By.XPATH, "//div[@id=\'host\']//input[@id=\'pin\']") on its own', false],
        ['driver.find_element(By.ID, "pin") after an implicit wait of ten seconds is configured', false],
        ['driver.switch_to.frame("host") and then driver.find_element(By.ID, "pin") inside it', false],
      ], 'Selenium needs the host element\'s shadow_root, and a CSS selector inside it. XPath does not cross shadow boundaries, waiting does not make the element reachable from the document, and a shadow root is not a frame, so switch_to.frame fails.'),
    ],
    checkpoint: [
      ck('UI_TEST_AUTOMATION', 'Which XPath finds the Add to cart button in the list item for "Cotton kurta", even if the label has extra spaces?', [
        ['//li[contains(., \'Cotton kurta\')]//button[normalize-space()=\'Add to cart\']', true],
        ['/html/body/ul/li[2]/button[text()=\'Add to cart\'] taken from DevTools', false],
        ['//button[text()=\'Add to cart\'][2] to pick the second button in the page', false],
        ['//li[text()=\'Cotton kurta\']/button[@type=\'Add to cart\'] with an exact match', false],
      ], 'The relative XPath anchors on the row\'s full text and normalises the button label. The absolute path breaks with any layout change, [2] depends on order (and applies per parent, not page-wide), and text()= on the li fails because its text node includes trailing space and the button text, while type is not the label.'),
      ck('UI_TEST_AUTOMATION', 'A test fills a card number inside a payment iframe with page.get_by_label("Card number").fill(...) and times out. Why?', [
        ['The locator searches only the main page, not the iframe\'s own document', true],
        ['The card field is disabled until the page has finished loading its scripts', false],
        ['Playwright cannot fill inputs in any iframe from another origin at all', false],
        ['The label is attached with aria-label, which get_by_label never reads', false],
      ], 'An iframe holds a separate document; frame_locator (or content_frame) is needed to reach into it. Nothing suggests the field is disabled, Playwright does reach cross-origin frames through frame_locator, and get_by_label does match aria-label.'),
      ck('UI_TEST_AUTOMATION', 'A team wants to automate login on staging, which has an OTP step and a CAPTCHA. What is the sound approach?', [
        ['Use test-environment switches such as a fixed OTP, plus one check they are off in prod', true],
        ['Solve the CAPTCHA image with an OCR library and read the OTP from a real phone in a rack', false],
        ['Skip login in every test by setting a cookie copied from a manual login once a month', false],
        ['Leave the whole login flow manual, since anything with an OTP cannot be automated', false],
      ], 'The team builds a controlled bypass for test accounts and verifies it cannot reach production. Beating a CAPTCHA defeats the control and is fragile, a month-old copied cookie expires and skips the flow under test, and OTP flows are automatable with the right hooks.'),
    ],
  },

  /* ── IV_API_TESTING ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_IV_IV_API_TESTING',
    notes: `API questions decide many SDET rounds, because an API test is where a candidate shows design and code together. The
API Testing topic set already asked how to test POST /orders, 401 versus 403 and other users' data, Postman versus
code in CI, and contract testing. The questions below go further. The tests ran under pytest with requests and
jsonschema against a small Flask app with two planted bugs; the output is real, failures included.

## Q1. "PUT, PATCH and POST: which are idempotent, and how do you test it?"

**Testing:** whether "idempotent" means something you can check, not a word from a table.

**Model answer.** "Idempotent means sending the same request twice leaves the server in the same state as sending it
once. GET, PUT and DELETE are defined that way; POST is not, and PATCH need not be: 'add 1 to quantity' is a valid
PATCH that changes the state every time. So I test it: call PUT twice with the same body and compare the resource
afterwards, not just the status code. For POST, where a retry on a payment would create two orders, the API should
accept an Idempotency-Key header:"

    def test_retry_with_same_key_creates_one_order(base):
        h = {"Idempotency-Key": "upi-7f3a"}
        a = requests.post(f"{base}/orders", json={"amount": 250}, headers=h)
        b = requests.post(f"{base}/orders", json={"amount": 250}, headers=h)
        assert (a.status_code, b.status_code) == (201, 200)
        assert a.json()["id"] == b.json()["id"]

"Both passed on the demo. I would add: the same key with a different body should be refused, and two requests with
the same key at the same moment, because that is when a mobile app retries."

**Follow-up:** "Is DELETE twice a 204 then a 404? Is that still idempotent?" — "Yes. Idempotency is about the state on
the server, not identical responses: after both calls the order is gone."

## Q2. "How do you test pagination?"

**Model answer.** "Walk every page and check the union: no duplicates, nothing missing, and the count equals total.
Then the edges: page 0 and a negative page, the last partial page, a page past the end, a size of 0 and above the
maximum, and data changing between pages. The walk found a planted bug in one run:"

    E   AssertionError: duplicates across pages: [11, 21]
    FAILED test_api.py::test_pages_cover_every_product_exactly_once

"With 23 products and size 10, each full page returned 11 rows: the last item of a page repeated as the first of the next.
Checking only that page 1 has 10 items would have missed it, because page 1 had 11, and a test asserting 'len > 0'
passes."

**Follow-up:** "Offset or cursor pagination: what changes?" — "With offset, an insert during the walk shifts rows, so
an item can appear twice or be skipped; with a cursor the next page starts after the last id I saw, so I test that
inserting a row mid-walk neither duplicates nor drops one."

## Q3. "Why validate a schema when you already assert the values?"

**Model answer.** "My value assertions check the fields I thought about. A schema checks every field's type, the
required ones and allowed values, in one line, so a change nobody told me about fails the build. Our demo returned
the amount as a string, and the client app would have shown '499' and then failed to add it up:"

    E   jsonschema.exceptions.ValidationError: '499' is not of type 'integer'
    E   Failed validating 'type' in schema['properties']['amount']:
    E   On instance['amount']:
    E       '499'

"I keep schemas next to the tests, generated from the OpenAPI spec where there is one, and decide per API whether
additionalProperties is false: strict for responses we own, relaxed where the provider may add fields."

**Follow-up:** "Money as a float?" — "I flag it. 0.1 + 0.2 is not 0.3 in binary floating point; amounts should be
integers in paise or decimal strings with a stated scale, and the schema should say which."

## Q4. "Which status code should these return?"

**Testing:** whether you assert the right code, not just "not 500".

    Malformed JSON body                                  400 Bad Request
    Valid JSON, quantity is -2                           400 or 422, whichever the contract says
    Creating a coupon code that already exists           409 Conflict
    Too many OTP requests from one number                429, with a Retry-After header
    Payment provider down behind our API                 502 or 503, never 200
    Success with {"status": "error"} in the body         a bug: the code must match the outcome

"I test the code and the error body together: a machine-readable error code, a message, and the field that failed.
And a 500 for any user input is always a bug, because the server should have refused it cleanly."

## Q5. "How do you test a payment webhook?"

**Model answer.** "The gateway calls us when a UPI payment settles. I test it as an input from outside: a valid
signature is accepted and marks the order paid; an invalid or missing signature is refused and changes nothing; the
same event delivered twice changes the order only once, because gateways retry; events out of order, such as
'refunded' before 'captured', are handled; and a slow handler still answers quickly, so the gateway does not
retry it. I sign test events with the sandbox secret in a fixture, never a production one."

**Follow-up:** "How do you test that the gateway's retry works if we were down?" — "Use the provider's sandbox and its
dashboard or CLI to resend an event, and check our idempotent handling. I cannot control their retry timing, so I test
our side of it."

## Q6. "In Postman, how do you pass the token from login to the next request?"

**Model answer.** "In the login request's post-response script, parse the response and store it:
pm.environment.set('token', pm.response.json().token), then use {{token}} in the Authorization header, ideally set
once at collection level. Assertions go in pm.test blocks, such as pm.response.to.have.status(200). Newman runs the
same collection in CI with an environment file per stage. When the chain grows past a few requests, I move it to
pytest fixtures, which the topic covered."

## How you are judged

Strong answers check state after the call, show an assertion that failed, and name the edge cases (retries,
duplicates, pagination edges) a happy-path tester never reaches.`,
    workedExample: `**Question: "Our UPI order API sometimes creates two orders when the user's network drops during payment. How would
you test for that, and what would you ask the developers to build?"**

**A weak answer:**

"I would call POST /orders twice and check that it returns an error the second time."

What the panel hears: a guess at the design, and an error that would be wrong for a genuine retry.

**A strong answer:**

"The cause is a client retry: the first POST succeeded, the response was lost, the app sent it again. The fix is an
idempotency key: the app generates one per checkout attempt and sends it in a header, and the server returns the
original result for a repeat.

My tests, against the QA environment:

1. **Same key, same body, sequentially:** first 201, second 200 with the same order id; the database has one row for
   that key. I query it by the key, not by 'latest row'.
2. **Same key, different body:** refused with 409 or 422, because a key must not be reused for another amount.
3. **Same key, concurrently:** two requests in two threads at once. Exactly one order. This is the race that happens
   on a flaky mobile network, and a check-then-insert implementation fails it, so I run it 50 times.
4. **Different keys:** two orders, because a user can really buy twice.
5. **Key expiry:** after the documented window, say 24 hours, a reused key creates a new order; I test with a short
   expiry configured in QA rather than waiting.
6. **The payment side:** the UPI collect request is sent once per order, checked in the mock gateway's log.

I would ask for a unique constraint on the key in the database, so the race is impossible rather than unlikely.
Our demo app's sequential test passed; the concurrency test is the one I would trust."

**Why it scores:** the root cause, the design that removes it, tests that include the race, and state checked in
the database rather than only in responses.`,
    mcqs: [
      mcq('A PATCH /cart endpoint takes {"op": "increment", "sku": "TEA1"}. A tester says PATCH is idempotent, so retries are safe. What is wrong?', [
        ['PATCH need not be idempotent; this one adds a unit on every call', true],
        ['Nothing, since HTTP defines every PATCH request as idempotent', false],
        ['PATCH is idempotent only when it returns the 204 No Content code', false],
        ['Retries are always safe, since the gateway removes the duplicates', false],
      ], 'HTTP defines GET, PUT and DELETE as idempotent; PATCH can be either, and an increment changes the state each time. The status code does not decide idempotency, and nothing in between removes duplicate requests unless the API is designed with a key.'),
      mcq('A paginated /products API returns 23 items with size 10. Walking every page collects 25 ids, with 11 and 21 appearing twice. What is the likely bug?', [
        ['Each page returns one extra row, so the boundary item repeats on the next', true],
        ['The total is wrong: there are really 25 products in the database right now', false],
        ['The client requested page 0 first, which returns the same rows as page 1', false],
        ['The API sorts by name, so items appear twice when two names are the same', false],
      ], 'Items 11 and 21 are each the last of one page and the first of the next, which is an off-by-one slice end. The set of distinct ids still equals 23, so the total is right; page 0 would repeat a whole page, not single items; and duplicate names do not duplicate ids.'),
      mcq('In Postman, how is a token from the login response made available to the requests after it?', [
        ['pm.environment.set("token", pm.response.json().token) in the post-response script', true],
        ['Typing the token into each request\'s header after copying it from the response', false],
        ['pm.test("token", ...) in the login request, which shares its value with the others', false],
        ['Saving the token in the collection description so that every request can read it', false],
      ], 'A post-response script stores the value in a variable, and later requests use {{token}}. Copying by hand breaks automation and Newman runs, pm.test records an assertion rather than a variable, and a description is documentation, not a variable.'),
    ],
    checkpoint: [
      ck('API_TESTING', 'POST /coupons is called with a code that already exists. Which response best fits a well-designed API?', [
        ['409 Conflict with an error body naming the duplicate code', true],
        ['200 OK with {"status": "error"} and a message in the body', false],
        ['500 Internal Server Error with the unique constraint text', false],
        ['404 Not Found, since a coupon with that name was not new', false],
      ], 'A request that clashes with the current state of the resource is a conflict, and the body should say which field. A 200 with an error body misleads every client, a 500 means the server failed to handle normal input and leaks internals, and 404 means the target was not found.'),
      ck('API_TESTING', 'An order response has every field the tests assert, but amount arrives as "499" instead of 499. What catches this kind of change for every field at once?', [
        ['A JSON schema check of types and required fields on the response', true],
        ['An assertion that the status code is 201 after the order is created', false],
        ['A check that the response time stays below 800 ms at the 95th percentile', false],
        ['Comparing the response body with a snapshot saved from production', false],
      ], 'A schema states each field\'s type, so a string where an integer is expected fails on any field. The status code and latency say nothing about types, and a production snapshot contains ids and timestamps that change, plus real customer data that must not be copied.'),
      ck('API_TESTING', 'A payment gateway webhook marks an order paid. Which test matters most because gateways retry deliveries?', [
        ['The same event delivered twice changes the order only once', true],
        ['The webhook endpoint answers with HTTP 200 within one minute', false],
        ['The webhook accepts any event body that is valid JSON content', false],
        ['The order page shows "Paid" after a full browser page refresh', false],
      ], 'Retries mean duplicates are normal, so the handler must be idempotent on the event id. Answering within a minute is too slow and not the point, accepting any JSON skips signature verification, and the order page check does not show whether a duplicate double-applied the payment.'),
    ],
  },

  /* ── IV_PERF_CI ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_IV_IV_PERF_CI',
    notes: `Performance and CI questions separate candidates who have run a load test or a pipeline from those who have watched a
video. The topic sets already asked load versus stress versus spike versus soak, p95 versus the average, finding a
bottleneck, users for a sale day, putting tests into CI, flaky tests, a 50-minute suite and a quality strategy. These
are the questions that follow, most of them with numbers. Every figure below was computed in Python; the k6 and
GitHub Actions lines are from the documentation and were not run here.

## Q1. "Your load test passed. On sale day, production fell over. How?"

**Testing:** whether you know how a load test lies.

**Model answer.** "Usually the test was not production in one of five ways. **Data:** the test used 20 products
and 50 users, so everything came from cache, while real shoppers spread over 40,000 products. **Environment:** the
test ran on a smaller copy with different settings, such as a bigger connection pool, or a database with a thousand
rows where an index problem only shows at ten million. **Dependencies:** the payment gateway was mocked and answered
in 5 ms, while the real one took 800 ms and held threads. **Shape:** we ramped up over ten minutes, but the sale
opened at midnight and the load arrived in seconds, before autoscaling reacted. **The generator itself:** a load
machine at 100% CPU sends less than you think. After the incident I would line up production traces with the test
and close whichever gap explains the failure first."

**Follow-up:** "Which one would you check first?" — "The request mix and data: compare the test's endpoints and
cache hit rate with production's access logs for the sale hour. It is cheap and it is the most common gap."

## Q2. "Here are 20 response times. What is the p95?"

    120 135 140 142 150 155 160 162 170 175 180 190 200 210 230 260 310 450 900 1400 (ms)

**Model answer.** "The mean is 291.95 ms and the median 177.5, which already tells me the data is skewed. For p95,
tools differ. Nearest rank takes the ceil(0.95 x 20) = 19th sorted value: 900 ms. Linear interpolation, Python's
statistics.quantiles with method='inclusive', gives 925 ms; the 'exclusive' method gives 1375 ms. With 20 samples,
p95 is decided by one or two requests, so I would not report it at all; I would run long enough to get thousands of
samples per endpoint, and use the same tool's figure every time I compare runs."

**Follow-up:** "Then why do two tools disagree on the same run?" — "Different percentile methods, and some tools
compute from histogram buckets, which round the value. Compare like with like."

## Q3. "Your users wait for each response before sending the next. What does that do to a load test?"

**Model answer.** "That is a closed model: Locust users, JMeter threads and k6's VU executors. By Little's law
throughput = users / (response time + think time). 300 users with 2 s think time at 0.5 s responses send 300 / 2.5 =
120 requests per second. If the server slows to 3 s, the same 300 users send only 300 / 5 = 60. The test halves its
own load exactly when the system struggles, so it under-reports the problem; that is coordinated omission, from the
Performance topic. Real shoppers on sale day do not slow down because our server did. For that I use an open model,
which starts requests on a schedule, such as k6's constant-arrival-rate:"

    export const options = {
      scenarios: {
        sale_open: { executor: 'constant-arrival-rate', rate: 120, timeUnit: '1s',
                     duration: '10m', preAllocatedVUs: 200, maxVUs: 600 },
      },
      thresholds: {
        'http_req_duration{name:checkout}': ['p(95)<800'],
        http_req_failed: ['rate<0.01'],
      },
    };

"If a threshold fails, k6 exits with a non-zero code, so the pipeline step fails."

## Q4. "Do performance tests run in CI? On every pull request?"

**Model answer.** "Not the full load test: it needs a stable, production-like environment and minutes to an hour. On
every pull request I would run a tiny performance smoke, such as one endpoint at low load, and compare against the
last good runs rather than an absolute number, because shared CI runners are noisy. The real load test runs nightly
or before a release on a dedicated environment, with thresholds that fail the job, and the results are kept so a
trend is visible. A regression of 20% on p95 that persists for three nights is worth a ticket even if it is under
the SLA."

## Q5. "Why does a flake rate of 0.1% per test matter?"

**Model answer.** "Because developers see builds, not tests. With 600 independent tests each failing 0.1% of the time
for no reason, a build is red for nothing with probability 1 - 0.999^600 = 45.1%. At 0.2% it is 69.9%. One retry
brings that to 0.06%, which is why teams add it, but the Quality in CI rule stands: every retried pass is reported and
counted, or the retries hide real races."

**Follow-up:** "And if the suite doubles to 1,200 tests at 0.1%?" — "69.9%: the same as doubling the flake rate. A
growing suite needs a falling flake rate just to stand still."

## Q6. "We split a 40-minute suite over 4 machines and it takes 22 minutes, not 10. Why?"

**Model answer.** "Two reasons, both measurable. Each shard pays its own set-up, say 3 minutes for checkout,
dependencies and the browser, so the best case is 40 / 4 + 3 = 13 minutes. And the split was uneven: by file name the
shards held 6, 7, 8 and 19 minutes of tests, and the wall time is the slowest shard, 19 + 3 = 22. Splitting by
recorded durations, for example pytest-split with stored durations, brings it close to 13. More shards help less each
time: 8 shards is 40 / 8 + 3 = 8 minutes, so set-up becomes the cost to cut, by caching dependencies or a prebuilt
image with the browsers."

## How you are judged

Strong answers do the arithmetic aloud and say what they would measure next. Weak answers say "add more machines",
"increase users" or "just add retries".`,
    workedExample: `**Question: "Design the performance gate for a ticket-booking app before Diwali sales. What runs when, and what fails
the release?"**

**A weak answer:**

"We run JMeter with 10,000 users before the release and check that nothing fails."

What the panel hears: an invented number, a closed model, and a pass rule that cannot fail on latency.

**A strong answer:**

"**Targets first,** agreed with the product owner: from last Diwali's access logs, the busiest minute had 7,200
checkout requests, 120 per second, and we add the expected growth on top. The SLA: p95 of search under 500 ms,
checkout under 800 ms, errors under 1%.

**Every pull request:** a two-minute performance smoke on the changed service at low load, compared with the median
of the last ten main-branch runs. A p95 more than 20% worse fails the check with the numbers in the job summary.

**Nightly, on the staging environment sized like production:** an open-model k6 run at the target arrival rate for
30 minutes, realistic data spread over thousands of trains and dates, and the payment gateway in sandbox mode, not a
5 ms mock. Thresholds per endpoint fail the job. Results go to a dashboard, so a slow drift shows up across nights.

**Before the sale:** a spike test from zero to the peak rate in 30 seconds, and a three-hour soak at normal load to
catch leaks, with server metrics lined up so a failure points at a resource.

**What blocks the release:** a failed nightly threshold on checkout or payment, or any spike-test run where errors
exceed 1% or the system does not recover within five minutes after the load drops. Search slower than target is a
P2 conversation, not a block, because the business has agreed that order.

And after the release, production monitoring of the same p95 figures, because the real sale is the final test."

**Why it scores:** targets from data, an open model, layered checks by cost, thresholds that fail the job, a clear
block rule, and monitoring after release.`,
    mcqs: [
      mcq('A Locust test with 300 users and 2 s think time sees response times rise from 0.5 s to 3 s. Roughly what happens to the request rate it sends?', [
        ['It falls from about 120 to about 60 requests per second', true],
        ['It stays at 120 requests per second, the rate configured', false],
        ['It rises to about 240 requests per second as users retry', false],
        ['It falls to zero until the response times recover again', false],
      ], 'In a closed model, throughput = users / (response + think time): 300 / 2.5 = 120, then 300 / 5 = 60. Locust users do not have a configured rate, they do not retry by default, and they keep sending, just more slowly; the test reduces its own load as the server slows.'),
      mcq('A 40-minute suite is split over 4 shards by file name. The shards hold 6, 7, 8 and 19 minutes of tests, and each pays 3 minutes of set-up. What is the wall time?', [
        ['22 minutes, the slowest shard plus its set-up', true],
        ['13 minutes, a quarter of the suite plus set-up', false],
        ['10 minutes, the suite split evenly four ways', false],
        ['52 minutes, all shards plus all four set-ups', false],
      ], 'Shards run in parallel, so the wall time is the slowest shard: 19 + 3 = 22. Thirteen minutes is the balanced best case, ten ignores set-up, and 52 is the total machine time, which is the bill rather than the wait.'),
      mcq('Twenty response times give a nearest-rank p95 of 900 ms and an interpolated p95 of 925 ms, while another method gives 1375 ms. What should the tester conclude?', [
        ['Twenty samples are too few; the p95 depends on one or two requests', true],
        ['The interpolated figure is the correct p95, and the others are bugs', false],
        ['The three must be averaged to give the real p95, about 1,067 ms', false],
        ['The p95 is 900 ms, because nearest rank is the only valid method', false],
      ], 'All three are legitimate percentile methods; with 20 samples the 95th percentile sits between the 19th and 20th values, so it swings with one request. Collect thousands of samples and compare runs with one method. Percentiles are not averaged, and no single method is the only correct one.'),
    ],
    checkpoint: [
      ck('PERFORMANCE_TESTING', 'A load test used 20 products and 50 test users and passed. On sale day the product pages were slow. What is the most likely gap?', [
        ['The small data set was served from cache, unlike real traffic', true],
        ['The load test ran for too long, so the caches were all cleared', false],
        ['The test used p95 when it should have reported the average time', false],
        ['The test used too many virtual users for such a small data set', false],
      ], 'With a tiny data set almost every request hits a cache, so the test measures the cache, not the database real shoppers reach. Running longer would not clear caches, the average hides the tail rather than revealing it, and the user count was not the cause.'),
      ck('PERFORMANCE_TESTING', 'Which k6 setting keeps sending checkout requests at 120 per second even when the server slows down?', [
        ['A constant-arrival-rate scenario with rate 120 and timeUnit "1s"', true],
        ['A constant-vus scenario with 120 VUs and sleep(1) after each call', false],
        ['A threshold of p(95)<800 on the http_req_duration metric for it', false],
        ['A ramping-vus scenario that reaches 120 VUs over five minutes', false],
      ], 'Arrival-rate executors are an open model and start iterations on schedule whatever the response time. VU-based executors are closed, so their rate falls as responses slow, and a threshold judges the result without changing the load.'),
      ck('PERFORMANCE_TESTING', 'A CI suite has 600 independent tests, each failing for no reason 0.1% of the time. About how often is a build red with nothing actually broken?', [
        ['About 45%, from 1 - 0.999^600', true],
        ['About 0.1%, the per-test rate', false],
        ['About 6%, from 600 x 0.0001', false],
        ['About 60%, from 600 x 0.001', false],
      ], 'The build passes only if all 600 pass: 0.999^600 is about 0.549, so it is red about 45.1% of the time. The per-test rate ignores how many tests there are, 600 x 0.0001 uses the wrong rate, and multiplying 600 x 0.001 overcounts because a build can only fail once.'),
    ],
  },

  /* ── RAPID_FIRE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_IV_RAPID_FIRE',
    notes: `A screening call for a QA engineer, automation tester or SDET role: a recruiter reading from a list, or an engineer
giving you fifteen minutes before deciding on a full round. Thirty questions, one correct line each, at speaking pace.
Cover the answer, say yours aloud, then check. If you need more than ten seconds, go back to that question set.

## Testing fundamentals

1. **Verification versus validation?** — Checked against the spec ("built it right") versus against the user's need
   ("built the right thing").
2. **STLC phases?** — Requirement analysis, test planning, test design, environment set-up, execution, closure.
3. **Severity versus priority, in one line?** — Impact on the system or user versus urgency for the business.
4. **Retesting versus regression testing?** — Retesting checks that the fixed defect is fixed; regression checks that
   nothing else broke.
5. **Defect leakage?** — The share of defects found after release: 16 of 200 is 8%.
6. **An entry criterion?** — The build is deployed to the QA environment and the smoke tests pass.
7. **Static testing?** — Finding defects without running the code: reviews, walkthroughs, static analysis.

## Test design

8. **Boundary values for a field that accepts 1 to 100?** — 0, 1, 100 and 101 (add 2 and 99 for three-value
   boundaries).
9. **Equivalence partition?** — A set of inputs the spec treats the same, so one value stands for the set.
10. **Decision table with four yes-or-no conditions?** — 16 rules before collapsing.
11. **0-switch coverage in state transition testing?** — Every valid transition exercised at least once.
12. **Pairwise?** — Every pair of parameter values appears together in at least one test.
13. **Error guessing?** — Tests from experience of likely mistakes: empty, zero, duplicates, time zones, double
    clicks.
14. **Black box versus white box?** — Tests designed from behaviour and the spec versus from the code's structure.

## UI automation

15. **Playwright's default expect timeout?** — 5 seconds.
16. **Selenium findElement versus findElements when nothing matches?** — An exception versus an empty list.
17. **Why not Thread.sleep?** — It always waits the full time and still fails when the app is slower than the guess.
18. **Page Object Model?** — One class per page or component holding locators and actions; the assertions stay in
    the tests.
19. **A native select dropdown in Selenium?** — The Select class, for example select_by_visible_text("Chennai").
20. **A new tab in Playwright?** — Wrap the click in context.expect_page() and use the page it returns.
21. **Headless?** — The same browser engine without a visible window; useful in CI, debug with a trace.

## API testing

22. **PUT versus PATCH?** — Replace the whole resource versus change part of it.
23. **201?** — Created, usually with a Location header pointing at the new resource.
24. **204?** — Success with no body, common for DELETE.
25. **Path versus query parameter?** — The path identifies the resource (/orders/42); the query filters or pages it
    (?status=PAID&page=2).
26. **Newman?** — Runs a Postman collection from the command line, for CI, with a non-zero exit code on failure.
27. **Which methods are idempotent?** — GET, PUT, DELETE, HEAD and OPTIONS; not POST, and PATCH only if designed so.

## Performance and CI

28. **Throughput?** — Completed requests per second.
29. **Little's law?** — Requests in the system = throughput x time each spends in it.
30. **Quality gate?** — An automatic pass-or-fail rule in the pipeline, such as no failing tests or a p95 threshold.

## Two questions you may also get

- **"Manual or automation, which do you prefer?"** — Both, by purpose: "I design tests and explore manually, and
  automate what runs often. My framework is pytest with Playwright and requests; here is one bug each found."
- **"Have you used Selenium with Java?"** — Say exactly how far you went: "I wrote the TestNG page-object suite in the
  Selenium topic, but I am stronger in Python." Honesty about depth beats a list of tools.

## Scoring

26+ correct and quick: strong. 20 to 25: go back to the sets your misses came from. Below 20, or "sleep is fine if
it is short", or "POST is idempotent": redo the question sets before the next screening call.`,
    mcqs: [
      mcq('Rapid fire: "A field accepts 1 to 100. Give the two-value boundary tests."', [
        ['0, 1, 100 and 101', true],
        ['1, 50 and 100 only', false],
        ['-1, 0, 101 and 102', false],
        ['1 and 100 only', false],
      ], 'Two-value boundary analysis takes the last valid and first invalid value at each edge: 0 and 1, 100 and 101. 50 is a partition value, -1 and 102 are not the edges, and testing only 1 and 100 misses an off-by-one that wrongly accepts 0 or 101.'),
      mcq('Rapid fire: "In Selenium, what does findElements return when nothing matches?"', [
        ['An empty list, with no exception', true],
        ['NoSuchElementException at once', false],
        ['None, after the implicit wait', false],
        ['A list holding one null element', false],
      ], 'findElements returns an empty list (after waiting out any implicit wait), which makes it the way to check absence. findElement is the one that throws NoSuchElementException, and neither returns None or a list containing null.'),
      mcq('Rapid fire: "Retesting versus regression testing?"', [
        ['Retesting checks the fix; regression checks nothing else broke', true],
        ['Retesting is automated; regression testing is always done manually', false],
        ['Retesting runs the full suite; regression runs only the failed case', false],
        ['They are two names for the same activity, used by different teams', false],
      ], 'Retesting repeats the failed case on the fixed build; regression runs the wider suite around it to catch side effects. Either can be manual or automated, the second option swaps their scopes, and they are distinct activities with different purposes.'),
      mcq('Rapid fire: "Which HTTP method is not idempotent by definition?"', [
        ['POST', true],
        ['PUT', false],
        ['DELETE', false],
        ['GET', false],
      ], 'Two identical POSTs normally create two resources, so POST is not idempotent; that is why payment APIs add an idempotency key. GET, PUT and DELETE are defined as idempotent: repeating them leaves the server in the same state.'),
      mcq('Rapid fire: "A decision table has four yes-or-no conditions. How many rules before collapsing?"', [
        ['16', true],
        ['8', false],
        ['4', false],
        ['12', false],
      ], 'Each binary condition doubles the combinations: 2 to the power 4 is 16. Eight is three conditions, four is one rule per condition, and twelve has no basis in the arithmetic.'),
    ],
  },

  /* ── MOCK ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_IV_MOCK',
    notes: `The interviewer's script for a 45-minute technical round for a fresher QA engineer or SDET: at a product company in
Bengaluru, a GCC in Hyderabad, or the testing practice of an IT services firm in Pune. Have a friend read the
interviewer's lines, or record yourself and score it against the notes. The panel writes down the words in bold.

## Opening (3 min)

"Tell me about the framework or test suite you built, in two minutes."

- **Strong:** the app under test and **what it risks** (money, bookings), **the layers** (UI, API, data), **how it
  runs in CI**, **one real bug it caught**, and **one thing you would change**.
- **Weak:** "I used Selenium, TestNG, Maven, Jenkins, Jira, Postman" with no decisions and no bug.

## Q1 — Fundamentals (7 min)

"Here are three bugs from yesterday: a UPI refund credited twice to some users; the app crashes when a user picks a
date in 2099; the Hindi translation of 'Pay' is wrong on one screen. Set severity and priority, and tell me which
you would raise in today's triage first."

- **Strong:** **double refund is Critical and P1** (money lost, needs a stop-gap such as pausing auto-refunds and a
  reconciliation query); the 2099 crash is **Major severity, low priority** unless analytics show real users hit it;
  the translation is **Minor but may be high priority** if a Hindi campaign is live; asks **how many users** for each.
- **Weak:** everything High, or no reason given.

Follow-up: "The developer says the refund bug cannot be reproduced." — Brings **transaction references and logs**,
looks for **a retry or a duplicate callback**, and proposes a check that **counts refund rows per payment**.

## Q2 — Test design (10 min)

"Test the 'Pay with UPI' screen of our food-delivery app."

- **Strong:** **clarifies** (collect request or intent to a UPI app, timeout length, amount limits); **risks first**
  (charged but no order, double charge, stuck pending); **boundaries** on the amount and the timeout; a **state
  model**: Initiated, Pending, Success, Failed, Expired, with **app switch and return**, **network drop while
  pending**, **callback arriving after timeout**; **idempotency** of the retry button; accessibility and small screens;
  names **the top three** unprompted.
- **OK:** a good list without states or priorities.
- **Weak:** "Enter a valid UPI ID and check payment succeeds; enter an invalid one and check the error."

## Q3 — UI automation (10 min)

The interviewer shares a page with two "Add to cart" buttons in product cards, a payment form in an iframe and a
confirm() dialog on Cancel. "Write the locators and steps, and tell me what you assert."

- **Strong:** **scoped role locators** (or a relative XPath) per product card; **frame_locator** for the card form;
  **registers the dialog handler before the click** and **asserts the message and the result**; **no sleeps**; says
  where the code lives in **page objects**; mentions a **trace on failure**.
- **OK:** correct steps, few assertions.
- **Weak:** absolute XPaths and sleep(5).

Follow-up: "It passes locally, fails in CI 1 time in 10." — **Reproduce by repetition**, **open the trace**, group the
cause (timing, data, environment), **fix the cause**, quarantine with an owner only if needed.

## Q4 — API testing (10 min)

"GET /orders?status=PAID&page=2&size=20 for a logged-in customer. What do you test?"

- **Strong:** **filter correctness** (every item PAID, none missing, checked against data the test created); a
  **pagination walk** with no duplicates and the right total; **edges** (page 0, past the end, size 0 and over the
  maximum, an unknown status); **another customer's orders never appear**; **schema** of each item; **sorting is
  stable** across pages; status codes for bad parameters.
- **Weak:** "Check it returns 200."

## Q5 — Performance and CI (3 min)

"Where would you run a load test, and what would fail it?"

- **Strong:** a **production-like environment**, **an open model at the target rate**, **per-endpoint p95 and error
  thresholds** that fail the job, nightly or before release; a small perf smoke on pull requests **compared with a
  baseline**.
- **Weak:** "In JMeter with many users, on the QA server, and check nothing fails."

## Close (2 min)

"Any questions for us?" — **Strong:** a question about how they work: "What does your test pyramid look like
today, and where do flaky tests go?" **Weak:** "No questions."

## Scoring rubric

| Area | Strong (3) | OK (2) | Weak (1) |
|---|---|---|---|
| Fundamentals | Severity, priority and reasons, asks impact | Right labels, thin reasons | Everything High |
| Test design | Clarifies, risks, states, top three | Good list | Happy path only |
| UI automation | Scoped locators, frame, dialog, asserts | Steps right | Absolute XPath, sleeps |
| API testing | Filter, pages, auth, schema, edges | Some edges | Status code only |
| Performance and CI | Open model, thresholds, baseline | Load test named | "Many users" |

Hire bar for a fresher: 11 or more out of 15, with no 1 in Test design or UI automation. Saying "I have not used that,
but here is how I would find out" costs far less than a confident wrong answer.`,
    mcqs: [
      mcq('In the mock\'s Q1, a UPI refund was credited twice to some users. Which response scores highest?', [
        ['Critical and P1, with a stop-gap and a query counting refunds per payment', true],
        ['Major and P2, because only some users were affected by the double credit', false],
        ['Critical and P1, and the fix is to delete the duplicate rows in production', false],
        ['Low and P3, because the customers involved received money, not lost it', false],
      ], 'Money is leaving the company with no limit, so it is top on both, and the tester adds a way to stop the loss and measure it. "Only some users" does not reduce money loss, deleting production rows is destructive and not the tester\'s call, and the company\'s loss is still a loss.'),
      mcq('In the mock\'s Q2 on the "Pay with UPI" screen, which test shows state-transition thinking?', [
        ['A callback that arrives after the payment has already expired', true],
        ['A valid UPI ID, which should lead to a successful payment', false],
        ['An invalid UPI ID, which should show a clear error message', false],
        ['The pay button, which should have the right colour and size', false],
      ], 'A late callback is an event arriving in a state (Expired) where it must be handled carefully, which is exactly what a state model finds. The valid and invalid IDs are input partitions, and the button styling is a UI check; none of them test sequences of states.'),
      mcq('In the mock\'s Q4, why does "another customer\'s orders never appear" belong in the GET /orders tests?', [
        ['Filtering by the token\'s user is a security rule a status code cannot show', true],
        ['Because the API should return 403 whenever any filter parameter is used', false],
        ['Because pagination always leaks other users\' rows on the last page', false],
        ['Because the schema check fails if two customers\' orders are returned', false],
      ], 'A response can be 200 and well-formed while containing another customer\'s data, so the test creates orders for two users and checks ownership. Filters are not forbidden, leaks are not a property of the last page, and a schema checks shape, not ownership.'),
    ],
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_IV_CHECKPOINT',
    notes: `Ten questions across the QA and SDET interview sets: testing fundamentals, test design, UI automation, API testing,
and performance and CI. Each is asked the way a panel asks it. Read the numbers or the code in the question before you
choose.`,
    checkpoint: [
      ck('TESTING_FUNDAMENTALS', 'A developer fixes a coupon bug. The tester runs the original failing steps on the new build and they pass. What is still missing?', [
        ['Regression around the change, since the fix may have broken nearby features', true],
        ['Nothing, since the retest passed and that proves the release is now safe', false],
        ['A new defect report, so that the fixed bug is recorded a second time', false],
        ['A full exploratory session of the whole app before the bug is closed', false],
      ], 'Retesting shows the bug is fixed; regression shows nothing else broke, starting near the change. A passing retest does not prove the release is safe, duplicating the report adds noise, and a whole-app session is out of proportion to one fix.'),
      ck('TESTING_FUNDAMENTALS', 'Reviewing a story before coding, a tester asks whether "free delivery above 499" includes 499. What kind of testing is that?', [
        ['Static testing, finding a defect in the requirement without running code', true],
        ['Dynamic testing, since the question will be checked when the app runs', false],
        ['Validation, since the question is about what users want from delivery', false],
        ['Regression testing, since delivery rules already existed in the app', false],
      ], 'A review finds defects without executing anything, which is static testing, and it is the cheapest point to fix an ambiguity. Nothing is run yet, the question is about matching a precise rule (verification) rather than user need, and no existing behaviour is being re-checked.'),
      ck('TEST_DESIGN', 'A bus booking allows 1 to 6 seats per booking. Which set of seat counts covers the two-value boundaries?', [
        ['0, 1, 6 and 7', true],
        ['1, 3 and 6', false],
        ['2, 5 and 6', false],
        ['1, 6 and 10', false],
      ], 'Each edge needs its last valid and first invalid value: 0 and 1, 6 and 7. 1, 3 and 6 test only valid values, 2 and 5 are inside the range, and 10 is invalid but not at the edge, so a <= written as < at 6 or 7 goes unnoticed.'),
      ck('TEST_DESIGN', 'A login test suite checks "three wrong passwords lock the account" and "the account unlocks after 15 minutes". Which test is missing from the state model?', [
        ['Two wrong, one correct, then two wrong again, which must not lock', true],
        ['A correct password typed in capital letters, which must be refused', false],
        ['Three wrong passwords in a row, repeated on a different browser', false],
        ['A password of 64 characters, the longest length the field allows', false],
      ], 'A correct login should reset the failure count, and only a sequence through that transition finds a counter that never resets. Case sensitivity and length are input partitions and boundaries, and repeating the same path in another browser adds no new transition.'),
      ck('UI_TEST_AUTOMATION', 'A Selenium test must click a link that opens an invoice in a new tab and read its heading. What must the test do?', [
        ['Wait for two window handles, switch to the new one, then switch back after', true],
        ['Call switch_to.frame on the new tab, since every tab is an iframe of the page', false],
        ['Read the heading straight away, since Selenium follows new tabs on its own', false],
        ['Use driver.get on the link\'s address instead, in the same tab, every time', false],
      ], 'Selenium keeps driving the original window until told otherwise, so the test waits for the second handle and switches. A tab is not a frame, Selenium does not follow tabs automatically, and replacing the click with driver.get skips the target=_blank behaviour under test.'),
      ck('UI_TEST_AUTOMATION', 'A download test clicks "Download ticket" and asserts only that no error appeared. What should it assert instead?', [
        ['The saved file\'s name and the fields inside it, such as the PNR', true],
        ['That the click took under one second, measured with a timer', false],
        ['That the Downloads folder of the test machine has a new file', false],
        ['That the link has a download attribute in the page\'s HTML', false],
      ], 'A download test should capture the file (expect_download in Playwright) and check what users rely on: its name and contents. Timing is not the behaviour, a shared folder can hold any file from any run, and an attribute shows intent, not a correct ticket.'),
      ck('API_TESTING', 'DELETE /orders/42 returns 204, and calling it again returns 404. Is DELETE idempotent here?', [
        ['Yes, because the server state is the same after one call or two', true],
        ['No, because the two calls returned two different status codes', false],
        ['No, because a second DELETE must also return 204 to be idempotent', false],
        ['Yes, but only because the order was the last one in the table', false],
      ], 'Idempotency is about the resulting state: after either call, order 42 is gone. Different responses are allowed; insisting on a second 204 confuses response with state, and the order\'s position in the table is irrelevant.'),
      ck('API_TESTING', 'GET /orders?status=PAID returns 200 with a valid schema. Which test can still find a serious bug?', [
        ['Create orders for two users and check each sees only their own', true],
        ['Assert the status code is 200 again with a second identical call', false],
        ['Validate the same schema with additionalProperties set to true', false],
        ['Measure the response time and check it stays under 800 ms', false],
      ], 'A valid, successful response can still contain someone else\'s orders; the two-user test checks ownership. Repeating the status check or loosening the schema adds nothing about whose data it is, and latency is a different property entirely.'),
      ck('PERFORMANCE_TESTING', 'A k6 run at 120 requests per second must fail the pipeline if checkout\'s p95 exceeds 800 ms. What makes it fail?', [
        ['A threshold such as p(95)<800 on checkout\'s duration metric', true],
        ['A check() on each response that its status is equal to 200', false],
        ['A sleep(1) at the end of each iteration of the scenario script', false],
        ['A ramping-vus executor that reaches 120 virtual users in time', false],
      ], 'Thresholds judge the whole run, and a failed one makes k6 exit non-zero so the CI step fails. A check records pass rates without failing the run, sleep is think time, and an executor shapes the load rather than judging it.'),
      ck('PERFORMANCE_TESTING', 'A suite of 1,200 tests each flakes 0.1% of the time. Without retries, roughly how often is the build red with nothing broken?', [
        ['About 70%, from 1 - 0.999^1200', true],
        ['About 12%, from 1,200 x 0.0001', false],
        ['About 0.1%, the per-test flake rate', false],
        ['About 45%, the same as 600 tests', false],
      ], 'The build is green only if all 1,200 pass: 0.999^1200 is about 0.301, so it is red about 69.9% of the time. 1,200 x 0.0001 uses the wrong rate, the per-test rate ignores the count, and doubling the tests raises the figure from 45% rather than leaving it the same.'),
    ],
  },
];
