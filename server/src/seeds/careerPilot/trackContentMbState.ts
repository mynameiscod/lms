/**
 * Career-track content: State, Server Data and Forms (MB_STATE_DATA), Mobile, batch MB2.
 *
 * Where each piece of a React Native app's state belongs, global client state with Zustand and Redux Toolkit
 * (selectors, persisting with versions and migrations), server data with TanStack Query (keys, staleness, focus and
 * reconnect on a phone, optimistic updates with rollback, infinite lists), forms with react-hook-form and zod, and a
 * feature-folder codebase with custom hooks as the seam. It builds on the Java/Python full-stack React topic ("When
 * Component State Is Not Enough", "Redux Toolkit: Store, Slices and Actions", "Server Data with createAsyncThunk"),
 * Year 3's "Where a Value Should Live", "Server State Is Not Client State", "Do Not Store What You Can Compute",
 * "Validate on the Client for Kindness, the Server for Correctness" and "State That Survives a Rotation", and this
 * track's "Typing API Data and Runtime Validation"; those are referred to by title, not re-taught. Storage engines
 * (AsyncStorage, MMKV), the full API layer with tokens, and offline outboxes come later in this track.
 *
 * One fictional app runs through the topic: DabbaDash, a Pune food-delivery app (restaurants by cuisine, a cart,
 * favourites, an order history, a delivery-address form). Every output quoted is real output from Jest 30 with
 * jest-expo and @testing-library/react-native 13 on React 19.3 / React Native 0.88, running zustand 5,
 * @reduxjs/toolkit 2, @tanstack/react-query 5, react-hook-form 7, zod 4 and @hookform/resolvers 6 against a mocked
 * fetch; the shown TypeScript was checked with tsc in strict mode. Not run: anything on a device or emulator, so
 * AppState/NetInfo wiring, keyboard avoidance and autofill behaviour are written from the React Native, Expo and
 * TanStack Query documentation and say so; AsyncStorage itself was not installed, so persistence was run against an
 * in-memory storage object with the same async interface.
 *
 * Skills: STATE_MANAGEMENT by default; ARCHITECTURE is REACT_NATIVE, and checkpoint questions elsewhere that are
 * plainly about codebase structure use ck('REACT_NATIVE', ...).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_MB_STATE_DATA_BUNDLES: PilotBundle[] = [
  /* ── STATE_CHOICES ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_STATE_DATA_STATE_CHOICES',
    notes: `Open DabbaDash, a food-delivery app in Pune, and count what it is remembering on one screen: the text in the
search box, the "South Indian" chip that is selected, the list of restaurants, the hearts on your favourites, the
cart badge saying 3, the signed-in user, dark mode, and the fact that you are on the Home tab with a restaurant page
pushed on top. Each of those is state. The bugs in most React Native apps are not in the code that changes a value;
they are in where that value was put.

You decided "where does a value live" in Year 3 ("Where a Value Should Live") and saw the store ladder in "When
Component State Is Not Enough". This lesson applies that to a phone, where three things are different: screens stay
mounted in a navigation stack, the app is backgrounded and killed without warning, and every unnecessary re-render
runs on the JavaScript thread of a mid-range Android phone that also has to keep scrolling smooth.

## Four kinds of state

- **Local UI state.** The search text, whether a bottom sheet is open, which accordion is expanded. One component
  needs it. useState in that component; nothing more.
- **Shared client state.** The cart, the session, settings such as language and theme. Your app owns it, many
  screens read it, several write it. This is where Context or a store earns its place.
- **Server state.** Restaurants, menus, orders, favourites. The truth is on DabbaDash's server; what the phone holds
  is a cached copy that goes stale ("Server State Is Not Client State"). It needs loading, error, refetch and
  invalidation, which is why it goes in a query cache (TanStack Query, two lessons on), not in a store.
- **Navigation state.** Which tab, which screens are stacked, the params of each. It belongs to the router
  (React Navigation or Expo Router). Put an id in a route param, never the whole object:

    router.push({ pathname: '/restaurant/[id]', params: { id: restaurant.id } });   // yes
    // not params: { restaurant: JSON.stringify(restaurant) } - a frozen snapshot, and a deep link only has the id

The restaurant screen then reads the restaurant from the query cache by id, so it is never staler than the cache,
and a link from a WhatsApp share opens the same screen.

Two more questions cut across all four: **must it survive the app being killed?** (settings and a half-filled cart:
yes, persist them; the search text: no) and **is it derived?** A total, a count, "is the cart empty" are computed
from other state, never stored next to it.

## The ladder, on a phone

1. useState in the component that uses it.
2. Lift it to the nearest common parent when two siblings need it.
3. Context for values that are read in many places but **change rarely**: the theme, the locale, the signed-in user.
4. A store (Zustand, Redux Toolkit) for client state that changes often and is read and written by distant screens.
5. A query cache for everything that came from the server.

Skipping straight to step 4 for everything is the most common over-engineering in fresher code; putting a fast-
changing cart into one big Context is the most common performance bug.

## What Context really costs

Every component that calls useContext re-renders whenever the provider's value changes, even if the part it reads
did not change, and even if it is wrapped in memo. DabbaDash put the cart count, the add function and the city in
one context, and three memoised components read it. After three taps on Add, a render counter printed:

    one context {"CityHeader":4,"CartBadge":4,"AddButton":4}

The city header never changed but rendered four times (one mount plus three taps). Two causes: the value object
{ cartCount, addToCart, city } is a new object on every provider render, and everything sits in one context. The
fix splits by how often things change and memoises the actions object:

    const actions = useMemo(() => ({ addToCart: () => setCartCount(c => c + 1) }), []);
    <CityContext.Provider value="Pune">
      <CartActionsContext.Provider value={actions}>
        <CartCountContext.Provider value={cartCount}>{children}</CartCountContext.Provider>
      </CartActionsContext.Provider>
    </CityContext.Provider>

    split contexts {"CityHeader":1,"CartBadge":4,"AddButton":1}

That works, but you now maintain three providers for one cart. When a piece of client state changes often and many
components each need a different slice of it, a store with **selectors** (each component subscribes to exactly the
value it reads) is less code and re-renders less. That is the next lesson.

## Do not store what you can compute, again

A basket kept items and a separate total, updated by hand in the "add lassi" handler. Then someone added a "make it
two thalis" button that changed quantity and forgot the total:

    Stored total: 240 | Computed total: 420

The fix is to delete the total state and compute items.reduce((s, x) => s + x.price * x.qty, 0) during render.
For a cart of ten lines that is nothing; reach for useMemo only when a profiler says the computation is slow.

## Common mistakes

- Copying a query's data into useState or a store "to edit it", so the copy never sees a refetch. Edit in a form's
  own state and write back with a mutation.
- One AppContext holding the cart, the user and the theme, so a cart tap re-renders the whole tree.
- Passing objects through route params, and then a screen showing a price the restaurant changed an hour ago.
- Keeping a value in global state "because it might be needed later". Move it up when a second reader appears.
- Forgetting that a screen under the current one in a stack is still mounted: its effects and subscriptions keep
  running, and its local state is still there when the user comes back. That is usually what you want.`,
    workedExample: `**Scenario.** DabbaDash's checkout screen is being rebuilt. List every value on it and say where it lives.

**The values.** Delivery address chosen, the cart lines, the bill total, the coupon code typed, whether the coupon
applied, the payment method (UPI, card, cash), "Placing order..." while the request is in flight, the order id
returned, the user's saved addresses, and the tip amount selected.

**Reasoning, one by one.**

- **Cart lines**: shared client state. The restaurant screen adds to it, the cart badge on every tab reads it, and
  it must survive the app being killed while the user switches to the UPI app. A persisted store.
- **Bill total**: derived from cart lines, coupon discount and tip. Computed in render or in a selector, never
  stored. Storing it is how the "240 versus 420" bug happens.
- **Saved addresses**: server state, the user can edit them on the website too. A query keyed ['addresses'].
- **Address chosen**: belongs to this checkout. Local state on the screen, defaulting to the user's default
  address from the query. If the user goes to "Add new address" and comes back, the checkout screen is still
  mounted in the stack, so local state survives.
- **Coupon text typed**: local form state. **Coupon applied and its discount**: the server decides (it validates
  WELCOME50 against this user), so the result of a mutation, shown from the mutation's data.
- **Payment method and tip**: local to checkout. Remembering "last used UPI" across launches is a persisted setting
  in the settings store, which the screen reads as its default.
- **Placing order...**: the mutation's isPending. Not a separate boolean you set and forget to reset on error.
- **Order id**: navigation. On success, router.replace({ pathname: '/order/[id]', params: { id } }); the tracking
  screen loads the order by id. Replace, not push, so Back does not return to a paid checkout.

**Result.** One persisted store (cart, settings), two queries (addresses, and later the order), one mutation each
for coupon and placing the order, and four local values. No context was needed at all, and nothing is stored twice.`,
    mcqs: [
      mcq('DabbaDash keeps the cart count, an addToCart function and the user\'s city in one context, and the city header re-renders on every cart tap even though it is wrapped in memo. Why does memo not help?', [
        ['A component that reads a context re-renders when the provider value changes, memo or not', true],
        ['memo only compares props by reference, so it cannot help a component that takes no props', false],
        ['memo is disabled in React Native development builds, so the header renders every time', false],
        ['The city string is recreated on every render, so memo sees a different prop each time', false],
      ], 'memo skips a re-render caused by a parent when props are equal, but a context consumer is re-rendered directly by React whenever the provider value changes, and here the value object is new on every render. memo with no props would still skip parent-driven renders, it is not disabled in development, and the city is a context value, not a prop.'),
      mcq('A restaurant list navigates to the detail screen with params: { restaurant: JSON.stringify(item) }. What is the strongest reason to pass only the id?', [
        ['The detail screen then reads current data by id, and a deep link carries only an id anyway', true],
        ['Route params are limited to 256 characters on Android, so a restaurant object is cut off', false],
        ['React Navigation refuses to push a screen whose params contain any JSON-encoded string', false],
        ['Passing an object makes the list screen unmount, which loses its scroll position on Back', false],
      ], 'A serialised object is a snapshot that goes stale, and a link opened from outside the app can only carry the id, so the screen must be able to load by id anyway. There is no 256-character rule, strings are allowed in params, and pushing a screen does not unmount the one beneath it.'),
      mcq('Which DabbaDash value is the best candidate for a plain React Context rather than a store or a query?', [
        ['The colour theme chosen in settings, read by most screens and changed rarely', true],
        ['The cart, which several screens write to and the badge reads on every tap', false],
        ['The restaurant list, which comes from the server and must refetch when stale', false],
        ['The search text in the home screen\'s search box, which changes per keystroke', false],
      ], 'Context suits values read widely that change rarely, so the re-render it causes is rare too. A fast-changing cart in Context re-renders every consumer on each tap, server data needs a cache with refetching, and the search text is local to one component.'),
    ],
    checkpoint: [
      mcq('A basket screen keeps items in one useState and the bill total in another, updating the total in each handler. A new "change quantity" button shows 240 while the items add up to 420. What is the right fix?', [
        ['Delete the total state and compute it from the items during render', true],
        ['Add setTotal to the new button handler so both values stay in step', false],
        ['Move both values into a Redux slice so that one reducer updates them', false],
        ['Wrap the total in useMemo so that it is recalculated after each change', false],
      ], 'The total is derived, so storing it creates a second source of truth that every future handler must remember to update. Patching one handler leaves the trap for the next one, a slice can still store a stale total, and useMemo over a stored state value does not compute anything new.'),
      mcq('Which piece of DabbaDash state should be in a query cache rather than in a Zustand store?', [
        ['The list of restaurants delivering to the user\'s pincode', true],
        ['The items in the cart before the order has been placed by the user', false],
        ['Whether the user prefers Hindi or English in the app', false],
        ['Whether the filter bottom sheet is currently open', false],
      ], 'The restaurant list belongs to the server and goes stale, so it needs a cache that knows about loading, errors and refetching. The cart and the language are client state the app owns, and the bottom sheet is local UI state.'),
      mcq('A user fills half the cart, switches to their UPI app to check the balance, and Android kills DabbaDash in the background. Which state should still be there when they come back?', [
        ['The cart lines, which should be persisted to storage on the device', true],
        ['The text they had typed into the restaurant search box on the Home tab', false],
        ['The loading spinner state of the request that was in flight then', false],
        ['The scroll offset of every list in every tab they had visited', false],
      ], 'Losing a cart costs the business an order, so cart state is persisted. Search text and scroll offsets are cheap to lose and are not worth persisting, and an in-flight request\'s loading state is meaningless after the process died; the request will be made again.'),
    ],
  },
  /* ── ZUSTAND_REDUX ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_STATE_DATA_ZUSTAND_REDUX',
    notes: `You built a Redux Toolkit store with slices, useSelector and useDispatch in "Redux Toolkit: Store, Slices and
Actions". In React Native the same library works unchanged. Many mobile teams, especially startups, use Zustand
instead: a few lines, no provider, and the same selector idea. You should be able to read and write both, because
the job you join will have picked one already.

## A Zustand store

DabbaDash's cart, typed:

    import { create } from 'zustand';

    type Line = { id: string; name: string; price: number; qty: number };
    type CartState = {
      lines: Line[];
      coupon: string | null;
      add: (item: Omit<Line, 'qty'>) => void;
      remove: (id: string) => void;
      applyCoupon: (code: string) => void;
    };

    export const useCart = create<CartState>()(set => ({
      lines: [],
      coupon: null,
      add: item => set(s => {
        const found = s.lines.find(l => l.id === item.id);
        return { lines: found
          ? s.lines.map(l => (l.id === item.id ? { ...l, qty: l.qty + 1 } : l))
          : [...s.lines, { ...item, qty: 1 }] };
      }),
      remove: id => set(s => ({ lines: s.lines.filter(l => l.id !== id) })),
      applyCoupon: code => set({ coupon: code }),
    }));

create<CartState>()(...) with the extra () is the documented TypeScript form. set merges the object you return
into the state (one level deep). Actions live in the store, so components never need a dispatch.

## Selectors decide who re-renders

A component subscribes with a selector, and re-renders only when the selected value changes (compared with
Object.is). Three components, three ways of reading, then two adds and a coupon:

    const s = useCart();                                            // WholeStore
    const c = useCart(s => s.coupon);                               // CouponLabel
    const n = useCart(s => s.lines.reduce((a, l) => a + l.qty, 0)); // ItemCount

    zustand renders {"WholeStore":4,"CouponLabel":2,"ItemCount":3}

The whole-store reader rendered on every change. The coupon label rendered on mount and once for the coupon. The
count rendered on mount and twice for the adds, but not for the coupon, because its number did not change. That is
the Context problem from the last lesson solved without splitting anything.

**The trap.** A selector that builds a new object returns a different reference every time:

    const { lines, coupon } = useCart(s => ({ lines: s.lines, coupon: s.coupon }));

In Zustand 5 this does not just over-render; it loops. The real run:

    console.error: The result of getSnapshot should be cached to avoid an infinite loop
    thrown: Maximum update depth exceeded. This can happen when a component repeatedly calls setState ...

Pick values one at a time, or wrap the selector in useShallow, which compares the object's fields shallowly:

    import { useShallow } from 'zustand/react/shallow';
    const { lines, coupon } = useCart(useShallow(s => ({ lines: s.lines, coupon: s.coupon })));

## Never mutate

    useCart.setState(s => { s.lines.push(chai); return s; });   // same object back
    after push, screen shows: count 0 | store has 1

Zustand saw the same state object, so nobody was told. Return new arrays and objects, as the add action does. If
nested spreads get painful, the immer middleware lets you write mutating code that produces new objects, the way
Redux Toolkit reducers do.

## The same cart in Redux Toolkit

    const cartSlice = createSlice({
      name: 'cart',
      initialState: { lines: [] as Line[], coupon: null as string | null },
      reducers: {
        added(state, action: PayloadAction<Omit<Line, 'qty'>>) {
          const found = state.lines.find(l => l.id === action.payload.id);
          if (found) found.qty += 1; else state.lines.push({ ...action.payload, qty: 1 });
        },
        couponApplied(state, action: PayloadAction<string>) { state.coupon = action.payload; },
      },
    });

Reducers are pure functions you can test with no React at all. Run twice on the same item:

    rtk state {"lines":[{"id":"p1","name":"Paneer roll","price":120,"qty":2}],"coupon":null} same object? false before qty 1
    action {"type":"cart/couponApplied","payload":"WELCOME50"}

The "mutation" inside the reducer was turned into a new state by Immer; the old state still says qty 1. Outside a
reducer the state is frozen in development: assigning lines[0].qty = 5 did nothing (Object.isFrozen was true, qty
stayed 1). In the app, wrap the root in <Provider store={store}> exactly as on the web.

## Persisting: settings that survive a restart

Zustand's persist middleware saves chosen fields to a storage you supply. In an Expo app that is usually
AsyncStorage or MMKV ("Key-Value Storage" later in this track). Give it a **version** and a **migrate** function
from the first release, because your state shape will change:

    export const useSettings = create<Settings>()(persist(set => ({
      language: 'en', theme: 'system', setLanguage: language => set({ language }),
    }), {
      name: 'settings',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: s => ({ language: s.language, theme: s.theme }),   // never functions, never tokens
      migrate: (old: any, from) => from === 0
        ? { language: old.lang, theme: old.darkMode ? 'dark' : 'light' } : old,
    }));

Run against an in-memory storage seeded with what version 0 wrote ({"lang":"hi","darkMode":true}):

    after rehydrate: hi dark hydrated: true
    on disk: {"state":{"language":"ta","theme":"dark"},"version":1}

With an async storage the first render uses the defaults and hydration finishes a moment later, so gate the first
screen on useSettings.persist.hasHydrated() (or onFinishHydration) behind the splash screen, or the app flashes
English before switching to Hindi. Tokens do not go here; they go in SecureStore.

## Choosing

- **Zustand**: small and medium apps, little ceremony, no provider, easy to adopt screen by screen.
- **Redux Toolkit**: large teams that want one enforced pattern, Redux DevTools time travel, middleware, and RTK
  Query if they do not use TanStack Query.
- **Either way**, server data does not go in it. A store full of restaurants with isLoading flags is the
  createAsyncThunk pattern you already know; the next lesson shows why a query cache replaces it on mobile.`,
    workedExample: `**Scenario.** DabbaDash's cart tab is janky on a budget Android phone: typing a delivery instruction drops frames.
The cart screen reads the store like this:

    const { lines, coupon, instructions, setInstructions, remove } = useCart();

and the instruction box writes to the store on every keystroke.

**Step 1: measure, do not guess.** A render counter (or the React DevTools profiler) on the line rows shows every
row re-rendering on every keystroke, because the screen reads the whole store and passes new props down.

**Step 2: ask where the instructions belong.** They are typed on this screen and sent with the order. That is local
form state, not global state. Move them to useState in the instructions component (or the checkout form), and the
store no longer changes on each keystroke at all.

**Step 3: select narrowly.** The screen becomes:

    const lines = useCart(s => s.lines);
    const remove = useCart(s => s.remove);

Actions are stable references in Zustand, so selecting remove never causes a render. Each row is a memo component
taking line and onRemove, so a quantity change re-renders one row and the summary.

**Step 4: derive the summary inside a selector.**

    const itemCount = useCart(s => s.lines.reduce((a, l) => a + l.qty, 0));

A number compares cheaply with Object.is; the badge re-renders only when the count changes.

**Step 5: check the trap.** Someone suggests useCart(s => ({ lines: s.lines, coupon: s.coupon })) to "tidy it up".
In Zustand 5 that throws "Maximum update depth exceeded"; if they want the object form it must be wrapped in
useShallow.

**Result.** Keystrokes touch one component; a quantity change re-renders one row and the total. The rule you apply
in every store review: select the smallest value you need, and keep fast-changing local input out of global state.`,
    mcqs: [
      mcq('A DabbaDash component reads const n = useCart(s => s.lines.length). Which change makes it re-render?', [
        ['Adding a new restaurant item to the cart lines', true],
        ['Applying the WELCOME50 coupon to the cart', false],
        ['Increasing the quantity of a line already there', false],
        ['Any call to set, whatever field it changes', false],
      ], 'A Zustand selector re-renders the component only when its result changes by Object.is. A new line changes the length; the coupon and a quantity bump leave the length the same, and set calls that do not change the selected value do not re-render.'),
      mcq('After upgrading to Zustand 5, a screen using useCart(s => ({ total: s.total, count: s.count })) crashes with "Maximum update depth exceeded". What is the fix?', [
        ['Wrap the selector in useShallow, or select total and count separately', true],
        ['Downgrade to Zustand 4, where object selectors were always supported', false],
        ['Add the screen\'s props to the selector so it gets a stable dependency', false],
        ['Move the hook call into a useEffect so it runs after the first render', false],
      ], 'The selector returns a new object each call, so the external-store snapshot never looks stable and React loops; useShallow compares fields, and separate selectors return primitives. Downgrading hides a real over-render, props do not stabilise a new object, and hooks cannot be called inside an effect.'),
      mcq('The settings store persisted {"lang":"hi","darkMode":true} in version 0. Version 1 renames them to language and theme. What makes old users keep their settings?', [
        ['Set version: 1 and a migrate function that maps the version 0 fields', true],
        ['Change the storage name so the new shape starts clean on every phone', false],
        ['Add the old fields to partialize so both shapes are saved side by side', false],
        ['Clear storage on launch whenever the app version number has increased', false],
      ], 'persist stores the version with the state and calls migrate with the old state and its version, so mapping lang to language keeps the user\'s choice. A new storage name or clearing storage throws their settings away, and saving both shapes never converts the old data.'),
    ],
    checkpoint: [
      mcq('Inside a Zustand action, a developer writes set(s => { s.lines.push(item); return s; }). The store has the item but the cart badge still shows the old count. Why?', [
        ['The same state object came back, so Zustand saw no change to report', true],
        ['set only accepts a plain object, so the updater function was ignored', false],
        ['push is asynchronous in Hermes, so the badge reads before it finishes', false],
        ['The badge needs useShallow before it can see changes made inside arrays', false],
      ], 'Zustand compares the new state with the old by reference; returning the mutated original means no change is detected and no subscriber runs. set does accept an updater function, push is synchronous, and useShallow would compare the same mutated array and also see no change.'),
      mcq('What does Redux Toolkit\'s createSlice do with state.lines.push(item) written inside a reducer?', [
        ['Immer records the change and produces a new state, leaving the old one intact', true],
        ['It mutates the existing state, and useSelector deep-compares to notice it', false],
        ['It throws in development, because reducers must always return a new object', false],
        ['It queues the push and applies it after the next render has been committed', false],
      ], 'createSlice runs reducers through Immer, so mutating syntax on the draft yields a new immutable state; the run showed the old state still had qty 1. Nothing is mutated in place, useSelector compares by reference, the mutating style is allowed inside createSlice, and there is no queuing.'),
      mcq('A DabbaDash team of four is starting a new app with modest shared state (cart, session, settings) and uses TanStack Query for server data. Which choice is most defensible?', [
        ['Zustand, because it covers this client state with little ceremony', true],
        ['Redux Toolkit, because only Redux can persist state on a phone', false],
        ['One large Context, because a store adds no value for three slices', false],
        ['No shared state at all, passing the cart down as props everywhere', false],
      ], 'With server data in a query cache, the remaining client state is small, and Zustand handles it with selectors and persist without boilerplate. Both libraries can persist, a single Context re-renders every consumer on each cart change, and prop-drilling a cart through tabs and stacks is unworkable.'),
    ],
  },
  /* ── SERVER_STATE ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_STATE_DATA_SERVER_STATE',
    notes: `In "Server Data with createAsyncThunk" you loaded data into a store with pending, fulfilled and rejected states,
and wrote it again for every endpoint. On a phone you would also need to refetch when the app comes back from the
background, when the network returns, when another screen changed the data, and not refetch when it is still
fresh. TanStack Query (react-query) does all of that for you: it is a cache of server data keyed by what you asked
for.

## Setup and a first query

    const queryClient = new QueryClient();
    export default function RootLayout() {
      return <QueryClientProvider client={queryClient}><Stack /></QueryClientProvider>;
    }

    function RestaurantList() {
      const q = useQuery({ queryKey: ['restaurants'], queryFn: () => getJson<Restaurant[]>('/restaurants') });
      if (q.isPending) return <Text>Loading…</Text>;
      if (q.isError) return <Text>{'Could not load: ' + q.error.message}</Text>;
      return <FlatList data={q.data} ... />;
    }

queryFn must throw on failure. fetch does not throw on a 503, so getJson checks res.ok and throws. Against a
mocked fetch:

    first frame: Loading…
    then: Shree Udupi, Punjab Da Dhaba, Dosa Corner
    with a 503: Could not load: HTTP 503

isPending means "no data yet"; isFetching means "a request is running", which is also true during a background
refetch while old data is on screen. Show a full spinner for the first, a small indicator (or nothing) for the
second. By default a failed query is retried three times with backoff before isError; on patchy 4G that is useful.

## The key is the identity of the data

The key must contain every variable the queryFn uses. DabbaDash's cuisine filter, first with the key left as
['restaurants'] and then keyed properly, tapping "North Indian" after the first load:

    unkeyed: north-indian: Shree Udupi, Dosa Corner | requests: 1
    keyed  : north-indian: Punjab Da Dhaba | requests: 2

Unkeyed, the filter says North Indian and the list still shows South Indian restaurants, with no new request:
the cache already had ['restaurants']. With queryKey: ['restaurants', { cuisine }] each cuisine is its own cache
entry, and going back to South Indian is instant from cache. The ESLint plugin @tanstack/eslint-plugin-query has an
exhaustive-deps rule that catches this.

## Fresh, stale and garbage-collected

- **staleTime** (default 0): how long data counts as fresh. Fresh data is served with no request.
- **gcTime** (default 5 minutes): how long an entry with no screen using it stays in memory.

Two mounts of the same list, one after the other:

    second mount, staleTime 0, first frame: 3 restaurants
    requests with staleTime 0: 2
    requests with staleTime 60s: 1

With staleTime 0 the cached list showed instantly and a background refetch ran; with 60 seconds there was no second
request. On metered mobile data, a sensible staleTime for menus (minutes) saves requests; order status needs a
short one or polling (refetchInterval).

## Focus and reconnect on a phone

On the web, TanStack Query refetches stale queries when the window regains focus or the browser goes back online.
React Native has no window, so you connect those signals yourself, once, at the root (from the TanStack Query
React Native guide):

    function onAppStateChange(status: AppStateStatus) {
      if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
    }
    useEffect(() => {
      const sub = AppState.addEventListener('change', onAppStateChange);
      return () => sub.remove();
    }, []);

    onlineManager.setEventListener(setOnline =>
      NetInfo.addEventListener(state => setOnline(!!state.isConnected)));

Driving focusManager directly in a test, background then active, triggered exactly one refetch:

    after background -> active: [ 'GET https://api.dabbadash.test/restaurants' ]

While offline, queries pause instead of failing (fetchStatus 'paused') and resume on reconnect. Refetch when a
screen regains focus inside the app is separate: React Navigation's useFocusEffect, or the subscribed option with
useIsFocused so hidden screens stop listening. (Device wiring not run here; follow the docs.)

## Mutations and invalidation

A write is a mutation. After it succeeds, invalidate the queries it affects so they refetch:

    const qc = useQueryClient();
    const toggle = useMutation({
      mutationFn: (v: { id: string; favourite: boolean }) => putJson(...),
      onSettled: () => qc.invalidateQueries({ queryKey: ['restaurants'] }),
    });

invalidateQueries({ queryKey: ['restaurants'] }) matches every key that starts with it, so all cuisines refresh.
toggle.isPending is your "Saving…" state.

## Optimistic updates, with rollback

A heart that waits a second on 4G feels broken. Update the cache first, and undo it if the server says no:

    onMutate: async v => {
      await qc.cancelQueries({ queryKey: ['restaurants'] });   // an in-flight refetch must not overwrite us
      const previous = qc.getQueryData<Restaurant[]>(['restaurants']);
      qc.setQueryData<Restaurant[]>(['restaurants'], old =>
        old?.map(r => (r.id === v.id ? { ...r, favourite: v.favourite } : r)));
      return { previous };
    },
    onError: (_e, _v, ctx) => { if (ctx?.previous) qc.setQueryData(['restaurants'], ctx.previous); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['restaurants'] }),

With the server answering after 300 ms, a success then a 503:

    before the server answered: ["GET .../restaurants","PUT .../restaurants/r1/favourite"]
    heart sequence: ♡ -> ♥ -> ♡ -> ♥ (error)

The heart filled before the PUT returned, and on the failure it emptied optimistically and came back with an error
message. The same mutation written with only onMutate (no rollback, no invalidate) left the screen lying:

    screen: Shree Udupi ♥ | server: ♡

Optimistic updates suit small, likely-to-succeed actions (favourites, a checkbox). Placing an order or paying is
never optimistic: show the pending state and wait for the server.

## Infinite lists

    const q = useInfiniteQuery({
      queryKey: ['orders'],
      queryFn: ({ pageParam }) => getJson<Page>('/orders?cursor=' + pageParam),
      initialPageParam: 0,
      getNextPageParam: last => last.nextCursor,   // null or undefined means no more pages
    });
    // FlatList: data={q.data?.pages.flatMap(p => p.items)}
    //           onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}

    orders: o1,...,o9 | hasNextPage: false | [cursor=0, cursor=3, cursor=6]

Three pages, then hasNextPage went false and the fourth press made no request. The isFetchingNextPage guard matters
because onEndReached can fire several times. For a paged filter, placeholderData: keepPreviousData keeps the old
page on screen while the next one loads.`,
    workedExample: `**Scenario.** DabbaDash's order-tracking screen shows "Preparing" for ten minutes after the restaurant has marked the
order "Out for delivery". The user switches to WhatsApp and back, and nothing changes. Code review:

    const { data } = useQuery({ queryKey: ['order'], queryFn: () => getJson<Order>('/orders/' + id) });

**Bug 1: the key.** It does not contain id. Open order A, go back, open order B, and B's screen first shows A's
cached data. Fix: queryKey: ['orders', id].

**Bug 2: nothing tells the query the app came back.** On React Native, focusManager is not connected until you wire
AppState into it. The team never did, so returning from WhatsApp triggers nothing. Fix: the AppState listener at
the root from the notes, once, for the whole app. Every stale query on screen then refetches on return.

**Bug 3: the data's freshness needs.** An order in progress changes every few minutes. Even with focus wired, a
user who keeps the screen open sees nothing new. Options, in order of preference:

- A push or server-sent update that calls queryClient.invalidateQueries({ queryKey: ['orders', id] }) when the
  status changes (the notifications lesson later wires push).
- Polling while the order is active:

    refetchInterval: q => (q.state.data?.status === 'DELIVERED' ? false : 15_000),

  It stops when the order is delivered, and because refetchIntervalInBackground defaults to false it does not poll
  while focusManager says the app is unfocused (which is why Bug 2's wiring matters), saving battery and data.

**Bug 4: a loading screen on every return.** The screen showed a full spinner when isFetching was true. Background
refetches therefore blanked the tracking map. Fix: full spinner only when isPending; a thin bar when isFetching.

**Result.**

    const q = useQuery({
      queryKey: ['orders', id],
      queryFn: () => getJson<Order>('/orders/' + id),
      refetchInterval: q => (q.state.data?.status === 'DELIVERED' ? false : 15_000),
    });

Plus AppState wired to focusManager at the root. Four bugs, none of them in fetch: they were all about the cache's
identity and its idea of freshness.`,
    mcqs: [
      mcq('The cuisine filter changes from South Indian to North Indian, but the list keeps showing Shree Udupi and no request is made. The query is useQuery({ queryKey: [\'restaurants\'], queryFn: () => load(cuisine) }). What is wrong?', [
        ['cuisine is missing from the key, so the cached entry is reused as is', true],
        ['staleTime is too high, so the query will not refetch for a minute', false],
        ['The queryFn closes over the first cuisine because it is not memoised', false],
        ['useQuery only runs its queryFn once per mount of the list component', false],
      ], 'The key is the cache identity; with the same key and fresh-enough data TanStack Query has no reason to fetch, and the run showed one request and the wrong list. staleTime does not matter with a different key, the queryFn reads the current cuisine on each call, and a key change does refetch without remounting.'),
      mcq('On the web the list refetched when the tab regained focus, but in the DabbaDash React Native app returning from WhatsApp refreshes nothing. Why?', [
        ['React Native has no window focus event; AppState must be wired to focusManager', true],
        ['refetchOnWindowFocus is false by default in the React Native build of the library', false],
        ['Expo pauses all JavaScript timers in the background, which resets the query cache', false],
        ['The app needs NetInfo installed before TanStack Query can see any focus changes', false],
      ], 'TanStack Query listens to browser focus events, which do not exist in React Native, so you call focusManager.setFocused from an AppState listener. The option is on by default, the cache is not reset by backgrounding, and NetInfo is for online status, not focus.'),
      mcq('A favourite toggle uses onMutate to set the heart, with no onError and no invalidation. The PUT fails with 503. What does the user see?', [
        ['A filled heart that the server does not have, until something refetches', true],
        ['The heart reverts on its own, because a failed mutation clears the cache', false],
        ['A red error toast generated by TanStack Query from the failed response', false],
        ['The list in its loading state while the query refetches from the server', false],
      ], 'Without a rollback and an invalidation the optimistic value stays in the cache, and the run printed "screen: ♥ | server: ♡". A failed mutation changes no query data by itself, the library shows no UI of its own, and nothing triggered a refetch.'),
    ],
    checkpoint: [
      mcq('Why does an optimistic onMutate call await queryClient.cancelQueries({ queryKey: [\'restaurants\'] }) before setQueryData?', [
        ['So a refetch already in flight cannot land afterwards and overwrite the optimistic value', true],
        ['So the mutationFn cannot start until every query in the app has completely stopped', false],
        ['Because setQueryData throws an error if the query it targets is currently fetching', false],
        ['So that the restaurants query is removed from the cache and loaded again from scratch', false],
      ], 'An older GET that resolves after the optimistic write would replace it with pre-change data, making the heart flicker back. cancelQueries does not block other queries or the mutation, setQueryData does not throw during a fetch, and cancelling does not remove the entry.'),
      mcq('The order history uses useInfiniteQuery and FlatList\'s onEndReached calls fetchNextPage(). Sometimes the same page is requested twice. What guard belongs in the handler?', [
        ['Call fetchNextPage only when hasNextPage is true and isFetchingNextPage is false', true],
        ['Set onEndReachedThreshold to zero so the callback fires only at the exact end', false],
        ['Replace useInfiniteQuery with useQuery and store each loaded page in useState', false],
        ['Pass a new initialPageParam on each call so that the cursor always moves forward', false],
      ], 'onEndReached can fire repeatedly while a page is loading, so the documented guard checks hasNextPage and isFetchingNextPage. A zero threshold still fires more than once and makes loading late, hand-rolled pages lose the cache, and initialPageParam is only for the first page.'),
      mcq('Which DabbaDash action should NOT be updated optimistically?', [
        ['Placing a ₹640 order paid by UPI', true],
        ['Marking a restaurant as a favourite', false],
        ['Ticking an item on a shared grocery list', false],
        ['Hiding a promotion card from the home feed', false],
      ], 'Showing an order as placed before the server and the payment confirm it can mislead the user about money, so it shows a pending state and waits. The other three are small, reversible and usually succeed, which is where optimistic updates belong.'),
    ],
  },
  /* ── FORMS ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_STATE_DATA_FORMS',
    notes: `A delivery-address form is where DabbaDash loses orders. The user is standing at the gate with one thumb free, the
keyboard covers half the screen, the phone field opens a full QWERTY keyboard, and after "Save" an error appears
somewhere below the fold. Year 3 settled the principles ("Validate on the Client for Kindness, the Server for
Correctness", "Showing a Field Error Usefully"); "Typing API Data and Runtime Validation" gave you zod. This lesson
builds the form the way React Native teams do it: react-hook-form for form state, zod for the rules, and a phone-
first input setup.

## The schema is the single source of the rules

    import { z } from 'zod';

    export const addressSchema = z.object({
      name: z.string().trim().min(2, 'Enter the name of the person receiving the order'),
      phone: z.string().trim().regex(/^[6-9]\\d{9}$/, 'Enter a 10-digit mobile number'),
      pincode: z.string().trim().regex(/^\\d{6}$/, 'Pincode has 6 digits'),
      flat: z.string().trim().min(1, 'Add a flat or house number'),
      landmark: z.string().trim().max(60, 'Keep the landmark under 60 characters').optional(),
    });
    export type AddressInput = z.input<typeof addressSchema>;   // what the fields hold
    export type Address = z.output<typeof addressSchema>;       // what onSubmit receives

Messages say what to do, not "Invalid". Run on its own:

    issues: {"phone":["Enter a 10-digit mobile number"],"pincode":["Pincode has 6 digits"],"flat":["Add a flat or house number"]}
    parsed: {"name":"Asha","phone":"9845012345","pincode":"560034","flat":"12B"}

trim() ran on the way through, so " Asha " arrived as "Asha". The server validates again with its own copy of these
rules; the client check is for kindness only.

## Why register does not work on a TextInput

On the web, react-hook-form's register returns { name, ref, onChange, onBlur } and reads the DOM input's value.
React Native's TextInput reports text through onChangeText, not a DOM change event. Spread register onto it anyway:

    <TextInput accessibilityLabel="Mobile number" {...register('phone')} />

TypeScript accepted it. The test typed 9845012345 and pressed Save:

    typed 9845012345, error shown: Invalid input: expected string, received undefined | submitted: 0

The form never received a value. In React Native every field goes through **Controller**, which hands you value,
onChange and onBlur to wire up yourself. Wrap it once in a field component:

    function FormField<T extends FieldValues>({ control, name, label, ...input }: FieldProps<T>) {
      return <Controller control={control} name={name} render={({ field, fieldState: { error } }) => (
        <View>
          <Text>{label}</Text>
          <TextInput ref={field.ref} accessibilityLabel={label} value={field.value ?? ''}
            onChangeText={field.onChange} onBlur={field.onBlur} {...input} />
          {error && <Text accessibilityRole="alert" aria-live="polite">{error.message}</Text>}
        </View>
      )} />;
    }

## The form

    const { control, handleSubmit, setError, formState: { isSubmitting } } =
      useForm<AddressInput, unknown, Address>({
        resolver: zodResolver(addressSchema),
        defaultValues: { name: '', phone: '', pincode: '', flat: '', landmark: '' },
        mode: 'onTouched',
      });

    <FormField control={control} name="phone" label="Mobile number"
      keyboardType="phone-pad" autoComplete="tel" maxLength={10} />
    ...
    <Pressable accessibilityRole="button" disabled={isSubmitting}
      accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
      onPress={() => void handleSubmit(onSubmit)()}>
      <Text>{isSubmitting ? 'Saving…' : 'Save address'}</Text>
    </Pressable>

Always give defaultValues: without them an untouched field is undefined, and string rules fail with "expected
string, received undefined" instead of your message. The onPress is
wrapped because with React Native 0.88's types, onPress={handleSubmit(onSubmit)} fails tsc: handleSubmit expects
a web BaseSyntheticEvent and Pressable passes a press event ("Types of property 'bubbles' are incompatible").

**When errors appear.** mode: 'onTouched' validates a field after its first blur, then on every change. Real run:

    typing, not blurred: 0 alerts
    after blur: Enter a 10-digit mobile number

Nobody is told their number is wrong after typing two digits. Pressing Save validates everything:

    empty submit alerts: ["Enter the name of the person receiving the order","Enter a 10-digit mobile number",
      "Pincode has 6 digits","Add a flat or house number"]

**Submitting state and server errors.** handleSubmit sets isSubmitting while your async onSubmit runs. The test
held the save request open and tapped again:

    while saving, button disabled: true
    save called: 1 time(s) with {"name":"Asha Rao","phone":"9845012345","pincode":"560034","flat":"12B, Lake View","landmark":""}

The second tap did nothing: no duplicate address on a slow network. The server then said it does not deliver
there, and setError put that message on the pincode field, where the user is looking:

    for (const [field, message] of Object.entries(res.fieldErrors ?? {}))
      setError(field as keyof Address, { type: 'server', message });

    after server reply: Save address | We do not deliver to 560034 yet

In a real screen onSubmit calls a TanStack mutation's mutateAsync, so the cache invalidation from the last lesson
happens in the same place.

## Pleasant on a phone (from the React Native and Expo docs; not run on a device here)

- **The right keyboard.** keyboardType="phone-pad" for phone, "number-pad" for pincode and OTP, "email-address"
  for email. Fewer wrong characters, fewer errors.
- **Autofill.** autoComplete="tel", "postal-code", "name", "one-time-code" (Android); on iOS also
  textContentType="telephoneNumber", "postalCode", "oneTimeCode". An OTP that fills itself from the SMS is the
  biggest single form improvement in Indian apps.
- **Next, next, done.** returnKeyType="next" and onSubmitEditing={() => setFocus('pincode')} move through fields
  (setFocus works because Controller's field.ref is on the TextInput); the last field uses "done" and submits.
- **The keyboard must not cover the field or the button.** Put the form in a ScrollView with
  keyboardShouldPersistTaps="handled" (otherwise the first tap on Save only closes the keyboard), and use
  KeyboardAvoidingView with behavior="padding" on iOS. On Android, Expo's android.softwareKeyboardLayoutMode
  ("resize" or "pan") in app config decides how the window reacts. Many teams use react-native-keyboard-controller
  for consistent behaviour; test on a small Android phone either way.
- **Accessible.** Every input has a visible label and an accessibilityLabel; errors are text next to the field,
  with accessibilityRole="alert" so screen readers announce them; the button exposes disabled and busy. Do not
  rely on a red border alone.
- **Do not lose work.** Year 3's "Forms That Do Not Lose Work" applies: if a long form is half filled, confirm before
  Back discards it (React Navigation's beforeRemove event, or usePreventRemove).

## Common mistakes

- register on TextInput: it compiles, it runs, and nothing reaches the form.
- No defaultValues, so untouched fields are undefined and the user sees "expected string, received undefined"
  instead of the message you wrote.
- Number fields: a TextInput always gives a string. Keep it a string in the schema (regex) or convert with
  z.coerce.number() deliberately; do not parseInt in onChange.
- Validating on every keystroke from the first character (mode: 'onChange'), so the user is scolded while typing.
- A button that is not disabled while submitting, so a slow 4G request creates the address twice.`,
    workedExample: `**Scenario.** DabbaDash's phone-login screen: one field for a mobile number, then an OTP screen. Support tickets say
"the app says my number is wrong" and "I got two OTPs".

**Step 1: read the schema against real input.** The rule was z.string().regex(/^\\d{10}$/). Users paste
"+91 98450 12345" from contacts or type "98450 12345" with a space. Those are valid numbers that fail the rule.
Decide what you accept, normalise, then validate:

    const phone = z.string()
      .transform(s => s.replace(/[\\s-]/g, '').replace(/^(\\+91|0)/, ''))
      .pipe(z.string().regex(/^[6-9]\\d{9}$/, 'Enter a 10-digit mobile number'));

    "+91 98450 12345" -> 9845012345
    "98450-12345" -> 9845012345
    "09845012345" -> 9845012345
    "12345" -> Enter a 10-digit mobile number

transform cleans the input, pipe validates the cleaned value, and onSubmit receives "9845012345". The field still
shows what the user typed.

**Step 2: the keyboard.** The field had no keyboardType, so a QWERTY keyboard opened. Set keyboardType="phone-pad",
autoComplete="tel" and textContentType="telephoneNumber" so the number can be filled from the device. Remove
maxLength={10}: it silently cut "+91 98450 12345" to "+91 98450 " before the transform ran.

**Step 3: two OTPs.** The "Send OTP" button was not disabled while the request ran; on a slow network users tapped
twice. With handleSubmit and an async onSubmit, isSubmitting is true until the promise settles:

    <Pressable disabled={isSubmitting} accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
      onPress={() => void handleSubmit(sendOtp)()}>

The server must also rate-limit OTP sends per number; the client guard is a courtesy, not protection.

**Step 4: the error a user can act on.** The API returns 429 with "Try again in 30 seconds". Show it with
setError('root.server', { message }) above the button, not as a field error on phone, because the number is
not what is wrong.

**Step 5: the OTP field.** keyboardType="number-pad", autoComplete="one-time-code" (Android) and
textContentType="oneTimeCode" (iOS) let the OS offer the code from the SMS. Submit automatically when six digits
are present.

**Result.** Fewer "wrong number" errors (normalisation), no double OTPs (isSubmitting plus a server limit), and an
error message placed where it makes sense. None of it needed a new library.`,
    mcqs: [
      mcq('A React Native developer spreads {...register(\'phone\')} onto a TextInput. It compiles. What happens when the user types a valid number and presses Save?', [
        ['The form never receives the text, so the phone rule fails on undefined', true],
        ['It works, because register detects React Native and uses onChangeText', false],
        ['TypeScript stops the build, because register cannot spread onto a TextInput', false],
        ['The value is saved, but only after the field loses focus for the first time', false],
      ], 'register relies on a web change event and the input\'s DOM value; TextInput reports text through onChangeText, so the form value stays undefined, and the real run printed "expected string, received undefined" with no submit. register has no React Native mode, the spread type-checked, and blurring does not supply the value.'),
      mcq('With mode: \'onTouched\', when does the address form first show "Enter a 10-digit mobile number" if the user types "98"?', [
        ['When the phone field loses focus, or when Save is pressed', true],
        ['On the first keystroke, as soon as the value is invalid', false],
        ['Only after Save, and then never again until the next Save', false],
        ['Only when the server rejects the number with a 400 error', false],
      ], 'onTouched validates a field on its first blur and then on each change; submitting validates every field. The real run showed no alert while typing and one after blur. Validating on the first keystroke is mode onChange, and server errors are a separate setError path.'),
      mcq('Why does onSubmit in the address form call setError(\'pincode\', { type: \'server\', message }) when the API returns "We do not deliver to 560034 yet"?', [
        ['So the server\'s message appears next to the field the user must change', true],
        ['So react-hook-form retries the request with the corrected pincode value', false],
        ['Because zod needs a server error before it can validate pincode format', false],
        ['So the button stays disabled until the user restarts the address form', false],
      ], 'setError attaches a message to a field, so the problem is shown where the user will fix it rather than in a generic toast. It does not retry anything, zod checks the format on its own, and the error clears normally when the field is edited and resubmitted.'),
    ],
    checkpoint: [
      mcq('A double tap on "Save address" on slow 4G creates the same address twice. The form uses handleSubmit with an async onSubmit. What is the client-side fix?', [
        ['Disable the button while formState.isSubmitting is true', true],
        ['Validate the form in onChange mode so errors show sooner', false],
        ['Switch the input to keyboardType="number-pad" for speed', false],
        ['Call reset() at the start of onSubmit to clear the form', false],
      ], 'isSubmitting stays true until the async onSubmit settles, so a disabled button ignores the second tap; the real run recorded one save call. Validation mode and the keyboard do not stop a second press, and resetting first throws away the values being saved. The server should still be idempotent.'),
      mcq('Which zod rule accepts a pasted "+91 98450 12345" and hands onSubmit "9845012345"?', [
        ['A transform that strips spaces and +91, piped into the 10-digit regex', true],
        ['A regex on the raw string that allows exactly ten digits and no others', false],
        ['z.coerce.number() on the field, followed by a check for ten digits', false],
        ['maxLength={10} on the TextInput so no extra characters can be typed', false],
      ], 'transform normalises the input and pipe validates the cleaned value, so the user is not punished for formatting. A strict regex rejects the pasted number, z.coerce.number() turns "+91 98450 12345" into NaN and fails (a phone number is not a number anyway), and maxLength truncates the pasted text before any cleaning happens.'),
      mcq('Users report that the first tap on "Save" while the keyboard is open only hides the keyboard. What fixes it?', [
        ['keyboardShouldPersistTaps="handled" on the ScrollView holding the form', true],
        ['returnKeyType="done" on every TextInput in the address form', false],
        ['KeyboardAvoidingView with behavior="height" wrapped around the button', false],
        ['Keyboard.dismiss() called inside the Save button\'s onPress', false],
      ], 'By default a ScrollView uses the first tap to dismiss the keyboard; "handled" lets a tap on a pressable child go through. returnKeyType changes the key label, KeyboardAvoidingView moves content but does not change tap handling, and dismissing inside onPress cannot help when onPress never ran.'),
    ],
  },
  /* ── ARCHITECTURE ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_STATE_DATA_ARCHITECTURE',
    notes: `DabbaDash's first version was one folder: screens/, components/, utils/. By the time three developers were adding a
grocery section and a subscription plan, a change to the restaurant API touched eleven files in four folders,
fetch calls with hard-coded URLs sat inside screens, and nobody could test a screen without a server. Structure is
not about taste; it decides how many files a change touches and whether a new joiner can find things.

## Folders by feature, not by file type

    app/                          Expo Router routes: thin files only
      (tabs)/index.tsx            export { RestaurantsScreen as default } from '@/features/restaurants';
      restaurant/[id].tsx
    src/
      features/
        restaurants/
          api.ts                  restaurantsApi.list / get, with zod schemas
          useRestaurants.ts       query hooks and the key factory
          RestaurantsScreen.tsx
          components/RestaurantCard.tsx
          index.ts                what other features may import
        cart/
          cartStore.ts  CartScreen.tsx  index.ts
        address/
          addressSchema.ts  AddressForm.tsx  useSaveAddress.ts  index.ts
      lib/
        http.ts  config.ts  queryClient.ts
      components/ui/              Button, FormField, EmptyState: no feature knowledge

Everything about restaurants is in one folder; deleting a feature is deleting a folder. Expo reads path aliases from
tsconfig, so "@/*": ["./src/*"] lets you write '@/features/restaurants'.

Rules that keep it working:

- **Routes are thin.** In Expo Router every file in app/ is a screen route; keep them to re-exports or a few lines
  of param reading, so screens can be moved and tested without the router.
- **Dependencies point one way:** screen -> hook -> api -> lib/http. A screen never calls fetch; an api file never
  imports React.
- **Features talk through index.ts.** The cart may import { useRestaurant } from '@/features/restaurants', never a
  file deep inside it. Keep index files small: a barrel that re-exports everything invites circular imports.
- **Shared UI knows nothing about features.** If Button imports from features/cart, it is not shared.

## The API layer, in miniature

The full layer (tokens, retries, timeouts) is "An API Layer for a Mobile App" later in this track. The part that
shapes the codebase:

    // src/lib/http.ts
    export async function getJson<S extends z.ZodType>(path: string, schema: S, signal?: AbortSignal): Promise<z.output<S>> {
      const res = await fetch(config.apiUrl + path, { signal, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new ApiError(res.status, 'GET ' + path + ' failed with ' + res.status);
      return schema.parse(await res.json());
    }

    // src/features/restaurants/api.ts
    export const restaurantSchema = z.object({ id: z.string(), name: z.string(), etaMinutes: z.number() });
    export type Restaurant = z.infer<typeof restaurantSchema>;
    export const restaurantsApi = {
      list: (cuisine: string, signal?: AbortSignal) =>
        getJson('/restaurants?cuisine=' + encodeURIComponent(cuisine), z.array(restaurantSchema), signal),
    };

When the backend renamed etaMinutes to eta_minutes, the failure appeared at the edge, naming the field, instead of
"undefined min" on every card:

    parse error: [ { "expected": "number", "code": "invalid_type", "path": [ 0, "etaMinutes" ],
      "message": "Invalid input: expected number, received undefined" } ]

## Custom hooks are the seam

    export const restaurantKeys = {
      all: ['restaurants'] as const,
      list: (cuisine: string) => [...restaurantKeys.all, 'list', { cuisine }] as const,
    };
    export function useRestaurants(cuisine: string) {
      return useQuery({
        queryKey: restaurantKeys.list(cuisine),
        queryFn: ({ signal }) => restaurantsApi.list(cuisine, signal),
        staleTime: 60_000,
      });
    }

The key factory means nobody types a key by hand, so invalidation (restaurantKeys.all) and reads always agree.
TanStack Query passes signal, so leaving a screen cancels its request.

The screen only renders states:

    export function RestaurantsScreen({ cuisine }: { cuisine: string }) {
      const { data, isPending, isError, refetch } = useRestaurants(cuisine);
      if (isPending) return <Text>Finding restaurants near you…</Text>;
      if (isError) return <ErrorState onRetry={refetch} />;
      if (data.length === 0) return <Text>No {cuisine} restaurants deliver here yet.</Text>;
      return <FlatList data={data} ... />;
    }

Because the hook is the only thing the screen depends on, a test replaces it with jest.mock and checks every state
with no server and no QueryClient:

    jest.mock('./useRestaurants', () => ({ useRestaurants: jest.fn() }));

    1 Finding restaurants near you…
    2 refetch called 1
    3 No south-indian restaurants deliver here yet.
    4 Shree Udupi · 25 min

Later, swapping fetch for another client, or TanStack Query for RTK Query, changes the hook, not the screen.

## Environment configuration

Expo inlines variables named EXPO_PUBLIC_* into the JavaScript bundle at build time:

    # .env.local (not committed; .env.example is)
    EXPO_PUBLIC_API_URL=https://staging-api.dabbadash.test

    // src/lib/config.ts
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!apiUrl) throw new Error('EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env.local.');
    export const config = { apiUrl } as const;

    config error: EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env.local.

Failing at start-up beats a build that silently calls "undefined/restaurants". Two rules: read them as
process.env.EXPO_PUBLIC_NAME literally (the inlining matches that form), and **nothing secret goes in them**:
anything in the bundle can be read out of the app by anyone who downloads it. Per-build values (staging versus
production) come from EAS build profiles, covered in the release topic.

## Thin screens, testable logic

- Business rules (delivery fee slabs, "is this restaurant open now", coupon eligibility) are plain functions in the
  feature, unit-tested without React.
- Hooks combine queries, stores and those functions.
- Screens lay out the result and wire events. If a screen file passes 200 lines, something belongs in a hook or a
  component.
- Name things by the domain: useRestaurants, cartStore, AddressForm, not useData, store2, Form1.`,
    workedExample: `**Scenario.** A pull request adds "Reorder" to DabbaDash's order history. The diff:

    // app/(tabs)/orders.tsx (240 lines)
    const [orders, setOrders] = useState<any[]>([]);
    useEffect(() => {
      fetch('https://api.dabbadash.in/orders').then(r => r.json()).then(setOrders);
    }, []);
    const reorder = async (o: any) => {
      for (const l of o.lines) useCart.getState().add(l);
      router.push('/cart');
    };

**Review, in the order it matters.**

1. **A hard-coded production URL in a route file.** Staging builds would place real orders. Use the http layer and
   config, which reads EXPO_PUBLIC_API_URL.
2. **Server data in useState with any.** No loading or error state, no refetch on return, no cancellation, and
   any hides the response shape. Create features/orders/api.ts with an orderSchema and features/orders/useOrders.ts
   with a key factory (orderKeys.all, orderKeys.list()). If history is long, useInfiniteQuery.
3. **Business logic in the screen.** "Reorder" has rules: skip items that are no longer on the menu, use today's
   price, warn if the restaurant is closed. That is a function, buildReorder(order, menu), in features/orders,
   unit-tested with plain inputs. A hook, useReorder, fetches the menu, calls it and adds to the cart.
4. **Reaching into another feature.** useCart.getState().add is fine to call from the orders feature, but through
   '@/features/cart' (its index), not a deep path.
5. **The route file does everything.** Move the screen to features/orders/OrdersScreen.tsx; app/(tabs)/orders.tsx
   becomes one re-export line.

**The resulting files.**

    src/features/orders/
      api.ts            orderSchema, ordersApi.list
      useOrders.ts      orderKeys, useOrders
      buildReorder.ts   pure: (order, menu) => { lines, skipped }
      buildReorder.test.ts
      useReorder.ts     menu query + buildReorder + cart add + router.push('/cart')
      OrdersScreen.tsx  renders states, calls reorder(order)
      index.ts

**What the team gains.** The screen test mocks useOrders and useReorder; buildReorder's tests cover "item removed
from menu" and "price changed" in milliseconds; the next person adding "Rate your order" knows exactly which folder
to open. The review comment that carries the most weight is the first one: a production URL in a staging build is
an incident, not a style issue.`,
    mcqs: [
      mcq('In an Expo Router app, what should app/(tabs)/index.tsx usually contain in a feature-folder codebase?', [
        ['A re-export of the screen component from its feature folder', true],
        ['The screen plus its fetch calls, since routes run on the server', false],
        ['The QueryClientProvider and every store used by that tab', false],
        ['Nothing, because Expo Router finds screens in src/features', false],
      ], 'Files in app/ are routes, so keeping them to a re-export lets the screen live with its feature and be tested without the router. Expo Router routes run in the app, not on a server; providers belong once in the root layout; and the router discovers routes only in app/.'),
      mcq('A teammate puts EXPO_PUBLIC_PAYMENT_SECRET in .env so the app can sign payment requests. What is wrong?', [
        ['EXPO_PUBLIC_ values are inlined into the bundle, which anyone can extract', true],
        ['Expo only reads .env files during EAS cloud builds, not in development', false],
        ['The variable needs the VITE_ prefix to be readable in React Native apps', false],
        ['Environment variables cannot hold secrets longer than 64 characters', false],
      ], 'Expo replaces process.env.EXPO_PUBLIC_* with the literal value at build time, so the secret ships inside the app; signing belongs on the server. Expo does read .env locally, VITE_ is a Vite convention, and there is no length rule.'),
      mcq('Why does RestaurantsScreen depend on a useRestaurants hook instead of calling useQuery and fetch itself?', [
        ['A test can mock the hook and check each screen state without a server', true],
        ['useQuery only works inside custom hooks, not directly inside screen components', false],
        ['A hook makes the request run on a background thread instead of JS', false],
        ['Screens may not import from @tanstack/react-query under Expo Router', false],
      ], 'The hook is the seam: the screen renders whatever the hook returns, so jest.mock replaced it and the test covered loading, error, empty and data. useQuery works in any component, hooks do not change threads, and Expo Router places no such import rule.'),
    ],
    checkpoint: [
      mcq('The backend renames etaMinutes to eta_minutes. Where should DabbaDash notice first, and how?', [
        ['In the feature\'s api.ts, where a zod schema parse fails naming the field', true],
        ['In the RestaurantCard, which shows "undefined min" until a user complains', false],
        ['In the query hook, where TypeScript reports the missing field at runtime', false],
        ['In the root layout, where the QueryClient compares responses across builds', false],
      ], 'Parsing at the edge turns a silent shape change into one clear error, and the run printed the path [0, "etaMinutes"]. The card showing undefined is the failure to avoid, TypeScript types do not exist at runtime, and the QueryClient does not validate shapes.'),
      mcq('Which dependency direction keeps a React Native feature folder easy to test and change?', [
        ['Screen calls hook, hook calls api, api calls the shared http module', true],
        ['The api module imports the screen so that it can set loading flags', false],
        ['The http module imports each feature\'s store to save responses there', false],
        ['Screens call fetch directly and hooks read the results from the screen', false],
      ], 'One-way dependencies mean each layer can be tested by mocking only the layer below it. An api importing a screen, or http importing feature stores, creates cycles and couples the network layer to UI, and fetch inside screens is what made the old code untestable.'),
      mcq('Two screens invalidate and read restaurant data with hand-typed keys [\'restaurant\', id] and [\'restaurants\', id]. One never refreshes after an edit. What structural fix prevents this class of bug?', [
        ['A query key factory in the feature that every hook and invalidation uses', true],
        ['A longer staleTime on both queries so that they share one cache entry', false],
        ['Calling queryClient.clear() after every mutation anywhere in the app', false],
        ['Moving the restaurant data into a Zustand store shared by both screens', false],
      ], 'A key factory such as restaurantKeys.detail(id) means reads and invalidations are built by the same code, so they cannot drift apart. staleTime does not merge different keys, clearing the whole cache throws away good data, and copying server data into a store recreates the stale-copy problem.'),
    ],
  },
  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_STATE_DATA_DEBUGGING',
    notes: `Six DabbaDash bugs from this topic, each one reproduced under Jest with Testing Library and a mocked fetch. For
each: what the user or developer saw, the cause, and the smallest fix. The habit to build is the same every time:
reproduce it in a test, read the exact message, and change one thing.

## Bug 1: "Maximum update depth exceeded" on the cart screen

    const { lines, coupon } = useCart(s => ({ lines: s.lines, coupon: s.coupon }));

**Symptom.** The screen crashes on first render after a Zustand upgrade. The real output:

    console.error: The result of getSnapshot should be cached to avoid an infinite loop
    thrown: Maximum update depth exceeded. This can happen when a component repeatedly calls setState ...

**Cause.** The selector returns a new object on every call, so React's external-store check never sees a stable
snapshot. Zustand 5 uses React's useSyncExternalStore directly, so this loops instead of merely over-rendering.

**Fix.** useCart(useShallow(s => ({ lines: s.lines, coupon: s.coupon }))), or two selectors that each return one
value. The first message, about getSnapshot, is the clue: the problem is the selector, not the setState it mentions.

## Bug 2: the badge does not update but the store has the item

    addChai: () => set(s => { s.lines.push(chai); return s; }),

**Symptom.** Logging useCart.getState() shows the item; the screen does not.

    after push, screen shows: count 0 | store has 1

**Cause.** The same state object came back, so Zustand saw no change and notified no one.

**Fix.** set(s => ({ lines: [...s.lines, chai] })). If you prefer writing mutations, add the immer middleware;
never mutate without it. In Redux Toolkit the same push is fine inside createSlice (Immer), and outside a reducer
the state is frozen in development: the run showed Object.isFrozen true and the assignment had no effect.

## Bug 3: the filter changes, the list does not

    const q = useQuery({ queryKey: ['restaurants'], queryFn: () => load(cuisine) });

**Symptom.** "North Indian" is selected and the list still shows Shree Udupi and Dosa Corner.

    unkeyed: north-indian: Shree Udupi, Dosa Corner | requests: 1

**Cause.** The key does not contain cuisine, so TanStack Query thinks it already has this data. Requests: 1 is the
evidence; no second request was ever made.

**Fix.** queryKey: ['restaurants', { cuisine }], ideally from a key factory, and turn on the exhaustive-deps rule of
@tanstack/eslint-plugin-query. After the fix: "north-indian: Punjab Da Dhaba | requests: 2".

## Bug 4: the heart lies after a failed save

    onMutate: v => { qc.setQueryData(['restaurants'], old => /* flip v.id */); },
    // no onError, no onSettled

**Symptom.** On a weak network a user favourites a restaurant, sees a filled heart, and it is missing from their
favourites on the website.

    screen: Shree Udupi ♥ | server: ♡

**Cause.** The PUT failed with 503, and nothing restored the cache or refetched. A second, quieter version of this
bug is a refetch already in flight landing after the optimistic write and flipping the heart back.

**Fix.** In onMutate, await cancelQueries, take a snapshot with getQueryData and return it; in onError restore it;
in onSettled invalidate. With that the run showed: ♡ -> ♥ -> ♡ -> ♥ (error), and the error text appeared.

## Bug 5: a valid phone number is "wrong"

    <TextInput accessibilityLabel="Mobile number" {...register('phone')} />

**Symptom.** The user types 9845012345 and Save shows an error, and the error is not even the message you wrote:

    typed 9845012345, error shown: Invalid input: expected string, received undefined | submitted: 0

**Cause.** register relies on a web change event; TextInput reports text through onChangeText. The form value stays
undefined. TypeScript did not complain, so this reaches review looking correct. The message is zod's default for
undefined, which is the clue that the field has no value at all, not a wrong one.

**Fix.** Use Controller (wrapped once in a FormField) and give every field a default value of ''.

## Bug 6: tsc fails on the submit button

    <Pressable onPress={handleSubmit(onSubmit)}>

**Symptom.** It works in Expo Go, then the CI type-check fails:

    error TS2322: Type '(e?: BaseSyntheticEvent<object, any, any> | undefined) => Promise<void | undefined>'
    is not assignable to type '(event: Readonly<...>) => unknown'.
      Types of parameters 'e' and 'event' are incompatible.
        ... Types of property 'bubbles' are incompatible.

**Cause.** handleSubmit's returned function is typed for a web synthetic event; Pressable passes a React Native
press event whose bubbles may be undefined.

**Fix.** onPress={() => void handleSubmit(onSubmit)()}. The void says "I am deliberately not awaiting this promise",
which also keeps the no-floating-promises lint rule quiet. Do not cast to any to make it go away.

## The method, once more

1. Reproduce it in a test with the smallest component that shows it; count renders or requests if that is the
   question.
2. Read the first line of the error and the evidence (requests: 1, same object, undefined) before changing code.
3. Fix the cause in one place, rerun, and keep the test so the bug cannot return.`,
    mcqs: [
      mcq('A screen shows Zustand data that is correct in useCart.getState() but never updates on screen. The action is set(s => { s.items.push(x); return s; }). What does this point to?', [
        ['The state object is returned unchanged, so no subscriber is ever notified', true],
        ['The component is missing a Provider, which Zustand needs around each screen', false],
        ['getState() reads a cached snapshot that differs from what React renders', false],
        ['The action must be async, because Zustand batches synchronous set calls', false],
      ], 'Zustand notifies when the new state differs by reference; returning the same mutated object looks like no change, which is why the run showed "count 0 | store has 1". Zustand needs no Provider, getState returns the live state, and set is synchronous with nothing to batch away.'),
      mcq('After selecting "North Indian", the restaurant list is unchanged and the network log shows no new request. Which fix addresses the cause?', [
        ['Add cuisine to the queryKey so each filter has its own cache entry', true],
        ['Call refetch() in a useEffect whenever the cuisine value changes', false],
        ['Set staleTime to 0 so that the query refetches on every single render', false],
        ['Clear the whole query cache when the user taps a cuisine chip', false],
      ], 'No request means the cache believed it already had this data, because the key ignored cuisine. A refetch in an effect overwrites one shared entry so switching back is never instant, staleTime is already 0 by default and does not refetch per render, and clearing the cache discards everything else.'),
      mcq('Save on the address form shows "Invalid input: expected string, received undefined" for a phone the user clearly typed. What is the most likely cause?', [
        ['The TextInput uses register instead of a Controller, so no value arrives', true],
        ['The phone regex does not accept numbers that begin with the digit 9', false],
        ['The keyboardType is phone-pad, which sends digits as a number type', false],
        ['zodResolver needs the schema to be wrapped in z.coerce to read text', false],
      ], 'zod\'s default "received undefined" message means the field had no value at all, which is what happens when register is spread on a TextInput. A regex mismatch would show your own message, phone-pad still gives a string through onChangeText, and the resolver reads strings directly.'),
      mcq('A favourite toggle sometimes flips back to empty a moment after tapping, even though the PUT succeeds. onMutate sets the cache without calling cancelQueries. Why?', [
        ['A refetch that was in flight resolves after the optimistic write and overwrites it', true],
        ['setQueryData is ignored while the mutation is still pending, until onSuccess is reached', false],
        ['The PUT response is written to the cache before the optimistic value is applied', false],
        ['TanStack Query reverts every optimistic value automatically after five seconds', false],
      ], 'An older GET finishing after the optimistic update replaces it with data from before the change; cancelQueries prevents that. setQueryData applies immediately, mutation responses are not written to queries unless you do it, and there is no automatic revert timer.'),
    ],
  },
  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_STATE_DATA_PRACTICE',
    notes: `Nine exercises, easiest first. Do each on paper or in a scratch Expo project before reading the answer. Where an
answer quotes output, it is output from the Jest runs behind this topic.

## Exercise 1: where does it live? (easy)

For a bus-booking app (Pune to Goa), place each value: (a) seats the user has tapped on the seat map; (b) the list
of buses for a date; (c) the selected travel date; (d) whether the user is signed in; (e) the app language; (f)
"Booking…" while payment is confirmed; (g) the total fare for the selected seats.

**Answer.** (a) local state on the seat-map screen, or a small booking store if the passenger-details screen
needs it too; (b) server state, a query keyed ['buses', { from, to, date }]; (c) route param or local state
(it is part of the search); (d) shared client state (session store or context, restored from secure storage);
(e) a persisted settings store; (f) the booking mutation's isPending; (g) derived from (a) and the fare data,
never stored.

## Exercise 2: predict the renders (easy)

Three components read a Zustand cart: A with useCart(), B with useCart(s => s.coupon), C with
useCart(s => s.lines.reduce((a, l) => a + l.qty, 0)). After mounting, there are two adds and one coupon. How
many times does each render?

**Answer.** A 4, B 2, C 3; the real run printed {"WholeStore":4,"CouponLabel":2,"ItemCount":3}. A renders on
every change; B on mount and the coupon; C on mount and the two adds.

## Exercise 3: fix the selector (easy)

const { name, phone } = useProfile(s => ({ name: s.name, phone: s.phone })); crashes in Zustand 5. Give two fixes.

**Answer.** useProfile(useShallow(s => ({ name: s.name, phone: s.phone }))), or const name = useProfile(s =>
s.name); const phone = useProfile(s => s.phone);.

## Exercise 4: a Redux Toolkit slice (medium)

Write a slice for a grocery app's "saved for later" list with actions saved(item) (no duplicates by id) and
unsaved(id). Then write a selector for the count.

**Answer.**

    const savedSlice = createSlice({
      name: 'saved',
      initialState: { items: [] as Item[] },
      reducers: {
        saved(state, a: PayloadAction<Item>) {
          if (!state.items.some(i => i.id === a.payload.id)) state.items.push(a.payload);
        },
        unsaved(state, a: PayloadAction<string>) { state.items = state.items.filter(i => i.id !== a.payload); },
      },
    });
    export const selectSavedCount = (s: RootState) => s.saved.items.length;

Test it by calling savedSlice.reducer directly twice with the same item and checking the length is 1.

## Exercise 5: query keys (medium)

An orders screen filters by status (ACTIVE, DELIVERED, CANCELLED) and a search text. Write a key factory and the
invalidation to run after cancelling an order.

**Answer.**

    export const orderKeys = {
      all: ['orders'] as const,
      list: (f: { status: Status; search: string }) => [...orderKeys.all, 'list', f] as const,
      detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
    };
    qc.invalidateQueries({ queryKey: orderKeys.all });   // every list and the detail

Prefix matching makes the one invalidation cover every filtered list. Debounce the search text before it goes into
the key, or every keystroke creates a cache entry and a request.

## Exercise 6: pagination (medium)

The API returns { items, page, totalPages }, pages from 1. Write initialPageParam and getNextPageParam.

**Answer.** initialPageParam: 1, getNextPageParam: last => (last.page < last.totalPages ? last.page + 1 :
undefined). Returning undefined (or null) makes hasNextPage false; the real run of the cursor version stopped after
three pages with hasNextPage: false.

## Exercise 7: optimistic "mark as read" (medium)

Write onMutate, onError and onSettled for marking one notification as read in the ['notifications'] list.

**Answer.**

    onMutate: async id => {
      await qc.cancelQueries({ queryKey: ['notifications'] });
      const previous = qc.getQueryData<Note[]>(['notifications']);
      qc.setQueryData<Note[]>(['notifications'], old => old?.map(n => (n.id === id ? { ...n, read: true } : n)));
      return { previous };
    },
    onError: (_e, _id, ctx) => ctx?.previous && qc.setQueryData(['notifications'], ctx.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: ['notifications'] }),

## Exercise 8: a signup schema (medium)

Email, password of at least 8 characters, and a confirmation that must match, with the mismatch shown on the
confirm field.

**Answer.**

    const signup = z.object({
      email: z.email('Enter a valid email'),
      password: z.string().min(8, 'Use at least 8 characters'),
      confirm: z.string(),
    }).refine(v => v.password === v.confirm, { message: 'Passwords do not match', path: ['confirm'] });

Run with a bad email and a mismatch, then a good email and a mismatch:

    {"email":["Enter a valid email"],"confirm":["Passwords do not match"]}
    {"confirm":["Passwords do not match"]}

path puts the message on confirm, so react-hook-form shows it under that field.

## Exercise 9: restructure (harder)

A project has screens/HomeScreen.tsx (fetches restaurants), screens/CartScreen.tsx, utils/api.ts (every endpoint),
utils/helpers.ts (fee calculation and date formatting), store/index.ts (cart and settings). Propose the new tree.

**Answer.** features/restaurants/{api.ts, useRestaurants.ts, RestaurantsScreen.tsx, index.ts};
features/cart/{cartStore.ts, deliveryFee.ts, deliveryFee.test.ts, CartScreen.tsx, index.ts};
features/settings/settingsStore.ts; lib/{http.ts, config.ts, queryClient.ts, formatDate.ts}; app/ routes that
re-export the screens. The endpoint file is split by feature, the fee rule moves next to the cart that uses it with
its own tests, and generic date formatting stays in lib.`,
    mcqs: [
      mcq('In a bus-booking app, where should the total fare for the seats the user has selected live?', [
        ['Nowhere as state; compute it from the selected seats and fares', true],
        ['In a persisted store, so the fare survives the app being killed', false],
        ['In its own query, keyed by the selected seat numbers and the bus', false],
        ['In a useState next to the seats, updated by every seat handler', false],
      ], 'A total is derived from the selection and the fare data, so storing it creates a second source of truth that drifts. Persisting a computed value saves nothing that the seats do not already give, the fare data is fetched once rather than per selection, and a parallel useState is the 240-versus-420 bug.'),
      mcq('An order list is keyed [\'orders\', \'list\', { status, search }] and the search box writes to search on every keystroke. What should change?', [
        ['Debounce the search text before it becomes part of the query key', true],
        ['Remove search from the key so all searches share one cache entry', false],
        ['Set gcTime to zero so that old search results are never stored', false],
        ['Move the search text into Redux so the key is read from the store', false],
      ], 'Every distinct key is a cache entry and a request, so typing "biryani" makes seven requests; debouncing sends one after the user pauses. Dropping search from the key brings back the wrong-list bug, gcTime zero only discards results sooner, and storing the text in Redux changes nothing about the key.'),
      mcq('A signup schema uses .refine(v => v.password === v.confirm, { message, path: [\'confirm\'] }). What does path change?', [
        ['The mismatch message is attached to the confirm field instead of the form', true],
        ['The refine runs only when the user edits the confirm field, not on submit', false],
        ['zod compares the two fields as hashes, so the passwords are not in memory', false],
        ['The confirm field is removed from the parsed output passed to onSubmit', false],
      ], 'Without path a refine error belongs to the object as a whole; with path: [\'confirm\'] it appears under that field, as the run showed. path does not change when validation runs, there is no hashing, and the output still contains confirm unless you strip it.'),
      mcq('getNextPageParam for an API returning { items, page, totalPages } should return what on the last page?', [
        ['undefined or null, so hasNextPage becomes false', true],
        ['The same page number, so the query stops looping', false],
        ['Zero, which TanStack Query reads as "start over"', false],
        ['totalPages plus one, so the server returns empty', false],
      ], 'TanStack Query treats undefined or null from getNextPageParam as "no next page" and sets hasNextPage false. Returning the same page would refetch it, zero is a valid page param that would be requested, and asking for a page past the end wastes a request on a phone.'),
      mcq('Two Zustand subscribers: one reads useCart(), the other useCart(s => s.coupon). A line\'s quantity changes. Which re-renders?', [
        ['Only the one reading the whole store', true],
        ['Both, because the store object changed', false],
        ['Neither, because quantities are nested', false],
        ['Only the one that selects the coupon', false],
      ], 'useCart() with no selector returns the whole state, which is a new object after any set, so it re-renders; the coupon selector returns the same string, so it does not. Nested changes still produce a new top-level state because the action returns new arrays.'),
    ],
  },
  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_STATE_DATA_INTERVIEW_QUESTION',
    notes: `Four questions React Native interviews ask about state, at product companies, startups and service companies alike,
with an answer that scores well and the follow-up a good interviewer asks next. Practise aloud, two minutes each,
and swap DabbaDash for an app you built: specifics from your own code are what interviewers listen for.

## Q1. "How do you manage state in a React Native app?"

**Model answer.** "I split it by kind. Local UI state stays in useState in the component. Server data, like
restaurants and orders, goes in TanStack Query, because it is a cache of someone else's data and needs loading,
errors, refetching and invalidation. Shared client state that the app owns, like the cart, the session and settings,
goes in a small Zustand store with selectors, and the parts that must survive the app being killed are persisted
with a version so I can migrate them. Navigation state belongs to the router, and I pass ids in params, not objects.
Anything derivable, like the cart total, I compute rather than store."

**Follow-up: "Why not just Redux for everything?"** "I could, and on a large team that has standardised on Redux
Toolkit I would keep it, possibly with RTK Query for server data. What I would not do is load server data into a
slice with hand-written loading flags; that is the part that goes stale and gets duplicated."

## Q2. "What is the problem with Context for global state?"

**Model answer.** "Every component that reads a context re-renders when its value changes, even if it only uses one
field, and memo does not stop that. If the provider value is an object created on each render, it changes on every
render. In one app I measured three memoised components re-rendering on every cart tap, including a header that
only read the city. Splitting contexts and memoising the value fixed it, but for fast-changing shared state a store
with selectors is simpler. I keep Context for values that rarely change, like theme or the signed-in user."

**Follow-up: "How did you measure it?"** "A render counter in a test, and the React DevTools profiler's 'why did
this render'. On a mid-range Android phone those wasted renders were visible as dropped frames while typing."

## Q3. "Explain an optimistic update. When would you not use one?"

**Model answer.** "The UI changes before the server confirms. With TanStack Query, in onMutate I cancel in-flight
queries for that key, so an older refetch cannot overwrite me, snapshot the current data, write the new value with
setQueryData and return the snapshot. onError restores it and shows a message; onSettled invalidates so the cache
ends up matching the server. I use it for small, reversible, likely-to-succeed actions like favourites. I would not
use it for payments, placing an order or anything with money or irreversible effects; there I show a pending state
and wait."

**Follow-up: "What if the user taps the heart five times quickly?"** "Each mutation snapshots and rolls back
independently, so rollbacks can restore a stale snapshot. I would disable the control while isPending, or give the
mutations a shared scope so they run in order, and rely on the final invalidation to settle the truth."

## Q4. "How do you build forms in React Native?"

**Model answer.** "react-hook-form with a zod schema through zodResolver. Every TextInput goes through a Controller,
because register expects a web change event and TextInput uses onChangeText; I wrap that in one FormField component
with the label, the input and the error. I use mode onTouched so errors appear after a field is left, not on the
first keystroke. The submit button is disabled while isSubmitting, so a slow network does not create duplicates,
and server-side errors go onto the right field with setError. On the phone side: the right keyboardType,
autoComplete and textContentType for autofill and OTP, returnKeyType next with setFocus, and
keyboardShouldPersistTaps so the first tap on Save works. The server validates again; the client check is for the
user's convenience."

**Follow-up: "Why zod rather than writing the checks by hand?"** "One schema gives both the runtime check and the
TypeScript type through z.infer, and the same schema can validate API responses at the edge."

## How these are scored

Interviewers listen for categories (server versus client state), a reason for each choice, one measured or real
example, and the limit of your own approach. "I use Redux" with no reason scores lower than a smaller answer that
explains where each kind of state goes and why.`,
    mcqs: [
      mcq('An interviewer asks why DabbaDash keeps restaurants in TanStack Query rather than a Redux slice. Which answer is strongest?', [
        ['It is a cache of server data that needs staleness, refetching and invalidation', true],
        ['Redux cannot store arrays of objects larger than a few hundred items on a phone', false],
        ['TanStack Query stores data in SQLite, so it survives the app being killed', false],
        ['Redux slices cannot be used together with React Navigation stacks and tabs', false],
      ], 'The distinguishing point is that server data has a different lifecycle from client data, and a query cache handles it. Redux has no such size limit, TanStack Query keeps its cache in memory unless you add a persister, and Redux works fine with navigation.'),
      mcq('The follow-up: "the user taps the favourite heart five times quickly". What is a sound answer?', [
        ['Disable it while isPending or queue the mutations, then let invalidation settle the truth', true],
        ['Nothing is needed, because each tap simply replaces the previous mutation automatically', false],
        ['Wrap mutate in a setTimeout of one second so that the taps are spread out over time', false],
        ['Switch to a plain fetch with no cache, so that only the last tap reaches the server', false],
      ], 'Overlapping optimistic mutations snapshot and roll back independently and can restore stale data; disabling the control or running them in one scope keeps order, and the final invalidation reconciles with the server. Mutations do not cancel each other, a delay does not prevent overlap, and dropping the cache throws away the benefits.'),
      mcq('In a forms answer, why should a candidate mention that the server validates again?', [
        ['Client validation can be bypassed, so it is for convenience, not for correctness', true],
        ['zodResolver only runs in development builds and is stripped from release builds', false],
        ['The server is the only place that can check the format of an Indian pincode', false],
        ['react-hook-form sends the raw values to the server before running the schema', false],
      ], 'Anyone can call the API directly, so rules that matter are enforced on the server; the client check makes the form kind. zodResolver runs in release builds too, format checks work on the client, and handleSubmit validates before calling onSubmit.'),
    ],
  },
  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_STATE_DATA_CHECKPOINT',
    notes: `Ten questions across the whole topic: where state lives, Zustand and Redux Toolkit, TanStack Query, forms and the
codebase structure. Answer without looking back; then return to the lessons for any you missed.`,
    checkpoint: [
      mcq('DabbaDash puts { user, cart, theme } in one context value created on each render. What happens when an item is added to the cart?', [
        ['Every component using that context re-renders, including theme-only readers', true],
        ['Only the cart badge re-renders, because React compares each field separately', false],
        ['Nothing re-renders until the user navigates, because context values are cached', false],
        ['The provider unmounts its children and mounts them again with the new value', false],
      ], 'A context consumer re-renders whenever the provider value changes by reference, and a new object is created on each render. React does not compare fields, context changes apply immediately, and children are re-rendered, not remounted.'),
      mcq('Which selector is safe in Zustand 5 for a component that needs both lines and coupon?', [
        ['useCart(useShallow(s => ({ lines: s.lines, coupon: s.coupon })))', true],
        ['useCart(s => ({ lines: s.lines, coupon: s.coupon }))', false],
        ['useCart(s => [s.lines, s.coupon])', false],
        ['useCart(s => Object.assign({}, { lines: s.lines, coupon: s.coupon }))', false],
      ], 'useShallow compares the returned object field by field, so the snapshot is stable when nothing changed. The other three build a new object or array on every call, which in Zustand 5 makes React loop with "Maximum update depth exceeded".'),
      mcq('A settings store is persisted with an async storage. On launch the app briefly shows English, then switches to Hindi. What fixes it?', [
        ['Wait for persist.hasHydrated() behind the splash screen before rendering', true],
        ['Store the language in a useState in the root layout as well as the store', false],
        ['Use version: 2 in the persist options so that hydration happens sooner', false],
        ['Move the language setting into the TanStack Query cache with staleTime', false],
      ], 'With async storage the first render uses defaults and the saved state arrives a moment later, so the app should wait for hydration. A second copy in useState is a second source of truth, the version number is for migrations, and a query cache is for server data.'),
      mcq('A screen fetches the user\'s orders, and returning to the app from the UPI app does not refresh them. Focus is wired with AppState. What else could explain it?', [
        ['A long staleTime keeps the data fresh, so a focus event does not refetch', true],
        ['useQuery never refetches after its first successful load in React Native', false],
        ['The orders query must also be wrapped in a Redux Provider to see focus', false],
        ['focusManager only works with Expo Router and not with React Navigation', false],
      ], 'Focus refetches only stale queries; with a staleTime of several minutes the data is still fresh. useQuery does refetch in React Native once focus is wired, no Redux Provider is involved, and focusManager does not depend on the navigation library.'),
      mcq('Which pair of callbacks makes an optimistic update safe when the server rejects it?', [
        ['onError restoring the snapshot, and onSettled invalidating the query', true],
        ['onSuccess writing the response, and retry set to Infinity on the mutation', false],
        ['onMutate calling refetch, and a staleTime of zero on the related query', false],
        ['onSettled calling queryClient.clear(), and isPending hiding the screen', false],
      ], 'Restoring the snapshot undoes the lie immediately, and invalidating makes the cache match the server either way. Infinite retries keep a failing request going, refetching in onMutate races the optimistic write, and clearing the whole cache throws away unrelated data.'),
      mcq('Why does a React Native form use Controller for each TextInput rather than register?', [
        ['TextInput reports text through onChangeText, which register does not wire', true],
        ['register only works with class components, which React Native no longer has', false],
        ['Controller validates on the server, while register only validates locally', false],
        ['register stores values in the DOM, and React Native has no localStorage', false],
      ], 'register relies on a web change event and ref-based value reading; Controller gives you value and onChange to connect to onChangeText. register works with function components on the web, Controller does no server validation, and localStorage has nothing to do with it.'),
      mcq('A login form lets users tap "Send OTP" twice on a slow network and receive two codes. Which client change and server change together fix it?', [
        ['Disable the button while isSubmitting, and rate-limit OTP sends per number', true],
        ['Validate with mode onChange, and lengthen the OTP from six digits to eight', false],
        ['Use keyboardType number-pad, and send the OTP by email instead of an SMS', false],
        ['Call reset() before sending, and cache the OTP in the app for a minute', false],
      ], 'The disabled button stops accidental double taps, and the server limit protects against anything else that calls the API. Validation mode, OTP length, keyboard type and email do not stop a second request, and an OTP must never be cached on the device.'),
      mcq('Which statement about EXPO_PUBLIC_ environment variables is correct?', [
        ['They are inlined into the bundle at build time, so they must not hold secrets', true],
        ['They are read from the server at runtime, so they are safe for API secrets', false],
        ['They are encrypted in the app binary and decrypted only on rooted phones', false],
        ['They are available only in development builds and empty in release builds', false],
      ], 'Expo replaces process.env.EXPO_PUBLIC_* references with literal values when bundling, so anyone can extract them from the app. They are not fetched at runtime, not encrypted, and they are present in release builds, which is why they suit only public values such as an API base URL.'),
      ck('REACT_NATIVE', 'A new joiner must add "Rate your order" to DabbaDash. In a feature-folder codebase, where does the rating API call go?', [
        ['features/orders/api.ts, with its zod schema, used through a hook', true],
        ['app/order/[id].tsx, next to the route that shows the order screen', false],
        ['components/ui/RatingStars.tsx, so the stars can submit themselves', false],
        ['lib/http.ts, as a new exported function next to the getJson helper', false],
      ], 'Endpoint calls live in the feature\'s api module and reach screens through a hook, so they can be mocked and reused. Route files stay thin, shared UI components must not know about features or endpoints, and lib/http holds generic transport, not feature endpoints.'),
      ck('REACT_NATIVE', 'Why can a DabbaDash screen test check loading, error, empty and data states without a server or a QueryClient?', [
        ['The screen depends only on a custom hook, which jest.mock replaces', true],
        ['Testing Library starts a fake HTTP server for every test file it runs', false],
        ['Expo Go records real responses, which tests then replay from a file', false],
        ['useQuery returns fixed sample data automatically in the test runner', false],
      ], 'Because the hook is the screen\'s only dependency, mocking it lets each test set the state directly; the run checked all four states this way. Testing Library starts no server, Expo Go does not record responses, and useQuery has no automatic test data.'),
    ],
  },
];
