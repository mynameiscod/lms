import { TopicSeed } from './year1MegaCurriculum';
import { u } from './year4UnitKit';
import { ending } from './trackUnitsWeb';

/**
 * Career-track content for .NET Full Stack + AI, batch N1: Core C# and DSA in C#.
 *
 * C# is taught from the first program — a Year-3 student on the .NET track may never have written a
 * line of it — and DSA is taught again in C#, because the years teach it with Python code and an
 * interviewer asks a .NET candidate to write C#.
 *
 * The notes teach modern C# (.NET 8: records, pattern matching, top-level statements). Practice units
 * carry auto-graded C# exercises where the topic writes code; the runner is Mono 6.12 (about C# 7), so
 * an exercise's starter and reference solution use a classic `class Program { static void Main() }`
 * and avoid records, init, top-level statements, file-scoped namespaces and PriorityQueue<T,P>.
 */
export const TRACK_DOTNET: Record<string, TopicSeed> = {
  /* ── Getting started ── */
  JT_CS_START: { category: 'UNIVERSAL', units: [
    u('DOTNET_CLR', '.NET, the SDK and the CLR', 'What gets installed, what the compiler and the runtime each do, IL and the JIT, and what "cross-platform .NET" means.',
      ['Install the .NET SDK and explain the SDK, the runtime, the CLR, IL and the JIT'], 35, { skillKeys: ['CSHARP_BASICS'] }),
    u('FIRST_PROGRAM', 'Your First C# Program', 'dotnet new console, Program.cs, Main and top-level statements, dotnet run — and the errors everyone meets first.',
      ['Create, build and run a console app from the command line and read its first compiler errors'], 40, { after: ['DOTNET_CLR'], skillKeys: ['CSHARP_BASICS'] }),
    u('IDE', 'Working in Visual Studio and VS Code', 'Solutions and projects, running and debugging with breakpoints, and the shortcuts that pay for themselves in a week.',
      ['Create, run and debug a C# project in Visual Studio or VS Code with breakpoints'], 40, { after: ['FIRST_PROGRAM'], skillKeys: ['IDE_PROFICIENCY'] }),
    u('PROJECTS_NUGET', 'Projects, Solutions and NuGet', 'The .csproj file, solutions with several projects, adding a NuGet package, and dotnet build, test and publish.',
      ['Create a solution with two projects, add a NuGet package, and publish a runnable build'], 45, { after: ['IDE'], skillKeys: ['IDE_PROFICIENCY'] }),
    u('INPUT_OUTPUT', 'Reading Input and Printing Output', 'Console.ReadLine, int.Parse and TryParse, Console.WriteLine and string formatting — the shape every coding round expects.',
      ['Read numbers and lines from standard input and print formatted output'], 35, { after: ['PROJECTS_NUGET'], skillKeys: ['CSHARP_BASICS'] }),
    ...ending('C# Setup', 'INPUT_OUTPUT', { minutes: [35, 45, 30, 35] }),
  ] },

  /* ── Fundamentals ── */
  JT_CS_BASICS: { category: 'UNIVERSAL', units: [
    u('TYPES', 'Variables and Built-in Types', 'int, long, double, decimal, char, bool and string, var, their ranges, and overflow with checked.',
      ['Choose the right type — including decimal for money — and predict overflow and integer division'], 40),
    u('CONVERSIONS_NULLABLE', 'Conversions, Nullable Types and null', 'Implicit and explicit casts, Convert and Parse, int?, ??, ?. and the null-reference error.',
      ['Convert between types safely and handle values that may be null'], 40, { after: ['TYPES'] }),
    u('OPERATORS', 'Operators and Expressions', 'Arithmetic, increment, comparison, logical short-circuit, the ternary operator and precedence.',
      ['Predict the value of expressions including ++, %, && and ?:'], 35, { after: ['CONVERSIONS_NULLABLE'] }),
    u('CONDITIONS', 'if, else and switch', 'Branches, the switch statement, switch expressions and simple pattern matching.',
      ['Write conditions and switch statements and expressions correctly'], 40, { after: ['OPERATORS'], skillKeys: ['CSHARP_BASICS'] }),
    u('LOOPS', 'Loops: for, while, do-while and foreach', 'Choosing a loop, break and continue, and nested loops.',
      ['Write and trace loops, including nested ones, and choose the right kind'], 45, { after: ['CONDITIONS'] }),
    u('ARRAYS', 'Arrays, Multidimensional and Jagged Arrays', 'Fixed-size arrays, default values, Array.Sort and Array.IndexOf, int[,] grids and int[][] jagged arrays.',
      ['Create, fill, search and print 1D, 2D and jagged arrays'], 45, { after: ['LOOPS'] }),
    u('STRINGS', 'Strings, Interpolation and StringBuilder', 'Immutability, == on strings, the common string methods, $"" interpolation, and building strings in a loop.',
      ['Manipulate strings with the string API and build them efficiently with StringBuilder'], 45, { after: ['ARRAYS'] }),
    u('METHODS', 'Methods: Parameters, ref, out and Overloading', 'Defining methods, value and reference types as arguments, ref, out, params, optional and named arguments, and overloading.',
      ['Write methods with parameters and returns and explain what C# passes, including ref and out'], 45, { after: ['STRINGS'] }),
    ...ending('C# Fundamentals', 'METHODS'),
  ] },

  /* ── OOP ── */
  JT_CS_OOP: { category: 'UNIVERSAL', units: [
    u('CLASSES_OBJECTS', 'Classes and Objects', 'Fields, methods and instances — modelling a thing in code — and the new keyword.',
      ['Write a class with fields and methods and create objects from it'], 40),
    u('CONSTRUCTORS', 'Constructors and this', 'Initialising an object, overloaded constructors, chaining with : this(...), and object initialisers.',
      ['Write constructors, chain them, and initialise objects with object-initialiser syntax'], 40, { after: ['CLASSES_OBJECTS'] }),
    u('PROPERTIES', 'Properties and Encapsulation', 'Access modifiers, get and set, auto-properties, private setters and keeping an object valid.',
      ['Hide state behind properties that keep an object valid, using the right access modifiers'], 40, { after: ['CONSTRUCTORS'] }),
    u('STATIC_READONLY', 'static, const and readonly', 'Class members vs instance members, constants, readonly fields and immutable objects.',
      ['Use static, const and readonly correctly and design a simple immutable class'], 35, { after: ['PROPERTIES'] }),
    u('INHERITANCE', 'Inheritance and base', 'Deriving a class, what is inherited, base calls, sealed, and when inheritance is the wrong tool.',
      ['Derive a class, call base, and explain composition over inheritance'], 45, { after: ['STATIC_READONLY'] }),
    u('POLYMORPHISM', 'Polymorphism: virtual, override and new', 'Overloading vs overriding, virtual and override, hiding with new, and which method runs.',
      ['Explain and use overriding and overloading, and predict which method runs'], 45, { after: ['INHERITANCE'] }),
    u('ABSTRACTION', 'Abstract Classes and Interfaces', 'Contracts, default interface methods, multiple interfaces, and choosing between the two.',
      ['Design with interfaces and abstract classes and say when each fits'], 45, { after: ['POLYMORPHISM'] }),
    u('STRUCTS_RECORDS', 'Structs, Records and Value Semantics', 'Value types vs reference types, struct, record and record struct, with-expressions and value equality.',
      ['Choose between a class, a struct and a record and predict how each copies and compares'], 40, { after: ['ABSTRACTION'] }),
    u('OBJECT_METHODS', 'Equals, GetHashCode and ToString', 'The System.Object methods every type inherits, and the contract between Equals and GetHashCode.',
      ['Override Equals, GetHashCode and ToString correctly and explain why they go together'], 40, { after: ['STRUCTS_RECORDS'] }),
    ...ending('C# OOP', 'OBJECT_METHODS', { project: ['MINI_PROJECT', 'Mini Project — A Bank Account System', 'A console bank: accounts of different kinds, deposits, withdrawals and transfers, designed with encapsulation, inheritance and interfaces.'] }),
  ] },

  /* ── Exceptions and files ── */
  JT_CS_EXCEPTIONS: { category: 'UNIVERSAL', units: [
    u('HIERARCHY', 'Exceptions in .NET', 'System.Exception and its common subclasses, why C# has no checked exceptions, and reading a stack trace.',
      ['Name the common exception types and read a stack trace to the line that failed'], 40),
    u('TRY_CATCH', 'try, catch, finally and throw', 'Catching the right exception, exception filters with when, finally, and throw vs throw ex.',
      ['Handle exceptions without swallowing them, rethrow correctly, and use finally'], 40, { after: ['HIERARCHY'] }),
    u('USING_FILES', 'using, IDisposable and File I/O', 'Releasing what you open with using, and reading and writing files with File, StreamReader and StreamWriter.',
      ['Read and write text files and always release resources with using'], 45, { after: ['TRY_CATCH'] }),
    u('CUSTOM', 'Custom Exceptions and Error Design', 'Exceptions of your own, the Try pattern (int.TryParse), and when to throw rather than return a result.',
      ['Define a custom exception and decide when a method should throw or use the Try pattern'], 35, { after: ['USING_FILES'] }),
    ...ending('C# Exceptions', 'CUSTOM'),
  ] },

  /* ── Collections and generics ── */
  JT_CS_COLLECTIONS: { category: 'UNIVERSAL', units: [
    u('OVERVIEW', 'The Collection Types and IEnumerable', 'System.Collections.Generic, IEnumerable, ICollection, IList and IDictionary — and why you program to the interface.',
      ['Map the collection interfaces to their implementations and declare variables by interface'], 35),
    u('LISTS', 'List<T> and LinkedList<T>', 'How each is built, what each operation costs, capacity, and which to choose.',
      ['Use List<T> and LinkedList<T> and justify the choice by cost'], 40, { after: ['OVERVIEW'] }),
    u('DICTIONARIES', 'Dictionary<TKey,TValue>, and How It Works', 'Buckets, hashing, collisions, TryGetValue, and SortedDictionary.',
      ['Use dictionaries for counting and grouping and explain how a Dictionary finds a key'], 50, { after: ['LISTS'] }),
    u('SETS', 'HashSet<T> and SortedSet<T>', 'Uniqueness, ordering, set operations, and what a set needs from its elements.',
      ['Choose a set by ordering need and explain why Equals and GetHashCode matter'], 40, { after: ['DICTIONARIES'] }),
    u('STACKS_QUEUES', 'Stack<T>, Queue<T> and PriorityQueue', 'LIFO and FIFO, and ordering by priority with PriorityQueue<TElement,TPriority>.',
      ['Use Stack<T> and Queue<T>, and order work by priority'], 40, { after: ['SETS'] }),
    u('ITERATION_SORTING', 'Iterators, yield, IComparable and IComparer', 'foreach and modifying while iterating, writing an iterator with yield return, natural and custom ordering.',
      ['Sort objects with IComparable and IComparer and write an iterator with yield return'], 45, { after: ['STACKS_QUEUES'] }),
    u('GENERICS', 'Generics and Constraints', 'Type parameters, generic methods, where constraints, and covariance in IEnumerable<out T>.',
      ['Write a generic class and method with constraints and read generic signatures'], 45, { after: ['ITERATION_SORTING'] }),
    ...ending('C# Collections', 'GENERICS'),
  ] },

  /* ── Delegates, LINQ and modern C# ── */
  JT_CS_LINQ: { category: 'UNIVERSAL', units: [
    u('DELEGATES', 'Delegates, Func and Action', 'Behaviour as a value: delegate types, Func, Action and Predicate.',
      ['Pass and store behaviour with Func, Action and Predicate'], 40),
    u('LAMBDAS_EVENTS', 'Lambdas and Events', 'Lambda expressions, closures and their capture trap, and events with EventHandler.',
      ['Write lambdas, explain what a closure captures, and raise and handle an event'], 40, { after: ['DELEGATES'] }),
    u('LINQ_BASICS', 'LINQ: Where, Select and OrderBy', 'Method syntax and query syntax, filtering, projecting and sorting, First, Any and Count.',
      ['Build LINQ queries that filter, transform and sort data'], 50, { after: ['LAMBDAS_EVENTS'] }),
    u('LINQ_GROUPING', 'LINQ: GroupBy, Join and Aggregates', 'Grouping and counting, joining two sequences, Sum, Max, Average and Aggregate.',
      ['Group, join and summarise data with LINQ'], 45, { after: ['LINQ_BASICS'] }),
    u('DEFERRED', 'Deferred Execution and IQueryable', 'When a LINQ query actually runs, multiple enumeration, ToList, and why IQueryable matters for EF Core.',
      ['Predict when a query runs and avoid enumerating it twice'], 35, { after: ['LINQ_GROUPING'] }),
    u('MODERN_CSHARP', 'Modern C#: Pattern Matching, Nullable References and Records', 'is and switch patterns, nullable reference types, init, required, and the syntax you will read in every current codebase.',
      ['Read and write modern C# with pattern matching, nullable reference types and records'], 40, { after: ['DEFERRED'] }),
    ...ending('LINQ and Modern C#', 'MODERN_CSHARP', { project: ['MINI_PROJECT', 'Mini Project — A Library Management System', 'A console library system: books, members and loans with OOP, collections, exceptions and LINQ — search, borrow, return and reports.'] }),
  ] },

  /* ── async, threads and the runtime ── */
  JT_CS_ASYNC: { category: 'UNIVERSAL', units: [
    u('TASKS', 'Threads, the Thread Pool and Task', 'Running work elsewhere, Task and Task<T>, Task.Run, and waiting for a result.',
      ['Start work as tasks and wait for their results'], 40),
    u('ASYNC_AWAIT', 'async and await', 'What await does to a method, async all the way down, ConfigureAwait, and the .Result deadlock.',
      ['Write async methods correctly and explain why blocking on .Result can deadlock'], 45, { after: ['TASKS'] }),
    u('WHENALL_CANCEL', 'Task.WhenAll, Timeouts and Cancellation', 'Running I/O concurrently, CancellationToken, and handling the exceptions of several tasks.',
      ['Run several I/O calls concurrently and cancel them cleanly'], 40, { after: ['ASYNC_AWAIT'] }),
    u('THREAD_SAFETY', 'Race Conditions, lock and Concurrent Collections', 'Shared state and lost updates, lock, Interlocked, ConcurrentDictionary, and deadlock.',
      ['Find a race condition and fix it with lock, Interlocked or a concurrent collection'], 45, { after: ['WHENALL_CANCEL'] }),
    u('MEMORY_GC', 'How .NET Manages Memory', 'Stack and heap, value and reference types in memory, garbage collection and generations, and IDisposable vs the finaliser.',
      ['Explain stack vs heap, how the garbage collector decides what to free, and when to dispose'], 40, { after: ['THREAD_SAFETY'] }),
    ...ending('Async C#', 'MEMORY_GC'),
  ] },

  /* ── DSA in C#, linear ── */
  JT_CS_DSA_LINEAR: { category: 'UNIVERSAL', units: [
    u('COMPLEXITY', 'Big-O in C# Terms', 'Counting operations, and what List<T>, LinkedList<T> and Dictionary each cost.',
      ['State the time and space cost of C# code and of the collection operations it uses'], 40, { skillKeys: ['DSA_COMPLEXITY'] }),
    u('ARRAY_PATTERNS', 'Array and String Patterns: Two Pointers and Sliding Window', 'The two patterns behind most array and string questions, in C#.',
      ['Solve array and string problems with two pointers and a sliding window in C#'], 50, { after: ['COMPLEXITY'], skillKeys: ['DSA_ARRAYS'] }),
    u('LINKED_LISTS', 'Linked Lists in C#', 'A Node class, insertion, deletion, reversal, and the fast-and-slow pointer.',
      ['Implement and manipulate a singly linked list in C#'], 50, { after: ['ARRAY_PATTERNS'], skillKeys: ['DSA_LINKED_LIST'] }),
    u('STACKS_QUEUES', 'Stacks and Queues in C#', 'Balanced brackets, next greater element, and queue-based simulations with Stack<T> and Queue<T>.',
      ['Solve stack and queue problems in C#'], 45, { after: ['LINKED_LISTS'], skillKeys: ['DSA_STACK'] }),
    u('HASHING', 'Hashing Problems with Dictionary and HashSet', 'Counting, two-sum, grouping anagrams, and the first non-repeating character.',
      ['Solve lookup and counting problems in C# with Dictionary and HashSet'], 45, { after: ['STACKS_QUEUES'], skillKeys: ['DSA_HASHING'] }),
    u('RECURSION', 'Recursion and Backtracking in C#', 'Base cases, the call stack, and generating subsets and permutations.',
      ['Write recursive and backtracking solutions in C# and trace them'], 50, { after: ['HASHING'], skillKeys: ['DSA_RECURSION'] }),
    u('SORTING_SEARCHING', 'Sorting and Binary Search in C#', 'Array.Sort and List.Sort with comparisons, merge sort by hand, and binary search on sorted data.',
      ['Sort with comparisons, implement merge sort, and write a correct binary search in C#'], 50, { after: ['RECURSION'], skillKeys: ['DSA_SORTING'] }),
    ...ending('DSA in C#: Linear Structures', 'SORTING_SEARCHING', { minutes: [45, 75, 40, 45] }),
  ] },

  /* ── DSA in C#, non-linear ── */
  JT_CS_DSA_NONLINEAR: { category: 'UNIVERSAL', units: [
    u('TREES', 'Binary Trees and Traversals in C#', 'A TreeNode class, recursive and iterative traversals, height and level order.',
      ['Build a binary tree in C# and traverse it in every order'], 50, { skillKeys: ['DSA_TREES'] }),
    u('BST', 'Binary Search Trees in C#', 'Insert, search, delete and validate a BST, and SortedDictionary as a ready-made one.',
      ['Implement BST operations in C# and validate a tree'], 45, { after: ['TREES'], skillKeys: ['DSA_TREES'] }),
    u('HEAPS', 'Heaps and Priority Queue Problems', 'A binary heap by hand, top-k, merging sorted lists, and running medians.',
      ['Solve top-k and merge problems in C# with a heap'], 45, { after: ['BST'], skillKeys: ['DSA_HEAPS'] }),
    u('GRAPHS', 'Graphs, BFS and DFS in C#', 'Adjacency lists, BFS for shortest steps, DFS for components and cycles.',
      ['Represent a graph in C# and solve problems with BFS and DFS'], 50, { after: ['HEAPS'], skillKeys: ['DSA_GRAPHS'] }),
    u('SHORTEST_PATH', 'Shortest Paths and Topological Sort', 'Dijkstra with a priority queue, and ordering tasks with dependencies.',
      ['Implement Dijkstra and a topological sort in C#'], 50, { after: ['GRAPHS'], skillKeys: ['DSA_GRAPHS'] }),
    u('GREEDY', 'Greedy Algorithms in C#', 'Intervals, activity selection, and how to check a greedy choice is safe.',
      ['Solve interval and scheduling problems greedily in C# and justify the choice'], 40, { after: ['SHORTEST_PATH'], skillKeys: ['DSA_GREEDY'] }),
    u('DYNAMIC_PROGRAMMING', 'Dynamic Programming in C#', 'Memoisation and tabulation: climbing stairs, coin change, longest common subsequence.',
      ['Solve 1D and 2D dynamic-programming problems in C#, top-down and bottom-up'], 55, { after: ['GREEDY'], skillKeys: ['DSA_DP'] }),
    ...ending('DSA in C#: Trees, Graphs and DP', 'DYNAMIC_PROGRAMMING', { minutes: [45, 75, 40, 45] }),
  ] },
};

/**
 * Batch N2: SQL Server, ADO.NET, Entity Framework Core, and the .NET dependency-injection container.
 *
 * SQL itself — SELECT to joins, design, transactions and indexes — is taught by the years and reused
 * through the SQL_SERVER pack; this adds what is particular to SQL Server and T-SQL, then C# reaching
 * the database directly (ADO.NET) and through an ORM (EF Core), then the container every ASP.NET Core
 * app is built on. No auto-graded exercises: the grader has no database.
 */
export const TRACK_DOTNET_DATA: Record<string, TopicSeed> = {
  /* ── SQL Server and T-SQL ── */
  JT_SQLSERVER: { category: 'UNIVERSAL', units: [
    u('SETUP_SSMS', 'Installing SQL Server and Working in SSMS', 'Developer and Express editions, SQL Server in Docker, SSMS and Azure Data Studio, databases, logins and users.',
      ['Install SQL Server, connect with SSMS, and create a database and a login for an application'], 40),
    u('DATA_TYPES', 'SQL Server Data Types', 'INT and BIGINT, DECIMAL for money, NVARCHAR vs VARCHAR, DATETIME2 and DATE, BIT, UNIQUEIDENTIFIER, and Unicode.',
      ['Choose SQL Server column types for real data, including money, dates and Unicode text'], 40, { after: ['SETUP_SSMS'] }),
    u('IDENTITY_CONSTRAINTS', 'IDENTITY, Keys and Constraints', 'IDENTITY columns, PRIMARY and FOREIGN KEY, UNIQUE, CHECK, DEFAULT, and ON DELETE CASCADE.',
      ['Create tables with identity keys, foreign keys and constraints that keep the data valid'], 40, { after: ['DATA_TYPES'] }),
    u('TSQL', 'T-SQL: What Differs from Other SQL', 'TOP and OFFSET-FETCH paging, ISNULL and COALESCE, GETDATE and DATEADD, string functions, CTEs and window functions.',
      ['Write T-SQL queries with paging, null handling, dates, CTEs and window functions'], 45, { after: ['IDENTITY_CONSTRAINTS'] }),
    u('INDEXES_PLANS', 'Clustered and Nonclustered Indexes, and Execution Plans', 'How SQL Server stores a table, the two kinds of index, covering indexes, and reading an execution plan.',
      ['Choose clustered and nonclustered indexes for a query and read its execution plan'], 45, { after: ['TSQL'] }),
    u('PROCEDURES_VIEWS', 'Stored Procedures, Views, Functions and Triggers', 'What each is for, how to write one, transactions with TRY...CATCH, and why most application logic stays in C#.',
      ['Write a stored procedure and a view, handle errors in T-SQL, and say when logic belongs in the database'], 45, { after: ['INDEXES_PLANS'] }),
    ...ending('SQL Server', 'PROCEDURES_VIEWS', { minutes: [40, 55, 35, 40] }),
  ] },

  /* ── ADO.NET ── */
  JT_ADONET: { category: 'UNIVERSAL', units: [
    u('CONNECTION', 'SqlConnection and Connection Strings', 'Microsoft.Data.SqlClient, a connection string, opening and closing with using, and keeping secrets out of code.',
      ['Connect a C# program to SQL Server and release the connection safely'], 40),
    u('COMMANDS_PARAMETERS', 'SqlCommand, Parameters and SQL Injection', 'Why string-built SQL is an attack, and how parameters close it; ExecuteNonQuery and ExecuteScalar.',
      ['Query and update SQL Server with parameterised commands'], 45, { after: ['CONNECTION'] }),
    u('READER_MAPPING', 'Reading Results into Objects', 'SqlDataReader, reading columns by type, DBNull, and mapping rows to C# objects.',
      ['Read rows with SqlDataReader into objects and handle NULL correctly'], 40, { after: ['COMMANDS_PARAMETERS'] }),
    u('TRANSACTIONS', 'Transactions in ADO.NET', 'SqlTransaction, commit and rollback, TransactionScope, and keeping a transfer all-or-nothing.',
      ['Group commands into a transaction and roll back on failure'], 40, { after: ['READER_MAPPING'] }),
    u('ASYNC_POOLING', 'Async Data Access and Connection Pooling', 'OpenAsync and ExecuteReaderAsync, how pooling works, and why a leaked connection exhausts the pool.',
      ['Write async data access and explain connection pooling and pool exhaustion'], 40, { after: ['TRANSACTIONS'] }),
    u('REPOSITORY_DAPPER', 'The Repository Pattern and Dapper', 'Keeping SQL behind an interface, and Dapper — the micro-ORM that maps rows to objects with one call.',
      ['Write a repository over ADO.NET and the same one with Dapper, and compare them'], 45, { after: ['ASYNC_POOLING'] }),
    ...ending('ADO.NET', 'REPOSITORY_DAPPER', { project: ['MINI_PROJECT', 'Mini Project — An Inventory App on ADO.NET', 'A console inventory system on SQL Server through ADO.NET: products, suppliers and stock movements through a repository layer, parameterised commands, and a transaction for every stock transfer.'] }),
  ] },

  /* ── Entity Framework Core ── */
  JT_EFCORE: { category: 'UNIVERSAL', units: [
    u('ORM_DBCONTEXT', 'What EF Core Does, and the DbContext', 'Objects and tables, what an ORM saves and what it costs, DbContext and DbSet, and the SQL Server provider.',
      ['Explain what EF Core does and set up a DbContext for SQL Server'], 40),
    u('ENTITIES_MAPPING', 'Entities, Conventions, Annotations and the Fluent API', 'How EF Core maps a class to a table by convention, and overriding it with attributes or OnModelCreating.',
      ['Map entities to tables with conventions, data annotations and the Fluent API'], 45, { after: ['ORM_DBCONTEXT'] }),
    u('MIGRATIONS', 'Migrations', 'dotnet ef migrations add and database update, what a migration file contains, seeding, and migrations in a team.',
      ['Create and apply migrations, read the SQL they generate, and seed data'], 40, { after: ['ENTITIES_MAPPING'] }),
    u('QUERYING', 'Querying with LINQ', 'How a LINQ query becomes SQL, Where, Select projections, ordering and paging, and what cannot be translated.',
      ['Write EF Core LINQ queries, project to DTOs, and read the SQL they produce'], 45, { after: ['MIGRATIONS'] }),
    u('RELATIONSHIPS', 'Relationships: One-to-Many and Many-to-Many', 'Navigation properties, foreign keys, many-to-many with and without a join entity, and delete behaviour.',
      ['Model one-to-many and many-to-many relationships and their delete behaviour'], 45, { after: ['QUERYING'] }),
    u('LOADING', 'Loading Related Data and the N+1 Problem', 'Include and ThenInclude, explicit and lazy loading, split queries, and finding and fixing N+1.',
      ['Load related data deliberately and fix an N+1 query'], 45, { after: ['RELATIONSHIPS'] }),
    u('CHANGE_TRACKING', 'Change Tracking and SaveChanges', 'Entity states, how SaveChanges decides what to write, AsNoTracking, and updating a detached entity.',
      ['Predict what SaveChanges writes, and use AsNoTracking for read-only queries'], 40, { after: ['LOADING'] }),
    u('RAW_SQL_CONCURRENCY', 'Raw SQL, Bulk Updates, Transactions and Concurrency', 'FromSql and ExecuteUpdate, explicit transactions, and optimistic concurrency with a rowversion column.',
      ['Run raw SQL safely, update in bulk, and handle a concurrency conflict'], 45, { after: ['CHANGE_TRACKING'] }),
    ...ending('EF Core', 'RAW_SQL_CONCURRENCY', { project: ['MINI_PROJECT', 'Mini Project — The Inventory App on EF Core', 'The ADO.NET inventory app rebuilt on EF Core: entities and relationships, migrations, LINQ queries with projections, no N+1, and a concurrency check on stock updates.'] }),
  ] },

  /* ── Dependency injection, configuration and logging ── */
  JT_DOTNET_DI: { category: 'UNIVERSAL', units: [
    u('WHY_DI', 'Why Dependency Injection', 'The problems of wiring an application by hand, depending on interfaces, and what a container does for you.',
      ['Explain dependency injection and why depending on interfaces makes code testable'], 35),
    u('SERVICE_COLLECTION', 'Registering and Injecting Services', 'IServiceCollection, constructor injection, registering interfaces and implementations, and the generic host.',
      ['Register services and receive them through constructors'], 40, { after: ['WHY_DI'] }),
    u('LIFETIMES', 'Service Lifetimes: Singleton, Scoped and Transient', 'What each lifetime means, the request scope, and the captive-dependency bug.',
      ['Choose the right lifetime for a service and spot a captive dependency'], 40, { after: ['SERVICE_COLLECTION'] }),
    u('CONFIGURATION', 'Configuration, Environments and the Options Pattern', 'appsettings.json and environment-specific files, environment variables, user secrets, and IOptions<T>.',
      ['Read settings per environment through the options pattern and keep secrets out of source'], 40, { after: ['LIFETIMES'] }),
    u('LOGGING', 'Logging with ILogger', 'ILogger<T>, log levels, structured logging and message templates, and where logs go.',
      ['Log with ILogger at the right level using structured message templates'], 35, { after: ['CONFIGURATION'] }),
    ...ending('.NET Dependency Injection', 'LOGGING', { minutes: [40, 50, 40, 40] }),
  ] },
};

/**
 * Batch N3: an ASP.NET Core Web API on SQL Server, secured with JWT and tested, then the React app wired
 * to it and the whole stack containerised and deployed. React itself is the shared REACT pack.
 */
export const TRACK_DOTNET_WEB: Record<string, TopicSeed> = {
  /* ── ASP.NET Core Web API ── */
  JT_ASPNET_API: { category: 'UNIVERSAL', units: [
    u('PIPELINE', 'ASP.NET Core: The Project, Program.cs and the Request Pipeline', 'dotnet new webapi, the builder and the app, Kestrel, middleware in order, and what happens to one request.',
      ['Create a Web API project and explain how a request flows through the middleware pipeline'], 45),
    u('CONTROLLERS_MINIMAL', 'Controllers and Minimal APIs', '[ApiController], routes and HTTP verbs, route and query parameters, and the same endpoints as minimal APIs.',
      ['Build endpoints with controllers and with minimal APIs, and say when each fits'], 45, { after: ['PIPELINE'] }),
    u('DTOS_RESULTS', 'Request Bodies, DTOs and Status Codes', 'Model binding, DTOs instead of entities, ActionResult<T> and TypedResults, and the status code each outcome deserves.',
      ['Accept and return DTOs and answer every outcome with the right status code'], 45, { after: ['CONTROLLERS_MINIMAL'] }),
    u('VALIDATION', 'Validating Input', 'Data annotations, automatic 400 responses with ValidationProblemDetails, and FluentValidation for real rules.',
      ['Validate requests and return field errors the caller can act on'], 40, { after: ['DTOS_RESULTS'] }),
    u('ERRORS_MIDDLEWARE', 'Global Error Handling and Custom Middleware', 'UseExceptionHandler, IExceptionHandler and ProblemDetails, one error shape for the whole API, and writing your own middleware.',
      ['Return one consistent error shape for every failure and write a small custom middleware'], 45, { after: ['VALIDATION'] }),
    u('CONFIG_ENVIRONMENTS', 'Configuration, Environments and Logging in a Web API', 'appsettings per environment, options bound to sections, launchSettings, and request logging.',
      ['Configure an API per environment and log requests usefully'], 35, { after: ['ERRORS_MIDDLEWARE'] }),
    u('OPENAPI', 'Documenting the API with OpenAPI and Swagger UI', 'Swashbuckle and the generated spec, XML comments and response types, and an API another developer can call without asking you.',
      ['Publish an OpenAPI description and Swagger UI that document every endpoint and response'], 35, { after: ['CONFIG_ENVIRONMENTS'] }),
    ...ending('ASP.NET Core Web APIs', 'OPENAPI', { project: ['MINI_PROJECT', 'Mini Project — A Product Catalogue Web API', 'An ASP.NET Core Web API for a product catalogue: CRUD endpoints with DTOs, validation, one ProblemDetails error shape, per-environment configuration and Swagger docs.'] }),
  ] },

  /* ── EF Core inside the API ── */
  JT_ASPNET_DATA: { category: 'UNIVERSAL', units: [
    u('DBCONTEXT_IN_API', 'EF Core in a Web API', 'Registering the DbContext, its scoped lifetime, connection strings from configuration, and migrations at deployment.',
      ['Wire EF Core into an API correctly and apply migrations safely'], 40),
    u('SERVICE_LAYER', 'Controllers, Services and Repositories', 'Keeping controllers thin, where business rules live, mapping entities to DTOs, and whether to wrap EF Core in a repository.',
      ['Structure an API into controller, service and data layers and map entities to DTOs'], 45, { after: ['DBCONTEXT_IN_API'] }),
    u('PAGINATION_FILTERING', 'Pagination, Sorting and Filtering', 'Skip and Take, page metadata, sorting and filtering from query parameters, and an endpoint that never returns ten thousand rows.',
      ['Build paged, sorted and filtered list endpoints'], 40, { after: ['SERVICE_LAYER'] }),
    u('ASYNC_TRANSACTIONS', 'Async Endpoints, Cancellation and Transactions', 'async all the way to the database, passing the request CancellationToken, and a transaction across several writes.',
      ['Write async endpoints that honour cancellation and keep multi-step writes atomic'], 40, { after: ['PAGINATION_FILTERING'] }),
    ...ending('EF Core in ASP.NET Core', 'ASYNC_TRANSACTIONS', { minutes: [40, 55, 35, 40] }),
  ] },

  /* ── Security ── */
  JT_ASPNET_SECURITY: { category: 'UNIVERSAL', units: [
    u('AUTH_PIPELINE', 'Authentication and Authorization in ASP.NET Core', 'Schemes and handlers, UseAuthentication and UseAuthorization, [Authorize] and [AllowAnonymous], and what happens before your controller.',
      ['Explain how ASP.NET Core authenticates a request and decides whether it may proceed'], 40),
    u('IDENTITY_PASSWORDS', 'Users and Passwords with ASP.NET Core Identity', 'Identity on EF Core, UserManager, how passwords are hashed, and why a password is never stored or logged.',
      ['Register and sign in users with Identity and explain how their passwords are stored'], 45, { after: ['AUTH_PIPELINE'] }),
    u('JWT_AUTH', 'JWT Bearer Authentication', 'A login endpoint that issues a token, AddJwtBearer validating it, expiry and refresh, and what a JWT does not protect.',
      ['Issue and validate JWTs and explain their limits'], 45, { after: ['IDENTITY_PASSWORDS'] }),
    u('ROLES_POLICIES', 'Roles, Policies and Resource-Based Authorization', 'Role checks, policy-based authorization with requirements, and checking that a user may touch THIS record.',
      ['Protect endpoints with roles and policies and enforce per-record ownership'], 45, { after: ['JWT_AUTH'] }),
    ...ending('ASP.NET Core Security', 'ROLES_POLICIES', { minutes: [45, 55, 40, 40] }),
  ] },

  /* ── Testing ── */
  JT_ASPNET_TESTING: { category: 'UNIVERSAL', units: [
    u('XUNIT', 'Unit Tests with xUnit', 'Facts and theories, assertions, arrange-act-assert, and testing one thing at a time.',
      ['Write focused unit tests with xUnit, including data-driven theories'], 40),
    u('MOQ', 'Mocking Dependencies with Moq', 'Mocking an interface, setups and returns, verifying calls, and when a mock lies to you.',
      ['Isolate a service from its dependencies with Moq and verify the calls that matter'], 40, { after: ['XUNIT'] }),
    u('INTEGRATION_TESTS', 'Integration Tests with WebApplicationFactory', 'Running the real API in memory, HttpClient against it, replacing services, and testing secured endpoints.',
      ['Test API endpoints end to end in memory, including authenticated requests'], 45, { after: ['MOQ'] }),
    u('DATABASE_TESTS', 'Testing with a Real Database', 'Why the in-memory provider misleads, SQLite in-memory and Testcontainers for SQL Server, and resetting data between tests.',
      ['Test data access against a real database engine and keep tests independent'], 40, { after: ['INTEGRATION_TESTS'] }),
    ...ending('ASP.NET Core Testing', 'DATABASE_TESTS', { project: ['MINI_PROJECT', 'Mini Project — A Secured, Tested Library API', 'A library API on ASP.NET Core and SQL Server: books, members and loans through EF Core, JWT login with roles, and unit, integration and database tests.'] }),
  ] },

  /* ── React and ASP.NET Core together, then deployed ── */
  JT_FULLSTACK_DOTNET: { category: 'UNIVERSAL', units: [
    u('REACT_CALLS_API', 'React Calling ASP.NET Core', 'An API client with axios or fetch, the base URL from the environment, and the Vite dev proxy to the API.',
      ['Call an ASP.NET Core API from React through one API client'], 40),
    u('CORS', 'CORS: Why the Browser Blocks You', 'Origins, preflight requests, and a named CORS policy in ASP.NET Core that does not open the API to everyone.',
      ['Configure CORS in ASP.NET Core for exactly the origins that need it'], 35, { after: ['REACT_CALLS_API'] }),
    u('JWT_LOGIN_FLOW', 'The Login Flow End to End', 'Logging in, keeping the token, sending it on every call, protected routes, and handling 401 and expiry.',
      ['Build a complete JWT login flow across React and ASP.NET Core'], 45, { after: ['CORS'] }),
    u('FILE_UPLOAD', 'Uploading Files', 'Multipart requests from a React form, IFormFile in ASP.NET Core, size limits, and where files go.',
      ['Upload a file from React to the API safely with limits'], 40, { after: ['JWT_LOGIN_FLOW'] }),
    u('ERRORS_ACROSS', 'Errors Across Both Halves', 'One ProblemDetails contract, showing field errors in the form, and the network failure nobody handled.',
      ['Show API errors properly in the UI, including validation errors and network failures'], 35, { after: ['FILE_UPLOAD'] }),
    u('DOCKER', 'Docker for the Full Stack', 'A multi-stage Dockerfile for the API, one for the React build behind nginx, and docker compose with SQL Server.',
      ['Containerise the API and the frontend and run the stack with docker compose'], 45, { after: ['ERRORS_ACROSS'] }),
    u('DEPLOY', 'Deploying the Stack to the Cloud', 'A managed SQL database, the API and the frontend on a cloud host (Azure App Service or a container host), secrets in configuration, and checking it works.',
      ['Deploy the full stack with secrets kept out of source and verify it end to end'], 45, { after: ['DOCKER'] }),
    ...ending('Full-Stack Integration', 'DEPLOY', { project: ['PROJECT', 'Project — A Full-Stack .NET App, Deployed', 'The React frontend and the secured ASP.NET Core API on SQL Server as one application: login, roles, CRUD, an upload, consistent errors, Docker, and a public URL.'] }),
  ] },
};

/**
 * Batch N4: AI in .NET, then the capstone. The language-free AI lessons (how models work, prompting, RAG and
 * agent concepts — JT_AI_CONCEPTS and JT_AI_AGENTS) are shared with the other tracks; this adds building with
 * them in C#: the OpenAI .NET SDK first, to see what happens underneath, then Semantic Kernel.
 */
export const TRACK_DOTNET_AI: Record<string, TopicSeed> = {
  /* ── Generative AI in .NET ── */
  JT_AI_DOTNET: { category: 'UNIVERSAL', units: [
    u('OPENAI_SDK', 'Calling a Model from ASP.NET Core with the OpenAI .NET SDK', 'The OpenAI and Azure OpenAI clients, chat messages and parameters, the key from configuration, timeouts, retries and cost.',
      ['Call an LLM from an ASP.NET Core service with the key kept out of the code and the cost under control'], 45),
    u('STRUCTURED_OUTPUT', 'Structured Output into C# Types', 'Asking for JSON against a schema, deserialising it with System.Text.Json, validating it, and failing safely when it does not parse.',
      ['Turn a model answer into a validated C# object and handle the failure case'], 40, { after: ['OPENAI_SDK'] }),
    u('STREAMING_REACT', 'Streaming a Chat Answer into React', 'Streaming completions as IAsyncEnumerable, server-sent events from ASP.NET Core, reading the stream in React, and cancelling it.',
      ['Stream a chat answer from ASP.NET Core to a React UI token by token'], 45, { after: ['STRUCTURED_OUTPUT'] }),
    u('SEMANTIC_KERNEL', 'Semantic Kernel: Kernel, Connectors and Prompt Functions', 'What Semantic Kernel adds over the raw SDK, building a Kernel with dependency injection, chat completion services, prompt templates and functions.',
      ['Rebuild a raw SDK call with Semantic Kernel and say what the framework adds and costs'], 45, { after: ['STREAMING_REACT'] }),
    u('EMBEDDINGS_VECTOR_STORE', 'Embeddings and a Vector Store in .NET', 'Embedding documents, chunking them, storing vectors (Azure AI Search, PostgreSQL pgvector or an in-memory store) and searching by meaning.',
      ['Ingest documents into a vector store from C# and search them by meaning'], 45, { after: ['SEMANTIC_KERNEL'], skillKeys: ['RAG_SYSTEMS'] }),
    u('RAG', 'RAG in .NET, by Hand and with Semantic Kernel', 'Retrieve, ground, cite — written by hand first, then with Semantic Kernel — and answering only from the app’s documents.',
      ['Answer questions over your own documents in C#, citing what the answer used'], 50, { after: ['EMBEDDINGS_VECTOR_STORE'], skillKeys: ['RAG_SYSTEMS'] }),
    ...ending('AI in .NET', 'RAG', { project: ['MINI_PROJECT', 'Mini Project — An AI Help Desk on ASP.NET Core', 'An ASP.NET Core endpoint that answers questions over a set of product documents with RAG — streamed to React, with cited sources, an "I don’t know" path and a small evaluation set.'] }),
  ] },

  /* ── Agents in .NET ── */
  JT_AI_AGENTS_DOTNET: { category: 'UNIVERSAL', units: [
    u('TOOLS_DOTNET', 'Tool Calling in C#', 'Tools as C# methods, the JSON schema the model sees, running the loop by hand with the OpenAI SDK, and checking every call against the user’s permissions.',
      ['Give a model tools backed by your own services, with checks on every call'], 45),
    u('SK_AGENTS', 'Plugins and Agents with Semantic Kernel', 'Plugins and [KernelFunction], automatic function calling with a step limit, filters as guardrails, and a human approval step before anything irreversible.',
      ['Build a bounded tool-calling agent with Semantic Kernel, including an approval step'], 45, { after: ['TOOLS_DOTNET'] }),
    u('MEMORY_MCP_DOTNET', 'Memory and MCP in .NET', 'Per-user chat history and its limits, and using or exposing tools over MCP with the C# SDK.',
      ['Give an agent per-user memory and connect it to an MCP server'], 40, { after: ['SK_AGENTS'] }),
    ...ending('.NET AI Agents', 'MEMORY_MCP_DOTNET', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── The capstone ── */
  JT_CAPSTONE_DOTNET: { category: 'UNIVERSAL', units: [
    u('BRIEF', 'The Capstone: Scope, Architecture and Plan', 'An e-commerce store or a job portal on React, ASP.NET Core and SQL Server with AI built in: the architecture, a design document and a plan.',
      ['Scope the capstone, draw its architecture and write a plan you can deliver in the time'], 45),
    u('BUILD_CORE', 'Capstone Build — The Full-Stack Application', 'React, ASP.NET Core Web API, EF Core and SQL Server: login and roles, the core features, tests, and a deployed first version.',
      ['Build and deploy the core application to the standard of the earlier projects'], 300, { unitType: 'PROJECT', after: ['BRIEF'] }),
    u('AI_FEATURES', 'Capstone Build — The AI Assistant and the Agent', 'A RAG assistant over the app’s own catalogue or listings, and a Semantic Kernel agent that acts for the user with approval.',
      ['Add a grounded AI assistant and a guarded agent to the application and evaluate both'], 240, { unitType: 'PROJECT', after: ['BUILD_CORE'], skillKeys: ['LLM_APPLICATIONS', 'AI_AGENTS'] }),
    u('DEFENCE', 'Demo Day: Presenting and Defending the Capstone', 'A five-minute demo, the architecture walk-through, and the questions a panel asks about it.',
      ['Demo the capstone and defend every design decision under questioning'], 45, { unitType: 'PRACTICE', after: ['AI_FEATURES'] }),
    u('CHECKPOINT', 'Capstone — Checkpoint', 'Where you actually are across the whole track, measured rather than felt.',
      ['Show full-stack and AI judgement at the standard a hiring panel expects'], 40, { unitType: 'CHECKPOINT', after: ['DEFENCE'] }),
  ] },
};
