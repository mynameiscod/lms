/**
 * T_MOBILE_APPS — nine units. DIRECTION: MOBILE.
 *
 * ── WHY THIS TOPIC EXISTS ─────────────────────────────────────────────────────────────────
 *
 * Mobile was a direction with no units of its own: a student who chose it got the universal
 * curriculum only. This is the first thing that is theirs.
 *
 * ── THE LINE THIS TOPIC HOLDS ─────────────────────────────────────────────────────────────
 *
 * A first-year cannot usefully install two platform SDKs, and a course that spends its first week
 * on emulators teaches emulators. So the hands-on work is Flutter in DartPad, in the browser, with
 * nothing to install — while the concepts (screens as trees, layout under constraints, state, the
 * lifecycle, loading and error states) are the ones every mobile platform shares. A student who
 * later moves to Kotlin or Swift keeps all of it.
 *
 * Seeded as DRAFT. Nothing here reaches a student until an admin reviews and publishes it.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const MOBILE_APPS_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T_MOBILE_APPS_WHAT_MAKES_APPS_DIFFERENT',
    notes: `A mobile app and a web page can show the same thing. What differs is everything around
the screen — and those differences decide how an app has to be built.

**The constraints a phone adds:**

| Constraint | What it means for the app |
|---|---|
| Small screen, held in one hand | One main task per screen; controls within thumb reach |
| Touch, not a mouse | Tap targets about 48 pixels; no hover; gestures |
| Interruptions | A call or a notification can pause the app at any moment |
| The OS is in charge | It can stop a background app to free memory, without asking |
| Networks come and go | A lift, a tunnel or a train turns every request into a maybe |
| Battery and data cost money | Polling a server every second is a real cost to the user |
| Permissions | Camera, location and contacts need the user's explicit yes |
| Store review | Updates go through Google Play or the App Store, not instantly |

**The one that surprises beginners most: the app is not always running.** On a laptop a tab
stays open until you close it. On a phone, switching to another app can pause yours, and the OS
may kill it later to save memory. When the user comes back, the app must restore where they were
— or they lose their half-typed message.

**The second one: assume the network is bad.** A web page on campus Wi-Fi hides this. A phone on
mobile data does not. Every screen that loads data needs three states, not one:

1. **Loading** — something is happening
2. **Loaded** — the data
3. **Failed** — what went wrong, and a way to retry

An app that shows a blank screen while loading, or freezes when the request fails, feels broken
even when the code is "correct".

**Why this topic starts here and not with code:** almost every beginner app works perfectly on
the developer's phone, on fast Wi-Fi, used once from start to finish. Real use is interrupted,
offline and impatient. Designing for that from the first screen is what separates an app people
keep from one they uninstall.`,
    mcqs: [
      mcq('A user switches to WhatsApp mid-way through filling a form in your app. The OS may:',
        [['Pause the app and later kill it to free memory', true],
          ['Keep it running at full speed until reopened', false],
          ['Submit the form automatically before pausing', false],
          ['Refuse to switch until the form is finished', false]],
        'Which is why an app must save and restore what the user was doing rather than assume it keeps running.'),
      mcq('Which states does every screen that loads data need?',
        [['Loading, loaded and failed', true],
          ['Loaded only, if the code is correct', false],
          ['Online and offline, nothing more', false],
          ['Portrait and landscape layouts', false]],
        'Leaving out loading or failure produces a blank or frozen screen the first time the network is slow.'),
      mcq('Why are hover effects a poor way to reveal controls in a mobile app?',
        [['Touch screens have no hover, so the control is never revealed', true],
          ['Hover effects use far more battery than taps do', false],
          ['App stores reject apps that include hover effects', false],
          ['Hover only works when the phone is in landscape', false]],
        'Anything that depends on a pointer resting over something simply does not exist on touch.'),
      mcq('An app refreshes its data from the server every second. The main cost falls on:',
        [["The user's battery and mobile data", true],
          ['The app store, which limits requests', false],
          ["The phone's screen resolution", false],
          ['Nothing, if the phone is on Wi-Fi', false]],
        'Frequent background work drains battery and data the user pays for, which is why apps fetch on demand.'),
    ],
    checkpoint: [
      mcq('An app works perfectly on the developer\'s phone on fast Wi-Fi. What has not been tested?',
        [['Slow or absent networks, and being interrupted mid-task', true],
          ['Whether the app compiles on a second computer', false],
          ['Whether the source code is formatted consistently', false],
          ['Whether the icon looks good on the home screen', false]],
        'Real use is interrupted and offline far more than a developer\'s desk suggests.'),
      mcq('A camera feature needs permission. The app should ask:',
        [['When the user first uses the feature, explaining why', true],
          ['At first launch, for every permission it might need', false],
          ['Never, because installing the app grants permission', false],
          ['Only after the user has reported a problem with it', false]],
        'Asking in context, with a reason, is both what the platforms expect and what users actually accept.'),
    ],
  },
  {
    unitCode: 'T_MOBILE_APPS_NATIVE_OR_CROSS_PLATFORM',
    notes: `There are three main ways to build an app for phones, and each trades something away.

**1. Native** — a separate app per platform, in the platform's own language.

- Android: **Kotlin** (Java before it), Android Studio
- iOS: **Swift**, Xcode — which runs only on a Mac

Best performance and first access to every new platform feature. The cost: two codebases, two
skill sets, and every feature built twice.

**2. Cross-platform** — one codebase that produces both apps.

- **Flutter** (Dart): draws every pixel itself, so the app looks the same everywhere
- **React Native** (JavaScript/TypeScript): drives the platform's own native controls

One team and one codebase for most of the work. The cost: an extra layer between you and the
platform, occasional native code for unusual features, and a wait when the platform adds
something new.

**3. Web app / PWA** — a website that behaves like an app, installable from the browser.

No store review and instant updates. The cost: limited access to device features, weaker offline
support on some phones, and less of an "app" feel.

**Choosing, honestly:**

| Situation | Reasonable choice |
|---|---|
| A startup needs both platforms with a small team | Cross-platform |
| The app is mostly forms and lists from a server | Cross-platform, or a PWA |
| Heavy camera, AR or audio processing | Native |
| It must match each platform's look exactly | Native, or React Native |
| No budget for store accounts, needs updates daily | PWA |

**What this topic uses and why.** Flutter in **DartPad** (dartpad.dev) — it runs in the browser,
so you can build real screens today without installing Android Studio or owning a Mac. The ideas
you learn — screens as trees of components, layout, state, navigation, loading data — carry over
directly to Kotlin, Swift and React Native. The syntax is the easy part to change later.

**A common beginner mistake** is choosing the technology first and the app second. The table
above goes the other way: what the app needs decides the approach.`,
    mcqs: [
      mcq('What is the main cost of building natively for both Android and iOS?',
        [['Two codebases, so every feature is built twice', true],
          ['Native apps cannot use the phone camera at all', false],
          ['Native apps cannot be published to app stores', false],
          ['Native apps run more slowly than web apps do', false]],
        'Native gives the best access and performance; the price is doing the work twice with two skill sets.'),
      mcq('Which is a cross-platform framework?',
        [['Flutter', true], ['Swift', false], ['Kotlin', false], ['Xcode', false]],
        'Swift and Kotlin are the native languages; Xcode is Apple\'s development environment.'),
      mcq('Why can iOS apps not be built on a Windows laptop in the normal way?',
        [['The iOS build tool, Xcode, runs only on macOS', true],
          ['Swift code cannot be typed on Windows keyboards', false],
          ['Apple forbids iOS apps written by students', false],
          ['iPhones cannot connect to Windows computers', false]],
        'Cross-platform tools still need a Mac for the final iOS build, which is a real planning constraint.'),
      mcq('A PWA is a good fit when:',
        [['Updates must ship instantly and device access is modest', true],
          ['The app needs augmented reality and heavy audio work', false],
          ['The app must look exactly native on each platform', false],
          ['The app must run with no network ever available', false]],
        'No store review means instant updates, at the cost of the deeper device access native apps get.'),
    ],
    checkpoint: [
      mcq('A two-person startup must launch on Android and iOS, mostly showing lists and forms. They should most likely use:',
        [['A cross-platform framework such as Flutter', true],
          ['Two native apps, one written in each language', false],
          ['A native Android app only, then wait for iOS', false],
          ['Assembly code, for the best possible speed', false]],
        'One codebase for a small team is exactly the trade cross-platform frameworks are designed for.'),
      mcq('What should decide the technology for a new app?',
        [['What the app needs from the device and the team', true],
          ['Whichever framework is most popular this year', false],
          ['The language the team finds easiest to type', false],
          ['Whichever option has the most tutorials online', false]],
        'Choosing the tool first and forcing the app to fit it is the most common expensive mistake.'),
    ],
  },
  {
    unitCode: 'T_MOBILE_APPS_WIDGETS',
    notes: `In Flutter — and, under different names, in SwiftUI, Jetpack Compose and React Native —
a screen is a **tree of small pieces**. In Flutter those pieces are called **widgets**.

Open **dartpad.dev**, choose the Flutter sample, and replace it with:

    import 'package:flutter/material.dart';

    void main() => runApp(const MyApp());

    class MyApp extends StatelessWidget {
      const MyApp({super.key});

      @override
      Widget build(BuildContext context) {
        return MaterialApp(
          home: Scaffold(
            appBar: AppBar(title: const Text('My first screen')),
            body: const Center(
              child: Text('Hello from Flutter'),
            ),
          ),
        );
      }
    }

Press **Run**. That is a real app screen.

**Read it as a tree:**

    MaterialApp
    └── Scaffold
        ├── AppBar
        │   └── Text('My first screen')
        └── Center
            └── Text('Hello from Flutter')

Every widget has a job. \`MaterialApp\` sets up the app; \`Scaffold\` gives the standard screen
structure; \`AppBar\` is the top bar; \`Center\` positions its child; \`Text\` shows text.

**\`build\` describes, it does not draw.** The \`build\` method returns a description of what the
screen should look like. Flutter compares descriptions and updates the pixels itself. You never
say "move this label 10 pixels"; you describe the new screen and the framework works out the
change. This **declarative** style is the shared idea across all modern mobile toolkits.

**Two kinds of widget:**

- **StatelessWidget** — depends only on what it is given. A label, an icon, a card.
- **StatefulWidget** — holds something that can change, such as a counter or a checkbox. The
  State unit covers these.

**\`child\` and \`children\`.** A widget that holds one thing takes \`child\`; one that holds several
(\`Column\`, \`Row\`, \`ListView\`) takes \`children: [...]\`. Most "why is this red?" errors at the
start are one of these used where the other belongs.

**\`const\`** in front of a widget tells Flutter it never changes, so it can skip rebuilding it.
Leave it out and the app still works; add it where the analyzer suggests.`,
    mcqs: [
      mcq('In Flutter, what is the `build` method for?',
        [['Describing what the screen should look like', true],
          ['Compiling the app into a file for the store', false],
          ['Drawing each pixel of the screen by hand', false],
          ['Downloading the widgets the screen will use', false]],
        'You describe; the framework works out what changed and updates the pixels — the declarative model.'),
      mcq('A widget that shows several items stacked vertically takes:',
        [['children, a list of widgets', true], ['child, a single widget', false],
          ['items, a list of strings', false], ['body, a single widget', false]],
        'Column, Row and ListView take children; single-slot widgets such as Center take child.'),
      mcq('Which widget provides the standard screen structure with an app bar and a body?',
        [['Scaffold', true], ['Center', false], ['Text', false], ['Container', false]],
        'Scaffold is the frame of a typical screen: app bar, body, and optional floating button or drawer.'),
      mcq('A widget that only displays what it is given, and never changes by itself, should be:',
        [['A StatelessWidget', true], ['A StatefulWidget', false], ['A MaterialApp', false], ['An AppBar', false]],
        'Stateful widgets exist for things that change over time. A plain label does not need one.'),
    ],
    checkpoint: [
      mcq('What does it mean that modern mobile UI toolkits are declarative?',
        [['You describe the screen and the framework applies the changes', true],
          ['Every screen must be declared in a separate XML file', false],
          ['You must declare the type of every variable you use', false],
          ['Screens are drawn once at launch and never updated', false]],
        'Flutter, SwiftUI, Jetpack Compose and React Native all share this model, which is why the idea transfers.'),
      mcq('In the tree MaterialApp → Scaffold → Center → Text, which widget decides where the text sits?',
        [['Center', true], ['Text', false], ['Scaffold', false], ['MaterialApp', false]],
        'Position comes from the parent layout widget; the Text widget only knows what to show.'),
    ],
  },
  {
    unitCode: 'T_MOBILE_APPS_LAYOUT',
    notes: `Phones range from small to very large, and can rotate. Layout is how a screen stays
usable across all of them — and the moment it fails, Flutter says so loudly.

**The three layout widgets you will use constantly:**

    Column(children: [...])   // top to bottom
    Row(children: [...])      // left to right
    ListView(children: [...]) // top to bottom, and scrolls

**Spacing:**

    Padding(
      padding: const EdgeInsets.all(16),
      child: Text('Breathing room'),
    )

    const SizedBox(height: 12)   // a fixed gap between items

**Sharing space in a Row:**

    Row(children: [
      const Icon(Icons.book),
      Expanded(child: Text(longTitle)),   // takes the remaining width
      const Icon(Icons.chevron_right),
    ])

Without \`Expanded\`, a long title in a Row tries to be as wide as its text — wider than the
screen — and you get Flutter's **yellow-and-black overflow stripes** with a message like
*"A RenderFlex overflowed by 84 pixels on the right."* That message is precise: which widget,
which side, by how much.

**Content taller than the screen** needs to scroll. A \`Column\` does not scroll; a \`ListView\`
does. A long form in a \`Column\` overflows at the bottom on small phones — and looks fine on the
large phone you tested on.

**How layout works underneath, in one sentence:** constraints go down, sizes go up, and the
parent sets the position. A parent tells each child how big it may be; the child picks a size
within that; the parent places it. Most layout errors are a child asking for more than its
constraints allow.

**Test on the extremes.** DartPad lets you resize the preview. Check:

- The narrowest phone width (about 320 pixels)
- A very long name, title or translated label
- Large system font — many users set it, and your layout must survive it

**Touch targets:** keep tappable things at least about 48 by 48 pixels, with space between
them. A layout that fits by shrinking buttons below that is a layout people mis-tap.`,
    mcqs: [
      mcq('Flutter shows yellow-and-black stripes and "overflowed by 84 pixels on the right". This means:',
        [['A child in a Row is wider than the space available', true],
          ['The app has run out of memory on the device', false],
          ['An image failed to download from the network', false],
          ['The screen has been rotated into landscape', false]],
        'The message names the direction and the amount, which usually points straight at the widget to fix.'),
      mcq('How do you let a long title in a Row take only the remaining width?',
        [['Wrap it in Expanded', true], ['Wrap it in Center', false],
          ['Put it in a Column', false], ['Give it a larger font', false]],
        'Expanded tells the Row to give that child whatever width is left after the others.'),
      mcq('A long form fits on your phone but overflows on a small one. The fix is usually:',
        [['Put it in a scrolling widget such as ListView', true],
          ['Use a smaller font size on every field', false],
          ['Remove fields until it fits on the small phone', false],
          ['Lock the app so it only runs in portrait', false]],
        'Column does not scroll. Content that can be taller than the screen belongs in something that does.'),
      mcq('The summary of how Flutter layout works is:',
        [['Constraints go down, sizes go up, the parent sets position', true],
          ['Every widget chooses its own size and position freely', false],
          ['The screen is divided into a fixed grid of cells', false],
          ['Sizes are always given in centimetres for accuracy', false]],
        'Most layout errors are a child asking for more than the constraints its parent gave it.'),
    ],
    checkpoint: [
      mcq('Which screen size should you always test a layout on?',
        [['The narrowest phone width, with large system font', true],
          ['Only the phone that you personally own and use', false],
          ['A tablet, since that is the largest possible screen', false],
          ['The DartPad default size, since it is the standard', false]],
        'Layouts break at the small, crowded extreme, and many real users run large system fonts.'),
      mcq('About how large should a tap target be?',
        [['Around 48 by 48 pixels', true], ['Around 10 by 10 pixels', false],
          ['Exactly the size of its text label', false], ['As large as the whole screen', false]],
        'Smaller targets packed closely are where mis-taps come from, especially on the move.'),
    ],
  },
  {
    unitCode: 'T_MOBILE_APPS_STATE',
    notes: `**State** is anything a screen remembers that can change: a counter, whether a box is
ticked, the text typed so far, the list loaded from a server.

The classic first surprise:

    class CounterPage extends StatefulWidget {
      const CounterPage({super.key});
      @override
      State<CounterPage> createState() => _CounterPageState();
    }

    class _CounterPageState extends State<CounterPage> {
      int count = 0;

      @override
      Widget build(BuildContext context) {
        return Scaffold(
          body: Center(child: Text('Pressed $count times')),
          floatingActionButton: FloatingActionButton(
            onPressed: () {
              setState(() {
                count = count + 1;
              });
            },
            child: const Icon(Icons.add),
          ),
        );
      }
    }

**Remove \`setState\` and just write \`count = count + 1;\` — the number on screen never changes.**
The variable does change. But Flutter does not know it should rebuild, so it keeps showing the old
description. \`setState\` means: "I changed something the screen depends on — build again."

This is the same idea in every declarative toolkit: React's \`useState\`, SwiftUI's \`@State\`,
Compose's \`remember { mutableStateOf() }\`. Change state through the framework, and the screen
follows.

**Where state should live.** Keep it in the lowest widget that needs it. If two sibling widgets
need the same value, move it up to their shared parent and pass it down. State that is copied into
two places drifts apart — a cart badge saying 3 while the cart screen shows 2.

**State is lost more easily than on the web.** If the OS kills the app in the background, a
simple \`int count\` is gone. Anything the user would be upset to lose — a draft message, a form
half filled — needs saving somewhere that survives, such as local storage on the device.

**Do not call \`setState\` inside \`build\`.** \`build\` describes the screen; changing state there
asks for another build, which changes state again — an endless loop. State changes belong in
responses to events: a tap, a timer, data arriving.`,
    mcqs: [
      mcq('A counter variable increases, but the number on screen does not change. The likely cause is:',
        [['The change was not made inside setState', true],
          ['The variable should have been declared const', false],
          ['Text widgets cannot display numbers directly', false],
          ['The phone screen needs to be refreshed by hand', false]],
        'The value changed; the framework was never told to rebuild, so it kept the old description.'),
      mcq('Two sibling widgets both need the number of items in a cart. Where should that state live?',
        [['In their shared parent, passed down to both', true],
          ['In each sibling, copied and kept in step', false],
          ['In a global variable anywhere in the file', false],
          ['In the widget that happens to be built first', false]],
        'One source of truth. Copies drift apart, and the user sees two different numbers.'),
      mcq('Why is calling setState inside build a mistake?',
        [['It triggers another build, creating an endless loop', true],
          ['build is not allowed to read any variables', false],
          ['setState only works inside the main function', false],
          ['It makes the app ignore all taps from the user', false]],
        'build only describes. State changes belong in reactions to events: taps, timers, data arriving.'),
      mcq("Which is React's equivalent of Flutter's setState idea?",
        [['useState', true], ['useStyle', false], ['setLayout', false], ['renderState', false]],
        'Every declarative toolkit has the same concept: change state through the framework and the view follows.'),
    ],
    checkpoint: [
      mcq('A user half-writes a long message; the OS kills the app in the background. To keep the draft, the app should:',
        [['Save it somewhere that survives, such as device storage', true],
          ['Keep it in a normal variable inside the widget state', false],
          ['Ask the operating system not to stop the app again', false],
          ['Send it immediately, even though it was not finished', false]],
        'In-memory state dies with the process. Losing typed work is one of the fastest ways to lose a user.'),
      mcq('What does calling setState tell Flutter?',
        [['Something the screen depends on changed, so build again', true],
          ['Save the current state of the app to the device storage', false],
          ['Send the current state of the screen to the server', false],
          ['Reset every variable in the widget to its first value', false]],
        'It is a signal to rebuild, not a storage or network operation.'),
    ],
  },
  {
    unitCode: 'T_MOBILE_APPS_NAVIGATION_AND_DATA',
    notes: `Real apps have more than one screen, and most show data from a server. This unit puts
the two together: a list screen that loads data, and a detail screen it opens.

**Opening a new screen:**

    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => DetailPage(item: item)),
    );

The new screen slides on top; the back button or gesture pops it off. Data for the new screen is
passed through its constructor — \`item\` above — rather than through global variables.

**Loading data with the three states.** In Flutter a \`FutureBuilder\` rebuilds as a request
progresses:

    FutureBuilder<List<dynamic>>(
      future: loadItems(),
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('Could not load. Check your connection.'));
        }
        final items = snapshot.data!;
        if (items.isEmpty) {
          return const Center(child: Text('Nothing here yet.'));
        }
        return ListView(children: [
          for (final item in items) ListTile(title: Text(item['title'])),
        ]);
      },
    )

That is **four** outcomes, not one: loading, failed, empty, and data. Beginners write the last
one and discover the other three from user reviews.

**Where the data comes from.** \`loadItems\` sends an HTTP GET and decodes the JSON — the same
request/response cycle as any backend. The app is a client: it must not trust what it has, and
the server must not trust what the app sends.

**Do not start the request inside \`build\` every time.** \`build\` can run many times a second
during animations; creating the request there fires it again on each rebuild. Create it once —
for example in \`initState\` — and hand that one future to the builder.

**A retry button on the error state** turns "the app is broken" into "the connection dropped,
try again", which is the truth most of the time.

**Never show raw errors to users.** "SocketException: Failed host lookup" belongs in the log.
The screen should say what happened in plain words and what to do about it.`,
    mcqs: [
      mcq('How should a detail screen receive the item it shows?',
        [['Through its constructor when it is pushed', true],
          ['Through a global variable set before navigating', false],
          ['By reading it from the previous screen\'s widgets', false],
          ['By asking the user to type the item in again', false]],
        'Explicit inputs keep each screen understandable and testable; globals make screens depend on each other invisibly.'),
      mcq('How many outcomes should a screen that loads a list handle?',
        [['Four: loading, failed, empty and data', true],
          ['One: the data, once it has arrived', false],
          ['Two: online and offline', false],
          ['Three: portrait, landscape and tablet', false]],
        'Empty is the one most often forgotten: a successful request that returns nothing is not an error.'),
      mcq('Why should a request not be created directly inside build?',
        [['build can run many times, firing the request repeatedly', true],
          ['build is not allowed to use the network at all', false],
          ['Requests inside build are always sent as POST', false],
          ['build runs before the app has any internet access', false]],
        'Create the request once — for instance in initState — and pass that single future to the builder.'),
      mcq('The request fails with "SocketException: Failed host lookup". The screen should show:',
        [['A plain message about the connection and a retry button', true],
          ['The exact exception text so the user can report it', false],
          ['Nothing at all, and wait for the network to return', false],
          ['A crash screen, since the data could not be loaded', false]],
        'Technical detail goes to the log; the user needs to know what happened and what they can do.'),
    ],
    checkpoint: [
      mcq('A list request succeeds but returns zero items. The screen should show:',
        [['An empty-state message such as "Nothing here yet"', true],
          ['The error message, because no data was returned', false],
          ['A loading spinner until at least one item arrives', false],
          ['A blank screen, since there is nothing to display', false]],
        'Empty is a successful outcome that needs its own message, distinct from failure.'),
      mcq('What happens when the user presses back on a screen opened with Navigator.push?',
        [['It is popped off, returning to the screen beneath it', true],
          ['The whole app closes and returns to the home screen', false],
          ['The same screen reloads its data from the server', false],
          ['Nothing, unless a back button was added by hand', false]],
        'push places a screen on a stack; back pops it, revealing the previous one exactly as it was.'),
    ],
  },
  {
    unitCode: 'T_MOBILE_APPS_DEBUGGING',
    notes: `Flutter is unusually direct about what is wrong. Most debugging is reading what it
already told you, precisely.

**The errors you will meet first, and what they mean:**

| What you see | What it means | Usual fix |
|---|---|---|
| Yellow-and-black stripes, "overflowed by N pixels" | A child is bigger than its space | Expanded, scrolling, or smaller content |
| Red screen, "Null check operator used on a null value" | \`!\` was used on something that was null | Handle the null case, often the loading state |
| Number changes in code, not on screen | State changed outside \`setState\` | Change it inside \`setState\` |
| List shows old data after an edit | The list was copied, and the copy changed | Keep one source of truth |
| Request fires again and again | The future is created inside \`build\` | Create it once, outside \`build\` |
| "Vertical viewport was given unbounded height" | A ListView inside a Column with no size | Wrap it in Expanded |

**Read the whole error, not the first line.** Flutter's messages often include the widget that
failed and the path to it through the tree. "The relevant error-causing widget was: Row" plus a
file and line number is nearly the answer.

**The \`!\` operator is a promise.** \`snapshot.data!\` says "I promise this is not null". During
loading it *is* null, so the promise breaks and the screen turns red. The fix is to check the
state first, not to add more \`!\`.

**Print what you have.** \`print(items.length)\` or \`debugPrint(snapshot.connectionState.toString())\`
at the top of \`build\` settles "is the data what I think?" quickly. The output appears in
DartPad's console.

**Change one thing, run, look.** Hot reload makes each attempt take a second, which is exactly
why guessing several fixes at once is a waste: you never learn which one worked.

**Test the unhappy paths deliberately.** Turn the network off, return an empty list, feed a title
two hundred characters long. The bugs users report live there, not in the case you tried first.`,
    mcqs: [
      mcq('"Null check operator used on a null value" usually comes from:',
        [['Using ! on data that is still null, often while loading', true],
          ['Declaring a variable without giving it a type', false],
          ['Using a Row where a Column was intended', false],
          ['Running the app in DartPad instead of a phone', false]],
        'The ! promised a value that was not there yet. Handle the loading state instead of promising harder.'),
      mcq('"Vertical viewport was given unbounded height" appears for a ListView inside a Column. The fix is:',
        [['Wrap the ListView in Expanded', true],
          ['Replace the Column with a Row', false],
          ['Give the ListView a larger font', false],
          ['Remove every item from the list', false]],
        'A scrolling list needs a bounded height; Expanded gives it the remaining space in the Column.'),
      mcq('Why is changing several things at once a poor debugging strategy?',
        [['You cannot tell which change fixed or broke it', true],
          ['Flutter only allows one change per hot reload', false],
          ['DartPad resets the code after two changes', false],
          ['It makes the app larger when it is published', false]],
        'With hot reload each experiment costs a second; make each one teach you something.'),
      mcq('Which unhappy path is worth testing deliberately?',
        [['The network turned off while a screen loads', true],
          ['The app opened on a fully charged phone', false],
          ['The same happy path run a second time', false],
          ['The app icon shown at a different size', false]],
        'Bugs users report cluster in the cases developers do not try first.'),
    ],
    checkpoint: [
      mcq('A Flutter error names "The relevant error-causing widget was: Row" with a file and line. You should:',
        [['Go to that Row first, since the error points at it', true],
          ['Restart the computer and try running it again', false],
          ['Delete the Row and rebuild the screen from scratch', false],
          ['Ignore it, because overflow errors are cosmetic', false]],
        'Flutter\'s messages are specific. Reading them fully is usually most of the fix.'),
      mcq('An edited item still shows its old title in the list. The likely cause is:',
        [['The list and the edit are working on two separate copies', true],
          ['The ListView is limited to showing titles it saw first', false],
          ['The edit was saved in capitals, so it did not match', false],
          ['Titles in Flutter cannot be changed after first display', false]],
        'Two copies of the same state drift apart. Keep one source of truth and rebuild from it.'),
    ],
  },
  {
    unitCode: 'T_MOBILE_APPS_PRACTICE',
    notes: `No new ideas. Build small screens in DartPad until the four-state habit — loading,
failed, empty, data — is automatic.

**Build each of these:**

1. **Profile card** — photo placeholder, name, a bio of any length, two buttons in a row.
   Test with a one-word name and a sixty-character one.
2. **Tip calculator** — bill amount, tip slider, split between N people. State updates live.
3. **Checklist** — add items, tick them off, count remaining in the app bar.
4. **Search list** — a list of 50 items with a search box that filters as you type; an empty
   state for "no matches".
5. **Two screens** — a list of courses; tapping one opens a detail screen with its description.
6. **Loaded list** — fetch JSON from a public test API such as jsonplaceholder.typicode.com/posts,
   with all four states and a retry button.

**Before calling any screen done:**

| Check | Pass when |
|---|---|
| Narrowest width (about 320 px) | Nothing overflows |
| Very long text | It wraps or truncates with an ellipsis, deliberately |
| Empty data | A message, not a blank screen |
| Slow data | A loading indicator |
| Failed request | A plain message and a retry |
| Back navigation | Returns to the previous screen as it was |
| Tap targets | About 48 px, not crowded together |

**Save each exercise** as a DartPad share link or a file. Screens you have already solved are
the parts you will reuse in the project.

**Watch for the two slips practice exposes most:** changing state outside \`setState\`, and a
\`ListView\` inside a \`Column\` without \`Expanded\`.`,
    mcqs: [
      mcq('A search box filters a list and nothing matches. The screen should show:',
        [['A message such as "No matches for that search"', true],
          ['The full list again, ignoring the search text', false],
          ['An error dialog asking the user to try again', false],
          ['A loading spinner until a match is typed in', false]],
        'No results is a normal outcome and deserves its own clear message.'),
      mcq('A tip calculator should update the total:',
        [['As the slider moves, through setState', true],
          ['Only after the app has been restarted', false],
          ['Only when a separate refresh button is tapped', false],
          ['Once a minute, on a timer in the background', false]],
        'Live feedback is the point of state: change the value through the framework and the screen follows.'),
      mcq('A sixty-character name breaks a profile card layout. A good fix is:',
        [['Let it wrap, or truncate it with an ellipsis deliberately', true],
          ['Limit every user to names of ten characters or fewer', false],
          ['Reduce the font until the longest name fits the card', false],
          ['Hide the name whenever it is longer than the card', false]],
        'Real names are long. The layout adapts to data; the data is not cut to fit the layout.'),
      mcq('Which public resource is useful for practising fetching JSON?',
        [['A test API such as jsonplaceholder', true], ['The Play Store', false],
          ['The phone\'s contacts', false], ['DartPad\'s console', false]],
        'A free fake API gives realistic JSON without having to build a backend first.'),
      mcq('A checklist shows "3 remaining" in the app bar but only two unticked items. The likely cause is:',
        [['The count is stored separately from the list and drifted', true],
          ['App bars cannot display numbers accurately', false],
          ['The list needs to be sorted before counting', false],
          ['Flutter counts ticked items as remaining ones', false]],
        'Derive the count from the list each build rather than keeping a second copy that can disagree.'),
    ],
    checkpoint: [
      mcq('Which check most often finds a layout bug that looked fine during development?',
        [['Running the screen at the narrowest phone width', true],
          ['Running the screen on the widest desktop monitor', false],
          ['Running the screen a second time in the same size', false],
          ['Changing the colour of the app bar to test it', false]],
        'Development screens are usually roomy; small phones are where content stops fitting.'),
      mcq('A loaded list screen is complete when it handles:',
        [['Loading, failure with retry, empty, and data', true],
          ['Data, and nothing else if the API is reliable', false],
          ['Portrait and landscape, and nothing else', false],
          ['A spinner, and then whatever the API returns', false]],
        'The four-state habit is the whole point of this practice set.'),
    ],
  },
  {
    unitCode: 'T_MOBILE_APPS_MINI_PROJECT',
    notes: `One small app with two screens, fed by real data, that behaves when the network does
not.

**Why two screens and real data.** A single screen with hard-coded content hides everything that
makes mobile development hard. Two screens force navigation and passing data; a real request
forces loading, failure and empty states. Together they are the smallest honest app.

**What "behaves" means:**

- A loading indicator while data arrives
- A plain message and a retry button when it fails
- An empty state when there is nothing
- No overflow at the narrowest phone width, or with long text
- Back navigation returns the user exactly where they were

**Build it in this order:**

1. **Sketch both screens on paper**, including the loading, error and empty versions.
2. **The list screen with hard-coded data.** Get the layout right first.
3. **The detail screen**, opened with the item passed in.
4. **Replace the hard-coded data with a request**, and add all four states.
5. **Break it on purpose**: wrong URL, empty response, long titles, narrow width.

**Resist adding screens.** A two-screen app where every state is handled beats a six-screen app
that shows a red error the first time the network drops.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — A Two-Screen App',
      description: 'Build a two-screen Flutter app in DartPad that loads real data and handles loading, failure, empty and long content. Assessed on how it behaves when things go wrong.',
      instructions: `**The brief**

Build ONE of these, or something of comparable scope:

- **Posts reader** — a list of posts from jsonplaceholder.typicode.com/posts; tapping one shows
  its full body and author id
- **Country explorer** — a list of countries from a public countries API; a detail screen with
  capital, population and region
- **Course catalogue** — a list of courses from a JSON file you host (for example as a GitHub
  gist); a detail screen with duration and topics

**Requirements**

1. **Two screens**: a list and a detail screen, with the item passed through the constructor.
2. **Data loaded over HTTP** and decoded from JSON.
3. **All four states** on the list screen: loading, failed (with a retry button), empty, data.
4. **No overflow** at the narrowest width (about 320 px), including with very long text.
5. **State changed only through setState** (or the framework's equivalent).
6. **The request is created once**, not inside build.
7. **Plain-language error messages** — no raw exceptions on screen.
8. **Tap targets** of about 48 px.

**What to submit**

1. A DartPad share link (or the source files) for the working app.
2. **Screenshots** of each state: loading, failed, empty, data, detail — at the narrowest width.
3. A **test table** with at least these rows, and what you observed:

   | Case | Expected | Observed |
   |---|---|---|
   | Normal load | | |
   | Wrong URL | | |
   | Empty response | | |
   | Very long title | | |
   | Narrowest width | | |
   | Retry after failure | | |
   | Back from detail | | |

4. A **short write-up** (250–350 words): why you chose this data source; one bug you found
   by breaking the app on purpose and how you fixed it; one thing you would do differently on
   a real phone.

**Constraints**

- Flutter only; no state-management packages.
- No hard-coded data in the final version.
- No red error screen reachable from any row of your test table.

**Where the marks are.** The states and the test table. A plain-looking app that handles every
row beats a polished one that breaks the first time the network does.`,
      rubric: [
        {
          criterion: 'Structure and navigation',
          description: 'Two screens with data passed through the constructor; back returns to the list as it was; widget tree is readable.',
          maxPoints: 15,
        },
        {
          criterion: 'Data loading and states',
          description: 'Real HTTP request created once; loading, failed-with-retry, empty and data states all present and correct.',
          maxPoints: 30,
        },
        {
          criterion: 'Layout',
          description: 'No overflow at the narrowest width or with long text; long text wraps or truncates deliberately; adequate tap targets.',
          maxPoints: 20,
        },
        {
          criterion: 'State and error handling',
          description: 'State changed only through the framework; plain-language errors; no reachable red error screen.',
          maxPoints: 15,
        },
        {
          criterion: 'Test evidence and write-up',
          description: 'Screenshots of every state; test table completed with observed results; write-up explains a real bug found by breaking the app.',
          maxPoints: 20,
        },
      ],
      totalPoints: 100,
    },
  },
];
