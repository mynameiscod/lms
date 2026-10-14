/**
 * Career-track content: React apps — routing and APIs, Redux Toolkit, and building and shipping.
 * Topics JT_REACT_ROUTING, JT_REACT_STATE and JT_REACT_BUILD.
 *
 * Every question is React-specific (React Router v6, axios, Redux Toolkit, Vite, React-Bootstrap,
 * Netlify/Vercel). The framework-neutral versions of these ideas already live in Year 3; these ask
 * how they are done in this stack, so a student who sat Year 3 still meets new questions here.
 *
 * Attribution: checkpoint questions name one of their unit's own skillKeys (trackUnitsWeb.ts), or
 * the topic's when the unit declares none — JT_REACT_ROUTING [REACT_ROUTING, JS_ASYNC],
 * JT_REACT_STATE [STATE_MANAGEMENT, REACT_HOOKS], JT_REACT_BUILD [REACT_COMPONENTS, BOOTSTRAP].
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const cq = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_REACT_APPS_BUNDLES: PilotBundle[] = [
  /* ══ JT_REACT_ROUTING ═══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_REACT_ROUTING_ROUTER',
    notes: `**A single-page app has many URLs and one HTML page.** React Router reads the address bar
in the browser and decides which components to render, without asking the server for a new page.
That is why it feels instant, and why it needs a little setup.

## Setting it up

    npm install react-router-dom

    // main.jsx
    import { createBrowserRouter, RouterProvider } from 'react-router-dom';

    const router = createBrowserRouter([
      {
        path: '/',
        element: <Layout />,
        children: [
          { index: true, element: <Home /> },
          { path: 'products', element: <ProductList /> },
          { path: 'products/:id', element: <ProductDetail /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ]);

    createRoot(document.getElementById('root')).render(<RouterProvider router={router} />);

The older JSX form does the same thing: a BrowserRouter around a Routes element containing Route
elements. Use one style per project.

## Layouts and Outlet

The Layout route draws what every page shares — the navbar, the footer — and marks where the
child page goes with **Outlet**:

    function Layout() {
      return (
        <>
          <NavBar />
          <main className="container"><Outlet /></main>
        </>
      );
    }

Forget the Outlet and every child route matches but nothing appears.

## Moving between pages

**Link** changes the URL without a reload. **NavLink** does the same and also knows whether it is
active, so the current page can be highlighted:

    <NavLink to="/products" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
      Products
    </NavLink>

From code — after a form saves, for example — use **useNavigate**:

    const navigate = useNavigate();
    async function save() {
      const saved = await api.createProduct(form);
      navigate('/products/' + saved.id);
    }

## Reading URL parameters

    function ProductDetail() {
      const { id } = useParams();   // '42' for /products/42 — always a string
      ...
    }

## Common mistakes

- **A plain anchor tag** (a href) reloads the whole page and throws away all React state. Inside the
  app, always use Link or NavLink.
- **Comparing a parameter to a number.** useParams gives strings; '42' === 42 is false.
- **A leading slash on a child path.** Children are relative: 'products', not '/products'.
- **No catch-all route.** Without path '*', a mistyped URL shows an empty layout instead of a
  helpful page.`,
    mcqs: [
      mcq("A navbar uses <a href='/products'> instead of <Link to='/products'> in a React Router app. What happens when it is clicked?", [
        ['The browser reloads the whole page and React state is lost', true],
        ['Nothing different; React Router intercepts every anchor tag', false],
        ['The route renders twice because two handlers both respond', false],
        ['The click is ignored because anchors are disabled by the router', false],
      ], 'A plain anchor makes the browser request a new document, so the app restarts from scratch. Link updates the URL through the History API and only re-renders the matched route.'),
      mcq('With a route path of products/:id, what does useParams() return for the URL /products/42?', [
        ["{ id: '42' } — URL parameters always arrive as strings", true],
        ['{ id: 42 } — numeric segments are converted to numbers', false],
        ["'42' — the hook returns the single parameter value directly", false],
        ["{ params: { id: '42' } } — values are nested under params", false],
      ], 'useParams returns an object keyed by the names in the path, and every value is a string because it is read from the URL text. Convert with Number(id) if you need a number.'),
      mcq('A Layout route has child routes, but visiting /about shows only the navbar and no About page. What is most likely missing from Layout?', [
        ['An <Outlet /> where the child route should render', true],
        ['A key prop on the navbar so it re-mounts per route', false],
        ['A second router wrapping the child route elements', false],
        ['An exact attribute on the parent route definition', false],
      ], 'The child route does match, but a parent route renders its children only where it places an Outlet. Without it, the matched child has nowhere to appear.'),
    ],
    checkpoint: [
      cq('REACT_ROUTING', 'After a form saves a new product, the app should open that product\'s page without a reload. Which code does it inside the component?', [
        ["const navigate = useNavigate(); navigate('/products/' + p.id)", true],
        ["window.location.href = '/products/' + p.id after the save", false],
        ["return <Link to={'/products/' + p.id} /> from the submit handler", false],
        ["useParams().id = p.id so the router picks up the new value", false],
      ], 'useNavigate returns a function that changes the route in code without reloading. Setting window.location reloads the app, a Link returned from a handler is never rendered, and useParams is read-only.'),
      cq('REACT_ROUTING', 'Which child route definition shows a NotFound page for any URL that matches no other route?', [
        ["{ path: '*', element: <NotFound /> }", true],
        ["{ path: 'error', element: <NotFound /> }", false],
        ["{ errorPath: true, element: <NotFound /> }", false],
        ["{ index: true, element: <NotFound /> }", false],
      ], "The '*' path is the catch-all: it matches whatever the more specific routes did not. An index route renders at the parent's exact path, and 'error' matches only /error."),
      cq('REACT_ROUTING', 'A sidebar NavLink should look highlighted only while its page is open. What does NavLink provide for this?', [
        ['An isActive flag passed to its className or style function', true],
        ['A selected prop that must be kept up to date with useState', false],
        ['Nothing; each link must compare window.location by hand', false],
        ['An onActive event that fires once when the route changes', false],
      ], 'NavLink calls a className (or style) function with { isActive }, which is true while the current URL matches its to. No manual state or URL comparison is needed.'),
    ],
  },
  {
    unitCode: 'JT_REACT_ROUTING_CALLING_APIS',
    notes: `**A React component does not talk to the server directly; it asks an api module to.** That one
rule keeps the base URL, the headers and the error handling in a single file instead of scattered
across fifty components.

## fetch or axios

The browser's **fetch** works, but it has two habits that catch people out: it does **not** reject on
a 404 or 500 (only on a network failure), and you must call res.json() yourself. **axios** rejects on
any non-2xx status, parses JSON for you into response.data, and supports interceptors. Most React
teams use axios for that reason.

    npm install axios

## The api module

    // src/api/client.js
    import axios from 'axios';

    const client = axios.create({
      baseURL: import.meta.env.VITE_API_URL,   // e.g. http://localhost:8080/api
      timeout: 10000,
    });

    // runs before every request
    client.interceptors.request.use(config => {
      const token = localStorage.getItem('token');
      if (token) config.headers.Authorization = 'Bearer ' + token;
      return config;                            // must return the config
    });

    // runs on every response
    client.interceptors.response.use(
      res => res,
      err => {
        if (err.response?.status === 401) window.dispatchEvent(new Event('logout'));
        return Promise.reject(err);
      },
    );

    export const productsApi = {
      list:   params => client.get('/products', { params }).then(r => r.data),
      get:    id     => client.get('/products/' + id).then(r => r.data),
      create: body   => client.post('/products', body).then(r => r.data),
    };

## Calling it from a component

    function ProductList() {
      const [products, setProducts] = useState([]);

      useEffect(() => {
        async function load() {
          const data = await productsApi.list({ page: 1 });
          setProducts(data);
        }
        load();
      }, []);
      ...
    }

The effect callback itself is **not** async: an async function returns a promise, and an effect may
only return a cleanup function. Define the async function inside and call it.

## Common mistakes

- **Writing useEffect(async () => ...)** — React warns, and cleanup stops working.
- **Hardcoding http://localhost:8080 in components.** It works until the day you deploy.
- **Forgetting response.data.** With axios the body is on data, not on the response itself.
- **A missing dependency.** A detail page that fetches by id needs [id] in its dependency array,
  or it will keep showing the first item after the URL changes.
- **Ignoring failure.** Every request can fail; the next unit is about showing that properly.`,
    mcqs: [
      mcq("A component calls fetch('/api/items') and the server answers 404. Without extra code, what does the component get?", [
        ['A resolved response whose ok is false; nothing throws', true],
        ['A rejected promise, so the catch block runs at once', false],
        ['An empty array, because fetch turns missing data into []', false],
        ['A TypeError thrown to report that the URL was not found', false],
      ], 'fetch only rejects when the request cannot be made at all. An HTTP error status still resolves, so the code must check response.ok itself — one reason teams prefer axios.'),
      mcq('Why does React complain about useEffect(async () => { ... }, [])?', [
        ['An async function returns a promise, and an effect may only return a cleanup', true],
        ['Effects run during render, where awaiting would block painting the page', false],
        ['Async functions cannot call state setters until the component re-mounts', false],
        ['React permits async code inside event handlers only, never inside effects', false],
      ], 'Whatever the effect returns is treated as its cleanup function. An async function always returns a promise, which React cannot call on unmount, so the async work belongs in an inner function.'),
      mcq('In an axios request interceptor, what must the function return for the request to go ahead?', [
        ['The config object, changed or not', true],
        ['true, to approve sending the request', false],
        ['A new axios instance with the headers', false],
        ['Nothing; a return value is optional', false],
      ], 'axios passes the request config through each interceptor and sends whatever comes back. Returning nothing leaves axios with no config, and the request fails.'),
    ],
    checkpoint: [
      cq('JS_ASYNC', "Every component builds its own URL such as 'http://localhost:8080/api/...'. What is the cleanest fix before deployment?", [
        ['One api module made with axios.create and a baseURL from env', true],
        ['A global find-and-replace of localhost on the day of release', false],
        ['A wrapper component around every page that rewrites its URLs', false],
        ["Each component's useState holding its own full URL instead", false],
      ], 'A single axios instance with baseURL read from import.meta.env means the address is set per environment in one place, and components call named functions instead of URLs.'),
      cq('JS_ASYNC', 'With axios, where is the parsed JSON body of a successful response?', [
        ['response.data', true],
        ['response.json()', false],
        ['response.body', false],
        ['response.payload', false],
      ], 'axios parses the JSON body and puts it on the data property. response.json() is the fetch API, and body/payload are not where axios stores the parsed result.'),
      cq('REACT_ROUTING', 'A detail page at /users/:id fetches that user and must fetch again when the id in the URL changes. Which effect is right?', [
        ["useEffect(() => { load(id) }, [id])", true],
        ["useEffect(() => { load(id) }, [])", false],
        ["useEffect(() => { load(id) })", false],
        ["useMemo(() => load(id), [])", false],
      ], 'Navigating from /users/3 to /users/4 keeps the same component mounted, so only an effect that depends on id runs again. An empty array runs once; no array runs after every render.'),
    ],
  },
  {
    unitCode: 'JT_REACT_ROUTING_LOADING_ERROR',
    notes: `**Every request has four outcomes: still loading, failed, succeeded with nothing, succeeded with
data.** A screen that only draws the last one is broken three ways, and users notice all three.

## One status, not three booleans

    function TaskList() {
      const [status, setStatus] = useState('loading');   // 'loading' | 'error' | 'success'
      const [tasks, setTasks] = useState([]);
      const [error, setError] = useState(null);

      const load = useCallback(async (signal) => {
        setStatus('loading');
        try {
          const data = await tasksApi.list({ signal });
          setTasks(data);
          setStatus('success');
        } catch (err) {
          if (axios.isCancel(err)) return;
          setError(err.response?.data?.message || 'Could not load tasks');
          setStatus('error');
        }
      }, []);

      useEffect(() => {
        const controller = new AbortController();
        load(controller.signal);
        return () => controller.abort();
      }, [load]);

      if (status === 'loading') return <Spinner animation="border" />;
      if (status === 'error') return (
        <Alert variant="danger">
          {error} <Button onClick={() => load()}>Retry</Button>
        </Alert>
      );
      if (tasks.length === 0) return <p>No tasks yet. Create your first one.</p>;
      return <ul>{tasks.map(t => <li key={t.id}>{t.title}</li>)}</ul>;
    }

A single status value cannot be "loading" and "error" at once. Separate isLoading and isError flags
can, and sooner or later they will.

## Why abort

When the user leaves the page — or types the next letter in a search box — the old request is
still in flight. If it finishes late, it overwrites newer data or sets state on a component that
is gone. Passing an AbortController's signal to axios (or fetch) and aborting in the cleanup
cancels it. This is the fix for the "older response overwrote the newer one" bug.

## The empty state is a real state

An empty array is a successful answer. "No tasks yet" with a button to add one is a screen; a blank
white area is a bug report waiting to happen.

## Common mistakes

- **Starting data as undefined** and calling .map on it — the first render crashes.
- **Turning the spinner off only on success**, so a failure spins forever. Set the status in both
  branches (or in finally).
- **"Something went wrong" with no way out.** An error state without Retry forces a page reload.
- **Showing a 404 from the API as a generic error.** A deleted record deserves "This task no
  longer exists" and a link back to the list.`,
    mcqs: [
      mcq('A list page starts with const [items, setItems] = useState() and renders items.map(...). What happens on the first render?', [
        ['It throws, because items is undefined until the request ends', true],
        ['It renders nothing and waits silently for the data to arrive', false],
        ['React delays the first render until the effect has completed', false],
        ["It shows the previous page's items cached by React Router", false],
      ], 'The component renders before the effect runs, so items is undefined and undefined.map throws. Initialise list state to [] or check the status before mapping.'),
      mcq('Why is setLoading(false) best placed in a finally block after an awaited request?', [
        ['So the spinner stops whether the request succeeded or failed', true],
        ['Because state setters are not allowed inside try or catch', false],
        ['So React batches it together with the next route change', false],
      ], 'finally runs after both the try and the catch paths. Putting the reset only in the success path leaves the spinner running forever whenever the request fails.'),
      mcq('The API returns [] for a search with no matches, and the page shows a blank area. Which state is unhandled?', [
        ['The empty state', true],
        ['The loading state', false],
        ['The error state', false],
        ['The retry state', false],
      ], 'An empty array is a successful response with no data. It needs its own message, such as "No results for that search", distinct from both loading and failure.'),
    ],
    checkpoint: [
      cq('JS_ASYNC', 'A user types quickly in a search box; each keystroke fires a request, and an older, slower response sometimes overwrites the newer one. Which fix addresses the cause?', [
        ['Abort the previous request in the effect cleanup with AbortController', true],
        ['Wrap setResults in setTimeout so the last update always wins', false],
        ['Add results to the dependency array so the effect runs again', false],
        ['Call setResults twice so React keeps whichever value came last', false],
      ], 'The cleanup of the previous effect runs before the next one, so aborting there cancels the stale request. Responses can arrive in any order; timers and extra calls do not change that.'),
      cq('JS_ASYNC', 'Which way of tracking a request in React state covers every outcome without contradictory combinations?', [
        ["One status value: 'loading' | 'error' | 'success'", true],
        ['Separate isLoading and isError booleans set independently', false],
        ['Only a data variable, checked for null to mean loading', false],
        ['A loading counter that goes up on every new render', false],
      ], 'A single status can hold only one outcome at a time. Two booleans allow loading-and-failed together, and null data cannot tell loading from failure from an empty answer.'),
      cq('REACT_ROUTING', 'The detail page for /orders/:id gets a 404 from the API because the order was deleted. What should the screen do?', [
        ['Show a not-found message with a link back to the order list', true],
        ['Keep the spinner running in case the order appears later', false],
        ['Redirect to the home page silently, without explaining why', false],
        ['Render the last order the user viewed so the page is not empty', false],
      ], 'A 404 is an answer, not a transient failure: the order does not exist. Telling the user and giving them a route back is the correct outcome; silent redirects and stale data mislead.'),
    ],
  },
  {
    unitCode: 'JT_REACT_ROUTING_PROTECTED_ROUTES',
    notes: `**Some pages only make sense for a logged-in user.** A protected route checks that, and if the
user is not logged in, sends them to the login page — then brings them back to where they were
going once they have.

## One guard for many pages

    function RequireAuth() {
      const { user, checking } = useAuth();     // from an AuthContext or the Redux store
      const location = useLocation();

      if (checking) return <Spinner animation="border" />;
      if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
      return <Outlet />;
    }

    const router = createBrowserRouter([
      { path: '/login', element: <Login /> },
      {
        element: <RequireAuth />,               // a layout route with no path
        children: [
          { path: '/', element: <Dashboard /> },
          { path: '/tasks', element: <Tasks /> },
          { path: '/settings', element: <Settings /> },
        ],
      },
    ]);

Every child of the guard is protected by one component. Adding a page behind login is adding a
child.

## Sending the user back

The Navigate stored the location the user wanted in its state. The login page reads it:

    function Login() {
      const navigate = useNavigate();
      const location = useLocation();
      const from = location.state?.from?.pathname || '/';

      async function onSubmit(form) {
        await auth.login(form);
        navigate(from, { replace: true });
      }
      ...
    }

**replace** matters twice. On the redirect, it stops Back returning to the guarded page (which
would bounce to login again). After login, it stops Back returning to the login form.

## The checking state

On a refresh, the app does not yet know whether the stored token is valid. If the guard redirects
before that check finishes, a logged-in user is thrown to /login on every reload. Show a spinner
while checking.

## What a guard does not do

A protected route hides screens. It does **not** protect data: the JavaScript is in the browser, and
anyone can call the API directly. The server must check the token and the user's role on every
request. The guard is user experience; the API is security.

## Common mistakes

- **Guarding /login itself**, which redirects /login to /login forever.
- **Calling navigate() during render** instead of returning a Navigate element.
- **No checking state**, causing a flash of the login page on refresh.
- **Believing the guard is the security.** Admin data must be refused by the server.`,
    mcqs: [
      mcq('Why is replace used on the Navigate that sends a logged-out user to /login?', [
        ['So Back does not return to the guarded page and bounce again', true],
        ['So the login page loads faster by reusing the guarded element', false],
        ['So the router clears all saved tokens before showing the form', false],
      ], 'replace swaps the current history entry instead of pushing a new one. Without it, pressing Back on the login page returns to the guarded URL, which redirects to login again.'),
      mcq('On refresh, a guard briefly sends logged-in users to /login because the token is still being checked. What fixes it?', [
        ['Render a loading state until the auth check has finished', true],
        ['Move the guard into useMemo so it runs before the first render', false],
        ['Redirect to /login only on the second render of the guard', false],
      ], 'The guard is deciding before it has the answer. Holding a checking state and showing a spinner until the token is verified removes the false redirect.'),
      mcq('What does a protected route in a React app actually protect?', [
        ['The user experience; the API must still refuse unauthorised calls', true],
        ['The data, because the code for that page is never downloaded', false],
        ['Both the page and its API, since the router signs each request', false],
        ['Nothing useful, so guards should be left out of real apps', false],
      ], 'All frontend code runs on the user\'s machine and can be bypassed. The guard keeps people out of screens they should not see; only server-side checks keep them out of data.'),
    ],
    checkpoint: [
      cq('REACT_ROUTING', 'After logging in, a user should land on the page they originally tried to open. Where does that location usually travel?', [
        ['In the state of the Navigate that redirected them to /login', true],
        ['In a query string that the server adds to the login response', false],
        ['In a cookie that React Router writes on every navigation', false],
        ["In the browser's history length, read back after the login", false],
      ], 'The guard renders Navigate with state={{ from: location }}; the login page reads location.state.from and navigates there after a successful login.'),
      cq('REACT_ROUTING', 'Which structure guards several pages with one wrapper in React Router v6?', [
        ['A parent route whose element checks auth and renders <Outlet />', true],
        ['A RequireAuth prop added to each <Link> that points at those pages', false],
        ['A second router that is mounted only after the user logs in', false],
        ['An if statement in main.jsx that skips the router when logged out', false],
      ], 'A pathless layout route runs its element for every child. If the check passes it renders the Outlet, so one component protects every page nested under it.'),
      cq('REACT_ROUTING', 'The /login route is itself wrapped in RequireAuth, and logged-out users see a page that never settles. Why?', [
        ['The guard keeps redirecting /login to /login in a loop', true],
        ['Navigate cannot be used on routes with no URL parameters', false],
        ['RequireAuth needs a key prop to render more than once', false],
        ['The login form submits before the router has mounted', false],
      ], 'A logged-out user on /login fails the guard, which redirects to /login, which fails the guard again. The login page must sit outside the protected branch.'),
    ],
  },
  {
    unitCode: 'JT_REACT_ROUTING_DEBUGGING',
    notes: `**Routing and API bugs rarely announce their cause.** The skill is reading the symptom, naming the
layer it comes from — browser, router, host or server — and fixing only that.

## Bug 1 — works locally, 404 on refresh in production

Clicking from the home page to /products/7 works. Refreshing /products/7 on the deployed site shows
the host's own "Page not found".

    Diagnosis: the static host looks for a file called products/7 and finds none. In development
    Vite serves index.html for every path; the host does not, until it is told to.

    Fix (Netlify) — public/_redirects:
    /*    /index.html   200

    Fix (Vercel) — vercel.json:
    { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }

## Bug 2 — the CORS error

    Access to XMLHttpRequest at 'http://localhost:8080/api/tasks' from origin
    'http://localhost:5173' has been blocked by CORS policy: No 'Access-Control-Allow-Origin'
    header is present on the requested resource.

    Diagnosis: the browser refused to give the response to a page from another origin, because the
    server did not say that origin is allowed. Postman works because Postman is not a browser.

    Fix: on the server — in Spring Boot, @CrossOrigin or a CorsConfigurer allowing
    http://localhost:5173 (and the production origin). Nothing in React can fix it. In development,
    a Vite proxy (server.proxy in vite.config.js) avoids it by making the call same-origin.

## Bug 3 — the stale detail page

    function UserDetail() {
      const { id } = useParams();
      const [user, setUser] = useState(null);
      useEffect(() => { usersApi.get(id).then(setUser); }, []);   // bug
      ...
    }

Going from /users/3 to /users/4 via a "next" link shows user 3 still. The component stayed mounted,
so the effect never ran again. **Fix: [id].** Then add an AbortController, or a fast click from 4 to
5 can let user 4's slow response land last.

## Bug 4 — the infinite spinner

    async function load() {
      setLoading(true);
      const data = await tasksApi.list();
      setTasks(data);
      setLoading(false);
    }

When the API is down, await throws, setLoading(false) never runs, and the spinner spins forever.
**Fix:** try / catch / finally, with an error state and a Retry.

## Bug 5 — undefined everywhere after a move to axios

    const res = await client.get('/tasks');
    setTasks(res);          // bug: res is the axios response, not the array

**Fix:** setTasks(res.data) — or have the api module return r.data so components never see it.

## The method

Read the full error. Open the Network tab: did the request go out, to which URL, and what status
came back? A request that never left is a code bug; a 4xx/5xx is the server talking; a CORS line
is the server's headers; a 404 from the host on a page URL is a missing rewrite.`,
    mcqs: [
      mcq('Locally every route works; on the deployed site, refreshing /products/7 shows the host\'s 404 page. What is the cause?', [
        ['The host looks for a file at that path and needs a rewrite to index.html', true],
        ['The production build removes route parameters from the bundle at compile time', false],
        ['React Router can survive a refresh only when HashRouter is used in development', false],
        ['The API is down, so the router cannot resolve the product route when it loads', false],
      ], 'On refresh the browser asks the host for /products/7. A static host has no such file, so it returns 404 before React even loads. A rewrite serves index.html and lets the router handle the path.'),
      mcq("The console shows: blocked by CORS policy: No 'Access-Control-Allow-Origin' header. Where is the fix?", [
        ["On the API server, which must allow the frontend's origin", true],
        ['In axios, by setting withCredentials to false on each call', false],
        ['In React Router, by declaring the API path as a route', false],
        ['In the component, by catching the error and retrying once', false],
      ], 'CORS is the server declaring which origins may read its responses. The browser enforces it, and no frontend code can add the missing header; the server configuration must.'),
      mcq('A detail page shows user 3 even though the URL now says /users/4. Its fetching effect has [] as the dependency array. What is the diagnosis?', [
        ['The effect ran once on mount and never ran again for the new id', true],
        ['useParams caches the first value until a full page reload happens', false],
        ['React Router keeps the old URL until the Back button is pressed', false],
      ], 'React Router reuses the mounted component when only a parameter changes. An effect with [] runs once, so the new id is never fetched; [id] makes it run again.'),
      mcq('Postman gets a 200 from the API, but the same call from the React app fails with a CORS error. Why does Postman succeed?', [
        ['CORS is enforced by browsers, and Postman is not a browser', true],
        ['Postman sends a special token that the server trusts by default', false],
        ['The browser sends requests to a different port than Postman uses', false],
        ['Postman retries failed requests until the server allows them', false],
      ], 'The server answers both calls the same way. Only a browser checks the Access-Control-Allow-Origin header before handing the response to page script, so only the browser call fails.'),
    ],
  },
  {
    unitCode: 'JT_REACT_ROUTING_PRACTICE',
    notes: `**Six exercises, each small enough for one sitting.** Use a public API such as
https://jsonplaceholder.typicode.com or a local json-server (npx json-server db.json). Do them
without copying from earlier units; look things up only after you are stuck.

**1 — Three routes and a layout.** Create a router with a Layout (navbar plus Outlet) and three
children: Home (index), Posts (/posts) and NotFound (*). Use NavLink so the current page is
highlighted. Check: typing /nonsense shows NotFound inside the layout.

**2 — A detail page by id.** Add /posts/:id. Fetch the post with axios through an api module and show
its title and body. Add "Previous" and "Next" links that change the id. Check: clicking Next really
loads the next post (your effect depends on id).

**3 — The four states.** Give the posts list a single status value and render loading, error with
Retry, empty, and data. To test the error, point the base URL at a port with nothing running; to
test empty, filter by a userId that does not exist.

**4 — Search in the URL.** Add a search box to /posts that writes ?q= with useSearchParams and filters
by it. Check: refresh keeps the search, and Back undoes it.

**5 — Abort a stale request.** Make the search call the API on each change (with a ?q= param). Add an
AbortController in the effect cleanup. Check in the Network tab that earlier requests show as
cancelled when you type quickly.

**6 — A guarded page.** Add a fake login that stores a token in localStorage, a RequireAuth layout
route around /posts/new, and a redirect back after login with replace. Check: logging in from a
redirect lands you on /posts/new, and Back does not return to the login form.

When all six work, read your code once more for these: no plain anchors inside the app, no
hardcoded base URL in a component, no effect that is itself async.`,
    mcqs: [
      mcq('Which hook reads ?q=shoes from the URL /search?q=shoes in React Router v6?', [
        ['useSearchParams', true],
        ['useParams', false],
        ['useQuery', false],
        ['useOutletContext', false],
      ], 'useSearchParams returns the query string as URLSearchParams plus a setter. useParams reads only path segments declared with a colon, and useQuery is not a React Router hook.'),
      mcq("A route path 'users/:userId/posts/:postId' matches /users/5/posts/9. What does useParams() give?", [
        ["{ userId: '5', postId: '9' }", true],
        ["{ id: '9' }", false],
        ["['5', '9']", false],
        ['{ userId: 5, postId: 9 }', false],
      ], 'Each named segment becomes a key on the returned object, and every value is a string. The names come from the path, not from a fixed id key.'),
      mcq('In a layout route at /dashboard, which child renders DashboardHome at exactly /dashboard?', [
        ['{ index: true, element: <DashboardHome /> }', true],
        ["{ path: 'home', element: <DashboardHome /> }", false],
        ['{ default: true, element: <DashboardHome /> }', false],
        ["{ path: '*', element: <DashboardHome /> }", false],
      ], "An index route renders in the parent's Outlet when the URL is exactly the parent's path. 'home' would need /dashboard/home, '*' catches unmatched paths, and default is not a route option."),
      mcq('After deleting an item on its detail page, which call returns to the list and removes the deleted page from history?', [
        ["navigate('/items', { replace: true })", true],
        ["navigate(-1, { reload: true })", false],
        ["useNavigate('/items')", false],
        ["history.push('/items')", false],
      ], 'replace overwrites the detail page entry, so Back cannot return to a page that no longer exists. useNavigate takes no path, and history.push is the old v5 API.'),
      mcq("axios.get('/products', { params: { page: 2, size: 10 } }) requests which URL?", [
        ['/products?page=2&size=10', true],
        ['/products/2/10', false],
        ['/products with page and size in the body', false],
        ['/products?params=page,size', false],
      ], 'axios serialises the params object into the query string. A GET has no body, and path segments are only produced if you build them into the URL yourself.'),
    ],
  },
  {
    unitCode: 'JT_REACT_ROUTING_INTERVIEW_QUESTION',
    notes: `**Three questions an interviewer asks about React routing and APIs, with an answer that earns
the follow-up, and the follow-up itself.** Say each answer aloud, in under a minute.

## Question 1 — "How does a single-page app have different URLs?"

**Model answer.** The server sends one HTML page and the JavaScript bundle. React Router listens to
the URL through the browser's History API; when a Link is clicked it changes the URL without a
request and renders the components for the matching route. Nested routes share a layout through
Outlet, and parameters like /products/:id are read with useParams.

**Follow-up: "So what happens when the user refreshes /products/7 in production?"** The browser asks
the server for /products/7. A static host has no such file and returns 404 unless it is configured
to rewrite every path to index.html — a _redirects file on Netlify, rewrites in vercel.json, or a
forwarding controller when Spring Boot serves the build. Then React loads and the router takes over.

## Question 2 — "How do you call an API from React?"

**Model answer.** Through one api module: an axios instance with the base URL from an environment
variable, interceptors that add the auth token and handle a 401 centrally, and named functions such
as getTasks. Components call those inside an effect (or a thunk if the data is in Redux), track one
status value, and render loading, error with retry, empty and data. The effect aborts its request
in the cleanup so a slow, stale response cannot overwrite a newer one.

**Follow-up: "You get a CORS error. What do you do?"** CORS is the browser enforcing the server's
policy, so the fix is on the server: allow the frontend's origin. In development I can also use the
Vite proxy so calls are same-origin. Nothing in the React code can add the missing header.

## Question 3 — "How do you protect a page that needs login?"

**Model answer.** A pathless layout route whose element checks the auth state: while checking it shows
a spinner, if logged out it returns a Navigate to /login with replace and the current location in
state, otherwise it renders an Outlet. After login I navigate back to state.from with replace.

**Follow-up: "Is that enough to protect admin data?"** No. The guard only hides screens; all frontend
code can be bypassed. The API must verify the token and the role on every request. The route guard
is for experience, the server check is for security.`,
    mcqs: [
      mcq('An interviewer asks how a single-page app can have many URLs. Which one-line answer is accurate?', [
        ['The router reads the URL in the browser and swaps components without a reload', true],
        ['The server sends a separate HTML page for each route defined in the app', false],
        ['Each route is compiled into its own bundle that loads as a new document', false],
      ], 'There is one HTML document. React Router watches the URL through the History API and renders the matching components, which is why navigation needs no round trip for HTML.'),
      mcq('Asked where the API base URL should live in a React app, which answer is strongest?', [
        ['In a VITE_ environment variable read by one api module', true],
        ['In every component, so each call is easy to read on its own', false],
        ['In localStorage, so users can change it from the browser', false],
      ], 'An environment variable changes per build (development, staging, production) and one module reads it, so no component needs editing when the backend moves.'),
      mcq("The interviewer follows up: 'Is a protected route enough to secure admin data?' Which answer shows understanding?", [
        ['No — it hides screens; the server must authorise every request', true],
        ['Yes — once a route is guarded, its API calls are guarded too', false],
        ['Yes, as long as the token is kept in sessionStorage, not cookies', false],
      ], 'Frontend checks run on a machine the user controls. Data is only protected when the API itself checks identity and role, so the guard is a convenience, not the control.'),
    ],
  },
  {
    unitCode: 'JT_REACT_ROUTING_MINI_PROJECT',
    notes: `**Brief: a three-page React app over a public API.** Pick an API with list and detail endpoints —
for example https://dummyjson.com/products, https://jsonplaceholder.typicode.com/posts or
https://restcountries.com. Build it with Vite, React Router v6 and axios.

## Requirements

1. **List page (/items)** — shows the items from the API, each linking to its detail page.
2. **Search page (/search)** — a search box whose text is kept in the URL (?q=...) with
   useSearchParams; results are fetched from the API and earlier requests are aborted.
3. **Detail page (/items/:id)** — reads the id with useParams and fetches that one item.
4. **A layout** with a navbar using NavLink (active page highlighted) and an Outlet; a catch-all
   NotFound route.
5. **One api module** — an axios instance with baseURL from import.meta.env.VITE_API_URL; components
   never contain a URL.
6. **Four states everywhere** — every request shows loading, an error with a Retry button, an empty
   state, and the data. A missing id shows a not-found message with a link back to the list.

## Acceptance criteria

- Refreshing /items/3 or /search?q=phone in the dev server shows the same page.
- Turning the network off (DevTools, Offline) shows the error state; Retry works once it is back on.
- A search that matches nothing shows an empty-state message, not a blank area.
- Typing quickly in search shows cancelled requests in the Network tab.
- /items/does-not-exist shows a not-found message, not a crash.
- The README says how to install, which env variable to set, and how to run it.`,
    mcqs: [
      mcq('The project keeps the search text in the URL as ?q=... rather than only in useState. What does that give the user?', [
        ['A search they can bookmark, share and return to with Back', true],
        ['Faster requests, since the API caches anything in the URL', false],
        ['Automatic protection from CORS errors on the search call', false],
      ], 'State in the URL survives refreshes, can be copied into a link, and is part of browser history. useState alone is lost on reload and invisible to Back.'),
      mcq("Which acceptance check proves the detail page handles an id that doesn't exist?", [
        ['Opening /items/does-not-exist shows a not-found message', true],
        ['The detail page loads quickly on a fast home connection', false],
        ['The list page shows twenty items on its very first load', false],
      ], 'Only visiting a bad id exercises the 404 path. Speed and list size say nothing about whether the detail page survives an item that is missing.'),
    ],
    assignment: {
      title: 'Mini Project — A Multi-Page App on a Public API',
      description: 'A three-page React app (list, search, detail) over a public API, built with Vite, React Router v6 and axios, with loading, error, empty and not-found states on every request.',
      instructions: `1. Create the project with npm create vite@latest and install react-router-dom and axios.
2. Put the API base URL in .env as VITE_API_URL and create src/api/client.js with axios.create and named functions.
3. Build a Layout with a NavLink navbar and an Outlet; add the list, search, detail and NotFound routes.
4. Implement the search with useSearchParams and an AbortController in the effect cleanup.
5. Give every request one status value and render loading, error with Retry, empty and data.
6. Handle a missing id on the detail page with a not-found message and a link back.
7. Push to GitHub with a README covering install, env setup and run, and submit the repository link.`,
      rubric: [
        { criterion: 'Routing', description: 'Layout with Outlet, NavLink highlighting, list/search/detail routes, useParams for the id, a catch-all NotFound route.', maxPoints: 25 },
        { criterion: 'API module', description: 'One axios instance with baseURL from VITE_API_URL; no URLs inside components; response.data handled in the module.', maxPoints: 20 },
        { criterion: 'Request states', description: 'Loading, error with a working Retry, empty and data on every request; a bad id shows a not-found message.', maxPoints: 25 },
        { criterion: 'Search in the URL', description: 'Query kept in ?q= with useSearchParams; survives refresh and Back; stale requests aborted.', maxPoints: 20 },
        { criterion: 'README and code quality', description: 'Install, env and run steps documented; components small and named for what they show.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },
  {
    unitCode: 'JT_REACT_ROUTING_CHECKPOINT',
    notes: `**Ten questions on React Router and calling APIs from React.** Each describes a situation from a
real app; choose what you would actually do. Routes, layouts and parameters; the api module and
interceptors; the four states of a request; aborting stale requests; and guarded pages. Answer
without looking anything up — the point is to find out where you are.`,
    checkpoint: [
      cq('REACT_ROUTING', "A Layout route at '/' has children 'products' and 'products/:id'. Where do the child pages appear?", [
        ['Wherever Layout renders <Outlet />', true],
        ['Below Layout, after its last element', false],
        ['In place of Layout, which unmounts', false],
        ['In a new tab opened by the router', false],
      ], 'A nested route renders inside its parent at the Outlet. Layout stays mounted across child pages, which is exactly why shared navbars belong in it.'),
      cq('REACT_ROUTING', 'A breadcrumb component needs the current path, such as /products/7/reviews. Which hook gives it?', [
        ['useLocation', true],
        ['useParams', false],
        ['useNavigate', false],
        ['useOutlet', false],
      ], 'useLocation returns the current location object, including pathname. useParams gives only the named segments, and useNavigate returns a function for changing the route.'),
      cq('JS_ASYNC', 'A dashboard effect requests /api/stats. How should it avoid setting state after the user has left the page?', [
        ['Pass an AbortController signal and abort it in the cleanup', true],
        ['Mark the effect function async and await the request at top', false],
        ['Call the request in the render body and keep it in a ref', false],
        ['Wrap the request in useMemo so it runs once and is cached', false],
      ], 'The effect cleanup runs on unmount; aborting there cancels the in-flight request so its result is never applied. The other options either break effects or re-request on every render.'),
      cq('JS_ASYNC', 'An axios response interceptor sees a 401 status on a call. What is a sensible action there?', [
        ['Clear the stored session and send the user to /login', true],
        ['Retry the same request until it finally returns 200', false],
        ['Swallow the error so that components never see it', false],
        ['Reload the page so the token refreshes on its own', false],
      ], 'A 401 means the session is no longer valid. Handling it once in the interceptor logs the user out consistently; retrying cannot succeed and hiding it leaves screens broken.'),
      cq('REACT_ROUTING', 'What is the difference between Link and NavLink in React Router?', [
        ['NavLink knows whether its route is active, so it can be styled', true],
        ['NavLink reloads the page while Link keeps state in memory', false],
        ['Link works only in nested routes and NavLink only at the top', false],
        ['NavLink is for external sites and Link is for internal pages', false],
      ], 'Both navigate without a reload. NavLink adds the active check, passing isActive to className or style so the current page can be highlighted.'),
      cq('JS_ASYNC', 'A page needs the user and their orders from two independent endpoints. Which keeps loading time lowest?', [
        ['await Promise.all([api.getUser(), api.getOrders()])', true],
        ['await api.getUser(); then await api.getOrders() after it', false],
        ["Fetch the orders inside the user request's then callback", false],
        ['Fetch the orders only after the user data has rendered', false],
      ], 'Promise.all starts both requests at once, so the wait is the slower of the two rather than their sum. The other options run the requests one after another.'),
      cq('REACT_ROUTING', 'The products list should show page 3 at /products?page=3, and a Next button should move to page 4. Which tool fits?', [
        ['useSearchParams, reading and setting the page value', true],
        ['useState alone, initialised to 1 on every mount', false],
        ['A global variable shared by the list and the button', false],
        ['A ref holding the page so that it survives reloads', false],
      ], 'The page belongs in the query string so it survives refresh and Back. useSearchParams reads it and its setter updates the URL, which re-renders the list.'),
      cq('JS_ASYNC', "A request fails with a network error and the page shows only 'Something went wrong'. What makes this state usable?", [
        ['A Retry button that runs the same request again', true],
        ['A longer message that includes the stack trace', false],
        ["Hiding the error and showing yesterday's data", false],
        ['Logging the error to the console and nothing else', false],
      ], 'Network failures are often temporary. A Retry lets the user recover without reloading the app; stack traces and silent fallbacks do not help them.'),
      cq('REACT_ROUTING', 'A logged-out user opens /settings directly. What should the RequireAuth guard return?', [
        ["<Navigate to='/login' replace />", true],
        ["navigate('/login') called during render", false],
        ["<Link to='/login'>Log in</Link> and nothing else", false],
        ['null, so the page stays blank until login', false],
      ], 'Returning a Navigate element redirects as part of rendering. Calling navigate during render is a side effect React warns about, and a bare link or blank page leaves the user stuck.'),
      cq('JS_ASYNC', 'Why should components call productsApi.list() from an api module instead of axios.get directly?', [
        ['URLs, headers and error handling then change in one file', true],
        ['axios.get cannot be called from inside a component file', false],
        ['The module makes requests synchronous, which is simpler', false],
        ['React Router needs every request registered in a module', false],
      ], 'Centralising requests means the base URL, the auth header and the 401 handling live in one place, and components read as "load the products" rather than as HTTP details.'),
    ],
  },

  /* ══ JT_REACT_STATE ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_REACT_STATE_WHEN_A_STORE',
    notes: `**Most state should stay where it is used.** A store is a tool for one specific problem — many
distant components reading and changing the same data — and adding it before that problem exists
makes a small app harder to follow.

## The ladder

**1. Local state.** useState in the component that uses it. A form's half-typed text, whether a
dropdown is open, which tab is selected. This is most state in most apps.

**2. Lift it up.** When two siblings need the same value, move it to their nearest common parent and
pass it down as props, with a function to change it:

    function TasksPage() {
      const [filter, setFilter] = useState('all');
      return (
        <>
          <FilterBar filter={filter} onChange={setFilter} />
          <TaskList filter={filter} />
        </>
      );
    }

**3. Context.** When the value is needed many layers down and the layers in between do not care
about it, passing props through them ("prop drilling") is noise. Context hands it straight down:

    const AuthContext = createContext(null);
    export function AuthProvider({ children }) {
      const [user, setUser] = useState(null);
      return <AuthContext.Provider value={{ user, setUser }}>{children}</AuthContext.Provider>;
    }
    export const useAuth = () => useContext(AuthContext);

Context is a delivery mechanism, not a state manager: every consumer re-renders when the value
changes. It suits values that change rarely — the logged-in user, the theme, the language.

**4. A store (Redux Toolkit).** It earns its keep when the same data is read and changed from many
unrelated places — a cart changed from product cards, shown in the navbar and the checkout; tasks
edited from a list, a detail page and a dashboard — and when the rules for changing it have grown
enough that you want them in one place, testable and visible in Redux DevTools.

## The question to ask

"Who reads this, and who changes it?" One component: local. A parent and its children: lift it.
Many layers, rarely changing: context. Many unrelated places, frequently changing, with real
update logic: a store.

## Common mistakes

- **Everything in Redux**, including whether a tooltip is showing. Every keystroke becomes a
  dispatched action for no benefit.
- **Copying state into two places** and syncing them with effects. One owner; everyone else reads.
- **Fast-changing values in context**, re-rendering the whole tree on every change.
- **Treating server data as app state forever.** Data from the API is a cache of the server; it
  needs loading and error status, and refreshing — which the next units handle with thunks.`,
    mcqs: [
      mcq('Two sibling components both need the same selected filter. What is the simplest correct move?', [
        ['Lift the state to their nearest common parent and pass it down', true],
        ['Copy the value into each sibling and keep them synced with effects', false],
        ['Create a Redux store for the one filter value straight away', false],
        ['Keep it in localStorage and read it back on every render', false],
      ], 'Lifting state gives it a single owner that both children read through props. Syncing copies breeds bugs, and a store is far more machinery than one shared value needs.'),
      mcq('Why is the text of a half-typed form field usually kept in local component state?', [
        ['Only that form uses it, and it changes on every keystroke', true],
        ['Redux cannot hold strings longer than a few characters', false],
        ['Context and stores are not allowed to hold any input values', false],
      ], 'State belongs with whoever reads and changes it. Draft input matters only to its form, and routing every keystroke through a global store adds work and re-renders for nothing.'),
      mcq('React Context mainly removes which problem?', [
        ['Passing a value through layers of components that do not use it', true],
        ['Re-rendering consumers whenever the provided value changes', false],
        ['Fetching and caching server data along with loading states', false],
        ['Keeping state alive when the browser tab is reloaded', false],
      ], 'Context delivers a value to any descendant without prop drilling. It does not avoid re-renders (it causes them), fetch data, or persist anything across reloads.'),
    ],
    checkpoint: [
      cq('STATE_MANAGEMENT', 'The cart count appears in the navbar, the cart page and the checkout, and is changed from product cards all over the app. Where should it live?', [
        ['In a shared store (or context) that each of them reads', true],
        ["In the navbar's useState, passed down through every page", false],
        ['In each component separately, refreshed on a timer', false],
        ['In the URL, as a query parameter on every single route', false],
      ], 'Data read and changed from many unrelated places needs one shared owner. Keeping it in the navbar means threading it through every page, and separate copies drift apart.'),
      cq('STATE_MANAGEMENT', "A modal's open/closed flag is used only by one page and its button. Where does it belong?", [
        ["In that page's local state", true],
        ['In a Redux slice so DevTools shows it', false],
        ['In a context provider at the app root', false],
        ['In sessionStorage so it survives reloads', false],
      ], 'Nothing else reads the flag, so a store or context would only add indirection and re-renders. useState in the page is the right owner.'),
      cq('STATE_MANAGEMENT', 'A theme context value is updated on every mouse move, and the whole app becomes slow. What is the underlying reason?', [
        ['Every consumer re-renders whenever the context value changes', true],
        ['Context values are deep-copied on each update, which is slow', false],
        ['Providers can hold one value only and recompute it every frame', false],
        ['React turns off batching for state inside a context provider', false],
      ], 'Context has no selector: any change re-renders every component that uses it. Fast-changing values belong in local state or a store with fine-grained selectors.'),
    ],
  },
  {
    unitCode: 'JT_REACT_STATE_REDUX_TOOLKIT',
    notes: `**Redux Toolkit (RTK) is the official way to write Redux.** One store holds the shared state;
slices define a piece of it and the ways it can change; components read with useSelector and ask
for changes with useDispatch.

    npm install @reduxjs/toolkit react-redux

## A slice

    // src/features/tasks/tasksSlice.js
    import { createSlice } from '@reduxjs/toolkit';

    const tasksSlice = createSlice({
      name: 'tasks',
      initialState: { items: [], filter: 'all' },
      reducers: {
        addTask(state, action) {
          state.items.push({ id: crypto.randomUUID(), title: action.payload, done: false });
        },
        toggleTask(state, action) {
          const task = state.items.find(t => t.id === action.payload);
          if (task) task.done = !task.done;
        },
        setFilter(state, action) {
          state.filter = action.payload;
        },
      },
    });

    export const { addTask, toggleTask, setFilter } = tasksSlice.actions;
    export default tasksSlice.reducer;

createSlice generates an action creator for each reducer: addTask('Buy milk') produces
{ type: 'tasks/addTask', payload: 'Buy milk' }.

**"But reducers must not mutate!"** They must not — and these do not. RTK runs reducers through
**Immer**: you write to a draft, Immer records the changes and produces a new immutable state. Either
mutate the draft or return a new value; never both.

## The store and the Provider

    // src/app/store.js
    import { configureStore } from '@reduxjs/toolkit';
    import tasksReducer from '../features/tasks/tasksSlice';
    export const store = configureStore({ reducer: { tasks: tasksReducer } });

    // main.jsx
    <Provider store={store}><App /></Provider>

The key tasks becomes state.tasks. configureStore also turns on Redux DevTools and, in development,
checks that nothing mutates state outside a reducer.

## Using it in components

    function TaskList() {
      const items = useSelector(state => state.tasks.items);
      const dispatch = useDispatch();
      return items.map(t => (
        <Form.Check key={t.id} label={t.title} checked={t.done}
                    onChange={() => dispatch(toggleTask(t.id))} />
      ));
    }

useSelector re-renders the component only when the value it returns changes, so select the
smallest piece you need. Both are hooks: call them at the top of a component, never in a handler or
an if.

## Common mistakes

- **Mutating what useSelector returned** (items.push(x) in a component). That is the store's state
  outside a reducer; it is frozen in development and silently wrong otherwise. Dispatch instead.
- **Mutating the draft and also returning something**, which Immer rejects.
- **Selecting the whole state** (state => state), re-rendering on every change anywhere.
- **Forgetting the Provider**, which fails with "could not find react-redux context value".`,
    workedExample: `**Adding a filter to the task list without touching the list's internals.**

The slice already has filter and setFilter. A filter bar dispatches; the list derives what to show:

    function FilterBar() {
      const filter = useSelector(s => s.tasks.filter);
      const dispatch = useDispatch();
      return ['all', 'open', 'done'].map(f => (
        <Button key={f} variant={f === filter ? 'primary' : 'outline-primary'}
                onClick={() => dispatch(setFilter(f))}>{f}</Button>
      ));
    }

    function TaskList() {
      const items = useSelector(s => s.tasks.items);
      const filter = useSelector(s => s.tasks.filter);
      const shown = items.filter(t => filter === 'all' || (filter === 'done') === t.done);
      ...
    }

The two components never pass props to each other. Each reads only what it needs from the store,
and the filtering is derived during render rather than stored as a second copy of the list.`,
    mcqs: [
      mcq('Inside a createSlice reducer, why may you write state.items.push(task)?', [
        ['Immer records the change and produces a new immutable state', true],
        ['Redux Toolkit switches off immutability for all of its slices', false],
        ['push is replaced by Redux so it returns a copied array instead', false],
        ['Reducers run against a cloned store that is thrown away after', false],
      ], 'RTK wraps reducers in Immer, which hands you a draft and turns your writes into a fresh state object. The store is never mutated, so React-Redux still sees new references.'),
      mcq("For createSlice({ name: 'tasks', reducers: { addTask } }), what is the type of the action that addTask(...) creates?", [
        ["'tasks/addTask'", true],
        ["'addTask'", false],
        ["'TASKS_ADD_TASK'", false],
        ["'tasks.addTask'", false],
      ], 'createSlice builds each action type as the slice name, a slash, and the reducer name. That prefix keeps types from colliding between slices.'),
      mcq('A component using useSelector throws "could not find react-redux context value". What is missing?', [
        ['<Provider store={store}> around the app', true],
        ['A default value passed to useSelector', false],
        ['A createSlice call inside the component', false],
        ['An initialState prop on the component', false],
      ], 'useSelector and useDispatch find the store through React context, which the Provider supplies. Without it there is no store to read.'),
    ],
    checkpoint: [
      cq('STATE_MANAGEMENT', 'Which configureStore call registers a tasks slice so that state.tasks exists?', [
        ['configureStore({ reducer: { tasks: tasksSlice.reducer } })', true],
        ['configureStore({ slices: [tasksSlice.actions, tasksSlice.name] })', false],
        ['configureStore({ tasks: tasksSlice, reducer: tasksSlice.name })', false],
        ['configureStore({ initialState: tasksSlice.initialState })', false],
      ], 'configureStore takes a reducer map; each key becomes a top-level property of state and its value is the slice reducer that manages it.'),
      cq('REACT_HOOKS', 'A TaskCount component should re-render only when the number of tasks changes. Which selector fits?', [
        ['useSelector(state => state.tasks.items.length)', true],
        ['useSelector(state => state)', false],
        ['useSelector(state => ({ ...state.tasks }))', false],
        ['useSelector(state => state.tasks)', false],
      ], 'useSelector compares the returned value with the previous one. A number stays equal until the count changes; the whole state or a new spread object changes on every update.'),
      cq('REACT_HOOKS', 'Where must useDispatch() be called?', [
        ['At the top level of a component or a custom hook', true],
        ['Inside the reducer that handles the dispatched action', false],
        ['Inside createSlice, so actions dispatch themselves', false],
        ['Inside the click handler, each time it is needed', false],
      ], 'useDispatch is a hook and follows the rules of hooks: called unconditionally at the top of a component or custom hook. The returned dispatch function is what you use inside handlers.'),
    ],
  },
  {
    unitCode: 'JT_REACT_STATE_ASYNC_THUNKS',
    notes: `**Reducers must be synchronous and pure, so they cannot call an API.** createAsyncThunk is the RTK
tool for the async part: it runs your request and dispatches actions describing how it went.

## The thunk

    // tasksSlice.js
    import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
    import { tasksApi } from '../../api/client';

    export const fetchTasks = createAsyncThunk('tasks/fetchAll', async () => {
      return await tasksApi.list();          // whatever is returned becomes action.payload
    });

    export const createTask = createAsyncThunk('tasks/create', async (body, { rejectWithValue }) => {
      try {
        return await tasksApi.create(body);
      } catch (err) {
        return rejectWithValue(err.response?.data || { message: 'Network error' });
      }
    });

Dispatching fetchTasks() dispatches **tasks/fetchAll/pending** at once, then either
**tasks/fetchAll/fulfilled** with the returned data or **tasks/fetchAll/rejected** with the error.

## Handling the three actions

Those actions are created by the thunk, not by the slice's reducers, so the slice listens for them in
**extraReducers**:

    const tasksSlice = createSlice({
      name: 'tasks',
      initialState: { items: [], status: 'idle', error: null },
      reducers: { /* ... */ },
      extraReducers: builder => {
        builder
          .addCase(fetchTasks.pending,   state => { state.status = 'loading'; })
          .addCase(fetchTasks.fulfilled, (state, action) => {
            state.status = 'succeeded';
            state.items = action.payload;
          })
          .addCase(fetchTasks.rejected,  (state, action) => {
            state.status = 'failed';
            state.error = action.error.message;
          })
          .addCase(createTask.fulfilled, (state, action) => { state.items.push(action.payload); });
      },
    });

## In the component

    function TaskList() {
      const { items, status, error } = useSelector(s => s.tasks);
      const dispatch = useDispatch();

      useEffect(() => {
        if (status === 'idle') dispatch(fetchTasks());
      }, [status, dispatch]);

      if (status === 'loading') return <Spinner animation="border" />;
      if (status === 'failed') return <Alert variant="danger">{error}</Alert>;
      ...
    }

The 'idle' check stops a second fetch when the component mounts again (and the double effect
React's StrictMode runs in development).

When a component needs to know how one particular dispatch went — to close a form only on success —
**unwrap()** turns the result into a promise that resolves with the payload or throws:

    try {
      await dispatch(createTask(form)).unwrap();
      onClose();
    } catch (e) { setFormError(e.message); }

## Common mistakes

- **No return in the payload creator** — fulfilled arrives with undefined.
- **Handling thunk actions in reducers** instead of extraReducers.
- **No rejected case**, leaving status at 'loading' forever when the API fails.
- **Dispatching from a reducer.** Reducers never dispatch; follow-up work goes in the thunk or the
  component.`,
    mcqs: [
      mcq("A thunk created with createAsyncThunk('tasks/fetchAll', ...) is dispatched. Which action types can follow?", [
        ['tasks/fetchAll/pending, then /fulfilled or /rejected', true],
        ['tasks/fetchAll/start, then tasks/fetchAll/done or /error', false],
        ['tasks/fetchAll/loading, then /success only', false],
        ['FETCH_ALL_REQUEST, then _SUCCESS or _FAILURE', false],
      ], 'createAsyncThunk appends /pending, /fulfilled and /rejected to the type prefix you give it. Pending is dispatched immediately, then exactly one of the other two.'),
      mcq("Why are a thunk's results handled in extraReducers rather than in reducers?", [
        ["The actions are created by the thunk, not by this slice's reducers", true],
        ['reducers cannot change any state that came from a network request', false],
        ['extraReducers runs on the server while reducers run in the browser', false],
      ], 'The reducers field both defines handlers and generates action creators for them. Actions defined elsewhere, such as a thunk\'s lifecycle actions, are matched in extraReducers.'),
      mcq('The payload creator does await api.get(\'/tasks\') but has no return statement. What does the fulfilled reducer receive?', [
        ['undefined as action.payload', true],
        ['The full axios response object', false],
        ['The response data, returned implicitly', false],
        ['A rejected action in its place', false],
      ], 'The fulfilled payload is exactly what the payload creator returns. With no return, the async function resolves to undefined, and the reducer overwrites items with it.'),
    ],
    checkpoint: [
      cq('STATE_MANAGEMENT', 'A form should close only if creating the task succeeded. Which call gives a promise that throws when the thunk is rejected?', [
        ['await dispatch(createTask(data)).unwrap()', true],
        ['await dispatch(createTask(data)).payload', false],
        ['await createTask(data).fulfilled()', false],
        ['await dispatch(createTask.fulfilled(data))', false],
      ], 'dispatch of a thunk always resolves with the final action, even a rejected one. unwrap() returns the payload on success and throws the error on rejection, so try/catch works.'),
      cq('STATE_MANAGEMENT', "In development with StrictMode, a list's effect dispatches fetchTasks twice. What guard is commonly used?", [
        ["Dispatch only when the slice's status is 'idle'", true],
        ['Remove StrictMode from main.jsx for good', false],
        ['Dispatch from inside the reducer, not the effect', false],
        ['Keep a module-level boolean outside React', false],
      ], 'Once the first dispatch sets status to loading, the second effect run sees a non-idle status and skips. Removing StrictMode hides the symptom, and reducers must never dispatch.'),
      cq('STATE_MANAGEMENT', "The API returns 422 with { message: 'Title required' }. How does the thunk pass that body to the rejected case?", [
        ['return rejectWithValue(err.response.data)', true],
        ['throw the message string from the reducer', false],
        ['dispatch an error action in extraReducers', false],
        ['set state.error inside the payload creator', false],
      ], 'rejectWithValue makes the rejected action carry your chosen payload, so the reducer can read action.payload.message. The payload creator has no access to state, and reducers cannot dispatch.'),
    ],
  },
  {
    unitCode: 'JT_REACT_STATE_DEBUGGING',
    notes: `**Redux bugs look like "the screen did not update" or "the screen went blank".** Almost all of them
come from five causes. Open Redux DevTools first: it shows every action and the state after it, so
you can see whether the action fired and what it did.

## Bug 1 — changing state outside a slice

    function AddTask() {
      const tasks = useSelector(s => s.tasks.items);
      function add(title) {
        tasks.push({ id: Date.now(), title, done: false });   // bug
      }
      ...
    }

Nothing re-renders, and in development the store's state is frozen, so it throws "Cannot add
property, object is not extensible". **Diagnosis:** the store's state was written outside a reducer.
**Fix:** dispatch(addTask(title)) and do the push inside the slice reducer, where Immer makes it safe.

## Bug 2 — the list disappears after a toggle

    toggleTask(state, action) {
      const task = state.items.find(t => t.id === action.payload);
      task.done = !task.done;
      return task;                                            // bug
    }

**Diagnosis:** returning a value from an Immer reducer replaces the whole slice state with it, so
state.tasks is now one task and state.tasks.items is undefined. **Fix:** delete the return.

## Bug 3 — Cannot read properties of undefined (reading 'items')

    const items = useSelector(state => state.task.items);    // store key is 'tasks'

**Diagnosis:** the selector path does not match the key in configureStore's reducer map. Check the
state tree in DevTools and correct the path.

## Bug 4 — the spinner that never stops

    extraReducers: b => {
      b.addCase(fetchTasks.pending,   s => { s.status = 'loading'; })
       .addCase(fetchTasks.fulfilled, (s, a) => { s.status = 'succeeded'; s.items = a.payload; });
    }

When the API is down, DevTools shows tasks/fetchAll/rejected — and nothing handles it. **Fix:** add
the rejected case setting status to 'failed' and storing the error.

## Bug 5 — the items become undefined after loading

    export const fetchTasks = createAsyncThunk('tasks/fetchAll', async () => {
      await tasksApi.list();                                  // bug: no return
    });

DevTools shows fulfilled with no payload. **Fix:** return the data.

## Bug 6 — an action that does nothing

    onClick={() => toggleTask(task.id)}                       // bug: never dispatched

An action creator only builds an object. **Fix:** dispatch(toggleTask(task.id)). DevTools makes this
obvious: no action appears at all when you click.

## The method

Click, then look at DevTools. No action: it was never dispatched. The action but no change: the
reducer or the case is missing. The change but no re-render: the selector reads the wrong path or
the state was mutated outside the store.`,
    mcqs: [
      mcq('A component does const tasks = useSelector(s => s.tasks.items); tasks.push(newTask). The list does not update, and development mode throws. Why?', [
        ['Store state was changed outside a reducer instead of via dispatch', true],
        ['push is slower than concat, so React skips the update entirely', false],
        ['The selector should have returned a fresh array on every call', false],
        ['useSelector values can be changed only from inside an effect', false],
      ], 'useSelector returns the store\'s own state, which must only change through a dispatched action handled by a reducer. RTK freezes state in development to catch exactly this.'),
      mcq('A reducer finds a task, flips task.done, and then has return task. After a toggle, the whole list disappears. What is wrong?', [
        ['Returning task replaces the slice state with that one task', true],
        ['find cannot be used on Immer draft arrays inside a reducer', false],
        ['done must be changed through a setter, not by assignment', false],
        ['The reducer must be async to change a nested property', false],
      ], 'In an Immer reducer, returning a value means "this is the new state". The draft change is discarded and state.tasks becomes a single task object with no items array.'),
      mcq("useSelector(state => state.task.items) throws 'Cannot read properties of undefined'. The store uses reducer: { tasks: tasksReducer }. What is the cause?", [
        ['The selector says task where the store key is tasks', true],
        ['The slice has no initialState holding an items array', false],
        ['useSelector must be called inside a useEffect hook', false],
        ['The Provider was given the reducer rather than the store', false],
      ], 'The reducer map key decides the path in state. state.task does not exist, so reading .items from undefined throws; the selector must use state.tasks.'),
      mcq("The status stays 'loading' forever when the API fails. The slice handles the thunk's pending and fulfilled actions. What is missing?", [
        ["A rejected case that sets the status to 'failed'", true],
        ['A second dispatch of the thunk from a catch block', false],
        ['A finally reducer that the thunk calls at the end', false],
        ['A try/catch around the extraReducers builder', false],
      ], 'A failed request dispatches the rejected action. With no case for it, nothing moves status away from loading, so the UI never learns the request failed.'),
    ],
  },
  {
    unitCode: 'JT_REACT_STATE_PRACTICE',
    notes: `**Six exercises building one tasks store, step by step.** Use a fresh Vite project with
@reduxjs/toolkit and react-redux, and json-server for the API (db.json with a tasks array, run with
npx json-server db.json --port 3001). Keep Redux DevTools open the whole time.

**1 — The slice.** Write tasksSlice with initialState { items: [], filter: 'all', status: 'idle',
error: null } and reducers addTask, toggleTask, removeTask and setFilter. Wire configureStore and the
Provider. Check in DevTools that each action appears with the payload you expect.

**2 — Read and change.** Build TaskList (useSelector for items and filter, derived filtering in
render) and AddTaskForm (local state for the input, dispatch on submit). Check: the input's text is
not in the store; the tasks are.

**3 — Selectors.** Write selectVisibleTasks and selectOpenCount as functions in the slice file and use
them in two components. Check: the count badge re-renders only when the count changes (React
DevTools, "highlight updates").

**4 — Load from the API.** Write fetchTasks with createAsyncThunk and handle pending, fulfilled and
rejected. Dispatch it in an effect only when status is 'idle'. Stop json-server and check the error
state appears.

**5 — Create through the API.** Write createTask using rejectWithValue. In the form, await
dispatch(createTask(...)).unwrap() and clear the input only on success; show the server's message on
failure.

**6 — Toggle optimistically.** Flip done in the store at once, call the API, and flip it back in the
rejected case. Check by stopping json-server, toggling, and watching it revert.

Finish by reading your slice: no API calls in reducers, no returns alongside draft mutation, a
rejected case for every thunk.`,
    mcqs: [
      mcq('Which reducer body removes the task whose id is action.payload?', [
        ['state.items = state.items.filter(t => t.id !== action.payload)', true],
        ['state.items.filter(t => t.id !== action.payload); return state', false],
        ['return state.items.remove(action.payload) from the reducer', false],
        ['delete state.items[action.payload.id] on the draft array', false],
      ], 'filter returns a new array, so it must be assigned back to the draft. Calling filter without using the result changes nothing, and arrays have no remove method.'),
      mcq("What does dispatch(updateTitle({ id: 3, title: 'Buy milk' })) put in action.payload?", [
        ["{ id: 3, title: 'Buy milk' }", true],
        ["[3, 'Buy milk']", false],
        ["'Buy milk' only", false],
        ["{ payload: { id: 3, title: 'Buy milk' } }", false],
      ], 'An RTK action creator puts its single argument into payload unchanged. Pass an object when the reducer needs more than one value.'),
      mcq('selectOpenCount = state => state.tasks.items.filter(t => !t.done).length. With five tasks, two of them done, what does it return?', [
        ['3', true],
        ['2', false],
        ['5', false],
        ['[true, true]', false],
      ], 'The filter keeps tasks whose done is false — three of the five — and length counts them. The selector returns a number, not the filtered items.'),
      mcq("Where does a slice's starting state go?", [
        ['In the initialState field given to createSlice', true],
        ['In configureStore as preloadedState, and only there', false],
        ['In the Provider, as a defaultState prop on it', false],
        ['In a default value passed to every useSelector', false],
      ], 'Each slice declares its own initialState, which configureStore combines into the store\'s starting state. preloadedState exists but is for restoring saved state, not defining it.'),
      mcq('Which pair of hooks reads from and writes to the Redux store from a component?', [
        ['useSelector and useDispatch', true],
        ['useState and useReducer', false],
        ['useStore and useEffect', false],
        ['useContext and useMemo', false],
      ], 'useSelector subscribes to a piece of store state and useDispatch returns the function that sends actions. useState and useReducer manage component-local state.'),
    ],
  },
  {
    unitCode: 'JT_REACT_STATE_INTERVIEW_QUESTION',
    notes: `**Three questions an interviewer asks about state management in React, with model answers and
the follow-up.** Answer each aloud before reading the model.

## Question 1 — "When would you use Redux, and when not?"

**Model answer.** I keep state as close to where it is used as I can. Local UI state — a form's input,
whether a modal is open — stays in useState. State two siblings share I lift to their parent. Values
needed deep in the tree that rarely change, like the logged-in user or the theme, go in context. I
reach for Redux Toolkit when the same data is read and changed from many unrelated parts of the app,
like a task list edited from a list, a detail page and a dashboard, and the update rules are worth
having in one tested place with DevTools.

**Follow-up: "Why not just use context for all of it?"** Context re-renders every consumer whenever
its value changes and has no selectors. For frequently changing shared data that becomes slow and
hard to trace. useSelector re-renders only the components whose selected value changed.

## Question 2 — "Walk me through Redux Toolkit."

**Model answer.** configureStore creates the store from a map of slice reducers and sets up DevTools.
createSlice takes a name, initialState and reducers, and generates action creators named after the
reducers, with types like tasks/addTask. Reducers can be written as if they mutate because Immer
turns that into a new immutable state. The Provider makes the store available; components read with
useSelector and send actions with useDispatch.

**Follow-up: "How is writing state.items.push(x) not a mutation?"** It is a write to an Immer draft, not
to the real state. Immer records the changes and produces a new object with only the changed parts
copied, so references change where they should and React-Redux sees the update.

## Question 3 — "How do you load API data into the store?"

**Model answer.** With createAsyncThunk. The payload creator calls the api module and returns the
data. The thunk dispatches pending, then fulfilled or rejected, which the slice handles in
extraReducers to set status, items and error. Components dispatch it from an effect when status is
idle and render loading, error and data from the status.

**Follow-up: "And if the component needs to know whether one request succeeded?"** Await
dispatch(thunk()).unwrap(), which resolves with the payload or throws, so the form can close only on
success and show the server's message otherwise. For server errors I use rejectWithValue so the
response body reaches the rejected case.`,
    mcqs: [
      mcq('An interviewer asks why Redux Toolkit is preferred to hand-written Redux. Which short answer is accurate?', [
        ['Less boilerplate: slices create actions and reducers, Immer handles copies', true],
        ['It is faster at runtime because it skips reducers for most dispatched actions', false],
        ['It removes the need for a store, so shared state lives inside components', false],
      ], 'RTK keeps the Redux model but generates action creators and types from slices and uses Immer for immutable updates. It still has a store and still runs every reducer.'),
      mcq("Asked 'Would you put every piece of state in Redux?', which answer shows judgment?", [
        ['No — local UI state stays local; shared app state goes in the store', true],
        ['Yes — one source of truth means every value belongs in the store', false],
        ['No — Redux holds only data from a server, never any UI state', false],
      ], 'The right home for state depends on who reads and changes it. A store helps for widely shared state and adds cost for state one component owns.'),
      mcq("Follow-up: 'How do you load server data into Redux Toolkit?' Which answer names the standard approach?", [
        ['createAsyncThunk, handling pending, fulfilled and rejected', true],
        ['An effect that assigns to store.getState() directly', false],
        ['A setInterval that polls the API and replaces the store', false],
      ], 'createAsyncThunk runs the request outside the reducer and dispatches lifecycle actions; extraReducers turns them into status, data and error. State is never assigned directly.'),
    ],
  },
  {
    unitCode: 'JT_REACT_STATE_CHECKPOINT',
    notes: `**Ten questions on state in React apps: where state belongs, Redux Toolkit slices and the store,
the hooks that connect components, and loading server data with thunks.** Each is a situation
from a real codebase. Answer without looking anything up.`,
    checkpoint: [
      cq('STATE_MANAGEMENT', 'In a React app using Redux Toolkit, what is the only sanctioned way for a component to change store state?', [
        ['Dispatch an action that a slice reducer handles', true],
        ['Call setState on the value useSelector returned', false],
        ['Assign to store.getState().tasks in an effect', false],
        ["Pass a new state object to the Provider's store", false],
      ], 'Store state changes only when a reducer handles a dispatched action. That single path is what makes changes traceable in DevTools and lets subscribed components re-render.'),
      cq('REACT_HOOKS', 'A component uses useSelector(s => s.tasks.items.filter(t => !t.done)) and re-renders on every store update, even unrelated ones. Why?', [
        ['filter returns a new array each time, so the result never compares equal', true],
        ['useSelector re-renders on every dispatched action anywhere in the app', false],
        ['The component is missing a key prop on the list that it renders', false],
        ['filter mutates the store, which forces React to render the component', false],
      ], 'useSelector re-renders when the selected value is not === the previous one. A new array is never equal, so select the raw items and filter in render, or memoise with createSelector.'),
      cq('STATE_MANAGEMENT', 'A tasks slice has failed to load. Which state shape is easiest for the UI to read?', [
        ["{ items: [], status: 'failed', error: 'Network Error' }", true],
        ["{ items: 'Network Error', status: false }", false],
        ['{ failed: true, loading: true, items: null }', false],
        ["{ data: { error: { status: 'failed' } } }", false],
      ], 'Keeping items as an array, a single status and a separate error message means the UI checks one field to choose what to render and never meets contradictory flags.'),
      cq('REACT_HOOKS', 'A custom hook useTasks() wraps useSelector, useDispatch and a fetch on mount. What is the benefit?', [
        ['Components get tasks and status without repeating store wiring', true],
        ['It lets components use the store without any Provider above', false],
        ['It makes the selector run only once in the life of the app', false],
        ['It turns the async thunk into a synchronous function call', false],
      ], 'A custom hook packages repeated hook calls so several components share them. It still relies on the Provider and still re-runs selectors on store changes.'),
      cq('STATE_MANAGEMENT', 'A user ticks a task and the UI should update before the server confirms. What is the pattern, and what must you handle?', [
        ['An optimistic update; roll back if the request fails', true],
        ['A pessimistic update; block the whole UI until a full reload', false],
        ['A memoised update; cache the response for an hour', false],
        ['A batched update; merge all changes at logout', false],
      ], 'Optimistic updates change local state first for responsiveness. Because the server may refuse, the rejected case must restore the previous value.'),
      cq('STATE_MANAGEMENT', 'Two slices, tasks and auth, must both reset when the user logs out. What is a clean approach?', [
        ['Both slices handle a shared logout action in extraReducers', true],
        ["The logout button edits both slices' state objects directly", false],
        ['Create a brand new store with configureStore after logout', false],
        ['Each slice polls the auth state and clears itself on a timer', false],
      ], 'Any slice can respond to an action defined elsewhere through extraReducers, so one logout dispatch resets both. Editing state directly bypasses reducers entirely.'),
      cq('REACT_HOOKS', 'Why must useSelector and useDispatch not be called inside an if block?', [
        ['Hooks must run in the same order on every render', true],
        ['They work in class components only inside a condition', false],
        ['The condition runs before the Provider has mounted', false],
        ['The store refuses calls made from a conditional branch', false],
      ], 'React matches hook calls to their stored state by call order. A hook that runs on some renders and not others shifts that order and breaks every hook after it.'),
      cq('STATE_MANAGEMENT', 'Which of these belongs in the Redux store rather than in local component state?', [
        ['The logged-in user, read by the navbar, guards and profile page', true],
        ['Whether one dropdown in the footer is currently open or closed', false],
        ['The text in a search box before the user submits the form', false],
        ['The hover state of a single card inside a product grid', false],
      ], 'The logged-in user is read in many unrelated places and changes rarely but meaningfully. The other three matter to one component only.'),
      cq('STATE_MANAGEMENT', "After createTask succeeds, the list still doesn't show the new task. The createTask.fulfilled case is empty. What fixes it?", [
        ["Push action.payload into state.items in createTask's fulfilled case", true],
        ['Dispatch fetchTasks from inside the createTask reducer at once', false],
        ['Call window.location.reload() once the createTask promise has resolved', false],
        ["Add createTask to the list component's effect dependency array", false],
      ], 'The fulfilled payload is the created task from the server; adding it to items updates every component that selects the list. Reducers cannot dispatch, and reloading discards the app.'),
      cq('REACT_HOOKS', 'dispatch comes from useDispatch() at the top of a form component. Which submit handler adds the task?', [
        ['onSubmit={() => dispatch(addTask(form))}', true],
        ['onSubmit={() => addTask(form)}', false],
        ['onSubmit={() => useDispatch()(addTask(form))}', false],
        ['onSubmit={() => store.addTask(form)}', false],
      ], 'addTask only builds an action object; it has to be passed to dispatch. Calling useDispatch inside a handler breaks the rules of hooks, and the store has no addTask method.'),
    ],
  },

  /* ══ JT_REACT_BUILD ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_REACT_BUILD_VITE',
    notes: `**Vite is the tool that creates, runs and builds a modern React project.** In development it
serves your source files almost instantly and updates the page as you save; for production it
bundles everything into a small set of static files.

## Creating and running

    npm create vite@latest task-manager -- --template react
    cd task-manager
    npm install
    npm run dev        # http://localhost:5173, with hot module replacement

The project is small on purpose:

    index.html          the one HTML page, with <div id="root"></div>
    src/main.jsx        createRoot(document.getElementById('root')).render(<App />)
    src/App.jsx         your top component
    public/             files copied as-is (favicon, robots.txt)
    vite.config.js      plugins and dev-server settings
    package.json        scripts: dev, build, preview

Note that index.html sits at the project root, not in public, and loads /src/main.jsx as a module.

## Building for production

    npm run build      # writes dist/
    npm run preview    # serves dist/ locally, like a real host would

dist contains index.html and an assets folder of files like index-4f9a2c1b.js and index-91de0f.css.
The hash in the name changes only when the content changes, so a host can cache them forever and
browsers download only what is new after a deploy. JSX is compiled, unused code is dropped, and the
result is minified.

**dist is just static files.** Any static host can serve it — Netlify, Vercel, GitHub Pages, an S3
bucket, or Spring Boot's static folder. There is no Node server in production.

## Assets: src or public

An image imported in a component (import logo from './assets/logo.svg') goes through the build and
gets a hashed name. A file in public is copied unchanged and referenced from the root:
<img src="/favicon.png" />. Use imports for anything a component owns; public for files that must
keep their exact name.

## Talking to a local backend

During development, a proxy in vite.config.js forwards API calls so they are same-origin:

    export default defineConfig({
      plugins: [react()],
      server: { proxy: { '/api': 'http://localhost:8080' } },
    });

The proxy exists only in the dev server; production needs the real API URL (next unit but one).

## Common mistakes

- **Double-clicking dist/index.html.** file:// cannot load the module scripts; use npm run preview.
- **Committing node_modules or dist.** Both are rebuilt from source; add them to .gitignore.
- **Writing src="/public/logo.png".** Files in public are served from the root, without "public".
- **Expecting the dev proxy in production.** It is a development convenience only.`,
    mcqs: [
      mcq('What does npm run build produce in a Vite React project?', [
        ['A dist folder of static HTML, JS and CSS ready to host', true],
        ['A Node server that renders the React pages per request', false],
        ['A single .jsx file containing every component in the app', false],
      ], 'Vite compiles and bundles the app into static files in dist. Serving them needs only a static host; there is no server-side rendering in a plain Vite React build.'),
      mcq('Why are files in dist named like index-4f9a2c1b.js?', [
        ['The hash changes with the content, so browsers fetch only changed files', true],
        ['The hash is a licence key that the host checks during each deploy', false],
        ['It stops other developers from reading the code in the bundle', false],
      ], 'Content hashing lets hosts cache assets indefinitely; a changed file gets a new name, so users never run a stale cached copy after a deploy.'),
      mcq('An image lives at public/logo.png in a Vite project. Which src should the JSX use?', [
        ["'/logo.png'", true],
        ["'./public/logo.png'", false],
        ["'../public/logo.png'", false],
        ["'/public/logo.png'", false],
      ], 'Vite serves the contents of public at the site root and copies them to the root of dist, so the path has no public segment.'),
    ],
    checkpoint: [
      cq('REACT_COMPONENTS', 'Opening dist/index.html by double-clicking it shows a blank page. What is the right way to check a production build locally?', [
        ['Run npm run preview and open the URL it prints', true],
        ['Run npm run dev, which serves the dist folder too', false],
        ['Rename index.html to main.jsx and open it again', false],
        ['Copy dist into src and start the dev server again', false],
      ], 'Module scripts and root-relative asset paths do not work from file://. npm run preview serves dist over HTTP the way a host would; npm run dev serves source, not the build.'),
      cq('REACT_COMPONENTS', "Where does a Vite React app's component tree attach to the page?", [
        ['main.jsx calls createRoot on the #root element of index.html', true],
        ['Vite injects App into the body automatically, with no code', false],
        ['App.jsx renders itself when Vite first imports the file', false],
        ['vite.config.js names the element under a mount option', false],
      ], 'index.html provides an empty div with id root and loads src/main.jsx, which calls createRoot on that div and renders App into it.'),
      cq('REACT_COMPONENTS', 'A teammate commits node_modules and dist to Git. What should the repository contain instead?', [
        ['Source and package files; both folders are rebuilt from them', true],
        ['Only dist, since that is what actually runs in production', false],
        ['Only node_modules, since it holds all the code the app needs', false],
      ], 'npm install recreates node_modules from package.json and the lockfile, and npm run build recreates dist. Committing them bloats the repository and causes constant conflicts.'),
    ],
  },
  {
    unitCode: 'JT_REACT_BUILD_BOOTSTRAP_IN_REACT',
    notes: `**Bootstrap's CSS works in React unchanged; its JavaScript does not fit as well.** So the usual
approach is: Bootstrap classes for layout and look, React-Bootstrap components for anything that
opens, closes or toggles.

    npm install bootstrap react-bootstrap

    // main.jsx — once, before your own CSS
    import 'bootstrap/dist/css/bootstrap.min.css';
    import './index.css';

## Classes in JSX

Everything you know from Bootstrap works — with **className**, because class is a reserved word in
JavaScript:

    <div className="container py-4">
      <div className="row g-3">
        <div className="col-12 col-md-4"><TaskCard task={t} /></div>
      </div>
    </div>

Classes can be built from props: className={'badge ' + (task.done ? 'text-bg-success' : 'text-bg-secondary')}.

## React-Bootstrap components

React-Bootstrap re-implements Bootstrap's components as React components, controlled by props and
state rather than by data-bs attributes:

    import { Container, Row, Col, Card, Button, Modal, Form } from 'react-bootstrap';

    function TaskBoard({ tasks }) {
      const [show, setShow] = useState(false);
      return (
        <Container className="py-4">
          <Button onClick={() => setShow(true)}>New task</Button>
          <Row xs={1} md={3} className="g-3 mt-1">
            {tasks.map(t => (
              <Col key={t.id}>
                <Card body>{t.title}</Card>
              </Col>
            ))}
          </Row>
          <Modal show={show} onHide={() => setShow(false)}>
            <Modal.Header closeButton><Modal.Title>New task</Modal.Title></Modal.Header>
            <Modal.Body><Form.Control placeholder="Title" /></Modal.Body>
          </Modal>
        </Container>
      );
    }

Whether the modal is open is ordinary React state, so it can be opened from code, closed after a
save, or tested.

## With React Router

A Bootstrap nav link that should navigate without a reload uses the **as** prop:

    <Navbar bg="dark" data-bs-theme="dark" expand="md">
      <Container>
        <Navbar.Brand as={Link} to="/">Tasks</Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse>
          <Nav>
            <Nav.Link as={NavLink} to="/tasks">All tasks</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>

NavLink adds the active class, which Bootstrap already styles.

## Common mistakes

- **class instead of className** — React warns, and in some cases the class is dropped.
- **Forgetting the CSS import** — React-Bootstrap components render unstyled.
- **Loading bootstrap.bundle.js as well** — two scripts handle the same clicks, and dropdowns open
  and close at once.
- **Nav.Link with href** inside the app, which reloads the page.`,
    mcqs: [
      mcq('React-Bootstrap buttons render with no styling at all. What was most likely forgotten?', [
        ['Importing bootstrap/dist/css/bootstrap.min.css once', true],
        ['Wrapping each button in a ThemeProvider component', false],
        ["Adding className='btn' alongside the variant prop", false],
      ], 'React-Bootstrap outputs Bootstrap markup and classes but ships no CSS. The stylesheet must be imported once, usually in main.jsx.'),
      mcq('Why is a React-Bootstrap Modal opened with a show prop instead of data-bs-toggle?', [
        ['React state then owns whether it is open, like any other UI', true],
        ['data-bs attributes are not valid HTML anywhere inside JSX markup', false],
        ["The show prop loads the modal's CSS from a CDN on demand", false],
      ], 'React-Bootstrap components are controlled by props. Keeping open/closed in state means code can open or close the modal, for example after a successful save.'),
      mcq('Which JSX makes a navbar link navigate with React Router and still look like a Bootstrap nav link?', [
        ["<Nav.Link as={NavLink} to='/tasks'>Tasks</Nav.Link>", true],
        ["<Nav.Link href='/tasks' router>Tasks</Nav.Link>", false],
        ["<NavLink className='nav' href='/tasks'>Tasks</NavLink>", false],
        ["<Nav.Link to='/tasks' reload={false}>Tasks</Nav.Link>", false],
      ], "The as prop renders Nav.Link using React Router's NavLink, so it gets Bootstrap's classes and client-side navigation together. href would reload the page."),
    ],
    checkpoint: [
      cq('BOOTSTRAP', 'A board needs three cards per row on desktop and one per row on phones. Which React-Bootstrap markup does it?', [
        ['<Col xs={12} md={4}> for each card, inside a <Row>', true],
        ['<Col span={3}> for each card, with no Row around them', false],
        ["<Row cols='3'> with each card set to a width of 33%", false],
        ['<Container fluid> alone, wrapping the list of cards', false],
      ], 'Bootstrap\'s grid has twelve columns: xs={12} fills the row on phones and md={4} takes a third from the md breakpoint up. Columns must sit inside a Row.'),
      cq('REACT_COMPONENTS', "A developer writes <div class='card'> in JSX and sees a warning. What is the fix?", [
        ['Use className, since class is reserved in JavaScript', true],
        ['Use styleName, which is how JSX names CSS classes', false],
        ['Use cssClass, which React maps to the class attribute on render', false],
        ['Wrap the class name in braces so JSX evaluates it', false],
      ], 'JSX compiles to JavaScript, where class is a keyword, so React uses the DOM property name className for the class attribute.'),
      cq('BOOTSTRAP', "Bootstrap's bundle JS and React-Bootstrap are both loaded, and dropdowns open then close instantly. Why?", [
        ['Two scripts handle the same click and toggle it twice', true],
        ['React-Bootstrap needs jQuery loaded to keep its dropdown menus open', false],
        ['The CSS file must be loaded after the JS for menus', false],
        ['Dropdowns need a key prop to stay open in React', false],
      ], 'Bootstrap\'s own JavaScript and React-Bootstrap both respond to the click; one opens the menu and the other closes it. In React, use React-Bootstrap and drop bootstrap.bundle.js.'),
    ],
  },
  {
    unitCode: 'JT_REACT_BUILD_ENV_DEPLOY',
    notes: `**The same code runs against a local API in development and a real one in production.** The
difference lives in environment variables, and the build is published to a static host.

## Vite environment variables

    # .env.development
    VITE_API_URL=http://localhost:3001

    # .env.production
    VITE_API_URL=https://tasks-api.example.com

    // src/api/client.js
    const client = axios.create({ baseURL: import.meta.env.VITE_API_URL });

Three rules:

- **Only names starting with VITE_ are exposed** to your code. API_URL without the prefix is
  undefined in the browser — on purpose, so server secrets in the same file do not leak.
- **It is import.meta.env, not process.env.** process.env is Node and Create React App.
- **Values are baked in at build time.** Vite replaces them with literal strings when it builds. A
  changed value needs a new build; a changed .env needs the dev server restarted.

Because they end up in public JavaScript, **VITE_ variables are not secret**. An API URL is fine; a
payment key, database password or AI provider key is not — those belong on the server.

## Deploying to Netlify

Connect the GitHub repository, then set: build command **npm run build**, publish directory **dist**,
and VITE_API_URL under Site configuration, Environment variables. Then add this so client routes work
on refresh:

    # public/_redirects  (copied into dist by the build)
    /*    /index.html   200

## Deploying to Vercel

Import the repository; Vercel detects Vite. Add VITE_API_URL in Project Settings, Environment
Variables, and a rewrite:

    // vercel.json
    { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }

## Why the rewrite matters

Clicking to /tasks/7 inside the app never asks the host for anything. Refreshing /tasks/7 does: the
browser requests that path, the host has no such file, and without the rewrite it answers 404. The
rewrite serves index.html for every path, React loads, and React Router renders /tasks/7.

## After deploying, check

- Refresh a deep link such as /tasks/7.
- Open the Network tab: API calls go to the production URL, over HTTPS. An HTTPS page calling an
  HTTP API is blocked as mixed content.
- If the API is on another domain, its CORS settings must allow the deployed site's origin.

## Common mistakes

- **API_URL instead of VITE_API_URL** — undefined, so requests go to the frontend's own host.
- **Changing the variable in the dashboard and not redeploying.**
- **A secret in a VITE_ variable.**
- **No SPA rewrite**, so every deep link 404s on refresh.`,
    mcqs: [
      mcq('Why must a payment provider secret never go in VITE_SECRET_KEY?', [
        ['VITE_ values are bundled into public JavaScript anyone can read', true],
        ['Vite encrypts the values, and the key is lost on every build', false],
        ['Vite reads secrets only from a separate file named .env.secret instead', false],
      ], 'Vite inlines VITE_ variables into the built files as plain strings, and those files are downloaded by every visitor. Secrets must stay on a server.'),
      mcq('VITE_API_URL was changed in the Netlify dashboard, but the live site still calls the old URL. What is needed?', [
        ['A new build and deploy, since the value is fixed at build time', true],
        ["Clearing the browser cache on the developer's own machine", false],
        ['A restart of Netlify DNS so the new value propagates', false],
      ], 'Vite writes the value into the JavaScript during npm run build. The live files still contain the old string until the site is rebuilt with the new variable.'),
      mcq('Which file makes Netlify serve a Vite React app for every client route?', [
        ['public/_redirects containing /* /index.html 200', true],
        ['src/routes.json listing every path in the app', false],
        ['dist/404.jsx that renders the React Router tree', false],
        ['netlify.env with a SPA=true flag set inside it', false],
      ], 'A _redirects file in public is copied into dist; the rule rewrites every path to index.html with status 200, so React Router can handle deep links.'),
    ],
    checkpoint: [
      cq('REACT_COMPONENTS', 'In a Vite app, which expression reads the API URL from the environment?', [
        ['import.meta.env.VITE_API_URL', true],
        ['process.env.REACT_APP_API_URL', false],
        ['import.meta.env.API_URL', false],
        ['window.env.VITE_API_URL', false],
      ], 'Vite exposes variables on import.meta.env and only those prefixed VITE_. process.env and REACT_APP_ belong to Node and Create React App.'),
      cq('REACT_COMPONENTS', 'The deployed site at https://tasks.netlify.app calls http://api.example.com and the browser blocks it. What is the problem and the fix?', [
        ['Mixed content; serve the API over HTTPS', true],
        ['CORS; switch the frontend to plain HTTP', false],
        ['A 404; add a rewrite rule for the API', false],
        ['Caching; purge the CDN for the API host', false],
      ], 'Browsers block HTTP requests from HTTPS pages as mixed content. The API needs HTTPS; downgrading the site is not a fix.'),
      cq('REACT_COMPONENTS', 'On Vercel, client routes such as /tasks/5 return 404 on refresh. What does the fix in vercel.json do?', [
        ['Rewrites every path to /index.html so React Router takes over', true],
        ['Redirects each path to the home page with a 301 status code', false],
        ['Prebuilds a separate static HTML file for each route at deploy time', false],
        ['Turns off caching so the router can read the live URL again', false],
      ], 'A rewrite serves index.html without changing the URL, so React loads and the router renders /tasks/5. A redirect would lose the path the user asked for.'),
    ],
  },
  {
    unitCode: 'JT_REACT_BUILD_REACT_PROJECT',
    notes: `**Brief: a task manager in React, built, deployed and explained.** This is the frontend that a Spring
Boot backend will serve later in the track, so build it against an API from day one: json-server
now, Spring Boot later, with only an environment variable changing.

## Requirements

1. **Project setup.** Vite + React, react-router-dom, @reduxjs/toolkit, react-redux, axios, bootstrap
   and react-bootstrap. A README and a .env.example listing VITE_API_URL.
2. **API.** json-server with a db.json containing tasks { id, title, description, status
   ('TODO' | 'IN_PROGRESS' | 'DONE'), priority, dueDate } (or a mock API of your choice). One api
   module with axios.create and baseURL from import.meta.env.VITE_API_URL.
3. **Routing.** A layout with a React-Bootstrap navbar and an Outlet; routes for the task list
   (/tasks), a task detail page (/tasks/:id), new and edit forms (/tasks/new, /tasks/:id/edit), and a
   NotFound page. A simple login page and a guarded branch for the task routes.
4. **Store.** A tasks slice with createAsyncThunk for fetch, create, update and delete, handling
   pending, fulfilled and rejected; an auth slice for the logged-in user. Local UI state stays local.
5. **Screens.** List with filter by status (kept in ?status=) and search; every request shows
   loading, error with Retry, empty and data; a not-found message for a missing task.
6. **Forms.** Controlled React-Bootstrap forms with validation (title required, due date not in the
   past); the form closes only when the save succeeded (unwrap), and shows the server's message if
   not.
7. **Styling.** Responsive Bootstrap grid: one column on phones, more on desktop.
8. **Deployment.** Deployed to Netlify or Vercel with the SPA rewrite and the production API URL set
   in the host. (A json-server on Render or a hosted mock API is fine for the live demo.)

## Acceptance criteria

- The live URL works, and refreshing /tasks/3 on it shows the task.
- Creating, editing, completing and deleting a task all persist to the API.
- Stopping the API shows error states with Retry, not blank screens or endless spinners.
- No URL is hardcoded in a component; changing VITE_API_URL is the only change needed to point it at
  another backend.
- Redux DevTools shows a pending, then fulfilled or rejected action for every request.
- You can explain, in five minutes, why each piece of state lives where it does.`,
    mcqs: [
      mcq('The task manager will later be served by Spring Boot. Why keep the API base URL in VITE_API_URL from day one?', [
        ['Switching from json-server to Spring Boot becomes a one-value change', true],
        ['Spring Boot reads VITE_API_URL to decide which port it should open', false],
        ['json-server accepts calls only when the URL comes from an env file', false],
      ], 'With every request going through one api module whose base URL comes from the environment, moving to a new backend means changing a variable, not editing components.'),
      mcq("Which item belongs in the project's README for a reviewer?", [
        ['How to install, set env variables, run the API and start the app', true],
        ['The full contents of node_modules for running it offline', false],
        ["A copy of every component's source code pasted in full", false],
      ], 'A reviewer needs to get the app running from a fresh clone. Setup steps and the required environment variables do that; pasted code and dependencies do not.'),
    ],
    assignment: {
      title: 'React Project — A Task Manager',
      description: 'A complete task manager frontend in React: routing with a guarded branch, a Redux Toolkit store loading data through createAsyncThunk, an axios api module against json-server or a mock API, React-Bootstrap styling, and a public deployment with the SPA rewrite. The frontend a Spring Boot backend will later serve.',
      instructions: `1. Create the project with npm create vite@latest and install react-router-dom, @reduxjs/toolkit, react-redux, axios, bootstrap and react-bootstrap.
2. Set up json-server (or a mock API) with a tasks collection, and an api module using axios.create with baseURL from import.meta.env.VITE_API_URL. Add .env.example.
3. Build the router: layout with a React-Bootstrap navbar and Outlet; list, detail, new, edit, login and NotFound routes; a RequireAuth guard around the task routes with redirect back after login.
4. Build the store: a tasks slice with thunks for fetch, create, update and delete (pending, fulfilled and rejected handled), and an auth slice.
5. Build the screens with loading, error with Retry, empty and not-found states; keep the status filter in the URL.
6. Build controlled, validated forms that close only on a successful save (unwrap) and show server errors.
7. Make the layout responsive with the Bootstrap grid.
8. Deploy to Netlify or Vercel with the SPA rewrite and the production VITE_API_URL; confirm a deep link survives refresh.
9. Submit the GitHub repository link, the live URL, and a README covering setup, environment variables, and a short note on where each piece of state lives and why.`,
      rubric: [
        { criterion: 'Routing and navigation', description: 'Layout with Outlet, list/detail/new/edit/NotFound routes, useParams for ids, guarded branch with redirect back after login, filter kept in the URL.', maxPoints: 20 },
        { criterion: 'State management', description: 'Tasks and auth slices; thunks for every API call with pending, fulfilled and rejected handled; local UI state kept local; no state mutated outside reducers.', maxPoints: 20 },
        { criterion: 'API integration and request states', description: 'One api module with baseURL from VITE_API_URL; loading, error with Retry, empty and not-found states on every screen; forms close only on success.', maxPoints: 20 },
        { criterion: 'Components and Bootstrap styling', description: 'Small, well-named components; controlled React-Bootstrap forms with validation; responsive grid that works from phone to desktop.', maxPoints: 15 },
        { criterion: 'Deployment', description: 'Live on Netlify or Vercel; refreshing a deep link works; production API URL set in the host; no secrets in VITE_ variables.', maxPoints: 15 },
        { criterion: 'README and explanation', description: 'Setup and env steps a reviewer can follow from a fresh clone; a clear account of where each piece of state lives and why.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },
  {
    unitCode: 'JT_REACT_BUILD_CHECKPOINT',
    notes: `**Ten questions on React as a whole: components and props, the hooks that hold state and run
effects, and routing between pages.** This is the standard a full-stack interview expects of the
frontend half. Each question is a situation from a real React app; choose what you would do.`,
    checkpoint: [
      cq('REACT_COMPONENTS', 'A TaskItem component receives task and onToggle as props. Which statement about those props is true?', [
        ['The child reads them but must not change them; the parent owns them', true],
        ['The child may assign new values to them to update its own display', false],
        ['They are copied into the child\'s state automatically on each render', false],
        ['They can only be strings, so objects must be JSON-encoded first', false],
      ], 'Props flow down and are read-only in the child. To change the data, the child calls a function the parent passed (onToggle), and the parent updates its state.'),
      cq('REACT_COMPONENTS', 'Rendering tasks.map(t => <TaskItem task={t} />) produces a warning in the console. What is the proper fix?', [
        ['key={t.id} on each TaskItem', true],
        ['key={Math.random()} on each item', false],
        ['An id prop in place of a key prop', false],
        ['Wrapping the list in a Fragment', false],
      ], 'React needs a stable key per list item to match items between renders. A random key changes every render and remounts every item; an id prop is not used for matching.'),
      cq('REACT_HOOKS', 'const [count, setCount] = useState(0); a button calls setCount(count + 1) twice in one click. What is count after the click?', [
        ['1, because both calls read the same count from that render', true],
        ['2, because each call adds one to the latest stored value', false],
        ['0, because state setters in a handler are ignored', false],
        ['It throws, since a setter may run once per render only', false],
      ], 'count is a constant for the render the handler came from, so both calls set 0 + 1. To add twice, use the updater form setCount(c => c + 1).'),
      cq('REACT_HOOKS', 'A useEffect with no dependency array calls setData(...) every time it runs. What happens?', [
        ['An endless loop: each update re-renders and runs the effect again', true],
        ['It runs once on mount, the same as with an empty dependency array', false],
        ['It never runs, since effects need a dependency array to start', false],
      ], 'Without a dependency array the effect runs after every render. Setting state causes a render, which runs the effect, which sets state again.'),
      cq('REACT_HOOKS', 'Which hook keeps a value between renders without causing a re-render when it changes?', [
        ['useRef', true],
        ['useState', false],
        ['useMemo', false],
        ['useEffect', false],
      ], 'A ref is a mutable box whose .current survives renders, and writing to it does not schedule a render. useState triggers a render on every change.'),
      cq('REACT_ROUTING', 'A product page must read the id from the route products/:id. Which hook gives it?', [
        ['useParams', true],
        ['useLocation', false],
        ['useSearchParams', false],
        ['useNavigate', false],
      ], 'useParams returns the named path segments, here { id }. useSearchParams reads the query string and useLocation gives the whole location.'),
      cq('REACT_ROUTING', 'Which description of a nested layout route in React Router v6 is accurate?', [
        ['The parent renders shared UI and an <Outlet /> for the matched child', true],
        ["Each child route must repeat the parent's navbar inside itself", false],
        ['Child routes replace the parent entirely, so layouts are not shared', false],
      ], 'The parent stays mounted and draws what pages share; the matched child renders at the Outlet. That is how one navbar serves every page.'),
      cq('REACT_COMPONENTS', 'A component should render <Spinner /> while loading and <TaskList /> otherwise. Which JSX expresses that?', [
        ['{loading ? <Spinner /> : <TaskList tasks={tasks} />}', true],
        ['{if (loading) <Spinner /> else <TaskList tasks={tasks} />}', false],
        ['<Spinner if={loading} /><TaskList else tasks={tasks} />', false],
        ['{loading => <Spinner /> || <TaskList tasks={tasks} />}', false],
      ], 'JSX braces take an expression, and the conditional operator is an expression. An if statement cannot appear there, and if/else props do not exist.'),
      cq('REACT_HOOKS', 'A controlled input shows its initial value, but typing changes nothing. The code is <input value={title} />. What is missing?', [
        ['An onChange handler that calls setTitle with the new value', true],
        ['A defaultValue prop alongside value, set to the same title', false],
        ['A ref on the input so React can read what was typed', false],
        ['A key prop so React re-creates the input on each keypress', false],
      ], 'A controlled input always shows its value prop. Without onChange updating the state behind it, every keystroke is immediately overwritten by the unchanged title.'),
      cq('REACT_ROUTING', 'The app works in development, but after deploying to a static host, typing /tasks/7 into the address bar gives a 404. Which part is at fault?', [
        ['The host setup: client routes need a rewrite to index.html', true],
        ['The route definition, which must list every task id in it', false],
        ['useParams, which cannot read ids typed into the address bar', false],
        ['The Link component, which only works on the dev server', false],
      ], 'The host receives a request for /tasks/7 before React runs and has no such file. Rewriting every path to index.html lets the router handle it, as Vite does in development.'),
    ],
  },
];
