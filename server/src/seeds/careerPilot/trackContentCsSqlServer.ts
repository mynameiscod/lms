/**
 * Career-track content: SQL Server in Practice (JT_SQLSERVER), for .NET Full Stack + AI.
 *
 * Plain SQL — SELECT, joins, GROUP BY, normalisation, transactions — is taught by the years in a
 * vendor-neutral flavour. This topic is about what is SQL Server's own: editions, SSMS, logins and
 * users, its column types (NVARCHAR, DATETIME2, BIT, UNIQUEIDENTIFIER), IDENTITY and named
 * constraints, T-SQL's dialect (TOP, OFFSET-FETCH, ISNULL, DATEADD), clustered and nonclustered
 * indexes with execution plans, and stored procedures, views, functions and triggers with
 * TRY...CATCH. Every statement is SQL Server 2022 T-SQL.
 *
 * The topic declares one skill (SQL_SERVER), so no question names a skillKey.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_CS_SQLSERVER_BUNDLES: PilotBundle[] = [
  /* ── SETUP_SSMS ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_SQLSERVER_SETUP_SSMS',
    notes: `SQL Server is a **server**: a Windows service (or a Linux process) called the **Database Engine**
that owns the data files and listens for connections — a *default instance* on TCP port **1433**.
SSMS, the \`sqlcmd\` tool and your C# program through Microsoft.Data.SqlClient are all **clients**.
If the service is stopped, no client can do anything.

## Which edition

| Edition | Cost | Use it for |
|---|---|---|
| **Developer** | free | your laptop — every Enterprise feature, but licensed for development and test only, never production |
| **Express** | free | small production apps — limited to 10 GB per database and a small share of the machine's memory and CPU |
| Standard / Enterprise | paid | real production servers |

The installer asks for an **instance name**. Developer usually installs the default instance
(connect to \`localhost\`); Express installs a *named instance*, \`SQLEXPRESS\`, so you connect to
\`localhost\\SQLEXPRESS\` (named instances use a dynamic port that the **SQL Server Browser** service
announces). On a fresh Express or Developer install, **TCP/IP is disabled** in *SQL Server
Configuration Manager*; local tools still connect through shared memory, but a Docker container or
another machine cannot until you enable it and restart the service.

## SQL Server in Docker

On macOS, Linux or a Windows machine with Docker Desktop, the quickest install is the official
Linux image:

    docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=Dev#Pass2024" \\
      -p 1433:1433 --name sql2022 -d mcr.microsoft.com/mssql/server:2022-latest

The \`sa\` password must meet the complexity policy (at least 8 characters from three of: upper case,
lower case, digits, symbols). If it does not, the container starts and then **exits** — read
\`docker logs sql2022\` before anything else.

## The tools

- **SSMS** (SQL Server Management Studio) — Windows only, the full admin tool. Object Explorer on the
  left, a query window per tab; **F5** runs the selection (or everything), and results appear in a grid.
- **VS Code with the mssql extension** — cross-platform query editing. (Azure Data Studio did the same
  job but Microsoft has retired it in favour of the VS Code extension.)
- **sqlcmd** — the command line: \`sqlcmd -S localhost -U sa -P "Dev#Pass2024" -C\` (\`-C\` trusts the
  server's self-signed certificate).

\`GO\` is **not T-SQL**. It is a batch separator that SSMS and sqlcmd understand: they cut the script at
each \`GO\` and send the pieces one by one. The server never sees the word.

## Logins, users and schemas

SQL Server has two security levels, and confusing them is the commonest setup bug:

- A **login** lets someone connect to the **server** (it lives in \`master\`).
- A **user** lets that login into **one database**, and carries its permissions there.

Authentication is either **Windows authentication** (your Windows account, no password in the
connection string) or **SQL Server authentication** (a login name and password). SQL logins work only
when the server is in **mixed mode** — set in the installer or in Server Properties → Security, and it
needs a service restart.

    CREATE DATABASE Shop;
    GO
    CREATE LOGIN shop_app WITH PASSWORD = 'Sh0p#App2024';
    GO
    USE Shop;
    CREATE USER shop_app FOR LOGIN shop_app;
    ALTER ROLE db_datareader ADD MEMBER shop_app;   -- SELECT on every table
    ALTER ROLE db_datawriter ADD MEMBER shop_app;   -- INSERT, UPDATE, DELETE
    GRANT EXECUTE ON SCHEMA::dbo TO shop_app;       -- run stored procedures

A **schema** is a namespace *inside* a database — unlike MySQL, where schema and database are the same
thing. Every object has a two-part name such as \`dbo.Orders\` or \`sales.Orders\`; \`dbo\` is the default.
Always write the schema: it is clearer and saves the server a name lookup.

## Common mistakes

- Connecting your app as \`sa\`. Give the application its own login with only the roles it needs.
- Creating the login but not the user: the login connects, then fails to open \`Shop\`.
- Running a script in SSMS while the database drop-down still says \`master\`, so the tables are created
  in the wrong database. Start every script with \`USE Shop;\`.`,
    workedExample: `**Goal: a new ASP.NET Core API needs its own database and SQL login on a Docker SQL Server.**

Start the container and check it stayed up:

    docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=Dev#Pass2024" -p 1433:1433 -d --name sql2022 mcr.microsoft.com/mssql/server:2022-latest
    docker ps            # STATUS should say "Up", not "Exited"

Connect in SSMS to server \`localhost,1433\` (a comma, not a colon, separates host and port), SQL Server
authentication, user \`sa\`. Tick *Trust server certificate*, because the container uses a self-signed one.

Create the database, the login and the user:

    CREATE DATABASE Library;
    GO
    CREATE LOGIN library_api WITH PASSWORD = 'L1brary#Api';
    GO
    USE Library;
    CREATE USER library_api FOR LOGIN library_api;
    ALTER ROLE db_datareader ADD MEMBER library_api;
    ALTER ROLE db_datawriter ADD MEMBER library_api;

Prove it by connecting a second time **as library_api**, with Library as the default database:

    SELECT SUSER_NAME(), USER_NAME(), DB_NAME();   -- library_api | library_api | Library
    CREATE TABLE dbo.Hack (Id INT);                -- fails: CREATE TABLE permission denied

The failure is the point. The API's account can read and write rows in Library, and it cannot change
the schema or touch any other database.`,
    mcqs: [
      mcq("You run `CREATE LOGIN report_svc WITH PASSWORD = 'R3port#2024';` and nothing else. report_svc connects to the server, but opening the Sales database fails. What is missing?", [
        ['A user in Sales created FOR LOGIN report_svc', true],
        ['A restart of the SQL Server service so the new login is loaded', false],
        ['Membership of the sysadmin server role for the report_svc login', false],
        ['A GO line after CREATE LOGIN so that the statement is committed', false],
      ], 'A login only admits someone to the server. Each database needs a user mapped to that login before the login can open it, and the user carries the database permissions.'),
      mcq('A script in SSMS has `GO` between a CREATE TABLE and a CREATE PROCEDURE. What does GO do?', [
        ['It commits the open transaction before the next statement runs', false],
        ['SSMS splits the script there and sends each part as its own batch', true],
        ['It is a T-SQL statement that makes the server wait for locks to clear', false],
        ['It switches the connection back to the default database first', false],
      ], 'GO is a client-side batch separator understood by SSMS and sqlcmd. The server never receives it; it receives two separate batches.'),
      mcq('A Docker container started from mcr.microsoft.com/mssql/server:2022-latest shows STATUS "Exited" a few seconds after `docker run`. What should you check first?', [
        ['Whether SSMS is installed on the host machine yet', false],
        ['Whether TCP/IP is enabled for the instance in SQL Server Configuration Manager', false],
        ['docker logs, typically for a weak MSSQL_SA_PASSWORD or a missing EULA', true],
      ], 'The container exits when setup fails, and the usual causes are a sa password that breaks the complexity policy or ACCEPT_EULA not set to Y. The logs say which.'),
    ],
    checkpoint: [
      mcq('Your team needs a free SQL Server for a small client app that will run in production with about 2 GB of data. Which edition fits?', [
        ['Developer, because it is free and has every feature', false],
        ['Express, because it is free and licensed for production', true],
        ['Enterprise, because only a paid edition may hold real data', false],
      ], 'Developer is licensed for development and testing only. Express may run in production and its 10 GB per-database limit is far above 2 GB.'),
      mcq('A laptop has SQL Server Express installed with default settings. Which server name should SSMS connect to?', [
        ['localhost:1433, because every instance listens on that port', false],
        ['localhost\\SQLEXPRESS, the default named instance of Express', true],
        ['127.0.0.1/Express, the URL form that SSMS expects', false],
      ], 'Express installs as the named instance SQLEXPRESS by default, written server\\instance. A named instance uses a dynamic port, not 1433.'),
      mcq('In SQL Server, how does a schema relate to a database?', [
        ['A schema is a namespace of objects inside one database, such as dbo', true],
        ['A schema and a database are the same thing, as they are in MySQL', false],
        ['A schema is a server-level object that can span several databases', false],
      ], 'Each SQL Server database contains schemas; dbo is the default. Objects are named schema.object, and the same schema name can exist in many databases independently.'),
    ],
  },

  /* ── DATA_TYPES ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_SQLSERVER_DATA_TYPES',
    notes: `A column's type decides what it can hold, how much space it takes, and which C# type your code
receives. SQL Server's types differ from MySQL's in a few places that matter every day.

## Whole numbers

| T-SQL | Bytes | Range | C# |
|---|---|---|---|
| \`TINYINT\` | 1 | 0 to 255 | \`byte\` |
| \`SMALLINT\` | 2 | ±32,767 | \`short\` |
| \`INT\` | 4 | about ±2.1 billion | \`int\` |
| \`BIGINT\` | 8 | about ±9.2 × 10¹⁸ | \`long\` |

There is **no UNSIGNED** in SQL Server. And \`SUM\` over an \`INT\` column returns \`INT\`, so a large
total fails with *Arithmetic overflow error converting expression to data type int.* — write
\`SUM(CAST(Qty AS BIGINT))\`.

Integer division truncates: \`SELECT 7 / 2;\` gives **3**. Make one side decimal — \`7 / 2.0\` — to get 3.5.

## Money: DECIMAL

\`DECIMAL(p, s)\` (same as \`NUMERIC\`) stores exact decimal digits: \`DECIMAL(12,2)\` holds 10 digits
before the point and 2 after, and maps to C# **\`decimal\`**. \`FLOAT\` and \`REAL\` are binary
approximations and must never hold money. SQL Server also has a \`MONEY\` type, fixed at four decimal
places; most teams prefer \`DECIMAL\` because the precision is explicit and it is standard SQL.

## Text: NVARCHAR vs VARCHAR

- \`VARCHAR(n)\` stores non-Unicode text in the column's code page, one byte per character for Latin
  text; n can be up to 8000, or \`MAX\` (2 GB).
- \`NVARCHAR(n)\` stores **Unicode** (UTF-16), two bytes per character for most scripts; n up to 4000 or
  \`MAX\`. Here n counts byte-pairs, so an emoji, which needs a surrogate pair, uses two of them.

Hindi, Tamil, Telugu, Chinese and emoji need **NVARCHAR** (or, from SQL Server 2019, a VARCHAR
column with a \`_UTF8\` collation). A C# \`string\` is UTF-16, and it is sent as \`nvarchar\` by default.

A string **literal** also has a type. \`'नमस्ते'\` is a VARCHAR literal, so characters outside the code
page become \`?\` *before* they reach the column. Unicode literals need the **N prefix**:

    INSERT INTO dbo.Customers (Name) VALUES ('नमस्ते');   -- stored as ??????
    INSERT INTO dbo.Customers (Name) VALUES (N'नमस्ते');  -- stored correctly

\`TEXT\` and \`NTEXT\` are deprecated: use \`VARCHAR(MAX)\` / \`NVARCHAR(MAX)\`.

\`LEN\` counts characters and ignores trailing spaces; \`DATALENGTH\` counts bytes:
\`LEN(N'abc ')\` is 3, \`DATALENGTH(N'abc ')\` is 8.

## Dates and times

| Type | Range | Precision | Use |
|---|---|---|---|
| \`DATE\` | 0001–9999 | a day | birthdays, due dates |
| \`DATETIME\` | 1753–9999 | rounded to .000, .003 or .007 s | legacy code only |
| \`DATETIME2(n)\` | 0001–9999 | up to 100 ns | new columns |
| \`DATETIMEOFFSET\` | 0001–9999 | up to 100 ns, plus a UTC offset | instants across time zones |

\`DATETIME2\` and \`DATE\` map to C# \`DateTime\` (or \`DateOnly\` for DATE in .NET 6+), \`DATETIMEOFFSET\`
to \`DateTimeOffset\`. Store "when did this happen" in UTC: \`DEFAULT SYSUTCDATETIME()\`.

## BIT, UNIQUEIDENTIFIER, VARBINARY

- \`BIT\` is 0, 1 or NULL and maps to \`bool\`. The strings \`'TRUE'\` and \`'FALSE'\` convert to 1 and 0,
  and any non-zero number converts to 1.
- \`UNIQUEIDENTIFIER\` is a 16-byte GUID (C# \`Guid\`). \`NEWID()\` makes a random one;
  \`NEWSEQUENTIALID()\` makes increasing ones but can only be used in a column \`DEFAULT\`.
- \`VARBINARY(MAX)\` holds bytes (C# \`byte[]\`) — files are better kept in blob storage with only
  their path in the table.

## Common mistakes

- \`FLOAT\` for prices; \`NVARCHAR\` for dates, so \`'10/01/2024'\` sorts before \`'9/01/2024'\`.
- A VARCHAR column for customer names, then every Telugu name arrives as question marks.
- \`DATETIME\` in a new design: its 1753 floor and 3 ms rounding surprise everyone; use DATETIME2.`,
    mcqs: [
      mcq("`INSERT INTO dbo.Students (Name) VALUES ('ప్రియ');` stores `????` though Name is NVARCHAR(100). What is the fix?", [
        ["Write the literal as N'ప్రియ' so it is Unicode from the start", true],
        ['Change Name to VARCHAR(100) so the column accepts any script', false],
        ['Increase the column to NVARCHAR(MAX) so the bytes fit', false],
        ['Set the database compatibility level to 160 for SQL Server 2022', false],
      ], 'Without the N prefix the literal is VARCHAR in the database code page, so the Telugu characters become ? before the insert. The column was already right.'),
      mcq('`SELECT SUM(Quantity) FROM dbo.OrderLines;` fails with "Arithmetic overflow error converting expression to data type int." Quantity is INT. What fixes it?', [
        ['Changing the query to SELECT COUNT(Quantity) instead', false],
        ['Summing CAST(Quantity AS BIGINT) so the total is a BIGINT', true],
        ['Adding WHERE Quantity IS NOT NULL so nulls are skipped', false],
        ['Declaring the Quantity column as INT UNSIGNED in the table', false],
      ], 'SUM over INT returns INT, and the total passed about 2.1 billion. Casting the input to BIGINT makes the result BIGINT. SQL Server has no UNSIGNED.'),
      mcq('A new Payments table records when each payment was captured, to the millisecond, from servers in several regions. Which column type fits best?', [
        ['DATETIME, which has stored dates and times since SQL Server 2000', false],
        ['DATETIME2(3) filled with SYSUTCDATETIME(), stored in UTC', true],
        ['NVARCHAR(30) holding an ISO 8601 string such as 2024-05-01T10:00', false],
      ], 'DATETIME2 has exact precision and a full date range, and storing UTC avoids time-zone confusion between regions. DATETIME rounds to about 3 ms, and text dates sort and compare wrongly.'),
    ],
    checkpoint: [
      mcq('What does `SELECT 7 / 2, 7 / 2.0;` return in SQL Server?', [
        ['3 and 3.500000', true],
        ['3.5 and 3.500000', false],
        ['4 and 3.500000', false],
        ['3 and 3', false],
      ], 'Two INTs give integer division, which truncates to 3. With 2.0 one operand is decimal, so the result is decimal 3.5 (shown with the scale SQL Server derives).'),
      mcq('A `Price` column must hold rupee amounts exactly, up to 99,99,999.99. Which definition is right?', [
        ['Price FLOAT NOT NULL', false],
        ['Price REAL NOT NULL', false],
        ['Price DECIMAL(10,2) NOT NULL', true],
        ['Price NVARCHAR(12) NOT NULL', false],
      ], 'DECIMAL(10,2) stores exact values with eight digits before the point and two after, and maps to C# decimal. FLOAT and REAL are approximate; text cannot be summed.'),
      mcq('An Orders table needs a public order reference that cannot be guessed, generated by SQL Server. Which column fits?', [
        ['Ref INT IDENTITY(1,1), because it is unique per row', false],
        ['Ref UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID()', true],
        ['Ref BIT NOT NULL DEFAULT 1, set to 0 when it is used up', false],
      ], 'NEWID() produces a random 16-byte GUID that is unique and not guessable. An IDENTITY value is sequential, so the next order number is obvious.'),
    ],
  },

  /* ── IDENTITY_CONSTRAINTS ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_SQLSERVER_IDENTITY_CONSTRAINTS',
    notes: `Constraints are rules the database enforces on every write, from every client. Code can have a
bug; a constraint cannot be skipped.

## IDENTITY

\`IDENTITY(seed, increment)\` makes SQL Server number the rows itself — the counterpart of MySQL's
AUTO_INCREMENT:

    CREATE TABLE dbo.Customers (
      Id        INT IDENTITY(1,1) NOT NULL,
      Email     NVARCHAR(256)     NOT NULL,
      Name      NVARCHAR(100)     NOT NULL,
      CreatedAt DATETIME2(0)      NOT NULL CONSTRAINT DF_Customers_CreatedAt DEFAULT SYSUTCDATETIME(),
      CONSTRAINT PK_Customers PRIMARY KEY (Id),
      CONSTRAINT UQ_Customers_Email UNIQUE (Email)
    );

You never insert the identity column. To get the value just generated, use the **OUTPUT** clause or
\`SCOPE_IDENTITY()\`:

    INSERT INTO dbo.Customers (Email, Name)
    OUTPUT INSERTED.Id
    VALUES (N'asha@example.com', N'Asha');

    -- or
    INSERT INTO dbo.Customers (Email, Name) VALUES (N'ravi@example.com', N'Ravi');
    SELECT SCOPE_IDENTITY();

- \`SCOPE_IDENTITY()\` — the last identity made **in this scope** (your batch or procedure). Use this.
- \`@@IDENTITY\` — the last identity made in the session **in any scope**, so if a trigger inserts into
  an audit table you get the *audit* row's id. Avoid it.
- \`IDENT_CURRENT('dbo.Customers')\` — the last value for the table from **any session**. Wrong under
  concurrency.

\`SCOPE_IDENTITY()\` returns \`NUMERIC(38,0)\`, so in C# \`ExecuteScalar()\` hands back a \`decimal\`,
not an \`int\`; \`OUTPUT INSERTED.Id\` returns the column's own type.

Identity values are **not gap-free**: a rolled-back insert still uses its number, and after a
restart SQL Server may jump ahead (by up to 1000 for INT) because it caches values. Never use an
identity as an invoice sequence that must have no gaps.

Inserting an explicit id fails:

    INSERT INTO dbo.Customers (Id, Email, Name) VALUES (500, N'x@y.com', N'X');
    -- Cannot insert explicit value for identity column in table 'Customers' when IDENTITY_INSERT is set to OFF.

For a data migration, \`SET IDENTITY_INSERT dbo.Customers ON;\` allows it (with a column list), for one
table per session at a time; turn it OFF again afterwards.

## PRIMARY KEY, UNIQUE, CHECK, DEFAULT

- **PRIMARY KEY** — unique and NOT NULL; by default it also becomes the table's clustered index.
- **UNIQUE** — no two rows share the value. SQL Server treats NULLs as equal here, so a UNIQUE column
  allows **only one NULL**. For "unique when present" use a filtered unique index:
  \`CREATE UNIQUE INDEX UX_Users_Pan ON dbo.Users(Pan) WHERE Pan IS NOT NULL;\`
- **CHECK** — a condition every row must meet: \`CONSTRAINT CK_Products_Price CHECK (Price >= 0)\`.
  A CHECK rejects only a FALSE result; if the column is NULL the condition is unknown and the row is
  accepted. Add NOT NULL when that matters.
- **DEFAULT** — the value used when an INSERT leaves the column out.

**Name every constraint.** An unnamed one gets a generated name such as \`DF__Orders__Status__3B75D760\`,
different on every server, and you need the name to drop or change it.

## FOREIGN KEY and ON DELETE

    CREATE TABLE dbo.Orders (
      Id         INT IDENTITY(1,1) CONSTRAINT PK_Orders PRIMARY KEY,
      CustomerId INT NOT NULL,
      Total      DECIMAL(12,2) NOT NULL CONSTRAINT CK_Orders_Total CHECK (Total >= 0),
      CONSTRAINT FK_Orders_Customers FOREIGN KEY (CustomerId)
        REFERENCES dbo.Customers (Id) ON DELETE NO ACTION
    );
    CREATE INDEX IX_Orders_CustomerId ON dbo.Orders (CustomerId);

The ON DELETE choices are \`NO ACTION\` (the default — refuse while children exist; SQL Server has no
\`RESTRICT\` keyword), \`CASCADE\`, \`SET NULL\` and \`SET DEFAULT\`.

Two things are different from what newcomers expect:

1. **A foreign key does not create an index.** Joins and parent deletes then scan the child table,
   so index the FK column yourself, as above.
2. SQL Server refuses a design where one delete could reach a table along **two cascade paths**:
   *Introducing FOREIGN KEY constraint ... may cause cycles or multiple cascade paths.* Make one of
   the paths NO ACTION and handle it in code.

A violated rule reports the constraint's name, which is another reason to name them:

    The INSERT statement conflicted with the FOREIGN KEY constraint "FK_Orders_Customers".
    Violation of UNIQUE KEY constraint 'UQ_Customers_Email'. Cannot insert duplicate key in object 'dbo.Customers'.`,
    workedExample: `**Goal: a Courses / Enrolments schema for a training institute, with every rule in the database.**

Rules: a course code is unique; a fee is never negative; an enrolment belongs to one student and one
course; a student cannot enrol twice in the same course; deleting a course with enrolments must fail;
deleting a student removes their enrolments.

    CREATE TABLE dbo.Courses (
      Id    INT IDENTITY(1,1) CONSTRAINT PK_Courses PRIMARY KEY,
      Code  VARCHAR(10)   NOT NULL CONSTRAINT UQ_Courses_Code UNIQUE,
      Title NVARCHAR(150) NOT NULL,
      Fee   DECIMAL(10,2) NOT NULL CONSTRAINT CK_Courses_Fee CHECK (Fee >= 0)
    );

    CREATE TABLE dbo.Enrolments (
      Id         INT IDENTITY(1,1) CONSTRAINT PK_Enrolments PRIMARY KEY,
      StudentId  INT NOT NULL,
      CourseId   INT NOT NULL,
      EnrolledAt DATETIME2(0) NOT NULL CONSTRAINT DF_Enrolments_EnrolledAt DEFAULT SYSUTCDATETIME(),
      CONSTRAINT FK_Enrolments_Students FOREIGN KEY (StudentId) REFERENCES dbo.Students (Id) ON DELETE CASCADE,
      CONSTRAINT FK_Enrolments_Courses  FOREIGN KEY (CourseId)  REFERENCES dbo.Courses (Id)  ON DELETE NO ACTION,
      CONSTRAINT UQ_Enrolments_Student_Course UNIQUE (StudentId, CourseId)
    );
    CREATE INDEX IX_Enrolments_CourseId ON dbo.Enrolments (CourseId);

Why each piece:

- \`UQ_Enrolments_Student_Course\` is a two-column UNIQUE: the pair cannot repeat, though each id can.
  Its index starts with StudentId, so it already serves lookups by student; CourseId gets its own index.
- Students cascade (their enrolments mean nothing without them); Courses use NO ACTION, so
  \`DELETE FROM dbo.Courses WHERE Id = 3\` fails while anyone is enrolled — the 547 error names
  FK_Enrolments_Courses.

Test each rule by breaking it: insert a negative fee, the same student-course pair twice, and an
enrolment for CourseId 9999. Each error names the constraint you wrote.`,
    mcqs: [
      mcq('An `AFTER INSERT` trigger on dbo.Orders writes a row into dbo.OrderAudit, which also has an IDENTITY column. Right after inserting an order, which call returns the new order\'s Id?', [
        ['@@IDENTITY, the last identity value created in the session', false],
        ['SCOPE_IDENTITY(), the last identity value made in this scope', true],
        ["IDENT_CURRENT('dbo.OrderAudit'), the table's latest identity", false],
      ], '@@IDENTITY would return the audit row\'s id, because the trigger inserted last. SCOPE_IDENTITY() ignores the trigger\'s scope and returns the order\'s id.'),
      mcq('dbo.Users has `Pan VARCHAR(10) NULL CONSTRAINT UQ_Users_Pan UNIQUE`. The second user without a PAN fails to insert. Why?', [
        ['UNIQUE in SQL Server treats NULLs as equal, so only one NULL fits', true],
        ['A UNIQUE column is implicitly NOT NULL, so even one NULL is refused', false],
        ['VARCHAR(10) cannot store NULL unless the column has a DEFAULT', false],
        ['The constraint must be named with UX_ to permit any NULL values', false],
      ], 'SQL Server allows a single NULL in a UNIQUE constraint. A filtered unique index WHERE Pan IS NOT NULL enforces uniqueness only on rows that have a PAN.'),
      mcq('`CHECK (Discount BETWEEN 0 AND 50)` is on a nullable Discount column. What happens when a row is inserted with Discount NULL?', [
        ['It is rejected, because NULL is not between 0 and 50', false],
        ['It is accepted, because a CHECK rejects only a FALSE result', true],
        ['It is stored as 0, because the CHECK supplies a default', false],
      ], 'Comparing NULL gives UNKNOWN, and a CHECK constraint rejects only FALSE. If NULL must be refused, declare the column NOT NULL as well.'),
    ],
    checkpoint: [
      mcq('A migration script copies customers from an old system and must keep their original Ids. The INSERT fails with "Cannot insert explicit value for identity column". What is the right approach?', [
        ['Drop the IDENTITY property, copy the rows, then add it back', false],
        ['SET IDENTITY_INSERT dbo.Customers ON, insert with a column list, set it OFF', true],
        ['Insert the rows without Ids, then run an UPDATE that sets each Id back to its old value', false],
      ], 'IDENTITY_INSERT allows explicit values for one table in the session; the INSERT must list its columns. An identity column cannot be updated, and SQL Server cannot add or drop IDENTITY on an existing column.'),
      mcq('You add a FOREIGN KEY from dbo.Orders(CustomerId) to dbo.Customers(Id). What else should you usually create?', [
        ['A nonclustered index on Orders.CustomerId', true],
        ['A trigger on Customers to check for children', false],
        ['A UNIQUE constraint on Orders.CustomerId', false],
      ], 'SQL Server does not index foreign key columns automatically, and joins and parent deletes then scan Orders. A UNIQUE constraint would wrongly allow one order per customer.'),
      mcq('Finance asks that invoice numbers have no gaps. A developer proposes an INT IDENTITY column. What is the problem?', [
        ['IDENTITY can never go above 32,767 for an INT column', false],
        ['Rolled-back inserts and restarts leave gaps in the values', true],
        ['IDENTITY values are reused after a row has been deleted', false],
      ], 'Identity numbers are consumed even when the insert rolls back, and cached values can be skipped after a restart. A gap-free sequence needs its own allocation logic.'),
    ],
  },

  /* ── TSQL ───────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_SQLSERVER_TSQL',
    notes: `You already write SELECT, joins and GROUP BY. T-SQL is SQL Server's dialect of it, and these are
the places where your MySQL habits will fail.

## Variables and batches

    DECLARE @MinTotal DECIMAL(12,2) = 1000;
    SELECT Id, Total FROM dbo.Orders WHERE Total >= @MinTotal;

Variables start with \`@\` and live for one batch (until the next \`GO\`).

## Limiting and paging: TOP and OFFSET-FETCH

There is **no LIMIT**.

    SELECT TOP (5) Id, Total FROM dbo.Orders ORDER BY Total DESC;          -- five biggest
    SELECT TOP (3) WITH TIES Name, Score FROM dbo.Results ORDER BY Score DESC; -- plus any equal to 3rd

    -- page 3 of 20 rows each
    SELECT Id, PlacedAt FROM dbo.Orders
    ORDER BY PlacedAt DESC, Id DESC
    OFFSET 40 ROWS FETCH NEXT 20 ROWS ONLY;

OFFSET-FETCH **requires ORDER BY**, and TOP without ORDER BY returns an arbitrary set. Add a unique
column (\`Id\`) to the ORDER BY so pages never repeat or skip rows that tie.

## NULL handling: ISNULL and COALESCE

\`ISNULL(a, b)\` takes exactly two arguments and its result has **the type of the first one**.
\`COALESCE(a, b, c, ...)\` takes any number and is standard SQL. The difference bites:

    DECLARE @Code VARCHAR(3) = NULL;
    SELECT ISNULL(@Code, 'UNKNOWN'), COALESCE(@Code, 'UNKNOWN');  -- UNK | UNKNOWN

And remember \`WHERE Col = NULL\` is never true — use \`IS NULL\`.

## Dates

    SELECT GETDATE();                         -- server local time, DATETIME
    SELECT SYSUTCDATETIME();                  -- UTC, DATETIME2
    SELECT DATEADD(DAY, 30, '2024-01-15');    -- 30 days later
    SELECT DATEDIFF(DAY, '2024-01-01', '2024-03-01');  -- 60
    SELECT EOMONTH('2024-02-10');             -- 2024-02-29
    SELECT DATEFROMPARTS(2024, 8, 15);

\`DATEDIFF\` counts **boundaries crossed**, not full periods: \`DATEDIFF(YEAR, '2024-12-31', '2025-01-01')\`
is 1, though only a day passed. Do not compute age with it.

For "orders in 2024" write a range, not \`YEAR(PlacedAt) = 2024\` — the range can use an index (next
unit):

    WHERE PlacedAt >= '2024-01-01' AND PlacedAt < '2025-01-01'

## Strings

\`+\` concatenates, and anything \`+ NULL\` is NULL. \`'Order ' + 5\` fails, because INT outranks VARCHAR
and SQL Server tries to turn \`'Order '\` into a number. \`CONCAT\` converts every argument and treats
NULL as empty:

    SELECT CONCAT(N'Order ', Id, N' — ', City) FROM dbo.Orders;

Others: \`LEN\`, \`LEFT\`, \`RIGHT\`, \`SUBSTRING(s, start, length)\` (1-based), \`CHARINDEX(find, s)\`,
\`REPLACE\`, \`UPPER\`, \`TRIM\` (2017+), and \`STRING_AGG(Name, ', ')\` (2017+) to join a group's values.
\`TRY_CAST('abc' AS INT)\` returns NULL where \`CAST\` would fail. \`IIF(cond, a, b)\` is a short CASE.

Comparisons are usually **case-insensitive**: the default collation on an English install is
\`SQL_Latin1_General_CP1_CI_AS\` — CI means case-insensitive.

## CTEs

A common table expression names a subquery for one statement:

    WITH CustomerTotals AS (
      SELECT CustomerId, SUM(Total) AS Spent
      FROM dbo.Orders GROUP BY CustomerId
    )
    SELECT c.Name, t.Spent
    FROM CustomerTotals t JOIN dbo.Customers c ON c.Id = t.CustomerId
    WHERE t.Spent > 50000;

The statement **before** a \`WITH\` must end with a semicolon, which is why you see \`;WITH\` in old code.
A recursive CTE needs no RECURSIVE keyword — an anchor, \`UNION ALL\`, and a part that refers to the CTE —
and stops by default after 100 levels (\`OPTION (MAXRECURSION n)\` changes that).

## Window functions

    SELECT CustomerId, Id, Total,
           ROW_NUMBER() OVER (PARTITION BY CustomerId ORDER BY PlacedAt DESC) AS rn,
           SUM(Total)   OVER (PARTITION BY CustomerId) AS CustomerTotal,
           LAG(Total)   OVER (PARTITION BY CustomerId ORDER BY PlacedAt) AS PrevTotal
    FROM dbo.Orders;

A window function **cannot appear in WHERE** (*Windowed functions can only appear in the SELECT or
ORDER BY clauses.*). Compute it in a CTE, then filter: "each customer's latest order" is
\`WHERE rn = 1\` on the CTE.

\`RANK\` leaves gaps after ties (1, 1, 3); \`DENSE_RANK\` does not (1, 1, 2).`,
    workedExample: `**Goal: for each city, the three customers who spent most in 2024, with page-style output.**

Step 1 — totals per customer for the year, as a range so an index on PlacedAt can help:

    WITH Spend AS (
      SELECT c.Id, c.Name, c.City, SUM(o.Total) AS Spent
      FROM dbo.Customers c
      JOIN dbo.Orders o ON o.CustomerId = c.Id
      WHERE o.PlacedAt >= '2024-01-01' AND o.PlacedAt < '2025-01-01'
      GROUP BY c.Id, c.Name, c.City
    ),

Step 2 — rank within each city. DENSE_RANK keeps two customers who spent the same at the same rank:

    Ranked AS (
      SELECT *, DENSE_RANK() OVER (PARTITION BY City ORDER BY Spent DESC) AS CityRank
      FROM Spend
    )

Step 3 — filter on the rank. This is why the CTE exists: the window function cannot be in WHERE.

    SELECT City, CityRank, Name, Spent
    FROM Ranked
    WHERE CityRank <= 3
    ORDER BY City, CityRank, Name;

Step 4 — the UI asks for 25 rows at a time. Append paging; Name is in the ORDER BY so ties are
ordered the same way every time:

    OFFSET 0 ROWS FETCH NEXT 25 ROWS ONLY;

Check by hand on one small city: sum its customers' 2024 orders and confirm the top three match.`,
    mcqs: [
      mcq("`DECLARE @Grade CHAR(1) = NULL; SELECT ISNULL(@Grade, 'NA');` What does it return?", [
        ["'NA', the second argument, returned unchanged", false],
        ["'N', because ISNULL takes the type of its first argument", true],
        ['NULL, because @Grade was declared without a value', false],
        ["An error: ISNULL cannot mix CHAR(1) and a two-character literal", false],
      ], 'ISNULL returns the data type of its first argument, CHAR(1), so NA is truncated to N. COALESCE uses type precedence and would return NA.'),
      mcq('`SELECT CustomerId, ROW_NUMBER() OVER (ORDER BY Total DESC) AS rn FROM dbo.Orders WHERE rn <= 10;` fails. Why?', [
        ['ROW_NUMBER needs a PARTITION BY clause before it can be used in any part of a query', false],
        ['WHERE runs before SELECT, so rn and window functions are unavailable there', true],
        ['ORDER BY inside OVER must name a column that is also in GROUP BY', false],
      ], 'Window functions are computed with the SELECT list, after WHERE. Put the query in a CTE or derived table and filter on rn outside it.'),
      mcq("What does `SELECT DATEDIFF(MONTH, '2024-01-31', '2024-02-01');` return?", [
        ['0, because only one day has passed between the dates', false],
        ['1, because one month boundary is crossed', true],
        ['-1, because January has more days than the gap', false],
      ], 'DATEDIFF counts the datepart boundaries crossed between the two dates. Going from January into February crosses one month boundary.'),
    ],
    checkpoint: [
      mcq('A product list API needs page 4 with 10 products per page, ordered by Name. Which T-SQL is correct?', [
        ['SELECT * FROM dbo.Products ORDER BY Name, Id OFFSET 40 ROWS FETCH NEXT 10 ROWS ONLY', false],
        ['SELECT * FROM dbo.Products ORDER BY Name, Id OFFSET 30 ROWS FETCH NEXT 10 ROWS ONLY', true],
        ['SELECT TOP (10) * FROM dbo.Products ORDER BY Name, Id LIMIT 10 OFFSET 30', false],
      ], 'SQL Server pages with OFFSET-FETCH after an ORDER BY; LIMIT is MySQL syntax. Page 4 skips three pages, 30 rows, not 40, and Id makes the order deterministic when names tie.'),
      mcq("`SELECT 'Invoice #' + InvoiceNo FROM dbo.Invoices;` fails with a conversion error. InvoiceNo is INT. What is the cleanest fix?", [
        ["CONCAT('Invoice #', InvoiceNo)", true],
        ["'Invoice #' + ISNULL(InvoiceNo, 0)", false],
        ["'Invoice #' + TRY_CAST(InvoiceNo AS INT)", false],
      ], 'With + and an INT operand, SQL Server tries to convert the text to INT. CONCAT converts every argument to a string first, and also treats NULL as empty.'),
      mcq('A query needs each customer\'s most recent order only. Which approach is idiomatic T-SQL?', [
        ['GROUP BY CustomerId, selecting MAX(PlacedAt) along with every other column you need from the row', false],
        ['ROW_NUMBER() OVER (PARTITION BY CustomerId ORDER BY PlacedAt DESC) in a CTE, then rn = 1', true],
        ['SELECT TOP (1) * FROM dbo.Orders ORDER BY PlacedAt DESC', false],
      ], 'ROW_NUMBER numbers each customer\'s orders newest first, and filtering rn = 1 keeps one per customer. TOP (1) returns one row in total, and GROUP BY cannot return the other columns of the latest row.'),
    ],
  },

  /* ── INDEXES_PLANS ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_SQLSERVER_INDEXES_PLANS',
    notes: `An index is a sorted structure (a B-tree) that lets SQL Server find rows without reading the whole
table. SQL Server has two kinds, and how it stores the table depends on which you have.

## Heap or clustered table

- A table with **no clustered index** is a **heap**: rows sit in no particular order.
- A **clustered index** *is* the table: the rows themselves are stored in the B-tree, sorted by the
  clustered key. There can be **only one** per table. A \`PRIMARY KEY\` becomes the clustered index
  by default.

A good clustered key is **narrow, unique, unchanging and ever-increasing** — which is why
\`INT IDENTITY\` (or BIGINT) is the usual choice. A random \`NEWID()\` GUID as the clustered key inserts
rows all over the tree, splitting pages and fragmenting the index; if you need a GUID, make it a
nonclustered unique key or use \`NEWSEQUENTIALID()\`.

## Nonclustered indexes

A **nonclustered** index is a separate B-tree: the index key columns, sorted, and with each entry a
pointer to the row — the **clustered key** (or a row id on a heap). A table can have many.

    CREATE INDEX IX_Orders_CustomerId_PlacedAt ON dbo.Orders (CustomerId, PlacedAt);

If a query needs columns the index does not have, SQL Server finds the row through the clustered key
for each match — a **Key Lookup**. A few are cheap; thousands are slow, and the optimizer may then scan
the whole table instead. Fix it by **covering** the query with \`INCLUDE\`:

    CREATE INDEX IX_Orders_CustomerId_PlacedAt
      ON dbo.Orders (CustomerId, PlacedAt)
      INCLUDE (Total, Status)
      WITH (DROP_EXISTING = ON);

Included columns are stored only at the leaf level: they cannot be searched on, but they answer the
query without a lookup.

## Column order in a composite index

An index on \`(CustomerId, PlacedAt)\` is sorted by CustomerId, then PlacedAt within it — like a phone
book by surname then first name. It supports \`WHERE CustomerId = 7\` and
\`WHERE CustomerId = 7 AND PlacedAt >= '2024-01-01'\`, but not \`WHERE PlacedAt >= '2024-01-01'\` alone:
that can only scan. Put equality columns first, the range column last.

## Seek, scan and SARGable predicates

An **Index Seek** jumps down the tree to the matching range. An **Index Scan** (or Table Scan /
Clustered Index Scan) reads everything. A predicate that can seek is called **SARGable**. These are not:

| Not SARGable | SARGable rewrite |
|---|---|
| \`WHERE YEAR(PlacedAt) = 2024\` | \`WHERE PlacedAt >= '2024-01-01' AND PlacedAt < '2025-01-01'\` |
| \`WHERE Name LIKE '%kumar'\` | \`WHERE Name LIKE 'kumar%'\` (if the requirement allows) |
| \`WHERE Total * 1.18 > 1000\` | \`WHERE Total > 1000 / 1.18\` |
| \`WHERE VarcharCode = @NVarcharParam\` | send the parameter as VARCHAR |

The last one is a classic .NET bug: a C# string parameter is sent as **NVARCHAR** by default; compared
with a **VARCHAR** column, SQL Server must convert the column (\`CONVERT_IMPLICIT\` in the plan) and, under
the default SQL_Latin1_General_CP1_CI_AS collation, can no longer seek — it scans.

## Reading an execution plan

In SSMS, **Ctrl+M** (Include Actual Execution Plan) then run the query; **Ctrl+L** shows the estimated
plan without running it. Read the graphical plan **right to left**: data flows from the operators on the
right towards the SELECT on the left, and thicker arrows carry more rows. Look for:

- **Scans** on large tables where you expected a seek.
- **Key Lookup** with a high execution count — a covering index is missing.
- **Estimated vs actual rows** far apart — statistics are stale (\`UPDATE STATISTICS dbo.Orders;\`).
- A **yellow warning triangle** (implicit conversion, spill to tempdb) and a green **missing index**
  suggestion — a hint to evaluate, not an order.

Measure, do not guess:

    SET STATISTICS IO ON;
    SELECT Total FROM dbo.Orders WHERE CustomerId = 42;
    -- Table 'Orders'. Scan count 1, logical reads 3 ...

Logical reads (8 KB pages) are the most reliable number to compare before and after an index.

## The cost

Every index is updated on every INSERT, UPDATE and DELETE of its columns and takes disk and memory.
Index for the queries you actually run; do not index every column.`,
    workedExample: `**Goal: speed up the "my orders" page.**

The API runs this for a logged-in customer:

    SELECT Id, PlacedAt, Total, Status
    FROM dbo.Orders
    WHERE CustomerId = @CustomerId AND Status <> 'CANCELLED'
    ORDER BY PlacedAt DESC;

Orders has 2 million rows and a clustered primary key on Id. With Ctrl+M and \`SET STATISTICS IO ON\`:

- the plan shows **Clustered Index Scan** on Orders;
- logical reads: about 11,000 — the whole table, for one customer's 30 orders.

Step 1 — give the WHERE and ORDER BY something to seek on. Equality column first, then the sort column:

    CREATE INDEX IX_Orders_Customer_PlacedAt ON dbo.Orders (CustomerId, PlacedAt DESC);

Re-run: the plan is now **Index Seek** + **Key Lookup** (30 executions), logical reads about 100.
Better, but every row goes back to the clustered index for Total and Status.

Step 2 — cover the query:

    CREATE INDEX IX_Orders_Customer_PlacedAt ON dbo.Orders (CustomerId, PlacedAt DESC)
      INCLUDE (Total, Status) WITH (DROP_EXISTING = ON);

Re-run: a single **Index Seek**, no lookup and no Sort operator (the index is already in PlacedAt order),
logical reads 3 or 4.

Step 3 — check the C# side. If Status is VARCHAR and the code passes the status as a string parameter
of type NVARCHAR, look for CONVERT_IMPLICIT in the plan. Here the status is a literal, so it is fine.

The lesson: one well-ordered, covering index took the query from 11,000 reads to 4.`,
    mcqs: [
      mcq('A plan shows Index Seek on IX_Orders_CustomerId followed by a Key Lookup executed 40,000 times. What is the usual fix?', [
        ['Add the query\'s other columns to that index with INCLUDE', true],
        ['Rebuild the clustered index so the lookups are cheaper to do', false],
        ['Drop IX_Orders_CustomerId so the optimizer scans the table', false],
        ['Run UPDATE STATISTICS so the lookups disappear from the plan', false],
      ], 'Each Key Lookup fetches the columns the nonclustered index lacks. Including them makes the index cover the query, so the lookups vanish.'),
      mcq('dbo.Orders has an index on (CustomerId, PlacedAt). Which WHERE clause can use it only by scanning?', [
        ["CustomerId = 5 AND PlacedAt >= '2024-06-01'", false],
        ['CustomerId = 5', false],
        ["PlacedAt >= '2024-06-01'", true],
      ], 'The index is sorted by CustomerId first. Without a CustomerId condition there is no starting point in the tree, so dates can only be found by scanning it.'),
      mcq('dbo.Members.Phone is VARCHAR(15) with an index, but the plan for a C# query shows CONVERT_IMPLICIT on Phone and an Index Scan. What is the likely cause?', [
        ['The index on Phone is heavily fragmented and has to be rebuilt before it can seek', false],
        ['The parameter was sent as NVARCHAR, so the column had to be converted', true],
        ['The phone numbers contain a + sign, which no index can seek on', false],
      ], 'C# strings go to SQL Server as NVARCHAR by default. NVARCHAR outranks VARCHAR, so the column is converted row by row and the seek is lost. Type the parameter as VARCHAR.'),
    ],
    checkpoint: [
      mcq('How many clustered indexes can a SQL Server table have, and why?', [
        ['One, because the clustered index is the table\'s own row order', true],
        ['Up to 999, the same limit that applies to nonclustered indexes on it', false],
        ['One per column that has been declared NOT NULL', false],
      ], 'The clustered index stores the rows themselves in key order, and rows can only be stored in one order. Nonclustered indexes are separate structures, up to 999.'),
      mcq('`WHERE YEAR(JoinedOn) = 2023` scans dbo.Members although JoinedOn is indexed. Which rewrite lets SQL Server seek?', [
        ["WHERE JoinedOn >= '2023-01-01' AND JoinedOn < '2024-01-01'", true],
        ["WHERE LEFT(CONVERT(VARCHAR(10), JoinedOn, 120), 4) = '2023' -- as text", false],
        ['WHERE DATEPART(YEAR, JoinedOn) = 2023', false],
      ], 'A function wrapped around the column hides its sorted values from the index. A range on the bare column is SARGable. DATEPART and a text conversion of the column are the same problem as YEAR.'),
      mcq('A team makes `Id UNIQUEIDENTIFIER DEFAULT NEWID()` the clustered primary key of a busy table. What problem should they expect?', [
        ['Random keys insert all over the index, causing page splits and fragmentation', true],
        ['NEWID() repeats values after about four billion rows have been inserted', false],
        ['A clustered index cannot be created on a UNIQUEIDENTIFIER column', false],
      ], 'NEWID values are random, so each insert lands in a random page of the clustered index and splits full pages. An ever-increasing key such as INT IDENTITY appends at the end.'),
    ],
  },

  /* ── PROCEDURES_VIEWS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_SQLSERVER_PROCEDURES_VIEWS',
    notes: `SQL Server can store code as well as data. Each kind of object has one job.

## Views — a saved query

    CREATE OR ALTER VIEW dbo.vOrderSummary
    AS
    SELECT o.Id, o.PlacedAt, c.Name AS Customer, o.Total
    FROM dbo.Orders o JOIN dbo.Customers c ON c.Id = o.CustomerId;
    GO
    SELECT * FROM dbo.vOrderSummary WHERE Total > 5000;

A view stores no rows; selecting from it runs the query. Use it to name a join you repeat, or to give
a reporting login access to some columns but not the base table. Two rules:

- A view **cannot have ORDER BY** (unless with TOP or OFFSET) — order in the query that selects from it.
- A view written with \`SELECT *\` remembers the columns that existed when it was created; a column
  added later does not appear until \`sp_refreshview\`. List columns explicitly.

## Stored procedures

    CREATE OR ALTER PROCEDURE dbo.PlaceOrder
      @CustomerId INT,
      @ProductId  INT,
      @Qty        INT,
      @OrderId    INT OUTPUT
    AS
    BEGIN
      SET NOCOUNT ON;
      SET XACT_ABORT ON;

      BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.Products SET Stock = Stock - @Qty
        WHERE Id = @ProductId AND Stock >= @Qty;

        IF @@ROWCOUNT = 0
          THROW 50001, N'Not enough stock.', 1;

        INSERT INTO dbo.Orders (CustomerId, ProductId, Qty) VALUES (@CustomerId, @ProductId, @Qty);
        SET @OrderId = SCOPE_IDENTITY();

        COMMIT TRANSACTION;
      END TRY
      BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;   -- re-raise the original error to the caller
      END CATCH
    END;

Calling it:

    DECLARE @Id INT;
    EXEC dbo.PlaceOrder @CustomerId = 7, @ProductId = 3, @Qty = 2, @OrderId = @Id OUTPUT;
    SELECT @Id;

Points that catch people:

- \`OUTPUT\` must be written **at the call** too; without it \`@Id\` stays NULL.
- \`CREATE OR ALTER\` (SQL Server 2016 SP1+) saves the drop-and-create dance. A \`CREATE PROCEDURE\` must
  be the first statement in its batch — put \`GO\` before it in a script.
- \`SET NOCOUNT ON\` stops the "(1 row affected)" messages. It also means ADO.NET's
  \`ExecuteNonQuery()\` returns **-1** instead of a row count.

## Errors and transactions: TRY...CATCH, THROW, XACT_ABORT

\`THROW number, message, state\` raises an error (user numbers are 50000 and above); \`THROW;\` alone,
inside CATCH, re-raises the one that was caught. \`ERROR_NUMBER()\`, \`ERROR_MESSAGE()\` and \`ERROR_LINE()\`
describe it. (\`THROW\` needs the statement before it to end with a semicolon. The older \`RAISERROR\`
still works.)

**\`SET XACT_ABORT ON\`** matters more than it looks. With it OFF (the default), many errors — a foreign
key or CHECK violation, for instance — end only the **failing statement**; the transaction stays open
and the following statements carry on, so a script without TRY...CATCH can reach COMMIT with half its
work done. With it ON, any runtime error rolls back the whole transaction. Put both lines at the top of
every procedure that writes.

## Functions

- An **inline table-valued function** is a parameterised view and is cheap — the optimizer expands it
  into the calling query:

      CREATE OR ALTER FUNCTION dbo.OrdersSince(@From DATE)
      RETURNS TABLE AS RETURN
        (SELECT Id, CustomerId, Total FROM dbo.Orders WHERE PlacedAt >= @From);
      GO
      SELECT * FROM dbo.OrdersSince('2024-04-01');

- A **scalar function** returns one value. Called in a SELECT or WHERE over many rows it runs once per
  row and has historically been slow; SQL Server 2019 can inline simple ones, but be wary.
- A function **cannot change data** in tables — no INSERT, UPDATE or DELETE on a real table.

## Triggers

A trigger runs automatically on INSERT, UPDATE or DELETE. SQL Server has **AFTER** and **INSTEAD OF**
triggers — there is no BEFORE trigger. A trigger fires **once per statement**, not once per row: the
pseudo-tables \`inserted\` and \`deleted\` hold all the affected rows.

    CREATE OR ALTER TRIGGER dbo.trgProducts_PriceAudit ON dbo.Products
    AFTER UPDATE
    AS
    BEGIN
      SET NOCOUNT ON;
      INSERT INTO dbo.PriceAudit (ProductId, OldPrice, NewPrice, ChangedAt)
      SELECT d.Id, d.Price, i.Price, SYSUTCDATETIME()
      FROM inserted i JOIN deleted d ON d.Id = i.Id
      WHERE i.Price <> d.Price;
    END;

Writing \`SELECT @Id = Id FROM inserted\` assumes one row and silently audits only one when an UPDATE
touches fifty.

## Where should the logic live?

Keep **business rules in C#**: there they are unit-tested, reviewed, versioned with the application,
debugged in Visual Studio, and they scale by adding app servers. The database is the costliest thing
to scale and the hardest to test. Use the database for what it does best: **constraints** for data
integrity, **views** for reporting and access control, and occasionally a **procedure** for heavy
set-based work (a nightly recalculation over millions of rows) that would otherwise ship all the data
to the app. EF Core and Dapper both call procedures easily when you do need one.`,
    mcqs: [
      mcq('`EXEC dbo.CreateInvoice @OrderId = 10, @InvoiceId = @Inv;` runs without error, but `SELECT @Inv;` shows NULL. The procedure sets @InvoiceId. What is wrong?', [
        ['The call must also mark the argument as OUTPUT', true],
        ['The procedure must return the id with a RETURN statement instead', false],
        ['@Inv must be declared as BIGINT to receive an identity value', false],
        ['The procedure needs SET NOCOUNT OFF for parameters to come back', false],
      ], 'An OUTPUT parameter is copied back only when the caller writes OUTPUT after the argument. Otherwise it is passed by value and the variable keeps its NULL.'),
      mcq('An AFTER UPDATE trigger does `SELECT @Id = Id FROM inserted;` and audits @Id. `UPDATE dbo.Products SET Price = Price * 1.1 WHERE CategoryId = 4;` changes 60 rows. How many audit rows are written?', [
        ['60, because an AFTER UPDATE trigger runs once for every row the statement updated', false],
        ['One, because the trigger runs once per statement with 60 rows in inserted', true],
        ['None, because an AFTER trigger cannot read the inserted table', false],
      ], 'SQL Server triggers fire once per statement. inserted holds all 60 rows, and assigning a variable from it keeps only one. Audit with INSERT ... SELECT from inserted joined to deleted.'),
      mcq('A procedure without TRY...CATCH runs `BEGIN TRAN; UPDATE ...; INSERT ... (violates a FOREIGN KEY); UPDATE ...; COMMIT;` with XACT_ABORT OFF. What is committed?', [
        ['Nothing, because any error rolls back the open transaction', false],
        ['Both UPDATEs; only the failing INSERT is lost', true],
        ['Only the first UPDATE; the batch stops at the error', false],
      ], 'With XACT_ABORT OFF a constraint violation ends only that statement. The batch continues and COMMIT keeps both updates. SET XACT_ABORT ON makes the error roll back everything.'),
    ],
    checkpoint: [
      mcq('A reporting login must see order totals and customer names but never customer phone numbers. Which SQL Server object fits best?', [
        ['A view with only the allowed columns, granted to that login\'s user', true],
        ['An INSTEAD OF trigger that blanks the phone column on SELECT', false],
        ['A scalar function that returns each customer\'s name', false],
      ], 'A view exposes chosen columns and can be granted without granting the base table. Triggers never fire on SELECT.'),
      mcq('You need a reusable "orders for a customer since a date" query that joins efficiently with other tables. Which kind of object fits?', [
        ['An inline table-valued function taking the customer id and date', true],
        ['A scalar function that returns a comma-separated list of ids', false],
        ['An AFTER INSERT trigger on Orders that fills a cache table', false],
      ], 'An inline table-valued function is a parameterised view: the optimizer expands it into the calling query, so it joins and filters like a normal table.'),
      mcq('A team wants to move its discount rules from C# into a stored procedure "for speed". What is the strongest argument against it?', [
        ['Rules in T-SQL leave the unit tests, reviews and app releases behind', true],
        ['Stored procedures cannot take DECIMAL parameters or return them', false],
        ['SQL Server runs a stored procedure only once per connection', false],
      ], 'Logic in the database is harder to test and debug, is versioned separately, and scales on the most expensive server. The other two claims are simply false.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_SQLSERVER_DEBUGGING',
    notes: `SQL Server errors come with a **Msg number** and usually name the object at fault. Read the
whole message first — it often tells you the table, column and constraint. These are the faults a
.NET developer meets in the first month.

## 1. "Invalid object name 'dbo.Products'." (Msg 208)

*Symptom:* a query that worked yesterday fails in a new SSMS tab.
*Cause:* the tab is connected to \`master\` (see the database drop-down), or the table was created in
another schema. *Fix:* \`USE Shop;\` at the top of the script, and use two-part names. In a connection
string, set \`Database=Shop\` (Initial Catalog).

## 2. Names stored as ??????

*Symptom:* Hindi or Telugu names appear as question marks after a seed script.
*Cause:* the column is VARCHAR, or the column is NVARCHAR but the literal lacks the N prefix.
*Fix:* make the column NVARCHAR and write \`N'...'\`. Data already stored as \`?\` is lost — re-import it.

## 3. "Cannot insert explicit value for identity column in table 'Products' when IDENTITY_INSERT is set to OFF." (Msg 544)

*Cause:* a seed or migration script lists the identity column with values.
*Fix:* leave the column out and let SQL Server number the rows; or, when ids must be preserved,
\`SET IDENTITY_INSERT dbo.Products ON;\` with a column list, then OFF.

## 4. "The INSERT statement conflicted with the FOREIGN KEY constraint "FK_Orders_Customers"." (Msg 547)

*Cause:* the CustomerId does not exist — usually a script inserting children before parents, or a
hard-coded id from another environment. The same Msg 547 is used for CHECK violations, naming the CHECK.
*Fix:* insert parents first or look the id up. Never disable the constraint to get past it.

## 5. "Introducing FOREIGN KEY constraint 'FK_...' on table '...' may cause cycles or multiple cascade paths." (Msg 1785)

*Cause:* two ON DELETE CASCADE routes reach the same table (Users → Orders → Payments and Users →
Payments). *Fix:* make one path NO ACTION and delete those rows explicitly in code or a procedure.

## 6. "String or binary data would be truncated in table 'Shop.dbo.Customers', column 'Phone'."

*Cause:* a value longer than the column. Since SQL Server 2019 (compatibility level 150+) the message
names the table, column and truncated value; older servers said only *String or binary data would be
truncated.* *Fix:* validate input length in the API, or widen the column if the data is legitimate.

## 7. "Divide by zero error encountered." (Msg 8134)

*Symptom:* a conversion-rate report fails for one day with no visits.
*Fix:* \`Orders * 1.0 / NULLIF(Visits, 0)\` — the result is NULL instead of an error.

## 8. A query is fast in SSMS and slow from the app

*Cause:* very often the app's parameter is a different **type** from the column — a C# string sent as
NVARCHAR against a VARCHAR column — and the actual plan shows \`CONVERT_IMPLICIT\` and a scan. Another
frequent cause is a function on the column (\`WHERE CONVERT(DATE, PlacedAt) = @Day\`).
*Fix:* capture the actual plan, match parameter types to column types, and rewrite to a SARGable range.

## 9. "Conversion failed when converting the varchar value 'N/A' to data type int." (Msg 245)

*Cause:* a VARCHAR column of "numbers" contains text, and a comparison with an INT converts every row.
*Fix:* \`TRY_CAST(Col AS INT)\` to find the bad rows; then fix the column's type.`,
    mcqs: [
      mcq('A new developer runs a CREATE TABLE script in SSMS. It succeeds, but the API reports "Invalid object name \'dbo.Courses\'." What is the most likely cause?', [
        ['The table was created in master because the query tab never switched databases', true],
        ['dbo.Courses has no primary key yet, so the API cannot see the table at all', false],
        ['The API must call sp_refreshview before a newly created table is visible to it', false],
        ['SQL Server needs a service restart before new tables can be queried by clients', false],
      ], 'Msg 208 means no such object in the current database. SSMS tabs default to master unless the script says USE or the drop-down is changed.'),
      mcq('A conversion report fails with "Divide by zero error encountered." on days with no visits. Which expression fixes it without hiding other errors?', [
        ['Orders * 1.0 / NULLIF(Visits, 0)', true],
        ['Orders * 1.0 / ISNULL(Visits, 1)', false],
        ['TRY_CAST(Orders / Visits AS DECIMAL(9,2))', false],
        ['Orders * 1.0 / (Visits + 1)', false],
      ], 'NULLIF turns a zero divisor into NULL, so the ratio is NULL for those days. ISNULL does nothing because Visits is 0, not NULL, and adding 1 silently gives wrong ratios on every day.'),
      mcq('Creating FK_Payments_Users with ON DELETE CASCADE fails with Msg 1785 "may cause cycles or multiple cascade paths". Payments already cascades from Orders, which cascades from Users. What is the fix?', [
        ['Make one of the two paths ON DELETE NO ACTION and delete those rows in code', true],
        ['Create the constraint WITH NOCHECK so SQL Server skips the cascade analysis', false],
        ['Add a nonclustered index on Payments.UserId before creating the constraint', false],
        ['Set the database compatibility level to 160 so multiple paths are allowed', false],
      ], 'SQL Server refuses two cascade routes into the same table at any level. One path must be NO ACTION, with the deletion handled explicitly.'),
      mcq('After an upgrade to SQL Server 2022, an insert error now reads "String or binary data would be truncated in table \'Hr.dbo.Staff\', column \'Mobile\'. Truncated value: \'+91 98480\'." What should you do?', [
        ['Check the Mobile values sent and the column\'s length, then fix whichever is wrong', true],
        ['Run SET ANSI_WARNINGS OFF in the session so the value is cut short silently', false],
        ['Change the Mobile column from NVARCHAR to VARCHAR so that the number fits', false],
        ['Roll back the upgrade, because the older message never caused this failure', false],
      ], 'The longer message is just more helpful; the failure was always there. The value is too long for the column, so either the input is wrong or the column is too narrow.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_SQLSERVER_PRACTICE',
    notes: `Do these on a real SQL Server — Developer edition or the Docker image — in SSMS or VS Code.
Write each script, run it, and check the result before moving on. Save every script in a file;
you will reuse the schema in the ADO.NET and EF Core topics.

## Exercise 1 — a database, a login and a user

Create a database \`Clinic\`. Create a SQL login \`clinic_api\` and a user for it in Clinic that can
read and write rows and execute procedures, but cannot create tables. Connect as clinic_api and prove
both halves: an INSERT works, a CREATE TABLE fails.

## Exercise 2 — types for patients and doctors

Create \`dbo.Patients\`: an INT identity id; a name up to 120 characters in any Indian script; a
10-digit mobile number (is it a number?); date of birth; a consultation fee to the paisa; a
\`IsActive\` flag; and \`CreatedAt\` filled with the UTC time by SQL Server. Insert three patients, one
with a Tamil name, and confirm it is not stored as question marks.

## Exercise 3 — keys and constraints

Add \`dbo.Doctors\` and \`dbo.Appointments\`. Every constraint gets a name. An appointment needs a
patient and a doctor; the same doctor cannot have two appointments at the same time; the fee is never
negative; deleting a patient removes their appointments; deleting a doctor with appointments fails.
Index the foreign key columns. Then break each rule once and record the Msg number of each error.

## Exercise 4 — T-SQL queries

Write: (a) page 2 of appointments, 10 per page, newest first; (b) each doctor's appointment count this
month with \`DATEFROMPARTS\` and a range; (c) each patient's most recent appointment using ROW_NUMBER in
a CTE; (d) a list of doctors with their patients' names joined by commas using STRING_AGG.

## Exercise 5 — an index and its plan

Load 200,000 appointments (a loop or a cross join of numbers). Turn on the actual plan and
\`SET STATISTICS IO ON\`, and run "a doctor's appointments next week, with patient id and time". Record
the operator and logical reads; add the index you think is right; re-run and record again. Get rid of
any Key Lookup.

## Exercise 6 — a procedure, a view and a trigger

Write \`dbo.BookAppointment\` with an OUTPUT parameter for the new id, \`SET NOCOUNT ON\`,
\`SET XACT_ABORT ON\` and TRY...CATCH, refusing a slot the doctor already has with \`THROW 50001\`.
Create a view \`dbo.vDoctorDay\` for the front desk. Add an AFTER UPDATE trigger that logs fee changes
for every updated row — test it with an UPDATE that changes five rows.`,
    mcqs: [
      mcq('In Exercise 1, which statements let the clinic_api user read and write rows and run procedures, but not create tables?', [
        ['ALTER ROLE db_owner ADD MEMBER clinic_api, then DENY CREATE TABLE to clinic_api', false],
        ['db_datareader and db_datawriter membership, plus GRANT EXECUTE ON SCHEMA::dbo', true],
        ['ALTER ROLE db_ddladmin ADD MEMBER clinic_api, plus a GRANT EXECUTE on dbo', false],
      ], 'The two fixed roles give SELECT and INSERT/UPDATE/DELETE on every table, and EXECUTE on the schema covers the procedures. db_owner can do almost anything and db_ddladmin exists to change the schema.'),
      mcq('In Exercise 2, which definition fits the patient\'s mobile number?', [
        ['Mobile BIGINT NOT NULL, because it is ten digits long', false],
        ['Mobile VARCHAR(15) NOT NULL, because it is an identifier', true],
        ['Mobile DECIMAL(10,0) NOT NULL, so no digit is ever lost', false],
        ['Mobile INT NOT NULL, the smallest type it fits in', false],
      ], 'A phone number is never calculated with, may need a leading + or 0, and INT cannot even hold every 10-digit value. A short VARCHAR is right; non-Latin digits are not needed here.'),
      mcq('In Exercise 3, how do you stop one doctor having two appointments at the same time?', [
        ['A CHECK constraint comparing StartsAt with every other row', false],
        ['A UNIQUE constraint on (DoctorId, StartsAt)', true],
        ['A FOREIGN KEY from StartsAt to dbo.Doctors', false],
        ['A DEFAULT of SYSUTCDATETIME() on StartsAt', false],
      ], 'A two-column UNIQUE forbids repeating the pair while allowing each value elsewhere. A CHECK sees only its own row, so it cannot compare against other rows.'),
      mcq('In Exercise 4(c), why must the ROW_NUMBER be computed in a CTE before filtering on it?', [
        ['A CTE runs faster than the same query written without it', false],
        ['WHERE is evaluated before window functions are computed', true],
        ['ROW_NUMBER is only allowed inside a CTE or a view', false],
      ], 'Window functions are evaluated with the SELECT list, after WHERE, so the row number does not exist yet in WHERE. The CTE computes it, and the outer query filters on it.'),
      mcq('In Exercise 6, the fee-change trigger logs one row although the test UPDATE changed five. Which line is the likely culprit?', [
        ['SELECT @PatientId = Id FROM inserted;', true],
        ['FROM inserted i JOIN deleted d ON d.Id = i.Id', false],
        ['SET NOCOUNT ON;', false],
      ], 'A trigger fires once per statement and inserted holds all five rows. Assigning a variable from it keeps only one; an INSERT ... SELECT from inserted joined to deleted logs all of them.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_SQLSERVER_INTERVIEW_QUESTION',
    notes: `Three questions a .NET backend interviewer asks about SQL Server, answers that earn the
follow-up, and the follow-up itself.

## Q1. "What is the difference between a clustered and a nonclustered index?"

**Strong answer:** A clustered index *is* the table — the data rows are stored in its B-tree, sorted by
the clustered key — so a table has at most one; without one it is a heap. By default the primary key
becomes the clustered index. A nonclustered index is a separate B-tree holding its key columns and, for
each entry, the clustered key as a pointer to the row; a table can have many. If a query needs columns
the nonclustered index does not have, SQL Server does a key lookup per row into the clustered index, so
for hot queries I add those columns with INCLUDE to make a covering index. I'd choose a narrow,
ever-increasing clustered key like INT IDENTITY, because every nonclustered index carries it and
random keys such as NEWID() fragment the table.

**Follow-up:** "How would you find out whether a query uses your index?" — Run it with the actual
execution plan (Ctrl+M in SSMS) and look for an Index Seek on that index rather than a scan, and for key
lookups; compare logical reads with SET STATISTICS IO ON before and after.

## Q2. "After an INSERT, how do you get the generated id — and what is wrong with @@IDENTITY?"

**Strong answer:** I use the OUTPUT clause — \`INSERT ... OUTPUT INSERTED.Id VALUES ...\` — which returns
the id, even for many rows at once, in the column's own type. For a single row SCOPE_IDENTITY() also
works: it returns the last identity created in the current scope. @@IDENTITY returns the last identity
created in the session in any scope, so if an insert trigger writes to an audit table with its own
identity, I get the audit row's id. IDENT_CURRENT returns the latest value for a table from any
session, which is wrong under concurrency.

**Follow-up:** "Are identity values guaranteed to be consecutive?" — No. A rolled-back insert consumes
its value, and SQL Server caches identity values, so a restart can skip a block. If the business needs
gap-free numbers — invoices, say — they need their own allocation, not IDENTITY.

## Q3. "A query that used to take 50 ms now takes 8 seconds. How do you investigate?"

**Strong answer:** First reproduce it with the same parameters the application used, then capture the
**actual** execution plan and SET STATISTICS IO. I look for a scan where I expected a seek, key lookups
with a high execution count, CONVERT_IMPLICIT warnings from a parameter of the wrong type, and
estimated rows far from actual rows, which points to stale statistics. Then the usual causes: data has
grown and an index is missing or not covering; someone wrapped the column in a function so the
predicate is no longer SARGable; statistics are out of date; or a plan compiled for an unusual
parameter value is being reused for every value — parameter sniffing. I fix the cause, then compare
logical reads before and after rather than trusting a single timing.

**Follow-up:** "What is parameter sniffing?" — SQL Server compiles a plan using the parameter values of
the first call and caches it. If that value was untypical — a customer with one order, when most have
thousands — the cached plan can be bad for everyone else. Options include \`OPTION (RECOMPILE)\` on that
statement, \`OPTIMIZE FOR\`, or fixing the index so one plan suits all values.`,
    mcqs: [
      mcq('An interviewer asks why every nonclustered index grows when you widen the clustered key. What is the answer?', [
        ['Each nonclustered entry stores the clustered key to find the row', true],
        ['SQL Server copies the entire table into every nonclustered index', false],
        ['Nonclustered indexes are rebuilt from scratch on each insert', false],
      ], 'The row locator in a nonclustered index is the clustered key, so a wide clustered key is repeated in every nonclustered index entry.'),
      mcq('A batch insert of 50 products must return all 50 new ids to the C# caller. What is the best T-SQL approach?', [
        ['INSERT ... SELECT, then SCOPE_IDENTITY() once for each row inserted', false],
        ['INSERT with OUTPUT INSERTED.Id, which returns one row per insert', true],
        ['INSERT ... SELECT, then @@IDENTITY minus 49 to get the first one', false],
      ], 'OUTPUT returns every generated id in one result set. SCOPE_IDENTITY gives only the last value, and identities are not guaranteed contiguous, so arithmetic on them is unsafe.'),
      mcq('A stored procedure is slow for most customers right after it was first run for a customer with only one order. Which explanation fits?', [
        ['Parameter sniffing cached a plan built for that untypical value', true],
        ['The plan cache is cleared after every call, so it recompiles each time', false],
        ['The first call locked the Orders table until the server was restarted', false],
      ], 'SQL Server compiles with the first call\'s parameter values and reuses the plan. A plan ideal for one order can be poor for customers with thousands.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_SQLSERVER_CHECKPOINT',
    notes: `Ten scenarios from running a real SQL Server 2022 database behind a .NET application: setup and
security, types, constraints, T-SQL, indexes and server-side code. Each describes a situation — decide
what you would actually do. If you miss one, go back to the unit it comes from rather than retrying
until it passes.`,
    checkpoint: [
      mcq('An ASP.NET Core API on a new VM connects with SQL authentication and gets "Login failed for user \'api_user\'." The same login works from SSMS on the database server. Windows authentication is the only mode configured. What is wrong?', [
        ['The server is not in mixed mode, so SQL logins cannot sign in', true],
        ['SSMS and the API use different TDS protocol versions on the wire', false],
        ['The api_user login must be a member of the sysadmin server role', false],
      ], 'SQL Server authentication is accepted only when the server runs in mixed mode. The SSMS session probably used Windows authentication, which is why it worked.'),
      mcq('A feedback table stores comments in English, Hindi and with emoji. Which column definition is right?', [
        ['Comment VARCHAR(1000) with the default Latin collation', false],
        ['Comment NVARCHAR(1000), written with N\'...\' literals', true],
        ['Comment TEXT, because it accepts any character set', false],
      ], 'NVARCHAR stores Unicode, and the N prefix keeps literals Unicode. A default-collation VARCHAR turns Devanagari into ?, and TEXT is deprecated and non-Unicode.'),
      mcq('`DECLARE @Code VARCHAR(2) = NULL; SELECT COALESCE(@Code, \'NONE\'), ISNULL(@Code, \'NONE\');` What are the two results?', [
        ['NONE and NONE', false],
        ['NONE and NO', true],
        ['NO and NO', false],
        ['NULL and NONE', false],
      ], 'COALESCE takes its type from the arguments by precedence and returns NONE. ISNULL takes the type of its first argument, VARCHAR(2), and truncates to NO.'),
      mcq('dbo.Orders.CouponCode is nullable and must be unique when present. Which definition works?', [
        ['CONSTRAINT UQ_Orders_Coupon UNIQUE (CouponCode), since SQL Server lets any number of NULLs through', false],
        ['CREATE UNIQUE INDEX UX_Orders_Coupon ON dbo.Orders(CouponCode) WHERE CouponCode IS NOT NULL', true],
        ['CONSTRAINT CK_Orders_Coupon CHECK (CouponCode IS NULL OR CouponCode IS UNIQUE)', false],
      ], 'A UNIQUE constraint allows only one NULL, so the second order without a coupon would fail. A filtered unique index ignores NULL rows. CHECK has no IS UNIQUE test.'),
      mcq('Deleting a customer fails with Msg 547 naming FK_Orders_Customers. The business wants old orders kept. What should you do?', [
        ['Change the key to ON DELETE CASCADE so the delete goes through', false],
        ['Keep the key, and mark the customer inactive instead of deleting', true],
        ['Disable the constraint with NOCHECK while running the delete', false],
      ], 'The constraint is doing its job: orders refer to the customer. Cascading would delete the history, and disabling the check leaves orphans. A soft delete keeps both.'),
      mcq('A search page runs `WHERE Name LIKE \'%sharma%\'` on 3 million customers and scans the index on Name. Why?', [
        ['A leading wildcard gives the index no starting point', true],
        ['LIKE can never use any index in SQL Server', false],
        ['The index on Name must also INCLUDE (Name) before LIKE can seek', false],
        ['NVARCHAR columns cannot be seeked with LIKE', false],
      ], 'The index is sorted by the start of the name. A pattern starting with % could match anywhere, so every entry must be read. LIKE \'sharma%\' can seek.'),
      mcq('An actual plan shows Estimated Number of Rows 1 against Actual Number of Rows 480,000 on an Orders scan. What is the first thing to suspect?', [
        ['Stale statistics on Orders', true],
        ['A missing PRIMARY KEY on Orders', false],
        ['Too many columns in the SELECT', false],
        ['An index that is too wide on Orders', false],
      ], 'The optimizer chose its plan from an estimate that is far from reality, and estimates come from statistics. UPDATE STATISTICS, then compare the plan again.'),
      mcq('`CREATE VIEW dbo.vTopProducts AS SELECT Id, Name, Sold FROM dbo.Products ORDER BY Sold DESC;` fails. What is the right design?', [
        ['Keep ORDER BY out of the view, and order in the query that selects from it', true],
        ['Add WITH SCHEMABINDING to the view so that ORDER BY becomes allowed there', false],
        ['Replace the view with a scalar function that returns the sorted product rows', false],
      ], 'A view is an unordered set. ORDER BY in a view is allowed only with TOP or OFFSET, and even then it does not order the view\'s results. Sort in the outer query.'),
      mcq('A procedure has `SET XACT_ABORT ON`, BEGIN TRAN, three statements and COMMIT. The second statement violates a CHECK constraint. What is the result?', [
        ['The first statement is kept and the third one also runs', false],
        ['The whole transaction is rolled back and the error is raised', true],
        ['The CHECK is skipped because XACT_ABORT allows the write', false],
      ], 'With XACT_ABORT ON, a runtime error rolls back the entire transaction and aborts the batch, so nothing is half-done. With it OFF, only the failing statement would be lost.'),
      mcq('A product page needs `SELECT Name, Price FROM dbo.Products WHERE CategoryId = @C AND IsActive = 1`, and a plan shows a Key Lookup per product. Which index fixes it?', [
        ['CREATE INDEX IX_P ON dbo.Products (Name, Price) INCLUDE (CategoryId, IsActive)', false],
        ['CREATE INDEX IX_P ON dbo.Products (CategoryId, IsActive) INCLUDE (Name, Price)', true],
        ['CREATE INDEX IX_P ON dbo.Products (Price) INCLUDE (CategoryId)', false],
      ], 'The key columns are the ones the WHERE filters on, so SQL Server can seek; INCLUDE adds the selected columns so no lookup is needed. Indexes led by Name or Price cannot seek on CategoryId.'),
    ],
  },
];
