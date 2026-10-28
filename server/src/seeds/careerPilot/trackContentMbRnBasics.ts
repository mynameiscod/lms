/**
 * Career-track content: React Native and Expo (MB_RN_BASICS), Mobile, batch MB1.
 *
 * What is different about React on a phone: how React Native turns components into native views (threads, the new
 * architecture, Hermes), creating and running an Expo app (Expo Go versus development builds, Fast Refresh, the
 * debugger), the core components, StyleSheet and Flexbox on a phone, FlatList and SectionList, and Android versus
 * iOS. It builds on React Fundamentals and React Hooks (components, props, state, effects, keys and memo are not
 * re-taught) and on the years' platform-neutral mobile lessons ("Layout for a Hand", "Screens, Navigation and the
 * Back Button", "What Is Draining the Battery", "Testing on Something Real"), which are referred to by title.
 *
 * One fictional app runs through the lessons: KiranaNow, a Bengaluru quick-commerce grocery app; the mini project is
 * a recipe browser. Component code was type-checked with TypeScript 6 against React Native 0.88 and Expo SDK 58
 * (strict mode, expo/tsconfig.base), and everything with behaviour (input, pressables, lists, back handling) was run
 * with jest-expo and @testing-library/react-native 13; every test result and tsc error quoted is real output. The
 * create-expo-app log is from a real run on the machine the notes were written on. Not run: no Android emulator,
 * iPhone, Android phone or Metro dev server was available, so running on a device, Expo Go, development builds, the
 * React Native DevTools window, LogBox screens and device-only errors are described from the React Native and Expo
 * documentation and are labelled as such. react-native-safe-area-context 5 was installed beside the tests and its
 * own jest mock used.
 *
 * Skills: REACT_NATIVE by default; checkpoint questions about phone-wide ideas (density, permissions, testing on
 * real devices) are attributed to MOBILE_APP_BASICS.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_MB_RN_BASICS_BUNDLES: PilotBundle[] = [
  /* ── HOW_RN_WORKS ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_RN_BASICS_HOW_RN_WORKS',
    notes: `KiranaNow delivers groceries in Bengaluru in fifteen minutes. Its web team already writes React; the founders
want an Android app first and an iPhone app soon after, without hiring two separate native teams. React Native is
the usual answer, and this lesson is about what it really does, because almost every bug and every performance
problem you will meet later makes sense only once you know where your code runs.

## Not a web page in a box

A React Native app is not a website inside a WebView. Your components describe native views, and React Native
creates the platform's real UI widgets for them:

| React Native | Android | iOS |
|---|---|---|
| View | ViewGroup | UIView |
| Text | TextView | UITextView / UILabel |
| Image | ImageView | UIImageView |
| TextInput | EditText | UITextField |
| ScrollView | ScrollView | UIScrollView |

So there is no DOM, no HTML, no CSS file and no browser. React itself is the same React you know: components,
props, state, hooks, keys and reconciliation work exactly as on the web. What changes is the **renderer**: on the
web, react-dom turns your tree into DOM nodes; here, React Native's renderer turns it into native views.

You can see this in a test. This row from KiranaNow's cart was rendered with @testing-library/react-native:

    function ProductRow({ name, price, onAdd }: Props) {
      return (
        <View style={{ flexDirection: 'row', padding: 12 }}>
          <Text style={{ flex: 1 }}>{name}</Text>
          <Text>₹{price}</Text>
          <Pressable accessibilityRole="button" onPress={onAdd}>
            <Text>Add</Text>
          </Pressable>
        </View>
      );
    }

Walking the rendered tree and printing each host component gave:

    platform in jest: ios
    host components: View > Text > Text > View > Text

Two things to notice. Only host components (the ones with a native view behind them) appear; ProductRow itself
is gone, just as a component disappears from the DOM on the web. And Pressable is not a native button: it is a
View with touch handling written in JavaScript. (The test environment pretends to be iOS by default; you can run
it as Android too, as the platform lesson does.)

## Two threads you must keep apart

A running app has several threads. Two matter every day:

- **The UI thread** (the platform's main thread) draws the screen and receives touches. Native scrolling, the
  keyboard and native animations live here.
- **The JavaScript thread** runs your bundle: React rendering, your event handlers, your fetch callbacks, your
  state updates.

A tap on "Add" travels like this: the UI thread receives the touch, the event goes to JavaScript, your onPress
calls setState, React re-renders and works out what changed, and the renderer applies the change to the native
views, which the UI thread then draws.

At 60 frames a second each frame has 16.7 ms; at 120 Hz, 8.3 ms. If the JavaScript thread is busy for 300 ms
(say, sorting and filtering 8,000 products on every keystroke), taps and JavaScript-driven animations wait for it.
A native ScrollView can keep scrolling because the UI thread is free, but nothing that needs JavaScript will
respond. "The app froze" in a React Native bug report usually means "the JavaScript thread was busy". You met the
frame budget in "What Is Draining the Battery"; this is the same budget, with two threads sharing the work.

## The new architecture: JSI, Fabric and TurboModules

Older React Native connected JavaScript and native code through "the bridge": every message was serialised to
JSON and sent asynchronously in batches. It worked, but large or frequent messages were slow and nothing could be
synchronous. The new architecture, on by default in current React Native and Expo, replaces it with three parts:

- **JSI (JavaScript Interface)**: a C++ API that lets JavaScript hold references to native (C++) objects and call
  their methods directly, without JSON serialisation.
- **Fabric**: the new renderer. It keeps the tree of views in C++, computes layout with Yoga (the Flexbox engine),
  can measure layout synchronously when needed, and supports React's concurrent features.
- **TurboModules**: the new way to expose native functionality (camera, storage, sensors) to JavaScript. They are
  loaded lazily, when first used, and their interface is typed through **Codegen**, which generates the native
  glue from a typed spec.

You will rarely call these directly. They matter because a library must support the new architecture to work in
a current app, because startup is faster when modules load lazily, and because interviewers ask about them.

## Hermes and the bundle

Your TypeScript is compiled and bundled by **Metro** (React Native's bundler) into one JavaScript bundle. **Hermes**
is the JavaScript engine React Native uses by default; it was built for mobile, and in release builds the bundle is
compiled ahead of time to Hermes bytecode, which helps startup time and memory on the budget Android phones many
of your users carry.

An app you ship is therefore two things: a **native binary** (Java/Kotlin and Objective-C/Swift code, the React
Native runtime, and any native modules) and a **JavaScript bundle** inside it. Changing JavaScript alone can, with
the right tooling, be shipped as an over-the-air update; changing native code needs a new store build. You will
use that distinction in the release topic.

## React Native, Flutter or native?

- **Native (Kotlin with Jetpack Compose, Swift with SwiftUI)**: full platform access and the best fit for apps that
  live on platform features (heavy camera or media work, complex background tasks, AR). Two codebases, two teams.
- **Flutter**: one Dart codebase; Flutter draws every pixel itself with its own engine instead of using the
  platform's widgets, which gives consistent visuals and its own widget set.
- **React Native**: one TypeScript codebase that renders real native views, shares skills (and often code such as
  validation and API clients) with a React web team, and can drop into native code when needed.

None is "the best". For a startup with a React web team that needs Android and iOS soon, React Native is a
reasonable, common choice; for a camera-heavy app, native may be. Be able to argue either way.

## What carries over from React on the web, and what does not

Carries over: components, props, state, hooks, context, effects, keys, memo, TypeScript, fetch, most pure
JavaScript libraries. Does not: div and span (View and Text instead), onClick (onPress), CSS files and the cascade
(style objects), window and document, browser localStorage, URLs in an address bar, hover. The next lessons take
these one at a time.`,
    workedExample: `**Scenario.** KiranaNow's testers report: "On the search screen, typing 'atta' feels stuck; the letters
appear late and the Add buttons ignore taps for a moment, but the product list still scrolls smoothly."

**Step 1: which thread is it?** Scrolling is smooth, so the UI thread is free: a native ScrollView (inside FlatList)
scrolls without JavaScript. Typing and taps need JavaScript (onChangeText, setState, onPress), and they are slow.
So the JavaScript thread is busy.

**Step 2: what is it doing?** The search box looks like this:

    const [query, setQuery] = useState('');
    const results = products                      // 8,000 items from the catalogue
      .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));

Every keystroke re-renders the screen, lower-cases 8,000 names twice over, and sorts the result on the JavaScript
thread, while the next keystroke and any tap wait in line.

**Step 3: fix the cause, not the symptom.**

- Sort once when the catalogue loads, not on every render.
- Store a lower-cased name with each product once, so filtering does not repeat that work.
- Wrap the filter in useMemo keyed on the query, so unrelated re-renders do not repeat it.
- If it is still heavy, pass the query through useDeferredValue so typing stays responsive while the list catches
  up, or search on the server.

**Step 4: measure, do not guess.** Profile with the React profiler in React Native DevTools, on a budget Android
phone rather than a flagship or the emulator on a fast laptop, which hide this kind of problem.

The lesson: "smooth scroll but slow taps" points at the JavaScript thread; a janky scroll with instant taps points
at the UI thread (too many views, huge images, heavy native work).`,
    mcqs: [
      mcq('A KiranaNow developer says "React Native just loads our React web app in a WebView". What is wrong with that?', [
        ['Components render as real native views such as TextView and UIView', true],
        ['React Native compiles JSX into Kotlin and Swift source before building', false],
        ['It uses a WebView only on Android and native views only on iPhones', false],
        ['It draws every pixel itself with its own engine, much as Flutter does', false],
      ], 'React Native\'s renderer creates platform widgets for host components like View and Text. JSX is not compiled to Kotlin or Swift (your JavaScript runs on an engine such as Hermes), both platforms use native views, and drawing every pixel with its own engine is what Flutter does, not React Native.'),
      mcq('In a test, a cart row built from View, two Texts and a Pressable showed host components "View > Text > Text > View > Text". What does the second View tell you?', [
        ['Pressable has no native button behind it; it renders a View with touch handling', true],
        ['The row was wrapped in a View by the testing library to make it measurable', false],
        ['React Native turns every Text that has a price in it into an extra layout View', false],
        ['The component ProductRow itself appears in the tree as a host View element', false],
      ], 'Pressable is implemented in JavaScript on top of a View, so the tree shows a View holding the "Add" Text. The testing library adds no wrapper, Text does not gain a View, and composite components such as ProductRow never appear among host components.'),
      mcq('Why does a TurboModule help a large app start faster than an old-style native module?', [
        ['It is loaded when JavaScript first uses it, not all at once at startup', true],
        ['It runs entirely on the UI thread, which is idle while the app is starting', false],
        ['It is compiled into the JavaScript bundle, so no native code needs loading', false],
        ['It skips Hermes and runs in the platform browser engine, which starts sooner', false],
      ], 'TurboModules are lazily initialised, so a module the first screen does not need costs nothing at launch. They are native code called through JSI, not code that lives on the UI thread or inside the bundle, and they have nothing to do with a browser engine.'),
    ],
    checkpoint: [
      mcq('KiranaNow\'s product list scrolls smoothly, but tapping "Add" responds half a second late while a search filter runs. Where is the bottleneck most likely?', [
        ['On the JavaScript thread, which handles the tap and is busy filtering', true],
        ['On the UI thread, which is too busy drawing to register the tap at all', false],
        ['In Yoga layout, which recalculates every row each time a key is pressed', false],
        ['In Hermes bytecode loading, which happens again after every keystroke', false],
      ], 'Smooth native scrolling shows the UI thread is free; the tap needs JavaScript to run onPress, and that thread is busy filtering. A busy UI thread would make scrolling janky too, layout is not the slow part here, and bytecode is loaded once, not per keystroke.'),
      mcq('What does JSI change compared with the old bridge?', [
        ['JavaScript can call native C++ objects directly instead of sending JSON messages', true],
        ['JavaScript now runs on the UI thread, so there is no longer any thread hop at all', false],
        ['Native views are now written as HTML and styled with standard CSS stylesheets', false],
        ['Every native module is bundled into JavaScript, so the app has no native code', false],
      ], 'JSI is a C++ interface that lets JavaScript hold references to native objects and call them without serialising messages to JSON. JavaScript still has its own thread, views are still native, and native modules remain native code reached through JSI.'),
      mcq('A team must choose a stack for a grocery app needing Android and iOS soon; the team writes React for the web. What is the strongest argument for React Native here?', [
        ['One TypeScript codebase with native views that reuses the team\'s React skills', true],
        ['It is the only cross-platform option that produces native apps for both stores', false],
        ['It needs no native code at all, so the app can never require a new store build', false],
        ['It draws its own widgets, so the app looks identical on every phone model', false],
      ], 'Reusing the team\'s React knowledge across two platforms with native UI is React Native\'s real advantage. Flutter also ships to both stores, native code changes still need store builds, and drawing its own widgets describes Flutter rather than React Native.'),
    ],
  },

  /* ── EXPO_SETUP ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_RN_BASICS_EXPO_SETUP',
    notes: `React Native's own documentation recommends starting new apps with a framework, and Expo is that framework:
a command-line tool, a set of native libraries (camera, notifications, secure storage, file system) that all work
together for one SDK version, a router, and cloud build and update services. This lesson gets KiranaNow's app
created and running, and shows how to find out what is wrong when it does not run.

## Creating the project

    npx create-expo-app@latest kirananow                          # default template: TypeScript and Expo Router
    npx create-expo-app@latest kirananow --template blank-typescript   # one App.tsx, nothing else

The default template includes Expo Router and example tabs; blank-typescript is better for learning because
every file in it is yours. This is the real end of a blank-typescript run on the machine these notes were written
on:

    Creating mb_env using the blank-typescript template.
    ✔ Downloaded and extracted project files.
    ✅ Your project is ready!
    To run your project, navigate to the directory and run one of the following npm commands.
    - npm run android
    - npm run ios # you need to use macOS to build the iOS project - use the Expo app if you need to do iOS development without a Mac
    - npm run web

What you get:

- **package.json**: "main" points to index.ts; scripts run "expo start".
- **index.ts**: registerRootComponent(App), which registers your root component with React Native and sets up
  the environment whether the app runs in Expo Go or a native build.
- **App.tsx**: your first screen.
- **app.json**: the app's configuration, read at build time: name, slug, icon, splash, orientation,
  userInterfaceStyle, android.package, ios.bundleIdentifier, permissions and plugins. Look at
  userInterfaceStyle now: the template ships "light", and that one line will matter in the dark mode lesson.
- **tsconfig.json**: extends expo/tsconfig.base and turns on strict mode.

Install libraries with **npx expo install**, not plain npm install. It picks the version of a library that matches
your Expo SDK (npx expo install expo-image react-native-safe-area-context), which avoids most "works on my machine"
version mismatches between native libraries.

## Starting the dev server

    npx expo start

This starts Metro, prints a QR code and waits. From its help text: -a opens on a connected Android device or
emulator, -c clears the bundler cache, --go launches in Expo Go, --dev-client launches your development build,
and --tunnel serves through a tunnel when the phone cannot reach your laptop over the local network (common on
college and office Wi-Fi that isolates devices). In the terminal: a opens Android, r reloads, m opens the developer
menu on the device, j opens the debugger.

## Expo Go versus a development build

**Expo Go** is a ready-made app from the Play Store and App Store. Scan the QR code and your JavaScript runs inside
it. It is the fastest way to start, and it needs no Android Studio. But Expo Go contains a fixed set of native
modules for one SDK version. You cannot add a library with its own native code that Expo Go does not include, and
your app's real configuration (its own icon, name, package and native settings) is not what you are running.

A **development build** is your own app, built in debug mode with the expo-dev-client library, which adds the
same developer tools. It contains exactly the native modules your project uses. Make one with:

    npx expo install expo-dev-client
    npx expo run:android                    # builds locally; needs Android Studio and the Android SDK
    eas build --profile development --platform android   # or build in the cloud with EAS

Install it once on your emulator or phone; after that, day-to-day JavaScript changes reload instantly, just as in
Expo Go. You only rebuild when native code or native configuration changes. Real projects move to a development
build early, usually the day they add a library Expo Go lacks; learning projects can stay in Expo Go longer.

## Emulator and real phone

- **Android emulator**: create a virtual device in Android Studio's Device Manager. Pick a smaller screen and a
  modest profile as well as a large one; the default flagship-sized device hides layout and speed problems.
- **Real Android phone**: install Expo Go or your development build, connect to the same network and scan the QR
  code, or connect by USB with USB debugging on (adb devices lists it).
- **iPhone**: Expo Go works on a real iPhone without a Mac. A development build for iOS needs either a Mac with
  Xcode or a cloud build with EAS.

You met the reasons in "Testing on Something Real": emulators on a fast laptop hide slowness, network trouble and
small-screen problems. Keep a budget Android phone on your desk.

## Fast Refresh

Save a component file and the change appears in a second or two, with state kept: a half-filled form stays filled.
If a file exports things other than React components, editing it re-runs that module and the files that import
it, so some state resets. A syntax error shows a red error screen; fix it and save, and the app recovers without a
reload. When the app gets into a strange state after many edits, a full reload (r) is the cheap first step.

## Debugging and logs

- **console.log** output appears in the terminal running Metro.
- **LogBox** shows warnings as notifications at the bottom of the screen and errors as a full red screen with the
  component stack. Read the first line and the first stack frame from your own code before anything else.
- **React Native DevTools** (press j) is the debugger for apps on Hermes: console, breakpoints in your source
  through source maps, the React component tree and the profiler. Check the React Native docs for the panels your
  version offers.
- **Native crashes** (the app closes with no red screen) are not in the JavaScript console. On Android, read them
  with adb logcat; often the cause is a native module that is missing from the build.

A last habit: when something is inexplicably broken after changing dependencies, stop Metro and run npx expo start
-c to clear its cache before you start changing code.`,
    workedExample: `**Scenario.** A KiranaNow developer adds a third-party barcode-scanning library to scan product barcodes
at the dark store, then opens the app in Expo Go. The screen goes red with an error saying a native module could
not be found. On the web this would be a missing npm package; here it is not.

**Step 1: read the error for what it says.** The JavaScript package is installed (the import resolved), but at
runtime the native half is not in the app. JavaScript asked for a native module by name and the binary did not
contain it.

**Step 2: ask which binary is running.** Expo Go. It contains Expo's own modules for this SDK and nothing else,
so a library with its own native code that Expo Go does not ship can never work inside it, however many times
you reinstall packages.

**Step 3: choose the fix.**

- First, check whether an Expo module covers the need: expo-camera can scan barcodes, and it is included in Expo
  Go. If it does the job, use it, and you stay in Expo Go for now.
- If you need the third-party library, move to a development build: npx expo install expo-dev-client, then
  npx expo run:android (local Android SDK) or eas build --profile development --platform android, install it,
  and start Metro with npx expo start --dev-client.

**Step 4: write it down for the team.** "From today we use a development build; install the APK from the link in
the README; rebuild only when native dependencies change." Everyone moves together, so nobody spends a morning
debugging Expo Go.

**What not to do:** reinstall node_modules, clear caches or downgrade React Native. None of those puts native code
into a binary that does not contain it.`,
    mcqs: [
      mcq('A developer installs a library with "npm install" and Metro starts warning that the version does not match the Expo SDK. What should they have run?', [
        ['npx expo install with the package name, which picks the SDK-compatible version', true],
        ['npm install with --force, which makes npm accept the newest version available', false],
        ['npx expo start -c, which rewrites package.json to the versions the SDK expects', false],
        ['npx create-expo-app again, then copy the source files into the new project', false],
      ], 'npx expo install chooses the version of a library that matches the project\'s Expo SDK. --force only silences npm\'s checks, clearing Metro\'s cache never edits package.json, and recreating the project is a large detour around one wrong command.'),
      mcq('The KiranaNow app runs in Expo Go on your phone at home, but on the college Wi-Fi the phone cannot connect to Metro. Which flag is meant for this?', [
        ['npx expo start --tunnel, which reaches the laptop through a tunnel', true],
        ['npx expo start --go, which makes Expo Go look for the laptop again', false],
        ['npx expo start --no-dev, which bundles the app in production mode', false],
        ['npx expo start -c, which clears the bundler cache and restarts Metro', false],
      ], 'Networks that isolate devices stop the phone reaching the laptop on the LAN; --tunnel routes the connection through a tunnel instead. --go only chooses Expo Go, --no-dev changes how the bundle is built, and clearing the cache does not change the network path.'),
      mcq('After editing a component, the half-filled address form on screen keeps what was typed. What made that possible?', [
        ['Fast Refresh, which swaps in the edited component and keeps its state', true],
        ['A full reload, which restores state from a snapshot taken when saving', false],
        ['Hermes, which stores component state on disk between JavaScript builds', false],
        ['Expo Go, which caches form values for any screen that has a TextInput', false],
      ], 'Fast Refresh replaces the changed component\'s code while keeping React state, so a form stays filled. A full reload starts the JavaScript again from scratch, Hermes does not persist component state, and Expo Go has no form cache.'),
    ],
    checkpoint: [
      mcq('KiranaNow needs a payments library that ships its own native Android and iOS code, which Expo Go does not include. What is the right setup?', [
        ['A development build with expo-dev-client, rebuilt when native code changes', true],
        ['Expo Go with the library added to app.json so that Expo Go downloads it', false],
        ['Expo Go after clearing Metro\'s cache, so the native code gets bundled again', false],
        ['A web build of the app, since native libraries also run inside the browser', false],
      ], 'Native code must be compiled into the binary, so the app needs its own development build containing the library. app.json cannot make Expo Go download native code, Metro bundles JavaScript only, and the web build is a different target that cannot use the native module.'),
      mcq('Which statement about Expo Go is accurate?', [
        ['It runs your JavaScript inside a prebuilt app with a fixed set of native modules', true],
        ['It compiles your app into its own APK on the phone, using your app.json icons', false],
        ['It is required for release builds, because the stores install apps through it', false],
        ['It only works on Android phones; iPhones always need a Mac to run any build', false],
      ], 'Expo Go is a ready-made host app that loads your bundle and includes Expo\'s modules for one SDK. It builds nothing on the phone, plays no part in store releases, and runs on real iPhones too; it is development builds for iOS that need a Mac or a cloud build.'),
      mcq('The app closes instantly on an Android phone with no red screen and nothing new in the Metro terminal. Where should you look first?', [
        ['adb logcat on the device, where native crashes are logged', true],
        ['The LogBox list of warnings at the bottom of the app screen', false],
        ['The browser console of the laptop that is running the server', false],
        ['The Fast Refresh history kept by Metro on the dev machine', false],
      ], 'A crash with no red screen happened in native code, and Android logs it to logcat. LogBox and the Metro terminal only show what JavaScript reports, there is no browser involved, and Fast Refresh keeps no crash history.'),
    ],
  },

  /* ── CORE_COMPONENTS ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_RN_BASICS_CORE_COMPONENTS',
    notes: `On the web you build pages from a hundred HTML elements. React Native gives you a small set of core
components and expects you to compose them. This lesson builds KiranaNow's phone-number login screen from them and
covers what has no web equivalent: touch feedback, the on-screen keyboard and the notch.

## View and Text

**View** is the box: layout, background, border, padding. It is the div of React Native, except that it cannot
hold text. **Text** is the only component that can show a string. Write a bare string inside a View and the app
fails on the device with "Text strings must be rendered within a <Text> component". Watch for the sneaky version,
a number from a && expression:

    <View>{count && <Text>{count} items</Text>}</View>   // count = 0 renders a bare "0"

Text styles are inherited only between nested Text components (a bold Text inside a Text), never from a View.
There is no cascade. numberOfLines={1} with ellipsizeMode truncates long product names, which you will need for
names like "Fortune Sunlite Refined Sunflower Oil, 1 L Pouch".

## Image

    <Image source={require('./assets/logo.png')} style={{ width: 96, height: 96 }} />
    <Image source={{ uri: product.imageUrl }} style={{ width: 64, height: 64 }} resizeMode="cover"
           accessibilityLabel={product.name} />

A local image (require) knows its own size. A **remote image does not**: without a width and height (or a width
plus aspectRatio) it renders at zero size and you see nothing, with no error. TypeScript does not catch this.
For product grids with many network images, Expo's expo-image component adds disk caching, placeholders and
smoother loading; the same sizing rule applies.

## Pressable: touch, with feedback

There is no onClick. **Pressable** gives you onPress, onLongPress, onPressIn and onPressOut, and a style function
that knows whether the finger is down:

    <Pressable
      onPress={() => onSubmit(phone)}
      disabled={!valid}
      hitSlop={8}
      android_ripple={{ color: '#00000022' }}
      style={({ pressed }) => [styles.button, !valid && styles.buttonOff, pressed && styles.buttonPressed]}
    >

Every tap needs visible feedback, or users tap again and order twice. hitSlop extends the touch area beyond the
visible box; aim for touch targets of about 48 dp on Android (44 pt in Apple's guidance), as you saw in "Layout
for a Hand". The **Button** component exists but cannot be styled much; most apps build their own button on
Pressable.

## TextInput and the keyboard

TextInput is controlled like a web input, but the props are different: value and **onChangeText** (which gives
you the string, not an event). The props that matter on a phone:

- **keyboardType**: "phone-pad", "number-pad", "decimal-pad", "email-address". A phone number field that opens
  the alphabet keyboard is a bug.
- **autoComplete** and **textContentType**: let Android and iOS offer autofill (one-time codes, phone numbers).
- **secureTextEntry** for passwords; **autoCapitalize="none"** for emails.
- **returnKeyType** and **onSubmitEditing**: what the keyboard's action key says and does.

On the web the keyboard is not your problem. On a phone it covers the bottom half of the screen, usually right
where your button is. **KeyboardAvoidingView** moves content out of its way (behavior="padding" is the usual
choice on iOS; Android resizes the window by default). In a ScrollView, set keyboardShouldPersistTaps="handled"
so a tap on a button while the keyboard is open presses the button instead of only closing the keyboard, and
call Keyboard.dismiss() when a flow is done.

## Safe areas

Phones have notches, camera cut-outs, rounded corners and gesture bars, and current Android versions draw apps
edge to edge, under the status bar. Use **SafeAreaView** (or the useSafeAreaInsets hook) from
react-native-safe-area-context (Expo's default template already includes it; add it with npx expo install
otherwise), and wrap the app once in SafeAreaProvider. React Native's own SafeAreaView is deprecated (current
React Native warns when you use it) and only ever handled iOS.

## The login screen

    export function toIndianMobile(raw: string): string {
      let d = raw.replace(/\\D/g, '');
      if (d.length > 10 && d.startsWith('91')) d = d.slice(2);
      else if (d.length > 10 && d.startsWith('0')) d = d.slice(1);
      return d.slice(0, 10);
    }

    export function PhoneLogin({ onSubmit }: Props) {
      const [phone, setPhone] = useState('');
      const valid = /^[6-9]\\d{9}$/.test(phone);
      return (
        <SafeAreaView style={styles.screen}>
          <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Image source={{ uri: LOGO_URL }} style={styles.logo} accessibilityLabel="KiranaNow logo" />
            <Text style={styles.title}>Enter your mobile number</Text>
            <TextInput
              value={phone}
              onChangeText={t => setPhone(toIndianMobile(t))}
              keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel"
              placeholder="10-digit mobile number" accessibilityLabel="Mobile number"
              returnKeyType="done" onSubmitEditing={() => valid && onSubmit(phone)}
              style={styles.input}
            />
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !valid }}
              disabled={!valid} onPress={() => onSubmit(phone)} hitSlop={8}
              style={({ pressed }) => [styles.button, !valid && styles.buttonOff, pressed && styles.buttonPressed]}>
              <Text style={styles.buttonText}>Get OTP</Text>
            </Pressable>
          </KeyboardAvoidingView>
        </SafeAreaView>
      );
    }

accessibilityRole, accessibilityLabel and accessibilityState are what TalkBack and VoiceOver read; they are also
what tests find elements by. The tests, with @testing-library/react-native:

    fireEvent.changeText(input, '98450 12');
    expect(input.props.value).toBe('9845012');
    fireEvent.press(button);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
    fireEvent.changeText(input, '9845012345');
    expect(button).toBeEnabled();
    fireEvent.press(button);
    expect(onSubmit).toHaveBeenCalledWith('9845012345');

    Tests:       3 passed, 3 total

The worked example shows how the first version of this screen failed a test, and what that found.

## No web equivalent, in one list

No hover; no right-click; no form element or submit event; the keyboard covers your UI; notches and gesture bars;
a hardware or gesture back on Android (next lessons); text only inside Text; every remote image needs a size.`,
    workedExample: `**Scenario.** The first version of KiranaNow's login cleaned the input with
onChangeText={t => setPhone(t.replace(/\\D/g, '').slice(0, 10))} and had maxLength={10} on the TextInput. A
tester reports that pasting a number copied from WhatsApp, "+91 98450 12345", logs in as somebody else.

**Step 1: reproduce it in a test.**

    fireEvent.changeText(input, '+91 98450 12345');
    expect(input.props.value).toBe('9845012345');

    ● a pasted +91 number keeps the right ten digits
      Expected: "9845012345"
      Received: "9198450123"

Removing non-digits leaves "919845012345"; taking the first ten keeps the country code and drops the last two
digits. "9198450123" starts with 9 and has ten digits, so the validation regex happily accepts the wrong number.

**Step 2: fix the cleaning, in one testable function.** toIndianMobile strips non-digits, then drops a leading 91
or 0 only when there are more than ten digits:

    +91 98450 12345 -> 9845012345 | 098450 12345 -> 9845012345 | 98450-12345 -> 9845012345
    91234 -> 91234 | 919845012345 -> 9845012345

The test now passes. Note "91234": while the user is still typing, a number that really starts with 91 is left
alone.

**Step 3: remove maxLength={10}.** maxLength is enforced by the native text field, so on a phone a pasted
"+91 98450 12345" would be cut to its first ten characters, "+91 98450 ", before onChangeText ever ran. The test
cannot show this, because fireEvent.changeText calls your handler directly and skips the native field; it is
exactly the kind of gap a real-device check covers. Limit the value in your own code instead.

**The lesson:** on a phone, input arrives from the keyboard, paste, autofill and SMS one-time codes. Clean it in a
pure function you can test with every format users really produce.`,
    mcqs: [
      mcq('A KiranaNow product card shows a remote image with source={{ uri: url }} and no style. The card is blank where the image should be, and there is no error. Why?', [
        ['A network image has no size until you give it one, so it renders at zero size', true],
        ['Remote images need the Image component imported from the expo-camera package', false],
        ['Image refuses https URLs unless they are listed in the app.json permissions', false],
        ['Image cannot sit inside a Pressable, so the card hides the image on render', false],
      ], 'React Native cannot know a remote image\'s dimensions before it downloads, so without width and height (or width with aspectRatio) it has zero size. expo-camera has nothing to do with images, https URLs need no app.json entry, and images inside Pressable display normally.'),
      mcq('The "Get OTP" button is at the bottom of the login screen. On a phone, the keyboard opens and covers it. Which component addresses this?', [
        ['KeyboardAvoidingView around the form, moving content out of the keyboard\'s way', true],
        ['SafeAreaView around the form, which adds space for the keyboard automatically', false],
        ['A Text wrapper around the button, so the keyboard treats it as a text field', false],
        ['A Modal that holds the button, so it renders above the keyboard on every OS', false],
      ], 'KeyboardAvoidingView adjusts padding or position so content stays above the keyboard. SafeAreaView handles notches and system bars, not the keyboard; wrapping a button in Text changes nothing about the keyboard; and a Modal is a separate screen layer, not a keyboard fix.'),
      mcq('In a TextInput, what is the difference between onChangeText and the web\'s onChange?', [
        ['onChangeText receives the new string directly instead of an event', true],
        ['onChangeText only fires when the keyboard closes, like a blur event', false],
        ['onChangeText fires before the native field changes, so you can veto it', false],
        ['onChangeText receives a synthetic DOM event with target.value inside', false],
      ], 'onChangeText is called with the text itself on every change. It is not a blur handler, it cannot veto the native change before it happens (you control the value through state), and there is no DOM event or target.value in React Native.'),
    ],
    checkpoint: [
      mcq('A cart badge is written as <View>{count && <Text>{count} items</Text>}</View>. What happens when count is 0 on a phone?', [
        ['The bare 0 reaches a View and the device reports a text-outside-Text error', true],
        ['Nothing renders, because a 0 in JSX is treated as false and is skipped', false],
        ['The badge shows "0 items", because && renders its right side for numbers', false],
        ['A yellow warning appears, but the screen shows the text 0 inside the View', false],
      ], 'count && ... evaluates to 0, React renders numbers, and a raw string or number directly inside a View is not allowed on a device. React skips false, null and undefined, not 0; the right side is not rendered when the left is 0; and this is an error, not a warning.'),
      mcq('Users of a slow Android phone tap "Place order" twice because nothing seems to happen on the first tap. Which change fixes the cause in the button itself?', [
        ['Give the Pressable a pressed style and disable it while the order is sent', true],
        ['Swap Pressable for a View with an onPress prop, which reacts more quickly', false],
        ['Move the button into the status bar area, where taps are handled natively', false],
        ['Wrap the button in a Text so the tap is handled by the native text widget', false],
      ], 'Visible feedback on press plus a disabled state during the request stops double orders. View has no onPress prop (TypeScript rejects it), the status bar is not yours to put buttons in, and wrapping in Text does not add feedback or prevent a second submission.'),
      mcq('Why should KiranaNow use SafeAreaView from react-native-safe-area-context rather than the one in react-native?', [
        ['The react-native one is deprecated and only ever handled iOS insets', true],
        ['The react-native one adds keyboard padding that hides input fields', false],
        ['The library one also enables dark mode on screens it wraps for you', false],
        ['The react-native one cannot be styled, while the library one can be', false],
      ], 'React Native\'s SafeAreaView is deprecated and only worked on iOS, while the library handles Android edge-to-edge insets too. Neither version manages the keyboard or dark mode, and both accept a style prop.'),
    ],
  },

  /* ── STYLING_LAYOUT ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_RN_BASICS_STYLING_LAYOUT',
    notes: `Styling in React Native looks like CSS written in camelCase, and that resemblance causes most of the
mistakes. There are no stylesheets, no selectors and no cascade; every component gets its style directly. Layout
is Flexbox, with different defaults from the web. This lesson lays out KiranaNow's product grid so it works on a
small Android phone, a large one and a tablet, in light and dark mode.

## Style objects and StyleSheet

    const styles = StyleSheet.create({
      header: { padding: 16, borderRadius: 12 },
      title: { fontSize: 20, fontWeight: '700' },
    });
    <Text style={[styles.title, { color: theme.text }, isSale && styles.saleTitle]}>Fresh vegetables</Text>

- Style is an object (or an array of objects). Property names are camelCase; numbers have no unit.
- In an array, **later entries win**, and false, null and undefined are skipped, so conditional styles read
  naturally. StyleSheet.flatten shows the merge:

      StyleSheet.flatten([{ padding: 16, color: 'red' }, false, { color: 'blue' }])
      {"padding":16,"color":"blue"}

- StyleSheet.create checks style keys through TypeScript and keeps styles out of the render function, so they are
  not rebuilt on every render.
- Text styles do not inherit from Views. If you want one font across the app, make your own AppText component.

## Units: density-independent pixels

A number like padding: 16 means 16 **density-independent pixels** (dp on Android, points on iOS), not physical
pixels. A phone with a pixel density of 3 draws it with 48 real pixels; useWindowDimensions() reports scale for
this, and PixelRatio converts when you need exact pixels (rarely: for sizing images you download, or
StyleSheet.hairlineWidth for the thinnest possible line). Design in dp and every phone gets the same physical size.

## Flexbox, with different defaults

Every View is a flex container. The differences from the web that catch people:

- **flexDirection defaults to column**, not row. Children stack vertically unless you say row.
- **flex: 1** means "take the remaining space along the parent's main axis". A screen's root View needs flex: 1,
  or it is only as tall as its content; a FlatList inside a parent without a height has nothing to scroll in.
- flexShrink defaults to 0, and alignContent to flex-start.
- position: 'absolute' places a view relative to its parent; there is no fixed positioning against the page.
- gap, rowGap and columnGap work; percentages work for width and height; aspectRatio keeps image cards in shape.

    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
      <Image source={{ uri }} style={{ width: 48, height: 48, borderRadius: 8 }} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1}>{name}</Text>
        <Text>₹{price}</Text>
      </View>
      <Pressable style={{ minHeight: 48, justifyContent: 'center' }}><Text>Add</Text></Pressable>
    </View>

The flex: 1 on the middle View makes it take what the image and button leave, so a long name truncates instead
of pushing the Add button off the screen.

## Responsive layout: measure the window, not the device

Phones range from about 320 dp wide to well over 400 dp, and tablets and opened foldables are wider still. Use
**useWindowDimensions()**, which re-renders when the window changes (rotation, split screen, a foldable opening);
Dimensions.get() is a one-time read that goes stale. Decide by width, never by device name:

    export function columnsFor(widthDp: number): number {
      if (widthDp >= 840) return 4;   // tablets, foldables opened
      if (widthDp >= 600) return 3;
      return 2;                       // every phone in portrait
    }

    320->2 360->2 393->2 412->2 600->3 800->3 1024->4

## Font scale: your users' eyesight

Many users raise the system font size, especially older family members sharing a phone. useWindowDimensions()
also reports **fontScale**. Text grows with it by default, which is right; your job is to make layouts survive it:
no fixed heights on rows of text, numberOfLines where truncation is acceptable, and wrapping where it is not. Use
maxFontSizeMultiplier on a few places that cannot grow (a tab label) rather than turning scaling off.

## Dark mode

useColorScheme() returns 'light', 'dark', or null when unknown. Keep your colours in one theme object and choose by
scheme:

    export const palette = {
      light: { bg: '#FFFFFF', card: '#F3F4F6', text: '#111827', muted: '#4B5563', accent: '#0B6E4F' },
      dark:  { bg: '#0B0F14', card: '#1F2937', text: '#F9FAFB', muted: '#9CA3AF', accent: '#34D399' },
    } as const;

    export function useTheme(): Theme {
      const scheme = useColorScheme();
      return scheme === 'dark' ? palette.dark : palette.light;   // null falls back to light
    }

Tested with the hook mocked to 'dark', a 360 dp window and fontScale 1.3:

    2 columns at 360 dp, font scale 1.3, 3x pixels
    Tests:       4 passed, 4 total

The trap: in an Expo app, useColorScheme() only follows the phone if app.json has **"userInterfaceStyle":
"automatic"**. The blank template ships "light", so the hook keeps returning 'light' and your dark theme never
appears. Set it to automatic, and use expo-status-bar's <StatusBar style="auto" /> so the status bar icons stay
readable.

## Fonts

The system font (Roboto on most Android phones, San Francisco on iPhone) costs nothing and respects the user's
settings. A brand font is loaded with expo-font (the useFonts hook, or its config plugin to embed fonts at build
time). Each weight is a separate font file, and each file adds to the app's download size, which matters on
patchy mobile data; two weights is usually enough.`,
    workedExample: `**Scenario.** KiranaNow's designer hands over a two-column product grid drawn on a 412 dp phone: cards
184 dp wide, 16 dp screen padding, 12 dp between cards. On a 320 dp phone the right card is cut off, because a
developer hard-coded width: 184.

**Step 1: derive the width from the window.** Card width = (window width - padding on both sides - gaps between
columns) / columns.

- 412 dp, 2 columns: (412 - 32 - 12) / 2 = 184 dp, the design.
- 360 dp, 2 columns: (360 - 32 - 12) / 2 = 158 dp.
- 320 dp, 2 columns: (320 - 32 - 12) / 2 = 138 dp.
- 600 dp, 3 columns: (600 - 32 - 24) / 3 = 181.3 dp.

    const { width } = useWindowDimensions();
    const cols = columnsFor(width);
    const cardWidth = (width - 2 * 16 - (cols - 1) * 12) / cols;

**Step 2: let content size itself vertically.** The image gets width: '100%' and aspectRatio: 1; the name gets
numberOfLines={2}; the price and Add button sit in a row. No fixed card height, so a fontScale of 1.3 makes the
card taller instead of clipping the price.

**Step 3: check the cases a designer's frame does not show.** 320 dp at the largest font size; a 600 dp tablet;
dark mode (cards use theme.card, not a hard-coded white); a long Hindi product name. Each is a quick check in
your emulator settings, and a unit test covers columnsFor.

**Step 4: pass numColumns to FlatList,** with a key that changes when the column count changes
(key={'grid-' + cols}). FlatList cannot change numColumns on the fly, so a rotation that changes the count must
remount the list.`,
    mcqs: [
      mcq('A KiranaNow row puts an image, a product name and an "Add" button side by side, but they stack vertically. What is missing?', [
        ['flexDirection: \'row\' on the parent, since React Native defaults to column', true],
        ['display: \'flex\' on the parent, since Views are block elements by default', false],
        ['float: \'left\' on each child, since Flexbox only applies to Text elements', false],
        ['A StyleSheet.create call, because inline style objects ignore flex settings', false],
      ], 'Every View is already a flex container, but the main axis is column by default, so you must ask for row. Views are not block elements, there is no float in React Native, and inline style objects support Flexbox exactly as StyleSheet styles do.'),
      mcq('The dark theme works in tests with useColorScheme mocked to "dark", yet on a phone in dark mode the Expo app stays light. What is the likely cause?', [
        ['app.json has userInterfaceStyle set to "light" rather than "automatic"', true],
        ['useColorScheme only works inside screens that are wrapped in a Modal', false],
        ['Dark mode on Android requires the app to use the default system font', false],
        ['StyleSheet.create caches colours, so they cannot change while it runs', false],
      ], 'With userInterfaceStyle "light", the app is locked to light and the hook reports light. The hook needs no Modal, fonts have nothing to do with the colour scheme, and StyleSheet.create does not stop you choosing different style objects per theme.'),
      mcq('Why prefer useWindowDimensions() over Dimensions.get(\'window\') inside a component?', [
        ['The hook re-renders the component when the window size changes', true],
        ['The hook returns physical pixels, which are more precise for layout', false],
        ['Dimensions.get only works on iOS, while the hook works on both OSes', false],
        ['The hook reads the size from app.json, so it is known before launch', false],
      ], 'useWindowDimensions subscribes to changes such as rotation, split screen and foldables, while Dimensions.get is a one-off read that goes stale. Both return density-independent values, both work on Android and iOS, and neither reads app.json.'),
    ],
    checkpoint: [
      mcq('A FlatList of offers is inside a screen whose root View has no flex: 1. On the phone the list does not scroll and shows only a few rows. What should change?', [
        ['Give the root View flex: 1 so the list has a bounded height to scroll in', true],
        ['Give the FlatList a fixed height of 100% of the device in physical pixels', false],
        ['Wrap the FlatList in a ScrollView, so the outer view handles the scrolling', false],
        ['Set flexDirection: \'row\' on the root, so the list gains more space to fill', false],
      ], 'Without flex: 1, the root sizes to its content, so the list has no bounded area to scroll within. Physical pixels are the wrong unit and a fixed height is fragile, nesting a FlatList in a ScrollView breaks virtualisation, and row direction lays children side by side without giving the list height.'),
      ck('MOBILE_APP_BASICS', 'A designer specifies a 48-unit touch target. On a phone with a pixel density of 3, how many physical pixels tall is a Pressable with minHeight: 48?', [
        ['144, because React Native sizes are density-independent units', true],
        ['48, because React Native sizes are always physical pixels', false],
        ['16, because the density divides the size to fit the screen', false],
        ['It depends on the font scale the user has chosen in settings', false],
      ], 'Sizes are in dp/points, so 48 units are drawn with 48 x 3 = 144 physical pixels and look the same physical size on every phone. They are not physical pixels, density multiplies rather than divides, and font scale affects text, not a minHeight.'),
      mcq('An older user sets the largest font size and product names overflow their cards, hiding the price. Which fix respects the user\'s choice?', [
        ['Remove fixed card heights and let text wrap or truncate with numberOfLines', true],
        ['Set allowFontScaling={false} on every Text so the layout looks as designed', false],
        ['Detect large fonts and show a message asking the user to reduce the size', false],
        ['Lower every fontSize by the fontScale value so the result stays the same', false],
      ], 'Layouts should grow with text: no fixed heights, sensible numberOfLines, and wrapping where needed. Turning scaling off or dividing by fontScale overrides the user\'s accessibility setting, and asking users to change their phone is not a fix.'),
    ],
  },

  /* ── LISTS ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_RN_BASICS_LISTS',
    notes: `Almost every screen in KiranaNow is a list: products, categories, past orders, delivery slots, offers.
On the web you would map an array to elements and let the browser cope. On a budget Android phone with limited
memory, mapping 500 orders into 500 rows of native views is how an app becomes slow, hot and eventually killed by
the system. This lesson is about showing long lists that stay smooth.

## Why ScrollView is not a list

ScrollView renders every child, immediately. FlatList renders a window of rows around what is visible and adds
more as you scroll. The same 500 orders, rendered in a test:

    FlatList rows mounted: 10 | Shop 500 present: false
    ScrollView rows mounted: 500

Ten is FlatList's default initialNumToRender. On a device it then renders further rows in batches as you scroll,
and unmounts rows far outside the visible area. Use ScrollView for a screen of a few known items (a settings page,
a product detail); use FlatList or SectionList for anything that comes from data and can grow.

## A FlatList, piece by piece

    <FlatList
      data={orders}
      keyExtractor={o => o.id}
      renderItem={renderItem}
      getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      onEndReached={() => { if (!loadingMore) onLoadMore(); }}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={<Text>No orders yet. Your first delivery is one tap away.</Text>}
      ListFooterComponent={loadingMore ? <ActivityIndicator accessibilityLabel="Loading more orders" /> : undefined}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
    />

- **keyExtractor** returns a stable, unique string per item (an id, never the index for data that changes). It
  must return a string: keyExtractor={n => n} on a list of numbers fails type-checking with "Type '(n: number) =>
  number' is not assignable to type '(item: number, index: number) => string'". Without keyExtractor, FlatList
  looks for item.key or item.id and silently falls back to the index (a test with neither printed no warning),
  which goes wrong as soon as items are inserted, removed or reordered.
- **renderItem** receives { item, index } and returns a row. Keep rows cheap and wrap the row component in memo,
  with a useCallback renderItem, so a parent re-render does not re-render every visible row.
- **getItemLayout**: if every row has the same height, telling FlatList skips measuring and makes scrollToIndex
  and long jumps instant.
- **ListEmptyComponent**, **ListHeaderComponent**, **ListFooterComponent** and **ItemSeparatorComponent**: the
  empty state you learnt to design in "Talking to a Server From a Phone", a header that scrolls with the list,
  the "loading more" spinner, and dividers.
- Note the footer: ListFooterComponent={cond ? <X /> : null} fails type-checking in React Native 0.88's types
  ("Type 'null' is not assignable"), so pass undefined.

## Pull to refresh and infinite scroll

**RefreshControl** gives the platform's pull-to-refresh spinner; set refreshing while the request runs and back to
false in a finally block, so a failed request does not leave it spinning forever.

**onEndReached** fires when the user scrolls within onEndReachedThreshold of the end, measured in visible
lengths: 0.5 means "when less than half a screen of content is left below". In a test with a 640 dp viewport and
20 rows of 72 dp (1,440 dp of content):

    onLoadMore calls after scroll to 100: 0
    onLoadMore calls after scroll to 700: 1

At 700 the distance from the end is 1,440 - 640 - 700 = 100 dp, under the 320 dp threshold. onEndReached can fire
more than once for the same end (a fast fling, a re-render), so guard it with a loading flag, ask for the next page
by cursor or page number, and drop duplicate ids when pages arrive.

## SectionList

Grouped data, such as orders by month or products by category, goes in **SectionList**:

    <SectionList
      sections={[{ title: 'Dairy', data: dairy }, { title: 'Snacks', data: snacks }]}
      keyExtractor={p => p.id}
      renderSectionHeader={({ section }) => <Text accessibilityRole="header">{section.title}</Text>}
      renderItem={({ item }) => <ProductRow product={item} />}
      stickySectionHeadersEnabled
    />

It virtualises like FlatList; sticky headers are on by default on iOS and off on Android, so set the prop if you
want the same behaviour on both.

## Keeping long lists smooth

- **Small rows**: few nested Views, no heavy work inside renderItem (format prices once, before the list).
- **Sized, small images**: request thumbnails at the size you display, not the 2,000-pixel original; on mobile
  data and limited memory this is the biggest win. expo-image adds caching.
- **Stable callbacks**: memo rows plus useCallback renderItem.
- **The knobs**: initialNumToRender (rows in the first render), maxToRenderPerBatch, windowSize (how many screens
  of rows to keep mounted; the default is 21, meaning 10 above, 10 below and the visible one), and
  removeClippedSubviews. Change them after profiling, not before.
- **Never nest a vertical FlatList inside a vertical ScrollView.** The outer ScrollView gives the list unlimited
  height, so the list renders everything and virtualisation is lost; React Native warns about it in development.
  Put the content above the list in ListHeaderComponent instead.
- **FlashList**, a library from Shopify, recycles row views instead of creating new ones, and many teams use it
  for very long or complex lists. Its API is close to FlatList's; reach for it when profiling shows FlatList is
  the bottleneck.

Measure on the slowest phone you support with the React profiler and the performance monitor in the developer
menu. "It is smooth on my flagship" is not a result.`,
    workedExample: `**Scenario.** KiranaNow's delivery-slot picker shows slots in a FlatList. Tapping a slot should show a
tick. After a "performance clean-up" commit, the tick never appears, though the tap handler runs.

The component, reduced:

    const [selected, setSelected] = useState<string | null>(null);
    const inline = ({ item }) => (
      <Pressable accessibilityRole="button" onPress={() => setSelected(item.id)}>
        <Text>{item.label}{item.id === selected ? ' ✓' : ''}</Text>
      </Pressable>
    );
    const memoised = useCallback(inline, []);     // the clean-up: deps left empty
    <FlatList data={SLOTS} keyExtractor={s => s.id} renderItem={memoised} extraData={selected} />

**Step 1: test the variants instead of guessing.** Five versions were rendered, the "9-11 am" slot pressed, and
the tick looked for:

    extraData=false memoRender=false -> tick shown: true
    extraData=true memoRender=false -> tick shown: true
    extraData=false memoRender=true -> tick shown: false
    extraData=true memoRender=true -> tick shown: false
    extraData=false memoRender=honest -> tick shown: true

**Step 2: read the results.** FlatList is a pure component: it re-renders rows only when its props change. An
inline renderItem is a new function on every render, which is itself a changed prop, so the tick appears. The
memoised version with empty dependencies keeps the first closure, in which selected is null for ever. Adding
extraData makes FlatList call renderItem again, but it calls the stale function, so the tick still never shows.
extraData cannot fix a stale closure.

**Step 3: fix.** Make the dependencies honest, useCallback(inline, [selected]) (the "honest" row), and keep
extraData={selected} as the React Native docs recommend for any outside value rows depend on. Better still, pass
selected into a memo row component as a prop, so only the two rows whose tick changes re-render.

**The lesson:** list bugs after "optimisation" are usually stale closures. Let the exhaustive-deps lint rule do
its job instead of silencing it.`,
    mcqs: [
      mcq('KiranaNow\'s order history maps 500 orders into a ScrollView, and the screen takes seconds to open on budget phones. In a test, a FlatList of the same data mounted 10 rows. Why the difference?', [
        ['FlatList virtualises, mounting a window of rows, while ScrollView mounts all', true],
        ['ScrollView renders rows on the UI thread, which is slower than JavaScript is', false],
        ['FlatList caches the 490 hidden rows as images and only mounts visible ones', false],
        ['ScrollView requires a key on each child, and missing keys slow it down a lot', false],
      ], 'FlatList renders an initial window (initialNumToRender, 10 by default) and adds rows as you scroll, while ScrollView creates every child at once. Rendering is not moved to the UI thread by ScrollView, FlatList does not snapshot rows as images, and keys affect reconciliation, not the cost of mounting 500 rows.'),
      mcq('The orders list asks the server for page 3 twice when the user flings to the bottom quickly. What should the screen do?', [
        ['Ignore onEndReached while a page is loading and drop duplicate ids', true],
        ['Set onEndReachedThreshold to 0, so onEndReached can never fire twice', false],
        ['Replace onEndReached with a "Load more" button on every single row', false],
        ['Remove keyExtractor, so FlatList stops tracking which rows exist', false],
      ], 'onEndReached can fire repeatedly near the end, so a loading guard plus de-duplication by id makes loading safe. A threshold of 0 still allows repeats and loads late, a button per row is poor design, and removing keyExtractor only causes index keys and a warning.'),
      mcq('A FlatList of numbers uses keyExtractor={n => n}. What does TypeScript do?', [
        ['Rejects it, because keyExtractor must return a string, not a number', true],
        ['Accepts it, because React converts any key value to a string itself', false],
        ['Accepts it, but FlatList then ignores the keys and uses the indexes', false],
        ['Rejects it, because FlatList data must be an array of plain objects', false],
      ], 'React Native types keyExtractor as (item, index) => string, so returning a number is an error ("Type \'number\' is not assignable to type \'string\'" in the real check). React keys can be numbers in JSX, but this prop is typed; and FlatList accepts arrays of numbers as data.'),
    ],
    checkpoint: [
      mcq('A home screen puts a banner, a category row and a vertical FlatList of 300 products inside one vertical ScrollView. What goes wrong, and what is the fix?', [
        ['The list renders all 300 rows; move the banner into ListHeaderComponent', true],
        ['The list stops scrolling; give the FlatList a fixed height of 300 rows', false],
        ['The banner cannot render; put the banner in a SectionList header instead', false],
        ['Nothing goes wrong, because the ScrollView virtualises its own children', false],
      ], 'Inside a same-direction ScrollView the list gets unlimited height and loses virtualisation, so everything renders; content above it belongs in ListHeaderComponent. A fixed height for 300 rows still renders them all, the banner renders fine, and a ScrollView never virtualises.'),
      mcq('Every row in a list of 1,000 products has the same 72 dp height. What does getItemLayout give you?', [
        ['FlatList skips measuring rows, so scrollToIndex and long jumps are fast', true],
        ['Rows are drawn by the UI thread only, so JavaScript is never involved', false],
        ['FlatList renders all 1,000 rows at once, since their heights are known', false],
        ['The list shrinks images to 72 dp automatically to fit inside each row', false],
      ], 'Knowing each row\'s length and offset lets FlatList compute positions without measuring, which makes jumps and scrollToIndex instant. Rows are still rendered by React, virtualisation still applies, and getItemLayout does nothing to images.'),
      mcq('A slot list re-renders when a slot is selected, but the tick only shows after scrolling away and back. renderItem is wrapped in useCallback with no dependencies. What is the cause?', [
        ['A stale renderItem that still sees the old selected value from its closure', true],
        ['A missing keyExtractor, so FlatList cannot tell which row was tapped', false],
        ['A missing RefreshControl, which FlatList needs to re-render its rows', false],
        ['Too small an initialNumToRender, so the tapped row is never mounted', false],
      ], 'useCallback with empty dependencies keeps the first renderItem, whose closure holds the initial selected value; in the real test even extraData could not fix that. Keys, RefreshControl and initialNumToRender are unrelated to which value the closure reads.'),
    ],
  },

  /* ── PLATFORM_DIFFS ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_RN_BASICS_PLATFORM_DIFFS',
    notes: `One codebase does not mean one behaviour. Android and iOS differ in navigation gestures, permissions,
shadows, fonts, keyboards and system bars, and your users will mostly be on Android. The goal is a single app that
respects each platform, with the differences kept in a few small, tested places instead of if statements
everywhere.

## Platform.OS, Platform.select and platform files

    import { Platform } from 'react-native';

    if (Platform.OS === 'android') { /* ... */ }      // 'android' | 'ios' | 'web' | ...

    export const cardShadow = Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 4 },
      default: { boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
    });

Platform.select returns the value for the running platform. Running the same test file under jest-expo's iOS
preset and then its Android preset (npx jest --preset jest-expo/android) printed:

    Platform.OS = ios | cardShadow = {"shadowColor":"#000","shadowOpacity":0.15,"shadowRadius":8,"shadowOffset":{"width":0,"height":2}}
    Platform.OS = android | cardShadow = {"elevation":4}

When a whole component differs, use **platform-specific files**: DatePickerField.android.tsx and
DatePickerField.ios.tsx, imported as './DatePickerField'. Metro picks the right file when it bundles. Keep their
props identical (a shared DatePickerField.types.ts helps), or TypeScript cannot protect callers. Platform.Version
gives the Android API level or the iOS version, for the rare feature that needs it.

## Back: a button and a gesture on Android, a swipe on iOS

Android has a system back action (a button or an edge gesture) and users press it constantly. You met the rules in
"Screens, Navigation and the Back Button": back closes the top thing (keyboard, sheet, dialog), then goes to the
previous screen, and from the first screen leaves the app. iPhones have no back button; users swipe from the left
edge, and the navigation library handles that.

The navigation library also handles Android back between screens. For something on top of a screen, such as a
filter sheet, listen yourself:

    export function useCloseOnBack(open: boolean, close: () => void) {
      useEffect(() => {
        if (!open) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
          close();
          return true;            // handled: do not run the default back action
        });
        return () => sub.remove();
      }, [open, close]);
    }

Handlers run newest first; returning true stops the others. Tested under the Android preset, with a jest mock
standing in for the screen's own back handling and the sheet open:

    android - after 1st back: sheet open false | screen handler calls 0
    android - after 2nd back: screen handler calls 1

The first back closed the sheet and nothing else; once the sheet was closed its listener was removed, so the
second back reached the screen. Always remove the subscription in the effect's clean-up, or a closed sheet keeps
swallowing back presses. Newer Android versions add a predictive back animation; check the Expo docs for the
current app.json setting before you turn it on.

## Permissions

Both platforms ask the user at runtime for sensitive access (camera, location, notifications, contacts), and the
user can say no, or say no permanently. In Expo, each module has its own permission functions, for example
Location.requestForegroundPermissionsAsync() or the useCameraPermissions() hook, and the permissions and the
messages shown to the user are declared in app.json (or through the module's config plugin), which feeds the
Android manifest and the iOS Info.plist at build time.

- Ask **in context**, when the user taps "Use my location", not at launch.
- Handle **denied**: the app must still work, with manual address entry instead of GPS.
- Handle **denied permanently**: the system will not show the prompt again, so explain and offer
  Linking.openSettings().
- Request only what you use; every extra permission costs trust and invites review questions from the store.

## Status bar, edge to edge and the keyboard

Recent Android versions draw apps edge to edge, under the status bar and the navigation bar, as iPhones always
have, so safe-area insets now matter on Android too. Use expo-status-bar's <StatusBar style="auto" /> so the icons
contrast with your background in light and dark mode. Keyboards differ as well: KeyboardAvoidingView with
behavior="padding" is the usual choice on iOS, while on Android the window resizes for the keyboard by default
(configurable in app.json).

## Shadows, fonts and controls

- **Shadows**: iOS uses the shadow* properties; Android uses elevation, which also affects which view draws on top.
  With the new architecture, the CSS-like boxShadow style works on both and type-checks:
  { boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }. Check how it looks on both before replacing a design system's
  shadows.
- **Fonts**: Roboto on most Android phones and San Francisco on iPhone have different widths and line heights. A
  label that fits on iPhone can wrap on Android; leave room.
- **Native controls**: Alert.alert, date pickers, switches and action sheets look and behave differently. On
  Android, Alert shows at most three buttons. Do not fight the platform's look for system dialogs.

## Testing on both

Android first, because that is where most Indian users are: a budget phone with little RAM and a mid-range one,
plus an emulator with a small screen. Then at least one iPhone, through Expo Go or a development build from EAS if
you have no Mac. Test the large font setting and dark mode on each. jest-expo can run the same tests under both
platform presets, which catches Platform.select mistakes early, but only devices show you real gestures, keyboards
and permission dialogs.`,
    workedExample: `**Scenario.** KiranaNow's offer cards look right on the designer's iPhone, but on Android phones they
are flat, with no shadow, and the Android back gesture leaves the whole screen while the filter sheet is open.

**Step 1: the shadow.** The card style had only shadowColor, shadowOpacity, shadowRadius and shadowOffset. Those
are iOS properties. Two fixes, both type-checked against React Native 0.88:

    // Per platform, the long-standing way:
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, ...cardShadow },
    // One rule for both, with the new architecture's boxShadow:
    cardBoxShadow: { backgroundColor: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },

The test under the Android preset showed cardShadow resolving to {"elevation":4}. Elevation also needs a
background colour on the view, or there is nothing to cast a shadow from.

**Step 2: back.** The sheet was a View shown by state; Android back went straight to the navigator. Adding
useCloseOnBack(open, close) made the first back close the sheet and the second leave the screen, as the test
output in the notes shows. One trap found while writing it: the close callback passed in was a new arrow function
on every render, so the effect re-subscribed on each render. That is harmless here but wasteful; wrap close in
useCallback.

**Step 3: check on a device.** The jest tests prove the logic, not the look: elevation's shadow, the gesture
animation and the sheet's position above the gesture bar need a real Android phone and an iPhone. Put both in
the pull request checklist, with screenshots from each.

**The lesson:** a "looks broken on Android" bug is often an iOS-only API. Find the platform-specific property,
choose a cross-platform form or a Platform.select, and test under both presets.`,
    mcqs: [
      mcq('A filter sheet uses BackHandler to close itself on Android back. After the sheet is closed, back no longer leaves the screen. What was most likely forgotten?', [
        ['Removing the listener in the effect clean-up, so it keeps returning true', true],
        ['Returning false from the listener, so that the sheet closes more quickly', false],
        ['Wrapping the screen in SafeAreaView, which routes back presses correctly', false],
        ['Adding the back permission to app.json, which Android requires for it', false],
      ], 'A listener left subscribed keeps handling back and returning true, so nothing else receives it. Returning false while the sheet is open would let the screen go back too, SafeAreaView has nothing to do with back presses, and no permission exists for the back button.'),
      mcq('KiranaNow has a date field whose Android and iOS versions differ completely. What is the cleanest way to keep both?', [
        ['DateField.android.tsx and DateField.ios.tsx with the same props', true],
        ['One component full of Platform.OS checks on every single line', false],
        ['Two separate apps, one for Android and one for iOS, from a fork', false],
        ['A WebView showing an HTML date input on both of the platforms', false],
      ], 'Platform-specific files let Metro pick the right implementation while callers import one path; sharing a props type keeps them interchangeable. Scattered Platform checks are hard to read and test, forking the app defeats the point, and a WebView input feels foreign on both platforms.'),
      mcq('Where does an Expo app declare the message shown to users when it asks for location access?', [
        ['In app.json or the module\'s config plugin, which feed the native files', true],
        ['In the requestPermissionsAsync call, as a second argument with the text', false],
        ['In a Text component rendered just before the system dialog appears', false],
        ['Nowhere, because Expo writes a standard message for every permission', false],
      ], 'Permissions and usage descriptions are native configuration; Expo generates the Android manifest and iOS Info.plist entries from app.json and config plugins at build time. The request function takes no message text, your own Text is not the system prompt, and Expo does not invent a message that fits your app.'),
    ],
    checkpoint: [
      mcq('Offer cards have a shadow on iPhone but look flat on Android. The style uses shadowColor, shadowOpacity and shadowRadius only. What is the fix?', [
        ['Add elevation for Android through Platform.select, or use boxShadow for both', true],
        ['Increase shadowOpacity to 1, since Android draws much fainter shadows than iOS', false],
        ['Wrap each card in SafeAreaView, which draws a system shadow around its edges', false],
        ['Set userInterfaceStyle to "automatic", which turns Android shadows back on', false],
      ], 'The shadow* properties are iOS-only, so Android needs elevation or the cross-platform boxShadow style available with the new architecture. Raising opacity changes nothing on Android, SafeAreaView adds insets rather than shadows, and userInterfaceStyle controls the colour scheme.'),
      ck('MOBILE_APP_BASICS', 'A user permanently denied location access, and tapping "Use my location" now does nothing. What should the app do?', [
        ['Explain why location helps and offer a button that opens the app\'s settings', true],
        ['Ask for the permission again on every launch until the user finally agrees', false],
        ['Close the screen, because the app cannot work without the location permission', false],
        ['Read the location from the IP address and fill the address without saying so', false],
      ], 'After a permanent denial the system will not show the prompt again, so the app explains and links to settings (Linking.openSettings), while still allowing a manual address. Repeated prompts are blocked anyway, blocking the screen punishes the user, and silently working around a refusal breaks their trust.'),
      ck('MOBILE_APP_BASICS', 'All of KiranaNow\'s testing so far used an iPhone and an emulator on a fast laptop. Which addition finds the most problems for its users?', [
        ['A budget Android phone with the largest font size and dark mode switched on', true],
        ['A second, newer iPhone, to cover the latest version of iOS available today', false],
        ['A larger emulator window on the same laptop to imitate a tablet display', false],
        ['Running the jest tests twice, once with each of the jest-expo presets', false],
      ], 'Most of the app\'s users are on modest Android phones, which expose slowness, memory limits, Android-only behaviour and large-font layout problems. Another iPhone or a bigger emulator repeats what was tested, and jest presets check logic but cannot reproduce real devices.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_RN_BASICS_DEBUGGING',
    notes: `Six broken pieces of KiranaNow, each with the symptom a tester reported, the cause and the smallest fix.
For each one, decide what kind of problem it is before reading on: a type error, a runtime error on the device, a
layout problem, a stale value, or configuration. Where a test or the TypeScript compiler caught it, the real output
is quoted; where only a device shows it, that is said too, because knowing which tool can see a bug is half of
debugging on mobile.

## 1. "The add button adds the item the moment the screen opens"

    <Pressable onPress={addToCart('sku-1')}><Text>Add</Text></Pressable>

**Cause.** addToCart('sku-1') is called during render, and its return value (undefined) is passed as onPress.
Rendered in a test, the mock had been called before any tap:

    addToCart calls before any tap: 1

TypeScript catches it if addToCart is typed (const addToCart = (sku: string): void => ...):

    error TS2322: Type 'void' is not assignable to type '((event: ...) => unknown) | undefined'.   (shortened)

**Fix.** Pass a function: onPress={() => addToCart('sku-1')}. Same mistake as onClick on the web; the habit
carries over, and so does the fix.

## 2. "The cart badge crashes the app when the cart is empty"

    <View style={styles.badge}>{count && <Text>{count}</Text>}</View>

**Cause.** With count = 0 the expression is 0, and React renders numbers. On a device a raw string or number
directly inside a View raises "Text strings must be rendered within a <Text> component". Our jest render did not
throw; it just produced {"type":"View","props":{},"children":["0"]}, a bare "0" under a View. So a passing
component test does not prove this is safe, but the rendered tree shows the problem if you look.

**Fix.** Make the condition a real boolean: {count > 0 && <Text>{count}</Text>} or a ternary. The same rule covers
a stray space or a string variable placed directly inside a View.

## 3. "Product images never appear"

    <Image source={{ uri: product.thumbnailUrl }} />

**Cause.** A remote image has no size until it is given one, so it renders at zero by zero. TypeScript is happy
(the code type-checks) and there is no error; only the screen shows the problem.

**Fix.** Give it a size: style={{ width: 64, height: 64 }}, or width: '100%' with aspectRatio: 1 in a grid card.
Also request a thumbnail at roughly that size, not the full-resolution photo.

## 4. "The selected delivery slot never shows its tick"

**Cause.** As in the Lists lesson: renderItem was wrapped in useCallback with an empty dependency list, so it
always sees the first selected value. The test of five variants showed even extraData={selected} could not help,
because FlatList re-ran the same stale function.

**Fix.** Honest dependencies, useCallback(renderItem, [selected]), plus extraData={selected}; or a memo row
component that receives selected as a prop.

## 5. "The app is always light, even when the phone is in dark mode"

**Cause.** Not code at all: app.json contains "userInterfaceStyle": "light", which the blank Expo template ships
with. The app is locked to light, so useColorScheme() reports light. The unit tests, which mock the hook, pass
happily.

**Fix.** "userInterfaceStyle": "automatic". Because this is native configuration, a development build must be
rebuilt for it to take effect; reloading JavaScript is not enough.

## 6. "Order history shows page 2 twice"

    onEndReached={() => fetchPage(page + 1)}

**Cause.** onEndReached fired twice near the end during a fast fling, before the first request returned, so the
same page was requested and appended twice. Duplicate keys then confuse the list as well.

**Fix.** Guard with a loading flag (if (loadingMore || !hasMore) return), move to the next page only when a page
arrives, and de-duplicate by id when appending:

    setOrders(prev => {
      const seen = new Set(prev.map(o => o.id));
      return [...prev, ...page.filter(o => !seen.has(o.id))];
    });

## The method, in four lines

1. Name the kind of bug: type, runtime, layout, stale closure, configuration or native.
2. Pick the tool that can see that kind: tsc, a jest test, the rendered tree, LogBox, React Native DevTools,
   adb logcat, or your eyes on a real phone.
3. Reproduce it in the smallest piece of code you can.
4. Fix the cause only, and keep the test that reproduced it.`,
    mcqs: [
      mcq('A component test of the cart badge passes, yet the app shows "Text strings must be rendered within a <Text> component" on a phone when the cart is empty. How can that be?', [
        ['The test renderer accepts a bare 0 under a View, which a device rejects', true],
        ['The test used a different React version, so && behaves differently there', false],
        ['The device runs the release bundle, which removes the Text components', false],
        ['The jest preset adds Text around strings automatically in every test run', false],
      ], 'In the real test the bare "0" simply appeared as a child of View, while the native renderer on a device raises the text-outside-Text error. The React version is the same, release bundles keep Text components, and the preset does not wrap strings; it just does not enforce the rule.'),
      mcq('After setting userInterfaceStyle to "automatic", a developer\'s development build still ignores dark mode. What is the most likely reason?', [
        ['It is native configuration, so the development build must be rebuilt', true],
        ['The change needs a Fast Refresh, which only happens on a component edit', false],
        ['useColorScheme reads app.json at runtime, which is cached for one day', false],
        ['Dark mode only works in production builds, never in development ones', false],
      ], 'userInterfaceStyle is written into the native app at build time, so a development build needs rebuilding (or Expo Go reloading the project). Fast Refresh only swaps JavaScript, the hook reads the system setting rather than app.json, and dark mode works in development builds.'),
      mcq('Which bug from this unit can TypeScript catch before the app runs?', [
        ['onPress={addToCart(\'sku-1\')} when addToCart is typed to return void', true],
        ['A remote Image with no width or height given in its style properties', false],
        ['"userInterfaceStyle": "light" left in app.json from the template', false],
        ['onEndReached firing twice and loading the same page of orders again', false],
      ], 'Passing void where a function is expected is a type error ("Type \'void\' is not assignable..."). The unsized image type-checks and simply renders at zero size, app.json is configuration, and a duplicate page request is a runtime timing problem.'),
      mcq('The orders list appends page 2 twice after a fast fling. Which fix addresses the cause rather than hiding it?', [
        ['Skip onEndReached while loading, and de-duplicate orders by id on append', true],
        ['Raise onEndReachedThreshold to 5, so the list loads pages much earlier', false],
        ['Use the index as the key, so duplicate orders no longer trigger warnings', false],
        ['Wrap the FlatList in a ScrollView, so onEndReached fires once per scroll', false],
      ], 'The cause is overlapping requests for the same page; a loading guard prevents them and de-duplication protects against any that slip through. A larger threshold just loads earlier and can still double up, index keys hide the duplicates instead of removing them, and a ScrollView wrapper breaks virtualisation.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_RN_BASICS_PRACTICE',
    notes: `Eight exercises, from quick to longer. Try each before reading the answer. Exercises 4 and 5 were run as
jest tests; their outputs are real. Use the data below, a slice of a recipe app's catalogue:

    const DATA: Recipe[] = [
      R('r1', 'Paneer Butter Masala', 'North Indian', true, 40),
      R('r2', 'Chicken Chettinad', 'South Indian', false, 50),
      R('r3', 'Masala Dosa', 'South Indian', true, 35),
      R('r4', 'Crème Brûlée', 'French', true, 60),
    ];

## 1. Which component? (warm-up)

For each, name the component: (a) a settings screen with eight rows; (b) 2,000 products; (c) orders grouped by
month; (d) a single product's detail page with an image, a description and a button.

**Answer.** (a) ScrollView (few, fixed items); (b) FlatList, with getItemLayout if the rows are equal height;
(c) SectionList; (d) ScrollView.

## 2. Fix the row

    <View>
      <Image source={{ uri: p.image }} />
      <Text>{p.name}</Text>
      <Pressable onPress={add(p.id)}><Text>Add</Text></Pressable>
    </View>

It should be a horizontal row with a 48 dp image, a name that truncates to one line, and an Add button that does
not get pushed off screen.

**Answer.** flexDirection: 'row' and alignItems: 'center' on the View; width and height on the Image; flex: 1 on
a View around the name with numberOfLines={1}; onPress={() => add(p.id)}; minHeight: 48 on the Pressable.

## 3. Card width

A grid has 16 dp of screen padding on each side and 12 dp gaps. Work out the card width for 2 columns at 360 dp
and 3 columns at 600 dp.

**Answer.** (360 - 32 - 12) / 2 = 158 dp; (600 - 32 - 24) / 3 = 181.3 dp. Use the formula with
useWindowDimensions(), never a hard-coded width.

## 4. Search that forgives

Write filterRecipes(all, query, vegOnly) that ignores case, surrounding spaces and accents, searches title and
cuisine, and applies a veg-only switch.

**Answer.**

    export function filterRecipes(all: Recipe[], query: string, vegOnly: boolean): Recipe[] {
      const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
      const q = fold(query.trim());
      return all.filter(r => (!vegOnly || r.veg) && (q === '' || fold(r.title + ' ' + r.cuisine).includes(q)));
    }

Real results: "  MASALA " gives r1,r3; "south" with veg only gives r3; "creme" gives r4; an empty query with veg
only gives 3 recipes. Keep it a pure function outside the component; it is then trivial to test.

## 5. Group for a SectionList

Write groupByCuisine(all) returning sections sorted by cuisine name.

**Answer.**

    export function groupByCuisine(all: Recipe[]) {
      const map = new Map<string, Recipe[]>();
      for (const r of all) map.set(r.cuisine, [...(map.get(r.cuisine) || []), r]);
      return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([title, data]) => ({ title, data }));
    }

    French:1 | North Indian:1 | South Indian:2

Rendered in a SectionList with accessibilityRole="header" on headers, the test found the headers "French, North
Indian, South Indian".

## 6. Test the search screen

Write a @testing-library/react-native test: type "masala" and expect exactly two rows; type "biryani" and expect
the empty message; clear the query, press the "Veg only" switch and expect Chicken Chettinad gone; tap Masala Dosa
and expect onOpen('r3').

**Answer.** Find the input with getByLabelText('Search recipes'), use fireEvent.changeText, find the toggle with
getByRole('switch', { name: 'Veg only' }), and assert with queryByText(...) toBeNull() for absence. The real run:
"Tests: 4 passed". Querying by label and role, not testID, also checks that the screen is accessible.

## 7. Back closes the sheet

Write a hook so Android back closes an open bottom sheet, and only then leaves the screen.

**Answer.** useEffect that subscribes with BackHandler.addEventListener('hardwareBackPress', ...) only while
open, calls close() and returns true, and returns () => sub.remove(). Wrap close in useCallback in the caller so
the effect does not re-subscribe on every render.

## 8. Platform shadow

Give a card a shadow that appears on both Android and iOS, two ways.

**Answer.** Platform.select({ ios: { shadowColor, shadowOpacity, shadowRadius, shadowOffset }, android: {
elevation: 4 } }) spread into the style (with a background colour on the card); or boxShadow: '0 2px 8px
rgba(0,0,0,0.15)' with the new architecture. Check both on real devices.`,
    mcqs: [
      mcq('A recipe search should find "Crème Brûlée" when a user types "creme". What does filterRecipes need?', [
        ['Normalise to NFD and strip combining accent marks before comparing', true],
        ['Compare with === after trimming spaces and changing to lower case', false],
        ['Use a regular expression built from the raw query with the i flag', false],
        ['Search only the cuisine field, which never contains accented text', false],
      ], 'normalize(\'NFD\') splits "è" into "e" plus an accent mark, and removing the marks lets "creme" match. Exact comparison and a case-insensitive regex still treat "è" and "e" as different (and a raw query in a regex breaks on special characters), and searching only cuisine would miss titles.'),
      mcq('Which list suits orders grouped under month headings such as "October 2026"?', [
        ['SectionList, with sections built from the orders', true],
        ['ScrollView, with a map that adds a heading each month', false],
        ['FlatList, with numColumns set to the number of months', false],
        ['A Modal, opened once per month for each month\'s orders', false],
      ], 'SectionList is built for grouped data and virtualises like FlatList, with section headers. A ScrollView renders everything, numColumns lays items out in a grid rather than grouping them, and a modal per month is not a list.'),
      mcq('For a grid with 16 dp padding each side and 12 dp gaps, what is the card width with 2 columns on a 320 dp phone?', [
        ['138 dp', true],
        ['144 dp', false],
        ['160 dp', false],
        ['148 dp', false],
      ], '(320 - 2 x 16 - 1 x 12) / 2 = 276 / 2 = 138. 144 forgets the gap, 160 ignores padding and gap, and 148 subtracts only one side\'s padding.'),
      mcq('A test needs to find the "Veg only" toggle. Which query also checks that the toggle is accessible?', [
        ['getByRole(\'switch\', { name: \'Veg only\' })', true],
        ['getByTestId(\'veg-toggle\') on the Pressable', false],
        ['UNSAFE_getByType(Pressable) for the first one', false],
        ['getByText(\'Veg only\').parent of the label', false],
      ], 'Querying by role and accessible name only succeeds if the element exposes the switch role and a label, which is what TalkBack and VoiceOver use. A testID says nothing about accessibility, querying by component type is fragile and marked unsafe, and walking to a parent relies on structure.'),
      mcq('A hook subscribes to BackHandler with close as a dependency, and the parent passes close={() => setOpen(false)}. What happens?', [
        ['The effect re-subscribes on every parent render; useCallback avoids it', true],
        ['The hook throws, because BackHandler accepts only one listener at once', false],
        ['Back stops working, because new arrow functions are ignored by BackHandler', false],
        ['Nothing at all, because React compares functions by their source code', false],
      ], 'A new arrow function each render changes the dependency, so the effect cleans up and subscribes again every time. It still works, just wastefully; BackHandler accepts many listeners and calls them newest first; and React compares dependencies by reference, not by source text.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_RN_BASICS_INTERVIEW_QUESTION',
    notes: `Four questions a React Native interviewer at an Indian startup or product company asks in a first technical
round, with an answer that would get you to the next question and the follow-up that comes when you answer well.
Say the answers aloud; they should take one to two minutes each.

## 1. "How does React Native render UI? Is it a WebView?"

**Model answer.** "No. React runs in a JavaScript engine, Hermes by default, on its own thread. Instead of
react-dom producing DOM nodes, React Native's renderer turns host components into real platform views: a View
becomes an Android ViewGroup or an iOS UIView, Text becomes a TextView. Layout is computed with Yoga, a Flexbox
engine. Touches arrive on the UI thread, go to JavaScript, and state changes come back as updates to native views.
In the new architecture, Fabric is the renderer and JSI lets JavaScript call native code directly instead of
sending JSON over the old bridge."

**Follow-up: "So what does 'the app is janky' usually mean?"** "Either the JavaScript thread is busy, so taps and
JS-driven animations wait, which shows up as slow taps while native scrolling stays smooth; or the UI thread is
overloaded with too many views or huge images, which shows up as janky scrolling. I would profile on a budget
Android phone to see which, before changing anything."

## 2. "We have a product list of 2,000 items and it stutters on budget Android phones. Walk me through it."

**Model answer.** "First check it is a FlatList and not a ScrollView or a .map, and that it is not nested in a
vertical ScrollView, which kills virtualisation. Then the rows: memo row components, a useCallback renderItem with
honest dependencies, no heavy work inside renderItem, stable string keys. Images are the usual big cost: request
thumbnails at display size and use a caching image component. If rows have a fixed height, add getItemLayout.
Then measure with the React profiler on the actual phone; only after that tune windowSize or
maxToRenderPerBatch, or try FlashList, which recycles views."

**Follow-up: "Your list is memoised, but the selected row does not update. Why?"** "Probably a stale closure:
renderItem is memoised without the selected value in its dependencies. extraData alone does not fix that,
because FlatList would call the same stale function; the dependencies have to be right."

## 3. "Expo or bare React Native CLI? Which would you choose and why?"

**Model answer.** "For a new app I would start with Expo, which the React Native docs recommend: it gives a
working toolchain, a set of tested native modules, Expo Router, development builds and EAS for builds and
updates. 'Expo cannot use native code' is outdated: with development builds and config plugins you can add any
native library, and prebuild generates the android and ios folders when you need them. I would choose the bare
CLI when a team already has a large native codebase to embed React Native into, or needs to own the native
projects by hand."

**Follow-up: "What is the difference between Expo Go and a development build?"** "Expo Go is a prebuilt app with
a fixed set of native modules for one SDK, good for learning. A development build is my own app in debug mode
with the dev client, containing exactly my native dependencies. Once I need a library Expo Go does not include,
or my own native configuration, I need a development build."

## 4. "How do you handle Android and iOS differences without two codebases?"

**Model answer.** "Keep them few and in known places. Platform.select for small values such as shadows;
.android.tsx and .ios.tsx files when a component really differs, with a shared props type; the navigation
library for back gestures, plus BackHandler for overlays like sheets, removing the listener in clean-up.
Permissions are asked in context, through Expo modules, with a path for 'denied' and 'denied permanently'. Safe
area insets on both, now that Android is edge to edge. And I test on a budget Android phone and an iPhone, with
large fonts and dark mode."

**Follow-up: "Shadows work on iPhone and not on Android. Why?"** "The shadow* properties are iOS-only; Android
uses elevation, with a background colour on the view. With the new architecture, boxShadow works on both."

## How to practise

Answer each aloud, time it, and record yourself once. Interviewers listen for whether you know where code runs
and whether you measure before you optimise.`,
    mcqs: [
      mcq('An interviewer asks why the scroll stays smooth while taps feel slow. Which answer shows real understanding?', [
        ['Native scrolling is on the UI thread; taps need the busy JavaScript thread', true],
        ['Scrolling uses the GPU, while taps use the CPU, which mobile phones lack', false],
        ['FlatList disables touch handling while scrolling to save the user battery', false],
        ['Taps are routed through the WebView, which adds a delay of about a second', false],
      ], 'Native scroll views run on the UI thread, while onPress handlers need the JavaScript thread, so a busy JS thread delays taps but not scrolling. Phones certainly have CPUs, FlatList does not disable touches, and React Native does not use a WebView.'),
      mcq('An interviewer says "Expo apps cannot use native code". What is the accurate reply?', [
        ['With development builds and config plugins, Expo apps can use native libraries', true],
        ['That is right, so any app needing native code must start from the bare CLI', false],
        ['That is right for Android only; iOS Expo apps can always use native libraries', false],
        ['Expo apps can use native code only by sending JSON messages to a WebView', false],
      ], 'Development builds include whatever native dependencies the project uses, and config plugins and prebuild configure the native projects, so the claim is outdated. It applies to Expo Go only, not to Expo; there is no Android-only rule; and no WebView is involved.'),
      mcq('Asked how to speed up a stuttering product list, which first step shows the best judgement?', [
        ['Profile on a budget Android phone to find the real cost before changing anything', true],
        ['Set windowSize to 1 so that FlatList keeps the fewest rows possible mounted', false],
        ['Rewrite the whole list screen natively in Kotlin, since JavaScript is slow', false],
        ['Move all the list data into a global store so that rows never re-render', false],
      ], 'Measuring on the device your users have tells you whether rows, images or JavaScript work are the cost. A windowSize of 1 causes blank areas while scrolling, a native rewrite is an expensive guess, and a global store does not stop rows re-rendering by itself.'),
    ],
  },

  /* ── MINI_PROJECT ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_RN_BASICS_MINI_PROJECT',
    notes: `## Scenario

Rasoi Notes is a two-person Pune startup that wants a recipe app for students living away from home: quick,
cheap Indian recipes that work on a basic phone with patchy data. Before they spend on a backend, they want a
prototype that works entirely offline from a bundled JSON file, to show to fifty students. You are building it in
Expo and TypeScript. It is the first app in this track you build end to end, so the brief asks for the habits of
the lessons: native components used properly, layout that works on small and large phones, smooth lists, both
colour schemes, and tests.

## The data

Write recipes.json with at least 30 recipes (synthetic, written by you or adapted from your family's cooking; no
copied photos or text from recipe sites). Each recipe:

    type Recipe = {
      id: string;            // "r-001"
      title: string;         // "Masala Dosa"
      cuisine: string;       // "South Indian"
      veg: boolean;
      minutes: number;
      image: string;         // a local asset you have rights to, or a placeholder
      ingredients: string[];
      steps: string[];
    };

Load it with a typed import, and check it at start-up with a small validation function (or zod, which the
TypeScript topic used): a recipe without an id, title or steps should be reported in development, not crash a
screen.

Include awkward data on purpose: a title in Hindi or Marathi, one very long title, one recipe with 15 steps, one
with no image, and cuisines with accents such as "Crème" so search must cope.

## The screens

**Home.** A search box and a "Veg only" switch above a FlatList of recipe cards: image, title (two lines at most),
cuisine and minutes. The search is forgiving: case, spaces and accents ignored, title and cuisine searched. The
empty result shows a helpful message with the query. Use a grid of 2 columns on phones and 3 or more on wide
screens, computed from useWindowDimensions(); when the column count changes, the list remounts with a new key.
Optionally, a "By cuisine" view using SectionList.

**Detail.** The image at full width with a fixed aspect ratio, title, cuisine, minutes, veg marker, ingredients
and numbered steps, in a ScrollView. A back control at the top.

**Navigation.** The Navigation topic comes next, so this project does not need a navigation library: keep the
selected recipe id in state and show Detail when it is set. On Android, the back gesture must return from Detail
to Home (BackHandler, removed in clean-up), not leave the app. You will replace this with a stack in the next
topic, so keep Home and Detail as separate components with typed props.

## The quality bar

- **Layout**: works at 320 dp wide and on a tablet-width window; nothing clipped at the largest system font size;
  safe areas respected (react-native-safe-area-context); touch targets about 48 dp.
- **Theme**: a single theme object; light and dark from useColorScheme(); app.json userInterfaceStyle set to
  "automatic"; StatusBar style="auto".
- **Lists**: keyExtractor on ids; memo card component; useCallback renderItem with honest dependencies; image
  sizes fixed; no list nested in a same-direction ScrollView.
- **Platform**: a card shadow that shows on Android and iOS; anything platform-specific in one place.
- **Accessibility**: accessibilityRole and accessibilityLabel on the search box, switch, cards and back control.

## Tests

With jest-expo and @testing-library/react-native:

- Unit tests for the search function (case, spaces, accents, veg filter, empty query) and for the column
  function.
- Component tests: typing filters the list; the empty message appears; the veg switch hides non-veg recipes;
  tapping a card shows Detail; on the Android preset (npx jest --preset jest-expo/android), a hardware back
  press from Detail returns to Home.
- Type-check with npx tsc --noEmit, strict mode, no any.

## Running it honestly

Run the app on at least one Android device or emulator, in Expo Go or a development build. Take screenshots on a
small screen (or a 320 to 360 dp emulator) and a large one, in light and dark mode, and one at the largest font
size. If you can, run it on an iPhone through Expo Go too; if you could not, say so in the README instead of
implying it.

## Milestones

1. **Day 1**: project created with blank-typescript; recipes.json with 30 recipes and a validation check; Home
   showing a plain FlatList.
2. **Day 2**: search, veg switch, grid layout and the empty state; search and column tests passing.
3. **Day 3**: Detail screen, Android back, safe areas, theme and dark mode.
4. **Day 4**: list performance pass (memo, callbacks, images), accessibility labels, component tests, tsc clean.
5. **Day 5**: device runs and screenshots, README, and a short demo video.

## What to hand in

A Git repository with the source, recipes.json, tests, and a README covering: how to run it, what was run on
which devices, screenshots (small, large, dark, large font), the decisions you made (grid maths, how search
works, why FlatList settings are what they are), and known gaps.`,
    assignment: {
      title: 'Recipe Browser in Expo and TypeScript',
      description: 'Build an offline recipe browser in Expo and TypeScript: a home screen with a forgiving search and a veg switch over a responsive FlatList grid of recipes loaded from a bundled JSON file, a detail screen with image, ingredients and steps, Android back handling, light and dark themes, and a layout that works on small and large phones, with jest and Testing Library tests.',
      instructions: `1. Create an Expo app from the blank-typescript template with strict TypeScript; add react-native-safe-area-context with npx expo install.
2. Write recipes.json with at least 30 synthetic recipes, including a Hindi or Marathi title, a very long title, a 15-step recipe, a recipe with no image and an accented cuisine; validate the data at start-up.
3. Build Home: search box and "Veg only" switch above a FlatList grid of memo recipe cards with ids as keys; 2 columns on phones and more on wide windows from useWindowDimensions(); an empty state that shows the query.
4. Implement search as a pure, tested function that ignores case, spaces and accents and searches title and cuisine.
5. Build Detail with a full-width image at a fixed aspect ratio, ingredients and numbered steps; switch between Home and Detail with state, and make Android back return from Detail to Home with BackHandler, removing the listener in clean-up.
6. Add a single theme object with light and dark palettes from useColorScheme(), set userInterfaceStyle to "automatic", use StatusBar style="auto", and respect safe areas; give cards a shadow that shows on Android and iOS.
7. Add accessibility roles and labels to the search box, switch, cards and back control, and keep touch targets about 48 dp.
8. Write unit tests for search and columns and component tests for filtering, the empty state, the veg switch, opening Detail and Android back (jest-expo/android preset); keep npx tsc --noEmit clean.
9. Run the app on at least one Android device or emulator; add screenshots at small and large widths, in dark mode and at the largest font size; state in the README exactly what was run where.`,
      rubric: [
        { criterion: 'Core components and screens', description: 'Home and Detail built from View, Text, Image, Pressable, TextInput and ScrollView used correctly: text only in Text, sized images, visible press feedback, keyboard-appropriate input props, and typed props for both screens.', maxPoints: 20 },
        { criterion: 'Layout, theme and accessibility', description: 'Grid columns and card widths derived from the window; works at 320 dp, on a wide window and at the largest font size; safe areas respected; one theme with light and dark modes that follow the phone; roles and labels on interactive elements; touch targets about 48 dp.', maxPoints: 20 },
        { criterion: 'Lists and performance', description: 'FlatList with id keys, memo cards and a useCallback renderItem with honest dependencies; images at display size; no list inside a same-direction ScrollView; remounts correctly when the column count changes; optional SectionList view correct.', maxPoints: 20 },
        { criterion: 'Search, data and platform behaviour', description: 'Data validated at start-up; search forgiving of case, spaces and accents across title and cuisine; veg switch; empty state with the query; Android back returns from Detail to Home and the listener is removed; shadows visible on both platforms.', maxPoints: 15 },
        { criterion: 'Tests and type safety', description: 'Unit tests for search and columns and component tests for filtering, empty state, veg switch, opening Detail and Android back, querying by role and label; strict tsc clean with no any.', maxPoints: 15 },
        { criterion: 'Honest evidence and README', description: 'Screenshots from a real run at small and large widths, dark mode and large font; README states what ran on which device and lists known gaps; decisions explained in a few sentences each.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    mcqs: [
      mcq('The project has no navigation library yet. How should Detail be shown so that Android back behaves correctly?', [
        ['Keep the selected id in state, and close Detail from a BackHandler listener', true],
        ['Open Detail in a WebView, which handles Android back presses on its own', false],
        ['Render Detail below Home in one ScrollView and scroll to it when tapped', false],
        ['Call BackHandler.exitApp() from Detail, so that back restarts the app', false],
      ], 'Showing Detail from state, with a back listener that clears the selection and returns true, gives the expected Android behaviour until a stack navigator replaces it. A WebView is the wrong tool, one long ScrollView is not a separate screen, and exitApp leaves the app instead of going back.'),
      mcq('Your README says the app was "tested on Android and iOS", but you only ran it on an Android emulator. What should it say?', [
        ['That it ran on an Android emulator only, and that iOS was not run', true],
        ['That it was tested on both, because Expo targets both from one codebase', false],
        ['Nothing about devices, since the jest tests already cover both systems', false],
        ['That iOS was tested with the jest ios preset, which counts as an iPhone', false],
      ], 'Evidence should say exactly what ran where; one codebase does not prove behaviour on a platform you did not run. Leaving devices out hides a gap, and a jest preset checks logic in Node, not the real look, gestures and keyboard of an iPhone.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_RN_BASICS_CHECKPOINT',
    notes: `Ten questions across the topic: how React Native renders, Expo and development builds, core components,
styling and layout, lists, and Android and iOS differences. Answer without notes; the result shows which lesson
to revisit.`,
    checkpoint: [
      mcq('A food-delivery app\'s menu screen responds slowly to taps while its cart total recalculates, yet the menu scrolls smoothly. What does that point to?', [
        ['Heavy work on the JavaScript thread, which must run each tap handler', true],
        ['Too many native views on the UI thread, which delays every touch event', false],
        ['A missing Hermes build, since taps run in the bundle\'s source text form', false],
        ['Metro rebundling the app in the background whenever the cart is updated', false],
      ], 'Smooth native scrolling means the UI thread is free, while tap handlers wait for the busy JavaScript thread. An overloaded UI thread would make scrolling janky, the engine choice does not explain this pattern, and Metro does not rebundle at runtime on a phone.'),
      mcq('A bus-booking app adds a seat-map library that contains its own native code. In Expo Go it fails with a missing native module. What resolves it?', [
        ['Build and install a development build that contains the library', true],
        ['Reinstall node_modules so that npm downloads the native code again', false],
        ['Start Metro with the -c flag to clear the cache and bundle it again', false],
        ['Add the library to the plugins array and keep testing in Expo Go', false],
      ], 'Expo Go only contains its own set of native modules, so the app needs its own development build with the library compiled in. Reinstalling packages and clearing Metro\'s cache affect JavaScript only, and config plugins change your build, not the prebuilt Expo Go app.'),
      mcq('In a UPI payment screen, which TextInput props suit the 6-digit PIN-style OTP field?', [
        ['keyboardType="number-pad" with autoComplete="sms-otp" for autofill', true],
        ['keyboardType="email-address" with autoCapitalize set to "characters"', false],
        ['multiline={true} with returnKeyType="next" so each digit moves along', false],
        ['keyboardType="default" with secureTextEntry and maxLength set to 60', false],
      ], 'A number pad and the one-time-code autofill hint fit an SMS OTP. The email keyboard and capitalisation make no sense for digits, multiline is for long text, and a default keyboard with a 60-character limit invites wrong input.'),
      mcq('Which statement about Text in React Native is correct?', [
        ['Text styles pass only to nested Text components, never down from a View', true],
        ['A View with a color style sets the colour of every Text inside it', false],
        ['Strings may sit directly inside a View if they are shorter than one line', false],
        ['Text cannot be nested in Text, so bold words need a separate row View', false],
      ], 'There is no cascade from Views; nested Text inherits from its parent Text, which is how you bold a word inside a sentence. A View\'s style does not reach its Text children, bare strings inside a View are an error on a device whatever their length, and nesting Text is allowed and common.'),
      mcq('A train-booking screen\'s root View has no flex: 1, and the passenger list below a header shows only partly and will not scroll. What is wrong?', [
        ['The root sizes to its content, so the list has no bounded height to fill', true],
        ['FlatList cannot appear below a header unless numColumns is set to one', false],
        ['flexDirection defaults to row, so the list is squeezed beside the header', false],
        ['Views clip their children by default, so the list must use absolute layout', false],
      ], 'flex: 1 on the root makes it fill the screen, giving the list a bounded area in which to scroll. numColumns is unrelated, the default direction is column, not row, and absolute positioning is not the fix for a missing flex.'),
      ck('MOBILE_APP_BASICS', 'An ed-tech app\'s course grid must work on phones from 320 dp to tablets. How should it choose the number of columns?', [
        ['From the window width in dp, read with useWindowDimensions()', true],
        ['From the phone model name, looked up in a table of known devices', false],
        ['From the physical pixel width, since that is what the screen draws', false],
        ['From Dimensions.get once at launch, then cached for the session', false],
      ], 'Layout decisions belong to the window width in density-independent units, read with a hook that updates on rotation and foldables. Device-name tables go stale, physical pixels vary with density, and a value read once at launch is wrong after the window changes.'),
      mcq('A local-services app lists 3,000 electricians. Rows have a fixed height of 80 dp. Which combination is right?', [
        ['FlatList with id keys, memo rows and getItemLayout for the 80 dp rows', true],
        ['ScrollView with a map, since a fixed row height makes it as fast as FlatList', false],
        ['FlatList inside a vertical ScrollView, so the header can scroll with the list', false],
        ['FlatList with index keys, since the rows all share the same fixed height', false],
      ], 'FlatList virtualises, stable keys and memo rows keep re-renders cheap, and getItemLayout uses the fixed height to skip measurement. A ScrollView still mounts 3,000 rows, nesting in a same-direction ScrollView breaks virtualisation (use ListHeaderComponent), and index keys break when the list changes.'),
      mcq('In a grocery app, pulling down on the orders list should reload it. What should the refresh handler do with the refreshing state?', [
        ['Set it true before the request and false in a finally block', true],
        ['Set it true and leave it, since RefreshControl hides it by itself', false],
        ['Set it false before the request, so the spinner is never shown', false],
        ['Leave it unset, because onEndReached already manages the spinner', false],
      ], 'Setting refreshing for the duration of the request, and clearing it in finally, shows the spinner and guarantees it stops even when the request fails. RefreshControl does not reset it, hiding the spinner removes feedback, and onEndReached is for loading more at the end, not pull to refresh.'),
      mcq('A bottom sheet in a quick-commerce app should close on Android back, then back should leave the screen. Which listener behaviour is right while the sheet is open?', [
        ['Close the sheet and return true, removing the listener when it closes', true],
        ['Close the sheet and return false, so the screen also goes back at once', false],
        ['Call BackHandler.exitApp(), which closes the sheet and the screen too', false],
        ['Return true and leave the sheet open, so that back is ignored entirely', false],
      ], 'Returning true marks the press as handled so only the sheet closes, and removing the listener lets the next back reach the screen, as the Android-preset test showed. Returning false also triggers the default back, exitApp leaves the app, and ignoring back traps the user.'),
      ck('MOBILE_APP_BASICS', 'A ride-hailing app asks for location, contacts and camera access the moment it first opens. What is the better design?', [
        ['Ask for each permission when the user starts the feature that needs it', true],
        ['Ask for all of them at launch, so the user is not interrupted later on', false],
        ['Ask for none and read the data anyway, as the app needs them to work', false],
        ['Ask once at install and assume the answer never changes afterwards', false],
      ], 'Asking in context explains itself and gets better answers, and the app must cope with "no". A burst of prompts at launch is refused more often, data cannot be read without permission, and users can change their answer in settings at any time.'),
    ],
  },
];
