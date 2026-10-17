/**
 * Career-track content: React and ASP.NET Core — Integration and Deployment (JT_FULLSTACK_DOTNET),
 * for .NET Full Stack + AI.
 *
 * This topic joins the two halves the student has already built: the React app (Vite, React Router,
 * axios, Redux Toolkit — the shared React pack) and the ASP.NET Core 8 Web API (EF Core 8 on SQL
 * Server, Identity + JWT bearer — the JT_ASPNET_* topics). It covers the seams between them: one api
 * client and the Vite proxy, a named CORS policy, the login flow end to end, IFormFile uploads, one
 * ProblemDetails contract, Docker images for both halves with docker compose and SQL Server, and a
 * real deployment.
 *
 * The Java (trackContentFullstack.ts) and Python (trackContentFullstackPy.ts) versions of this topic
 * cover the framework-neutral seams; every question here is anchored in a specific ASP.NET Core
 * file, attribute, option or error.
 *
 * Attribution: the topic is multi-skill [REST_APIS, AUTHENTICATION, CONTAINERS_DOCKER, DEPLOYMENT]
 * with REST_APIS as the default; JWT_LOGIN_FLOW, DOCKER and DEPLOY are overridden to their own skill.
 * Every checkpoint question names the skill it measures with ck().
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_CS_FULLSTACK_BUNDLES: PilotBundle[] = [
  /* ── REACT_CALLS_API ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_DOTNET_REACT_CALLS_API',
    notes: `**Two programs, two ports, one application.** In development the React app runs on the Vite
dev server (http://localhost:5173) and the ASP.NET Core API on Kestrel, on whatever ports
Properties/launchSettings.json gives it — the template picks random ones such as http://localhost:5080
and https://localhost:7080. The browser loads the React bundle from Vite and calls the API. This topic
is about making that conversation reliable: first on your laptop, then in containers, then online.

## The API side: one prefix, DTOs out

    [ApiController]
    [Route("api/[controller]")]                 // → /api/products
    public class ProductsController : ControllerBase
    {
        private readonly IProductService _service;
        public ProductsController(IProductService service) => _service = service;

        [HttpGet]
        public Task<PagedResult<ProductDto>> List(int page = 1, int pageSize = 20) =>
            _service.ListAsync(page, pageSize);

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ProductDto>> Get(int id) =>
            await _service.GetAsync(id) is { } dto ? dto : NotFound();

        [HttpPost]
        public async Task<ActionResult<ProductDto>> Create(CreateProductRequest body)
        {
            var saved = await _service.CreateAsync(body);
            return CreatedAtAction(nameof(Get), new { id = saved.Id }, saved);   // 201 + Location
        }
    }

Three things React depends on here:

- **One /api prefix.** API paths never collide with React routes, and proxying, nginx and CORS rules
  become one line each.
- **DTOs, not EF entities.** An entity with navigation properties either drags half the database into
  the JSON or fails with "A possible object cycle was detected" from System.Text.Json.
- **camelCase JSON.** ASP.NET Core serialises with the web defaults, so the C# property ProductDto.Id
  arrives in JavaScript as **id** and UnitPrice as **unitPrice**. Write the React code against the
  JSON, not against the C# names.

[ApiController] also means the body parameter is bound from JSON without [FromBody] (it is inferred
for complex types), and an invalid model returns 400 before your action runs — the error unit uses that.

## The React side: one client

    // src/api/client.js
    import axios from 'axios';

    export const client = axios.create({
      baseURL: import.meta.env.VITE_API_URL,     // '/api' with the proxy, or a full URL
      timeout: 10000,
    });

    // src/api/products.js
    import { client } from './client';
    export const productsApi = {
      list:   (page = 1) => client.get('/products', { params: { page, pageSize: 20 } }).then(r => r.data),
      get:    id   => client.get('/products/' + id).then(r => r.data),
      create: body => client.post('/products', body).then(r => r.data),
    };

Components and thunks call productsApi and never contain a host name. The next units add the token
and the 401 handling to this same client.

The query string names match the action's parameter names (page, pageSize): simple types are bound
from the route or query string by name, case-insensitively.

## Option 1 in development: the Vite proxy

    // vite.config.js
    export default defineConfig({
      plugins: [react()],
      server: {
        proxy: {
          '/api': { target: 'https://localhost:7080', changeOrigin: true, secure: false },
        },
      },
    });

With VITE_API_URL=/api the browser requests http://localhost:5173/api/products — the same origin as
the page — and Vite forwards it to Kestrel. No CORS is involved. secure: false lets the proxy accept
the ASP.NET Core development certificate; pointing the target at the http URL instead avoids the
question (but then UseHttpsRedirection in Program.cs may answer with a 307 to the https port). The
proxy exists only in npm run dev; the production build is static files with no proxy in it.

## Option 2 in development: call Kestrel directly

With VITE_API_URL=https://localhost:7080/api the browser calls across origins and the API must send
CORS headers (next unit). Either option works; know which one you are using, because it decides whether
a CORS error is even possible.

## VITE_ variables are build-time constants

Vite exposes only variables prefixed VITE_ on import.meta.env, and **writes their values into the
bundle when you build**. Changing an environment variable on the server afterwards changes nothing.
Never put a secret in one — anyone can read the bundle.

## Common mistakes

- Reading **res.data.Id** in React. The JSON property is id; Id is undefined.
- A route of [Route("api/products")] **and** baseURL '/api' **and** calls to '/api/products' —
  the request goes to /api/api/products and returns 404.
- Returning the EF entity with its Category and Reviews navigations — a cycle error or a huge payload.
- Proxying to the https port without secure: false and getting a self-signed certificate error in the
  Vite terminal.`,
    mcqs: [
      mcq('A C# record ProductDto(int Id, string Name, decimal UnitPrice) is returned from an ASP.NET Core 8 controller with default settings. Which JavaScript expression reads the price in React?', [
        ['res.data.UnitPrice, exactly as the C# property is spelt', false],
        ['res.data.unitPrice, because the web JSON defaults use camelCase', true],
        ['res.data.unit_price, since System.Text.Json uses snake_case', false],
        ['res.data["UnitPrice"], the only way to read a PascalCase key', false],
      ], 'ASP.NET Core configures System.Text.Json with the web defaults, which include a camelCase naming policy. The property UnitPrice is written as unitPrice in the response body.'),
      mcq('A controller action ends with return CreatedAtAction(nameof(Get), new { id = saved.Id }, saved). What does the React code that awaited client.post receive?', [
        ['Status 200 and an empty body; the URL of the product is in res.data', false],
        ['Status 201, the saved DTO in res.data and the URL in the Location header', true],
        ['Status 204 with no body, because creation results never return content', false],
      ], 'CreatedAtAction produces 201 Created, writes the URL of the Get action for that id into Location, and serialises the third argument as the body, which axios puts on res.data.'),
      mcq("vite.config.js proxies '/api' to https://localhost:7080 without secure: false, and the Vite terminal logs a self-signed certificate error on every call. What is the cleanest development fix?", [
        ['Add secure: false to the proxy entry, or target the http port', true],
        ['Run dotnet dev-certs https --clean so Kestrel stops using TLS', false],
        ['Disable CORS in Program.cs, since the proxy request is cross-origin', false],
        ['Switch the client to fetch, which ignores certificate problems', false],
      ], 'The proxy runs in Node, which does not trust the ASP.NET Core development certificate. secure: false tells it to accept the certificate; targeting the http endpoint avoids TLS altogether.'),
    ],
    checkpoint: [
      ck('REST_APIS', "The controller has [Route(\"api/[controller]\")] on ProductsController and the client's baseURL is '/api'. Which call reaches [HttpGet(\"{id:int}\")] for product 12?", [
        ["client.get('/api/products/12')", false],
        ["client.get('/products', { params: { id: 12 } })", false],
        ["client.get('/products/12')", true],
        ["client.get('/Products/Get/12')", false],
      ], 'axios joins baseURL and path into /api/products/12, which the controller token [controller] and the {id:int} template match. Repeating /api doubles the prefix, and the id is a route value, not a query parameter.'),
      ck('REST_APIS', 'GET /api/orders/5 returns an Order entity loaded with Include(o => o.Customer).ThenInclude(c => c.Orders), and serialisation throws a JsonException about a possible object cycle. What is the right fix for an API that React consumes?', [
        ['Project the order to an OrderDto holding only the fields the page shows', true],
        ['Add .AsNoTracking() to the query so EF Core stops fixing up references', false],
        ['Return the entity as a string from JsonSerializer.Serialize in the action', false],
      ], 'The cycle comes from Customer.Orders pointing back at the order. A DTO breaks the cycle and also fixes the contract, so database changes do not silently change the JSON React reads.'),
      ck('REST_APIS', 'The action is public Task<PagedResult<ProductDto>> List(int page = 1, int pageSize = 20). React calls client.get(\'/products\', { params: { page: 3, size: 50 } }). What does the API use?', [
        ['page 3 and pageSize 50, since size is accepted as an alias', false],
        ['A 400 response, because size is not a parameter of the action', false],
        ['page 3 and pageSize 20, since size matches no parameter', true],
        ['page 1 and pageSize 20, since the query string is not bound', false],
      ], 'Simple parameters are bound by name from the query string. size binds to nothing and is ignored, so pageSize keeps its default; the client must send pageSize.'),
    ],
  },

  /* ── CORS ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_DOTNET_CORS',
    notes: `**An origin is scheme + host + port.** http://localhost:5173 and https://localhost:7080 are
different origins; so are https://app.example.com and https://api.example.com. When a page calls
another origin, the browser sends the request but **only gives the response to your JavaScript if the
response says that origin is allowed**. The server declares the policy; the browser enforces it.
curl, Postman and server-to-server calls ignore CORS entirely.

## The preflight

A plain GET goes straight out. A PUT or DELETE, a JSON Content-Type or an Authorization header makes
the browser first send an **OPTIONS preflight** asking permission:

    OPTIONS /api/products/7
    Origin: http://localhost:5173
    Access-Control-Request-Method: PUT
    Access-Control-Request-Headers: authorization,content-type

If the policy allows it, ASP.NET Core's CORS middleware answers the preflight itself — a 204 with the
Access-Control-Allow-* headers — and the controller never sees the OPTIONS request. A logged-in React
app sends Authorization on almost every call, so almost every call is preflighted.

## A named policy from configuration

    // appsettings.json
    "Cors": { "Origins": [ "http://localhost:5173" ] }

    // Program.cs
    var origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [];

    builder.Services.AddCors(options =>
    {
        options.AddPolicy("frontend", policy => policy
            .WithOrigins(origins)                 // exact origins, no trailing slash
            .WithMethods("GET", "POST", "PUT", "DELETE")
            .WithHeaders("Authorization", "Content-Type")
            .WithExposedHeaders("Location", "Content-Disposition"));
    });

    var app = builder.Build();
    app.UseExceptionHandler();
    app.UseHttpsRedirection();
    app.UseCors("frontend");                     // before authentication and authorization
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();

In production the origin comes from an environment variable (Cors__Origins__0=https://app.example.com),
so the same build serves every environment.

## The rules that bite

- **Order.** UseCors goes after UseRouting (when you call it explicitly) and **before UseAuthentication
  and UseAuthorization**. Placed after them, a token-less preflight can be challenged with 401 before
  any CORS header is added, and the browser reports a CORS failure.
- **No trailing slash.** WithOrigins("http://localhost:5173/") never matches, because the browser's
  Origin header has no slash. No header is returned and the call fails.
- **Credentials and wildcards do not mix.** AllowAnyOrigin() with AllowCredentials() is rejected by
  ASP.NET Core — the CORS protocol forbids a wildcard origin with credentials. You only need
  AllowCredentials() when the browser sends cookies; a bearer token in a header does not need it.
- **Exposed headers.** Script can read only a few "safe" response headers across origins. To read
  Location after a 201, or Content-Disposition for a download filename, list them in
  WithExposedHeaders.
- **Errors may lose their CORS headers.** When an exception escapes, UseExceptionHandler clears the
  response before writing the 500, and headers already added on the way in can go with it. The browser
  then reports a CORS error that hides the real one. Look at the server log, not just the console.

## Per-endpoint control

    [EnableCors("frontend")]      // on a controller or action, with app.UseCors() and no default
    [DisableCors]                 // opt one endpoint out

    app.MapGet("/api/ping", () => "ok").RequireCors("frontend");    // minimal APIs

A global policy (UseCors("frontend")) is simpler and is what most applications need.

## Or avoid CORS altogether

If one host serves the React files and forwards /api to the API on the same scheme, host and port —
the Vite proxy in development, nginx or the API's own static file middleware in production — every
call is same-origin and there is no CORS to configure.`,
    mcqs: [
      mcq('Program.cs calls app.UseAuthentication(); app.UseAuthorization(); app.UseCors("frontend"); in that order. The browser blocks every PUT with a CORS error while GETs without a token succeed. What should change?', [
        ['Move UseCors above UseAuthentication and UseAuthorization', true],
        ['Add [AllowAnonymous] to every PUT action in the controllers', false],
        ['Replace WithOrigins with AllowAnyOrigin so preflight is skipped', false],
      ], 'The preflight carries no token. With CORS after the auth middleware it can be rejected before the CORS middleware adds its headers. Microsoft documents UseCors before UseAuthentication and UseAuthorization.'),
      mcq('After a successful POST, React reads res.headers.location to navigate to the new item, but it is always undefined, although the Network tab shows the Location header. What is missing?', [
        ['Location must be added with WithExposedHeaders in the CORS policy', true],
        ['CreatedAtAction only writes Location for same-origin requests', false],
        ['axios lower-cases headers, so the key is res.headers.Location', false],
        ['The policy needs AllowCredentials before any header is readable', false],
      ], 'Across origins the browser lets script read only CORS-safelisted response headers. Location is not one of them, so the policy has to expose it explicitly.'),
      mcq('A developer writes policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod().AllowCredentials() to "fix CORS quickly". What happens?', [
        ['Every origin may now send cookies, which works but is unsafe', false],
        ['ASP.NET Core rejects the policy: wildcard origins cannot allow credentials', true],
        ['The browser ignores AllowCredentials whenever the policy origin is a wildcard value', false],
      ], 'The CORS specification forbids Access-Control-Allow-Origin: * together with credentials, and ASP.NET Core refuses that combination rather than emit an invalid policy. List the real origins instead.'),
    ],
    checkpoint: [
      ck('REST_APIS', 'Production has Cors__Origins__0=https://shop.example.com/ and the site https://shop.example.com gets CORS errors on every call, while Postman works. What is wrong?', [
        ['Postman sends no Origin header, so the API treats it as same-origin', false],
        ['The configured origin ends in a slash and never matches the Origin header', true],
        ['Environment variables cannot set array entries such as Cors:Origins:0 in ASP.NET Core', false],
        ['https origins need AllowCredentials before WithOrigins matches them', false],
      ], 'Browsers send the origin without a path, so "https://shop.example.com/" is never equal to it and no Access-Control-Allow-Origin header is written. Postman ignores CORS, which is why it works.'),
      ck('REST_APIS', 'The React app sends the JWT in an Authorization header and no cookies. Does the "frontend" CORS policy need AllowCredentials()?', [
        ['No; a bearer header needs the header allowed, not credentials', true],
        ['Yes; any Authorization header counts as a browser credential', false],
        ['Yes; without it the preflight for a PUT always returns 405', false],
      ], 'Credentials in CORS means cookies and HTTP authentication managed by the browser. A header your script sets only has to be listed in the allowed headers.'),
      ck('REST_APIS', 'Which setup lets the deployed React app call the API with no CORS configuration at all?', [
        ['Serving the React files and the API from one origin, with /api forwarded', true],
        ['Deploying the API and the frontend to the same Azure resource group', false],
        ['Adding [DisableCors] to every controller so the browser skips its checks', false],
        ['Using fetch with mode: "no-cors", which still returns readable JSON', false],
      ], 'CORS applies only across origins. If nginx or the API itself serves the build and /api lives on the same scheme, host and port, every call is same-origin. no-cors gives an opaque, unreadable response.'),
    ],
  },

  /* ── JWT_LOGIN_FLOW ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_DOTNET_JWT_LOGIN_FLOW',
    notes: `**The login flow has six steps and each half owns some of them.** ASP.NET Core checks the
password, issues the token and validates it on every request. React collects the credentials, keeps
the token, sends it, guards screens and reacts when the token stops working.

## 1. The login endpoint

    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<AppUser> _users;
        private readonly ITokenService _tokens;
        public AuthController(UserManager<AppUser> users, ITokenService tokens)
            { _users = users; _tokens = tokens; }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<ActionResult<LoginResponse>> Login(LoginRequest req)
        {
            var user = await _users.FindByEmailAsync(req.Email);
            if (user is null || !await _users.CheckPasswordAsync(user, req.Password))
                return Problem(statusCode: 401, title: "Invalid email or password.");
            var roles = await _users.GetRolesAsync(user);
            var (token, expires) = _tokens.Issue(user, roles);
            return new LoginResponse(token, expires, roles);
        }
    }

One message for both "no such user" and "wrong password", so the endpoint does not reveal which emails
are registered. (Identity's .NET 8 MapIdentityApi<TUser>() also offers /login, but it issues its own
opaque bearer tokens, not JWTs; this track issues JWTs so the claims are visible and portable.)

## 2. Issuing and validating the token

    public (string, DateTime) Issue(AppUser user, IList<string> roles)
    {
        var claims = new List<Claim> {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email!) };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_opt.Key));  // ≥ 32 bytes for HS256
        var expires = DateTime.UtcNow.AddMinutes(30);
        var jwt = new JwtSecurityToken(_opt.Issuer, _opt.Audience, claims,
            expires: expires, signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return (new JwtSecurityTokenHandler().WriteToken(jwt), expires);
    }

    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(o => o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = jwt.Issuer, ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            ClockSkew = TimeSpan.FromMinutes(1),      // the default is 5 minutes
        });

The JwtBearer handler reads Authorization: Bearer, checks signature, issuer, audience and lifetime, and
builds HttpContext.User. ClockSkew is extra tolerance after exp: with the default, a 30-minute token is
still accepted for up to 35 minutes.

## 3. Keeping the token — the honest trade-off

| Where | Survives refresh | Readable by injected script | CSRF exposure |
|---|---|---|---|
| Memory (Redux, a variable) | No | Not stored, though XSS can still call the API while the tab is open | None |
| localStorage | Yes | **Yes** | None |
| httpOnly cookie | Yes | No | **Yes — sent automatically** |

localStorage is acceptable for a learning project with short-lived tokens, written down as a decision.
The production pattern is a short access token in memory plus a refresh token in an httpOnly, Secure,
SameSite cookie, exchanged on page load.

## 4. Sending it on every call

    client.interceptors.request.use(config => {
      const token = store.getState().auth.token;
      if (token) config.headers.Authorization = 'Bearer ' + token;
      return config;
    });

## 5. Guarding screens — and the server's guard

    function RequireAuth({ role }) {
      const { token, roles } = useSelector(s => s.auth);
      const location = useLocation();
      if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
      if (role && !roles.includes(role)) return <Navigate to="/forbidden" replace />;
      return <Outlet />;
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id) { await _service.DeleteAsync(id); return NoContent(); }

The React guard is user experience. [Authorize] is the security.

## 6. When it stops working: 401 versus 403

- **401** — the JwtBearer handler found no valid token (missing, expired, wrong signature). The response
  carries a WWW-Authenticate: Bearer header, with error="invalid_token" when a token was sent but
  rejected. Log the user out and keep where they were going.
- **403** — the token is valid but [Authorize(Roles = "Admin")] or a policy failed. The user is logged
  in; show "no access" and do **not** log them out.

    client.interceptors.response.use(r => r, err => {
      const status = err.response?.status;
      const isLogin = err.config?.url?.endsWith('/auth/login');
      if (status === 401 && !isLogin) store.dispatch(sessionExpired());
      return Promise.reject(err);
    });

The login call is excluded: a wrong password is also a 401, and the form has to show it.

## Common mistakes

- A Jwt:Key shorter than 32 bytes: HS256 needs a 256-bit key, and token creation throws.
- Signing with one key and validating with another (a key in user-secrets locally, a different one in
  production) — every request is 401 with error="invalid_token".
- Forgetting app.UseAuthentication(): HttpContext.User is never set and every [Authorize] endpoint
  returns 401 even with a perfect token.
- Logging out on 403.
- Putting Jwt:Key in appsettings.json in a public repository.`,
    workedExample: `**Goal: log in, survive a refresh, return to the page the user wanted, and log out when the
token expires.**

**Step 1 — the slice, initialised from storage.**

    const saved = JSON.parse(localStorage.getItem('auth') || 'null');

    const authSlice = createSlice({
      name: 'auth',
      initialState: saved ?? { token: null, roles: [], expires: null },
      reducers: {
        loggedIn: (s, a) => { Object.assign(s, a.payload); localStorage.setItem('auth', JSON.stringify(a.payload)); },
        sessionExpired: s => { s.token = null; s.roles = []; localStorage.removeItem('auth'); },
      },
    });

Reading storage into initialState is what makes a refresh keep the session. Writing without reading
back is the classic "refresh logs me out" bug.

**Step 2 — the login page sends the user back.**

    const from = useLocation().state?.from?.pathname ?? '/';
    async function submit(form) {
      try {
        const data = await authApi.login(form);          // { token, expires, roles }
        dispatch(loggedIn(data));
        navigate(from, { replace: true });
      } catch (e) {
        setError(e.response?.status === 401 ? 'Wrong email or password.' : 'Could not sign in. Try again.');
      }
    }

RequireAuth stored the original location in router state; the login page reads it.

**Step 3 — log out on time, not one failed request late.**

    useEffect(() => {
      if (!expires) return;
      const ms = new Date(expires).getTime() - Date.now();
      const t = setTimeout(() => dispatch(sessionExpired()), Math.max(ms, 0));
      return () => clearTimeout(t);
    }, [expires]);

The API returned expires alongside the token, so the client does not even need to decode the JWT.

**Step 4 — prove the server side.** With a USER token, call DELETE /api/products/3 from curl:

    curl -i -X DELETE https://localhost:7080/api/products/3 -H "Authorization: Bearer <user token>"
    HTTP/1.1 403 Forbidden

Then wait past expiry plus ClockSkew and repeat any call: 401 with WWW-Authenticate: Bearer
error="invalid_token". Both checks bypass React entirely — they test the controls that protect the data.`,
    mcqs: [
      mcq('TokenValidationParameters sets no ClockSkew and tokens are issued with a 15-minute lifetime. A tester sees a token still accepted 18 minutes after login. Why?', [
        ['JwtBearer refreshes a token automatically if it is used often', false],
        ['The default ClockSkew of five minutes extends the accepted lifetime', true],
        ['exp is measured in local time, so the server is three minutes behind', false],
        ['Lifetime is only checked when ValidateIssuerSigningKey is false', false],
      ], 'ClockSkew allows for clocks that disagree between servers, and its default is five minutes. Set it lower, or to TimeSpan.Zero, when exact expiry matters.'),
      mcq('Every protected call returns 401 although the Network tab shows a correct Authorization: Bearer header. Program.cs has AddAuthentication().AddJwtBearer(...) and app.UseAuthorization(). What is the likely gap?', [
        ['app.UseAuthentication() is never called, so no user is ever set', true],
        ['UseAuthorization must come before MapControllers is registered', false],
        ['The header must be lower-case bearer for ASP.NET Core to accept it', false],
      ], 'The authentication middleware is what runs the JwtBearer handler and sets HttpContext.User. Without it the authorization middleware sees an anonymous user and challenges with 401.'),
      mcq('A user with the Customer role calls an action marked [Authorize(Roles = "Admin")] with a valid token. What should the React response interceptor do?', [
        ['Log the user out, because the API returned an authorization error', false],
        ['Retry once after refreshing, as a 401 means the token was stale', false],
        ['Show a no-access message; the 403 says the user is logged in', true],
      ], 'A valid token with the wrong role gives 403 Forbidden. The session is fine, so logging out would be wrong; only 401 means the token itself is missing or rejected.'),
    ],
    checkpoint: [
      ck('AUTHENTICATION', 'Locally the API reads Jwt:Key from user-secrets. In production, login works but the very next request returns 401 with WWW-Authenticate: Bearer error="invalid_token". What is the most likely cause?', [
        ['The token is issued with one key and validated with a different one', true],
        ['Production hosts strip the Authorization header from every request', false],
        ['JWTs must be re-issued for each host name the browser has visited', false],
      ], 'invalid_token means a token arrived and failed validation. A signing key that differs between the issuing code and AddJwtBearer, often from two configuration sources, gives exactly this.'),
      ck('AUTHENTICATION', 'The response interceptor dispatches sessionExpired() on every 401. Users who mistype their password are sent away from the login form with no message. What fixes it?', [
        ['Make the API return 400 for a wrong password instead of 401', false],
        ['Skip the 401 handling when the failing request is the login call', true],
        ['Catch the error in the thunk before the interceptor can run', false],
        ['Move the check into a request interceptor so it runs before the response arrives', false],
      ], 'A wrong password is a genuine 401, and the login form must display it. Excluding the login URL keeps the session-expired logic for calls that were authenticated.'),
      ck('AUTHENTICATION', 'Which statement about the React RequireAuth guard and [Authorize(Roles = "Admin")] is correct?', [
        ['The guard alone suffices if the admin routes are lazily loaded', false],
        ['[Authorize] is optional once the React guard redirects non-admins', false],
        ['The guard improves the UI; [Authorize] is what protects the data', true],
      ], 'Anyone can call the API with curl and a valid token, skipping React. Only the server-side check stops a non-admin from reaching admin data; the guard just avoids showing screens that would fail.'),
    ],
  },

  /* ── FILE_UPLOAD ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_DOTNET_FILE_UPLOAD',
    notes: `**A file upload is a multipart/form-data request.** The browser splits the body into parts
separated by a boundary string; one part holds the file bytes and its filename, others hold ordinary
form fields. ASP.NET Core gives you each file part as an **IFormFile**.

## React: FormData, and let the browser set the header

    async function upload(productId, file, onProgress) {
      const form = new FormData();
      form.append('file', file);                       // the name must match the action parameter
      form.append('caption', caption);
      const res = await client.post('/products/' + productId + '/images', form, {
        onUploadProgress: e => onProgress(Math.round(100 * e.loaded / (e.total ?? 1))),
      });
      return res.data;
    }

    <input type="file" accept="image/png,image/jpeg" onChange={e => setFile(e.target.files[0])} />

Do **not** set Content-Type yourself: the header must include the boundary, which only the browser
knows. accept on the input is a convenience for the user, not validation.

## ASP.NET Core: IFormFile, validated

    [HttpPost("{id:int}/images")]
    [RequestSizeLimit(5 * 1024 * 1024)]                // the whole request, in bytes
    public async Task<ActionResult<ImageDto>> Upload(int id, IFormFile file, [FromForm] string? caption)
    {
        if (file.Length == 0) return Problem(statusCode: 400, title: "The file is empty.");
        if (file.Length > 2 * 1024 * 1024) return Problem(statusCode: 400, title: "Images must be 2 MB or smaller.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not (".png" or ".jpg" or ".jpeg"))
            return Problem(statusCode: 400, title: "Only PNG and JPEG images are allowed.");

        var key = Guid.NewGuid().ToString("N") + ext;   // never the user's file name
        await using (var stream = _storage.OpenWrite(key))
            await file.CopyToAsync(stream);

        var image = await _service.AttachImageAsync(id, key, file.ContentType, caption);
        return CreatedAtAction(nameof(GetImage), new { key }, image);
    }

With [ApiController], a parameter of type IFormFile is bound from the form automatically ([FromForm]
is inferred). The parameter name file must match the form field name; a mismatch leaves it null.

**What to check, and why:**

- **Size.** file.Length on the server, whatever the browser claims.
- **Type.** The extension against an allow-list, and for anything that matters the first bytes (a PNG
  starts with 89 50 4E 47). file.ContentType comes from the client and can be anything.
- **Name.** file.FileName is attacker-controlled: "../../appsettings.json" is a valid value. Store under
  a generated key and keep the original name only as data, if at all.
- **Place.** Not under wwwroot (that would serve uploads as static files with no authorisation), and
  not inside the container's filesystem in production (a redeploy erases it) — a mounted volume or
  blob storage.

## The size limits, outside in

| Layer | Default | Setting |
|---|---|---|
| nginx in front | 1 MB | client_max_body_size |
| Kestrel, whole request | 30,000,000 bytes (about 28.6 MB) | KestrelServerOptions.Limits.MaxRequestBodySize, or [RequestSizeLimit] per action |
| Multipart body | 128 MB | FormOptions.MultipartBodyLengthLimit, or [RequestFormLimits] |
| Your own rule | — | file.Length check |

A request over Kestrel's limit is rejected with **413 Payload Too Large** before your action runs. The
smallest limit wins, so set the outer ones a little above your own rule and let your code give the
clear message.

## Serving the file back

    [HttpGet("images/{key}")]
    [Authorize]
    public IActionResult GetImage(string key)
    {
        if (!_storage.TryOpenRead(key, out var stream, out var contentType)) return NotFound();
        return File(stream, contentType);                // FileStreamResult, streamed, disposed for you
    }

An <img src> cannot send an Authorization header. For a protected image either fetch it with the client
(responseType: 'blob', then URL.createObjectURL) or issue short-lived signed URLs from the storage
service.

## Minimal API note (.NET 8)

A minimal API endpoint that binds IFormFile takes part in antiforgery validation in .NET 8. A JWT API
called from React usually opts out on that endpoint with .DisableAntiforgery(). Controllers with
[ApiController] are not affected.`,
    mcqs: [
      mcq("React appends the file with form.append('image', file) and the action is Upload(int id, IFormFile file). The request succeeds but file is null. Why?", [
        ['IFormFile is bound only when the parameter has [FromBody]', false],
        ['The form field name image does not match the parameter name file', true],
        ['axios sends FormData as JSON unless multipart is set manually', false],
        ['IFormFile is only filled for files larger than the buffer threshold', false],
      ], 'Model binding matches form parts to parameters by name. Rename the field to file, or bind it with [FromForm(Name = "image")].'),
      mcq('Why should the API store an upload under Guid.NewGuid() plus an allowed extension instead of file.FileName?', [
        ['FileName is sent by the client and may contain path segments such as ../', true],
        ['FileName is always null for files uploaded from a browser through axios', false],
        ['Guid names make CopyToAsync faster because no encoding has to happen', false],
      ], 'The original name is attacker-controlled input. A generated key cannot escape the storage folder or overwrite another user\'s file, and the original name can be kept as a column if the UI needs it.'),
      mcq('A 40 MB upload to an action with no size attributes fails with 413 before the action runs, behind no proxy. Which limit stopped it?', [
        ['FormOptions.MultipartBodyLengthLimit, whose default is 30 MB', false],
        ['The browser, which refuses multipart bodies over 32 MB', false],
        ['Kestrel\'s MaxRequestBodySize, about 28.6 MB by default', true],
      ], 'Kestrel caps the request body at 30,000,000 bytes by default and answers 413. The multipart limit defaults to 128 MB, so it is not the one hit here.'),
    ],
    checkpoint: [
      ck('REST_APIS', 'An upload uses fetch with headers: { "Content-Type": "multipart/form-data", Authorization: auth } and body: form, and the API never binds the file. What is wrong?', [
        ['A fixed multipart header lacks the boundary the browser would generate', true],
        ['multipart/form-data must be sent with a PUT, never with a POST', false],
        ['The client must base64-encode the file into a JSON property first', false],
        ['ASP.NET Core requires the charset parameter on any multipart header it receives', false],
      ], 'The multipart parser needs the boundary parameter to split the body. Leave Content-Type unset for FormData so the browser writes multipart/form-data; boundary=... itself.'),
      ck('REST_APIS', 'Uploads are saved to wwwroot/uploads and the app calls app.UseStaticFiles(). Images are meant to be private to their owners. What is the problem?', [
        ['UseStaticFiles cannot serve files that were written at runtime', false],
        ['Anyone with the URL can download the file without any authorisation', true],
        ['wwwroot is read-only in development, so writes fail silently there', false],
      ], 'The static file middleware serves wwwroot directly and runs no authorization checks. Store private uploads outside wwwroot and serve them through an [Authorize] action.'),
      ck('REST_APIS', 'An admin page shows <img src="/api/products/images/abc.png"> and the action has [Authorize]. The image is broken although the admin is logged in with a token in Redux. Why?', [
        ['The image endpoint should return base64 text inside JSON instead', false],
        ['img tags request only from the page\'s own origin and never reach /api routes', false],
        ['The browser loads img sources itself and sends no Authorization header', true],
        ['File(stream, contentType) is not allowed on an [Authorize] action', false],
      ], 'The interceptor adds the header only to axios calls. Fetch the image with the client as a blob and use URL.createObjectURL, or have the API hand out short-lived signed URLs.'),
    ],
  },

  /* ── ERRORS_ACROSS ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_DOTNET_ERRORS_ACROSS',
    notes: `**One error contract, two halves that both honour it.** ASP.NET Core already speaks RFC 7807/9457
ProblemDetails (Content-Type application/problem+json). The job is to make every error use it — 400,
401, 403, 404, 409 and 500 — and to make React read it in one place.

## What the API sends

Validation failures come for free with [ApiController]: an invalid model never reaches the action, and
the client gets a **400 with ValidationProblemDetails**:

    {
      "type": "https://tools.ietf.org/html/…",
      "title": "One or more validation errors occurred.",
      "status": 400,
      "errors": {
        "Name":  [ "The Name field is required." ],
        "Price": [ "Price must be between 1 and 100000." ]
      },
      "traceId": "00-4f1c…-01"
    }

Note the keys: by default they are the **C# property names** (Name, Price), even though the JSON body
used name and price. From .NET 7 you can register SystemTextJsonValidationMetadataProvider in
AddControllers to make the keys follow the JSON names; otherwise the client normalises them.

Everything else is made consistent in Program.cs:

    builder.Services.AddProblemDetails();
    builder.Services.AddExceptionHandler<AppExceptionHandler>();   // IExceptionHandler, .NET 8

    var app = builder.Build();
    app.UseExceptionHandler();      // first: unhandled exceptions → ProblemDetails 500
    app.UseStatusCodePages();       // empty 401/403/404 bodies → ProblemDetails too

    public class AppExceptionHandler(IProblemDetailsService problems) : IExceptionHandler
    {
        public async ValueTask<bool> TryHandleAsync(HttpContext ctx, Exception ex, CancellationToken ct)
        {
            var (status, title) = ex switch
            {
                NotFoundException     => (404, "Not found."),
                ConflictException c   => (409, c.Message),
                _                     => (500, "Something went wrong on our side."),
            };
            ctx.Response.StatusCode = status;
            return await problems.TryWriteAsync(new() { HttpContext = ctx,
                ProblemDetails = { Status = status, Title = title } });
        }
    }

The 500 title is deliberately generic. The exception and its stack trace go to the log, keyed by the
traceId, never into the response. (The developer exception page shows details only in Development.)

## What React does with it: one normaliser

    // src/api/errors.js
    export function toAppError(err) {
      if (!err.response) {
        return { kind: 'network', message: 'Cannot reach the server. Check your connection and retry.' };
      }
      const p = err.response.data ?? {};
      const fields = {};
      for (const [k, v] of Object.entries(p.errors ?? {})) {
        const key = k.charAt(0).toLowerCase() + k.slice(1);   // "Price" → "price"
        fields[key] = v[0];
      }
      return { kind: 'http', status: err.response.status, message: p.title ?? 'Request failed.', fields, traceId: p.traceId };
    }

**No response means the request never got an HTTP answer**: the API was down, DNS failed, CORS blocked
it, or the timeout fired (axios sets err.code to 'ERR_NETWORK' or 'ECONNABORTED'). That is the case
most apps forget; it deserves its own message and a Retry button.

## Showing it in the form

    const [errors, setErrors] = useState({});
    async function save(values) {
      try { await productsApi.create(values); navigate('/products'); }
      catch (e) {
        const appErr = toAppError(e);
        setErrors(appErr.fields);
        setBanner(Object.keys(appErr.fields).length ? null : appErr.message);
      }
    }

    <input name="price" className={errors.price ? 'form-control is-invalid' : 'form-control'} />
    {errors.price && <div className="invalid-feedback">{errors.price}</div>}

Client-side checks give quick feedback; the server's messages are the ones that count, because the
server is the one that refuses.

## Status by status

| Status | Meaning for the UI |
|---|---|
| 400 with errors | Show each message under its field |
| 400 without errors | Show the title in a banner |
| 401 | Session over: log out, return after login (except on the login form) |
| 403 | Logged in but not allowed: a no-access message |
| 404 | A not-found page or message |
| 409 | A conflict the user can fix ("that SKU already exists") |
| 5xx | A generic apology, the traceId for support, and Retry |
| no response | The network message and Retry |`,
    mcqs: [
      mcq('An invalid POST to an [ApiController] action returns 400 with errors: { "Price": [...] }, and the React form keys its errors by the input name price. Nothing appears under the field. Why?', [
        ['The errors object is only sent when the request is a form post', false],
        ['The keys are C# property names by default; React must map Price to price', true],
        ['400 responses are rejected by axios before the body is parsed', false],
        ['ValidationProblemDetails puts field errors in the detail string only', false],
      ], 'By default model state keys use the CLR property names. Normalise the first letter in the error mapper, or register SystemTextJsonValidationMetadataProvider (.NET 7+) so keys follow the JSON names.'),
      mcq('In the error normaliser, err.response is undefined. Which situation does that indicate?', [
        ['The API answered 500 and its body was HTML, so it could not be parsed as JSON', false],
        ['The server returned 204, so there was nothing to parse', false],
        ['No HTTP response reached the code: down, blocked by CORS or timed out', true],
      ], 'axios only fills err.response when an HTTP response arrived. A network failure, a CORS rejection or a timeout leaves it undefined; that case needs its own message and a retry.'),
      mcq('Program.cs has AddProblemDetails() and UseExceptionHandler(). NotFound() from an [ApiController] action returns a ProblemDetails body, but a request to a URL that matches no route gets a 404 with an empty body. What adds a body there?', [
        ['Calling app.UseStatusCodePages(), which fills empty error responses', true],
        ['Throwing a NotFoundException so that the exception handler formats it', false],
        ['Adding [ApiController] to every controller once more at assembly level', false],
        ['Registering the IExceptionHandler a second time with AddExceptionHandler', false],
      ], 'No action ran for an unmatched URL, so the [ApiController] client error mapping never applied and no exception was thrown. The status code pages middleware writes a ProblemDetails body for empty error responses when AddProblemDetails is registered.'),
    ],
    checkpoint: [
      ck('REST_APIS', 'An unhandled SqlException in production returns a 500 whose body contains the exception message with a table name. Which change follows the contract in this unit?', [
        ['Catch Exception in every action and return Ok with an error flag set', false],
        ['Return a generic ProblemDetails title and log the exception with its traceId', true],
        ['Turn on the developer exception page so the stack trace is formatted', false],
        ['Send the exception message in the detail field but drop the stack trace entirely', false],
      ], 'Internals such as table names help attackers and confuse users. The handler logs the exception and writes a generic 500 ProblemDetails; the traceId connects the user\'s report to the log.'),
      ck('REST_APIS', 'Creating a product with a SKU that already exists should let the user fix it. Which response suits the React form best?', [
        ['500 with the DbUpdateException message from SQL Server', false],
        ['200 with { "success": false } in the body so axios does not throw', false],
        ['409 ProblemDetails whose title says the SKU is already used', true],
      ], 'A conflict with existing data is a 409, and a ProblemDetails title gives the UI a message to show. A 200 hides the failure from every generic error path, and a 500 claims the server is broken.'),
      ck('REST_APIS', 'The exception handler is registered and works, but React shows "Network Error" with no status for a server crash, only on the deployed site where the API is cross-origin. What is the likely reason?', [
        ['The browser hides any 500 response unless the page is served over https', false],
        ['The 500 response lacks CORS headers, so the browser withholds it from script', true],
        ['axios treats every 5xx status code as a network error, whatever the headers', false],
      ], 'If the error response goes out without the Access-Control-Allow-Origin header, the browser blocks it and axios sees no response at all. The real error is in the server log; serving both halves from one origin removes this failure mode.'),
    ],
  },

  /* ── DOCKER ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_DOTNET_DOCKER',
    notes: `**Three containers: SQL Server, the API, and nginx serving the React build.** Each half gets a
multi-stage Dockerfile — a big image to build, a small one to run — and docker compose starts all three
with one command.

## The API image

    # api/Dockerfile
    FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
    WORKDIR /src
    COPY Shop.Api/Shop.Api.csproj Shop.Api/
    RUN dotnet restore Shop.Api/Shop.Api.csproj          # cached until the csproj changes
    COPY . .
    RUN dotnet publish Shop.Api/Shop.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

    FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
    WORKDIR /app
    COPY --from=build /app/publish .
    USER app                                             # the non-root user in .NET 8 images
    EXPOSE 8080
    ENTRYPOINT ["dotnet", "Shop.Api.dll"]

- **sdk vs aspnet.** The SDK image (compilers, NuGet) is for building only. The final image holds the
  ASP.NET Core runtime and your published DLLs — several hundred megabytes smaller, with far less in it
  to patch.
- **Copy the .csproj first.** dotnet restore is the slow step; copying only the project file before it
  means the layer is reused until a package reference changes.
- **Port 8080.** From .NET 8 the official images listen on **8080** by default (ASPNETCORE_HTTP_PORTS),
  not 80 as in .NET 7 and earlier. Map and proxy to 8080, or set ASPNETCORE_HTTP_PORTS yourself.
- **No HTTPS inside.** The container speaks HTTP; TLS ends at nginx or the cloud's load balancer. Remove
  the expectation of a development certificate in the container — UseHttpsRedirection with no HTTPS
  port configured just logs a warning and does not redirect.

A .dockerignore keeps bin/, obj/ and .git out of the build context — otherwise a Windows obj folder
can confuse the Linux restore.

## The frontend image

    # web/Dockerfile
    FROM node:20-alpine AS build
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

    # web/nginx.conf
    server {
      listen 80;
      root /usr/share/nginx/html;
      client_max_body_size 10m;
      location /api/ { proxy_pass http://api:8080; proxy_set_header Host $host; }
      location / { try_files $uri $uri/ /index.html; }
    }

nginx serves the static files and forwards /api to the api service by its compose name, so the browser
sees one origin and no CORS is needed. try_files sends deep links such as /orders/42 to index.html so
React Router can handle them.

## SQL Server and compose

    # compose.yaml
    services:
      db:
        image: mcr.microsoft.com/mssql/server:2022-latest
        environment:
          ACCEPT_EULA: "Y"
          MSSQL_SA_PASSWORD: \${SA_PASSWORD}
        volumes: [ "sqldata:/var/opt/mssql" ]
        healthcheck:
          test: ["CMD-SHELL", "/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P \\"$$MSSQL_SA_PASSWORD\\" -C -Q 'SELECT 1' || exit 1"]
          interval: 10s
          retries: 10
          start_period: 20s
      api:
        build: ./api
        environment:
          ASPNETCORE_ENVIRONMENT: Production
          ConnectionStrings__Default: "Server=db,1433;Database=Shop;User Id=sa;Password=\${SA_PASSWORD};TrustServerCertificate=True"
          Jwt__Key: \${JWT_KEY}
        depends_on:
          db: { condition: service_healthy }
      web:
        build: ./web
        ports: [ "8080:80" ]
        depends_on: [ api ]
    volumes:
      sqldata:

- **Configuration by environment variable.** A double underscore stands for the colon:
  ConnectionStrings__Default is ConnectionStrings:Default, Jwt__Key is Jwt:Key. Environment variables
  override appsettings.json, so the image carries no secrets.
- **Server=db.** Inside the compose network the database is reached by its service name. localhost
  inside the api container is the api container.
- **SA password rules.** SQL Server requires a strong password (at least 8 characters from three of:
  upper case, lower case, digits, symbols); with a weak one the container exits shortly after starting.
- **TrustServerCertificate=True.** Microsoft.Data.SqlClient 4.0 and later encrypt by default, and the
  container's certificate is self-signed. Without this the login fails with "The certificate chain was
  issued by an authority that is not trusted." Accept that for local containers only.
- **The healthcheck.** depends_on alone waits for the container to start, not for SQL Server to accept
  logins. The sqlcmd path is version-specific: recent 2022 images ship mssql-tools18 (with -C to trust
  the certificate); older images used /opt/mssql-tools/bin.
- **The named volume** keeps the database across docker compose down; down -v deletes it.

## Migrations

The aspnet image has no dotnet ef. Either build a migration bundle (dotnet ef migrations bundle) and
run it as a one-off step before the API starts, or call db.Database.Migrate() at startup for a small
single-instance app. Do not ship EnsureCreated(): it skips migrations entirely.`,
    workedExample: `**Goal: docker compose up --build from a fresh clone starts the whole stack, and the app works.**

**Step 1 — the .env file next to compose.yaml (not committed; .env.example is).**

    SA_PASSWORD=Str0ng!Passw0rd
    JWT_KEY=change-me-to-a-random-value-of-at-least-32-bytes

**Step 2 — build and start.**

    docker compose up --build
    docker compose ps

ps should show db as healthy before api starts. If api restarts in a loop, read its log first:

    docker compose logs api --tail 50

**Step 3 — the three classic first-run failures, by their log line.**

- "A network-related or instance-specific error occurred…" — the connection string says
  Server=localhost. Change it to Server=db,1433.
- "The certificate chain was issued by an authority that is not trusted." — add
  TrustServerCertificate=True for the local container.
- "Login failed for user 'sa'." — the API's password differs from MSSQL_SA_PASSWORD, often because
  the volume already holds a database created with an older password. The SA password is set when the
  data directory is first created; docker compose down -v resets it (and deletes the data).

**Step 4 — verify through nginx, as the browser will.**

    curl -i http://localhost:8080/                       # 200, index.html
    curl -i http://localhost:8080/orders/42              # 200, index.html (try_files)
    curl -i http://localhost:8080/api/products           # 200 JSON from the API via the proxy
    curl -i -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"email":"a@b.c","password":"x"}'

Then open http://localhost:8080 and log in. Every request in the Network tab goes to localhost:8080 —
one origin, no CORS.

**Step 5 — restart and check persistence.** docker compose down, then up again: products and users
are still there, because they live in the sqldata volume.`,
    mcqs: [
      mcq('An ASP.NET Core 8 image is run with -p 5000:80 and every request to localhost:5000 gets "connection reset". The app log says it started. What is the likely cause?', [
        ['The .NET 8 images listen on 8080 by default, not on 80', true],
        ['Kestrel refuses to listen inside a container without HTTPS', false],
        ['The aspnet image needs EXPOSE 80 before Kestrel will bind it', false],
        ['The app runs as the non-root user, which blocks inbound traffic', false],
      ], 'From .NET 8 the official images set ASPNETCORE_HTTP_PORTS to 8080. Map 5000:8080, or set the port variable if something must reach port 80.'),
      mcq('Why does the API Dockerfile copy Shop.Api.csproj and run dotnet restore before COPY . .?', [
        ['dotnet publish fails if restore runs in the same layer as the source', false],
        ['The restore layer stays cached until package references change', true],
        ['The final aspnet image needs the restored packages in a separate folder', false],
      ], 'Docker reuses a layer while its inputs are unchanged. Copying only the project file keeps the slow restore cached across ordinary code edits.'),
      mcq('In compose, the api service has ConnectionStrings__Default set and appsettings.json also defines ConnectionStrings:Default. Which value does the app use?', [
        ['The appsettings.json value, because files are read after variables', false],
        ['Neither; double underscores are only read on Windows hosts', false],
        ['The environment variable, which overrides the JSON file', true],
      ], 'The default host adds environment variables after the JSON files, so they win, and __ is translated to the : separator. That is how one image runs in every environment.'),
    ],
    checkpoint: [
      ck('CONTAINERS_DOCKER', 'The api container logs "A network-related or instance-specific error occurred while establishing a connection to SQL Server" with Server=localhost,1433 in its connection string. SQL Server runs in the db service. What is the fix?', [
        ['Publish port 1433 on the db service so localhost can reach it', false],
        ['Use Server=db,1433, the service name on the compose network', true],
        ['Add Encrypt=False so the client stops checking the server name', false],
        ['Start the api container with network_mode: none for isolation', false],
      ], 'Inside a container, localhost is that container. Services on the same compose network reach each other by service name, so the API must connect to db.'),
      ck('CONTAINERS_DOCKER', 'The api service uses depends_on: [db] and fails on its first start with a SQL login error, then works after a restart. What makes the start order reliable?', [
        ['A db healthcheck running a sqlcmd query, with condition: service_healthy', true],
        ['Listing db twice in depends_on so compose waits for two separate start events', false],
        ['Setting restart: no on the api so that it waits for the database', false],
      ], 'Plain depends_on waits only for the db container to start. SQL Server takes several seconds before it accepts logins; a healthcheck plus service_healthy waits for that.'),
      ck('CONTAINERS_DOCKER', 'The SQL Server container exits a few seconds after docker compose up, and its log complains about the password. MSSQL_SA_PASSWORD is "shop123". What is wrong?', [
        ['The variable must be called SA_PASSWORD_HASH in 2022 images', false],
        ['ACCEPT_EULA must be set to true in lower case, not Y', false],
        ['The password does not meet SQL Server\'s complexity policy', true],
        ['SQL Server needs port 1433 published on the host to start', false],
      ], 'The SA password must be at least eight characters and use three of the four character classes. With a weak value the setup fails and the container stops.'),
    ],
  },

  /* ── DEPLOY ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_DOTNET_DEPLOY',
    notes: `**Deploying is configuration, not code.** The same build runs on your laptop, in compose and in
the cloud; what changes is the connection string, the JWT key, the allowed origins and the environment
name. Get those right and verify, and the deploy is done.

## The pieces

    Browser ──HTTPS──▶ frontend (static files)            ┐ or one host: the API serves
                       │                                  │ the React build from wwwroot
                       ▼ /api                             ┘
                     ASP.NET Core API (App Service or a container host)
                       │  TLS, SQL login or managed identity
                     Azure SQL Database (or another managed SQL Server)

Two common shapes:

1. **One origin.** Copy the React dist into the API's wwwroot at build time and add
   app.UseStaticFiles(); and app.MapFallbackToFile("index.html"); after the API endpoints. One App
   Service, one URL, no CORS.
2. **Two hosts.** The React build on a static host (Azure Static Web Apps, or any CDN) and the API on
   its own URL, with CORS allowing exactly the frontend origin and VITE_API_URL baked into the frontend
   build.

## Configuration on the host

ASP.NET Core reads the same keys from wherever they are set. On Azure App Service:

- **Application settings** become environment variables: Jwt__Key, Cors__Origins__0, and so on.
  (On Linux use the __ form; the portal also accepts Jwt:Key on Windows plans.)
- **Connection strings** set there are available as ConnectionStrings:Default to your code.
- **ASPNETCORE_ENVIRONMENT** defaults to Production when unset. That decides which appsettings.{Env}.json
  loads, hides the developer exception page, and — in the default template — turns off Swagger.
- **User secrets are a development tool.** dotnet user-secrets is loaded only in Development; a key kept
  there locally is simply missing in production.
- For real secrets prefer **Azure Key Vault** (with a Key Vault reference in the app setting) or a
  managed identity to the database, so no password is stored at all.

## The database

    // Program.cs
    builder.Services.AddDbContext<ShopDb>(o =>
        o.UseSqlServer(builder.Configuration.GetConnectionString("Default"),
            sql => sql.EnableRetryOnFailure()));     // cloud databases have transient faults

- Azure SQL blocks connections by default. Allow the API (the firewall rule "Allow Azure services and
  resources to access this server", or better, a private endpoint / VNet integration) — not your whole
  IP range.
- Apply migrations deliberately: run a migration bundle or a generated idempotent SQL script
  (dotnet ef migrations script --idempotent) in the release pipeline before the new code starts.

## Health and verification

    builder.Services.AddHealthChecks().AddDbContextCheck<ShopDb>();   // EF Core health-checks package
    app.MapHealthChecks("/healthz");

Point the host's health check at /healthz so a broken instance is replaced. Then verify, in order:

1. /healthz returns Healthy — the app started and reaches the database.
2. The frontend loads over HTTPS and a deep link survives a refresh.
3. Login works, a protected call works, a USER gets 403 on an admin endpoint (with curl).
4. An upload works and still exists after the next deploy.
5. The log stream shows no startup warnings and no secrets.

## Behind a proxy

App Service and container hosts terminate TLS in front of your app, so Kestrel sees plain HTTP. Add
app.UseForwardedHeaders() configured for X-Forwarded-Proto (or set ASPNETCORE_FORWARDEDHEADERS_ENABLED=true
where the proxy is trusted), so Request.Scheme is https and redirects and generated links use the right
scheme.

## Common mistakes

- The JWT key or connection string committed in appsettings.json. Rotate it — Git history keeps it.
- Expecting /swagger in production when the template only enables it in Development.
- CORS still allowing only http://localhost:5173.
- Uploads written to the app's local disk on a host that replaces instances.
- Migrations that never ran: the app starts, the first query fails with "Invalid object name".`,
    mcqs: [
      mcq('The deployed API crashes at startup with an ArgumentNullException where it builds the SymmetricSecurityKey from Jwt:Key. Locally it runs fine with the key in dotnet user-secrets. What explains it?', [
        ['User secrets are loaded only in the Development environment', true],
        ['User secrets are encrypted and need a certificate on the host', false],
        ['App Service deletes configuration keys that contain a colon', false],
      ], 'The secrets store is a development convenience read only when the environment is Development. Production needs the key from an app setting or Key Vault.'),
      mcq('After deployment, https://api.example.com/swagger returns 404 though it works locally. Program.cs is the unchanged template. Why?', [
        ['Swagger needs a CORS policy for the host before the page is served', false],
        ['The template enables Swagger only when the environment is Development', true],
        ['Swagger UI requires the developer exception page to be switched on', false],
        ['App Service blocks any path that starts with /swagger by default', false],
      ], 'The template wraps UseSwagger and UseSwaggerUI in if (app.Environment.IsDevelopment()). The host runs as Production, so the endpoints are not mapped at all.'),
      mcq('The API is deployed and /healthz is Healthy, but the first call to /api/products fails with "Invalid object name \'Products\'". What was skipped?', [
        ['The CORS origins for the production frontend were never configured', false],
        ['The connection string still points at the local SQL Server instance', false],
        ['The EF Core migrations were never applied to the cloud database', true],
      ], 'The app connects (the health check passes) but the tables do not exist. Run the migration bundle or the idempotent script against the production database as a release step.'),
    ],
    checkpoint: [
      ck('DEPLOYMENT', 'A team wants the React app and the API on one Azure App Service with no CORS. Besides copying the build into wwwroot, what must the API add?', [
        ['app.UseCors() with AllowAnyOrigin for the same host name', false],
        ['UseStaticFiles() and MapFallbackToFile("index.html") for the build', true],
        ['UseDeveloperExceptionPage() so React routes can resolve', false],
        ['A second Kestrel listener on port 5173 that serves the React build', false],
      ], 'The static file middleware serves the build from wwwroot, and the fallback returns index.html for client-side routes. API and frontend share one origin.'),
      ck('DEPLOYMENT', 'Which way of giving the production API its SQL password keeps it out of source and images?', [
        ['A Key Vault reference in an app setting, or a managed identity', true],
        ['appsettings.Production.json committed but kept in a private repo', false],
        ['An ENV line in the Dockerfile so the image always has the value', false],
      ], 'Key Vault references resolve the secret at runtime and a managed identity removes the password entirely. Files and image layers are copied, cached and shared; secrets in them leak.'),
      ck('DEPLOYMENT', 'Behind a TLS-terminating proxy on a container host, the API generates http:// links in Location headers and redirect loops appear. What is missing?', [
        ['A second certificate installed inside the container for Kestrel', false],
        ['Setting ASPNETCORE_ENVIRONMENT to Development on the container host', false],
        ['UseForwardedHeaders configured to honour X-Forwarded-Proto', true],
        ['Removing UseHttpsRedirection and adding UseHsts in its place', false],
      ], 'Kestrel sees plain HTTP from the proxy. The forwarded headers middleware restores the original scheme so the app knows the client used https.'),
    ],
  },

  /* ── DEBUGGING ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_DOTNET_DEBUGGING',
    notes: `**Full-stack bugs live at the seam, so first find which side you are on.** Did the request leave
the browser? Which URL did it go to? What status and body came back? The Network tab answers all three;
the API's log answers the rest.

## Fault 1 — preflight rejected by authentication

**Symptom:** the console says the request "has been blocked by CORS policy: Response to preflight request
doesn't pass access control check". The Network tab shows OPTIONS /api/orders/9 → 401. **Cause:**
Program.cs calls UseAuthentication and UseAuthorization before UseCors, so the token-less preflight is
challenged first. **Fix:** UseCors("frontend") above UseAuthentication and UseAuthorization.

## Fault 2 — CORS works locally, not in production

**Symptom:** every call from https://shop.example.com fails CORS; Postman gets 200. **Cause:**
Cors__Origins__0 on the host is "https://shop.example.com/" — a trailing slash — or still
http://localhost:5173. **Fix:** the exact origin, scheme + host (+ port), no slash.

## Fault 3 — 401 with a perfect-looking token

**Symptom:** login succeeds; every protected call returns 401 with WWW-Authenticate: Bearer
error="invalid_token". **Cause:** the issuer, audience or key used to create the token differs from the
TokenValidationParameters — typically Jwt:Issuer is "Shop" in one place and "shop-api" in another, or
two keys from two configuration sources. **Fix:** bind one JwtOptions class from configuration and use
it in both the token service and AddJwtBearer. (No WWW-Authenticate error at all, and no user ever set?
Check that app.UseAuthentication() is called.)

## Fault 4 — the refresh logs the user out

**Symptom:** login works; F5 returns to /login although localStorage has the token. **Cause:** the auth
slice writes to localStorage but its initialState is hard-coded empty. **Fix:** read storage into
initialState (or call a refresh endpoint before rendering the guarded routes).

## Fault 5 — the upload arrives empty

**Symptom:** the action runs, IFormFile file is null, no error. **Cause:** form.append('image', file)
while the parameter is named file — or a hand-set Content-Type: multipart/form-data on a fetch call,
which has no boundary. **Fix:** match the names ([FromForm(Name = "image")] if you must) and let the browser set the
header.

## Fault 6 — 413 on images that are "only" 3 MB

**Symptom:** the response is an HTML page saying 413 Request Entity Too Large. **Cause:** HTML means nginx
answered, not Kestrel: client_max_body_size is still the 1 MB default. **Fix:** raise it in nginx.conf to
just above the API's own limit.

## Fault 7 — field errors never appear

**Symptom:** a 400 with errors comes back; the form shows nothing. **Cause:** the keys are "Price" and
"Name" (C# property names) and the form looks up price and name. **Fix:** normalise in the error mapper,
or register SystemTextJsonValidationMetadataProvider (.NET 7+).

## Fault 8 — the container cannot log in to SQL Server

**Symptom:** the api container logs "A connection was successfully established with the server, but then
an error occurred during the login process" followed by "The certificate chain was issued by an
authority that is not trusted." **Cause:** Microsoft.Data.SqlClient encrypts by default and the local
SQL Server container has a self-signed certificate. **Fix:** TrustServerCertificate=True for the local
container only; a real certificate (Azure SQL has one) in the cloud.

## The method

1. Reproduce with the Network tab open; note method, URL, status, response headers and body.
2. HTML error page → a proxy answered. ProblemDetails → your API answered. No response → network,
   CORS or timeout.
3. Repeat the same call with curl. Works in curl but not in the browser → CORS or the browser's own
   rules. Fails in both → the API.
4. Read the API log at the same timestamp, by traceId.
5. Change one thing, then repeat the same request.`,
    mcqs: [
      mcq('The Network tab shows OPTIONS /api/orders/9 with status 401 and the DELETE never appears. What is the first place to look?', [
        ['The order of UseCors relative to UseAuthentication and UseAuthorization', true],
        ['The [HttpDelete] route template on the OrdersController action', false],
        ['The axios timeout, since OPTIONS requests are slower than others', false],
        ['The SQL Server login, which runs before every preflight reaches the controllers', false],
      ], 'A 401 on the preflight means authentication ran before CORS answered it. The DELETE is never sent because the preflight failed; the controller is not involved yet.'),
      mcq('A file upload fails with 413 and the body is an HTML page with the nginx version at the bottom. Which setting is the problem?', [
        ['FormOptions.MultipartBodyLengthLimit in Program.cs', false],
        ['client_max_body_size in the nginx configuration', true],
        ['[RequestSizeLimit] on the upload action in the API', false],
      ], 'An HTML page from nginx means the request stopped at the proxy and never reached Kestrel. nginx\'s default limit is 1 MB.'),
      mcq('Login returns a token; every other call gets 401 with error="invalid_token". The token service reads Jwt:Issuer while AddJwtBearer was given a literal "shop-api". What is the durable fix?', [
        ['Turn off ValidateIssuer so that any issuer value is accepted', false],
        ['Bind one options object from configuration and use it in both places', true],
        ['Remove the iss claim from tokens so that there is nothing to compare', false],
        ['Create a new token on every request so that the values always agree', false],
      ], 'Two sources of truth drift apart. Binding a single JwtOptions from configuration and injecting it where the token is issued and where it is validated keeps issuer, audience and key identical.'),
      mcq('A call fails in the browser with no status at all, and the same request with curl returns 200 with JSON. Which category is the bug in?', [
        ['The API controller, since curl skips its model validation', false],
        ['The database, because curl reuses a warm connection pool', false],
        ['CORS or another browser-only rule, as the API itself answers', true],
      ], 'curl proves the API answers correctly. When only the browser fails, and without a readable response, the browser\'s own checks — usually CORS — are withholding the response.'),
    ],
  },

  /* ── PRACTICE ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_DOTNET_PRACTICE',
    notes: `**Six exercises that join a React app to an ASP.NET Core API.** Use the products API from the
ASP.NET Core topics (controllers, EF Core on SQL Server, Identity + JWT) and a fresh Vite React app.
Each has a check; do not move on until it passes.

**1 — One client, two ways.** Create src/api/client.js with axios.create and baseURL from VITE_API_URL.
Run it once with the Vite proxy (VITE_API_URL=/api, proxy target the API's https port with secure:
false) and once calling the API directly. Check: with the proxy, the Network tab shows only
localhost:5173; without it, the calls fail until exercise 2 is done.

**2 — A named CORS policy from configuration.** Add a "frontend" policy whose origins come from
Cors:Origins in appsettings.Development.json; place UseCors correctly. Expose Location. Check: a PUT
with a token succeeds from React; the preflight returns 204 with Access-Control-Allow-Origin equal to
your origin; res.headers.location is readable after a create; an origin not in the list gets no CORS
header.

**3 — The login flow.** Login endpoint with UserManager, JWT issued with roles and expires, an auth
slice initialised from localStorage, a request interceptor and a response interceptor that logs out on
401 (not on the login call). Check: refresh keeps the session; a token edited by hand in localStorage
produces a 401 and a return to /login; an expired session returns the user to the page they were on.

**4 — Roles both sides.** An Admin-only DELETE with [Authorize(Roles = "Admin")] and a RequireAuth
role="Admin" route. Check: with a Customer token, curl gets 403 and the React app shows a no-access page
without logging out.

**5 — An image upload with limits.** FormData with progress; an action with IFormFile, an extension
allow-list, a 2 MB rule in code, [RequestSizeLimit] a little above it, a generated key and storage
outside wwwroot; an [Authorize] download action and a blob-based <img> in React. Check: a 3 MB file
gets your 400 message, a .exe renamed .png is rejected by a signature check, and the image shows only
when logged in.

**6 — One error contract.** AddProblemDetails, an IExceptionHandler, UseStatusCodePages and a toAppError
normaliser in React. Check: an invalid form shows server messages under the right fields, a stopped API
shows the network message with Retry, and a forced exception shows a generic message with the traceId —
and the stack trace only in the server log.`,
    mcqs: [
      mcq('In exercise 2 the preflight for a PUT returns 204 but has no Access-Control-Allow-Origin header, and the browser blocks the PUT. The policy lists http://localhost:5173. The page runs on http://127.0.0.1:5173. Why?', [
        ['A 204 status is never accepted as a valid preflight answer', false],
        ['127.0.0.1 and localhost are different origins to the browser', true],
        ['Preflights only succeed for origins that use the https scheme', false],
        ['The policy must list the API\'s own origin as well as React\'s', false],
      ], 'Origins are compared as strings of scheme, host and port. localhost and 127.0.0.1 resolve to the same machine but are different hosts, so the policy does not match.'),
      mcq('In exercise 3 a token edited by hand in localStorage should cause a return to /login. Which server behaviour makes that happen?', [
        ['The JwtBearer handler rejects the bad signature and answers 401', true],
        ['UserManager notices the token changed and deletes the user session', false],
        ['The API answers 403, which the interceptor treats as logging out', false],
      ], 'Changing any part of a signed token breaks the signature. The handler rejects it with 401, and the response interceptor clears the session and redirects.'),
      mcq('In exercise 4 a Customer token calls DELETE /api/products/3 with curl. Which result shows the control is in the right place?', [
        ['A redirect to the React no-access page from the API itself', false],
        ['A 200, because the React guard already hides the button', false],
        ['A 401, because the user is not an administrator', false],
        ['A 403 from [Authorize(Roles = "Admin")] with React bypassed', true],
      ], 'A valid token with the wrong role is 403. Getting it from curl proves the API enforces the rule without help from the UI.'),
      mcq('In exercise 5 a .exe renamed to photo.png passes the extension check. What catches it?', [
        ['Comparing the first bytes against the PNG signature', true],
        ['Checking that file.ContentType equals image/png', false],
        ['Setting accept="image/png" on the file input element', false],
      ], 'The extension and the client-sent content type are both chosen by the uploader. The file\'s own leading bytes (89 50 4E 47 for PNG) are evidence of what it really is.'),
      mcq('In exercise 6 the forced exception should show a traceId in the UI. Why include it?', [
        ['React needs it to retry the request automatically', false],
        ['Support can find the matching server log entry with it', true],
        ['It proves to the user that the database is still up and running', false],
        ['The browser uses it to group requests in the cache', false],
      ], 'The user sees a generic message, and the details stay in the log. The traceId joins the two, so a reported error can be traced without exposing internals.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_DOTNET_INTERVIEW_QUESTION',
    notes: `**Three questions a .NET full-stack interview asks about joining and shipping the two halves.**
Answer each aloud in under ninety seconds, then take the follow-up.

## Question 1 — "How does a request from your React app get authenticated in ASP.NET Core?"

**Model answer.** At login the React form posts the email and password to /api/auth/login. The
controller finds the user with UserManager, checks the password hash with CheckPasswordAsync, and issues
a JWT signed with HMAC-SHA256 containing the user id, email and role claims and a 30-minute expiry.
React keeps it — in my project in the Redux store mirrored to localStorage — and an axios request
interceptor adds Authorization: Bearer to every call. On the server, UseAuthentication runs the
JwtBearer handler, which validates the signature, issuer, audience and lifetime and builds
HttpContext.User; UseAuthorization then applies [Authorize] and role or policy requirements. A missing
or invalid token gives 401, which the response interceptor turns into a logout; a valid token without
the role gives 403, which shows a no-access page.

**Follow-up: "Your token lasts 30 minutes. A user is fired at 10:00. What happens until 10:30?"** The
token remains valid — a JWT is checked by signature, not looked up. Mitigations: shorter access tokens
with a refresh token whose use is checked against the database, a security stamp or a denylist checked
for sensitive operations, and keeping ClockSkew small.

## Question 2 — "How did you handle CORS?"

**Model answer.** In development I used the Vite proxy, so the browser only talked to the dev server.
For the deployed version I registered a named policy with WithOrigins from configuration — the exact
production origin, no wildcard — allowed the Authorization and Content-Type headers and the methods I
use, exposed Location, and called UseCors before UseAuthentication and UseAuthorization, because
preflights carry no token. I did not need AllowCredentials because the token is a header, not a cookie.

**Follow-up: "Could you avoid CORS entirely?"** Yes: serve the React build from the same origin as the
API — from wwwroot with MapFallbackToFile, or behind nginx forwarding /api — and every call is
same-origin.

## Question 3 — "Walk me through how you deployed it."

**Model answer.** Both halves have multi-stage Dockerfiles: the API builds on the .NET 8 SDK image and
runs on the aspnet image on port 8080 as the non-root app user; the frontend builds with Node and is
served by nginx with try_files for deep links. Locally, docker compose runs SQL Server with a
healthcheck and a named volume. In the cloud I used Azure SQL Database and App Service; the connection
string and JWT key are app settings backed by Key Vault, ASPNETCORE_ENVIRONMENT is Production, and
migrations run as a bundle in the pipeline before the new version starts. I verify with /healthz, then
login, a 403 check with curl, an upload that survives a redeploy, and the log stream.

**Follow-up: "Why not call Database.Migrate() at startup?"** It is fine for one small instance, but with
several instances starting together they race to migrate, and a failed migration takes the app down
mid-start. Running migrations once, as a separate release step, is easier to control and to roll back.`,
    mcqs: [
      mcq('The interviewer asks why a fired employee\'s JWT still works for 25 minutes. Which answer is accurate?', [
        ['The API validates the signature and expiry, not the database', true],
        ['UserManager caches the user record for half an hour by default', false],
        ['The JwtBearer handler renews valid tokens on every request it sees', false],
        ['Browsers keep sending a token until the Redux store is cleared', false],
      ], 'A JWT is self-contained: the handler checks the signature, issuer, audience and lifetime without a lookup. Short lifetimes, refresh tokens checked against the database or a denylist close the gap.'),
      mcq('Asked why your CORS policy does not call AllowCredentials, which answer shows understanding?', [
        ['Credentials are only needed for GET requests, never for PUT or DELETE', false],
        ['AllowCredentials is the default whenever WithOrigins lists any origin', false],
        ['The token travels in an Authorization header set by script, not a cookie', true],
      ], 'CORS credentials cover cookies and browser-managed authentication. A header the app sets itself needs only to be an allowed header.'),
      mcq('Why might a team run EF Core migrations as a pipeline step instead of calling Database.Migrate() in Program.cs?', [
        ['Migrate() only works against LocalDB and not against Azure SQL', false],
        ['Several starting instances can race, and failures stop the app starting', true],
        ['Pipeline steps can migrate without the DbContext or any database connection at all', false],
      ], 'Startup migration ties schema changes to every instance start. A separate step runs once, can be watched and rolled back, and the app only starts against a ready schema.'),
    ],
  },

  /* ── PROJECT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_DOTNET_PROJECT',
    notes: `**Brief: a full-stack .NET application, deployed at a public URL.** Join the React frontend and the
secured ASP.NET Core API you have built into one product — an inventory manager, a course portal, a job
board or a clinic booking system — and put it on the internet. A reviewer should open the URL, log in
with the demo accounts in your README and use every feature.

## Architecture

    React 18 (Vite, React Router, Redux Toolkit, axios)
       │  HTTPS, JSON, Authorization: Bearer <JWT>
    ASP.NET Core 8 Web API (controllers, [ApiController], ProblemDetails, Identity + JwtBearer, health checks)
       │  EF Core 8, TLS
    SQL Server (Azure SQL or another managed instance in the cloud; the 2022 container locally)
       + file storage for uploads (a volume locally, blob storage or a persistent disk in the cloud)

## Required features

1. **Authentication.** Register and log in with ASP.NET Core Identity (hashed passwords). A JWT is
   issued on login with role claims and an expiry, sent by an axios interceptor and validated by
   AddJwtBearer. An expired session returns the user to the login page and back afterwards.
2. **Two roles.** For example Customer and Admin, seeded at startup. Admin screens are guarded in React
   **and** endpoints use [Authorize(Roles = "Admin")] or a policy; a Customer calling an admin endpoint
   directly gets 403.
3. **CRUD on a main resource** with a related one (products and categories, courses and lessons, jobs
   and applications): a paged, searchable list, detail, create, edit, delete. DTOs only.
4. **One upload.** An image or PDF attached to the main resource via IFormFile: extension allow-list and
   signature check, size limit in code and [RequestSizeLimit], a generated storage key, storage outside
   wwwroot, and an [Authorize] download.
5. **One error contract.** ProblemDetails for every error (AddProblemDetails, an IExceptionHandler,
   [ApiController] validation); field errors shown under their inputs; a network failure shows a message
   with Retry; no stack traces in responses.

## Required endpoints (adapt the names)

    POST   /api/auth/register            POST   /api/auth/login
    GET    /api/items?page=&pageSize=&q= GET    /api/items/{id}
    POST   /api/items                    PUT    /api/items/{id}       DELETE /api/items/{id}  (Admin)
    POST   /api/items/{id}/files         GET    /api/files/{key}
    GET    /healthz

## Required screens

Login, register, list (search and pagination), detail (with the attachment), create/edit form, an admin
page, a no-access page and a not-found page.

## Deployment requirements

- Multi-stage Dockerfiles (sdk → aspnet on 8080; node → nginx) and a compose.yaml starting SQL Server
  (healthcheck, named volume), the API and nginx with one command from a fresh clone.
- Deployed to a cloud host with a managed SQL Server database; secrets in app settings or Key Vault;
  .env.example committed, .env ignored; nothing secret in appsettings.json.
- Migrations applied by a bundle or an idempotent script, not EnsureCreated.
- CORS allows exactly the production frontend origin, or the app is served from one origin.
- HTTPS throughout; deep links survive a refresh; /healthz checks the database.

## Acceptance criteria

- The public URL works on a phone and a laptop, and /healthz reports Healthy.
- A Customer cannot reach admin data through the UI **or** with curl and their token (403).
- Refreshing a protected page keeps the user logged in until the token expires.
- An invalid form shows the server's messages under the right fields.
- An upload over the limit shows a clear message; a valid one survives a redeploy.
- git log contains no passwords, connection strings or JWT keys.
- The README has the live URL, demo accounts, an architecture sketch, how to run with docker compose,
  every configuration key, and the token-storage decision with its trade-off.`,
    mcqs: [
      mcq('The brief requires that the /healthz endpoint checks the database, not just that the process runs. What does that add when the host polls it?', [
        ['An instance that cannot reach SQL Server is reported unhealthy and replaced', true],
        ['The health check applies pending migrations if the database is behind', false],
        ['Polling the endpoint keeps the EF Core connection pool permanently open', false],
      ], 'A process can be up while its database is unreachable. AddDbContextCheck makes /healthz reflect that, so the platform stops routing traffic to a broken instance.'),
      mcq('Why does the brief forbid EnsureCreated in the deployed app?', [
        ['EnsureCreated drops and recreates the database whenever the EF Core model changes', false],
        ['It builds the schema without migrations, so later changes cannot be applied', true],
        ['EnsureCreated works only with SQLite and fails against SQL Server', false],
        ['It runs on every request and slows each call down by a few seconds', false],
      ], 'EnsureCreated creates tables from the current model with no migration history. Once it has run, Migrate cannot evolve that database, so schema changes in production have no path.'),
    ],
    assignment: {
      title: 'Project — A Full-Stack .NET App, Deployed',
      description: 'A React frontend and a secured ASP.NET Core 8 API on SQL Server, joined into one application with Identity and JWT login, two roles, CRUD with pagination, a validated IFormFile upload, one ProblemDetails error contract, Docker images and docker compose, and a public HTTPS deployment with configuration kept out of source.',
      instructions: `1. Choose the domain and write the data model (a main resource, a related one, Identity users with roles). Create the EF Core migrations.
2. Build the API: DTOs, validation attributes, services, controllers under /api with [ApiController], AddProblemDetails with an IExceptionHandler, Identity with JwtBearer, role checks, a named CORS policy from configuration, and /healthz with a database check.
3. Build the frontend: an axios client with VITE_API_URL and request/response interceptors, an auth slice initialised from storage, RequireAuth with role support, a toAppError normaliser, and the required screens with loading, error, empty and field-error states.
4. Add the upload: FormData with progress in React; an IFormFile action with an allow-list, a signature check, size limits, generated keys, storage outside wwwroot, and an [Authorize] download shown with a blob URL.
5. Write both multi-stage Dockerfiles, nginx.conf (try_files and the /api proxy), .dockerignore files and compose.yaml with SQL Server, a healthcheck, service_healthy and a named volume. Confirm docker compose up --build works from a fresh clone.
6. Deploy: a managed SQL Server database, the API with app settings or Key Vault, migrations applied as a release step, the frontend built with the right VITE_API_URL (or served from the API). Verify /healthz, the flows, deep links, the 403 check with curl, uploads after a redeploy, and the log stream.
7. Write the README (live URL, demo accounts, architecture, configuration keys, how to run, token-storage trade-off) and submit the repository link and the live URL.`,
      rubric: [
        { criterion: 'Authentication and authorisation', description: 'Identity-hashed passwords; JWT issued with roles and validated by AddJwtBearer with one shared options source; interceptor sends the token; 401 logs out (not on login); 403 shown without logout; roles enforced with [Authorize] and guarded in React; refresh keeps the session.', maxPoints: 25 },
        { criterion: 'API and frontend integration', description: 'CRUD with pagination and search through one api client; DTOs, camelCase JSON read correctly; CORS exact or same-origin with UseCors correctly placed; uploads validated by size, extension and signature, stored under generated keys outside wwwroot and the container, served to authorised users.', maxPoints: 20 },
        { criterion: 'Error handling', description: 'ProblemDetails for every error including validation, 404 and 500; field errors mapped to inputs; network failures with Retry; generic 500 messages with a traceId and no stack traces.', maxPoints: 15 },
        { criterion: 'Containers', description: 'Multi-stage sdk/aspnet and node/nginx images; the API on 8080 as a non-root user; nginx with SPA fallback and /api proxy; compose with a SQL Server healthcheck, service_healthy and a named volume; runs from a fresh clone with one command.', maxPoints: 20 },
        { criterion: 'Deployment and configuration', description: 'Public HTTPS URL; managed SQL Server reachable only by the API; secrets in app settings or Key Vault and none in Git; migrations applied as a release step; /healthz Healthy with a database check; deep links and uploads survive a redeploy.', maxPoints: 15 },
        { criterion: 'README and explanation', description: 'Live URL, demo accounts, architecture sketch, configuration keys, run instructions and the token-storage decision with its trade-off.', maxPoints: 5 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FULLSTACK_DOTNET_CHECKPOINT',
    notes: `**Ten questions on joining and shipping a React + ASP.NET Core application.** The api client and
the camelCase contract, CORS in the middleware pipeline, the JWT login flow and its failure codes,
IFormFile uploads, ProblemDetails, Docker images with SQL Server in compose, and deploying with
configuration outside the code. Each is a situation from a real project; choose what you would do,
without looking anything up.`,
    checkpoint: [
      ck('REST_APIS', 'React shows "undefined" for every product name. The API returns List<ProductDto> where ProductDto has a Name property, and the component renders p.Name. What is the fix?', [
        ['Render p.name, the camelCase key that ASP.NET Core writes', true],
        ['Add [JsonPropertyName("Name")] to every DTO property in C#', false],
        ['Return the EF entity instead, which keeps the PascalCase names', false],
        ['Parse res.data with JSON.parse before reading the properties', false],
      ], 'The web JSON defaults use camelCase, so Name is written as name. Reading the camelCase key is the fix; renaming every property to PascalCase fights the convention the whole client uses.'),
      ck('REST_APIS', 'A controller action is [HttpPost] public IActionResult Create(CreateOrderRequest req) on a class without [ApiController]. Invalid input reaches the action and is saved. What restores automatic 400 responses?', [
        ['Adding [FromQuery] to the req parameter so it is validated earlier', false],
        ['Adding [ApiController] so invalid models return ValidationProblemDetails', true],
        ['Calling UseStatusCodePages so an invalid model becomes a 400 response automatically', false],
      ], 'The automatic 400 is an [ApiController] behaviour. Without it the action runs and must check ModelState.IsValid itself.'),
      ck('REST_APIS', 'An upload action declares IFormFile file and the client sends a 50 MB video. [RequestSizeLimit(100_000_000)] is on the action and no proxy is involved. What happens?', [
        ['Kestrel rejects it with 413, as its default limit still applies', false],
        ['The multipart limit of 30 MB rejects it with 400 Bad Request', false],
        ['The request is accepted, since the attribute raises the limit', true],
      ], '[RequestSizeLimit] overrides Kestrel\'s request body limit for that action, and the multipart default of 128 MB is above 50 MB. Your own file.Length rule is what should decide.'),
      ck('AUTHENTICATION', 'A Customer\'s request to an [Authorize(Roles = "Admin")] action returns 403, and the React interceptor logs the user out. What should change?', [
        ['The API, so that it returns 401 for every role failure', false],
        ['The interceptor, so that it logs out only on 401', true],
        ['The token, so that it carries every role by default', false],
        ['The guard, so that it retries the call with a new token', false],
      ], '403 means the user is authenticated but not permitted. Logging out is the response to 401; for 403 the app shows a no-access message.'),
      ck('AUTHENTICATION', 'AddJwtBearer is configured and tokens validate in a test, yet in the app HttpContext.User.Identity.IsAuthenticated is always false. Program.cs calls UseAuthorization() and MapControllers(). What is missing?', [
        ['A call to UseRouting() placed after MapControllers()', false],
        ['[AllowAnonymous] on the controller that issues tokens', false],
        ['app.UseAuthentication() before app.UseAuthorization()', true],
      ], 'The authentication middleware runs the scheme handler and sets HttpContext.User. Without it every request is anonymous whatever the token says.'),
      ck('AUTHENTICATION', 'Where should the "return to /orders/42 after logging in" location be kept?', [
        ['In the JWT itself, as a claim the API adds at login', false],
        ['In router state passed by the guard\'s Navigate to /login', true],
        ['In a cookie the API sets on the response when it returns the 401', false],
        ['In the CORS policy as an allowed redirect location', false],
      ], 'The guard knows where the user was going and hands it to the login page in the navigation state; after login the page navigates there. The server has no part in it.'),
      ck('CONTAINERS_DOCKER', 'nginx proxies /api/ to http://api:80 and every API call returns 502 Bad Gateway. The api service runs the mcr.microsoft.com/dotnet/aspnet:8.0 image with default settings. What is wrong?', [
        ['nginx cannot resolve compose service names on its own', false],
        ['The aspnet image listens on 8080 from .NET 8, not on 80', true],
        ['proxy_pass needs https because Kestrel requires TLS', false],
        ['The api service must publish port 80 on the host machine', false],
      ], 'From .NET 8 the images listen on 8080 by default. nginx finds the api container but nothing answers on port 80, hence 502.'),
      ck('CONTAINERS_DOCKER', 'After changing MSSQL_SA_PASSWORD in compose.yaml and running docker compose up, the API logs "Login failed for user \'sa\'". The sqldata volume was kept. Why?', [
        ['Compose caches environment values for each service until a reboot', false],
        ['The volume holds the database created with the earlier password', true],
        ['SQL Server needs the new password in the API connection string first', false],
      ], 'The SA password is set when the data directory is first initialised. With the old volume, SQL Server still has the old password; change it with sqlcmd, or recreate the volume if the data does not matter.'),
      ck('DEPLOYMENT', 'A team sets Jwt__Key as an App Service application setting on a Linux plan and the app reads builder.Configuration["Jwt:Key"]. Does it get the value?', [
        ['No; Linux plans only pass settings named with a colon', false],
        ['No; app settings are visible to the portal, not to the app', false],
        ['Yes; app settings are environment variables and __ maps to :', true],
      ], 'App Service passes application settings to the app as environment variables, and the configuration system translates the double underscore into the section separator.'),
      ck('DEPLOYMENT', 'The API is deployed with ASPNETCORE_ENVIRONMENT unset. Which statement is true?', [
        ['The app runs as Development until a variable says otherwise', false],
        ['The app runs as Production and loads appsettings.Production.json', true],
        ['The app fails to start, since the environment must be set', false],
        ['The app runs as Staging, the default environment on every cloud host', false],
      ], 'When no environment is set, ASP.NET Core uses Production. That decides which appsettings file overlays the base one and keeps development-only features off.'),
    ],
  },
];
