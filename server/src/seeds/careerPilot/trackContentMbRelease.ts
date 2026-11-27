/**
 * Career-track content: Building, Releasing and Running the App (MB_RELEASE), Mobile, batch MB3.
 *
 * What happens after the app works on the developer's phone: debug and release builds, app IDs and versions, the
 * upload key and Play App Signing, EAS Build profiles and environment variables; the Play Console's testing tracks,
 * store listing, data-safety form and staged rollouts; the App Store in outline (TestFlight, the review guidelines that
 * reject apps, iOS builds from Windows through EAS); EAS Update, runtime versions and a GitHub Actions pipeline; and
 * Sentry, source maps, crash-free rates, analytics and store reviews in production. It builds on "Expo: Creating,
 * Running and Debugging an App", "Inside an Android Project", "Mobile App Security Basics", "End-to-End Tests with
 * Maestro and Detox" and Year 3's "Building and Shipping It"; those are referred to by title, not re-taught.
 *
 * One fictional app runs through the topic: DabbaDash, a Bengaluru home-food (tiffin) delivery app paid by UPI, with
 * about 1.8 lakh daily users, mostly on mid-range Android phones. What was run, in a copy of the track's Expo SDK 58
 * project: app.config.ts type-checked against expo/config and evaluated per variant with npx expo config; eas.json
 * parsed and validated by @expo/eas-json 26.0.0 (the parser eas-cli 26.0.0 itself uses), including three broken
 * versions; eas-cli 26.0.0's --help for env:create, update, update:edit, update:rollback, build and submit; runtime
 * versions resolved by the real resolver in expo/config-plugins and fingerprints computed by @expo/fingerprint before
 * and after a JavaScript change and a permission change; the versionCode, OTA-or-binary, crash-free, Wilson-interval,
 * rollout-gate and funnel logic under Jest; a terser-minified bundle symbolicated through its source map with the
 * source-map library; the GitHub Actions workflows parsed with js-yaml and checked by a small structural checker; a
 * throwaway upload keystore made and listed with JDK keytool (fingerprints not shown); and the Sentry, expo-updates and
 * expo-store-review snippets type-checked against the installed packages. Printed output is that real output.
 * Not run: no EAS account was logged in, so no build, update or submit ran; no Play Console, App Store Connect,
 * TestFlight, Sentry project, device or GitHub runner was used. Those parts are written from the Expo, Android
 * developer, Play Console Help, Apple developer and Sentry documentation. Store fees, review times, tester minimums
 * and target-API deadlines change, so the notes describe the mechanism and send students to the official page.
 *
 * Skill: MOBILE_RELEASE.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_MB_RELEASE_BUNDLES: PilotBundle[] = [
  /* ── BUILDS_SIGNING ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_RELEASE_BUILDS_SIGNING',
    notes: `DabbaDash is a Bengaluru tiffin-delivery app: home cooks in HSR Layout and Koramangala list lunch, office workers
order by 11, a rider delivers by 1, and payment is UPI. The app works on every developer's phone. This topic is
everything between that and 1.8 lakh people running it: builds, stores, updates and watching it live. In Year 3's
"Building and Shipping It" you made one release build; here you make them repeatable, signed and per environment.

## Debug and release are different programs

A **debug** build loads JavaScript from Metro on your laptop, shows the dev menu and red error screens, runs with
__DEV__ true and is signed with a debug key that Android tools create automatically. A **release** build carries its
JavaScript inside the app, compiled to Hermes bytecode and minified, runs with __DEV__ false, has no dev menu, and is
signed with a key you control. Bugs live in the gap: a log left in a hot loop, a race hidden by the slower debug
JavaScript, a crash that the red screen used to catch. Test a release build before every release, never only debug.

With Expo you meet three kinds, set up as **profiles** in eas.json (you met development builds in "Expo: Creating,
Running and Debugging an App"):

- **development**: a debug build with expo-dev-client, installed on team phones, loading JavaScript from Metro.
- **preview**: a release build installed directly (an APK on Android), for QA and the product manager.
- **production**: a release build in the store format (an AAB for Google Play), with versions bumped.

## Identity: the app ID and two version numbers

The **application ID** (android.package, ios.bundleIdentifier) names the app on the phone and in the store. Once an
app is published with it, it cannot change: a new ID is a new app with no users and no reviews. Choose a reverse-domain
name you own (in.dabbadash.app) on day one.

Android has two version fields. **versionName** is the text users see, "2.4.0". **versionCode** is an integer that
Play compares: every upload must have a higher versionCode than anything that app has uploaded before, and the
Android documentation gives its ceiling as 2,100,000,000. iOS has the same pair, version and buildNumber. Use
semantic versioning for the visible version (patch for fixes, minor for features, major for breaking changes) and
never compare versions as strings: "2.10.0" is less than "2.9.3" as text.

With EAS you can stop managing versionCode by hand. Set "appVersionSource": "remote" and "autoIncrement": true on the
production profile: EAS keeps the current versionCode and buildNumber on its servers and bumps them on every build,
so two developers building on the same day cannot collide. eas build:version:set sets the starting value when you
move an existing app across.

## Signing: why a key, and which key

Android installs an update only if it is signed with the same certificate as the installed app. That is how a phone
knows the update came from the same developer. So whoever holds the signing key can publish updates as you, and
whoever loses it can never update the app again.

Google Play splits the job in two with **Play App Signing**:

- The **app signing key** signs what users install. Google generates it (or you upload yours) and keeps it in its
  own key management; it never leaves Google.
- The **upload key** is yours. You sign each AAB with it; Play checks that signature to know the upload came from
  you, then re-signs the APKs it generates from your AAB with the app signing key.

If the upload key is lost or leaked, the account owner asks for an upload key reset in the Play Console and registers
a new one; users notice nothing, because what they install is still signed with the app signing key. That is the
reason for the split. Apps published as AABs use Play App Signing; the details of enrolment and key upgrade are on
the Play Console Help page "Use Play App Signing".

An upload keystore is a password-protected file. The React Native guide makes one with the JDK's keytool:

    keytool -genkeypair -v -storetype PKCS12 -keystore upload.keystore -alias upload \\
      -keyalg RSA -keysize 2048 -validity 10000

With EAS you usually do not run that. The first eas build -p android offers to generate a keystore and stores it in
your Expo account; eas credentials shows it, downloads a backup, or replaces it. Either way, three rules:

- The keystore and its passwords are never committed. Add *.keystore, *.jks and credentials.json to .gitignore.
- Keep a backup outside EAS and outside one laptop, in the company's password manager or vault.
- Some services (Google Sign-In, Firebase, Maps API key restrictions) need the SHA-1 or SHA-256 fingerprint of the
  certificate that signs what users install. For a Play-installed app that is the **app signing key**, shown in the
  Play Console under App integrity, not your upload key.

## Environments: three apps on one phone

QA wants the preview build and the store build on the same phone. If both use in.dabbadash.app, installing one
replaces the other, and if they are signed differently the install fails outright. Give each variant its own ID with
a dynamic config, app.config.ts, reading APP_VARIANT that each eas.json profile sets: in.dabbadash.app.dev,
in.dabbadash.app.preview and in.dabbadash.app, with names "DabbaDash (Dev)" and "DabbaDash (Preview)" so testers can
tell them apart.

## Environment variables and secrets

EAS environment variables live in three environments (development, preview, production) and have a visibility:
**plaintext**, **sensitive** (masked in logs) or **secret** (not readable outside EAS builds). Create one with
eas env:create, and point a profile at an environment with "environment" in eas.json.

The rule that catches everyone: a variable whose name starts with EXPO_PUBLIC_ is inlined into the JavaScript bundle.
Anyone can unzip the APK and read it. That is fine for the API base URL and the Sentry DSN (designed to be public). It
is wrong for a payment gateway's secret key, a Sentry auth token or a Google service account; those are build-time
secrets used by tools on the build machine, or they belong on your server ("Mobile App Security Basics" said why).`,
    workedExample: `**Scenario.** Set DabbaDash up so that dev, preview and production install side by side, versions never collide,
and eas.json is valid before anyone spends a cloud build on it.

**app.config.ts** (the part that changes per variant):

    const VARIANT = (process.env.APP_VARIANT ?? 'production') as Variant;
    export default ({ config }: ConfigContext): ExpoConfig => ({
      ...config, name: NAME[VARIANT], slug: 'dabbadash', version: '2.4.0',
      scheme: VARIANT === 'production' ? 'dabbadash' : \`dabbadash-\${VARIANT}\`,
      android: { package: ID[VARIANT] }, ios: { bundleIdentifier: ID[VARIANT] },
    });

npx tsc --noEmit passed against the ExpoConfig type (a typo such as policy: 'appversion' fails with "Did you mean
'appVersion'?"). Evaluating it with APP_VARIANT set to each value, through npx expo config, printed:

    development  DabbaDash (Dev) | in.dabbadash.app.dev | dabbadash-development
    preview      DabbaDash (Preview) | in.dabbadash.app.preview | dabbadash-preview
    production   DabbaDash | in.dabbadash.app | dabbadash

**eas.json** has development (developmentClient, internal), preview (internal, buildType apk) and production
(autoIncrement, appVersionSource remote). Read back through @expo/eas-json, the parser eas-cli uses:

    preview      {"distribution":"internal","buildType":"apk","channel":"preview",...}
    production   {"distribution":"store","channel":"production","autoIncrement":true,...}

Production has no buildType, so it gets the default, an app bundle. Three mistakes were then fed to the same parser:

    "distribution": "interal"     -> "build.preview.distribution" must be one of [store, internal]
    "buildType": "aab"            -> "build.production.android.buildType" must be one of [apk, app-bundle]
    "autoincrement": true         -> "build.production.autoincrement" is not allowed

The last one matters most: without the check, a misspelt key would be a silent no-op, and the next upload would be
rejected for reusing a versionCode.

**Versions.** If you manage versionCode yourself, derive it from the version so it can only go up. Encoding
major, minor, patch and a two-digit build number printed 2.4.0 -> 20040000, 2.4.1 -> 20040100, 2.10.0 -> 20100000;
the largest major that fits under 2,100,000,000 is 210.`,
    mcqs: [
      mcq('DabbaDash QA installs the preview build and then the Play Store build on the same phone, and the second install fails. Both use the ID in.dabbadash.app. What is the fix?', [
        ['Give each variant its own application ID from app.config.ts', true],
        ['Raise the versionCode of the store build above the preview one', false],
        ['Sign the preview build with the same upload key as the store build', false],
        ['Build the preview profile as an AAB instead of an installable APK', false],
      ], 'Two builds with one ID are the same app to Android, so one replaces the other and a different signature makes the install fail. Separate IDs let them sit side by side. A higher versionCode still replaces the app, the store build is re-signed by Google with a different key anyway, and an AAB cannot be installed directly.'),
      mcq('A developer\'s laptop with DabbaDash\'s upload keystore is stolen. The app uses Play App Signing. What happens next?', [
        ['The owner asks Play for an upload key reset; users see nothing', true],
        ['The app must be republished under a new ID as a separate listing', false],
        ['Every user must uninstall and reinstall to get the re-signed app', false],
        ['Nothing needs doing, since the upload key is not a secret anyway', false],
      ], 'Users install APKs signed with the app signing key, which Google keeps, so a lost upload key is replaced through an upload key reset and installs are unaffected. A new listing is what happens without Play App Signing, users never reinstall, and the upload key is a secret: it proves an upload came from you.'),
      mcq('Which value is safe to put in an EXPO_PUBLIC_ environment variable for DabbaDash?', [
        ['The base URL of the DabbaDash ordering API', true],
        ['The secret key of the UPI payment gateway account', false],
        ['The Sentry auth token used to upload source maps', false],
        ['The JSON key of the Play Console service account', false],
      ], 'EXPO_PUBLIC_ values are inlined into the bundle, readable by anyone who unzips the APK, so only public values belong there; an API URL is public anyway. The gateway key belongs on the server, and the Sentry token and service account key are build-time secrets kept as EAS secret variables.'),
    ],
    checkpoint: [
      mcq('Why does Google Play reject an upload whose versionCode is 20040001 when the app has already uploaded 20040001?', [
        ['Each upload needs a versionCode higher than any uploaded before', true],
        ['The versionCode must equal the versionName with the dots removed', false],
        ['Play only accepts versionCodes that end in two zero digits', false],
        ['The versionName must change whenever the versionCode is reused', false],
      ], 'Play orders builds by versionCode and accepts only a code higher than every one it has seen for the app; that is how a phone knows which build is newer. There is no format rule tying it to the versionName, no rule about trailing zeros, and changing the name does not make a reused code acceptable.'),
      mcq('What does Play App Signing change about who holds which key?', [
        ['Google keeps the app signing key; you keep the upload key', true],
        ['You keep the app signing key; Google issues the upload key', false],
        ['Google holds both keys and signs everything you upload', false],
        ['You hold both keys, and Google only verifies the signature', false],
      ], 'With Play App Signing the key that signs what users install stays with Google, and you sign uploads with your own upload key, which can be reset if lost. You do not keep the app signing key, Google does not issue your upload key, and you still sign every upload yourself.'),
      mcq('Google Sign-In works in the preview APK but fails in the build installed from Play. Which fingerprint is missing from the OAuth client?', [
        ['The SHA-1 of the app signing key shown under App integrity', true],
        ['The SHA-1 of the upload key that signs the AAB on EAS', false],
        ['The SHA-1 of the debug keystore on the developer laptop', false],
        ['The SHA-256 of the AAB file that was uploaded to Play', false],
      ], 'Play re-signs what users install with the app signing key, so Google services see that certificate; its fingerprint is in the Play Console under App integrity. The upload key signs only the upload, the debug key signs only debug builds, and a file hash is not a signing certificate.'),
    ],
  },

  /* ── PLAY_STORE ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_RELEASE_PLAY_STORE',
    notes: `DabbaDash 2.4.0 has a signed production build. Between that file and 1.8 lakh phones sit the Play Console, a set of
declarations, a review and a rollout you control. Most first releases are delayed by the forms, not the code, so this
lesson walks through them in the order you meet them.

## The AAB, and why Play wants it

You upload an **Android App Bundle** (.aab), not an APK. The bundle holds code and resources for every device; Play
generates and signs the APKs each phone needs (its CPU architecture, screen density and languages), so a user on a
mid-range phone in Hubballi downloads only what that phone uses. Smaller downloads matter on patchy 4G and on phones
with little free storage. You cannot install an AAB directly; for side-loading and quick QA you still build an APK,
which is why the preview profile says buildType apk.

## Setting up the app in the Play Console

Creating the app asks for its default language, name, whether it is an app or a game, and free or paid. Then the
dashboard lists the declarations Play needs before anything can go to production. The ones that take real thought:

- **Store listing.** Title, short and full description, icon, feature graphic, phone screenshots. Screenshots must
  show the real app; write the descriptions for a user, not for keywords.
- **Privacy policy.** A public URL that says what you collect and why. It must match what the app does.
- **App access.** If parts of the app need a login, give reviewers a way in. DabbaDash logs in by phone OTP, so it
  provides a test number with a fixed OTP that works only for that number on the server, and the steps to use it.
- **Data safety.** What data the app collects and shares, for what purpose, whether it is encrypted in transit, and
  how users can ask for deletion. It covers the libraries you ship as well as your own code: Sentry collects crash
  data and device details, an analytics SDK collects app interactions. A form that says "no data collected" while
  Sentry runs is a false declaration.
- **Content rating, target audience, ads.** A questionnaire produces the age rating; target audience decides whether
  the families rules apply; the ads declaration says whether the app shows ads.
- **Account deletion.** Play requires apps that let users create an account to let them ask for its deletion, in the
  app and through a web link. Build it before the first release, not after a rejection.

Policies change, and the Play Console shows the current list of declarations on its dashboard. Read the Policy
Center for the rule itself rather than a blog post about it.

## Tracks: internal, closed, open, production

A **release** is a set of app bundles with release notes, created on a **track**:

- **Internal testing**: a short list of testers by email, available quickly. The team and the QA phones live here.
- **Closed testing**: larger tester lists or Google Groups, for example fifty home cooks who agreed to try the
  seller features early. You can run more than one closed track.
- **Open testing**: anyone can join from the store listing.
- **Production**: everybody.

A build moves up by **promoting** the same release to the next track, so the bytes that passed testing are the bytes
users get. Testers join through an opt-in link and then receive updates through Play like any user, which also tests
the real install path. New personal developer accounts have to run a closed test with a minimum number of testers
for a minimum period before they can apply for production; the current numbers are on the Play Console Help page
about testing requirements for new personal accounts. Plan the weeks into your first release.

On test tracks Play also runs a **pre-launch report**: it installs the build on a range of real devices, explores it,
and reports crashes, accessibility issues and security warnings. Give it the test login from App access, or it sees
only the OTP screen.

## Target API level

Each Android version is an API level, and the app declares the one it targets. Play requires new apps and updates to
target a recent level and raises the floor over time, so an app nobody updates is eventually blocked from
publishing updates. In Expo the SDK version sets targetSdkVersion, so upgrading the Expo SDK regularly is how an Expo
app keeps up. Check the Play Console Help page "Target API level requirements" for the current rule.

## Review and going live

Every release to a track goes through Google's review, which can take from hours to days and cannot be hurried; the
Console shows its status. **Managed publishing** lets you choose when an approved release goes live, so a release
reviewed on Thursday can wait for Monday morning rather than land before a holiday weekend.

## Staged rollouts: shipping to a slice first

A production release can be rolled out to a **percentage** of users. DabbaDash goes 1% to 5% to 20% to 50% to 100%,
widening only when the crash rate of the new version is in line with the old. If it is not, you **halt** the
rollout: no new users get the version, but users who already have it keep it. Play cannot install an older
versionCode over a newer one, so there is no rollback to 2.3.2. The fix is 2.4.1 with a higher versionCode, or an
over-the-air update if the bug is in JavaScript (the lesson after next).

## Submitting from the command line

eas submit uploads a build to Play using a Google Cloud service account that has been given access in the Play
Console. The service account's JSON key is a secret: keep it out of Git and give it to EAS as a secret. Expo's submit
guide notes that the very first upload of a new app must be done by hand in the Play Console; after that eas submit,
or eas build --auto-submit, does it.`,
    workedExample: `**Scenario.** DabbaDash 2.4.0 is at 5% of production. The team agreed a gate before the rollout: widen only after at
least 20,000 sessions, and halt if the crash rate is clearly above 0.4% or clearly above 1.5 times the current
version's rate. Version 2.3.2 had 810 crashed sessions in 5,40,000 (crash-free sessions 99.85%).

**How much data does a slice give?** With 1.8 lakh daily users and about 3 sessions each a day:

    rollout 1%: {"users":1800,"sessionsPerDay":5400}
    rollout 5%: {"users":9000,"sessionsPerDay":27000}
    rollout 20%: {"users":36000,"sessionsPerDay":108000}

So 5% gives the 20,000 sessions in under a day; 1% would need four.

**Why "clearly above".** A crash rate from a few thousand sessions is noisy. The gate uses the lower end of a 95%
Wilson interval: halt only when even the optimistic reading is too high. Four rollout snapshots through the gate (run
under Jest; the bracket is the interval):

    31/6500  = 0.477% [0.336%, 0.676%] -> HALT: crash rate 0.48% (lower bound 0.34%) vs baseline 0.15%
    4/2000   = 0.200% [0.078%, 0.513%] -> WAIT: 2000 of 20000 sessions
    43/27000 = 0.159% [0.118%, 0.214%] -> WIDEN: crash rate 0.16% vs baseline 0.15%
    70/27000 = 0.259% [0.205%, 0.327%] -> HOLD: crash rate 0.26% vs baseline 0.15%; look at the issues before widening

**Reading it.** The first snapshot halts after only 6,500 sessions: even the lower bound, 0.336%, is more than twice
the old rate. The second has a higher point estimate than the old version but far too little data, so it waits.
The third is within noise of the old version, so it widens. The fourth is not clearly bad enough to halt but is
above the 1.5x line, so a person reads the new crash groups in Sentry before going further.

**What it does not tell you.** The gate compares crash rates only. A release that crashes less but breaks checkout
silently passes it; the funnel in the monitoring lesson catches that.`,
    mcqs: [
      mcq('DabbaDash 2.4.0 is at 20% of production and crashes on Android 10 phones. Which action does Play actually allow?', [
        ['Halt the rollout and ship 2.4.1 with a higher versionCode', true],
        ['Roll every 2.4.0 phone back to 2.3.2 from the Play Console', false],
        ['Re-upload 2.4.0 with the fix under the same versionCode', false],
        ['Lower the rollout to 0% so 2.4.0 is removed from phones', false],
      ], 'Halting stops new installs of 2.4.0 and the fix ships as a new, higher versionCode. Play cannot install a lower versionCode over a higher one, so there is no rollback; a versionCode can never be reused; and phones that already have 2.4.0 keep it.'),
      mcq('The pre-launch report for DabbaDash shows only the OTP login screen on every device. What should the team do?', [
        ['Give a test number with a fixed OTP under App access', true],
        ['Turn off OTP login in builds sent to the testing tracks', false],
        ['Ignore the report, since it cannot get past any login', false],
        ['Upload an APK instead of an AAB to the internal track', false],
      ], 'Play\'s crawler and reviewers use the credentials declared under App access, so a test number with a server-side fixed OTP lets them in. A separate build without login tests a different app, the report is useful once it can log in, and the file format has nothing to do with logging in.'),
      mcq('DabbaDash\'s data-safety form says "no data collected", but the app ships Sentry and an analytics SDK. What is wrong?', [
        ['The form must cover data that bundled SDKs collect as well', true],
        ['The form only applies to apps that are paid or show ads', false],
        ['Crash data is exempt, so only the analytics SDK is missing', false],
        ['The form must list the SDK names rather than data types', false],
      ], 'The data-safety form describes everything the app collects and shares, including through libraries, so crash reports with device details and analytics events must be declared. It applies to free apps too, crash data is not automatically exempt, and the form is about data types and purposes, not SDK names.'),
    ],
    checkpoint: [
      mcq('Why does Google Play ask for an app bundle rather than an APK?', [
        ['Play builds per-device APKs from it, so downloads are smaller', true],
        ['A bundle can be installed directly on phones without signing', false],
        ['A bundle runs JavaScript faster because Play compiles it ahead', false],
        ['A bundle lets Play skip the review for apps on the test tracks', false],
      ], 'An AAB holds resources for every device and Play generates APKs with only what each phone needs, which shrinks downloads. Bundles cannot be installed directly and are signed, they do not change how JavaScript runs, and every track release is still reviewed.'),
      mcq('In a staged rollout, what happens to users who already have the new version when you halt it?', [
        ['They keep the version; only new users stop receiving it', true],
        ['Play uninstalls it and reinstalls the previous version', false],
        ['Their app is disabled until a higher version is released', false],
        ['They are moved automatically to the internal test track', false],
      ], 'Halting stops the version spreading; it does not touch phones that already updated, which is why the fix must ship as a higher versionCode or an OTA update. Play does not downgrade or disable apps, and tracks are about who can receive a release, not where existing users are moved.'),
      mcq('A release reviewed on Friday must not go live until Monday morning. Which Play Console feature does this?', [
        ['Managed publishing', true],
        ['A closed testing track', false],
        ['A 1% staged rollout', false],
        ['The pre-launch report', false],
      ], 'Managed publishing holds approved changes until you publish them yourself. A closed track sends the build to testers, not to users on a date; a 1% rollout still goes live at once to some users; and the pre-launch report tests a build on devices, it does not schedule anything.'),
    ],
  },

  /* ── APP_STORE ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_RELEASE_APP_STORE',
    notes: `Most DabbaDash users are on Android, but the office workers in Whitefield who order the most lunches are often on
iPhones, so the company wants an iOS release. The team has Windows laptops and no Mac. This lesson is the outline of
an iOS release: what Apple needs from you, how EAS builds iOS without a Mac, and the review guidelines that reject
apps, so you can plan the work and not be surprised by it.

## The account

Publishing needs a membership in the **Apple Developer Program**, which has an annual fee (see Apple's membership
page for the current amount). Enrol as an **organisation**, not an individual, for a company app: the seller name on
the App Store is then "DabbaDash Technologies Pvt Ltd", not a developer's personal name, and the team can be managed
properly. Organisation enrolment needs a D-U-N-S number for the company, which takes time to obtain, so start early.
The app itself is created in **App Store Connect** with its bundle ID, name, primary language and SKU.

## Certificates and provisioning profiles

iOS signing has more parts than Android. A **distribution certificate** identifies your team; a **provisioning
profile** ties together the certificate, the app's bundle ID, the capabilities it uses (push notifications, Sign in
with Apple) and, for ad hoc builds, the list of devices allowed to install it. Getting these wrong used to be a
day's work in Xcode.

With EAS you sign in with your Apple ID when eas build -p ios first runs, and EAS creates and stores the certificate
and profiles, reusing them on later builds. eas credentials shows and manages them. In CI, an App Store Connect API
key lets EAS do this without an interactive Apple login.

## Building iOS without a Mac

eas build -p ios runs on EAS's macOS build machines, so a Windows team can produce an iOS build. What you cannot do on
Windows is run the iOS Simulator, so testing needs a real iPhone, by one of two routes:

- **Internal distribution (ad hoc).** Register each test iPhone with eas device:create, which records its device
  identifier, then build with a profile that has "distribution": "internal". Only registered devices can install it.
- **TestFlight.** eas submit -p ios uploads the build to App Store Connect, and testers install it through Apple's
  TestFlight app. **Internal testers** are members of your App Store Connect team and get builds after processing;
  **external testers** (anyone with an email address or a public link) need the build to pass a lighter Beta App
  Review first. TestFlight builds expire after a set period, so a long beta needs fresh builds.

## iOS version numbers

The same pair as Android under different names: version (CFBundleShortVersionString, "2.4.0", users see it) and
buildNumber (CFBundleVersion), which must increase for every build uploaded for a version. "autoIncrement": true on
an EAS profile with remote app versions handles both platforms.

## The review, and what gets apps rejected

Every App Store version is reviewed by people against Apple's **App Review Guidelines**. Review times vary; App Store
Connect shows the status. The rejections a first-time team meets most, with the section of the guidelines (check the
current text, it changes):

- **App completeness (2.1).** Crashes during review, placeholder text, broken links, or no way to log in. DabbaDash
  gives reviewers the same fixed-OTP test number it gives Play, in the App Review Information notes.
- **Accurate metadata (2.3).** Screenshots that do not show the real app, or features in the description that the
  app does not have.
- **Minimum functionality (4.2).** An app that is a thin wrapper around a website. A React Native app with real screens
  is fine; a WebView of dabbadash.in is likely to be rejected.
- **Data collection and storage (5.1.1).** Every permission needs a clear purpose string. "Camera access needed" is
  vague; "DabbaDash uses the camera so home cooks can photograph today's thali for the menu" says why. Apps that let
  users create an account must let them start deleting it from inside the app.
- **Login services (4.8).** An app whose main login is a third-party social login must also offer an equivalent
  privacy-focused option, such as Sign in with Apple. DabbaDash logs in with phone OTP; if it adds "Sign in with
  Google", read this section first.
- **Payments (3.1).** Digital content and features used inside the app (an ed-tech course, a premium tier that
  unlocks screens) must be sold through Apple's in-app purchase. Physical goods and services used outside the app, like
  a tiffin delivered to a desk, may be paid through your own gateway, UPI included. Rules for some regions and app
  types have exceptions; read the section for your case rather than a forum answer.

## Privacy on iOS

Two more things Apple checks. The **App Privacy** section in App Store Connect (the "nutrition label") declares what
data the app collects, like Play's data-safety form, and must include what your SDKs collect. A **privacy manifest**
(PrivacyInfo.xcprivacy) declares the data the app collects and the reasons it uses certain system APIs (for
example the file timestamp and user-defaults APIs that many libraries call). Expo lets you set it with
ios.privacyManifests in app config, and many libraries ship their own. If App Store Connect emails a warning about a
missing reason after an upload, fix it before submitting for review.

## A realistic iOS plan for DabbaDash

1. Start organisation enrolment and the D-U-N-S request now; they gate everything else.
2. Add the purpose strings and in-app account deletion, and decide on login options against 4.8.
3. eas build -p ios with the production profile; eas submit to TestFlight; internal testers first.
4. Run the main flows on at least two real iPhones of different sizes; then submit for review with the test login and
   notes that explain the OTP.
5. Expect at least one rejection on a first app, read the guideline it cites, fix it and reply in Resolution Center.`,
    mcqs: [
      mcq('DabbaDash\'s team has only Windows laptops. Which part of an iOS release can they NOT do without a Mac?', [
        ['Run the app in the iOS Simulator for testing', true],
        ['Produce a signed iOS build for the App Store', false],
        ['Upload a finished build to App Store Connect', false],
        ['Install a test build on a registered iPhone', false],
      ], 'The iOS Simulator runs only on macOS, so testing happens on real iPhones. EAS builds and signs on its own macOS machines, eas submit uploads from any operating system, and internal distribution installs on registered devices without a Mac.'),
      mcq('Apple rejects DabbaDash under guideline 5.1.1. The camera purpose string reads "Camera access needed". What fixes it?', [
        ['Say what the camera is used for, such as photographing the thali', true],
        ['Ask for the camera when the app starts, before the first screen', false],
        ['Remove the purpose string and rely on the system default text', false],
        ['Move the camera permission to the app\'s Android configuration', false],
      ], 'Apple wants purpose strings that tell the user why the app needs access; a vague one is a common 5.1.1 rejection. Asking at launch without context is worse, a missing string crashes the app when it requests access, and Android settings do nothing for iOS.'),
      mcq('An ed-tech app in India wants to sell a recorded course that is watched inside the iOS app. How must it be sold on iOS?', [
        ['Through Apple\'s in-app purchase, as digital content used in the app', true],
        ['Through UPI only, since Indian payment rules override Apple\'s guidelines', false],
        ['Through any gateway, since the course is made by a third-party teacher', false],
        ['Through a website link, which Apple requires for all paid content', false],
      ], 'Digital content consumed inside the app falls under the in-app purchase rule in section 3.1. Payment methods for physical goods do not apply to it, who made the course does not change its category, and a link to an outside purchase is only allowed in specific cases the guidelines spell out.'),
    ],
    checkpoint: [
      mcq('What is the difference between internal and external testers on TestFlight?', [
        ['External testers need the build to pass Beta App Review first', true],
        ['Internal testers need a registered device identifier for each phone', false],
        ['External testers install from the App Store, internal from a link', false],
        ['Internal testers get builds only after a full App Store review', false],
      ], 'Internal testers are your App Store Connect team and get builds after processing; external testers need a Beta App Review of the build. Device registration belongs to ad hoc builds, both groups install through the TestFlight app, and neither waits for a full App Store review.'),
      mcq('An app offers "Continue with Google" as its main login. Which App Store guideline should the team read before submitting?', [
        ['Login services, about offering an equivalent private login', true],
        ['Minimum functionality, about apps that wrap a website', false],
        ['Accurate metadata, about screenshots that match the app', false],
        ['In-app purchase, about selling digital content in the app', false],
      ], 'Section 4.8 says when an app using a third-party login must also offer an equivalent privacy-focused option such as Sign in with Apple. The other sections are real rejection reasons, but they are about web wrappers, screenshots and digital sales, not login.'),
      mcq('Why should a company enrol in the Apple Developer Program as an organisation rather than an individual?', [
        ['The store shows the company as seller, not a developer\'s name', true],
        ['Only organisation accounts are allowed to use EAS Build for iOS', false],
        ['Organisation apps skip App Review for their first submission', false],
        ['Individual accounts cannot publish an app on the Indian store', false],
      ], 'An organisation account lists the company as the seller and lets the company manage the team; an individual account shows a person\'s name. EAS works with both, every app is reviewed, and individuals can publish in India.'),
    ],
  },

  /* ── OTA_CI ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_RELEASE_OTA_CI',
    notes: `At 11:40 on a Monday, DabbaDash's cart shows the GST line twice for orders above ₹500. The bug is one line of
TypeScript. A store release would need a new build, a review and a rollout, and lunch orders close at 11. An
over-the-air (OTA) update can reach most phones within hours. This lesson is how that works, the rules that keep it
safe, and a pipeline that does the routine parts without anybody remembering steps.

## What an app actually contains

A React Native app is two layers. The **native layer** (the Android and iOS code, native libraries, permissions, the
icon, the app ID) is compiled into the binary that the store installs. The **JavaScript bundle** and the assets it
imports (images, fonts) are data that the native layer loads at start-up. A store build embeds one bundle. EAS Update
publishes a new bundle, and the expo-updates library in the app downloads it and runs it instead.

## How a phone picks up an update

By default expo-updates checks for an update every time the app cold-starts (checkAutomatically ON_LOAD), and
fallbackToCacheTimeout is 0, so it does not wait: the app starts with the bundle it already has while the new one
downloads, and the new one runs on the **next** cold start. So a fix reaches a user after two launches. For a lunch
app that people open every day that is fast; for an app opened weekly it is not, so you can also check yourself:
Updates.checkForUpdateAsync() when the app returns to the foreground, Updates.fetchUpdateAsync() to download, and
Updates.reloadAsync() to restart into it, at a moment that does not interrupt the user (never in the middle of a
checkout). The useUpdates() hook exposes isUpdateAvailable and isUpdatePending for that.

## Channels, branches and runtime versions

Two things decide which update a phone gets.

**Channel.** Each build has a channel baked in from its eas.json profile ("channel": "production"). Updates are
published to a **branch**, and a channel points at a branch. eas update --channel production publishes for production
builds; the preview builds QA carries never see it, and the other way round.

**Runtime version.** An update runs only on builds whose runtimeVersion is the same string. The runtime version is
the promise "this JavaScript and this native layer fit together". A bundle that calls a native module the binary does
not contain crashes with "Cannot find native module 'ExpoCamera'". The policy in app config sets how the string is
made, and the real resolver in expo/config-plugins gives, for version 2.4.0, versionCode 20040002 and iOS build 7:

    appVersion: android=2.4.0 ios=2.4.0
    nativeVersion: android=2.4.0(20040002) ios=2.4.0(7)
    fingerprint: file:fingerprint

- **appVersion**: the runtime is the visible version. Simple, but only safe if the team bumps the version on every
  native change; forget once and an update reaches binaries it does not fit.
- **nativeVersion**: version plus build number, so every build is its own runtime and gets only updates published
  after it. Safe, but you publish a fix once per build still in use.
- **fingerprint**: a hash of everything that affects the native layer (native dependencies, native config, the
  android and ios folders), computed at build time (the file:fingerprint placeholder above). JavaScript changes leave
  it unchanged; native changes change it. It makes the rule automatic, which is why many teams pick it.
- A fixed string you change by hand, for teams with their own discipline.

## What OTA may change, and what it may not

May: JavaScript and TypeScript code, JavaScript-only libraries, images and fonts imported from JavaScript, and
values in app config that the app reads at runtime (extra).

May not: adding or upgrading a library with native code, permissions, the icon and splash screen, the app name and ID,
deep-link schemes, config plugins, the Expo SDK or React Native version. Those need a new store build.

Store rules matter too. Both Apple and Google allow updating interpreted JavaScript, within limits: do not change the
app's primary purpose or add features that would not pass review. Read Apple's guidelines (2.5.2 and the Developer
Program License Agreement) and Google Play's Device and Network Abuse policy for the current wording. Fix bugs and
adjust screens over the air; ship new features through review.

## Updates go wrong too: roll out and roll back

An OTA update reaches everyone on the channel and runtime fast, which is also how a bad one spreads. Two tools:

    eas update --channel production --environment production --message "Fix double GST line" \\
      --rollout-percentage 10
    eas update:edit --rollout-percentage 50          # widen when the crash rate holds
    eas update:rollback                              # republish the previous update group

eas update:rollback republishes the update before the latest one, or a rollback to the bundle embedded in the build
if there is none. expo-updates also tries to recover when a new update crashes at launch, but do not plan around that.

## A pipeline that ships

Year 3 said "let the pipeline ship it"; for a mobile app the pipeline has three jobs, in GitHub Actions:

- **On every pull request:** npm ci, npx tsc --noEmit, lint, npx jest --ci. Nothing ships; it only says whether
  the change is safe to merge.
- **On a merge to main:** the same checks, then eas update to the preview channel, so QA's phones have the change in
  minutes without a build.
- **On a version tag (v2.4.1):** the checks, then eas build --profile production --non-interactive --auto-submit
  --no-wait, which builds in EAS and submits to the internal track without holding a CI runner while it builds.

The runner logs in to EAS with an EXPO_TOKEN (an access token created in the Expo account settings, stored as a
GitHub secret) through expo/expo-github-action, which also installs eas-cli. EAS also has its own workflow runner
(files in .eas/workflows) that can do the same jobs; the ideas are the same.

Two rules for CI on a mobile app. Every eas command gets --non-interactive, because there is nobody to answer a
prompt. And never put a GitHub expression with user-controlled text, such as a commit message, directly inside a run
line: pass it through env, so a message containing quotes or $(...) is data, not shell code.`,
    workedExample: `**Scenario.** Prove that the double-GST fix can go over the air but the next sprint's "scan the thali photo" feature
cannot, and that the pipeline file is sound before it reaches GitHub.

**1. The fingerprint.** @expo/fingerprint computed the project's fingerprint (Android) three times: as it was, after
adding a line to a TypeScript file, and after adding the CAMERA permission to app.config.ts. Real output:

    baseline            60e580f7d497eb4bc091634c8f213c98c4d93216
    after a JS change   60e580f7d497eb4bc091634c8f213c98c4d93216 (same)
    after a permission  e51d47c65894f0a3c625f09a5f94ce845256636a (changed)
    [{"op":"changed","type":"contents","id":"expoConfig"}]

With the fingerprint policy the JavaScript fix keeps the runtime version, so it reaches every phone on that build;
the permission change makes a new runtime version, so no existing phone can receive that bundle by accident.

**2. The same rule as a release plan,** a small classifier tested under Jest:

    {"route":"eas update","because":[]}
    {"route":"store build","because":["native dependency expo-camera","app config android.permissions"]}

The first change set (a .tsx file, a banner image, date-fns) goes over the air; the second needs a store build.

**3. The workflow.** The three-job file was parsed with js-yaml and run through a checker for unknown needs, eas
without a token, eas without --non-interactive, and GitHub expressions inside run lines:

    .github/workflows/mobile.yml -> check, preview-update, store-build | no problems

The preview job passes the commit message through env, not inline:

    - run: eas update --channel preview --environment preview --message "$MSG" --non-interactive
      env:
        MSG: \${{ github.event.head_commit.message }}

**What was not run.** No EAS account was used, so no update was published and no build ran. The flags were checked
against eas-cli's own --help; the workflow has not run on GitHub.`,
    mcqs: [
      mcq('DabbaDash\'s next release adds expo-camera so cooks can photograph meals. Can it go out with eas update?', [
        ['No: a library with native code needs a new store build', true],
        ['Yes, if the update is published to the production channel', false],
        ['Yes, if the bundle is rolled out to 10% of phones first', false],
        ['No: eas update can ship only changes to images and fonts', false],
      ], 'expo-camera has native code that must be compiled into the binary; an update that uses it on an old binary fails with "Cannot find native module". The channel and the rollout percentage choose who gets an update, not what it may contain, and OTA updates can change JavaScript, not only assets.'),
      mcq('With default expo-updates settings, a user opens the app an hour after a fix is published. When does the fix run?', [
        ['On the next cold start, after it downloads in the background', true],
        ['Immediately, because the app waits for the download at launch', false],
        ['Only after the user updates the app from the Play Store', false],
        ['Only when the app is reinstalled or its data is cleared', false],
      ], 'checkAutomatically ON_LOAD with fallbackToCacheTimeout 0 starts the app on the bundle it has and downloads the new one for the next launch. The app does not wait by default, OTA updates do not go through the store, and no reinstall is needed.'),
      mcq('A CI step runs: eas update --message "${{ github.event.head_commit.message }}". Why is this a problem?', [
        ['A commit message with $(...) or quotes becomes part of the shell', true],
        ['GitHub refuses to expand expressions inside a run step at all', false],
        ['eas update does not accept a message longer than one line', false],
        ['The commit message is a secret and is masked as *** in the logs', false],
      ], 'The expression is pasted into the script before the shell runs it, so a crafted message is executed as shell code; passing it through env keeps it as data. GitHub does expand expressions there, which is exactly the problem, the message length is not the issue, and commit messages are not masked secrets.'),
    ],
    checkpoint: [
      mcq('What does the runtime version guarantee about an EAS update?', [
        ['It runs only on builds whose native layer it was made for', true],
        ['It is installed only after the store has reviewed it again', false],
        ['It is downloaded only on Wi-Fi so it saves the user\'s data', false],
        ['It can be rolled back automatically by Google or by Apple', false],
      ], 'An update is offered only to builds with the same runtimeVersion string, which stands for "this JavaScript fits this native code". Stores do not review OTA updates, Wi-Fi-only checking is a separate setting, and rollbacks are done by you with eas update:rollback.'),
      mcq('Which runtime version policy changes automatically when a native dependency is added, without anyone bumping a number?', [
        ['fingerprint', true],
        ['appVersion', false],
        ['nativeVersion', false],
        ['a fixed string', false],
      ], 'The fingerprint policy hashes everything that affects the native layer, so a new native dependency changes it by itself. appVersion and nativeVersion change only when someone bumps the version or build number, and a fixed string changes only when edited by hand.'),
      mcq('A bad OTA update is live on the production channel. Which command republishes the previous update?', [
        ['eas update:rollback', true],
        ['eas build --clear-cache', false],
        ['eas submit --latest', false],
        ['eas update:edit --branch main', false],
      ], 'eas update:rollback republishes the update group before the latest one, or the embedded bundle if there was none. A build makes a new binary that must still go through the store, submit uploads a build, and update:edit changes the rollout percentage of an update rather than reverting it.'),
    ],
  },

  /* ── MONITORING ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_RELEASE_MONITORING',
    notes: `Once DabbaDash is live, the developers stop seeing it. A crash on a Redmi in Mysuru, a payment screen that freezes
on one bank's UPI app, a checkout button nobody finds: none of it reaches the team unless the app reports it. This
lesson sets up three feeds (crashes, usage, reviews) and the arithmetic to read them.

## Crash reporting with Sentry

Sentry captures JavaScript errors, native crashes on Android and iOS, and app hangs, with the device, OS, app version
and the steps (breadcrumbs) before the error. Setting it up in an Expo app:

    npx expo install @sentry/react-native

- Add the config plugin to app config: ['@sentry/react-native/expo', { organization: 'dabbadash', project:
  'customer-app' }]. It wires the native SDKs and the source-map upload into the build.
- In metro.config.js use getSentryExpoConfig(__dirname) from '@sentry/react-native/metro', which makes the bundle
  and source maps Sentry can match.
- Call Sentry.init early and wrap the root component:

    import * as Sentry from '@sentry/react-native';
    import * as Updates from 'expo-updates';
    import Constants from 'expo-constants';

    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      environment: Constants.expoConfig?.extra?.variant ?? 'production',
      tracesSampleRate: 0.1,          // performance traces for 10% of sessions
      sendDefaultPii: false,
    });
    Sentry.setTag('updateId', Updates.updateId ?? 'embedded');
    export default Sentry.wrap(RootLayout);

The DSN only says where to send events, so it may sit in the bundle. The **auth token**, which can upload files to
your Sentry project, must not: keep it as SENTRY_AUTH_TOKEN, an EAS secret variable for builds and a GitHub secret for
CI. Tagging every event with the update ID tells you at once whether a crash started with an OTA update or a build.

## Source maps: turning bundle:1:84512 into a line of code

A release bundle is minified onto very few lines with short names, so a raw stack trace points at something like
index.android.bundle:1:84512, which no human can read. A **source map** records, for positions in the generated code,
the original file, line, column and name. Sentry stores the maps for each bundle and rewrites every frame of every
event back to your TypeScript.

The maps must be uploaded for **every** bundle users run. The Sentry plugin uploads them during an EAS build when
SENTRY_AUTH_TOKEN is set. An OTA update is a new bundle, so its maps need uploading too: after eas update, run

    npx @sentry/expo-upload-sourcemaps dist

on the dist folder that eas update produced. Forget this step and every crash from the update shows minified frames.

## Crash-free users and crash-free sessions

The two headline numbers answer different questions. **Crash-free sessions** is the share of sessions that did not end
in a crash; **crash-free users** is the share of users who had no crash in the period. A crash that hits a few users
again and again moves sessions a lot and users little; a crash that hits many users once moves users more. Report
both, per release, and compare a new release with the one before at the same stage, not with last month.

Google Play shows its own view in **Android vitals**: user-perceived crash rate and ANR rate, with bad-behaviour
thresholds above which Play may reduce the app's visibility or warn users. The thresholds are on the Android vitals
documentation page; watch the Console, not a number remembered from a blog.

## ANRs

Android shows "App isn't responding" when the app's main thread does not respond to input for about five seconds, and
counts it as an **ANR**. In React Native the main thread runs native UI work; typical causes are a native module doing
disk or network work synchronously on the main thread, a huge synchronous storage read at start-up, or a native SDK
initialising slowly. A JavaScript thread that is busy for seconds makes the app ignore taps without counting as an
ANR, so the vitals look clean while users are stuck; "Performance: Re-renders, Lists, Startup and Memory" covered
finding that. Sentry reports ANRs on Android and app hangs on iOS with the main thread's stack.

## Analytics that answer questions

Start with the question, not the event list. "Where do users drop out between the menu and a paid order?" needs four
events: menu_viewed, item_added_to_cart, checkout_started, payment_succeeded. Rules that keep analytics useful:

- Name events object_action in the past tense, and never change a name once it ships; dashboards depend on it.
- Put context in properties (cook_id, cart_value_paise, payment_app), not in the event name.
- Never send names, phone numbers, addresses or UPI IDs. Use an internal user ID, ask for consent where your privacy
  policy and India's DPDP Act need it, and declare it in the data-safety form and App Privacy label.
- Record the app version and update ID with each event so a change in a funnel can be tied to a release.

Firebase Analytics, PostHog, Amplitude and Mixpanel all work from React Native; the discipline matters more than the tool.

## Ratings and reviews

Store reviews are a support channel with the whole world watching. In the Play Console you can filter reviews by app
version, device and rating, and reply; a polite reply that names the fix ("fixed in 2.4.1, please update") often
turns a one-star into a four. Read one-star reviews after every release; a cluster of "payment stuck" reviews on one
version is a signal as strong as a crash spike.

To ask for a rating, use the platform's in-app review prompt (expo-store-review: StoreReview.requestReview()). The
operating system decides whether it actually appears and limits how often, so never build a flow that depends on it
showing, and never put a "Rate us" button behind it. Ask after a good moment, like the third lunch delivered on time,
never after an error or a crash.`,
    workedExample: `**Scenario.** Three questions from DabbaDash's Monday review: where does a minified crash really come from, what are
last week's crash-free numbers, and where does the ordering funnel lose people?

**1. Symbolicating a frame.** A small cart module was minified with terser (with a source map), the minified code was
called with a cart that had no items array, and the stack frame was mapped back through the source map with the
source-map library. Real output:

    minified: module.exports={cartTotal:function(e){let t=0;for(const o of e.items)t+=o.pricePaise*o.qty;...}};
    error   : e.items is not iterable
    frame   : at cartTotal (.\\bundle.js:1:64)
    original: {"source":"cart.js","line":7,"column":26,"name":"items"}
    line    : for (const line of cart.items) {

Line 1, column 64 of the bundle means nothing; cart.js line 7, the loop over cart.items, is a bug you can fix. Sentry
does this lookup for every frame, if it has the map for that exact bundle. (A real Hermes bundle is bytecode, not
text, but the mapping idea is the same.)

**2. Crash-free rates.** Yesterday: 5,40,000 sessions, 810 ended in a crash; 1,80,000 users, 610 of whom had a crash.

    crash-free sessions: 99.85%   crash-free users: 99.66%

Users is lower because a user counts as crashed if any one of their three or so sessions crashed, and the
denominator is a third the size. 810 crashed sessions from 610 users also says some users crashed more than once.

**3. The funnel.** Synthetic events for 1,000 users who viewed a menu, plus 25 users who paid through a reorder deep
link without viewing a menu:

    menu_viewed           1000  100.0%
    item_added_to_cart     420  42.0%
    checkout_started       300  30.0%
    payment_succeeded      180  18.0%

The cohort is the users who did the first step, so the 25 reorders do not inflate the last step. The largest drop is
menu to cart (58%), which is a product question; checkout to payment loses 120 of 300 (40%), which is where to look
for a UPI app hand-off problem, by payment_app property and app version.`,
    mcqs: [
      mcq('After an OTA update, every DabbaDash crash in Sentry shows frames like index.android.bundle:1:84512. Builds before it were readable. What was missed?', [
        ['Uploading the update\'s source maps after eas update ran', true],
        ['Calling Sentry.wrap on the root component of the update', false],
        ['Adding the Sentry DSN as an EXPO_PUBLIC_ variable again', false],
        ['Turning on tracesSampleRate so stack frames are recorded', false],
      ], 'An OTA update is a new bundle, so Sentry needs that bundle\'s source maps; the build-time upload covered only the embedded bundle. Errors are already arriving, so wrap and the DSN are working, and tracesSampleRate controls performance traces, not stack frames.'),
      mcq('Yesterday a handful of DabbaDash users crashed dozens of times each. Which number moves more?', [
        ['Crash-free sessions falls further than crash-free users', true],
        ['Crash-free users falls further than crash-free sessions', false],
        ['Both fall by the same amount, as they share one numerator', false],
        ['Neither falls, because repeat crashes are grouped in Sentry', false],
      ], 'Each repeat crash is another crashed session, but each user counts once, so repeated crashes for few users pull sessions down more than users. The two rates have different numerators and denominators, and grouping crashes into issues does not remove them from the rates.'),
      mcq('Which analytics event design answers "where do users drop out before paying"?', [
        ['checkout_started and payment_succeeded with an internal user ID', true],
        ['One event per screen named by the screen\'s file path in the code', false],
        ['payment_succeeded with the user\'s phone number for follow-up', false],
        ['A single app_opened event with the full cart as a JSON string', false],
      ], 'A drop-out question needs the steps of the funnel, joined by a stable internal ID. File paths change with refactors and do not mark intent, phone numbers are personal data that analytics must not carry, and one launch event cannot show where people stopped.'),
    ],
    checkpoint: [
      mcq('Why is it safe to ship the Sentry DSN inside the app but not the Sentry auth token?', [
        ['The DSN only sends events; the token can upload and change data', true],
        ['The DSN is encrypted by Hermes, while the token is stored as text', false],
        ['The token expires after each build, so it would stop working', false],
        ['The DSN is checked by Play Protect, while the token is not checked', false],
      ], 'A DSN tells the SDK where to send events and is meant to be public; the auth token has permissions to upload files and manage the project, so it stays a build-time secret. Hermes does not encrypt strings, tokens do not expire per build, and Play Protect does not vet DSNs.'),
      mcq('What causes an ANR on Android in a React Native app?', [
        ['The main thread blocked for seconds while input waits', true],
        ['The JavaScript thread busy rendering a long FlatList', false],
        ['A network request that takes longer than five seconds', false],
        ['A JavaScript promise rejected without any catch handler', false],
      ], 'Android counts an ANR when the main thread does not respond to input for about five seconds, typically because native code blocks it. A busy JavaScript thread freezes taps without an ANR, a slow request on a background thread blocks nothing, and an unhandled rejection is an error, not a hang.'),
      mcq('When should DabbaDash call StoreReview.requestReview()?', [
        ['After a good moment, such as the third on-time delivery', true],
        ['From a "Rate us" button the user can tap whenever they like', false],
        ['Right after an error, to collect feedback on what went wrong', false],
        ['On every launch, since the OS shows the prompt only once', false],
      ], 'The OS decides whether the prompt appears and limits it, so ask at a moment of satisfaction. A button may do nothing when the prompt is suppressed, asking after an error invites a one-star review, and asking on every launch wastes the limited prompts.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_RELEASE_DEBUGGING',
    notes: `Six faults from DabbaDash's release channel in Slack. Release bugs have one thing in common: the app works on the
developer's phone, because the developer's phone runs a debug build from Metro, signed with a debug key, on the
latest JavaScript. So for each one, first ask which build, which key, which channel and which runtime the failing phone
has. Validation errors and checker output below are real (from @expo/eas-json and the workflow checker used in this
topic); store and device messages are as the Android and Expo documentation describe them.

## 1. "Version code has already been used"

**Symptom.** eas submit fails: the Play Console rejects the AAB because its versionCode was already used. Yesterday's
build went through fine.

**Cause.** The production profile had "autoincrement": true, lower-case i. With no validation it was ignored, so
every build carried the versionCode from app config. Fed to the eas-json parser, the file says so at once:

    "build.production.autoincrement" is not allowed

**Fix.** "autoIncrement": true with "appVersionSource": "remote" in the cli section, and eas build:version:set once to
start from a code higher than the last uploaded. Add a CI step that parses eas.json before any build, so a misspelt
key fails in seconds instead of after a cloud build.

## 2. The preview APK will not install over the store app

**Symptom.** QA installs the preview APK on a phone that has DabbaDash from Play. Android refuses ("App not installed";
adb install prints INSTALL_FAILED_UPDATE_INCOMPATIBLE with a signature message).

**Cause.** Both builds used in.dabbadash.app. The store app is signed by Google's app signing key, the APK by the
upload key. Android allows an update only with the same signature.

**Fix.** Not "uninstall first", which only hides it. Give each variant its own application ID through APP_VARIANT in
app.config.ts, so preview and store apps live side by side and nobody tests the wrong build by accident.

## 3. Google login works for QA and fails for every Play user

**Symptom.** "Continue with Google" works in the preview APK. After release, every Play user gets a DEVELOPER_ERROR from
the Google Sign-In library.

**Cause.** The OAuth client was registered with the SHA-1 of the upload key, which QA's APK is signed with. Play
re-signs the app users install with the app signing key, a different certificate.

**Fix.** Add the app signing key's SHA-1 (Play Console, App integrity) to the OAuth client (and to Firebase, if used),
keeping the upload key's for preview builds. Add the check to the release checklist for every new Google service.

## 4. The OTA fix that nobody received

**Symptom.** The double-GST fix was published with eas update at 11:50. At 14:00 support still gets complaints, and
the update dashboard shows almost no downloads.

**Cause.** Two candidates, check both. The developer had already bumped version to 2.5.0 in app config for the next
release, so with the appVersion policy the update was published for runtime 2.5.0, which no phone has. Or the update
went to the preview channel. The rule is exact string matching, as the tested helper shows:

    2.4.0 build gets 2.4.0 update on production: true
    2.3.2 build gets 2.4.0 update: false
    preview build gets production update: false

**Fix.** Publish from the commit the store build was made from (a release branch or tag), or switch to the
fingerprint policy so the runtime follows the native code rather than a number someone edits. Check the runtime and
channel in the update's details before telling support it is fixed.

## 5. The update that crashed on launch

**Symptom.** Minutes after an update, crashes spike: "Cannot find native module 'ExpoCamera'" on every launch of the
menu screen.

**Cause.** The update included the new photo feature, which imports expo-camera. The installed binary has no camera
module; JavaScript cannot add one.

**Fix now:** eas update:rollback, which republishes the previous update. **Fix for good:** native changes go through a
store build; the fingerprint policy would have given the new code a different runtime version, so no old binary could
have received it. A CI check that compares the fingerprint of main with the production build's catches it before
publishing.

## 6. A pipeline that will not run, then hangs

**Symptom.** GitHub marks the new workflow file invalid. After the obvious typo is fixed, the preview job hangs until
the timeout.

**The file** (abridged): preview-update has needs: checks, the expo action has no token, and the step is
eas update --channel preview --message "\${{ github.event.head_commit.message }}". The checker's real output:

    preview-update: needs unknown job "checks"
    preview-update: runs eas without expo-github-action and a token
    preview-update step 4: expression inside run: \${{ github.event.head_commit.message }}
    preview-update step 4: eas without --non-interactive

**Cause and fix.** The job is called check, so needs must say check; GitHub rejects a workflow whose needs names a
job that does not exist (it does not quietly drop the dependency). Then eas waited for a login prompt nobody could
answer: give the action token: \${{ secrets.EXPO_TOKEN }} and pass --non-interactive. And
move the commit message into env, so a message like fix "cart" $(curl ...) stays text.`,
    mcqs: [
      mcq('An eas update was published and almost no phones downloaded it. app config already says version 2.5.0; phones run 2.4.0 with the appVersion policy. What happened?', [
        ['The update was made for runtime 2.5.0, which no installed build has', true],
        ['Phones download updates only on Wi-Fi, so the rollout is just slow', false],
        ['Google Play must approve the update before phones can download it', false],
        ['The update is waiting for users to reinstall the app from the store', false],
      ], 'With appVersion the runtime version is the version string, and updates match it exactly, so a 2.5.0 update reaches no 2.4.0 phone. Wi-Fi-only is a setting the app did not use, Play does not review OTA updates, and no reinstall is involved.'),
      mcq('Google Sign-In fails only for users who installed from Play. Preview APKs work. Where is the missing fingerprint found?', [
        ['In the Play Console under App integrity, as the app signing key', true],
        ['In the output of keytool -list on the developer\'s debug keystore', false],
        ['In the eas credentials output for the iOS distribution certificate', false],
        ['In the AAB file, by hashing it with SHA-1 before uploading it', false],
      ], 'Play re-signs installed apps with the app signing key, whose fingerprints the Play Console shows under App integrity. The debug key signs only debug builds, an iOS certificate is unrelated to Android, and a hash of the AAB is not a certificate fingerprint.'),
      mcq('Minutes after an update, the app crashes with "Cannot find native module \'ExpoCamera\'". What is the first thing to do?', [
        ['Run eas update:rollback to republish the previous update', true],
        ['Upload the update\'s source maps so the crash is readable', false],
        ['Halt the staged rollout of the build in the Play Console', false],
        ['Bump the versionCode and publish the same update again', false],
      ], 'The bad JavaScript is the update, so republishing the previous update stops the crash fastest. Source maps make it readable but leave users crashing, halting a Play rollout does nothing to an OTA update, and republishing the same bundle repeats the crash.'),
      mcq('A workflow\'s shipping job says needs: checks, but the job that runs the tests is called check. What is the right fix?', [
        ['Change needs to check so shipping waits for the tests', true],
        ['Remove needs entirely so that both jobs run in parallel', false],
        ['Add continue-on-error to the test job so it never blocks', false],
        ['Rename the job to checks and also skip it on main branch', false],
      ], 'needs must name a real job so the shipping job runs only after the tests pass. Removing needs or ignoring test failures ships untested code, and skipping the test job on main defeats the reason it exists.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_RELEASE_PRACTICE',
    notes: `Eight exercises, from quick to involved. Work each on paper or in the Expo project before reading the answer. The
numbers in the answers were computed with the same code used in the lessons.

## 1. Version bumps (easy)

DabbaDash is at 2.4.0. Name the next version for: (a) a fix to the GST line, (b) a new "schedule for tomorrow" feature,
(c) a rewrite that drops support for an old saved-address format and forces users to re-enter addresses.

**Answer.** (a) 2.4.1, patch. (b) 2.5.0, minor, and the patch goes back to 0. (c) 3.0.0, major, because existing users
lose something. Then: is 2.10.0 newer than 2.9.3? Yes, compared as numbers part by part; compared as strings it looks
older, which is why version comparison must parse the parts.

## 2. A versionCode scheme (easy)

You derive versionCode as ((major x 1000 + minor) x 100 + patch) x 100 + build. Compute it for 2.4.1 build 0 and 2.10.0
build 0, and say whether 2.10.0 sorts above 2.9.99 build 99.

**Answer.** 2.4.1 gives 20040100; 2.10.0 gives 20100000; 2.9.99 build 99 gives 20099999, so 2.10.0 is higher, as it must
be. The scheme stays under Play's ceiling of 2,100,000,000 up to major version 210. Its weak point is that minor
cannot exceed 999 and patch cannot exceed 99; the function should throw rather than wrap.

## 3. OTA or store build? (medium)

For each change, say eas update or store build: (a) a typo on the help screen; (b) a Diwali banner image imported from
JavaScript; (c) adding react-native-maps; (d) adding android.permission.CAMERA to app config; (e) upgrading to the next
Expo SDK; (f) a new JavaScript-only date library; (g) changing the app icon.

**Answer.** Over the air: (a), (b), (f). Store build: (c) native code, (d) a manifest change, (e) a new native layer,
(g) the icon is a native resource. If you are unsure about a change, compare fingerprints before and after it: in the
lesson a JavaScript change left the hash unchanged and a permission change altered it.

## 4. Which phones get this update? (medium)

Three builds are installed: production 2.4.0 (runtime 2.4.0), production 2.3.2 (runtime 2.3.2) and preview 2.4.0. You
run eas update --channel production from a commit whose app config says version 2.4.0, with the appVersion policy.
Who receives it?

**Answer.** Only production 2.4.0. 2.3.2 has a different runtime string; the preview build has a different channel. To
fix the GST bug for 2.3.2 users too, publish the same fix again from the 2.3.2 release commit, or ask them to update
from the store.

## 5. A rollout gate (medium)

Baseline crash rate 0.15% of sessions. The gate: at least 20,000 sessions before widening; halt if the 95% lower bound
of the crash rate is above 0.4% or above 1.5 x baseline (0.225%). Decide for 31 crashes in 6,500 sessions, 4 in
2,000, 43 in 27,000 and 70 in 27,000.

**Answer.** 31/6,500 = 0.477% with lower bound 0.336%: above 0.225%, halt. 4/2,000: too few sessions, wait. 43/27,000 =
0.159%: widen. 70/27,000 = 0.259%, lower bound 0.205%: not a halt, but above 1.5 x baseline, so hold and read the new
crash groups first.

## 6. Crash-free arithmetic (medium)

Yesterday: 5,40,000 sessions with 810 crashes, from 1,80,000 users of whom 610 crashed. Compute both crash-free rates
and explain why they differ.

**Answer.** Sessions: 1 - 810/5,40,000 = 99.85%. Users: 1 - 610/1,80,000 = 99.66%. A user counts as crashed if any of
their sessions crashed, and there are a third as many users as sessions, so the user rate is lower. 810 crashes from
610 users means some users crashed repeatedly; look for a crash that loops on launch.

## 7. eas.json review (medium)

A colleague's production profile is { "distribution": "store", "autoincrement": true, "android": { "buildType": "aab" } }.
Find the problems.

**Answer.** autoincrement should be autoIncrement (the parser says "is not allowed"), and buildType takes app-bundle or
apk, not aab (the parser says "must be one of [apk, app-bundle]"). For production, leave buildType out: app-bundle is
the default. Also check that the cli section has "appVersionSource": "remote", or autoIncrement has nothing to bump
on the server.

## 8. Design the release pipeline (involved)

Write the plan, in words, for DabbaDash's GitHub Actions: what runs on a pull request, on a merge to main and on a
v2.4.1 tag; where secrets live; and how a JavaScript hotfix reaches production.

**Answer.** Pull request: npm ci, tsc --noEmit, lint, jest --ci; nothing ships. Merge to main: the same checks, then
eas update --channel preview --environment preview --non-interactive, with the commit message passed through env. Tag:
the checks, then eas build --profile production --non-interactive --auto-submit --no-wait to the internal track; a
person promotes it in the Play Console and starts a staged rollout. Secrets: EXPO_TOKEN in GitHub secrets;
SENTRY_AUTH_TOKEN and the Play service account as EAS secret variables. Hotfix: branch from the release tag, fix, run
the checks, eas update --channel production with --rollout-percentage 10, upload its source maps to Sentry, widen with
eas update:edit when the crash rate holds, and merge the fix back to main.`,
    mcqs: [
      mcq('DabbaDash 2.4.0 gets a fix for a crash in the address form and nothing else. What is the next version?', [
        ['2.4.1', true],
        ['2.5.0', false],
        ['3.0.0', false],
        ['2.4.0.1', false],
      ], 'A fix that adds no feature and breaks nothing is a patch bump, 2.4.1. 2.5.0 signals a new feature, 3.0.0 a breaking change, and semantic versioning has three parts, so 2.4.0.1 is not a valid version.'),
      mcq('Which of these changes can DabbaDash ship with eas update to existing 2.4.0 phones?', [
        ['A new Diwali banner image imported from a screen', true],
        ['react-native-maps added for live rider tracking', false],
        ['The app icon redrawn in the new brand colours', false],
        ['android.permission.CAMERA added to the app config', false],
      ], 'An image imported from JavaScript travels with the bundle, so it goes over the air. A library with native code, the icon and a permission all live in the native layer and need a store build.'),
      mcq('A rollout snapshot shows 4 crashes in 2,000 sessions against a gate that needs 20,000 sessions. What should happen?', [
        ['Wait for more sessions before deciding anything', true],
        ['Halt, because 0.2% is higher than the baseline', false],
        ['Widen, because four crashes is a tiny number', false],
        ['Roll back the build to the previous versionCode', false],
      ], 'With 2,000 sessions the 95% interval runs from about 0.08% to 0.51%, so the data cannot tell good from bad yet. Halting or widening on that much noise is guessing, and Play cannot roll back to a lower versionCode anyway.'),
      mcq('Production 2.3.2 users also have the GST bug. The fix was published from the 2.4.0 commit with the appVersion policy. How do 2.3.2 users get it?', [
        ['Publish the fix again from the 2.3.2 release commit', true],
        ['Change the 2.4.0 update\'s channel to match 2.3.2', false],
        ['Raise the rollout percentage of the 2.4.0 update', false],
        ['Nothing: 2.3.2 phones receive 2.4.0 updates too', false],
      ], 'An update reaches only builds with an identical runtime version, so 2.3.2 needs its own update made from code that fits its native layer. Channels select builds by profile, not version, the rollout percentage only widens the same runtime, and 2.3.2 does not match 2.4.0.'),
      mcq('In the pipeline, why does the tag job use eas build with --no-wait?', [
        ['The build runs on EAS, so the CI runner need not idle', true],
        ['Without it, EAS refuses to build when the tests passed', false],
        ['It skips the store review for the build being submitted', false],
        ['It makes the build use the cache from the previous build', false],
      ], 'With --no-wait the command queues the build on EAS and returns, so a CI runner is not held for the whole build. It has nothing to do with tests passing, store review still happens, and caching is controlled separately.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_RELEASE_INTERVIEW_QUESTION',
    notes: `Four questions interviewers ask React Native candidates about releasing, at product companies, start-ups and service
companies alike. Each has an answer that scores well and the follow-up a good interviewer asks next. Say them aloud,
about two minutes each, and put your own app in place of DabbaDash: a published app, even a small one on an internal
test track, is the strongest evidence you can bring.

## Q1. "Walk me through how your app gets from a merged pull request to users."

**Model answer.** "Every pull request runs type-checks, lint and Jest in GitHub Actions. A merge to main publishes an
EAS Update to the preview channel, so QA's phones have it in minutes. When we cut a release I tag it; the tag job runs
eas build for production with auto-increment and auto-submit to Play's internal track. QA tests that exact build, then
I promote it to production with a staged rollout, 1 to 5 to 20 per cent, and widen only if the crash-free rate in
Sentry is in line with the previous version. JavaScript hotfixes go out with eas update to the production channel,
also rolled out by percentage."

**Follow-up: "What do you do if the 5% rollout shows a crash spike?"** "Halt the rollout in the Play Console, so no new
users get it. Users who have it keep it, because Play cannot downgrade, so I look at the crash in Sentry with source
maps. If the cause is in JavaScript I ship a fix over the air to that runtime version; if it is native, I fix it and
ship a new build with a higher versionCode."

## Q2. "What can and can't you change with an over-the-air update?"

**Model answer.** "The binary has the native layer and an embedded JavaScript bundle; an update replaces only the
bundle and its assets. So JavaScript, JavaScript-only libraries and images can change. Anything native cannot: a new
native module, permissions, the icon, the app ID, the Expo SDK version. The runtime version makes that safe: an
update is delivered only to builds whose runtime version matches. I use the fingerprint policy, so a native change
makes a new runtime version by itself. And I keep to the store rules: fixes and small changes over the air, new
features through review."

**Follow-up: "How would you know an update broke something, and how do you undo it?"** "Every Sentry event carries
the update ID, so a spike lines up with an update. I publish with a rollout percentage and widen with update:edit;
if it is bad, eas update:rollback republishes the previous update. I also upload the update's source maps, or the
stack traces would be unreadable."

## Q3. "What is Play App Signing, and what happens if you lose your keystore?"

**Model answer.** "Android only installs an update signed with the same certificate as the installed app. With Play
App Signing, Google keeps the app signing key and signs what users install; I sign uploads with an upload key. If the
upload key is lost or leaked, the account owner requests an upload key reset and users never notice. Without Play App
Signing, losing the signing key means the app can never be updated; you would publish a new app. In practice EAS
generated our keystore and stores it, and we keep a backup in the company vault."

**Follow-up: "Why did Google Sign-In break only in the Play build?"** "Because the OAuth client had the upload key's
SHA-1, and Play-installed apps are signed with the app signing key. The fix is to add the app signing key's SHA-1 from
the App integrity page."

## Q4. "How do you monitor a mobile app in production?"

**Model answer.** "Three feeds. Crashes and hangs in Sentry, with source maps uploaded for every build and every
update, and events tagged with version and update ID; I watch crash-free users and sessions per release. Product
analytics with events designed from questions, such as the order funnel from menu to payment, with an internal user
ID and no personal data. And Play's Android vitals and store reviews filtered by version: a cluster of one-star
'payment stuck' reviews on one version is as strong a signal as a crash spike."

**Follow-up: "Crash-free sessions is 99.85% but crash-free users is 99.66%. Which is right?"** "Both. A user counts as
crashed if any session crashed, and there are fewer users than sessions, so the user rate is lower. If sessions are
much worse than users, a few users are crashing repeatedly, which often means a crash on launch."`,
    mcqs: [
      mcq('Asked "what can an OTA update change?", which answer shows the candidate understands the mechanism?', [
        ['The bundle and its assets, gated by a matching runtime version', true],
        ['Anything in the app, since the update replaces the whole binary', false],
        ['Only text and images, because code changes need a store review', false],
        ['Only the native modules that were already listed in app.json', false],
      ], 'An update replaces the JavaScript bundle and its assets, and runtime versions keep it off builds whose native layer does not fit. It never replaces the binary, it can change JavaScript code, not just text, and it cannot add or change native modules.'),
      mcq('An interviewer asks what you do when a 5% rollout shows a crash spike. Which first step is right?', [
        ['Halt the rollout, then find the cause in Sentry with source maps', true],
        ['Push the rollout to 100% so the spike is diluted across users', false],
        ['Unpublish the app from Play until the crash has been fixed', false],
        ['Ask the affected users to uninstall and install the old APK', false],
      ], 'Halting stops the spread while you diagnose; source-mapped stack traces show the cause. Widening spreads the crash, unpublishing removes the app for everyone, and asking users to side-load an old APK is neither safe nor possible over a newer signed install without uninstalling.'),
      mcq('"What happens if you lose the keystore?" Which answer is accurate for an app on Play App Signing?', [
        ['If it is the upload key, the owner requests a reset; users are unaffected', true],
        ['The app can never be updated again and must be published under a new ID', false],
        ['Google regenerates the same keystore from the Play Console on request', false],
        ['Users must reinstall, because their app will no longer accept updates', false],
      ], 'Under Play App Signing the keystore you hold is the upload key, which Play can reset; installs stay signed with the app signing key. Losing the key forever applies to apps without Play App Signing, Google cannot recreate your private key, and users notice nothing.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_RELEASE_CHECKPOINT',
    notes: `Ten questions across the topic: builds, versions and signing; Google Play tracks and rollouts; the App Store in
outline; over-the-air updates and CI; and monitoring a live app. Answer without notes; the result shows which lesson
to revisit.`,
    checkpoint: [
      mcq('What is true of a release build that is not true of a debug build in a React Native app?', [
        ['Its JavaScript is embedded, minified and run with __DEV__ false', true],
        ['It loads JavaScript from Metro so changes appear without rebuilding', false],
        ['It shows the red error screen with a full stack trace on a crash', false],
        ['It is signed with the debug keystore that Android tools generate', false],
      ], 'A release build carries its own minified bundle, runs with __DEV__ false and is signed with your key. Loading from Metro, the red error screen and the debug keystore all describe debug builds.'),
      mcq('A team wants preview and production builds of a food app installed on one QA phone. What makes this possible?', [
        ['A different application ID for each variant', true],
        ['A higher versionCode for the preview build', false],
        ['The same signing key for both of the builds', false],
        ['A separate EAS Update channel for each one', false],
      ], 'Android treats one application ID as one app, so different IDs install side by side. A higher versionCode replaces the app, a shared key still replaces it, and channels decide which updates a build receives, not whether two builds can coexist.'),
      mcq('Why can a stolen upload key be dealt with without affecting users on Play App Signing?', [
        ['Installs are signed with the app signing key that Google keeps', true],
        ['Upload keys expire on their own after each successful upload', false],
        ['Play re-signs uploads with the developer\'s debug keystore', false],
        ['Phones accept updates signed by any key from the same account', false],
      ], 'Users\' phones see only the app signing key, so replacing the upload key changes nothing for them. Upload keys do not expire per upload, Play never uses a debug key, and Android requires the same certificate for an update, not just the same account.'),
      mcq('DabbaDash halts a staged rollout of 2.4.0 at 5%. What happens to the 5% who already updated?', [
        ['They keep 2.4.0 until a higher version reaches them', true],
        ['Play reinstalls version 2.3.2 on their phones overnight', false],
        ['Their copy stops opening until 2.4.1 is in the store', false],
        ['They are moved to the closed testing track for 2.4.0', false],
      ], 'Halting only stops further distribution; installed copies stay, which is why a fix ships as 2.4.1 or as an OTA update. Play does not downgrade or disable apps, and tracks do not move existing users.'),
      mcq('An Indian ed-tech app sells a recorded course watched inside its iOS app. Under the App Review Guidelines, how is it sold?', [
        ['Through in-app purchase, as digital content used in the app', true],
        ['Through the company\'s own UPI gateway, like physical goods', false],
        ['Through any method, because App Review does not check prices', false],
        ['Only through TestFlight, until the course has been reviewed', false],
      ], 'Digital content consumed in the app falls under the in-app purchase rule in section 3.1. The own-gateway route is for physical goods and services used outside the app, App Review does check how digital goods are sold, and TestFlight is for testing, not selling.'),
      mcq('With no Mac, how does a Windows team test an iOS build on a real iPhone?', [
        ['Register the iPhone with eas device:create and install an internal build', true],
        ['Run the iOS Simulator inside Android Studio\'s device manager on Windows', false],
        ['Install the .ipa file directly by copying it to the iPhone over USB', false],
        ['Build the app with --local on Windows and then sideload it to the iPhone', false],
      ], 'An ad hoc internal build installs on registered devices, built on EAS\'s macOS machines; TestFlight is the other route. There is no iOS Simulator on Windows, an unsigned or unprovisioned copy will not install, and local iOS builds need macOS.'),
      mcq('An update published with the fingerprint policy adds a call to a new native module. Which phones receive it?', [
        ['Only builds whose native fingerprint includes that module', true],
        ['Every phone on the channel, which then crashes on launch', false],
        ['Every phone, but the call is skipped where the module is missing', false],
        ['No phones until Google Play and Apple approve the new update', false],
      ], 'The new native module changes the fingerprint, so the update gets a runtime version that only a matching new build has. That is exactly the protection the policy gives; expo-updates does not skip missing modules, and stores do not review OTA updates.'),
      mcq('Why must every eas command in a CI workflow run with --non-interactive?', [
        ['A prompt in CI waits for input that never comes', true],
        ['Interactive mode uploads the project twice to EAS', false],
        ['It is the only mode that reads the EXPO_TOKEN value', false],
        ['Interactive mode skips the eas.json validation step', false],
      ], 'In CI nobody can answer a question, so a prompt hangs the job until the timeout; --non-interactive makes eas fail with a message instead. It does not change uploads, EXPO_TOKEN is read in both modes, and eas.json is validated either way.'),
      mcq('Sentry shows crashes from the newest OTA update as unreadable minified frames. What fixes this for the next update?', [
        ['Upload the update\'s source maps in the pipeline after eas update', true],
        ['Set tracesSampleRate to 1.0 so every session records full stacks', false],
        ['Build a new binary, since only builds can have source maps at all', false],
        ['Turn off Hermes so the bundle stays readable JavaScript in Sentry', false],
      ], 'Each update is a new bundle and needs its own maps uploaded, for example with @sentry/expo-upload-sourcemaps on the dist folder. Trace sampling is about performance data, updates do have source maps, and turning off Hermes slows the app and still leaves the code minified.'),
      mcq('What does Android count as an ANR?', [
        ['The main thread not answering input for about five seconds', true],
        ['The JavaScript thread taking longer than one frame to render', false],
        ['Any crash that happens while the app is in the background', false],
        ['A network call that has not returned within ten seconds', false],
      ], 'An ANR is the main thread blocked while input waits, about five seconds by the Android documentation. A slow JavaScript frame is jank, a background crash is a crash, and a slow network call on another thread blocks nothing.'),
    ],
  },
];
