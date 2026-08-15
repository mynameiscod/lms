import { SkillNodeType, SkillDifficulty } from '../models/CareerSkill';

/**
 * The shipped V1 Software Engineering taxonomy.
 *
 * Static data, in its own file, because it is content rather than logic — it will be read
 * and argued about by people deciding what CareerPilot measures, and that is easier when
 * it is not interleaved with schema definitions. No AI generates it: a taxonomy that
 * changed shape between runs could not be seeded idempotently or reasoned about at all.
 *
 * SIZE IS A DELIBERATE CHOICE. Roughly seventy nodes, not five hundred. Every SKILL here
 * is meant to be something you could sensibly say "this student is 62% there" about.
 * "Inheritance" on its own is not — it is a paragraph inside Java OOP, and splitting it
 * out would produce a measurement too thin to act on and a tree too deep to navigate.
 *
 * TWO DELIBERATE OMISSIONS:
 *
 * Aptitude, quantitative and verbal ability are absent. They are already scoring
 * dimensions of the CareerPilot assessment (PASSPORT_CATEGORIES), and adding skill nodes
 * with the same names would create two owners for one concept.
 *
 * Frameworks — Spring, React, Django — are absent. CareerPilot's first job is measuring
 * transferable capability, and a student who knows Java OOP and REST can pick up Spring.
 * Admins can add them, which is exactly what makes this configuration rather than a
 * hardcoded list.
 */

export interface SeedSkill {
  key: string;
  name: string;
  parentKey?: string | null;
  nodeType?: SkillNodeType;
  difficulty?: SkillDifficulty;
  description?: string;
  aliases?: string[];
  prerequisiteKeys?: string[];
  assessable?: boolean;
  learnable?: boolean;
  displayOrder?: number;
}

const GROUP = (key: string, name: string, order: number, description = ''): SeedSkill => ({
  key, name, nodeType: 'GROUP', parentKey: null, displayOrder: order, description,
  // A group is a shelf, not a capability: measuring "Programming" as one number would say
  // nothing useful, and setting work against it would say nothing specific.
  assessable: false, learnable: false,
});

const SUB = (key: string, name: string, parentKey: string, order: number, description = ''): SeedSkill => ({
  key, name, nodeType: 'GROUP', parentKey, displayOrder: order, description,
  assessable: false, learnable: false,
});

export const CAREER_SKILL_TAXONOMY: SeedSkill[] = [
  // ── Programming ───────────────────────────────────────────────────────────────
  GROUP('PROGRAMMING', 'Programming', 10, 'Writing correct, readable code in a general-purpose language.'),
  {
    key: 'PROGRAMMING_FUNDAMENTALS', name: 'Programming Fundamentals', parentKey: 'PROGRAMMING',
    difficulty: 'FOUNDATION', displayOrder: 10,
    description: 'Variables, types, expressions and the shape of a program — independent of any one language.',
    aliases: ['Coding Basics', 'Programming Basics'],
  },

  SUB('JAVA', 'Java', 'PROGRAMMING', 20, 'The Java language and its standard library.'),
  { key: 'JAVA_BASICS', name: 'Java Basics', parentKey: 'JAVA', difficulty: 'FOUNDATION', displayOrder: 10,
    description: 'Syntax, types, variables and input/output in Java.', aliases: ['java'],
    prerequisiteKeys: ['PROGRAMMING_FUNDAMENTALS'] },
  { key: 'JAVA_CONTROL_FLOW', name: 'Java Control Flow', parentKey: 'JAVA', difficulty: 'FOUNDATION', displayOrder: 20,
    description: 'Conditionals, loops and branching.', prerequisiteKeys: ['JAVA_BASICS'] },
  { key: 'JAVA_METHODS', name: 'Java Methods', parentKey: 'JAVA', difficulty: 'FOUNDATION', displayOrder: 30,
    description: 'Defining, calling and overloading methods; parameters and return values.',
    prerequisiteKeys: ['JAVA_CONTROL_FLOW'] },
  { key: 'JAVA_ARRAYS', name: 'Java Arrays', parentKey: 'JAVA', difficulty: 'FOUNDATION', displayOrder: 40,
    description: 'Single and multi-dimensional arrays, iteration and common operations.',
    prerequisiteKeys: ['JAVA_CONTROL_FLOW'] },
  { key: 'JAVA_OOP', name: 'Java OOP', parentKey: 'JAVA', difficulty: 'INTERMEDIATE', displayOrder: 50,
    description: 'Classes, objects, inheritance, polymorphism and interfaces as expressed in Java.',
    aliases: ['Object Oriented Java', 'Java Classes'],
    // Depends on a node in a different branch — the language-agnostic concepts under CS
    // Fundamentals. Exactly the case the tree alone could not express.
    prerequisiteKeys: ['JAVA_METHODS', 'OOP_CONCEPTS'] },
  { key: 'JAVA_COLLECTIONS', name: 'Java Collections', parentKey: 'JAVA', difficulty: 'INTERMEDIATE', displayOrder: 60,
    description: 'List, Set, Map and the collections framework.',
    prerequisiteKeys: ['JAVA_OOP', 'JAVA_ARRAYS'] },
  { key: 'JAVA_EXCEPTIONS', name: 'Java Exception Handling', parentKey: 'JAVA', difficulty: 'INTERMEDIATE', displayOrder: 70,
    description: 'Checked and unchecked exceptions, try/catch/finally, and failing safely.',
    prerequisiteKeys: ['JAVA_OOP'] },
  { key: 'JAVA_CONCURRENCY', name: 'Java Concurrency', parentKey: 'JAVA', difficulty: 'ADVANCED', displayOrder: 80,
    description: 'Threads, synchronisation and the concurrency utilities.',
    prerequisiteKeys: ['JAVA_OOP', 'JAVA_COLLECTIONS'] },

  SUB('PYTHON', 'Python', 'PROGRAMMING', 30, 'The Python language and its standard library.'),
  { key: 'PYTHON_BASICS', name: 'Python Basics', parentKey: 'PYTHON', difficulty: 'FOUNDATION', displayOrder: 10,
    description: 'Syntax, types, variables and input/output in Python.', aliases: ['python'],
    prerequisiteKeys: ['PROGRAMMING_FUNDAMENTALS'] },
  { key: 'PYTHON_CONTROL_FLOW', name: 'Python Control Flow', parentKey: 'PYTHON', difficulty: 'FOUNDATION', displayOrder: 20,
    description: 'Conditionals, loops and comprehensions.', prerequisiteKeys: ['PYTHON_BASICS'] },
  { key: 'PYTHON_FUNCTIONS', name: 'Python Functions', parentKey: 'PYTHON', difficulty: 'FOUNDATION', displayOrder: 30,
    description: 'Defining functions, arguments, scope and returning values.',
    prerequisiteKeys: ['PYTHON_CONTROL_FLOW'] },
  { key: 'PYTHON_COLLECTIONS', name: 'Python Collections', parentKey: 'PYTHON', difficulty: 'INTERMEDIATE', displayOrder: 40,
    description: 'Lists, tuples, sets and dictionaries.', prerequisiteKeys: ['PYTHON_FUNCTIONS'] },
  { key: 'PYTHON_OOP', name: 'Python OOP', parentKey: 'PYTHON', difficulty: 'INTERMEDIATE', displayOrder: 50,
    description: 'Classes, objects and inheritance as expressed in Python.',
    prerequisiteKeys: ['PYTHON_FUNCTIONS', 'OOP_CONCEPTS'] },

  SUB('JAVASCRIPT', 'JavaScript', 'PROGRAMMING', 40, 'The JavaScript language, in the browser and beyond.'),
  { key: 'JS_BASICS', name: 'JavaScript Basics', parentKey: 'JAVASCRIPT', difficulty: 'FOUNDATION', displayOrder: 10,
    description: 'Syntax, types, variables and operators.', aliases: ['javascript'],
    prerequisiteKeys: ['PROGRAMMING_FUNDAMENTALS'] },
  { key: 'JS_FUNCTIONS', name: 'JavaScript Functions', parentKey: 'JAVASCRIPT', difficulty: 'FOUNDATION', displayOrder: 20,
    description: 'Functions, scope, closures and callbacks.', prerequisiteKeys: ['JS_BASICS'] },
  { key: 'JS_ARRAYS_OBJECTS', name: 'JavaScript Arrays & Objects', parentKey: 'JAVASCRIPT', difficulty: 'INTERMEDIATE', displayOrder: 30,
    description: 'Working with arrays, objects, destructuring and the common array methods.',
    prerequisiteKeys: ['JS_FUNCTIONS'] },
  { key: 'JS_ASYNC', name: 'JavaScript Async', parentKey: 'JAVASCRIPT', difficulty: 'INTERMEDIATE', displayOrder: 40,
    description: 'Promises, async/await and the event loop.', prerequisiteKeys: ['JS_FUNCTIONS'] },
  { key: 'JS_DOM', name: 'JavaScript DOM', parentKey: 'JAVASCRIPT', difficulty: 'INTERMEDIATE', displayOrder: 50,
    description: 'Selecting, changing and reacting to elements on a page.',
    prerequisiteKeys: ['JS_ARRAYS_OBJECTS', 'HTML'] },

  // ── Data Structures & Algorithms ──────────────────────────────────────────────
  GROUP('DSA', 'Data Structures & Algorithms', 20, 'Choosing the right structure and algorithm, and knowing what it costs.'),
  { key: 'DSA_COMPLEXITY', name: 'Complexity Analysis', parentKey: 'DSA', difficulty: 'FOUNDATION', displayOrder: 10,
    description: 'Big-O, time and space cost, and comparing approaches.', aliases: ['Big O', 'Time Complexity'],
    prerequisiteKeys: ['PROGRAMMING_FUNDAMENTALS'] },
  { key: 'DSA_ARRAYS', name: 'Arrays', parentKey: 'DSA', difficulty: 'FOUNDATION', displayOrder: 20,
    description: 'Traversal, two pointers, prefix sums and sliding windows.', aliases: ['dsa'],
    prerequisiteKeys: ['DSA_COMPLEXITY'] },
  { key: 'DSA_STRINGS', name: 'Strings', parentKey: 'DSA', difficulty: 'FOUNDATION', displayOrder: 30,
    description: 'String manipulation, matching and common interview patterns.',
    prerequisiteKeys: ['DSA_ARRAYS'] },
  { key: 'DSA_SEARCHING', name: 'Searching', parentKey: 'DSA', difficulty: 'FOUNDATION', displayOrder: 40,
    description: 'Linear and binary search, and where binary search applies.',
    prerequisiteKeys: ['DSA_ARRAYS'] },
  { key: 'DSA_SORTING', name: 'Sorting', parentKey: 'DSA', difficulty: 'INTERMEDIATE', displayOrder: 50,
    description: 'Common sorting algorithms, their costs and when each is appropriate.',
    prerequisiteKeys: ['DSA_ARRAYS'] },
  { key: 'DSA_RECURSION', name: 'Recursion', parentKey: 'DSA', difficulty: 'INTERMEDIATE', displayOrder: 60,
    description: 'Recursive thinking, base cases and backtracking.',
    prerequisiteKeys: ['DSA_ARRAYS'] },
  { key: 'DSA_LINKED_LIST', name: 'Linked Lists', parentKey: 'DSA', difficulty: 'INTERMEDIATE', displayOrder: 70,
    description: 'Singly and doubly linked lists, and pointer manipulation.',
    prerequisiteKeys: ['DSA_ARRAYS'] },
  { key: 'DSA_STACK', name: 'Stack', parentKey: 'DSA', difficulty: 'INTERMEDIATE', displayOrder: 80,
    description: 'LIFO behaviour and the problems it solves.', prerequisiteKeys: ['DSA_ARRAYS'] },
  { key: 'DSA_QUEUE', name: 'Queue', parentKey: 'DSA', difficulty: 'INTERMEDIATE', displayOrder: 90,
    description: 'FIFO behaviour, deques and priority queues.', prerequisiteKeys: ['DSA_STACK'] },
  { key: 'DSA_HASHING', name: 'Hashing', parentKey: 'DSA', difficulty: 'INTERMEDIATE', displayOrder: 100,
    description: 'Hash maps and sets, and trading space for time.', prerequisiteKeys: ['DSA_ARRAYS'] },
  { key: 'DSA_TREES', name: 'Trees', parentKey: 'DSA', difficulty: 'ADVANCED', displayOrder: 110,
    description: 'Binary trees, BSTs, traversals and tree recursion.',
    prerequisiteKeys: ['DSA_RECURSION', 'DSA_LINKED_LIST'] },
  { key: 'DSA_GRAPHS', name: 'Graphs', parentKey: 'DSA', difficulty: 'ADVANCED', displayOrder: 120,
    description: 'Representations, BFS, DFS and shortest paths.',
    prerequisiteKeys: ['DSA_TREES', 'DSA_QUEUE'] },
  { key: 'DSA_GREEDY', name: 'Greedy Algorithms', parentKey: 'DSA', difficulty: 'ADVANCED', displayOrder: 130,
    description: 'Greedy choice, and recognising when it is safe.', prerequisiteKeys: ['DSA_SORTING'] },
  { key: 'DSA_DP', name: 'Dynamic Programming', parentKey: 'DSA', difficulty: 'ADVANCED', displayOrder: 140,
    description: 'Overlapping subproblems, memoisation and tabulation.',
    aliases: ['DP'], prerequisiteKeys: ['DSA_RECURSION'] },

  // ── Databases ─────────────────────────────────────────────────────────────────
  GROUP('DATABASES', 'Databases', 30, 'Storing, querying and structuring data.'),
  { key: 'DB_FUNDAMENTALS', name: 'Database Fundamentals', parentKey: 'DATABASES', difficulty: 'FOUNDATION', displayOrder: 10,
    description: 'What a database is, relational concepts, tables, keys and relationships.' },
  { key: 'SQL_BASICS', name: 'SQL Basics', parentKey: 'DATABASES', difficulty: 'FOUNDATION', displayOrder: 20,
    description: 'SELECT, INSERT, UPDATE, DELETE and reading a schema.', aliases: ['sql'],
    prerequisiteKeys: ['DB_FUNDAMENTALS'] },
  { key: 'SQL_FILTERING', name: 'SQL Filtering & Aggregation', parentKey: 'DATABASES', difficulty: 'INTERMEDIATE', displayOrder: 30,
    description: 'WHERE, GROUP BY, HAVING and the aggregate functions.',
    prerequisiteKeys: ['SQL_BASICS'] },
  { key: 'SQL_JOINS', name: 'SQL Joins', parentKey: 'DATABASES', difficulty: 'INTERMEDIATE', displayOrder: 40,
    description: 'Inner, outer and self joins, and combining data across tables.',
    prerequisiteKeys: ['SQL_FILTERING'] },
  { key: 'DB_DESIGN', name: 'Database Design', parentKey: 'DATABASES', difficulty: 'INTERMEDIATE', displayOrder: 50,
    description: 'Modelling entities and relationships into a workable schema.',
    prerequisiteKeys: ['DB_FUNDAMENTALS'] },
  { key: 'DB_NORMALIZATION', name: 'Normalization', parentKey: 'DATABASES', difficulty: 'INTERMEDIATE', displayOrder: 60,
    description: 'Normal forms, redundancy and the trade-offs of denormalising.',
    prerequisiteKeys: ['DB_DESIGN'] },
  { key: 'DB_INDEXING', name: 'Indexing', parentKey: 'DATABASES', difficulty: 'ADVANCED', displayOrder: 70,
    description: 'How indexes work, when they help and what they cost.',
    prerequisiteKeys: ['SQL_JOINS'] },
  { key: 'DB_TRANSACTIONS', name: 'Transactions', parentKey: 'DATABASES', difficulty: 'ADVANCED', displayOrder: 80,
    description: 'ACID properties, isolation levels and concurrent access.',
    prerequisiteKeys: ['DB_FUNDAMENTALS'] },

  // ── Computer Science Fundamentals ─────────────────────────────────────────────
  GROUP('CS_FUNDAMENTALS', 'Computer Science Fundamentals', 40, 'The concepts interviews probe and every language sits on top of.'),
  { key: 'OOP_CONCEPTS', name: 'OOP Concepts', parentKey: 'CS_FUNDAMENTALS', difficulty: 'FOUNDATION', displayOrder: 10,
    // Deliberately distinct from JAVA_OOP: this is understanding encapsulation and
    // polymorphism as ideas; that is expressing them in one language's syntax. A student
    // can hold either without the other, and conflating them would hide which is missing.
    description: 'Encapsulation, abstraction, inheritance and polymorphism as language-independent ideas.',
    aliases: ['Object Oriented Programming'] },
  { key: 'DBMS_CONCEPTS', name: 'DBMS Concepts', parentKey: 'CS_FUNDAMENTALS', difficulty: 'INTERMEDIATE', displayOrder: 20,
    description: 'How a database engine works: storage, query processing and concurrency.',
    prerequisiteKeys: ['DB_FUNDAMENTALS'] },
  { key: 'OPERATING_SYSTEMS', name: 'Operating Systems', parentKey: 'CS_FUNDAMENTALS', difficulty: 'INTERMEDIATE', displayOrder: 30,
    description: 'Processes, threads, memory management and scheduling.', aliases: ['OS'] },
  { key: 'COMPUTER_NETWORKS', name: 'Computer Networks', parentKey: 'CS_FUNDAMENTALS', difficulty: 'INTERMEDIATE', displayOrder: 40,
    description: 'The network stack, TCP/IP, DNS and how a request reaches a server.',
    aliases: ['Networking'] },
  { key: 'COMPUTER_ARCHITECTURE', name: 'Computer Architecture Basics', parentKey: 'CS_FUNDAMENTALS', difficulty: 'INTERMEDIATE', displayOrder: 50,
    description: 'Memory hierarchy, CPU basics and what makes code fast or slow.' },

  // ── Web Fundamentals ──────────────────────────────────────────────────────────
  GROUP('WEB_FUNDAMENTALS', 'Web Fundamentals', 50, 'How the web works, below any framework.'),
  { key: 'HTML', name: 'HTML', parentKey: 'WEB_FUNDAMENTALS', difficulty: 'FOUNDATION', displayOrder: 10,
    description: 'Document structure, semantic elements, forms and accessibility basics.',
    aliases: ['html_css'] },
  { key: 'CSS', name: 'CSS', parentKey: 'WEB_FUNDAMENTALS', difficulty: 'FOUNDATION', displayOrder: 20,
    description: 'Selectors, the box model, flexbox, grid and responsive layout.',
    prerequisiteKeys: ['HTML'] },
  { key: 'HTTP', name: 'HTTP', parentKey: 'WEB_FUNDAMENTALS', difficulty: 'FOUNDATION', displayOrder: 30,
    description: 'Methods, status codes, headers and the request/response cycle.' },
  { key: 'REST_APIS', name: 'REST APIs', parentKey: 'WEB_FUNDAMENTALS', difficulty: 'INTERMEDIATE', displayOrder: 40,
    description: 'Resources, verbs, status codes and designing a usable API.',
    aliases: ['REST'], prerequisiteKeys: ['HTTP'] },
  { key: 'BROWSER_FUNDAMENTALS', name: 'Browser Fundamentals', parentKey: 'WEB_FUNDAMENTALS', difficulty: 'INTERMEDIATE', displayOrder: 50,
    description: 'Rendering, developer tools, storage and the same-origin policy.',
    prerequisiteKeys: ['HTML'] },

  // ── Software Engineering Practices ────────────────────────────────────────────
  GROUP('SE_PRACTICES', 'Software Engineering Practices', 60, 'How working engineers build and keep software running.'),
  { key: 'GIT_FUNDAMENTALS', name: 'Git Fundamentals', parentKey: 'SE_PRACTICES', difficulty: 'FOUNDATION', displayOrder: 10,
    description: 'Repositories, commits, history and remotes.', aliases: ['Version Control'] },
  { key: 'GIT_BRANCHING', name: 'Git Branching', parentKey: 'SE_PRACTICES', difficulty: 'INTERMEDIATE', displayOrder: 20,
    description: 'Branches, merges, conflicts and pull requests.',
    prerequisiteKeys: ['GIT_FUNDAMENTALS'] },
  { key: 'DEBUGGING', name: 'Debugging', parentKey: 'SE_PRACTICES', difficulty: 'FOUNDATION', displayOrder: 30,
    description: 'Reading errors, isolating a fault and forming a hypothesis.',
    prerequisiteKeys: ['PROGRAMMING_FUNDAMENTALS'] },
  { key: 'TESTING_FUNDAMENTALS', name: 'Testing Fundamentals', parentKey: 'SE_PRACTICES', difficulty: 'INTERMEDIATE', displayOrder: 40,
    description: 'Unit tests, what is worth testing and reading a failure.',
    prerequisiteKeys: ['PROGRAMMING_FUNDAMENTALS'] },
  { key: 'CLEAN_CODE', name: 'Clean Code', parentKey: 'SE_PRACTICES', difficulty: 'INTERMEDIATE', displayOrder: 50,
    description: 'Naming, structure and writing code another person can change.',
    prerequisiteKeys: ['PROGRAMMING_FUNDAMENTALS'] },
  { key: 'API_FUNDAMENTALS', name: 'API Fundamentals', parentKey: 'SE_PRACTICES', difficulty: 'INTERMEDIATE', displayOrder: 60,
    description: 'Consuming and designing APIs, authentication and error handling.',
    prerequisiteKeys: ['REST_APIS'] },
  { key: 'SYSTEM_DESIGN_BASICS', name: 'Basic System Design', parentKey: 'SE_PRACTICES', difficulty: 'ADVANCED', displayOrder: 70,
    description: 'Splitting a system into parts, and the trade-offs behind the split.',
    prerequisiteKeys: ['API_FUNDAMENTALS', 'DB_DESIGN'] },

  // ── Professional Skills ───────────────────────────────────────────────────────
  GROUP('PROFESSIONAL_SKILLS', 'Professional Skills', 70, 'What gets an engineer understood, hired and trusted.'),
  { key: 'COMMUNICATION', name: 'Communication', parentKey: 'PROFESSIONAL_SKILLS', difficulty: 'FOUNDATION', displayOrder: 10,
    description: 'Speaking and writing clearly to a non-specialist.' },
  { key: 'TECHNICAL_COMMUNICATION', name: 'Technical Communication', parentKey: 'PROFESSIONAL_SKILLS', difficulty: 'INTERMEDIATE', displayOrder: 20,
    description: 'Documenting work, writing a good issue and explaining a design.',
    prerequisiteKeys: ['COMMUNICATION'] },
  { key: 'PROBLEM_SOLVING', name: 'Problem Solving', parentKey: 'PROFESSIONAL_SKILLS', difficulty: 'FOUNDATION', displayOrder: 30,
    description: 'Breaking an unfamiliar problem down and working towards a solution.' },
  { key: 'TECHNICAL_EXPLANATION', name: 'Technical Explanation', parentKey: 'PROFESSIONAL_SKILLS', difficulty: 'INTERMEDIATE', displayOrder: 40,
    description: 'Walking through your own code and reasoning aloud in an interview.',
    prerequisiteKeys: ['TECHNICAL_COMMUNICATION', 'PROBLEM_SOLVING'] },
];
