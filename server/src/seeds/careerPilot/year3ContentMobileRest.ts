/**
 * T3_MOBILE_API, T3_MOBILE_QUALITY and T3_MOBILE_PROJECT — seven units. Finishes S18.
 *
 * ── DEPTH, NOT REPETITION ─────────────────────────────────────────────────────────────────
 *
 * Three of these four topics overlap the core directly. What each can say that the core
 * unit could not:
 *
 * CALLING_AN_API — the core API unit assumes a request that completes. From a device the
 * request outlives the screen that made it, runs on a network that hangs rather than fails,
 * and is retried by a user pressing a button twice on a train.
 *
 * LOGIN_THAT_PERSISTS — the core authentication unit puts a token in a cookie the browser
 * manages. On a device there is no browser, no cookie jar, no same-origin policy, and the
 * storage is on hardware somebody else is holding. Refresh has to work while the app was
 * not running.
 *
 * BATTERY_AND_FRAMES — the core observability unit measures a server you can log into.
 * Here the thing being measured is in somebody's pocket, the budget is a physical battery,
 * and the user's complaint arrives as an uninstall rather than a ticket.
 *
 * TESTING_ON_DEVICES — the core testing unit is about correctness. This one is about the
 * fact that the emulator lies: it has a fast disk, unlimited memory and a perfect network,
 * so a test that passes there says nothing about the device.
 *
 * Attribution: API defaults to REST_APIS with the login unit on AUTHENTICATION. QUALITY
 * defaults to AUTOMATED_TESTING with the battery unit on MONITORING_OBSERVABILITY. The
 * project is all PRODUCTION_ENGINEERING.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const MOBILE_REST_BUNDLES: PilotBundle[] = [
  /* ══ T3_MOBILE_API ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_MOBILE_API_CALLING_AN_API',
    notes: `The core API unit assumed a request that completes. **From a device, a request
outlives the screen that made it, runs on a network that hangs rather than fails, and gets
retried by a user pressing a button twice on a moving train.**

## The network you actually have

**Slow.** Not broadband. A congested cell on a commute is hundreds of milliseconds before any
byte arrives.

**Variable.** Fast, then nothing, then fast again, within one screen.

**Hanging.** **This is the important one.** A dead network on a device usually does not
refuse your connection — it accepts it and never answers. **Without a timeout your request
waits forever and your spinner spins forever**, and the user force-quits.

**Metered.** Somebody is paying per megabyte, and your background sync is on their bill.

## What every request needs

**A timeout.** Both a connect timeout and a read timeout, and **both short enough that the
user is told something within a few seconds.** Ten seconds is not a timeout; it is a
different kind of hang.

**A cancel tied to the screen.** When the screen is destroyed, the request stops. The
debugging unit made this the fix for results arriving into a screen that is gone.

**Retry with backoff, on the right things.** A timeout or a 5xx, yes. A 400 or a 404, never
— retrying a request the server understood and rejected is how a client hammers an endpoint
for an hour.

**And idempotency on anything that writes**, for exactly the same reason the offline queue
needs it: **the response can be lost after the server acted**, and on a device that is
common rather than rare.

## The two-tap problem

**A user on a bad network presses the button, sees nothing, and presses it again.**

**Disable the control on the first press** and show that something is happening. That handles
the polite case.

**And send an idempotency key anyway**, because disabling the button does not help when the
app was killed between the request and the response, and the user reopens and tries again.

## Designing the endpoint for a device

**Fewer, larger requests.** Round trips are the expensive part, not payload size — **latency
dominates on a cell network** and ten small calls are far worse than one larger one.

**Only the fields the screen shows.** Bandwidth is somebody's money.

**Paginate**, and paginate by cursor rather than offset, because the list changed while the
user was in a tunnel.

**And support conditional requests**, so a refresh that finds nothing new costs almost
nothing.

## Showing it to the user

**Never a bare spinner with no timeout.**

**Distinguish slow from failed.** After a few seconds, "still trying" is not a failure
message and it stops the user force-quitting.

**On failure, say what failed and offer retry.** Not "an error occurred".

**And if you have stale data, show it.** A list from nine minutes ago with a quiet note beats
an error screen every time — which is the offline unit's argument, applied to a single
request.`,
    mcqs: [
      mcq('A dead network on a device usually:',
        [['Accepts the connection and never answers, rather than refusing it', true],
          ['Refuses the connection immediately with an error', false],
          ['Reports itself through the connectivity API first', false],
          ['Fails at the DNS resolution stage', false]],
        'Without a timeout your request waits forever and the user force-quits.'),
      mcq('Retrying a 400 or a 404 is wrong because:',
        [['The server understood the request and rejected it, so it will again', true],
          ['Those responses are cached by intermediate proxies', false],
          ['Client errors should be reported to the user immediately', false],
          ['Retries are only defined for idempotent methods', false]],
        'It is how a client hammers an endpoint for an hour.'),
      mcq('Disabling the button on first press is insufficient because:',
        [['The app can be killed between the request and the response', true],
          ['Users can still trigger the action from elsewhere', false],
          ['The control re-enables when the screen is restored', false],
          ['A disabled control does not stop an in-flight duplicate', false]],
        'Send an idempotency key anyway.'),
      mcq('Fewer, larger requests suit a device because:',
        [['Latency dominates on a cell network, so round trips are the expensive part', true],
          ['Payload size is not billed on metered connections', false],
          ['Each connection consumes significant battery', false],
          ['Servers handle large requests more efficiently', false]],
        'Ten small calls are far worse than one larger one.'),
    ],
    checkpoint: [
      mcq('A ten-second timeout is:',
        [['Not a timeout but a different kind of hang, as far as the user is concerned', true],
          ['A perfectly reasonable default for any request on a mobile network', false],
          ['Appropriate for background requests only', false],
          ['Short enough provided a spinner is shown', false]],
        'Short enough that the user is told something within a few seconds.'),
      mcq('Cursor pagination suits a device because:',
        [['The list changed while the user was in a tunnel', true],
          ['Cursors are smaller to transmit than offsets', false],
          ['Offsets require the server to count rows', false],
          ['Cursors can be cached on the device more easily', false]],
        'An offset into a list that shifted returns the wrong page.'),
      mcq('After a few seconds of waiting, "still trying":',
        [['Is not a failure message, and it stops the user force-quitting', true],
          ['Should be replaced by an error message and a retry button', false],
          ['Indicates the timeout has been set too long', false],
          ['Is less useful than a progress percentage', false]],
        'Distinguish slow from failed.'),
    ],
  },

  {
    unitCode: 'T3_MOBILE_API_LOGIN_THAT_PERSISTS',
    notes: `The core authentication unit put a token in a cookie the browser manages. **On a
device there is no browser, no cookie jar and no same-origin policy** — you hold the
credential yourself, on hardware somebody else is carrying, and you have to refresh it after
the app has not run for a fortnight.

## What you hold

**Never the password.** The storage unit said this and it is the one rule with no exception:
**a token can be revoked and a password cannot.**

**A short-lived access token**, in memory, used on every request.

**A long-lived refresh token**, in the secure store, used only to get access tokens.

**And nothing in preferences, nothing in a file, nothing in a log.**

## Why the pair

**The access token is exposed on every request** and lives minutes, so a stolen one expires
quickly.

**The refresh token is used rarely** and lives in hardware-backed storage, so it is harder to
steal.

**And a refresh token can be revoked server-side**, which gives you a logout that works on a
device you no longer have. **That is the property that matters** — a phone is lost far more
often than a laptop, and "log this device out" has to actually work.

## Refreshing

**On a 401**, not on a timer. Timers drift, clocks are wrong, and the server is the authority.

**Once**, even when five requests fail at the same moment. **Five parallel refreshes is the
commonest bug in this area**: they race, four of them present a token the first has already
rotated, and the user is logged out for no reason.

**Queue the failed requests**, refresh once, replay them.

**And if the refresh fails, log out cleanly** — clear the secure store, clear local data that
belonged to that user, and return to the login screen with an explanation.

## Rotation

**Issue a new refresh token each time one is used**, and invalidate the old.

**Then a replayed old token is a signal**: either a stolen token or a genuine race. **Treat it
as theft and revoke the family**, because you cannot tell the difference and the cost of
being wrong in one direction is an inconvenient re-login while the other is an account.

## Biometrics, honestly

**Biometric unlock is a local gate on your stored token**, not an authentication to your
server. The device tells you the right person is present; it does not tell your backend
anything.

**It is a good feature** — it lets you keep a long session safely because the token is only
usable with the user present.

**But it is not a second factor to the server**, and describing it as one in a design review
is a mistake somebody will notice.

## Logging out

**Clear the secure store.**

**Clear cached personal data.** A logout that leaves the previous user's list on screen is a
real and common bug.

**Tell the server**, so the refresh token is revoked.

**And handle the server being unreachable** — clear locally anyway, and revoke when you next
can. **A logout that fails because there is no signal is not a logout the user accepts.**`,
    mcqs: [
      mcq('The property of a refresh token that matters most on a device is:',
        [['It can be revoked server-side, so logout works on a phone you no longer have', true],
          ['It is stored in hardware-backed storage', false],
          ['It is transmitted far less often than an access token', false],
          ['It can be rotated on every use', false]],
        'A phone is lost far more often than a laptop.'),
      mcq('The commonest bug in refresh handling is:',
        [['Five parallel refreshes racing when five requests fail at once', true],
          ['Refreshing on a timer rather than on a 401', false],
          ['Storing the refresh token in preferences', false],
          ['Failing to clear the token on logout', false]],
        'Four present a token the first has already rotated, and the user is logged out.'),
      mcq('A replayed old refresh token should be treated as:',
        [['Theft, revoking the family, because you cannot tell it from a race', true],
          ['A race condition, which is the more likely cause', false],
          ['A client bug to be logged and ignored', false],
          ['Valid, since it was legitimately issued', false]],
        'Being wrong one way is a re-login; the other way is an account.'),
      mcq('Biometric unlock is:',
        [['A local gate on your stored token, not authentication to your server', true],
          ['A second factor the backend can rely on', false],
          ['Equivalent to a device-bound credential', false],
          ['A replacement for the refresh token flow', false]],
        'Describing it as a second factor in a design review is a mistake.'),
    ],
    checkpoint: [
      mcq('Refreshing on a 401 rather than on a timer is right because:',
        [['Timers drift and clocks are wrong, and the server is the authority', true],
          ['It reduces the number of refresh requests made', false],
          ['A timer cannot reliably run while the app is backgrounded', false],
          ['The expiry is not known to the client', false]],
        'Queue the failed requests, refresh once, replay them.'),
      mcq('A logout that leaves the previous user’s list on screen is:',
        [['A real and common bug', true],
          ['Acceptable until the next refresh completes', false],
          ['Prevented by clearing the secure store', false],
          ['Only a problem on shared devices', false]],
        'Clear cached personal data too.'),
      mcq('When the server is unreachable during logout you should:',
        [['Clear locally anyway and revoke when you next can', true],
          ['Retry until the revocation succeeds', false],
          ['Keep the user logged in and warn them about it', false],
          ['Queue the logout like any other write', false]],
        'A logout that fails for want of signal is not one the user accepts.'),
    ],
  },

  /* ══ T3_MOBILE_QUALITY ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_MOBILE_QUALITY_BATTERY_AND_FRAMES',
    notes: `The core observability unit measured a server you can log into. **Here the thing
being measured is in somebody's pocket, the budget is a physical battery, and the complaint
arrives as an uninstall rather than as a ticket.**

## Battery

**The device wants to sleep.** Almost all battery life comes from the processor being idle
and the radio being off. **Anything that wakes the device costs far more than the work it
does**, because waking the radio keeps it powered for seconds afterwards whatever you sent.

**What drains it:**

**Waking up.** A background task, a poll, a timer. **The wakeup is the cost, not the work.**

**The radio.** Especially many small requests spread out — **the same bytes sent in one burst
cost a fraction of the same bytes sent in twenty requests a minute apart.**

**Location.** Continuous high-accuracy location is the most expensive thing an ordinary app
can do.

**The screen**, which is usually the largest single consumer and usually not your problem.

**And a busy loop**, animation or otherwise, that keeps the processor awake.

**What to do:** batch, defer, and **hand scheduling to the platform** — it knows about
charging state, network cost and whether the user is asleep, and your timer knows none of
that. Use push rather than poll. Use the coarsest location that works.

## Frames

**A frame budget is about sixteen milliseconds**, and on a high-refresh display less. **Miss
it and the user sees a stutter** — not a slow number in a dashboard, a visible jank they
attribute to your app being bad.

**What misses it:**

**Work on the main thread.** Parsing, decoding, database queries, file reads. **All of it
belongs somewhere else**, and this single rule prevents most jank.

**Layout that is too deep or measured twice.**

**Large images decoded at full size** into a small view. Decode to the size you will draw.

**Allocation in a scroll**, which triggers collection mid-gesture.

**And a list that builds every row** rather than recycling.

## Measuring rather than guessing

**Use the profiler, on a device, on a release build.** A debug build is slower in ways that
mislead, and the emulator is faster in ways that mislead more.

**Record before and after.** A performance change without a measurement is a story.

**Measure on the cheapest device you support**, where the problem is visible and the fix is
provable.

**And measure battery over hours, not minutes.** The platform's battery attribution screen,
after a real day of use, is the honest number — and it is the one your user will look at
when they decide it is your app.

## What users actually report

**They do not report jank.** They say it feels slow.

**They do not report battery.** They uninstall.

**Which means you have to look**, because the feedback channel does not exist. **Ship frame
timing and startup time as metrics** and watch them the way you watch a server, or you will
find out from a review.`,
    mcqs: [
      mcq('Anything that wakes the device costs more than the work it does because:',
        [['Waking the radio keeps it powered for seconds afterwards whatever you sent', true],
          ['The processor runs at a higher clock on wake', false],
          ['The operating system charges a fixed energy penalty for each wakeup', false],
          ['Background work cannot be batched by the platform', false]],
        'The wakeup is the cost, not the work.'),
      mcq('The same bytes sent in twenty requests a minute apart:',
        [['Cost far more battery than the same bytes sent in one burst', true],
          ['Cost about the same, since the payload is identical', false],
          ['Cost less, because each transfer is shorter', false],
          ['Cost more only on a congested network', false]],
        'Batch what you send, and defer it to a single burst.'),
      mcq('The single rule that prevents most jank is:',
        [['Keep parsing, decoding, queries and file reads off the main thread', true],
          ['Recycle the list rows rather than building each one afresh', false],
          ['Decode images to the size they will be drawn at', false],
          ['Avoid allocation during a scroll gesture', false]],
        'All of that work belongs somewhere else.'),
      mcq('Profiling should be done on:',
        [['A device, on a release build, on the cheapest model you support', true],
          ['An emulator, where the profiler output is more accurate', false],
          ['A debug build, which reports more detail', false],
          ['The newest device, to establish the best case', false]],
        'Debug builds and emulators both mislead, in opposite directions.'),
    ],
    checkpoint: [
      mcq('Handing scheduling to the platform is better than a timer because:',
        [['It knows about charging state, network cost and whether the user is asleep', true],
          ['Timers are generally inaccurate once the app has been backgrounded', false],
          ['The platform can run work at a higher priority', false],
          ['It avoids the need for exponential backoff', false]],
        'Your timer knows none of that.'),
      mcq('Battery should be measured:',
        [['Over hours, using the platform attribution screen after a real day', true],
          ['Over minutes, with the profiler attached', false],
          ['By counting wakeups in the application log', false],
          ['By comparing the drain against a carefully matched control device', false]],
        'It is the number your user looks at when they decide it is your app.'),
      mcq('You have to look for jank and battery problems yourself because:',
        [['Users do not report them; they say it feels slow, or they uninstall', true],
          ['The platform does not expose any of the relevant metrics itself', false],
          ['Crash reporting covers only fatal issues', false],
          ['Reports arrive too late to be actionable', false]],
        'Ship frame timing and startup time as metrics.'),
    ],
  },

  {
    unitCode: 'T3_MOBILE_QUALITY_TESTING_ON_DEVICES',
    notes: `The core testing unit was about correctness. **This one is about the emulator
lying.** It has a fast disk, unlimited memory, a perfect network and your development
permissions already granted — so **a test that passes there says very little about the
device.**

## What the emulator cannot tell you

**Performance.** It runs on your desktop processor. Nothing it says about speed transfers.

**Memory pressure.** It will not kill your process the way a phone with eight other apps
open does.

**Battery.** There is none.

**The camera, the sensors, the real GPS.** Simulated, or absent.

**Network reality.** Perfect, unless you deliberately degrade it.

**Manufacturer behaviour.** Aggressive battery policies that kill background work, custom
keyboards, modified system dialogs. **This is where the bug reports you cannot reproduce come
from.**

**And how it feels in a hand**, which is not a metric and is the thing the user judges.

## What it is good for

**Logic and layout on many screen sizes**, quickly.

**Automated tests in the pipeline**, where it is the only practical option.

**Testing an operating system version you do not own a device for.**

**And rapid iteration**, which is real value — just do not mistake it for verification.

## The device matrix

**You cannot test everything.** Choose:

**The oldest operating system version you support.**

**The cheapest and smallest device you support.** **More bugs surface here than anywhere
else** — less memory, slower disk, smaller screen, all at once.

**One device from each major manufacturer** whose users you have, because their background
policies differ.

**And the newest, for the largest screen and any new platform behaviour.**

**Four devices covers most of it**, and a cloud device farm covers the rest for a release
rather than for a change.

## What to test only on a device

**Startup time**, from cold, on the cheapest device.

**Scrolling a long list**, watching for stutter.

**A process kill and restore**, with the developer setting on.

**Aeroplane mode and a lossy network.**

**Permissions denied**, and permissions revoked while the app is running — **which is a real
case almost nobody tests and which crashes a lot of apps.**

**An interruption:** a call mid-task, a notification, the app switcher.

**Low storage**, low memory, and low battery, where the system changes its behaviour.

## Automating what you can

**Unit tests for logic**, which need no device.

**Instrumented tests for screens**, which run on emulators in the pipeline.

**A smoke test on one real device per release**, through a cloud farm if you do not have a
lab.

**And manual testing for feel**, which is not automatable and is not optional. **Half an hour
with the app on a real device before each release finds things no suite will**, and every
team that skips it learns the same lesson.`,
    mcqs: [
      mcq('The emulator is least trustworthy about:',
        [['Performance, since it runs on your desktop processor', true],
          ['Layout across a range of screen sizes', false],
          ['Logic that does not touch the platform', false],
          ['Behaviour on operating system versions you lack', false]],
        'Nothing it says about speed transfers to a device.'),
      mcq('Bug reports you cannot reproduce most often come from:',
        [['Manufacturer behaviour, such as aggressive background policies', true],
          ['Operating system versions rather older than your stated minimum', false],
          ['Screen sizes outside your tested range', false],
          ['Network conditions worse than you simulated', false]],
        'Test one device from each major manufacturer whose users you have.'),
      mcq('The device that surfaces the most bugs is:',
        [['The cheapest and smallest you support', true],
          ['The newest flagship with the largest screen', false],
          ['The most common model among your users', false],
          ['Whichever runs the oldest operating system', false]],
        'Less memory, slower disk, smaller screen, all at once.'),
      mcq('Permissions revoked while the app is running:',
        [['Is a real case almost nobody tests, and it crashes a lot of apps', true],
          ['Cannot happen without the app being restarted', false],
          ['Is handled automatically by the platform permission framework', false],
          ['Only affects location and camera access', false]],
        'Test it on a device, deliberately.'),
    ],
    checkpoint: [
      mcq('Four devices in the matrix should cover:',
        [['Oldest OS, cheapest model, one per major manufacturer, and the newest', true],
          ['The four most common models among your users', false],
          ['Two from each of the two major platforms', false],
          ['A range of screen sizes running from the smallest to the largest', false]],
        'A cloud farm covers the rest for a release rather than for a change.'),
      mcq('Half an hour with the app on a real device before each release:',
        [['Finds things no automated suite will, and is not optional', true],
          ['Duplicates what the instrumented tests already cover', false],
          ['Is worthwhile only for user-facing changes', false],
          ['Can be replaced by a cloud device farm run', false]],
        'Every team that skips it learns the same lesson.'),
      mcq('The emulator remains the right tool for:',
        [['Automated tests in the pipeline, where it is the only practical option', true],
          ['Verifying the startup time across a wide range of screen sizes', false],
          ['Confirming behaviour under memory pressure', false],
          ['Checking how a gesture feels in the hand', false]],
        'Rapid iteration is real value; do not mistake it for verification.'),
    ],
  },

  /* ══ T3_MOBILE_PROJECT ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_MOBILE_PROJECT_BRIEF',
    notes: `Write down what you are building and — the part that makes this a mobile brief —
**what it must do without a network.**

## The offline section is the brief

A web brief can leave connectivity implicit. **A mobile brief cannot**, because the answer
changes the data model, the API, the storage and the amount of work by a factor of two.

**Go screen by screen** and write one of three words:

**Hostile** — requires a network, fails clearly without one.

**Tolerant** — reads work locally, writes fail politely.

**First** — everything works, writes queue and sync.

**Then justify each one.** "Offline-first because a warehouse has no signal in the aisles" is
a reason. "Offline-first because it is better" is not, and it is how a two-week project
becomes six.

## The rest of the brief

1. **What it does**, in two sentences.
2. **Who uses it**, and where — in an office, on a train, in a basement.
3. **The screens.** Three to five. More is not a bigger mark.
4. **The data.** What is on the device, what is on the server, and **what must never be on
   the device.**
5. **Authentication.** What persists, for how long, and what logout must clear.
6. **The devices.** Which operating system version, which models you will test on.
7. **What it deliberately does not do.**

## The definition of done

- [ ] Runs on a **real device**, not only an emulator
- [ ] Three or more screens with the back button handled on every one
- [ ] Nothing traps the user, and no draft is lost on back
- [ ] State survives rotation on every screen
- [ ] **State survives a process kill**, verified with kill-on-background enabled
- [ ] Reads served from local storage, refreshed in the background
- [ ] A write queue persisted on enqueue, with ids the server deduplicates on
- [ ] Login persists across a restart, with the token in the secure store
- [ ] Refresh happens once under concurrent failures, not five times
- [ ] Logout clears the token and the cached personal data
- [ ] Every request has a timeout and is cancelled with its screen
- [ ] A release build installed and used on a device for at least half an hour
- [ ] Startup time measured on the cheapest device you support

**The process-kill item is the one that separates this from a web app with a phone-shaped
frame**, and it is the one most likely to be skipped.

## Time

**A third on the app, a third on offline and sync, a third on proving it on a device.**

**People give the last third to features**, and then present an app they have only ever run
on a simulator — which is visible in thirty seconds to anybody who has shipped one.`,
    mcqs: [
      mcq('The offline section is what makes this a mobile brief because:',
        [['The answer changes the data model, API, storage and the work by a factor of two', true],
          ['Mobile users happen to be offline considerably more often than web users', false],
          ['Platform guidelines require offline support', false],
          ['It is the part most likely to be assessed', false]],
        'A web brief can leave connectivity implicit; this one cannot.'),
      mcq('"Offline-first because it is better" is not a justification because:',
        [['It is how a two-week project becomes six', true],
          ['Offline-first is rarely the correct posture', false],
          ['It does not name a specific screen', false],
          ['The brief requires a measurable criterion', false]],
        '"Because a warehouse has no signal in the aisles" is a reason.'),
      mcq('The done-list item that separates this from a web app in a phone-shaped frame is:',
        [['State surviving a process kill, verified with kill-on-background', true],
          ['Reads served from local storage', false],
          ['The back button being handled correctly on every single screen', false],
          ['A release build installed on a device', false]],
        'And it is the one most likely to be skipped.'),
      mcq('Giving the last third of the time to features rather than device testing:',
        [['Produces an app visible as simulator-only in thirty seconds', true],
          ['Is a reasonable trade to make when the deadline is tight', false],
          ['Matters only if the app targets older devices', false],
          ['Is acceptable if the emulator tests all pass', false]],
        'A third on the app, a third on sync, a third on proving it.'),
    ],
    checkpoint: [
      mcq('Offline posture should be decided:',
        [['Screen by screen, with a justification for each', true],
          ['Once for the whole application', false],
          ['Per data type rather than per screen', false],
          ['After the first version is working online', false]],
        'A list can be offline-first while a checkout is hostile.'),
      mcq('The data section of the brief must state:',
        [['What must never be on the device, as well as what is', true],
          ['The database schema in full', false],
          ['The expected size of the local cache after a week', false],
          ['Which fields each screen displays', false]],
        'Passwords, shared secrets, and more personal data than a screen needs.'),
      mcq('Three to five screens is specified because:',
        [['More is not a bigger mark, and depth is what is assessed', true],
          ['More would not fit in the time available', false],
          ['Navigation becomes unmanageable beyond five', false],
          ['It matches the number of topics covered in the track', false]],
        'The proving is where the marks are.'),
    ],
  },

  {
    unitCode: 'T3_MOBILE_PROJECT_BUILD',
    notes: `Build it, and get it onto a real device with data, authentication and offline
behaviour that survives everything the operating system does.

**The order below puts the device first**, because an app built entirely on a simulator and
installed on a phone at the end is an app you will spend the last evening fixing.

Budget around three and a half hours of focused work.`,
    assignment: {
      title: 'Mobile Project — Building and Shipping It',
      description: 'Screens, storage, auth, offline and a release build running on a real device.',
      instructions: `**Work from your brief.**

**Part one — on a device from the start**

1. Get the empty app onto a real device before you write a feature. Keep it there.
2. Turn on the developer setting that kills backgrounded processes. **Leave it on for the
   whole build.**

**Part two — the screens**

3. Three or more screens: a list, a detail, an editor.
4. Back handled everywhere. Nothing traps the user. Drafts kept, not discarded.
5. Identifiers passed between screens, never objects.
6. One deep link with a synthesised back stack.

**Part three — state**

7. The editor saves as the user types, debounced.
8. Everything restores from an identifier plus a reload, showing saved state first.
9. **Rotate every screen** and fix what disappears.

**Part four — data**

10. A local database. All reads served from it, refreshed in the background.
11. A freshness line on the list.
12. A write queue, persisted on enqueue, with server-deduplicated ids.
13. Optimistic application with a quiet pending marker.
14. Your chosen offline posture per screen, matching the brief.

**Part five — authentication**

15. Login persisting across a restart. Refresh token in the secure store, access token in
    memory.
16. Refresh on a 401, **once** under concurrent failures — trigger five simultaneous failed
    requests and prove it refreshes once.
17. Logout clears the token, tells the server, clears cached personal data, and works with no
    signal.

**Part six — the network**

18. Every request has a connect and a read timeout.
19. Every request is cancelled with its screen.
20. Retry with backoff on timeouts and 5xx only.
21. Idempotency keys on everything that writes.

**Part seven — ship it**

22. Build a **release** build, not a debug one.
23. Install it on the cheapest device you support.
24. **Measure cold startup time** and record it.
25. Use it for half an hour: offline, on a lossy network, with a call interrupting you, and
    with a permission revoked mid-session.
26. Record everything that broke, and fix what you can.

**Submit** the code, the recorded findings from steps 9, 16, 24 and 25, and the release build
or a capture of it running.`,
      rubric: [
        { criterion: 'On a real device throughout', description: 'Installed early, kill-on-background enabled for the whole build.', maxPoints: 15 },
        { criterion: 'Screens, back and state', description: 'Back handled everywhere, drafts kept, state surviving rotation and kill.', maxPoints: 20 },
        { criterion: 'Local-first data with a queue', description: 'Reads local, queue persisted on enqueue, ids deduplicated.', maxPoints: 20 },
        { criterion: 'Authentication that persists', description: 'Secure store, single refresh proved under five concurrent failures, clean logout.', maxPoints: 20 },
        { criterion: 'Network handled properly', description: 'Timeouts, cancellation, selective retry and idempotency keys.', maxPoints: 15 },
        { criterion: 'A release build, measured', description: 'Release build on the cheapest device, startup measured, half an hour of real use recorded.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Getting the empty app onto a device before writing a feature:',
        [['Avoids spending the last evening fixing a simulator-only app', true],
          ['Confirms the build configuration is correct', false],
          ['Is required before enabling developer settings', false],
          ['Speeds up the iteration loop throughout development', false]],
        'The order puts the device first for that reason.'),
      mcq('Kill-on-background should be enabled:',
        [['For the whole build, not only for a test at the end', true],
          ['Only while testing state restoration', false],
          ['After the offline behaviour is complete', false],
          ['During the final half hour of use on the device', false]],
        'Everything fragile surfaces as you build rather than afterwards.'),
      mcq('Triggering five simultaneous failed requests proves:',
        [['That the refresh happens once rather than five times', true],
          ['That the retry backoff is correctly configured', false],
          ['That requests are cancelled with their screen', false],
          ['That the queue replays in order', false]],
        'The commonest bug in this area, made visible deliberately.'),
    ],
  },

  {
    unitCode: 'T3_MOBILE_PROJECT_EXPLAIN',
    notes: `Defend the decisions. **On a mobile project the interesting questions are all
about what you chose to lose**, because every mobile decision loses something and an engineer
who cannot name the loss has not made a decision.

## The questions you will be asked

**Why this storage?** Preferences, database, files, secure store — and **what you deliberately
did not put on the device.** That last part is the one that shows judgement.

**Why this offline posture, per screen?** And what would change if the user were a warehouse
picker rather than an office worker.

**Why this conflict strategy?** **And what it loses** — every one of them loses something,
and the answer "field-level merge, falling back to asking, and it loses the case where two
people edit the same sentence" is the answer of somebody who has thought about it.

**How does the token survive a restart, and what happens if the phone is stolen?** The second
half is the real question.

**What happens when the process is killed mid-edit?** You should be able to demonstrate this
rather than describe it.

**What is your startup time, on which device?** A number, not an adjective.

## Demonstrate rather than describe

**You have a device. Use it.**

**Kill the process mid-edit and reopen it.** Ten seconds, and it answers three questions at
once.

**Turn on aeroplane mode, make a change, turn it back on.**

**Show the pending marker and the queue draining.**

**A demonstration on a device is worth ten minutes of architecture diagram**, and almost
nobody does it — which is exactly why it lands.

## Being honest about what is not done

**Name the case you handle badly.** Every mobile app has one.

**Name what you tested on and what you did not.** "Tested on one device and an emulator" is a
fine answer; **claiming a device matrix you do not have is not, and it is easy to check.**

**And say what would break at ten times the data.** If you developed with forty records, say
so — the debugging unit's point was that the behaviour at scale is a different program.

## What you would do with more time

**Two or three specific things**, each with a reason.

**Not "more features".** The things that would matter: a real device matrix, background sync
handed to the platform scheduler, conflict resolution for the remaining record types,
instrumented tests in a pipeline.

**Specific beats ambitious**, and an engineer who names three concrete next steps sounds like
somebody who has shipped before — which is the point of this unit.`,
    mcqs: [
      mcq('The interesting questions on a mobile project are about:',
        [['What you chose to lose, since every mobile decision loses something', true],
          ['Which framework and platform you selected', false],
          ['How closely you managed to follow the platform guidelines throughout', false],
          ['Which features you managed to complete', false]],
        'An engineer who cannot name the loss has not made a decision.'),
      mcq('The storage question is best answered by including:',
        [['What you deliberately did not put on the device', true],
          ['The size of the local database after a week', false],
          ['Which library you used for persistence', false],
          ['How the schema migrations are handled', false]],
        'That part is the one that shows judgement.'),
      mcq('A demonstration on a device:',
        [['Is worth ten minutes of architecture diagram, and almost nobody does it', true],
          ['Should follow the architectural explanation', false],
          ['Is only really convincing when the behaviour is clearly user-facing', false],
          ['Risks exposing bugs during the presentation', false]],
        'Which is exactly why it lands.'),
      mcq('Claiming a device matrix you do not have is:',
        [['Not acceptable, and easy to check', true],
          ['A reasonable simplification for a project write-up', false],
          ['Better than admitting to a single device', false],
          ['Acceptable if the emulator covered the same versions', false]],
        '"Tested on one device and an emulator" is a fine answer.'),
    ],
    checkpoint: [
      mcq('The real question inside "how does the token survive a restart" is:',
        [['What happens if the phone is stolen', true],
          ['Which storage mechanism you chose', false],
          ['How long the session lasts', false],
          ['Whether refresh is handled correctly', false]],
        'The second half is the one being asked.'),
      mcq('Startup time should be given as:',
        [['A number, together with the device it was measured on', true],
          ['A comparison against a similar existing application', false],
          ['A description of how it feels in use', false],
          ['A range across the devices you tested', false]],
        'A number, not an adjective.'),
      mcq('Naming three concrete next steps rather than "more features":',
        [['Sounds like somebody who has shipped before', true],
          ['Shows the project was left incomplete', false],
          ['Is expected only for production projects', false],
          ['Matters less than what was actually built', false]],
        'Specific beats ambitious, and that is the point of the unit.'),
    ],
  },
];
