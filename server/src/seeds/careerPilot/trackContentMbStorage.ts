/**
 * Career-track content: Storage and Offline (MB_STORAGE_OFFLINE), Mobile, batch MB2.
 *
 * The React Native code for what Year 3's "Storing Things on the Device", "Usable With No Signal" and "When the Signal
 * Comes Back" taught platform-neutrally: key-value storage with AsyncStorage and MMKV and versioned migrations,
 * an on-device database with expo-sqlite (async API, migrations with PRAGMA user_version), tokens in expo-secure-store,
 * and an offline-first outbox with NetInfo triggers, retry with backoff, idempotency keys and a three-way merge. It
 * also refers back to "Global State with Zustand and Redux Toolkit" and "Server Data with TanStack Query".
 *
 * One fictional app runs through the topic: KhetBook, the field app of a Nashik agri-inputs company whose agronomists
 * visit farms on patchy 4G. Packages were installed with npx expo install for Expo SDK 58 and their API names checked
 * in node_modules. The logic was run under jest-expo with the libraries' jest mocks (AsyncStorage, NetInfo, MMKV's
 * built-in mock with react-native-nitro-modules mocked, an in-memory SecureStore mock); every SQL statement ran in a
 * real SQLite (node:sqlite, SQLite 3.49) behind a small stand-in for expo-sqlite's async methods. Printed output in
 * the notes is that real output. Nothing was run on a device: Keystore/Keychain behaviour, backups, biometrics and
 * real connectivity changes are written from the Expo, React Native and Android documentation.
 *
 * Skills: MOBILE_APP_BASICS by default; REACT_NATIVE where a checkpoint question is about the library code itself.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_MB_STORAGE_OFFLINE_BUNDLES: PilotBundle[] = [
  /* ── KEY_VALUE ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_STORAGE_OFFLINE_KEY_VALUE',
    notes: `KhetBook is the field app of a Nashik agri-inputs company. Four hundred agronomists carry it from farm to farm,
recording visits and taking orders for seed and fertiliser, often on one bar of 4G or none. In Year 3's "Storing Things
on the Device" you sorted data into four places: key-value preferences, a local database, files, and the secure
store. This topic is the React Native code for each, starting with the simplest: key-value storage.

## What belongs in key-value storage

Small values you read by name: the app language (Marathi, Hindi or English), acre or hectare, "onboarding done",
the time of the last sync, the last ten searches, a persisted cart. If you find yourself loading a list and filtering
it in JavaScript, it belongs in SQLite (next lesson). If it would let someone act as the user, such as a token, an OTP
or a PIN, it belongs in the secure store (the lesson after). Plain key-value storage is a file in the app's sandbox:
readable on a rooted phone and, unless excluded, included in backups.

## AsyncStorage: asynchronous, strings only

    npx expo install @react-native-async-storage/async-storage

    import AsyncStorage from '@react-native-async-storage/async-storage';

    await AsyncStorage.setItem('khetbook:language', 'mr');
    const lang = await AsyncStorage.getItem('khetbook:language');   // string | null
    await AsyncStorage.removeItem('khetbook:language');
    const pairs = await AsyncStorage.multiGet(['khetbook:language', 'khetbook:unit']);

It works in Expo Go, every call returns a promise, and every value is a string. Do not import AsyncStorage from
'react-native': that copy was removed from the core long ago, and old tutorials that use it will not run. On Android
the library keeps everything in one SQLite table with a total size cap (6 MB by default in the library's Gradle
config, changeable with the AsyncStorage_db_size_in_MB property). That cap is a hint about the intended use: settings
and small caches, not your catalogue.

## MMKV: synchronous and fast

    npx expo install react-native-mmkv react-native-nitro-modules

    import { createMMKV } from 'react-native-mmkv';

    export const kv = createMMKV({ id: 'khetbook' });
    kv.set('language', 'mr');                     // string, number, boolean or ArrayBuffer
    const lang = kv.getString('language');        // string | undefined, no await
    kv.remove('language');

MMKV is a native key-value store that reads and writes synchronously, so the theme and language are known before the
first frame and there is no flash of English before Marathi appears. It contains native code, so it needs a
development build, not Expo Go. Older tutorials write new MMKV() and storage.delete(key); the current API is
createMMKV() and remove(), so check the README of the version you install. It also has hooks, such as
useMMKVString('language', kv), that re-render a component when the value changes.

**Choosing.** AsyncStorage when you are in Expo Go, store little and read rarely. MMKV when values are read at
startup or on every render, or when a Zustand or Redux store is persisted (you saw persist in "Global State with
Zustand and Redux Toolkit"; give it MMKV as its storage). Neither is a database.

## Serialising: what JSON.stringify quietly does

Both stores keep strings, so objects go through JSON. JSON is lossy, and this is real output:

    JSON.stringify({ a: undefined, n: NaN, m: new Map([[1, 2]]) })   // {"n":null,"m":{}}
    const s = JSON.parse(JSON.stringify({ lastSync: new Date(1767225600000) }));
    typeof s.lastSync                                                 // 'string'
    s.lastSync.getTime()            // TypeError: s.lastSync.getTime is not a function

A Date comes back as a string, a Map as an empty object, undefined disappears. Store times as an ISO string or epoch
milliseconds and convert on read. Wrap JSON.parse in try/catch: a half-written value after the OS killed the app, or
a bug in an old version, should reset one setting, not crash every launch.

## The shape will change: version it

The shape you store today will change in the next release, and a phone may skip three releases. Store a version
number with the value, keep the types of every old shape, and migrate on read:

    type SettingsV1 = { version: 1; lang: 'english' | 'hindi' | 'marathi'; lastSync?: number };
    type SettingsV2 = { version: 2; language: Language; lastSyncedAt: string | null };
    export type Settings = { version: 3; language: Language; areaUnit: AreaUnit; lastSyncedAt: string | null };

    export function migrateSettings(stored: SettingsV1 | SettingsV2 | Settings): Settings {
      let s = stored;
      if (s.version === 1) s = { version: 2, language: V1_LANG[s.lang] ?? 'en',
        lastSyncedAt: s.lastSync ? new Date(s.lastSync).toISOString() : null };
      if (s.version === 2) s = { ...s, version: 3, areaUnit: 'acre' };
      return s;
    }

Steps run in order, so a v1 phone passes through v2 to v3, and each step is written once. After migrating, write the
new shape back so the work is done once. Two more cases matter. A value whose version is newer than the code
understands (a user rolled back an over-the-air update) should be read as defaults and left untouched, not
overwritten with an older shape. And a value that fails to parse should be removed and replaced by defaults.

## Keys and logout

Namespace keys ('khetbook:settings') so a library's keys never collide with yours, and keep device settings apart from
user data. On logout, remove the user's keys (recent searches, the persisted cart, the last-synced time). Do not call
clear() on AsyncStorage: it removes every key the app owns, including keys written by libraries you use.

## A review rule

In code review, search for setItem and set( calls whose key contains token, otp, pin, password or secret. Each one is
a finding, whatever the comment beside it says.`,
    workedExample: `**Scenario.** KhetBook version 1 stored settings as {"version":1,"lang":"marathi","lastSync":1767225600000}.
Version 2 switched to language codes and an ISO timestamp; version 3 added acre or hectare. Some agronomists still have
version 1 data. Write loadSettings so every phone ends up with version 3, and test it.

**The loader.**

    export async function loadSettings(): Promise<Settings> {
      const text = await AsyncStorage.getItem(SETTINGS_KEY);
      if (text === null) return DEFAULT_SETTINGS;                     // first launch
      let parsed: StoredSettings;
      try { parsed = JSON.parse(text); }
      catch { await AsyncStorage.removeItem(SETTINGS_KEY); return DEFAULT_SETTINGS; }
      if (typeof parsed?.version !== 'number' || parsed.version > CURRENT_VERSION) {
        return DEFAULT_SETTINGS;                                      // newer build wrote it: do not overwrite
      }
      const current = migrateSettings(parsed);
      if (parsed.version !== CURRENT_VERSION) {
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
      }
      return current;
    }

**The tests.** In Jest, AsyncStorage is replaced by the mock the library ships:

    jest.mock('@react-native-async-storage/async-storage', () =>
      require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

Four cases, each seeding storage and calling loadSettings. The real output:

    first launch: {"version":3,"language":"en","areaUnit":"acre","lastSyncedAt":null}
    migrated: {"version":3,"language":"mr","lastSyncedAt":"2026-01-01T00:00:00.000Z","areaUnit":"acre"}
    on disk : {"version":3,"language":"mr","lastSyncedAt":"2026-01-01T00:00:00.000Z","areaUnit":"acre"}
    corrupt -> {"version":3,"language":"en","areaUnit":"acre","lastSyncedAt":null} | key now: null
    future  -> {"version":3,"language":"en","areaUnit":"acre","lastSyncedAt":null} | untouched: true

**Reading it.** The v1 phone went through both steps: marathi became mr, the epoch number became an ISO string, and
acre was filled in; the result was written back, so the next launch skips migration. A truncated value
('{"version":3,"language":"hi"') was removed and the app started with defaults instead of crashing on the splash
screen. A version 4 value was ignored and left exactly as it was, so the newer build still finds it after the user
updates again.

**What it does not test.** The mock is an in-memory map. It proves the logic, not the native module; that still needs
one run on a real phone: install the old build, change settings, install the new build over it, and check.`,
    mcqs: [
      mcq('KhetBook shows English for a moment before switching to Marathi on every cold start. The language is read with AsyncStorage.getItem in a useEffect. Which change removes the flash?', [
        ['Read it synchronously from MMKV before the first render', true],
        ['Move the getItem call into the screen\'s render function', false],
        ['Store the language with multiSet instead of setItem calls', false],
        ['Wrap the getItem call in a try/catch block with a fallback', false],
      ], 'AsyncStorage is asynchronous, so the first frame always renders before the value arrives; MMKV returns it synchronously, so the right language is known before anything is drawn. A promise in render still resolves later, multiSet changes how values are written, not when they are read, and try/catch handles failures, not timing.'),
      mcq('After an update, a farmer screen crashes with "s.lastSync.getTime is not a function". The value was saved with JSON.stringify({ lastSync: new Date() }). Why?', [
        ['JSON turns a Date into a string, and parsing does not turn it back', true],
        ['AsyncStorage drops object fields that hold a value of type Date', false],
        ['The Date was stored in UTC, and getTime works only on local dates', false],
        ['JSON.parse returns a frozen object, so none of its methods can be called', false],
      ], 'JSON has no date type: stringify writes an ISO string and parse leaves it a string, so getTime does not exist on it. AsyncStorage never sees the object, only the string; getTime works on any Date; and parsed objects are ordinary, unfrozen objects.'),
      mcq('A rollback of an over-the-air update leaves version 4 settings on phones running code that knows only version 3. What should loadSettings do?', [
        ['Use defaults for this session and leave the stored value untouched', true],
        ['Run the version 3 migration on it and write the result back to disk', false],
        ['Remove the key so that the next launch starts again from a clean slate', false],
        ['Throw an error so the user sees that their settings could not be read', false],
      ], 'Code cannot migrate a shape it does not know, and writing an older shape over it would lose what the newer build saved. Running v3 steps on v4 data misreads it, deleting it throws away the user\'s settings, and an error at launch blocks the app over a preference.'),
    ],
    checkpoint: [
      mcq('Which of these belongs in plain key-value storage in KhetBook?', [
        ['The chosen area unit, acre or hectare, read on every screen', true],
        ['The refresh token returned by the server after the OTP login', false],
        ['The product catalogue of 3,000 items, searched by name daily', false],
        ['The list of farmers and their visits, filtered by the village', false],
      ], 'A small setting read by name is exactly what key-value storage is for. A refresh token belongs in the secure store, and anything you search or filter, like the catalogue or farmers, belongs in SQLite where queries and indexes do the work.'),
      mcq('Settings went from version 1 to 2 to 3 across releases. What makes a phone that skipped two releases end up correct?', [
        ['Migration steps that run in order: 1 to 2, then 2 to 3', true],
        ['A single function that maps each old version straight to 3', false],
        ['Deleting stored settings whenever the version is not current', false],
        ['Keeping only the latest type and casting the stored value to it', false],
      ], 'Chained steps mean each change is written once and every old version passes through all of them. Direct mappings multiply with each release and drift apart, deleting loses the user\'s choices, and a cast tells the compiler a lie about data that still has the old shape.'),
      mcq('On logout, a developer calls AsyncStorage.clear(). What is the problem?', [
        ['It deletes every key the app owns, including those of its libraries', true],
        ['It only clears keys written in the current session of the app', false],
        ['It needs the user\'s permission on Android before it can run', false],
        ['It leaves all the keys in place and only empties each of their string values', false],
      ], 'clear() wipes all of the app\'s AsyncStorage, so libraries that keep their own keys there lose them too; remove the user\'s keys by name instead. It is not limited to the session, needs no permission, and removes keys rather than blanking values.'),
    ],
  },

  /* ── SQLITE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_STORAGE_OFFLINE_SQLITE',
    notes: `An agronomist in Pimpalgaon opens KhetBook in a grape farmer's yard with no signal. She needs the farmer's last
three visits, the village's farmers sorted by name, and a search over 3,000 products. That is a database job. Year 3
said "a local database is where offline lives"; expo-sqlite is that database in an Expo app.

## When SQLite is worth it

Use it when you have lists of hundreds or thousands of rows, need to filter, sort, join or search, or must keep
writes made offline. Do not use it for five settings (key-value storage) or for images (files, with the path in a
row). Bigger tools exist (Drizzle ORM on top of expo-sqlite, WatermelonDB, op-sqlite); learn plain SQL first, because
every one of them produces it.

## Opening it

    npx expo install expo-sqlite

It works in Expo Go. The provider opens the database once, runs your migrations in onInit before any child renders,
and hands the connection to every screen:

    <Suspense fallback={<ActivityIndicator />}>
      <SQLiteProvider databaseName="khetbook.db" onInit={migrateDbIfNeeded} useSuspense>
        <VillageScreen village="Pimpalgaon" />
      </SQLiteProvider>
    </Suspense>

    function VillageScreen({ village }: { village: string }) {
      const db = useSQLiteContext();
      ...
    }

Outside React (a sync engine, a background task) use openDatabaseAsync('khetbook.db') once and share it.

## The async API

    await db.execAsync(sql);                        // one or more statements, no parameters
    const r = await db.runAsync(sql, ...params);    // writes: r.lastInsertRowId, r.changes
    const row = await db.getFirstAsync<T>(sql, ...params);   // T | null
    const rows = await db.getAllAsync<T>(sql, ...params);    // T[]

There are Sync versions of each. They block the JavaScript thread, so a slow query freezes taps and scrolling; keep
to the async ones except for tiny reads at startup. The <T> is a cast, not a check, as "Typing API Data and Runtime
Validation" warned: a typo in a column name gives you undefined fields, not an error.

## Parameters, always

    const name = "Joseph D'Souza";
    db.getAllAsync("SELECT * FROM farmers WHERE name = '" + name + "'");   // near "Souza": syntax error
    db.getAllAsync('SELECT * FROM farmers WHERE name = ?', name);          // [{"id":"F9","name":"Joseph D'Souza"}]

Both lines ran against a real SQLite. Gluing text into SQL breaks on the first apostrophe and lets typed input change
the query. With ?, the value never becomes SQL. For a LIKE search, escape % and _ too, or a search for "100%" matches
everything.

## Schema and migrations with PRAGMA user_version

SQLite keeps an integer in the database file header, user_version, which starts at 0 and means whatever you decide.
Make it the schema version. Keep the migrations as an append-only list, where index i takes version i to i + 1:

    export const MIGRATIONS: string[] = [
      \`CREATE TABLE farmers (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, village TEXT NOT NULL,
         phone TEXT NOT NULL, updated_at INTEGER NOT NULL);
       CREATE TABLE visits (id TEXT PRIMARY KEY NOT NULL,
         farmer_id TEXT NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
         notes TEXT NOT NULL, visited_at INTEGER NOT NULL);\`,
      \`ALTER TABLE farmers ADD COLUMN crop TEXT;
       CREATE INDEX idx_visits_farmer ON visits(farmer_id, visited_at DESC);\`,
      \`CREATE TABLE products (sku TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, pack TEXT NOT NULL,
         price_paise INTEGER NOT NULL CHECK (price_paise >= 0));\`,
    ];

    export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
      await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      let version = row?.user_version ?? 0;
      if (version > MIGRATIONS.length) throw new Error(\`Database is at v\${version}; this build only knows v\${MIGRATIONS.length}\`);
      while (version < MIGRATIONS.length) {
        const next = version + 1;
        const sql = MIGRATIONS[version];
        await db.withExclusiveTransactionAsync(async txn => {
          await txn.execAsync(sql);
          await txn.execAsync(\`PRAGMA user_version = \${next}\`);
        });
        version = next;
      }
    }

Each step and its version bump commit together or not at all. Real runs: a fresh install ends at 3; a phone at
version 1 with Sunita Pawar's row upgrades to 3 and keeps her (crop null); when a deliberately broken fourth migration
was appended, the error was "table orders already exists" and the database stayed at version 3 with no half-made
table. The rules that follow:

- **Never edit a migration that has shipped.** Phones already ran it; your edit runs only on fresh installs.
- **Pragmas that configure the connection go outside the transaction.** foreign_keys is ignored inside one: setting
  it inside a transaction left it at 0 in our test, and at 1 when set outside. It is per connection, so set it every
  time you open the database.
- **SQLite's ALTER TABLE is limited.** Adding a column is easy. Changing a column's type or constraint means a rebuild:
  create the new table, copy with INSERT ... SELECT, drop the old one, rename, all in one migration.

## Types and indexes

SQLite is loosely typed. Pick a convention and keep it: money as integer paise (26650, not 266.5), booleans as 0 and
1, times as epoch milliseconds in an INTEGER column. Index what you filter and sort on, then ask SQLite whether it
uses the index:

    EXPLAIN QUERY PLAN SELECT * FROM visits WHERE farmer_id = ? ORDER BY visited_at DESC LIMIT 1
    SEARCH visits USING INDEX idx_visits_farmer (farmer_id=?)

SEARCH ... USING INDEX is what you want; SCAN visits means every row is read.

## Transactions and bulk writes

withTransactionAsync groups statements, but another async query from elsewhere in the app can run in the middle of
it. withExclusiveTransactionAsync gives you a txn object on its own connection: run every statement in the task on
txn, not db, and other writes wait. Inserting the catalogue one statement at a time, each in its own implicit
transaction, is slow on a mid-range phone; one transaction with a prepared statement (prepareAsync, executeAsync,
finalizeAsync) is the fast path. For long lists, page with LIMIT and OFFSET (or "WHERE name > last seen name") and
feed FlatList, rather than loading 3,000 rows at once.`,
    workedExample: `**Scenario.** Every Monday KhetBook downloads the product catalogue (about 3,000 items) and replaces the local copy.
Last month one bad row from the server, with a negative price, left a phone with half a catalogue. Make the
replacement all-or-nothing and the search safe.

**The replacement.**

    export async function replaceCatalogue(db: SQLiteDatabase, products: Product[]): Promise<void> {
      await db.withExclusiveTransactionAsync(async txn => {
        await txn.runAsync('DELETE FROM products');
        const insert = await txn.prepareAsync(
          'INSERT INTO products (sku, name, pack, price_paise) VALUES (?, ?, ?, ?)');
        try {
          for (const p of products) await insert.executeAsync(p.sku, p.name, p.pack, p.price_paise);
        } finally {
          await insert.finalizeAsync();
        }
      });
    }

The DELETE and every INSERT are in one transaction. One prepared statement is compiled once and run 3,000 times.
finally releases it even when a row fails.

**The search.** Users type "100%" when they mean NPK 19:19:19 100% soluble. In LIKE, % and _ are wildcards, so
escape them and tell SQLite the escape character:

    const escapeLike = (s: string) => s.replace(/[\\\\%_]/g, c => '\\\\' + c);
    db.getAllAsync<Product>("SELECT * FROM products WHERE name LIKE ? ESCAPE '\\\\' ORDER BY name LIMIT 20",
      \`%\${escapeLike(text.trim())}%\`);

**Real output** (three products loaded, then a bad catalogue attempted):

    search urea: ["U45"]
    search 100%: ["N100"]
    search "%": ["N100"]
    search injection text: []
    bad catalogue: CHECK constraint failed: price_paise >= 0
    catalogue still has 3 rows

A lone "%" now finds only the product with a percent sign in its name instead of everything, and the classic
x' OR 1=1 -- typed into the search box is just text that matches nothing. The bad catalogue failed on the CHECK
constraint; the transaction rolled back the DELETE as well, so the phone kept last week's 3 rows rather than an empty
or half list. Show "Catalogue update failed, using the one from last Monday" and retry later.

**One limit of this run.** These queries ran on SQLite through a test stand-in for expo-sqlite's async methods, not
on a phone. The SQL behaves the same; timings on a device do not, so measure the 3,000-row load on a mid-range
Android phone before you promise anyone a number.`,
    mcqs: [
      mcq('A KhetBook release added a crop column by editing the first CREATE TABLE in the migration list. Fresh installs work; upgraded phones crash with "no such column: crop". Why?', [
        ['Upgraded phones had already run that migration and never run it again', true],
        ['SQLite caches the old schema until the phone itself is restarted', false],
        ['ALTER TABLE is required because CREATE TABLE cannot have a crop column', false],
        ['The PRAGMA user_version was reset to 0 when the app was updated', false],
      ], 'The upgraded database was already at the version after that migration, so the edited SQL never runs there; add a new migration instead. SQLite has no schema cache across restarts, CREATE TABLE can of course declare crop, and an app update does not touch user_version.'),
      mcq('Why does migrateDbIfNeeded set PRAGMA user_version inside the same transaction as the migration\'s SQL?', [
        ['So the schema change and the version number commit or roll back together', true],
        ['Because SQLite rejects any PRAGMA statement that runs outside of a transaction', false],
        ['So that the version is visible to other apps that share the same file', false],
        ['Because foreign keys are only checked while the version is being set', false],
      ], 'If the migration fails, the rollback also undoes the version bump, so the next launch retries the same step instead of skipping it. Pragmas run fine outside transactions, no other app reads your sandboxed file, and foreign keys have nothing to do with user_version.'),
      mcq('A screen lists a village\'s farmers with getAllSync on the render path. Scrolling stutters on a mid-range phone. What is the first fix?', [
        ['Use getAllAsync and page with LIMIT, so the JS thread stays free', true],
        ['Use execAsync for the query because it returns the rows more quickly', false],
        ['Add PRAGMA foreign_keys = ON so that SQLite can optimise the query', false],
        ['Move the query into withExclusiveTransactionAsync to give it priority', false],
      ], 'Sync calls block the JavaScript thread that also handles touches, and loading every row makes it worse; async plus paging fixes both. execAsync returns no rows at all, foreign keys enforce integrity rather than speed, and an exclusive transaction is about isolation, not scheduling.'),
    ],
    checkpoint: [
      mcq('Which query safely finds farmers by a name the user typed?', [
        ['db.getAllAsync(\'SELECT * FROM farmers WHERE name = ?\', name)', true],
        ['db.getAllAsync("SELECT * FROM farmers WHERE name = \'" + name + "\'")', false],
        ['db.execAsync(\'SELECT * FROM farmers WHERE name = ?\', name)', false],
        ['db.getAllAsync(`SELECT * FROM farmers WHERE name = \'${name.trim()}\'`)', false],
      ], 'A ? placeholder binds the value, so an apostrophe or SQL in the name stays data. Concatenation breaks on "D\'Souza" and allows injection, execAsync takes no parameters and returns no rows, and a template literal with trim() is still text glued into SQL, with the same apostrophe and injection problems.'),
      ck('REACT_NATIVE', 'In an Expo app, where should KhetBook run its SQLite migrations so that no screen can query the database before they finish?', [
        ['In the onInit function passed to SQLiteProvider', true],
        ['In a useEffect inside the first screen that opens', false],
        ['In app.json, under the expo-sqlite plugin options', false],
        ['In a migration script run by the server on deploy', false],
      ], 'SQLiteProvider awaits onInit before rendering its children, so every useSQLiteContext call sees a migrated database. A useEffect runs after the first render, the plugin options configure the native build, and the server cannot reach the database inside each phone.'),
      mcq('EXPLAIN QUERY PLAN on the "last visit of a farmer" query prints "SCAN visits". What does that tell you?', [
        ['Every visit row is read; an index on farmer_id and visited_at is missing', true],
        ['The query uses the best available index and needs no further change', false],
        ['The visits table is empty, so SQLite skipped the index on purpose', false],
        ['The query has a syntax error and SQLite fell back to a safe mode', false],
      ], 'SCAN means a full table read; with the index the plan reads "SEARCH visits USING INDEX idx_visits_farmer (farmer_id=?)". SEARCH, not SCAN, is the sign of a used index, the plan does not depend on the row count being zero, and a syntax error stops the query with an error instead.'),
    ],
  },

  /* ── SECURE_STORAGE ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_STORAGE_OFFLINE_SECURE_STORAGE',
    notes: `Year 3 settled where a credential lives: "the secure store, which is small, slow and strongly protected", and
never a password, and never a secret shipped inside the app. This lesson is the code. The flow of tokens themselves,
refreshing an expired access token and logging out everywhere, comes later in "Login, Tokens and Refresh"; here the
question is only where they are kept and what that protects against.

## What expo-secure-store is

    npx expo install expo-secure-store

    import * as SecureStore from 'expo-secure-store';

    await SecureStore.setItemAsync('auth.refreshToken', token);
    const token = await SecureStore.getItemAsync('auth.refreshToken');   // string | null
    await SecureStore.deleteItemAsync('auth.refreshToken');

It works in Expo Go. On iOS each value is a Keychain item. On Android the value is encrypted with a key held in the
Android Keystore, which on most phones is backed by secure hardware, and the encrypted bytes are kept in the app's
preferences. The key never enters your JavaScript or your app's files; the Keystore does the encryption for you.

Three rules from the library itself. Values must be strings ("Invalid value provided to SecureStore. Values must be
strings; consider JSON-encoding your values if they are serializable."). Keys may contain only letters, digits, ".",
"-" and "_", so 'auth:refresh' throws "Invalid key provided to SecureStore. Keys must not be empty and contain only
alphanumeric characters, ".", "-", and "_"." And it is meant for small values: a token or a key, not a profile or a
cache. Every call goes to native code and the Keystore, so it is slower than MMKV; read the token once at startup and
keep it in memory.

## Which token goes where

- **Refresh token:** SecureStore. It is long-lived and can mint new access tokens, so it is the valuable one.
- **Access token:** in memory (a module variable or a store that is not persisted). It lives minutes; on a cold start
  you mint a new one from the refresh token. Keeping it in SecureStore too is acceptable; keeping it in AsyncStorage,
  MMKV or a persisted Redux or Zustand store is not.
- **User id, name, language:** plain storage. They identify, they do not authorise.
- **Never on the device:** the password, and any API secret. A key in your JavaScript bundle is readable by anyone who
  unpacks the APK, and "Mobile App Security Basics" later shows how easily.

## Options worth knowing

    const SECURE_OPTS: SecureStore.SecureStoreOptions = {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    };

keychainAccessible is iOS only: AFTER_FIRST_UNLOCK lets a background task read the token after the phone has been
unlocked once since boot, and THIS_DEVICE_ONLY stops the item travelling to a new iPhone through a backup. The default
is WHEN_UNLOCKED. requireAuthentication: true binds the value to the user's biometrics or device credential (more
below). Use the same options for set, get and delete; a value stored with keychainService must be read with it.

## Two surprises: reinstalls and backups

**iOS can keep Keychain items after the app is uninstalled.** A user who deletes KhetBook, reinstalls it and opens it
can find themselves signed in as before, or as the previous owner of a second-hand phone. The defence is a flag in
storage that uninstall always removes (MMKV or AsyncStorage): if the flag is missing, this is a fresh install, so
delete the secure items and set the flag.

**Android Auto Backup can restore app data to a new phone,** but Keystore keys are never backed up, so restored
encrypted values cannot be decrypted. expo-secure-store's config plugin excludes its data from Auto Backup by default
(the configureAndroidBackup option). The general lesson: getItemAsync can reject, and your splash screen must treat
that as "signed out", not crash.

## What a rooted phone exposes

On a rooted phone, a process with root can read every file in your app's sandbox: the AsyncStorage database, the MMKV
file, khetbook.db and anything you logged. Hardware-backed Keystore keys cannot be copied off the chip, but code
running as root can hook your app and ask the Keystore to decrypt on its behalf while the app runs. So secure storage
raises the cost of stealing a token a great deal; it does not make the token safe from a determined owner of the
device. That is why the server must still be able to revoke tokens, why refresh tokens rotate, and why some apps
(banking, UPI) also check device integrity on the server with Google's Play Integrity API. Root detection inside the
app alone is a speed bump; treat it as one signal, not a lock.

Encrypting a larger store: MMKV accepts an encryptionKey and expo-sqlite can be built with SQLCipher (its config
plugin has a useSQLCipher option). Generate the key randomly on first launch with a cryptographic random generator,
keep it in SecureStore, and never hard-code it.

## Biometrics in outline

There are two very different things called "biometric login".

- **A prompt as a gate:** expo-local-authentication shows the fingerprint or face prompt and returns success or
  failure to JavaScript, and the app then reads the token. Good UX, but on a rooted phone the JavaScript check can be
  bypassed, because the token itself was never locked.
- **A key bound to biometrics:** SecureStore with requireAuthentication: true asks the Keystore or Keychain to release
  the value only after the user authenticates. Per the library's documentation, adding a new fingerprint or face
  invalidates such a key, after which getItemAsync resolves null, and a cancelled prompt rejects with an error. Plan
  for both: fall back to OTP login, do not treat them as corruption.

Biometric prompts cannot be tested on an emulator the way they behave on a phone (the library notes this too), so a
real device test is part of the work. For most apps, a refresh token in SecureStore and a biometric prompt for
sensitive actions (approving a large order, showing a UPI reference) is the right level.

## Logout

Delete the secure items, clear the in-memory access token, remove the user's keys from plain storage, and delete the
user's personal rows from SQLite. A shared phone at a farm office is a normal case in India; the next agronomist must
not see the last one's farmers.`,
    workedExample: `**Scenario.** KhetBook's splash screen decides between the sign-in screen and the home screen. Write the session module
so that it never crashes at launch, ignores tokens left by a previous install, and keeps only the refresh token on
disk.

**The module.**

    const REFRESH_KEY = 'auth.refreshToken';
    const INSTALL_FLAG = 'install.seen';               // in MMKV, which uninstall always wipes
    let accessToken: string | null = null;             // memory only

    export async function saveSession(s: Session): Promise<void> {
      await SecureStore.setItemAsync(REFRESH_KEY, s.refreshToken, SECURE_OPTS);
      accessToken = s.accessToken;
      kv.set('auth.userId', s.userId);
    }

    export async function restoreSession(): Promise<'signed-in' | 'signed-out'> {
      if (!kv.getBoolean(INSTALL_FLAG)) {                // fresh install: drop leftovers
        await SecureStore.deleteItemAsync(REFRESH_KEY, SECURE_OPTS).catch(() => {});
        kv.set(INSTALL_FLAG, true);
        return 'signed-out';
      }
      try {
        const refresh = await SecureStore.getItemAsync(REFRESH_KEY, SECURE_OPTS);
        return refresh ? 'signed-in' : 'signed-out';
      } catch {
        await SecureStore.deleteItemAsync(REFRESH_KEY, SECURE_OPTS).catch(() => {});
        return 'signed-out';
      }
    }

signOut sets accessToken to null, deletes the secure item and removes auth.userId.

**The tests.** SecureStore was replaced by an in-memory map with jest.mock, and MMKV used its built-in test mock
(react-native-nitro-modules mocked so the module loads). Real output:

    first launch: signed-out | leftover now: null
    secure store keys: auth.refreshToken | mmkv keys: auth.userId,install.seen
    restored: signed-in
    after sign-out: signed-out null undefined
    unreadable: signed-out | deleted: true

**Reading it.** A refresh token planted before the first launch (the "survived an uninstall" case) was removed and
the user saw sign-in. After signing in, the only thing in secure storage is the refresh token, and plain storage holds
an id and the install flag, nothing that authorises. When getItemAsync was made to reject, as it can after a restore
or a key invalidation, the splash screen went to sign-in and cleared the unreadable item instead of crashing.

**What it does not prove.** The mock does not encrypt anything, and it cannot show Keychain items surviving an
uninstall or Keystore behaviour after a restore. Those need a phone: install, sign in, uninstall, reinstall, and check
that you land on sign-in.`,
    mcqs: [
      mcq('A developer persists the whole Redux auth slice, access and refresh tokens included, to MMKV "because it is faster". What is wrong?', [
        ['MMKV is a plain file; the refresh token belongs in SecureStore', true],
        ['MMKV cannot store strings that are longer than a few hundred characters', false],
        ['Redux state cannot be persisted to MMKV, only to AsyncStorage storage', false],
        ['Nothing, because the app sandbox already stops every other app reading it', false],
      ], 'Speed is not the point: MMKV is unencrypted by default and readable on a rooted phone or from a backup, while SecureStore encrypts with a Keystore or Keychain key. MMKV holds long strings fine, Redux persists to either store, and the sandbox does not stop root or backups.'),
      mcq('Users who reinstalled KhetBook on an iPhone open it and are already signed in as the previous account. What fixes this?', [
        ['A first-launch flag in MMKV; if it is missing, delete the secure items', true],
        ['Calling AsyncStorage.clear() on every launch before reading any token', false],
        ['Storing the refresh token with requireAuthentication set to true', false],
        ['Moving the refresh token into the SQLite database instead of the Keychain', false],
      ], 'Keychain items can outlive an uninstall, but MMKV data cannot, so a missing flag reliably means a fresh install. Clearing AsyncStorage does not touch the Keychain, biometrics would still unlock the old token, and moving the token to SQLite trades a reinstall bug for an unencrypted token.'),
      mcq('With requireAuthentication: true, getItemAsync starts resolving null for one user after they add a new fingerprint. What should the app do?', [
        ['Treat it as signed out and send the user to the OTP login again', true],
        ['Retry getItemAsync in a loop until the Keystore returns the value', false],
        ['Reinstall the key from the copy kept in AsyncStorage for this case', false],
        ['Show an error that the phone\'s storage is corrupted and must be reset', false],
      ], 'Changing enrolled biometrics invalidates a biometrics-bound key by design, so the value is gone and a fresh login is the only way back. Retrying cannot bring it back, a copy in AsyncStorage would defeat the protection, and nothing is corrupted.'),
    ],
    checkpoint: [
      mcq('Where should KhetBook keep the short-lived access token after a cold start mints a new one?', [
        ['In memory, minting it again from the refresh token on each cold start', true],
        ['In AsyncStorage, so every screen can await it whenever it is needed', false],
        ['In a persisted Zustand store, so that it survives a crash of the app', false],
        ['In app.json extra fields, so the build can provide it to every request', false],
      ], 'An access token lives minutes and can always be re-minted, so memory is enough and nothing valuable sits on disk. AsyncStorage and a persisted store write it to a plain file, and app.json is baked into the build for every user.'),
      ck('REACT_NATIVE', 'Which SecureStore call is rejected by the library before anything is stored?', [
        ['SecureStore.setItemAsync(\'auth:refresh\', token)', true],
        ['SecureStore.setItemAsync(\'auth.refresh\', token)', false],
        ['SecureStore.setItemAsync(\'auth-refresh_1\', token)', false],
        ['SecureStore.getItemAsync(\'auth.refresh\')', false],
      ], 'Keys may contain only letters, digits, ".", "-" and "_", so the colon throws "Invalid key provided to SecureStore". The dotted, hyphenated and underscored keys are valid, and reading a key that does not exist resolves null rather than throwing.'),
      mcq('What does keeping the refresh token in hardware-backed secure storage protect against on a rooted phone?', [
        ['Copying the key off the phone, though root can still make the app decrypt', true],
        ['Everything, because root access cannot reach the Android Keystore at all', false],
        ['Nothing, because the Keystore is just another file that root can read', false],
        ['Only screen recording, because the Keystore hides tokens from the screen', false],
      ], 'Hardware-backed keys cannot be extracted, which raises the cost a great deal, but code running as root can hook the app and ask the Keystore to decrypt while it runs. It is neither total protection nor no protection, and it has nothing to do with screen recording.'),
    ],
  },

  /* ── OFFLINE_FIRST ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_STORAGE_OFFLINE_OFFLINE_FIRST',
    notes: `Year 3's "Usable With No Signal" and "When the Signal Comes Back" gave you the design: serve reads from local data,
queue writes as intents, give each one an id the server deduplicates on, do not trust the connectivity API, and
resolve conflicts by field-level merge first. This lesson builds that in KhetBook with expo-sqlite, NetInfo and fetch.

## The shape

- **Screens read from SQLite only.** The network never feeds a screen directly; it updates SQLite, and the screen
  re-reads, so a farmer's page opens instantly in a basement.
- **A write is two rows in one transaction:** the change itself, and an outbox row describing the intent.
- **A sync engine** sends the outbox in order, then pulls what changed on the server since the last sync.
- **Triggers** start the engine: the app starting, coming to the foreground, the network coming back, pull to
  refresh, and a timer while the app is open.

## The outbox

    CREATE TABLE outbox (
      id TEXT PRIMARY KEY NOT NULL,          -- also the Idempotency-Key
      kind TEXT NOT NULL,                    -- 'visit.create', 'farmer.update', ...
      payload TEXT NOT NULL,                 -- JSON of the intent
      created_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'failed')),
      last_error TEXT
    );

    await db.withExclusiveTransactionAsync(async txn => {
      await txn.runAsync('INSERT INTO visits (id, farmer_id, notes, visited_at) VALUES (?, ?, ?, ?)', ...);
      await txn.runAsync('INSERT INTO outbox (id, kind, payload, created_at) VALUES (?, ?, ?, ?)',
        'op-' + visit.id, 'visit.create', JSON.stringify(visit), now);
    });

If either insert fails, neither row exists. In our run a visit for a farmer id that does not exist failed with
"FOREIGN KEY constraint failed", and the outbox still held only the one good operation. Ids are made on the phone
(a UUID), so the visit has its final id before the server has ever seen it.

## Sending: in order, with backoff

    for (const row of pendingRows) {                       // ORDER BY created_at
      if (now - row.created_at > MAX_AGE_MS) { mark failed 'expired'; continue; }
      if (row.next_attempt_at > now) break;                // wait behind this one
      const result = await send(row);                      // a throw counts as 'retry'
      if (result.type === 'ok') delete the row;
      else if (result.type === 'reject') mark failed with the reason;   // tell the user
      else { attempts + 1; next_attempt_at = now + backoffMs(attempts); break; }
    }

A retry stops the loop, because if one request failed on a bad network the next will too, and later operations may
depend on earlier ones (an order for a farmer created offline). A reject (the server will never accept it) is parked
as failed and shown to the user with retry and discard; it does not block the rest. Real output: three queued visits,
the second hitting "Network request failed":

    flush 1: {"sent":1,"retried":1,"rejected":0,"expired":0} calls: op-V1,op-V2
    flush 2 (too early): {"sent":0,"retried":0,"rejected":0,"expired":0}
    flush 3: {"sent":2,"retried":0,"rejected":0,"expired":0} calls: op-V1,op-V2,op-V2,op-V3

## Backoff with jitter

    const ceiling = Math.min(CAP_MS, BASE_MS * 2 ** attempts);   // 2 s base, 5 min cap
    return Math.floor(random() * ceiling);                        // "full jitter"

The ceilings for attempts 0 to 8 (real output, random close to 1): 1999, 3999, 7999, 15999, 31999, 63999, 127999,
255999, 299999 ms. Exponential growth stops a dead server being hammered; the cap keeps the wait sensible; the random
part matters most in India's reality: when a tower in a taluka comes back, four hundred phones reconnect in the same
second, and without jitter they retry in lockstep, every time.

## The request

    const res = await fetch(baseUrl + '/sync/' + row.kind, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': row.id, Authorization: 'Bearer ' + token },
      body: row.payload,
      signal: controller.signal,                 // aborted after 15 s
    });

The Idempotency-Key is the outbox id, so a request that reached the server but whose response was lost is applied
once when retried. The timeout matters on 2G, where a request can hang rather than fail. Classify the answer:
2xx ok; 408, 429 and 5xx retry; 401 refresh the token, then retry; other 4xx reject. Our classifier printed
200:ok 400:reject 401:retry 422:reject 429:retry 503:retry, and a thrown TypeError became a retry.

## Triggers: NetInfo as a hint

    npx expo install @react-native-community/netinfo

    NetInfo.addEventListener(state => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      if (online && wasOnline !== true) void flush();
      wasOnline = online;
    });
    AppState.addEventListener('change', s => { if (s === 'active') void flush(); });

isConnected says there is a network; isInternetReachable is the result of a reachability check, null while unknown.
Treat null as "try". Flush on the offline-to-online edge, not on every event: the request is the real test, because
captive portals and dead backends report as connected. In screens, useNetInfo()
drives the quiet "Offline, 3 changes waiting to sync" banner. If you use TanStack Query, connect its onlineManager to
NetInfo (onlineManager.setEventListener with NetInfo.addEventListener) so queries pause and refetch correctly, as in
"Server Data with TanStack Query"; its paused mutations live in memory unless you persist them, which is why
durable offline writes go through the outbox.

Several triggers can fire in the same second, so run one flush at a time: keep the running promise and return it to
every caller. In our test three simultaneous calls produced one run.

## Conflicts: base, mine, theirs

For updates, the outbox entry carries the fields changed and the server version they were based on. When the server
answers 409 with its current record, merge field by field:

    for (const field of Object.keys(local)) {
      if (server[field] === base[field] || server[field] === local[field]) merged[field] = local[field];
      else conflicts.push({ field, mine: local[field], theirs: server[field] });
    }

Real output, base version 4 (crop onion), server now at 5 with a new name and crop tomato; first the agronomist
changed only the phone, then the phone and the crop (to grapes):

    different fields: {"merged":{"name":"Ramesh B. Jadhav","village":"Pimpalgaon","phone":"9822000002",
                       "crop":"tomato"},"conflicts":[]}
    same field     : {"merged":{ ...the same... },"conflicts":[{"field":"crop","mine":"grapes","theirs":"tomato"}]}

Different fields merge silently; the same field changed two ways keeps the server's value and asks the agronomist.
Not everything should merge: an order for 20 bags when only 12 are in stock is the server's decision, reported back
as a rejected operation with the reason.

## Pull, background and testing

After the outbox is empty, pull changes since a cursor kept in MMKV, in one transaction, skipping rows with pending
outbox operations. Background sync is limited by the OS (see "App State, Background Work and the Lifecycle"), so
design for foreground sync. Test with aeroplane mode, with the emulator's network
throttling, and by killing the app in the middle of a sync.`,
    workedExample: `**Scenario.** Kavita, a KhetBook agronomist, spends a morning in villages near Niphad. Follow three of her visits
through the outbox, using the real output of flushOutbox (random fixed at 0.5 so the waits are predictable).

**09:00 to 11:00, no signal.** She records visits V1, V2 and V3. Each is saved with recordVisit: the visit row and its
outbox row in one transaction. The farmer screens update at once, because they read SQLite. The banner says
"Offline. 3 changes waiting to sync".

**11:05, one bar.** NetInfo reports isConnected true and isInternetReachable null. That is the offline-to-online
edge, so the engine flushes:

    flush 1: {"sent":1,"retried":1,"rejected":0,"expired":0} calls: op-V1,op-V2
    outbox  : [{"id":"op-V2","attempts":1,"next_attempt_at":1767225602000,"status":"pending",
                "last_error":"TypeError: Network request failed"},
               {"id":"op-V3","attempts":0,"next_attempt_at":0,"status":"pending","last_error":null}]

V1 went through and its row was deleted. V2 failed, so the loop stopped: V3 was not even tried. V2 waits
backoffMs(0) = 1,000 ms (half of the 2,000 ms ceiling) before its next try.

**Half a second later, AppState fires 'active'.** Another flush starts, but V2's next_attempt_at is in the future:

    flush 2 (too early): {"sent":0,"retried":0,"rejected":0,"expired":0}

Nothing is sent, and nothing is sent twice. (Had both triggers fired at the same instant, the single-flight guard
would have given them the same run.)

**Two seconds later, the network holds.**

    flush 3: {"sent":2,"retried":0,"rejected":0,"expired":0} calls: op-V1,op-V2,op-V2,op-V3
    outbox  : []

V2 and V3 go through in order. V2 was sent twice in total. If the first attempt had actually reached the server and
only the response was lost, the Idempotency-Key op-V2 lets the server answer the second one without creating a second
visit.

**A week later.** One phone was switched off since the last trip with an operation queued 7 days and 20 ms
earlier, and another operation the server answers with 422:

    summary: {"sent":1,"retried":0,"rejected":1,"expired":1}

The old one is marked failed with last_error "expired" instead of being applied a week late, the rejected one is
parked with "HTTP 422", the good one is sent, and the app lists the two failures for Kavita to retry or discard.
None of her work disappears silently.

This ran in Jest against a real SQLite with a fake send function; on a phone the triggers come from NetInfo and
AppState, which we exercised only through the NetInfo jest mock.`,
    mcqs: [
      mcq('KhetBook\'s sync engine flushes whenever NetInfo reports isConnected true. Agronomists on a dhaba\'s Wi-Fi with a login page see their queue retry endlessly. What is the right design?', [
        ['Treat NetInfo as a hint to try, and let each request\'s result decide', true],
        ['Wait until isInternetReachable is true before sending any request', false],
        ['Stop using NetInfo and flush only when the user pulls to refresh', false],
        ['Clear the outbox when three flushes in a row have failed to send', false],
      ], 'Connectivity APIs cannot see a captive portal or a dead backend, so the request\'s outcome, with backoff, is the real test. Waiting for reachability alone still trusts a signal that can be wrong, manual-only sync leaves work stranded, and clearing the outbox loses the agronomist\'s visits.'),
      mcq('The outbox loop breaks out on a retry instead of moving on to the next operation. Why?', [
        ['Later operations may depend on earlier ones, and the network is likely bad', true],
        ['SQLite cannot update a row while a select over the table is still open', false],
        ['fetch refuses to start a new request until the failed one is garbage collected', false],
        ['A break makes the loop faster, which saves battery on a mid-range phone', false],
      ], 'If an order depends on a farmer created offline, sending it first fails, and a failed request usually means the next will fail too; stopping keeps order and saves pointless requests. SQLite allows the update, fetch has no such rule, and the break is about correctness, not loop speed.'),
      mcq('Why does each outbox operation carry an Idempotency-Key equal to its outbox id?', [
        ['A retried request whose first response was lost is applied only once', true],
        ['The server can sort the operations by key to restore their original order', false],
        ['Expo requires the header on every POST request made in the background', false],
        ['The key encrypts the payload, so a proxy on the network cannot read it', false],
      ], 'A request can succeed on the server while its response is lost on the way back, so the phone retries; the key lets the server recognise the repeat. Order comes from the phone sending in sequence, Expo requires no such header, and encryption is TLS\'s job, not a header\'s.'),
    ],
    checkpoint: [
      mcq('Where should KhetBook\'s farmer screen read its data from in an offline-first design?', [
        ['From SQLite, with the network only updating SQLite in the background', true],
        ['From the API first, falling back to SQLite only when the request fails', false],
        ['From the API, with SQLite used only to hold the writes made offline', false],
        ['From a Zustand store filled by the API when the screen gets mounted', false],
      ], 'Reading local data always makes the screen instant and consistent, and the sync engine keeps SQLite fresh. API-first waits on a slow request before falling back, a write-only cache shows nothing offline, and an in-memory store filled on mount is empty without a network.'),
      mcq('With a 2 s base, a 5 minute cap and full jitter, what can the wait after the 4th failed attempt (attempts = 3) be?', [
        ['Any value from 0 up to just under 16 seconds', true],
        ['Exactly 16 seconds, every time the attempt fails', false],
        ['Any value from 8 seconds up to just under 16 seconds', false],
        ['Exactly 5 minutes, because the cap applies from then', false],
      ], 'The ceiling is 2 s × 2³ = 16 s, and full jitter picks uniformly below it, so the wait is anywhere from 0 to just under 16 s. A fixed 16 s has no jitter, a range starting at 8 s is a different scheme ("equal jitter"), and the 5 minute cap applies only once the ceiling exceeds it.'),
      mcq('Offline, an agronomist changed a farmer\'s phone number; meanwhile the office renamed the farmer. The server returns 409. What should the merge do?', [
        ['Keep the office\'s new name and apply the agronomist\'s new phone', true],
        ['Keep the agronomist\'s whole record, because it was edited last', false],
        ['Keep the server\'s whole record and quietly drop the phone change', false],
        ['Ask the agronomist to choose between the two complete records', false],
      ], 'The two people changed different fields, so a field-level merge keeps both without asking anyone. Last-write-wins or server-wins on the whole record silently loses one change, and asking the user about a conflict that is not one teaches them to tap through dialogs.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_STORAGE_OFFLINE_DEBUGGING',
    notes: `Six faults from KhetBook's bug tracker. Each has the symptom the agronomist or the developer saw, the cause, and the
fix. The error messages are real output from the runs behind this topic (SQLite through node:sqlite, JavaScript in
Node; Hermes on a phone words JavaScript errors differently, so match on the meaning, not the exact text). Storage bugs
share one trait: they appear on upgraded phones and not on the developer's fresh install, so always reproduce by
installing the old build first.

## 1. "[object Object]" and a crash on the next launch

**Symptom.** The recent-searches chip shows "[object Object]", and the next cold start crashes in the settings loader.

    await AsyncStorage.setItem('khetbook:recent', recent as any);     // recent is an array
    ...
    JSON.parse(await AsyncStorage.getItem('khetbook:recent'));
    // "[object Object]" is not valid JSON   (in Node; Hermes words it differently)

**Cause.** AsyncStorage stores strings. The library logs a warning beginning "[AsyncStorage] The value for key
"khetbook:recent" is not a string", which nobody read, and the value became its toString(). The as any silenced the
compiler that would have caught it.

**Fix.** JSON.stringify on write, a typed helper (setJSON and getJSON) so nobody calls the raw API, and a try/catch on
parse that removes the bad key and falls back to defaults. Then search the codebase for "as any" next to storage calls.

## 2. A Date that is no longer a Date

**Symptom.** "Last synced 5 minutes ago" works until the app restarts, then the screen crashes with
"s.lastSync.getTime is not a function".

**Cause.** The settings object held a Date. JSON.stringify wrote an ISO string; JSON.parse left it a string. The
type still said Date, because types are not checked at runtime.

**Fix.** Store an ISO string or epoch milliseconds and say so in the type (lastSyncedAt: string | null), converting
with new Date(value) where it is displayed. If old phones already hold the bad shape, add a migration step that
converts it.

## 3. Fresh installs fine, upgraded phones crash

**Symptom.** After release 2.4, phones that upgraded crash on the farmer list with "no such column: crop". QA, who
installed fresh, never saw it.

**Cause.** The developer added crop TEXT to the first CREATE TABLE in the migration list. Upgraded phones were already
at user_version 1, so that SQL never runs again on them.

**Fix.** Put the first migration back exactly as it shipped and append a new one: ALTER TABLE farmers ADD COLUMN crop
TEXT. Add a test that builds a database at the previous version, inserts a row, runs migrateDbIfNeeded and queries the
new column, which is the test that would have caught this.

## 4. Foreign keys that are not enforced

**Symptom.** Deleting a farmer leaves their visits behind; the visits screen shows rows with no farmer, and an outbox
operation for a farmer id that does not exist is accepted locally and rejected by the server.

**Cause.** PRAGMA foreign_keys = ON was placed inside the first migration's transaction. SQLite ignores it there: in
our run it read back 0 after being set inside a transaction and 1 when set outside. It also applies per connection,
so it was off after the first launch anyway.

**Fix.** Set connection pragmas (foreign_keys, journal_mode) at the start of migrateDbIfNeeded, outside any
transaction, every time the database is opened. Then ON DELETE CASCADE removes the visits and a bad insert fails with
"FOREIGN KEY constraint failed".

## 5. A search that crashes on a farmer's name

**Symptom.** Searching "D'Souza" in the Nashik city dealer list shows an error toast: near "Souza": syntax error.

    db.getAllAsync("SELECT * FROM dealers WHERE name = '" + text + "'");

**Cause.** The typed text was glued into the SQL, and the apostrophe ended the string early. The same line lets
anyone who types SQL change the query on their own phone's database, which is mostly a correctness bug here, but the
habit becomes a security bug on a server.

**Fix.** db.getAllAsync('SELECT * FROM dealers WHERE name = ?', text). For LIKE searches, also escape % and _ and add
an ESCAPE clause, as in the SQLite lesson's worked example.

## 6. Orders created twice

**Symptom.** Dealers report two identical fertiliser orders from the same agronomist, a second apart, on days with
weak signal.

**Cause.** Two problems together. NetInfo's listener and the AppState 'active' listener both called flush() when the
agronomist came out of a shop into signal, so two loops sent the same outbox row. And the request carried no
Idempotency-Key, so the server could not tell a repeat from a new order. Either alone would eventually cause it: a
lost response triggers a retry as well.

**Fix.** A single-flight guard (one running flush; every caller gets the same promise, which in our test turned three
simultaneous calls into one run) and an Idempotency-Key equal to the outbox id, which the server stores and checks.
The guard stops duplicates you cause; only the key stops duplicates the network causes.

## A routine for storage bugs

Install the previous release, use it, then install the new one over it. Read what is actually stored (log the raw
string or query the table) before reading your code. Ask which launch wrote the data and which code read it. And
never fix a storage bug by clearing storage, because the user's unsynced work lives there.`,
    mcqs: [
      mcq('Which test would have caught the "no such column: crop" crash before release?', [
        ['Build a database at the previous version, migrate it, then query the column', true],
        ['Install the new build on a fresh emulator and open the farmer list screen', false],
        ['Snapshot-test the farmer list component with mocked query results in Jest', false],
        ['Run the migration list twice on an empty database and compare the schemas', false],
      ], 'The bug exists only on databases that already ran the old first migration, so the test must start from that state. A fresh install runs the edited SQL and passes, a mocked query never touches the schema, and two runs on an empty database both include the column.'),
      mcq('PRAGMA foreign_keys = ON sits inside the first migration\'s transaction, and orphan visits keep appearing. What is the fix?', [
        ['Set it outside any transaction, every time the database is opened', true],
        ['Move it into the last migration so it runs after the tables exist', false],
        ['Run it once and store the result in MMKV for the following launches', false],
        ['Replace ON DELETE CASCADE with a trigger that deletes the visits', false],
      ], 'SQLite ignores the pragma inside a transaction, and it applies per connection, so it must run at every open, outside one. Any migration position is still inside a transaction and runs once, MMKV cannot switch on a connection setting, and a trigger works around the symptom while inserts stay unchecked.'),
      mcq('Duplicate orders appeared even after a single-flight guard was added to flush(). What is still missing?', [
        ['An Idempotency-Key the server checks, for retries after a lost response', true],
        ['A longer backoff, so the second attempt waits until the first finishes', false],
        ['A NetInfo check that isInternetReachable is true before each request', false],
        ['A lock in AsyncStorage marking the order as sent before the request', false],
      ], 'The guard stops two local loops; it cannot stop a retry after the server applied a request whose response never arrived, and only server-side deduplication handles that. Longer waits still repeat the request, NetInfo cannot see a lost response, and marking sent before sending loses orders when the request fails.'),
      mcq('A storage bug appears only on phones that upgraded from the previous release. What should you do first?', [
        ['Install the old release, use it, then install the new build over it', true],
        ['Clear the app\'s storage on the affected phones and ask users to log in', false],
        ['Add try/catch around every storage call so the screen stops crashing', false],
        ['Reinstall the new build on a fresh emulator and step through the code', false],
      ], 'The bug lives in data the old release wrote, so reproducing it means creating that data. Clearing storage destroys unsynced work and hides the cause, blanket try/catch turns a crash into silent wrong data, and a fresh emulator never has the old data.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_STORAGE_OFFLINE_PRACTICE',
    notes: `Eight exercises, easy to harder, on KhetBook and two other apps. Write your answer before reading ours. Every answer
with output was run: TypeScript under jest-expo with the libraries' mocks, SQL in a real SQLite.

## 1. Pick the store (easy)

For a bus-ticket booking app, say where each goes: key-value (AsyncStorage or MMKV), SQLite, SecureStore, a file, or
nowhere on the device. (a) dark mode on or off; (b) the refresh token; (c) 4,000 bus stops searched by name; (d) the
PDF of today's ticket; (e) the user's UPI PIN; (f) the last five routes searched; (g) bookings made while offline,
waiting to sync; (h) the key that encrypts an MMKV instance.

**Answer.** (a) key-value; (b) SecureStore; (c) SQLite, with an index or a LIKE search; (d) a file, with its path in
SQLite or key-value; (e) nowhere: a UPI PIN is entered into the payment app's own secure screen and never seen or
stored by yours; (f) key-value; (g) SQLite, as rows plus outbox entries; (h) SecureStore, generated randomly on first
launch.

## 2. A safe JSON helper for MMKV (easy)

Write getJSON<T>(key, fallback) and setJSON(key, value) over an MMKV instance, so a corrupt value never crashes.

**Answer.**

    export function getJSON<T>(key: string, fallback: T): T {
      const text = kv.getString(key);
      if (text === undefined) return fallback;
      try { return JSON.parse(text) as T; }
      catch { kv.remove(key); return fallback; }
    }
    export const setJSON = (key: string, value: unknown) => kv.set(key, JSON.stringify(value));

With '{oops' stored under 'broken', getJSON('broken', 'fallback') returned fallback and kv.contains('broken') was
false afterwards. The as T is still a cast; validate with zod where the shape matters.

## 3. Recent searches (easy)

Keep the last 10 searches, newest first, case-insensitive, with no duplicates and no empty strings.

**Answer.**

    export function addRecentSearch(term: string): string[] {
      const clean = term.trim().toLowerCase();
      if (!clean) return getJSON<string[]>('recentSearches', []);
      const next = [clean, ...getJSON<string[]>('recentSearches', []).filter(t => t !== clean)].slice(0, 10);
      setJSON('recentSearches', next);
      return next;
    }

After 'Urea', 'DAP', 'urea ' and 'Mahyco BT cotton' it held ["mahyco bt cotton","urea","dap"]: the second urea moved
to the front instead of appearing twice.

## 4. Settings version 4 (medium)

Version 4 adds notificationsEnabled, which must default to true for everyone upgrading. Write the step.

**Answer.** Add a SettingsV4 type with notificationsEnabled: boolean, make it the current type, set CURRENT_VERSION to
4, and append one step after the others:

    if (s.version === 3) s = { ...s, version: 4, notificationsEnabled: true };

Do not change the steps for 1 and 2; a phone still on version 1 now runs three steps.

## 5. Farmers not visited for 30 days (medium)

Write the SQL for a village's farmers whose last visit is older than 30 days or who were never visited, never-visited
first, then oldest visit first.

**Answer.**

    SELECT f.name, MAX(v.visited_at) AS last_visit
      FROM farmers f LEFT JOIN visits v ON v.farmer_id = f.id
     WHERE f.village = ?
     GROUP BY f.id
    HAVING last_visit IS NULL OR last_visit < ?
     ORDER BY last_visit IS NOT NULL, last_visit

With visits 3, 40, 45 and 31 days old and one farmer never visited, it returned Kavita More (never), Ramesh Jadhav
(40 days, his latest) and Anil Shinde (31 days); Sunita Pawar, visited 3 days ago, was left out. LEFT JOIN keeps
farmers with no visits; INNER JOIN would drop exactly the ones the agronomist most needs.

## 6. The outbox table as migration 4 (medium)

Write migration 4 for the outbox, with the index the flush query needs.

**Answer.** The CREATE TABLE from the lesson, plus:

    CREATE INDEX idx_outbox_pending ON outbox(status, created_at);

EXPLAIN QUERY PLAN for "WHERE status = 'pending' ORDER BY created_at" printed SEARCH outbox USING INDEX
idx_outbox_pending (status=?). With ORDER BY created_at, id it added USE TEMP B-TREE FOR LAST TERM OF ORDER BY,
because id is not in the index; harmless for a short outbox, and a reason to know what the plan says. The CHECK
rejected status 'done' with CHECK constraint failed: status IN ('pending','failed').

## 7. Backoff by hand (medium)

Base 2 s, cap 5 minutes, full jitter. Give the ceiling for attempts 0 to 8, and the wait when random() returns 0.5 for
attempts 0 to 3.

**Answer.** Ceilings (random just under 1): 1999, 3999, 7999, 15999, 31999, 63999, 127999, 255999, 299999 ms. The cap
first applies at attempts = 8, where 2 s × 256 = 512 s exceeds 300 s. With 0.5: 1000, 2000, 4000, 8000 ms.

## 8. Classify and merge (harder)

(a) For each HTTP status, retry, reject or refresh-then-retry: 201, 400, 401, 403, 422, 429, 503. (b) Base: crop onion,
phone 9800000002. Server now: crop tomato, phone unchanged. The agronomist changed crop to tomato offline. What does the
three-way merge produce?

**Answer.** (a) 201 ok; 400, 403 and 422 reject (the same request will fail again); 401 refresh the token, then retry;
429 and 503 retry with backoff. (b) No conflict: both sides chose tomato, so the merge keeps it, with the server's other
fields. Real output: {"merged":{"name":"Ramesh B. Jadhav","village":"Pimpalgaon","phone":"9800000002",
"crop":"tomato"},"conflicts":[]}. A merge that only compared base with mine would wrongly report a conflict here.

## Self-check

If you got 1 to 4, the lessons on key-value and secure storage stuck. Exercises 5 and 6 are SQL you will write weekly
in an offline app. If 7 and 8 were slow, re-read the offline-first lesson's sections on backoff and conflicts.`,
    mcqs: [
      mcq('In exercise 5, what happens to Kavita More, who was never visited, if LEFT JOIN is replaced by an inner JOIN?', [
        ['She disappears from the result, though she most needs a visit', true],
        ['She appears with last_visit set to 0, at the top of the list', false],
        ['The query fails, because MAX cannot be applied to no rows', false],
        ['She appears twice, once for each NULL column from the join', false],
      ], 'An inner join keeps only farmers with at least one matching visit, so the never-visited farmer is dropped. LEFT JOIN is what gives her a NULL last_visit; nothing turns NULL into 0, MAX over a group never fails, and joins do not duplicate rows for NULL columns.'),
      mcq('Settings version 4 adds notificationsEnabled. Which change is right?', [
        ['Append a step from 3 to 4, leaving the earlier steps as they are', true],
        ['Edit the step from 2 to 3 so that it also sets notificationsEnabled', false],
        ['Replace all the steps with one that maps any version straight to 4', false],
        ['Add notificationsEnabled to the defaults and skip writing any migration', false],
      ], 'A new step runs for every phone below version 4, including those already at 3. Editing the 2-to-3 step misses phones already at 3, one big mapping repeats every old rule in a new place, and defaults apply only on first launch, not to stored settings.'),
      mcq('With base 2 s and a 5 minute cap, at which attempts value does the cap first change the ceiling?', [
        ['8, where 2 s × 256 is 512 s', true],
        ['7, where 2 s × 128 is 256 s', false],
        ['5, where 2 s × 32 is 64 s', false],
        ['9, where 2 s × 512 is 1024 s', false],
      ], 'The ceiling is 2 s × 2^attempts; 256 s at attempts 7 is still under 300 s, and 512 s at attempts 8 is the first value above it. Attempts 5 gives 64 s, far below the cap, and by attempts 9 the cap had already applied once.'),
      mcq('In exercise 8, why do 400, 403 and 422 go to "reject" rather than "retry"?', [
        ['The same request will be refused again, so retrying only wastes data', true],
        ['These codes mean the server is down and will come back up later on', false],
        ['Retrying them is forbidden by the HTTP standard for POST requests', false],
        ['They are always caused by an expired token, which needs a new login', false],
      ], 'These say the request itself is wrong or not allowed, so sending it unchanged cannot succeed; park it and tell the user. Server trouble is 5xx, HTTP does not forbid retries, and an expired token is 401, which is handled by refreshing.'),
      mcq('Where does the UPI PIN go in exercise 1, and why?', [
        ['Nowhere in your app: it is entered in the payment app\'s secure screen', true],
        ['In SecureStore, because it is the most sensitive value in the list', false],
        ['In SQLite with SQLCipher, so it is encrypted on the device at rest', false],
        ['In memory only, and only until the payment has been confirmed', false],
      ], 'Your app never sees a UPI PIN; the UPI flow collects it in its own secure screen, so the right storage is none. SecureStore or an encrypted database would still mean your app handled it, and even holding it in memory means your code touched it.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_STORAGE_OFFLINE_INTERVIEW_QUESTION',
    notes: `Four questions React Native interviews ask about storage and offline, at product companies, start-ups and service
companies alike, each with an answer that scores well and the follow-up a good interviewer asks next. Say them aloud,
about two minutes each, and replace KhetBook with an app you built: interviewers listen for a decision you made and
why.

## Q1. "AsyncStorage, MMKV or SQLite: how do you choose?"

**Model answer.** "By the shape of the data and how I read it. Small values I read by name, like the language or a
'seen onboarding' flag, go in key-value storage. I use MMKV when they are read at startup or often, because it is
synchronous, so the right theme and language are there on the first frame; AsyncStorage if I am in Expo Go or
reading rarely. Anything that is a list I filter, sort, join or search goes in SQLite, with indexes. In my field-sales
app, settings were in MMKV and 3,000 products and the farmer list were in expo-sqlite, with migrations driven by
PRAGMA user_version. And tokens go in neither: they go in SecureStore."

**Follow-up: "How do you handle a change to the stored shape in the next release?"** "I version it. Key-value
values carry a version and I run migration steps in order on read, then write the new shape back. For SQLite I keep
an append-only list of migrations and run the missing ones at startup, each in a transaction with the user_version
bump. I never edit a migration that has shipped, and I test upgrades from a database at the previous version."

## Q2. "Where do you store the JWT in a React Native app?"

**Model answer.** "The refresh token goes in secure storage: expo-secure-store, which uses the Keychain on iOS and a
Keystore-backed key on Android. The access token is short-lived, so I keep it in memory and mint a new one on a cold
start. Never AsyncStorage, MMKV or a persisted Redux store: those are plain files, readable on a rooted phone and
possibly in a backup. And no secrets in the bundle at all."

**Follow-up: "Is SecureStore safe on a rooted phone?"** "Safer, not safe. The key cannot be copied off the hardware,
but code running as root can hook the app and get values decrypted while it runs. So the server must be able to
revoke tokens, refresh tokens should rotate, and a sensitive app can add a server-side device-integrity check such as
the Play Integrity API. I would also mention the iOS case where Keychain items survive an uninstall, which I handle
with a first-launch flag in MMKV."

## Q3. "Our users lose orders when the network drops. How would you make the app work offline?"

**Model answer.** "First I'd decide per screen: browsing and order drafts offline-first, payment online-only. For the
offline parts, screens read from SQLite, never directly from the API. A write saves the row and an outbox entry in one
transaction, so the user's work is safe immediately. A sync engine sends the outbox in order when the app starts,
comes to the foreground, or NetInfo reports the network back, though I treat NetInfo as a hint and let the request
decide. Each operation has an id sent as an Idempotency-Key, retries use exponential backoff with jitter and a cap, and
failures the server will never accept are shown to the user with retry and discard. The UI shows 'offline' and
'3 changes waiting' quietly."

**Follow-up: "What happens if the app is killed in the middle of a sync?"** "Nothing is lost. The outbox row is deleted
only after the server confirms, so the operation is sent again on the next launch, and the idempotency key means the
server applies it once even if the first attempt had already reached it."

## Q4. "Two people edit the same customer record offline. What happens when they sync?"

**Model answer.** "It depends on the fields and the data. I keep the base version each edit started from. When the
server returns a conflict with its current record, I merge field by field: if only one side changed a field, that
change wins; if both changed the same field to different values, that is a real conflict, and I keep the server's
value and ask the user. Most real conflicts are different fields, so they merge silently. For things like stock or
payments the server decides and the phone shows why. And where I can, I model data as append-only, like visit notes,
so there is nothing to conflict."

**Follow-up: "Why not just last-write-wins?"** "Because it silently destroys someone's work, and it trusts phone clocks,
which can be minutes off. It is fine for a preference like a theme; not for something a person typed."

## How these are scored

Interviewers listen for three things: a clear decision rule (shape of data, sensitivity), failure handling (corrupt
values, failed migrations, retries, kills mid-sync), and an example from your own work. "I would use Redux persist"
with nothing about tokens, versions or failure is a weak answer even when it is not wrong.`,
    mcqs: [
      mcq('An interviewer asks why you used MMKV rather than AsyncStorage for the app language. Which answer is strongest?', [
        ['MMKV reads synchronously, so the language is set before the first frame', true],
        ['MMKV encrypts values by default, so the language is stored more safely', false],
        ['AsyncStorage is deprecated and is no longer maintained for new projects', false],
        ['MMKV works in Expo Go without a development build, unlike AsyncStorage', false],
      ], 'The real reason is timing: a synchronous read avoids rendering in the wrong language first. MMKV is not encrypted unless you give it a key, the community AsyncStorage package is maintained, and MMKV, not AsyncStorage, is the one that needs a development build.'),
      mcq('In Q3\'s follow-up the app is killed mid-sync. Which design detail makes the answer "nothing is lost and nothing is doubled"?', [
        ['Deleting the outbox row only after success, plus an Idempotency-Key', true],
        ['Running the sync in a background task that the system cannot ever kill', false],
        ['Keeping the outbox in memory and writing it to disk when the app closes', false],
        ['Checking NetInfo before each request so no request starts when offline', false],
      ], 'The row survives until the server confirms, so it is resent, and the key makes a resend harmless. No background task is unkillable, an in-memory outbox is lost when the process is killed, and NetInfo cannot prevent a request dying halfway.'),
      mcq('Which is the weakest answer to "Two people edit the same record offline; what happens?"', [
        ['Last write wins, since the newer timestamp is always the correct one', true],
        ['Merge field by field and ask the user only when one field truly clashes', false],
        ['Let the server decide for stock and payments, and show the user why', false],
        ['Model notes as append-only events so that concurrent edits cannot clash', false],
      ], 'Last-write-wins silently discards one person\'s work and trusts device clocks that can be minutes apart. Field-level merge, server authority for stock and payments, and append-only modelling are the answers interviewers want to hear.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_STORAGE_OFFLINE_CHECKPOINT',
    notes: `Ten questions across the topic: key-value storage and versioned values, SQLite with migrations and safe queries,
tokens in secure storage, and an offline-first outbox with retries and conflicts. Answer without notes; the result
shows which lesson to revisit.`,
    checkpoint: [
      mcq('A field app persists its cart with Zustand. Which storage should back the persist middleware so the cart is ready on the first render?', [
        ['MMKV, through createJSONStorage wrapping its getString and set', true],
        ['SecureStore, so that the cart contents are encrypted on the phone', false],
        ['SQLite, with the whole cart saved as one JSON string in a table row', false],
        ['AsyncStorage, because its promises resolve before the first render', false],
      ], 'MMKV is synchronous, so the persisted cart is available as the store is created. SecureStore is for small secrets and slow, a JSON blob in SQLite wastes the database, and AsyncStorage promises resolve after the first render, which is why hydration flickers.'),
      mcq('Which statement about values kept in AsyncStorage and MMKV is true?', [
        ['They are plain files in the sandbox, readable on a rooted phone', true],
        ['They are encrypted by Android with the user\'s screen lock key', false],
        ['They are erased whenever the app is updated from the Play Store', false],
        ['They are shared with other apps signed by the same developer key', false],
      ], 'Both write ordinary files inside the app sandbox, so root or an unexcluded backup exposes them. Device encryption protects a powered-off phone, not a running one; updates keep app data; and neither store shares data across apps.'),
      ck('REACT_NATIVE', 'What does db.getAllAsync<Farmer>(\'SELECT * FROM farmers WHERE village = ?\', village) guarantee about the rows?', [
        ['Nothing at runtime; Farmer is a cast that the database never checks', true],
        ['Each row is validated against Farmer, and bad rows are filtered out', false],
        ['Each row has every Farmer field, or the promise rejects with an error', false],
        ['The rows are frozen, so a screen cannot change them by mistake later', false],
      ], 'The type argument only tells the compiler what to assume; a renamed column gives undefined fields silently, which is why schemas and tests matter. expo-sqlite does no validation, does not reject on missing fields, and returns ordinary objects.'),
      mcq('Release 3 must change visits.notes from TEXT NOT NULL to allow NULL. How is this done in SQLite?', [
        ['A new migration that rebuilds the table: create, copy, drop, rename', true],
        ['ALTER TABLE visits ALTER COLUMN notes DROP NOT NULL in a new migration', false],
        ['Editing the first migration\'s CREATE TABLE to remove the NOT NULL', false],
        ['Setting PRAGMA user_version back to 0 so every migration runs again', false],
      ], 'SQLite cannot alter a column\'s constraint in place, so the migration creates the new table, copies with INSERT ... SELECT, drops the old one and renames. ALTER COLUMN is not SQLite syntax, editing a shipped migration never reaches upgraded phones, and resetting the version would re-run CREATE TABLE on existing tables.'),
      mcq('Why should the visit row and its outbox entry be written in one transaction?', [
        ['So that a saved visit always has its sync entry, and the reverse', true],
        ['So that SQLite can send both rows to the server in one request', false],
        ['Because expo-sqlite rejects two separate inserts in a single tick', false],
        ['So that the outbox row gets the same rowid as the visit row', false],
      ], 'If only one write succeeded, the phone would show a visit that never syncs, or sync a visit it does not have. SQLite never talks to the server, expo-sqlite accepts separate inserts, and rowids are per table and unrelated.'),
      ck('REACT_NATIVE', 'Which NetInfo state should start a flush of the outbox?', [
        ['isConnected true and isInternetReachable null, after being offline', true],
        ['isConnected false and isInternetReachable false, just after a failure', false],
        ['Any state change at all, including those while staying online', false],
        ['isConnected true only when the connection type is reported as wifi', false],
      ], 'null means reachability is not yet known, so on the offline-to-online edge the app should try and let the request decide. Flushing while offline wastes requests, flushing on every change while online repeats work, and mobile data is the normal case for a field app.'),
      mcq('A user with biometrics-bound tokens taps "Cancel" on the fingerprint prompt at launch. How should the app treat the rejected getItemAsync?', [
        ['As a choice to retry or back out of, offering another way to sign in', true],
        ['As corrupted storage, deleting all of the app\'s data before going on', false],
        ['As a crash to report to Sentry, since the read should never be refused', false],
        ['As consent to skip the check, and read the token without the prompt', false],
      ], 'A cancelled prompt is a normal outcome of an auth flow, as the library\'s documentation says; offer retry or OTP. Nothing is corrupt, it is not a bug to report, and there is no way, nor any reason, to read a biometrics-bound value without the user.'),
      mcq('What does a 5 minute cap add to exponential backoff for an outbox that has failed many times?', [
        ['It keeps the wait reasonable, so sync resumes soon after recovery', true],
        ['It spreads retries across phones so they do not retry in lockstep', false],
        ['It stops retrying after five minutes and marks the operation failed', false],
        ['It makes the server reply within five minutes or abort the request', false],
      ], 'Without a cap the ceiling doubles to hours, so a phone that regained signal might wait far too long. Spreading retries is jitter\'s job, expiry is a separate rule on the operation\'s age, and the request timeout is set by AbortController.'),
      mcq('Offline, an agronomist set a farmer\'s crop to grapes; meanwhile the office set it to tomato. Both started from onion. What should the sync do?', [
        ['Keep tomato for now and ask the agronomist which crop is right', true],
        ['Keep grapes, because the agronomist was standing in the field', false],
        ['Keep onion, because the two changes cancel each other out', false],
        ['Keep whichever change has the later timestamp on its phone', false],
      ], 'Both sides changed the same field to different values, a true conflict, so neither may be dropped silently; keep the server\'s value and ask. Preferring one side by rule loses work, reverting to the base loses both, and device timestamps are unreliable.'),
      mcq('A logged-out agronomist hands the phone to a colleague. Which logout clears the right things?', [
        ['Delete secure tokens, user keys in MMKV and the user\'s SQLite rows', true],
        ['Delete only the refresh token, since everything else is harmless', false],
        ['Call AsyncStorage.clear(), since every value of the app lives there', false],
        ['Uninstall and reinstall the app, which removes all of its data', false],
      ], 'Tokens, user-scoped settings and personal records all belong to the person leaving, so all three go. Leaving the data shows the colleague someone else\'s farmers, AsyncStorage holds neither the database nor the Keychain items, and on iOS Keychain items can even survive a reinstall.'),
    ],
  },
];
