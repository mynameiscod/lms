/**
 * T3_COMPLEX_DEBUG — six units. Year 3.
 *
 * ── THE LINE THIS TOPIC TAKES ─────────────────────────────────────────────────────────────
 *
 * That debugging is a method, and that the method is what scales when the system stops fitting
 * in your head. A second-year debugs by reading code until they spot it, which works up to a
 * few thousand lines and then stops working entirely. Nothing about that approach degrades
 * gracefully — it just fails, and the student concludes they are bad at debugging.
 *
 * So the topic is about narrowing rather than reading: a hypothesis that can be wrong, a test
 * that halves the search, and the discipline of disproving your first idea instead of
 * accumulating evidence for it.
 *
 * The hardest unit is the last teaching one — the bug you cannot reproduce. That is the one a
 * graduate meets in their first month and has been taught nothing about, because every bug in
 * education reproduces on demand.
 *
 * It attributes to DEBUGGING, except READING_A_STACK_TRACE which measures LOGGING_DIAGNOSTICS:
 * that unit is about what the system already recorded rather than about finding a fault.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const COMPLEX_DEBUG_BUNDLES: PilotBundle[] = [
  /* ── From evidence to cause ─────────────────────────────────────────────────────────── */
  {
    unitCode: 'T3_COMPLEX_DEBUG_EVIDENCE_NOT_GUESSING',
    notes: `Reading code until you spot the bug works until the system is bigger than your head.
Then it stops, and the alternative is a method.

**The method, in four steps:**

1. **Reproduce it, or bound it.** If you cannot make it happen, you cannot tell when you have
   fixed it. Where it genuinely will not reproduce, narrow *when* it happens instead.
2. **State a hypothesis that could be wrong.** "The cache returns stale rows after an update" can
   be tested. "Something is wrong with caching" cannot.
3. **Run the cheapest test that could disprove it.** Not the one that confirms it.
4. **Believe the result.** Especially when it disagrees with you.

**Bisection is the tool that scales.** Each test halves the search rather than shrinking it by
one:

- **In the code path:** log or breakpoint at the midpoint. Is the value already wrong here? Now
  you have half a system to search, not all of it.
- **In history:** \`git bisect\` finds the commit that introduced it in about ten steps across a
  thousand commits.
- **In the data:** the report is wrong for a million rows. Is it wrong for ten? For one? A
  one-row reproduction is a debuggable one.
- **In the configuration:** it works in staging. Move settings across one at a time until it
  breaks.

**The trap is confirmation.** You have a theory within thirty seconds and then spend an hour
gathering evidence for it, skipping the test that would kill it. The discipline is to ask "what
would I see if I were wrong?" and then go and look for exactly that.

**Change one thing at a time.** Four simultaneous changes that fix it leave you unable to say
which one mattered, and you have learned nothing that transfers.

**Write down what you have ruled out.** An hour into a hard bug, memory of what you have already
eliminated is the first thing to go, and you will test the same thing twice.

**Know when to stop and ask.** Somebody who has seen this failure before saves you two hours,
and the cost is thirty seconds of their time. Bring what you tried and what you expected — that
is what makes the question answerable.`,
    mcqs: [
      mcq('Why does bisection scale where reading does not?',
        [['Each test halves the search rather than reducing it by one', true],
          ['It can be automated by the version control system', false],
          ['It does not require understanding the code', false],
          ['It finds the earliest cause rather than a symptom', false]],
        'A thousand commits is about ten steps, and a million rows narrows the same way.'),
      mcq('A useful hypothesis differs from a vague one in that it:',
        [['Could be shown to be wrong', true],
          ['Names the component responsible', false],
          ['Explains every symptom observed', false],
          ['Suggests a fix that can be applied', false]],
        '"Something is wrong with caching" cannot be tested; "stale rows after an update" can.'),
      mcq('The confirmation trap in debugging is:',
        [['Gathering support for a theory instead of testing it', true],
          ['Believing the bug report rather than the code', false],
          ['Assuming the most recent change caused it', false],
          ['Trusting a test that passes intermittently', false]],
        'Ask what you would see if you were wrong, and go and look for that.'),
      mcq('Why change only one thing at a time?',
        [['Otherwise you cannot say which change mattered', true],
          ['Otherwise the system becomes unstable', false],
          ['Otherwise the tests take longer to run', false],
          ['Otherwise the changes are hard to revert', false]],
        'Four changes that fix it teach you nothing that transfers to the next bug.'),
    ],
    checkpoint: [
      mcq('Why write down what you have already ruled out?',
        [['Memory of it is the first thing to go', true],
          ['It is required for the incident report', false],
          ['It helps whoever reviews the fix', false],
          ['It shows how long the work took', false]],
        'An hour in, you will otherwise test the same thing twice.'),
      mcq('A report is wrong across a million rows. The most useful next step is:',
        [['Find out whether it is wrong for one row', true],
          ['Read the report generation code carefully', false],
          ['Compare the output with last month’s report', false],
          ['Check whether the source data changed', false]],
        'A one-row reproduction is a debuggable one; a million-row one is not.'),
      mcq('What makes a question to a colleague answerable?',
        [['What you tried, and what you expected', true],
          ['A full description of the system', false],
          ['How urgent the problem is for you', false],
          ['The exact error message received', false]],
        'It shows where you are stuck, so they start there rather than at the beginning.'),
    ],
  },

  /* ── Reading what the system told you ───────────────────────────────────────────────── */
  {
    unitCode: 'T3_COMPLEX_DEBUG_READING_A_STACK_TRACE',
    notes: `Before investigating, read what the system already recorded. Most of the time it has
told you, and the line was skipped because it looked long.

## The stack trace

Read it in this order:

1. **The bottom.** The exception type and message. \`KeyError: 'tenant_id'\` is a different
   problem from \`ConnectionRefusedError\`, and you have narrowed it already.
2. **Upwards, for the first line in YOUR code.** Frames inside libraries are usually where the
   symptom surfaced; your line is usually where the cause is.
3. **The cause chain.** \`During handling of the above exception, another occurred\` means two
   things went wrong. The first one is normally the real one.

**What a trace does not tell you** is the values. It says \`orders[key]\` raised a KeyError, not
what \`key\` was — which is why an error log that carries the identifiers is worth so much more
than one that carries only the trace.

## The logs

**Find the request, then read forward.** With a correlation id this is one filter. Without one,
a hundred requests are interleaved and you are reading a hundred stories at once.

**Read what happened before the error, not only the error.** The failure is usually the
consequence; the cause is three lines earlier and looks unremarkable.

**Absence is evidence.** A step that should have logged and did not is as informative as an
error. It tells you execution never reached there.

## The metrics

They answer a question logs answer badly: **when did this start, and what else changed then?**

- Error rate rising from 15:42 — what deployed at 15:40?
- Latency up and throughput flat — something is slower, not busier.
- One instance behaving differently from nineteen — it is that instance, not the code.

**Percentiles, not averages.** The mean is fine while the slowest one in a hundred cannot use
the product at all.

## The order worth following

**Metrics to find when and where. Logs to find what happened. The trace to find the line.** Going
straight to the trace tells you where it surfaced; the other two tell you why it started.`,
    mcqs: [
      mcq('Where should you start reading a stack trace?',
        [['At the bottom, with the type and message', true],
          ['At the top, with the outermost frame', false],
          ['At the first library frame it mentions', false],
          ['At the longest frame in the list', false]],
        'The exception type narrows the problem before you have read any of your own code.'),
      mcq('"During handling of the above exception, another occurred" means:',
        [['Two things went wrong, and the first is usually the real one', true],
          ['The exception was caught and re-raised unchanged', false],
          ['The error handler itself is missing a case', false],
          ['The same failure happened twice in sequence', false]],
        'The second is often the handler failing on the first, which is a distraction.'),
      mcq('A step that should have logged and did not tells you:',
        [['Execution never reached that point', true],
          ['The log level excluded that line', false],
          ['The write to the log file failed', false],
          ['The step completed without incident', false]],
        'Absence is evidence, and it is the kind people skip past.'),
      mcq('Which question do metrics answer better than logs?',
        [['When did this start, and what changed then', true],
          ['Which record caused the failure', false],
          ['What the value was at the time', false],
          ['Which user was affected by it', false]],
        'Error rate rising at 15:42 against a deploy at 15:40 is an answer in one glance.'),
    ],
    checkpoint: [
      mcq('What does a stack trace not tell you?',
        [['The values involved at the time', true],
          ['Which line raised the exception', false],
          ['The type of exception raised', false],
          ['The sequence of calls that led there', false]],
        'Which is why a log carrying the identifiers is worth more than one carrying only the trace.'),
      mcq('One instance behaves differently from nineteen others. That suggests:',
        [['The instance, rather than the code', true],
          ['A recent deployment to all of them', false],
          ['A dependency shared between them', false],
          ['A problem with the load balancer', false]],
        'Same code everywhere; the difference is the environment on that box.'),
      mcq('The order this unit recommends is:',
        [['Metrics, then logs, then the trace', true],
          ['The trace, then logs, then metrics', false],
          ['Logs, then the trace, then metrics', false],
          ['Whichever of the three is fastest to reach', false]],
        'The trace says where it surfaced; the other two say when and why it started.'),
    ],
  },

  /* ── Cannot reproduce ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T3_COMPLEX_DEBUG_CANNOT_REPRODUCE',
    notes: `"It works on my machine" is true and useless. The question worth asking is **what is
different**, and there are only four answers.

## 1. Timing

Two things that happen in a fixed order on your laptop can interleave under load.

    if not exists(key):        # two requests both reach here
        create(key)            # both create it

**Signals:** intermittent, worse under load, disappears when you add logging (which changes the
timing). **Narrowing:** run the operation concurrently on purpose; add an artificial delay
between the check and the act and see whether the failure becomes reliable.

## 2. Data

Your test data is clean. Production data is fifteen years old and was migrated twice.

Nulls where the column is "required", strings in a numeric field, an emoji in a name, a record
whose parent was deleted in 2019.

**Signals:** specific records fail and most do not. **Narrowing:** get the failing record's id
from the log — which is the entire argument for logging identifiers — and load exactly that one
locally.

## 3. Concurrency and scale

A hundred rows fit in memory and ten million do not. A loop that is fine at ten iterations makes
ten thousand queries at ten thousand.

**Signals:** it degrades rather than failing, or it fails only for the largest customer.
**Narrowing:** measure with production-sized data rather than reasoning about it.

## 4. Environment

Different version, different setting, different time zone, different locale, different
filesystem case-sensitivity, a clock that has drifted, a machine with less memory.

**Signals:** it fails consistently in one place and never in another. **Narrowing:** diff the
two environments — versions, settings, and the effective configuration each logged at startup.

## Working when you cannot reproduce

**Narrow WHEN instead of HOW.** Which users, which times, which records, which instances, which
requests? Every answer removes a class of cause. "Only tenants created before March" is an
enormous clue.

**Add observability and wait.** If the log does not say enough, make it say more and let the bug
happen again. A day of waiting beats a week of guessing — and this is why the error-design unit
insists on identifiers in the log.

**Reproduce it in a test once you know.** A bug fixed without a reproducing test will come back,
because nothing prevents it, and the next person will not know it ever happened.`,
    mcqs: [
      mcq('A bug that disappears when you add logging most likely involves:',
        [['Timing', true], ['Data', false], ['Configuration', false], ['Memory', false]],
        'The logging changed the timing, which is itself a strong piece of evidence.'),
      mcq('Specific records fail and most do not. Which of the four is it?',
        [['Data', true], ['Timing', false], ['Environment', false], ['Scale', false]],
        'Fifteen-year-old data migrated twice holds shapes your test fixtures never do.'),
      mcq('When a bug will not reproduce, what should you narrow instead?',
        [['When and for whom it happens', true],
          ['Which component contains the fault', false],
          ['How severe the impact is', false],
          ['How often it has occurred', false]],
        '"Only tenants created before March" removes a whole class of cause.'),
      mcq('Why fix a bug only once you have a reproducing test?',
        [['Without one, nothing prevents it returning', true],
          ['The fix cannot be reviewed otherwise', false],
          ['The cause may have been misidentified', false],
          ['The test proves the bug was important', false]],
        'And the next person will not know it ever happened.'),
    ],
    checkpoint: [
      mcq('What are the four reasons a bug appears only in production?',
        [['Timing, data, scale and environment', true],
          ['Load, memory, network and storage', false],
          ['Versions, settings, secrets and access', false],
          ['Users, volume, hardware and latency', false]],
        'Every "works on my machine" is one of these four, which is why the list is worth holding.'),
      mcq('The log says a record failed but not which one. What does that cost you?',
        [['The ability to load that record locally', true],
          ['The ability to count how many failed', false],
          ['The ability to alert on the failure', false],
          ['The ability to retry the operation', false]],
        'The id is the whole argument for logging identifiers rather than just the message.'),
      mcq('"Add observability and wait" is a reasonable strategy because:',
        [['A day of waiting beats a week of guessing', true],
          ['The bug may resolve itself in the meantime', false],
          ['It avoids changing production code', false],
          ['It produces evidence for the incident report', false]],
        'When the log does not say enough, the cheapest move is making it say more.'),
    ],
  },

  /* ── Debugging the debugging ────────────────────────────────────────────────────────── */
  {
    unitCode: 'T3_COMPLEX_DEBUG_DEBUGGING',
    notes: `This unit is about the ways an investigation itself goes wrong. Every one of these
wastes hours, and none of them feels like a mistake at the time.

## 1. Fixing the symptom

    total = calculate(order)
    if total < 0:
        total = 0            # <-- the negative is now invisible

The number stopped being negative and whatever produced a negative is still doing it. **Tell:**
the fix is a guard against a value rather than a change to what produced it. Ask what has to be
true for this branch to run, and go and fix that.

## 2. The theory that survives the evidence

You believe it is the cache. You check, and the cache is not involved. You conclude the check
was wrong and keep going. **Tell:** you have explained away more than one piece of contrary
evidence. Two is a signal to abandon the theory rather than defend it.

## 3. Changing several things at once

Three changes, the bug goes away, and you cannot say which mattered — so you keep all three, two
of which do nothing and one of which will confuse the next reader. **Tell:** you cannot state
which change fixed it.

## 4. Trusting the report over the observation

"It never works" almost always means "it did not work for me, once, on Tuesday". Reproduce it
yourself before accepting the shape of the problem. Half of all unreproducible bugs are
reproducible once you know what the reporter actually did.

## 5. Debugging the wrong layer

Hours on application code when the cause is a proxy timeout, a DNS change or a clock. **Tell:**
nothing in the code explains the behaviour, and the answer is usually to widen the search rather
than read the same file again.

## 6. Not believing the simple explanation

It is very often the recent deploy, a typo in a setting, or the wrong environment. Check the
cheap explanations first — they cost a minute and they are right surprisingly often.

## The habit

**Say out loud what you currently believe and what would disprove it.** Most of the failures
above are a belief that was never stated, so it was never tested. The rubber duck works because
it forces the statement, not because it listens.`,
    mcqs: [
      mcq('`if total < 0: total = 0` as a fix is a problem because:',
        [['Whatever produced a negative still does', true],
          ['Zero is not a valid total for an order', false],
          ['The branch will never be covered by tests', false],
          ['The comparison should use a tolerance', false]],
        'A guard against a value rather than a change to what produced it.'),
      mcq('You have explained away two pieces of contrary evidence. That means:',
        [['The theory should be abandoned, not defended', true],
          ['The evidence is being measured incorrectly', false],
          ['A third piece is needed to be certain', false],
          ['The theory needs to be narrowed further', false]],
        'One can be a bad test. Two is the signal.'),
      mcq('Three changes made together and the bug disappears. The problem is that:',
        [['You cannot say which change mattered', true],
          ['The other two changes may cause new bugs', false],
          ['The fix cannot be reviewed properly', false],
          ['The commit will be too large to revert', false]],
        'Two of them do nothing and will confuse whoever reads this next.'),
      mcq('"It never works" from a reporter usually means:',
        [['It failed for them once, in a way they did not note', true],
          ['The feature is broken for every user', false],
          ['They are using an outdated version', false],
          ['The problem is intermittent by nature', false]],
        'Half of all unreproducible bugs reproduce once you know what they actually did.'),
    ],
    checkpoint: [
      mcq('Nothing in the application code explains the behaviour. You should:',
        [['Widen the search beyond the application', true],
          ['Read the same code more carefully', false],
          ['Add more logging to that module', false],
          ['Assume the report is inaccurate', false]],
        'Proxy timeouts, DNS, clocks and configuration all produce behaviour with no code to blame.'),
      mcq('Why does explaining the problem aloud help, even to nobody?',
        [['It forces you to state the belief you are testing', true],
          ['It slows you down enough to think clearly', false],
          ['It creates a record of the investigation', false],
          ['It identifies which words are imprecise', false]],
        'Most of these failures are a belief that was never stated, so it was never tested.'),
    ],
  },

  /* ── Practice ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T3_COMPLEX_DEBUG_PRACTICE',
    notes: `Debugging cannot be practised by reading about it. These exercises give you failing
behaviour and ask you to narrow rather than to read.

**First, classify these. Which of the four reasons is each — timing, data, scale or environment?**

1. A nightly job succeeds locally and fails on the server with a path error.
2. A total is correct for every customer except one, who has been with you since 2011.
3. A page is fine in testing and times out for the largest account.
4. Two users clicking "claim" within a second both get the same reward.
5. A date renders a day earlier for some users and correctly for others.

Answers: 1 environment, 2 data, 3 scale, 4 timing, 5 environment — a time zone, which is the
one most often misread as data.

**Then the code below.** The first is a classic check-then-act where the guard does not hold. The
second asks you to narrow by bisection rather than by reading, on input large enough that
reading is not practical.`,
    coding: [
      {
        title: 'Make the guard actually hold',
        description: `A counter is meant to stop at a limit. Interleaved updates get past the
check, because the check and the change are two separate steps.

Simulate it: read a limit and a list of increments, apply them through \`claim\`, and print the
final count. \`claim\` must never take the count above the limit.

The harness applies increments in an order designed to slip past a naive check.`,
        starter: `import sys

class Counter:
    def __init__(self, limit):
        self.limit, self.count = limit, 0

    def claim(self, amount):
        # TODO: this check and the change below must not be separable
        if self.count < self.limit:
            self.count = self.count + amount
        return self.count

line = sys.stdin.readline().split()
limit, amounts = int(line[0]), [int(x) for x in line[1:]]
c = Counter(limit)
for a in amounts:
    c.claim(a)
print(c.count)
`,
        language: 'python',
        tests: [
          { input: '10 3 3 3\n', expectedOutput: '9' },
          { input: '10 3 3 3 3\n', expectedOutput: '10' },
          { input: '5 4 4\n', expectedOutput: '5' },
          { input: '5 1 1 1 1 1 1 1\n', expectedOutput: '5', isHidden: true },
          { input: '0 5\n', expectedOutput: '0', isHidden: true },
        ],
      },
      {
        title: 'Bisect to the bad record',
        description: `A batch of records fails to process and the error says only that the batch
failed. Rather than reading all of them, narrow by halving.

Read a line of integers. Exactly one is invalid — a negative. Find its **index** using at most
\`ceil(log2(n)) + 1\` calls to \`batch_ok\`, and print the index. \`batch_ok\` is the only thing
allowed to inspect the values.`,
        starter: `import sys, math

calls = 0
def batch_ok(values):
    global calls
    calls += 1
    return all(v >= 0 for v in values)

nums = [int(x) for x in sys.stdin.readline().split()]

# TODO: halve the range until one record remains. Do not read nums directly.
index = 0

budget = math.ceil(math.log2(len(nums))) + 1 if nums else 1
print(index if calls <= budget else f'too many calls: {calls} > {budget}')
`,
        language: 'python',
        tests: [
          { input: '1 2 -3 4\n', expectedOutput: '2' },
          { input: '-1 2 3 4\n', expectedOutput: '0' },
          { input: '1 2 3 4 5 6 7 -8\n', expectedOutput: '7' },
          { input: '5 5 5 5 5 -1 5 5 5 5\n', expectedOutput: '5', isHidden: true },
          { input: '-9\n', expectedOutput: '0', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Complex Debugging Practice',
      description: 'Fix a check-then-act race, narrow by bisection, and classify five production-only bugs.',
      instructions: `Complete both coding exercises above, then answer in a short file:

1. The five scenarios in the notes, classified, one sentence of reasoning each.
2. Scenario 5 is the one most often misclassified. Say what it is usually mistaken for and why.
3. For the first exercise: explain why adding a log line between the check and the change would
   make the bug *harder* to reproduce, and what that tells you about the class of fault.
4. For the second: say how many calls a linear scan would have needed on the ten-element case,
   and what that ratio looks like at a million.`,
      rubric: [
        { criterion: 'The guard holds', description: 'The limit is never exceeded, however the increments interleave.', maxPoints: 25 },
        { criterion: 'Bisection within budget', description: 'The bad index is found inside the allowed number of calls.', maxPoints: 25 },
        { criterion: 'Five classified', description: 'Each assigned to timing, data, scale or environment with a reason.', maxPoints: 20 },
        { criterion: 'The misclassified case', description: 'Explains what it is mistaken for and why the confusion is natural.', maxPoints: 15 },
        { criterion: 'Why logging hides it', description: 'Connects the changed timing to the class of fault.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

class Counter:
    def __init__(self, limit):
        self.limit, self.count = limit, 0

    def claim(self, amount):
        if self.count < self.limit:
            self.count = self.count + amount
        return self.count

line = sys.stdin.readline().split()
limit, amounts = int(line[0]), [int(x) for x in line[1:]]
c = Counter(limit)
for a in amounts:
    c.claim(a)
print(c.count)
`,
        tests: [
          { input: '10 3 3 3\n', expectedOutput: '9' },
          { input: '10 3 3 3 3\n', expectedOutput: '10' },
          { input: '5 1 1 1 1 1 1 1\n', expectedOutput: '5', isHidden: true },
          { input: '0 5\n', expectedOutput: '0', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 25,
      },
    },
    checkpoint: [
      mcq('A nightly job works locally and fails on the server with a path error. That is:',
        [['Environment', true], ['Data', false], ['Timing', false], ['Scale', false]],
        'A different working directory, which is why relative paths break in deployed services.'),
      mcq('A date renders a day earlier for some users. This is most often misread as:',
        [['A data problem, when it is a time zone', true],
          ['A timing problem, when it is data', false],
          ['A scale problem, when it is timing', false],
          ['An environment problem, when it is data', false]],
        'The record looks wrong, so the instinct is to blame the record rather than the rendering.'),
      mcq('Bisecting ten records takes about four calls. A linear scan takes:',
        [['Up to ten', true], ['About five', false], ['About four', false], ['Exactly two', false]],
        'At a million the same comparison is twenty against a million, which is the point.'),
    ],
  },

  /* ── Mini project ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T3_COMPLEX_DEBUG_MINI_PROJECT',
    notes: `Find a real bug in code you did not write, and document the investigation rather than
the fix.

The brief values the **method** over the outcome, deliberately. A student who fixes a bug by
luck has learned nothing transferable; one who narrowed it in five recorded steps can do it
again on a system they have never seen. The write-up is most of the marks, and a dead end you
recorded honestly scores better than a tidy story that omits it.

Budget around two hours, most of it on the investigation log.`,
    assignment: {
      title: 'Mini Project — An Investigation, Recorded',
      description: 'Find and fix a real bug in unfamiliar code, and record how you narrowed it.',
      instructions: `**The brief**

Find a genuine bug in code **you did not write**. Options, in rough order of value:

- An open issue in a small open-source project you can run locally.
- A classmate's project, with permission.
- A deliberately broken codebase provided by your instructor.

It must be a bug you do not already understand. Introducing one yourself and then finding it
defeats the exercise.

**Part one — the investigation log**

Record it **as you go**, not afterwards. For each step:

1. What you believed at that point.
2. What test you ran, and **why that test could have disproved you**.
3. What you observed.
4. What you then believed.

Include the dead ends. A log with no wrong turns has been rewritten, and the wrong turns are
where the method shows.

**Part two — the narrowing**

5. Show at least one place where you **halved** the search rather than stepping through it —
   in the code path, the history, the data or the configuration. Say what the alternative would
   have cost.
6. State the cause in one sentence, at the level of the real mistake rather than the symptom.

**Part three — the fix and the guard**

7. Fix the cause, not the symptom. If your fix is a guard against a value, say why the thing
   producing that value cannot be changed.
8. Add a test that **fails before the fix and passes after**. Show both runs.
9. Say what would have made this bug faster to find: a log line, an identifier, a metric, a
   clearer error. Then add that too if you can.

**What to submit**

1. The investigation log, with dead ends intact.
2. The fix and the reproducing test, as separate commits.
3. A paragraph on what would have made it faster to find.

**How this is judged**

Part one carries the most weight. The fix is worth less than the record of how you got there.`,
      rubric: [
        { criterion: 'A real, unfamiliar bug', description: 'Found in code the student did not write and did not already understand.', maxPoints: 15 },
        { criterion: 'The investigation log', description: 'Belief, test, observation, revised belief — recorded as it happened.', maxPoints: 25 },
        { criterion: 'Dead ends kept', description: 'Wrong turns are present and honestly described.', maxPoints: 10 },
        { criterion: 'Narrowing shown', description: 'At least one halving, with what the alternative would have cost.', maxPoints: 15 },
        { criterion: 'Cause not symptom', description: 'The fix addresses what produced the fault, stated in one sentence.', maxPoints: 20 },
        { criterion: 'A test that failed first', description: 'Both runs shown: failing before the fix, passing after.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Why does this brief value the investigation log over the fix?',
        [['A method transfers to a system you have never seen', true],
          ['Fixes are easier for an assessor to verify', false],
          ['The bug may be fixed upstream anyway', false],
          ['Logs demonstrate the time that was spent', false]],
        'Fixing by luck teaches nothing; narrowing in five recorded steps can be done again.'),
      mcq('An investigation log with no wrong turns suggests:',
        [['It was written afterwards rather than during', true],
          ['The investigation was efficient and focused', false],
          ['The bug was simpler than expected', false],
          ['The student understood the code already', false]],
        'The wrong turns are where the method shows, which is why they carry marks.'),
      mcq('The brief asks what would have made the bug faster to find. That is because:',
        [['The answer is usually a missing log line or identifier', true],
          ['It demonstrates understanding of the codebase', false],
          ['It gives the maintainers useful feedback', false],
          ['It shows the bug was hard to locate', false]],
        'The cheapest observability improvement is specified precisely by the incident you just had.'),
    ],
  },
];
