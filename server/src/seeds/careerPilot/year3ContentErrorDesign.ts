/**
 * T3_ERROR_DESIGN and T3_DEPENDENCIES — ten units. Year 3.
 *
 * ── WHY THESE TWO SIT TOGETHER ────────────────────────────────────────────────────────────
 *
 * Both are about the parts of a system you do not control. Error design is what happens when
 * something you depend on does not do what you asked; dependency management is the decision to
 * depend on it at all. A student who has only written code that works on their own machine has
 * met neither.
 *
 * ── THE LINE ERROR DESIGN TAKES ───────────────────────────────────────────────────────────
 *
 * That the decision is which failures matter, and that it must be made deliberately rather
 * than discovered. A failed payment and a failed thumbnail are not the same event, and a
 * codebase that treats them alike has either an outage over a missing image or silent data loss
 * over a swallowed exception.
 *
 * The strongest position here is that a swallowed error is worse than a crash. Students find
 * that counterintuitive — a crash looks like the worse outcome — so the unit spends its time on
 * why silence costs more.
 *
 * ── THE LINE DEPENDENCIES TAKES ───────────────────────────────────────────────────────────
 *
 * That `npm install` is a permanent commitment dressed as a four-second command. Three units,
 * no closing practice or project, because the skill is judgement rather than technique and the
 * assessment belongs in the checkpoints.
 *
 * Error design attributes to ERROR_HANDLING_DESIGN, except LOGGING_THE_FAILURE which measures
 * LOGGING_DIAGNOSTICS. Dependencies is a single-skill topic, so the seeder derives it.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const ERROR_DESIGN_BUNDLES: PilotBundle[] = [
  /* ══ T3_ERROR_DESIGN ══════════════════════════════════════════════════════════════════ */

  {
    unitCode: 'T3_ERROR_DESIGN_FAIL_LOUD_OR_DEGRADE',
    notes: `Not every failure deserves the same response, and deciding which is which is the
whole of error design.

**Two failures, same afternoon:**

    charge_card(order)        # the payment provider times out
    make_thumbnail(upload)    # the image library cannot read the file

Treat them alike and you get one of two bad outcomes. Fail hard on both, and a corrupt avatar
takes down the upload. Degrade on both, and a customer's card is never charged while the order
says confirmed.

**The question that separates them:** *if this fails and we continue, is anything now wrong that
we cannot see?*

- Payment fails, order proceeds → yes. The system believes something false.
- Thumbnail fails, upload proceeds → no. A picture is missing and everything else is true.

**Three responses, chosen deliberately:**

| Response | When | Example |
|---|---|---|
| Fail the operation | Continuing would make the state wrong | Payment, permission checks, writes |
| Degrade | The part is optional and its absence is visible | Recommendations, thumbnails, analytics |
| Retry, then decide | It might work on the next attempt | A network read, a lock, a rate limit |

**Degrading properly means the absence is visible.** A recommendations panel that renders empty
is a degraded page. A recommendations panel that renders three stale items with no indication is
a lie.

**Fail-closed is the default for anything about permission.** If your authorization check cannot
complete, refuse. An exception in a permission lookup must not become a yes — that turns
"cause an error" into a way past the check.

**The decision belongs at design time.** Written during an incident, at speed, under pressure,
it becomes a try/except that returns None, and the person who wrote it will not be the one who
finds out what that cost.

**Write it down where the code is.** One comment saying "this is optional; if it fails the page
still means what it says" survives the refactor that a habit does not.`,
    mcqs: [
      mcq('The question that decides how to handle a failure is:',
        [['Would continuing make something silently untrue', true],
          ['How likely the failure is to happen again', false],
          ['Whether the user will notice the problem', false],
          ['How long the operation takes to retry', false]],
        'Payment failing and the order proceeding makes the system believe something false.'),
      mcq('A recommendations panel showing stale items with no indication is:',
        [['A lie, rather than a degraded page', true],
          ['An acceptable form of graceful degradation', false],
          ['Better than showing the panel as empty', false],
          ['A caching problem rather than an error one', false]],
        'Degrading properly means the absence is visible to whoever is reading the page.'),
      mcq('An authorization check that cannot complete should:',
        [['Refuse the request', true],
          ['Allow the request', false],
          ['Retry until it completes', false],
          ['Log it and continue', false]],
        'Otherwise causing an error becomes a way past the check.'),
      mcq('Why should the fail-or-degrade decision be made at design time?',
        [['Made in an incident it becomes a swallowed exception', true],
          ['It affects which libraries the team can use', false],
          ['The tests cannot be written until it is made', false],
          ['It determines the structure of the whole module', false]],
        'And the person who wrote it will not be the one who finds out what it cost.'),
    ],
    checkpoint: [
      mcq('A thumbnail generator fails on one upload. The right response is usually to:',
        [['Continue, with the missing image visible', true],
          ['Fail the whole upload operation', false],
          ['Retry until the image is produced', false],
          ['Substitute a previously generated image', false]],
        'Nothing the system believes is now false. A picture is missing, and it says so.'),
      mcq('What makes a swallowed exception worse than a crash?',
        [['The damage continues with nobody knowing', true],
          ['The crash would have been faster to fix', false],
          ['Users see an error page rather than data', false],
          ['The stack trace is lost when it is caught', false]],
        'A crash is loud at the moment of failure. Silence turns it into a discovery weeks later.'),
      mcq('Recording the fail-or-degrade decision as a comment matters because:',
        [['It survives a refactor that a habit does not', true],
          ['Reviewers require a justification for each', false],
          ['It documents the error for the support team', false],
          ['The linter can then check the handling', false]],
        'One sentence beside the code outlives the reasoning that produced it.'),
    ],
  },

  {
    unitCode: 'T3_ERROR_DESIGN_RETRIES_AND_TIMEOUTS',
    notes: `A retry is the most reasonable-looking way to make an outage worse.

**Why.** A service slows down. Every client notices and retries. The retries are load, so it
slows further, so more clients retry. The original problem might have been a ten-second blip;
what took the service down for twenty minutes was its own clients.

**Three rules, and the reason for each.**

**1. Bound the attempts.** An unbounded retry loop holds a thread, and a service with every
thread waiting is a service that is down for reasons unrelated to the original fault.

    for attempt in range(3):        # not while True
        ...

**2. Wait longer each time.** Immediate retries are the amplification. Doubling the wait gives
the other side room to recover:

    delay = base * (2 ** attempt)

**3. Add jitter.** Without it, a thousand clients that failed together retry together, and the
recovering service is hit by a thousand simultaneous requests:

    delay = base * (2 ** attempt) * random.uniform(0.5, 1.5)

**Retry only what might succeed.** A 500 might. A 400 will not — the request is wrong and it
will be wrong next time. Retrying a rejected password is not resilience, it is a lockout.

**Every outbound call needs a timeout.** Without one, a slow dependency consumes your threads
until you have none, and *slow is worse than down*: a service that returns an error frees the
caller immediately, while one that hangs holds it.

    requests.get(url, timeout=5)      # not requests.get(url)

**And the part students skip: retries need the operation to be safe to repeat.** A lost response
looks exactly like a failed request, so the first attempt may have succeeded:

    POST /payments        # timed out — did it charge?
    POST /payments        # retry — now possibly two charges

The fix is an idempotency key the caller sends and the server checks. Without it, the retry is
not a retry, it is a second operation.

**The circuit breaker, briefly.** After enough consecutive failures, stop calling for a while and
fail immediately. It lets the other side recover and stops your users waiting for a timeout you
already know is coming.`,
    mcqs: [
      mcq('How does a retry make an outage worse?',
        [['The retries become load on a struggling service', true],
          ['The retried requests arrive out of order', false],
          ['The client holds the connection open longer', false],
          ['The failures are recorded multiple times', false]],
        'A ten-second blip becomes twenty minutes, and the cause is the clients.'),
      mcq('Jitter is added to the retry delay so that:',
        [['Clients that failed together do not retry together', true],
          ['The average wait time is reduced overall', false],
          ['The delay cannot be predicted by an attacker', false],
          ['Each attempt gets a different server', false]],
        'Without it, the recovering service meets a thousand simultaneous requests.'),
      mcq('Which failure is worth retrying?',
        [['A server error that might not recur', true],
          ['A rejected password from the user', false],
          ['A validation failure on the request', false],
          ['A permission denied from the service', false]],
        'The others are wrong now and will be wrong next time.'),
      mcq('Why is a slow dependency worse than one that is down?',
        [['A hang holds your threads; an error frees them', true],
          ['A slow response is harder to detect than none', false],
          ['A hang cannot be reported to monitoring', false],
          ['A slow call consumes more memory per request', false]],
        'Which is why every outbound call needs a timeout, not only a retry.'),
    ],
    checkpoint: [
      mcq('A POST times out and is retried. What might now be true?',
        [['The operation happened twice', true],
          ['The operation happened zero times', false],
          ['The second request will be rejected', false],
          ['The server will merge the two requests', false]],
        'A lost response is indistinguishable from a failed request, so the first may have succeeded.'),
      mcq('What makes a retry genuinely safe?',
        [['The operation is safe to repeat', true],
          ['The delay between attempts is long', false],
          ['The number of attempts is bounded', false],
          ['The failure was a server error', false]],
        'Bounds and backoff protect the other side. Idempotency protects the data.'),
      mcq('A circuit breaker helps because it:',
        [['Stops calling, so both sides recover', true],
          ['Retries with a much longer delay', false],
          ['Routes the call to another instance', false],
          ['Caches the last successful response', false]],
        'The other side gets room, and your users stop waiting for a timeout you expect.'),
    ],
  },

  {
    unitCode: 'T3_ERROR_DESIGN_WHAT_THE_CALLER_IS_TOLD',
    notes: `An error has two audiences and they need different things. Serving one message to
both is how you get either a useless message or a leak.

**The person using it** needs to know what to do next:

    Something went wrong.                                  # useless
    That card was declined. Try another payment method.    # actionable

**The engineer fixing it** needs everything: the stack, the inputs, the identifiers, the
downstream response. None of that belongs on a page a stranger can read.

**The trick that serves both** is a reference:

    Out:  "Something went wrong saving your order. Quote reference 7f3a9c."
    Log:  [7f3a9c] OrderService.save failed for order 8812, tenant 44 — DB timeout after 5s

The user has something to say to support; support has something to search for; nothing internal
was published.

**What must never leave the server:**

- Stack traces. They map your code, your paths and your library versions.
- Database errors. \`duplicate key on users_email_idx\` names your schema.
- Internal hostnames, ports and file paths.
- Whether a record exists, where existence is itself sensitive.

**For an API, the error is part of the contract.** Callers write code against it, so it needs a
**stable code** as well as a message:

    { "code": "CARD_DECLINED", "message": "That card was declined." }

Without the code, integrators match on the message text — and your next copy edit breaks their
integration. That is not hypothetical; it is one of the commonest ways a small change becomes an
outage for somebody else.

**Report all the validation failures at once.** Returning the first one means a user fixes one
field per attempt, and four round trips to submit one form.

**The wording of a failed login is a security decision**, covered in the authentication topic:
one message for both "no such user" and "wrong password", or the form becomes a way to discover
who has an account.`,
    mcqs: [
      mcq('What does a reference id in an error message achieve?',
        [['Support can find the detail the user cannot see', true],
          ['The error can be retried automatically later', false],
          ['The message becomes shorter to display', false],
          ['The user can diagnose the problem themselves', false]],
        'The user has something to quote; nothing internal was published.'),
      mcq('Why must an API error carry a stable code, not only a message?',
        [['Callers branch on the code rather than the words', true],
          ['Codes are quicker for the server to produce', false],
          ['Messages cannot be translated accurately', false],
          ['Codes can be indexed by the log system', false]],
        'Without one, integrators match on your text and a copy edit breaks them.'),
      mcq('Returning only the first validation failure means:',
        [['The user fixes one field per attempt', true],
          ['The response is faster to generate', false],
          ['The remaining errors are never checked', false],
          ['The form must be submitted twice', false]],
        'Four round trips to submit one form, and each one feels like a new failure.'),
      mcq('A database error reaching the user is a problem because it:',
        [['Names your schema to a stranger', true],
          ['Is too technical to be understood', false],
          ['Suggests the system is unreliable', false],
          ['Cannot be translated for other locales', false]],
        '"duplicate key on users_email_idx" is reconnaissance you handed over free.'),
    ],
    checkpoint: [
      mcq('"Something went wrong" is expensive because:',
        [['Every occurrence costs somebody an investigation', true],
          ['It looks unprofessional to the customer', false],
          ['It cannot be logged in a structured way', false],
          ['It gives support no code to reference', false]],
        'Written once, paid every time it appears, by whoever must work out what happened.'),
      mcq('An error message should tell the user:',
        [['Something they can actually do next', true],
          ['What went wrong inside the system', false],
          ['How long the problem is expected to last', false],
          ['Which component produced the failure', false]],
        'Retry, fix the field, or contact support with this id.'),
      mcq('Who is the second audience for an error, besides the user?',
        [['Whoever will have to fix it', true],
          ['The monitoring system collecting it', false],
          ['The support team answering calls', false],
          ['The developer who wrote the code', false]],
        'They need everything, which is exactly what the user must not be given.'),
    ],
  },

  {
    unitCode: 'T3_ERROR_DESIGN_LOGGING_THE_FAILURE',
    notes: `A failure is only explainable if it left something behind. At three in the morning,
with the incident over and the system back up, the log is all you have.

**Write for a stranger under pressure.** They have never seen this code, do not have it open,
and want to know what happened. Every rule below follows from that picture.

**Log the outcome, not the intention:**

    log.info("saving order")           # says you were about to
    log.info("order saved", ...)       # says it happened

**Include what identifies the case:**

    "failed to save"                                    # confirms a problem exists
    "failed to save order 8812 (tenant 44): DB timeout"  # can be investigated

**Log the error object, not its message.** \`log.error(str(e))\` throws away the one line naming
the failing call:

    log.error("order save failed", exc_info=True)

**A correlation id, or the log is unreadable under load.** A hundred requests interleave, so
without an id shared by every line of one request you have a hundred stories in one column:

    [req-9f2c] order 8812 received
    [req-9f2c] payment authorised
    [req-9f2c] DB timeout after 5s

That id must be passed into background jobs explicitly — whatever carries it implicitly does not
cross that boundary.

**Never log credentials, tokens or personal detail.** Logs are copied, shipped to third parties
and widely readable. Access nobody would grant to the database is routinely granted to its logs.
Log the identifier, not the person.

**Log the failure once.** An error logged at every layer as it travels up appears as five
separate incidents. Add context on the way; write the line where it is handled.

**Severity is about the response required.** A failed login is not an error — it is the login
form working. Log expected outcomes at error level and the channel becomes noise, which is how
teams end up not reading it at all.

**And the loop:** log the first failure, count the rest, log the summary. A retry loop that logs
each attempt turns one bad dependency into two million lines.`,
    mcqs: [
      mcq('Logging `str(e)` rather than the error object loses:',
        [['The line naming the failing call', true],
          ['The timestamp of the failure', false],
          ['The severity level of the event', false],
          ['The identifier of the request', false]],
        'The traceback is usually the part that identifies the fault.'),
      mcq('Without a correlation id, a log under load gives you:',
        [['A hundred stories in one column', true],
          ['Lines recorded in the wrong order', false],
          ['Fewer lines than were actually written', false],
          ['Timestamps that cannot be compared', false]],
        'One request’s lines are interleaved with everybody else’s.'),
      mcq('An error logged at every layer as it travels up appears as:',
        [['Five incidents instead of one', true],
          ['A single well-documented failure', false],
          ['A duplicate that the system removes', false],
          ['A trace of the call stack', false]],
        'Add context on the way up; write the line where it is handled.'),
      mcq('Logging a failed login at error level is wrong because:',
        [['It is the login form working correctly', true],
          ['It records the username being tried', false],
          ['It happens too often to be stored', false],
          ['It should be a warning instead', false]],
        'Log expected outcomes as errors and the channel becomes noise nobody reads.'),
    ],
    checkpoint: [
      mcq('Who should you picture when writing a log line?',
        [['A stranger at 3am without the code open', true],
          ['Yourself, debugging it the next morning', false],
          ['The support agent taking the call', false],
          ['The tool that will parse the output', false]],
        'Every rule in this unit follows from that one picture.'),
      mcq('A retry loop that logs each attempt produces:',
        [['Two million lines from one bad dependency', true],
          ['A useful record of the recovery attempts', false],
          ['Slower retries because of the writing', false],
          ['Duplicate entries the system deduplicates', false]],
        'Log the first, count the rest, log the summary.'),
      mcq('Why should a log record an identifier rather than personal detail?',
        [['Logs are widely readable and often copied', true],
          ['Identifiers are shorter to store', false],
          ['Personal detail changes over time', false],
          ['Identifiers are easier to search for', false]],
        'Access nobody would grant to the database is routinely granted to its logs.'),
    ],
  },

  {
    unitCode: 'T3_ERROR_DESIGN_DEBUGGING',
    notes: `Error handling fails in ways that produce no error. That is what makes it worth its
own debugging unit.

## 1. The empty catch

    try:
        update_inventory(order)
    except Exception:
        pass

**Symptom:** stock counts drift, nothing appears in any log, and nobody can say when it started.
Somebody added this to quieten a flaky test and it shipped. A swallowed error is worse than a
crash because the damage continues with no record.

**How to find it:** search the codebase for empty except blocks and bare \`catch {}\`. It is a
five-minute search with a high hit rate.

## 2. The catch that is too wide

    try:
        total = compute_total(order)     # a typo here raises NameError
    except Exception:
        return DEFAULT_TOTAL

**Symptom:** orders quietly total zero. The block was written for a network failure and also
catches your own bugs, reporting them as the thing it expected.

## 3. The handler that allows on failure

    try:
        return permissions.check(user, doc)
    except Exception:
        return True                       # <-- fails open

**Symptom:** a user reaches something they should not, intermittently. Causing the check to throw
is now a way past it.

## 4. Context replaced rather than added

    except DatabaseError:
        raise ServiceError("something went wrong")     # cause discarded

**Symptom:** every log line reads "service error" and none of them says which query, which table
or which timeout. Keep the original as the cause.

## 5. The unbounded retry

    while True:
        try: return call()
        except: time.sleep(1)

**Symptom:** the service stops responding and the dependency never recovers, because every
thread is in this loop and all of them are hammering it.

## 6. The background job that fails silently

Nobody is watching a scheduled job. It fails, logs nothing anybody reads, and is discovered weeks
later when the data it produces is missing. Its failures must reach the same place a request
failure does.

## The habit

**Look for the handlers, not the throwers.** A bug in error handling is almost never in the code
that failed — it is in the code that decided what to do about it. Grep for \`except\`, read each
one, and ask what a reader would learn if this path ran tonight.`,
    mcqs: [
      mcq('Stock counts drift with nothing in the logs. What would you search for?',
        [['An except block that does nothing', true],
          ['A database constraint being violated', false],
          ['A race between two update paths', false],
          ['A cache serving stale quantities', false]],
        'Failures with no trace anywhere is the signature of a swallowed error.'),
      mcq('A try block written for a network failure also catches:',
        [['Your own programming mistakes', true],
          ['Only the errors you listed in it', false],
          ['Errors raised by the caller above', false],
          ['Nothing else, if the type is specific', false]],
        'A NameError inside it gets reported as the network failure it expected.'),
      mcq('`except: return True` around a permission check means:',
        [['Causing an error is a way past the check', true],
          ['The check is skipped when the service is slow', false],
          ['Permissions are cached on failure', false],
          ['The error is logged but not acted on', false]],
        'Fail-closed exists precisely so that an exception cannot become a yes.'),
      mcq('Where does a bug in error handling almost always live?',
        [['In the code that decided what to do', true],
          ['In the code that raised the error', false],
          ['In the library that failed underneath', false],
          ['In the logging configuration', false]],
        'Which is why the habit is to grep for the handlers rather than the throwers.'),
    ],
    checkpoint: [
      mcq('Every log line reads "service error" with no detail. What was done wrong?',
        [['The original error was replaced, not wrapped', true],
          ['The log level was set too low to record', false],
          ['The error type was too generic to raise', false],
          ['The logging happens before the detail exists', false]],
        'Keep the original as the cause; discarding it deletes what identified the fault.'),
      mcq('A background job has failed for three weeks unnoticed. What was missing?',
        [['Somewhere its failures reach a person', true],
          ['A retry when the job does not complete', false],
          ['A log statement inside the job body', false],
          ['A more frequent schedule for the job', false]],
        'Nobody watches a scheduled job. Its failures need the same route a request failure has.'),
    ],
  },

  {
    unitCode: 'T3_ERROR_DESIGN_PRACTICE',
    notes: `Error handling is the least-exercised code in most systems: the happy path runs a
thousand times a day and the catch block may never have run before the night it matters. These
exercises run it deliberately.

**Decide these before writing anything, one sentence each:**

1. A currency conversion service times out while placing an order priced in euros. Fail or degrade?
2. The "customers also bought" panel returns a 500. Fail or degrade?
3. A permission service times out. Fail or degrade?
4. An audit log write fails after the action succeeded. Fail or degrade?

Answers: 1 fail — charging a wrong amount is worse than refusing; 2 degrade — the page still
means what it says; 3 fail closed — an exception must not become a yes; 4 this one is genuinely
contested, and saying why is the point. The action happened and the record did not, so both
answers lose something.

**Then the code.** The first exercise is about bounding a retry and backing off. The second is
about not swallowing.`,
    coding: [
      {
        title: 'Bound the retry and back off',
        description: `A retry loop runs forever with no delay. Bound it to three attempts with a
doubling delay, and give up cleanly.

The supplied \`flaky\` function fails a given number of times then succeeds. Read that number from
input. Print the attempt number that succeeded, or \`gave up\` after three failures.

No real sleeping: call \`record_delay(seconds)\` instead, and the harness prints the delays.`,
        starter: `import sys

delays = []
def record_delay(seconds):
    delays.append(seconds)

class Flaky:
    def __init__(self, fail_times):
        self.fail_times, self.calls = fail_times, 0
    def __call__(self):
        self.calls += 1
        if self.calls <= self.fail_times:
            raise RuntimeError('temporary')
        return self.calls

flaky = Flaky(int(sys.stdin.readline()))

# TODO: at most three attempts, delay 1 then 2 then 4 via record_delay
attempt = 0
while True:
    try:
        print(flaky())
        break
    except RuntimeError:
        pass
print(','.join(str(d) for d in delays))
`,
        language: 'python',
        tests: [
          { input: '0\n', expectedOutput: '1\n' },
          { input: '1\n', expectedOutput: '2\n1' },
          { input: '2\n', expectedOutput: '3\n1,2' },
          { input: '3\n', expectedOutput: 'gave up\n1,2,4', isHidden: true },
          { input: '5\n', expectedOutput: 'gave up\n1,2,4', isHidden: true },
        ],
      },
      {
        title: 'Stop swallowing the failure',
        description: `A function catches everything and returns a default, so a genuine fault is
invisible. Change it so an expected failure returns the default and records it, while an
unexpected one is allowed to propagate.

Read a mode: \`ok\`, \`missing\` or \`bug\`. Print the value, then the number of recorded warnings.
The \`bug\` case should print \`crashed\` instead.`,
        starter: `import sys

warnings = []

def lookup(mode):
    data = {'ok': 42}
    if mode == 'bug':
        return data[undefined_name]     # a real programming error
    return data[mode]                   # KeyError when missing

def safe_lookup(mode):
    try:
        return lookup(mode)
    except Exception:                   # <-- too wide, and records nothing
        return 0

mode = sys.stdin.readline().strip()
try:
    print(safe_lookup(mode))
    print(len(warnings))
except Exception:
    print('crashed')
`,
        language: 'python',
        tests: [
          { input: 'ok\n', expectedOutput: '42\n0' },
          { input: 'missing\n', expectedOutput: '0\n1' },
          { input: 'bug\n', expectedOutput: 'crashed' },
        ],
      },
    ],
    assignment: {
      title: 'Error Handling Practice',
      description: 'Bound a retry, stop a swallow, and defend four fail-or-degrade decisions.',
      instructions: `Complete both coding exercises above, then answer in a short file:

1. The four scenarios in the notes, with a one-sentence reason each.
2. Scenario 4 is contested. Argue both sides in a short paragraph, then say which you would ship
   and what you would do to limit the damage of being wrong.
3. For the second exercise: explain why catching \`Exception\` rather than \`KeyError\` was the
   actual bug, and what it would have hidden in production.`,
      rubric: [
        { criterion: 'Bounded retry', description: 'Three attempts, doubling delay, and a clean give-up.', maxPoints: 25 },
        { criterion: 'Narrow catch', description: 'Expected failure handled and recorded; a real bug propagates.', maxPoints: 25 },
        { criterion: 'Four decisions', description: 'Each with a reason that turns on whether state becomes untrue.', maxPoints: 20 },
        { criterion: 'The contested case', description: 'Both sides argued, a choice made, and the damage limited.', maxPoints: 20 },
        { criterion: 'Why the wide catch was the bug', description: 'Names what it would have hidden, not just that it is broad.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

warnings = []

def lookup(mode):
    data = {'ok': 42}
    if mode == 'bug':
        return data[undefined_name]
    return data[mode]

def safe_lookup(mode):
    try:
        return lookup(mode)
    except Exception:
        return 0

mode = sys.stdin.readline().strip()
try:
    print(safe_lookup(mode))
    print(len(warnings))
except Exception:
    print('crashed')
`,
        tests: [
          { input: 'ok\n', expectedOutput: '42\n0' },
          { input: 'missing\n', expectedOutput: '0\n1' },
          { input: 'bug\n', expectedOutput: 'crashed', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 25,
      },
    },
    checkpoint: [
      mcq('A currency conversion times out while pricing an order. The right call is to:',
        [['Fail, rather than charge a wrong amount', true],
          ['Degrade, using the last known rate', false],
          ['Retry until the conversion succeeds', false],
          ['Continue, and correct the price later', false]],
        'Continuing would make the system believe a price that is not true.'),
      mcq('An audit write fails after the action succeeded. Why is this case contested?',
        [['The action happened and the record did not', true],
          ['The audit log is not part of the product', false],
          ['Retrying the write is always possible', false],
          ['The action can be reversed automatically', false]],
        'Both answers lose something, which is why saying why is the point of the question.'),
      mcq('Why is error handling the least-exercised code in most systems?',
        [['The happy path runs and the catch block rarely does', true],
          ['It is usually written after the feature ships', false],
          ['It is hard to write tests for exceptions', false],
          ['It changes more often than the logic', false]],
        'The catch block may never have run before the night it matters.'),
    ],
  },

  {
    unitCode: 'T3_ERROR_DESIGN_MINI_PROJECT',
    notes: `Take something that talks to an unreliable dependency and make its failure behaviour
deliberate rather than accidental.

The brief asks you to **break it on purpose** and observe, because error handling written without
watching it run is error handling nobody has tested. Most of the marks are for the failure
behaviour being chosen and demonstrated, not for the feature working.

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — Failure Behaviour You Chose',
      description: 'Build a small client for an unreliable dependency, decide every failure response, and prove each one.',
      instructions: `**The brief**

Build a small tool that calls something that can fail — a public HTTP API, a local service you
write to misbehave, or a file source you can corrupt. Around 200–300 lines. It must do something
real with the result, not just fetch and print.

**Part one — decide, before you write the handling**

1. List every way the call can fail: timeout, connection refused, a 500, a 400, malformed
   response, partial response.
2. For each, write down the chosen response — **fail, degrade, or retry then decide** — and one
   sentence on why, turning on whether continuing makes anything silently untrue.
3. Commit this list *before* the handling code. The history should show the decisions came first.

**Part two — build it**

4. Implement the handling you chose. Every outbound call has a timeout. Every retry is bounded,
   backs off, and has jitter.
5. Errors leaving the tool tell the user what to do and carry a reference; the log carries the
   detail and the correlation id.
6. Nothing is swallowed. Every caught error either changes the outcome or is recorded.

**Part three — prove each one**

7. **Force every failure in your list** and capture what happened: what the user saw, what the
   log recorded. A short transcript per case.
8. For the retry path, show the delays actually used and that the attempts were bounded.
9. Include one case you got wrong on the first attempt and what the evidence made you change.

**What to submit**

1. The repository, with the decisions committed before the handling.
2. The transcripts for every failure in the list.
3. A README with the decision table and the one thing you changed after seeing it run.

**How this is judged**

Part three is the heaviest. Handling you have never watched execute is handling you are guessing
about, and the transcript is the difference between a design and a hope.`,
      rubric: [
        { criterion: 'Failures enumerated first', description: 'A complete list with chosen responses, committed before the handling.', maxPoints: 20 },
        { criterion: 'Reasoning that holds', description: 'Each choice turns on whether continuing makes something untrue.', maxPoints: 15 },
        { criterion: 'Bounded, backed-off retries', description: 'Timeouts everywhere; retries limited, delayed and jittered.', maxPoints: 15 },
        { criterion: 'Two audiences served', description: 'Actionable message with a reference out, full detail in the log.', maxPoints: 15 },
        { criterion: 'Every case proved', description: 'Each failure forced, with a transcript of user-facing and logged output.', maxPoints: 25 },
        { criterion: 'One thing changed by evidence', description: 'A decision revised after watching it run, and why.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Why does this brief ask you to break the dependency on purpose?',
        [['Handling never watched run is handling you are guessing about', true],
          ['It demonstrates the tool is robust enough', false],
          ['Real failures are too rare to wait for', false],
          ['It is the only way to measure the timeouts', false]],
        'The transcript is the difference between a design and a hope.'),
      mcq('Why should the failure decisions be committed before the handling code?',
        [['It shows the responses were chosen, not discovered', true],
          ['It makes the commit history easier to read', false],
          ['It allows the handling to be reviewed first', false],
          ['It prevents the list being changed later', false]],
        'Made during implementation, the decision becomes whatever was convenient at the time.'),
      mcq('The brief requires that nothing is swallowed. That means every caught error:',
        [['Changes the outcome or is recorded', true],
          ['Is re-raised after being logged', false],
          ['Results in the operation failing', false],
          ['Is reported to the user directly', false]],
        'A catch that does neither is the empty except block under another name.'),
    ],
  },

  /* ══ T3_DEPENDENCIES ══════════════════════════════════════════════════════════════════ */

  {
    unitCode: 'T3_DEPENDENCIES_CONFIG_OUT_OF_CODE',
    notes: `The same build should run in development, staging and production without being
edited. If it has to be edited, what you tested is not what you shipped.

**What counts as configuration:** anything that differs between environments. Database URLs,
API endpoints, feature flags, log levels, timeouts, credentials.

**What does not:** anything the same everywhere. A tax rate that is the same in every
environment is a constant, and putting it in configuration only means two places to look.

**The rule:** build once, configure per environment.

    # wrong — the environment is inside the artefact
    DATABASE_URL = "postgres://localhost/dev"

    # right — the artefact asks
    DATABASE_URL = os.environ["DATABASE_URL"]

**Fail at startup, not at first use.** A missing setting should stop the process immediately with
a message naming it:

    try:
        DATABASE_URL = os.environ["DATABASE_URL"]
    except KeyError:
        raise SystemExit("DATABASE_URL is not set")

The alternative is discovering it on the first request that needs it, possibly hours after the
deploy looked successful.

**Secrets are configuration with one extra rule: they are never in the repository.** Not in a
file, not in the history, not encrypted-but-committed.

**And a committed secret is compromised on commit.** Removing it in the next commit does not
undo it — the history still holds it, anyone who cloned has it, and public repositories are
scraped within minutes. **The only remedy is rotating the key.** Cleaning the history afterwards
is tidying, not fixing.

**Beware the build-time trap.** A value substituted into a front-end bundle at build time is
written into a file every visitor downloads:

    // "secret" in a front-end build
    const API_KEY = process.env.API_KEY;     // now literally in the bundle

Anything shipped to a browser is public. If a key must be secret, the call that uses it belongs
on the server.

**Log the effective configuration at startup, with secrets masked.** Half of all incidents begin
with the wrong version or the wrong settings, and one line at boot answers that in a second.`,
    mcqs: [
      mcq('What makes something configuration rather than a constant?',
        [['It differs between environments', true],
          ['It might need changing in future', false],
          ['It is referenced in several places', false],
          ['It controls how the system behaves', false]],
        'A value that is the same everywhere in configuration is just two places to look.'),
      mcq('A missing setting should be detected:',
        [['At startup, naming the setting', true],
          ['On the first request that needs it', false],
          ['During the deployment health check', false],
          ['When the configuration is reloaded', false]],
        'Otherwise you discover it hours after the deploy looked successful.'),
      mcq('A key was committed and removed in the next commit. What must you do?',
        [['Rotate it — the history still holds it', true],
          ['Rewrite the history to erase it', false],
          ['Make the repository private instead', false],
          ['Add the file to the ignore list', false]],
        'Public repositories are scraped within minutes; cleaning up afterwards is tidying.'),
      mcq('An API key substituted into a front-end build at build time is:',
        [['In a file every visitor downloads', true],
          ['Protected, since the build is minified', false],
          ['Visible only to authenticated users', false],
          ['Kept on the server that served it', false]],
        'Anything shipped to a browser is public. A secret key belongs behind a server call.'),
    ],
    checkpoint: [
      mcq('Why should the same build run in every environment?',
        [['Otherwise what you tested is not what you shipped', true],
          ['It reduces the time each deployment takes', false],
          ['It keeps the artefact smaller on disk', false],
          ['It avoids maintaining several pipelines', false]],
        'Build once, configure per environment. The moment the build differs, staging proves less.'),
      mcq('Logging the effective configuration at startup helps because:',
        [['Many incidents begin with the wrong settings', true],
          ['It confirms the process started correctly', false],
          ['It records the version for the audit trail', false],
          ['It lets support reproduce the environment', false]],
        'One line at boot, with secrets masked, answers it in a second.'),
    ],
  },

  {
    unitCode: 'T3_DEPENDENCIES_VERSIONS_AND_LOCKFILES',
    notes: `A build that worked yesterday and fails today, with no code change, is almost always
a dependency that moved.

**Version ranges are why it can move:**

    "express": "^4.18.0"      # any 4.x at or above 4.18.0

That caret means "whatever the newest compatible release is, at the moment you install". Two
installs a week apart can produce two different applications from identical source.

**Semantic versioning is a promise, not a guarantee:**

| Change | Means |
|---|---|
| 1.2.3 → 1.2.4 | A fix. Nothing should break. |
| 1.2.3 → 1.3.0 | A feature. Nothing should break. |
| 1.2.3 → 2.0.0 | Something breaks. |

It is the maintainer's opinion of their own change, and they sometimes get it wrong. A patch
release can break you — occasionally because they fixed a bug your code depended on.

**The lock file is what makes a build reproducible.** The manifest says what you *want*
(\`^4.18.0\`); the lock file records what you *got* (\`4.18.2\`), including every transitive
dependency and a hash of each.

**Commit it.** Without it in the repository, your laptop, the build server and production can
each resolve a different set of versions, and "works on my machine" becomes literally true.

**In CI, install strictly from the lock file** — \`npm ci\`, not \`npm install\`. An install that
re-resolves is testing a different application from the one you are about to deploy.

**Transitive dependencies are the bulk of it.** Twelve direct dependencies routinely install nine
hundred packages. You chose twelve; you are responsible for nine hundred, all running with your
privileges and all appearing in your advisory reports.

**Neither extreme works:**

- **Never updating** accumulates known vulnerabilities, and four deferred major upgrades become
  one project nobody can schedule.
- **Always taking the newest** ships whatever was published last night, including a compromised
  release. Several real supply-chain attacks worked exactly that way.

**What works** is pinning plus regular advisory scanning, and updating in small batches with a
test suite you trust. Small and frequent is the only variable you actually control.`,
    mcqs: [
      mcq('What does a lock file record that the manifest does not?',
        [['The exact versions that were installed', true],
          ['The versions the project will accept', false],
          ['The order the packages are loaded in', false],
          ['The licences each package carries', false]],
        'Exact, including every transitive dependency and a hash of each.'),
      mcq('Why should CI install strictly from the lock file?',
        [['Otherwise it tests a different application', true],
          ['Otherwise the install takes longer to run', false],
          ['Otherwise the cache cannot be reused', false],
          ['Otherwise the manifest becomes inaccurate', false]],
        'An install that re-resolves is not reproducing the thing you are about to deploy.'),
      mcq('A patch release can still break your build because:',
        [['Versioning is a convention, not a guarantee', true],
          ['Patch releases may add new features', false],
          ['The lock file records it incorrectly', false],
          ['Patches are published without testing', false]],
        'It is the maintainer’s opinion of their own change, and occasionally they fixed a bug you relied on.'),
      mcq('Twelve direct dependencies installing nine hundred packages means:',
        [['You are responsible for nine hundred', true],
          ['The package manager is duplicating them', false],
          ['The direct dependencies were badly chosen', false],
          ['The lock file needs to be regenerated', false]],
        'All of them run with your privileges and appear in your advisory reports.'),
    ],
    checkpoint: [
      mcq('A build passed yesterday and fails today with no code change. What is the likely cause?',
        [['A dependency resolved to a new version', true],
          ['The build machine was reconfigured', false],
          ['A test became flaky over time', false],
          ['The registry returned an error', false]],
        'Only possible if something is unpinned, which is the argument for committing the lock file.'),
      mcq('Why is never updating dependencies a costly choice?',
        [['Known flaws accumulate and upgrades get harder', true],
          ['Newer versions are faster than older ones', false],
          ['Old versions are removed from registries', false],
          ['The team falls behind on new features', false]],
        'Both halves compound: four deferred upgrades become one project nobody can schedule.'),
      mcq('`^4.18.0` in a manifest means:',
        [['Any 4.x at or above that version', true],
          ['Exactly that version and no other', false],
          ['That version or the next patch only', false],
          ['The newest version of any major release', false]],
        'Which is why two installs a week apart can produce two different applications.'),
    ],
  },

  {
    unitCode: 'T3_DEPENDENCIES_TAKING_ON_A_DEPENDENCY',
    notes: `\`npm install\` takes four seconds and commits you for years. That asymmetry is the
whole of this unit.

**What you actually adopted:**

- Its code, running with your privileges, inside your process.
- Its bugs, which are now your bugs to your users.
- Its security advisories, on the day they are published.
- Its breaking changes, on the maintainer's schedule.
- Everything it depends on, which you did not choose and may not have read.

**Your customers have no relationship with an unpaid maintainer.** When a dependency causes your
outage, it is your outage. Choosing to ship it made it yours.

**The comparison to make is not "write it or install it today".** It is **writing it once against
maintaining the relationship for years**. A twenty-line date formatter is usually cheaper to
write than to adopt, upgrade and audit for five years. A time-zone library is not — that domain
is full of traps and somebody else has already hit them all.

**Where a dependency clearly wins:** cryptography, time zones, parsers, protocol
implementations. Anywhere the domain is deep and getting it subtly wrong is easy and invisible.

**Where writing it usually wins:** small, stable, and specific to you. If you can write it in an
afternoon and it will not need to change, the overhead of a dependency is per-package and the
code is tiny.

**Before adopting, check three things:**

1. **Is it maintained?** Recent commits, and issues that get answered. An unmaintained package
   with an advisory leaves you forking it, replacing it, or shipping the flaw.
2. **What does it pull in?** A small package that installs two hundred others is not small.
3. **What licence?** Some place obligations on your own code if you distribute it. That is a
   business constraint, not a detail.

**Popularity is weak evidence.** It tells you others chose it, often for the same weak reason.

**Make it cheap to leave.** A dependency you might realistically replace belongs behind an
interface of your own, so that replacing it touches one file rather than ninety. That is the same
argument as keeping a framework at the edge — and it is worth the wrapper only where replacement
is plausible, not for everything.`,
    mcqs: [
      mcq('The comparison worth making before adopting a package is:',
        [['Writing it once against maintaining it for years', true],
          ['The size of the package against your own code', false],
          ['Its code quality against what you would write', false],
          ['Install time against development time', false]],
        'The install takes four seconds; the ownership lasts as long as the product.'),
      mcq('A dependency causes an outage in your product. Whose problem is it?',
        [['Yours, because you chose to ship it', true],
          ['The maintainer’s, who wrote the fault', false],
          ['Shared between you and the maintainer', false],
          ['The registry’s, for distributing it', false]],
        'Your customers have no relationship with an unpaid maintainer.'),
      mcq('Where does adopting a library most clearly win?',
        [['Deep domains where subtle errors are invisible', true],
          ['Anywhere it saves more than a day of work', false],
          ['Wherever a popular package already exists', false],
          ['Anywhere the team lacks the expertise', false]],
        'Cryptography, time zones, parsers. Somebody else has already hit all the traps.'),
      mcq('Why is popularity weak evidence when choosing a package?',
        [['It shows others chose it, often for the same reason', true],
          ['Popular packages change more frequently', false],
          ['Download counts can be inflated easily', false],
          ['Popular packages have more dependencies', false]],
        'Maintenance, tree size and licence are the things that actually tell you something.'),
    ],
    checkpoint: [
      mcq('What should you check before adopting a package?',
        [['Whether it is maintained, and what it pulls in', true],
          ['Whether it has the features you need', false],
          ['Whether its documentation is thorough', false],
          ['Whether the team has used it before', false]],
        'Plus the licence. Features are why you looked; these are whether you should.'),
      mcq('Which dependency is worth hiding behind your own interface?',
        [['One you might realistically replace', true],
          ['One used in the most places', false],
          ['One with the largest dependency tree', false],
          ['One that is least actively maintained', false]],
        'Wrapping everything is its own cost. Wrap what is plausibly temporary.'),
      mcq('A five-line package carries the same overhead as a large one because:',
        [['Advisories and upgrades are per package', true],
          ['It installs the same supporting files', false],
          ['It is more likely to be abandoned', false],
          ['It cannot be audited as easily', false]],
        'The cost is per package, not per line, which is why tiny dependencies are not free.'),
    ],
  },
];
