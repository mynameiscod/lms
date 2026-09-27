/**
 * T3_MOBILE_APP and T3_MOBILE_DATA — eleven units. Year 3, mobile track.
 * The remaining four topics of S18 are in year3ContentMobileRest.
 *
 * ── DEPTH, NOT REPETITION ─────────────────────────────────────────────────────────────────
 *
 * This track overlaps the universal core by name: caching, authentication, testing,
 * monitoring. A track unit that restates its core unit is worse than no unit, because it
 * costs the student time and teaches them the track is padding.
 *
 * What the core could not say, and this topic can:
 *
 * SCREENS_AND_NAVIGATION — the core routing unit describes URLs. A device has a back button
 * that the operating system owns, a stack you did not create, and a user who expects back to
 * undo their last move rather than to go up a hierarchy. None of that exists on the web.
 *
 * STATE_ON_A_DEVICE — the core state unit assumes the process stays alive. On a device the
 * operating system kills your process to reclaim memory and then restores the screen as
 * though nothing happened. State that lives only in memory is state you will lose.
 *
 * LOCAL_STORAGE — the core storage unit is about a database you control. A device's storage
 * is on hardware somebody else is holding, which may be lost, stolen or rooted.
 *
 * OFFLINE — the core caching unit is about avoiding work. Offline is about the application
 * continuing to be useful when the work cannot be done at all, which is a different design
 * problem with a different failure mode.
 *
 * SYNC_AND_CONFLICT — the genuinely hard unit of the track, and the one with no core
 * counterpart at all. Two devices changed the same record while neither could see the other.
 *
 * Attribution: both topics default to MOBILE_APP_BASICS, with STATE_ON_A_DEVICE overridden to
 * STATE_MANAGEMENT and OFFLINE to CACHING.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const MOBILE_BUNDLES: PilotBundle[] = [
  /* ══ T3_MOBILE_APP ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_MOBILE_APP_SCREENS_AND_NAVIGATION',
    notes: `**A stack of screens is not a set of pages**, and the difference is the back
button — which the operating system owns, which you did not create, and which the user has
strong expectations about.

## What is different from the web

**There is no address bar.** The user cannot type a location, cannot bookmark one, and cannot
see where they are. **Your navigation is the only thing telling them**, which puts more weight
on the header and the transition than a web page ever carries.

**Back is a hardware or system gesture.** On the web the user chooses to press back. On a
device **back is the primary way out of anything**, used constantly, and if your screen does
not handle it the user leaves your app entirely.

**The stack is real.** Screens are pushed and popped, and **the ones underneath still exist**
— holding memory, sometimes still running work, and they will be shown again in whatever
state you left them.

**And the system can take over.** A phone call, a notification, a share sheet. Your app is
paused mid-screen and resumed later.

## The navigation patterns

**Stack.** Push a screen, pop back to the previous one. The default, and what back undoes.

**Tabs.** Parallel sections, each with **its own stack**. Switching tabs does not clear the
other tab's history, and **users are surprised when it does** — a tab remembering where you
were is the whole reason tabs feel different from links.

**Modal.** A screen over everything, dismissed rather than backed out of. **For a task with a
clear end**: compose, confirm, pick. Not for browsing.

**Drawer.** A menu that slides in. Good for infrequent destinations, bad for anything the user
needs often, because it is a hidden thing.

## Getting back right

**Back should undo the user's last move**, not go up a hierarchy. Those coincide most of the
time and diverge exactly when it matters — a user who arrived at a product from a search and
presses back expects the search, not the category.

**A modal's back dismisses the modal**, and does not go back a screen behind it.

**Confirm before losing work.** Back out of a half-written message and the message should not
silently vanish. **Either keep the draft or ask** — and keeping it is almost always better,
because a dialog asking "discard?" is a question the user did not want.

**And never trap the user.** A screen back cannot leave is a bug, and on some platforms it is
a rejection at review.

## Passing data between screens

**Pass identifiers, not objects.** The next screen loads what it needs.

**This matters more than on the web**, because the destination screen may be recreated from
scratch after the process was killed, with only the identifier surviving. **An object passed in
memory will not be there; an id will.**

## Deep links

**A link from outside into a specific screen.** From a notification, an email, another app.

**The hard part is the stack behind it.** A user deep-linked into a product page presses back
— to what? **You have to synthesise a sensible stack**, because there is no history to return
to, and getting this wrong dumps the user out of the app on their first press.`,
    mcqs: [
      mcq('The back button matters more on a device than on the web because:',
        [['It is the primary way out of anything, and is used constantly', true],
          ['Devices have no other navigation affordance available', false],
          ['The operating system requires every screen to handle it', false],
          ['Users cannot see the navigation history anywhere', false]],
        'If your screen does not handle it, the user leaves your app entirely.'),
      mcq('Screens underneath the top of the stack:',
        [['Still exist, holding memory and sometimes still running work', true],
          ['Are destroyed and rebuilt when returned to', false],
          ['Are serialised to disk by the operating system', false],
          ['Continue running only if they registered for it', false]],
        'And they will be shown again in whatever state you left them.'),
      mcq('Passing identifiers rather than objects between screens matters because:',
        [['The destination may be recreated from scratch with only the id surviving', true],
          ['Objects are expensive to serialise across a screen boundary', false],
          ['Identifiers are easier to log and debug afterwards', false],
          ['The navigation library cannot carry arbitrary objects', false]],
        'An object passed in memory will not be there after a process kill.'),
      mcq('The hard part of a deep link is:',
        [['Synthesising a sensible stack, because there is no history to return to', true],
          ['Matching the incoming URL to the correct screen reliably', false],
          ['Handling the case where the user is not logged in', false],
          ['Ensuring the destination screen loads its data quickly', false]],
        'Getting it wrong dumps the user out on their first back press.'),
    ],
    checkpoint: [
      mcq('A user who arrived at a product from a search and presses back expects:',
        [['The search results they came from, not the product category', true],
          ['The category the product belongs to in the hierarchy', false],
          ['The home screen, as the safest default destination', false],
          ['Whichever screen the navigation graph defines as the parent', false]],
        'Back undoes the last move; it does not go up a hierarchy.'),
      mcq('Switching tabs should not clear the other tab’s history because:',
        [['A tab remembering where you were is why tabs feel different from links', true],
          ['Rebuilding the stack on return is expensive in memory terms', false],
          ['The platform guidelines require history to be preserved', false],
          ['Users rarely return to a tab they have already visited', false]],
        'Users are surprised when it clears.'),
      mcq('Backing out of a half-written message should:',
        [['Keep the draft, rather than asking whether to discard it', true],
          ['Show a confirmation dialog before discarding the text', false],
          ['Discard it, since the user chose to leave the screen', false],
          ['Depend on how much has already been typed in', false]],
        'A "discard?" dialog is a question the user did not want to be asked.'),
    ],
  },

  {
    unitCode: 'T3_MOBILE_APP_STATE_ON_A_DEVICE',
    notes: `**The operating system will kill your process while the user is in another app, and
then restore the screen as though nothing happened.** State that lived only in memory is gone,
and the user does not know a thing went wrong — they know your app forgot what they typed.

## The lifecycle, roughly

**Active.** On screen, in the foreground, everything running.

**Inactive.** Interrupted — a call, a notification banner, the app switcher.

**Background.** Off screen. **You get a short window to finish work** and then you are
suspended.

**Suspended.** In memory, running nothing.

**Terminated.** Gone. **The operating system did this to reclaim memory and it did not ask.**

The names differ per platform; the shape does not.

## The three kinds of state

**Ephemeral.** A scroll position, an animation, an open dropdown. Losing it is fine.

**User-entered and not yet saved.** A half-written message, a filled form, a photo about to
be uploaded. **Losing this is the failure everybody has experienced and nobody forgives.**

**Persisted.** Already in storage. Safe.

**The whole discipline is moving the second category into the third, early and often.**

## Saving at the right moment

**Not on a save button.** The user will not press it before the phone rings.

**On every meaningful change**, debounced. A draft written as the user types, a form saved
field by field.

**And on backgrounding**, which is the last reliable signal you get. **Not on termination —
you may not be told**, and on some platforms you are not called at all.

## Restoring

**The screen is recreated from nothing.** Your job is to make it look like it never went away:
the same screen, the same data, the same draft, the same scroll position if you can.

**Restore from the identifier, then reload.** Which is why the navigation unit said to pass
ids: **the id survives a process kill in the saved navigation state, and an in-memory object
does not.**

**Show the saved state immediately**, then refresh in the background. A restored screen that
blocks on a network call is worse than the kill was.

## Rotation, the small version of the same problem

**A rotation recreates the screen** on some platforms, with the same consequences and a much
shorter timescale. **It is the cheapest way to test your state handling** — rotate the device
on every screen you build and see what disappears.

**And it catches almost everything a process kill would**, which makes it the test worth
running constantly rather than occasionally.

## Testing it properly

**Rotate every screen.**

**Background the app, open several others, come back.**

**And force the process kill.** Both platforms have a developer setting that terminates
backgrounded processes immediately — **turn it on and use the app for a day**. Everything
fragile surfaces within an hour.`,
    mcqs: [
      mcq('The operating system terminating your process is:',
        [['Something it does to reclaim memory, without asking you', true],
          ['A response to your app misbehaving in the background', false],
          ['Preceded by a callback giving you time to save', false],
          ['Rare enough that most apps can ignore it', false]],
        'And the user does not know; they know your app forgot what they typed.'),
      mcq('The right moment to save user-entered state is:',
        [['On every meaningful change, debounced, and on backgrounding', true],
          ['When the user presses a save or done button', false],
          ['On termination, which is the last chance available', false],
          ['At a fixed interval while the screen is active', false]],
        'Backgrounding is the last reliable signal; termination may not be delivered.'),
      mcq('A restored screen should show the saved state immediately because:',
        [['A restored screen that blocks on a network call is worse than the kill was', true],
          ['The network may not be available on restore', false],
          ['The platform imposes a time limit on restoration', false],
          ['Saved state is more likely to be correct than fetched state', false]],
        'Show it, then refresh in the background.'),
      mcq('Rotation is the cheapest test of state handling because:',
        [['It recreates the screen and catches almost everything a kill would', true],
          ['It exercises the layout code at the same time', false],
          ['It happens far more often than a process kill', false],
          ['It can be automated more easily than backgrounding', false]],
        'Which makes it worth running constantly rather than occasionally.'),
    ],
    checkpoint: [
      mcq('The state category that must move into storage early and often is:',
        [['User-entered data that has not yet been saved', true],
          ['Scroll positions and open dropdown states', false],
          ['Data already persisted to the local database', false],
          ['Animation progress and transient UI flags', false]],
        'Losing it is the failure nobody forgives.'),
      mcq('Restoring from an identifier rather than an object works because:',
        [['The id survives a process kill in the saved navigation state', true],
          ['Identifiers are smaller and faster to restore', false],
          ['Objects cannot be written to the navigation state at all', false],
          ['The destination screen prefers to load its own data', false]],
        'The navigation unit gave the same reason.'),
      mcq('The developer setting that terminates backgrounded processes:',
        [['Surfaces everything fragile within about an hour of use', true],
          ['Is intended for measuring memory consumption', false],
          ['Simulates a condition that rarely happens in practice', false],
          ['Should only be enabled during formal testing', false]],
        'Turn it on and use the app for a day.'),
    ],
  },

  {
    unitCode: 'T3_MOBILE_APP_DEBUGGING',
    notes: `Six failures specific to a device, and how to tell them apart from the ordinary
kind.

## 1. It works in the simulator and not on the phone

**The commonest mobile bug report there is.**

**Causes:** the simulator has a fast disk, unlimited memory, a perfect network, no battery
management and often a different architecture. **It also has your development certificates,
your permissions already granted and your debug build's leniency.**

**Fix:** reproduce on a device before you debug. **Everything below assumes you did.**

## 2. It works on your phone and not on theirs

**Causes:** an older operating system; a smaller screen; less memory, so it is being killed;
a different manufacturer's aggressive battery policy; no network of the quality you have.

**Fix:** know the versions and devices you support, and test the oldest and smallest. **The
cheapest device you support finds more bugs than the newest one.**

## 3. The state vanished

**Symptom:** the user returns and the screen is empty, or reset, or shows the wrong thing.

**Cause:** almost always the process was killed and the restore is incomplete.

**Diagnosis:** turn on the setting that kills backgrounded processes and reproduce it in
seconds.

**Fix:** save more, restore from the id, reload.

## 4. It gets slower the longer it is used

**Causes:** screens retained in the stack that should have been released; listeners registered
on every screen creation and never removed; images cached without a limit; a growing
in-memory list.

**Diagnosis:** the memory profiler, watching the count of screen instances as you navigate
back and forth. **A count that only goes up is a leak, and it is the single most diagnostic
observation in mobile performance work.**

**Fix:** unregister what you register, in the matching lifecycle method.

## 5. The network call came back after the screen was gone

**Symptom:** a crash on updating a view that no longer exists, or a result written into the
wrong screen.

**Cause:** the request outlived its screen, which on a device is normal rather than
exceptional.

**Fix:** cancel in-flight work when the screen is destroyed, and check the screen is still
alive before applying a result. **Most modern frameworks give you a scope that does this; use
it rather than a flag.**

## 6. It drains the battery

**Covered in the quality topic.** In short: something is waking the device up. Find it before
your users do, because they will attribute it to your app whether or not it is yours.

## The habits

**Reproduce on a real device, on the oldest version you support.**

**Keep process-kill on during development.**

**Watch screen instance counts while you navigate.**

**Cancel work with the screen that started it.**

**And read the platform's own crash reporting**, which sees the crashes your users never
report.`,
    mcqs: [
      mcq('The commonest mobile bug report is:',
        [['It works in the simulator and not on the phone', true],
          ['It crashes only on older operating system versions', false],
          ['It behaves differently after a rotation', false],
          ['It drains the battery unexpectedly', false]],
        'The simulator has a fast disk, perfect network and no battery management.'),
      mcq('A screen instance count that only goes up is:',
        [['A leak, and the single most diagnostic observation in mobile performance', true],
          ['Expected while the navigation stack is deep', false],
          ['A profiler artefact that resolves after collection', false],
          ['Normal until the system reclaims memory', false]],
        'Watch it as you navigate back and forth.'),
      mcq('A network call returning after its screen is gone is:',
        [['Normal on a device rather than exceptional', true],
          ['A sign the request was not cancelled correctly', false],
          ['Only possible when the screen was killed by the system', false],
          ['Prevented by most networking libraries automatically', false]],
        'Cancel in-flight work when the screen is destroyed.'),
      mcq('The device most worth testing on is:',
        [['The cheapest one you support, which finds more bugs than the newest', true],
          ['The most popular model among your users', false],
          ['The newest, since it exposes forward compatibility issues', false],
          ['Whichever one the crash reports mention most', false]],
        'Oldest operating system, smallest screen, least memory.'),
    ],
    checkpoint: [
      mcq('The fastest way to diagnose vanished state is:',
        [['Turn on the setting that kills backgrounded processes and reproduce it', true],
          ['Add logging to every lifecycle callback', false],
          ['Inspect the saved state file on the device', false],
          ['Rotate the screen repeatedly while watching the memory profiler', false]],
        'It reproduces in seconds instead of hours.'),
      mcq('Cancelling work with the screen that started it is better done with:',
        [['A framework scope tied to the screen, rather than a flag', true],
          ['A boolean flag checked before applying the result', false],
          ['A timeout shorter than the screen lifetime', false],
          ['A global registry of in-flight requests', false]],
        'Most modern frameworks give you one.'),
      mcq('Reading the platform’s own crash reporting matters because:',
        [['It sees the crashes your users never report', true],
          ['It provides more accurate stack traces than your own', false],
          ['It is required for continued store distribution', false],
          ['It groups crashes by device model automatically', false]],
        'Most users uninstall rather than report.'),
    ],
  },

  {
    unitCode: 'T3_MOBILE_APP_PRACTICE',
    notes: `Two exercises on the parts of a mobile app that are pure logic: what the back
stack should do, and what survives a process kill.`,
    coding: [
      {
        title: 'The back stack',
        description: `Read one navigation event per line and print the screen shown after each.

Events:

- \`push <name>\` — put a screen on top
- \`modal <name>\` — put a modal on top
- \`back\` — dismiss the top modal if there is one, otherwise pop the top screen
- \`root\` — return to the bottom screen, discarding everything above it

The stack starts with a single screen \`home\`. **Back on \`home\` alone leaves \`home\`** —
never trap the user, and never empty the stack.

Print the name shown after every event, one per line.`,
        starter: `import sys

stack = [('home', 'screen')]

# Back dismisses a modal first. Back on home alone leaves home.
`,
        language: 'python',
        tests: [
          { input: 'push list\npush item\nback\n', expectedOutput: 'list\nitem\nlist' },
          { input: 'modal compose\nback\nback\n', expectedOutput: 'compose\nhome\nhome' },
          { input: 'push a\npush b\nroot\n', expectedOutput: 'a\nb\nhome' },
          { input: 'back\n', expectedOutput: 'home' },
          { input: 'push a\nmodal m\nback\nback\nroot\n', expectedOutput: 'a\nm\na\nhome\nhome', isHidden: true },
        ],
      },
      {
        title: 'What survives the kill',
        description: `Read one piece of state per line as \`<name> <kind> <saved>\`, where
kind is \`ephemeral\`, \`entered\` or \`persisted\` and saved is \`yes\` or \`no\`.

After a process kill, print one line per piece:

- \`persisted\` → \`survives\`
- \`entered\` and saved \`yes\` → \`survives\`
- \`entered\` and saved \`no\` → \`LOST <name>\`
- \`ephemeral\` → \`acceptable\` regardless of saved

Then a final line \`lost=<n>\`, counting only the entered-and-unsaved pieces. **Ephemeral loss
is not a defect; unsaved entered data is.**`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Ephemeral loss is acceptable. Unsaved entered data is the defect.
`,
        language: 'python',
        tests: [
          { input: 'draft entered no\n', expectedOutput: 'LOST draft\nlost=1' },
          { input: 'scroll ephemeral no\nprofile persisted yes\n', expectedOutput: 'acceptable\nsurvives\nlost=0' },
          { input: 'form entered yes\n', expectedOutput: 'survives\nlost=0' },
          { input: 'a entered no\nb entered no\nc ephemeral no\n', expectedOutput: 'LOST a\nLOST b\nacceptable\nlost=2' },
          { input: 'x persisted no\n', expectedOutput: 'survives\nlost=0', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Mobile Application Practice',
      description: 'Model the back stack and the survival of state, then test both on a real device.',
      instructions: `Complete both exercises, then:

1. For the first: back on \`home\` alone leaves \`home\`. Say what would go wrong if it
   emptied the stack instead, and what the user would see.
2. For the first: a modal is dismissed before a screen is popped. Give a case where that rule
   surprises a user, and say what you would do about it.
3. For the second: \`persisted no\` still survives. Explain why the saved flag is irrelevant
   for that kind.

**Then, in an app** you have built or can build in an afternoon.

4. Build three screens with a stack and one modal.
5. Handle back on every one. Verify nothing traps the user.
6. Put an editable field on one screen. Save it as the user types.
7. **Rotate every screen.** Record what disappeared before you fixed it.
8. Turn on the setting that terminates backgrounded processes, use the app for twenty
   minutes, and record everything that broke.
9. Fix the restoration so the user cannot tell the process was killed.
10. Add a deep link into the third screen, and synthesise a sensible back stack for it.`,
      rubric: [
        { criterion: 'Back stack correct', description: 'All cases, including modal precedence and the home floor.', maxPoints: 15 },
        { criterion: 'Survival classified', description: 'All cases, with the saved flag applied only where it matters.', maxPoints: 15 },
        { criterion: 'Three screens with back handled', description: 'Stack and modal, nothing trapping the user.', maxPoints: 20 },
        { criterion: 'Rotation findings recorded', description: 'What disappeared on each screen before fixing.', maxPoints: 15 },
        { criterion: 'Survives a process kill', description: 'Twenty minutes with kill-on-background, breakages recorded and fixed.', maxPoints: 20 },
        { criterion: 'Deep link with a stack', description: 'Back from the deep-linked screen goes somewhere sensible.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

stack = [('home', 'screen')]
`,
        tests: [
          { input: 'push list\npush item\nback\n', expectedOutput: 'list\nitem\nlist' },
          { input: 'modal compose\nback\nback\n', expectedOutput: 'compose\nhome\nhome' },
          { input: 'push a\npush b\nroot\n', expectedOutput: 'a\nb\nhome' },
          { input: 'back\n', expectedOutput: 'home' },
          { input: 'push a\nmodal m\nback\nback\nroot\n', expectedOutput: 'a\nm\na\nhome\nhome', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('A back that empties the stack entirely would:',
        [['Drop the user out of the app from a screen they expected to leave', true],
          ['Return the user to the home screen as a default', false],
          ['Be caught by the navigation library automatically', false],
          ['Only matter on those platforms with a hardware back button', false]],
        'Never trap the user, and never empty the stack either.'),
      mcq('Dismissing a modal before popping a screen surprises a user when:',
        [['The modal was presented over a screen they wanted to leave together', true],
          ['The modal contains unsaved data of its own', false],
          ['The modal was opened from a deep link', false],
          ['The screen underneath it has already been destroyed by the system', false]],
        'Two presses where they expected one.'),
      mcq('A persisted piece of state survives regardless of the saved flag because:',
        [['It is already in storage, which is what persisted means', true],
          ['The platform restores persisted state automatically', false],
          ['The saved flag applies only to remote data', false],
          ['Persisted state is written on every change by definition', false]],
        'The flag describes whether entered data reached storage.'),
    ],
  },

  {
    unitCode: 'T3_MOBILE_APP_MINI_PROJECT',
    notes: `Build a small app whose screens survive everything the operating system does to
them.

**The measurement is a process kill the user cannot detect.** Not that the app works — that
it works after the system has quietly destroyed and rebuilt it while the user was reading a
message.

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — An App That Survives Being Killed',
      description: 'Three screens, a modal, a deep link, and state that outlives the process.',
      instructions: `**Build** a small app on any mobile platform or cross-platform framework.

**Part one — the screens**

1. Three screens in a stack: a list, a detail, and an editor.
2. One modal, for a task with a clear end.
3. Pass identifiers between screens, never objects. Say in your notes why.

**Part two — back**

4. Handle back on every screen and the modal.
5. Verify no screen traps the user.
6. Back from the detail returns where the user came from, which is not always the list.
7. Backing out of the editor keeps the draft rather than asking about it.

**Part three — state**

8. The editor saves as the user types, debounced.
9. The list remembers its scroll position.
10. Everything restores from an identifier plus a reload, showing saved state first.

**Part four — prove it**

11. **Rotate every screen.** Record what disappeared, then fix it.
12. Turn on kill-on-background. **Use the app for twenty minutes**, including the editor
    mid-sentence, and record everything that broke.
13. Fix until a process kill is undetectable from inside the app.
14. Record a short capture of a kill and a restore, if your platform allows it.

**Part five — the deep link**

15. A deep link into the detail screen.
16. Synthesise a back stack so back from it goes somewhere sensible.
17. Test it from a cold start, with the app not running.

**Part six — write it up**

18. What disappeared on rotation, and why.
19. What broke under process kill, and why.
20. **The one thing that is still fragile**, named honestly, and what you would do about it.

**Submit** the code, the recorded findings from steps 11 and 12, and the write-up.`,
      rubric: [
        { criterion: 'Three screens and a modal', description: 'Stack navigation with identifiers passed, not objects.', maxPoints: 15 },
        { criterion: 'Back handled everywhere', description: 'Nothing trapped, drafts kept, back undoes the last move.', maxPoints: 20 },
        { criterion: 'State saved and restored', description: 'Debounced saves, scroll position, saved state shown first.', maxPoints: 20 },
        { criterion: 'Rotation findings', description: 'Every screen rotated, disappearances recorded and fixed.', maxPoints: 15 },
        { criterion: 'Undetectable process kill', description: 'Twenty minutes under kill-on-background, breakages fixed.', maxPoints: 20 },
        { criterion: 'Deep link from cold start', description: 'Works with the app not running, with a sensible stack behind it.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The measurement for this project is:',
        [['That a process kill is undetectable from inside the app', true],
          ['That every screen renders correctly on a real device', false],
          ['That the app works without a network connection', false],
          ['That navigation follows the platform guidelines', false]],
        'Not that it works, but that it works after being destroyed and rebuilt.'),
      mcq('Testing the deep link from a cold start matters because:',
        [['That is the case with no existing stack to return to', true],
          ['Cold starts are slower and may time out', false],
          ['The link handler registers only at launch', false],
          ['Most deep links arrive while the app is running', false]],
        'The hard part of a deep link is the stack behind it.'),
      mcq('Naming the one thing still fragile:',
        [['Is asked for because every app has one and hiding it helps nobody', true],
          ['Reduces the marks lost for incomplete work', false],
          ['Is only required if the process kill test failed', false],
          ['Demonstrates a working familiarity with the platform limits', false]],
        'Named honestly, with what you would do about it.'),
    ],
  },

  /* ══ T3_MOBILE_DATA ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_MOBILE_DATA_LOCAL_STORAGE',
    notes: `The core storage unit was about a database you control, in a room you control.
**A device's storage is on hardware somebody else is holding** — which may be lost, stolen,
backed up to a cloud you did not choose, or rooted by its owner.

## What to store, and where

**Key-value preferences.** Small settings: a theme, a last-used filter, a flag. Easy, and
**not secure** — on a rooted or jailbroken device it is readable.

**A local database.** Structured data, queryable, the right place for anything you list or
search. **This is where offline lives.**

**Files.** Images, documents, downloads. Watch the size, and know that the system may clear
your cache directory without warning — which is the point of the cache directory.

**The secure store.** Hardware-backed, per-app, the only place a credential belongs. **Small,
slow and strongly protected**, which is exactly the trade you want for a token.

## What must never be on the device

**A password.** Not encrypted, not obfuscated, not anywhere. **Store a token instead** — it
can be revoked and a password cannot.

**A shared secret used to sign requests.** Anything shipped in your app is available to
anybody who unpacks it, and **apps are unpacked routinely**. A secret in a mobile binary is a
published secret.

**More personal data than the screen needs.** A full customer table cached locally because it
made a list faster is a breach waiting for a lost phone.

**And nothing sensitive in logs**, which on some platforms are readable by other apps or
collected by the manufacturer.

## Encryption, honestly

**Device encryption protects a powered-off device.** That is real and it covers the lost-phone
case, which is the commonest one.

**It does not protect a running device**, an unlocked one, or one whose owner has root.

**So encrypt at the application layer for anything genuinely sensitive**, with the key in the
secure store rather than in your code — and be honest that **a key your app can retrieve
without the user is a key an attacker on that device can retrieve too**. It raises the cost;
it does not remove the risk.

## Size and hygiene

**Devices run out of space**, and yours is not the only app.

**Cap your caches**, by size and by age.

**Delete what the user deleted.** Including from the cache, and including derived copies.

**And handle the write that fails** because the disk is full — which is a real condition on a
device and an unhandled exception in most apps.

## On uninstall and backup

**Uninstall removes your data**, mostly. Platform backups may retain it.

**Know whether your storage is included in the platform backup**, and **exclude anything
sensitive from it** — a token restored onto a different device from a backup is a real and
surprising leak.`,
    mcqs: [
      mcq('A shared secret shipped inside your app is:',
        [['A published secret, because apps are unpacked routinely', true],
          ['Protected as long as the binary is obfuscated', false],
          ['Acceptable if it is stored in the secure store at first run', false],
          ['Safe on platforms that verify application signatures', false]],
        'Anything shipped is available to anybody who unpacks it.'),
      mcq('Device encryption protects:',
        [['A powered-off device, which covers the commonest lost-phone case', true],
          ['Data against any attacker without the passcode', false],
          ['The application’s storage from other installed apps', false],
          ['Data in transit as well as data at rest', false]],
        'It does not protect a running, unlocked or rooted device.'),
      mcq('A key your app can retrieve without the user is:',
        [['A key an attacker on that device can retrieve too', true],
          ['Secure as long as it lives in the hardware-backed store', false],
          ['Adequate protection for anything short of a password', false],
          ['Only exposed if the device is rooted or jailbroken', false]],
        'It raises the cost; it does not remove the risk.'),
      mcq('Excluding sensitive storage from the platform backup matters because:',
        [['A token restored onto a different device is a real and surprising leak', true],
          ['Backups are stored unencrypted by most platforms', false],
          ['Backup size limits will otherwise be exceeded', false],
          ['Restored data can become inconsistent with the server', false]],
        'Know whether your storage is included before assuming.'),
    ],
    checkpoint: [
      mcq('A credential belongs in:',
        [['The secure store, which is small, slow and strongly protected', true],
          ['The local database, encrypted at the application layer', false],
          ['Key-value preferences, which are per-app already', false],
          ['A file in the app’s private directory', false]],
        'Exactly the trade you want for a token.'),
      mcq('Caching a full customer table locally to make a list faster is:',
        [['A breach waiting for a lost phone', true],
          ['A reasonable trade if the cache is capped', false],
          ['Acceptable when the data is already on the device', false],
          ['Safe once the local database is encrypted', false]],
        'Store no more personal data than the screen needs.'),
      mcq('A write failing because the disk is full is:',
        [['A real device condition and an unhandled exception in most apps', true],
          ['Handled by the underlying storage layer automatically anyway', false],
          ['Rare enough to leave to the crash reporter', false],
          ['Prevented by capping your own cache sizes', false]],
        'Yours is not the only app on the device.'),
    ],
  },

  {
    unitCode: 'T3_MOBILE_DATA_OFFLINE',
    notes: `The core caching unit was about **avoiding work**. Offline is about the application
**continuing to be useful when the work cannot be done at all** — a different design problem,
with a different failure mode, and one that has to be decided screen by screen rather than
turned on.

## The three postures

**Offline-hostile.** Nothing works without a network. Acceptable for a payment, absurd for a
reading list.

**Offline-tolerant.** Reads work from local data; writes fail politely and say so. **The right
default for most apps**, and much cheaper than the third.

**Offline-first.** Everything works. Writes queue and sync later. **Expensive, because it
means conflict resolution** — the next unit — and worth it only where the user genuinely
cannot wait.

**Choose per screen.** A list can be offline-first while a checkout is offline-hostile, and
pretending the whole app has one posture is how this gets over-engineered.

## Reads

**Serve from local storage, always.** Fetch in the background and update.

**Which means the screen renders instantly**, and the network becomes a refresh rather than a
dependency. **This is worth doing even with a perfect network**, and it is the change users
feel most.

**Show when the data is from.** Not a spinner — a quiet line saying "updated nine minutes
ago". A user who knows the data is old can decide; a user shown stale data as though it were
fresh cannot.

## Writes

**Queue them.** Each with the intent, not the result: "mark item 4 done", not "set list to
this". **Intents replay correctly against a changed server state and snapshots do not**, which
is the whole reason the queue works at all.

**Apply optimistically**, so the user sees their change.

**Mark it pending** in the interface. Quietly.

**Replay on reconnection**, in order, and handle each failure individually.

**And make replay idempotent** — give each queued operation an id the server deduplicates on.
A queue that flushes twice is normal, because the network dropped between the server handling
the request and the response arriving.

## Telling the user

**Not a full-screen error.** They know their signal is bad.

**A quiet indicator** that the app is offline, and **a pending marker** on what has not synced.

**And never lose their work silently.** If a queued write fails permanently, say so, with what
it was, and let them retry or discard.

## What not to do

**Do not detect connectivity and branch on it.** The connectivity API says there is a network;
it does not say your server is reachable. **Try the request and handle the failure** — captive
portals, dead backends and half-connected trains all report as connected.

**Do not queue reads.** They are stale by the time they run.

**Do not queue indefinitely.** A write from three weeks ago probably should not be applied
now; expire the queue and tell the user.

## The test

**Aeroplane mode.** Use the app for ten minutes: read, write, navigate, restart. Then turn it
back on and watch what happens.

**Then the worse test: a slow, lossy connection**, which every platform can simulate. **It is
harder than being offline** — requests hang rather than failing, and it is where the real bugs
are.`,
    mcqs: [
      mcq('Queuing intents rather than snapshots matters because:',
        [['Intents replay correctly against a changed server state and snapshots do not', true],
          ['Intents are smaller to store on the device', false],
          ['Snapshots cannot be made idempotent', false],
          ['The server API usually accepts only intents', false]],
        '"Mark item 4 done", not "set the list to this".'),
      mcq('Branching on the connectivity API is a mistake because:',
        [['Captive portals, dead backends and lossy trains all report as connected', true],
          ['The API is slow to update after a change', false],
          ['It requires a permission on some platforms', false],
          ['It cannot distinguish between network types', false]],
        'Try the request and handle the failure.'),
      mcq('A queue that flushes twice is:',
        [['Normal, because the network drops between handling and response', true],
          ['A bug in the replay logic that must be fixed', false],
          ['Prevented by replaying operations strictly in order', false],
          ['Only possible if the app was killed mid-flush', false]],
        'Give each operation an id the server deduplicates on.'),
      mcq('Serving reads from local storage first is worth doing:',
        [['Even with a perfect network, and it is the change users feel most', true],
          ['Only when offline support is a requirement', false],
          ['Only for data that changes infrequently', false],
          ['When the fetch would otherwise take over a second', false]],
        'The network becomes a refresh rather than a dependency.'),
    ],
    checkpoint: [
      mcq('The right default posture for most apps is:',
        [['Offline-tolerant: reads work locally, writes fail politely', true],
          ['Offline-first, so everything continues to work', false],
          ['Offline-hostile, which avoids conflict entirely', false],
          ['Whichever the platform framework provides by default', false]],
        'And choose per screen, not per app.'),
      mcq('A slow, lossy connection is a harder test than being offline because:',
        [['Requests hang rather than failing, which is where the real bugs are', true],
          ['It is more difficult to simulate reliably', false],
          ['It triggers retry logic that being offline does not exercise', false],
          ['Timeouts differ between platforms under load', false]],
        'Every platform can simulate it; do that after aeroplane mode.'),
      mcq('Showing when the data was last updated:',
        [['Lets the user decide, which stale data shown as fresh does not', true],
          ['Replaces the need for a loading indicator', false],
          ['Is required whenever you serve data from a local cache', false],
          ['Helps diagnose sync failures after the fact', false]],
        'A quiet line, not a spinner.'),
    ],
  },

  {
    unitCode: 'T3_MOBILE_DATA_SYNC_AND_CONFLICT',
    notes: `**Two devices changed the same record while neither could see the other.** This is
the genuinely hard unit of the track, it has no counterpart in the core, and **there is no
correct answer that avoids the question** — every strategy below loses something, and the
work is choosing what.

## Why it is hard

**There is no global order.** Device clocks disagree, by minutes.

**Neither change is wrong.** Both users did something reasonable with the information they
had.

**And somebody must lose, or somebody must be asked.** Those are the only two outcomes, and
pretending otherwise is how data is quietly destroyed.

## The strategies

**Last write wins.** The most recent timestamp survives.

Simple, and **it silently destroys work**. It is also only as good as the clocks, which is to
say not good. **Acceptable for a preference. Not for anything the user typed.**

**Server wins.** The device's change is discarded on conflict.

Predictable, and infuriating if the user wrote something.

**Client wins.** The reverse. Predictable, and dangerous with multiple devices.

**Field-level merge.** Both changes are kept if they touched different fields. **Much better
than it sounds** — most real conflicts are two people editing different parts of the same
record, and this resolves them with nobody losing anything.

**Append-only.** Do not update; record events and derive the current value. **No conflicts by
construction**, because nothing is ever overwritten. It is the right shape for a chat, a log,
a set of measurements.

**Ask the user.** The only honest option for a real conflict on content they wrote. **Expensive
to build and hated if it happens often** — so use it as the last resort after merging, not as
the first response.

## What to actually do

**Field-level merge first.** It resolves most real conflicts invisibly.

**Append-only wherever the data allows it.** Restructuring so conflicts cannot arise beats
resolving them.

**Last write wins for preferences**, where the loss does not matter.

**And ask the user only for the remainder** — which, after the first two, is a small number.

## Detecting a conflict at all

**You need a version.** A number the server increments, or a hash.

**The device sends the version it edited from.** If the server's differs, there was a
concurrent change.

**Without this you cannot detect conflicts, only overwrite** — and an app that overwrites
without knowing is the one that loses a day of somebody's notes.

## Deletions, which are worse

**A deletion conflicting with an edit has no good answer.** One device deleted a record while
another was editing it.

**Use soft deletes**, so the deletion is a change like any other and can be reversed, and
**default to keeping the record when an edit conflicts with a delete** — restoring something
the user deleted annoys them, and destroying something they wrote does more than annoy them.

## Telling the user

**When a merge happened invisibly, say nothing.**

**When something was overwritten, say so**, with what and when.

**And keep the losing version** where you can. "Your offline change conflicted; here is what
it was" is recoverable. Silence is not.`,
    mcqs: [
      mcq('The only two outcomes of a genuine conflict are:',
        [['Somebody loses, or somebody is asked', true],
          ['A merge succeeds, or the sync is retried later', false],
          ['The server wins, or the client wins', false],
          ['The change is queued, or it is discarded', false]],
        'Pretending otherwise is how data is quietly destroyed.'),
      mcq('Field-level merge is better than it sounds because:',
        [['Most real conflicts are two people editing different parts of a record', true],
          ['It can be implemented without version tracking', false],
          ['It never requires asking the user anything', false],
          ['It works identically for deletions and edits', false]],
        'It resolves them with nobody losing anything.'),
      mcq('Without a version number you can:',
        [['Only overwrite, never detect that a conflict occurred', true],
          ['Detect conflicts using the modification timestamp instead', false],
          ['Rely on the server to reject stale writes', false],
          ['Use field-level merge as a substitute', false]],
        'An app that overwrites without knowing loses a day of somebody’s notes.'),
      mcq('When an edit conflicts with a delete you should default to:',
        [['Keeping the record, because destroying written work is worse', true],
          ['Applying the delete, since it is the more recent intent', false],
          ['Asking the user on every occurrence', false],
          ['Whichever change carries the later timestamp', false]],
        'Restoring something deleted annoys; destroying something written does more.'),
    ],
    checkpoint: [
      mcq('Last write wins is acceptable for:',
        [['A preference, where the loss does not matter', true],
          ['Any field the user edits infrequently', false],
          ['Records with a single authoritative device', false],
          ['Anything where the clocks are synchronised', false]],
        'Not for anything the user typed.'),
      mcq('Append-only avoids conflicts because:',
        [['Nothing is ever overwritten, so there is nothing to contest', true],
          ['Events carry timestamps that resolve ordering', false],
          ['The server can replay them in almost any order safely', false],
          ['Derived values are recomputed on every read', false]],
        'Restructuring so conflicts cannot arise beats resolving them.'),
      mcq('Keeping the losing version of an overwrite:',
        [['Makes the loss recoverable, where silence does not', true],
          ['Is required by most sync frameworks', false],
          ['Allows the merge to be retried automatically', false],
          ['Is only practical for small records', false]],
        '"Here is what your change was" beats saying nothing.'),
    ],
  },

  {
    unitCode: 'T3_MOBILE_DATA_DEBUGGING',
    notes: `Five ways offline and sync go wrong, all of which are hard to see because they
happen on somebody else's device with no network.

## 1. It works offline and breaks on reconnection

**Symptom:** everything is fine in aeroplane mode, and turning the network on produces
duplicates, errors, or lost changes.

**Causes:** the queue is not idempotent and flushed twice; operations replayed out of order;
a snapshot replayed against a changed record; no version so the overwrite went through.

**Diagnosis:** **log every queued operation with its id and the order it flushed in.** Without
that log this is not debuggable, because you cannot reproduce the timing.

**Fix:** ids the server deduplicates on, strict ordering, intents rather than snapshots.

## 2. Data disappeared

**Symptom:** the user wrote something and it is gone.

**Causes:** last-write-wins with a wrong clock; a failed queue entry silently dropped; a
delete synced over an edit; the app killed before the queue was persisted.

**The last one is the cruellest.** **A queue held in memory is not a queue** — it must be
written to storage as the operation is enqueued, before you tell the user anything succeeded.

**Fix:** persist the queue immediately, keep failures visible, never drop silently.

## 3. It syncs constantly and drains the battery

**Causes:** a sync on every change rather than debounced; a poll instead of a push; a retry
loop with no backoff; syncing on every connectivity event, which fires often on a moving
train.

**Fix:** batch, debounce, exponential backoff, and let the platform's scheduler decide when —
**it knows about charging state and network cost, and your timer does not.**

## 4. The local database is corrupt or huge

**Causes:** no cap; no deletion; an index missing so queries scan; a migration that ran
halfway.

**Diagnosis:** pull the database off a device and open it. **Most engineers never do this and
it answers the question in a minute.**

**Fix:** cap and expire, index the columns you query, and test migrations with a real database
from the previous version.

## 5. It works for you and not for the user

**Causes:** your queue is empty and theirs has three hundred entries; your data set is small;
your clock is right; your network drops cleanly rather than hanging.

**Fix:** **seed a large local data set and a long queue in development.** The behaviour at
scale is a different program from the behaviour with four records.

## The habits

**Log every queued operation, with id and order.**

**Persist the queue before acknowledging anything.**

**Test on a lossy network, not just offline.**

**Pull the database off a device and look at it.**

**And develop against a data set the size of a real user's.**`,
    mcqs: [
      mcq('A queue held only in memory is:',
        [['Not a queue, because the app can be killed before it is written', true],
          ['Acceptable if flushed on backgrounding', false],
          ['Faster and safe for short-lived operations', false],
          ['Adequate when operations are idempotent', false]],
        'Persist it as the operation is enqueued, before acknowledging anything.'),
      mcq('Debugging reconnection problems requires:',
        [['A log of every queued operation with its id and flush order', true],
          ['A packet capture from the device during sync', false],
          ['Server-side logs of the received requests', false],
          ['A reproducible network simulation harness', false]],
        'Without it you cannot reproduce the timing.'),
      mcq('Letting the platform scheduler decide when to sync is better because:',
        [['It knows about charging state and network cost, and your timer does not', true],
          ['It guarantees the sync will eventually complete', false],
          ['It batches operations across applications', false],
          ['It avoids the need for exponential backoff', false]],
        'Syncing on every connectivity event fires constantly on a train.'),
      mcq('Developing with four records rather than a realistic data set hides:',
        [['That the behaviour at scale is a different program', true],
          ['Bugs in the conflict resolution strategy', false],
          ['Problems with the queue persistence logic', false],
          ['Errors in the local database schema', false]],
        'Seed a large data set and a long queue in development.'),
    ],
    checkpoint: [
      mcq('Pulling the local database off a device and opening it:',
        [['Answers the question in a minute, and most engineers never do it', true],
          ['Requires either a rooted or a jailbroken device to attempt', false],
          ['Is only possible on debug builds', false],
          ['Gives less detail than the query logs', false]],
        'For a corrupt or oversized database it is the first thing to try.'),
      mcq('Duplicates appearing on reconnection point at:',
        [['A queue that is not idempotent and flushed twice', true],
          ['Operations replayed in the wrong order', false],
          ['A missing version number on the record', false],
          ['A snapshot replayed against changed data', false]],
        'Ids the server deduplicates on.'),
      mcq('A retry loop with no backoff contributes to:',
        [['Battery drain from constant syncing', true],
          ['Duplicate operations reaching the server', false],
          ['Queue entries being dropped silently', false],
          ['Local database growth over time', false]],
        'Batch, debounce, and back off exponentially.'),
    ],
  },

  {
    unitCode: 'T3_MOBILE_DATA_PRACTICE',
    notes: `Two exercises on the parts of offline sync that are pure logic: replaying a queue
idempotently, and merging two versions of a record.`,
    coding: [
      {
        title: 'Replaying the queue',
        description: `Read one queued operation per line as \`<id> <intent>\`. The queue may
contain the same id twice, because a flush was interrupted after the server handled it.

Replay in order, **applying each id at most once**, and print the intents actually applied,
one per line. Then print \`applied=<n> skipped=<n>\`, where skipped counts the duplicates.

An intent may itself repeat with a different id — **that is two genuine operations and both
apply.** The id is what deduplicates, not the intent.`,
        starter: `import sys

rows = [l.split(None, 1) for l in sys.stdin if l.strip()]

# The id deduplicates, not the intent.
`,
        language: 'python',
        tests: [
          { input: 'a done_4\nb done_5\n', expectedOutput: 'done_4\ndone_5\napplied=2 skipped=0' },
          { input: 'a done_4\na done_4\n', expectedOutput: 'done_4\napplied=1 skipped=1' },
          { input: 'a done_4\nb done_4\n', expectedOutput: 'done_4\ndone_4\napplied=2 skipped=0' },
          { input: '', expectedOutput: 'applied=0 skipped=0' },
          { input: 'x one\ny two\nx one\nz three\ny two\n', expectedOutput: 'one\ntwo\nthree\napplied=3 skipped=2', isHidden: true },
        ],
      },
      {
        title: 'Field-level merge',
        description: `Three lines: the base record, the local version and the server version.
Each is space-separated \`field=value\` pairs, with the same fields in the same order.

For each field:

- changed on neither side → keep the base value
- changed on one side only → take that side's value
- changed on **both** sides to **different** values → a real conflict
- changed on both sides to the **same** value → take it; there is nothing to contest

Print the merged record as \`field=value\` pairs in the original order, then
\`conflicts=<names, space separated, or none>\`. For a conflicted field print
\`<field>=CONFLICT\` in the merged line.`,
        starter: `import sys

lines = [l.split() for l in sys.stdin.read().split('\\n') if l.split()]
base, local, server = lines[0], lines[1], lines[2]

# Both sides changing to the same value is agreement, not conflict.
`,
        language: 'python',
        tests: [
          { input: 'a=1 b=2\na=9 b=2\na=1 b=8\n', expectedOutput: 'a=9 b=8\nconflicts=none' },
          { input: 'a=1\na=2\na=3\n', expectedOutput: 'a=CONFLICT\nconflicts=a' },
          { input: 'a=1\na=5\na=5\n', expectedOutput: 'a=5\nconflicts=none' },
          { input: 'a=1 b=2\na=1 b=2\na=1 b=2\n', expectedOutput: 'a=1 b=2\nconflicts=none' },
          { input: 'x=0 y=0 z=0\nx=1 y=0 z=7\nx=2 y=3 z=7\n', expectedOutput: 'x=CONFLICT y=3 z=7\nconflicts=x', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Mobile Data Practice',
      description: 'Replay a queue idempotently, merge at field level, then prove both on a device.',
      instructions: `Complete both exercises, then:

1. For the first: the same intent under two ids applies twice. Say why the id deduplicates
   rather than the intent, and give a case where deduplicating on intent loses real work.
2. For the second: both sides changing to the same value is not a conflict. Say why, and give
   a case where you would still want to know it happened.
3. For the second: describe what you would show the user for the field marked CONFLICT, and
   where the losing value would go.

**Then, in an app** you have built or can build in an afternoon.

4. A list backed by a local database, served locally and refreshed in the background.
5. A write queue, **persisted to storage as each operation is enqueued**.
6. Each operation carries an id the server deduplicates on.
7. Optimistic application with a quiet pending marker.
8. **Aeroplane mode for ten minutes.** Read, write, navigate, restart the app. Record what
   happened on reconnection.
9. Then the lossy network simulation. Record what was different and what broke.
10. Implement field-level merge for one record type, and say what you do with the remainder.`,
      rubric: [
        { criterion: 'Queue replay correct', description: 'All cases, deduplicating on id and not on intent.', maxPoints: 15 },
        { criterion: 'Merge correct', description: 'All cases, including agreement treated as agreement.', maxPoints: 15 },
        { criterion: 'Local-first list', description: 'Served from storage, refreshed in the background.', maxPoints: 15 },
        { criterion: 'A persisted, idempotent queue', description: 'Written on enqueue, ids the server deduplicates on.', maxPoints: 20 },
        { criterion: 'Aeroplane and lossy findings', description: 'Both tested, with what happened on reconnection recorded.', maxPoints: 20 },
        { criterion: 'Field-level merge implemented', description: 'For one record type, with the remainder accounted for.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split(None, 1) for l in sys.stdin if l.strip()]
`,
        tests: [
          { input: 'a done_4\nb done_5\n', expectedOutput: 'done_4\ndone_5\napplied=2 skipped=0' },
          { input: 'a done_4\na done_4\n', expectedOutput: 'done_4\napplied=1 skipped=1' },
          { input: 'a done_4\nb done_4\n', expectedOutput: 'done_4\ndone_4\napplied=2 skipped=0' },
          { input: '', expectedOutput: 'applied=0 skipped=0' },
          { input: 'x one\ny two\nx one\nz three\ny two\n', expectedOutput: 'one\ntwo\nthree\napplied=3 skipped=2', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('Deduplicating on intent rather than id would:',
        [['Lose a genuine second operation that happens to be identical', true],
          ['Be safer, since identical intents have the same effect', false],
          ['Work correctly for idempotent operations only', false],
          ['Require the server to track less state', false]],
        'Marking the same item done twice can be two real actions.'),
      mcq('Both sides changing a field to the same value is:',
        [['Agreement, and there is nothing to contest', true],
          ['A conflict, because both sides modified the base', false],
          ['Resolved by whichever change is more recent', false],
          ['A sign the version tracking has failed', false]],
        'Though you might still want it recorded.'),
      mcq('The write queue must be persisted:',
        [['As each operation is enqueued, before anything is acknowledged', true],
          ['When the app moves to the background', false],
          ['At the end of each successful flush', false],
          ['On a short timer, in order to avoid excessive disk writes', false]],
        'The app can be killed at any moment.'),
    ],
  },

  {
    unitCode: 'T3_MOBILE_DATA_MINI_PROJECT',
    notes: `Build something that is genuinely usable with no signal, and correct when the
signal returns.

**The measurement is a two-device conflict you can demonstrate and explain.** Working offline
is the easy half; the hard half is what happens when two devices that both worked offline
meet again.

Budget around two and a half hours.`,
    assignment: {
      title: 'Mini Project — Usable in a Tunnel, Correct at the Other End',
      description: 'Offline reads and writes, a persisted idempotent queue, and a demonstrated conflict.',
      instructions: `**Build** a small app with a list of editable records, backed by a server
you also control — a few endpoints is enough.

**Part one — local first**

1. All reads from a local database. Never block a screen on the network.
2. Background refresh, with a quiet "updated N minutes ago" line.
3. Say in your notes which screens are offline-first, tolerant or hostile, and why.

**Part two — the queue**

4. Writes queue as intents, not snapshots.
5. **Persisted to storage on enqueue**, before the user is told anything.
6. Each carries an id the server deduplicates on.
7. Optimistic application with a pending marker.
8. Replay in order on reconnection, handling each failure individually.
9. Expire the queue after a sensible age, and tell the user what expired.

**Part three — conflict**

10. Add a version to each record. The device sends the version it edited from.
11. Implement field-level merge.
12. Fall back to asking the user for a real same-field conflict.
13. Use soft deletes, and default to keeping the record when an edit meets a delete.

**Part four — prove it**

14. **Aeroplane mode for ten minutes.** Read, write, navigate, force-quit, reopen. Record
    everything.
15. Reconnect and record what happened.
16. Run the lossy network simulation and record what was different.
17. **The two-device demonstration:** take the same record offline on two devices or two
    installs, change different fields on each, reconnect both, and show the merge.
18. Then change the **same** field on both and show what the user is asked.

**Part five — write it up**

19. Your conflict strategy, and what it loses.
20. What you would do differently with three record types instead of one.
21. **The case you know it handles badly**, named honestly.

**Submit** the code, the recordings or logs from steps 14 to 18, and the write-up.`,
      rubric: [
        { criterion: 'Local-first reads', description: 'Never blocking, with freshness shown and postures justified per screen.', maxPoints: 15 },
        { criterion: 'A persisted, idempotent queue', description: 'Intents, written on enqueue, ids deduplicated, replayed in order.', maxPoints: 25 },
        { criterion: 'Versioned conflict detection', description: 'Versions sent and compared, with field-level merge implemented.', maxPoints: 20 },
        { criterion: 'Offline and lossy testing', description: 'Ten minutes offline including a force-quit, plus the lossy run.', maxPoints: 15 },
        { criterion: 'The two-device demonstration', description: 'Different fields merged, same field escalated to the user.', maxPoints: 15 },
        { criterion: 'Honest write-up', description: 'What the strategy loses, and the case it handles badly.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The thing this project is measured by is:',
        [['A two-device conflict you can demonstrate and explain', true],
          ['That the app remains usable with no network at all', false],
          ['That the queue replays without duplicates', false],
          ['That reads never block on the network', false]],
        'Working offline is the easy half.'),
      mcq('Force-quitting during the offline test matters because:',
        [['It proves the queue was persisted rather than held in memory', true],
          ['It clears the local cache and tests the refresh', false],
          ['It exercises the restoration of the navigation stack', false],
          ['It simulates the system reclaiming memory', false]],
        'A queue held in memory is not a queue.'),
      mcq('Sending the version the device edited from allows the server to:',
        [['Detect that a concurrent change happened at all', true],
          ['Order the incoming writes correctly', false],
          ['Reject operations that arrive out of sequence', false],
          ['Deduplicate repeated queue flushes', false]],
        'Without it you can only overwrite.'),
    ],
  },
];
