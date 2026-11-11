import { SeedBook } from '../types';

const book: SeedBook = {
  slug: 'track-mobile-app',
  title: 'Mobile App Development (React Native) Interview Questions',
  kind: 'topic',
  subject: 'Mobile App Development (React Native)',
  description: 'The 40 questions React Native freshers face: JavaScript, React and TypeScript, components and navigation, state, storage, APIs and auth, device features, Kotlin basics, testing and Play Store release.',
  color: '#7c3aed',
  emblem: '📱',
  audience: 'careerpilot',
  stages: ['specialize', 'placement'],
  tracks: ['MOBILE_APP'],
  order: 214,
  chapters: [
    {
      title: 'JavaScript, TypeScript and React Fundamentals',
      questions: [
        {
          q: `What is React Native? How is it different from React for the web and from fully native apps?`,
          a: `**React Native** is a framework from Meta for building iOS and Android apps with JavaScript or TypeScript and React. You write components once, and they render **real native UI views**, not a web page in a WebView.

| | React (web) | React Native | Native (Kotlin / Swift) |
|---|---|---|---|
| Renders | HTML DOM in a browser | Native views (\`android.view.View\`, \`UIView\`) | Native views |
| Building blocks | \`div\`, \`span\`, \`img\` | \`View\`, \`Text\`, \`Image\` | Platform widgets |
| Styling | CSS | JS style objects, Flexbox | XML layouts / Jetpack Compose, SwiftUI |
| Code sharing | Web only | Most code shared across Android and iOS | Separate codebase per platform |
| Native APIs | Browser APIs | Through libraries or native modules | Direct |

Why companies pick it: one team ships both platforms, web React developers can move over, and fast refresh speeds up development. Trade-offs: some features need native code, and very graphics-heavy apps may perform better fully native.

**Flutter** is the main alternative: it uses Dart and draws its own widgets instead of using platform views.`,
          d: 'easy',
          at: 'Product companies, startups',
          tip: `Say "native views, not a WebView"; confusing React Native with hybrid Cordova/Ionic apps is a red flag.`,
        },
        {
          q: `What is the difference between props and state in React?`,
          a: `- **Props** are inputs passed **from a parent** to a child component. The child must treat them as **read-only**.
- **State** is data a component **owns and changes** over time, such as a counter, a form value or a loading flag. Updating state with its setter makes React re-render the component.

\`\`\`tsx
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

type Props = { label: string; start?: number };

export function Counter({ label, start = 0 }: Props) {
  const [count, setCount] = useState(start);   // state
  return (
    <Pressable onPress={() => setCount((c) => c + 1)}>
      <Text>{label}: {count}</Text>            {/* label is a prop */}
    </Pressable>
  );
}

// Parent
<Counter label="Cart items" start={2} />
\`\`\`

Rules worth mentioning:
- Never mutate state directly (\`count++\`); always call the setter, and for objects or arrays create a **new copy**.
- Use the **functional update** form (\`c => c + 1\`) when the new value depends on the old one.
- If two siblings need the same data, **lift state up** to their common parent and pass it down as props.`,
          d: 'easy',
          at: 'Product companies, startups',
          tip: `Explain why direct mutation fails: React compares references, so it does not know anything changed.`,
        },
        {
          q: `Explain useEffect, its dependency array and the cleanup function.`,
          a: `\`useEffect\` runs **side effects** after a render: fetching data, subscriptions, timers, listeners.

\`\`\`tsx
import { useEffect, useState } from 'react';
import { AppState, Text } from 'react-native';

export function AppStateLabel() {
  const [status, setStatus] = useState(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', setStatus);
    return () => sub.remove();      // cleanup
  }, []);                           // run once on mount

  return <Text>App is {status}</Text>;
}
\`\`\`

The **dependency array** controls when it runs:
- No array: after **every** render (rarely what you want).
- \`[]\`: once after the first render; cleanup on unmount.
- \`[userId]\`: after the first render and whenever \`userId\` changes.

The **cleanup function** runs before the effect runs again and when the component unmounts. Use it to remove listeners, clear timers and cancel requests, or you get memory leaks and updates on unmounted screens.

Common bugs: forgetting a dependency (stale values), or putting an object created during render in the array (the effect runs every render). In development, React Strict Mode runs effects twice on mount to expose missing cleanups.`,
          d: 'easy',
          at: 'Product companies, startups',
          tip: `Always show a cleanup in your example; it is what interviewers look for in a mobile context.`,
        },
        {
          q: `Why use TypeScript in a React Native project? Show how you type a component's props.`,
          a: `**TypeScript** adds static types to JavaScript. Errors like passing a string where a number is expected, misspelling a prop or forgetting to handle \`undefined\` are caught **in the editor before the app runs**. It also gives autocomplete and makes refactoring a large app much safer. New React Native and Expo projects use TypeScript by default.

\`\`\`tsx
import { Image, Pressable, Text, View } from 'react-native';

type Product = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;          // optional
};

type ProductCardProps = {
  product: Product;
  onAdd: (id: string) => void;
  variant?: 'compact' | 'full'; // union of allowed values
};

export function ProductCard({ product, onAdd, variant = 'full' }: ProductCardProps) {
  return (
    <View>
      {product.imageUrl && <Image source={{ uri: product.imageUrl }} style={{ width: 80, height: 80 }} />}
      <Text>{product.name}</Text>
      {variant === 'full' && <Text>₹{product.price}</Text>}
      <Pressable onPress={() => onAdd(product.id)}><Text>Add</Text></Pressable>
    </View>
  );
}
\`\`\`

Also type API responses, navigation params and Redux state, and keep \`strict: true\` in \`tsconfig.json\`.`,
          d: 'easy',
          at: 'Product companies, startups',
          tip: `Mention typing API responses; that is where most real runtime bugs come from.`,
        },
        {
          q: `Explain promises, async/await and the event loop with an API call example.`,
          a: `JavaScript runs your code on **one thread**. Slow work like network requests is handed off, and the **event loop** runs the callback when it finishes, so the UI stays responsive.

A **Promise** represents a value that will arrive later: pending, then fulfilled or rejected. **async/await** is cleaner syntax over promises.

\`\`\`tsx
type User = { id: number; name: string };

async function fetchUser(id: number): Promise<User> {
  const res = await fetch(\`https://api.example.com/users/\${id}\`);
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);  // fetch does not throw on 404/500
  return res.json() as Promise<User>;
}

async function loadProfile() {
  try {
    const [user, orders] = await Promise.all([
      fetchUser(7),
      fetch('https://api.example.com/users/7/orders').then((r) => r.json()),
    ]);
    console.log(user.name, orders.length);
  } catch (e) {
    console.warn('Could not load profile', e);
  }
}
\`\`\`

Key points:
- \`fetch\` rejects only on network failure; you must check \`res.ok\` yourself.
- \`Promise.all\` runs requests in parallel and fails if any fails; \`Promise.allSettled\` waits for all results.
- **Microtasks** (promise callbacks) run before **macrotasks** (\`setTimeout\`), a classic output-order question.`,
          d: 'medium',
          at: 'Product companies',
          tip: `The "fetch doesn't throw on 404" detail catches many candidates; mention it unprompted.`,
        },
        {
          q: `When do you use useMemo, useCallback and React.memo?`,
          a: `All three avoid unnecessary work during re-renders, which matters on mid-range Android phones.

- **\`React.memo(Component)\`**: skips re-rendering a component if its props are shallowly equal to last time.
- **\`useCallback(fn, deps)\`**: returns the **same function reference** between renders until deps change. Needed when passing callbacks to memoised children, otherwise a new function each render breaks \`React.memo\`.
- **\`useMemo(() => value, deps)\`**: caches the **result of an expensive calculation**.

\`\`\`tsx
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput } from 'react-native';

type Item = { id: string; name: string };

const Row = memo(({ item, onPress }: { item: Item; onPress: (id: string) => void }) => (
  <Pressable onPress={() => onPress(item.id)}><Text>{item.name}</Text></Pressable>
));

export function ProductList({ items }: { items: Item[] }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () => items.filter((i) => i.name.toLowerCase().includes(query.toLowerCase())),
    [items, query],
  );
  const handlePress = useCallback((id: string) => console.log('open', id), []);

  return (
    <>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search" />
      <FlatList data={filtered} keyExtractor={(i) => i.id}
        renderItem={({ item }) => <Row item={item} onPress={handlePress} />} />
    </>
  );
}
\`\`\`

Do not wrap everything: memoisation has a cost. Measure with the React DevTools Profiler first.`,
          d: 'medium',
          at: 'Product companies',
          tip: `Explain how useCallback and React.memo work together; using one without the other often achieves nothing.`,
        },
        {
          q: `What is a custom hook? Write a useDebounce hook in TypeScript.`,
          a: `A **custom hook** is a function whose name starts with \`use\` and that calls other hooks. It lets you reuse **stateful logic** (not UI) between components: data fetching, form handling, timers, permissions.

A debounce hook delays updating a value until the user stops typing, so a search screen calls the API once instead of on every keystroke.

\`\`\`tsx
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);   // typing again cancels the previous timer
  }, [value, delay]);

  return debounced;
}

// Usage in a search screen
function SearchScreen() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      searchProducts(debouncedQuery);
    }
  }, [debouncedQuery]);
  // ...render TextInput bound to query
}
\`\`\`

Rules of hooks apply: call them only at the top level of components or other hooks, never inside loops or conditions. The generic \`<T>\` makes it work for strings, numbers or objects.`,
          d: 'medium',
          at: 'Product companies, startups',
          tip: `Explain why the cleanup is the debounce: each keystroke clears the previous timer.`,
        },
        {
          q: `Explain the React Native architecture: the old bridge, the New Architecture (JSI, Fabric, TurboModules) and Hermes.`,
          a: `**Old architecture (the bridge)**: JavaScript and native code ran separately and talked through an asynchronous **bridge** that serialised every message to JSON. It worked, but heavy traffic (fast scrolling, animations, large data) caused lag, and calls could never be synchronous.

**New Architecture** (default for new apps since React Native 0.76):
- **JSI (JavaScript Interface)**: a C++ layer that lets JavaScript hold references to native objects and call them **directly**, including synchronously. No JSON serialisation.
- **Fabric**: the new rendering system. It works with React's concurrent features and can measure and update layout synchronously when needed, reducing UI jumps.
- **TurboModules**: native modules built on JSI, **loaded lazily** when first used, which helps start-up time.
- **Codegen**: generates type-safe C++ glue from typed TypeScript specs, so JS and native interfaces cannot drift apart.

**Hermes** is a JavaScript engine built for React Native and the default. It **precompiles JS to bytecode** at build time, improving start-up time and memory use, especially on low-end Android phones.

Threads to mention: the **JS thread** runs your React code, the **UI (main) thread** draws native views. A blocked JS thread makes taps and animations feel frozen.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Even a simple "bridge serialised JSON asynchronously; JSI calls native directly" earns credit here.`,
        },
      ],
    },
    {
      title: 'React Native Components, Styling and Navigation',
      questions: [
        {
          q: `What are the core React Native components and what do they map to on Android and iOS?`,
          a: `| Component | Purpose | Android | iOS |
|---|---|---|---|
| \`View\` | Container for layout | \`ViewGroup\` | \`UIView\` |
| \`Text\` | All text must be inside it | \`TextView\` | \`UITextView\`-style text |
| \`Image\` | Local or remote images | \`ImageView\` | \`UIImageView\` |
| \`TextInput\` | Keyboard input | \`EditText\` | \`UITextField\` |
| \`ScrollView\` | Scrolls all its children | \`ScrollView\` | \`UIScrollView\` |
| \`FlatList\` | Efficient, virtualised long lists | Built on ScrollView | Built on ScrollView |
| \`Pressable\` | Handles press, long press, pressed styling | – | – |
| \`Modal\`, \`ActivityIndicator\`, \`Switch\` | Dialogs, spinners, toggles | Native widgets | Native widgets |

\`\`\`tsx
<View style={{ padding: 16 }}>
  <Text style={{ fontSize: 18 }}>Hello, Asha</Text>
  <TextInput placeholder="Search" onChangeText={setQuery} />
  <Pressable onPress={onSubmit}><Text>Go</Text></Pressable>
</View>
\`\`\`

Gotchas: text outside \`<Text>\` throws an error; remote \`Image\` needs explicit width and height; \`Pressable\` is the modern choice over \`TouchableOpacity\`.`,
          d: 'easy',
          at: 'Product companies, startups',
          tip: `Mention that raw strings must be inside \`<Text>\`; it is a common beginner bug interviewers probe.`,
        },
        {
          q: `How does styling and Flexbox work in React Native compared with CSS on the web?`,
          a: `Styles are **JavaScript objects**, usually created with \`StyleSheet.create\`. Property names are camelCase (\`backgroundColor\`), numbers are density-independent pixels, and there are no CSS files, selectors or cascade (only \`Text\` inside \`Text\` inherits text styles).

Layout uses **Flexbox** with different defaults from the web:
- \`flexDirection\` defaults to **\`column\`** (web: \`row\`).
- \`flex\` takes a single number: \`flex: 1\` means "fill the available space".
- Every \`View\` is a flex container by default; no \`display: flex\` needed.

\`\`\`tsx
import { StyleSheet, Text, View } from 'react-native';

export function Header() {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>Orders</Text>
      <Text style={[styles.badge, { opacity: 0.9 }]}>3</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { fontSize: 20, fontWeight: '600' },
  badge: { backgroundColor: '#7c3aed', color: '#fff', paddingHorizontal: 8, borderRadius: 10 },
});
\`\`\`

Style arrays merge left to right. Popular helpers include NativeWind (Tailwind classes) and component libraries such as React Native Paper.`,
          d: 'easy',
          at: 'Product companies, startups',
          tip: `Lead with "default flexDirection is column"; it is the classic difference interviewers ask about.`,
        },
        {
          q: `What is Expo, and when would you choose Expo over the bare React Native CLI?`,
          a: `**Expo** is a framework and set of tools on top of React Native. It provides ready modules for camera, location, notifications, secure storage and more, file-based routing with **Expo Router**, and cloud services (**EAS Build**, **EAS Submit**, **EAS Update**) for building, publishing and over-the-air updates. The official React Native docs recommend starting new apps with a framework such as Expo.

| | Expo | Bare React Native CLI |
|---|---|---|
| Setup | \`npx create-expo-app\`, quick | More manual native setup |
| Native code | Still possible through **development builds** and **config plugins**; \`npx expo prebuild\` generates the android and ios folders | Full direct control of native projects |
| Builds | EAS Build in the cloud or locally | Android Studio and Xcode |
| Updates | EAS Update for JS changes | Set up your own |

**Expo Go** (the sandbox app from the store) only runs modules bundled into it; for custom native libraries you make a **development build** instead.

Choose bare CLI mainly when the team already has a large native codebase, is adding React Native into an existing native app, or needs build setups Expo does not support.`,
          d: 'easy',
          at: 'Startups, product companies',
          tip: `Correct the myth: "Expo means no native code" has not been true since development builds.`,
        },
        {
          q: `When should you use FlatList instead of ScrollView? How do you optimise a FlatList?`,
          a: `- **ScrollView** renders **all** children at once. Fine for short content like a form or a settings page.
- **FlatList** is **virtualised**: it renders only the items near the screen and recycles the rest. Use it for any list that is long or comes from an API.

\`\`\`tsx
import { FlatList, Text, View } from 'react-native';

const ROW_HEIGHT = 72;
type Order = { id: string; title: string };

export function OrderList({ orders, onEnd }: { orders: Order[]; onEnd: () => void }) {
  return (
    <FlatList
      data={orders}
      keyExtractor={(o) => o.id}
      renderItem={({ item }) => <OrderRow order={item} />}
      getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
      initialNumToRender={10}
      windowSize={7}
      onEndReached={onEnd}            // load the next page
      onEndReachedThreshold={0.5}
      ListEmptyComponent={<Text>No orders yet</Text>}
    />
  );
}

const OrderRow = ({ order }: { order: Order }) => (
  <View style={{ height: ROW_HEIGHT }}><Text>{order.title}</Text></View>
);
\`\`\`

Optimisation checklist: a **stable unique key**, memoised row components (\`React.memo\`) and callbacks, \`getItemLayout\` for fixed-height rows, avoid anonymous heavy work in \`renderItem\`, and resized thumbnails instead of full images. For very large or complex lists, Shopify's **FlashList** is a popular faster alternative.`,
          d: 'medium',
          at: 'Product companies',
          tip: `Never use the array index as the key for lists that change; say why (wrong rows re-used after inserts).`,
        },
        {
          q: `How does navigation work with React Navigation? Explain stack, tab and drawer navigators and typed params.`,
          a: `**React Navigation** is the standard library (Expo Router is built on it). Navigators:
- **Stack**: screens pushed on top of each other with a back action (list → details).
- **Bottom tabs**: main sections (Home, Search, Orders, Profile).
- **Drawer**: side menu.

They nest: tabs inside a stack, a stack inside each tab.

\`\`\`tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  Products: undefined;
  ProductDetail: { productId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type ListProps = NativeStackScreenProps<RootStackParamList, 'Products'>;
function ProductsScreen({ navigation }: ListProps) {
  return <Button title="Open" onPress={() => navigation.navigate('ProductDetail', { productId: 'p42' })} />;
}

type DetailProps = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;
function ProductDetailScreen({ route }: DetailProps) {
  return <Text>Product {route.params.productId}</Text>;
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Products" component={ProductsScreen} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
\`\`\`

The param list type makes TypeScript reject a missing \`productId\` or a wrong screen name. Pass **IDs** in params, not whole objects, and fetch fresh data on the screen.`,
          d: 'medium',
          at: 'Product companies',
          tip: `"Pass IDs, not objects" is a good design point; objects in params go stale and break deep links.`,
        },
        {
          q: `How do you handle different screen sizes, notches and platform differences in React Native?`,
          a: `**Screen sizes**
- Build layouts with **Flexbox and percentages**, not fixed widths.
- \`useWindowDimensions()\` gives the current width and height and updates on rotation; switch layouts for tablets.
- Test on a small Android phone (around 360 dp wide) as well as large devices.

**Notches, status bar and gesture areas**
- Use \`react-native-safe-area-context\` (\`SafeAreaProvider\`, \`SafeAreaView\` or \`useSafeAreaInsets\`) so content is not hidden under the notch, status bar or home indicator. Its \`SafeAreaView\` works on both platforms.

**Platform differences**
\`\`\`tsx
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  card: {
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 3 },
    }),
  },
});

const isAndroid = Platform.OS === 'android';
\`\`\`

For bigger differences, create \`DatePicker.android.tsx\` and \`DatePicker.ios.tsx\`; the bundler picks the right file automatically when you import \`./DatePicker\`.

Also respect **font scaling** (users with large text settings) and dark mode with \`useColorScheme()\`.`,
          d: 'medium',
          at: 'Product companies, startups',
          tip: `Shadows (iOS) vs elevation (Android) is a concrete example interviewers recognise immediately.`,
        },
        {
          q: `How do you build a form in React Native that handles the keyboard and validation well?`,
          a: `\`\`\`tsx
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput } from 'react-native';

export function LoginForm({ onSubmit }: { onSubmit: (email: string, pwd: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const cleanEmail = email.trim();
    if (!/^[^@ ]+@[^@ ]+$/.test(cleanEmail)) return setError('Enter a valid email');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    setError(null);
    onSubmit(cleanEmail, password);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>
        <TextInput value={email} onChangeText={setEmail} placeholder="Email"
          keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <TextInput value={password} onChangeText={setPassword} placeholder="Password"
          secureTextEntry returnKeyType="go" onSubmitEditing={submit} />
        {error && <Text style={{ color: 'crimson' }}>{error}</Text>}
        <Pressable onPress={submit}><Text>Log in</Text></Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
\`\`\`

Key details: **controlled inputs**, the right \`keyboardType\` and \`autoCapitalize="none"\` for email, \`secureTextEntry\` for passwords, \`KeyboardAvoidingView\` so the keyboard does not cover fields, and \`keyboardShouldPersistTaps\` so the button works while the keyboard is open. For larger forms, **React Hook Form** with a schema library like **Zod** keeps validation organised.`,
          d: 'medium',
          at: 'Product companies',
          tip: `Mention \`autoCapitalize="none"\` for email; forgetting it is a real bug in many student apps.`,
        },
        {
          q: `How do you implement an authentication flow and deep linking with React Navigation?`,
          a: `**Auth flow**: render **different screen groups based on auth state**, instead of navigating to Login manually. When the token changes, React Navigation swaps the screens and the user cannot go "back" into protected screens after logout.

\`\`\`tsx
export function RootNavigator() {
  const { token, isRestoring } = useAuth();      // token restored from secure storage at start-up
  if (isRestoring) return <SplashScreen />;

  return (
    <Stack.Navigator>
      {token ? (
        <>
          <Stack.Screen name="Home" component={HomeTabs} options={{ headerShown: false }} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
\`\`\`

**Deep linking** maps URLs to screens, so \`shopapp://orders/123\` or \`https://shop.example/orders/123\` opens the right screen:

\`\`\`tsx
const linking = {
  prefixes: ['shopapp://', 'https://shop.example'],
  config: { screens: { OrderDetail: 'orders/:orderId', Login: 'login' } },
};
<NavigationContainer linking={linking}>...</NavigationContainer>
\`\`\`

Native setup is still needed: an intent filter in \`AndroidManifest.xml\` (Android App Links with a verified \`assetlinks.json\`), or the \`scheme\` in Expo's app config. Handle a link that arrives while logged out by saving it and opening it after login. Expo Router gives URL-based routes automatically.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Say why conditional screens beat \`navigate('Login')\`: no back-button route into protected screens.`,
        },
      ],
    },
    {
      title: 'State, Storage, APIs and Auth',
      questions: [
        {
          q: `What are the options for managing state in a React Native app, and when would you use each?`,
          a: `Pick the simplest tool that fits the kind of state:

| State | Example | Good tool |
|---|---|---|
| Local UI state | Input text, modal open, selected tab | \`useState\`, \`useReducer\` |
| Shared app state, changes rarely | Logged-in user, theme, language | **Context API** |
| Complex shared client state | Cart, multi-step forms, offline drafts | **Redux Toolkit** or **Zustand** |
| Server data | Products, orders, profile from an API | **TanStack Query** (React Query) or RTK Query |
| Persisted data | Settings, cached lists | AsyncStorage, MMKV, SQLite |
| Navigation state | Current screen, params | React Navigation |

Points interviewers like:
- **Server state is different** from client state: it needs caching, refetching and loading/error handling. Libraries such as TanStack Query handle that; putting all API data in Redux by hand is a lot of boilerplate.
- Context re-renders every consumer when its value changes, so it is not ideal for fast-changing data.
- Redux Toolkit is common in larger teams for its structure and DevTools; Zustand is lighter with less boilerplate.`,
          d: 'easy',
          at: 'Product companies, startups',
          tip: `Separating server state from client state is the insight that lifts this answer above a list of libraries.`,
        },
        {
          q: `What is AsyncStorage? What should and should not be stored in it?`,
          a: `**AsyncStorage** (\`@react-native-async-storage/async-storage\`) is a simple, **unencrypted**, asynchronous key-value store that persists on the device. Values are strings, so objects are saved as JSON.

\`\`\`tsx
import AsyncStorage from '@react-native-async-storage/async-storage';

type Settings = { darkMode: boolean; language: 'en' | 'hi' | 'ta' };

export async function saveSettings(s: Settings) {
  await AsyncStorage.setItem('settings', JSON.stringify(s));
}

export async function loadSettings(): Promise<Settings | null> {
  const raw = await AsyncStorage.getItem('settings');
  return raw ? (JSON.parse(raw) as Settings) : null;
}
\`\`\`

**Good for**: user preferences, onboarding-seen flags, small cached data, drafts.

**Not for**:
- **Tokens, passwords, personal or payment data**: it is not encrypted. Use the Android Keystore / iOS Keychain through \`expo-secure-store\` or \`react-native-keychain\`.
- **Large or relational data**, or data you need to query: use SQLite (\`expo-sqlite\`), WatermelonDB or Realm.
- Very frequent reads and writes where speed matters: **MMKV** is a much faster synchronous alternative.

All AsyncStorage calls are async, so read stored values during a splash screen before showing the app.`,
          d: 'easy',
          at: 'Product companies, startups',
          tip: `Saying "never store the auth token in AsyncStorage" is the point the question is really testing.`,
        },
        {
          q: `How do you fetch data from an API in a React Native screen and handle loading and error states?`,
          a: `\`\`\`tsx
import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, FlatList, Text, View } from 'react-native';

type Product = { id: string; name: string; price: number };

export function ProductsScreen() {
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('https://api.example.com/products', { signal });
      if (!res.ok) throw new Error(\`Server error \${res.status}\`);
      setData(await res.json());
    } catch (e) {
      if (!signal?.aborted) setError('Could not load products. Check your connection.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();     // cancel if the user leaves the screen
  }, []);

  if (loading) return <ActivityIndicator size="large" />;
  if (error) return <View><Text>{error}</Text><Button title="Retry" onPress={() => load()} /></View>;
  return <FlatList data={data} keyExtractor={(p) => p.id} renderItem={({ item }) => <Text>{item.name}</Text>} />;
}
\`\`\`

Every screen that loads data needs **loading, error (with retry), empty and success** states. Mobile networks are unreliable, so the error state is not optional.`,
          d: 'easy',
          at: 'Product companies, startups',
          tip: `Mention the empty state and the retry button; examiners notice when a candidate thinks about bad networks.`,
        },
        {
          q: `Show how you would manage a shopping cart with Redux Toolkit in TypeScript.`,
          a: `\`\`\`tsx
// store/cartSlice.ts
import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';

type CartItem = { id: string; name: string; price: number; qty: number };
type CartState = { items: CartItem[] };

const initialState: CartState = { items: [] };

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<Omit<CartItem, 'qty'>>) {
      const existing = state.items.find((i) => i.id === action.payload.id);
      if (existing) existing.qty += 1;          // Immer makes this "mutation" safe
      else state.items.push({ ...action.payload, qty: 1 });
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.id !== action.payload);
    },
    clearCart(state) {
      state.items = [];
    },
  },
});

export const { addItem, removeItem, clearCart } = cartSlice.actions;
export const store = configureStore({ reducer: { cart: cartSlice.reducer } });
export type RootState = ReturnType<typeof store.getState>;

export const selectCartTotal = (s: RootState) =>
  s.cart.items.reduce((sum, i) => sum + i.price * i.qty, 0);
\`\`\`

In components: wrap the app in \`<Provider store={store}>\`, read with \`useSelector(selectCartTotal)\` and update with \`dispatch(addItem(product))\`. **Redux Toolkit** removes old Redux boilerplate; \`createSlice\` uses **Immer**, so reducers can be written as mutations while state stays immutable. Persist the cart with redux-persist or by saving it to storage.`,
          d: 'medium',
          at: 'Product companies',
          tip: `Explain why "mutating" inside createSlice is fine: Immer produces a new immutable state.`,
        },
        {
          q: `How do you implement secure login with JWT tokens in a mobile app?`,
          a: `**Typical token flow**
1. User logs in with email and password (or OTP) over **HTTPS**.
2. The server returns a short-lived **access token** (minutes) and a longer-lived **refresh token**.
3. The app stores tokens in **secure storage**: Android Keystore and iOS Keychain through \`expo-secure-store\` or \`react-native-keychain\`. **Not** AsyncStorage.
4. Every API request sends \`Authorization: Bearer <accessToken>\`.
5. When the API returns **401** because the access token expired, the app calls the refresh endpoint, saves the new tokens and retries the request.
6. If refresh fails, log the user out and clear storage.

\`\`\`tsx
import * as SecureStore from 'expo-secure-store';

export async function saveTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync('accessToken', access);
  await SecureStore.setItemAsync('refreshToken', refresh);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync('accessToken');
  await SecureStore.deleteItemAsync('refreshToken');
}
\`\`\`

**More good practices**
- Never put API secret keys in the app bundle; anything shipped in the app can be extracted.
- Offer **biometric unlock** (\`expo-local-authentication\`) to protect the stored session.
- Use **OAuth 2.0 with PKCE** for "Sign in with Google" style logins.
- Log out on the server too (revoke the refresh token).`,
          d: 'medium',
          at: 'Product companies',
          tip: `"Anything in the app bundle can be extracted" is the security principle interviewers want you to know.`,
        },
        {
          q: `What problems does TanStack Query (React Query) solve compared with fetching in useEffect?`,
          a: `Fetching in \`useEffect\` means writing loading, error, caching, retry and refetch logic yourself on every screen. **TanStack Query** manages **server state** for you:

- **Caching**: data is stored by a **query key**; returning to a screen shows cached data instantly while it refetches in the background.
- **Deduplication**: two components asking for the same key make one request.
- **Retries** with backoff on failure.
- **Stale time and refetching**: on focus, reconnect or interval.
- **Mutations** with cache invalidation, and **optimistic updates**.
- **Pagination and infinite scroll** helpers.

\`\`\`tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get<Order[]>('/orders').then((r) => r.data),
    staleTime: 60_000,
  });
}

function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(\`/orders/\${id}/cancel\`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

// In a screen
const { data, isPending, isError, refetch } = useOrders();
\`\`\`

In React Native, wire its \`focusManager\` to \`AppState\` and \`onlineManager\` to NetInfo so "refetch on focus" and "on reconnect" work like they do in browsers.`,
          d: 'medium',
          at: 'Product companies',
          tip: `Mention the React Native focus and online managers; it shows you used it on mobile, not just web.`,
        },
        {
          q: `How would you make an app work offline or on a poor network?`,
          a: `Many Indian users move between 4G, weak signal and no signal, so offline behaviour is a real requirement.

1. **Detect connectivity** with \`@react-native-community/netinfo\` and show a small "You are offline" banner instead of failing silently.
\`\`\`tsx
import NetInfo from '@react-native-community/netinfo';
const unsubscribe = NetInfo.addEventListener((state) => setOnline(!!state.isConnected));
\`\`\`
2. **Cache reads**: keep the last fetched lists and details (TanStack Query persistence, MMKV or SQLite) and show them with a "last updated" time.
3. **Queue writes**: when offline, save actions (like "add note" or "mark delivered") in a local queue with a unique ID; sync when the connection returns, and let the server ignore duplicates using that ID.
4. **Optimistic UI**: update the screen immediately, roll back with a message if the server rejects it.
5. **Handle conflicts**: decide rules such as last-write-wins or server-wins for data edited on two devices.
6. **Efficient networking**: timeouts and retries with backoff, pagination, compressed and resized images, avoid refetching unchanged data.

For data-heavy offline apps, a local database with sync support (WatermelonDB, Realm, or SQLite with your own sync) is the right base.`,
          d: 'medium',
          at: 'Product companies, startups',
          tip: `Unique IDs for queued writes (so retries don't duplicate) is the detail that shows real offline experience.`,
        },
        {
          q: `Write an axios setup that adds the access token to requests and refreshes it once on a 401.`,
          a: `\`\`\`tsx
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

export const api = axios.create({ baseURL: 'https://api.example.com', timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) config.headers.Authorization = \`Bearer \${token}\`;
  return config;
});

let refreshing: Promise<string> | null = null;   // shared, so parallel 401s refresh only once

async function refreshAccessToken(): Promise<string> {
  const refreshToken = await SecureStore.getItemAsync('refreshToken');
  if (!refreshToken) throw new Error('No refresh token');
  const { data } = await axios.post('https://api.example.com/auth/refresh', { refreshToken });
  await SecureStore.setItemAsync('accessToken', data.accessToken);
  await SecureStore.setItemAsync('refreshToken', data.refreshToken);
  return data.accessToken;
}

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
  if (error.response?.status !== 401 || !original || original._retry) throw error;
  original._retry = true;
  try {
    refreshing ??= refreshAccessToken().finally(() => { refreshing = null; });
    const newToken = await refreshing;
    original.headers.Authorization = \`Bearer \${newToken}\`;
    return api(original);
  } catch (e) {
    await logout();          // clear tokens and go to the login screen
    throw e;
  }
});
\`\`\`

Key points: the refresh call uses plain \`axios\` so it does not loop through the interceptor; \`_retry\` stops infinite retries; the shared \`refreshing\` promise prevents five parallel requests from triggering five refreshes.`,
          d: 'hard',
          at: 'Product companies',
          tip: `The single shared refresh promise is what interviewers look for; without it, parallel 401s cause a refresh storm.`,
        },
      ],
    },
    {
      title: 'Device Features, Native Android, Testing and Performance',
      questions: [
        {
          q: `How do runtime permissions work on Android, and how do you request one in React Native?`,
          a: `Android has two parts:
1. **Declare** the permission in \`AndroidManifest.xml\`, such as \`<uses-permission android:name="android.permission.CAMERA" />\`. (In Expo, through the app config or the library's config plugin.)
2. **Request at runtime** for "dangerous" permissions (camera, location, microphone, contacts, notifications on Android 13+). The user can allow, deny, or deny permanently.

\`\`\`tsx
import { PermissionsAndroid, Platform, Linking } from 'react-native';

export async function ensureCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;     // iOS handled by the camera library
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
    title: 'Camera access',
    message: 'We need the camera to scan the QR code on your parcel.',
    buttonPositive: 'Allow',
  });
  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    Linking.openSettings();    // only the user can turn it back on
  }
  return result === PermissionsAndroid.RESULTS.GRANTED;
}
\`\`\`

Good practice: ask **at the moment the feature is used**, explain why first, handle denial gracefully (the app should still work without the feature), and request only what you need. Expo modules offer simpler \`requestPermissionsAsync()\` functions for both platforms.`,
          d: 'easy',
          at: 'Product companies, startups',
          tip: `Asking in context with a reason is also a Play Store policy expectation; mention it.`,
        },
        {
          q: `Explain the Android Activity lifecycle and how React Native apps detect foreground and background.`,
          a: `An Android **Activity** (a screen; React Native apps usually run in one \`MainActivity\`) moves through these callbacks:

| Callback | When |
|---|---|
| \`onCreate\` | Activity is created; set up the UI |
| \`onStart\` | Becoming visible |
| \`onResume\` | In the foreground and interactive |
| \`onPause\` | Losing focus (dialog, another app opening); save quick state |
| \`onStop\` | No longer visible |
| \`onDestroy\` | Being destroyed (finished, or recreated on rotation/config change) |

Android may **kill a background app's process** to free memory, so important state must be saved, not just kept in memory.

In React Native, use the **AppState** API:

\`\`\`tsx
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

export function useOnForeground(callback: () => void) {
  const current = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (current.current.match(/inactive|background/) && next === 'active') callback();
      current.current = next;
    });
    return () => sub.remove();
  }, [callback]);
}
\`\`\`

Use it to refresh data, re-check a session timeout, or pause a video when the app goes to the background.`,
          d: 'easy',
          at: 'Product companies',
          tip: `Mention that Android can kill background processes; it explains why you persist state.`,
        },
        {
          q: `How do you get the user's location in a React Native app? What should you be careful about?`,
          a: `With Expo's \`expo-location\` (works in bare apps too):

\`\`\`tsx
import * as Location from 'expo-location';

export async function getCurrentCoords() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission denied');
  }
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

// Live tracking, for example a delivery partner's screen
export async function startWatching(onMove: (lat: number, lng: number) => void) {
  return Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, distanceInterval: 20 },   // every 20 m
    (pos) => onMove(pos.coords.latitude, pos.coords.longitude),
  );                                                              // call .remove() to stop
}
\`\`\`

Things to be careful about:
- **Foreground vs background** location: background tracking needs a separate permission, a strong reason, and Play Store review (a declaration form explaining the use).
- **Battery**: use the lowest accuracy that works and a distance or time interval; stop watching when the screen closes.
- **Privacy**: explain why you need it, send only what is needed to the server, and follow the privacy policy and Play Data safety form.
- Handle **GPS turned off** and slow first fixes with a timeout and a fallback (last known position).`,
          d: 'medium',
          at: 'Product companies, startups',
          tip: `Talk about battery and stopping the watcher; it shows you think like a mobile engineer.`,
        },
        {
          q: `What Kotlin basics should a React Native developer know? Show a small example.`,
          a: `You need enough **Kotlin** to read and edit Android code: native modules, \`MainActivity\`, \`MainApplication\`, Gradle files and library setup. Key features:

- \`val\` (read-only) and \`var\` (mutable); type inference.
- **Null safety**: \`String\` can never be null, \`String?\` can; use \`?.\`, \`?:\` (Elvis) and avoid \`!!\`.
- **Data classes** generate \`equals\`, \`hashCode\`, \`toString\` and \`copy\`.
- **Lambdas** and collection functions (\`filter\`, \`map\`).
- \`when\` as a powerful switch; **extension functions**; **coroutines** for async work.

\`\`\`kotlin
data class Order(val id: String, val amount: Double, val couponCode: String? = null)

fun Order.discounted(): Double =
    when (couponCode) {
        null -> amount
        "SAVE10" -> amount * 0.9
        else -> amount
    }

fun main() {
    val orders = listOf(Order("A1", 500.0), Order("A2", 1200.0, "SAVE10"))
    val bigOrders = orders.filter { it.discounted() > 600 }.map { it.id }
    println(bigOrders)                       // [A2]

    val code: String? = orders.first().couponCode
    println(code?.uppercase() ?: "NO COUPON") // NO COUPON
}
\`\`\`

Also be comfortable opening the \`android/\` folder in **Android Studio**, reading **Logcat**, and understanding \`build.gradle\` settings like \`applicationId\`, \`minSdk\`, \`targetSdk\`, \`versionCode\` and \`versionName\`.`,
          d: 'medium',
          at: 'Product companies',
          tip: `Null safety (\`?.\` and \`?:\`) is the Kotlin feature interviewers ask about most.`,
        },
        {
          q: `How do you test a React Native app? Show a component test with React Native Testing Library.`,
          a: `**Testing levels**
- **Unit tests** (Jest): pure functions, reducers, hooks.
- **Component tests** (Jest + **React Native Testing Library**): render a component, interact like a user, assert what is on screen.
- **End-to-end tests** on a real device or emulator: **Detox** or **Maestro** for critical flows like login and checkout.

\`\`\`tsx
// LoginForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { LoginForm } from './LoginForm';

test('shows an error for an invalid email', () => {
  const onSubmit = jest.fn();
  render(<LoginForm onSubmit={onSubmit} />);

  fireEvent.changeText(screen.getByPlaceholderText('Email'), 'ravi@');
  fireEvent.changeText(screen.getByPlaceholderText('Password'), 'Secret@123');
  fireEvent.press(screen.getByText('Log in'));

  expect(screen.getByText('Enter a valid email')).toBeTruthy();
  expect(onSubmit).not.toHaveBeenCalled();
});

test('submits trimmed email and password', () => {
  const onSubmit = jest.fn();
  render(<LoginForm onSubmit={onSubmit} />);
  fireEvent.changeText(screen.getByPlaceholderText('Email'), ' ravi@test.in ');
  fireEvent.changeText(screen.getByPlaceholderText('Password'), 'Secret@123');
  fireEvent.press(screen.getByText('Log in'));
  expect(onSubmit).toHaveBeenCalledWith('ravi@test.in', 'Secret@123');
});
\`\`\`

Test **behaviour the user sees**, not internal state. Mock network calls (for example with MSW or jest mocks) and native modules that do not exist in the Jest environment.`,
          d: 'medium',
          at: 'Product companies',
          tip: `Say "query by what the user sees" (text, label, role); it is Testing Library's core idea.`,
        },
        {
          q: `How do push notifications work in a React Native app?`,
          a: `**The flow**
1. The app asks the user for **notification permission** (required at runtime on Android 13+ and on iOS).
2. The app gets a **device push token**: from **Firebase Cloud Messaging (FCM)** on Android and **APNs** on iOS (or an **Expo push token** that wraps both when using Expo's push service).
3. The app sends the token to **your backend**, linked to the user. Tokens can change, so update them on app start.
4. Your backend sends a message through FCM/APNs (or Expo's push API) when something happens: "Your order is out for delivery".
5. The device shows it. Tapping it opens the app, ideally **deep linking** to the right screen.

\`\`\`tsx
import * as Notifications from 'expo-notifications';

export async function registerForPush(): Promise<string | null> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId: 'your-eas-project-id' });
  return data;   // send this to your server
}
\`\`\`

Also know: **notification vs data messages**, Android **notification channels** (users control each type: orders, offers), handling taps when the app is killed vs in the background, and not spamming, since users disable notifications or uninstall.`,
          d: 'medium',
          at: 'Product companies, startups',
          tip: `Mention notification channels on Android; it shows real Android experience.`,
        },
        {
          q: `How do you call native Android code from React Native? Outline a native module in Kotlin.`,
          a: `When a library does not exist for a device feature or SDK, you write a **native module**.

A classic (legacy-style) Kotlin module that returns the battery level:

\`\`\`kotlin
// android/app/src/main/java/com/shopapp/BatteryModule.kt
package com.shopapp

import android.content.Context
import android.os.BatteryManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class BatteryModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
    override fun getName() = "BatteryModule"

    @ReactMethod
    fun getLevel(promise: Promise) {
        val bm = ctx.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        promise.resolve(bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY))
    }
}
\`\`\`

You also register it in a \`ReactPackage\` added to \`MainApplication\`, then call it from JS:

\`\`\`tsx
import { NativeModules } from 'react-native';
const level: number = await NativeModules.BatteryModule.getLevel();
\`\`\`

In the **New Architecture**, the recommended way is a **Turbo Native Module**: you write a typed TypeScript spec, **Codegen** generates the interface, and calls go through JSI. With Expo, the **Expo Modules API** lets you write the module in Kotlin and Swift with much less boilerplate. Legacy modules still work through the interop layer.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Even if you never wrote one, explain the three parts: native class, registration, JS call.`,
        },
        {
          q: `The app feels slow and janky on mid-range Android phones. How do you find and fix the problem?`,
          a: `**Measure first**
- Test a **release build** on a real mid-range device; debug builds are much slower.
- Turn on the **Perf Monitor** in the dev menu to see JS and UI frame rates: a low **JS FPS** means your JavaScript is busy; a low **UI FPS** means native rendering is heavy.
- Use the **React DevTools Profiler** to find components that re-render too often, and Android Studio's profiler for CPU and memory.

**Common causes and fixes**
- **Unnecessary re-renders**: large Context values, inline objects and functions as props. Use \`React.memo\`, \`useCallback\`, \`useMemo\` and split state.
- **Long lists**: ScrollView with hundreds of items, missing keys. Use FlatList or FlashList, memoised rows, \`getItemLayout\`.
- **Images**: full-size photos for thumbnails. Request resized images from the server or CDN; use a caching image component (such as \`expo-image\`).
- **Heavy JS work** on the JS thread (parsing big JSON, sorting thousands of items): paginate, move work to the server, or defer it until after animations.
- **Animations on the JS thread**: use \`react-native-reanimated\` or the Animated API with \`useNativeDriver: true\` so they run on the UI thread.
- **Start-up time**: keep Hermes on, lazy-load screens, avoid large synchronous work at launch.
- Remove \`console.log\` calls from release builds.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Starting with "test a release build on a real device" shows discipline; profiling a debug build misleads.`,
        },
      ],
    },
    {
      title: 'Scenarios, Release and project questions',
      questions: [
        {
          q: `Walk me through the mobile app you built as your capstone project.`,
          a: `Keep it to about two minutes with a clear structure:

1. **Problem and users**: "A local services app where people in Tier-2 cities book electricians and plumbers."
2. **Features**: sign up with OTP, browse services, book a slot, live status, ratings, push notifications.
3. **Tech stack**: "React Native with Expo and TypeScript, React Navigation, TanStack Query for API data, Zustand for the booking flow, secure store for tokens, a Node or Python REST API, FCM for notifications."
4. **Architecture**: folder structure (\`screens\`, \`components\`, \`hooks\`, \`api\`, \`store\`), how screens get data, how auth works.
5. **One hard problem you solved**: "The bookings list lagged on my friend's budget phone; I switched to FlatList with memoised rows and resized images, and scrolling became smooth."
6. **Quality and release**: tests you wrote, how you built the APK/AAB with EAS, whether it is on the Play Store internal or closed testing track.
7. **What you would improve**: offline mode, analytics, accessibility.

Have the app installed on your phone and be ready to **demo it** and open any file.`,
          d: 'easy',
          at: 'Startups, product companies',
          tip: `A live demo on your own phone is more convincing than any slide; carry a charged phone to interviews.`,
        },
        {
          q: `What are the steps to publish an Android app on the Google Play Store?`,
          a: `1. **Prepare the app**: unique \`applicationId\` (package name), app icon and splash screen, \`versionCode\` (an integer that must increase with every upload) and \`versionName\` (shown to users, like 1.2.0), and a current \`targetSdk\` that meets Google Play's yearly requirement.
2. **Build a release Android App Bundle (AAB)**: Play requires \`.aab\` for new apps, not APK. With Expo, \`eas build -p android --profile production\`; with bare RN, \`./gradlew bundleRelease\` in the \`android\` folder.
3. **Signing**: use **Play App Signing**: you sign uploads with an **upload key**, and Google holds the app signing key. Back up the upload key and passwords safely.
4. **Play Console setup** (one-time developer registration fee): create the app, store listing (title, description, screenshots, feature graphic), category, contact details, **privacy policy URL**, **Data safety** form, content rating questionnaire, target audience, ads declaration.
5. **Testing tracks**: upload to **internal testing** first, then closed or open testing. New personal developer accounts must complete a closed test with a minimum number of testers for a set period before production access.
6. **Production release**: roll out, ideally as a **staged rollout** (for example 10% first), and monitor crashes and reviews.`,
          d: 'easy',
          at: 'Startups, product companies',
          tip: `Knowing AAB, versionCode and Play App Signing covers the follow-ups most interviewers ask.`,
        },
        {
          q: `The app works in debug mode but crashes immediately in the release build. How do you debug it?`,
          a: `**Get the actual error**
\`\`\`bash
adb logcat *:E                          # all errors from a connected device
adb logcat | grep -i "AndroidRuntime"   # Java/Kotlin crash stack traces
\`\`\`
Look for \`FATAL EXCEPTION\` and the JS error message (\`ReactNativeJS\`).

**Common causes**
- **R8 / ProGuard** shrinking removed or renamed classes that a library uses through reflection. Add keep rules from the library's docs to \`proguard-rules.pro\`.
- **Environment config**: API URL or keys come from a \`.env\` that was not included in the release build, so the app calls \`undefined\`. Check how env variables are injected (Expo's \`EXPO_PUBLIC_\` variables, EAS environment variables, or react-native-config).
- **Cleartext HTTP blocked**: release builds on modern Android block plain \`http://\` by default; use HTTPS (debug builds often allow cleartext for the Metro bundler).
- **Code relying on dev-only behaviour**: \`console\` tooling, a debugger, or a library that behaves differently in production.
- **Native library not linked or wrong architecture**.
- **Hermes-specific** behaviour differences if debug used a different engine.

**Prevent it**: build and test a release variant regularly (\`npx react-native run-android --mode release\` or an EAS preview build), and add crash reporting (**Sentry** or **Firebase Crashlytics**) with source maps so production stack traces are readable.`,
          d: 'medium',
          at: 'Product companies',
          tip: `Bringing up R8 keep rules and cleartext HTTP shows you have shipped a real release build.`,
        },
        {
          q: `What are over-the-air (OTA) updates? When can you use them instead of a store release?`,
          a: `A React Native app has two parts:
- **Native code** (Kotlin, Swift, native libraries, permissions, app icon): changing it needs a **new build through the store**.
- **The JavaScript bundle and assets**: can be replaced **over the air**, downloaded by the app on launch, without a store review.

**EAS Update** (Expo) is the common OTA service today. Microsoft's App Center CodePush, which many older tutorials mention, has been retired.

**Use OTA for**: bug fixes in JS, text and UI tweaks, small feature changes, urgent fixes when a store review would take too long.

**You need a store release for**: new native modules or SDK upgrades, permission changes, React Native or Expo SDK version upgrades, app icon or name changes.

**Rules to follow**
- OTA updates must match the native **runtime version** they were built for; shipping JS that calls a missing native module crashes the app.
- Store policies allow updating interpreted code but not changing the app's main purpose or bypassing review.
- Roll out in stages and keep the ability to roll back.
- Bump \`versionCode\`/\`versionName\` only for store builds; OTA updates have their own update IDs.`,
          d: 'medium',
          at: 'Startups, product companies',
          tip: `The runtime-version compatibility point is the one that separates real users of OTA from tutorial readers.`,
        },
        {
          q: `A screen showing 5,000 contacts or products scrolls with blank areas and stutters. How do you fix it?`,
          a: `**Diagnose**: test in a release build on a mid-range phone; watch JS FPS in the Perf Monitor while scrolling; check whether rows re-render on every scroll with the React DevTools Profiler.

**Fixes, in order of impact**
1. Make sure it is a **FlatList** (or **FlashList**), not \`ScrollView\` or \`.map()\` inside a ScrollView.
2. **Paginate**: load 20–50 items at a time with \`onEndReached\`, instead of 5,000 at once; search on the server.
3. **Memoise rows** with \`React.memo\` and pass stable callbacks from \`useCallback\`; avoid creating objects or functions in \`renderItem\`.
4. **Stable keys** from item IDs.
5. **Fixed row height** plus \`getItemLayout\`, so the list does not need to measure each row.
6. **Tune virtualisation**: \`initialNumToRender\`, \`maxToRenderPerBatch\`, \`windowSize\`. A smaller window uses less memory; too small shows blank areas during fast scrolls.
7. **Light rows**: small resized images with caching, fewer nested Views, no heavy calculations per row (pre-compute formatted dates and prices).
8. Move filtering and sorting into \`useMemo\` or to the server.

Blank areas during fast scrolling usually mean rows render too slowly for the window, so lighter rows and FlashList help most.`,
          d: 'medium',
          at: 'Product companies',
          tip: `Pagination first: the fastest list item is the one you never load.`,
        },
        {
          q: `Design the mobile app for a food delivery service like Swiggy or Zomato at a fresher level.`,
          a: `**Main screens**: login with OTP, home (restaurants near me), search, restaurant menu, cart, checkout and payment, live order tracking, order history, profile and addresses.

**App architecture**
- **Navigation**: auth stack vs main app; bottom tabs (Home, Search, Orders, Profile); stack screens for menu, cart and tracking; deep links for notifications (\`/orders/:id\`).
- **Data**: TanStack Query for restaurants, menus and orders (cached, paginated, refetched on focus); **cart in local state** (Zustand or Redux) persisted to storage so it survives app restarts.
- **Location**: ask permission when needed; save addresses; fetch restaurants by coordinates.
- **Payments**: use the payment gateway's native SDK (UPI intent, cards); the **server creates the order and verifies payment**, never trusting the amount sent by the app.
- **Live tracking**: WebSocket or polling for order status; map with the delivery partner's location; push notifications for status changes when the app is closed.
- **Auth**: tokens in secure storage, refresh flow.

**Mobile-specific concerns**
- Poor networks: skeleton loaders, retries, cached last results.
- Performance: FlashList for menus, resized images from a CDN.
- Low-end devices and app size.
- Analytics and crash reporting (Crashlytics or Sentry).

Explain what you would build first (an MVP: browse, cart, pay, track) and what later.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Saying "the server decides the price, not the app" is a strong security point in any commerce design.`,
        },
        {
          q: `Users in smaller towns complain the app is slow on 3G and too large to download. What would you do?`,
          a: `**Measure**: check app download size per device in Play Console, test on a throttled network (Android emulator network settings) and a low-end phone, and look at the analytics for slow screens and crashes by region and device.

**Reduce app size**
- Ship an **AAB** so Play delivers only the code and resources for each device's CPU architecture and screen density.
- Enable **R8** shrinking and resource shrinking for release builds.
- Remove unused libraries (one heavy chart or date library can add megabytes); compress images and use WebP or vector icons.
- Download large optional assets (fonts, animations, offline maps) on demand.

**Make networking work on 3G**
- **Smaller responses**: paginate, request only needed fields, compress with gzip or Brotli.
- **Resized images** from a CDN for the device size, with caching and placeholders.
- **Caching**: show cached content immediately, refresh in the background.
- **Fewer round trips**: combine calls the first screen needs into one endpoint.
- **Timeouts and retries with backoff**, clear offline messages, and a retry button.
- **Prefetch** the next likely screen when on Wi-Fi.

**Start-up**: keep Hermes on, show useful content quickly, defer non-critical work (analytics, remote config) until after the first screen.

Report results with numbers: download size before and after, time to first content on 3G.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Ending with measurable before/after numbers is what makes a performance answer convincing.`,
        },
        {
          q: `How do you monitor crashes and errors in a released app, and how would you handle a crash affecting many users?`,
          a: `**Set up monitoring before release**
- **Crash reporting**: **Firebase Crashlytics** or **Sentry** captures native crashes and JS errors with device model, OS version, app version and breadcrumbs (what the user did before).
- **Upload source maps** (and R8 mapping files) for each release so stack traces show your real file names and line numbers instead of minified code.
- Wrap screens in an **error boundary** that shows a friendly "Something went wrong, retry" screen and reports the error, instead of a white screen.
- Track **ANRs** (app not responding) and crash-free users rate in Play Console's Android vitals.

**When a crash spikes after a release**
1. **Assess**: which app version, devices and OS versions, how many users, which screen.
2. **Stop the spread**: halt the **staged rollout** in Play Console; turn off the feature with a **remote feature flag** if one exists.
3. **Fix**: reproduce with the same device and data; if the bug is in JS only, ship an **OTA update**; if native, a new store build with an expedited review.
4. **Communicate**: in-app message or support response for affected users.
5. **Learn**: add a test and an alert threshold so the same type of crash is caught before or immediately after release.

Staged rollouts plus feature flags turn a disaster into a small incident.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Halting the staged rollout is the first move interviewers want to hear; most candidates jump straight to "fix the bug".`,
        },
      ],
    },
  ],
};

export default book;
