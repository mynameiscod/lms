/**
 * The Mobile Engineering specialization track — sixteen units. Module P13.
 *
 * ── THE TRACK THE SPEC DOES NOT CONTAIN ───────────────────────────────────────────────────
 *
 * CareerPilot_Year_4_Mega_Curriculum_V1 omits MOBILE from its canonical directions. It is kept
 * here deliberately, and the reasoning is in year4StageMap's header: Year 3 authors a full
 * eighteen-unit Mobile track, so a student who committed to Mobile last year would otherwise
 * arrive in their placement year with no specialization month, nothing for mock 5 to be about,
 * and a portfolio gap where their direction should be.
 *
 * Dropping a direction is a decision about students who already exist rather than a tidy-up, and
 * this file is the alternative to making it silently.
 *
 * ── WHAT MAKES THIS DIRECTION DIFFERENT ───────────────────────────────────────────────────
 *
 * The runtime is hostile in ways no other track's is. The operating system can suspend or kill
 * you at any moment. The network disappears mid-operation and returns disagreeing with you. The
 * battery is a shared resource you are accountable for. The user may deny a permission your
 * feature depends on and still expect the app to work.
 *
 * None of those is an edge case. All four are ordinary conditions, and an app that treats them as
 * exceptional is an app that fails for most users eventually.
 *
 * Attribution: T4_MOBILE_DEPTH defaults to MOBILE_APP_BASICS with the lifecycle unit on
 * SOFTWARE_ARCHITECTURE and the state unit on STATE_MANAGEMENT; T4_MOBILE_BUILD to
 * MOBILE_APP_BASICS with offline on JS_ASYNC and the project on REST_APIS; T4_MOBILE_QUALITY to
 * DEBUGGING with the drill on AUTOMATED_TESTING and the battery unit on SECURE_CODING;
 * T4_MOBILE_PROOF to MOBILE_APP_BASICS.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_MOBILE_BUNDLES: PilotBundle[] = [
  /* ══ T4_MOBILE_DEPTH ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_MOBILE_DEPTH_THE_LIFECYCLE',
    notes: `**An operating system that can stop you** — the constraint no web application has to
think about.

## What actually happens

**Your app is foregrounded, backgrounded, suspended and terminated**, and the transitions are not
requested by you. A phone call arrives, the user switches apps, the system needs memory.

**Termination while backgrounded is normal**, not a failure. The user returns and expects to find
what they left, and the operating system gave you no notice.

## The four states worth designing against

**Active.** Running and visible.

**Backgrounded.** Running briefly, with limited time to finish what you started.

**Suspended.** In memory and not executing. Nothing runs, timers do not fire, requests do not
complete.

**Terminated.** Gone. The next launch is cold and your in-memory state does not exist.

## The design consequence

**Anything in memory can vanish.** A half-completed form, a selected item, an unsent message.

**So state that matters is written down at the moment it changes**, not when the user finishes.
The user does not finish; the system interrupts.

## Restoration, which is the part people skip

**Returning to the app should return you to where you were.** Not the home screen, and not a fresh
start.

**That requires deciding what "where you were" means** — the screen, the scroll position, the
draft, the selection — and it is a decision rather than something a framework provides.

## The interview version

**"What happens if the system kills your app while the user is halfway through something?"** It is
the defining question of the direction, and a candidate who has not designed for it will describe
the happy path and stop.`,
    mcqs: [
      mcq('Termination while backgrounded is described as normal rather than a failure, and the user returns expecting to find what they left, having been given:',
        [['No notice by the operating system', true],
         ['A warning dialog before it happened', false],
         ['A chance to save from within the app', false],
         ['Time to complete any pending work first', false]],
        'The system reclaims memory without consulting the app, so nothing in memory survives and no opportunity to persist is offered at that moment.'),
      mcq('In the suspended state the app is in memory and not executing, which means timers do not fire and:',
        [['Requests do not complete', true],
         ['Stored data becomes unreadable', false],
         ['The user interface is discarded', false],
         ['Push notifications are not delivered', false]],
        'No code runs at all, so any in-flight network operation stays incomplete until the app is resumed or is terminated outright.'),
    ],
    checkpoint: [
      mcq('State that matters is written down at the moment it changes rather than when the user finishes because:',
        [['The user does not finish; the system interrupts', true],
         ['Writing at the end is slower on a device', false],
         ['Frameworks discourage batched persistence', false],
         ['The final write may exceed the storage quota', false]],
        'Interruption arrives at an arbitrary point, so any strategy that waits for completion loses everything entered before it.'),
      mcq('Restoring "where you were" requires deciding what that means — the screen, the scroll position, the draft, the selection — and it is:',
        [['A decision rather than something a framework provides', true],
         ['Handled automatically by the operating system', false],
         ['Determined by which state was persisted last', false],
         ['Only necessary for apps that store documents', false]],
        'Platforms supply mechanisms for saving and restoring, and what constitutes the user’s position is an application-level judgement.'),
    ],
  },
  {
    unitCode: 'T4_MOBILE_DEPTH_STATE_ON_A_DEVICE',
    notes: `**What lives in memory, what is written down, and what must still be there
tomorrow.**

## Three tiers, with different guarantees

**In memory.** Fast, and gone at termination. Fine for anything derivable or genuinely transient.

**On the device.** Survives termination and restart. A local database, key-value storage, files.

**On the server.** Survives the device being lost, replaced or reinstalled, and is visible to the
user's other devices.

## The question that assigns each piece

**"What is the worst thing that happens if this disappears?"**

**Nothing** — memory. **The user retypes something** — device. **The user loses work, or two
devices disagree** — server.

## What belongs on the device that people put in memory

**Drafts.** An unsent message, a partly completed form. **These are the single most common loss**,
and the user blames the app, correctly.

**The last known good data**, so a cold launch without a network shows something rather than a
spinner.

**Anything the user would have to fetch again**, on a connection that may not exist.

## Local storage is not a cache by default

**A cache has an expiry policy and a size bound.** Local data with neither grows until the device
complains, and a device with no storage left is a support problem you caused.

**Decide both when you write the first record**, not when somebody reports it.

## Sensitive data

**Device storage is not private on a compromised device**, and credentials belong in the
platform's secure storage rather than in ordinary local storage.

**And the honest rule:** if you do not need to keep it, do not. The safest data on a device is the
data that is not there.`,
    mcqs: [
      mcq('The question that assigns a piece of state to a tier is what is the worst thing that happens if it disappears, where "the user loses work, or two devices disagree" indicates:',
        [['The server', true],
         ['The device’s local database', false],
         ['In-memory state with restoration', false],
         ['A cache with a short expiry period', false]],
        'Only server storage survives device loss and reconciles between devices, which are the two failures that answer names.'),
      mcq('Local data with no expiry policy and no size bound grows until the device complains, which makes a device with no storage left:',
        [['A support problem you caused', true],
         ['A platform limitation outside your control', false],
         ['An unavoidable cost of offline support', false],
         ['A signal that the user should reinstall', false]],
        'The application wrote the records and set no bound, so the resulting failure is a design decision that was made by not making it.'),
    ],
    checkpoint: [
      mcq('Drafts are described as the single most common loss, and the user blames the app:',
        [['Correctly', true],
         ['Although the operating system caused it', false],
         ['Only when no warning was displayed first', false],
         ['Unless the draft was very recently started', false]],
        'Persisting a draft is entirely within the app’s control, so losing it to an ordinary termination is an application failure rather than a platform one.'),
      mcq('The honest rule about sensitive data on a device is that if you do not need to keep it, do not — because the safest data is:',
        [['The data that is not there', true],
         ['Encrypted with a platform-managed key', false],
         ['Stored only for the current session', false],
         ['Synchronised to the server immediately', false]],
        'Any stored value is exposed if the device is compromised, so not retaining it removes the risk rather than mitigating it.'),
    ],
  },
  {
    unitCode: 'T4_MOBILE_DEPTH_PRACTICE',
    notes: `**Applying both ideas to an app you did not build.**

## The drill

**Take a mobile app you use.** In thirty minutes produce:

**A state inventory.** What appears to be held in memory, on the device, and on the server —
inferred from behaviour rather than from source.

**Two experiments**: force-quit it mid-task and relaunch; turn the network off and use it.

**What survived, what did not, and what you would have expected.**

## Inferring from behaviour

**Force-quit and relaunch** tells you what was persisted. **Airplane mode** tells you what was
cached. **Reinstall** tells you what was server-side.

**Three experiments, each under a minute**, and between them they reveal the entire storage design
of an app you have no source for.

## The second half

**One thing it loses that it should not**, and where that state should have lived.

**Every app has one.** Finding it in an app built by a large team is the point: this is not a
beginner's mistake, it is a decision somebody made under a deadline, and you will make the same
one unless you have a habit.

## What good looks like

**You can predict what will survive before you run the experiment**, and be right. That is the
form the understanding takes, and it transfers directly to designing your own.`,
    mcqs: [
      mcq('Force-quitting and relaunching reveals what was persisted, airplane mode reveals what was cached, and reinstalling reveals what was:',
        [['Server-side', true],
         ['Held only in volatile memory', false],
         ['Stored in the platform’s secure storage', false],
         ['Derived rather than stored at all', false]],
        'Reinstalling removes all local storage, so anything still present afterwards must have been fetched from a server.'),
      mcq('Finding the state loss in an app built by a large team is the point because it is not a beginner’s mistake but:',
        [['A decision somebody made under a deadline', true],
         ['A limitation of the platform being used', false],
         ['A trade-off accepted for better performance', false],
         ['An intentional simplification for most users', false]],
        'Persistence work is deferrable and invisible when it is skipped, so it is the first thing dropped under schedule pressure by experienced teams too.'),
    ],
    checkpoint: [
      mcq('The form the understanding takes is being able to predict what will survive before running the experiment and:',
        [['Being right', true],
         ['Explaining the platform mechanism involved', false],
         ['Identifying which framework was used to build it', false],
         ['Measuring how long the restoration takes', false]],
        'A correct prediction demonstrates a working model of the storage design rather than an ability to observe its behaviour after the fact.'),
      mcq('The state inventory is inferred from behaviour rather than from source because:',
        [['You have no source for an app you did not build', true],
         ['Source code would give away the answer too easily', false],
         ['Behaviour is more reliable than implementation', false],
         ['The inventory is only about observable state', false]],
        'The exercise uses apps you merely use, so the three experiments are the only available means of establishing the design.'),
    ],
  },
  {
    unitCode: 'T4_MOBILE_DEPTH_INTERVIEW_QUESTION',
    notes: `**"What happens to your app when the operating system kills it?"**

## Why this is the mobile depth question

**Because it separates immediately**, and because it is the constraint that makes the platform
different. A candidate who has built for the web and moved across will answer the happy path and
stop.

## The answer

**Name the states.** Active, backgrounded, suspended, terminated, and what runs in each.

**Say that termination is normal**, not exceptional.

**Then what you persist and when.** At the moment of change, not at completion, because there is
no completion.

**Then restoration.** What "where you were" means in your app, and that it was a decision.

## The follow-ups

**"What about work in progress when it is backgrounded?"** Limited time to finish, and the honest
answer that long work must be resumable rather than completed.

**"How do you test this?"** Force-quit from the task switcher; the platform's tooling for
simulating termination. **Saying you have actually done it is the marker**, because most
candidates have only read about the lifecycle.

**"The user denies a permission your feature needs."** The app must still work, in a reduced form,
with a path to reconsider. **An app that becomes unusable is a design failure, not a user error.**

## The depth marker

**Treating interruption as the normal case.** A candidate who describes persistence as handling an
edge case has the model backwards: on a phone, being interrupted is the ordinary path and running
uninterrupted to completion is the lucky one.

## What loses marks

**Naming a framework's lifecycle method and nothing else.** The question is what your app does,
not which callback exists.`,
    mcqs: [
      mcq('A candidate who describes persistence as handling an edge case has the model backwards because on a phone:',
        [['Being interrupted is the ordinary path', true],
         ['Storage is slower than on a desktop machine', false],
         ['The framework already handles most of it', false],
         ['Users expect to lose unsaved work anyway', false]],
        'Calls, app switching and memory pressure interrupt constantly, so running through to completion uninterrupted is the less common outcome.'),
      mcq('When a user denies a permission the feature needs, the app must still work in a reduced form with a path to reconsider, because an app that becomes unusable is:',
        [['A design failure rather than a user error', true],
         ['Acceptable when the permission is essential', false],
         ['A platform restriction outside your control', false],
         ['Reasonable if the denial is clearly explained', false]],
        'Denial is a supported choice the platform offers, so an app that cannot function afterwards failed to design for a state it was told would occur.'),
    ],
    checkpoint: [
      mcq('Saying you have actually force-quit and tested restoration is the marker because most candidates have:',
        [['Only read about the lifecycle', true],
         ['Tested only on a simulator rather than hardware', false],
         ['Relied on the framework to handle it for them', false],
         ['Been unable to reproduce termination reliably', false]],
        'Lifecycle knowledge is available from documentation, so having exercised it deliberately distinguishes practice from reading.'),
      mcq('Naming a framework’s lifecycle method and nothing else loses marks because the question is what your app does rather than:',
        [['Which callback exists', true],
         ['How the platform implements suspension', false],
         ['Whether the framework is a suitable choice', false],
         ['When the method is invoked by the system', false]],
        'The callback is where the work would go; the answer required is what work is done there, which the method name does not supply.'),
    ],
  },

  /* ══ T4_MOBILE_BUILD ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_MOBILE_BUILD_WORKING_OFFLINE',
    notes: `**Queueing, local truth, and reconciling when the connection returns disagreeing with
you.**

## Offline is not an error state

**It is an ordinary condition**: a lift, a train, a basement, a bad signal. An app that shows an
error and stops has treated the common case as the exception.

## The local-first shape

**Write locally first, then synchronise.** The user's action succeeds immediately against local
storage, and a background process sends it when there is a network.

**That is what makes an app usable on a train**, and it introduces the entire difficulty of the
direction: two copies of the truth that can diverge.

## The queue

**Actions are recorded, not results.** "Mark item 4 as done" survives and can be replayed;
"the list now looks like this" cannot be merged with anything.

**The queue must be durable** — it survives termination — **and idempotent**, because a send whose
response was lost will be retried.

## Conflicts

**Two devices changed the same thing.** Somebody has to decide, and the options are:

**Last write wins.** Simple, and silently discards somebody's work.

**Server wins.** Predictable, and loses local changes the user watched succeed.

**Merge.** Correct where the data allows it — two different fields, or an append-only list.

**Ask the user.** Honest, and irritating if it happens often.

**There is no universally correct answer**, and choosing deliberately with the reason recorded is
the whole of the competence.

## What the user must see

**Whether their change has synchronised.** An action that looks identical whether it reached the
server or not is how a user discovers a week later that nothing saved.

**Pending, synced, failed** — three states, visible.`,
    mcqs: [
      mcq('A queue records actions rather than results because "the list now looks like this":',
        [['Cannot be merged with anything', true],
         ['Takes more storage than an action does', false],
         ['Is harder to serialise for transmission', false],
         ['Cannot be replayed in the correct order', false]],
        'A snapshot overwrites whatever the server holds, discarding concurrent changes, whereas an intent can be applied alongside them.'),
      mcq('An action that looks identical whether it reached the server or not is how a user discovers:',
        [['A week later that nothing saved', true],
         ['That the app works better offline', false],
         ['That their device storage is full', false],
         ['That conflicts were resolved silently', false]],
        'Without a visible synchronisation state the user has no signal, so an accumulating failure is invisible until they look for the data elsewhere.'),
    ],
    checkpoint: [
      mcq('The queue must be durable and idempotent, the second because:',
        [['A send whose response was lost will be retried', true],
         ['Actions may be recorded more than once locally', false],
         ['The server may process them out of order', false],
         ['Conflicts could otherwise be resolved twice', false]],
        'The client cannot distinguish a lost response from a failed request, so it retries and the server must treat the repeat harmlessly.'),
      mcq('Among conflict strategies, there is no universally correct answer, so the whole of the competence is:',
        [['Choosing deliberately with the reason recorded', true],
         ['Selecting the strategy the platform recommends', false],
         ['Implementing merge wherever it is technically possible', false],
         ['Asking the user whenever any conflict arises', false]],
        'Each strategy loses something different, and which loss is acceptable depends on the data and the users rather than on a general rule.'),
    ],
  },
  {
    unitCode: 'T4_MOBILE_BUILD_PERMISSIONS_AND_THE_USER',
    notes: `**Asking for a permission well**, and what the app must still do when the answer is
no.**

## The sequence that works

**Ask in context, at the moment the feature needs it**, with the reason visible. A permission
prompt on first launch, before the user knows what the app does, is the request most likely to be
denied.

**Explain before prompting.** The system dialog is terse and cannot be customised; a screen before
it can say why, and it is the difference between a considered yes and a reflexive no.

## You get one good chance

**A denied permission is difficult to re-request.** The platform may not show the dialog again, and
the user must go to system settings — which they will not do unless they want the feature.

**So do not spend the prompt early**, and do not spend it on something peripheral.

## Designing for denial

**The feature degrades; the app does not break.** A photo app without camera access can still show
the library. A maps feature without location can accept a typed address.

**And a path back.** If the user later wants it, a clear route to the settings screen — not a dead
end saying the permission is required.

## The permissions worth thinking hardest about

**Location, camera, microphone, contacts, notifications.** Each is a significant ask, and each has
a version that is less invasive: coarse location rather than precise, a single photo rather than
the library, notifications requested after the user has seen value.

**Ask for the least that works.** It is better for the user, and the acceptance rate is higher,
which is a rare case of the two aligning.

## Revocation

**A permission granted can be withdrawn while the app is in the background.** Code that checked
once at launch and cached the answer is wrong, and the failure is an unexplained blank screen.

**Check at the point of use, every time.**`,
    mcqs: [
      mcq('A permission prompt on first launch, before the user knows what the app does, is:',
        [['The request most likely to be denied', true],
         ['Required by most platforms at install time', false],
         ['The only opportunity to ask for sensitive access', false],
         ['Preferable because it avoids interrupting later', false]],
        'With no context for why it is needed, the safe default for the user is refusal, and the chance is then spent.'),
      mcq('Code that checks a permission once at launch and caches the answer is wrong because a permission can be:',
        [['Withdrawn while the app is backgrounded', true],
         ['Granted only for the current session', false],
         ['Downgraded to a coarser level automatically', false],
         ['Different between the app’s several screens', false]],
        'The user can change it in system settings at any time, so a cached grant becomes stale and the feature fails without explanation.'),
    ],
    checkpoint: [
      mcq('Asking for the least that works is a rare case where two things align, namely that it is better for the user and:',
        [['The acceptance rate is higher', true],
         ['The implementation is simpler to write', false],
         ['The platform review process is faster', false],
         ['The feature performs better at runtime', false]],
        'A smaller ask is easier to grant, so the less invasive option is both more respectful and more likely to be accepted.'),
      mcq('When a user later wants a denied permission, the app must provide a clear route to the settings screen rather than:',
        [['A dead end saying the permission is required', true],
         ['Prompting for the permission a second time', false],
         ['Disabling the feature without explanation', false],
         ['Offering a reduced version of the feature', false]],
        'The platform may not show the dialog again, so without a route to settings the user has no way to change their mind from inside the app.'),
    ],
  },
  {
    unitCode: 'T4_MOBILE_BUILD_MINI_PROJECT',
    notes: `**An app that survives real conditions** — backgrounding, network loss, and a denied
permission.

## The brief

**Something small with a real server behind it.** Two or three screens, one thing the user creates
or changes, and one permission-dependent feature.

## What must be demonstrable

**Force-quit mid-task and relaunch**, and the user is where they were with their draft intact.

**Airplane mode**, and the app remains usable: local data is shown, the action succeeds locally,
and its synchronisation state is visible.

**Reconnection**, and the queued action is sent exactly once. **Demonstrate the "exactly once"**
by sending with the response dropped.

**A denied permission**, and the app works in a reduced form with a path back to settings.

**A conflict**, and whatever you chose — with the reason recorded.

## The demonstration is the deliverable

**Recorded, not described.** Four short clips or a sequence of screenshots: the force-quit, the
airplane mode, the reconnection, the denial.

**A submission that only shows the app working has not shown the part that was hard**, and on this
track that is the entire assignment.

## What to submit

**The app, the four demonstrations, and a note covering:** what you persist and when, your conflict
strategy and why, and **which of the four you had not handled before starting.**

**Most people find backgrounding.** It is the one that never happens while you are developing,
because you are looking at the screen.`,
    assignment: {
      title: 'An app that survives real conditions',
      description: 'Build a small server-backed app that survives termination, network loss, reconnection and a denied permission, and demonstrate each.',
      instructions: `Build something small with a real server behind it: two or three screens, one
thing the user creates or changes, and one permission-dependent feature.

**Demonstrate four conditions, recorded rather than described:**

**Force-quit mid-task and relaunch** — the user returns to where they were with their draft
intact.

**Airplane mode** — the app remains usable, local data is shown, the action succeeds locally, and
its synchronisation state is visible to the user.

**Reconnection** — the queued action is sent **exactly once**. Prove it by dropping the response so
a retry occurs.

**A denied permission** — the app works in reduced form with a clear path back to settings.

**Submit:** the app, four short clips or screenshot sequences, and a note covering what you persist
and when, your conflict strategy and the reason for it, and **which of the four you had not handled
before starting this**. Most people find backgrounding — it is the one that never happens while
you are developing, because you are looking at the screen.

A submission that only shows the app working has not shown the part that was hard, and on this
track that is the entire assignment.`,
      rubric: [
        { criterion: 'Survives termination with state intact', description: 'A force-quit mid-task is demonstrated and the user returns to their position with the draft preserved.', maxPoints: 25 },
        { criterion: 'Usable offline, with sync state visible', description: 'The app functions without a network and the user can see whether their change has synchronised.', maxPoints: 25 },
        { criterion: 'Exactly-once on reconnection', description: 'A retry caused by a dropped response is shown not to duplicate the effect.', maxPoints: 25 },
        { criterion: 'Degrades on denial, with a route back', description: 'A denied permission leaves the app usable in reduced form and offers a path to reconsider.', maxPoints: 25 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Backgrounding is the condition most people find they had not handled because it never happens while you are developing, since:',
        [['You are looking at the screen', true],
         ['Debug builds disable the suspension', false],
         ['Simulators do not reclaim memory', false],
         ['Development devices have ample memory', false]],
        'The app stays foregrounded throughout development, so the transition that causes the loss is never exercised accidentally.'),
      mcq('Proving "exactly once" on reconnection requires dropping the response so that:',
        [['A retry occurs and can be shown to be harmless', true],
         ['The server records the duplicate attempt', false],
         ['The queue is exercised under a failure condition', false],
         ['The synchronisation state changes to failed', false]],
        'Without a retry the idempotency is never exercised, so the demonstration would show only that a single successful send works.'),
    ],
  },
  {
    unitCode: 'T4_MOBILE_BUILD_DEBUGGING',
    notes: `**It works in the simulator.** Reproducing and fixing something that only happens on
hardware.

## What the simulator does not have

**Real memory pressure.** It has the host machine's memory, so the termination that kills your app
on a three-year-old phone never occurs.

**A real network.** Localhost latency, no packet loss, no transition between networks mid-request.

**Real sensors and permissions.** Camera, location and biometrics behave differently or are
simulated.

**Real performance.** A desktop processor runs your code far faster than the device will.

**Real storage constraints.** And a real battery, which does not exist at all.

## The approach

**Reproduce on a device first.** Everything else is guessing, and a fault that does not reproduce
in the simulator is telling you which of the five it involves.

**Then narrow by category.** Memory, network, permission, performance, storage. **Each has a
deliberate way to provoke it**: fill the memory, throttle or disable the network, revoke the
permission, throttle the processor, fill the storage.

**Provoking beats waiting.** A fault that appears once an hour under normal use appears
immediately under the right pressure.

## Getting evidence off the device

**Logs, and crash reports.** A crash that happens on a user's phone and produces nothing is
undiagnosable, which is why a crash reporter is not optional in anything real.

**And a log the user can send you**, because a report that says "it crashed" is the majority of
what arrives.

## The hardest one

**A fault that only happens on one device model or one operating system version.** Not
reproducible on anything you own, and the only evidence is aggregated crash reports.

**The technique is defensive**: log more around the suspected path, ship, and read the next batch.
It is slow and it is frequently the only thing available.`,
    mcqs: [
      mcq('The simulator has the host machine’s memory, so the termination that kills the app on a three-year-old phone:',
        [['Never occurs during development', true],
         ['Happens more often than on a device', false],
         ['Is reported differently by the tooling', false],
         ['Can only be triggered manually by the developer', false]],
        'Without memory pressure the system never needs to reclaim the app, so the lifecycle transition that causes the failure is not exercised.'),
      mcq('Provoking beats waiting because a fault that appears once an hour under normal use appears:',
        [['Immediately under the right pressure', true],
         ['In the crash reports within a few days', false],
         ['Only when several conditions coincide', false],
         ['More clearly when the logs are verbose', false]],
        'Deliberately creating the condition removes the waiting, turning an intermittent observation into a reproducible one.'),
    ],
    checkpoint: [
      mcq('A crash on a user’s phone that produces nothing is undiagnosable, which is why a crash reporter:',
        [['Is not optional in anything real', true],
         ['Should be enabled only in debug builds', false],
         ['Must be approved by the platform vendor', false],
         ['Replaces the need for logging entirely', false]],
        'The device is not available for inspection, so without automatic reporting the only evidence is a user description.'),
      mcq('For a fault on one device model that you cannot reproduce, the technique is to log more around the suspected path, ship, and:',
        [['Read the next batch of reports', true],
         ['Purchase the affected device model', false],
         ['Disable the feature for that model', false],
         ['Ask affected users to run a debug build', false]],
        'Aggregated reports from real devices are the only evidence available, so each release becomes an experiment that the next batch answers.'),
    ],
  },
  {
    unitCode: 'T4_MOBILE_BUILD_INTERVIEW_QUESTION',
    notes: `**"How does your app behave with no network?"**

## Why this is the build question for mobile

**Because it is the condition every user meets and most student apps fail.** The answer reveals
within a minute whether the app was built for a phone or for a laptop on a desk.

## The answer

**What is shown.** Cached data, not a spinner and not an error screen.

**What the user can still do.** Actions succeed locally and queue.

**What they can see about it.** Pending, synced, failed — visible, so nothing is silently lost.

**What happens on reconnection.** The queue drains, exactly once, because the operations are
idempotent.

**And what happens on conflict**, with the strategy named and a reason.

## The follow-ups

**"How do you avoid sending twice?"** Idempotency key. Asked almost every time, because a lost
response followed by a retry is the ordinary case on a mobile network.

**"The user edits on two devices."** Your conflict strategy, and what it discards.

**"How do you test this?"** Airplane mode, a network-conditioning tool, and dropping the response
deliberately. **Having actually done the third is the marker.**

## The depth marker

**Saying what the user sees, not only what the code does.** "The action queues" is an
implementation fact. "The row shows a pending indicator and the user can carry on" is the same
fact from the position that matters, and this direction is judged from that position.

## What loses marks

**"It shows an error."** It is honest and it is the answer of somebody who treated the common case
as an exception, which is the specific misunderstanding the question exists to find.`,
    mcqs: [
      mcq('"How do you avoid sending twice?" is asked almost every time because on a mobile network the ordinary case is:',
        [['A lost response followed by a retry', true],
         ['Two devices submitting at the same moment', false],
         ['A request that arrives out of order', false],
         ['A connection that drops before sending', false]],
        'Mobile connections lose responses routinely, so the client cannot tell whether the operation succeeded and retries by design.'),
      mcq('"It shows an error" is honest and is the answer of somebody who treated the common case as:',
        [['An exception', true],
         ['A platform responsibility to handle', false],
         ['Too rare to justify the implementation', false],
         ['Something the framework resolves by default', false]],
        'Being offline is ordinary on a phone, so an error state reveals the app was designed for continuous connectivity.'),
    ],
    checkpoint: [
      mcq('The depth marker is saying what the user sees rather than only what the code does, because this direction is judged from:',
        [['The position that matters, which is the user’s', true],
         ['The reviewer’s reading of the source code', false],
         ['The platform vendor’s published guidelines', false],
         ['The performance measured on real devices', false]],
        'Mobile quality is experienced rather than inspected, so describing the implementation without the visible consequence omits the assessment criterion.'),
      mcq('Among the ways to test offline behaviour, the one where having actually done it is the marker is:',
        [['Dropping the response deliberately', true],
         ['Enabling airplane mode on the device', false],
         ['Using a network-conditioning tool', false],
         ['Testing on a genuinely slow connection', false]],
        'The first two are easy and common; deliberately discarding a response to force a retry requires having decided the idempotency needed proving.'),
    ],
  },

  /* ══ T4_MOBILE_QUALITY ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_MOBILE_QUALITY_BATTERY_STORAGE_AND_TRUST',
    notes: `**Background work, local storage, and the personal data an app should not be holding
at all.**

## Battery is a shared resource you are accountable for

**The user sees one number**, and an app that drains it is uninstalled regardless of how good the
feature was.

**The expensive operations**, in rough order: the radio, location — particularly precise and
continuous — the screen, and sustained processing.

**The radio is the one people underestimate.** Waking it costs far more than the bytes sent, which
means **many small requests are far worse than one batched one**, and a polling interval chosen
without thought is the commonest cause of a battery complaint.

## Background work

**The platform limits it deliberately**, and fighting the limits is both futile and the behaviour
the platform is protecting users from.

**Batch, defer, and use the platform's scheduler**, which can run your work when the device is
charging and on a good network — which is better for the user and for you.

## Storage

**Bound it.** A cache with no expiry and no size limit is a device that fills up, and the user
cannot tell which app did it.

**Clean up.** Deleted records, orphaned files, logs. A local database grows in ways nobody notices
until a support report.

## The data you should not hold

**Ask what you would lose if the device were compromised**, and remove anything not needed. **The
safest data is the data that is not there.**

**Credentials in the platform's secure storage**, never in ordinary local storage.

**And permissions used for what was asked.** A location permission granted for a delivery address
and used for continuous tracking is a breach of what the user agreed to, whatever the small print
says — and it is the kind of decision that ends careers rather than sprints.`,
    mcqs: [
      mcq('The radio is underestimated because waking it costs far more than the bytes sent, which means:',
        [['Many small requests are worse than one batched one', true],
         ['Large payloads should be avoided where possible', false],
         ['Compression matters more than request count', false],
         ['Requests should be sent only on a fast network', false]],
        'The fixed cost of powering the radio dominates, so consolidating transfers reduces energy use far more than reducing their size.'),
      mcq('A location permission granted for a delivery address and used for continuous tracking is a breach of what the user agreed to:',
        [['Whatever the small print says', true],
         ['Unless the policy disclosed the wider use', false],
         ['Only where local regulation prohibits it', false],
         ['Unless the data is anonymised before storage', false]],
        'Consent was given in a specific context, and a legal disclosure elsewhere does not make the broader use what the user understood themselves to permit.'),
    ],
    checkpoint: [
      mcq('Fighting the platform’s background work limits is both futile and:',
        [['The behaviour the platform protects users from', true],
         ['Likely to drain the battery more quickly', false],
         ['A violation of the developer agreement', false],
         ['Unnecessary given the scheduler’s flexibility', false]],
        'The limits exist because unconstrained background work harmed users, so circumventing them is the specific thing they were introduced to prevent.'),
      mcq('A cache with no expiry and no size limit fills the device, and the particular difficulty for the user is that they:',
        [['Cannot tell which app did it', true],
         ['Must reinstall to reclaim the space', false],
         ['Receive no warning before it happens', false],
         ['Lose data when the system intervenes', false]],
        'Storage usage is attributed at a coarse level, so the user experiences a full device without a clear cause to act on.'),
    ],
  },
  {
    unitCode: 'T4_MOBILE_QUALITY_HARDER_FAULT',
    notes: `**An app that passes every test it has and is still wrong.**

## Why mobile tests miss so much

**They run on a simulator, foregrounded, on a fast network, with permissions granted, on one
device, with a fresh install.** Every one of those is a condition the fault needs.

## The five

**A leak that only matters after long use.** A listener never removed, a reference retained across
screens. The app is fine for five minutes and unusable after an hour, which nobody reproduces
deliberately and every heavy user meets.

**State lost on backgrounding.** Passes every test because tests never background the app.

**A race on reconnection.** The queue drains while the user is also acting, and the two interleave.

**A layout that breaks on one screen size or font setting.** Accessibility text scaling is the one
most often forgotten, and it is a setting real users have on.

**A permission revoked mid-session.** Checked once, cached, and the feature fails with a blank
screen rather than an explanation.

## Finding them

**Vary what the tests hold constant**: background and restore repeatedly, run for an hour, enable
large text, revoke a permission while running, reconnect while acting.

**Each takes minutes and each finds a class the suite cannot.**

## The one that is hardest

**The leak**, because it requires accumulation and the symptom — gradual sluggishness — is
attributed to the device rather than to the app. **Users do not report it; they uninstall.**`,
    mcqs: [
      mcq('Accessibility text scaling is the layout condition most often forgotten, and it matters because it is:',
        [['A setting real users have on', true],
         ['Enforced by the platform review process', false],
         ['Applied automatically on larger devices', false],
         ['Required for the app to be published', false]],
        'A substantial proportion of users increase text size, so a layout that only works at the default breaks for them permanently.'),
      mcq('The leak is hardest to find because it requires accumulation and the symptom is attributed to the device, so users:',
        [['Do not report it; they uninstall', true],
         ['Restart the app and continue using it', false],
         ['Report it as a crash rather than slowness', false],
         ['Only notice it on older hardware models', false]],
        'Gradual sluggishness reads as the phone ageing, so it produces no report while still driving the user away.'),
    ],
    checkpoint: [
      mcq('Mobile tests miss this class because they run on a simulator, foregrounded, on a fast network, with permissions granted, on one device and with:',
        [['A fresh install', true],
         ['The default accessibility settings', false],
         ['A debug build of the application', false],
         ['A single user account signed in', false]],
        'A fresh install has no accumulated state, so leaks, storage growth and migration faults from earlier versions are all absent.'),
      mcq('A permission revoked mid-session fails with a blank screen rather than an explanation because the app:',
        [['Checked once and cached the answer', true],
         ['Cannot detect the revocation at all', false],
         ['Is suspended when settings are opened', false],
         ['Treats revocation as an unrecoverable error', false]],
        'The cached grant is stale, so the call fails while the app still believes it is permitted and therefore has no handling for the refusal.'),
    ],
  },
  {
    unitCode: 'T4_MOBILE_QUALITY_PRACTICE',
    notes: `**Reviewing and hardening an app without being told what to look for.**

## The drill

**An app, no issue report, thirty minutes.** Findings ordered by consequence.

## The mobile review checklist

**What is lost if the system kills it right now?**

**What happens with no network — at launch, and mid-action?**

**Is any permission checked once and cached?**

**Does anything subscribe, observe or listen without removing it?**

**Is local storage bounded, and is anything cleaned up?**

**How often does it wake the radio, and could those be batched?**

**Does it hold any personal data it does not need?**

Seven questions, twenty minutes, any app.

## Ordering the findings

**By what the user loses.** Data loss outranks a layout problem, which outranks battery use,
which outranks an inefficiency nobody perceives.

**Students order by how visible it is on screen**, which puts cosmetic issues above silent data
loss — exactly backwards for this direction, where the serious faults are all invisible until
they have already cost somebody something.

## Writing it up

**Name the situation and the loss.** "A user who is interrupted by a phone call while writing a
message loses it" is a finding. "State is not persisted" is a category.

## Why this is the practice unit

**Because every serious mobile fault is invisible in the ordinary case**, and the only defence is a
deliberate pass with questions that assume the hostile conditions rather than the friendly ones.`,
    mcqs: [
      mcq('Students order findings by how visible they are on screen, which is exactly backwards for this direction because the serious faults are:',
        [['Invisible until they have cost somebody something', true],
         ['Reported more frequently than cosmetic ones', false],
         ['Caused by the platform rather than the app', false],
         ['Only reproducible on particular devices', false]],
        'Data loss, leaks and battery drain produce no on-screen symptom at the time, so visibility as a ranking inverts their real severity.'),
      mcq('"A user who is interrupted by a phone call while writing a message loses it" is a finding where "state is not persisted" is:',
        [['A category with no loss attached', true],
         ['An accurate but incomplete description', false],
         ['A platform concern rather than an app one', false],
         ['Something the framework should handle itself', false]],
        'Naming the situation and what the user loses makes it a cost that can be weighed, where the category is an observation that can be deferred.'),
    ],
    checkpoint: [
      mcq('The findings order places data loss above a layout problem, above battery use, above:',
        [['An inefficiency nobody perceives', true],
         ['A permission that is cached incorrectly', false],
         ['Storage that grows without any bound', false],
         ['A race that occurs on reconnection only', false]],
        'Ranking is by what the user loses, and an inefficiency with no perceptible effect costs them nothing at all.'),
      mcq('The only defence against faults invisible in the ordinary case is a deliberate pass with questions that assume:',
        [['The hostile conditions rather than the friendly ones', true],
         ['The app will be used on older hardware', false],
         ['The user has accessibility settings enabled', false],
         ['The network will be unavailable at launch', false]],
        'Ordinary development exercises only the favourable path, so the questions must deliberately posit interruption, loss and denial.'),
    ],
  },
  {
    unitCode: 'T4_MOBILE_QUALITY_INTERVIEW_QUESTION',
    notes: `**"How do you make sure your app works for everybody, everywhere?"**

## What "everybody, everywhere" includes

**A three-year-old phone. A train with no signal. A user with large text enabled. Somebody who
denied a permission. A device that is nearly full. A battery at eight percent.**

**None of those is unusual**, and a candidate who hears the question as being about screen sizes
has answered a much narrower one.

## The answer

**Start with the conditions, not the tooling.** Name the six above, and what each one breaks.

**Then the practices:** persist at the moment of change, work offline by default, check
permissions at the point of use, bound storage, batch network work, test with large text.

**Then testing on real devices**, and honestly which ones you have.

**Then what you do not cover.** Nobody tests on every device and every version. Saying which you
covered and which you did not is more credible than implying completeness, and an interviewer will
find the gap in one follow-up anyway.

## The follow-ups

**"How do you test on devices you do not have?"** Crash reports and aggregated metrics, and the
honest admission that the first evidence is frequently a user's report.

**"What is the first thing you would measure?"** Crash-free sessions. It is the single number that
best summarises whether the app works, and most candidates reach for performance instead.

**"How do you handle a very old device?"** Degrade rather than exclude, and know the oldest version
you support and why.

## The depth marker

**Naming the conditions before the tooling.** It shows the constraints are understood rather than a
process being recited, and it is the difference between somebody who has shipped to real users and
somebody who has run a simulator.`,
    mcqs: [
      mcq('A candidate who hears "everybody, everywhere" as being about screen sizes has answered:',
        [['A much narrower question', true],
         ['The question as most interviewers intend it', false],
         ['Correctly, since layout is the main variable', false],
         ['Only the part relevant to newer devices', false]],
        'The phrase spans network, hardware age, accessibility settings, permissions and storage, of which screen size is one narrow aspect.'),
      mcq('The first thing to measure is crash-free sessions because it is the single number that best summarises whether the app works, while most candidates reach for:',
        [['Performance instead', true],
         ['Daily active user counts', false],
         ['Application size on disk', false],
         ['Network request success rates', false]],
        'Performance is more visible to a developer, but an app that crashes has failed entirely and that outranks how quickly it runs when it does not.'),
    ],
    checkpoint: [
      mcq('Saying which devices you covered and which you did not is more credible than implying completeness because an interviewer will:',
        [['Find the gap in one follow-up anyway', true],
         ['Have tested on the same limited set', false],
         ['Expect a specific minimum device list', false],
         ['Assume the worst if nothing is stated', false]],
        'The range of devices is large enough that no individual covers it, so a claim of full coverage is immediately testable and fails.'),
      mcq('Naming the conditions before the tooling shows the constraints are understood rather than a process recited, and it distinguishes somebody who has shipped to real users from somebody who has:',
        [['Run a simulator', true],
         ['Read the platform documentation', false],
         ['Worked only on internal applications', false],
         ['Built for a single device family', false]],
        'The conditions are learned from users encountering them, whereas the tooling and the practices are available from documentation.'),
    ],
  },

  /* ══ T4_MOBILE_PROOF ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_MOBILE_PROOF_ADVANCED_CHALLENGE',
    notes: `**Explain a storage, permission or battery decision to somebody sceptical about it.**

## The brief

**Take a real decision from your own app** where you chose something a reasonable person would
question, and defend it.

**Candidates for a good one:** what you persist locally and what you do not; why you ask for a
permission at the moment you do; how often you wake the radio; what you keep on the device and for
how long.

## Why these decisions specifically

**Because each one trades something the user cares about against something else the user cares
about**, and there is no answer that is simply correct.

**Storing more means better offline behaviour and more data at risk.** Asking for a permission
earlier means more capability and a higher chance of refusal. Syncing more often means fresher
data and a worse battery.

## What the defence must contain

**What you optimised for**, and why it suits these users rather than users in general.

**What it costs**, specifically, and who bears it.

**What would change your mind** — a concrete condition. "If the data were sensitive rather than
trivial, I would not keep it locally at all."

**And what a user would experience** if you had chosen the other way.

## The sceptic

**Have somebody actually push back**, and record what you could not answer. That is the exercise:
the first draft of every one of these defences has a gap, and it is usually the cost side, because
the benefit is what motivated the decision in the first place.

## What to submit

**The defence, the objection you could not answer, and what you did about it** — changed the
decision, or accepted the cost knowingly and said so.`,
    assignment: {
      title: 'Defending a device decision',
      description: 'Defend a real storage, permission or battery decision from your own app to somebody sceptical, including what it costs and what would reverse it.',
      instructions: `Take a real decision from your own app where you chose something a reasonable
person would question: what you persist locally and what you do not, when you ask for a permission,
how often you wake the radio, what you keep on the device and for how long.

**Each of these trades something the user cares about against something else the user cares
about**, so there is no answer that is simply correct. Storing more means better offline behaviour
and more data at risk; asking earlier means more capability and a higher chance of refusal;
syncing more often means fresher data and a worse battery.

**The defence must contain** what you optimised for and why it suits these users rather than users
in general; what it costs, specifically, and who bears it; **what would change your mind**, as a
concrete condition; and what a user would experience had you chosen the other way.

**Then have somebody actually push back**, and record what you could not answer. The first draft of
every one of these has a gap, and it is usually the cost side, because the benefit is what
motivated the decision.

**Submit:** the defence, the objection you could not answer, and what you did about it — changed
the decision, or accepted the cost knowingly and said so.`,
      rubric: [
        { criterion: 'A decision with a real trade in it', description: 'The choice is one a reasonable person would question rather than one with an obvious answer.', maxPoints: 25 },
        { criterion: 'The cost is specific and attributed', description: 'What it costs and who bears it are named concretely rather than acknowledged in general terms.', maxPoints: 25 },
        { criterion: 'A condition that would reverse it', description: 'A concrete circumstance is given under which the other choice becomes correct.', maxPoints: 25 },
        { criterion: 'The unanswered objection is reported', description: 'A real push-back was received, the gap is recorded, and what was done about it is stated.', maxPoints: 25 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The gap in the first draft of these defences is usually the cost side because the benefit is:',
        [['What motivated the decision in the first place', true],
         ['Easier to measure than the cost is', false],
         ['The part the sceptic is questioning', false],
         ['More relevant to the user experience', false]],
        'The reason for making the choice is already articulated, while the price was accepted implicitly and has never needed stating.'),
      mcq('These decisions are chosen for the exercise because each trades something the user cares about against:',
        [['Something else the user cares about', true],
         ['A constraint imposed by the platform', false],
         ['The development effort required for it', false],
         ['A performance characteristic of the device', false]],
        'Both sides matter to the same person, which is what removes the possibility of a simply correct answer and makes the defence necessary.'),
    ],
  },
  {
    unitCode: 'T4_MOBILE_PROOF_SPECIALIZATION_INTERVIEW',
    notes: `**A full interview on mobile engineering alone.**

## Where it starts

**Something you shipped, or at least ran on a real device.** They are establishing whether real
constraints were met or only read about.

## Where it goes

**"What happens when the system kills your app?"** The defining question. States, persistence,
restoration.

**"No network."** Cached data, local success, visible sync state, exactly-once on reconnection.

**"The user denies a permission."** Degrade, and a route back.

**"How do you test on devices you do not have?"** Crash reports, metrics, and the honest limits.

**"What drains a battery?"** The radio first, and batching.

**"A user says it is slow after a while."** A leak, and how you would confirm it.

**"What do you store on the device and why?"** And the sceptic's follow-up about what happens if
it is lost.

## The depth markers

**Treating interruption as normal.** **Saying what the user sees rather than what the code does.**
**Having tested restoration deliberately.** Each signals somebody who has shipped rather than
built.

## The failure mode

**Web thinking on a phone.** Assuming continuous connectivity, continuous execution, unlimited
battery and a granted permission. **The round is built to find it**, because it is the most common
gap in candidates who moved across from web work and it produces apps that fail for most users
eventually.

## How to prepare

**Three stories: state you lost and how you fixed it, a device-only bug you reproduced, and a
permission or storage decision you would defend.** The second is rare and is the clearest evidence
of having worked on real hardware rather than in a simulator.`,
    mcqs: [
      mcq('The failure mode this round is built to find is web thinking on a phone, meaning assumptions of continuous connectivity, continuous execution, unlimited battery and:',
        [['A granted permission', true],
         ['A consistent screen size', false],
         ['A recent operating system version', false],
         ['Sufficient available storage space', false]],
        'Each of the four is guaranteed in a browser on a desk and is not on a phone, and denial is the one most often not designed for at all.'),
      mcq('Of the three stories to prepare, the rare one that is the clearest evidence of having worked on real hardware is:',
        [['A device-only bug you reproduced', true],
         ['State you lost and subsequently fixed', false],
         ['A permission decision you would defend', false],
         ['A battery optimisation you implemented', false]],
        'Reproducing something that does not occur in a simulator requires having had a device, provoked the condition, and got evidence off it.'),
    ],
    checkpoint: [
      mcq('Web thinking on a phone produces apps that fail for most users:',
        [['Eventually', true],
         ['Immediately on first launch', false],
         ['Only on older device models', false],
         ['During periods of high load', false]],
        'Each assumption holds most of the time, so the failures accumulate across users and sessions rather than appearing at once.'),
      mcq('The interview establishes whether real constraints were met or only read about by starting with:',
        [['Something you shipped or ran on a real device', true],
         ['A question about the platform lifecycle', false],
         ['A comparison between the two major platforms', false],
         ['The frameworks you have experience with', false]],
        'Constraints are met by building against them, so the existence of something that actually ran on hardware is the precondition for the rest.'),
    ],
  },
  {
    unitCode: 'T4_MOBILE_PROOF_CHECKPOINT',
    notes: `**Whether mobile engineering is demonstrable.**

## What the track asked for

**Designing for interruption** — the lifecycle, and what is persisted when.

**Building for absence** — offline by default, a durable queue, exactly-once on reconnection, a
denied permission handled.

**Protecting the device** — battery, storage and the data you chose not to keep.

**Defending a decision** — a storage, permission or battery trade, argued to somebody sceptical.

## The bar

**The second is the direction.** Lifecycle knowledge is documentation. An app that genuinely works
on a train, recovers from being killed, and synchronises exactly once is the thing almost no
student portfolio contains, and it is immediately checkable by anybody holding the phone.

## What a reviewer looks at

**The four demonstrations.** Force-quit, airplane mode, reconnection, denial. **Thirty seconds of
video each and they establish more than any description**, which is why the mini project asks for
recordings rather than an account.

## If this does not pass

**The usual gap is that it was only ever run in a simulator, foregrounded, on a good network.**
Everything works and none of the conditions the platform actually imposes has been met. **That is
a week** — persist, queue, handle denial, and record the four demonstrations — and the week
produces exactly the artefact a reviewer wants.

## What this feeds

**Mock 5** on mobile depth, which opens with the lifecycle question. **The portfolio**, where the
four demonstrations are the piece worth showing. **P14's production project**, whose requirement
that failures be handled deliberately is this track's entire subject applied to something larger.`,
    checkpoint: [
      mcq('The part of the track that constitutes the direction is building for absence, because lifecycle knowledge is:',
        [['Documentation', true],
         ['Covered adequately in the engineering build', false],
         ['Different between the two major platforms', false],
         ['Only relevant to certain categories of app', false]],
        'The states and callbacks are published and readable, whereas an app that genuinely survives the conditions requires having built against them.'),
      mcq('The four demonstrations establish more than any description, which is why the mini project asks for:',
        [['Recordings rather than an account', true],
         ['A written explanation of each condition', false],
         ['Automated tests covering the behaviours', false],
         ['A reviewer to test the app themselves', false]],
        'The behaviour is observable in seconds and is easy to claim without having implemented, so the recording is what makes it evidence.'),
      mcq('When this checkpoint does not pass, the usual gap is that the app was only ever run in a simulator, foregrounded, and:',
        [['On a good network', true],
         ['With verbose logging enabled', false],
         ['By the developer who built it', false],
         ['On the latest operating system', false]],
        'Those three conditions together exclude every fault the track is about, so an app can work perfectly throughout development and fail for users.'),
      mcq('P14’s requirement that failures be handled deliberately is described as this track’s entire subject applied to:',
        [['Something larger', true],
         ['A server rather than a device', false],
         ['A team rather than an individual', false],
         ['A system with external users', false]],
        'Designing for interruption, absence and denial is the same discipline, and the production project extends it to a bigger piece of work.'),
    ],
  },
];
