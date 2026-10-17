/**
 * Career-track content (.NET Full Stack + AI, batch N2): dependency injection, configuration and
 * logging in .NET 8 (JT_DOTNET_DI).
 *
 * This is Microsoft.Extensions.DependencyInjection, Microsoft.Extensions.Configuration and
 * Microsoft.Extensions.Logging — the same three libraries under a console app built on the generic
 * host (`Host.CreateApplicationBuilder`) and under ASP.NET Core (`WebApplication.CreateBuilder`,
 * `builder.Services`). Web API controllers come in a later topic; here a controller appears only as
 * the most common consumer of an injected service.
 *
 * The questions are about what the container does with a specific registration or constructor,
 * because that is how .NET DI is examined: "which implementation is injected?", "why does this
 * throw at startup?", "why does the singleton see a disposed DbContext?".
 *
 * The topic is single-skill, so no question names a skillKey.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_CS_DI_BUNDLES: PilotBundle[] = [
  /* ── WHY_DI ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DOTNET_DI_WHY_DI',
    notes: `A real .NET application is a graph of objects: a controller needs an \`OrderService\`, the
service needs an \`IOrderRepository\` and an \`IEmailSender\`, the repository needs a connection
string. Someone has to create those objects in the right order and hand each one what it needs.
**Dependency injection (DI)** means a class does not create its collaborators — it *receives* them.

## The class that creates its own dependencies

    public class OrderService
    {
        private readonly SqlOrderRepository _repo = new SqlOrderRepository("Server=prod;...");
        private readonly SmtpEmailSender _email = new SmtpEmailSender("smtp.office365.com", 587);

        public void Place(Order order)
        {
            _repo.Save(order);
            _email.Send(order.CustomerEmail, "Order placed");
        }
    }

Three problems hide in those two lines:

- **It cannot be tested.** A unit test of \`Place\` writes to a real database and sends a real email.
- **It cannot be reconfigured.** The connection string and SMTP host are baked into the class.
- **It is tied to one implementation.** Moving to SendGrid means editing \`OrderService\`, a class
  whose job is placing orders, not choosing a mail provider.

## Depend on an interface, receive it through the constructor

    public interface IOrderRepository { void Save(Order order); }
    public interface IEmailSender { void Send(string to, string subject); }

    public class OrderService
    {
        private readonly IOrderRepository _repo;
        private readonly IEmailSender _email;

        public OrderService(IOrderRepository repo, IEmailSender email)
        {
            _repo = repo;
            _email = email;
        }

        public void Place(Order order)
        {
            _repo.Save(order);
            _email.Send(order.CustomerEmail, "Order placed");
        }
    }

Now \`OrderService\` states what it needs and nothing more. A test passes fakes:

    var fakeEmail = new FakeEmailSender();               // records calls in a List<string>
    var service = new OrderService(new InMemoryOrderRepository(), fakeEmail);
    service.Place(new Order { CustomerEmail = "a@b.com" });
    Assert.Single(fakeEmail.Sent);                        // xUnit

This is the **Dependency Inversion Principle** (the D in SOLID): high-level code (placing orders)
depends on an abstraction (\`IEmailSender\`), and the low-level detail (SMTP) implements it.

## Wiring by hand — the "composition root"

Somebody still has to call \`new\`. With DI, all of it moves to one place at startup:

    var repo = new SqlOrderRepository(connectionString);
    var email = new SmtpEmailSender(smtpHost, 587);
    var service = new OrderService(repo, email);
    var controller = new OrderController(service);

That is fine for five classes. At fifty it hurts: every new constructor parameter means editing
the wiring, objects that must be shared get created twice, objects that hold connections must be
disposed in the right order, and ASP.NET Core needs a *fresh* set of some objects for every HTTP
request.

## What a container does

A **DI container** automates the composition root. In .NET it is built in —
\`Microsoft.Extensions.DependencyInjection\` — and every ASP.NET Core and generic-host app already
has one:

    var builder = WebApplication.CreateBuilder(args);
    builder.Services.AddScoped<IOrderRepository, SqlOrderRepository>();
    builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();
    builder.Services.AddScoped<OrderService>();
    var app = builder.Build();

You **register** which implementation serves each interface and how long it lives; the container
reads constructors, builds the graph on demand, reuses or recreates instances according to the
**lifetime**, and disposes what it created. The next units cover registration, lifetimes,
configuration and logging — all of which come to your class the same way: through the constructor.

## Common mistakes

- **Service locator.** Injecting \`IServiceProvider\` and calling \`GetService<T>()\` inside methods
  hides the real dependencies; the constructor no longer tells you what the class needs.
- **\`new\` inside a class that the container manages.** The object you create gets nothing
  injected and is not disposed by the container.
- **An interface for everything.** Interfaces earn their place where there is a seam you will
  fake or swap (database, email, clock, HTTP). A pure calculation class can be registered as itself.`,
    mcqs: [
      mcq('OrderService has `private readonly SmtpEmailSender _email = new SmtpEmailSender("smtp.office365.com", 587);`. What is the main obstacle this creates for a unit test of OrderService.Place?', [
        ['The test cannot substitute a fake sender, so every run tries real SMTP', true],
        ['readonly fields cannot be read by xUnit, so assertions on _email fail', false],
        ['SmtpEmailSender must be registered with AddSingleton before any test runs', false],
      ], 'Because the class constructs its own sender, nothing outside can supply a different one. Taking IEmailSender through the constructor lets the test pass a fake that records calls.'),
      mcq('Which statement best describes what Microsoft.Extensions.DependencyInjection does for an ASP.NET Core app?', [
        ['It compiles interfaces into concrete classes when the project is built', false],
        ['It builds objects from registrations and constructors, and disposes them', true],
        ['It replaces constructors with property setters that ASP.NET fills by reflection', false],
      ], 'The container reads the registrations in IServiceCollection, inspects constructors to find what each service needs, creates instances according to their lifetime and disposes the disposable ones it created.'),
      mcq('A class takes IServiceProvider in its constructor and calls `_sp.GetRequiredService<IEmailSender>()` inside each method. Why do reviewers call this an anti-pattern?', [
        ['GetRequiredService is slower than reflection and blocks the thread pool', false],
        ['IServiceProvider is scoped and cannot ever be injected into any class', false],
        ['The real dependencies are hidden from the constructor and from tests', true],
      ], 'This is the service-locator pattern: the constructor only says "I need a provider", so readers and tests cannot see that the class needs an IEmailSender, and a missing registration fails only when the method runs.'),
    ],
    checkpoint: [
      mcq('In SOLID terms, OrderService depending on IEmailSender instead of SmtpEmailSender applies which principle?', [
        ['The Single Responsibility Principle', false],
        ['The Dependency Inversion Principle', true],
        ['The Liskov Substitution Principle', false],
        ['The Open/Closed Principle only', false],
      ], 'Dependency Inversion says high-level policy should depend on abstractions, and low-level details implement them. OrderService (policy) depends on IEmailSender; SmtpEmailSender (detail) implements it.'),
      mcq('In a .NET app that uses the built-in container, where does the "composition root" — deciding which class implements which interface — normally live?', [
        ['In Program.cs, as registrations on builder.Services', true],
        ['In each class, as attributes on its constructor parameters', false],
        ['In the .csproj, as PackageReference elements per interface', false],
      ], 'All the wiring is gathered at startup: Program.cs registers implementations on IServiceCollection (often via extension methods such as AddInfrastructure()). Classes only declare what they need.'),
      mcq('Inside a service the container created, a developer writes `var sender = new SmtpEmailSender(_options);` instead of injecting IEmailSender. What is true of `sender`?', [
        ['It is the same instance the container would have injected anyway', false],
        ['The container tracks it and disposes it when the request scope ends', false],
        ['It is an ordinary object: the container did not build it or track it', true],
      ], 'The container only manages instances it creates. An object made with new is invisible to it: nothing is injected into it, its lifetime is whatever your code makes it, and it is not disposed by the container.'),
    ],
  },

  /* ── SERVICE_COLLECTION ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DOTNET_DI_SERVICE_COLLECTION',
    notes: `Two types do the work. **\`IServiceCollection\`** is a list of registrations you build at startup.
**\`IServiceProvider\`** is the container built from that list; it creates and hands out instances.

## In ASP.NET Core

    var builder = WebApplication.CreateBuilder(args);

    builder.Services.AddControllers();
    builder.Services.AddScoped<IOrderRepository, SqlOrderRepository>();
    builder.Services.AddScoped<IOrderService, OrderService>();
    builder.Services.AddSingleton<IClock, SystemClock>();

    var app = builder.Build();      // IServiceCollection -> IServiceProvider; registrations are now frozen
    app.MapControllers();
    app.Run();

A controller simply asks for what it needs:

    [ApiController, Route("api/orders")]
    public class OrdersController : ControllerBase
    {
        private readonly IOrderService _orders;
        public OrdersController(IOrderService orders) => _orders = orders;

        [HttpPost]
        public IActionResult Place(PlaceOrderDto dto) => Ok(_orders.Place(dto));
    }

For each request, ASP.NET Core asks the container for an \`OrdersController\`; the container sees
it needs \`IOrderService\`, which needs \`IOrderRepository\` and \`IClock\`, and builds the chain.

## In a console app — the generic host

The same container is available outside the web, through \`Microsoft.Extensions.Hosting\`:

    using Microsoft.Extensions.DependencyInjection;
    using Microsoft.Extensions.Hosting;

    var builder = Host.CreateApplicationBuilder(args);       // .NET 7+
    builder.Services.AddSingleton<IClock, SystemClock>();
    builder.Services.AddTransient<ReportGenerator>();
    builder.Services.AddHostedService<NightlyReportWorker>();  // a BackgroundService

    using IHost host = builder.Build();
    host.Run();

The host also wires in configuration and logging — the topics of the last two lesson units.

## The registration forms

    services.AddScoped<IOrderService, OrderService>();         // interface -> implementation
    services.AddScoped<OrderService>();                         // a concrete class as itself
    services.AddSingleton<IClock>(new FixedClock(today));       // an instance you created
    services.AddScoped<IPaymentGateway>(sp =>                   // a factory, for custom construction
        new RazorpayGateway(sp.GetRequiredService<IOptions<RazorpayOptions>>().Value.Key));

## How the constructor is chosen

The container picks the public constructor with the **most parameters it can satisfy** from
registrations. Keep one constructor per service and the question never arises. Primitive
parameters such as \`string connectionString\` cannot be resolved — pass settings through the
options pattern (unit 4) or a factory.

## Several implementations of one interface

    services.AddSingleton<INotifier, EmailNotifier>();
    services.AddSingleton<INotifier, SmsNotifier>();

- Injecting \`INotifier\` gives the **last** registration: \`SmsNotifier\`.
- Injecting \`IEnumerable<INotifier>\` gives **all of them**, in registration order.
- \`TryAddSingleton<INotifier, EmailNotifier>()\` (in \`Microsoft.Extensions.DependencyInjection.Extensions\`)
  registers only if nothing is registered for \`INotifier\` yet — what libraries use so your own
  registration wins.
- **.NET 8 keyed services** pick one by key:

      services.AddKeyedSingleton<INotifier, SmsNotifier>("sms");
      public AlertService([FromKeyedServices("sms")] INotifier notifier) { ... }

## Asking the provider directly

\`GetService<T>()\` returns \`null\` when nothing is registered; \`GetRequiredService<T>()\` throws
\`InvalidOperationException: No service for type 'T' has been registered.\` Use these only at the
edges (Program.cs, factories, background workers) — everywhere else, take the dependency in the
constructor.

## Organising registrations

Group them in extension methods so Program.cs stays readable:

    public static class InfrastructureServices
    {
        public static IServiceCollection AddInfrastructure(this IServiceCollection services)
        {
            services.AddScoped<IOrderRepository, SqlOrderRepository>();
            services.AddSingleton<IClock, SystemClock>();
            return services;
        }
    }
    // Program.cs: builder.Services.AddInfrastructure();`,
    workedExample: `**Problem.** A console tool imports a CSV of students and emails each a welcome message. It
currently does \`new CsvReader()\`, \`new SmtpSender()\` and \`new StudentImporter(...)\` in Main. Move it
onto the generic host so the sender can be faked in tests.

**Step 1 — extract the seams.** Email is external, so it gets an interface:

    public interface IWelcomeSender { Task SendAsync(string email, string name); }
    public class SmtpWelcomeSender : IWelcomeSender { ... }

**Step 2 — constructor injection.** The importer receives what it needs:

    public class StudentImporter
    {
        private readonly CsvReader _csv;
        private readonly IWelcomeSender _sender;
        public StudentImporter(CsvReader csv, IWelcomeSender sender) { _csv = csv; _sender = sender; }

        public async Task<int> ImportAsync(string path)
        {
            var count = 0;
            foreach (var s in _csv.Read(path)) { await _sender.SendAsync(s.Email, s.Name); count++; }
            return count;
        }
    }

**Step 3 — the composition root.**

    var builder = Host.CreateApplicationBuilder(args);
    builder.Services.AddSingleton<CsvReader>();                       // stateless, a concrete class
    builder.Services.AddSingleton<IWelcomeSender, SmtpWelcomeSender>();
    builder.Services.AddTransient<StudentImporter>();

    using var host = builder.Build();
    var importer = host.Services.GetRequiredService<StudentImporter>();  // the one place we resolve directly
    var n = await importer.ImportAsync(args[0]);
    Console.WriteLine($"Imported {n} students");

**Step 4 — the test, without a host.**

    var fake = new RecordingSender();                  // implements IWelcomeSender, stores calls
    var importer = new StudentImporter(new CsvReader(), fake);
    await importer.ImportAsync("three-students.csv");
    Assert.Equal(3, fake.Calls.Count);

**Why it is right.** Only Program.cs knows that SMTP is the real sender. The test never builds a
container — constructor injection makes the class testable by itself, and the container is only
the convenience that wires the real thing.`,
    mcqs: [
      mcq(`Which implementation does a constructor parameter of type INotifier receive?

    services.AddSingleton<INotifier, EmailNotifier>();
    services.AddSingleton<INotifier, SmsNotifier>();`, [
        ['EmailNotifier, because the first registration of a type wins', false],
        ['SmsNotifier, because the last registration of a type wins', true],
        ['Neither; startup fails because the registration is ambiguous', false],
      ], 'For a single INotifier the provider uses the last registration. Both remain registered, so IEnumerable<INotifier> would receive EmailNotifier then SmsNotifier.'),
      mcq('A library calls `services.TryAddSingleton<IClock, SystemClock>()` after your Program.cs already did `services.AddSingleton<IClock, FakeClock>()`. Which IClock is injected?', [
        ['SystemClock, since library registrations override application ones', false],
        ['FakeClock, since TryAdd skips a type that already has a registration', true],
        ['Both are injected as an array because two registrations now exist', false],
      ], 'TryAdd* only adds the descriptor when no registration exists for the service type. That is why libraries use it: the application\'s own choice survives.'),
      mcq('ReportService has one public constructor, `ReportService(IClock clock, string outputFolder)`. IClock is registered; nothing else is. What happens when it is resolved?', [
        ['outputFolder is passed an empty string and the service is created', false],
        ['outputFolder is read from configuration by its parameter name', false],
        ['Resolution throws, as no service exists for type string', true],
      ], 'The container only supplies registered services. It cannot invent a string, so activation fails with "Unable to resolve service for type \'System.String\'...". Use options or a factory registration for settings.'),
    ],
    checkpoint: [
      mcq('What does `app.Services.GetService<IPdfExporter>()` return when IPdfExporter was never registered?', [
        ['null', true],
        ['A default instance created by reflection', false],
        ['It throws InvalidOperationException', false],
        ['It throws NullReferenceException', false],
      ], 'GetService returns null for an unregistered type. GetRequiredService is the variant that throws InvalidOperationException ("No service for type ... has been registered.").'),
      mcq('An AlertService constructor parameter is `IEnumerable<INotifier> notifiers`, with EmailNotifier and then SmsNotifier registered for INotifier. What is injected?', [
        ['Only SmsNotifier, wrapped in a one-element sequence', false],
        ['Both, in the order they were registered', true],
        ['An empty sequence unless AddEnumerable was called first', false],
      ], 'Requesting IEnumerable<T> resolves every registration for T, in registration order. It is the standard way to run several handlers or notifiers.'),
      mcq('In .NET 8, how does a constructor ask for the INotifier registered with `AddKeyedSingleton<INotifier, SmsNotifier>("sms")`?', [
        ['By naming the parameter sms so the container matches on name', false],
        ['By putting [FromKeyedServices("sms")] on the parameter', true],
        ['By injecting INotifier and casting it to SmsNotifier inside the class', false],
      ], 'Keyed services, new in .NET 8, are requested with the [FromKeyedServices(key)] attribute on the parameter, or with GetRequiredKeyedService<T>(key) on the provider. Parameter names play no part.'),
    ],
  },

  /* ── LIFETIMES ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DOTNET_DI_LIFETIMES',
    notes: `Every registration has a **lifetime**: how long one instance is reused.

| Lifetime | One instance per… | Registered with | Typical use |
|---|---|---|---|
| Singleton | application | \`AddSingleton\` | stateless helpers, caches, \`IClock\`, configuration objects |
| Scoped | scope (in ASP.NET Core: one HTTP request) | \`AddScoped\` | \`DbContext\`, repositories, unit of work, per-request user info |
| Transient | resolution — a new one every time it is injected | \`AddTransient\` | lightweight, stateless services |

## Seeing it

    public class Tracker { public Guid Id { get; } = Guid.NewGuid(); }

    builder.Services.AddScoped<Tracker>();

    app.MapGet("/ids", (Tracker a, Tracker b) => new { a = a.Id, b = b.Id });

With \`AddScoped\`, one request shows the **same** id twice and the next request shows a new id.
With \`AddTransient\`, \`a\` and \`b\` differ. With \`AddSingleton\`, the id never changes until restart.

## What a scope is

ASP.NET Core creates a scope at the start of each request and disposes it at the end. Everything
scoped in that request shares one instance — which is exactly what you want for EF Core's
\`DbContext\`: the repository and the service in one request see the same change tracker and save in
one \`SaveChanges\`. (\`AddDbContext\` registers the context as scoped by default.)

Outside a request — a console app or a \`BackgroundService\` — there is no automatic scope. You create one:

    public class CleanupWorker : BackgroundService
    {
        private readonly IServiceScopeFactory _scopes;
        public CleanupWorker(IServiceScopeFactory scopes) => _scopes = scopes;

        protected override async Task ExecuteAsync(CancellationToken ct)
        {
            while (!ct.IsCancellationRequested)
            {
                using (var scope = _scopes.CreateScope())
                {
                    var db = scope.ServiceProvider.GetRequiredService<ShopDbContext>();
                    await db.Carts.Where(c => c.UpdatedAt < DateTime.UtcNow.AddDays(-30)).ExecuteDeleteAsync(ct);
                }   // the DbContext is disposed here
                await Task.Delay(TimeSpan.FromHours(1), ct);
            }
        }
    }

## The captive dependency

A service may depend on services that live **as long or longer** than itself. When a longer-lived
service holds a shorter-lived one, the short one is "captured":

    builder.Services.AddScoped<ShopDbContext>();
    builder.Services.AddSingleton<PriceCache>();       // PriceCache(ShopDbContext db)  <- the bug

The singleton is built once and keeps the first \`DbContext\` forever: one context shared by every
concurrent request (\`DbContext\` is not thread-safe), a change tracker that grows without end, and
eventually a disposed object. The container catches this when **scope validation** is on, which
both \`WebApplication.CreateBuilder\` and \`Host.CreateApplicationBuilder\` enable in the
**Development** environment:

    System.InvalidOperationException: Cannot consume scoped service 'ShopDbContext' from singleton 'PriceCache'.

Fixes: make \`PriceCache\` scoped if it holds no shared state, or keep it singleton and create a scope
(via \`IServiceScopeFactory\`) each time it needs the database.

The rules in one line: **singleton → singleton only; scoped → scoped or singleton; transient → anything**
(but a transient injected into a singleton is captured too, and lives as long as the singleton).

## Disposal

The container disposes the \`IDisposable\`/\`IAsyncDisposable\` instances **it created**: scoped ones
at the end of the scope, singletons when the host shuts down. An instance you passed in yourself
(\`AddSingleton<IClock>(new FixedClock())\`) is **not** disposed by the container. A disposable
transient resolved from the root provider is held until shutdown — a slow memory leak.

## Thread safety

A singleton is used by every request at once. Mutable fields on it need locking or a concurrent
collection (\`ConcurrentDictionary\`); better, keep singletons stateless.`,
    workedExample: `**Problem.** An API logs "last 10 searches" per user and caches product prices. The first version:

    builder.Services.AddDbContext<ShopDbContext>(o => o.UseSqlServer(cs));   // scoped
    builder.Services.AddSingleton<SearchHistory>();   // has a List<string> field
    builder.Services.AddSingleton<PriceService>();    // PriceService(ShopDbContext db)

In Development it fails at startup; in Production users see each other's searches. Fix both.

**PriceService.** It is a singleton holding a scoped \`DbContext\` — a captive dependency. Development
reports: *Cannot consume scoped service 'ShopDbContext' from singleton 'PriceService'.* The price
cache is genuinely app-wide, so it stays singleton but stops holding the context:

    public class PriceService
    {
        private readonly IServiceScopeFactory _scopes;
        private readonly ConcurrentDictionary<int, decimal> _cache = new ConcurrentDictionary<int, decimal>();
        public PriceService(IServiceScopeFactory scopes) => _scopes = scopes;

        public decimal Get(int productId) => _cache.GetOrAdd(productId, id =>
        {
            using var scope = _scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ShopDbContext>();
            return db.Products.Where(p => p.Id == id).Select(p => p.Price).Single();
        });
    }

\`ConcurrentDictionary\` because many requests call it at once; a fresh scope per lookup so each
\`DbContext\` is short-lived and disposed.

**SearchHistory.** One \`List<string>\` in a singleton is shared by every user — the cross-user leak —
and \`List<T>\` is not thread-safe. "Per user" data does not belong in process memory keyed by
nothing. Store it per user (a table keyed by user id, or a distributed cache) and register the
service that reads it as **scoped**.

**Rule of thumb that would have prevented both:** decide the lifetime from the state the class
holds, then check that nothing it depends on lives shorter.`,
    mcqs: [
      mcq('With `builder.Services.AddTransient<Tracker>()`, an endpoint takes `(Tracker a, Tracker b)` and returns both Ids. What does one request show?', [
        ['The same Guid for a and b, and a new Guid on the next request', false],
        ['Two different Guids, because each injection creates an instance', true],
        ['The same Guid on every request until the app is restarted', false],
      ], 'Transient means a new instance per resolution, so a and b differ even within one request. Scoped would give the same Guid twice per request; singleton the same Guid always.'),
      mcq('In Development, startup throws "Cannot consume scoped service \'ShopDbContext\' from singleton \'PriceCache\'." What is the container protecting you from?', [
        ['A singleton capturing one DbContext and sharing it across all requests', true],
        ['A DbContext being created twice in the same HTTP request by mistake', false],
        ['PriceCache being registered before AddDbContext in Program.cs order', false],
      ], 'Scope validation detects a longer-lived service depending on a shorter-lived one. Without it, the singleton would keep the first DbContext for the life of the app, shared by concurrent requests.'),
      mcq('A BackgroundService needs ShopDbContext (scoped) every minute. What is the correct approach?', [
        ['Inject ShopDbContext into the worker constructor and reuse it', false],
        ['Register ShopDbContext as a singleton so the worker can use it', false],
        ['Inject IServiceScopeFactory and create a scope for each run', true],
      ], 'Hosted services are singletons and run outside any HTTP request. Creating a scope per unit of work gives a fresh DbContext that is disposed when the scope is disposed.'),
    ],
    checkpoint: [
      mcq('Which lifetime does `AddDbContext<ShopDbContext>(...)` give the context by default?', [
        ['Singleton', false],
        ['Scoped', true],
        ['Transient', false],
        ['Pooled singleton', false],
      ], 'AddDbContext registers the context as scoped, so all services in one HTTP request share one DbContext and one change tracker, and it is disposed when the request ends.'),
      mcq('Program.cs has `services.AddSingleton<IClock>(new FixedClock())` and FixedClock implements IDisposable. When the host shuts down, is FixedClock.Dispose called by the container?', [
        ['Yes, the container disposes every singleton it can find at shutdown', false],
        ['No, because the container did not create that instance itself', true],
        ['Yes, but only when the host was built with ValidateOnBuild switched on', false],
      ], 'The container disposes only the instances it constructed. An instance supplied at registration is owned by the code that created it.'),
      mcq('Which dependency is allowed without creating a captive dependency?', [
        ['A scoped OrderService that depends on a singleton IClock', true],
        ['A singleton EmailQueue that depends on a scoped repository', false],
        ['A singleton cache that depends on a scoped ShopDbContext', false],
      ], 'A service may depend on services that live as long or longer. Scoped depending on singleton is fine; singleton depending on scoped captures the scoped instance for the life of the app.'),
    ],
  },

  /* ── CONFIGURATION ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DOTNET_DI_CONFIGURATION',
    notes: `Connection strings, API keys, feature switches and timeouts must change between your laptop, a
test server and production **without recompiling**. .NET reads them through
\`Microsoft.Extensions.Configuration\`, which merges several sources into one key–value view
available as \`builder.Configuration\` (an \`IConfiguration\`).

## appsettings.json

    {
      "ConnectionStrings": {
        "Shop": "Server=localhost;Database=Shop;Trusted_Connection=True;TrustServerCertificate=True"
      },
      "Smtp": {
        "Host": "localhost",
        "Port": 2525,
        "From": "noreply@shop.local"
      },
      "Logging": { "LogLevel": { "Default": "Information" } }
    }

Nested sections become keys joined by a colon: \`Smtp:Port\`. Reading values directly:

    string? cs = builder.Configuration.GetConnectionString("Shop");   // = Configuration["ConnectionStrings:Shop"]
    int port = builder.Configuration.GetValue<int>("Smtp:Port");       // 2525
    string? host = builder.Configuration["Smtp:Host"];

Keys are **case-insensitive**, and a missing key gives \`null\` (or the default for \`GetValue<T>\`) —
no exception.

## Sources and their order

\`WebApplication.CreateBuilder\` and \`Host.CreateApplicationBuilder\` add these, **later overriding earlier**:

1. \`appsettings.json\`
2. \`appsettings.{Environment}.json\` — e.g. \`appsettings.Development.json\`
3. **User secrets** — only in the Development environment
4. **Environment variables**
5. **Command-line arguments**

So a value in \`appsettings.Production.json\` beats \`appsettings.json\`, and an environment variable
set on the server beats both. In environment variables the section separator is a **double
underscore**, because \`:\` is not allowed in variable names on every platform:

    ConnectionStrings__Shop=Server=sql01;Database=Shop;User Id=shop_app;Password=...
    Smtp__Port=587

## Environments

The environment name comes from \`ASPNETCORE_ENVIRONMENT\` (web) or \`DOTNET_ENVIRONMENT\` (generic
host). If neither is set, it is **Production**. \`dotnet run\` uses \`Properties/launchSettings.json\`,
which the templates set to \`Development\` — which is why your laptop is in Development and the
server, with nothing set, is in Production. Code can branch on it:

    if (app.Environment.IsDevelopment())
        app.UseDeveloperExceptionPage();

## Keep secrets out of source

A password committed to \`appsettings.json\` is in git history forever. In development use **user
secrets**, stored outside the project folder:

    dotnet user-secrets init
    dotnet user-secrets set "Smtp:Password" "s3cret"

They live in \`%APPDATA%\\Microsoft\\UserSecrets\\<UserSecretsId>\\secrets.json\` (Windows) and are
read only in Development. In production use environment variables or a vault such as Azure Key
Vault. User secrets are **not** encryption — just a file outside the repository.

## The options pattern

Reading \`Configuration["Smtp:Host"]\` all over the code spreads magic strings. Bind a section to a
class once and inject the class:

    public class SmtpOptions
    {
        public const string Section = "Smtp";
        [Required] public string Host { get; set; } = "";
        [Range(1, 65535)] public int Port { get; set; }
        public string From { get; set; } = "";
    }

    builder.Services.AddOptions<SmtpOptions>()
        .Bind(builder.Configuration.GetSection(SmtpOptions.Section))
        .ValidateDataAnnotations()
        .ValidateOnStart();          // fail at startup, not on the first email

    public class SmtpEmailSender : IEmailSender
    {
        private readonly SmtpOptions _smtp;
        public SmtpEmailSender(IOptions<SmtpOptions> options) => _smtp = options.Value;
    }

(The shorter \`builder.Services.Configure<SmtpOptions>(section)\` binds without validation.)
Binding matches property names case-insensitively; a property with no matching key keeps its
default **silently** — which is why validation matters.

Three interfaces, three behaviours:

| Interface | Lifetime | When it sees a changed appsettings.json |
|---|---|---|
| \`IOptions<T>\` | singleton | never — the value is created once |
| \`IOptionsSnapshot<T>\` | scoped | on the next request (cannot be injected into a singleton) |
| \`IOptionsMonitor<T>\` | singleton | immediately, through \`CurrentValue\` and \`OnChange\` |

The default builders load the JSON files with \`reloadOnChange: true\`, so editing the file on a
running server is picked up by the snapshot and monitor, not by \`IOptions<T>\`.`,
    mcqs: [
      mcq('appsettings.json has `"Smtp": { "Port": 2525 }`, appsettings.Production.json has `"Smtp": { "Port": 587 }`, and the server sets the environment variable `Smtp__Port=465`. The app runs in Production. What is Smtp:Port?', [
        ['2525, because appsettings.json is the base file for every environment', false],
        ['587, because the environment-specific file always has the last word', false],
        ['465, because environment variables override both JSON files', true],
      ], 'The default sources are appsettings.json, then appsettings.{Environment}.json, then user secrets (Development only), environment variables and command-line arguments, each overriding the one before. Smtp__Port maps to Smtp:Port.'),
      mcq('A developer deploys to a new server and sets no environment variable at all. Which environment does the app run in?', [
        ['Production', true],
        ['Development, the value the templates use by default', false],
        ['Staging, the first non-development environment name', false],
      ], 'With neither ASPNETCORE_ENVIRONMENT nor DOTNET_ENVIRONMENT set, the host uses Production. Development on a laptop comes from launchSettings.json, which dotnet run reads and a deployed app does not.'),
      mcq('A singleton EmailSender injects `IOptions<SmtpOptions>`. Ops edits Smtp:Host in appsettings.json on the running server. What does EmailSender see?', [
        ['The new host on the next request, because the JSON is reloaded on change', false],
        ['The old host until the app restarts, since IOptions<T> is computed once', true],
        ['An exception, because a reloaded section invalidates every options object', false],
      ], 'IOptions<T> is a singleton whose Value is created once. To pick up reloads use IOptionsMonitor<T>.CurrentValue in a singleton, or IOptionsSnapshot<T> in a scoped service.'),
    ],
    checkpoint: [
      mcq('Which environment variable name sets ConnectionStrings:Shop for a .NET app on Linux?', [
        ['ConnectionStrings:Shop', false],
        ['ConnectionStrings__Shop', true],
        ['CONNECTIONSTRINGS.SHOP', false],
        ['ConnectionStrings-Shop', false],
      ], 'The environment-variable provider turns a double underscore into the ":" section separator, because ":" is not valid in environment variable names on every platform.'),
      mcq('SmtpOptions has `public int Port { get; set; }`, but appsettings.json spells the key "Prot". The section is bound with Configure<SmtpOptions>. What happens?', [
        ['Startup fails, because Prot matches no property of SmtpOptions', false],
        ['Port is 0 and nothing fails, since no key matched the property', true],
        ['The binder matches Prot to Port by edit distance and still binds it', false],
      ], 'The binder ignores unknown keys and leaves unmatched properties at their defaults. Only validation (for example [Range] with ValidateDataAnnotations and ValidateOnStart) turns this into a startup error.'),
      mcq('Where do values set with `dotnet user-secrets set` take effect?', [
        ['In every environment, as they are compiled into the assembly', false],
        ['In Development only, read from a file outside the project', true],
        ['In Production only, as they are encrypted with the machine key', false],
      ], 'User secrets live in a secrets.json under the user profile, keyed by the project\'s UserSecretsId, and the default builders add them only in the Development environment. They are not encrypted.'),
    ],
  },

  /* ── LOGGING ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DOTNET_DI_LOGGING',
    notes: `\`Console.WriteLine\` cannot be filtered, cannot be turned down in production, carries no timestamp
or source, and goes nowhere but the console. \`Microsoft.Extensions.Logging\` fixes all four, and like
everything else here it arrives through the constructor.

## ILogger<T>

    public class OrderService
    {
        private readonly ILogger<OrderService> _logger;
        public OrderService(ILogger<OrderService> logger) => _logger = logger;

        public async Task PlaceAsync(Order order)
        {
            _logger.LogInformation("Placing order {OrderId} for customer {CustomerId}", order.Id, order.CustomerId);
            try
            {
                await _repo.SaveAsync(order);
            }
            catch (SqlException ex)
            {
                _logger.LogError(ex, "Saving order {OrderId} failed", order.Id);
                throw;
            }
        }
    }

No registration is needed: the host registers logging, and \`ILogger<T>\` resolves for any \`T\`. The
**category** of the logger is the full name of \`T\` — \`Shop.Services.OrderService\` — and that is what
filtering works on.

## Log levels

| Level | Value | Use for |
|---|---|---|
| Trace | 0 | step-by-step detail, may contain sensitive data; off in production |
| Debug | 1 | developer diagnostics |
| Information | 2 | the normal flow: "order placed", "job finished" |
| Warning | 3 | unexpected but handled: a retry, a slow query, bad input |
| Error | 4 | an operation failed — pass the exception |
| Critical | 5 | the app cannot continue: database unreachable at startup |
| None | 6 | used only in filters, to switch a category off |

## Filtering in appsettings.json

    "Logging": {
      "LogLevel": {
        "Default": "Information",
        "Microsoft.AspNetCore": "Warning",
        "Shop.Services": "Debug"
      }
    }

A message is written if its level is **at or above** the minimum for its category. The **longest
matching category prefix** wins: \`Shop.Services.OrderService\` uses "Shop.Services" (Debug), an
ASP.NET Core internal uses "Microsoft.AspNetCore" (Warning), everything else "Default". With no
configuration at all, the minimum is Information. Because this is configuration, production can
lower the minimum level with an environment variable — \`Logging__LogLevel__Default=Debug\` — without a
code change.

## Message templates, not string interpolation

    _logger.LogInformation("Placing order {OrderId} for customer {CustomerId}", order.Id, order.CustomerId); // right
    _logger.LogInformation($"Placing order {order.Id} for customer {order.CustomerId}");                    // wrong

The first is a **message template**: the provider stores \`OrderId\` and \`CustomerId\` as separate,
searchable fields (in Seq, Application Insights or Elasticsearch you can query \`OrderId = 1042\`),
and the string is only formatted if the level is enabled. The interpolated version builds the string
every time — even when Information is filtered out — and the provider receives one flat string.
Placeholders are filled **by position**, not by name: the names only label the values.

## The exception goes first

\`LogError(ex, "message", args)\` — the exception is its own parameter, so providers record the type,
message and stack trace. \`LogError("Failed: " + ex.Message)\` throws the stack trace away.

## Scopes and providers

\`using (_logger.BeginScope("Order {OrderId}", order.Id)) { ... }\` attaches \`OrderId\` to every
message inside the block, for providers that support scopes. The default builders add the
**Console**, **Debug**, **EventSource** and (on Windows) **EventLog** providers; others (Serilog,
Application Insights, OpenTelemetry) plug in through \`builder.Logging\`:

    builder.Logging.ClearProviders();
    builder.Logging.AddConsole();

## High-performance logging

On hot paths, the \`[LoggerMessage]\` source generator (.NET 6+) generates the logging code at compile
time and avoids boxing and parsing the template on every call:

    public static partial class Log
    {
        [LoggerMessage(EventId = 1001, Level = LogLevel.Information, Message = "Placing order {OrderId}")]
        public static partial void PlacingOrder(ILogger logger, int orderId);
    }

## What not to log

Passwords, tokens, full card numbers, Aadhaar or PAN numbers, and whole request bodies. Logs are
copied, shipped and kept for months; they are a data store with weak access control.`,
    mcqs: [
      mcq('appsettings.json sets `"Default": "Warning"` and `"Shop.Services": "Debug"`. In class Shop.Services.OrderService, which call is written?', [
        ['None of these calls, as the Default level of Warning applies to all categories', false],
        ['_logger.LogDebug("Cart {CartId} priced", id)', true],
        ['_logger.LogTrace("Entering PlaceAsync"), because Trace sits above Debug', false],
      ], 'The longest matching prefix, "Shop.Services", sets the minimum to Debug for this category. Debug (1) passes; Trace (0) is below Debug and is filtered out.'),
      mcq('Why is `_logger.LogInformation("User {UserId} logged in", id)` preferred over `_logger.LogInformation($"User {id} logged in")`?', [
        ['UserId is stored as a field, and nothing is formatted if the level is off', true],
        ['Interpolated strings are rejected by ILogger at compile time in .NET 8', false],
        ['The template version is the only one the console provider can print', false],
      ], 'A message template keeps the arguments as named, queryable properties and defers formatting until the level is known to be enabled. Interpolation builds the string on every call and loses the structure.'),
      mcq('In `_logger.LogWarning("Order {OrderId} retried by {UserId}", userId, orderId);` what does the log show for OrderId?', [
        ['The orderId value, because placeholders are matched by name', false],
        ['The userId value, because placeholders are filled by position', true],
        ['Nothing; a mismatch between names and variables throws at run time', false],
      ], 'Template placeholders are bound to arguments in order. The names only label the values, so swapping the arguments silently records the user id as OrderId.'),
    ],
    checkpoint: [
      mcq('What is the category of the logger injected as `ILogger<OrderService>` when OrderService is in namespace Shop.Services?', [
        ['OrderService, the short class name only', false],
        ['Shop.Services.OrderService', true],
        ['Microsoft.Extensions.Logging.ILogger', false],
        ['Shop.Services, the namespace alone', false],
      ], 'ILogger<T> uses the full type name of T as its category, which is what the LogLevel section in configuration matches against, by longest prefix.'),
      mcq('A catch block logs `_logger.LogError("Payment failed: " + ex.Message);`. What is lost compared with `_logger.LogError(ex, "Payment failed for {OrderId}", orderId)`?', [
        ['Nothing at all; providers parse the stack trace back out of the message', false],
        ['The exception type and stack trace, plus OrderId as a separate field', true],
        ['Only the timestamp, since string concatenation disables the log clock', false],
      ], 'Passing the exception as its own argument lets every provider record the type, message, inner exceptions and stack trace; concatenating ex.Message keeps one line of text and nothing searchable.'),
      mcq('With no "Logging" section in configuration at all, which call on an ILogger<T> is written to the console provider?', [
        ['LogDebug, since the default minimum level is Debug', false],
        ['LogInformation, since the default minimum level is Information', true],
        ['LogWarning only, since Information needs explicit opt-in', false],
      ], 'When no minimum level is configured, logging defaults to Information, so Information, Warning, Error and Critical are written and Trace and Debug are not.'),
    ],
  },

  /* ── DEBUGGING ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DOTNET_DI_DEBUGGING',
    notes: `Most DI failures in .NET are \`InvalidOperationException\`s whose message names both the type that
is missing and the type that needed it. Read the whole message — the second type tells you where to
look. Each case is a fault you will meet; work out the cause before reading the fix.

## 1. A service that was never registered

    System.InvalidOperationException: Unable to resolve service for type 'Shop.Data.IOrderRepository'
    while attempting to activate 'Shop.Services.OrderService'.

**Cause:** \`OrderService\` asks for \`IOrderRepository\`; nothing registers it — often a new class, or a
registration in an \`AddInfrastructure()\` extension that Program.cs never calls. **Fix:** register it
(\`AddScoped<IOrderRepository, SqlOrderRepository>()\`). Check you registered the **interface**, not
only \`AddScoped<SqlOrderRepository>()\`: that makes the concrete class resolvable but not the interface.

## 2. A primitive in the constructor

    Unable to resolve service for type 'System.String' while attempting to activate 'Shop.Mail.SmtpEmailSender'.

**Cause:** \`SmtpEmailSender(string host, int port)\`. The container resolves services, not values.
**Fix:** take \`IOptions<SmtpOptions>\`, or register with a factory:
\`AddSingleton<IEmailSender>(sp => new SmtpEmailSender(host, port))\`.

## 3. Scoped inside singleton

    Cannot consume scoped service 'Shop.Data.ShopDbContext' from singleton 'Shop.Services.PriceCache'.

**Cause:** a captive dependency, caught because the app runs in Development (scope validation on).
The same code in Production starts fine and fails later — concurrency exceptions from a shared
\`DbContext\`, or \`ObjectDisposedException\`. **Fix:** make the consumer scoped, or inject
\`IServiceScopeFactory\` and create a scope per operation.

## 4. Resolving scoped from the root

    Cannot resolve scoped service 'Shop.Data.ShopDbContext' from root provider.

**Cause:** \`app.Services.GetRequiredService<ShopDbContext>()\` in Program.cs (to seed data or migrate).
\`app.Services\` is the root provider; there is no scope. **Fix:**

    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<ShopDbContext>();
        db.Database.Migrate();
    }

## 5. A circular dependency

    A circular dependency was detected for the service of type 'Shop.Services.OrderService'.

**Cause:** \`OrderService\` needs \`InvoiceService\`, which needs \`OrderService\`. Constructor injection
cannot build either first. **Fix:** a design change — move the shared logic into a third service
both depend on, or raise an event. Injecting \`IServiceProvider\` to break the loop only hides it.

## 6. "My registration is ignored"

Tests replace \`IEmailSender\` with a fake, but real emails still go out. **Cause:** the fake was added
with \`TryAddSingleton\` after the real one (TryAdd does nothing if a registration exists), or the
real registration runs **after** the fake (last one wins). **Fix:** register the replacement last with
\`Add*\`, or use \`services.Replace(ServiceDescriptor.Singleton<IEmailSender, FakeEmailSender>())\`.

## 7. Settings are empty

\`SmtpOptions.Host\` is \`""\` in production. **Cause:** the section name in code (\`"SMTP"\` is fine —
keys are case-insensitive) does not match the file (\`"Mail"\`), or the environment variable uses a
single underscore (\`Smtp_Host\`) instead of \`Smtp__Host\`, or \`appsettings.Production.json\` was not
copied to the output folder. Binding never throws for missing keys. **Fix:** add
\`.ValidateDataAnnotations().ValidateOnStart()\` so a missing value stops startup with an
\`OptionsValidationException\` naming the property.

## 8. Logs that never appear

\`_logger.LogDebug("...")\` prints nothing. **Cause:** the default minimum level is Information, and
\`appsettings.Development.json\` (which usually sets the levels you see locally) is not loaded in
Production. **Fix:** set \`Logging:LogLevel\` for your namespace in the right file or environment
variable — not \`Console.WriteLine\`.`,
    mcqs: [
      mcq('Program.cs has `builder.Services.AddScoped<SqlOrderRepository>();` and OrderService takes `IOrderRepository repo`. What happens when OrderService is resolved?', [
        ['The container finds SqlOrderRepository implements the interface and injects it', false],
        ['It throws: no registration exists for IOrderRepository itself', true],
        ['OrderService receives null for repo and fails on its first database call', false],
        ['It resolves only in Development, where interface scanning is switched on', false],
      ], 'The container matches the requested type exactly; it does not search implementations. Registering the concrete class makes SqlOrderRepository resolvable, but IOrderRepository needs AddScoped<IOrderRepository, SqlOrderRepository>().'),
      mcq('Program.cs calls `app.Services.GetRequiredService<ShopDbContext>().Database.Migrate();` and startup fails with "Cannot resolve scoped service ... from root provider." What is the fix?', [
        ['Register ShopDbContext as a singleton for the duration of startup', false],
        ['Call GetService instead of GetRequiredService so null is returned', false],
        ['Create a scope with app.Services.CreateScope() and resolve it from there', true],
        ['Move the call above builder.Build() so that the scope still exists', false],
      ], 'app.Services is the root provider and has no scope. Creating a scope gives a provider that can resolve scoped services, and disposing the scope disposes the DbContext.'),
      mcq('The same code that throws "Cannot consume scoped service" locally starts without error on the production server. Why?', [
        ['Scope validation is enabled by default only in the Development environment', true],
        ['The production server uses a different DI container than the local machine', false],
        ['The Release build optimises away the dependency between the two services', false],
        ['Production loads appsettings.Production.json, which registers the context', false],
      ], 'The default builders turn on ValidateScopes and ValidateOnBuild in Development. In Production the captive dependency is still there; it just shows up later as concurrency or disposal errors.'),
      mcq('Environment variable `Smtp_Host=mail.shop.in` is set on the server, yet SmtpOptions.Host is empty. What is wrong?', [
        ['Environment variables are ignored once appsettings.Production.json exists', false],
        ['Keys are case-sensitive, so the variable has to be written SMTP_HOST', false],
        ['The variable needs a double underscore: Smtp__Host', true],
        ['Options classes can only be bound from JSON files, not from variables', false],
      ], 'Only "__" is translated to the ":" separator. Smtp_Host becomes a top-level key named "Smtp_Host", which does not match the Smtp section, and binding silently leaves Host at its default.'),
    ],
  },

  /* ── PRACTICE ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DOTNET_DI_PRACTICE',
    notes: `Work these without looking things up. Each is small; the goal is that the container's behaviour
becomes something you predict, not something you discover. Use a \`dotnet new web\` project for the
web ones and \`dotnet new worker\` (or a console app with \`Host.CreateApplicationBuilder\`) for the rest.

## Exercise 1 — From new to injection

    public class SignupService
    {
        private readonly SqlUserRepository _repo = new SqlUserRepository("Server=.;Database=Shop;...");
        private readonly SmtpMailer _mailer = new SmtpMailer("localhost", 2525);
        public void Register(string email) { _repo.Add(email); _mailer.Send(email, "Welcome"); }
    }

Extract \`IUserRepository\` and \`IMailer\`, take both through one constructor, register them in
Program.cs, and write an xUnit test that constructs \`SignupService\` with two fakes and no container.

## Exercise 2 — Lifetimes you can see

Create \`public class Tracker { public Guid Id { get; } = Guid.NewGuid(); }\` and an endpoint
\`app.MapGet("/ids", (Tracker a, Tracker b) => new { a = a.Id, b = b.Id })\`. Call it twice with
Tracker registered as singleton, then scoped, then transient. Write down the six results and explain them.

## Exercise 3 — Break it on purpose

Register a scoped \`ShopDbContext\` (or any scoped class) and a singleton \`ReportCache\` that takes it.
Run in Development and copy the exception. Set \`ASPNETCORE_ENVIRONMENT=Production\` and run again —
note what happens. Fix it with \`IServiceScopeFactory\`.

## Exercise 4 — Many implementations

Register \`EmailNotifier\` and \`SmsNotifier\` for \`INotifier\`. Predict, then check, what is injected into
\`INotifier\` and into \`IEnumerable<INotifier>\`. Then register them again as keyed services ("email",
"sms") and inject the SMS one with \`[FromKeyedServices]\`.

## Exercise 5 — Settings per environment

Add a \`Smtp\` section to appsettings.json (Port 2525) and appsettings.Production.json (Port 587).
Bind it to \`SmtpOptions\` with \`AddOptions<SmtpOptions>().Bind(...).ValidateDataAnnotations().ValidateOnStart()\`
and expose \`GET /smtp\` that returns the port. Run in Development, in Production, and in Production with
\`Smtp__Port=465\`. Then delete \`Host\` from the JSON, mark it \`[Required]\`, and read the startup error.
Move the SMTP password into user secrets.

## Exercise 6 — Logs worth reading

In the \`SignupService\` from Exercise 1, log Information on success and Error with the exception on
failure, using message templates. Set \`"Default": "Warning"\` and your namespace to \`"Debug"\`; confirm
which messages appear. Then switch one call to string interpolation and explain what is lost.`,
    mcqs: [
      mcq('In Exercise 2 with Tracker registered as scoped, you call /ids twice. What do you see?', [
        ['a and b differ within each request, and both change between requests', false],
        ['a equals b within a request; the values change on the second request', true],
        ['a equals b in both requests, and the value is identical across both calls', false],
      ], 'Scoped means one instance per request scope: both parameters receive the same Tracker in one request, and the next request gets a new scope with a new Tracker.'),
      mcq('In Exercise 3, the app runs with ASPNETCORE_ENVIRONMENT=Production. What happens at startup?', [
        ['The same "Cannot consume scoped service" exception is thrown', false],
        ['It starts; scope validation is a Development-only default', true],
        ['The container quietly re-registers the singleton as scoped', false],
      ], 'Scope validation is on by default only in Development. In Production the singleton captures one scoped instance, and the defect surfaces later at run time.'),
      mcq('In Exercise 4 (EmailNotifier registered, then SmsNotifier), how many items does `IEnumerable<INotifier>` contain, and which does `INotifier` receive?', [
        ['Two items; INotifier receives SmsNotifier', true],
        ['One item; INotifier receives EmailNotifier', false],
        ['Two items; INotifier throws as it is ambiguous', false],
      ], 'IEnumerable<T> resolves every registration in order; a single T resolves the last one registered, which here is SmsNotifier.'),
      mcq('In Exercise 5, Host is removed from the JSON and marked [Required], with ValidateOnStart. When is the error reported?', [
        ['When the first request reads SmtpOptions.Host', false],
        ['When the host starts, before it serves any request', true],
        ['Only when the build runs the analyzers on it', false],
      ], 'ValidateOnStart runs the registered validation as the host starts, so a missing required setting stops the app with an OptionsValidationException instead of failing on the first email.'),
      mcq('In Exercise 6, the configuration has `"Default": "Warning"` and your namespace set to Debug. Which messages from SignupService appear?', [
        ['Only Warning and above, because Default applies to every category', false],
        ['Debug and above, because your namespace prefix is more specific', true],
        ['Nothing at all until AddConsole is called explicitly in Program.cs', false],
      ], 'The longest matching category prefix decides. SignupService\'s category starts with your namespace, so its minimum is Debug; the console provider is already added by the default builder.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DOTNET_DI_INTERVIEW_QUESTION',
    notes: `Three questions asked in almost every .NET backend interview, with an answer at the standard that
earns the follow-up, and the follow-up itself.

## Q1. "What is dependency injection, and how does ASP.NET Core do it?"

**Strong answer.** "DI means a class receives its dependencies instead of creating them — usually
through its constructor, and usually as interfaces. That makes the class testable, because a test can
pass fakes, and it keeps the decision about implementations in one place. ASP.NET Core has a built-in
container. In Program.cs I register services on \`builder.Services\` — \`AddScoped<IOrderRepository,
SqlOrderRepository>()\` and so on — and when a controller is created per request, the container reads
its constructor, builds the dependency chain and injects it. It also disposes what it created. I keep
one constructor per class and avoid injecting \`IServiceProvider\`, because that turns DI into a hidden
service locator."

**Follow-up:** "Two implementations of one interface?" — the last registration wins for a single
dependency; \`IEnumerable<T>\` gets all; in .NET 8, keyed services with \`[FromKeyedServices("key")]\`.

## Q2. "Explain singleton, scoped and transient. Which would you use for a DbContext, and why?"

**Strong answer.** "Singleton is one instance for the life of the app, so it must be thread-safe and
ideally stateless. Scoped is one instance per scope — in a web app, per HTTP request. Transient is a
new instance every time it is injected. DbContext is scoped — that's what \`AddDbContext\` does —
because it isn't thread-safe and holds a change tracker, so it should live for exactly one unit of
work: everything in one request shares it and it's disposed at the end. The trap is a **captive
dependency**: a singleton that takes a scoped DbContext keeps the first one forever and shares it
across requests. In Development the container throws 'Cannot consume scoped service from singleton';
the fix is to make the consumer scoped or to create a scope with \`IServiceScopeFactory\`."

**Follow-up:** "How does a BackgroundService use the database?" — hosted services are singletons;
inject \`IServiceScopeFactory\`, create a scope per iteration, resolve the DbContext from it.

## Q3. "How do you manage configuration and secrets across environments?"

**Strong answer.** "Configuration is layered: appsettings.json, then appsettings.{Environment}.json,
user secrets in Development, environment variables, then command-line arguments, later ones
overriding earlier. The environment comes from \`ASPNETCORE_ENVIRONMENT\` and defaults to Production.
I bind each section to a class with the options pattern and validate it on start, so a missing
setting stops the app instead of failing on the first request. Secrets never go in appsettings.json:
user secrets on my machine, environment variables or Key Vault in production."

**Follow-up:** "IOptions, IOptionsSnapshot or IOptionsMonitor?" — \`IOptions<T>\` is read once;
\`IOptionsSnapshot<T>\` is scoped and re-reads per request; \`IOptionsMonitor<T>\` is a singleton that
sees changes through \`CurrentValue\` and can notify with \`OnChange\`. "And logging?" — \`ILogger<T>\`
through the constructor, message templates with named placeholders, levels set per category in
configuration.`,
    mcqs: [
      mcq('An interviewer asks why you would not inject IServiceProvider into services and resolve what you need inside methods. Which answer is strongest?', [
        ['It hides the real dependencies, so tests and readers cannot see them', true],
        ['IServiceProvider is not registered in ASP.NET Core and cannot be injected', false],
        ['Resolving inside a method always creates a brand new singleton each call', false],
      ], 'IServiceProvider can be injected, but doing so is the service-locator anti-pattern: the constructor stops documenting what the class needs, and a missing registration fails only when that code path runs.'),
      mcq('Follow-up: "Your hosted service needs the DbContext every five minutes. How?" Which answer is correct?', [
        ['Inject the DbContext in the constructor; hosted services are scoped', false],
        ['Inject IServiceScopeFactory and create a scope for each iteration', true],
        ['Register the DbContext as transient so that a singleton can hold it', false],
      ], 'Hosted services are registered as singletons. A scope per iteration gives a short-lived DbContext that is disposed with the scope, which is the documented pattern for BackgroundService.'),
      mcq('Asked which options interface a singleton should use to pick up an edited appsettings.json without a restart, which is right?', [
        ['IOptions<T>, as its Value is re-read on every access to the property', false],
        ['IOptionsSnapshot<T>, as it is the one designed for reloading at runtime', false],
        ['IOptionsMonitor<T>, reading CurrentValue', true],
      ], 'IOptionsMonitor<T> is a singleton that tracks changes, so CurrentValue reflects reloaded files. IOptionsSnapshot<T> also reloads but is scoped and cannot be injected into a singleton; IOptions<T> never reloads.'),
    ],
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DOTNET_DI_CHECKPOINT',
    notes: `Ten questions across the whole topic: why DI, registering services, lifetimes and the captive
dependency, configuration and the options pattern, and logging. Most show a short registration,
constructor or setting and ask what the container, the configuration system or the logger does with
it. Answer from what you can predict, not from what you half remember.`,
    checkpoint: [
      mcq(`What does this console app print?

    var builder = Host.CreateApplicationBuilder(args);
    builder.Services.AddSingleton<Counter>();
    using var host = builder.Build();
    var a = host.Services.GetRequiredService<Counter>();
    var b = host.Services.GetRequiredService<Counter>();
    Console.WriteLine(ReferenceEquals(a, b));`, [
        ['True', true],
        ['False', false],
        ['It throws, as Counter has no interface', false],
      ], 'A singleton is created once per container, so both calls return the same instance. A concrete class can be registered as itself without an interface.'),
      mcq(`OrderService has two public constructors and all of IOrderRepository and IClock are registered. Which constructor does the container use?

    public OrderService(IOrderRepository repo) { ... }
    public OrderService(IOrderRepository repo, IClock clock) { ... }`, [
        ['The one-parameter constructor, as it is declared first', false],
        ['The two-parameter one, as it has the most it can satisfy', true],
        ['Neither; two public constructors are always an error', false],
      ], 'The default container chooses the constructor with the most parameters whose types it can all resolve. It throws only when no single satisfiable constructor includes the parameters of all the others (an ambiguity).'),
      mcq(`What happens on the first request to /orders?

    builder.Services.AddDbContext<ShopDbContext>(o => o.UseSqlServer(cs));
    builder.Services.AddSingleton<OrderQueries>();  // OrderQueries(ShopDbContext db)
    // ASPNETCORE_ENVIRONMENT=Development`, [
        ['It works, and the request uses a fresh ShopDbContext', false],
        ['Startup fails: the singleton would capture a scoped DbContext', true],
        ['The container silently makes OrderQueries scoped as well', false],
      ], 'In Development the default builder validates scopes and builds services on startup, so the captive dependency is rejected with "Cannot consume scoped service \'ShopDbContext\' from singleton \'OrderQueries\'."'),
      mcq('A scoped CartService depends on a transient PriceCalculator. Within one HTTP request, two different services both take CartService in their constructors. How many PriceCalculator instances are created for CartService?', [
        ['One, because CartService is built once per request', true],
        ['Two, one for each consumer of CartService', false],
        ['A new one for every method call on CartService', false],
      ], 'Transient means a new instance per resolution. CartService is resolved once in the scope, and its constructor receives one PriceCalculator, which then lives as long as CartService.'),
      mcq('appsettings.json sets Features:NewCheckout to false. The app is started with `dotnet Shop.dll --Features:NewCheckout=true`. What does `Configuration.GetValue<bool>("Features:NewCheckout")` return?', [
        ['false, because JSON files are loaded last and so they take priority', false],
        ['true, because command-line arguments are the last default source', true],
        ['It throws, because the same key is defined by two different sources', false],
      ], 'Command-line arguments are added after JSON files, user secrets and environment variables, so they override all of them. Duplicate keys across sources are normal; the later source wins.'),
      mcq('A scoped service injects `IOptionsSnapshot<FeatureOptions>`. Someone edits appsettings.json while the app runs. When does the service see the new values?', [
        ['Only after the application is restarted', false],
        ['On the next request, in a new scope', true],
        ['Never, because snapshot values are frozen at build', false],
      ], 'IOptionsSnapshot<T> is scoped and recomputed per scope; the default builders reload appsettings.json on change, so the next request gets the new values.'),
      mcq('Which line keeps a database password out of source control in a developer\'s machine setup?', [
        ['dotnet user-secrets set "ConnectionStrings:Shop" "...Password=..."', true],
        ['Adding the password to appsettings.Development.json in the project', false],
        ['Marking the ConnectionStrings section [Secret] in appsettings.json', false],
      ], 'User secrets are stored in the user profile, outside the project folder, so they are never committed. appsettings.Development.json is a normal project file, and there is no [Secret] attribute in JSON configuration.'),
      mcq('What does `_logger.LogInformation("Shipped {OrderId} to {City}", order.Id, order.City)` give a structured provider such as Application Insights?', [
        ['One text line; the names in braces are discarded', false],
        ['The message plus OrderId and City as separate properties', true],
        ['Two log entries, one for each placeholder in the template', false],
      ], 'A message template is stored with its arguments as named properties, so the backend can filter on OrderId or City as well as show the rendered text.'),
      mcq('Configuration has `"Default": "Information"` and `"Microsoft.AspNetCore": "Warning"`. Which message is written?', [
        ['An Information message from category Microsoft.AspNetCore.Routing', false],
        ['A Debug message from category Shop.Services.CartService', false],
        ['An Information message from Shop.Services.CartService', true],
      ], 'Microsoft.AspNetCore.* categories need Warning or above, so their Information is dropped; every other category uses Default (Information), so Debug is dropped and CartService\'s Information is written.'),
      mcq('Startup throws "Unable to resolve service for type \'Shop.Mail.IEmailSender\' while attempting to activate \'Shop.Services.SignupService\'." The SmtpEmailSender class exists and implements IEmailSender. What is the most likely cause?', [
        ['SignupService should mark its constructor with an [Inject] attribute', false],
        ['IEmailSender has no registration, e.g. the Add method is never called', true],
        ['SmtpEmailSender needs a parameterless constructor to be discovered', false],
      ], 'The built-in container does not scan for implementations; an interface is resolvable only once something like AddScoped<IEmailSender, SmtpEmailSender>() runs. A registration inside an extension method that Program.cs never calls is the usual culprit.'),
    ],
  },
];
