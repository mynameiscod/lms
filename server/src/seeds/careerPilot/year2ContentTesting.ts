/**
 * T2_DEBUGGING and T2_TESTING — fifteen units. Year 2, mandatory backbone.
 *
 * ── THE LINE THESE TOPICS HOLD ────────────────────────────────────────────────────────────
 *
 * The draft curriculum asks for something most courses skip: Year 2 should increasingly give
 * students BROKEN programs to diagnose and repair, not only blank files to fill. That is what
 * working days are actually made of, and it is a different skill from writing something new.
 *
 * So debugging is taught as a method — reproduce, narrow, hypothesise, change one thing — rather
 * than as a tour of a debugger's buttons. And testing is taught from the cases that break software
 * rather than from the framework's API: a student who can name the boundaries of a function has
 * learned the valuable half.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TESTING_BUNDLES: PilotBundle[] = [
  /* ── T2_DEBUGGING ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T2_DEBUGGING_READING_ERRORS',
    notes: `A traceback is not noise. It is a precise report, and most of the time it names the line
and the reason.

    Traceback (most recent call last):
      File "app.py", line 42, in <module>
        main()
      File "app.py", line 31, in main
        total = compute(orders)
      File "app.py", line 18, in compute
        return sum(o["amount"] for o in orders)
    TypeError: unsupported operand type(s) for +: 'int' and 'str'

**Read it bottom-up.**

1. **The last line** is what went wrong: adding a number and a string.
2. **The frame above it** is where: line 18, inside \`compute\`.
3. **The frames above that** are how you got there: main called compute.

Your code is usually the lowest frame that belongs to you — when a traceback ends deep inside a
library, scan upwards to the last line from your own files. That is nearly always where the mistake
is.

**The messages worth recognising instantly:**

| Message | Usual cause |
|---|---|
| \`NameError: name 'x' is not defined\` | Typo, or used before assignment |
| \`AttributeError: 'NoneType' object has no attribute 'x'\` | Something returned None |
| \`KeyError: 'name'\` | Key missing, or spelled differently |
| \`IndexError: list index out of range\` | Off by one, or an empty list |
| \`TypeError: 'int' object is not iterable\` | Looping over a single value |
| \`ValueError: invalid literal for int()\` | Converting text that is not a number |
| \`ZeroDivisionError\` | A count that was zero |

**The most useful single habit:** read the error out loud as a sentence. "Unsupported operand for
plus: int and str" becomes "something in that sum is a string" — which tells you what to print.

**Warnings are not errors, and are sometimes the cause.** A deprecation warning about a library you
just upgraded explains a lot of otherwise mysterious behaviour.

**When the error is not where the bug is**, which is common: a \`None\` appears three functions away
from the function that returned it. The traceback shows where it *failed*, and the hunt is for where
it *started*.`,
    mcqs: [
      mcq('A Python traceback should be read:',
        [['Bottom-up, starting with the last line', true],
          ['Top-down, starting with the first frame', false],
          ['From the middle outwards', false],
          ['Only the first and last lines matter', false]],
        'The error is last; the frame above it is where it happened.'),
      mcq('`AttributeError: \'NoneType\' object has no attribute \'title\'` usually means:',
        [['Something returned None where an object was expected', true],
          ['The attribute was spelled incorrectly', false],
          ['The object was deleted before use', false],
          ['The class is missing that attribute entirely', false]],
        'The hunt is for what returned None, which is usually further back.'),
      mcq('When a traceback ends deep inside a library, you should:',
        [['Scan up to the last frame from your own code', true],
          ['Report a bug against the library', false],
          ['Upgrade the library and retry', false],
          ['Wrap the call in a try/except', false]],
        'Your frame is nearly always where the mistake was made.'),
      mcq('`ValueError: invalid literal for int()` comes from:',
        [['Converting text that is not a number', true],
          ['Dividing a number by zero', false],
          ['Indexing past the end of a list', false],
          ['Comparing two different types', false]],
        'Often an empty string or a stray space in input data.'),
    ],
    checkpoint: [
      mcq('The place an error is raised is:',
        [['Where it failed, not always where the bug is', true],
          ['Always the line containing the mistake', false],
          ['Random, depending on optimisation', false],
          ['The first line of the function', false]],
        'A None travels; the traceback shows the crash, not the origin.'),
      mcq('`IndexError: list index out of range` most often means:',
        [['An off-by-one, or an empty list', true],
          ['The list contains the wrong type', false],
          ['The index was a string', false],
          ['The list was modified during iteration', false]],
        'The two edges again: nothing there, or one too far.'),
    ],
  },

  {
    unitCode: 'T2_DEBUGGING_REPRODUCING',
    notes: `A bug you cannot reproduce cannot be fixed with confidence — you can only change
something and hope. So the first real step is making it happen on demand.

**Reproduce it, then shrink it.** The smallest input that still fails is worth more than the
original:

    # Reported: "the report crashes for March"
    # Shrink: one branch? one day? one order?
    # Ends at: an order with quantity 0 -> ZeroDivisionError in the average

That one line is now both the diagnosis and the test you will write.

**How to shrink systematically:** halve the input and see which half still fails; repeat. Ten
rounds takes a thousand records down to one. It feels slow and is faster than reading code.

**Write the reproduction down** before fixing anything:

    Steps: POST /orders with quantity 0, then GET /reports/march
    Expected: report renders with 0 average
    Actual: 500, ZeroDivisionError at report.py:88

That is a bug report, a test case and a definition of done, in four lines.

**When it only happens sometimes**, the cause is nearly always one of:

- **Time** — month ends, time zones, a date that is Sunday.
- **Order** — two things racing, or a set iterated in a different order.
- **State left behind** — a cache, a file, a logged-in session from the last test.
- **Data** — one record with a null, an emoji, or a name with an apostrophe.

Log the inputs and the time at the point of failure, and the pattern usually appears within a day.

**In production**, you cannot try it again — so the reproduction comes from logs. That is what
turns "log enough to diagnose a problem" from advice into a habit.

**Do not fix it yet.** A fix applied before reproduction cannot be verified, and the commonest
outcome is that the symptom moves rather than the bug going away.`,
    mcqs: [
      mcq('The value of shrinking a failing input is that:',
        [['The smallest failing case is the diagnosis and the test', true],
          ['Smaller inputs run faster in the debugger', false],
          ['It proves the bug is not in a library', false],
          ['It removes the need to read the code', false]],
        'Halving repeatedly is faster than reading, and ends with the exact trigger.'),
      mcq('A bug that only happens sometimes is most often caused by:',
        [['Time, ordering, leftover state or one odd record', true],
          ['A compiler or interpreter defect', false],
          ['Insufficient memory on the machine', false],
          ['A missing type annotation', false]],
        'Those four cover the large majority of intermittent failures.'),
      mcq('Fixing a bug before reproducing it usually means:',
        [['You cannot verify the fix, and the symptom may just move', true],
          ['The fix takes longer to write', false],
          ['The bug will reappear in a different module', false],
          ['The tests will fail for another reason', false]],
        'Without a reproduction there is nothing to check the fix against.'),
      mcq('In production, the reproduction usually comes from:',
        [['Logs recorded at the time of failure', true],
          ['Running the same request again', false],
          ['Asking the user to repeat their steps', false],
          ['A debugger attached to the server', false]],
        'Which is why logging inputs and context is a habit, not a nicety.'),
    ],
    checkpoint: [
      mcq('A written reproduction should contain:',
        [['Steps, expected result, and actual result', true],
          ['The suspected cause and a proposed fix', false],
          ['The full source of the failing function', false],
          ['A list of everything you tried', false]],
        'Those three lines are a bug report, a test and a definition of done.'),
      mcq('Shrinking an input by halving repeatedly takes a thousand records to one in about:',
        [['Ten rounds', true], ['A hundred rounds', false], ['Five hundred rounds', false], ['Three rounds', false]],
        'The same logarithm that makes binary search fast.'),
    ],
  },

  {
    unitCode: 'T2_DEBUGGING_BREAKPOINTS',
    notes: `Print statements are fine, and a debugger is faster once the bug is more than one line
deep. Both are tools for the same question: what is actually in these variables?

**The debugger, in five commands.** In VS Code or PyCharm, set a breakpoint by clicking the gutter
and run in debug mode. The commands are the same everywhere:

| Command | What it does |
|---|---|
| Continue | Run until the next breakpoint |
| Step over | Run this line, do not go inside a call |
| Step into | Go inside the call on this line |
| Step out | Finish this function and stop at the caller |
| Watch | Show an expression's value at every stop |

**Python's built-in, with no editor at all:**

    breakpoint()      # execution stops here and gives you a prompt

At the prompt: \`p variable\` prints, \`n\` runs the next line, \`s\` steps in, \`c\` continues, \`l\`
lists code around you, and \`q\` quits.

**Conditional breakpoints are the real time-saver.** A loop over ten thousand records that fails on
one: set the breakpoint to trigger only when \`record.id == 4821\` rather than pressing continue
four thousand times.

**When printing is better than a debugger:**

- The bug is in a loop and you want to see a hundred values at once.
- The failure only happens in production or in CI, where you cannot attach.
- The code is asynchronous, and stopping it changes the timing.

**When a debugger is better:** you do not know which variable is wrong yet, the call chain is deep,
or you need to inspect an object's whole state rather than one field.

**What to print, when you print:**

    print(f"{i=} {record.id=} {total=}")     # names and values, no guessing

The \`=\` inside an f-string prints both the expression and its value, which removes the "which of
these three numbers is which" problem entirely.

**Remove them afterwards.** A codebase full of stray prints is a codebase where nobody can find the
real output — and \`logging.debug\` exists precisely so you do not have to delete them.`,
    mcqs: [
      mcq('What does `breakpoint()` do in Python?',
        [['Stops execution and opens an interactive prompt', true],
          ['Prints the current stack and continues', false],
          ['Marks a line for the profiler to measure', false],
          ['Raises an exception that can be caught', false]],
        'It is the built-in debugger, available without any editor.'),
      mcq('A conditional breakpoint is most useful when:',
        [['A loop over many records fails on one of them', true],
          ['The bug happens on the very first iteration', false],
          ['The code has no loops at all', false],
          ['You want to see every value in sequence', false]],
        'It stops only at the case you care about, rather than thousands of times.'),
      mcq('Printing beats a debugger when:',
        [['You want to see many values across a loop at once', true],
          ['The call chain is deep and unfamiliar', false],
          ['You need an object\'s full state', false],
          ['You do not know which variable is wrong', false]],
        'Or when you cannot attach at all, as in CI or production.'),
      mcq('`print(f"{total=}")` prints:',
        [['Both the name and the value', true],
          ['Only the value, with no label', false],
          ['The type of the variable', false],
          ['The line number and the value', false]],
        'It removes the "which number is which" problem when printing several.'),
    ],
    checkpoint: [
      mcq('"Step over" in a debugger means:',
        [['Run this line without entering the call', true],
          ['Skip this line without running it', false],
          ['Run until the function returns', false],
          ['Move the execution point backwards', false]],
        'Step into enters the call; step out finishes the current function.'),
      mcq('Debug prints left in a codebase are a problem because:',
        [['Real output gets lost among them', true],
          ['They slow the program significantly', false],
          ['They prevent the debugger from attaching', false],
          ['They change the behaviour of the code', false]],
        'logging.debug exists so they can stay without shouting.'),
    ],
  },

  {
    unitCode: 'T2_DEBUGGING_HYPOTHESIS',
    notes: `Debugging is an experiment, not a search. The method is always the same: form a
hypothesis you can test, test exactly it, and change one thing at a time.

**The cycle:**

1. **Observe** — what actually happens, precisely. "The total is 0 for March, correct for April."
2. **Hypothesise** — one specific, testable claim. "The March filter excludes every record because
   the dates are strings, not dates."
3. **Predict** — what you would see if that were true. "Then printing the filter's output for March
   shows an empty list, and the types are str."
4. **Test** — print exactly that, and nothing else.
5. **Conclude** — confirmed, or ruled out. Either is progress, and ruling out is progress people
   forget to count.

**Change one thing at a time.** Two changes and a passing test tell you nothing about which mattered
— and one of them may be a new bug that happens to cancel the first.

**Bisect to narrow.** Where a bug is in a chain of steps, check the middle: is the data correct
halfway through? That halves the search each time, which is the same reasoning as binary search and
just as effective.

**Question your assumptions in order of confidence.** The bug is nearly always in what you were
sure of: that the file is what you think, that the function returns what its name says, that the
config being read is the one you edited. The hardest bugs are hard because something "obviously"
true is not.

**Write down what you have ruled out.** An hour into a hard bug, a list of eliminated hypotheses
stops you re-testing the same thing twice, and is what makes handing the problem to somebody else
useful rather than starting over.

**When you are stuck: explain it to someone.** Half the time you find the answer mid-sentence —
because explaining forces you to state the assumptions you have been skipping over.

**Stop and take a break.** Long stuck periods are usually one wrong assumption held firmly, and
fifteen minutes away is a more reliable cure than another hour of reading.`,
    mcqs: [
      mcq('A good debugging hypothesis is:',
        [['Specific and testable, predicting what you would see', true],
          ['Broad enough to cover several possible causes', false],
          ['A guess about which line to change', false],
          ['The most likely cause, chosen quickly', false]],
        'It must make a prediction you can check in one step.'),
      mcq('Changing two things at once and seeing the test pass tells you:',
        [['Nothing about which change mattered', true],
          ['That both changes were necessary', false],
          ['That the bug is fixed for good', false],
          ['That the first change was sufficient', false]],
        'And one may be a new bug masking the first.'),
      mcq('Bisecting a chain of processing steps means:',
        [['Checking whether the data is correct halfway through', true],
          ['Running the first half of the code only', false],
          ['Splitting the input in two and running both', false],
          ['Testing the first and last steps only', false]],
        'Each check halves the region the bug can be in.'),
      mcq('Hard bugs are usually hard because:',
        [['Something you were certain of is not true', true],
          ['The code is longer than usual', false],
          ['The language behaves inconsistently', false],
          ['Several bugs occur at the same time', false]],
        'Which is why assumptions are questioned in order of confidence.'),
    ],
    checkpoint: [
      mcq('Keeping a list of ruled-out hypotheses helps because:',
        [['You stop re-testing the same idea twice', true],
          ['It proves you worked on the problem', false],
          ['It shortens the eventual fix', false],
          ['It replaces the need for a reproduction', false]],
        'It also makes handing the problem over useful rather than a restart.'),
      mcq('Explaining a bug out loud to somebody often solves it because:',
        [['Stating your assumptions exposes the wrong one', true],
          ['The listener usually knows the answer', false],
          ['Speaking is slower than thinking', false],
          ['It forces you to re-read the code', false]],
        'The answer frequently arrives mid-sentence, before any reply.'),
    ],
  },

  {
    unitCode: 'T2_DEBUGGING_BROKEN_PROGRAMS',
    notes: `No new ideas. Repair programs you did not write — which is what most engineering days
consist of.

**Work through these, in order. For each: reproduce, narrow, hypothesise, fix, and prove it.**

1. **The off-by-one report** — a summary that omits the last record.
2. **The silent None** — a function returning None on one branch, failing three calls later.
3. **The shared default** — a function with a mutable default argument, returning data from a
   previous call.
4. **The wrong comparison** — string dates compared as strings, so "10" sorts before "9".
5. **The swallowed exception** — a bare \`except: pass\` hiding the real failure.
6. **The quadratic loop** — correct on ten records, unusable on a hundred thousand.
7. **The shared state** — a class attribute shared between instances.
8. **The timezone bug** — a report correct in the morning and wrong after 6pm.

**For each, record:**

| Item | Your answer |
|---|---|
| The smallest input that fails | |
| The hypothesis you tested | |
| The evidence that confirmed it | |
| The fix, and why it is the root cause | |
| The test that now fails without the fix | |

**That last row is the standard.** A fix without a test is a fix that comes back. Write the test
first if you can: it should fail, then pass.

**Resist the temptation to rewrite.** Rewriting code you do not understand replaces a known bug with
unknown ones, and the exercise here is understanding, not authorship.

**The slip this set exposes:** fixing the symptom — special-casing the record that failed — instead
of the cause. If your fix contains the specific value from the bug report, look again.`,
    mcqs: [
      mcq('A function with a mutable default argument returns data from a previous call because:',
        [['The default is created once, when the function is defined', true],
          ['Python caches return values automatically', false],
          ['The caller passed the same object again', false],
          ['Defaults are shared between all functions', false]],
        'The same list object is reused on every call that omits the argument.'),
      mcq('A fix that contains the exact value from the bug report usually means:',
        [['The symptom was patched rather than the cause', true],
          ['The fix is precise and well targeted', false],
          ['The test data needs updating too', false],
          ['The bug was in the input rather than the code', false]],
        'Special-casing one record leaves the next one to fail the same way.'),
      mcq('`except: pass` around a failing call is a problem because:',
        [['It hides the real failure and returns a wrong result', true],
          ['It is slower than catching a specific exception', false],
          ['It prevents the function from returning', false],
          ['It only catches errors from the standard library', false]],
        'The bug becomes invisible and surfaces somewhere unrelated.'),
      mcq('The standard for a completed repair is:',
        [['A test that fails without the fix and passes with it', true],
          ['A comment explaining the original bug', false],
          ['A manual check that the symptom is gone', false],
          ['A rewrite of the function that failed', false]],
        'A fix without a test is a fix that comes back.'),
      mcq('Rewriting code you do not understand:',
        [['Replaces a known bug with unknown ones', true],
          ['Is the fastest route to a correct version', false],
          ['Is required when the code has no tests', false],
          ['Guarantees the original bug is gone', false]],
        'Understanding is the exercise; authorship is not.'),
    ],
    checkpoint: [
      mcq('A report correct in the morning and wrong after 6pm points to:',
        [['A timezone or date-boundary problem', true],
          ['A memory leak that builds up during the day', false],
          ['A caching layer that expires hourly', false],
          ['A database index that degrades over time', false]],
        'Time-dependent behaviour is one of the four intermittent causes.'),
      mcq('The first step when handed a broken program is to:',
        [['Reproduce the failure reliably', true],
          ['Read the whole file from the top', false],
          ['Add logging to every function', false],
          ['Rewrite the part that looks wrong', false]],
        'Without a reproduction, a fix cannot be verified.'),
    ],
  },

  {
    unitCode: 'T2_DEBUGGING_MINI_PROJECT',
    notes: `One broken program, diagnosed and repaired properly — with the diagnosis written down as
carefully as the fix.

**Why the write-up is half the marks.** In a job, the fix is a commit and the explanation is what
stops the same class of bug next month. An engineer who can fix a bug but not explain it can be
relied on once; one who can explain it improves the whole team.

**What "properly" means here:**

- The failure is reproducible before anything is changed
- The smallest failing input is found and recorded
- The root cause is named, not the symptom
- The fix is the smallest change that addresses that cause
- A test fails before the fix and passes after it
- Nothing else in the program changed

**Build it in this order:**

1. **Run it and reproduce** every reported symptom.
2. **Shrink** each to its smallest failing input.
3. **Hypothesise and test**, recording what you ruled out.
4. **Write the failing test** before the fix.
5. **Fix, verify, and check** you broke nothing else.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — The Bug Report',
      description: 'Take a broken program, diagnose several faults properly, fix each at its root, and write the report that makes the diagnosis reusable.',
      instructions: `**The brief**

Take a program with **at least four deliberate faults** — one your instructor provides, one you
write for a classmate and swap, or an open-source project at a commit with a known bug.

If you are writing one to swap, include a mix: an off-by-one, a silent None, a shared mutable
default, a swallowed exception, and a quadratic loop.

**Requirements**

1. **Reproduce every fault before changing anything**, with the steps recorded.
2. **Shrink each** to its smallest failing input.
3. **A failing test per fault**, written before the fix.
4. **A root-cause fix per fault** — the smallest change that addresses the cause.
5. **No unrelated changes.** No reformatting, no renaming, no rewrites.
6. **A regression check**: the full test suite passes after all fixes.

**What to submit**

1. The repaired source, and the tests you added.
2. A **fault table**:

   | # | Symptom | Smallest failing input | Root cause | Fix | Test |
   |---|---|---|---|---|---|

3. A **hunt log** for the hardest fault: the hypotheses you tested, what each predicted, and what
   ruled it out.
4. A **short write-up** (250–350 words): which fault took longest and why; one assumption you held
   that turned out to be wrong; one change you would make to the program so this class of bug
   cannot recur.

**Constraints**

- Every fix must be accompanied by a test that fails without it.
- No fix may contain a value taken from the bug report.
- The diff must contain nothing unrelated to the fixes.

**Where the marks are.** The hunt log and the root causes. Four symptoms patched scores far below
three causes understood and one honestly recorded as still unexplained.`,
      rubric: [
        {
          criterion: 'Reproduction and narrowing',
          description: 'Every fault reproduced before any change; smallest failing input recorded for each.',
          maxPoints: 20,
        },
        {
          criterion: 'Root causes',
          description: 'Causes named rather than symptoms patched; no fix contains a value from the report; fixes are minimal.',
          maxPoints: 30,
        },
        {
          criterion: 'Tests',
          description: 'A test per fault that fails before the fix and passes after; the suite passes at the end.',
          maxPoints: 25,
        },
        {
          criterion: 'Hunt log',
          description: 'Hypotheses, predictions and what ruled each out, for the hardest fault.',
          maxPoints: 15,
        },
        {
          criterion: 'Write-up',
          description: 'Names a wrong assumption honestly and proposes a change that prevents the class of bug.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },

  /* ── T2_TESTING ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T2_TESTING_WHY_TESTS',
    notes: `A test is not there to prove today's code works. You already know it works; you just ran
it. A test is there to tell you when a change **next month** breaks it.

**What tests actually buy:**

1. **Confidence to change things.** Without tests, every change is a risk, so code rots because
   nobody dares touch it.
2. **A specification.** A test says what the function is supposed to do, in code that cannot go
   stale the way a comment does.
3. **Faster debugging.** A failing test names the broken behaviour; a bug report names a symptom.
4. **Design pressure.** Code that is hard to test is usually badly structured — too many
   responsibilities, or reaching the outside world from its middle.

**What tests do not buy:** proof of correctness. Tests show the presence of behaviour on the cases
you thought of, never the absence of bugs. That is not a reason to skip them; it is a reason to
choose the cases deliberately.

**The shape of a test, everywhere:**

    def test_discount_applies_to_orders_over_1000():
        order = Order(total=1500)          # arrange
        result = apply_discount(order)     # act
        assert result.total == 1350        # assert

Arrange, act, assert. One behaviour per test, named so the failure report reads as a sentence.

**What to test first**, when you cannot test everything:

| Test it | Because |
|---|---|
| The rules that would cost money if wrong | The risk is real |
| The bug you just fixed | It has already proved it can happen |
| The edges: empty, one, maximum, invalid | That is where bugs live |
| Anything you are afraid to change | That fear is the signal |

**What not to test:** the language itself, third-party libraries, getters that only return a field,
and the exact wording of messages that will change.

**Coverage is a thermometer, not a goal.** 100% coverage with assertions that check nothing is
worse than 60% on the paths that matter, because it reports safety that is not there.`,
    mcqs: [
      mcq('The main purpose of a test is to:',
        [['Tell you when a future change breaks the behaviour', true],
          ['Prove the code is correct today', false],
          ['Document the code for new developers', false],
          ['Measure how fast the code runs', false]],
        'You already know it works now; the value is in the future.'),
      mcq('Code that is hard to test usually indicates:',
        [['A structural problem, such as too many responsibilities', true],
          ['A missing testing framework', false],
          ['That the language is unsuitable', false],
          ['That the code is too fast to observe', false]],
        'Testability pressure is one of the honest benefits of writing tests.'),
      mcq('Tests can show:',
        [['The presence of behaviour on the cases you chose', true],
          ['The absence of bugs in the program', false],
          ['That the design is correct', false],
          ['That performance is acceptable', false]],
        'Which is why the cases are chosen deliberately rather than by habit.'),
      mcq('100% coverage with weak assertions is worse than 60% on what matters because it:',
        [['Reports safety that does not exist', true],
          ['Takes longer to run in CI', false],
          ['Makes refactoring harder', false],
          ['Hides which lines are untested', false]],
        'Coverage is a thermometer, not a goal.'),
    ],
    checkpoint: [
      mcq('The three parts of a test are:',
        [['Arrange, act, assert', true],
          ['Setup, run, report', false],
          ['Given, when, finally', false],
          ['Input, output, compare', false]],
        'One behaviour per test, named so the failure reads as a sentence.'),
      mcq('Which is the best first test to write after fixing a bug?',
        [['One that fails without the fix', true],
          ['One that covers the whole module', false],
          ['One that checks performance did not regress', false],
          ['One that verifies the error message text', false]],
        'The bug has proved it can happen; the test stops it returning.'),
    ],
  },

  {
    unitCode: 'T2_TESTING_FIRST_TEST',
    notes: `Python ships with a test runner, and a test is an ordinary function whose name starts
with \`test_\`.

    # calculator.py
    def add(a, b):
        return a + b

    # test_calculator.py
    from calculator import add

    def test_adds_two_positive_numbers():
        assert add(2, 3) == 5

Run it:

    pip install pytest
    pytest

\`pytest\` finds files named \`test_*.py\`, runs every \`test_\` function, and reports. There is no
class to inherit from and no special assertion method — the plain \`assert\` is enough, and pytest
rewrites it so a failure shows both values:

    E    assert 6 == 5
    E     +  where 6 = add(2, 3)

**Where tests live:**

    project/
      app/
        calculator.py
      tests/
        test_calculator.py

Keeping them beside the code they test, in a mirrored structure, makes both findable.

**Naming is part of the test.** \`test_1\` tells you nothing when it fails at 3am;
\`test_rejects_negative_quantity\` tells you exactly what broke.

**Shared setup with a fixture**, once you have several tests needing the same object:

    import pytest

    @pytest.fixture
    def order():
        return Order(items=[Item("book", 500)])

    def test_total_sums_items(order):
        assert order.total == 500

Each test gets its own fresh \`order\`, which is what keeps tests independent — and independence is
what lets them run in any order, or in parallel.

**Run them constantly.** A test suite run once a week is an alarm nobody hears. Run on every save
if your editor allows it, and certainly before every commit.

**Start with one test today.** The first test of a project is the hard one, because it forces the
imports and the structure to be right. The second costs a minute.`,
    mcqs: [
      mcq('What does pytest use to discover tests?',
        [['Files named test_*.py and functions named test_*', true],
          ['A registry file listing every test', false],
          ['Classes inheriting from TestCase', false],
          ['Decorators on each test function', false]],
        'Convention over configuration: nothing to register.'),
      mcq('Why does a plain `assert` suffice in pytest?',
        [['pytest rewrites it to show both values on failure', true],
          ['Python prints assertion values by default', false],
          ['Because assert raises a special exception', false],
          ['Because the test name explains the failure', false]],
        'That rewriting is why no assertEqual family is needed.'),
      mcq('A fixture returning a fresh object per test matters because:',
        [['Tests stay independent and can run in any order', true],
          ['It makes the suite run faster', false],
          ['It reduces the number of imports', false],
          ['It allows tests to share state deliberately', false]],
        'Shared state between tests produces failures that depend on order.'),
      mcq('`test_rejects_negative_quantity` is better than `test_3` because:',
        [['The failure report says what broke', true],
          ['pytest sorts tests by name', false],
          ['Longer names run in the correct order', false],
          ['It documents the function signature', false]],
        'The name is read far more often than the body.'),
    ],
    checkpoint: [
      mcq('The hardest test in a project is usually:',
        [['The first, because it forces the structure to be right', true],
          ['The last, because coverage must be completed', false],
          ['The one for the largest function', false],
          ['The one that tests error handling', false]],
        'After the imports and layout work, the second test costs a minute.'),
      mcq('A test suite run once a week is:',
        [['An alarm nobody hears', true],
          ['Adequate for a small project', false],
          ['Better than running it on every commit', false],
          ['The normal practice in industry', false]],
        'Feedback that arrives a week later cannot guide a change.'),
    ],
  },

  {
    unitCode: 'T2_TESTING_ASSERTIONS',
    notes: `What you assert decides whether a test is useful or merely present.

**Assert behaviour, not implementation.**

    # Brittle: breaks the moment the internals change
    assert cart._items[0]._price_in_paise == 50000

    # Durable: says what the cart promises
    assert cart.total == 500

The first test fails on a refactor that changed nothing a user can see, and a test that cries wolf
gets deleted.

**One behaviour per test.** A test asserting five things fails on the first, and you never learn
whether the other four were fine. Several small tests give a much better failure report.

**Assert the specific thing, not a vague one:**

    assert result                       # passes for 1, "x", [0], True
    assert result == 42                 # says what you expected

**Testing that something raises:**

    import pytest

    def test_rejects_zero_quantity():
        with pytest.raises(ValueError, match="quantity"):
            Order(quantity=0)

The \`match\` matters: without it, the test passes when a completely different ValueError is raised
— including one from a typo in the test itself.

**Floating point needs approximate comparison:**

    assert total == pytest.approx(0.30)     # 0.1 + 0.2 is not exactly 0.3

**Do not reimplement the logic in the test:**

    # Useless: the same mistake in both places passes
    assert discount(1500) == 1500 * 0.9

    # Useful: the expected value, worked out by hand
    assert discount(1500) == 1350

That is the most common way a test suite becomes decorative: it repeats the code's reasoning
instead of checking its result against an independent answer.

**Assert the absence too**, where it matters: that nothing was charged, that no email was sent,
that the record was not created. Bugs hide in the things that happened when they should not have.`,
    mcqs: [
      mcq('Asserting on a private field such as `cart._items[0]._price` is brittle because:',
        [['A refactor that changes nothing visible breaks the test', true],
          ['Private fields cannot be read in tests', false],
          ['It runs more slowly than a public call', false],
          ['pytest forbids underscore attributes', false]],
        'Tests that cry wolf get deleted, and then nothing is protected.'),
      mcq('Why does `pytest.raises(ValueError, match="quantity")` beat `pytest.raises(ValueError)`?',
        [['It fails when a different ValueError is raised', true],
          ['It runs the block twice for safety', false],
          ['It produces a shorter failure message', false],
          ['It catches subclasses of ValueError too', false]],
        'Including a ValueError caused by a mistake inside the test itself.'),
      mcq('Writing `assert discount(1500) == 1500 * 0.9` in a test is weak because:',
        [['It repeats the code\'s reasoning instead of checking the result', true],
          ['Floating-point multiplication is imprecise', false],
          ['The expression is evaluated before the call', false],
          ['It tests two behaviours at once', false]],
        'The same mistake in both places passes happily.'),
      mcq('A single test asserting five different things:',
        [['Hides the state of the last four when the first fails', true],
          ['Runs faster than five separate tests', false],
          ['Is the recommended style in pytest', false],
          ['Gives a clearer failure message', false]],
        'One behaviour per test makes the report specific.'),
    ],
    checkpoint: [
      mcq('`assert result` is weaker than `assert result == 42` because it:',
        [['Passes for any truthy value', true],
          ['Cannot be used with integers', false],
          ['Does not print the value on failure', false],
          ['Only checks the type of the result', false]],
        'It passes for 1, "x", [0] and True alike.'),
      mcq('Asserting that nothing happened — no charge, no email — matters because:',
        [['Bugs hide in actions taken when they should not be', true],
          ['It improves the coverage percentage', false],
          ['Negative assertions run faster', false],
          ['It is required for error-path tests', false]],
        'A silent extra charge is exactly the bug nobody notices.'),
    ],
  },

  {
    unitCode: 'T2_TESTING_EDGE_CASES',
    notes: `Software breaks at the boundaries, so that is where tests earn their keep. The
happy path is the case you already ran by hand.

**The checklist, for any function taking a collection:**

| Case | Why |
|---|---|
| Empty | Off-by-one, division by zero, "first item" |
| One item | Loops that assume a second |
| Two items | The smallest case where order matters |
| Many | The normal case |
| All identical | Ties, uniqueness, "second largest" |
| Already sorted / reversed | Best and worst cases for some algorithms |

**For numbers:** zero, one, negative, the maximum allowed, one past the maximum, and a float where
an integer is expected.

**For text:** empty string, one character, whitespace only, a very long value, an apostrophe, an
emoji, a name in another script, and leading or trailing spaces from a paste.

**For dates:** the first and last day of a month, 29 February, the end of a year, a date in the
past for a future-only field, and two dates in different time zones.

**The boundary itself is the point.** A rule that says "discount over 1000" needs 999, 1000 and
1001 — because \`>\` and \`>=\` is exactly the mistake being tested for, and only one of those three
values reveals it.

    @pytest.mark.parametrize("total,expected", [(999, 999), (1000, 1000), (1001, 900.9)])
    def test_discount_boundary(total, expected):
        assert apply_discount(total) == pytest.approx(expected)

\`parametrize\` is how one test covers a row of cases without copy-paste, and the failure report
names the failing value.

**Where edge cases come from:** the specification (limits, ranges, rules), the data (nulls,
duplicates, encodings), and the bugs you have already had. That last source is the best one you
have — every bug found in production is an edge case somebody did not test.`,
    mcqs: [
      mcq('A rule "discount applies over 1000" should be tested with:',
        [['999, 1000 and 1001', true],
          ['0, 1000 and 100000', false],
          ['1000 and 2000', false],
          ['A random selection of totals', false]],
        'Only those three distinguish > from >=.'),
      mcq('Why test a collection with exactly two items?',
        [['It is the smallest case where order matters', true],
          ['It is the fastest case to run', false],
          ['Two items exercise every branch', false],
          ['It is the most common real input', false]],
        'Empty and one catch initialisation; two catches ordering and pairing.'),
      mcq('`@pytest.mark.parametrize` is used to:',
        [['Run one test across a row of cases, naming failures', true],
          ['Run tests in parallel across processes', false],
          ['Generate random inputs automatically', false],
          ['Share setup between test files', false]],
        'It removes copy-paste while keeping the failure specific.'),
      mcq('The best source of new edge cases is:',
        [['Bugs you have already had in production', true],
          ['The coverage report', false],
          ['The language documentation', false],
          ['The size of the codebase', false]],
        'Every production bug is an edge case somebody did not think of.'),
    ],
    checkpoint: [
      mcq('Which text input most often breaks naive code?',
        [['A value with an apostrophe or leading space', true],
          ['A value of exactly ten characters', false],
          ['A value in capital letters', false],
          ['A value containing digits', false]],
        'Apostrophes break naive queries and concatenation; pasted spaces break comparisons.'),
      mcq('Testing the happy path only is weak because:',
        [['You already ran that case by hand', true],
          ['The happy path changes most often', false],
          ['Happy paths are slower to test', false],
          ['Coverage tools ignore it', false]],
        'Tests should cover what you have not already checked manually.'),
    ],
  },

  {
    unitCode: 'T2_TESTING_NEGATIVE_TESTS',
    notes: `Most bugs that reach users are about **invalid input handled wrongly**, not valid input
computed wrongly. So half your tests should be about things going wrong.

**Test that bad input is refused:**

    def test_rejects_negative_quantity():
        with pytest.raises(ValueError, match="quantity"):
            Order(item="book", quantity=-1)

    def test_rejects_missing_email():
        with pytest.raises(ValueError):
            Member(name="Asha", email="")

**Test that nothing was changed when it failed.** This is the one people miss:

    def test_failed_transfer_leaves_balances_untouched():
        a, b = Account(100), Account(0)
        with pytest.raises(ValueError):
            transfer(a, b, 500)
        assert a.balance == 100 and b.balance == 0

A transfer that raises *after* deducting is a much worse bug than one that refuses, and only this
kind of test catches it.

**Test the boundaries of permission**, not just of numbers: the user who is not logged in, the user
who is logged in but not the owner, the admin. Access bugs are the expensive kind.

**Test what happens when a dependency fails.** The database refuses, the API times out, the file is
missing. Simulate it:

    def test_reports_error_when_storage_unavailable(monkeypatch):
        monkeypatch.setattr(storage, "save", raising_save)
        result = service.save_report(data)
        assert result.ok is False

**The categories worth covering for anything that takes input:**

| Category | Example |
|---|---|
| Missing | The field is absent |
| Empty | Present but blank |
| Wrong type | Text where a number belongs |
| Out of range | Negative, or above a maximum |
| Malformed | A date like "31/02/2026" |
| Too large | A 10MB name field |
| Conflicting | An end date before a start date |

**The test that most often finds a real bug:** invalid input followed by a check that the system is
unchanged. Refusing is easy to get right; refusing *cleanly* is not.`,
    mcqs: [
      mcq('Which test most often finds a real bug?',
        [['Invalid input, then a check that nothing changed', true],
          ['Valid input with a typical value', false],
          ['A performance test at ten times the load', false],
          ['A test of the error message wording', false]],
        'Refusing is easy; refusing without leaving half-changed state is not.'),
      mcq('A transfer that raises after deducting from one account is:',
        [['Worse than one that refuses outright', true],
          ['Acceptable if the exception is logged', false],
          ['Correct, since the caller sees the error', false],
          ['Only a problem under concurrency', false]],
        'The money has left one side and arrived nowhere.'),
      mcq('Testing a dependency failure means:',
        [['Simulating the database or API failing', true],
          ['Running the tests without a network', false],
          ['Waiting for a real outage to occur', false],
          ['Removing the dependency from the code', false]],
        'monkeypatch or a fake lets you make the failure happen on demand.'),
      mcq('Access-control tests should cover:',
        [['Anonymous, logged-in non-owner, owner and admin', true],
          ['Only the admin path, since it has most power', false],
          ['Only the anonymous path', false],
          ['The owner path, since it is the common case', false]],
        'The non-owner case is the one that leaks other people\'s data.'),
    ],
    checkpoint: [
      mcq('"Present but blank" and "absent" should be tested:',
        [['Separately, because code often handles only one', true],
          ['Together, since both mean no value', false],
          ['Only for text fields', false],
          ['Only where the field is required', false]],
        'An empty string passes a presence check that None would fail.'),
      mcq('A date like "31/02/2026" belongs to which category?',
        [['Malformed', true], ['Out of range', false], ['Missing', false], ['Wrong type', false]],
        'It has the right shape and is not a real date.'),
    ],
  },

  {
    unitCode: 'T2_TESTING_TEST_FIRST',
    notes: `Writing the test before the code is a design technique, not a moral position. You use it
where it helps and skip it where it does not.

**The cycle:**

1. **Red** — write a failing test for one small behaviour.
2. **Green** — write the simplest code that passes it.
3. **Refactor** — clean up, with the test protecting you.

    # Red
    def test_empty_cart_totals_zero():
        assert Cart().total == 0

    # Green
    class Cart:
        @property
        def total(self):
            return 0            # yes, really — it passes

    # Red again
    def test_one_item_totals_its_price():
        cart = Cart(); cart.add(Item("book", 500))
        assert cart.total == 500

    # Green: now the real implementation is forced

Returning 0 looks silly and is the point: each test forces exactly one more piece of behaviour, so
the code never runs ahead of what is specified.

**What writing the test first actually gives you:**

- **A usable interface.** You are the first caller, so awkward signatures get noticed before
  anything depends on them.
- **Smaller pieces.** Hard-to-test code gets redesigned before it exists.
- **A definition of done.** The test passing is the finish line, rather than "it seems to work".
- **No unused code.** Every line exists because a test demanded it.

**Where it fits badly**, honestly: exploratory work where you do not yet know what you are building,
user-interface layout, and throwaway scripts. Writing a test for a shape you will discard twice
before lunch costs more than it saves.

**The middle ground most engineers land on:** test-first for rules, calculations and anything with
edge cases; test-after for glue, wiring and exploration. Both end with the tests existing, which is
the part that matters.

**For bug fixes it is almost always right.** Write the test that reproduces the bug, watch it fail,
fix, watch it pass. That sequence proves both the diagnosis and the cure.`,
    mcqs: [
      mcq('The red-green-refactor cycle is:',
        [['Failing test, simplest code that passes, then clean up', true],
          ['Write code, write tests, then refactor', false],
          ['Design, implement, then test', false],
          ['Test, deploy, then monitor', false]],
        'Each test forces exactly one more piece of behaviour.'),
      mcq('Returning a hard-coded 0 to pass the first test is:',
        [['Deliberate — the next test forces the real code', true],
          ['A mistake that should be avoided', false],
          ['Only acceptable in example code', false],
          ['A sign the test was too weak', false]],
        'It keeps the implementation from running ahead of the specification.'),
      mcq('Writing the test first improves the interface because:',
        [['You are the first caller, so awkwardness shows early', true],
          ['Tests enforce naming conventions', false],
          ['It produces shorter function signatures', false],
          ['The framework checks the design', false]],
        'Before anything depends on it is the cheapest time to change it.'),
      mcq('Test-first fits badly for:',
        [['Exploratory work where the shape is unknown', true],
          ['Business rules with edge cases', false],
          ['Bug fixes with a known reproduction', false],
          ['Calculations with clear inputs and outputs', false]],
        'Writing tests for a shape you will discard costs more than it saves.'),
    ],
    checkpoint: [
      mcq('For a bug fix, writing the test first is valuable because:',
        [['It proves both the diagnosis and the cure', true],
          ['It is faster than fixing the code first', false],
          ['It avoids needing a reproduction', false],
          ['It guarantees no regression elsewhere', false]],
        'Fail, fix, pass — the sequence is the evidence.'),
      mcq('The practical middle ground most engineers use is:',
        [['Test-first for rules, test-after for glue', true],
          ['Test-first for everything, always', false],
          ['Test-after for everything, always', false],
          ['Tests only where coverage is low', false]],
        'Both end with the tests existing, which is what matters.'),
    ],
  },

  {
    unitCode: 'T2_TESTING_DEBUGGING',
    notes: `Tests have their own failure modes, and a suite nobody trusts is worse than no suite at
all — because it takes the time and gives no confidence.

**1. The flaky test.** Passes and fails without the code changing. Causes, in order of likelihood:

- **Time** — \`datetime.now()\` inside the code under test. Inject the time instead.
- **Order** — a test depending on state another test left behind. Run your suite in random order
  and see what breaks.
- **Shared resources** — the same file, port or database row used by two tests.
- **Real network calls** — the internet is not a test dependency.

A flaky test must be fixed or deleted. Left alone, it teaches the team to ignore red.

**2. The test that cannot fail.**

    def test_total():
        cart = Cart()
        cart.total          # no assertion at all

It reports green forever. Check by breaking the code on purpose: if no test fails, the tests are
decorative. That exercise — deliberately introducing a bug to see what catches it — is the fastest
audit of a suite there is.

**3. The test that tests the mock.** Mock everything and the test proves only that your mocks were
called. Mock at the boundary: the database, the API, the clock. Never the thing you are testing.

**4. The dependent test.** Test B passes only because test A ran first and left a record behind.
Each test must arrange its own state, which is what fixtures are for.

**5. Slow tests.** A suite taking ten minutes is a suite run once a day. Keep unit tests in
milliseconds; keep the ones that touch a database or a network separate and run them less often.

**When a test fails, read it before fixing the code.** Half of failures are the test being wrong —
an outdated expectation, a changed message, a new required field. Fixing the code to satisfy a
wrong test is how real behaviour gets broken.`,
    mcqs: [
      mcq('A test that passes and fails without code changes is most often caused by:',
        [['Time, order, shared resources or real network calls', true],
          ['A bug in the testing framework', false],
          ['Insufficient assertions in the test', false],
          ['Running on a different machine', false]],
        'Those four cover nearly every flake.'),
      mcq('How do you check whether a suite can actually fail?',
        [['Break the code on purpose and see what catches it', true],
          ['Check the coverage percentage', false],
          ['Count the assertions per test', false],
          ['Run the suite twice in a row', false]],
        'The fastest audit there is, and often an uncomfortable one.'),
      mcq('Mocking should be done at:',
        [['The boundary — database, API, clock', true],
          ['Every dependency the code touches', false],
          ['The function under test itself', false],
          ['Only the slowest components', false]],
        'Mock the thing under test and the test proves nothing.'),
      mcq('A test that only passes when another ran first indicates:',
        [['Shared state that each test should arrange itself', true],
          ['A missing import in the second test', false],
          ['That the tests should be merged', false],
          ['A problem with the test runner', false]],
        'Fixtures exist so each test starts from a known state.'),
    ],
    checkpoint: [
      mcq('When a test fails, the first thing to check is:',
        [['Whether the test itself is wrong', true],
          ['Which commit introduced the failure', false],
          ['Whether other tests fail too', false],
          ['How long the test took to run', false]],
        'Half of failures are outdated expectations; fixing code to match is how behaviour breaks.'),
      mcq('A flaky test left in the suite:',
        [['Teaches the team to ignore red', true],
          ['Is harmless if it usually passes', false],
          ['Improves coverage of timing issues', false],
          ['Should be re-run until it passes', false]],
        'Fix it or delete it; trust in the suite is the asset.'),
    ],
  },

  {
    unitCode: 'T2_TESTING_PRACTICE',
    notes: `No new ideas. Write tests until the cases come to mind before the code does.

**Write a full test suite for each of these:**

1. **A discount calculator** — tiered rules with boundaries at 1,000 and 5,000.
2. **A password validator** — length, character classes, and a banned list.
3. **A date-range checker** — overlapping bookings, touching ranges, reversed ranges.
4. **A CSV parser** — quoted commas, missing columns, blank lines, a header-only file.
5. **A cart with rules** — free delivery over a threshold, maximum quantity per item.
6. **A retry wrapper** — succeeds first time, succeeds on the third, never succeeds.

**For each, before writing any test, list:**

| Category | Cases |
|---|---|
| Happy path | |
| Boundaries | |
| Invalid input | |
| State unchanged after refusal | |
| Dependency failure, where relevant | |

**Then audit your own suite:** comment out a line of the implementation, run the tests, and see
whether anything fails. Repeat for three different lines. Every line you can break without a red
test is a gap, and the exercise usually finds two or three in a suite that felt complete.

**Use parametrize** for rows of similar cases, so boundaries read as a table rather than as six
copy-pasted functions.

**The slip this set exposes:** testing what the code does rather than what it should do. If you
write the test by reading the implementation, you will encode its bugs. Write the test from the
specification, and let it disagree with the code.`,
    mcqs: [
      mcq('Writing a test by reading the implementation risks:',
        [['Encoding the implementation\'s bugs as expectations', true],
          ['Producing tests that run too slowly', false],
          ['Duplicating another test in the suite', false],
          ['Missing the happy path entirely', false]],
        'Write from the specification and let the test disagree with the code.'),
      mcq('Commenting out a line and seeing whether any test fails is:',
        [['A direct audit of what the suite actually protects', true],
          ['A way to measure coverage precisely', false],
          ['A substitute for writing edge cases', false],
          ['Only useful for very small projects', false]],
        'Every line breakable without a red test is a gap.'),
      mcq('A retry wrapper should be tested for:',
        [['First-time success, success after retries, and permanent failure', true],
          ['Only the permanent failure case', false],
          ['Only the first-time success case', false],
          ['The exact delay between attempts', false]],
        'Three behaviours, three tests, none of them the happy path alone.'),
      mcq('A CSV parser test suite should include:',
        [['Quoted commas, missing columns and a header-only file', true],
          ['Only well-formed files of varying size', false],
          ['Files from a single real-world source', false],
          ['A performance test on a large file', false]],
        'Malformed input is where parsers actually fail.'),
      mcq('`parametrize` improves boundary tests because:',
        [['The cases read as a table rather than copy-paste', true],
          ['It runs the cases in parallel', false],
          ['It generates the expected values automatically', false],
          ['It merges failures into a single report', false]],
        'And the failure report still names the specific failing value.'),
    ],
    checkpoint: [
      mcq('Before writing tests, listing categories of cases helps because:',
        [['It surfaces the cases you would otherwise skip', true],
          ['It produces a coverage estimate', false],
          ['It decides the test framework to use', false],
          ['It orders the tests correctly', false]],
        'Invalid input and unchanged-state checks are the usual omissions.'),
      mcq('"State unchanged after refusal" belongs in the test list because:',
        [['Refusing cleanly is harder than refusing', true],
          ['It improves the coverage number', false],
          ['It is required by pytest', false],
          ['It replaces the need for boundary tests', false]],
        'Half-applied changes are the expensive failure mode.'),
    ],
  },

  {
    unitCode: 'T2_TESTING_MINI_PROJECT',
    notes: `One existing piece of code, brought under test — and the bugs that finds.

**Why existing code rather than new.** Writing tests alongside new code is comfortable. Testing
code that already exists, has no tests, and was written without testability in mind is the real
skill: it forces you to find the boundaries, break dependencies and discover what the code actually
does rather than what it was supposed to do.

**Expect to find bugs.** Every honest attempt at this project finds at least one, usually in an
edge case nobody ran. Finding and reporting them is the outcome, not a side effect.

**What good looks like:**

- Every public behaviour has a test
- Boundaries and invalid input are covered, not just the happy path
- Nothing in the suite depends on time, order, network or another test
- The suite runs in seconds
- At least one real bug found, with a test that demonstrates it

**Build it in this order:**

1. **Read the code and write down what it claims to do**, function by function.
2. **Write the happy-path test for each**, and watch which ones are awkward — that awkwardness is
   the design telling you something.
3. **Add boundaries and invalid input.**
4. **Record every disagreement** between what the code does and what it should do.
5. **Audit the suite** by breaking lines deliberately.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — Bringing Code Under Test',
      description: 'Take untested code, bring it under a real test suite, find the bugs that surface, and audit the suite by breaking the code on purpose.',
      instructions: `**The brief**

Take a piece of code with **no tests** and at least 150 lines:

- Something you wrote earlier in your course
- A classmate's project, swapped
- A small open-source utility

**Requirements**

1. **A test per public behaviour**, named so the failure reads as a sentence.
2. **Boundary and invalid-input tests**, not only the happy path.
3. **At least one dependency broken** — time, file system, network or database — replaced with a
   fake or a fixture so the suite is fast and deterministic.
4. **No test depends on another.** The suite must pass in random order.
5. **A mutation audit**: break at least five lines of the implementation, one at a time, and record
   whether a test caught each.
6. **Every disagreement recorded**: where the code does something other than what it should.

**What to submit**

1. The code (unchanged except where a bug was fixed) and the test suite.
2. A **behaviour table**: each public function, what it claims, and the tests covering it.
3. The **mutation audit**:

   | Line broken | Test that caught it | Or: gap |
   |---|---|---|

4. A **bug list**: what you found, the failing test, and whether you fixed it or reported it.
5. A **short write-up** (250–350 words): which function was hardest to test and what that said
   about its design; one change that would make the code more testable; what your mutation audit
   revealed about your own suite.

**Constraints**

- The suite must run in under ten seconds.
- No test may call the real network or the real clock.
- Tests must pass when run in random order.

**Where the marks are.** The mutation audit and the bug list. A suite that catches four of five
deliberate breaks, honestly reported, is worth far more than one claiming full coverage.`,
      rubric: [
        {
          criterion: 'Coverage of behaviour',
          description: 'Every public behaviour tested; boundaries and invalid input included; tests named so failures read clearly.',
          maxPoints: 25,
        },
        {
          criterion: 'Independence and speed',
          description: 'Dependencies faked; no shared state; passes in random order; runs in seconds.',
          maxPoints: 20,
        },
        {
          criterion: 'Mutation audit',
          description: 'At least five deliberate breaks, each recorded as caught or a gap, with honest reporting.',
          maxPoints: 25,
        },
        {
          criterion: 'Bugs found',
          description: 'Real disagreements between behaviour and intent, each with a demonstrating test.',
          maxPoints: 20,
        },
        {
          criterion: 'Write-up',
          description: 'Connects testing difficulty to design, and proposes a concrete change.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },
];
