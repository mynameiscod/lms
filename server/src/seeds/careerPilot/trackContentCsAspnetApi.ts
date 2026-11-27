/**
 * Career-track content (.NET Full Stack + AI, batch N3): ASP.NET Core Web APIs (JT_ASPNET_API).
 *
 * ASP.NET Core 8 on .NET 8: the project and Program.cs, the middleware pipeline, controllers and
 * minimal APIs, DTOs and status codes, validation with data annotations and FluentValidation, one
 * ProblemDetails error shape through UseExceptionHandler and IExceptionHandler, configuration per
 * environment, and OpenAPI with Swashbuckle. Persistence is an in-memory store on purpose; EF Core
 * inside the API, security and testing are the next topics, and they grow this same API.
 *
 * The questions are about a specific Program.cs, controller, DTO or response, because that is how
 * ASP.NET Core is examined: "what does this request get back?", "why is this a 415?", "why did the
 * middleware never run?".
 *
 * Attribution: the topic declares ASPNET_CORE and REST_APIS and defaults to ASPNET_CORE. Every
 * checkpoint question names its skill with ck(): REST_APIS for HTTP and REST design (verbs, status
 * codes, idempotency, resource paths), ASPNET_CORE for how the framework behaves. Practice mcqs
 * name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const CORE = 'ASPNET_CORE';
const REST = 'REST_APIS';

export const TRACK_CS_ASPNET_API_BUNDLES: PilotBundle[] = [
  /* ── PIPELINE ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_API_PIPELINE',
    notes: `You already know the generic host from the DI topic: a builder, a service collection, configuration
and logging. **ASP.NET Core** is that same host plus a web server (**Kestrel**) and a **request
pipeline**. Everything in this topic is .NET 8 / ASP.NET Core 8.

## Creating the project

    dotnet new webapi -n Catalogue.Api --use-controllers
    cd Catalogue.Api
    dotnet run

In .NET 8 the \`webapi\` template produces **minimal APIs** by default; \`--use-controllers\` (short
form \`-controllers\`) gives you a \`Controllers\` folder instead. Either way you get:

    Catalogue.Api/
    ├── Catalogue.Api.csproj          # <Project Sdk="Microsoft.NET.Sdk.Web">, net8.0
    ├── Program.cs                    # the whole startup: services, then pipeline
    ├── Controllers/                  # (with --use-controllers)
    ├── appsettings.json
    ├── appsettings.Development.json
    ├── Catalogue.Api.http            # requests you can send from VS / VS Code
    └── Properties/launchSettings.json  # local run profiles: URLs and ASPNETCORE_ENVIRONMENT

The \`Microsoft.NET.Sdk.Web\` SDK references the ASP.NET Core shared framework, so there is no
NuGet package for "ASP.NET Core" itself. The template adds one package: **Swashbuckle.AspNetCore**
for Swagger (in .NET 9 the template switched to Microsoft.AspNetCore.OpenApi — see the OpenAPI unit).

## Program.cs: two phases

    var builder = WebApplication.CreateBuilder(args);

    // ── Phase 1: register services ──────────────────────────
    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();
    builder.Services.AddSingleton<IProductStore, InMemoryProductStore>();

    var app = builder.Build();

    // ── Phase 2: build the pipeline ─────────────────────────
    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }
    app.UseHttpsRedirection();
    app.UseAuthorization();
    app.MapControllers();

    app.Run();

\`CreateBuilder\` sets up configuration (appsettings, environment variables, command line), logging,
the DI container and Kestrel. \`builder.Build()\` freezes the service collection — registering a
service after it throws an \`InvalidOperationException\` because the collection is read-only. From
then on you only arrange **middleware** (\`app.Use...\`) and **endpoints** (\`app.Map...\`).

## Kestrel and the URLs

Kestrel is the cross-platform web server inside your process; there is no IIS or Tomcat to install.
When you \`dotnet run\`, the first profile in \`launchSettings.json\` supplies the URLs (the template
picks random ports such as \`http://localhost:5xxx\` and \`https://localhost:7xxx\`) and sets
\`ASPNETCORE_ENVIRONMENT=Development\`. With no launch profile and no URL configuration, Kestrel
listens on \`http://localhost:5000\`. \`launchSettings.json\` is **only** for local runs — it is not
used by a published app.

\`dotnet watch\` rebuilds and restarts (or hot-reloads) when you save a file.

## Middleware: one request, in order

A **middleware** is a component that receives the \`HttpContext\`, can do work, and either calls the
**next** middleware or answers itself. The pipeline is the chain of them in the order you wrote:

    app.Use(async (context, next) =>
    {
        var sw = Stopwatch.StartNew();
        await next(context);                         // everything later in the pipeline runs here
        app.Logger.LogInformation("{Method} {Path} -> {Status} in {Ms} ms",
            context.Request.Method, context.Request.Path,
            context.Response.StatusCode, sw.ElapsedMilliseconds);
    });

Code **before** \`await next\` runs on the way in; code **after** it runs on the way out, in reverse
order. A middleware that does not call \`next\` **short-circuits**: nothing after it runs.

    app.Use(async (context, next) =>
    {
        if (context.Request.Headers["X-Maintenance"] == "on")
        {
            context.Response.StatusCode = 503;
            await context.Response.WriteAsync("Down for maintenance");
            return;                                  // short-circuit: no controller runs
        }
        await next(context);
    });

- \`app.Use(...)\` — can call next.
- \`app.Run(...)\` — **terminal**: never calls next; anything registered after it is unreachable.
- \`app.Map("/path", branch => ...)\` — branches the pipeline by path prefix.

## The order that matters

The documented order for the built-in middleware is:

    app.UseExceptionHandler();      // first, so it catches exceptions from everything after it
    app.UseHsts();
    app.UseHttpsRedirection();
    app.UseStaticFiles();
    app.UseRouting();               // WebApplication adds this for you if you do not call it
    app.UseCors();
    app.UseAuthentication();
    app.UseAuthorization();
    // your own middleware
    app.MapControllers();           // endpoints

An exception handler placed after the middleware that throws cannot catch it. Authorization before
authentication sees an anonymous user and rejects everyone. These are not style choices.

In the Development environment \`WebApplication\` adds the **developer exception page** for you, so a
crash shows a detailed HTML page locally — and never in Production.

## What happens to one request

\`GET /api/products/7\`: Kestrel parses the HTTP request into an \`HttpContext\` → each middleware
runs in order → routing matches \`ProductsController.GetById\` → model binding turns \`7\` into
\`int id\` → the action runs → its result is serialised to JSON by System.Text.Json → the response
travels back out through the middleware (where the timing log above writes its line) → Kestrel
sends it.

## Common mistakes

- \`builder.Services.AddControllers()\` without \`app.MapControllers()\`: the controllers exist but no
  route reaches them — every URL is a 404.
- \`app.Run(...)\` used for a logging middleware: it is terminal, so the controllers never run.
- Writing to the response, then calling \`next\`: a later component that tries to set the status or a
  header fails because the response has already started.`,
    workedExample: `**Problem.** Add a header \`X-Elapsed-Ms\` to every response with the time the request took, and
answer \`GET /health\` with \`OK\` without going through MVC.

The trap: headers must be set **before** the body starts. Setting them after \`await next\` is too
late once a controller has written JSON. \`Response.OnStarting\` registers a callback that runs just
before the headers are sent:

    var app = builder.Build();

    app.Use(async (context, next) =>
    {
        var sw = Stopwatch.StartNew();
        context.Response.OnStarting(() =>
        {
            context.Response.Headers["X-Elapsed-Ms"] = sw.ElapsedMilliseconds.ToString();
            return Task.CompletedTask;
        });
        await next(context);
    });

    app.MapGet("/health", () => "OK");     // an endpoint, not a controller
    app.MapControllers();
    app.Run();

Check it:

    curl -i http://localhost:5080/health
    HTTP/1.1 200 OK
    Content-Type: text/plain; charset=utf-8
    X-Elapsed-Ms: 0
    OK

    curl -i http://localhost:5080/api/products
    HTTP/1.1 200 OK
    Content-Type: application/json; charset=utf-8
    X-Elapsed-Ms: 3

Why it works for both: the timing middleware is registered **before** both endpoints, so every
request passes through it. Had it been registered after \`app.MapControllers()\`, it would still
run (endpoints execute at the end of the pipeline), but registering cross-cutting middleware before
the endpoints is the convention that keeps the order readable.`,
    mcqs: [
      mcq('Program.cs calls builder.Build() and then builder.Services.AddScoped<IOrderService, OrderService>(). What happens when the app starts?', [
        ['It throws, because the built service collection is read-only', true],
        ['The registration is queued and applied on the first request', false],
        ['The service is registered but only for minimal API endpoints', false],
      ], 'Build() creates the service provider from the collection and marks the collection read-only. Adding a registration afterwards throws InvalidOperationException; every registration belongs before Build().'),
      mcq('A middleware is written as app.Run(async ctx => { Log(ctx); }) and placed before app.MapControllers(). What do API callers see?', [
        ['Every request is logged and then reaches its controller normally', false],
        ['Only requests that do not match a controller route are logged here', false],
        ['No controller ever runs: app.Run is terminal and ends the pipeline', true],
      ], 'app.Run registers terminal middleware that has no next delegate. Every request ends there with an empty 200 response, so the controllers are unreachable. Use app.Use and call next.'),
      mcq('In which order should these appear in Program.cs: UseAuthorization, UseExceptionHandler, UseAuthentication?', [
        ['UseAuthentication, UseAuthorization, UseExceptionHandler', false],
        ['UseExceptionHandler, UseAuthentication, UseAuthorization', true],
        ['UseAuthorization, UseAuthentication, UseExceptionHandler', false],
        ['UseAuthentication, UseExceptionHandler, UseAuthorization', false],
      ], 'The exception handler goes first so that it wraps everything after it. Authentication must establish the user before authorization can decide whether that user is allowed.'),
    ],
    checkpoint: [
      ck(CORE, 'A teammate runs the published Catalogue.Api.dll on a test server and is surprised that the environment is Production, although launchSettings.json says Development. Why?', [
        ['launchSettings.json is read only by local tooling such as dotnet run', true],
        ['The published build always forces Production and cannot be changed', false],
        ['launchSettings.json values apply only when the app is built in Debug mode', false],
      ], 'launchSettings.json is used by dotnet run, Visual Studio and VS Code for local profiles; it is not deployed. On a server you set ASPNETCORE_ENVIRONMENT yourself, and when it is unset the environment is Production.'),
      ck(CORE, 'Two middlewares are registered: first A (logs "A in", awaits next, logs "A out"), then B (logs "B in", awaits next, logs "B out"). In what order are the four lines logged for one request?', [
        ['A in, A out, B in, B out', false],
        ['B in, A in, A out, B out', false],
        ['A in, B in, B out, A out', true],
        ['A in, B in, A out, B out', false],
      ], 'Requests flow through middleware in registration order, and responses flow back in reverse. A wraps B, so B finishes completely before the code after A\'s await next runs.'),
      ck(CORE, 'Program.cs registers AddControllers() and has a ProductsController with [Route("api/[controller]")], but there is no app.MapControllers() call. What does GET /api/products return?', [
        ['404, because no endpoint was mapped for the controllers', true],
        ['200, since attribute routes are discovered automatically', false],
        ['500, as the controller cannot be constructed without it', false],
      ], 'AddControllers registers the MVC services; MapControllers adds the controller actions as endpoints. Without it routing has nothing to match, so every controller URL is a 404.'),
    ],
  },

  /* ── CONTROLLERS_MINIMAL ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_API_CONTROLLERS_MINIMAL',
    notes: `ASP.NET Core gives you two ways to write endpoints: **controllers** (classes with action methods)
and **minimal APIs** (lambdas mapped in Program.cs). Both run on the same routing, model binding and
DI. Learn both — interviews ask, and real codebases use both.

## A controller

    [ApiController]
    [Route("api/[controller]")]                 // [controller] → "Products"
    public class ProductsController : ControllerBase
    {
        private readonly IProductStore _store;
        public ProductsController(IProductStore store) => _store = store;

        [HttpGet]                                // GET /api/products
        public IEnumerable<ProductDto> GetAll() => _store.All();

        [HttpGet("{id:int}")]                    // GET /api/products/7
        public ActionResult<ProductDto> GetById(int id)
        {
            var p = _store.Find(id);
            return p is null ? NotFound() : p;
        }

        [HttpGet("search")]                      // GET /api/products/search?q=pen&page=2
        public IEnumerable<ProductDto> Search([FromQuery] string q, [FromQuery] int page = 1)
            => _store.Search(q, page);

        [HttpDelete("{id:int}")]
        public IActionResult Delete(int id) => _store.Remove(id) ? NoContent() : NotFound();
    }

- \`ControllerBase\` (not \`Controller\`) — an API has no views; \`Controller\` adds view support.
- \`[Route("api/[controller]")]\` — the \`[controller]\` token is the class name minus the
  \`Controller\` suffix. Routes are case-insensitive, so \`/api/products\` works.
- One attribute per verb: \`[HttpGet]\`, \`[HttpPost]\`, \`[HttpPut]\`, \`[HttpPatch]\`, \`[HttpDelete]\`.
  The template in the verb attribute is appended to the controller route.
- Controllers are created **per request** by the framework, with their constructor parameters
  resolved from DI.

## What [ApiController] switches on

| Behaviour | Effect |
|---|---|
| Attribute routing required | actions must have a route; conventional routes do not reach them |
| Automatic 400 | an invalid model state returns \`ValidationProblemDetails\` before your action runs |
| Binding source inference | complex types come \`[FromBody]\`, route values \`[FromRoute]\`, other simple types \`[FromQuery]\`, \`IFormFile\` from the form |
| Problem details for errors | \`return NotFound();\` gets a ProblemDetails JSON body, not an empty one |

You can put \`[ApiController]\` on a base class or on the assembly (\`[assembly: ApiController]\`).

## Route values, constraints and query strings

    [HttpGet("{id:int}")]        // constraint: only digits match
    [HttpGet("{sku}")]           // any segment
    [HttpGet("{id:int:min(1)}")] // constraints combine

A **route constraint** decides whether the route **matches at all**: \`/api/products/abc\` does not
match \`{id:int}\`, so the answer is **404**. Without the constraint the route matches, binding
"abc" to \`int id\` fails, and \`[ApiController]\` answers **400**. Constraints are for choosing
between routes, not for validation — but they are the reason \`/search\` and \`/{id:int}\` never
collide.

Query parameters filter, sort and page: \`?q=pen&page=2\`. A parameter with a default value
(\`int page = 1\`) is optional.

## The same API as minimal APIs

    var products = app.MapGroup("/api/products").WithTags("Products");   // .NET 7+

    products.MapGet("/", (IProductStore store) => store.All());

    products.MapGet("/{id:int}", (int id, IProductStore store) =>
        store.Find(id) is { } p ? Results.Ok(p) : Results.NotFound());

    products.MapGet("/search", (string q, int? page, IProductStore store) =>
        store.Search(q, page ?? 1));

    products.MapDelete("/{id:int}", (int id, IProductStore store) =>
        store.Remove(id) ? Results.NoContent() : Results.NotFound());

Parameters are bound by inference: a name in the route template binds from the route, a type
registered in DI is injected, a complex type binds from the JSON body, and other simple types come
from the query string. A required parameter that is missing (\`/search\` with no \`q\`, since
\`string q\` is non-nullable) is a **400**.

What minimal APIs do **not** do in .NET 8: no \`[ApiController]\` behaviours, so no automatic
data-annotation validation (built-in minimal API validation arrives in .NET 10), and no filters or
model binders from MVC. They are leaner and slightly faster. Endpoint filters (.NET 7+) are the
minimal-API equivalent of action filters.

## Which to choose

- **Controllers**: large APIs, teams used to MVC, lots of filters and conventions, automatic
  validation via \`[ApiController]\`.
- **Minimal APIs**: small services, microservices, a few endpoints, when you want the routing in one
  place. Group with \`MapGroup\` and extension methods so Program.cs does not become 800 lines.

Both can live in the same app.

## REST paths, whichever style

    GET    /api/products              list
    GET    /api/products/42           one
    POST   /api/products              create
    PUT    /api/products/42           replace
    DELETE /api/products/42           delete
    GET    /api/categories/3/products sub-resource

Plural nouns, no verbs in the path — the HTTP method is the verb.

## Common mistakes

- Inheriting from \`Controller\` in an API, or from nothing (then \`NotFound()\` and \`Ok()\` do not
  exist).
- Two actions with the same verb and template: the request fails with
  \`AmbiguousMatchException: The request matched multiple endpoints\` (a 500 at request time, not a
  startup error).
- Forgetting the verb attribute: the action still matches every verb, and Swagger generation fails
  for it.`,
    mcqs: [
      mcq('A controller has [HttpGet("{id:int}")] GetById(int id). A client requests GET /api/products/abc. What does it receive?', [
        ['400 Bad Request with a model binding error for id', false],
        ['404 Not Found, because no route template matches', true],
        ['200 OK with id bound to 0 by default', false],
      ], 'The :int constraint is checked during routing. "abc" fails it, so the route does not match and no other route does either: 404. Without the constraint the route would match and binding would fail with 400.'),
      mcq('In a minimal API, app.MapGet("/api/products/search", (string q, IProductStore store) => ...) is called as /api/products/search with no query string. What happens?', [
        ['400 Bad Request, because the non-nullable q is required', true],
        ['The handler runs with q set to an empty string', false],
        ['The handler runs with q set to null and must check it', false],
        ['404 Not Found, because the query string is part of the route', false],
      ], 'Minimal APIs treat a non-nullable parameter as required. q is bound from the query string, and when it is missing the framework rejects the request with 400. Declare string? q to make it optional.'),
      mcq('A class is declared public class OrdersController : ControllerBase with [Route("api/[controller]")]. Which path does it serve?', [
        ['/api/OrdersController, the full class name', false],
        ['/api/controller/orders, token then class name', false],
        ['/api/orders, as [controller] drops the suffix', true],
      ], 'The [controller] token is replaced by the class name without the Controller suffix, so the route is api/Orders. Routing is case-insensitive, so /api/orders matches.'),
    ],
    checkpoint: [
      ck(CORE, 'A ProductsController has [HttpPost] Create(ProductDto dto) and [ApiController]. The dto parameter has no [FromBody]. Where is it bound from?', [
        ['From the query string, the default for every action parameter', false],
        ['From the JSON request body, inferred because it is a complex type', true],
        ['From the form fields, because no attribute names a binding source', false],
      ], 'With [ApiController], complex-type parameters are inferred as [FromBody]. Route-template names bind from the route and other simple types from the query string.'),
      ck(CORE, 'Two actions in one controller are both [HttpGet("{id}")]. The project builds and starts. What happens on GET /api/products/5?', [
        ['The first action declared in the class is chosen', false],
        ['The action with fewer parameters is chosen first', false],
        ['Both actions run and their results are combined', false],
        ['The request fails: it matched multiple endpoints', true],
      ], 'Routing finds two equally good endpoints and throws AmbiguousMatchException at request time, which surfaces as a 500. Give the routes different templates or constraints.'),
      ck(REST, 'An API team writes [HttpPost("api/products/{id}/delete")] to remove a product. Which design does REST prefer?', [
        ['[HttpGet("api/products/{id}/remove")] so browsers can trigger it', false],
        ['[HttpPost("api/deleteProduct")] with the id in the request body', false],
        ['[HttpDelete("api/products/{id}")] with the verb carrying the action', true],
      ], 'In REST the path names the resource and the HTTP method names the action, so a removal is DELETE on the product URL. GET must never change data, and verbs in paths are RPC style.'),
    ],
  },

  /* ── DTOS_RESULTS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_API_DTOS_RESULTS',
    notes: `Reading data is half an API. The other half is accepting a body and answering every outcome with the
status code that tells the client exactly what happened.

## Model binding a JSON body

    [HttpPost]
    public ActionResult<ProductDto> Create(CreateProductRequest request) { ... }

With \`[ApiController]\` the complex parameter is \`[FromBody]\`. The JSON input formatter reads it
with **System.Text.Json** using the web defaults: property names match **case-insensitively** on
input, output is **camelCase**, and unknown JSON properties are **ignored**.

- \`Content-Type\` that is not JSON (\`text/plain\`, a form) → **415 Unsupported Media Type**.
- Malformed JSON, or \`"price": "abc"\` for a \`decimal\` → **400** with a \`ValidationProblemDetails\`
  body whose error mentions the JSON path (\`$.price\`).

## DTOs: shaped for the API, not for the database

    public record CreateProductRequest(string Name, string Sku, decimal Price, int CategoryId);
    public record UpdateProductRequest(string Name, string Sku, decimal Price);
    public record ProductDto(int Id, string Name, string Sku, decimal Price, string CategoryName);

Why not accept and return the EF Core entity?

- **Over-posting.** A client sends \`"isAdmin": true\` or \`"id": 1\` and model binding sets properties
  it was never meant to control.
- **Leaking.** Every public property is serialised — a \`PasswordHash\`, a cost price — and each new
  column silently becomes API.
- **Coupling.** Renaming a column breaks every client.
- **Cycles.** \`Product.Category.Products[0].Category...\` makes System.Text.Json throw
  \`JsonException: A possible object cycle was detected\`.

Records are a good fit: immutable, value equality, one line each. Map in the service (by hand, or
with a mapper library — by hand is clearer while you learn).

## ActionResult<T> and the helper methods

    [HttpGet("{id:int}")]
    public ActionResult<ProductDto> GetById(int id)
    {
        var dto = _service.Find(id);
        if (dto is null) return NotFound();            // 404 (ProblemDetails body)
        return dto;                                    // implicit conversion → 200 + JSON
    }

    [HttpPost]
    public ActionResult<ProductDto> Create(CreateProductRequest request)
    {
        var dto = _service.Create(request);
        return CreatedAtAction(nameof(GetById), new { id = dto.Id }, dto);   // 201 + Location
    }

    [HttpPut("{id:int}")]
    public IActionResult Update(int id, UpdateProductRequest request)
        => _service.Update(id, request) ? NoContent() : NotFound();         // 204 / 404

\`ActionResult<T>\` lets one method return either a \`T\` (200) or any result (\`NotFound()\`,
\`Conflict()\`, \`BadRequest()\`), and it tells OpenAPI the success type. \`IActionResult\` works too
but hides the type.

\`CreatedAtAction\` builds the \`Location\` header from the **action name** and its route values — if
\`new { id = dto.Id }\` does not supply every route value \`GetById\` needs, link generation fails
and you get a 500 ("No route matches the supplied values").

One quirk: returning \`null\` as the value of an \`ActionResult<T>\` gives **204 No Content**, not
200 with \`null\` and not 404. Return \`NotFound()\` explicitly.

## TypedResults in minimal APIs (.NET 7+)

    products.MapGet("/{id:int}", Results<Ok<ProductDto>, NotFound> (int id, IProductService s) =>
        s.Find(id) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound());

    products.MapPost("/", Created<ProductDto> (CreateProductRequest req, IProductService s) =>
    {
        var dto = s.Create(req);
        return TypedResults.Created($"/api/products/{dto.Id}", dto);
    });

\`TypedResults\` return concrete types (\`Ok<ProductDto>\`), and the \`Results<...>\` union declares
every possible outcome — so the OpenAPI document knows them without extra attributes, and unit tests
can assert on the type. \`Results.Ok(...)\` returns plain \`IResult\` and loses that.

## Which status for which outcome

| Outcome | Status | Controller | Minimal API |
|---|---|---|---|
| Read succeeded | 200 | \`return dto;\` / \`Ok(dto)\` | \`TypedResults.Ok(dto)\` |
| Created | 201 + Location | \`CreatedAtAction(...)\` | \`TypedResults.Created(uri, dto)\` |
| Done, nothing to return | 204 | \`NoContent()\` | \`TypedResults.NoContent()\` |
| Invalid input | 400 | automatic / \`ValidationProblem()\` | \`TypedResults.ValidationProblem(errors)\` |
| No such resource | 404 | \`NotFound()\` | \`TypedResults.NotFound()\` |
| Conflicts with current state | 409 | \`Conflict()\` | \`TypedResults.Conflict()\` |
| Wrong Content-Type | 415 | automatic | automatic |

4xx means the **client** must change something; 5xx means the **server** failed. A duplicate SKU is
409, not 500.

## Common mistakes

- Returning \`Ok(new { success = false })\` for an error — every client, cache and monitor trusts the
  status line.
- \`CreatedAtAction("GetById", dto)\` — the overload without route values; the Location cannot be
  built.
- Binding the entity "just for now" and finding \`[FromBody] Product\` in production a year later.`,
    workedExample: `**Problem.** \`PUT /api/products/{id}\` replaces a product's name, SKU and price. It must answer 204 on
success, 404 if the id does not exist, and 409 if the new SKU belongs to another product.

Step 1 — the request DTO. PUT replaces the resource, so every replaceable field is in it; the id is
**not**, because the route already says which product:

    public record UpdateProductRequest(string Name, string Sku, decimal Price);

Step 2 — the service reports the outcome as a value, not with \`bool\` plus guesswork:

    public enum UpdateOutcome { Updated, NotFound, SkuTaken }

    public UpdateOutcome Update(int id, UpdateProductRequest r)
    {
        if (!_products.TryGetValue(id, out var existing)) return UpdateOutcome.NotFound;
        bool taken = _products.Values.Any(p =>
            p.Id != id && string.Equals(p.Sku, r.Sku, StringComparison.OrdinalIgnoreCase));
        if (taken) return UpdateOutcome.SkuTaken;
        _products[id] = existing with { Name = r.Name, Sku = r.Sku, Price = r.Price };
        return UpdateOutcome.Updated;
    }

Step 3 — the controller maps each outcome to exactly one status:

    [HttpPut("{id:int}")]
    public IActionResult Update(int id, UpdateProductRequest request) =>
        _service.Update(id, request) switch
        {
            UpdateOutcome.Updated  => NoContent(),
            UpdateOutcome.NotFound => NotFound(),
            UpdateOutcome.SkuTaken => Conflict(new { message = $"SKU {request.Sku} is already used" }),
            _ => StatusCode(500)
        };

Step 4 — check each outcome from the \`.http\` file:

    PUT {{host}}/api/products/1
    Content-Type: application/json

    {"name":"Gel Pen","sku":"PEN-01","price":20.00}       ### → 204

    PUT {{host}}/api/products/999 ...                      ### → 404
    PUT {{host}}/api/products/1 ... "sku":"NB-02" ...      ### → 409 when NB-02 is product 2

Note the JSON uses \`name\` and the record uses \`Name\`: input matching is case-insensitive, so it
binds. The switch expression makes a forgotten outcome visible; the Errors unit moves the 404 and
409 into one shared error shape.`,
    mcqs: [
      mcq('A curl request posts valid JSON to [HttpPost] Create(CreateProductRequest request) but sends the header Content-Type: text/plain. What does ASP.NET Core return?', [
        ['415 Unsupported Media Type, since no input formatter accepts it', true],
        ['400 with a ValidationProblemDetails body naming the request', false],
        ['201, because the JSON body is parsed whatever the header may say', false],
      ], 'MVC picks an input formatter from the Content-Type. The JSON formatter does not accept text/plain and no other formatter can read it into the record, so the request is rejected with 415.'),
      mcq('A GET action returns ActionResult<ProductDto>, and the service returns null for a missing id, which the action returns as-is. What does the client get?', [
        ['404 Not Found with a ProblemDetails body', false],
        ['204 No Content, as a null value has no body', true],
        ['200 OK with the JSON literal null as the body', false],
        ['500, because ActionResult<T> cannot hold a null', false],
      ], 'The default output formatters turn a null object result into 204 No Content. A missing resource should be reported explicitly with return NotFound(); returning null hides the outcome.'),
      mcq('An action returns the EF Core Product entity, which has a Category property whose Products list points back to the product. What is the classic result?', [
        ['The serializer throws: a possible object cycle was detected', true],
        ['The Category property is skipped from the JSON output', false],
        ['ASP.NET Core refuses at startup to return any EF entity type', false],
      ], 'System.Text.Json follows Product → Category → Products → Product and throws a JsonException about an object cycle. Returning a DTO with only the fields the client needs avoids it at the source.'),
    ],
    checkpoint: [
      ck(CORE, 'Create ends with return CreatedAtAction(nameof(GetById), new { id = dto.Id }, dto); and GetById is [HttpGet("{id:int}")]. What does the client receive for a new product with Id 12?', [
        ['200 with the body and a Link header pointing at /api/products/12', false],
        ['204 with Location set to the product URL, and an empty body', false],
        ['201 with Location set to the URL of GetById for 12, and the body', true],
      ], 'CreatedAtAction returns 201, generates the Location URL from the named action and the route values, and writes the DTO as the body, so the client knows where the new resource lives.'),
      ck(CORE, 'CreateUserRequest has Name and Email but no IsAdmin property, while the User entity has IsAdmin. A client posts {"name":"Asha","email":"a@x.in","isAdmin":true}. What is the effect?', [
        ['The user is created as an admin from the extra JSON field', false],
        ['IsAdmin is not on the DTO, so the value can never reach the entity', true],
        ['The request is rejected with 400 because of the unknown property', false],
      ], 'System.Text.Json ignores JSON properties the target type does not have, by default. Because the service builds the entity from the DTO, a client cannot over-post IsAdmin.'),
      ck(REST, 'POST /api/products is sent with a SKU that another product already uses. Which ControllerBase helper produces the status a REST client expects?', [
        ['return StatusCode(500, problem);', false],
        ['return NotFound(problem);', false],
        ['return Ok(new { success = false });', false],
        ['return Conflict(problem);', true],
      ], 'The request is well-formed but conflicts with the current state of the resource, which is 409 Conflict. Nothing failed on the server, so 500 is wrong, and 200 with a flag hides the failure.'),
    ],
  },

  /* ── VALIDATION ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_API_VALIDATION',
    notes: `Never trust a request body: the React form can be bypassed with one curl command. ASP.NET Core
validates with **data annotations** out of the box, and **FluentValidation** is the common choice when
rules grow.

## Data annotations on the DTO

    using System.ComponentModel.DataAnnotations;

    public record CreateProductRequest(
        [Required, StringLength(100, MinimumLength = 2)] string Name,
        [Required, RegularExpression(@"^[A-Z]{2,5}-\\d{2,4}$", ErrorMessage = "SKU must look like PEN-01")] string Sku,
        [Range(0.01, 1_000_000)] decimal Price,
        [Range(0, int.MaxValue)] int Stock,
        [EmailAddress] string? SupplierEmail,
        [Required] int? CategoryId);

On a positional record the attributes go on the constructor parameters, as above; on a class they go
on the properties.

| Attribute | Checks |
|---|---|
| \`[Required]\` | not null; for strings also not empty or whitespace (unless \`AllowEmptyStrings = true\`) |
| \`[StringLength(max, MinimumLength = n)]\`, \`[MaxLength]\`, \`[MinLength]\` | length |
| \`[Range(min, max)]\` | numeric (or date) range |
| \`[EmailAddress]\`, \`[Phone]\`, \`[Url]\`, \`[RegularExpression]\` | format |
| \`[Compare("Password")]\` | equals another property |

Two rules that catch everyone:

- Attributes other than \`[Required]\` treat **null as valid**. \`[EmailAddress]\` on a missing email
  passes.
- \`[Required]\` on a non-nullable **value type** (\`int CategoryId\`) is useless: a missing value
  becomes \`0\`, which is not null. Use \`int?\` with \`[Required]\`.

With nullable reference types enabled, MVC also treats a **non-nullable reference type** property
(\`string Name\`) as required, so omitting it fails validation even without \`[Required]\`.

## Automatic 400 with [ApiController]

With \`[ApiController]\`, model validation runs after binding and, if anything failed, a filter
returns **400 Bad Request** before your action runs:

    {
      "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
      "title": "One or more validation errors occurred.",
      "status": 400,
      "errors": {
        "Name": ["The Name field is required."],
        "Price": ["The field Price must be between 0.01 and 1000000."]
      },
      "traceId": "00-9f2c...-01"
    }

That body is **ValidationProblemDetails** (RFC 9457 problem details plus an \`errors\` map), served
as \`application/problem+json\`. **Every** failed field is reported, not just the first. Validation
also walks **nested complex objects and collections** automatically — unlike Java's Bean
Validation, no extra attribute is needed to cascade.

ASP.NET Core returns **400**, not 422, by default. To change the shape or status:

    builder.Services.AddControllers().ConfigureApiBehaviorOptions(o =>
    {
        o.InvalidModelStateResponseFactory = ctx =>
            new UnprocessableEntityObjectResult(new ValidationProblemDetails(ctx.ModelState));
    });

Or switch the automatic response off with \`o.SuppressModelStateInvalidFilter = true\` — then you
must check \`if (!ModelState.IsValid) return ValidationProblem(ModelState);\` in every action, which
is exactly what \`[ApiController]\` saved you from.

## Cross-field rules: IValidatableObject

    public class DateRangeRequest : IValidatableObject
    {
        public DateOnly From { get; set; }
        public DateOnly To { get; set; }
        public IEnumerable<ValidationResult> Validate(ValidationContext context)
        {
            if (To < From)
                yield return new ValidationResult("To must not be before From", new[] { nameof(To) });
        }
    }

\`Validate\` runs only after the property attributes pass.

## FluentValidation for real rules

    dotnet add package FluentValidation.DependencyInjectionExtensions

    public class CreateProductValidator : AbstractValidator<CreateProductRequest>
    {
        public CreateProductValidator()
        {
            RuleFor(x => x.Name).NotEmpty().Length(2, 100);
            RuleFor(x => x.Sku).NotEmpty().Matches(@"^[A-Z]{2,5}-\\d{2,4}$");
            RuleFor(x => x.Price).GreaterThan(0).LessThanOrEqualTo(1_000_000);
            RuleFor(x => x.SupplierEmail).EmailAddress().When(x => x.SupplierEmail is not null);
        }
    }

    builder.Services.AddValidatorsFromAssemblyContaining<CreateProductValidator>();

The rules live in one class, are unit-testable, and read like the requirement. FluentValidation's
own docs recommend **manual** validation over the old automatic MVC integration package:

    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create(
        CreateProductRequest request, [FromServices] IValidator<CreateProductRequest> validator)
    {
        var result = await validator.ValidateAsync(request);
        if (!result.IsValid)
            return ValidationProblem(new ValidationProblemDetails(result.ToDictionary()));
        ...
    }

In a minimal API (which has no automatic validation in .NET 8), the same check ends with
\`return TypedResults.ValidationProblem(result.ToDictionary());\` — also a 400
\`ValidationProblemDetails\`, so both styles produce the same error shape.

## Validation is not business rules

Annotations and validators check the **shape** of one request. "SKU must be unique" or "category
must exist" depend on stored data; the service checks them and answers 409 or 404.

## Common mistakes

- \`[Required] int Quantity\` — always passes; a missing value is 0.
- Expecting \`[Range]\` alone to reject a missing nullable value.
- Turning \`SuppressModelStateInvalidFilter\` on "to customise errors" and then forgetting the
  \`ModelState.IsValid\` check, so invalid data reaches the database.`,
    mcqs: [
      mcq('A DTO has [Required] public int Quantity { get; set; }. A client posts {} to an [ApiController] action. What happens?', [
        ['400, since the Required attribute fails for the missing field', false],
        ['415, because an empty JSON object cannot bind to the DTO', false],
        ['The action runs with Quantity = 0, because int is never null', true],
      ], 'A non-nullable int defaults to 0 when the property is absent, and [Required] only checks for null. Declare int? Quantity with [Required] to make a missing value fail.'),
      mcq('A property is declared [EmailAddress] public string? SupplierEmail { get; set; } with nothing else, and the request omits it. Does validation pass?', [
        ['Yes, the format attributes accept null as valid', true],
        ['No, [EmailAddress] treats a missing value as a bad address', false],
        ['No, every nullable property is reported as missing', false],
      ], 'Data-annotation attributes other than [Required] return valid for null, so "optional but well-formed" can be expressed. Add [Required] if the email must be supplied.'),
      mcq('CreateOrderRequest has a List<OrderLine> Lines, and OrderLine has [Range(1, 100)] int Quantity. An [ApiController] action receives a line with Quantity 0. What does the client get?', [
        ['201, because only top-level properties are validated', false],
        ['400 with an error keyed to that line\'s Quantity', true],
        ['500, because nested validation throws an exception', false],
        ['200, because the list itself is present and non-empty', false],
      ], 'MVC model validation recurses into complex properties and collection elements by itself. The failing element is reported with a key such as Lines[0].Quantity in the errors map.'),
    ],
    checkpoint: [
      ck(CORE, 'An [ApiController] action\'s DTO fails three data-annotation rules at once. What does the body of the automatic response contain?', [
        ['A ValidationProblemDetails with all three fields listed under errors', true],
        ['A plain-text message naming only the first field that failed', false],
        ['An empty body, since only the 400 status signals the failure', false],
      ], 'The automatic response is a 400 ValidationProblemDetails whose errors map holds every field that failed, so a form can highlight all of them after one round trip.'),
      ck(CORE, 'Program.cs sets ConfigureApiBehaviorOptions(o => o.SuppressModelStateInvalidFilter = true). An action never checks ModelState. What happens to an invalid body?', [
        ['The framework still returns the automatic 400 response', false],
        ['The request fails with 500 because validation was skipped', false],
        ['The action runs with the invalid data as if it were valid', true],
      ], 'Suppressing the filter turns off the automatic 400. Validation still populates ModelState, but unless the action checks ModelState.IsValid and returns ValidationProblem, invalid data goes through.'),
      ck(CORE, 'A minimal API endpoint uses FluentValidation and the result is invalid. Which return gives the same error shape as an [ApiController] validation failure?', [
        ['TypedResults.BadRequest(result.Errors.First().ToString())', false],
        ['TypedResults.ValidationProblem(result.ToDictionary())', true],
        ['TypedResults.Problem(result.ToString(), statusCode: 500)', false],
        ['TypedResults.UnprocessableEntity(result.Errors.Count)', false],
      ], 'ValidationProblem takes a dictionary of field names to messages and returns 400 with a ValidationProblemDetails body. The others return a string, a 500 or a 422 with a number, all different shapes.'),
    ],
  },

  /* ── ERRORS_MIDDLEWARE ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_API_ERRORS_MIDDLEWARE',
    notes: `Without a plan every error looks different: a ValidationProblemDetails here, an empty 404 there, a
developer exception page in one environment and a bare 500 in another. The front end then needs a
parser per endpoint. The fix is **one error shape — ProblemDetails — for every failure, produced in
one place.**

## ProblemDetails

RFC 9457 (which replaced RFC 7807) defines \`application/problem+json\`:

    {
      "type": "https://tools.ietf.org/html/rfc9110#section-15.5.5",
      "title": "Not Found",
      "status": 404,
      "detail": "Product 999 was not found.",
      "instance": "/api/products/999",
      "traceId": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
    }

\`type\`, \`title\`, \`status\`, \`detail\` and \`instance\` are standard; anything else goes in
**extensions** (\`traceId\` here). \`ValidationProblemDetails\` is the same plus \`errors\`.

## AddProblemDetails and UseExceptionHandler (.NET 7+ / 8)

    builder.Services.AddProblemDetails();          // registers IProblemDetailsService

    var app = builder.Build();
    app.UseExceptionHandler();                     // FIRST in the pipeline
    app.UseStatusCodePages();                      // empty 4xx/5xx bodies become ProblemDetails

With \`AddProblemDetails\` registered:

- an **unhandled exception** anywhere later in the pipeline becomes a **500 ProblemDetails** with no
  stack trace (in Development the developer exception page still shows details locally);
- \`UseStatusCodePages\` gives an empty-bodied 404 or 405 a ProblemDetails body too.

Customise every ProblemDetails in one callback:

    builder.Services.AddProblemDetails(o => o.CustomizeProblemDetails = ctx =>
        ctx.ProblemDetails.Extensions["traceId"] = ctx.HttpContext.TraceIdentifier);

## IExceptionHandler (.NET 8)

Map your own exceptions to statuses with a handler class:

    public sealed class NotFoundException(string message) : Exception(message);
    public sealed class ConflictException(string message) : Exception(message);

    public sealed class AppExceptionHandler(IProblemDetailsService problems, ILogger<AppExceptionHandler> log)
        : IExceptionHandler
    {
        public async ValueTask<bool> TryHandleAsync(HttpContext http, Exception ex, CancellationToken ct)
        {
            var (status, title) = ex switch
            {
                NotFoundException => (StatusCodes.Status404NotFound, "Not Found"),
                ConflictException => (StatusCodes.Status409Conflict, "Conflict"),
                _ => (0, "")
            };
            if (status == 0) return false;                    // not mine: let the next handler try

            http.Response.StatusCode = status;
            return await problems.TryWriteAsync(new ProblemDetailsContext
            {
                HttpContext = http,
                ProblemDetails = { Status = status, Title = title, Detail = ex.Message },
                Exception = ex
            });
        }
    }

    builder.Services.AddExceptionHandler<AppExceptionHandler>();
    builder.Services.AddProblemDetails();
    ...
    app.UseExceptionHandler();

Handlers are tried **in registration order**; the first to return \`true\` wins. If all return
\`false\`, the default 500 ProblemDetails is written. \`AddExceptionHandler\` does nothing on its
own — \`app.UseExceptionHandler()\` is the middleware that calls it.

The service now just throws (\`throw new NotFoundException($"Product {id} was not found.")\`), and
controllers contain no try/catch.

**Never** put the message of an *unexpected* exception in the response — it may contain SQL, file
paths or a customer's data. Expected exceptions (yours) carry messages written for clients; unknown
ones get a generic 500 and a full log entry.

## Writing your own middleware

Convention-based middleware: a constructor taking \`RequestDelegate\` and an \`InvokeAsync\` method.

    public sealed class CorrelationIdMiddleware(RequestDelegate next)
    {
        private const string Header = "X-Correlation-Id";

        public async Task InvokeAsync(HttpContext context, ILogger<CorrelationIdMiddleware> log)
        {
            var id = context.Request.Headers.TryGetValue(Header, out var v) && !string.IsNullOrEmpty(v)
                ? v.ToString()
                : Guid.NewGuid().ToString("N");

            context.Response.OnStarting(() =>
            {
                context.Response.Headers[Header] = id;
                return Task.CompletedTask;
            });

            using (log.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = id }))
            {
                await next(context);
            }
        }
    }

    app.UseMiddleware<CorrelationIdMiddleware>();   // after UseExceptionHandler

The middleware instance is created **once** for the app. So:

- singleton dependencies may go in the constructor;
- **scoped** dependencies (a \`DbContext\`, a per-request service) go as **parameters of
  InvokeAsync**, which is resolved per request. Putting a scoped service in the constructor fails
  with *Cannot resolve scoped service ... from root provider* when scope validation is on (it is in
  Development).

(\`IMiddleware\` is the alternative: register the class in DI with any lifetime and the factory
creates it per request.)

## Where your middleware goes

After \`UseExceptionHandler\` (so its exceptions are handled), and for anything that needs the user,
after \`UseAuthentication\`/\`UseAuthorization\`.

## Common mistakes

- \`UseExceptionHandler\` registered after the middleware that throws — it never sees the exception.
- \`AddExceptionHandler<T>()\` without \`app.UseExceptionHandler()\`.
- Setting \`Response.StatusCode\` after the body has started: *StatusCode cannot be set because the
  response has already started*.
- A catch-all returning \`ex.ToString()\` to the caller.`,
    workedExample: `**Problem.** The React team gets three different error formats from the catalogue API. Make a missing
product, an invalid POST and a bug all answer as ProblemDetails.

Before (inside the controller):

    [HttpGet("{id:int}")]
    public IActionResult Get(int id)
    {
        try { return Ok(_service.Get(id)); }
        catch (Exception ex) { return NotFound(ex.Message); }      // any bug becomes a 404
    }

A \`NullReferenceException\` from a bug is reported as "not found", and the body is a bare string.

After: \`AppExceptionHandler\` and \`AddProblemDetails\` from the notes, \`app.UseExceptionHandler()\`
first in the pipeline, and the action becomes \`public ProductDto Get(int id) => _service.Get(id);\`.

    GET /api/products/999
    404 application/problem+json
    {"type":"https://tools.ietf.org/html/rfc9110#section-15.5.5","title":"Not Found","status":404,
     "detail":"Product 999 was not found.","traceId":"00-..."}

    POST /api/products   {"name":"","price":-5}
    400 application/problem+json
    {"title":"One or more validation errors occurred.","status":400,
     "errors":{"Name":["..."],"Sku":["..."],"Price":["..."],"CategoryId":["..."]},"traceId":"00-..."}

    (a bug throws NullReferenceException; environment = Production)
    500 application/problem+json
    {"type":"https://tools.ietf.org/html/rfc9110#section-15.6.1",
     "title":"An error occurred while processing your request.","status":500,"traceId":"00-..."}
    and the log has the full exception with the same traceId.

The bug is now a 500 — it is the server's fault — and the \`traceId\` in the response lets support
find the exact log entry. The front end parses one shape: \`title\`, \`detail\`, and \`errors\` when
present.`,
    mcqs: [
      mcq('Program.cs calls builder.Services.AddExceptionHandler<AppExceptionHandler>() and AddProblemDetails(), but never app.UseExceptionHandler(). A service throws NotFoundException. What happens?', [
        ['The handler never runs, because no middleware invokes it', true],
        ['The handler maps it to 404, since registration is enough', false],
        ['Startup fails, since a handler needs the middleware too', false],
      ], 'IExceptionHandler implementations are called by the exception handler middleware. Without app.UseExceptionHandler() nothing catches the exception for them, so it surfaces as an ordinary unhandled 500.'),
      mcq('Two handlers are registered: AddExceptionHandler<ValidationHandler>() then AddExceptionHandler<NotFoundHandler>(). ValidationHandler returns false for a NotFoundException. What happens next?', [
        ['The request ends with a default 500 ProblemDetails right away', false],
        ['Both handlers write to the response and the bodies are merged', false],
        ['NotFoundHandler is tried next, in registration order', true],
      ], 'Handlers run in the order they were registered until one returns true. Returning false means "not mine", so the next handler gets the exception; if none handles it, the default response is written.'),
      mcq('A custom middleware takes AppDbContext (registered as scoped) in its constructor. In Development, what goes wrong?', [
        ['It fails to resolve a scoped service from the root provider', true],
        ['Nothing; the DbContext is simply shared by all requests', false],
        ['Each request gets a new middleware instance and a new context', false],
        ['The context is disposed after the first request is complete', false],
      ], 'Convention middleware is constructed once, from the root provider. Scope validation (on in Development) refuses to resolve a scoped service there. Take the DbContext as an InvokeAsync parameter instead.'),
    ],
    checkpoint: [
      ck(CORE, 'A team adds app.UseExceptionHandler() as the last line before app.Run(), after MapControllers(). A controller throws. What does the client get?', [
        ['A ProblemDetails 500, since registration order is irrelevant', false],
        ['A 500 the exception handler never touched, as it runs too late', true],
        ['A 404, because the exception handler swallows the error', false],
      ], 'Middleware only sees exceptions thrown by components that run after it in the pipeline. Registered last, the exception handler wraps nothing; it must be first.'),
      ck(CORE, 'An unexpected NullReferenceException reaches UseExceptionHandler with AddProblemDetails registered, in Production. What does the response body contain?', [
        ['A 500 ProblemDetails with a generic title and no stack trace', true],
        ['The exception message and stack trace, to help the client', false],
        ['An empty body, as problem details apply to 4xx statuses only', false],
      ], 'The default handler writes a 500 ProblemDetails with a generic title and no exception details. The full exception goes to the log, keeping internals away from callers.'),
      ck(REST, 'Which response fields does RFC 9457 define as the standard members of a problem details object?', [
        ['code, message, stack, path and timestamp', false],
        ['error, reason, status, trace and request', false],
        ['type, title, status, detail and instance', true],
        ['status, errors, field, value and message', false],
      ], 'The standard members are type, title, status, detail and instance; anything else, such as traceId or errors, is an extension member. The other lists are home-grown formats.'),
    ],
  },

  /* ── CONFIG_ENVIRONMENTS ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_API_CONFIG_ENVIRONMENTS',
    notes: `The DI topic covered configuration, options and ILogger in general. This unit is what changes when
they run inside a web API that is deployed to Development, Staging and Production.

## The environment

\`builder.Environment.EnvironmentName\` comes from \`ASPNETCORE_ENVIRONMENT\` (or
\`DOTNET_ENVIRONMENT\`). If neither is set it is **Production** — a deliberate safe default.

    if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }
    if (app.Environment.IsProduction())  { app.UseHsts(); }

Locally, \`Properties/launchSettings.json\` sets it:

    "profiles": {
      "http": {
        "commandName": "Project",
        "applicationUrl": "http://localhost:5080",
        "environmentVariables": { "ASPNETCORE_ENVIRONMENT": "Development" }
      }
    }

\`dotnet run --launch-profile http\` picks a profile. On a server or in a container you set the
environment variable yourself; \`launchSettings.json\` is not deployed.

## Configuration sources and who wins

\`WebApplication.CreateBuilder\` loads, from **lowest to highest** priority:

1. \`appsettings.json\`
2. \`appsettings.{Environment}.json\` (e.g. \`appsettings.Development.json\`)
3. **User secrets** — only when the environment is Development
4. **Environment variables**
5. **Command-line arguments**

A later source overrides an earlier one key by key. So \`appsettings.Production.json\` overrides
\`appsettings.json\`, and an environment variable overrides both.

Hierarchical keys use \`:\` in code and \`__\` (double underscore) in environment variables, because
\`:\` is not valid in variable names on every OS:

    "ConnectionStrings": { "Catalogue": "Server=localhost;Database=Catalogue;..." }
    → builder.Configuration.GetConnectionString("Catalogue")
    → env var: ConnectionStrings__Catalogue=Server=prod-sql;...

## Secrets stay out of Git

    dotnet user-secrets init
    dotnet user-secrets set "Jwt:Key" "a-long-random-development-key"

User secrets are stored in your user profile, outside the project folder, and are loaded only in
Development. In Production the same key arrives as \`Jwt__Key\` from the environment or a secret store
(Azure Key Vault). Never commit a real password to \`appsettings.json\`.

## Options bound to sections

    "Catalogue": { "MaxPageSize": 50, "LowStockThreshold": 5 }

    public sealed class CatalogueOptions
    {
        public const string Section = "Catalogue";
        [Range(1, 200)] public int MaxPageSize { get; set; } = 20;
        [Range(0, 1000)] public int LowStockThreshold { get; set; }
    }

    builder.Services.AddOptions<CatalogueOptions>()
        .Bind(builder.Configuration.GetSection(CatalogueOptions.Section))
        .ValidateDataAnnotations()
        .ValidateOnStart();                   // a bad value fails at startup, not at 2 a.m.

Inject \`IOptions<CatalogueOptions>\` (read once), \`IOptionsSnapshot<CatalogueOptions>\` (scoped,
re-read **per request**, so a changed appsettings file is picked up) or
\`IOptionsMonitor<CatalogueOptions>\` (singleton with change notifications). A singleton service
cannot take \`IOptionsSnapshot\` — it is scoped.

## Logging in a web API

The template's \`appsettings.json\`:

    "Logging": {
      "LogLevel": {
        "Default": "Information",
        "Microsoft.AspNetCore": "Warning"
      }
    }

The most specific category prefix wins: your \`Catalogue.Api.*\` classes log at Information, the
framework's \`Microsoft.AspNetCore.*\` only at Warning and above. Use structured templates:

    _log.LogInformation("Product {ProductId} created with SKU {Sku}", dto.Id, dto.Sku);
    _log.LogWarning("Low stock for {Sku}: {Quantity} left", sku, qty);
    _log.LogError(ex, "Payment callback failed for order {OrderId}", orderId);   // exception FIRST

## Request logging

    builder.Services.AddHttpLogging(o =>
    {
        o.LoggingFields = HttpLoggingFields.RequestMethod | HttpLoggingFields.RequestPath
                        | HttpLoggingFields.ResponseStatusCode | HttpLoggingFields.Duration;
    });
    ...
    app.UseHttpLogging();

HTTP logging writes at **Information** under the category
\`Microsoft.AspNetCore.HttpLogging.HttpLoggingMiddleware\`. Because the template sets
\`Microsoft.AspNetCore\` to Warning, you also need:

    "Microsoft.AspNetCore.HttpLogging.HttpLoggingMiddleware": "Information"

Avoid logging request bodies and headers in Production: they contain passwords and tokens.

## Common mistakes

- Expecting \`appsettings.Development.json\` to apply on the server — the environment there is
  Production unless you set it.
- \`Catalogue:MaxPageSize\` as an environment variable name — use \`Catalogue__MaxPageSize\`.
- Turning on \`UseHttpLogging\` and seeing nothing, because the category is still at Warning.`,
    mcqs: [
      mcq('appsettings.json has "Catalogue": { "MaxPageSize": 50 }, appsettings.Production.json has 20, and the container sets Catalogue__MaxPageSize=10. The environment is Production. Which value is bound?', [
        ['50, since appsettings.json is the main configuration file', false],
        ['10, because environment variables override both JSON files', true],
        ['20, because the environment file is loaded after the base file', false],
      ], 'Sources are layered: appsettings.json, then appsettings.{Environment}.json, then (in Development) user secrets, then environment variables and command-line arguments. The last source to set a key wins.'),
      mcq('A singleton CatalogueCache takes IOptionsSnapshot<CatalogueOptions> in its constructor. What goes wrong?', [
        ['Snapshot is scoped, so a singleton cannot depend on it', true],
        ['It receives a fresh value on every single property read', false],
        ['It only works when the options section is non-empty', false],
      ], 'IOptionsSnapshot<T> is registered as scoped so that it can be recomputed per request. A singleton that captures it is rejected by scope validation; use IOptionsMonitor<T> in singletons.'),
      mcq('The template appsettings.json has "Microsoft.AspNetCore": "Warning". app.UseHttpLogging() is added, but no request lines appear. Which change makes them appear?', [
        ['Set "Default" to "Debug" so every category logs more', false],
        ['Call AddHttpLogging a second time after builder.Build()', false],
        ['Set HttpLoggingMiddleware\'s category to "Information"', true],
        ['Move UseHttpLogging after app.MapControllers() instead', false],
      ], 'HTTP logging writes at Information under Microsoft.AspNetCore.HttpLogging.HttpLoggingMiddleware. The more specific Microsoft.AspNetCore rule at Warning filters it, whatever Default says, until that category is raised.'),
    ],
    checkpoint: [
      ck(CORE, 'An API is deployed to a VM with no ASPNETCORE_ENVIRONMENT or DOTNET_ENVIRONMENT set. Which environment does app.Environment report?', [
        ['Production', true],
        ['Development', false],
        ['Staging', false],
        ['None, it is an empty string', false],
      ], 'When no environment variable is set, ASP.NET Core uses Production, so a forgotten setting never exposes development-only features such as Swagger UI or the developer exception page.'),
      ck(CORE, 'Options are registered with AddOptions<CatalogueOptions>().Bind(...).ValidateDataAnnotations().ValidateOnStart(), and MaxPageSize is [Range(1, 200)]. Production config sets it to 500. When is the problem reported?', [
        ['Only when a request first injects the options and reads them', false],
        ['When the app starts, which fails before taking any requests', true],
        ['Never; data annotations apply to request bodies alone', false],
      ], 'ValidateOnStart makes the host validate the options during startup, so a bad deployment fails immediately. Without it, validation happens the first time the options value is requested.'),
      ck(CORE, 'A developer runs dotnet user-secrets set "Jwt:Key" "dev-key" and later deploys to Production. Where does the production app get Jwt:Key?', [
        ['Not from user secrets: set it in the environment or a key vault', true],
        ['From the secrets file, since it is copied into the publish folder', false],
        ['From the local user profile, read over the network at startup', false],
      ], 'User secrets live in the developer\'s profile and are loaded only in the Development environment. Production must supply the key itself, for example as the Jwt__Key environment variable.'),
    ],
  },

  /* ── OPENAPI ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_API_OPENAPI',
    notes: `An API another developer cannot discover is an API they will message you about. **OpenAPI** is the
standard JSON description of an HTTP API — paths, parameters, request and response schemas, status
codes. **Swagger UI** renders it as a page where you can try every endpoint.

## Swashbuckle in the .NET 8 template

    builder.Services.AddEndpointsApiExplorer();   // needed for minimal APIs
    builder.Services.AddSwaggerGen();
    ...
    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();                         // serves /swagger/v1/swagger.json
        app.UseSwaggerUI();                       // serves the UI at /swagger
    }

\`AddEndpointsApiExplorer\` exposes minimal-API endpoints to the generator; controllers are already
described by \`AddControllers\`. The spec is generated by reflection over your actions, their route
templates, parameter types and return types.

**Version note:** in .NET 9 the \`webapi\` template dropped Swashbuckle for the built-in
**Microsoft.AspNetCore.OpenApi** package — \`builder.Services.AddOpenApi()\` and
\`app.MapOpenApi()\`, which serves \`/openapi/v1.json\` with no UI by default. The concepts below
(response types, summaries, XML comments) carry over; this topic uses .NET 8 and Swashbuckle.

## Describing the responses

The generator sees \`ActionResult<ProductDto>\` and documents a 200 with that schema — but it cannot
know your action also returns 404 or 409. Say so:

    [HttpPost]
    [ProducesResponseType<ProductDto>(StatusCodes.Status201Created)]          // generic form: .NET 8+
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public ActionResult<ProductDto> Create(CreateProductRequest request) { ... }

(\`[ProducesResponseType(typeof(ProductDto), 201)]\` is the older non-generic form.) Put
\`[Produces("application/json")]\` on the controller to stop the docs listing \`text/plain\` and XML.

For minimal APIs, metadata goes on the endpoint, or comes from \`TypedResults\` automatically:

    products.MapPost("/", CreateProduct)
        .WithName("CreateProduct")
        .WithSummary("Create a product")
        .Produces<ProductDto>(StatusCodes.Status201Created)
        .ProducesValidationProblem()
        .ProducesProblem(StatusCodes.Status409Conflict);

A handler returning \`Results<Created<ProductDto>, ValidationProblem, Conflict>\` documents all three
without the \`Produces\` calls.

## XML comments become descriptions

    <!-- Catalogue.Api.csproj -->
    <PropertyGroup>
      <GenerateDocumentationFile>true</GenerateDocumentationFile>
      <NoWarn>$(NoWarn);1591</NoWarn>   <!-- no warning for every undocumented public member -->
    </PropertyGroup>

    builder.Services.AddSwaggerGen(o =>
    {
        var xml = Path.Combine(AppContext.BaseDirectory, $"{Assembly.GetExecutingAssembly().GetName().Name}.xml");
        o.IncludeXmlComments(xml);
        o.SwaggerDoc("v1", new OpenApiInfo { Title = "Catalogue API", Version = "v1" });
    });

    /// <summary>Creates a product in the catalogue.</summary>
    /// <param name="request">Name, SKU (e.g. PEN-01), price and category.</param>
    /// <response code="201">The product was created.</response>
    /// <response code="409">Another product already uses this SKU.</response>
    [HttpPost]
    public ActionResult<ProductDto> Create(CreateProductRequest request) { ... }

\`<summary>\` becomes the operation summary, \`<response>\` the status descriptions, and comments on
DTO properties become schema descriptions.

## What breaks the generator

- An action with **no HTTP verb attribute**: Swashbuckle throws *Ambiguous HTTP method for action*
  and Swagger UI shows *Failed to load API definition*.
- Two actions whose DTOs share a class name in different namespaces: schema ids clash. Fix with
  \`o.CustomSchemaIds(t => t.FullName)\` or rename.
- A public method on a controller that is not meant to be an action: mark it \`[NonAction]\`.

## Production

The template shows Swagger only in Development. Exposing it in production publishes your attack
surface; if partners need the spec, serve it behind authentication or publish the JSON file.

## A spec is also a contract

Tools generate clients from the JSON (NSwag, Kiota, \`openapi-typescript\` for the React app). A
response type you forgot to document becomes a client that does not handle it — so the
\`ProducesResponseType\` list is not decoration.`,
    mcqs: [
      mcq('A .NET 8 controller action returns ActionResult<ProductDto> and can also return NotFound(), with no other attributes. What does the generated Swagger document show?', [
        ['Both 200 and 404, inferred from the method body', false],
        ['No responses at all until XML comments are enabled', false],
        ['Only 200 with ProductDto; the 404 needs an attribute', true],
      ], 'The generator reads signatures and metadata, not method bodies. It documents the 200 from ActionResult<ProductDto>; other statuses must be declared with [ProducesResponseType] or conventions.'),
      mcq('Swagger UI shows "Failed to load API definition", and the log names an action that has no [HttpGet], [HttpPost] or other verb attribute. What is the fix?', [
        ['Remove AddEndpointsApiExplorer() from Program.cs', false],
        ['Add the correct HTTP verb attribute to that action', true],
        ['Move UseSwaggerUI() before UseSwagger() in the pipeline', false],
      ], 'Swashbuckle cannot describe an action that matches every verb, so generation fails with an ambiguous HTTP method error. Give it a verb attribute, or [NonAction] if it is not an endpoint.'),
      mcq('A project created with the .NET 9 webapi template has no Swashbuckle package. Which call serves its OpenAPI JSON document?', [
        ['app.MapOpenApi() after builder.Services.AddOpenApi()', true],
        ['app.UseSwagger() after builder.Services.AddSwaggerGen()', false],
        ['app.MapSwaggerUI() after builder.Services.AddSwagger()', false],
      ], '.NET 9 templates use Microsoft.AspNetCore.OpenApi: AddOpenApi registers the generator and MapOpenApi serves /openapi/v1.json. UseSwagger and AddSwaggerGen belong to Swashbuckle.'),
    ],
    checkpoint: [
      ck(CORE, 'GenerateDocumentationFile is true and the action has /// <summary> comments, yet Swagger UI shows no descriptions. What is most likely missing?', [
        ['The [ApiController] attribute on the class that holds the action', false],
        ['A Swashbuckle.AspNetCore.Annotations reference and [SwaggerOperation]', false],
        ['A call to IncludeXmlComments with the path of the generated XML file', true],
      ], 'The compiler writes the XML file, but Swashbuckle only reads it when AddSwaggerGen is told where it is with IncludeXmlComments. Annotations are an alternative, not a requirement.'),
      ck(CORE, 'A minimal API handler is declared to return Results<Ok<ProductDto>, NotFound>. What does that give the OpenAPI document compared with returning IResult?', [
        ['Both the 200 with ProductDto and the 404 are documented', true],
        ['The schema is identical; the union only helps the compiler', false],
        ['Only the 404 is documented, since Ok is the implicit default', false],
      ], 'TypedResults types carry endpoint metadata, and the Results<...> union lists every outcome, so the generator documents both. A plain IResult return gives it nothing to infer from.'),
      ck(REST, 'A partner team will generate a TypeScript client from your OpenAPI spec. Why must every error status be declared in it?', [
        ['Generated clients refuse to compile without a 500 entry', false],
        ['The spec is the contract; undeclared statuses go unhandled', true],
        ['Swagger UI hides endpoints that declare only a 200 response', false],
      ], 'Client generators build types and handling only from what the spec lists. A 409 that is not declared becomes a response the generated client does not model, so callers do not handle it.'),
    ],
  },

  /* ── DEBUGGING ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_API_DEBUGGING',
    notes: `ASP.NET Core API bugs fall into a short list. Each has a recognisable symptom — the status code, or
the first exception in the console — and one fix. Read the status and the log first; set
\`"Microsoft.AspNetCore": "Debug"\` temporarily and the routing log tells you which endpoint (if any)
matched.

## 1. Every controller URL is 404

    builder.Services.AddControllers();
    var app = builder.Build();
    app.UseHttpsRedirection();
    app.Run();                                     // MapControllers is missing

**Cause:** the controllers are registered as services but never mapped as endpoints. **Fix:**
\`app.MapControllers();\` before \`app.Run()\`. (A typo in the route — \`api/product\` vs
\`api/products\` — gives the same 404 for one controller only.)

## 2. 500: "Unable to resolve service for type 'IProductService' while attempting to activate 'ProductsController'"

**Cause:** the controller's constructor needs a service that was never registered. Controllers are
created per request, so this fails at **request time**, not at startup. **Fix:**
\`builder.Services.AddScoped<IProductService, ProductService>();\`.

## 3. 415 Unsupported Media Type

**Cause:** the request carries no JSON \`Content-Type\` — Postman's *form-data* or *Text* tab, or
curl without \`-H "Content-Type: application/json"\`. **Fix:** send JSON with the header. axios sets
it automatically for a plain object.

## 4. 400 with "The JSON value could not be converted to System.Decimal. Path: $.price"

    {"name": "Pen", "price": "twenty"}

**Cause:** the body is valid JSON but a value has the wrong type (or the JSON is malformed — a
trailing comma gives a similar 400). With \`[ApiController]\` the model state is invalid and the
automatic 400 \`ValidationProblemDetails\` names the path. **Fix:** correct the client; the server is
behaving properly.

## 5. 405 Method Not Allowed

\`POST /api/products/5\` when only \`[HttpPut("{id:int}")]\` exists. **Cause:** the path matches an
endpoint but not the verb. **Fix:** use the right verb or add the action.

## 6. 404 for /api/products/abc — expected a 400

**Cause:** \`[HttpGet("{id:int}")]\`: the constraint rejects "abc", so no route matches. This is
correct behaviour, not a bug — but know why it is 404. If you want a 400 with a message, drop the
constraint and let model binding fail.

## 7. 500: "Cannot resolve scoped service 'Catalogue.Api.Data.AppDbContext' from root provider"

**Cause:** a custom middleware (or a singleton) takes a scoped service in its constructor. **Fix:**
take it as a parameter of \`InvokeAsync\`, or make the consumer scoped.

## 8. InvalidOperationException: "StatusCode cannot be set because the response has already started"

**Cause:** a middleware wrote to the body (or called \`next\`, and the controller wrote) and then
tried to change the status or a header. **Fix:** decide the status before writing, or set headers in
\`Response.OnStarting\`.

## 9. Swagger UI: "Failed to load API definition"

**Cause:** usually an action with no HTTP verb attribute (*Ambiguous HTTP method for action*), or
two schema types with the same name. **Fix:** add the attribute or \`[NonAction]\`; set
\`CustomSchemaIds\`.

## 10. "Failed to bind to address http://127.0.0.1:5080: address already in use"

**Cause:** another run of the app (an old terminal, a debugger session) holds the port. **Fix:** stop
it — on Windows \`netstat -ano | findstr :5080\` then \`taskkill /PID <pid> /F\` — or change
\`applicationUrl\` in \`launchSettings.json\`.

## Method

Reproduce with the \`.http\` file or curl, read the **status** and the **first exception** in the
console (the innermost one is usually the real cause), form one hypothesis, change one thing,
restart, re-run.`,
    mcqs: [
      mcq('The API starts cleanly, but the first GET /api/orders returns 500 with "Unable to resolve service for type \'IOrderService\' while attempting to activate \'OrdersController\'". What is the fix?', [
        ['Register IOrderService with its implementation in Program.cs', true],
        ['Mark OrdersController with [ApiController] so it can be built', false],
        ['Add a parameterless constructor to OrdersController as well', false],
        ['Move app.MapControllers() above app.UseHttpsRedirection()', false],
      ], 'The controller is activated per request and its constructor needs IOrderService, which the container does not know. Registering it (AddScoped<IOrderService, OrderService>()) fixes the cause.'),
      mcq('A React form posts to /api/orders with Postman-style multipart form data, and the action takes a JSON DTO with [ApiController]. Which status comes back?', [
        ['400 Bad Request', false],
        ['422 Unprocessable Entity', false],
        ['415 Unsupported Media Type', true],
        ['405 Method Not Allowed', false],
      ], 'The DTO parameter is inferred as [FromBody], which only the JSON input formatter reads. A multipart request has no formatter that accepts it, so the answer is 415.'),
      mcq('A timing middleware calls await next(context) and then sets context.Response.StatusCode = 200 for logging reasons. Some requests throw "StatusCode cannot be set because the response has already started". Why?', [
        ['StatusCode can only be read, never set, inside middleware', false],
        ['The controller already sent headers and body by that point', true],
        ['The middleware must be registered after MapControllers()', false],
        ['Kestrel resets the status when HTTPS redirection is on', false],
      ], 'Once the endpoint starts writing the body, the status line and headers have been sent and cannot change. Middleware that runs after next should only observe the response, not alter it.'),
      mcq('dotnet run fails with "Failed to bind to address http://127.0.0.1:5080: address already in use" on Windows. What addresses the cause?', [
        ['Delete the bin and obj folders and run dotnet build again', false],
        ['Change ASPNETCORE_ENVIRONMENT to Production and rerun', false],
        ['Remove UseHttpsRedirection() so Kestrel can bind again', false],
        ['Find the process holding port 5080 and stop it', true],
      ], 'Another process, often an earlier run of the same app, owns the port. Stop it (netstat -ano | findstr :5080, then taskkill) or change applicationUrl; rebuilding or switching environments does not free it.'),
    ],
  },

  /* ── PRACTICE ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_API_PRACTICE',
    notes: `Build these in one .NET 8 Web API project (\`dotnet new webapi -n Institute.Api --use-controllers\`),
keeping data in a \`ConcurrentDictionary\` inside a singleton service. Test every endpoint from the
\`.http\` file or Postman, and write down the status code you expect **before** sending each request.

The resource is a **Student** in a coaching institute: \`Id\`, \`Name\`, \`Email\`, \`Phone\` (10 digits),
\`Course\` (an enum: \`DotnetFs\`, \`JavaFs\`, \`Mern\`), \`FeePaid\` (\`decimal\`).

## Exercise 1 — The pipeline

Trim Program.cs to what you need. Add an inline middleware that logs
\`{Method} {Path} -> {StatusCode} in {Ms} ms\` after \`next\`, and a \`GET /health\` minimal endpoint
returning \`"OK"\`. Run with \`dotnet watch\`. Then move the logging middleware below
\`app.MapControllers()\` and explain what you observe.

## Exercise 2 — CRUD with the right verbs and statuses

| Method | Path | Success |
|---|---|---|
| GET | /api/students | 200 + list |
| GET | /api/students/{id:int} | 200, or 404 |
| POST | /api/students | 201 + Location (\`CreatedAtAction\`) + body |
| PUT | /api/students/{id:int} | 204, or 404 |
| DELETE | /api/students/{id:int} | 204, or 404 |

Use \`CreateStudentRequest\` and \`StudentDto\` records; the client never sends \`Id\`.

## Exercise 3 — The same endpoints as minimal APIs

In a second file, \`StudentEndpoints.cs\`, write an extension method \`MapStudentEndpoints\` that maps
\`/api/v2/students\` with \`MapGroup\` and \`TypedResults\`, returning \`Results<Ok<StudentDto>, NotFound>\`
for the single-student GET. Compare the Swagger entries of v1 (controller) and v2.

## Exercise 4 — Validation

\`Name\` required, 2–80; \`Email\` required and valid; \`Phone\` exactly 10 digits
(\`[RegularExpression(@"^\\d{10}$")]\`); \`FeePaid\` 0 or more. Send a body that breaks all four and
confirm four entries in \`errors\`. Then write a FluentValidation validator for v2 with the same rules
and return \`TypedResults.ValidationProblem\`.

## Exercise 5 — One error shape

Add \`AddProblemDetails\`, an \`IExceptionHandler\` mapping \`NotFoundException\` → 404 and
\`DuplicateEmailException\` → 409, and \`app.UseExceptionHandler()\` first. Remove every try/catch from
the controller. Add a deliberate bug endpoint and confirm a generic 500 ProblemDetails in Production
(\`ASPNETCORE_ENVIRONMENT=Production dotnet run --no-launch-profile\`).

## Exercise 6 — Configuration and docs

Bind an \`Institute\` section (\`MaxPageSize\`, \`DefaultCourse\`) to options with \`ValidateOnStart\`,
override \`MaxPageSize\` with an environment variable, and add XML comments plus
\`ProducesResponseType\` for every status each action can return. Confirm Swagger UI is absent in
Production.

**Self-check:** no entity is returned without a DTO; no path contains a verb; every error the API
produces is \`application/problem+json\`.`,
    mcqs: [
      mcq('In Exercise 2, the Delete action runs for student 9, who exists. Which response does the table ask the controller to return?', [
        ['200 OK with the removed student in the body', false],
        ['202 Accepted with a job id for later polling', false],
        ['204 No Content and an empty response body', true],
      ], 'The table specifies 204 for a successful delete: the work is done and there is nothing to return. 202 is for work queued for later processing, and 200 with a body is not what was asked.'),
      mcq('In Exercise 1, the logging middleware is moved below app.MapControllers(). Requests to /api/students still get logged. Why?', [
        ['Endpoints run at the end of the pipeline, after the middleware', true],
        ['Middleware order never matters in .NET 8 and later', false],
        ['MapControllers() re-registers all middleware after itself', false],
      ], 'With WebApplication, endpoints execute at the end of the pipeline, so middleware added after Map calls still runs before them. Registering it before the Map calls is the convention that keeps order readable.'),
      mcq('For Exercise 4, which attribute accepts "9876543210" but rejects "98765-4321"?', [
        ['[StringLength(10, MinimumLength = 10)]', false],
        ['[RegularExpression(@"^\\d{10}$")]', true],
        ['[Range(1000000000, 9999999999)]', false],
        ['[Phone, MaxLength(10)]', false],
      ], 'The regex anchors exactly ten digits, so a dash fails. [StringLength(10)] accepts any ten characters, including the dash, and [Phone] accepts many punctuation styles.'),
      mcq('In Exercise 5, a POST uses an email that another student already has. What should the response be?', [
        ['409 ProblemDetails from the exception handler mapping', true],
        ['400 ValidationProblemDetails listing the Email field', false],
        ['500 ProblemDetails with the generic error title', false],
      ], 'A duplicate email is not a format error; the request conflicts with stored data. The IExceptionHandler maps DuplicateEmailException to 409, while 500 would blame the server.'),
      mcq('In Exercise 6, the Institute section is bound and the container sets an environment variable to override MaxPageSize. Which name works on every OS?', [
        ['Institute:MaxPageSize', false],
        ['Institute.MaxPageSize', false],
        ['Institute__MaxPageSize', true],
        ['INSTITUTE-MAXPAGESIZE', false],
      ], 'The environment variable provider maps a double underscore to the configuration key separator. A colon is not allowed in variable names on every platform, and dots or dashes are not separators.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_API_INTERVIEW_QUESTION',
    notes: `Three questions that open almost every ASP.NET Core interview for a fresher or 0–2 year .NET role.
Practise each answer aloud in under two minutes, with one concrete example from your own project.

## Q1. "Explain the ASP.NET Core middleware pipeline. Why does the order matter?"

**Model answer.** Every request passes through a chain of middleware components configured in
Program.cs after \`builder.Build()\`. Each one receives the \`HttpContext\` and a \`next\` delegate; it can
do work before calling \`next\`, after it, or not call it at all and short-circuit — static files or
a CORS preflight do that. The response flows back through the same components in reverse order.
Order matters because each middleware only affects what comes after it: \`UseExceptionHandler\` goes
first so it can catch exceptions from everything else; \`UseCors\` comes before
\`UseAuthentication\`, which comes before \`UseAuthorization\`, because authorization needs the user
authentication established; endpoints like \`MapControllers\` run at the end. \`app.Use\` can call
next, \`app.Run\` is terminal, \`app.Map\` branches by path.

**Follow-ups:** *"How do you write custom middleware?"* — a class with a \`RequestDelegate\`
constructor and \`InvokeAsync(HttpContext)\`, registered with \`UseMiddleware<T>\`; scoped services go
into \`InvokeAsync\` parameters because the instance lives for the whole app. *"Middleware vs
filters?"* — middleware sees every request; MVC filters run only around controller actions and know
about model state and action arguments.

## Q2. "Controllers or minimal APIs? What does [ApiController] actually do?"

**Model answer.** Both use the same routing, DI and model binding. Controllers group related actions
in a class and get MVC features — filters, conventions, and with \`[ApiController]\`: attribute routing
is required, model validation failures become an automatic 400 \`ValidationProblemDetails\`, binding
sources are inferred (complex types from the body, route values from the route, simple types from
the query), and error results like \`NotFound()\` get a ProblemDetails body. Minimal APIs map lambdas
directly, with less ceremony and slightly less overhead, but in .NET 8 they don't run data-annotation
validation automatically, so I validate explicitly — FluentValidation or an endpoint filter. I use
controllers for a large API with a team, minimal APIs for small services, and \`MapGroup\` plus
\`TypedResults\` to keep minimal APIs organised and documented.

**Follow-ups:** *"What is TypedResults for?"* — concrete result types that document themselves in
OpenAPI and are easy to assert in unit tests. *"How do you change the automatic 400 to 422?"* —
\`ConfigureApiBehaviorOptions\` with \`InvalidModelStateResponseFactory\`.

## Q3. "How do you handle errors globally in an ASP.NET Core API?"

**Model answer.** I return RFC 9457 ProblemDetails for every error. \`builder.Services.AddProblemDetails()\`
plus \`app.UseExceptionHandler()\` first in the pipeline turns any unhandled exception into a 500
ProblemDetails without a stack trace. For expected failures the service throws specific exceptions —
\`NotFoundException\`, \`ConflictException\` — and in .NET 8 I implement \`IExceptionHandler\`, register
it with \`AddExceptionHandler<T>()\`, and map each type to 404 or 409. Validation errors are already
\`ValidationProblemDetails\` from \`[ApiController]\`. Controllers have no try/catch. I add a
\`traceId\` to every problem so a user's error can be matched to the log entry, and I never return
the message of an unexpected exception.

**Follow-ups:** *"Before .NET 8?"* — a custom middleware wrapping \`await next\` in try/catch, or an
exception filter. *"Exceptions for flow control — is that expensive?"* — throwing is costlier than
returning a result, so some teams return a result type from services and map it in the controller;
for genuinely exceptional paths the cost does not matter.

## How you are judged

Interviewers listen for the mechanism — \`next\`, reverse order on the way out, automatic 400 from a
filter, handlers tried in order — and one real example ("my exception handler was after
\`MapControllers\` and never caught anything") rather than definitions recited from a blog.`,
    mcqs: [
      mcq('An interviewer asks: "What is the difference between app.Use and app.Run when adding middleware?" Which answer is correct?', [
        ['app.Use is synchronous only; app.Run allows async handlers', false],
        ['app.Use can call the next middleware; app.Run is terminal', true],
        ['app.Use applies in Development; app.Run applies everywhere', false],
      ], 'app.Use receives a next delegate and may pass the request on; app.Run receives none and ends the pipeline. Both accept async lambdas and work in every environment.'),
      mcq('Asked "middleware or an MVC action filter — which runs for a request to a static file?", what is the right answer?', [
        ['Only middleware; filters run around controller actions', true],
        ['Both of them, since filters run for every request too', false],
        ['Only filters, because static files skip all middleware', false],
      ], 'Static files are served by middleware early in the pipeline, and no controller action is involved, so no MVC filter runs. Filters wrap action execution and see model state and arguments.'),
      mcq('An interviewer asks how to make an [ApiController] API return 422 rather than 400 for validation failures. What is the best answer?', [
        ['Return StatusCode(422) at the start of every action body', false],
        ['Add [ProducesResponseType(422)] to each controller class', false],
        ['Set InvalidModelStateResponseFactory in ConfigureApiBehaviorOptions', true],
      ], 'The automatic response is created by InvalidModelStateResponseFactory, so replacing it changes the status for every action at once. ProducesResponseType only documents, and per-action code repeats itself.'),
    ],
  },

  /* ── MINI_PROJECT ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_API_MINI_PROJECT',
    notes: `# A Product Catalogue Web API

Build the Web API for an online stationery shop's catalogue on **ASP.NET Core 8 (.NET 8)**. Data lives
in memory in this project (thread-safe stores inside singleton services); the EF Core topic will swap
that for SQL Server without touching your controllers, so keep the layers clean.

## Resources

**Category:** \`Id\`, \`Name\` (unique, 2–50 chars), \`Description\` (optional, up to 200).

**Product:** \`Id\`, \`Name\` (2–100 chars), \`Sku\` (unique, pattern \`^[A-Z]{2,5}-\\d{2,4}$\`, e.g. \`PEN-01\`),
\`Price\` (\`decimal\`, 0.01 to 1,000,000), \`Stock\` (0 or more), \`CategoryId\` (must exist),
\`IsActive\` (default true).

## Endpoints

| Method | Path | Purpose | Success | Errors |
|---|---|---|---|---|
| GET | /api/categories | list categories | 200 | — |
| POST | /api/categories | create a category | 201 + Location | 400, 409 |
| GET | /api/products | list; optional \`categoryId\`, \`q\` (name contains), \`minPrice\`, \`maxPrice\`, \`page\`, \`pageSize\` | 200 | 400 |
| GET | /api/products/{id:int} | one product | 200 | 404 |
| POST | /api/products | create | 201 + Location | 400, 404 (category), 409 (SKU) |
| PUT | /api/products/{id:int} | replace | 204 | 400, 404, 409 |
| PATCH | /api/products/{id:int}/stock | body \`{"change": -3}\`; adjust stock | 200 + product | 400, 404, 409 (would go negative) |
| DELETE | /api/products/{id:int} | delete | 204 | 404 |
| GET | /health | health (minimal API) | 200 | — |

Responses return \`ProductDto\` (with \`CategoryName\`), never the internal objects.

## Design requirements

- Controllers with \`[ApiController]\` and \`ControllerBase\` for categories and products; \`/health\` as a
  minimal API endpoint.
- Request DTOs (records) with data annotations — or FluentValidation validators — and response DTOs
  separate from them. \`pageSize\` is capped by configuration.
- Services hold the rules (unique SKU, category exists, stock not negative) and throw specific
  exceptions; controllers contain no try/catch and no business logic.
- \`AddProblemDetails\`, one \`IExceptionHandler\` mapping your exceptions to 404 and 409, and
  \`app.UseExceptionHandler()\` first: every error, including validation and unexpected 500s, is
  \`application/problem+json\` with a \`traceId\`.
- A correlation-id middleware: reads \`X-Correlation-Id\` or creates one, echoes it on the response,
  and adds it to the logging scope.
- \`CatalogueOptions\` (\`MaxPageSize\`, \`LowStockThreshold\`) bound from configuration with
  \`ValidateDataAnnotations().ValidateOnStart()\`; log a Warning with structured placeholders when a
  stock change leaves a product at or below the threshold.
- \`appsettings.Development.json\` vs \`appsettings.Production.json\`: Debug vs Information for your
  namespace; HTTP logging of method, path, status and duration. Seed 3 categories and 10 products only
  in Development.
- Swagger in Development only, with XML comments and \`ProducesResponseType\` for every status each
  action can return.

## Acceptance criteria

- Creating a product with a duplicate SKU returns 409 ProblemDetails and changes nothing.
- A body with blank name, bad SKU and negative price returns 400 listing all three fields.
- \`{"price": "abc"}\` returns 400; \`GET /api/products/xyz\` returns 404 (the \`:int\` constraint).
- \`PATCH .../stock\` with a change that would make stock negative returns 409; stock is unchanged.
- \`DELETE\` twice on the same id returns 204 and then 404.
- \`POST\` returns a \`Location\` header that, when followed, returns the same product.
- \`pageSize=500\` is capped at \`MaxPageSize\`; an invalid \`MaxPageSize\` in configuration stops startup.
- With \`ASPNETCORE_ENVIRONMENT=Production\`, \`/swagger\` is a 404 and no response contains a stack
  trace.`,
    mcqs: [
      mcq('In the catalogue API, PATCH /api/products/5/stock with {"change": -10} arrives when stock is 4. Which response does the brief require from this endpoint?', [
        ['409 ProblemDetails, and stock stays 4', true],
        ['200, with the stock clamped to zero', false],
        ['400, since a change must be positive', false],
      ], 'The request is well-formed, but applying it would break a rule about current state (stock cannot go negative), so it is a conflict: 409 with no change. Clamping silently loses the client\'s intent.'),
      mcq('The brief says GET /api/products/xyz returns 404, not 400. What in the design causes that?', [
        ['The IExceptionHandler maps FormatException to a 404', false],
        ['The {id:int} route constraint means no route matches "xyz"', true],
        ['Model binding converts "xyz" to 0, and no product has Id 0', false],
      ], 'The :int constraint is evaluated during routing, before any binding. "xyz" fails it, so no endpoint matches and routing answers 404. The handler and model binding never run.'),
    ],
    assignment: {
      title: 'A Product Catalogue Web API',
      description: 'An ASP.NET Core 8 Web API for a stationery shop\'s catalogue: categories and products with CRUD endpoints, request and response DTOs, validation, one ProblemDetails error shape through IExceptionHandler, a custom middleware, per-environment configuration and logging, and Swagger documentation.',
      instructions: `Build the API described in this unit's brief and submit it as a repository link or a zip.

**Submit:**

1. The solution (\`.csproj\`, \`Program.cs\`, folders for controllers, DTOs, services, errors,
   middleware), runnable with \`dotnet run\`.
2. \`appsettings.json\`, \`appsettings.Development.json\` and \`appsettings.Production.json\`, with no
   secrets in them.
3. A \`.http\` file (or Postman collection) covering every endpoint, including at least one request
   for each error status in the endpoints table.
4. A README with: how to run in Development and Production, the Swagger URL, and the actual responses
   (status and body) for the acceptance criteria — duplicate SKU, the three-field validation failure,
   the negative-stock PATCH, the double DELETE, the malformed price and the capped page size.
5. A short paragraph explaining where each rule is enforced (DTO validation vs service vs route
   constraint) and why.

**Before you submit, run every acceptance criterion against the running app**, not by reading your
code.`,
      rubric: [
        { criterion: 'Endpoints and HTTP semantics', description: 'All endpoints in the table work; verbs and paths are RESTful; 201 with a working Location from CreatedAtAction, 204 on PUT and DELETE; filters and paging on GET /api/products behave as described.', maxPoints: 25 },
        { criterion: 'DTOs and validation', description: 'Separate request and response records; no internal object returned; every field rule enforced with data annotations or FluentValidation; all failed fields reported together as ValidationProblemDetails.', maxPoints: 20 },
        { criterion: 'Error handling and middleware', description: 'AddProblemDetails, an IExceptionHandler for 404 and 409, UseExceptionHandler first; every error is problem+json with a traceId; no stack trace in any response; correlation-id middleware works and uses InvokeAsync for scoped dependencies.', maxPoints: 20 },
        { criterion: 'Business rules and structure', description: 'Unique SKU, existing category and non-negative stock enforced in services with specific exceptions; controllers have no try/catch; thread-safe stores; services registered with sensible lifetimes.', maxPoints: 15 },
        { criterion: 'Configuration, environments and logging', description: 'CatalogueOptions validated on start; Development and Production differ as specified; seed data only in Development; structured log messages; HTTP logging visible at the right category level.', maxPoints: 10 },
        { criterion: 'Documentation', description: 'Swagger only in Development, with XML comment summaries and ProducesResponseType for every returned status; README and .http file complete and accurate.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_API_CHECKPOINT',
    notes: `Ten questions on ASP.NET Core Web APIs as a .NET interview examines them: reading Program.cs, a
controller, a DTO or a configuration file and saying what a request actually gets back. They cover
the pipeline and middleware order, controllers and minimal APIs, binding and status codes,
validation, ProblemDetails and exception handling, configuration per environment, and OpenAPI.
Answer from what the code does, not from what it was meant to do.`,
    checkpoint: [
      ck(CORE, 'Program.cs registers, in order: app.UseAuthorization(); app.UseAuthentication(); app.MapControllers(). A valid JWT is sent to an [Authorize] action. What is the typical result?', [
        ['401, because authorization ran before the user was known', true],
        ['200, since both middlewares are present in the pipeline', false],
        ['403, because the token is checked against the wrong policy', false],
      ], 'Authorization evaluated before authentication sees an anonymous user and challenges, giving 401 even for a valid token. UseAuthentication must come before UseAuthorization.'),
      ck(REST, 'GET /api/orders?page=two reaches [HttpGet] List([FromQuery] int page = 1) in an [ApiController]. What does the client receive?', [
        ['200 with page 1, as the default value is used', false],
        ['500, because int.Parse threw a FormatException', false],
        ['400, because "two" cannot be bound to an int', true],
      ], 'A default applies only when the parameter is absent. A present value that fails conversion makes the model state invalid, and [ApiController] returns 400 before the action runs.'),
      ck(CORE, 'A record CreateOrderRequest(string CustomerName, AddressDto Address) has AddressDto with [Required] string Pincode. A body sends "address": {"pincode": ""}. What does an [ApiController] action respond?', [
        ['201, because only top-level properties are ever validated', false],
        ['400 with an error keyed to the nested Address.Pincode field', true],
        ['400 with errors on CustomerName and on the Address object', false],
      ], 'MVC validation walks into nested complex objects automatically, and [Required] rejects an empty string, so the error is reported for Address.Pincode. CustomerName is present, so it has no error.'),
      ck(REST, 'Which pairing of an ASP.NET Core return and the outcome it reports is correct?', [
        ['return Ok(); after a resource was created', false],
        ['return NotFound(); when the body is malformed', false],
        ['return StatusCode(500); for a duplicate email', false],
        ['return NoContent(); after a successful DELETE', true],
      ], 'A successful delete with nothing to return is 204 No Content. A creation is 201 with a Location, a malformed body is 400, and a duplicate is a 409 conflict, not a server failure.'),
      ck(CORE, 'An IExceptionHandler handles NotFoundException only and returns false otherwise. AddProblemDetails and UseExceptionHandler are set up. A service throws InvalidOperationException. What does the client get?', [
        ['404, as the registered handler maps every service exception', false],
        ['200 with an empty body, as the exception was swallowed', false],
        ['A default 500 ProblemDetails, since no handler took it', true],
      ], 'Returning false means "not handled". With no other handler returning true, the middleware writes its default 500 ProblemDetails, while the exception is still logged.'),
      ck(CORE, 'appsettings.json sets "Catalogue:MaxPageSize": 50, appsettings.Development.json sets 5, and the app runs with ASPNETCORE_ENVIRONMENT=Development and nothing else. Which value is bound?', [
        ['5, as the environment file is layered on top', true],
        ['50, because appsettings.json is the primary file', false],
        ['Startup fails because the key is defined twice', false],
      ], 'appsettings.{Environment}.json is loaded after appsettings.json, so keys it defines win. Defining a key in several sources is normal; precedence decides.'),
      ck(REST, 'A mobile client retries POST /api/payments after a timeout, although the first call had succeeded. What must the API design account for?', [
        ['Nothing; ASP.NET Core drops repeated POST requests itself', false],
        ['A second payment, since POST is not idempotent', true],
        ['A 409 that Kestrel returns for any repeated request', false],
      ], 'Each POST may create a new resource, so a blind retry can charge twice. APIs accept an idempotency key that the server stores, returning the first result for a repeated key.'),
      ck(CORE, 'A minimal API endpoint is app.MapPost("/api/products", (CreateProductRequest req) => ...), and the record has [Required] on Name. In .NET 8, a body without name is posted. What happens?', [
        ['The handler runs: minimal APIs skip annotation validation', true],
        ['400 ValidationProblemDetails, as for an [ApiController]', false],
        ['415, because minimal APIs need [FromBody] on the record', false],
      ], 'In .NET 8 minimal APIs bind the body but do not run data-annotation validation (that arrives in .NET 10). The handler must validate explicitly, for example with FluentValidation and TypedResults.ValidationProblem.'),
      ck(CORE, 'Swagger in .NET 8 shows the 200 for GET /api/products/{id} but not the 404 the action returns. Which attribute documents it?', [
        ['[HttpGet("{id}", Name = "NotFound")] on the action', false],
        ['[Produces("application/problem+json")] on the class', false],
        ['[ProducesResponseType(StatusCodes.Status404NotFound)]', true],
      ], 'ProducesResponseType adds a documented response with its status (and optionally its type). Naming a route does not add responses, and Produces only sets the content type.'),
      ck(CORE, 'A custom middleware is class AuditMiddleware(RequestDelegate next) and needs the scoped AuditDbContext. Where should it receive the context?', [
        ['As a constructor parameter, next to RequestDelegate', false],
        ['As a parameter of InvokeAsync, resolved per request', true],
        ['From a static field that is set once in Program.cs', false],
      ], 'Convention middleware is constructed once for the app, so constructor parameters must be singletons. InvokeAsync parameters are resolved from the request scope, which is where a scoped DbContext belongs.'),
    ],
  },
];
