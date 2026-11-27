import { TopicSeed, UnitSeed } from './year1MegaCurriculum';
import { u } from './year4UnitKit';

/**
 * Career-track content, batch 6: Year-4 placement for Java Full Stack + AI.
 *
 * Year 4 already teaches aptitude, core-CS MCQs, coding patterns, system design, HR, the resume and
 * the mocks without naming a language; the track's placement packs reuse all of it. What is added
 * here is what a Java full-stack interview asks that Year 4 does not: Java, Spring and Hibernate,
 * React and JavaScript, SQL and MySQL and AI at interview depth, coding rounds solved in Java, and
 * the Java full-stack resume, capstone defence and mock loop. The web, SQL and AI interview topics
 * name no backend language, so Python Full Stack reuses them.
 *
 * An interview topic is a few question sets (the questions, a strong answer, the follow-up), a
 * rapid-fire round, a mock round and a checkpoint.
 */
export const interview = (
  what: string,
  sets: [slug: string, title: string, description: string, skillKeys: string[]][],
): UnitSeed[] => {
  const units: UnitSeed[] = sets.map(([slug, title, description, skillKeys], i) =>
    u(slug, title, description, [`Answer the ${title.toLowerCase()} questions an interviewer asks, at the depth the follow-up needs`], 40,
      { skillKeys, ...(i ? { after: [sets[i - 1][0]] } : {}) }));
  const last = sets[sets.length - 1][0];
  units.push(
    u('RAPID_FIRE', `${what} — Rapid-Fire Round`, `Thirty short questions at the speed a screening call asks them.`,
      [`Answer short ${what.toLowerCase()} questions correctly and quickly`], 40, { unitType: 'PRACTICE', after: [last] }),
    u('MOCK', `${what} — Mock Interview`, `A full mock round with an interviewer's script, model answers and how it is scored.`,
      [`Hold up through a ${what.toLowerCase()} interview round, follow-ups included`], 45, { unitType: 'PRACTICE', after: ['RAPID_FIRE'] }),
    u('CHECKPOINT', `${what} — Checkpoint`, 'Where you actually are on this, measured rather than felt.',
      [`Show ${what.toLowerCase()} at the standard a full-stack interview expects`], 40, { unitType: 'CHECKPOINT', after: ['MOCK'] }),
  );
  return units;
};

export const TRACK_PLACEMENT: Record<string, TopicSeed> = {
  /* ── Core Java at interview depth ── */
  JT_IV_CORE_JAVA: { category: 'UNIVERSAL', units: interview('Core Java Interview', [
    ['IV_LANGUAGE', 'Java Language and JVM Basics', 'JDK, JRE and JVM, strings and immutability, == and equals, static and final, pass-by-value.', ['JAVA_BASICS']],
    ['IV_OOP', 'OOP in Java', 'The four pillars as interviewers probe them, overloading and overriding, abstract classes and interfaces, composition.', ['JAVA_OOP']],
    ['IV_COLLECTIONS', 'Collections and HashMap Internals', 'List vs Set vs Map, HashMap buckets and resizing, equals and hashCode, fail-fast iterators, ConcurrentHashMap.', ['JAVA_COLLECTIONS']],
    ['IV_JAVA8', 'Java 8+: Lambdas, Streams and Optional', 'Functional interfaces, stream pipelines and their laziness, map vs flatMap, collectors, Optional misuse.', ['JAVA_STREAMS']],
    ['IV_CONCURRENCY', 'Multithreading and Concurrency', 'Thread vs Runnable, synchronized and volatile, deadlock, executors, CompletableFuture.', ['JAVA_CONCURRENCY']],
    ['IV_EXCEPTIONS_JVM', 'Exceptions, Memory and Garbage Collection', 'Checked vs unchecked, try-with-resources, heap and stack, GC roots, memory leaks in Java.', ['JAVA_EXCEPTIONS']],
  ]) },

  /* ── Spring, Spring Boot and Hibernate at interview depth ── */
  JT_IV_SPRING: { category: 'UNIVERSAL', units: interview('Spring and Hibernate Interview', [
    ['IV_SPRING_CORE', 'Spring Core: IoC, DI and Beans', 'IoC vs DI, injection types, bean scopes and lifecycle, @Component vs @Bean, circular dependencies.', ['SPRING_CORE']],
    ['IV_BOOT', 'Spring Boot Internals', 'Auto-configuration, starters, @SpringBootApplication, profiles and properties, Actuator.', ['SPRING_BOOT']],
    ['IV_REST', 'REST APIs in Spring', 'Controller annotations, status codes, validation, global exception handling, idempotency and versioning.', ['SPRING_BOOT']],
    ['IV_JPA', 'Hibernate and Spring Data JPA', 'Entity states, lazy vs eager, N+1, first- and second-level cache, @Transactional pitfalls, repositories.', ['JPA_HIBERNATE']],
    ['IV_SECURITY', 'Spring Security and JWT', 'The filter chain, authentication vs authorization, JWT flow and its weaknesses, CSRF and CORS, password storage.', ['SPRING_SECURITY']],
    ['IV_ARCHITECTURE', 'Testing, Microservices and Production', 'Unit vs integration tests in Spring, monolith vs microservices, service-to-service calls, logging and config in production.', ['SPRING_BOOT']],
  ]) },

  /* ── JavaScript, React, HTML and CSS at interview depth (no backend language) ── */
  JT_IV_FRONTEND: { category: 'UNIVERSAL', units: interview('JavaScript and React Interview', [
    ['IV_HTML_CSS', 'HTML and CSS', 'Semantic HTML, accessibility, the box model, specificity, Flexbox vs Grid, responsive design.', ['HTML', 'CSS']],
    ['IV_JS_CORE', 'JavaScript Core', 'Scope and closures, hoisting, this, prototypes, == vs ===, var/let/const.', ['JS_BASICS', 'JS_ES6']],
    ['IV_JS_ASYNC', 'Asynchronous JavaScript and the Event Loop', 'The event loop, microtasks vs macrotasks, promises, async/await, debounce and throttle.', ['JS_ASYNC']],
    ['IV_REACT_CORE', 'React Fundamentals', 'Virtual DOM and reconciliation, keys, props vs state, controlled components, lifting state.', ['REACT_COMPONENTS']],
    ['IV_REACT_HOOKS', 'Hooks, State and Performance', 'useEffect dependencies and cleanup, useMemo and useCallback, context vs Redux, re-render causes.', ['REACT_HOOKS']],
  ]) },

  /* ── SQL and MySQL at interview depth (no backend language) ── */
  JT_IV_SQL_MYSQL: { category: 'UNIVERSAL', units: interview('SQL and MySQL Interview', [
    ['IV_QUERIES', 'The Classic SQL Questions', 'Nth highest salary, duplicates, joins of every kind, GROUP BY with HAVING, window functions.', ['SQL_BASICS', 'SQL_JOINS']],
    ['IV_DESIGN', 'Keys, Normalisation and Schema Design', 'Primary, foreign and composite keys, normal forms and when to denormalise, designing a schema live.', ['DB_DESIGN']],
    ['IV_INDEXES_TX', 'Indexes, Transactions and MySQL Internals', 'B-tree indexes and when they are not used, EXPLAIN, ACID, isolation levels, InnoDB locking.', ['DB_INDEXING', 'DB_TRANSACTIONS']],
  ]) },

  /* ── AI at interview depth (no backend language) ── */
  JT_IV_AI: { category: 'UNIVERSAL', units: interview('AI Engineering Interview', [
    ['IV_LLM', 'LLMs in an Application', 'Tokens and context, temperature, structured output, cost and latency, hallucination and how you handle it.', ['LLM_APPLICATIONS', 'GENERATIVE_AI_LLM']],
    ['IV_RAG', 'Embeddings and RAG', 'Embeddings, chunking, retrieval quality, grounding and citations, evaluating a RAG system.', ['RAG_SYSTEMS']],
    ['IV_AGENTS', 'Agents, Tools and Safety', 'Agents vs workflows, tool calling, memory, MCP, prompt injection and guardrails.', ['AI_AGENTS']],
  ]) },

  /* ── Coding rounds, solved in Java ── */
  JT_CODING_JAVA: { category: 'UNIVERSAL', units: [
    u('JAVA_FOR_CODING', 'Java for Coding Rounds', 'Fast input and output, the collections and idioms timed rounds use, and the Java mistakes that cost marks.',
      ['Write contest-style Java quickly: reading input, choosing collections, avoiding overflow and slow string building'], 40, { skillKeys: ['JAVA_BASICS'] }),
    u('ROUND_ARRAYS_STRINGS', 'Coding Round — Arrays and Strings', 'Prefix sums, two pointers and sliding windows on arrays and strings, under a clock, in Java.',
      ['Solve array and string problems in Java within the time a coding round allows'], 50, { unitType: 'PRACTICE', after: ['JAVA_FOR_CODING'], skillKeys: ['DSA_ARRAYS', 'DSA_STRINGS'] }),
    u('ROUND_HASHING', 'Coding Round — Hashing and Counting', 'HashMap and HashSet patterns: frequency, complements, grouping and first-unique, in Java.',
      ['Solve hashing problems in Java and state their cost'], 50, { unitType: 'PRACTICE', after: ['ROUND_ARRAYS_STRINGS'], skillKeys: ['DSA_HASHING'] }),
    u('ROUND_STACKS_LISTS', 'Coding Round — Stacks, Queues and Linked Lists', 'Deque as stack and queue, monotonic stacks, and linked-list pointer problems, in Java.',
      ['Solve stack, queue and linked-list problems in Java'], 50, { unitType: 'PRACTICE', after: ['ROUND_HASHING'], skillKeys: ['DSA_STACK', 'DSA_LINKED_LIST'] }),
    u('ROUND_TREES_GRAPHS', 'Coding Round — Trees and Graphs', 'Traversals, BFS on grids and graphs, and reading a graph from input, in Java.',
      ['Solve tree and graph problems in Java'], 55, { unitType: 'PRACTICE', after: ['ROUND_STACKS_LISTS'], skillKeys: ['DSA_TREES', 'DSA_GRAPHS'] }),
    u('ROUND_DP_GREEDY', 'Coding Round — Greedy and Dynamic Programming', 'Recognising greedy and DP problems and writing the table in Java.',
      ['Solve greedy and dynamic-programming problems in Java'], 55, { unitType: 'PRACTICE', after: ['ROUND_TREES_GRAPHS'], skillKeys: ['DSA_DP', 'DSA_GREEDY'] }),
    u('CHECKPOINT', 'Coding Rounds in Java — Checkpoint', 'Where you actually are on this, measured rather than felt.',
      ['Read and reason about Java solutions at the standard a coding round expects'], 40, { unitType: 'CHECKPOINT', after: ['ROUND_DP_GREEDY'] }),
  ] },

  /* ── Java and Spring MCQ rounds ── */
  JT_MCQ_JAVA_SPRING: { category: 'UNIVERSAL', units: [
    u('MCQ_OUTPUT', 'What Does This Java Print?', 'Output-prediction questions: strings, integer overflow, static and instance, inheritance, exceptions and finally.',
      ['Predict the output of short Java programs without running them'], 40, { skillKeys: ['JAVA_BASICS', 'JAVA_OOP'] }),
    u('MCQ_SPRING', 'Spring and Hibernate MCQs', 'The annotations, defaults and behaviours online tests ask about in Spring, Boot and JPA.',
      ['Answer Spring, Spring Boot and JPA MCQs correctly and quickly'], 40, { after: ['MCQ_OUTPUT'], skillKeys: ['SPRING_CORE', 'SPRING_BOOT'] }),
    u('TIMED_SET', 'Timed MCQ Set — Java and Spring', 'A timed mixed set in the format of a company online test, with the reasoning for each answer.',
      ['Finish a timed Java and Spring MCQ set with accuracy'], 45, { unitType: 'PRACTICE', after: ['MCQ_SPRING'] }),
    u('CHECKPOINT', 'Java and Spring MCQs — Checkpoint', 'Where you actually are on this, measured rather than felt.',
      ['Show Java and Spring knowledge at online-test standard'], 40, { unitType: 'CHECKPOINT', after: ['TIMED_SET'] }),
  ] },

  /* ── The Java full-stack candidate: resume, capstone defence, the mock loop ── */
  JT_PLACE_JAVA_FS: { category: 'UNIVERSAL', units: [
    u('RESUME', 'A Java Full-Stack Resume and GitHub', 'The template, the skills section a recruiter filters on, project bullets with numbers, and a GitHub that backs them up.',
      ['Write a Java full-stack resume and GitHub profile whose every claim can be checked'], 45, { skillKeys: ['PLACEMENT_READINESS', 'PORTFOLIO_EVIDENCE'] }),
    u('DEFEND_CAPSTONE', 'Defending Your Full-Stack + AI Capstone', 'The architecture walk-through, the hardest bug, the AI part and how it is evaluated, and the questions panels ask.',
      ['Defend the capstone end to end under follow-up questions'], 45, { after: ['RESUME'], skillKeys: ['TECHNICAL_EXPLANATION'] }),
    u('MOCK_LOOP', 'The Java Full-Stack Interview Loop — Mock', 'Online test, technical round one (Java and DSA), technical round two (Spring, React, SQL), managerial and HR — as one mock day.',
      ['Go through a complete Java full-stack interview loop and act on its debrief'], 60, { unitType: 'PRACTICE', after: ['DEFEND_CAPSTONE'], skillKeys: ['INTERVIEW_PERFORMANCE'] }),
    u('CHECKPOINT', 'Java Full-Stack Placement — Checkpoint', 'Where you actually are on this, measured rather than felt.',
      ['Show the judgement a Java full-stack hiring panel looks for'], 40, { unitType: 'CHECKPOINT', after: ['MOCK_LOOP'] }),
  ] },
};

/**
 * Year-4 placement for Python Full Stack + AI (batch P4). The web, SQL and AI interview topics
 * above name no backend language and are reused as they stand; these add Python, Django and
 * FastAPI at interview depth, coding rounds solved in Python, and the Python full-stack candidate.
 */
export const TRACK_PLACEMENT_PY: Record<string, TopicSeed> = {
  /* ── Python at interview depth ── */
  JT_IV_PYTHON: { category: 'UNIVERSAL', units: interview('Python Interview', [
    ['IV_LANGUAGE', 'Python’s Data Model', 'Names and objects, mutability, is vs ==, copying, integer and string interning, and pass-by-object-reference.', ['PYTHON_BASICS']],
    ['IV_DATA_STRUCTURES', 'Lists, Dicts and Sets Inside', 'How list, dict and set are built, the cost of each operation, hashing and why a list cannot be a dict key.', ['PYTHON_COLLECTIONS']],
    ['IV_FUNCTIONS', 'Functions, Closures and Decorators', '*args and **kwargs, mutable defaults, late-binding closures, decorators with arguments, and generators.', ['PYTHON_FUNCTIONS']],
    ['IV_OOP', 'OOP the Python Way', 'Dunder methods, MRO and super, @property, classmethod vs staticmethod, ABCs, dataclasses and duck typing.', ['PYTHON_OOP']],
    ['IV_CONCURRENCY', 'The GIL, Threads, Processes and asyncio', 'What the GIL blocks and what it does not, threads for I/O, processes for CPU, and asyncio’s event loop.', ['PYTHON_ADVANCED']],
    ['IV_ERRORS_MEMORY', 'Exceptions, Context Managers and Memory', 'Exception hierarchy and chaining, with and its protocol, reference counting, cycles and the garbage collector.', ['PYTHON_ERROR_HANDLING']],
  ]) },

  /* ── Django, DRF and FastAPI at interview depth ── */
  JT_IV_DJANGO: { category: 'UNIVERSAL', units: interview('Django and FastAPI Interview', [
    ['IV_DJANGO_CORE', 'Django Internals', 'The request–response cycle and middleware, settings, apps, signals and when to avoid them, and the admin.', ['DJANGO']],
    ['IV_ORM', 'The Django ORM Under Pressure', 'Lazy querysets, N+1 and its fixes, F and Q, annotate vs aggregate, transactions and select_for_update, migrations.', ['DJANGO']],
    ['IV_DRF', 'Django REST Framework', 'Serializers vs ModelSerializers, viewsets and routers, validation order, pagination and filtering, versioning.', ['DJANGO_REST']],
    ['IV_AUTH_SECURITY', 'Auth and Security in Django', 'Sessions vs JWT, Simple JWT refresh and blacklisting, permissions and object ownership, CSRF, CORS and the deploy checklist.', ['DJANGO_REST']],
    ['IV_FASTAPI', 'FastAPI', 'Pydantic validation, async vs def endpoints, dependencies, when to choose FastAPI over Django, and testing it.', ['FASTAPI']],
    ['IV_ARCHITECTURE', 'Scaling and Running a Python Backend', 'Gunicorn workers, caching, background jobs, a separate AI service, testing strategy and what breaks at ten times the users.', ['DJANGO']],
  ]) },

  /* ── Coding rounds, solved in Python ── */
  JT_CODING_PYTHON: { category: 'UNIVERSAL', units: [
    u('PYTHON_FOR_CODING', 'Python for Coding Rounds', 'Fast input, the collections, heapq and bisect a timed round needs, recursion limits, and the Python mistakes that cost marks.',
      ['Write contest-style Python quickly: reading input, choosing structures, and avoiding slow or recursive traps'], 40, { skillKeys: ['PYTHON_BASICS'] }),
    u('ROUND_ARRAYS_STRINGS', 'Coding Round — Arrays and Strings', 'Prefix sums, two pointers and sliding windows on lists and strings, under a clock, in Python.',
      ['Solve array and string problems in Python within the time a coding round allows'], 50, { unitType: 'PRACTICE', after: ['PYTHON_FOR_CODING'], skillKeys: ['DSA_ARRAYS', 'DSA_STRINGS'] }),
    u('ROUND_HASHING', 'Coding Round — Hashing and Counting', 'dict, set, Counter and defaultdict patterns: frequency, complements, grouping and first-unique, in Python.',
      ['Solve hashing problems in Python and state their cost'], 50, { unitType: 'PRACTICE', after: ['ROUND_ARRAYS_STRINGS'], skillKeys: ['DSA_HASHING'] }),
    u('ROUND_STACKS_LISTS', 'Coding Round — Stacks, Queues and Linked Lists', 'deque as stack and queue, monotonic stacks, and linked-list pointer problems, in Python.',
      ['Solve stack, queue and linked-list problems in Python'], 50, { unitType: 'PRACTICE', after: ['ROUND_HASHING'], skillKeys: ['DSA_STACK', 'DSA_LINKED_LIST'] }),
    u('ROUND_TREES_GRAPHS', 'Coding Round — Trees and Graphs', 'Traversals, BFS on grids and graphs, and reading a graph from input — iteratively, because of Python’s recursion limit.',
      ['Solve tree and graph problems in Python'], 55, { unitType: 'PRACTICE', after: ['ROUND_STACKS_LISTS'], skillKeys: ['DSA_TREES', 'DSA_GRAPHS'] }),
    u('ROUND_DP_GREEDY', 'Coding Round — Greedy and Dynamic Programming', 'Recognising greedy and DP problems, tables and lru_cache, in Python.',
      ['Solve greedy and dynamic-programming problems in Python'], 55, { unitType: 'PRACTICE', after: ['ROUND_TREES_GRAPHS'], skillKeys: ['DSA_DP', 'DSA_GREEDY'] }),
    u('CHECKPOINT', 'Coding Rounds in Python — Checkpoint', 'Where you actually are on this, measured rather than felt.',
      ['Read and reason about Python solutions at the standard a coding round expects'], 40, { unitType: 'CHECKPOINT', after: ['ROUND_DP_GREEDY'] }),
  ] },

  /* ── Python and Django MCQ rounds ── */
  JT_MCQ_PYTHON_DJANGO: { category: 'UNIVERSAL', units: [
    u('MCQ_OUTPUT', 'What Does This Python Print?', 'Output-prediction questions: mutable defaults, closures, slicing, integer and string identity, scoping, generators and exceptions.',
      ['Predict the output of short Python programs without running them'], 40, { skillKeys: ['PYTHON_BASICS', 'PYTHON_ADVANCED'] }),
    u('MCQ_DJANGO', 'Django, DRF and FastAPI MCQs', 'The defaults, behaviours and settings online tests ask about in Django, its ORM, DRF and FastAPI.',
      ['Answer Django, DRF and FastAPI MCQs correctly and quickly'], 40, { after: ['MCQ_OUTPUT'], skillKeys: ['DJANGO', 'DJANGO_REST'] }),
    u('TIMED_SET', 'Timed MCQ Set — Python and Django', 'A timed mixed set in the format of a company online test, with the reasoning for each answer.',
      ['Finish a timed Python and Django MCQ set with accuracy'], 45, { unitType: 'PRACTICE', after: ['MCQ_DJANGO'] }),
    u('CHECKPOINT', 'Python and Django MCQs — Checkpoint', 'Where you actually are on this, measured rather than felt.',
      ['Show Python and Django knowledge at online-test standard'], 40, { unitType: 'CHECKPOINT', after: ['TIMED_SET'] }),
  ] },

  /* ── The Python full-stack candidate ── */
  JT_PLACE_PY_FS: { category: 'UNIVERSAL', units: [
    u('RESUME', 'A Python Full-Stack Resume and GitHub', 'The template, the skills line recruiters filter on, project bullets with numbers, and a GitHub that backs them up.',
      ['Write a Python full-stack resume and GitHub profile whose every claim can be checked'], 45, { skillKeys: ['PLACEMENT_READINESS', 'PORTFOLIO_EVIDENCE'] }),
    u('DEFEND_CAPSTONE', 'Defending Your Python Full-Stack + AI Capstone', 'The architecture walk-through, Django vs FastAPI, the AI service and how it is evaluated, and the questions panels ask.',
      ['Defend the capstone end to end under follow-up questions'], 45, { after: ['RESUME'], skillKeys: ['TECHNICAL_EXPLANATION'] }),
    u('MOCK_LOOP', 'The Python Full-Stack Interview Loop — Mock', 'Online test, technical round one (Python and DSA), technical round two (Django, React, SQL, the AI service), managerial and HR — as one mock day.',
      ['Go through a complete Python full-stack interview loop and act on its debrief'], 60, { unitType: 'PRACTICE', after: ['DEFEND_CAPSTONE'], skillKeys: ['INTERVIEW_PERFORMANCE'] }),
    u('CHECKPOINT', 'Python Full-Stack Placement — Checkpoint', 'Where you actually are on this, measured rather than felt.',
      ['Show the judgement a Python full-stack hiring panel looks for'], 40, { unitType: 'CHECKPOINT', after: ['MOCK_LOOP'] }),
  ] },
};

/**
 * .NET Full Stack + AI, batch N5: what a .NET full-stack interview asks that the shared placement packs do
 * not — C#, ASP.NET Core, EF Core and SQL Server at interview depth, coding rounds solved in C# (auto-graded
 * on the Mono 6.12 runner: classic Main, about C# 7), the C# and .NET sections of online tests, and the .NET
 * full-stack candidate. Web, SQL, AI, core CS, aptitude, HR and mocks are the shared packs.
 */
export const TRACK_PLACEMENT_DOTNET: Record<string, TopicSeed> = {
  /* ── C# at interview depth ── */
  JT_IV_CSHARP: { category: 'UNIVERSAL', units: interview('C# Interview', [
    ['IV_LANGUAGE', 'Value Types, Reference Types and the Type System', 'Stack and heap, boxing, string immutability and interning, ref, out and in, nullable value and reference types.', ['CSHARP_BASICS']],
    ['IV_OOP', 'OOP the C# Way', 'virtual, override and new, abstract classes vs interfaces and default interface methods, sealed, structs vs classes vs records.', ['CSHARP_OOP']],
    ['IV_COLLECTIONS', 'Collections and Generics Inside', 'How List and Dictionary are built, the cost of each operation, hashing and GetHashCode, IEnumerable vs ICollection vs IList, and generic constraints.', ['CSHARP_COLLECTIONS']],
    ['IV_LINQ_DELEGATES', 'Delegates, Events and LINQ', 'Func, Action and events, closures in loops, deferred execution, IEnumerable vs IQueryable, and the LINQ questions every round asks.', ['CSHARP_LINQ']],
    ['IV_ASYNC', 'async, await, Tasks and Threads', 'What await really does, Task vs Thread vs ValueTask, deadlocks from .Result, ConfigureAwait, cancellation and thread safety.', ['CSHARP_ASYNC']],
    ['IV_MEMORY_EXCEPTIONS', 'Memory, IDisposable and Exceptions', 'Garbage collection and generations, IDisposable vs the finaliser, using, throw vs throw ex, and exception filters.', ['CSHARP_EXCEPTIONS']],
  ]) },

  /* ── ASP.NET Core, EF Core and SQL Server at interview depth ── */
  JT_IV_ASPNET: { category: 'UNIVERSAL', units: interview('ASP.NET Core and EF Core Interview', [
    ['IV_PIPELINE', 'The Pipeline, Middleware and DI', 'The request pipeline and middleware order, the three service lifetimes and the captive dependency, configuration and options.', ['ASPNET_CORE']],
    ['IV_WEBAPI', 'Web API Design in ASP.NET Core', 'Controllers vs minimal APIs, model binding and validation, filters vs middleware, ProblemDetails, versioning and status codes.', ['ASPNET_CORE']],
    ['IV_EFCORE', 'EF Core Under Pressure', 'Change tracking and AsNoTracking, N+1 and Include, migrations in a team, raw SQL, transactions and concurrency tokens.', ['EF_CORE']],
    ['IV_SECURITY', 'Security in ASP.NET Core', 'Authentication vs authorization, JWT bearer and its limits, Identity and password hashing, policies and resource-based checks, CORS and secrets.', ['ASPNET_SECURITY']],
    ['IV_SQLSERVER', 'SQL Server in the Backend Round', 'Clustered vs nonclustered indexes, execution plans, isolation levels and locking, stored procedures vs ORM queries, and deadlocks.', ['SQL_SERVER']],
    ['IV_ARCHITECTURE', 'Scaling and Running a .NET Backend', 'Caching, background services, logging and health checks, testing strategy, containers, and what breaks at ten times the users.', ['ASPNET_CORE']],
  ]) },

  /* ── Coding rounds, solved in C# ── */
  JT_CODING_CSHARP: { category: 'UNIVERSAL', units: [
    u('CSHARP_FOR_CODING', 'C# for Coding Rounds', 'Fast input and output, the collections a timed round needs, sorting with comparisons, overflow and long, and the C# mistakes that cost marks.',
      ['Write contest-style C# quickly: reading input, choosing structures, and avoiding slow or overflowing code'], 40, { skillKeys: ['CSHARP_BASICS'] }),
    u('ROUND_ARRAYS_STRINGS', 'Coding Round — Arrays and Strings', 'Prefix sums, two pointers and sliding windows on arrays and strings, under a clock, in C#.',
      ['Solve array and string problems in C# within the time a coding round allows'], 50, { unitType: 'PRACTICE', after: ['CSHARP_FOR_CODING'], skillKeys: ['DSA_ARRAYS', 'DSA_STRINGS'] }),
    u('ROUND_HASHING', 'Coding Round — Hashing and Counting', 'Dictionary and HashSet patterns: frequency, complements, grouping and first-unique, in C#.',
      ['Solve hashing problems in C# and state their cost'], 50, { unitType: 'PRACTICE', after: ['ROUND_ARRAYS_STRINGS'], skillKeys: ['DSA_HASHING'] }),
    u('ROUND_STACKS_LISTS', 'Coding Round — Stacks, Queues and Linked Lists', 'Stack<T> and Queue<T>, monotonic stacks, and linked-list pointer problems, in C#.',
      ['Solve stack, queue and linked-list problems in C#'], 50, { unitType: 'PRACTICE', after: ['ROUND_HASHING'], skillKeys: ['DSA_STACK', 'DSA_LINKED_LIST'] }),
    u('ROUND_TREES_GRAPHS', 'Coding Round — Trees and Graphs', 'Traversals, BFS on grids and graphs, and reading a graph from input, in C#.',
      ['Solve tree and graph problems in C#'], 55, { unitType: 'PRACTICE', after: ['ROUND_STACKS_LISTS'], skillKeys: ['DSA_TREES', 'DSA_GRAPHS'] }),
    u('ROUND_DP_GREEDY', 'Coding Round — Greedy and Dynamic Programming', 'Recognising greedy and DP problems, tables and memoisation with a Dictionary, in C#.',
      ['Solve greedy and dynamic-programming problems in C#'], 55, { unitType: 'PRACTICE', after: ['ROUND_TREES_GRAPHS'], skillKeys: ['DSA_DP', 'DSA_GREEDY'] }),
    u('CHECKPOINT', 'Coding Rounds in C# — Checkpoint', 'Where you actually are on this, measured rather than felt.',
      ['Read and reason about C# solutions at the standard a coding round expects'], 40, { unitType: 'CHECKPOINT', after: ['ROUND_DP_GREEDY'] }),
  ] },

  /* ── C# and .NET MCQ rounds ── */
  JT_MCQ_CSHARP_DOTNET: { category: 'UNIVERSAL', units: [
    u('MCQ_OUTPUT', 'What Does This C# Print?', 'Output-prediction questions: value vs reference copies, boxing, string identity, virtual vs new, closures in loops, deferred LINQ, exceptions and finally.',
      ['Predict the output of short C# programs without running them'], 40, { skillKeys: ['CSHARP_BASICS', 'CSHARP_OOP'] }),
    u('MCQ_DOTNET', 'ASP.NET Core and EF Core MCQs', 'The defaults, behaviours and settings online tests ask about in ASP.NET Core, dependency injection and EF Core.',
      ['Answer ASP.NET Core and EF Core MCQs correctly and quickly'], 40, { after: ['MCQ_OUTPUT'], skillKeys: ['ASPNET_CORE', 'EF_CORE'] }),
    u('TIMED_SET', 'Timed MCQ Set — C# and .NET', 'A timed mixed set in the format of a company online test, with the reasoning for each answer.',
      ['Finish a timed C# and .NET MCQ set with accuracy'], 45, { unitType: 'PRACTICE', after: ['MCQ_DOTNET'] }),
    u('CHECKPOINT', 'C# and .NET MCQs — Checkpoint', 'Where you actually are on this, measured rather than felt.',
      ['Show C# and .NET knowledge at online-test standard'], 40, { unitType: 'CHECKPOINT', after: ['TIMED_SET'] }),
  ] },

  /* ── The .NET full-stack candidate ── */
  JT_PLACE_DOTNET_FS: { category: 'UNIVERSAL', units: [
    u('RESUME', 'A .NET Full-Stack Resume and GitHub', 'The template, the skills line recruiters filter on (C#, ASP.NET Core, EF Core, SQL Server, React, Azure), project bullets with numbers, and a GitHub that backs them up.',
      ['Write a .NET full-stack resume and GitHub profile whose every claim can be checked'], 45, { skillKeys: ['PLACEMENT_READINESS', 'PORTFOLIO_EVIDENCE'] }),
    u('DEFEND_CAPSTONE', 'Defending Your .NET Full-Stack + AI Capstone', 'The architecture walk-through, why the AI lives inside the API, Semantic Kernel vs the raw SDK, how the AI is evaluated, and the questions panels ask.',
      ['Defend the capstone end to end under follow-up questions'], 45, { after: ['RESUME'], skillKeys: ['TECHNICAL_EXPLANATION'] }),
    u('MOCK_LOOP', 'The .NET Full-Stack Interview Loop — Mock', 'Online test, technical round one (C# and DSA), technical round two (ASP.NET Core, EF Core, React, SQL Server, the AI features), managerial and HR — as one mock day.',
      ['Go through a complete .NET full-stack interview loop and act on its debrief'], 60, { unitType: 'PRACTICE', after: ['DEFEND_CAPSTONE'], skillKeys: ['INTERVIEW_PERFORMANCE'] }),
    u('CHECKPOINT', '.NET Full-Stack Placement — Checkpoint', 'Where you actually are on this, measured rather than felt.',
      ['Show the judgement a .NET full-stack hiring panel looks for'], 40, { unitType: 'CHECKPOINT', after: ['MOCK_LOOP'] }),
  ] },
};
