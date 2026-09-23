/**
 * T2_TRACK_MOBILE — eleven units. Year 2, direction track.
 *
 * ── WHY THIS TRACK IS FRAMEWORK-NEUTRAL ───────────────────────────────────────────────────
 *
 * The units are written so a student can follow them in React Native, Flutter or native Android,
 * because what distinguishes mobile work is not the framework: it is the constraints. A small
 * screen, a thumb, an unreliable connection, an operating system that can kill your process at any
 * moment, and a permission the user may simply refuse.
 *
 * Examples name React Native where one is needed, and every unit says where the idea is the
 * transferable part.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const MOBILE_TRACK_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T2_TRACK_MOBILE_APP_STRUCTURE',
    notes: `An app is a set of screens and the paths between them. Getting that map right before
building saves restructuring later, when everything is coupled to the shape you chose.

**Draw the screen map first.** Every screen, every way to reach it, and every way back:

    Launch
      ├─ Onboarding (first run only)
      └─ Main tabs
           ├─ Orders  →  Order detail  →  Edit order
           ├─ Search  →  Product detail
           └─ Profile →  Settings →  Notifications

**The navigation patterns, and when each fits:**

| Pattern | For |
|---|---|
| **Tabs** | Three to five equal sections, always reachable |
| **Stack** | Drilling into detail, with a back path |
| **Modal** | A task that interrupts, with an explicit dismiss |
| **Drawer** | Secondary destinations, out of the way |

**Tabs are for peers, stacks are for depth.** Putting a drill-down in a tab, or a top-level section
behind three pushes, is the commonest structural mistake and it shows up as users who cannot find
things.

**Three to five tabs.** Six is too many to hit with a thumb and too many to scan.

**Every screen needs a way back that matches the platform.** Android has a system back gesture and
button that must work; iOS expects a swipe from the left edge. Breaking either feels wrong in a way
users notice without being able to name.

**A project layout that scales:**

    src/
      screens/        one file per screen
      components/     reusable pieces
      navigation/     the map, in one place
      services/       api calls, storage
      hooks/ or state/
      utils/

**Keep navigation configuration in one place.** Scattered across screens, the map exists only in
somebody's head, and adding a screen becomes an archaeology exercise.

**Decide what deep links exist early.** An order confirmation email that opens the app on the right
screen requires the route to be addressable, and retrofitting that is much harder than designing for
it.

**Screens should be thin.** Fetching, business rules and storage belong in services and hooks, so a
screen is a layout plus the state it displays — which is the same layering argument as every other
track, applied here.`,
    mcqs: [
      mcq('Tabs should be used for:',
        [['Three to five equal sections', true],
          ['Drilling into detail', false],
          ['Interrupting tasks', false],
          ['Secondary destinations', false]],
        'Tabs are for peers; stacks are for depth.'),
      mcq('Putting a top-level section behind three pushes results in:',
        [['Users who cannot find it', true],
          ['Slower navigation performance', false],
          ['Broken back behaviour', false],
          ['A deep link that fails', false]],
        'The commonest structural mistake in an app.'),
      mcq('The Android system back gesture:',
        [['Must work on every screen', true],
          ['Is optional if a back button exists', false],
          ['Applies only to stack navigation', false],
          ['Can be disabled in modals', false]],
        'Breaking it feels wrong in a way users notice.'),
      mcq('Deep links should be planned early because:',
        [['Retrofitting routes is much harder', true],
          ['They affect the tab count', false],
          ['App stores require them', false],
          ['They change the navigation library', false]],
        'An email that opens the right screen needs the route to be addressable.'),
    ],
    checkpoint: [
      mcq('Navigation configuration should live:',
        [['In one place', true],
          ['Beside each screen', false],
          ['In the root component', false],
          ['In the services layer', false]],
        'Scattered, the map exists only in somebody\'s head.'),
      mcq('A screen should contain:',
        [['A layout and the state it displays', true],
          ['Its own fetching and storage logic', false],
          ['The business rules it enforces', false],
          ['Its navigation configuration', false]],
        'The same layering argument as every other track.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_MOBILE_LAYOUT',
    notes: `Designing for a hand is a genuine constraint, not a smaller version of a web page.

**The physical facts:**

- A thumb reaches the bottom two thirds of the screen comfortably, and the top corners badly
- A touch target must be at least 44×44 points, because a fingertip is not a cursor
- Screens range from about 320 points wide to very large, in both orientations
- Users set system font sizes, sometimes very large, and your layout must accept it

**Put primary actions within thumb reach**, at the bottom. The top-right corner is the worst place
for a frequently used control on a large phone, and it is where the web convention puts it.

**Spacing between targets matters as much as their size.** Two 44-point buttons touching each other
produce mistaken taps, and a destructive action beside a common one produces mistaken deletes. Keep
destructive actions away from the flow, and confirm them.

**Layout must accept large text.** A user with a 200% font setting is not an edge case; it is
somebody with poor eyesight using the accessibility feature their phone provides. Test with it on.
Fixed heights and single-line assumptions break immediately.

**Lists are most of mobile.** Use the platform's virtualised list — \`FlatList\`, \`RecyclerView\`,
\`ListView.builder\` — rather than mapping over an array into a scroll view. A hundred items works
either way; a thousand freezes the second one.

**Every list needs an empty state**, and it should say what to do rather than showing an
unexplained blank screen.

**Respect the safe areas.** Notches, rounded corners and the home indicator take real estate, and
content underneath them is cut off or untappable. Every framework provides a safe-area container;
use it rather than a hardcoded inset.

**The keyboard covers half the screen.** A form with a field at the bottom becomes unusable when the
keyboard appears unless the view scrolls. Test every form with the keyboard open, on the smallest
device you support.

**Orientation and split screen exist.** At minimum, do not break; ideally, adapt.

**Test on a real device early.** A simulator on a large monitor hides everything in this unit: the
reach, the target size, the keyboard, the sunlight, and how heavy the interface feels under a thumb.`,
    mcqs: [
      mcq('The minimum touch target size is about:',
        [['44 by 44 points', true], ['24 by 24 points', false], ['64 by 64 points', false], ['16 by 16 points', false]],
        'A fingertip is not a cursor.'),
      mcq('Primary actions belong:',
        [['Within thumb reach', true],
          ['In the top-right corner', false],
          ['In a drawer menu', false],
          ['Centred on the screen', false]],
        'The web convention puts them where a thumb reaches worst.'),
      mcq('Mapping an array into a scroll view instead of a virtualised list:',
        [['Freezes once the list is long', true],
          ['Uses more network data', false],
          ['Breaks the empty state', false],
          ['Prevents pull-to-refresh', false]],
        'A hundred items works; a thousand does not.'),
      mcq('A user with a 200% system font size is:',
        [['Using an accessibility feature', true],
          ['An unusual case worth ignoring', false],
          ['Best served by a separate layout', false],
          ['Unable to use most apps anyway', false]],
        'Fixed heights break immediately.'),
    ],
    checkpoint: [
      mcq('Safe area containers exist because:',
        [['Notches and indicators take space', true],
          ['Screen sizes vary between devices', false],
          ['Orientation changes need handling', false],
          ['Keyboards cover content', false]],
        'Content underneath them is cut off or untappable.'),
      mcq('Testing on a real device early reveals:',
        [['Reach, target size and feel', true],
          ['Network reliability problems', false],
          ['Memory leaks under load', false],
          ['Navigation configuration errors', false]],
        'A simulator on a large monitor hides all of it.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_MOBILE_STATE',
    notes: `A screen holds state, and telling the framework it changed is how anything appears. The
mechanism differs by framework; the thinking does not.

    // React Native
    const [orders, setOrders] = useState([]);
    const [status, setStatus] = useState("loading");

**Mutating state directly does nothing visible.** \`orders.push(x)\` changes the array and the
framework sees the same reference, so nothing re-renders. Replace it:

    setOrders(prev => [...prev, newOrder]);

Flutter's \`setState\`, Android's observable state and React's setters all rest on the same rule:
the framework must be told, and a mutated object often does not tell it.

**Use the updater form when the new value depends on the old one.** Two rapid updates that both read
the current value lose one of them; \`setCount(c => c + 1)\` does not.

**Keep state minimal, and derive the rest.** A filtered list, a total, an "is valid" flag — compute
them during render rather than storing them, because a stored copy is one that can go stale.

**State that belongs on a screen stays on the screen.** Lifting everything into a global store
because two screens might need it produces a store nobody can follow. Lift when there is a second
consumer.

**What genuinely needs to be shared:** the signed-in user, the cart, cached server data, and settings.
Those belong in context, a store, or a query cache.

**Server data is not UI state.** A list fetched from an API has a loading status, an error, a
staleness and a refresh — which is why query libraries exist. Hand-rolling that for every screen
produces the same five bugs each time.

**Async updates after the screen is gone.** A fetch resolving after the user navigated away sets
state on something that no longer exists — a warning in development and a leak in production. Cancel
on unmount, or check before setting.

**Forms need their own state**, separate from the data being edited, so you can show unsaved changes
and discard them.

**The debugging question is the same as every other track: which copy of this fact is wrong?**`,
    mcqs: [
      mcq('`orders.push(newOrder)` does not update the screen because:',
        [['The framework sees the same reference', true],
          ['Arrays cannot hold state', false],
          ['push is asynchronous', false],
          ['The render was already scheduled', false]],
        'Replace the array rather than mutating it.'),
      mcq('The updater form `setCount(c => c + 1)` is needed when:',
        [['The new value depends on the old one', true],
          ['The update is asynchronous', false],
          ['State is shared between screens', false],
          ['The component may unmount', false]],
        'Two rapid updates reading the current value lose one.'),
      mcq('A filtered list shown on screen should be:',
        [['Computed during render, not stored', true],
          ['Stored alongside the full list', false],
          ['Cached in local storage', false],
          ['Kept in a global store', false]],
        'A stored copy is one that can go stale.'),
      mcq('A fetch resolving after the user navigates away causes:',
        [['A state update on something gone', true],
          ['A duplicate network request', false],
          ['A navigation stack error', false],
          ['A crash on Android only', false]],
        'Cancel on unmount, or check before setting.'),
    ],
    checkpoint: [
      mcq('Server data differs from UI state because it has:',
        [['Loading, error and staleness', true],
          ['A larger memory footprint', false],
          ['To be stored locally', false],
          ['No need for re-rendering', false]],
        'Which is why query libraries exist.'),
      mcq('State should be lifted to a shared store when:',
        [['A second consumer genuinely needs it', true],
          ['It might be needed later', false],
          ['It is fetched from an API', false],
          ['More than one field depends on it', false]],
        'Lifting everything produces a store nobody can follow.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_MOBILE_NAVIGATION',
    notes: `Moving between screens, carrying data with you, and coming back to what the user left.

**Passing data forward:**

    navigation.navigate("OrderDetail", { orderId: order.id });

**Pass an id, not the object.** The object you pass is a snapshot: if the order is updated elsewhere,
the detail screen is showing stale data with no way to know. An id plus a lookup always shows the
current version.

**Coming back with a result** — a selection, a confirmation — is the case every navigation library
handles differently and every student gets wrong first. The options are a callback parameter, a
shared store, or a route parameter on return. Pick one approach and use it consistently, because
mixing them makes the data flow impossible to follow.

**The back stack is a stack.** Pushing the same screen repeatedly builds a pile the user must press
back through, and it is how a login screen ends up behind twelve copies of itself. After a login or
a successful submission, **replace or reset** rather than push.

**Preserve state when coming back.** A user who scrolls a list, opens an item and returns expects the
scroll position, the filters and the search text to be as they left them. Losing them is a small
thing that makes an app feel cheap.

**Android back is not optional.** The system gesture and button must do something sensible on every
screen: close the modal, go up a level, or — at the root — leave the app. Intercept it only where
you genuinely must, such as confirming unsaved changes, and always give the user a way through.

**Deep links** map a URL to a screen with parameters, and they need the same guards as any entry
point: what if the user is not logged in, what if the record does not exist, what if it is somebody
else's.

**Guard routes by auth state**, in one place. A screen that checks for a logged-in user in its own
body is a check somebody will forget to copy into the next screen.

**Transitions should be fast and consistent.** Use the platform defaults unless there is a reason; a
custom animation that takes 600ms feels slow on every use, forever.`,
    mcqs: [
      mcq('You should pass an id rather than the whole object because:',
        [['The object is a snapshot', true],
          ['Objects cannot be serialised', false],
          ['It reduces memory usage', false],
          ['Deep links only accept ids', false]],
        'An id plus a lookup always shows the current version.'),
      mcq('After a successful login you should:',
        [['Replace or reset the stack', true],
          ['Push the main screen', false],
          ['Navigate with a callback', false],
          ['Clear the local cache', false]],
        'Otherwise the login screen stays behind the app.'),
      mcq('Returning to a list should preserve:',
        [['Scroll position and filters', true],
          ['Only the scroll position', false],
          ['Nothing, so the data is fresh', false],
          ['The full navigation history', false]],
        'Losing them is a small thing that makes an app feel cheap.'),
      mcq('Auth guards on routes should be:',
        [['In one place, not inside each screen', true],
          ['Repeated in every screen body', false],
          ['Handled by the API only', false],
          ['Applied at app launch alone', false]],
        'A per-screen check is one somebody forgets to copy.'),
    ],
    checkpoint: [
      mcq('Mixing several approaches for returning a result:',
        [['Makes the data flow impossible to follow', true],
          ['Is required for different screen types', false],
          ['Improves compatibility across platforms', false],
          ['Is the recommended pattern', false]],
        'Pick one and use it consistently.'),
      mcq('A custom 600ms screen transition:',
        [['Feels slow on every use, forever', true],
          ['Looks more polished than defaults', false],
          ['Improves perceived performance', false],
          ['Is standard on Android', false]],
        'Use platform defaults unless there is a reason.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_MOBILE_NETWORKING',
    notes: `A phone's connection is the defining constraint of mobile development. It is slow, it
disappears in a lift, and it changes between wifi and mobile data mid-request.

**The four states apply here as everywhere**, and matter more:

    loading  →  a skeleton, not a blank screen
    error    →  what went wrong and a retry that works
    empty    →  what to do about it
    success  →  the data

**Plus a fifth that is mobile-specific: offline.** "No connection" is a different message from "the
server is not responding", and the user can act on the first.

**Always set a timeout**, and a short one. A request with no timeout on a bad connection leaves a
spinner for a minute while the user concludes the app is broken. Ten to fifteen seconds, then fail
with something useful.

**Assume every request will fail sometimes.** Retry idempotent requests with backoff; never retry a
payment or an order creation without an idempotency key.

**Data costs money.** Many users are on metered connections, so fetch what the screen needs, page
long lists, and resize images server-side rather than downloading a 4MB photo to display at 80
points.

**Cache aggressively and show stale data with a marker.** A list from five minutes ago is far more
useful than an empty screen, and refreshing behind it is invisible to the user.

**Detect connectivity, but do not trust it.** The device reporting a connection means it has an
interface, not that anything is reachable — a captive portal in a café reports connected and
answers every request with a login page.

**Queue writes made offline** and send them when the connection returns, with a visible indication
that something is pending. An app that silently loses what somebody typed on a train is an app they
stop using.

**Test on a throttled connection**, deliberately, every time. Both simulators provide it. Almost
every mobile networking bug is invisible on a fast connection and obvious on a slow one.`,
    mcqs: [
      mcq('The state that mobile adds to the usual four is:',
        [['Offline', true],
          ['Refreshing', false],
          ['Cached', false],
          ['Stale', false]],
        'The user can act on "no connection".'),
      mcq('A request with no timeout on a bad connection:',
        [['Leaves a spinner until the user gives up', true],
          ['Fails immediately', false],
          ['Retries automatically', false],
          ['Queues until connectivity returns', false]],
        'Ten to fifteen seconds, then fail usefully.'),
      mcq('The device reporting a connection means:',
        [['It has an interface, nothing more', true],
          ['The server is responding', false],
          ['Requests will succeed', false],
          ['Bandwidth is sufficient', false]],
        'A café captive portal reports connected and answers with a login page.'),
      mcq('Downloading a 4MB photo to display at 80 points is a problem because:',
        [['Many users are on metered connections', true],
          ['Large images crash the app', false],
          ['The image cache has a size limit', false],
          ['Resizing on device is slow', false]],
        'Resize server-side and fetch what the screen needs.'),
    ],
    checkpoint: [
      mcq('Writes made while offline should be:',
        [['Queued, with a pending indicator', true],
          ['Rejected with an error', false],
          ['Retried immediately in a loop', false],
          ['Held in memory only', false]],
        'An app that silently loses what somebody typed gets deleted.'),
      mcq('Testing on a throttled connection matters because:',
        [['Most such bugs hide on a fast one', true],
          ['App stores require it', false],
          ['It reveals memory leaks', false],
          ['Simulators are otherwise inaccurate', false]],
        'Both simulators provide throttling.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_MOBILE_LOCAL_STORAGE',
    notes: `An app that forgets everything when it closes is an app people stop opening. Deciding what
survives, and where it lives, is a design decision.

**The options, and what each is for:**

| Store | For | Notes |
|---|---|---|
| **Key-value** (AsyncStorage, SharedPreferences) | Small settings, flags, a token | Simple, not for lists |
| **SQLite / Room / Core Data** | Structured data, queries, lots of rows | The right answer for cached records |
| **Files** | Images, documents, exports | Manage the space yourself |
| **Secure storage** (Keychain, EncryptedSharedPreferences) | Tokens, credentials | Never anywhere else |

**Tokens go in secure storage, always.** A key-value store is readable on a rooted or jailbroken
device, and a token there is a credential lying in the open. Every platform provides an encrypted
store, and using it is a few extra lines.

**What must survive:** the login session, the draft the user typed, their settings, the cart, and
cached data for offline use.

**What should not survive:** stale caches nobody invalidates, everything ever fetched, and anything
personal after logout. **Clearing storage on logout is not optional** — on a shared device the next
user gets the previous one's data.

**Key-value stores are not databases.** Storing a JSON array of 5,000 orders in one means reading and
writing all of it on every change, which is slow and eventually fails. Use SQLite once there are rows
rather than settings.

**Cached data needs an expiry and a version.** Without an expiry it is stale forever; without a
version, an app update that changes the shape reads old data into new code and crashes on a field
that no longer exists.

**Storage is asynchronous on every platform.** Reading a setting at startup and rendering before it
arrives produces the visible flash where the app shows a logged-out state and then corrects itself.

**Disk fills up.** Handle a write failure rather than assuming success, particularly when caching
images.

**And decide about backup.** On both platforms, some storage is included in the device backup and
some is not. Cached data should not be, and a token generally should not be either.`,
    mcqs: [
      mcq('An authentication token must be stored in:',
        [['The platform\'s secure store', true],
          ['A key-value store', false],
          ['The app\'s SQLite database', false],
          ['A file in the app directory', false]],
        'Elsewhere it is readable on a rooted or jailbroken device.'),
      mcq('Storing 5,000 records in a key-value store is a problem because:',
        [['Every change rewrites the whole value', true],
          ['Key-value stores are not persistent', false],
          ['JSON cannot hold that many items', false],
          ['It is not backed up', false]],
        'Use SQLite once there are rows rather than settings.'),
      mcq('Cached data needs a version as well as an expiry because:',
        [['New code can read old data', true],
          ['Versions allow incremental sync', false],
          ['Expiry alone is unreliable', false],
          ['The store requires it', false]],
        'It crashes on a field that no longer exists.'),
      mcq('Clearing storage on logout matters because:',
        [['A shared device leaks it', true],
          ['It frees disk space', false],
          ['Tokens expire anyway', false],
          ['App stores require it', false]],
        'Not optional, and commonly forgotten.'),
    ],
    checkpoint: [
      mcq('Reading a setting at startup and rendering before it arrives causes:',
        [['A flash of the wrong state', true],
          ['A crash on first launch', false],
          ['The setting to be lost', false],
          ['A slow cold start', false]],
        'Storage is asynchronous on every platform.'),
      mcq('Cached data should generally be:',
        [['Excluded from the device backup', true],
          ['Included, so it survives a restore', false],
          ['Stored in the secure store', false],
          ['Written to an external directory', false]],
        'It is reproducible, and it wastes the user\'s backup space.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_MOBILE_LIFECYCLE',
    notes: `Your app does not control when it runs. The operating system starts it, backgrounds it,
and kills it without asking — and handling that well is what separates an app that feels reliable
from one that loses people's work.

**The states, on every platform:**

    Not running  →  Launching  →  Active  →  Background  →  Suspended  →  Killed

**Going to the background happens constantly:** a call, a notification, the user switching apps for
ten seconds. You get a moment to save, and then you may not run again.

**Save on background, not on exit.** There is no reliable "the user is leaving" event, because the
system can kill a suspended app with no further notice. Persist the draft, the form, the scroll
position and the in-progress work when you go to the background, every time.

**Being killed is normal, not an error.** Android in particular reclaims memory aggressively, and a
backgrounded app being killed after a few minutes is ordinary behaviour. When the user returns they
expect to be where they were, which means you restore from what you saved rather than starting
fresh.

**Cold start versus resume.** Coming back from the background should be instant; a cold start has to
re-authenticate, re-fetch and rebuild. Test both, because a bug that only appears after the system
killed your app is invisible during development, where it never gets killed.

**Stop work in the background.** Timers, polling, location updates and animations continue consuming
battery if you leave them running, and users notice an app that drains their phone far more than they
notice a slow screen.

**Interruptions mid-task.** A call arriving during a form, a photo picker returning after the system
reclaimed memory, a payment flow interrupted. Each needs the same answer: the state was saved, so
restore it.

**The orientation change** is the smallest version of the same problem: on Android it can recreate
your screen entirely. If your state does not survive a rotation, it will not survive being killed
either — which makes rotation a quick and useful test.

**Test the real thing.** Both platforms provide a "don't keep activities" or equivalent setting that
kills your app whenever it is backgrounded. Turning it on for a day finds every one of these bugs in
an afternoon.`,
    mcqs: [
      mcq('Work should be saved:',
        [['On going to the background, every time', true],
          ['When the user exits the app', false],
          ['Periodically on a timer', false],
          ['Before each screen transition', false]],
        'There is no reliable "the user is leaving" event.'),
      mcq('An app being killed while backgrounded is:',
        [['Ordinary system behaviour', true],
          ['A crash to be reported', false],
          ['A sign of a memory leak', false],
          ['Specific to low-end devices', false]],
        'Android reclaims memory aggressively.'),
      mcq('Leaving timers and polling running in the background:',
        [['Drains battery, which users notice most', true],
          ['Is required to keep data fresh', false],
          ['Has no effect once suspended', false],
          ['Improves resume performance', false]],
        'Noticed far more than a slow screen.'),
      mcq('If state does not survive a rotation on Android, it also will not survive:',
        [['Being killed in the background', true],
          ['A slow network request', false],
          ['A cold start with a deep link', false],
          ['A permission being revoked', false]],
        'Which makes rotation a quick test for the larger problem.'),
    ],
    checkpoint: [
      mcq('The "don\'t keep activities" developer setting:',
        [['Finds these bugs in an afternoon', true],
          ['Simulates a slow connection', false],
          ['Disables background execution', false],
          ['Prevents orientation changes', false]],
        'It kills the app whenever it is backgrounded.'),
      mcq('A cold start differs from a resume in that it must:',
        [['Re-authenticate and rebuild', true],
          ['Show the onboarding flow', false],
          ['Clear the local cache', false],
          ['Request permissions again', false]],
        'Test both; the killed-app path is invisible in development.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_MOBILE_PERMISSIONS',
    notes: `Camera, location, contacts, notifications, photos — each needs the user's consent, and how
you ask decides whether you get it.

**Ask in context, at the moment of use.** A camera permission requested at launch, before the user
knows what the app does, is refused by most people. The same permission requested when they tap "Add
a photo" is granted by most.

**Explain before you ask.** A short screen of your own, saying what you need and why, before
triggering the system dialogue. The system dialogue cannot be re-shown once refused on iOS, so
spending it on an unexplained request is spending the only chance you get.

**Handle refusal properly, because it is a legitimate answer:**

| Outcome | What the app should do |
|---|---|
| Granted | Proceed |
| Denied | Continue with that feature unavailable, explained |
| Denied permanently | Explain, and offer to open Settings |
| Restricted | Treat as denied |

**"Denied permanently" is its own case**, and on both platforms the system dialogue will no longer
appear. Your only route is a message explaining what is unavailable and a button that opens the app's
settings page.

**Never block the app on an optional permission.** A note-taking app that refuses to start without
contacts access gets uninstalled, and the review says so.

**Ask for the least you need.** Coarse location rather than precise, one photo rather than the whole
library, notifications when there is something worth notifying about. Both platforms now offer
narrower options and users increasingly choose them.

**Permissions can be revoked at any time**, including while your app is suspended, and both platforms
may reset them automatically if an app is unused for months. Check before using, every time, rather
than assuming a grant from last week still holds.

**Notifications need earning.** Ask after the user has seen value, be specific about what you will
send, and honour it. An app that asks on first launch and then sends marketing is the reason so many
people refuse by default.

**And say what you do with the data**, in the app and in the store listing. Both stores require a
privacy declaration, and a mismatch between what you declare and what you do is a rejection, and
sometimes worse.`,
    mcqs: [
      mcq('A permission should be requested:',
        [['At the moment the feature is used', true],
          ['At app launch, so it is done', false],
          ['During onboarding', false],
          ['After the first session', false]],
        'An unexplained launch request is refused by most people.'),
      mcq('Showing your own explanation before the system dialogue matters because:',
        [['The system dialogue comes only once', true],
          ['The system dialogue is not translated', false],
          ['It is required by the platforms', false],
          ['It speeds up the grant', false]],
        'You get one chance; do not spend it unexplained.'),
      mcq('An app denied an optional permission should:',
        [['Continue without that feature, explained', true],
          ['Block until the permission is granted', false],
          ['Ask again immediately', false],
          ['Exit with an error message', false]],
        'Blocking gets the app uninstalled, and the review says so.'),
      mcq('A permission granted last week:',
        [['May have been revoked since', true],
          ['Remains valid until reinstall', false],
          ['Can be cached as granted', false],
          ['Only changes with an app update', false]],
        'Check before use, every time.'),
    ],
    checkpoint: [
      mcq('When a permission is permanently denied, the app should:',
        [['Explain, and offer to open Settings', true],
          ['Request it again next launch', false],
          ['Disable itself entirely', false],
          ['Show the system dialogue again', false]],
        'The system dialogue will no longer appear.'),
      mcq('Asking for notification permission on first launch:',
        [['Is why so many people refuse by default', true],
          ['Maximises the grant rate', false],
          ['Is required before sending any', false],
          ['Has no effect on later requests', false]],
        'Ask after the user has seen value, and be specific.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_MOBILE_DEBUGGING',
    notes: `Mobile bugs are harder to reproduce than web bugs, because the device, the connection and
the operating system are all variables you do not control.

**It works on my phone.** The most common sentence in mobile development, and the causes are a
narrow list: a different OS version, a smaller screen, a slower device, a different font size
setting, less memory, a worse connection, or a permission your device granted long ago and forgot.

**It crashes only for some users.** Get the stack trace rather than the description. A crash
reporting tool is not optional for anything real — without one you are guessing from a review that
says "keeps crashing".

**It worked before the update.** Something changed in the OS, a library, or your own release. Check
what the OS version of the affected users is; platform updates change behaviour regularly, especially
around permissions and background execution.

**State is lost when returning to the app.** The system killed it. Test with "don't keep activities"
enabled and it reproduces every time.

**The list is slow or stutters.** Not virtualised, rendering too much per row, images not sized, or
work happening during scroll.

**It works on wifi and not on mobile data.** A timeout too short for a slow connection, a request too
large, or a cleartext HTTP request blocked on a network that intercepts it.

**The layout is broken on one device.** Safe areas, a notch, a very small screen, or a system font
size you did not test.

**The tools:**

- **The device log** — \`adb logcat\`, or Xcode's console — is the equivalent of the browser console
- **The network inspector** in your framework's debugger, or a proxy tool on your own device
- **The layout inspector** for what is actually rendered and how big it is
- **A real device**, of the cheapest kind you support, which finds performance problems no simulator
  will

**Reproduce on a real device before investigating.** A simulator is fast, has a perfect connection,
never gets a phone call and is never killed for memory — which means it hides most of what this
track is about.

**And keep a matrix of what you have tested on:** OS versions, screen sizes, and at least one old
cheap device. Not everybody has this year's phone, and in India most people do not.`,
    mcqs: [
      mcq('"It works on my phone" is usually explained by:',
        [['OS version, screen, memory or signal', true],
          ['A corrupted local build', false],
          ['A caching problem in the app', false],
          ['An outdated dependency', false]],
        'A narrow list, worth checking in order.'),
      mcq('For crashes affecting only some users, you need:',
        [['A crash reporter and its stack traces', true],
          ['More detailed user descriptions', false],
          ['A larger test device matrix', false],
          ['Verbose logging in production', false]],
        'Without one you are guessing from "keeps crashing".'),
      mcq('State lost on returning to the app reproduces reliably with:',
        [['"Don\'t keep activities" enabled', true],
          ['A throttled connection', false],
          ['A low-memory simulator', false],
          ['Airplane mode toggled', false]],
        'The system killed it, which is ordinary behaviour.'),
      mcq('A simulator hides most mobile problems because it:',
        [['Is fast, always connected and never killed', true],
          ['Runs a different operating system', false],
          ['Cannot render real layouts', false],
          ['Uses a different rendering engine', false]],
        'Reproduce on a real device before investigating.'),
    ],
    checkpoint: [
      mcq('Working on wifi but not on mobile data suggests:',
        [['A short timeout or a blocked scheme', true],
          ['A DNS misconfiguration', false],
          ['A permissions problem', false],
          ['An expired certificate', false]],
        'Cleartext HTTP is blocked on many networks and by default.'),
      mcq('The test device matrix should include:',
        [['An old cheap device you support', true],
          ['Only the latest two OS versions', false],
          ['One device per screen size', false],
          ['Simulators for every platform', false]],
        'In India most users are not on this year\'s phone.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_MOBILE_PRACTICE',
    notes: `No new ideas. Build screens until the constraints of a phone are automatic.

**Do these, on a real device wherever the exercise allows:**

1. **A list and detail flow.** Virtualised list, all five states including offline, detail by id, and
   state preserved when coming back.
2. **A form on a small screen.** Every field reachable with the keyboard open, validation beside each
   field, and the draft surviving a background-and-kill.
3. **Survive being killed.** Enable "don't keep activities", use your app for ten minutes, and fix
   everything that loses state.
4. **Throttle the network.** Take a working screen, set the connection to slow 3G, and fix every
   place that hangs, flashes or misleads.
5. **Go offline.** Turn off the connection entirely. Every screen should say something useful, and
   writes should queue.
6. **Ask for a permission properly.** In context, with your own explanation, handling granted, denied
   and permanently denied.
7. **Large font and small screen.** Set the system font to its largest and run on the smallest device
   you support. Fix what breaks.
8. **Measure a slow list.** Render 2,000 rows badly, measure the frame rate, fix it, and measure
   again.

**Record for each:** the device, the conditions, what broke, and what you changed.

**The standard this set aims at:** an app is not finished when it works on your phone on wifi with a
charged battery. It is finished when it works on a cheap phone, on a slow connection, in one hand,
for somebody who has set their font size to large.`,
    mcqs: [
      mcq('The draft in a form should survive:',
        [['Being backgrounded and killed', true],
          ['Only a screen rotation', false],
          ['A network failure', false],
          ['A permission change', false]],
        'Save on background, restore on return.'),
      mcq('Testing with "don\'t keep activities" for a day:',
        [['Finds every lost-state bug quickly', true],
          ['Simulates low-end device performance', false],
          ['Reveals memory leaks', false],
          ['Tests permission handling', false]],
        'The system kills the app whenever it is backgrounded.'),
      mcq('Turning the connection off entirely should produce:',
        [['A useful message, and queued writes', true],
          ['A single global error screen', false],
          ['Silent failure until reconnection', false],
          ['An app that refuses to open', false]],
        'Offline is a state, not an error.'),
      mcq('Setting the system font to its largest tests:',
        [['Whether fixed heights and single lines break', true],
          ['Rendering performance', false],
          ['The virtualised list implementation', false],
          ['Safe area handling', false]],
        'Somebody with poor eyesight is using a feature their phone provides.'),
      mcq('The standard this practice set aims at is an app that works:',
        [['On a cheap phone, on a slow connection', true],
          ['On the latest device with good signal', false],
          ['On both platforms identically', false],
          ['Without any crashes reported', false]],
        'And for somebody who has set their font size large.'),
    ],
    checkpoint: [
      mcq('Measuring a slow list before and after the fix gives you:',
        [['Evidence the change helped', true],
          ['The cause of the slowness', false],
          ['The optimal row height', false],
          ['A profile of the render cycle', false]],
        'Render badly, measure, fix, measure again.'),
      mcq('A permission exercise must handle:',
        [['Granted, denied, and permanently denied', true],
          ['Granted and denied only', false],
          ['Only the permanently denied case', false],
          ['The system dialogue alone', false]],
        'The third is the one students omit.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_MOBILE_MINI_PROJECT',
    notes: `A complete app over a real API, built for the conditions a phone is actually used in.

**Why the conditions are the assessment.** Any student can produce screens that work on a simulator
with a fast connection. An app that keeps your draft when the system kills it, tells you honestly
that you are offline, and remains usable at a large font size on a small screen is a different piece
of work, and it is the one an employer recognises.

**What is being assessed:** that state survives the lifecycle, that the network is treated as
unreliable by default, that permissions are asked for properly and refusal is handled, and that the
layout holds under real conditions.

**Build it in this order:**

1. **The screen map**, and navigation in one place.
2. **One screen end to end**, with all five states, before building the second.
3. **Local storage** for what must survive, with secure storage for anything sensitive.
4. **The lifecycle work**: save on background, restore on return, and test with the app being killed.
5. **Permissions**, in context, with refusal handled.
6. **The hostile conditions pass**: slow network, offline, large font, small screen, old device.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Project — An App for Real Conditions',
      description: 'Build a multi-screen mobile app over a real API that survives being killed, works offline, handles a refused permission and holds up at a large font size.',
      instructions: `**The brief**

Build a mobile app with **at least four screens** over a real API, including a list, a detail view, a
form that writes, and one screen using a device capability (camera, location, notifications or
storage).

Any framework. If you use one, you must be able to explain what it handles for you.

**Requirements**

1. **A screen map** produced before building, with navigation configured in one place and working
   Android back behaviour on every screen.
2. **All five states on every screen that fetches**: loading, error with a working retry, empty,
   success, and offline — with offline distinguished from a server error.
3. **Virtualised lists**, with an empty state, tested with at least 1,000 rows.
4. **A form** usable with the keyboard open on the smallest device you support, with per-field
   validation and a **draft that survives the app being killed**.
5. **Local persistence**: settings and cache in an appropriate store, tokens in secure storage,
   everything personal cleared on logout.
6. **Lifecycle handling**: state saved on background and restored on return, demonstrated with
   "don't keep activities" or the equivalent enabled.
7. **One permission requested in context**, with your own explanation, and all three outcomes handled
   including permanently denied.
8. **Offline behaviour**: useful screens, cached data marked with its age, and writes queued and sent
   on reconnection.
9. **Accessibility**: works at the largest system font, touch targets at least 44 points, labels on
   controls.
10. **Tested on a real device**, including one that is not new.

**What to submit**

1. The code and a README with build instructions, plus an installable build if possible.
2. The **screen map**, and a note on what changed during the build.
3. A **conditions report**, with evidence for each: killed while backgrounded, slow connection,
   fully offline, largest font, smallest screen, permission refused and permanently refused.
4. A **recording** of the app under a throttled connection and offline.
5. The **device matrix** you tested on, with OS versions.
6. A **short write-up** (400–500 words): the condition that broke most of your assumptions; what you
   had to restructure because of the lifecycle; what you would change before releasing this.

**Constraints**

- A real API, not hardcoded data.
- No token or personal data outside secure or cleared storage.
- No screen that blocks on an optional permission.

**Where the marks are.** The conditions report. Screens that work on a fast simulator are the easy
half; an app that keeps somebody's work when the system kills it is the project.`,
      rubric: [
        {
          criterion: 'Structure and navigation',
          description: 'Screen map followed, navigation in one place, platform back behaviour correct everywhere, screens thin with logic in services.',
          maxPoints: 20,
        },
        {
          criterion: 'Network and offline',
          description: 'Five states on every fetching screen, offline distinguished, timeouts set, cached data marked with age, writes queued and sent on reconnect.',
          maxPoints: 25,
        },
        {
          criterion: 'Lifecycle and persistence',
          description: 'State saved on background and restored; draft survives being killed; tokens in secure storage; personal data cleared on logout.',
          maxPoints: 25,
        },
        {
          criterion: 'Device reality',
          description: 'Usable at the largest font on the smallest supported screen; targets 44 points; virtualised lists at 1,000 rows; permission refusal handled in all forms.',
          maxPoints: 20,
        },
        {
          criterion: 'Evidence and write-up',
          description: 'Conditions report with evidence per condition, device matrix, and an honest account of what the lifecycle forced you to restructure.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },
];
