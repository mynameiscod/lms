/**
 * Career-track content: TypeScript for React Native (MB_TYPESCRIPT), Mobile, batch MB1.
 *
 * Types for the JavaScript and React students already write: what the compiler checks and what it cannot, strict
 * mode, interfaces and unions with narrowing, generics and utility types, typed components, hooks and events in
 * React Native, and validating network data with zod. It builds on "Modern JavaScript", "Writing Your Own Hooks",
 * "useRef, useMemo and useCallback" and "Calling an API with fetch and axios" (the React and JavaScript packs) and on
 * Year 3's "Talking to a Backend from a Device"; those are referred to by title, not re-taught.
 *
 * One fictional app runs through the topic: DabbaDash, a Pune food-delivery start-up (menus, a cart, UPI, card and
 * cash payments, order tracking). Every compiler error quoted is real output of TypeScript 6.0 (tsc --noEmit with
 * Expo's tsconfig.base and strict: true) against React Native 0.88 and React 19.3 types; every zod result is real
 * output of zod 4 under jest-expo. Nothing here was run on a device; nothing in this topic needs one.
 *
 * Skill: TYPESCRIPT throughout.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_MB_TYPESCRIPT_BUNDLES: PilotBundle[] = [
  /* ── WHY_TS ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_TYPESCRIPT_WHY_TS',
    notes: `DabbaDash is a food-delivery app in Pune, written in React Native. Three bugs reached users last month, and each
one came from ordinary, working-looking JavaScript:

    const order = { id: 'DD-1042', itemTotal: 240, deliveryFee: 30 };
    const payable = order.itemTotal + order.deliverFee;      // NaN on the bill screen

    const vada = menu.find(m => m.name === 'Vada');           // Vada was sold out that day
    console.log(vada.price);                                  // crash: reading 'price' of undefined

    const priceText = '120';                                  // came from a text field
    const total: number = priceText + 30;                     // "12030", shown as the total

JavaScript ran all three without complaint until the line executed on a phone. TypeScript reports all three while
you type. Here is the real output of the TypeScript compiler (tsc) for those lines. The only annotation is on
total, which the bill screen expects to be a number; without it, total would quietly be inferred as a string and the
error would appear wherever it is used as one:

    l1_typo.ts(3,41): error TS2551: Property 'deliverFee' does not exist on type
      '{ id: string; itemTotal: number; deliveryFee: number; }'. Did you mean 'deliveryFee'?
    l1_typo.ts(14,13): error TS18048: 'vada' is possibly 'undefined'.
    l1_typo.ts(17,7): error TS2322: Type 'string' is not assignable to type 'number'.

That is the whole pitch. TypeScript is JavaScript plus a description of what each value is, and a compiler that
checks your code against that description before it runs. Everything you learned in "Modern JavaScript" still
applies; this topic only adds the types.

## How TypeScript fits into an Expo app

Files that contain types end in .ts, or .tsx when they contain JSX. Expo's default template is already TypeScript:
it has a tsconfig.json and the typescript package. Two different tools then read your code, and the difference
matters:

- **Metro and Babel** bundle the app. Babel strips the types out and does not check them. A file full of type
  errors still bundles, and the app still opens on the phone.
- **tsc** (the TypeScript compiler) checks the types. Your editor runs it continuously, which is where the red
  underlines come from. On the command line, npx tsc --noEmit checks the whole project and writes no files.

So the app running is not proof that the types are right. Run npx tsc --noEmit before you push, and make the CI
pipeline fail when it reports errors. Teams that skip this collect hundreds of ignored errors within months.

Types are erased: after Babel, the bundle contains plain JavaScript and no trace of your annotations. A type can
never check anything at runtime. Keep that sentence in mind; the last lesson of this topic is built on it.

## Inference first, annotations at the edges

You do not annotate everything. TypeScript infers types from values:

    let city = 'Pune';                  // string
    const gateway = 'UPI';              // the literal type "UPI": a const can never be anything else
    const prices = [90, 50, 120];       // number[]
    const tags: string[] = [];          // an empty array tells TypeScript nothing, so annotate it

Annotate where inference has nothing to go on: function parameters, empty arrays and empty objects, and the
return type of a function other files depend on. Under strict mode an unannotated parameter is an error, not a
silent any:

    function addFees(itemTotal, fee) { return itemTotal + fee; }
    error TS7006: Parameter 'itemTotal' implicitly has an 'any' type.

    function addFees(itemTotal: number, fee: number): number {
      return itemTotal + fee;
    }

## The everyday types

- **Primitives:** string, number (integers and decimals alike, rupees included), boolean, and the absence values
  null and undefined.
- **Arrays:** number[] or Array<number>; readonly string[] for one you promise not to change.
- **Tuples:** a fixed-length array where each position has a meaning: const location: [number, number] = [18.52, 73.85].
- **Object types:** { id: string; itemTotal: number; note?: string }. The ? makes a field optional, so its type
  is string | undefined.
- **Unions:** number | undefined means "a number, or nothing". Array find returns T | undefined, which is exactly
  why the vada line above failed to compile.
- **void** for a function that returns nothing; **literal types** like 'UPI' for a value that can be exactly one thing.

A union with undefined or null forces you to handle the missing case before you use the value:

    function findPrice(name: string): number | undefined { ... }
    const p = findPrice('Idli');
    const shown = p === undefined ? 'Not on the menu' : formatRupees(p);   // p is number in the second branch

## tsconfig.json and strict mode

An Expo project's tsconfig.json is short:

    {
      "extends": "expo/tsconfig.base",
      "compilerOptions": { "strict": true }
    }

The base file sets up JSX and module resolution for React Native. strict: true turns on a family of checks, the
two that matter most being strictNullChecks (null and undefined are their own types, so "possibly undefined" is
reported) and noImplicitAny (a value whose type cannot be worked out is an error, not any). Never turn strict
off to make errors go away; that hides the bugs this lesson opened with.

One useful option strict does not include is noUncheckedIndexedAccess. Without it, codes[2] on a two-element array
has type string, and third.length crashes at runtime with "Cannot read properties of undefined (reading 'length')".
With it on, tsc reports error TS18048: 'third' is possibly 'undefined'. It is noisier, so teams switch it on for new
projects rather than in the middle of a large one.

## What the compiler cannot check

The compiler only knows what your code says. Three gaps catch every team:

- **Data from outside.** JSON.parse returns any, and so does res.json() in fetch. Assigning it to an Order compiles
  even when the server sent "itemTotal": "240". Then o.itemTotal * 2 gives 480 by luck, and o.itemTotal + 30 gives
  "24030". The last lesson fixes this with runtime validation.
- **Assertions.** value as Order tells the compiler "trust me". It checks nothing at runtime.
- **any.** A value typed any switches checking off for everything it touches. Prefer unknown, which forces a check
  before use: raw.id on an unknown value gives error TS18046: 'raw' is of type 'unknown'.

## Reading an error message

    l1_typo.ts(3,41): error TS2551: Property 'deliverFee' does not exist on type ...

File, line and column, then a code you can search for, then the message. When a message has several indented lines,
the first line is the summary and the last line is usually the precise cause. Fix the first error in a file first:
one wrong type often produces several errors further down.`,
    workedExample: `**Scenario.** DabbaDash still has an old cart.js. Convert it to TypeScript and see what the compiler finds.

    export function cartTotal(lines, coupon) {
      const sub = lines.reduce((s, l) => s + l.price * l.qty, 0);
      if (coupon.type === 'FLAT') return sub - coupon.amount;
      return sub - (sub * coupon.percent) / 100;
    }

**Step 1: rename to cart.ts and run npx tsc --noEmit.**

    cart.ts(1,27): error TS7006: Parameter 'lines' implicitly has an 'any' type.
    cart.ts(1,34): error TS7006: Parameter 'coupon' implicitly has an 'any' type.
    cart.ts(2,29): error TS7006: Parameter 's' implicitly has an 'any' type.
    cart.ts(2,32): error TS7006: Parameter 'l' implicitly has an 'any' type.

Four errors, one cause: nothing says what lines and coupon are. Fix the parameters; s and l will then be inferred.

**Step 2: describe the data as the app really uses it.** A cart line has a price and a quantity. A coupon is either a
flat amount or a percentage, and the checkout screen calls cartTotal(lines, null) when no coupon is applied:

    type CartLine = { price: number; qty: number };
    type Coupon = { type: 'FLAT'; amount: number } | { type: 'PERCENT'; percent: number };

    export function cartTotal(lines: CartLine[], coupon: Coupon | null): number { ...same body... }

    cart.ts(6,7): error TS18047: 'coupon' is possibly 'null'.
    cart.ts(6,51): error TS2339: Property 'amount' does not exist on type 'Coupon'.
    cart.ts(7,30): error TS2339: Property 'percent' does not exist on type 'Coupon'.

(tsc printed five errors; two more repeat the null one.) The first is a real bug: in JavaScript, a checkout with no
coupon crashed with "Cannot read properties of null". The other two follow from it: until coupon is known not to be
null, TypeScript cannot tell which kind of coupon it is.

**Step 3: handle null, and notice a second bug on the way.**

    export function cartTotal(lines: CartLine[], coupon: Coupon | null): number {
      const sub = lines.reduce((s, l) => s + l.price * l.qty, 0);
      if (coupon === null) return sub;
      if (coupon.type === 'FLAT') return Math.max(0, sub - coupon.amount);
      return sub - (sub * coupon.percent) / 100;
    }

tsc now prints nothing. After the null check, coupon.type === 'FLAT' tells TypeScript which member of the union it
is, so coupon.amount is allowed there and coupon.percent below it. Writing the types also made the team ask what a
Rs 100 coupon on a Rs 80 cart should do; the old code returned -20, and Math.max fixes it. The compiler did not find
that one, but describing the data did. Converting a file is rarely just adding annotations: it is reading each
function and asking what can really arrive.`,
    mcqs: [
      mcq('A DabbaDash developer runs the app in Expo Go and it opens fine, but CI fails on npx tsc --noEmit with six errors. How can both be true?', [
        ['Metro bundles through Babel, which strips types without checking them', true],
        ['Expo Go runs an older compiler that has no strict mode switched on', false],
        ['tsc --noEmit checks the test files only, never the app\'s own source', false],
        ['The phone caches the last good bundle until all type errors are fixed', false],
      ], 'Babel removes the annotations and bundles whatever is left, so type errors never stop the app from opening; only tsc checks them, which is why CI must run it. Expo Go has no compiler of its own, tsc checks every file the tsconfig includes, and a fresh bundle is served whatever its types say.'),
      mcq('In strict mode, which of these lines needs an annotation to compile without error?', [
        ['function applyTip(amount, percent) { return amount * percent / 100; }', true],
        ['const restaurants = [{ name: \'Vaishali\', area: \'FC Road\', rating: 4.4, isOpen: true }];', false],
        ['let deliveryMinutes = 35; deliveryMinutes = 40;', false],
        ['const isOpen = new Date().getHours() < 23;', false],
      ], 'Parameters have nothing to infer from, so strict mode reports TS7006 "implicitly has an any type" until they are annotated. The array, the number and the boolean are all inferred from their values, and assigning 40 to a number variable is allowed.'),
      mcq('The API sends {"itemTotal":"240"} and the code does const o: Order = JSON.parse(text), where Order says itemTotal is a number. What does tsc report?', [
        ['Nothing, because JSON.parse returns any, which fits any type', true],
        ['TS2322, because the string "240" is not assignable to a number', false],
        ['TS18046, because JSON.parse returns unknown and needs narrowing', false],
        ['A warning only, which Expo shows in yellow on the device screen', false],
      ], 'The compiler never sees the server\'s data; JSON.parse is typed to return any, and any is assignable to Order, so the mismatch reaches runtime. It returns any rather than unknown, there is no compile-time knowledge of "240", and Expo does not turn type issues into on-screen warnings.'),
    ],
    checkpoint: [
      mcq('Why should a team keep strict: true in tsconfig.json even when switching it off would clear 40 errors at once?', [
        ['The errors are mostly real null and any problems that strict mode exposes', true],
        ['Expo refuses to bundle a project whose tsconfig.json has strict set to false', false],
        ['Without strict, TypeScript stops inferring types and needs every annotation', false],
        ['Strict mode makes the compiled JavaScript faster on mid-range Android phones', false],
      ], 'strictNullChecks and noImplicitAny find exactly the crashes and silent anys that reach users, so the errors are a to-do list, not noise. Expo bundles either way, inference works with or without strict, and types are erased, so they cannot change runtime speed.'),
      mcq('const outlets = [\'Kothrud\', \'Baner\']; const third = outlets[2]; third.toUpperCase(); compiles under strict mode and crashes. What would have caught it?', [
        ['Turning on noUncheckedIndexedAccess, so indexed reads include undefined', true],
        ['Declaring outlets as readonly string[] so that the array can never grow or shrink', false],
        ['Annotating third explicitly as string instead of relying on inference', false],
        ['Replacing the const with let so TypeScript widens the element types', false],
      ], 'Strict mode still types outlets[2] as string; noUncheckedIndexedAccess makes it string | undefined and tsc then reports \'third\' is possibly undefined. readonly stops changes but not out-of-range reads, annotating string repeats the wrong assumption, and let changes nothing here.'),
      mcq('Which statement about types at runtime in a React Native app is correct?', [
        ['They are erased, so a value typed Order may still hold anything', true],
        ['Hermes checks annotations when a function is called on a device', false],
        ['Babel turns each annotation into a typeof check in the bundle', false],
        ['Types are kept in debug builds and removed from release builds', false],
      ], 'Annotations exist only for the compiler; the bundle is plain JavaScript, so data from outside can break a type without any error. Hermes runs JavaScript and knows nothing of TypeScript, Babel strips types without adding checks, and debug and release builds both lose them.'),
    ],
  },

  /* ── TYPES_INTERFACES ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_TYPESCRIPT_TYPES_INTERFACES',
    notes: `Most of the types in a mobile app describe data: a restaurant, a menu item, an order, a payment. This lesson is
about describing that data precisely enough that impossible states cannot be written down.

## Interfaces and type aliases

    export interface MenuItem {
      readonly id: string;
      name: string;
      price: number;          // rupees
      isVeg: boolean;
      imageUrl?: string;      // some items have no photo
    }

    export interface Restaurant {
      readonly id: string;
      name: string;
      area: string;
      rating: number | null;  // null until it has enough reviews
      menu: MenuItem[];
    }

An interface names an object shape. A type alias names any type at all, including unions and tuples:

    export type OrderStatus = 'PLACED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

For object shapes the two are nearly interchangeable: type MenuItem = { ... } works too. The practical differences:
an interface can extend another (interface Address extends Point { line1: string }) and two interface declarations
with the same name merge, which libraries use to let you add fields; a type alias can express unions, which an
interface cannot. A common team rule, and a fine one: interface for object shapes, type for everything else. Being
consistent matters more than which you pick.

## Optional, readonly and null

- **Optional (imageUrl?: string)** means the key may be missing. Reading it gives string | undefined.
- **null in the type (rating: number | null)** means the key is always there but may hold null. Use it when the API
  sends null on purpose, as it does for a new restaurant with no rating.
- **readonly** stops reassignment through this type. The compiler catches it:

    dosa.id = 'm2';
    error TS2540: Cannot assign to 'id' because it is a read-only property.

readonly is shallow and compile-time only; it does not freeze anything at runtime.

## The checks you get for free

    const status: OrderStatus = 'DELIVERD';
    error TS2820: Type '"DELIVERD"' is not assignable to type 'OrderStatus'. Did you mean '"DELIVERED"'?

    const paneer: MenuItem = { id: 'm3', name: 'Paneer Tikka', price: 220, isveg: true };
    error TS2561: Object literal may only specify known properties, but 'isveg' does not exist in type 'MenuItem'.
      Did you mean to write 'isVeg'?

    function ratingText(r: Restaurant): string { return r.rating.toFixed(1); }
    error TS18047: 'r.rating' is possibly 'null'.

The second check (excess properties) applies only to object literals written directly against a type; it is how
typos in field names are caught.

## Narrowing: from a union to one member

A union says "one of these". Before you can use what is special to one member, you narrow: write a check that
TypeScript understands, and inside it the type is narrower.

    function ratingText(r: Restaurant): string {
      if (r.rating === null) return 'New';
      return r.rating.toFixed(1);                  // number here
    }

    function formatAmount(amount: number | string): string {
      if (typeof amount === 'string') return amount;   // string here
      return \`Rs \${amount}\`;                          // number here
    }

    type ApiError = { error: string; code: number };
    type ApiOk = { data: Restaurant[] };
    function countOf(res: ApiOk | ApiError): number {
      if ('error' in res) return 0;                // the in operator narrows to ApiError
      return res.data.length;                      // ApiOk here
    }

Checks that narrow: === and !== against a value (null, undefined, a literal), typeof for primitives, instanceof
for classes (Error, Date), in for "has this key", Array.isArray, and the ?? and ?. operators for missing values.

## Discriminated unions: the pattern for app state

DabbaDash takes three kinds of payment, and each carries different data. Give each member a common literal field,
the discriminant, and the union describes exactly what can exist:

    export type Payment =
      | { method: 'UPI'; vpa: string }
      | { method: 'CARD'; last4: string; network: 'VISA' | 'RUPAY' | 'MASTERCARD' }
      | { method: 'COD' };

    export function paymentLabel(p: Payment): string {
      switch (p.method) {
        case 'UPI': return \`UPI (\${p.vpa})\`;
        case 'CARD': return \`\${p.network} card ending \${p.last4}\`;
        case 'COD': return 'Cash on delivery';
        default: {
          const unreachable: never = p;
          return unreachable;
        }
      }
    }

Inside each case, p is that member, so p.vpa exists only under 'UPI'. Reading it anywhere else fails:

    error TS2339: Property 'vpa' does not exist on type 'Payment'.
      Property 'vpa' does not exist on type '{ method: "CARD"; last4: string; }'.

The default branch is the **exhaustiveness check**. never is the type with no values; if every case is handled, p
has been narrowed to never and the assignment compiles. Six months later someone adds { method: 'WALLET'; provider:
string } to Payment, and every switch that forgot it fails to compile:

    error TS2322: Type '{ method: "WALLET"; provider: string; }' is not assignable to type 'never'.

That is the compiler giving you a list of every screen to update, before a user sees "undefined" as their
payment method.

## Make impossible states impossible

A common first design for a screen's state is a bag of optional fields: { loading: boolean; error?: string; data?:
Order }. It allows nonsense (loading and error at once, data and error at once), and every reader has to guess
which combination is real. A discriminated union, { status: 'loading' } | { status: 'error'; message: string } |
{ status: 'success'; data: Order }, allows only the states that exist, and narrowing gives you data only where it
is there. You will use this shape for every network screen in this track; you met the four outcomes of a request
in "Loading, Error and Empty States".`,
    workedExample: `**Scenario.** DabbaDash's tracking screen was written with this state:

    type TrackingStateLoose = { loading: boolean; rider?: Rider; deliveredAt?: Date; error?: string };

    function trackingText(s: TrackingStateLoose): string {
      if (s.loading) return 'Loading your order...';
      if (s.error) return s.error;
      return \`\${s.rider.name} is \${s.rider.etaMinutes} min away\`;
    }

tsc reports error TS18048: 's.rider' is possibly 'undefined' (twice). Adding ! or ?. would silence it, but the
error is pointing at a real gap: an order that has no rider yet, and an order that has been delivered, both fall
through to the last line.

**Step 1: list the states the screen really has.** Ask the product team, not the code: loading; searching for a
rider; on the way with a rider; delivered at a time; failed with a message, sometimes retryable.

**Step 2: one member per state, each carrying only its own data.**

    type Rider = { name: string; phone: string; etaMinutes: number };

    export type TrackingState =
      | { kind: 'loading' }
      | { kind: 'searchingRider' }
      | { kind: 'onTheWay'; rider: Rider }
      | { kind: 'delivered'; deliveredAt: Date }
      | { kind: 'failed'; message: string; canRetry: boolean };

**Step 3: switch on the discriminant, with an exhaustiveness check.**

    export function trackingText(s: TrackingState): string {
      switch (s.kind) {
        case 'loading': return 'Loading your order...';
        case 'searchingRider': return 'Finding a delivery partner near the restaurant';
        case 'onTheWay': return \`\${s.rider.name} is \${s.rider.etaMinutes} min away\`;
        case 'delivered':
          return \`Delivered at \${s.deliveredAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}\`;
        case 'failed': return s.canRetry ? \`\${s.message}. Tap to retry.\` : s.message;
        default: {
          const unreachable: never = s;
          return unreachable;
        }
      }
    }

This compiles with no ! and no ?.: s.rider exists only in the onTheWay branch, so it can never be undefined there.

**What changed.** The old type had 2 x 2 x 2 x 2 = 16 combinations of fields, most meaningless; the new one has
exactly five states. The loading-and-error-at-once bug is now impossible to write, and when the team adds a
'pickedUp' state, every switch that does not handle it stops compiling. Whenever you reach for ! to silence
"possibly undefined", first ask whether the type allows a state that should not exist.`,
    mcqs: [
      mcq('DabbaDash adds { method: \'WALLET\'; provider: string } to the Payment union. Which code makes the compiler point to every switch that now misses a case?', [
        ['A default branch that assigns the narrowed value to a variable of type never', true],
        ['A default branch that returns an empty string for any unhandled method', false],
        ['Marking the method field readonly in each member of the Payment union', false],
        ['Declaring Payment as an interface so that its members can be merged', false],
      ], 'When every case is handled the value is never; an unhandled WALLET is not assignable to never, so tsc reports TS2322 at each switch. A default returning "" hides the gap, readonly says nothing about cases, and an interface cannot express a union at all.'),
      mcq('An API returns rating: null for a new restaurant and omits offerText when there is no offer. How should the two fields be typed?', [
        ['rating: number | null and offerText?: string', true],
        ['rating?: number and offerText: string | null', false],
        ['rating: number | undefined and offerText: string', false],
        ['rating?: number | null and offerText?: string | null', false],
      ], 'A key that is always present with null is typed with | null; a key that can be missing is optional with ?. Swapping them describes the wrong data, dropping the absence from offerText lets code read undefined as a string, and making everything optional and nullable loses what the API actually promises.'),
      mcq('Inside if (\'error\' in res) { ... }, where res is ApiOk | ApiError, what type does TypeScript give res?', [
        ['ApiError, the member of the union that declares an error key', true],
        ['ApiOk | ApiError still, since in only narrows class instances', false],
        ['any, because the in operator turns off type checking in a block', false],
        ['unknown, until a typeof check confirms what res really holds', false],
      ], 'The in operator narrows a union to the members that have that key, so the error branch sees ApiError and the code after it sees ApiOk. in works on any object types, not only classes, and it never widens to any or unknown.'),
    ],
    checkpoint: [
      mcq('An order screen uses { loading: boolean; error?: string; order?: Order }. What is the main problem with this type?', [
        ['It allows states that cannot happen, such as loading with an error', true],
        ['Optional fields are not allowed on types used as React state', false],
        ['A boolean field cannot be narrowed by TypeScript in an if check', false],
        ['It must be written as an interface for React Native to accept it', false],
      ], 'Three independent fields give eight combinations, most meaningless, and every reader must guess; a discriminated union lists only the real states. React state can hold any type, booleans do narrow in if checks, and React Native does not care whether a type is an alias or an interface.'),
      mcq('Which of these narrows a value of type Date | string to Date?', [
        ['if (value instanceof Date) { ... }', true],
        ['if (typeof value === \'Date\') { ... }', false],
        ['if (value as Date) { ... }', false],
        ['if (\'Date\' in value) { ... }', false],
      ], 'instanceof checks the class at runtime and TypeScript narrows on it. typeof returns "object" for a Date, never "Date", so that comparison is always false; as is an assertion with no runtime check; and in looks for a key named Date, which a string cannot even be searched with.'),
      mcq('A teammate writes const status: OrderStatus = \'DELIVERD\'. What happens?', [
        ['tsc reports TS2820 and suggests "DELIVERED", since the literal is not in the union', true],
        ['It compiles, because any string is assignable to a union of string literal types', false],
        ['It compiles, but the value is converted to the closest member when the app runs on a phone', false],
        ['Babel reports the error while bundling and the app fails to open in Expo Go', false],
      ], 'A union of literals accepts only those exact strings, and tsc even suggests the near match. A plain string is not assignable to a literal union, nothing is converted at runtime because types are erased, and Babel strips types without reporting them.'),
    ],
  },

  /* ── GENERICS ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_TYPESCRIPT_GENERICS',
    notes: `You have used generics since your first TypeScript line without writing one: number[] is Array<number>, fetch
returns Promise<Response>, and in the next lesson useState<string[]> and FlatList<MenuItem> are generic too. This
lesson is about writing your own, and about deriving types from other types instead of copying them.

## The problem generics solve

DabbaDash needs "the first item of a list" for menus, orders and addresses. Two bad options:

    function firstOfAny(items: any[]) { return items[0]; }
    const n = firstOfAny([90, 50]);
    n.toUpperCase();          // compiles; at runtime: TypeError: n.toUpperCase is not a function

any compiles and throws away the type. Writing firstMenuItem, firstOrder and firstAddress copies the same code
three times. A generic function takes a type as a parameter:

    export function firstOf<T>(items: T[]): T | undefined {
      return items[0];
    }
    const firstPrice = firstOf([90, 50]);          // number | undefined
    const firstName = firstOf(['Idli', 'Dosa']);   // string | undefined

T is a placeholder filled in at each call. You almost never write firstOf<number>(...): TypeScript infers T from the
argument. A useful test of whether a type parameter earns its place: it should appear at least twice, linking an
input to an output (here T[] in, T out). A T used once is just a longer way of writing unknown.

## Generic types

Types can take parameters too. A paginated API wraps every list the same way:

    export type ApiResponse<T> = { data: T; fetchedAt: string };
    export type Page<T> = { items: T[]; nextCursor: string | null };

    type MenuPage = Page<MenuItem>;        // { items: MenuItem[]; nextCursor: string | null }

## Constraints: T extends ...

Sometimes the function needs something from T. keyById must read item.id, so T must have one:

    export function keyById<T extends { id: string }>(items: T[]): Record<string, T> {
      const out: Record<string, T> = {};
      for (const item of items) out[item.id] = item;
      return out;
    }

extends here means "must be assignable to". MenuItem and Order both qualify; an object without an id does not:

    keyById([{ name: 'Idli' }]);
    error TS2353: Object literal may only specify known properties, and 'name' does not exist in type '{ id: string; }'.

## keyof and indexed access

keyof T is the union of T's keys; T[K] is the type of the value at key K. Together they type functions that take a
field name:

    export function sortBy<T, K extends keyof T>(items: T[], key: K): T[] {
      return [...items].sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0));
    }
    sortBy(orders, 'total');      // fine
    sortBy([{ id: 'a', total: 300 }], 'amount');
    error TS2345: Argument of type '"amount"' is not assignable to parameter of type '"id" | "total"'.

A misspelt field name is now a compile error instead of a list that silently does not sort.

## Utility types: derive, do not copy

DabbaDash's Order type is the source of truth. The other order-shaped types are derived from it, so a field added to
Order flows everywhere:

    export interface Order {
      id: string;
      restaurantId: string;
      items: { menuItemId: string; qty: number }[];
      status: OrderStatus;
      total: number;
      placedAt: string;
      note?: string;
    }

    export type NewOrder = Omit<Order, 'id' | 'status' | 'placedAt'>;     // what the app sends; the server sets the rest
    export type OrderPatch = Partial<Pick<Order, 'note' | 'status'>>;      // any subset of note and status
    export type OrderSummary = Pick<Order, 'id' | 'status' | 'total'>;    // what the history list needs

    export const statusLabel: Record<OrderStatus, string> = {
      PLACED: 'Order placed', PREPARING: 'Being prepared', OUT_FOR_DELIVERY: 'On the way',
      DELIVERED: 'Delivered', CANCELLED: 'Cancelled',
    };

The everyday set:

- **Partial<T>** makes every field optional (update payloads); **Required<T>** does the opposite.
- **Pick<T, K>** keeps only keys K; **Omit<T, K>** removes them.
- **Record<K, V>** is an object with keys K and values V. With a union as K, every key is required, so a missing
  status is an error: error TS2741: Property 'OUT_FOR_DELIVERY' is missing in type '{ PLACED: string; PREPARING:
  string; DELIVERED: string; CANCELLED: string; }' but required in type 'Record<OrderStatus, string>'.
- **Readonly<T>**, **NonNullable<T>** (removes null and undefined), **Parameters<F>** and **ReturnType<F>**.
- **Awaited<T>** unwraps a Promise: Awaited<ReturnType<typeof fetchMenu>> is what fetchMenu resolves to, with no
  separate type to keep in step.

Derived types also catch mistakes in the other direction: sending an id the server sets gives error TS2353:
Object literal may only specify known properties, and 'id' does not exist in type 'NewOrder'.

## satisfies: check a value without widening it

Annotating a theme as Record<string, string> checks it but forgets its keys, so theme.primry (a typo) compiles
and is undefined at runtime. satisfies checks the value against a type and keeps the precise type that was inferred:

    export const theme = {
      primary: '#E23744',
      background: 'white',
    } satisfies Record<string, \`#\${string}\`>;
    error TS2322: Type '"white"' is not assignable to type '\`#\${string}\`'.

With 'white' fixed to a hex value, theme.primary is known to exist and theme.primry is an error. Use satisfies for
configuration objects, colour tokens and route tables.

## Where to stop

Generics make shared code safer; they make one-off code harder to read. Write them for utilities, API clients and
hooks used across screens. If a type needs three nested conditional types to express, the design is usually
asking for a simpler data shape.`,
    workedExample: `**Scenario.** DabbaDash's menu screen shows dishes in sections: starters, mains, desserts, beverages. A teammate
wrote a groupBy and the screen crashed for a restaurant with no beverages.

    type Category = 'STARTERS' | 'MAINS' | 'DESSERTS' | 'BEVERAGES';
    type Dish = { id: string; name: string; category: Category; price: number };

    function groupByLoose<T, K extends PropertyKey>(items: T[], keyOf: (item: T) => K): Record<K, T[]> {
      const out = {} as Record<K, T[]>;
      for (const item of items) (out[keyOf(item)] ??= []).push(item);
      return out;
    }
    const n = groupByLoose(dishes, d => d.category).BEVERAGES.length;

tsc prints nothing, and at runtime: Cannot read properties of undefined (reading 'length').

**Step 1: find the lie.** The return type Record<Category, Dish[]> promises a list for every category. The function
only creates keys it meets, so for a restaurant with no beverages the promise is false. The compiler believed it
because of one line: {} as Record<K, T[]>. An as assertion is where a type stops being checked.

**Step 2: return what is true.** Partial<Record<K, T[]>> says "some of these keys":

    export function groupBy<T, K extends PropertyKey>(items: readonly T[], keyOf: (item: T) => K): Partial<Record<K, T[]>> {
      const out: Partial<Record<K, T[]>> = {};
      for (const item of items) {
        const key = keyOf(item);
        (out[key] ??= []).push(item);
      }
      return out;
    }

No assertion is needed now: an empty object really is a Partial<Record<...>>.

**Step 3: let the compiler push the fix to the caller.**

    const byCategory = groupBy(dishes, d => d.category);
    const drinks = byCategory.BEVERAGES?.length ?? 0;

Without the ?., tsc now reports error TS2532: Object is possibly 'undefined' on byCategory.BEVERAGES, which is the
crash, found before it ships.

**Step 4: check that the generics work beyond this screen.** K is inferred from the callback:

    const cheap = groupBy(dishes, d => (d.price < 100 ? 'under100' : 'over100'));
    // Partial<Record<"under100" | "over100", Dish[]>>

T appears in items and in the result, K in the callback and in the result: both type parameters link input to
output, which is the test of a generic that earns its keep. The lesson to carry: when a generic function needs as
to compile, its signature is usually promising more than the body delivers.`,
    mcqs: [
      mcq('What does TypeScript infer for result in const result = firstOf([\'UPI\', \'CARD\']), where firstOf<T>(items: T[]): T | undefined?', [
        ['string | undefined', true],
        ['any, since T was not written', false],
        ['unknown | undefined', false],
        ['"UPI" | "CARD"', false],
      ], 'T is inferred from the argument as string (array elements widen to string), so the result is string | undefined. Leaving out <string> does not make it any or unknown, and the literal union would need the array to be declared as const.'),
      mcq('The app sends PATCH /orders/:id with only the fields that changed, and only note and status may change. Which type fits the body best?', [
        ['Partial<Pick<Order, \'note\' | \'status\'>>', true],
        ['Pick<Partial<Order>, \'id\' | \'note\'>', false],
        ['Omit<Order, \'note\' | \'status\'>', false],
        ['Required<Pick<Order, \'note\' | \'status\'>>', false],
      ], 'Pick keeps just the two editable fields and Partial lets either be left out. Picking id and note allows the wrong fields, Omit keeps everything except the two that may change, and Required forces both to be sent every time.'),
      mcq('A colour file is typed const colours: Record<string, string> = {...}, and colours.primay (a typo) compiles. What fixes this while still checking every value?', [
        ['Drop the annotation and add satisfies Record<string, string>', true],
        ['Change the annotation to Partial<Record<string, string>>', false],
        ['Add as const after the object while keeping the annotation', false],
        ['Mark the annotation Readonly<Record<string, string>> instead', false],
      ], 'satisfies checks each value but keeps the inferred keys, so a misspelt key becomes an error. Partial and Readonly versions of Record<string, ...> still accept every string key, and the annotation overrides what as const infers, so the typo still compiles.'),
    ],
    checkpoint: [
      mcq('Why does sortBy<T, K extends keyof T>(items: T[], key: K) reject sortBy(orders, \'amount\') when Order has total but no amount?', [
        ['K must be one of Order\'s keys, and "amount" is not one of them', true],
        ['Generic functions accept only keys that hold number values', false],
        ['keyof T is computed at runtime from the first element given', false],
        ['The sort comparator cannot compare string values with each other', false],
      ], 'keyof Order is the union of its key names, and the constraint limits K to that union, so the typo is TS2345. Nothing restricts the value type, keyof is purely compile-time, and comparing strings with < works.'),
      mcq('A NewOrder type should be "an Order without the fields the server sets: id, status and placedAt". Which definition stays correct when a field is added to Order later?', [
        ['type NewOrder = Omit<Order, \'id\' | \'status\' | \'placedAt\'>', true],
        ['interface NewOrder { restaurantId: string; items: OrderItem[] }', false],
        ['type NewOrder = Partial<Order>', false],
        ['type NewOrder = Pick<Order, \'restaurantId\' | \'items\'>', false],
      ], 'Omit derives from Order, so a new field appears in NewOrder automatically. The hand-written interface and the Pick both freeze today\'s field list, and Partial makes everything optional, including fields the app must send and ones the server owns.'),
      mcq('Which signature makes keyById accept only arrays of objects that have a string id, and return the same element type?', [
        ['function keyById<T extends { id: string }>(items: T[]): Record<string, T>', true],
        ['function keyById<T>(items: T[]): Record<string, { id: string }>', false],
        ['function keyById(items: { id: string }[]): Record<string, unknown>', false],
        ['function keyById<T extends string>(items: T[]): Record<T, T>', false],
      ], 'The constraint requires an id and T flows through to the result, so a MenuItem comes back as a MenuItem. The second accepts anything and loses the element type, the third loses it to unknown, and the last expects an array of strings, not objects.'),
    ],
  },

  /* ── TS_REACT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_TYPESCRIPT_TS_REACT',
    notes: `This lesson types the React you already know from "Writing Your Own Hooks" and "useRef, useMemo and useCallback",
in React Native. The goal is practical: a teammate who uses your component wrongly sees a red line in the editor,
not a crash in QA.

## Props

A component's props are one object, so they are one type:

    type MenuItemCardProps = {
      item: MenuItem;
      qty?: number;
      onAdd: (id: string) => void;
    };

    export function MenuItemCard({ item, qty = 0, onAdd }: MenuItemCardProps) {
      return (
        <View>
          <Text>{item.name}</Text>
          <Text>Rs {item.price}</Text>
          <Pressable accessibilityRole="button" onPress={() => onAdd(item.id)}>
            <Text>{qty > 0 ? \`Add another (\${qty})\` : 'Add'}</Text>
          </Pressable>
        </View>
      );
    }

Optional props get defaults in the destructuring. Callback props are typed by what the parent receives, here the
item id, not the press event. Leave the return type to inference; React.FC adds nothing you need. Forgetting a
required prop is caught at the call site:

    <MenuItemCard item={dosa} />
    error TS2741: Property 'onAdd' is missing in type '{ item: MenuItem; }' but required in type 'MenuItemCardProps'.

## children and wrapping core components

Anything React can render is ReactNode:

    type SectionProps = { title: string; children: ReactNode };

To build on a core component, extend its props type, so every Pressable prop (disabled, onLongPress, hitSlop,
accessibilityLabel) keeps working with its real type:

    type PrimaryButtonProps = PressableProps & { label: string };
    export function PrimaryButton({ label, ...rest }: PrimaryButtonProps) {
      return (
        <Pressable accessibilityRole="button" {...rest}>
          <Text>{label}</Text>
        </Pressable>
      );
    }

ViewProps, TextProps, TextInputProps and the rest are exported by react-native the same way. Use Omit when your
component replaces a prop, as in Omit<PressableProps, 'children'>.

## useState

useState infers from the initial value, which is right for '' or 0 and wrong for empty and null starts:

    const [items, setItems] = useState([]);
    setItems([dosa]);
    error TS2322: Type 'MenuItem' is not assignable to type 'never'.

    const [selected, setSelected] = useState(null);
    setSelected(dosa);
    error TS2345: Argument of type 'MenuItem' is not assignable to parameter of type 'SetStateAction<null>'.

An empty array is inferred as never[] and null as the type null, so nothing can ever be stored. Pass the type:

    const [items, setItems] = useState<MenuItem[]>([]);
    const [selected, setSelected] = useState<MenuItem | null>(null);

## useReducer with a discriminated union of actions

The pattern from "Interfaces, Type Aliases, Unions and Narrowing" fits actions exactly:

    type CartAction =
      | { type: 'add'; item: MenuItem }
      | { type: 'remove'; id: string }
      | { type: 'applyCoupon'; code: string }
      | { type: 'clear' };

    export function cartReducer(state: CartState, action: CartAction): CartState {
      switch (action.type) {
        case 'add': ...          // action.item exists here
        case 'remove': ...       // action.id exists here
        ...
      }
    }
    const [cart, dispatch] = useReducer(cartReducer, { lines: [], coupon: null });

Every dispatch is now checked:

    dispatch({ type: 'add', id: 'm1' });
    error TS2353: Object literal may only specify known properties, and 'id' does not exist in type
      '{ type: "add"; item: MenuItem; }'.
    dispatch({ type: 'aplyCoupon', code: 'FEAST50' });
    error TS2820: Type '"aplyCoupon"' is not assignable to type '"add" | "remove" | "applyCoupon" | "clear"'.
      Did you mean '"applyCoupon"'?

The same action shape is what Redux Toolkit generates, so this carries over to the state topic.

## Events: React Native is not the DOM

The web habit onChange={e => setQuery(e.target.value)} does not exist here. TextInput's onChangeText gives you the
string directly:

    <TextInput value={query} onChangeText={e => setQuery(e.target.value)} />
    error TS2339: Property 'target' does not exist on type 'string'.

    <TextInput value={query} onChangeText={setQuery} />          // correct

When you need the event object, use React Native's types, not the DOM's: GestureResponderEvent for onPress and
onLongPress (e.nativeEvent.pageX, pageY), and the TextInput event types such as TextInputSubmitEditingEvent for
onSubmitEditing (e.nativeEvent.text). Typing an onPress handler with the web MouseEvent fails with a long TS2322
whose last line is the clue: the event "is missing the following properties from type 'MouseEvent<Element,
MouseEvent>': altKey, button, buttons, clientX, and 14 more".

## Refs

A ref to a native component is typed with its instance type. Current React Native types export TextInputInstance,
ViewInstance and similar:

    const searchRef = useRef<TextInputInstance>(null);
    useEffect(() => { searchRef.current?.focus(); }, []);
    <TextInput ref={searchRef} ... />

Older tutorials write useRef<TextInput>(null), which these types reject with an error ending "Type 'TextInputType' is
not assignable to type '_TextInputInstance | null'". If you see that in a project, change the type argument.

## Custom hooks

A hook is a function, so it is typed like one, and generics make it reusable:

    export function useDebouncedValue<T>(value: T, delayMs: number): T {
      const [debounced, setDebounced] = useState(value);
      useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(t);
      }, [value, delayMs]);
      return debounced;
    }

A hook that returns a pair like useState needs as const, or TypeScript infers an array of either type:

    function useToggle(initial = false) {
      const [on, setOn] = useState(initial);
      const toggle = () => setOn(v => !v);
      return [on, toggle] as const;            // readonly [boolean, () => void]
    }

Without as const, the return type is (boolean | (() => void))[], and passing toggle to onPress fails with "Type
'boolean | (() => void)' is not assignable to type ...". For more than two values, return an object instead.

## Lists

FlatList is generic and infers its item type from data, so renderItem={({ item }) => ...} gets a MenuItem with no
annotation, and keyExtractor={item => item.id} is checked. If item comes out as any, data is untyped upstream; fix
it there.

## Types and tests together

Types catch the wrong shape; tests catch the wrong behaviour. In this lesson's code, cartReducer adding the same dish
twice was checked with a Jest test (qty 2, one line), and a Testing Library test pressed "Add another (2)" and
checked onAdd was called with 'm1'. Both passed under jest-expo. Neither tool replaces the other.`,
    workedExample: `**Scenario.** DabbaDash's grocery tab loads delivery slots for a pincode, and three screens copy the same
loading/error/success code. Write one typed hook they can share.

**Step 1: the state type.** One member per outcome, with data only on success:

    export type AsyncState<T> =
      | { status: 'loading' }
      | { status: 'error'; error: Error }
      | { status: 'success'; data: T };

**Step 2: the hook, generic in what it loads.**

    export function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[]) {
      const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
      const [attempt, setAttempt] = useState(0);
      useEffect(() => {
        let cancelled = false;
        setState({ status: 'loading' });
        load().then(
          data => { if (!cancelled) setState({ status: 'success', data }); },
          (e: unknown) => {
            if (!cancelled) setState({ status: 'error', error: e instanceof Error ? e : new Error(String(e)) });
          },
        );
        return () => { cancelled = true; };
      }, [...deps, attempt]);
      const retry = useCallback(() => setAttempt(a => a + 1), []);
      return { state, retry };
    }

Three decisions in it. useState needs <AsyncState<T>>, or it would be inferred from { status: 'loading' } alone.
The rejection value is unknown, because anything can be thrown; instanceof narrows it to Error before use. The
cancelled flag stops a slow response for an old pincode from overwriting the new one, the cleanup pattern from
"useEffect and When Code Runs". (The linter will ask about deps; spreading a caller's array is a deliberate choice
here.)

**Step 3: use it, and let narrowing do the work.**

    export function SlotPicker({ pincode }: { pincode: string }) {
      const { state, retry } = useAsync(() => fetchSlots(pincode), [pincode]);
      if (state.status === 'loading') return <Text>Loading slots...</Text>;
      if (state.status === 'error') {
        return (
          <Pressable accessibilityRole="button" onPress={retry}>
            <Text>{state.error.message} - tap to retry</Text>
          </Pressable>
        );
      }
      return <View>{state.data.map(s => <Text key={s.id}>{s.label}</Text>)}</View>;
    }

T was never written: fetchSlots returns Promise<Slot[]>, so T is Slot[] and state.data.map gets a Slot. After the two
early returns, state can only be the success member, so state.data needs no ?. and no !. Reading state.data above
the checks is a compile error, which is exactly the bug of showing an empty list while it is still loading.

tsc --noEmit passed on the hook and the screen. For server data across many screens, the state topic introduces a
library that does this with caching; the typing ideas are the same.`,
    mcqs: [
      mcq('A screen does const [addresses, setAddresses] = useState([]) and later setAddresses(list), where list is Address[]. tsc reports that Address is not assignable to never. What is the fix?', [
        ['Write useState<Address[]>([]) so the state has the real element type', true],
        ['Write setAddresses(list as never[]) to match the inferred state type', false],
        ['Initialise the state with useState(null) and assign the list later', false],
        ['Annotate list as any[] so that it can be stored in any state slot', false],
      ], 'An empty array literal gives TypeScript nothing to infer from, so the state is never[]; the type argument states what it will hold. Casting to never[] or any[] silences the compiler and loses the type, and null as the start value has the same inference problem with null instead of never.'),
      mcq('Which TextInput handler is correct in React Native?', [
        ['onChangeText={text => setPincode(text)}', true],
        ['onChangeText={e => setPincode(e.target.value)}', false],
        ['onChange={e => setPincode(e.currentTarget.value)}', false],
        ['onInput={e => setPincode(e.nativeEvent.value)}', false],
      ], 'onChangeText passes the new string straight to the handler. The second is the web habit, and tsc reports that target does not exist on string; onChange\'s native event has a text field, not a DOM currentTarget.value; and TextInput has no onInput prop.'),
      mcq('A useOtpTimer hook returns [secondsLeft, restart] and a caller\'s onPress={restart} fails to compile. What change fixes the hook\'s return type?', [
        ['Return [secondsLeft, restart] as const so the tuple keeps both types', true],
        ['Wrap restart in useCallback so that its type becomes a stable function', false],
        ['Annotate the hook\'s return type as any[] so callers can pick elements', false],
        ['Return { secondsLeft, restart } as const and keep destructuring arrays', false],
      ], 'An array literal is inferred as (number | (() => void))[], so each element might be either; as const makes it a readonly tuple. useCallback does not change the inferred array type, any[] removes checking, and an object cannot be destructured with array syntax.'),
    ],
    checkpoint: [
      mcq('A reusable OrderButton should accept every Pressable prop plus a label. Which props type does that?', [
        ['type OrderButtonProps = PressableProps & { label: string }', true],
        ['type OrderButtonProps = { label: string; [key: string]: any }', false],
        ['type OrderButtonProps = { label: string; onPress: () => void }', false],
        ['type OrderButtonProps = Partial<HTMLButtonElement> & { label: string }', false],
      ], 'The intersection keeps every Pressable prop with its real type and adds label. An any index signature accepts misspelt props, listing onPress alone drops disabled, onLongPress and the rest, and HTMLButtonElement is a DOM type that has nothing to do with React Native.'),
      mcq('dispatch({ type: \'remove\', itemId: \'m1\' }) fails with TS2353, where CartAction has { type: \'remove\'; id: string }. What is the compiler saying?', [
        ['The remove action takes id, so itemId is an unknown property', true],
        ['useReducer cannot accept objects with more than two fields', false],
        ['The reducer must be wrapped in useCallback to accept actions', false],
        ['remove is a reserved word and cannot be used as an action type', false],
      ], 'The discriminant selects the remove member, and the excess-property check rejects itemId, a misspelling of id. There is no limit on fields, useCallback is irrelevant to dispatch\'s type, and remove is an ordinary string literal.'),
      mcq('Which ref works with the current React Native types for focusing a TextInput?', [
        ['const ref = useRef<TextInputInstance>(null)', true],
        ['const ref = useRef<HTMLInputElement | null>(null)', false],
        ['const ref = useRef<typeof TextInput>(null)', false],
        ['const ref = useRef<TextInputProps>(null)', false],
      ], 'Refs to native components are typed with the instance type the library exports, which has focus(). HTMLInputElement is the web DOM type, typeof TextInput is the component itself rather than a mounted instance, and TextInputProps describes props, not the object a ref points to.'),
    ],
  },

  /* ── TS_API_DATA ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_TYPESCRIPT_TS_API_DATA',
    notes: `In "Calling an API with fetch and axios" and Year 3's "Talking to a Backend from a Device" you fetched JSON and
used it. With TypeScript there is a temptation to finish the job with one word:

    const order = (await res.json()) as Order;
    order.total.toFixed(2);

It compiles. Then the backend team changes total from a number to the string "240.00" (money as a string is common,
to avoid floating point), and every phone running this build crashes on the order screen with:

    TypeError: order.total.toFixed is not a function

The first lesson said types are erased. A type describes what you believe about data; it never checks the data.
For values that come from outside the app, belief is not enough.

## What counts as "outside"

Anything your code did not create in the same build: API responses, values read from storage (an older app
version may have written a different shape), deep-link and push-notification parameters, query strings, and data
from native modules. On mobile this matters more than on the web: you cannot redeploy a phone. A user may run a
build from six months ago against today's API, so the client must survive data it did not expect.

## unknown, not any

res.json() is typed Promise<any>. Assign it to unknown straight away:

    const body: unknown = await res.json();
    return body;           // in a function returning Promise<Order>
    error TS2322: Type 'unknown' is not assignable to type '{ id: string; status: ...; total: number; ... }'.

any lets the value flow anywhere unchecked. unknown blocks it until you prove its shape, which is exactly the
reminder you want. Use any only as a short-lived escape hatch with a comment saying why.

## Proving the shape: a type guard, then a schema

A type guard is a function whose return type is x is T. TypeScript trusts it to narrow:

    export function isMenuItem(x: unknown): x is MenuItem {
      if (typeof x !== 'object' || x === null) return false;
      const o = x as Record<string, unknown>;
      return typeof o.id === 'string' && typeof o.name === 'string'
        && typeof o.price === 'number' && typeof o.isVeg === 'boolean'
        && (o.imageUrl === undefined || typeof o.imageUrl === 'string');
    }

It works, but it is tedious, it says only "invalid" without saying why, and the guard and the type can drift apart
(add a field to MenuItem and the guard still compiles). A schema library solves all three. zod is the common choice
in React Native projects:

    import { z } from 'zod';

    export const MenuItemSchema = z.object({
      id: z.string(),
      name: z.string().min(1),
      price: z.number().nonnegative(),
      isVeg: z.boolean(),
      imageUrl: z.url().optional(),
    });
    export type MenuItem = z.infer<typeof MenuItemSchema>;

The schema is the single source: z.infer derives the TypeScript type from it, so the runtime check and the
compile-time type cannot drift apart.

## parse and safeParse

parse returns the data or throws; safeParse returns { success: true, data } or { success: false, error } and never
throws. On a bad item ({ name: '', price: '90' }), z.prettifyError(result.error) printed:

    ✖ Too small: expected string to have >=1 characters
      → at name
    ✖ Invalid input: expected number, received string
      → at price

and error.issues holds the same as data, each with a path (["price"]), a code (invalid_type) and a message. Log
the path and code to your crash reporting, not the whole response, which may contain a customer's phone number.

## Shapes you will meet

    export const OrderSchema = z.object({
      id: z.string(),
      status: z.enum(['PLACED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']),
      total: z.coerce.number(),
      placedAt: z.iso.datetime().transform(s => new Date(s)),
      rider: z.object({ name: z.string(), phone: z.string() }).nullable(),
    });
    export type Order = z.infer<typeof OrderSchema>;      // placedAt: Date, after the transform
    export type OrderWire = z.input<typeof OrderSchema>;  // what arrives, before it

Parsing { total: '240.00', placedAt: '2026-10-28T12:30:00Z', ... } gave total the number 240 and placedAt a real
Date. An unknown status failed with:

    ✖ Invalid option: expected one of "PLACED"|"PREPARING"|"OUT_FOR_DELIVERY"|"DELIVERED"|"CANCELLED"
      → at status

Two cautions, both from running it. First, z.coerce.number() calls Number() on anything: it turned '240.00' into 240,
but it also turned '' and null into 0. A missing total silently becoming Rs 0 is worse than an error. For money,
be strict: z.string().regex(/^\\d+(\\.\\d{1,2})?$/).transform(Number) gave 240 for '240.00' and failed for '' and null.
Second, z.discriminatedUnion('method', [...]) mirrors the Payment union from the second lesson, and an unknown method
fails with "Invalid discriminator value. Expected 'UPI' | 'CARD' | 'COD'".

## Decide what a failure means

Validation forces a product decision that untyped code left to chance:

- **Reject the response** when the data is essential and wrong: an order total, a payment status. Show an error
  state with a retry, and report it.
- **Drop the bad item** in a list, so one broken dish does not blank the whole menu. Validate the array as unknown
  items, then each item with safeParse; on a three-item menu with one null price, the parser kept Masala Dosa and
  Idli and reported one dropped.
- **Fall back** for a non-essential field with .catch(): z.url().optional().catch(undefined) turned a malformed
  imageUrl into no image, and the card shows a placeholder.

New enum values deserve thought. If the server adds READY_FOR_PICKUP next month, a strict z.enum fails every order
in old app versions. Agree with the backend team that new values are added only after the app handles them, or
make the client tolerant where a fallback is safe.

## One typed fetch for the whole app

Validate once, at the boundary, in your API module; screens then use typed data and never see unknown:

    export async function getJson<S extends z.ZodType>(url: string, schema: S, fetchFn: typeof fetch = fetch): Promise<z.infer<S>> {
      const res = await fetchFn(url);
      if (!res.ok) throw new ApiError(\`HTTP \${res.status} for \${url}\`, res.status);
      const body: unknown = await res.json();
      const parsed = schema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(\`Unexpected response from \${url}: \${z.prettifyError(parsed.error)}\`);
      }
      return parsed.data;
    }

    const item = await getJson(\`\${API}/menu/m1\`, MenuItemSchema);    // item: MenuItem

The fetchFn parameter exists for tests. Jest tests passed a fake fetch: a valid body returned a typed item, a 404
threw "HTTP 404 for https://api.example.test/menu/zz", and { price: 'ninety' } threw "Unexpected response from
https://api.example.test/menu/m1: ✖ Invalid input: expected number, received string → at price".

Some teams generate types from the backend's OpenAPI specification instead of writing them. That keeps the types in
step with the server's documentation, but generated types are still only types: pair them with runtime validation,
or generate schemas too. The same zod schemas also validate forms, which the state and forms topic uses with
react-hook-form.`,
    workedExample: `**Scenario.** DabbaDash's order screen crashed on some phones after a backend release. The crash report says:
TypeError: order.total.toFixed is not a function. The API module is:

    export async function getOrder(id: string): Promise<Order> {
      const res = await fetch(\`\${API}/orders/\${id}\`);
      return (await res.json()) as Order;
    }

**Step 1: confirm the cause.** The release notes say total is now a string such as "240.00". The as Order cast told
the compiler a number would arrive, so nothing complained; the first code to treat it as a number crashed.

**Step 2: write the schema from the real response, not from the old type.** Take a response from the staging API:

    { "id": "DD-1042", "status": "PREPARING", "total": "240.00", "placedAt": "2026-10-28T12:30:00Z", "rider": null }

    const Rupees = z.string().regex(/^\\d+(\\.\\d{1,2})?$/).transform(Number);
    export const OrderSchema = z.object({
      id: z.string(),
      status: z.enum(['PLACED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']),
      total: Rupees,
      placedAt: z.iso.datetime().transform(s => new Date(s)),
      rider: z.object({ name: z.string(), phone: z.string() }).nullable(),
    });
    export type Order = z.infer<typeof OrderSchema>;     // total: number, placedAt: Date

The screens keep total as a number, so none of them change. Rupees accepts "240.00" and rejects "" and null, which
z.coerce.number() would have turned into 0.

**Step 3: replace the cast with the shared getJson.**

    export const getOrder = (id: string) => getJson(\`\${API}/orders/\${id}\`, OrderSchema);

The return type is inferred as Promise<Order>, so the old annotation and the old hand-written Order interface can
both be deleted; the schema is now the only definition.

**Step 4: decide the failure path.** An order total is essential, so a bad response throws ApiError, and the order
screen's error state ("We could not load this order. Retry") shows instead of a crash. The error message carries
the path (→ at total), which goes to crash reporting without the customer's data.

**Step 5: pin it with a test.** A Jest test feeds getJson a fake fetch with the new response and checks total is 240;
another feeds { "total": null } and expects ApiError. Both run in milliseconds, without a network.

**What to say in the post-mortem.** The bug was not the backend change; APIs change. It was the cast, which turned
"we expect a number" into "we promise a number" with nothing checking the promise. Every as on external data is a
crash waiting for a release.`,
    mcqs: [
      mcq('Why does const order = (await res.json()) as Order not protect the app when the API changes a field\'s type?', [
        ['as only tells the compiler what to assume; nothing is checked when it runs', true],
        ['as checks the fields only in development builds, and release builds skip it', false],
        ['res.json() returns a string, so the cast applies to text instead of an object', false],
        ['as works for interfaces but not for type aliases created with the type keyword', false],
      ], 'Types and assertions are erased, so the cast adds no runtime check in any build; the wrong shape flows on until something uses it. Development builds behave the same, res.json() parses to an object, and as treats interfaces and aliases alike.'),
      mcq('A menu API returns 120 dishes and one has price: null. With strict validation of the whole array, the menu screen is blank. What is the better design for a list?', [
        ['Validate each item with safeParse, keep the good ones and report the dropped count', true],
        ['Switch the price field to z.coerce.number() so that the null becomes zero rupees', false],
        ['Remove validation from menus and validate only order and payment responses', false],
        ['Catch the error in the screen and show the raw response so the user can choose', false],
      ], 'Per-item validation keeps one bad record from hiding 119 good ones while still reporting it. Coercing null to 0 lists the dish as free, dropping validation lets the null crash a price label later, and raw JSON is not something to show a user.'),
      mcq('What does z.infer<typeof MenuItemSchema> give you?', [
        ['The TypeScript type of the data the schema returns after parsing', true],
        ['A runtime function that checks whether a value matches the schema', false],
        ['A JSON Schema document that the backend team can import directly', false],
        ['The type of the schema object itself, with its methods such as parse', false],
      ], 'z.infer derives the output type from the schema, so the type and the runtime check share one definition. The checking is done by parse and safeParse, JSON Schema is a separate export, and typeof MenuItemSchema without z.infer would be the schema object\'s own type.'),
    ],
    checkpoint: [
      mcq('Which of these is data from outside the app that should be validated before it is trusted?', [
        ['An order saved to storage by an older version of the app', true],
        ['A constant array of categories written in the app\'s code', false],
        ['The value returned by a reducer the app\'s own code defines', false],
        ['Props passed from a parent screen in the same app bundle', false],
      ], 'Stored data may have been written by a build with a different shape, so it is external to the code now running. Constants, reducer results and props are produced by code the compiler checked in the same build.'),
      mcq('A schema uses total: z.coerce.number(). What happens when the API sends "total": null?', [
        ['It parses as 0, so a missing total becomes Rs 0', true],
        ['It fails with "expected number, received null"', false],
        ['It parses as NaN, which then fails the number check', false],
        ['It is left as null, since coerce skips null values', false],
      ], 'coerce calls Number() on the input, and Number(null) is 0, so the parse succeeds with a wrong value; in the run, both null and the empty string became 0. Only "abc" failed. A strict string pattern with a transform is safer for money.'),
      mcq('Where should validation of API responses live in a React Native app?', [
        ['In the API module, once per endpoint, so screens get typed data', true],
        ['In every screen that renders the data, close to where it is used', false],
        ['In the backend only, because the client can trust its own server', false],
        ['In a Babel plugin, so that types are checked when the app bundles', false],
      ], 'Validating at the boundary means one schema per endpoint and no unknown values in screens. Checking in each screen repeats the work and misses some, the server cannot protect an old app from a new response, and Babel strips types rather than checking anything.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_TYPESCRIPT_DEBUGGING',
    notes: `Six faults from DabbaDash's quick-commerce tab, where a shopper picks a dark store by pincode and orders groceries.
Each has the symptom you see, the cause, and the fix. The compiler messages are real tsc output. Read the whole
message before changing anything; the last indented line is usually the one that names the cause.

## 1. A value that can only be never

**Symptom.**

    const [selected, setSelected] = useState(null);
    ...
    <Pressable onPress={() => setSelected(s)}>
    <Text>{selected?.name}</Text>

    error TS2345: Argument of type 'Store' is not assignable to parameter of type 'SetStateAction<null>'.
    error TS2339: Property 'name' does not exist on type 'never'.

**Cause.** useState(null) infers the state type as null. After the ?. removes null, nothing is left, so TypeScript
calls the type never. Both errors come from one line.

**Fix.** useState<Store | null>(null). Do not "fix" the second error with (selected as any).name; that hides the
first one too.

## 2. A web event in a phone app

**Symptom.**

    <TextInput value={query} onChangeText={e => setQuery(e.target.value)} />
    error TS2339: Property 'target' does not exist on type 'string'.

**Cause.** A web habit. onChangeText passes the text, not an event.

**Fix.** onChangeText={setQuery}. If you were copying a web form, check every handler: there is no e.target in
React Native's text and press events.

## 3. The wrong event type on onPress

**Symptom.** A long error on <Pressable onPress={(e: MouseEvent) => setSelected(s)}>. The first line is unreadable;
the last line says the event "is missing the following properties from type 'MouseEvent<Element, MouseEvent>':
altKey, button, buttons, clientX, and 14 more".

**Cause.** MouseEvent was imported from react, the DOM event type. A press on a phone has no mouse buttons.

**Fix.** If the handler does not use the event, take no parameter: onPress={() => setSelected(s)}. If it does, use
GestureResponderEvent from react-native. When a TS2322 runs to five lines, jump to the last one.

## 4. The cast that compiled

**Symptom.** No compiler error at all. After a backend release, the order screen crashes with TypeError:
order.total.toFixed is not a function.

**Cause.** const order = (await res.json()) as Order. The backend now sends total as "240.00". The cast promised a
number and nothing checked the promise.

**Fix.** Parse with a schema at the API boundary (the last lesson's getJson and OrderSchema), with a strict money
rule that turns "240.00" into 240. Then search the codebase for other as casts on network data; there are usually
more.

## 5. The new payment method that showed "undefined"

**Symptom.** Wallet payments were added. The receipt screen compiles, but shows a blank payment line for wallet
orders. Another screen, which has an exhaustiveness check, fails to compile:

    error TS2322: Type '{ method: "WALLET"; provider: string; }' is not assignable to type 'never'.

**Cause.** The receipt screen's switch ends with default: return '', which swallows any method it does not know.
The screen with the never check is doing its job.

**Fix.** Add case 'WALLET' to both, and replace the receipt's default with the never check, so the next method is
caught too. Do not "fix" the failing screen by deleting its check; that error is the most useful line in the diff.

## 6. The non-null assertion

**Symptom.** Compiles. Crashes with Cannot read properties of undefined (reading 'name') for a shopper in a pincode
the app does not serve yet.

    const store = stores.find(s => s.pincode === pincode)!;
    <Text>Delivering from {store.name}</Text>

**Cause.** The ! after find tells the compiler "this is never undefined". It was there to silence "possibly
undefined", which was the correct warning.

**Fix.** Handle the missing case as a state of the screen:

    const store = stores.find(s => s.pincode === pincode);
    if (!store) return <Text>We do not deliver to {pincode} yet.</Text>;

Treat every ! and every as in a review as a question: what makes this safe? If the answer is "the API always sends
it", the next fault is already waiting.

## A routine for any type error

Read the last line of the message; find the first error in the file and fix that one; ask whether the type or the
code is wrong (the code is wrong more often than beginners think, the type more often than seniors think); never
fix with any, as or ! without a comment that says why it is safe. Run npx tsc --noEmit again; one fix often clears
several errors.`,
    mcqs: [
      mcq('const [store, setStore] = useState(null) leads to "Property \'name\' does not exist on type \'never\'" on store?.name. What is the right fix?', [
        ['Declare the state as useState<Store | null>(null)', true],
        ['Write (store as any).name where the name is read', false],
        ['Replace store?.name with store!.name in the JSX', false],
        ['Initialise the state with an empty object, {}', false],
      ], 'The state was inferred as null, so after ?. nothing remains; the type argument says what it will hold. as any hides the setter error as well, ! asserts something false while the store is unset, and {} has no name property, so the error stays.'),
      mcq('Adding WALLET to the Payment union breaks one screen\'s build with "not assignable to type never" but not another\'s. Which screen has the bug?', [
        ['The one that compiles, because its default branch hides the new case', true],
        ['The one that fails, because its never check is wrong for open unions', false],
        ['Both of them, because a union should never be extended once it ships', false],
        ['Neither of them; the WALLET member should have been made optional', false],
      ], 'The never check is doing its job by listing a case to handle; the screen whose default returns "" will silently show nothing for wallet payments. Unions are meant to grow, and optional fields would not tell any switch about the new case.'),
      mcq('A TS2322 error on a Pressable\'s onPress runs to five lines. Which part usually names the actual cause?', [
        ['The last indented line, which names the specific mismatch', true],
        ['The first line, which is always the most specific message', false],
        ['The TS error number, which maps to one possible fix only', false],
        ['None of it, as long errors are noise to be suppressed', false],
      ], 'TypeScript prints the outer mismatch first and drills down; the final line here named the DOM MouseEvent properties a press event lacks. The first line is the general summary, an error code covers many situations, and suppressing errors hides real bugs.'),
      mcq('A reviewer finds const store = stores.find(s => s.pincode === pin)!. What should the review comment ask?', [
        ['What makes it safe; unknown pincodes return undefined here', true],
        ['Why find is used, since filter returns typed results safer', false],
        ['Whether as Store would be clearer than ! for this assertion', false],
        ['Why the pincode is a string rather than a number for find', false],
      ], 'The ! silences a correct warning, and a shopper in an unserved pincode makes find return undefined, which crashes. filter has the same problem through an empty array, as Store is the same unchecked promise in other words, and the pincode\'s type is not the issue.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_TYPESCRIPT_PRACTICE',
    notes: `Eight exercises on a bus-booking app, from easy to harder. Write your answer and run npx tsc --noEmit on it before
reading ours. Every answer below compiled with strict mode, and the ones with output were run under Jest.

## 1. Annotate a function (easy)

Delivery is free for Gold members; otherwise Rs 25 for the first 3 km and Rs 8 per started km after that.

**Answer.**

    export function deliveryFee(distanceKm: number, isGoldMember: boolean): number {
      if (isGoldMember) return 0;
      return distanceKm <= 3 ? 25 : 25 + Math.ceil(distanceKm - 3) * 8;
    }

deliveryFee(2, false), deliveryFee(5.5, false) and deliveryFee(9, true) printed 25 49 0.

## 2. Model a seat (easy to medium)

A seat has a number and a deck (lower or upper). It is available with a fare and a ladies-only flag, booked, or
blocked with a reason. Write a type where a booked seat cannot have a fare, and a label function.

**Answer.**

    export type Deck = 'LOWER' | 'UPPER';
    export type Seat =
      | { number: string; deck: Deck; state: 'AVAILABLE'; fare: number; ladiesOnly: boolean }
      | { number: string; deck: Deck; state: 'BOOKED' }
      | { number: string; deck: Deck; state: 'BLOCKED'; reason: string };

    export function seatLabel(seat: Seat): string {
      switch (seat.state) {
        case 'AVAILABLE': return \`\${seat.number} - Rs \${seat.fare}\${seat.ladiesOnly ? ' (ladies)' : ''}\`;
        case 'BOOKED': return \`\${seat.number} - booked\`;
        case 'BLOCKED': return \`\${seat.number} - \${seat.reason}\`;
      }
    }

No default is needed for the return type: the switch covers every state, and TypeScript knows it.

## 3. Narrow a messy input (medium)

A pincode arrives as a string, a number or null (from three different screens). Return a valid six-digit pincode
string or null.

**Answer.**

    export function normalisePincode(input: string | number | null): string | null {
      if (input === null) return null;
      const text = typeof input === 'number' ? String(input) : input.trim();
      return /^[1-9]\\d{5}$/.test(text) ? text : null;
    }

560001, ' 411004 ', '012345' and null gave 560001 411004 null null.

## 4. A generic helper (medium)

Write uniqueBy(items, key) that keeps the first item for each value of the given key, for any item type, and
rejects a key the type does not have.

**Answer.**

    export function uniqueBy<T, K extends keyof T>(items: readonly T[], key: K): T[] {
      const seen = new Set<T[K]>();
      return items.filter(item => {
        if (seen.has(item[key])) return false;
        seen.add(item[key]);
        return true;
      });
    }

On [{ id: 'a', n: 1 }, { id: 'a', n: 2 }, { id: 'b', n: 3 }] with 'id' it returned the first and third.

## 5. Derive the types (medium)

Given Booking { id, routeId, seats, status: 'HELD' | 'CONFIRMED' | 'CANCELLED', amount, createdAt }, write the
create payload (no id, status or createdAt), an update payload (seats and/or status), and a colour for every status.

**Answer.**

    export type BookingCreate = Omit<Booking, 'id' | 'status' | 'createdAt'>;
    export type BookingUpdate = Partial<Pick<Booking, 'seats' | 'status'>>;
    export const bookingStatusColour: Record<Booking['status'], string> = {
      HELD: '#B26A00', CONFIRMED: '#1B7F3B', CANCELLED: '#8A8A8A',
    };

Booking['status'] reads the union out of the interface, so a new status forces a new colour.

## 6. Type a wrapped component (medium)

A SeatButton takes a seat and a selected flag, plus every Pressable prop except children, and is disabled for any
seat that is not available.

**Answer.**

    type SeatButtonProps = Omit<PressableProps, 'children'> & { seat: Seat; selected: boolean };
    export function SeatButton({ seat, selected, disabled, ...rest }: SeatButtonProps) {
      return (
        <Pressable accessibilityRole="button" accessibilityState={{ selected }}
          disabled={disabled || seat.state !== 'AVAILABLE'} {...rest}>
          <Text>{seatLabel(seat)}</Text>
        </Pressable>
      );
    }

## 7. A typed reducer (harder)

A passenger form has name, phone, submitting and error. Actions: edit a field (name or phone only), submit, failed
with a message.

**Answer.**

    type FormState = { name: string; phone: string; submitting: boolean; error: string | null };
    type FormAction =
      | { type: 'edit'; field: 'name' | 'phone'; value: string }
      | { type: 'submit' }
      | { type: 'failed'; error: string };
    function formReducer(s: FormState, a: FormAction): FormState {
      switch (a.type) {
        case 'edit': return { ...s, [a.field]: a.value, error: null };
        case 'submit': return { ...s, submitting: true };
        case 'failed': return { ...s, submitting: false, error: a.error };
      }
    }

field: 'name' | 'phone' means dispatch({ type: 'edit', field: 'submitting', value: 'x' }) is a compile error.

## 8. Validate a response (harder)

A PNR status API returns a ten-digit PNR, the train number, chartPrepared, and one or more passengers with a name,
a status of CNF, RAC or WL, and a coach and berth that are null until allotted. Write the schema and the type.

**Answer.**

    export const PnrSchema = z.object({
      pnr: z.string().regex(/^\\d{10}$/),
      trainNumber: z.string(),
      passengers: z.array(z.object({
        name: z.string(),
        status: z.enum(['CNF', 'RAC', 'WL']),
        coach: z.string().nullable(),
        berth: z.number().int().nullable(),
      })).min(1),
      chartPrepared: z.boolean(),
    });
    export type PnrStatus = z.infer<typeof PnrSchema>;

A response with pnr '45217', chartPrepared 'no' and no passengers failed with three issues:

    ✖ Invalid string: must match pattern /^\\d{10}$/
      → at pnr
    ✖ Too small: expected array to have >=1 items
      → at passengers
    ✖ Invalid input: expected boolean, received string
      → at chartPrepared

The train number stays a string even though it looks numeric: you never do arithmetic on it, and some have a
leading zero.`,
    mcqs: [
      mcq('In exercise 2, why does seatLabel compile without a default branch or a final return?', [
        ['The switch handles every state, so TypeScript knows no path is left', true],
        ['Functions returning string may end without a value under strict mode', false],
        ['TypeScript adds return \'\' automatically at the end of every switch', false],
        ['The Seat union is a type alias, which is never checked for returns', false],
      ], 'With all three literals handled, the switch is exhaustive and control cannot reach the end. Under strict mode a missing return on a string function is an error, TypeScript adds nothing at runtime, and aliases are checked the same way as interfaces.'),
      mcq('Why is uniqueBy written with K extends keyof T rather than key: string?', [
        ['So a key the item type lacks is a compile error and item[key] is typed', true],
        ['Because a Set can only hold values typed with a generic parameter', false],
        ['Because string keys cannot index objects when strict mode is on', false],
        ['So the function is faster, as keyof is resolved at runtime once', false],
      ], 'keyof limits the key to real fields and gives item[key] the type T[K]. A Set can hold any type, string keys can index objects through an index signature, and keyof exists only at compile time, so it affects no speed.'),
      mcq('Exercise 5 types the colour map as Record<Booking[\'status\'], string>. What happens when WAITLISTED is added to the status union?', [
        ['The colour map fails to compile until WAITLISTED gets a colour', true],
        ['WAITLISTED is given the colour of the first status automatically', false],
        ['Nothing, because Record only checks the keys that already exist', false],
        ['The Booking interface rejects the new status as a duplicate key', false],
      ], 'A Record over a union requires every member as a key, so the missing colour is reported (TS2741). Nothing is filled in automatically, Record checks all members, and adding a literal to the status union is an ordinary change to Booking.'),
      mcq('Exercise 3 receives a pincode as string | number | null. Which check narrows it to string in the else branch of typeof input === \'number\'?', [
        ['The null check returning early above it', true],
        ['The regular expression test at the end', false],
        ['The String() call in the number branch', false],
        ['The trim() call that comes afterwards on the text', false],
      ], 'After if (input === null) return null, the type is string | number; the typeof check then splits it, leaving string in the else branch. The regex test runs on the text afterwards, String() converts a value and narrows nothing, and trim() needs a string already.'),
      mcq('Why does exercise 8 keep coach as z.string().nullable() rather than z.string().optional()?', [
        ['The API always sends coach, with null until a coach is allotted', true],
        ['nullable accepts both null and a missing key, unlike optional', false],
        ['optional cannot be used inside an array of objects in zod', false],
        ['nullable converts null to an empty string for the screen', false],
      ], 'The brief says the field is present and null until allotted, which is what nullable describes. nullable does not accept a missing key, optional works anywhere in a schema, and nullable passes null through rather than converting it.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_TYPESCRIPT_INTERVIEW_QUESTION',
    notes: `Four questions React Native interviews ask about TypeScript, at product companies, start-ups and service
companies alike, with an answer that scores well and the follow-up a good interviewer asks next. Say them aloud;
about two minutes each. Interviewers listen for an example from your own code, so replace DabbaDash with an app you
built.

## Q1. "What is the difference between an interface and a type alias? Which do you use?"

**Model answer.** "Both can describe an object shape, and for that they are almost interchangeable. A type alias
can also name unions, tuples and literal types, which an interface cannot: my order status is a type, 'PLACED' |
'PREPARING' and so on, and my Payment is a discriminated union, so that is a type too. An interface can be
extended with extends, and two interface declarations with the same name merge, which libraries use so you can add
fields to their types. In my projects I follow one rule, interface for object shapes and type for everything else,
because consistency matters more than which one."

**Follow-up.** "When would declaration merging bite you?" — "When two declarations of the same interface name share a
scope - the same file, a global declarations file, or a declare global block - they merge silently instead of
erroring, so you get a type with fields from both. (Files with import or export are separate modules, so their
interfaces do not merge.) With type aliases a duplicate name in one scope is an error. That is one reason some
teams use type for everything."

## Q2. "What is the difference between any and unknown? And what does as do?"

**Model answer.** "any switches type checking off for that value and everything it touches. unknown means 'I do not
know yet': you cannot use it until you narrow it, with typeof, instanceof, a type guard or a schema. So for anything
coming from outside, like res.json() or JSON.parse, I assign it to unknown and validate it. as is a type assertion:
it tells the compiler to treat a value as a type and checks nothing at runtime, because types are erased. In my
food-delivery app, an as Order on a response was the cause of a crash when the backend changed total to a string;
we replaced it with a zod schema."

**Follow-up.** "Is there any good use of as?" — "Rarely, and with a comment. as const, which is different, makes a
literal readonly and narrow, and I use that for tuples returned from hooks and for constant lists. A real assertion
is acceptable where I know more than the compiler and can say why, for example narrowing after a check TypeScript
cannot follow. Never on network data."

## Q3. "How do you make sure the data from your API matches your TypeScript types?"

**Model answer.** "The types alone cannot, since they are erased. I validate at the boundary: each endpoint in the API
module has a zod schema, the TypeScript type is z.infer of the schema, so they cannot drift, and a shared getJson
does fetch, status check, safeParse, and throws a typed error. Screens only ever see validated data. For lists I
validate per item, so one bad record does not blank the screen. On mobile this matters more than on web, because
old app versions keep running against the new API, so the client has to survive changes."

**Follow-up.** "Does that not slow the app down?" — "Parsing a response is small next to the network call itself,
but I would not validate a huge list item by item on a low-end phone without measuring it. If profiling showed it
mattered, I would validate only the fields the screen uses. I have not needed to."

## Q4. "Explain generics with an example from your code."

**Model answer.** "A generic is a function or type that takes a type as a parameter, so it works for many types while
keeping the link between input and output. My example is a useAsync<T> hook: it takes a function returning
Promise<T> and returns a state that is loading, error, or success with data of type T. On the slots screen T is
inferred as Slot[], so state.data is typed without me writing anything. Constraints narrow it down when the code
needs something from T; my keyById<T extends { id: string }> only accepts items with an id. And I use the built-in
generic utility types, Omit<Order, 'id'> for the create payload, so derived types stay in step."

**Follow-up.** "When should you not use a generic?" — "When the type parameter appears only once. Then it links
nothing and is just a harder way to write unknown. And when one concrete type is all the code ever handles."`,
    mcqs: [
      mcq('An interviewer asks why you validate API responses when your app is fully typed. Which answer shows the best understanding?', [
        ['Types are erased, so only a runtime check can catch a changed response', true],
        ['Validation is needed only until the team turns on TypeScript strict mode', false],
        ['It is a backend responsibility; the client validates only for logging', false],
        ['The compiler checks responses, but validation gives nicer error messages', false],
      ], 'The type describes what the code expects and nothing enforces it at runtime, so a schema is the only defence when the API changes. Strict mode is compile-time only, the server cannot protect old clients from new responses, and the compiler never sees response data.'),
      mcq('Asked "is there any good use of as?", which answer is strongest?', [
        ['as const for literal tuples, and rare commented assertions, never on network data', true],
        ['Yes, on every API response, because it documents what the server will return', false],
        ['No, as is deprecated in recent TypeScript and fails under strict mode', false],
        ['Yes, whenever the compiler reports an error that seems to be a false alarm', false],
      ], 'as const is a different, safe tool, and a real assertion is acceptable only where you can explain why it holds. Casting API responses is the classic crash, as is not deprecated, and using it to silence errors hides the bugs the compiler found.'),
      mcq('Which example best answers "explain generics" in an interview?', [
        ['A useAsync<T> hook whose data type is inferred from the loader', true],
        ['A function that takes any and returns any for flexibility', false],
        ['An interface that lists every possible field as optional', false],
        ['A type alias for a union of string literal status values', false],
      ], 'A generic hook shows a type parameter linking input to output, with inference at the call site. any is the opposite of a generic, an all-optional interface is just a loose type, and a literal union is a union, not a generic.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_TYPESCRIPT_CHECKPOINT',
    notes: `Ten questions across the topic: what the compiler checks and what it cannot, interfaces, unions and narrowing,
generics and utility types, typed components, hooks and events, and validating API data. Answer without notes; the
result shows which lesson to revisit.`,
    checkpoint: [
      mcq('A CI job runs npx expo export to build the bundle, and type errors keep reaching the main branch. What should be added?', [
        ['A step that runs npx tsc --noEmit and fails the job on errors', true],
        ['A Babel option that turns type errors into bundling failures', false],
        ['A Hermes flag that checks the types when the bundle is loaded', false],
        ['Nothing, since exporting the bundle already type-checks files', false],
      ], 'Bundling goes through Babel, which strips types without checking, so only tsc catches type errors. Babel has no such option, Hermes runs plain JavaScript and never sees types, and a successful export says nothing about them.'),
      mcq('What type does TypeScript give vada in const vada = menu.find(m => m.name === \'Vada\'), where menu is MenuItem[]?', [
        ['MenuItem | undefined', true],
        ['MenuItem', false],
        ['MenuItem[]', false],
        ['MenuItem | undefined | null', false],
      ], 'find returns the first match or undefined when nothing matches, and its type says so, which is why vada.price is an error until it is checked. It returns one element rather than an array (that is filter), and it uses undefined alone, never null.'),
      mcq('Which design makes "showing a rider for an order that has none" impossible to write?', [
        ['A union with a status member that carries the rider only when assigned', true],
        ['One object type in which every field is optional, including the rider', false],
        ['An interface with rider: Rider and a separate boolean field hasRider', false],
        ['An object type with rider typed as any so it can hold a rider or not', false],
      ], 'In a discriminated union the rider exists only on the member where it is real, so reading it elsewhere does not compile. All-optional fields and a separate boolean both allow contradictory states, and any removes the check entirely.'),
      mcq('After adding a REFUNDED status, which line makes the compiler list every switch that does not handle it?', [
        ['const unreachable: never = status; in the default branch', true],
        ['default: return status; at the end of every single switch', false],
        ['// @ts-expect-error placed above every switch on the status', false],
        ['A REFUNDED entry added to a constant array of known statuses', false],
      ], 'An unhandled REFUNDED cannot be assigned to never, so each incomplete switch fails with TS2322. Returning the status compiles for any value, @ts-expect-error suppresses errors rather than producing them, and an array of values does not affect switches.'),
      mcq('An address form sends only the fields the user changed, out of line1, landmark and pincode. Which type fits that payload?', [
        ['Partial<Pick<Address, \'line1\' | \'landmark\' | \'pincode\'>>', true],
        ['Pick<Address, \'line1\' | \'landmark\' | \'pincode\'>', false],
        ['Omit<Partial<Address>, \'line1\' | \'landmark\' | \'pincode\'>', false],
        ['Record<\'line1\' | \'landmark\' | \'pincode\', string | null>', false],
      ], 'Pick limits the payload to the three editable fields and Partial lets any of them be left out. Plain Pick requires all three, the Omit version removes exactly the editable fields, and a Record requires every key, null or not.'),
      mcq('Why is function first<T>(items: T[]): T | undefined better than function first(items: any[]): any?', [
        ['The caller gets back the element type it passed in, still checked', true],
        ['Generic functions run faster because the engine knows the type', false],
        ['any[] parameters are not allowed at all when strict mode is on', false],
        ['The generic version also checks the array\'s contents at runtime', false],
      ], 'T links input and output, so first of a string array is string | undefined and misuse is caught. Types are erased, so speed and runtime checking are unchanged, and strict mode forbids implicit any, not an explicit any[] annotation.'),
      mcq('const [slots, setSlots] = useState([]) is followed by setSlots(data) where data is Slot[]. What does tsc report, and why?', [
        ['Slot is not assignable to never, as [] was inferred as never[]', true],
        ['Nothing, because useState accepts any value for an empty array', false],
        ['useState requires an explicit return type on every component', false],
        ['Slot[] cannot be state because arrays must be stored in a ref', false],
      ], 'An empty array literal gives inference nothing, so the state type is never[] and useState<Slot[]>([]) fixes it. useState does not fall back to any here, components need no return type, and arrays are ordinary state.'),
      mcq('A developer types an onPress handler as (e: React.MouseEvent) => void on a Pressable. What is wrong?', [
        ['React Native presses use GestureResponderEvent, not DOM mouse events', true],
        ['onPress handlers must always be wrapped in useCallback to compile', false],
        ['Handlers must return a boolean to tell Pressable the press was used', false],
        ['The event must be typed any because native events have no types', false],
      ], 'MouseEvent is the web DOM event and lacks what a press provides, so tsc reports TS2322; React Native exports GestureResponderEvent. useCallback is optional, onPress ignores any return value, and native events are fully typed.'),
      mcq('Which statement about zod\'s z.infer is correct?', [
        ['It gives the type of the parsed data, so the schema is the one definition', true],
        ['It checks a value at runtime and returns true when the value is valid', false],
        ['It converts a TypeScript interface into a schema that can validate incoming data', false],
        ['It returns the input type before any transform or coercion has run', false],
      ], 'z.infer is the output type derived from the schema, which keeps type and validation in step. Runtime checking is parse or safeParse, zod cannot read interfaces because they are erased, and the pre-transform type is z.input.'),
      mcq('An order API may soon add new status values that old app versions do not know. Which approach is most honest about what the app can show?', [
        ['Agree new values ship only after the app handles them, and test unknowns', true],
        ['Type the status as string so that any new value parses without failing', false],
        ['Cast the response with as Order so that the new values are accepted', false],
        ['Coerce unknown values into DELIVERED so the screen always shows something', false],
      ], 'Old builds stay installed, so the contract with the backend and a tested fallback decide what users see. A plain string loses the checked union, a cast checks nothing, and mapping unknown values to DELIVERED tells a customer something false about their order.'),
    ],
  },
];
