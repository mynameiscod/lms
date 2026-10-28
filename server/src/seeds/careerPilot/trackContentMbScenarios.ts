/**
 * Career-track placement content: Mobile Scenario Rounds (MB_SCENARIO_ROUNDS), Mobile, batch MB4.
 *
 * The rounds of a React Native loop that are not question-and-answer: build a screen from a spec under the clock, debug
 * a broken app, the take-home, live coding in TypeScript, then a timed scenario set. Each round unit walks one full
 * example — what the interviewer is testing, what you do and say in what order, how it is scored and how candidates
 * fail — and refers back to the track's lists, server-state, API-layer, testing and performance lessons by title rather
 * than re-teaching them.
 *
 * Verified on a Windows laptop with Expo SDK 58, React Native 0.88, React 19.3, TypeScript 6, jest-expo with Jest 30,
 * @testing-library/react-native 13.3, TanStack Query 5.105 and zod 4.6 — in Jest, not on a phone. TokriNow's search
 * screen and its five tests were run, including a race test that first passed against a buggy version; DabbaTrack's six
 * planted bugs were each reproduced by a failing test and fixed; the ShelfIndia take-home (typed client, query hooks, two
 * screens, seven tests) was run; the live-coding solutions were run against first attempts whose real failures are
 * quoted. Nothing here ran on an Android or iOS device, an emulator or EAS: device-only behaviour is from the React Native
 * and Expo documentation and is labelled so. Companies, people and data are fictional.
 *
 * Default skill REACT_NATIVE; DEBUG_ROUND measures DEBUGGING and LIVE_CODING_ROUND TYPESCRIPT; in the checkpoint, ck()
 * names those skills.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_MB_SCENARIO_ROUNDS_BUNDLES: PilotBundle[] = [
  /* ── BUILD_SCREEN_ROUND ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_SCENARIO_ROUNDS_BUILD_SCREEN_ROUND',
    notes: `Product companies and funded start-ups hiring React Native developers in Bengaluru, Gurugram and Pune often replace a
whiteboard round with this one: a short spec, 45 minutes, your laptop or an Expo Snack, screen shared. **The interviewer
is testing whether you ship a screen that handles every state a real user meets — loading, error, empty, slow network —
and whether you can say why you built it that way.** A pretty list that only works on fast Wi-Fi scores below a plain
one with all four states and a retry.

Everything you need is from *Lists: FlatList, SectionList and Performance*, *Server Data with TanStack Query*, *Typing
API Data and Runtime Validation* and *Unit and Component Tests with Jest and Testing Library*. This round is using them
under a clock, aloud.

## The spec: TokriNow product search

| Part | Requirement |
|---|---|
| Search box | Label "Search products"; a request 300 ms after typing stops, not on every key |
| API | GET /products?q=<text> returns [{ id, name, pack, pricePaise, inStock }] |
| Loading | A spinner and "Loading products…" |
| Row | Name; pack and price in rupees (26500 paise shows ₹265); "Out of stock" when inStock is false |
| Empty | "No results for “paneer”" — the query named |
| Error | "Could not load products." and a Try again button that refetches |
| Slow network | An older, slower response must never overwrite a newer one |

## The 45 minutes

| Minutes | What you do and say |
|---|---|
| 0–5 | Read the spec aloud; ask what is unclear (page size? offline?); write the state list: loading, error, empty, success |
| 5–25 | Data first: the fetch, the state type, cancellation. Then the list, then the rows |
| 25–35 | The other states, then a test or two if the setup allows it |
| 35–45 | Walk through it; say what you would do with another hour |

## The solution, as built

State is one discriminated union, so "loading and error at once" cannot be written:

    type State = { status: 'loading' } | { status: 'error' } | { status: 'success'; items: Product[] };

    export function useProducts(query: string) {
      const [state, setState] = useState<State>({ status: 'loading' });
      const [attempt, setAttempt] = useState(0);
      useEffect(() => {
        const ctrl = new AbortController();
        setState({ status: 'loading' });
        fetch(\`\${API}/products?q=\${encodeURIComponent(query)}\`, { signal: ctrl.signal })
          .then(res => { if (!res.ok) throw new Error(\`HTTP \${res.status}\`); return res.json() as Promise<Product[]>; })
          .then(items => setState({ status: 'success', items }))
          .catch(() => { if (!ctrl.signal.aborted) setState({ status: 'error' }); });
        return () => ctrl.abort();          // a newer query cancels the older request
      }, [query, attempt]);
      const retry = useCallback(() => setAttempt(a => a + 1), []);
      return { state, retry };
    }

The query comes through a useDebounced(text.trim(), 300) hook (a setTimeout cleared in the effect's cleanup); the list is
a FlatList with keyExtractor={p => p.id}, a React.memo row and ListEmptyComponent naming the query.

**Choices said aloud.** "In the real app this is useQuery with the query in the key — it gives me cancellation, caching
and retry. In 45 minutes I show you I know what it does for me. Prices stay integer paise until display, so ₹169.50 is
never 169.49999. The row is memoised because this list re-renders on every keystroke. Try again is a real button,
48 dp high, because thumbs on a moving bus miss small targets."

## The tests, and the real run

Five tests with a fake fetch that answers after a delay and honours the abort signal, under Jest fake timers: the loading
text then rows with ₹265, ₹169.50 and one "Out of stock"; typing d, da, dal 100 ms apart makes one request ('dal'), not
three; "paneer" shows the named empty state; a 503 then Try again recovers; and the race.

    PASS __tests__/mb_scenarios/build/productSearch.test.tsx
    Tests:       5 passed, 5 total

The race test has a story worth telling. It was run against a copy of the screen with the abort removed — and it
passed. The late "toor" response resolved in a promise after act() had returned, so the assertion ran before React
rendered it. Changing the last advance to await act(async () => { jest.advanceTimersByTime(3000); }) let the promise
settle, and the buggy copy then failed as it should:

    ● a slow older response cannot overwrite a newer one
      expect(received).toBeNull()
      > 86 |   expect(screen.queryByText('Toor Dal')).toBeNull();
    Tests:       1 failed, 4 passed, 5 total

The fixed screen passes the stronger test. **A test you have never seen fail proves nothing** — break the code on
purpose once.

## How it is scored

| Area | Weight | Full marks when |
|---|---|---|
| Works | 30% | runs; data shown; no crash on empty or error |
| States and edge cases | 25% | loading, error with retry, empty, stale response handled |
| Code quality | 20% | typed state, small components, keys, no fetch in render |
| Communication | 15% | plan said first, trade-offs named, hints taken |
| Testing and polish | 10% | one real test, labels for screen readers, touch targets |

**Ways to lose:** styling for 20 minutes before any data shows; a fetch on every keystroke; a ScrollView with map() for
the list; any as a type; no error state, so a failed call leaves a spinner forever; "I'd add tests later" with nothing
to show; silence while typing.

Not run here: the screen on a phone. On a device you would also check that the keyboard does not cover the list and
that a tap on a row works while the keyboard is up — which is what keyboardShouldPersistTaps="handled" is for, per the
ScrollView documentation.`,
    workedExample: `**Thirty minutes in, the interviewer adds: "Now add pull-to-refresh and load more as I scroll."**

**Answered weakly.** The candidate adds onEndReached={() => fetchMore()} and starts typing. Two minutes later the list
loads page 2 three times, because onEndReached can fire more than once near the end and nothing guards it.

**Answered well — said before typing.**

"Two changes to the data first, then two props.

One: the API needs a cursor — GET /products?q=atta&cursor=abc returns { items, nextCursor }. I'll ask if it has one.

Two: I'd switch this hook to useInfiniteQuery now, because it already tracks pages, the next cursor, and whether a
fetch is in flight — exactly the guard I'd otherwise hand-write. In *Server Data with TanStack Query* that's
getNextPageParam: last => last.nextCursor ?? undefined.

Then on the FlatList:

    <FlatList
      data={query.data?.pages.flatMap(p => p.items) ?? []}
      onEndReached={() => { if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage(); }}
      onEndReachedThreshold={0.5}
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
      ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator /> : null}
    />

The guard is the line that matters: no next page, or one already loading, means do nothing. onEndReachedThreshold of
0.5 starts loading when half a screen is left, so on a slow 4G connection the next page is usually there before the
thumb reaches the end."

**Interviewer: "What happens if the user searches while page 3 is loading?"**

"The query text is in the query key, so a new search is a new query; TanStack Query cancels nothing by itself unless I
pass the signal it gives the queryFn to fetch — I would, so the old request is aborted. The list then shows the new
query's first page."

Why it works: the candidate names the data change before the UI change, picks the tool that removes a bug class, and
says where the double-fetch bug would come from before writing it. (This follow-up was written from the FlatList and
TanStack Query documentation; it was not part of the run above.)`,
    mcqs: [
      mcq('TokriNow\'s search fires a request 300 ms after typing stops. Typing "dal" one key every 100 ms makes how many search requests?', [
        ['One, for "dal", because each key restarts the 300 ms wait', true],
        ['Three, one for "d", "da" and "dal", sent 100 ms apart', false],
        ['Two, because the first key always fires at once to feel fast', false],
        ['None until the user presses the search key on the keyboard', false],
      ], 'Each keystroke clears the pending timer and starts a new one, so only the text standing after a 300 ms pause is sent — the test recorded exactly [\'\', \'dal\'], the empty initial load and one search. Three requests is what an undebounced onChangeText fetch makes; leading-edge firing and a submit key are different designs.'),
      mcq('Why does useProducts return ctrl.abort() from its effect in the TokriNow screen?', [
        ['So a slow, older search response cannot replace the newer results', true],
        ['So the fetch is retried automatically when the network comes back', false],
        ['Because React Native refuses to run fetch without an AbortController', false],
        ['To stop the spinner showing when the user clears the search box', false],
      ], 'When the query changes, React runs the cleanup first, aborting the old request, and its catch ignores the abort. Without it the "toor" response that arrived late overwrote "milk" — the failing test showed exactly that. Abort does not retry, fetch works without a signal, and the spinner is driven by state.'),
      mcq('The race test first passed against a copy of the screen with the abort removed. What made it pass wrongly?', [
        ['The late response settled after act() returned, so it was never rendered', true],
        ['The fake fetch ignored its delays, so both responses arrived in the same tick', false],
        ['FlatList caches its old rows, so the stale data could never be shown', false],
        ['Jest runs each test twice and only reports the second, passing result', false],
      ], 'The timer fired inside a synchronous act(), but the promise chain resolved afterwards, so queryByText ran before React rendered the stale rows. await act(async () => ...) let it settle and the buggy copy failed. The delays were real, FlatList shows its current data, and Jest runs each test once.'),
    ],
    checkpoint: [
      mcq('Twenty minutes into a build-this-screen round, the list shows data but there is no error state. What should the candidate do next?', [
        ['Add the error state with a retry, then the empty state, before any styling', true],
        ['Polish the row styling first, since interviewers judge what they can see', false],
        ['Move the fetch into a Redux slice so that the structure looks production-like', false],
        ['Write snapshot tests of the current list to lock the behaviour down first', false],
      ], 'A missing error state leaves a spinner forever on a failed call — the first thing a real user on patchy 4G meets, and a heavily weighted scoring area. Styling, a global store or snapshot tests add little until every state works.'),
      mcq('A candidate keeps loading, error and data in three booleans. The interviewer asks what is wrong with that. Which answer is best?', [
        ['They allow impossible mixes, like loading and error true at once', true],
        ['Booleans re-render more often than objects held in a single state', false],
        ['TypeScript cannot narrow a boolean, so data is always typed as any', false],
        ['React Native limits each component to two useState calls at most', false],
      ], 'Separate flags can drift into combinations the UI was never designed for; a discriminated union such as { status: \'success\'; items } makes those states unwritable and narrows data automatically. Re-render cost is the same, booleans narrow fine, and there is no limit on useState calls.'),
      mcq('In the TokriNow round, why are prices kept as integer paise until they are displayed?', [
        ['Binary floats cannot store most decimal rupee amounts exactly', true],
        ['FlatList rows can only render integers without a slow formatter', false],
        ['The Indian Rupee symbol needs an integer to be placed correctly', false],
        ['Integers are smaller in JSON, which keeps the response under 1 KB', false],
      ], 'Amounts like 0.1 have no exact binary representation, so sums of rupee floats drift by fractions of a paisa; integers add exactly and are formatted once (26500 shows ₹265). Rendering, the symbol and payload size have nothing to do with it.'),
    ],
  },

  /* ── DEBUG_ROUND ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_SCENARIO_ROUNDS_DEBUG_ROUND',
    notes: `Some loops hand you a small, unfamiliar React Native app with four to six planted bugs and 40 minutes. **The interviewer
is testing your method — reproduce, isolate, prove, fix the smallest thing, prove again — far more than how many bugs
you close.** A candidate who fixes three with a test for each beats one who changes twenty lines and says "should work
now".

You know the tools from *Expo: Creating, Running and Debugging an App* and *Performance: Re-renders, Lists, Startup and
Memory*: React Native DevTools (press j in the Expo CLI), the Profiler and "highlight updates", console logs, and adb
logcat for a native crash on Android. In this lesson the reproduction is a Jest test, because a test is evidence the
interviewer can re-run.

## The method, every bug

1. **Reproduce** — the exact steps and data; say them aloud.
2. **Isolate** — which component, which line; read before you change.
3. **Prove** — a failing test or a log that shows the cause, not the symptom.
4. **Fix** — the smallest change that removes the cause.
5. **Prove again** — the same test passes; say what else could break.

## DabbaTrack: six planted bugs

DabbaTrack is a fictional tiffin-tracking app written for this lesson. The same six tests ran against the buggy and the
fixed components; the buggy run, with real messages:

| # | Symptom | Real failure | Cause | Fix |
|---|---|---|---|---|
| 1 | List janks every second | rows re-rendered: Expected 0, Received 50 | inline renderItem and onPress, unmemoised row; a clock ticks in the parent | React.memo row, useCallback renderItem, stable onOpen |
| 2 | OTP countdown stuck at 29 | Unable to find "Resend OTP in 27s" | setSeconds(seconds - 1) captured seconds = 30 in an effect with [] | setSeconds(s => Math.max(0, s - 1)) |
| 3 | Wrong order expanded after archiving | found "#103 (details open)", not #102 | no keyExtractor; items have orderId, so the index is the key | keyExtractor={o => o.orderId} |
| 4 | Offline banner fires many times | listenerCount: Expected 0, Received 3 | effect subscribes and returns nothing | return the unsubscribe function |
| 5 | Spinner forever on a 500 | spinner still on screen after 15 s | a hand-made Promise only resolves on res.ok | async function that throws on !res.ok; abort on a timer |
| 6 | Crash on pickup orders | TypeError: Cannot read properties of null (reading 'city') | address is null; the code says address! | address?.city ... ?? 'PICKUP' |

    Tests:       6 failed, 6 passed, 12 total      (buggy: 6 failed; fixed: 6 passed)

The code behind three of them:

    // Bug 2 — the effect runs once, so this closure sees seconds = 30 forever
    useEffect(() => {
      const id = setInterval(() => setSeconds(seconds - 1), 1000);
      return () => clearInterval(id);
    }, []);

    // Bug 5 — a promise with no path to reject: a 500 never settles it
    return new Promise((resolve) => {
      fetch(url).then(res => { if (res.ok) resolve(res.json()); });
    });

    // Bug 4 — and its fix: subscribe returns its own unsubscribe
    useEffect(() => { network.subscribe(setOnline); }, []);   // leak
    useEffect(() => network.subscribe(setOnline), []);        // cleaned up

**Bug 1 had two lessons.** Five ticks inside one act() showed 10 extra row renders, not 50: React batched the five
updates into one render. One tick per act() gave the honest 50 — 10 rows × 5 seconds — which on a device is ten row
renders every second. And the fix only holds while onOpen is stable: a parent passing onOpen={id => open(id)} inline
defeats the memo again.

**Bug 3 and extraData.** A list's row state follows its key; with index keys, archiving #101 moved #102's open state
onto #103. React Native's VirtualizedList source contains a "missing keys for items" warning, but it did not print in
this Jest run, so the test, not the warning, caught it. A related trap was measured in a separate run: a renderItem
wrapped in useCallback with a missing dependency left the selection tick unchanged, and adding extraData did not help —
only honest dependencies did. extraData is for a stable renderItem that reads something outside its props.

## "Only on the device" bugs

Some bugs a Jest run cannot show. A test rendering <View>{count && <Text>…</Text>}</View> with count 0 did not throw
here — the run logged "threw: null" — while React Native on a device reports "Text strings must be rendered within a
<Text> component". Android-only crashes are usually native: a missing permission, or a huge image decoded on a low-RAM
phone. For those, read the native stack in adb logcat or the crash reporter, not the JavaScript console. None of this
was run here — there is no device in this setup.

## How it is scored

| Area | Weight | Full marks when |
|---|---|---|
| Method | 35% | reproduces first, states a hypothesis, proves the cause |
| Fixes | 30% | smallest correct change; no new bug; root cause, not symptom |
| Verification | 20% | a test or a repeatable check before and after |
| Communication | 15% | thinks aloud, time-boxes, says what is left |

**Ways to lose:** editing before reproducing; a try/catch that hides bug 6; eslint-disable on the deps warning instead
of reading it; "it works on my machine" with no steps; rewriting the whole screen; 25 minutes on one bug without saying
so.`,
    workedExample: `**Bug 5, said aloud in four minutes**

"Symptom: on a server error, the order screen spins forever. Reproduce: I'll make the fake fetch answer 500 — the
spinner is still there after 15 seconds of fake time. So it isn't slow; it never finishes.

Isolate: the spinner shows while order is null and failed is false. failed is set only in .catch. So the promise
getOrder returns never rejects. Reading getOrder: it wraps fetch in new Promise((resolve) => ...) — there is no reject
at all, and resolve is only called when res.ok. On a 500 nothing is called, so the promise stays pending forever.

Hypothesis proven by the test. Fix: drop the hand-made promise —

    async function getOrder(id: string, signal: AbortSignal): Promise<Order> {
      const res = await fetch(\`\${API}/orders/\${encodeURIComponent(id)}\`, { signal });
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      return res.json() as Promise<Order>;
    }

— and in the effect, an AbortController with a 10-second timer, because a request that hangs with no response at all
would also spin forever; the cleanup aborts it if the user leaves the screen.

Prove again: the same test now shows 'Could not load order' and no spinner. What else could break: anything else that
called getOrder and relied on it never rejecting — I'd search for callers."

Why it works: each sentence moves from symptom to cause with evidence, the fix removes a whole class of bug (a promise
with no reject path), and the candidate names the second hang — no response at all — before being asked.`,
    mcqs: [
      mcq('DabbaTrack\'s OTP countdown shows 29 forever. Its effect calls setSeconds(seconds - 1) every second with [] as dependencies. What is the cause?', [
        ['The interval\'s closure captured seconds as 30 when the effect first ran', true],
        ['setInterval runs only once on React Native unless the app is in focus', false],
        ['useState batches updates, so only the first subtraction is ever applied', false],
        ['The component unmounts after one second and the timer is then cleared', false],
      ], 'The effect ran once, so its callback always reads seconds = 30 and always sets 29. The functional updater setSeconds(s => s - 1) reads the latest value instead. setInterval keeps firing, batching does not drop updates, and nothing unmounts — the test showed the text stuck at 29.'),
      mcq('With no keyExtractor, archiving order #101 made "(details open)" jump from #102 to #103. Why?', [
        ['Without a key or id field, rows were keyed by index, so state followed positions', true],
        ['FlatList always resets row state to closed whenever its data array changes', false],
        ['The expanded flag lived in the parent component, which still pointed at the old index', false],
        ['Pressable keeps the last pressed position and re-applies it after a re-render', false],
      ], 'The default key extractor uses item.key, then item.id, then the index; these items had orderId, so key "1" moved from #102 to #103 and took its state with it. Resets would close every row, the flag lived in the row, and Pressable holds no such position.'),
      mcq('A colleague "fixes" the pickup-order crash by wrapping the whole screen in try/catch. Why would the interviewer push back?', [
        ['It hides the cause; the type and screen should handle address being null', true],
        ['try/catch does not catch rendering errors at all, so the app will still crash anyway', false],
        ['try/catch is slow on Hermes and makes every screen render more slowly', false],
        ['The crash happens on Android only, so a JavaScript fix cannot help it', false],
      ], 'The data says address can be null; the honest fix is a nullable type and a fallback (address?.city ?? \'PICKUP\'), ideally validated at the API boundary. Wrapping rendering does not catch render errors either — that needs an error boundary — but the main point is hiding the cause. The test reproduced it in Jest, so it is not Android-only.'),
      mcq('In the debug round, five clock ticks inside one act() showed 10 extra row renders, but one tick per act() showed 50. What explains the difference?', [
        ['React batched the five updates in one act() into a single render', true],
        ['The fake timers skip four of the five ticks when advanced in one go', false],
        ['FlatList only re-renders its rows on every fifth update of its parent', false],
        ['The render counter resets itself whenever an act() call finishes', false],
      ], 'Updates scheduled within one act() are flushed together, so five ticks became one render of 10 rows. Advancing one tick per act() matches a device, where each second is its own render: 10 rows × 5 = 50. The timers all fired (the header said 5s), and neither FlatList nor the counter behaves as the distractors say.'),
    ],
    checkpoint: [
      mcq('In a debugging round, the candidate\'s first move on "the list janks" should be which of these?', [
        ['Reproduce it and measure which components re-render, before changing code', true],
        ['Wrap every component in React.memo, since that can only make it faster', false],
        ['Replace FlatList with ScrollView, which renders all of its rows only once', false],
        ['Turn on the release build, since dev mode jank is never a real problem', false],
      ], 'Measuring — the Profiler, highlight updates, or a render-count test — finds the actual cause, as the 50 extra row renders did. Blanket memo adds cost and can hide stale props, ScrollView renders every row up front, and some dev-mode slowness is real jank that will survive a release build.'),
      mcq('Why did DabbaTrack\'s offline banner listener count reach 3 after three mounts and unmounts?', [
        ['The effect subscribed but returned no cleanup, so no listener was removed', true],
        ['The banner was rendered three times by StrictMode in the test environment', false],
        ['The emitter adds the same function three times because it uses an array', false],
        ['Unmount in Testing Library keeps components alive until the test ends', false],
      ], 'An effect that subscribes must return the unsubscribe; without it each mount leaks a listener that keeps calling setState on a gone component. The emitter used a Set, and each mount passed a different setter; the fix — useEffect(() => network.subscribe(setOnline), []) — brought the count to 0.'),
      mcq('A test of <View>{count && <Text>…</Text>}</View> with count 0 passed in Jest. What does that prove about the device?', [
        ['Nothing; the device may still reject the bare "0" text, so check there', true],
        ['The pattern is safe on both platforms because the test renderer is strict', false],
        ['Only iOS can crash on it, since Jest runs the Android renderer by default', false],
        ['The crash was fixed in React 19, so the pattern is safe to use everywhere', false],
      ], 'The run logged "threw: null", while React Native on a device reports that text strings must be inside <Text>. A green Jest run proves only what the test renderer checks. Write count > 0 && ... and verify on a phone; Jest is not strict here, and neither platform claim is supported.'),
    ],
  },

  /* ── APP_TAKEHOME ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_SCENARIO_ROUNDS_APP_TAKEHOME',
    notes: `Many product companies and start-ups send a take-home before the onsite: "Build a two-screen app against this public
API: a searchable list and a detail screen. Three days. Send a repository with a README and a build we can run." A
reviewer then spends 20–30 minutes on it. **They are testing whether a stranger can run it in five minutes, whether the
structure would survive a team, and whether it behaves on a bad network.** Ten features with no error states lose to
two screens that are typed, tested and honest about what is missing.

The parts come from *An API Layer for a Mobile App*, *Typing API Data and Runtime Validation*, *Server Data with TanStack
Query*, *Structuring a React Native Codebase* and *Unit and Component Tests with Jest and Testing Library*.

## What reviewers check

| Area | Weight | Full marks when |
|---|---|---|
| Runs as documented | 25% | a clean clone and the README's commands work first time |
| Structure | 20% | API client, hooks and screens separated; config not hard-coded |
| Behaviour | 20% | loading, error with retry, empty, offline; no crash on odd data |
| Tests | 20% | the client and the main flow tested; tests pass |
| README and judgement | 15% | decisions, trade-offs, what is missing and why |

## Spend the days like this

1. **Two hours — the skeleton end to end:** one screen, one real request, one test, committed.
2. **The client and its types,** validated at the boundary; then the hooks.
3. **The second screen**, then every state on both.
4. **A fresh clone in a new folder**, run exactly as the README says.
5. **The README last**, and a preview build if asked.

## The skeleton: ShelfIndia

The brief named a public read-only books API; here a mocked fetch with the same shape stands in, so tests never touch
the network.

    src/api/client.ts      zod schemas, ApiError, createApi(baseUrl, fetchImpl, timeoutMs)
    src/api/hooks.ts       ApiContext, useBooks(q), useBook(id) with TanStack Query
    src/screens.tsx        BookListScreen, BookDetailScreen
    src/App.tsx            providers; routes in the real app (app/index.tsx, app/book/[id].tsx)
    fakeServer.ts          a jest.fn fetch with BOOKS and per-path overrides
    client.test.ts  app.test.tsx  README.md

The heart of the client — one get() that turns every failure into a typed ApiError:

    if (!res.ok) throw new ApiError(\`HTTP \${res.status} for \${path}\`, res.status, 'http');
    const parsed = schema.safeParse(await res.json());
    if (!parsed.success) throw new ApiError(\`Unexpected response for \${path}: \${z.prettifyError(parsed.error)}\`, res.status, 'shape');
    return parsed.data;

with kind 'network' when fetch itself throws and 'timeout' when the AbortController's timer fired. The screens read
the kind to choose the message: offline gets "You are offline. Check your connection." and a Try again button.

fetchImpl is a parameter, so tests pass a fake — no global mocking. The hooks take the client from context, so the app
passes the real one and tests pass one built on the fake server.

## The real run

    $ npx jest takehome
    Test Suites: 2 passed, 2 total
    Tests:       7 passed, 7 total

The seven: the query is encoded (narrayan & co becomes q=narayan%20%26%20co); a 404 is an ApiError with status 404; a
book with author null is rejected with this real message —

    Unexpected response for /books/b1: ✖ Invalid input: expected string, received null
      → at author

— no connection and a hung request are told apart (kind 'network', then 'timeout' with "Timed out after 50 ms");
list → open Godaan → Back, with the fetch log ['/books?q=', '/books/b2'], proving Back reused the cached list; a search
with no match shows the empty state; offline, then Try again recovers.

TypeScript was checked too. Its first run failed: Cannot find name 'process' on process.env.EXPO_PUBLIC_API_URL,
because this scratch project lacked the expo-env.d.ts that a real Expo project generates. Adding the file with
/// <reference types="expo/types" /> fixed it — and is one more reason to commit expo-env.d.ts.

## A build a reviewer can run

Not run here (no EAS account or device). From the Expo documentation: a reviewer with Expo Go can scan the QR code from
npx expo start if the app uses only Expo Go's built-in modules; otherwise build an installable APK with EAS — an
eas.json profile with "android": { "buildType": "apk" } and eas build -p android --profile preview — and put the link in
the README. Check the current EAS documentation for the exact steps.

## Ways to lose

- The README says "npm start" and nothing else; the first run fails on a missing environment variable.
- The API URL hard-coded in five files; an API key committed.
- any everywhere; the response trusted, so a null crashes the detail screen.
- A spinner forever on airplane mode; no retry.
- Tests that hit the real API and fail when it is slow.
- Generated code you cannot explain on the call.`,
    workedExample: `**The README a reviewer can run, then the call**

    # ShelfIndia — take-home
    ## Run (Node 20+)
        npm install
        cp .env.example .env          # EXPO_PUBLIC_API_URL=<the API in the brief>
        npx expo start                # scan with Expo Go, or press a for an emulator
        npx jest                      # 7 tests, no network needed
        Preview APK: <link to the EAS build>
    ## Decisions
        TanStack Query for server state: cache, retry, refetch; no global store needed
        zod at the API boundary: bad data fails in one place with a readable message
        fetch injected into the client: tests use a fake server, not mocks of globals
    ## Not done, and next
        Pagination (the API has a cursor; useInfiniteQuery is the plan)
        Offline cache across restarts; a Maestro flow for list -> detail
        Accessibility pass with TalkBack on a real phone

**Reviewer: "Why validate with zod when TypeScript already has a Book type?"**

"TypeScript checks my code at build time; it knows nothing about what the server sends at run time. When an author came
back null, the parse failed in the client with 'expected string, received null at author', instead of the detail screen
crashing on a phone. The schema is also where the type comes from — z.infer — so they cannot drift."

**"How would this grow to fifteen screens and three developers?"**

"Feature folders — books, cart, profile — each with its own hooks and screens, sharing the one API client. Query keys
from a factory like bookKeys so invalidation is consistent. Routes in Expo Router's app folder. CI running tsc and Jest
on every pull request."

Why it works: the README answers the reviewer's first questions before they ask, is honest about what is missing, and
each answer names a mechanism and the evidence for it.`,
    mcqs: [
      mcq('In ShelfIndia, createApi takes fetchImpl as a parameter instead of calling the global fetch directly. What does that buy?', [
        ['Tests pass a fake server in, with no mocking of globals', true],
        ['Requests run faster because no global lookup happens', false],
        ['It is required by TanStack Query for every queryFn used', false],
        ['It lets React Native use HTTP/2 instead of HTTP/1.1', false],
      ], 'Injecting the dependency makes the client testable in isolation: each test builds a client on fakeServer() with its own overrides, and nothing global leaks between tests. Speed, TanStack Query requirements and protocol choice are unaffected.'),
      mcq('After list → Godaan → Back, ShelfIndia\'s fetch log was [\'/books?q=\', \'/books/b2\']. What does the absence of a second list request show?', [
        ['TanStack Query served the list from its cache on returning', true],
        ['The fake server dropped the second request without logging', false],
        ['FlatList stored the earlier rows in the device\'s storage', false],
        ['The test forgot to press Back, so the list never remounted', false],
      ], 'The list query had data within its staleTime of 60 seconds, so remounting the list screen read the cache rather than refetching — the user sees it instantly, even offline. The fake logs every call, FlatList does not persist anything, and the test found Malgudi Days after pressing Back.'),
      mcq('A reviewer\'s first run of a take-home fails with an undefined API URL. What should the README have contained?', [
        ['A .env.example and the copy step, naming EXPO_PUBLIC_API_URL', true],
        ['The real production API key, so that nothing has to be set up', false],
        ['A note asking the reviewer to edit the URL in the source files', false],
        ['Nothing extra; reviewers are expected to work it out themselves', false],
      ], 'An example env file plus one copy command makes the first run work and documents configuration without committing secrets; EXPO_PUBLIC_ variables are inlined into the bundle, so they must never hold a secret anyway. Committed keys, source edits or puzzles lose the "runs as documented" marks.'),
    ],
    checkpoint: [
      mcq('ShelfIndia\'s API returns author: null for one book. With the zod schema in the client, what happens?', [
        ['The client throws an ApiError of kind shape naming the field', true],
        ['The detail screen renders "null" where the author name goes', false],
        ['TypeScript fails the build, because the type says string', false],
        ['The book is silently dropped from the list without a word', false],
      ], 'safeParse fails at the boundary and the client turns it into an ApiError with the readable message "expected string, received null at author", so the screen shows an error instead of crashing. TypeScript checks code, not runtime data, and nothing drops items silently.'),
      mcq('A take-home\'s tests call the real public API and fail whenever it is slow. What is the better design?', [
        ['A fake fetch with fixed data, including errors and timeouts', true],
        ['A retry loop in every test until the real API finally answers', false],
        ['Longer test timeouts, so a slow API no longer fails the run', false],
        ['Delete the failing tests and mention them in the README file', false],
      ], 'A fake server makes tests fast, repeatable and able to produce the cases that matter — 404, bad shape, offline, a hang — which a real API rarely gives on demand. Retries and long timeouts keep the flakiness, and deleting tests removes the evidence.'),
      mcq('The take-home reviewer has no time to install anything. How can the app be made runnable for them?', [
        ['Link a preview build, such as an EAS-built APK, in the README', true],
        ['Send screenshots of each screen in the email to the reviewer', false],
        ['Ask the reviewer to install Android Studio and build it locally', false],
        ['Upload the project folder with its node_modules as a zip file', false],
      ], 'An installable preview build, or Expo Go for apps that need only its built-in modules, lets a reviewer try it in minutes. Screenshots prove nothing about behaviour, a full Android toolchain is a big ask, and a zipped node_modules is huge and platform-specific.'),
    ],
  },

  /* ── LIVE_CODING_ROUND ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_SCENARIO_ROUNDS_LIVE_CODING_ROUND',
    notes: `Most React Native loops include 45 minutes of coding in TypeScript in a shared editor. The problems are practical, the
kind a mobile codebase really contains: debounce and throttle, grouping, a small cache, flattening a tree, parsing a
deep-link query string. **The interviewer is testing working, typed code, edge-case thinking, and whether you run what you
write.** Generics from *Generics and Utility Types* and narrowing from *Interfaces, Type Aliases, Unions and Narrowing*
will show up.

## The loop, every problem

1. **Restate and ask** (2 min): input shape, invalid input, size, exact output.
2. **Edge cases said as tests** (3 min): empty, one item, duplicates, odd keys, deep input.
3. **Simplest correct code** (10–15 min), typed, talking as you go.
4. **Run the tests, read every failure aloud.**
5. **Complexity**, then the follow-ups.

Every solution below was first written quickly (v1), then run against the same Jest tests as the final version. v1 failed
four of six; the real failures are quoted.

## 1. debounce and throttle

    export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
      let t: ReturnType<typeof setTimeout> | undefined;
      const d = (...args: A) => {
        if (t !== undefined) clearTimeout(t);
        t = setTimeout(() => { t = undefined; fn(...args); }, ms);
      };
      d.cancel = () => { if (t !== undefined) clearTimeout(t); t = undefined; };
      return d;
    }

A<extends unknown[]> keeps the caller's argument types. Tests with fake timers: p, pa, pan 100 ms apart, nothing at 299
ms, one call with 'pan' at 300; cancel stops a pending call. The leading-edge throttle (run now, then ignore calls for
ms) was called every 100 ms for 2.5 s with a 1000 ms window and ran exactly for [0], [10], [20]. Both v1s passed.
Say the use: debounce for search, throttle for scroll handlers.

## 2. groupBy — the key that broke v1

v1 used a plain object: if (!out[k]) out[k] = []. Grouping orders by city, one city was the string "constructor":

    ● v1 › groupBy: orders by city, including a key that is also an Object property
      TypeError: out[k].push is not a function

out["constructor"] is Object's constructor function, which is truthy, so no array was made. User data is not safe as
object keys. The final version returns a Map:

    export function groupBy<T, K extends PropertyKey>(items: readonly T[], key: (t: T) => K): Map<K, T[]> {
      const out = new Map<K, T[]>();
      for (const item of items) {
        const k = key(item);
        const bucket = out.get(k);
        if (bucket) bucket.push(item); else out.set(k, [item]);
      }
      return out;
    }

## 3. LRU cache — v1 forgot that reading is using

    ● v1 › LRU: a read makes the key recent, so the least recently USED is evicted
      - "menu:101",
      + "menu:102",

v1's get() only read the Map, so after get('menu:101') a new key still evicted 101. The fix uses the fact that a Map
keeps insertion order: get() deletes and re-inserts, set() evicts this.map.keys().next().value — the oldest. Both are
O(1). The constructor now refuses capacity 0 with a RangeError (tested).

## 4. Flatten nested comments — v1 read the thread backwards

Comments arrive as a tree; the screen wants a flat list of { id, depth } for a FlatList. v1 used a stack, to avoid
recursion, but pushed children in order and popped them last-first. Expected a, a1, a1x, a2, b; v1 produced b, a, a2,
a1, a1x. The final pushes roots and replies in reverse, so they pop in reading order. Tested: a 10,000-deep reply
chain flattens to 10,000 rows, the last at depth 9999, with no stack overflow.

## 5. parseQuery for a deep link — v1 split on every "="

Input: ?q=paneer+tikka&tag=veg&tag=jain&token=abc%3D%3D&ref=a=b&debug. v1's pair.split('=') gave:

    -   "q": "paneer tikka",          +   "q": "paneer+tikka",
    -   "ref": "a=b",                 +   "ref": "a",
    -   "tag": ["veg", "jain"],       +   "tag": "jain",
    -   "debug": "",                  +   "debug": "undefined",

Four bugs in one line: + is a space in query strings; a value may contain =; keys repeat; a bare key has no value.
The final splits at the first = with indexOf, replaces + before decodeURIComponent, collects repeats into an array and
uses Object.create(null) for the result. A test also shows that a malformed escape, q=%E0%A4, still throws URIError — a
deep link is untrusted input, so the caller catches it and treats the link as invalid.

## How it is scored

| Area | Weight | Full marks when |
|---|---|---|
| Correctness | 30% | works for the edge cases named at the start |
| TypeScript | 20% | real types and generics, no any, narrowing where needed |
| Testing | 25% | tests written and run; failures read and fixed aloud |
| Communication and complexity | 25% | thinks aloud; states time and memory; adapts to follow-ups |

**Ways to lose:** silent typing; never running the code; as any to silence an error; recursion on input the interviewer
said can be deep; a plain object for user-supplied keys; "it works" from one example.`,
    workedExample: `**Follow-up on the LRU: "Make it type-safe for the menu cache, and tell me the complexity."**

"It's already generic: LRUCache<K, V>. For menus I'd write new LRUCache<string, Menu>(50), and get returns Menu |
undefined, so the caller must handle a miss — TypeScript won't let them forget.

    const menus = new LRUCache<string, Menu>(50);
    const cached = menus.get('menu:101');
    if (!cached) { /* fetch, then */ menus.set('menu:101', fresh); }

Complexity: get and set are O(1). A JavaScript Map keeps insertion order and deletes in constant time, so 'move to most
recent' is delete-then-set, and 'least recent' is the first key from keys(). Memory is O(capacity).

Why not an array? Finding and moving a key is O(n), and on a low-end phone scrolling through restaurants that runs
on every screen."

**Interviewer: "Why did your first version pass all my examples?"**

"Because the examples only set keys; none read a key and then inserted. My test did: set 101, set 102, get 101, set
103 — and expected 102 gone. v1 evicted 101. A cache that ignores reads is a FIFO queue, not an LRU."

**Interviewer: "Debounce or throttle for the search box?"**

"Debounce: I want one request after the user stops typing. Throttle is for a stream I must sample steadily — a scroll
position for a 'back to top' button, at most once per 100 ms."

Why it works: the candidate ties the type to safety at the call site, gives complexity with the reason, and explains
the bug from the test that caught it rather than from memory.`,
    mcqs: [
      mcq('v1\'s groupBy threw "out[k].push is not a function" when a city was "constructor". Why?', [
        ['out["constructor"] is Object\'s built-in function, so no array was created', true],
        ['TypeScript forbids "constructor" as a key, so the compiled code is broken', false],
        ['Map and object keys cannot hold any string that starts with a lowercase c', false],
        ['The orders array was frozen, so pushing to any of its groups fails at once', false],
      ], 'A plain object inherits properties from Object.prototype; out["constructor"] is truthy, so the if skipped creating the array and push was called on a function. A Map (or Object.create(null)) has no inherited keys. TypeScript compiled it fine, no such key rule exists, and nothing was frozen.'),
      mcq('How does the final LRUCache make get() count as a use, in O(1)?', [
        ['It deletes the key and sets it again, moving it to the newest end of the Map', true],
        ['It sorts the Map\'s keys by a timestamp on each read, then trims the oldest one', false],
        ['It keeps an array of keys and moves the read key to the end with splice()', false],
        ['It stores a hit counter per key and evicts the key with the fewest reads', false],
      ], 'A Map iterates in insertion order and delete and set are constant time, so re-inserting makes the key most recent and keys().next() is always the least recent. Sorting is O(n log n), splice is O(n), and evicting by hit count is LFU, a different policy.'),
      mcq('v1\'s parseQuery turned "ref=a=b" into ref: "a". What is the fix?', [
        ['Split each pair at the first "=" only, found with indexOf', true],
        ['Use decodeURIComponent on the whole string before splitting it', false],
        ['Split each pair with a regex that removes every "=" character', false],
        ['Reject any query string whose values contain an "=" character', false],
      ], 'Only the first = separates key from value; the rest belongs to the value, as in base64 tokens. Decoding first turns %26 into & and %3D into =, breaking the split, removing = corrupts values, and rejecting them refuses valid links.'),
    ],
    checkpoint: [
      mcq('An interviewer asks for debounce in TypeScript without losing the callback\'s argument types. Which signature does that?', [
        ['function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number)', true],
        ['function debounce(fn: Function, ms: number): (...args: unknown[]) => void', false],
        ['function debounce(fn: (...args: any[]) => any, ms: number): (...args: any[]) => any', false],
        ['function debounce<T extends object>(fn: T, ms: number): T | (() => void)', false],
      ], 'Capturing the parameters as a tuple type A lets the returned function accept exactly the original arguments, so debounced(42) on a string callback is a compile error. Function and any[] throw the types away, and an unconstrained T cannot be called safely.'),
      mcq('v1\'s flattenComments returned b, a, a2, a1, a1x for a thread that reads a, a1, a1x, a2, b. What is the cause?', [
        ['A stack pops the last pushed item first, so items must be pushed reversed', true],
        ['The depth counter was off by one, which reorders all of the nested reply rows', false],
        ['JavaScript arrays do not keep insertion order once they grow past ten', false],
        ['Replies must be sorted by id before flattening, or the order is random', false],
      ], 'pop() takes from the end, so pushing roots and children in reading order reverses them; pushing in reverse restores reading order. The depths were right, arrays keep order, and sorting by id would impose an order the thread does not have.'),
      mcq('Why did the final flattenComments use a stack instead of recursion?', [
        ['A 10,000-deep reply chain could overflow the call stack', true],
        ['Recursion is not supported by Hermes on Android phones', false],
        ['A stack sorts the comments by date while it flattens them', false],
        ['TypeScript cannot type a recursive function\'s return type', false],
      ], 'Each recursive call uses a stack frame, and very deep input can exceed the engine\'s limit; the iterative version handled 10,000 levels in the test. Hermes supports recursion, a stack does not sort, and recursive functions type fine with an annotation.'),
    ],
  },

  /* ── TIMED_SCENARIOS ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_SCENARIO_ROUNDS_TIMED_SCENARIOS',
    notes: `Three mobile scenario questions, **15 minutes each**, run like the real round. Ask a friend to read the prompt and to
answer your questions with the facts given here and nothing more. Say your approach first, then the steps, then the
decision and what would change it. Compare with the model answer and score yourself on the rubric. Companies and data
are fictional; device and store behaviour in the answers is from the React Native, Expo and Android documentation.

## Scenario A — "The menu list janks on cheap phones" (performance)

**Prompt.** "ThaliGo's restaurant menu screen scrolls smoothly on the team's phones, but reviews from users on
budget Android phones say it stutters and sometimes freezes. What do you do?"

**Facts to give when asked.** The menu has 400 items in a ScrollView with items.map(). Each row shows a full-size photo
from the CDN, about 1,200 px wide, in a 72 px thumbnail. A 'Popular' badge timer in the header updates every second.
The team's phones are flagships. Nobody has profiled a release build.

**Model answer.**
1. **Reproduce on the right device:** a budget Android phone, or a low-end emulator profile, in a release build —
   dev mode is slower and misleads.
2. **Measure:** the Profiler for re-renders; the performance monitor for the JS and UI frame rates. At 60 fps a frame
   has 16.7 ms.
3. **Fix in order of evidence:** FlatList instead of ScrollView, so only visible rows mount; keyExtractor; a memoised
   row; move the ticking badge into its own component so the list stops re-rendering every second; request
   thumbnails sized for 72 px from the CDN instead of decoding 1,200 px images.
4. **Prove:** the same device, the same scroll, before and after numbers.
5. **Prevent:** a performance check on a low-end device in the release checklist.

## Scenario B — "Crashes doubled after Tuesday's release" (production)

**Prompt.** "BusYatra's crash-free users fell sharply after Tuesday's release. You are on call. What do you do?"

**Facts to give when asked.** The crash reporter groups 90% of new crashes under one JavaScript error: TypeError: Cannot
read property 'name' of null, in SeatMap, on Android and iOS. It started when the API began returning operator: null for
partner buses. The app uses EAS Update for JavaScript changes.

**Model answer.**
1. **Contain:** a JavaScript-only fix can ship by over-the-air update to the affected channel; a server change (send a
   placeholder operator) can stop it faster while the app fix rolls out. Roll back the update if it was the cause.
2. **Reproduce:** a test rendering SeatMap with operator: null fails with the same TypeError.
3. **Fix the cause:** make operator nullable in the zod schema and the type; render "Partner operator"; add an error
   boundary around SeatMap so one bad section cannot kill the booking flow.
4. **Prove:** the test passes; watch the crash rate fall after the update.
5. **Prevent:** contract tests between app and API; validate at the boundary; staged rollouts. Blameless write-up.

## Scenario C — "Orders placed twice on patchy networks" (offline)

**Prompt.** "KiranaKart users on trains report two identical orders. The Place order button sends a POST. What do you do?"

**Facts to give when asked.** On timeout, the app retries the POST up to 3 times. The server has no idempotency key. The
button is not disabled while the request is in flight. 2% of orders are duplicates, almost all on mobile data.

**Model answer.**
1. **Cause:** a slow first request succeeds on the server after the app's timeout, and the retry creates a second order
   — a timeout does not cancel server work.
2. **Fix on both sides:** the app generates an idempotency key per order attempt and sends it on every retry; the
   server returns the first order for a repeated key. Disable the button while in flight.
3. **Test:** a fake server that answers slower than the timeout; one tap must create one order.
4. **Offline:** queue the order with its key (*Offline-First: Queues, Sync and Conflicts*); on reconnect, send the
   same key, never a new one.
5. **Clean up:** refund duplicates; an alert on duplicate orders per user.

## Rubric (each scenario, out of 20)

| Area | Points | Full marks when |
|---|---|---|
| Structure | 5 | contain or reproduce, find the cause, fix, prove, prevent — in order |
| Evidence | 5 | the cause shown by a measurement, a stack trace or a failing test |
| Mobile judgement | 5 | device class, network, release build, OTA versus store release, battery |
| Communication | 5 | who is told what, trade-offs said, no blame |

40 or more across the three is a pass for most junior rounds; 50 or more is strong. A score below 3 in any area shows
what to practise next — most often *Evidence*, where answers jump to a fix without showing the cause.`,
    mcqs: [
      mcq('In Scenario A, why must ThaliGo\'s jank be reproduced on a budget phone in a release build?', [
        ['Dev mode adds overhead and flagships hide it; users have neither', true],
        ['Release builds include a profiler that dev builds do not ship with', false],
        ['Budget phones run a different JavaScript engine from the flagships', false],
        ['Play Store rules require performance tests on a low-end handset', false],
      ], 'Development builds run extra checks that slow JavaScript, and a fast phone masks real costs; measuring where the users are gives honest numbers. Profiling is available in development, the engine is the same, and no store rule is involved.'),
      mcq('ThaliGo\'s rows show 1,200 px CDN photos in 72 px thumbnails. Why does that hurt on a budget phone?', [
        ['Each full image is downloaded and decoded at full size into memory', true],
        ['React Native refuses to scale images and crops them at random', false],
        ['Images wider than 1,000 px are blocked by Android\'s network rules', false],
        ['FlatList renders every image twice when the source is too large', false],
      ], 'The bytes travel over mobile data and the bitmap is decoded at its full size before being scaled, costing memory and time — on low-RAM phones that means stutter or crashes. Asking the CDN for a thumbnail-sized image fixes it. The other statements are not how image rendering works.'),
      mcq('BusYatra\'s crash is a JavaScript TypeError and the app uses EAS Update. What can ship the app fix fastest?', [
        ['An over-the-air update of the JavaScript bundle to that channel', true],
        ['A full store release, since every fix needs a new binary build', false],
        ['A push notification asking users to clear the app\'s storage', false],
        ['Nothing on the app side; only the server can stop this crash', false],
      ], 'A change confined to JavaScript and assets can be delivered by an update to builds on the matching runtime version, without store review; native changes would need a new binary. Clearing storage does not fix code, and while a server placeholder helps, the app fix is still needed.'),
      mcq('In Scenario C the app retries the order POST after a timeout. What stops the second order?', [
        ['An idempotency key per attempt that the server de-duplicates on', true],
        ['A longer timeout, so the first request always finishes in time', false],
        ['Removing retries, so a failed order is simply lost on bad networks', false],
        ['A confirmation dialog asking the user if they meant to order twice', false],
      ], 'The same key on every retry lets the server return the existing order instead of creating another, which makes retries safe. Any timeout can be exceeded on a train, dropping retries loses genuine orders, and a dialog cannot see a retry the app made by itself.'),
      mcq('Rehearsing Scenario B, Meera says "add optional chaining" but never mentions the stack trace or a failing test. Which rubric area loses most?', [
        ['Evidence', true],
        ['Structure', false],
        ['Mobile judgement', false],
        ['Communication', false],
      ], 'Her fix may be right, but she has not shown the cause — the stack trace pointing at SeatMap and a test with operator: null — which is what Evidence scores. Her order of steps, mobile judgement and communication may still be fine; the rubric separates them to show what to practise.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_SCENARIO_ROUNDS_CHECKPOINT',
    notes: `Ten scenario questions across the topic: the build-this-screen round, the debugging round, the take-home, live coding
in TypeScript and the timed scenarios. Answer each as you would aloud in the room: every state before polish, a
reproduction before a fix, and a test for every bug you find.`,
    checkpoint: [
      mcq('A build-this-screen spec says "show bus routes from the API". What should the candidate settle in the first five minutes?', [
        ['The states — loading, error, empty, data — and the API shape', true],
        ['The colour palette and fonts, so the screen looks finished early', false],
        ['Which global state library to install for the routes data', false],
        ['A full navigation stack, so the screen sits in a real app shell', false],
      ], 'Listing the states and the response shape gives the build its order and covers the most heavily scored area. Styling, a store and navigation can wait or are not needed; a screen without its error and empty states loses more marks than plain styling.'),
      mcq('In a build round, a search box fetches on every onChangeText. The interviewer asks what goes wrong on a slow network. Which answer is best?', [
        ['Many requests race, and an older reply can overwrite newer results', true],
        ['The keyboard closes after every request, so typing becomes slow', false],
        ['onChangeText stops firing once more than three requests are open', false],
        ['Nothing goes wrong, because fetch always answers requests in order', false],
      ], 'Each keystroke sends a request and responses can arrive in any order, so stale results can win; debounce plus cancelling the previous request fixes both the volume and the race. The keyboard and onChangeText are unaffected, and fetch gives no ordering guarantee.'),
      ck('DEBUGGING', 'A row\'s expanded state jumps to the wrong order after an item above it is removed. What is the first thing to check?', [
        ['The keyExtractor, since rows keyed by index carry state by position', true],
        ['The device\'s memory, since low RAM can scramble component state', false],
        ['The Hermes version, since older engines reorder FlatList children', false],
        ['The image cache, since rows reuse each other\'s cached thumbnails', false],
      ], 'Row state follows its key, and without a stable key from the data the index is used, so removing an item shifts state to the next row — the DabbaTrack test reproduced exactly that. Memory, engine version and image caching do not move component state.'),
      ck('DEBUGGING', 'An effect subscribes to a connectivity listener and returns nothing. What symptom appears over a session?', [
        ['Listeners pile up, so each change fires handlers for gone screens', true],
        ['The listener is removed at once, so no changes are ever received', false],
        ['React throws an error on the first render without a return value', false],
        ['The app cannot go offline, because the listener blocks the radio', false],
      ], 'Without a cleanup each mount adds a listener that is never removed — the test counted 3 after three mounts — wasting work and calling setState on unmounted components. React accepts an effect returning nothing, and a listener cannot hold the network up.'),
      ck('DEBUGGING', 'A screen\'s spinner never stops when the server returns 500. Which code pattern is the likely cause?', [
        ['A hand-made Promise that resolves only on res.ok and never rejects', true],
        ['An await on fetch, which waits forever whenever the server errors', false],
        ['A finally block that keeps the spinner visible after the response', false],
        ['useEffect running twice in development, which cancels the request', false],
      ], 'A promise with no reject path stays pending on any non-OK answer, so the error state is never set. fetch itself resolves for a 500 (it rejects only on network failure), finally runs after settling, and a double effect in development does not leave the promise pending.'),
      mcq('A take-home reviewer asks why the app validates responses with zod when the code is typed. Which answer shows the right understanding?', [
        ['Types check the code at build time; zod checks the data at run time', true],
        ['zod makes the JavaScript bundle smaller than plain type annotations', false],
        ['TypeScript types are removed in Expo apps unless zod is installed', false],
        ['zod is faster than TypeScript at checking types during compilation', false],
      ], 'TypeScript cannot see what a server sends at run time; a schema at the boundary catches a null where a string was promised and fails in one place with a readable message. zod adds bundle size, types are always erased at build, and zod does not take part in compilation.'),
      ck('TYPESCRIPT', 'A deep link carries ?city=Pune&tag=veg&tag=jain. What should parseQuery return for tag?', [
        ['["veg", "jain"], collecting the repeated key into an array', true],
        ['"jain", because the last value of a repeated key always wins', false],
        ['"veg", because the first value of a repeated key always wins', false],
        ['"veg,jain", the values joined with a comma into one string', false],
      ], 'Repeated keys are how query strings carry lists, so the parser should keep both; v1 kept only "jain" and lost a filter. Picking the first or last silently drops data, and joining with commas breaks values that contain commas.'),
      ck('TYPESCRIPT', 'A candidate\'s LRUCache.get returns V | undefined. Why is that better than returning V?', [
        ['The caller is forced to handle a miss before using the value', true],
        ['undefined values take less memory inside the Map than V does', false],
        ['Returning V would make the cache evict the wrong key on reads', false],
        ['TypeScript cannot compile a generic method that returns plain V', false],
      ], 'A cache can miss, and V | undefined makes the compiler require a check, so the "fetch on miss" path cannot be forgotten. Memory and eviction are unaffected, and generic methods can return V — it would simply be a lie on a miss.'),
      ck('TYPESCRIPT', 'Grouping orders by a customer-supplied tag, a candidate uses a plain object. What should they use, and why?', [
        ['A Map, because user strings like "constructor" clash with inherited keys', true],
        ['An array of pairs, because plain objects cannot hold more than 1,000 string keys', false],
        ['A Set, because it removes duplicate orders while it groups them', false],
        ['A WeakMap, because it frees each group when the screen is closed', false],
      ], 'A plain object inherits properties such as constructor and toString, so some user strings break lookups — v1 threw "push is not a function". A Map has no inherited keys. Objects hold far more than 1,000 keys, a Set does not group, and a WeakMap needs object keys.'),
      mcq('After a release, orders are duplicated for users on mobile data. What does a strong candidate say first?', [
        ['Contain it, then reproduce with a server slower than the app\'s timeout', true],
        ['Blame the users\' networks, since Wi-Fi users are not seeing the bug', false],
        ['Rewrite the order flow in native Kotlin, which handles retries better', false],
        ['Add analytics events to every screen and wait a week for more data', false],
      ], 'Customers are being charged twice now, so contain first, then prove the cause — a retry after a timeout with no idempotency key — with a slow fake server. Blaming networks, rewriting in another language or waiting a week leaves the money loss running.'),
    ],
  },
];
