/**
 * Career-track content (.NET Full Stack + AI, batch N3): EF Core inside an ASP.NET Core Web API
 * (JT_ASPNET_DATA) and securing that API with Identity and JWT (JT_ASPNET_SECURITY).
 *
 * Students arrive having built controllers, DTOs, validation and ProblemDetails in the Web API topic,
 * and having learnt EF Core 8 (mapping, migrations, querying, tracking) and the DI container on their
 * own. Here the two meet: a scoped DbContext behind a thin controller and a service, paged list
 * endpoints, async all the way with cancellation and transactions — then authentication and
 * authorization in front of all of it. Everything targets .NET 8 / ASP.NET Core 8, EF Core 8 with the
 * SQL Server provider, and Microsoft.AspNetCore.Authentication.JwtBearer 8. Where behaviour is
 * version-specific the notes say so (ExecuteUpdate is EF Core 7+, AddAuthorizationBuilder and the
 * automatic auth middleware are .NET 7+, Identity API endpoints are .NET 8+).
 *
 * The running example is a CampusEvents API: events, venues and bookings, used by students (Priya),
 * organisers (Arjun) and an admin.
 *
 * Both topics are multi-skill. JT_ASPNET_DATA declares ASPNET_CORE and EF_CORE (DBCONTEXT_IN_API and
 * PAGINATION_FILTERING are EF_CORE units); JT_ASPNET_SECURITY declares ASPNET_SECURITY,
 * AUTHENTICATION and AUTHORIZATION (its concept units default to ASPNET_SECURITY). Every checkpoint
 * question names its skill with ck().
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_CS_ASPNET_DATA_SECURITY_BUNDLES: PilotBundle[] = [
  /* ══════════════════════════════════════════════════════════════════════════════════════
   * JT_ASPNET_DATA — EF Core in ASP.NET Core
   * ════════════════════════════════════════════════════════════════════════════════════ */

  /* ── DBCONTEXT_IN_API ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_DATA_DBCONTEXT_IN_API',
    notes: `In the EF Core topic you created a \`DbContext\` yourself with \`new\` inside a console app. In a
Web API you never do that. The DI container creates one context **per HTTP request**, hands it to
whatever needs it, and disposes it when the response has been sent.

## Registering the context

\`Program.cs\`, with the SQL Server provider (\`Microsoft.EntityFrameworkCore.SqlServer\`):

    var builder = WebApplication.CreateBuilder(args);

    builder.Services.AddDbContext<EventsDbContext>(options =>
        options.UseSqlServer(builder.Configuration.GetConnectionString("Events")));

    builder.Services.AddControllers();
    var app = builder.Build();

The context needs a constructor that accepts the options, so DI can pass them in:

    public class EventsDbContext : DbContext
    {
        public EventsDbContext(DbContextOptions<EventsDbContext> options) : base(options) { }

        public DbSet<Event> Events => Set<Event>();
        public DbSet<Venue> Venues => Set<Venue>();
        public DbSet<Booking> Bookings => Set<Booking>();
    }

And a controller (or a service — next unit) simply asks for it:

    [ApiController]
    [Route("api/venues")]
    public class VenuesController : ControllerBase
    {
        private readonly EventsDbContext _db;
        public VenuesController(EventsDbContext db) => _db = db;

        [HttpGet]
        public async Task<List<VenueDto>> GetAll() =>
            await _db.Venues.AsNoTracking()
                .OrderBy(v => v.Name)
                .Select(v => new VenueDto(v.Id, v.Name, v.Capacity))
                .ToListAsync();
    }

## Why scoped is the right lifetime

\`AddDbContext\` registers the context as **scoped** by default, and ASP.NET Core creates one scope
per request. That matches what a context is:

- **A unit of work.** Everything you load and change during one request is tracked together and
  saved together by one \`SaveChangesAsync\`.
- **Not thread-safe.** Two requests must never share one instance — their change trackers would mix
  and concurrent queries throw *"A second operation was started on this context instance before a
  previous operation completed"*.
- **Cheap to create.** It holds no open connection between queries; SQL Server connections are
  pooled by \`Microsoft.Data.SqlClient\` underneath.

The consequence you met in the DI topic applies with force here: a **singleton must never take the
context** in its constructor. In the Development environment the host validates scopes and refuses to
start with *"Cannot consume scoped service 'EventsDbContext' from singleton …"*. In Production that
validation is off by default, so the same bug runs — with one context shared by every request.

Code that is not inside a request — a \`BackgroundService\`, a startup task — makes its own scope:

    public class ReminderWorker(IServiceScopeFactory scopes) : BackgroundService
    {
        protected override async Task ExecuteAsync(CancellationToken ct)
        {
            while (!ct.IsCancellationRequested)
            {
                using (var scope = scopes.CreateScope())
                {
                    var db = scope.ServiceProvider.GetRequiredService<EventsDbContext>();
                    // query and save with this short-lived context
                }
                await Task.Delay(TimeSpan.FromMinutes(5), ct);
            }
        }
    }

\`AddDbContextPool<EventsDbContext>(…)\` reuses context instances between requests to save a little
allocation. It is safe only if the context keeps no per-request state of its own in fields.

## The connection string comes from configuration

\`GetConnectionString("Events")\` reads the key \`ConnectionStrings:Events\`. In
\`appsettings.Development.json\`:

    {
      "ConnectionStrings": {
        "Events": "Server=localhost;Database=CampusEvents;Trusted_Connection=True;TrustServerCertificate=True"
      }
    }

- \`TrustServerCertificate=True\` is for a local SQL Server with a self-signed certificate.
  Microsoft.Data.SqlClient 4 and later encrypt by default, so without it a local connection often
  fails certificate validation. Never carry it into production.
- A password does **not** go into \`appsettings.json\`. In development use user secrets
  (\`dotnet user-secrets set "ConnectionStrings:Events" "…"\`); in production set the environment
  variable \`ConnectionStrings__Events\` — double underscore, because colons are not allowed in
  environment variable names on Linux. Environment variables override the JSON files.

## Development-only switches

    builder.Services.AddDbContext<EventsDbContext>(options =>
    {
        options.UseSqlServer(builder.Configuration.GetConnectionString("Events"));
        if (builder.Environment.IsDevelopment())
        {
            options.EnableSensitiveDataLogging();   // parameter values in logs
            options.EnableDetailedErrors();
        }
    });

Sensitive data logging writes parameter **values** — emails, names — into the log. Development only.

## Migrations at deployment

You already create migrations with \`dotnet ef migrations add\` (the tool needs the
\`Microsoft.EntityFrameworkCore.Design\` package in the startup project; it builds your host from
\`Program.cs\` to find the context). The question in an API is how they reach the production database:

| Way | What it is | When |
|---|---|---|
| \`dotnet ef database update\` | applies pending migrations from your machine | local development only |
| \`dotnet ef migrations script --idempotent\` | one SQL script that checks \`__EFMigrationsHistory\` before each step | production: reviewed, run by the pipeline or a DBA |
| \`dotnet ef migrations bundle\` (EF Core 6+) | a self-contained \`efbundle\` executable | a deployment pipeline step |
| \`db.Database.MigrateAsync()\` at startup | the app migrates itself when it starts | demos and single-instance dev setups |

Microsoft's guidance is not to migrate at application startup in production: several instances
starting together race to apply the same migration, the app needs DDL rights it otherwise does not,
and a failed migration takes the app down with it. Generate the script or bundle, review it, apply it
as its own deployment step **before** the new code starts.`,
    workedExample: `**Problem.** The CampusEvents API was started with an in-memory list of venues. Move it onto SQL
Server so that it runs locally and in production without a single secret in the repository.

**Step 1 — packages.** \`Microsoft.EntityFrameworkCore.SqlServer\` in the API project and
\`Microsoft.EntityFrameworkCore.Design\` for the tooling; \`dotnet tool install --global dotnet-ef\`.

**Step 2 — the context.** \`EventsDbContext\` with a constructor taking
\`DbContextOptions<EventsDbContext>\` and three \`DbSet\`s.

**Step 3 — register it.**

    builder.Services.AddDbContext<EventsDbContext>(o =>
        o.UseSqlServer(builder.Configuration.GetConnectionString("Events")));

**Step 4 — the connection string, per environment.**

    dotnet user-secrets init
    dotnet user-secrets set "ConnectionStrings:Events" "Server=localhost;Database=CampusEvents;Trusted_Connection=True;TrustServerCertificate=True"

On the server: \`ConnectionStrings__Events=Server=prod-sql;Database=CampusEvents;User Id=events_app;Password=…\`
as an environment variable (or the host's secret store).

**Step 5 — the first migration and the local database.**

    dotnet ef migrations add InitialCreate
    dotnet ef database update

**Step 6 — the production script.** In the pipeline:

    dotnet ef migrations script --idempotent --output migrate.sql

The DBA (or a pipeline job with a migration login) runs \`migrate.sql\`; then the new API version is
deployed. The API's own login needs only read and write rights, not \`ALTER\`.

**Step 7 — check.** \`GET /api/venues\` returns rows from SQL Server; stopping SQL Server makes the
endpoint fail while the app itself keeps running, which proves the context is not created at startup
but per request.`,
    mcqs: [
      mcq('`builder.Services.AddSingleton<IVenueCache, VenueCache>()` and VenueCache takes EventsDbContext in its constructor. What happens when the API starts with ASPNETCORE_ENVIRONMENT=Development?', [
        ['It refuses to start: a scoped service in a singleton', true],
        ['It starts, and every request shares one context safely', false],
        ['It starts, and DI quietly makes VenueCache scoped too', false],
      ], 'In Development the host validates scopes on build and throws "Cannot consume scoped service ... from singleton ...". The context is scoped; a singleton holding it would share one non-thread-safe context across all requests.'),
      mcq('The production server sets an environment variable for the CampusEvents connection string. Which name does `GetConnectionString("Events")` read on Linux?', [
        ['Events_ConnectionString', false],
        ['ConnectionStrings:Events', false],
        ['CONNECTIONSTRINGS_EVENTS_VALUE', false],
        ['ConnectionStrings__Events', true],
      ], 'GetConnectionString("Events") reads ConnectionStrings:Events. The environment-variable provider maps a double underscore to the colon separator, which Linux variable names cannot contain.'),
      mcq('Why does Microsoft advise against calling `db.Database.MigrateAsync()` in Program.cs for a production API?', [
        ['MigrateAsync cannot apply migrations to SQL Server', false],
        ['Instances race, and the app needs DDL rights it should not', true],
        ['Migrations applied at startup are never recorded at all', false],
      ], 'Several instances starting together can try to apply the same migration, the app login needs schema-changing rights, and a failed migration crashes startup. An idempotent script or bundle applied as a separate step avoids all three.'),
    ],
    checkpoint: [
      ck('EF_CORE', 'What lifetime does `AddDbContext<EventsDbContext>(…)` give the context in an ASP.NET Core API, and what does that mean per request?', [
        ['Singleton: one context serves the app for its whole life', false],
        ['Transient: a new context for every class that asks for one', false],
        ['Scoped: one context per request, disposed after the response', true],
      ], 'AddDbContext registers the context as scoped by default. Each request gets its own scope, so the controller and the services it calls share one context, which is disposed when the request ends.'),
      ck('EF_CORE', 'A BackgroundService needs to query EventsDbContext every five minutes. What is the correct way to get a context inside ExecuteAsync?', [
        ['Create a scope from IServiceScopeFactory and resolve it', true],
        ['Inject EventsDbContext into the worker\'s constructor', false],
        ['Call new EventsDbContext() with no options passed to it', false],
        ['Resolve it once from app.Services in Program.cs', false],
      ], 'A hosted service is a singleton with no request scope. It creates a scope with IServiceScopeFactory.CreateScope(), resolves a context from it, and disposes the scope after the unit of work.'),
      ck('EF_CORE', 'The team wants to apply migrations to the production database as a reviewed, separate deployment step. Which command produces what they need?', [
        ['dotnet ef database update --connection prod', false],
        ['dotnet ef migrations script --idempotent', true],
        ['dotnet ef migrations add Production', false],
      ], 'An idempotent script checks __EFMigrationsHistory before each migration, so it is safe to run whatever version the database is at, and it can be reviewed before it runs. database update applies directly from a developer machine.'),
    ],
  },

  /* ── SERVICE_LAYER ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_DATA_SERVICE_LAYER',
    notes: `Injecting the context straight into a controller works for one \`GET\`. By the time booking a seat
must check that the event is in the future, that seats remain and that the student has not already
booked, the controller is eighty lines of rules mixed with HTTP. Split it.

## Three layers, three jobs

| Layer | Knows about | Does |
|---|---|---|
| Controller | HTTP: routes, status codes, DTOs | binds the request, calls one service method, picks the status code |
| Service | the business rules | decides whether the operation is allowed, changes entities, saves |
| Data (\`DbContext\`) | SQL Server | queries and change tracking |

The controller must not contain an \`if\` about seats. The service must not know what a 409 is.

## The service

    public interface IBookingService
    {
        Task<BookingDto> BookAsync(int eventId, string userId, CancellationToken ct);
        Task<EventDto?> GetEventAsync(int id, CancellationToken ct);
    }

    public class BookingService(EventsDbContext db, TimeProvider clock) : IBookingService
    {
        public async Task<BookingDto> BookAsync(int eventId, string userId, CancellationToken ct)
        {
            var ev = await db.Events.FindAsync([eventId], ct)
                     ?? throw new NotFoundException($"Event {eventId} not found");

            if (ev.StartsAt <= clock.GetUtcNow())
                throw new BusinessRuleException("This event has already started.");
            if (ev.BookedSeats >= ev.Capacity)
                throw new BusinessRuleException("The event is full.");
            if (await db.Bookings.AnyAsync(b => b.EventId == eventId && b.UserId == userId, ct))
                throw new BusinessRuleException("You have already booked this event.");

            var booking = new Booking { EventId = eventId, UserId = userId, BookedAt = clock.GetUtcNow() };
            db.Bookings.Add(booking);
            ev.BookedSeats++;
            await db.SaveChangesAsync(ct);          // one transaction: the row and the counter

            return booking.ToDto(ev.Title);
        }

        public Task<EventDto?> GetEventAsync(int id, CancellationToken ct) =>
            db.Events.AsNoTracking()
                .Where(e => e.Id == id)
                .Select(e => new EventDto(e.Id, e.Title, e.StartsAt, e.Venue.Name, e.Capacity - e.BookedSeats))
                .FirstOrDefaultAsync(ct);
    }

Register it next to the context — scoped, because it holds the scoped context:

    builder.Services.AddScoped<IBookingService, BookingService>();
    builder.Services.AddSingleton(TimeProvider.System);   // TimeProvider is .NET 8

## The thin controller

    [ApiController]
    [Route("api/events")]
    public class EventsController(IBookingService bookings) : ControllerBase
    {
        [HttpGet("{id:int}")]
        public async Task<ActionResult<EventDto>> Get(int id, CancellationToken ct)
        {
            var dto = await bookings.GetEventAsync(id, ct);
            return dto is null ? NotFound() : dto;
        }

        [HttpPost("{id:int}/bookings")]
        public async Task<ActionResult<BookingDto>> Book(int id, CancellationToken ct)
        {
            var dto = await bookings.BookAsync(id, User.FindFirstValue(ClaimTypes.NameIdentifier)!, ct);
            return CreatedAtAction(nameof(GetBooking), "Bookings", new { id = dto.Id }, dto);
        }
    }

\`NotFoundException\` and \`BusinessRuleException\` become 404 and 409 in **one place** — the
\`IExceptionHandler\` you wrote in the Web API topic, which writes ProblemDetails. Throwing from the
service keeps HTTP out of it; returning a result type (\`Result<BookingDto>\` with an error code) is
the other common style and avoids exceptions for expected outcomes. Pick one per project.

## Entities never leave the API

Return DTOs, never entities:

- **Shape.** \`Booking\` has \`UserId\` and a navigation to \`Event\`, which navigates to \`Venue\` and back
  to its \`Events\`. Serialising an entity graph either leaks columns you did not mean to publish or
  fails with System.Text.Json's *"A possible object cycle was detected"* (a 500).
- **Overposting.** A \`POST\` that binds \`Event\` directly lets the caller set \`BookedSeats\` or
  \`OrganiserId\`. Bind a \`CreateEventRequest\` that has only the fields a caller may send.
- **Efficiency.** \`Select(e => new EventDto(…))\` makes EF Core fetch only those columns, joins
  \`Venue\` for \`e.Venue.Name\` without an \`Include\`, and tracks nothing.

Mapping is plain code — an extension method is enough:

    public static class BookingMapping
    {
        public static BookingDto ToDto(this Booking b, string eventTitle) =>
            new(b.Id, b.EventId, eventTitle, b.BookedAt);
    }

Libraries such as AutoMapper or Mapster do this by convention; in an interview, be ready to say that
manual mapping is explicit and compile-checked, and that a mapper saves typing but hides mistakes
until runtime.

## Do you need a repository?

\`DbContext\` already **is** a unit of work and each \`DbSet\` already **is** a repository. A generic
\`IRepository<T>\` with \`GetAll()\` returning \`IEnumerable<T>\` is worse than nothing: every filter
after it runs in memory over the whole table. Reasonable choices:

- Use the context directly in services (common in modern ASP.NET Core code).
- Write **specific** repositories (\`IEventRepository.GetUpcomingAsync(…)\`) when queries are complex
  or reused, returning DTOs or materialised lists — never a raw \`IQueryable\` that leaks EF Core.

Either way, the service — not the controller and not the repository — owns the rule and calls
\`SaveChangesAsync\` once.`,
    mcqs: [
      mcq('`EventsController.Create` binds the `Event` entity from the body and adds it. What can a caller do that a `CreateEventRequest` DTO would prevent?', [
        ['Send a title that is longer than the database column', false],
        ['Post the same event twice within a single second', false],
        ['Set BookedSeats or OrganiserId in the request JSON', true],
      ], 'Model binding fills every public settable property it finds in the JSON. Binding the entity lets a caller set fields that only the server should control; a request DTO exposes only what the caller may send.'),
      mcq('`GET /api/events/5` returns the Event entity with its Venue loaded, and Venue has a list of Events. The response is a 500. What is the most likely error?', [
        ['Cannot consume scoped service from singleton EventService', false],
        ['The entity type Event requires a primary key to be set', false],
        ['A possible object cycle was detected (JsonException)', true],
      ], 'Event → Venue → Events → Event is a cycle, and System.Text.Json throws a JsonException when it detects one. Projecting into an EventDto removes both the cycle and the leaked columns.'),
      mcq('A team adds `IRepository<T>` with `IEnumerable<T> GetAll()`, then writes `repo.GetAll().Where(e => e.StartsAt > now).Take(20)` in the service. What runs in SQL Server?', [
        ['A SELECT with WHERE StartsAt > @now and TOP 20', false],
        ['A SELECT of every row and every column in Events', true],
        ['A SELECT TOP 20 with the date filter run in memory', false],
      ], 'Returning IEnumerable ends the EF Core query: the Where and Take are LINQ to Objects. The database sends the whole table and the filter runs in the API process.'),
    ],
    checkpoint: [
      ck('ASPNET_CORE', 'Where does the rule "an event that has already started cannot be booked" belong in the CampusEvents API?', [
        ['In the controller, before it calls SaveChangesAsync', false],
        ['In the IExceptionHandler, which checks every incoming request', false],
        ['In the BookingDto, as a validation attribute on it', false],
        ['In BookingService, which then throws a business error', true],
      ], 'Business rules live in the service. The controller only translates HTTP to a service call and back, and the exception handler only turns the service\'s error into a 409 ProblemDetails.'),
      ck('ASPNET_CORE', 'BookingService takes EventsDbContext in its constructor. Which registration is correct?', [
        ['builder.Services.AddScoped<IBookingService, BookingService>()', true],
        ['builder.Services.AddSingleton<IBookingService, BookingService>()', false],
        ['builder.Services.AddTransient<BookingService, IBookingService>()', false],
      ], 'A service holding the scoped context must itself be scoped (or transient). Singleton would capture one context for the app\'s lifetime, and the transient line has the type arguments the wrong way round.'),
      ck('ASPNET_CORE', `What does this action return when the service returns null?

    public async Task<ActionResult<EventDto>> Get(int id, CancellationToken ct)
    {
        var dto = await bookings.GetEventAsync(id, ct);
        return dto is null ? NotFound() : dto;
    }`, [
        ['200 with an empty JSON body', false],
        ['404 with a ProblemDetails body', true],
        ['204 No Content', false],
      ], 'NotFound() produces 404, and with [ApiController] the client error is returned as ProblemDetails. The implicit conversion from EventDto to ActionResult<EventDto> handles the 200 case.'),
    ],
  },

  /* ── PAGINATION_FILTERING ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_DATA_PAGINATION_FILTERING',
    notes: `\`GET /api/events\` returning \`db.Events.ToListAsync()\` is fine with twelve events. With forty
thousand it sends megabytes, holds memory on the server, and the React list freezes. A list endpoint
must **filter in the database, sort deterministically, and return one page at a time**.

## The query parameters as one object

    public record EventQuery
    {
        [Range(1, int.MaxValue)] public int Page { get; init; } = 1;
        [Range(1, 100)]          public int PageSize { get; init; } = 20;
        public string? Search { get; init; }
        public int? VenueId { get; init; }
        public DateTime? From { get; init; }
        public string? Sort { get; init; }        // "date", "-date", "title"
    }

    [HttpGet]
    public Task<PagedResult<EventSummaryDto>> List([FromQuery] EventQuery q, CancellationToken ct)
        => events.ListAsync(q, ct);

\`[FromQuery]\` on a complex type binds each property from the query string:
\`/api/events?page=2&pageSize=20&venueId=3&sort=-date\`. With \`[ApiController]\`, a \`pageSize=500\`
fails the \`[Range]\` and the caller gets the automatic 400 ValidationProblemDetails. The maximum is
not optional: without it, \`pageSize=1000000\` is your unpaged endpoint again.

## Building the query

\`IQueryable<T>\` composes. Nothing runs until \`ToListAsync\`, \`CountAsync\` or \`FirstOrDefaultAsync\`:

    public async Task<PagedResult<EventSummaryDto>> ListAsync(EventQuery q, CancellationToken ct)
    {
        IQueryable<Event> query = db.Events.AsNoTracking();

        if (q.VenueId is int venueId)
            query = query.Where(e => e.VenueId == venueId);
        if (q.From is DateTime from)
            query = query.Where(e => e.StartsAt >= from);
        if (!string.IsNullOrWhiteSpace(q.Search))
            query = query.Where(e => e.Title.Contains(q.Search));

        query = q.Sort switch
        {
            "-date" => query.OrderByDescending(e => e.StartsAt).ThenBy(e => e.Id),
            "title" => query.OrderBy(e => e.Title).ThenBy(e => e.Id),
            _       => query.OrderBy(e => e.StartsAt).ThenBy(e => e.Id),
        };

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip((q.Page - 1) * q.PageSize)
            .Take(q.PageSize)
            .Select(e => new EventSummaryDto(e.Id, e.Title, e.StartsAt, e.Venue.Name))
            .ToListAsync(ct);

        return new PagedResult<EventSummaryDto>(items, q.Page, q.PageSize, total);
    }

    public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount)
    {
        public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    }

On SQL Server, \`Skip\`/\`Take\` after an \`OrderBy\` becomes \`ORDER BY … OFFSET @p0 ROWS FETCH NEXT @p1
ROWS ONLY\`, and the \`Where\` clauses become a parameterised \`WHERE\`. The count runs on the
**filtered** query, before paging — otherwise "page 2 of 7" is a lie.

## Rules that stop subtle bugs

- **Always order before paging.** Without \`OrderBy\`, SQL Server may return rows in any order, so
  the same row can appear on page 1 and page 2 while another never appears. EF Core logs a warning
  when \`Skip\`/\`Take\` is used without \`OrderBy\`.
- **Make the order unique.** Fifty events on the same date in an \`OrderBy(e => e.StartsAt)\` are
  again in an unstable order; \`ThenBy(e => e.Id)\` breaks the tie.
- **Whitelist sort fields.** Map known values with a \`switch\`, as above. Never build the column name
  from the request with reflection or string concatenation into raw SQL — that is either a crash on
  an unknown name or an SQL injection.
- **Filter before materialising.** \`(await db.Events.ToListAsync()).Where(…)\` loads the table first.
  The \`Where\` must be on the \`IQueryable\`.
- **Read-only lists use \`AsNoTracking\`** (or a \`Select\` projection, which is never tracked).
- **Return page metadata** in the body (as here) or in a header such as \`X-Total-Count\`; the React
  pager needs \`TotalCount\` or \`TotalPages\` to draw its buttons.

## When OFFSET gets slow: keyset paging

\`OFFSET 200000 ROWS\` still makes SQL Server walk past 200,000 rows. For infinite scroll or exports,
**keyset** (seek) paging asks for "the 20 after the last one I saw":

    query.Where(e => e.StartsAt > lastStartsAt || (e.StartsAt == lastStartsAt && e.Id > lastId))
         .OrderBy(e => e.StartsAt).ThenBy(e => e.Id)
         .Take(20)

With an index on \`(StartsAt, Id)\` each page costs the same. The trade-off: no jumping to page 57,
only "next".

## Search

\`e.Title.Contains(q.Search)\` is translated to SQL, with the search text sent as a parameter — no
injection. A leading-wildcard match cannot use an ordinary index seek, so on a large table it scans;
full-text search (\`EF.Functions.Contains\` with a SQL Server full-text index) is the next step when
that becomes slow.`,
    workedExample: `**Problem.** The organiser dashboard calls \`GET /api/events?venueId=3&page=2&pageSize=10&sort=-date\`.
Trace exactly what happens.

**1. Binding.** \`EventQuery\` is filled: \`VenueId = 3\`, \`Page = 2\`, \`PageSize = 10\`,
\`Sort = "-date"\`; \`Search\` and \`From\` stay null. Both \`[Range]\` checks pass.

**2. Composition.** \`query\` becomes \`Events.AsNoTracking().Where(VenueId == 3)\`, then the switch adds
\`OrderByDescending(StartsAt).ThenBy(Id)\`. No SQL yet.

**3. The count.** \`CountAsync\` sends roughly:

    SELECT COUNT(*) FROM [Events] AS [e] WHERE [e].[VenueId] = @__venueId_0

Say it returns 34.

**4. The page.** \`Skip(10).Take(10).Select(...)\` sends roughly:

    SELECT [e].[Id], [e].[Title], [e].[StartsAt], [v].[Name]
    FROM [Events] AS [e]
    INNER JOIN [Venues] AS [v] ON [e].[VenueId] = [v].[Id]
    WHERE [e].[VenueId] = @__venueId_0
    ORDER BY [e].[StartsAt] DESC, [e].[Id]
    OFFSET @__p_1 ROWS FETCH NEXT @__p_2 ROWS ONLY

Only four columns, a join for the venue name, ten rows.

**5. The response.**

    { "items": [ …10 events… ], "page": 2, "pageSize": 10, "totalCount": 34, "totalPages": 4 }

**6. The abuse cases.** \`pageSize=0\` and \`pageSize=500\` → 400 with an \`errors.PageSize\` entry.
\`sort=Title;DROP TABLE Events\` → falls to the default branch of the switch and sorts by date; the
string never reaches SQL.`,
    mcqs: [
      mcq('The events list orders only by StartsAt, and 50 events share the same start time. Users report one event appearing on two pages and another on none. What fixes it?', [
        ['Add ThenBy(e => e.Id) so that the order is unique', true],
        ['Call AsNoTracking() before Skip and Take run', false],
        ['Switch Skip/Take to ToList() and then page in memory', false],
      ], 'With ties, SQL Server may order the tied rows differently on each query, so OFFSET slices them inconsistently. A unique tie-breaker such as the key makes every page deterministic.'),
      mcq('`/api/events?pageSize=500` is called on an action taking `[FromQuery] EventQuery q`, where PageSize has `[Range(1, 100)]`, in an [ApiController]. What does the caller get?', [
        ['200 with the first 100 events, as the value is clamped', false],
        ['200 with all 500 events, since Range applies only to bodies', false],
        ['400 ValidationProblemDetails with an error for PageSize', true],
      ], '[ApiController] returns an automatic 400 when model state is invalid, and validation attributes apply to query-bound complex types as well as bodies. Nothing clamps the value for you.'),
      mcq('Why is `CountAsync` called on the filtered query before `Skip` and `Take` are applied?', [
        ['CountAsync cannot be called after Skip in EF Core', false],
        ['The total must be the matching rows, not one page', true],
        ['Counting the full table is faster than counting a page', false],
      ], 'TotalCount and TotalPages describe every row that matches the filters. Counting after Take would return at most PageSize; counting before the filters would include rows the user never asked for.'),
    ],
    checkpoint: [
      ck('EF_CORE', `What SQL Server clause does EF Core 8 generate for the paging part of this query?

    db.Events.OrderBy(e => e.StartsAt).Skip(40).Take(20)`, [
        ['ORDER BY … OFFSET … ROWS FETCH NEXT … ROWS ONLY', true],
        ['SELECT TOP 20 … WHERE ROW_NUMBER() > 40', false],
        ['LIMIT 20 OFFSET 40 after the ORDER BY clause', false],
      ], 'The SQL Server provider translates Skip and Take after an ordering into OFFSET … ROWS FETCH NEXT … ROWS ONLY, with the numbers sent as parameters. LIMIT is MySQL and PostgreSQL syntax.'),
      ck('EF_CORE', 'A filter is written as `var all = await db.Events.ToListAsync(ct); return all.Where(e => e.VenueId == venueId).ToList();`. What is wrong?', [
        ['ToListAsync cannot be followed by any LINQ at all', false],
        ['The Where clause is sent to SQL Server twice over the wire', false],
        ['Every event is loaded before the venue filter runs', true],
      ], 'ToListAsync executes the query and materialises the whole table; the Where then runs over objects in memory. The filter belongs on the IQueryable before the query executes.'),
      ck('EF_CORE', 'A client sends `?sort=startsAt` and the service does `query.OrderBy(e => EF.Property<object>(e, q.Sort))` with no checks. Which risk does a switch over known values remove?', [
        ['SQL injection through the sort value in raw SQL', false],
        ['Paging that ignores the ORDER BY on SQL Server', false],
        ['Sorting text columns in a case-sensitive order', false],
        ['A runtime failure for an unknown property name', true],
      ], 'EF.Property with a name that is not a mapped property fails when the query is translated, giving a 500. It is not injectable, because EF Core resolves the name against the model. A whitelist turns unknown values into a default or a 400.'),
    ],
  },

  /* ── ASYNC_TRANSACTIONS ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_DATA_ASYNC_TRANSACTIONS',
    notes: `A request that waits for SQL Server spends almost all its time waiting. If that wait blocks a thread,
two hundred slow requests use two hundred thread-pool threads, the pool grows slowly, and new requests
queue even though the CPU is idle. **async I/O frees the thread while the database works.**

## async all the way down

    [HttpGet("{id:int}")]
    public async Task<ActionResult<EventDto>> Get(int id, CancellationToken ct)
    {
        var dto = await events.GetAsync(id, ct);
        return dto is null ? NotFound() : dto;
    }

    // in EventService
    public Task<EventDto?> GetAsync(int id, CancellationToken ct) =>
        db.Events.AsNoTracking().Where(e => e.Id == id)
          .Select(e => new EventDto(e.Id, e.Title, e.StartsAt, e.Venue.Name, e.Capacity - e.BookedSeats))
          .FirstOrDefaultAsync(ct);

Rules:

- Use the \`…Async\` EF Core methods: \`ToListAsync\`, \`FirstOrDefaultAsync\`, \`AnyAsync\`,
  \`CountAsync\`, \`FindAsync\`, \`SaveChangesAsync\`. (They live in \`Microsoft.EntityFrameworkCore\`.)
- **Never block on a task**: \`.Result\`, \`.Wait()\`, \`.GetAwaiter().GetResult()\`. ASP.NET Core has
  no synchronization context, so this usually does not deadlock — it does something quieter: every
  blocked request holds a thread, and under load the pool starves. Response times climb while the
  CPU idles.
- **Never \`async void\`** in a controller or service. The caller cannot await it, the request can
  finish (and the context be disposed) while it still runs, and its exception crashes the process.
- Return \`Task<T>\` all the way up. An action returning \`Task<ActionResult<T>>\` is the normal shape.

## One context, one operation at a time

A \`DbContext\` does not support two operations at once. This looks clever and fails:

    var eventTask = db.Events.FirstOrDefaultAsync(e => e.Id == id, ct);
    var countTask = db.Bookings.CountAsync(b => b.EventId == id, ct);
    await Task.WhenAll(eventTask, countTask);   // InvalidOperationException

The error is *"A second operation was started on this context instance before a previous operation
completed."* Await each call in turn. (A forgotten \`await\` produces the same error.)

## The request's CancellationToken

Add a \`CancellationToken\` parameter to an action and ASP.NET Core binds it to
\`HttpContext.RequestAborted\` — it is cancelled when the client disconnects. Pass it to every EF Core
call:

    [HttpGet("report")]
    public async Task<ActionResult<ReportDto>> Report(CancellationToken ct)
        => await reports.BuildAsync(ct);   // long query, cancelled if the user closes the tab

When it fires, the in-flight \`SqlCommand\` is cancelled and an \`OperationCanceledException\` (often
a \`TaskCanceledException\`) propagates. That is expected, not a bug: nobody is waiting for the answer.
Do not catch it and turn it into a 500.

## SaveChanges is already a transaction

All the inserts, updates and deletes pending in one \`SaveChangesAsync\` are sent inside one database
transaction: they all commit or none do. In the booking from the service-layer unit, the new
\`Booking\` row and the \`BookedSeats++\` are saved together. **Prefer one SaveChanges per operation.**

## When you need several saves: an explicit transaction

Sometimes you need a generated key before the next step, or must mix \`SaveChangesAsync\` with
\`ExecuteUpdateAsync\` (EF Core 7+, runs immediately). Then wrap them:

    await using var tx = await db.Database.BeginTransactionAsync(ct);

    var order = new TicketOrder { UserId = userId, CreatedAt = now };
    db.TicketOrders.Add(order);
    await db.SaveChangesAsync(ct);                 // order.Id now set

    db.Tickets.AddRange(seats.Select(s => new Ticket { OrderId = order.Id, Seat = s }));
    await db.SaveChangesAsync(ct);

    await db.Events.Where(e => e.Id == eventId)
        .ExecuteUpdateAsync(s => s.SetProperty(e => e.BookedSeats, e => e.BookedSeats + seats.Count), ct);

    await tx.CommitAsync(ct);

If anything throws before \`CommitAsync\`, disposing \`tx\` (the \`await using\`) rolls back everything,
including the first \`SaveChanges\`. SQL Server's default isolation level is READ COMMITTED.

## Retries and transactions

\`UseSqlServer(cs, o => o.EnableRetryOnFailure())\` retries transient failures — useful against Azure
SQL. But the retrying strategy cannot retry half a transaction you opened yourself, so
\`BeginTransactionAsync\` then throws *"The configured execution strategy
'SqlServerRetryingExecutionStrategy' does not support user-initiated transactions"*. Run the whole
unit through the strategy:

    var strategy = db.Database.CreateExecutionStrategy();
    await strategy.ExecuteAsync(async () =>
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        // … the saves …
        await tx.CommitAsync(ct);
    });

## The race a transaction does not stop

Two students book the last seat at the same instant. Both read \`BookedSeats = 99\` of 100, both add a
booking: 101 seats sold. READ COMMITTED does not prevent that. Two fixes:

- **A concurrency token** (\`[Timestamp] public byte[] RowVersion { get; set; }\` on \`Event\`): the
  second \`SaveChangesAsync\` throws \`DbUpdateConcurrencyException\`; the service retries or answers 409.
- **An atomic conditional update**, which checks and increments in one statement:

      var updated = await db.Events
          .Where(e => e.Id == eventId && e.BookedSeats < e.Capacity)
          .ExecuteUpdateAsync(s => s.SetProperty(e => e.BookedSeats, e => e.BookedSeats + 1), ct);
      if (updated == 0) throw new BusinessRuleException("The event is full.");`,
    mcqs: [
      mcq('An action calls `var list = service.GetEventsAsync().Result;`. Under load the API slows to a crawl while CPU stays near 10%. What is happening?', [
        ['Blocked threads wait on I/O and the thread pool starves', true],
        ['A classic deadlock on the ASP.NET synchronization context', false],
        ['EF Core opens a new SQL Server connection for each .Result', false],
      ], 'ASP.NET Core has no synchronization context, so .Result rarely deadlocks there; instead each request holds a thread while it waits. The pool grows slowly and new requests queue. Await instead.'),
      mcq('A controller action declares a `CancellationToken ct` parameter and nothing else binds it. When is it cancelled?', [
        ['When SaveChangesAsync throws a database update failure', false],
        ['When the action has been running for longer than thirty seconds', false],
        ['When the client disconnects before the response is sent', true],
      ], 'ASP.NET Core binds a CancellationToken action parameter to HttpContext.RequestAborted, which is signalled when the client aborts the request. There is no default timeout behind it.'),
      mcq('Two SaveChangesAsync calls run inside `await using var tx = await db.Database.BeginTransactionAsync(ct);`, and the second throws before `tx.CommitAsync`. What is in the database?', [
        ['The first save\'s rows, as it had already completed', false],
        ['Nothing from either save, as the transaction rolls back', true],
        ['The second save\'s rows, which the provider retries', false],
      ], 'Both saves ran inside the explicit transaction, so neither is committed until CommitAsync. Disposing the transaction without committing rolls back all of it.'),
    ],
    checkpoint: [
      ck('ASPNET_CORE', 'A service method starts two queries on the same EventsDbContext and awaits them with Task.WhenAll. What happens?', [
        ['InvalidOperationException: a second operation was started', true],
        ['EF Core quietly runs them one after the other instead', false],
        ['Both queries run in parallel on one shared connection', false],
      ], 'A DbContext supports one operation at a time and detects overlap, throwing "A second operation was started on this context instance before a previous operation completed". Await the calls sequentially.'),
      ck('ASPNET_CORE', 'The booking service adds a Booking and increments Event.BookedSeats, then calls `await db.SaveChangesAsync(ct)` once. Why does it need no explicit transaction?', [
        ['EF Core only allows one entity change per SaveChanges', false],
        ['SQL Server wraps every single statement in a transaction', false],
        ['One SaveChanges sends all its changes in one transaction', true],
      ], 'SaveChanges wraps everything pending in a single transaction, so the insert and the update commit together or not at all. An explicit transaction is needed only across several SaveChanges or ExecuteUpdate calls.'),
      ck('ASPNET_CORE', 'With `EnableRetryOnFailure()` configured, BeginTransactionAsync throws that the execution strategy does not support user-initiated transactions. What is the fix?', [
        ['Remove the transaction, since SaveChanges always retries', false],
        ['Set the isolation level to SERIALIZABLE on the server', false],
        ['Call SaveChanges synchronously inside the transaction', false],
        ['Run the transaction inside strategy.ExecuteAsync(...)', true],
      ], 'A retrying strategy must be able to replay the whole unit. Wrapping the begin, the saves and the commit in CreateExecutionStrategy().ExecuteAsync lets it retry the transaction as one operation.'),
    ],
  },

  /* ── DEBUGGING ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_DATA_DEBUGGING',
    notes: `When EF Core breaks inside an API, the client sees a 500 ProblemDetails and nothing more. The answer is
in the server log: the exception type and its message. In development, turn on the SQL log so you can
see what EF Core actually sent:

    "Logging": { "LogLevel": { "Microsoft.EntityFrameworkCore.Database.Command": "Information" } }

For each fault below: **symptom, message, cause, fix.**

## 1. The API will not start: scoped from singleton

**Message (Development):** *"Cannot consume scoped service 'CampusEvents.Data.EventsDbContext' from
singleton 'CampusEvents.Services.IEventCache'."* **Cause:** \`AddSingleton<IEventCache, EventCache>()\`
where \`EventCache\` takes the context. In Production scope validation is off by default, so the same
code starts and then fails randomly under load with the "second operation" error below. **Fix:** make
the service scoped, or have the singleton create a scope with \`IServiceScopeFactory\` each time it
needs the database.

## 2. 500: a second operation on this context

**Message:** *"A second operation was started on this context instance before a previous operation
completed."* **Causes:** \`Task.WhenAll\` over two queries on one context; a missing \`await\` before an
async EF Core call; an \`async void\` method still using the context. **Fix:** await every call, one at
a time; make every method return \`Task\`.

## 3. 500: object cycle

**Message:** \`System.Text.Json.JsonException: A possible object cycle was detected.\` **Cause:** the
action returns an entity whose navigations point back (\`Event.Venue.Events\`). **Fix:** project into
a DTO. Do not reach for \`ReferenceHandler.IgnoreCycles\` — it hides the leak of entity columns.

## 4. 500: Invalid object name

**Message:** \`SqlException: Invalid object name 'Bookings'.\` (or *"Invalid column name 'Capacity'"*).
**Cause:** the model has the table or column, the database does not — a migration was added but never
applied to this database, or applied to a different database than the connection string points at.
**Fix:** \`dotnet ef migrations list\` shows which are pending; apply them, and print the target
database name at startup in development.

## 5. Nothing works anywhere: no connection string

**Symptom:** every endpoint that queries returns 500 with an \`InvalidOperationException\` saying the
connection string has not been initialized. **Cause:** \`GetConnectionString("Events")\` returned
\`null\`: the key in \`appsettings.json\` is spelt \`"Event"\`, the value is only in
\`appsettings.Development.json\` and the server runs as Production, or the server variable is named
\`ConnectionStrings:Events\` (colon) on Linux. **Fix:** match the key, set
\`ConnectionStrings__Events\`, and fail fast at startup if it is missing:

    var cs = builder.Configuration.GetConnectionString("Events")
             ?? throw new InvalidOperationException("ConnectionStrings:Events is not configured.");

## 6. Paging shows duplicates

**Symptom:** an event appears on page 1 and page 2; another never shows. The log has EF Core's warning
about \`Skip\`/\`Take\` without \`OrderBy\`, or the order is on a non-unique column. **Fix:**
\`OrderBy(…).ThenBy(e => e.Id)\` before \`Skip\`.

## 7. The list endpoint takes eight seconds

**Symptom:** \`GET /api/events?venueId=3\` is slow and the API's memory jumps. The SQL log shows
\`SELECT … FROM [Events]\` with **no WHERE**. **Cause:** a repository returns \`IEnumerable<Event>\` or
the code calls \`ToListAsync()\` before \`Where\`. **Fix:** keep the query \`IQueryable\` until the last
step, and project with \`Select\`.

## 8. The update returns 204 but nothing changed

**Symptom:** \`PUT /api/events/7\` returns 204; a \`GET\` shows the old title. **Causes:** the service
loaded the event with \`AsNoTracking()\` and then changed it — untracked entities are not saved; or
\`SaveChangesAsync\` is never called (or not awaited). **Fix:** load tracked entities for updates,
and await \`SaveChangesAsync\`. The SQL log shows no \`UPDATE\` at all, which points straight at it.`,
    mcqs: [
      mcq('A PUT handler loads the event with `db.Events.AsNoTracking().FirstAsync(e => e.Id == id)`, sets its Title, and awaits SaveChangesAsync. The API returns 204 but the title never changes. Why?', [
        ['SaveChangesAsync ignores string properties on entities', false],
        ['FirstAsync opens a separate read-only connection', false],
        ['204 responses roll back the transaction automatically', false],
        ['The entity is not tracked, so no UPDATE is generated', true],
      ], 'AsNoTracking entities are not in the change tracker, so SaveChanges finds nothing to save and sends no UPDATE. Load the entity tracked when you intend to modify it.'),
      mcq('Every query in production fails with SqlException "Invalid object name \'Bookings\'", while the same build works locally. What is the most likely cause?', [
        ['The Bookings DbSet is missing from the context class', false],
        ['The production login lacks SELECT rights on that table', false],
        ['EF Core cannot pluralise the table name on Linux', false],
        ['The migration creating Bookings was not applied there', true],
      ], 'The model expects a Bookings table that the production database does not have. The migration exists locally (the local database has it) but was never applied to production.'),
      mcq('The API runs as Production and every database call fails because the connection string is null. The value is present in appsettings.Development.json only. Why is it null?', [
        ['Connection strings must live in launchSettings.json', false],
        ['GetConnectionString reads only environment variables', false],
        ['The Development file is loaded after the environment variables', false],
        ['Production does not load the Development settings file', true],
      ], 'appsettings.{Environment}.json is loaded only for the current environment. In Production the Development file is ignored, so the key exists nowhere unless it comes from an environment variable or secret store.'),
      mcq('The SQL log for `GET /api/events?venueId=3` shows `SELECT ... FROM [Events] AS [e]` with no WHERE clause, and the response is correct but slow. Where is the bug?', [
        ['In the index: VenueId has no non-clustered index yet', false],
        ['In the code: the filter runs after the query executed', true],
        ['In the controller: venueId was not bound from the query', false],
      ], 'The result is correctly filtered, so venueId was bound — but the SQL has no WHERE, so the filtering happened in memory after materialising. An IEnumerable repository or an early ToListAsync is the usual cause.'),
    ],
  },

  /* ── PRACTICE ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_DATA_PRACTICE',
    notes: `Build the data layer of the CampusEvents API on SQL Server (LocalDB, a Docker container on another
machine, or a free Azure SQL database). Keep the SQL log on at Information level and read it after
every exercise: it is how you prove each one works.

## Exercise 1 — Wire it up without secrets

Create \`EventsDbContext\` with \`Venue\`, \`Event\` and \`Booking\`. Register it with
\`AddDbContext\`, read the connection string with \`GetConnectionString("Events")\`, and put the value
in user secrets — not in \`appsettings.json\`. Make startup throw a clear error when the string is
missing. Create and apply \`InitialCreate\`, then generate the idempotent script and read it.

## Exercise 2 — A service and DTOs

Move all EF Core code out of the controllers into \`EventService\` and \`BookingService\`, registered
as scoped. Controllers may only call one service method and choose a status code. Return records
(\`EventDto\`, \`EventSummaryDto\`, \`BookingDto\`) built with \`Select\`. Prove there is no cycle: return
an event with its venue name.

## Exercise 3 — The paged list

Implement \`GET /api/events\` with \`EventQuery\` (\`page\`, \`pageSize\` capped at 50, \`venueId\`,
\`from\`, \`search\`, \`sort\` in \`date|-date|title\`). Return \`PagedResult<EventSummaryDto>\`. Seed
120 events, 30 of them at the same time, then page through all of them and check that no id repeats
and none is missing.

## Exercise 4 — Booking with the rules

\`POST /api/events/{id}/bookings\`: 404 for a missing event, 409 ProblemDetails for a past event, a full
event or a second booking by the same user, 201 with \`Location\` otherwise. The rules live in the
service; the controller has no \`if\` besides the one that maps a null to 404.

## Exercise 5 — Cancellation

Add \`GET /api/reports/attendance\` that runs a slow query (add \`WAITFOR DELAY '00:00:05'\` through
\`FromSql\` in development only). Pass the request's \`CancellationToken\`. Call it with curl and press
Ctrl+C after one second; find the \`OperationCanceledException\` in the log and confirm SQL Server
stopped the query.

## Exercise 6 — Last-seat race

Set an event's capacity to 1 and fire two booking requests at the same moment (two terminals, or a
small loop with \`Task.WhenAll\` over \`HttpClient\` calls). With the naive read-then-increment
code, check whether both succeed. Then fix it with \`ExecuteUpdateAsync\` and the condition
\`BookedSeats < Capacity\` and confirm exactly one 201 and one 409.`,
    mcqs: [
      mcq('In Exercise 3 you page through all 120 events with 30 sharing one StartsAt. Which ordering guarantees no id repeats and none is missing?', [
        ['OrderBy(e => e.StartsAt) on its own, as it is indexed', false],
        ['No ORDER BY at all, since SQL Server keeps rows in insert order', false],
        ['OrderBy(e => e.StartsAt).ThenBy(e => e.Id) for every page', true],
      ], 'Only a total order makes OFFSET slices stable across queries. StartsAt alone leaves the 30 tied rows in any order; adding the unique Id breaks every tie.'),
      mcq('In Exercise 4, a second booking by the same student must return 409 ProblemDetails. Where is the 409 chosen?', [
        ['In BookingService, which sets Response.StatusCode itself', false],
        ['In the controller, inside a try/catch around SaveChanges', false],
        ['In SQL Server, through a unique index on the table', false],
        ['In the exception handler mapping the business exception', true],
      ], 'The service throws a business exception and stays unaware of HTTP; the global IExceptionHandler maps it to 409 with a ProblemDetails body. A unique index is a sensible safety net, but its violation would surface as a DbUpdateException, not a designed 409.'),
      mcq('In Exercise 5 you press Ctrl+C one second into the report request. Which log entry shows the token was passed through correctly?', [
        ['An OperationCanceledException from the EF Core query', true],
        ['A 408 Request Timeout written by Kestrel to the request log', false],
        ['A completed 200 response logged five seconds later', false],
      ], 'With the token passed to the EF Core call, the client disconnect cancels the SqlCommand and an OperationCanceledException surfaces. A 200 after five seconds means the token was ignored.'),
      mcq('In Exercise 6, why does the naive "read BookedSeats, check, increment, SaveChanges" code let two students book the last seat?', [
        ['SaveChanges never uses a transaction for an UPDATE', false],
        ['Both requests read 0 of 1 before either one writes', true],
        ['The second request reuses the first request\'s context', false],
      ], 'Each request reads the same committed value and decides there is room; READ COMMITTED does not stop that. A conditional UPDATE or a concurrency token makes the check and the write one atomic step.'),
      mcq('In Exercise 1, startup must fail clearly when the connection string is missing. Which line does it?', [
        ['var cs = config.GetConnectionString("Events") ?? "Server=localhost;Database=CampusEvents";', false],
        ['var cs = config.GetConnectionString("Events") ?? throw new InvalidOperationException("...");', true],
        ['var cs = config["ConnectionStrings:Events"]!; // the ! operator throws when it is null', false],
      ], 'The null-coalescing throw stops startup with a clear message. A hard-coded fallback silently points production at the wrong server, and the null-forgiving ! only silences the compiler; it never throws.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_DATA_INTERVIEW_QUESTION',
    notes: `".NET developer with EF Core" means an interviewer will push on how EF Core lives inside your API.
These three come up most.

## Q1. "What is the lifetime of your DbContext in ASP.NET Core, and why?"

**Strong answer.** "Scoped — \`AddDbContext\` registers it that way, and ASP.NET Core creates one
scope per request. That fits what a context is: a unit of work with its own change tracker, cheap to
create, and not thread-safe. Everything in one request — the controller, the services — shares one
instance, so changes from two services are saved together by one \`SaveChangesAsync\`. It must never
go into a singleton; in Development the container refuses to start if it does. Background services
create their own scope with \`IServiceScopeFactory\`."

**Follow-up:** "What is \`AddDbContextPool\`?" — it reuses context instances across requests to save
allocations; safe only if the context class keeps no per-request state of its own.

## Q2. "How do you structure an API that uses EF Core? Do you use the repository pattern?"

**Strong answer.** "Thin controllers that only deal with HTTP, services that own the business rules
and call \`SaveChangesAsync\`, and EF Core underneath. Controllers take and return DTOs, never
entities — that avoids overposting, serialization cycles and leaking columns, and a \`Select\`
projection fetches only what the DTO needs. On repositories: \`DbContext\` is already a unit of work
and \`DbSet\` already a repository, so a generic repository mostly adds a layer — and if it returns
\`IEnumerable\`, it forces filters into memory. I use the context in services, and add specific
repositories only for complex queries that are reused."

**Follow-up:** "Then how do you unit test the service?" — for logic, extract it or test against a
real database engine (SQLite in-memory or a SQL Server container) rather than mocking \`DbSet\`;
integration tests cover the rest. (The testing topic goes deep on this.)

## Q3. "Two users book the last seat at the same moment. What happens in your code?"

**Strong answer.** "With a read-check-write, both can succeed: both read 99 of 100, both pass the
check. A transaction at READ COMMITTED doesn't stop it. I'd either add a \`rowversion\` concurrency
token so the second \`SaveChanges\` throws \`DbUpdateConcurrencyException\` and I return 409, or do the
check and increment in one statement: \`ExecuteUpdateAsync\` with \`Where(e => e.BookedSeats <
e.Capacity)\` and treat zero rows affected as 'full'. The second is simpler and needs no retry."

**Follow-up:** "When do you need an explicit transaction?" — only across several \`SaveChanges\` or
\`ExecuteUpdate\` calls; a single \`SaveChanges\` is already atomic. And with \`EnableRetryOnFailure\`
the transaction must run inside the execution strategy.

## How you are judged

Saying "scoped" is expected; saying *why* (unit of work, not thread-safe) and what breaks in a
singleton is what separates you. Mentioning async with the request \`CancellationToken\`, paging with a
stable order, and the last-seat race unprompted shows you have run an API under real load.`,
    mcqs: [
      mcq('Asked "Why not register the DbContext as a singleton to save allocations?", which answer is right?', [
        ['A context is not thread-safe and its tracker would grow', true],
        ['Singletons cannot be injected into controller classes', false],
        ['EF Core caches the model again for each singleton', false],
      ], 'One shared context would be used by concurrent requests, which it does not support, and its change tracker would accumulate every entity ever loaded. AddDbContextPool is the supported way to reuse instances.'),
      mcq('An interviewer asks why your controllers return EventDto rather than the Event entity. Which reason is NOT one of them?', [
        ['DTOs stop overposting and leaking internal columns', false],
        ['Projections fetch only the columns the client needs', false],
        ['Entities cannot be serialised by System.Text.Json', true],
        ['DTOs avoid cycles through navigation properties', false],
      ], 'System.Text.Json serialises entities happily until it meets a cycle or a column you did not mean to publish. The real reasons are control of the contract, overposting, cycles and efficient projections.'),
      mcq('Follow-up: "Your booking does Add and BookedSeats++ and then one SaveChangesAsync. Do you need BeginTransaction?"', [
        ['Yes, without it the insert commits before the update', false],
        ['No, one SaveChanges already applies both atomically', true],
        ['Yes, because SQL Server autocommits each statement', false],
      ], 'SaveChanges wraps all pending changes in a single transaction. An explicit transaction is for spanning several SaveChanges or ExecuteUpdate calls.'),
    ],
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_DATA_CHECKPOINT',
    notes: `Ten questions across EF Core inside an API: the context's lifetime and configuration, migrations at
deployment, the service layer and DTOs, paging and filtering, async with cancellation, and
transactions. Most show a few lines of code. Before you read the options, say what SQL EF Core sends
and what status the client receives.`,
    checkpoint: [
      ck('EF_CORE', `The server runs as Production with this appsettings.json and no environment variables set. What does \`GetConnectionString("Events")\` return?

    { "ConnectionStrings": { "EventsDb": "Server=sql1;Database=CampusEvents;..." } }`, [
        ['null, because no ConnectionStrings:Events key exists', true],
        ['The EventsDb value, because it is the closest match', false],
        ['An empty string, as missing keys default to an empty value', false],
      ], 'GetConnectionString("Events") looks up exactly ConnectionStrings:Events. A missing configuration key returns null; there is no fuzzy matching.'),
      ck('ASPNET_CORE', `Which status does the client get when the event does not exist, given this code and an IExceptionHandler that maps NotFoundException to 404?

    var ev = await db.Events.FindAsync([id], ct)
             ?? throw new NotFoundException($"Event {id} not found");`, [
        ['500, since any exception thrown is a server error', false],
        ['204, because FindAsync returned no entity at all', false],
        ['404 ProblemDetails, from the exception handler', true],
      ], 'FindAsync returns null for a missing key, the service throws NotFoundException, and the registered IExceptionHandler turns it into a 404 ProblemDetails. Only unmapped exceptions become 500.'),
      ck('EF_CORE', 'Which query is the cheapest way to fetch a read-only list of event titles?', [
        ['db.Events.Include(e => e.Venue).ToListAsync()', false],
        ['db.Events.Select(e => e.Title).ToListAsync()', true],
        ['db.Events.AsTracking().ToListAsync()', false],
      ], 'The projection fetches one column and tracks nothing. Include loads every Event and Venue column with a join, and AsTracking loads full entities into the change tracker.'),
      ck('ASPNET_CORE', 'Why should a controller action awaiting EF Core calls return Task<ActionResult<T>> rather than be declared `async void`?', [
        ['The framework cannot await it, so the request ends early', true],
        ['async void cannot return a value of type ActionResult', false],
        ['async void actions are rejected by the C# compiler', false],
      ], 'MVC needs a Task to know when the action finished. An async void action returns at its first await, the response is sent, the scoped context is disposed, and exceptions escape to the process.'),
      ck('EF_CORE', 'EventQuery has `[Range(1, 100)] PageSize`. A client sends `pageSize=0`. Which part of the stack stops it?', [
        ['SQL Server, which rejects FETCH NEXT 0 ROWS', false],
        ['EF Core, which throws on Take(0) during translation', false],
        ['[ApiController] model validation, with a 400', true],
      ], 'Validation runs before the action, and [ApiController] answers invalid model state with 400 ValidationProblemDetails. The query is never built.'),
      ck('EF_CORE', 'The pipeline runs `dotnet ef migrations script --idempotent` and applies the result to a database that already has the first three of five migrations. What happens?', [
        ['All five are applied again and the run fails', false],
        ['Only migrations four and five are applied to it', true],
        ['It stops: the script needs an empty database', false],
      ], 'An idempotent script wraps each migration in a check against __EFMigrationsHistory, so it skips those already applied and runs only the missing ones.'),
      ck('ASPNET_CORE', 'Where does the request\'s CancellationToken come from when an action declares `CancellationToken ct`?', [
        ['HttpContext.RequestAborted, bound by the framework', true],
        ['A new CancellationTokenSource made for each action', false],
        ['The DbContext, which cancels when it is disposed', false],
      ], 'Model binding gives a CancellationToken parameter the value of HttpContext.RequestAborted, which fires when the client disconnects.'),
      ck('EF_CORE', `What does this return for an event at full capacity?

    var n = await db.Events
        .Where(e => e.Id == id && e.BookedSeats < e.Capacity)
        .ExecuteUpdateAsync(s => s.SetProperty(e => e.BookedSeats, e => e.BookedSeats + 1), ct);`, [
        ['1, after BookedSeats has gone past Capacity', false],
        ['A DbUpdateConcurrencyException is thrown', false],
        ['0, as no row matched the WHERE condition', true],
      ], 'ExecuteUpdateAsync sends one UPDATE … WHERE and returns the number of rows affected. A full event fails the condition, so nothing is updated and the result is 0, which the service maps to "full".'),
      ck('ASPNET_CORE', 'BookingService needs today\'s date to check whether an event has started. Why inject TimeProvider instead of calling DateTime.UtcNow?', [
        ['DateTime.UtcNow cannot be used inside a scoped service', false],
        ['Tests can supply a fixed time and check the rule exactly', true],
        ['TimeProvider reads the time from the SQL Server clock', false],
      ], 'TimeProvider (.NET 8) is an abstraction over the clock; production registers TimeProvider.System, and tests pass a fake set to a fixed instant, so "already started" can be tested deterministically.'),
      ck('EF_CORE', 'A list endpoint returns entities loaded without AsNoTracking, and nothing is modified. What does tracking cost here?', [
        ['Snapshots kept in memory that nothing will ever use', true],
        ['An UPDATE for each row when the request scope ends', false],
        ['A second SELECT for every entity before it is returned', false],
      ], 'Tracked queries record a snapshot of each entity for change detection. On a read-only endpoint that is pure memory and CPU overhead; no extra SQL is sent and nothing is saved without SaveChanges.'),
    ],
  },

  /* ══════════════════════════════════════════════════════════════════════════════════════
   * JT_ASPNET_SECURITY — ASP.NET Core Security and JWT
   * ════════════════════════════════════════════════════════════════════════════════════ */

  /* ── AUTH_PIPELINE ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_SECURITY_AUTH_PIPELINE',
    notes: `Right now anyone who can reach the CampusEvents API can cancel anyone's booking. Before adding
logins and tokens, understand the two questions ASP.NET Core asks of every request and **where** it
asks them.

## Two questions, two middlewares

- **Authentication — who are you?** An *authentication handler* reads something from the request (a
  cookie, a \`Bearer\` token) and, if it is valid, builds a \`ClaimsPrincipal\` and puts it in
  \`HttpContext.User\`. If there is nothing, or it is invalid, the user stays anonymous. **It does not
  reject the request.**
- **Authorization — may you do this?** The authorization middleware looks at the endpoint the request
  is routed to, reads its metadata (\`[Authorize]\`, \`[AllowAnonymous]\`, a policy name) and decides.
  This is where requests are refused.

A refusal comes in two kinds:

| Situation | Action called | Status |
|---|---|---|
| Endpoint needs a user, the request is anonymous | **Challenge** | 401, with a \`WWW-Authenticate\` header for bearer tokens |
| The user is known but fails the requirement | **Forbid** | 403 |

## Schemes and handlers

A **scheme** is a name bound to a handler and its options:

    builder.Services
        .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)   // the default scheme: "Bearer"
        .AddJwtBearer(options => { /* token validation — the JWT unit */ });

    builder.Services.AddAuthorization();

The default scheme is used to authenticate, challenge and forbid when nothing names another. Since
.NET 7, if exactly one scheme is registered it becomes the default automatically; with two (say a
cookie and a bearer scheme) and no default, a challenge fails with *"No authenticationScheme was
specified, and there was no DefaultChallengeScheme found."*

## The middleware order

    var app = builder.Build();

    app.UseExceptionHandler();      // first: catches everything below it
    app.UseHttpsRedirection();
    app.UseCors("frontend");        // before auth, so preflight requests are answered
    app.UseAuthentication();        // sets HttpContext.User
    app.UseAuthorization();         // reads User and the endpoint's metadata

    app.MapControllers();
    app.Run();

- **UseAuthentication before UseAuthorization.** The other way round, authorization runs while
  \`User\` is still anonymous and every protected endpoint answers 401 — even with a perfect token.
- Both go **after routing** (in .NET 6+ \`WebApplication\` adds \`UseRouting\` for you at the start, so
  authorization can see which endpoint was chosen) and **before** the endpoints are mapped.
- Since .NET 7, \`WebApplication\` adds authentication and authorization middleware automatically when
  their services are registered and you did not call them. Call them yourself anyway: the order is
  then visible and under your control.

## Marking endpoints

    [ApiController]
    [Route("api/bookings")]
    [Authorize]                                   // every action needs an authenticated user
    public class BookingsController : ControllerBase
    {
        [HttpGet("mine")]
        public IActionResult Mine() =>
            Ok(new { user = User.FindFirstValue(ClaimTypes.NameIdentifier) });

        [HttpGet("rules")]
        [AllowAnonymous]                          // overrides [Authorize] for this action
        public IActionResult Rules() => Ok("Bookings close one hour before the event.");
    }

For minimal APIs the same is \`.RequireAuthorization()\` and \`.AllowAnonymous()\` on the endpoint or a
route group.

## Secure by default: the fallback policy

Forgetting \`[Authorize]\` on one new controller is the classic leak. Turn the default around:

    builder.Services.AddAuthorization(options =>
    {
        options.FallbackPolicy = new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .Build();
    });

The fallback policy applies to every endpoint **with no authorization metadata at all**. Public
endpoints (login, register, the health check) then say \`[AllowAnonymous]\` explicitly — a list you
can review.

## What the principal looks like

\`HttpContext.User\` (\`User\` in a controller) is a \`ClaimsPrincipal\`: one or more identities, each a
bag of **claims** — type/value pairs such as \`nameidentifier = "8f1c…"\`, \`email = "priya@college.in"\`,
\`role = "Student"\`. \`User.Identity.IsAuthenticated\` tells you whether a handler succeeded.
\`User.IsInRole("Admin")\` checks role claims; \`User.FindFirstValue(ClaimTypes.NameIdentifier)\` gets
the user id. Everything in later units — roles, policies, ownership — is a question about these claims.`,
    workedExample: `**Problem.** Predict the response for three requests to the CampusEvents API, configured with
JWT bearer as the default scheme, the fallback policy above, and the \`BookingsController\` shown in
the notes.

**Request 1:** \`GET /api/bookings/rules\` with no \`Authorization\` header.

- Authentication: no token, so \`User\` is anonymous. Nothing is rejected yet.
- Authorization: the action has \`[AllowAnonymous]\`, which wins over the controller's \`[Authorize]\`.
- **200**, "Bookings close one hour before the event."

**Request 2:** \`GET /api/bookings/mine\` with no header.

- Authentication: anonymous.
- Authorization: \`[Authorize]\` needs an authenticated user → **Challenge** on the default scheme.
- **401**, with \`WWW-Authenticate: Bearer\`. The controller never runs.

**Request 3:** \`GET /api/venues\` with a valid token, where \`VenuesController\` has **no** attribute.

- Authentication: the JWT handler validates the token and sets \`User\`.
- Authorization: no metadata on the endpoint, so the **fallback policy** applies; the user is
  authenticated → allowed. **200.**
- Without the fallback policy the same endpoint would also answer an anonymous caller with 200 —
  which is exactly the leak the fallback policy exists to prevent.

**The order check.** Swap \`UseAuthorization()\` above \`UseAuthentication()\` and repeat request 3: the
authorization middleware sees an anonymous \`User\` → **401** despite the valid token. Nothing in the
token changed; only the order did.`,
    mcqs: [
      mcq('A request with an invalid bearer token reaches an endpoint marked [AllowAnonymous]. What does the JWT authentication handler do?', [
        ['It rejects the request with 401 before routing runs', false],
        ['It returns 403, as a bad token is a forbidden caller', false],
        ['It leaves User anonymous, and the endpoint answers', true],
      ], 'Authentication only builds (or fails to build) a principal; rejecting is authorization\'s job. [AllowAnonymous] means no requirement is checked, so the action runs with an anonymous User.'),
      mcq('Program.cs calls `app.UseAuthorization();` and then `app.UseAuthentication();`. A valid token is sent to an [Authorize] endpoint. What comes back?', [
        ['200, as the middleware order does not change the result', false],
        ['401, because User is still anonymous when it is checked', true],
        ['403, because the token is read only after the decision', false],
      ], 'Authorization evaluates the endpoint\'s requirement before the authentication middleware has set HttpContext.User, so the caller looks anonymous and is challenged with 401.'),
      mcq('Which configuration makes every endpoint without any authorization attribute require a logged-in user?', [
        ['options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build()', true],
        ['options.DefaultPolicy = new AuthorizationPolicyBuilder().RequireAssertion(_ => true).Build()', false],
        ['options.InvokeHandlersAfterFailure = false, set inside the AddAuthorization callback', false],
      ], 'The fallback policy applies to endpoints that have no authorization metadata. The default policy is what a bare [Authorize] uses, and the assertion shown allows everyone.'),
    ],
    checkpoint: [
      ck('ASPNET_SECURITY', 'What is the difference between a Challenge and a Forbid in ASP.NET Core authorization?', [
        ['Challenge means 403 for users; Forbid means 401 for anyone', false],
        ['Challenge applies to controllers; Forbid to minimal API routes', false],
        ['Challenge is for anonymous callers (401); Forbid for known ones (403)', true],
      ], 'When a requirement needs a user and the request is anonymous, the scheme is challenged (401 for bearer). When the user is authenticated but fails the requirement, the scheme forbids (403).'),
      ck('ASPNET_SECURITY', 'BookingsController has [Authorize]; its Rules action has [AllowAnonymous]. An anonymous caller requests Rules. What happens?', [
        ['401, because the controller-level attribute wins', false],
        ['200, because AllowAnonymous skips the requirements', true],
        ['500, because the two attributes conflict at runtime', false],
      ], '[AllowAnonymous] on an action bypasses the authorization requirements that come from [Authorize] on the controller (and from the fallback policy).'),
      ck('ASPNET_SECURITY', 'Which placement of UseCors, UseAuthentication and UseAuthorization in Program.cs is correct?', [
        ['UseAuthorization, then UseAuthentication, then UseCors', false],
        ['UseAuthentication, then UseCors, then UseAuthorization', false],
        ['UseAuthentication, then UseAuthorization, then UseCors', false],
        ['UseCors, then UseAuthentication, then UseAuthorization', true],
      ], 'CORS must run before authentication so preflight requests are answered and responses carry CORS headers; authentication must set User before authorization reads it.'),
    ],
  },

  /* ── IDENTITY_PASSWORDS ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_SECURITY_IDENTITY_PASSWORDS',
    notes: `Before anyone can sign in there must be users, stored in SQL Server next to the events, with
passwords stored so that a stolen database does not hand an attacker everyone's password.
**ASP.NET Core Identity** does this for you, on EF Core.

## Adding Identity to the existing context

Package: \`Microsoft.AspNetCore.Identity.EntityFrameworkCore\`.

    public class AppUser : IdentityUser
    {
        public string FullName { get; set; } = "";
    }

    public class EventsDbContext : IdentityDbContext<AppUser>
    {
        public EventsDbContext(DbContextOptions<EventsDbContext> options) : base(options) { }
        public DbSet<Event> Events => Set<Event>();
        // … Venues, Bookings

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);      // required: maps the Identity tables
            // your own configuration
        }
    }

A new migration creates \`AspNetUsers\`, \`AspNetRoles\`, \`AspNetUserRoles\`, \`AspNetUserClaims\` and
friends. \`AspNetUsers\` has \`UserName\`, \`NormalizedUserName\`, \`Email\`, \`NormalizedEmail\`,
\`PasswordHash\`, \`SecurityStamp\`, \`LockoutEnd\`, \`AccessFailedCount\` — and **no password column**.
Forgetting \`base.OnModelCreating\` gives errors about Identity entities having no key.

## Registering it for an API

    builder.Services
        .AddIdentityCore<AppUser>(options =>
        {
            options.User.RequireUniqueEmail = true;          // false by default
            options.Password.RequiredLength = 10;
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        })
        .AddRoles<IdentityRole>()
        .AddEntityFrameworkStores<EventsDbContext>()
        .AddSignInManager();

\`AddIdentityCore\` registers the user store, \`UserManager\` and validators **without** cookie
authentication. The bigger \`AddIdentity<TUser, TRole>()\` (for MVC/Razor apps) also registers the
Identity cookie scheme and makes it the default — in a JWT API that turns every 401 into a **302
redirect to /Account/Login**. Use \`AddIdentityCore\` and add JWT bearer yourself.

The default password rules: at least 6 characters, with a digit, a lowercase letter, an uppercase
letter and a non-alphanumeric character. Length matters far more than character classes; raising
\`RequiredLength\` is the most useful change.

## Registering a user

    public record RegisterRequest(
        [Required, EmailAddress] string Email,
        [Required] string Password,
        [Required, StringLength(100)] string FullName);

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register(RegisterRequest req, UserManager<AppUser> users)
    {
        var user = new AppUser { UserName = req.Email, Email = req.Email, FullName = req.FullName };
        var result = await users.CreateAsync(user, req.Password);
        if (!result.Succeeded)
        {
            foreach (var e in result.Errors)
                ModelState.AddModelError(e.Code, e.Description);
            return ValidationProblem(ModelState);            // 400 with the rule that failed
        }
        await users.AddToRoleAsync(user, "Student");         // never a role from the request
        return Created($"/api/users/{user.Id}", new { user.Id, user.Email });
    }

\`CreateAsync\` runs the validators and returns an \`IdentityResult\` — it does not throw for a weak
password or a duplicate. Error codes such as \`PasswordTooShort\`, \`PasswordRequiresDigit\`,
\`DuplicateUserName\` and \`DuplicateEmail\` let you return a useful 400.

## How the password is stored

\`UserManager\` hashes with \`IPasswordHasher<TUser>\`. The default \`PasswordHasher<TUser>\` uses
**PBKDF2** with a random 128-bit salt per password — HMAC-SHA512 with 100,000 iterations since .NET 7
(earlier versions used HMAC-SHA256 with 10,000). The stored \`PasswordHash\` is one Base64 string that
contains a format marker, the algorithm, the iteration count, the salt and the derived key.

- **One-way.** There is no "decrypt". Checking a password re-derives a key with the stored salt and
  iterations and compares the two in constant time.
- **Salted.** Two students with the same password get different hashes, so one cracked hash reveals
  nothing about the other, and precomputed tables are useless.
- **Slow on purpose.** 100,000 iterations make each guess cost real CPU time.
- **Upgradeable.** \`VerifyHashedPassword\` returns \`SuccessRehashNeeded\` for an older format, and
  \`UserManager\` re-hashes with current settings on the next successful sign-in.

## Checking a password, with lockout

    var user = await users.FindByEmailAsync(req.Email);
    if (user is null) return Unauthorized();

    var check = await signIn.CheckPasswordSignInAsync(user, req.Password, lockoutOnFailure: true);
    if (check.IsLockedOut) return Problem(statusCode: 429, title: "Too many attempts. Try later.");
    if (!check.Succeeded) return Unauthorized();

\`CheckPasswordSignInAsync\` verifies the hash **and** counts failures (5 by default, then a 5-minute
lockout unless you change it) without issuing a cookie. \`UserManager.CheckPasswordAsync\` checks
only the hash and counts nothing — no brute-force protection.

Return the **same** 401 for an unknown email and a wrong password; different answers let an attacker
discover which emails have accounts.

## A password is never stored or logged

- Not in a column, not in a "password hint", not in an audit table.
- Not in logs: do not log request bodies on \`/api/auth/*\`, and do not write
  \`logger.LogInformation("Login {@Request}", req)\` — structured logging destructures the record,
  password included.
- Not in a response: the register endpoint returns the id and email, never the \`AppUser\` (it has
  \`PasswordHash\` and \`SecurityStamp\` on it).

## .NET 8: Identity API endpoints

.NET 8 added \`AddIdentityApiEndpoints<AppUser>()\` and \`app.MapIdentityApi<AppUser>()\`, which map
\`/register\`, \`/login\`, \`/refresh\` and more in one line. Its bearer tokens are **not JWTs** — they are
opaque tokens protected by ASP.NET Core Data Protection, readable only by the same app. Fine for a
single API with its own SPA; when other services must validate the token, or you need control over its
claims, issue JWTs yourself (next unit).`,
    workedExample: `**Problem.** Add registration and a password check to CampusEvents, and prove that passwords are
stored properly.

**Step 1 — model and migration.** \`AppUser : IdentityUser\` with \`FullName\`; change the context's base
class to \`IdentityDbContext<AppUser>\`; call \`base.OnModelCreating(builder)\` first.

    dotnet ef migrations add AddIdentity
    dotnet ef database update

**Step 2 — services.** \`AddIdentityCore<AppUser>\` with \`RequireUniqueEmail = true\` and
\`RequiredLength = 10\`, \`AddRoles<IdentityRole>()\`, \`AddEntityFrameworkStores<EventsDbContext>()\`,
\`AddSignInManager()\`. Seed the roles \`Student\`, \`Organiser\` and \`Admin\` at startup with
\`RoleManager<IdentityRole>\` (create each only if \`RoleExistsAsync\` is false).

**Step 3 — register two users with the same password.**

    POST /api/auth/register  { "email": "priya@college.in", "password": "Monsoon#2026x", "fullName": "Priya" }
    POST /api/auth/register  { "email": "arjun@college.in", "password": "Monsoon#2026x", "fullName": "Arjun" }

Both 201.

**Step 4 — look at the table.**

    SELECT Email, PasswordHash FROM AspNetUsers;

    priya@college.in  AQAAAAIAAYagAAAAE…(long Base64)
    arjun@college.in  AQAAAAIAAYagAAAAF…(different)

Same password, different hashes — each has its own salt. Neither contains the password.

**Step 5 — the weak password.** \`"password": "short"\` → 400 ValidationProblemDetails with entries
for \`PasswordTooShort\` and the missing character classes. The user is not created.

**Step 6 — lockout.** Five wrong passwords for Priya through \`CheckPasswordSignInAsync(…, true)\`; the
sixth attempt, even with the right password, reports \`IsLockedOut\`. \`AccessFailedCount\` and
\`LockoutEnd\` in the row show why.`,
    mcqs: [
      mcq('A JWT API registers Identity with `AddIdentity<AppUser, IdentityRole>()`. Anonymous calls to [Authorize] endpoints return 302 to /Account/Login instead of 401. Why?', [
        ['AddIdentity registers the cookie scheme as the default', true],
        ['Identity always redirects any user who is not logged in', false],
        ['[Authorize] needs a Roles value before it can return 401', false],
      ], 'AddIdentity sets up Identity\'s cookie authentication as the default scheme, and the cookie handler challenges with a redirect to the login page. AddIdentityCore plus AddJwtBearer gives an API its 401s.'),
      mcq('`await users.CreateAsync(user, "abc")` is called with the default password options. What happens?', [
        ['It throws a PasswordValidationException at once', false],
        ['It returns a failed IdentityResult listing the errors', true],
        ['It stores the user and flags the weak password at next login', false],
      ], 'UserManager validates the password and returns IdentityResult.Failed with error codes such as PasswordTooShort; nothing is saved and nothing is thrown. The caller must check Succeeded.'),
      mcq('Why does the login endpoint use `CheckPasswordSignInAsync(user, pw, lockoutOnFailure: true)` rather than `UserManager.CheckPasswordAsync`?', [
        ['It also counts failures and applies the lockout', true],
        ['CheckPasswordAsync compares passwords as plain text', false],
        ['CheckPasswordAsync is not available in .NET 8 apps', false],
      ], 'Both verify the hash. The SignInManager method also increments AccessFailedCount and locks the account after the configured number of failures, which is the brute-force protection.'),
    ],
    checkpoint: [
      ck('ASPNET_SECURITY', 'Priya and Arjun register with the same password. What is true of their PasswordHash values in AspNetUsers?', [
        ['They are identical, as both used the same password', false],
        ['They differ, because the email is part of the key', false],
        ['They differ, because each hash has its own random salt', true],
      ], 'PasswordHasher generates a random salt for every hash and stores it inside the PasswordHash string. Equal passwords therefore produce different hashes.'),
      ck('ASPNET_SECURITY', 'An attacker obtains the AspNetUsers table. What does the default .NET 8 password hashing force them to do to recover a password?', [
        ['Decrypt each hash with the app\'s data protection key', false],
        ['Guess passwords and run 100,000 PBKDF2 rounds per guess', true],
        ['Look the hashes up in a precomputed rainbow table', false],
      ], 'PBKDF2 is one-way, so the only route is guessing. The per-user salt defeats precomputed tables, and the iteration count makes every guess expensive.'),
      ck('ASPNET_SECURITY', 'The login endpoint returns "No account with that email" for unknown emails and "Wrong password" otherwise. What is the problem?', [
        ['It lets an attacker find which emails have accounts', true],
        ['It returns a 401 where a 404 would be expected', false],
        ['It skips the lockout counter on unknown emails', false],
      ], 'Different responses reveal which addresses are registered, which helps targeted guessing and phishing. Both failures should give the same 401 and message.'),
    ],
  },

  /* ── JWT_AUTH ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_SECURITY_JWT_AUTH',
    notes: `A React app or a mobile client calling CampusEvents keeps no session with the server. Each request
must carry its own proof of who sent it. A **JWT** (JSON Web Token) sent as
\`Authorization: Bearer <token>\` is the usual proof.

## What is inside a JWT

Three Base64url parts joined by dots: \`header.payload.signature\`.

    header:  {"alg":"HS256","typ":"JWT"}
    payload: {"sub":"8f1c…","email":"priya@college.in","role":"Student",
              "iss":"campusevents-api","aud":"campusevents-web","exp":1791001800}

The signature is an HMAC of the first two parts with a secret key only the server knows. Anyone can
**read** the payload (it is encoded, not encrypted); nobody without the key can **change** it without
the signature failing. So: no secrets in claims, and the key must stay secret.

## Configuration

\`appsettings.json\` holds what is not secret; the key comes from user secrets in development and an
environment variable (\`Jwt__Key\`) in production:

    "Jwt": { "Issuer": "campusevents-api", "Audience": "campusevents-web", "AccessTokenMinutes": 15 }

    public class JwtOptions
    {
        public string Issuer { get; set; } = "";
        public string Audience { get; set; } = "";
        public string Key { get; set; } = "";             // at least 32 bytes for HS256
        public int AccessTokenMinutes { get; set; } = 15;
    }

## Validating tokens: AddJwtBearer

Package: \`Microsoft.AspNetCore.Authentication.JwtBearer\`.

    var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>()
              ?? throw new InvalidOperationException("Jwt section missing");
    builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));

    builder.Services
        .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = jwt.Issuer,
                ValidateAudience = true,
                ValidAudience = jwt.Audience,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
                ClockSkew = TimeSpan.FromSeconds(30),     // default is 5 minutes
            };
        });

On each request the handler takes the token from the header, checks the signature with the key, then
issuer, audience and expiry. Success → a \`ClaimsPrincipal\` in \`HttpContext.User\`. Failure → the
request stays anonymous, and when an \`[Authorize]\` endpoint challenges, the 401 carries a header such
as \`WWW-Authenticate: Bearer error="invalid_token", error_description="The token expired at '…'"\`.
That header is the first thing to read when a token is refused.

**ClockSkew** tolerates clocks that disagree between servers. Its default of five minutes means a
15-minute token works for up to 20; shorten it.

## Issuing tokens: the login endpoint

    public class TokenService(IOptions<JwtOptions> opts, TimeProvider clock)
    {
        private readonly JwtOptions _o = opts.Value;

        public string CreateAccessToken(AppUser user, IList<string> roles)
        {
            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub, user.Id),
                new(JwtRegisteredClaimNames.Email, user.Email!),
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            };
            claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_o.Key));
            var token = new JwtSecurityToken(
                issuer: _o.Issuer,
                audience: _o.Audience,
                claims: claims,
                expires: clock.GetUtcNow().UtcDateTime.AddMinutes(_o.AccessTokenMinutes),
                signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<TokenResponse>> Login(LoginRequest req)
    {
        var user = await users.FindByEmailAsync(req.Email);
        if (user is null) return Unauthorized();
        var check = await signIn.CheckPasswordSignInAsync(user, req.Password, lockoutOnFailure: true);
        if (!check.Succeeded) return Unauthorized();

        var roles = await users.GetRolesAsync(user);
        return new TokenResponse(tokens.CreateAccessToken(user, roles), _o.AccessTokenMinutes * 60);
    }

With the default claim mapping, \`sub\` arrives as \`ClaimTypes.NameIdentifier\` and \`role\` as
\`ClaimTypes.Role\`, so \`User.FindFirstValue(ClaimTypes.NameIdentifier)\` and
\`[Authorize(Roles = "Admin")]\` work. (\`JwtSecurityTokenHandler\` is in
\`System.IdentityModel.Tokens.Jwt\`; .NET 8's bearer handler validates with the newer
\`JsonWebTokenHandler\` internally — either can issue the token.)

**The key.** HS256 needs a key of at least 256 bits — 32 random bytes. Recent versions of the
token libraries refuse a shorter one with an IDX10720 error. Generate it
(\`openssl rand -base64 32\`), store it as a secret, never commit it, and never give it a default value
in code.

## Expiry and refresh

An access token cannot be revoked: until \`exp\`, it works, even after logout or a password change.
So keep it short (5–15 minutes) and pair it with a **refresh token**:

- A random value (\`RandomNumberGenerator.GetBytes(64)\`), not a JWT, stored **hashed** in a
  \`RefreshTokens\` table with the user id, expiry (days) and a revoked flag.
- \`POST /api/auth/refresh\` with the refresh token → if it is valid, issue a new access token **and** a
  new refresh token, and revoke the old one (rotation). A reused, already-rotated refresh token signals
  theft: revoke the user's whole family of tokens.
- Logout deletes or revokes the refresh token; the access token dies within minutes.

## What a JWT does not protect

- **Confidentiality.** The payload is readable. Never put a password, Aadhaar number or anything
  private in a claim.
- **Transport.** A token sent over plain HTTP is stolen by anyone on the network. HTTPS only.
- **Theft from the browser.** A token in \`localStorage\` can be read by any script that runs on the page
  — one XSS bug hands it over. (The full-stack topic weighs this against cookies.)
- **Freshness.** Roles in the token are a snapshot at login. Demote a user and their token still says
  "Admin" until it expires — another reason for short lifetimes.
- **Authorization.** A valid token proves who the caller is, not that they may touch booking 1043.
  That is the next unit.`,
    workedExample: `**Problem.** Trace a token through the CampusEvents API from login to refusal.

**1. Login.** \`POST /api/auth/login\` with Priya's email and password. \`CheckPasswordSignInAsync\`
succeeds; \`GetRolesAsync\` returns \`["Student"]\`. The response:

    { "accessToken": "eyJhbGciOiJIUzI1NiIs…", "expiresIn": 900 }

**2. Read it.** Paste it into a JWT decoder: \`sub\`, \`email\`, \`jti\`, a \`role\` claim of \`Student\`,
\`iss\`, \`aud\`, \`exp\` = issue time + 900 s. Readable without the key — by design.

**3. Use it.**

    GET /api/bookings/mine
    Authorization: Bearer eyJhbGciOiJIUzI1NiIs…

The handler verifies signature, issuer, audience and lifetime; \`User\` now has Priya's id. **200.**

**4. Tamper with it.** Change \`"role":"Student"\` to \`"Admin"\` in the payload, re-encode, send. The
signature no longer matches → **401** with \`error="invalid_token"\` and a description about the
signature. The controller never runs.

**5. Wrong audience.** A token issued by a test environment with \`aud = "campusevents-test"\` → **401**,
\`error_description="The audience 'campusevents-test' is invalid"\`.

**6. Expiry.** Wait 15 minutes plus the 30-second skew → **401**,
\`error_description="The token expired at '…'"\`. The React app calls \`/api/auth/refresh\` and retries.

**7. No token at all** → **401** with a bare \`WWW-Authenticate: Bearer\` — no error parameter, because
nothing was sent to be wrong.`,
    mcqs: [
      mcq('A token\'s exp is 10:15:00. With `TokenValidationParameters` left at the default ClockSkew, when does the API start refusing it?', [
        ['At 10:15:00 exactly, when the exp time is reached', false],
        ['At 10:16:00, after a one-minute grace period', false],
        ['At about 10:20:00, after the five-minute default skew', true],
      ], 'ClockSkew defaults to five minutes and is added to the lifetime check, so the token keeps working until roughly five minutes after exp. Set it explicitly to something small.'),
      mcq('A 401 response carries `WWW-Authenticate: Bearer error="invalid_token", error_description="The audience \'campusevents-test\' is invalid"`. What should you fix?', [
        ['The signing key, which differs between the two apps', false],
        ['The token\'s aud or the API\'s ValidAudience setting', true],
        ['The ClockSkew, which is too short for the test server', false],
      ], 'The handler names the failed check. The token was issued for audience campusevents-test while the API expects a different ValidAudience; make the issuer\'s audience and the validator\'s agree.'),
      mcq('Why is the refresh token stored hashed in the database and rotated on every use?', [
        ['So a leaked table or a replayed old token is useless', true],
        ['Because JwtBearer can validate only hashed tokens', false],
        ['Because SQL Server cannot index random byte values', false],
      ], 'Hashing means a database leak does not yield usable refresh tokens. Rotation means each token works once; a second use of an old one reveals theft and lets you revoke the family.'),
    ],
    checkpoint: [
      ck('ASPNET_SECURITY', 'Someone base64-decodes a CampusEvents access token and reads the email and role claims. What does that show?', [
        ['The signing key has leaked and must be rotated', false],
        ['The token was issued with the wrong algorithm', false],
        ['Nothing wrong: JWT payloads are encoded, not encrypted', true],
      ], 'A signed JWT\'s payload is plain Base64url-encoded JSON. The signature prevents changes, not reading — which is why claims must never contain secrets.'),
      ck('ASPNET_SECURITY', 'An attacker edits a token\'s role claim from Student to Admin and sends it. What does AddJwtBearer with ValidateIssuerSigningKey do?', [
        ['Accepts it, as only the expiry time is part of the check', false],
        ['Rejects it with 401: the signature no longer matches', true],
        ['Accepts it as Admin, then fails the action with 403', false],
      ], 'The signature covers header and payload. Any edit invalidates it, the handler fails authentication, and the [Authorize] endpoint challenges with 401.'),
      ck('ASPNET_SECURITY', 'Priya is demoted from Organiser to Student at 10:02. Her 15-minute access token was issued at 10:00. What can she still do?', [
        ['Act as Organiser until her token expires at 10:15', true],
        ['Nothing: role changes take effect on the next call', false],
        ['Act as Organiser until she logs out of the React app', false],
      ], 'Roles in a JWT are a snapshot taken at login; the server does not re-check them per request unless you add that. Short access-token lifetimes bound the window.'),
    ],
  },

  /* ── ROLES_POLICIES ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_SECURITY_ROLES_POLICIES',
    notes: `Authentication answered **who**. Authorization answers **may they** — at three levels in
CampusEvents:

1. May this kind of user call this endpoint at all? (Only organisers create events.) — **roles**
2. Does this user meet a rule that is not just a role? (Only verified students may book.) — **policies**
3. May this user touch **this** record? (Only the student who made booking 1043 may cancel it.) —
   **resource-based** authorization

## Roles

Roles live in \`AspNetRoles\`/\`AspNetUserRoles\` (Identity) and travel in the token as role claims.

    [Authorize(Roles = "Organiser,Admin")]        // comma = either role
    [HttpPost]
    public async Task<ActionResult<EventDto>> Create(CreateEventRequest req, CancellationToken ct) { … }

    [Authorize(Roles = "Organiser")]
    [Authorize(Roles = "Admin")]                  // two attributes = BOTH roles
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id) { … }

A comma inside one attribute is **OR**; stacking attributes is **AND**. The second example is almost
always a mistake. Assign roles with \`UserManager.AddToRoleAsync\`, and put them in the token at
login (\`GetRolesAsync\`); a role not in the token does not exist as far as the API is concerned.

## Policies

Hard-coding role names on every endpoint scatters the rules. A **policy** names a rule once:

    builder.Services.AddAuthorizationBuilder()                 // .NET 7+
        .AddPolicy("ManageEvents", p => p.RequireRole("Organiser", "Admin"))
        .AddPolicy("VerifiedStudent", p => p
            .RequireRole("Student")
            .RequireClaim("email_verified", "true"));

    [Authorize(Policy = "ManageEvents")]
    [HttpPost]
    public async Task<ActionResult<EventDto>> Create(…) { … }

Within one policy every requirement must pass (AND). On a minimal API:
\`.RequireAuthorization("ManageEvents")\`. An unknown policy name fails at request time with
*"The AuthorizationPolicy named: 'ManageEvent' was not found."* — a 500, so test every policy name.

## Custom requirements

When the rule is code, write a requirement and a handler:

    public record BookingWindowRequirement(int MinHoursBefore) : IAuthorizationRequirement;

    public class BookingWindowHandler(TimeProvider clock)
        : AuthorizationHandler<BookingWindowRequirement>
    {
        protected override Task HandleRequirementAsync(
            AuthorizationHandlerContext context, BookingWindowRequirement req)
        {
            var hour = clock.GetLocalNow().Hour;
            if (hour >= 6 && hour < 23)              // bookings only between 06:00 and 23:00
                context.Succeed(req);
            return Task.CompletedTask;               // not calling Succeed = not satisfied
        }
    }

    builder.Services.AddSingleton<IAuthorizationHandler, BookingWindowHandler>();
    builder.Services.AddAuthorizationBuilder()
        .AddPolicy("BookingHours", p => p.AddRequirements(new BookingWindowRequirement(1)));

A handler that does not call \`Succeed\` leaves the requirement unmet → 403 for an authenticated user.
\`context.Fail()\` fails the policy even if another handler succeeds. **Register the handler**: an
unregistered handler never runs, so the requirement is never met and every call is 403.

## Resource-based authorization: THIS record

Two students both hold the \`Student\` role and both have valid tokens. Roles cannot tell Priya's
booking from Arjun's. The decision needs the resource, which is only known after it is loaded — so an
attribute cannot make it. Two ways:

**1. Make ownership part of the query** — the simplest and safest for "my data":

    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    var booking = await db.Bookings
        .FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId, ct);
    if (booking is null) return NotFound();       // not "403": do not confirm it exists

**2. \`IAuthorizationService\` with a resource handler** — when the rule has several cases (owner,
the event's organiser, or an admin):

    public class BookingOwnerHandler
        : AuthorizationHandler<OperationAuthorizationRequirement, Booking>
    {
        protected override Task HandleRequirementAsync(AuthorizationHandlerContext ctx,
            OperationAuthorizationRequirement req, Booking booking)
        {
            var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (booking.UserId == userId || ctx.User.IsInRole("Admin"))
                ctx.Succeed(req);
            return Task.CompletedTask;
        }
    }

    // in the controller
    var booking = await db.Bookings.FindAsync([id], ct);
    if (booking is null) return NotFound();
    var result = await auth.AuthorizeAsync(User, booking, new OperationAuthorizationRequirement { Name = "Cancel" });
    if (!result.Succeeded) return Forbid();       // or NotFound() to hide existence
    booking.Status = BookingStatus.Cancelled;
    await db.SaveChangesAsync(ct);

\`auth\` is the injected \`IAuthorizationService\`; the handler is registered as an
\`IAuthorizationHandler\` like any other.

## The rule that matters most

**Never trust an identity sent by the client.** \`?userId=7\`, a \`userId\` field in the body, an
\`X-User-Id\` header — the caller controls all of them. The user id comes from the validated token,
via \`User\`. Failing to check object ownership is the top item of the OWASP API Security Top 10
(broken object level authorization), and it is what an attacker tries first: change the number in the
URL.

And hiding a button in React is not authorization. The API is called directly with curl as easily as
from your UI.`,
    mcqs: [
      mcq('Which attribute lets a user with EITHER the Organiser or the Admin role call the action?', [
        ['[Authorize(Roles = "Organiser")] and [Authorize(Roles = "Admin")]', false],
        ['[Authorize(Policy = "Organiser|Admin")]', false],
        ['[Authorize(Roles = "Organiser,Admin")]', true],
      ], 'A comma-separated Roles value is satisfied by any one of the roles. Two separate attributes must both pass, so the user would need both roles; a policy named "Organiser|Admin" does not exist unless you register one.'),
      mcq('A custom AuthorizationHandler is written and its policy is added, but every call to the protected endpoint returns 403, even for users who meet the rule. What is the likeliest cause?', [
        ['The policy was registered before AddAuthentication', false],
        ['The handler is not registered as an IAuthorizationHandler', true],
        ['The handler returned Task.CompletedTask at the end', false],
      ], 'Handlers are found through DI. If BookingWindowHandler is never registered, nothing ever calls Succeed on the requirement, so the policy always fails and authenticated users get 403.'),
      mcq('Priya cancels booking 1043 by calling DELETE /api/bookings/1043, and the API loads `db.Bookings.FindAsync([id])` and deletes it. She has the Student role and a valid token. What is missing?', [
        ['A check that booking 1043 belongs to the caller', true],
        ['A [Authorize(Roles = "Student")] on the delete action', false],
        ['A longer signing key so that the token is trusted', false],
      ], 'Any student holds the same role and a valid token. Without comparing the booking\'s UserId to the id in the token, any logged-in student can cancel anyone\'s booking by changing the number.'),
    ],
    checkpoint: [
      ck('ASPNET_SECURITY', 'An endpoint has `[Authorize(Policy = "ManageEvent")]`, but the policy was registered as "ManageEvents". What happens when it is called?', [
        ['Authorization is skipped and every caller gets 200', false],
        ['Every caller gets 403, because no policy can succeed', false],
        ['It fails with a 500: the named policy was not found', true],
      ], 'Resolving an unknown policy throws InvalidOperationException ("The AuthorizationPolicy named: \'ManageEvent\' was not found."), which surfaces as a 500. Policy names deserve constants and a test.'),
      ck('ASPNET_SECURITY', 'Arjun sends DELETE /api/bookings/1043 with `X-User-Id: 41` (Priya\'s id), and the API compares that header to the booking\'s UserId. What is wrong?', [
        ['The header name must start with Authorization-', false],
        ['The caller controls the header, not the token', true],
        ['The comparison should use a case-insensitive match', false],
      ], 'Anything in the request apart from the validated token is chosen by the caller. The id must come from User (the token\'s sub claim), never from a header, query or body.'),
      ck('ASPNET_SECURITY', 'Why can `[Authorize]` attributes alone not decide "only the booking\'s owner may cancel it"?', [
        ['Attributes run before the booking is loaded', true],
        ['Attributes cannot read any claims of the user', false],
        ['Attributes work for minimal APIs only in .NET 8', false],
      ], 'Attribute and policy checks run before the action and know only the user and the endpoint. Ownership needs the record, so it is checked in the query or with IAuthorizationService after loading.'),
    ],
  },

  /* ── DEBUGGING ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_SECURITY_DEBUGGING',
    notes: `Security failures arrive as a bare status code: the request is refused before your action runs, so
there is no stack trace of yours. Start every case with three facts: **the status (401, 403, 302 or
500), the method and path, and whether a token was sent.** Then read the response headers — for JWT
bearer, \`WWW-Authenticate\` usually names the failed check — and, in development only, raise the log
level:

    "Logging": { "LogLevel": {
      "Microsoft.AspNetCore.Authentication": "Debug",
      "Microsoft.AspNetCore.Authorization": "Debug" } }

## 1. Every protected call is 401, even with a fresh token

**Cause:** \`app.UseAuthorization()\` comes before \`app.UseAuthentication()\`, so authorization sees an
anonymous \`User\`. A second cause with the same symptom: \`UseAuthentication\` is missing and the app
targets a version before .NET 7, where nothing adds it for you. **Fix:** \`UseAuthentication()\` then
\`UseAuthorization()\`, after \`UseCors\` and before \`MapControllers\`.

## 2. 302 Found to /Account/Login?ReturnUrl=…

The React app gets an HTML login page instead of a 401. **Cause:** \`AddIdentity<AppUser, IdentityRole>()\`
registered Identity's cookie scheme and made it the default, so challenges redirect. **Fix:**
\`AddIdentityCore<AppUser>()\` with \`AddAuthentication(JwtBearerDefaults.AuthenticationScheme)\`, or set
the default authenticate and challenge schemes to JWT bearer explicitly.

## 3. 401 with error_description about the audience or issuer

\`WWW-Authenticate: Bearer error="invalid_token", error_description="The audience 'campusevents-web' is
invalid"\`. **Cause:** the login endpoint issues \`aud = Jwt:Audience\` from one configuration file,
while validation reads a different value — commonly a typo in \`appsettings.Production.json\`, or a
token from another environment. **Fix:** issue and validate from the same \`JwtOptions\`.

## 4. 401, "The signature key was not found" / signature invalid

**Cause:** the API that validates has a different \`Jwt:Key\` from the one that signed — two instances
with different environment variables, or a key regenerated on each start
(\`Guid.NewGuid().ToString()\` as a fallback). Every restart logs everyone out. **Fix:** one key, from
one secret store, shared by every instance; no generated fallback.

## 5. The API will not start: the key

An \`ArgumentNullException\` from \`Encoding.UTF8.GetBytes\` — \`Jwt:Key\` is not set in this
environment. Or, when the first token is signed, an **IDX10720** error saying the key is too short for
HS256 — someone used \`"secret123"\`. **Fix:** set \`Jwt__Key\` to 32+ random bytes in Base64; fail at
startup with a clear message when it is missing.

## 6. The admin gets 403

\`[Authorize(Roles = "Admin")]\` refuses the admin. **Cause:** the login endpoint never added role
claims (no \`GetRolesAsync\`), so the token has none; or the role was assigned after the token was
issued. Decode the token: no \`role\` claim, no admin. **Fix:** add the roles at login, and log in again
after changing a role.

## 7. A logged-out token still works

**Symptom:** after "logout" the old access token keeps working for minutes — even past its \`exp\`.
**Causes:** logout only removed the token in the browser (a JWT cannot be revoked by itself), and the
default \`ClockSkew\` adds five minutes after \`exp\`. **Fix:** short access tokens, \`ClockSkew\` of
seconds, and a revocable refresh token.

## 8. 500: "The AuthorizationPolicy named: 'ManageEvent' was not found."

**Cause:** a policy name typo in \`[Authorize(Policy = …)]\`. **Fix:** declare policy names as constants
(\`Policies.ManageEvents\`) and use them in both places.

## 9. Every call to a policy-protected endpoint is 403

**Cause:** the custom \`AuthorizationHandler\` was never registered with
\`AddSingleton<IAuthorizationHandler, …>()\` (or \`AddScoped\` if it takes scoped services), so its
requirement is never satisfied. **Fix:** register it; a breakpoint in \`HandleRequirementAsync\` that is
never hit is the giveaway.`,
    mcqs: [
      mcq('The React app\'s fetch to an [Authorize] endpoint without a token gets 302 Found with Location /Account/Login?ReturnUrl=%2Fapi%2Fbookings. What is the cause?', [
        ['The JwtBearer handler redirects anonymous users', false],
        ['[ApiController] converts each 401 into a redirect', false],
        ['UseHttpsRedirection rewrites the 401 into a 302', false],
        ['Identity\'s cookie scheme is the default challenge', true],
      ], 'AddIdentity registers Identity\'s application cookie and makes it the default scheme; the cookie handler challenges by redirecting to its login path. A JWT API should use AddIdentityCore and JWT bearer as the default.'),
      mcq('After every deployment, all users are logged out: their tokens get 401 with a signature error. Program.cs has `Key = config["Jwt:Key"] ?? Guid.NewGuid().ToString()`. Why?', [
        ['A Guid string is never a valid HS256 key in .NET 8 apps', false],
        ['Deployments clear the browser\'s local storage', false],
        ['Each start invents a new key when Jwt:Key is unset', true],
      ], 'Without the setting, every process start generates a different key, so tokens signed before the restart fail signature validation. A missing key should stop startup, not be replaced.'),
      mcq('An Admin\'s token is accepted (User is authenticated) but `[Authorize(Roles = "Admin")]` returns 403. Decoding the token shows sub, email and exp only. What is the fix?', [
        ['Add the user\'s roles as claims when issuing the token', true],
        ['Set ValidateAudience to false on the JWT bearer handler', false],
        ['Replace [Authorize(Roles)] with [AllowAnonymous]', false],
      ], 'Role checks read role claims from the principal, which come from the token. With no role claim the user has no roles as far as the API knows. Add GetRolesAsync results at login.'),
      mcq('An [Authorize] endpoint returns 401 for a valid token from the API\'s own login, and the debug log shows the authorization middleware ran before authentication. Which line order fixes it?', [
        ['app.UseAuthorization(); app.UseAuthentication(); app.UseCors("frontend");', false],
        ['app.UseAuthentication(); app.MapControllers(); app.UseAuthorization();', false],
        ['app.UseCors("frontend"); app.UseAuthentication(); app.UseAuthorization();', true],
      ], 'Authentication must populate HttpContext.User before authorization evaluates it, and both must precede the mapped endpoints; CORS goes before both.'),
    ],
  },

  /* ── PRACTICE ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_SECURITY_PRACTICE',
    notes: `Secure your CampusEvents API from the data topic. Use curl, Postman or a \`.http\` file, and write the
status code you expect **before** sending each request.

## Exercise 1 — The pipeline and the fallback policy

Add \`AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(…)\` and a fallback policy
requiring an authenticated user. Put \`UseCors\`, \`UseAuthentication\`, \`UseAuthorization\` in the right
order. Mark \`GET /api/events\`, \`GET /api/events/{id}\` and the health check \`[AllowAnonymous]\`. Check:
\`GET /api/events\` → 200 anonymous; \`GET /api/bookings/mine\` → 401. Then swap the two auth lines and
watch a valid token get 401 (after Exercise 3); swap them back.

## Exercise 2 — Identity users

Switch the context to \`IdentityDbContext<AppUser>\`, add a migration, register \`AddIdentityCore\` with a
10-character minimum and unique emails, and seed the roles \`Student\`, \`Organiser\`, \`Admin\` plus one
admin user (password from user secrets, not code). Add \`POST /api/auth/register\` that always assigns
\`Student\` and returns 400 ValidationProblemDetails with Identity's error codes for a weak password.
Register two users with the same password and compare their \`PasswordHash\` values.

## Exercise 3 — Login and JWT

Add \`JwtOptions\`, a \`TokenService\` and \`POST /api/auth/login\` using \`CheckPasswordSignInAsync\` with
lockout. Set \`Jwt:Key\` with \`dotnet user-secrets\` (32 random bytes, Base64). Set \`ClockSkew\` to 30
seconds and \`AccessTokenMinutes\` to 1. Send four requests to \`GET /api/bookings/mine\`: no header, a
garbage token, a token with one payload character changed, and an expired one. All four must be 401;
read the \`WWW-Authenticate\` header of each.

## Exercise 4 — Roles and policies

Create a \`ManageEvents\` policy (Organiser or Admin) and put it on create, update and delete of
events. Keep policy names in a static \`Policies\` class. As a student, \`POST /api/events\` → 403; as an
organiser → 201. Then misspell the policy name on one action and record exactly what the client and the
log show.

## Exercise 5 — Ownership

Make \`GET /api/bookings/{id}\` and \`DELETE /api/bookings/{id}\` filter by the caller's id from
\`User.FindFirstValue(ClaimTypes.NameIdentifier)\`. As Arjun, request Priya's booking: 404. Then add a
\`BookingOwnerHandler\` so an Admin may also cancel any booking, using \`IAuthorizationService\`.

## Exercise 6 — Refresh tokens

Add a \`RefreshTokens\` table (user id, token **hash**, expiry, revoked-at, replaced-by). Return a
refresh token at login, rotate it in \`POST /api/auth/refresh\`, and revoke it in
\`POST /api/auth/logout\`. Use an old refresh token a second time and make the API revoke all of that
user's refresh tokens.`,
    mcqs: [
      mcq('In Exercise 3, which response is correct for `Authorization: Bearer garbage` on GET /api/bookings/mine?', [
        ['400 Bad Request, because the header value is malformed text', false],
        ['401 with WWW-Authenticate: Bearer error="invalid_token"', true],
        ['500, since the handler cannot parse the token at all', false],
      ], 'A token that cannot be read is a failed authentication. The handler leaves the request anonymous, [Authorize] challenges, and the bearer challenge reports invalid_token.'),
      mcq('In Exercise 1, which endpoint does the fallback policy protect?', [
        ['A controller with no authorization attributes at all', true],
        ['An action with [Authorize(Roles = "Admin")] on it', false],
        ['A controller marked [AllowAnonymous] on the class', false],
      ], 'The fallback policy is used only when an endpoint has no authorization metadata. [AllowAnonymous] opts out, and an [Authorize] attribute supplies its own requirements.'),
      mcq('In Exercise 2, why does register always assign Student instead of a role from the request body?', [
        ['Identity throws if a role is passed in a request DTO', false],
        ['AddToRoleAsync accepts only the first role it finds', false],
        ['A caller could otherwise register as an Admin', true],
      ], 'Any value in the body is chosen by the caller. Letting the request pick a role is privilege escalation in one field; roles beyond the default are granted by an admin.'),
      mcq('In Exercise 4 you misspell the policy name on one action. What does the client receive when calling it?', [
        ['403 Forbidden, as no user can satisfy a missing policy', false],
        ['500, from an exception that the policy was not found', true],
        ['200 OK, since an unknown policy is treated as none', false],
      ], 'The authorization policy provider throws InvalidOperationException for an unknown name, so the request fails with 500 and the log names the missing policy.'),
      mcq('In Exercise 6, an old refresh token is presented a second time after it was rotated. Why revoke all of the user\'s refresh tokens?', [
        ['Reuse means a copy was stolen, and it is unclear which', true],
        ['Rotated tokens use up the database\'s identity column values', false],
        ['JwtBearer validates the refresh table on every call', false],
      ], 'A rotated token should never return. Its reuse means either the user or an attacker holds a copy; revoking the whole family forces a fresh login and cuts the attacker off.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_SECURITY_INTERVIEW_QUESTION',
    notes: `"ASP.NET Core Web API with JWT authentication" is on most .NET fresher resumes, so interviewers test
whether you built it or copied it. These three questions come up most.

## Q1. "Explain how authentication and authorization work in your ASP.NET Core API."

**Strong answer.** "Users are in SQL Server through ASP.NET Core Identity on EF Core; I register it with
\`AddIdentityCore\` so no cookie scheme is added. Passwords are hashed by Identity's \`PasswordHasher\` —
PBKDF2 with a per-user salt. \`POST /api/auth/login\` checks the password with
\`SignInManager.CheckPasswordSignInAsync\` with lockout on, then issues a JWT signed with HS256: the user
id as \`sub\`, roles as role claims, fifteen-minute expiry, issuer and audience set, key from an
environment variable. On every other request the JWT bearer handler — \`AddJwtBearer\` with
\`TokenValidationParameters\` — validates signature, issuer, audience and lifetime and sets
\`HttpContext.User\`. Then the authorization middleware checks \`[Authorize]\`, roles and policies. In
\`Program.cs\` the order is \`UseCors\`, \`UseAuthentication\`, \`UseAuthorization\`, and a fallback policy
makes every endpoint require login unless it says \`[AllowAnonymous]\`."

**Follow-up:** "What happens when the token has expired?" — the handler fails authentication, the
\`[Authorize]\` endpoint challenges, the client gets 401 with \`error="invalid_token"\` and a description
saying it expired; the client refreshes and retries. And know \`ClockSkew\`: five minutes by default.

## Q2. "What is the difference between 401 and 403 in ASP.NET Core, and where do they come from?"

**Strong answer.** "401 means the API does not know who you are: no token, or one that failed
validation. It comes from a **challenge** on the authentication scheme; for JWT bearer it carries a
\`WWW-Authenticate: Bearer\` header. 403 means the API knows exactly who you are and you are not allowed:
the user is authenticated but fails a role, policy or resource check — a **forbid**. If an admin gets 403
I decode the token and check the role claims first, then the policy and its handler registration."

**Follow-up:** "When would you return 404 instead of 403?" — for someone else's record: a 403 confirms
that booking 1043 exists; to the caller it should look like any id that does not.

## Q3. "How do you stop one user from reading or changing another user's data?"

**Strong answer.** "Roles cannot do it — every student has the same role and a valid token. So every
query for user-owned data includes the caller's id from the token:
\`Where(b => b.Id == id && b.UserId == userId)\` with \`userId\` from
\`User.FindFirstValue(ClaimTypes.NameIdentifier)\`. Where the rule is richer — the owner, the event's
organiser, or an admin — I use resource-based authorization: load the record, call
\`IAuthorizationService.AuthorizeAsync(User, booking, requirement)\` with a handler that knows the rules.
I never trust a user id from the URL, body or a header. This is broken object level authorization, the
first item in the OWASP API Security Top 10."

**Follow-up:** "The frontend hides the cancel button for other users' bookings. Isn't that enough?" —
no; anyone can call the API with curl. The UI is convenience, the API is the boundary.

## How you are judged

Naming the real pieces (\`AddJwtBearer\`, \`TokenValidationParameters\`, \`UserManager\`,
\`IAuthorizationService\`, the fallback policy) shows you built it. Volunteering that a JWT cannot be
revoked, that its payload is readable, and that \`ClockSkew\` exists shows you understood it. Saying
"the password is encrypted in the database" ends the conversation badly — it is hashed.`,
    mcqs: [
      mcq('The interviewer asks, "Is the user\'s password encrypted in your database?" Which answer is correct for ASP.NET Core Identity?', [
        ['Yes, with AES, so that it can be shown to the admin', false],
        ['Yes, by SQL Server Transparent Data Encryption', false],
        ['No, it is hashed with PBKDF2 and a per-user salt', true],
      ], 'Identity stores a one-way PBKDF2 hash with a random salt; there is no key that turns it back into the password. TDE encrypts files at rest, which is a different and unrelated layer.'),
      mcq('Asked "Your admin gets 403 on an [Authorize(Roles = "Admin")] endpoint — where do you look first?", which answer is best?', [
        ['Whether the JWT signing key is long enough for HS256', false],
        ['Whether the token actually carries the Admin role claim', true],
        ['Whether UseHttpsRedirection runs before UseRouting', false],
      ], 'A 403 means authentication succeeded, so the key and signature are fine. Role checks read claims from the token, so decode it and confirm the role claim is there.'),
      mcq('Follow-up: "Why do you call AddIdentityCore rather than AddIdentity in a JWT API?"', [
        ['AddIdentity adds a default cookie scheme that redirects', true],
        ['AddIdentity does not include the UserManager service', false],
        ['AddIdentityCore hashes passwords more strongly', false],
      ], 'AddIdentity is built for cookie-based apps and makes Identity\'s cookie the default scheme, turning API challenges into login redirects. Both use the same UserManager and password hasher.'),
    ],
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_SECURITY_CHECKPOINT',
    notes: `Ten questions across the topic: the authentication and authorization middleware, Identity and
password storage, issuing and validating JWTs, roles, policies and per-record checks. Most show a line
of configuration or a request. Predict the status code before you read the options.`,
    checkpoint: [
      ck('ASPNET_SECURITY', `With only these lines, which endpoints need an authenticated user?

    builder.Services.AddAuthorization(o =>
        o.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());`, [
        ['Only those marked with a plain [Authorize] attribute', false],
        ['None, until a DefaultPolicy is configured as well', false],
        ['Every endpoint that does not say [AllowAnonymous]', true],
      ], 'The fallback policy covers endpoints with no authorization metadata, and [Authorize] endpoints already need a user through the default policy. Only [AllowAnonymous] opts out.'),
      ck('AUTHENTICATION', 'A request carries `Authorization: Bearer <token>` whose exp passed ten minutes ago, and ClockSkew is 30 seconds. What does the client get from an [Authorize] endpoint?', [
        ['403, because the user is known but the token is old', false],
        ['401, with an invalid_token error saying it expired', true],
        ['200, because the signature is still a valid one', false],
      ], 'Lifetime validation fails, so authentication fails and the endpoint challenges with 401. The bearer challenge reports invalid_token with an expiry description.'),
      ck('AUTHENTICATION', 'Which `TokenValidationParameters` setting is the one that makes a token signed with a different key fail?', [
        ['IssuerSigningKey, the key the handler verifies with', true],
        ['ValidateAudience = true with ValidAudience', false],
        ['ValidateLifetime = true with ClockSkew set', false],
      ], 'The handler verifies the signature with IssuerSigningKey; a token signed with any other key fails. Lifetime and audience checks look at claims that an attacker with a different key could set to anything.'),
      ck('AUTHENTICATION', 'Why must the HS256 key in Jwt:Key be at least 32 random bytes?', [
        ['The token payload is encrypted with the key\'s length', false],
        ['SQL Server cannot store shorter keys in user secrets', false],
        ['A short key can be brute-forced, and libraries refuse it', true],
      ], 'HMAC-SHA256 needs a 256-bit key for its full strength; a short or guessable key lets an attacker forge tokens offline. Recent Microsoft.IdentityModel versions reject keys under 256 bits (IDX10720).'),
      ck('ASPNET_SECURITY', 'What does `PasswordHasher<AppUser>` store in AspNetUsers.PasswordHash in .NET 8?', [
        ['The password encrypted with the Data Protection key', false],
        ['A format marker, salt, iteration count and PBKDF2 key', true],
        ['A SHA-256 digest of the password joined to the user\'s email', false],
      ], 'The PasswordHash string bundles the format version, PRF, iteration count, salt and derived subkey, so verification can recompute with the same parameters. Nothing in it can be decrypted.'),
      ck('AUTHORIZATION', 'An action has `[Authorize(Roles = "Organiser")]` and `[Authorize(Roles = "Admin")]` as two separate attributes. Who may call it?', [
        ['Only users who hold both Organiser and Admin roles', true],
        ['Users who have either the Organiser or the Admin role', false],
        ['Only users with Admin, as the last attribute wins', false],
      ], 'Each [Authorize] attribute adds its own requirement and all must pass, so two attributes means AND. A comma inside one Roles value means OR.'),
      ck('AUTHORIZATION', `Priya (a Student) calls DELETE /api/bookings/77, which belongs to Arjun. What happens?

    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    var b = await db.Bookings.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
    if (b is null) return NotFound();`, [
        ['403, because the booking belongs to another user', false],
        ['204, since Priya has a valid token and the Student role', false],
        ['404, exactly as for a booking id that does not exist', true],
      ], 'The query includes the caller\'s id, so Arjun\'s booking is simply not found for Priya. Returning 404 avoids confirming that booking 77 exists.'),
      ck('AUTHORIZATION', `What does an authenticated Student get from this policy-protected action when this handler is the only one for the requirement?

    protected override Task HandleRequirementAsync(AuthorizationHandlerContext ctx, ManageEventsRequirement req)
    {
        if (ctx.User.IsInRole("Organiser")) ctx.Succeed(req);
        return Task.CompletedTask;
    }`, [
        ['200, because the handler did not call ctx.Fail()', false],
        ['403, because no handler marked it as succeeded', true],
        ['401, because the requirement was not satisfied', false],
      ], 'A requirement is met only if some handler calls Succeed. Here none does, so the policy fails; the user is authenticated, so the result is Forbid, a 403.'),
      ck('AUTHORIZATION', 'The cancel endpoint must allow the booking\'s owner, the event\'s organiser, or an Admin. Which approach fits?', [
        ['IAuthorizationService.AuthorizeAsync with a resource handler', true],
        ['[Authorize(Roles = "Student,Organiser,Admin")] on the action', false],
        ['A userId field in the request body checked by the action', false],
      ], 'The decision depends on the booking itself, so it is made after loading it, by a resource handler that sees User and the booking. A role list cannot tell one student\'s booking from another\'s.'),
      ck('AUTHENTICATION', 'Why must the login endpoint give the same 401 for an unknown email and for a wrong password, while lockout stays on?', [
        ['Because a 404 would break the React login screen', false],
        ['Because UserManager cannot tell the two cases apart', false],
        ['So it does not reveal which emails have an account', true],
      ], 'Distinct answers let an attacker enumerate registered emails and then target them. One generic 401 for both failures gives nothing away, and lockout limits the guesses.'),
    ],
  },
];
