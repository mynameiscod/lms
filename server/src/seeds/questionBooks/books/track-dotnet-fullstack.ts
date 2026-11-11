import { SeedBook } from '../types';

/**
 * .NET Full Stack + AI track: the technical questions a fresher applying for a
 * .NET full-stack role is asked. C# 12 / .NET 8, ASP.NET Core Web API, EF Core,
 * SQL Server, React.
 */
const book: SeedBook = {
  slug: 'track-dotnet-fullstack',
  title: '.NET Full Stack + AI Interview Questions',
  kind: 'topic',
  subject: '.NET Full Stack + AI',
  description: `40 .NET full-stack interview questions: C# and DSA, SQL Server, ADO.NET and EF Core, ASP.NET Core Web API on .NET 8, React integration, deployment, GenAI and agents, and scenarios.`,
  color: '#7c3aed',
  emblem: '🟣',
  audience: 'careerpilot',
  stages: ['specialize', 'placement'],
  tracks: ['DOTNET_FULLSTACK_AI'],
  order: 202,
  chapters: [
    {
      title: `Core C# and DSA in C#`,
      questions: [
        {
          q: `What is the difference between value types and reference types in C#? When would you use a struct instead of a class?`,
          a: `- **Value types** (\`int\`, \`double\`, \`bool\`, \`DateTime\`, enums, \`struct\`s) hold their data directly. Assigning one copies the whole value.
- **Reference types** (\`class\`, \`string\`, arrays, delegates, \`record class\`) hold a reference to an object on the managed heap. Assigning copies the reference, so both variables point to the same object.

\`\`\`csharp
struct PointS { public int X; }
class  PointC { public int X; }

var a = new PointS { X = 1 }; var b = a; b.X = 9;   // a.X is still 1
var c = new PointC { X = 1 }; var d = c; d.X = 9;   // c.X is now 9
\`\`\`

Local value types often live on the stack, but that is an implementation detail — a struct field inside a class lives on the heap with the object.

**Use a struct** for small, immutable values that behave like a single number: coordinates, money amounts, a date range. Keep it small (roughly 16 bytes or less) because it is copied on every assignment. Use a **class** for entities, services and anything with identity or many fields.

Boxing — converting a value type to \`object\` — allocates on the heap; avoid it in hot loops.`,
          d: 'easy',
          at: 'TCS, Infosys, Accenture, Cognizant',
        },
        {
          q: `What is the difference between an interface and an abstract class in C#?`,
          a: `| | Interface | Abstract class |
|---|---|---|
| Purpose | A contract: "can do" | A partial base: "is a" |
| Inheritance | A class can implement **many** | A class can inherit **one** |
| State (fields) | No instance fields | Can have fields |
| Constructors | No | Yes |
| Members | Public by default; since C# 8 can have default implementations | Any access modifier, abstract and concrete members |

\`\`\`csharp
public interface IPaymentGateway
{
    Task<bool> ChargeAsync(decimal amount);
}

public abstract class Notification
{
    protected string Recipient { get; }
    protected Notification(string recipient) => Recipient = recipient;
    public abstract Task SendAsync(string message);
    public void Log() => Console.WriteLine("Sent to " + Recipient);
}
\`\`\`

In ASP.NET Core, **interfaces** are everywhere because of dependency injection: controllers depend on \`IOrderService\`, and you register the implementation in \`Program.cs\`. That makes swapping implementations and mocking in unit tests easy. Use an abstract class when several related classes share real code and state.`,
          d: 'easy',
          at: 'Service companies, product companies',
        },
        {
          q: `What is LINQ? Explain deferred execution with an example.`,
          a: `**LINQ (Language Integrated Query)** lets you query collections, databases and XML with the same C# syntax — \`Where\`, \`Select\`, \`OrderBy\`, \`GroupBy\`, \`Join\`.

\`\`\`csharp
var orders = new List<Order> { /* ... */ };

var topCustomers = orders
    .GroupBy(o => o.Customer)
    .Select(g => new { Customer = g.Key, Total = g.Sum(o => o.Amount) })
    .OrderByDescending(x => x.Total)
    .Take(3)
    .ToList();
\`\`\`

**Deferred execution:** most LINQ operators do not run when you write them; they build a query that runs when you **enumerate** it (\`foreach\`, \`ToList()\`, \`Count()\`, \`First()\`).

\`\`\`csharp
var nums = new List<int> { 1, 2, 3 };
var evens = nums.Where(n => n % 2 == 0);   // nothing runs yet
nums.Add(4);
Console.WriteLine(evens.Count());          // 2 — sees the 4 added later
\`\`\`

Consequences: enumerating the same query twice runs it twice (for EF Core, two database calls), so call \`ToList()\` once if you reuse results. Operators like \`ToList\`, \`ToArray\`, \`Count\`, \`Sum\` and \`First\` execute **immediately**.`,
          d: 'medium',
          at: 'Service companies, product companies',
        },
        {
          q: `How do async and await work in C#? Why should you never use .Result or .Wait() in ASP.NET Core?`,
          a: `\`async\`/\`await\` lets a method wait for I/O (database, HTTP, files) **without blocking a thread**. When the code hits \`await\` on an unfinished \`Task\`, the method returns to its caller and the thread goes back to the pool to serve other requests. When the I/O completes, the rest of the method continues.

\`\`\`csharp
public async Task<OrderDto?> GetOrderAsync(int id)
{
    var order = await _db.Orders.FindAsync(id);          // thread is freed here
    if (order is null) return null;
    var tracking = await _http.GetStringAsync("tracking/" + id);
    return new OrderDto(order.Id, order.Status, tracking);
}
\`\`\`

**Why not \`.Result\` / \`.Wait()\`:**
- they **block** the thread while waiting, so under load the thread pool runs out (thread-pool starvation) and the API slows down for everyone;
- in older ASP.NET and UI apps with a synchronization context they cause **deadlocks**;
- exceptions arrive wrapped in \`AggregateException\`.

Rules: "async all the way" from controller to database; return \`Task\`/\`Task<T>\` (avoid \`async void\` except event handlers); pass \`CancellationToken\` down; use \`Task.WhenAll\` to run independent calls in parallel; \`async\` does not make CPU-bound work faster.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Say "await frees the thread, it does not create one". It clears up the most common async misunderstanding.`,
        },
        {
          q: `What is the difference between IEnumerable and IQueryable?`,
          a: `- **\`IEnumerable<T>\`** works on objects **in memory**. LINQ operators take delegates (\`Func<T,bool>\`) and run in your application.
- **\`IQueryable<T>\`** represents a query against a data source such as a database. Operators take **expression trees** (\`Expression<Func<T,bool>>\`), which a provider like **EF Core translates into SQL**.

\`\`\`csharp
// IQueryable: filter, sort and paging become SQL -> only 20 rows come back
var page = await _db.Products
    .Where(p => p.Price < 500)
    .OrderBy(p => p.Name)
    .Skip(0).Take(20)
    .ToListAsync();

// IEnumerable: AsEnumerable() switches to memory -> all products are loaded first
var slow = _db.Products.AsEnumerable()
    .Where(p => p.Price < 500)
    .ToList();
\`\`\`

The classic bug: a repository method returns \`IEnumerable<Product>\` (or calls \`ToList()\`) too early, and later filtering happens in memory after reading the whole table.

Guideline: keep queries as \`IQueryable\` until the final \`ToListAsync()\`, but do not leak \`IQueryable\` out of the data layer carelessly — callers could build unexpected, slow queries.`,
          d: 'medium',
        },
        {
          q: `How does garbage collection work in .NET? What is IDisposable and the using statement for?`,
          a: `The **garbage collector (GC)** frees managed memory automatically. It divides the heap into **generations**:
- **Gen 0** — new objects; collected often and cheaply.
- **Gen 1** — survived one collection; a buffer.
- **Gen 2** — long-lived objects (caches, singletons); collected rarely.
Large objects (85,000 bytes or more) go to the Large Object Heap. Most objects die young, so this design is efficient.

The GC handles **memory**, but not **unmanaged resources**: database connections, file handles, sockets. Classes holding those implement **\`IDisposable\`** with a \`Dispose()\` method that releases them right away instead of waiting for the GC.

\`\`\`csharp
using var connection = new SqlConnection(connectionString);   // C# 8 using declaration
await connection.OpenAsync();
// ... use it
// Dispose() runs automatically at the end of the scope, even after an exception
\`\`\`

The older block form \`using (var x = ...) { }\` does the same. For async resources there is \`IAsyncDisposable\` with \`await using\`.

In ASP.NET Core, the DI container disposes scoped and transient services it created (like \`DbContext\`) at the end of the request. A known trap: creating \`new HttpClient()\` per request exhausts sockets — use \`IHttpClientFactory\` instead.`,
          d: 'medium',
        },
        {
          q: `What are nullable reference types, the ?. and ?? operators, and records in modern C#?`,
          a: `**Nullable reference types** (C# 8, on by default in new .NET projects) make the compiler warn about possible \`NullReferenceException\`s. \`string\` means "should never be null"; \`string?\` means "may be null".

\`\`\`csharp
public class Customer
{
    public string Name { get; set; } = "";
    public string? Phone { get; set; }        // optional
}

int? length = customer.Phone?.Length;          // ?.  null if Phone is null
string phone = customer.Phone ?? "Not given";   // ??  fallback value
customer.Phone ??= "N/A";                      // ??= assign if null
\`\`\`

**Records** (C# 9) are types designed for data, with **value-based equality** and concise syntax:

\`\`\`csharp
public record ProductDto(int Id, string Name, decimal Price);

var a = new ProductDto(1, "Pen", 20m);
var b = a with { Price = 25m };      // non-destructive copy
Console.WriteLine(a == new ProductDto(1, "Pen", 20m));   // True
\`\`\`

Records are ideal for API request/response DTOs. Use regular classes for EF Core entities, because EF tracks entities by identity and changes their properties.`,
          d: 'easy',
        },
        {
          q: `Find the first non-repeating character in a string in C#. Compare List, Dictionary and HashSet lookups.`,
          a: `Count characters in a \`Dictionary\`, then scan the string again and return the first character with count 1.

\`\`\`csharp
static char? FirstUnique(string s)
{
    var counts = new Dictionary<char, int>();
    foreach (char c in s)
        counts[c] = counts.TryGetValue(c, out int n) ? n + 1 : 1;

    foreach (char c in s)
        if (counts[c] == 1) return c;

    return null;
}

Console.WriteLine(FirstUnique("swiss"));   // w
\`\`\`

Time **O(n)**, space O(k) for k distinct characters. (A nested-loop solution is O(n²).)

**Lookup costs:**
| Collection | \`Contains\` / find by key | Use it for |
|---|---|---|
| \`List<T>\` | O(n) — scans | Ordered items, index access O(1) |
| \`Dictionary<TKey,TValue>\` | O(1) average | Key → value mapping, counting |
| \`HashSet<T>\` | O(1) average | Uniqueness, "seen before?" checks |
| \`SortedDictionary\` | O(log n) | Keys kept in order |

Hash-based collections need good \`GetHashCode\`/\`Equals\` on keys — records and built-in types already provide them.`,
          d: 'medium',
          at: 'Amazon, Microsoft, product companies',
        },
      ],
    },
    {
      title: `SQL Server, ADO.NET and Entity Framework Core`,
      questions: [
        {
          q: `What are the main ADO.NET classes? Show a safe parameterised query against SQL Server.`,
          a: `ADO.NET is the low-level data access layer that EF Core itself is built on. For SQL Server, using the \`Microsoft.Data.SqlClient\` package:
- **SqlConnection** — opens the connection (pooled automatically).
- **SqlCommand** — the SQL text or stored procedure, with parameters.
- **SqlDataReader** — fast, forward-only, read-only stream of rows.
- **SqlDataAdapter / DataSet / DataTable** — disconnected, in-memory tables (older style).

\`\`\`csharp
const string sql = "SELECT Id, Name, Price FROM Products WHERE CategoryId = @categoryId";

await using var conn = new SqlConnection(connectionString);
await using var cmd = new SqlCommand(sql, conn);
cmd.Parameters.Add("@categoryId", SqlDbType.Int).Value = categoryId;

await conn.OpenAsync();
await using var reader = await cmd.ExecuteReaderAsync();
while (await reader.ReadAsync())
{
    Console.WriteLine(reader.GetInt32(0) + " " + reader.GetString(1) + " " + reader.GetDecimal(2));
}
\`\`\`

Other methods: \`ExecuteNonQuery\` (INSERT/UPDATE/DELETE, returns rows affected) and \`ExecuteScalar\` (single value). **Parameters prevent SQL injection** — never concatenate user input into SQL. Lightweight libraries like **Dapper** add object mapping on top of ADO.NET.`,
          d: 'easy',
          at: 'TCS, Infosys, Wipro, Cognizant',
        },
        {
          q: `What is Entity Framework Core? Explain code-first vs database-first and migrations.`,
          a: `**EF Core** is Microsoft's ORM for .NET. You work with C# classes (entities) and a \`DbContext\`; EF Core generates SQL, tracks changes and maps results back to objects. It supports SQL Server, PostgreSQL, MySQL, SQLite and others through providers.

**Code-first:** write entity classes and the \`DbContext\`; EF Core creates and evolves the database through **migrations**. Most new projects use this.

**Database-first:** the database already exists; you **scaffold** classes from it:
\`\`\`bash
dotnet ef dbcontext scaffold "<connection string>" Microsoft.EntityFrameworkCore.SqlServer -o Models
\`\`\`

\`\`\`csharp
public class ShopContext(DbContextOptions<ShopContext> options) : DbContext(options)
{
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Category> Categories => Set<Category>();
}
\`\`\`

**Migrations** (needs the \`dotnet-ef\` tool and \`Microsoft.EntityFrameworkCore.Design\` package):
\`\`\`bash
dotnet ef migrations add AddProductStock   # creates a migration from model changes
dotnet ef database update                  # applies pending migrations
dotnet ef migrations script                # SQL script for production DBAs
\`\`\`

Commit migrations to Git. In production, apply them as a controlled step (SQL script or migration bundle) rather than automatically at app startup.`,
          d: 'easy',
          at: 'Service companies, product companies',
        },
        {
          q: `What is the DbContext lifetime in ASP.NET Core? Explain change tracking and AsNoTracking.`,
          a: `\`AddDbContext\` registers the \`DbContext\` as **scoped**: one instance per HTTP request. A \`DbContext\` is a lightweight **unit of work**, and it is **not thread-safe**, so never share one across requests or run two queries on it in parallel. Never register it as a singleton.

\`\`\`csharp
builder.Services.AddDbContext<ShopContext>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("Shop")));
\`\`\`

**Change tracking:** entities loaded through the context are tracked. When you change a property and call \`SaveChangesAsync()\`, EF Core compares with the original values and generates only the needed \`UPDATE\`s.

\`\`\`csharp
var product = await _db.Products.FindAsync(id);
product!.Price = 499;
await _db.SaveChangesAsync();      // UPDATE Products SET Price = 499 WHERE Id = ...
\`\`\`

**AsNoTracking():** for read-only queries (lists, reports, GET endpoints), tracking wastes memory and CPU. \`AsNoTracking()\` skips it and is faster:

\`\`\`csharp
var list = await _db.Products.AsNoTracking()
    .Where(p => p.IsActive)
    .Select(p => new ProductDto(p.Id, p.Name, p.Price))
    .ToListAsync();
\`\`\`

Projecting to DTOs with \`Select\` is not tracked either. For background services, create a scope or use \`IDbContextFactory\`.`,
          d: 'medium',
        },
        {
          q: `Explain eager, explicit and lazy loading in EF Core. How do you avoid the N+1 problem?`,
          a: `Related data (an order's items, a product's category) is **not loaded automatically** in EF Core. Three ways:

- **Eager loading** — \`Include\`/\`ThenInclude\` loads related data in the same query:
\`\`\`csharp
var orders = await _db.Orders
    .Include(o => o.Customer)
    .Include(o => o.Items).ThenInclude(i => i.Product)
    .Where(o => o.CustomerId == customerId)
    .ToListAsync();
\`\`\`
- **Explicit loading** — load later on demand: \`await _db.Entry(order).Collection(o => o.Items).LoadAsync();\`
- **Lazy loading** — related data loads automatically when the property is accessed. Off by default; needs the \`Microsoft.EntityFrameworkCore.Proxies\` package, \`UseLazyLoadingProxies()\` and \`virtual\` navigation properties.

**N+1 problem:** loading 100 orders, then touching \`order.Items\` in a loop with lazy loading, fires 1 + 100 queries.

**Fixes:** use \`Include\`, or better for APIs, **project** exactly what the response needs — EF Core builds one efficient query:
\`\`\`csharp
.Select(o => new OrderDto(o.Id, o.Customer.Name, o.Items.Count))
\`\`\`
Including several collections can create a huge joined result ("cartesian explosion"); \`AsSplitQuery()\` runs separate queries instead. Watch the generated SQL with logging (\`LogTo\` or the \`Microsoft.EntityFrameworkCore.Database.Command\` log category).`,
          d: 'hard',
          at: 'Product companies',
          tip: `Mention AsSplitQuery for multiple Includes; it shows you have looked at the SQL EF Core actually sends.`,
        },
        {
          q: `How do you configure a one-to-many relationship in EF Core?`,
          a: `By **convention**, EF Core detects it from navigation properties and a foreign key property named \`<Navigation>Id\`:

\`\`\`csharp
public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public List<Product> Products { get; set; } = new();
}

public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public decimal Price { get; set; }
    public int CategoryId { get; set; }          // foreign key
    public Category Category { get; set; } = null!;
}
\`\`\`

With the **Fluent API** in \`OnModelCreating\` you make it explicit and set rules conventions cannot:

\`\`\`csharp
protected override void OnModelCreating(ModelBuilder mb)
{
    mb.Entity<Product>(e =>
    {
        e.Property(p => p.Name).HasMaxLength(200).IsRequired();
        e.Property(p => p.Price).HasPrecision(10, 2);
        e.HasOne(p => p.Category)
         .WithMany(c => c.Products)
         .HasForeignKey(p => p.CategoryId)
         .OnDelete(DeleteBehavior.Restrict);   // don't delete products with the category
    });
}
\`\`\`

Set decimal precision explicitly for money (EF Core warns otherwise). Many-to-many works with two collection navigations (EF Core 5+ creates the join table), or an explicit join entity when the link has extra data like quantity.`,
          d: 'medium',
        },
        {
          q: `What is the difference between a clustered and a non-clustered index in SQL Server?`,
          a: `- **Clustered index** — the table's rows are **physically stored in the order** of the index key; the leaf level *is* the data. So a table has **at most one** clustered index. By default, the primary key creates it.
- **Non-clustered index** — a **separate structure** holding the key columns plus a pointer to the row (the clustered key). A table can have many.

\`\`\`sql
CREATE TABLE Orders (
    Id INT IDENTITY(1,1) PRIMARY KEY,      -- clustered by default
    CustomerId INT NOT NULL,
    OrderDate DATETIME2 NOT NULL,
    Total DECIMAL(10,2) NOT NULL
);

CREATE NONCLUSTERED INDEX IX_Orders_Customer_Date
    ON Orders (CustomerId, OrderDate DESC)
    INCLUDE (Total);                       -- covering index
\`\`\`

The \`INCLUDE\` columns are stored at the leaf level, so a query like \`SELECT OrderDate, Total FROM Orders WHERE CustomerId = 5\` is answered from the index alone, without a **key lookup** into the table.

Choose a clustered key that is narrow, unique and ever-increasing (an \`INT IDENTITY\`) — a random \`GUID\` causes page splits. Every index speeds reads but slows writes, so index for real queries; check plans with **Actual Execution Plan** in SSMS. In EF Core, \`HasIndex(o => new { o.CustomerId, o.OrderDate })\` creates indexes through migrations.`,
          d: 'medium',
          at: 'Service companies, product companies',
        },
        {
          q: `How do you write a stored procedure in SQL Server and call it from EF Core?`,
          a: `\`\`\`sql
CREATE OR ALTER PROCEDURE dbo.GetTopCustomers
    @FromDate DATE,
    @Top INT = 5
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP (@Top) c.Id, c.Name, SUM(o.Total) AS TotalSpent
    FROM Customers c
    JOIN Orders o ON o.CustomerId = c.Id
    WHERE o.OrderDate >= @FromDate
    GROUP BY c.Id, c.Name
    ORDER BY TotalSpent DESC;
END
\`\`\`

From EF Core, map results to a type. In EF Core 8, \`SqlQuery<T>\` maps to unmapped types (types that are not entities):

\`\`\`csharp
public record TopCustomer(int Id, string Name, decimal TotalSpent);

DateTime from = DateTime.Today.AddMonths(-3);
int top = 5;

var result = await _db.Database
    .SqlQuery<TopCustomer>($"EXEC dbo.GetTopCustomers @FromDate = {from}, @Top = {top}")
    .ToListAsync();
\`\`\`

The interpolated string looks unsafe but is not: \`SqlQuery\` and \`FromSql\` turn each \`{value}\` into a **SQL parameter**. Never use \`FromSqlRaw\` with string concatenation of user input. For commands without results, use \`ExecuteSqlAsync\`.

Why stored procedures: complex reporting logic close to the data, permissions granted on the procedure only, and DBA-tuned queries. Downsides: logic split between C# and SQL, harder to test and version — use them where they clearly help.`,
          d: 'medium',
        },
        {
          q: `How do transactions work in EF Core? When do you need an explicit transaction?`,
          a: `**\`SaveChangesAsync()\` is already transactional.** All inserts, updates and deletes tracked since the last save are sent in one database transaction: either all succeed or none do. So for one save you need nothing extra.

You need an **explicit transaction** when one business operation spans **several \`SaveChanges\` calls** or mixes EF Core with raw SQL:

\`\`\`csharp
await using var tx = await _db.Database.BeginTransactionAsync();
try
{
    var order = new Order { CustomerId = customerId, Status = "Pending" };
    _db.Orders.Add(order);
    await _db.SaveChangesAsync();                 // order.Id is now generated

    int rows = await _db.Database.ExecuteSqlAsync(
        $"UPDATE Products SET Stock = Stock - {qty} WHERE Id = {productId} AND Stock >= {qty}");
    if (rows == 0) throw new InvalidOperationException("Out of stock");

    _db.OrderItems.Add(new OrderItem { OrderId = order.Id, ProductId = productId, Quantity = qty });
    await _db.SaveChangesAsync();

    await tx.CommitAsync();
}
catch
{
    await tx.RollbackAsync();
    throw;
}
\`\`\`

(Disposing an uncommitted transaction also rolls it back.) Keep transactions **short** — no external HTTP calls inside them. SQL Server's default isolation level is **READ COMMITTED**. If you use \`EnableRetryOnFailure\`, wrap explicit transactions in \`_db.Database.CreateExecutionStrategy().ExecuteAsync(...)\`.`,
          d: 'hard',
          at: 'Product companies',
        },
      ],
    },
    {
      title: `ASP.NET Core Web API, DI and configuration`,
      questions: [
        {
          q: `Explain the built-in dependency injection lifetimes in ASP.NET Core: transient, scoped and singleton.`,
          a: `Services are registered in \`Program.cs\` and injected through constructors.

| Lifetime | Instance created | Typical use |
|---|---|---|
| **Transient** | Every time it is requested | Lightweight, stateless helpers |
| **Scoped** | Once per HTTP request | \`DbContext\`, repositories, business services |
| **Singleton** | Once for the whole app | Caches, configuration readers, thread-safe clients |

\`\`\`csharp
builder.Services.AddTransient<IEmailFormatter, EmailFormatter>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddSingleton<IClock, SystemClock>();

public class OrdersController(IOrderService orders) : ControllerBase   // C# 12 primary constructor
{
    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id) =>
        await orders.FindAsync(id) is { } dto ? Ok(dto) : NotFound();
}
\`\`\`

**The captive dependency trap:** a singleton must not depend on a scoped service (for example a singleton holding a \`DbContext\`). The scoped object would live forever and be shared across requests. ASP.NET Core detects this at startup in the Development environment and throws. If a singleton needs scoped work, inject \`IServiceScopeFactory\` and create a scope.`,
          d: 'easy',
          at: 'Service companies, product companies',
          tip: `Explain the captive dependency rule; it is the follow-up interviewers ask right after the three lifetimes.`,
        },
        {
          q: `Walk through Program.cs in a .NET 8 Web API. Why does middleware order matter?`,
          a: `.NET 6+ uses the **minimal hosting model**: one \`Program.cs\` builds services, then the request pipeline.

\`\`\`csharp
var builder = WebApplication.CreateBuilder(args);

// 1. Register services
builder.Services.AddControllers();
builder.Services.AddDbContext<ShopContext>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("Shop")));
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(o => o.AddPolicy("spa",
    p => p.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddAuthentication().AddJwtBearer();
builder.Services.AddAuthorization();

var app = builder.Build();

// 2. Middleware pipeline — runs in this order for each request
if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }
app.UseHttpsRedirection();
app.UseCors("spa");
app.UseAuthentication();     // who are you?
app.UseAuthorization();      // are you allowed?
app.MapControllers();

app.Run();
\`\`\`

Each middleware can act before and after the next one, like layers of an onion. **Order matters:** \`UseAuthentication\` must come before \`UseAuthorization\` (otherwise every user looks anonymous), CORS must come before auth so preflight requests succeed, and exception handling should be first so it catches errors from everything after it.`,
          d: 'medium',
          at: 'Product companies',
        },
        {
          q: `Write a controller-based API for products with GET and POST.`,
          a: `\`\`\`csharp
public record CreateProductRequest(
    [Required, StringLength(200)] string Name,
    [Range(0.01, 1_000_000)] decimal Price);

public record ProductDto(int Id, string Name, decimal Price);

[ApiController]
[Route("api/[controller]")]                 // -> /api/products
public class ProductsController(ShopContext db) : ControllerBase
{
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProductDto>> Get(int id)
    {
        var p = await db.Products.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new ProductDto(x.Id, x.Name, x.Price))
            .FirstOrDefaultAsync();
        return p is null ? NotFound() : Ok(p);
    }

    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create(CreateProductRequest req)
    {
        var entity = new Product { Name = req.Name, Price = req.Price };
        db.Products.Add(entity);
        await db.SaveChangesAsync();
        var dto = new ProductDto(entity.Id, entity.Name, entity.Price);
        return CreatedAtAction(nameof(Get), new { id = entity.Id }, dto);   // 201 + Location
    }
}
\`\`\`

Explain: \`[ApiController]\` binds the body from JSON automatically and returns **400** with validation details if the model is invalid; \`{id:int}\` is a route constraint; \`ActionResult<T>\` allows either data or a status; POST returns **201 Created**. In larger apps the controller calls a service rather than the \`DbContext\` directly.`,
          d: 'easy',
          at: 'Service companies, product companies',
        },
        {
          q: `How does configuration work in ASP.NET Core? Explain appsettings, environments, IOptions and secrets.`,
          a: `Configuration is built from several **providers**, later ones overriding earlier ones:
1. \`appsettings.json\`
2. \`appsettings.{Environment}.json\` (for example \`appsettings.Production.json\`)
3. **User secrets** (Development only)
4. **Environment variables**
5. Command-line arguments

The environment comes from \`ASPNETCORE_ENVIRONMENT\` (Development, Staging, Production). Nested keys in environment variables use a double underscore: \`ConnectionStrings__Shop\`.

\`\`\`json
{
  "ConnectionStrings": { "Shop": "Server=.;Database=Shop;Trusted_Connection=True;TrustServerCertificate=True" },
  "Email": { "SmtpHost": "smtp.example.com", "FromAddress": "no-reply@example.com" }
}
\`\`\`

**Options pattern** — bind a section to a typed class:
\`\`\`csharp
public class EmailOptions
{
    public string SmtpHost { get; set; } = "";
    public string FromAddress { get; set; } = "";
}

builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection("Email"));

public class EmailSender(IOptions<EmailOptions> options)
{
    private readonly EmailOptions _opt = options.Value;
}
\`\`\`

**Secrets:** never commit passwords or API keys. Locally use \`dotnet user-secrets set "OpenAI:ApiKey" "..."\`; in production use environment variables or a vault such as Azure Key Vault.`,
          d: 'medium',
        },
        {
          q: `How does model validation work in ASP.NET Core Web API?`,
          a: `Add **data annotations** to request models. With \`[ApiController]\`, invalid input automatically returns **400 Bad Request** with a standard \`ValidationProblemDetails\` body — the action does not even run.

\`\`\`csharp
public class RegisterRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = "";

    [Required, MinLength(8)]
    public string Password { get; set; } = "";

    [Range(16, 100)]
    public int Age { get; set; }

    [Compare(nameof(Password))]
    public string ConfirmPassword { get; set; } = "";
}
\`\`\`

Response for bad input:
\`\`\`json
{
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": { "Email": ["The Email field is not a valid e-mail address."] }
}
\`\`\`

For rules involving several fields, implement \`IValidatableObject\`. Many teams use the **FluentValidation** library for complex rules and cleaner tests.

Validation of **format** belongs here; **business rules** that need the database (email already registered, stock available) belong in the service, returning **409 Conflict** or a 400 with a clear message. Never rely only on front-end validation — anyone can call the API directly.`,
          d: 'medium',
        },
        {
          q: `How do you handle exceptions globally in an ASP.NET Core 8 API?`,
          a: `.NET 8 adds the **\`IExceptionHandler\`** interface. Register a handler once and every unhandled exception becomes a clean \`ProblemDetails\` response, with no try/catch in each controller.

\`\`\`csharp
public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext context, Exception ex, CancellationToken ct)
    {
        var (status, title) = ex switch
        {
            NotFoundException   => (StatusCodes.Status404NotFound, "Not found"),
            ConflictException   => (StatusCodes.Status409Conflict, "Conflict"),
            _                   => (StatusCodes.Status500InternalServerError, "Server error")
        };
        if (status == 500) logger.LogError(ex, "Unhandled exception");

        context.Response.StatusCode = status;
        await context.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = status == 500 ? null : ex.Message    // never leak internals on 500
        }, ct);
        return true;
    }
}

// Program.cs
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();
app.UseExceptionHandler();      // early in the pipeline
\`\`\`

Before .NET 8, the same was done with custom middleware wrapping \`await next(context)\` in try/catch. Use exceptions for exceptional cases; expected outcomes like "not found" can also be returned directly with \`NotFound()\`.`,
          d: 'medium',
          at: 'Product companies',
        },
        {
          q: `How do you secure an ASP.NET Core Web API with JWT bearer authentication?`,
          a: `**Flow:** the client logs in at \`/api/auth/login\`; the API checks the password hash and returns a signed **JWT** with claims (user id, role) and an expiry. The client sends \`Authorization: Bearer <token>\`; the JWT middleware validates it on every request — no server session.

\`\`\`csharp
// Program.cs  (package Microsoft.AspNetCore.Authentication.JwtBearer)
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });
builder.Services.AddAuthorization();

app.UseAuthentication();
app.UseAuthorization();
\`\`\`

\`\`\`csharp
[Authorize]                                   // any logged-in user
public class OrdersController : ControllerBase
{
    [Authorize(Roles = "Admin")]              // admins only
    [HttpDelete("{id}")] public IActionResult Delete(int id) => NoContent();

    [AllowAnonymous]
    [HttpGet("public")] public IActionResult Public() => Ok();
}
\`\`\`

Tokens are created with \`JwtSecurityTokenHandler\` or \`JsonWebTokenHandler\`. Keep the key long and in a secret store, use short expiries plus refresh tokens, hash passwords (ASP.NET Core Identity's \`PasswordHasher\`), and use HTTPS. Read the user id in a controller from \`User.FindFirstValue(ClaimTypes.NameIdentifier)\`.`,
          d: 'hard',
          at: 'Product companies',
        },
        {
          q: `What is the difference between controllers and minimal APIs in ASP.NET Core?`,
          a: `Both run on the same ASP.NET Core pipeline and perform similarly; they differ in style.

**Minimal APIs** (.NET 6+) map routes directly to lambdas or methods in \`Program.cs\` or extension methods:

\`\`\`csharp
var products = app.MapGroup("/api/products").RequireAuthorization();

products.MapGet("/{id:int}", async (int id, ShopContext db) =>
    await db.Products.FindAsync(id) is { } p ? Results.Ok(p) : Results.NotFound());

products.MapPost("/", async (CreateProductRequest req, ShopContext db) =>
{
    var p = new Product { Name = req.Name, Price = req.Price };
    db.Products.Add(p);
    await db.SaveChangesAsync();
    return Results.Created("/api/products/" + p.Id, p);
});
\`\`\`

**Controllers** group actions in classes deriving from \`ControllerBase\`, with attributes for routes, filters, model binding and validation.

| | Minimal APIs | Controllers |
|---|---|---|
| Code | Less ceremony | More structure |
| Good for | Small services, microservices | Large APIs with many endpoints |
| Validation | Manual or endpoint filters (built-in support added in .NET 10) | Automatic with \`[ApiController]\` |
| Filters | Endpoint filters | Action filters, rich ecosystem |

Many companies still use controllers in existing code, so know both. Choosing one consistently per project matters more than which.`,
          d: 'easy',
        },
      ],
    },
    {
      title: `React integration, deployment and GenAI in .NET`,
      questions: [
        {
          q: `Your React app gets a CORS error calling your ASP.NET Core API. How do you fix it?`,
          a: `The browser's **same-origin policy** blocks reading responses from a different origin — scheme, host or **port**. React on \`localhost:5173\` and the API on \`localhost:7001\` are different origins, so the API must send CORS headers. Tools like Postman ignore CORS because they are not browsers.

\`\`\`csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactApp", policy =>
        policy.WithOrigins("http://localhost:5173", "https://shop.example.com")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());        // only if you send cookies
});

var app = builder.Build();
app.UseCors("ReactApp");    // before UseAuthentication/UseAuthorization
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
\`\`\`

Common mistakes:
- \`UseCors\` placed after authorization or endpoints, so the preflight \`OPTIONS\` request fails;
- \`AllowAnyOrigin()\` combined with \`AllowCredentials()\` — not allowed;
- a trailing slash in the origin (\`http://localhost:5173/\`) — origins must match exactly.

Alternatives: the Vite dev proxy, or hosting React and the API under one domain in production (for example, the API serving the React build from \`wwwroot\`), which removes CORS.`,
          d: 'easy',
          at: 'Service companies, product companies',
        },
        {
          q: `Write a React component that loads data from your ASP.NET Core API and handles errors.`,
          a: `\`\`\`tsx
import { useEffect, useState } from 'react';

type Order = { id: number; status: string; total: number };

export default function MyOrders({ token }: { token: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/orders/mine', { headers: { Authorization: 'Bearer ' + token } })
      .then(async res => {
        if (res.status === 401) throw new Error('Please log in again.');
        if (!res.ok) {
          const problem = await res.json().catch(() => null);  // ProblemDetails
          throw new Error(problem?.title ?? 'Something went wrong.');
        }
        return res.json() as Promise<Order[]>;
      })
      .then(data => { if (!cancelled) setOrders(data); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  if (loading) return <p>Loading…</p>;
  if (error) return <p role="alert">{error}</p>;
  if (orders.length === 0) return <p>No orders yet.</p>;
  return <ul>{orders.map(o => <li key={o.id}>#{o.id} — {o.status} — ₹{o.total}</li>)}</ul>;
}
\`\`\`

Points: \`fetch\` does not throw on 4xx/5xx, so check \`res.ok\`; read the API's \`ProblemDetails\` \`title\` for a friendly message; handle loading, error and empty states; the cleanup flag avoids setting state after unmount. ASP.NET Core returns camelCase JSON by default, matching the TypeScript type.`,
          d: 'easy',
        },
        {
          q: `How do you deploy an ASP.NET Core API with a React front end?`,
          a: `**Build:**
\`\`\`bash
dotnet publish -c Release -o ./publish    # the API
npm run build                             # React -> static files in dist/
\`\`\`

**Hosting options:**
- **Azure App Service** — common for .NET; deploy from Visual Studio, the CLI or GitHub Actions. Put the React build in Azure Static Web Apps or let the API serve it from \`wwwroot\` (\`app.UseStaticFiles()\` and \`app.MapFallbackToFile("index.html")\`).
- **IIS on Windows Server** — install the ASP.NET Core Hosting Bundle; IIS forwards requests to the app via the ASP.NET Core Module.
- **Linux + Nginx** — run the app with Kestrel as a systemd service; Nginx handles HTTPS and serves React.
- **Docker** — works on any cloud or Kubernetes:

\`\`\`dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
ENTRYPOINT ["dotnet", "Shop.Api.dll"]
\`\`\`
(.NET 8 container images listen on port 8080 by default.)

**Checklist:** \`ASPNETCORE_ENVIRONMENT=Production\`, connection strings and keys from environment variables or Key Vault, EF Core migrations applied as a step, HTTPS, health checks (\`app.MapHealthChecks("/health")\`), logging, and a CI/CD pipeline that runs tests before deploying.`,
          d: 'medium',
          at: 'Service companies, product companies',
        },
        {
          q: `How do you work with Git branches and pull requests in a team? How do you resolve a merge conflict?`,
          a: `**Typical flow:**
\`\`\`bash
git checkout main && git pull
git checkout -b feature/order-history
# ...code...
git add .
git commit -m "Add order history endpoint and page"
git push -u origin feature/order-history
\`\`\`
Then open a **pull request** (GitHub, Azure DevOps, GitLab). Teammates review, the CI pipeline builds and runs tests, and the branch is merged into \`main\`.

**Merge conflict:** happens when two branches changed the same lines.
\`\`\`bash
git pull origin main          # or git merge main
# CONFLICT in OrderService.cs
\`\`\`
Git marks the file:
\`\`\`text
<<<<<<< HEAD
    return await _db.Orders.Where(o => o.UserId == userId).ToListAsync();
=======
    return await _db.Orders.AsNoTracking().Where(o => o.CustomerId == userId).ToListAsync();
>>>>>>> main
\`\`\`
Decide the correct final code (often a mix), delete the markers, build and run tests, then \`git add\` and \`git commit\`.

Good habits: small focused commits with clear messages, pull often to keep conflicts small, never commit \`bin/\`, \`obj/\` or secrets (use the standard Visual Studio \`.gitignore\`), and use \`git revert\` to undo changes on shared branches.`,
          d: 'easy',
          at: 'Service companies, product companies',
        },
        {
          q: `How do you call an LLM like OpenAI from a .NET application?`,
          a: `Use the official **OpenAI .NET SDK** (NuGet package \`OpenAI\`). Microsoft also provides \`Azure.AI.OpenAI\` for Azure OpenAI and the \`Microsoft.Extensions.AI\` abstractions that work across providers.

\`\`\`csharp
using OpenAI.Chat;

var client = new ChatClient(
    model: "gpt-4o-mini",
    apiKey: Environment.GetEnvironmentVariable("OPENAI_API_KEY"));

ChatCompletion completion = await client.CompleteChatAsync(
    new SystemChatMessage("You are a helpful assistant for a bookstore. Answer briefly."),
    new UserChatMessage("Suggest two books to learn C#."));

Console.WriteLine(completion.Content[0].Text);
\`\`\`

In a Web API, register the client as a **singleton** in DI and call it from a service behind your own endpoint:

\`\`\`csharp
builder.Services.AddSingleton(new ChatClient("gpt-4o-mini",
    builder.Configuration["OpenAI:ApiKey"]));
\`\`\`

Key points:
- The React app calls **your** API; the API key never reaches the browser.
- \`CompleteChatStreamingAsync\` streams tokens for a chat-style UI.
- Add timeouts, retries for rate limits (HTTP 429), per-user limits and logging of token usage to control cost.`,
          d: 'medium',
          tip: `Saying "the key stays server-side, React calls my API" is the first thing a reviewer looks for.`,
        },
        {
          q: `What is Semantic Kernel? Explain kernels, plugins and automatic function calling.`,
          a: `**Semantic Kernel (SK)** is Microsoft's open-source SDK for building AI features and agents in .NET (also Python and Java). It connects your code to LLMs and lets the model call your C# methods.

- **Kernel** — the central object holding AI services (chat models, embeddings) and plugins.
- **Plugin** — a class whose methods are marked \`[KernelFunction]\` with descriptions; the model can call them.
- **Function calling** — with \`FunctionChoiceBehavior.Auto()\`, SK sends the function descriptions to the model, runs whichever ones the model asks for, and feeds results back until it has an answer.

\`\`\`csharp
using System.ComponentModel;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.Connectors.OpenAI;

public class OrderPlugin(IOrderService orders)
{
    [KernelFunction, Description("Gets the delivery status of an order by id")]
    public Task<string> GetOrderStatusAsync(int orderId) => orders.GetStatusAsync(orderId);
}

var builder = Kernel.CreateBuilder();
builder.AddOpenAIChatCompletion("gpt-4o-mini", apiKey);
builder.Plugins.AddFromObject(new OrderPlugin(orderService));
Kernel kernel = builder.Build();

var settings = new OpenAIPromptExecutionSettings
{
    FunctionChoiceBehavior = FunctionChoiceBehavior.Auto()
};
var result = await kernel.InvokePromptAsync("Where is my order 42?", new(settings));
Console.WriteLine(result);
\`\`\`

SK also supports prompt templates, memory/vector stores for RAG, and agent abstractions. Always check inside each function that the current user is allowed to see that data.`,
          d: 'medium',
          at: 'Microsoft partners, product companies',
        },
        {
          q: `What is RAG? How would you build a "chat with our policy documents" feature in .NET?`,
          a: `**RAG (Retrieval-Augmented Generation)** makes an LLM answer from *your* documents: find the relevant passages first, then give them to the model with the question.

**Pipeline:**
1. **Ingest** — read documents (PDF, Word, web pages), split into chunks of a few hundred words.
2. **Embed** — convert each chunk into a vector with an embedding model (for example, through the OpenAI SDK's \`EmbeddingClient\` or SK's embedding services).
3. **Store** — save vectors, text and metadata (file, page) in a vector store such as Azure AI Search, pgvector or Qdrant.
4. **Retrieve** — embed the user's question and fetch the top-k most similar chunks.
5. **Generate** — prompt: "Answer only from the context below and cite the source; if it is not there, say you don't know", plus the chunks and the question.

\`\`\`csharp
var questionVector = await embedder.GenerateAsync(question);
var chunks = await vectorStore.SearchAsync(questionVector, top: 4);
string context = string.Join("\\n---\\n", chunks.Select(c => c.Source + ": " + c.Text));
var answer = await chat.CompleteChatAsync(
    new SystemChatMessage("Answer only from the context. Cite sources. Say 'I don't know' otherwise."),
    new UserChatMessage("Context:\\n" + context + "\\n\\nQuestion: " + question));
\`\`\`
(\`embedder\` and \`vectorStore\` stand for whichever services you chose.)

RAG keeps answers current without retraining. Quality depends on chunking, retrieval and access control — filter chunks by what the user may see.`,
          d: 'hard',
          at: 'Product companies, Microsoft partners',
        },
        {
          q: `What makes an AI "agent" different from a chatbot? What risks must you control?`,
          a: `A **chatbot** answers: text in, text out. An **agent** pursues a **goal** by taking **actions**: the LLM plans, calls tools (your APIs and functions), observes results and repeats until done.

\`\`\`text
User goal -> LLM decides next step -> call tool (search orders, check stock)
          -> read result -> decide again -> ... -> final answer or action
\`\`\`

Example: "Reschedule my delivery to Saturday" — the agent looks up the order, checks available slots, updates the booking and confirms.

In .NET you build agents with **Semantic Kernel** (plugins + automatic function calling, plus its agent framework), or with the provider SDK's tool-calling support and your own loop.

**Risks and controls:**
- **Unauthorised actions** — every tool checks the logged-in user's permissions; the model's request is not permission.
- **Irreversible steps** — refunds, deletions or emails need human confirmation.
- **Prompt injection** — instructions hidden in user text or documents; keep tools minimal and validate arguments.
- **Runaway loops and cost** — cap steps, tokens and time.
- **Wrong actions from hallucination** — validate tool inputs against real data, prefer read-only tools.
- **Traceability** — log each step and tool call for debugging and audits.

Interviewers value candidates who design the guard rails, not only the happy path.`,
          d: 'medium',
        },
      ],
    },
    {
      title: `Scenarios and project questions`,
      questions: [
        {
          q: `Explain your .NET full-stack capstone project.`,
          a: `Use a clear structure and keep it to about two minutes:

1. **Problem and users** — "A clinic appointment system where patients book slots and doctors manage their schedule."
2. **Architecture** — React front end → ASP.NET Core 8 Web API → EF Core → SQL Server, JWT authentication. Layers: controllers → services → \`DbContext\`, with DTOs at the API boundary.
3. **Your part** — specific: "I built the booking and availability APIs, the EF Core model and migrations, and the doctor dashboard in React."
4. **Data model** — Patient, Doctor, Slot, Appointment; relationships and key constraints (a unique index so one slot cannot be booked twice).
5. **One hard problem** — a real one: double bookings fixed with a concurrency token, or a slow list fixed with \`AsNoTracking\`, projection and an index.
6. **Quality** — validation, global exception handling with \`ProblemDetails\`, unit tests with xUnit and Moq, Git with pull requests.
7. **Deployment and next steps** — Azure App Service or Docker, and what you would add (email reminders with a background service, an AI symptom FAQ assistant).

Keep a diagram ready, know every line you claim to have written, and expect deep follow-ups on each technology you mention.`,
          d: 'easy',
          at: 'All companies',
          tip: `Prepare one debugging story with numbers, such as "the list went from 3 seconds to 200 ms".`,
        },
        {
          q: `An API endpoint takes several seconds in production. How do you find and fix the cause?`,
          a: `**Measure before changing anything:**
- Check logs and timing (Application Insights, OpenTelemetry, or request logging middleware) to find which step is slow.
- Turn on EF Core SQL logging in a test environment to see the queries and their count.
- In SQL Server, look at the **actual execution plan** in SSMS and Query Store for the slow query.

**Common causes and fixes:**
1. **N+1 queries** — related data loaded in a loop. Use projection with \`Select\` or \`Include\`.
2. **Loading too much** — no pagination, or full entities with big columns. Add \`Skip\`/\`Take\` paging and project to DTOs.
3. **Missing index** — the plan shows a table/clustered index **scan** on a big table. Add a non-clustered index on the filter and sort columns.
4. **Filtering in memory** — \`ToList()\` or \`AsEnumerable()\` before \`Where\`. Keep it \`IQueryable\` until the end.
5. **Tracking overhead** — add \`AsNoTracking()\` for reads.
6. **Blocking calls** — \`.Result\` or sync I/O starving the thread pool. Make the call chain async.
7. **Slow external calls** — call in parallel with \`Task.WhenAll\`, add timeouts, or move to a background job.
8. Then **caching** (\`IMemoryCache\`, Redis distributed cache, or .NET 8 output caching) for data read often and changed rarely.

Re-measure after each change and report before/after numbers.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Start with "I would measure first", then give the list. Guessing a fix immediately is a red flag.`,
        },
        {
          q: `Design the REST API for a hospital appointment booking system.`,
          a: `| Method | Endpoint | Who | Purpose | Success / errors |
|---|---|---|---|---|
| GET | \`/api/doctors?specialty=cardiology&page=1\` | Anyone | List doctors | 200 |
| GET | \`/api/doctors/{id}/slots?date=2026-03-10\` | Anyone | Free slots | 200 / 404 |
| POST | \`/api/appointments\` | Patient | Book (body: slotId, reason) | 201 / 409 if taken |
| GET | \`/api/appointments/mine\` | Patient | My appointments | 200 |
| PATCH | \`/api/appointments/{id}/cancel\` | Owner patient or doctor | Cancel | 200 / 403 / 409 if too late |
| GET | \`/api/doctors/me/appointments?date=\` | Doctor | Day schedule | 200 |
| POST | \`/api/doctors/me/slots\` | Doctor | Publish availability | 201 |

**Design points:**
- Resources are nouns; filtering and paging use query parameters.
- Correct status codes: 400 invalid input, 401 not logged in, 403 not allowed, 404 missing, **409** when a business rule fails (slot taken).
- Role-based \`[Authorize(Roles = "Doctor")]\` plus ownership checks in the service.
- A **unique index** on \`Appointment.SlotId\` (for active bookings) so the database itself prevents double booking.
- Dates in ISO 8601, stored in UTC, shown in the user's local time.
- DTOs at the boundary; never return EF entities directly.
- Version (\`/api/v1\`) if mobile apps or partners will use it.`,
          d: 'medium',
          at: 'Service companies, product companies',
        },
        {
          q: `Two patients book the same slot at the same moment. How do you prevent a double booking in EF Core and SQL Server?`,
          a: `This is a **race condition**: both requests read "slot is free", both insert, and the slot is booked twice. Checking in C# alone cannot stop it.

**1. Database constraint (strongest guarantee)** — a unique index on the slot for active bookings:
\`\`\`csharp
modelBuilder.Entity<Appointment>()
    .HasIndex(a => a.SlotId)
    .IsUnique()
    .HasFilter("[Status] <> 'Cancelled'");     // SQL Server filtered index
\`\`\`
The second insert fails with a \`DbUpdateException\` (unique violation); catch it and return **409 Conflict**.

**2. Optimistic concurrency with a rowversion** — on the \`Slot\` entity:
\`\`\`csharp
public class Slot
{
    public int Id { get; set; }
    public bool IsBooked { get; set; }
    [Timestamp] public byte[] RowVersion { get; set; } = [];
}

try
{
    slot.IsBooked = true;
    db.Appointments.Add(new Appointment { SlotId = slot.Id, PatientId = patientId });
    await db.SaveChangesAsync();   // UPDATE ... WHERE Id = @id AND RowVersion = @original
}
catch (DbUpdateConcurrencyException)
{
    return Conflict("This slot was just booked. Please pick another.");
}
\`\`\`
SQL Server changes the \`rowversion\` on every update, so the second save matches zero rows and EF Core throws.

Use the constraint as the final safety net and concurrency tokens for friendly handling. Pessimistic locks (\`UPDLOCK\` hints in raw SQL) also work but hold locks and reduce throughput.`,
          d: 'hard',
          at: 'Product companies',
        },
        {
          q: `How do you run background work in ASP.NET Core, for example sending appointment reminders every hour?`,
          a: `Implement a **hosted service** by inheriting \`BackgroundService\`. It starts with the app and runs until shutdown.

\`\`\`csharp
public class ReminderService(IServiceScopeFactory scopeFactory, ILogger<ReminderService> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                using var scope = scopeFactory.CreateScope();      // DbContext is scoped
                var db = scope.ServiceProvider.GetRequiredService<ClinicContext>();
                var email = scope.ServiceProvider.GetRequiredService<IEmailSender>();

                var due = await db.Appointments
                    .Where(a => !a.ReminderSent && a.StartsAt <= DateTime.UtcNow.AddHours(24))
                    .ToListAsync(stoppingToken);
                foreach (var a in due)
                {
                    await email.SendReminderAsync(a, stoppingToken);
                    a.ReminderSent = true;
                }
                await db.SaveChangesAsync(stoppingToken);
            }
            catch (Exception ex) { logger.LogError(ex, "Reminder run failed"); }
        }
    }
}

builder.Services.AddHostedService<ReminderService>();
\`\`\`

Key points: create a **scope** because hosted services are singletons; catch exceptions so one failure does not stop the loop; honour the cancellation token. If several app instances run, each runs the job — use a library like **Hangfire** or **Quartz.NET** (persistent, scheduled, single execution), or Azure Functions, for production-grade jobs.`,
          d: 'medium',
        },
        {
          q: `How do you log properly in ASP.NET Core?`,
          a: `ASP.NET Core has built-in logging through \`ILogger<T>\`, injected anywhere.

\`\`\`csharp
public class OrderService(ILogger<OrderService> logger, ShopContext db)
{
    public async Task<Order> PlaceAsync(int customerId, decimal total)
    {
        logger.LogInformation("Placing order for customer {CustomerId} with total {Total}",
            customerId, total);
        try
        {
            // ...
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Order failed for customer {CustomerId}", customerId);
            throw;
        }
    }
}
\`\`\`

**Good practices:**
- Use **message templates** with named placeholders (\`{CustomerId}\`), not string concatenation or interpolation. This gives **structured logging**: tools can search \`CustomerId = 42\`.
- Pick the right **level**: \`Trace\`/\`Debug\` (development detail), \`Information\` (normal events), \`Warning\` (unexpected but handled), \`Error\` (failed operation), \`Critical\` (app-wide failure).
- Set levels per category in \`appsettings.json\` under \`"Logging"\`, quieter in production.
- Pass the exception object as the first argument so the stack trace is kept.
- **Never log** passwords, tokens, card numbers or full personal data.
- Send logs to a central place: Application Insights, Seq, the ELK stack, or **Serilog** sinks — so you can investigate production problems.`,
          d: 'easy',
        },
        {
          q: `Your API works locally but fails after deploying to the server. What do you check?`,
          a: `Check the evidence first, then compare the environments.

1. **Logs** — App Service log stream, Application Insights, \`journalctl\` on Linux, Event Viewer or stdout logs on IIS. The exception usually names the cause. If there are no logs, enabling them is step one.
2. **Environment and configuration:**
   - \`ASPNETCORE_ENVIRONMENT\` — a missing \`appsettings.Production.json\` value, or code that only works in Development (like the developer exception page or Swagger);
   - connection string wrong or not set — environment variables need \`ConnectionStrings__Shop\` (double underscore);
   - secrets that lived in user secrets locally do not exist on the server.
3. **Database** — migrations not applied, firewall blocking SQL Server (port 1433), Windows authentication working locally but not for the server's identity, a certificate error that needs \`Encrypt\`/\`TrustServerCertificate\` settings.
4. **Runtime** — the right .NET runtime / ASP.NET Core Hosting Bundle installed (IIS), or a self-contained publish.
5. **Networking** — CORS origins missing the production domain, HTTPS certificate, reverse-proxy headers, wrong port (containers listen on 8080 in .NET 8).
6. **File system** — paths and folder permissions for uploads and logs; case sensitivity on Linux.

Reproduce in a staging environment, fix, add a check (health endpoint, config validation at startup with \`ValidateOnStart\`), and redeploy through the pipeline.`,
          d: 'medium',
          at: 'Service companies, product companies',
        },
        {
          q: `How do you keep API keys and connection strings secure in a .NET project?`,
          a: `**Never put secrets in source code or committed \`appsettings.json\` files.** Git history keeps them forever, and repositories get shared or leaked.

**Development:** use **User Secrets** — stored outside the project folder, loaded automatically in the Development environment:
\`\`\`bash
dotnet user-secrets init
dotnet user-secrets set "OpenAI:ApiKey" "sk-..."
dotnet user-secrets set "ConnectionStrings:Shop" "Server=...;Database=Shop;..."
\`\`\`
The code just reads \`builder.Configuration["OpenAI:ApiKey"]\` — the same line works in every environment.

**Production:**
- **Environment variables** set on the server or in the container platform (\`OpenAI__ApiKey\`);
- a vault such as **Azure Key Vault** (with \`AddAzureKeyVault\` and a managed identity, so no password is needed to reach it);
- for Azure SQL, **managed identity** authentication avoids a database password entirely.

**Also:**
- Keep a committed \`appsettings.json\` with placeholders only, and add local override files to \`.gitignore\`.
- Give each key the least permissions and set spending limits on AI provider keys.
- The React app must never contain secret keys — anything in a front-end bundle is public.
- If a key leaks, **rotate it immediately**, then clean it from history.`,
          d: 'easy',
          at: 'Service companies, product companies',
        },
      ],
    },
  ],
};

export default book;
