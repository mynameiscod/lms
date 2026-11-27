/**
 * Career-track content: The Mobile Candidate (MB_PLACE_CANDIDATE), Mobile, batch MB4 — the last topic of Year-4
 * placement for the Mobile App Development track. The shared Year-4 packs teach resume format, aptitude, HR and generic
 * mocks; this is the mobile version: a resume whose every claim can be checked on a phone (crash-free sessions, cold
 * start, list frame rate, testers on the internal testing track), the capstone app as the portfolio (an installable
 * build, a README, a short demo video) and GitHub hygiene; React Native, native Android and iOS, and Flutter roles in
 * India with the employer types and their rounds; and one complete mobile interview day with a rubric and debrief.
 * Modelled on QA_PLACE_CANDIDATE. The question banks are the other placement topics (MB_IV for concepts, its MOCK unit
 * for the technical round's script; MB_SCENARIO_ROUNDS for build-a-screen, debugging, take-home and live coding), and
 * they are referred to by title rather than repeated.
 *
 * The evidence throughout is the track's capstone (MB_CAPSTONE: GharFix, the fictional Hyderabad home-services booking
 * app, or CampusKart). The capstone was not run on a phone, so it has no reference figures: the numbers in the worked
 * resume are a fictional student's own measurements, labelled as illustrative, and students replace each with figures
 * from their own Sentry project, performance table and Play Console. No salary figures, store fees, review times or
 * company-specific claims; the notes send students to the official Play Console and Expo pages.
 *
 * Verified (scratchpad mb_env, Node 23, Expo SDK 58 project, TypeScript 6, Jest 30 with jest-expo): the round-0
 * output-prediction snippets printed the outputs quoted; the round-1 mergePages solution type-checked under strict
 * tsc, its five tests plus the printing test passed (6 passed), and the two naive versions printed the wrong results
 * quoted (seven rows with a duplicate; a stale PREPARING status). Not run: anything on a device, the Play Console, EAS,
 * Sentry or a screen recorder; those parts are written from docs.expo.dev and the Play Console Help.
 *
 * Attribution: the topic is multi-skill (PLACEMENT_READINESS default, PORTFOLIO_EVIDENCE, INTERVIEW_PERFORMANCE).
 * Every checkpoint question names its skill with ck(), within what its unit declares; practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const PR = 'PLACEMENT_READINESS';
const PE = 'PORTFOLIO_EVIDENCE';
const IP = 'INTERVIEW_PERFORMANCE';

export const TRACK_MB_PLACE_CANDIDATE_BUNDLES: PilotBundle[] = [
  /* ── RESUME ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_PLACE_CANDIDATE_RESUME',
    notes: `The shared Year-4 resume pack covers format, length and the basics. This unit is the **mobile developer** version:
the resume that gets through the filter for roles titled "React Native Developer", "Mobile Application Developer",
"Software Engineer — Mobile", "Associate Engineer (Android)" or a services firm's generic trainee role with a mobile
practice, and an app the reviewer can install. Every applicant writes "React Native, Redux, Firebase, REST APIs", so
the list proves nothing. A mobile developer is judged by something no web resume can offer: **the reviewer can hold
your work in their hand.** Every claim on your resume should be checkable on a phone within five minutes.

## Who reads it, and what they filter on

| Employer | Typical first filter | What wins the shortlist |
|---|---|---|
| Product companies and funded startups (Bengaluru, Hyderabad, Pune, Gurugram) | React Native or Kotlin, TypeScript, a shipped or installable app, DSA basics | An app they can install, a clean repo, numbers from a release build |
| Global capability centres (banks, retailers, travel) | React Native or native Android, TypeScript, testing, Git and CI, process | Tests and CI, accessibility, security basics done right |
| IT services firms with a mobile practice | Aptitude, one language well, "mobile development" as a skill | Fundamentals answered crisply, one finished app, willingness to learn a client stack |
| Small agencies building apps for clients | Can you ship a whole app alone: screens, API, store release | A build on a store testing track and a demo video |

## The skills line a filter searches

Use the job description's spellings, grouped, and only what you can defend for ten minutes:

    Languages:    TypeScript, JavaScript (ES2022), Kotlin (basics: data classes, null safety, coroutines in outline)
    Mobile:       React Native (new architecture), Expo (development builds, Expo Router, EAS Build and Update)
    State/data:   TanStack Query, Zustand, Redux Toolkit, react-hook-form + zod, expo-sqlite, expo-secure-store
    Device:       camera and permissions, notifications (expo-notifications, FCM), location
    Quality:      Jest + React Native Testing Library, Maestro (one E2E flow), performance profiling, accessibility
    Release:      signed AAB, Play Console internal testing track, Sentry with source maps, GitHub Actions

Leave out what you only watched: Flutter, Swift, SwiftUI, GraphQL, Detox, "AI/ML integration" — unless you built with
them. **Every word on this line is a question:** "Redux Toolkit" means "when would you not use it?"; "Expo" means
"what can a development build do that Expo Go cannot?"; "Kotlin" means the native questions in Mobile Developer
Interview Questions. If a JD names a tool you know only by its equivalent, map it aloud ("I used TanStack Query; RTK
Query solves the same caching problem with tags instead of keys").

## Bullets: what you built + the evidence + the result

A mobile bullet is credible when it names the app, the decision and a number someone could recheck. The numbers
mobile panels trust, and how to make each one honest:

| Number | Where it comes from | Say alongside it |
|---|---|---|
| Crash-free sessions | Sentry (or Play Android vitals once you have enough users) for the release | The denominator: "0 crashes in 140 sessions from 9 testers" — a small sample, said as one |
| Cold start | Cold start to first useful screen, release build, three runs | The phone model and that it is a release build |
| List frame rate | Performance monitor while scrolling, release build | JS and UI frame rates, phone model, before and after the fix |
| Testers and installs | Play Console internal testing track | "9 testers on 7 phone models"; never call testers "users" |
| Rating | A public store listing only | If the app is not public, there is no rating to claim; quote tester feedback instead |
| Size | AAB or download size from EAS or the Play Console | What you removed to shrink it |

Rules of thumb: a debug-build number is not a performance number (Performance: Re-renders, Lists, Startup and Memory);
a crash-free rate from nine testers is a sanity check, not a reliability claim (Crashes, Analytics and Ratings in
Production taught why small samples mislead); "4.8 stars" on an app nobody outside your friends installed reads as a
bluff. Keep the Sentry screenshot, the performance table and the Play Console tester list behind each number.

- Weak: "Developed a cross-platform mobile app using React Native, Redux and Firebase with a beautiful UI."
- Offline: "Bookings made with no signal go to an expo-sqlite outbox with an idempotency key and send once on
  reconnect; airplane-mode test on a phone left exactly one booking on the server."
- Performance: "Slots list dropped to about 40 fps on a mid-range Android phone (release build); stable renderItem,
  memoised rows and getItemLayout brought it to a steady 60 fps."
- Release: "Signed AAB through EAS to the Play internal testing track; 9 testers on 7 phone models; Sentry with
  source maps, 0 crashes in 140 sessions over three weeks."

## The capstone is the portfolio — three things a reviewer can use

1. **A build they can install.** The Play internal testing track needs the tester's email on your list, so say in
   the README "email me and I will add you within a day", and also link an EAS internal-distribution APK (the
   preview profile) for anyone with the link. Point it at a reachable API, not 127.0.0.1 (Capstone Build — Offline,
   Device Features and Release).
2. **A README that answers the reviewer's first five minutes:** what the app does and for whom; a row of three or four
   phone screenshots; the install link and the demo video at the top; the stack with one reason per choice; a results
   table (tests, cold start, list fps, crash-free with its denominator, AAB size, phone model); how to run it in one
   command; and **what is not done** (no iOS build tested, no production release).
3. **A demo video of two minutes or less**, recorded from a real phone: sign in, book, the airplane-mode booking,
   the denied camera, the notification arriving. No music, captions on, unlisted on YouTube or in the repo's releases.
   It carries everything a busy reviewer will not install.

## GitHub hygiene

- **Never commit:** the upload keystore or credentials.json, a Play service-account JSON, .env files with real keys,
  a Sentry auth token. EXPO_PUBLIC_ values are compiled into the bundle, so nothing secret goes there either (Mobile
  App Security Basics). Rotate anything ever pushed: deleting it leaves it in history.
- **Generated folders:** with Expo's prebuild (continuous native generation), android/ and ios/ are generated, and
  many teams git-ignore them; if you edited native code by hand, commit them and say why in the README.
- **Signals a reviewer notices:** a pinned repo, a CI badge that is green, tsc and tests running in CI, commit messages
  that say why ("queue bookings offline with idempotency key"), not "final changes 2", one feature per pull request
  even when you are alone, and a LICENSE.
- **Not yours to publish:** an internship's source code or screens, a client's app, real customers' names, phone
  numbers or addresses in screenshots. Synthetic data only.

## Copies for different roles — the facts never change, only the order

| Target | Lead with | Push down |
|---|---|---|
| React Native at a product company | The installable app, architecture, performance numbers | Kotlin |
| Android-leaning role | The native module (Kotlin, Expo Modules API), lifecycle and permissions | State-library details |
| GCC mobile team | Tests, CI, accessibility, security basics | The visual polish |
| Services firm trainee | Fundamentals, one finished app, TypeScript and Java/Kotlin basics | Release internals |

LinkedIn and Naukri use the same spellings and the same numbers; put the demo video in LinkedIn's Featured section.`,
    workedExample: `**A weak mobile resume, rewritten in full.** Farhan, B.Tech (ECE) 2026 from Vijayawada, sends this:

    FARHAN SHAIK — Mobile App Developer | farhan@example.com | +91-9XXXXXXXXX
    OBJECTIVE: To work in a challenging environment where I can utilise my skills for the growth of the organisation.
    SKILLS: React Native, Flutter, Swift, Kotlin, Java, Android Studio, Firebase, Redux, MongoDB, AWS, AI/ML, Figma
    PROJECTS
      1. Swiggy clone in React Native with Firebase — beautiful UI, 4.9 rating.
      2. GharFix — home-services app. Used React Native, Expo, TypeScript and many libraries.
    EDUCATION: B.Tech ECE, 2026, CGPA 7.9

**What a mobile panel sees.** Twelve technologies and depth in none; Flutter and Swift he never shipped. "Swiggy clone"
copies a real company's brand, has no rating anyone can find, and "4.9" invites the question "where?". The GharFix line
— his real work — says nothing he decided or measured. There is no link to install, watch or read.

**Step 1 — inventory what is true.** His GharFix capstone has typed Expo Router screens, OTP sign-in with single-flight
refresh, an expo-sqlite outbox, the camera with a denied path, local reminders, 31 Jest tests, one Maestro flow, a
signed AAB on the internal testing track with 9 testers, and Sentry. His own measurements (illustrative — use yours):
slots list about 40 fps before the row fix and 60 after, cold start 1.9 s median of three runs, all in a release build
on a mid-range Android phone; Sentry shows 0 crashes in 140 sessions over three weeks; AAB 31 MB, down from 38 MB after
removing an unused icon font. He wrote one Kotlin native module in the Android topic. He never built with Flutter or
Swift.

**Step 2 — rewrite.**

    FARHAN SHAIK — React Native Developer (fresher)
    farhan@example.com | github.com/farhan-s | linkedin.com/in/farhan-s | Vijayawada, open to relocate

    PROJECT
    GharFix — home-services booking app (Android)              github.com/farhan-s/gharfix | demo video | tester link
    TypeScript, React Native, Expo Router, TanStack Query, Zustand, expo-sqlite, Jest, Maestro, EAS, Sentry
     - Offline booking: an expo-sqlite outbox with idempotency keys, flushed on reconnect; airplane-mode test on a
       phone left exactly one booking on the server.
     - Auth: OTP sign-in, refresh token in expo-secure-store, single-flight refresh (test: three parallel 401s, one
       refresh call).
     - Performance (release build, mid-range Android): slots list 40 to 60 fps with memoised rows and getItemLayout;
       cold start 1.9 s, median of 3.
     - Release: signed AAB via EAS to the Play internal testing track, 9 testers on 7 phone models; Sentry with
       source maps, 0 crashes in 140 sessions.
     - Quality: 31 Jest and Testing Library tests and one Maestro flow in GitHub Actions; screen-reader labels.

    SKILLS
    TypeScript, JavaScript | React Native, Expo (dev builds, EAS) | TanStack Query, Zustand, react-hook-form + zod
    expo-sqlite, expo-secure-store, notifications | Jest, Maestro | Kotlin basics (one Expo native module) | Git

    EDUCATION   B.Tech, Electronics and Communication, 2026 — CGPA 7.9

**Step 3 — remove what must go.** The objective line goes. Flutter, Swift, MongoDB, AWS, AI/ML and Figma come off.
The Swiggy clone goes entirely: it borrows a real brand and claims a rating that does not exist. For a JD that says
"Flutter preferred" he keeps the truth and maps it: "my app is React Native; the state, offline and release ideas carry
over, and I can show a Flutter screen I built from the docs this week" — only once he has actually built it.`,
    mcqs: [
      mcq('Sana\'s capstone has 9 testers on the Play internal testing track and Sentry shows no crashes in 140 sessions. Which resume line is honest?', [
        ['"0 crashes in 140 sessions from 9 testers over three weeks (Sentry)"', true],
        ['"99.9% crash-free rate in production across all Android devices"', false],
        ['"Zero-crash app trusted by users, with a 4.8 rating on the store"', false],
        ['"Crash-free and stable on every phone model sold in the Indian market"', false],
      ], 'Giving the count, the source and the small denominator lets a reader judge it, and nine testers is a sanity check, not production. The others turn a tiny internal test into production reliability, invent a public rating the app cannot have, or claim every phone model.'),
      mcq('Rohan measured his order list at 58 fps "after the fix". Which detail must he add before the number means anything to a mobile panel?', [
        ['That it was a release build, on which phone, and the figure before the fix', true],
        ['The exact version of React Native he used, so readers can repeat the run', false],
        ['That the fps was measured on the emulator, since emulators are consistent', false],
        ['A promise that the list will stay at 58 fps however many rows are added', false],
      ], 'Debug builds are much slower and phones differ hugely, so build type and device make the figure checkable, and the before-figure shows the fix did something. A version number alone does not, an emulator on a laptop says little about a mid-range phone, and a promise is not a measurement.'),
      mcq('A reviewer wants to try Divya\'s app today, but the Play internal testing track only admits listed testers. What should her README offer?', [
        ['An offer to add their email within a day, plus a preview APK link and the demo video', true],
        ['The upload keystore and its password, so the reviewer can build and sign a copy too', false],
        ['Nothing extra, because reviewers expect to wait until the app reaches production', false],
        ['A link to the Expo Go QR code from her laptop, which works from anywhere at any time', false],
      ], 'Testers must be on the list, so offering to add them, an internal-distribution APK and a video together cover every reviewer. Sharing the upload key is a security mistake, waiting for production loses the reviewer, and a dev-server QR code only works while her laptop serves it on a reachable network.'),
    ],
    checkpoint: [
      ck(PR, 'Karthik\'s skills line reads "React Native, Flutter, Swift, Kotlin, Firebase, AWS, AI/ML". He built only in React Native and wrote one small Kotlin module. What should the line become?', [
        ['React Native and TypeScript in depth, plus "Kotlin basics (one native module)", grouped', true],
        ['The same list with Flutter and Swift marked "familiar", so a filter still matches those words', false],
        ['A longer list with GraphQL and Detox added, because the longest skills line wins the filter', false],
        ['Only "Mobile development", since a single broad phrase matches the most job descriptions', false],
      ], 'Every word on the line becomes a question, so only what he can defend should stay, with honest depth labels. "Familiar" is still a claim he cannot back, adding more makes it worse, and one vague phrase fails keyword filters and says nothing.'),
      ck(PE, 'Which README item best backs Meghna\'s claim "cold start 1.8 s on a mid-range phone"?', [
        ['A table of three release-build runs with the phone model and what she deferred to get there', true],
        ['A sentence explaining that the app was carefully optimised for fast startup on Android phones', false],
        ['A screenshot of the splash screen taken on her own flagship phone just before the demo day', false],
        ['A link to the React Native performance documentation page about improving startup time', false],
      ], 'A startup claim needs the measurements, the conditions and the change behind them. A sentence, a splash screenshot on a flagship, or a general documentation page shows nothing about this app on that phone.'),
      ck(PE, 'Which file must NOT be in Arvind\'s public GharFix repository?', [
        ['The Play service-account JSON that eas submit uses to upload builds', true],
        ['eas.json, with the development, preview and production profiles', false],
        ['The zod schemas that describe the GharFix API contract for the app', false],
        ['The Maestro flow that signs in and books a slot from start to end', false],
      ], 'A service-account key lets anyone upload builds to his Play Console app; it must stay out of git and be rotated if it was ever pushed. eas.json without secrets, the schemas and the E2E flow are exactly what a reviewer wants to read.'),
    ],
  },

  /* ── CAREER_PATH ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_PLACE_CANDIDATE_CAREER_PATH',
    notes: `"Mobile developer" covers several different jobs in India, and the title on a posting often hides which one it is.
This unit maps the roles you can apply for with this track, the four kinds of employer and what each one's rounds look
like, how to choose a first role, and what to learn next. **Pay, openings and which companies use which stack change
all the time** — read current postings, ask people working there, and do not trust a figure from a forum or a coaching
advertisement. No salary numbers appear here for that reason.

## The four mobile stacks you will see on postings

| Role | What the job is | What you have from this track | The gap |
|---|---|---|---|
| React Native developer | One TypeScript codebase for Android and iOS; screens, state, API, release; often some native bridging | Everything: this is the track's main stack | Depth comes from the job |
| Native Android developer | Kotlin, Jetpack Compose, ViewModel, coroutines and Flow, Gradle, Play release | Kotlin basics, Compose next to React, the Android project and lifecycle (Native Android for React Native Developers) | Deeper Kotlin, Android architecture components, Room, Hilt |
| Native iOS developer | Swift, SwiftUI, Xcode, the Apple toolchain and App Store release | The App Store in outline; the mobile concepts carry over | Swift and SwiftUI from scratch, and a Mac — iOS builds and Xcode need one |
| Flutter developer | Dart and Flutter widgets for Android and iOS (and sometimes web) | Declarative UI, state, offline, release: the ideas transfer | Dart and Flutter's widget, state and tooling model |

React Native and native Android are the two you can apply for now. Native iOS needs a Mac and Swift; Flutter needs Dart.
Both are learnable in weeks by someone who finished this track — but only learn them when your target postings ask.

Titles mislead: a "Mobile Developer" at one company writes Kotlin all day; a "Frontend Engineer" at another owns the
React Native app and the website. **Read the responsibilities and the stack, not the title.** Many React Native teams
also expect React on the web, which you already have.

## The four kinds of employer

| Employer | What you get | What it costs you |
|---|---|---|
| Product company (consumer apps: food, grocery, payments, travel, ed-tech) | An app used by many people, code review, real performance and release discipline | Few fresher openings; a coding bar close to backend roles |
| Funded startup | Breadth: you may own whole features from screen to store release in month two | Less mentoring; priorities change fast; check how stable the company is |
| Global capability centre (banks, retailers, airlines, insurers with India offices) | Mature process, testing and security culture, structured training | Narrower scope at first; changes move slowly; hours sometimes aligned to another time zone |
| IT services firm or app agency | Training, many client domains, a chance to try mobile, web or backend | You may be placed on a non-mobile project; bonds and service agreements are common |

## What each one's rounds look like

| Employer | Typical loop for a fresher |
|---|---|
| Product company | An online test (DSA, sometimes JavaScript), a coding round, a mobile round (React Native concepts or build-a-screen), sometimes a take-home, a hiring manager round, HR |
| Startup | Often a take-home app (The Mobile Take-Home Assignment), a review call on it, a founder or lead conversation; fewer DSA rounds |
| GCC | Online test (aptitude, coding, MCQs), a technical round on the stack and testing, a managerial round, HR |
| Services firm | Mass hiring: aptitude, a coding question, a general technical interview (OOP, DBMS, one language), HR; the mobile depth matters later, in project allocation |

The Mobile Interview Loop — Mock (the next unit) runs the product-company shape, which contains all the others.
Mobile Developer Interview Questions is the bank for the concepts round; Mobile Scenario Rounds is the practice for the
build-a-screen, debugging, take-home and live coding rounds.

## Choosing a first role

Ask the same questions in every interview, and compare the answers, not the brand:

- What will I build in the first six months, and is it in production?
- Is it React Native, native, or a mix? Who handles the native side when it breaks?
- Does a senior review my pull requests? Is there CI with tests?
- How does a release happen — who builds, who submits, is there a staged rollout and crash monitoring?
- For services firms: how is project allocation decided, and what happens if no mobile project is free?
- Any bond, service agreement or relocation condition.

A year on an app with real users, code review and release discipline teaches more than three years of tickets on an
internal tool nobody opens.

## What to learn next — pick by your target, not by fashion

| If you want | Next 2–3 months | Proof to add |
|---|---|---|
| Stronger React Native roles | Reanimated and gestures in depth, profiling on a low-end phone, a second native module, React Native's new architecture internals | A performance write-up with before and after numbers |
| Android roles | Kotlin in depth, Compose with ViewModel and Flow, Room, Hilt, one small Compose app on the internal track | A native app repository with tests |
| iOS roles (with a Mac) | Swift, SwiftUI, Xcode, TestFlight | A small SwiftUI app on TestFlight |
| Flutter roles (only if postings ask) | Dart, widgets and layout, Riverpod or Bloc, the same app rebuilt | One rebuilt screen set, honestly labelled as new |
| Full-stack mobile | A small backend in the language you know, with auth and pagination | GharFix with your own API instead of the mock |

One direction at a time, **applying while you learn**. Count what your own twenty target postings name before you
choose, the same way you chose your skills line.`,
    workedExample: `**Two candidates, the same question: "Should I learn Flutter now?"** Both finished the track and the GharFix capstone.

**Lavanya** wants a mobile role in Hyderabad or Bengaluru. She saves twenty current postings for freshers and juniors and
counts: React Native in eleven, native Android (Kotlin) in six, Flutter in four (three of them small agencies), Swift in
two, and TypeScript in nine of the eleven React Native ones. Several React Native postings also mention React on the
web.

A weak plan: "Learn Flutter, then Swift, then Kotlin properly, then apply." That is months before one application,
for a stack named in four of twenty postings, and Swift without a Mac she does not own.

A strong plan, written out:

    Goal:          React Native developer at a product company or startup, applying from this week
    Evidence now:  GharFix (installable, README, demo video), resume rewritten
    Next:          deeper performance work (profiling on a budget phone, Reanimated) — the gap the
                   React Native postings test most
    Also:          one small Compose screen, since 6 of 20 name Kotlin; keep "Kotlin basics" honest
    Not now:       Flutter (4 of 20, mostly agencies), Swift (2 of 20, needs a Mac)
    Apply:         now, in parallel; revisit after 30 applications and 5 interviews

**Imran** is from Kochi and wants to stay in Kerala for family reasons. His fifteen local postings name Flutter in seven
and React Native in four; several are agencies building apps for clients. For him, Flutter is the right next stack. He
rebuilds three GharFix screens in Flutter from the official documentation over three weeks, labels the repo as a
learning rebuild, and keeps applying to the React Native postings at the same time.

**What the two plans share.** Each starts from real postings, counts what employers name, applies while learning, and
can say in one sentence why this stack next. That sentence is the answer to "Why React Native and not Flutter?"`,
    mcqs: [
      mcq('Pallavi finished the track and owns only a Windows laptop. A posting asks for a native iOS developer with SwiftUI. What is the realistic position?', [
        ['That role needs Swift and a Mac, so React Native and Android postings fit her better now', true],
        ['She can apply as is, since React Native experience counts as native iOS experience', false],
        ['She should learn SwiftUI on Windows first, since Xcode now runs there through EAS', false],
        ['She should claim iOS on her resume, since EAS can build her app for iPhones anyway', false],
      ], 'Native iOS work means Swift and Xcode, which run only on macOS; EAS can build a React Native app for iOS in the cloud, but that is not native iOS development and does not put Xcode on Windows. Claiming iOS skill she does not have fails the first follow-up.'),
      mcq('Which question to a services-firm recruiter best tells Mohit whether he will actually do mobile work after joining?', [
        ['How project allocation is decided, and what happens if no mobile project is free', true],
        ['How many mobile apps the firm has built for its clients over the last ten years', false],
        ['Whether the firm is a certified partner of Google and Apple for mobile development', false],
        ['Whether the office cafeteria and transport facilities are open to trainees as well', false],
      ], 'In services firms freshers are often allocated to whatever project needs people, so the allocation process is what decides his work. The firm\'s history or partner badges describe the company, not his first year, and facilities say nothing about the job.'),
      mcq('Swati counted her 20 target postings: React Native 12, Kotlin 5, Flutter 3. Which next-step plan fits the count?', [
        ['Deepen React Native performance work and try one Compose screen, applying meanwhile', true],
        ['Learn Flutter first, because a stack named less often means less competition for it', false],
        ['Stop applying until she has learnt all three stacks to the same professional depth', false],
        ['Drop React Native and switch to Kotlin, since native roles always rank above it', false],
      ], 'Her own count says React Native first and some Kotlin; applying while learning loses no time. Learning the least-named stack first, waiting to master everything, or a blanket "native ranks higher" rule ignores what her targets actually ask for.'),
    ],
    checkpoint: [
      ck(PR, 'Two offers: a GCC where Ritika would maintain a bank\'s React Native app with code review and CI, and a services firm where she "may" join a mobile project after training. She wants to grow as a React Native developer. What should decide it?', [
        ['Which role puts her on a reviewed React Native codebase that ships in her first year', true],
        ['Always the services firm, because training periods teach more than any real project', false],
        ['Always the GCC, because GCCs are better employers than services firms in every case', false],
        ['Whichever brand is better known, because the name matters most for the next switch', false],
      ], 'Her goal is React Native growth, so the deciding fact is whether the work is that, with review and real releases. Either "always" rule ignores the specifics of these offers, and brand says nothing about what the first year teaches.'),
      ck(PR, 'In an interview Abhishek is asked, "Why React Native and not Flutter?" Which answer is strongest?', [
        ['His target postings name it most, his React skills carry over, and he can show a built app', true],
        ['Flutter is a dying framework, and no serious Indian company would ever choose it for a new app', false],
        ['React Native was the stack his college placement trainer happened to teach in the final year', false],
        ['His seniors said React Native interviews are easier to clear than Flutter or native ones', false],
      ], 'A strong answer gives reasons tied to his goals and evidence. Dismissing Flutter is wrong and shows poor judgement, and pointing to a trainer or seniors shows no reasoning of his own.'),
      ck(PR, 'A posting titled "Frontend Engineer" lists "own our React Native app and the React web dashboard". Bhargav skipped it because the title said frontend. What should he have done?', [
        ['Read the responsibilities and stack, which match his skills, and apply', true],
        ['Skip it, because a frontend title means the mobile work will be minimal', false],
        ['Apply only after learning a separate web framework that is not React', false],
        ['Ask the recruiter to change the title to mobile before he would apply', false],
      ], 'Titles vary between companies; the responsibilities name React Native and React, which he has. Judging by the title alone loses a matching role, and learning another framework or asking for a title change is beside the point.'),
    ],
  },

  /* ── MOCK_LOOP ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_PLACE_CANDIDATE_MOCK_LOOP',
    notes: `One complete interview day for an **entry React Native or mobile developer** role in India, in the shape most product
companies and funded startups use; GCCs merge some rounds, and services mass hiring usually has only rounds 0, 3 (in
general form) and 5. Run it with a friend or mentor as the interviewer, in one day, with real timers and your phone on
the table. The question banks are the other placement topics: Mobile Developer Interview Questions for round 3 (its
Mock unit is a ready interviewer's script), and Mobile Scenario Rounds for the build-a-screen, debugging and live coding
practice. Your evidence in every round is your capstone.

## Round 0 — Online assessment (75–90 min, proctored)

| Section | Time | What it is |
|---|---|---|
| Aptitude | 20 min | quant, logical, reading comprehension |
| JavaScript and TypeScript MCQs | 15 min | output prediction, types, async |
| Coding | 40 min | one or two problems with hidden tests, in JavaScript or TypeScript |

**Output-prediction sample** (run under Node 23; the output is real):

    const prices = [1299, 99, 499, 25];
    console.log(prices.sort());
    const cart = { items: ['dosa'] };
    const copy = { ...cart };
    copy.items.push('vada');
    console.log(cart.items.length);
    console.log([1, 2, 3].map(parseInt));

    [ 1299, 25, 499, 99 ]
    2
    [ 1, NaN, NaN ]

The traps: **sort() with no comparator compares strings**, so prices need (a, b) => a - b — a real bug in a price
filter; **spread copies one level**, so both carts share the items array — the reason a reducer must copy nested arrays;
**map passes (value, index)**, so parseInt receives a radix of 1 and 2. Explain each in one line; "I would test it"
scores nothing on a timed MCQ.

## Round 1 — Coding in TypeScript (45 min)

"Our orders screen uses offset pagination. While the user scrolls, new orders arrive, so page 2 repeats the end of
page 1, and an order's status can change between the two fetches. Write mergePages(pages): each order once, at the
position it first appeared, with its most recently fetched version." Then: "Write the tests."

    type Order = { id: string; status: 'PLACED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED'; totalPaise: number };

    function mergePages(pages: readonly (readonly Order[])[]): Order[] {
      const latest = new Map<string, Order>();     // a Map keeps first-insertion order
      for (const page of pages) {
        for (const order of page) {
          latest.set(order.id, order);             // a later fetch replaces the value, not the position
        }
      }
      return [...latest.values()];
    }

With page 1 = [105, 104 PREPARING, 103] and page 2 = [104 DELIVERED, 103, 102, 101], the three versions candidates
write printed (the naiveSet line is wrapped here):

    mergePages      5 rows: ord-105:PLACED ord-104:DELIVERED ord-103:PLACED ord-102:PLACED ord-101:PLACED
    naiveSet        7 rows: ord-105:PLACED ord-104:PREPARING ord-103:PLACED ord-104:DELIVERED ord-103:PLACED
                            ord-102:PLACED ord-101:PLACED
    naiveFirstWins  5 rows: ord-105:PLACED ord-104:PREPARING ord-103:PLACED ord-102:PLACED ord-101:PLACED

**naiveSet** is [...new Set(pages.flat())]: a Set compares objects by reference, so two fetches of the same order are
two objects and nothing is removed — on a phone, a FlatList warns about duplicate keys and shows the order twice.
**naiveFirstWins** filters with findIndex: it removes duplicates but keeps the stale PREPARING status, and its nested
search is quadratic on a long history. The five tests — no pages and empty pages, order of first appearance, the newest
version wins, a duplicate inside one page, the input not mutated — passed with strict tsc clean. Then say what it is
for: the select step of an infinite query, and why cursor pagination on the server removes the overlap in the first
place (Server Data with TanStack Query).

**Scored on:** a correct structure chosen for a reason, edge cases named before coding, tests written, the mobile
consequence said aloud.

## Round 2 — Build a screen (60 min)

"Here is a design: a restaurant's menu with categories, veg and non-veg filters, and an add button with a quantity
stepper. The API is GET /restaurants/:id/menu. Build it in Expo; you may use docs." Work as The "Build This Screen"
Round taught: the types and the zod schema first, the query hook, the four states (loading, error with retry, empty,
data), a SectionList with stable keys, the stepper's state in one place, then styling last. Talk while you type: "the
filter is derived from the list, not stored", "rows are memoised because the stepper re-renders on every tap".

**Scored on:** all four states present, list done right, state in the right place, accessibility labels on the
stepper, decisions explained; finishing every pixel is not scored.

## Round 3 — Mobile concepts (45 min)

Run the script in Mobile Developer Interview Questions — Mock. Expect your capstone to be the thread: "Your outbox — what
if the app is killed mid-flush?", "Why is the refresh token in SecureStore and the access token in memory?", "What did
the denied camera path look like?", "Your list was 40 fps — how did you find out why?" Have the phone ready to show.

**Scored on:** correct mechanisms, trade-offs named, answers tied to something you built, "I don't know" said
honestly where it applies.

## Round 4 — Hiring manager: the bad release (30 min)

"We shipped version 3.4 on Friday with a staged rollout. On Monday, one-star reviews say 'app stuck on white screen
after update', mostly from one phone brand. Crash-free sessions look normal. Walk me through it." A strong candidate
states the method: **stop the harm** (halt the staged rollout; if the cause is JavaScript and the runtime version
matches, an over-the-air fix or rollback is possible), **why crash-free looks fine** (a hang or a stuck splash is not a
crash — check ANRs and hangs in Sentry and Android vitals, filter by device and version), **find the cause** (what
changed in 3.4: a new native SDK initialised on start? a migration on a large local database? a splash screen never
hidden when a font fails on that phone?), **guard it** (a release-build startup check on a low-end phone in the
pipeline, a timeout around anything before the first screen). Reply to the reviews once fixed (Crashes, Analytics and
Ratings in Production).

Then the people questions: "A designer insists on an animation that drops frames on budget phones." → measure it on one,
show the numbers, offer a lighter variant for low-end devices; the product owner decides. "You pushed an OTA update to
the production channel instead of preview." → roll it back at once, tell the team, write a blameless note and a guard
(a CI-only production publish) — never hide it.

**Scored on:** a hypothesis before each step, evidence over opinion, users protected first, a guard as well as a fix,
ownership.

## Round 5 — HR (15 min)

"Will you work on web or backend if the project needs it?", "Relocation and the service agreement?", "Expected CTC?"
— honest and consistent with your resume. Ask your own questions: the first six months, React Native or native, code
review, how releases happen, who is on call when the app breaks.

## Scoring sheet (1–4 per row)

| Row | 1 | 4 |
|---|---|---|
| Coding | Wrong structure, no tests | Correct, edge cases named and tested, mobile consequence said |
| Building UI | One happy-path state, inline everything | Four states, a well-built list, state placed for a reason |
| Mobile concepts | Library names, no mechanisms | Mechanisms and trade-offs, tied to the capstone |
| Evidence | "The app is fast and stable" | Release-build numbers with phone model, crash data with its denominator |
| Judgement under pressure | Jumps to a fix, blames others | Protects users, tests a hypothesis, adds a guard |
| Integrity | Bluffs, hides mistakes | "I don't know — here is how I'd find out"; owns errors |

A pass is 3 or more on every row. A 1 anywhere is the first thing to fix, whatever the total.

## Debrief template (fill within an hour)

    Round / interviewer role:
    Questions asked, verbatim:
    Answered well — why:
    Weak or blank — the question + what a strong answer contains:
    Facts I could not recall (API names, platform behaviour, JS semantics):
    Fix before the next loop (max 3, each with a date and how I will prove it):

Run the loop again two weeks later with a different interviewer and compare the sheets row by row.`,
    mcqs: [
      mcq('In round 0, why does [1299, 99, 499, 25].sort() print [1299, 25, 499, 99]?', [
        ['With no comparator, sort converts the numbers to strings and compares them as text', true],
        ['sort orders numbers by their digit count first and only then by their actual value', false],
        ['JavaScript sorts arrays in descending order unless sort is passed the true flag', false],
        ['The array is sorted correctly, but console.log prints arrays in reverse insertion order', false],
      ], 'Default sort compares string forms, and "1299" comes before "25" because "1" sorts before "2"; numbers need a comparator such as (a, b) => a - b. There is no digit-count rule, no descending default or flag, and console.log prints elements in order.'),
      mcq('In round 1, why does [...new Set(pages.flat())] leave order ord-104 in the list twice?', [
        ['A Set compares objects by reference, and each fetch made a new object for ord-104', true],
        ['A Set keeps duplicates whenever the values inside it are typed as TypeScript objects', false],
        ['flat() copies only the first page, so the second page\'s orders are appended unchanged', false],
        ['Spreading a Set into an array always duplicates its last element as a known JS quirk', false],
      ], 'The two ord-104 records are separate objects from separate responses, so the Set sees two different values; dedupe by id with a Map. Types do not affect Set at runtime, flat() flattens every page, and spreading a Set does not duplicate anything.'),
      mcq('The findIndex version removes duplicates in round 1. Why is it still wrong for the orders screen?', [
        ['It keeps the first fetched copy, so order 104 shows PREPARING after it was DELIVERED', true],
        ['It removes the newest order on the screen, because findIndex begins its search at the end', false],
        ['It changes the order of rows so the list is no longer sorted by time of first appearance', false],
        ['It throws a TypeError on any page that is empty, so a scroll to the end crashes the app', false],
      ], 'The filter keeps whichever copy appears first, which is the stale one from page 1; the spec asks for the most recent version. findIndex searches from the start, the order of first appearance is kept, and empty pages are handled fine — staleness is the bug.'),
      mcq('Round 4: one-star reviews say "stuck on white screen after update" but crash-free sessions look normal. What explains the gap?', [
        ['A hang or a splash screen that never hides is not a crash, so check hangs and ANRs by device', true],
        ['Crash-free figures update only once a week, so the new crashes will show up next Monday', false],
        ['Users who leave one-star reviews usually exaggerate, so the reviews can be set aside here', false],
        ['Crash reporting never works on new releases until the source maps have been regenerated', false],
      ], 'A stuck start-up freezes rather than crashes, so crash-free stays normal while users are stuck; ANR and hang reports filtered by device and version show it. Crash data arrives continuously, the reviews are evidence, and missing source maps make stacks unreadable but do not hide crashes.'),
      mcq('After the mock day, Nikhil\'s debrief says "Build-a-screen went badly". Which rewrite is most useful?', [
        ['"Only built the data state; drill four states plus SectionList twice before 15 Nov, timed"', true],
        ['"The build-a-screen round went badly, so I will revise all of React Native over next month"', false],
        ['"The design given in the round was far harder than anything a fresher would build at work"', false],
        ['"I was nervous in the build-a-screen round, so next time I must try to stay much calmer"', false],
      ], 'A useful debrief names the exact gap and a dated, provable fix. Revising everything, blaming the task or noting nerves gives nothing specific to practise before the next loop.'),
    ],
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_PLACE_CANDIDATE_CHECKPOINT',
    notes: `This checkpoint measures the judgement a mobile hiring panel looks for: a resume whose every claim can be checked on a
phone, a portfolio app that installs and leaks nothing, a career choice made from real postings, and method and honesty
across the interview day.

Recall the rules of this topic:
- **Every number has its conditions** — release build, phone model, denominator, source.
- **Nothing published that should not be** — keys, service accounts, employer code, real people's data.
- **Method before answers**, users protected first, and mistakes owned out loud.

Each question is a scenario. Pick what a strong candidate would actually do.`,
    checkpoint: [
      ck(PR, 'Gayatri\'s capstone is on the Play internal testing track with 8 testers. Her draft bullet says "Published app with 4.7 rating and 1,000+ users". What should it say?', [
        ['"On the Play internal testing track with 8 testers", plus what they tested', true],
        ['Keep it, since internal testing counts as publishing and ratings are expected', false],
        ['"1,000+ downloads expected", since the app will be public within a few months', false],
        ['Drop the release line, since an app not yet in production is not worth a mention', false],
      ], 'A testing track has no public rating, and eight testers are not a thousand users, so the true status with its numbers is the honest claim — and still strong for a fresher. Keeping the claim or forecasting downloads fails the first check, and dropping it throws away real release evidence.'),
      ck(PR, 'Sameer is told in an HR round, "Our project for you may be React web for six months." He wants mobile but is willing. What is the best answer?', [
        ['Yes, honestly, noting React carries over, and ask when mobile work is likely', true],
        ['Say he prefers web anyway, because any hesitation now will cost him the offer', false],
        ['Say he will only accept mobile work and hope they make an exception after joining', false],
        ['Avoid the question and talk about his capstone app so that the topic quietly drops', false],
      ], 'An honest yes that links the work to his skills, plus a question about the path to mobile, builds trust and tells him what the job is. Overstating, refusing and hoping, or dodging all create problems after joining.'),
      ck(PR, 'Tanvi wants a native Android role. Which next-two-months plan best fits that goal?', [
        ['Kotlin in depth, Compose with ViewModel and Flow, Room, and a small app on the internal track', true],
        ['Flutter and Dart first, since cross-platform skill always counts as Android experience too', false],
        ['Swift and SwiftUI first, since learning both native platforms at once is expected of freshers', false],
        ['More React Native libraries, since Android teams mainly hire for third-party library knowledge', false],
      ], 'The gap between this track and Android roles is deeper Kotlin and Android\'s own architecture, proved by a native app. Flutter is a different stack, iOS is not her target, and Android teams test Kotlin and platform knowledge, not React Native libraries.'),
      ck(PE, 'Which README section helps a busy reviewer most in the first minute on Harsha\'s GharFix repository?', [
        ['The demo video, install link and three screenshots at the very top', true],
        ['A full history of every library he tried and later removed from it', false],
        ['The Expo create-app log and the full output of npm install at setup', false],
        ['A long section on why mobile apps matter in India\'s digital economy', false],
      ], 'A reviewer decides quickly; a video, a way to install and a glance at the screens show the app before anything else. Library history, install logs and general essays bury it.'),
      ck(PE, 'Prakash did his best mobile work in an internship on a fintech startup\'s app. A recruiter asks to see that code. What should he share?', [
        ['The same patterns rebuilt in his own capstone repo, and the internship in general terms', true],
        ['The internship repository with the company name changed, since the code itself is generic', false],
        ['Screenshots of the fintech app with customers\' names and UPI ids blurred out beforehand', false],
        ['The full source by email only, since a private email does not count as publishing it', false],
      ], 'Internship code and screens belong to the employer, and renaming, blurring or emailing still leaks them. Showing the same skill in his own project is honest, and describing the work in general terms is allowed.'),
      ck(PE, 'Kavya committed her app\'s upload keystore to a public repo last month, then deleted it in a later commit. What should she do?', [
        ['Treat it as leaked: ask Play for an upload key reset, then purge it from history', true],
        ['Nothing more, since the later commit removed the file from the repository already', false],
        ['Make the repository private for a week, since the key will expire automatically', false],
        ['Rename the keystore file in the next build so that the leaked copy no longer matches', false],
      ], 'A deleted file stays in git history, and anyone may have copied it; with Play App Signing the upload key can be reset, and history should be cleaned too. Privacy now does not unleak it, keystores do not expire on their own, and renaming the file changes nothing about the key.'),
      ck(IP, 'In round 3 Aman is asked how Hermes compiles JavaScript ahead of time, and he is unsure of the detail. What should he do?', [
        ['State what he knows, name the gap, and say how he would check it', true],
        ['Give a confident, detailed answer anyway, since a pause in a round looks under-prepared', false],
        ['Say engine internals never matter to app developers, so the question is not a fair one', false],
        ['Steer the answer to his offline outbox, where he feels far more confident and prepared', false],
      ], 'Panels score honesty at the edge of knowledge; a confident wrong answer is worse than a named gap, and a plan to check it shows how he works. Dismissing the question or dodging leaves the gap where the panel can see it.'),
      ck(IP, 'In round 4 the manager adds: "The stuck screen happens only on phones where the new analytics SDK starts before the first screen." How should Deepa change her answer?', [
        ['Treat the SDK start as the likely cause: defer or time-box it, then re-check on that phone', true],
        ['Keep to her first theory about the database migration, since changing course looks weak', false],
        ['Blame the analytics vendor and propose removing all third-party SDKs from the app for good', false],
        ['Ask who approved adding the SDK, so that person can be held responsible for the outage', false],
      ], 'New evidence should move the hypothesis; the guard is to keep heavy work off the start-up path and verify on the affected device. Sticking to a disproved theory, blaming the vendor wholesale or hunting for someone to blame all fail the method.'),
      ck(IP, 'In round 2 Sunil has 15 minutes left and only the data state of the menu screen works. What is the best use of the time?', [
        ['Add loading, error with retry and empty states, saying aloud what he would do next', true],
        ['Polish colours and spacing to match the design exactly, since visuals score most', false],
        ['Start again with a different list component that he thinks might be a bit faster', false],
        ['Stop coding and spend the time explaining why the design is too large to finish', false],
      ], 'The round scores a complete, honest screen and explained decisions; the missing states are what users meet first on patchy networks. Pixel polish is not scored, restarting wastes the time, and complaining about scope shows nothing.'),
      ck(IP, 'A panellist asks Neha: "Your list went from 40 to 60 fps — how do you know?" Which answer is strongest?', [
        ['Release build, same phone, the performance monitor while scrolling, before and after', true],
        ['It felt much smoother in the debug build once she had added React.memo to every row', false],
        ['The React Native docs say memoised rows always run at sixty frames per second', false],
        ['Her friends tried the app on their phones and all agreed that it was faster now', false],
      ], 'A performance claim stands on a measurement repeated under the same conditions, in a release build. A debug-build feeling, a general doc claim or friends\' opinions are not evidence, and memo is not a guarantee of 60 fps.'),
    ],
  },
];
