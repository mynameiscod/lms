/**
 * Career-track content: Testing, Performance and Animation (MB_TESTING_PERF), Mobile, batch MB3.
 *
 * Builds on Year 2's testing lessons ("What a Test Is Actually For", "Asserting the Right Thing", "The Cases That
 * Actually Break Software"), Year 3's "What Is Draining the Battery" and "Testing on Something Real", and this track's
 * "Lists: FlatList, SectionList and Performance" and "State, Server Data and Forms". It goes deeper: Jest and React
 * Native Testing Library with mocked modules, network and timers, a flaky test and its fix; Maestro and Detox flows;
 * re-renders measured with React's Profiler; FlashList, images and startup; Reanimated 4 with Gesture Handler 3; and
 * accessibility checked with role queries.
 *
 * One fictional app runs through the topic: YatraSeat, a Hyderabad start-up's bus-booking app. Packages were installed
 * for Expo SDK 58 (React Native 0.88, React 19.3, Reanimated 4.7.1, Worklets 0.13, Gesture Handler 3.3, FlashList 2.3,
 * expo-image) and API names checked in node_modules. Every Jest test shown was run under jest-expo with Testing Library
 * 13.3, and the printed output and render counts are that real output; all TypeScript shown was type-checked with tsc.
 * Not run: Maestro and Detox (no emulator), the performance monitor, DevTools profiler, Hermes and startup timings on a
 * phone, and TalkBack/VoiceOver; those parts are written from the Maestro, Detox, React Native, Expo and Android docs.
 *
 * Skills: REACT_NATIVE by default; AUTOMATED_TESTING for the unit/component and E2E lessons, WEB_ACCESSIBILITY for the
 * accessibility lesson (trackSkillAttribution.ts), and ck() in the checkpoint where a question is about those.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_MB_TESTING_PERF_BUNDLES: PilotBundle[] = [
  /* ── UNIT_COMPONENT ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_TESTING_PERF_UNIT_COMPONENT',
    notes: `YatraSeat is a bus-booking app from a Hyderabad start-up: search a route, pick seats on a seat map, pay by UPI.
Year 2's "What a Test Is Actually For" and "Asserting the Right Thing" taught why tests exist and what a good assertion
is. This lesson is the React Native toolchain for it, and the habits that keep a mobile test suite trustworthy.

## The shape of a mobile test suite

Most tests should be fast logic tests (fares, validation, date maths). Next come component tests: render one screen
in Node, press things, check what the user would see. A handful of end-to-end flows run the real app on an emulator
(next lesson). Component tests are where React Native teams get most of their value: they run in seconds, need no
device, and catch the bugs users report ("the Search button never enabled").

## Setup

    npx expo install jest-expo jest @types/jest @testing-library/react-native
    // package.json
    "scripts": { "test": "jest" },
    "jest": { "preset": "jest-expo" }

Jest runs in Node, not on a phone. jest-expo renders React Native components to a test tree and mocks Expo's native
modules. Anything else native (an analytics SDK, a payments SDK, Reanimated) needs a mock or the library's own Jest
setup, or the import throws. Testing Library 13 adds its matchers (toBeOnTheScreen, toBeDisabled, toHaveTextContent,
toBeSelected) automatically when you import it.

## Logic first: table tests

Fares are money, so YatraSeat keeps them in paise (integers) and rounds once. One table covers the cases:

    test.each([
      ['one seater, no promo', [seat('L4', 64900)], null, 64900 + 3245],
      ['promo hits the Rs 50 cap', [seat('U1', 119900), seat('U2', 119900)], 'FIRST50', 234800 + 11740],
      ...
    ])('%s', (_name, seats, promo, expected) => {
      expect(fareFor(seats, promo).totalPaise).toBe(expected);
    });

Four rows plus tests for "no seats" and "seven seats" ran as 6 passing tests. Each row is a sentence a product manager
can read, which is how you find the missing case (what about exactly six seats?).

## Query the screen the way a user does

Testing Library's rule: find elements by what the user perceives, in this order:

1. **getByRole('button', { name: 'Search buses' })** — the role and accessible name, which is also what TalkBack
   reads. Options narrow it further: { selected: true }, { disabled: true }, { checked: true }.
2. **getByLabelText('From')** — inputs by their accessibilityLabel.
3. **getByText(/Orange Travels/)** — visible text, a string or a regular expression.
4. **getByTestId('fareSheet')** — last resort, for things with no text or role.

A screen you cannot query by role is usually a screen TalkBack cannot use either, so the query style doubles as an
accessibility check. Each query has three forms: getBy throws if missing, queryBy returns null (use it to assert
absence), and findBy returns a promise that retries until the element appears or about one second passes.

## userEvent, not just fireEvent

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('From'), 'Hyderabad');
    await user.press(screen.getByRole('button', { name: 'Search buses' }));

userEvent replays what a finger does (press in, press out, focus, one character at a time) and respects disabled
elements. fireEvent.press calls the handler directly; it is quicker, and fine for a button that is plainly enabled,
but it will not tell you that a real user could not have pressed it.

## Mock at the boundary you do not own

**Modules.** The analytics SDK has native code and would throw in Node. Replace the whole module:

    jest.mock('../src/yatra/analytics', () => ({ track: jest.fn() }));
    ...
    expect(track).toHaveBeenCalledWith('search', { from: 'Hyderabad', to: 'Vijayawada' });

Libraries with native code often ship a mock (you used AsyncStorage's in "Storage and Offline"); use theirs.

**The network.** Stub fetch, not your own api.ts, so the test still exercises URL building and error handling:

    const json = (body: unknown, status = 200) =>
      Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response);
    beforeEach(() => {
      fetchMock.mockReset();
      fetchMock.mockImplementation(() => json([]));   // default: every endpoint answers []
      globalThis.fetch = fetchMock as unknown as typeof fetch;
    });

Our test then asserted the exact URL (https://api.yatraseat.test/buses?from=Hyderabad&to=Vijayawada&date=2026-11-14)
and, in another case, answered the first call with a 503 and the second with buses, to check that "Try again"
recovers. Larger apps use Mock Service Worker (its msw/native entry) for the same idea with real request matching.

**Time.** The From box suggests cities 300 ms after typing stops. Real timers make that test slow and flaky; fake
timers make it exact:

    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.type(screen.getByLabelText('From'), 'Hyd');
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => { jest.advanceTimersByTime(300); });
    expect(fetchMock).toHaveBeenCalledWith('https://api.yatraseat.test/cities?prefix=Hyd');

Without the advanceTimers option, userEvent's own small delays wait on timers that never move.

## What not to test

Internal state values, which hook was called, or a snapshot of a whole screen: they break on every refactor and pass
when the screen is wrong. Assert what the user sees and what leaves the app (requests, analytics events). Snapshot
tests are acceptable for a small presentational component whose output is meant to be stable.`,
    workedExample: `**The flaky test.** A tester on the YatraSeat team wrote this and it passed on her laptop for a week:

    await user.press(screen.getByRole('button', { name: 'Search buses' }));
    expect(screen.getByText(/Orange Travels/)).toBeOnTheScreen();

Then CI started failing it about one run in five. To see why, we ran the same test against a fake API that answers
after 0 ms and after 30 ms, as a real network sometimes does. Jest reported 1 failed, 3 passed; summarised:

    API latency 0 ms  > FLAKY: getByText straight after the press       passed
    API latency 30 ms > FLAKY: getByText straight after the press       failed
      Unable to find an element with text: /Orange Travels/
      ... <ActivityIndicator accessibilityLabel="Loading buses" />
    API latency 0 ms  > FIXED: findByText waits for the result          passed
    API latency 30 ms > FIXED: findByText waits for the result          passed

**Reading it.** The tree Testing Library printed shows the spinner: the test looked before the response arrived. With
an instant mock the promise happened to settle inside the press's own awaits, so the test passed by luck. A busy CI
machine shifts that timing.

**The fix** is one word, because findBy retries until the element appears:

    expect(await screen.findByText(/Orange Travels/)).toBeOnTheScreen();

Do not "fix" it with a sleep or a retry: a sleep makes every run slower and still fails on a slow day, and retrying
a flaky test hides real races in your app.

**A second real failure, from the same file.** An earlier version reset the fetch mock with no default answer. The
debounced city lookup fired 300 ms after typing, after the test's assertions, and its fetch returned undefined:

    TypeError: Cannot read properties of undefined (reading 'ok')
      at suggestCities (src/yatra/api.ts:14:12)

In one run it surfaced as this error and in another as "Exceeded timeout of 5000 ms for a test", which is the
confusing part: work a component starts (timers, requests) keeps running after your last line. The fix was the default
mockImplementation shown in the lesson, so every endpoint answers; the habit is to stub every request a screen makes,
not only the one you are testing.`,
    mcqs: [
      mcq('The YatraSeat search test asserts with getByText immediately after pressing Search, and fails about one CI run in five. What is the right change?', [
        ['Use await findByText, which retries until the result is on the screen', true],
        ['Add a 500 ms sleep after the press so the request has time to finish', false],
        ['Configure Jest to retry each failed test three times before reporting', false],
        ['Replace userEvent.press with fireEvent.press so that the press is sync', false],
      ], 'The result arrives asynchronously, so the query must wait for it; findBy polls until it appears or times out. A sleep is slow and still loses on a slow machine, retries hide the race instead of fixing it, and fireEvent changes how the press is delivered, not when the response lands.'),
      mcq('Why does the lesson stub globalThis.fetch rather than jest.mock the app\'s own api.ts in the screen test?', [
        ['The test then also checks the URL building and the error handling', true],
        ['jest.mock cannot replace a module that is written in TypeScript code', false],
        ['fetch must be stubbed anyway, because Jest has no fetch at all', false],
        ['Mocking api.ts makes the test render the screen on a real device', false],
      ], 'Stubbing at the network boundary keeps api.ts in the test, so a wrong query string or an unhandled 503 fails it. jest.mock handles TypeScript fine, recent Node versions do have a global fetch, and no mock makes Jest use a device.'),
      mcq('A debounced city search waits 300 ms. With jest.useFakeTimers(), the test hangs inside user.type. What is missing?', [
        ['userEvent.setup({ advanceTimers: jest.advanceTimersByTime })', true],
        ['A call to jest.runAllTimers() placed before the render() call', false],
        ['await act() wrapped around the userEvent.setup() call itself', false],
        ['jest.useRealTimers() inside beforeEach, before each typing step', false],
      ], 'userEvent waits on small timers between keystrokes; with fake timers those never fire unless userEvent is told how to advance them. Running timers before render does nothing useful, act around setup changes nothing, and switching back to real timers defeats the reason for faking them.'),
    ],
    checkpoint: [
      mcq('Which query should a YatraSeat component test prefer for the "Search buses" button?', [
        ['getByRole(\'button\', { name: \'Search buses\' })', true],
        ['getByTestId(\'search-button\') set on the Pressable', false],
        ['getByText(\'Search buses\') and then its parent node', false],
        ['UNSAFE_getByType(Pressable) with the first match', false],
      ], 'Role plus accessible name is how the user and the screen reader find the button, so the test also proves it is exposed as a button. A testID passes even if TalkBack cannot use the button, climbing from text to its parent is fragile, and querying by component type tests implementation.'),
      mcq('A test must check that the error banner is gone after Try again succeeds. Which assertion is right?', [
        ['expect(screen.queryByRole(\'alert\')).not.toBeOnTheScreen()', true],
        ['expect(screen.getByRole(\'alert\')).not.toBeOnTheScreen()', false],
        ['expect(await screen.findByRole(\'alert\')).toBeNull()', false],
        ['expect(screen.getAllByRole(\'alert\')).toHaveLength(0)', false],
      ], 'queryBy returns null instead of throwing, so it is the form for asserting absence. getBy and getAllBy throw when nothing matches, so they fail before the expectation runs, and findBy rejects after its timeout when the element never appears.'),
      mcq('The screen imports a native payments SDK, and the test file crashes on import. What is the usual fix?', [
        ['jest.mock the SDK module, or use the mock the library ships', true],
        ['Run the component tests on an Android emulator in CI instead', false],
        ['Wrap the screen in an error boundary inside the test renderer', false],
        ['Switch the preset from jest-expo to the plain react-native one', false],
      ], 'Jest runs in Node, where native code does not exist, so native modules are replaced at the module boundary. Component tests are not run on emulators, an error boundary cannot catch an import-time crash, and changing preset does not provide native code either.'),
    ],
  },

  /* ── E2E ─────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_TESTING_PERF_E2E',
    notes: `Component tests run your screens in Node with the native world mocked away. They cannot tell you that the
release build crashes on launch because a native module is missing, that the keyboard covers the Pay button on a
small Android phone, or that the deep link from the OTP SMS opens the wrong screen. End-to-end (E2E) tests install
the real app on an emulator or phone and drive it like a person. Year 3's "Testing on Something Real" made the case for
devices; this lesson is the tooling. (Neither tool could be run for this lesson, as there was no emulator; the flows
below are written from the Maestro and Detox documentation, so check the syntax against the current docs.)

## What E2E is worth, and what it costs

Each E2E test needs a built app, a booted emulator and real waiting, so a flow takes tens of seconds and a suite takes
minutes. They are also the flakiest tests you will own. So keep them few and important: for YatraSeat, log in with
OTP, search a route and book a seat up to the payment hand-off, view and cancel a booking, and open the app from a
booking deep link. Everything else (fare maths, validation, empty and error states) belongs in Jest, where it is fast
and exact.

## Maestro: flows in YAML

Maestro is a black-box tool: it sees only what is on the screen (the accessibility tree) and taps, types and asserts.
You install its CLI on your machine, build and install the app on an emulator, and run a flow file:

    # .maestro/search-and-pick-seat.yaml
    appId: in.yatraseat.app
    ---
    - launchApp:
        clearState: true            # fresh install state: no login, no cache
    - runFlow: login.yaml           # a sub-flow, reused by every flow that needs a user
    - tapOn:
        id: "from-input"
    - inputText: "Hyderabad"
    - tapOn: "Hyderabad"            # pick the suggestion
    - tapOn:
        id: "to-input"
    - inputText: "Vijayawada"
    - tapOn: "Search buses"
    - extendedWaitUntil:
        visible: "Orange Travels.*"  # text is matched as a regular expression
        timeout: 15000
    - tapOn: "Orange Travels.*"
    - tapOn: "Seat L1.*"            # the seat's accessibilityLabel
    - assertVisible: "Total.*"
    - takeScreenshot: seat-selected

Run it with maestro test .maestro/search-and-pick-seat.yaml, or a whole folder. Maestro waits for the screen to settle
and retries taps on elements that are still appearing, which removes most of the sleeps people used to write. maestro
studio opens an inspector that shows which text and ids it can see. Values such as the test phone number come in as
variables (inputText: \${PHONE}, passed with -e PHONE=...), never hard-coded secrets.

## Detox: gray-box, in JavaScript

Detox drives the app from Jest tests written in JavaScript or TypeScript. It is "gray-box": it hooks into the app and
waits until React Native is idle (no pending network requests, timers or animations) before every action. In outline:

    describe('booking', () => {
      beforeAll(async () => { await device.launchApp({ newInstance: true }); });

      it('selects a seat on the first bus', async () => {
        await element(by.id('from-input')).typeText('Hyderabad');
        await element(by.id('to-input')).typeText('Vijayawada');
        await element(by.id('search-button')).tap();
        await waitFor(element(by.text('Orange Travels'))).toBeVisible().withTimeout(15000);
        await element(by.id('bus-b1')).tap();
        await element(by.id('seat-L1')).tap();
        await expect(element(by.id('fare-total'))).toBeVisible();
      });
    });

Detox needs native build configuration (a .detoxrc.js that names the Android build command and the emulator, plus
test code compiled into the Android build). In an Expo project that means a development or release build made with
prebuild and Detox's config plugin, not Expo Go. Its idle synchronisation is its strength and its trap: an endless
animation or a polling timer means the app is never idle, and Detox waits until it times out.

**Choosing.** Maestro is quicker to start, needs no native changes and suits small teams; Detox suits teams that want
tests in TypeScript next to the code and tighter synchronisation. Either is far better than none; do not run both.

## Test IDs

Black-box tools need stable handles. Text works for buttons ("Search buses") until the app is translated into Telugu;
then give key elements a testID. In React Native, testID is what Maestro's id: and Detox's by.id() match. Rules: put
it on the touchable element, not the Text inside it; name it by purpose (search-button, seat-L1), never by position;
never change it casually, because it is an API your tests depend on.

## Data, OTPs and payments

E2E runs against a staging backend, not production. Use test phone numbers with a fixed OTP that only staging
accepts, seed known routes and buses before the run, and reset the app with clearState (or a reinstall) so each flow
starts clean. Never drive a real UPI payment: point the staging build at the payment provider's sandbox, or stop at
the hand-off screen and test the "payment succeeded" deep link separately.

## Running in CI

On GitHub Actions, a Linux runner can boot an Android emulator (the community android-emulator-runner action is the
common way), install the APK built earlier in the job, and run the flows. Expo's EAS Workflows can also run Maestro
flows against an EAS build; check the Expo docs for the current setup. A sensible split: two or three critical flows
on every pull request, the full suite nightly, with screenshots and the video of failed runs kept as CI artefacts.

## Flakiness policy

When an E2E test fails intermittently, find the cause: a missing wait for a real condition, shared state between
flows, or test data someone else changed. If you cannot fix it today, quarantine it (move it out of the blocking
suite with an issue) rather than adding automatic retries, which teach the team to ignore red builds.`,
    mcqs: [
      mcq('YatraSeat\'s E2E suite takes 40 minutes and fails randomly. Which flows should stay in it?', [
        ['OTP login, search to seat to payment hand-off, cancel, and the deep link', true],
        ['Every validation message on every form, so that no single message is ever missed', false],
        ['The fare calculation for each promo code and every seat combination', false],
        ['Each screen\'s empty, loading and error states, one flow per state', false],
      ], 'E2E is slow and flaky, so it is kept for the few journeys that only a real build can prove. Validation messages, fare maths and screen states are checked faster and more exactly by Jest component and logic tests.'),
      mcq('A Detox test always times out on the results screen, which has a shimmer placeholder that animates forever. Why?', [
        ['Detox waits for the app to be idle, and a looping animation never ends', true],
        ['Detox cannot find any elements that sit inside an animated parent view', false],
        ['The emulator needs hardware acceleration to render the animation', false],
        ['Detox times out on any screen that renders more than one FlatList', false],
      ], 'Detox synchronises with the app and waits for animations, timers and requests to settle; an endless animation keeps it busy, so stop the shimmer when data arrives or disable synchronisation around it. Animated parents, acceleration and list counts are not the cause.'),
      mcq('The Telugu release of YatraSeat breaks every Maestro flow that taps "Search buses". What is the durable fix?', [
        ['Give the button a testID and tap it with id: in the flows', true],
        ['Write a second copy of every flow with the Telugu labels in it', false],
        ['Run all E2E flows on an emulator that is set to English only', false],
        ['Match the button with a regular expression that ignores case', false],
      ], 'A testID is not translated, so one flow works in every language. Duplicating flows doubles maintenance, an English-only emulator never tests the Telugu build, and a case-insensitive pattern still does not match different words.'),
    ],
    checkpoint: [
      mcq('What can an E2E test on an emulator catch that a Jest component test cannot?', [
        ['The release build crashing at launch because a native module is missing', true],
        ['A promo code that takes off the wrong amount in the final fare calculation', false],
        ['A Search button that stays disabled after both cities are entered', false],
        ['An error banner that is not shown when the search API returns a 503', false],
      ], 'Only a real build exercises native modules, linking and the release bundle. The fare logic, the button state and the error banner are all visible to component and logic tests, which find them faster.'),
      mcq('An E2E flow needs a logged-in user. How should it get past the OTP screen?', [
        ['Use a staging test number whose fixed OTP only the staging backend accepts', true],
        ['Read the real OTP SMS from the emulator\'s messages app during the flow', false],
        ['Log in with a production account kept just for automated testing', false],
        ['Skip login by editing the stored token in the emulator\'s file system', false],
      ], 'A fixed OTP on staging is predictable and harmless. Reading real SMS needs a real number and is fragile, production accounts let tests touch real data, and editing storage bypasses the very flow the test should cover.'),
      mcq('Where should a testID go on a seat button made of a Pressable with a Text inside?', [
        ['On the Pressable, named by purpose, such as seat-L1', true],
        ['On the Text, since the label is what the user reads', false],
        ['On the parent row, with the seat\'s index in the list', false],
        ['On every element, so that any of them can be tapped', false],
      ], 'The touchable element is what receives the tap, and a purpose-based name survives reordering. The Text is not the touchable, an index changes when the layout does, and duplicate ids make matches ambiguous.'),
    ],
  },

  /* ── PERFORMANCE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_TESTING_PERF_PERFORMANCE',
    notes: `YatraSeat's results screen stutters on a mid-range Android phone when a user scrolls 40 buses, and the app takes
long enough to open that people tap the icon twice. Year 3's "What Is Draining the Battery" introduced frames and
the main thread; the Lists lesson in this track gave you memo rows and FlatList's knobs. This lesson is how to find
which of those matters, with numbers, before changing anything.

## Two threads and a budget

At 60 frames a second each frame has 16.7 ms; at 120 Hz, 8.3 ms. React Native has a JavaScript thread (your
components, state updates, business logic) and a UI thread (native views, layout, touches). If the JS thread is busy
for 200 ms, taps queue up and JS-driven animations freeze, while native scrolling may continue; that is why a list can
scroll but rows appear blank. Name the thread first, then look for the cause.

## Measure on the right build

Development mode runs extra checks and an unminified bundle, so it is much slower than what users get. Judge speed on
a release or preview build (npx expo run:android --variant release, or an EAS preview build) on a mid-range Android
phone, not a flagship or a simulator. Tools, from the React Native and Expo docs:

- **Performance monitor** (Dev Menu): live frame rate for the UI and JS threads.
- **React Native DevTools**: the React Profiler records each commit and which components rendered and why;
  "highlight updates" flashes components as they render. The Memory tab takes Hermes heap snapshots.
- **Android Studio profiler** for CPU, memory and native traces.

## Re-renders, measured

You can count renders in Jest with React's Profiler component, whose onRender callback fires on every commit:

    <Profiler id="results" onRender={(id, phase) => commits.push(id + ':' + phase)}>
      <BusResults buses={BUSES} variant={variant} />
    </Profiler>

The results screen has a "fares held for 5:00" countdown in its parent state and a list of 40 buses (10 mounted at
first, FlatList's initialNumToRender). We counted row renders for three versions, after one countdown tick, after
selecting a bus, and after selecting a different one. Real output:

    plain        mounted rows=10  tick -> 10 row renders  select -> 10  reselect -> 10
    memo-inline  mounted rows=10  tick -> 10 row renders  select -> 10  reselect -> 10
    memo-stable  mounted rows=10  tick -> 0 row renders  select -> 1  reselect -> 2

- **plain**: every parent state change re-renders every visible row, including a clock tick that changes no row.
- **memo-inline**: wrapping the row in memo changed nothing, because renderItem passed onSelect={id =>
  setSelectedId(id)}, a new function on every render, so memo's prop comparison always failed.
- **memo-stable**: memo plus a useCallback handler. A tick renders no rows; the first selection renders one (the newly
  selected row) and the next renders two (old and new).

That is the rule behind "memo and callbacks used with reason": memo only helps if every prop is stable, and the
Profiler is how you prove it. Inline objects (style={{ marginTop: 8 }}) and inline arrays defeat it the same way.

**React Compiler.** Expo can run the React Compiler, which inserts memoisation for you. We compiled the "plain"
version with it under Jest: the tick then rendered 0 rows, but selection still re-rendered all 10, because renderItem
itself reads selectedId and every visible cell calls it again. The compiler removes much hand-written useMemo and
useCallback; it does not replace measuring.

## Lists, beyond the knobs

You met initialNumToRender, windowSize and getItemLayout. Two more tools for heavy lists:

- **FlashList** (Shopify) recycles row views instead of unmounting and remounting them. Version 2 measures rows itself
  (no size estimate needed) and is built for the New Architecture. Give it getItemType when rows differ (bus cards
  and ad banners), and remember that a recycled view keeps its local state: use useRecyclingState(initial, [item.id])
  or keep the state outside the row, or an "expanded" flag jumps to another bus as you scroll.
- **Less work per row.** Format dates and prices once when data arrives, not in every render, and keep rows shallow.

## Images

A photo is decoded into memory at full size: a 4000 × 3000 photo is 4000 × 3000 × 4 bytes, about 48 MB, even if it is
drawn as an 80 × 60 thumbnail. Ask the CDN for the display size (most image CDNs take width and height parameters),
prefer WebP, and use expo-image, which caches to memory and disk (cachePolicy="memory-disk"), fades in with
transition, and takes a recyclingKey so a recycled FlashList row does not flash the previous bus's photo.

## Startup

Users judge an app by its cold start. Hermes, React Native's default engine, ships your JavaScript precompiled to
bytecode, so it does not parse source at launch. What you control:

- **Do less before the first screen.** Keep the splash screen up only while you load what the first screen truly needs
  (fonts, the cached session), using expo-splash-screen's preventAutoHideAsync and hide.
- **Load less code.** Large dependencies (a full date library, a whole icon set, lodash imported whole) cost bundle
  size and startup. Expo Atlas shows what is in your bundle.
- **Defer.** Analytics, remote config and non-visible screens can initialise after the first frame.

Measure cold start on Android with adb shell am start -W, which prints the launch time, and watch Play Console's
Android vitals once released.

## Memory

Leaks in React Native are mostly subscriptions: an AppState or NetInfo listener, a setInterval polling fares, or a
WebSocket opened in an effect without a clean-up. Each mounted screen adds another, so memory and battery climb as a
user moves around. Every effect that subscribes returns a function that unsubscribes.`,
    workedExample: `**Scenario.** The YatraSeat results screen re-renders all visible bus cards every second because of
the fare countdown, and the team argues about whether memo "works". Settle it with numbers, then fix it.

**Step 1: count.** A module-level counter in the row (renders.row++) and a Profiler around the screen. Press the tick
button (standing in for the timer), select a bus, select another. Before any fix, every action rendered all 10 mounted
rows: 10, 10, 10.

**Step 2: try memo alone.** const MemoRow = memo(PlainRow). Run again: 10, 10, 10. Nothing changed, and the reason is
in the call site:

    renderItem={({ item }) => (
      <Row bus={item} selected={item.id === selectedId} onSelect={id => setSelectedId(id)} />
    )}

onSelect is a new function on every render of BusResults, so memo sees a changed prop on every row.

**Step 3: make the props stable.**

    const stableSelect = useCallback((id: string) => setSelectedId(id), []);
    ...
    <Row bus={item} selected={item.id === selectedId} onSelect={stableSelect} />

Run again: tick 0, select 1, reselect 2. Each row now re-renders only when its own bus or its own selected flag
changes. On a phone that is the difference between ten rows' work on every second and none.

**Step 4: decide whether it mattered.** These are render counts, not milliseconds: Jest's timings say nothing about a
phone. The next step is the React Profiler on a release build on a mid-range phone, scrolling while the countdown
runs. If the frame rate was already steady, the fix is still cheap and correct, but the real stutter may be
elsewhere: full-size images (step 5 of the checklist below) are the usual suspect on a bus list with operator photos.

**Checklist used.** 1. Name the thread (JS or UI) with the performance monitor. 2. Count renders with the Profiler.
3. Stabilise props of memo rows. 4. Move per-row formatting out of render. 5. Resize and cache images. 6. Only then
consider FlashList or the FlatList knobs.`,
    mcqs: [
      mcq('A memo row component still re-renders on every countdown tick. renderItem passes onSelect={id => setSelectedId(id)}. Why?', [
        ['The inline arrow is a new function each render, so a prop always changes', true],
        ['memo only compares props deeply for class components, not for function ones', false],
        ['FlatList always re-renders every row, ignoring memo on the component', false],
        ['setSelectedId is recreated on each render and memo detects the change', false],
      ], 'memo does a shallow comparison, and a new arrow function is never equal to the last one, so every row looks changed. In our run memo plus a useCallback handler took a tick from 10 row renders to 0. memo works on function components, FlatList respects it, and state setters are stable.'),
      mcq('The team wants to know whether YatraSeat\'s scroll is smooth enough. Where should they measure?', [
        ['A release or preview build on a mid-range Android phone', true],
        ['The development build on the newest phone the team owns', false],
        ['The iOS simulator on a laptop with the profiler attached', false],
        ['Jest render timings collected on the CI build server', false],
      ], 'Users run release builds on ordinary phones, so that is the only place frame rates mean something. Development mode is much slower and a flagship much faster, a simulator uses the laptop\'s CPU, and Jest timings measure Node, not a phone.'),
      mcq('In a FlashList of buses, tapping "Amenities" on one card makes another card appear expanded after scrolling. What is the cause?', [
        ['A recycled row view kept its local state when it was reused for another bus', true],
        ['FlashList renders rows in a random order when getItemType is not set', false],
        ['The keyExtractor returned duplicate keys for some of the buses in the list', false],
        ['expo-image cached the expanded card and then showed it on the next card', false],
      ], 'FlashList reuses row views, so useState inside a row travels with the view; useRecyclingState keyed on the item id, or state kept outside the row, fixes it. Order does not depend on getItemType, duplicate keys cause other warnings, and image caching does not hold layout state.'),
    ],
    checkpoint: [
      mcq('A 4000 × 3000 operator photo is shown as an 80 × 60 thumbnail. Roughly how much memory does decoding the original take?', [
        ['About 48 MB, since it is decoded at 4 bytes per pixel at full size', true],
        ['About 19 KB, since only the 80 × 60 pixels on screen are decoded', false],
        ['The JPEG file size, since images stay compressed in the memory', false],
        ['Nothing extra, because the GPU holds images outside app memory', false],
      ], '4000 × 3000 × 4 bytes is 48 million bytes, whatever size it is drawn at, so ask the CDN for the display size. Decoding is not cropped to the view, images are decompressed to draw them, and decoded bitmaps count against the app\'s memory.'),
      mcq('YatraSeat\'s cold start shows the splash for four seconds. What should be done before the first screen renders?', [
        ['Only what the first screen needs, such as fonts and the cached session', true],
        ['Everything, so that no screen later in the app has to wait for any loading', false],
        ['Analytics and remote config set-up, so that no launch event is missed', false],
        ['A prefetch of every bus photo, so that the results screen is instant', false],
      ], 'Every task before the first frame adds to the time users stare at the splash. Loading everything up front is the cause of the problem, analytics and config can start after the first frame, and prefetching photos spends data and time on a screen the user may never open.'),
      mcq('After a user visits the results screen ten times, the app is slower and uses more memory. The screen starts a setInterval in useEffect. What is the likely fix?', [
        ['Return a clean-up from the effect that calls clearInterval', true],
        ['Wrap the screen component in memo so that it mounts only once', false],
        ['Move the setInterval call from the effect into the render body', false],
        ['Increase the interval so that each timer runs less frequently', false],
      ], 'Without a clean-up every visit leaves another timer running, holding the screen\'s closures in memory. memo does not stop remounts, starting timers in render creates one per render, and a longer interval only slows the leak.'),
    ],
  },

  /* ── ANIMATION ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_TESTING_PERF_ANIMATION',
    notes: `When a YatraSeat user taps "View fare", a summary sheet slides up; they can drag it down to dismiss it. A sheet that
lags behind the finger feels broken, even if every number on it is right. The previous lesson explained the two
threads; this one is about running animation and gesture work on the UI thread, so a busy JavaScript thread cannot
make it stutter.

## Animated versus Reanimated

React Native's built-in Animated API describes an animation in JavaScript. With useNativeDriver: true the animation
is handed to the native side and runs smoothly, but only for non-layout properties such as transform and opacity,
and anything that reacts to a
finger frame by frame still goes back through JavaScript. It is fine for a simple fade.

Reanimated runs small JavaScript functions called worklets on the UI thread. A value that the finger changes, the
animation that follows it and the style that uses it all stay on the UI thread. Version 4 needs the New Architecture
and depends on react-native-worklets; babel-preset-expo adds the worklets Babel plugin when the package is installed.

    npx expo install react-native-reanimated react-native-worklets react-native-gesture-handler

## The core pieces

    const translateY = useSharedValue(0);                       // lives on the UI thread
    const sheetStyle = useAnimatedStyle(() => ({                // a worklet: re-runs when translateY changes
      transform: [{ translateY: translateY.value }],
    }));
    translateY.value = withTiming(320, { duration: 200 });      // animate to 320
    translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    <Animated.View style={[styles.sheet, sheetStyle]} />

A shared value is not React state: changing it does not re-render the component. Read .value inside worklets and
animated styles, not in your render body. interpolate maps one range onto another, for example the sheet's position
onto the backdrop's opacity:

    opacity: interpolate(translateY.value, [0, SHEET_HEIGHT], [0.5, 0], Extrapolation.CLAMP)

## Gestures

Gesture Handler recognises touches on the UI thread. Version 3 adds hook-based gestures; the builder API from version 2
(Gesture.Pan().onUpdate(...)) is what most existing code and tutorials use, and you will read both:

    const pan = usePanGesture({
      activeOffsetY: 10,                                         // only a vertical drag activates
      onUpdate: e => { translateY.value = Math.max(0, e.translationY); },
      onDeactivate: e => {
        if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) close();
        else translateY.value = withSpring(0);
      },
    });
    <GestureDetector gesture={pan}><Animated.View ... /></GestureDetector>

The whole app must be wrapped in GestureHandlerRootView, or gestures are not recognised. activeOffsetY matters: without
it a horizontal swipe through a seat row inside the sheet would grab the sheet. Use velocity as well as distance, so a
quick flick dismisses as users expect.

## Crossing back to JavaScript

Worklets run on another thread, so calling a normal function from one (navigation, setState, analytics) must be
scheduled back onto the JavaScript thread. In Reanimated 4 that is scheduleOnRN from react-native-worklets (older
code uses runOnJS):

    translateY.value = withTiming(SHEET_HEIGHT, { duration: 200 }, finished => {
      if (finished) scheduleOnRN(onClose);
    });

Only do this at the end of an animation or gesture, never on every frame.

## Layout animations and CSS transitions

For lists that change, Reanimated animates mounting, unmounting and moving for you:

    <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOut.duration(150)} layout={LinearTransition}>

Reanimated 4 also accepts CSS-style transitions for simple state changes, such as a seat that changes colour when
selected: style={{ backgroundColor: selected ? '#0B6E4F' : '#FFFFFF', transitionProperty: 'backgroundColor',
transitionDuration: 150 }}. Use them for "this state looks different now", and worklets for anything the finger drives.

## When not to animate

- **Reduced motion.** Some users turn on "Remove animations" (Android) or "Reduce Motion" (iOS) because motion makes
  them unwell. useReducedMotion() reads the setting; layout animations accept .reduceMotion(ReduceMotion.System).
  Respect it: jump to the end state instead.
- **On slow phones and long lists.** Animating every row's entry in a 40-bus list costs frames when the user most
  wants to scroll. Animate the one thing that changed.
- **To hide waiting.** A three-second animation in front of slow data is still three seconds of waiting.
- **Layout properties per frame.** Animating width, height or top re-runs layout every frame; transform and opacity
  do not. Prefer transforms.

Keep animations short (150 to 300 ms for most UI), and test them on a mid-range Android phone with the performance
monitor open: the UI thread should stay near 60 fps while the JS thread is busy.`,
    workedExample: `**Goal.** Test the fare sheet: tapping Close slides it away and then calls onClose; a short drag springs
back; a long drag dismisses. All of it in Jest, with no device.

**First attempt, plain jest-expo.** The suite did not even load:

    TypeError: Cannot read properties of undefined (reading 'loadUnpackersWithCode')

Reanimated 4's native entry points expect the Worklets native module, which does not exist in Node. Mocking
Worklets and Reanimated with their mock files moved the error on rather than fixing it:

    [Reanimated] \`setCSSEventHandler\` is not available in JSReanimated.

**What worked.** Reanimated ships a Jest resolver that loads its web (JavaScript) implementation of the native-only
files, and setUpTests() adds its animation timers and matchers. In a separate Jest config for animation tests:

    // jest.anim.config.js
    module.exports = {
      preset: 'jest-expo',
      resolver: 'react-native-reanimated/jest/resolver',
      setupFiles: ['./node_modules/react-native-gesture-handler/jestSetup.js', './jest.anim.setup.js'],
    };
    // jest.anim.setup.js
    require('react-native-reanimated').setUpTests();
    jest.mock('react-native-worklets', () => ({
      ...jest.requireActual('react-native-worklets'), getUIRuntimeHolder: undefined,
    }));

The last mock is a workaround we needed: without it both tests passed but the suite still failed afterwards with
"[Worklets] getUIRuntimeHolder is not supported on web", raised by Gesture Handler 3 asking for the UI runtime. It
may not be needed with other versions, so check the libraries' testing docs first.

**The tests.** Gesture Handler's jest-utils fire a gesture by its testID (testID: 'fareSheetPan' in the gesture
config), and the sheet's style is read with getAnimatedStyle. With fake timers, real output:

    after 100 ms: translateY 160 onClose calls 0
    after 500 ms: translateY 320 onClose calls 1
    short drag: translateY 0 onClose calls 0
    long drag: translateY 320 onClose calls 1

Halfway through the 200 ms timing the sheet is at 160 of 320, which is what the default ease-in-out curve gives at its
midpoint. onClose fires only after the animation finishes. A 60-point drag sprang back to 0; a 180-point drag (past
the 128-point threshold, 40% of the sheet) dismissed it.

**What this does not prove.** In Jest the worklets run as ordinary JavaScript on one thread. Whether the sheet tracks
the finger at 60 fps on a mid-range phone, and how it feels, needs a device; that part was not run for this lesson.`,
    mcqs: [
      mcq('The fare sheet follows the finger smoothly until a search result arrives, then stutters. Its position is kept in useState and set in onPanResponderMove. What is the fix?', [
        ['Keep the position in a shared value and drive it from a UI-thread gesture', true],
        ['Wrap the sheet component in memo so that it renders less during the drag', false],
        ['Set useNativeDriver: false so that the animation stays in JavaScript', false],
        ['Throttle the setState calls so the position updates every 100 ms only', false],
      ], 'State updates go through the busy JavaScript thread, so the drag waits whenever JS is working; a shared value updated by a Gesture Handler worklet never leaves the UI thread. memo does not stop the sheet\'s own state renders, keeping work in JavaScript is the problem, and throttling makes it visibly jumpy.'),
      mcq('A swipe-down sheet should close on navigation.goBack() when the animation ends. The callback calls goBack directly inside withTiming\'s finished callback and crashes. Why?', [
        ['The callback is a worklet on the UI thread; goBack must be scheduled with scheduleOnRN', true],
        ['withTiming callbacks run before the animation starts, when the screen is not yet ready for it', false],
        ['goBack cannot be called while any animation is running in the whole app', false],
        ['The finished flag is always false in Reanimated 4, so the callback is broken', false],
      ], 'Animation callbacks run on the UI thread, where ordinary JavaScript functions like navigation are not available; scheduleOnRN (runOnJS in older code) sends the call back to the JS thread. The callback runs at the end, navigation is not blocked by animations, and finished is true when the animation completes.'),
      mcq('Inside the fare sheet is a horizontal list of seat types. Swiping it sideways drags the sheet down instead. What should change?', [
        ['Set activeOffsetY on the pan so only a vertical move activates it', true],
        ['Increase DISMISS_DISTANCE so that the sheet needs a longer drag', false],
        ['Move the GestureHandlerRootView inside the sheet component itself', false],
        ['Replace the pan gesture with a tap gesture that closes the sheet', false],
      ], 'activeOffsetY makes the pan wait for real vertical movement before it activates, leaving horizontal swipes to the list. A longer dismiss distance still steals the swipe, the root view belongs at the app root, and a tap removes the drag-to-dismiss behaviour users expect.'),
    ],
    checkpoint: [
      mcq('What is true of a Reanimated shared value such as translateY?', [
        ['Changing .value does not re-render the component that owns it', true],
        ['Reading .value in the render body gives the current animated value', false],
        ['It must be updated with a setter, like the one useState returns', false],
        ['It can only hold numbers, so colours need a separate useState', false],
      ], 'Shared values live on the UI thread and drive animated styles without React renders, which is why they are fast. Reading them in render gives a snapshot that does not update, they are assigned through .value, and they can hold strings, objects and colours too.'),
      mcq('A user has turned on Remove animations in Android settings. How should the YatraSeat sheet behave?', [
        ['Jump straight to the open or closed position without sliding', true],
        ['Play the same slide, since the setting applies only to system UI', false],
        ['Slide twice as slowly so that the motion is gentler for the user', false],
        ['Disable the sheet and show the fare on a separate screen instead', false],
      ], 'The setting asks apps to reduce motion, so useReducedMotion or ReduceMotion.System should skip the movement and show the end state. Ignoring it fails users who chose it, slower motion is still motion, and removing the sheet changes the feature rather than its animation.'),
      mcq('Which animation is cheapest for a phone to run every frame?', [
        ['translateY and opacity on the sheet, which skip layout work', true],
        ['height of the sheet, growing from 0 to 320 points each frame', false],
        ['top of the sheet, moving from the bottom edge to its place', false],
        ['marginBottom of the sheet, changing to push it into view', false],
      ], 'Transforms and opacity are applied after layout, so no measuring is repeated. Height, top and margins are layout properties, so animating them re-runs layout for the sheet and its children on every frame.'),
    ],
  },

  /* ── ACCESSIBILITY ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_TESTING_PERF_ACCESSIBILITY',
    notes: `A blind commuter in Vijayawada books the same overnight bus every week with TalkBack. On YatraSeat's first seat
map she heard "L1, L2, U1" with no idea which seats were booked, which were reserved for women, or which she had
selected, because selection was shown only by colour. India's accessibility rules for digital services and the app
stores' guidelines both expect better, but the stronger reason is that she is a paying customer. You met
accessibilityRole and accessibilityLabel in the React Native basics; this lesson makes a whole screen work.

## How a screen reader sees your app

TalkBack (Android) and VoiceOver (iOS) walk the accessibility tree: each focusable element announces its name, its
role and its state, then perhaps a hint. "Seat L1, lower berth, window, ₹899. Button. Selected. Double tap to remove
from booking." The user swipes right to move to the next element and double-taps to activate. What you give React
Native decides what they hear:

    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Seat L1, lower berth, window, ₹899"
      accessibilityHint="Double tap to add to booking"
      accessibilityState={{ selected: isSelected, disabled: isBooked }}
      onPress={() => onToggle(seat.id)}
    >

- **Label**: what it is, in words, including what the eye gets from colour or icons ("booked", "reserved for
  women"). Do not put the role in the label ("Seat L1 button"); the role is announced separately.
- **Role**: button, link, header, switch, checkbox, image, alert, tab and so on. Headers let users jump between
  sections.
- **State**: selected, disabled, checked, busy, expanded. A colour change alone is invisible to a screen reader.
- **Hint**: only when the result of activating is not obvious from the label.

React Native also accepts the web-style names (role="button", aria-label, aria-selected, aria-disabled); a codebase
should pick one style.

## Grouping, order and announcements

A card with an operator name, time, fare and rating should usually be one focus stop, not four: put accessible on the
outer Pressable and give it a combined label. Decorative icons need no label. Focus order follows the view tree, so
build the tree in reading order. When something changes without the user moving focus (a seat becomes unavailable, a
fare updates), announce it: AccessibilityInfo.announceForAccessibility('Seat L4 is no longer available'), or on Android
accessibilityLiveRegion="polite" on the text that changes. Error messages get role alert. Modals and bottom sheets
need accessibilityViewIsModal (iOS) so the reader does not wander behind them, and a visible Close button, because a
drag gesture is not available to screen-reader users.

## Touch targets

Fingers are bigger than pixels. Android's guidance is at least 48 × 48 dp per target, Apple's 44 × 44 points. A 24 dp
"×" to remove a passenger is a miss waiting to happen, for everyone. Make the visible element bigger or extend its
touchable area with hitSlop={12} (24 + 12 + 12 = 48), and keep targets far enough apart that a thumb hits one.

## Large text and font scaling

Many users, especially older ones, run phones at the largest font size. React Native scales Text with the system
setting by default (allowFontScaling is true). So:

- Never set allowFontScaling={false} on body text. If a tiny badge truly cannot grow, cap it with
  maxFontSizeMultiplier={1.5} rather than switching scaling off.
- Do not give text containers fixed heights; let rows grow, and let long labels wrap rather than truncate the fare.
- Test at the largest system font and display size on a small Android phone. That is where screens break.

## Contrast and colour

Text needs enough contrast against its background (WCAG's 4.5:1 for normal text, 3:1 for large text), which pale
grey on white, popular in designs, often fails. And never use colour as the only signal: the selected seat should
also change its label state, and ladies-only seats need words, not just pink.

## Checking it

**In tests.** Querying by role and name, as in the unit-test lesson, fails when an element is not exposed. Our seat
map test found every seat by its full label, checked selected and disabled states with toBeSelected and toBeDisabled,
and an icon-only "×" without a role or label could not be found ("Unable to find an element with role: button, name:
Remove seat").

**On devices.** Turn on TalkBack (Settings, Accessibility) and complete the booking without looking at the screen.
Android's Accessibility Scanner app suggests fixes for small targets, missing labels and low contrast; on iOS,
VoiceOver and Xcode's Accessibility Inspector do the same job. (Those were not run for this lesson; the steps are
from the Android and Apple documentation.)`,
    workedExample: `**Before.** The original seat button was a coloured square:

    <Pressable onPress={() => onToggle(s.id)} style={[styles.seat, isSelected && styles.selected]}>
      <Text>{s.id}</Text>
    </Pressable>

TalkBack would read "L1" with no role, no state and nothing about booked or ladies-only seats. Nothing about it fails
a normal component test.

**After.** A label function puts the visual information into words, and the state goes in accessibilityState:

    export function seatLabel(s: SeatInfo) {
      const where = s.deck + ' berth' + (s.window ? ', window' : '');
      const status = s.status === 'booked' ? 'booked' : s.status === 'ladies' ? 'reserved for women' : '₹' + s.fare;
      return 'Seat ' + s.id + ', ' + where + ', ' + status;
    }
    <Pressable accessibilityRole="button" accessibilityLabel={seatLabel(s)}
      accessibilityState={{ selected: isSelected, disabled }} disabled={disabled} ... >

**The test, written the way the user experiences it:**

    const l1 = screen.getByRole('button', { name: 'Seat L1, lower berth, window, ₹899' });
    expect(l1).not.toBeSelected();
    fireEvent.press(l1);
    expect(screen.getByRole('button', { name: /Seat L1/, selected: true })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /Seat L2/ })).toBeDisabled();

Real output of the labels the test found:

    buttons: Seat L1, lower berth, window, ₹899 | Seat L2, lower berth, booked | Seat U1, upper berth, window, reserved for women

**Touch targets in the same file.** A small helper flattened each button's style and added hitSlop: the seat gave
{ w: 48, h: 48 } from minWidth and minHeight, and the 24 dp remove icon gave { w: 48, h: 48 } only because of
hitSlop={12}; without it the icon is 24 × 24, half the guideline. This catches regressions in code review; it does
not replace trying the screen with a thumb.

**Still to do on a phone.** Complete a booking with TalkBack on, then at the largest font size: the seat labels must
still fit, and the Pay button must still be reachable without scrolling sideways.`,
    mcqs: [
      mcq('On the YatraSeat seat map, selected seats turn green and nothing else changes. What does a TalkBack user hear?', [
        ['The same announcement for selected and unselected seats', true],
        ['"Green" read out before the label of each selected seat', false],
        ['"Selected", since TalkBack detects the change in colour', false],
        ['Nothing, since TalkBack skips a view whose colour changed', false],
      ], 'Screen readers announce label, role and state, not colours, so without accessibilityState={{ selected }} the two seats sound identical. TalkBack does not read colours, does not infer state from them, and does not skip recoloured views.'),
      mcq('The "×" to remove a passenger is a 24 × 24 dp icon, and users keep missing it. Which fix meets Android\'s guidance without changing the design?', [
        ['hitSlop={12} on the Pressable, making the touch area 48 × 48 dp', true],
        ['A larger font on the "×" glyph so the icon looks easier to hit', false],
        ['An accessibilityHint telling users to tap the icon more carefully', false],
        ['A long-press handler as a second way to remove each passenger', false],
      ], 'hitSlop extends the touchable area 12 dp on every side, so 24 + 24 gives the recommended 48 dp while the icon looks the same. A bigger glyph changes the design and may not grow the target, a hint does not help a thumb, and long-press is harder to discover.'),
      mcq('A designer asks for allowFontScaling={false} on all text so layouts never break. What should you say?', [
        ['No: let text scale, let containers grow, and cap only tiny badges', true],
        ['Yes, as long as the base font size is at least 16 for all text', false],
        ['Yes, because users who need larger text can use a screen magnifier', false],
        ['No, because Android ignores the prop and scales all text anyway', false],
      ], 'Turning scaling off removes the setting many users rely on to read at all; the fix is layouts that grow, with maxFontSizeMultiplier for the rare element that cannot. A 16 point base is still too small for some users, magnifiers are a poor substitute, and Android does respect the prop.'),
    ],
    checkpoint: [
      mcq('What is wrong with accessibilityLabel="Book seat button" on a Pressable that has accessibilityRole="button"?', [
        ['The role is announced already, so the user hears "button" twice', true],
        ['Labels cannot contain spaces, so TalkBack reads only the first word', false],
        ['A label replaces the role, so the element is not announced as a button', false],
        ['Labels are only read on iOS; Android reads the child text instead', false],
      ], 'The role is announced separately, so putting it in the label repeats it. Labels can be any text, they do not remove the role, and both TalkBack and VoiceOver read accessibilityLabel.'),
      mcq('A bus card shows operator, time, fare and rating as four Text elements. How should it be exposed to a screen reader?', [
        ['As one focusable element with a combined label for the whole card', true],
        ['As four separate stops, so the user can hear each detail separately', false],
        ['Hidden from the reader, with a Details button that opens it instead', false],
        ['With a testID on each Text so the screen reader can tell them apart', false],
      ], 'One stop with "Orange Travels, 21:30, ₹899, rated 4.2" lets the user move through buses quickly. Four stops per card makes a 40-bus list tiring, hiding content excludes users, and testIDs are for tests, not screen readers.'),
      mcq('While the user is on the seat map, seat L4 is booked by someone else. How should a screen-reader user find out?', [
        ['Announce it with announceForAccessibility or a polite live region', true],
        ['Move the screen-reader focus to L4 without telling the user why', false],
        ['Only change the seat\'s colour, as sighted users see it that way', false],
        ['Reload the whole screen so that the reader starts again at the top', false],
      ], 'Changes that happen without the user moving focus must be announced, or the user taps a seat that is gone. Moving focus silently is disorienting, colour alone is invisible, and reloading loses their place and any seats already chosen.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_TESTING_PERF_DEBUGGING',
    notes: `Six faults from YatraSeat's test suite and screens. Each has the symptom, the cause and the fix. The error
messages and numbers are real output from the Jest runs behind this topic (jest-expo, Testing Library 13.3,
Reanimated 4.7.1, Gesture Handler 3.3). The rule that ties them together: read the whole failure, including the tree
Testing Library prints, before you change any code.

## 1. A test that passes on your laptop and fails in CI

**Symptom.** "Unable to find an element with text: /Orange Travels/", about one CI run in five. The printed tree ends
with <ActivityIndicator accessibilityLabel="Loading buses" />.

**Cause.** The test pressed Search and then used getByText at once. The answer arrives asynchronously; with an
instant mock it happened to land in time. Against a mock that answers after 30 ms the same test failed every time,
while the 0 ms version passed.

**Fix.** await screen.findByText(/Orange Travels/). No sleeps, no automatic retries.

## 2. A failure that appears after the last line of the test

**Symptom.** "TypeError: Cannot read properties of undefined (reading 'ok') at suggestCities (src/yatra/api.ts:14:12)"
in a test about the Search button, which never touches city suggestions. In another run the same file reported
"Exceeded timeout of 5000 ms for a test" instead.

**Cause.** beforeEach reset the fetch mock without a default answer. Typing in From started the 300 ms debounced city
lookup; it fired after the assertions, and the mocked fetch returned undefined.

**Fix.** Give the mock a default (fetchMock.mockImplementation(() => json([]))) so every request a screen makes gets
an answer, or use fake timers and advance them deliberately. Work a component starts outlives your last expect.

## 3. Reanimated will not load in Jest

**Symptom.** The animation test file fails before any test runs: "TypeError: Cannot read properties of undefined
(reading 'loadUnpackersWithCode')". Mocking Worklets and Reanimated with their mock files changed it to "[Reanimated]
setCSSEventHandler is not available in JSReanimated."

**Cause.** Reanimated 4 and Worklets load native-only files that expect a native module, which Node does not have.

**Fix.** Use the resolver Reanimated ships (resolver: 'react-native-reanimated/jest/resolver'), call
require('react-native-reanimated').setUpTests() in a setup file, and load Gesture Handler's jestSetup.js. With these
versions we also had to stub Worklets' getUIRuntimeHolder, or the suite failed after both tests passed with
"[Worklets] getUIRuntimeHolder is not supported on web". Keep this in a separate Jest config for animation tests, and
re-check the libraries' testing pages when you upgrade.

## 4. Gestures that do nothing

**Symptom.** "GestureDetector must be used as a descendant of GestureHandlerRootView. Otherwise the gestures will not
be recognized." In the app, the same mistake shows up as a sheet that ignores drags.

**Cause.** The component was rendered without the root view that Gesture Handler needs.

**Fix.** Wrap the app root (and the component under test) in GestureHandlerRootView with style={{ flex: 1 }} in the
app. Expo Router and React Navigation templates often do this already; check before adding a second one.

## 5. memo that does not help

**Symptom.** After wrapping bus rows in memo, a countdown tick still re-rendered all 10 visible rows; the Profiler
counts were 10, 10, 10 for tick, select and reselect.

**Cause.** renderItem passed onSelect={id => setSelectedId(id)}, a new function each render. A second variant with a
stable handler but style={{ marginTop: 8 }} written inline also gave 10, 10, 10: a new object each time.

**Fix.** useCallback for the handler and StyleSheet styles (or a constant) for the style: tick 0, select 1, reselect
2. Then confirm on a phone that the frame rate actually improved.

## 6. A button the test cannot find

**Symptom.** "Unable to find an element with role: button, name: Remove seat", though the "×" is plainly on screen.

**Cause.** The icon was a Pressable with only a "×" Text: no role and no label. The test failed for the same reason
TalkBack has nothing useful to announce.

**Fix.** accessibilityRole="button" and accessibilityLabel="Remove seat", plus hitSlop={12} so the 24 dp icon has a
48 dp touch area. Do not switch the test to getByText('×'): the query was right, and the screen was wrong.

## A routine for test and performance bugs

Reproduce it deterministically first (fix the latency, fake the timers, pin the data). Read the printed tree or the
counts. Change one thing, re-run, and keep the test that would have caught it.`,
    mcqs: [
      mcq('A test about the Search button fails with "Cannot read properties of undefined (reading \'ok\')" inside suggestCities, which it never tests. What is the cause?', [
        ['A debounced request fired after the assertions and the fetch mock had no default', true],
        ['suggestCities has a bug that only shows when the From box has a value in it', false],
        ['Jest runs test files in parallel and another file replaced globalThis.fetch with its own', false],
        ['Testing Library cleaned up the screen before the button press was finished', false],
      ], 'The screen started a timer while typing, the timer called fetch after the test body, and the reset mock returned undefined. The function is correct when fetch answers, Jest isolates globals per test file, and cleanup runs after the test, not during the press.'),
      mcq('Rows are wrapped in memo and receive onSelect from useCallback, but every tick still re-renders all ten. What else could be new on each render?', [
        ['An inline style object such as style={{ marginTop: 8 }}', true],
        ['The key returned by keyExtractor for each of the buses', false],
        ['The useState setter that the onSelect callback wraps', false],
        ['The bus object, since FlatList clones each data item', false],
      ], 'An inline object is a new reference each render, so memo sees a changed prop; in our run it gave 10 row renders per tick. Keys are strings compared by value, state setters are stable, and FlatList passes the same item objects from data.'),
      mcq('A test fails with "Unable to find an element with role: button, name: Remove seat". What is the right response?', [
        ['Add a button role and label to the icon, since the screen is wrong', true],
        ['Change the query to getByText(\'×\'), which finds it straight away', false],
        ['Add testID="remove-seat" and query by test id in the test instead', false],
        ['Delete the test, since the icon is visibly there on the screen anyway', false],
      ], 'The role query failed because the element is not exposed as a button with a name, which is also what a screen reader needs. Changing the query or adding a testID makes the test pass while the screen stays inaccessible, and deleting it throws the signal away.'),
      mcq('The animation test suite fails before any test with "reading \'loadUnpackersWithCode\'". Which change addresses the cause?', [
        ['Use Reanimated\'s Jest resolver and call setUpTests() in a setup file', true],
        ['Install Reanimated again, since the error means a corrupt package', false],
        ['Run the animation tests on an emulator with the tests in Detox', false],
        ['Mock every Reanimated hook by hand with jest.fn() in each file', false],
      ], 'The error comes from native-only files that need a native module; the shipped resolver loads Reanimated\'s JavaScript implementation instead, and setUpTests adds timers and matchers. The package is fine, Detox is a different kind of test, and hand mocks test nothing about the animation.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_TESTING_PERF_PRACTICE',
    notes: `Eight exercises, easy to harder, on YatraSeat. Write your answer before reading ours. Answers with output were
run under jest-expo; the Maestro answer is written from its documentation.

## 1. Which level of test? (easy)

Say logic test, component test or E2E for each: (a) the FIRST50 promo is capped at ₹50; (b) the Search button stays
disabled until two different cities are entered; (c) the release APK opens the booking from a deep link in an SMS;
(d) a 503 shows "Could not load buses" with Try again; (e) the app launches on Android after adding a native maps
library.

**Answer.** (a) logic; (b) component; (c) E2E; (d) component, with fetch stubbed to return 503; (e) E2E, or at least a
smoke run of a release build, because only a real build loads native code.

## 2. Pick the query (easy)

Write the best query for: the From input; the Pay button; the operator name "Morning Star" in a card; the animated
fare sheet, which has no text of its own.

**Answer.** getByLabelText('From'); getByRole('button', { name: /Pay/ }); getByText(/Morning Star/);
getByTestId('fareSheet'). The test id is the last resort, used only because the sheet itself has no role or text.

## 3. Add a row to the fare table (easy)

The rule allows up to six seats. Add the boundary case to the test.each table for six seats at ₹500 each, no promo.

**Answer.** ['exactly six seats', Array.from({ length: 6 }, (_, i) => seat('S' + i, 50000)), null, 300000 + 15000].
Base 3,00,000 paise, GST 5% is 15,000, total 3,15,000 paise (₹3,150). It passed; with the seven-seat test beside it,
both sides of the boundary are now covered.

## 4. Error then recovery (medium)

Write the fetch stub for a test where the first search returns 503 and the second returns two buses, while city
suggestions always return an empty list.

**Answer.**

    let busCalls = 0;
    fetchMock.mockImplementation((url: string) => {
      if (!url.includes('/buses')) return json([]);
      busCalls++;
      return busCalls === 1 ? json({ message: 'down' }, 503) : json(BUSES);
    });

Then findByRole('alert') has text "Could not load buses", press Try again, and findByText(/Morning Star/) appears
while queryByRole('alert') is gone. This test passed.

## 5. A Maestro flow for cancelling (medium)

Write a flow: log in (reuse login.yaml), open My Trips, open the booking for 14 November, cancel it, and check that
"Cancelled" appears.

**Answer** (from the Maestro docs; not run here):

    appId: in.yatraseat.app
    ---
    - launchApp:
        clearState: true
    - runFlow: login.yaml
    - tapOn: "My Trips"
    - tapOn: ".*14 Nov.*"
    - tapOn:
        id: "cancel-booking"
    - tapOn: "Yes, cancel"
    - extendedWaitUntil:
        visible: "Cancelled"
        timeout: 15000

The booking must exist first: seed it on staging before the run, or book it in an earlier flow.

## 6. Predict the render counts (medium)

Rows are memo, onSelect comes from useCallback, but each row also gets style={{ marginTop: 8 }} written inline. With
10 rows mounted, how many rows render on a countdown tick, on the first selection and on the second?

**Answer.** 10, 10, 10, the same as no memo at all, because the inline object is new each render. That is the real
output. Move the style into StyleSheet.create and it drops to 0, 1, 2.

## 7. Drag thresholds (medium)

The sheet is 320 points tall, dismisses past 40% of its height or above 1000 points per second. For each release, say
dismiss or spring back: (a) 100 points at 1200/s; (b) 130 points at 0/s; (c) 120 points at 900/s; (d) 128 points at 0/s.

**Answer.** The distance threshold is 128. (a) dismiss, on velocity; (b) dismiss, on distance; (c) spring back, both
under; (d) spring back: the code uses "greater than", so exactly 128 does not dismiss. Test the boundary, since that is
where a ">" versus ">=" bug lives.

## 8. Thumbnails and targets (harder)

(a) The CDN serves bus photos at 160 × 120 instead of 4000 × 3000. How much decoded memory does each photo use now?
(b) The seat icon is 32 × 32 dp. What hitSlop reaches 48 dp? (c) Write the accessibility label for a sleeper seat U3,
upper deck, not by a window, reserved for women.

**Answer.** (a) 160 × 120 × 4 = 76,800 bytes, about 75 KB, against about 48 MB for the original. (b) 8 on each side:
32 + 8 + 8 = 48. (c) "Seat U3, upper berth, reserved for women", which is exactly what seatLabel returns for that seat;
the role and the selected state are announced separately.

## Self-check

Exercises 1 to 4 are the daily work of component testing. If 6 surprised you, re-read the Performance lesson's
measurements. If 7 and 8 were slow, re-read the Animation and Accessibility lessons.`,
    mcqs: [
      mcq('In exercise 1, why is "the app launches after adding a native maps library" an E2E check rather than a component test?', [
        ['Only a real build loads the native code that the new library adds', true],
        ['Component tests cannot render any screen that contains a map view', false],
        ['Launching is too slow for Jest, which times out after five seconds', false],
        ['Native libraries may only be tested with Detox, not with Maestro', false],
      ], 'Jest replaces native modules with mocks, so a missing or misconfigured native library is invisible to it. A map can be rendered with a mock, the problem is not speed, and both Maestro and Detox can check a launch.'),
      mcq('In exercise 7, a user releases the sheet after exactly 128 points at zero velocity. What happens, and why does it matter?', [
        ['It springs back, since the check is strictly greater than 128', true],
        ['It dismisses, since 128 is 40% of the sheet\'s 320-point height', false],
        ['It stays where it was released, as neither branch of code runs', false],
        ['It dismisses, since a zero velocity counts as a deliberate flick', false],
      ], 'translationY > DISMISS_DISTANCE is false at exactly 128, so the spring runs; boundaries are where > and >= bugs hide, so test them. Reaching 40% is not exceeding it, one branch always runs, and zero velocity is the opposite of a flick.'),
      mcq('In exercise 4, why does the stub answer the city-suggestion URL with an empty list instead of ignoring it?', [
        ['The screen fetches suggestions while typing, and an unanswered call breaks the test', true],
        ['Testing Library fails any test where a fetch call returns an empty array', false],
        ['The 503 response would otherwise be sent to the suggestion request', false],
        ['Jest needs every mocked function to be called at least once per test', false],
      ], 'Typing in From starts a suggestion request; without an answer it throws after the test, as debugging case 2 showed. Empty arrays are fine, the bus counter only counts /buses calls, and Jest does not require mocks to be called.'),
      mcq('In exercise 8, the CDN thumbnail is 160 × 120. Roughly how much memory does one decoded thumbnail take?', [
        ['About 75 KB, which is 160 × 120 pixels at 4 bytes each', true],
        ['About 19 KB, which is 160 × 120 pixels at 1 byte each', false],
        ['About 48 MB, since phones decode at the original size', false],
        ['About 300 KB, which is 160 × 120 pixels at 16 bytes each', false],
      ], 'A decoded bitmap is usually 4 bytes per pixel (red, green, blue, alpha), so 76,800 bytes. One byte per pixel is greyscale, the phone decodes the file it receives, which is now small, and 16 bytes per pixel is not a normal format.'),
      mcq('In exercise 2, why is getByTestId acceptable for the fare sheet but not for the Pay button?', [
        ['The sheet has no role or text, while the button has both', true],
        ['Test ids are faster to query on animated views than on buttons', false],
        ['Buttons ignore the testID prop on Android, so it never matches', false],
        ['The sheet is inside a GestureDetector, which hides its children', false],
      ], 'Prefer what the user perceives, and fall back to a test id only when there is nothing else; the Pay button has a role and a name, so query those. Speed is not the reason, testID works on buttons, and GestureDetector does not hide children from queries.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_TESTING_PERF_INTERVIEW_QUESTION',
    notes: `Four questions React Native interviews ask about testing, performance, animation and accessibility, with an
answer that scores well and the follow-up a good interviewer asks next. Say each aloud in about two minutes, and swap
YatraSeat for an app you built: interviewers listen for a measurement you took and a decision you made.

## Q1. "How do you test a React Native screen that loads data from an API?"

**Model answer.** "With Jest and React Native Testing Library, under the jest-expo preset. I render the screen, act
like the user with userEvent (type the cities, press Search) and assert what the user sees, querying by role and
label rather than test ids. I stub the network at fetch, or with MSW, so my API layer is still exercised: I check the
loading state, the results with findBy because they arrive asynchronously, the empty state, and a 503 followed by a
successful retry. Native modules like analytics are replaced with jest.mock. Timers such as a search debounce use fake
timers. A few critical journeys, like login and booking, I cover end to end with Maestro on an emulator."

**Follow-up: "One of those tests is flaky in CI. What do you do?"** "Reproduce it deterministically first. In my
case a test used getByText right after a press; with a mock that answered after 30 ms it failed every time, so the
fix was findByText. I don't add sleeps or automatic retries, because they hide real races. If I can't fix it the same
day I quarantine it with an issue rather than let the team learn to ignore red builds."

## Q2. "Our product list is janky on Android. How would you find out why?"

**Model answer.** "First I'd reproduce it on a release build on a mid-range Android phone, because development mode
is much slower. The performance monitor tells me whether it is the JS thread or the UI thread dropping frames. If it is
JS, I record with the React Profiler in React Native DevTools to see which components re-render on each commit. Common
causes: rows re-rendering because a parent state changes, memo defeated by inline functions or style objects,
expensive formatting in render, and full-size images. In one screen I measured every visible row re-rendering on a
countdown tick, and after making the handler stable with useCallback a tick rendered zero rows. If rows are still heavy
I'd try FlashList, and resize images through the CDN with expo-image caching."

**Follow-up: "Should we just wrap everything in memo and useCallback?"** "No. memo only helps when every prop is
stable, and it adds comparisons and memory. I add it where the Profiler shows wasted renders on hot paths, like list
rows. If the project uses the React Compiler, much of that memoisation is automatic, but I still measure: in my test
the compiler stopped re-renders on a timer tick but not on selection, because renderItem read the selected id."

## Q3. "How does Reanimated keep animations smooth when the JS thread is busy?"

**Model answer.** "Reanimated runs worklets, small functions, on the UI thread. Shared values hold the animated state
there, and useAnimatedStyle maps them to styles without going through React renders. Gesture Handler recognises the
drag on the UI thread too, so a bottom sheet follows the finger even if JavaScript is busy parsing a big response.
Only at the end, say when the sheet closes, do I schedule a call back to JS with scheduleOnRN to update state or
navigate. I animate transform and opacity rather than layout properties, and respect the reduced-motion setting."

**Follow-up: "When would you use the built-in Animated API instead?"** "For a simple fade or slide that does not follow
a gesture, Animated with useNativeDriver is fine and has no extra dependency. Once it reacts to a finger frame by
frame, or I need layout animations, I use Reanimated."

## Q4. "How do you make a mobile app accessible?"

**Model answer.** "Every interactive element gets a role, a label that includes what colour or icons convey, and its
state, such as selected or disabled. Related text, like a product card, is grouped into one focus stop. Touch targets
are at least 48 dp on Android, using hitSlop for small icons. Text scales with the system font setting and layouts grow
instead of clipping. Changes the user did not trigger are announced. I check it in tests by querying by role and name,
which fails when an element is not exposed, and on a phone by completing the main flow with TalkBack on and at the
largest font size."

**Follow-up: "Give me a bug you found that way."** "Our seat map showed selection only by colour, so TalkBack read the
same thing for every seat. We added accessibilityState selected, labels like 'Seat L1, lower berth, window, ₹899', and
'booked' and 'reserved for women' in words. The role queries in our tests now cover it."

## How these are scored

Interviewers want a method (measure, then change), a specific tool used for a reason, and evidence from your own
work. "I'd use memo everywhere" or "I'd add testIDs to everything" are weak answers even though they are not wrong.`,
    mcqs: [
      mcq('In Q1, an interviewer asks why you query by role and label instead of testID. Which answer is strongest?', [
        ['It tests the screen as users and screen readers find it, catching a11y gaps', true],
        ['Role queries run much faster than test id queries in a large component tree', false],
        ['testID is removed from release builds, so tests that use it cannot run', false],
        ['Testing Library 13 has stopped supporting getByTestId in new projects', false],
      ], 'Role and name queries mirror how people and TalkBack find elements, so a passing test also means the element is exposed properly. Speed is not the reason, testID is not stripped in a way that affects Jest, and getByTestId is still supported as a last resort.'),
      mcq('In Q2\'s follow-up, which answer about adding memo and useCallback everywhere shows the most judgement?', [
        ['Add them where the Profiler shows wasted renders on hot paths, then re-measure', true],
        ['Add them to every component, since memoisation never makes an app slower', false],
        ['Never add them, because the React Compiler always removes the need for them', false],
        ['Add them only to screens, since rows are too small to benefit from memo', false],
      ], 'Memoisation costs comparisons and memory and only pays off with stable props on hot paths, so measure first. It can make things slower, the compiler helps but our test showed a case it did not fix, and list rows are exactly where memo pays off most.'),
      mcq('In Q3, what is the key reason a Reanimated sheet keeps following the finger while JS parses a large response?', [
        ['The gesture and animated style run as worklets on the UI thread', true],
        ['Reanimated pauses the JS thread while any gesture is in progress', false],
        ['The sheet re-renders at a higher priority than other React updates', false],
        ['Shared values are copied to the GPU, which draws them on its own', false],
      ], 'Worklets for the gesture and the style mean no frame waits for JavaScript. Reanimated does not pause JS, the sheet does not re-render at all while dragging, and shared values live on the UI thread, not the GPU.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_TESTING_PERF_CHECKPOINT',
    notes: `Ten questions across the topic: unit and component tests with Jest and Testing Library, end-to-end flows,
re-renders and lists, images and startup, Reanimated and gestures, and accessibility. Answer without notes; the
result shows which lesson to revisit.`,
    checkpoint: [
      ck('AUTOMATED_TESTING', 'A component test must check that the "Loading buses" spinner disappears once results arrive. Which pair of calls does it?', [
        ['await findByText for a result, then queryByLabelText for the spinner', true],
        ['getByText for a result, then getByLabelText for the spinner', false],
        ['await findByLabelText for the spinner, then getByText for the first result', false],
        ['queryByText for a result, then findByLabelText for the spinner', false],
      ], 'Wait for the result with findBy, then assert absence with queryBy, which returns null instead of throwing. getBy for the result races the request, findBy on the spinner waits for it to appear rather than vanish, and queryBy for the result checks too early.'),
      ck('AUTOMATED_TESTING', 'Which belongs in an E2E suite rather than in Jest?', [
        ['Opening a booking from a deep link in the installed release app', true],
        ['Rounding GST on a fare with the FIRST50 promo code applied', false],
        ['The "No buses on this route" message for an empty result', false],
        ['Disabling Search when From and To are the same city name', false],
      ], 'Deep links into an installed release build involve the OS and native configuration, which only a real app shows. Fare rounding, the empty state and the button rule are all faster and more exact as logic or component tests.'),
      ck('AUTOMATED_TESTING', 'A Jest test of a 300 ms debounced search uses real timers and fails on slow CI runs. What makes it deterministic?', [
        ['Fake timers, with userEvent told to advance them, then advance by 300', true],
        ['A longer Jest timeout, so the test has time for the debounce to fire', false],
        ['A sleep of one second after typing, before the expect on the request', false],
        ['Mocking setTimeout to call its callback synchronously every time', false],
      ], 'Fake timers make time move only when the test says so, which is exact and instant. A longer timeout or a sleep makes it slower and still timing-dependent, and an immediate setTimeout removes the debounce the test is meant to verify.'),
      mcq('Selecting one bus re-renders all ten visible rows. Rows are memo and onSelect is stable. Which prop is most likely the culprit?', [
        ['style={{ marginTop: 8 }}, written inline in renderItem', true],
        ['selected, which only changes for the one row that was tapped', false],
        ['bus, which is the same item object taken from data each time', false],
        ['key, which keyExtractor builds from the bus id for each row', false],
      ], 'An inline object is new on every render, so memo sees a change in every row; in our run that kept counts at 10. selected changes only for affected rows, bus objects are the same references, and keys are not props the row compares.'),
      mcq('YatraSeat\'s bus list scrolls but shows blank rows for a moment while a big fare response is processed. Which thread is the bottleneck?', [
        ['The JS thread, which renders rows and is busy processing the response', true],
        ['The UI thread, which has stopped drawing native views for the list', false],
        ['The network thread, which blocks rendering until the request ends', false],
        ['The GPU, which cannot composite the rows while images are decoding', false],
      ], 'Native scrolling continues on the UI thread, but new rows are rendered by JavaScript, which is busy, so they appear late. The UI thread is still scrolling, networking does not block rendering, and the GPU is not what fills rows.'),
      mcq('In a FlashList of buses mixed with ad banners, scrolling feels jerky as ads appear. Which FlashList prop is meant for this?', [
        ['getItemType, so ad and bus rows are recycled separately', true],
        ['initialNumToRender, raised so more rows render at first', false],
        ['removeClippedSubviews, set to false so rows stay mounted', false],
        ['inverted, so the newest items render first from the end', false],
      ], 'Recycling a bus card into an ad means rebuilding it; getItemType keeps a separate pool per type. initialNumToRender is a FlatList knob for the first render, keeping clipped views mounted costs memory, and inverted changes direction, not recycling.'),
      mcq('A drag-to-dismiss sheet must call setState when it closes. Where and how should that call happen?', [
        ['In the animation\'s finished callback, through scheduleOnRN', true],
        ['In onUpdate on every frame, so that React state stays in sync', false],
        ['Directly in the worklet, since Reanimated 4 can call any function', false],
        ['In a useEffect that polls the shared value every 100 ms or so', false],
      ], 'Crossing to the JS thread once, at the end, keeps the drag on the UI thread. Calling it every frame drags JS back into the gesture, worklets cannot call ordinary JS functions directly, and polling wastes battery and lags.'),
      mcq('Why should a sheet animate translateY rather than height?', [
        ['Transforms skip layout; animating height re-runs layout every frame', true],
        ['Height cannot be animated by Reanimated on Android at all', false],
        ['translateY animations are not affected by reduced motion settings', false],
        ['Height animations always need the old Animated API with the native driver', false],
      ], 'A transform moves the already laid-out view, while height changes force layout of the sheet and its children each frame. Reanimated can animate height, reduced motion applies to both, and the native driver cannot animate layout properties at all.'),
      ck('WEB_ACCESSIBILITY', 'Which seat button gives a TalkBack user everything a sighted user sees?', [
        ['Role button, label "Seat U1, upper berth, reserved for women", state set', true],
        ['Role button, label "U1", and a pink background for women-only seats', false],
        ['No role, label "Seat U1 button, pink", and a hint to double tap it', false],
        ['Role image, label "Seat U1", and state disabled for booked seats', false],
      ], 'The label puts what colour conveys into words, the role says it can be activated, and the state says selected or disabled. "U1" plus colour hides the meaning, putting role and colour in the label is noise, and an image role tells the user it cannot be pressed.'),
      ck('WEB_ACCESSIBILITY', 'A bottom sheet can only be closed by dragging it down. What does a screen-reader user need?', [
        ['A visible Close button with a role and label inside the sheet', true],
        ['A hint on the sheet asking the user to swipe down with one finger', false],
        ['A larger drag area, so the swipe is easier to start on the sheet', false],
        ['Nothing, since TalkBack users can perform the same drag gesture', false],
      ], 'Screen readers take over swipes for navigation, so a drag-only control is unreachable; a labelled button works for everyone. A hint describes a gesture they cannot easily make, a bigger area does not change that, and TalkBack gestures are not passed to the app as drags.'),
    ],
  },
];
