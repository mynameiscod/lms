/**
 * T3_FRONTEND_ADV_JS, T3_FRONTEND_COMPONENTS and T3_FRONTEND_STATE — eighteen units.
 * Year 3, frontend track.
 *
 * ── WHAT A THIRD-YEAR FRONTEND STUDENT ACTUALLY LACKS ─────────────────────────────────────
 *
 * Not syntax. They can write a component and fetch some JSON. What they have never done is
 * handle the request that fails, the one that arrives after the user moved on, and the state
 * that is duplicated in three places and disagrees with itself.
 *
 * So ASYNC_THAT_FAILS leads, and the whole first topic is about the paths other than success.
 * A student's mental model of fetch is "it returns data"; the reality is that it returns data,
 * or an error, or nothing for thirty seconds, or a result for a screen that is gone — and only
 * the first is ever taught.
 *
 * RACE_CONDITIONS is the unit that separates people. Two requests, one screen, and the slower
 * one landing last is a bug that appears only on a slow connection, which is never the
 * developer's.
 *
 * WHERE_A_VALUE_LIVES is the hardest idea in the track, and the one that decides whether a
 * codebase stays workable. Almost every frontend mess is state in the wrong place.
 *
 * Attribution: ADV_JS and STATE are single-skill and derived. COMPONENTS defaults to JS_DOM
 * with PROPS_AND_EVENTS on STATE_MANAGEMENT.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const FRONTEND_BUNDLES: PilotBundle[] = [
  /* ══ T3_FRONTEND_ADV_JS ═════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_FRONTEND_ADV_JS_ASYNC_THAT_FAILS',
    notes: `You can fetch JSON. **This unit is about every other outcome**, and there are four
of them that a tutorial never shows.

## The four outcomes of a request

**It succeeds.** The one you have handled.

**It fails.** The network is down, the server returned 500, the user is offline.

**It is slow.** Ten seconds. Nothing on screen says so, and the user clicks the button again.

**It never returns.** No timeout by default. \`fetch\` will wait indefinitely, and the promise
simply never settles.

**A screen that handles only the first is a screen that is broken most of the time it
matters** — because it matters exactly when the network is bad.

## The shape that handles all four

    const [state, setState] = useState({ status: 'idle' });

    async function load() {
      setState({ status: 'loading' });
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new HttpError(res.status);
        setState({ status: 'success', data: await res.json() });
      } catch (e) {
        setState({ status: 'error', error: e });
      }
    }

**Four states, not a boolean.** \`isLoading\` plus \`data\` plus \`error\` is three variables
with eight combinations, six of which are impossible — and the impossible ones are what you
render by accident. **One \`status\` field makes the impossible states unrepresentable**, which
is the single most useful idea in this unit.

## The trap: fetch does not throw on 404

    const res = await fetch('/api/thing');
    const data = await res.json();      // 404 page, parsed as JSON — or a crash

**\`fetch\` only rejects on a network failure.** A 404, a 500 and a 403 all resolve
successfully with \`res.ok === false\`. **Every \`fetch\` needs an \`if (!res.ok)\`**, and the
absence of one is the commonest bug in frontend code that talks to an API.

## Timeouts

There is no default. Add one:

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

**Without it, a hung request hangs your screen forever**, and the user's only recourse is to
reload.

## Retries, carefully

**Retry a network failure or a 5xx.** Not a 4xx — the request was wrong and repeating it
changes nothing.

**Exponential backoff**, and a limit. Immediate retries on a struggling server make it worse,
which is the client side of the argument the API topic made.

**Never retry a non-idempotent request automatically.** A retried \`POST /orders\` after a
timeout is a second order. **A timeout is an unknown, not a failure** — the same sentence as
the transactions topic, arriving from the other end.

## What the user sees

**Loading, immediately.** Not after 500ms of nothing.

**A skeleton rather than a spinner** where the shape is known — it reduces the perceived wait
and stops the layout jumping.

**An error they can act on.** "Something went wrong" tells them nothing. "Could not load your
orders — retry" gives them a door.

**And keep what you had.** Replacing a loaded list with a spinner on refresh is worse than
leaving the stale list with a quiet indicator. **The user was reading that.**`,
    mcqs: [
      mcq('A call to fetch returns a rejected promise only when there is:',
        [['A network failure', true],
          ['Any response with a 4xx or 5xx status', false],
          ['A 5xx response, but not 4xx', false],
          ['A timeout or an aborted request', false]],
        'A 404 resolves successfully with res.ok false, which is why every fetch needs that check.'),
      mcq('One `status` field beats separate loading, data and error flags because:',
        [['It makes the impossible combinations unrepresentable', true],
          ['It uses less memory per component', false],
          ['It is easier to pass between components', false],
          ['It avoids an extra render on each change', false]],
        'Three booleans give eight combinations and six of them should never exist.'),
      mcq('A request with no timeout:',
        [['Can hang the screen indefinitely', true],
          ['Is aborted by the browser after 30 seconds', false],
          ['Fails once the connection drops', false],
          ['Retries automatically at the network layer', false]],
        'The promise simply never settles, and the user reloads.'),
      mcq('A `POST` that timed out must not be retried automatically because:',
        [['A timeout is an unknown, not a failure', true],
          ['The server will reject the duplicate', false],
          ['Retries are only valid for idempotent reads', false],
          ['The original response may still arrive', false]],
        'The same sentence as the transactions topic, from the other end.'),
    ],
    checkpoint: [
      mcq('Replacing a loaded list with a spinner on refresh is worse because:',
        [['The user was reading it', true],
          ['It causes an extra render cycle', false],
          ['The spinner hides the scroll position', false],
          ['Stale data is more useful than none', false]],
        'Keep what you had, with a quiet indicator.'),
      mcq('A 4xx response should not be retried because:',
        [['The request was wrong and repeating it changes nothing', true],
          ['The server will begin to rate-limit the client', false],
          ['4xx responses are not cached', false],
          ['The error may not be transient', false]],
        'Retry network failures and 5xx, with backoff and a limit.'),
      mcq('A skeleton is preferred to a spinner when:',
        [['The shape of the content is known', true],
          ['The wait is expected to be short', false],
          ['The request may fail', false],
          ['The content loads in stages', false]],
        'It reduces the perceived wait and stops the layout jumping.'),
    ],
  },

  {
    unitCode: 'T3_FRONTEND_ADV_JS_RACE_CONDITIONS',
    notes: `A user types "lon" in a search box. Three requests go out — "l", "lo", "lon". They
come back in whatever order the network decides.

**If "l" returns last, the screen shows results for "l" while the box says "lon".**

This is the bug that separates people, because **it never happens on the developer's machine**.
Local latency is 2ms and the responses arrive in order every time. On a train, they do not.

## The three shapes

**The stale response.** A slower earlier request lands after a faster later one.

**The abandoned screen.** The user navigates away, the response arrives, and the component
tries to update something that no longer exists.

**The double submit.** The button is clicked twice before the first response disables it. Two
orders.

## Fixing the stale response

**Ignore anything that is not the latest.** Two ways, and you should know both.

**A sequence number:**

    const latest = useRef(0);
    async function search(q) {
      const seq = ++latest.current;
      const data = await fetchResults(q);
      if (seq !== latest.current) return;   // a newer request started
      setResults(data);
    }

**Or cancel the previous request:**

    controller.current?.abort();
    controller.current = new AbortController();
    const res = await fetch(url, { signal: controller.current.signal });

**Cancellation is better where it is available** — it stops the work as well as the update,
which saves the server's time too. The sequence number is the fallback and it always works.

## Fixing the abandoned screen

**Cancel on unmount.** Every framework gives you a cleanup hook; use it to abort the request
and to set a flag the callback checks.

**The symptom** is a warning about updating an unmounted component, or a state update that
appears to come from nowhere. **It is not cosmetic** — it can leak memory and, worse, it can
write a response for one record into the screen now showing another.

## Fixing the double submit

**Disable on the first click**, and re-enable when the request settles — including on failure,
or the button is dead forever.

**And guard on the server.** Client-side disabling stops the accidental double click; it does
not stop a retry, a slow connection or somebody with the network tab open. **The idempotency
key from the backend track is the real fix**, and the client's job is to send the same key on
a retry rather than a new one.

## Debouncing, and what it does not solve

**Debouncing reduces the number of requests.** Wait 300ms after the last keystroke, then
search. Fewer requests, less load, and a better experience.

**It does not remove the race.** It makes it rarer, which is worse in one specific way: a bug
that happens once a week is harder to find than one that happens every time. **Debounce for
load; sequence or cancel for correctness.** They are different problems and they need both
fixes.

## Testing this

**Throttle the network** in your browser's developer tools. "Slow 3G" makes every one of these
reproducible in a minute, and it is the single most useful frontend debugging setting there is.

**Then type fast into your search box** and watch what renders.`,
    mcqs: [
      mcq('The stale-response race never appears locally because:',
        [['Local latency is tiny and responses arrive in order', true],
          ['Development builds disable concurrent requests', false],
          ['The browser caches the earlier responses', false],
          ['Local servers process requests sequentially', false]],
        'On a train, they do not arrive in order.'),
      mcq('Cancellation is preferable to a sequence number because:',
        [['It stops the work as well as the update', true],
          ['It is simpler to implement correctly', false],
          ['It works in older browsers', false],
          ['It avoids storing a reference', false]],
        'Saving the server’s time too. The sequence number is the fallback that always works.'),
      mcq('An update to an unmounted component is not merely cosmetic because:',
        [['It can write one record’s response into a screen showing another', true],
          ['It slows the next render measurably', false],
          ['It prevents the component being garbage collected', false],
          ['It triggers a full re-render of the tree', false]],
        'As well as leaking memory.'),
      mcq('Debouncing makes the race:',
        [['Rarer, which makes it harder to find', true],
          ['Impossible, since requests no longer overlap', false],
          ['More frequent under slow networks', false],
          ['Irrelevant, since only one request is in flight', false]],
        'Debounce for load; sequence or cancel for correctness.'),
    ],
    checkpoint: [
      mcq('A button disabled on click must be re-enabled:',
        [['When the request settles, including on failure', true],
          ['Only on success, to prevent duplicates', false],
          ['After a fixed timeout', false],
          ['When the user navigates away', false]],
        'Otherwise the button is dead forever after one error.'),
      mcq('Client-side disabling does not stop:',
        [['A retry, or somebody with the network tab open', true],
          ['An accidental double click', false],
          ['A rapid double submission of the form', false],
          ['A duplicate request from the same handler', false]],
        'The idempotency key is the real fix; the client sends the same key on a retry.'),
      mcq('The most useful setting for reproducing these bugs is:',
        [['Network throttling in the developer tools', true],
          ['Disabling the cache', false],
          ['Enabling verbose console logging', false],
          ['Simulating a mobile device', false]],
        '"Slow 3G" makes all three reproducible in a minute.'),
    ],
  },

  {
    unitCode: 'T3_FRONTEND_ADV_JS_ERROR_UX',
    notes: `Something failed. **What the user sees is a design decision**, and it is usually
made by accident — whatever the component happened to render when \`error\` was set.

## The question to ask

> **What can this person do now?**

Every error message should answer it. If there is nothing they can do, say what is happening
instead.

## Four kinds of failure, four responses

**They did something wrong.** A validation failure. **Say what and where** — next to the field,
not in a banner at the top of a long form. "Enter a date after today", not "Invalid input".

**We did something wrong.** A 500. **Apologise briefly, offer a retry, and give them a
reference.** The request id from the backend track, shown in the corner, turns an unhelpful
support conversation into a thirty-second one.

**The network failed.** **Say so specifically**, because the response is different: they should
check their connection, and retrying might just work. "Could not reach the server" is honest
and actionable in a way "Something went wrong" is not.

**They are not allowed.** A 403. **Do not say "error"** — say what the situation is. "You need
an admin account to do this" is information; a red box is not.

## Where the message goes

**Field errors: at the field.** A summary at the top of a twenty-field form makes the user hunt.

**Action errors: near the action.** The save failed — say it by the save button, where they are
looking.

**Page errors: in place of the content**, with a retry.

**Background errors: quietly**, or not at all. An autosave that failed and will retry does not
need a modal. **An autosave that failed and will not retry absolutely does** — and the
difference matters more than the styling.

## What not to do

**A modal for everything.** It stops the user, and most errors do not deserve that.

**A toast that disappears.** For anything they need to act on, or read twice, or copy a
reference from. Toasts are for confirmations.

**Technical detail.** \`TypeError: Cannot read property 'id' of undefined\` helps nobody and
tells an attacker about your internals. **Log it; show something else.**

**Blaming them.** "You entered an invalid value" reads worse than "That date is in the past"
and carries no more information.

## Keeping their work

**The most important rule in this unit.** If a submission fails, **the form still has
everything they typed.** Losing a long form to a network blip is the single most enraging thing
a web application does, and it is entirely preventable.

**Do not clear on error. Do not navigate away. Do not reset.**

## Retry, made easy

A retry button next to the error costs nothing and resolves most transient failures without a
reload — and a reload is what the user will otherwise do, which loses their work as surely as
clearing the form.

**And do the retry silently once, first**, for a background operation. Many failures are a
single dropped packet, and the user never needs to know there was one.`,
    mcqs: [
      mcq('Every error message should answer:',
        [['What can this person do now', true],
          ['What went wrong technically', false],
          ['Whose fault the failure was', false],
          ['How long the problem will last', false]],
        'And if there is nothing they can do, say what is happening instead.'),
      mcq('A 403 should be shown as:',
        [['A statement of the situation, not an error', true],
          ['A generic error with a retry option', false],
          ['A redirect to the login page', false],
          ['A modal explaining the permission model', false]],
        '"You need an admin account" is information; a red box is not.'),
      mcq('The single most enraging thing a web application does is:',
        [['Lose a long form to a network blip', true],
          ['Show a technical error message', false],
          ['Take ten seconds to respond', false],
          ['Log the user out unexpectedly', false]],
        'Entirely preventable: do not clear, do not navigate, do not reset.'),
      mcq('Showing `TypeError: Cannot read property \'id\' of undefined`:',
        [['Helps nobody and tells an attacker about your internals', true],
          ['Is acceptable in a development build only', false],
          ['Helps support diagnose the problem', false],
          ['Is better than a generic message', false]],
        'Log it; show something else.'),
    ],
    checkpoint: [
      mcq('A background autosave that failed and will retry needs:',
        [['A quiet indicator, or nothing', true],
          ['A modal, since data is at risk', false],
          ['A toast that disappears', false],
          ['A full-page error state', false]],
        'One that will not retry absolutely does need a prominent message.'),
      mcq('A toast is the wrong place for an error the user must act on because:',
        [['It disappears before they can read or copy it', true],
          ['Toasts are reserved for warnings', false],
          ['It appears away from the relevant control', false],
          ['It cannot contain a retry button', false]],
        'Toasts are for confirmations.'),
      mcq('Showing a request id with a 500:',
        [['Turns an unhelpful support conversation into a short one', true],
          ['Proves the error was logged', false],
          ['Lets the user retry exactly the same request again', false],
          ['Identifies which server handled it', false]],
        'Support can find the exact request instead of searching by timestamp.'),
    ],
  },

  {
    unitCode: 'T3_FRONTEND_ADV_JS_DEBUGGING',
    notes: `Five async frontend failures, and how each is found.

## 1. "It works, then it does not"

**Symptom:** the screen shows the right thing, then the wrong thing, a moment later.

**Cause:** a stale response landing after a newer one. **The tell is the timing** — it is always
a moment after, and it is worse on a slow connection.

**Diagnosis:** the network tab, sorted by time. Two requests for the same thing, and the older
one finishing second.

## 2. The infinite request loop

**Symptom:** the network tab fills with identical requests, the page is unusable, and your API
is receiving thousands of calls a minute from one browser.

**Cause:** a fetch triggered by an effect whose dependency changes as a result of the fetch. A
new object or array literal in the dependency list does this reliably, because it is a
different object every render.

**Diagnosis:** the network tab is unmistakable. **The fix is to make the dependency stable** —
a primitive, or a memoised value.

**This one costs money**, because it is happening in every user's browser at once.

## 3. The response for the wrong thing

**Symptom:** you open record 5, then quickly record 9, and record 9's page shows record 5's
data.

**Cause:** the same race, with navigation. **This is the one worth caring about most**, because
in the wrong domain it shows one user another user's information.

**Fix:** cancel on navigation, and check the response belongs to the current record before
rendering it.

## 4. Nothing happens

**Symptom:** the button does nothing. No error, no request.

**Work through:** is the handler attached; did the request go out at all — the network tab
answers this in a second; did it fail CORS, which logs in the console and shows as a failed
request; was an exception thrown in the handler and swallowed by a missing \`catch\`; is the
promise rejected with nothing listening?

**Unhandled rejections are the quietest failure in JavaScript.** Add a global handler for
\`unhandledrejection\` and log them — most applications have some and nobody knows.

## 5. It works in development and not in production

**Causes, in order:** a different API URL; CORS configured for localhost only; an environment
variable not set in the build; a real network with real latency exposing a race; a service
worker serving a stale bundle.

**The last one catches people repeatedly.** A cached service worker will serve yesterday's
JavaScript against today's API, and the symptoms make no sense at all.

## The tools

**The network tab, with throttling on.** Most of the above is visible there and nowhere else.

**\`console.log\` with a timestamp and an identifier.** For a race, the order of the logs is
the entire diagnosis.

**Break on a specific fetch** with a conditional breakpoint on the URL.

**And look at the application from the user's side:** open it on a phone, on real mobile
data, away from your desk. Half of these become obvious in five minutes.`,
    mcqs: [
      mcq('An infinite request loop is usually caused by:',
        [['A dependency that changes as a result of the fetch', true],
          ['A missing cleanup function', false],
          ['A retry with no limit', false],
          ['An effect with no dependency list', false]],
        'A new object literal in the list is a different object every render.'),
      mcq('The race that matters most is:',
        [['A response for a record the user has navigated away from', true],
          ['Two search requests returning out of order', false],
          ['A double submission of a form', false],
          ['An update after the component unmounted', false]],
        'In the wrong domain it shows one user another user’s information.'),
      mcq('The quietest failure in JavaScript is:',
        [['An unhandled promise rejection', true],
          ['A caught exception that is not logged', false],
          ['A failed request with a 200 status', false],
          ['A handler that is never attached', false]],
        'Add a global unhandledrejection handler — most applications have some.'),
      mcq('A stale service worker in production:',
        [['Serves yesterday’s JavaScript against today’s API', true],
          ['Blocks requests to the new endpoints', false],
          ['Prevents the page loading at all', false],
          ['Caches API responses indefinitely', false]],
        'And the symptoms make no sense at all.'),
    ],
    checkpoint: [
      mcq('For diagnosing a race, the most valuable thing is:',
        [['The order of timestamped logs', true],
          ['The content of each response', false],
          ['The total request duration', false],
          ['A breakpoint in the handler', false]],
        'The order is the entire diagnosis.'),
      mcq('An infinite request loop costs money because:',
        [['It happens in every affected user’s browser at once', true],
          ['Each request is expensive to serve', false],
          ['It triggers rate limiting for every other user too', false],
          ['It prevents caching from working', false]],
        'Thousands of calls a minute, per browser.'),
      mcq('Testing on real mobile data away from your desk:',
        [['Makes half of these obvious in five minutes', true],
          ['Is only needed for responsive layout issues', false],
          ['Replaces the need for network throttling', false],
          ['Tests the service worker behaviour', false]],
        'Looking at it from the user’s side.'),
    ],
  },

  {
    unitCode: 'T3_FRONTEND_ADV_JS_PRACTICE',
    notes: `Two exercises on the logic of async handling, without a browser. The reasoning is
what transfers; the framework syntax is not.`,
    coding: [
      {
        title: 'Only the latest wins',
        description: `Simulate a search box. Read events, one per line:

- \`send <seq> <query>\` — a request is sent
- \`arrive <seq> <query>\` — its response arrives

Print the query currently displayed after each \`arrive\`, or \`ignored\` when the response is
stale — that is, a request with a higher sequence number has already been sent.

The displayed value starts empty. Print one line per \`arrive\` only.`,
        starter: `import sys

events = [l.split() for l in sys.stdin if l.split()]

# A response is stale if a newer request went out before it arrived.
`,
        language: 'python',
        tests: [
          { input: 'send 1 l\nsend 2 lo\narrive 2 lo\narrive 1 l\n', expectedOutput: 'lo\nignored' },
          { input: 'send 1 a\narrive 1 a\n', expectedOutput: 'a' },
          { input: 'send 1 a\nsend 2 b\narrive 1 a\narrive 2 b\n', expectedOutput: 'ignored\nb' },
          { input: '', expectedOutput: '' },
          { input: 'send 1 x\nsend 2 y\nsend 3 z\narrive 3 z\narrive 2 y\narrive 1 x\n', expectedOutput: 'z\nignored\nignored', isHidden: true },
        ],
      },
      {
        title: 'Classify the outcome',
        description: `Given how a request finished, print what the screen should do.

Read lines of \`<outcome> <status> <method>\`, where outcome is \`ok\`, \`network_error\` or
\`timeout\`, status is an integer (0 when there is no response), and method is \`GET\` or
\`POST\`.

Print, in this order of checks:

- outcome \`network_error\` → \`retry_allowed\`
- outcome \`timeout\` and method \`POST\` → \`unknown_do_not_retry\`
- outcome \`timeout\` → \`retry_allowed\`
- status 200–299 → \`show_data\`
- status 401 → \`sign_in\`
- status 403 → \`explain_permission\`
- status 404 → \`show_missing\`
- status 400–499 → \`show_field_errors\`
- status 500–599 → \`retry_allowed\`
- anything else → \`show_generic\``,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# A timed-out POST is the interesting case: the request may have succeeded.
`,
        language: 'python',
        tests: [
          { input: 'ok 200 GET\n', expectedOutput: 'show_data' },
          { input: 'timeout 0 POST\n', expectedOutput: 'unknown_do_not_retry' },
          { input: 'timeout 0 GET\n', expectedOutput: 'retry_allowed' },
          { input: 'ok 403 GET\n', expectedOutput: 'explain_permission' },
          { input: 'ok 422 POST\n', expectedOutput: 'show_field_errors' },
          { input: 'network_error 0 POST\n', expectedOutput: 'retry_allowed', isHidden: true },
          { input: 'ok 503 GET\n', expectedOutput: 'retry_allowed', isHidden: true },
          { input: 'ok 304 GET\n', expectedOutput: 'show_generic', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Async Frontend Practice',
      description: 'Handle stale responses, classify outcomes, then break a real screen with a slow network.',
      instructions: `Complete both exercises, then:

1. For the first: say what the cancellation approach would change about your solution, and what
   it buys beyond ignoring the response.
2. For the first: a debounce would reduce how many of these events occur. Say why it would not
   let you delete the sequence check.
3. For the second: \`network_error\` on a \`POST\` is \`retry_allowed\` but a \`timeout\` on a
   \`POST\` is not. Explain the difference in one sentence.
4. For the second: 304 falls through to \`show_generic\`. Say whether that is right, and what
   it should arguably be.

**Then, on a real screen.** Yours, or any application you can open.

5. Open the developer tools, set the network to a slow profile, and use a search or filter.
   **Type quickly.** Record what you observe.
6. Find a screen that loses your work on a failed submit. Report what happened.
7. Take a screen of your own. Go through the four outcomes — success, failure, slow, never
   returns — and say which it handles. Implement the missing ones.
8. Add a timeout to one request and show what the user sees when it fires.
9. Check for unhandled promise rejections: add a global handler, use the application for five
   minutes, and report what it caught.`,
      rubric: [
        { criterion: 'Stale responses ignored', description: 'Correct across orderings, including three in flight.', maxPoints: 20 },
        { criterion: 'Outcomes classified', description: 'All cases, with the timed-out POST handled distinctly.', maxPoints: 20 },
        { criterion: 'Timeout against network error', description: 'The difference stated in one accurate sentence.', maxPoints: 15 },
        { criterion: 'Observed on a real slow network', description: 'Throttled, used, and what was seen recorded.', maxPoints: 15 },
        { criterion: 'Four outcomes handled', description: 'A real screen audited and the missing paths implemented.', maxPoints: 20 },
        { criterion: 'Unhandled rejections found', description: 'A global handler added and the result reported.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'ok 200 GET\n', expectedOutput: 'show_data' },
          { input: 'timeout 0 POST\n', expectedOutput: 'unknown_do_not_retry' },
          { input: 'timeout 0 GET\n', expectedOutput: 'retry_allowed' },
          { input: 'ok 403 GET\n', expectedOutput: 'explain_permission' },
          { input: 'ok 304 GET\n', expectedOutput: 'show_generic', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 20,
      },
    },
    checkpoint: [
      mcq('A debounce does not remove the need for a sequence check because:',
        [['It reduces how often the race occurs, not whether it can', true],
          ['Debounced requests can still be cancelled midway', false],
          ['The last request may still be slow', false],
          ['Debouncing applies only to typing', false]],
        'And a rarer bug is harder to find than a constant one.'),
      mcq('A network error on a POST is retryable while a timeout is not because:',
        [['A network error means it did not arrive; a timeout means you do not know', true],
          ['Timeouts reliably indicate a server-side failure', false],
          ['Network errors are always transient', false],
          ['A timeout may have been rate limited', false]],
        'Unknown is the dangerous state, not failed.'),
      mcq('Cancellation buys, over ignoring the response:',
        [['The server stops doing the work', true],
          ['A guarantee the response never arrives', false],
          ['A cleaner error state on the client', false],
          ['Protection against the component unmounting', false]],
        'Which matters at scale and is free where the API supports it.'),
    ],
  },

  {
    unitCode: 'T3_FRONTEND_ADV_JS_MINI_PROJECT',
    notes: `Build a screen that behaves correctly on a bad network, and prove it by using it on
one.

The brief's test is **the throttled session**. A screen that works on your machine proves
nothing about async handling, because your machine has no latency and no failures. Everything
in this unit only becomes visible at 300ms and 10% packet loss.

Budget around two hours, and do the throttled testing throughout rather than at the end.`,
    assignment: {
      title: 'Mini Project — A Screen That Survives a Bad Network',
      description: 'Build a search-and-detail screen that handles every async outcome, verified under throttling.',
      instructions: `**Build** a screen with a search box, a results list, and a detail view —
against any public API or one of your own.

**Part one — the four outcomes**

1. A single \`status\` value, not separate booleans. Show the type or the shape you used.
2. Success, error, loading and empty, each rendered deliberately.
3. Every \`fetch\` checks \`res.ok\`. Show one.
4. A timeout on every request. State the duration and why.

**Part two — the races**

5. Type fast in the search box under throttling. **Show that stale results never render** —
   record it, or log the sequence and include the log.
6. Navigate between detail records quickly. Show that record 9 never displays record 5's data.
7. Cancel in-flight requests on unmount and on navigation. Show the cancellation in the
   network tab.
8. A submit button that cannot double-submit, and that re-enables on failure.

**Part three — the user's experience**

9. Loading appears immediately. A skeleton where the shape is known.
10. Refreshing keeps the existing content visible rather than replacing it with a spinner.
11. Errors: a field error at its field, an action error near the action, a page error in place
    of the content. Show all three.
12. A failed submit **keeps everything typed**. Demonstrate it.
13. A retry that works without a reload.

**Part four — prove it**

14. **Record or document a session at "Slow 3G"**, exercising search, navigation, a failure and
    a retry. This is the deliverable.
15. Simulate a server error — block the endpoint in the developer tools — and show what the
    user sees.
16. Simulate a hung request and show the timeout firing.
17. Add a global unhandled-rejection handler. Use the app for five minutes and report what it
    caught. **If it caught nothing, say how you verified it works.**
18. Say what you would do differently if this screen showed one user's private data and the
    race leaked another's.

**Submit** the code, the throttled session, the three error placements, and answers to 17–18.`,
      rubric: [
        { criterion: 'One status, four outcomes', description: 'No impossible state combinations, every outcome rendered deliberately.', maxPoints: 15 },
        { criterion: 'Races handled and shown', description: 'Stale results and wrong-record data both demonstrably impossible.', maxPoints: 25 },
        { criterion: 'Work is never lost', description: 'A failed submit keeps everything typed, demonstrated.', maxPoints: 15 },
        { criterion: 'Errors placed correctly', description: 'Field, action and page errors each in the right place.', maxPoints: 15 },
        { criterion: 'The throttled session', description: 'A real recording or log covering search, navigation, failure and retry.', maxPoints: 20 },
        { criterion: 'Rejections checked', description: 'Handler added, and either findings or a verification that it works.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('What this project is really asking you to produce is:',
        [['The throttled session', true],
          ['The working screen', false],
          ['The error handling code', false],
          ['The cancellation implementation', false]],
        'A screen that works on your machine proves nothing about async handling.'),
      mcq('"The handler caught nothing" is acceptable only with:',
        [['A demonstration that it works', true],
          ['A longer usage period', false],
          ['A note that the code is clean', false],
          ['Evidence from the console', false]],
        'The same standard as "no issues found" in the security audit.'),
      mcq('Question 18 asks about a leaked record because:',
        [['The same race becomes a privacy incident in the wrong domain', true],
          ['Private data needs different loading states', false],
          ['Cancellation is mandatory for personal data', false],
          ['It tests your understanding of the backend contract', false]],
        'The severity of the bug depends entirely on what is on the screen.'),
    ],
  },

  /* ══ T3_FRONTEND_COMPONENTS ═════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_FRONTEND_COMPONENTS_SPLITTING_A_SCREEN',
    notes: `A screen is one big function until you split it. **Where you split decides whether
the code stays workable**, and the two failures are opposite and equally common.

## The two failures

**One enormous component.** Eight hundred lines, twenty state variables, and every change risks
something unrelated. Nothing is reusable and nothing is testable.

**Forty tiny components.** A \`<Label>\`, a \`<Text>\`, a \`<Row>\`. Every change means opening
six files, and the indirection costs more than the duplication would have.

**Neither is a failure of discipline.** Both come from splitting on the wrong criterion — size
in one case, and a template's idea of a component in the other.

## Where to split

**On a repeated thing.** A card that appears eight times is a component. **This is the easiest
and most defensible reason**, and it is the only one that is obvious from the screen.

**On a thing with its own state.** A dropdown that manages whether it is open owns that state,
and nothing outside needs to know it exists.

**On a boundary of change.** The header and the results list change for different reasons and
on different people's say-so — which is the architecture topic's definition of a boundary,
arriving in a different discipline.

**On a thing you can name.** If you cannot name it without "and", it is two things. If you can
only name it \`<Section2>\`, it is not a thing.

## Where not to

**Because it is long.** Length is a symptom. A 200-line component doing one coherent thing is
fine; a 40-line one doing three is not.

**Because it is nested.** Depth is not complexity.

**Because a style guide said components should be small.** Small is not the goal — **one
reason to change** is, and that sometimes means large.

## Presentational and container

The distinction that survives every framework fashion:

**A presentational component takes props and renders.** No fetching, no global state, no
routing. **It is trivially testable and trivially reusable** because it depends on nothing.

**A container fetches, holds state and decides**, and renders presentational components.

**Keep the leaves presentational.** A button that fetches is a button you cannot use anywhere
else and cannot test without a network. That single rule prevents most component-level mess.

## Composition over configuration

    <Card title="x" showFooter footerText="y" variant="compact" onFooterClick={...} />

Six props, and the seventh is coming. **When a component grows props that switch behaviour on
and off, it is several components wearing one name.**

    <Card>
      <Card.Header>x</Card.Header>
      <Card.Footer onClick={...}>y</Card.Footer>
    </Card>

The caller composes what they need. **The test: if two callers use disjoint sets of props, they
are using two different components.**

## Before you write any of it

**Look at the screen and name the parts out loud.** Header, filter bar, results list, result
card, empty state, pagination. **That list is your component tree**, and it took thirty
seconds. Designing it from the code upwards takes much longer and usually lands somewhere
worse.`,
    mcqs: [
      mcq('Forty tiny components fail because:',
        [['The indirection costs more than the duplication would have', true],
          ['They render more slowly than fewer components', false],
          ['They cannot share state effectively', false],
          ['They are harder to name consistently', false]],
        'Every change means opening six files.'),
      mcq('The easiest and most defensible reason to split is:',
        [['A thing that repeats on the screen', true],
          ['A section longer than a hundred lines', false],
          ['A part with its own styling', false],
          ['A block that could be reused later', false]],
        'It is the only reason that is obvious from the screen itself.'),
      mcq('A component you can only name `<Section2>`:',
        [['Is not a thing, and should not be a component', true],
          ['Needs a better name before it is used', false],
          ['Is acceptable for layout wrappers', false],
          ['Should be merged with Section1', false]],
        'If you cannot name it without "and", it is two things.'),
      mcq('Keeping leaf components presentational prevents:',
        [['A button you cannot reuse or test without a network', true],
          ['Unnecessary re-renders of the tree', false],
          ['State being duplicated across components', false],
          ['Props being passed through many levels', false]],
        'That single rule prevents most component-level mess.'),
    ],
    checkpoint: [
      mcq('A component growing props that switch behaviour on and off is:',
        [['Several components wearing one name', true],
          ['A sign the props need better defaults', false],
          ['Normal for a shared design system', false],
          ['Better replaced with a configuration object', false]],
        'The test: two callers using disjoint props are using two components.'),
      mcq('Splitting because a component is long is wrong because:',
        [['Length is a symptom; one reason to change is the goal', true],
          ['Longer components tend to render more efficiently', false],
          ['The split usually lands mid-logic', false],
          ['Line counts vary between formatters', false]],
        'A coherent 200-line component is fine; an incoherent 40-line one is not.'),
      mcq('The fastest way to design a component tree is:',
        [['Name the parts of the screen out loud', true],
          ['Sketch the data flow first', false],
          ['Start from the smallest reusable pieces', false],
          ['Follow the structure of the design file', false]],
        'Thirty seconds, and it usually lands better than working upwards from code.'),
    ],
  },

  {
    unitCode: 'T3_FRONTEND_COMPONENTS_PROPS_AND_EVENTS',
    notes: `**Data flows down. Events flow up.** Every component framework works this way, and
understanding why makes the awkward cases obvious rather than mysterious.

## Why one direction

If any component could change any other's state, tracing a value would mean reading the whole
application. **With one direction, a value's source is always upwards**, and finding it is
walking up the tree.

The cost is real: a value needed five levels down is passed through five components that do not
care about it. That is **prop drilling**, and it is the price of the guarantee.

## When drilling is fine and when it is not

**Two or three levels: fine.** Genuinely. The alternative — a context, a store, a global — is
more machinery than the problem deserves, and it makes the value's source less obvious rather
than more.

**Five or more, or through components that make no use of it: a signal.** Not necessarily to
add a store, but to look at the tree:

- **Can the consumer move up?** Often the component needing the value is in the wrong place.
- **Can you pass the rendered thing instead of the data?** Passing a child element through means
  the intermediate components carry an opaque value rather than a meaningful one.
- **Is it genuinely global?** The signed-in user, the theme, the locale. **Those are the
  legitimate context cases**, and the list is shorter than people assume.

## Events upward

A child does not change its parent's state. It **tells the parent something happened**, and the
parent decides.

    <SearchBox onQueryChange={q => setQuery(q)} />

**Name the prop after what happened, not what to do.** \`onQueryChange\` describes an event;
\`onUpdateResults\` describes a decision the child should not be making. **The child that knows
what the parent will do with an event is coupled to it**, and that is the coupling this pattern
exists to prevent.

## Controlled and uncontrolled

**Controlled:** the parent holds the value and passes it down with a change handler. The parent
always knows the current value, and can validate, reset or prefill it.

**Uncontrolled:** the component holds its own value, and the parent reads it when needed.
Simpler, and the parent cannot see the value until it asks.

**Controlled for anything the rest of the screen reacts to.** Uncontrolled for a field nothing
else cares about until submit — and for a large form, uncontrolled is often both faster and
simpler, which is not the default advice and is frequently right.

## The mistake that causes the strangest bugs

**Mutating a prop, or the object behind it.**

    props.items.push(newItem);     // the parent's array, changed underneath it

The parent's state changed without the parent knowing. **Nothing re-renders, or the wrong thing
does, and the value is now inconsistent with what the parent thinks it holds.**

**Treat everything you receive as read-only.** To change it, raise an event and let the owner
produce a new value.

## Where this goes wrong at scale

**A callback passed down four levels, renamed at each.** \`onSelect\` becomes \`onPick\`
becomes \`onChoose\`. **Nobody can follow it**, and the fix is to keep the name.

**Twelve props on one component**, half of them callbacks. Usually the component is doing too
much, and occasionally the tree is shaped wrongly — and the previous unit's test applies: if
two callers use disjoint sets, they are two components.`,
    mcqs: [
      mcq('One-directional data flow buys you:',
        [['A value’s source is always upwards and can be found by walking up', true],
          ['Fewer re-renders across the tree', false],
          ['The ability to share state between siblings', false],
          ['Simpler event handling in children', false]],
        'The cost is prop drilling, which is the price of the guarantee.'),
      mcq('Prop drilling through two or three levels is:',
        [['Fine, and better than the machinery that replaces it', true],
          ['A signal to introduce a context', false],
          ['Acceptable only for primitive values', false],
          ['A sign the tree is shaped wrongly', false]],
        'A store makes the value’s source less obvious, not more.'),
      mcq('An event prop should be named after:',
        [['What happened', true],
          ['What the parent will do', false],
          ['The component that raises it', false],
          ['The state it will change', false]],
        'A child that knows what the parent will do is coupled to it.'),
      mcq('Mutating a prop causes strange bugs because:',
        [['The owner’s state changed without the owner knowing', true],
          ['Props are frozen and the write fails silently', false],
          ['It triggers an infinite render loop', false],
          ['The change is lost on the next render', false]],
        'Nothing re-renders, or the wrong thing does.'),
    ],
    checkpoint: [
      mcq('Uncontrolled inputs are often the better choice for:',
        [['A large form where nothing reacts until submit', true],
          ['Any field with validation', false],
          ['Fields whose value the parent must prefill', false],
          ['Inputs inside a reusable component', false]],
        'Frequently right, and not the default advice.'),
      mcq('A callback renamed at each level it passes through:',
        [['Cannot be followed, and the fix is to keep the name', true],
          ['Is good practice for local clarity', false],
          ['Indicates the intermediate levels should be collapsed', false],
          ['Is required when the meaning narrows', false]],
        'onSelect becoming onPick becoming onChoose.'),
      mcq('The legitimate cases for context are:',
        [['The signed-in user, the theme, the locale', true],
          ['Any value needed by more than three components', false],
          ['Anything passed down more than two levels', false],
          ['All server-fetched data', false]],
        'A shorter list than people assume.'),
    ],
  },

  {
    unitCode: 'T3_FRONTEND_COMPONENTS_ROUTING',
    notes: `**The URL is state**, and it is the only state your users can bookmark, share,
reload into and navigate back through. Treating it as anything less is the most common way a
web application stops feeling like the web.

## What belongs in the URL

**Anything that should survive a reload, be shareable, or be in the back button.**

- Which page, obviously.
- Which record — \`/orders/812\`.
- **Filters and search terms.** A filtered list that resets on reload is a filtered list the
  user cannot send to a colleague.
- Which tab, where the tabs are meaningful content.
- Pagination.

**What does not:** whether a dropdown is open, unsaved form input, a transient loading flag,
scroll position. These are ephemeral, and putting them in the URL makes the back button
useless because every interaction becomes a history entry.

## The test

> **If I copy this URL and send it to somebody, should they see what I see?**

If yes, that state belongs in the URL. It is one question and it settles almost every case.

## Query parameters against path segments

**Path for identity.** \`/orders/812\` — what this page is about.

**Query for modifiers.** \`/orders?status=shipped&page=2\` — how it is being viewed.

**The rough rule:** if removing it leaves a valid page showing something sensible, it is a
query parameter. Remove \`812\` and \`/orders/\` is meaningless. Remove \`status=shipped\` and
you have the unfiltered list, which is fine.

## Reading the URL as the source of truth

The mistake:

    const [filter, setFilter] = useState('all');       // and separately, the URL

Now there are two copies. They disagree after a back-button press, after a reload, after a
shared link is opened. **The user presses back, the URL changes, and the screen does not.**

**Read the filter from the URL. Write it to the URL. There is no second copy.**

    const filter = searchParams.get('status') ?? 'all';
    const setFilter = v => setSearchParams({ status: v });

The URL is the state. **The back button then works for free**, because the browser is managing
your state for you.

## Navigation that behaves

**Real links for navigation.** An \`<a href>\` or the framework's link component — not a click
handler on a \`<div>\`. A real link supports middle-click, right-click, open-in-new-tab,
keyboard focus and screen readers. **A div with an onClick supports none of them**, and it is
one of the most common accessibility failures on the web.

**Replace rather than push** where a history entry would be noise — a filter changing on every
keystroke should not require fifteen back presses to escape.

**Scroll to the top on navigation**, and restore the position on back. Most routers do neither
by default, and both are noticeable.

## Loading and errors, per route

Every route has the four states from the async topic. **A route that 404s should render a real
404 page**, not an empty screen.

**And guard routes on the server as well.** Hiding a route from the client's router is not
authorization — the data endpoint is what needs protecting, which is the same argument the
security topic made about hiding buttons.`,
    mcqs: [
      mcq('The test for whether state belongs in the URL is:',
        [['Should somebody opening this link see what I see', true],
          ['Does the value change frequently', false],
          ['Is the value needed after a reload', false],
          ['Would the value fit in a query string', false]],
        'One question, and it settles almost every case.'),
      mcq('Keeping a filter in both component state and the URL causes:',
        [['The screen not to change when the user presses back', true],
          ['Two requests on every filter change', false],
          ['The URL to fall behind by one interaction', false],
          ['The filter to reset on every render', false]],
        'Read from the URL and write to the URL; there is no second copy.'),
      mcq('A `<div onClick>` used for navigation fails to support:',
        [['Middle-click, new tab, keyboard and screen readers', true],
          ['The browser history', false],
          ['Query parameters', false],
          ['Server-side rendering', false]],
        'One of the most common accessibility failures on the web.'),
      mcq('The rough rule for query parameter against path segment is:',
        [['Removing it should still leave a sensible page', true],
          ['Paths are for values the server needs', false],
          ['Queries are for optional values only', false],
          ['Paths are for identifiers and queries for strings', false]],
        'Remove the order id and the page is meaningless; remove the filter and it is fine.'),
    ],
    checkpoint: [
      mcq('A filter changing on every keystroke should:',
        [['Replace the history entry rather than push one', true],
          ['Push an entry so each state is reachable', false],
          ['Update the URL only on blur', false],
          ['Stay out of the URL entirely', false]],
        'Otherwise escaping takes fifteen back presses.'),
      mcq('Hiding a route from the client router is:',
        [['Not authorization; the data endpoint needs protecting', true],
          ['Sufficient as long as the bundle is minified', false],
          ['A valid first layer of defence', false],
          ['Equivalent to a server-side guard', false]],
        'The same argument as hiding buttons in the security topic.'),
      mcq('Which does NOT belong in the URL?',
        [['Whether a dropdown is open', true],
          ['The current page of results', false],
          ['The active search term', false],
          ['Which record is being viewed', false]],
        'Ephemeral state makes the back button useless.'),
    ],
  },

  {
    unitCode: 'T3_FRONTEND_COMPONENTS_DEBUGGING',
    notes: `Five component problems, and what identifies each.

## 1. It renders the old value

**Symptom:** the data changed and the screen did not.

**Causes:** the state was mutated rather than replaced, so nothing detected a change; the
dependency list is missing the value; a memoised component's comparison says nothing changed
because the reference is the same object.

**Diagnosis:** log the value where it is set and where it is read. **If the set log shows the
new value and the read log shows the old one, it is a re-render that did not happen**, not a
data problem — and those need entirely different fixes.

## 2. It renders too often

**Symptom:** sluggish typing, a visible lag, fans spinning.

**Causes:** a new object or function created in the render and passed as a prop — a different
reference every time, so every memo fails; state held too high, so a keystroke re-renders the
whole page.

**Diagnosis:** the framework's profiler, or a counter logged in the render. **Find what
changed** — usually a prop that is a fresh literal.

## 3. The list that loses its place

**Symptom:** you type into the third row of an editable list, delete the first row, and your
text is now in a different row. Or a checkbox ticks the wrong item.

**Cause:** using the array index as the key. **The index is not an identity** — when the array
changes, index 2 refers to a different thing, and the framework reuses the component and its
state for the wrong item.

**Fix:** a stable id from the data. **Index keys are safe only for a list that never reorders,
never has insertions and never has deletions**, which is rarer than the frequency of index keys
suggests.

## 4. State that resets unexpectedly

**Symptom:** a form clears itself, or a component loses its state when something unrelated
happens.

**Cause:** the component is being unmounted and remounted. Usually because it is defined inside
another component's render — a new component type every render, so the framework destroys and
recreates it — or because its key changed.

**Diagnosis:** log in the mount and unmount hooks. **Repeated mounts where you expected one is
the answer**, and the cause is almost always one of those two.

## 5. It works, then breaks on the second interaction

**Symptom:** the first click is fine; the second behaves oddly.

**Cause:** a stale closure. A callback captured a value from the render in which it was created
and is still using it. **This is the hardest of the five to see**, because the code reads
correctly — the variable is right there.

**Fix:** the dependency list, or a ref for a value that must always be current.

## The general method

**Find out whether it is a data problem or a render problem.** Log at the source and at the
consumer. That single distinction halves the search, and most people skip it and go straight to
reading the component.

**Then find out what changed.** For a render that should not have happened, or one that should
have and did not, the question is always which value the framework compared and what it
concluded.

**And use the component inspector.** Seeing the actual props and state a component received —
rather than what you believe it received — resolves a large fraction of this in seconds.`,
    mcqs: [
      mcq('The set log shows the new value and the read log shows the old. That is:',
        [['A re-render that did not happen', true],
          ['A stale response from the server', false],
          ['A mutation of the wrong object', false],
          ['A race between two updates', false]],
        'A data problem and a render problem need entirely different fixes.'),
      mcq('Using the array index as a key breaks because:',
        [['The index is not an identity when the array changes', true],
          ['Keys must be unique across the whole page', false],
          ['Numeric keys are compared as strings', false],
          ['The framework requires stable types for keys', false]],
        'Index 2 refers to a different thing, and the state goes with the position.'),
      mcq('A component defined inside another component’s render:',
        [['Is a new type every render, so it is destroyed and recreated', true],
          ['Cannot access the outer component’s state', false],
          ['Renders before its parent completes', false],
          ['Is memoised automatically by most frameworks', false]],
        'Which is why its state resets unexpectedly.'),
      mcq('A stale closure is the hardest of the five to see because:',
        [['The code reads correctly — the variable is right there', true],
          ['It only occurs under concurrent updates', false],
          ['The framework gives no warning', false],
          ['It depends on the render order', false]],
        'The callback captured a value from the render that created it.'),
    ],
    checkpoint: [
      mcq('A new object literal passed as a prop on every render:',
        [['Defeats every memoisation downstream', true],
          ['Increases memory use measurably', false],
          ['Causes the prop to arrive undefined', false],
          ['Is optimised away by the compiler', false]],
        'A different reference every time, so the comparison always says changed.'),
      mcq('Index keys are safe only when the list:',
        [['Never reorders, inserts or deletes', true],
          ['Is shorter than a few dozen items', false],
          ['Contains no interactive elements', false],
          ['Is regenerated from scratch each time', false]],
        'Rarer than the frequency of index keys suggests.'),
      mcq('The distinction that halves the search is:',
        [['Whether it is a data problem or a render problem', true],
          ['Whether it is a prop or state issue', false],
          ['Whether the component is memoised', false],
          ['Whether it happens on first or later renders', false]],
        'Log at the source and at the consumer, before reading the component.'),
    ],
  },

  {
    unitCode: 'T3_FRONTEND_COMPONENTS_PRACTICE',
    notes: `Two exercises on the decisions: what belongs in the URL, and what a key must be.
Neither needs a framework, because neither idea is framework-specific.`,
    coding: [
      {
        title: 'What goes in the URL',
        description: `Read one piece of state per line as \`<name> <shareable> <survives_reload>
<ephemeral>\`, each of the last three \`yes\` or \`no\`.

Print for each:

- ephemeral \`yes\` → \`local\`
- shareable \`yes\` → \`url\`
- survives_reload \`yes\` → \`url\`
- otherwise → \`local\`

Then a final line \`url=<n>\` counting how many go in the URL.

Ephemeral wins over the other two: a dropdown's open state should not be in the URL even if
somebody could argue it survives a reload.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Ephemeral is checked first. The order is the specification.
`,
        language: 'python',
        tests: [
          { input: 'filter yes yes no\n', expectedOutput: 'url\nurl=1' },
          { input: 'dropdown_open no yes yes\n', expectedOutput: 'local\nurl=0' },
          { input: 'page no yes no\n', expectedOutput: 'url\nurl=1' },
          { input: 'draft_text no no no\n', expectedOutput: 'local\nurl=0' },
          { input: '', expectedOutput: 'url=0' },
          { input: 'a yes no no\nb no no yes\nc no yes no\n', expectedOutput: 'url\nlocal\nurl\nurl=2', isHidden: true },
        ],
      },
      {
        title: 'Keys that survive a reorder',
        description: `Simulate what a framework does with keys.

Read a line of item ids — the list before. Then a line of item ids — the list after. Then a
word: \`index\` or \`id\`, the keying strategy.

Component state is attached to a key. Print, for each item in the **after** list,
\`<id>:<state_id>\` where state_id is the id of the item whose state that position inherits.

With \`id\` keying, an item keeps its own state — so state_id equals the id, or \`new\` if the
item was not in the before list.

With \`index\` keying, position n inherits the state of whatever was at position n before, or
\`new\` if the before list was shorter.`,
        starter: `import sys

lines = [l.split() for l in sys.stdin if l.split()]
before, after, strategy = lines[0], lines[1], lines[2][0]

# Index keying attaches state to a position. Id keying attaches it to a thing.
`,
        language: 'python',
        tests: [
          { input: 'a b c\na b c\nindex\n', expectedOutput: 'a:a\nb:b\nc:c' },
          { input: 'a b c\nb c\nindex\n', expectedOutput: 'b:a\nc:b' },
          { input: 'a b c\nb c\nid\n', expectedOutput: 'b:b\nc:c' },
          { input: 'a\na b\nindex\n', expectedOutput: 'a:a\nb:new' },
          { input: 'a b\nb a\nindex\n', expectedOutput: 'b:a\na:b', isHidden: true },
          { input: 'a b\nb a\nid\n', expectedOutput: 'b:b\na:a', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Components Practice',
      description: 'Decide what belongs in the URL, show what index keys do, then restructure a real screen.',
      instructions: `Complete both exercises, then:

1. For the first: give a piece of state that is arguably shareable and should still be local,
   and say what makes it so.
2. For the second: the \`b c / index\` case shows \`b\` inheriting \`a\`'s state. Describe a
   concrete user-visible bug that causes, in a list of editable rows.
3. For the second: say when index keys are genuinely safe, and estimate how often that
   condition actually holds in the lists you have built.

**Then, on a real screen.** Yours, or one you can modify.

4. Name the parts of the screen out loud and write the list. That is your component tree —
   compare it with the components that actually exist and report the differences.
5. Find one component doing more than one thing. Apply the "and" test and split it.
6. Find one leaf component that fetches or reads global state. Make it presentational by
   lifting that out. Show the before and after.
7. Find a piece of state that should be in the URL and is not. Move it. **Show the back button
   working afterwards**, and that a copied link reproduces the view.
8. Find a list keyed by index. Either fix it or demonstrate why it is safe.
9. Count the props on your largest component. If more than about seven, say which are switching
   behaviour and what composition would replace them.`,
      rubric: [
        { criterion: 'URL state decided', description: 'All cases, with ephemeral taking precedence.', maxPoints: 15 },
        { criterion: 'Key behaviour simulated', description: 'Both strategies, including reorder and growth.', maxPoints: 20 },
        { criterion: 'A real user-visible bug described', description: 'Concrete, in a list of editable rows.', maxPoints: 15 },
        { criterion: 'A component made presentational', description: 'Fetching or global state lifted out, before and after shown.', maxPoints: 20 },
        { criterion: 'State moved into the URL', description: 'Back button and a shared link both demonstrated working.', maxPoints: 20 },
        { criterion: 'Props audited', description: 'The largest component counted, with a composition alternative if needed.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

lines = [l.split() for l in sys.stdin if l.split()]
before, after, strategy = lines[0], lines[1], lines[2][0]
`,
        tests: [
          { input: 'a b c\na b c\nindex\n', expectedOutput: 'a:a\nb:b\nc:c' },
          { input: 'a b c\nb c\nindex\n', expectedOutput: 'b:a\nc:b' },
          { input: 'a b c\nb c\nid\n', expectedOutput: 'b:b\nc:c' },
          { input: 'a b\nb a\nindex\n', expectedOutput: 'b:a\na:b', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 20,
      },
    },
    checkpoint: [
      mcq('With index keys, deleting the first row causes:',
        [['Every row below to inherit the state of the row above it', true],
          ['The last row to lose its state', false],
          ['All rows to be recreated from scratch', false],
          ['The deleted row’s state to be reassigned to the end', false]],
        'Which is how your typing ends up in a different row.'),
      mcq('State that is arguably shareable but should stay local is typically:',
        [['Something ephemeral, like an open dropdown', true],
          ['Something large, like a loaded dataset', false],
          ['Something private, like a draft message', false],
          ['Something derived, like a filtered count', false]],
        'Ephemeral is checked first for exactly that reason.'),
      mcq('Demonstrating that a copied link reproduces the view proves:',
        [['The URL is genuinely the source of truth', true],
          ['The router is configured correctly', false],
          ['The state survives a reload', false],
          ['The filter is applied server-side', false]],
        'A second copy of the state would show up as a discrepancy here.'),
    ],
  },

  {
    unitCode: 'T3_FRONTEND_COMPONENTS_MINI_PROJECT',
    notes: `Take a screen that is one large component and give it a structure — with the URL as
the state and the back button working.

The brief's test is **the shared link**. If a colleague can open your URL and see exactly what
you see, filters and page and all, the state is in the right place. If they cannot, it is in a
component and the application does not behave like the web.

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — A Screen With a Real Structure',
      description: 'Restructure a large component, move its state into the URL, and prove the back button and shared links work.',
      instructions: `**Choose** a screen that is one component of at least 250 lines, with a
list, filters and a detail view. Yours, or one you can modify.

**Part one — before**

1. Report the line count and the number of state variables.
2. Name the parts of the screen out loud and write the list.
3. Say which pieces of state should be in the URL and are not.

**Part two — the split**

4. Split into the components you named. **Leaves presentational**, containers holding state.
5. Show one leaf component's props, and confirm it depends on nothing global.
6. Write a test for one presentational component. **It should need no network and no router.**

**Part three — the URL**

7. Move filters, search and pagination into the URL. **No second copy in component state.**
8. Demonstrate the back button moving between filter states correctly.
9. Demonstrate a copied link reproducing the exact view in a fresh tab.
10. Use \`replace\` where a history entry would be noise, and say where you did and why.

**Part four — the details**

11. Real links for navigation. Show that middle-click opens in a new tab.
12. Stable keys on every list. If you found index keys, show the bug they caused before fixing.
13. Every route has loading, error and empty states.
14. A route that does not match renders a real 404.

**Part five — assess it**

15. Report the new component count and the largest component's line count.
16. Which component has the most props? Is it doing too much?
17. Name one place you chose **not** to split, and why.
18. What got worse? More files, more indirection, a longer path to read — name one.

**Submit** the before and after structure, the shared-link demonstration, the presentational
component's test, and answers to 15–18.`,
      rubric: [
        { criterion: 'A named, real structure', description: 'Components match the parts of the screen, leaves presentational.', maxPoints: 20 },
        { criterion: 'A test with no world', description: 'One presentational component tested without network or router.', maxPoints: 15 },
        { criterion: 'URL as the single source', description: 'Filters, search and pagination in the URL, with no duplicate state.', maxPoints: 25 },
        { criterion: 'Back and shared link proven', description: 'Both demonstrated, including in a fresh tab.', maxPoints: 20 },
        { criterion: 'Links and keys correct', description: 'Real links with middle-click working, stable keys throughout.', maxPoints: 10 },
        { criterion: 'Honest assessment', description: 'What was not split, and what got worse.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The test of this project is:',
        [['A colleague opening your URL and seeing exactly what you see', true],
          ['The component count after splitting', false],
          ['The largest component ending up under a size limit', false],
          ['Every component having a test', false]],
        'If they cannot, the state is in a component and the app does not behave like the web.'),
      mcq('A presentational component’s test should need:',
        [['Neither a network nor a router', true],
          ['A router, since it may contain links', false],
          ['A mocked API client', false],
          ['The application’s state provider', false]],
        'It depends on nothing, which is what makes it presentational.'),
      mcq('Showing the bug index keys caused before fixing them:',
        [['Demonstrates the fix addressed something real', true],
          ['Is required to justify the change', false],
          ['Proves the list reorders in practice', false],
          ['Documents the behaviour for the next reader', false]],
        'The same standard as a test that fails before the fix.'),
    ],
  },

  /* ══ T3_FRONTEND_STATE ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_FRONTEND_STATE_WHERE_A_VALUE_LIVES',
    notes: `**Almost every frontend mess is state in the wrong place.** Not too much state, not
the wrong library — the wrong location. This is the hardest idea in the track and the one that
decides whether the codebase stays workable.

## The rule

**Put a value in the lowest place that can see everything needing it.**

Lower is better: fewer components re-render, fewer things can change it, and it disappears when
the component does.

**Only lift it when something else genuinely needs it.** Not when you think something might.

## The five places, cheapest first

**1. Local, inside one component.** A dropdown's open state, a toggle, a hover. **Most state
should be here** and in a well-structured application most of it is.

**2. Lifted to a common parent.** Two siblings need it, so their parent holds it and passes it
down. **This is the answer far more often than a store is.**

**3. In the URL.** Shareable, reloadable, in the back button. The routing unit's subject.

**4. On the server**, fetched. Not client state at all — the next unit's subject, and the
distinction that resolves most confusion about stores.

**5. In a global store.** Genuinely application-wide: the signed-in user, the theme, the
locale. **A short list**, and if yours is long, things are in it that should be at 1, 2, 3 or 4.

## Why lifting too early costs

    // in the top-level component
    const [searchQuery, setSearchQuery] = useState('');

Every keystroke re-renders the entire application. The value is visible and mutable from
everywhere, so tracing who changes it means reading everything.

**And it never comes back down.** Nobody lowers state, because it is not obviously safe to, so
the top-level component accumulates until it holds forty values and is the file everyone
conflicts in.

## Why a store too early costs more

A global store for a value two components share gives you: an action, a reducer, a selector, a
subscription, and a value whose source is now invisible from the component using it. **You have
replaced one prop with five concepts.**

**Reach for a store when prop drilling is genuinely painful across many levels, or when
unrelated parts of the application must react to the same change.** Not before.

## Moving state down

A skill nobody practises, and it is how a bloated top-level component recovers.

**Find a value used in only one subtree, and move it there.** The parent gets simpler, fewer
components re-render, and the value's scope now matches its actual use.

**The signal:** a value in the top-level component that only one branch reads.

## The duplication that causes bugs

**The same information in two places will disagree.**

    const [selectedId, setSelectedId] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);   // the same fact, twice

Update one and forget the other — and you will — and the screen shows a selected item that is
not the selected id. **Keep one, derive the other**, which is the derived-state unit's whole
subject.

## The question to ask

> **Who needs to know this, and who is allowed to change it?**

**The answer names the location.** If only this component needs it, it is local. If two siblings
do, it is their parent's. If a stranger opening a link should see it, it is in the URL. If it
came from the server, it is server state. **And if you cannot answer the second half — who is
allowed to change it — that is the thing to fix first**, because state anybody can change is
state nobody can reason about.`,
    mcqs: [
      mcq('The rule for placing a value is:',
        [['The lowest place that can see everything needing it', true],
          ['The highest place that keeps it accessible', false],
          ['Wherever it is first read', false],
          ['A store, if more than one component uses it', false]],
        'Lower means fewer re-renders, fewer writers, and automatic cleanup.'),
      mcq('State lifted too early never comes back down because:',
        [['Nobody lowers state, as it is not obviously safe to', true],
          ['Lowering it breaks the components that read it', false],
          ['The framework prevents moving state downwards', false],
          ['It is usually needed again later', false]],
        'So the top-level component accumulates until everyone conflicts in it.'),
      mcq('A global store for a value two components share replaces:',
        [['One prop with five concepts', true],
          ['Two props with one subscription', false],
          ['A lifted value with a cheaper lookup', false],
          ['Prop drilling with a single source of truth', false]],
        'An action, a reducer, a selector, a subscription, and an invisible source.'),
      mcq('Storing both `selectedId` and `selectedItem`:',
        [['Guarantees they will eventually disagree', true],
          ['Improves render performance', false],
          ['Is safe if both are set together', false],
          ['Avoids an unnecessary lookup', false]],
        'Keep one, derive the other.'),
    ],
    checkpoint: [
      mcq('A value in the top-level component read by only one branch:',
        [['Should be moved down into that branch', true],
          ['Is correctly placed for future reuse', false],
          ['Should be moved into a store', false],
          ['Is fine if it rarely changes', false]],
        'Moving state down is the skill nobody practises.'),
      mcq('The second half of the placement question is:',
        [['Who is allowed to change it', true],
          ['How often it changes', false],
          ['Where it came from', false],
          ['Whether it must persist', false]],
        'State anybody can change is state nobody can reason about.'),
      mcq('A long list of values in the global store usually means:',
        [['Things are in it that belong local, lifted, in the URL or on the server', true],
          ['The application is genuinely complex', false],
          ['The store simply needs splitting into separate modules', false],
          ['Selectors are being used incorrectly', false]],
        'The legitimately global list is short.'),
    ],
  },

  {
    unitCode: 'T3_FRONTEND_STATE_SERVER_STATE',
    notes: `**Data from the server is not client state**, and treating it as though it were is
the cause of most state-management complexity in frontend applications.

## The difference

**Client state** is owned by the client. A form's contents, whether a modal is open, which tab
is selected. **It is true because the client says so.**

**Server state** is a *copy* of something owned elsewhere. Your list of orders is a snapshot of
what the server had when you asked. **It is true because the server said so, a moment ago, and
it may already be wrong.**

**Everything awkward about server state comes from it being a cache**, and a cache has
properties client state does not:

- **It can be stale.** Somebody else changed it.
- **It needs refetching.** On focus, on an interval, after a mutation.
- **It has loading and error states.** Client state never fails to load.
- **It is shared.** Two components asking for the same thing should not make two requests.
- **It can be invalidated.** A write makes some of it wrong.

## Why putting it in a client store hurts

    dispatch(fetchOrders())      // into the global store, as though it were client state

**You have written a cache without meaning to**, and you now own every hard problem the caching
topic described: invalidation, staleness, deduplication, and knowing when to refetch.

**And you have to write it again for every resource.** Loading flags, error flags, a refetch
action, invalidation on write — per endpoint, by hand, slightly differently each time.

## What to do instead

**Use a data-fetching library** — the category exists precisely for this, and every framework
has one. They give you, for free: caching keyed on the request, deduplication of concurrent
requests, loading and error states, refetch on focus and reconnect, invalidation after a
mutation, and a stale-while-revalidate policy so the user sees data immediately and it updates
underneath.

**Writing that yourself is a month**, and doing it correctly is the same month the caching
topic warned about.

**Then your client store holds only client state**, which is usually so little that you do not
need a store at all — and that is the real payoff. **Most applications that feel like they need
a state library need a data-fetching library instead.**

## Optimistic updates

Update the screen before the server confirms, so the interface feels immediate.

    setLiked(true);                      // immediately
    await api.like(id).catch(() => setLiked(false));   // revert on failure

**Worth it for small, reversible, usually-succeeding actions** — a like, a checkbox, reordering.

**Not worth it for anything consequential.** An order that appears and then vanishes is worse
than a spinner. **And the revert must be visible**, or the user believes it worked: a silent
revert is how somebody sends a message they think was sent and was not.

## Staleness, deliberately

**How wrong may this be?**

- A notification count — seconds.
- A list of orders — a minute, refetched on focus.
- A country list — the session.

**Say the number.** The default in most libraries is a few seconds, and the default is rarely
the right answer for anything you have thought about — which is the same point the core caching
topic made about TTLs, arriving on the client.`,
    mcqs: [
      mcq('Server state is difficult because:',
        [['It is a cache, with everything that implies', true],
          ['It arrives asynchronously', false],
          ['It is larger than client state', false],
          ['It changes more frequently', false]],
        'Staleness, invalidation, deduplication and refetching all follow from that.'),
      mcq('Putting fetched data in a global client store means:',
        [['You have written a cache without meaning to', true],
          ['The data is shared efficiently', false],
          ['Refetching becomes unnecessary', false],
          ['Components re-render less often', false]],
        'And you own every hard problem a cache has, per endpoint, by hand.'),
      mcq('Most applications that feel like they need a state library:',
        [['Need a data-fetching library instead', true],
          ['Need better component structure', false],
          ['Have too much local state', false],
          ['Should use the URL more', false]],
        'Once server state is handled, the remaining client state is usually tiny.'),
      mcq('An optimistic update that reverts must:',
        [['Revert visibly', true],
          ['Retry before reverting', false],
          ['Revert only after a confirmation', false],
          ['Log the failure silently', false]],
        'A silent revert is how somebody believes a message was sent.'),
    ],
    checkpoint: [
      mcq('Optimistic updates are inappropriate for:',
        [['Anything consequential, like placing an order', true],
          ['A like button', false],
          ['A checkbox being toggled on a settings screen', false],
          ['Reordering a list', false]],
        'An order that appears and then vanishes is worse than a spinner.'),
      mcq('The default staleness in a data-fetching library is:',
        [['Rarely right for anything you have thought about', true],
          ['A safe choice for most resources', false],
          ['Too long for typical applications', false],
          ['Configured for each component automatically', false]],
        'Say the number, as the core caching topic said about TTLs.'),
      mcq('Two components requesting the same resource should:',
        [['Share one request, through deduplication', true],
          ['Each make their own request', false],
          ['Be merged together into a single component', false],
          ['Read from a shared store', false]],
        'Which a data-fetching library gives you and a hand-rolled store does not.'),
    ],
  },

  {
    unitCode: 'T3_FRONTEND_STATE_DERIVED_STATE',
    notes: `**If you can compute it, do not store it.** Stored copies of computable values are
the most reliable source of inconsistency in a frontend application.

## The problem

    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [count, setCount] = useState(0);
    const [hasItems, setHasItems] = useState(false);

Four values, one fact. **Every place that changes \`items\` must remember to update the other
three**, and the one that forgets produces a basket showing three items and a total of zero.

**And the bug is not where the wrong number is displayed.** It is in whichever update path
forgot, which may be in a completely different file.

## The fix

    const [items, setItems] = useState([]);
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    const count = items.length;
    const hasItems = items.length > 0;

**One source of truth. Three derivations. They cannot disagree**, because there is nothing to
keep in step.

## "But it recalculates on every render"

Usually that does not matter. **Summing forty numbers is free** — far cheaper than the render
around it, and vastly cheaper than a bug.

**Measure before memoising.** The profiler will tell you, and the answer is almost always that
the derivation is not the cost.

**Memoise when the computation is genuinely expensive** — sorting ten thousand rows, a heavy
filter, a parse — and then only after seeing it in a profile.

## What is actually derived

More than people realise:

- **Filtered and sorted lists.** Derive from the data and the filter. Do not keep a
  \`filteredItems\` alongside \`items\`.
- **Validation state.** Derive from the values. A stored \`isValid\` is wrong the moment a
  field changes and the update is missed.
- **"Can the user submit?"** Derived from validity and whether a request is in flight.
- **The selected object.** Store the id; derive the object by looking it up.
- **Anything the URL implies.** The routing unit's point, from the other side.

## The exception

**Store it when the derivation is not repeatable.**

The value at a *moment*: the price at the time of order, the exchange rate applied, the name as
it was when the invoice was issued. **Recomputing those from current data gives a different and
wrong answer** — and this is a real and important case that the "derive everything" advice
misses.

**The test:** *would recomputing this in a year give the same answer?* If no, it is a fact to
store, not a value to derive.

## The related smell

**An effect that sets state from other state.**

    useEffect(() => { setTotal(computeTotal(items)); }, [items]);

This is derivation with extra steps and one more render, and it introduces a moment where
\`items\` has updated and \`total\` has not. **Any component reading both during that moment
sees an inconsistent pair.**

**If an effect's only job is to set state from other state, delete it and compute the value
directly.** That rule removes a surprising amount of code and a whole class of bug.`,
    mcqs: [
      mcq('Storing `total` alongside `items` guarantees:',
        [['Some update path will forget, and they will disagree', true],
          ['An extra render on every change', false],
          ['A performance cost on large lists', false],
          ['The total will lag by one update', false]],
        'And the bug lives in whichever path forgot, not where the wrong number shows.'),
      mcq('Recomputing a derived value on every render:',
        [['Usually costs less than the render around it', true],
          ['Should be memoised as a matter of course', false],
          ['Doubles the work of the component', false],
          ['Is only acceptable for small lists', false]],
        'Measure before memoising; the derivation is almost never the cost.'),
      mcq('A stored `isValid` flag is wrong because:',
        [['It is stale the moment a field changes and the update is missed', true],
          ['Validation is expensive to compute', false],
          ['It duplicates the field errors', false],
          ['It cannot express partial validity', false]],
        'Derive it from the values.'),
      mcq('The exception to deriving is a value that:',
        [['Was true at a moment and cannot be recomputed', true],
          ['Is expensive to calculate', false],
          ['Is used by many components', false],
          ['Comes from the server', false]],
        'The price at the time of order; recomputing gives a different and wrong answer.'),
    ],
    checkpoint: [
      mcq('The test for whether to store or derive is:',
        [['Would recomputing it in a year give the same answer', true],
          ['Is it used more than once per render', false],
          ['Does it depend on more than one other value', false],
          ['Is the computation more than trivial', false]],
        'If no, it is a fact to store rather than a value to derive.'),
      mcq('An effect whose only job is to set state from other state:',
        [['Should be deleted and the value computed directly', true],
          ['Is the correct way to keep values in step', false],
          ['Should be memoised instead', false],
          ['Is needed when the dependency is an object', false]],
        'It adds a render and a window of inconsistency.'),
      mcq('For a selected item, you should store:',
        [['The id, and derive the object', true],
          ['The object, and derive the id', false],
          ['Both, for convenience', false],
          ['The index in the list', false]],
        'One source of truth; the other cannot then disagree.'),
    ],
  },

  {
    unitCode: 'T3_FRONTEND_STATE_DEBUGGING',
    notes: `Five state problems and what identifies each.

## 1. Two things that should agree and do not

**Symptom:** the count says three and the list shows two. The button is disabled but the form
is valid.

**Cause:** duplicated state. The same fact in two places, and one update path missed.

**Diagnosis:** **search for the fact, not the bug.** Grep for \`total\`, \`count\`, \`selected\`
and see how many pieces of state hold it. **More than one is the answer**, and the fix is to
derive rather than to add a third update.

## 2. It updates, then reverts

**Symptom:** the value changes and snaps back a moment later.

**Causes:** an optimistic update failing and reverting — correct behaviour, badly presented; a
refetch overwriting a local change; two sources of the same data, one stale.

**Diagnosis:** log every write to that value with a timestamp. **Two writes close together with
different values is the whole story**, and the second one tells you which source is winning.

## 3. The state that is always one behind

**Symptom:** you type "abc" and the state holds "ab".

**Cause:** reading a state value in the same tick you set it, or a handler closing over the
previous render's value.

**Fix:** use the functional update form, which receives the current value rather than the
captured one. **This is a stale closure from the components topic**, appearing as a data bug.

## 4. Everything re-renders on every keystroke

**Symptom:** typing is sluggish in a large application.

**Cause:** the input's value lives at the top of the tree.

**Diagnosis:** the profiler shows the render count. **Move the state down** — the input and its
immediate surroundings are usually the only things that need it, and the search only needs to
be lifted at submit or after a debounce.

## 5. State that survives when it should not

**Symptom:** you open record 5's edit form, close it, open record 9, and see record 5's values.

**Cause:** the component was reused rather than recreated, so its state persisted.

**Fix:** a key on the component that changes with the record. **Changing the key forces a fresh
instance** — which is the same key mechanism as the list bug, used deliberately.

## The general method

**Find the source of truth.** For any wrong value on screen, the first question is where it is
supposed to come from. **Surprisingly often the answer is "two places", and that is the bug**
before you have looked at any logic.

**Then log every write** to that value. Not the reads — the writes, with a timestamp and a
stack if you can. Most state bugs are one write too many, one too few, or two in the wrong
order, and all three are obvious from a list of writes.

**Use the state inspector**, which shows what is actually held rather than what you believe is
held. As with props, that resolves a large fraction of these in seconds.`,
    mcqs: [
      mcq('For two values that disagree, you should:',
        [['Search for the fact and count how many places hold it', true],
          ['Add an update in the path that missed it', false],
          ['Log both values on every render', false],
          ['Check the order the updates are applied in', false]],
        'More than one place is the answer, and deriving is the fix.'),
      mcq('A value that updates and reverts is diagnosed by:',
        [['Logging every write with a timestamp', true],
          ['Checking the network response', false],
          ['Inspecting the component tree', false],
          ['Disabling the optimistic update', false]],
        'Two writes close together with different values is the whole story.'),
      mcq('State that is always one behind is caused by:',
        [['A handler closing over the previous render’s value', true],
          ['An update applied after the render completes', false],
          ['A missing dependency in the effect', false],
          ['The value being derived rather than stored', false]],
        'A stale closure appearing as a data bug; the functional update form fixes it.'),
      mcq('An edit form showing the previous record’s values means:',
        [['The component was reused rather than recreated', true],
          ['The fetch returned a cached response', false],
          ['The state was lifted too high', false],
          ['The form was not reset on close', false]],
        'A key that changes with the record forces a fresh instance.'),
    ],
    checkpoint: [
      mcq('Sluggish typing in a large application usually means:',
        [['The input’s value lives too high in the tree', true],
          ['The input is uncontrolled', false],
          ['The component is not memoised', false],
          ['The debounce interval has been set too short', false]],
        'Move the state down; only the input and its surroundings need it.'),
      mcq('The first question about any wrong value on screen is:',
        [['Where it is supposed to come from', true],
          ['When it was last updated', false],
          ['Which component rendered it', false],
          ['Whether the server returned it correctly', false]],
        'Surprisingly often the answer is two places, and that is the bug.'),
      mcq('Logging writes rather than reads is more useful because:',
        [['Most state bugs are one write too many, too few, or misordered', true],
          ['Reads happen far more often', false],
          ['Writes are considerably easier to instrument', false],
          ['Reads do not change the value', false]],
        'All three are obvious from a list of writes.'),
    ],
  },

  {
    unitCode: 'T3_FRONTEND_STATE_PRACTICE',
    notes: `Two exercises on the two decisions: where a value belongs, and whether it should be
stored at all.`,
    coding: [
      {
        title: 'Where does it live?',
        description: `Read one value per line as
\`<name> <consumers> <shareable> <from_server> <app_wide>\`, where consumers is an integer count
of components needing it and the last three are \`yes\` or \`no\`.

Print the location, checking in this order:

- from_server \`yes\` → \`server_state\`
- app_wide \`yes\` → \`store\`
- shareable \`yes\` → \`url\`
- consumers is 1 → \`local\`
- otherwise → \`lifted\`

Then a final line \`store=<n>\` counting how many went to the store.

The order encodes the unit's argument: server state is not client state at all, and the store
is for genuinely application-wide values rather than for anything shared.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# The order of checks is the argument. Server state first; store only for app-wide.
`,
        language: 'python',
        tests: [
          { input: 'orders 3 no yes no\n', expectedOutput: 'server_state\nstore=0' },
          { input: 'theme 40 no no yes\n', expectedOutput: 'store\nstore=1' },
          { input: 'filter 2 yes no no\n', expectedOutput: 'url\nstore=0' },
          { input: 'dropdown 1 no no no\n', expectedOutput: 'local\nstore=0' },
          { input: 'selection 3 no no no\n', expectedOutput: 'lifted\nstore=0' },
          { input: '', expectedOutput: 'store=0' },
          { input: 'user 20 no yes yes\n', expectedOutput: 'server_state\nstore=0', isHidden: true },
        ],
      },
      {
        title: 'Store it or derive it',
        description: `Read one value per line as \`<name> <computable> <point_in_time>\`, each
of the last two \`yes\` or \`no\`.

Print:

- point_in_time \`yes\` → \`store\` (recomputing it later gives a different answer)
- computable \`yes\` → \`derive\`
- otherwise → \`store\`

Then a final line listing the names marked \`derive\`, space separated, or \`none\`.

The point-in-time check comes first, and that ordering is the exception the unit describes.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# A price at the time of order is computable and must still be stored.
`,
        language: 'python',
        tests: [
          { input: 'total yes no\n', expectedOutput: 'derive\ntotal' },
          { input: 'price_at_order yes yes\n', expectedOutput: 'store\nnone' },
          { input: 'items no no\n', expectedOutput: 'store\nnone' },
          { input: 'count yes no\nis_valid yes no\n', expectedOutput: 'derive\nderive\ncount is_valid' },
          { input: '', expectedOutput: 'none' },
          { input: 'rate yes yes\nfiltered yes no\n', expectedOutput: 'store\nderive\nfiltered', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'State Management Practice',
      description: 'Place values correctly, decide store against derive, then audit a real application.',
      instructions: `Complete both exercises, then:

1. For the first: a value that is both from the server and app-wide goes to \`server_state\`.
   Say why that ordering is right, using the unit's argument.
2. For the first: give a value with three consumers that should still be \`local\`, and say what
   is wrong with the model that makes it come out as \`lifted\`.
3. For the second: explain the point-in-time exception with a concrete example that is not the
   price of an order.

**Then, on a real application.** Yours, or one you can read.

4. List every piece of state in the top-level component. For each, say where it should live
   under the rule.
5. Find one value that is stored and could be derived. Remove the stored copy. **Show the
   update paths you deleted.**
6. Find one value that is duplicated. Reduce it to one source and derive the rest.
7. Find one piece of server data held in a client store. Say what cache behaviour you are
   hand-implementing for it — staleness, refetch, invalidation, deduplication — and which of
   the four are missing.
8. Move one value down the tree. Report the re-render count before and after, from the profiler.
9. Count the values in your global store. For each, say whether it is genuinely
   application-wide. Report how many are not.`,
      rubric: [
        { criterion: 'Locations decided', description: 'All cases, with the check order respected.', maxPoints: 20 },
        { criterion: 'Store against derive', description: 'All cases, with the point-in-time exception first.', maxPoints: 15 },
        { criterion: 'The exception explained', description: 'A concrete example that is not the order price.', maxPoints: 15 },
        { criterion: 'A stored value derived', description: 'Copy removed and the deleted update paths shown.', maxPoints: 20 },
        { criterion: 'Hand-rolled cache identified', description: 'Which of the four behaviours are implemented and which are missing.', maxPoints: 15 },
        { criterion: 'A value moved down, measured', description: 'Re-render counts before and after from the profiler.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'orders 3 no yes no\n', expectedOutput: 'server_state\nstore=0' },
          { input: 'theme 40 no no yes\n', expectedOutput: 'store\nstore=1' },
          { input: 'filter 2 yes no no\n', expectedOutput: 'url\nstore=0' },
          { input: 'dropdown 1 no no no\n', expectedOutput: 'local\nstore=0' },
          { input: 'user 20 no yes yes\n', expectedOutput: 'server_state\nstore=0', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 20,
      },
    },
    checkpoint: [
      mcq('Server state is checked before app-wide because:',
        [['It is a cache, not client state, whatever its scope', true],
          ['Server data is usually larger', false],
          ['It changes far more often than client state does', false],
          ['Stores cannot hold asynchronous values', false]],
        'Scope does not change what kind of thing it is.'),
      mcq('The deleted update paths are worth showing because:',
        [['Each was a place the copies could have diverged', true],
          ['They demonstrate the refactor was thorough', false],
          ['They show the derivation is correct', false],
          ['They measure how much code was removed', false]],
        'The bug lived in whichever one forgot.'),
      mcq('Hand-implementing server-state caching usually misses:',
        [['Deduplication and refetch on focus', true],
          ['Loading and error states', false],
          ['Invalidation after a write', false],
          ['Storing the response at all', false]],
        'People implement the obvious two and not the other two.'),
    ],
  },

  {
    unitCode: 'T3_FRONTEND_STATE_MINI_PROJECT',
    notes: `Take an application whose state is a mess and put every value where it belongs —
measuring the re-renders rather than asserting an improvement.

The brief's measurement is **renders per keystroke**. It is one number, it is easy to get from
any profiler, and it tracks the central idea: state in the wrong place makes unrelated things
re-render.

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — Every Value Where It Belongs',
      description: 'Audit and relocate the state of a real application, measured by renders and by duplicated facts.',
      instructions: `**Choose** an application with at least eight screens' worth of state, or a
substantial single screen. Yours, or one you can modify.

**Part one — the audit**

1. List every piece of state: name, where it lives now, how many components read it.
2. Classify each: local, lifted, URL, server state, store.
3. **Count the mismatches** — where it lives against where it belongs.
4. Find every duplicated fact. Two pieces of state carrying the same information. Report how
   many.
5. Find every stored value that could be derived. Report how many.

**Part two — measure before**

6. Renders per keystroke in your main input, from the profiler.
7. The number of values in the global store.
8. The number of components that re-render when one unrelated value changes.

**Part three — fix, in this order**

9. **Derive what can be derived.** Remove the stored copies and the update paths that kept
   them.
10. **Remove the duplicated facts.** One source each.
11. **Move server data out of the client store** into a data-fetching library, or say why not
    and list the cache behaviours you are maintaining by hand.
12. **Move state down** wherever a value is read by one subtree.
13. **Move shareable state into the URL.**

**Part four — measure after**

14. Renders per keystroke, before and after.
15. Values in the global store, before and after.
16. Lines of state-management code removed.

**Part five — the honest part**

17. Which change made the biggest difference? Was it the one you expected?
18. Name one value you could not place cleanly, and why it resists the rule.
19. Did anything get worse? More prop drilling is a real cost and a legitimate answer.
20. If the store is now empty or nearly so, say whether you would remove the library.

**Submit** the state audit table, the before and after measurements, and answers to 17–20.`,
      rubric: [
        { criterion: 'A complete audit', description: 'Every value listed, classified, with mismatches counted.', maxPoints: 20 },
        { criterion: 'Duplication removed', description: 'Duplicated facts reduced to one source, update paths deleted.', maxPoints: 20 },
        { criterion: 'Server state separated', description: 'Moved out, or the hand-maintained cache behaviours listed honestly.', maxPoints: 20 },
        { criterion: 'Renders measured', description: 'Per keystroke, before and after, from a profiler.', maxPoints: 20 },
        { criterion: 'A value that resists the rule', description: 'Named, with why it does not fit.', maxPoints: 10 },
        { criterion: 'What got worse', description: 'Named honestly, including added prop drilling.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Renders per keystroke is the chosen measurement because:',
        [['State in the wrong place makes unrelated things re-render', true],
          ['It correlates closely with the size of the store', false],
          ['It is the easiest metric to collect', false],
          ['Typing is the most common interaction', false]],
        'One number, from any profiler, tracking the central idea.'),
      mcq('If the global store ends up nearly empty, that:',
        [['Suggests the library may not be needed', true],
          ['Means the audit was too aggressive', false],
          ['Indicates state was moved somewhere wrong', false],
          ['Is expected and requires no comment', false]],
        'Most applications that feel like they need one need a data-fetching library.'),
      mcq('Added prop drilling as a result of moving state down is:',
        [['A real cost and a legitimate answer', true],
          ['A sign the value was moved too far', false],
          ['Always worth it for the render saving', false],
          ['Avoidable by using context instead', false]],
        'The brief asks what got worse because there is always something.'),
    ],
  },
];
