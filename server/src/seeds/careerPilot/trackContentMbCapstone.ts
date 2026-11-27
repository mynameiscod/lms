/**
 * Career-track content: Capstone: A Production-Style Mobile App (MB_CAPSTONE), Mobile, batch MB3 — the track's
 * capstone. Nothing is re-taught; every unit points back by title to the lesson that taught the idea.
 *
 * The student plans, builds, tests, releases and defends one React Native + TypeScript (Expo) app against a small
 * backend they run. Option A (recommended) is GharFix, a fictional Hyderabad home-services booking app (AC service,
 * electrician, plumber) whose mock API is given in the Brief; Option B is CampusKart, a fictional campus marketplace
 * for second-hand books, cycles and coolers, built against the student's own small API. Both are graded on the same
 * milestones and rubrics. All data is synthetic.
 *
 * Verified by running, on a Windows laptop with Node 23, in a scratch copy of the track's Expo SDK 58 project (React
 * Native 0.88, React 19.3, TypeScript 6 strict, zod 4, @tanstack/react-query 5, Jest 30 with jest-expo and
 * @testing-library/react-native 13): the GharFix mock API (one dependency-free Node file); the typed API client with
 * zod parsing and single-flight token refresh, tested against that running API (three parallel 401s gave one refresh;
 * a dead refresh token signed the user out once; a contract break failed at the edge); the outbox, tested against the
 * API (an offline flush kept the booking, the online flush sent it, a replay with the same Idempotency-Key left one
 * booking on the server, a slot taken meanwhile was parked with "slot_taken"); the typed href helper with two
 * @ts-expect-error checks; the services screen and the booking mutation hook as component tests. Every output quoted
 * is real. NOT run: no phone, emulator, EAS account, Play Console, Sentry project, Maestro or push service was
 * available, so builds, signing, the internal testing track, notifications on a device, the E2E flow and crash
 * reports are written from docs.expo.dev, reactnavigation.org, developer.android.com, the Play Console Help, the
 * Maestro and Sentry documentation, and are marked so. Store fees, review times and tester rules change; the notes
 * send students to the official pages.
 *
 * Attribution: the topic is [REACT_NATIVE, TYPESCRIPT, MOBILE_RELEASE, MOBILE_APP_BASICS], default REACT_NATIVE;
 * BUILD_CORE declares REACT_NATIVE and TYPESCRIPT, BUILD_SHIP MOBILE_RELEASE and MOBILE_APP_BASICS. Checkpoint
 * questions on another skill name it with ck().
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const TS = 'TYPESCRIPT';
const REL = 'MOBILE_RELEASE';
const BASICS = 'MOBILE_APP_BASICS';

export const TRACK_MB_CAPSTONE_BUNDLES: PilotBundle[] = [
  /* ── BRIEF ─────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_CAPSTONE_BRIEF',
    notes: `**A mobile hiring panel does not ask you to define a FlatList. It asks you to put your phone on the table, open
your app, switch on airplane mode and book something.** Then it asks what happened to that booking, where the token
lives, what the app does when the camera permission is denied, and how a tester got the build. This capstone gives you
answers you can show, not describe.

You have every piece. MB1 gave you TypeScript for React Native, React Native and Expo, and Navigation. MB2 gave you
State, Server Data and Forms; Storage and Offline; Device Features; and Native Android for React Native Developers.
MB3 gave you Auth, APIs and Mobile Security; Testing, Performance and Animation; and Building, Releasing and Running the
App. Nothing here is new. The capstone is about joining them in one codebase and choosing well.

## Two apps, one standard

| | **Option A — GharFix (recommended)** | **Option B — CampusKart** |
|---|---|---|
| What | A Hyderabad home-services app: book an AC service, an electrician or a plumber for a time slot | A campus marketplace: students list second-hand books, cycles and coolers, and others reserve them |
| Backend | The GharFix mock API your mentor gives you: one Node file, no database, started with node mock-api/server.js (a phone on the same Wi-Fi reaches it at your laptop's IP, port 4000; the Android emulator at 10.0.2.2:4000) | Your own small API (Express, FastAPI or Spring Boot, as you learned it) with the same endpoint shapes |
| Device feature | A photo of the problem (a leaking sink) taken with the camera and attached to the booking | A photo of the item, taken or picked, resized before upload |
| Offline case | Booking a slot with no signal in a basement flat | Reserving an item with no signal in a hostel corridor |
| The hard question | "Two people book the same 10:00 slot while one is offline. What does each see?" | "A seller marks the cycle sold while a buyer's reservation sits in an outbox. Who wins?" |

Both are graded on the same rubrics. **Option A is recommended** because its API is fixed and known, so the reviewer
judges your app, not your backend. Option B suits a student who also wants a backend on their resume; keep the backend
small, because it earns no marks here.

## The GharFix API (your contract)

| Endpoint | Contract |
|---|---|
| POST /auth/otp/verify | {phone, otp} gives 200 {accessToken, refreshToken, expiresIn}; the dev OTP is 123456; a wrong OTP gives 401 |
| POST /auth/refresh | {refreshToken} gives a new pair; a refresh token works once, and reusing one revokes the user's tokens (401) |
| GET /services?category= | {items: [{id, name, category, pricePaise, durationMin}]}; no token needed |
| GET /services/:id/slots | {items: [{id, start, available}]}; no token needed |
| GET /bookings | The caller's bookings only; 401 without a valid access token |
| POST /bookings | {slotId, address} with an Idempotency-Key header: 201 booking; 409 slot_taken; 422 unknown_slot or address_too_short; the same key always gets the same answer |

Money is integer paise; times are ISO strings with +05:30. The access token lives 15 minutes by default; start the API
with a 1-second lifetime in tests to make expiry happen on demand. The API resets when it restarts.

## Screens

Sign in (phone, OTP) → Home tab: service categories and a list → Service: details and slots → Book: address form,
optional photo, confirm → Bookings tab: upcoming and past, with a "waiting for signal" badge on queued ones → Account
tab: notifications on or off, sign out. Plus a not-found screen for bad deep links (gharfix://bookings/bk-1001 opens a
booking).

## The architecture in one picture

    app/                 Expo Router: (auth) and (tabs) groups, Stack.Protected on the session
      screens stay thin: they call hooks and render states
    src/features/        services, bookings, account: query and mutation hooks per feature
    src/api/             client.ts (fetch, timeout, zod, refresh), schemas.ts (zod: the contract)
    src/offline/         outbox in expo-sqlite, flush on reconnect, on app foreground and on launch
    src/device/          camera and resize, notifications, permission gate
    src/session/         refresh token in expo-secure-store; access token in memory only

Server data lives in TanStack Query; the session and a few UI flags live in a small Zustand store; nothing else is
global (Where State Lives in a Mobile App). Screens never call fetch; hooks are the seam that tests replace
(Structuring a React Native Codebase).

## Milestones (about five weeks part-time)

| Milestone | Done means |
|---|---|
| M1 — Plan | ARCHITECTURE.md with screens, data, state choices and risks; the API running; an empty app on your phone in a development build |
| M2 — Core | Typed routes and sign-in; services, slots and bookings from the API through query hooks; every screen has loading, error, empty and data states |
| M3 — Correct | Token refresh proven by a test with three parallel 401s; the booking form validated with zod; component tests green in CI |
| M4 — Offline and device | A booking made in airplane mode is queued, shown as waiting and sent once later; the camera photo with a denied-permission path; a reminder notification |
| M5 — Ship | One Maestro flow passing; performance checked in a release build; a signed build on a Play internal testing track; Sentry receiving a test crash with readable stack traces |
| M6 — Defend | README, ARCHITECTURE.md and a demo rehearsed twice on a real phone |

## What a reviewer will do

Clone the repository, run npm ci and npm test, and see green tests in under a minute. Start the API and the app from
the README in under ten minutes. Install your build from the internal testing link on their own Android phone. Turn
on airplane mode, book a slot, turn it off, and check the server has exactly one booking. Deny the camera and see the
app still book. Read ARCHITECTURE.md and find a reason for every library in package.json.

## Out of scope

Payments (show the price; a real UPI flow is a capstone of its own), a provider-side app, chat, maps beyond showing an
address, iOS release (plan it in a paragraph, from The Apple App Store in Outline) and a web version.`,
    workedExample: `**ARCHITECTURE.md for GharFix, abridged.**

**Stack.** Expo (managed workflow, development builds), Expo Router with typed routes, TypeScript strict, TanStack
Query for server data, Zustand for the session flag only, zod for every response, react-hook-form for the booking
form, expo-sqlite for the outbox, expo-secure-store for the refresh token, expo-image-picker and expo-image-manipulator
for the photo, expo-notifications, Sentry. Each was taught in this track; nothing is added for its own sake.

**State, by kind.** Server: services, slots, bookings (query keys ['services', category], ['slots', serviceId],
['bookings']). Client: signedIn, notificationsEnabled. Form: the booking form only. Navigation: the selected service
and slot travel as route params, never through a global store. Device: the outbox and the refresh token.

**Decisions with reasons.**
- Slots get a staleTime of 30 seconds and bookings refetch on focus: a slot list an hour old would offer taken slots.
  The catalogue gets 5 minutes: it changes weekly.
- A booking is never shown as "confirmed" until the server says 201. Queued bookings show "waiting for signal".
  Optimistic display would lie when the slot was taken while the phone was offline.
- Every POST /bookings carries an Idempotency-Key made once per tap and stored with the outbox row, so a retry after a
  lost response cannot book twice.
- The photo is resized to 1280 px on the long side and JPEG quality 0.7 before upload: a 12 MP photo on patchy 4G
  would make the booking feel broken.

**Risks and where they are tested.**

| Risk | Test |
|---|---|
| Double booking from retries | Outbox test: replay with the same key leaves one booking |
| Signed out at random after 15 minutes | Client test: three parallel 401s, one refresh, nobody signed out |
| A changed API field crashes a screen | zod at the edge: a string price fails as bad_response, the screen shows an error |
| Camera denied blocks booking | Component test of the permission gate; manual check on a phone |
| Slow list on a budget phone | Release build on a mid-range Android phone with the performance monitor |

**Open questions.** Should a queued booking expire if not sent within an hour, since the slot may pass? Assumed yes:
the outbox drops it and tells the user.`,
    mcqs: [
      mcq('GharFix\'s architecture keeps services, slots and bookings in TanStack Query and only the session flag in Zustand. What is the reasoning?', [
        ['Server data needs caching, refetching and staleness rules, which a query library gives; a global store would copy it by hand', true],
        ['Zustand cannot hold arrays of objects reliably, so the long lists of services and bookings must live in a library built for them', false],
        ['TanStack Query stores data on disk by default, so the bookings survive the app being killed without extra code', false],
        ['Keeping server data in Zustand would make the app slower on Android, because Zustand runs on the JavaScript thread', false],
      ], 'Where State Lives in a Mobile App separates server state, which is a cache of someone else\'s data with staleness and refetch rules, from client state. Zustand holds arrays fine, TanStack Query keeps its cache in memory unless you add a persister, and both libraries run on the JavaScript thread.'),
      mcq('Why does the GharFix brief say a booking is never shown as "confirmed" until the server returns 201?', [
        ['The slot may be taken while the phone is offline, so an optimistic "confirmed" can turn out to be false', true],
        ['TanStack Query cannot roll back an optimistic update once a mutation has been placed into the outbox', false],
        ['Play Store review rejects any app that shows a status the server has not yet sent back to the client', false],
        ['The mock API returns the booking id only on 201, and a booking screen cannot render without an id', false],
      ], 'Optimistic updates suit actions that almost always succeed, such as a like. A booking competes for a scarce slot, so the honest state is "waiting for signal" until the server decides (Offline-First: Queues, Sync and Conflicts). Rollback is possible but tells the user a lie first; there is no such review rule; a local id would render fine.'),
      mcq('A student proposes adding Redux Toolkit, MobX and Jotai "to show range" in the capstone. What should the plan say?', [
        ['One tool per kind of state, each with a reason in ARCHITECTURE.md; extra libraries add risk without marks', true],
        ['Add them all, since reviewers count the libraries listed in package.json when they score the architecture', false],
        ['Replace TanStack Query with Redux Toolkit, since one big store is easier to test than many small hooks', false],
        ['Use MobX only, because it is the library most Indian product companies list in their mobile job posts', false],
      ], 'Global State with Zustand and Redux Toolkit taught choosing a tool for a kind of state. A panel asks "why is this here?" for each dependency; three state libraries in one small app is a design smell. Reviewers score reasons, not counts, and the job-post claim is invented.'),
    ],
    checkpoint: [
      mcq('In GharFix, the selected service and slot reach the Book screen. Where should they travel?', [
        ['As typed route params, so a deep link or a restored screen still has them', true],
        ['In a global Zustand store, set just before the app navigates to the Book screen', false],
        ['In a module-level variable that the Book screen reads when it mounts', false],
        ['In AsyncStorage, written on the Service screen and read on the next one', false],
      ], 'Navigation state belongs in the route (Stack Navigation and Passing Parameters): it survives a deep link, the back button and process restore. A store or module variable is empty when the screen opens from a link, and AsyncStorage adds disk I/O for something the router already carries.'),
      ck(BASICS, 'A GharFix user books from a basement flat with no signal. Which behaviour does the brief require?', [
        ['The booking is saved to an outbox, shown as waiting for signal, and sent once when the network returns', true],
        ['The booking button is disabled until the phone reports a working connection, so no request can fail', false],
        ['The booking is shown as confirmed at once, and an error appears later if the server refuses it', false],
        ['The app retries the request every second in a loop until it succeeds or the user closes the app', false],
      ], 'Usable With No Signal and Offline-First: Queues, Sync and Conflicts: keep the user\'s intent, be honest about its state, and send it once later. Disabling the button loses the intent, showing "confirmed" lies, and a tight retry loop drains the battery and hammers the server when it comes back.'),
      ck(TS, 'The GharFix contract says pricePaise is an integer. Where does the app enforce that?', [
        ['In a zod schema the API client parses every response with, so a wrong type fails at the edge', true],
        ['In a TypeScript interface for Service, which makes the compiler reject a string at runtime', false],
        ['In each screen, by calling Number() on the price before formatting it as rupees for display on the card', false],
        ['Nowhere: integers and strings print the same, so a mismatch cannot reach the user at all', false],
      ], 'Typing API Data and Runtime Validation: a type is a promise the compiler cannot check against the network; a schema is a check. Interfaces vanish at runtime, Number() in every screen hides the drift and scatters the fix, and "59900" + "59900" concatenates in JavaScript.'),
    ],
  },

  /* ── BUILD_CORE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_CAPSTONE_BUILD_CORE',
    notes: `**The core half: a typed app with sign-in, an API layer that refreshes tokens correctly, server data through
query hooks, a validated booking form, and tests that prove the parts that break most often.** It draws on TypeScript
for React Native (all of it), Navigation (Stack Navigation and Passing Parameters; Tabs, Drawers and Nested Navigators;
Auth Flows and Protected Screens; Deep Links and Universal Links), State, Server Data and Forms (Server Data with
TanStack Query; Forms and Validation; Structuring a React Native Codebase), Auth, APIs and Mobile Security (An API Layer
for a Mobile App; Login, Tokens and Refresh) and Unit and Component Tests with Jest and Testing Library.

The code below is the reference skeleton's. It was run on a laptop with Expo SDK 58, React Native 0.88, TypeScript 6
(strict), zod 4, TanStack Query 5 and Jest 30 with jest-expo, against the GharFix mock API running in the same
process. The outputs are real. Nothing here needs a phone; running the screens on one is your job in M1.

## Step 1 — The project

    npx create-expo-app@latest gharfix
    npx expo install expo-router expo-secure-store expo-sqlite @tanstack/react-query zod react-hook-form
    npx expo install expo-dev-client          # a development build from M1, not Expo Go (Expo: Creating,
                                              # Running and Debugging an App)

Turn on strict mode in tsconfig.json and typed routes in app.json (experiments.typedRoutes: true). Set an android
package such as in.gharfix.app now: changing it later means a new app on the Play Store.

    app/_layout.tsx               providers (QueryClient, session), Stack with Stack.Protected
    app/sign-in.tsx
    app/(tabs)/_layout.tsx        Home, Bookings, Account tabs
    app/(tabs)/index.tsx          services
    app/(tabs)/bookings.tsx
    app/service/[id].tsx          details and slots
    app/book/[slotId].tsx         the booking form
    app/+not-found.tsx

## Step 2 — Typed routes

Expo Router generates an Href type from the app folder when typedRoutes is on, so router.push('/servise/1') is a
compiler error. The skeleton also keeps a hand-written table of every route and its params, which tests and
notification handlers use to build links:

    export type Routes = {
      '/(tabs)': undefined;
      '/(tabs)/bookings': undefined;
      '/service/[id]': { id: string };
      '/book/[slotId]': { slotId: string; serviceId: string };
      '/sign-in': { next?: string };
    };
    type Args<R extends keyof Routes> = Routes[R] extends undefined ? [] : [params: Routes[R]];
    export function href<R extends keyof Routes>(route: R, ...args: Args<R>): string { ... }

    // @ts-expect-error a service screen needs its id
    href('/service/[id]');
    // @ts-expect-error serviceId is missing
    href('/book/[slotId]', { slotId: 'x' });

tsc passed, which proves both lines really are errors (an unused @ts-expect-error is itself an error). The function,
run under Jest, printed:

    /
    /bookings
    /service/svc-1
    /book/svc-1-2026-11-02T10?serviceId=svc-1
    /sign-in?next=%2Fbookings

The conditional rest parameter is the trick from Generics and Utility Types: routes without params take no second
argument, routes with params require it.

## Step 3 — The contract and the client

schemas.ts holds the API contract as zod schemas, and the types come from them (z.infer), so the two cannot drift:

    export const Service = z.object({
      id: z.string(), name: z.string(),
      category: z.enum(['ac', 'electrical', 'plumbing']),
      pricePaise: z.number().int(), durationMin: z.number().int(),
    });
    export type Service = z.infer<typeof Service>;

client.ts is the only place that calls fetch. It adds a 10-second timeout with AbortController, sends the
Idempotency-Key when given, turns every failure into an ApiError with a kind (offline, timeout, http, bad_response),
parses the body with the schema, and handles 401 with one shared refresh:

    function refreshOnce(): Promise<string> {
      refreshing ??= (async () => {
        const rt = await cfg.store.get();                 // expo-secure-store in the app
        if (!rt) throw new ApiError('http', 'No session', 401, 'no_session');
        const t = await raw('/auth/refresh', Tokens, { method: 'POST', body: { refreshToken: rt } }, null);
        await save(t);                                    // access token in memory, refresh token in SecureStore
        return t.accessToken;
      })().finally(() => { refreshing = null; });
      return refreshing;
    }

    async function request<T>(path: string, schema: z.ZodType<T>, opts: Opts = {}): Promise<T> {
      try { return await raw(path, schema, opts, accessToken); }
      catch (e) { if (!(e instanceof ApiError) || e.status !== 401) throw e; }
      let fresh: string;
      try { fresh = await refreshOnce(); }
      catch (e) {
        if (e instanceof ApiError && e.status === 401) { accessToken = null; await cfg.store.clear(); cfg.onSignedOut(); }
        throw e;
      }
      return raw(path, schema, opts, fresh);              // replay once; a second 401 is not refreshed again
    }

Why single-flight matters here: the mock API, like many real ones, rotates refresh tokens and treats a reused one as
theft (Login, Tokens and Refresh). Three screens refreshing at once would each send the same refresh token; the second
and third would be "reused" and sign the user out. The tests, against the running mock API with a 1-second access
token:

    results: 0, 0, 0 | /auth/refresh calls: 1 | signed out: 0
    error: http 401 invalid_refresh | signed out: 1 | stored token: null
    ApiError bad_response: /services: items.0.pricePaise Invalid input: expected number, received string

The first line is three parallel requests after expiry sharing one refresh. The second is a refresh token the server
no longer knows: the user is signed out once and the stored token is cleared. The third is a fake response with the
price as a string: it fails in the client with the field named, instead of printing "₹NaN" on a screen.

## Step 4 — Server data through hooks

    export const keys = {
      services: (category?: string) => ['services', category ?? 'all'] as const,
      bookings: () => ['bookings'] as const,
    };

    export function useServices(client: Client, category?: string) {
      return useQuery({
        queryKey: keys.services(category),
        queryFn: () => client.request('/services' + (category ? '?category=' + category : ''), ServiceList)
          .then((r) => r.items),
        staleTime: 5 * 60_000,
      });
    }

Wire focusManager to AppState and onlineManager to NetInfo once, in the root layout, as Server Data with TanStack Query
showed; without them a phone never refetches when the app comes back from the background. Screens render four states
and nothing else: a spinner with an accessibility label, an error with "Try again" (and "You are offline." when the
error kind is offline), an empty message, and the list. The list uses FlatList with a memoised row and keyExtractor
(Lists: FlatList, SectionList and Performance).

## Step 5 — Sign-in and the protected stack

The root layout reads the session, keeps the splash screen up while it restores, and guards the tabs:

    <Stack>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="service/[id]" />
        <Stack.Screen name="book/[slotId]" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>

"Signed in" on launch means "a refresh token exists in SecureStore"; the first request refreshes it. onSignedOut from
the client flips the flag, and Stack.Protected moves the user to sign-in without any screen calling router.replace
(Auth Flows and Protected Screens). The OTP field uses textContentType="oneTimeCode" and autoComplete="sms-otp" so the
keyboard can offer the code.

## Step 6 — The booking form

react-hook-form with a zod resolver, and the same limits the server enforces (Forms and Validation; Validate on the
Client for Kindness, the Server for Correctness):

    const BookingForm = z.object({
      address: z.string().trim().min(10, 'Add house number, street and area'),
      photoUri: z.string().optional(),
    });

The submit button shows a spinner and is disabled while submitting, so a double tap cannot send two bookings; the
Idempotency-Key covers the case where it does anyway.

## Step 7 — Tests for what breaks

Component tests with a mocked fetch and a fresh QueryClient (retries off) per test, querying by role and label as
Unit and Component Tests with Jest and Testing Library taught:

    test('offline: says so, and Try again recovers', async () => {
      let online = false;
      const fetchFn = jest.fn(async () => {
        if (!online) throw new TypeError('Network request failed');
        return json(200, services);
      }) as unknown as typeof fetch;
      const { client, wrapper } = setup(fetchFn);
      render(<ServicesScreen client={client} onOpen={() => {}} />, { wrapper });
      expect(await screen.findByRole('alert')).toHaveTextContent('You are offline.');
      online = true;
      fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
      expect(await screen.findByText('AC service (split)')).toBeOnTheScreen();
    });

The four component tests (list and open by accessible name, offline and retry, booking queued with no signal, slot
taken shown as an error) and the six client, outbox and route tests:

    Tests:       4 passed, 4 total
    Tests:       6 passed, 6 total

Two honest notes from the run. The first component test timed out on the first two runs (at 5 and then 20 seconds)
on a busy laptop with a cold Jest cache; run alone it passed, and after that the whole file passed in 2.8 seconds. The
cause was not pinned down, so the test stays and CI gets a generous testTimeout: investigate a timeout, do not delete
the test. And Jest printed "Jest did not exit one second after the test run has completed" even after each QueryClient
was cleared; find the open handle with --detectOpenHandles before reaching for --forceExit.

## Deliverables for this unit

1. The app with typed routes, sign-in with OTP, the protected stack, three tabs and the service, slot and booking
   screens, all reading the GharFix API (or your CampusKart API).
2. src/api: schemas for every response, the client with timeout, error kinds and single-flight refresh.
3. A hook per query and mutation; screens with loading, error, empty and data states; focus and online managers wired.
4. The booking form with zod validation matching the server's rules.
5. Tests: the three client tests above (or their equivalent), component tests for one list screen and the booking
   hook, run by npm test and in CI on every push.

## Acceptance checks (done means)

- npx tsc --noEmit prints nothing; no any outside test files; no // @ts-ignore.
- Three parallel requests after token expiry cause exactly one call to /auth/refresh (a test proves it).
- Killing and reopening the app keeps the user signed in; signing out clears SecureStore and returns to sign-in.
- Every screen has been seen in its error state, by switching the API off.
- npm test is green from a clean clone.

## Common traps

- **Calling fetch in screens.** Every screen grows its own error handling and none of them refresh tokens.
- **The access token in AsyncStorage.** Keep it in memory; the refresh token goes in SecureStore (Secrets on the
  Device: SecureStore and Keystore).
- **Copying server data into a store.** Two copies drift; the query cache is the copy.
- **Testing only the happy path.** The value of the tests is the 401, the timeout and the contract break.`,
    mcqs: [
      mcq('GharFix\'s client test fires three requests just after the access token expires and sees one call to /auth/refresh. Why does the test matter for this particular API?', [
        ['The API rotates refresh tokens and treats a reused one as theft, so parallel refreshes would sign the user out', true],
        ['The API limits /auth/refresh to one call per minute per user, so a second call in that minute would always be refused with 429', false],
        ['A single refresh is faster, and the test is there only to keep the app under its startup-time budget', false],
        ['Three refreshes would create three users on the server, since every refresh call registers a new phone', false],
      ], 'With rotation, every refresh spends the old token; a second request carrying the same old token looks like a stolen copy and revokes the session (Login, Tokens and Refresh). The mock API has no rate limit, speed is a side benefit, and refresh never creates users.'),
      mcq('A reviewer finds router.push(\'/servise/\' + id) in a GharFix screen and the build compiles. What was missing?', [
        ['Typed routes, which would make a path that matches no file in app/ a compiler error', true],
        ['A zod schema for the route params, which would reject the misspelt path when the screen mounts', false],
        ['A not-found screen, without which Expo Router silently corrects close misspellings of a route', false],
        ['Strict mode in tsconfig.json, which checks string contents against the files in the app folder', false],
      ], 'Expo Router\'s typedRoutes generates an Href type from the app folder, so a misspelt literal path fails to compile (Stack Navigation and Passing Parameters). A schema checks params, not paths; +not-found shows a screen rather than correcting anything; strict mode alone does not know your files.'),
      mcq('Why does the GharFix booking form validate the address with the same 10-character rule the server enforces?', [
        ['To tell the user at once, on the phone, what the server would reject later; the server still decides', true],
        ['So that the server can skip its own validation, since the app has already checked every booking', false],
        ['Because zod rules are sent to the server with the request and enforced there as well as on the phone', false],
        ['To keep the request small, because a short address uses fewer bytes on a slow mobile connection', false],
      ], 'Validate on the Client for Kindness, the Server for Correctness: the client check saves a round trip on patchy 4G, but anyone can call the API directly, so the server keeps its rule. Schemas are not sent with requests, and the size argument is irrelevant.'),
    ],
    assignment: {
      title: 'Capstone: Screens, Navigation, State and the API',
      description: 'Build the core of your capstone app (GharFix or CampusKart) in React Native with TypeScript and Expo: typed routes and a protected stack, OTP sign-in with tokens refreshed correctly, an API client that validates every response, server data through TanStack Query hooks with every screen state handled, a validated booking or reservation form, and tests that prove the refresh, the error states and the contract.',
      instructions: `Build the core described in this unit's notes against the API you chose in the Brief. Submit a link to the
repository (or a zip) and a two-minute screen recording from your phone or emulator showing sign-in, a list, an error
state with the API switched off, and a completed booking.

**Submit:**

1. The app: typed routes, a protected stack with a splash while the session restores, three tabs, and the service,
   slot and booking screens (or item, reserve and my-reservations for CampusKart).
2. src/api: a zod schema per response type, one client with a timeout, error kinds and single-flight refresh; tokens
   stored as taught (refresh token in SecureStore, access token in memory).
3. Query and mutation hooks per feature, with keys in one place and staleTime chosen per kind of data, and focus and
   online managers wired to AppState and NetInfo.
4. The booking form with react-hook-form and zod, matching the server's rules, safe against double taps.
5. Tests: three parallel 401s cause one refresh; a dead refresh token signs the user out once; a contract break fails
   at the edge; component tests for one list screen (loading, error with retry, data) and the booking hook.
6. The output of npx tsc --noEmit and npm test, pasted into the README.

**Before you submit,** walk through each acceptance check in the notes and point to the file or test that meets it.`,
      rubric: [
        { criterion: 'Typed navigation and auth flow', description: 'Typed routes on; params typed per screen; a protected stack driven by the session; splash during restore; sign-out returns to sign-in from any screen; a deep link opens a booking.', maxPoints: 20 },
        { criterion: 'API layer and token handling', description: 'Only the client calls fetch; timeouts and error kinds; every response parsed with zod; single-flight refresh; tokens stored where they belong; a second 401 is not refreshed again.', maxPoints: 25 },
        { criterion: 'Server state and screens', description: 'Query hooks with central keys and reasoned staleTime; focus and online managers wired; every screen shows loading, error with retry, empty and data; lists use FlatList with stable keys.', maxPoints: 20 },
        { criterion: 'Forms', description: 'react-hook-form with a zod schema matching server rules; field errors announced; submitting state blocks double taps; keyboard does not hide the submit button.', maxPoints: 10 },
        { criterion: 'Tests', description: 'The refresh, sign-out and contract tests pass against a running or mocked API; component tests query by role and label; npm test green from a clean clone.', maxPoints: 15 },
        { criterion: 'TypeScript and code quality', description: 'tsc --noEmit clean in strict mode; no any or ts-ignore outside tests; feature folders; screens stay thin; README with one-command setup.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  /* ── BUILD_SHIP ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_CAPSTONE_BUILD_SHIP',
    notes: `**The shipping half: the app keeps working with no signal, uses the camera with permission handled properly,
reminds the user before the technician arrives, passes one end-to-end flow, is checked for performance in a release
build, reaches testers through the Play Store's internal testing track, and reports its crashes.** It draws on Storage
and Offline (Offline-First: Queues, Sync and Conflicts; A Database on the Phone: SQLite), Device Features (Permissions
Done Right; Camera, Images and Files; Push and Local Notifications; App State, Background Work and the Lifecycle),
Testing, Performance and Animation (End-to-End Tests with Maestro and Detox; Performance: Re-renders, Lists, Startup and
Memory; Accessible Mobile Apps) and Building, Releasing and Running the App (all of it).

What was run: the outbox against the GharFix mock API and the booking hook as a component test, on a laptop with
Jest 30 and jest-expo; the outputs below are real. What was not: no phone, emulator, EAS account, Play Console, Maestro
or Sentry project was available, so those sections are written from docs.expo.dev, developer.android.com, the Play
Console Help, maestro.mobile.dev and docs.sentry.io, and say so. Your submission must contain real evidence for them.

## Part 1 — Offline: the outbox

The outbox row is the intent, not a copy of the screen: {id, kind: 'booking.create', payload: {slotId, address},
createdAt, attempts, status}. The id is made once when the user taps Book and doubles as the Idempotency-Key. In the
app the rows live in expo-sqlite, written in the same transaction as the local "pending" booking (A Database on the
Phone: SQLite); the reference test keeps them in memory behind the same interface.

The booking mutation tries the network first and queues only on a retryable failure:

    try {
      const booking = await client.request('/bookings', Booking, { method: 'POST', body: input, idempotencyKey: id });
      return { state: 'confirmed', booking };
    } catch (e) {
      if (e instanceof ApiError && e.retryable) {
        await enqueueBooking(outbox, id, input, Date.now());
        return { state: 'queued', opId: id };
      }
      throw e;                         // 409 slot taken, 422 bad address: the user must act
    }

flush() sends pending rows in order, stops at the first retryable failure (the network is bad; keep the order), and
parks a rejected row with its error code so the Bookings tab can say "That slot was taken. Pick another time." A
module-level promise makes sure NetInfo, AppState and a timer firing in the same second start one flush, not three.

The tests, against the running mock API:

    offline flush: {"sent":0,"stoppedOn":"op-7f3a: offline"} | still queued: 1
    online flush: {"sent":["bk-1001 confirmed"],"failed":0} | queued: 0
    replay: bk-1001 | POSTs: 2 | bookings on server: 1
    sent: svc-2-2026-11-02T15 | failed: op-a slot_taken

Read the third line slowly: the phone sent the same operation twice (the 201 was "lost"), the server saw two POSTs and
still holds one booking, because the key matched. The fourth line is the hard question from the Brief: another user
took the 12:00 slot while this phone was offline; that row is parked with slot_taken and the next booking still goes.
The hook test shows the screen side:

    result: {"state":"queued","opId":"op-1"} | outbox: op-1 pending
    error: 409 slot_taken | outbox size: 0

With no signal the user gets "queued", not a fake confirmation; a 409 is an error the user sees, and it is not queued
for a retry that can never succeed. Flush on three triggers: NetInfo reporting connected, AppState becoming active, and
app launch. Do not count on background tasks to send it: the OS decides when they run (App State, Background Work and
the Lifecycle). Queued bookings older than an hour, or whose slot has started, are dropped with a message.

## Part 2 — The device feature: a photo of the problem

Ask for the camera when the user taps "Add a photo", never at launch, and explain first (Permissions Done Right):

    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      // canAskAgain false: the system will not show the dialog again; offer Linking.openSettings()
      return perm.canAskAgain ? showWhyWeAsk() : showOpenSettings();
    }
    const shot = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (shot.canceled) return;
    const small = await manipulateAsync(shot.assets[0].uri, [{ resize: { width: 1280 } }],
      { compress: 0.7, format: SaveFormat.JPEG });

(Written from the expo-image-picker and expo-image-manipulator documentation; the function names were checked in the
installed packages, but no camera ran here.) The booking must succeed without a photo: denying the camera removes the
photo, not the booking. Offer "Choose from gallery" as the second path. Queue photo uploads like bookings: a photo
upload is the slowest request in the app on 4G.

## Part 3 — Notifications

Two kinds, as Push and Local Notifications taught:

- **Local:** a reminder one hour before the slot, scheduled on the phone when the booking is confirmed, with
  Notifications.scheduleNotificationAsync and a trigger of type SchedulableTriggerInputTypes.DATE. It works offline and
  needs no server. Cancel it when the booking is cancelled.
- **Push:** "Your technician Ravi is on the way", sent by the server. Register the Expo push token after sign-in
  (getExpoPushTokenAsync with your EAS projectId), send it to the API, and delete it on sign-out. On the mock API, a
  POST to the Expo push service from a small script stands in for the server.

On Android 8 and later, create a channel first (setNotificationChannelAsync) with a name the user recognises in system
settings, such as "Booking reminders". On Android 13 and later, the app must ask for notification permission; ask after
the first booking, not at launch. A tap on either notification opens the booking: read data.url in
addNotificationResponseReceivedListener and route with the href helper, and check getLastNotificationResponseAsync
on launch for taps that started the app (Deep Links and Universal Links).

## Part 4 — One end-to-end flow

One Maestro flow for the money path, run on an emulator or a phone (End-to-End Tests with Maestro and Detox). Written
from the Maestro documentation; not run here:

    appId: in.gharfix.app
    ---
    - launchApp:
        clearState: true
    - tapOn: "Phone number"
    - inputText: "9876543210"
    - tapOn: "Send OTP"
    - tapOn: "OTP"
    - inputText: "123456"
    - tapOn: "Verify"
    - tapOn: "AC service (split), ₹599"
    - tapOn:
        id: "slot-svc-1-2026-11-02T10"
    - tapOn: "Address"
    - inputText: "Flat 302, Sai Residency, Kondapur"
    - tapOn: "Confirm booking"
    - assertVisible: "Booking confirmed"

Text matches accessibility labels, which is one more reason to set them (Accessible Mobile Apps). Use testID only where
no visible text is stable, such as slot buttons. Restart the mock API before each run so the slot is free.

## Part 5 — Performance, measured

Check performance in a release build on a mid-range Android phone; a debug build is much slower and misleading
(Performance: Re-renders, Lists, Startup and Memory). At 60 frames a second, each frame has 16.7 ms. Record, do not
guess:

| Check | How | Evidence to submit |
|---|---|---|
| List scrolling | Scroll the services and bookings lists with the performance monitor on | JS and UI frame rates while scrolling, with the phone model |
| Re-renders | React DevTools profiler while typing the address | Which components re-rendered, and the fix if the list did |
| Startup | Cold start to first useful screen, three runs | The times, and what you deferred (fonts, Sentry, queries) |
| Images | Photo size before and after resizing | Bytes before and after, and upload time on a throttled network |
| Bundle and app size | The AAB size in the Play Console or EAS output | The number, and one thing you removed |

Typical fixes from the lessons: memoised rows and stable renderItem, getItemLayout for fixed-height rows, no inline
objects in hot props, images sized to their box, and nothing heavy before the first screen.

## Part 6 — A signed build on the internal testing track

From Builds, Signing and Environments and Publishing to the Google Play Store (EAS and Play Console steps written from
their documentation; not run here):

    // eas.json (abridged)
    {
      "build": {
        "development": { "developmentClient": true, "distribution": "internal" },
        "preview":     { "distribution": "internal", "android": { "buildType": "apk" } },
        "production":  { "autoIncrement": true }
      },
      "submit": {
        "production": { "android": { "track": "internal", "serviceAccountKeyPath": "./play-service-account.json" } }
      }
    }

    eas build --platform android --profile production       # an AAB, signed with the upload key EAS manages
    eas submit --platform android --profile production      # to the internal testing track

Keep the service account file out of git. Enrol in Play App Signing: Google holds the app signing key and you keep the
upload key, so a lost upload key can be reset. The Play Console may require the first upload of a new app to be made
by hand before the API can submit; check the current Expo and Play Console guides. Add testers by email list, share
the opt-in link, and install from the Play Store on a phone that is not yours. Requirements for moving beyond testing
tracks (closed-testing periods, tester counts, target API levels) change: read the current Play Console Help before
planning a production release.

Point the production build at a reachable API, not 127.0.0.1: a tunnel to your laptop or a small hosted copy of the mock
API, set through an EAS environment variable (EXPO_PUBLIC_API_URL) per profile. Never put secrets in EXPO_PUBLIC_
variables: they are compiled into the bundle (Mobile App Security Basics).

## Part 7 — Crash reporting

From Crashes, Analytics and Ratings in Production and the Sentry documentation (not run here): install
@sentry/react-native, add its Expo config plugin so source maps upload during EAS builds, call Sentry.init with the DSN
early in the root layout, and wrap the root component with Sentry.wrap. Set the release and environment so a crash in
the internal build is not mixed with development noise. Add a hidden "Send test crash" item in the Account tab for
internal builds only, and submit a screenshot of that crash in Sentry with readable file names and line numbers. If
the stack shows index.android.bundle:1:48213, the source maps did not upload; fix that before demo day.

## Deliverables

1. The outbox in expo-sqlite with its tests (offline, online, replay, conflict), triggers on reconnect, foreground and
   launch, and an honest "waiting for signal" state in the UI.
2. The photo feature with the permission explained, denied and "open settings" paths, resizing, and booking without it.
3. A local reminder and push on confirmation, with an Android channel, permission at the right moment, and tap to open.
4. One Maestro flow with a recording of it passing.
5. The performance table filled with your own measurements.
6. An AAB on the internal testing track, installed by someone else, and Sentry receiving a symbolicated test crash.

## Acceptance checks (done means)

- Airplane mode on, book, airplane mode off: one booking on the server, the badge gone within a minute.
- Camera denied twice: the app explains, offers settings, and still books.
- A tester who is not you installs from the Play internal testing link.
- The Sentry event shows your file names, not bundle offsets.

## Common traps

- **Optimistic "confirmed" for a scarce slot.** It lies when the slot is gone.
- **Retrying 4xx errors from the outbox.** A 409 never succeeds; it blocks the queue for ever.
- **Measuring performance in a debug build.** The numbers mean nothing.
- **The API URL left as localhost in the release build.** The tester's phone cannot reach your laptop.`,
    mcqs: [
      mcq('In GharFix\'s outbox test, the phone sent the same booking twice and the server still held one booking. What made that safe?', [
        ['The Idempotency-Key, created once per tap and stored with the outbox row, so the server returned the first answer', true],
        ['The outbox deleting the row before sending, so the second send could not find anything left to send twice', false],
        ['TanStack Query deduplicating the two mutations, since both carried the same query key for the bookings list', false],
        ['The slot being marked taken by the first POST, so the second POST failed with 409 and created nothing new', false],
      ], 'The server stores the response per key and replays it, which is why the test printed two POSTs and one booking (Offline-First: Queues, Sync and Conflicts). Deleting before sending loses the booking if the send fails, mutations are not deduplicated by query keys, and a 409 would have shown the user an error for their own booking.'),
      ck(BASICS, 'A queued GharFix booking gets 409 slot_taken when the phone reconnects. What should the outbox do with it?', [
        ['Park it as failed with the reason, tell the user to pick another slot, and carry on with the rest of the queue', true],
        ['Keep retrying it with exponential backoff, since the slot may become free again later in the afternoon', false],
        ['Stop the whole flush and keep the row first in line, so that the order of the user\'s bookings is kept', false],
        ['Delete it silently, since the user can see on the Bookings tab that the booking never got confirmed', false],
      ], 'A 4xx that no retry can fix must leave the queue, or it blocks every later operation, and the user must be told so they can act (When the Signal Comes Back). Retrying a conflict wastes battery, stopping the flush holds other bookings hostage, and silent deletion loses the user\'s intent without a word.'),
      ck(REL, 'A tester\'s Sentry event from the GharFix internal build shows index.android.bundle:1:48213. What is wrong?', [
        ['Source maps for that release were not uploaded, so Sentry cannot map the bundle back to source files', true],
        ['The build is a debug build, since release builds never include the bundle name in their stack traces', false],
        ['Hermes is turned off, because Hermes stack traces would always show TypeScript file names by themselves', false],
        ['The tester\'s phone is rooted, which makes Sentry hide file names to protect the app\'s source code', false],
      ], 'A minified bundle has one huge line; only the uploaded source map for that exact release turns line 1, column 48213 into a file and line (Crashes, Analytics and Ratings in Production). Release builds show bundle offsets without maps, Hermes does not embed source names, and rooting has nothing to do with symbolication.'),
    ],
    assignment: {
      title: 'Capstone: Offline, Device Features and Release',
      description: 'Make your capstone app work with no signal through an outbox with idempotent replay, add a camera photo with permissions handled properly, local and push notifications, one end-to-end flow, performance measured in a release build, a signed build on the Play Store internal testing track installed by a tester, and crash reporting with readable stack traces.',
      instructions: `Extend the app from the previous unit as described in this unit's notes. Everything that needs a phone, an
EAS account, the Play Console or Sentry must be shown with real evidence (recordings, screenshots, links); state
plainly anything you could not do and why.

**Submit:**

1. The outbox in expo-sqlite with tests for offline, online, replay with the same key and a conflict, flush triggers on
   reconnect, foreground and launch, and the waiting-for-signal state in the UI.
2. The photo feature: permission asked at the moment of need with an explanation, the denied and can't-ask-again paths,
   resizing before upload, and booking without a photo.
3. Notifications: a local reminder before the slot, push on confirmation through a registered token, an Android
   channel, permission asked after the first booking, and a tap that opens the booking.
4. One Maestro flow for sign-in to booking, with a recording of it passing.
5. The performance table with your own measurements from a release build on a named phone, and one fix you made.
6. eas.json with development, preview and production profiles; the production AAB on the internal testing track; a
   screenshot of a tester's install; the API URL set per environment and no secrets in the bundle.
7. Sentry: a symbolicated test crash from the internal build, with release and environment set.
8. A five-minute recording on a phone: airplane-mode booking, camera denied, reminder arriving, and the crash in Sentry.

**Before you submit,** go through each acceptance check in the notes and point to the evidence for it.`,
      rubric: [
        { criterion: 'Offline and sync', description: 'Outbox rows are intents with idempotency keys; flush in order on three triggers with one flush at a time; retryable versus rejected handled; honest UI states; tests for replay and conflict.', maxPoints: 25 },
        { criterion: 'Device feature and permissions', description: 'Asked at the moment of need with a reason; denied and can\'t-ask-again paths; settings link; image resized before upload; the core flow works without the permission.', maxPoints: 15 },
        { criterion: 'Notifications', description: 'Local reminder scheduled and cancelled with the booking; push token registered and removed on sign-out; Android channel; permission timed well; tap opens the right screen, including from a cold start.', maxPoints: 15 },
        { criterion: 'E2E and performance', description: 'One Maestro flow passing on a device or emulator with evidence; measurements from a release build on a named phone; at least one problem found and fixed with before and after.', maxPoints: 15 },
        { criterion: 'Signed release on a testing track', description: 'Build profiles per environment; an AAB signed with the upload key and Play App Signing; on the internal testing track; installed by another person; API URL per profile; no secrets in EXPO_PUBLIC_ variables.', maxPoints: 20 },
        { criterion: 'Crash reporting and honesty', description: 'Sentry initialised early with release and environment; source maps uploaded and a symbolicated test crash shown; everything not done stated plainly.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  /* ── DEFENCE ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_CAPSTONE_DEFENCE',
    notes: `**A mobile hiring panel (a senior React Native developer, an Android engineer, sometimes the engineering
manager) wants to hold your app, not watch your slides.** Twelve minutes of demo on a real phone, twenty of questions.
This unit is the script, four live drills, the questions with what a strong answer contains, and how to rehearse.

## The twelve-minute demo

| Time | Show | Say |
|---|---|---|
| 0:00–1:00 | The app on your phone, installed from the internal testing track | Who it is for, the three things it does, the stack in one sentence |
| 1:00–3:00 | Sign in with OTP, browse, book a slot | The protected stack, the query hooks, why the slot list is only 30 seconds fresh |
| 3:00–5:30 | **Airplane mode on, book, airplane mode off** | The outbox, the idempotency key, the waiting badge, the one booking on the server |
| 5:30–7:00 | **Deny the camera, then book** | Asking at the moment of need, the denied path, the settings link |
| 7:00–8:30 | **A bug you fixed** | The symptom, how you found it, the fix and the test that now guards it |
| 8:30–10:00 | Tests and performance | npm test output, the Maestro recording, the performance table from a release build |
| 10:00–12:00 | Release and monitoring | eas.json profiles, the testing track, the symbolicated crash in Sentry, what you would do before production |

Charge the phone, turn on Do Not Disturb (but allow your own app's notifications), set the font size to default, and
mirror the screen with scrcpy or the vendor's tool so the panel can see it. Record every live step the day before. If
the venue Wi-Fi blocks your API, say so, switch to your phone's hotspot or play the recording, and carry on: the panel
is also watching how you handle a failure.

## The four drills

**Airplane-mode booking.** Practise until it takes under ninety seconds, including showing the server's bookings
endpoint (or its log) with exactly one booking afterwards. Say the sentence: "The id was made when I tapped, and the
server returns the first answer for a key it has seen."

**Kill and relaunch.** Swipe the app away, open it again: still signed in, because the refresh token is in SecureStore
and the first request refreshes the access token. Then sign out and show SecureStore is cleared.

**Token expiry.** Run the API with a 60-second access token, wait, pull to refresh on two tabs: no sign-out. Then show
the single-flight test and its output: three requests, one refresh.

**A bug you fixed.** Have one real story ready. Good capstone stories: a refresh race that signed users out; a slot
list that showed taken slots because staleTime was five minutes; a FlatList that re-rendered every row while typing
because renderItem was a new function each time; a notification tap that did nothing when the app was closed because
only the listener was wired, not getLastNotificationResponseAsync. Symptom, evidence, cause, fix, guarding test.

## The questions, and what a strong answer contains

1. **"How does React Native draw this screen?"** Components become native views; the JavaScript thread runs React, the
   UI thread renders; the new architecture's Fabric and JSI remove the old async bridge; Hermes runs the bundle
   (How React Native Works).
2. **"Where does each piece of state live?"** Server data in TanStack Query, session flag in Zustand, form state in
   react-hook-form, route params for navigation, outbox and refresh token on the device; a reason for each.
3. **"Walk me through token refresh."** Access token in memory, refresh token in SecureStore; a 401 triggers one shared
   refresh; the request replays once; a failed refresh signs out once; why rotation makes single-flight necessary.
4. **"What happens to a booking made offline?"** Outbox row with an idempotency key, honest UI, flush on three
   triggers, retryable versus rejected, conflict shown to the user.
5. **"Why not show it confirmed straight away?"** A scarce slot can be taken meanwhile; optimistic UI suits actions that
   almost always succeed.
6. **"What if the user denies the camera for ever?"** canAskAgain false; explain and offer settings; the booking never
   depends on the photo.
7. **"How did you find your slowest screen?"** A release build on a mid-range phone, the performance monitor and the
   profiler, the measurement before and after; not a debug build.
8. **"What is in your E2E test, and why only one?"** The money path from sign-in to booking; E2E is slow and costly, so
   rules live in unit and component tests.
9. **"How did a tester get the app?"** An AAB from the production profile, signed with the upload key, Play App
   Signing, the internal testing track and an opt-in link.
10. **"You find a crash an hour after release. What now?"** Sentry with source maps shows where; a JavaScript-only fix
    can go out over the air if the runtime version matches; a native change needs a new build; a staged rollout limits
    the damage (Over-the-Air Updates and Mobile CI/CD).
11. **"What would you change for a million users?"** Real backend with pagination, push at scale, analytics events that
    answer product questions, a closed test before production, crash-free rate targets, accessibility audit.
12. **"React Native or native Kotlin for this app?"** Trade-offs, not loyalty: one codebase and web-skilled teams against
    deep platform features and the last bit of performance; native modules when a feature needs Kotlin (Native Modules:
    Calling Kotlin from React Native).

## Scoring guide for reviewers

Strong: the airplane-mode drill works live and the server shows one booking; the candidate explains refresh and the
outbox without notes; a real bug story with a test; release evidence a reviewer can check. Weak: a demo only on an
emulator, "it works on my phone" with no tests, a confirmed state that lies, secrets in the bundle.

## Rehearse with these

Answer each in under a minute, aloud: the stack and why; refresh in four sentences; what the outbox does with a 409;
the one performance fix you are proudest of and its numbers; what you would do before a production release.`,
    mcqs: [
      mcq('During the GharFix demo, a panellist asks why the app stays signed in after it is swiped away and reopened. Which answer is strongest?', [
        ['The refresh token is in SecureStore; on launch the first request refreshes the in-memory access token', true],
        ['The access token is in AsyncStorage, which survives the app being swiped away from the recent apps list', false],
        ['Android keeps the JavaScript thread alive for a while after a swipe, so memory is not lost straight away', false],
        ['TanStack Query persists its whole cache to disk by default, including the session and every token in it', false],
      ], 'Secrets on the Device: SecureStore and Keystore and Login, Tokens and Refresh: the long-lived token goes in the Keystore-backed store, the short-lived one stays in memory. AsyncStorage is plain storage and wrong for tokens, a swiped app\'s process is gone, and TanStack Query does not persist by default nor hold tokens.'),
      mcq('A panellist asks: "A crash reaches users an hour after release. What do you do?" Which answer shows the most judgement?', [
        ['Find it in Sentry; ship a JS-only fix over the air if the runtime matches, or a new build; halt the rollout', true],
        ['Ask users to uninstall and reinstall the app, which clears the cache that most crashes on Android come from', false],
        ['Publish a fixed build straight to production at 100%, since a testing track would slow the fix down', false],
        ['Wait for a week of store reviews to learn which screen crashes before deciding whether a fix is needed', false],
      ], 'Over-the-Air Updates and Mobile CI/CD and Crashes, Analytics and Ratings in Production: locate with symbolicated crashes, choose OTA or binary by what changed, and limit exposure with a staged rollout. Reinstalling rarely fixes code, skipping testing risks a second bad release, and waiting for reviews wastes a week of crashes.'),
      mcq('Which "bug you fixed" story best suits the capstone demo?', [
        ['Slots taken already were offered because staleTime was 5 minutes; now 30 s plus focus refetch, with a test', true],
        ['The app looked slightly different on two phones, which I fixed by changing a colour value in the theme file', false],
        ['npm install failed once on the college Wi-Fi, which I fixed by trying it again later that evening at home', false],
        ['A teammate\'s code had a bug that I found, so I rewrote the whole feature myself over the weekend instead', false],
      ], 'A good story has a user-visible symptom, evidence, a cause rooted in a design choice, a fix and a test that guards it (Server Data with TanStack Query). A colour tweak and a flaky install show no engineering, and rewriting a teammate\'s feature is a teamwork red flag rather than a debugging story.'),
      mcq('The venue Wi-Fi blocks the GharFix API mid-demo. What should the student do?', [
        ['Say so, switch to the phone hotspot or play the recorded step, and carry on with the script', true],
        ['Stop the demo and ask the panel to reschedule, since a live demo is not valid without the API', false],
        ['Switch to the emulator on the laptop, which avoids the network because it runs on the same machine', false],
        ['Keep tapping until the requests go through, since the panel is mainly assessing the app\'s retries', false],
      ], 'Panels watch how a candidate handles failure: name it, use the prepared fallback, keep to time. Rescheduling wastes the slot, the emulator still needs a reachable API (and loses the "real phone" point), and tapping blindly burns the time meant for the story.'),
      mcq('Asked "React Native or native Kotlin for this app?", which answer shows judgement?', [
        ['React Native fits: one codebase, simple screens, web skills; Kotlin modules where a feature needs it', true],
        ['React Native always, because it compiles to the same Kotlin code a native developer would write by hand', false],
        ['Native Kotlin always, because React Native apps cannot be published on the Google Play Store at all', false],
        ['Whichever has more GitHub stars this year, since popularity decides which one hiring teams prefer', false],
      ], 'The answer weighs the app\'s needs against each stack (How React Native Works; Native Modules: Calling Kotlin from React Native). React Native does not compile to Kotlin, React Native apps ship on Play every day, and star counts say nothing about this app.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_CAPSTONE_CHECKPOINT',
    notes: `Ten scenario questions across the whole Mobile App Development track: TypeScript, React Native and Expo,
navigation, state and server data, storage and offline, device features, auth and security, testing and performance,
and release, at the level a mobile hiring panel expects. Choose what you would actually do, and be ready to say why.`,
    checkpoint: [
      ck(TS, 'A bus-booking app\'s seat can be { kind: \'available\' } or { kind: \'held\'; until: string } or { kind: \'sold\'; pnr: string }. How should a component read pnr safely?', [
        ['Narrow with a switch on seat.kind; inside the sold case TypeScript knows pnr exists', true],
        ['Cast with (seat as any).pnr, since the value is there whenever the seat is sold', false],
        ['Make pnr optional on every variant, so all three kinds can be read the same way', false],
        ['Check typeof seat === \'object\' first, which tells TypeScript that pnr is defined', false],
      ], 'A discriminated union narrows on its tag (Interfaces, Type Aliases, Unions and Narrowing), so the compiler allows pnr only where it exists. any switches the checker off, optional fields on every variant lose the guarantee, and typeof object narrows nothing between the variants.'),
      mcq('A grocery app shows 2,000 products in a ScrollView with map(), and scrolling stutters on a budget Android phone. What is the first fix?', [
        ['Use FlatList with keyExtractor and a memoised row, so only rows near the screen are rendered', true],
        ['Wrap the whole ScrollView in React.memo, so it never re-renders after the first full render', false],
        ['Move the product list into Redux, since global state renders long lists faster than props', false],
        ['Turn off Hermes, because its garbage collector is what pauses long scrolling lists on Android', false],
      ], 'ScrollView renders every child up front; FlatList virtualises (Lists: FlatList, SectionList and Performance). Memoising the container does not stop 2,000 rows being mounted, where state lives does not change rendering cost here, and Hermes is not the cause.'),
      mcq('In an Expo Router app, an order screen opened from a notification shows "undefined" for the order id. The handler pushes \'/orders\' and puts the id in a global store. What is the better design?', [
        ['Push \'/orders/[id]\' with the id as a route param, so the screen reads it from the route', true],
        ['Await a short timeout before pushing, so that the global store is updated before the screen', false],
        ['Read the id from AsyncStorage on the order screen, written by the handler just beforehand', false],
        ['Reload the app on every notification tap so all stores start in a known state before routing', false],
      ], 'Route params make the screen self-contained, which also makes deep links and process restore work (Deep Links and Universal Links). Timeouts and storage hand-offs are races, and reloading the app is slow and still does not tell the screen which order to show.'),
      ck(TS, 'A form library returns values typed as { qty: string } but the API needs a number. Where should the conversion live?', [
        ['In the zod schema with z.coerce.number().int().min(1), so the parsed form value is a number', true],
        ['In the API client, which converts every string field it sends into a number automatically before sending', false],
        ['In the server only, since the server can accept "2" and convert it before saving it', false],
        ['In the TypeScript type, by declaring qty: number so the compiler converts it when it runs', false],
      ], 'A schema both validates and transforms, and its inferred type tells the rest of the app qty is a number (Typing API Data and Runtime Validation; Forms and Validation). Blanket conversion in the client breaks real string fields, relying on the server leaks bad types through the app, and types never convert values at runtime.'),
      ck(BASICS, 'A field-sales app saves visits offline and syncs later. Two visits are queued; the first gets HTTP 503 on reconnect. What should the sync do?', [
        ['Stop, keep both in order, and retry later with backoff and jitter', true],
        ['Drop the first visit and send the second, so the queue keeps moving', false],
        ['Retry the first visit at once in a loop until the server accepts it', false],
        ['Mark both visits as failed and ask the user to enter them again later', false],
      ], 'A 5xx is retryable, so the operation stays and the queue waits, preserving order; backoff with jitter keeps thousands of phones from retrying together (Offline-First: Queues, Sync and Conflicts). Dropping loses data, a tight loop hammers a struggling server, and failing both throws away work a retry would save.'),
      mcq('A food-delivery app asks for location, camera, contacts and notifications on its first screen. Users deny most of them. What is the fix?', [
        ['Ask for each permission when the feature that needs it is used, after explaining why', true],
        ['Ask again on every launch until the user grants every permission the app requests', false],
        ['Bundle all four into one custom dialog first, so the user sees one request, not four', false],
        ['Remove the denied paths, since the app cannot work properly without all permissions', false],
      ], 'Permissions Done Right: a request in context with a reason is granted far more often, and after repeated denials the system stops showing the dialog. Nagging hits "don\'t ask again", a custom dialog still triggers four system prompts, and the app must work with what it is given.'),
      mcq('A mobile app stores its API key for a paid maps service in an EXPO_PUBLIC_ variable. What is the risk and the fix?', [
        ['The key ships inside the bundle where anyone can extract it; call the service through your backend or restrict the key', true],
        ['There is no risk, because EXPO_PUBLIC_ variables are encrypted by EAS Build before they are placed in the bundle', false],
        ['The key expires when the app is updated over the air, so it must be fetched again after every single update', false],
        ['The variable is only read in development builds, so a production build simply has no key and maps will not load', false],
      ], 'Mobile App Security Basics: anything in the app can be read from the APK, and EXPO_PUBLIC_ values are inlined in plain text. Keep secrets on a server, or use keys restricted to your app\'s package and signature. They are not encrypted, OTA does not expire keys, and production builds do include them.'),
      mcq('A component test for a login screen uses getByTestId(\'btn-2\') and breaks whenever the layout changes. What does Testing Library recommend?', [
        ['Query by role and accessible name, like getByRole(\'button\', { name: \'Verify\' })', true],
        ['Use snapshot tests of the whole screen, so that every change is caught at once', false],
        ['Query by the component\'s display name, which stays stable across layout changes', false],
        ['Add a longer timeout to the query, so the button has time to reach its position', false],
      ], 'Unit and Component Tests with Jest and Testing Library: query the way a user (and a screen reader) finds things, which also checks accessibility. Snapshots break on every change without saying what matters, display names are implementation details, and the failure has nothing to do with timing.'),
      ck(REL, 'A team fixed a wrong discount label in JavaScript and also added a new native camera library. Can both go out as one over-the-air update?', [
        ['No: the JS fix can go over the air, but the native library needs a new build through the store', true],
        ['Yes: EAS Update ships both, because it replaces the whole app binary on the user\'s phone', false],
        ['Yes, if the update is marked critical, which lets it install native code without the store', false],
        ['No: neither can, since any change to a released app must go through store review again', false],
      ], 'Over-the-Air Updates and Mobile CI/CD: an update replaces the JavaScript bundle and assets for a matching runtime version; native code changes the runtime and needs a binary. OTA never replaces the binary, no flag lets it ship native code, and JavaScript fixes within store policy do not need a new review.'),
      ck(REL, 'A team wants real users to try a build before production without any public listing. Which Play Store route fits first?', [
        ['The internal testing track, with testers added by email and an opt-in link', true],
        ['A production release at 1% rollout, which keeps the app hidden from search', false],
        ['Sharing the debug APK in a WhatsApp group, which counts as a closed test', false],
        ['Uploading the AAB as a draft, which lets anyone with the link install it', false],
      ], 'Publishing to the Google Play Store: testing tracks deliver signed builds to named testers through the Play Store itself. A staged production rollout is public, a debug APK is not a release build and is not a Play track, and drafts cannot be installed by testers.'),
    ],
  },
];
