/**
 * Career-track content (.NET Full Stack + AI, batch N2): Entity Framework Core (JT_EFCORE).
 *
 * Everything here is EF Core 8 on .NET 8 with the SQL Server provider
 * (Microsoft.EntityFrameworkCore.SqlServer, which uses Microsoft.Data.SqlClient 5). Where behaviour
 * arrived in a particular version the notes say so: filtered Include and split queries are EF Core 5+,
 * many-to-many without a join class is EF Core 5+, FromSql and ExecuteUpdate/ExecuteDelete are
 * EF Core 7+, SqlQuery for unmapped types is EF Core 8, and lazy loading always needs the separate
 * Proxies package. The questions ask what EF Core does with a given model or query — which SQL it
 * sends, when, and what breaks — because that is how EF Core is examined in a .NET interview.
 *
 * The topic is single-skill (EF_CORE), so no question names a skillKey.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_CS_EFCORE_BUNDLES: PilotBundle[] = [
  /* ── ORM_DBCONTEXT ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_EFCORE_ORM_DBCONTEXT',
    notes: `In the ADO.NET topic you wrote the same three things for every query: an SQL string, a
\`while (reader.Read())\` loop, and code that copied each column into a property. An **ORM**
(object-relational mapper) writes that layer for you. You describe once how a class maps to a
table, and from then on you load, save and query **objects**. On .NET the ORM is **Entity
Framework Core** (EF Core) — open source, from Microsoft, and the default in ASP.NET Core
templates.

## The same job, twice

ADO.NET:

    await using var cmd = new SqlCommand(
        "SELECT Id, Name, Price FROM Products WHERE Id = @id", conn);
    cmd.Parameters.AddWithValue("@id", id);
    await using var reader = await cmd.ExecuteReaderAsync();
    if (await reader.ReadAsync())
        return new Product { Id = reader.GetInt32(0), Name = reader.GetString(1), Price = reader.GetDecimal(2) };

EF Core:

    var product = await db.Products.FindAsync(id);
    product!.Price = 499.00m;
    await db.SaveChangesAsync();      // EF Core works out the UPDATE itself

That last line is the real difference. EF Core **tracks** the objects it loaded, notices that
\`Price\` changed, and generates \`UPDATE [Products] SET [Price] = @p0 WHERE [Id] = @p1\`.

## The pieces

- **\`DbContext\`** — your session with the database. It holds the connection settings, the
  model (how classes map to tables), and the **change tracker** (which objects it loaded and what
  changed). A context is meant to be short-lived: one per web request or unit of work.
- **\`DbSet<T>\`** — a property on the context for each entity type. You query it with LINQ and
  add to it. \`DbSet<Product> Products\` also gives the table its default name, \`Products\`.
- **The provider** — a NuGet package that turns EF Core's queries into one database's SQL. For
  SQL Server it is \`Microsoft.EntityFrameworkCore.SqlServer\`.

    // dotnet add package Microsoft.EntityFrameworkCore.SqlServer
    using Microsoft.EntityFrameworkCore;

    public class Product
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public decimal Price { get; set; }
    }

    public class InventoryContext : DbContext
    {
        public InventoryContext(DbContextOptions<InventoryContext> options) : base(options) { }
        public DbSet<Product> Products => Set<Product>();
    }

## Registering it in an ASP.NET Core app

    // Program.cs
    builder.Services.AddDbContext<InventoryContext>(options =>
        options.UseSqlServer(builder.Configuration.GetConnectionString("Inventory")));

    // appsettings.json
    "ConnectionStrings": {
      "Inventory": "Server=localhost;Database=Inventory;Trusted_Connection=True;TrustServerCertificate=True"
    }

\`AddDbContext\` registers the context as **scoped** — one instance per HTTP request — and a
controller or service receives it through its constructor. (Dependency injection gets its own topic
next; for now, "the framework hands you a fresh context per request" is enough.)

In a console app without a host you can override \`OnConfiguring\` instead:

    protected override void OnConfiguring(DbContextOptionsBuilder options)
        => options.UseSqlServer("Server=localhost;Database=Inventory;Trusted_Connection=True;TrustServerCertificate=True");

\`TrustServerCertificate=True\` is for a local development server only. Microsoft.Data.SqlClient 4
and later encrypt by default, so a local SQL Server with a self-signed certificate refuses the login
without it. In production, install a proper certificate instead.

## Seeing the SQL

An ORM does not remove SQL; it **generates** it. Read what it sends:

    options.UseSqlServer(cs)
           .LogTo(Console.WriteLine, LogLevel.Information)   // EF Core 5+
           .EnableSensitiveDataLogging();                    // parameter values — development only

In ASP.NET Core, setting the \`Microsoft.EntityFrameworkCore.Database.Command\` log category to
\`Information\` does the same. A query also has \`ToQueryString()\` (EF Core 5+), which returns its SQL
without running it.

## What it costs

- **Generated SQL you did not write** — usually fine, occasionally terrible. You must still read SQL.
- **A new mental model** — the change tracker, entity states, when a query actually runs.
- **Awkward fits** — a bulk update of 100,000 rows or a reporting query with window functions is
  often clearer as SQL (EF Core lets you run raw SQL when you need it).

## Common mistakes

- Keeping one \`DbContext\` alive for the whole application. Its change tracker grows forever and it
  is **not thread-safe**; two requests using it at once fail.
- Forgetting the provider package — the context has no idea how to talk to SQL Server.
- Saying "EF Core means I don't need SQL". You need it to read the log and fix a slow query.`,
    mcqs: [
      mcq('An ASP.NET Core app registers InventoryContext with AddDbContext and nothing else about lifetime. How many context instances does a burst of three HTTP requests use?', [
        ['One, shared by the whole application for its entire lifetime', false],
        ['Three, one per request, since the default lifetime is scoped', true],
        ['One per controller class, reused across all requests to it', false],
        ['None until SaveChanges is called, then one per call', false],
      ], 'AddDbContext registers the context as scoped, and ASP.NET Core opens a scope per HTTP request. Each request therefore gets its own short-lived context and its own change tracker.'),
      mcq('Code loads a product with FindAsync, sets product.Price = 499m and calls SaveChangesAsync. No Update call is made. What does EF Core send?', [
        ['Nothing, because Update was never called on the product', false],
        ['An UPDATE of the changed price, found by the change tracker', true],
        ['A DELETE and then an INSERT of the whole product row', false],
        ['An exception, because a loaded entity is read-only until Attach is called', false],
      ], 'Entities returned by a tracking query are tracked. SaveChanges compares them with the values captured when they were loaded and writes an UPDATE for what changed.'),
      mcq('Which NuGet package lets a DbContext talk to SQL Server?', [
        ['Microsoft.EntityFrameworkCore.SqlServer', true],
        ['Microsoft.EntityFrameworkCore.Relational', false],
        ['System.Data.SqlClient, used on its own', false],
        ['Microsoft.EntityFrameworkCore.Design', false],
      ], 'The SqlServer package is the provider: it supplies UseSqlServer and translates queries to T-SQL. Relational is a shared base the provider depends on, and Design is for the migrations tooling.'),
    ],
    checkpoint: [
      mcq('A developer stores one InventoryContext in a static field and uses it from every request. Under load, requests start failing. What is the cause?', [
        ['SQL Server limits each login to one open connection at a time', false],
        ['A DbContext is not thread-safe, and its tracker grows forever', true],
        ['A static context loses its connection string after first use', false],
        ['EF Core refuses to run queries from a static member at all', false],
      ], 'A context is a short-lived unit of work. Shared across threads it fails with "A second operation was started on this context instance before a previous operation completed", and its change tracker keeps every entity it ever loaded.'),
      mcq('A console app connects to a local SQL Server 2022 through EF Core 8 and the login fails with "The certificate chain was issued by an authority that is not trusted." What changed compared with old System.Data.SqlClient code?', [
        ['EF Core 8 no longer supports Windows authentication', false],
        ['Microsoft.Data.SqlClient 4+ encrypts the connection by default', true],
        ['SQL Server 2022 refuses any connection that is not from Azure', false],
        ['The database name in the connection string is case-sensitive now', false],
      ], 'Since Microsoft.Data.SqlClient 4, Encrypt defaults to true, so the client validates the server certificate. A development server with a self-signed certificate needs TrustServerCertificate=True; production needs a trusted certificate.'),
      mcq('Which call shows the SQL a LINQ query will send, without running it?', [
        ['query.ToQueryString()', true],
        ['query.ToString() on the DbSet', false],
        ['db.Database.GetSql(query)', false],
        ['query.AsNoTracking().Explain()', false],
      ], 'ToQueryString (EF Core 5+) returns the generated SQL, parameters included as declarations. LogTo or the Database.Command log category show SQL as it actually runs.'),
    ],
  },

  /* ── ENTITIES_MAPPING ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_EFCORE_ENTITIES_MAPPING',
    notes: `An **entity** is a class EF Core stores as rows. EF Core builds its **model** — which
class maps to which table, which property is the key, what each column's type is — in three layers,
each overriding the one before:

1. **Conventions** — rules applied to every class automatically.
2. **Data annotations** — attributes on the class and its properties.
3. **The Fluent API** — code in \`OnModelCreating\`. It wins over both.

## Conventions

    public class Product
    {
        public int Id { get; set; }                 // key; IDENTITY on SQL Server
        public string Name { get; set; } = "";      // nvarchar(max) NOT NULL
        public string? Description { get; set; }    // nvarchar(max) NULL
        public decimal Price { get; set; }          // decimal(18,2) — with a warning
        public int Quantity { get; set; }           // int NOT NULL
        public DateTime CreatedAt { get; set; }     // datetime2 NOT NULL
        public ProductStatus Status { get; set; }   // int — the enum's number
    }

- A property named \`Id\` or \`ProductId\` is the **primary key**. An \`int\` or \`long\` key becomes
  an \`IDENTITY\` column, and EF Core reads the generated value back after INSERT.
- The table is named after the \`DbSet\` property (\`Products\`), or after the class if there is no
  \`DbSet\`.
- With **nullable reference types** enabled (the default in .NET 8 templates), \`string\` means
  NOT NULL and \`string?\` means NULL. Value types are NOT NULL unless written \`int?\`.
- \`string\` with no length becomes \`nvarchar(max)\` — which cannot be part of an index key.
- \`decimal\` gets \`decimal(18,2)\`, and EF Core logs a warning that begins "No store type was
  specified for the decimal property 'Price' on entity type 'Product'." Say what you want.
- An enum is stored as its **number** by default.

## Data annotations

    using System.ComponentModel.DataAnnotations;
    using System.ComponentModel.DataAnnotations.Schema;
    using Microsoft.EntityFrameworkCore;

    [Table("Products")]
    [Index(nameof(Sku), IsUnique = true)]            // EF Core 5+
    public class Product
    {
        public int Id { get; set; }

        [Required, MaxLength(120)]
        public string Name { get; set; } = "";

        [MaxLength(40)]
        public string Sku { get; set; } = "";

        [Precision(10, 2)]                            // EF Core 6+
        public decimal Price { get; set; }

        [Column("CreatedAtUtc")]
        public DateTime CreatedAt { get; set; }

        [NotMapped]
        public int CartQuantity { get; set; }         // exists only in C#
    }

Annotations are quick, and \`[Required]\` and \`[MaxLength]\` are also read by ASP.NET Core model
validation. But they put database detail on your domain class, and many things — composite keys,
delete behaviour, value conversions — cannot be said with attributes at all.

## The Fluent API

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Product>(e =>
        {
            e.ToTable("Products");
            e.Property(p => p.Name).HasMaxLength(120).IsRequired();
            e.Property(p => p.Sku).HasMaxLength(40);
            e.HasIndex(p => p.Sku).IsUnique();
            e.Property(p => p.Price).HasPrecision(10, 2);
            e.Property(p => p.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(p => p.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
            e.Ignore(p => p.CartQuantity);
        });
    }

\`HasConversion<string>()\` stores the enum's **name** — the safer choice, because inserting a new
member in the middle of an enum silently changes what every stored number means.

As the model grows, move each entity's configuration into its own class:

    public class ProductConfiguration : IEntityTypeConfiguration<Product>
    {
        public void Configure(EntityTypeBuilder<Product> e)
        {
            e.Property(p => p.Name).HasMaxLength(120);
        }
    }

    // in OnModelCreating
    modelBuilder.ApplyConfigurationsFromAssembly(typeof(InventoryContext).Assembly);

## Keys that are not called Id

    e.HasKey(p => p.Sku);                         // a different single key
    e.HasKey(l => new { l.OrderId, l.LineNo });   // composite — Fluent API only

A class with no key EF Core can find fails at startup: "The entity type 'StockReport' requires a
primary key to be defined. If you intended to use a keyless entity type, call 'HasNoKey' in
'OnModelCreating'." Keyless types (\`HasNoKey()\`) suit views and raw-SQL results; they are never
tracked or saved.

## Common mistakes

- Leaving \`string\` unbounded and then trying to index it — \`nvarchar(max)\` cannot be an index key.
- Storing money as \`double\` — use \`decimal\` with an explicit precision.
- Expecting \`[MaxLength(40)]\` to stop a 50-character value in C#. It shapes the column; the
  database rejects the INSERT (or ASP.NET Core validation rejects the request) — EF Core itself does
  not validate on SaveChanges.`,
    mcqs: [
      mcq('An entity has public string Sku { get; set; } with no configuration, and OnModelCreating calls HasIndex(p => p.Sku).IsUnique(). Creating the index fails on SQL Server. Why?', [
        ['A unique index is not allowed on any string column', false],
        ['Sku became nvarchar(max), which cannot be an index key', true],
        ['HasIndex must be declared with an annotation as well', false],
        ['EF Core creates the index before it creates the table', false],
      ], 'An unbounded string maps to nvarchar(max), and SQL Server cannot use a max-length column as an index key. HasMaxLength(40) or [MaxLength(40)] gives nvarchar(40), which can be indexed.'),
      mcq('A property is annotated [MaxLength(50)] and OnModelCreating also calls HasMaxLength(80) on it. What length does the column get?', [
        ['50, because an attribute on the property always wins', false],
        ['80, because the Fluent API overrides data annotations', true],
        ['The smaller one, as EF Core keeps the stricter rule', false],
        ['Neither — EF Core reports a conflicting configuration', false],
      ], 'Conventions apply first, then annotations, then the Fluent API. The Fluent API has the last word, so the column is nvarchar(80).'),
      mcq('enum ProductStatus { Active, Discontinued } is mapped with no configuration. Later Draft is added as the first member. What happens to existing rows?', [
        ['They keep their meaning, because EF Core stores the names', false],
        ['Their stored numbers now map to different enum members', true],
        ['EF Core rewrites every row to match the new positions', false],
        ['The app refuses to start until a migration is added for it', false],
      ], 'By default an enum is stored as its integer value. Inserting Draft at the start renumbers the members, so a stored 0 that meant Active now reads as Draft. HasConversion<string>() stores names instead.'),
    ],
    checkpoint: [
      mcq('A class OrderLine has properties OrderId, LineNo and Quantity, and no property named Id or OrderLineId. What must be added for EF Core to map it?', [
        ['[Key] on both OrderId and LineNo, and EF Core combines them in order', false],
        ['HasKey(l => new { l.OrderId, l.LineNo }) in OnModelCreating', true],
        ['Nothing — EF Core uses the first int property as the key', false],
        ['[NotMapped] on Quantity so only key columns remain', false],
      ], 'EF Core finds no key by convention, so it fails with "requires a primary key to be defined". A composite key is declared with HasKey and an anonymous type; EF Core 7 also added [PrimaryKey] on the class, but [Key] on two properties is not supported.'),
      mcq('With nullable reference types enabled, how do public string Name { get; set; } and public string? Notes { get; set; } map?', [
        ['Both become nullable nvarchar(max) columns', false],
        ['Name becomes NOT NULL and Notes becomes NULL', true],
        ['Both become NOT NULL nvarchar(255) columns', false],
        ['Name becomes NULL and Notes is not mapped at all', false],
      ], 'With nullable reference types on, EF Core reads the annotation: a non-nullable string is a required column, a string? an optional one. Neither has a length, so both are nvarchar(max).'),
      mcq('Which property is left out of the table entirely?', [
        ['[Column("Total")] public decimal Total { get; set; }', false],
        ['[NotMapped] public decimal Total { get; set; }', true],
        ['[Precision(10, 2)] public decimal Total { get; set; }', false],
        ['[Required] public decimal Total { get; set; }', false],
      ], '[NotMapped] (or Ignore in the Fluent API) tells EF Core the property exists only in C#. The other attributes all map a column and only change its name, precision or nullability.'),
    ],
  },

  /* ── MIGRATIONS ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_EFCORE_MIGRATIONS',
    notes: `Your model changes every week: a new property, a new entity, a longer column. **Migrations**
turn each change into a script that brings the database up to date — and keep a record of which
scripts have run.

## Setting up the tools

    dotnet tool install --global dotnet-ef
    dotnet add package Microsoft.EntityFrameworkCore.Design

The \`dotnet ef\` commands build your project and create the context the way the app does (through
the host in \`Program.cs\`), or through a class implementing \`IDesignTimeDbContextFactory<T>\` if you
add one. In Visual Studio's Package Manager Console the same commands are \`Add-Migration\` and
\`Update-Database\`, from \`Microsoft.EntityFrameworkCore.Tools\`.

## The loop

    dotnet ef migrations add InitialCreate     # compare model with the last snapshot, write a migration
    dotnet ef database update                  # apply every migration not yet applied
    dotnet ef migrations add AddProductSku     # after changing the model
    dotnet ef database update

Each \`migrations add\` creates three things in a \`Migrations\` folder:

- \`20261017093000_AddProductSku.cs\` — the migration, with \`Up\` and \`Down\` methods;
- its \`.Designer.cs\` — metadata;
- \`InventoryContextModelSnapshot.cs\` — updated: the model as it now stands. The **next**
  migration is the difference between the model and this snapshot. EF Core does **not** look at
  the database to decide what to generate.

    public partial class AddProductSku : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Sku", table: "Products", type: "nvarchar(40)", maxLength: 40,
                nullable: false, defaultValue: "");
            migrationBuilder.CreateIndex(
                name: "IX_Products_Sku", table: "Products", column: "Sku", unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_Products_Sku", table: "Products");
            migrationBuilder.DropColumn(name: "Sku", table: "Products");
        }
    }

Read every migration before you apply it. Notice \`defaultValue: ""\`: a NOT NULL column added to
a table with rows needs a value for those rows — and here every existing product gets an empty SKU,
which the unique index then rejects as soon as there are two. You would edit the migration to fill
real SKUs first.

## The history table

\`database update\` records each applied migration in \`__EFMigrationsHistory\` (MigrationId,
ProductVersion). Next time it runs only the ones missing from that table.

    dotnet ef database update AddProductSku     # migrate up or down to a named migration
    dotnet ef migrations remove                 # delete the last migration (if not applied)
    dotnet ef migrations list

## Renames are not detected

Rename \`Price\` to \`UnitPrice\` and \`migrations add\` writes a \`DropColumn\` and an \`AddColumn\`,
with the warning "An operation was scaffolded that may result in the loss of data. Please review
the migration for accuracy." EF Core cannot tell a rename from a drop-and-add. Replace the two calls
with:

    migrationBuilder.RenameColumn(name: "Price", table: "Products", newName: "UnitPrice");

## Seeding with HasData

    modelBuilder.Entity<Category>().HasData(
        new Category { Id = 1, Name = "Electronics" },
        new Category { Id = 2, Name = "Stationery" });

Seed data becomes part of the model: the next migration contains \`InsertData\` calls, and changing
a seeded row later produces \`UpdateData\`. Keys must be given explicitly, even for IDENTITY columns
(EF Core switches \`IDENTITY_INSERT\` on in the generated SQL). Use it for fixed reference data, not
for test data.

## Getting migrations to production

- \`dotnet ef migrations script --idempotent -o migrate.sql\` — a SQL script a DBA can review and run;
  "idempotent" checks the history table so it is safe to run on a database at any version.
- \`dotnet ef migrations bundle\` (EF Core 6+) — a single executable that applies them.
- \`db.Database.Migrate()\` at startup is convenient on a single developer machine, but risky when
  several app instances start at once.

## EnsureCreated is not a migration

\`db.Database.EnsureCreated()\` creates the schema straight from the model, with **no** history table.
It is for tests and prototypes. Use it on a database and later switch to migrations, and the first
\`database update\` tries to create tables that already exist: "There is already an object named
'Products' in the database."

## Migrations in a team

- Commit migrations with the code that needs them. The snapshot is code too.
- Two branches that both add a migration will conflict in the snapshot file. Merge one branch,
  remove your migration, pull, and add it again so it is based on the merged snapshot.
- Never edit a migration that has already run on a shared database; add a new one.`,
    mcqs: [
      mcq('A developer renames Product.Price to UnitPrice and runs dotnet ef migrations add. What does the generated migration do to the existing data?', [
        ['RenameColumn keeps the prices under the new column name', false],
        ['DropColumn then AddColumn, losing every price in the table', true],
        ['Nothing — EF Core maps UnitPrice onto the old Price column', false],
        ['It copies Price into UnitPrice and then drops the old column', false],
      ], 'EF Core cannot distinguish a rename from removing one property and adding another, so it scaffolds a drop and an add with a data-loss warning. Edit the migration to call RenameColumn instead.'),
      mcq('How does dotnet ef migrations add decide what the new migration should contain?', [
        ['It connects to the database and compares the live schema', false],
        ['It compares the current model with the model snapshot file', true],
        ['It reads __EFMigrationsHistory and diffs the last entry', false],
        ['It replays all earlier migrations in memory and compares', false],
      ], 'The ModelSnapshot class records the model as of the last migration. The new migration is the difference between that snapshot and the current model; the database is not consulted.'),
      mcq('A shared test database was built with EnsureCreated. The team now runs dotnet ef database update for the first time. What happens?', [
        ['It notices the tables exist, records them as migrated, and changes nothing', false],
        ['It fails: "There is already an object named \'Products\' in the database."', true],
        ['It drops the database and recreates it from the migrations', false],
        ['It applies only the migrations added after EnsureCreated ran', false],
      ], 'EnsureCreated writes no __EFMigrationsHistory rows, so update believes no migration has run and starts with CREATE TABLE for tables that already exist. Pick one approach per database.'),
    ],
    checkpoint: [
      mcq('Which table tells dotnet ef database update which migrations a database already has?', [
        ['__EFMigrationsHistory', true],
        ['sys.migrations', false],
        ['The ModelSnapshot class', false],
        ['INFORMATION_SCHEMA.TABLES', false],
      ], 'Each applied migration is recorded by id in __EFMigrationsHistory. The snapshot drives migrations add; the history table drives database update.'),
      mcq('A migration adds a NOT NULL Sku column with defaultValue: "" and a unique index on Sku. The Products table already holds 300 rows. What happens on update?', [
        ['Each existing row gets a generated unique SKU automatically', false],
        ['The column is added, then creating the unique index fails', true],
        ['The migration skips existing rows and indexes only new ones', false],
        ['SQL Server leaves the new column NULL for the old rows', false],
      ], 'All 300 rows receive the default empty string, so the unique index finds duplicates and cannot be created. Edit the migration to fill real values before the index is built.'),
      mcq('A DBA will apply schema changes to production by hand and the database may be several migrations behind. What should you hand over?', [
        ['The Migrations folder, to be run file by file', false],
        ['dotnet ef migrations script --idempotent output', true],
        ['A backup of your local development database', false],
        ['The ModelSnapshot class converted into T-SQL', false],
      ], 'An idempotent script wraps each migration in a check against __EFMigrationsHistory, so it can run against a database at any earlier version and applies only what is missing.'),
    ],
  },

  /* ── QUERYING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_EFCORE_QUERYING',
    notes: `You already know LINQ over lists. Over a \`DbSet\`, the same operators build an
**expression tree** that EF Core translates to SQL. The query runs on SQL Server; only the results
come back.

## IQueryable and when the query runs

    IQueryable<Product> query = db.Products
        .Where(p => p.Quantity < 10)
        .OrderBy(p => p.Name);           // no SQL yet

    List<Product> low = await query.ToListAsync();   // now: one SELECT

A query runs when you **enumerate** it: \`ToListAsync\`, \`ToArrayAsync\`, \`FirstOrDefaultAsync\`,
\`SingleAsync\`, \`CountAsync\`, \`AnyAsync\`, \`SumAsync\`, or a \`foreach\`. Until then you can keep
composing:

    IQueryable<Product> q = db.Products;
    if (categoryId is not null) q = q.Where(p => p.CategoryId == categoryId);
    if (!string.IsNullOrEmpty(term)) q = q.Where(p => p.Name.Contains(term));
    var page = await q.OrderBy(p => p.Name).Skip(20).Take(10).ToListAsync();

That becomes one SELECT with both conditions and \`OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY\`.
Enumerating the same \`IQueryable\` twice sends the query twice.

The async methods live in the \`Microsoft.EntityFrameworkCore\` namespace — forget that \`using\`
and \`ToListAsync\` "does not exist".

## How common operators translate

| LINQ | SQL Server |
|------|-----------|
| \`Where(p => p.Price > 100)\` | \`WHERE [p].[Price] > 100.0\` |
| \`p.Name.Contains(term)\` / \`StartsWith\` | \`LIKE\` |
| \`OrderBy\` / \`ThenByDescending\` | \`ORDER BY ... , ... DESC\` |
| \`Skip(20).Take(10)\` | \`OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY\` |
| \`CountAsync()\` / \`AnyAsync()\` | \`COUNT(*)\` / \`EXISTS\` |
| \`ids.Contains(p.Id)\` | an \`IN\` — EF Core 8 passes the list as one JSON parameter read with \`OPENJSON\` |
| \`GroupBy(...).Select(g => new { g.Key, n = g.Count() })\` | \`GROUP BY\` with \`COUNT(*)\` |

String comparison follows the **column's collation**. SQL Server's default collation is
case-insensitive, so \`Where(p => p.Name == "pen")\` also matches "Pen" — unlike the same LINQ over a
\`List<Product>\`.

## Projection: fetch only what you show

    public record ProductRow(int Id, string Name, string Category, decimal Price);

    var rows = await db.Products
        .Where(p => p.Quantity > 0)
        .OrderBy(p => p.Name)
        .Select(p => new ProductRow(p.Id, p.Name, p.Category.Name, p.Price))
        .ToListAsync();

    // SELECT [p].[Id], [p].[Name], [c].[Name], [p].[Price]
    // FROM [Products] AS [p]
    // INNER JOIN [Categories] AS [c] ON [p].[CategoryId] = [c].[Id]
    // WHERE [p].[Quantity] > 0
    // ORDER BY [p].[Name]

Four columns instead of every column, the join written for you, and nothing tracked — a projection
to a non-entity type is never tracked. For a list screen or an API response this is usually the
best query you can write.

## Single results

- \`FindAsync(id)\` — by primary key; returns an already-tracked entity **without** a query if the
  context has it.
- \`FirstOrDefaultAsync(p => p.Sku == sku)\` — the first match or \`null\`; add \`OrderBy\` if more
  than one row could match.
- \`SingleAsync(...)\` — throws if there is not exactly one. EF Core asks for \`TOP(2)\` to find out.

## What cannot be translated

    static bool IsBargain(Product p) => p.Price < p.ListPrice * 0.5m;

    var deals = await db.Products.Where(p => IsBargain(p)).ToListAsync();
    // InvalidOperationException: The LINQ expression '...' could not be translated.
    // Either rewrite the query in a form that can be translated, or switch to client
    // evaluation explicitly by inserting a call to 'AsEnumerable', 'AsAsyncEnumerable',
    // 'ToList', or 'ToListAsync'.

EF Core cannot see inside a compiled C# method. Since EF Core 3.0 it refuses rather than silently
loading the whole table to filter in memory. Write the condition inline
(\`Where(p => p.Price < p.ListPrice * 0.5m)\`), or filter in memory **deliberately** after a query
that has already cut the rows down. One exception: the **final** \`Select\` may call C# methods,
because EF Core can run that part on the rows it brought back.

## Common mistakes

- \`db.Products.ToList().Where(...)\` — \`ToList\` runs first and loads every product; the \`Where\`
  then runs in memory. Put \`Where\` before the call that executes.
- \`Skip/Take\` without \`OrderBy\` — the page contents are not guaranteed; EF Core logs a warning.
- Returning \`IQueryable\` from a repository and enumerating it after the context is disposed.`,
    workedExample: `**Problem:** a product list page shows name, category and price for in-stock products
in one category, 20 per page, sorted by name. The first version is:

    var all = await db.Products.Include(p => p.Category).ToListAsync();
    var page = all.Where(p => p.CategoryId == categoryId && p.Quantity > 0)
                  .OrderBy(p => p.Name)
                  .Skip((pageNo - 1) * 20).Take(20)
                  .Select(p => new ProductRow(p.Id, p.Name, p.Category.Name, p.Price))
                  .ToList();

**Step 1 — find where the SQL ends.** \`ToListAsync()\` on the first line executes. Everything after it
is LINQ to Objects. So SQL Server returns **every** product with every column and its category, and
.NET filters, sorts and pages them. With 50,000 products that is 50,000 rows to show 20.

**Step 2 — move every operator before execution.**

    var page = await db.Products
        .Where(p => p.CategoryId == categoryId && p.Quantity > 0)
        .OrderBy(p => p.Name)
        .Skip((pageNo - 1) * 20).Take(20)
        .Select(p => new ProductRow(p.Id, p.Name, p.Category.Name, p.Price))
        .ToListAsync();

**Step 3 — check the SQL** with \`ToQueryString()\` or the log: one SELECT of four columns, an INNER
JOIN to Categories, \`WHERE [p].[CategoryId] = @__categoryId_0 AND [p].[Quantity] > 0\`,
\`ORDER BY [p].[Name]\`, \`OFFSET @__p_1 ROWS FETCH NEXT @__p_2 ROWS ONLY\`. The \`Include\` is gone —
it is not needed, because the projection reads \`p.Category.Name\` and EF Core joins for it.

**What to say in a review:** the rule is "everything that reduces rows goes before the call that
executes", and the proof is reading the generated SQL, not the C#.`,
    mcqs: [
      mcq('What SQL does this send? var n = await db.Products.Where(p => p.Quantity == 0).CountAsync();', [
        ['SELECT every column, then count the rows in memory', false],
        ['SELECT COUNT(*) ... WHERE [p].[Quantity] = 0', true],
        ['SELECT TOP(1) ... WHERE [p].[Quantity] = 0', false],
        ['Two statements: a SELECT and then a separate COUNT', false],
      ], 'CountAsync on an IQueryable is translated to COUNT(*), with the Where as its WHERE clause. Only the single number travels back.'),
      mcq('db.Products.Where(p => IsBargain(p)).ToListAsync(), where IsBargain is a static C# method, throws in EF Core 8. Why?', [
        ['Static methods cannot be called from inside any lambda in C#', false],
        ['EF Core cannot translate a compiled C# method into SQL', true],
        ['ToListAsync requires the filter to be written as a query expression', false],
        ['The method must be marked async before EF Core can await it', false],
      ], 'EF Core translates expression trees, and a call to a compiled method is opaque to it. Since EF Core 3.0 an untranslatable Where throws "could not be translated" instead of quietly filtering the whole table in memory.'),
      mcq('The Products table uses SQL Server\'s default collation. Which rows does db.Products.Where(p => p.Name == "pen") return?', [
        ['Only rows whose Name is exactly "pen" in lower case', false],
        ['Rows named "pen", "Pen" or "PEN", as the collation ignores case', true],
        ['No rows at all, because string equality is not translated', false],
        ['It throws until StringComparison is passed to the equality', false],
      ], 'The comparison runs in SQL Server, so the column collation decides. The default collation is case-insensitive, unlike C# string equality over a list in memory.'),
    ],
    checkpoint: [
      mcq('How many SELECT statements does this code send?\n\n    var q = db.Products.Where(p => p.Quantity < 5);\n    var count = await q.CountAsync();\n    var items = await q.ToListAsync();', [
        ['One, because q is evaluated once and then reused', false],
        ['Two, because each call that executes sends its own query', true],
        ['None, because q was never enumerated with foreach', false],
        ['Three, one for the Where clause and one for each of the two calls', false],
      ], 'An IQueryable is a description, not a result. CountAsync and ToListAsync each execute it, so SQL Server receives a COUNT query and then a SELECT.'),
      mcq('What is wrong with this query?\n\n    var cheap = db.Products.ToList()\n        .Where(p => p.Price < 100)\n        .Take(10);', [
        ['Take cannot follow Where in a LINQ method chain', false],
        ['ToList loads the whole table before Where and Take run', true],
        ['Price comparisons need decimal literals such as 100m', false],
        ['Nothing — EF Core moves Where and Take into the SQL', false],
      ], 'ToList executes immediately, so SQL Server returns every product and the filter runs in memory. Moving Where and Take before the executing call puts them in the SQL.'),
      mcq('A projection Select(p => new ProductRow(p.Id, p.Name, p.Category.Name)) runs over tracked context. What does EF Core track afterwards?', [
        ['Each Product and Category it read to build the rows', false],
        ['Nothing, because the results are not entity instances', true],
        ['Only the Category entities that the join touched', false],
        ['The ProductRow records, so later edits are saved', false],
      ], 'Only entity instances are tracked. A projection into a DTO returns plain objects; no Product or Category is materialised, so the change tracker stays empty.'),
    ],
  },

  /* ── RELATIONSHIPS ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_EFCORE_RELATIONSHIPS',
    notes: `Tables relate through foreign keys; classes relate through **navigation properties**.
EF Core maps one onto the other.

## One-to-many

    public class Category
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public List<Product> Products { get; set; } = new();   // collection navigation
    }

    public class Product
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public int CategoryId { get; set; }                    // foreign key property
        public Category Category { get; set; } = null!;        // reference navigation
    }

By convention EF Core sees \`Category.Products\` and \`Product.Category\` as two ends of one
relationship, and \`CategoryId\` (navigation name + key name) as its foreign key. The migration
creates \`Products.CategoryId\` with an index and a foreign-key constraint.

The same relationship in the Fluent API, with nothing left to convention:

    modelBuilder.Entity<Product>()
        .HasOne(p => p.Category)
        .WithMany(c => c.Products)
        .HasForeignKey(p => p.CategoryId)
        .OnDelete(DeleteBehavior.Restrict);

Including the foreign-key property is optional but useful: you can set \`product.CategoryId = 3\`
without loading category 3 at all.

## Required or optional

- \`int CategoryId\` (non-nullable) — **required**: every product has a category.
- \`int? CategoryId\` — **optional**: a product may have none.

## Delete behaviour

| | Default | Effect when the category is deleted |
|---|---|---|
| Required | \`Cascade\` | its products are deleted too (\`ON DELETE CASCADE\`) |
| Optional | \`ClientSetNull\` | tracked products get \`CategoryId = null\`; the database has no action |

Cascading delete is often wrong for shared or valuable data. Deleting a category should probably be
refused while it has products — that is \`DeleteBehavior.Restrict\` (or \`NoAction\`), and the delete
fails with a foreign-key error you can turn into a message.

SQL Server adds a rule of its own: it refuses a model where one table can be reached by **two
cascade paths** — for example, StockMovement cascades from Product and also from Warehouse, and
Product cascades from Warehouse too. The migration fails with "Introducing FOREIGN KEY constraint
'FK_...' on table 'StockMovements' may cause cycles or multiple cascade paths. Specify ON DELETE NO
ACTION or ON UPDATE NO ACTION, or modify other FOREIGN KEY constraints." Fix it by setting one of
the relationships to \`Restrict\`/\`NoAction\`.

## Adding related objects

    var cat = new Category { Name = "Stationery" };
    cat.Products.Add(new Product { Name = "Pen" });
    cat.Products.Add(new Product { Name = "Pencil" });
    db.Categories.Add(cat);
    await db.SaveChangesAsync();
    // INSERT the category, read its new Id, INSERT both products with that CategoryId

You never set \`CategoryId\` by hand; EF Core fills it from the navigation.

## Many-to-many

**Without a join class (EF Core 5+):**

    public class Product { public int Id { get; set; } public List<Tag> Tags { get; set; } = new(); }
    public class Tag     { public int Id { get; set; } public List<Product> Products { get; set; } = new(); }

EF Core creates a join table \`ProductTag\` with columns \`ProductsId\` and \`TagsId\` and a composite
key. \`product.Tags.Add(tag)\` inserts a row into it. (EF Core 3.1 could not do this; you needed a
join class.)

**With a join class** — when the link carries its own data:

    public class SupplierProduct
    {
        public int SupplierId { get; set; }
        public Supplier Supplier { get; set; } = null!;
        public int ProductId { get; set; }
        public Product Product { get; set; } = null!;
        public decimal CostPrice { get; set; }      // the payload
        public int LeadTimeDays { get; set; }
    }

    modelBuilder.Entity<SupplierProduct>().HasKey(sp => new { sp.SupplierId, sp.ProductId });

That is simply two one-to-many relationships. Start with the join class whenever the relationship
might ever carry data — converting later means a data migration.

## One-to-one

    modelBuilder.Entity<Product>()
        .HasOne(p => p.Detail)
        .WithOne(d => d.Product)
        .HasForeignKey<ProductDetail>(d => d.ProductId);

With one-to-one, EF Core cannot guess which side holds the foreign key, so you say it with the
generic \`HasForeignKey<T>\`.

## Common mistakes

- Required relationships everywhere, so deleting one row cascades through half the database.
- A many-to-many without a join class that later needs a "quantity" or "added on" column.
- Serialising entities with navigations both ways straight to JSON — a cycle; return DTOs.`,
    mcqs: [
      mcq('Product has public int CategoryId and a Category navigation, with no Fluent API configuration. What happens when a category with products is deleted?', [
        ['The delete fails because products still refer to the category', false],
        ['The products are deleted too, since required means Cascade', true],
        ['The products remain with CategoryId set to zero', false],
        ['The products remain with CategoryId set to NULL', false],
      ], 'A non-nullable foreign key makes the relationship required, and a required relationship defaults to cascade delete. Configure OnDelete(DeleteBehavior.Restrict) when that is not what the business wants.'),
      mcq('Product and Tag each have a List of the other and no join class. In EF Core 8, what does the migration create?', [
        ['A TagId column on Products and a ProductId column on Tags', false],
        ['A ProductTag join table keyed on ProductsId and TagsId', true],
        ['Nothing — a many-to-many needs an explicit join entity class', false],
        ['A JSON column on Products that lists the tag ids', false],
      ], 'Since EF Core 5, skip navigations on both sides are mapped through an implicit join entity. Its table is named after the two types and its columns after the navigations plus Id.'),
      mcq('A supplier sells a product at a cost price that differs per supplier. How should Supplier–Product be modelled?', [
        ['Skip navigations on both sides with no join class', false],
        ['A SupplierProduct class with both keys and a CostPrice', true],
        ['A CostPrice property placed on the Product class', false],
        ['A List<decimal> of cost prices on the Supplier class', false],
      ], 'The cost price belongs to the pair, not to either side, so the link needs a class of its own with a composite key and the payload. An implicit join table has nowhere to keep it.'),
    ],
    checkpoint: [
      mcq('A migration fails with "Introducing FOREIGN KEY constraint ... may cause cycles or multiple cascade paths." What is the usual fix?', [
        ['Delete the foreign-key properties and keep only the navigation properties', false],
        ['Set one of the relationships to DeleteBehavior.Restrict or NoAction', true],
        ['Rerun dotnet ef database update with the --force option', false],
        ['Turn the one-to-many relationships into many-to-many ones', false],
      ], 'SQL Server refuses two cascade paths into the same table. Making one relationship Restrict or NoAction removes a path; the application then deletes those rows explicitly when it needs to.'),
      mcq('What does this code insert?\n\n    var cat = new Category { Name = "Toys" };\n    cat.Products.Add(new Product { Name = "Kite" });\n    db.Categories.Add(cat);\n    await db.SaveChangesAsync();', [
        ['Only the category, because only it was passed to Add', false],
        ['The category, then the product with the new CategoryId', true],
        ['The product first, then the category it belongs to', false],
        ['It throws, because Product.CategoryId was left as 0', false],
      ], 'Add tracks the whole reachable graph as Added. SaveChanges inserts the principal first, reads its IDENTITY value, and uses it as the product\'s foreign key.'),
      mcq('Product has int? CategoryId. A tracked category whose products are also tracked is deleted, with no configuration. What happens to those products?', [
        ['They are deleted along with the category', false],
        ['Their CategoryId is set to NULL by EF Core', true],
        ['The delete is refused by EF Core before any SQL', false],
        ['They keep the old id, which now points nowhere', false],
      ], 'A nullable foreign key makes the relationship optional, whose default is ClientSetNull: EF Core nulls the key on tracked dependents before deleting the principal.'),
    ],
  },

  /* ── LOADING ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_EFCORE_LOADING',
    notes: `Load an order and its \`Lines\` navigation is **empty**, and its \`Customer\` is **null** —
unless you asked for them. EF Core loads related data only when you choose one of three ways.

## 1. Eager loading — Include

    var orders = await db.Orders
        .Where(o => o.PlacedAt >= since)
        .Include(o => o.Customer)
        .Include(o => o.Lines)
            .ThenInclude(l => l.Product)
        .ToListAsync();

\`Include\` adds the related data to the same query: a JOIN for the customer, and a LEFT JOIN for the
lines and their products. \`ThenInclude\` goes one level deeper.

**Filtered Include** (EF Core 5+) loads part of a collection:

    .Include(c => c.Products.Where(p => p.Quantity > 0).OrderBy(p => p.Name))

\`Include\` is about loading **entities**. If the query ends in a \`Select\` to a DTO, \`Include\` is
ignored — the projection itself decides which columns are joined.

## The cartesian explosion, and split queries

One query that includes two collections — an order's \`Lines\` and its \`Payments\` — returns one row
per line **times** per payment. Ten lines and five payments are fifty rows for one order, every
column of the order repeated in each. EF Core 8 logs a warning when a query loads more than one
collection in a single query without a splitting behaviour configured.

    var orders = await db.Orders
        .Include(o => o.Lines)
        .Include(o => o.Payments)
        .AsSplitQuery()            // EF Core 5+
        .ToListAsync();

\`AsSplitQuery\` sends one SELECT for the orders and one for each included collection — three queries,
no multiplication. The trade-off: several round trips, and the queries are not one consistent
snapshot unless you run them in a transaction. You can make split queries the default with
\`UseSqlServer(cs, o => o.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery))\`.

## 2. Explicit loading — later, on purpose

    var order = await db.Orders.FindAsync(id);
    await db.Entry(order!).Collection(o => o.Lines).LoadAsync();
    await db.Entry(order!).Reference(o => o.Customer).LoadAsync();

    // or a filtered count without loading the lines
    var big = await db.Entry(order!).Collection(o => o.Lines).Query()
                      .CountAsync(l => l.Quantity > 10);

## 3. Lazy loading — not on by default

EF Core does **not** lazy-load unless you opt in:

    // dotnet add package Microsoft.EntityFrameworkCore.Proxies
    options.UseSqlServer(cs).UseLazyLoadingProxies();

    public class Order
    {
        public int Id { get; set; }
        public virtual Customer Customer { get; set; } = null!;     // must be virtual
        public virtual List<OrderLine> Lines { get; set; } = new();
    }

EF Core then creates proxy subclasses that run a query the first time a navigation is read.
Convenient — and the classic source of N+1.

## The N+1 problem

    var orders = await db.Orders.ToListAsync();                 // 1 query
    foreach (var o in orders)
        Console.WriteLine($"{o.Id}: {o.Customer.Name}");        // with lazy loading: +1 per order

With lazy loading, 200 orders send **201** queries. Without lazy loading, the same code throws a
\`NullReferenceException\` instead (Customer is null) — EF Core's default protects you by failing
loudly. N+1 also appears without proxies when you query inside a loop:

    foreach (var o in orders)
        o.CustomerName = (await db.Customers.FindAsync(o.CustomerId))!.Name;   // still N+1

The fixes, in the order to reach for them:

1. **Project** what the screen needs: \`Select(o => new { o.Id, CustomerName = o.Customer.Name })\` — one
   query, only those columns.
2. **Include** when you need the entities themselves (to modify them).
3. **Load the set once** — \`Where(c => ids.Contains(c.Id))\` — and match them up in memory.

**Find it** by counting statements in the log: one SELECT per row of the outer list is the signature.

## Relationship fix-up

If the related entities are **already tracked** by the context, EF Core connects the navigations
for you, even without \`Include\`. Load all categories first, then products, and every
\`product.Category\` is set. This is why a test that reuses one context can pass while the real
request — with a fresh context — sees null navigations.

## Common mistakes

- Turning on lazy-loading proxies to make a null navigation go away, and shipping an N+1.
- Including everything "just in case" — every Include is a join and more columns.
- Several collection Includes in one query over a large result, without \`AsSplitQuery\`.`,
    mcqs: [
      mcq('Lazy-loading proxies are NOT configured. Code loads orders with db.Orders.ToListAsync() and reads order.Customer.Name in a loop. What happens?', [
        ['One query per order is sent to load each customer', false],
        ['A NullReferenceException, since Customer was never loaded', true],
        ['EF Core loads the customers in one batched follow-up query', false],
        ['The names come back empty but no exception is thrown', false],
      ], 'Without proxies EF Core never loads a navigation by itself. Customer stays null unless it was included, loaded explicitly, or already tracked, so reading Name throws.'),
      mcq('A query uses Include(o => o.Lines) and Include(o => o.Payments). An order has 10 lines and 5 payments. How many rows does the single SQL query return for that order?', [
        ['15, one for each line and one for each payment', false],
        ['50, one per line for every payment, as the joins multiply', true],
        ['1, because EF Core aggregates the rows on SQL Server', false],
        ['10, as EF Core joins only the first included collection', false],
      ], 'Two collection joins in one query produce every line–payment combination. AsSplitQuery avoids this by loading each collection with its own SELECT.'),
      mcq('Which setup is required for EF Core lazy loading through proxies?', [
        ['Only marking the navigation properties as virtual', false],
        ['The Proxies package, UseLazyLoadingProxies, virtual navigations', true],
        ['Nothing — EF Core 8 lazy-loads every navigation property by default when read', false],
        ['Only calling AsLazy() on each query that needs it', false],
      ], 'Lazy loading is opt-in: install Microsoft.EntityFrameworkCore.Proxies, call UseLazyLoadingProxies, and make navigations virtual on public, non-sealed classes so proxies can override them.'),
    ],
    checkpoint: [
      mcq('What does this query load?\n\n    var rows = await db.Orders\n        .Include(o => o.Lines)\n        .Select(o => new { o.Id, o.Total })\n        .ToListAsync();', [
        ['Every order with all of its lines attached', false],
        ['Only Id and Total — the Include is ignored', true],
        ['The lines only, because Include runs last', false],
        ['It throws, since Include cannot precede Select', false],
      ], 'Include applies only when the query returns entity instances. A projection to an anonymous type selects exactly the listed columns, so the lines are never joined.'),
      mcq('A test reuses one context: it loads all categories, then all products, and every product.Category is set without any Include. In production each request has a fresh context and Category is null. Why?', [
        ['Production runs a different EF Core provider than the test', false],
        ['Fix-up connects navigations to entities already tracked', true],
        ['The test database has lazy loading enabled by default', false],
        ['Include is applied implicitly only in Debug builds', false],
      ], 'When related entities are already in the change tracker, EF Core wires up navigations automatically. A fresh context has nothing tracked, so nothing is fixed up and the query must Include what it needs.'),
      mcq('Which is the best fix when an order list page shows only order id, date and customer name, and the log shows one customer query per order?', [
        ['Enable lazy-loading proxies so customers load themselves', false],
        ['Project to a DTO that reads o.Customer.Name in one query', true],
        ['Call FindAsync for every customer inside the order loop', false],
        ['Load every customer in the database with ToListAsync', false],
      ], 'A projection selects only the three columns and joins Customers in the same SELECT. Lazy loading or per-order lookups are exactly the N+1 being fixed.'),
    ],
  },

  /* ── CHANGE_TRACKING ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_EFCORE_CHANGE_TRACKING',
    notes: `Every entity a context knows about has a **state**. \`SaveChanges\` turns states into SQL.

## The five states

| State | Meaning | SaveChanges sends |
|---|---|---|
| \`Detached\` | the context does not know it | nothing |
| \`Added\` | new, to be inserted | \`INSERT\` |
| \`Unchanged\` | loaded, not modified | nothing |
| \`Modified\` | loaded, and at least one property changed | \`UPDATE\` of the changed columns |
| \`Deleted\` | marked for removal | \`DELETE\` |

    var p = await db.Products.FirstAsync(x => x.Sku == "PEN-01");
    Console.WriteLine(db.Entry(p).State);                  // Unchanged
    p.Price = 25m;
    db.ChangeTracker.DetectChanges();
    Console.WriteLine(db.Entry(p).State);                  // Modified
    Console.WriteLine(db.Entry(p).Property(x => x.Price).IsModified);   // True

When a tracking query loads an entity, EF Core stores a **snapshot** of its original values.
\`SaveChanges\` first calls \`DetectChanges\`, which compares each tracked entity with its snapshot, and
then writes only what changed: \`UPDATE [Products] SET [Price] = @p0 WHERE [Id] = @p1\`.

## What SaveChanges does

- Wraps all its statements in **one transaction** — all succeed or none do.
- Orders the statements so principals are inserted before dependents.
- Reads back generated values (IDENTITY ids, defaults) into your objects.
- Returns the number of rows written; with nothing changed it returns 0 and sends nothing.

## The methods that set states

| Call | Effect |
|---|---|
| \`Add(e)\` | \`e\` and every untracked entity reachable from it → \`Added\` |
| \`Attach(e)\` | \`Unchanged\` (entities without a key value → \`Added\`) |
| \`Update(e)\` | \`Modified\` — **every** property (entities without a key value → \`Added\`) |
| \`Remove(e)\` | \`Deleted\` |
| \`Entry(e).State = ...\` | exactly what you set, for that one entity |

Note that \`Add\` marks the reachable graph \`Added\` **even if those entities have keys**. Hang an
existing customer, loaded by another context, on a new order and \`Add\` the order: EF Core tries to
INSERT the customer again.

## Identity resolution

Within one context, a key maps to **one instance**. Query the same product twice with tracking and
you get the same object — and the second query does **not** overwrite its values with what the
database now says. Attaching a second instance with the same key fails:

    The instance of entity type 'Product' cannot be tracked because another instance with the same
    key value for {'Id'} is already being tracked.

## AsNoTracking

    var list = await db.Products.AsNoTracking().Where(p => p.Quantity < 10).ToListAsync();

No snapshots, no identity map, less memory and CPU. Use it for every read-only query — lists,
reports, API GETs. Changes made to these objects are never saved. (If you need no tracking but one
instance per key, there is \`AsNoTrackingWithIdentityResolution\`, EF Core 5+.) You can also set
\`QueryTrackingBehavior.NoTracking\` as the context default and opt back in with \`AsTracking()\`.

## Updating from a web request (a detached entity)

An API receives \`{ "id": 7, "name": "Blue pen", "price": 30 }\`. Three ways to save it:

    // 1. Load, then copy — sends only changed columns, and you can validate against the current row
    var p = await db.Products.FindAsync(dto.Id);
    if (p is null) return NotFound();
    p.Name = dto.Name;
    p.Price = dto.Price;
    await db.SaveChangesAsync();

    // 2. Update — no SELECT, but UPDATEs every column, overwriting anything the DTO did not carry
    db.Products.Update(new Product { Id = dto.Id, Name = dto.Name, Price = dto.Price });

    // 3. Attach and mark single properties — no SELECT, only the named columns
    var stub = new Product { Id = dto.Id, Price = dto.Price };
    db.Attach(stub);
    db.Entry(stub).Property(x => x.Price).IsModified = true;

Option 2 is the trap: the \`Product\` built from the DTO has \`Quantity = 0\` and \`Sku = ""\`, and
\`Update\` writes them. Option 1 is the safe default.

## Common mistakes

- Calling \`Update\` on an entity that is already tracked — unnecessary, and it marks every column
  modified.
- Tracking queries for read-only pages (memory grows with every row).
- Expecting a second query to refresh an entity the context already tracks — use a new context or
  \`Entry(e).ReloadAsync()\`.`,
    workedExample: `**Problem:** predict exactly what \`SaveChangesAsync\` sends.

    var pen = await db.Products.SingleAsync(p => p.Sku == "PEN-01");     // tracked
    var pencil = await db.Products.AsNoTracking().SingleAsync(p => p.Sku == "PCL-01");
    var eraser = await db.Products.SingleAsync(p => p.Sku == "ERS-01");  // tracked

    pen.Price = pen.Price;                  // same value
    pencil.Price = 12m;                     // changed
    eraser.Quantity -= 5;                   // changed
    db.Products.Add(new Product { Sku = "SHR-01", Name = "Sharpener", Price = 15m, CategoryId = 2 });
    db.Products.Remove(await db.Products.SingleAsync(p => p.Sku == "OLD-99"));

    var n = await db.SaveChangesAsync();

**pen** — tracked, but the value assigned equals the snapshot. \`DetectChanges\` compares values,
not assignments, so pen stays \`Unchanged\`: no SQL.

**pencil** — loaded with \`AsNoTracking\`, so it is \`Detached\`. The change is invisible to the context:
no SQL. (This is the bug to look for when "the save did nothing".)

**eraser** — tracked and \`Quantity\` differs from the snapshot: \`Modified\`, and only that column is
written: \`UPDATE [Products] SET [Quantity] = @p0 WHERE [Id] = @p1\`.

**sharpener** — \`Added\`: an INSERT, and the new IDENTITY \`Id\` is read back into the object.

**OLD-99** — loaded (tracked) then \`Remove\`d: \`Deleted\`, a DELETE by key.

**Result:** three statements — one UPDATE, one INSERT, one DELETE — in one transaction, and
\`n == 3\`. If any fails, none is kept.`,
    mcqs: [
      mcq('A product is loaded with AsNoTracking, its price is changed, and SaveChangesAsync is called. What is written?', [
        ['An UPDATE of the price, since the product has a key', false],
        ['Nothing, because the context is not tracking that object', true],
        ['An UPDATE of every column of the product row', false],
        ['An exception for modifying an untracked entity', false],
      ], 'A no-tracking query returns detached objects with no snapshot. SaveChanges only looks at tracked entities, so the change never reaches the database.'),
      mcq('An API builds new Product { Id = 7, Price = 30m } from a request and calls db.Products.Update(product). The table also has Name, Sku and Quantity. What happens to them?', [
        ['They keep their values, because only Price was assigned', false],
        ['They are overwritten with the defaults the new object holds', true],
        ['EF Core loads them first so it can keep their values', false],
        ['Update throws because the object was never loaded', false],
      ], 'Update marks every property Modified. The new object\'s Name and Sku are empty and its Quantity is 0, and the UPDATE writes all of them. Load-then-copy, or mark single properties modified, avoids this.'),
      mcq('A context already tracks product 5. Code then calls db.Attach(new Product { Id = 5 }). What happens?', [
        ['The new instance quietly replaces the tracked one in the change tracker', false],
        ['It throws: another instance with the same key is already tracked', true],
        ['Both instances are tracked and both will be saved', false],
        ['The new instance is ignored and nothing is reported', false],
      ], 'A context keeps one instance per key. Attaching a second fails with "cannot be tracked because another instance with the same key value for {\'Id\'} is already being tracked".'),
    ],
    checkpoint: [
      mcq('An existing Customer, loaded by a different context, is set as order.Customer on a new Order. The code calls db.Orders.Add(order) and SaveChangesAsync. What goes wrong?', [
        ['Nothing — EF Core sees that the customer has an Id and leaves it Unchanged', false],
        ['EF Core tries to INSERT the customer again, as Add marks the graph Added', true],
        ['The order is inserted with a NULL CustomerId', false],
        ['The customer row is updated with all of its current values', false],
      ], 'Add puts every untracked reachable entity in the Added state, keys or not. Inserting the customer with an explicit id then fails with "Cannot insert explicit value for identity column in table \'Customers\' when IDENTITY_INSERT is set to OFF." Set order.CustomerId instead.'),
      mcq('Two tracking queries in one context load product 3. Between them another user changes its price in the database. What does the second query give?', [
        ['A second object holding the new price from the database', false],
        ['The same instance as the first, still with the old price', true],
        ['The same instance, its price refreshed to the new value', false],
        ['An exception, because the row changed between the two', false],
      ], 'Identity resolution returns the instance the context already tracks, and EF Core does not overwrite a tracked entity with database values. Use a fresh context or ReloadAsync to see the change.'),
      mcq('A tracked product has Price 25m. Code sets product.Price = 25m and calls SaveChangesAsync. What does SaveChangesAsync return?', [
        ['1, because the property was assigned', false],
        ['0, because no value actually changed', true],
        ['-1, the value SQL Server reports for a no-op', false],
        ['It throws, since there was nothing to save', false],
      ], 'DetectChanges compares current values with the snapshot, not whether a setter ran. The entity stays Unchanged, no SQL is sent, and zero rows are reported.'),
    ],
  },

  /* ── RAW_SQL_CONCURRENCY ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_EFCORE_RAW_SQL_CONCURRENCY',
    notes: `LINQ covers most queries. For the rest — a hand-tuned query, a stored procedure, a bulk
change — EF Core lets you send SQL yourself, safely. And when two users edit the same row, it can
detect the clash.

## Raw SQL queries

    // EF Core 7+: FromSql takes an interpolated string and turns each hole into a parameter
    var cheap = await db.Products
        .FromSql($"SELECT * FROM Products WHERE Price < {maxPrice}")
        .Where(p => p.Quantity > 0)          // composed: EF Core wraps the SQL as a subquery
        .OrderBy(p => p.Name)
        .ToListAsync();

\`FromSql\` (and the older \`FromSqlInterpolated\`) receives a \`FormattableString\`, so \`{maxPrice}\`
becomes \`@p0\` — never text pasted into the SQL. The result must return every column of the entity.

\`FromSqlRaw\` takes a plain string, for SQL built dynamically. Use placeholders there too:

    db.Products.FromSqlRaw("SELECT * FROM Products WHERE Sku = {0}", sku);       // parameterised
    db.Products.FromSqlRaw("SELECT * FROM Products WHERE Sku = '" + sku + "'");  // SQL injection

For results that are not entities, EF Core 8 added \`Database.SqlQuery<T>\` for unmapped types
(EF Core 7 supported only scalars):

    var rows = await db.Database
        .SqlQuery<CategoryValue>($"SELECT c.Name, SUM(p.Price * p.Quantity) AS Value FROM Products p JOIN Categories c ON c.Id = p.CategoryId GROUP BY c.Name")
        .ToListAsync();

## Bulk updates and deletes — ExecuteUpdate and ExecuteDelete (EF Core 7+)

Before EF Core 7, raising every price in a category meant loading every product, changing it, and
saving — one UPDATE per row. Now:

    int changed = await db.Products
        .Where(p => p.CategoryId == 3)
        .ExecuteUpdateAsync(s => s
            .SetProperty(p => p.Price, p => p.Price * 1.10m)
            .SetProperty(p => p.UpdatedAt, DateTime.UtcNow));
    // UPDATE [p] SET [p].[Price] = [p].[Price] * 1.10, ... FROM [Products] AS [p] WHERE [p].[CategoryId] = 3

    await db.StockMovements.Where(m => m.At < cutoff).ExecuteDeleteAsync();

These run **immediately**, as one statement. They do not go through the change tracker: they are not
part of \`SaveChanges\`, entities already tracked keep their old values, and concurrency tokens are
not checked. For non-query SQL there is also \`Database.ExecuteSqlAsync($"...")\` (EF Core 7+;
earlier \`ExecuteSqlInterpolatedAsync\`).

## Explicit transactions

\`SaveChanges\` is already one transaction. When a unit of work needs **several** \`SaveChanges\` calls,
or mixes them with \`ExecuteUpdate\`, wrap them:

    await using var tx = await db.Database.BeginTransactionAsync();
    try
    {
        await db.Products.Where(p => p.Id == fromId)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.Quantity, p => p.Quantity - qty));
        db.StockMovements.Add(new StockMovement { ProductId = fromId, Quantity = -qty });
        await db.SaveChangesAsync();
        await tx.CommitAsync();
    }
    catch
    {
        await tx.RollbackAsync();     // disposing without commit also rolls back
        throw;
    }

If the context uses \`EnableRetryOnFailure()\`, a user-started transaction fails with "The configured
execution strategy 'SqlServerRetryingExecutionStrategy' does not support user-initiated
transactions." Run the whole block through \`db.Database.CreateExecutionStrategy().ExecuteAsync(...)\`
so it can be retried as a unit.

## Optimistic concurrency with rowversion

Two shop managers open product 7 (quantity 40). One sells 10 and saves 30; the other receives 5
and saves 45. The second save silently erases the first — a **lost update**.

    public class Product
    {
        public int Id { get; set; }
        public int Quantity { get; set; }
        [Timestamp]
        public byte[] RowVersion { get; set; } = null!;     // SQL Server rowversion
    }
    // or: modelBuilder.Entity<Product>().Property(p => p.RowVersion).IsRowVersion();

SQL Server changes a \`rowversion\` column automatically on every update. EF Core adds it to the
WHERE clause:

    UPDATE [Products] SET [Quantity] = @p0
    WHERE [Id] = @p1 AND [RowVersion] = @p2;     -- the version this context loaded

If someone changed the row in between, the WHERE matches nothing, 0 rows are affected, and EF Core
throws \`DbUpdateConcurrencyException\`: "The database operation was expected to affect 1 row(s), but
actually affected 0 row(s); data may have been modified or deleted since entities were loaded."

    try { await db.SaveChangesAsync(); }
    catch (DbUpdateConcurrencyException ex)
    {
        var entry = ex.Entries.Single();
        var current = await entry.GetDatabaseValuesAsync();
        if (current is null) return Conflict("The product was deleted.");
        // Option: tell the user and let them retry with fresh data
        // Option: re-apply the change to the current values and save again
        entry.OriginalValues.SetValues(current);
        // ...recompute, then SaveChangesAsync() again
    }

\`[ConcurrencyCheck]\` on an ordinary property does the same with that property's value instead of
a rowversion.

## Common mistakes

- Concatenating user input into \`FromSqlRaw\` or \`ExecuteSqlRaw\`.
- Expecting \`ExecuteUpdate\` to refresh entities the context already holds.
- Catching \`DbUpdateConcurrencyException\` and simply saving again — that is the lost update with
  extra steps.`,
    mcqs: [
      mcq('Which query is open to SQL injection when sku comes from the user?', [
        ['db.Products.FromSqlInterpolated($"SELECT * FROM Products WHERE Sku = {sku}")', false],
        ['db.Products.FromSqlRaw("SELECT * FROM Products WHERE Sku = \'" + sku + "\'")', true],
        ['db.Products.FromSqlRaw("SELECT * FROM Products WHERE Sku = {0}", sku)', false],
        ['db.Products.Where(p => p.Sku == sku)', false],
      ], 'FromSql turns interpolation holes into parameters, and FromSqlRaw parameterises its {0} placeholders. Concatenating the value into the string pastes it into the SQL text, so a crafted SKU changes the statement.'),
      mcq('Code tracks product 4 with Price 100, then runs db.Products.Where(p => p.Id == 4).ExecuteUpdateAsync(s => s.SetProperty(p => p.Price, 120m)). What is product.Price in memory afterwards?', [
        ['120, because EF Core refreshes tracked entities after it', false],
        ['100, because ExecuteUpdate bypasses the change tracker', true],
        ['0, because the tracked entity is detached by the update', false],
        ['It throws, because the product is already being tracked', false],
      ], 'ExecuteUpdate sends one UPDATE straight to the database and does not touch tracked objects. The context still holds 100 until the entity is reloaded or a new context is used.'),
      mcq('Product has a [Timestamp] RowVersion. Two users load it, both change Quantity, and both save. What happens to the second save?', [
        ['It overwrites the first save, as the last write always wins', false],
        ['It throws DbUpdateConcurrencyException, as 0 rows matched', true],
        ['SQL Server merges the two quantity changes into one', false],
        ['It waits for the first user\'s transaction to be released', false],
      ], 'The UPDATE includes the row version the second user loaded. The first save changed it, so no row matches, 0 rows are affected, and EF Core raises the concurrency exception instead of losing the first update.'),
    ],
    checkpoint: [
      mcq('A context is configured with EnableRetryOnFailure, and code calls BeginTransactionAsync before two SaveChangesAsync calls. It throws at once. What is the fix?', [
        ['Remove the transaction and rely on SaveChanges alone', false],
        ['Run the block through CreateExecutionStrategy().ExecuteAsync', true],
        ['Call SaveChangesAsync(acceptAllChangesOnSuccess: false)', false],
        ['Use TransactionScope with the default retry options', false],
      ], 'A retrying strategy cannot retry part of a user-started transaction, so it refuses it. Wrapping the whole transaction in the execution strategy lets it retry the entire unit together.'),
      mcq('What does this statement send?\n\n    await db.StockMovements\n        .Where(m => m.At < cutoff)\n        .ExecuteDeleteAsync();', [
        ['A SELECT of the movements, then one DELETE per movement', false],
        ['One DELETE ... WHERE [At] < @cutoff, sent immediately', true],
        ['Nothing until SaveChangesAsync is called later on', false],
        ['A DELETE of every row, since Where is ignored here', false],
      ], 'ExecuteDelete (EF Core 7+) translates the query into a single DELETE with its WHERE clause and runs it at once, without loading or tracking any entity.'),
      mcq('Inside a DbUpdateConcurrencyException handler, entry.GetDatabaseValuesAsync() returns null. What does that mean?', [
        ['The row version was reset to its default value', false],
        ['The row has been deleted by someone else', true],
        ['The database is unreachable at the moment', false],
        ['The entity was never saved with a version', false],
      ], 'GetDatabaseValuesAsync reads the current row by key. Null means there is no row any more, so the conflict is with a delete, and the user should be told rather than the update retried.'),
    ],
  },

  /* ── DEBUGGING ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_EFCORE_DEBUGGING',
    notes: `EF Core bugs rarely look like bugs in your C#. The code reads correctly; the SQL EF Core
produced, or the state an entity was in, is what is wrong. So the first move is always the same:
**log the SQL and read what was sent.**

    options.UseSqlServer(cs)
           .LogTo(Console.WriteLine, LogLevel.Information)
           .EnableSensitiveDataLogging()        // parameter values — never in production
           .EnableDetailedErrors();

Below are the faults you will meet, each with the symptom, the cause and the fix.

## 1. "No database provider has been configured for this DbContext."

**Symptom:** the first query throws this, continuing "A provider can be configured by overriding the
'DbContext.OnConfiguring' method or by using 'AddDbContext' on the application service provider."
**Cause:** the context has a parameterless constructor and no \`OnConfiguring\`, or it has a
constructor taking \`DbContextOptions\` that does not pass it to \`base(options)\`.
**Fix:** \`public InventoryContext(DbContextOptions<InventoryContext> options) : base(options) { }\`
and register it with \`AddDbContext\`.

## 2. "Invalid object name 'Products'."

**Symptom:** a \`SqlException\` on the first query against a fresh database.
**Cause:** the migration was added but never applied — or applied to a different database than the
connection string the app uses.
**Fix:** \`dotnet ef database update\`, and check which connection string the tools read
(the environment matters: Development vs Production settings).

## 3. The list page sends 201 queries

**Symptom:** 200 orders, 201 SELECTs in the log, one \`SELECT ... FROM [Customers] WHERE [c].[Id] = @p\`
per order.
**Cause:** lazy-loading proxies are on, and the view reads \`order.Customer.Name\`.
**Fix:** project to a DTO in the query (\`Select(o => new { o.Id, CustomerName = o.Customer.Name })\`)
or \`Include(o => o.Customer)\`.

## 4. "A second operation was started on this context instance before a previous operation completed."

**Symptom:** intermittent \`InvalidOperationException\` under load, or in code using \`Task.WhenAll\`.
**Cause:** two queries running on one context at the same time — an un-awaited \`ToListAsync\`, a
parallel loop, or a context captured by a singleton service. A context is not thread-safe.
**Fix:** await each call before the next; give parallel work its own context
(\`IDbContextFactory<T>\`); never inject a context into a singleton.

## 5. "Cannot insert explicit value for identity column in table 'Customers' when IDENTITY_INSERT is set to OFF."

**Symptom:** saving a new order fails, and the failing statement is an INSERT into **Customers**.
**Cause:** the order's \`Customer\` navigation holds a customer loaded by another context (or built
from a DTO). \`Add(order)\` marked it \`Added\` too, so EF Core tries to insert it with its id.
**Fix:** set \`order.CustomerId = customer.Id\` and leave the navigation null, or \`Attach\` the
customer first so it is \`Unchanged\`.

## 6. "The instance of entity type 'Product' cannot be tracked because another instance with the same key value for {'Id'} is already being tracked."

**Symptom:** \`Update(dtoProduct)\` throws in an edit action.
**Cause:** earlier in the same request the product was loaded with tracking (for validation, say),
and now a second instance with the same key is handed to the context.
**Fix:** copy the DTO onto the instance you already loaded, or load the first one with
\`AsNoTracking\`.

## 7. The save "did nothing"

**Symptom:** no exception, \`SaveChangesAsync\` returns 0, the row is unchanged.
**Cause:** the entity came from an \`AsNoTracking\` query (or a different context instance), so this
context is not tracking it.
**Fix:** load it with tracking in the context that saves, or attach it and mark the changed
properties modified.

## 8. "The LINQ expression ... could not be translated."

**Symptom:** \`InvalidOperationException\` on a query that compiles fine.
**Cause:** a C# method, a custom property without a mapped column, or a \`StringComparison\` overload
inside \`Where\`/\`OrderBy\`.
**Fix:** rewrite the condition in terms EF Core translates; or, after the rows are already reduced,
call \`AsEnumerable()\` and finish in memory — deliberately.`,
    mcqs: [
      mcq('Saving a new order fails with "Cannot insert explicit value for identity column in table \'Customers\' when IDENTITY_INSERT is set to OFF." The order\'s Customer was loaded in another request. What is the cause?', [
        ['The Customers table is missing its IDENTITY property', false],
        ['Add marked the attached customer Added, so EF Core inserted it', true],
        ['The order\'s own Id was set by hand before saving', false],
        ['IDENTITY_INSERT must be turned on for every SaveChanges call', false],
      ], 'Add tracks the reachable graph as Added, including an existing customer with an id. EF Core then tries to INSERT it with that id. Setting CustomerId instead of the navigation avoids it.'),
      mcq('An endpoint fires three queries with Task.WhenAll on the same injected context and sometimes throws "A second operation was started on this context instance". What is the fix?', [
        ['Wrap the three queries in an explicit transaction', false],
        ['Await the queries one after another, or use one context each', true],
        ['Add MultipleActiveResultSets=True to the connection string', false],
        ['Change the context registration from scoped to singleton so it is shared', false],
      ], 'A DbContext supports one operation at a time. Running the queries sequentially, or creating a context per parallel task with IDbContextFactory, removes the overlap. MARS does not make the context thread-safe.'),
      mcq('The first query on a new developer machine throws SqlException "Invalid object name \'Products\'." The migration files exist in the repository. What is the likely cause?', [
        ['The Products DbSet is declared with the wrong generic type', false],
        ['The migrations were never applied to that database', true],
        ['SQL Server table names are case-sensitive by default', false],
        ['EnsureCreated must be called before every single query', false],
      ], 'Migration files only describe the schema. Until dotnet ef database update runs against the database the app connects to, the table does not exist and SQL Server reports an invalid object name.'),
      mcq('An edit action loads product 9 with tracking to validate it, then calls db.Products.Update(productFromDto) for the same id and gets an exception. Which change fixes it?', [
        ['Call SaveChanges before Update so the first is released', false],
        ['Copy the DTO values onto the product already loaded', true],
        ['Use Attach instead of Update for the DTO product', false],
        ['Mark the RowVersion property as a concurrency token', false],
      ], 'The context already tracks an instance with key 9, so tracking a second one fails whether through Update or Attach. Updating the loaded instance uses the tracker as intended and sends only the changed columns.'),
    ],
  },

  /* ── PRACTICE ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_EFCORE_PRACTICE',
    notes: `Work these in a .NET 8 console project with \`Microsoft.EntityFrameworkCore.SqlServer\` and
\`Microsoft.EntityFrameworkCore.Design\`, against SQL Server (LocalDB or the Developer edition in
Docker). Turn on \`LogTo(Console.WriteLine, LogLevel.Information)\` and keep it on: for every
exercise, **predict the SQL before you run it**, then compare with the log.

## Exercise 1 — Map a library

Model \`Author\`, \`Book\` and \`Genre\`: a book has one author, an author has many books, books and
genres are many-to-many with no join class. \`Book.Title\` is required, max 200; \`Book.Isbn\` is
unique, max 13; \`Book.Price\` is \`decimal(8,2)\`; \`Book.Format\` is an enum stored as a string.
Use the Fluent API in an \`IEntityTypeConfiguration<Book>\`. Add the migration and read it: one join
table, \`BookGenre\`.

## Exercise 2 — Migrate, rename, seed

Seed three genres with \`HasData\`. Then rename \`Book.Price\` to \`ListPrice\`, add a migration, and
fix the generated drop-and-add into a \`RenameColumn\`. Apply it and confirm the prices survived.
Finally run \`dotnet ef migrations script --idempotent\` and read the output.

## Exercise 3 — Six queries

Write and run: (a) books under a price, sorted by title, page 2 of 10; (b) books by an author's
name; (c) authors with no books; (d) number of books per genre, as a DTO; (e) the most expensive
book or \`null\`; (f) books whose ISBN is in a list of ten. Write down the SQL for (f) — EF Core 8
uses \`OPENJSON\`.

## Exercise 4 — Cause and cure an N+1

Turn on lazy-loading proxies. Load all books and print each author's name; count the statements.
Then fix it three ways — \`Include\`, a projection to \`{ Title, AuthorName }\`, and loading the
authors once with \`Contains\` — and record the statement count for each. Turn proxies off again and
note what the original code does now.

## Exercise 5 — Predict SaveChanges

In one context: load a book with tracking and one with \`AsNoTracking\`; change both; set a third
book's price to the value it already has; add a new book; remove one. Write down the states
(\`db.Entry(x).State\`) and the SQL you expect, then call \`SaveChangesAsync\` and compare the log and
its return value.

## Exercise 6 — A real concurrency conflict

Add \`[Timestamp] byte[] RowVersion\` to \`Book\`. Open two contexts, load the same book in each,
change the price in both, save the first, then the second. Catch \`DbUpdateConcurrencyException\`,
show the current database values, and implement "reload and re-apply" for a stock-like field.`,
    mcqs: [
      mcq('In Exercise 1, Book and Genre each hold a List of the other with no join class. Which table does the migration create for the link?', [
        ['BookGenre, with BooksId and GenresId as a composite key', true],
        ['Books_Genres, with one IDENTITY Id column and two foreign keys', false],
        ['No table — a GenreIds column of type nvarchar(max) on Books', false],
        ['GenreBook, with BookId and GenreId and no primary key at all', false],
      ], 'EF Core names the implicit join entity after the two entity types and its columns after the navigations plus Id, with a composite key over both.'),
      mcq('In Exercise 2, after renaming Price to ListPrice, the scaffolded migration drops Price and adds ListPrice. Which edit keeps the data?', [
        ['Add defaultValue: 0m to the AddColumn call', false],
        ['Replace both calls with migrationBuilder.RenameColumn', true],
        ['Move the DropColumn call below the AddColumn call', false],
        ['Delete the ModelSnapshot file and add the migration again', false],
      ], 'Reordering still drops the old column and its values. RenameColumn issues sp_rename on SQL Server, so the values stay in place under the new name.'),
      mcq('In Exercise 3(c), which query returns authors with no books?', [
        ['db.Authors.Where(a => !a.Books.Any())', true],
        ['db.Authors.Include(a => a.Books).Where(a => a.Books == null)', false],
        ['db.Authors.Where(a => a.Books.Count() < 0)', false],
        ['db.Books.Where(b => b.Author == null).Select(b => b.Author)', false],
      ], '!Any() translates to NOT EXISTS over the books for each author. A loaded collection is never null, so comparing it with null finds nothing.'),
      mcq('In Exercise 4, with lazy-loading proxies on, 100 books by 100 different authors are listed with each author\'s name. How many statements run?', [
        ['1', false],
        ['101', true],
        ['2', false],
        ['100', false],
      ], 'One query loads the books, then each first read of book.Author initialises that proxy with its own SELECT: one plus one hundred.'),
      mcq('In Exercise 5, the tracked book\'s price is set to the value it already had. What state does db.Entry(book).State report after DetectChanges?', [
        ['Modified, because the setter was called', false],
        ['Unchanged, because the value is the same', true],
        ['Detached, because nothing was really changed', false],
        ['Added, because it now differs from its snapshot', false],
      ], 'Snapshot change tracking compares values. Assigning an equal value leaves the property unmodified, so the entity stays Unchanged and SaveChanges writes nothing for it.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_EFCORE_INTERVIEW_QUESTION',
    notes: `Three questions that come up in nearly every .NET backend interview that touches data
access, with answers at the level that earns a follow-up rather than "next question".

## Q1. "What is the difference between IQueryable and IEnumerable in EF Core?"

**Strong answer:** \`IQueryable<T>\` holds an **expression tree** that EF Core translates to SQL when the
query is enumerated, so \`Where\`, \`OrderBy\`, \`Take\` added to it run **in the database**.
\`IEnumerable<T>\` is LINQ to Objects: once a query is an \`IEnumerable\` — after \`ToList\`, or
\`AsEnumerable\` — every further operator runs in memory on rows already fetched. So a repository
method that returns \`IEnumerable<Product>\` and is then filtered by the caller has already loaded
every product. I keep queries as \`IQueryable\` until the shape is final, then materialise once.

**Follow-up:** "So should a repository return \`IQueryable\`?" — it gives callers full composition,
but leaks EF Core out of the data layer, and the query may be enumerated after the context is
disposed. I return materialised results or DTOs from specific methods
(\`GetLowStockAsync(threshold)\`) and keep \`IQueryable\` inside.

## Q2. "What is the N+1 problem in EF Core, and how do you avoid it?"

**Strong answer:** one query loads N rows, then something fires one more query per row — N+1
round trips where one would do. In EF Core it needs either **lazy-loading proxies**, which are off
by default, or a **query inside a loop**. Without proxies, an un-included navigation is simply null,
which fails loudly instead. To avoid it: **project** to a DTO, which reads related columns in the
same query; **Include** when I need the entities to modify them; or load the related set once with
\`Contains\` and join in memory. I find it by counting statements in the SQL log.

**Follow-up:** "Include with two collections is slow — why?" — a single query joining two
collections returns the product of their rows, the cartesian explosion. \`AsSplitQuery()\` sends one
query per collection instead; the trade-off is more round trips and no single consistent snapshot
outside a transaction.

## Q3. "How does EF Core know what to save, and how do you handle two users editing the same row?"

**Strong answer:** tracking queries store a snapshot of original values; \`SaveChanges\` calls
\`DetectChanges\`, compares, and writes INSERTs for \`Added\`, UPDATEs of only the changed columns for
\`Modified\`, DELETEs for \`Deleted\` — all in one transaction. For read-only queries I use
\`AsNoTracking\`. For concurrent edits I use **optimistic concurrency**: a \`rowversion\` column marked
\`[Timestamp]\`. EF Core adds it to the UPDATE's WHERE; if another user changed the row, zero rows
match and it throws \`DbUpdateConcurrencyException\`. I catch it, read the current values with
\`GetDatabaseValuesAsync\`, and either show the user the conflict or re-apply a commutative change
(like a stock delta) to the fresh values.

**Follow-up:** "Why not pessimistic locking?" — holding a database lock while a user looks at a
form blocks everyone else and does not survive a stateless web request. Optimistic concurrency costs
nothing until a conflict actually happens, which on most rows is rare. For a hot counter, an atomic
\`ExecuteUpdate\` (\`SET Quantity = Quantity - @n WHERE Quantity >= @n\`) avoids the conflict entirely.`,
    mcqs: [
      mcq('A repository method returns IEnumerable<Product> from db.Products, and the caller adds .Where(p => p.Quantity < 5).Take(10). What reaches SQL Server?', [
        ['A query with the WHERE and TOP(10) applied in the database', false],
        ['A SELECT of every product; the filter and Take run in memory', true],
        ['Nothing, because IEnumerable is never executed by EF Core', false],
        ['A query that has the TOP(10) but not the WHERE clause', false],
      ], 'Once the query is typed as IEnumerable, further operators bind to LINQ to Objects. Enumeration sends the original query and the caller\'s filter runs over every row in memory.'),
      mcq('An interviewer asks why EF Core 8, out of the box, does not usually produce N+1 from reading a navigation. What is the accurate answer?', [
        ['It batches navigation reads into one IN query automatically', false],
        ['Lazy loading is opt-in, so unloaded navigations are just null', true],
        ['It loads every navigation eagerly unless it is told not to', false],
        ['SQL Server caches the repeated SELECTs for the same table', false],
      ], 'Without the Proxies package and UseLazyLoadingProxies, EF Core never runs a query when a navigation is read. N+1 then needs a query written inside a loop.'),
      mcq('A stock counter is decremented by many requests at once. Which approach avoids both lost updates and repeated concurrency exceptions?', [
        ['Load, decrement in C#, SaveChanges without any version column', false],
        ['ExecuteUpdate setting Quantity = Quantity - n where enough remains', true],
        ['A rowversion column, plus retrying the same save in a loop until it succeeds', false],
        ['AsNoTracking reads followed by Update calls on each request', false],
      ], 'A single UPDATE that computes the new value from the current one is atomic in SQL Server, and its WHERE refuses to go below zero. No read-modify-write window exists, so there is nothing to conflict.'),
    ],
  },

  /* ── MINI_PROJECT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_EFCORE_MINI_PROJECT',
    notes: `# Mini Project — The Inventory App on EF Core

In the ADO.NET topic you built a console inventory app on SQL Server with a repository layer,
parameterised \`SqlCommand\`s and a transaction for every stock transfer. Rebuild it on **.NET 8 +
EF Core 8 + SQL Server**, keep the same behaviour, and then write down honestly what got simpler and
what got harder.

## The model

- **Category** — Id, Name (unique, max 60). Has many products.
- **Supplier** — Id, Name, Email. Supplies many products at a cost price per product.
- **SupplierProduct** — SupplierId, ProductId (composite key), CostPrice \`decimal(10,2)\`,
  LeadTimeDays. The join class of a many-to-many with a payload.
- **Product** — Id, Sku (unique, max 40), Name (max 120), UnitPrice \`decimal(10,2)\`, Quantity,
  Status (enum stored as a string: Active, Discontinued), RowVersion (\`rowversion\`). Belongs to one
  category.
- **StockMovement** — Id, ProductId, Type (In, Out, Adjust, Transfer), Quantity, Reason, At
  (\`datetime2\`, defaulting to \`SYSUTCDATETIME()\`). Many per product.

## Requirements

1. **Mapping.** All configuration in \`IEntityTypeConfiguration<T>\` classes applied with
   \`ApplyConfigurationsFromAssembly\`. No string column is \`nvarchar(max)\` unless it is meant to be.
   Deleting a category or a product is **Restrict** — a product with movements is marked
   Discontinued, never deleted.
2. **Migrations.** The schema comes only from migrations (no \`EnsureCreated\`). Categories are seeded
   with \`HasData\`. Commit an idempotent script generated with \`dotnet ef migrations script --idempotent\`.
3. **Stock movement.** \`StockService.MoveAsync(sku, type, qty, reason)\` loads the product with
   tracking, refuses an Out that would take the quantity below zero, changes the quantity **without
   calling Update**, and adds a StockMovement — in one \`SaveChangesAsync\`.
4. **Concurrency on stock.** Two console sessions moving stock on the same product must not lose an
   update. Use the rowversion: on \`DbUpdateConcurrencyException\`, reload the current values, re-check
   the stock rule, re-apply the movement and retry (at most three times), then report a conflict.
5. **Transfers.** Moving stock from one product to another (a re-packed SKU) is one explicit
   transaction across two products and two movements; if anything fails, nothing changes.
6. **Reports, each one query, read-only (\`AsNoTracking\` or projection):**
   - low stock: products below a threshold with their category name, sorted by quantity;
   - stock value per category: \`GroupBy\` with \`Sum(p => p.UnitPrice * p.Quantity)\`;
   - movement history for one product between two dates, newest first, paged 20 at a time;
   - cheapest supplier for each product, from SupplierProduct.
7. **No N+1.** Every listing that prints related data gets it in the same query. Lazy-loading
   proxies are not used.
8. **Comparison note.** Half a page against your ADO.NET version: lines of code, what disappeared
   (reader mapping, hand-written UPDATEs), what appeared (change tracking, migrations, generated SQL
   to check).

## Acceptance criteria

- An Out of 15 on a product holding 10 is refused and neither Products nor StockMovements changes.
- Two sessions each moving Out 5 from a product holding 10 at the same moment end with quantity 0
  and two movements — never 5 with two movements.
- A failed transfer (the second product does not exist) leaves both quantities unchanged.
- Each report logs **one** SELECT with \`LogTo\`; the README shows it.
- Deleting a category that still has products is refused with a clear message.
- No migration was edited after it was applied; the rename of any column uses \`RenameColumn\`.

## What to submit

Repository link, README with sample runs and the SQL log of each report, and the comparison note.`,
    mcqs: [
      mcq('MoveAsync loads the product with tracking, subtracts the quantity, adds a StockMovement and calls SaveChangesAsync once. What does SQL Server receive?', [
        ['Two separate transactions, one for the product UPDATE and one for the INSERT', false],
        ['An UPDATE checked against RowVersion and an INSERT, in one transaction', true],
        ['Only the INSERT, as the product was never passed to Update', false],
        ['A DELETE and re-INSERT of the product, then the movement', false],
      ], 'The tracked product is Modified, so SaveChanges writes an UPDATE whose WHERE includes the row version, and the new movement is Added. One SaveChanges call runs both in one transaction.'),
      mcq('Why is the Supplier–Product link modelled with a SupplierProduct class instead of skip navigations?', [
        ['Skip navigations cannot be used with SQL Server at all', false],
        ['The link carries a cost price and lead time of its own', true],
        ['A composite key is impossible on implicit join tables', false],
        ['EF Core 8 removed many-to-many without a join class', false],
      ], 'CostPrice and LeadTimeDays belong to the pairing of a supplier and a product. An implicit join table has only the two keys, so a payload needs an explicit join entity.'),
    ],
    assignment: {
      title: 'The Inventory App on EF Core',
      description: 'The ADO.NET inventory app rebuilt on .NET 8, EF Core 8 and SQL Server: configured entities and relationships, migrations with seed data, transactional stock changes protected by a rowversion, single-query LINQ reports with no N+1, and a comparison with the ADO.NET version.',
      instructions: `Build the application described in this unit's brief and submit a repository link.

**Submit:**

1. The source: the five entities and their \`IEntityTypeConfiguration\` classes, the \`DbContext\`,
   \`StockService\` (move and transfer), the report queries, and a console entry point.
2. The Migrations folder and the idempotent SQL script generated from it.
3. A README with sample runs — a refused Out, a refused category delete, a failed transfer, and two
   sessions colliding on the same product — and the SQL log captured for each report.
4. The half-page comparison with your ADO.NET version.

**Before you submit,** run each report with \`LogTo\` at Information level and confirm it sends one
SELECT. A report that sends one query per row fails the "No N+1" criterion regardless of its output.`,
      rubric: [
        { criterion: 'Model and migrations', description: 'Entities configured with the Fluent API, bounded string lengths, explicit decimal precision, enum stored as text, Restrict delete behaviour, many-to-many with a payload; schema built only from migrations, seeded with HasData, idempotent script committed.', maxPoints: 25 },
        { criterion: 'Change tracking and transactions', description: 'Stock moves rely on the change tracker with one SaveChanges; refused moves change nothing; transfers run in one explicit transaction that rolls back completely on failure.', maxPoints: 20 },
        { criterion: 'Concurrency', description: 'A rowversion protects stock; DbUpdateConcurrencyException is handled by reloading, re-checking and re-applying with a retry limit; the collision run in the README ends with the correct quantity.', maxPoints: 20 },
        { criterion: 'Queries and N+1', description: 'All four reports are correct single queries using projections or AsNoTracking, paging is ordered, and SQL logs prove one SELECT per report; no lazy loading.', maxPoints: 20 },
        { criterion: 'Comparison with ADO.NET', description: 'The note names concrete code that disappeared and concrete concepts that appeared, with a reasoned view of when each approach fits.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_EFCORE_CHECKPOINT',
    notes: `Ten questions across the whole topic: the DbContext, mapping, migrations, LINQ queries,
relationships, loading and N+1, change tracking, raw SQL and concurrency. Most give a few lines of
C# and ask what SQL EF Core sends, what is saved, or what goes wrong. Work out the SQL first, then
read the options.`,
    checkpoint: [
      mcq('How many statements reach SQL Server?\n\n    var products = await db.Products.AsNoTracking().ToListAsync();\n    foreach (var p in products) p.Price *= 1.1m;\n    await db.SaveChangesAsync();', [
        ['One UPDATE per product, then the commit', false],
        ['Only the SELECT — the products are not tracked', true],
        ['One SELECT and one bulk UPDATE statement', false],
        ['None, since ToListAsync is deferred until SaveChanges', false],
      ], 'The SELECT runs at ToListAsync. The objects are detached, so SaveChanges finds nothing to write. ExecuteUpdate would be the one-statement way to raise every price.'),
      mcq('What is wrong with this configuration?\n\n    public class InventoryContext : DbContext\n    {\n        public InventoryContext(DbContextOptions<InventoryContext> options) { }\n        public DbSet<Product> Products => Set<Product>();\n    }', [
        ['DbSet properties must have a public setter to be mapped', false],
        ['The options are never passed to base, so no provider is set', true],
        ['The constructor must take DbContextOptions without a type', false],
        ['Nothing — AddDbContext injects the provider by property', false],
      ], 'Without : base(options) the DbContext never receives the configured provider, and the first query fails with "No database provider has been configured for this DbContext".'),
      mcq('A developer renames a property and runs migrations add, getting "An operation was scaffolded that may result in the loss of data." What should they do?', [
        ['Ignore it — EF Core keeps data across column renames', false],
        ['Edit the migration to use RenameColumn before applying it', true],
        ['Run database update with --force to suppress the warning', false],
        ['Delete __EFMigrationsHistory so the migration reruns cleanly', false],
      ], 'The scaffolded migration drops the old column and adds a new one. Replacing those operations with RenameColumn keeps the data; the warning exists to make you read the migration.'),
      mcq('What does this send?\n\n    var names = await db.Products\n        .Where(p => p.Quantity > 0)\n        .OrderBy(p => p.Name)\n        .Select(p => p.Name)\n        .Skip(40).Take(20)\n        .ToListAsync();', [
        ['SELECT every column of every matching product, then paging in memory', false],
        ['SELECT [p].[Name] ... ORDER BY ... OFFSET/FETCH for 20 rows', true],
        ['SELECT TOP(60) [p].[Name], then skipping 40 in memory', false],
        ['Two queries: a COUNT and then the page of names', false],
      ], 'Every operator comes before ToListAsync, so all of it is translated: one column, the WHERE, the ORDER BY, and OFFSET 40 ROWS FETCH NEXT 20 ROWS ONLY.'),
      mcq('StockMovement has a required FK to Product and a required FK to Warehouse, and Product has a required FK to Warehouse. The migration fails on SQL Server. Why?', [
        ['A table may not hold two foreign keys of the same type', false],
        ['Two cascade paths lead from Warehouse to StockMovements', true],
        ['Required relationships are not supported by SQL Server', false],
        ['The Warehouse table must be created after StockMovements', false],
      ], 'Required relationships cascade by default, so deleting a warehouse would reach movements directly and through products. SQL Server refuses multiple cascade paths; set one relationship to Restrict or NoAction.'),
      mcq('With lazy loading off, what does this print for an order that has three lines in the database?\n\n    var order = await db.Orders.FirstAsync(o => o.Id == 12);\n    Console.WriteLine(order.Lines.Count);   // Lines initialised to new()', [
        ['3, because EF Core loads collections on first access', false],
        ['0, unless the lines were already tracked by the context', true],
        ['It throws a NullReferenceException on order.Lines', false],
        ['3, because FirstAsync includes collections automatically', false],
      ], 'The query loaded only the order. The collection was initialised to an empty list, so it stays empty unless Include or explicit loading ran, or fix-up connected lines this context already tracked.'),
      mcq('Which query avoids the cartesian explosion when loading orders with both Lines and Payments?', [
        ['db.Orders.Include(o => o.Lines).Include(o => o.Payments)', false],
        ['db.Orders.Include(o => o.Lines).Include(o => o.Payments).AsSplitQuery()', true],
        ['db.Orders.Include(o => o.Lines.Concat(o.Payments))', false],
        ['db.Orders.AsNoTracking().Include(o => o.Lines).Include(o => o.Payments)', false],
      ], 'AsSplitQuery loads orders, lines and payments with three SELECTs instead of one join that multiplies lines by payments. AsNoTracking changes tracking, not the shape of the SQL.'),
      mcq('An API receives a DTO for product 7 with only Name and Price, builds new Product { Id = 7, Name = ..., Price = ... } and calls Update then SaveChanges. Which statement is true?', [
        ['Only Name and Price are written, as only they were set', false],
        ['Every mapped column is written, so Quantity becomes 0', true],
        ['Nothing is written until the product is loaded first', false],
        ['EF Core merges the DTO with the current database row', false],
      ], 'Update marks all properties Modified. Properties the DTO did not carry hold their C# defaults and overwrite the stored values. Load the product and copy the two fields instead.'),
      mcq('Which call runs without parameterising the user value?', [
        ['db.Database.ExecuteSqlAsync($"DELETE FROM Carts WHERE UserId = {userId}")', false],
        ['db.Database.ExecuteSqlRawAsync($"DELETE FROM Carts WHERE UserId = {userId}")', true],
        ['db.Database.ExecuteSqlRawAsync("DELETE FROM Carts WHERE UserId = {0}", userId)', false],
        ['db.Carts.Where(c => c.UserId == userId).ExecuteDeleteAsync()', false],
      ], 'ExecuteSqlRawAsync takes a plain string, so an interpolated string is formatted into SQL text before EF Core sees it. ExecuteSqlAsync receives a FormattableString and parameterises the hole.'),
      mcq('Product has a [Timestamp] RowVersion. A save throws DbUpdateConcurrencyException. Which handling is correct for a stock decrement?', [
        ['Catch it and call SaveChangesAsync again unchanged', false],
        ['Reload current values, re-check stock, re-apply and retry', true],
        ['Delete the RowVersion column so the save succeeds', false],
        ['Set the entity state to Added and save it as a new row', false],
      ], 'Saving again unchanged hits the same mismatch or, if the version is reset, overwrites the other user\'s change. Reloading, re-validating against current stock and re-applying the delta keeps both updates.'),
    ],
  },
];
