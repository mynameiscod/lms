import { TopicSeed } from './year1MegaCurriculum';
import { u } from './year4UnitKit';
import { ending } from './trackUnitsWeb';
import { interview } from './trackUnitsPlacement';

/**
 * Career-track content for Mobile App Development — React Native with TypeScript as the main stack,
 * with enough native Android (Kotlin, Jetpack Compose) to read, debug and bridge native code. The
 * track stands on JavaScript, React and Git (packs JAVASCRIPT, REACT, GIT_TOOLS) and the years'
 * platform-neutral mobile lessons — app structure, layout, lifecycle, storage, offline and sync,
 * talking to a backend, quality (pack MB_YEAR_BASICS); these topics add what a mobile developer does
 * at work: build, test and ship a real app to the Play Store, on the stack many Indian product
 * companies and startups hire for.
 *
 * Expo is the default toolchain (managed workflow, dev builds, EAS Build and Update); the bare
 * React Native CLI is taught where it matters. Skills: TYPESCRIPT, REACT_NATIVE, ANDROID_DEVELOPMENT
 * and MOBILE_RELEASE (careerSkillTaxonomy.ts), with MOBILE_APP_BASICS and STATE_MANAGEMENT.
 */

/** Batch MB1: foundations — TypeScript, React Native and Expo, navigation. */
export const TRACK_MB_FOUNDATIONS: Record<string, TopicSeed> = {
  /* ── TypeScript for React Native ── */
  MB_TYPESCRIPT: { category: 'UNIVERSAL', units: [
    u('WHY_TS', 'TypeScript: Types for JavaScript You Already Write', 'What the compiler checks and what it cannot, type inference, primitives, arrays, objects and tsconfig with strict mode.',
      ['Add types to JavaScript and read what the TypeScript compiler is telling you'], 35),
    u('TYPES_INTERFACES', 'Interfaces, Type Aliases, Unions and Narrowing', 'Describing API data, optional and readonly fields, union types, narrowing with typeof, in and discriminated unions.',
      ['Model app data with interfaces and unions and narrow them safely'], 40, { after: ['WHY_TS'] }),
    u('GENERICS', 'Generics and Utility Types', 'Generic functions and types, constraints, and Partial, Pick, Omit, Record and ReturnType in everyday code.',
      ['Write reusable typed functions and derive types instead of copying them'], 40, { after: ['TYPES_INTERFACES'] }),
    u('TS_REACT', 'Typing React Components, Props, Hooks and Events', 'Props and children, typed useState and useReducer, event types, typing a custom hook, and common errors.',
      ['Type React components and hooks so mistakes show up in the editor'], 40, { after: ['GENERICS'] }),
    u('TS_API_DATA', 'Typing API Data and Runtime Validation', 'Why a type is not a check, validating responses with zod, inferring types from schemas, and unknown over any.',
      ['Validate data from the network and keep its types honest'], 35, { after: ['TS_REACT'] }),
    ...ending('TypeScript for React Native', 'TS_API_DATA', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── React Native and Expo ── */
  MB_RN_BASICS: { category: 'UNIVERSAL', units: [
    u('HOW_RN_WORKS', 'How React Native Works', 'Native views from React components, the JavaScript and UI threads, the new architecture (Fabric, TurboModules, JSI), Hermes, and React Native versus Flutter and native.',
      ['Explain how a React Native app turns components into native views'], 35),
    u('EXPO_SETUP', 'Expo: Creating, Running and Debugging an App', 'create-expo-app, Expo Go versus development builds, running on an emulator and a phone, Fast Refresh, and the debugger and logs.',
      ['Create an Expo app and run and debug it on an emulator and a real phone'], 40, { after: ['HOW_RN_WORKS'] }),
    u('CORE_COMPONENTS', 'Core Components: View, Text, Image, Pressable and TextInput', 'The building blocks, touch feedback, keyboard handling, SafeAreaView, and what has no web equivalent.',
      ['Build a screen from React Native core components'], 40, { after: ['EXPO_SETUP'] }),
    u('STYLING_LAYOUT', 'Styling and Flexbox Layout on a Phone', 'StyleSheet, Flexbox with column as the default, dimensions and density, responsive layouts, dark mode and fonts.',
      ['Lay out screens that work on small and large phones, in light and dark mode'], 40, { after: ['CORE_COMPONENTS'] }),
    u('LISTS', 'Lists: FlatList, SectionList and Performance', 'Why ScrollView is not a list, keys, renderItem, pull to refresh, infinite scroll, and keeping long lists smooth.',
      ['Show long, scrolling lists that stay smooth'], 40, { after: ['STYLING_LAYOUT'] }),
    u('PLATFORM_DIFFS', 'Android and iOS Differences', 'Platform.OS and platform files, the back button, permissions and status bar, shadows and fonts, and testing on both.',
      ['Handle the differences between Android and iOS without forking the app'], 35, { after: ['LISTS'] }),
    ...ending('React Native and Expo', 'PLATFORM_DIFFS', { project: ['MINI_PROJECT', 'Mini Project — A Recipe Browser App',
      'Build a recipe browser in Expo and TypeScript: a home screen with a searchable FlatList of recipes from a local JSON file, a detail screen with an image and steps, light and dark mode, and a layout that works on a small Android phone and a large one.'] }),
  ] },

  /* ── Navigation ── */
  MB_NAVIGATION: { category: 'UNIVERSAL', units: [
    u('STACK_NAV', 'Stack Navigation and Passing Parameters', 'React Navigation and Expo Router, stacks, typed route params, headers, and going back.',
      ['Move between screens with a stack and pass typed parameters'], 40),
    u('TABS_DRAWERS', 'Tabs, Drawers and Nested Navigators', 'Bottom tabs, drawers, nesting a stack inside tabs, and keeping each tab\'s history.',
      ['Structure an app\'s navigation with tabs, drawers and nested stacks'], 35, { after: ['STACK_NAV'] }),
    u('AUTH_FLOW', 'Auth Flows and Protected Screens', 'Signed-in and signed-out stacks, a splash while restoring the session, redirects, and logging out cleanly.',
      ['Show the right screens for signed-in and signed-out users'], 40, { after: ['TABS_DRAWERS'] }),
    u('DEEP_LINKS', 'Deep Links and Universal Links', 'URL schemes, Android App Links and iOS Universal Links, mapping URLs to screens, and testing links.',
      ['Open a specific screen of the app from a link'], 35, { after: ['AUTH_FLOW'] }),
    ...ending('Navigation', 'DEEP_LINKS', { minutes: [40, 50, 35, 40] }),
  ] },
};

/** Batch MB2: building the app — state and data, storage and offline, device features, native Android. */
export const TRACK_MB_APP: Record<string, TopicSeed> = {
  /* ── State, server data and forms ── */
  MB_STATE_DATA: { category: 'UNIVERSAL', units: [
    u('STATE_CHOICES', 'Where State Lives in a Mobile App', 'Local, shared, server and navigation state; lifting state, Context and its re-render cost, and when a library pays.',
      ['Decide where each piece of an app\'s state belongs'], 35),
    u('ZUSTAND_REDUX', 'Global State with Zustand and Redux Toolkit', 'A Zustand store with selectors, Redux Toolkit slices, persisting state, and choosing between them.',
      ['Manage shared app state with Zustand or Redux Toolkit'], 40, { after: ['STATE_CHOICES'] }),
    u('SERVER_STATE', 'Server Data with TanStack Query', 'Queries and caching, loading and error states, mutations, optimistic updates, refetch on focus and reconnect, and pagination.',
      ['Fetch, cache and update server data with TanStack Query'], 40, { after: ['ZUSTAND_REDUX'] }),
    u('FORMS', 'Forms and Validation', 'react-hook-form with zod, keyboard-aware forms, field errors, submitting state, and accessible inputs.',
      ['Build validated forms that are pleasant to fill in on a phone'], 35, { after: ['SERVER_STATE'] }),
    u('ARCHITECTURE', 'Structuring a React Native Codebase', 'Feature folders, an API layer, custom hooks as the seam, environment config, and keeping screens thin.',
      ['Organise a growing React Native codebase a team can work in'], 35, { after: ['FORMS'] }),
    ...ending('State, Server Data and Forms', 'ARCHITECTURE', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── Storage and offline ── */
  MB_STORAGE_OFFLINE: { category: 'UNIVERSAL', units: [
    u('KEY_VALUE', 'Key-Value Storage: AsyncStorage and MMKV', 'What to keep on the device, serialising, migrations between app versions, and what never to store in plain storage.',
      ['Persist settings and small data on the device and migrate it safely'], 35),
    u('SQLITE', 'A Database on the Phone: SQLite', 'expo-sqlite, schema and migrations, queries from TypeScript, and when an on-device database is worth it.',
      ['Store and query structured data on the device with SQLite'], 40, { after: ['KEY_VALUE'] }),
    u('SECURE_STORAGE', 'Secrets on the Device: SecureStore and Keystore', 'Tokens in SecureStore (Android Keystore, iOS Keychain), what a rooted phone exposes, and biometrics in outline.',
      ['Keep tokens and secrets in the device\'s secure storage'], 35, { after: ['SQLITE'] }),
    u('OFFLINE_FIRST', 'Offline-First: Queues, Sync and Conflicts', 'Detecting connectivity, an outbox of pending changes, retry with backoff, and resolving conflicts when the phone comes back online.',
      ['Keep an app useful offline and sync it correctly when it reconnects'], 40, { after: ['SECURE_STORAGE'] }),
    ...ending('Storage and Offline', 'OFFLINE_FIRST', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── Device features ── */
  MB_DEVICE_APIS: { category: 'UNIVERSAL', units: [
    u('PERMISSIONS', 'Permissions Done Right', 'Asking at the moment of need, explaining why, handling "denied" and "never ask again", and Android versus iOS rules.',
      ['Request device permissions in a way users accept and handle every answer'], 35),
    u('CAMERA_MEDIA', 'Camera, Images and Files', 'expo-camera and image picker, compressing and uploading images, and the document picker.',
      ['Capture, pick and upload photos and files from the phone'], 40, { after: ['PERMISSIONS'] }),
    u('LOCATION_MAPS', 'Location and Maps', 'Foreground and background location, accuracy versus battery, geofencing in outline, and showing maps with markers.',
      ['Use the device\'s location and show it on a map without draining the battery'], 40, { after: ['CAMERA_MEDIA'] }),
    u('NOTIFICATIONS', 'Push and Local Notifications', 'Expo notifications and FCM, device tokens on the server, channels on Android, handling a tap, and notification etiquette.',
      ['Send and handle push and local notifications'], 40, { after: ['LOCATION_MAPS'] }),
    u('BACKGROUND_LIFECYCLE', 'App State, Background Work and the Lifecycle', 'AppState, what runs when the app is in the background, background fetch and tasks, and what the OS will kill.',
      ['Handle the app moving between foreground and background correctly'], 35, { after: ['NOTIFICATIONS'] }),
    ...ending('Device Features', 'BACKGROUND_LIFECYCLE', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── Native Android for React Native developers ── */
  MB_ANDROID_NATIVE: { category: 'UNIVERSAL', units: [
    u('KOTLIN_BASICS', 'Kotlin for React Native Developers', 'Kotlin next to TypeScript: val and var, null safety, data classes, lambdas, collections and coroutines in outline.',
      ['Read and write basic Kotlin by comparing it with TypeScript'], 40),
    u('ANDROID_PROJECT', 'Inside an Android Project', 'The android folder: Gradle, the manifest, activities and their lifecycle, resources, and why a build fails.',
      ['Find your way around an Android project and fix common build errors'], 40, { after: ['KOTLIN_BASICS'] }),
    u('COMPOSE', 'Jetpack Compose Basics', 'Composables, state and recomposition, layouts and lists, and how Compose compares with React.',
      ['Build a simple native Android screen with Jetpack Compose'], 40, { after: ['ANDROID_PROJECT'] }),
    u('NATIVE_MODULES', 'Native Modules: Calling Kotlin from React Native', 'When you need native code, Expo Modules API, a Kotlin function called from TypeScript, and config plugins.',
      ['Expose a small piece of native Android code to a React Native app'], 40, { after: ['COMPOSE'] }),
    ...ending('Native Android for React Native Developers', 'NATIVE_MODULES', { minutes: [40, 50, 35, 40] }),
  ] },
};

/** Batch MB3: shipping — auth and APIs, testing and performance, release, and the capstone. */
export const TRACK_MB_SHIP: Record<string, TopicSeed> = {
  /* ── Auth, APIs and mobile security ── */
  MB_AUTH_API: { category: 'UNIVERSAL', units: [
    u('API_LAYER', 'An API Layer for a Mobile App', 'A typed client, base URLs per environment, timeouts, retries, cancellation, and showing the network\'s real states.',
      ['Build an API layer that copes with slow and failing mobile networks'], 40),
    u('AUTH_TOKENS', 'Login, Tokens and Refresh', 'JWT access and refresh tokens, refreshing once when many requests fail together, logout everywhere, and OTP login.',
      ['Implement login with tokens that refresh safely'], 40, { after: ['API_LAYER'] }),
    u('OAUTH', 'Sign in with Google and OAuth on Mobile', 'OAuth with PKCE, expo-auth-session, redirect URIs, and why a mobile app cannot keep a client secret.',
      ['Add social sign-in to a mobile app the secure way'], 35, { after: ['AUTH_TOKENS'] }),
    u('MOBILE_SECURITY', 'Mobile App Security Basics', 'OWASP MASVS in outline: secrets in the bundle, insecure storage, TLS and pinning, deep-link abuse, and checks on apps you own.',
      ['Avoid the common security mistakes in mobile apps'], 40, { after: ['OAUTH'] }),
    ...ending('Auth, APIs and Mobile Security', 'MOBILE_SECURITY', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── Testing, performance and animation ── */
  MB_TESTING_PERF: { category: 'UNIVERSAL', units: [
    u('UNIT_COMPONENT', 'Unit and Component Tests with Jest and Testing Library', 'Jest for logic, React Native Testing Library queries by role and text, mocking modules and the network.',
      ['Test React Native logic and components the way a user uses them'], 40),
    u('E2E', 'End-to-End Tests with Maestro and Detox', 'Flows in Maestro YAML, Detox in outline, test IDs, running on an emulator in CI, and what E2E is worth.',
      ['Write end-to-end tests for the main flows of an app'], 40, { after: ['UNIT_COMPONENT'] }),
    u('PERFORMANCE', 'Performance: Re-renders, Lists, Startup and Memory', 'The performance monitor, React DevTools profiler, memo and callbacks used with reason, list tuning, startup time and images.',
      ['Find and fix the causes of a slow or janky React Native app'], 40, { after: ['E2E'] }),
    u('ANIMATION', 'Animations and Gestures', 'Animated versus Reanimated, the UI thread, gesture handler, layout animations, and when not to animate.',
      ['Add smooth animations and gestures that run on the UI thread'], 40, { after: ['PERFORMANCE'] }),
    u('ACCESSIBILITY', 'Accessible Mobile Apps', 'accessibilityLabel and role, TalkBack and VoiceOver, touch target size, font scaling and contrast.',
      ['Make an app usable with a screen reader and large text'], 35, { after: ['ANIMATION'] }),
    ...ending('Testing, Performance and Animation', 'ACCESSIBILITY', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── Building, releasing and running the app ── */
  MB_RELEASE: { category: 'UNIVERSAL', units: [
    u('BUILDS_SIGNING', 'Builds, Signing and Environments', 'Debug and release builds, app IDs and versions, the upload key and Play App Signing, EAS Build profiles and secrets.',
      ['Produce signed release builds for each environment'], 40),
    u('PLAY_STORE', 'Publishing to the Google Play Store', 'The AAB, internal, closed and production tracks, the store listing, data-safety form, staged rollouts and review.',
      ['Publish an Android app to Google Play through its testing tracks'], 40, { after: ['BUILDS_SIGNING'] }),
    u('APP_STORE', 'The Apple App Store in Outline', 'Apple developer accounts, TestFlight, review guidelines that reject apps, and building iOS without a Mac through EAS.',
      ['Plan an iOS release and avoid the common App Store rejections'], 30, { after: ['PLAY_STORE'] }),
    u('OTA_CI', 'Over-the-Air Updates and Mobile CI/CD', 'EAS Update and runtime versions, what OTA may and may not change, and a pipeline that tests, builds and submits.',
      ['Ship fixes over the air and automate builds and releases'], 40, { after: ['APP_STORE'] }),
    u('MONITORING', 'Crashes, Analytics and Ratings in Production', 'Crash reporting with Sentry, source maps, analytics events that answer questions, ANRs, and reading store reviews.',
      ['Monitor a live app and act on its crashes, usage and reviews'], 35, { after: ['OTA_CI'] }),
    ...ending('Building, Releasing and Running the App', 'MONITORING', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── The mobile capstone ── */
  MB_CAPSTONE: { category: 'UNIVERSAL', units: [
    u('BRIEF', 'The Capstone: Scope, Architecture and Plan', 'A real app with a backend (a local-services booking app or a campus marketplace): scope, screens, data, the architecture and a milestone plan.',
      ['Scope and plan a mobile app with its architecture and milestones'], 45),
    u('BUILD_CORE', 'Capstone Build — Screens, Navigation, State and the API', 'Typed screens and navigation, auth with refresh, server data with caching, forms, and tests for the core flows.',
      ['Build the core of a production-style React Native app'], 300, { unitType: 'PROJECT', after: ['BRIEF'], skillKeys: ['REACT_NATIVE', 'TYPESCRIPT'] }),
    u('BUILD_SHIP', 'Capstone Build — Offline, Device Features and Release', 'Offline support, a device feature with permissions, notifications, performance checks, a signed build on a Play Store testing track and crash reporting.',
      ['Make the app work offline, use the device, and release it to testers'], 240, { unitType: 'PROJECT', after: ['BUILD_CORE'], skillKeys: ['MOBILE_RELEASE', 'MOBILE_APP_BASICS'] }),
    u('DEFENCE', 'Demo Day: Presenting and Defending Your App', 'A live demo on a phone, the architecture and trade-offs, a bug you fixed, and the questions a mobile hiring panel asks.',
      ['Demo the app and defend its design under questioning'], 45, { unitType: 'PRACTICE', after: ['BUILD_SHIP'] }),
    u('CHECKPOINT', 'Capstone — Checkpoint', 'Where you actually are across the whole track, measured rather than felt.',
      ['Show mobile engineering judgement at the standard a hiring panel expects'], 40, { unitType: 'CHECKPOINT', after: ['DEFENCE'] }),
  ] },
};

/**
 * Batch MB4: Year-4 placement for mobile developers. Aptitude, coding rounds, core CS, HR and mocks
 * are the shared placement packs; these add the mobile interview, scenario rounds and the candidate.
 */
export const TRACK_MB_PLACE: Record<string, TopicSeed> = {
  /* ── The mobile interview ── */
  MB_IV: { category: 'UNIVERSAL', units: interview('Mobile Developer Interview', [
    ['IV_JS_TS', 'JavaScript and TypeScript Questions', 'Closures, the event loop, promises, this, types versus interfaces, generics and narrowing.', ['TYPESCRIPT']],
    ['IV_REACT_NATIVE', 'React Native Questions', 'How React Native works, the new architecture, lists, navigation, hooks pitfalls and platform differences.', ['REACT_NATIVE']],
    ['IV_STATE_ARCH', 'State, Data and Architecture Questions', 'Where state lives, server state and caching, offline sync, auth and token refresh, and app structure.', ['STATE_MANAGEMENT']],
    ['IV_ANDROID', 'Android and Native Questions', 'The activity lifecycle, Kotlin basics, Compose, native modules, permissions and background limits.', ['ANDROID_DEVELOPMENT']],
    ['IV_PERF_RELEASE', 'Performance, Testing and Release Questions', 'Jank and re-renders, startup time, testing levels, signing, Play Store tracks, OTA updates and crash monitoring.', ['MOBILE_RELEASE']],
  ]) },

  /* ── Scenario rounds ── */
  MB_SCENARIO_ROUNDS: { category: 'UNIVERSAL', units: [
    u('BUILD_SCREEN_ROUND', 'The "Build This Screen" Round', 'Building a screen from a design in 45 minutes: layout, list, state and the API call, talking through choices.',
      ['Build a screen from a design under time while explaining your choices'], 45),
    u('DEBUG_ROUND', 'The Debugging Round', 'A broken app to fix under time: a list that re-renders, a stale closure, a crash on Android only, a request that never ends.',
      ['Find and fix bugs in an unfamiliar React Native app under time'], 40, { after: ['BUILD_SCREEN_ROUND'] }),
    u('APP_TAKEHOME', 'The Mobile Take-Home Assignment', 'A typical take-home: a small app against a public API, with tests, a README and a build a reviewer can run.',
      ['Deliver a mobile take-home that gets a call-back'], 45, { after: ['DEBUG_ROUND'] }),
    u('LIVE_CODING_ROUND', 'Live Coding in JavaScript and TypeScript', 'The coding problems mobile developers are asked (arrays, strings, maps, debounce, a simple cache) in TypeScript, with tests.',
      ['Solve a coding problem in TypeScript and test it aloud'], 45, { after: ['APP_TAKEHOME'] }),
    u('TIMED_SCENARIOS', 'Timed Scenario Set', 'Three mobile scenario questions under time, with model answers and how each is scored.',
      ['Answer timed mobile scenarios with structure and evidence'], 50, { unitType: 'PRACTICE', after: ['LIVE_CODING_ROUND'] }),
    u('CHECKPOINT', 'Mobile Scenario Rounds — Checkpoint', 'Where you actually are on this, measured rather than felt.',
      ['Show structured mobile engineering thinking at interview standard'], 40, { unitType: 'CHECKPOINT', after: ['TIMED_SCENARIOS'] }),
  ] },

  /* ── The mobile candidate ── */
  MB_PLACE_CANDIDATE: { category: 'UNIVERSAL', units: [
    u('RESUME', 'A Mobile Developer Resume and a Published App', 'The skills line recruiters filter on, bullets with evidence (crash-free rate, startup time, ratings), and an app testers can install.',
      ['Write a mobile resume whose every claim can be checked on a phone'], 45, { skillKeys: ['PLACEMENT_READINESS', 'PORTFOLIO_EVIDENCE'] }),
    u('CAREER_PATH', 'The Mobile Career Path', 'React Native, native Android and iOS, and Flutter roles in India; product companies, service companies and startups; and what to learn next.',
      ['Choose a first mobile role and a learning plan that fit your goals'], 35, { after: ['RESUME'], skillKeys: ['PLACEMENT_READINESS'] }),
    u('MOCK_LOOP', 'The Mobile Interview Loop — Mock', 'Online test, a coding round, a build-a-screen round, a mobile concepts round, a manager round and HR — as one mock day, with the debrief.',
      ['Go through a complete mobile developer interview loop and act on its debrief'], 60, { unitType: 'PRACTICE', after: ['CAREER_PATH'], skillKeys: ['INTERVIEW_PERFORMANCE'] }),
    u('CHECKPOINT', 'Mobile Placement — Checkpoint', 'Where you actually are on this, measured rather than felt.',
      ['Show the judgement a mobile hiring panel looks for'], 40, { unitType: 'CHECKPOINT', after: ['MOCK_LOOP'] }),
  ] },
};
