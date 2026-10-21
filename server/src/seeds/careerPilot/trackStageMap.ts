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

  /* ══════════════ C# — the language, from the first program to async (.NET Full Stack + AI, batch N1) ══════════════ */
  {
    moduleCode: 'JT_CSHARP',
    moduleName: 'Core C#',
    displayOrder: 140,
    blurb: 'C# from the first program: the language, OOP, exceptions, collections, LINQ and modern C#, and async.',
    topics: [
      t('JT_CS_START', 'Getting Started with C# and .NET', ['CSHARP_BASICS', 'IDE_PROFICIENCY'],
        ['Install the .NET SDK, run a program from the IDE and the command line, and manage projects and NuGet packages.']),
      t('JT_CS_BASICS', 'C# Fundamentals', ['CSHARP_BASICS'],
        ['Write C# with types, nullable values, operators, conditions, loops, arrays, strings and methods, and predict what it prints.']),
      t('JT_CS_OOP', 'Object-Oriented Programming in C#', ['CSHARP_OOP'],
        ['Design classes with properties, inheritance, polymorphism, abstract classes, interfaces, structs and records, and say why.']),
      t('JT_CS_EXCEPTIONS', 'Exceptions and File I/O in C#', ['CSHARP_EXCEPTIONS'],
        ['Handle exceptions without swallowing them, release resources with using, and read and write files.']),
      t('JT_CS_COLLECTIONS', 'Collections and Generics in C#', ['CSHARP_COLLECTIONS'],
        ['Choose the right List, Dictionary, set, stack or queue, sort with comparers, and write generic code.']),
      t('JT_CS_LINQ', 'Delegates, LINQ and Modern C#', ['CSHARP_LINQ'],
        ['Write delegates and lambdas, query data with LINQ, predict when a query runs, and read modern C#.']),
      t('JT_CS_ASYNC', 'Async C# and the .NET Runtime', ['CSHARP_ASYNC'],
        ['Write correct async code, run work concurrently and safely, and explain how .NET manages memory.']),
    ],
  },

  /* ══════════════ DSA IN C# — the years teach DSA in Python; a .NET developer needs it in C# ══════════════ */
  {
    moduleCode: 'JT_CSHARP_DSA',
    moduleName: 'Data Structures and Algorithms in C#',
    displayOrder: 150,
    blurb: 'The data structures and algorithms interviews ask, implemented and solved in C#.',
    topics: [
      t('JT_CS_DSA_LINEAR', 'DSA in C#: Arrays to Sorting',
        ['DSA_COMPLEXITY', 'DSA_ARRAYS', 'DSA_LINKED_LIST', 'DSA_STACK', 'DSA_HASHING', 'DSA_RECURSION', 'DSA_SORTING'],
        ['Solve array, string, linked-list, stack, hashing, recursion and sorting problems in C# and state their cost.']),
      t('JT_CS_DSA_NONLINEAR', 'DSA in C#: Trees to Dynamic Programming',
        ['DSA_TREES', 'DSA_HEAPS', 'DSA_GRAPHS', 'DSA_GREEDY', 'DSA_DP'],
        ['Solve tree, heap, graph, greedy and dynamic-programming problems in C#.']),
    ],
  },

  /* ══════════════ .NET DATA — SQL Server, ADO.NET, EF Core and the container (batch N2) ══════════════ */
  {
    moduleCode: 'JT_DOTNET_DATA',
    moduleName: 'SQL Server, ADO.NET and EF Core',
    displayOrder: 160,
    blurb: 'SQL Server and T-SQL, C# talking to it directly and through EF Core, and the dependency-injection container.',
    topics: [
      t('JT_SQLSERVER', 'SQL Server in Practice', ['SQL_SERVER'],
        ['Install and work with SQL Server, choose its types and constraints, write T-SQL, index for a query and write a stored procedure.']),
      t('JT_ADONET', 'ADO.NET: C# Talking to SQL Server', ['ADO_NET'],
        ['Query and update SQL Server safely with parameters, map rows to objects, use transactions and pooling, and wrap it in a repository.']),
      t('JT_EFCORE', 'Entity Framework Core', ['EF_CORE'],
        ['Map entities, run migrations, query with LINQ, model relationships, avoid N+1, and handle change tracking and concurrency.']),
      t('JT_DOTNET_DI', 'Dependency Injection, Configuration and Logging', ['DOTNET_DI'],
        ['Register and inject services with the right lifetimes, read configuration through options, and log with ILogger.']),
    ],
  },

  /* ══════════════ ASP.NET CORE AND THE FULL STACK (batch N3) ══════════════ */
  {
    moduleCode: 'JT_DOTNET_WEB',
    moduleName: 'ASP.NET Core and the Full Stack',
    displayOrder: 170,
    blurb: 'An ASP.NET Core Web API on SQL Server, secured with JWT and tested, then the React app wired to it and the whole stack deployed.',
    topics: [
      t('JT_ASPNET_API', 'ASP.NET Core Web APIs', ['ASPNET_CORE', 'REST_APIS'],
        ['Build an ASP.NET Core Web API with DTOs, validation, consistent ProblemDetails errors, configuration and OpenAPI docs.']),
      t('JT_ASPNET_DATA', 'EF Core in ASP.NET Core', ['ASPNET_CORE', 'EF_CORE'],
        ['Persist through EF Core in an API with a service layer, pagination and filtering, async endpoints and transactions.']),
      t('JT_ASPNET_SECURITY', 'ASP.NET Core Security and JWT', ['ASPNET_SECURITY', 'AUTHENTICATION', 'AUTHORIZATION'],
        ['Secure an API with Identity, JWT bearer authentication and role, policy and per-record authorization, and explain each check.']),
      t('JT_ASPNET_TESTING', 'Testing ASP.NET Core', ['AUTOMATED_TESTING', 'ASPNET_CORE'],
        ['Test an API with xUnit, Moq, WebApplicationFactory integration tests and real-database tests, and choose the right test for each layer.']),
      t('JT_FULLSTACK_DOTNET', 'React and ASP.NET Core: Integration and Deployment', ['REST_APIS', 'AUTHENTICATION', 'CONTAINERS_DOCKER', 'DEPLOYMENT'],
        ['Wire a React app to an ASP.NET Core API with CORS and a JWT login flow, containerise both, and deploy the stack.']),
    ],
  },

  /* ══════════════ AI IN .NET AND THE CAPSTONE (batch N4) ══════════════ */
  {
    moduleCode: 'JT_DOTNET_AI',
    moduleName: 'AI in .NET and the Capstone',
    displayOrder: 180,
    blurb: 'LLM features in ASP.NET Core with the OpenAI .NET SDK and Semantic Kernel, agents, and the capstone. The AI concepts are the shared language-free topics.',
    topics: [
      t('JT_AI_DOTNET', 'Generative AI in .NET', ['LLM_APPLICATIONS', 'RAG_SYSTEMS'],
        ['Add LLM features in C#: the OpenAI .NET SDK, structured output, streaming to React, Semantic Kernel, and RAG over your own documents.']),
      t('JT_AI_AGENTS_DOTNET', 'Building Agents in .NET', ['AI_AGENTS', 'LLM_APPLICATIONS'],
        ['Build a bounded tool-calling agent with memory in C# and Semantic Kernel, connect it to MCP, and keep it safe.']),
      t('JT_CAPSTONE_DOTNET', 'Capstone: A .NET Full-Stack App with AI', ['PRODUCTION_ENGINEERING', 'LLM_APPLICATIONS', 'AI_AGENTS'],
        ['Plan, build, deploy and defend a React, ASP.NET Core and SQL Server application with an AI assistant and an agent.']),
    ],
  },

  /* ══════════════ .NET PLACEMENT — what a .NET full-stack interview asks that Year 4 does not (batch N5) ══════════════ */
  {
    moduleCode: 'JT_PLACE_DOTNET',
    moduleName: '.NET Full-Stack Placement',
    displayOrder: 190,
    blurb: 'The web, SQL and AI interview topics are shared with every full-stack track; this adds C#, ASP.NET Core, EF Core and SQL Server interviews, coding in C#, and the .NET full-stack candidate.',
    topics: [
      t('JT_IV_CSHARP', 'C# Interview Questions', ['CSHARP_BASICS', 'CSHARP_OOP', 'CSHARP_COLLECTIONS', 'CSHARP_LINQ', 'CSHARP_ASYNC', 'CSHARP_EXCEPTIONS'],
        ['Answer C# interview questions — the type system, OOP, collections, delegates and LINQ, async, memory and exceptions — with the follow-up.']),
      t('JT_IV_ASPNET', 'ASP.NET Core, EF Core and SQL Server Interview Questions', ['ASPNET_CORE', 'EF_CORE', 'ASPNET_SECURITY', 'SQL_SERVER'],
        ['Answer ASP.NET Core, EF Core, security and SQL Server interview questions at the depth a backend round expects.']),
      t('JT_CODING_CSHARP', 'Coding Rounds in C#', ['CSHARP_BASICS', 'DSA_ARRAYS', 'DSA_STRINGS', 'DSA_HASHING', 'DSA_STACK', 'DSA_LINKED_LIST', 'DSA_TREES', 'DSA_GRAPHS', 'DSA_DP', 'DSA_GREEDY'],
        ['Solve timed coding-round problems in C#, from arrays to dynamic programming.']),
      t('JT_MCQ_CSHARP_DOTNET', 'C# and .NET MCQ Rounds', ['CSHARP_BASICS', 'CSHARP_OOP', 'ASPNET_CORE', 'EF_CORE'],
        ['Clear the C# and .NET sections of a company online test.']),
      t('JT_PLACE_DOTNET_FS', 'The .NET Full-Stack Candidate', ['PLACEMENT_READINESS', 'PORTFOLIO_EVIDENCE', 'TECHNICAL_EXPLANATION', 'INTERVIEW_PERFORMANCE'],
        ['Present a .NET full-stack resume and capstone and get through a full interview loop.']),
    ],
  },

  /* ══════════════ DATA ANALYTICS — Excel and SQL for analysts (Data Analytics + AI, batch A1) ══════════════ */
  {
    moduleCode: 'DT_EXCEL_SQL',
    moduleName: 'Excel and SQL for Analysts',
    displayOrder: 200,
    blurb: 'Excel from formulas to a dashboard, and SQL written to answer business questions — aggregation, joins, CTEs and window functions. The SQL basics are the years’ own topics.',
    topics: [
      t('DT_EXCEL_CORE', 'Excel: Formulas, Lookups and Cleaning', ['SPREADSHEET_ANALYSIS'],
        ['Build a clean, well-structured workbook with correct references, conditional aggregation, lookups and repeatable cleaning.']),
      t('DT_EXCEL_ANALYSIS', 'Excel: Pivots, Charts and Dashboards', ['SPREADSHEET_ANALYSIS'],
        ['Summarise data with pivot tables, chart it honestly, model scenarios and build a dashboard that refreshes.']),
      t('DT_SQL_ANALYST', 'SQL for Business Questions', ['SQL_AGGREGATION'],
        ['Turn a business question into correct SQL with grouped and conditional aggregation, safe joins, CTEs and date handling.']),
      t('DT_SQL_WINDOWS', 'SQL Window Functions for Analysis', ['SQL_WINDOW_FUNCTIONS'],
        ['Use window functions for ranking, running totals, period-over-period change, cohorts, retention and funnels.']),
    ],
  },

  /* ══════════════ PYTHON FOR DATA — pandas, cleaning and EDA (Data Analytics + AI, batch A2) ══════════════ */
  {
    moduleCode: 'DT_PYTHON_DATA',
    moduleName: 'Python for Data',
    displayOrder: 210,
    blurb: 'NumPy and pandas, cleaning data you can trust, and exploratory analysis with honest charts. Python basics and the first data-wrangling topic are the years’ own.',
    topics: [
      t('DT_PANDAS', 'NumPy and pandas', ['DATA_WRANGLING'],
        ['Load, select, filter, group, merge, reshape and resample data with pandas in a reproducible notebook.']),
      t('DT_DATA_CLEANING', 'Data Cleaning and Quality', ['DATA_CLEANING', 'DATA_QUALITY'],
        ['Handle missing values, types, duplicates, inconsistent text and outliers, and write quality checks you can rerun.']),
      t('DT_EDA_VIZ', 'Exploratory Analysis and Visualisation', ['EXPLORATORY_ANALYSIS', 'DATA_VISUALISATION'],
        ['Explore a dataset systematically, chart it honestly with Matplotlib and Seaborn, and present the findings.']),
    ],
  },

  /* ══════════════ STATISTICS AND POWER BI (Data Analytics + AI, batch A3) ══════════════ */
  {
    moduleCode: 'DT_STATS_BI',
    moduleName: 'Statistics, A/B Testing and Power BI',
    displayOrder: 220,
    blurb: 'Statistics for business decisions and A/B tests, then Power BI from Power Query and the star schema to DAX and published dashboards. Year 1’s probability and statistics topic is the base.',
    topics: [
      t('DT_STATS_DECISIONS', 'Statistics for Decisions', ['STATISTICS_BASICS', 'PROBABILITY_BASICS'],
        ['Describe business data honestly, reason about samples and intervals, and separate correlation from cause.']),
      t('DT_AB_TESTING', 'Hypothesis Tests and A/B Testing', ['HYPOTHESIS_TESTING'],
        ['Choose and run the right test, design an A/B test, catch a flawed one, and report the result a manager can act on.']),
      t('DT_PBI_MODEL', 'Power BI: Power Query and the Data Model', ['DASHBOARDING'],
        ['Shape sources in Power Query and model them as a star schema with a date table.']),
      t('DT_PBI_DAX', 'Power BI: DAX', ['DASHBOARDING'],
        ['Write DAX measures with CALCULATE, filter context, time intelligence, iterators and variables.']),
      t('DT_PBI_REPORTS', 'Power BI: Reports and Dashboards', ['DASHBOARDING', 'DATA_VISUALISATION'],
        ['Design interactive Power BI reports for their audience, publish them with refresh, and secure rows with RLS.']),
    ],
  },

  /* ══════════════ METRICS, AI FOR ANALYSTS AND THE CAPSTONE (Data Analytics + AI, batch A4) ══════════════ */
  {
    moduleCode: 'DT_ANALYST_AI',
    moduleName: 'Metrics, AI for Analysts and the Capstone',
    displayOrder: 230,
    blurb: 'Business metrics, root-cause analysis and storytelling; AI used well in every step of an analysis; and the capstone. Year 1’s generative-AI topic is the base.',
    topics: [
      t('DT_METRICS_STORY', 'Business Metrics and Storytelling', ['BUSINESS_METRICS'],
        ['Choose and compute the right business metrics, find why a metric moved, and present the answer as a story a manager acts on.']),
      t('DT_AI_ANALYST', 'AI for Analysts', ['LLM_APPLICATIONS', 'PROMPT_ENGINEERING'],
        ['Use AI to draft SQL, pandas and DAX, verify what it produces, work within data-privacy rules, and automate text analysis with an LLM API.']),
      t('DT_CAPSTONE_DA', 'Capstone: An End-to-End Analysis with AI', ['BUSINESS_METRICS', 'DASHBOARDING', 'LLM_APPLICATIONS'],
        ['Plan, build, present and defend an end-to-end analysis with a dashboard and a measured AI-assisted insight.']),
    ],
  },

  /* ══════════════ ANALYST PLACEMENT (Data Analytics + AI, batch A5) ══════════════ */
  {
    moduleCode: 'DT_PLACE_DA',
    moduleName: 'Analyst Placement',
    displayOrder: 240,
    blurb: 'Aptitude, HR, portfolio and mocks are the shared placement packs; this adds analyst SQL rounds, Excel and Power BI, statistics and pandas interviews, case interviews, and the analyst candidate.',
    topics: [
      t('DT_IV_SQL_DA', 'Analyst SQL Interview Rounds', ['SQL_AGGREGATION', 'SQL_WINDOW_FUNCTIONS'],
        ['Write and explain correct SQL live for the aggregation, join, window and business-case questions analyst rounds ask.']),
      t('DT_IV_EXCEL_BI', 'Excel and Power BI Interview Questions', ['SPREADSHEET_ANALYSIS', 'DASHBOARDING'],
        ['Answer Excel, Power BI modelling, DAX and dashboard-design questions at the depth an analyst round expects.']),
      t('DT_IV_STATS_PYTHON', 'Statistics, A/B Testing and pandas Interview Questions', ['STATISTICS_BASICS', 'HYPOTHESIS_TESTING', 'DATA_WRANGLING', 'DATA_CLEANING'],
        ['Explain statistics and A/B testing in plain words and solve pandas and cleaning tasks live.']),
      t('DT_CASE_INTERVIEWS', 'Case Interviews', ['BUSINESS_METRICS'],
        ['Work guesstimates, metric cases, product cases and take-home assignments with structure and clear communication.']),
      t('DT_PLACE_DA_FS', 'The Analyst Candidate', ['PLACEMENT_READINESS', 'PORTFOLIO_EVIDENCE', 'TECHNICAL_EXPLANATION', 'INTERVIEW_PERFORMANCE'],
        ['Present an analyst resume, portfolio and capstone and get through a full interview loop.']),
    ],
  },

  /* ══════════════ MACHINE LEARNING FOUNDATIONS (Data Science + AI, batch S1) ══════════════ */
  {
    moduleCode: 'DS_ML_CORE',
    moduleName: 'Machine Learning Foundations',
    displayOrder: 300,
    blurb: 'The maths ML uses, the workflow that keeps a model honest, and regression and classification with scikit-learn. SQL, pandas and statistics are the Data Analytics packs; Year 1 introduced ML.',
    topics: [
      t('DS_MATH_ML', 'Maths for Machine Learning', ['ML_CONCEPTS'],
        ['Use vectors, matrices, gradients, gradient descent and likelihood to explain how a model learns.']),
      t('DS_ML_WORKFLOW', 'The Machine Learning Workflow', ['ML_CONCEPTS', 'ML_OVERFITTING'],
        ['Frame an ML problem, split without leakage, beat a baseline, build pipelines, tune with cross-validation and diagnose overfitting.']),
      t('DS_REGRESSION', 'Regression', ['ML_SUPERVISED'],
        ['Build, regularise, measure and interpret regression models.']),
      t('DS_CLASSIFICATION', 'Classification', ['ML_SUPERVISED'],
        ['Build and interpret classifiers, handle imbalance, and choose a threshold from business costs.']),
    ],
  },

  /* ══════════════ APPLIED MACHINE LEARNING (Data Science + AI, batch S2) ══════════════ */
  {
    moduleCode: 'DS_ML_APPLIED',
    moduleName: 'Applied Machine Learning',
    displayOrder: 310,
    blurb: 'Ensembles that win on tables, evaluation and interpretability, feature engineering, and unsupervised learning.',
    topics: [
      t('DS_ENSEMBLES', 'Ensembles: Forests and Boosting', ['ML_SUPERVISED'],
        ['Train, tune and choose between random forests, gradient boosting, XGBoost and LightGBM.']),
      t('DS_EVALUATION', 'Model Evaluation and Interpretability', ['ML_EVALUATION'],
        ['Choose the right metric, show business value, calibrate, validate honestly, explain a model and find where it fails.']),
      t('DS_FEATURE_ENG', 'Feature Engineering', ['ML_FEATURE_ENGINEERING'],
        ['Encode, transform and build features — including aggregates from transactions — without leaking the future.']),
      t('DS_UNSUPERVISED', 'Unsupervised Learning', ['ML_UNSUPERVISED'],
        ['Cluster, reduce dimensions, segment customers and detect anomalies, and turn the results into decisions.']),
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

  /* ══════════════ SPRING BOOT AND THE FULL STACK — an API, secured and tested, then React on top and deployed ══════════════ */
  {
    moduleCode: 'JT_BOOT',
    moduleName: 'Spring Boot and the Full Stack',
    displayOrder: 70,
    blurb: 'A Spring Boot REST API on MySQL, secured with JWT and tested, then the React app wired to it and the whole stack deployed.',
    topics: [
      t('JT_BOOT_REST', 'Spring Boot and REST APIs', ['SPRING_BOOT', 'REST_APIS'],
        ['Build a Spring Boot REST API with DTOs, validation, consistent errors, configuration and OpenAPI docs.']),
      t('JT_BOOT_DATA', 'Spring Data JPA', ['SPRING_BOOT', 'JPA_HIBERNATE'],
        ['Persist through Spring Data repositories with derived and custom queries, pagination, and a transactional service layer.']),
      t('JT_BOOT_SECURITY', 'Spring Security and JWT', ['SPRING_SECURITY', 'AUTHENTICATION', 'AUTHORIZATION'],
        ['Secure a Spring Boot API with hashed passwords, JWT login and role-based access, and explain each check.']),
      t('JT_BOOT_TESTING', 'Testing Spring Boot', ['AUTOMATED_TESTING', 'SPRING_BOOT'],
        ['Test a Spring Boot API with JUnit 5, Mockito, MockMvc and repository tests, and choose the right test for each layer.']),
      t('JT_FULLSTACK', 'Full-Stack Integration and Deployment', ['REST_APIS', 'AUTHENTICATION', 'CONTAINERS_DOCKER', 'DEPLOYMENT'],
        ['Wire a React app to a Spring Boot API with CORS and a JWT login flow, containerise both, and deploy the stack.']),
    ],
  },

  /* ══════════════ AI — concepts once for every "+ AI" track; the code lessons per language ══════════════ */
  {
    moduleCode: 'JT_AI',
    moduleName: 'Generative and Agentic AI',
    displayOrder: 80,
    blurb: 'Year 1 explains how a model works; this builds with one. The concept topics are language-free and shared; the Spring topics are the Java code.',
    topics: [
      t('JT_AI_CONCEPTS', 'Building with LLMs: The Concepts', ['LLM_APPLICATIONS', 'PROMPT_ENGINEERING', 'RAG_SYSTEMS'],
        ['Design prompts and structured output, reason about tokens, cost and limits, and explain embeddings, RAG and how LLM features fail.']),
      t('JT_AI_SPRING', 'Generative AI in Spring Boot', ['LLM_APPLICATIONS', 'RAG_SYSTEMS'],
        ['Add an LLM feature to a Spring Boot app with Spring AI: chat, structured output, streaming to React, and RAG over your own documents.']),
      t('JT_AI_AGENTS', 'Agentic AI: The Concepts', ['AI_AGENTS'],
        ['Explain what an agent is and when not to build one, and design its tools, workflow, memory and guardrails.']),
      t('JT_AI_AGENTS_JAVA', 'Building Agents in Java', ['AI_AGENTS', 'LLM_APPLICATIONS'],
        ['Build a tool-calling agent with memory in Spring AI, connect it to an MCP server, and test it.']),
      t('JT_CAPSTONE', 'Capstone: A Full-Stack App with AI', ['PRODUCTION_ENGINEERING', 'LLM_APPLICATIONS', 'AI_AGENTS'],
        ['Plan, build, deploy and defend a full-stack application with an AI assistant and an agent in it.']),
    ],
  },

  /* ══════════════ PYTHON — what the years do not teach: modern Python, pytest, Python and MySQL ══════════════ */
  {
    moduleCode: 'JT_PYTHON',
    moduleName: 'Python for the Full Stack',
    displayOrder: 100,
    blurb: 'Years 1–3 teach Python, OOP and DSA in Python; this adds modern Python, testing with pytest, and Python talking to MySQL.',
    topics: [
      t('JT_PY_MODERN', 'Modern and Pythonic Python', ['PYTHON_ADVANCED'],
        ['Write idiomatic, typed Python: comprehensions, generators, decorators, context managers, dataclasses and async.']),
      t('JT_PY_TESTING', 'Testing Python with pytest', ['AUTOMATED_TESTING'],
        ['Test Python code with pytest: fixtures, parametrised tests, mocking and coverage.']),
      t('JT_PY_MYSQL', 'Python and MySQL', ['PYTHON_DB', 'SQL_BASICS'],
        ['Connect Python to MySQL, query safely with parameters, use transactions and keep SQL behind a data-access layer.']),
    ],
  },

  /* ══════════════ DJANGO — the Python track's backend: Django, its ORM, DRF, auth and tests ══════════════ */
  {
    moduleCode: 'JT_DJANGO',
    moduleName: 'Django and Django REST Framework',
    displayOrder: 110,
    blurb: 'A Django REST Framework API on MySQL, grown through the ORM, auth and tests — the Python track’s Spring Boot.',
    topics: [
      t('JT_DJANGO_CORE', 'Django Fundamentals', ['DJANGO'],
        ['Build a Django project: apps, URLs and views, the admin, and settings for each environment on MySQL.']),
      t('JT_DJANGO_ORM', 'The Django ORM', ['DJANGO'],
        ['Model data with Django, query it with querysets, Q and F, and keep it fast with select_related and prefetch_related.']),
      t('JT_DRF', 'Django REST Framework', ['DJANGO_REST', 'REST_APIS'],
        ['Build a REST API with serializers, viewsets, validation, pagination, filtering and OpenAPI docs.']),
      t('JT_DJANGO_AUTH', 'Auth and Security in Django', ['DJANGO_REST', 'AUTHENTICATION', 'AUTHORIZATION'],
        ['Secure a DRF API with a custom user model, JWT, permissions and object ownership, and production settings.']),
      t('JT_DJANGO_TESTING', 'Testing Django', ['AUTOMATED_TESTING', 'DJANGO_REST'],
        ['Test a Django API with pytest-django, APIClient and factories, including permissions.']),
    ],
  },

  /* ══════════════ PYTHON FULL STACK AND AI — React with Django, FastAPI for the AI, the capstone ══════════════ */
  {
    moduleCode: 'JT_PY_STACK_AI',
    moduleName: 'The Python Full Stack and AI',
    displayOrder: 120,
    blurb: 'React wired to Django and deployed, then a FastAPI service for chat, RAG and an agent, and the capstone. The AI concepts are the shared language-free topics.',
    topics: [
      t('JT_FULLSTACK_PY', 'React and Django: Integration and Deployment', ['REST_APIS', 'AUTHENTICATION', 'CONTAINERS_DOCKER', 'DEPLOYMENT'],
        ['Wire a React app to a Django REST Framework API with CORS and a JWT login flow, containerise both, and deploy the stack.']),
      t('JT_FASTAPI', 'FastAPI for the AI Service', ['FASTAPI'],
        ['Build and test a typed async FastAPI service that a Django app calls safely.']),
      t('JT_AI_PY', 'Generative AI in Python', ['LLM_APPLICATIONS', 'RAG_SYSTEMS'],
        ['Add LLM features in Python: structured output with Pydantic, streaming to React, and RAG over your own documents.']),
      t('JT_AI_AGENTS_PY', 'Building Agents in Python', ['AI_AGENTS', 'LLM_APPLICATIONS'],
        ['Build a bounded tool-calling agent with memory in Python, connect it to MCP, and keep it safe.']),
      t('JT_CAPSTONE_PY', 'Capstone: A Python Full-Stack App with AI', ['PRODUCTION_ENGINEERING', 'LLM_APPLICATIONS', 'AI_AGENTS'],
        ['Plan, build, deploy and defend a React, Django and FastAPI application with an AI assistant and an agent.']),
    ],
  },

  /* ══════════════ PYTHON PLACEMENT — what a Python full-stack interview asks that Year 4 does not ══════════════ */
  {
    moduleCode: 'JT_PLACE_PY',
    moduleName: 'Python Full-Stack Placement',
    displayOrder: 130,
    blurb: 'The web, SQL and AI interview topics are shared with every full-stack track; this adds Python, Django and FastAPI interviews, coding in Python, and the Python full-stack candidate.',
    topics: [
      t('JT_IV_PYTHON', 'Python Interview Questions', ['PYTHON_BASICS', 'PYTHON_COLLECTIONS', 'PYTHON_FUNCTIONS', 'PYTHON_OOP', 'PYTHON_ADVANCED', 'PYTHON_ERROR_HANDLING'],
        ['Answer Python interview questions — the data model, collections, closures and decorators, OOP, the GIL and concurrency, memory — with the follow-up.']),
      t('JT_IV_DJANGO', 'Django, DRF and FastAPI Interview Questions', ['DJANGO', 'DJANGO_REST', 'FASTAPI'],
        ['Answer Django, ORM, DRF, auth and FastAPI interview questions at the depth a backend round expects.']),
      t('JT_CODING_PYTHON', 'Coding Rounds in Python', ['PYTHON_BASICS', 'DSA_ARRAYS', 'DSA_STRINGS', 'DSA_HASHING', 'DSA_STACK', 'DSA_LINKED_LIST', 'DSA_TREES', 'DSA_GRAPHS', 'DSA_DP', 'DSA_GREEDY'],
        ['Solve timed coding-round problems in Python, from arrays to dynamic programming.']),
      t('JT_MCQ_PYTHON_DJANGO', 'Python and Django MCQ Rounds', ['PYTHON_BASICS', 'PYTHON_ADVANCED', 'DJANGO', 'DJANGO_REST'],
        ['Clear the Python and Django sections of a company online test.']),
      t('JT_PLACE_PY_FS', 'The Python Full-Stack Candidate', ['PLACEMENT_READINESS', 'PORTFOLIO_EVIDENCE', 'TECHNICAL_EXPLANATION', 'INTERVIEW_PERFORMANCE'],
        ['Present a Python full-stack resume and capstone and get through a full interview loop.']),
    ],
  },

  /* ══════════════ PLACEMENT — what a Java full-stack interview asks that Year 4 does not ══════════════ */
  {
    moduleCode: 'JT_PLACE',
    moduleName: 'Java Full-Stack Placement',
    displayOrder: 90,
    blurb: 'Year 4 teaches aptitude, core CS, coding patterns, HR and mocks for everyone; this adds the Java, Spring, React, SQL and AI interview, coding in Java, and the Java full-stack candidate.',
    topics: [
      t('JT_IV_CORE_JAVA', 'Core Java Interview Questions', ['JAVA_BASICS', 'JAVA_OOP', 'JAVA_COLLECTIONS', 'JAVA_STREAMS', 'JAVA_CONCURRENCY', 'JAVA_EXCEPTIONS'],
        ['Answer Core Java interview questions — language, OOP, collections, Java 8, concurrency and the JVM — with the follow-up.']),
      t('JT_IV_SPRING', 'Spring, Spring Boot and Hibernate Interview Questions', ['SPRING_CORE', 'SPRING_BOOT', 'JPA_HIBERNATE', 'SPRING_SECURITY'],
        ['Answer Spring, Boot, JPA and Security interview questions at the depth a backend round expects.']),
      t('JT_IV_FRONTEND', 'JavaScript and React Interview Questions', ['HTML', 'CSS', 'JS_BASICS', 'JS_ES6', 'JS_ASYNC', 'REACT_COMPONENTS', 'REACT_HOOKS'],
        ['Answer HTML, CSS, JavaScript and React interview questions, including the event loop and re-renders.']),
      t('JT_IV_SQL_MYSQL', 'SQL and MySQL Interview Questions', ['SQL_BASICS', 'SQL_JOINS', 'DB_DESIGN', 'DB_INDEXING', 'DB_TRANSACTIONS'],
        ['Write the classic interview queries and explain keys, normalisation, indexes and transactions.']),
      t('JT_IV_AI', 'AI Engineering Interview Questions', ['LLM_APPLICATIONS', 'GENERATIVE_AI_LLM', 'RAG_SYSTEMS', 'AI_AGENTS'],
        ['Answer interview questions on LLM features, RAG and agents, and on the AI in your own project.']),
      t('JT_CODING_JAVA', 'Coding Rounds in Java', ['JAVA_BASICS', 'DSA_ARRAYS', 'DSA_STRINGS', 'DSA_HASHING', 'DSA_STACK', 'DSA_LINKED_LIST', 'DSA_TREES', 'DSA_GRAPHS', 'DSA_DP', 'DSA_GREEDY'],
        ['Solve timed coding-round problems in Java, from arrays to dynamic programming.']),
      t('JT_MCQ_JAVA_SPRING', 'Java and Spring MCQ Rounds', ['JAVA_BASICS', 'JAVA_OOP', 'SPRING_CORE', 'SPRING_BOOT'],
        ['Clear the Java and Spring sections of a company online test.']),
      t('JT_PLACE_JAVA_FS', 'The Java Full-Stack Candidate', ['PLACEMENT_READINESS', 'PORTFOLIO_EVIDENCE', 'TECHNICAL_EXPLANATION', 'INTERVIEW_PERFORMANCE'],
        ['Present a Java full-stack resume and capstone and get through a full interview loop.']),
    ],
  },
];

/** Every skill the track content names — the seeder refuses to import if one is not in the taxonomy. */
export const trackReferencedSkillKeys = (): string[] =>
  [...new Set(TRACK_MODULES.flatMap(m => m.topics.flatMap(tp => tp.skillKeys || [])))];
