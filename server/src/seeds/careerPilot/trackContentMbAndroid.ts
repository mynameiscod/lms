/**
 * Career-track content: Native Android for React Native Developers (MB_ANDROID_NATIVE), Mobile, batch MB2.
 *
 * Enough native Android for a React Native developer to read, debug and bridge it: Kotlin taught next to TypeScript
 * (val and var, null safety, data classes, when and sealed types, lambdas, collections, coroutines in outline), the
 * android folder of an Expo or bare project (Gradle, SDK levels, the manifest, the activity lifecycle, resources and
 * the build errors students actually hit), Jetpack Compose taught next to React components and state, and a native
 * module written with the Expo Modules API (a Kotlin module, its TypeScript side and a config plugin). It builds on
 * this track's "React Native Under the Hood" ideas (JSI, TurboModules, development builds) and the Year 3 mobile
 * lessons "State That Survives a Rotation" and "What Is Draining the Battery", referred to by title, not re-taught.
 *
 * One fictional app runs through the topic: SafarSeat, a Hyderabad bus-ticket booking app. Its native module,
 * DeviceTier, tells the JavaScript side whether the phone is low on RAM or in battery saver, so the app can switch to
 * a lighter UI on budget phones.
 *
 * What was run and what was not. NO KOTLIN, GRADLE, ANDROID SDK, EMULATOR OR PHONE WAS AVAILABLE: every Kotlin
 * snippet, Gradle file, manifest and Compose screen was written from developer.android.com, kotlinlang.org and
 * docs.expo.dev and was NOT compiled here; Gradle and logcat messages appear only as "what you will see", labelled as
 * typical wording. The Expo Modules DSL names (Name, Constant, Function, AsyncFunction, Events, OnStartObserving,
 * OnStopObserving, CodedException) were checked against the Kotlin sources shipped in expo-modules-core for Expo SDK
 * 58, and the module's android/build.gradle follows the one in expo-status-bar. Run for real: the Java comparisons
 * (records, null pointer messages, streams) with JDK 19; the module's TypeScript side, its useLiteMode hook and the
 * config plugin, type-checked with TypeScript 6 in strict mode and tested with Jest 30, jest-expo and
 * @testing-library/react-native 13 against a jest mock of the native module. Every output quoted from those runs is
 * real, including the failures.
 *
 * Skills: ANDROID_DEVELOPMENT (the topic's only skill).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_MB_ANDROID_NATIVE_BUNDLES: PilotBundle[] = [
  /* ── KOTLIN_BASICS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_ANDROID_NATIVE_KOTLIN_BASICS',
    notes: `You will not be hired to write Kotlin in a React Native role, but you will open MainApplication.kt to add a
line a library's README asks for, read a stack trace from a crash in a native SDK, and one day write a small native
module. All of that needs reading fluency, and you already have most of it: Kotlin and TypeScript solve the same
problems (types on a dynamic world, null, immutable data, functions as values) with surprisingly similar syntax.
(The Kotlin in this topic was written from kotlinlang.org and developer.android.com and was not compiled here; there
is no Kotlin compiler on the machine these notes were written on. The Java comparisons were run with JDK 19.)

## Values, variables and functions

    // TypeScript                                 // Kotlin
    const city = 'Hyderabad';                     val city = "Hyderabad"
    let seatsLeft = 12;                           var seatsLeft = 12
    const fare: number = 650;                     val fare: Int = 650
    function total(seats: number): number {       fun total(seats: Int): Int {
      return seats * fare;                            return seats * fare
    }                                             }
    const total2 = (s: number) => s * fare;       fun total2(s: Int) = s * fare

val is const (the reference cannot be reassigned), var is let. Types come after the name, as in TypeScript, and are
inferred when obvious. Semicolons are optional. Kotlin has real number types (Int, Long, Double) instead of one
number, so 7 / 2 is 3 in Kotlin and 3.5 in TypeScript. Strings use templates with a dollar sign:
"Seat $number on bus \${trip.busId}" is the Kotlin version of a backtick template literal.

## Null safety: the same idea, enforced harder

    val name: String = "Ravi"        // can never be null
    val coupon: String? = null       // TypeScript: string | null
    val len = coupon?.length         // Int?  - safe call, like ?.
    val code = coupon ?: "NONE"      // elvis, like ??
    val sure = coupon!!.length       // like the ! assertion, but it THROWS if null

Two differences matter. Kotlin has no undefined: a missing value is null, and a non-null type really cannot hold
null. And !! is not a type-level promise as in TypeScript; at runtime it throws a NullPointerException, which on a
phone is a crash. Kotlin also smart-casts: inside if (coupon != null) { ... } the compiler treats coupon as String.

The gap is Java code. Android's own APIs are mostly Java, and a value from a Java method (intent.getStringExtra,
a Bundle) has a "platform type" that Kotlin cannot check. The crash then looks exactly like Java's. Run here with
JDK 19, a missing map entry passed on:

    NPE: Cannot invoke "String.length()" because "name" is null

Treat every value from a Java API as nullable and decide what to do with ?. and ?: at the boundary.

## Data classes: equality you do not have in TypeScript

    data class Seat(val busId: String, val number: Int)

    val a = Seat("TS09-4411", 14)
    val b = Seat("TS09-4411", 14)
    a == b                 // true: compares fields
    a === b                // false: different objects
    val moved = a.copy(number = 15)    // like { ...a, number: 15 }
    val (bus, no) = a      // destructuring, like const { busId, number } = a

In TypeScript, two objects with the same fields are never ===, which is why React compares by reference and you
write ids into keys. A Kotlin data class generates equals, hashCode, toString and copy from the constructor
fields. Java's record does the same, so the behaviour could be run here:

    plain class equals: false
    record equals: true, same hashCode: true
    record toString: Seat[busId=TS09-4411, seatNo=14]
    set contains an equal seat: true

That last line is why it matters: a data class works as a key in a Set or Map by value. Use val fields so the
hashCode cannot change after the object is in a set.

## when, enums and sealed types

    sealed interface BookingState {
        data object Idle : BookingState
        data class Holding(val seats: List<Int>, val expiresAt: Long) : BookingState
        data class Failed(val reason: String) : BookingState
    }

    fun label(s: BookingState): String = when (s) {
        BookingState.Idle -> "Pick your seats"
        is BookingState.Holding -> "\${s.seats.size} seats held"
        is BookingState.Failed -> "Could not book: \${s.reason}"
    }

This is a discriminated union. when is an expression (it returns a value), is narrows the type like a type guard,
and because the interface is sealed the compiler knows every case: add a Confirmed state and every when without an
else stops compiling, just as your exhaustive switch with never did in TypeScript.

## Lambdas and collections

    val trips = listOf(Trip("Vijayawada", 650), Trip("Bengaluru", 1250), Trip("Tirupati", 900))
    val cheap = trips.filter { it.fare < 1000 }.map { it.to }     // [Vijayawada, Tirupati]
    val total = trips.sumOf { it.fare }                            // 2800
    val byBand = trips.groupBy { if (it.fare < 1000) "budget" else "long" }
    val first = trips.firstOrNull { it.to == "Vizag" }            // null, not undefined

{ it.fare < 1000 } is an arrow function; it is the implicit name of a single parameter. When a lambda is a
function's last argument it goes outside the parentheses (trailing lambda syntax), and if it is the only argument
the parentheses disappear: trips.filter { ... }. Read Compose with this in mind; Column { ... } is a function call
whose last argument is a lambda. listOf gives a read-only List; to add items you need mutableListOf. Read-only is
not deep immutability, but it stops accidental pushes, which is the bug React taught you to fear.

Extension functions add methods to existing types: fun Int.toRupees() = "Rs $this" lets you write fare.toRupees().

## Classes and objects, briefly

    class BookingRepository(private val api: BookingApi) {        // constructor in the header
        suspend fun hold(tripId: String, seats: List<Int>): Hold = api.hold(tripId, seats)
    }
    object Analytics { fun log(event: String) { /* ... */ } }     // a singleton

## Coroutines, in outline

A suspend function is Kotlin's async function, and calling one from another suspend function is like await without
the keyword. You start them from a scope:

    viewModelScope.launch {
        val hold = repo.hold(tripId, seats)        // suspends; does not block the main thread
        _state.value = BookingState.Holding(hold.seats, hold.expiresAt)
    }

    suspend fun loadTrips() = withContext(Dispatchers.IO) { api.trips() }   // run on an IO thread

The difference from Promises is structured concurrency: a coroutine belongs to a scope, and when the scope ends
(the screen's ViewModel is cleared) its coroutines are cancelled. A Promise you forgot keeps running and calls
setState on an unmounted component; a coroutine in viewModelScope is cancelled for you. Flow is a stream of values
over time, and StateFlow is a value you can observe, roughly a tiny store with one field.

## Common mistakes

- Writing !! to silence the compiler. It moves the problem from compile time to a crash on a user's phone.
- Expecting == on two plain classes to compare fields. Only data classes (and value types) do that.
- Calling a suspend function from a normal function. It will not compile; you need a scope, as in the outline above.`,
    workedExample: `**Scenario.** SafarSeat's TypeScript has a pricing helper that a teammate is porting to Kotlin for a native
module. Translate it and check each decision.

    type Trip = { id: string; to: string; fare: number; coupon?: string | null };

    function priceFor(trip: Trip, seats: number[]): string {
      const discount = trip.coupon === 'FIRST50' ? 50 : 0;
      const total = seats.length * trip.fare - discount;
      return \`\${seats.length} seats to \${trip.to}: Rs \${total}\`;
    }

**The Kotlin.**

    data class Trip(val id: String, val to: String, val fare: Int, val coupon: String? = null)

    fun priceFor(trip: Trip, seats: List<Int>): String {
        val discount = if (trip.coupon == "FIRST50") 50 else 0
        val total = seats.size * trip.fare - discount
        return "\${seats.size} seats to \${trip.to}: Rs $total"
    }

**Decisions, one by one.**

- **data class**, because a trip is a value: two trips with the same fields should be equal, and the toString makes
  logs readable.
- **coupon: String? = null.** The optional field with a default replaces coupon?: string | null. Kotlin has no
  undefined, so one nullable type with a default covers both.
- **if as an expression** replaces the ternary. Kotlin has no ?: ternary; ?: is the elvis operator.
- **trip.coupon == "FIRST50"** is safe on a null coupon: == in Kotlin is null-safe and compares contents, so no
  ?. is needed. In Java, coupon.equals("FIRST50") would throw on null; "FIRST50".equals(coupon) would not.
- **fare: Int** is a deliberate choice. Rupees with no paise fit an Int; real money with paise should be Long paise,
  never Double, for the same reason you never used floats for money in TypeScript.
- **List<Int>** is read-only: this function cannot add a seat to the caller's list by mistake.

**Check.** priceFor(Trip("t1", "Vijayawada", 650, "FIRST50"), listOf(14, 15)) gives "2 seats to Vijayawada: Rs 1250".
The arithmetic is the same as TypeScript's; the difference is that the compiler now rejects a null fare or a
misspelt field before anyone runs it.`,
    mcqs: [
      mcq('A SafarSeat native module reads intent.getStringExtra("tripId") and calls .length on it without any check. It compiles. Why can it still crash?', [
        ['The value comes from a Java API with a platform type, so Kotlin cannot prove it is non-null', true],
        ['Kotlin skips null checks entirely in release builds, so it only crashes on a production phone', false],
        ['getStringExtra returns undefined for a missing key, which Kotlin turns into an exception', false],
        ['Strings from an Intent are lazily loaded, and length forces a read that fails on the main thread', false],
      ], 'Values from Java methods have platform types: Kotlin lets you treat them as non-null but cannot check, so a missing extra gives a NullPointerException at runtime. Null checks are not removed in release builds, Kotlin has no undefined, and nothing is lazily loaded here.'),
      mcq('Seat is declared as data class Seat(val busId: String, val number: Int). What does setOf(Seat("TS09", 14)).contains(Seat("TS09", 14)) return?', [
        ['true, because the data class generates equals and hashCode from its fields', true],
        ['false, because the two Seat objects are different instances in memory', false],
        ['false, unless Seat also implements Comparable so that the set can order it', false],
        ['It does not compile, since a set of data classes needs an explicit comparator', false],
      ], 'A data class gets field-based equals and hashCode, so an equal Seat is found in a hash set; the Java record run showed the same, "set contains an equal seat: true". Instance identity is what === checks, and hash sets need equals and hashCode, not Comparable or a comparator.'),
      mcq('Which Kotlin line is the closest match for the TypeScript const label = coupon ?? "NONE"?', [
        ['val label = coupon ?: "NONE"', true],
        ['val label = coupon!! ?: "NONE"', false],
        ['val label = coupon?.let { "NONE" }', false],
        ['var label = if (coupon) coupon else "NONE"', false],
      ], 'The elvis operator ?: returns the left side unless it is null, like ??. coupon!! would throw before the elvis is reached, let runs the lambda only when coupon is NOT null (and returns "NONE" then), and Kotlin does not accept a String? as an if condition.'),
    ],
    checkpoint: [
      mcq('A booking screen\'s state is a sealed interface with Idle, Holding and Failed. A teammate adds Confirmed. What happens to a when expression over the state that has no else branch?', [
        ['It stops compiling until a Confirmed branch is added, which is the point', true],
        ['It compiles, and Confirmed silently falls through to the first branch at runtime', false],
        ['It compiles with a warning, and throws IllegalStateException only when Confirmed arrives', false],
        ['It compiles only if Confirmed is a data object rather than a data class', false],
      ], 'Because the interface is sealed, the compiler knows every subtype, and a when used as an expression must be exhaustive, so the missing case is a compile error, like an exhaustive switch with never in TypeScript. Nothing falls through, it is an error rather than a warning, and object or class makes no difference.'),
      mcq('What does viewModelScope.launch give a SafarSeat screen that a plain Promise in a React useEffect does not?', [
        ['The work is cancelled automatically when the ViewModel is cleared', true],
        ['The work always runs on a background thread instead of the main thread', false],
        ['The work is retried automatically when the phone goes back online', false],
        ['The work keeps running after the process dies, until it completes', false],
      ], 'Coroutines are structured: launched in viewModelScope, they are cancelled when the ViewModel is cleared, so they cannot update a screen that is gone. launch uses the main dispatcher unless told otherwise (withContext(Dispatchers.IO) moves work), there is no automatic retry, and nothing survives process death.'),
      mcq('In Kotlin, trips.filter { it.fare < 1000 } is valid without parentheses. Why?', [
        ['A lambda that is the last argument can go outside the parentheses, and then they can be dropped', true],
        ['filter is a keyword in Kotlin, like if or when, so it takes a block directly after it', false],
        ['Kotlin infers parentheses for any function call whose argument fits on one line', false],
        ['it is a reserved variable that turns the braces into a filter expression', false],
      ], 'Trailing lambda syntax moves a final lambda argument outside the parentheses, and empty parentheses can then be omitted; Compose\'s Column { } uses the same rule. filter is an ordinary extension function, Kotlin does not infer parentheses, and it is just the implicit name of a single lambda parameter.'),
    ],
  },
  /* ── ANDROID_PROJECT ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_ANDROID_NATIVE_ANDROID_PROJECT',
    notes: `Every React Native app that reaches a phone is an Android app: a native project that Gradle builds into an APK or
AAB, with your JavaScript bundle inside. In an Expo project using Continuous Native Generation (CNG) you may never
see that project, because npx expo prebuild (or EAS Build, in the cloud) generates the android folder from app.json
and your config plugins. In a bare React Native CLI project the android folder is committed and you edit it. Either
way, when a build fails, the error is about this folder, so you need to read it.

(Files and commands here follow the React Native template and the Expo and Android documentation. No Android SDK or
Gradle was available where these notes were written, so error messages are shown as "what you will see", in their
typical wording, not as output from a run.)

## The map

    android/
      settings.gradle            which projects are in the build; autolinked native libraries are added here
      build.gradle               the root: repositories, plugin versions, shared SDK levels
      gradle.properties          switches: newArchEnabled, hermesEnabled, org.gradle.jvmargs (Gradle's memory)
      gradle/wrapper/gradle-wrapper.properties   the Gradle version ./gradlew downloads
      gradlew, gradlew.bat       the wrapper: always build with this, not a globally installed gradle
      local.properties           sdk.dir=... for this machine only; never committed
      app/
        build.gradle             applicationId, versionCode, versionName, signing, build types, dependencies
        proguard-rules.pro       keep rules for R8 in release builds
        src/main/AndroidManifest.xml
        src/main/java/com/safarseat/app/MainActivity.kt, MainApplication.kt
        src/main/res/            strings, colours, styles, launcher icons (mipmap-*), drawables

Think of it in JavaScript terms. Gradle is npm plus your bundler: app/build.gradle's dependencies block is
package.json ("implementation" is a dependency, Maven Central and Google's repository are the registry), and the
wrapper pins Gradle's version the way a lockfile pins packages. The Android Gradle Plugin (AGP) is the part that
knows how to build Android, and it needs a particular JDK; a JDK mismatch is one of the commonest build failures.

## SDK levels and identity

Three numbers, usually set once in the root build.gradle and read by app/build.gradle:

- **minSdkVersion**: the oldest Android version the app installs on. Raise it and older phones cannot install.
- **compileSdkVersion**: the API level you compile against, so newer APIs exist for the compiler.
- **targetSdkVersion**: the Android behaviour you have opted into (permissions, background limits). The Play Store
  requires it to be recent; check the current requirement on the Play Console help page rather than remembering one.

In an Expo app you change these through the expo-build-properties config plugin, not by editing the generated
file, which the next prebuild would overwrite.

Two names are easy to confuse. **applicationId** (android.package in app.json, such as com.safarseat.app) is the
app's identity on the phone and on the Play Store; change it after release and you have published a different app.
**namespace** is the Kotlin/Java package for generated classes like R and BuildConfig. **versionCode** is an integer
that must go up with every upload; **versionName** ("2.3.0") is what users see.

## The manifest

AndroidManifest.xml is what the system reads before running any of your code:

    <manifest xmlns:android="http://schemas.android.com/apk/res/android">
      <uses-permission android:name="android.permission.INTERNET" />
      <application android:name=".MainApplication" android:label="@string/app_name"
                   android:icon="@mipmap/ic_launcher" android:allowBackup="false">
        <activity android:name=".MainActivity" android:exported="true"
                  android:launchMode="singleTask"
                  android:configChanges="keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode">
          <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
          </intent-filter>
        </activity>
      </application>
    </manifest>

Permissions, the application class, each activity, deep-link intent filters (your scheme://), services and
receivers all live here. Every library brings its own manifest and Gradle **merges** them into one; that is how a
camera library adds the CAMERA permission without you writing it, and also how you get permissions you did not ask
for. In Expo, android.permissions and android.blockedPermissions in app.json control the result.

## Activities and their lifecycle

An activity is one screen-owning window. A React Native app is usually one activity, MainActivity, and every
React screen is drawn inside it. The system drives it through callbacks:

    onCreate -> onStart -> onResume        (visible and interactive: AppState "active")
    onPause -> onStop                       (another app on top: AppState "background")
    onDestroy                               (finishing, or being recreated)

Two facts cause most surprises. First, a configuration change (rotation, dark mode, font size) destroys and
recreates an activity by default; React Native's template lists those changes in android:configChanges so the
activity, and your JavaScript state, survive. A pure native screen must handle it itself, which is what "State That
Survives a Rotation" warned about in Year 3. Second, in the background the OS can kill the whole process without
calling onDestroy, so anything that must survive is saved when you go to the background, not on destroy.

## Resources

res/ holds things the system picks by device: values/strings.xml (and values-hi/strings.xml for Hindi),
mipmap-mdpi through mipmap-xxxhdpi for launcher icons at each density, drawable/ for images, values/styles.xml for
the theme. Code refers to them through the generated R class: R.string.app_name. Expo generates icons and the splash
screen from app.json, so in CNG you change the source image, not the mipmap folders.

## Why a build fails, and how to read it

Build from the command line once, so you see the real error rather than an IDE summary:

    cd android && ./gradlew assembleDebug        # or: npx expo run:android from the project root

Gradle prints a "What went wrong" block; read the first one, not the last line. Typical failures, with the wording
you will see:

- **No SDK.** "SDK location not found. Define a valid SDK location with an ANDROID_HOME environment variable or by
  setting the sdk.dir path in your project's local properties file." Install the SDK and set ANDROID_HOME.
- **Wrong JDK.** A message that the Android Gradle plugin requires a newer Java than the one running Gradle. Point
  JAVA_HOME at the JDK the docs name for your React Native version.
- **minSdk conflict.** "Manifest merger failed : uses-sdk:minSdkVersion ... cannot be smaller than version ...
  declared in library ...". A library needs a newer Android than your minSdk; raise minSdk (in Expo, through
  expo-build-properties) or pick another library.
- **Out of memory.** "Java heap space" or the daemon expiring. Raise org.gradle.jvmargs in gradle.properties.
- **Duplicate class.** Two dependencies ship the same class; ./gradlew app:dependencies shows who pulls in what.

After adding a native library, regenerate: npx expo prebuild --clean (CNG) or ./gradlew clean (bare). At runtime, crashes in native code appear in adb logcat, not in Metro; filter
with adb logcat *:E for errors, and the ReactNativeJS tag holds your console output.`,
    workedExample: `**Scenario.** SafarSeat adds a library for live bus tracking. The next local Android build fails, and a teammate
pastes the first "What went wrong" block (typical wording):

    Manifest merger failed : uses-sdk:minSdkVersion 23 cannot be smaller than version 26 declared in
    library [:bus-tracker-sdk]

The project uses Expo with CNG, so android/ is generated and not committed.

**Step 1: read it literally.** The app installs on Android versions down to API level 23. The library declares
that it needs at least 26. Gradle refuses rather than ship an app that would crash on older phones when the library
calls an API that does not exist there.

**Step 2: what not to do.** Editing android/app/build.gradle or root build.gradle by hand "works" until the next
npx expo prebuild --clean or EAS Build regenerates the folder and the fix disappears. Adding tools:overrideLibrary in
the manifest silences the check and moves the crash to the users on old phones.

**Step 3: decide with data.** Raising minSdk drops the oldest phones. Check what share of SafarSeat's users are on
those versions (Play Console's device catalogue and your analytics); for a bus app used on budget phones in smaller
towns this is a business decision, not a developer's alone. Here it is a small share, and live tracking is a
headline feature, so the team agrees to raise it.

**Step 4: change it the supported way.** In app.json:

    "plugins": [
      ["expo-build-properties", { "android": { "minSdkVersion": 26 } }]
    ]

**Step 5: regenerate and rebuild.** npx expo prebuild --clean, then npx expo run:android (or a new EAS development
build). Open android/app/build.gradle in the generated project only to confirm the value came through.

**Step 6: record it.** A line in the changelog and the release notes: "Minimum Android version raised; reason:
bus-tracker-sdk." The next person who sees the number will know it was a decision, not an accident.`,
    mcqs: [
      mcq('A SafarSeat developer fixes a build by editing android/app/build.gradle in an Expo project that uses Continuous Native Generation. The fix vanishes after the next EAS Build. Why?', [
        ['The android folder is regenerated from app.json and config plugins on prebuild', true],
        ['EAS Build ignores any Gradle files and compiles the app with its own fixed template', false],
        ['Gradle caches the previous build file, so the edit applies only on the second build', false],
        ['Edits to app/build.gradle need a matching change in the root build.gradle to persist', false],
      ], 'In CNG the native folders are output, not source: prebuild generates them from app.json and plugins, so lasting changes go there. EAS does build with Gradle, there is no "second build" cache rule, and the root file has nothing to do with it.'),
      mcq('Which pair is correct about applicationId and versionCode?', [
        ['applicationId is the app\'s identity on the store; versionCode must go up on each upload', true],
        ['applicationId can change between releases; versionCode is the text users see in the store', false],
        ['applicationId is the Kotlin package of MainActivity; versionCode is set by the Play Store', false],
        ['applicationId only matters for debug builds; versionCode resets with each new versionName', false],
      ], 'Changing applicationId after release creates a different app, and versionCode is an integer that must increase for every upload. versionName is the text users see, the Kotlin package is the namespace, and versionCode does not reset.'),
      mcq('SafarSeat rotates from portrait to landscape and the React Native screen keeps its state. A pure native activity in another app loses its form text on rotation. What explains the difference?', [
        ['React Native\'s MainActivity lists those changes in android:configChanges, so it is not recreated', true],
        ['Hermes saves the whole JavaScript heap into a Bundle before every rotation of the phone', false],
        ['React Native apps are locked to portrait, so the phone never actually rotates the activity', false],
        ['Android never recreates activities on rotation; the native app has a different bug', false],
      ], 'By default a configuration change destroys and recreates the activity; React Native\'s template declares the changes in configChanges and handles them itself, so the JavaScript state stays. Hermes does not serialise the heap, RN apps can rotate, and recreation on rotation is Android\'s default.'),
    ],
    checkpoint: [
      mcq('A fresh clone of a bare React Native project fails with "SDK location not found". Which file or setting is the fix about?', [
        ['ANDROID_HOME or sdk.dir in local.properties, pointing at the Android SDK', true],
        ['minSdkVersion in the root build.gradle, which must match the installed SDK', false],
        ['The distributionUrl in gradle-wrapper.properties, which says where Gradle is', false],
        ['The package attribute in AndroidManifest.xml, which locates the SDK classes', false],
      ], 'Gradle needs to know where the Android SDK is installed, from ANDROID_HOME or sdk.dir in the machine-specific local.properties. minSdk is about supported phones, the wrapper URL is about Gradle itself, and the manifest does not locate the SDK.'),
      mcq('The build fails with a manifest merger error: minSdkVersion cannot be smaller than the version declared in a library. What is the sound first step in an Expo CNG project?', [
        ['Decide whether to raise minSdk, then set it through expo-build-properties', true],
        ['Add tools:overrideLibrary to the manifest so the merger stops complaining', false],
        ['Edit minSdkVersion directly in the generated android/build.gradle file', false],
        ['Lower the library\'s own minSdk by editing its file inside node_modules', false],
      ], 'The library really needs that API level, so either the app supports fewer old phones or uses another library; in CNG the setting goes through the config plugin so it survives prebuild. Overriding hides a real crash, generated files are overwritten, and editing node_modules is lost on install.'),
      mcq('SafarSeat crashes on launch in a release build, and Metro shows nothing. Where does the native stack trace appear?', [
        ['In adb logcat from the device, filtered to errors', true],
        ['In the Metro terminal after reloading the bundle', false],
        ['In the React Native DevTools console tab on the laptop', false],
        ['In android/app/build/outputs, next to the APK file', false],
      ], 'A release build is not connected to Metro or DevTools, and native crashes are logged by the system, so adb logcat (for example with *:E) is where the stack trace is. The build outputs folder holds artifacts, not runtime logs.'),
    ],
  },
  /* ── COMPOSE ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_ANDROID_NATIVE_COMPOSE',
    notes: `Jetpack Compose is Android's declarative UI toolkit, and it will feel familiar: UI is a function of state, you
describe what the screen should look like, and the framework updates it when the state changes. You will meet it in
a React Native job when a library ships a native view, when a native module needs a small screen (a document scanner,
a payment confirmation), or when a team keeps one feature native. (Compose code here was written from
developer.android.com and not compiled; there is no Android toolchain on the machine these notes were written on.)

## React to Compose, side by side

    React Native                               Jetpack Compose
    function SeatChip(props) { return ... }    @Composable fun SeatChip(...) { ... }
    props                                      function parameters
    children                                   a trailing content: @Composable () -> Unit parameter
    useState                                   var x by remember { mutableStateOf(...) }
    re-render                                  recomposition
    View / Text / Pressable                    Box, Column, Row / Text / Modifier.clickable
    style={...}                                modifier = Modifier.padding(...).background(...)
    FlatList with keyExtractor                 LazyColumn { items(list, key = { it.id }) { ... } }
    useEffect(() => {...}, [id])               LaunchedEffect(id) { ... }
    effect cleanup                             DisposableEffect(key) { ...; onDispose { ... } }
    a store or TanStack Query                  a ViewModel exposing StateFlow

A composable returns nothing: calling Text("Hi") emits UI into the tree, like a component returning JSX. Names
start with a capital letter by convention, as components do.

## A screen

    @Composable
    fun SeatPickerScreen(trip: Trip, onContinue: (List<Int>) -> Unit) {
        var selected by remember { mutableStateOf(setOf<Int>()) }

        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            Text("\${trip.to} - Rs \${trip.fare} per seat", style = MaterialTheme.typography.titleMedium)
            LazyColumn(modifier = Modifier.weight(1f)) {
                items(trip.seats, key = { it.number }) { seat ->
                    SeatRow(
                        seat = seat,
                        selected = seat.number in selected,
                        onToggle = {
                            selected = if (seat.number in selected) selected - seat.number
                                       else selected + seat.number
                        },
                    )
                }
            }
            Button(onClick = { onContinue(selected.sorted()) }, enabled = selected.isNotEmpty(),
                   modifier = Modifier.fillMaxWidth()) {
                Text("Continue with \${selected.size} seats")
            }
        }
    }

    @Composable
    fun SeatRow(seat: Seat, selected: Boolean, onToggle: () -> Unit) {
        Row(
            modifier = Modifier.fillMaxWidth().clickable(enabled = !seat.booked, onClick = onToggle).padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Seat \${seat.number}", modifier = Modifier.weight(1f))
            if (seat.booked) Text("Booked") else Checkbox(checked = selected, onCheckedChange = { onToggle() })
        }
    }

Read it as React. selected is state; the by keyword (with the getValue and setValue imports) lets you read and
assign it like a variable. Each tap assigns a new set, so Compose sees a new value and recomposes what read it,
exactly like calling setSelected with a new Set. SeatRow is stateless: it receives selected and onToggle, which
Compose calls **state hoisting** and React calls lifting state up. Column and Row are flex column and row,
Modifier.weight(1f) is flex: 1, and dp is the same density-independent unit as React Native's numbers.

## remember, and why plain variables reset

A composable runs again on every recomposition. A plain var count = 0 inside it is reset each time, like a let
inside a component body. remember stores a value in the composition so it survives recomposition, like useState or
useRef. remember does not survive the activity being recreated (rotation in a pure native activity) or the process
being killed; rememberSaveable does, by saving into the activity's saved state Bundle, which is what "State That
Survives a Rotation" asked for. Use it for small values a user typed or chose; keep big data in a ViewModel.

## Do not mutate state in place

    val selected = remember { mutableListOf<Int>() }     // a plain list: Compose cannot observe add()
    selected.add(14)                                      // the data changes; nothing recomposes

This is React's "do not mutate state" rule with the same symptom: the value is right and the screen is stale.
Either keep an immutable value in mutableStateOf and assign a new one (as SeatPickerScreen does), or use
mutableStateListOf, which is an observable list.

## Lists

LazyColumn is FlatList: it composes only the rows on screen. Give items a key, for the same reason you give
FlatList a keyExtractor: without it, state inside a row follows the position, not the item, when the list changes.
A Column with a forEach over a thousand trips composes all thousand, which a budget phone will feel.

## Side effects

    LaunchedEffect(trip.id) {                 // runs when it enters, re-runs when trip.id changes
        viewModel.loadSeats(trip.id)          // a suspend call; cancelled if the key changes or the screen leaves
    }

Never call a network function directly in a composable body; recomposition may call the body many times, just as
fetching in a component body runs on every render.

## State that outlives the screen: ViewModel and StateFlow

    class SeatsViewModel(private val repo: SeatRepository) : ViewModel() {
        private val _state = MutableStateFlow<SeatsState>(SeatsState.Loading)
        val state: StateFlow<SeatsState> = _state

        fun load(tripId: String) = viewModelScope.launch {
            _state.value = try { SeatsState.Ready(repo.tripWithSeats(tripId)) }
                           catch (e: IOException) { SeatsState.Error("No connection") }
        }
    }

    @Composable
    fun SeatsRoute(vm: SeatsViewModel = viewModel()) {
        val state by vm.state.collectAsStateWithLifecycle()
        when (val s = state) {
            SeatsState.Loading -> CircularProgressIndicator()
            is SeatsState.Ready -> SeatPickerScreen(s.trip, onContinue = { /* navigate */ })
            is SeatsState.Error -> Text(s.message)
        }
    }

The ViewModel survives configuration changes, its coroutines are cancelled when it is cleared, and
collectAsStateWithLifecycle stops collecting while the app is in the background. That is the same split you made in
React Native: screens render state, a separate layer owns loading and errors.

A Compose screen is set in an activity with setContent { SafarSeatTheme { SeatsRoute() } } in onCreate, and
@Preview shows a composable in Android Studio without running the app, like a Storybook story.

## Common mistakes

- State declared without remember, so it resets on every recomposition.
- Mutating a list or object inside state instead of assigning a new value.
- Work in the composable body (logging an analytics event, starting a request) that runs on every recomposition.
- Modifier order: padding then background leaves the padding uncoloured; background then padding colours it.`,
    workedExample: `**Scenario.** A teammate's passenger-name field in a native SafarSeat screen "does not type". Letters appear for
a moment and vanish. The code:

    @Composable
    fun PassengerForm(onSubmit: (String) -> Unit) {
        var name = ""
        Column {
            OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Passenger name") })
            Button(onClick = { onSubmit(name) }) { Text("Save") }
        }
    }

**Step 1: compare with React Native.** OutlinedTextField is a controlled input, like a TextInput with value and
onChangeText. It shows whatever value is. The callback assigns name, but name is a plain local variable.

**Step 2: what really happens.** Assigning a plain var does not tell Compose anything, so nothing recomposes and
the field keeps showing "". When something else recomposes this function, name is reset to "" anyway, because the
body runs again from the top. React has the same trap with a let inside a component.

**Step 3: the fix.**

    var name by remember { mutableStateOf("") }

mutableStateOf makes the value observable, so assigning it schedules a recomposition of the code that reads it;
remember keeps it across recompositions.

**Step 4: the next question, rotation.** In a pure native activity without configChanges, rotating the phone
recreates the activity and remember starts again from "". A user halfway through typing a name loses it. Use
rememberSaveable { mutableStateOf("") } instead; a String fits in the saved-state Bundle.

**Step 5: hoist it if a parent needs it.** If the form is part of a larger booking screen, move the state up:
PassengerForm(name = name, onNameChange = { name = it }, onSubmit = ...). The form becomes stateless and can be
previewed with @Preview and any name, the same benefit a stateless React component has in a test.

**Result.** One word (remember), one function (mutableStateOf), and a decision about whether the value must survive
recreation, which is the same set of decisions as useState plus "should this persist" in React Native.`,
    mcqs: [
      mcq('A SafarSeat composable keeps selected seats in val selected = remember { mutableListOf<Int>() } and calls selected.add(n) on tap. The data changes but the screen does not. What is the fix?', [
        ['Hold an immutable set in mutableStateOf and assign a new one, or use mutableStateListOf', true],
        ['Call recompose() on the parent composable after each add so the screen is redrawn', false],
        ['Replace remember with rememberSaveable so that changes to the list are observed', false],
        ['Move selected outside the composable function into a top-level var in the same file', false],
      ], 'Compose only recomposes when it observes a state change, and a plain list\'s add is invisible to it, just as mutating state is invisible to React. There is no public recompose() for this, rememberSaveable changes survival rather than observability, and a top-level var is not observed either.'),
      mcq('Which Compose API plays the role of a React effect with a dependency array that fetches when the trip id changes?', [
        ['LaunchedEffect(trip.id) { ... }', true],
        ['remember(trip.id) { load() }', false],
        ['derivedStateOf { trip.id }', false],
        ['SideEffect { load(trip.id) }', false],
      ], 'LaunchedEffect runs a coroutine when it enters the composition and restarts it when its key changes, cancelling the old one, which is useEffect with [id]. remember with a key caches a value and would run the load during composition, derivedStateOf computes values, and SideEffect runs after every successful recomposition.'),
      mcq('Why does a seat list built as Column { seats.forEach { SeatRow(it) } } struggle on a budget phone when a bus has many seats and the screen also lists trips?', [
        ['Column composes every row at once, while LazyColumn composes only visible rows', true],
        ['Column draws its children with the CPU, while LazyColumn always draws with the GPU', false],
        ['forEach runs on the main thread, while items in LazyColumn run on a worker thread', false],
        ['Column cannot reuse the Checkbox composable, so it loads a new copy for every seat', false],
      ], 'LazyColumn is the FlatList of Compose: it composes and lays out only the items in view. Both are drawn the same way, composition happens on the main thread in both, and composables are functions, not copies to load.'),
    ],
    checkpoint: [
      mcq('In Compose, what is state hoisting, in React terms?', [
        ['Lifting state up: the child takes a value and a change callback', true],
        ['Moving state into a global store that every screen can reach', false],
        ['Saving state into a Bundle so it survives the activity restarting', false],
        ['Declaring state at the top of the file, above all composables', false],
      ], 'Hoisting makes a composable stateless by passing the value and an onChange down from the caller, exactly like lifting state up in React. A store, a saved Bundle and top-level variables are different things.'),
      mcq('A pure native Compose screen loses the passenger name when the phone is rotated. The state is var name by remember { mutableStateOf("") }. What fixes it?', [
        ['rememberSaveable, so the value is saved and restored across recreation', true],
        ['A LaunchedEffect that reads the name again after the rotation finishes', false],
        ['Making name a val, so that the activity cannot reset it on recreation', false],
        ['Wrapping the screen in a key block so the composition is not replaced', false],
      ], 'Rotation recreates the activity, and remember lives in the composition, which is rebuilt; rememberSaveable writes the value into saved state. An effect has nothing to read back, val would make it unassignable, and key does not stop the activity being recreated.'),
      mcq('Why does a Compose screen collect a ViewModel\'s StateFlow with collectAsStateWithLifecycle rather than reading it in a loop?', [
        ['It turns the flow into state that recomposes, and pauses while the app is in the background', true],
        ['It converts the StateFlow into a LiveData so that it can be read from Java code later', false],
        ['It caches every value the flow ever emitted, so the screen can show history on Back', false],
        ['It runs the ViewModel\'s coroutines on the IO dispatcher so the UI thread stays free', false],
      ], 'Collecting turns the latest value into Compose state, so changes recompose the readers, and the lifecycle-aware version stops collecting when the screen is not at least started. It does not create LiveData, keep history, or change the ViewModel\'s dispatchers.'),
    ],
  },
  /* ── NATIVE_MODULES ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_ANDROID_NATIVE_NATIVE_MODULES',
    notes: `On 3 GB phones SafarSeat's seat map stutters and the app is often killed in the background. Product wants a "lite
mode" (fewer animations, smaller images) when the phone is low on memory or in battery saver. JavaScript cannot ask
Android either question, so this lesson writes a native module, DeviceTier, with the Expo Modules API: Kotlin, a
typed TypeScript side, a hook and a config plugin.

(The TypeScript, the hook and the config plugin were type-checked and run under Jest here. The Kotlin was written
from docs.expo.dev and checked against the expo-modules-core sources, but not compiled: no Android toolchain.)

## When to write native code at all

In order: an Expo SDK module, a maintained community library, then your own. Write one when an Android API has no
library (as here), a vendor ships only an Android SDK, or work is too heavy for JavaScript. The cost: Kotlin and
Swift to maintain, upgrades you own, and a development build, because Expo Go contains only Expo's native code.
Core React Native offers Turbo Native Modules with Codegen; this track uses the **Expo Modules API**, a Kotlin and
Swift DSL on JSI that also works in bare apps that install expo. The ideas carry over.

## Create it

    npx create-expo-module@latest --local      # name it device-tier

    modules/device-tier/
      expo-module.config.json, index.ts, src/DeviceTierModule.ts, src/DeviceTier.types.ts
      android/src/main/java/expo/modules/devicetier/DeviceTierModule.kt, android/build.gradle

expo-module.config.json tells autolinking which class to register:

    { "platforms": ["android"], "android": { "modules": ["expo.modules.devicetier.DeviceTierModule"] } }

## The Kotlin side

    // imports omitted: android.app.ActivityManager, android.content.*, android.os.*, expo.modules.kotlin.*
    class DeviceTierModule : Module() {
        private val context: Context
            get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()
        private var receiver: BroadcastReceiver? = null

        override fun definition() = ModuleDefinition {
            Name("DeviceTier")
            Events("onPowerSaveChanged")

            Constant("isLowRamDevice") { activityManager().isLowRamDevice || totalMb() < liteBelowMb() }

            Function("isPowerSaveMode") { powerManager().isPowerSaveMode }

            AsyncFunction("getMemoryInfo") {
                val info = ActivityManager.MemoryInfo().also { activityManager().getMemoryInfo(it) }
                mapOf("totalMb" to info.totalMem / MB, "availableMb" to info.availMem / MB, "lowMemory" to info.lowMemory)
            }

            OnStartObserving {                      // the first JS listener was added
                val r = object : BroadcastReceiver() {
                    override fun onReceive(c: Context, i: Intent) {
                        sendEvent("onPowerSaveChanged", mapOf("enabled" to powerManager().isPowerSaveMode))
                    }
                }
                val filter = IntentFilter(PowerManager.ACTION_POWER_SAVE_MODE_CHANGED)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU)
                    context.registerReceiver(r, filter, Context.RECEIVER_NOT_EXPORTED)
                else context.registerReceiver(r, filter)
                receiver = r
            }
            OnStopObserving {                       // the last JS listener was removed
                receiver?.let { context.unregisterReceiver(it) }
                receiver = null
            }
        }

        private fun activityManager() = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        private fun powerManager() = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        private fun totalMb() = ActivityManager.MemoryInfo().also { activityManager().getMemoryInfo(it) }.totalMem / MB
        private companion object {
            const val MB = 1024L * 1024L
            const val KEY = "expo.modules.devicetier.LITE_BELOW_MB"     // written by the config plugin
        }
    }

In JavaScript: Name is what requireNativeModule looks up; Constant is a read-only property; Function is
synchronous on the JavaScript thread, so only cheap calls; AsyncFunction returns a Promise and runs off that
thread, for anything slow. Maps become objects, numbers, booleans and strings convert, and a thrown exception (a
CodedException carries a stable code) becomes a rejected Promise. Registering the receiver only while someone
listens avoids waking the app for nothing ("What Is Draining the Battery"). liteBelowMb() is shown below.

## The TypeScript side

    // src/DeviceTierModule.ts
    import { NativeModule, requireOptionalNativeModule } from 'expo';
    import type { DeviceTierEvents, MemoryInfo } from './DeviceTier.types';

    declare class DeviceTierModule extends NativeModule<DeviceTierEvents> {
      readonly isLowRamDevice: boolean;
      isPowerSaveMode(): boolean;
      getMemoryInfo(): Promise<MemoryInfo>;
    }

    // null in Expo Go, on web and in a build made before the module was added
    export default requireOptionalNativeModule<DeviceTierModule>('DeviceTier');

The declare class is a promise about what Kotlin provides; nothing checks it against the Kotlin. requireNativeModule would throw if the module is missing; the run here printed

    required: Cannot find native module 'DeviceTier'

so this module uses the optional version and lets the app fall back. In return, tsc forces every caller to handle
null; using it unguarded gave the real error

    error TS18047: 'DeviceTier' is possibly 'null'.

and a misspelt event name gave Argument of type '"onPowerSaveChange"' is not assignable to parameter of type
'"onPowerSaveChanged"'.

## A hook the app uses

    export function useLiteMode(): LiteMode {
      const [powerSave, setPowerSave] = useState(() => DeviceTier?.isPowerSaveMode() ?? false);
      useEffect(() => {
        if (!DeviceTier) return;
        const sub = DeviceTier.addListener('onPowerSaveChanged', e => setPowerSave(e.enabled));
        return () => sub.remove();
      }, []);
      if (!DeviceTier) return { lite: false, reason: 'unavailable' };
      return decide(DeviceTier.isLowRamDevice, powerSave);
    }

Screens call useLiteMode(), never the module, so jest.mock can replace the module with a fake. Four tests passed
in the real run: low RAM gives lite mode at first render, the event switches it on, no listener is left after
unmount ("listeners after unmount: 0"), and no module gives 'unavailable'. With the plugin tests:
"Tests: 8 passed, 8 total".

## The config plugin

The lite threshold is set in app.json and written into the manifest at prebuild:

    // app.plugin.js
    const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');
    const KEY = 'expo.modules.devicetier.LITE_BELOW_MB';
    const withDeviceTier = (config, props) => {
      const liteBelowMb = (props && props.liteBelowMb) || 3072;
      return withAndroidManifest(config, cfg => {
        const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
        AndroidConfig.Manifest.addMetaDataItemToMainApplication(app, KEY, String(liteBelowMb));
        return cfg;
      });
    };
    module.exports = withDeviceTier;

    // app.json
    "plugins": [["./modules/device-tier/app.plugin.js", { "liteBelowMb": 4096 }]]

Run against a sample manifest it produced this, took 4096 from props, and left one entry when run twice:

    [{"$":{"android:name":"expo.modules.devicetier.LITE_BELOW_MB","android:value":"3072"}}]

The module's liteBelowMb() reads it back:

    private fun liteBelowMb(): Int {
        val pm = context.packageManager
        val info = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU)
            pm.getApplicationInfo(context.packageName,
                PackageManager.ApplicationInfoFlags.of(PackageManager.GET_META_DATA.toLong()))
        else @Suppress("DEPRECATION") pm.getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
        return info.metaData?.getInt(KEY, 3072) ?: 3072
    }

getInt, not getString: Android stores a numeric android:value as an integer, and getString would return null.

After native changes a JavaScript reload is not enough: rebuild with npx expo run:android or a new EAS
development build.`,
    workedExample: `**Scenario.** QA reports that SafarSeat's lite mode "never turns on" on a test phone in battery saver. You have the
module from the lesson. Work through it in order, cheapest check first.

**1. Is the module in this binary at all?** The hook returns reason 'unavailable' when requireOptionalNativeModule
gives null. Show the reason on a hidden debug screen. It says 'unavailable': QA installed a development build made
last week, before DeviceTier was added. JS updates do not add native code. Fix: a new development build.

**2. New build, still off. Is the initial value right?** useState(() => DeviceTier?.isPowerSaveMode() ?? false)
reads battery saver once, at mount. QA turned battery saver on after opening the app, so the initial value was
false. That is expected; the event should flip it.

**3. Does the event arrive?** Add a temporary listener that logs, and watch adb logcat for the ReactNativeJS tag
while toggling battery saver. Nothing. On the Kotlin side, OnStartObserving registers the receiver only when the
first JS listener is added; a log line in it shows it never runs.

**4. Why not?** The TypeScript declares DeviceTierEvents with 'onPowerSaveChanged', but the Kotlin had
Events("onPowerSaveChange"), one letter shorter. tsc cannot see Kotlin, so nothing complained; the listener was
added for a name Kotlin never declared. Rename in Kotlin to match, rebuild.

**5. Lock it down.** Two cheap guards:

- Keep event names in one place per side and add a comment pointing at the other file. Code review checks both.
- A Jest test (as in the lesson) proves the JS behaviour: with the fake module, firing onPowerSaveChanged with
  enabled: true gives { lite: true, reason: 'power-save' }. That test passed in the real run. It cannot prove the
  Kotlin sends the event; a manual check on a device, written in the PR, covers that.

**Result.** Three different causes looked identical to QA: no module in the binary, a value read only at mount, and
an event name mismatch across the language boundary. The order of checks (binary, initial value, event) found each
in minutes. The lesson for any native module is that the JS-native boundary is untyped at runtime; your
TypeScript declaration is only as true as your discipline keeps it.`,
    mcqs: [
      mcq('In the DeviceTier module, why is getMemoryInfo an AsyncFunction while isPowerSaveMode is a Function?', [
        ['Function runs synchronously on the JS thread, so only cheap calls belong there', true],
        ['AsyncFunction is the only kind that can return a Kotlin Map as a JavaScript object', false],
        ['Function can only return booleans, so any richer result must use AsyncFunction', false],
        ['AsyncFunction is required for anything that calls getSystemService on Android', false],
      ], 'A synchronous Function blocks the JavaScript thread until it returns, so it suits instant lookups; work that may take time belongs in an AsyncFunction, which returns a Promise. Both kinds can return maps and other types, and getSystemService is not restricted to either.'),
      mcq('SafarSeat\'s TypeScript uses requireOptionalNativeModule for DeviceTier. What does that buy, compared with requireNativeModule?', [
        ['The app falls back when the module is absent, and tsc makes callers handle null', true],
        ['The module is loaded lazily on first use, which makes the app start noticeably faster', false],
        ['Expo Go downloads the module on demand, so a development build is no longer needed', false],
        ['The Kotlin and TypeScript signatures are checked against each other during the build', false],
      ], 'requireNativeModule throws "Cannot find native module" when the binary lacks it; the optional form returns null, and its type forces each caller to guard, as the real TS18047 error showed. It is not about lazy loading, Expo Go cannot download native code, and nothing checks Kotlin against TypeScript.'),
      mcq('A developer adds a field to the Kotlin module, saves, and presses r in Metro. The JS side reports the property as undefined. What is missing?', [
        ['A native rebuild, such as npx expo run:android or a new development build', true],
        ['Restarting Metro with --clear, so that the new native Kotlin code is bundled', false],
        ['Adding the new field to expo-module.config.json under android modules', false],
        ['Running npx expo prebuild --clean so that autolinking picks up the field', false],
      ], 'Kotlin is compiled into the app binary, so changes need a new native build; reloading only fetches a new JavaScript bundle. Metro never bundles Kotlin, the config file lists module classes rather than fields, and prebuild regenerates native project files but does not compile or install anything by itself.'),
    ],
    checkpoint: [
      mcq('What should a React Native developer check before writing a native module for a device feature?', [
        ['Whether an Expo SDK module or a maintained library already does it', true],
        ['Whether the feature can be built inside Expo Go without any rebuild', false],
        ['Whether the Turbo Module spec has already been published to npm', false],
        ['Whether the phone has a Kotlin runtime installed for the module', false],
      ], 'Your own native code means maintaining Kotlin and Swift and owning upgrades, so an existing Expo or community module comes first. Expo Go cannot load custom native code at all, there is no spec to wait for, and Kotlin compiles into the app, so phones need no runtime.'),
      mcq('In an Expo module, what are OnStartObserving and OnStopObserving for in DeviceTier?', [
        ['Registering the Android receiver only while some JS code is listening', true],
        ['Starting and stopping the module when the app enters the background', false],
        ['Logging whenever the JS side starts and stops calling any function on it', false],
        ['Converting the event payload from a Kotlin Map into a JS object', false],
      ], 'They run when the first listener is added and the last one removed, so the broadcast receiver exists only when needed. App background changes have their own lifecycle hooks, they are not call logging, and payload conversion is automatic.'),
      mcq('Why does DeviceTier\'s threshold travel through a config plugin into the manifest, rather than being edited into android/app/src/main/AndroidManifest.xml?', [
        ['In CNG the manifest is generated, so a plugin re-applies the change on every prebuild', true],
        ['Android rejects any meta-data typed into a manifest by hand that no build tool added', false],
        ['Config plugins encrypt manifest values, so the threshold cannot be read by others', false],
        ['A manifest edit applies to debug builds only, while plugins apply to release builds', false],
      ], 'Generated native files are overwritten by prebuild and EAS Build, so the plugin is how the change survives; the run showed it is idempotent too. Android does not care who wrote the entry, plugins do not encrypt anything, and the main manifest applies to every build type.'),
    ],
  },
  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_ANDROID_NATIVE_DEBUGGING',
    notes: `Six SafarSeat failures from this topic. For each: what you saw, the cause and the smallest fix. The JavaScript-
side failures were reproduced with Jest and tsc and their output is real. The Kotlin, Compose and Gradle ones could
not be run here (no Android toolchain); their messages are shown as "what you will see", in typical wording.

## Bug 1: a crash in Kotlin that compiled cleanly

    val tripId = intent.getStringExtra("tripId")!!
    loadSeats(tripId)

**What you will see** (logcat, typical): java.lang.NullPointerException with a stack trace pointing at this line,
when the activity is opened from a notification that forgot the extra.

**Cause.** getStringExtra is a Java API returning a nullable value; !! turns "maybe null" into a crash. The JDK run
of the same mistake in Java gave: Cannot invoke "String.length()" because "name" is null.

**Fix.** Decide what a missing id means: val tripId = intent.getStringExtra("tripId") ?: return finish() closes
the screen; or show an error. Search the codebase for !! and justify each one.

## Bug 2: seats tick, the screen does not

    val selected = remember { mutableListOf<Int>() }
    Checkbox(checked = seat.number in selected, onCheckedChange = { selected.add(seat.number) })

**Symptom.** Tapping does nothing visible; scrolling the row off screen and back shows it ticked.

**Cause.** A plain MutableList is not observable, so Compose does not recompose on add. Scrolling recomposed the
row for another reason and it read the changed list.

**Fix.** var selected by remember { mutableStateOf(setOf<Int>()) } and assign selected + seat.number, or
mutableStateListOf(). The same rule as React: never mutate state in place.

## Bug 3: "Cannot find native module 'DeviceTier'"

**Symptom.** The app shows a red screen on launch in Expo Go, and in a teammate's older development build.
The message is the one requireNativeModule throws, which the Jest run reproduced exactly:

    required: Cannot find native module 'DeviceTier'

**Cause.** The JavaScript is new; the binary is old. Expo Go contains no custom native code at all, and the old
development build was compiled before the module existed.

**Fix.** Build a new development build (npx expo run:android or EAS). And make the app survive it: use
requireOptionalNativeModule and a fallback, so an old binary degrades instead of crashing.

## Bug 4: the listener that outlives the screen

    useEffect(() => {
      DeviceTier!.addListener('onPowerSaveChanged', e => setPowerSave(e.enabled));
    }, []);

**Symptom.** After visiting the seat map ten times, ten listeners fire on every battery-saver change, and the
Kotlin receiver is never unregistered because the module never sees the last listener go. The test, real output:

    broken: listener leaks after unmount
    Expected: 0
    Received: 1

**Cause.** No cleanup. addListener returns a subscription, and nothing called remove().

**Fix.** const sub = DeviceTier.addListener(...); return () => sub.remove(); With it, the same test printed
"listeners after unmount: 0". The same hook had a second bug: with no module it crashed with the real error
TypeError: Cannot read properties of null (reading 'isPowerSaveMode'), because ! told TypeScript to stop checking.

## Bug 5: the build that worked yesterday

**What you will see** (typical): Manifest merger failed : uses-sdk:minSdkVersion ... cannot be smaller than
version ... declared in library ..., right after adding a library.

**Cause.** The library needs a newer Android than the app's minimum.

**Fix.** Decide whether to raise minSdk; in Expo set it through expo-build-properties and regenerate with
npx expo prebuild --clean. Do not edit the generated build.gradle (the next prebuild undoes it) and do not add
tools:overrideLibrary (that moves the crash to users on old phones).

## Bug 6: state lost on rotation in a native screen

    var name by remember { mutableStateOf("") }

**Symptom.** In a native Compose activity, a half-typed passenger name disappears when the phone rotates.

**Cause.** The activity is recreated on a configuration change, and remember lives in the composition that was
thrown away. (The React Native MainActivity avoids this with android:configChanges; a plain native activity does not.)

**Fix.** rememberSaveable { mutableStateOf("") }, or keep it in a ViewModel, which survives configuration changes.

## The habit

For each: read the first real error, decide which side of the boundary it is on (JavaScript, Kotlin, build), and
reproduce it in the cheapest place available: tsc and Jest for the JavaScript, a unit test or a device for Kotlin.`,
    mcqs: [
      mcq('A notification opens a SafarSeat native activity, and the app crashes with a NullPointerException on val tripId = intent.getStringExtra("tripId")!!. What is the right fix?', [
        ['Handle the missing extra with ?: and decide what the screen does then', true],
        ['Wrap the whole onCreate in try/catch and ignore the exception silently', false],
        ['Replace !! with a lateinit var, which postpones the check until first use', false],
        ['Mark tripId as String instead of String?, which removes the null from it', false],
      ], 'The value can really be absent, so the code must say what happens then, for example finishing or showing an error. Swallowing exceptions hides the bug and leaves the screen broken, lateinit only delays the crash, and declaring String does not stop a Java API returning null.'),
      mcq('After an update, Expo Go shows "Cannot find native module \'DeviceTier\'" on launch. What explains it?', [
        ['Expo Go has no custom native code, so it needs a development build', true],
        ['The module\'s name in TypeScript must be lower-case to match Kotlin', false],
        ['Metro\'s cache holds the old module list and needs --clear to refresh', false],
        ['Autolinking runs only after npm install, so reinstalling all packages fixes it', false],
      ], 'Expo Go ships a fixed set of native modules; a custom Kotlin module exists only in a binary built from your project. The names must match exactly but case is not the issue here, Metro bundles only JavaScript, and reinstalling packages does not put Kotlin into Expo Go.'),
      mcq('A test of the useLiteMode hook fails with Expected: 0, Received: 1 after unmount. Which change makes it pass?', [
        ['Return () => sub.remove() from the effect that calls addListener', true],
        ['Call DeviceTier.removeAllListeners() at the top of every single render', false],
        ['Move addListener out of useEffect into the hook\'s render body', false],
        ['Add the setPowerSave function to the effect\'s dependency array', false],
      ], 'The subscription returned by addListener must be removed in the effect\'s cleanup; the real run printed "listeners after unmount: 0" with it. Removing all listeners each render breaks other subscribers, subscribing in render adds one per render, and a stable setter in the dependencies changes nothing.'),
      mcq('In a native Compose screen, items in a seat list are ticked but only appear ticked after scrolling them away and back. What is the cause?', [
        ['The selection is a plain mutable list, which Compose cannot observe', true],
        ['LazyColumn caches rows for a second before it recomposes any of them', false],
        ['The Checkbox needs a key so that Compose knows which row has changed', false],
        ['onCheckedChange runs on a background thread, so the change is delayed', false],
      ], 'Adding to a plain list changes data without notifying Compose, so only an unrelated recomposition shows it. LazyColumn has no such delay, keys matter for reordering rather than for observing changes, and the callback runs on the main thread.'),
    ],
  },
  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_ANDROID_NATIVE_PRACTICE',
    notes: `Nine exercises, easy to hard. Write your answer before reading the one below it. The Kotlin and Compose answers
are written from the official documentation and were not compiled here; the TypeScript and Jest answers match the
code that was run for this topic.

## 1. Translate (easy)

TypeScript: const seatsLeft = (total: number, booked: number[]) => total - booked.length;

**Answer.** fun seatsLeft(total: Int, booked: List<Int>) = total - booked.size. Note size, not length, for
collections; length is for strings.

## 2. Null handling (easy)

A Kotlin function receives promo: String?. Return the upper-case code, or "NONE" if it is null or blank.

**Answer.** fun code(promo: String?) = promo?.takeIf { it.isNotBlank() }?.uppercase() ?: "NONE". takeIf returns
null when the condition fails, so blank and null meet the same elvis.

## 3. Data class copy (easy)

val t = Trip("t1", "Tirupati", 900). Make a version with fare 850 without changing t.

**Answer.** val cheaper = t.copy(fare = 850). t == cheaper is false (fare differs); t.copy() == t is true.

## 4. Collections (medium)

From trips, list the destinations under Rs 1000, sorted by fare, as a comma-separated string.

**Answer.** trips.filter { it.fare < 1000 }.sortedBy { it.fare }.joinToString(", ") { it.to }. With the lesson's
trips that gives "Vijayawada, Tirupati". In Java the same pipeline, run here, printed under 1000: [Vijayawada,
Tirupati].

## 5. Which file? (medium)

For each change, name where it goes in an Expo CNG project: (a) the minimum Android version, (b) the CAMERA
permission, (c) the number that must rise for each Play upload, (d) Gradle's memory.

**Answer.** (a) expo-build-properties in app.json; (b) android.permissions in app.json, or the camera library's
config plugin; (c) android.versionCode in app.json (or EAS's automatic version increments); (d) gradle.properties
(org.gradle.jvmargs), which in CNG is itself set through expo-build-properties or a plugin. None of them is a hand
edit in android/.

## 6. Lifecycle (medium)

A user opens SafarSeat, switches to their UPI app, and comes back. List the activity callbacks in order, and the
React Native AppState values the JS side sees.

**Answer.** onCreate, onStart, onResume (active); onPause, onStop (background); onRestart, onStart, onResume
(active).
onDestroy is not called just for switching apps; if Android kills the process while it is in the background, it
starts again from onCreate and nothing in memory survived.

## 7. Compose state (medium)

Write a stateless QuantityStepper composable with a value and a change callback, and its caller.

**Answer.**

    @Composable
    fun QuantityStepper(value: Int, onValueChange: (Int) -> Unit) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { onValueChange(value - 1) }, enabled = value > 1) { Text("-") }
            Text("$value", modifier = Modifier.padding(horizontal = 12.dp))
            IconButton(onClick = { onValueChange(value + 1) }, enabled = value < 6) { Text("+") }
        }
    }

    var passengers by rememberSaveable { mutableIntStateOf(1) }
    QuantityStepper(value = passengers, onValueChange = { passengers = it })

## 8. Module function kind (hard)

Choose Function or AsyncFunction for each: (a) is the device in dark mode, (b) hash a 20 MB ticket PDF,
(c) read a constant set at build time, (d) query the Android download manager.

**Answer.** (a) Function, an instant lookup; (b) AsyncFunction, slow work that must not block the JS thread;
(c) Constant, it never changes; (d) AsyncFunction, it is I/O.

## 9. Test the boundary (hard)

Write a Jest test proving that useLiteMode reports 'unavailable' when the native module is missing.

**Answer.** Mock the module file with a getter so each test can change what it returns:

    let mockModule: typeof fake | null = fake;
    jest.mock('./modules/device-tier/src/DeviceTierModule', () => ({
      __esModule: true,
      get default() { return mockModule; },
    }));

    test('with no native module the hook says unavailable instead of crashing', () => {
      mockModule = null;
      const { result } = renderHook(() => useLiteMode());
      expect(result.current).toEqual({ lite: false, reason: 'unavailable' });
    });

This passed in the real run. The getter matters: the hook's module imports DeviceTier once, so a plain
default: fake would freeze the value at import time, while the getter is read on every access and lets one test
switch the module off. Starting the variable's name with mock is Jest's convention for values used inside a
jest.mock factory.`,
    mcqs: [
      mcq('Which Kotlin expression returns the number of seats a passenger booked, given booked: List<Int>?', [
        ['booked.size', true],
        ['booked.length', false],
        ['booked.count', false],
        ['len(booked)', false],
      ], 'Kotlin collections expose size; length belongs to strings, count() is a function (with parentheses) that can take a predicate, and len() is Python. Writing booked.length is a habit carried over from JavaScript arrays.'),
      mcq('A user switches from SafarSeat to their UPI app and back, with no process death. Which two callbacks, in this order, make the activity visible and interactive again?', [
        ['onStart then onResume', true],
        ['onCreate then onResume', false],
        ['onRestart then onCreate', false],
        ['onResume then onStart', false],
      ], 'A stopped activity that comes back to the front goes through onStart and onResume (onRestart also runs first). onCreate runs only when the activity is created again, for example after process death, and onResume always comes after onStart.'),
      mcq('In an Expo CNG project, where should the CAMERA permission for a ticket-scanning feature be declared?', [
        ['In app.json, under android.permissions or via the library\'s plugin', true],
        ['In android/app/src/main/AndroidManifest.xml, added by hand once', false],
        ['In android/gradle.properties as a list of permissions to request', false],
        ['In MainApplication.kt, inside onCreate, before React Native starts up', false],
      ], 'In CNG the manifest is generated from app.json and plugins, so permissions are declared there. A hand edit to the manifest is overwritten on prebuild, gradle.properties holds build switches, and permissions are declared in the manifest, not in code.'),
      mcq('A native module must hash a 20 MB e-ticket PDF on request. How should it be exposed?', [
        ['As an AsyncFunction, returning a Promise to the JS side', true],
        ['As a Function, because hashing needs no network access', false],
        ['As a Constant, computed once when the module is created', false],
        ['As an Event, sent to JS every time the file is changed', false],
      ], 'Hashing a large file takes noticeable time, and a synchronous Function would freeze the JavaScript thread while it runs; AsyncFunction runs off that thread and returns a Promise. A Constant is for values fixed at start, and an event is for pushes, not for answering a request.'),
      mcq('The Jest mock of the DeviceTier file returns get default() { return mockModule; } rather than default: fake. Why the getter?', [
        ['It is read on every access, so a test can set mockModule to null after the import', true],
        ['A getter makes Jest load the real Kotlin module first and fall back to the fake', false],
        ['TypeScript cannot type a plain object as a NativeModule, but it can type a getter', false],
        ['Without a getter, jest-expo replaces the fake with its own automatic mock module', false],
      ], 'The hook file imports the module once; a plain property would freeze whatever was there at import time, while the getter returns the current value of mockModule, which is how the "unavailable" test switches the module off. Jest never loads Kotlin, the typing is unaffected, and jest-expo does not swap out a factory you provided.'),
    ],
  },
  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_ANDROID_NATIVE_INTERVIEW_QUESTION',
    notes: `Four questions React Native interviewers ask about native Android, at product companies and service companies alike,
with an answer that scores well and the follow-up a good interviewer asks next. Practise aloud, about two minutes
each, and use a module or native fix you actually made if you have one.

## Q1. "When would you write a native module, and how?"

**Model answer.** "Only when nothing existing does the job: an Android API with no Expo or community module, a
vendor SDK that only ships for Android, or work too heavy for JavaScript. I would use the Expo Modules API: a Kotlin
class with a ModuleDefinition, where Name is what JS requires, Function is for cheap synchronous calls, AsyncFunction
for anything slow, and Events for pushes. On the TypeScript side I declare the module's shape and load it with
requireOptionalNativeModule, so an old binary or Expo Go degrades instead of crashing. Screens use a hook, never the
module directly, so I can test the JS behaviour with a Jest mock. In a project I wrote a module that reports low RAM
and battery saver so the app can switch to a lite mode."

**Follow-up: "How does the JS call reach Kotlin?"** "In the new architecture through JSI: the module is a host
object the JavaScript engine can call directly, without serialising messages over the old bridge. Arguments and
results are converted: maps become objects, Kotlin numbers and strings become JS numbers and strings, and an
exception becomes a rejected Promise."

## Q2. "Explain recomposition in Jetpack Compose compared with React re-rendering."

**Model answer.** "Both are declarative: UI is a function of state. In React a state change re-renders the
component and its children unless memoised. In Compose, state is held in observable holders like mutableStateOf;
when one changes, Compose re-runs the composables that read it and can skip ones whose inputs are unchanged. The
same rules apply: keep state with remember, the useState equivalent, or rememberSaveable to survive recreation;
hoist state so components are stateless; never mutate a list in place; keep side effects in LaunchedEffect, not in
the body."

**Follow-up: "What survives rotation?"** "remember does not in a plain native activity, because the activity is
recreated; rememberSaveable and a ViewModel do. React Native avoids the problem by declaring configChanges on
MainActivity."

## Q3. "The release build crashes on launch but the debug build works. How do you debug it?"

**Model answer.** "First get the real error: install the release build and read adb logcat, because a release build
is not connected to Metro. Common causes: R8 has removed or renamed a class that a library loads by reflection, so
I check for ClassNotFoundException and add keep rules in proguard-rules.pro; an environment value that is different
in release; or a JavaScript error that only shows in the minified bundle. If the stack trace is obfuscated I
retrace it with the mapping file from that build. Then I add a release smoke test to CI so it does not recur."

**Follow-up: "How would you avoid shipping it in the first place?"** "Test a release build on a real low-end
Android phone before every store upload, not only debug builds."

## Q4. "A teammate edited android/ in our Expo project and the change disappeared. Why, and what is the right way?"

**Model answer.** "With Continuous Native Generation the android folder is generated by prebuild from app.json and
config plugins, so hand edits are overwritten, and EAS Build regenerates it anyway. Settings like SDK levels go
through expo-build-properties; anything else goes in a config plugin that modifies the manifest or Gradle files at
prebuild, written to be idempotent. If a team really needs to hand-maintain native code, they can commit android/
and stop using CNG, but then they own every upgrade of those files."

**Follow-up: "What does a config plugin look like?"** "A function that takes the Expo config and returns it,
wrapping a mod such as withAndroidManifest; inside, it changes the parsed manifest, for example adding a meta-data
entry or a permission."

## How these are scored

Interviewers listen for the order of decisions (existing library first), a reason for each choice, one real example
and the limits: "nothing checks my TypeScript declaration against the Kotlin" is a better answer than pretending
the boundary is safe.`,
    mcqs: [
      mcq('An interviewer asks how a JavaScript call reaches a Kotlin Expo module in the new architecture. Which answer is strongest?', [
        ['Through JSI: the module is a host object that the JS engine calls without a JSON bridge', true],
        ['Metro compiles the Kotlin into JavaScript, so the call is an ordinary function call', false],
        ['Each call is written to a file that the Kotlin side polls for new requests', false],
        ['The call travels over a local WebSocket between Hermes and the Android runtime', false],
      ], 'Expo modules and TurboModules are exposed through JSI, so JavaScript holds references to native objects and calls them directly, with values converted at the boundary. Metro does not compile Kotlin, and there is no file polling or WebSocket in this path.'),
      mcq('The follow-up to "release crashes, debug works": which cause should a candidate check first if logcat shows ClassNotFoundException?', [
        ['R8 removed or renamed a class loaded by reflection, so it needs a keep rule', true],
        ['The release build has no JavaScript bundle and is waiting for Metro to serve it', false],
        ['The Play Store strips classes from builds that are signed with an upload key', false],
        ['Hermes is disabled in release builds, so the class loader cannot find classes', false],
      ], 'Release builds shrink and obfuscate with R8, and a class that a library loads by name can be removed or renamed; a keep rule in proguard-rules.pro fixes it. A missing bundle gives a different error, signing does not strip classes, and Hermes is not a class loader.'),
      mcq('Which answer about Compose shows real understanding of state, rather than vocabulary?', [
        ['remember keeps a value across recomposition, but not across activity recreation', true],
        ['remember stores the value on disk, so it survives even if the process is killed', false],
        ['remember is only needed for lists, because Compose tracks plain values itself', false],
        ['remember makes a composable run once, so it never recomposes after the first time', false],
      ], 'remember holds the value in the composition, so it survives recomposition but not the activity being recreated; rememberSaveable or a ViewModel covers that. It does not write to disk, plain locals are not tracked, and composables using remember still recompose.'),
    ],
  },
  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_ANDROID_NATIVE_CHECKPOINT',
    notes: `Ten questions across the whole topic: Kotlin next to TypeScript, the Android project and its build, Jetpack Compose,
and native modules with the Expo Modules API. Answer without looking back; then return to the lessons for any you
missed.`,
    checkpoint: [
      mcq('Which Kotlin declaration matches the TypeScript type { id: string; note?: string | null } as a value with field-based equality?', [
        ['data class Booking(val id: String, val note: String? = null)', true],
        ['class Booking(var id: String, var note: String = undefined)', false],
        ['data class Booking(val id: String?, val note: String)', false],
        ['object Booking { val id = ""; val note: String? = null }', false],
      ], 'A data class gives equals and hashCode from its fields, and a nullable type with a default covers an optional field that may be null. Kotlin has no undefined and a plain class compares by identity, the third version makes the wrong field nullable, and an object is a singleton, not a type of value.'),
      mcq('What happens at runtime when Kotlin code calls coupon!!.length and coupon is null?', [
        ['A NullPointerException is thrown, which crashes the app if not caught', true],
        ['length returns 0, because !! converts null into an empty string first', false],
        ['The expression evaluates to null, as the ?. safe call operator does', false],
        ['Nothing happens; !! only affects the types checked by the compiler', false],
      ], '!! asserts non-null and throws a NullPointerException when the value is null, unlike TypeScript\'s ! which only affects types. It does not convert null to an empty string, ?. is the operator that yields null, and the assertion is checked at runtime.'),
      mcq('Which coroutine fact makes viewModelScope a safer place for a seat-hold request than a fire-and-forget Promise?', [
        ['Coroutines in that scope are cancelled when the ViewModel is cleared', true],
        ['Coroutines in that scope cannot throw, so no error handling is needed', false],
        ['Coroutines in that scope are queued and run one at a time in order', false],
        ['Coroutines in that scope keep running after the user closes the app', false],
      ], 'Structured concurrency ties each coroutine to its scope, so leaving the screen for good cancels the work instead of letting it update a dead screen. Coroutines can throw, are not serialised by the scope, and do not survive the process.'),
      mcq('An Android build fails right after adding a library, with a manifest merger error about minSdkVersion. What does the error mean?', [
        ['The library needs a newer Android version than the app supports', true],
        ['The app\'s manifest has a typo that the library\'s merger rejects', false],
        ['The library and the app both declare the same activity name', false],
        ['The Android SDK installed on the laptop is older than the library', false],
      ], 'The merger compares minSdk values, and a library that needs a higher API level cannot be used by an app that installs on older phones. A typo or a duplicate activity produces a different message, and the installed SDK on the laptop is a different setting from minSdk.'),
      mcq('Which statement about versionCode and versionName is correct?', [
        ['versionCode is an integer that must rise per upload; versionName is shown to users', true],
        ['versionName must rise per upload; versionCode is an internal label that can repeat', false],
        ['Both must be equal, so a versionName of 2.3.0 needs a versionCode of 230', false],
        ['versionCode is set automatically by Gradle from the date of each build', false],
      ], 'The store orders builds by versionCode, so it must increase; versionName is free text for people. They need not match, and Gradle does not set versionCode from the date (EAS can auto-increment it if configured).'),
      mcq('A React Native app goes to the background while the user checks a UPI app, and Android later kills its process. Which callback is not guaranteed to run?', [
        ['onDestroy', true],
        ['onPause', false],
        ['onStop', false],
        ['onCreate on return', false],
      ], 'A process killed in the background ends without onDestroy, so saving must happen earlier. onPause and onStop ran when the app went to the background, and onCreate runs again when the user returns to a killed app.'),
      mcq('Which Compose code is the equivalent of const [count, setCount] = useState(0)?', [
        ['var count by remember { mutableIntStateOf(0) }', true],
        ['val count = mutableIntStateOf(0)', false],
        ['var count = remember { 0 }', false],
        ['LaunchedEffect(Unit) { var count = 0 }', false],
      ], 'remember keeps the holder across recompositions and mutableIntStateOf makes changes observable, with by giving plain read and assign. Without remember a new holder is created each time, remember { 0 } holds a plain Int that Compose cannot observe, and an effect\'s local variable is not state.'),
      mcq('Why should items in a Compose LazyColumn of trips be given key = { it.id }?', [
        ['So per-row state follows the trip, not the position, when the list changes', true],
        ['So that LazyColumn can sort the trips by id before showing them on screen', false],
        ['So that Compose can fetch each trip from the server by its id when needed', false],
        ['Because LazyColumn throws an exception for any items that have no key set', false],
      ], 'Keys let Compose match rows to items across changes, as keyExtractor does for FlatList, so state and animations stay with the right trip. Keys do not sort or fetch anything, and LazyColumn works without them, just less correctly when items move.'),
      mcq('In an Expo module, what does a Kotlin exception thrown inside an AsyncFunction become in JavaScript?', [
        ['A rejected Promise, with a code if it is a CodedException', true],
        ['A red screen crash, because exceptions cannot cross JSI', false],
        ['A resolved Promise whose value is the exception message', false],
        ['An event sent to every listener registered on the module', false],
      ], 'The Expo Modules API converts an exception in an async function into a rejected Promise, and CodedException subclasses carry a stable code for the JS side to check. It does not crash the app, resolve with the message, or broadcast an event.'),
      mcq('After changing a Kotlin module, which step makes the change reach the app on a test phone?', [
        ['Rebuilding the native app, with npx expo run:android or a new dev build', true],
        ['Pressing r in Metro, which reloads every module that has changed', false],
        ['Publishing an EAS Update, which ships the new code to installed apps', false],
        ['Restarting Expo Go, which picks up modules from the project folder', false],
      ], 'Kotlin is compiled into the binary, so only a native rebuild delivers it. Metro reloads and EAS Updates ship JavaScript and assets only, and Expo Go cannot load your custom native code.'),
    ],
  },
];
