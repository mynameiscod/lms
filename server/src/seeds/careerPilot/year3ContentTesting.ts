/**
 * T3_TEST_DESIGN, T3_TEST_ISOLATION and T3_RELIABILITY — eleven units. Year 3. Finishes S06.
 *
 * ── THE PREMISE ───────────────────────────────────────────────────────────────────────────
 *
 * A student arriving in Year 3 can write a test. What they cannot do is decide WHICH tests to
 * write, and that is the entire difference between a suite that catches bugs and a suite that
 * produces a coverage number.
 *
 * So CHOOSING_THE_LEVEL leads, and it attributes to TESTING_FUNDAMENTALS — the levels of
 * testing are the fundamentals by any reading, and that override is also what stops
 * TESTING_FUNDAMENTALS being a skill the year can ask about and never measure.
 *
 * The line the whole topic holds: TEST BEHAVIOUR, NOT IMPLEMENTATION. Almost every bad test a
 * graduate writes is a test of how rather than what, and the symptom is a suite that goes red
 * on every refactor while catching nothing. The refactoring topic depends on this landing —
 * "the tests do not change during a refactor" is only possible if the tests were never coupled
 * to the structure in the first place.
 *
 * FLAKY_TESTS is given a whole unit because the usual response to a flaky test is to rerun it,
 * and that response is what destroys a suite. A test that fails one time in twenty is not
 * noise; it is a bug in the test or the code, and it is usually the code.
 *
 * T3_RELIABILITY is the other side of the same coin: tests tell you it worked before you
 * shipped, and logs and signals tell you whether it is working now. The checkpoint measures
 * both.
 *
 * Attribution: T3_TEST_DESIGN defaults to AUTOMATED_TESTING with CHOOSING_THE_LEVEL overridden
 * to TESTING_FUNDAMENTALS. T3_TEST_ISOLATION is single-skill and derived. T3_RELIABILITY
 * defaults to LOGGING_DIAGNOSTICS with KNOWING_IT_IS_UNWELL on MONITORING_OBSERVABILITY.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TESTING_BUNDLES: PilotBundle[] = [
  /* ══ T3_TEST_DESIGN ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_TEST_DESIGN_CHOOSING_THE_LEVEL',
    notes: `Three levels, and they catch different failures at different prices. Choosing
deliberately is the skill; most suites are shaped by accident.

## What each one is for

**Unit.** One function or class, nothing else running. Milliseconds. Catches **logic errors** —
the discount is wrong, the boundary is off by one, the empty case crashes.

Cannot catch: the two units disagreeing about what a "customer" is.

**Integration.** Several real pieces together — your code and a real database, or two modules
that must agree. Seconds. Catches **wiring errors** — the query returns columns the mapper does
not expect, the transaction does not roll back, the config key is misspelled.

**This is the level most suites are thinnest at**, and most production bugs live at exactly this
seam, because the units were each tested and nobody tested the join between them.

**End to end.** The whole system through the interface a user touches. Tens of seconds, and
flaky in proportion. Catches **the things only reality catches** — the button is not wired up,
the redirect goes to the wrong page, the deploy did not include the new asset.

## Choosing by what could go wrong

Not "what should I test", but **"what could break here, and which level would catch it?"**

- A pricing rule with six branches → **unit**. Six unit tests in a millisecond each.
- A repository method → **integration**, against a real database. A mocked database proves your
  mock returns what you told it to.
- Checkout, end to end → **one** end-to-end test on the happy path. Not twelve.

## The shape that works

**Many unit, some integration, few end to end.** Not because of a diagram, but because of cost:
the cheap fast ones should be numerous, the slow fragile ones should be few and should cover
what only they can.

**The failure mode is the inversion** — a suite of mostly end-to-end tests. It looks thorough
and it takes forty minutes, fails randomly twice a week, and when something breaks it tells you
"checkout failed" without saying where. People stop trusting it, then stop running it.

## Coverage, briefly

**Coverage tells you what was executed, not what was verified.** A test that calls a function
and asserts nothing gives full coverage of it.

It is useful in one direction only: **0% coverage means definitely untested.** 90% does not mean
tested. Use it to find what nobody looked at, never as a target — the moment it becomes a
target, people write tests that execute code without checking it, and now you have a number
that is actively lying.

## What not to test

- **The framework.** It has its own tests.
- **Trivial getters and setters.** Nothing can be wrong.
- **Third-party libraries**, except the specific way *you* use them.

Every test is code you maintain. A test with no failure mode it could catch is pure cost.`,
    mcqs: [
      mcq('The level most suites are thinnest at is:',
        [['Integration, which is where most production bugs live', true],
          ['Unit, because they are tedious to write', false],
          ['End to end, because they are slow', false],
          ['All three, in roughly equal measure', false]],
        'Each unit was tested and nobody tested the join between them.'),
      mcq('Testing a repository method against a mocked database:',
        [['Proves the mock returns what you told it to', true],
          ['Is faster and equally reliable', false],
          ['Verifies the query is syntactically valid', false],
          ['Is the correct level for that code', false]],
        'That method exists to talk to a database, so the database has to be real.'),
      mcq('A suite of mostly end-to-end tests fails because:',
        [['It is slow and flaky, so people stop trusting it', true],
          ['It cannot cover the logic branches', false],
          ['It requires too much test data to maintain', false],
          ['It duplicates what unit tests already check', false]],
        'Forty minutes, random failures twice a week, and "checkout failed" as the diagnosis.'),
      mcq('Coverage is useful in one direction only:',
        [['0% means definitely untested; 90% means nothing', true],
          ['High coverage indicates a reliable suite', false],
          ['It shows which tests are redundant', false],
          ['It measures how much logic is verified', false]],
        'A test that calls a function and asserts nothing covers it fully.'),
    ],
    checkpoint: [
      mcq('The question to ask when choosing a level is:',
        [['What could break here, and which level would catch it', true],
          ['What has not been tested yet', false],
          ['Which level is cheapest to write', false],
          ['Which parts of the coverage report are still uncovered', false]],
        'Not "what should I test" — the failure comes first.'),
      mcq('Making coverage a target causes:',
        [['Tests that execute code without checking it', true],
          ['Duplicate tests appearing at more than one level', false],
          ['Slower suites as coverage rises', false],
          ['Less integration testing overall', false]],
        'And then you have a number that is actively lying.'),
      mcq('A test with no failure mode it could catch is:',
        [['Pure cost, because it is code you maintain', true],
          ['Harmless, since it runs quickly', false],
          ['Useful as documentation of intent', false],
          ['Worth keeping for the coverage figure', false]],
        'Which is the argument against testing getters and the framework.'),
    ],
  },

  {
    unitCode: 'T3_TEST_DESIGN_BOUNDARIES_AND_NEGATIVES',
    notes: `Bugs cluster at boundaries and in the cases nobody wanted to think about. Tests
cluster in the middle of the valid range, where nothing was ever going to be wrong.

## Where bugs live

**At boundaries.** If a rule changes at 100, the interesting values are **99, 100 and 101** —
not 50. Off-by-one errors are invisible at 50 and certain at 100.

For every boundary, test **just below, exactly on, and just above.** Three tests, and they catch
essentially all of the off-by-one family.

**At the edges of a collection.** Zero, one, many. Each is a different code path in practice
even when it should not be:

- **Zero** — division by length, "the first item", a loop that never runs.
- **One** — "compare with the next one", which has no next one.
- **Many** — the only case most people test.

**At the edges of a type.** Empty string, whitespace only, a very long string, unicode, an
emoji. Zero, negative, the largest value. Null, where null is possible.

## Negative tests

A negative test asserts that **the wrong thing is refused, and refused properly**.

    def test_rejects_negative_quantity():
        with pytest.raises(ValidationError):
            place_order(quantity=-1)

Two things matter and one is usually missed.

**That it is rejected.** Obvious.

**That it is rejected the right way.** A negative quantity should raise a validation error, not
an \`IndexError\` from somewhere three layers down. \`pytest.raises(Exception)\` passes on a
typo, which makes it a test that cannot fail for the reason you care about.

## The five categories

Work through them for anything non-trivial:

1. **Boundaries** — just below, on, just above.
2. **Empty and absent** — empty collection, empty string, missing field, null.
3. **Invalid** — wrong type, out of range, malformed.
4. **Duplicate and repeated** — the same request twice, duplicate entries, a retry.
5. **Adversarial** — an input chosen to break it. A hundred-thousand-character name, a negative
   price, a date in 1899.

Most test suites cover the valid middle of category 1 and nothing else.

## The test worth writing after a bug

**Every bug that reaches production means a missing test, and you know exactly which one.**

Write it before the fix. Watch it fail. Then fix, and watch it pass. Both steps matter: a test
you never saw fail may not be testing anything, and this is the single highest-value test you
will ever write because reality has already proved the case is reachable.

## What a test name should say

    def test_order_total_applies_discount_above_five_items():

Not \`test_order_1\`. **When it fails in CI at 2am, the name is all you have.** A good name says
what broke without anybody opening the file, and it costs nothing to write.`,
    mcqs: [
      mcq('For a rule that changes at 100, the values worth testing are:',
        [['99, 100 and 101', true],
          ['0, 50 and 100', false],
          ['100 and 200', false],
          ['1, 100 and the maximum', false]],
        'Off-by-one is invisible at 50 and certain at the boundary.'),
      mcq('`pytest.raises(Exception)` is a weak assertion because:',
        [['It passes on a typo three layers down', true],
          ['It catches errors the code should handle', false],
          ['It does not check the error message', false],
          ['It hides which line raised the error', false]],
        'A test that cannot fail for the reason you care about.'),
      mcq('The highest-value test you can write is:',
        [['The one for a bug that just reached production', true],
          ['The one covering the most branches', false],
          ['The one for the most complex function', false],
          ['The one that runs fastest in CI', false]],
        'Reality has already proved the case is reachable.'),
      mcq('Writing the test before the fix matters because:',
        [['A test you never saw fail may test nothing', true],
          ['It documents the bug for the team', false],
          ['It is faster than testing afterwards', false],
          ['It proves the fix was necessary', false]],
        'Watch it fail, then fix, then watch it pass. Both steps.'),
    ],
    checkpoint: [
      mcq('Why is a collection of one a distinct case from many?',
        [['"Compare with the next one" has no next one', true],
          ['One item skips the loop entirely', false],
          ['Single items are often special-cased', false],
          ['It is the smallest non-empty input', false]],
        'Zero, one and many are three different code paths in practice.'),
      mcq('`test_order_1` is a poor name because:',
        [['At 2am in CI the name is all you have', true],
          ['It does not follow the naming convention', false],
          ['It cannot be found by searching', false],
          ['It gives no order to the test file', false]],
        'A good name says what broke without anybody opening the file.'),
      mcq('Which category do most suites cover, to the exclusion of the rest?',
        [['The valid middle of the range', true],
          ['The boundaries of each rule', false],
          ['The invalid inputs', false],
          ['The duplicate and retry cases', false]],
        'Which is where nothing was ever going to be wrong.'),
    ],
  },

  {
    unitCode: 'T3_TEST_DESIGN_ONE_REASON_TO_FAIL',
    notes: `A test asserting five things tells you almost nothing when it goes red. You know
something in that area broke. You do not know what, and you have to read the test to find out.

**Each test should fail for exactly one nameable reason.**

## The test that tells you nothing

    def test_order():
        order = create_order(items, user)
        assert order.total == 100
        assert order.status == 'pending'
        assert order.user_id == user.id
        assert len(order.items) == 2
        assert order.created_at is not None
        assert email_was_sent(user.email)

It fails. What broke? The total, the status, the mapping, the email? **And worse: the first
assertion to fail stops the rest** — so a broken total hides a broken email, and you fix the
total, rerun, and find a second failure you could have known about ten minutes ago.

## The same coverage, usefully

    def test_order_total_sums_item_prices(): ...
    def test_new_order_starts_pending(): ...
    def test_order_is_linked_to_its_user(): ...
    def test_order_confirmation_email_is_sent(): ...

Now the failure **names itself in the CI output**, all independent failures surface in one run,
and each test documents one behaviour.

## Arrange, act, assert — one act

The structure that produces this almost automatically:

    def test_discount_applies_above_five_items():
        cart = Cart([item(price=10)] * 6)      # arrange
        total = cart.total()                   # act
        assert total == 54                     # assert

**One act.** If your test acts twice, it is two tests. That is the rule, and it is more reliable
than counting assertions.

## When several assertions are fine

The rule is about **reasons**, not about a count:

    assert response.status_code == 200
    assert response.json()['id'] == order.id

Two assertions, one reason: *the endpoint returned this order correctly.* That is one test.

The distinction: **could these fail independently, for different underlying causes?** If yes,
split. If they are two facets of one outcome, keep them together.

## Independence

Tests must not depend on each other or on order.

    # test_a creates the user
    # test_b assumes it exists          <-- fails alone, fails when reordered

**Symptom:** passes in the suite, fails alone. Or passes locally, fails in CI where the runner
parallelises.

**Fix:** each test sets up what it needs and cleans up after. If setup is slow enough that this
hurts, that is a signal about the design of the code, not a licence to share state — and the
usual answer is that the thing being tested should not need a database.

**Run your suite in random order at least once.** Most runners support it, and it finds every
one of these in a single run.`,
    mcqs: [
      mcq('The rule is one reason to fail, not one assertion, because:',
        [['Two facets of a single outcome are one reason', true],
          ['Assertions are hard to count in some frameworks', false],
          ['Multiple assertions read more naturally', false],
          ['Some outcomes need several checks to verify', false]],
        'Could they fail independently for different causes? If yes, split.'),
      mcq('The first failing assertion stopping the rest is a problem because:',
        [['A second failure stays hidden until you rerun', true],
          ['The test takes longer to diagnose', false],
          ['The remaining assertions are never validated', false],
          ['The error message becomes less specific', false]],
        'You fix the total, rerun, and learn about the email ten minutes late.'),
      mcq('The most reliable rule for splitting a test is:',
        [['If it acts twice, it is two tests', true],
          ['If it has more than three assertions', false],
          ['If the arrange section is long', false],
          ['If it touches more than one module', false]],
        'More reliable than counting assertions, and easy to apply.'),
      mcq('"Passes in the suite, fails alone" indicates:',
        [['A dependency on another test', true],
          ['A slow setup being shared', false],
          ['A race condition in the code', false],
          ['A missing fixture in the runner', false]],
        'Or it passes locally and fails in CI, where the runner parallelises.'),
    ],
    checkpoint: [
      mcq('Running the suite in random order:',
        [['Finds every order dependency in one run', true],
          ['Distributes slow tests more evenly', false],
          ['Reveals which tests are redundant', false],
          ['Improves the reliability of parallel runs', false]],
        'Most runners support it, and it is worth doing at least once.'),
      mcq('If per-test setup is painfully slow, the signal is:',
        [['The code under test should not need that setup', true],
          ['The tests should share a fixture', false],
          ['The suite should run in parallel', false],
          ['The setup should be cached between runs', false]],
        'Not a licence to share state — a fact about the design.'),
      mcq('A well-split suite mainly improves:',
        [['What the CI output tells you without opening a file', true],
          ['The total time the whole suite takes to finish', false],
          ['The coverage the suite achieves', false],
          ['How many bugs the suite catches', false]],
        'The failure names itself, and all independent failures surface at once.'),
    ],
  },

  {
    unitCode: 'T3_TEST_DESIGN_DEBUGGING',
    notes: `Five failures of a test suite. Four of them are tests that pass and should not.

## 1. The test that cannot fail

    def test_calculate():
        result = calculate(10, 5)
        assert result is not None

Passes whatever \`calculate\` returns, short of raising. **Detection:** break the code
deliberately and see whether the test notices. If a suite stays green while you return a
constant from the function, that suite is decorative.

**This is the single best diagnostic in this unit** and almost nobody runs it.

## 2. The test of the mock

    repo = Mock()
    repo.find.return_value = User(id=1)
    service = Service(repo)
    assert service.get(1).id == 1

You configured a mock to return a user, then asserted that the user came back. **Cause:** the
mock replaced the only thing that could have been wrong. **Fix:** mock the boundary, not the
logic — the next unit's subject.

## 3. The test coupled to implementation

    service.process(order)
    repo.save.assert_called_once_with(order)
    mailer.send.assert_called_once()
    logger.info.assert_called()

**Symptom:** goes red on every refactor while catching no bugs. **Cause:** it asserts *how* the
work was done, not *what* resulted. Adding a log line breaks it. **Fix:** assert the outcome —
the order is saved and retrievable — rather than the call sequence.

**This is what "the tests do not change during a refactor" requires.** A suite full of these
makes the refactoring topic impossible to practise.

## 4. Passes locally, fails in CI

Four usual causes, in rough order of likelihood: **order** (CI parallelises or randomises),
**time zone** (CI runs in UTC), **speed** (CI is slower, so a race appears), and **state** (your
machine has data from an earlier run that you have forgotten about).

**The diagnostic:** run it alone, run the suite in reverse order, run it with the CI's time
zone. One of the three usually reproduces it.

## 5. The test that tests the framework

    def test_user_model_saves():
        user = User(name='x'); user.save()
        assert User.objects.get(name='x')

You have tested your ORM. It has its own tests. **Unless** you are testing something you added
— a custom validator, a computed column, a constraint — in which case test that specifically,
and not the save.

## The meta-test

**Mutation testing** is the systematic version of number 1: change a \`>\` to \`>=\`, flip a
boolean, return a constant, and see whether any test fails. Tools exist, and even doing it by
hand on your three most important functions is illuminating.

**A suite that survives mutation is not testing.** It is executing.`,
    mcqs: [
      mcq('The best single diagnostic for a suspect suite is:',
        [['Break the code deliberately and see if it notices', true],
          ['Measure the coverage of the test files', false],
          ['Check how long the suite takes to run', false],
          ['Count the assertions per test', false]],
        'If the suite stays green while a function returns a constant, it is decorative.'),
      mcq('Asserting `repo.save.assert_called_once_with(order)`:',
        [['Tests how the work was done, not what resulted', true],
          ['Verifies the repository was wired correctly', false],
          ['Is the right level for a service test', false],
          ['Catches regressions in the call ordering', false]],
        'Adding a log line breaks it, which is why refactoring becomes impossible.'),
      mcq('Which is NOT among the usual causes of "passes locally, fails in CI"?',
        [['A different version of the language runtime', true],
          ['Test order, where CI randomises', false],
          ['Time zone, where CI runs in UTC', false],
          ['Leftover local state from an earlier run', false]],
        'Possible, but the four named ones account for nearly all of it.'),
      mcq('Mutation testing checks:',
        [['Whether any test notices a deliberate change', true],
          ['Whether tests pass in a different order', false],
          ['Which lines the suite executes', false],
          ['Whether the code handles invalid input', false]],
        'A suite that survives mutation is executing, not testing.'),
    ],
    checkpoint: [
      mcq('Testing that an ORM saves a record is worthwhile only when:',
        [['You added a validator, constraint or computed value', true],
          ['The model has more than a few fields', false],
          ['The table has foreign key relationships to other models', false],
          ['The save happens inside a transaction', false]],
        'And then test that specifically, rather than the save.'),
      mcq('`assert result is not None` fails as a test because:',
        [['It passes for almost any return value', true],
          ['It does not check the type returned', false],
          ['None is rarely the failure mode', false],
          ['It gives no message when it fails', false]],
        'Short of raising, the function can do anything and stay green.'),
      mcq('A test suite coupled to implementation makes refactoring:',
        [['Impossible to practise as defined', true],
          ['Slower but still workable', false],
          ['Safer, because changes are noticed', false],
          ['Dependent on rewriting the tests first', false]],
        '"The tests do not change during a refactor" requires tests of behaviour.'),
    ],
  },

  {
    unitCode: 'T3_TEST_DESIGN_PRACTICE',
    notes: `Two exercises. Both are the same shape as the real skill: you are given the
behaviour and you must work out **which cases matter**, rather than being told.

The hidden cases are the boundaries and the negatives. If your implementation handles the
middle of the range and nothing else, you will see exactly which category you skipped.`,
    coding: [
      {
        title: 'Implement to the boundaries',
        description: `A delivery charge, specified precisely. Read \`subtotal items\` — a number
and an integer — and print the charge as an integer.

The rules, in order:

- **0 or fewer items**, or a subtotal of 0 or less: the charge is \`0\`.
- Subtotal of **500 or more**: free, so \`0\`.
- Otherwise the charge is **40**, plus **15** for each item **beyond the fifth**.
- The charge never exceeds **150**.

Every one of those numbers is a boundary. The hidden cases sit on them.`,
        starter: `import sys

parts = sys.stdin.readline().split()
subtotal, items = float(parts[0]), int(parts[1])

# Four boundaries in the spec. Just below, on, just above — for each of them.
`,
        language: 'python',
        tests: [
          { input: '100 3\n', expectedOutput: '40' },
          { input: '500 3\n', expectedOutput: '0' },
          { input: '499 3\n', expectedOutput: '40' },
          { input: '100 6\n', expectedOutput: '55' },
          { input: '100 0\n', expectedOutput: '0' },
          { input: '0 3\n', expectedOutput: '0', isHidden: true },
          { input: '100 5\n', expectedOutput: '40', isHidden: true },
          { input: '100 20\n', expectedOutput: '150', isHidden: true },
          { input: '-5 3\n', expectedOutput: '0', isHidden: true },
          { input: '100 -2\n', expectedOutput: '0', isHidden: true },
        ],
      },
      {
        title: 'Reject it properly',
        description: `Validate a username and print either \`ok\` or a specific reason.

Read one line, which may be empty or whitespace. Rules, checked **in this order**, printing the
first that fails:

- Empty or whitespace only → \`empty\`
- Shorter than 3 characters → \`short\`
- Longer than 20 → \`long\`
- Contains anything other than letters, digits and underscore → \`chars\`
- Starts with a digit → \`digit_start\`
- Otherwise → \`ok\`

The order matters and the hidden cases test it. A validator that returns "invalid" for
everything is the \`pytest.raises(Exception)\` of input handling.`,
        starter: `import sys

line = sys.stdin.readline().rstrip(chr(10))

# The order of the checks is part of the specification, not an implementation detail.
`,
        language: 'python',
        tests: [
          { input: 'asha_99\n', expectedOutput: 'ok' },
          { input: '\n', expectedOutput: 'empty' },
          { input: 'ab\n', expectedOutput: 'short' },
          { input: '9lives\n', expectedOutput: 'digit_start' },
          { input: 'has space\n', expectedOutput: 'chars' },
          { input: '   \n', expectedOutput: 'empty', isHidden: true },
          { input: 'abc\n', expectedOutput: 'ok', isHidden: true },
          { input: '123456789012345678901\n', expectedOutput: 'long', isHidden: true },
          { input: '12\n', expectedOutput: 'short', isHidden: true },
          { input: '1!\n', expectedOutput: 'short', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Test Design Practice',
      description: 'Implement two specifications to their boundaries, then write the tests you would have wanted.',
      instructions: `Complete both exercises. Then, for **each**:

1. List every boundary in the specification. For the first exercise there are four; find them
   all.
2. Write the test list you would have written **before** implementing — one line per test, with
   the name you would give it. Use names that would tell you what broke at 2am.
3. Group your tests by the five categories: boundaries, empty and absent, invalid, duplicate,
   adversarial. Say which category has the fewest and whether that is right for this problem.

Then:

4. For the second exercise: the input \`1!\` is both too short and contains an invalid
   character. Say which answer the specification requires and why the order of checks is part
   of the specification rather than an implementation detail.
5. For the second: name one adversarial input not in the tests, and say what your code does
   with it.
6. Take your first exercise solution and deliberately break it — change one comparison from
   \`>=\` to \`>\`. Which of your tests fails? If none does, write the one that would, and say
   which category it belongs to.`,
      rubric: [
        { criterion: 'Delivery charge, to the boundaries', description: 'All ten cases, including zero, negative and the cap.', maxPoints: 20 },
        { criterion: 'Boundaries enumerated', description: 'All four found and stated.', maxPoints: 15 },
        { criterion: 'Validator, in order', description: 'Correct, including the ordering case and whitespace-only.', maxPoints: 20 },
        { criterion: 'A test list with real names', description: 'Names that say what broke, one per behaviour.', maxPoints: 15 },
        { criterion: 'Grouped by category', description: 'Five categories, with an honest note on the thinnest.', maxPoints: 15 },
        { criterion: 'The mutation', description: 'Breaks it deliberately and reports which test caught it, or writes one.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

parts = sys.stdin.readline().split()
subtotal, items = float(parts[0]), int(parts[1])
`,
        tests: [
          { input: '100 3\n', expectedOutput: '40' },
          { input: '500 3\n', expectedOutput: '0' },
          { input: '499 3\n', expectedOutput: '40' },
          { input: '100 6\n', expectedOutput: '55' },
          { input: '100 5\n', expectedOutput: '40', isHidden: true },
          { input: '100 20\n', expectedOutput: '150', isHidden: true },
          { input: '-5 3\n', expectedOutput: '0', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 20,
      },
    },
    checkpoint: [
      mcq('An input that violates two rules at once shows that:',
        [['The order of the checks is part of the specification', true],
          ['The validation should report both failures', false],
          ['The rules overlap and should be merged', false],
          ['The specification is ambiguous and needs revising', false]],
        'Which answer is required is a decision, and it has to be stated.'),
      mcq('Changing `>=` to `>` and seeing no test fail means:',
        [['The boundary case was never tested', true],
          ['The comparison was not load-bearing', false],
          ['The tests are testing the wrong function', false],
          ['The specification did not require that boundary', false]],
        'Which is the mutation test applied by hand, and it is worth doing.'),
      mcq('A validator returning "invalid" for everything is:',
        [['The `raises(Exception)` of input handling', true],
          ['Acceptable when the caller only checks validity', false],
          ['Simpler and therefore less likely to be wrong', false],
          ['Correct as long as valid inputs pass', false]],
        'It cannot fail for the reason you care about.'),
    ],
  },

  {
    unitCode: 'T3_TEST_DESIGN_MINI_PROJECT',
    notes: `Take a real codebase with a weak test suite and make the suite worth having — with
mutation as the measure rather than coverage.

The brief uses **mutation rather than coverage deliberately**. Coverage can be raised by writing
tests that assert nothing, and a student optimising for it learns the wrong lesson very
efficiently. Mutation cannot be gamed that way: either a test notices the change or it does not.

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — A Suite Worth Having',
      description: 'Improve a real test suite, measured by mutation rather than coverage.',
      instructions: `**Choose** a real project with tests that are inadequate. Your own is ideal.
It needs at least one module with real logic — branches, boundaries, validation.

**Part one — what is there**

1. Run the suite. How long does it take, and how many tests?
2. Measure coverage on your chosen module. Report it.
3. **Now the real measurement.** Pick five mutations in that module and apply them one at a
   time: change a comparison operator, flip a boolean, remove a condition, return a constant,
   change a boundary value. For each, run the suite and record whether anything failed.
4. Report your **mutation score**: how many of the five were caught. Compare it with the
   coverage number and comment on the gap.

**Part two — classify what exists**

5. Categorise the existing tests by level: unit, integration, end to end. Give the counts.
6. Find one test that cannot fail, or one that tests a mock, or one coupled to implementation.
   Quote it and say which it is. If you genuinely cannot find one, say so — and show the
   mutation result that supports the claim.

**Part three — make it better**

7. Write tests for the mutations that survived. Each must fail before the fix and pass after —
   show both.
8. Work through the five categories on one function: boundaries, empty and absent, invalid,
   duplicate, adversarial. Write what is missing.
9. Re-run your five mutations. Report the new score.

**Part four — the honest part**

10. Did coverage go up? Did the mutation score go up? **If they moved differently, say what that
    tells you** — this is the question the whole project is for.
11. Find one test you would **delete**. Say why: it cannot fail, it tests the framework, or it
    duplicates another. Deleting a test is a legitimate improvement.
12. Run the suite in random order. Did anything fail? If so, which test depended on which.
13. How much slower is the suite now? Say whether that is acceptable and against what budget.

**Submit** the before and after mutation scores, the new tests with their failing runs, the
deleted test with its justification, and answers to 10–13.`,
      rubric: [
        { criterion: 'Mutation measured, not assumed', description: 'Five real mutations applied one at a time, with results recorded.', maxPoints: 25 },
        { criterion: 'A bad test found and named', description: 'Quoted, classified, or the absence supported by the mutation result.', maxPoints: 15 },
        { criterion: 'Tests that failed first', description: 'Each new test shown failing before and passing after.', maxPoints: 20 },
        { criterion: 'The five categories', description: 'Worked through on one function, with what was missing written.', maxPoints: 15 },
        { criterion: 'Coverage against mutation', description: 'Both reported, and the gap between them interpreted.', maxPoints: 15 },
        { criterion: 'A deletion, justified', description: 'One test removed with a real reason.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The brief measures mutation rather than coverage because:',
        [['Coverage can be raised by tests that assert nothing', true],
          ['Mutation tools are more widely available', false],
          ['Coverage is slower to measure accurately', false],
          ['Mutation testing covers the integration level as well', false]],
        'A student optimising for coverage learns the wrong lesson very efficiently.'),
      mcq('Coverage rising while the mutation score does not means:',
        [['More code is executed and no more is verified', true],
          ['The mutations chosen were unrealistic', false],
          ['The new tests target untested modules', false],
          ['The suite has become too slow to be useful', false]],
        'Which is the question the whole project exists to produce.'),
      mcq('Deleting a test can be an improvement when:',
        [['It cannot fail, or it tests the framework', true],
          ['It duplicates coverage of a fast path', false],
          ['It takes a disproportionate time to run', false],
          ['It has not failed in over a year', false]],
        'Every test is code you maintain; one with no failure mode is pure cost.'),
    ],
  },

  /* ══ T3_TEST_ISOLATION ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_TEST_ISOLATION_MOCKING_ENOUGH',
    notes: `**Mock the boundary, not the logic.** Everything else in this unit is a consequence
of that sentence, and getting it wrong produces tests that pass while the system is broken.

## What a mock is for

Replacing something **outside your control** so a test can run fast and deterministically:

- A payment provider. You are not charging a real card in CI.
- An email service. You are not sending mail.
- The current time, where behaviour depends on it.
- A random number generator.
- A third-party API that is slow, rate-limited or down.

**What they have in common:** they are all at the edge of your system, they are all
non-deterministic or expensive, and **none of them is the thing you are testing.**

## What not to mock

**The thing under test.** Obvious, and it still happens by accident when you mock a collaborator
that contains the logic.

**Your own domain objects.** \`Mock(spec=Order)\` instead of a real \`Order\` gives you a test
that passes when \`Order\` changes and breaks. Domain objects are cheap to construct; construct
them.

**The database, usually.** This is the contentious one and the answer is clearer than the
argument suggests: a mocked database returns what you told it to, so it verifies your
assumptions rather than the database's behaviour. Use a real one — a container, or an in-memory
instance — for anything whose job is to talk to a database.

## The test that proves the mock works

    repo = Mock()
    repo.get_user.return_value = User(name='Asha')
    assert UserService(repo).get_name(1) == 'Asha'

Read it again. You told the mock to return a user named Asha, and asserted that Asha came back.
**If \`get_name\` were \`return "Asha"\`, this test would pass.**

**The question to ask of any mock-heavy test:** if I replaced the code under test with something
trivially wrong, would this test notice? If not, the mock has replaced the thing being verified.

## How much is too much

**Roughly: if you need more than two or three mocks to test one thing, the design is telling you
something.** That many collaborators usually means the class is doing too much, and the mocks
are a symptom rather than the problem.

**The cheapest alternative is often not a mock at all.** A fake — a real, simple implementation,
like an in-memory repository with a dictionary in it — behaves like the real thing, catches
misuse a mock would accept, and does not need reconfiguring for every test.

## The trap that bites in production

**A mock does not have to behave like the real thing.** You configure it to return a list; the
real API returns a paginated envelope. Your tests pass forever and the integration was never
right.

**This is the single biggest risk with mocks** and there is only one answer: **at least one test
against the real thing.** One integration test that actually calls the real interface catches
the whole class. Everything else can be mocked once you have that.

## Time and randomness

Mock these rather than working around them:

    with freeze_time('2024-03-01'):
        assert subscription.is_expired()

A test that sleeps, or that computes the expected value the same way the code does, is not
testing anything — it is running the implementation twice and comparing it with itself.`,
    mcqs: [
      mcq('The right things to mock are:',
        [['Things outside your control, at the edge of the system', true],
          ['Anything slow enough to affect the suite', false],
          ['Collaborators the class depends on', false],
          ['Anything that touches the network or disk', false]],
        'Non-deterministic or expensive, and none of them the thing you are testing.'),
      mcq('Mocking your own domain objects is a mistake because:',
        [['The test passes when the real object changes and breaks', true],
          ['Constructing them is slow in most suites', false],
          ['Mocks cannot express their invariants', false],
          ['It makes the test harder to read', false]],
        'They are cheap to construct, so construct them.'),
      mcq('The question to ask of a mock-heavy test is:',
        [['Would it notice if the code were trivially wrong', true],
          ['Are all the collaborators mocked consistently', false],
          ['Does it run faster than the real version', false],
          ['Are the mock return values realistic', false]],
        'If not, the mock has replaced the thing being verified.'),
      mcq('The biggest production risk with mocks is:',
        [['The mock behaves unlike the real thing, forever', true],
          ['The mocks drift out of date with the code', false],
          ['Too many mocks make tests unreadable', false],
          ['Mocked errors are not realistic', false]],
        'One real integration test catches the whole class.'),
    ],
    checkpoint: [
      mcq('Needing four mocks to test one class suggests:',
        [['The class is doing too much', true],
          ['A fake would be simpler than mocks', false],
          ['The test should be an integration test', false],
          ['The collaborators need a shared interface', false]],
        'The mocks are a symptom rather than the problem.'),
      mcq('A fake differs from a mock in that it:',
        [['Is a real simple implementation that catches misuse', true],
          ['Records every call that was made against it', false],
          ['Is configured once per test suite', false],
          ['Raises when used unexpectedly', false]],
        'An in-memory repository with a dictionary in it, behaving like the real thing.'),
      mcq('A test that computes the expected value the same way the code does:',
        [['Runs the implementation twice and compares it with itself', true],
          ['Is acceptable whenever the calculation is a simple one', false],
          ['Verifies the calculation is deterministic', false],
          ['Catches changes to the calculation logic', false]],
        'Which is why time and randomness are mocked rather than recomputed.'),
    ],
  },

  {
    unitCode: 'T3_TEST_ISOLATION_FLAKY_TESTS',
    notes: `A test that fails one time in twenty is **worse than no test**, and the reasoning is
worth following because the conclusion is counter-intuitive.

No test: you know you are not covered.

Flaky test: the suite goes red, somebody reruns it, it goes green, everyone moves on. **The team
learns that red does not mean broken.** Then a real failure appears, somebody reruns it, and it
goes red again — and they rerun it a third time. The flaky test did not just fail to protect
you; it destroyed the signal from every other test in the suite.

**"Just rerun it" is the response that causes the damage.**

## The four causes

### Time

A test that passes except at midnight, or on the 31st, or in February, or when the run crosses
a second boundary.

    assert order.created_at.date() == datetime.now().date()   # fails at midnight

**Also:** anything with a \`sleep\`. If the test sleeps 100ms for something that usually takes
50, it will fail on a loaded CI machine. **Fix:** freeze time; wait for a condition rather than
a duration.

### Order and shared state

Test A leaves a row behind; test B counts rows. Passes in the order you wrote them, fails when
the runner parallelises or randomises.

**Fix:** each test creates what it needs and cleans up, ideally in a transaction that rolls
back. **Diagnostic:** run the suite in random order; run the failing test alone.

### Concurrency

Two tests hitting the same record, or the code under test having a genuine race that surfaces
one time in fifty.

**This is the one to take most seriously**, because a flaky test caused by a real race is your
test suite doing its job — finding a bug that will otherwise appear in production at a much
worse moment.

### The outside world

A test hitting a real API, a real DNS lookup, a real clock, a real filesystem with real
permissions. **Fix:** mock the boundary. That is exactly what mocks are for.

## How to deal with one

**1. Do not rerun it and move on.** That is the decision that costs you the suite.

**2. Make it fail reliably.** Run it a hundred times in a loop. Run it alone. Run it with the
suite in reverse. Run it under load, with the machine busy. A flake you can reproduce is an
ordinary bug.

**3. Find out which of the four it is.** The four categories are nearly exhaustive, so this is
usually quick once you can reproduce it.

**4. Fix the cause.** Not "add a retry", not "increase the sleep". Both hide it and neither
removes it — and if the cause was a real race, both of them ship the race.

**5. If you truly cannot fix it now, quarantine it.** Mark it skipped, with a ticket and a date.
A skipped test with a ticket is honest; a flaky test in the suite is corrosive. **Deleting it is
also a legitimate choice** if the ticket will never be done — at least then nobody is being
misled.

## The one that is not a test bug

**Sometimes the flake is the code.** A race, a timeout that is marginal, a resource leak that
appears under repetition.

**Check this before assuming the test is at fault.** The instinct is to blame the test, and when
the test is right, that instinct puts a genuine production bug back into the codebase with a
retry wrapped around it.`,
    mcqs: [
      mcq('A flaky test is worse than no test because:',
        [['It teaches the team that red does not mean broken', true],
          ['It wastes time on every CI run', false],
          ['It gives false confidence about coverage', false],
          ['It hides which code is genuinely untested', false]],
        'It destroys the signal from every other test in the suite.'),
      mcq('A test that sleeps 100ms for a 50ms operation:',
        [['Will fail on a loaded CI machine', true],
          ['Is acceptable with a generous margin', false],
          ['Only fails if the operation changes', false],
          ['Slows the suite but stays reliable', false]],
        'Wait for a condition, not for a duration.'),
      mcq('Which cause of flakiness should be taken most seriously?',
        [['A genuine race in the code under test', true],
          ['A test that depends on the current date', false],
          ['A test that depends on execution order', false],
          ['A test that calls a real external API', false]],
        'The suite is doing its job: finding a bug that would otherwise surface in production.'),
      mcq('Adding a retry to a flaky test:',
        [['Hides it, and ships the race if that was the cause', true],
          ['Is acceptable for tests hitting the network', false],
          ['Reduces the noise while the cause is found', false],
          ['Is equivalent to quarantining it', false]],
        'Neither a retry nor a longer sleep removes anything.'),
    ],
    checkpoint: [
      mcq('The first step in dealing with a flake is:',
        [['Make it fail reliably', true],
          ['Identify which of the four causes it is', false],
          ['Quarantine it so the suite is green', false],
          ['Check whether the code has a race', false]],
        'A flake you can reproduce is an ordinary bug.'),
      mcq('A skipped test with a ticket is better than a flaky one because:',
        [['It is honest about what is not covered', true],
          ['It can be re-enabled more easily', false],
          ['It keeps the suite faster', false],
          ['It does not affect the coverage figure', false]],
        'And deleting it is legitimate too, if the ticket will never be done.'),
      mcq('Before assuming a flaky test is at fault, check:',
        [['Whether the flake is a real bug in the code', true],
          ['Whether the CI machine is under-resourced', false],
          ['Whether another test is interfering', false],
          ['Whether the framework has known issues', false]],
        'The instinct is to blame the test, and that instinct ships races with retries on them.'),
    ],
  },

  /* ══ T3_RELIABILITY ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_RELIABILITY_WHAT_TO_LOG',
    notes: `Tests tell you it worked before you shipped. Logs tell you what happened when it did
not. Both failure modes are common: **too little to diagnose anything, or so much that nobody
can find anything.**

## The test for a log line

> **Would this help me understand a failure at 3am, without the code in front of me?**

If yes, log it. If no, it is noise, and noise is not free — it costs storage, it costs money at
scale, and most of all it costs the ability to find the line that mattered.

## What is worth logging

**Things entering and leaving your system.** A request arrives, a call goes out to a vendor, a
job starts, a message is consumed. These are the boundaries, and boundaries are where things go
wrong.

**Decisions that are not obvious from the input.** "Chose the express route because the customer
is in zone 2." A reader cannot reconstruct that from the request.

**Every error, with its context.** This is the one that matters most, and the context is what
turns a trace into an answer.

**State changes that matter.** Order placed, payment captured, refund issued — the things
somebody will ask about later.

## What is not

- **Entering and leaving every function.** That is a profiler's job.
- **Loop iterations.** A million lines, no information.
- **Anything already visible from a metric.** "Request took 240ms" belongs in a histogram.
- **Secrets.** Passwords, tokens, card numbers, personal data. Once logged, they are in every
  backup, every downstream aggregator and every screen-share.

## Levels, used properly

- **ERROR** — something failed that should not have. Somebody may need to act. **If nobody would
  act on it, it is not an error**, and the commonest logging failure is an ERROR channel full of
  things nobody acts on.
- **WARN** — something unexpected, handled. A retry succeeded; a deprecated path was used.
- **INFO** — significant events in normal operation. Requests, state changes.
- **DEBUG** — detail for diagnosis. Off in production, on when hunting.

## Structure, not sentences

    log.info('Order created')                              # unsearchable

    log.info('order_created', order_id=o.id,
             customer_id=c.id, total=o.total,
             request_id=ctx.request_id)                    # queryable

The second can answer "every order over £500 that failed in the last hour". The first can only
be grepped, and only if you guess the wording.

## The two fields that matter most

**A request id, carried through everything.** Without it a hundred concurrent requests are
interleaved and you are reading a hundred stories at once. With it, one filter gives you one
story. **If you add one thing to a system's logging, add this.**

**The identifiers.** Which order, which user, which record. A log saying "failed to process
record" is nearly worthless; the same line with the id lets you load exactly that record and
reproduce it — which is the argument the cannot-reproduce unit made from the other side.

## An error log that is worth having

    log.error('payment_failed',
              order_id=order.id, customer_id=order.customer_id,
              provider='stripe', amount=order.total,
              error_code=e.code, error_message=str(e),
              attempt=attempt, request_id=ctx.request_id,
              exc_info=True)

Everything needed to understand it without opening the code, and \`exc_info\` for the stack
trace — which the reading-a-trace unit will then have something to work with.`,
    mcqs: [
      mcq('The test for whether to log something is:',
        [['Would it help diagnose a failure at 3am without the code', true],
          ['Is the event significant to the business', false],
          ['Could it be useful for debugging later', false],
          ['Does it mark a change in system state', false]],
        'If no, it is noise, and noise costs the ability to find the line that mattered.'),
      mcq('If nobody would act on a log line, it is:',
        [['Not an error, whatever level it uses', true],
          ['A warning rather than an error', false],
          ['Acceptable at error level for visibility', false],
          ['Better logged at info level', false]],
        'An ERROR channel full of things nobody acts on is the commonest logging failure.'),
      mcq('The single most valuable field to add to a system’s logs is:',
        [['A request id carried through everything', true],
          ['A precise timestamp with time zone', false],
          ['The name of the service emitting it', false],
          ['The severity level of the event', false]],
        'Without it a hundred concurrent requests are a hundred interleaved stories.'),
      mcq('Structured logging beats a sentence because:',
        [['It can answer queries you did not anticipate', true],
          ['It takes less storage per line', false],
          ['It is easier for humans to read', false],
          ['It enforces consistent wording', false]],
        '"Every order over £500 that failed in the last hour" is a query, not a grep.'),
    ],
    checkpoint: [
      mcq('"Request took 240ms" belongs in:',
        [['A metric, not a log line', true],
          ['A debug-level log entry', false],
          ['An info log with the request id', false],
          ['A warning if it exceeds a threshold', false]],
        'A histogram answers the latency question better than a million log lines.'),
      mcq('Logging a token or card number is serious because:',
        [['It then exists in every backup and aggregator', true],
          ['Log files are rarely access-controlled', false],
          ['It increases the storage cost materially', false],
          ['It may be visible in error messages', false]],
        'Once logged, it is also in every screen-share and every downstream system.'),
      mcq('"Failed to process record" without an id is nearly worthless because:',
        [['You cannot load that record and reproduce it', true],
          ['You cannot tell how many records failed', false],
          ['You cannot alert on the failure rate', false],
          ['You cannot tell which service emitted it', false]],
        'The same argument the cannot-reproduce unit made from the other side.'),
    ],
  },

  {
    unitCode: 'T3_RELIABILITY_KNOWING_IT_IS_UNWELL',
    notes: `A user telling you your system is broken is the worst way to find out. It means it
has been broken for a while, somebody was affected, and they cared enough to complain — which
most people do not.

## The four signals

Almost everything worth alerting on is one of these:

**Latency.** How long requests take. **Percentiles, never the mean** — a mean of 200ms hides the
one user in a hundred waiting nine seconds, and that user is the one who leaves. Watch p50, p95
and p99.

**Traffic.** How many requests. Mostly useful as context for the others, and occasionally as an
alert in its own right: traffic dropping to zero is as bad a sign as traffic spiking, and a
spike explains a latency rise that would otherwise be alarming.

**Errors.** The rate of failed requests, **as a proportion rather than a count**. Fifty errors
is fine at a million requests and a catastrophe at a hundred.

**Saturation.** How full the thing is — CPU, memory, connection pool, disk, queue depth.
**Saturation is the leading indicator**: it rises before latency does, which is what gives you
time to act rather than time to apologise.

## Health checks, and the one that lies

    GET /health  →  200 OK

If it returns 200 whenever the process is running, it tells you the process is running. That is
not the question.

A useful check verifies what the service **needs**: the database answers, the queue is
reachable, the cache responds. A service whose database is down is not healthy, and a health
check that says otherwise is worse than none — it will keep a broken instance in the load
balancer.

**But keep the check cheap and do not cascade.** If your health check calls three services'
health checks, one slow dependency takes down everything, and you have built a system that fails
together.

## Alerting on symptoms, not causes

**Alert on what the user experiences.** "Error rate above 1% for five minutes." "p95 above two
seconds."

**Not on every cause.** "CPU above 80%" fires at 3am for a service that is perfectly fine under
load, and after two weeks of that, alerts get muted — and then the real one is muted too.

**The test for an alert:** *would somebody have to do something right now?* If not, it is a
dashboard, not an alert. A dashboard is looked at when you are curious; an alert wakes somebody
up, and that budget is small and easily spent.

## The signal that catches most incidents

**Error rate and p95 latency, on the main user-facing path.** Two alerts. Most teams have
forty, most of which have never caught anything, and two that catch nearly everything.

## Knowing which signal would have caught it

After any incident, ask: **which signal moved first, and how long before anyone noticed?**

That question produces the one useful improvement per incident. Often the answer is that the
signal existed, moved twenty minutes early, and nobody was watching it — which is a different
and cheaper problem than not having it at all.`,
    mcqs: [
      mcq('Latency should be watched as:',
        [['Percentiles, because the mean hides the worst users', true],
          ['A mean, which smooths out noise', false],
          ['A maximum, which catches the worst case', false],
          ['A total, summed across requests', false]],
        'A mean of 200ms hides the one user in a hundred waiting nine seconds.'),
      mcq('Saturation is described as the leading indicator because:',
        [['It rises before latency does', true],
          ['It is measured more frequently', false],
          ['It is easier to alert on reliably', false],
          ['It correlates with traffic directly', false]],
        'Which gives you time to act rather than time to apologise.'),
      mcq('A health check returning 200 whenever the process runs:',
        [['Keeps a broken instance in the load balancer', true],
          ['Is adequate for detecting crashes', false],
          ['Should also report the version deployed', false],
          ['Is the standard the protocol expects', false]],
        'A service whose database is down is not healthy.'),
      mcq('Alerting on "CPU above 80%" is a problem because:',
        [['It fires for a service that is fine, until alerts get muted', true],
          ['CPU is hard to measure accurately', false],
          ['The threshold varies between services', false],
          ['It duplicates the saturation signal', false]],
        'And then the real alert is muted too.'),
    ],
    checkpoint: [
      mcq('The test for whether something should be an alert is:',
        [['Would somebody have to act right now', true],
          ['Is the signal reliable enough to trust', false],
          ['Does it indicate a user-visible problem', false],
          ['Has it caught an incident before', false]],
        'If not, it is a dashboard. The waking-somebody-up budget is small.'),
      mcq('Error rate should be tracked as a proportion because:',
        [['Fifty errors differs by scale of traffic', true],
          ['Counts vary with the time window used', false],
          ['Proportions are easier to threshold', false],
          ['It removes the need to track traffic', false]],
        'Fine at a million requests, a catastrophe at a hundred.'),
      mcq('The most useful post-incident question is:',
        [['Which signal moved first, and how long before anyone noticed', true],
          ['What was the root cause of the failure', false],
          ['How long did the incident last from first symptom to fix', false],
          ['How many users were affected by it', false]],
        'Often the signal existed and nobody was watching, which is a cheaper problem to fix.'),
    ],
  },

  {
    unitCode: 'T3_RELIABILITY_CHECKPOINT',
    notes: `The quality layer of the year, measured. Two modules sit behind this: testing, and
the reliability work that tells you what is happening after the tests have passed.

**The line the whole layer holds:** tests tell you it worked before you shipped; logs and
signals tell you whether it is working now. Neither substitutes for the other, and a team with
one and not the other is blind in a specific, predictable way.

**What is being checked**

- **Level** — which kind of test catches which failure, and why integration is where the bugs
  are.
- **Cases** — boundaries, negatives, and the five categories.
- **One reason to fail** — and what a suite tells you when it does not hold.
- **Isolation** — what to mock, what not to, and the test that only proves the mock works.
- **Flakiness** — why rerunning is the response that costs you the suite.
- **Logs** — what is worth writing down, and the two fields that make a log usable.
- **Signals** — the four, and the difference between an alert and a dashboard.

**What is not being checked:** which testing framework you know, or the syntax of any particular
mocking library.

**If you are unsure**, the highest-value revision is not more reading. Take a suite you have
written, break the code in five places, and see how many the tests notice. That exercise
teaches more about test design than any unit here, and it will tell you honestly where you
stand.`,
    mcqs: [
      mcq('The line this whole layer holds is:',
        [['Tests say it worked; signals say it is working', true],
          ['Coverage measures how much is verified', false],
          ['Integration tests catch the most bugs', false],
          ['Logs are the record of what tests missed', false]],
        'A team with one and not the other is blind in a specific, predictable way.'),
      mcq('The best revision if you are unsure is:',
        [['Break your own code in five places and count what the tests notice', true],
          ['Re-read the units on test levels', false],
          ['Write tests for an untested module', false],
          ['Measure the coverage of a real project', false]],
        'It teaches more than any unit here, and it is honest about where you stand.'),
      mcq('This checkpoint does NOT assess:',
        [['Knowledge of a particular mocking library', true],
          ['Which level catches which failure', false],
          ['What makes a log line usable', false],
          ['Why rerunning a flaky test is harmful', false]],
        'The judgement transfers between frameworks; the syntax does not.'),
    ],
    checkpoint: [
      mcq('Most production bugs live at the level of:',
        [['Integration, where the pieces meet', true],
          ['Unit, where the logic is', false],
          ['End to end, where the user is', false],
          ['None in particular; they are evenly spread', false]],
        'Each unit was tested and nobody tested the join between them.'),
      mcq('A test that configures a mock and asserts the mock’s value came back:',
        [['Proves only that the mock works', true],
          ['Verifies the service delegates correctly', false],
          ['Is an acceptable unit test in isolation', false],
          ['Tests the interface rather than the logic', false]],
        'Replace the code with something trivially wrong and it still passes.'),
      mcq('Rerunning a flaky test until it passes:',
        [['Teaches the team that red does not mean broken', true],
          ['Is reasonable while the cause is investigated', false],
          ['Is equivalent to quarantining the test', false],
          ['Costs only the time of the extra run', false]],
        'And then a real failure gets rerun three times too.'),
      mcq('The four signals are latency, traffic, errors and:',
        [['Saturation', true], ['Availability', false], ['Throughput', false], ['Capacity', false]],
        'And saturation is the one that moves first, which is why it buys you time.'),
      mcq('Each test should fail for:',
        [['Exactly one nameable reason', true],
          ['At most three related reasons', false],
          ['One reason per assertion made', false],
          ['Any reason the behaviour is wrong', false]],
        'So the CI output names what broke without anybody opening the file.'),
    ],
  },
];
