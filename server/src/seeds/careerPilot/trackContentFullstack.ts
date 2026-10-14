/**
 * Career-track content: Full-Stack Integration and Deployment (JT_FULLSTACK), for Java Full Stack + AI.
 *
 * This topic joins the two halves the student has already built: the React app (Vite, React Router,
 * axios, Redux Toolkit — trackContentReactApps.ts) and the Spring Boot 3 API (Spring Data JPA on
 * MySQL, Spring Security 6 with JWT — the JT_BOOT_* topics). It covers the seams between them: the
 * api client and the Vite proxy, CORS with Spring Security, the login flow end to end, uploads, one
 * error contract, Docker images for both halves with docker compose, and a real deployment.
 *
 * The framework-neutral versions of CORS, Docker and deployment questions live in Years 1–4; every
 * question here is anchored in a specific React + Spring Boot file, header or command.
 *
 * Attribution: the topic is multi-skill [REST_APIS, AUTHENTICATION, CONTAINERS_DOCKER, DEPLOYMENT]
 * with REST_APIS as the default. JWT_LOGIN_FLOW, DOCKER and DEPLOY declare their own single skill,
 * so their questions name none; the checkpoint unit names the skill each question measures.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_FULLSTACK_BUNDLES: PilotBundle[] = [
  /* ── REACT_CALLS_BOOT ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_REACT_CALLS_BOOT',
    notes: `**Two programs, two ports, one application.** In development the React app runs on the Vite
dev server (http://localhost:5173) and the Spring Boot API on Tomcat (http://localhost:8080). The
browser loads the React bundle from one and calls the other. Everything in this topic is about
making that conversation reliable — first in development, then in containers, then on the internet.

## The Spring side: a predictable /api prefix

Put every REST controller under one prefix. It keeps API paths apart from the React routes and makes
proxying, security rules and nginx configuration one line each.

    @RestController
    @RequestMapping("/api/products")
    public class ProductController {
        private final ProductService service;
        public ProductController(ProductService service) { this.service = service; }

        @GetMapping
        public PageResponse<ProductDto> list(@RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size) {
            return service.list(page, size);
        }

        @GetMapping("/{id}")
        public ProductDto get(@PathVariable Long id) { return service.get(id); }

        @PostMapping
        public ResponseEntity<ProductDto> create(@Valid @RequestBody CreateProductRequest body) {
            ProductDto saved = service.create(body);
            return ResponseEntity.created(URI.create("/api/products/" + saved.id())).body(saved);
        }
    }

Return **DTOs**, not JPA entities: an entity with lazy relations either fails to serialise or drags
half the database into the JSON. Return your own page record (content, page, size, totalElements)
rather than Spring Data's Page object, whose JSON shape is an implementation detail — recent
Spring Data versions log a warning when PageImpl is serialised directly.

## The React side: one client

    // src/api/client.js
    import axios from 'axios';

    export const client = axios.create({
      baseURL: import.meta.env.VITE_API_URL,   // '/api' or 'http://localhost:8080/api'
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });

    // src/api/products.js
    import { client } from './client';
    export const productsApi = {
      list:   (page = 0) => client.get('/products', { params: { page, size: 20 } }).then(r => r.data),
      get:    id   => client.get('/products/' + id).then(r => r.data),
      create: body => client.post('/products', body).then(r => r.data),
    };

Components and thunks call productsApi; they never contain a host name. The next units add the
interceptors (token, 401) to this same client.

## Where VITE_API_URL comes from

Vite reads .env files and exposes only variables prefixed VITE_ on import.meta.env:

    # .env.development
    VITE_API_URL=/api

    # .env.production
    VITE_API_URL=https://api.example.com/api

**These values are replaced into the JavaScript at build time.** npm run build writes the literal
string into the bundle; changing an environment variable on the server afterwards changes nothing.
A different backend means a different build. Never put a secret in a VITE_ variable: anyone can read
it in the bundle.

## Option 1 in development: the Vite proxy

    // vite.config.js
    export default defineConfig({
      plugins: [react()],
      server: {
        proxy: {
          '/api': { target: 'http://localhost:8080', changeOrigin: true },
        },
      },
    });

With VITE_API_URL=/api the browser requests http://localhost:5173/api/products — the **same origin**
as the page — and the Vite dev server forwards it to port 8080. No CORS is involved, because the
browser never talks to another origin. The proxy exists only in npm run dev; the production build is
plain static files with no proxy in it.

## Option 2 in development: call 8080 directly

With VITE_API_URL=http://localhost:8080/api the browser calls the API across origins, and Spring must
send CORS headers (next unit). Both options are fine; what matters is knowing which one you are using,
because it decides whether a CORS error is even possible.

## Common mistakes

- **@RequestBody forgotten** on a POST handler: Spring binds nothing from the JSON and every field
  of the request object arrives null.
- **API_URL without the VITE_ prefix**: import.meta.env.API_URL is undefined, and axios quietly
  calls relative paths on the dev server.
- **baseURL ending in /api and calls starting with /api**: the request goes to /api/api/products.
- **Expecting the proxy in production**: it is a dev-server feature only.`,
    mcqs: [
      mcq("vite.config.js proxies '/api' to http://localhost:8080 and the client's baseURL is '/api'. Which URL does the browser itself request for client.get('/products')?", [
        ['http://localhost:8080/api/products, straight to Spring Boot', false],
        ['http://localhost:5173/api/products, forwarded on by Vite', true],
        ['http://localhost:8080/products, with /api removed by Vite', false],
        ['http://localhost:5173/products, then redirected to 8080', false],
      ], 'The browser only ever talks to the dev server, so the request is same-origin. Vite forwards it to 8080 behind the scenes, which is why no CORS headers are needed while the proxy is in use.'),
      mcq('A Spring handler returns ResponseEntity.created(location).body(saved) and React awaits client.post(\'/products\', form). Where is the new product\'s id?', [
        ['In res.headers.id, copied from the Location header', false],
        ['In res.status, which holds the created id after a 201', false],
        ['In res.data.id, the JSON body that Spring serialised', true],
      ], 'axios puts the parsed JSON body on data, and the handler put the saved DTO in the body. The status is just 201 and the Location header holds a URL, not an id property.'),
      mcq('After npm run build, a developer changes VITE_API_URL in the server\'s environment and restarts nginx. The app still calls the old API. Why?', [
        ['nginx caches environment variables until the machine reboots', false],
        ['VITE_ variables are only read by the Vite dev server, never in builds', false],
        ['The value was written into the bundle when it was built', true],
        ['axios keeps the first baseURL it sees in localStorage', false],
      ], 'Vite replaces import.meta.env.VITE_* with literal strings at build time. The static files do not read the environment at runtime, so pointing at a new API needs a new build.'),
    ],
    checkpoint: [
      mcq("The client has baseURL 'http://localhost:8080/api' and the controller is @RequestMapping(\"/api/products\") with @GetMapping(\"/{id}\"). Which call fetches product 7?", [
        ["client.get('/api/products/7')", false],
        ["client.get('/products/7')", true],
        ["client.get('/products', { params: { id: 7 } })", false],
        ["client.get('products?id=7')", false],
      ], 'axios joins the baseURL and the path, so /products/7 becomes /api/products/7. Adding /api again doubles it, and the id is a path variable, not a query parameter.'),
      mcq('A form posts JSON to @PostMapping public ProductDto create(CreateProductRequest body). The request arrives but every field of body is null. What is missing?', [
        ['@RequestBody on the parameter, so Spring reads the JSON', true],
        ['A Content-Type of text/plain on the axios request', false],
        ['@ResponseBody on the method, so it can read input', false],
        ['A no-argument constructor on the ProductController class itself', false],
      ], 'Without @RequestBody Spring binds the parameter from query and form parameters, finds none, and leaves the fields null. @RequestBody tells it to deserialise the JSON body with Jackson.'),
      mcq('.env contains API_URL=http://localhost:8080/api and the client uses import.meta.env.API_URL. What happens?', [
        ['It works, since Vite exposes every variable in .env', false],
        ['The build fails with an error naming the missing variable', false],
        ['The value is undefined, as only VITE_ names are exposed', true],
      ], 'Vite deliberately exposes only VITE_-prefixed variables to client code, so nothing private leaks by accident. The unprefixed name is undefined and axios falls back to relative URLs.'),
    ],
  },

  /* ── CORS ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_CORS',
    notes: `**An origin is scheme + host + port.** http://localhost:5173 and http://localhost:8080 are
different origins; so are https://shop.example.com and https://api.shop.example.com. When a page from
one origin calls another, the browser makes the request but **will not hand the response to your
JavaScript** unless the server's response says that origin is allowed. That is CORS — the browser
enforcing a policy the server declares. Postman, curl and server-to-server calls ignore it entirely.

## The preflight

A "simple" GET goes out directly. Anything else — PUT, DELETE, a JSON Content-Type, an Authorization
header — makes the browser first send an **OPTIONS preflight**:

    OPTIONS /api/products/7
    Origin: http://localhost:5173
    Access-Control-Request-Method: PUT
    Access-Control-Request-Headers: authorization, content-type

The server must answer 2xx with:

    Access-Control-Allow-Origin: http://localhost:5173
    Access-Control-Allow-Methods: GET, POST, PUT, DELETE
    Access-Control-Allow-Headers: authorization, content-type

Only then is the real PUT sent. Since nearly every call from a logged-in React app carries an
Authorization header, nearly every call is preflighted.

## CORS in Spring Boot with Spring Security 6

@CrossOrigin on a controller or a WebMvcConfigurer works in an app without Security. **With Spring
Security, the security filter chain runs before any controller.** The preflight carries no token, so
unless Security handles CORS itself, the OPTIONS request is rejected (often a 401 or 403) and the
browser reports a CORS failure. Configure CORS in Security:

    @Configuration
    public class SecurityConfig {

        @Bean
        SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwtFilter) throws Exception {
            return http
                .cors(Customizer.withDefaults())              // uses the bean below
                .csrf(csrf -> csrf.disable())                 // stateless JWT in a header
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/api/auth/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                    .anyRequest().authenticated())
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
        }

        @Bean
        CorsConfigurationSource corsConfigurationSource(
                @Value("\${app.cors.allowed-origins}") List<String> origins) {
            CorsConfiguration config = new CorsConfiguration();
            config.setAllowedOrigins(origins);
            config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
            config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
            config.setMaxAge(3600L);                          // cache the preflight for an hour
            UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
            source.registerCorsConfiguration("/api/**", config);
            return source;
        }
    }

    # application.properties
    app.cors.allowed-origins=http://localhost:5173

    # in production, from the environment:
    APP_CORS_ALLOWED_ORIGINS=https://shop.example.com

With .cors() enabled, Spring Security's CorsFilter answers the preflight before authentication runs.

## Credentials

If the browser must send cookies (an httpOnly refresh cookie, say), axios needs withCredentials: true
and Spring needs config.setAllowCredentials(true). Then **"*" is forbidden as an origin**: Spring
throws an IllegalArgumentException at request time telling you to list origins or use
setAllowedOriginPatterns. Listing the real origins is the right answer anyway.

## Avoiding CORS entirely

If the browser sees one origin, there is no CORS: the Vite proxy in development, and in production an
nginx (or host rewrite) that serves the React files and forwards /api to the API. Same-origin
deployment is simpler and is what the Docker unit builds.

## Common mistakes

- Trying to fix CORS in React. No header the page sends can grant itself permission.
- @CrossOrigin on controllers while Security rejects the preflight before they run.
- allowedOrigins("*") "to make it work", then adding credentials and getting an exception.
- Allowing only http://localhost:5173 and forgetting the production origin — the app works for
  the developer and fails for every user.`,
    mcqs: [
      mcq('SecurityConfig calls http.cors(Customizer.withDefaults()). Where does Spring Security get the allowed origins from?', [
        ['A CorsConfigurationSource bean defined in the context', true],
        ['The Origin header that the browser sent with the request', false],
        ['The server.address property in application.properties', false],
        ['Every @RestController, which allows its own origin by default', false],
      ], 'With the defaults, Security looks up a CorsConfigurationSource bean (named corsConfigurationSource) and applies it in its CorsFilter. Echoing whatever Origin arrives would allow every site.'),
      mcq('A CorsConfiguration has allowedOrigins set to "*" and allowCredentials set to true. What happens when the React app calls the API?', [
        ['The browser accepts it, since "*" covers every origin', false],
        ['Spring Boot fails to start with a bean creation error', false],
        ['Spring rejects the combination and the request fails', true],
      ], 'A credentialed response may not use the wildcard origin, so Spring throws an IllegalArgumentException when it processes the request. List the real origins, or use allowedOriginPatterns.'),
      mcq("React sends client.put('/api/products/7', body) with an Authorization header to another origin. What does the browser send first?", [
        ['A GET to the same URL to check that the product exists', false],
        ['An OPTIONS preflight asking if PUT and that header are allowed', true],
        ['The PUT itself, with the Origin header added by the browser automatically', false],
        ['A HEAD request to /api to find the server\'s CORS policy', false],
      ], 'PUT and a custom Authorization header both make the request non-simple, so the browser asks permission with OPTIONS first and sends the PUT only if the preflight response allows it.'),
    ],
    checkpoint: [
      mcq('app.cors.allowed-origins is http://localhost:5173. The app is deployed at https://shop.example.com and every call fails with a CORS error. What is the fix?', [
        ['Set withCredentials to true on the production axios client', false],
        ['Add the production origin to the property via the environment', true],
        ['Replace @RestController with @Controller on the API classes', false],
        ['Set the React build to use http instead of https in production', false],
      ], 'The server only allows the dev origin, so the browser blocks the production page. Supplying https://shop.example.com through APP_CORS_ALLOWED_ORIGINS fixes it without a code change.'),
      mcq('Controllers carry @CrossOrigin("http://localhost:5173"), yet the OPTIONS request for a DELETE returns 403 and the browser shows a CORS error. What is the cause?', [
        ['@CrossOrigin works for GET only; DELETE needs a different annotation', false],
        ['The browser sent the DELETE before the preflight finished', false],
        ['The JWT filter must accept OPTIONS requests that have no body', false],
        ['Spring Security rejected the preflight before the controller ran', true],
      ], 'The filter chain sees an unauthenticated OPTIONS request and denies it, so the annotation is never consulted. Enabling http.cors() lets Security answer the preflight before authentication.'),
      mcq('In development the app used the Vite proxy and had no CORS configuration. On Netlify it calls the Render API directly and fails. Why did development never show the error?', [
        ['Netlify adds a response header that blocks other origins by default', false],
        ['Vite turns CORS checks off in the browser while it runs', false],
        ['Through the proxy the browser only ever spoke to one origin', true],
      ], 'The proxy made every call same-origin, so the browser had nothing to check. In production the page and the API are on different origins, and Spring must now allow the frontend origin.'),
    ],
  },

  /* ── JWT_LOGIN_FLOW ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_JWT_LOGIN_FLOW',
    notes: `**The login flow has six steps, and each half owns some of them.** Spring Boot verifies the
password, issues the token and checks it on every request. React collects the credentials, keeps the
token, sends it, guards screens and reacts when it stops working.

## 1. The login endpoint

    @RestController
    @RequestMapping("/api/auth")
    public class AuthController {
        private final AuthenticationManager authManager;
        private final JwtService jwt;

        @PostMapping("/login")
        public LoginResponse login(@Valid @RequestBody LoginRequest req) {
            Authentication auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.email(), req.password()));
            UserDetails user = (UserDetails) auth.getPrincipal();
            return new LoginResponse(jwt.issue(user), jwt.expiresAt(), roles(user));
        }
    }

A wrong password makes authenticate throw BadCredentialsException, which should become a 401 with a
plain message — never "user not found" versus "wrong password", which tells an attacker which emails
exist. /api/auth/** is permitAll in the security config.

## 2. Keeping the token — the honest trade-off

| Where | Survives refresh | Readable by an XSS script | CSRF exposure |
|---|---|---|---|
| Memory (a variable, React state, Redux) | No | Not stored, but XSS can still call the API while the page is open | None |
| localStorage | Yes | **Yes — it can be read and sent anywhere** | None |
| httpOnly cookie | Yes | No, script cannot read it | **Yes — the browser sends it automatically** |

There is no free option. localStorage is common in tutorials and acceptable for a learning project
with short-lived tokens, but any XSS bug lets an attacker take the token away and use it until it
expires. An httpOnly, Secure, SameSite=Lax (or Strict) cookie keeps the token out of reach of script
but brings back CSRF: then keep Spring's CSRF protection on (or rely on SameSite plus a CSRF token)
and send credentials with withCredentials: true and allowCredentials in CORS. A common production
pattern combines them: a **short access token in memory** and a **refresh token in an httpOnly cookie**
that a /api/auth/refresh call exchanges for a new access token on page load.

## 3. Sending it on every call

    // src/api/client.js — on the SAME instance the api modules use
    client.interceptors.request.use(config => {
      const token = store.getState().auth.token;
      if (token) config.headers.Authorization = 'Bearer ' + token;
      return config;
    });

On the Spring side, a OncePerRequestFilter reads the header, validates signature and exp, loads the
user and puts an Authentication into the SecurityContext.

## 4. Guarding screens

    function RequireAuth({ role }) {
      const { token, roles } = useSelector(s => s.auth);
      const location = useLocation();
      if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
      if (role && !roles.includes(role)) return <Navigate to="/forbidden" replace />;
      return <Outlet />;
    }

This is **user experience, not security**. The API enforces roles:

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable Long id) { service.delete(id); }

## 5. When it stops working: 401 versus 403

- **401 Unauthorized** — no valid token: missing, expired or forged. Log the user out and send them
  to the login page.
- **403 Forbidden** — the token is fine but the role is not enough. Show "you do not have access";
  logging the user out would be wrong.

    client.interceptors.response.use(r => r, err => {
      const status = err.response?.status;
      const isLogin = err.config?.url?.includes('/auth/login');
      if (status === 401 && !isLogin) store.dispatch(sessionExpired());
      return Promise.reject(err);
    });

The login call is excluded: a wrong password is also a 401, and the form must show it.

## 6. Logout and expiry

A JWT is valid until its exp, whatever the client does. Logout clears the client's copy; to really end
sessions early the server needs short expiries (15–30 minutes is typical with a refresh token) or a
denylist. The client can decode exp (with jwt-decode — decoding is not verifying) to log out on time
instead of waiting for a 401.

## Common mistakes

- Logging out on 403. The user is logged in; they lack a role.
- A response interceptor that also catches the login form's 401 and redirects away from the error.
- Treating a hidden button as access control.
- Keeping the token only in React state and being surprised that refresh logs the user out.
- A JWT secret in application.properties in a public repository.`,
    workedExample: `**Goal: log in, survive a refresh, and log out cleanly when the token expires.**

**The slice.** The token lives in Redux and is mirrored to localStorage for this project (a learning
app with 30-minute tokens; the trade-off is written in the README).

    const saved = JSON.parse(localStorage.getItem('auth') || 'null');

    const authSlice = createSlice({
      name: 'auth',
      initialState: saved || { token: null, roles: [], email: null },
      reducers: {
        loggedIn: (s, a) => { Object.assign(s, a.payload); },
        sessionExpired: () => ({ token: null, roles: [], email: null }),
      },
    });

    store.subscribe(() => {
      const { auth } = store.getState();
      if (auth.token) localStorage.setItem('auth', JSON.stringify(auth));
      else localStorage.removeItem('auth');
    });

Reading localStorage once at start-up is what makes the refresh survive; subscribing keeps it in step.

**The form.**

    async function onSubmit(e) {
      e.preventDefault();
      setError(null);
      try {
        const { data } = await client.post('/auth/login', { email, password });
        dispatch(loggedIn({ token: data.token, roles: data.roles, email }));
        navigate(location.state?.from?.pathname || '/', { replace: true });
      } catch (err) {
        setError(err.response?.status === 401 ? 'Email or password is incorrect'
                                              : 'Could not reach the server, try again');
      }
    }

replace stops Back from returning to the login form; from sends the user to the page they wanted.

**Trace a request.** The user opens /orders. RequireAuth sees a token and renders the page. The page
calls ordersApi.list(); the request interceptor adds Authorization: Bearer eyJ...; Spring's
JwtAuthFilter validates it and the controller returns 200.

**Trace expiry.** Thirty minutes later the same call returns 401. The response interceptor sees 401 on
a URL that is not /auth/login and dispatches sessionExpired; the subscriber removes localStorage; the
token in the store is now null, so RequireAuth renders a Navigate to /login with state.from. After
logging in again the user lands back on /orders.

**Trace a role.** A USER opens the admin page by typing the URL. RequireAuth with role="ADMIN" sends
them to /forbidden. Had they called DELETE /api/products/7 with curl instead, @PreAuthorize would
have returned 403 — the server check is the one that protects data.`,
    mcqs: [
      mcq('A JWT is kept in localStorage and an attacker manages to run a script on the page through an XSS bug. What can the attacker do?', [
        ['Nothing, because localStorage is encrypted by the browser', false],
        ['Use it only from this tab, since tokens are tied to the tab', false],
        ['Read the token and replay it from any machine until it expires', true],
        ['Read it, but Spring rejects any token sent from a new IP address', false],
      ], 'localStorage is readable by any script on the origin, so injected script can send the token elsewhere. A bearer token is not bound to a tab or IP, so it works until its exp.'),
      mcq('A team moves the JWT from localStorage into an httpOnly cookie. Which risk do they now have to handle that they did not before?', [
        ['Cross-site request forgery, as the cookie is sent automatically', true],
        ['Script reading the token, since cookies are visible to JavaScript', false],
        ['Losing the token on refresh, as cookies last for one page view', false],
      ], 'httpOnly hides the cookie from script, which closes the XSS theft route, but the browser attaches it to requests that other sites trigger. SameSite and CSRF tokens address that.'),
      mcq('A logged-in USER clicks a link to /admin/reports and the API returns 403. What should the axios response interceptor do?', [
        ['Clear the token and redirect to /login so that they can sign in again', false],
        ['Leave the session alone and let the page show a no-access message', true],
        ['Retry the request with the token\'s role changed to ADMIN', false],
        ['Refresh the token, since 403 means it has nearly expired', false],
      ], '403 means the token is valid but the role is insufficient. Logging out would not help — they would log in as the same user — so the page should explain they lack access.'),
    ],
    checkpoint: [
      mcq('After login the token is stored with useState in App and passed down. Every page refresh sends the user back to the login page. Why?', [
        ['Spring invalidates the token when the page reloads', false],
        ['The interceptor removes the header after the first call', false],
        ['React state lives in memory and is gone after a reload', true],
        ['Refreshing sends a logout request to /api/auth/logout', false],
      ], 'A reload starts the JavaScript from scratch, so in-memory state is empty. The token must be restored from somewhere persistent, or re-obtained through a refresh-token call.'),
      mcq('The response interceptor dispatches sessionExpired and navigates to /login on every 401. Users who mistype their password see the page flicker and no error message. What is the fix?', [
        ['Have the login endpoint return 200 with an error flag instead', false],
        ['Skip the 401 handling when the failing request is the login call', true],
        ['Remove the interceptor and check status codes in each page', false],
      ], 'A wrong password is a legitimate 401 that the form must show. Excluding /auth/login from the global handler keeps the error with the form while expired sessions still log out.'),
      mcq('The React app hides the Delete button unless roles includes ADMIN. A USER deletes a product by sending DELETE /api/products/7 with curl and their token. What was missing?', [
        ['A RequireAuth guard on the products route in React', false],
        ['A shorter expiry on the token that the user received', false],
        ['CORS rules that block requests made outside a browser', false],
        ['A role check on the endpoint, such as @PreAuthorize', true],
      ], 'Hiding the button only changes the screen. The API accepted a valid token with no role check, so the fix belongs on the server: hasRole(\'ADMIN\') on the endpoint or in the security rules.'),
    ],
  },

  /* ── FILE_UPLOAD ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_FILE_UPLOAD',
    notes: `**A file upload is a multipart/form-data request: several named parts in one body, separated
by a boundary string.** One part is the file's bytes; others can be ordinary fields.

## The React form

    function UploadInvoice({ orderId }) {
      const [file, setFile] = useState(null);
      const [progress, setProgress] = useState(0);
      const [error, setError] = useState(null);

      async function onSubmit(e) {
        e.preventDefault();
        if (!file) return setError('Choose a file');
        if (file.size > 5 * 1024 * 1024) return setError('Max 5 MB');   // fast feedback only
        const form = new FormData();
        form.append('file', file);               // part name must match the server
        form.append('description', 'Invoice');
        try {
          await client.post('/orders/' + orderId + '/documents', form, {
            onUploadProgress: e => setProgress(Math.round((e.loaded * 100) / (e.total || 1))),
          });
        } catch (err) {
          setError(err.response?.data?.detail || 'Upload failed');
        }
      }

      return (
        <form onSubmit={onSubmit}>
          <input type="file" accept="application/pdf,image/png,image/jpeg"
                 onChange={e => setFile(e.target.files[0])} />
          <progress value={progress} max="100" />
          <button>Upload</button>
        </form>
      );
    }

**Do not write the Content-Type header yourself.** The browser must generate it, because it includes
the boundary (multipart/form-data; boundary=----WebKit...). With fetch, a hand-written
'multipart/form-data' has no boundary and the server cannot parse the body; axios sees a FormData and
leaves the header to the browser. The client used here sets a JSON default, which axios also replaces
for FormData. The size check and accept attribute are conveniences; the server validates again.

## The Spring side

    @PostMapping(value = "/api/orders/{orderId}/documents",
                 consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public DocumentDto upload(@PathVariable Long orderId,
                              @RequestParam("file") MultipartFile file,
                              @RequestParam(required = false) String description) throws IOException {
        if (file.isEmpty()) throw new BadRequestException("File is empty");
        if (!ALLOWED.contains(file.getContentType())) throw new BadRequestException("PDF, PNG or JPEG only");
        return documents.store(orderId, file, description);
    }

getContentType() is whatever the client claimed; for anything important check the first bytes (a PDF
starts with %PDF) or use a library such as Apache Tika.

## Size limits — two of them, and possibly a third

    # application.properties
    spring.servlet.multipart.max-file-size=5MB       # default 1MB per file
    spring.servlet.multipart.max-request-size=10MB   # default 10MB per request

Exceed them and Spring throws MaxUploadSizeExceededException; map it in your @RestControllerAdvice to
**413 Payload Too Large** with a readable message. If nginx sits in front, it has its own limit
(client_max_body_size, default 1m) and returns 413 before Spring ever sees the request.

## Where the file goes

    public DocumentDto store(Long orderId, MultipartFile file, String description) throws IOException {
        String key = UUID.randomUUID() + extensionOf(file.getContentType());
        Path target = uploadRoot.resolve(key).normalize();
        Files.copy(file.getInputStream(), target);
        Document doc = repo.save(new Document(orderId, key, file.getOriginalFilename(),
                                              file.getSize(), file.getContentType()));
        return DocumentDto.from(doc);
    }

- **Never use the client's filename as the path.** ../../etc/passwd or two users uploading
  invoice.pdf. Generate a key; keep the original name only as data.
- **Not inside the jar or src/main/resources.** The jar is built once and is read-only at runtime,
  and anything written next to it vanishes on the next deploy.
- **Not in the container's own filesystem.** Containers are replaced on every deploy. Use a mounted
  volume (app.upload-dir=/app/uploads with a Docker volume) or, better on a cloud host, **object
  storage** (S3 or an S3-compatible service): the API streams the bytes there and MySQL stores the key.
- **Store metadata in MySQL, bytes elsewhere.** A BLOB column works but bloats backups and every
  query that touches the table.

Serving a file back: a GET that checks the user may see it and streams it with a Content-Type and
Content-Disposition, or a short-lived pre-signed URL from object storage.

## Common mistakes

- The form appends 'image' but the controller asks for "file": 400, required part missing.
- Hand-setting the multipart Content-Type in fetch.
- Testing with a 200 KB file, then meeting the 1 MB default in production.
- Writing uploads to a relative path that resolves to a different directory in the container.`,
    mcqs: [
      mcq('With no multipart settings in application.properties, a user uploads a 3 MB PDF to a MultipartFile endpoint. What happens?', [
        ['It succeeds, because Spring Boot has no default size limit', false],
        ['Spring rejects it with MaxUploadSizeExceededException', true],
        ['Tomcat truncates the file to 1 MB and the handler gets that part', false],
      ], 'spring.servlet.multipart.max-file-size defaults to 1MB, so the request fails before the handler runs. Raise the limit deliberately and map the exception to a 413 with a clear message.'),
      mcq("A fetch call sends a FormData body with headers: { 'Content-Type': 'multipart/form-data' }. Spring answers 400 or 500 complaining about the request. Why?", [
        ['FormData can only be sent with axios, never with fetch', false],
        ['Spring expects multipart uploads to arrive as PUT requests', false],
        ['The hand-written header has no boundary, so parts cannot be split', true],
        ['The header must be multipart/mixed for file uploads to be parsed by Spring', false],
      ], 'The boundary that separates the parts is part of the Content-Type the browser generates. Overriding it removes the boundary, so the server cannot parse the body. Leave the header unset.'),
      mcq('A developer saves uploads to src/main/resources/static/uploads so Spring Boot can serve them. Why does that fail once the app runs as a jar in a container?', [
        ['Static files may only be images, so PDFs are rejected', false],
        ['The jar is read-only and the container is replaced on deploy', true],
        ['Spring Boot serves static files only in the dev profile', false],
      ], 'src/main/resources is packed into the jar at build time; a running app cannot add to it, and any directory beside it lives in a container that is thrown away. Use a volume or object storage.'),
    ],
    checkpoint: [
      mcq("The controller declares @RequestParam(\"file\") MultipartFile file and the React form calls form.append('image', file). What does the upload return?", [
        ['400, because the required part named file is missing', true],
        ['201, because Spring matches the only file part present', false],
        ['413, because an unnamed part counts towards the limit', false],
        ['200 with file empty, because the name is only a hint', false],
      ], 'Spring binds multipart parts by name. With no part called file the required parameter is missing and the request fails with 400; the names on both sides must match.'),
      mcq('The service saves each upload to uploadRoot.resolve(file.getOriginalFilename()). What is the risk?', [
        ['Original filenames are always null in Spring Boot 3', false],
        ['Files.copy cannot write a name that contains spaces', false],
        ['A crafted or repeated name can escape the folder or overwrite', true],
      ], 'The original filename comes from the client. A name with ../ can point outside the folder, and two users uploading invoice.pdf collide. Generate your own key and keep the original name as data.'),
      mcq('An upload screen should show a progress bar while a 40 MB video is sent. What gives the React code that information?', [
        ['The status code of each chunk the browser sends to Spring', false],
        ['Polling a /progress endpoint that reads MultipartFile.getSize()', false],
        ['The useTransition hook, which tracks pending network work', false],
        ['The onUploadProgress callback in the axios request config', true],
      ], 'axios reports bytes sent through onUploadProgress (loaded and total). The server only receives the MultipartFile after the whole body has arrived, so it cannot report progress itself.'),
    ],
  },

  /* ── ERRORS_ACROSS ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_ERRORS_ACROSS',
    notes: `**An error has to cross three places to be useful: thrown in Spring, turned into JSON, and shown
in the right spot on the right screen.** Agree one shape for it, and both halves get simpler.

## One contract: Problem Details

Spring Boot 3 supports RFC 9457 Problem Details (ProblemDetail). Every error the API returns looks
like this:

    {
      "type": "about:blank",
      "title": "Bad Request",
      "status": 400,
      "detail": "Validation failed",
      "instance": "/api/products",
      "errors": { "name": "must not be blank", "price": "must be greater than 0" }
    }

errors is a custom property; it appears only for validation failures.

## The Spring side

    @RestControllerAdvice
    public class ApiExceptionHandler {

        @ExceptionHandler(MethodArgumentNotValidException.class)
        ProblemDetail validation(MethodArgumentNotValidException ex) {
            ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
            Map<String, String> errors = new LinkedHashMap<>();
            ex.getBindingResult().getFieldErrors()
              .forEach(fe -> errors.putIfAbsent(fe.getField(), fe.getDefaultMessage()));
            pd.setProperty("errors", errors);
            return pd;
        }

        @ExceptionHandler(EntityNotFoundException.class)
        ProblemDetail notFound(EntityNotFoundException ex) {
            return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        }

        @ExceptionHandler(DuplicateEmailException.class)
        ProblemDetail conflict(DuplicateEmailException ex) {
            ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Email already registered");
            pd.setProperty("errors", Map.of("email", "This email is already registered"));
            return pd;
        }

        @ExceptionHandler(Exception.class)
        ProblemDetail unexpected(Exception ex) {
            log.error("Unhandled error", ex);                  // the stack trace goes to the log
            return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR,
                "Something went wrong on our side");          // never to the client
        }
    }

A 401 or 403 raised inside the security filter chain never reaches this advice; it is shaped by the
AuthenticationEntryPoint and AccessDeniedHandler, which you can make return the same JSON.

## The React side: three kinds of failure

    export function toUiError(err) {
      if (!err.response) {
        // no HTTP response at all: server down, DNS, CORS block, timeout
        return { kind: 'network', message: 'Cannot reach the server. Check your connection and retry.' };
      }
      const { status, data } = err.response;
      if (status === 400 || status === 409 || status === 422)
        return { kind: 'fields', message: data?.detail, fields: data?.errors || {} };
      if (status === 404) return { kind: 'notFound', message: data?.detail || 'Not found' };
      return { kind: 'server', message: 'Something went wrong. Please try again.' };
    }

## Showing field errors in the form

    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState(null);

    async function onSubmit(values) {
      setFieldErrors({}); setFormError(null);
      try {
        await productsApi.create(values);
        navigate('/products');
      } catch (err) {
        const e = toUiError(err);
        if (e.kind === 'fields') setFieldErrors(e.fields);
        setFormError(e.message);
      }
    }

    <Form.Control name="price" isInvalid={!!fieldErrors.price} ... />
    <Form.Control.Feedback type="invalid">{fieldErrors.price}</Form.Control.Feedback>

With react-hook-form the same loop is Object.entries(fields).forEach(([f, m]) => setError(f, { message: m })).
Client-side validation still runs first for speed; the server's answer is the one that counts.

## The failure nobody handled

err.response is **undefined** when no HTTP response came back: the API is down, the laptop is offline,
the request timed out, or the browser blocked it for CORS. Code that does err.response.data.detail
then throws a TypeError inside the catch block and the user sees nothing. Check err.response first,
always, and give the network case a Retry.

## Common mistakes

- Showing err.message ("Request failed with status code 400") to users.
- Returning stack traces in the response body. Keep server.error.include-stacktrace at its default
  (never) and log instead.
- A different error JSON per controller, so every screen needs its own parsing.
- Losing the form's input on error. Keep the values; mark only the fields that failed.`,
    mcqs: [
      mcq('In a catch block, err.response is undefined for an axios call to the Spring API. Which situation fits?', [
        ['Spring returned 404 because the product id does not exist', false],
        ['Spring rejected the body with a 400 validation error', false],
        ['The request never got an HTTP response, for example the API is down', true],
        ['Spring returned a 500 status and hid the response body for security reasons', false],
      ], 'axios sets err.response whenever a status came back, including 4xx and 5xx. It is missing only when no response was received — server down, offline, timeout or a CORS block.'),
      mcq('A @Valid @RequestBody fails because name is blank. Which exception does the @RestControllerAdvice need to handle to turn it into field errors?', [
        ['MethodArgumentNotValidException', true],
        ['ConstraintViolationException from the JPA layer', false],
        ['HttpMessageNotReadableException', false],
        ['IllegalArgumentException', false],
      ], 'Bean Validation on a @RequestBody raises MethodArgumentNotValidException, whose BindingResult holds one FieldError per invalid field. HttpMessageNotReadableException is for unparseable JSON.'),
      mcq('An API returns Spring Boot 3 ProblemDetail bodies. Which fields does the standard shape provide before any custom property is added?', [
        ['code, message, timestamp, path and the errors map', false],
        ['type, title, status, detail and instance', true],
        ['error, path, trace and status', false],
      ], 'ProblemDetail follows RFC 9457: type, title, status, detail and instance. Anything else, such as an errors map for fields, is added with setProperty.'),
    ],
    checkpoint: [
      mcq('A registration form shows "Request failed with status code 409" when the email is taken. The API returns errors: { email: "This email is already registered" }. What should the form do?', [
        ['Show the axios message, which is accurate and needs no parsing', false],
        ['Retry the request, since 409 means the server was busy', false],
        ['Clear every field so the user can start again from scratch', false],
        ['Put the server message under the email field and keep the input', true],
      ], 'The API already said which field failed and why. Mapping errors.email onto that field tells the user exactly what to change; axios\'s generic message and clearing the form do not.'),
      mcq('The catch block does setError(err.response.data.detail). When the API is stopped, the page shows nothing and the console shows a TypeError. Why?', [
        ['err.response is undefined, so reading .data throws inside the catch', true],
        ['detail is only sent for 500 errors, so the property is missing', false],
        ['setError cannot be called inside a catch block in React', false],
      ], 'With no HTTP response there is no err.response, so err.response.data throws a second error in the handler itself. Check err.response first and show a network message with Retry.'),
      mcq('A 500 response body contains a full Java stack trace naming entity classes and SQL. What is the right fix?', [
        ['Strip the trace in React before the message is displayed', false],
        ['Log the exception and return a generic ProblemDetail instead', true],
        ['Change the status to 400 so browsers hide the response body', false],
        ['Gzip the response so the trace is not readable in transit', false],
      ], 'The trace reaches anyone calling the API, not just your UI, and it maps your internals. Log it on the server and return a generic message from the catch-all handler.'),
    ],
  },

  /* ── DOCKER ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_DOCKER',
    notes: `**Three containers: MySQL, the Spring Boot API and nginx serving the React build.** Each has
an image, docker compose starts them together on one private network, and the same images later run
in the cloud.

## The API image — multi-stage

    # backend/Dockerfile
    FROM maven:3.9-eclipse-temurin-21 AS build
    WORKDIR /app
    COPY pom.xml .
    RUN mvn -q -B dependency:go-offline        # cached until pom.xml changes
    COPY src ./src
    RUN mvn -q -B package -DskipTests

    FROM eclipse-temurin:21-jre
    WORKDIR /app
    RUN useradd -r app
    COPY --from=build /app/target/*.jar app.jar
    USER app
    EXPOSE 8080
    ENTRYPOINT ["java", "-jar", "/app/app.jar"]

The first stage has Maven, the JDK and your source; the second has only a JRE and one jar. The final
image is a fraction of the size and contains no build tools or source code. Copying pom.xml first
means the slow dependency download is a cached layer that reruns only when dependencies change.
(Tests run in CI before the image is built, hence -DskipTests here.)

## The frontend image — Node builds, nginx serves

    # frontend/Dockerfile
    FROM node:20-alpine AS build
    WORKDIR /app
    COPY package.json package-lock.json ./
    RUN npm ci
    COPY . .
    ARG VITE_API_URL=/api
    ENV VITE_API_URL=$VITE_API_URL
    RUN npm run build                             # writes dist/

    FROM nginx:1.27-alpine
    COPY nginx.conf /etc/nginx/conf.d/default.conf
    COPY --from=build /app/dist /usr/share/nginx/html

VITE_API_URL is a **build argument**, because Vite bakes it into the bundle (REACT_CALLS_BOOT). Node is
not in the final image at all.

    # frontend/nginx.conf
    server {
      listen 80;
      root /usr/share/nginx/html;
      client_max_body_size 10m;                    # uploads; nginx default is 1m

      location /api/ {
        proxy_pass http://api:8080;                # the compose service name
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
      }

      location / {
        try_files $uri $uri/ /index.html;          # SPA fallback for deep links
      }
    }

try_files serves real files (JS, CSS, images) and falls back to index.html for /orders/42, so React
Router handles it. Proxying /api through nginx makes the app **same-origin**: no CORS in this setup.

## .dockerignore

    # backend/.dockerignore        # frontend/.dockerignore
    target                         node_modules
    .git                           dist
    .env                           .env

Without it, COPY . . sends node_modules and secrets into the build context.

## docker compose

    # compose.yaml
    services:
      db:
        image: mysql:8.4
        environment:
          MYSQL_DATABASE: shop
          MYSQL_USER: shop
          MYSQL_PASSWORD: \${DB_PASSWORD}
          MYSQL_ROOT_PASSWORD: \${DB_ROOT_PASSWORD}
        volumes:
          - dbdata:/var/lib/mysql
        healthcheck:
          test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
          interval: 10s
          timeout: 5s
          retries: 10

      api:
        build: ./backend
        environment:
          SPRING_DATASOURCE_URL: jdbc:mysql://db:3306/shop
          SPRING_DATASOURCE_USERNAME: shop
          SPRING_DATASOURCE_PASSWORD: \${DB_PASSWORD}
          APP_JWT_SECRET: \${JWT_SECRET}
          APP_UPLOAD_DIR: /app/uploads
        volumes:
          - uploads:/app/uploads
        depends_on:
          db:
            condition: service_healthy

      web:
        build:
          context: ./frontend
          args:
            VITE_API_URL: /api
        ports:
          - "8081:80"
        depends_on:
          - api

    volumes:
      dbdata:
      uploads:

Things to notice:

- **Service names are host names.** Inside the network the API reaches MySQL at db:3306. localhost
  inside the api container means the api container itself.
- **Only web publishes a port.** MySQL and the API are reachable from each other, not from outside.
- **depends_on with condition: service_healthy** waits until mysqladmin ping succeeds. A plain
  depends_on only orders the start, and Spring would try to connect while MySQL is still initialising.
- **Spring's relaxed binding** maps SPRING_DATASOURCE_URL to spring.datasource.url; nothing in the
  jar changes per environment.
- **Named volumes** keep the database and uploads across docker compose down / up. docker compose
  down -v deletes them — and the data.
- **Secrets come from a .env file** next to compose.yaml (git-ignored), not from the YAML itself.

Run it: docker compose up --build, then open http://localhost:8081.

## Common mistakes

- jdbc:mysql://localhost:3306 in the container: Communications link failure.
- A single-stage image with Maven and the JDK in production: 800 MB instead of ~250 MB.
- No try_files: deep links 404 from nginx.
- Expecting docker run -e VITE_API_URL=... to change an already-built frontend.`,
    workedExample: `**Goal: one command starts the whole stack, and a refresh of a deep link works.**

**Step 1 — build the API image alone.**

    cd backend
    docker build -t shop-api .

The first build downloads dependencies (slow); change one Java file and rebuild — the
dependency:go-offline layer is reused and only package runs. That is the payoff of copying pom.xml
before src.

**Step 2 — run compose and read the logs.**

    docker compose up --build
    docker compose logs -f api

The first attempt without the healthcheck shows:

    api-1  | Communications link failure ... Connection refused
    db-1   | ... ready for connections.

The API started before MySQL accepted connections. With condition: service_healthy, compose waits for
the db healthcheck to pass and the API connects on its first try.

**Step 3 — check each hop.**

    docker compose ps                        # db healthy, api running, web running
    curl http://localhost:8081/              # index.html from nginx
    curl http://localhost:8081/api/products  # JSON, proxied by nginx to api:8080
    curl -i http://localhost:8081/orders/42  # 200 with index.html, thanks to try_files

If /api/products returned 502 Bad Gateway, nginx could not reach api:8080 — the API had crashed or
was still starting; its logs say which.

**Step 4 — prove the data survives.**

    docker compose down          # containers removed, volumes kept
    docker compose up -d
    # products still listed

    docker compose down -v       # volumes removed too: a clean database

**Step 5 — what changes for production.** The same backend image runs unchanged with a different
SPRING_DATASOURCE_URL. The frontend image is rebuilt only if VITE_API_URL changes — with the nginx
proxy and VITE_API_URL=/api it never needs to.`,
    mcqs: [
      mcq('The API Dockerfile builds with maven:3.9-eclipse-temurin-21 and then copies only the jar into eclipse-temurin:21-jre. What does the second stage buy?', [
        ['Faster startup, since a JRE image compiles the jar ahead of time', false],
        ['An image without Maven, the JDK or source, so it is smaller', true],
        ['Automatic test runs each time the container is started', false],
      ], 'Only what the second stage copies ends up in the final image. The build tools and source stay in the discarded build stage, which shrinks the image and what an attacker could find in it.'),
      mcq('In compose, the api service has SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/shop and fails with Communications link failure. MySQL is the db service. What is wrong?', [
        ['MySQL listens on 33060 inside containers, not on 3306', false],
        ['The JDBC driver needs the host written as 127.0.0.1 instead', false],
        ['The db service must publish 3306 to the host for api to use it', false],
        ['localhost is the api container itself; the host should be db', true],
      ], 'Each container has its own localhost. Compose puts services on a shared network where the service name resolves to the right container, so the URL should be jdbc:mysql://db:3306/shop.'),
      mcq('The api service has depends_on: [db] with no condition, and still fails to connect on a fresh start. Why?', [
        ['depends_on orders the start; it does not wait for MySQL to be ready', true],
        ['depends_on works only when both services are built from local Dockerfiles', false],
        ['A list form of depends_on is ignored by docker compose version 2', false],
      ], 'Compose starts db first but does not know when MySQL can accept connections. A healthcheck on db plus condition: service_healthy makes the api wait for it.'),
    ],
    checkpoint: [
      mcq('Why does the backend Dockerfile copy pom.xml and run dependency:go-offline before COPY src ./src?', [
        ['Maven requires the pom.xml to be in a separate layer', false],
        ['So editing Java code reuses the cached dependency layer', true],
        ['So the source code is excluded from the final image', false],
        ['It makes Maven skip the tests during the package step', false],
      ], 'Docker reuses a layer until its inputs change. Dependencies change rarely and code often, so separating them means a code change rebuilds only the package step.'),
      mcq('React is served by nginx with root /usr/share/nginx/html and only "location / { }". Refreshing /orders/42 gives an nginx 404. Which line fixes it?', [
        ['proxy_pass http://api:8080; inside location /', false],
        ['index index.html; at the server level', false],
        ['try_files $uri $uri/ /index.html; inside location /', true],
        ['error_page 404 /50x.html; at the server level', false],
      ], 'nginx looks for a file called orders/42 and has none. try_files falls back to index.html, React loads, and the router renders the order page.'),
      mcq('A developer runs docker compose down -v to "restart cleanly" and the products they added are gone. Why?', [
        ['-v removes the named volumes, including the MySQL data volume', true],
        ['-v rebuilds every image, which resets the database schema', false],
        ['down always deletes the data; only docker compose stop keeps it safe', false],
      ], 'Named volumes survive down and up, which is why the data normally persists. The -v flag explicitly removes them, so MySQL starts with an empty data directory.'),
    ],
  },

  /* ── DEPLOY ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_DEPLOY',
    notes: `**Deploying is running the same images somewhere public, with configuration from the
environment instead of your laptop.** The shape is the same whichever provider you pick:

    Browser ──HTTPS──> Frontend (static files or nginx)
                    └─> API container (Spring Boot)  ──TLS──> Managed MySQL
                                     └─> Object storage for uploads (optional)

## A free-tier-friendly path

Providers change their free tiers often; check the current terms. Two realistic shapes:

1. **Platform hosts.** The API as a Docker web service on a platform such as Render, Railway, Fly.io
   or Koyeb; the React build as a static site (the same platform, Netlify or Vercel); MySQL from a
   managed provider (Aiven, Railway, AWS RDS free tier or similar). Each part has its own HTTPS URL,
   so the frontend and API are on different origins: **CORS must allow the frontend URL**, and
   VITE_API_URL is the API's full URL. Free web services often sleep when idle, so the first request
   can take tens of seconds.
2. **One small VM.** An AWS EC2 (or any VPS) instance running docker compose with the nginx frontend
   container in front, plus RDS MySQL in the same VPC. Same-origin through nginx, no CORS, but you
   own the machine: updates, HTTPS certificates (Let's Encrypt, e.g. with Caddy or certbot) and the
   firewall.

## Configuration: one jar, many environments

    # application.properties — defaults that are safe to commit
    server.port=\${PORT:8080}
    spring.datasource.url=\${DB_URL}
    spring.datasource.username=\${DB_USERNAME}
    spring.datasource.password=\${DB_PASSWORD}
    spring.jpa.hibernate.ddl-auto=validate
    spring.jpa.open-in-view=false
    app.jwt.secret=\${JWT_SECRET}
    app.cors.allowed-origins=\${CORS_ORIGINS:http://localhost:5173}
    management.endpoints.web.exposure.include=health

- **PORT**: many platforms tell the container which port to listen on through PORT. If Spring ignores
  it, the platform's health check never connects and the deploy is marked failed.
- **DB_URL** for a managed MySQL usually needs TLS:
  jdbc:mysql://host:3306/shop?sslMode=REQUIRED
- **ddl-auto=validate** in production with **Flyway** (or Liquibase) migrations creating the schema.
  update guesses at schema changes and never drops anything; create-drop deletes your data on restart.
- **Secrets** (DB password, JWT secret, object-storage keys) are set in the host's dashboard or secret
  store, never in Git. If one was ever committed, rotate it — deleting the line does not delete it
  from history.
- Generate a long random JWT secret (at least 256 bits for HS256), different per environment.

## The frontend's configuration is a build input

The static host runs npm run build, so VITE_API_URL must be set **in the host's build settings**
before the build. Setting it after, or only as a runtime variable, changes nothing. Add the SPA
rewrite (_redirects or vercel.json, or try_files in your nginx).

## Database access

The database should accept connections only from the API: on AWS, the RDS security group allows 3306
from the API's security group (or the EC2 instance), never from 0.0.0.0/0. Use a database user with
rights on the application schema only, not root.

## HTTPS everywhere

A page served over https may not call an http API — the browser blocks it as **mixed content**. Every
URL in production is https, which platforms provide automatically. Behind a proxy, set
server.forward-headers-strategy=framework so Spring knows the original request was https.

## Verifying a deploy — do not stop at "it built"

1. **Health**: curl https://api.example.com/actuator/health returns {"status":"UP"} (add
   spring-boot-starter-actuator; it checks the database connection too).
2. **API directly**: curl a public endpoint, then log in with curl and call a protected one.
3. **Frontend Network tab**: requests go to the production API URL — not localhost — with 2xx status
   and no CORS errors in the console.
4. **The flows**: register, log in, refresh the page (still logged in?), open a deep link directly,
   upload a file, cause a validation error and see it on the field.
5. **Logs**: read the API logs for exceptions during all of the above.
6. **Restart**: redeploy the API and confirm data and uploads are still there.

## Common mistakes

- The production bundle still calling http://localhost:8080 because VITE_API_URL was not set at build.
- CORS allowing only localhost.
- ddl-auto=create-drop copied from a tutorial.
- The database open to the internet with the root user.
- Uploads written to the container's disk and lost on the next deploy.`,
    workedExample: `**Goal: a deployed stack where every problem is found by you, not your first user.**

**Order matters.** Deploy from the bottom up, so each layer has something real to talk to.

1. **Database.** Create the managed MySQL instance; create a schema shop and a user shop with rights on
   it only. Note host, port and whether TLS is required.
2. **API.** Create a web service from the backend Dockerfile. Set environment variables:

        DB_URL=jdbc:mysql://<db-host>:3306/shop?sslMode=REQUIRED
        DB_USERNAME=shop
        DB_PASSWORD=<from the provider>
        JWT_SECRET=<64 random bytes, base64>
        CORS_ORIGINS=https://shop-frontend.example.app
        SPRING_PROFILES_ACTIVE=prod

   Set the health check path to /actuator/health. Watch the deploy log until Flyway reports the
   migrations applied and Tomcat starts on the port from PORT.
3. **Check the API alone.**

        curl https://shop-api.example.app/actuator/health
        {"status":"UP"}
        curl -X POST https://shop-api.example.app/api/auth/login \\
             -H "Content-Type: application/json" -d '{"email":"admin@shop.test","password":"..."}'

4. **Frontend.** Create the static site from the frontend folder with build command npm ci && npm run
   build, publish directory dist, the SPA rewrite, and **VITE_API_URL=https://shop-api.example.app/api
   in the build environment**.
5. **Check in the browser.** Open the site with DevTools. The Network tab shows a call to
   shop-api.example.app/api/products with 200. Log in, refresh, open /orders/1 directly, upload a file.

**A failure, worked through.** The products page shows an error. The console says:

    Access to XMLHttpRequest at 'https://shop-api.example.app/api/products' from origin
    'https://shop-frontend.example.app' has been blocked by CORS policy

The request reached the right API, so VITE_API_URL is fine. The server did not allow this origin.
The environment shows CORS_ORIGINS=https://shop-frontend.example.app/ — a trailing slash. Origins have
no path, so the comparison fails. Remove the slash, redeploy the API (environment changes need a
restart), and the page loads. No frontend rebuild was needed, because nothing baked into the bundle
changed.`,
    mcqs: [
      mcq('A platform starts the API container with PORT=10000 and marks the deploy failed after its health check times out. The logs show "Tomcat started on port 8080". What is the fix?', [
        ['Add EXPOSE 10000 to the Dockerfile and rebuild the image', false],
        ['Ask the platform to use port 8080, the only port Spring allows', false],
        ['Set server.port=${PORT:8080} so Spring listens where told', true],
        ['Change the health check path to / instead of /actuator', false],
      ], 'The platform routes traffic to the port it chose, but Spring listened on its default. Reading PORT with a fallback makes the same jar work locally and on the platform. EXPOSE is only documentation.'),
      mcq('The React site is served from https://shop.example.com and VITE_API_URL is http://api.example.com/api. Requests fail before reaching the API. Why?', [
        ['An https page may not load http resources: mixed content', true],
        ['VITE_API_URL may not contain a domain other than localhost', false],
        ['axios only follows https URLs when withCredentials is set', false],
        ['Spring Boot refuses plain http unless SSL is configured', false],
      ], 'Browsers block active mixed content: script on a secure page cannot call an insecure URL. The API must be served over https, which hosting platforms provide.'),
      mcq('Which spring.jpa.hibernate.ddl-auto setting suits the production profile when schema changes are written as Flyway migrations?', [
        ['update, so Hibernate adds new columns automatically', false],
        ['create-drop, so each deploy starts from a clean, known schema state', false],
        ['validate, so Hibernate checks the schema but changes nothing', true],
      ], 'Flyway owns the schema; validate makes startup fail fast if the entities and tables disagree. update makes unreviewed changes and create-drop deletes data on every restart.'),
    ],
    checkpoint: [
      mcq('The deployed site\'s Network tab shows every call going to http://localhost:8080/api. The host has VITE_API_URL set as a runtime variable since yesterday. What fixes it?', [
        ['Restart the static site so the new variable is read on start', false],
        ['Set the variable in the build settings and rebuild the frontend', true],
        ['Add the production URL to Spring\'s CORS allowed origins', false],
        ['Clear the browser cache so the new value is downloaded', false],
      ], 'VITE_API_URL is replaced into the bundle during npm run build. The site was built without it, so the dev fallback was baked in; it must be present in the build environment and the site rebuilt.'),
      mcq('An RDS MySQL security group allows inbound 3306 from 0.0.0.0/0 "so the API can connect". What should it allow instead?', [
        ['3306 from the API instance\'s security group only', true],
        ['3306 from 0.0.0.0/0, with the root password rotated', false],
        ['All ports, but only from the developers\' home IPs', false],
      ], 'Only the API needs the database. Referencing the API\'s security group lets exactly those machines connect and nothing else on the internet can try passwords against it.'),
      mcq('A JWT secret was committed to application.properties in a public repository last month. The developer deletes the line today. What else must happen?', [
        ['Nothing; once the line is gone the secret is safe again', false],
        ['Make the repository private, which removes it from history', false],
        ['Rename the property so old tokens cannot find the value', false],
        ['Generate a new secret, set it as an environment variable', true],
      ], 'The old value is still in Git history and may already be copied. Anyone with it can sign tokens, so it must be replaced; the new one lives only in the environment.'),
    ],
  },

  /* ── DEBUGGING ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_DEBUGGING',
    notes: `**Full-stack bugs sit between the halves, so the first job is finding which side of the seam
they are on.** Three questions settle most of them: did the request leave the browser, what URL did it
go to, and what came back? The Network tab answers all three.

## Bug 1 — "CORS error", but only in the browser

    Access to XMLHttpRequest at 'http://localhost:8080/api/orders' from origin
    'http://localhost:5173' has been blocked by CORS policy

curl and Postman get 200. **Cause:** the API does not allow the origin; only browsers check.
**Fix:** a CorsConfigurationSource bean listing http://localhost:5173 (and the production origin) with
http.cors(...) in the security chain — or the Vite proxy in development.

## Bug 2 — preflight 403 from Security

The Network tab shows OPTIONS /api/orders/9 → 403, and the DELETE never appears. The controller has
@CrossOrigin. **Cause:** the security filter chain treats the token-less OPTIONS as anonymous and
denies it before any controller runs. **Fix:** .cors(Customizer.withDefaults()) in the
SecurityFilterChain so Security's CorsFilter answers the preflight.

## Bug 3 — the token is not sent

    // src/api/auth.js
    import axios from 'axios';
    axios.interceptors.request.use(c => { c.headers.Authorization = 'Bearer ' + getToken(); return c; });

    // src/api/client.js
    export const client = axios.create({ baseURL: import.meta.env.VITE_API_URL });

Every protected call returns 401 and the request headers have no Authorization. **Cause:** the
interceptor is on the global axios object; an instance from axios.create has its own interceptors.
**Fix:** client.interceptors.request.use(...) on the instance the api modules import.

## Bug 4 — a refresh logs the user out

Login works; F5 returns to /login. **Cause:** the token lives only in React state or the Redux store.
**Fix:** restore it on start-up — read localStorage into the initial state (with the XSS trade-off
understood), or call /api/auth/refresh with an httpOnly cookie before rendering the guarded routes,
showing a spinner while that check runs so RequireAuth does not redirect too early.

## Bug 5 — nginx 404 on deep links

/ works; refreshing /orders/42 returns nginx's 404 page. **Cause:** nginx looks for a file at
/orders/42. **Fix:** try_files $uri $uri/ /index.html; in location /.

## Bug 6 — the container cannot reach MySQL

    com.mysql.cj.jdbc.exceptions.CommunicationsException: Communications link failure

The URL is jdbc:mysql://localhost:3306/shop. **Cause:** inside the api container, localhost is the api
container. **Fix:** the compose service name, jdbc:mysql://db:3306/shop — plus a healthcheck and
condition: service_healthy so the API waits for MySQL to be ready.

## Bug 7 — works locally, calls localhost in production

The deployed site's Network tab shows requests to http://localhost:8080/api (or they are blocked as
mixed content). **Cause:** VITE_API_URL was not set when the frontend was built, so the development
value was baked into the bundle. **Fix:** set it in the build environment (or as the Docker build arg)
and rebuild. Changing a runtime variable will not help.

## Bug 8 — 413 on upload

A 3 MB upload fails with 413 Request Entity Too Large and an HTML body. **Cause:** if the body is
nginx's HTML page, nginx's client_max_body_size (default 1m) stopped it; if it is your ProblemDetail,
Spring's spring.servlet.multipart.max-file-size did. **Fix:** raise the limit in whichever layer
answered, and keep the layers consistent (nginx ≥ Spring's max-request-size).

## The method

Find the layer first: browser (CORS, mixed content, build-time config), proxy (nginx 404/413/502),
security filter (401/403 before the controller), application (your ProblemDetail), database (logs).
Read the response body — whose error page it is tells you who answered.`,
    mcqs: [
      mcq('An axios request interceptor is registered with axios.interceptors.request.use(...), but the api modules use an instance from axios.create(...). What happens to their requests?', [
        ['They carry the header, since instances share global interceptors', false],
        ['They are sent without the header, so protected calls return 401', true],
        ['They fail to send at all until the interceptor is removed', false],
        ['They get the header twice, which Spring rejects with 400', false],
      ], 'Each instance created with axios.create has its own interceptor chain. The global registration never runs for the instance, so the Authorization header is missing.'),
      mcq('In compose the API logs CommunicationsException: Communications link failure while connecting to jdbc:mysql://localhost:3306/shop. MySQL runs as service db. What is the cause?', [
        ['The MySQL image does not accept JDBC connections by default', false],
        ['localhost inside the api container is not the MySQL container', true],
        ['MySQL requires the API to connect through the host\'s port', false],
      ], 'Every container has its own network namespace, so localhost points back at the API. On the compose network the service name db resolves to MySQL.'),
      mcq('Uploads of a 3 MB file fail with 413 and the response body is an HTML page titled "413 Request Entity Too Large" from nginx. Which setting needs to change?', [
        ['spring.servlet.multipart.max-file-size in the API', false],
        ['server.tomcat.max-swallow-size in the API', false],
        ['The timeout on the axios client in React', false],
        ['client_max_body_size in the nginx configuration', true],
      ], 'The HTML page shows nginx answered, so the request never reached Spring. nginx\'s default client_max_body_size is 1m; raise it to at least the API\'s multipart request limit.'),
      mcq('The deployed site works except that every page refresh on /dashboard returns the user to /login, though the token is in localStorage. RequireAuth reads the token from the Redux store. What is the likely cause?', [
        ['The store\'s initial state never reads the token back from localStorage', true],
        ['localStorage is cleared by the browser whenever a page is refreshed', false],
        ['Spring invalidates JWTs that arrive without a session cookie', false],
      ], 'Writing to localStorage is half the job; on start-up the store must be initialised from it. Otherwise the store begins empty and the guard redirects before anything checks storage.'),
    ],
  },

  /* ── PRACTICE ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_PRACTICE',
    notes: `**Six exercises that join a React app to a Spring Boot API.** Use the products API you built in
the Spring Boot topics (or any small Boot app with JPA and Security) and a fresh Vite React app. Each
exercise has a check; do not move on until it passes.

**1 — One client, two ways.** Create src/api/client.js with axios.create and baseURL from
VITE_API_URL. Run once with the Vite proxy (VITE_API_URL=/api) and once calling
http://localhost:8080/api directly. Check: with the proxy the Network tab shows only localhost:5173;
directly, it shows 8080 and you get a CORS error until the next exercise.

**2 — CORS done properly.** Add a CorsConfigurationSource bean reading app.cors.allowed-origins and
enable .cors(...) in the SecurityFilterChain. Check: a PUT from React shows a successful OPTIONS
preflight followed by the PUT, and an origin not in the list is still refused.

**3 — Login to logout.** Build the login form, an auth slice, a request interceptor and a response
interceptor that logs out on 401 (but not for /auth/login) and leaves 403 alone. Shorten the token
expiry to two minutes. Check: after two minutes the next call returns you to the login page, and
logging in returns you to the page you were on.

**4 — An upload with limits.** Add an avatar upload: React FormData with a progress bar, a
MultipartFile endpoint that accepts PNG or JPEG up to 2 MB, stored under a generated name in a
configured directory, and a 413 mapped to a ProblemDetail. Check: a 3 MB file shows "Max 2 MB" from
the server's response, not a generic error.

**5 — Errors in the form.** Return ProblemDetail with an errors map for validation failures and a 409
for a duplicate product name. Show each message under its field in React-Bootstrap. Check: stop the API
and submit — the form shows a network message with Retry, and the typed values are still there.

**6 — Compose it.** Write both Dockerfiles, nginx.conf with try_files and the /api proxy, and a
compose.yaml with MySQL, a healthcheck and two named volumes. Check: docker compose up --build from a
fresh clone works, /products/1 survives a refresh, and an uploaded avatar survives docker compose down
and up.`,
    mcqs: [
      mcq('Exercise 1 calls http://localhost:8080/api directly. Which Network-tab entry confirms the request was cross-origin?', [
        ['An Origin: http://localhost:5173 header sent to localhost:8080', true],
        ['A 304 Not Modified status on the products request', false],
        ['A Referrer-Policy header in the products response from port 8080', false],
        ['The request listed under the Fetch/XHR filter', false],
      ], 'The browser adds an Origin header to cross-origin requests. Seeing localhost:5173 as the origin and localhost:8080 as the target shows two origins are involved, so CORS applies.'),
      mcq('In exercise 3 the token lasts two minutes. Why shorten it for the exercise?', [
        ['Short tokens make the login request return faster', false],
        ['Spring rejects tokens longer than two minutes in tests', false],
        ['So the expiry path is exercised instead of assumed', true],
        ['The interceptor can only read tokens that expire soon', false],
      ], 'With a long expiry the 401-handling code would never run during development. A two-minute token forces the real path — 401, logout, login, return to the page — to be tested.'),
      mcq('Exercise 4 accepts PNG or JPEG only. Which check in the Spring endpoint cannot be trusted on its own?', [
        ['That the file is not empty, via file.isEmpty()', false],
        ['That file.getContentType() says image/png or image/jpeg', true],
        ['That the size is within spring.servlet.multipart limits', false],
      ], 'getContentType() reports what the client sent, which an attacker controls. Emptiness and size are measured from the bytes received; the type should be confirmed from the file\'s first bytes.'),
      mcq('Exercise 5 returns a 409 for a duplicate product name. Which ProblemDetail lets the React form show the message under the name field?', [
        ['status 409 with detail only, and the field guessed by the UI', false],
        ['status 500 with the SQL duplicate-key message as the detail', false],
        ['status 409 with an errors property of { name: "..." }', true],
        ['status 200 with a body of { ok: false, field: "name" }', false],
      ], 'The same errors map used for validation lets one piece of React code place messages under fields. 409 is the honest status; 500 leaks internals and 200 hides the failure from axios.'),
      mcq('In exercise 6 an avatar uploaded before docker compose down is gone after up. The uploads directory is /app/uploads. What is missing from compose.yaml?', [
        ['A named volume mounted at /app/uploads in the api service', true],
        ['A ports mapping for the uploads folder on the web service', false],
        ['An EXPOSE line for /app/uploads in the API Dockerfile', false],
        ['A healthcheck on the api service for the upload folder', false],
      ], 'down removes the containers and their writable layers. Only a volume mounted at the upload path keeps files across container replacements.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_INTERVIEW_QUESTION',
    notes: `**Three questions a full-stack Java interview asks about joining and shipping the two halves.**
Practise each aloud in under ninety seconds; then the follow-up.

## Question 1 — "Walk me through what happens when a user logs in to your app."

**Model answer.** The React form posts email and password to /api/auth/login. Spring's
AuthenticationManager checks them against the user from the database with the BCrypt encoder; on
success the controller issues a signed JWT with the user id, roles and a short expiry. React stores it
— in my project in the Redux store mirrored to localStorage — and an axios request interceptor adds
Authorization: Bearer on every call. On the server a OncePerRequestFilter validates the signature and
expiry and sets the SecurityContext, and endpoints check roles with @PreAuthorize. A response
interceptor logs the user out on 401 except on the login call itself, and leaves 403 to the page.

**Follow-up: "Why localStorage? Isn't that insecure?"** It is readable by any script on the page, so an
XSS bug can steal the token. I accepted that for a project with short-lived tokens and no rich-text
input, and I would say so. In production I would keep the access token in memory and a refresh token
in an httpOnly, Secure, SameSite cookie, which script cannot read — and then deal with CSRF, because
the browser sends that cookie by itself.

## Question 2 — "You deploy and the frontend shows CORS errors. How do you debug it?"

**Model answer.** First I confirm the request goes to the right URL in the Network tab — if it goes to
localhost, VITE_API_URL was not set at build time and no CORS change will help. If the URL is right, I
check the response to the OPTIONS preflight: a 401 or 403 means Spring Security rejected it before CORS
was applied, so .cors() must be enabled in the filter chain; a 200 without
Access-Control-Allow-Origin means the production origin is not in the allowed list. I fix the list
through an environment variable, exactly matching scheme, host and port with no trailing slash.

**Follow-up: "Could you avoid CORS altogether?"** Yes — serve the React build and proxy /api from the
same origin, with nginx or the host's rewrite rules. Then the browser never makes a cross-origin call.
That is how my docker compose setup works.

## Question 3 — "How did you containerise and deploy the application?"

**Model answer.** Two multi-stage Dockerfiles: Maven builds the jar and a JRE image runs it; Node builds
the React app and nginx serves dist with try_files for client routes and a proxy for /api. Locally,
docker compose runs MySQL with a healthcheck and a named volume, the API with
condition: service_healthy, and nginx. In the cloud the API image runs as a web service with
configuration from environment variables — database URL, credentials, JWT secret, CORS origins — the
database is a managed MySQL reachable only from the API, and Flyway migrates the schema with
ddl-auto=validate. I verify with the actuator health endpoint and by walking the main flows in the
browser.

**Follow-up: "Your API container restarts and uploaded files disappear. Why?"** They were written to
the container's filesystem, which is replaced on restart or redeploy. Uploads belong in a mounted
volume or, on a platform, in object storage, with only the key stored in MySQL.`,
    mcqs: [
      mcq('An interviewer asks why your response interceptor does not log the user out on a 403. Which answer is correct?', [
        ['403 means the token is valid but the role is not enough', true],
        ['403 is only sent for CORS failures, never for authorisation', false],
        ['403 means the server is down, so logging out would lose work', false],
      ], 'Spring Security returns 403 when an authenticated user lacks permission. Logging out would not change their role; the page should explain the missing access instead.'),
      mcq('Asked how to deploy a React + Spring Boot app with no CORS configuration at all, which answer works?', [
        ['Set axios withCredentials so the browser skips the CORS checks', false],
        ['Serve the build and proxy /api from one origin, for example nginx', true],
        ['Deploy both on the same cloud provider, which shares one origin', false],
      ], 'CORS applies only across origins. If nginx serves the React files and forwards /api to Spring on the same scheme, host and port, every call is same-origin.'),
      mcq('The interviewer asks why ddl-auto is validate in your production profile. Which answer shows you understand it?', [
        ['Flyway owns schema changes; validate fails fast on a mismatch', true],
        ['validate is required by MySQL; other values only work on H2', false],
        ['validate creates missing tables but never deletes existing ones', false],
      ], 'With migrations versioned in Flyway, Hibernate should not alter the schema. validate compares entities to tables at startup and stops the app if they disagree.'),
    ],
  },

  /* ── PROJECT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_PROJECT',
    notes: `**Brief: a full-stack application, deployed at a public URL.** Join the React frontend and the
secured Spring Boot API you have built into one product — an inventory manager, a course portal, a
job board or a clinic booking system — and put it on the internet. A reviewer should be able to open
the URL, log in with the demo accounts in your README, and use every feature.

## Architecture

    React (Vite, React Router, Redux Toolkit, axios, React-Bootstrap)
       │  HTTPS, JSON, Authorization: Bearer <JWT>
    Spring Boot 3 API (Web, Validation, Data JPA, Security 6 + JWT, Actuator, Flyway)
       │  JDBC over TLS
    MySQL 8 (managed in the cloud, a container locally)
       + file storage for uploads (volume locally, object storage or a persistent disk in the cloud)

## Required features

1. **Authentication.** Register, log in, log out. Passwords hashed with BCrypt. JWT issued on login,
   sent by an axios interceptor, validated by a filter. Expired sessions return the user to the login
   page and back to where they were afterwards.
2. **Two roles.** USER and ADMIN. Admin-only screens are guarded in React **and** the endpoints are
   protected with role checks in Spring; a USER calling an admin endpoint directly gets 403.
3. **CRUD on a main resource** (e.g. products, courses, jobs) with a related one (categories,
   lessons, applications): list with pagination and search, detail, create, edit, delete.
4. **One upload.** An image or PDF attached to the main resource, with type and size validation on
   the server, a generated storage key, and the file served back to authorised users.
5. **One error contract.** ProblemDetail for every error; field errors shown under their inputs; a
   network failure shows a message with Retry; no stack traces in responses.

## Required endpoints (adapt the names)

    POST   /api/auth/register          POST   /api/auth/login
    GET    /api/items?page=&size=&q=   GET    /api/items/{id}
    POST   /api/items                  PUT    /api/items/{id}         DELETE /api/items/{id}  (ADMIN)
    POST   /api/items/{id}/files       GET    /api/files/{key}
    GET    /actuator/health

## Required screens

Login, register, list (with search and pagination), detail (with the attachment), create/edit form,
an admin page, a 403 "no access" page and a not-found page.

## Deployment requirements

- Multi-stage Dockerfiles for the API and the frontend; a compose.yaml that starts MySQL (with a
  healthcheck and a volume), the API and nginx with one command.
- Deployed to a cloud host of your choice with a managed MySQL. Every secret in environment variables;
  .env.example committed, .env ignored.
- Flyway migrations and ddl-auto=validate in production.
- CORS allows exactly the production frontend origin (or the app is same-origin through a proxy).
- HTTPS throughout; deep links survive a refresh.

## Acceptance criteria

- The public URL works on a phone and a laptop, and /actuator/health reports UP.
- A USER cannot reach admin data through the UI **or** with curl and their token.
- Refreshing a protected page keeps the user logged in until the token expires.
- Submitting an invalid form shows server messages under the fields.
- An upload over the limit shows a clear message; a valid one survives a redeploy.
- git log and the repository contain no passwords or JWT secrets.
- The README has the live URL, demo accounts, an architecture sketch, how to run with docker compose,
  every environment variable, and the token-storage decision with its trade-off.`,
    mcqs: [
      mcq('The project requires that a USER calling an admin endpoint with curl gets 403. What does that acceptance check prove that a click-through test of the UI cannot?', [
        ['That the frontend route guard redirects to the 403 page', false],
        ['That the server enforces roles even when the UI is bypassed', true],
        ['That CORS blocks requests made from outside the browser', false],
      ], 'A UI test only shows what screens are hidden. Calling the endpoint directly with a USER token tests the control that actually protects data: the role check in Spring.'),
      mcq('Why does the brief ask for an uploaded file to survive a redeploy?', [
        ['A redeploy replaces the container, so it tests where files are stored', true],
        ['Redeploys re-run Flyway, which deletes any rows that point to stored files', false],
        ['The upload limit is reset on every redeploy of the API service', false],
      ], 'Files written inside the container vanish when it is replaced. Surviving a redeploy proves uploads go to a volume or object storage, as production requires.'),
    ],
    assignment: {
      title: 'Project — A Full-Stack App, Deployed',
      description: 'A React frontend and a secured Spring Boot 3 API on MySQL, joined into one application with JWT login and two roles, CRUD with pagination, a validated file upload, one ProblemDetail error contract, Docker images and docker compose, and a public HTTPS deployment with configuration in environment variables.',
      instructions: `1. Choose the domain and write the data model (a main resource, a related one, users with roles). Create Flyway migrations for it.
2. Build the API: DTOs, validation, services, controllers under /api, a @RestControllerAdvice returning ProblemDetail, Spring Security with a JWT filter, role checks, CORS from configuration, and Actuator health.
3. Build the frontend: an axios client with VITE_API_URL and request/response interceptors, an auth slice, RequireAuth with role support, and the required screens with loading, error, empty and field-error states.
4. Add the upload: FormData with progress in React; a MultipartFile endpoint with type and size validation, generated keys, configured storage, and a protected download.
5. Write both multi-stage Dockerfiles, nginx.conf (try_files and the /api proxy), .dockerignore files and compose.yaml with MySQL, a healthcheck and named volumes. Confirm docker compose up --build works from a fresh clone.
6. Deploy: managed MySQL, the API with environment variables, the frontend with VITE_API_URL in its build settings. Verify health, the flows, deep links, uploads after a redeploy, and the logs.
7. Write the README (live URL, demo accounts, architecture, environment variables, how to run, token-storage trade-off) and submit the repository link and the live URL.`,
      rubric: [
        { criterion: 'Authentication and authorisation', description: 'BCrypt passwords, JWT issued and validated, interceptor sends the token, 401 logs out (not on login), 403 handled, roles enforced on the server and guarded in React, refresh keeps the session.', maxPoints: 25 },
        { criterion: 'API and frontend integration', description: 'CRUD with pagination and search through one api client; DTOs not entities; CORS correct or same-origin; uploads validated, stored under generated keys outside the container and served to authorised users.', maxPoints: 20 },
        { criterion: 'Error handling', description: 'ProblemDetail for every error, field errors shown under inputs, network failures with Retry, no stack traces or internals in responses.', maxPoints: 15 },
        { criterion: 'Containers', description: 'Multi-stage images for both halves, nginx with SPA fallback and proxy, compose with MySQL healthcheck, service_healthy and named volumes; runs from a fresh clone with one command.', maxPoints: 20 },
        { criterion: 'Deployment and configuration', description: 'Public HTTPS URL; managed MySQL reachable only by the API; secrets in environment variables and none in Git; Flyway with ddl-auto=validate; health endpoint UP; deep links and uploads survive.', maxPoints: 15 },
        { criterion: 'README and explanation', description: 'Live URL, demo accounts, architecture sketch, environment variables, run instructions and the token-storage decision with its trade-off.', maxPoints: 5 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_CHECKPOINT',
    notes: `**Ten questions on joining and shipping a React + Spring Boot application.** The api client and
the Vite proxy, CORS with Spring Security, the JWT login flow and token storage, uploads, the error
contract, Docker images and compose, and deploying with configuration in the environment. Each is a
situation from a real project; choose what you would do, without looking anything up.`,
    checkpoint: [
      ck('REST_APIS', 'A React page calls GET /api/products and Spring returns a JPA Product entity with a lazy @OneToMany reviews list. The call fails during JSON serialisation. What is the sound fix?', [
        ['Make every relation EAGER so Jackson can always reach it', false],
        ['Return a ProductDto that holds only the fields the page needs', true],
        ['Annotate the controller with @Transactional to keep a session', false],
        ['Have React request the reviews before it asks for products', false],
      ], 'Serialising entities couples the JSON to the database model and trips over lazy relations. A DTO states the API contract and loads exactly what the page shows.'),
      ck('REST_APIS', "vite.config.js has proxy '/api' → http://localhost:8080. After npm run build the static files are served by a plain static host and every call to /api returns the host's 404 page. Why?", [
        ['The proxy runs only in the dev server and is not part of the build', true],
        ['The build strips /api from URLs unless VITE_API_URL ends with a slash', false],
        ['Static hosts block requests to paths that begin with /api by default', false],
      ], 'server.proxy configures the Vite dev server. The build is just files, so in production /api must be proxied by nginx or the host, or VITE_API_URL must point at the API directly.'),
      ck('AUTHENTICATION', 'Spring Security returns 401 for an expired token. The React app should then send the user to /login and, after they sign in, back to /orders/42. What makes the return possible?', [
        ['Storing the expired token so the login form can reuse it', false],
        ['Redirecting with window.location so the page fully reloads', false],
        ['Passing the current location in Navigate state as from', true],
        ['Keeping /orders/42 as the default route after every login', false],
      ], 'RequireAuth passes state={{ from: location }} to the login route; after a successful login the form navigates to state.from with replace, so the user resumes where the session ended.'),
      ck('AUTHENTICATION', 'An app keeps its JWT in an httpOnly cookie, sets withCredentials on axios and disables CSRF in Spring Security. What exposure does that leave?', [
        ['Any script on the page can read the cookie and steal it', false],
        ['The cookie is dropped after every page refresh in Chrome', false],
        ['Another site can trigger requests that carry the cookie', true],
      ], 'An httpOnly cookie is hidden from script but sent automatically with requests to its site. With CSRF protection off, only SameSite rules stand between a malicious page and a forged request.'),
      ck('REST_APIS', 'The products API should accept a JSON body and an image in one request. Which handler signature does that?', [
        ['@RequestPart("data") ProductRequest data, @RequestPart("image") MultipartFile image', true],
        ['@RequestBody ProductRequest data, @RequestBody MultipartFile image', false],
        ['@RequestParam("data") ProductRequest data, @PathVariable("image") MultipartFile image', false],
      ], '@RequestPart binds individual parts of a multipart request, converting a JSON part with Jackson. A method can have only one @RequestBody, and files never arrive as path variables.'),
      ck('REST_APIS', 'The global handler catches Exception and returns ProblemDetail 500, yet a 403 from @PreAuthorize still arrives in a different JSON shape. Where is that response shaped?', [
        ['In Jackson, which formats every 403 with its own mapper', false],
        ['In axios, which rewrites error bodies for 4xx statuses', false],
        ['In nginx, which replaces bodies of error responses', false],
        ['In Spring Security, via its AccessDeniedHandler', true],
      ], 'Security exceptions raised in the filter chain are handled by the AuthenticationEntryPoint and AccessDeniedHandler. Customise those to return the same ProblemDetail as the advice.'),
      ck('CONTAINERS_DOCKER', 'The frontend image is built once with VITE_API_URL=/api and run behind nginx that proxies /api to api:8080. What has to change to deploy it against a new API host?', [
        ['A rebuild, since /api is baked in and must become the new host', false],
        ['Only the proxy_pass target in nginx.conf; the bundle stays the same', true],
        ['The VITE_API_URL environment variable on the running container', false],
      ], 'The bundle calls the relative path /api, which is always same-origin. Only nginx knows where the API lives, so changing proxy_pass (or the service name) is enough.'),
      ck('CONTAINERS_DOCKER', 'The MySQL service in compose.yaml has no healthcheck. Which change makes the api service wait until MySQL accepts connections?', [
        ['Add restart: always to db so it comes up faster', false],
        ['Add a mysqladmin ping healthcheck and service_healthy', true],
        ['Publish port 3306 so the api can probe it from outside', false],
        ['Start the api service first so MySQL can find it later', false],
      ], 'Compose can only wait for readiness it can observe. A healthcheck defines "ready" for db, and depends_on with condition: service_healthy makes api start after it passes.'),
      ck('DEPLOYMENT', 'CORS_ORIGINS on the API host is https://shop.example.app/ and the browser at https://shop.example.app still gets CORS errors. What is wrong?', [
        ['The trailing slash makes it a URL, not an origin, so it never matches', true],
        ['Origins must be written in upper case to match the Origin header', false],
        ['CORS origins cannot be supplied by environment variables', false],
        ['The browser sends its origin only when the request is a GET', false],
      ], 'The Origin header is scheme, host and port with no path. Spring compares it exactly with each allowed origin, so a trailing slash means the strings never match.'),
      ck('DEPLOYMENT', 'A deploy finished and /actuator/health returns UP. Which check still needs doing before you call it verified?', [
        ['Nothing; UP means every part of the stack is working', false],
        ['Checking that the frontend calls the production API and flows work', true],
        ['Restarting the database so the new schema is loaded', false],
        ['Rebuilding the frontend so that it picks up the new health status value', false],
      ], 'Health shows the API is running and reaches its database. It says nothing about the frontend\'s build-time URL, CORS, login, deep links or uploads, which only a browser walk-through confirms.'),
    ],
  },
];
