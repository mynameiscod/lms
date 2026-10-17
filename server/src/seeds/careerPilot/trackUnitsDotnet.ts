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
