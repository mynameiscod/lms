/**
 * Career-track placement content: Mobile Developer Interview Questions (MB_IV), Mobile, batch MB4.
 *
 * Interview versions of what the track taught: JavaScript and TypeScript (MB_TYPESCRIPT, and the JavaScript the
 * students brought from the web topics), React Native (MB_RN_BASICS, MB_NAVIGATION), state and architecture
 * (MB_STATE_DATA, MB_STORAGE_OFFLINE, MB_AUTH_API), native Android (MB_ANDROID_NATIVE, MB_DEVICE_APIS), and
 * performance, testing and release (MB_TESTING_PERF, MB_RELEASE). Each set gives the question, what the panel is
 * testing, a model answer to say aloud, the follow-up a good answer earns and the weak answer that loses the round.
 * The topics' own INTERVIEW_QUESTION units already ask interface versus type, any versus unknown, validating API data,
 * generics, how React Native renders, a stuttering 2,000-item list, Expo versus the CLI, platform differences, a
 * navigation structure, Expo Router versus React Navigation, deep links, a wrong Back, how to manage state, Context,
 * optimistic updates, forms, choosing storage, where the JWT goes, offline orders, sync conflicts, a denied camera,
 * push design, rider location, background sync, native modules, recomposition, a release-only crash, android/ edits
 * in Expo, token refresh, Wi-Fi versus mobile data, PKCE and security mistakes; these sets ask what a panel asks next.
 *
 * Context: React Native and mobile developer roles for freshers at Indian product companies, start-ups, GCCs and IT
 * services. What was run: every JavaScript output under Node 23 (event-loop order, a promise-caching once(), this in a
 * listener, a fetch timeout against a slow local server); every TypeScript error with tsc 6 in the Expo SDK 58
 * project; the React Native behaviour with jest-expo and Testing Library (error boundaries, a search race, polling with
 * useEffect versus useFocusEffect in a native stack, normalised Redux state, query-key invalidation, logout with a
 * mounted query). Not run: anything on a device or emulator, Kotlin, Gradle, Play Console, EAS; the Android and
 * release answers are written from developer.android.com, kotlinlang.org, docs.expo.dev and the Play Console help.
 *
 * Attribution: the topic is multi-skill. Each IV_* unit declares one skill and its checkpoint questions name it with
 * ck(); the CHECKPOINT unit spreads its ten over the five skills. Practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_MB_IV_BUNDLES: PilotBundle[] = [
  /* ── IV_JS_TS ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_IV_IV_JS_TS',
    notes: `Almost every React Native round in India opens with fifteen minutes of JavaScript and TypeScript, because a candidate who
cannot predict what their own code prints will not find the bug in a payment screen. The TypeScript topic's interview
set already asked interface versus type, any versus unknown, validating API data and generics. These are the questions
that come after those, with output you can trust: every JavaScript snippet below ran under Node, and every TypeScript
error was produced by tsc in an Expo project. The ordering rules are the language's, so Hermes on the phone follows
them too.

## Q1. "What does this print?"

**Testing:** whether you know the event loop well enough to predict an order, not just recite "microtasks first".

    async function placeOrder() {
      console.log('1 placeOrder start');
      await saveDraft();
      console.log('2 after await saveDraft');
    }
    async function saveDraft() { console.log('3 saveDraft body'); }

    console.log('4 tap');
    setTimeout(() => console.log('5 timeout 0'), 0);
    Promise.resolve().then(() => console.log('6 then'));
    queueMicrotask(() => console.log('7 microtask'));
    placeOrder();
    console.log('8 end of handler');

Real output:

    4 tap
    1 placeOrder start
    3 saveDraft body
    8 end of handler
    6 then
    7 microtask
    2 after await saveDraft
    5 timeout 0

**Model answer.** "Everything synchronous runs first: 4, then placeOrder starts, and an async function runs
synchronously until its first await, so 1 and saveDraft's body, 3. The await gives control back, so 8 prints. Now
the microtask queue drains in the order jobs were queued: the then callback (6), the queueMicrotask (7), and the
continuation after await (2), which was queued last because saveDraft's promise resolved after those two were
queued. Only when the microtask queue is empty does the event loop take the timer, 5. setTimeout 0 means 'not
before', never 'now'."

**Follow-up:** "A tap handler does 400 ms of synchronous work. What does the user see in React Native?" — "The JS
thread is blocked, so the next tap, a state update and any JS-driven animation wait. Native scrolling and animations
running on the native driver keep moving. The fix is to do less on that thread: move the work off the tap path,
split it, or let the server do it."

**Weak answer:** "setTimeout 0 runs immediately" or "await makes the code synchronous".

## Q2. "Write once(): our analytics SDK must initialise exactly once, even if two screens call it."

**Testing:** closures used for something real, and whether you think about async and failure.

**Model answer.** "The closure keeps private state between calls. For async work I cache the promise, not the
result, so two callers in the same tick share one call. And I clear it on failure, or one bad network moment breaks
analytics until the app restarts:"

    function once(fn) {
      let promise = null;
      return (...args) => {
        if (!promise) {
          promise = Promise.resolve().then(() => fn(...args))
            .catch((err) => { promise = null; throw err; });
        }
        return promise;
      };
    }

With an init that fails on the first call and succeeds after:

    rejected network down | rejected network down | calls = 1
    ready:k1 | calls = 2
    ready:k1 | calls = 2

"Two simultaneous callers shared one attempt, both saw the failure, the next call retried, and after success it never
ran again. The naive version, a done flag and a stored result, printed 'network down' on all three attempts with
calls = 1: it cached the rejection for ever."

**Follow-up:** "Where else would you use this?" — "Refreshing a token: five requests get a 401 together and only one
refresh call should go out. It is the same single-flight pattern you met in the token-refresh lesson."

## Q3. "Why does this crash when the network comes back?"

**Testing:** how \`this\` is decided, in code a mobile developer actually writes.

    class CartSync {
      pending = 3;
      onNetworkChange(state) {
        if (state.isConnected) console.log('flushing', this.pending, 'orders');
      }
    }
    NetInfo.addEventListener(sync.onNetworkChange);   // passed as a plain function

Running the three ways to register it with a stand-in listener list:

    arrow flushing 3 orders                                              <- arrow class field
    flushing 3 orders                                                    <- .bind(sync)
    TypeError: Cannot read properties of undefined (reading 'pending')   <- plain method

**Model answer.** "this is decided by how a function is called, not where it was written. The listener calls it as a
plain function, and class bodies are strict mode, so this is undefined. Either bind it, or write the method as an
arrow-function class field, which captures this from the instance when it is constructed."

**Follow-up:** "Is the arrow field free?" — "No. A normal method lives once on the prototype; an arrow field is a new
function on every instance. I checked: CartSync.prototype.onNetworkChange is a function, the arrow version is
undefined there, and two instances share the method but not the arrow. That matters for thousands of objects, not for
one sync service. In function components the question disappears, which is one reason we write them."

## Q4. "Add a timeout to fetch. Users on patchy 4G stare at a spinner for a minute."

**Testing:** whether you know a timeout must cancel the request, not only stop waiting.

**Model answer.** "fetch has no timeout option, and Promise.race with a timer only stops me waiting: the request
keeps going and its body still downloads on the user's data. I abort it with an AbortController:"

    async function fetchWithTimeout(url, ms) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ms);
      try {
        const res = await fetch(url, { signal: controller.signal });
        return await res.json();
      } finally {
        clearTimeout(timer);
      }
    }

Against a local server that answers in 300 ms, with a 100 ms limit:

    abort: AbortError - This operation was aborted
    race: timeout
    race: request finished anyway -> {"items":12}

"The race version reported a timeout and then quietly finished the download. The aborted one did not. The finally
clears the timer, so a fast response does not leave a timer behind."

**Follow-up:** "And then retry?" — "Only for idempotent requests or ones with an idempotency key, with exponential
backoff and jitter, and never retry a 4xx. A timeout on POST /orders does not mean the order failed."

## Q5. "How do you model a payment screen's state in TypeScript?"

**Testing:** discriminated unions as design, not syntax. The lesson taught the syntax; the panel wants the reason.

**Model answer.** "Not as isLoading, error and data booleans, because that allows states that cannot happen, like
loading with an error. One union, one tag:"

    type PaymentState =
      | { status: 'idle' }
      | { status: 'pending'; upiRef: string }
      | { status: 'success'; orderId: string }
      | { status: 'failed'; reason: 'DECLINED' | 'TIMEOUT' }
      | { status: 'refunded'; refundId: string };

"A switch on status narrows each branch, and a default that passes the value to a function taking never makes the
compiler list what I forgot. With 'refunded' added and not handled, tsc said:"

    error TS2345: Argument of type '{ status: "refunded"; refundId: string; }' is not assignable to
    parameter of type 'never'.

"And reading s.orderId inside the pending branch fails with TS2339, Property 'orderId' does not exist, so the
screen cannot show an order id that does not exist yet."

**Follow-up:** "Enum or a union of string literals?" — "A union, usually: it erases to plain strings, matches JSON
from the API, and works with tools that strip types. With TypeScript's erasableSyntaxOnly option, enum OrderStatus
fails with TS1294, 'This syntax is not allowed'. For a list I can loop over, an as const array gives me both:
type OrderStatus = (typeof ORDER_STATUS)[number]."

## Q6. "Why did TypeScript accept this object with an extra field?"

    interface CartLine { sku: string; qty: number }
    addLine({ sku: 'ATTA-5KG', qty: 1, coupon: 'FIRST50' });   // error TS2353
    const fromServer = { sku: 'ATTA-5KG', qty: 1, coupon: 'FIRST50' };
    addLine(fromServer);                                         // compiles

**Model answer.** "TypeScript is structural: any value with at least sku and qty is a CartLine. The excess-property
check is an extra lint that runs only on a fresh object literal, where an unknown key is almost certainly a typo.
Once the object is in a variable it is just a wider value, and wider is allowed. So if the server can send extra
fields, I do not rely on types to strip them; the runtime schema does that."

**Follow-up:** "Then why is Object.keys(prices) a string[] and not the keys?" — "For the same reason: the object might
hold more keys than its type shows. Indexing prices[k] with a string failed with TS7053 in my check. I loop over a
typed list of keys, or use Object.entries and accept number values."

## How you are judged

Strong answers predict output before running it, explain with the rule ("a function's this comes from the call"),
and connect it to a mobile bug. Weak answers recite definitions and stop when the panel changes one line.`,
    workedExample: `**Question: "Our home screen calls three APIs: profile, active orders and offers. On slow networks it sometimes shows
the previous user's offers after logout, and sometimes the spinner never stops. Walk me through the JavaScript."**

**A weak answer:**

"I would use async/await and a try/catch, and add a loading flag."

What the panel hears: no cause for either symptom.

**A strong answer:**

"Two separate bugs.

**The spinner that never stops.** If the three calls are chained with await one after another, one slow call delays
the others, and if any has no timeout, a stalled connection leaves the promise pending for ever, so finally never
runs. I would start them together and give each an AbortController with a timeout, so a stalled request ends as an
AbortError I can show as 'Could not load offers'. Offers failing should not hide orders, so I would use
Promise.allSettled for the optional parts and render what arrived.

**The previous user's offers.** A request started before logout finishes after it and writes into state. The
response belongs to a world that no longer exists. Three fixes, together: abort in-flight requests on logout, ignore
a response whose user id or request id is not the current one (the same 'is this still current?' check a search box
needs), and clear the cached data on logout rather than only the token.

**Then I would prove it.** A Jest test with a fake fetch whose offers response resolves after logout, asserting the
screen shows nothing for the old user; and a test with a stalled fetch and fake timers, asserting the error text
appears after the timeout."

**Why it scores:** it separates the two symptoms, names the cause of each (an un-cancelled promise, a stale response),
uses the right tools (AbortController, allSettled, a current-request check) and ends with tests that would fail
before the fix.`,
    mcqs: [
      mcq('In the order-placing snippet, why does "2 after await saveDraft" print after "6 then" and "7 microtask" but before "5 timeout 0"?', [
        ['The continuation is a microtask queued after the other two; timers wait for an empty microtask queue', true],
        ['await always waits one full event-loop turn, so it runs after every other callback that has been queued', false],
        ['saveDraft is async, so its body runs last, and the continuation is printed straight after that body', false],
        ['Microtasks run in reverse order of queueing, so the last-queued then callback is always printed first', false],
      ], 'The continuation is queued as a microtask when saveDraft\'s promise settles, after the then and queueMicrotask jobs, and the whole microtask queue drains before the timer. await does not wait a full turn (it beat the timer), saveDraft\'s body printed synchronously as 3, and microtasks run first in, first out.'),
      mcq('A once() helper for an async SDK init stores the first returned promise and never clears it. The first init fails because the network was down. What happens on later calls?', [
        ['Every later call gets the same rejected promise; init never reruns', true],
        ['The next call runs init again, because a rejected promise is not cached', false],
        ['Later calls hang, since a rejected promise never settles a second time', false],
        ['The app crashes at once, because the first rejection was unhandled', false],
      ], 'The cached promise stays rejected, so every caller sees the old failure and the SDK is never initialised until restart; the fix is to clear the cache in a catch. A rejected promise is cached like any value, awaiting it again rejects immediately rather than hanging, and a rejection that callers await is handled.'),
      mcq('A class method that uses this.pending is passed to NetInfo.addEventListener and throws "Cannot read properties of undefined (reading \'pending\')". Which fix keeps this pointing at the instance?', [
        ['Pass sync.onNetworkChange.bind(sync), or make the method an arrow class field', true],
        ['Add "use strict" at the top of the file so the method receives the right this', false],
        ['Call addEventListener inside the constructor, so this is the instance there', false],
        ['Rename the method to start with "on", so React Native binds it automatically', false],
      ], 'this depends on the call, and the listener calls a plain function; bind fixes it, and an arrow field captures the instance when it is built. Class bodies are already strict, which is why this is undefined, registering in the constructor still passes an unbound function, and no naming convention binds methods.'),
    ],
    checkpoint: [
      ck('TYPESCRIPT', 'A PaymentState union gains a "refunded" member. The screen\'s switch ends with default: return assertNever(s). What does tsc do?', [
        ['Reports that the refunded member is not assignable to never, at the default', true],
        ['Compiles, and the default throws only when a refunded payment reaches it', false],
        ['Reports an error at the type definition, since unions cannot be extended', false],
        ['Compiles, because the default branch already accepts every possible member', false],
      ], 'In the default, s is narrowed to whatever was not handled; with refunded unhandled it is not never, so the call is a compile error naming the member. That is the point of the pattern: it fails at build time, not at run time; unions can gain members freely; and the default does not accept never-typed leftovers.'),
      ck('TYPESCRIPT', 'addLine({ sku: "ATTA-5KG", qty: 1, coupon: "FIRST50" }) fails to compile, but the same object stored in a const first and then passed compiles. Why?', [
        ['The excess-property check applies only to fresh object literals', true],
        ['The const is widened to any, so it is no longer checked at all', false],
        ['The const version strips the coupon key when it is assigned', false],
        ['TypeScript checks argument types only for inline arguments', false],
      ], 'Types are structural, so a value with extra keys still fits; the excess-property check is an extra rule for literals, where a stray key is likely a typo. The const keeps its precise type rather than any, nothing is stripped at run time, and variables passed as arguments are checked for the required fields.'),
      ck('TYPESCRIPT', 'Why does fetchWithTimeout clear its timer in a finally block?', [
        ['So a fast response or an error leaves no pending abort timer', true],
        ['So the AbortController can be reused for the next request on the screen', false],
        ['Because fetch rejects if a timer is still running when the body arrives', false],
        ['So the timeout restarts from zero when the response body starts arriving', false],
      ], 'finally runs on success and on failure, so the timer is always cleared once the request is settled. A controller is single-use once aborted, fetch does not care about unrelated timers, and clearTimeout cancels the timer rather than restarting it.'),
    ],
  },

  /* ── IV_REACT_NATIVE ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_IV_IV_REACT_NATIVE',
    notes: `The React Native round checks that you have shipped screens, not only read about the framework. The topic sets already
asked how React Native renders (it is not a WebView), the stuttering 2,000-item list with its stale renderItem, Expo
versus the CLI, platform differences, how to structure navigation and deep links. These are the questions after those:
what happens to screens you cannot see, what happens when JavaScript throws in production, races in a search box,
Hermes, and images. The behaviour below was checked with Jest and Testing Library in an Expo SDK 58 project; the
navigation test used React Navigation's native stack.

## Q1. "Our orders screen polls every 5 seconds. Users say the battery drains even when they are on another screen. Why?"

**Testing:** whether you know a stack or tab navigator keeps screens mounted.

**Model answer.** "Pushing a screen on a stack does not unmount the one below it, and tabs keep visited tabs mounted,
so a useEffect with an interval keeps running out of sight. For work that should run only while the screen is
visible I use useFocusEffect, with the callback wrapped in useCallback, and clean up in its return. I tested both
with a 1-second poll: three seconds on Orders, then push Detail for ten seconds, then back for three."

    effect: polls before push 3, during 10 s on Detail 10, Orders still mounted: true
    effect: total after back + 3 s: 16
    focus:  polls before push 3, during 10 s on Detail 0,  Orders still mounted: true
    focus:  total after back + 3 s: 6

"Same mounted screen, but the focus version stopped while hidden and started again on return. I would also pause
when the whole app goes to the background, through AppState or the query library's focus handling."

**Follow-up:** "Why the useCallback?" — "useFocusEffect runs the effect again whenever the callback identity changes.
An inline function is new on every render, so the interval would be torn down and restarted on each render."

**Weak answer:** "Unmounted screens should not run code, so it must be a memory leak in the library."

## Q2. "What happens when JavaScript throws in production?"

**Testing:** error handling beyond try/catch: what crashes, what you can catch, and what the user sees.

**Model answer.** "In a release build an uncaught JavaScript error that reaches the global handler is fatal: the
app closes, which users see as a crash. An unhandled promise rejection is different: LogBox warns about it in
development, and in release the screen just never gets its data. During rendering, an error boundary can catch it and show a fallback instead. Boundaries are still class
components, the one place I write one, or I use the react-error-boundary package. But a boundary only catches errors
thrown while rendering and in lifecycle methods, not in event handlers or async code. I tested both:"

    caught by boundary: Cannot read properties of null (reading 'items')
    press threw: upi intent failed | boundary caught: 0 | Pay still shown: true

"So handlers and async calls need their own try/catch, which updates state to show an error, and a crash reporter
such as Sentry or Crashlytics records the rest with the JS stack trace, symbolicated with the source map of that
exact build."

**Follow-up:** "Where do you put boundaries?" — "One around each screen, with a Retry that remounts it, and one at
the root as the last resort. A broken offers carousel should not take the whole home screen down."

## Q3. "The search box shows results for 'pa' after the user typed 'paneer'. Why?"

**Testing:** async state updates and race conditions, a very common real bug.

**Model answer.** "Each keystroke starts a request, and responses do not come back in order. If 'pa' is the slowest,
it lands last and overwrites the right answer. I reproduced it with fake timers: 'pa' takes 900 ms, 'pan' 300 ms,
'paneer' 100 ms."

    naive -> shown: pa: result
    safe -> shown: paneer: result

"The safe version marks each effect run as current and, in the cleanup, marks it stale, so only the latest query
may set state:"

    useEffect(() => {
      if (!q) return;
      let current = true;
      api(q).then(r => { if (current) setResults(r); });
      return () => { current = false; };
    }, [q]);

"In production I would also debounce by about 300 ms and abort the stale request with an AbortController, to save
the user's data, or let TanStack Query key the request by the search text, which only shows the current key's data."

**Follow-up:** "Debounce alone fixes it, right?" — "No. It reduces requests, but two requests can still overlap if the
user pauses, types and the first is slow. The current-request check is what makes it correct."

## Q4. "What is Hermes, and why does it matter on a budget Android phone?"

**Model answer.** "Hermes is the JavaScript engine React Native uses by default. The difference is when the work
happens: the JavaScript is compiled to Hermes bytecode at build time, so the phone does not parse and compile the
bundle at every launch. That helps startup time and memory, which matter most on low-end phones. It also changes
debugging: you connect React Native DevTools to Hermes, and production stack traces point into the bytecode bundle,
so you upload the source map for each build to your crash reporter to read them."

**Follow-up:** "Does Hermes make my code run faster?" — "Not automatically. It starts faster; a slow render is still
slow. If a list stutters I profile renders before blaming the engine."

## Q5. "Our product grid uses 200 images. On 4G it is slow, and on old phones the app gets killed. What do you do?"

**Model answer.** "First the bytes: ask the image CDN for the size the grid displays, say a 300-pixel thumbnail
instead of a 2,000-pixel original, in WebP. A full-size photo decoded for a small tile wastes memory, and decoded
memory is what gets the app killed. Then a caching image component, such as expo-image, with memory and disk cache
and a placeholder, so scrolling back does not download again. Give the image fixed dimensions so layout does not jump.
And in a recycling list, the docs for expo-image describe a recyclingKey so a reused cell does not flash the
previous product's image. Then measure memory on the real phone."

**Follow-up:** "What would you put in the API contract?" — "Image URLs with a size parameter, or several sizes, so the
app chooses by screen density instead of the backend guessing."

## How you are judged

Strong answers describe what the user sees, the mechanism behind it, and a test or measurement that proves the fix.
Weak answers name libraries without saying what problem each solves.`,
    workedExample: `**Question: "A delivery-tracking screen shows the rider on a map and updates every few seconds. QA reports three things:
the battery drains after the user leaves the screen, the map sometimes shows a previous order's rider, and the app
closes on some phones when the network is poor. Take them one at a time."**

**A weak answer:**

"I would use React.memo and useCallback to optimise the screen, and add try/catch."

What the panel hears: performance words, no cause for any of the three.

**A strong answer:**

"**Battery.** The screen probably polls in a useEffect, and a screen under another in a stack stays mounted, so the
interval keeps running. I would move it to useFocusEffect with a cleanup, and stop when AppState goes to background.
I would prove it with a Jest test that pushes another screen and counts polls on fake timers: it should be zero
while hidden.

**The previous order's rider.** The screen is reused for a new order id, and a location response for the old order
arrives late and overwrites state. Each request should check it still belongs to the current order id, and the
effect for the old id should be cleaned up. Keying the server data by order id, for example with TanStack Query's
['rider', orderId], gives the same protection.

**The app closing.** A crash on poor network suggests an bad response reaching the render: on a 502 the code
stores undefined and the map reads location.lat while rendering. A render error with no boundary is fatal in a
release build. I would check the crash reporter's stack trace for that build, validate the response and keep the
last good location with a 'Location delayed' label, and put a boundary round the screen as the safety net. Then a
test with a fetch that returns a 502 HTML page.

I would fix them in that order of evidence: the crash first, since it loses users, then the stale rider, then battery."

**Why it scores:** three different mechanisms, each with its cause, a fix and a test, and a priority for the fixes.`,
    mcqs: [
      mcq('An Orders screen polls in a useEffect with setInterval. The user pushes an Order Detail screen on top in a native stack. What happens to the polling?', [
        ['It keeps running, because Orders stays mounted under the Detail screen', true],
        ['It stops, because the stack unmounts Orders when another screen is pushed', false],
        ['It pauses automatically, because React Navigation suspends hidden screens', false],
        ['It runs twice as often, because the screen is mounted again for the stack', false],
      ], 'A stack keeps the screens below the top one mounted, so their effects and timers continue; in the test, 10 polls ran in 10 seconds on the Detail screen. Nothing is unmounted or suspended by default, which is why useFocusEffect exists, and nothing doubles the interval.'),
      mcq('A Pay button\'s onPress throws, and the screen is wrapped in an error boundary. What does the boundary do?', [
        ['Nothing: boundaries catch render errors, not event-handler errors', true],
        ['It shows its fallback, because the error came from a child component', false],
        ['It catches the error and retries the onPress handler a second time', false],
        ['It converts the error into a warning, so the release app keeps going', false],
      ], 'Error boundaries catch errors during rendering and lifecycle methods; an event handler runs outside rendering, so in the test the boundary caught nothing and the button stayed on screen. Handlers need their own try/catch, boundaries never retry handlers, and an uncaught error in release is fatal rather than a warning.'),
      mcq('Search results for "pa" appear after the user typed "paneer". Which change makes the screen correct, not just less likely to be wrong?', [
        ['Ignore any response whose request is no longer the current one, in the effect cleanup', true],
        ['Debounce the input by 300 ms so that fewer requests are sent while the user is typing', false],
        ['Wrap the results list in React.memo so it does not re-render on every keystroke typed', false],
        ['Add a loading spinner so the user waits for the final response before reading results', false],
      ], 'Out-of-order responses are the cause, so only a current-request check (or aborting old requests) guarantees the latest query wins. Debouncing reduces overlaps but cannot prevent them, memo affects rendering, not which data is stored, and a spinner does not stop a late response overwriting the right one.'),
    ],
    checkpoint: [
      ck('REACT_NATIVE', 'Why does useFocusEffect\'s callback need to be wrapped in useCallback?', [
        ['A new function on each render would make the effect clean up and run again every render', true],
        ['useFocusEffect only accepts memoised callbacks and throws an error when given any other', false],
        ['Without it the effect would run on blur instead of focus, which reverses its behaviour', false],
        ['useCallback makes the effect run on the native UI thread instead of the JS thread', false],
      ], 'useFocusEffect re-runs when the callback identity changes, so an inline function restarts the effect on every render. It does not throw for an inline function, focus and blur are not swapped, and useCallback only keeps a function reference stable; it moves nothing to another thread.'),
      ck('REACT_NATIVE', 'A data-loading function in a release build rejects inside a promise that nobody catches, and the screen sits inside an error boundary. What does the user most likely see?', [
        ['No fallback and no crash: the screen just never gets its data', true],
        ['The boundary fallback, because the error came from the screen', false],
        ['A red error screen with the stack trace and a Reload button', false],
        ['The same request repeated by React Native until it succeeds', false],
      ], 'A promise rejection never passes through rendering, so the boundary cannot see it, and unhandled rejections are only warned about in development; the screen is left waiting. The fix is a catch that sets an error state. The red screen is a development feature, and React Native never retries a failed promise.'),
      ck('REACT_NATIVE', 'A grid shows 2,000-pixel product photos in 150-point tiles and the app is killed on low-memory phones. What is the first fix?', [
        ['Request images near the displayed size, so less memory is decoded', true],
        ['Increase the FlatList windowSize so that more rows stay rendered', false],
        ['Store every downloaded photo in AsyncStorage as a base64 string', false],
        ['Set the image resizeMode to cover so the photos are drawn smaller', false],
      ], 'Memory goes on decoded pixels, so a 2,000-pixel image costs far more than a thumbnail even when drawn small; asking the CDN for the right size fixes the cause. A larger window keeps more images in memory, base64 in AsyncStorage is slow and huge, and resizeMode changes how the image is drawn, not how much was decoded.'),
    ],
  },

  /* ── IV_STATE_ARCH ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_IV_IV_STATE_ARCH',
    notes: `State and architecture questions are where a panel decides whether you can work on a codebase with ten other people. The
topic sets already asked how you manage state, the trouble with Context, optimistic updates, forms, choosing storage,
where the JWT goes, offline orders, sync conflicts and token refresh. These questions sit one level up: defending a
library, designing cache keys, logging out safely, and where the logic lives. The Redux Toolkit and TanStack Query
behaviour below ran under Jest in the Expo project, and the output is quoted as printed.

## Q1. "Redux Toolkit or Zustand? Defend your choice for our app."

**Testing:** judgement, and whether you know what each costs. There is no single right library.

**Model answer.** "First I would take server data out of the question: orders, menus and profiles belong in TanStack
Query, which handles caching and refetching. What is left is client state: the cart, filters, the onboarding step.
For a small team and that much state, Zustand: a hook, selectors, almost no ceremony. I would choose Redux Toolkit when
there is a lot of client state that many features change, when the team wants one enforced pattern, or when the
Redux DevTools' action history matters for debugging. Both are fine; mixing three state libraries is the real
mistake."

**Follow-up:** "What is normalised state? Show me." — "Store each entity once, by id, and refer to it by id
elsewhere, so an order that appears in 'active' and in 'history' cannot disagree with itself. Redux Toolkit's
createEntityAdapter gives the shape and the reducers. Changing order 42's status:"

    {"ids":[41,42],"entities":{"41":{...,"status":"DELIVERED"},"42":{...,"status":"PREPARING"}}}
    41 same object: true | 42 same object: false | ids same array: true
    selectById(42): PREPARING | total: 2

"Only order 42 got a new object; order 41 and the ids array kept their references. So a memoised row for order 41
does not re-render, and a list selector that depends on ids does not recompute."

**Weak answer:** "Redux is old, Zustand is new" or "Context is enough for everything".

## Q2. "Two screens show the same order and one of them is out of date. How do your query keys prevent that?"

**Testing:** cache design. Most candidates have used useQuery; few have designed keys.

**Model answer.** "Keys are a hierarchy from general to specific, kept in one factory file so nobody types them by
hand: ['orders', 'list', { status }], ['orders', 'detail', id]. After a mutation that changes an order I invalidate
the prefix ['orders'], which marks every orders query stale, and the ones on screen refetch. Restaurants are left
alone. I checked the matching:"

    invalid after ["orders"]: ["orders","list",{"status":"ACTIVE"}]=true  ["orders","detail",42]=true
                              ["restaurants","list"]=false
    invalid after exact ["orders"]: 0

"Prefix matching is the default; with exact: true nothing matched, because no query's key is exactly ['orders']."

**Follow-up:** "Invalidate, or write the new data into the cache with setQueryData?" — "If the mutation's response
contains the updated order, setQueryData for the detail saves a request, and I still invalidate the lists, because
the order may now belong in a different filter. When in doubt, invalidate: a refetch is slower, but it cannot be
wrong."

## Q3. "User A logs out and user B logs in on the same phone. What can leak, and how do you stop it?"

**Testing:** whether you see state as something that outlives a session. Shared family phones are common in India,
so this happens.

**Model answer.** "Everything that is not the token: the query cache, persisted stores such as a cart in MMKV, a
drafts table in SQLite, the push token registered against user A, and requests still in flight. Logout should cancel
requests, unregister the push token on the server, clear the query cache, reset every store to its initial state,
delete user data from storage, delete the secure-store tokens, and reset navigation to the login stack, so the old
screens unmount. The order matters. I tested clearing the cache while the profile screen was still mounted:"

    after clear, screen shows: profile of asha | fetch calls: asha | cache size: 0
    after a re-render, screen shows: profile of ravi | fetch calls: asha,ravi

"queryClient.clear() emptied the cache, but the mounted screen kept showing Asha's profile until it re-rendered, and
then it fetched again. So I reset navigation first, which unmounts the signed-in screens, and clear after; and the
fetch for the new user must use the new user's token."

**Follow-up:** "How would you test logout?" — "One integration test: sign in as A, load data, log out, sign in as B
with a mocked API, and assert none of A's names, orders or cart lines appear anywhere, and that storage holds no A
keys."

## Q4. "Where does business logic live in your app?"

**Testing:** architecture as a habit: what is testable and what is not.

**Model answer.** "Not in screens. A screen renders and wires events. Rules such as the delivery fee, coupon
validity or the order-status timeline are plain TypeScript functions in the feature folder, with unit tests and no
React. Data access sits in an api module per feature, called by query hooks, so a screen calls useActiveOrders() and
does not know the URL. Stores hold client state and call the pure functions. The test of the design: can I test the
coupon rule without rendering anything, and could I swap the HTTP client in one file?"

**Follow-up:** "How do you stop features importing each other's internals?" — "Each feature exports a small public
surface from its index file, and a lint rule forbids deep imports into another feature. Shared code moves to a
shared folder only when a second feature needs it."

## Q5. "Should the cart total be in the store?"

**Model answer.** "No. The total is derived from the lines, the coupon and the fee. If I store it, every action
that changes a line must remember to update it, and one day one will not. I store the inputs and compute the total
in a selector, or with useMemo when it is expensive. The same goes for 'item count' and 'is the cart empty'. The
server recalculates the total at checkout anyway; the app's number is for display."

**Follow-up:** "The server's total differs from the app's." — "The server wins, and I show its number on the payment
screen, with a message if a price changed. Then I find out why: a stale price in the cache, or a rule implemented
differently in two places, which argues for the server returning the breakdown."

## How you are judged

Strong answers separate server state from client state, explain a choice by its cost, and talk about what happens
at the edges: logout, a second device, a stale cache. Weak answers name a library and stop.`,
    workedExample: `**Question: "Design the state for a quick-commerce app: catalogue, cart, checkout and live order tracking. Where does
each piece live, and why?"**

**A weak answer:**

"I would put everything in Redux so all screens can access it."

What the panel hears: one bucket, no idea of caching, staleness or persistence.

**A strong answer:**

"I sort the data by who owns it and how long it lives.

- **Catalogue, prices, stock:** server state, in TanStack Query, keyed ['catalogue', storeId, category]. A short
  staleTime, a minute or so, because stock changes; prices are re-checked by the server at checkout anyway.
- **Cart:** client state the user creates, in a small Zustand store, persisted to MMKV so it survives the app being
  killed. It stores product ids and quantities, not prices, so a price change cannot leave a stale total; the total is
  a selector over the lines and the catalogue cache.
- **Checkout:** a mutation with an idempotency key generated once per attempt, so a retry on bad 4G cannot create two
  orders. Its state is a discriminated union: idle, paying, confirmed, failed.
- **Live tracking:** server state again, ['orders', 'detail', id], refetched on an interval only while the screen is
  focused and the app is in the foreground, or replaced by push updates.
- **Form drafts and UI state** (the address being typed, which sheet is open) stay in the component.

On logout: reset navigation, clear the query cache, reset the cart store and its storage, unregister the push token.

To test it: unit tests for the cart reducer and total, a query-key factory test, and an integration test for logout."

**Why it scores:** every piece has an owner and a lifetime, the derived total is not stored, retries and logout are
designed in, and there is a test plan.`,
    mcqs: [
      mcq('An entity adapter holds orders 41 and 42. updateOne changes order 42\'s status. What happens to the references in the new state?', [
        ['Order 42 gets a new object; order 41 and the ids array keep theirs', true],
        ['Every entity and the ids array are copied, because the state is immutable', false],
        ['Nothing is copied: order 42 is mutated in place inside the previous state', false],
        ['The ids array is rebuilt, because a change to any entity re-sorts the list', false],
      ], 'Immer copies only the path that changed, so order 41 and ids keep their references, which is what lets memoised rows and selectors skip work; the test printed exactly that. Immutability does not mean copying everything, the previous state is not mutated, and ids only change when an entity is added, removed or re-sorted.'),
      mcq('Queries exist for ["orders","list",{status:"ACTIVE"}], ["orders","detail",42] and ["restaurants","list"]. What does invalidateQueries({ queryKey: ["orders"] }) mark stale?', [
        ['Both orders queries, because the key matches by prefix by default', true],
        ['No query, because none of them has the key ["orders"] exactly', false],
        ['All three queries, because invalidation applies to the whole cache', false],
        ['Only the orders list, because detail keys must be invalidated by id', false],
      ], 'Query filters match by prefix unless exact: true is set, so both orders queries are invalidated and the restaurants query is left alone, as the test showed. The "exact" behaviour is the opt-in that matched nothing, invalidation is not global, and the detail query matches the prefix like the list.'),
      mcq('On logout an app calls queryClient.clear() while the profile screen is still mounted. What did the test show?', [
        ['The screen kept showing the old profile until it re-rendered and fetched again', true],
        ['The screen went blank at once, because its data was removed from the cache', false],
        ['The screen crashed, because the query it was observing no longer existed', false],
        ['Nothing changed, and the old profile stayed on screen even after re-renders', false],
      ], 'clear() emptied the cache, but the mounted observer kept its last result until the next render, which then fetched for the new user. That is why logout resets navigation first, unmounting signed-in screens. It neither blanked nor crashed the screen, and a re-render did trigger a fresh fetch.'),
    ],
    checkpoint: [
      ck('STATE_MANAGEMENT', 'A cart store keeps lines, a coupon and a total field that every action updates. What is the design problem?', [
        ['The total is derived, so a stored copy can drift from lines', true],
        ['The total should be a string, so it can be formatted in rupees', false],
        ['The coupon belongs in the query cache, next to the server data', false],
        ['The lines should be stored in Context rather than in the store', false],
      ], 'Anything computable from other state should be computed in a selector; a stored total is one forgotten update away from being wrong. Formatting is a display concern, a coupon the user typed is client state, and moving lines to Context changes nothing about the duplication.'),
      ck('STATE_MANAGEMENT', 'An order\'s status changes after a mutation, and the response includes the updated order. What should the app do with the cache?', [
        ['setQueryData for the detail, and invalidate the order lists too', true],
        ['Invalidate only the detail query, since the lists did not change', false],
        ['Call queryClient.clear() so that every screen loads data again', false],
        ['Nothing, since the next app launch will fetch the new status', false],
      ], 'Writing the response into the detail saves a request, and the lists must refetch because the order may now belong in a different filter. Lists did change if they are filtered by status, clearing the whole cache throws away good data, and waiting for a relaunch shows stale data.'),
      ck('STATE_MANAGEMENT', 'Two family members share one phone. After the first logs out and the second logs in, the second sees the first\'s cart. What was missed?', [
        ['Resetting the persisted cart store and its storage on logout', true],
        ['Deleting the access token from SecureStore on every logout', false],
        ['Invalidating the catalogue queries before the second log-in', false],
        ['Asking for the notification permission again for the new user', false],
      ], 'A persisted cart survives restarts by design, so logout must reset the store and delete its storage key. Removing the token alone leaves local data behind, the catalogue is not user-specific, and the notification permission is per device and unrelated to the leak.'),
    ],
  },

  /* ── IV_ANDROID ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_IV_IV_ANDROID',
    notes: `Even for a React Native role, many Indian panels give ten minutes to Android itself: product companies whose apps are
mostly used on Android, GCCs with native teams next door, and service companies who staff both. The native Android
topic's interview set already asked when to write a native module, recomposition, the release-only crash and editing
android/ in an Expo project; the device topic asked about a denied permission, push, location and background sync.
These are the platform questions after those. They are written from developer.android.com and kotlinlang.org; no
Kotlin was compiled for this unit, so treat the snippets as the documented API, and check the current pages for
anything version-specific.

## Q1. "Walk me through the activity lifecycle. What happens on rotation, and when the system kills your app?"

**Testing:** whether you know the difference between an activity being recreated and the process dying.

**Model answer.** "onCreate, onStart, onResume as it becomes visible and interactive; onPause, onStop as it leaves;
onDestroy at the end. A configuration change such as rotation destroys and recreates the activity by default.
A ViewModel survives that, so data loaded once is not reloaded. But when the app is in the background and Android
needs memory, it can kill the whole process. When the user returns, Android recreates the activity with the saved
instance state Bundle, and the ViewModel is gone. So small UI state that must survive, such as the selected tab or a
half-typed search, goes into SavedStateHandle or rememberSaveable; data comes back from the repository."

**Follow-up:** "How does React Native handle rotation, and what about process death?" — "React Native's MainActivity
declares configChanges in the manifest, so rotation does not recreate it and React just re-lays out. Process death is
the real risk: the JS runtime starts from scratch, so navigation and in-memory state are gone. Anything the user
would hate to lose, a draft order or the current step of a KYC form, I persist. To test it, put the app in the
background and run adb shell am kill with the package name, then open it from recents."

**Weak answer:** "onDestroy is always called, so I save data there." It is not guaranteed when the process is killed;
save as the user goes, or at least by onStop.

## Q2. "Kotlin null safety: what do ?., ?: and !! do, and when is !! acceptable?"

**Testing:** whether you can read Kotlin, and whether you understand what the type system promises.

**Model answer.** "String cannot hold null; String? can, and the compiler makes me handle it before use. ?. calls
only if the value is not null, otherwise the expression is null. ?: gives a fallback, and it can return or throw:"

    val pincode: String? = address?.pincode
    val label = pincode ?: "Add a pincode"
    val user = repository.currentUser() ?: return

"!! says 'I promise it is not null' and throws NullPointerException if I am wrong, which brings back exactly the crash
Kotlin removed. I avoid it; if a value can only be null through a bug, I would rather fail with a clear message using
requireNotNull(value) { "order id missing" }."

**Follow-up:** "And lateinit?" — "For a non-null var that is set after construction, such as in a test set-up
method. Reading it before it is set throws UninitializedPropertyAccessException, so it trades a compile-time check
for a run-time one. It works only on var and only for non-primitive types."

**Second follow-up:** "What does a data class give you?" — "equals, hashCode, toString, copy and componentN functions
from the primary constructor's properties. copy is how you change one field of immutable UI state:
state.copy(isLoading = false)."

## Q3. "What is a coroutine, and why not GlobalScope?"

**Testing:** structured concurrency, which every Android codebase now uses.

**Model answer.** "A coroutine is a suspendable computation: a suspend function can pause at a call such as a
network request without blocking the thread, and resume later. I choose where work runs with dispatchers: Main for
UI, IO for disk and network, Default for CPU work, switching with withContext. Every coroutine belongs to a scope.
viewModelScope is cancelled when the ViewModel is cleared, lifecycleScope with the lifecycle, so leaving the screen
cancels its work. GlobalScope belongs to nothing: work outlives the screen, nobody cancels it, and a failure is not
reported to a parent."

    viewModelScope.launch {
        _state.value = OrdersState.Loading
        val orders = withContext(Dispatchers.IO) { api.activeOrders() }
        _state.value = OrdersState.Loaded(orders)
    }

**Follow-up:** "launch or async?" — "launch when I do not need a result back; async when I need one, and I await it.
Two independent calls are two asyncs awaited together, the Kotlin version of Promise.all. If one child fails in a
normal scope, its siblings are cancelled."

**Weak answer:** "Coroutines are lightweight threads, so I can run everything on Main."

## Q4. "Explicit and implicit intents. What does android:exported mean, and why did Android 12 make you declare it?"

**Testing:** the manifest as a security boundary.

**Model answer.** "An explicit intent names the component to start, such as my own OrderDetailActivity. An implicit
intent describes an action, like ACTION_VIEW with a URL, and the system finds apps whose intent filters match; that
is how a UPI payment intent opens the user's choice of UPI app. android:exported says whether components of other
apps may start this component. Since Android 12, a component with an intent filter must declare it explicitly,
because the old default exported anything with a filter, often by accident. I set false on everything that does not
need to be reachable from outside, and treat every extra in an exported component's intent as untrusted input."

**Follow-up:** "And PendingIntent?" — "A PendingIntent lets another app, such as the notification system, run an intent
with my app's identity later. From Android 12 I must choose FLAG_IMMUTABLE or FLAG_MUTABLE; immutable unless the
receiver really must fill something in, because a mutable one can be altered by whoever holds it."

## Q5. "What is an ANR, and how would you find the cause of one?"

**Testing:** main-thread discipline, and reading production signals.

**Model answer.** "Application Not Responding: the main thread was blocked too long, for example an input event not
handled within about five seconds, or a broadcast receiver that did not finish in time. The system shows the user a
dialog to wait or close. Google Play's Android vitals report the ANR rate, and a high rate hurts the app's
visibility in the store. Causes: disk or network on the main thread, a lock held by a background thread, a huge
layout, or heavy work in a native module running on the UI thread. To find it, I read the ANR's main-thread stack in
Play Console or the crash tool, and in debug builds turn on StrictMode, which flags disk and network access on the
main thread. In React Native, a native module that does slow work synchronously can block the UI thread; slow work
belongs in an async function on a background thread."

**Follow-up:** "Is an ANR a crash?" — "It is counted separately, but users experience it as worse: a frozen app and a
dialog asking them to kill it."

## How you are judged

Strong answers connect the platform rule to a user-visible effect (a lost KYC form, a frozen screen, an exported
activity anyone can open). For a React Native role, saying "I have read this; I have not shipped a native screen"
is fine, as long as what you say is accurate.`,
    workedExample: `**Question: "A user fills a six-step loan application, switches to the SMS app to read an OTP, and comes back to step one.
It happens mostly on cheap phones. What is going on, and how do you fix it in our React Native app?"**

**A weak answer:**

"There is a bug in the navigation library. I would upgrade it."

What the panel hears: no idea that the platform killed the app.

**A strong answer:**

"It points to process death. While the user was in the SMS app, ours was in the background, and on a phone with
little RAM Android killed the process to free memory. Coming back, Android started the activity again, and React
Native started a fresh JavaScript runtime, so navigation and form state began from zero. Cheap phones get it more
because they have less memory.

**Prove it:** reproduce with the app in the background and adb shell am kill on the package, then reopen from
recents. If step one appears, that is the cause.

**Fix it:**

- Persist the application draft as the user goes, step by step, to MMKV or SQLite, encrypted if it holds PAN or
  bank details; on start, if a draft exists, offer 'Continue your application'.
- Persist the current step, or the navigation state, so we can return the user to step four, not just restore data.
- Read the OTP without leaving the app where possible, with Android's SMS Retriever or User Consent API through a
  native module, so there is no app switch at all.
- Clear the draft on submission and on logout.

**Test it:** a Jest test that the draft is saved on each step and restored on mount, plus a manual process-death check
on a low-RAM phone in the release checklist."

**Why it scores:** it names the mechanism (process death, not a bug), proves it with a reproducible command, fixes
the data and the position, and removes the cause of the app switch.`,
    mcqs: [
      mcq('A ViewModel holds a loaded order list. Which event loses it, so the screen must load from the repository again?', [
        ['The process is killed in the background, then the user returns', true],
        ['The phone is rotated and the activity is destroyed and recreated', false],
        ['The user opens the notification shade and then closes it again', false],
        ['The activity is paused while a system permission dialog is shown', false],
      ], 'A ViewModel survives configuration changes such as rotation, but not process death, after which only the saved instance state and persisted data remain. The notification shade and a permission dialog at most pause the activity, which does not destroy anything.'),
      mcq('A teammate writes val user = repo.currentUser()!! in Kotlin. What is the risk?', [
        ['If currentUser() returns null, it throws NullPointerException at run time', true],
        ['It will not compile, because !! cannot be applied to a function call result', false],
        ['It returns an empty User object when the repository has no user to give', false],
        ['It makes the variable mutable, so other code can set it to null later on', false],
      ], '!! asserts non-null and throws NullPointerException if the value is null, bringing back the crash null safety prevents. It compiles fine, Kotlin never invents an empty object, and val stays read-only; the safer forms are ?: with a fallback or requireNotNull with a message.'),
      mcq('An app launches a coroutine in GlobalScope from a screen to load offers. What goes wrong when the user leaves the screen?', [
        ['The work keeps running with no owner to cancel it or receive its failure', true],
        ['The coroutine is cancelled at once, so the offers are never loaded at all', false],
        ['The app crashes, because GlobalScope cannot be used from inside an activity', false],
        ['It switches to the main thread and blocks the UI until the offers arrive', false],
      ], 'GlobalScope is not tied to any lifecycle, so its work outlives the screen and nothing cancels it; viewModelScope or lifecycleScope would. It is not cancelled on leaving, using it does not crash, and it does not choose the main dispatcher or block anything by itself.'),
    ],
    checkpoint: [
      ck('ANDROID_DEVELOPMENT', 'Why does rotating the phone not recreate a React Native app\'s MainActivity, when it recreates a plain Android activity?', [
        ['MainActivity declares configChanges in the manifest, so it handles rotation itself', true],
        ['React Native locks every app to portrait, so a rotation never reaches the activity', false],
        ['Hermes keeps the activity alive in memory, so Android cannot destroy it on rotation', false],
        ['Rotation recreates only activities that use Compose, and React Native does not', false],
      ], 'With configChanges declared, Android delivers the change to the running activity instead of recreating it, and React re-lays out. React Native apps can rotate, the JS engine has no say over the activity lifecycle, and recreation on configuration change is the default for any activity, Compose or not.'),
      ck('ANDROID_DEVELOPMENT', 'An app targets Android 12 and has an activity with an intent filter for its order links. What must the manifest say?', [
        ['An explicit android:exported value on that activity', true],
        ['A FLAG_IMMUTABLE attribute on the intent filter itself', false],
        ['A permission request for every link the filter matches', false],
        ['Nothing, because filters are private to the app by default', false],
      ], 'From Android 12, a component with an intent filter must declare exported explicitly, choosing whether other apps may start it. FLAG_IMMUTABLE belongs to PendingIntent, links need no runtime permission, and the old implicit default exported filtered components, which is why the rule was added.'),
      ck('ANDROID_DEVELOPMENT', 'Play Console shows ANRs with a main-thread stack inside a native module that reads a large file. What is the fix?', [
        ['Move the file read off the main thread, for example into an async call', true],
        ['Wrap the read in a try/catch, so the ANR is caught as an exception', false],
        ['Raise the ANR timeout in the manifest to give the read more time', false],
        ['Run the read twice and cache the second result for the next launch', false],
      ], 'An ANR means the main thread was blocked, so the slow I/O must run on a background thread. An ANR is not an exception that try/catch can catch, apps cannot raise the system\'s timeout, and repeating the read makes the block worse.'),
    ],
  },

  /* ── IV_PERF_RELEASE ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_IV_IV_PERF_RELEASE',
    notes: `The last technical slot asks whether you can ship and keep an app healthy after day one. The release topic's interview
set already asked how a merged pull request reaches users, what an over-the-air update can change and how to undo
one, Play App Signing and a lost keystore, and how you monitor production; the testing and performance topic drilled
test levels, lists and re-renders. These questions are about what happens between versions: upgrades, old binaries in
users' hands, the release candidate, size and configuration. The persisted-store behaviour was run under Jest; the
Play, EAS and adb details are from the official documentation and were not run here.

## Q1. "Fresh installs work. Users who upgrade from the last version lose their cart, or crash on launch. Why?"

**Testing:** whether you think of data already on the phone as part of the release.

**Model answer.** "A fresh install starts with empty storage; an upgrade starts with whatever the old version
saved. If we changed the shape of persisted data, the new code reads the old shape. I reproduced it with a Zustand
persisted cart whose old version stored items with id and count, and the new code expects lines with productId and
qty:"

    version bumped, no migrate:   State loaded from storage couldn't be migrated since no migrate function was provided
                                  -> lines: []
    version not bumped:           keys: lines,items | lines: []
    with migrate:                 lines: [{"productId":"ATTA-5KG","qty":2}] | stored version now: 2

"The library did not crash; it silently threw the cart away, which users see as 'my cart vanished'. Hand-written code
that did JSON.parse and then read lines.reduce would have crashed on launch instead. The fix is a version number on
everything persisted and a migrate function for each step, the same idea as SQLite schema migrations, and tests that
start from a saved old-version blob."

**Follow-up:** "How would you catch it before release?" — "An upgrade test in the release checklist: install the
current store build, use it, then install the candidate over it and check the cart, login and drafts survive. Plus
the unit test above for every persisted shape."

## Q2. "What do you check on a release candidate that you never see in development?"

**Testing:** knowing that a release build is a different program from the one you develop with.

**Model answer.** "A release build has no Metro, no dev menu, __DEV__ is false, the JavaScript is minified Hermes
bytecode, R8 may shrink the native code, and it runs much faster than a debug build, so timings from debug mean
nothing. I install the exact store build on a budget Android phone and run: cold start, sign-in, the main journey to
payment, airplane mode mid-journey, process death during a form, a push notification on a locked phone, a deep link
from WhatsApp, an upgrade from the current store version, and a fresh install. Automated Maestro flows cover the
repeatable parts; the rest is a 20-minute checklist."

**Follow-up:** "How do you measure cold start?" — "On the device, adb shell am start -W with the app's activity
reports the launch time, which I record for each release on the same phone; in production, Android vitals reports
slow starts. I compare with the last release, not an ideal number."

## Q3. "We want to remove an old API endpoint. Some users never update the app. What do you do?"

**Testing:** that store releases are not deployments: old binaries live for months.

**Model answer.** "Unlike a website, I cannot replace the app on every phone. So, first, the API stays backward
compatible: add fields, never rename or remove them in place, and version the endpoint when the contract must change.
Second, the app asks a config endpoint at start-up for a minimum supported version and a recommended version. Below
the minimum, it shows a blocking 'Please update' screen that opens the store; below the recommended, a dismissible
banner. On Android, Play's in-app updates API can run the update inside the app. Third, analytics by app version
tells me when the old version's share is small enough to switch the endpoint off."

**Follow-up:** "Could an OTA update solve it?" — "Only for users whose binary matches that runtime version, and only
for JavaScript. A user on a two-year-old binary gets nothing, which is why the minimum-version check must be in the
binary from the very first release."

## Q4. "Our APK is 80 MB and installs from smaller towns are low. How do you shrink it?"

**Model answer.** "Measure first: Play Console shows the download size per device, which is what users actually wait
for, and it is smaller than a universal APK because Play builds per-device APKs from the app bundle, with only that
phone's CPU architecture, screen density and languages. Then cut what is ours: unused libraries (each native library
adds code for every architecture), large images converted to WebP and sized for the screen, fonts we do not use,
bundled videos or animations that can be downloaded when needed, and code shrinking for the native side. And check
the JavaScript bundle for heavy dependencies imported for one function. I would set a size budget in CI so it does
not grow back."

**Follow-up:** "Download size or install size: which matters?" — "Both. Download size decides whether someone on a
limited data pack starts the install; install size decides whether a 32 GB phone full of photos has room for it."

## Q5. "How do you keep staging and production apart, and where do the API keys go?"

**Model answer.** "One codebase, several variants. app.config.ts reads a variant from the EAS build profile and sets
the app name, the application ID, say in.dabbadash.app.preview for preview, the icon and the API base URL, so the
preview build installs beside the production app and QA cannot confuse them. Values the app needs at run time come
from environment variables at build time; in Expo, EXPO_PUBLIC_ variables are inlined into the JavaScript bundle. So
anything in the bundle is public: anyone can unpack an APK and read it. A payment secret or a server API key never
goes into the app; the app calls our backend, which holds the secret. Publishable keys, such as a maps key restricted
to our package name and signing certificate, are fine."

**Follow-up:** "A teammate committed .env with a staging key." — "Rotate the key, because the git history has it now;
removing the file is not enough. Then add .env to .gitignore and keep values in EAS environment variables."

## How you are judged

Strong answers think about the phone that already has your previous version, the user on a slow network, and the
release build rather than the debug one. Weak answers stop at "it works on my phone".`,
    workedExample: `**Question: "Version 3.0 of our grocery app moves the cart from a key-value store to SQLite and changes the login API.
Plan the release so that nobody loses a cart and nobody is locked out."**

**A weak answer:**

"We will test it well and release it to everyone on Monday."

What the panel hears: no thought for users on 2.x or for the order of changes.

**A strong answer:**

"Three risks: data on the phone, old apps calling the API, and a bad build reaching everyone.

**Data on the phone.** 3.0 runs a one-time migration at start-up: read the 2.x cart from the key-value store, write it
into SQLite inside a transaction, mark the migration done, and only then delete the old key. If it fails half-way, the
old data is still there and it retries next launch. Unit tests start from saved 2.x blobs, including an empty cart and
a corrupted one.

**The API.** The backend serves the old and new login side by side; 2.x keeps working. 3.0 uses the new one. Once
analytics show 2.x below an agreed share, the config endpoint raises the minimum version and 2.x users see the update
screen. Only then is the old login removed.

**The rollout.** Internal track first, with an upgrade test from the current store build on a budget phone. Then a
staged rollout from a small percentage, watching crash-free users and a custom 'cart migration failed' event; halt
the rollout if either moves.

**Undo.** Play cannot downgrade users, so the migration must be safe to run twice and the 3.0.1 fix ready to ship with
a higher version code."

**Why it scores:** it treats existing data and old binaries as part of the release, makes the migration safe to
retry, separates the API change from the app change, and has a halt rule.`,
    mcqs: [
      mcq('A persisted Zustand cart changes shape in the new version, and the version is bumped without a migrate function. What did the test show on upgrade?', [
        ['A logged error and an empty cart: the old saved state was discarded', true],
        ['A crash on launch, because the store read the old shape of the data', false],
        ['The old cart kept as it was, since persist merges any saved fields', false],
        ['A prompt asking the user whether to keep or clear their saved cart', false],
      ], 'Without a migrate function persist refuses the old version, logs that it could not migrate, and keeps the initial state, so the cart silently empties. The library did not crash (hand-written parsing might), the old fields were not usable as lines, and no library prompts the user.'),
      mcq('Why can an OTA update not fix a problem for every user still running an old version of the app?', [
        ['Updates reach only binaries with the matching runtime version', true],
        ['Updates are delivered only to users who opt in to beta testing', false],
        ['Updates can change images and text, but never JavaScript code', false],
        ['Updates are blocked on Android phones older than three years', false],
      ], 'An update is served to builds whose runtime version matches, so a binary from before a native change gets nothing; that is why a minimum-version check must live in the binary. Updates go to any matching build, they can change JavaScript, and there is no age block on phones.'),
      mcq('An Expo app reads EXPO_PUBLIC_PAYMENT_SECRET to sign requests to the payment provider. What is the problem?', [
        ['EXPO_PUBLIC_ values are inlined into the bundle, so anyone can read it', true],
        ['EXPO_PUBLIC_ values are not available in release builds at run time', false],
        ['The variable must be renamed without the prefix to be read by the app', false],
        ['Secrets in the bundle work, but they must be base64 encoded to be safe', false],
      ], 'Public variables are written into the JavaScript bundle at build time, and an APK can be unpacked, so a secret there is a published secret; signing belongs on the backend. They are available in release builds, dropping the prefix just hides it from the app, and base64 is an encoding, not protection.'),
    ],
    checkpoint: [
      ck('MOBILE_RELEASE', 'Fresh installs of a new version are fine, but upgraded users report an empty cart. What should the release checklist have included?', [
        ['Installing the candidate over the current store version with saved data', true],
        ['Running the Jest suite a second time on the release branch build machine', false],
        ['Testing the candidate on the newest flagship phone in the team first', false],
        ['Clearing app data before each test, so every run starts from scratch', false],
      ], 'Only an upgrade over a real previous version exercises the data already on the phone. Re-running Jest tests nothing new, a flagship phone does not change the data path, and clearing data turns every test into a fresh install, which is exactly the case that already passed.'),
      ck('MOBILE_RELEASE', 'A team must retire an old login endpoint that version 2.x of the app still calls. What makes that safe?', [
        ['A minimum-version check in the app, then removal once usage is low', true],
        ['An OTA update that points every installed version at the new login', false],
        ['Removing it on release day, as Play updates all users within a day', false],
        ['Renaming the endpoint, so old versions get a clear 404 error message', false],
      ], 'Old binaries stay installed for months, so the app must be able to tell users to update, and analytics show when the old version is rare. OTA reaches only matching runtime versions, Play does not force updates on everyone within a day, and a 404 locks old users out with no message.'),
      ck('MOBILE_RELEASE', 'Why is the download size shown in Play Console usually smaller than the universal APK the team builds?', [
        ['Play builds per-device APKs from the bundle, with one architecture and density', true],
        ['Play compresses JavaScript bundles again with a stronger algorithm on upload', false],
        ['Play removes unused screens it detects in the app during the review process', false],
        ['Play downloads the native libraries later, after the app is opened the first time', false],
      ], 'From an app bundle Play generates APKs that contain only what one device needs, so a phone does not download every CPU architecture and screen density. Play does not recompress the JS bundle, remove screens or defer native libraries on its own.'),
    ],
  },

  /* ── RAPID_FIRE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_IV_RAPID_FIRE',
    notes: `A screening call for a React Native or mobile developer role: a recruiter reading from a list, or an engineer giving
you fifteen minutes before deciding on a full round. Thirty questions, one correct line each, at speaking pace. Cover
the answer, say yours aloud, then check. If you need more than ten seconds, go back to that question set. The
JavaScript lines were checked in Node.

## JavaScript and TypeScript

1. **for (var i = 0; i < 3; i++) setTimeout(() => log(i)): output?** — 3, 3, 3. With let: 0, 1, 2, because let makes
   a new binding per iteration.
2. **typeof null?** — "object", a historical quirk; check for null with === null.
3. **0 || 5 versus 0 ?? 5?** — 5 versus 0: ?? falls back only on null or undefined, so it keeps a real 0 quantity.
4. **x == null is true for?** — null and undefined, nothing else.
5. **Promise.all versus Promise.allSettled?** — all rejects on the first failure; allSettled waits for every result.
6. **Omit<User, 'password'>?** — User's type without the password property.
7. **as const?** — Makes a literal deeply readonly with literal types, so ['PLACED', 'PACKED'] stays those two strings.
8. **unknown versus never?** — unknown is any value you must check before use; never is a value that cannot exist.
9. **keyof typeof prices?** — The union of the object's keys as a type, such as 'tea' | 'sugar'.

## React Native

10. **Default flexDirection in React Native?** — column, unlike the web's row.
11. **Units in StyleSheet?** — Density-independent pixels; no px, rem or em.
12. **FlatList or ScrollView for 500 items?** — FlatList, which renders only what is near the screen.
13. **Pressable over Button?** — Pressable can be styled and reports pressed state; Button looks like the platform's.
14. **Safe areas?** — react-native-safe-area-context: SafeAreaView or useSafeAreaInsets for notches and system bars.
15. **Platform.OS values on phones?** — 'android' and 'ios'.
16. **Screen size that updates on rotation?** — useWindowDimensions, not a one-time Dimensions.get.
17. **Metro?** — The bundler that serves and builds the JavaScript bundle.

## State and data

18. **TanStack Query's default staleTime?** — 0: data is stale at once, so it refetches on mount and focus triggers.
19. **Default gcTime?** — 5 minutes for a query nobody is using.
20. **Zustand selector returning an object?** — Wrap it in useShallow, or it is a new object on every call.
21. **Why can Redux Toolkit reducers "mutate" state?** — Immer records the changes and produces a new immutable state.
22. **MMKV for the refresh token?** — No: tokens go in SecureStore, backed by the Android Keystore.

## Android

23. **APK versus AAB?** — An installable package versus a publishing format from which Play builds per-device APKs.
24. **minSdk, targetSdk, compileSdk?** — The oldest Android the app installs on, the version whose behaviour it opts
    into, and the SDK it compiles against.
25. **Which thread may touch views?** — The main (UI) thread only.
26. **val versus var?** — A read-only reference versus a reassignable one; a val list can still be mutable.
27. **Dispatchers.IO?** — The coroutine dispatcher for blocking disk and network work.

## Release

28. **versionCode versus versionName?** — An integer Play compares, which must increase, versus the label users see.
29. **Play testing tracks?** — Internal, closed and open testing, then production, which can be a staged rollout.
30. **Why upload source maps?** — So crash reports turn minified bundle positions into your file names and lines.

## Two questions you may also get

- **"Have you published an app?"** — Say exactly how far you went: "To Play's internal testing track, with an EAS
  build, used by five friends." That beats "almost".
- **"Native Android or React Native?"** — "React Native for product screens; I can read Kotlin and write a small
  module. I would learn more native as the team needs."

## Scoring

26+ correct and quick: strong. 20 to 25: go back to the sets your misses came from. Below 20, or "setTimeout 0 runs
immediately", or "the token goes in AsyncStorage": redo the question sets before the next screening call.`,
    mcqs: [
      mcq('Rapid fire: "for (var i = 0; i < 3; i++) setTimeout(() => console.log(i)). What prints?"', [
        ['3, 3 and 3', true],
        ['0, 1 and 2', false],
        ['2, 2 and 2', false],
        ['undefined three times', false],
      ], 'var gives one binding for the whole loop, and the callbacks run after the loop has left it at 3, which Node printed. 0, 1, 2 is what let prints, because it creates a binding per iteration; 2 is the last value inside the loop, not after it, and i is defined.'),
      mcq('Rapid fire: "A cart quantity can be 0. Which expression keeps it as 0 and defaults only when it is missing?"', [
        ['qty ?? 1', true],
        ['qty || 1', false],
        ['qty && 1', false],
        ['!qty ? 1 : qty', false],
      ], '?? falls back only for null and undefined, so a real 0 stays 0. || and the !qty test treat 0 as missing and replace it with 1, and qty && 1 returns 1 for any non-zero quantity and 0 for zero, which is not a default at all.'),
      mcq('Rapid fire: "What is the default flexDirection of a View in React Native?"', [
        ['column', true],
        ['row', false],
        ['row-reverse', false],
        ['none', false],
      ], 'React Native lays children out top to bottom by default, unlike the web where flex containers default to row. row-reverse is never the default, and none is not a flexDirection value.'),
      mcq('Rapid fire: "TanStack Query\'s default staleTime?"', [
        ['0, so data is stale at once', true],
        ['5 minutes, the same as gcTime', false],
        ['Infinity, so it never refetches', false],
        ['30 seconds for every query', false],
      ], 'The default staleTime is 0, so cached data is shown and refetched on the next trigger such as a mount. Five minutes is the default gcTime, for unused queries, Infinity is an option you set, and there is no 30-second default.'),
      mcq('Rapid fire: "versionCode or versionName: which must increase for every upload to Play?"', [
        ['versionCode, the integer', true],
        ['versionName, the label', false],
        ['Both, by exactly one', false],
        ['Neither, Play sets it', false],
      ], 'Play compares the integer versionCode and refuses an upload that does not exceed the previous one. versionName is the label users see and is not compared, the step need not be one, and Play does not assign the code for you.'),
    ],
  },

  /* ── MOCK ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_IV_MOCK',
    notes: `The interviewer's script for a 45-minute technical round for a fresher React Native developer: at a food-delivery or
fintech product company in Bengaluru, a GCC in Hyderabad, or the mobile practice of an IT services firm in Pune.
Have a friend read the interviewer's lines, or record yourself and score it against the notes. The panel writes down
the words in bold.

## Opening (3 min)

"Tell me about an app you built, in two minutes."

- **Strong:** what it does and **for whom**, **the stack and one reason for each choice** (Expo, TanStack Query,
  Zustand), **one hard bug and how you proved the fix**, **how it ships** (EAS build, internal track), and **one
  thing you would change**.
- **Weak:** a list of libraries, no decisions, nothing about shipping.

## Q1 — JavaScript and TypeScript (8 min)

The interviewer pastes the event-loop snippet from the JS set, with one change: the setTimeout is moved above the
console.log('4 tap'). "What prints now?"

- **Strong:** works it through aloud: **synchronous first**, so 4, 1, 3, 8 are unchanged; **the timer still runs
  last**, because moving a setTimeout earlier in the code does not move it ahead of microtasks; then the same 6, 7, 2.
- **Weak:** guesses, or says the timeout now prints first.

Follow-up: "Model the order status in TypeScript so the delivery screen cannot show a rider before one is assigned."
— **a discriminated union** with the rider only on the assigned and later states, and **an exhaustive switch**.

## Q2 — React Native (10 min)

"Our restaurant list screen polls for open or closed status. Users complain about battery, and sometimes a tap on a
restaurant opens the previous restaurant's menu. Debug it with me."

- **Strong:** **screens under a stack stay mounted**, so polling moves to **useFocusEffect** with cleanup and stops on
  **AppState background**; the wrong menu is **a late response for the old id**, fixed with a **current-request
  check or keying the query by restaurant id**; offers **a test for each** (polls counted with fake timers, a
  delayed response).
- **OK:** finds one cause.
- **Weak:** "Add React.memo" or "it is a navigation bug".

## Q3 — State and architecture (10 min)

"Design the state for cart and checkout in a grocery app. Then tell me what happens on logout."

- **Strong:** **server state in TanStack Query** with **hierarchical keys**; **cart in a small persisted store** of ids
  and quantities; **total derived, not stored**; checkout as a mutation with **an idempotency key**; logout **resets
  navigation, clears the cache, resets and deletes persisted stores, removes tokens and unregisters push**.
- **OK:** sensible split, logout is "delete the token".
- **Weak:** "Everything in Redux."

## Q4 — Android (7 min)

"A user switches to the SMS app for the OTP and comes back to an empty form. What happened?"

- **Strong:** **process death** on a low-memory phone; **a fresh JS runtime** loses in-memory state; reproduces with
  **adb shell am kill**; **persists the draft and the step**; suggests **reading the OTP in-app** with the SMS
  Retriever or User Consent API.
- **Weak:** "The form library has a bug."

Follow-up: "What is an ANR?" — **the main thread blocked**; find it from **the main-thread stack** in vitals; move
work **off the main thread**.

## Q5 — Release (5 min)

"Version 3.0 changes how the cart is saved. How do you release it?"

- **Strong:** **a versioned migration** that is **safe to retry**; **an upgrade test** from the store build; **staged
  rollout with a halt rule**; **minimum-version check** for API changes; knows **Play cannot downgrade**.
- **Weak:** "Test it and release to everyone."

## Close (2 min)

"Any questions for us?" — **Strong:** "How do you release: how often, staged rollouts, OTA? Which low-end phones do you
test on?" **Weak:** "No questions."

## Scoring rubric

| Area | Strong (3) | OK (2) | Weak (1) |
|---|---|---|---|
| JavaScript and TypeScript | Reasons through order, union + exhaustive switch | Right output, thin reasons | Guesses |
| React Native | Both causes, focus effect, stale response, tests | One cause | Memo or "library bug" |
| State and architecture | Server vs client, derived total, full logout | Split right, thin logout | One global store |
| Android | Process death, reproduce, persist, ANR | Knows lifecycle names | Blames the library |
| Release | Migration, upgrade test, halt rule, min version | Staged rollout only | "Release to all" |

Hire bar for a fresher: 11 or more out of 15, with no 1 in React Native or State and architecture. Saying "I have not
done that on Android, but here is how I would find out" costs far less than a confident wrong answer.`,
    mcqs: [
      mcq('In the mock\'s Q1, the setTimeout(..., 0) line is moved above the first console.log. Where does "5 timeout 0" print now?', [
        ['Still last, after all the synchronous logs and every microtask', true],
        ['First, because it is now the first statement in the handler code', false],
        ['Straight after "4 tap", ahead of the async function\'s first log', false],
        ['Before "2 after await saveDraft" but after the then callback logs', false],
      ], 'Where setTimeout is called changes only when the timer is registered, not when its callback runs: it still waits for the synchronous code and the whole microtask queue. It cannot run before the synchronous logs, and the await continuation is a microtask, so it beats the timer too.'),
      mcq('In the mock\'s Q2, tapping a restaurant sometimes opens the previous restaurant\'s menu. Which cause scores highest?', [
        ['A late response for the old id overwriting state for the new one', true],
        ['React Navigation opening the wrong screen from its route history', false],
        ['FlatList recycling the row and keeping the previous onPress prop', false],
        ['The menu image cache returning the previous restaurant\'s picture', false],
      ], 'The screen is reused with a new id and an older, slower request finishes last, the same race as the search box; a current-request check or a query keyed by id fixes it. Navigation passes the right params, FlatList does not reuse handlers across items, and a cached image would not change the menu data.'),
      mcq('In the mock\'s Q3, which logout plan earns a 3 for state and architecture?', [
        ['Reset navigation, clear the cache and stores, delete tokens, unregister push', true],
        ['Delete the access token, because without it no request can succeed again', false],
        ['Call queryClient.clear() first while the signed-in screens stay mounted', false],
        ['Restart the app with a native module so that every piece of memory is freed', false],
      ], 'Data outlives the token in caches, persisted stores and the push registration, so all of it is reset, and navigation goes first so signed-in screens unmount. Deleting the token alone leaves data behind, clearing with screens mounted left the old profile showing in the test, and restarting the app does not clear persisted storage.'),
    ],
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_IV_CHECKPOINT',
    notes: `Ten questions across the mobile interview sets: JavaScript and TypeScript, React Native, state and architecture,
Android, and release. Each is asked the way a panel asks it. Read the code or the scenario in the question before you
choose.`,
    checkpoint: [
      ck('TYPESCRIPT', 'Promise.resolve().then(() => log("A")); setTimeout(() => log("B"), 0); queueMicrotask(() => log("C")); log("D"). What is the order?', [
        ['D, A, C, B', true],
        ['A, B, C, D', false],
        ['D, B, A, C', false],
        ['D, C, A, B', false],
      ], 'Synchronous D first, then the microtasks in the order they were queued, A then C, and the timer B only when the microtask queue is empty. Source order is not run order, the timer never beats queued microtasks, and microtasks run first in, first out, so A precedes C.'),
      ck('TYPESCRIPT', 'Why does a TypeScript team often prefer a union of string literals to an enum for order statuses?', [
        ['A union erases to plain strings that match the API JSON', true],
        ['A union is checked at run time, and an enum is not at all', false],
        ['An enum cannot be used inside a switch statement in TypeScript', false],
        ['A union can hold numbers, while an enum holds only strings', false],
      ], 'Literal unions vanish at compile time, leaving the same strings the API sends, and they work with type-stripping tools; an enum emits code and fails under erasableSyntaxOnly. Neither is checked at run time, enums work in switches, and enums can be numeric too.'),
      ck('REACT_NATIVE', 'Which screens\' effects keep running in a native stack while the user is on a pushed Detail screen?', [
        ['The screens below it, which stay mounted until they are popped', true],
        ['None, since only the focused screen is mounted in a native stack', false],
        ['Only the first screen of the stack, which is never unmounted', false],
        ['Every screen ever visited, including those already popped off', false],
      ], 'A stack keeps every screen under the top one mounted, so their effects and timers run, which is why focus-aware effects exist. Unfocused screens are not unmounted, it is not limited to the first screen, and popped screens are unmounted.'),
      ck('REACT_NATIVE', 'A search screen sets results from every response. Typing "paneer" quickly shows results for "pa". Which statement is correct?', [
        ['The slowest response arrived last, so the effect must ignore stale ones', true],
        ['TextInput dropped keystrokes, so the query state still holds "pa"', false],
        ['The results list did not re-render, so it shows the first data it got', false],
        ['The API cached "pa", so it answered every later query with that data', false],
      ], 'Requests overlap and finish out of order; the oldest, slowest one overwrote the right results, as the test reproduced. The input held "paneer", the list did re-render with the wrong data, and nothing points to the API returning the same answer for different queries.'),
      ck('STATE_MANAGEMENT', 'A screen shows ["orders","detail",42]. After cancelling the order, the app calls invalidateQueries({ queryKey: ["orders"], exact: true }). Why does the screen not refresh?', [
        ['exact: true matches only the key ["orders"] itself, and no query has it', true],
        ['invalidateQueries never refetches a query that is on screen right now', false],
        ['Detail queries must be refetched by calling queryClient.clear() first', false],
        ['The key must be written as a string, "orders/42", to be matched at all', false],
      ], 'With exact, only an identical key matches, so the detail query was untouched; the default prefix match would have invalidated it. Invalidation does refetch active queries, clearing the cache is a heavy-handed and different operation, and keys are arrays, not path strings.'),
      ck('STATE_MANAGEMENT', 'An app stores the cart\'s line items and also a separate "itemCount" field. A bug report says the badge shows 3 when the cart has 2 lines. What is the lasting fix?', [
        ['Compute the count from the lines in a selector and stop storing it', true],
        ['Update itemCount in one more place, in the remove-line action handler', false],
        ['Re-sync itemCount from the server every time the cart screen opens', false],
        ['Store itemCount in SecureStore so other code cannot change it again', false],
      ], 'Derived values drift when every action must remember to update them; computing them removes the possibility. Patching one more action leaves the next one to forget, a server re-sync hides the bug for a while, and SecureStore is for secrets, not counters.'),
      ck('ANDROID_DEVELOPMENT', 'Which state survives the system killing the app\'s process in the background and the user returning?', [
        ['Values saved through SavedStateHandle or rememberSaveable', true],
        ['Everything held in the screen\'s ViewModel at that moment', false],
        ['Every variable in the React Native JavaScript runtime', false],
        ['Values stored in a remember block in the composable', false],
      ], 'Saved instance state is written to a Bundle the system keeps and restores, so it survives process death. A ViewModel survives rotation but not process death, the JS runtime starts fresh, and remember survives only recomposition.'),
      ck('ANDROID_DEVELOPMENT', 'In a ViewModel, which call loads orders without blocking the UI and is cancelled when the screen\'s ViewModel is cleared?', [
        ['viewModelScope.launch with withContext(Dispatchers.IO) for the call', true],
        ['GlobalScope.launch with the network call made on Dispatchers.Main', false],
        ['runBlocking { api.activeOrders() } inside the init block of the class', false],
        ['Thread.sleep until the response arrives, then setting the state value', false],
      ], 'viewModelScope ties the work to the ViewModel\'s life, and the IO dispatcher keeps the blocking call off the main thread. GlobalScope has no owner and Main would block, runBlocking blocks the thread it runs on, and sleeping on the main thread causes an ANR.'),
      ck('MOBILE_RELEASE', 'Version 3.0 changes how the cart is saved. Which migration design is safest?', [
        ['Write the new store, mark it done, and only then delete the old data', true],
        ['Delete the old data first, then write the new store, to avoid two copies', false],
        ['Skip migration and ask users to add their cart items again after update', false],
        ['Migrate on the server, since the app cannot read its own older data', false],
      ], 'Keeping the old data until the new copy is safely written means a failure half-way can retry on the next launch. Deleting first loses the cart if the write fails, asking users to redo work is the outcome to avoid, and the app can read its own old data; the server never had it.'),
      ck('MOBILE_RELEASE', 'A staged rollout of a new native build shows a crash spike at 10%. Which statement is true?', [
        ['Halting stops new installs, but users who have it keep it until a newer version', true],
        ['Halting the rollout also uninstalls the update from the phones that received it', false],
        ['The team can republish the previous build with its old versionCode to roll back', false],
        ['An OTA update can replace the native code that caused the crash on those phones', false],
      ], 'Play cannot downgrade, so affected users wait for a fix with a higher versionCode. Halting does not uninstall, an old versionCode cannot be uploaded again as an update, and OTA updates change JavaScript and assets, not native code.'),
    ],
  },
];
