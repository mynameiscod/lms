import { TopicSeed } from './year1MegaCurriculum';
import { u } from './year4UnitKit';
import { ending } from './trackUnitsWeb';

/**
 * Career-track content, batch 2: Core Java and DSA in Java, for Java Full Stack + AI (and reused by
 * Java Backend Engineer). Java is taught from the first program — a Year-3 student on a Java track
 * may never have written a line of it — and DSA is taught again in Java, because the years teach it
 * with Python code and an interviewer asks a Java candidate to write Java.
 *
 * Practice units carry auto-graded Java exercises where the topic writes code. The runner is
 * Java 15: exercises avoid records and later features, even where the notes teach Java 17.
 */
export const TRACK_JAVA: Record<string, TopicSeed> = {
  /* ── Getting started ── */
  JT_JAVA_START: { category: 'UNIVERSAL', units: [
    u('JDK_JVM', 'JDK, JRE and the JVM', 'What gets installed, what javac and java each do, and why Java runs "anywhere".',
      ['Install a JDK and explain the JDK, JRE, JVM and bytecode'], 35, { skillKeys: ['JAVA_BASICS'] }),
    u('FIRST_PROGRAM', 'Your First Java Program', 'A class, a main method, compiling and running — and the errors everyone meets first.',
      ['Write, compile and run a program from the command line and read its first compiler errors'], 40, { after: ['JDK_JVM'], skillKeys: ['JAVA_BASICS'] }),
    u('INTELLIJ', 'Working in IntelliJ IDEA', 'Projects, running and debugging, and the shortcuts that pay for themselves in a week.',
      ['Create, run and debug a Java project in IntelliJ with breakpoints'], 40, { after: ['FIRST_PROGRAM'], skillKeys: ['IDE_PROFICIENCY'] }),
    u('MAVEN', 'Maven: Projects, Dependencies and Builds', 'pom.xml, the standard layout, adding a library, and mvn package.',
      ['Create a Maven project, add a dependency, and build a runnable jar'], 45, { after: ['INTELLIJ'], skillKeys: ['IDE_PROFICIENCY'] }),
    u('INPUT_OUTPUT', 'Reading Input and Printing Output', 'Scanner, System.out.println and printf — the shape every coding round expects.',
      ['Read numbers and lines from standard input and print formatted output'], 35, { after: ['MAVEN'], skillKeys: ['JAVA_BASICS'] }),
    ...ending('Java Setup', 'INPUT_OUTPUT', { minutes: [35, 45, 30, 35] }),
  ] },

  /* ── Fundamentals ── */
  JT_JAVA_BASICS: { category: 'UNIVERSAL', units: [
    u('PRIMITIVES', 'Variables and Primitive Types', 'int, long, double, char, boolean, their sizes and limits, and overflow.',
      ['Choose the right primitive type and predict overflow and integer division'], 40, { skillKeys: ['JAVA_BASICS'] }),
    u('CASTING_WRAPPERS', 'Casting, Wrapper Classes and Autoboxing', 'Widening and narrowing, Integer and friends, and the == trap with boxed values.',
      ['Convert between types safely and explain autoboxing and the Integer cache'], 40, { after: ['PRIMITIVES'], skillKeys: ['JAVA_BASICS'] }),
    u('OPERATORS', 'Operators and Expressions', 'Arithmetic, increment, comparison, logical short-circuit and precedence.',
      ['Predict the value of expressions including ++, %, && and ||'], 35, { after: ['CASTING_WRAPPERS'], skillKeys: ['JAVA_BASICS'] }),
    u('CONDITIONS', 'if, else and switch', 'Branches, the classic switch and its fall-through, and switch expressions.',
      ['Write conditions and switch statements and expressions without fall-through bugs'], 40, { after: ['OPERATORS'], skillKeys: ['JAVA_CONTROL_FLOW'] }),
    u('LOOPS', 'Loops: for, while, do-while and for-each', 'Choosing a loop, break and continue, and nested loops.',
      ['Write and trace loops, including nested ones, and choose the right kind'], 45, { after: ['CONDITIONS'], skillKeys: ['JAVA_CONTROL_FLOW'] }),
    u('ARRAYS', 'Arrays and 2D Arrays', 'Fixed-size arrays, default values, iterating, Arrays.toString and sort, and grids.',
      ['Create, fill, search and print 1D and 2D arrays'], 45, { after: ['LOOPS'], skillKeys: ['JAVA_ARRAYS'] }),
    u('STRINGS', 'Strings and StringBuilder', 'Immutability, equals vs ==, the common String methods, and building strings in a loop.',
      ['Manipulate strings with the String API and build them efficiently with StringBuilder'], 45, { after: ['ARRAYS'], skillKeys: ['JAVA_BASICS'] }),
    u('METHODS', 'Methods, Parameters and Overloading', 'Defining methods, pass-by-value (even for objects), return types and overloading.',
      ['Write methods with parameters and returns and explain what Java passes'], 45, { after: ['STRINGS'], skillKeys: ['JAVA_METHODS'] }),
    ...ending('Java Fundamentals', 'METHODS'),
  ] },

  /* ── OOP ── */
  JT_JAVA_OOP: { category: 'UNIVERSAL', units: [
    u('CLASSES_OBJECTS', 'Classes and Objects', 'Fields, methods and instances — modelling a thing in code.',
      ['Write a class with fields and methods and create objects from it'], 40),
    u('CONSTRUCTORS', 'Constructors and this', 'Initialising an object, overloaded constructors, and constructor chaining.',
      ['Write constructors, chain them with this(), and explain default constructors'], 40, { after: ['CLASSES_OBJECTS'] }),
    u('ENCAPSULATION', 'Encapsulation and Access Modifiers', 'private fields, getters and setters, and keeping an object valid.',
      ['Hide state behind methods that keep an object valid, using the right access modifiers'], 40, { after: ['CONSTRUCTORS'] }),
    u('STATIC_FINAL', 'static and final', 'Class members vs instance members, constants, and immutable objects.',
      ['Use static and final correctly and design a simple immutable class'], 35, { after: ['ENCAPSULATION'] }),
    u('INHERITANCE', 'Inheritance and super', 'extends, what is inherited, super calls, and when inheritance is the wrong tool.',
      ['Extend a class, call super, and explain composition over inheritance'], 45, { after: ['STATIC_FINAL'] }),
    u('POLYMORPHISM', 'Polymorphism: Overloading vs Overriding', 'Compile-time and runtime polymorphism, @Override, and dynamic dispatch.',
      ['Explain and use overriding and overloading, and predict which method runs'], 45, { after: ['INHERITANCE'] }),
    u('ABSTRACTION', 'Abstract Classes and Interfaces', 'Contracts, default methods, and choosing between the two.',
      ['Design with interfaces and abstract classes and say when each fits'], 45, { after: ['POLYMORPHISM'] }),
    u('OBJECT_METHODS', 'equals, hashCode and toString', 'The Object methods every class inherits, and the contract between equals and hashCode.',
      ['Override equals, hashCode and toString correctly and explain why they go together'], 40, { after: ['ABSTRACTION'] }),
    ...ending('Java OOP', 'OBJECT_METHODS', { project: ['MINI_PROJECT', 'Mini Project — A Bank Account System', 'A console bank: accounts of different kinds, deposits, withdrawals and transfers, designed with encapsulation, inheritance and interfaces.'] }),
  ] },

  /* ── Exceptions and files ── */
  JT_JAVA_EXCEPTIONS: { category: 'UNIVERSAL', units: [
    u('HIERARCHY', 'Exceptions: Checked and Unchecked', 'Throwable, Exception, RuntimeException and Error, and what the compiler forces you to handle.',
      ['Tell checked from unchecked exceptions and read a stack trace'], 40),
    u('TRY_CATCH', 'try, catch, finally and throw', 'Catching the right exception, multi-catch, finally, and rethrowing.',
      ['Handle exceptions without swallowing them, and use finally correctly'], 40, { after: ['HIERARCHY'] }),
    u('RESOURCES_FILES', 'try-with-resources and File I/O', 'Closing what you open, and reading and writing files with Files and BufferedReader.',
      ['Read and write text files and always close resources with try-with-resources'], 45, { after: ['TRY_CATCH'] }),
    u('CUSTOM', 'Custom Exceptions and Error Design', 'Exceptions of your own, and when to throw rather than return a code.',
      ['Define a custom exception and decide when a method should throw'], 35, { after: ['RESOURCES_FILES'] }),
    ...ending('Java Exceptions', 'CUSTOM'),
  ] },

  /* ── Collections ── */
  JT_JAVA_COLLECTIONS: { category: 'UNIVERSAL', units: [
    u('FRAMEWORK', 'The Collections Framework', 'Collection, List, Set, Map and Queue — and why you program to the interface.',
      ['Map the collection interfaces to their implementations and declare variables by interface'], 35),
    u('LISTS', 'ArrayList and LinkedList', 'How each is built, what each operation costs, and which to choose.',
      ['Use ArrayList and LinkedList and justify the choice by cost'], 40, { after: ['FRAMEWORK'] }),
    u('SETS', 'HashSet, LinkedHashSet and TreeSet', 'Uniqueness, ordering, and what a set needs from its elements.',
      ['Choose a Set by ordering need and explain why equals and hashCode matter'], 40, { after: ['LISTS'] }),
    u('MAPS', 'HashMap and TreeMap, and How HashMap Works', 'Buckets, hashing, collisions, load factor, and sorted maps.',
      ['Use maps for counting and grouping and explain how a HashMap finds a key'], 50, { after: ['SETS'] }),
    u('QUEUES', 'Queue, Deque and PriorityQueue', 'FIFO, LIFO with ArrayDeque, and ordering by priority.',
      ['Use ArrayDeque as a stack and a queue, and PriorityQueue for ordering'], 40, { after: ['MAPS'] }),
    u('ITERATION_SORTING', 'Iterators, Comparable and Comparator', 'Iterating safely, ConcurrentModificationException, natural and custom ordering.',
      ['Sort objects with Comparable and Comparator and remove while iterating safely'], 45, { after: ['QUEUES'] }),
    u('GENERICS', 'Generics', 'Type parameters, generic methods, bounded types and wildcards.',
      ['Write a generic class and method and read bounded and wildcard types'], 45, { after: ['ITERATION_SORTING'] }),
    ...ending('Java Collections', 'GENERICS'),
  ] },

  /* ── Modern Java ── */
  JT_JAVA_MODERN: { category: 'UNIVERSAL', units: [
    u('LAMBDAS', 'Lambdas and Functional Interfaces', 'Function, Predicate, Consumer, Supplier, and writing behaviour as a value.',
      ['Write lambdas against the built-in functional interfaces'], 40),
    u('METHOD_REFS', 'Method References', 'Class::method, instance::method and Class::new, and when they read better.',
      ['Replace lambdas with method references where clearer'], 30, { after: ['LAMBDAS'] }),
    u('STREAMS', 'The Stream API', 'filter, map, sorted, distinct, limit and the terminal operations that run them.',
      ['Build stream pipelines that filter, transform and sort data'], 50, { after: ['METHOD_REFS'] }),
    u('COLLECTORS', 'Collectors: toList, groupingBy and joining', 'Collecting results, grouping and counting, and reduce.',
      ['Group, count and summarise data with collectors and reduce'], 45, { after: ['STREAMS'] }),
    u('OPTIONAL', 'Optional', 'Representing "maybe absent" without null, and the misuses to avoid.',
      ['Return and consume Optional correctly instead of null'], 35, { after: ['COLLECTORS'] }),
    u('JAVA17', 'Java 17: var, Records, Text Blocks and switch Expressions', 'The modern syntax you will read in every current codebase.',
      ['Read and write var, records, text blocks and switch expressions'], 40, { after: ['OPTIONAL'] }),
    ...ending('Modern Java', 'JAVA17', { project: ['MINI_PROJECT', 'Mini Project — A Library Management System', 'A console library system: books, members and loans with OOP, collections, exceptions and streams — search, borrow, return and reports.'] }),
  ] },

  /* ── Concurrency and the JVM ── */
  JT_JAVA_CONCURRENCY: { category: 'UNIVERSAL', units: [
    u('THREADS', 'Threads and Runnable', 'Starting work on another thread, join, sleep, and the thread lifecycle.',
      ['Start threads with Runnable and wait for them to finish'], 40),
    u('SYNCHRONIZATION', 'Race Conditions and synchronized', 'Shared state, lost updates, synchronized blocks, volatile and deadlock.',
      ['Find a race condition and fix it with synchronization, and explain a deadlock'], 45, { after: ['THREADS'] }),
    u('EXECUTORS', 'ExecutorService, Callable and Future', 'Thread pools, submitting tasks, getting results, and CompletableFuture basics.',
      ['Run tasks on a thread pool and collect their results'], 45, { after: ['SYNCHRONIZATION'] }),
    u('CONCURRENT_UTILS', 'Concurrent Collections and Atomics', 'ConcurrentHashMap, AtomicInteger, and why Collections.synchronizedList is not enough.',
      ['Choose thread-safe collections and atomic variables over manual locking'], 40, { after: ['EXECUTORS'] }),
    u('JVM_MEMORY', 'How the JVM Manages Memory', 'Stack and heap, object lifetime, garbage collection, and OutOfMemoryError vs StackOverflowError.',
      ['Explain stack vs heap and how garbage collection decides what to free'], 40, { after: ['CONCURRENT_UTILS'] }),
    ...ending('Java Concurrency', 'JVM_MEMORY'),
  ] },

  /* ── DSA in Java, linear ── */
  JT_JAVA_DSA_LINEAR: { category: 'UNIVERSAL', units: [
    u('COMPLEXITY', 'Big-O in Java Terms', 'Counting operations, and what ArrayList, LinkedList and HashMap each cost.',
      ['State the time and space cost of Java code and of the collection operations it uses'], 40, { skillKeys: ['DSA_COMPLEXITY'] }),
    u('ARRAY_PATTERNS', 'Array and String Patterns: Two Pointers and Sliding Window', 'The two patterns behind most array and string questions, in Java.',
      ['Solve array and string problems with two pointers and a sliding window in Java'], 50, { after: ['COMPLEXITY'], skillKeys: ['DSA_ARRAYS'] }),
    u('LINKED_LISTS', 'Linked Lists in Java', 'A Node class, insertion, deletion, reversal, and the fast-and-slow pointer.',
      ['Implement and manipulate a singly linked list in Java'], 50, { after: ['ARRAY_PATTERNS'], skillKeys: ['DSA_LINKED_LIST'] }),
    u('STACKS_QUEUES', 'Stacks and Queues with ArrayDeque', 'Balanced brackets, next greater element, and queue-based simulations.',
      ['Solve stack and queue problems in Java with ArrayDeque'], 45, { after: ['LINKED_LISTS'], skillKeys: ['DSA_STACK'] }),
    u('HASHING', 'Hashing Problems with HashMap and HashSet', 'Counting, two-sum, grouping anagrams, and the first non-repeating character.',
      ['Solve lookup and counting problems in Java with HashMap and HashSet'], 45, { after: ['STACKS_QUEUES'], skillKeys: ['DSA_HASHING'] }),
    u('RECURSION', 'Recursion and Backtracking in Java', 'Base cases, the call stack, and generating subsets and permutations.',
      ['Write recursive and backtracking solutions in Java and trace them'], 50, { after: ['HASHING'], skillKeys: ['DSA_RECURSION'] }),
    u('SORTING_SEARCHING', 'Sorting and Binary Search in Java', 'Arrays.sort with comparators, merge sort by hand, and binary search on sorted data.',
      ['Sort with comparators, implement merge sort, and write a correct binary search in Java'], 50, { after: ['RECURSION'], skillKeys: ['DSA_SORTING'] }),
    ...ending('DSA in Java: Linear Structures', 'SORTING_SEARCHING', { minutes: [45, 75, 40, 45] }),
  ] },

  /* ── DSA in Java, non-linear ── */
  JT_JAVA_DSA_NONLINEAR: { category: 'UNIVERSAL', units: [
    u('TREES', 'Binary Trees and Traversals in Java', 'A TreeNode, recursive and iterative traversals, height and level order.',
      ['Build a binary tree in Java and traverse it in every order'], 50, { skillKeys: ['DSA_TREES'] }),
    u('BST', 'Binary Search Trees in Java', 'Insert, search, delete and validate a BST, and TreeMap as a ready-made one.',
      ['Implement BST operations in Java and validate a tree'], 45, { after: ['TREES'], skillKeys: ['DSA_TREES'] }),
    u('HEAPS', 'Heaps and PriorityQueue Problems', 'Top-k, merging sorted lists, and running medians with PriorityQueue.',
      ['Solve top-k and merge problems in Java with PriorityQueue'], 45, { after: ['BST'], skillKeys: ['DSA_HEAPS'] }),
    u('GRAPHS', 'Graphs, BFS and DFS in Java', 'Adjacency lists, BFS for shortest steps, DFS for components and cycles.',
      ['Represent a graph in Java and solve problems with BFS and DFS'], 50, { after: ['HEAPS'], skillKeys: ['DSA_GRAPHS'] }),
    u('SHORTEST_PATH', 'Shortest Paths and Topological Sort', 'Dijkstra with a PriorityQueue, and ordering tasks with dependencies.',
      ['Implement Dijkstra and a topological sort in Java'], 50, { after: ['GRAPHS'], skillKeys: ['DSA_GRAPHS'] }),
    u('GREEDY', 'Greedy Algorithms in Java', 'Intervals, activity selection, and how to check a greedy choice is safe.',
      ['Solve interval and scheduling problems greedily in Java and justify the choice'], 40, { after: ['SHORTEST_PATH'], skillKeys: ['DSA_GREEDY'] }),
    u('DYNAMIC_PROGRAMMING', 'Dynamic Programming in Java', 'Memoisation and tabulation: climbing stairs, coin change, longest common subsequence.',
      ['Solve 1D and 2D dynamic-programming problems in Java, top-down and bottom-up'], 55, { after: ['GREEDY'], skillKeys: ['DSA_DP'] }),
    ...ending('DSA in Java: Trees, Graphs and DP', 'DYNAMIC_PROGRAMMING', { minutes: [45, 75, 40, 45] }),
  ] },
};
