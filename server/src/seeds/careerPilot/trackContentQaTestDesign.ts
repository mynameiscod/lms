/**
 * Career-track content: Test Design (QA_TEST_DESIGN), QA / SDET, batch QA1.
 *
 * The techniques a QA engineer uses to choose a small set of tests that still finds the bugs: equivalence partitions
 * and boundary values, decision tables, state transition testing, pairwise sets, exploratory sessions, and turning user
 * stories into traceable test cases. It builds on the Year 3 "Boundaries and the Cases That Fail" and "A Test That
 * Fails for One Reason" lessons and on the Python Full Stack track's "Fixtures and Parametrised Tests"; those are
 * referred to by title, not re-taught. Agile ceremonies and BDD belong to QA_TESTING_PRACTICE.
 *
 * Two fictional companies run through the topic: SafarBus, a bus-ticket booking app, and BazaarBee, an e-commerce site
 * during a festive sale. Every technique is applied to a small Python function with planted bugs, and every pytest
 * result quoted is real output from Python 3.13 with pytest 9: a fare calculator (and a 21-mutant experiment), a
 * discount rule, an order state machine, a refund rule with a traceability report built from pytest markers, and
 * pairwise sets from a 20-line greedy generator and from allpairspy 2.5.1. PICT is described from its documentation and
 * was not run.
 *
 * Skill: TEST_DESIGN (the topic's only skill).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_QA_TEST_DESIGN_BUNDLES: PilotBundle[] = [
  /* ── PARTITIONS_BOUNDARIES ───────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TEST_DESIGN_PARTITIONS_BOUNDARIES',
    notes: `In Year 3, "Boundaries and the Cases That Fail" gave you the rule: for a limit, test just below, on and just
above it. This lesson is where those limits come from. Equivalence partitioning finds them systematically from a
specification, boundary value analysis picks the values, and a small experiment shows exactly which bugs each one
catches and which it lets through.

## The specification

SafarBus sells bus seats. The fare rule, from the product owner's story:

- Children under 5 travel free (on a lap); 5 to 11 pay half; 12 to 59 pay the full fare; 60 and over get 30% off.
- Ages outside 0 to 120 are refused. A booking holds 1 to 6 seats; anything else is refused.

A developer implemented it as fare(age, seats, base=800). Three bugs are planted, the kind that really ship: the
free band uses age <= 5, the senior band uses age > 60, and the seat check is 1 <= seats < 6.

## Step 1: partitions

An **equivalence partition** is a set of inputs the specification says should be treated the same way. If one value
in it works, the others should too, so one value represents them all. Write them down per input, valid and invalid:

    age    invalid: < 0 | valid: 0-4 free | 5-11 half | 12-59 full | 60-120 senior | invalid: > 120
    seats  invalid: < 1 | valid: 1-6                                    | invalid: > 6

That is 6 age partitions and 3 seat partitions. Partitions come from the **specification**, never from the code: if
you read the code first, you inherit its mistakes as your expected results.

Two rules for the tests:

- **One invalid value per test.** fare(-3, 9) is refused, but which check refused it? If the age check works and the
  seat check is broken, the test still passes. Combine valid values freely; isolate invalid ones.
- **Partition outputs too.** The refund rule later in this topic gives 90% or 50%; each output band is a partition
  even if the inputs that reach it are awkward to list.

## Step 2: equivalence-partition tests

One value from the middle of each partition: ages 2, 8, 30, 75, -3 and 130; seats 3, 0 and 9. Nine tests, run
against the buggy code:

    $ pytest -q test_partitions.py
    .........                                                    [100%]
    9 passed in 2.63s

All green, with three bugs inside. The middle of a partition is exactly where nothing was going to go wrong.

## Step 3: boundary values

A **boundary** is the edge of a partition. **Two-value** boundary analysis tests each edge and its neighbour across
the line: 4 and 5, 11 and 12, 59 and 60, 120 and 121, -1 and 0, and for seats 0 and 1, 6 and 7. **Three-value**
analysis adds the value on the inside as well (4, 5, 6). The step size matters: ages are whole years, so the neighbour
of 60 is 59. For a rupee amount with paise the neighbour of 2000.00 is 1999.99; for a time rule it may be one minute.

    $ pytest -q test_boundaries.py
    FAILED test_boundaries.py::test_age_boundaries[5-400] - assert 0 == 400
    FAILED test_boundaries.py::test_age_boundaries[60-560] - assert 800 == 560
    FAILED test_boundaries.py::test_seat_boundaries_accepted[6] - ValueError: 1 t...
    3 failed, 11 passed in 1.24s

Fourteen tests, all three bugs found, and each failure names the exact value.

## How much better? Mutants

To measure rather than argue, take the correct fare function and make every version that differs by one comparison
operator (< for <=, > for >= and so on): 21 **mutants**, each a plausible typo. Then count how many each test set
detects ("kills"):

    mutants: 21
    EP     9 tests  kills 15/21
    BVA   14 tests  kills 21/21
    BVA3  23 tests  kills 21/21

The six that partitions alone missed were all off-by-one: 0 < age, age < 120, seats < 6, age <= 5, age <= 12 and
age > 60. Boundary tests killed every mutant; the three-value set added nine tests and killed nothing new here. That
is the usual finding for simple comparisons: two-value boundaries plus partitions are the efficient set; add the third
value where the code might use == or where a range is computed (start + length) rather than compared.

## Partitions that are not numbers

- **Strings**: empty, whitespace only, at the length limits (2 and 40), one over, non-Latin scripts (a Telugu or
  Tamil name), and characters that look empty but are not.
- **Dates and times**: the day of departure, 31st of a month, 29 February, midnight, and "24 hours before" measured
  in which time zone.
- **Collections**: zero, one, many, and the maximum (the 6-seat booking, a cart at its item limit).
- **Hidden partitions**: limits the specification never mentions but the system has, such as a page size of 20 (test
  20 and 21 results) or a field stored as VARCHAR(40) in bytes, not characters.

## Where it goes wrong

Testers pick boundaries from the wrong source (the UI's maxlength instead of the rule), forget the invalid side, use
the wrong step (testing 1999 when the rule is in paise), or combine invalid values so one check hides another. Write
the partition table first; the tests fall out of it, and a reviewer can see what you skipped.`,
    workedExample: `**Scenario.** SafarBus cancellation refunds: cancelled 24 hours or more before departure, 90% back; 2 hours or
more but less than 24, 50%; less than 2 hours, nothing; after departure, the cancel button is refused. The clock
resolution is one minute.

**Partitions (input: minutes before departure).**

    invalid: < 0 (departed) | none: 0-119 | 50%: 120-1439 | 90%: 1440 and above

**Boundaries, two-value, step one minute.**

    value   expected     why
    -1      refused      first departed minute
    0       0%           departure minute itself
    119     0%           last minute of the no-refund band
    120     50%          first minute of the 50% band
    1439    50%          last minute below 24 hours
    1440    90%          exactly 24 hours: "or more" includes it
    2880    90%          one middle value in the top band

Seven tests for a rule with four bands. The middle value of the top band is there because 90% has no upper edge;
the other bands are covered by their edges.

**The questions the table raised.** Writing the table exposed two gaps the story did not answer: is "before
departure" the scheduled time or the actual time when the bus is delayed, and does a 4-seat booking cancelled one
seat at a time get the same refund per seat? Those go to the product owner before any test is automated; a test
with a guessed expected result is a guess written down.

**In pytest.**

    @pytest.mark.parametrize("minutes, pct", [
        (0, 0), (119, 0), (120, 50), (1439, 50), (1440, 90), (2880, 90),
    ], ids=lambda v: str(v))
    def test_refund_band(minutes, pct):
        assert refund_pct(minutes) == pct

    def test_departed_booking_is_refused():
        with pytest.raises(BookingClosed):
            refund_pct(-1)

The refused case is its own test because it raises rather than returning a number, and its own name makes the
report readable. When test_refund_band[1440-90] fails, the failure line says which edge broke, which is the point
of naming boundary cases by their value.`,
    mcqs: [
      mcq('SafarBus\'s rule is "60 and over get 30% off" on whole-year ages. Which pair of values is the two-value boundary for that edge?', [
        ['59 and 60', true],
        ['60 and 61', false],
        ['59 and 61', false],
        ['55 and 65', false],
      ], 'Two-value analysis takes the edge value and its nearest neighbour across the line: 59 (full fare) and 60 (senior). 60 and 61 are both inside the senior band, so an implementation using > 60 fails only at 60; 59 and 61 skip the edge itself, and 55/65 are partition values, not boundaries.'),
      mcq('A tester writes fare(-3, 9) and expects it to be refused. Why is that a weak test?', [
        ['Either check alone refuses it, so a broken one is hidden', true],
        ['Negative ages are not a real equivalence partition at all', false],
        ['A refused call cannot be asserted on with pytest.raises', false],
        ['Nine seats is a boundary value, so it belongs elsewhere', false],
      ], 'With two invalid values, the age check refusing it makes the test pass even if the seat check is broken. Negative ages are a genuine invalid partition, pytest.raises asserts refusals fine, and 9 is a middle value of the invalid seat partition, not its boundary (7 is).'),
      mcq('In the mutant experiment, 9 partition tests killed 15 of 21 one-operator mutants and 14 boundary tests killed all 21. What did the six survivors have in common?', [
        ['Each moved an edge by one, such as age <= 5 for age < 5', true],
        ['Each changed the base fare or the 30% senior discount rate', false],
        ['Each raised an exception that pytest did not catch', false],
        ['Each was an equivalent mutant no test could detect', false],
      ], 'The survivors were off-by-one changes (0 < age, seats < 6, age <= 5, age <= 12, age > 60, age < 120), which only show at an edge. No mutant changed constants, none crashed the run, and they were not equivalent, because the boundary set killed every one.'),
    ],
    checkpoint: [
      mcq('A BazaarBee coupon applies to carts "of Rs 2,000 or more", with amounts in rupees and paise. Which values test that edge?', [
        ['1999.99 and 2000.00', true],
        ['1999 and 2000, in whole rupees', false],
        ['2000.00 and 2000.01', false],
        ['1500.00 and 2500.00', false],
      ], 'The neighbour across the edge is one step of the input\'s precision, here one paisa. 1999 skips 99 paise of the band below, 2000.00 and 2000.01 are both inside the valid band, and 1500/2500 are partition values that miss an off-by-one entirely.'),
      mcq('Where should a tester take the partitions for a fare rule from?', [
        ['The written rule from the product owner, before reading the code', true],
        ['The if-statements in the code, since they show the real branches', false],
        ['The maxlength and min attributes of the input fields in the UI', false],
        ['Last release\'s regression suite, which is already approved', false],
      ], 'Expected results must come from the specification, or the tests inherit the code\'s mistakes. Reading the branches copies a wrong age <= 5 into the tests, UI attributes are another implementation that can be wrong, and an old suite may encode an old rule.'),
      mcq('A search page shows 20 results per page, which the specification never mentions. Which pair of result counts is worth testing?', [
        ['20 and 21, to cross the hidden page-size boundary', true],
        ['1 and 100, the smallest and a large number of results', false],
        ['0 and 10, an empty page and a half-full page', false],
        ['19 and 21, either side of the page-size limit', false],
      ], 'Implementation limits create hidden partitions; 20 fills one page exactly and 21 forces a second page, where pagination bugs live. 1 and 100 miss the edge, 0 and 10 test other partitions, and 19 and 21 skip the value 20 that sits on the boundary.'),
    ],
  },

  /* ── DECISION_TABLES ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TEST_DESIGN_DECISION_TABLES',
    notes: `Partitions treat each input on its own. Business rules rarely do: the discount depends on membership AND the cart
value AND the coupon. When conditions combine, the bugs live in combinations, and a decision table is how you make
sure you test every combination the rule cares about.

## The rule

BazaarBee runs a festive sale:

- The coupon FEST10 gives 10% on carts of Rs 2,000 or more. On a smaller cart it is refused with the message
  "FEST10 needs a cart of Rs 2,000".
- BeePlus members get 5% on any cart. The two discounts add up.

The implementation has two planted bugs: the cart check is cart > 2000 instead of >= 2000, and someone added "or
member" so that members can use FEST10 on small carts.

## Building the table

List the **conditions** (inputs that affect the outcome) and the **actions** (outputs). Three yes/no conditions give
2 x 2 x 2 = 8 **rules** (columns, written here as rows):

    rule  member  cart >= 2000  coupon   discount  message
    R1    Y       Y             Y        15%       -
    R2    Y       Y             N         5%       -
    R3    Y       N             Y         5%       FEST10 needs a cart of Rs 2,000
    R4    Y       N             N         5%       -
    R5    N       Y             Y        10%       -
    R6    N       Y             N         0%       -
    R7    N       N             Y         0%       FEST10 needs a cart of Rs 2,000
    R8    N       N             N         0%       -

Fill every action from the written rule. Any cell you cannot fill is a **question for the product owner**: R3 (does
a member's coupon on a small cart get refused?) is exactly the cell the story was vague about, and it is where one of
the bugs lives. A decision table finds specification gaps before it finds code bugs.

## Running it

A common shortcut is "each condition on its own, plus all on, plus all off": five tests. Against the buggy code:

    $ pytest -q test_one_at_a_time.py
    .....                                                        [100%]
    5 passed in 0.61s

The full table, with cart values chosen at the boundary (2000 for Y, 1999 for N):

    $ pytest -q test_decision_table.py
    FAILED test_decision_table.py::test_rule[R3] - AssertionError: assert (15, ''...
    FAILED test_decision_table.py::test_rule[R5] - AssertionError: assert (0, 'FE...
    2 failed, 6 passed in 1.35s

R3 caught the "or member" bug: (15, '') where the rule says (5, 'FEST10 needs a cart of Rs 2,000'). R5 caught the
boundary bug: a non-member with exactly Rs 2,000 got 0% and the refusal. Notice R1 passed although the cart check is
wrong: the member flag let the coupon through anyway. One bug **masked** the other in that column, which is why each
rule is its own test, and why you cannot conclude "the boundary works" from one passing row.

Two habits made this work: parametrize ids named after the rules (R3, R5), so the failure points back to the table;
and condition values taken at the boundary rather than at 1500 and 2500, so a decision table and boundary analysis
work together.

## Reducing the table

Some conditions do not matter in some rules. Without a coupon, the cart value changes nothing: R2 and R4 give the
same result, and so do R6 and R8. Merge each pair with a "-" (don't care):

    R2+R4   Y   -   N   5%
    R6+R8   N   -   N   0%

Eight rules become six. Reduce only where the **rule** says the condition is irrelevant, and remember you are trusting
the code to ignore it too. For money rules with up to four conditions (16 rules), many teams keep the full table: the
cost is a few parametrize rows, and the merged cells are exactly where "or member" style bugs hide.

## Beyond yes and no

**Extended-entry** tables use partitions as condition values: cart band below 2,000 / 2,000 to 4,999 / 5,000 and
above gives 3 x 2 x 2 = 12 rules. Choose each band's test value at its boundary. When conditions pass five or six
(64 rules), the rule is usually several rules in a trench coat: split it by the action it controls, or use pairwise
coverage for the conditions that do not interact by design.

## Cause-effect graphing

The ISTQB syllabus also names cause-effect graphing: draw causes (conditions) and effects (actions) as nodes joined
by AND, OR and NOT, add constraints such as "these two causes are mutually exclusive" (a payment is UPI or card, not
both), and derive the table from the graph. It is useful for spotting impossible combinations, which you mark and
drop rather than test. In practice teams rarely keep the drawing; the table is what lives on in the test code.

## When to use it

Use a decision table for any rule written with "if", "and", "unless" or "except": discounts, eligibility,
fees, permissions by role, form fields that appear together. If the outcome depends on the order of events rather
than a combination of facts, you need the next lesson's state model instead.`,
    workedExample: `**Scenario.** An ed-tech company, ShikshaPath (fictional), gives scholarships on its coding course:

- Score 90 or above in the entrance test: 50% off if family income is below Rs 8 lakh a year, otherwise 25%.
- Score 75 to 89: 25% off if income is below Rs 8 lakh, otherwise nothing.
- Below 75: nothing.
- Anyone already holding another ShikshaPath scholarship gets nothing extra.

**Conditions and values.** Score band (3 values: >= 90, 75-89, < 75), income below 8 lakh (Y/N), already has a
scholarship (Y/N). An extended-entry table: 3 x 2 x 2 = 12 rules.

**Fill it, then reduce.**

    rule   score    income<8L  existing  discount
    S1     >= 90    Y          N         50%
    S2     >= 90    N          N         25%
    S3     75-89    Y          N         25%
    S4     75-89    N          N          0%
    S5     < 75     -          N          0%
    S6     -        -          Y          0%

The existing-scholarship rule makes score and income irrelevant (S6 replaces six rules), and below 75 income is
irrelevant (S5 replaces two). Twelve rules become six.

**Pick values at the boundaries.** Each band's test value goes at its edge: 90 for S1 and S2, 89 and 75 for the
middle band (S3 at 89, S4 at 75 so both edges are touched), 74 for S5; income Rs 7,99,999 for Y and Rs 8,00,000 for
N. Add one more row for the gap the table exposed: S6 with a score of 95 and low income, so the strongest candidate
for a discount proves the existing-scholarship rule really overrides everything.

**The gap.** Is the income test "below 8 lakh" or "up to 8 lakh"? The story said "below", the marketing page says
"up to". The tester raises it; the product owner chooses "below", and the marketing page is the defect.

**The tests.** Seven parametrize rows with ids S1 to S6 plus S6-strong. Each failure names the rule, and a reviewer
can lay the table beside the test file and see that nothing is missing.`,
    mcqs: [
      mcq('BazaarBee\'s sale rule has three yes/no conditions. A tester runs all-off, each condition alone, and all-on. Why did that miss the "or member" bug?', [
        ['The bug appears only for member, small cart and coupon together', true],
        ['Five tests are below the minimum that pytest parametrize allows', false],
        ['The bug was in the message, which those five tests did not check', false],
        ['Membership was never set to yes in any of the five tests at all', false],
      ], 'The faulty branch needs member=Y, cart below 2,000 and coupon=Y at once (rule R3), and the five tests never combine those. pytest has no minimum, the discount itself was wrong (15% instead of 5%), and membership was Y in two of the five tests.'),
      mcq('In the BazaarBee table, rule R1 (member, Rs 2,000 cart, coupon) passed even though the code uses cart > 2000. What explains it?', [
        ['The member flag let the coupon through, masking the cart bug', true],
        ['Rs 2,000 is above the boundary, so cart > 2000 is true for it', false],
        ['Discounts are rounded, so 15% and 5% compare equal in Python', false],
        ['Decision tables never exercise boundaries, only conditions', false],
      ], 'With "cart > 2000 or member", member=Y makes the condition true whatever the cart, so R1 cannot see the boundary bug; R5 (non-member) did. 2000 > 2000 is false, the comparison was on whole percentages, and the table used boundary values deliberately.'),
      mcq('When is it safe to merge two decision-table rules into one with a "don\'t care"?', [
        ['When the written rule says that condition cannot change the outcome', true],
        ['When the two rules produced the same result in the last full test run', false],
        ['When the table has more than eight rules and must be made smaller', false],
        ['When the condition is the one least likely to be set by a user', false],
      ], 'A don\'t-care is a claim about the specification, so it must come from the rule. Merging because the code gave equal results hides exactly the bugs you are looking for, size alone is not a reason, and how often users set a condition is a priority question, not a logical one.'),
    ],
    checkpoint: [
      mcq('A fee rule has four yes/no conditions. How many rules does the full decision table have?', [
        ['16', true],
        ['8', false],
        ['4', false],
        ['12', false],
      ], 'Each yes/no condition doubles the combinations: 2 x 2 x 2 x 2 = 16. Eight is three conditions, four counts one test per condition, and twelve would need a three-valued condition with two yes/no ones.'),
      mcq('Building a decision table, a tester cannot fill the action for "member with a small cart and a coupon". What should happen next?', [
        ['Ask the product owner and record the answer as the rule', true],
        ['Run the app and use whatever it does as the expected result', false],
        ['Drop the rule from the table, since nobody specified it', false],
        ['Mark it as a don\'t-care and merge it with the next rule', false],
      ], 'An unfillable cell is a gap in the specification, and only the product owner can close it. Copying the app\'s behaviour makes any bug the expected result, dropping it leaves the riskiest combination untested, and a don\'t-care is a claim nobody has made.'),
      mcq('Which situation fits a decision table better than a state transition model?', [
        ['Loan eligibility from age band, income and an existing loan', true],
        ['An order moving from paid to shipped to delivered over days', false],
        ['A payment that may be retried up to three times after failing', false],
        ['A seat hold that is released when ten minutes pass unpaid', false],
      ], 'Eligibility is a combination of facts at one moment, which is what a decision table models. The other three depend on the order of events and the current state, so they belong in a state model.'),
    ],
  },

  /* ── STATE_TRANSITIONS ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TEST_DESIGN_STATE_TRANSITIONS',
    notes: `Some behaviour depends not on what you send but on what happened before. "Cancel" is fine for a paid order and
wrong for a shipped one; "retry payment" works twice and then must stop. A state model makes the history explicit, and
from it you can count exactly which tests you need.

## The parts

- **States**: the conditions something can be in (CREATED, PENDING, PAID...).
- **Events**: what can happen to it (pay, payment_ok, cancel...).
- **Transitions**: an event in a state that moves it to another state.
- **Guards**: a condition that must hold for a transition (fewer than 3 payment attempts).
- **Actions**: what the system does on a transition (mark a refund as due, send an SMS).

## BazaarBee's order

From the story: an order is CREATED; pay sends it to PENDING; the gateway reports payment_ok (PAID) or payment_fail
(FAILED); a failed payment can be retried, at most 3 attempts in total; a PAID order ships, then is delivered.
CREATED, PENDING, FAILED and PAID orders can be cancelled, and cancelling a PAID order owes a refund. A SHIPPED order
cannot be cancelled.

    CREATED --pay--> PENDING --payment_ok--> PAID --ship--> SHIPPED --deliver--> DELIVERED
                        |  ^                   |
           payment_fail |  | retry [attempts<3]|  cancel / refund_due
                        v  |                   v
                       FAILED              CANCELLED  <--cancel-- CREATED, PENDING, FAILED

The implementation has three planted bugs: SHIPPED --cancel--> CANCELLED is allowed, the guard is attempts > 3
instead of >= 3, and the refund flag is computed from the new state (always CANCELLED) instead of the old one.

## The state table

Seven states and seven events make a 7 x 7 **state table** of 49 cells. Ten cells are valid transitions; the other
39 must be refused and must leave the order unchanged. The table is the deliverable: it shows the invalid cells a
diagram hides.

The tester's model lives in its own file (model.py), written from the story, with VALID, INVALID (computed as every
cell not in VALID) and PATH, the shortest event sequence to reach each state.

## Coverage levels, and what each found

**The happy path** (pay, payment_ok, ship, deliver):

    1 passed in 0.42s

**Every valid transition** (10 tests, "0-switch" coverage), plus 3 that assert the cancel action:

    FAILED test_valid_transitions.py::test_cancel_action[PAID-True] - assert Fals...
    1 failed, 12 passed in 0.57s

The 10 transition tests passed: they checked the new state, and the new state was right. Only the tests asserting
the **action** found the refund bug. A transition is state plus action; test both.

**Every invalid transition** (39 tests), each asserting the refusal and that the state did not change:

    FAILED test_invalid_transitions.py::test_invalid_transition_is_refused[SHIPPED-cancel]
    1 failed, 38 passed in 0.71s

No test of valid behaviour can find a transition that should not exist. In real systems this is the expensive bug:
a customer cancels a shipped parcel, gets a refund, and also keeps the parcel.

**The guard** (fail three times, then retry):

    FAILED test_guard.py::test_third_attempt_allowed_fourth_refused - Failed: DID NOT RAISE <class 'order.InvalidTransition'>

A guard is a boundary inside a state model, so it gets boundary tests: the 3rd attempt allowed, the 4th refused.

Each level found a different bug: 1 + 13 + 39 + 1 = 54 tests, all generated from the table in a few lines of
parametrize, and run in under a second each.

## Sequences: 1-switch coverage

0-switch coverage tests each transition once. **1-switch** (or N-1 switch) coverage tests every valid pair of
consecutive transitions, such as payment_fail then retry, or retry then payment_ok. It finds bugs that depend on the
path: an attempts counter that is not reset, a coupon applied once on pay and again on retry. Use it for the parts of
the model with loops (FAILED and PENDING here), not everywhere; the number of pairs grows fast.

## Where states hide in real systems

- **Asynchronous events**: a UPI payment can sit in PENDING and succeed minutes later through the gateway's webhook.
  What if the customer cancelled in between? The model must say (refund automatically), and you test that sequence.
- **Duplicate events**: the gateway sends payment_ok twice. The second must be ignored, not charge or email twice.
- **Out-of-order events**: deliver arrives before ship in a courier feed.
- **Time as an event**: a seat hold expiring after 10 minutes is a transition fired by a clock; control the clock in
  tests (inject it or freeze it) rather than sleeping.
- **The UI as a state machine**: the back button after payment, a second browser tab, a double-click on "Pay".

When nobody has drawn the model, drawing it is the first test activity, and the questions it raises (can a FAILED
order be cancelled? what happens to the stock?) are often worth more than the tests.`,
    workedExample: `**Scenario.** A BazaarBee customer pays by UPI. The app shows "payment pending" and the customer, impatient,
cancels the order. Two minutes later the gateway's webhook reports payment_ok for that order. What should happen,
and how do you test it?

**Extend the model.** The story did not cover it, so the tester asks. The product owner's answer: a payment_ok
for a CANCELLED order must not revive it; it records the money and marks a refund as due. That adds one transition
with an action, CANCELLED --payment_ok--> CANCELLED / refund_due, and turns one invalid cell into a valid one.

**Tests from the change.**

    def test_late_payment_after_cancel_is_refunded():
        o = Order()
        o.fire("pay")
        o.fire("cancel")
        assert o.fire("payment_ok") == "CANCELLED"
        assert o.refund_due is True

    def test_duplicate_payment_ok_is_ignored():
        o = Order()
        o.fire("pay"); o.fire("payment_ok")
        with pytest.raises(InvalidTransition):
            o.fire("payment_ok")
        assert o.state == "PAID"

The first is a 1-switch sequence (cancel then payment_ok) that no single-transition test reaches. The second checks a
duplicate event is refused without changing anything. In a real service, "refused" for a webhook usually means
"acknowledged and ignored" (return 200 so the gateway stops retrying) while the order stays as it is; agree the
exact behaviour with the developer and test that.

**Update the table, not just the tests.** VALID gains the new cell, INVALID shrinks to 38, and the parametrized
invalid-transition test changes on its own because it is computed from the model. A model kept as data is cheap to
change; 39 hand-written tests are not.

**What to report if it fails.** The sequence of events, the state after each, and the money position: "order
cancelled at 10:02, payment_ok at 10:04, order still CANCELLED, refund_due False: customer charged with no refund".
That sentence gets a fix the same day.`,
    mcqs: [
      mcq('All 10 valid-transition tests for BazaarBee\'s order passed, yet cancelling a PAID order did not mark a refund. Why?', [
        ['They asserted the new state only, never the action', true],
        ['They never reached the PAID state before cancelling', false],
        ['Refunds are a decision-table rule, not a transition', false],
        ['The refund flag is set only after the order ships', false],
      ], 'The transition PAID --cancel--> CANCELLED produced the right state, so a state-only assertion passed; the bug was in the action. The PATH helper did reach PAID, a refund on cancel is an action on a transition, and the story ties the refund to cancelling, not shipping.'),
      mcq('An order model has 7 states and 7 events, with 10 valid transitions. How many invalid-transition tests does full coverage of the state table need?', [
        ['39', true],
        ['49', false],
        ['10', false],
        ['42', false],
      ], 'The table has 7 x 7 = 49 cells; 49 - 10 valid = 39 invalid cells, each tested for refusal. 49 counts every cell, 10 is the valid ones, and 42 subtracts one event per state instead of the valid transitions.'),
      mcq('The SHIPPED --cancel--> CANCELLED bug was found only by the invalid-transition tests. What does that say about test design?', [
        ['A transition that should not exist cannot be found by valid-path tests', true],
        ['Invalid-transition tests are always the most valuable state tests', false],
        ['Happy-path tests should be removed once a state table exists', false],
        ['Shipped orders are the riskiest state in every e-commerce system', false],
      ], 'Valid-path tests only use transitions the model allows, so an extra one is invisible to them; you have to try what should be refused. Each coverage level found a different bug here, the happy path stays as a cheap smoke test, and risk differs by product.'),
    ],
    checkpoint: [
      mcq('A failed payment can be retried "at most 3 attempts in total". Which tests cover the guard?', [
        ['The 3rd attempt allowed and the 4th attempt refused', true],
        ['One retry allowed, to show retrying works at all', false],
        ['The 4th attempt refused, without testing the 3rd', false],
        ['Five retries in a loop, asserting none raise errors', false],
      ], 'A guard is a boundary, so it needs both sides: the last allowed attempt and the first refused one. One retry misses the edge, the 4th alone cannot catch a guard that refuses the 3rd, and expecting no errors after five retries asserts the bug.'),
      mcq('Which bug does 1-switch coverage find that 0-switch coverage can miss?', [
        ['An attempts counter not reset between payment_fail and retry', true],
        ['A state the order can never reach from CREATED at all', false],
        ['An event name misspelled in the transition table', false],
        ['A refused event that changes the order\'s state', false],
      ], '1-switch tests pairs of consecutive transitions, so it exercises the history that counters and flags carry. An unreachable state shows up when building PATH, a misspelled event fails a single-transition test, and the refusal check belongs to invalid-transition tests.'),
      mcq('A seat hold expires after 10 minutes without payment. How should a test drive that transition?', [
        ['Inject or freeze the clock and move it past 10 minutes', true],
        ['Call time.sleep(600) and then check the seat is free', false],
        ['Skip it, since time-based events cannot be unit tested', false],
        ['Shorten the hold to one second in the production config', false],
      ], 'Time is an event in the model; controlling the clock fires it instantly and deterministically. A ten-minute sleep makes the suite slow and still flaky, time-based rules are very testable, and changing production config tests a different system.'),
    ],
  },

  /* ── COMBINATORIAL ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TEST_DESIGN_COMBINATORIAL',
    notes: `BazaarBee's checkout must work on four browsers, four platforms, four payment methods, three languages, for guests
and logged-in users. Every combination is 4 x 4 x 4 x 3 x 2 = 384 checkouts. Nobody runs 384 manual checkouts per
release, so teams pick some at random and hope. Pairwise testing replaces hope with a guarantee you can state.

## The idea

Most configuration bugs are triggered by one setting or by an interaction of two (Firefox with net banking, Hindi
with a long product name). Studies of real failures by NIST researchers found the large majority involved one or two
factors, and very few more than four. **Pairwise** (2-way) coverage guarantees that every pair of values of every two
parameters appears together in at least one test. It does not test every combination; it tests every
**interaction of two**.

## Counting

    PARAMS = {
        "browser":  ["Chrome", "Firefox", "Safari", "Edge"],
        "os":       ["Windows", "macOS", "Android", "iOS"],
        "payment":  ["UPI", "card", "netbanking", "wallet"],
        "language": ["English", "Hindi", "Telugu"],
        "user":     ["guest", "logged-in"],
    }

Add a **constraint**: Safari runs only on macOS and iOS. Then:

    full product: 384 | valid: 336
    2-way: 112 combinations to cover -> 19 rows

There are 112 value pairs to cover (114 minus the two impossible ones, Safari with Windows and with Android), and
19 rows cover them all. The lower bound is 16, because browser and payment alone have 4 x 4 = 16 pairs and each row
covers one of them.

## A generator in 20 lines

You do not need a tool to understand it. Greedy: from all valid rows, repeatedly pick the one that covers the most
still-uncovered pairs.

    def tuples_of(row, n):
        return {tuple((i, row[i]) for i in c) for c in itertools.combinations(range(len(row)), n)}

    def greedy(n):
        candidates = [r for r in itertools.product(*PARAMS.values()) if valid(r)]
        left = set().union(*(tuples_of(r, n) for r in candidates))
        chosen = []
        while left:
            best = max(candidates, key=lambda r: len(tuples_of(r, n) & left))
            chosen.append(best)
            left -= tuples_of(best, n)
        return chosen

The first rows it picked:

    ('Chrome', 'Windows', 'UPI', 'English', 'guest')
    ('Chrome', 'macOS', 'card', 'Hindi', 'logged-in')
    ('Firefox', 'Windows', 'netbanking', 'Telugu', 'logged-in')
    ('Firefox', 'Android', 'wallet', 'Hindi', 'guest')

Greedy is not optimal (shuffling the candidate order gave sets of 18 to 22 rows) but it is always complete, because
it stops only when nothing is left to cover.

## Two planted bugs

Two bugs were planted in the "app": a 2-way bug (Firefox with net banking fails) and a 3-way bug (Hindi with wallet
for a guest fails). The 19-row pairwise set must contain Firefox with netbanking, so the 2-way bug is caught by
construction. The 3-way bug is caught only if a row happens to contain all three values: across 200 shuffled greedy
runs, 131 sets caught it and 69 did not. Pairwise guarantees pairs; anything beyond that is luck.

For 3-way coverage: 358 triples to cover, 68 rows, still far below 336, and both bugs found by construction. Use 3-way
for the parameters where the risk justifies it (payments), not across the board.

## Check your tool's coverage

The Python library allpairspy (2.5.1) generates sets with AllPairs(values, filter_func=...). In our run:

    no filter:   18 rows, all 114 pairs, but 2 rows are Safari on Windows/Android
    with filter: 16 rows, 105 of 112 valid pairs covered
    missing: ('Firefox', 'netbanking'), ('Firefox', 'iOS'), ('Edge', 'UPI'), ...

With the constraint, the library returned a set that missed seven pairs, including the one with the planted bug; its
n=3 option returned 23 rows covering 173 of 376 triples. That is not a reason to avoid tools; it is a reason to verify
any generated set with a ten-line coverage check like tuples_of above, in CI, every time the parameters change.
Microsoft's PICT is the widely used command-line generator: a model file lists parameters and constraints, such as

    Browser: Chrome, Firefox, Safari, Edge
    OS:      Windows, macOS, Android, iOS
    IF [Browser] = "Safari" THEN [OS] IN {"macOS", "iOS"};

and "pict model.txt" prints the rows (with /o:3 for 3-way). PICT was not run for this lesson; check its documentation.

## Using it well

- **Constraints are part of the model**, not something you delete afterwards: dropping the two invalid rows of the
  unfiltered set leaves 106 of 112 pairs, because those rows also carried valid pairs.
- **Seed the rows that must be there**: the top-revenue configuration (Chrome, Android, UPI) goes in by hand.
- **Values are partitions**: "Android" means one representative device; choose it deliberately (an older, low-memory
  phone finds more than a flagship).
- **Pairwise is for independent settings**: browsers, devices, feature flags, form options. For business rules where
  conditions are known to interact, use a decision table; for order of events, a state model.`,
    workedExample: `**Scenario.** BazaarBee's release has six new feature flags, each on or off: new search, new cart, one-tap UPI,
reviews v2, dark mode and the festive banner. Ops will run any mix in production during the gradual rollout. The QA
lead asks: which mixes do we test before Friday?

**Count.** Six yes/no flags give 2^6 = 64 combinations. The greedy generator over them:

    6 boolean flags: (64, 7)
    10 boolean flags: (1024, 9)

Seven rows cover every pair of flag settings for six flags; nine rows for ten. Mathematics says six rows are enough
for up to ten boolean flags (an optimal covering array), so greedy is close but not optimal, and a dedicated tool may
do better; either way the set stays tiny while the full product explodes.

**Add what pairwise cannot know.**

- The two configurations everyone will actually see: all flags off (today's production) and all on (the end state).
- A known interaction from the design review: one-tap UPI uses the new cart's API, so "one-tap UPI on, new cart off"
  must be tested explicitly, and it is a constraint question: should that mix even be allowed? Ops says no, so it
  becomes a constraint and a test that the flag service refuses it.

**The plan.** Seven pairwise rows plus all-off and all-on, minus duplicates, each run through the checkout smoke
suite (about 12 minutes per configuration in CI): under two hours of machine time instead of 64 configurations and
roughly 13 hours. The coverage check runs in the same job, so if someone adds a seventh flag the set is regenerated
and verified, not hand-edited.

**What to say in the test report.** "All pairs of flag settings covered by 7 configurations, plus all-off and all-on;
one forbidden combination enforced and tested; 3-way interactions not covered except where named." Stating what you
did not cover is part of the result.`,
    mcqs: [
      mcq('BazaarBee\'s parameters have 4, 4, 4, 3 and 2 values. Why can no pairwise set have fewer than 16 rows?', [
        ['Two 4-value parameters have 16 pairs and a row covers one', true],
        ['Pairwise always needs one row per value of every parameter', false],
        ['Sixteen is the square root of the 384 combinations in total', false],
        ['Each row covers 16 pairs, and there are 256 pairs to cover', false],
      ], 'Browser x payment alone has 4 x 4 = 16 value pairs, and each row contains exactly one of them, so 16 rows is the floor. One row per value would be 4, the square root of 384 is about 19.6, and the set covers 112 pairs, not 256.'),
      mcq('A 19-row pairwise set for BazaarBee caught "Hindi with wallet for a guest" in one run. What can the tester claim?', [
        ['Nothing general: 3-way coverage was luck, caught in 131 of 200 runs', true],
        ['Pairwise sets always catch 3-way bugs that involve a 2-value parameter', false],
        ['The bug is really 2-way, because the set guarantees only pairs', false],
        ['All 3-way bugs are covered whenever the set has 19 or more rows', false],
      ], 'Pairwise guarantees pairs only; shuffled runs caught this 3-way bug about two times in three. A 2-value parameter gives no guarantee, catching it does not change its nature, and 3-way coverage needed 68 rows, not 19.'),
      mcq('A tester generates a pairwise set without the "Safari only on macOS or iOS" constraint, then deletes the two impossible rows. What is the problem?', [
        ['The deleted rows also carried valid pairs, which are now uncovered', true],
        ['Deleting rows changes the order the remaining tests run in', false],
        ['Impossible rows should be kept and marked as passed in the final report', false],
        ['Generators refuse to run when any constraint is left out', false],
      ], 'Each row covers several pairs; removing two left 106 of 112 valid pairs. Order does not matter for coverage, reporting impossible rows as passed is false evidence, and generators happily produce rows that break constraints you did not give them.'),
    ],
    checkpoint: [
      mcq('What does a pairwise (2-way) test set guarantee?', [
        ['Every value pair of any two parameters appears in some row', true],
        ['Every combination of all parameters is tested once in total', false],
        ['Every value of each parameter appears at least twice in it', false],
        ['Every bug that involves two or more parameters is detected', false],
      ], 'Pairwise is defined by covering each pair of values of any two parameters. All combinations is the full product, values appearing twice is not the definition, and bugs needing three or more specific values are found only by luck.'),
      mcq('A generated pairwise set is about to become the release\'s configuration plan. What should the tester do first?', [
        ['Check every valid pair really appears, with a coverage script', true],
        ['Trust it, since such generators are proven to cover all the pairs', false],
        ['Add random rows until it reaches half of the full product', false],
        ['Remove any row that repeats a value pair from another row', false],
      ], 'In the lesson\'s run a constrained allpairspy set missed 7 of 112 pairs, so coverage is verified, not assumed. Padding to half the product throws away the benefit, and overlapping pairs are normal; removing rows can drop the only copy of another pair.'),
      mcq('Which problem is a poor fit for pairwise testing?', [
        ['A refund rule where amount band and timing are known to interact', true],
        ['Checking a form across four browsers and three languages', false],
        ['Testing six independent feature flags before a rollout', false],
        ['Choosing devices and OS versions for a mobile regression', false],
      ], 'Known interactions in business rules need every combination the rule defines, which is a decision table. Browsers and languages, independent flags and device matrices are configuration spaces where pairwise is exactly right.'),
    ],
  },

  /* ── EXPLORATORY ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TEST_DESIGN_EXPLORATORY',
    notes: `Every technique so far starts from a specification. Exploratory testing starts from the product: you learn it, design
a test, run it, and let what you see choose the next test, all at once. It finds what nobody thought to specify, which
is often where the serious bugs are. It is not "clicking around". Done well it is planned,
time-boxed, recorded and reported.

## Session-based exploratory testing

The usual structure (session-based test management, from James and Jonathan Bach) has four parts:

- **A charter**: the mission for one session. Elisabeth Hendrickson's template is "Explore *target* with
  *resources* to discover *information*": "Explore seat selection with two browsers logged in as different users to
  discover what happens when both pick the same seat."
- **A time box**: 60 to 90 minutes, uninterrupted. Short enough to stay focused, long enough to get deep.
- **Notes as you go**: what you tried, what you saw, questions, bugs, and ideas for other charters. Timestamps help.
- **A debrief**: ten minutes with the lead. A common checklist is PROOF: Past (what happened), Results (what was
  found), Obstacles (what slowed you down), Outlook (what still needs doing) and Feelings (how confident you are).

Record roughly how the time split between testing on the charter, investigating and writing bugs, and setup. A
session that was 70% setup says the test environment is the problem, which is a finding in itself.

## Heuristics: where to look

A heuristic is a rule of thumb that suggests tests. They are not checklists to complete; they keep you from testing
only what you already thought of.

**SFDIPOT** (James Bach's product elements, "San Francisco Depot"): Structure (what it is made of), Function (what it
does), Data (what it processes), Interfaces (UI, API, files), Platform (what it depends on), Operations (how it is
really used) and Time (timing, order, time zones, expiry).

**Tours** (James Whittaker's book on exploratory testing): the money tour (the features sales demos), the landmark
tour (jump between key features in different orders), the back-alley tour (the least-used features), the saboteur
tour (remove what the app depends on: network, storage, permissions).

**Quick ones that pay off on Indian consumer apps:**

- **Goldilocks**: too small, too big, just right, for every field.
- **Interruptions**: lose the network mid-payment, press back after paying, rotate the phone, take a call, let
  the OTP expire, switch to the UPI app and come back after five minutes.
- **Double and parallel**: double-tap "Pay", open the same booking in two tabs, two users on one seat.
- **CRUD**: create, read, update and delete each thing, and do them in odd orders (edit a cancelled booking).
- **Follow the data**: put a recognisable value in, then find everywhere it appears (ticket, SMS, invoice PDF,
  admin panel, CSV export).

## Oracles: knowing a bug when you see one

Without a written expected result, how do you know something is wrong? Michael Bolton and James Bach's consistency
heuristics (HICCUPPS) list what a product should be consistent with: its History, the company's Image, Comparable
products, Claims (docs, marketing), User expectations, the Product itself (same thing behaves the same everywhere),
its Purpose, and Statutes and standards. "The refund shows Rs 450 on the app and Rs 405 in the SMS" is a Product
inconsistency, a bug without any spec.

## A data tour, run for real

The SafarBus passenger-name field accepts 2 to 40 characters, implemented as 2 <= len(name) <= 40. A data tour tries
names a test script would not:

    'Ravi'                         len= 4  utf8 bytes= 4  accepted=True
    '  '                           len= 2  utf8 bytes= 2  accepted=True
    'శ్రీ' (Telugu, one syllable)    len= 4  utf8 bytes=12  accepted=True
    'சு' (Tamil, one syllable)      len= 2  utf8 bytes= 6  accepted=True
    family emoji                   len= 5  utf8 bytes=18  accepted=True
    'Ravi' + zero-width space      len= 5  utf8 bytes= 7  accepted=True
    41 characters                  len=41  utf8 bytes=41  accepted=False

Findings in ten minutes: a blank name is accepted (two spaces); an invisible zero-width character is accepted and
will break "search by passenger name" at the counter; Python's len counts code points, not visible letters, so a
one-syllable Tamil name passes a "2 characters" minimum; and if the database column limits bytes, a Telugu name of
14 code points (42 bytes) is already over 40. The script itself failed on its first run with UnicodeEncodeError, because the
Windows console could not print Telugu: the same bug a log line or an SMS gateway could have.

## From exploration to automation

Each real bug found in a session becomes a regression test, and each surprising area becomes a charter for the
next session. Exploratory testing and automation are partners: scripts check that what you know still works,
exploration finds what you did not know. A team that only automates stops learning about its product.`,
    workedExample: `**Charter.** Explore SafarBus seat selection and payment with two logged-in users on Chrome and an Android phone,
to discover how seat holds behave under conflicts and interruptions. Time box: 60 minutes. Build 2026.10.3, staging.

**Session sheet (abridged).**

    10:00  Setup: two accounts, route Hyderabad-Vijayawada, 26 Oct night bus. (8 min)
    10:08  User A holds seat 14. User B sees 14 as grey. OK.
    10:11  A presses back from the payment page. Seat 14 still held for B? Yes, until timer ends.
           Question: should back release it? Ask PO.
    10:15  A pays with UPI, switches to UPI app, waits 4 min, approves.
           App shows "payment pending" for 40 s, then confirmed. OK.
    10:24  B holds 15 and 16, kills the app at payment, reopens:
           hold timer restarts at 10:00. BUG 1: timer resets on app restart.
    10:31  BUG 1 reproduced 3/3. Timer stored on device, not server?
    10:37  A and B tap seat 20 within ~1 s: both see "seat held".
           A pays first; B's payment succeeds 20 s later. BUG 2: double booking.
    10:45  BUG 2 reproduced 2/4 (timing). Screen recordings saved.
    10:52  Ticket SMS for A shows boarding point "Ameerpet"; web ticket says "Kukatpally".
           BUG 3 (inconsistency between SMS and ticket).
    11:00  End.

**Breakdown.** Setup 8 min, testing on charter 34 min, bug investigation and notes 18 min.

**Debrief (PROOF).** Past: holds, back button, kill-and-reopen, simultaneous taps, SMS check. Results: three bugs,
one critical (double booking takes money twice for one seat). Obstacles: staging payments are slow; timing bugs
need two people. Outlook: new charters for "hold expiry across midnight" and "boarding point consistency across
ticket, SMS and email". Feelings: low confidence in seat locking under load.

**What happens next.** BUG 2 is reported with both screen recordings and server timestamps and becomes an automated
concurrency test (two API clients holding the same seat at once; exactly one must succeed). That test now runs on
every build; finding the bug needed a human.`,
    mcqs: [
      mcq('Which charter follows the "explore target with resources to discover information" shape?', [
        ['Explore refunds with a cancelled UPI booking to discover how partial refunds are shown', true],
        ['Test every screen of the app with any data and report anything that looks broken', false],
        ['Verify that the refund page shows Rs 450 when a Rs 500 ticket is cancelled early', false],
        ['Run the regression suite on refunds and the cancellation flow before the release', false],
      ], 'It names a target (refunds), a resource (a cancelled UPI booking) and the information sought. "Every screen" has no focus, the Rs 450 check is a scripted test case with a fixed expected result, and running a regression suite is not exploration.'),
      mcq('During a session a tester sees Rs 450 refunded in the app but Rs 405 in the SMS, and no specification covers it. Why is it still a bug?', [
        ['The product is inconsistent with itself, which is an oracle', true],
        ['Any difference in amounts is a defect only once the PO agrees', false],
        ['SMS text is always generated from the database, so it is right', false],
        ['Exploratory findings count only when the charter predicted them', false],
      ], 'Consistency heuristics such as HICCUPPS make the product\'s own behaviour an oracle: the same refund cannot be two amounts. Waiting for a spec misses the point, either side could hold the wrong value, and charters guide a session without limiting what it may find.'),
      mcq('The SafarBus name rule 2 <= len(name) <= 40 accepted a one-syllable Tamil name. What did the data tour reveal?', [
        ['len counts code points, not the letters a person sees', true],
        ['Tamil text is stored as two bytes per letter in UTF-8', false],
        ['Python cannot compare strings in Indian scripts at all', false],
        ['The minimum length check is skipped for Unicode text', false],
      ], 'The Tamil syllable is two code points (a consonant and a vowel sign), so len returns 2 though a reader sees one letter. It took 6 bytes in UTF-8, not two per letter; Python compares and measures such strings fine, and the check ran, measuring code points.'),
    ],
    checkpoint: [
      mcq('What makes a session "session-based exploratory testing" rather than unplanned clicking?', [
        ['A charter, a time box, notes taken during it and a debrief', true],
        ['A complete list of test steps written down before the session', false],
        ['A rule that every finding is automated within the session', false],
        ['A requirement that two testers always work on one screen', false],
      ], 'The charter, time box, notes and debrief make exploration accountable and reportable. Written steps would make it scripted testing, automation comes after the session, and pairing is optional.'),
      mcq('A 90-minute session report shows 60 minutes spent on setting up data and environments. What is the right reading?', [
        ['The test environment is a finding the lead should act on', true],
        ['The tester was slow and needs a shorter time box next time', false],
        ['The charter was too wide and should be split into three', false],
        ['Setup time is normal and should be left out of the report', false],
      ], 'Recording the time split exists to expose obstacles; two thirds on setup says the environment or test data is the bottleneck. Blaming the tester or the charter ignores the evidence, and hiding setup time hides the problem.'),
      mcq('Which heuristic is most likely to find a double booking in a seat-selection screen?', [
        ['Two users acting on the same seat at the same moment', true],
        ['Goldilocks values in the passenger name field', false],
        ['Following the passenger name into the invoice PDF', false],
        ['Checking every page against the company\'s style guide', false],
      ], 'Double booking is a concurrency bug, which "double and parallel" tests target. Field sizes, data flow into documents and style consistency are good heuristics for other kinds of bugs.'),
    ],
  },

  /* ── FROM_STORIES ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TEST_DESIGN_FROM_STORIES',
    notes: `At work, most of your tests start as a user story in Jira with three to six acceptance criteria. This lesson is how
a tester reads that story for what it does not say, turns it into test cases a colleague can run, links each test
back to a criterion so coverage is visible, and keeps the suite small enough to stay current. Three-amigos sessions
and Given-When-Then are covered in "QA in Agile Teams and Shift-Left Testing"; here the focus is the tests.

## The story

    BK-102  As a passenger, I want to cancel my booking so that I get money back.
    AC1  Cancelling 24 hours or more before departure refunds 90% of the fare.
    AC2  Cancelling less than 24 hours before departure refunds 50%.

## Reading for gaps

Read each criterion and ask what it leaves open. A useful list of prompts:

- **Boundaries**: is exactly 24 hours "or more"? Here yes, said once. Is "before departure" the scheduled or the actual
  departure if the bus is delayed?
- **Missing negatives**: after departure? Already cancelled? A booking made with a voucher?
- **States**: what if the operator cancelled the bus first (full refund?), or the payment is still pending?
- **Partial actions**: four seats, cancel one?
- **Roles and channels**: can the agent at the counter cancel for the passenger? Does the app and the web behave the
  same?
- **Vague words**: "money back" to which account, by when? "Quickly", "recent" and "user-friendly" are untestable
  until someone puts a number on them.
- **Non-functional**: two cancellations at once from two devices; the refund SMS; an audit log.

Each gap becomes a question for the product owner, asked before the sprint starts, and each answer becomes a new
criterion. A tester who adds AC3 "after departure, cancellation is refused" has prevented a bug, not found one.

## Writing a test case

A test case someone else can run without asking you has:

    ID            TC-BK102-03
    Title         Exactly 24 hours before departure gets the 90% refund
    Linked to     BK-102 AC1
    Preconditions Confirmed booking, fare Rs 1,000, departure 26 Oct 22:00
    Steps         1. Set the clock to 25 Oct 22:00   2. Cancel the booking from My Trips
    Expected      Refund Rs 900 shown; booking status CANCELLED; SMS with Rs 900
    Priority      High (money, boundary)

The title says the condition and the outcome. The expected result is observable and exact ("Rs 900", not "correct
refund"). One test case checks one idea; "Verify cancellation works" is not a test case, it is a wish.

**High-level or low-level?** A high-level (logical) test case says "cancel at exactly 24 hours, expect 90%"; a
low-level (concrete) one adds the data and every click. Write high-level cases for exploratory and experienced
testers, low-level ones where a step is easy to get wrong or the case will be automated soon.

## Traceability in the code

Traceability answers two questions: is every criterion tested, and which criteria are failing right now? In a
spreadsheet the matrix goes stale in a week. In pytest it can be generated: tag each test with a custom marker, and
let a conftest.py hook print the matrix after every run.

    @pytest.mark.ac("BK-102-AC1")
    @pytest.mark.parametrize("hours", [24, 72])
    def test_refund_90(hours):
        assert refund(1000, hours) == 900

The conftest (about 30 lines) reads the criteria from acceptance.json, collects each test's ac marker in
pytest_collection_modifyitems, records outcomes in pytest_runtest_logreport, and prints a section in
pytest_terminal_summary. Run against a refund function with a planted bug (hours_before > 24 instead of >= 24):

    ...F...                                                      [100%]
    ================================ traceability ================================
    BK-101-AC1  passing       2 test(s)
    BK-101-AC2  passing       1 test(s)
    BK-101-AC3  NOT COVERED   A hold that is not paid for is released after 10 minutes
    BK-102-AC1  FAILING       2 test(s)
    BK-102-AC2  passing       2 test(s)
    FAILED test_booking.py::test_refund_90[24] - assert 500 == 900
    1 failed, 6 passed in 0.97s

One run shows the uncovered criterion (nobody tested hold expiry), the failing one, and the exact boundary that
failed. The hook also raises an error if a test names a criterion that does not exist, so a typo cannot fake
coverage. Test management tools (Jira with Xray or Zephyr, TestRail) do the same through links; the idea is the same.

## Keeping the suite small and current

Suites rot by growth: every bug adds a test, nothing is removed, and the run takes an hour. Keep it healthy:

- **Every test traces to a criterion or a bug.** A test linked to nothing is a candidate for deletion.
- **Remove duplicates**: two tests that would always fail together test one thing.
- **Retire tests with their feature**: when the criterion is deleted, so are its tests.
- **Push down**: a rule tested through the UI that could be tested through the API or a function moves down a level.
- **Prioritise by risk**: money, data loss and legal issues get the boundary sets; cosmetic text gets one check.

A small suite that everyone trusts beats a large one everyone reruns until it is green.`,
    workedExample: `**Story.** BK-104: As a passenger, I want to apply a promo code at checkout so that I pay less.
AC1: a valid code reduces the fare by its value. AC2: an expired code shows "This code has expired". AC3: one code per
booking.

**Gaps found in ten minutes of reading.**

1. Can the discount make the fare zero or negative? (A Rs 200 code on a Rs 150 seat.)
2. Is the code case-sensitive? Do spaces around it matter?
3. "Expired" as of which time zone, and is a code valid on its last day until 23:59?
4. Does the code apply per booking or per seat on a 4-seat booking?
5. What if the booking is cancelled: is the code reusable? Is the refund on the discounted fare?
6. Can a code be applied after the seat hold has been extended?

The product owner answers in the refinement meeting: the fare floors at Rs 0; codes are case-insensitive and trimmed;
expiry is 23:59:59 IST on the last day; per booking; codes are not reusable after cancellation and refunds use the
discounted fare. Four answers become AC4 to AC7. Question 6 is parked as low risk.

**Test cases (high level, linked).**

    TC-01  AC1  Rs 100 code on Rs 800 fare -> Rs 700
    TC-02  AC4  Rs 200 code on Rs 150 fare -> Rs 0, not -50
    TC-03  AC5  " fest100 " is accepted as FEST100
    TC-04  AC2  code expired yesterday -> "This code has expired"
    TC-05  AC6  23:59:59 IST on the last day -> accepted; 00:00:00 next day -> expired
    TC-06  AC3  second code -> refused, first code kept
    TC-07  AC7  cancel, rebook, same code -> refused
    TC-08  AC7  refund after promo uses Rs 700, not Rs 800

**Review.** Eight cases for seven criteria; TC-05 is a boundary pair, TC-02 is the output partition "fare would go
negative". Each is tagged with its criterion, so the traceability section shows AC1 to AC7 covered when they are
automated, and nothing extra exists that cannot say why it is there.`,
    mcqs: [
      mcq('Story BK-102 says "24 hours or more before departure refunds 90%". Which question most needs the product owner before testing?', [
        ['Is departure the scheduled time or the actual time if the bus is late?', true],
        ['Should the refund button be green or blue on the cancellation page?', false],
        ['How many test cases should be written for this acceptance criterion?', false],
        ['Which developer will implement the refund calculation for the story?', false],
      ], 'A delayed bus moves the boundary, and nobody can write an expected result until it is decided. Button colour is a design detail, the number of tests is the tester\'s own decision, and who implements it does not change what to test.'),
      mcq('The traceability section printed "BK-101-AC3 NOT COVERED". What does it mean?', [
        ['No test in the run is tagged with that acceptance criterion', true],
        ['The tests for that criterion ran and every one of them failed', false],
        ['The criterion is missing from the acceptance.json file', false],
        ['The tests for it were skipped because a fixture failed', false],
      ], 'The hook lists criteria with no linked tests as NOT COVERED: hold expiry had no test at all. Failing tests show FAILING, a criterion missing from the file would not be listed, and an unknown criterion on a marker raises an error at collection.'),
      mcq('Which is a test case a colleague can run without asking anything?', [
        ['Cancel at exactly 24 h before a Rs 1,000 trip; expect a Rs 900 refund and SMS', true],
        ['Verify that cancellation works correctly for all bookings and fares', false],
        ['Check the refund amount is right after cancelling a booking in the app', false],
        ['Test cancellation thoroughly, including all edge cases and refunds', false],
      ], 'It names the condition, the data and an exact, observable expected result. The others leave the expected result to whoever runs them ("works", "right", "thoroughly"), so two people would run different tests and both report a pass.'),
    ],
    checkpoint: [
      mcq('A regression suite has grown to an hour. Which test is the best candidate to delete?', [
        ['A test linked to no criterion or bug that duplicates another test', true],
        ['A boundary test on the refund rule that has not failed in a year', false],
        ['A test added last month for a production bug in seat locking logic', false],
        ['A slow end-to-end test of the main booking and payment journey', false],
      ], 'A test that traces to nothing and repeats another adds run time without adding information. A quiet boundary test still guards money, a recent production bug proved its case is reachable, and the main journey is worth its cost.'),
      mcq('Why generate the traceability matrix from pytest markers instead of keeping it in a spreadsheet?', [
        ['It is rebuilt on every run, so it cannot drift from the real tests', true],
        ['Spreadsheets cannot hold more than a few hundred test case links each', false],
        ['pytest refuses to run any test that does not carry an ac marker', false],
        ['Markers make the tests themselves run faster on the CI servers', false],
      ], 'A matrix produced by the run reflects the tests that exist and their current results. Spreadsheets hold plenty but go stale, pytest runs unmarked tests normally, and markers do not change speed.'),
      mcq('An acceptance criterion says "search results load quickly". What should the tester do?', [
        ['Ask for a number, such as 95% of searches under 2 seconds', true],
        ['Test it by eye and pass it if the results feel fast enough', false],
        ['Ignore it, as performance is not part of functional testing', false],
        ['Write a test asserting that search returns within 30 seconds', false],
      ], '"Quickly" cannot be passed or failed until it has a measurable target, which the product owner must set. Judging by feel is not repeatable, performance criteria are part of the story, and inventing a generous limit tests nothing anyone agreed.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TEST_DESIGN_DEBUGGING',
    notes: `When a test design is broken, the suite is green and the bug is in production. Debugging test design means asking
"why did our tests not catch this?" and finding the design mistake, not just adding one more test. Five real-shaped
cases; the ones marked "run" were executed with pytest 9 against the planted-bug functions from this topic.

## 1. The boundary taken from the wrong side

**Symptom.** Customer care at SafarBus reports that 60-year-old passengers are charged the full fare. The fare
suite has "boundary tests" and is green.

**Cause.** The tester tested 59 (full) and 61 (senior). Both are right with the buggy age > 60 and with the correct
age >= 60, so neither can tell them apart. The edge value itself, 60, was never tested.

**Fix.** For every edge, test the edge value and its neighbour across the line: 59 and 60. Write the partition table
first ("60-120 senior") so the edge value is on paper before the tests are written.

## 2. The oracle copied from the code (run)

**Symptom.** A carefully chosen boundary set (4, 5, 11, 12, 59, 60, 61) passes against the fare function with two
known bugs:

    def expected_fare(age, seats, base=800):          # "helper" copied from fare.py
        if age <= 5: return 0
        if age < 12: return base // 2 * seats
        if age > 60: return base * 70 // 100 * seats
        return base * seats

    $ pytest -q test_oracle.py
    7 passed

**Cause.** The expected result is computed by the same logic as the code, bugs included. The test compares the code
with itself. The test values were right; the oracle was wrong.

**Fix.** Expected results come from the specification, written as literal values: (5, 400), (60, 560). If a helper is
unavoidable (a long table), write it independently from the rule, never by copying the implementation.

## 3. The don't-care that was not

**Symptom.** BazaarBee's finance team finds members got 15% off on Rs 1,200 carts during the sale. The decision-table
tests were green.

**Cause.** The tester "reduced" the table by assuming a member's coupon always works, merging R1 and R3 into one rule
with the cart as don't-care, and tested it with a Rs 2,500 cart. The written rule never said cart value was
irrelevant for members; the developer's "or member" bug lived exactly in the merged cell.

**Fix.** A don't-care must come from the rule, in writing. For money rules of up to four conditions, keep the full
table; eight parametrize rows cost nothing next to a sale-day refund.

## 4. The refusal that changed things anyway (run)

**Symptom.** Customers who tried to change the date of a cancelled booking later find they have "used up" their
free date changes on a new booking. The test for the refusal passes.

    def change_date(self):
        self.changes += 1                       # counted before the check
        if self.state != "CONFIRMED" or self.changes > 2:
            raise Refused("date change not allowed")

    def test_change_refused_when_cancelled():       # passes
        b = Booking(); b.state = "CANCELLED"
        with pytest.raises(Refused):
            b.change_date()

**Cause.** The test checks that the event is refused, not that the refusal left the object unchanged. Adding one
assertion exposes it:

    assert (b.state, b.changes) == ("CANCELLED", 0)
    E       AssertionError: assert ('CANCELLED', 1) == ('CANCELLED', 0)

**Fix.** Every invalid-transition test asserts two things: the refusal, and that the state (and any counters,
balances or stock) did not change.

## 5. The impossible rows deleted by hand (run)

**Symptom.** After the festive release, checkout with Firefox and net banking fails for every customer. The
configuration plan said "pairwise coverage".

**Cause.** The pairwise set was generated without the "Safari only on macOS or iOS" constraint. Two rows came out
as Safari on Windows and Safari on Android; the tester deleted them. Checking coverage afterwards:

    n=2 no filter   rows= 18 invalid rows=2  covered 106/112

Six valid pairs were carried only by the deleted rows. In another attempt, the constrained set from allpairspy 2.5.1
covered 105 of 112 pairs and the missing list included ('Firefox', 'netbanking'): the plan said pairwise and was not.

**Fix.** Give the generator the constraints, then verify the result with a coverage check in CI. "Pairwise" in a
plan is a claim that must be proved by a script, not by the tool's name.

## The habit

For each escaped bug, write down which technique should have caught it and why it did not: wrong boundary value,
wrong oracle, an unjustified merge, a missing assertion, unverified coverage. Those five explain most test-design
misses you will see in your first year.`,
    mcqs: [
      mcq('A fare test computes its expected value with a helper copied from fare.py, and all seven boundary cases pass against buggy code. What is the fault?', [
        ['The oracle repeats the implementation, so it repeats its bugs', true],
        ['The boundary values were badly chosen for the rule in question', false],
        ['pytest parametrize does not compare integers reliably at all', false],
        ['The test should have used pytest.approx for rupee amounts here', false],
      ], 'The values 4, 5, 11, 12, 59, 60, 61 were the right ones; the expected results were wrong because they came from the same logic. parametrize compares ints exactly, and approx is for floats, which these fares are not.'),
      mcq('A refusal test passes, but the refused date change still increments a counter. What assertion was missing?', [
        ['That the state and counters are unchanged after the refusal', true],
        ['That the exception message contains the word "allowed"', false],
        ['That the refusal is raised within one second of the original call', false],
        ['That a second refusal raises the same exception type again', false],
      ], 'An invalid event must leave the object exactly as it was; asserting the counter exposed changes=1. Message text, speed and repeating the call all still pass with the counter bug.'),
      mcq('Tests at ages 59 and 61 passed while 60-year-olds were charged the full fare. Which design mistake explains it?', [
        ['The edge value 60 itself was never one of the test values', true],
        ['Partition tests were used where a decision table was needed', false],
        ['The tests used whole years instead of ages in months and days', false],
        ['Two-value boundary analysis cannot detect a > versus >= bug', false],
      ], 'Both 59 and 61 give the same result under > 60 and >= 60; only 60 tells them apart. One input does not need a decision table, the rule is in whole years, and two-value analysis (59 and 60) catches it.'),
      mcq('A configuration plan claims pairwise coverage, yet Firefox with net banking failed for everyone after release. What is the most likely design fault?', [
        ['The generated set was never checked and missed that pair', true],
        ['Pairwise testing cannot find bugs that involve a browser', false],
        ['Net banking should have been excluded as a payment value', false],
        ['The bug must involve at least three parameters together', false],
      ], 'A 2-way bug is exactly what pairwise guarantees to catch, so the set did not really cover the pair; an unverified or hand-edited set is the usual cause. Browsers are ordinary parameters, excluding a real payment method hides risk, and a three-factor cause contradicts the symptom.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TEST_DESIGN_PRACTICE',
    notes: `Eight exercises. Work each on paper first, then check the answer.

## 1. OTP field (partitions)

A login OTP is exactly 6 digits. List the partitions and one test value for each.

**Answer.** Valid: 6 digits ("048213", keep the leading zero). Invalid: 5 digits, 7 digits, empty, 6 characters with a
letter ("04821a"), 6 digits with a space inside, and a correct-length but wrong or expired OTP (a separate partition
of the business rule, not of the format). Seven tests; the length ones (5 and 7) are also the boundaries.

## 2. UPI amount (boundaries with precision)

A UPI transfer screen accepts Rs 1.00 to Rs 1,00,000.00 per transaction, in paise. Give the two-value boundary set.

**Answer.** 0.99 (refused), 1.00 (accepted), 100000.00 (accepted), 100000.01 (refused). Add one middle value and the
invalid partitions that are not numbers: empty, negative, three decimal places (1.005). The step is one paisa, so
"2" next to "1" would be the wrong neighbour.

## 3. Loan pre-approval (decision table)

Pre-approved if salary is above Rs 30,000 a month AND credit score is 700 or above, unless the applicant has an
existing default (then refused whatever else). Build and reduce the table.

**Answer.** Three yes/no conditions, 8 rules. Default = Y makes the others irrelevant: one rule (refused). Default = N
leaves 4 rules: approved only when salary and score are both Y. Reduced: 5 rules. Test values at the edges: salary
30,000 (N) and 30,001 (Y, if salary is in whole rupees); score 699 and 700.

## 4. Counting a state table

A complaint ticket has states NEW, ASSIGNED, IN_PROGRESS, RESOLVED and CLOSED, and events assign, start, resolve,
reopen, close and comment. Eight transitions are valid. How many invalid-transition tests does full table coverage
need?

**Answer.** 5 x 6 = 30 cells; 30 - 8 = 22 invalid transitions. Ask whether "comment" is a transition at all: if it is
allowed in every state without changing it, it is a self-transition in five cells, and the model should say so.

## 5. Pairwise lower bound

Parameters have 5, 3, 3 and 2 values. What is the full product, the smallest possible pairwise set, and what did a
greedy generator produce?

**Answer.** Full product 5 x 3 x 3 x 2 = 90. Lower bound 5 x 3 = 15 (the two largest parameters). The greedy generator
from the lesson produced exactly 15 rows, which is optimal here.

## 6. Write a charter

Write a charter for exploring refunds of cancelled UPI bookings.

**Answer (one good version).** "Explore refunds for cancelled UPI bookings, using bookings cancelled at different
times and a bus cancelled by the operator, to discover whether the amount, timing and messages are correct and
consistent across the app, SMS and email." Time box 60 minutes. A weak version: "Test refunds."

## 7. Gaps in a criterion

AC: "A user can upload a profile photo." List five questions.

**Answer.** Which formats (JPG, PNG, HEIC from iPhones)? Maximum size, and what message above it? Minimum
dimensions? What replaces an existing photo, and is the old one deleted (data retention)? What if the upload is
interrupted on a slow connection? Who can see it? Is the image checked for content? Each answer becomes a criterion
or an explicit "out of scope".

## 8. Choose the technique

Match each to a technique: (a) a GST rate that depends on product category and state of supply; (b) a booking that
can be held, paid, cancelled or expire; (c) checkout on 5 browsers, 3 OS, 4 payment methods; (d) a new chat feature
with no written specification; (e) an age field.

**Answer.** (a) decision table (extended entry, category x intra/inter-state); (b) state transition; (c) pairwise with
constraints; (d) exploratory sessions with charters; (e) partitions and boundaries. Real features usually need two:
a booking also has boundaries (the hold timer is a guard).`,
    mcqs: [
      mcq('A UPI screen accepts Rs 1.00 to Rs 1,00,000.00 in paise. Which value is the invalid neighbour of the upper limit?', [
        ['Rs 1,00,000.01', true],
        ['Rs 1,00,001.00', false],
        ['Rs 99,999.99', false],
        ['Rs 2,00,000.00', false],
      ], 'The step is one paisa, so the first refused value above the limit is 1,00,000.01. 1,00,001.00 skips 99 paise of possible off-by-one bugs, 99,999.99 is inside the valid range, and 2,00,000 is a partition value, not a boundary.'),
      mcq('Loan pre-approval: refused whenever there is an existing default, otherwise approved only if salary and score both qualify. How many rules does the reduced table have?', [
        ['5', true],
        ['8', false],
        ['3', false],
        ['4', false],
      ], 'Default = Y collapses four rules into one; default = N keeps all four salary/score combinations: 1 + 4 = 5. Eight is the unreduced table, three would merge rules the outcome distinguishes, and four forgets the default rule.'),
      mcq('A ticket workflow has 5 states, 6 events and 8 valid transitions. How many invalid transitions must a full state-table test cover?', [
        ['22', true],
        ['30', false],
        ['8', false],
        ['25', false],
      ], '5 x 6 = 30 cells, minus 8 valid = 22 invalid cells. 30 is all cells, 8 is the valid ones, and 25 subtracts the number of states instead of the valid transitions.'),
      mcq('Parameters have 5, 3, 3 and 2 values. What is the smallest possible pairwise set?', [
        ['15 rows', true],
        ['90 rows', false],
        ['10 rows', false],
        ['13 rows', false],
      ], 'The two largest parameters have 5 x 3 = 15 pairs and each row covers one, so 15 is the floor, and the greedy generator reached it. 90 is the full product, and 10 or 13 rows cannot hold 15 different pairs of those two parameters.'),
      mcq('Which technique fits a GST rate that depends on product category and whether supply is within the state?', [
        ['A decision table with category as an extended-entry condition', true],
        ['A state transition model of the invoice from draft to paid', false],
        ['A pairwise set over category, state of supply and browser', false],
        ['An exploratory session on the invoice screen without a charter', false],
      ], 'The rate is a combination of facts at one moment, and every combination the law defines matters, which is a decision table. The invoice\'s life cycle is a different question, pairwise would skip combinations the rule defines, and an uncharted session is not a design technique.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TEST_DESIGN_INTERVIEW_QUESTION',
    notes: `Four questions that come up in QA and SDET interviews at product companies, GCCs and service companies, with an
answer that scores well and the follow-up a good interviewer asks next. Say them aloud in about two minutes each.

## Q1. "An age field accepts 18 to 60. What will you test?"

**Model answer.** "Three partitions: below 18, 18 to 60, above 60. Boundaries on both edges: 17 and 18, 60 and 61, plus
one middle value such as 35. Then the inputs that are not valid numbers: empty, a letter, a decimal like 18.5, a
negative, spaces, a very long string of digits. I would check the error message for each refusal, not just that it was
refused, and that the server enforces the rule too, not only the browser, by sending 17 through the API. If age is
derived from a date of birth, the boundaries move to dates: the day before and the day of the 18th birthday."

**Follow-up.** "Why both 17 and 18? Isn't one enough?" — "Each catches a different mistake. If the code says age > 18,
then 18 fails and 17 passes; if it says age >= 17, 17 fails and 18 passes. In an experiment on a fare function, nine
partition tests caught 15 of 21 one-operator mutants; adding boundaries caught all 21."

## Q2. "What is the difference between equivalence partitioning and boundary value analysis?"

**Model answer.** "Partitioning divides inputs into classes the spec treats the same, so one value represents a class
and I avoid redundant tests. Boundary analysis then tests the edges of those classes, because that is where
comparisons are written wrong. They work together: partitions tell me where the edges are; boundaries tell me which
values to pick. I take partitions from the specification, not the code, and test one invalid value at a time so one
check cannot hide another."

**Follow-up.** "Does that work for strings?" — "Yes: empty, at the minimum and maximum length and one beyond, whitespace
only, other scripts. Length itself is subtle: Python's len counts code points, so a one-syllable Tamil name has length
2, and a database may limit bytes, not characters."

## Q3. "We support 4 browsers, 4 OS, 4 payment methods and 3 languages. How do you test the combinations?"

**Model answer.** "All combinations are 192, too many per release. I'd use pairwise coverage: every pair of values
appears in at least one test, which catches the single-factor and two-factor interactions most configuration bugs
come from. With constraints such as Safari only on Apple platforms, a set is around 16 to 20 configurations. I'd
generate it with a tool like PICT, give it the constraints, add the top-revenue configuration by hand, and verify
coverage with a small script, because I have seen a constrained generator silently miss pairs."

**Follow-up.** "What does pairwise not catch?" — "Bugs that need three specific values together. In one experiment a
three-way bug was caught by about two thirds of pairwise sets, by luck. Where the risk is high, such as payments, I'd
use 3-way coverage for those parameters only."

## Q4. "Is exploratory testing just ad hoc testing?"

**Model answer.** "No. Ad hoc has no plan or record. Exploratory testing is learning, designing and executing at the same
time, but in a structure: a charter for the mission, a time box, notes during the session and a debrief. I use
heuristics like interruptions, double and parallel actions, and following the data to decide what to try. It finds
what nobody specified, and its findings become automated regression tests."

**Follow-up.** "How do you report it to a manager who wants numbers?" — "Sessions and coverage of charters, the bugs
found per session with severity, the time split between testing, investigating and setup, and the outlook: which
areas still have low confidence. A session that found a double-booking bug in an hour is easy to justify."`,
    mcqs: [
      mcq('An interviewer asks what you would test for an age field accepting 18 to 60. Which answer scores highest?', [
        ['17/18 and 60/61, a middle value, non-numbers, and the server rule', true],
        ['18 and 60, since those are the only two values the rule names', false],
        ['Every age from 0 to 100, which is fast enough when automated', false],
        ['One value each from below, inside and above the valid range', false],
      ], 'It combines partitions, both sides of each edge, invalid formats and server-side enforcement. 18 and 60 alone miss the outside neighbours, exhaustive ages ignore non-numbers and server checks, and partition values alone miss off-by-one bugs.'),
      mcq('Asked what pairwise testing does not catch, which answer is most accurate?', [
        ['Bugs that need three or more specific values together', true],
        ['Bugs in any parameter that has more than four values', false],
        ['Bugs caused by one setting on its own, without others', false],
        ['Bugs that appear only on mobile operating systems', false],
      ], 'Pairwise guarantees every pair, so only higher-order interactions are left to luck. Parameter size does not matter, single-value bugs are covered because every value appears, and platform is just another parameter.'),
      mcq('An interviewer says "exploratory testing is just ad hoc testing". What is the best reply?', [
        ['It has a charter, a time box, notes and a debrief; ad hoc has none', true],
        ['It is ad hoc, but done only by testers with many years of experience', false],
        ['It always follows written test cases, but changes the data used', false],
      ], 'The structure is what separates it from ad hoc testing and makes it reportable. Experience helps but does not define it, and following written test cases is scripted testing.'),
    ],
  },

  /* ── MINI_PROJECT ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TEST_DESIGN_MINI_PROJECT',
    notes: `## The scenario

SafarBus (fictional) sells overnight bus seats between cities in Telangana, Andhra Pradesh and Karnataka. A new web app
replaces the old one before the Sankranti travel rush, and you are the only QA engineer on the team. The developers have
built it; you have one week to design the tests, find the defects that matter, and tell the team what is safe to
release. You will build a small version of the app yourself, plant the kind of bugs that really ship, and show that
your test design finds them.

## The user stories

    BK-101  Choose seats
      AC1  A passenger can hold 1 to 6 seats for 10 minutes.
      AC2  A held seat is shown as unavailable to other users.
      AC3  A hold that is not paid for is released after 10 minutes.
    BK-102  Fares and discounts
      AC1  Under 5 free; 5-11 half; 12-59 full; 60 and over 30% off. Ages 0-120 only.
      AC2  Promo code SAFAR100 takes Rs 100 off bookings of Rs 1,000 or more; the fare never goes below Rs 0.
      AC3  Women travellers get 5% off on women-reserved seats; it adds to the promo but not to the senior discount.
    BK-103  Pay and confirm
      AC1  Payment by UPI, card or net banking; at most 3 attempts per booking.
      AC2  A confirmed booking gets a ticket with a PNR and an SMS.
    BK-104  Cancel
      AC1  24 hours or more before departure: 90% refund; 2 to 24 hours: 50%; less than 2 hours: none.
      AC2  After departure, cancellation is refused.
      AC3  If SafarBus cancels the trip, the passenger gets 100%.

## What you build

1. **The app under test.** A small Flask app (or plain Python functions with a thin Flask layer): fare(), apply_promo(),
   a Booking class with states (HELD, PENDING, CONFIRMED, PAYMENT_FAILED, EXPIRED, CANCELLED, TRIP_CANCELLED,
   COMPLETED), and refund(). Use synthetic data only.
2. **Planted bugs.** Ask a classmate to plant at least eight bugs from a list of kinds (off-by-one, a wrong operator in a
   rule, a missing guard, an extra transition, a wrong action, a combination interaction, a text inconsistency between
   ticket and SMS, an input-handling bug) without telling you where. If you work alone, plant them in a separate branch
   a week before you test, and keep the list sealed.

## What you deliver

1. **Gaps and questions.** For each story, the gaps you found and the questions you would ask, with the answers you
   decided (as the product owner would) recorded as new criteria. At least eight questions.
2. **Partition and boundary tables** for age, seats, booking amount (promo), and minutes before departure, with the test
   values chosen and why.
3. **A decision table** for fares and discounts (BK-102 AC1 to AC3): conditions, actions, the full table, the reduction
   with a justification for each don't-care, and boundary values for each condition.
4. **A state model** for bookings: diagram, the full state table with every invalid cell, guards (attempts, hold expiry),
   actions (refund amounts, SMS), and the 1-switch sequences you chose to test and why.
5. **A pairwise configuration plan** for browser, device, payment method, language (English, Telugu, Kannada, Hindi)
   and logged-in/guest, with constraints, generated by your own or a library generator and verified by a coverage
   script whose output you include.
6. **Automated tests** in pytest, parametrized from the tables and the model, with ids named after rules and
   transitions, and an ac marker on every test; the traceability section from this topic printed at the end of the run.
7. **Two exploratory sessions** of 60 minutes with charters, session sheets, time split and PROOF debriefs.
8. **A defect report** for every bug found: title, steps, expected and actual, severity, evidence, and which technique
   found it. Then open the sealed list and write the honest comparison: which planted bugs you found, which you missed,
   and which technique should have caught each miss.

## Milestones

- **Day 1 — stories.** Read the stories, write the gaps and questions, settle the answers, build the app.
- **Day 2 — tables.** Partitions, boundaries and the decision table; tests written and run.
- **Day 3 — states.** The state model and table; valid, invalid, guard and sequence tests.
- **Day 4 — combinations and exploration.** The pairwise plan with its coverage check; two exploratory sessions.
- **Day 5 — report.** Defects, the traceability output, the planted-bug comparison, and a one-page release
  recommendation: what is safe, what is not, and what you did not test.

## How it will be judged

A reviewer will run your suite, read the traceability output, and ask "why this value?" about any test. Fewer tests that
each have a reason score higher than many that do not. The comparison with the sealed list matters as much as the bugs
found: a tester who can explain a miss precisely is a tester a team trusts. Do not use real passenger names, phone
numbers or payment details anywhere; generate synthetic ones.`,
    assignment: {
      title: 'SafarBus Booking: A Test Design Pack That Finds the Planted Bugs',
      description: 'For a small bus-booking app you build, with bugs planted by someone else, design tests from the user stories using partitions, boundaries, a decision table, a state model, a verified pairwise plan and exploratory sessions; automate them in pytest with traceability; and report what you found and what you missed.',
      instructions: `1. Build the SafarBus app under test (fare, promo, booking states, refund) with synthetic data; have at least eight bugs planted by someone else, or sealed in advance.
2. For each story, list gaps and questions (at least eight in total) and record the answers as new acceptance criteria.
3. Write partition and boundary tables for age, seats, booking amount and minutes before departure, with the chosen values and the reason for each.
4. Build the fares-and-discounts decision table, reduce it with a written justification for every don't-care, and pick boundary values for every condition.
5. Model the booking as states and transitions: diagram, full state table, guards, actions, and the chosen 1-switch sequences.
6. Generate a constrained pairwise configuration plan and include the output of a coverage script proving every valid pair is covered.
7. Automate the tests in pytest, parametrized from the tables and the model, with an ac marker on every test and the traceability section printed by conftest.py.
8. Run two 60-minute exploratory sessions with charters, session sheets, time split and PROOF debriefs.
9. Write a defect report for every bug, open the sealed list, compare found against planted, and explain which technique should have caught each miss; finish with a one-page release recommendation.`,
      rubric: [
        { criterion: 'Story analysis', description: 'Gaps and questions that change the tests (boundaries, states, negatives, partial actions, vague words), answered and recorded as criteria.', maxPoints: 15 },
        { criterion: 'Partitions, boundaries and decision table', description: 'Correct partitions from the specification, two-value boundaries at the right precision, a complete decision table with justified reductions and boundary values per condition.', maxPoints: 20 },
        { criterion: 'State model', description: 'A complete state table with every invalid cell tested for refusal and no change, guards tested on both sides, actions asserted, and sensible 1-switch sequences.', maxPoints: 20 },
        { criterion: 'Pairwise plan', description: 'Constraints in the model, must-have configurations seeded, and coverage proved by a script whose output is included.', maxPoints: 10 },
        { criterion: 'Automation and traceability', description: 'Readable parametrized pytest suite with rule and transition ids, literal expected values from the spec, and a traceability report with no uncovered criteria left unexplained.', maxPoints: 15 },
        { criterion: 'Exploration, defects and honesty', description: 'Two charted sessions with notes and debriefs; actionable defect reports with evidence; a precise found-versus-planted comparison and a clear release recommendation.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    mcqs: [
      mcq('BK-102 AC3 says the women\'s 5% adds to the promo but not to the senior discount. How should the fare tests treat it?', [
        ['As a decision table over age band, women\'s seat and promo', true],
        ['As one boundary test at age 60 for a woman passenger', false],
        ['As a state model of the seat from held to confirmed', false],
        ['As a pairwise set across browsers and payment methods', false],
      ], 'Which discounts combine is a rule over several conditions, so every combination it defines needs a column. One boundary test checks age only, the seat\'s life cycle is a different question, and browsers and payments do not affect the fare rule.'),
      mcq('After testing, the sealed list shows two planted bugs you did not find. What does the project expect you to write?', [
        ['For each miss, which technique should have caught it and why it did not', true],
        ['Nothing, since the release recommendation covers only the bugs found', false],
        ['A note that the planted bugs were unrealistic and should be removed', false],
      ], 'The honest found-versus-planted comparison is a graded deliverable: naming the design gap behind each miss is how test design improves. Omitting misses hides the main lesson, and blaming the bugs avoids it.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TEST_DESIGN_CHECKPOINT',
    notes: `Ten questions across the topic: partitions and boundaries, decision tables, state transitions, pairwise sets,
exploratory testing and tests from user stories. Answer without notes; the result shows which lesson to revisit.`,
    checkpoint: [
      mcq('A train booking allows 1 to 6 passengers per ticket. Which set is the two-value boundary test set?', [
        ['0, 1, 6 and 7 passengers', true],
        ['1, 3 and 6 passengers', false],
        ['1 and 6 passengers only', false],
        ['0, 3, 9 and 12 passengers', false],
      ], 'Each edge needs the value on it and its neighbour across the line: 0/1 and 6/7. 1, 3, 6 never tries a refused value, 1 and 6 alone cannot catch an off-by-one on the refusing side, and 0, 3, 9, 12 misses the edges 1, 6 and 7.'),
      mcq('Partition tests at ages 2, 8, 30 and 75 pass against a fare function with an age <= 5 bug. Why?', [
        ['No test value sits at the edge where the bug changes behaviour', true],
        ['Equivalence partitions only apply to string inputs, not numbers', false],
        ['The bug is in the senior band, which age 75 does not reach', false],
        ['The test asserted the seat count instead of the fare amount', false],
      ], 'age <= 5 differs from age < 5 only at 5, and none of the partition values is 5. Partitions apply to any input, the bug is in the free band, and the tests asserted the fare.'),
      mcq('A discount rule has three yes/no conditions. Why test the full table instead of each condition alone?', [
        ['Bugs live in combinations that single-condition tests never build', true],
        ['Testing conditions one at a time breaks pytest parametrize ids', false],
        ['The full table is always smaller than one test per condition', false],
        ['Each condition alone has already been covered by unit tests', false],
      ], 'The "or member" bug appeared only when member, small cart and coupon met in one test. Parametrize works either way, eight rules is more than five tests, and unit tests of single conditions are what missed it.'),
      mcq('A state table for an order has 49 cells and 10 valid transitions. What does each invalid-cell test assert?', [
        ['The event is refused and the order is left unchanged', true],
        ['The event moves the order to an error state for review', false],
        ['The event is logged, whatever happens to the order', false],
        ['The event raises any exception, of whichever type', false],
      ], 'An invalid event must be rejected without side effects. An error state is a valid transition the model does not have, logging alone checks nothing about the order, and accepting any exception lets an unrelated crash pass.'),
      mcq('All valid transitions of an order pass, but cancelling a paid order sets no refund. What was missing from those tests?', [
        ['Assertions on the transition\'s action, not only the new state', true],
        ['Tests of every invalid cell in the order\'s state table', false],
        ['A 3-way combinatorial set across the order\'s parameters', false],
        ['An exploratory session on the cancellation confirmation page', false],
      ], 'The state was correct; the refund action was wrong, and only an action assertion sees it. Invalid-cell tests check refusals, combinatorial sets address configurations, and exploration is not what was missing from the transition tests.'),
      mcq('Four browsers, four platforms, four payment methods, three languages and two user types make 384 combinations. What does a pairwise set promise?', [
        ['Every pair of values from any two parameters is tested together', true],
        ['Every 3-way interaction is covered with roughly twenty rows', false],
        ['Half of all 384 combinations are tested in a random order', false],
        ['Each parameter is tested on its own with all other values fixed', false],
      ], 'Pairwise covers all value pairs, which took 19 rows here. 3-way coverage needed 68 rows, random halves give no guarantee, and one-factor-at-a-time testing misses interactions.'),
      mcq('A pairwise tool was given a constraint and produced 16 rows. What should be checked before relying on it?', [
        ['That every valid pair appears, using an independent coverage script', true],
        ['That the 16 rows include each browser exactly four times', false],
        ['That no two rows share the same payment method value', false],
        ['That the rows are sorted by browser name before running', false],
      ], 'In the lesson, a constrained allpairspy set left 7 of 112 pairs uncovered. Balanced counts, unique payment values and ordering say nothing about pair coverage.'),
      mcq('Which is a well-formed exploratory charter?', [
        ['Explore seat holds with two users on two devices to discover conflicts', true],
        ['Check that seat 14 shows as grey when another user is holding it', false],
        ['Test the entire app thoroughly and record any issues found in it', false],
        ['Run all the seat-selection regression tests on the staging server', false],
      ], 'It has a target, resources and the information sought. Seat 14 grey is a scripted check with a fixed expectation, "the entire app" has no focus, and running regression tests is not exploration.'),
      mcq('An acceptance criterion says "24 hours or more before departure". Which question should the tester raise before writing tests?', [
        ['Scheduled departure or actual departure, when the bus is late?', true],
        ['Should 24 hours be tested by waiting a full day in staging?', false],
        ['Can the criterion be dropped, since refunds are rarely used?', false],
        ['Will developers write the refund tests instead of QA this time?', false],
      ], 'Which departure time counts moves the boundary, so the expected result depends on it. Time should be controlled rather than waited for, refunds involve money and are never "rarely used" risk, and who writes tests does not settle what the rule is.'),
      mcq('A traceability report shows a criterion as FAILING. What does the pytest-marker approach in the lesson tell you about it?', [
        ['At least one linked test failed in this run, and which one', true],
        ['No test in the suite is tagged with that acceptance criterion', false],
        ['The criterion was deleted from the stories file before the run', false],
        ['The linked tests were skipped because of a fixture failure', false],
      ], 'FAILING means a linked test failed, and the short summary names it (test_refund_90[24]). An untagged criterion shows NOT COVERED, an unknown criterion raises an error at collection, and skipped tests are not failures.'),
    ],
  },
];
