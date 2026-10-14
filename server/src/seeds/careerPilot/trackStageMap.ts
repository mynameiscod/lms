import { FoundationModuleSeed, FoundationTopicSeed } from './foundationSkillMap';

/**
 * Career-track content — the pool new track lessons are written into (stage key `track`).
 *
 * ── WHY ONE POOL AND NOT ONE CURRICULUM PER TRACK ─────────────────────────────────────────
 *
 * A career track (see data/careerTrackPolicy.ts) is an ordered list of skill packs, and a pack
 * names topics from ANY year's content. So a lesson is written once, wherever it first belongs,
 * and every track that needs it reuses it: React is written here for Java Full Stack + AI and
 * Python Full Stack reuses it as it stands. Years 1–4 keep their own topics (HTML, CSS, SQL, Git);
 * this pool holds only what no year teaches — a framework, a language a year does not use, AI.
 *
 * The modules below are therefore grouped by SUBJECT, not by track: a track does not own a
 * module, its packs pick topics from them.
 *
 * Nothing here is published by importing it, and nothing here reaches a student until a pack
 * names its topics and a track that uses the pack goes live.
 */

export const TRACK_STAGE_KEY = 'track';
export const TRACK_TITLE = 'CareerPilot Career-Track Content';

const t = (
  topicCode: string, title: string, skillKeys: string[],
  learningOutcomes: string[], extra: Partial<FoundationTopicSeed> = {},
): FoundationTopicSeed => ({
  topicCode, title, skillKeys,
  category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'STANDARD',
  learningOutcomes, ...extra,
});

export const TRACK_MODULES: FoundationModuleSeed[] = [
  /* ══════════════ WEB — what Year 1 does not already teach ══════════════ */
  {
    moduleCode: 'JT_WEB',
    moduleName: 'Web Frameworks for the Full Stack',
    displayOrder: 10,
    blurb: 'Year 1 teaches HTML, CSS and the DOM; this adds the CSS framework every full-stack job expects.',
    topics: [
      t('JT_BOOTSTRAP', 'Bootstrap 5', ['BOOTSTRAP', 'RESPONSIVE_DESIGN'],
        ['Build a responsive page with the Bootstrap grid, components and utilities, and know where it stops helping.']),
    ],
  },

  /* ══════════════ JAVASCRIPT — the language, then the modern language ══════════════ */
  {
    moduleCode: 'JT_JS',
    moduleName: 'JavaScript, the Language',
    displayOrder: 20,
    blurb: 'Year 1 uses JavaScript to change a page; a full-stack developer writes it as a language.',
    topics: [
      t('JT_JS_CORE', 'JavaScript Fundamentals', ['JS_BASICS', 'JS_FUNCTIONS', 'JS_ARRAYS_OBJECTS'],
        ['Write JavaScript with variables, conditions, loops, functions, arrays and objects, and predict what it prints.']),
      t('JT_JS_ES6', 'Modern JavaScript (ES6+)', ['JS_ES6'],
        ['Read and write the modern JavaScript every framework is written in: arrow functions, destructuring, spread, modules and classes.']),
    ],
  },

  /* ══════════════ REACT ══════════════ */
  {
    moduleCode: 'JT_REACT',
    moduleName: 'React',
    displayOrder: 30,
    blurb: 'Building interfaces out of components, from the first JSX to a deployed multi-page app.',
    topics: [
      t('JT_REACT_BASICS', 'React Fundamentals', ['REACT_COMPONENTS'],
        ['Build a screen from components with props, state, events, forms and lists.']),
      t('JT_REACT_HOOKS', 'React Hooks', ['REACT_HOOKS'],
        ['Use effects, context, refs and custom hooks, and keep to the rules that make them correct.']),
      t('JT_REACT_ROUTING', 'Routing and Talking to an API', ['REACT_ROUTING', 'JS_ASYNC'],
        ['Build a multi-page React app that calls an API and shows loading, error and empty states.']),
      t('JT_REACT_STATE', 'State Management with Redux Toolkit', ['STATE_MANAGEMENT', 'REACT_HOOKS'],
        ['Decide when state needs a store, and build one with Redux Toolkit slices and async thunks.']),
      t('JT_REACT_BUILD', 'Building and Shipping a React App', ['REACT_COMPONENTS', 'BOOTSTRAP'],
        ['Create, style, configure and deploy a React app with Vite, and ship the React project.']),
    ],
  },

  /* ══════════════ JAVA — the language, from the first program to the JVM ══════════════ */
  {
    moduleCode: 'JT_JAVA',
    moduleName: 'Core Java',
    displayOrder: 40,
    blurb: 'Java from the first program: the language, OOP, exceptions, collections, modern Java and concurrency.',
    topics: [
      t('JT_JAVA_START', 'Getting Started with Java', ['JAVA_BASICS', 'IDE_PROFICIENCY'],
        ['Install a JDK, run a program from IntelliJ and from the command line, and manage a Maven project.']),
      t('JT_JAVA_BASICS', 'Java Fundamentals', ['JAVA_BASICS', 'JAVA_CONTROL_FLOW', 'JAVA_ARRAYS', 'JAVA_METHODS'],
        ['Write Java with types, operators, conditions, loops, arrays, strings and methods, and predict what it prints.']),
      t('JT_JAVA_OOP', 'Object-Oriented Programming in Java', ['JAVA_OOP'],
        ['Design classes with encapsulation, inheritance, polymorphism, abstract classes and interfaces, and say why.']),
      t('JT_JAVA_EXCEPTIONS', 'Exceptions and File I/O', ['JAVA_EXCEPTIONS'],
        ['Handle checked and unchecked exceptions, close resources safely, and read and write files.']),
      t('JT_JAVA_COLLECTIONS', 'Collections and Generics', ['JAVA_COLLECTIONS'],
        ['Choose the right List, Set, Map or Queue, sort with Comparable and Comparator, and write generic code.']),
      t('JT_JAVA_MODERN', 'Modern Java: Lambdas, Streams and Java 17', ['JAVA_STREAMS'],
        ['Write lambdas, method references and stream pipelines, use Optional, and read Java 17 code.']),
      t('JT_JAVA_CONCURRENCY', 'Concurrency and the JVM', ['JAVA_CONCURRENCY'],
        ['Run work on threads and executors safely, and explain how the JVM manages memory.']),
    ],
  },

  /* ══════════════ DSA IN JAVA — the years teach DSA in Python; a Java developer needs it in Java ══════════════ */
  {
    moduleCode: 'JT_JAVA_DSA',
    moduleName: 'Data Structures and Algorithms in Java',
    displayOrder: 50,
    blurb: 'The data structures and algorithms interviews ask, implemented and solved in Java.',
    topics: [
      t('JT_JAVA_DSA_LINEAR', 'DSA in Java: Arrays to Sorting',
        ['DSA_COMPLEXITY', 'DSA_ARRAYS', 'DSA_LINKED_LIST', 'DSA_STACK', 'DSA_HASHING', 'DSA_RECURSION', 'DSA_SORTING'],
        ['Solve array, string, linked-list, stack, hashing, recursion and sorting problems in Java and state their cost.']),
      t('JT_JAVA_DSA_NONLINEAR', 'DSA in Java: Trees to Dynamic Programming',
        ['DSA_TREES', 'DSA_HEAPS', 'DSA_GRAPHS', 'DSA_GREEDY', 'DSA_DP'],
        ['Solve tree, heap, graph, greedy and dynamic-programming problems in Java.']),
    ],
  },

  /* ══════════════ DATA AND SPRING — MySQL, JDBC, JPA and the Spring container ══════════════ */
  {
    moduleCode: 'JT_DATA_SPRING',
    moduleName: 'MySQL, Persistence and Spring',
    displayOrder: 60,
    blurb: 'The years teach SQL; this adds MySQL itself, Java talking to it through JDBC and JPA, and the Spring container.',
    topics: [
      t('JT_MYSQL', 'MySQL in Practice', ['DB_FUNDAMENTALS', 'SQL_BASICS'],
        ['Install and work in MySQL 8: types, constraints, InnoDB, scripts, dumps, views and procedures.']),
      t('JT_JDBC', 'JDBC: Java Talking to MySQL', ['JDBC'],
        ['Connect Java to MySQL with JDBC, query safely with PreparedStatement, manage transactions and pool connections.']),
      t('JT_JPA', 'Hibernate and JPA', ['JPA_HIBERNATE'],
        ['Map classes to tables with JPA, model relationships, query with JPQL and avoid the N+1 problem.']),
      t('JT_SPRING_CORE', 'Spring Core', ['SPRING_CORE'],
        ['Explain and use inversion of control, dependency injection, bean scopes, configuration and AOP proxies.']),
    ],
  },
];

/** Every skill the track content names — the seeder refuses to import if one is not in the taxonomy. */
export const trackReferencedSkillKeys = (): string[] =>
  [...new Set(TRACK_MODULES.flatMap(m => m.topics.flatMap(tp => tp.skillKeys || [])))];
