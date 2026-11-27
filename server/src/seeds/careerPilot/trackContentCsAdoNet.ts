/**
 * Career-track content (.NET Full Stack + AI, batch N2): ADO.NET (JT_ADONET).
 *
 * Every snippet targets .NET 8 with Microsoft.Data.SqlClient (5.x) against SQL Server 2022 — the
 * maintained provider, not the legacy System.Data.SqlClient that ships with .NET Framework. Where the
 * provider's behaviour changed between versions (Encrypt=True became the default in 4.0) the notes say
 * so. These units need a running SQL Server, so their practice is questions, exercises and a project
 * brief rather than auto-graded code — the grader has no database.
 *
 * The topic is single-skill, so no question names a skillKey.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_CS_ADONET_BUNDLES: PilotBundle[] = [
  /* ── CONNECTION ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ADONET_CONNECTION',
    notes: `**ADO.NET** is the low-level data-access API of .NET. Everything higher up — Dapper, Entity
Framework Core — is built on it, so when EF Core misbehaves, the error you read is an ADO.NET error.
The API is a set of abstract classes in \`System.Data.Common\` (\`DbConnection\`, \`DbCommand\`,
\`DbDataReader\`), and a **provider** implements them for one database. For SQL Server the provider is
**Microsoft.Data.SqlClient**.

## Adding the provider

    dotnet add package Microsoft.Data.SqlClient

and \`using Microsoft.Data.SqlClient;\` at the top of the file. You will still see
\`System.Data.SqlClient\` in old tutorials — that is the legacy provider, frozen apart from security
fixes. New code uses \`Microsoft.Data.SqlClient\`; the class names (\`SqlConnection\`, \`SqlCommand\`)
are the same, so mixing the two namespaces produces confusing "cannot convert" compile errors.

## The connection string

A connection string is a list of \`key=value\` pairs separated by semicolons:

    Server=localhost;Database=Inventory;User Id=inventory_app;Password=...;TrustServerCertificate=True

| Key | Meaning |
|---|---|
| \`Server\` (or \`Data Source\`) | host, optionally \`,port\` (default 1433) or \`\\instance\` — e.g. \`localhost\\SQLEXPRESS\`, \`(localdb)\\MSSQLLocalDB\` |
| \`Database\` (or \`Initial Catalog\`) | the database to use after login |
| \`User Id\` / \`Password\` | SQL Server authentication |
| \`Integrated Security=True\` | Windows authentication — log in as the Windows account running the program, no password in the string |
| \`Encrypt\` | encrypt the connection; **True by default since Microsoft.Data.SqlClient 4.0** |
| \`TrustServerCertificate=True\` | accept the server's certificate without validating it — acceptable on a dev machine, never in production |
| \`Connect Timeout\` | seconds to wait for a connection (default 15) |

The Encrypt default is the first thing that bites. A local SQL Server usually has a self-signed
certificate, so with the 4.0+ default the login fails with *"The certificate chain was issued by an
authority that is not trusted."* On a dev box add \`TrustServerCertificate=True\`; in production give
the server a real certificate instead.

Build strings with \`SqlConnectionStringBuilder\` when parts come from different places — it quotes
values correctly, so a password containing \`;\` cannot break the string:

    var csb = new SqlConnectionStringBuilder
    {
        DataSource = "localhost",
        InitialCatalog = "Inventory",
        UserID = "inventory_app",
        Password = Environment.GetEnvironmentVariable("INVENTORY_DB_PASSWORD"),
        TrustServerCertificate = true
    };
    string cs = csb.ConnectionString;

## Opening and closing

    using var conn = new SqlConnection(cs);
    conn.Open();
    Console.WriteLine($"Connected to SQL Server {conn.ServerVersion}");
    // conn.Dispose() runs here, at the end of the enclosing block

Constructing a \`SqlConnection\` does nothing on the network; \`Open()\` connects and logs in.
\`SqlConnection\` is \`IDisposable\`, and \`using\` disposes it on every exit path — including when an
exception is thrown. \`Dispose()\` and \`Close()\` are equivalent for a connection: both release it
(back to the pool, as the async unit explains). A \`using var\` declaration (C# 8) disposes at the end
of the enclosing block; the older \`using (var conn = ...) { }\` statement disposes at its closing brace.

## Keeping secrets out of code

Never commit a connection string with a password. In a console app read it from an environment
variable; in ASP.NET Core it lives in the \`ConnectionStrings\` section of configuration and is read with
\`builder.Configuration.GetConnectionString("Inventory")\` — with the real value supplied by user
secrets on a dev machine and an environment variable or a vault in production. Windows authentication
(\`Integrated Security=True\`) avoids a password entirely when the program runs as a Windows account.

## Common mistakes

- Using \`System.Data.SqlClient\` in a new .NET 8 project because a tutorial did.
- Forgetting \`using\`, so connections are released only when the garbage collector gets round to it.
- Writing \`localhost\\SQLEXPRESS\` in a normal C# string literal: \`"localhost\\SQLEXPRESS"\` has an
  invalid \`\\S\` escape and does not compile — use \`@"localhost\\SQLEXPRESS"\` or double the backslash.
- Catching \`SqlException\` and printing nothing: \`ex.Number\` (18456 = login failed, 4060 = cannot
  open database) tells you exactly which problem you have.`,
    workedExample: `**Problem:** a console tool must connect to the \`Inventory\` database on the local SQL Server
Express instance, with the password from an environment variable, print the server version, and report
a failure clearly.

    using Microsoft.Data.SqlClient;

    var password = Environment.GetEnvironmentVariable("INVENTORY_DB_PASSWORD")
        ?? throw new InvalidOperationException("Set INVENTORY_DB_PASSWORD first.");

    var csb = new SqlConnectionStringBuilder
    {
        DataSource = @"localhost\\SQLEXPRESS",
        InitialCatalog = "Inventory",
        UserID = "inventory_app",
        Password = password,
        TrustServerCertificate = true   // dev only: self-signed certificate
    };

    try
    {
        using var conn = new SqlConnection(csb.ConnectionString);
        conn.Open();
        Console.WriteLine($"OK: {conn.DataSource} / {conn.Database} / {conn.ServerVersion}");
    }
    catch (SqlException ex)
    {
        Console.Error.WriteLine($"SQL error {ex.Number}: {ex.Message}");
    }

**Reasoning:** the builder keeps the password out of source and quotes it safely; the verbatim string
\`@"localhost\\SQLEXPRESS"\` names the named instance without an escape problem; \`TrustServerCertificate\`
is there because Microsoft.Data.SqlClient 4+ encrypts by default and a dev server's certificate is
self-signed; \`using var\` releases the connection whichever way the block ends; and printing
\`ex.Number\` separates "wrong password" (18456) from "no such database" (4060) from "server not found".`,
    mcqs: [
      mcq('A .NET 8 app upgraded from System.Data.SqlClient to Microsoft.Data.SqlClient 5 now fails to log in to a dev SQL Server with "The certificate chain was issued by an authority that is not trusted." Nothing else changed. Why?', [
        ['The newer provider encrypts by default and rejects the self-signed certificate', true],
        ['Microsoft.Data.SqlClient no longer supports SQL Server authentication logins', false],
        ['The new provider needs the port 1433 written explicitly in the Server key', false],
        ['The connection string must now use Initial Catalog instead of Database', false],
      ], 'Microsoft.Data.SqlClient 4.0 changed Encrypt to True by default, so the client now validates the server certificate, and a dev server\'s self-signed one fails. TrustServerCertificate=True (dev) or a proper certificate fixes it.'),
      mcq('What does the line var conn = new SqlConnection(cs); do on its own, before any other call?', [
        ['Creates the object only; nothing touches the network until Open()', true],
        ['Opens a TCP connection to SQL Server and logs in with the credentials', false],
        ['Validates the login against SQL Server but leaves the socket closed', false],
        ['Borrows an already-open connection from the pool straight away', false],
      ], 'The constructor only parses the connection string. Open() (or OpenAsync) is what connects, authenticates and — with pooling — borrows a physical connection from the pool.'),
      mcq('Which connection string logs in to SQL Server as the Windows account running the program, with no password stored anywhere?', [
        ['Server=localhost;Database=Inventory;Integrated Security=True', true],
        ['Server=localhost;Database=Inventory;User Id=Windows;Password=', false],
        ['Server=localhost;Database=Inventory;Encrypt=True;Password=none', false],
        ['Server=localhost;Database=Inventory;TrustServerCertificate=True', false],
      ], 'Integrated Security=True (also written Trusted_Connection=True) selects Windows authentication. TrustServerCertificate only concerns the TLS certificate and supplies no credentials at all.'),
    ],
    checkpoint: [
      mcq('A developer writes new SqlConnection("Server=localhost\\SQLEXPRESS;Database=Inventory;...") as an ordinary (non-verbatim) C# string literal with a single backslash. What happens?', [
        ['A compile error: \\S is not a valid escape sequence', true],
        ['It connects to the SQLEXPRESS named instance normally', false],
        ['It connects to the default instance and ignores SQLEXPRESS', false],
        ['It throws at runtime because the server name has no port', false],
      ], 'C# rejects unrecognised escape sequences such as \\S at compile time (error CS1009). Use a verbatim string @"localhost\\SQLEXPRESS" or write the backslash twice.'),
      mcq('Inside a method, using var conn = new SqlConnection(cs); conn.Open(); is followed by a line that throws. What happens to the connection?', [
        ['It is disposed as the exception leaves the method, releasing it', true],
        ['It stays open until the garbage collector finalises the object', false],
        ['It stays open because Dispose only runs when the method returns', false],
        ['It is disposed only if the exception is caught inside that method', false],
      ], 'A using declaration compiles to try/finally, so Dispose runs on every exit from the enclosing scope — a normal return or an exception propagating out.'),
      mcq('An app\'s SqlException has Number 18456. Which fault does that point to?', [
        ['The login failed: wrong user name or password', true],
        ['The database named in the string does not exist', false],
        ['The command took longer than its timeout allows', false],
        ['A unique constraint rejected an inserted row', false],
      ], 'Error 18456 is "Login failed for user ...". A missing or inaccessible database is 4060, a unique-key violation is 2627 or 2601, and a timeout surfaces as a separate timeout error.'),
    ],
  },

  /* ── COMMANDS_PARAMETERS ──────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ADONET_COMMANDS_PARAMETERS',
    notes: `A \`SqlCommand\` is one piece of SQL to run on one connection. How you put user values into
that SQL decides whether your application can be taken over by its own search box.

## The dangerous way: building the SQL text

    var sql = "SELECT Id, Name FROM Products WHERE Sku = '" + sku + "'";
    using var cmd = new SqlCommand(sql, conn);

If a user enters \`x' OR '1'='1\`, the WHERE clause becomes \`Sku = 'x' OR '1'='1'\` — true for every
row. Enter \`x'; DROP TABLE Products; --\` and SQL Server, which happily runs several statements in one
batch, drops the table. That is **SQL injection**: input crossing from data into code. Interpolation
(\`$"... WHERE Sku = '{sku}'"\`) is exactly the same bug with nicer syntax.

## The right way: parameters

    using var cmd = new SqlCommand(
        "SELECT Id, Name, Price FROM Products WHERE Sku = @sku", conn);
    cmd.Parameters.Add("@sku", SqlDbType.VarChar, 30).Value = sku;

The SQL text with \`@sku\` is fixed; the value travels separately (SqlClient sends it through
\`sp_executesql\`), so \`x' OR '1'='1\` is just an odd SKU that matches nothing. A parameter also gets
the type right — dates, decimals, Unicode — with no quoting by hand.

## AddWithValue and why to be careful with it

    cmd.Parameters.AddWithValue("@sku", sku);   // works, but infers the type

\`AddWithValue\` infers the SQL type from the .NET value. A C# \`string\` becomes \`nvarchar\`; if the
column is \`varchar\`, SQL Server must convert the column side, which can turn an index seek into a scan.
Its length also follows the value, so the same query is cached as several plans. Prefer
\`Parameters.Add(name, SqlDbType, size).Value = ...\` for anything that runs often.

## Choosing the Execute method

| Method | Use for | Returns |
|---|---|---|
| \`ExecuteNonQuery()\` | INSERT, UPDATE, DELETE, DDL | \`int\` rows affected (−1 for statements that affect no rows, such as DDL, or when \`SET NOCOUNT ON\` is in effect) |
| \`ExecuteScalar()\` | one value: \`COUNT(*)\`, a new id | \`object\`: first column of first row; \`null\` if no rows; \`DBNull.Value\` if that value is NULL |
| \`ExecuteReader()\` | rows | a \`SqlDataReader\` (next unit) |

    using var cmd = new SqlCommand(
        "UPDATE Products SET Price = @price WHERE Id = @id", conn);
    cmd.Parameters.Add("@price", SqlDbType.Decimal).Value = 14.50m;
    cmd.Parameters.Add("@id", SqlDbType.Int).Value = 7;
    int changed = cmd.ExecuteNonQuery();
    if (changed == 0) Console.WriteLine("No product 7");

## Getting the new id

    using var cmd = new SqlCommand(
        "INSERT INTO Products (Sku, Name, Price) OUTPUT INSERTED.Id VALUES (@sku, @name, @price)", conn);
    cmd.Parameters.Add("@sku", SqlDbType.VarChar, 30).Value = "PEN-01";
    cmd.Parameters.Add("@name", SqlDbType.NVarChar, 100).Value = "Blue Pen";
    cmd.Parameters.Add("@price", SqlDbType.Decimal).Value = 12.50m;
    int newId = (int)cmd.ExecuteScalar();

\`OUTPUT INSERTED.Id\` returns the \`IDENTITY\` value as an \`int\`. The older
\`SELECT SCOPE_IDENTITY()\` returns \`numeric(38,0)\`, which arrives as a boxed \`decimal\` — so
\`(int)cmd.ExecuteScalar()\` throws *InvalidCastException: Specified cast is not valid.* Write
\`SELECT CAST(SCOPE_IDENTITY() AS int)\` or use \`Convert.ToInt32\`.

## NULL parameters

A C# \`null\` as a parameter value means "parameter not supplied", not SQL NULL. Pass
\`DBNull.Value\`:

    cmd.Parameters.Add("@note", SqlDbType.NVarChar, 200).Value = (object?)note ?? DBNull.Value;

## What a parameter cannot be

A parameter is a **value** — never a table name, a column name, an \`ORDER BY\` column or a keyword.
For a user-chosen sort column, map the input to a fixed allow-list in C#. An \`IN\` list needs one
parameter per value (or a table-valued parameter).`,
    mcqs: [
      mcq('A search runs new SqlCommand($"SELECT * FROM Products WHERE Name LIKE \'%{term}%\'", conn). Why is this vulnerable even though it uses string interpolation rather than +?', [
        ['Interpolation still pastes the input into the SQL text that runs', true],
        ['Interpolated strings are only unsafe when the term contains digits', false],
        ['LIKE patterns are always run through sp_executesql automatically', false],
        ['It is not vulnerable, because interpolation escapes single quotes', false],
      ], 'An interpolated string is just string building: the user\'s text becomes part of the SQL. Only a parameter (@term, with the % wildcards placed in the value) keeps input as data.'),
      mcq('cmd.CommandText is "SELECT COUNT(*) FROM Products WHERE SupplierId = @s". What is the right way to read the count?', [
        ['(int)cmd.ExecuteScalar(), since COUNT(*) returns an int', true],
        ['cmd.ExecuteNonQuery(), which returns the number of rows counted', false],
        ['(long)cmd.ExecuteScalar(), since COUNT(*) returns a bigint', false],
        ['cmd.ExecuteReader().RecordsAffected after the reader is read', false],
      ], 'ExecuteScalar returns the first column of the first row, and COUNT(*) in SQL Server is int (COUNT_BIG is bigint). ExecuteNonQuery returns rows affected — -1 for a SELECT — not the count.'),
      mcq('cmd.Parameters.AddWithValue("@note", note) is called when note is null, and the INSERT fails with "...expects the parameter \'@note\', which was not supplied." What is the fix?', [
        ['Pass DBNull.Value when note is null, since null means not supplied', true],
        ['Declare the column as NOT NULL so that SQL Server rejects it earlier', false],
        ['Switch to ExecuteScalar, which treats a null parameter as SQL NULL', false],
        ['Remove the @ from the parameter name so SqlClient can find it again', false],
      ], 'SqlClient treats a parameter whose Value is C# null as missing. SQL NULL is DBNull.Value, typically written (object?)note ?? DBNull.Value.'),
    ],
    checkpoint: [
      mcq('An INSERT ends with ; SELECT SCOPE_IDENTITY(); and the code does int id = (int)cmd.ExecuteScalar();. What happens?', [
        ['InvalidCastException, since the value arrives as a boxed decimal', true],
        ['It works, because SCOPE_IDENTITY returns the column\'s int type', false],
        ['It returns null, because ExecuteScalar skips the INSERT batch', false],
        ['It returns the number of rows the INSERT statement affected', false],
      ], 'SCOPE_IDENTITY() is numeric(38,0), which SqlClient returns as decimal, and unboxing a decimal as int fails with "Specified cast is not valid." Use CAST(SCOPE_IDENTITY() AS int) or OUTPUT INSERTED.Id.'),
      mcq('UPDATE Products SET Price = @p WHERE Id = @id runs with ExecuteNonQuery() and returns 0. What does that mean?', [
        ['No row had that Id, so nothing was updated', true],
        ['The update succeeded but SET NOCOUNT is on', false],
        ['The update failed and was rolled back fully', false],
        ['The new price was the same as the old one', false],
      ], 'ExecuteNonQuery returns the rows matched by the UPDATE. Zero means the WHERE matched nothing; SET NOCOUNT ON would give -1, and a failure throws a SqlException rather than returning a number.'),
      mcq('A sort feature runs "SELECT * FROM Products ORDER BY @col" with @col set to "Price". What does SQL Server do?', [
        ['It raises an error: a variable cannot pick an ORDER BY column', true],
        ['It sorts by the Price column, as the parameter names that column', false],
        ['It sorts by the parameter\'s text, so the order is left unchanged', false],
        ['It returns no rows because the parameter matched no column name', false],
      ], 'A parameter is a value, never an identifier. SQL Server rejects a bare variable in ORDER BY (error 1008: variables are only allowed when ordering by an expression referencing a column name). Map the user\'s choice to a fixed column list in C# instead.'),
    ],
  },

  /* ── READER_MAPPING ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ADONET_READER_MAPPING',
    notes: `\`ExecuteReader()\` returns a \`SqlDataReader\`: a **forward-only, read-only** cursor over the
result rows, streamed from the server as you read. It is fast and uses little memory, but you get each
row once, in order, while the connection stays busy.

## The loop

    using var cmd = new SqlCommand(
        "SELECT Id, Sku, Name, Price, SupplierId FROM Products ORDER BY Name", conn);
    using var reader = cmd.ExecuteReader();
    while (reader.Read())
    {
        int id = reader.GetInt32(0);
        string name = reader.GetString(2);
        decimal price = reader.GetDecimal(3);
        Console.WriteLine($"{id} {name} {price:0.00}");
    }

\`Read()\` moves to the next row and returns \`false\` when there are none; the reader starts *before*
the first row, so reading a column before the first \`Read()\` throws \`InvalidOperationException\`
(*"Invalid attempt to read when no data is present."*).

## Typed getters and SQL types

| SQL Server | Getter | C# |
|---|---|---|
| \`int\` | \`GetInt32\` | \`int\` |
| \`bigint\` | \`GetInt64\` | \`long\` |
| \`decimal(10,2)\`, \`money\` | \`GetDecimal\` | \`decimal\` |
| \`nvarchar\`, \`varchar\` | \`GetString\` | \`string\` |
| \`bit\` | \`GetBoolean\` | \`bool\` |
| \`datetime2\` | \`GetDateTime\` | \`DateTime\` |
| \`uniqueidentifier\` | \`GetGuid\` | \`Guid\` |

The getters do **no conversion**: \`GetInt32\` on a \`bigint\` column throws \`InvalidCastException\`.
\`reader.GetFieldValue<T>(i)\` is the generic form. \`reader["Name"]\` returns \`object\` and needs a cast.

## Ordinals versus names

Reading by position (\`GetString(2)\`) silently breaks when someone reorders the SELECT. Look the
position up by name once, before the loop:

    int idOrd = reader.GetOrdinal("Id"), nameOrd = reader.GetOrdinal("Name");

\`GetOrdinal\` throws \`IndexOutOfRangeException\` for a name not in the result — a useful early failure.

## NULL is DBNull, and the getters refuse it

A NULL column is **not** \`null\` in ADO.NET; it is \`DBNull.Value\`. \`reader["SupplierId"] == null\`
is always false. And a typed getter on a NULL value throws \`SqlNullValueException\`:
*"Data is Null. This method or property cannot be called on Null values."* Check first:

    int? supplierId = reader.IsDBNull(supOrd) ? null : reader.GetInt32(supOrd);
    string? note    = reader.IsDBNull(noteOrd) ? null : reader.GetString(noteOrd);

## Mapping rows to objects

    public sealed record Product(int Id, string Sku, string Name, decimal Price, int? SupplierId);

    static Product Map(SqlDataReader r) => new(
        r.GetInt32(r.GetOrdinal("Id")),
        r.GetString(r.GetOrdinal("Sku")),
        r.GetString(r.GetOrdinal("Name")),
        r.GetDecimal(r.GetOrdinal("Price")),
        r.IsDBNull(r.GetOrdinal("SupplierId")) ? null : r.GetInt32(r.GetOrdinal("SupplierId")));

    var list = new List<Product>();
    while (reader.Read()) list.Add(Map(reader));

Return the list — not the reader. A reader handed out of the method keeps the connection busy and
dies as soon as the connection is disposed.

## One open reader per connection

While a reader is open, the connection cannot run another command:
*"There is already an open DataReader associated with this Connection which must be closed first."*
Finish (dispose) the first reader, load the rows into a list first, or — rarely — enable
\`MultipleActiveResultSets=True\` in the connection string. If you meant to query inside the loop
once per row, that is usually an N+1 problem: replace it with one JOIN.

## Money is decimal

Map \`decimal(10,2)\` to C# \`decimal\`, never \`double\`: \`double\` cannot hold 0.10 exactly, and the
error shows up in totals.`,
    mcqs: [
      mcq('A row\'s SupplierId column is NULL. What does reader.GetInt32(reader.GetOrdinal("SupplierId")) do?', [
        ['Throws SqlNullValueException: "Data is Null..."', true],
        ['Returns 0, the default value for an int', false],
        ['Returns null, because the column is declared to allow NULL', false],
        ['Returns -1 to signal the value was missing', false],
      ], 'Typed getters refuse NULL with SqlNullValueException ("Data is Null. This method or property cannot be called on Null values."). Check reader.IsDBNull first and map to int?.'),
      mcq('Code: object v = reader["Note"]; if (v == null) Console.WriteLine("no note"); runs on a row whose Note is NULL. What is printed?', [
        ['Nothing: a NULL column is DBNull.Value, which is not null', true],
        ['"no note", because ADO.NET returns C# null for NULL columns', false],
        ['An exception is thrown when the indexer reads the NULL Note', false],
        ['"no note" only when the column type is nvarchar rather than varchar', false],
      ], 'The indexer returns DBNull.Value for NULL, and DBNull.Value == null is false. Test with v is DBNull or reader.IsDBNull(ordinal).'),
      mcq('A Quantity column is bigint in SQL Server. What happens when the code reads it with reader.GetInt32(ord)?', [
        ['InvalidCastException: the getter does not convert', true],
        ['It returns the value narrowed to an int silently', false],
        ['It returns the value only if it fits in 32 bits, else throws', false],
        ['It returns 0 and writes a warning to the output', false],
      ], 'SqlDataReader\'s typed getters perform no conversion; bigint must be read with GetInt64 (C# long). The fix is the getter or the column type, not a cast.'),
    ],
    checkpoint: [
      mcq('Inside while (reader.Read()) { ... } the code runs a second SqlCommand on the same connection to load each product\'s supplier. What happens without MARS?', [
        ['"There is already an open DataReader associated with this Connection..."', true],
        ['The second command waits until the outer reader finishes, then runs', false],
        ['Each supplier loads correctly but much more slowly than a JOIN would', false],
        ['The outer reader is closed automatically and its loop ends early', false],
      ], 'A connection serves one active result set unless MultipleActiveResultSets=True. Beyond the error, a query per row is an N+1 pattern — one JOIN is the real fix.'),
      mcq('A repository method returns the SqlDataReader to its caller, and the method\'s connection is in a using declaration. What does the caller see when it calls Read()?', [
        ['An exception, because the connection was disposed on return', true],
        ['All the rows, since the reader buffered every row before the return', false],
        ['The rows, because the reader keeps its own connection open', false],
        ['An empty result: Read() returns false straight away', false],
      ], 'The using disposes the connection when the method returns, which closes the reader with it; calling Read on a closed reader throws InvalidOperationException. Map rows into a list inside the method.'),
      mcq('Why call reader.GetOrdinal("Price") once before the loop instead of reading GetDecimal(3)?', [
        ['A reordered SELECT list would make index 3 read the wrong column', true],
        ['GetDecimal(3) is slower than reading the value by its column name', false],
        ['Numeric ordinals are 1-based, so 3 refers to a different column', false],
        ['GetOrdinal converts the column to decimal if it is stored as money', false],
      ], 'Ordinals are 0-based positions in the SELECT list; hard-coded numbers break silently when columns move. Looking the ordinal up by name once keeps both speed and correctness.'),
    ],
  },

  /* ── TRANSACTIONS ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ADONET_TRANSACTIONS',
    notes: `Each command you run is its own transaction by default (SQL Server's autocommit mode): it is
committed the moment it succeeds. A stock transfer — take 5 from warehouse A, add 5 to warehouse B,
record the movement — is three statements that must succeed or fail **together**.

## SqlTransaction

    using var conn = new SqlConnection(cs);
    conn.Open();
    using var tx = conn.BeginTransaction();      // ReadCommitted by default
    try
    {
        using var take = new SqlCommand(
            "UPDATE Stock SET Qty = Qty - @n WHERE ProductId = @p AND WarehouseId = @from AND Qty >= @n",
            conn, tx);
        take.Parameters.Add("@n", SqlDbType.Int).Value = 5;
        take.Parameters.Add("@p", SqlDbType.Int).Value = productId;
        take.Parameters.Add("@from", SqlDbType.Int).Value = fromId;
        if (take.ExecuteNonQuery() != 1) throw new InvalidOperationException("Not enough stock");

        using var give = new SqlCommand(
            "UPDATE Stock SET Qty = Qty + @n WHERE ProductId = @p AND WarehouseId = @to", conn, tx);
        // ... parameters, ExecuteNonQuery

        tx.Commit();
    }
    catch
    {
        tx.Rollback();
        throw;
    }

Three rules:

1. **Every command in the transaction gets the transaction** — the third constructor argument, or
   \`cmd.Transaction = tx\`. Forget it and SqlClient refuses: *"ExecuteNonQuery requires the command
   to have a transaction when the connection assigned to the command is in a pending local
   transaction. The Transaction property of the command has not been initialized."*
2. **All commands use the same connection.** A transaction belongs to one connection.
3. **Commit last; roll back on failure; rethrow.** Swallowing the exception hides the failure from
   the caller. Disposing a transaction that was never committed rolls it back, so the \`using\` alone
   already protects you — the explicit \`Rollback()\` makes the intent obvious.

## Guarded updates, not read-then-write

    UPDATE Stock SET Qty = Qty - @n WHERE ProductId = @p AND WarehouseId = @from AND Qty >= @n

checks and changes the row in one statement and SQL Server locks it while doing so, so two clerks
cannot both take the last 5. Reading \`Qty\` into C#, comparing, then writing leaves a gap in which
another transaction can do the same.

## Isolation level

\`conn.BeginTransaction(IsolationLevel.Serializable)\` chooses the level; the default for
\`BeginTransaction()\` is **ReadCommitted**, SQL Server's default. Higher levels block more and
deadlock more; prefer the guarded update to a stricter level. A deadlock victim gets
\`SqlException\` with \`Number == 1205\` — the right response is to retry the whole transaction.

## TransactionScope

\`System.Transactions.TransactionScope\` is an *ambient* transaction: connections opened inside the
scope enlist in it automatically, with no \`tx\` argument.

    using (var scope = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled))
    {
        using var conn = new SqlConnection(cs);
        await conn.OpenAsync();
        // commands — no Transaction property needed
        scope.Complete();     // without this, disposing the scope rolls back
    }

Things to know:

- \`Complete()\` only votes to commit; the commit happens when the scope is disposed.
- The default isolation level of \`new TransactionScope()\` is **Serializable**, not ReadCommitted —
  pass \`TransactionOptions\` if you want ReadCommitted.
- With \`await\` inside, pass \`TransactionScopeAsyncFlowOption.Enabled\`, or the ambient transaction
  does not flow across the await and disposal fails with *"A TransactionScope must be disposed on the
  same thread that it was created."*
- Two connections **open at the same time** in one scope (or connections with different strings)
  escalate to a distributed transaction. .NET Core and
  .NET 5/6 do not support that at all (*PlatformNotSupportedException*); .NET 7+ supports it on
  Windows only, and only after opting in. Keep one connection per scope.

Use \`SqlTransaction\` when all the work is in one method on one connection; reach for
\`TransactionScope\` when several repository methods must share one transaction without passing a
\`tx\` around.`,
    workedExample: `**Problem:** record a sale: insert an \`Orders\` row, get its id, insert one \`OrderLines\` row,
and decrease \`Products.Quantity\` — all or nothing, refusing if there is not enough stock.

    public int PlaceOrder(int customerId, int productId, int qty)
    {
        using var conn = new SqlConnection(_cs);
        conn.Open();
        using var tx = conn.BeginTransaction();
        try
        {
            using var stock = new SqlCommand(
                "UPDATE Products SET Quantity = Quantity - @q WHERE Id = @p AND Quantity >= @q", conn, tx);
            stock.Parameters.Add("@q", SqlDbType.Int).Value = qty;
            stock.Parameters.Add("@p", SqlDbType.Int).Value = productId;
            if (stock.ExecuteNonQuery() != 1)
                throw new InvalidOperationException("Not enough stock");

            using var order = new SqlCommand(
                "INSERT INTO Orders (CustomerId) OUTPUT INSERTED.Id VALUES (@c)", conn, tx);
            order.Parameters.Add("@c", SqlDbType.Int).Value = customerId;
            int orderId = (int)order.ExecuteScalar();

            using var line = new SqlCommand(
                "INSERT INTO OrderLines (OrderId, ProductId, Qty) VALUES (@o, @p, @q)", conn, tx);
            line.Parameters.Add("@o", SqlDbType.Int).Value = orderId;
            line.Parameters.Add("@p", SqlDbType.Int).Value = productId;
            line.Parameters.Add("@q", SqlDbType.Int).Value = qty;
            line.ExecuteNonQuery();

            tx.Commit();
            return orderId;
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

**Reasoning:** the stock update goes first and is guarded, so a shortage is detected before anything
else is written, and two concurrent orders cannot both take the last units. Every command is built with
\`conn, tx\`, so none is refused for a missing transaction. \`OUTPUT INSERTED.Id\` gives the new id as an
\`int\`. Any exception — a shortage, a foreign-key violation, a dropped connection — reaches the catch,
which rolls back all three statements and rethrows so the caller knows the order failed.`,
    mcqs: [
      mcq('A command is created with new SqlCommand(sql, conn) after conn.BeginTransaction() was called, and its Transaction is never set. What happens when it runs?', [
        ['SqlClient throws: the command must have the pending transaction', true],
        ['It runs inside the transaction automatically, as the connection has one', false],
        ['It runs outside the transaction and commits on its own immediately', false],
        ['It waits for the transaction to commit and then runs on the connection', false],
      ], 'SqlClient refuses with "ExecuteNonQuery requires the command to have a transaction when the connection assigned to the command is in a pending local transaction." Pass tx to the constructor or set cmd.Transaction.'),
      mcq('In a using (var scope = new TransactionScope()) block, all the SQL succeeds but scope.Complete() is never called. What is the outcome when the scope is disposed?', [
        ['Everything done inside the scope is rolled back', true],
        ['Everything is committed, as no exception occurred', false],
        ['Only the last command run in the scope is committed', false],
        ['The transaction stays open until the app shuts down', false],
      ], 'Complete() is the vote to commit. Disposing a scope that was never completed aborts the transaction, so every enlisted change is rolled back.'),
      mcq('What isolation level does new TransactionScope() use when no TransactionOptions are passed?', [
        ['Serializable', true],
        ['ReadCommitted', false],
        ['RepeatableRead', false],
        ['Snapshot', false],
      ], 'TransactionScope defaults to Serializable, stricter than SqlTransaction\'s ReadCommitted default. That surprises people with extra blocking; pass TransactionOptions to choose ReadCommitted explicitly.'),
    ],
    checkpoint: [
      mcq('A transfer method calls tx.Commit() at the end of try, and the catch block only logs the exception and returns. The second UPDATE fails. What state is the data in?', [
        ['Rolled back when tx is disposed, but the caller wrongly thinks it worked', true],
        ['The first UPDATE is committed and the second is lost for good', false],
        ['Both updates are committed because the catch handled the error', false],
        ['The transaction stays open and holds its locks until the app restarts', false],
      ], 'Disposing an uncommitted SqlTransaction rolls it back, so the data is safe — but swallowing the exception means the caller is never told. Roll back and rethrow.'),
      mcq('Two clerks run UPDATE Stock SET Qty = Qty - 5 WHERE ProductId = 9 AND Qty >= 5 at the same moment, and Qty is 5. What happens?', [
        ['One update changes the row; the other affects 0 rows', true],
        ['Both updates succeed, and Qty ends at minus five', false],
        ['Both affect 0 rows, since each sees the other\'s lock', false],
        ['SQL Server raises deadlock error 1205 for both', false],
      ], 'The second UPDATE waits for the first one\'s row lock, then re-evaluates Qty >= 5 against the new value 0 and matches nothing. Checking the affected-row count turns that into a clean refusal.'),
      mcq('A method inside new TransactionScope() awaits OpenAsync and ExecuteNonQueryAsync, and fails with "A TransactionScope must be disposed on the same thread that it was created." What is missing?', [
        ['TransactionScopeAsyncFlowOption.Enabled in the scope constructor', true],
        ['A call to scope.Complete() before the first await in the method', false],
        ['MultipleActiveResultSets=True in the connection string for async', false],
        ['ConfigureAwait(false) on every await inside the scope block', false],
      ], 'By default the ambient transaction does not flow across await, and the continuation may resume on another thread. TransactionScopeAsyncFlowOption.Enabled makes the scope flow with the async context.'),
    ],
  },

  /* ── ASYNC_POOLING ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ADONET_ASYNC_POOLING',
    notes: `A web server handles many requests on a small number of threads. A synchronous database call
blocks its thread for the whole round trip; an asynchronous one gives the thread back while it waits.
And opening a real database connection is slow, so SqlClient keeps a **pool** of them.

## Async data access

Every blocking call has an \`Async\` twin:

    public async Task<List<Product>> GetLowStockAsync(CancellationToken ct)
    {
        await using var conn = new SqlConnection(_cs);
        await conn.OpenAsync(ct);
        await using var cmd = new SqlCommand(
            "SELECT Id, Name, Quantity FROM Products WHERE Quantity <= ReorderLevel", conn);
        await using var reader = await cmd.ExecuteReaderAsync(ct);

        var list = new List<Product>();
        while (await reader.ReadAsync(ct))
            list.Add(new Product(reader.GetInt32(0), reader.GetString(1), reader.GetInt32(2)));
        return list;
    }

- \`OpenAsync\`, \`ExecuteReaderAsync\`, \`ReadAsync\`, \`ExecuteNonQueryAsync\`, \`ExecuteScalarAsync\`,
  \`BeginTransactionAsync\`, \`CommitAsync\`.
- \`await using\` calls \`DisposeAsync\`.
- Pass the \`CancellationToken\` through: when the HTTP client disconnects, ASP.NET Core cancels the
  request token and the query is cancelled too.
- Async does **not** make one query faster. It lets the server handle more concurrent requests with
  the same threads. A console tool that runs one query gains nothing.
- Never block on async code with \`.Result\` or \`.Wait()\` — it ties up a thread anyway and, in
  some contexts, deadlocks. Async all the way up.

## Connection pooling

Pooling is **on by default**. When you \`Open()\` a \`SqlConnection\`, SqlClient looks for an idle
physical connection in the pool for that **exact** connection string; when you \`Dispose()\`/\`Close()\`,
the physical connection goes back to the pool (reset) instead of being closed. So the right pattern is
the one you have already seen: **open late, dispose early**, a new \`SqlConnection\` per unit of work.

| Keyword | Default | Meaning |
|---|---|---|
| \`Pooling\` | True | turn pooling off with \`Pooling=False\` (rarely right) |
| \`Max Pool Size\` | 100 | most physical connections per pool |
| \`Min Pool Size\` | 0 | connections kept open even when idle |
| \`Connect Timeout\` | 15 s | how long \`Open()\` waits — for the server *or* for a free pooled connection |

A pool is per connection string, per process: two strings that differ by a space or by key order
create two pools. Keep one string in configuration.

## Pool exhaustion

A connection that is opened and never disposed is never returned. After 100 such leaks every
\`Open()\` waits 15 seconds and fails:

> *Timeout expired. The timeout period elapsed prior to obtaining a connection from the pool. This
> may have occurred because all pooled connections were in use and max pool size was reached.*

Raising \`Max Pool Size\` only delays the failure. The fix is finding the code path that opens without
\`using\` — often an early \`return\` or an exception before a manual \`Close()\`. Long-running
transactions or queries that hold connections cause the same symptom under load.

## Command timeout is a different thing

\`cmd.CommandTimeout\` (default **30 seconds**) limits how long a command may run; exceeding it throws
*"Execution Timeout Expired. The timeout period elapsed prior to completion of the operation or the
server is not responding."* That is a slow query, not a pool problem — look at the query plan.`,
    mcqs: [
      mcq('An API logs "Timeout expired. The timeout period elapsed prior to obtaining a connection from the pool..." under load, though SQL Server is idle. What is the most likely cause?', [
        ['Code paths that open connections without disposing them', true],
        ['The SQL query plans are too slow for the 30-second command limit', false],
        ['Max Pool Size should be raised to a thousand or more', false],
        ['SQL Server has a limit of 100 concurrent user logins', false],
      ], 'An idle server with an exhausted pool means connections were borrowed and never returned — a leak. Raising Max Pool Size only postpones it; a slow query would show "Execution Timeout Expired" instead.'),
      mcq('What does conn.Dispose() do to the physical connection when pooling is on (the default)?', [
        ['Returns it to the pool for the next Open() with the same string', true],
        ['Closes the TCP socket and logs the session out of SQL Server at once', false],
        ['Keeps it reserved for this SqlConnection object if reopened', false],
        ['Leaves it open and busy until the garbage collector runs', false],
      ], 'With pooling, Dispose and Close return the physical connection to the pool, where it is reset and handed to the next Open() with an identical connection string.'),
      mcq('A console tool runs a single report query at night. A colleague proposes converting it to OpenAsync and ExecuteReaderAsync to make it finish faster. What is the honest answer?', [
        ['It will not run faster; async frees threads, it does not speed a query', true],
        ['It will run several times faster because the query runs in parallel', false],
        ['It must stay synchronous because console apps cannot use await at all', false],
        ['It will be faster because async calls skip the connection pool step', false],
      ], 'Async releases the thread during I/O so a server can handle more concurrent work; the query itself takes the same time. Console apps can use async Main since C# 7.1.'),
    ],
    checkpoint: [
      mcq('Code: var conn = new SqlConnection(cs); conn.Open(); if (sku == "") return null; ... conn.Close(); with no using. What goes wrong over time?', [
        ['Each early return leaks a pooled connection until the pool is exhausted', true],
        ['Nothing, because Close() is called at the end of the method body', false],
        ['The early return closes the connection automatically on the way out', false],
        ['Only performance suffers, because a new pool is created per call', false],
      ], 'The early return skips Close(), so that physical connection never goes back to the pool. After Max Pool Size (100) leaks, Open() starts timing out. using fixes every exit path at once.'),
      mcq('Two parts of one app build connection strings "Server=db;Database=Inv;..." and "Database=Inv;Server=db;..." with the same values. How many pools does SqlClient create?', [
        ['Two, since pools are keyed on the exact string text', true],
        ['One, because the keys and their values are all identical', false],
        ['One per thread that opens a connection with them', false],
        ['None until Min Pool Size is set in both strings', false],
      ], 'SqlClient keys a pool on the connection string as written, so reordered keys mean a separate pool with its own Max Pool Size. Keep one string in configuration.'),
      mcq('A report query fails after exactly 30 seconds with "Execution Timeout Expired." Which setting governs that limit?', [
        ['SqlCommand.CommandTimeout, whose default is 30 s', true],
        ['Connect Timeout in the connection string, set to 30 s', false],
        ['Max Pool Size, which caps how long a query runs', false],
        ['The SQL Server instance\'s remote login timeout', false],
      ], 'CommandTimeout (default 30 seconds) limits command execution. Connect Timeout (default 15 s) limits Open(), including the wait for a pooled connection.'),
    ],
  },

  /* ── REPOSITORY_DAPPER ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ADONET_REPOSITORY_DAPPER',
    notes: `Raw ADO.NET scattered through business code makes it hard to read, hard to test and hard to
change. Put the data access behind an interface, and — once you have written enough reader loops —
let Dapper write them for you.

## The repository pattern

    public interface IProductRepository
    {
        Task<Product?> GetBySkuAsync(string sku, CancellationToken ct = default);
        Task<IReadOnlyList<Product>> GetLowStockAsync(CancellationToken ct = default);
        Task<int> AddAsync(Product p, CancellationToken ct = default);
        Task<bool> UpdatePriceAsync(int id, decimal price, CancellationToken ct = default);
    }

The interface speaks in domain objects; nothing about \`SqlConnection\`, \`SqlDataReader\` or
\`DBNull\` leaks out. A service depends on \`IProductRepository\`, so a unit test can hand it a fake,
and the storage can change without the service noticing. Keep business rules (refuse a negative
price, decide a reorder) in the service, not in the repository.

## The ADO.NET implementation

    public sealed class SqlProductRepository : IProductRepository
    {
        private readonly string _cs;
        public SqlProductRepository(string cs) => _cs = cs;

        public async Task<Product?> GetBySkuAsync(string sku, CancellationToken ct = default)
        {
            await using var conn = new SqlConnection(_cs);
            await conn.OpenAsync(ct);
            await using var cmd = new SqlCommand(
                "SELECT Id, Sku, Name, Price, Quantity FROM Products WHERE Sku = @sku", conn);
            cmd.Parameters.Add("@sku", SqlDbType.VarChar, 30).Value = sku;
            await using var r = await cmd.ExecuteReaderAsync(ct);
            return await r.ReadAsync(ct)
                ? new Product(r.GetInt32(0), r.GetString(1), r.GetString(2), r.GetDecimal(3), r.GetInt32(4))
                : null;
        }
        // ...
    }

## Dapper

**Dapper** (\`dotnet add package Dapper\`) is a micro-ORM from the Stack Overflow team: extension
methods on \`IDbConnection\` that run your SQL and map the rows to objects by matching column names to
property or constructor-parameter names (case-insensitively). You still write all the SQL.

    using Dapper;

    public async Task<Product?> GetBySkuAsync(string sku, CancellationToken ct = default)
    {
        await using var conn = new SqlConnection(_cs);
        return await conn.QuerySingleOrDefaultAsync<Product>(
            "SELECT Id, Sku, Name, Price, Quantity FROM Products WHERE Sku = @Sku", new { Sku = sku });
    }

    public async Task<bool> UpdatePriceAsync(int id, decimal price, CancellationToken ct = default)
    {
        await using var conn = new SqlConnection(_cs);
        int rows = await conn.ExecuteAsync(
            "UPDATE Products SET Price = @Price WHERE Id = @Id", new { Id = id, Price = price });
        return rows == 1;
    }

What Dapper does for you:

| Method | Returns |
|---|---|
| \`Query<T>\` / \`QueryAsync<T>\` | \`IEnumerable<T>\` — all rows |
| \`QuerySingleOrDefault<T>\` | one row or default; **throws if more than one** |
| \`QueryFirstOrDefault<T>\` | the first row or default; extra rows ignored |
| \`Execute\` / \`ExecuteAsync\` | \`int\` rows affected |
| \`ExecuteScalar<T>\` | one value, converted to \`T\` |

- **Parameters** come from an object: each property becomes \`@Name\`. They are real parameters, so
  Dapper code is as injection-safe as \`Parameters.Add\` — as long as you do not interpolate into the
  SQL string.
- **NULL** maps to \`null\` for nullable properties — no \`DBNull\` handling.
- **Opening**: if the connection is closed, Dapper opens it for the call and closes it afterwards.
- **IN lists**: \`WHERE Id IN @Ids\` with \`new { Ids = new[] { 1, 2, 3 } }\` — Dapper expands the list
  into one parameter per value. (Note: no parentheses around \`@Ids\`.)
- **Transactions**: pass \`transaction: tx\` to every call on the transaction's connection.
- Strings default to \`nvarchar(4000)\`; for a \`varchar\` column use
  \`new DbString { Value = sku, IsAnsi = true, Length = 30 }\`.
- A column with no matching property is ignored silently, so \`SELECT Product_Name\` against a
  \`Name\` property just leaves \`Name\` null. Alias it: \`SELECT Product_Name AS Name\`.

## Raw ADO.NET, Dapper or EF Core?

| | ADO.NET | Dapper | EF Core |
|---|---|---|---|
| You write SQL | yes | yes | usually no (LINQ) |
| Mapping | by hand | automatic | automatic + change tracking |
| Overhead | none | tiny | more |
| Best for | bulk tools, full control | read-heavy queries, reports, existing SQL | most CRUD applications |

Many real .NET codebases use EF Core for writes and Dapper for heavy read queries side by side.`,
    mcqs: [
      mcq('conn.QuerySingleOrDefault<Product>("SELECT * FROM Products WHERE Name = @Name", new { Name = "Pen" }) matches two rows. What happens?', [
        ['It throws, since more than one row came back', true],
        ['It returns the first of the two matching rows', false],
        ['It returns null, as no single row was found', false],
        ['It returns the last row Dapper read from SQL', false],
      ], 'QuerySingleOrDefault returns default for zero rows and throws InvalidOperationException for more than one. QueryFirstOrDefault is the one that takes the first and ignores the rest.'),
      mcq('A Dapper query selects a column named Product_Name, and the Product class has a property Name. What does Name contain after mapping?', [
        ['null — the column matches no property, so it is skipped', true],
        ['The value, because Dapper strips the prefix before matching', false],
        ['An exception is thrown: Dapper requires every column mapped', false],
        ['The value, as Dapper maps unmatched columns by their position', false],
      ], 'Dapper matches column names to member names (ignoring case) and silently ignores columns with no match. Alias the column — Product_Name AS Name — to fix it.'),
      mcq('Which Dapper call fetches the products whose ids are in a C# array ids?', [
        ['conn.Query<Product>("SELECT * FROM Products WHERE Id IN @Ids", new { Ids = ids })', true],
        ['conn.Query<Product>("SELECT * FROM Products WHERE Id IN (@Ids)", new { Ids = ids })', false],
        ['conn.Query<Product>($"SELECT * FROM Products WHERE Id IN ({string.Join(",", ids)})")', false],
        ['conn.Query<Product>("SELECT * FROM Products WHERE Id = ANY(@Ids)", new { Ids = ids })', false],
      ], 'Dapper expands an enumerable parameter after IN into one parameter per value, and the documented form omits the parentheses. String.Join builds SQL from data, and ANY(@array) is PostgreSQL syntax, not T-SQL.'),
    ],
    checkpoint: [
      mcq('An InventoryService takes IProductRepository in its constructor rather than SqlProductRepository. What does that make possible?', [
        ['Testing the service with a fake repository, no database needed', true],
        ['Running the service\'s SQL queries faster against SQL Server in production', false],
        ['Skipping parameters, since the interface validates the inputs', false],
        ['Sharing one SqlConnection across every request in the app', false],
      ], 'Depending on the interface separates the rules from the storage: a test supplies an in-memory fake, and the SQL implementation can change without the service changing.'),
      mcq('Dapper code: conn.Execute($"UPDATE Products SET Price = {price} WHERE Sku = \'{sku}\'"). Is it safe from SQL injection?', [
        ['No: the interpolation builds the SQL text before Dapper sees it', true],
        ['Yes, because Dapper parameterises every query it is given', false],
        ['Yes, as long as the connection was opened by Dapper itself', false],
        ['No, but only because price is a decimal rather than a string', false],
      ], 'Dapper can only parameterise values passed in its param object. Interpolated values are already part of the SQL string — write @Price and @Sku and pass new { Price = price, Sku = sku }.'),
      mcq('A repository method calls conn.QueryAsync<Product>(sql) on a SqlConnection that was never opened. What does Dapper do?', [
        ['Opens the connection for that call and closes it afterwards', true],
        ['Throws InvalidOperationException: the connection is closed', false],
        ['Opens it and leaves it open for the next repository call to use', false],
        ['Returns an empty sequence without contacting the server', false],
      ], 'Dapper checks the connection state; if it is closed, it opens it for the duration of the call and closes it again, so a short-lived SqlConnection needs no explicit Open.'),
    ],
  },

  /* ── DEBUGGING ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ADONET_DEBUGGING',
    notes: `ADO.NET faults cluster into a small set, and most of them name themselves in the exception
message. Read the message — and \`SqlException.Number\` — before changing any code.

## 1. The certificate is not trusted

> *A connection was successfully established with the server, but then an error occurred during the
> login process. (provider: SSL Provider, error: 0 - The certificate chain was issued by an authority
> that is not trusted.)*

**Cause:** Microsoft.Data.SqlClient 4.0+ sets \`Encrypt=True\` by default, and the dev server's
certificate is self-signed. **Fix:** \`TrustServerCertificate=True\` on a dev machine; a certificate from
a trusted authority in production. Do not "fix" it with \`Encrypt=False\` in production.

## 2. Login failed

> *Login failed for user 'inventory_app'.* (Number 18456)

**Cause:** wrong password, the login does not exist, or the server only allows Windows
authentication (SQL Server authentication must be enabled for \`User Id\`/\`Password\` logins).
**Fix:** check the login in SSMS and the server's authentication mode. A message
*Cannot open database "Inventory" requested by the login* (4060) is different: the login worked but
the database name is wrong or the user has no access to it.

## 3. The open-reader collision

> *There is already an open DataReader associated with this Connection which must be closed first.*

**Cause:** a second command on the same connection while a \`SqlDataReader\` is still open — typically a
lookup inside a \`while (reader.Read())\` loop. **Fix:** replace the per-row query with a JOIN, or
read the rows into a list and dispose the reader first.

## 4. Data is Null

> *SqlNullValueException: Data is Null. This method or property cannot be called on Null values.*

**Cause:** \`GetString\`/\`GetInt32\` on a NULL column. **Fix:** \`reader.IsDBNull(ord) ? null : ...\`
and a nullable property.

## 5. Specified cast is not valid

    int id = (int)cmd.ExecuteScalar();   // after SELECT SCOPE_IDENTITY()

**Cause:** \`SCOPE_IDENTITY()\` returns \`numeric(38,0)\` (a boxed \`decimal\`); likewise \`GetInt32\` on a
\`bigint\` column. **Fix:** \`OUTPUT INSERTED.Id\` or \`CAST(... AS int)\`; match the getter to the
column type.

## 6. The parameter was not supplied

> *The parameterized query '(@sku varchar(30),@note nvarchar(4000))INSERT INTO ...' expects the
> parameter '@note', which was not supplied.*

**Cause:** the parameter's \`Value\` is C# \`null\`. **Fix:** \`(object?)note ?? DBNull.Value\`. The same
message appears when the SQL names \`@note\` and no parameter called \`@note\` was added at all — check
the spelling.

## 7. The command has no transaction

> *ExecuteNonQuery requires the command to have a transaction when the connection assigned to the
> command is in a pending local transaction. The Transaction property of the command has not been
> initialized.*

**Cause:** \`BeginTransaction()\` was called and one command was created without \`tx\`.
**Fix:** \`new SqlCommand(sql, conn, tx)\` for every command in the transaction.

## 8. The pool is exhausted

> *Timeout expired. The timeout period elapsed prior to obtaining a connection from the pool...*

**Cause:** connections opened and never disposed (a missing \`using\`, an early \`return\` before a
manual \`Close()\`). **Fix:** \`using\`/\`await using\` on every \`SqlConnection\`; do not raise
\`Max Pool Size\` to hide the leak.

## Also worth recognising

- *Violation of UNIQUE KEY constraint 'UQ_Products_Sku'. Cannot insert duplicate key in object
  'dbo.Products'.* (2627) — a duplicate; check first or catch \`Number == 2627 || Number == 2601\` and
  report it.
- *The INSERT statement conflicted with the FOREIGN KEY constraint ...* (547) — the parent row does not
  exist.
- *Invalid object name 'Products'.* (208) — wrong database in the connection string, or the table is in
  another schema.`,
    mcqs: [
      mcq('An insert fails with "Cannot insert duplicate key in object \'dbo.Products\'" and SqlException.Number is 2627. Which response belongs in the repository or service?', [
        ['Catch Number 2627 or 2601 and report "SKU already exists"', true],
        ['Retry the same INSERT, since 2627 is a transient error', false],
        ['Turn IDENTITY_INSERT on so the duplicate key is accepted this time', false],
        ['Catch every SqlException and report a duplicate SKU', false],
      ], '2627 (unique constraint) and 2601 (unique index) mean the value already exists; retrying cannot help. Catching every SqlException would mislabel login failures and timeouts as duplicates.'),
      mcq('A query from C# fails with "Invalid object name \'Products\'." but the same query works in SSMS. What should be checked first?', [
        ['That the connection string\'s Database names the database SSMS is using', true],
        ['That the Products table has a primary key defined on its Id column', false],
        ['That the query is run with ExecuteReader rather than ExecuteScalar', false],
        ['That Microsoft.Data.SqlClient is updated to the latest 5.x release on NuGet', false],
      ], 'Error 208 means the name does not resolve in the current database and schema. SSMS is usually pointed at the right database; the app is often connected to master or another database by its string.'),
      mcq('After a release, the API is fine for an hour, then every request fails with the pool-timeout message. A recent change added: var conn = new SqlConnection(cs); conn.Open(); in a new method, with conn.Close() at the end. What is the fix?', [
        ['Wrap the connection in using so it is returned on every exit path', true],
        ['Raise Max Pool Size to 1000 so the pool lasts through the day', false],
        ['Call SqlConnection.ClearAllPools() once at the end of every request', false],
        ['Set Pooling=False so each Open() creates a brand new connection', false],
      ], 'A gradual failure after deployment is the signature of a leak: some path (an exception or early return) skips Close(). using releases the connection always; the other options hide or worsen the leak.'),
      mcq('An app fails to connect with "The certificate chain was issued by an authority that is not trusted." against the production SQL Server. Which fix is right there?', [
        ['Install a certificate from an authority the client trusts', true],
        ['Add Encrypt=False so the client stops checking certificates', false],
        ['Add TrustServerCertificate=True to the production string', false],
        ['Go back to System.Data.SqlClient, which skips the check', false],
      ], 'In production the connection should be encrypted and the certificate validated, so the server needs a trusted certificate. TrustServerCertificate=True and Encrypt=False are dev-only shortcuts that remove that protection.'),
    ],
  },

  /* ── PRACTICE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ADONET_PRACTICE',
    notes: `Work these against a local SQL Server (Express, Developer or a Docker container) with a database
named \`Practice\` and this table:

    CREATE TABLE dbo.Students (
        Id         INT IDENTITY(1,1) PRIMARY KEY,
        Name       NVARCHAR(100)  NOT NULL,
        Email      VARCHAR(150)   NOT NULL UNIQUE,
        MentorId   INT            NULL REFERENCES dbo.Students(Id),
        FeePaid    DECIMAL(10,2)  NOT NULL DEFAULT 0,
        JoinedOn   DATE           NOT NULL
    );

Write each exercise as an \`async\` method in a \`StudentRepository\` class that takes the connection
string in its constructor. Use \`await using\` throughout, \`Parameters.Add\` with explicit
\`SqlDbType\`s, and never build SQL with \`+\` or \`$""\`.

## Exercise 1 — Insert and return the id

\`Task<int> AddAsync(string name, string email, DateOnly joinedOn)\` inserts a student and returns the
new id with \`OUTPUT INSERTED.Id\`. (SqlClient 5.1+ accepts \`DateOnly\` for a \`date\` parameter; on
older versions pass \`joinedOn.ToDateTime(TimeOnly.MinValue)\`.) Call it twice with the same email and
make the second call throw your own \`DuplicateEmailException\` by catching \`SqlException\` numbers
2627 and 2601.

## Exercise 2 — Find by email, with NULLs

\`Task<Student?> FindByEmailAsync(string email)\` returning a record with \`int? MentorId\`. Test it with
an email containing a quote, \`o'neil@x.com\`, and with a student who has no mentor.

## Exercise 3 — Paging

\`Task<IReadOnlyList<Student>> PageAsync(int page, int size)\` using
\`ORDER BY Id OFFSET @skip ROWS FETCH NEXT @size ROWS ONLY\`. Page 1 is the first page.

## Exercise 4 — A safe sort column

Extend paging with a \`sortBy\` argument accepting \`"name"\`, \`"joined"\` or \`"fee"\`. Map it through a
\`switch\` to a fixed column name; anything else throws \`ArgumentException\`. Explain in a comment why
\`ORDER BY @sortBy\` would not work.

## Exercise 5 — A transaction

\`Task RecordPaymentAsync(int studentId, decimal amount)\`: insert a row into a new \`Payments\` table and
increase \`FeePaid\` in one \`SqlTransaction\`. Throw if the student does not exist (check the
affected-row count). Then force a failure between the two statements and confirm in SSMS that neither
change is there.

## Exercise 6 — The same repository with Dapper

Rewrite exercises 2 and 3 with Dapper. Count the lines saved, and write down one thing that the
ADO.NET version made you think about that Dapper hid.`,
    mcqs: [
      mcq('Exercise 3 pages students with OFFSET @skip ROWS FETCH NEXT @size ROWS ONLY. For page 3 with size 20, what value should @skip have?', [
        ['40', true],
        ['60', false],
        ['3', false],
        ['20', false],
      ], 'Pages 1 and 2 cover 40 rows, so page 3 skips (3 - 1) * 20 = 40. Skipping 60 would start at page 4.'),
      mcq('In exercise 2, FindByEmailAsync is called with "o\'neil@x.com" and the email is bound with Parameters.Add. What happens?', [
        ['The quote is just part of the value, and the student is found', true],
        ['SQL Server raises a syntax error at the quote inside the email', false],
        ['The quote must be doubled to o\'\'neil before binding the value', false],
        ['Nothing is found, since parameters strip quotes from strings', false],
      ], 'A bound parameter value is never parsed as SQL, so a quote in it is ordinary data and needs no escaping.'),
      mcq('The Email column is VARCHAR(150) and is indexed. Why does exercise 1 ask for Parameters.Add("@email", SqlDbType.VarChar, 150) instead of AddWithValue?', [
        ['AddWithValue sends nvarchar, forcing a conversion that can spoil the index seek', true],
        ['AddWithValue cannot handle strings longer than about 100 characters', false],
        ['AddWithValue is not supported in Microsoft.Data.SqlClient at all', false],
        ['Parameters.Add escapes quotes in the email, and AddWithValue leaves them exactly as they are', false],
      ], 'A C# string becomes nvarchar under AddWithValue; comparing it to a varchar column makes SQL Server convert the column side, which can stop it seeking the index. Both forms bind values safely.'),
      mcq('In exercise 5, the UPDATE of FeePaid affects 0 rows because the student id is wrong, but the Payments INSERT already ran. What should the method do?', [
        ['Throw, so the catch rolls back the Payments insert as well', true],
        ['Commit, because the INSERT itself raised no error at all', false],
        ['Run the UPDATE again outside the transaction to retry it', false],
        ['Delete the Payments row by hand and then commit the rest', false],
      ], 'Zero affected rows is a failure the database does not report as an error; the code must detect it and throw so the transaction rolls back everything, keeping the two tables consistent.'),
      mcq('In exercise 6, the Dapper version reads MentorId into an int? property. What does it get for a student with a NULL MentorId?', [
        ['null, with no DBNull check needed', true],
        ['0, the default value of an int', false],
        ['DBNull.Value boxed into the property', false],
        ['An exception about a NULL column', false],
      ], 'Dapper converts DBNull to null for nullable members, which is exactly the IsDBNull boilerplate the ADO.NET version needed.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ───────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ADONET_INTERVIEW_QUESTION',
    notes: `Three questions that come up whenever a .NET interview touches data access below EF Core. Say the
answers aloud until each takes under two minutes.

## Q1. "How do you prevent SQL injection in ADO.NET, and what can parameters not protect?"

**Model answer.** I never build SQL text from input — not with \`+\`, not with interpolation. I write
the SQL with named parameters such as \`@sku\` and add the values through \`cmd.Parameters.Add\` with an
explicit \`SqlDbType\` and size. SqlClient sends the text and the values separately (through
\`sp_executesql\`), so a value can never change the structure of the query. Parameters also handle types
— decimals, dates, NULL as \`DBNull.Value\` — without any quoting. I prefer \`Add\` with a type over
\`AddWithValue\`, which infers \`nvarchar\` for every string and can cause implicit conversions against
\`varchar\` columns and plan-cache bloat.

**Follow-ups.** *"Can a parameter be a column name in ORDER BY?"* — No, parameters are values only; I
map the user's choice to a fixed allow-list of column names. *"Is Dapper safe?"* — Yes when values go
through its parameter object; an interpolated string passed to Dapper is as unsafe as anywhere else.
*"And stored procedures?"* — Safe if called with parameters, unsafe if the procedure itself
concatenates SQL and runs it with \`EXEC\`.

## Q2. "What is connection pooling in ADO.NET, and how would you diagnose pool exhaustion?"

**Model answer.** Opening a SQL Server connection means a network handshake, TLS and a login, so
SqlClient keeps a pool per connection string. \`Open()\` borrows an idle physical connection and
\`Dispose()\` returns it, which is why the right pattern is a new \`SqlConnection\` in a \`using\` for each
unit of work — open late, dispose early. Max Pool Size defaults to 100. If every connection is borrowed,
\`Open()\` waits for Connect Timeout and throws *"Timeout expired ... prior to obtaining a connection
from the pool"*. If the server itself is quiet when that happens, it is a leak: I would look for a
connection opened without \`using\`, an early return before a manual \`Close()\`, or a reader returned out
of a method. I would not raise Max Pool Size to hide it.

**Follow-ups.** *"Two connection strings that differ only in key order?"* — Two pools. *"Does async
make a query faster?"* — No; it frees the thread during the wait so the server can handle more requests.

## Q3. "When would you use raw ADO.NET or Dapper instead of EF Core?"

**Model answer.** EF Core is my default for application CRUD: LINQ queries, change tracking,
migrations and relationships save a lot of code. I drop down to Dapper when a query is read-heavy and
hand-tuned — a report with window functions, a dashboard query — or when I am working with an
existing database full of stored procedures: I keep my SQL exactly as written and still get objects
back in one line. Raw ADO.NET is for the cases where I need full control or streaming: bulk loads with
\`SqlBulkCopy\`, reading millions of rows through a \`SqlDataReader\` without materialising them, or a
tool with no ORM dependency. Mixing them in one app is normal — EF Core for writes, Dapper for a few
heavy reads.

**Follow-ups.** *"What does EF Core cost you?"* — Some overhead per query, generated SQL you must
check, and the risk of N+1 if loading is not deliberate. *"What does Dapper not do?"* — No change
tracking, no migrations, no relationship management; you write and maintain every SQL statement.`,
    mcqs: [
      mcq('An interviewer asks: "A stored procedure is called from C# with parameters. Can it still be injectable?" Which answer is right?', [
        ['Yes, if the procedure builds SQL from its inputs and runs it with EXEC', true],
        ['No: a stored procedure called through parameters is always safe', false],
        ['Only when it is called with CommandType.Text instead of the proc type', false],
        ['Only if the procedure returns rows instead of just changing them', false],
      ], 'The call itself is parameterised, but a procedure that concatenates its parameters into a string and EXECs it reintroduces injection inside the database. sp_executesql with parameters inside the procedure is the fix.'),
      mcq('Asked "why prefer Parameters.Add with a SqlDbType over AddWithValue?", which reason is accurate?', [
        ['AddWithValue infers nvarchar for strings, risking conversions and extra plans', true],
        ['AddWithValue sends the value inside the SQL text, so it is wide open to SQL injection', false],
        ['AddWithValue was removed from Microsoft.Data.SqlClient in its 4.0 release', false],
        ['AddWithValue cannot bind DBNull.Value, so NULL columns cannot be written', false],
      ], 'Both forms bind real parameters. AddWithValue\'s problem is type inference: nvarchar against varchar columns, and lengths that vary with each value, which fragments the plan cache.'),
      mcq('An interviewer asks which tool fits loading 2 million rows from a CSV into SQL Server as fast as possible. Which answer is strongest?', [
        ['SqlBulkCopy from ADO.NET, streaming rows in bulk', true],
        ['EF Core, adding each row and calling SaveChanges', false],
        ['Dapper, calling Execute once per row in a loop', false],
        ['A parameterised INSERT per row inside one transaction', false],
      ], 'SqlBulkCopy uses SQL Server\'s bulk-load protocol, far faster than any row-by-row INSERT, whether issued by EF Core, Dapper or hand-written commands.'),
    ],
  },

  /* ── MINI_PROJECT ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ADONET_MINI_PROJECT',
    notes: `# An Inventory App on ADO.NET

Build a console inventory system for a small distributor with two warehouses, on SQL Server through
ADO.NET. No ORM: plain C# on .NET 8, Microsoft.Data.SqlClient, and (for one repository) Dapper. The EF
Core topic rebuilds this same app, so design it cleanly.

## Schema (run this first)

    CREATE DATABASE Inventory;
    GO
    USE Inventory;
    GO
    CREATE TABLE dbo.Suppliers (
        Id     INT IDENTITY(1,1) PRIMARY KEY,
        Name   NVARCHAR(100) NOT NULL,
        Phone  VARCHAR(20)   NULL
    );
    CREATE TABLE dbo.Warehouses (
        Id    INT IDENTITY(1,1) PRIMARY KEY,
        Code  VARCHAR(10)  NOT NULL UNIQUE,
        City  NVARCHAR(60) NOT NULL
    );
    CREATE TABLE dbo.Products (
        Id            INT IDENTITY(1,1) PRIMARY KEY,
        Sku           VARCHAR(30)   NOT NULL CONSTRAINT UQ_Products_Sku UNIQUE,
        Name          NVARCHAR(100) NOT NULL,
        Price         DECIMAL(10,2) NOT NULL CHECK (Price >= 0),
        ReorderLevel  INT           NOT NULL DEFAULT 5,
        SupplierId    INT           NULL REFERENCES dbo.Suppliers(Id)
    );
    CREATE TABLE dbo.Stock (
        ProductId    INT NOT NULL REFERENCES dbo.Products(Id),
        WarehouseId  INT NOT NULL REFERENCES dbo.Warehouses(Id),
        Qty          INT NOT NULL DEFAULT 0 CHECK (Qty >= 0),
        PRIMARY KEY (ProductId, WarehouseId)
    );
    CREATE TABLE dbo.StockMovements (
        Id           BIGINT IDENTITY(1,1) PRIMARY KEY,
        ProductId    INT          NOT NULL REFERENCES dbo.Products(Id),
        WarehouseId  INT          NOT NULL REFERENCES dbo.Warehouses(Id),
        ChangeQty    INT          NOT NULL,
        Reason       VARCHAR(10)  NOT NULL CHECK (Reason IN ('IN','OUT','TRANSFER','ADJUST')),
        Note         NVARCHAR(200) NULL,
        MovedAt      DATETIME2    NOT NULL DEFAULT SYSUTCDATETIME()
    );

Seed two warehouses, three suppliers and about ten products.

## Features (a numbered console menu)

1. Add a supplier.
2. Add a product (SKU, name, price, reorder level, optional supplier); print the new id.
3. List products with their supplier name (NULL supplier shown as "—") and total stock across
   warehouses — one query with JOINs and \`GROUP BY\`, not a query per product.
4. Find a product by SKU, showing stock per warehouse.
5. Update a product's price.
6. **Stock in** to a warehouse, with an optional note.
7. **Stock out** of a warehouse — refused if it would go below zero.
8. **Transfer** a quantity of one product from one warehouse to another.
9. **Low-stock report**: products whose total stock is at or below their reorder level.
10. Movement history for one product, newest first.
0. Exit.

## Design requirements

- \`ISupplierRepository\`, \`IProductRepository\` and \`IStockRepository\` interfaces returning domain
  records; implementations take the connection string. **\`IProductRepository\` is implemented with raw
  ADO.NET; the report and history queries use Dapper** — and the README says which you preferred and why.
- An \`InventoryService\` owns every rule and every transaction; \`Program\` only reads input and prints.
- Async throughout (\`OpenAsync\`, \`ExecuteReaderAsync\`, Dapper's \`QueryAsync\`), \`await using\` on every
  connection, command and reader.
- **Every** value goes in as a parameter; no SQL built with \`+\` or \`$""\` anywhere.
- **Stock in, stock out and transfer each run in one transaction**: the \`Stock\` change(s) and the
  \`StockMovements\` row(s) commit together or not at all. A transfer writes two movements (\`-n\` from
  the source, \`+n\` to the target). Stock out and the source side of a transfer use a guarded
  \`UPDATE ... WHERE ... AND Qty >= @n\` and check that exactly one row changed. Stock in to a warehouse
  with no \`Stock\` row yet inserts one.
- Money as \`decimal\`; nullable \`SupplierId\`, \`Phone\` and \`Note\` read as \`null\`, written as
  \`DBNull.Value\`.
- The connection string comes from an environment variable (or user secrets), never from source.
- \`SqlException\` 2627/2601 becomes "SKU already exists"; other database errors are wrapped in your own
  exception with the original as \`InnerException\`; the menu prints a clear message and continues.

## Acceptance criteria

- Adding a duplicate SKU prints "SKU already exists" and changes nothing.
- Stocking out or transferring more than a warehouse holds prints a refusal; \`Stock\` and
  \`StockMovements\` are unchanged.
- Throwing an exception deliberately between a transfer's two \`Stock\` updates leaves both warehouses'
  quantities and the movements table exactly as they were.
- Entering \`x' OR '1'='1\` as a SKU finds nothing and breaks nothing.
- The product list runs one SQL statement however many products there are (check with SQL Server
  Profiler, Extended Events, or a log line per command).
- The low-stock report matches a hand-written query in SSMS.
- Non-numeric quantities and prices are rejected at input without a stack trace.`,
    mcqs: [
      mcq('A transfer moves 4 units of product 12 from warehouse 1 to warehouse 2. Which sequence keeps the data correct if anything fails midway?', [
        ['One SqlTransaction: guarded decrement, increment, two movement rows, then commit', true],
        ['Two separate commands, each committed as soon as it succeeds, then two movements', false],
        ['Increment warehouse 2 first, then decrement warehouse 1 in a later transaction', false],
        ['Read both quantities in C#, compute the results, then write both with plain UPDATEs', false],
      ], 'All four writes must commit together, and the guarded decrement refuses an overdraw atomically. Separate commits or read-then-write in C# leave windows where a failure or a concurrent clerk corrupts stock.'),
      mcq('The product list shows each product with its supplier name and total stock. Which query plan meets the acceptance criterion?', [
        ['One SELECT with a LEFT JOIN to Suppliers and GROUP BY over Stock', true],
        ['One SELECT of products, then a supplier query per product row', false],
        ['One SELECT with an INNER JOIN to Suppliers and SUM over Stock', false],
        ['Three SELECTs, then matching suppliers and stock up in C# code', false],
      ], 'A single statement is required, and SupplierId is nullable, so only a LEFT JOIN keeps products without a supplier; an INNER JOIN would silently drop them. A query per row is the N+1 pattern.'),
    ],
    assignment: {
      title: 'An Inventory App on ADO.NET',
      description: 'A console inventory system on SQL Server through ADO.NET: suppliers, products and stock in two warehouses, stock in, out and transfers, a low-stock report and movement history — built with repositories, parameterised async commands, Dapper for the read queries, and a transaction for every stock movement.',
      instructions: `Build the app described in this unit's brief and submit it as a repository link or a zip.

**Submit:**

1. The C# solution: domain records, the three repository interfaces and their implementations (raw
   ADO.NET for products, Dapper for the report and history queries), \`InventoryService\`, and a
   \`Program\` with the menu. The \`.csproj\` must show the Microsoft.Data.SqlClient and Dapper packages.
2. \`schema.sql\`: the brief's schema plus the seed rows you used.
3. A README with how to run it (the environment variable included) and console transcripts showing a
   normal session, a refused stock-out, a refused transfer, a duplicate SKU, and the \`x' OR '1'='1\`
   SKU search.
4. A short paragraph explaining where each transaction begins and ends, why a transfer cannot leave
   stock half-moved, and why two clerks cannot oversell the last units.
5. Two or three sentences comparing the ADO.NET and Dapper repositories you wrote.

**Before you submit, check every acceptance criterion in the brief by running it**, not by reading
your code.`,
      rubric: [
        { criterion: 'Correct behaviour', description: 'All menu features work; the product list, low-stock report and movement history match the database; duplicate SKUs, oversells and over-transfers are refused with clear messages.', maxPoints: 25 },
        { criterion: 'Safe SQL and resource handling', description: 'Every value is a parameter with an explicit type; no SQL is built from input; every connection, command and reader is disposed with await using; the connection string is not in source; the product list is one statement.', maxPoints: 25 },
        { criterion: 'Transactions and concurrency', description: 'Stock in, out and transfer each commit Stock and StockMovements together on one connection; a forced failure leaves nothing behind; guarded UPDATEs check the affected-row count.', maxPoints: 20 },
        { criterion: 'Repository and service design', description: 'Interfaces return domain records only; rules and transactions live in InventoryService; Program does input and output only; NULLs and decimals mapped correctly in both ADO.NET and Dapper code.', maxPoints: 20 },
        { criterion: 'Error handling and README', description: 'Duplicate-key errors identified by number; other SqlExceptions wrapped with their InnerException, never swallowed; bad input rejected without a stack trace; transcripts, transaction explanation and the ADO.NET-versus-Dapper comparison present and accurate.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ADONET_CHECKPOINT',
    notes: `Ten questions on ADO.NET as a .NET backend interview examines it: reading short C# against SQL
Server, predicting what it does, and choosing the fix. They cover connection strings and disposal,
commands and parameters, readers and NULL, transactions, async and pooling, and repositories with
Dapper. Answer from what the code actually does, not from what it was meant to do.`,
    checkpoint: [
      mcq('Code: decimal total = 0; while (r.Read()) total += r.GetDecimal(0); runs over Price values 10.00, NULL and 5.50. What happens?', [
        ['SqlNullValueException is thrown on the NULL row', true],
        ['total is 15.50, since NULL is read as zero', false],
        ['total is 10.00, since the loop stops at NULL', false],
        ['total is 15.50, and a warning is logged once', false],
      ], 'GetDecimal refuses a NULL value with SqlNullValueException; ADO.NET never substitutes zero. Check IsDBNull, or SUM in SQL, which ignores NULLs.'),
      mcq('cmd.ExecuteScalar() runs "SELECT Price FROM Products WHERE Sku = @sku" for a SKU that does not exist. What does it return?', [
        ['null, because the query returned no rows', true],
        ['DBNull.Value, because there was no value', false],
        ['0, the default for the Price column type', false],
        ['It throws, as a scalar query needs a row', false],
      ], 'ExecuteScalar returns null when there are no rows and DBNull.Value when there is a row whose first column is NULL. Code that casts the result must handle both.'),
      mcq('What does this print? object v = DBNull.Value; Console.WriteLine(v == null ? "null" : "[" + v + "]");', [
        ['[]', true],
        ['null', false],
        ['[NULL]', false],
        ['[DBNull]', false],
      ], 'DBNull.Value is a real object, so the comparison with null is false, and DBNull.ToString() returns an empty string — the output is two brackets with nothing between them.'),
      mcq('A command is built with new SqlCommand("DELETE FROM Stock WHERE ProductId = " + id, conn) where id is an int from int.Parse. Is it injectable, and is it still worth changing?', [
        ['Not injectable as an int, but parameterise it anyway for one cached plan', true],
        ['Injectable, because any concatenation is equally open to attack', false],
        ['Not injectable, and literals are always better for the plan cache', false],
        ['Injectable, unless the connection string sets Encrypt=True', false],
      ], 'An int cannot carry SQL text, so this case is not exploitable — but each id produces a different statement text and plan, and the habit spreads to strings. A parameter costs nothing.'),
      mcq('A method does using var tx = conn.BeginTransaction(); runs two UPDATEs with tx, and returns without calling Commit(). What is in the database afterwards?', [
        ['Neither update: disposing the uncommitted tx rolls it back', true],
        ['Both updates, as the transaction commits on dispose', false],
        ['Only the first update, since the second was not committed', false],
        ['Both updates, but only once the connection is closed later', false],
      ], 'SqlTransaction.Dispose rolls back a transaction that was neither committed nor rolled back. Forgetting Commit() is a silent bug: no error, no data.'),
      mcq('An ASP.NET Core endpoint calls _repo.GetAllAsync().Result inside a synchronous action. What is wrong with that?', [
        ['It blocks a thread during the query, losing async\'s benefit and risking deadlock', true],
        ['Nothing, since .Result waits as efficiently as await and frees the thread', false],
        ['It runs the query twice: once for the Task and once more for .Result', false],
        ['It returns the Task object itself rather than the list of products', false],
      ], 'Blocking on a Task holds the request thread for the whole wait, so the endpoint gets the cost of async with none of its benefit, and in some synchronisation contexts it deadlocks. Make the action async and await.'),
      mcq('Dapper: var ids = new[] { 3, 7 }; conn.Query<Product>("SELECT * FROM Products WHERE Id IN @ids", new { ids }). What SQL parameters does Dapper send?', [
        ['One per element, as if the SQL said IN (@ids1, @ids2)', true],
        ['One parameter holding the text "3,7" for the IN list', false],
        ['None: the values are pasted into the SQL as literals', false],
        ['A table-valued parameter built from the int array, sent once', false],
      ], 'Dapper rewrites an IN followed by an enumerable parameter into a list of individual parameters, one per element, so the values stay parameterised.'),
      mcq('Inside one TransactionScope on .NET 6, a second SqlConnection is opened while the first is still open. The second Open() throws. Why?', [
        ['A second connection escalates to a distributed transaction, unsupported there', true],
        ['TransactionScope allows exactly one Open() call per thread in .NET Core', false],
        ['The pool cannot lend two connections that use the same connection string', false],
        ['The second connection must be given the scope through its Transaction property', false],
      ], 'A second physical connection in an ambient transaction requires promotion to a distributed transaction, which .NET Core through .NET 6 does not support (PlatformNotSupportedException); .NET 7+ allows it on Windows only after opting in. Share one connection.'),
      mcq('reader.GetInt32(reader.GetOrdinal("Qty")) throws IndexOutOfRangeException. What does that indicate?', [
        ['No column named Qty is in the result — the SELECT list lacks it', true],
        ['The Qty value is NULL in the row that is currently being read', false],
        ['The Qty column is bigint, so the getter cannot read it as int', false],
        ['Read() has not yet been called, so no current row exists at all', false],
      ], 'GetOrdinal throws IndexOutOfRangeException when the name is not among the result columns. NULL gives SqlNullValueException, a type mismatch InvalidCastException, and no row InvalidOperationException.'),
      mcq('A service wraps three repository calls in one TransactionScope, but each repository creates its own SqlConnection. What is the simplest way to keep it to one connection?', [
        ['Open one connection in the service and pass it, with one SqlTransaction, to each call', true],
        ['Set Max Pool Size=1 so that every repository gets the same physical connection back', false],
        ['Mark each repository method static so that they share their static connection field', false],
        ['Add MultipleActiveResultSets=True so the three connections act like a single one', false],
      ], 'Sharing one explicitly opened connection and transaction across the calls keeps the work local. Pool settings and MARS do not make separate SqlConnection objects one connection, and a static shared connection is unsafe under concurrency.'),
    ],
  },
];
