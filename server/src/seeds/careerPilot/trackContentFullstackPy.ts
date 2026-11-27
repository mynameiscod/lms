/**
 * Career-track content: React and Django — Integration and Deployment (JT_FULLSTACK_PY), for
 * Python Full Stack + AI.
 *
 * This topic joins the two halves the student has already built: the React app (Vite, React Router,
 * axios, Redux Toolkit) and the Django REST Framework API on MySQL with Simple JWT and permissions.
 * It covers the seams between them: one axios client and the Vite proxy, django-cors-headers and when
 * CSRF applies, the login flow with refresh, multipart uploads, one error contract, Gunicorn and nginx
 * in docker compose, and a real deployment.
 *
 * Checked against Django 5.2, DRF 3.18, djangorestframework-simplejwt 5.5, django-cors-headers 4.9
 * and axios 1.13. Every response body, status and error message quoted here was produced by running
 * the code (DRF's test client for the Django side, node for the axios interceptors and the error
 * parser). Docker, nginx, Gunicorn, WhiteNoise, object storage and the hosting platforms could not be
 * run here and are described as documented behaviour.
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

export const TRACK_FULLSTACK_PY_BUNDLES: PilotBundle[] = [
  /* ── REACT_CALLS_DRF ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_PY_REACT_CALLS_DRF',
    notes: `**Two servers, one application.** In development the React app runs on the Vite dev server
(http://localhost:5173) and the API on Django's runserver (http://localhost:8000). The browser loads
the React bundle from one and calls the other. This topic is about making that conversation reliable:
first on your laptop, then in containers, then on the internet.

## The Django side: every API route under /api/

One prefix keeps API paths apart from React's routes, and makes the proxy, nginx and the CORS rules
one line each.

    # config/urls.py
    from django.contrib import admin
    from django.urls import include, path

    urlpatterns = [
        path("admin/", admin.site.urls),
        path("api/auth/", include("accounts.urls")),     # Simple JWT views, /me/
        path("api/", include("catalog.urls")),
    ]

    # catalog/urls.py
    from rest_framework.routers import DefaultRouter
    from .views import ProductViewSet

    router = DefaultRouter()
    router.register("products", ProductViewSet)          # /api/products/ and /api/products/<pk>/
    urlpatterns = router.urls

## What DRF's JSON looks like from React

These shapes surprise people the first time they reach a component. All of them were produced by
DRF 3.18:

**A paginated list is an object, not an array.** With PageNumberPagination:

    {"count": 3, "next": "http://localhost:8000/api/products/?page=2", "previous": null,
     "results": [{"id": 1, "name": "Pen"}, {"id": 2, "name": "Notebook"}]}

The rows are in data.results and the total is data.count. Pages are numbered **from 1**:
?page=0 returns 404 {"detail": "Invalid page."}, while an empty first page is a normal 200 with
"results": [].

**A DecimalField is a string.** A price serialises as "499.00", because a JavaScript number cannot
hold every decimal exactly. Convert where you calculate (Number(p.price)) and format where you show it;
adding the raw values concatenates strings. (COERCE_DECIMAL_TO_STRING = False in REST_FRAMEWORK
changes this globally; most teams leave it on.)

**Dates are ISO 8601 strings** such as "2026-10-14T09:30:00Z" with USE_TZ = True. new Date(value)
parses them; toLocaleString shows them in the user's time zone.

**URLs end in a slash.** The router's patterns are products/ and products/<pk>/. A POST to
/api/products (no slash) is a trap: with DEBUG = True, CommonMiddleware's APPEND_SLASH raises a
RuntimeError (500) because it cannot redirect a POST without losing the body; with DEBUG = False it
answers 301 to /api/products/, and the browser follows a 301 after a POST with a **GET** — so the
"create" silently becomes a list request that returns 200. Always write the slash.

## The React side: one client

    // src/api/client.js
    import axios from 'axios';

    export const client = axios.create({
      baseURL: import.meta.env.VITE_API_URL,   // '/api' with the proxy, or 'http://localhost:8000/api'
      timeout: 10000,
    });

    // src/api/products.js
    import { client } from './client';

    export const productsApi = {
      list:   (page = 1, search = '') =>
                client.get('/products/', { params: { page, search } }).then(r => r.data),
      get:    id => client.get('/products/' + id + '/').then(r => r.data),
      create: body => client.post('/products/', body).then(r => r.data),
      update: (id, changes) => client.patch('/products/' + id + '/', changes).then(r => r.data),
      remove: id => client.delete('/products/' + id + '/'),
    };

Components and thunks call productsApi; none of them contains a host name or builds a URL. The next
units add the interceptors (token, refresh) to this same client, so every call gets them.

    // a thunk using it
    export const fetchProducts = createAsyncThunk('products/fetch', async ({ page, search }) => {
      const data = await productsApi.list(page, search);
      return { items: data.results, total: data.count };
    });

## Where VITE_API_URL comes from

Vite exposes only variables prefixed VITE_ on import.meta.env:

    # .env.development
    VITE_API_URL=/api

    # .env.production
    VITE_API_URL=https://api.shop.in/api

**The value is written into the JavaScript at build time.** npm run build replaces
import.meta.env.VITE_API_URL with the literal string; changing an environment variable on the server
later changes nothing. A different API means a different build — or a relative /api that a proxy
resolves. Never put a secret in a VITE_ variable: the bundle is public.

## Option 1 in development: the Vite proxy

    // vite.config.js
    export default defineConfig({
      plugins: [react()],
      server: {
        proxy: {
          '/api': { target: 'http://localhost:8000', changeOrigin: true },
        },
      },
    });

With VITE_API_URL=/api the browser requests http://localhost:5173/api/products/ — the same origin as
the page — and the Vite dev server forwards it, path unchanged, to port 8000. There is no cross-origin
request, so no CORS. The proxy exists only in npm run dev; a production build is static files with
no proxy in it.

## Option 2 in development: call port 8000 directly

With VITE_API_URL=http://localhost:8000/api the browser calls another origin, and Django must answer
with CORS headers (next unit). Both options work; know which one you are using, because it decides
whether a CORS error is even possible.

## Common mistakes

- **Rendering data.map** on a paginated response: the array is data.results.
- **Summing prices** without converting the strings.
- **Missing trailing slash** on POST, PUT, PATCH or DELETE.
- **baseURL ending in /api and paths starting with /api**: the request goes to /api/api/products/.
- **API_URL without the VITE_ prefix**: it is undefined, and axios quietly calls relative paths.
- **Expecting the Vite proxy in production.**`,
    mcqs: [
      mcq('A component does setProducts(await productsApi.list()) and then renders products.map(...). It crashes with "products.map is not a function". The viewset uses PageNumberPagination. Why?', [
        ['DRF sends lists as a JSON string that must be parsed first', false],
        ['axios resolves each list item as a separate Promise', false],
        ['The rows are in data.results; data itself is an object', true],
        ['Arrays from another origin lose their prototype methods', false],
      ], 'A paginated DRF response is {"count", "next", "previous", "results"}. axios has already parsed the JSON, so the component must read .results for the rows and .count for the pager.'),
      mcq('A cart total is computed with items.reduce((sum, i) => sum + i.price, 0) and shows "0499.00199.00". What explains it?', [
        ['DRF serialises a DecimalField as a string such as "499.00"', true],
        ['axios converts every number in a response body into a text string', false],
        ['MySQL stores DECIMAL columns as VARCHAR behind the scenes', false],
        ['reduce always concatenates when the start value is zero', false],
      ], 'DRF renders decimals as strings to keep them exact. 0 + "499.00" is a string, and every later + concatenates. Convert with Number() where you calculate, and format for display.'),
      mcq("During runserver with DEBUG = True, client.post('/products', body) returns a 500 whose page names RuntimeError and APPEND_SLASH. What is the fix?", [
        ["Set APPEND_SLASH = True so Django adds the slash itself", false],
        ["Call '/products/' so the URL matches the router's pattern", true],
        ["Send the body as FormData so that the 301 redirect can carry it along", false],
        ["Add csrf_exempt to the viewset so the POST is accepted", false],
      ], 'APPEND_SLASH is already on: CommonMiddleware wants to redirect to the slashed URL but cannot keep a POST body, so in debug mode it raises instead. Calling the slashed URL avoids the redirect entirely.'),
    ],
    checkpoint: [
      mcq("vite.config.js proxies '/api' to http://localhost:8000 with changeOrigin, and the client's baseURL is '/api'. Which request reaches Django for client.get('/products/', { params: { page: 2 } })?", [
        ['GET /products/?page=2 on port 8000, with the /api prefix removed', false],
        ['GET /api/products/?page=2 on port 8000, forwarded by Vite', true],
        ['GET /api/products/2/ on port 5173, answered by Vite itself', false],
        ['GET /api/products/?page=2 sent by the browser straight to 8000', false],
      ], 'The browser asks the dev server for /api/products/?page=2 on its own origin. The proxy forwards the same path and query to port 8000; it does not strip /api unless you add a rewrite.'),
      mcq('A pager copied from a Spring project starts at page 0. Its first request, /api/products/?page=0, returns 404 {"detail": "Invalid page."}. Why?', [
        ['The router has no pattern for query strings that hold a zero', false],
        ['The table is still empty, and DRF answers 404 for any empty list it returns', false],
        ['PageNumberPagination numbers pages from 1, so page 0 is invalid', true],
      ], 'DRF\'s page-number pagination starts at 1 and raises NotFound for any page outside the range. An empty first page is still a 200 with an empty results list.'),
      mcq('In production (DEBUG = False) a form posts to /api/orders without the trailing slash. The response is 200 with the list of orders and nothing is created. What happened?', [
        ['APPEND_SLASH answered 301 and the browser re-sent the call as a GET', true],
        ['DRF treats any POST without a slash as a read-only request', false],
        ['nginx converts POST to GET for paths that lack a trailing slash', false],
        ['The viewset routes POST to list() when the body is missing', false],
      ], 'CommonMiddleware redirects /api/orders to /api/orders/ with a 301, and browsers follow a 301 after a POST with a GET. The GET lists orders. Writing the slash in the client avoids the redirect.'),
    ],
  },

  /* ── CORS_CSRF ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_PY_CORS_CSRF',
    notes: `**Two different browser protections, often confused.** CORS decides whether a page from one origin
may *read* a response from another. CSRF protection stops another site from *making* a request that
rides on credentials the browser attaches by itself. You need to know when each applies, because the
cure for one does nothing for the other.

## Same origin first

An origin is scheme + host + port. With the Vite proxy in development, or nginx serving the React
build and proxying /api in production, the page and the API share one origin and CORS never comes up.
It comes up when the page is on http://localhost:5173 and the API on http://localhost:8000, or the
page on https://shop.in and the API on https://api.shop.in.

## django-cors-headers

    pip install django-cors-headers

    # settings.py
    INSTALLED_APPS += ["corsheaders"]

    MIDDLEWARE = [
        "django.middleware.security.SecurityMiddleware",
        "corsheaders.middleware.CorsMiddleware",              # high: before CommonMiddleware
        "django.contrib.sessions.middleware.SessionMiddleware",
        "django.middleware.common.CommonMiddleware",
        "django.middleware.csrf.CsrfViewMiddleware",
        "django.contrib.auth.middleware.AuthenticationMiddleware",
        # ...
    ]

    CORS_ALLOWED_ORIGINS = [o for o in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",") if o]
    # .env:  CORS_ALLOWED_ORIGINS=http://localhost:5173

CorsMiddleware must sit above any middleware that can produce its own response (CommonMiddleware's
slash redirect is one): a middleware lower down never sees a response created above it, so that
response would carry no CORS headers.

## The preflight, as django-cors-headers answers it

A JSON POST with an Authorization header is not a "simple" request, so the browser first sends:

    OPTIONS /api/products/
    Origin: http://localhost:5173
    Access-Control-Request-Method: POST
    Access-Control-Request-Headers: authorization, content-type

For an allowed origin the middleware answers 200 with (actual output):

    access-control-allow-origin: http://localhost:5173
    access-control-allow-headers: accept, authorization, content-type, user-agent, x-csrftoken, x-requested-with
    access-control-allow-methods: DELETE, GET, OPTIONS, PATCH, POST, PUT

For an origin **not** in the list it still answers 200 — but with no access-control-allow-origin. The
browser sees the header missing, reports a CORS error, and never sends the POST. Your view never runs.

Rules that save an afternoon:

- An origin has **no path and no trailing slash**. "https://shop.in/" is rejected by python manage.py
  check with corsheaders.E014 ("should not have path"); "shop.in" without a scheme with E013.
- CORS_ALLOW_ALL_ORIGINS = True is acceptable only for a truly public, read-only API.
- CORS_ALLOW_CREDENTIALS = True (and axios withCredentials: true) is needed **only** when cookies
  must travel cross-origin. A Bearer header needs neither.
- CORS protects users' browsers, not your server: curl, Postman and other servers ignore it. Your
  authentication and permissions are what protect data.

## CSRF, and why a Bearer header avoids it

CSRF works because a browser attaches cookies automatically. A page on evil.example auto-submits a
form to https://api.shop.in/api/orders/; if the user has a session cookie for api.shop.in, the
browser adds it and Django sees an authenticated request the user never meant to make.

A JWT sent as **Authorization: Bearer** is never attached by the browser. Your JavaScript adds it,
and the attacker's page cannot read your token from another origin. So JWTAuthentication does not
enforce CSRF — checked: with a CSRF-enforcing test client, a Bearer-authenticated POST returns 201.

## When DRF does check CSRF

DRF's APIView is csrf_exempt as a view; the check happens inside **SessionAuthentication**, and only
when it authenticated the request from a session cookie. The failures you will see (actual output):

    403 {"detail": "CSRF Failed: CSRF cookie not set."}
    403 {"detail": "CSRF Failed: CSRF token missing."}
    403 {"detail": "CSRF Failed: Origin checking failed - https://shop.in does not match any trusted origins."}

The surprise: with DEFAULT_AUTHENTICATION_CLASSES = [JWTAuthentication, SessionAuthentication], a
developer who is logged in to /admin/ in the same browser sends a session cookie with every call.
Any request without a Bearer header is then authenticated **by the session** — and fails CSRF.
Keep SessionAuthentication only if you need the browsable API or a session-based client, and know
this is why it bites.

## Doing session auth from React properly

If you choose sessions (some teams do, to keep tokens away from JavaScript entirely):

    # accounts/views.py
    from django.middleware.csrf import get_token
    from django.views.decorators.csrf import ensure_csrf_cookie
    from django.http import JsonResponse

    @ensure_csrf_cookie
    def csrf(request):
        return JsonResponse({"csrfToken": get_token(request)})

**Same origin** (proxy or nginx): the csrftoken cookie is readable by script (CSRF_COOKIE_HTTPONLY is
False by default, by design), and axios copies it into a header on same-origin requests when told
the names:

    export const client = axios.create({
      baseURL: '/api',
      xsrfCookieName: 'csrftoken',
      xsrfHeaderName: 'X-CSRFToken',
    });

**Cross-origin** (shop.in calling api.shop.in): script on shop.in cannot read api.shop.in's cookie,
so take the token from the JSON body of the csrf view and set X-CSRFToken yourself; set
CORS_ALLOW_CREDENTIALS = True and withCredentials: true; and list the frontend in
CSRF_TRUSTED_ORIGINS = ["https://shop.in"] — over HTTPS Django compares the Origin header with the
API's own host and rejects anything else that is not trusted.

| | Bearer JWT in a header | Session cookie |
|---|---|---|
| Sent automatically by the browser | No | Yes |
| CSRF protection needed | No | Yes: csrftoken + X-CSRFToken |
| Readable by an XSS script | If stored where script can reach it | No (httpOnly), but XSS can still make calls |
| Cross-origin setup | CORS for the Authorization header | CORS with credentials + CSRF_TRUSTED_ORIGINS |`,
    mcqs: [
      mcq('settings.py has CORS_ALLOWED_ORIGINS = ["http://localhost:5173/"]. What does python manage.py check report?', [
        ['Nothing, as the trailing slash is silently stripped when the settings load', false],
        ['A warning that localhost origins are unsafe in production', false],
        ['An error that CORS_ALLOWED_ORIGINS must be a tuple, not a list', false],
        ['An error (corsheaders.E014) that the origin should not have a path', true],
      ], 'django-cors-headers validates the setting: an origin is scheme, host and port only. The slash counts as a path, and the Origin header the browser sends would never match it anyway.'),
      mcq('The API uses only JWTAuthentication and React sends Authorization: Bearer on every call. A teammate wants CSRF tokens added to every React form. Are they needed?', [
        ['Yes; every POST that reaches Django needs a CSRF token', false],
        ['No; a forged cross-site request cannot carry that header', true],
        ['Only for PUT and DELETE, since POST is checked by CORS', false],
        ['No, because CORS already blocks every cross-site form post', false],
      ], 'CSRF depends on credentials the browser adds by itself. A Bearer header is added by your code, and another site cannot read the token to add it. CORS does not stop a plain form post from being sent.'),
      mcq('React on http://localhost:3000 sends a PUT with a JSON body to the API, whose CORS_ALLOWED_ORIGINS lists only http://localhost:5173. What does the Network tab show?', [
        ['OPTIONS 403 Forbidden, returned by django-cors-headers', false],
        ['OPTIONS 404, since the view defines no options() handler', false],
        ['OPTIONS 200 lacking an allow-origin header, then a CORS error', true],
        ['The PUT is sent and saved, and only its response is hidden', false],
      ], 'The middleware answers the preflight with 200 but omits Access-Control-Allow-Origin for an unknown origin. The browser treats that as a refusal and never sends the PUT.'),
    ],
    checkpoint: [
      mcq('DEFAULT_AUTHENTICATION_CLASSES lists JWTAuthentication and SessionAuthentication. A developer logged in to /admin/ makes a React POST before the access token is attached and gets 403 "CSRF Failed: CSRF cookie not set." Why?', [
        ['JWTAuthentication enforces CSRF whenever no token is present', false],
        ['The session cookie authenticated the call, so DRF checked CSRF', true],
        ['django-cors-headers refuses POSTs without an Authorization header', false],
      ], 'With no Bearer header JWTAuthentication returns nothing and SessionAuthentication tries next. The admin session cookie authenticates the request, and SessionAuthentication then enforces CSRF.'),
      mcq('React on https://shop.in uses session auth against https://api.shop.in. The cookie and X-CSRFToken are both sent, yet the API answers 403 "Origin checking failed - https://shop.in does not match any trusted origins." Which setting is missing?', [
        ['CORS_ALLOWED_ORIGINS = ["https://shop.in"]', false],
        ['ALLOWED_HOSTS = ["shop.in", "api.shop.in"]', false],
        ['CSRF_TRUSTED_ORIGINS = ["https://shop.in"]', true],
        ['CSRF_COOKIE_HTTPONLY = True on the API', false],
      ], 'For HTTPS requests Django\'s CSRF check compares the Origin header with the API\'s own origin. A different origin passes only if it is in CSRF_TRUSTED_ORIGINS; CORS settings play no part in this check.'),
      mcq('A same-origin React app uses session auth. Which axios configuration makes it send the token Django expects?', [
        ["headers: { 'X-CSRF-Token': document.cookie } on every call", false],
        ["xsrfCookieName: 'sessionid', xsrfHeaderName: 'Cookie'", false],
        ["withCredentials: false, so cookies are not mixed into calls", false],
        ["xsrfCookieName: 'csrftoken', xsrfHeaderName: 'X-CSRFToken'", true],
      ], 'Django sets the csrftoken cookie and reads the X-CSRFToken header. On same-origin requests axios reads the named cookie and copies it into the named header; document.cookie is every cookie, not the token.'),
    ],
  },

  /* ── JWT_LOGIN_FLOW ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_PY_JWT_LOGIN_FLOW',
    notes: `**The login flow has two tokens and six moving parts.** Simple JWT (from the Django auth topic)
issues a short-lived **access** token and a longer-lived **refresh** token. React keeps them, sends
the access token, swaps the refresh token for a new access token when the old one expires, guards
screens, and logs out when the refresh itself fails.

## 1. What the Django side gives you

    # accounts/urls.py
    from rest_framework_simplejwt.views import (
        TokenBlacklistView, TokenObtainPairView, TokenRefreshView)
    from .views import MeView

    urlpatterns = [
        path("token/", TokenObtainPairView.as_view()),          # POST /api/auth/token/
        path("token/refresh/", TokenRefreshView.as_view()),     # POST /api/auth/token/refresh/
        path("logout/", TokenBlacklistView.as_view()),          # POST /api/auth/logout/
        path("me/", MeView.as_view()),                          # GET  /api/auth/me/
    ]

    # SIMPLE_JWT: ACCESS_TOKEN_LIFETIME 15 minutes, REFRESH_TOKEN_LIFETIME 7 days,
    # ROTATE_REFRESH_TOKENS and BLACKLIST_AFTER_ROTATION on, token_blacklist installed.

What React receives (actual responses):

    POST /api/auth/token/  good password   → 200 {"access": "eyJ...", "refresh": "eyJ..."}
    POST /api/auth/token/  wrong password  → 401 {"detail": "No active account found with the given credentials"}
    any view, no Authorization header      → 401 {"detail": "Authentication credentials were not provided."}
                                             + WWW-Authenticate: Bearer realm="api"
    any view, expired or forged access     → 401 {"detail": "Given token not valid for any token type",
                                                  "code": "token_not_valid", "messages": [...]}
    POST /api/auth/token/refresh/ bad token→ 401 {"detail": "Token is invalid", "code": "token_not_valid"}
    the same, with a rotated-out refresh   → 401 {"detail": "Token is blacklisted", "code": "token_not_valid"}

Unauthenticated requests are **401** because the first authentication class, JWTAuthentication,
supplies a WWW-Authenticate header. With SessionAuthentication first the same request is **403**,
and an interceptor that waits for 401 never fires. Know which class is first.

The access token's payload holds a user_id, not the user's name or roles; ask the API:

    class MeView(APIView):
        permission_classes = [IsAuthenticated]
        def get(self, request):
            u = request.user
            return Response({"id": u.id, "username": u.username, "is_staff": u.is_staff,
                             "groups": list(u.groups.values_list("name", flat=True))})

## 2. Where the tokens live — the honest trade-off

| Where | Survives a reload | An XSS script can… | CSRF exposure |
|---|---|---|---|
| Memory (a module variable, Redux) | No | call the API while the page is open, but not carry the token away after | None |
| localStorage | Yes | **read the token and use it from anywhere until it expires** | None |
| httpOnly cookie | Yes | not read it, but still make calls from the page | **Yes** — sent automatically |

No option survives XSS: a script running in your page can always act as the user while the page is
open. What differs is whether it can **steal a long-lived credential**. The arrangement this topic
uses:

- **Access token in memory only.** It lives 15 minutes and disappears on reload.
- **Refresh token in localStorage** for the project — simple, and stated as a known risk: an XSS bug
  can steal a 7-day credential. Rotation plus the blacklist limit how long a stolen one is useful.
- **The stronger option: refresh token in an httpOnly cookie.** Two small views move it out of reach
  of script (checked with Simple JWT 5.5):

    REFRESH_COOKIE = dict(max_age=7 * 24 * 3600, httponly=True, secure=True,
                          samesite="Strict", path="/api/auth/")

    class CookieTokenObtainView(TokenObtainPairView):
        def post(self, request, *args, **kwargs):
            response = super().post(request, *args, **kwargs)
            if response.status_code == 200:
                response.set_cookie("refresh", response.data.pop("refresh"), **REFRESH_COOKIE)
            return response

    class CookieTokenRefreshView(TokenRefreshView):
        def post(self, request, *args, **kwargs):
            serializer = self.get_serializer(data={"refresh": request.COOKIES.get("refresh", "")})
            try:
                serializer.is_valid(raise_exception=True)
            except TokenError as e:                  # without this a bad cookie is a 500
                raise InvalidToken(e.args[0])
            data = serializer.validated_data
            response = Response({"access": data["access"]})
            if "refresh" in data:                    # ROTATE_REFRESH_TOKENS issued a new one
                response.set_cookie("refresh", data["refresh"], **REFRESH_COOKIE)
            return response

  Cross-origin, this needs CORS_ALLOW_CREDENTIALS and withCredentials, and SameSite=Strict only works
  when the frontend and API are the **same site** (shop.in and api.shop.in are; two different
  platform domains are not — see the Deploy unit).

## 3. One token store, one client, two interceptors

    // src/api/tokenStore.js
    let access = null;
    export const tokenStore = {
      getAccess: () => access,
      getRefresh: () => localStorage.getItem('refresh'),
      set(newAccess, newRefresh) {
        access = newAccess;
        if (newRefresh) localStorage.setItem('refresh', newRefresh);
      },
      clear() { access = null; localStorage.removeItem('refresh'); },
    };

    // src/api/client.js
    const API = import.meta.env.VITE_API_URL;
    export const client = axios.create({ baseURL: API, timeout: 10000 });

    let onSessionExpired = () => {};
    export const setSessionExpiredHandler = fn => { onSessionExpired = fn; };

    client.interceptors.request.use(config => {
      const access = tokenStore.getAccess();
      if (access) config.headers.Authorization = 'Bearer ' + access;
      return config;
    });

    let refreshing = null;                 // the one refresh in flight, shared by every 401
    export function refreshAccess() {
      if (!refreshing) {
        refreshing = axios.post(API + '/auth/token/refresh/', { refresh: tokenStore.getRefresh() })
          .then(({ data }) => {
            tokenStore.set(data.access, data.refresh ?? tokenStore.getRefresh());
            return data.access;
          })
          .finally(() => { refreshing = null; });
      }
      return refreshing;
    }

    client.interceptors.response.use(response => response, async error => {
      const original = error.config;
      const isAuthCall = original?.url?.startsWith('/auth/');
      if (error.response?.status !== 401 || isAuthCall || original._retry) {
        return Promise.reject(error);
      }
      original._retry = true;
      try {
        const access = await refreshAccess();
        original.headers.Authorization = 'Bearer ' + access;
        return client(original);           // the original request, once more
      } catch (refreshError) {
        tokenStore.clear();
        onSessionExpired();                // dispatch(loggedOut()); the guard sends them to /login
        return Promise.reject(refreshError);
      }
    });

Each line is there for a reason:

- **The shared refreshing promise is the queue.** Three requests that fail together all await the
  same promise: one refresh call, then all three retried with the new token.
- **The refresh uses plain axios**, not client, so it carries no stale Bearer header and cannot
  trigger this interceptor again.
- **isAuthCall** keeps the login form's own 401 ("No active account found…") with the form.
- **_retry** stops a loop: a request that fails again after a fresh token is a real 401.
- **onSessionExpired runs once per failed request** — make the logout action idempotent.

## 4. Logging in, and restoring the session on reload

    export async function login(username, password) {
      const { data } = await client.post('/auth/token/', { username, password });
      tokenStore.set(data.access, data.refresh);
      const me = await client.get('/auth/me/');
      return me.data;
    }

    // main.jsx, before the first render of protected routes
    async function bootstrapAuth() {
      if (!tokenStore.getRefresh()) return store.dispatch(authChecked(null));
      try {
        await refreshAccess();
        const me = await client.get('/auth/me/');
        store.dispatch(authChecked(me.data));
      } catch {
        tokenStore.clear();
        store.dispatch(authChecked(null));
      }
    }

The auth slice starts with status 'checking'; authChecked sets the user (or null) and status 'ready'.

## 5. Guarding screens

    function RequireAuth({ staffOnly = false }) {
      const { status, user } = useSelector(s => s.auth);
      const location = useLocation();
      if (status === 'checking') return <Spinner />;
      if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
      if (staffOnly && !user.is_staff) return <Navigate to="/forbidden" replace />;
      return <Outlet />;
    }

Without the 'checking' state the guard redirects to /login during the split second the refresh is
running. And remember: this is **user experience, not security**. The API's permission classes
(IsAdminUser, your own has_permission) are what protect data.

## 6. Logout and 403

    export async function logout() {
      try { await axios.post(API + '/auth/logout/', { refresh: tokenStore.getRefresh() }); }
      finally { tokenStore.clear(); store.dispatch(loggedOut()); }
    }

Blacklisting kills the **refresh** token. An access token already issued stays valid until its exp —
which is why it should live minutes, not days. A **403** ("You do not have permission to perform this
action.") means the token is fine and the permission is not; show a no-access message, never log out.

## Common mistakes

- Refreshing on the login call's 401, so a wrong password turns into a refresh attempt.
- Every expired request starting its own refresh; with rotation, the second one replays a refresh
  token the first just blacklisted, and the user is logged out at random.
- Using client for the refresh call, so its 401 re-enters the interceptor.
- No 'checking' state, so every reload flashes the login page.
- Logging out on 403.`,
    workedExample: `**Goal: watch the interceptor handle an expired token, three requests at once, and then a dead
refresh token.** This is the actual log from running the client above in node against a fake API
(access A1 expired; the refresh endpoint issues A2):

    GET /orders/    Bearer A1      → 401 token_not_valid
    GET /products/  Bearer A1      → 401 token_not_valid
    GET /me/        Bearer A1      → 401 token_not_valid
    POST /api/auth/token/refresh/  → 200 {"access": "A2"}      ← one refresh, not three
    GET /orders/    Bearer A2      → 200
    GET /products/  Bearer A2      → 200
    GET /me/        Bearer A2      → 200

**Trace it.** The dashboard mounts three components; each calls the API with A1. All three 401s
reach the response interceptor. The first calls refreshAccess(), which stores the promise in
refreshing; the second and third find it already set and await the same promise. When it resolves,
the token store holds A2, and each interceptor re-sends its original request with
Authorization: Bearer A2 and _retry = true. The components never knew.

**Now the refresh token is dead** (blacklisted after logout in another tab, or past its 7 days):

    GET /orders/    Bearer A2      → 401
    GET /products/  Bearer A2      → 401
    POST /api/auth/token/refresh/  → 401 {"detail": "Token is blacklisted", "code": "token_not_valid"}
    both requests reject with that 401; tokens cleared; onSessionExpired called twice

The refresh promise rejects, so both interceptors land in catch: clear the store, call
onSessionExpired (dispatching loggedOut twice is harmless if the reducer just resets state), and
reject. RequireAuth sees user = null and renders Navigate to /login with state.from. After a
successful login the form does navigate(location.state?.from?.pathname || '/', { replace: true }).

**And the wrong password.** client.post('/auth/token/', ...) returns 401. isAuthCall is true, so the
interceptor rejects at once — no refresh call was made (checked: refresh count 0) — and the form
shows "No active account found with the given credentials" or your friendlier wording.

**What would break without each guard.** Remove the shared promise and three refreshes go out; with
ROTATE_REFRESH_TOKENS and the blacklist, the second and third send a refresh token the first just
rotated out and get "Token is blacklisted", logging the user out although nothing was wrong. Remove
_retry and an endpoint that always returns 401 (a misconfigured permission) loops: refresh, retry,
401, refresh…`,
    mcqs: [
      mcq('A dashboard mounts three components while the access token is expired. With the shared refreshing promise in the interceptor, how many POSTs reach /api/auth/token/refresh/?', [
        ['Three, one for each failed request, sent in parallel', false],
        ['None; axios retries each request with the old token', false],
        ['Two, since the first request never needs a refresh', false],
        ['One; the other two 401s await the same promise', true],
      ], 'The first 401 starts the refresh and stores its promise; later 401s find it and wait on it. All three requests are then retried with the one new access token.'),
      mcq('An interceptor refreshes on every 401, including the one from POST /api/auth/token/ when the password is wrong. What does the user experience?', [
        ['The wrong-password message is lost behind a refresh attempt', true],
        ['Django locks the account after the refresh call is rejected', false],
        ['The login succeeds using the previous user\'s refresh token', false],
      ], 'A wrong password is a legitimate 401 meant for the form. Treating it as an expired session triggers a refresh (which fails or uses stale data) and the form never shows the real message.'),
      mcq('React calls a DRF view without a token and gets 401 with WWW-Authenticate: Bearer realm="api". A classmate\'s API returns 403 in the same situation. What is the difference?', [
        ['Their view has had the IsAuthenticated permission removed from it', false],
        ['Their first authentication class is SessionAuthentication', true],
        ['Their Simple JWT access lifetime is set much longer', false],
        ['Their CORS settings turn every 401 from the API into a 403 instead', false],
      ], 'DRF answers 401 only when the first authentication class provides a WWW-Authenticate header. SessionAuthentication provides none, so the same failure becomes 403 — and a 401-based interceptor never fires.'),
    ],
    checkpoint: [
      mcq('On reload the access token is gone but a refresh token is in localStorage. RequireAuth redirects to /login before the start-up refresh finishes. What is the fix?', [
        ['Move the refresh call into the login form\'s submit handler', false],
        ["Hold a 'checking' status and show a spinner until it settles", true],
        ['Redirect to /login and come back once the refresh completes', false],
        ['Raise ACCESS_TOKEN_LIFETIME so a refresh is rarely needed', false],
      ], 'The guard must distinguish "not logged in" from "not known yet". A checking status set at start and cleared by the bootstrap refresh stops the premature redirect.'),
      mcq('The refresh call fails with 401 {"detail": "Token is blacklisted"}. What should the response interceptor do?', [
        ['Retry the refresh with the same token until it is accepted', false],
        ['Re-send the original request with the expired access token', false],
        ['Clear both tokens and let the guard send the user to login', true],
      ], 'A blacklisted refresh token can never work again, so the session is over. Clearing the store and letting RequireAuth redirect is the only path that gets the user a valid session.'),
      mcq('After logout, React clears both tokens and the refresh token is blacklisted. A copied access token still works with curl for several more minutes. Why?', [
        ['The blacklist takes several minutes to reach the database', false],
        ['curl requests skip JWTAuthentication unless told otherwise', false],
        ['Logout only affects the tokens that were used from the same browser tab', false],
        ['An access token stays valid until exp; only refresh is blacklisted', true],
      ], 'Simple JWT checks an access token\'s signature and expiry, not the blacklist. That is why access tokens are kept short — 15 minutes limits what a copied one can do.'),
    ],
  },

  /* ── FILE_UPLOAD ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_PY_FILE_UPLOAD',
    notes: `**A file upload is a multipart/form-data request: several named parts in one body, separated by
a boundary string the browser chooses.** One part holds the file's bytes; others can be ordinary
fields. Django parses it, DRF validates it, and a storage backend decides where the bytes end up.

## The model and the serializer

    # profiles/models.py
    from pathlib import Path
    from uuid import uuid4

    def avatar_path(instance, filename):
        return f"avatars/{instance.user_id}/{uuid4().hex}{Path(filename).suffix.lower()}"

    class Profile(models.Model):
        user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
        avatar = models.ImageField(upload_to=avatar_path, blank=True)

ImageField needs **Pillow** (pip install Pillow). The generated name means a user cannot choose the
path, overwrite someone else's file or leak their own file name.

    # profiles/serializers.py
    from django.core.validators import FileExtensionValidator

    MAX_AVATAR = 2 * 1024 * 1024

    class AvatarSerializer(serializers.ModelSerializer):
        avatar = serializers.ImageField(
            validators=[FileExtensionValidator(["jpg", "jpeg", "png", "webp"])])

        class Meta:
            model = Profile
            fields = ["avatar"]

        def validate_avatar(self, f):
            if f.size > MAX_AVATAR:
                raise serializers.ValidationError("Max 2 MB.")
            return f

Three different checks, each catching something the others miss:

- **ImageField** opens the bytes with Pillow and rejects anything that is not a readable image:
  "Upload a valid image. The file you uploaded was either not an image or a corrupted image."
- **FileExtensionValidator** limits the formats you accept: "File extension “gif” is not allowed.
  Allowed extensions are: jpg, jpeg, png, webp."
- **f.size** is counted from the bytes that arrived, so it can be trusted. f.content_type on a
  plain FileField is whatever the client claimed — never trust it alone. For a PDF on a FileField,
  check the first bytes: f.read(5) == b"%PDF-", then f.seek(0).

## The view

    class AvatarView(generics.UpdateAPIView):
        serializer_class = AvatarSerializer
        parser_classes = [MultiPartParser, FormParser]
        permission_classes = [IsAuthenticated]

        def get_object(self):
            return self.request.user.profile

    # PATCH /api/me/avatar/

DRF's default parsers already include MultiPartParser; listing them on the view makes the contract
explicit, and a JSON body sent here gets 415 {"detail": "Unsupported media type \\"application/json\\" in request."}.
Other answers you will see (actual output): no file part → 400 {"avatar": ["No file was submitted."]};
a string instead of a file → 400 {"avatar": ["The submitted data was not a file. Check the encoding
type on the form."]}.

Because generic views pass the request into the serializer context, the response's avatar is an
**absolute URL** (http://host/media/avatars/7/3f2c….png), ready for an img src.

## The React side

    function AvatarForm() {
      const [file, setFile] = useState(null);
      const [progress, setProgress] = useState(0);
      const [error, setError] = useState(null);

      async function onSubmit(e) {
        e.preventDefault();
        if (!file) return setError('Choose an image');
        if (file.size > 2 * 1024 * 1024) return setError('Max 2 MB');   // fast feedback only
        const form = new FormData();
        form.append('avatar', file);                  // the name the serializer expects
        try {
          const { data } = await client.patch('/me/avatar/', form, {
            onUploadProgress: ev => setProgress(Math.round(100 * ev.loaded / (ev.total || 1))),
          });
          dispatch(avatarChanged(data.avatar));
        } catch (err) {
          setError(err.response?.data?.avatar?.join(' ') || 'Upload failed, try again');
        }
      }

      return (
        <form onSubmit={onSubmit}>
          <input type="file" accept="image/png,image/jpeg,image/webp"
                 onChange={e => setFile(e.target.files[0] ?? null)} />
          {progress > 0 && <progress value={progress} max="100" />}
          {error && <p className="text-danger">{error}</p>}
          <button disabled={!file}>Upload</button>
        </form>
      );
    }

**Do not set Content-Type yourself.** The browser writes multipart/form-data *with the boundary*.
Set the header by hand (common with fetch) and the boundary is missing; DRF answers
400 {"detail": "Multipart form parse error - Invalid boundary in multipart: None"}. axios removes a
Content-Type you set for FormData in the browser, which is why the same mistake "works" with axios
and fails with fetch. The accept attribute and the size check are convenience; the server's checks
are the ones that count.

## Django's size settings — what they do and do not limit

| Setting | Default | What it really does |
|---|---|---|
| FILE_UPLOAD_MAX_MEMORY_SIZE | 2.5 MB | The **threshold** above which an upload is streamed to a temporary file (TemporaryUploadedFile) instead of kept in memory (InMemoryUploadedFile). It rejects nothing. |
| DATA_UPLOAD_MAX_MEMORY_SIZE | 2.5 MB | The cap on the request body **excluding file data** — the other form fields, or a JSON body. Over it: 400 (RequestDataTooBig). |

Both behaviours were checked: with the threshold at 1 KB a 5 KB file arrived as a
TemporaryUploadedFile; with the data cap at 1 KB a 50 KB **file** was accepted while a 5 KB text field
got a 400. So **Django has no built-in maximum file size**: your serializer enforces it, and in
production the web server in front caps the whole body (nginx's client_max_body_size defaults to
1 MB and answers 413 with its own HTML page).

## Where the files go

    # settings.py
    MEDIA_URL = "media/"
    MEDIA_ROOT = BASE_DIR / "media"

    # config/urls.py — development only
    from django.conf import settings
    from django.conf.urls.static import static
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

static() serves files only while DEBUG is True. In production:

- **One server or docker compose:** MEDIA_ROOT on a **volume** (a container's own filesystem is
  thrown away when it is replaced), served by nginx from that volume.
- **A platform or several API containers:** **object storage** (S3, or an S3-compatible service)
  through django-storages, configured as the "default" entry of STORAGES. Every container reads and
  writes the same bucket; private files are served with short-lived signed URLs.

Django does **not** delete the old file when a FileField is replaced or its row is deleted. Delete it
yourself (for example in the view after a successful save) or clean up with a periodic job.`,
    mcqs: [
      mcq('A fetch() upload sets headers: { "Content-Type": "multipart/form-data" } and sends a FormData body. DRF replies 400 "Multipart form parse error - Invalid boundary in multipart: None". What is the fix?', [
        ['Add MultiPartParser to the view so that it can read boundaries', false],
        ['Remove the header so the browser adds one with the boundary', true],
        ['Change the header to application/x-www-form-urlencoded', false],
        ['Raise DATA_UPLOAD_MAX_MEMORY_SIZE so that the boundary fits', false],
      ], 'The boundary is part of the Content-Type header and only the browser knows it. Setting the header by hand drops it, so Django cannot split the parts. Leave the header to the browser.'),
      mcq('FILE_UPLOAD_MAX_MEMORY_SIZE is left at its default and a user uploads a 6 MB photo to an ImageField with no size check in the serializer. What happens?', [
        ['Django streams it to a temporary file, and nothing rejects it', true],
        ['Django rejects it with 413 because it exceeds the 2.5 MB value', false],
        ['DRF truncates it to 2.5 MB and saves the partial image', false],
      ], 'That setting only decides memory versus a temporary file. Without your own size check (and a body limit in the web server) a 6 MB file is accepted and stored.'),
      mcq('A PDF upload uses serializers.FileField. In validate_document, which value is simply what the client claimed and proves nothing about the bytes?', [
        ['f.size, the number of bytes Django received', false],
        ['f.read(5), compared with b"%PDF-" before seek(0)', false],
        ['f.content_type, such as "application/pdf"', true],
      ], 'content_type comes from the part\'s header, which any client can set. The size is measured by Django and the leading bytes are the file itself, so those can be checked.'),
    ],
    checkpoint: [
      mcq('To cap uploads, a developer sets DATA_UPLOAD_MAX_MEMORY_SIZE to 1 MB. A 50 MB video sent as a file part is still accepted. Why?', [
        ['The setting excludes file data and limits only the other fields', true],
        ['The value is read in megabytes, so 1 means 1 GB in practice', false],
        ['MultiPartParser ignores settings that the view does not repeat', false],
        ['The limit applies only when DEBUG is False in production', false],
      ], 'DATA_UPLOAD_MAX_MEMORY_SIZE guards against huge non-file bodies. File parts are not counted, so file size must be checked in the serializer and capped by the web server.'),
      mcq('A user changes their avatar three times. MEDIA_ROOT/avatars/7/ now holds three image files. Why?', [
        ['upload_to keeps a history of every file for rollback', false],
        ['MultiPartParser caches each upload on disk for reuse', false],
        ['Django never deletes the old file when a FileField changes', true],
        ['Each PATCH creates a brand-new Profile row for every uploaded file', false],
      ], 'Django removes neither the replaced file nor the file of a deleted row; the field only stores a new name. Deleting the previous file is the application\'s job.'),
      mcq('The API runs as two containers behind a load balancer. Where should uploaded avatars be stored?', [
        ['In MEDIA_ROOT inside each container\'s own filesystem', false],
        ['In the STATIC_ROOT folder that collectstatic fills', false],
        ['In the React build directory that nginx serves', false],
        ['In object storage that both containers read and write', true],
      ], 'A file written inside one container is invisible to the other and lost when that container is replaced. Shared object storage gives every instance the same files and survives redeploys.'),
    ],
  },

  /* ── ERRORS_ACROSS ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_PY_ERRORS_ACROSS',
    notes: `**Every failure the user can meet must end as a sensible message in the right place.** A field
error under its input; a form-level error at the top; a lost connection with a Retry button; nothing
that is a stack trace or an HTML page dumped into a div. That needs one agreement between the halves
about what errors look like, and one function in React that reads them.

## DRF's error shapes (actual output)

    400 {"name": ["Ensure this field has no more than 20 characters."],
         "price": ["This field is required."]}                         ← field errors
    400 {"non_field_errors": ["Sale price must be below the price."]}   ← raised in validate()
    400 ["Coupon has expired."]                                          ← ValidationError raised in a view
    400 {"items": {"1": {"qty": ["Ensure this value is greater than or equal to 1."]}}}
                                                                         ← nested list: keyed by index
    401 {"detail": "Authentication credentials were not provided."}
    403 {"detail": "You do not have permission to perform this action."}
    404 {"detail": "No Product matches the given query."}
    415 {"detail": "Unsupported media type \\"application/json\\" in request."}

And three that are **not** DRF JSON at all:

- an unhandled exception: Django's 500 page, text/html (with DEBUG off, a page titled
  "Server Error (500)");
- a body too large for nginx: nginx's own 413 HTML page;
- no response at all: the server is down, the network dropped, a CORS check failed, or the request
  timed out.

## One reader in React

    // src/api/errors.js
    export function parseApiError(error) {
      if (!error.response) {
        return { form: 'Could not reach the server. Check your connection and try again.', fields: {} };
      }
      const { status, data } = error.response;
      if (Array.isArray(data)) return { form: data.join(' '), fields: {} };
      if (!data || typeof data !== 'object') {
        return { form: 'Something went wrong (' + status + '). Please try again.', fields: {} };
      }
      const { detail, non_field_errors, code, messages, ...rest } = data;
      const fields = {};
      for (const [name, value] of Object.entries(rest)) {
        fields[name] = Array.isArray(value) && value.every(v => typeof v === 'string')
          ? value.join(' ')
          : value;                                    // nested errors stay structured
      }
      const form = detail ?? non_field_errors?.join(' ') ?? null;
      return { form, fields };
    }

Run against the bodies above in node, it returns:

    field errors    → { form: null, fields: { name: 'Ensure this field…', price: 'This field is required.' } }
    non_field       → { form: 'Sale price must be below the price.', fields: {} }
    bare list       → { form: 'Coupon has expired.', fields: {} }
    403             → { form: 'You do not have permission to perform this action.', fields: {} }
    nginx 413 HTML  → { form: 'Something went wrong (413). Please try again.', fields: {} }
    no response     → { form: 'Could not reach the server. Check your connection and try again.', fields: {} }

code and messages are dropped from the fields because Simple JWT adds them next to detail.

## Using it in a form

    function ProductForm({ initial, onSaved }) {
      const [values, setValues] = useState(initial);
      const [errors, setErrors] = useState({ form: null, fields: {} });
      const [saving, setSaving] = useState(false);

      async function onSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setErrors({ form: null, fields: {} });
        try {
          onSaved(await productsApi.create(values));
        } catch (err) {
          setErrors(parseApiError(err));               // values are left exactly as typed
        } finally {
          setSaving(false);
        }
      }

      return (
        <form onSubmit={onSubmit} noValidate>
          {errors.form && <div className="alert alert-danger">{errors.form}</div>}
          <input name="name" value={values.name}
                 onChange={e => setValues({ ...values, name: e.target.value })}
                 className={errors.fields.name ? 'form-control is-invalid' : 'form-control'} />
          {errors.fields.name && <div className="invalid-feedback">{errors.fields.name}</div>}
          {/* price, sale_price the same way */}
          <button disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </form>
      );
    }

The serializer's field names are the form's input names, so a message lands under its input with no
mapping table. Client-side checks (required, min) give instant feedback; the server's answer is the
one that decides.

## Optional: one shape from the server

If you prefer every error body to look the same, DRF lets you replace the exception handler:

    # config/exceptions.py
    from rest_framework.views import exception_handler

    def api_exception_handler(exc, context):
        response = exception_handler(exc, context)
        if response is None:
            return None                                 # not a DRF error: Django's 500
        data = response.data
        if isinstance(data, list):
            body = {"detail": " ".join(map(str, data)), "errors": {}}
        elif "detail" in data:
            body = {"detail": str(data["detail"]), "errors": {}}
        else:
            errors = dict(data)
            non_field = errors.pop("non_field_errors", [])
            body = {"detail": " ".join(map(str, non_field)) or "Please correct the highlighted fields.",
                    "errors": errors}
        response.data = body
        return response

    # settings.py
    REST_FRAMEWORK = {..., "EXCEPTION_HANDLER": "config.exceptions.api_exception_handler"}

Checked output: a field error becomes {"detail": "Please correct the highlighted fields.", "errors":
{"name": [...], "price": [...]}}, and a 404 becomes {"detail": "No Group matches the given query.",
"errors": {}}. Either approach is fine; mixing them is not — pick one contract and write it down.

## Failures with no response

axios rejects with error.response undefined, and error.code tells you why: 'ECONNABORTED' after the
client's timeout, 'ERR_CANCELED' for an AbortController you cancelled (ignore it — the user navigated
away), and in the browser 'ERR_NETWORK' for everything else — **including a CORS refusal**, which the
browser deliberately hides from script. Keep the typed values, say what happened, and offer Retry.

## The 500 that must not leak

Never return str(exception) or a traceback in a response. Let Django log it (the LOGGING setting, or
your platform's log viewer) and show the user a calm message. With DEBUG = True the 500 page contains
your settings and code; that is exactly why DEBUG must be off in production.`,
    mcqs: [
      mcq('A view raises serializers.ValidationError("Coupon has expired.") directly, not from a serializer. What body does React receive with the 400?', [
        ['{"detail": "Coupon has expired."}, as one string', false],
        ['["Coupon has expired."], a bare JSON list', true],
        ['{"non_field_errors": ["Coupon has expired."]}', false],
        ['{"error": "Coupon has expired.", "status": 400}', false],
      ], 'Outside a serializer there is no field to attach the message to, so DRF renders the error as a list. A parser that only looks for detail or field keys shows nothing for it.'),
      mcq('parseApiError receives an error where error.response is undefined and error.code is "ERR_NETWORK". Which explanation fits?', [
        ['DRF returned 400 with errors for several fields', false],
        ['The access token expired and the refresh that followed it then failed', false],
        ['The request was cancelled by the AbortController', false],
        ['The API is unreachable, or a CORS check hid the response', true],
      ], 'Any HTTP status, even 401 or 500, arrives as error.response. No response means nothing readable came back: the server is down, the network failed, or the browser blocked it for CORS. A cancel is ERR_CANCELED.'),
      mcq('A serializer\'s validate() raises ValidationError("Sale price must be below the price."). Where is the message in the 400 body?', [
        ['Under non_field_errors, as a list of strings', true],
        ['Under detail, as a single string', false],
        ['Under the first field the serializer declares', false],
      ], 'Errors from validate() belong to no single field, so DRF files them under non_field_errors (the NON_FIELD_ERRORS_KEY setting). Show them at the top of the form.'),
    ],
    checkpoint: [
      mcq('An order with three items fails validation with {"items": {"1": {"qty": ["Ensure this value is greater than or equal to 1."]}}}. What does the key "1" mean?', [
        ['The first item failed, since DRF counts from 1', false],
        ['The item with primary key 1 in the database', false],
        ['The second item failed; valid items are left out', true],
        ['One item failed, and DRF does not say which', false],
      ], 'DRF reports a nested list\'s errors keyed by the item\'s position, counting from 0, and leaves out items that passed. The form can mark the second row\'s quantity input.'),
      mcq('The custom exception handler returns None for an unexpected KeyError in a view. With DEBUG = False, what does React receive?', [
        ['{"detail": "KeyError"} with a status of 400', false],
        ["Django's 500 response, an HTML page, not JSON", true],
        ['A 200 with an empty body, as the view returned nothing', false],
      ], 'Returning None tells DRF the exception is not an API error, so it propagates and Django renders its 500 page. React must not assume every error body is JSON.'),
      mcq('The API is stopped and a user submits a long product form. The component resets every field in its finally block, so the typed values vanish. What is the better behaviour?', [
        ['Reload the page so that the form starts again cleanly', false],
        ['Reset only after success; keep values and offer Retry', true],
        ['Store the values in localStorage, then clear the form', false],
        ['Disable the form until the server answers a health ping', false],
      ], 'A failed save should cost the user nothing. Clearing on success only, and keeping the values with a clear message and Retry on failure, lets them submit again when the API is back.'),
    ],
  },

  /* ── DOCKER ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_PY_DOCKER',
    notes: `**In production nothing runs on runserver or the Vite dev server.** The API runs under
**Gunicorn**, a WSGI server with several worker processes; the React app is a folder of static files
from npm run build; **nginx** serves those files and forwards /api/ to Gunicorn. docker compose runs
all of it, plus MySQL, with one command. (Gunicorn does not run on Windows; inside Linux containers
that does not matter.)

## The layout

    shop/
    ├── backend/      Django project (config/, apps, manage.py, requirements.txt, Dockerfile, entrypoint.sh)
    ├── frontend/     Vite React app (src/, package.json, Dockerfile, nginx.conf)
    ├── compose.yaml
    ├── .env          real values — in .gitignore
    └── .env.example  every variable with a placeholder — committed

## Gunicorn: workers

    gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 60 --access-logfile -

- **Workers** are separate processes. With the default **sync** worker each handles one request at a
  time, so three workers serve three requests at once. Gunicorn's documentation suggests
  (2 × CPU cores) + 1 as a starting point; measure, then adjust.
- **--timeout** (default 30 seconds) kills a worker silent for longer. A view that calls a slow
  service for 40 seconds gets its worker killed ("WORKER TIMEOUT" in the log) and the client a 502
  from nginx. Fix the slow call (timeouts on outbound requests, background jobs) before raising it.
- Logs go to stdout and stderr, which is where docker compose logs and every platform look.

## Static files: collectstatic and WhiteNoise

The admin and DRF's browsable API need CSS and JS. runserver serves them only with DEBUG on; in
production run collectstatic and serve STATIC_ROOT. The simplest way inside the API container is
**WhiteNoise**:

    # settings.py
    STATIC_URL = "static/"
    STATIC_ROOT = BASE_DIR / "staticfiles"
    MIDDLEWARE = [
        "django.middleware.security.SecurityMiddleware",
        "whitenoise.middleware.WhiteNoiseMiddleware",      # right after SecurityMiddleware
        "corsheaders.middleware.CorsMiddleware",
        # ...
    ]
    STORAGES = {
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
    }

(The alternative is a shared volume that nginx serves at /static/. Either works; WhiteNoise keeps the
API image self-contained.) Without STATIC_ROOT, collectstatic stops with ImproperlyConfigured:
"You're using the staticfiles app without having set the STATIC_ROOT setting to a filesystem path."

## The API image

    # backend/Dockerfile
    FROM python:3.12-slim
    ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
    WORKDIR /app
    RUN apt-get update \\
     && apt-get install -y --no-install-recommends build-essential pkg-config default-libmysqlclient-dev \\
     && rm -rf /var/lib/apt/lists/*
    COPY requirements.txt .
    RUN pip install --no-cache-dir -r requirements.txt     # django, djangorestframework, ..., mysqlclient, gunicorn, whitenoise
    COPY . .
    RUN DJANGO_SECRET_KEY=collectstatic-only DB_NAME=x DB_USER=x DB_PASSWORD=x \\
        python manage.py collectstatic --noinput
    RUN useradd --create-home app && chown -R app /app
    USER app
    EXPOSE 8000
    ENTRYPOINT ["./entrypoint.sh"]
    CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "60"]

- mysqlclient compiles against the MySQL client headers, hence the apt line.
- **Copy requirements.txt before the code** so the slow pip layer is cached until dependencies change.
- **collectstatic runs at build time with dummy values**: settings.py reads os.environ["DJANGO_SECRET_KEY"]
  and the DB variables on import, and an image must never contain the real ones. collectstatic does
  not connect to the database, so dummies are enough.
- PYTHONUNBUFFERED makes print and logging appear in docker logs immediately.
- A .dockerignore (.git, .env, __pycache__, media/, .venv) keeps secrets and junk out of the image.

## Migrations on release

    #!/bin/sh
    # backend/entrypoint.sh  (chmod +x)
    set -e
    if [ "\${RUN_MIGRATIONS:-0}" = "1" ]; then
      python manage.py migrate --noinput
    fi
    exec "$@"

Migrations are a **release step**: run once per deploy, before the new code serves traffic. Running
them in every container's start-up races when you have several, and RUN migrate in the Dockerfile is
impossible (there is no database at build time). Here compose sets RUN_MIGRATIONS=1 on the single
API service; on a platform use its release (pre-deploy) command, or docker compose run --rm api
python manage.py migrate on a server. exec "$@" hands PID 1 to Gunicorn so it receives stop signals.

## The frontend image and nginx

    # frontend/Dockerfile
    FROM node:22-alpine AS build
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci
    COPY . .
    ARG VITE_API_URL=/api
    ENV VITE_API_URL=$VITE_API_URL
    RUN npm run build

    FROM nginx:1.27-alpine
    COPY nginx.conf /etc/nginx/conf.d/default.conf
    COPY --from=build /app/dist /usr/share/nginx/html

    # frontend/nginx.conf
    server {
      listen 80;
      client_max_body_size 5m;                  # above the largest upload the API accepts

      root /usr/share/nginx/html;

      location / {
        try_files $uri $uri/ /index.html;       # SPA fallback: /orders/42 gets index.html
      }

      location ~ ^/(api|admin|static)/ {
        proxy_pass http://api:8000;             # no URI part: the path is passed unchanged
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90s;
      }

      location /media/ {
        alias /srv/media/;                      # the shared uploads volume, read-only here
      }
    }

- **try_files … /index.html** is the SPA fallback: a refresh on /orders/42 finds no such file, nginx
  serves index.html, and React Router renders the page.
- /api/, /admin/ and /static/ (the admin's assets, served by WhiteNoise) go to Gunicorn. Vite puts
  React's own files under /assets/, so the paths do not collide.
- **proxy_set_header Host $host** — by default nginx sends Host: api:8000, which is not in
  ALLOWED_HOSTS, and Django answers 400 to everything ("Invalid HTTP_HOST header: 'api:8000'").
- The browser only ever talks to nginx, so the page and the API are **one origin**: no CORS.

## compose.yaml

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
          test: ["CMD-SHELL", "mysqladmin ping -h 127.0.0.1 -uroot -p$$MYSQL_ROOT_PASSWORD --silent"]
          interval: 5s
          timeout: 5s
          retries: 20

      api:
        build: ./backend
        env_file: .env
        environment:
          DB_HOST: db
          RUN_MIGRATIONS: "1"
        depends_on:
          db:
            condition: service_healthy
        volumes:
          - media:/app/media

      web:
        build:
          context: ./frontend
          args:
            VITE_API_URL: /api
        ports:
          - "8080:80"
        depends_on:
          - api
        volumes:
          - media:/srv/media:ro

    volumes:
      dbdata:
      media:

- **DB_HOST is db**, the service name. Inside the api container localhost is the api container.
- **The healthcheck pings 127.0.0.1**, not the socket: the MySQL image first starts a temporary
  server without networking to initialise the database, and a socket ping could pass during that
  phase. condition: service_healthy makes api wait for the real server.
- **Named volumes** keep the database and the uploads across docker compose down and up (down -v
  deletes them — that is what -v is for).
- Only web publishes a port. MySQL and Gunicorn are reachable only on the compose network.
- \${DB_PASSWORD} is filled from .env by compose; $$MYSQL_ROOT_PASSWORD is escaped so the container's
  shell expands it instead.

## Running it

    docker compose up --build -d
    docker compose ps                         # db healthy, api and web running
    docker compose logs -f api                # migrations, then Gunicorn booting 3 workers
    docker compose exec api python manage.py createsuperuser
    docker compose down                       # keep data;  down -v  to wipe it`,
    workedExample: `**Goal: one command starts the stack, and four checks prove each seam works.** Docker could
not be run while writing this; the output described is what these files are documented to produce,
and each check tells you which file to open when it does not.

**Start.**

    docker compose up --build -d
    docker compose ps

db goes from "starting" to "healthy" after MySQL initialises (the first run takes longest, because
it creates the database in the new volume). Only then does api start: its log shows the migrations
applying (RUN_MIGRATIONS=1) and Gunicorn "Booting worker with pid" three times. web starts nginx.

**Check 1 — the SPA fallback.** Open http://localhost:8080/products/3 directly and press refresh.
React renders the product page. If you get nginx's 404, try_files is missing or the config was copied
to the wrong path.

**Check 2 — the proxy and ALLOWED_HOSTS.** In the Network tab, GET /api/products/ returns 200 JSON,
served from localhost:8080 — one origin, no preflight. If it is 400 Bad Request, the api log says
"Invalid HTTP_HOST header": add proxy_set_header Host $host and make sure ALLOWED_HOSTS contains
localhost (in .env, DJANGO_ALLOWED_HOSTS=localhost). If it is 502, Gunicorn is not up — read
docker compose logs api.

**Check 3 — static files.** Open http://localhost:8080/admin/. The login page is styled. If it is
plain HTML, WhiteNoise is missing from MIDDLEWARE or collectstatic did not run in the image.

**Check 4 — data survives.** Log in, upload an avatar, create a product. Then:

    docker compose down
    docker compose up -d

The product is still listed (the dbdata volume) and the avatar still loads from /media/… (the media
volume, written by api and read by nginx). Had MEDIA_ROOT not been on a volume, the product would
remain with a broken image — the row survives in MySQL but the file died with the container.

**Reading a failure.** "OperationalError: (2002, ...) Can't connect to ... server on 'db'" on the
first up means api started before MySQL was ready: the healthcheck or condition: service_healthy is
missing. The same error naming 'localhost' means DB_HOST was never set to db.`,
    mcqs: [
      mcq('Gunicorn runs with --workers 3 and the default sync worker. One request is waiting 20 seconds on a slow external call. How many other requests can be served meanwhile?', [
        ['None, because Gunicorn handles one request at a time', false],
        ['Two, one in each of the remaining worker processes', true],
        ['Any number, because Gunicorn workers are asynchronous', false],
        ['Three, since the busy worker hands requests to a queue', false],
      ], 'A sync worker is busy for the whole request. With three workers and one blocked, two remain free. Long calls tie up capacity, which is why slow work belongs in timeouts or background jobs.'),
      mcq('Why does the API Dockerfile run collectstatic with DJANGO_SECRET_KEY=collectstatic-only and dummy DB variables?', [
        ['settings.py reads them on import, and an image must hold no secrets', true],
        ['collectstatic signs each static file using the configured secret', false],
        ['WhiteNoise refuses to start in an image without a database login', false],
      ], 'Importing settings needs the variables to exist, but collectstatic never uses the key or connects to MySQL. Dummy values let it run without putting real secrets into an image layer.'),
      mcq("nginx.conf has location / { try_files $uri $uri/ /index.html; } and proxies /api/ to http://api:8000. What does a browser refresh on /orders/42 return?", [
        ["nginx's 404 page, as no file named orders/42 exists", false],
        ["Django's 404 page, since nginx forwards unknown paths", false],
        ["A redirect to / that drops the order id from the URL", false],
        ['index.html, and React Router renders the order page', true],
      ], 'try_files tries the path as a file, then as a folder, then falls back to index.html with a 200. The React app boots, reads the URL and renders the matching route.'),
    ],
    checkpoint: [
      mcq('In compose.yaml the api service has depends_on: [db] with no condition. The first docker compose up fails with OperationalError (2002) for host db, and a restart works. What is the fix?', [
        ['Add restart: always to db so that MySQL starts faster', false],
        ['Publish port 3306 so the api can reach MySQL from outside', false],
        ['Add a db healthcheck and condition: service_healthy', true],
        ['Change DB_HOST to localhost inside the api service', false],
      ], 'A plain depends_on waits only for the container to start, not for MySQL to accept connections. A healthcheck defines ready, and service_healthy makes api wait for it.'),
      mcq('Every API call through nginx returns 400 Bad Request, and the api log says Invalid HTTP_HOST header: \'api:8000\'. Which change is right?', [
        ['proxy_set_header Host $host, with the public name in ALLOWED_HOSTS', true],
        ['CORS_ALLOWED_ORIGINS = ["http://api:8000"] in the settings', false],
        ['DEBUG = True, since host names are only ever checked in production mode', false],
        ['CSRF_TRUSTED_ORIGINS = ["http://api"] in the settings', false],
      ], 'nginx sends Host: api:8000 unless told otherwise, and Django rejects hosts not in ALLOWED_HOSTS. Forwarding the browser\'s Host keeps the check meaningful and URLs DRF builds correct.'),
      mcq('The API will run as three containers of the same image. Where should python manage.py migrate run?', [
        ['In the Dockerfile with RUN, so the image carries the schema', false],
        ['In every Gunicorn worker, as each one starts up', false],
        ['From a developer laptop pointed at the production database', false],
        ['Once per release, before the new containers take traffic', true],
      ], 'Migrations change shared state, so they run once, as a release step. The build has no database, per-container runs race each other, and laptop runs are unrepeatable.'),
    ],
  },

  /* ── DEPLOY ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_PY_DEPLOY',
    notes: `**Deploying is the compose setup with the parts swapped for managed ones**: a managed MySQL instead
of the db container, a platform (or a VM) running the API image, and the React build on a static host
or behind the same nginx. What changes is configuration, and all of it comes from environment
variables.

## Two shapes that work

**A — a platform (Render, Railway or similar).**

- **API:** a web service built from backend/Dockerfile (or the platform's Python build: pip install
  -r requirements.txt && python manage.py collectstatic --noinput, start command gunicorn
  config.wsgi:application --bind 0.0.0.0:$PORT). Platforms tell the app which port to use in PORT.
- **Database:** a managed MySQL. Railway offers MySQL as a service; Render's own managed database is
  PostgreSQL, so with Render you use an external MySQL provider (Aiven, or a cloud's managed MySQL
  such as Amazon RDS). Use the provider's TLS settings and restrict who can connect where you can.
- **Migrations:** the platform's pre-deploy / release command, python manage.py migrate --noinput,
  where your plan offers one; otherwise the entrypoint approach from the Docker unit with a single
  instance.
- **Frontend:** a static site (Render, Netlify, Vercel) built with npm run build, publish directory
  dist, VITE_API_URL=https://api.shop.in/api in its **build** environment, and a rewrite of /* to
  /index.html so deep links work.

**B — a VM (an EC2 or Lightsail instance, a DigitalOcean droplet).** Install Docker, copy the repo,
run the compose file from the Docker unit without the db service (DB_HOST points at the managed
MySQL), and put TLS in front: certbot with nginx, or a reverse proxy such as Caddy that obtains
certificates itself. Everything is one origin, so no CORS.

## Production settings, from the environment

    # config/settings/prod.py
    from .base import *  # noqa

    DEBUG = False
    SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]
    ALLOWED_HOSTS = os.environ["DJANGO_ALLOWED_HOSTS"].split(",")             # api.shop.in
    CORS_ALLOWED_ORIGINS = [o for o in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",") if o]
    CSRF_TRUSTED_ORIGINS = [o for o in os.environ.get("CSRF_TRUSTED_ORIGINS", "").split(",") if o]

    DATABASES = {"default": {
        "ENGINE": "django.db.backends.mysql",
        "HOST": os.environ["DB_HOST"], "PORT": os.environ.get("DB_PORT", "3306"),
        "NAME": os.environ["DB_NAME"], "USER": os.environ["DB_USER"],
        "PASSWORD": os.environ["DB_PASSWORD"],
        "OPTIONS": {"charset": "utf8mb4"},
        "CONN_MAX_AGE": 60,
    }}

    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

DJANGO_SETTINGS_MODULE=config.settings.prod is set on the host. What each line protects:

- **ALLOWED_HOSTS** — every request whose Host is not listed gets **400 Bad Request** (checked with
  DEBUG off). The platform's own hostname (shop-api.onrender.com) and your custom domain both go in.
- **CORS_ALLOWED_ORIGINS** — the frontend's origin exactly: https://shop.in, no path, no slash.
  Empty when the frontend and API are one origin.
- **CSRF_TRUSTED_ORIGINS** — needed for unsafe requests over HTTPS whose Origin is not the API's own
  host: the admin behind a proxy that rewrites Host, or session auth from a separate frontend. Since
  Django 4.0 each entry must include the scheme ("https://shop.in"); "shop.in" fails the system check
  with 4_0.E001.
- **SECURE_PROXY_SSL_HEADER** — the platform terminates TLS and talks plain HTTP to Gunicorn, adding
  X-Forwarded-Proto: https. Without this line Django believes every request is http, which breaks
  SECURE_SSL_REDIRECT (a redirect loop) and makes the admin's CSRF check fail with "Origin checking
  failed - https://api.shop.in does not match any trusted origins." Set it **only** when a proxy you
  control sets that header; otherwise a client could claim HTTPS.

Run python manage.py check --deploy with the production settings: it lists the security settings you
have left at insecure values (DEBUG, missing HSTS, insecure cookies, a weak SECRET_KEY).

## Secrets and configuration

| Variable | Example | Where it is set |
|---|---|---|
| DJANGO_SECRET_KEY | 50 random characters | API service, secret |
| DJANGO_ALLOWED_HOSTS | api.shop.in,shop-api.onrender.com | API service |
| DB_HOST / DB_NAME / DB_USER / DB_PASSWORD | from the MySQL provider | API service, secret |
| CORS_ALLOWED_ORIGINS | https://shop.in | API service |
| CSRF_TRUSTED_ORIGINS | https://shop.in | API service |
| VITE_API_URL | https://api.shop.in/api | frontend **build** settings |

Generate the secret with python -c "from django.core.management.utils import get_random_secret_key;
print(get_random_secret_key())". .env.example lists every variable; .env never enters Git. A secret
that was ever committed is rotated, not deleted — Git history keeps it.

## Cookies across two platform domains

If the frontend is https://shop.vercel.app and the API https://shop-api.onrender.com, they are
**different sites** (different registrable domains — and platform domains such as vercel.app are on
the Public Suffix List, so even two apps under one of them are separate sites). A SameSite=Strict or
Lax refresh cookie is then never sent on API calls. Either give both a custom domain (shop.in and
api.shop.in are one site), serve them from one origin through a proxy, or keep the Bearer-only flow
with no cookies. SameSite=None; Secure works only where the browser still allows third-party cookies,
which is less and less.

## A health endpoint that tells the truth

    # config/views.py
    from django.db import connection
    from django.http import JsonResponse

    def health(request):
        with connection.cursor() as cur:
            cur.execute("SELECT 1")
        return JsonResponse({"status": "ok"})

    # urls.py: path("api/health/", health)

If MySQL is unreachable the query raises and the endpoint returns 500, so the platform's health check
(and you) find out. A health view that returns 200 without touching the database stays green while
every real request fails.

## After every deploy

1. /api/health/ returns {"status": "ok"}.
2. The site loads, and a deep link survives a refresh.
3. Log in; the Network tab shows calls going to the production API with no CORS errors.
4. Create, edit and delete; upload a file; reload and see it.
5. Log in as an ordinary user and try an admin endpoint with curl and that token: 403.
6. Read the API's logs for errors you did not see on screen.`,
    workedExample: `**Goal: deploy to a platform and fix the four failures almost everyone meets, from their
symptoms.** The platform steps are described as documented; the Django behaviour behind each
symptom was checked with the test client.

**Set-up.** Railway (or another host) runs MySQL. The API service builds backend/Dockerfile with
DJANGO_SETTINGS_MODULE=config.settings.prod and the variables from the table; its pre-deploy command
is python manage.py migrate --noinput. The frontend is a static site with VITE_API_URL set to the
API's URL plus /api.

**Failure 1 — every API URL returns 400 Bad Request.** No traceback, no JSON. The log line is
"Invalid HTTP_HOST header: 'shop-api.up.railway.app'". ALLOWED_HOSTS has only the custom domain.
Add the platform hostname too, and redeploy (settings are read at start-up).

**Failure 2 — the browser shows CORS errors; curl works.** The preflight's response has no
access-control-allow-origin. CORS_ALLOWED_ORIGINS was set to "https://shop.in/" — the trailing slash.
python manage.py check would have said corsheaders.E014. Remove the slash.

**Failure 3 — the admin login says "CSRF verification failed" with "Origin checking failed -
https://shop-api.up.railway.app does not match any trusted origins."** The platform's proxy speaks
HTTP to Gunicorn, so request.is_secure() is False and Django compares the https Origin with an http
URL. Checked: the same request fails without SECURE_PROXY_SSL_HEADER and succeeds with it and
X-Forwarded-Proto: https. Add the setting.

**Failure 4 — the site works, but refreshing /orders shows the static host's 404.** The static host
has no rule to serve index.html for unknown paths. Add the rewrite /* → /index.html (a _redirects
file on Netlify, a rewrite in the Render static-site settings or vercel.json).

**Then walk the checklist.** Health ok; deep link; login; CRUD; upload and reload; a USER's token
against an admin endpoint returns 403. Only now is it deployed.`,
    mcqs: [
      mcq('The React build is a static site with VITE_API_URL=https://api.shop.in/api. Opening the home page works, but refreshing /orders/7 shows the host\'s 404. What is missing?', [
        ['A CORS rule on the API that allows the /orders path', false],
        ['A rewrite of every path to /index.html on the static host', true],
        ['A trailing slash on VITE_API_URL so routes resolve', false],
        ['A Django URL pattern for /orders/<id>/ in the API project urls.py', false],
      ], '/orders/7 is a client-side route; no file exists for it. The host must answer unknown paths with index.html so React Router can render the page.'),
      mcq('Behind the platform\'s TLS proxy, the Django admin login fails: "Origin checking failed - https://api.shop.in does not match any trusted origins." Which setting fixes it?', [
        ['CORS_ALLOWED_ORIGINS with the admin URL listed', false],
        ['SESSION_COOKIE_SECURE = False on the API service', false],
        ['SECURE_PROXY_SSL_HEADER for X-Forwarded-Proto', true],
        ['APPEND_SLASH = False so the admin is not redirected', false],
      ], 'The proxy talks HTTP to Gunicorn, so Django thinks the request is http and the https Origin looks foreign. Trusting the proxy\'s X-Forwarded-Proto makes request.is_secure() true and the origins match.'),
      mcq('Production runs with DEBUG = False and ALLOWED_HOSTS = ["localhost"]. What does a browser get from the platform URL?', [
        ['The site works, as ALLOWED_HOSTS is only checked in debug', false],
        ['A 500 error with the DisallowedHost traceback in the page', false],
        ['A 400 Bad Request for every request to the API', true],
      ], 'Django validates the Host header against ALLOWED_HOSTS on every request and answers 400 for unknown hosts. The traceback goes to the log, never to the browser when DEBUG is off.'),
    ],
    checkpoint: [
      mcq('What does python manage.py check --deploy do when run with the production settings?', [
        ['It applies migrations and then restarts the Gunicorn workers', false],
        ['It deploys the current code to the configured hosting service', false],
        ['It warns about insecure production settings, such as DEBUG', true],
        ['It confirms the database is reachable from the platform', false],
      ], 'The deployment checks inspect settings like DEBUG, SECRET_KEY strength, HSTS and secure cookies, and list what is unsafe. It does not deploy, migrate or test connectivity.'),
      mcq('The frontend is on https://shop.vercel.app and the API on https://shop-api.onrender.com. The refresh token is an httpOnly SameSite=Strict cookie, and the refresh call never sends it. Why?', [
        ['httpOnly cookies are never sent by requests made with axios', false],
        ['Render strips cookies from requests made by static sites', false],
        ['Cookies are sent only to the domain that served the page HTML', false],
        ['The two hosts are different sites, so the browser withholds it', true],
      ], 'SameSite compares registrable domains, and vercel.app and onrender.com are different ones. A custom domain for both (shop.in, api.shop.in) or a same-origin proxy makes them one site.'),
      mcq('The platform health check calls /api/health/, which returns 200 without touching anything. The database is down and every real request fails, yet the service shows healthy. What should the endpoint do?', [
        ['Return 200 only after a cheap query such as SELECT 1 succeeds', true],
        ['Return the number of Gunicorn workers that are currently busy', false],
        ['Return 500 at random so that the check is exercised regularly', false],
      ], 'A health check is only useful if it fails when the service cannot serve. Running a trivial query makes a lost database turn the check red, so the platform and you find out.'),
    ],
  },

  /* ── DEBUGGING ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_PY_DEBUGGING',
    notes: `**Full-stack bugs live at the seam, so first find which side of it you are on.** Three questions
settle most of them: did the request leave the browser, which URL and headers did it carry, and what
came back? The Network tab answers all three; the Django log (runserver's console, docker compose
logs api, the platform's log viewer) answers the rest. Every message below is the real one.

## Fault 1 — "blocked by CORS policy", but curl works

    Access to XMLHttpRequest at 'http://localhost:8000/api/orders/' from origin
    'http://localhost:5173' has been blocked by CORS policy

The preflight returned 200 with no access-control-allow-origin. **Cause:** the origin is not in
CORS_ALLOWED_ORIGINS — often because it was written "http://localhost:5173/" (manage.py check:
corsheaders.E014) or the environment variable was never set on this machine. **Fix:** the exact
origin, no slash; or use the Vite proxy in development and make the question disappear.

## Fault 2 — CORS headers on some responses but not others

GETs work; a POST to /api/orders (no slash) fails with a CORS error. CorsMiddleware is listed
**below** CommonMiddleware. **Cause:** CommonMiddleware replaces the response with its own slash
redirect (or, with DEBUG on, an error) on the way out — after CorsMiddleware, below it, has already
finished — so the response the browser gets carries no CORS headers (checked: 301 with no
access-control-allow-origin). The browser reports CORS and hides the real problem. **Fix:** move CorsMiddleware above CommonMiddleware, and write the slash.

## Fault 3 — 401 "Authentication credentials were not provided." with a token attached

The request headers show Authorization: Token eyJ…. **Cause:** Simple JWT's AUTH_HEADER_TYPES is
("Bearer",); a header with any other keyword is ignored, as if absent. **Fix:** 'Bearer ' + access in
the request interceptor. (The message differs from a bad token, which says "Given token not valid for
any token type" — that difference tells you whether the token was read at all.)

## Fault 4 — every expired session logs the user out instead of refreshing

The refresh call returns 400 {"refresh": ["This field may not be null."]}. The login code stored the
refresh token under localStorage key 'refreshToken'; tokenStore reads 'refresh' and gets null.
**Cause:** two names for one value. **Fix:** one tokenStore module that both login and refresh use;
never touch localStorage elsewhere.

## Fault 5 — 403 "CSRF Failed: CSRF cookie not set." on a JWT API

It happens only on the developer's machine, after they used /admin/. **Cause:** SessionAuthentication
is in DEFAULT_AUTHENTICATION_CLASSES; a request that went out before the access token was attached
was authenticated by the admin session cookie, and SessionAuthentication enforces CSRF. **Fix:**
make sure every call carries the Bearer header (bootstrap before rendering), and drop
SessionAuthentication from the API's defaults unless you need it.

## Fault 6 — uploads fail with "Invalid boundary in multipart: None"

    400 {"detail": "Multipart form parse error - Invalid boundary in multipart: None"}

The fetch call sets Content-Type: multipart/form-data by hand. **Cause:** the header lacks the
boundary only the browser knows. **Fix:** do not set Content-Type for a FormData body.

## Fault 7 — the API container cannot reach MySQL

    django.db.utils.OperationalError: (2002, "Can't connect to ... server on 'localhost' ...")

**Cause:** DB_HOST defaults to localhost, and inside the api container localhost is the api
container. **Fix:** DB_HOST=db (the compose service name). If the host is already db and the error
appears only on the first up, MySQL was not ready: add the healthcheck and condition: service_healthy.

## Fault 8 — the admin is unstyled and Gunicorn logs WORKER TIMEOUT

Two production classics that often arrive together. The admin's CSS requests return HTML (nginx's
SPA fallback answering /static/…) or 404: **cause** — DEBUG is off, collectstatic did not run or
nothing serves STATIC_ROOT; **fix** — WhiteNoise after SecurityMiddleware, collectstatic in the image,
and /static/ proxied to the API. Separately, "[CRITICAL] WORKER TIMEOUT (pid:…)" followed by a 502
in the browser: **cause** — a view blocked for longer than --timeout (30 s by default), typically an
outbound call with no timeout; **fix** — give every outbound call a timeout and move long work out of
the request.

## The habit

Read the response body before changing code: a DRF JSON detail, Django's HTML error page, nginx's
HTML page and an empty "(failed)" in the Network tab each name a different layer — and the layer that
answered is the layer to fix.`,
    mcqs: [
      mcq('A request carries Authorization: Token eyJhbGciOi… and Simple JWT has its default settings. What does DRF answer?', [
        ['401 "Given token not valid for any token type"', false],
        ['401 "Authentication credentials were not provided."', true],
        ['403 "You do not have permission to perform this action."', false],
        ['400 "Invalid Authorization header. No credentials provided."', false],
      ], 'Simple JWT accepts only the keywords in AUTH_HEADER_TYPES, Bearer by default. Any other keyword is ignored, so the request looks unauthenticated, not like one with a bad token.'),
      mcq('After expiry the refresh call returns 400 {"refresh": ["This field may not be null."]}, and the user is logged out. Login saved the token as localStorage "refreshToken". What is the cause?', [
        ['ROTATE_REFRESH_TOKENS deleted the token from localStorage', false],
        ['The refresh token had expired, and Simple JWT reports it as null', false],
        ['The token store reads a different key, so it sends null', true],
        ['TokenRefreshView requires the token in the Authorization header', false],
      ], 'The refresh call sent {"refresh": null} because the reader and the writer disagree on the key. An expired token would give 401 token_not_valid, not a 400 about null.'),
      mcq('CorsMiddleware is listed below CommonMiddleware. GETs from React work, but a POST to /api/orders without a slash shows a CORS error. Why is the CORS error shown?', [
        ['CommonMiddleware replaced the response after CORS headers were set', true],
        ['django-cors-headers does not support the POST method by default', false],
        ['Browsers send a preflight only for URLs that end in a slash', false],
        ['The view refused the POST, and Django hides 405s behind CORS', false],
      ], 'CommonMiddleware builds the slash redirect on the way out, after CorsMiddleware below it has finished, so the new response never gets CORS headers and the browser hides the real error behind CORS.'),
      mcq('Gunicorn logs "[CRITICAL] WORKER TIMEOUT" and the browser receives 502 from nginx for the report endpoint. The view calls an external service with requests.get(url) and no timeout. What is the right first fix?', [
        ['Give the outbound call a timeout and handle the failure', true],
        ['Raise the Gunicorn --timeout to ten minutes for safety', false],
        ['Increase the number of workers until the timeouts stop', false],
        ['Set proxy_read_timeout in nginx lower than Gunicorn\'s', false],
      ], 'Without a timeout the call can hang until Gunicorn kills the worker. A bounded timeout lets the view fail fast with a clear error; more workers or longer timeouts only hide the hang.'),
    ],
  },

  /* ── PRACTICE ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_PY_PRACTICE',
    notes: `**Six exercises that join a React app to a Django REST Framework API.** Use the DRF API you built in
the Django topics (products, orders, users with Simple JWT and permissions) and a fresh Vite React app.
Each exercise ends with a check; do not move on until it passes.

**1 — One client, both ways.** Create src/api/client.js with axios.create and baseURL from
VITE_API_URL, and a productsApi module that reads data.results and data.count. Run once with the
Vite proxy (VITE_API_URL=/api) and once with http://localhost:8000/api. Check: with the proxy, the
Network tab shows only localhost:5173; directly, the requests go to 8000 and fail with CORS until
exercise 2.

**2 — CORS, exactly.** Install django-cors-headers, place CorsMiddleware above CommonMiddleware and
read CORS_ALLOWED_ORIGINS from the environment. Check: a POST from React shows an OPTIONS 200 with
access-control-allow-origin, then the POST; changing the Vite port to 3000 makes it fail again; and
python manage.py check is silent (no E013 or E014).

**3 — Login, refresh, logout.** Build tokenStore, the request and response interceptors with the
shared refresh promise, the 'checking' state and RequireAuth. Set ACCESS_TOKEN_LIFETIME to one minute.
Check: after a minute the next action still works and the Network tab shows exactly one refresh even
when the page fires three calls; after logout, the old refresh token gets 401 "Token is blacklisted";
a wrong password shows the message on the form without any refresh call.

**4 — An avatar upload.** ImageField with a generated upload_to, a serializer with
FileExtensionValidator and a 2 MB size check, a MultiPartParser view at /api/me/avatar/, and a React
form with FormData and a progress bar. Check: a 3 MB image shows "Max 2 MB." from the server's
response; a .txt renamed to .png shows Pillow's "Upload a valid image…" message; a good image appears
from its absolute URL.

**5 — One error reader.** Write parseApiError and use it in the product form. Check four cases: field
errors appear under their inputs; a validate() rule appears at the top (non_field_errors); stopping
runserver and submitting shows the connection message with the values still typed; a 403 shows the
permission message and the user stays logged in.

**6 — Compose it.** Both Dockerfiles, nginx.conf with try_files and the proxy for /api/, /admin/ and
/static/, WhiteNoise, and compose.yaml with MySQL, a healthcheck, condition: service_healthy and named
volumes for the data and media. Check: docker compose up --build from a fresh clone works; a refresh
on a deep link renders; /admin/ is styled; an uploaded avatar survives docker compose down and up.`,
    mcqs: [
      mcq('In exercise 1, with the API called directly on port 8000, which request header shows that the call is cross-origin?', [
        ['Origin: http://localhost:5173 on a request to localhost:8000', true],
        ['Accept: application/json on the request to the products view', false],
        ['Referrer-Policy: same-origin returned on the products response', false],
        ['Host: localhost:8000, which the browser sends for every call', false],
      ], 'The browser adds Origin to cross-origin requests. An origin of localhost:5173 on a request to localhost:8000 shows two origins are involved, so CORS headers are required.'),
      mcq('Exercise 3 sets ACCESS_TOKEN_LIFETIME to one minute. What is the point of that?', [
        ['A short lifetime makes the login response arrive faster', false],
        ['Simple JWT refuses longer lifetimes while DEBUG is on', false],
        ['The interceptor can only decode tokens that expire soon', false],
        ['It forces the refresh path to run while you test', true],
      ], 'With a 15-minute token the refresh code rarely runs during development and its bugs survive. A one-minute token makes every test session exercise expiry, refresh and retry.'),
      mcq('In exercise 4 a text file renamed to photo.png is uploaded. Which part of the serializer rejects it?', [
        ['FileExtensionValidator, as .png is not on its list', false],
        ['The size check in validate_avatar, as text is small', false],
        ['ImageField, because Pillow cannot read it as an image', true],
      ], 'The extension .png is allowed and the file is small, so those checks pass. ImageField opens the bytes with Pillow, fails, and returns "Upload a valid image…".'),
      mcq('In exercise 5 the API is stopped and the form is submitted. Which value does parseApiError branch on to show the connection message?', [
        ['error.response.status being 0 for a server that is down', false],
        ['error.response being undefined, as nothing came back', true],
        ['error.response.data.detail holding "Network Error"', false],
        ['error.config.timeout being exceeded by the request', false],
      ], 'When no HTTP response arrives, axios leaves error.response undefined. There is no status or body to read, so that is the branch for connection problems.'),
      mcq('In exercise 6 the admin login page at /admin/ appears with no styling, and /static/admin/css/base.css returns the React index.html. What is wrong in nginx.conf?', [
        ['/static/ is not proxied to the API, so try_files falls back', true],
        ['client_max_body_size is too small for the admin stylesheet', false],
        ['The proxy_pass line has a trailing slash after api:8000', false],
        ['The Host header is forwarded, which hides static files', false],
      ], 'Without a location for /static/, the request reaches location / and try_files serves index.html. Proxying /static/ to the API lets WhiteNoise serve the collected admin files.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_PY_INTERVIEW_QUESTION',
    notes: `**Three questions a Python full-stack interview asks about joining and shipping a React + Django
application.** Answer each aloud in under ninety seconds, then the follow-up.

## Question 1 — "Walk me through your login flow, including what happens when the token expires."

**Model answer.** The React form posts username and password to /api/auth/token/, Simple JWT's
TokenObtainPairView, which returns an access token valid for fifteen minutes and a refresh token valid
for seven days. I keep the access token in memory and the refresh token in localStorage, and an axios
request interceptor adds Authorization: Bearer to every call. On the server JWTAuthentication checks
the signature and expiry, and permission classes decide access. When a call returns 401, a response
interceptor refreshes once — concurrent 401s share one refresh promise — and retries the original
request. If the refresh fails, I clear the tokens and the route guard sends the user to login, then
back to the page they were on. Logout blacklists the refresh token. The login call's own 401 is
excluded from all of this, so a wrong password shows on the form.

**Follow-up: "Why share one refresh promise?"** With rotation and the blacklist on, each refresh
rotates the refresh token out. If three requests refreshed separately, the second and third would send
a token the first had just blacklisted, fail, and log the user out for no reason. Sharing the promise
means one refresh and three retries.

## Question 2 — "Why doesn't your API need CSRF protection? Or does it?"

**Model answer.** CSRF exploits credentials the browser attaches automatically, which means cookies.
My API authenticates with a Bearer token that my JavaScript adds to the header; a page on another site
cannot read it and the browser will not add it, so a forged request arrives unauthenticated. That is
why DRF's JWTAuthentication does no CSRF check. It would matter the moment cookies authenticate: DRF's
SessionAuthentication enforces CSRF for session-authenticated requests, so with sessions I would send
the csrftoken cookie's value in X-CSRFToken and list the frontend in CSRF_TRUSTED_ORIGINS if it is on
another origin. And if I moved the refresh token to an httpOnly cookie, I would make it SameSite=Strict
with a narrow path so it only goes to the refresh endpoint.

**Follow-up: "Then is localStorage safe?"** No — it is readable by any script on the page, so an XSS
bug can steal the refresh token. I accept that in a project and say so; for production I would keep
the refresh token in an httpOnly cookie, keep access tokens short, and treat XSS prevention (no
dangerouslySetInnerHTML with user content, a Content-Security-Policy) as the real defence, because XSS
can act as the user whatever the storage.

## Question 3 — "How is your app deployed, and what happens on a release?"

**Model answer.** Locally, docker compose runs MySQL with a healthcheck and a volume, the API image —
Gunicorn with three workers, static files collected at build time and served by WhiteNoise — and an
nginx image that serves the React build with a fallback to index.html and proxies /api to Gunicorn,
so everything is one origin. In the cloud the API image runs as a web service with configuration from
environment variables: secret key, allowed hosts, database credentials for a managed MySQL, CORS and
CSRF trusted origins. A release builds the image, runs migrate once as the pre-deploy step, then
switches traffic. I check /api/health/, which runs SELECT 1, then walk login, CRUD and an upload in
the browser.

**Follow-up: "Your uploads disappear after every deploy. Why?"** They are written to MEDIA_ROOT inside
the container, and a deploy replaces the container. Uploads belong on a volume (one server) or in
object storage through django-storages (a platform or several instances), with only the file name
stored in MySQL.`,
    mcqs: [
      mcq('An interviewer asks why your interceptor does not refresh when the login request itself returns 401. Which answer is right?', [
        ['That 401 means a wrong password, which the form should show', true],
        ['Simple JWT never returns 401 from the login view at all', false],
        ['A refresh during login would blacklist the new access token', false],
      ], 'TokenObtainPairView answers a wrong password with 401 "No active account found…". It is not an expired session, so it must reach the form instead of starting a refresh.'),
      mcq('Asked when your DRF API would need CSRF protection, which answer is correct?', [
        ['Always, because every POST to Django is checked for CSRF', false],
        ['Never, because DRF disables CSRF on every API view', false],
        ['Only when browsers use HTTP/1.1 instead of HTTP/2', false],
        ['When a cookie authenticates, as with SessionAuthentication', true],
      ], 'DRF\'s views are CSRF-exempt, and the check comes back through SessionAuthentication for session-authenticated requests. Bearer-only APIs are not exposed because the browser never adds the header.'),
      mcq('The interviewer asks why migrate is a pre-deploy step instead of part of each container\'s start-up. Which answer shows you understand it?', [
        ['Containers cannot run manage.py once Gunicorn has been installed', false],
        ['It runs once per release, not racing between several instances', true],
        ['Running it at start-up deletes the data that was already migrated', false],
      ], 'Migrations change the shared database. Several instances starting together would try to apply them at once; a single release step applies them once before new code serves traffic.'),
    ],
  },

  /* ── PROJECT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_PY_PROJECT',
    notes: `**Brief: a Django and React application, deployed at a public URL.** Join the React frontend and the
secured DRF API you have built into one product — a course portal, a library system, a job board, a
clinic booking app or an inventory manager — and put it on the internet. A reviewer opens the URL,
logs in with the demo accounts in your README, and uses every feature. This application is also the
base the AI service and agent are added to later in the track, so build it to last.

## Architecture

    React (Vite, React Router, Redux Toolkit, axios)
       │  HTTPS, JSON, Authorization: Bearer <access token>
    nginx — serves the React build, proxies /api/, /admin/, /static/        (or a static host + CORS)
       │
    Gunicorn → Django 5 + DRF + Simple JWT + django-cors-headers + WhiteNoise
       │  mysqlclient
    MySQL 8 (managed in the cloud, a container locally)
       + uploads on a volume (one server) or in object storage (a platform)

## Required features

1. **Authentication.** Register, log in, log out. Simple JWT with short access tokens, refresh with
   rotation and the blacklist, an axios interceptor that refreshes once for concurrent 401s and logs
   out when the refresh fails. A reload keeps the session; an expired session returns the user to
   the page they were on after logging in again.
2. **Two roles.** Ordinary users and staff (is_staff or a group). Staff screens are guarded in React
   **and** the endpoints are protected with permission classes; a user calling a staff endpoint with
   curl and their token gets 403.
3. **CRUD on a main resource** with a related one (courses and lessons, books and loans, jobs and
   applications): list with pagination and search, detail, create, edit, delete, with object-level
   permissions where a user may only change their own records.
4. **One upload.** An image or PDF on the main resource or the profile: type and size validated on the
   server, a generated storage name, served back to the users allowed to see it.
5. **One error contract.** Field errors under their inputs, form-level errors at the top, a connection
   message with Retry, no tracebacks or internals in any response.

## Required endpoints (adapt the names)

    POST /api/auth/register/          POST /api/auth/token/         POST /api/auth/token/refresh/
    POST /api/auth/logout/            GET  /api/auth/me/
    GET  /api/items/?page=&search=    GET  /api/items/{id}/
    POST /api/items/                  PATCH /api/items/{id}/        DELETE /api/items/{id}/   (owner or staff)
    PATCH /api/items/{id}/file/       GET  /api/health/

## Required screens

Login, register, list (search, pagination), detail (with the file), create/edit form, a staff page,
a "no access" page and a not-found page.

## Deployment requirements

- backend/Dockerfile (Gunicorn, collectstatic at build, non-root user), frontend/Dockerfile
  (multi-stage, nginx with SPA fallback and the proxy), compose.yaml with MySQL, a healthcheck,
  service_healthy and named volumes. docker compose up --build works from a fresh clone.
- Deployed on a platform or a VM with a managed MySQL. Every secret in environment variables;
  .env.example committed, .env ignored; DEBUG off; check --deploy reviewed.
- Migrations run as a release step.
- ALLOWED_HOSTS, CORS_ALLOWED_ORIGINS and CSRF_TRUSTED_ORIGINS set for the real domain (or the app is
  same-origin through nginx and CORS is empty).
- HTTPS throughout; deep links survive a refresh; uploads survive a redeploy.

## Acceptance criteria

- The public URL works on a phone and a laptop; /api/health/ returns ok and fails if MySQL is down.
- A user cannot reach staff data or another user's records through the UI **or** with curl.
- With a one-minute access lifetime (set for the demo), three simultaneous calls after expiry produce
  exactly one refresh request.
- An invalid form shows the server's messages under the right fields; a stopped API shows the
  connection message with the values kept.
- An oversized or fake image is refused with a clear message; a valid one survives a redeploy.
- No secret appears in the repository or its history.
- The README has the live URL, demo accounts, an architecture sketch, how to run with docker compose,
  every environment variable, and the token-storage decision with its trade-off stated honestly.`,
    mcqs: [
      mcq('The brief requires that a user calling a staff endpoint with curl and their own token gets 403. What does that check prove that clicking through the UI cannot?', [
        ['That RequireAuth sends ordinary users to the no-access page', false],
        ['That CORS blocks requests made from outside a browser', false],
        ['That the API enforces permissions even when the UI is bypassed', true],
      ], 'The UI only hides screens. Calling the endpoint directly tests the permission class, the control that actually protects the data.'),
      mcq('Why does the brief ask for exactly one refresh request when three calls fail together after expiry?', [
        ['It shows concurrent 401s share one refresh, as rotation needs', true],
        ['Simple JWT rejects more than one refresh request per user per minute', false],
        ['It proves the access token was stored in localStorage', false],
      ], 'With rotation and the blacklist, separate refreshes would replay a token that was just rotated out and log the user out. One refresh for many 401s proves the interceptor queues correctly.'),
    ],
    assignment: {
      title: 'Project — A Django and React App, Deployed',
      description: 'A React frontend and a secured Django REST Framework API on MySQL, joined into one application: Simple JWT login with refresh and logout, two roles enforced on the server, CRUD with pagination and object permissions, a validated upload, one error contract, Gunicorn and nginx in docker compose, and a public HTTPS deployment configured through environment variables.',
      instructions: `1. Choose the domain and model it (a main resource, a related one, users with a staff role). Write the migrations.
2. Build the API: serializers with validation, viewsets under /api/, permission classes including an owner-or-staff object permission, Simple JWT with rotation and the blacklist, /api/auth/me/, django-cors-headers from the environment, and /api/health/ running SELECT 1.
3. Build the frontend: one axios client with VITE_API_URL, tokenStore, request and response interceptors with a shared refresh promise, an auth slice with a checking state, RequireAuth with a staff option, and the required screens with loading, empty, error and field-error states using one parseApiError.
4. Add the upload: FormData with progress in React; an ImageField or FileField with a generated upload_to, type and size validation, MultiPartParser, and storage on a volume or object storage.
5. Containerise: backend Dockerfile (Gunicorn, WhiteNoise, collectstatic at build, non-root), frontend Dockerfile with nginx (SPA fallback, proxy, Host header, client_max_body_size), compose.yaml with MySQL healthcheck, service_healthy, named volumes and migrations on release. Verify from a fresh clone.
6. Deploy: managed MySQL, the API with production settings from environment variables, the frontend built with the production VITE_API_URL (or served by the same nginx), migrations as a release step. Walk the after-deploy checklist, including a curl call to a staff endpoint with an ordinary user's token.
7. Write the README (live URL, demo accounts, architecture, environment variables, how to run, the token-storage trade-off) and submit the repository link and the live URL.`,
      rubric: [
        { criterion: 'Authentication and authorisation', description: 'Simple JWT login, refresh with rotation and blacklist, interceptor with one shared refresh for concurrent 401s, login 401 kept on the form, logout, checking state on reload; permissions enforced on the server for staff and object ownership, guarded in React.', maxPoints: 25 },
        { criterion: 'API and frontend integration', description: 'One axios client and API modules; pagination and search read correctly; trailing slashes; CORS exact or same-origin; the upload validated by type and size, stored under generated names outside the container, and served to permitted users.', maxPoints: 20 },
        { criterion: 'Error handling', description: 'One error contract read by one function: field errors under inputs, non-field and detail messages at the top, connection failures with Retry and values kept; no tracebacks, HTML error pages or internals shown to users.', maxPoints: 15 },
        { criterion: 'Containers', description: 'Gunicorn with workers behind nginx, WhiteNoise and collectstatic at build, SPA fallback and proxy with the Host header, MySQL healthcheck with service_healthy, named volumes for data and media; runs from a fresh clone with one command.', maxPoints: 20 },
        { criterion: 'Deployment and configuration', description: 'Public HTTPS URL; managed MySQL; DEBUG off and secrets only in environment variables; ALLOWED_HOSTS, CORS, CSRF_TRUSTED_ORIGINS and the proxy SSL header correct; migrations as a release step; health check that fails when the database is down.', maxPoints: 15 },
        { criterion: 'README and explanation', description: 'Live URL, demo accounts, architecture sketch, every environment variable, run instructions, and the token-storage decision with its XSS and CSRF trade-offs stated honestly.', maxPoints: 5 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_PY_CHECKPOINT',
    notes: `**Ten questions on joining and shipping a React + Django REST Framework application.** The axios
client and DRF's response shapes, CORS and CSRF, the Simple JWT login flow and token storage, uploads,
the error contract, Gunicorn and nginx in docker compose, and deploying with configuration in the
environment. Each is a situation from a real project; choose what you would do, without looking
anything up.`,
    checkpoint: [
      ck('REST_APIS', 'A Redux thunk returns data from productsApi.list(), and the products page shows "Total: undefined" while the rows render fine. The thunk stored data.results as items and data.total as the count. What should it read?', [
        ['data.length, the length of the parsed array', false],
        ['data.count, the total that DRF\'s pagination sends', true],
        ['data.page_size, which DRF fills with the overall total', false],
        ['data.next, which holds the total as a number', false],
      ], 'PageNumberPagination returns count, next, previous and results. count is the total number of rows across all pages; next and previous are URLs, and there is no total key.'),
      ck('REST_APIS', 'React is served by nginx on https://shop.in and calls the API on https://shop.in/api/ through nginx\'s proxy. Which CORS configuration does Django need?', [
        ['CORS_ALLOWED_ORIGINS = ["https://shop.in"] and credentials on', false],
        ['CORS_ALLOW_ALL_ORIGINS = True, since nginx hides the origin', false],
        ['None at all; the page and the API share one origin', true],
      ], 'Same scheme, host and port means the browser makes no cross-origin request, so no CORS headers are ever checked. CORS settings matter only when the API is on another origin.'),
      ck('AUTHENTICATION', 'Two requests hit 401 at the same moment. Without a shared refresh promise, each calls /api/auth/token/refresh/ with the same refresh token, and ROTATE_REFRESH_TOKENS and BLACKLIST_AFTER_ROTATION are on. What happens?', [
        ['Both succeed, and the second token simply replaces the first', false],
        ['Both fail, because Simple JWT refuses parallel refresh calls', false],
        ['The second is rejected as blacklisted and the user is logged out', true],
        ['The second one waits on the server until the first has fully completed', false],
      ], 'The first refresh rotates the token and blacklists the old one. The second sends that old token, gets 401 "Token is blacklisted", and the interceptor ends a perfectly good session.'),
      ck('AUTHENTICATION', 'A team must choose where React keeps the refresh token. Which statement about the options is accurate?', [
        ['localStorage is safe from XSS, because browsers encrypt it', false],
        ['An httpOnly cookie hides it from scripts but needs CSRF care', true],
        ['Memory storage keeps the user logged in across page reloads', false],
        ['Any cookie is sent only by JavaScript, so CSRF cannot apply', false],
      ], 'httpOnly keeps the token out of script\'s reach, closing XSS theft, but the browser attaches the cookie automatically — so SameSite, a narrow path or a CSRF token must cover it. localStorage is readable by any script.'),
      ck('REST_APIS', 'A React form sends a product image with client.post(\'/products/\', { name, image: file }) — a plain object, not FormData. The serializer has an ImageField. What happens?', [
        ['axios converts the file into multipart, so the image is saved', false],
        ['The File is serialised as {} in JSON, and the field is rejected', true],
        ['DRF reads the file from the JSON body after base64 decoding', false],
      ], 'JSON.stringify turns a File into an empty object, so DRF receives no file and ImageField reports an error. A file has to travel in a multipart body built with FormData.'),
      ck('REST_APIS', 'A form shows a top-level message from detail and field messages from keys, but a cross-field rule from the serializer\'s validate() never appears. Which key is the form ignoring?', [
        ['errors, which DRF uses for messages that span fields', false],
        ['detail, which holds a joined string of all messages', false],
        ['messages, the list that Simple JWT attaches to its error responses', false],
        ['non_field_errors, where DRF puts errors from validate()', true],
      ], 'DRF files errors that belong to no single field under non_field_errors. A reader that only handles detail and field names drops them.'),
      ck('CONTAINERS_DOCKER', 'The API image runs gunicorn config.wsgi:application --workers 3. Users report slow pages, and logs show all three workers busy with 25-second report exports. What is the sound fix?', [
        ['Switch DEBUG on so that Django shows which views are slow', false],
        ['Run the exports outside the request, for example as a job', true],
        ['Set --timeout 5 so that the exports are killed sooner', false],
        ['Replace Gunicorn with runserver, which uses threads', false],
      ], 'Each sync worker is tied up for the whole export. Moving long work to a background job frees workers for ordinary requests; killing exports or using the dev server only trades one problem for another.'),
      ck('CONTAINERS_DOCKER', 'compose.yaml mounts a named volume at /app/media for api and at /srv/media for web (nginx). What does this arrangement achieve?', [
        ['Uploads survive restarts and nginx serves them directly', true],
        ['React\'s build output is shared with Gunicorn workers', false],
        ['MySQL stores uploaded files in the same volume as data', false],
      ], 'Django writes uploads to MEDIA_ROOT on the volume, which outlives containers; nginx reads the same volume and serves /media/ without passing through Gunicorn.'),
      ck('DEPLOYMENT', 'CSRF_TRUSTED_ORIGINS on the host is set to "shop.in". What happens when the API starts or runs manage.py check?', [
        ['It works, as Django adds https:// to entries with no scheme', false],
        ['Nothing, as the setting is only read when DEBUG is True', false],
        ['The system check reports 4_0.E001: the entry needs a scheme', true],
        ['Requests from shop.in are trusted, and all others rejected', false],
      ], 'Since Django 4.0 every CSRF_TRUSTED_ORIGINS entry must start with a scheme. The system check flags "shop.in" with 4_0.E001; write "https://shop.in".'),
      ck('DEPLOYMENT', 'The React static site was built with VITE_API_URL unset. After deploy, the Network tab shows calls to https://shop.in/products/ returning the site\'s index.html. What is the fix?', [
        ['Set VITE_API_URL on the API service and restart it', false],
        ['Add the frontend origin to CORS_ALLOWED_ORIGINS', false],
        ['Set VITE_API_URL in the build settings and rebuild', true],
        ['Add /products/ to ALLOWED_HOSTS on the API service', false],
      ], 'With baseURL undefined, axios calls relative paths on the static host, which answers with index.html. The variable is baked in at build time, so it must be set in the frontend\'s build environment, then rebuilt.'),
    ],
  },
];
