/**
 * Career-track content: Auth, APIs and Mobile Security (MB_AUTH_API), Mobile, batch MB3.
 *
 * The network and token side of a React Native app: an API layer that copes with slow, hanging and failing mobile
 * networks; OTP login with access and refresh tokens, a refresh that runs once when many requests fail together, and
 * logout everywhere; OAuth with PKCE through expo-auth-session and Sign in with Google; and mobile security basics on
 * OWASP MASVS lines, defensive and on apps the student owns. It builds on Year 3's "Calling an API From a Device" and
 * "A Login That Survives a Restart", on "Structuring a React Native Codebase" (the getJson seam and EXPO_PUBLIC_ config)
 * and on "Auth Flows and Protected Screens" (the signed-in and signed-out screens and session restore, not repeated here).
 *
 * The app is ThaliGo, the fictional Hyderabad food-delivery startup from the navigation topic. Every output quoted is
 * real: a local Express API (OTP login, rotating refresh tokens with reuse detection, logout-all, a protected route,
 * slow and flaky routes, and a small OAuth server that checks PKCE) driven by Jest from TypeScript client code; zod 4;
 * babel-preset-expo from Expo SDK 58 for the bundle-inlining test; a React Native Testing Library render of the
 * orders screen with jest-expo; tsc --strict clean on all of it (24 tests passing). Not run: anything on a phone or
 * emulator, the browser redirect of a real OAuth sign-in, Google Sign-In, SMS autofill, certificate pinning on a device
 * and Android network security config; those parts are written from docs.expo.dev, reactnavigation.org,
 * developer.android.com, the expo-auth-session 58 type definitions, RFC 7636 and the OWASP MASVS.
 *
 * Skills: REACT_NATIVE, with REST_APIS for the API-layer lesson and API questions elsewhere.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_MB_AUTH_API_BUNDLES: PilotBundle[] = [
  /* ── API_LAYER ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_AUTH_API_API_LAYER',
    notes: `Year 3's "Calling an API From a Device" gave the rules: a phone network hangs rather than fails, so every
request needs a timeout; a request must stop when its screen goes; retry timeouts and 5xx, never a 400; and anything
that writes needs an idempotency key. "Structuring a React Native Codebase" gave the seam: screens call hooks, hooks
call a feature api file, and one getJson validates responses with zod. This lesson turns those rules into ThaliGo's
real API layer, run against a small local Express server from Jest.

## One place that knows the base URL

    // src/lib/config.ts
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!apiUrl) throw new Error('EXPO_PUBLIC_API_URL is not set');
    export const config = { apiUrl } as const;

Development, staging and production differ only in that value, set per EAS build profile. Two traps on Android: the
emulator reaches your laptop's localhost as 10.0.2.2, and a real phone needs the laptop's LAN IP, which changes when
the Wi-Fi does. Release builds should talk https only (the security lesson explains why plain http fails there).

## One error type with honest kinds

A user does not care that fetch threw a TypeError. They care whether they are offline, the network is slow, or
ThaliGo is broken. So the layer turns every failure into one of five kinds:

    export type ApiErrorKind = 'timeout' | 'offline' | 'cancelled' | 'http' | 'bad_response';

    export class ApiError extends Error {
      constructor(public kind: ApiErrorKind, message: string, public status?: number, public body?: unknown) {
        super(message);
      }
      get retryable(): boolean {
        return this.kind === 'timeout' || this.kind === 'offline' ||
          (this.kind === 'http' && (this.status === 429 || (this.status ?? 0) >= 500));
      }
    }

## A timeout fetch does not have

fetch has no timeout option. You build one with an AbortController, and you must also respect the caller's signal
(TanStack Query passes one; it fires when the screen unmounts). Keep the two apart, because "the network gave up" is
an error to show and "the user left" is not:

    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, opts.timeoutMs ?? 10000);
    const onCallerAbort = () => controller.abort();
    opts.signal?.addEventListener('abort', onCallerAbort);
    try {
      return await fetchFn(config.baseUrl + path, { method, headers, body, signal: controller.signal });
    } catch (e) {
      if (timedOut) throw new ApiError('timeout', 'No response in ' + (opts.timeoutMs ?? 10000) + ' ms');
      if (opts.signal?.aborted) throw new ApiError('cancelled', 'Request cancelled');
      throw new ApiError('offline', 'Network request failed');
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener('abort', onCallerAbort);
    }

AbortSignal.timeout and AbortSignal.any exist in Node and browsers; check your React Native version before relying on
them. The hand-written form above works everywhere. Against the local server's /slow route, which never answers:

    slow: timeout No response in 800 ms after ~ 800 ms
    cancel: cancelled false        (screen's controller aborted after 100 ms; not retryable)
    refused: offline true          (nothing listening on the port)

A new controller per request matters: one shared controller, once aborted, aborts every later request too.

## Check the status before parsing

The first version called JSON.parse on every body. A wrong path on the server returned Express's HTML 404 page, and
the app reported:

    kind bad_response status undefined message SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON

Proxies, gateways and captive Wi-Fi portals all send HTML. Check res.ok first and keep the status:

    const text = await res.text();
    if (!res.ok) throw new ApiError('http', 'HTTP ' + res.status, res.status, safeJson(text));

## Retry the right things, with backoff and jitter

    export function backoffMs(attempt: number, baseMs = 500, capMs = 8000, random = Math.random): number {
      return Math.round(random() * Math.min(capMs, baseMs * 2 ** attempt));
    }

The ceiling doubles per attempt and is capped: [500, 1000, 2000, 4000, 8000, 8000] ms. "Full jitter" picks a random
wait under the ceiling, so ten thousand phones that lost signal in the same metro tunnel do not all hit the server
in the same millisecond when they come out. Only GETs, or writes that carry an Idempotency-Key the server honours,
are retried. With the server set to fail twice (random fixed at 1 so the waits are visible):

    attempt 0: http 503
    attempt 1: http 503
    attempt 2: ok
    waits [ 500, 1000 ]

And a 404 for a menu that does not exist: "404: http 404 server saw 1 call(s)". Retrying it would only repeat the
same answer. A 429 should also respect Retry-After when the server sends one.

Pick one owner for retries. TanStack Query retries failed queries three times by default; on top of a layer that
already retries twice that is up to twelve requests. Set retry: false on the query, or let the query own retries and
keep the layer at zero.

## Validate at the edge

The response schema is part of the request, so request<T>(path, schema) returns data of the schema's type or throws.
When the backend sent ids as strings and dropped a field:

    bad shape: bad_response | orders.0.id: Invalid input: expected number, received string;
      orders.0.totalPaise: Invalid input: expected number, received undefined

## Showing the network's real states

A screen has more than "loading, error, data": pending, offline, slow, server error, empty and data, each with its own
words and a Try again. Never a spinner without a timeout behind it.

    if (q.isError) {
      const e = q.error instanceof ApiError ? q.error : null;
      const message = e?.kind === 'offline' ? 'You are offline. We will try again when you are back.'
        : e?.kind === 'timeout' ? 'The network is slow right now.'
        : 'Something went wrong on our side.';
      ...
    }

A Testing Library render with fetch failing three times and then succeeding: the offline message appeared after 3
fetch calls (one try plus two retries), and pressing Try again showed "#4521 Annapurna Tiffins" after the 4th.

## Patchy 4G

Most ThaliGo users are on mid-range Android phones on a congested network. Round trips cost more than bytes: one
/home call that returns banners, restaurants and active orders beats four calls. Ask for the fields the screen needs,
paginate with cursors, compress images on the server, and cache what does not change (TanStack Query's staleTime).`,
    workedExample: `**Scenario.** ThaliGo's order history spins forever for users in Old City on evening 4G. Support has screenshots,
no crash reports. Make the screen behave, and prove it without a phone.

**Step 1: reproduce the hang.** The local server's /slow route accepts the connection and never answers, which is
what a dead cell tower does. The old code was a bare fetch, so the test waited for Jest's own timeout. That is the bug:
nothing in the app ever gives up.

**Step 2: add the timeout and the kinds.** request() now aborts after timeoutMs and throws ApiError('timeout').
The test prints "slow: timeout No response in 800 ms after ~ 800 ms" (the app uses 8000 ms; the test uses 800 to stay
fast).

**Step 3: decide who retries.** The hook:

    export function useOrders() {
      return useQuery({
        queryKey: ['orders'],
        queryFn: ({ signal }) => api.request('/orders', Orders, { signal, timeoutMs: 8000 }),
        retry: false, // the API layer already retried what is safe to retry
      });
    }

The signal is passed through, so leaving the screen cancels the request and reports 'cancelled', which the screen
ignores rather than showing an error to someone who has already gone.

**Step 4: words for each state.** Offline, slow and server error each get their own sentence and a Try again
button (accessibilityRole="button" so TalkBack announces it). Worst-case wait is now bounded: three attempts of 8 s
plus at most 1.5 s of backoff, about 25 s. Product may reasonably ask for a shorter timeout on this screen;
the number is now a decision instead of an accident.

**Step 5: test the states.** With jest-expo and Testing Library, global fetch rejects three times with
TypeError('Network request failed') and then resolves:

    fetch calls before Try again: 3
    fetch calls after Try again: 4

The test finds "You are offline. We will try again when you are back.", presses the button by role and name, and
then finds "#4521 Annapurna Tiffins". It passed. A device check on a throttled network is still worth doing before
release; the logic no longer depends on it.`,
    mcqs: [
      mcq('ThaliGo\'s request() aborts after 8 s, and the screen\'s TanStack Query signal also aborts it on unmount. Why keep a timedOut flag?', [
        ['Both aborts raise the same AbortError, and only the timeout is an error to show', true],
        ['fetch ignores the second AbortController, so the flag is the one way to stop it', false],
        ['Without the flag, clearTimeout cannot find the timer that the request started', false],
        ['The flag tells TanStack Query to retry the request after the screen remounts', false],
      ], 'Both paths end in the same AbortError from fetch, so the flag is how the layer tells "the network gave up" (timeout, shown to the user) from "the user left" (cancelled, ignored). fetch takes one signal and honours it; clearTimeout uses the timer id, not a flag; and TanStack Query does not read it.'),
      mcq('A GET to /menu/999 returns 404. ThaliGo\'s layer is set to retries: 3. How many requests should the server see?', [
        ['One, because a 404 is a final answer that a retry repeats', true],
        ['Four, the first request and then all three of the retries', false],
        ['Two, since one retry confirms that the 404 was not a blip', false],
        ['None, because the client should cache the 404 from before', false],
      ], 'Retries are for failures that may pass: timeouts, no network, 429 and 5xx. The server understood the request and said the menu does not exist; the test showed one call. Four requests is what a retry-everything layer does, a confirming retry wastes a round trip on a slow network, and there is no earlier 404 to cache.'),
      mcq('The first ThaliGo client logged "SyntaxError: Unexpected token \'<\'" when the server returned 404. What was the fix?', [
        ['Check res.ok before JSON.parse and keep the HTTP status in the error', true],
        ['Wrap JSON.parse in a try/catch and return an empty object on any failure', false],
        ['Send Accept: application/json so the server cannot reply with HTML', false],
        ['Parse with res.json() instead of res.text() followed by JSON.parse', false],
      ], 'The body was an HTML error page; parsing it first threw away the 404. Checking the status first gives an http error with status 404. Returning {} hides the failure, Accept is a request a proxy or captive portal ignores, and res.json() throws the same SyntaxError.'),
    ],
    checkpoint: [
      mcq('Ten thousand ThaliGo phones lose signal in the same metro tunnel and reconnect together. What stops their retries hitting the API at once?', [
        ['A random wait under a doubling ceiling, known as full jitter', true],
        ['A fixed one-second wait before each retry, the same on every client', false],
        ['Retrying immediately so that the queue clears quickly', false],
        ['Retrying POST requests first, then the GET requests', false],
      ], 'Full jitter spreads the retries over the whole window, and the doubling ceiling backs off further each time. A fixed delay keeps every phone in step, so they arrive together one second later; immediate retries are the stampede itself; and the order of methods does not spread the load.'),
      mcq('A ThaliGo query uses TanStack Query\'s default retry while the API layer also retries twice. What is the problem?', [
        ['Retries multiply: up to twelve requests for one failing screen', true],
        ['TanStack Query turns off the API layer retries on its own', false],
        ['The first error is lost, so the screen shows a blank white state forever', false],
        ['Query retries only run after the app goes to the background', false],
      ], 'Three attempts from the layer inside four attempts from the query is twelve requests, on the network least able to carry them. Choose one owner. TanStack Query knows nothing about the layer\'s retries, the error is not lost (it arrives late), and its retries run in the foreground.'),
      ck('REACT_NATIVE', 'ThaliGo\'s orders screen shows one "Something went wrong" for every failure. What should it show instead?', [
        ['Separate words for offline, slow and server error, each with Try again', true],
        ['A spinner that stays until the request finally succeeds or fails', false],
        ['The raw error message from fetch, so that support can read it', false],
        ['An empty list, because no orders is the safest thing to show', false],
      ], 'The layer\'s error kinds exist so the screen can tell the user what is happening and what to do. A spinner with no end is the original bug; "Network request failed" means nothing to a customer; and an empty list tells someone with orders that they have none.'),
    ],
  },

  /* ── AUTH_TOKENS ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_AUTH_API_AUTH_TOKENS',
    notes: `Year 3's "A Login That Survives a Restart" explained why a phone holds two tokens: a short-lived access token used on
every request, and a long-lived refresh token kept in hardware-backed storage, used only to get new access tokens and
revocable on the server. "Auth Flows and Protected Screens" built the screens: restoring, signed out, signed in, and
one signOut path. This lesson is the network between them: OTP login, refresh, and logout, run against a local
Express server.

## OTP login, the Indian default

Most Indian consumer apps sign in with a phone number and a six-digit SMS code. Two endpoints:

    POST /auth/otp/request  { phone }          -> { sent: true, resendAfterSec: 30 }
    POST /auth/otp/verify   { phone, otp }     -> { accessToken, refreshToken, expiresIn }

The server rules matter as much as the app's:

- **Same answer whether the number has an account or not.** Otherwise the endpoint tells anyone which numbers use
  ThaliGo.
- **Limit requests per number.** SMS costs money and can be abused to flood a stranger's phone. The local server
  allows three in ten minutes; the fourth returned "429 Retry-After=600".
- **Limit guesses per code.** Six digits is a million codes. Five wrong guesses and the code is dead:
  "400 otp_wrong" five times, then "429 too_many_attempts".
- **Expire codes in minutes and compare in constant time** (crypto.timingSafeEqual).
- **Never return the code in the response.** The test server has an exposeOtpForTests switch so Jest can log in; a
  switch like that left on in production is a full account takeover.

On the phone, let the OS fill the code:

    <TextInput
      keyboardType="number-pad"
      autoComplete="sms-otp"          // Android autofill
      textContentType="oneTimeCode"   // iOS suggests the code from Messages
      maxLength={6}
      onChangeText={(t) => setOtp(t.replace(/\\D/g, '').slice(0, 6))}
    />

Android's SMS Retriever and SMS User Consent APIs can read the code without the READ_SMS permission, which Play
restricts; they need a native module and, for the Retriever, a hash in the message. Check the current Android docs
before choosing one.

## What is in the access token

ThaliGo's access token is a JWT signed by the server: { sub: 'u1', ver: 0, exp: ... }. The app never verifies it and
never trusts its own reading of it; the server checks the signature, the expiry and ver on every request:

    const claims = jwt.verify(token, secret, { algorithms: ['HS256'] });
    const user = byId.get(claims.sub);
    if (!user || claims.ver !== user.tokenVersion) return res.status(401).json({ error: 'token_revoked' });

The access token lives in memory only. The refresh token goes to expo-secure-store ("Secrets on the Device:
SecureStore and Keystore" covers why). Nothing goes to AsyncStorage, logs or crash reports.

## Refresh once, even when five requests fail together

The Home screen fires five requests at launch: banners, restaurants, active order, wallet, offers. The access token
expired overnight, so all five get 401 at the same moment. A naive interceptor refreshes in each of them. The server
rotates refresh tokens (each one works once) and treats a used one as theft. Real output with the access token set to
expire after 1 second:

    singleFlight=false
      results: ok, FAIL 401, FAIL 401, FAIL 401, FAIL 401
      /auth/refresh calls: 5, reuse detected: 1
      server log: refresh ok | refresh REUSED: family 7a2b114c revoked | refresh rejected: unknown or revoked | ...
      app events: signed out: refresh_failed, signed out: refresh_failed, signed out: refresh_failed, signed out: ...

One refresh won, the second presented the same (now used) token, the server revoked the whole family including the
fresh one, and the user was signed out four times over, for doing nothing wrong. The fix is a shared promise:

    let refreshing: Promise<string> | null = null;

    function refreshOnce(): Promise<string> {
      if (!refreshing) {
        refreshing = doRefresh().finally(() => { refreshing = null; });
      }
      return refreshing;
    }

Every request that gets a 401 awaits the same promise, then replays once with the new token. A second 401 after the
replay is not refreshed again; that is how loops are avoided. The same five requests after the fix:

    singleFlight=true
      results: ok, ok, ok, ok, ok
      /auth/refresh calls: 1, reuse detected: 0

The refresh call itself must not go through the interceptor, or a 401 from /auth/refresh triggers a refresh.

## Rotation and reuse detection on the server

    if (rec.used) {
      for (const r of refreshTokens.values()) if (r.family === rec.family) r.revoked = true;
      return res.status(401).json({ error: 'refresh_reused' });
    }
    rec.used = true;
    res.json(issueTokens(user, rec.family));

The server stores a hash of each refresh token, not the token. A replayed token means a thief or a buggy client; the
server cannot tell which, so it ends the session. That is why the client bug above logs real users out.

## Logout, and logout everywhere

Logout clears the phone first, then tells the server, and does not wait for the network:

    async logout() {
      const refreshToken = await store.getRefresh();
      await signOutLocally('user_logout');      // works with no signal
      if (refreshToken) await api.request('/auth/logout', ...).catch(() => { /* retry later */ });
    }

With the server stopped: "offline logout events: [ 'signed out: user_logout' ] store empty: true".

"Log out of all devices" (after a lost phone) revokes every refresh token of the user and bumps tokenVersion, so
access tokens already issued fail too, not only after they expire. Two signed-in clients, phone A calls logout-all:

    phone A events: [ 'signed out: logout_everywhere' ]
    phone B request: http 401 invalid_refresh
    phone B events: [ 'signed out: refresh_failed' ]
    phone B refresh token kept? false

Phone B's next request got 401, its refresh was refused, and it went through the same signOut path as any other
failure. Without the version check, phone B would keep working until its access token expired; keep access tokens
short (minutes) if you cannot check a version on each request.`,
    workedExample: `**Scenario.** ThaliGo's crash-free rate is fine, but support says "the app logs me out every morning". Analytics
shows signed out: refresh_failed spikes at 8 to 9 am, when people open the app for the first time that day.

**Step 1: form a hypothesis from the timing.** First open of the day means the access token has expired, and the
Home screen sends five requests at once. If each refreshes on its own and the server rotates refresh tokens, the
second refresh presents a used token.

**Step 2: reproduce it in a test, not on a phone.** Start the local server with accessTtlSec: 1 and refreshDelayMs: 50
(so the five refreshes overlap, as they do on a slow network), log in with OTP, wait 2.1 s, then:

    const results = await Promise.allSettled(Array.from({ length: 5 }, () => auth.authed('/orders', Orders)));

Output: one ok, four 401s, five /auth/refresh calls, "refresh REUSED: family 7a2b114c revoked", and the app
signed out. The hypothesis is confirmed with the server's own log.

**Step 3: fix the client, not the server.** It is tempting to make the server accept a used token "for a few
seconds". That weakens theft detection for every user to hide a client bug. Instead, refreshOnce() shares one
in-flight promise, and the promise is cleared in finally so the next expiry refreshes again.

**Step 4: re-run the same test.** Five ok, one refresh call, zero reuse. Keep the test with singleFlight both off
and on (test.each), so the race and the fix are both documented in the suite.

**Step 5: check the edges.** A refresh that fails with 401 calls the one signOut path. A refresh that fails because
the phone is offline does not sign the user out: it throws an offline error, and the screen shows the offline
state. Signing someone out because a train went into a tunnel is the other common version of this bug.`,
    mcqs: [
      mcq('ThaliGo\'s Home screen sends five requests with an expired access token. With rotating refresh tokens, what does a per-request refresh cause?', [
        ['The server sees a used refresh token, revokes the family and signs the user out', true],
        ['Five valid sessions are created, which the server merges into one at next login', false],
        ['Four refresh calls wait in a queue on the server until the first one has finished', false],
        ['The requests succeed, only slower, because each one fetches its own access token', false],
      ], 'The test showed it: one refresh succeeded, the next presented the same token after it was used, and reuse detection revoked the family, signing the user out. The server does not merge sessions or queue refreshes, and the four requests failed rather than succeeding slowly.'),
      mcq('In refreshOnce(), why is the shared refreshing promise reset in finally() rather than after a successful refresh only?', [
        ['A failed refresh would otherwise stay cached, so later calls get the old failure', true],
        ['finally() runs before the promise settles, so waiting requests get the token sooner', false],
        ['JavaScript does not allow a variable to be set to null inside a then() callback', false],
        ['Resetting in finally() makes the refresh call bypass the 401 interceptor', false],
      ], 'If only success cleared it, a refresh that failed (offline, say) would leave a rejected promise in place and every later 401 would await that same old rejection. finally runs after settling, not before; null can be assigned anywhere; and keeping /auth/refresh out of the interceptor is a separate rule.'),
      mcq('After "log out of all devices", phone B\'s first request fails even though its access token has not expired. What made it fail?', [
        ['The server bumped tokenVersion, so the ver claim no longer matches', true],
        ['Phone B checked its own JWT expiry and found that it had changed', false],
        ['A push message from the server deleted phone B\'s stored tokens', false],
        ['The JWT signature changes whenever the user logs out anywhere', false],
      ], 'Logout-all revoked every refresh token and incremented the user\'s version; the server rejects any access token whose ver is older. The phone does not re-read expiry, no push was sent (the test had none), and the signing key did not change, so the signature still verified.'),
    ],
    checkpoint: [
      ck('REST_APIS', 'Why does ThaliGo\'s POST /auth/otp/request return { sent: true } whether or not the number has an account?', [
        ['So the endpoint cannot be used to find out which numbers use ThaliGo', true],
        ['So that new users are signed up automatically as soon as the code arrives', false],
        ['Because the SMS gateway cannot report if a number is registered', false],
        ['To keep the response the same size, so caching works on the phone', false],
      ], 'Different answers would let anyone test a list of numbers for accounts (user enumeration). Sign-up is a separate decision, the gateway is irrelevant because the server knows its own users, and caching an OTP request response is not wanted at all.'),
      mcq('Where should ThaliGo keep the access token and the refresh token on the phone?', [
        ['Access token in memory; refresh token in expo-secure-store', true],
        ['Both in AsyncStorage, so they survive an app restart together', false],
        ['Both in expo-secure-store, read from it before every request', false],
        ['Refresh token in memory; access token in expo-secure-store', false],
      ], 'The access token is short-lived and used constantly, so memory is enough and nothing is written to disk; the refresh token must survive restarts and is the valuable one, so it goes to the Keystore-backed store. AsyncStorage is plain files, reading SecureStore before every request is slow for no gain, and the reversed layout loses the session on every restart.'),
      mcq('A ThaliGo refresh fails because the phone has no signal. What should the app do?', [
        ['Show the offline state and keep the session for when the network returns', true],
        ['Sign the user out, since the session could not be confirmed with the server', false],
        ['Retry the refresh in a tight loop until the network comes back again', false],
        ['Delete the access token but keep the user on the screen they were using', false],
      ], 'Only a refusal from the server (401) ends a session; no network is an offline state. Signing out in a tunnel is a common bug, a tight retry loop drains battery and data, and deleting the access token alone just forces another refresh that also cannot reach the server.'),
    ],
  },
  /* ── OAUTH ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_AUTH_API_OAUTH',
    notes: `ThaliGo wants "Continue with Google" next to the phone number, and its corporate-lunch product wants staff of
client companies to sign in with their employer's identity provider. Both are OAuth 2.0 with OpenID Connect. The app
never sees the user's password: a browser shows the provider's login page, the provider sends the app back a
one-time **authorization code**, and the code is exchanged for tokens.

## Why a mobile app cannot keep a client secret

A web backend proves who it is at the token step with a client secret held on its server. A mobile app has no server
of its own on the phone. Anything compiled into it, a secret included, can be pulled out of the APK by anyone who
downloads it (the security lesson shows a value being read out of a built bundle). So OAuth treats a mobile app as a
**public client**: no secret, and something else has to stop a stolen code being useful.

## The attack PKCE stops

The provider returns the code to a redirect URI such as thaligo://oauth. On Android, another app can register the
same custom scheme. If it receives the redirect, it holds a valid code. Without more, it could exchange the code for
the user's tokens.

PKCE (Proof Key for Code Exchange, RFC 7636) binds the code to the app instance that started the flow:

1. The app makes a random **code_verifier**: 43 to 128 characters from A-Z a-z 0-9 - . _ ~
2. It sends **code_challenge = BASE64URL(SHA-256(code_verifier))** with code_challenge_method=S256 on the
   authorization request. The verifier stays in the app's memory.
3. At the token step it sends the code **and the verifier**. The server hashes the verifier and compares it with the
   challenge it stored with the code.

An app that steals the code never saw the verifier, and cannot work it out from the challenge, because SHA-256 cannot
be reversed.

## Computing and checking the pair, for real

    export function toBase64Url(b64: string): string {
      return b64.replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
    }
    export async function challengeFor(verifier: string, sha256Base64: (s: string) => Promise<string>) {
      return toBase64Url(await sha256Base64(verifier));
    }

In the app, the hash comes from expo-crypto (Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, v,
{ encoding: Crypto.CryptoEncoding.BASE64 })); in the test, from node:crypto. RFC 7636 Appendix B's example:

    verifier  dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
    challenge E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM

matching the RFC exactly. The encoding is where hand-written PKCE goes wrong. The same digest printed three ways:

    hex       13d31e961a1ad8ec2f16b10c4c982e0876a878ad6df144566ee1894acb70f9c3
    base64    E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw+cM=
    base64url E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM

Only the last is a challenge. expo-crypto's digestStringAsync returns hex unless you ask for base64.

The local test server includes a tiny authorization server that stores the challenge with each code and checks the
verifier. Four exchanges:

    'stolen code, no verifier':      '400 invalid_grant (PKCE verification failed)'
    'stolen code, guessed verifier': '400 invalid_grant (PKCE verification failed)'
    'app, right verifier':           '200 tokens issued'
    'same code again':               '400 invalid_grant'

Codes are single-use: the second exchange of a good code fails too.

## expo-auth-session does this for you

    import * as AuthSession from 'expo-auth-session';
    import * as WebBrowser from 'expo-web-browser';

    WebBrowser.maybeCompleteAuthSession(); // at module scope: lets the web build close the popup

    const redirectUri = AuthSession.makeRedirectUri({ scheme: 'thaligo', path: 'oauth' }); // thaligo://oauth in a dev build

    export function CorporateSignIn() {
      const discovery = AuthSession.useAutoDiscovery('https://login.acme-corp.example/realms/staff');
      const [request, response, promptAsync] = AuthSession.useAuthRequest(
        { clientId: 'thaligo-app', redirectUri, scopes: ['openid', 'profile', 'email'] },
        discovery,
      );
      useEffect(() => {
        if (response?.type !== 'success' || !request?.codeVerifier || !discovery) return;
        AuthSession.exchangeCodeAsync(
          { clientId: 'thaligo-app', code: response.params.code, redirectUri,
            extraParams: { code_verifier: request.codeVerifier } },
          discovery,
        ).then((tokens) => signInWithProvider(tokens.idToken));
      }, [response]);
      return <Button title="Sign in with your company" disabled={!request} onPress={() => promptAsync()} />;
    }

From the installed version's source (58.0.15): usePKCE defaults to true, the method defaults to S256, plain is
refused, the verifier is 128 characters, and a random state is sent and compared on return (a mismatch gives
state_mismatch). The browser part (promptAsync opening the provider, the redirect coming back) needs a real device
or emulator and a registered client, so it was not run here; the same library calls are written from its types and
docs.expo.dev.

## The system browser, never a WebView

promptAsync opens a Custom Tab on Android and ASWebAuthenticationSession on iOS. The user sees the real provider
address bar, may already be signed in, and your app cannot read what they type. In an embedded WebView your app
could read the password, which is why Google refuses sign-in from embedded WebViews.

## Redirect URIs

The provider only redirects to URIs registered for the client, character for character. A dev build uses
thaligo://oauth; Expo Go uses an exp:// address that changes with your machine, so OAuth testing belongs in a dev
build. Where the provider supports it, an https App Link you have verified ("Deep Links and Universal Links") is
harder for another app to claim than a custom scheme.

## Sign in with Google specifically

In expo-auth-session 58 the Google provider is marked deprecated, and Expo's Google authentication guide points to
the native @react-native-google-signin/google-signin library, which uses the platform's own account picker
(Credential Manager on Android) and needs a dev build. Two facts you will meet in either route:

- An **Android OAuth client** in Google Cloud is identified by package name plus the SHA-1 of the signing
  certificate. Debug, upload and Play App Signing keys each have their own SHA-1.
- The app ends up with a Google **ID token**. Send it to your backend, which verifies the signature against Google's
  keys and checks aud (your client ID), iss and exp, then finds or creates the ThaliGo user and issues ThaliGo's own
  access and refresh tokens, exactly as in "Login, Tokens and Refresh". Never accept an email address the app sends
  as proof of who the user is.`,
    workedExample: `**Scenario.** ThaliGo's corporate-lunch customers use an OpenID Connect provider at login.acme-corp.example. The
mobile lead asks for sign-in with that provider, no secrets in the app, and a test that proves the PKCE part is right
before anyone touches a phone.

**Step 1: register the client.** On the provider: a public client (no secret), standard flow (authorization code),
PKCE required with S256, redirect URI thaligo://oauth. In app.json, "scheme": "thaligo" so the dev build owns it.

**Step 2: write the PKCE helpers so they can be tested.** makeVerifier(randomBytes, 64) returns characters from the
unreserved set only, using rejection sampling (bytes of 198 and above are skipped) so every character is equally
likely; challengeFor takes the hash function as a parameter. A fresh pair printed:

    length 64 allowed chars only true challenge length 43 has = + / false

A SHA-256 is 32 bytes, which is 43 characters of unpadded base64url; a 44-character challenge ending in = is the
padding bug.

**Step 3: prove the server side accepts it.** The RFC vector gives the expected challenge. Then a full exchange
against the local authorization server: authorize with the challenge (the server redirects to thaligo://oauth with a
code and the state "st-81f2"), exchange with the right verifier (200), with none (400), with a guessed one (400), and
the good code a second time (400).

**Step 4: use the library in the app.** In the app, expo-auth-session generates the verifier and challenge itself;
your hand-written helpers stay as tests of understanding and as a fallback for a provider that needs custom
handling. Pass request.codeVerifier to exchangeCodeAsync.

**Step 5: turn provider tokens into a ThaliGo session.** The app sends the ID token to POST /auth/oidc; the backend
verifies it and returns ThaliGo tokens. The provider's access token is not stored on the phone unless the app calls
the provider's own APIs.

**Step 6: say what was not tested.** The browser round trip, consent screen and redirect into the app need an
emulator with the dev build. That is a five-minute manual check, written into the pull request.`,
    mcqs: [
      mcq('An app on the same phone registers ThaliGo\'s custom scheme and receives the authorization code. What stops it getting tokens?', [
        ['It does not have the code_verifier, so the token step fails PKCE', true],
        ['The code expires before another app is able to use it at all', false],
        ['Authorization codes only work from the IP address that asked', false],
        ['The state parameter is checked by the provider at the token step', false],
      ], 'The provider stored the challenge with the code and only issues tokens to whoever presents the matching verifier, which never left ThaliGo\'s memory; the local server returned invalid_grant for a stolen code. Codes are short-lived but long enough to abuse, providers do not tie codes to IPs (phones change networks), and state is checked by the app on return, not by the provider.'),
      mcq('A hand-written PKCE challenge for ThaliGo is 44 characters and ends in "=". What is wrong?', [
        ['It is standard base64, but PKCE needs base64url without padding', true],
        ['It is the hex digest, which is always longer than the base64url one', false],
        ['The verifier was too short, so the hash came out one character long', false],
        ['SHA-256 needs a salt, and the = shows the salt was left out of it', false],
      ], 'The 32-byte digest in standard base64 is 44 characters with "=" padding and may contain + and /; base64url replaces those and drops the padding, giving 43. Hex is 64 characters, the digest length does not depend on the verifier, and PKCE uses no salt.'),
      mcq('Why does expo-auth-session open sign-in in a Custom Tab rather than a WebView inside ThaliGo?', [
        ['In a WebView the app could read the password the user types', true],
        ['A WebView cannot follow a redirect to a custom scheme URL', false],
        ['Custom Tabs are faster because they skip the TLS handshake', false],
        ['WebViews are not allowed to run JavaScript on Android at all', false],
      ], 'An embedded WebView is part of the app, so the app can inject script and read the form; the system browser keeps the credentials away from the app and shows the real address. WebViews can intercept custom-scheme navigations, Custom Tabs still use TLS, and WebViews run JavaScript when enabled.'),
    ],
    checkpoint: [
      mcq('A developer proposes putting the OAuth client secret in ThaliGo as EXPO_PUBLIC_OAUTH_SECRET. What is the right answer?', [
        ['Anything in the app can be extracted, so use a public client with PKCE', true],
        ['It is safe if the variable is read only on the token exchange screen', false],
        ['It works if the secret is base64-encoded before it is put in the app', false],
        ['It is fine on Android, because APK files are encrypted while on the device', false],
      ], 'A mobile app is a public client: the bundle can be unpacked, so a secret in it is not a secret, and PKCE replaces it. Where the variable is read does not matter (it is inlined at build time), base64 is encoding not encryption, and a downloaded APK is readable by anyone.'),
      ck('REST_APIS', 'ThaliGo\'s backend receives a Google ID token from the app at POST /auth/google. What must it do before creating a session?', [
        ['Verify the signature, and check that aud is ThaliGo\'s client ID and exp is valid', true],
        ['Decode the token and trust the email in it, since Google signed it already', false],
        ['Call Google with the client secret to ask whether the user is currently online', false],
        ['Store the ID token and use it as ThaliGo\'s own access token for later calls', false],
      ], 'The server must check the signature against Google\'s keys and that the token was issued for ThaliGo (aud), by Google (iss) and is not expired; then it issues its own tokens. Decoding without verifying trusts anything anyone sends, there is no "online" check, and reusing the ID token as an API token skips the server\'s own session and revocation.'),
      mcq('Sign in with Google works in ThaliGo\'s debug build but fails in the build installed from Play. What is the likely cause?', [
        ['The Play App Signing certificate\'s SHA-1 is not registered with Google', true],
        ['Release builds cannot open Custom Tabs until a permission is granted', false],
        ['Google blocks sign-in from apps that were installed from the Play Store', false],
        ['The redirect URI changes to exp:// once the app is built for release', false],
      ], 'An Android OAuth client is matched by package name and signing-certificate SHA-1, and Play re-signs the app with its own key, so that SHA-1 must be registered too. Custom Tabs need no permission, Google does not block Play installs, and exp:// is Expo Go\'s scheme, not a release build\'s.'),
    ],
  },

  /* ── MOBILE_SECURITY ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_AUTH_API_MOBILE_SECURITY',
    notes: `A web app's code runs on your server. A mobile app's code runs on a phone you do not control, which the user (or
someone with their phone) can root, inspect and modify. Everything in this lesson follows from one rule: **the server
is the only security boundary**. The app's job is to avoid giving away more than it must. Everything here is for
checking apps you build or own.

## OWASP MASVS in outline

The OWASP Mobile Application Security Verification Standard groups requirements into areas; the companion Mobile
Application Security Testing Guide (MASTG) says how to check each:

- **MASVS-STORAGE:** sensitive data stored securely, and not leaked to logs, backups or screenshots.
- **MASVS-CRYPTO:** platform crypto used correctly, no home-made algorithms, no hard-coded keys.
- **MASVS-AUTH:** authentication and sessions enforced on the server; local biometrics only as a gate.
- **MASVS-NETWORK:** TLS for all traffic, certificates validated, pinning where the risk justifies it.
- **MASVS-PLATFORM:** deep links, WebViews and inter-app communication handled safely.
- **MASVS-CODE:** dependencies kept current, all input validated.
- **MASVS-RESILIENCE:** tampering and reverse-engineering made harder (a cost, never a guarantee).
- **MASVS-PRIVACY:** collect less, explain it, give users control.

A fresher who can name these and give a ThaliGo example of each sounds like someone who has shipped.

## Secrets in the bundle

"Structuring a React Native Codebase" said EXPO_PUBLIC_ variables are inlined. Here is what that looks like.
The same babel-preset-expo the app builds with, in production mode for Android, on a config file:

    var config = exports.config = { apiUrl: "https://api.thaligo.example", mapsKey: "maps-demo-key-1234",
      paymentSecret: "sk_demo_9f8e7d6c5b4a", serverOnly: process.env.PAYMENT_SECRET };

and a one-line scan of that output, the kind anyone runs on an unzipped APK:

    found in bundle: [ '"maps-demo-key-1234"', '"sk_demo_9f8e7d6c5b4a"' ]

PAYMENT_SECRET, without the prefix, was not inlined; it is simply undefined in the app. Hermes compiles JavaScript to
bytecode, but string constants are still stored as strings, so it does not hide them. Rules:

- Payment, SMS-gateway, signing and admin keys never go in the app. The app calls ThaliGo's server; the server holds
  the key and calls the provider.
- Keys that must be in the app (maps, analytics) are restricted at the provider: to the Android package name and
  signing certificate, to specific APIs, with quotas.
- Run the same scan in CI on the release bundle, with patterns for your providers' key formats.

## Insecure storage

AsyncStorage and MMKV (without encryption) are plain files in the app's sandbox. The sandbox stops other apps, not a
rooted phone, a debug build or a device backup. Tokens and anything personal that must persist go to expo-secure-store
("Secrets on the Device: SecureStore and Keystore"). Also check the leaks people forget:

- **Logs.** console.log of a request with an Authorization header ends up in logcat and in crash reports. Strip
  tokens in the API layer's logging, and drop console calls from release builds.
- **Screens in the app switcher.** The UPI PIN or card screen shows in Recents. expo-screen-capture's
  usePreventScreenCapture() on those screens blocks screenshots and recording (FLAG_SECURE on Android).
- **Backups and caches.** Cached API responses with addresses and phone numbers are personal data; clear them on
  logout (the navigation topic's signOut does).

## TLS, and when to pin

All traffic is https. Android blocks cleartext http by default for apps targeting modern API levels, and iOS App
Transport Security does the same; do not switch that off globally to make a dev server work, allow it for the dev
host in debug only.

TLS already checks that the server's certificate chains to a trusted authority. **Pinning** goes further: the app
only accepts specific public keys for api.thaligo.example. A pin is a hash of the certificate's public key (SPKI),
so it survives certificate renewals that keep the key. Computed from a freshly generated key:

    SPKI DER bytes 91
    pin    sha256/6m/qFCZ9HfY2QudPWXk7qsLjJ3iBBGQ8gJJv3b25vAI=
    backup sha256/SbDoq4Bg9eGkCZ/zqkrIhJk3X+eQdKhQsNUqyp8hthk=

The trade-off is real. Pin the wrong thing, or rotate the key without shipping the new pin first, and every installed
copy of the app stops talking to the server, and an over-the-air update cannot fix pins set in native config. Payment
and banking apps pin, always with a backup pin and an expiry (Android's network_security_config supports pin-set with
expiration; libraries such as react-native-ssl-public-key-pinning do it from JavaScript). A food-delivery app
usually does not, and spends the effort on the server.

## Deep links are untrusted input

Any app, web page or SMS can open thaligo://. "Deep Links and Universal Links" mapped links to screens; here, what a
link may ask for. ThaliGo's parser, run on eleven links:

    thaligo://orders/4521                         {"type":"order","orderId":4521}
    thaligo://orders/4521abc                      {"type":"rejected","reason":"bad order id"}
    thaligo://pay?orderId=4521                    {"type":"pay","orderId":4521}
    thaligo://pay?orderId=4521&amountPaise=100    {"type":"rejected","reason":"amount must come from the server"}
    thaligo://help?url=https://evil.example/login {"type":"rejected","reason":"help url not allowed"}
    thaligo://help?url=javascript:alert(1)        {"type":"rejected","reason":"help url not allowed"}
    https://thaligo.example.evil.example/orders/1 {"type":"rejected","reason":"unknown origin"}
    thaligo://admin/delete-account                {"type":"rejected","reason":"unknown path"}

The rules: an allowlist of paths, ids validated as positive integers, URLs opened in a WebView only from an allowlist
of hosts compared exactly (not with endsWith or includes), and **a link never sets an amount, a payee or a role**:
the pay screen fetches the order and its amount from the server. Actions with consequences (pay, delete, change
phone number) always need a confirmation the user taps.

## Resilience, honestly

Root and jailbreak detection, obfuscation and tamper checks raise the cost for an attacker; each can be bypassed by
someone determined. Use them when the business needs them (banking regulators often ask) and never as a reason to
trust the client. Play Integrity (Android) and App Attest (iOS) let your server ask the platform whether a request
came from a genuine copy of your app; the server decides what to do with the answer.`,
    workedExample: `**Scenario.** Before ThaliGo's first Play release, the lead asks you for a one-hour security pass on your own
release build, with findings and fixes.

**Step 1: what ships in the bundle.** Build the release, unzip the AAB or APK, and search the JavaScript bundle
(assets/index.android.bundle) for key patterns, the way the test above searched babel's output. Finding:
EXPO_PUBLIC_RAZORPAY_SECRET (the payment gateway's secret key) is in it. Fix: remove it from the app, add POST
/payments/order on ThaliGo's server, which creates the payment order with the secret; the app gets back an order id
only. Rotate the leaked key, because builds with it have already been shared with testers.

**Step 2: what is written to disk.** Search the code for AsyncStorage.setItem and MMKV writes. Finding: the saved
addresses list, with phone numbers, is persisted unencrypted and not cleared on logout. Fix: clear it in signOut;
the refresh token was already in SecureStore.

**Step 3: what goes to logs.** The API layer logs every request in development. Finding: it is not removed in
release, and the Authorization header is included. Fix: log method, path, status and duration only, and only when
__DEV__ is true.

**Step 4: the network.** All URLs are https. app.json has no cleartext exception except for the debug dev server.
Decision recorded: no pinning for now; revisit when ThaliGo stores cards itself.

**Step 5: links.** Run the parser test with the team's real link formats plus hostile ones (bad ids, extra amount
parameters, outside URLs, unknown paths). All rejected as expected.

**Step 6: write it up.** Three findings, three fixes, one recorded decision. Map each to its MASVS area (CODE and
STORAGE twice, NETWORK) so the next review can check the same list.`,
    mcqs: [
      mcq('ThaliGo\'s release bundle is compiled to Hermes bytecode. Does that protect an EXPO_PUBLIC_ key inside it?', [
        ['No; string constants are kept as strings, so a simple search finds them', true],
        ['Yes; Hermes bytecode is encrypted with the app\'s Play App Signing key first', false],
        ['Yes, as long as the variable name itself does not include "SECRET"', false],
        ['No, but only because Hermes is turned off in release builds by default', false],
      ], 'Hermes changes code into bytecode, but string literals stay readable in its string table, so the inlined value is still there. Bytecode is not encrypted, the variable name is irrelevant once the value is inlined, and Hermes is the default engine in release builds.'),
      mcq('A link thaligo://pay?orderId=4521&amountPaise=100 arrives by SMS. What should ThaliGo\'s app do?', [
        ['Reject it: the amount must come from the server, not from a link', true],
        ['Open the pay screen with ₹1 filled in but let the user change it', false],
        ['Open it only if the SMS sender ID looks like ThaliGo\'s own sender', false],
        ['Accept it if the amount is lower than the order total on the screen', false],
      ], 'Anyone can craft a link, so a link may open the pay screen for an order but never decide what is paid; the parser rejected the extra parameter. Prefilling invites mistakes, sender IDs are spoofable and the app cannot see them, and a lower amount is exactly what an attacker would send.'),
      mcq('Why might a food-delivery app decide not to add certificate pinning, while a UPI app does?', [
        ['A wrong or stale pin cuts off every installed copy, which OTA cannot fix', true],
        ['Pinning works only on iOS, and most Indian food app users are on Android', false],
        ['Pinning makes TLS slower by several seconds on a typical 4G connection', false],
        ['Pinning is not compatible with REST APIs and needs a GraphQL backend', false],
      ], 'Pinning protects against a mis-issued or intercepting certificate, but a mistake breaks all traffic until users install a new binary; the risk is worth it where money moves directly. It works on Android, adds no meaningful latency, and has nothing to do with API style.'),
    ],
    checkpoint: [
      mcq('Which MASVS area does a refresh token written to AsyncStorage break?', [
        ['MASVS-STORAGE, which is about storing sensitive data securely', true],
        ['MASVS-NETWORK, because the token is later sent over the network', false],
        ['MASVS-RESILIENCE, because a rooted phone can read the file', false],
        ['MASVS-PRIVACY, because tokens are personal data under DPDP', false],
      ], 'Where sensitive data is kept is STORAGE, and the fix is the Keystore-backed SecureStore. Sending it is NETWORK\'s concern, RESILIENCE is about tampering and reverse engineering, and PRIVACY is about collecting and using personal data, not how a credential is stored.'),
      mcq('ThaliGo\'s help link opens any URL in a WebView if url.includes(\'thaligo.example\'). What is the flaw?', [
        ['https://thaligo.example.evil.example passes, so compare hosts exactly', true],
        ['includes() is slow on long URLs and blocks the JavaScript thread', false],
        ['WebViews cannot open https pages unless the host is pinned first', false],
        ['The check should use startsWith(\'thaligo\') to allow subdomains', false],
      ], 'Substring checks accept attacker domains that contain the name; parse the URL and compare the hostname against an allowlist (the parser rejected that exact URL). Speed is not the issue, WebViews open https pages without pinning, and startsWith on the URL is just as easy to fool.'),
      ck('REST_APIS', 'An app check with Play Integrity says a request came from a modified copy of ThaliGo. Who acts on that?', [
        ['The server, which decides whether to serve or limit the request', true],
        ['The app itself, which closes at once when the integrity verdict is bad', false],
        ['Google Play, which uninstalls the modified copy from the phone', false],
        ['Nobody; the verdict only appears in the Play Console reports', false],
      ], 'The app obtains an integrity token and sends it with the request; the server has it decoded and decides, the only place a decision cannot be patched out. A check inside the app can be removed by whoever modified it, Play does not uninstall apps for this, and the verdict is meant for your server at request time, not only for reports.'),
    ],
  },
  /* ── DEBUGGING ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_AUTH_API_DEBUGGING',
    notes: `Six bugs from ThaliGo's API, auth and security code. For each: the symptom as a user or teammate reports it, the
evidence, the cause, and the smallest fix. Bugs 1 to 4 were reproduced with Jest against the local Express server and
the outputs are real; bug 5's fix was tested the same way; bug 6 needs a real Play build and is written from the
Google and Expo documentation.

Two habits first. **Reproduce against a server you control.** A twenty-line Express app with a route that hangs, one
that fails twice, and a refresh endpoint that rotates tokens reproduces most mobile network bugs in seconds, with no
phone. **Read the server's side.** Half of these bugs are invisible in the app's logs and obvious in the server's.

## 1. "Something went wrong" for a page that does not exist

**Symptom.** After a backend deploy, the restaurant screen shows the generic error, and the bug report says "JSON
error".

**Evidence.** The app's error, logged in development:

    kind bad_response status undefined message SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON

**Cause.** The deploy renamed a route, so the server returned its HTML 404 page. The client parsed every body as
JSON before looking at the status, so the 404 became a parse error with no status.

**Fix.** Read the text, check res.ok first, keep the status, and parse JSON only for a successful response. The same
request now reports kind http, status 404, and the real problem (a renamed route) is obvious.

## 2. After one slow screen, nothing loads

**Symptom.** Users who open the offers screen on a bad network, then go back, find that Home never loads again until
they kill the app.

**Evidence.** The api module created one AbortController at module scope and aborted it when a request timed out.
Three requests in a test, the first to a slow route:

    1st (slow) : AbortError
    2nd (fast) : AbortError
    3rd (fast) : AbortError

**Cause.** An aborted signal stays aborted. Every later fetch was handed a signal that was already aborted and failed
at once.

**Fix.** A new AbortController inside each request, linked to the caller's signal for that request only.

## 3. "The app logs me out every morning"

**Symptom.** Sign-outs spike when users first open the app each day.

**Evidence.** Five parallel requests with an expired access token:

    /auth/refresh calls: 5, reuse detected: 1
    server log: refresh ok | refresh REUSED: family 7a2b114c revoked | refresh rejected: unknown or revoked | ...

**Cause.** Each request refreshed on its own. The server rotates refresh tokens; the second refresh presented a used
one, and reuse detection revoked the session.

**Fix.** A single-flight refresh: one shared promise that every 401 awaits, cleared in finally. Same test: one refresh
call, five successes. Do not "fix" it by making the server accept reused tokens.

## 4. Corporate sign-in fails at the last step

**Symptom.** The provider's login page works, the app comes back, and the token exchange fails with invalid_grant.

**Evidence.** The same verifier with three encodings of its challenge, against the local authorization server:

    hex        400 invalid_grant (PKCE verification failed)
    base64     400 invalid_grant (PKCE verification failed)
    base64url  200 tokens issued

**Cause.** The hand-written challenge used expo-crypto's digestStringAsync without options, which returns hex. (The
other version in the team's history used base64 and kept the + / = characters.)

**Fix.** Ask for { encoding: CryptoEncoding.BASE64 } and convert to base64url, or let expo-auth-session build the
pair; check it against the RFC 7636 example in a unit test.

## 5. A retry that ordered lunch twice

**Symptom.** A customer was charged for two identical orders placed thirty seconds apart.

**Evidence.** The place-order call went through a layer that retried every timeout, whatever the method. The server's
log showed two POST /orders with the same body, the first completed after the client had given up on it.

**Cause.** The response was lost, not the request. Retrying a POST without an idempotency key repeats the action.

**Fix.** Only GETs are retried by default; a write is retried only with an Idempotency-Key generated once per tap
and honoured by the server (the server returns the first result for a repeated key). In ThaliGo's layer, against a
route that never answers, with retries: 3:

    POST no key attempts: [ 'timeout' ] | POST with key attempts: [ 'timeout', 'timeout', 'timeout', 'timeout' ]

## 6. Google sign-in works for developers, not for users

**Symptom.** Sign in with Google works on every developer's phone and in internal testing builds installed by USB,
but fails for everyone who installs from Play. The native library reports a developer error.

**Evidence.** Not reproducible here (it needs a Play-signed build). The difference between the builds is the signing
key: with Play App Signing, Google re-signs the app with its own key before delivering it.

**Cause.** The Android OAuth client in Google Cloud was registered with the debug key's SHA-1 only.

**Fix.** Add OAuth clients (or fingerprints) for the upload key and for the Play App Signing key, whose SHA-1 is shown
in the Play Console. Check with a build from the internal testing track, which is Play-signed, before release.`,
    mcqs: [
      mcq('ThaliGo\'s orders screen fails with "Unexpected token \'<\'" right after a backend deploy. What is the first thing to check?', [
        ['The HTTP status, because the server probably sent an HTML error page', true],
        ['The zod schema, because a renamed field causes exactly this kind of message', false],
        ['The phone\'s network, because a weak signal corrupts JSON bodies', false],
        ['The JSON.parse polyfill, because Hermes parses JSON differently', false],
      ], 'A body starting with "<" is HTML, typically a 404 or 5xx page from the server or a proxy, so the status is the evidence. A schema mismatch gives a zod message naming the field, TLS protects bodies from corruption, and Hermes parses standard JSON.'),
      mcq('After one ThaliGo request times out, every later request fails immediately with AbortError. What is the cause?', [
        ['A single AbortController is shared, and once aborted it stays aborted', true],
        ['The timeout timer was never cleared, so it keeps aborting new requests', false],
        ['fetch caches the failure and returns it for the same base URL again', false],
        ['The server closed the keep-alive socket, and fetch will not reopen it', false],
      ], 'An AbortSignal cannot be reset; requests given an already-aborted signal reject at once, as the test showed. A leftover timer would abort one controller once, fetch does not cache failures, and a closed socket is simply reopened on the next request.'),
      mcq('ThaliGo charged a customer twice after a timeout on POST /orders. What prevents it while still allowing a retry?', [
        ['An Idempotency-Key per tap that the server uses to return the first result', true],
        ['A longer timeout on the POST so the response always arrives before it', false],
        ['Disabling the Place order button while the request is still in flight', false],
        ['Retrying the POST only after checking navigator.onLine on the phone', false],
      ], 'The key lets the server recognise a repeat and answer with the original order, so a retry is safe. No timeout guarantees a response, a disabled button does not stop the layer\'s own retry or a retry after the app restarts, and onLine says nothing about whether the first request was processed.'),
      mcq('Google sign-in fails only in ThaliGo builds installed from Play. Where is the fix made?', [
        ['In Google Cloud: register the Play App Signing key\'s SHA-1 for the app', true],
        ['In app.json: change the scheme so the release build has its own redirect', false],
        ['In the code: switch from the native library back to a WebView sign-in', false],
        ['In the Play Console: turn off Play App Signing for this application', false],
      ], 'Play re-signs the app, and Google matches Android clients by package and certificate SHA-1, so that fingerprint must be registered. The scheme is not the problem, WebView sign-in is blocked by Google, and Play App Signing is how apps are published, not something to remove.'),
    ],
  },

  /* ── PRACTICE ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_AUTH_API_PRACTICE',
    notes: `Eight exercises on ThaliGo's API layer, tokens, OAuth and security. Write your answer before reading ours. The code
answers were checked with TypeScript (strict) and Jest against the local test server.

## 1. Classify the failure (easy)

For each, say retry or not, and what the user sees: (a) GET /restaurants times out; (b) GET /orders/77 returns 404;
(c) POST /orders times out with no idempotency key; (d) GET /offers returns 503; (e) GET /me returns 401.

**Answer.** (a) Retry with backoff; then "The network is slow right now". (b) No retry; "Order not found". (c) No
automatic retry: the order may have been placed; check order status, then let the user decide. (d) Retry with
backoff; then "Something went wrong on our side". (e) Not a retry: refresh once, replay once; if refresh is refused,
sign out.

## 2. Backoff ceilings (easy)

With base 500 ms, cap 8000 ms and full jitter, what is the largest wait before attempts 1 to 6?

**Answer.** 500, 1000, 2000, 4000, 8000, 8000 ms (the test printed exactly this). The real wait is random between 0
and each ceiling.

## 3. Write the timeout (medium)

Write once(path, timeoutMs, signal) that aborts after timeoutMs, aborts when signal fires, and reports which happened.

**Answer.** A new AbortController per call; setTimeout sets a timedOut flag and aborts; a listener on the caller's
signal aborts; in catch, timedOut means 'timeout', signal.aborted means 'cancelled', anything else 'offline'; in
finally, clear the timer and remove the listener. Removing the listener matters: a long-lived screen signal would
otherwise collect one listener per request.

## 4. Single-flight refresh (medium)

Five requests get 401 at once. Write the function that makes exactly one /auth/refresh call.

**Answer.**

    let refreshing: Promise<string> | null = null;
    function refreshOnce() {
      if (!refreshing) refreshing = doRefresh().finally(() => { refreshing = null; });
      return refreshing;
    }

Each request awaits it and replays once. Tested: "/auth/refresh calls: 1", five successes.

## 5. Which logout (medium)

Match: (a) user taps Log out; (b) user reports a stolen phone from a friend's phone; (c) refresh returns 401
refresh_reused; (d) user taps Log out in airplane mode.

**Answer.** (a) Clear locally, then POST /auth/logout with the refresh token. (b) Log out everywhere: revoke all refresh
tokens and bump tokenVersion so live access tokens fail too. (c) The server already revoked the family; clear locally
and show sign-in with a short explanation. (d) Clear locally at once; queue the server call for when the network
returns (the test: store empty with the server down).

## 6. Check a PKCE challenge (medium)

A teammate's challenge for the RFC 7636 example verifier is E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw+cM= . Right?

**Answer.** No. It is the standard base64 of the right digest. Replace + with -, / with _, drop =, giving
E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM, 43 characters.

## 7. Validate a link (hard)

Write the rules for thaligo://help?url=... so only ThaliGo's help centre opens in the WebView.

**Answer.** Parse url with new URL inside try/catch; require protocol https:; require hostname to be exactly in an
allowlist (help.thaligo.example); reject everything else, including javascript: URLs, other hosts, and hosts that
merely contain the name. Tested: evil.example, javascript:alert(1) and thaligo.example.evil.example were all rejected.

## 8. Review a config (hard)

app config has EXPO_PUBLIC_API_URL, EXPO_PUBLIC_MAPS_KEY, EXPO_PUBLIC_SMS_GATEWAY_KEY and EXPO_PUBLIC_SENTRY_DSN.
Which are acceptable in the app?

**Answer.** API URL: yes, it is not a secret. Maps key: yes if restricted at the provider to the app's package and
certificate and to the maps APIs. Sentry DSN: yes; it is designed to be public, and only allows sending events. SMS
gateway key: no. Anyone who extracts it can send SMS at ThaliGo's cost; OTPs are sent by the server.`,
    mcqs: [
      mcq('With base 500 ms, a cap of 8000 ms and full jitter, what is the most ThaliGo can wait before the fifth attempt?', [
        ['8000 ms, because 500 × 2⁴ reaches the cap', true],
        ['4000 ms, because the fifth wait is 500 × 2³', false],
        ['16000 ms, because the doubling continues', false],
        ['2500 ms, because waits add 500 ms each time', false],
      ], 'The fifth attempt follows the wait for attempt index 4: 500 × 2⁴ = 8000, which is also the cap. 4000 is the ceiling one attempt earlier, the cap stops the doubling at 8000, and adding 500 ms each time is linear backoff, not exponential.'),
      mcq('A ThaliGo user reports a stolen phone from a friend\'s phone. Which action protects the account fastest?', [
        ['Revoke all refresh tokens and bump the token version on the server', true],
        ['Send a push message telling the stolen phone to clear its storage', false],
        ['Wait for the access token on the stolen phone to expire by itself', false],
        ['Change the OTP length so the thief cannot sign in again with SMS', false],
      ], 'Logout-all on the server kills refresh tokens and, through the version check, live access tokens too. A push relies on the thief\'s phone obeying, waiting leaves a window, and the OTP length does nothing about a session that already exists.'),
      mcq('In a ThaliGo code review, which config value must be removed from the app?', [
        ['EXPO_PUBLIC_SMS_GATEWAY_KEY', true],
        ['EXPO_PUBLIC_SENTRY_DSN', false],
        ['EXPO_PUBLIC_API_URL', false],
        ['EXPO_PUBLIC_MAPS_KEY, restricted', false],
      ], 'A gateway key lets anyone send SMS at ThaliGo\'s cost and is the server\'s job. A Sentry DSN only allows sending events and is meant to be public, the API URL is no secret, and a maps key restricted to the app\'s package and certificate is acceptable.'),
      mcq('A ThaliGo help link must open only help.thaligo.example. Which check is right?', [
        ['Parse the URL; require https: and an exact hostname match', true],
        ['Check that the link text starts with https://help.thaligo', false],
        ['Check that the URL string includes help.thaligo.example', false],
        ['Allow it if the hostname ends with the text thaligo.example', false],
      ], 'Only parsing and comparing the hostname exactly rejects look-alikes. A prefix check passes https://help.thaligo.example.evil.example, includes() passes the same, and endsWith passes evilthaligo.example, a different domain anyone can register.'),
      mcq('POST /orders times out on a ThaliGo phone and the request had no idempotency key. What should the app do next?', [
        ['Check the order status before letting the user try again', true],
        ['Retry at once, since a timeout means nothing reached the server', false],
        ['Show "Order failed" and clear the cart for a fresh start', false],
        ['Retry with backoff three times, then show the error state', false],
      ], 'A timeout means the answer was lost, not that the order failed; it may have been placed. Asking the server avoids a double order. Retrying without a key can create one, "failed" may be false, and clearing the cart loses the user\'s work.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_AUTH_API_INTERVIEW_QUESTION',
    notes: `Four questions mobile interviews ask about auth, APIs and security, at product companies, fintechs and service
companies, with an answer that scores well and the follow-up a good interviewer asks next. Practise aloud, two
minutes each, and replace ThaliGo with an app you built.

## Q1. "How do you handle token refresh in a mobile app?"

**Model answer.** "Access token in memory, short-lived. Refresh token in SecureStore, which is the Keystore on Android.
Every request goes through one API layer. On a 401 it refreshes and replays the request once. The important part is
that refresh is single-flight: if five requests fail together, they all await one shared refresh promise. My server
rotated refresh tokens and treated a reused one as theft, so without single-flight the second refresh revoked the
session; I reproduced that in a Jest test, five refresh calls and the user signed out, and after the fix it was one
call and five successes. If the refresh itself is refused, every path goes through one signOut that clears tokens and
cached data. If it fails because there is no network, I keep the session and show offline."

**Follow-up.** "Why rotate refresh tokens at all?" — "A stolen refresh token is a long-lived session. With rotation each
one works once, so if the thief and the real app both use it, the server sees a reuse, cannot tell who is who, and
ends the session. That turns silent theft into a visible sign-out."

## Q2. "Your API calls work on Wi-Fi but users on mobile data complain. What do you do?"

**Model answer.** "First, make the app's behaviour bounded: every request has a timeout through an AbortController,
because a bad mobile network usually hangs rather than errors. Then retries on the right things only, timeouts,
network errors, 429 and 5xx, with exponential backoff and jitter, and only for GETs or writes with an idempotency
key. One owner for retries, so the API layer and TanStack Query do not multiply them. The screen shows distinct
states, offline, slow, server error, each with Try again. Then reduce round trips: combine the calls a screen needs,
request only displayed fields, paginate. I would test the hang with a local route that never responds, and confirm
on a throttled real device."

**Follow-up.** "How do you avoid a double payment if the user taps twice or you retry?" — "Disable the button while in
flight, and send an Idempotency-Key created once per user action, so the server returns the first result for a
repeat. The button alone is not enough, because the retry or an app restart can repeat the request."

## Q3. "How does OAuth work on mobile, and what is PKCE for?"

**Model answer.** "Authorization code flow in the system browser, a Custom Tab on Android, never a WebView, so the app
never sees the password. A mobile app cannot keep a client secret, because anything in the APK can be extracted, so
it is a public client. The risk is that another app registers the same redirect scheme and catches the code. PKCE
fixes that: the app creates a random verifier, sends the SHA-256 of it as the challenge, and at the token step sends
the verifier. A stolen code is useless without it. In Expo, expo-auth-session does PKCE by default. I verified the
encoding against the RFC example, because hex or padded base64 is a common bug. After sign-in the backend verifies
the ID token, checks the audience, and issues our own session."

**Follow-up.** "What is the state parameter for, if you have PKCE?" — "State ties the response to a request this app
started, which protects against a forged redirect logging the user into someone else's account. expo-auth-session
generates it and rejects a mismatch."

## Q4. "Name some mobile security mistakes and how you avoid them."

**Model answer.** "Secrets in the bundle: EXPO_PUBLIC values are inlined as plain strings, and Hermes does not hide
them, so payment or SMS keys stay on the server and the keys the app must have are restricted at the provider. Tokens
in AsyncStorage instead of SecureStore. Logging Authorization headers. Trusting deep links: I validate them against
an allowlist and a link can never set an amount. Cleartext http in release. I use OWASP MASVS as the checklist,
storage, crypto, auth, network, platform, code, resilience and privacy, and I treat the server as the only real
boundary, because the user controls the phone."

**Follow-up.** "Would you add certificate pinning?" — "Depends on the risk. Pinning stops interception with a
mis-issued or user-installed certificate, but a wrong or stale pin cuts off every installed copy, and an OTA update
cannot change native pins. For payments I would pin the public key with a backup pin and an expiry; for most apps I
would rely on TLS and spend the effort on the server."`,
    mcqs: [
      mcq('An interviewer asks why ThaliGo keeps the refresh token in SecureStore but the access token only in memory. Best answer?', [
        ['The refresh token must survive restarts and is worth more; the access token is short-lived', true],
        ['SecureStore can only hold one value per app, so one token has to stay in memory instead', false],
        ['Access tokens are public, so keeping them in memory is only done to make requests faster', false],
        ['Memory is encrypted by Android, so it is safer than SecureStore for the token used most', false],
      ], 'The refresh token is long-lived and restores the session, so it goes to the Keystore-backed store; the access token expires in minutes and is used on every call, so memory is enough. SecureStore holds many keys, access tokens are credentials not public data, and app memory is not encrypted storage.'),
      mcq('An interviewer asks: "If you have PKCE, why does expo-auth-session still send state?" What is the right reply?', [
        ['State ties the redirect to a request this app made, which stops forged responses', true],
        ['State carries the code_verifier to the provider, which then checks it at once on its side', false],
        ['State is required only by Google and is ignored by all other OAuth providers', false],
        ['State replaces the redirect URI when the app runs in Expo Go during development', false],
      ], 'PKCE protects the code exchange; state protects the app from accepting a response it never asked for (login CSRF), and the library rejects a mismatch. The verifier is never sent on the redirect, state is part of OAuth for every provider, and it has nothing to do with redirect URIs.'),
      mcq('Asked "would you pin certificates in a food-delivery app?", which answer shows the best judgement?', [
        ['Probably not: a stale pin cuts off every install; pin for payments, with a backup', true],
        ['Always: pinning is required by OWASP MASVS for every app on the Play Store now', false],
        ['Never: pinning is broken on Android, and TLS on its own stops every interception', false],
        ['Yes, by pinning the leaf certificate itself so renewals are detected at once', false],
      ], 'Pinning is a risk trade-off: worth it where money moves, with a backup pin and expiry, and often not worth the outage risk elsewhere. MASVS treats it as risk-based, it works on Android, TLS does not stop a user-installed CA, and pinning the leaf certificate breaks the app at every renewal.'),
    ],
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_AUTH_API_CHECKPOINT',
    notes: `Ten questions across the topic: the API layer on mobile networks, OTP login and tokens, refresh and logout, OAuth
with PKCE, and mobile security. Answer without notes; the result shows which lesson to revisit.`,
    checkpoint: [
      ck('REST_APIS', 'Which ThaliGo failures should its API layer retry automatically on a GET?', [
        ['Timeouts, network errors, 429 and 5xx responses', true],
        ['Every non-2xx response, up to three attempts', false],
        ['Only 401, since a fresh token usually fixes it', false],
        ['400 and 422, as validation can pass on retry', false],
      ], 'Those are the failures that may pass on their own. Retrying every status repeats final answers like 404, a 401 is handled by refresh-then-replay rather than blind retry, and a 400 or 422 means the request itself is wrong and will fail again.'),
      ck('REST_APIS', 'ThaliGo\'s request() gets an aborted signal. How does it tell a timeout from the screen being closed?', [
        ['Its own timer sets a timedOut flag before aborting', true],
        ['fetch reports a TimeoutError for the timer\'s own abort', false],
        ['The caller passes the reason as a request header', false],
        ['A closed screen makes fetch return status 499', false],
      ], 'Both aborts look the same from fetch in this code, so the layer records which one it triggered. AbortController.abort() with no reason gives AbortError, not TimeoutError; headers go to the server, not back to the layer; and 499 is a server log convention, not something fetch returns.'),
      mcq('Five ThaliGo requests get 401 together. What does a correct client do?', [
        ['Await one shared refresh, then replay each request once', true],
        ['Refresh in each request, then keep the newest token', false],
        ['Sign out at once, as five 401s suggest a stolen session', false],
        ['Queue the five and send them again after one minute', false],
      ], 'Single-flight refresh makes one call and replays each request once. Five refreshes trigger reuse detection with rotating tokens, signing out throws away a session that only needed refreshing, and waiting a minute does not get a new token.'),
      mcq('Why does ThaliGo\'s server revoke the whole token family when a used refresh token is presented again?', [
        ['It cannot tell a thief from the real app, so it ends the session', true],
        ['Used tokens cannot be deleted one at a time from its token database', false],
        ['It is the cheapest way to clear expired tokens out of storage', false],
        ['The OAuth standard says all tokens expire after their first use', false],
      ], 'A reused token means two parties hold it; revoking the family stops whoever is the thief, at the cost of a re-login. It is a security decision, not a database limitation or cleanup, and OAuth does not say every token is single-use (rotation is a server choice).'),
      mcq('A ThaliGo user taps Log out with no network. What should happen?', [
        ['Clear tokens and cached data now; tell the server when back online', true],
        ['Show an error, since the server must confirm the logout first', false],
        ['Keep the session and retry the logout in the background later', false],
        ['Clear the access token only, and keep the refresh token stored', false],
      ], 'A logout the user cannot complete is not a logout; local clearing is immediate and the server revoke is queued. Refusing or delaying leaves the session on the phone, and keeping the refresh token means the next launch signs them back in.'),
      ck('REST_APIS', 'What limits stop ThaliGo\'s OTP login being guessed or abused?', [
        ['Per-number request limits, a few guesses per code, and expiry', true],
        ['A longer code, so that each OTP has eight digits instead of six', false],
        ['Sending the OTP back in the API response so the app can check it', false],
        ['Allowing unlimited guesses but adding a one-second delay to each', false],
      ], 'Rate limits on requests and attempts plus short expiry make guessing and SMS flooding impractical. A longer code alone still allows unlimited tries, returning the OTP hands it to anyone calling the API, and unlimited guesses at one per second still cover a large share of the code space in days.'),
      mcq('What does PKCE prove at ThaliGo\'s token step?', [
        ['That the caller holds the verifier whose hash was sent earlier', true],
        ['That the user typed the right password on the provider\'s login page', false],
        ['That the app has the client secret that the provider expects', false],
        ['That the redirect URI came from a verified Android App Link', false],
      ], 'The provider hashes the presented verifier and compares it with the stored challenge, binding the code to the app that started the flow. The password is checked by the provider earlier, a public client has no secret, and PKCE does not check how the redirect was delivered.'),
      mcq('Why should Sign in with Google in ThaliGo end with the backend issuing ThaliGo\'s own tokens?', [
        ['So sessions, refresh, revocation and logout work the same for every sign-in method', true],
        ['Because Google ID tokens cannot be sent over HTTPS to servers outside Google itself', false],
        ['Because the app is not allowed to keep any token that Google issued on the phone', false],
        ['So the app can skip verifying the Google ID token, since the backend trusts it', false],
      ], 'After verifying the ID token, the backend creates one kind of session, so refresh and logout-everywhere behave the same for OTP and Google users. ID tokens are sent to your server routinely, keeping provider tokens is a design choice rather than a ban, and the backend must verify the token rather than trust it.'),
      mcq('ThaliGo\'s bundle contains EXPO_PUBLIC_MAPS_KEY. What makes that acceptable?', [
        ['Restricting the key to the app\'s package, certificate and maps APIs', true],
        ['Compiling with Hermes, so the key is stored as bytecode, not text', false],
        ['Reading the key only at runtime with process.env in the function', false],
        ['Splitting the key into two strings joined together at runtime', false],
      ], 'Keys that must ship are assumed public and limited at the provider, so a copied key is of little use. Hermes keeps string constants readable, process.env.EXPO_PUBLIC_* is replaced at build time wherever it appears, and split strings are joined again by anyone reading the code.'),
      mcq('A link thaligo://orders/4521abc reaches ThaliGo. What should the parser return?', [
        ['A rejection: the id is not a positive whole number', true],
        ['Order 4521, after dropping the letters at the end', false],
        ['The orders list, as the nearest valid screen to it', false],
        ['Order 4521abc, since ids are strings in route params', false],
      ], 'Ids from links are validated strictly; the test rejected "4521abc" as a bad order id. Lenient parsing (parseInt would give 4521) opens a different order than the link named, falling back to a list hides bad links, and although params are strings, ThaliGo\'s order ids are integers.'),
    ],
  },
];
