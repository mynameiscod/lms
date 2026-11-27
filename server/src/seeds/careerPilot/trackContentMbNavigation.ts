/**
 * Career-track content: Navigation (MB_NAVIGATION), Mobile, batch MB1.
 *
 * Moving between screens in a React Native app: stacks and typed route parameters, tabs, drawers and nested
 * navigators, signed-in and signed-out screens with a splash while the session is restored, and deep links from
 * custom schemes, Android App Links and iOS Universal Links. Expo Router (file-based) is the default; React
 * Navigation, which Expo Router is built on, is taught where it explains things and for the many existing apps
 * that use it directly. It builds on "React Router: Pages, Links and Parameters" and "Protected Routes and
 * Redirects" (web track) and Year 3's "Screens, Navigation and the Back Button"; those are referred to, not re-taught.
 *
 * One fictional app runs through the topic: ThaliGo, a Hyderabad food-delivery startup with Home, Orders and Account
 * tabs, restaurant and order screens, OTP sign-in, and links like thaligo://orders/4521. Every compiler message and
 * test result quoted is real: TypeScript 6 (strict) and Jest with jest-expo on Expo SDK 58, React Native 0.88,
 * expo-router 58.0.27 and, separately, @react-navigation/native 7.5.1 with native-stack 7.21.0, with screens rendered
 * by expo-router/testing-library's renderRouter (22 tests passing). Not run: anything on a phone or emulator,
 * real OS deep links, App Link / Universal Link verification, and a drawer render (Reanimated's Jest mock failed to
 * load in this setup); those parts are written from docs.expo.dev, reactnavigation.org and developer.android.com.
 *
 * Skill: REACT_NATIVE throughout.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_MB_NAVIGATION_BUNDLES: PilotBundle[] = [
  /* ── STACK_NAV ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_NAVIGATION_STACK_NAV',
    notes: `ThaliGo is a food-delivery startup in Hyderabad. Its app opens on a list of restaurants; tap one and its menu
slides in from the right; press Back (the Android button, the gesture, or the arrow in the header) and the menu slides
away and the list is exactly where you left it, scrolled to the same place. That is a **stack**: screens pushed on
top of each other, the one on top visible, Back popping it off. You met the idea in Year 3's "Screens, Navigation and
the Back Button". This lesson is the code.

## A phone is not a browser

On the web, "React Router: Pages, Links and Parameters" mapped URLs to pages, and the browser kept the history. On a
phone there is no address bar and no browser history. The app keeps a navigation **state**: which navigators exist,
which screens are in each, which is focused. The screen underneath stays mounted, which is why the list keeps its
scroll position, and also why a screen you leave does not unmount and re-run its effects when you come back.

## Two libraries, one engine

- **React Navigation** is the engine almost every React Native app uses: navigators (stack, tabs, drawer), the
  navigation state, and the native stack, which uses real Android and iOS screen containers (react-native-screens)
  so transitions and gestures feel native.
- **Expo Router** puts file-based routing on top of it: every file in app/ is a screen and a URL, like the pages
  folder of a web framework. It is what a new Expo app gets by default. In the installed version, React
  Navigation's code ships inside expo-router itself.

Teams with an older app (very common in Indian product companies whose apps predate Expo Router) use React Navigation
directly; you should be able to read both. The ideas are the same.

## The file tree is the route table

    app/
      _layout.tsx              root navigator: a Stack
      sign-in.tsx              /sign-in
      (tabs)/_layout.tsx       a Tabs navigator; "(tabs)" is a group, not part of the URL
      (tabs)/index.tsx         /
      (tabs)/orders/[orderId].tsx   /orders/4521
      restaurant/[id].tsx      /restaurant/12
      +not-found.tsx           any URL that matches nothing

A **_layout** file decides what kind of navigator holds the screens in its folder. **[id]** is a dynamic segment.
A **(group)** folder organises files without adding to the URL. There is no list of routes to keep in sync, unlike
the routes array you wrote for React Router.

The root layout for a plain stack:

    import { Stack } from 'expo-router';

    export default function RootLayout() {
      return (
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="restaurant/[id]" options={{ title: 'Restaurant' }} />
        </Stack>
      );
    }

## Moving: Link and router

    <Link href={{ pathname: '/restaurant/[id]', params: { id: r.id } }}>{r.name}</Link>
    router.push('/restaurant/12');      // always adds a screen
    router.navigate('/restaurant/12');  // goes there; reuses it if it is already on top
    router.replace('/sign-in');         // swaps the top screen, so Back cannot return to it
    router.back();  router.dismissAll(); // pop one; pop back to the first screen of the stack

The difference between push and navigate matters. This is the root stack, printed from a test after each call:

    push('/restaurant/12') twice    ["(tabs)","restaurant/[id]:12","restaurant/[id]:12"]
    navigate('/restaurant/12')      ["(tabs)","restaurant/[id]:12","restaurant/[id]:12"]
    navigate('/restaurant/27')      ["(tabs)","restaurant/[id]:12","restaurant/[id]:12","restaurant/[id]:27"]
    dismissAll()                    ["(tabs)"]

A double-tap on a push button gives two identical screens (Back has to be pressed twice); navigate to the same route
with the same params adds nothing; different params is a new screen.

## Reading parameters, and why they are strings

    export default function RestaurantScreen() {
      const { id } = useLocalSearchParams<'/restaurant/[id]'>();
      const restaurant = findRestaurant(id);
      if (!restaurant) return <Text>Restaurant not found</Text>;
      ...
    }

Params come from a URL, so they are **strings**, even if you passed a number. If your data has numeric ids,
Number(id) before comparing, and treat a value that is not a valid id as "not found": the same screen opens from a
link anyone can type. Pass an **id**, not a whole object: the screen loads (or reads from cache) what it needs, a link
can open it cold, and you do not push a large object through the URL. useLocalSearchParams gives the params of this
screen; useGlobalSearchParams follows whatever URL is focused and re-renders screens in the background, so prefer local.

## Typed routes: the compiler checks your links

With "experiments": { "typedRoutes": true } in app.json, Expo generates .expo/types/router.d.ts listing every route
when the dev server runs. A wrong link then fails the build instead of opening the not-found screen in front of a
user. Real tsc output on ThaliGo:

    router.push('/restaurants/12');
    error TS2345: Argument of type '"/restaurants/12"' is not assignable to parameter of type ...

    router.push({ pathname: '/restaurant/[id]' });
    Property 'params' is missing in type '{ pathname: "/restaurant/[id]"; }' but required in type ...

    router.push({ pathname: '/restaurant/[id]', params: { restaurantId: '12' } });
    Property 'id' is missing in type '{ restaurantId: string; }' but required in type '{ id: string | number; }'.

## Headers

Static options go on Stack.Screen in the layout. A title that depends on data is set from inside the screen by
rendering Stack.Screen with options there:

    <Stack.Screen options={{ title: restaurant.name }} />

headerShown: false hides it (the tabs supply their own); headerRight puts a button such as "Share" in it.

## Going back

The header's back arrow, the Android back button and the iOS swipe all pop the stack for you. Call router.back()
for your own buttons, and router.canGoBack() before it when a screen might be the first one (opened from a link).
To stop a user losing a half-filled address form, usePreventRemove(hasUnsavedChanges, ...) intercepts every way of
leaving and lets you ask first.

## The same thing in React Navigation

    type RootStackParamList = {
      Home: undefined;
      Restaurant: { id: string; name?: string };
    };
    const Stack = createNativeStackNavigator<RootStackParamList>();
    type RestaurantProps = NativeStackScreenProps<RootStackParamList, 'Restaurant'>;

    function RestaurantScreen({ route, navigation }: RestaurantProps) {
      const { id, name } = route.params;   // typed from the param list
      ...
    }
    navigation.navigate('Restaurant', { id: '12', name: 'Annapurna Tiffins' });

Screens are registered in code (Stack.Navigator with Stack.Screen children) and the param list is your typed route
table. navigation.navigate('Restaurant') without params, or { id: 12 }, fails to compile; on this setup the second
gave "Type 'number' is not assignable to type 'string'". In React Navigation, params are real JavaScript values, not
URL strings, until you add a linking config; keep them small and serialisable anyway.`,
    workedExample: `**Scenario.** ThaliGo's product manager wants: tap a restaurant on Home, see its name in the header and its area
under it; a restaurant id that does not exist (an old link, a closed restaurant) must show a message, not crash.

**Step 1: where the file goes.** The restaurant screen should cover the tab bar, so it belongs in the root stack, not
inside a tab: app/restaurant/[id].tsx, URL /restaurant/12.

**Step 2: link with a typed href.** On Home:

    <Link key={r.id} href={{ pathname: '/restaurant/[id]', params: { id: r.id } }}>{r.name}</Link>

With typed routes on, misspelling the pathname or the param name is a compile error, not a runtime surprise.

**Step 3: the screen.** Read the param, look it up, and handle "not found" before anything else:

    export default function RestaurantScreen() {
      const { id } = useLocalSearchParams<'/restaurant/[id]'>();
      const router = useRouter();
      const restaurant = findRestaurant(id);
      if (!restaurant) return <Text>Restaurant not found</Text>;
      return (
        <View>
          <Stack.Screen options={{ title: restaurant.name }} />
          <Text>{restaurant.name}, {restaurant.area}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.back()}>
            <Text>Back to list</Text>
          </Pressable>
        </View>
      );
    }

**Step 4: test it without a phone.** expo-router/testing-library renders the real app/ folder in Jest and exposes the
current path:

    it('pushes a restaurant with a typed param and goes back', async () => {
      saveSession();
      await open('/');
      fireEvent.press(await screen.findByText('Annapurna Tiffins'));
      expect(await screen.findByText('Annapurna Tiffins, Madhapur')).toBeTruthy();
      expect(screen).toHavePathname('/restaurant/12');
      expect(screen).toHaveSearchParams({ id: '12' });
      fireEvent.press(screen.getByText('Back to list'));
      await waitFor(() => expect(screen).toHavePathname('/'));
    });

It passed. Note the param came back as the string '12'. If the data later uses numeric ids, findRestaurant must
convert, or every lookup silently fails; the debugging lesson shows that bug.`,
    mcqs: [
      mcq('A ThaliGo developer calls router.push(\'/restaurant/12\') from a button that a user double-taps. What happens to the stack?', [
        ['Two identical restaurant screens are pushed, so Back must be pressed twice', true],
        ['The second push is ignored because the same route is already on top of it', false],
        ['The second push replaces the first, so only one restaurant screen remains', false],
        ['The app throws, because one stack cannot hold the same route two times', false],
      ], 'push always adds a screen; the test printed two restaurant/[id]:12 entries. navigate is the call that reuses a route already on top with the same params. Nothing replaces or throws: a stack may hold the same route many times, which is exactly why a double-tap on push is a bug.'),
      mcq('Inside app/restaurant/[id].tsx, what type does the id parameter have when read with useLocalSearchParams?', [
        ['A string, because route params come from a URL', true],
        ['A number, if a number was passed to router.push', false],
        ['Whatever type the Link component was given in href', false],
        ['An object holding the restaurant passed by Home', false],
      ], 'Expo Router params are URL segments, so they arrive as strings whatever you passed; the test saw { id: \'12\' }. Passing a number does not keep it a number, and passing whole objects is the habit to avoid: send an id and let the screen load the data.'),
      mcq('Why does the restaurant screen belong in app/restaurant/[id].tsx rather than inside the (tabs) folder?', [
        ['A screen in the root stack covers the tab bar, as a detail screen should', true],
        ['Files inside a (tabs) group are not allowed to have dynamic segments', false],
        ['Only screens in the root folder can read params with useLocalSearchParams', false],
        ['Expo Router opens screens inside groups in a modal presentation by default', false],
      ], 'Where a file sits decides which navigator holds it: in the root stack it slides over the whole tab layout, tab bar included. Groups can hold dynamic routes, any screen can read its params, and groups do not change presentation.'),
    ],
    checkpoint: [
      mcq('The stack holds Home and restaurant 12. The code calls router.navigate(\'/restaurant/27\'). What is on the stack afterwards?', [
        ['Home, restaurant 12 and restaurant 27, because the params differ', true],
        ['Home and restaurant 27, because navigate replaces the top screen', false],
        ['Home and restaurant 12, because that route is already on the stack', false],
        ['Only restaurant 27, because navigate resets the stack to the target', false],
      ], 'navigate reuses a route only when the same route with the same params is already there; different params push a new screen, as the test showed. Replacing is router.replace, and resetting is not what navigate does.'),
      mcq('With typed routes on, a developer writes router.push(\'/restaurants/12\') but the file is app/restaurant/[id].tsx. When is the mistake caught?', [
        ['At type-check time, because the path is not in the generated route types', true],
        ['At run time, when the push throws an exception that names the missing route', false],
        ['Never, because Expo Router silently redirects unknown paths to the home screen', false],
        ['At build time on EAS, because Metro refuses to bundle a link to a missing file', false],
      ], 'Typed routes turn the route table into TypeScript types, and tsc reported TS2345 for exactly this call. Without them the app would open +not-found at run time; Expo Router does not redirect to home, and Metro does not check link strings.'),
      mcq('In React Navigation, which declaration makes navigation.navigate(\'Restaurant\') without params a compile error?', [
        ['A param list type with Restaurant: { id: string } used by the navigator', true],
        ['A linking config that maps the Restaurant screen to restaurant/:id', false],
        ['The name prop on Stack.Screen, which TypeScript reads at compile time', false],
        ['The initialRouteName prop on Stack.Navigator set to the Home screen', false],
      ], 'createNativeStackNavigator<RootStackParamList>() ties screen names to param types, and the compiler rejected the call with no params. A linking config maps URLs at run time, the name prop alone carries no param types, and initialRouteName only sets the first screen.'),
    ],
  },

  /* ── TABS_DRAWERS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_NAVIGATION_TABS_DRAWERS',
    notes: `Most apps your phone has are a few top-level sections, each with its own screens inside it: Home, Orders and
Account in ThaliGo; Home, Bookings and Help in a bus-booking app. On a phone those sections are **bottom tabs**, at
the bottom where a thumb reaches on a large phone. Inside a tab, you go deeper with a **stack**. Getting that nesting
right is most of mobile navigation.

## Bottom tabs in Expo Router

A layout file in a group folder makes the tabs:

    // app/(tabs)/_layout.tsx
    import { Tabs } from 'expo-router/js-tabs';

    export default function TabLayout() {
      return (
        <Tabs screenOptions={{ tabBarActiveTintColor: '#051D64' }}>
          <Tabs.Screen name="index" options={{ title: 'Home' }} />
          <Tabs.Screen name="orders" options={{ title: 'Orders', headerShown: false }} />
          <Tabs.Screen name="account" options={{ title: 'Account' }} />
        </Tabs>
      );
    }

In the installed expo-router, importing Tabs from 'expo-router' itself is marked deprecated in favour of
'expo-router/js-tabs' (a JavaScript tab bar); expo-router also offers native tabs that use the platform's own tab
bar. Import paths like this move between versions: check the docs for the version in your package.json.

The folder is called (tabs) so it does not appear in URLs: the Orders tab is /orders, not /(tabs)/orders.

Useful options: title, tabBarIcon (a function given color and size, usually an icon from an icon library),
tabBarBadge (the "2" on Orders while two orders are on the way), headerShown, and lazy, which is true by default:
a tab's screen renders the first time it is opened, not at launch. Keep it that way on a mid-range phone; do not
fetch every tab's data at startup.

## A stack inside a tab

The Orders tab needs a list and a detail screen with Back between them, while the tab bar stays visible. So
orders/ gets its own layout with a Stack:

    // app/(tabs)/orders/_layout.tsx
    export const unstable_settings = { anchor: 'index' };

    export default function OrdersLayout() {
      return (
        <Stack>
          <Stack.Screen name="index" options={{ title: 'Your orders' }} />
          <Stack.Screen name="[orderId]" options={{ title: 'Order' }} />
        </Stack>
      );
    }

Now the tree is: root Stack, holding the Tabs, holding (for Orders) a Stack. Printed from a test:

    *__root
      *(tabs)
        *orders
           index
          *[orderId]

## Each tab keeps its own history

Open Orders, tap order 4521, switch to Home, switch back to Orders: the user expects to be on order 4521 still. With
a stack per tab, that is what happens, and ThaliGo's test checks it:

    fireEvent.press(screen.getByLabelText(/^Orders, tab/));
    fireEvent.press(await screen.findByText('Order #4521, Annapurna Tiffins'));
    fireEvent.press(screen.getByLabelText(/^Home, tab/));
    fireEvent.press(screen.getByLabelText(/^Orders, tab/));
    await waitFor(() => expect(screen).toHavePathname('/orders/4521'));   // passed

If a product wants each tab to start fresh when you leave it, the tab option popToTopOnBlur: true pops the nested
stack when the tab loses focus (default false).

What Android Back does in tabs is the tab navigator's backBehavior. The default is 'firstRoute': Back from another tab
goes to the first tab, then out of the app. 'history' goes back through the tabs in the order visited. Pick one
on purpose and test it on a real Android phone, because Indian users press the system Back constantly.

## Which navigator does a screen go in?

The question for every new screen: should the tab bar be visible on it?

- **Yes** (order detail while browsing orders): put it in that tab's stack.
- **No** (restaurant menu, cart, checkout, payment): put it in the root stack, above the tabs. Checkout without the tab
  bar keeps the user's attention on paying.
- **A task that must be finished or dismissed** (add an address, apply a coupon): a modal, presentation: 'modal' on
  its Stack.Screen in the root stack.

## The anchor: what sits under a screen

When the Orders stack is opened straight at /orders/4521 (from a link or a notification), what is under the order?
Without help, nothing. In the test, before the setting was added, the stack was just [orderId] and Back went to
Home. With unstable_settings = { anchor: 'index' } in the orders layout, the list is put underneath and Back goes to
/orders. Older code uses initialRouteName for this; the installed version still honours it but warns:

    \`unstable_settings.initialRouteName\` is deprecated. Use \`unstable_settings.anchor\` instead.

## Drawers

A drawer slides in from the side with a long list of sections. It suits apps with many top-level areas used by staff
rather than consumers: the restaurant-partner app where an owner moves between Live orders, Menu and stock, and
Payouts. Consumer apps in India mostly use bottom tabs, because the hamburger menu hides navigation and a drawer is
hard to reach one-handed on a big phone.

    // a partner app's app/_layout.tsx
    import { Drawer } from 'expo-router/drawer';

    export default function PartnerLayout() {
      return (
        <Drawer screenOptions={{ drawerActiveTintColor: '#051D64' }}>
          <Drawer.Screen name="index" options={{ drawerLabel: 'Live orders', title: 'Live orders' }} />
          <Drawer.Screen name="menu" options={{ drawerLabel: 'Menu and stock', title: 'Menu and stock' }} />
          <Drawer.Screen name="payouts" options={{ drawerLabel: 'Payouts', title: 'Payouts' }} />
        </Drawer>
      );
    }

The drawer needs react-native-drawer-layout, react-native-gesture-handler and react-native-reanimated installed
(npx expo install picks versions that match your SDK). This layout type-checks; rendering it in Jest needs
Reanimated's test mock, which failed to load in this course's setup, so try it on a device or emulator.
drawerType ('front', 'slide', 'permanent' for tablets) and swipeEnabled are the options you will touch.

## Nesting, without overdoing it

Each navigator adds a header, a container and state. Two levels (root stack, then tabs with stacks inside) cover
nearly every app. If you find yourself nesting a drawer in a tab in a stack, redraw the map on paper first.`,
    workedExample: `**Scenario.** ThaliGo is adding Instamart-style grocery delivery. The brief: a Groceries tab with a category list,
a category screen, and a product screen; a cart reachable from anywhere; checkout and UPI payment; and a "Track
order" screen that notifications open. Draw the navigation tree and place every screen.

**Step 1: the top-level sections.** Home (restaurants), Groceries, Orders, Account: four bottom tabs in
app/(tabs)/_layout.tsx. Four is comfortable; five is the usual maximum before labels crowd on a small phone.

**Step 2: what keeps the tab bar.** Browsing groceries (categories, a category, a product) should keep the tab bar so
the user can hop to Orders and back without losing their place. So groceries/ gets a Stack:

    app/(tabs)/groceries/_layout.tsx       Stack, anchor 'index'
    app/(tabs)/groceries/index.tsx         /groceries
    app/(tabs)/groceries/[category].tsx    /groceries/dairy
    app/(tabs)/groceries/product/[sku].tsx /groceries/product/AMUL-500

**Step 3: what hides it.** Cart, checkout and payment are a task: the tab bar would invite the user away mid-payment.
They go in the root stack, above the tabs:

    app/cart.tsx         /cart (opened from a header button on any tab)
    app/checkout.tsx     /checkout
    app/address/new.tsx  presentation: 'modal' in the root layout's Stack.Screen

**Step 4: what notifications open.** Order tracking already lives in the Orders tab (orders/[orderId]); a
notification opens /orders/4521, and because the orders layout has anchor 'index', Back from it goes to the orders
list, not out of the app.

**Step 5: after payment.** On success, router.dismissTo('/orders/4521') or a replace, so Back from tracking does not
return to the payment screen and invite a second payment. Avoid push here.

**Step 6: check against the rules.** Two levels of nesting (root stack, tabs with stacks), every screen answers "tab
bar or not", URLs are clean because (tabs) is a group, and each tab keeps its own history.`,
    mcqs: [
      mcq('A user opens order 4521 in the Orders tab, switches to Home, then taps Orders again. With a stack inside the Orders tab and default options, what do they see?', [
        ['Order 4521, because each tab keeps its own nested stack', true],
        ['The orders list, because switching tabs resets the stack', false],
        ['The Home tab, because the Orders stack was unmounted', false],
      ], 'Each tab keeps its own navigation state, and the test confirmed the path was /orders/4521 again. A reset happens only with popToTopOnBlur: true, and the tab is not unmounted when it loses focus.'),
      mcq('ThaliGo\'s checkout screen should hide the tab bar. Where does app/checkout.tsx go?', [
        ['In the root stack, above the (tabs) group, so it covers the tab bar', true],
        ['Inside (tabs)/orders, with tabBarStyle set to hidden in its options', false],
        ['Inside the (tabs) folder, so the Tabs layout can decide to hide itself', false],
        ['In a drawer layout, because drawers never show the bottom tab bar', false],
      ], 'A screen in the root stack is pushed over the whole tab navigator, so the tab bar is not drawn. Hiding the bar from inside a tab works against the structure and flickers; a drawer is a different pattern for a different kind of app.'),
      mcq('An order screen opened from a notification has nothing under it in the Orders stack. Which change puts the orders list under it?', [
        ['Export unstable_settings = { anchor: \'index\' } from orders/_layout.tsx', true],
        ['Set backBehavior to \'history\' on the Tabs navigator in (tabs)/_layout.tsx', false],
        ['Call router.push(\'/orders\') in a useEffect inside the order screen', false],
        ['Rename orders/index.tsx to orders/_index.tsx so it is always mounted', false],
      ], 'The anchor tells the stack which screen sits at its bottom when a deeper URL is opened; in the test Back then went to /orders. backBehavior is about tabs, pushing in an effect adds the list on top rather than underneath, and underscore names are not a routing feature.'),
    ],
    checkpoint: [
      mcq('Why is the tabs folder in ThaliGo named (tabs) with parentheses?', [
        ['It is a group, so it organises files without adding a URL segment', true],
        ['Parentheses tell Expo Router to lazy-load the screens in that folder', false],
        ['Only folders named in parentheses are allowed to contain a _layout file', false],
        ['It marks the folder as protected, so signed-out users cannot open it', false],
      ], 'A group keeps the Orders tab at /orders rather than /(tabs)/orders. Laziness is a tab option, any folder can have a _layout, and protection comes from Stack.Protected, not from folder names.'),
      mcq('On Android, a user on ThaliGo\'s Account tab presses the system Back button. With the tab navigator\'s default backBehavior, what happens?', [
        ['The app goes to the first tab, Home; Back again leaves the app', true],
        ['The app goes to whichever tab the user visited just before Account', false],
        ['Nothing happens, because tabs ignore the Android hardware back button', false],
        ['The app closes immediately, because a tab has no screen to go back to', false],
      ], 'The default is firstRoute: Back returns to the first tab, then exits. Returning to the previously visited tab is the history behaviour, which you choose explicitly; none is also a choice, not the default.'),
      mcq('A restaurant-partner app has eight top-level sections used by owners all day. Which navigation fits best?', [
        ['A drawer listing the sections, with stacks inside where needed', true],
        ['Eight bottom tabs, with smaller labels so that they all still fit', false],
        ['A single stack, with every section pushed from a long home screen', false],
        ['Top tabs, swiping sideways through all eight sections in order', false],
      ], 'A drawer holds many sections without crowding the screen, and staff learn it quickly. Eight bottom tabs are unreadable on a phone, a single stack makes every section several taps away, and swiping through eight top tabs is slow to reach the last one.'),
    ],
  },

  /* ── AUTH_FLOW ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_NAVIGATION_AUTH_FLOW',
    notes: `On the web, "Protected Routes and Redirects" wrapped private pages in a RequireAuth component that sent a
signed-out visitor to /login with a Navigate and remembered where they were going. A phone app has the same need with
three differences: the app must decide **at launch**, before drawing anything, whether a saved session exists; Back
must never return a signed-out user to a private screen (or a signed-in user to the login screen); and links can
arrive from outside the app at any moment.

## Three states, not two

A user is not "logged in or not". At launch the app is **restoring**: it has not yet read the saved token from
secure storage, which is an async call. Model that honestly with a union type:

    export type Session = { token: string; phone: string; expiresAt: number };

    export type AuthState =
      | { status: 'restoring' }
      | { status: 'signedOut' }
      | { status: 'signedIn'; session: Session };

A boolean isLoggedIn that starts false treats "not read yet" as "signed out". The bug that causes is shown at the end
of this lesson.

## Restoring the session

    export async function restoreSession(store: TokenStore, now: number = Date.now()): Promise<Session | null> {
      let raw: string | null;
      try {
        raw = await store.get();
      } catch {
        return null; // keystore unavailable: treat as signed out, never crash on launch
      }
      if (!raw) return null;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (isSession(parsed) && parsed.expiresAt > now) return parsed;
      } catch {
        // corrupt JSON falls through to clear
      }
      await store.clear();
      return null;
    }

Four tests pass on it: a valid session comes back; an expired one and corrupt JSON both return null and clear the
store; a store that throws returns null. The store is an interface (get, set, clear); in the app it wraps
expo-secure-store, which keeps the value in the Android Keystore or iOS Keychain ("Secrets on the Device: SecureStore
and Keystore" covers why not plain storage). Passing it in keeps the logic testable without a phone.

A provider holds the state with useReducer, calls restoreSession once on mount, and exposes signIn and signOut, which
write or clear the store and then dispatch.

## The splash screen covers the wait

    import * as SplashScreen from 'expo-splash-screen';
    SplashScreen.preventAutoHideAsync();          // at module scope, before the first render

    function RootNavigator() {
      const { state } = useSession();
      useEffect(() => {
        if (state.status !== 'restoring') SplashScreen.hideAsync();
      }, [state.status]);
      if (state.status === 'restoring') return null; // the native splash is still on screen
      ...
    }

The user sees the logo for the few milliseconds the read takes, then the right first screen. No flash of the sign-in
screen for a user who is already signed in.

## Protected screens

Expo Router's Stack.Protected takes a guard. Screens inside are only reachable while the guard is true:

    const signedIn = state.status === 'signedIn';
    return (
      <Stack>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="restaurant/[id]" options={{ title: 'Restaurant' }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    );

When a guard is false, navigating to its screens redirects to the navigator's anchor (the first available screen),
and when a guard flips, the screens it hides are removed from history. So **sign-in and sign-out do not navigate**:
they change state, and the navigator follows. ThaliGo's test:

    fireEvent.press(await screen.findByText('Log out'));
    expect(await screen.findByText('Sign in to ThaliGo')).toBeTruthy();
    expect(screen).toHavePathname('/sign-in');
    expect(mockStore.has(KEY)).toBe(false);
    expect(router.canGoBack()).toBe(false);        // passed: no way back to Account

React Navigation apps do the same by rendering different screens conditionally, isSignedIn ? (Home, Orders...) :
(SignIn); older Expo Router code renders <Redirect href="/sign-in" /> from a group layout. Same idea; Protected is
the current, cleaner form.

## Going where the link pointed

A signed-out user taps a WhatsApp link to /orders/4521. The guard sends them to sign-in. After the OTP they should land
on order 4521, not Home. The web version kept location in Navigate's state; here we remember the path ourselves:

    if (state.status === 'signedOut' && !wasSignedIn.current && pathname !== '/sign-in' && pathname !== '/') {
      pendingPath.current = pathname;
    }
    useEffect(() => {
      // Wait until the guard has moved us off /sign-in, then go where the link pointed
      if (signedIn && pathname !== '/sign-in' && pendingPath.current) {
        const target = pendingPath.current;
        pendingPath.current = null;
        router.replace(target as Href);
      }
    }, [signedIn, pathname]);

The first version replaced as soon as signedIn became true and the test landed on "/": the guard's own redirect ran
after ours. Waiting until the path has left /sign-in fixed it (render log: signedIn /sign-in, then /, then
/orders/4521). wasSignedIn stops a logout from recording the Account screen as a "pending" destination.

## Logging out cleanly

Logout is more than forgetting a token:

- Clear the token from secure storage (otherwise the next launch signs them back in).
- Clear cached server data, e.g. the TanStack Query client and any persisted Zustand store, so the next person on a
  shared family phone does not see the previous user's orders.
- Tell the server: revoke the refresh token and unregister the push token ("Login, Tokens and Refresh" and the
  notifications lesson cover the calls).
- Then flip the state, and let the guard take the navigation.

When the API returns 401 and refresh fails, call the same signOut: one exit path, tested once.

## Guards are for the user, not for security

Protected screens stop a user stumbling into a screen that needs data they cannot fetch. They do not protect the
data: anyone can modify an app on their own phone. Every API call checks the token on the server.

## The bug a boolean causes

A layout that treats restoring as signed out was tested with a saved session and a link to /orders/4521. Result:
the screen ended on "/". The guard saw "signed out" for a moment, redirected to sign-in, lost the link, then the
restore finished and the guard sent the user Home. A three-state model and returning null while restoring avoid it.`,
    workedExample: `**Scenario.** ThaliGo's support team reports: "A customer taps the 'Rate your order' link in our SMS, logs in with
the OTP, and lands on Home. They give up." Reproduce it, fix it, and keep it fixed.

**Step 1: reproduce in a test, not on a phone.** renderRouter can start the app at any URL with no saved session:

    it('sends a signed-out deep link to sign-in, then on to the order', async () => {
      await open('/orders/4521');
      expect(await screen.findByText('Sign in to ThaliGo')).toBeTruthy();
      fireEvent.press(screen.getByText('Verify OTP'));
      expect(await screen.findByText('Tracking order 4521')).toBeTruthy();
      expect(screen).toHavePathname('/orders/4521');
    });

Before the fix it failed: after sign-in the path was "/".

**Step 2: find where the path is lost.** A temporary console.log of status and pathname in RootNavigator printed:

    restoring /orders/4521
    signedOut /orders/4521
    signedOut /sign-in

So the root layout does see /orders/4521 for one render while signed out, before the guard redirects. Save it then.

**Step 3: first attempt.** Save the path in a ref and router.replace it when signedIn becomes true. The log:

    signedIn /sign-in
    signedIn /orders/4521
    signedIn /

Our replace worked, then the guard's own redirect (sign-in is now guarded out, so go to the anchor) ran after it and
won. The test still failed.

**Step 4: wait for the guard.** Depend on pathname too, and replace only once the path has left /sign-in:

    signedIn /sign-in
    signedIn /
    signedIn /orders/4521

The test passed.

**Step 5: the case the fix could break.** A user logs out from Account: for one render the state is signedOut and
the path is /account, so the code would save /account and send the next person who signs in there. A wasSignedIn ref
skips recording after a logout, and a second test checks the next sign-in lands on Home. Both pass, along with the
rest of the suite.`,
    mcqs: [
      mcq('Why does ThaliGo model auth as restoring, signedOut and signedIn instead of a boolean isLoggedIn?', [
        ['At launch the saved token has not been read yet, and that is not "signed out"', true],
        ['TypeScript cannot narrow a boolean, so screens could not read the session', false],
        ['Stack.Protected only accepts a string status, not a boolean, in its guard', false],
        ['A boolean cannot be stored in SecureStore, which only stores string values', false],
      ], 'Reading secure storage is async, and treating "not read yet" as "signed out" redirects real users to sign-in and loses their link, as the test showed. TypeScript narrows booleans fine, guard takes a boolean, and what is stored is the session JSON, not the flag.'),
      mcq('After logout, which part makes sure Back cannot return the user to the Account screen?', [
        ['The guard flipping to false removes the protected screens from history', true],
        ['Calling router.replace(\'/sign-in\') inside signOut before clearing state', false],
        ['Deleting the token from SecureStore, which unmounts the protected screens', false],
        ['Setting gestureEnabled: false on the sign-in screen in the root layout', false],
      ], 'Stack.Protected removes the screens it hides when its guard changes, and the test confirmed canGoBack() was false. Navigating manually races the guard, storage changes do not touch navigation, and disabling a gesture leaves the Android back button working.'),
      mcq('Why is SplashScreen.preventAutoHideAsync() called at module scope in the root layout file?', [
        ['So the splash stays up until the session restore finishes, with no flash of sign-in', true],
        ['Because hooks cannot run in a layout, so splash code must live outside components', false],
        ['So Expo can prefetch the restaurant list while the logo is still on screen for users', false],
        ['Because the splash screen API throws an error if called inside a React component', false],
      ], 'Called before the first render, it keeps the native splash visible; hideAsync runs once status leaves restoring. Layouts are components and can use hooks, the call fetches nothing, and it does not throw inside components; module scope is about timing.'),
    ],
    checkpoint: [
      mcq('A layout computes signedIn = state.status === \'signedIn\' and renders the guarded Stack even while restoring. A signed-in user taps a link to an order. What happens?', [
        ['The guard redirects to sign-in during the restore and the link is lost', true],
        ['The order opens, because the restore finishes before the first render', false],
        ['The app crashes, because Stack.Protected cannot render while restoring', false],
        ['The splash screen stays forever, because hideAsync is never reached', false],
      ], 'In the test this layout ended on "/" instead of the order: for one render the user looked signed out, and the guard redirected. The restore is async so it cannot finish before the first render, nothing crashes, and the splash is a separate concern.'),
      mcq('Which logout implementation is correct for a shared family phone?', [
        ['Clear the token and cached data, revoke on the server, then flip auth state', true],
        ['Navigate to /sign-in with replace, and leave the token for faster re-login', false],
        ['Flip the auth state only, because the guard clears everything else for you', false],
        ['Clear the token, then call router.dismissAll() to empty the navigation stack', false],
      ], 'Logout must remove the credential, the previous user\'s cached data and the server-side session, then let the guard move the screens. Leaving the token signs them back in at next launch, the guard only changes navigation, and dismissAll does not clear data or tokens.'),
      mcq('An interviewer asks whether Stack.Protected stops a user reading another customer\'s orders. What is right?', [
        ['No; it is navigation UX, and the API must check the token on every request', true],
        ['Yes, because guarded screens are stripped out of the JavaScript bundle', false],
        ['Yes, as long as the session token is kept in SecureStore, not AsyncStorage', false],
        ['No, but adding a second guard inside each screen makes the check secure', false],
      ], 'Anything in the app can be changed by someone on their own device; only the server can enforce access. Guarded screens are still in the bundle, secure storage protects the token at rest rather than the data, and more client-side guards are still client-side.'),
    ],
  },

  /* ── DEEP_LINKS ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_NAVIGATION_DEEP_LINKS',
    notes: `A ThaliGo SMS says "Your order from Annapurna Tiffins is on the way. Track it: https://thaligo.example/orders/4521".
Tapping it should open the app on that order, not the home screen and not a browser. A **deep link** is a URL that
opens a specific screen of an app. Push notifications, WhatsApp shares, emails, QR codes on a restaurant table and
UPI payment returns all rely on them.

## Three kinds of link

- **Custom scheme**: thaligo://orders/4521. Easy: declare the scheme and it works on both platforms. But any app can
  claim the same scheme, nothing proves the link is yours, and if the app is not installed the link does nothing.
- **Android App Links**: an ordinary https://thaligo.example/... URL that Android opens in your app because your
  website says the app is yours. If the app is not installed, the link opens the website.
- **iOS Universal Links**: the same idea on iOS, proved by a file on your domain.

Use https links for anything sent to users (SMS, email, shares); keep the custom scheme for app-to-app returns
(an OAuth redirect, a payment app returning) and for testing.

## In Expo Router the routes already are URLs

Every file in app/ already has a path, so once the app knows its scheme and domain, links open screens with no
mapping code. The scheme goes in app.json:

    {
      "expo": {
        "scheme": "thaligo",
        "android": {
          "package": "in.thaligo.app",
          "intentFilters": [
            {
              "action": "VIEW",
              "autoVerify": true,
              "data": [{ "scheme": "https", "host": "thaligo.example", "pathPrefix": "/orders" }],
              "category": ["BROWSABLE", "DEFAULT"]
            }
          ]
        },
        "ios": { "bundleIdentifier": "in.thaligo.app", "associatedDomains": ["applinks:thaligo.example"] }
      }
    }

These are native settings: they take effect in a new build (a development build or a release), not in a JavaScript
reload. Expo Go uses its own exp:// scheme, so test your scheme in a development build.

## Proving the domain is yours

For Android, the website serves https://thaligo.example/.well-known/assetlinks.json:

    [{
      "relation": ["delegate_permission/common.handle_all_urls"],
      "target": {
        "namespace": "android_app",
        "package_name": "in.thaligo.app",
        "sha256_cert_fingerprints": ["<SHA-256 of the key that signs the installed app>"]
      }
    }]

With autoVerify, Android fetches it when the app is installed. The classic mistake: putting the fingerprint of your
upload key when Google Play re-signs the app with its own app-signing key. The fingerprint must be the key that signs
what users install, which Play Console shows on its app-signing page. For iOS, the domain serves
/.well-known/apple-app-site-association listing your team and bundle id under applinks. Both files must be served
over https with no redirect.

## Links into nested screens

/orders/4521 lives inside the Orders tab's stack. As the tabs lesson showed, unstable_settings = { anchor: 'index' }
in orders/_layout.tsx puts the list under it, so Back goes to the orders list. ThaliGo's test:

    await open('/orders/4521');
    expect(await screen.findByText('Tracking order 4521')).toBeTruthy();
    expect(screen).toHaveSegments(['(tabs)', 'orders', '[orderId]']);
    await act(() => router.back());
    expect(screen).toHavePathname('/orders');      // passed

And when the user is signed out, the auth lesson's pending-path code takes them to the order after the OTP.

## Rewriting old URLs: +native-intent

ThaliGo's old campaign links look like thaligo://o?id=4521. Rather than keep an extra screen, app/+native-intent.tsx
can rewrite every incoming URL before Expo Router matches it:

    export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
      try {
        const url = new URL(path, 'https://thaligo.example');
        // In thaligo://o?id=4521 the "o" is parsed as the host, not the path
        const route = url.protocol === 'thaligo:' ? \`/\${url.host}\${url.pathname}\` : url.pathname;
        const id = url.searchParams.get('id') ?? '';
        if (route === '/o' && /^\\d+$/.test(id)) return \`/orders/\${id}\`;
        return path;
      } catch {
        return '/'; // never throw here: an exception in this function can crash the app on launch
      }
    }

The comment about the host is there because the first version checked url.pathname only; for the custom-scheme link
it returned thaligo://o?id=4521 unchanged. The test now checks both forms:

    redirectSystemPath({ path: 'thaligo://o?id=4521', ... })              -> /orders/4521
    redirectSystemPath({ path: 'https://thaligo.example/o?id=4521', ... }) -> /orders/4521

These outputs come from Jest, which runs on Node's URL class. The app itself runs on the phone's JavaScript engine
with the URL implementation Expo provides, so run the same links once on a device before trusting the parser.

## A link is untrusted input

Anyone can type thaligo://orders/abc or send a link with someone else's order id. So:

- Validate params in the screen. ThaliGo's order screen checks /^\\d+$/ and shows "That order link is not valid"
  (tested), and +not-found catches unknown paths (tested with /offers/diwali).
- The server decides whether this user may see order 4521; the app just asks.
- Never act from a link alone: a link may open a payment or delete screen, but the user confirms. "Mobile App
  Security Basics" returns to deep-link abuse in apps you own.

## React Navigation's linking config

Without Expo Router you map URLs to screens yourself:

    export const linking: LinkingOptions<RootStackParamList> = {
      prefixes: ['thaligo://', 'https://thaligo.example'],
      config: { screens: { Home: '', Restaurant: 'restaurant/:id' } },
    };
    <NavigationContainer linking={linking}> ... </NavigationContainer>

getStateFromPath('restaurant/27', linking.config) returned
{"routes":[{"name":"Restaurant","params":{"id":"27"},"path":"restaurant/27"}]}: only the Restaurant screen, nothing
underneath. The same anchor problem, solved there with initialRouteName in the config.

## Testing links

- **In Jest** (done here): renderRouter with initialUrl checks that a path reaches the right screen, signed in or out.
- **On an emulator or phone** (not runnable in this course's environment; commands from the Android and Expo docs):

      adb shell am start -W -a android.intent.action.VIEW -d "thaligo://orders/4521" in.thaligo.app
      adb shell pm get-app-links in.thaligo.app          # did App Link verification succeed?
      xcrun simctl openurl booted "https://thaligo.example/orders/4521"
      npx uri-scheme open "thaligo://orders/4521" --android

Test three starts for each link: app not running (cold start), app in the background, and app not installed.`,
    workedExample: `**Scenario.** Marketing will send 2 lakh SMS for a Sunday biryani offer. Each contains
https://thaligo.example/restaurant/27. On a phone with ThaliGo installed it must open restaurant 27; without the app,
the website's restaurant page. Plan the work and the checks.

**Step 1: the route exists.** app/restaurant/[id].tsx already handles /restaurant/27 and shows "Restaurant not
found" for a bad id. No new screen.

**Step 2: let Android claim the path.** The intent filter only covered /orders. Add a second data entry so the
filter matches both prefixes:

    "data": [
      { "scheme": "https", "host": "thaligo.example", "pathPrefix": "/orders" },
      { "scheme": "https", "host": "thaligo.example", "pathPrefix": "/restaurant" }
    ]

This is a native change: it needs a new build in users' hands before the SMS goes out. Plan the release first.

**Step 3: the website side.** assetlinks.json must list in.thaligo.app with the SHA-256 of the Play app-signing key.
The website must also serve a real /restaurant/27 page, because that is what users without the app will see.

**Step 4: signed-out users.** Many recipients have the app but were logged out. The guard sends them to sign-in and
the pending-path code returns them to /restaurant/27 afterwards. A Jest test copies the order test with the new URL:

    await open('/restaurant/27');
    expect(await screen.findByText('Sign in to ThaliGo')).toBeTruthy();

**Step 5: test on devices before sending.** On a mid-range Android phone with the release build: adb shell pm
get-app-links in.thaligo.app should show the domain as verified; then tap the link from the Messages app with the app
closed, in the background, and uninstalled. If verification failed, Android shows a chooser or opens the browser,
which almost always means a wrong fingerprint or an assetlinks.json served with a redirect.

**Step 6: measure.** Add a utm query parameter to the link; the screen can read it with useLocalSearchParams and
send it to analytics, without changing the route.`,
    mcqs: [
      mcq('Why should an SMS to customers use https://thaligo.example/orders/4521 rather than thaligo://orders/4521?', [
        ['The https link is verified as yours and falls back to the website', true],
        ['Custom schemes are blocked by Android in messages from businesses', false],
        ['Expo Router can only match https links, not links with a scheme', false],
        ['The https link opens faster because it skips the JavaScript bundle', false],
      ], 'An App Link or Universal Link is proved by a file on your domain and opens the website when the app is missing; a custom scheme can be claimed by any app and does nothing without the app. Android does not block schemes in SMS, Expo Router handles both, and neither link skips loading the app.'),
      mcq('App Link verification fails for ThaliGo\'s Play Store build although assetlinks.json is online. What is the most likely cause?', [
        ['It lists the upload key fingerprint, not the Play app-signing key', true],
        ['The file must be named assetlinks.txt for Android to be able to read it', false],
        ['The app.json scheme is thaligo, but it must match the domain name', false],
        ['Android checks verification only for apps that were installed via adb', false],
      ], 'When Play re-signs the app, the installed app carries Play\'s app-signing key, so the file must list that fingerprint. The name assetlinks.json is fixed, the custom scheme is unrelated to https verification, and Play installs are exactly the ones verified.'),
      mcq('In ThaliGo\'s +native-intent, why does the function return \'/\' from its catch block instead of rethrowing?', [
        ['An exception in this function can crash the app while it is launching', true],
        ['Expo Router retries a failed rewrite, and the retry loops without end', false],
        ['TypeScript requires every code path to return a string in this file', false],
        ['Returning \'/\' tells Expo Router to show the +not-found screen instead', false],
      ], 'redirectSystemPath runs while the app opens from a link, and the Expo docs warn that throwing there can crash the app, so a bad URL falls back to home. There is no retry loop, the return type could be satisfied by rethrowing, and "/" is the home route, not not-found.'),
    ],
    checkpoint: [
      mcq('A user taps thaligo://orders/4521 while the app is installed but closed. What must exist for it to open the order screen?', [
        ['The scheme in app.json, in an installed build, and a route matching orders/4521', true],
        ['An assetlinks.json file on the domain that lists the app\'s package and key', false],
        ['A linking config object passed to Expo Router\'s root layout as a prop', false],
        ['A listener added with Linking.addEventListener in the order screen itself', false],
      ], 'A custom scheme needs only the native scheme registration (which a build includes) and a route for the path; Expo Router maps it. assetlinks.json is for https App Links, Expo Router needs no linking config prop, and listeners are for handling URLs by hand.'),
      mcq('A deep link opens /orders/4521 and the user presses Back. With anchor \'index\' set in orders/_layout.tsx, where do they go?', [
        ['To the orders list at /orders, which was placed under the order', true],
        ['Out of the app, because the link opened the order screen alone', false],
        ['To the Home tab, because Back from a tab returns to the first tab', false],
        ['Nowhere, because Back is disabled on screens opened from a link', false],
      ], 'The anchor puts the stack\'s index screen underneath, and the test showed Back reaching /orders. Without it the order is alone in its stack and Back leaves the tab; Back is never disabled just because a link opened the screen.'),
      mcq('A link thaligo://orders/abc reaches ThaliGo. What should the order screen do with orderId \'abc\'?', [
        ['Validate it and show "That order link is not valid" rather than load anything', true],
        ['Trust it, because only ThaliGo\'s own servers are able to generate these links', false],
        ['Pass it to the API, which will return an empty order that renders as blank', false],
        ['Convert it with Number(), and open the most recent order if the result is NaN', false],
      ], 'Links are untrusted input that anyone can type, so the screen validates and explains. Nothing restricts who creates links, a blank screen confuses users and hides the error, and silently opening some other order shows the wrong data.'),
    ],
  },

  /* ── DEBUGGING ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_NAVIGATION_DEBUGGING',
    notes: `Six navigation bugs from ThaliGo. For each: read the symptom, find the cause from the evidence, change only what the
cause needs. Every message, log and stack below is real output from TypeScript or from Jest with
expo-router/testing-library on this topic's app. Navigation bugs are rarely crashes; they are users landing on the
wrong screen, so the evidence is usually a path or a printed navigation state.

Two habits first. Print the state: renderRouter's result has getPathname(), getSegments() and getRouterState(), and
a tiny recursive printer of getRouterState() shows every navigator and which screen is focused. And restart the dev
server after changing app.json or adding a native package: those are native changes, and Fast Refresh does not
apply them.

## 1. Every dish is "not found"

**Symptom.** A new dish screen, written next to app/restaurant/[id].tsx, shows "Dish not found" for every dish. The data is
fine and the link has the right id.

**Evidence.** The project has strict TypeScript, and tsc says:

    const { id } = useLocalSearchParams<'/restaurant/[id]'>();
    return DISHES.find((d) => d.id === id);
    error TS2367: This comparison appears to be unintentional because the types 'number' and 'string' have no overlap.

**Cause.** Route params are strings; the dish data has numeric ids. 101 === '101' is false for every dish. In a
JavaScript file there is no error, just the wrong screen.

**Fix.** Convert once at the edge, and treat a non-number as not found:

    const dishId = Number(id);
    const dish = Number.isInteger(dishId) ? DISHES.find((d) => d.id === dishId) : undefined;

And read compiler errors: this one was there before the bug report.

## 2. The link opens Home for users who are already signed in

**Symptom.** Signed-in users who tap an order-tracking link land on Home. Signed-out users are fine, oddly.

**Evidence.** A test with a saved session and initialUrl '/orders/4521' against the team's layout ended with
getPathname() returning "/". The layout:

    const { state } = useSession();
    const signedIn = state.status === 'signedIn'; // 'restoring' is treated as signed out
    return <Stack> ...guarded screens... </Stack>;

**Cause.** The stack renders while the session is still being read. For that render the user looks signed out, so the
guard redirects /orders/4521 to sign-in; then the restore finishes, sign-in is guarded out, and the guard goes to the
anchor, Home. The link is gone.

**Fix.** Do not render the guarded navigator until status leaves 'restoring' (return null with the splash still up).
The same test then shows "Tracking order 4521".

## 3. Back from a notification exits the Orders tab

**Symptom.** A notification opens order 4521. Back goes to the Home tab instead of the orders list.

**Evidence.** The navigation state after opening the link:

    *__root
      *(tabs)
        *orders
          *[orderId]

The Orders stack has one screen, so Back has nothing to pop inside it and the tab navigator goes to its first tab.

**Fix.** In app/(tabs)/orders/_layout.tsx add export const unstable_settings = { anchor: 'index' }. The state becomes
index then [orderId], and router.back() reaches /orders. If the code uses the older initialRouteName key, it still
works in the installed version but logs: "unstable_settings.initialRouteName is deprecated. Use
unstable_settings.anchor instead."

## 4. Old campaign links open "This page does not exist"

**Symptom.** Old SMS links thaligo://o?id=4521 show the not-found screen; the https form of the same link works.

**Evidence.** Call the rewrite function directly in a test:

    redirectSystemPath({ path: 'https://thaligo.example/o?id=4521', initial: true })   -> /orders/4521
    redirectSystemPath({ path: 'thaligo://o?id=4521', initial: true })                 -> thaligo://o?id=4521

**Cause.** The function checked url.pathname === '/o'. In a custom-scheme URL the part after // is the host, so for
thaligo://o?id=4521 the host is "o" and the pathname is empty.

**Fix.** Build the route from host and pathname when the protocol is thaligo:, then match. Both forms now return
/orders/4521, and the test covers both, plus an invalid id that must pass through unchanged.

## 5. After signing in from a link, the user lands on Home anyway

**Symptom.** Code to "remember the link and go there after sign-in" exists, yet the user lands on Home.

**Evidence.** A log of status and pathname on each render of the root layout:

    signedIn /sign-in
    signedIn /orders/4521
    signedIn /

The app did reach the order, for one render, and then went to /.

**Cause.** The effect called router.replace(pending) as soon as signedIn became true. But the guard also reacts to
the same change: sign-in is now guarded out, so it redirects to the anchor, and that redirect ran after ours.

**Fix.** Make the effect depend on pathname as well and replace only when pathname is no longer /sign-in. The log
becomes signedIn /sign-in, then /, then /orders/4521, and the test passes. Two pieces of code navigating on the same
state change is the pattern to look for.

## 6. Two copies of the same restaurant

**Symptom.** QA reports that after tapping "View menu" quickly, Back has to be pressed twice to leave the restaurant.

**Evidence.** The root stack printed after two calls of the button's handler:

    ["(tabs)","restaurant/[id]:12","restaurant/[id]:12"]

**Cause.** The handler calls router.push, which always adds a screen.

**Fix.** Use router.navigate (or a Link without push): navigating to the same route with the same params added
nothing in the test. Use push only when a second copy is really wanted, such as "similar restaurants" chains.`,
    mcqs: [
      mcq('Every dish screen shows "Dish not found" though the link carries the right id. tsc reports TS2367: types \'number\' and \'string\' have no overlap. What is the fix?', [
        ['Convert the string param to a number once, and treat NaN as not found', true],
        ['Change the dish data so every id is stored as a string, in all the APIs', false],
        ['Pass the whole dish object as a param so no lookup by id is needed at all', false],
        ['Silence the error with a cast to any, because the values do look the same', false],
      ], 'Route params are strings; converting at the screen\'s edge fixes the comparison and handles bad links. Rewriting backend ids spreads the change everywhere, whole objects do not belong in URL params, and casting to any hides a comparison that is always false.'),
      mcq('A signed-in user\'s link to /orders/4521 lands on Home, and the layout renders the guarded Stack while the session is restoring. What is the cause?', [
        ['The guard saw a signed-out user for one render and dropped the link', true],
        ['The order route is missing from the root layout\'s list of screens', false],
        ['Deep links are only delivered after the splash screen has been hidden', false],
        ['SecureStore returns null for the first read of each app launch session', false],
      ], 'While restoring, signedIn was false, so the guard redirected away from the order; the test reproduced it with a saved session. The route exists (signed-out users reach it after sign-in), links are not delayed by the splash, and SecureStore returns the saved value.'),
      mcq('A custom-scheme link thaligo://o?id=4521 is not rewritten, but https://thaligo.example/o?id=4521 is. What did the rewrite get wrong?', [
        ['For the custom scheme, "o" is parsed as the host, so the pathname is empty', true],
        ['The URL constructor cannot parse custom schemes and throws on them silently', false],
        ['Query strings are stripped from custom-scheme links before the app sees them', false],
        ['redirectSystemPath is only called for https links, never for custom schemes', false],
      ], 'new URL treats the part after // as the host, so checking only pathname misses it; the fixed function combines host and path. The constructor parsed the URL fine, the query was present, and the function is called for every incoming link.'),
      mcq('Code meant to return a user to their link after sign-in logs: signedIn /sign-in, then /orders/4521, then /. What is happening?', [
        ['The guard\'s redirect to the anchor ran after the code\'s own replace', true],
        ['router.replace is asynchronous, so it was cancelled by the next render', false],
        ['The order screen redirected to Home because the session was not yet saved', false],
        ['The pending path was cleared by the logout tracking before it was used', false],
      ], 'Both the effect and the guard reacted to the same state change, and the guard\'s redirect won; waiting until the path left /sign-in fixed it. The replace did happen (the log shows the order), the order screen has no redirect, and the pending path was used, then overridden.'),
    ],
  },

  /* ── PRACTICE ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_NAVIGATION_PRACTICE',
    notes: `Eight exercises on ThaliGo's navigation, from reading a file tree to testing a link. Write your answer before reading
ours. Where an answer is code, it type-checked under strict TypeScript, and where it is a test, it passed with
jest-expo and expo-router/testing-library.

## 1. Files to URLs (easy)

Give the URL for each file, or say it has none: app/(tabs)/index.tsx, app/(tabs)/orders/[orderId].tsx,
app/restaurant/[id].tsx, app/(tabs)/_layout.tsx, app/+not-found.tsx.

**Answer.** /, /orders/4521 (any id), /restaurant/12 (any id). The _layout file has no URL: it is the navigator for
its folder. +not-found has no URL of its own; it is shown for any path that matches nothing.

## 2. Predict the stack (easy)

The root stack is ["(tabs)"]. Predict it after each call, in order: push('/restaurant/12'), navigate('/restaurant/12'),
navigate('/restaurant/27'), replace('/restaurant/12'), dismissAll().

**Answer.** ["(tabs)", r12]; unchanged (same route, same params, already on top); ["(tabs)", r12, r27];
["(tabs)", r12, r12] (replace swaps the top screen, so r27 is gone and Back cannot reach it); ["(tabs)"].
The earlier lesson printed the push and navigate cases from a real test.

## 3. A safe param (easy)

app/(tabs)/orders/[orderId].tsx must show "Tracking order 4521" for a numeric id and "That order link is not valid"
for anything else. Write the screen.

**Answer.**

    export default function OrderDetail() {
      const { orderId } = useLocalSearchParams<'/orders/[orderId]'>();
      const valid = /^\\d+$/.test(orderId);
      return (
        <View>
          <Stack.Screen options={{ title: valid ? \`Order #\${orderId}\` : 'Order not found' }} />
          <Text>{valid ? \`Tracking order \${orderId}\` : 'That order link is not valid'}</Text>
        </View>
      );
    }

Tested with /orders/4521 and /orders/abc.

## 4. Draw the tree (medium)

A bus-booking app has Search, My Trips and Profile tabs. Search leads to results and a seat picker; booking ends in
payment and a ticket. My Trips lists trips and opens a trip's details. Profile has a "Saved passengers" screen.
Payment must hide the tab bar. Write the app/ tree.

**Answer.**

    app/_layout.tsx                     Stack (root)
    app/(tabs)/_layout.tsx              Tabs: index, trips, profile
    app/(tabs)/index.tsx                /            search form
    app/(tabs)/trips/_layout.tsx        Stack, anchor 'index'
    app/(tabs)/trips/index.tsx          /trips
    app/(tabs)/trips/[pnr].tsx          /trips/AB12CD
    app/(tabs)/profile/_layout.tsx      Stack
    app/(tabs)/profile/index.tsx        /profile
    app/(tabs)/profile/passengers.tsx   /profile/passengers
    app/results.tsx                     /results?from=HYD&to=BLR&date=...   (root stack)
    app/seats/[tripId].tsx              /seats/9081
    app/payment.tsx                     /payment
    app/ticket/[pnr].tsx                /ticket/AB12CD

Results, seats and payment are one task, so they sit in the root stack above the tabs. After payment, replace (or
dismissTo) the ticket so Back cannot reach the payment screen. Search filters are query params, so a results link
can be shared.

## 5. The auth state (medium)

Write the AuthState type and a reducer for the actions RESTORED (with a session or null), SIGNED_IN and SIGNED_OUT.

**Answer.**

    export type AuthState =
      | { status: 'restoring' }
      | { status: 'signedOut' }
      | { status: 'signedIn'; session: Session };

    export function authReducer(state: AuthState, action: AuthAction): AuthState {
      switch (action.type) {
        case 'RESTORED':
          return action.session ? { status: 'signedIn', session: action.session } : { status: 'signedOut' };
        case 'SIGNED_IN':
          return { status: 'signedIn', session: action.session };
        case 'SIGNED_OUT':
          return { status: 'signedOut' };
      }
    }

With strict TypeScript and a union of actions, the switch is exhaustive: adding a new action type without a case
makes the function fail to compile because it could return undefined.

## 6. Test a deep link (medium)

Write a Jest test: a signed-in user opens /orders/4521 from a link, sees the order, and Back goes to the orders list.

**Answer.**

    it('opens an order from a link, with the list underneath it', async () => {
      saveSession();
      await open('/orders/4521');
      expect(await screen.findByText('Tracking order 4521')).toBeTruthy();
      expect(screen).toHaveSegments(['(tabs)', 'orders', '[orderId]']);
      await act(() => router.back());
      expect(screen).toHavePathname('/orders');
    });

saveSession puts a session in the mocked expo-secure-store; open calls renderRouter('./app', { initialUrl }) and
flushes the async restore inside act. Without anchor 'index' in the orders layout, the last line fails.

## 7. Rewrite short links (medium)

Short links look like https://thaligo.example/r/27 and must open /restaurant/27. Extend redirectSystemPath.

**Answer.** Add, after the /o rule:

    const short = route.match(/^\\/r\\/(\\d+)$/);
    if (short) return \`/restaurant/\${short[1]}\`;

Test it with the https form, the thaligo://r/27 form (host "r", pathname "/27", combined to /r/27 by the existing
code), and a non-numeric id, which must pass through and reach +not-found.

## 8. React Navigation param list (hard)

An older ThaliGo module uses React Navigation. Type a stack with Cart (no params), Coupon ({ code?: string }) and
Payment ({ orderId: string; amountPaise: number }), and write a call that fails to compile.

**Answer.**

    type CheckoutParamList = {
      Cart: undefined;
      Coupon: { code?: string };
      Payment: { orderId: string; amountPaise: number };
    };
    const Checkout = createNativeStackNavigator<CheckoutParamList>();
    type PaymentProps = NativeStackScreenProps<CheckoutParamList, 'Payment'>;

    navigation.navigate('Payment', { orderId: '4521' });   // error: amountPaise is missing

Money in paise as an integer avoids floating-point rupees. And because payment should never be re-entered with Back,
the success handler uses navigation.replace or a reset, not navigate.`,
    mcqs: [
      mcq('Which URL does the file app/(tabs)/orders/[orderId].tsx serve?', [
        ['/orders/4521, with the group name left out of the path', true],
        ['/(tabs)/orders/4521, with the group name as the first segment', false],
        ['/tabs/orders/4521, because parentheses are removed but the name stays', false],
        ['/orders?orderId=4521, because dynamic segments become query params', false],
      ], 'Groups do not appear in URLs and [orderId] is a path segment, so the URL is /orders/4521. The group name is dropped entirely, not kept without parentheses, and a dynamic segment is part of the path, not a query string.'),
      mcq('The stack is ["(tabs)", r12, r27]. After router.replace(\'/restaurant/12\'), what is it?', [
        ['["(tabs)", r12, r12], because replace swaps only the top screen', true],
        ['["(tabs)", r12], because replace finds the earlier r12 and pops to it', false],
        ['["(tabs)", r12, r27, r12], because replace behaves exactly like push', false],
        ['["(tabs)", r27, r12], because replace moves the r12 entry to the top', false],
      ], 'replace removes the focused screen and puts the new one in its place; earlier entries stay. Popping back to an existing screen is dismissTo, adding on top is push, and nothing in the router reorders entries.'),
      mcq('In a bus-booking app, where should the payment screen live?', [
        ['In the root stack above the tabs, replaced by the ticket on success', true],
        ['Inside the Search tab\'s stack, so the tab bar stays visible to the user', false],
        ['As a fourth bottom tab, so users can reach payment from anywhere in the app', false],
        ['Inside a drawer, so that it slides over the tabs from the side of the screen', false],
      ], 'Payment is a focused task that hides the tab bar, and replacing it with the ticket stops Back from reopening it. Keeping the tab bar invites the user away mid-payment, a payment tab makes no sense without a booking, and a drawer is for top-level sections.'),
      mcq('Why is the switch in the AuthState reducer exhaustive under strict TypeScript?', [
        ['A missing case leaves a path that returns undefined, which fails to compile', true],
        ['TypeScript adds a hidden default case that throws for unknown actions types', false],
        ['useReducer refuses reducers with fewer cases than the action union has types', false],
        ['The switch is not checked; exhaustiveness needs an ESLint rule to be added', false],
      ], 'The function promises AuthState, and with a union of actions an unhandled type would reach the end and return undefined, which strict mode rejects. TypeScript adds no runtime case, useReducer does not inspect reducers, and no lint rule is needed for this check.'),
      mcq('A short-link rewrite must turn thaligo://r/27 into /restaurant/27. What does new URL(\'thaligo://r/27\') give for host and pathname?', [
        ['Host "r" and pathname "/27", which the code joins into /r/27', true],
        ['Host "" and pathname "/r/27", the same as for an https link', false],
        ['Host "thaligo" and pathname "/r/27", with the scheme as the host', false],
        ['It throws, because URL only accepts the http and https schemes', false],
      ], 'The part after // is the host, so "r" is the host and "/27" the path; the existing code combines them. That is exactly the difference from https links that broke the first rewrite. The scheme is the protocol, not the host, and URL parses custom schemes without throwing.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_NAVIGATION_INTERVIEW_QUESTION',
    notes: `Four questions React Native interviews ask about navigation, at product companies, startups and service companies
alike, with an answer that scores well and the follow-up a good interviewer asks next. Practise aloud, two minutes
each. Interviewers listen for specifics, so swap ThaliGo for an app you built.

## Q1. "How would you structure navigation for an app with login, tabs and detail screens?"

**Model answer.** "A root stack at the top. Inside it, two sets of screens: the sign-in flow, and the signed-in app,
which is a tab navigator with a stack inside each tab that needs detail screens. Screens that should hide the tab bar,
like checkout or a restaurant menu, go in the root stack above the tabs. With Expo Router that is the file tree:
app/_layout.tsx has the Stack, (tabs)/_layout.tsx the Tabs, and orders/_layout.tsx a Stack. I keep auth as three
states, restoring, signed out and signed in, keep the splash up while restoring, and use Stack.Protected guards so
login and logout just change state and the navigator follows. Logout leaves no screen to go back to; I tested that
with canGoBack() returning false."

**Follow-up.** "What if a signed-out user opens a link to a private screen?" — "The guard sends them to sign-in, so
I remember the path they asked for, and after sign-in I replace to it. In my app the first version raced with the
guard's own redirect and landed on Home; I fixed it by waiting until the path had left the sign-in screen, and a Jest
test with renderRouter now covers it."

## Q2. "Expo Router or React Navigation? What is the difference?"

**Model answer.** "Expo Router is built on React Navigation. React Navigation gives navigators and navigation state,
and you declare screens in code with a typed param list. Expo Router makes files the routes, so every screen has a
URL automatically: deep links need almost no mapping, typed routes check every link at compile time, and the
structure is visible in the folder tree. For a new Expo app I use Expo Router. In an existing app on React
Navigation, I would not migrate just for that; I would add a linking config and typed param lists, and the concepts
carry across. The trade-off is that Expo Router's conventions decide some structure for you, and you need to learn
its rules like groups and anchors."

**Follow-up.** "How do you pass data to a screen?" — "An id in the route params, not the object. Params are strings
in the URL, the screen can be opened cold from a link, and the data might change. The screen fetches by id, usually
from a TanStack Query cache, so it is instant when the list already loaded it."

## Q3. "How do deep links work? What are App Links?"

**Model answer.** "A custom scheme like thaligo://orders/4521 works once the scheme is registered, but any app can
claim it and it does nothing if the app is missing. Android App Links and iOS Universal Links use normal https URLs:
the app declares the domain, Android with an intent filter with autoVerify and iOS with associated domains, and the
website proves ownership with assetlinks.json or the apple-app-site-association file. Then the link opens the app,
or the website if it is not installed. Inside the app, each path maps to a screen; with Expo Router the files are
the routes. I validate params because a link is untrusted input, and I set an anchor so Back from a deep-linked
detail screen goes to its list."

**Follow-up.** "The App Link opens a browser chooser instead of the app. Why?" — "Verification failed. The usual
causes are the wrong SHA-256 in assetlinks.json, especially the upload key instead of the Play app-signing key, the
file served through a redirect or with the wrong content, or a domain not covered by the intent filter. I would run
adb shell pm get-app-links with the package name to see the verification state, fix the file, and re-verify."

## Q4. "A user says Back takes them to the wrong place. How do you debug it?"

**Model answer.** "I reproduce it with the path they took, then print the navigation state: which navigators exist,
which screens are in each, which is focused. Most Back bugs are structural: a screen in the wrong navigator, a deep
link that opened a stack with nothing under it, a push where a navigate or replace was needed so there are duplicate
or stale screens, or a tab navigator's backBehavior. In tests I use expo-router's renderRouter, start at the URL,
and assert the path after router.back(). Once I understand it, the test stays as a regression test."

**Follow-up.** "And on Android specifically?" — "The hardware back button and the gesture both go through the
navigator, so the same state explains them. Where a screen must not be left without confirmation, like a half-filled
address, I use usePreventRemove rather than overriding the back button for the whole app."`,
    mcqs: [
      mcq('An interviewer asks how you pass a restaurant to its detail screen. Which answer is strongest?', [
        ['Pass its id in the route; the screen loads it, often from a cache', true],
        ['Pass the whole restaurant object as params so there is no refetch', false],
        ['Store the selected restaurant in a global variable before navigating', false],
        ['Serialise the restaurant to JSON and pass it as a single string param', false],
      ], 'An id works from a link, keeps the URL small and always shows current data, and a query cache makes it instant. Whole objects or JSON in params break cold links and go stale, and a global variable is empty when the screen opens from a notification.'),
      mcq('Asked why an App Link opens a chooser instead of the app, which answer shows real experience?', [
        ['Verification failed; check the assetlinks fingerprint and pm get-app-links', true],
        ['The user has to set ThaliGo as the default browser in Android settings', false],
        ['App Links only work after the app has been opened manually at least once', false],
        ['The custom scheme in app.json does not match the https domain in the link', false],
      ], 'A chooser means Android did not verify the domain, so you check the file and its fingerprint and inspect the verification state with adb. Apps are not browsers, verification does not need a prior launch, and the custom scheme is unrelated to https verification.'),
      mcq('In an interview, which description of Expo Router and React Navigation is accurate?', [
        ['Expo Router is file-based routing built on React Navigation\'s navigators', true],
        ['Expo Router replaced React Navigation, which no longer receives any updates', false],
        ['React Navigation supports deep links while Expo Router does not support them', false],
        ['They are rival libraries, and an app cannot use both of them at the same time', false],
      ], 'Expo Router uses React Navigation\'s navigators and state under file-based routes. React Navigation is maintained, both support deep links (Expo Router gives every file a URL), and Expo Router apps use React Navigation concepts all the time.'),
    ],
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MB_NAVIGATION_CHECKPOINT',
    notes: `Ten questions across the topic: stacks and typed params, tabs, drawers and nesting, auth flows and protected screens,
and deep links. Answer without notes; the result shows which lesson to revisit.`,
    checkpoint: [
      mcq('What does the root app/_layout.tsx file do in an Expo Router app?', [
        ['It decides the navigator that holds the screens in the app folder', true],
        ['It is the home screen, served at the / path of the application', false],
        ['It lists every route the app has, in the same way a routes array does', false],
        ['It runs only on the web build, where it renders the HTML document', false],
      ], 'A _layout file defines the navigator (Stack, Tabs, Drawer) for its folder, and the root one wraps the whole app. The home screen is index.tsx, routes come from files rather than a list, and layouts run on every platform.'),
      mcq('A screen reads { id } from useLocalSearchParams and compares it with numeric ids in local data. What must it do?', [
        ['Convert id with Number() and treat a non-integer as not found', true],
        ['Nothing, because params keep the type that the caller passed in', false],
        ['Use useGlobalSearchParams, which returns params with their types', false],
        ['Compare with == instead of ===, so a string matches a number', false],
      ], 'Params are URL strings, so convert once and handle bad input. The caller\'s number becomes a string, the global hook also returns strings, and loose equality is rejected by TypeScript (TS2367 applies to == too) and hides the real problem.'),
      mcq('ThaliGo\'s Orders tab has a list and a detail screen, and the tab bar should stay visible on both. What is the structure?', [
        ['A Stack in app/(tabs)/orders/_layout.tsx holding index and [orderId]', true],
        ['Both screens in the root Stack, with the tab bar re-drawn by each screen', false],
        ['A second Tabs navigator nested inside the Orders tab, one tab per screen', false],
        ['A Drawer in the orders folder, so the detail can slide in over the list', false],
      ], 'A stack nested in the tab gives Back between list and detail while the tab bar stays. Root-stack screens cover the tab bar, nested tabs would add a second bar, and a drawer is for top-level sections, not list-detail.'),
      mcq('Product wants each tab to start at its first screen whenever the user leaves it. Which option does this?', [
        ['popToTopOnBlur: true on the tab whose nested stack should reset', true],
        ['lazy: false, so the tab is rendered again from scratch on each visit', false],
        ['backBehavior: \'history\', so that leaving a tab clears that tab\'s stack', false],
        ['unstable_settings = { anchor: \'index\' } in the tab\'s stack layout file', false],
      ], 'popToTopOnBlur pops the nested stack when the tab loses focus. lazy controls only the first render, backBehavior controls where Android Back goes between tabs, and the anchor decides what sits under a deep-linked screen, not what happens on leaving.'),
      mcq('What do the three states restoring, signedOut and signedIn give that a boolean cannot?', [
        ['A way to wait for the stored session before choosing the first screen', true],
        ['A way to store the session in SecureStore without serialising to JSON', false],
        ['A way for Stack.Protected to read the session token from the provider', false],
        ['A way to skip the splash screen entirely for users who are signed in', false],
      ], 'The restoring state lets the app hold the splash until it knows, instead of guessing "signed out" and losing links. Storage still needs a string, guards only read a boolean, and the splash is still shown, just for as long as the read takes.'),
      mcq('With Stack.Protected, what should the signOut function do about navigation?', [
        ['Nothing directly: clear data and flip state, and the guard moves the user', true],
        ['Call router.replace(\'/sign-in\') first, then clear the stored session data', false],
        ['Call router.dismissAll(), then push the sign-in screen onto the root stack', false],
        ['Reload the JavaScript bundle so that the app restarts in a signed-out state', false],
      ], 'The guard removes protected screens and redirects when state changes, so manual navigation is unnecessary and can race it. Replace and dismissAll fight the guard, and reloading the bundle is slow and loses state the user needed.'),
      mcq('Why does ThaliGo\'s root layout return null while the session is restoring?', [
        ['The native splash is still visible, and no guard can run on a guess', true],
        ['Returning null makes Expo Router fetch the session from the server', false],
        ['A layout must return null once before it is allowed to render a Stack', false],
        ['It hides the status bar until the session has been read from storage', false],
      ], 'Rendering nothing keeps the splash up and prevents the guard from redirecting a signed-in user, which loses deep links. Expo Router fetches no sessions, layouts have no such rule, and the status bar is unrelated.'),
      mcq('Which statement about custom schemes and App Links is correct?', [
        ['App Links are https URLs verified by a file on your domain', true],
        ['Custom schemes are verified by the Play Store during review', false],
        ['App Links need the app installed, or else the link fails', false],
        ['Custom schemes fall back to the website when no app is found', false],
      ], 'Android verifies App Links against assetlinks.json, and without the app the https link opens the website. Nothing verifies a custom scheme, and a custom-scheme link does nothing when no app handles it.'),
      mcq('A notification opens /orders/4521 and Back leaves the Orders tab. What is the fix?', [
        ['Set the anchor to \'index\' in the Orders stack layout', true],
        ['Push /orders before /orders/4521 when it is tapped', false],
        ['Set backBehavior to \'none\' on the Tabs navigator', false],
        ['Move [orderId].tsx to the root stack of the app', false],
      ], 'The anchor puts the list under a deep-linked detail, so Back goes to /orders. Two pushes add a visible transition and break for links from outside, backBehavior none breaks Back between tabs, and moving the screen hides the tab bar.'),
      mcq('What must app/+native-intent.tsx never do with a URL it cannot parse?', [
        ['Throw, because an exception here can crash the app on launch', true],
        ['Return \'/\', because that loses the user\'s link to the screen', false],
        ['Return the path unchanged, because that skips all the routing', false],
        ['Log it, because logging URLs is not allowed during startup', false],
      ], 'The Expo docs warn that throwing inside redirectSystemPath can crash the app, so the function catches and returns a safe path. Returning "/" or the unchanged path are both reasonable fallbacks (unchanged paths still route, to +not-found if nothing matches), and logging is allowed.'),
    ],
  },
];
