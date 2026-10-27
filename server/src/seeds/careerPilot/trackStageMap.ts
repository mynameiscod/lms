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

  /* ══════════════ FORECASTING, DEEP LEARNING AND NLP (Data Science + AI, batch S3) ══════════════ */
  {
    moduleCode: 'DS_ADVANCED',
    moduleName: 'Forecasting, Deep Learning and NLP',
    displayOrder: 320,
    blurb: 'Time series and forecasting, deep learning with PyTorch, and NLP and generative AI as a data scientist uses them. Year 1’s generative-AI topic is the base.',
    topics: [
      t('DS_TIME_SERIES', 'Time Series and Forecasting', ['ML_SUPERVISED'],
        ['Decompose time series, beat baselines with statistical and ML forecasts, and backtest them honestly.']),
      t('DS_DEEP_LEARNING', 'Deep Learning', ['NEURAL_NETWORKS', 'DL_TRAINING'],
        ['Explain how neural networks learn, train them in PyTorch, fine-tune pretrained models, and understand sequence models.']),
      t('DS_NLP_GENAI', 'NLP and Generative AI for Data Science', ['DL_TRANSFORMERS', 'VECTOR_EMBEDDINGS'],
        ['Work with text from TF-IDF to transformers and LLMs, choose between them on cost and accuracy, and evaluate LLM output and RAG.']),
    ],
  },

  /* ══════════════ DEPLOYMENT AND THE CAPSTONE (Data Science + AI, batch S4) ══════════════ */
  {
    moduleCode: 'DS_DEPLOY_CAPSTONE',
    moduleName: 'Model Deployment and the Capstone',
    displayOrder: 330,
    blurb: 'Putting a model into use — saving, serving, demoing, tracking and monitoring it — and the capstone.',
    topics: [
      t('DS_DEPLOYMENT', 'Model Deployment and MLOps Basics', ['MODEL_DEPLOYMENT', 'EXPERIMENT_TRACKING', 'MODEL_MONITORING'],
        ['Save, serve, demo, track, package and monitor a model so it keeps working after the notebook is closed.']),
      t('DS_CAPSTONE', 'Capstone: An End-to-End ML Project with AI', ['ML_EVALUATION', 'MODEL_DEPLOYMENT', 'DL_TRANSFORMERS'],
        ['Plan, build, deploy, present and defend an end-to-end machine-learning project with a measured GenAI feature.']),
    ],
  },

  /* ══════════════ DATA SCIENCE PLACEMENT (Data Science + AI, batch S5) ══════════════ */
  {
    moduleCode: 'DS_PLACE',
    moduleName: 'Data Science Placement',
    displayOrder: 340,
    blurb: 'SQL and statistics interviews are Data Analytics’ topics, aptitude, HR, portfolio and mocks the shared packs; this adds ML, probability, ML case and coding rounds and the data-science candidate.',
    topics: [
      t('DS_IV_ML', 'Machine Learning Interview Questions', ['ML_OVERFITTING', 'ML_SUPERVISED', 'ML_EVALUATION', 'ML_FEATURE_ENGINEERING', 'NEURAL_NETWORKS', 'MODEL_DEPLOYMENT'],
        ['Answer ML interview questions — fundamentals, algorithms, evaluation, features, deep learning, NLP and deployment — with the follow-up.']),
      t('DS_IV_PROBABILITY', 'Probability and Statistics Interview Questions', ['PROBABILITY_BASICS', 'STATISTICS_BASICS'],
        ['Work probability puzzles, distribution and Bayes questions, and estimation questions aloud.']),
      t('DS_ML_CASE', 'ML Case and System-Design Interviews', ['ML_CONCEPTS'],
        ['Frame and design an ML product end to end — data, features, metrics, model, deployment and monitoring — and complete a take-home.']),
      t('DS_CODING_ML', 'Coding Rounds for Data Scientists', ['ML_CONCEPTS'],
        ['Implement algorithms, data manipulation and evaluation metrics in plain Python under time.']),
      t('DS_PLACE_FS', 'The Data Science Candidate', ['PLACEMENT_READINESS', 'PORTFOLIO_EVIDENCE', 'TECHNICAL_EXPLANATION', 'INTERVIEW_PERFORMANCE'],
        ['Present a data-science resume, portfolio and capstone and get through a full interview loop.']),
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

  /* ══════════════ THE AI ENGINEERING CORE (the AI tracks, batch AI1) ══════════════ */
  {
    moduleCode: 'AI_CORE',
    moduleName: 'The AI Engineering Core',
    displayOrder: 400,
    blurb: 'What every AI track shares beyond building with LLMs: how models behave, RAG on a real vector database, evaluation and guardrails, and running AI in production.',
    topics: [
      t('AI_LLM_INTERNALS', 'How LLMs Work, for Engineers', ['LLM_FUNDAMENTALS', 'DL_TRANSFORMERS'],
        ['Explain tokenisation, attention, training stages and decoding well enough to predict how a model will behave, and choose and run a model.']),
      t('AI_RAG_DEEP', 'RAG in Depth and Vector Databases', ['RAG_FUNDAMENTALS', 'VECTOR_DATABASES', 'VECTOR_EMBEDDINGS'],
        ['Build retrieval that finds the right passages — parsing, chunking, embeddings, a vector database, hybrid search and re-ranking — and measure it.']),
      t('AI_EVAL_SAFETY', 'Evaluating and Guarding LLM Applications', ['LLM_EVALUATION', 'AI_GUARDRAILS', 'PROMPT_INJECTION', 'AI_RESPONSIBLE'],
        ['Evaluate an LLM feature with numbers, gate releases on them, and defend it against injection, unsafe output and privacy risk.']),
      t('AI_PRODUCTION', 'Running AI Applications in Production', ['GENAI_APP_PATTERNS', 'MODEL_DEPLOYMENT', 'API_FUNDAMENTALS'],
        ['Choose the right GenAI pattern and run it in production within budget: routing, caching, tracing, background jobs and safe deployment.']),
    ],
  },

  /* ══════════════ GENERATIVE AI SPECIALISM AND THE AI CAPSTONES (the AI tracks, batch AI2) ══════════════ */
  {
    moduleCode: 'AI_GENAI',
    moduleName: 'Fine-Tuning, Multimodal AI and the AI Capstones',
    displayOrder: 410,
    blurb: 'The Generative AI Engineer’s specialism — fine-tuning open models and multimodal AI — and the capstones of the AI Engineer and Generative AI Engineer tracks.',
    topics: [
      t('AI_FINE_TUNING', 'Fine-Tuning Open Models', ['LLM_FINE_TUNING', 'DL_TRANSFORMERS'],
        ['Decide when fine-tuning is worth it, build the dataset, run and evaluate a LoRA fine-tune, and serve the result.']),
      t('AI_MULTIMODAL', 'Multimodal AI', ['GENAI_APP_PATTERNS', 'LLM_FUNDAMENTALS'],
        ['Build features that read images and documents, hear and speak, generate images responsibly, and retrieve across text and figures.']),
      t('AI_CAPSTONE_ENG', 'Capstone: An AI Product, End to End', ['GENAI_APP_PATTERNS', 'RAG_FUNDAMENTALS', 'LLM_EVALUATION', 'MODEL_DEPLOYMENT'],
        ['Plan, build, evaluate, deploy, present and defend an AI product with retrieval, an agent action and guardrails.']),
      t('AI_CAPSTONE_GENAI', 'Capstone: A Generative AI Product', ['GENAI_APP_PATTERNS', 'LLM_FINE_TUNING', 'RAG_FUNDAMENTALS', 'LLM_EVALUATION'],
        ['Plan, build, evaluate, deploy, present and defend a generative AI product that combines prompting, RAG and a fine-tune.']),
    ],
  },

  /* ══════════════ AGENTIC AI (the AI tracks, batch AI3) ══════════════ */
  {
    moduleCode: 'AI_AGENTIC',
    moduleName: 'Agentic AI Systems',
    displayOrder: 420,
    blurb: 'From one bounded agent to agent systems: orchestration and multi-agent design, tools, MCP and memory, evaluation, security and operations — and the Agentic AI Engineer capstone.',
    topics: [
      t('AI_AGENT_ORCHESTRATION', 'Agent Orchestration and Multi-Agent Systems', ['AGENT_ORCHESTRATION', 'AGENT_FUNDAMENTALS'],
        ['Design agents as state graphs, choose the right pattern, coordinate several agents and parallel work, and keep humans in control of long-running runs.']),
      t('AI_AGENT_TOOLS_MEMORY', 'Agent Tools, MCP and Memory', ['TOOL_CALLING', 'AGENT_MEMORY'],
        ['Design tools and MCP servers a model uses well, contain code and web tools, and engineer memory and context for long tasks.']),
      t('AI_AGENT_EVAL_OPS', 'Evaluating, Securing and Running Agents', ['AGENT_EVALUATION', 'AI_GUARDRAILS'],
        ['Evaluate agents on outcomes and trajectories, secure them against excessive agency and tool injection, and run them as a product.']),
      t('AI_CAPSTONE_AGENTIC', 'Capstone: An Agentic Product', ['AGENT_ORCHESTRATION', 'TOOL_CALLING', 'AGENT_MEMORY', 'AGENT_EVALUATION'],
        ['Plan, build, evaluate, secure, deploy, present and defend an agent system that does real work for a business.']),
    ],
  },

  /* ══════════════ MLOPS (the AI tracks, batch AI4) ══════════════ */
  {
    moduleCode: 'AI_MLOPS',
    moduleName: 'MLOps',
    displayOrder: 430,
    blurb: 'From one deployed model to a platform that trains, ships, watches and retrains models repeatably — pipelines and versioning, CI/CD and infrastructure, monitoring and LLMOps, and the MLOps Engineer capstone.',
    topics: [
      t('MLOPS_PIPELINES', 'ML Pipelines, Versioning and Reproducibility', ['ML_PIPELINES', 'MODEL_VERSIONING', 'EXPERIMENT_TRACKING'],
        ['Version data and models, build validated and reproducible pipelines, and promote models through a registry by rule.']),
      t('MLOPS_CICD_INFRA', 'CI/CD and Infrastructure for ML', ['CI_CD', 'KUBERNETES', 'INFRA_AS_CODE', 'CLOUD_COMPUTE', 'CONFIG_MANAGEMENT'],
        ['Test and release models through CI/CD with gates and canaries, serve them on Kubernetes, and manage the infrastructure as code.']),
      t('MLOPS_MONITORING', 'Model Monitoring, Retraining and LLMOps', ['MODEL_MONITORING', 'OBSERVABILITY', 'ML_EVALUATION'],
        ['Monitor service health and model quality, retrain safely, operate LLM applications, and handle model incidents.']),
      t('AI_CAPSTONE_MLOPS', 'Capstone: An ML Platform', ['ML_PIPELINES', 'CI_CD', 'MODEL_DEPLOYMENT', 'MODEL_MONITORING'],
        ['Plan, build, release, operate, present and defend an ML platform that keeps a real model working.']),
    ],
  },

  /* ══════════════ AI SECURITY (the AI tracks, batch AI5) ══════════════ */
  {
    moduleCode: 'AI_SEC',
    moduleName: 'AI Security',
    displayOrder: 440,
    blurb: 'Securing AI systems: LLM threats and access control, testing and assuring your own defences, defence in depth and governance — and the AI Security Engineer capstone.',
    topics: [
      t('AISEC_LLM_THREATS', 'LLM Application Security', ['LLM_SECURITY', 'THREAT_MODELLING', 'AUTHENTICATION_AUTHZ'],
        ['Threat-model AI systems against the OWASP LLM risks, and close leaks, retrieval and tool attacks, access-control gaps and supply-chain risks.']),
      t('AISEC_ASSURANCE', 'Testing and Assuring AI Defences', ['MODEL_RED_TEAMING', 'PROMPT_INJECTION'],
        ['Plan security tests for your own AI system, keep its defences under a regression suite, measure them honestly and verify every fix.']),
      t('AISEC_DEFENCES', 'Defending AI Systems', ['AI_GUARDRAILS', 'LLM_SECURITY', 'AI_RESPONSIBLE'],
        ['Defend AI systems in depth with engineered guardrails, safe output handling, abuse monitoring and incident response, and govern their risk.']),
      t('AI_CAPSTONE_AISEC', 'Capstone: An AI Product, Secure by Design', ['MODEL_RED_TEAMING', 'PROMPT_INJECTION', 'AI_GUARDRAILS', 'LLM_SECURITY'],
        ['Build an AI product with its controls designed in, prove with tests and numbers that they work, and defend it.']),
    ],
  },

  /* ══════════════ AI PLACEMENT (the AI tracks, batch AI6) ══════════════ */
  {
    moduleCode: 'AI_PLACE',
    moduleName: 'AI Placement',
    displayOrder: 450,
    blurb: 'Year 4 teaches aptitude, coding patterns, core CS, HR and mocks for everyone; this adds the LLM engineering interview, an interview for each AI specialism, AI system design rounds and the AI candidate.',
    topics: [
      t('AI_IV_LLM', 'LLM Engineering Interview Questions', ['LLM_FUNDAMENTALS', 'RAG_FUNDAMENTALS', 'LLM_EVALUATION', 'GENAI_APP_PATTERNS'],
        ['Answer LLM engineering interview questions — models, RAG, evaluation and safety, production — with the follow-up.']),
      t('AI_IV_GENAI', 'Generative AI Interview Questions', ['LLM_FINE_TUNING', 'DL_TRANSFORMERS', 'GENAI_APP_PATTERNS'],
        ['Answer fine-tuning, transformer and multimodal interview questions at the depth a GenAI round expects.']),
      t('AI_IV_AGENTS', 'Agentic AI Interview Questions', ['AGENT_ORCHESTRATION', 'TOOL_CALLING', 'AGENT_EVALUATION'],
        ['Answer agent design, tools and memory, evaluation and security interview questions with the follow-up.']),
      t('AI_IV_MLOPS', 'MLOps Interview Questions', ['ML_PIPELINES', 'CI_CD', 'MODEL_DEPLOYMENT', 'MODEL_MONITORING'],
        ['Answer pipeline, delivery, serving and monitoring interview questions at the depth an MLOps round expects.']),
      t('AI_IV_AISEC', 'AI Security Interview Questions', ['LLM_SECURITY', 'MODEL_RED_TEAMING', 'AI_GUARDRAILS'],
        ['Answer LLM threat, security testing and defence interview questions at the depth an AI security round expects.']),
      t('AI_SYSTEM_DESIGN', 'AI System Design Interviews', ['GENAI_APP_PATTERNS', 'RAG_FUNDAMENTALS', 'AGENT_ORCHESTRATION', 'MODEL_DEPLOYMENT'],
        ['Design knowledge assistants, agents and ML platforms aloud with clear structure and trade-offs, and pass the take-home.']),
      t('AI_PLACE_CANDIDATE', 'The AI Candidate', ['PLACEMENT_READINESS', 'PORTFOLIO_EVIDENCE', 'TECHNICAL_EXPLANATION', 'INTERVIEW_PERFORMANCE'],
        ['Present an AI resume and capstone and get through a full AI interview loop.']),
    ],
  },

  /* ══════════════ CYBERSECURITY ANALYST: NETWORKS, ENDPOINTS, IDENTITY, CRYPTOGRAPHY (batch CY1) ══════════════ */
  {
    moduleCode: 'CY_FOUNDATIONS',
    moduleName: 'Networks, Endpoints, Identity and Cryptography for Defenders',
    displayOrder: 500,
    blurb: 'The years teach networking, operating systems and security fundamentals; this is how a defender reads traffic, endpoints and identities, and the cryptography they meet in every configuration.',
    topics: [
      t('CY_NETWORK_SECURITY', 'Network Security for Analysts', ['NETWORK_SECURITY', 'COMPUTER_NETWORKS'],
        ['Read packet captures and network logs, design firewall rules and segmentation, and use Suricata and Zeek to detect what matters.']),
      t('CY_ENDPOINT_IDENTITY', 'Endpoint and Identity Security', ['IAM_FUNDAMENTALS', 'OPERATING_SYSTEMS', 'LINUX_ADMIN'],
        ['Read Windows and Linux logs, understand Active Directory, harden servers, and run identity and endpoint protection well.']),
      t('CY_CRYPTO_PKI', 'Cryptography and PKI for Defenders', ['CRYPTOGRAPHY_BASICS'],
        ['Choose and assess cryptography, password storage, TLS and certificates, and keys and secrets, and spot the common mistakes.']),
    ],
  },

  /* ══════════════ CYBERSECURITY ANALYST: SECURITY OPERATIONS (batch CY2) ══════════════ */
  {
    moduleCode: 'CY_SOC',
    moduleName: 'Security Operations',
    displayOrder: 510,
    blurb: 'The SOC analyst\'s day job on open-source tools: logs and a SIEM, detection engineering and triage, incident response, and threat intelligence and hunting.',
    topics: [
      t('CY_SIEM_DETECTION', 'SIEM, Detection and Triage', ['SIEM_MONITORING', 'THREAT_MODELLING'],
        ['Collect and search logs in an open-source SIEM, write and tune Sigma detections, triage alerts and measure the SOC.']),
      t('CY_INCIDENT_RESPONSE', 'Incident Response', ['INCIDENT_RESPONSE'],
        ['Run an incident from first alert to report: scope, preserve evidence, contain, recover, follow playbooks and meet reporting duties.']),
      t('CY_THREAT_INTEL', 'Threat Intelligence and Hunting', ['THREAT_MODELLING', 'SIEM_MONITORING'],
        ['Use threat intelligence and MITRE ATT&CK to find coverage gaps and run hypothesis-driven hunts that become detections.']),
    ],
  },

  /* ══════════════ CYBERSECURITY ANALYST: VULNERABILITIES, CLOUD, GOVERNANCE, CAPSTONE (batch CY3) ══════════════ */
  {
    moduleCode: 'CY_DEFEND',
    moduleName: 'Vulnerabilities, Cloud Security and Governance',
    displayOrder: 520,
    blurb: 'Vulnerability management, cloud security, and governance, risk and compliance in India — and the Cybersecurity Analyst capstone.',
    topics: [
      t('CY_VULN_MGMT', 'Vulnerability Management', ['VULNERABILITY_MANAGEMENT'],
        ['Run the vulnerability cycle: authorised scanning, risk-based prioritisation, remediation and verification, and dependency and image scanning.']),
      t('CY_CLOUD_SECURITY', 'Cloud Security for Analysts', ['IAM_FUNDAMENTALS', 'CLOUD_NETWORKING', 'CLOUD_STORAGE'],
        ['Apply the shared responsibility model, least-privilege cloud access, secure networks and storage, cloud logging and posture checks.']),
      t('CY_GRC', 'Governance, Risk and Compliance', ['SECURITY_FUNDAMENTALS'],
        ['Map work to security frameworks, assess and record risk, meet Indian obligations, and prepare policies and audit evidence.']),
      t('CY_CAPSTONE', 'Capstone: A SOC for a Real Organisation', ['SIEM_MONITORING', 'NETWORK_SECURITY', 'INCIDENT_RESPONSE', 'VULNERABILITY_MANAGEMENT'],
        ['Plan, build, run, present and defend monitoring, detection, incident response and vulnerability management for an organisation.']),
    ],
  },

  /* ══════════════ CYBERSECURITY ANALYST: PLACEMENT (batch CY4) ══════════════ */
  {
    moduleCode: 'CY_PLACE',
    moduleName: 'Cybersecurity Placement',
    displayOrder: 530,
    blurb: 'Year 4 teaches aptitude, coding, core CS, HR and mocks for everyone; this adds the SOC analyst interview, scenario rounds and the security candidate.',
    topics: [
      t('CY_IV_SOC', 'SOC Analyst Interview Questions', ['SECURITY_FUNDAMENTALS', 'NETWORK_SECURITY', 'IAM_FUNDAMENTALS', 'SIEM_MONITORING', 'INCIDENT_RESPONSE'],
        ['Answer SOC analyst interview questions — fundamentals, networks, systems and identity, SIEM and incident response — with the follow-up.']),
      t('CY_SCENARIO_ROUNDS', 'SOC Scenario Rounds', ['SIEM_MONITORING', 'INCIDENT_RESPONSE', 'VULNERABILITY_MANAGEMENT'],
        ['Handle alert walkthroughs, log-analysis take-homes, tabletops and vulnerability-risk rounds with structure and evidence.']),
      t('CY_PLACE_CANDIDATE', 'The Security Candidate', ['PLACEMENT_READINESS', 'PORTFOLIO_EVIDENCE', 'INTERVIEW_PERFORMANCE'],
        ['Present a security resume, home lab and capstone, plan certifications, and get through a full SOC interview loop.']),
    ],
  },
  /* ══════════════ CLOUD & DEVOPS ENGINEER: AWS FOR ENGINEERS (batch CL1) ══════════════ */
  {
    moduleCode: 'CL_AWS',
    moduleName: 'AWS for Engineers',
    displayOrder: 540,
    blurb: 'The years teach Linux, networking and cloud basics; this is how an engineer runs AWS: safe accounts and IAM, VPC networking, compute and storage, and managed databases.',
    topics: [
      t('CL_AWS_FOUNDATIONS', 'AWS Foundations: Accounts, IAM and the CLI', ['CLOUD_FUNDAMENTALS', 'IAM_FUNDAMENTALS'],
        ['Set up AWS accounts safely, write and read IAM policies, use roles instead of keys, and automate AWS from the CLI and Python.']),
      t('CL_AWS_NETWORKING', 'AWS Networking', ['CLOUD_NETWORKING'],
        ['Design VPCs with public and private subnets, route and secure traffic, connect privately, and run DNS, load balancers and a CDN.']),
      t('CL_AWS_COMPUTE_STORAGE', 'AWS Compute and Storage', ['CLOUD_COMPUTE', 'CLOUD_STORAGE'],
        ['Run EC2 fleets that heal and scale, choose EBS, EFS and S3 well, keep data with lifecycle and backups, and pay less for compute.']),
      t('CL_AWS_DATABASES', 'AWS Databases', ['CLOUD_STORAGE', 'DB_FUNDAMENTALS'],
        ['Run RDS and Aurora, rehearse backups and recovery, model DynamoDB tables from access patterns, and cache with ElastiCache.']),
    ],
  },

  /* ══════════════ CLOUD & DEVOPS ENGINEER: DELIVERY (batch CL2) ══════════════ */
  {
    moduleCode: 'CL_DELIVERY',
    moduleName: 'Serverless, Kubernetes, Terraform and Pipelines',
    displayOrder: 550,
    blurb: 'How software reaches the cloud: serverless and events, containers and Kubernetes on EKS, infrastructure as code with Terraform, and pipelines and GitOps.',
    topics: [
      t('CL_SERVERLESS', 'Serverless on AWS', ['CLOUD_COMPUTE'],
        ['Build Lambda functions and APIs, decouple with queues, topics and events, orchestrate with Step Functions, and deploy serverless apps.']),
      t('CL_KUBERNETES', 'Containers and Kubernetes', ['KUBERNETES', 'CONTAINERS_DOCKER'],
        ['Run containers on ECS and Kubernetes, expose and configure workloads, make them self-healing and scalable, package with Helm, run on EKS.']),
      t('CL_TERRAFORM', 'Infrastructure as Code with Terraform', ['INFRA_AS_CODE', 'CONFIG_MANAGEMENT'],
        ['Build AWS with Terraform, keep state safe, structure modules and environments, run changes through CI and read CloudFormation and Bicep.']),
      t('CL_CICD_GITOPS', 'CI/CD and GitOps', ['CI_CD'],
        ['Design trustworthy pipelines, deploy to AWS with OIDC, secure the supply chain, release progressively and run GitOps with Argo CD.']),
    ],
  },

  /* ══════════════ CLOUD & DEVOPS ENGINEER: OPERATE, AZURE, CAPSTONE (batch CL3) ══════════════ */
  {
    moduleCode: 'CL_OPERATE',
    moduleName: 'Operating the Cloud, and Azure',
    displayOrder: 560,
    blurb: 'Running what you ship: observability and SRE, security and cost, Azure as the second cloud, and the Cloud & DevOps capstone.',
    topics: [
      t('CL_OBSERVABILITY_SRE', 'Observability and SRE', ['OBSERVABILITY', 'SLI_SLO', 'INCIDENT_MANAGEMENT', 'RELIABILITY_PATTERNS', 'CAPACITY_PLANNING'],
        ['Instrument services, monitor with CloudWatch, Prometheus and Grafana, set SLOs and error budgets, run incidents and design for failure.']),
      t('CL_SECURITY_COST', 'Cloud Security and Cost', ['IAM_FUNDAMENTALS', 'CLOUD_FUNDAMENTALS'],
        ['Review against Well-Architected, encrypt and manage secrets, turn on the AWS security services, and explain and cut the bill.']),
      t('CL_AZURE', 'Azure for AWS Engineers', ['CLOUD_FUNDAMENTALS', 'CLOUD_COMPUTE', 'CLOUD_NETWORKING'],
        ['Map Azure to AWS, grant access with Entra ID and RBAC, build networks, compute, storage and AKS, and monitor and govern with Terraform.']),
      t('CL_CAPSTONE', 'Capstone: A Production Platform', ['INFRA_AS_CODE', 'KUBERNETES', 'CI_CD', 'OBSERVABILITY', 'SLI_SLO'],
        ['Plan, build, operate, present and defend a production cloud platform with infrastructure as code, delivery, SLOs and a second-cloud recovery.']),
    ],
  },

  /* ══════════════ CLOUD & DEVOPS ENGINEER: PLACEMENT (batch CL4) ══════════════ */
  {
    moduleCode: 'CL_PLACE',
    moduleName: 'Cloud & DevOps Placement',
    displayOrder: 570,
    blurb: 'Year 4 teaches aptitude, coding, core CS, HR and mocks for everyone; this adds the cloud and DevOps interviews, scenario rounds and the cloud candidate.',
    topics: [
      t('CL_IV_CLOUD', 'Cloud Engineer Interview Questions', ['CLOUD_FUNDAMENTALS', 'CLOUD_NETWORKING', 'CLOUD_STORAGE', 'CLOUD_COMPUTE'],
        ['Answer AWS and Azure interview questions — core services, networking, storage and databases, and architecture — with the follow-up.']),
      t('CL_IV_DEVOPS', 'DevOps Engineer Interview Questions', ['LINUX_ADMIN', 'KUBERNETES', 'INFRA_AS_CODE', 'CI_CD', 'OBSERVABILITY'],
        ['Answer Linux, Docker and Kubernetes, Terraform, CI/CD and SRE interview questions with the follow-up.']),
      t('CL_SCENARIO_ROUNDS', 'Cloud Scenario Rounds', ['KUBERNETES', 'CLOUD_COMPUTE', 'INFRA_AS_CODE', 'INCIDENT_MANAGEMENT'],
        ['Handle live troubleshooting, design rounds, infrastructure take-homes and incident rounds with structure and evidence.']),
      t('CL_PLACE_CANDIDATE', 'The Cloud Candidate', ['PLACEMENT_READINESS', 'PORTFOLIO_EVIDENCE', 'INTERVIEW_PERFORMANCE'],
        ['Present a cloud resume and portfolio, plan AWS and Azure certifications, and get through a full cloud and DevOps interview loop.']),
    ],
  },
  /* ══════════════ DATA ENGINEER: MODELLING, INGESTION, SQL (batch DE1) ══════════════ */
  {
    moduleCode: 'DE_FOUNDATIONS',
    moduleName: 'Data Modelling, Ingestion and SQL for Engineers',
    displayOrder: 580,
    blurb: 'The years teach SQL and databases and the Data Analytics track teaches pandas; this is how an engineer models analytical data, ingests it reliably and writes SQL as a pipeline.',
    topics: [
      t('DE_DATA_MODELLING', 'Data Modelling', ['DATA_MODELLING'],
        ['Model analytical data: facts, dimensions and grain, slowly changing dimensions, and modern approaches such as medallion layers.']),
      t('DE_PYTHON_INGESTION', 'Python for Ingestion', ['ETL_FUNDAMENTALS', 'DATA_PIPELINES'],
        ['Ingest from files, APIs and databases incrementally, with idempotent loads and pipeline code that is configured, logged and tested.']),
      t('DE_SQL_ENGINEERING', 'SQL for Data Engineers', ['SQL_AGGREGATION', 'DATA_WAREHOUSING'],
        ['Write SQL as a pipeline, upsert with MERGE, partition and cluster large tables, and read query plans to fix slow SQL.']),
    ],
  },

  /* ══════════════ DATA ENGINEER: SPARK, LAKEHOUSE, DBT (batch DE2) ══════════════ */
  {
    moduleCode: 'DE_PROCESSING',
    moduleName: 'Spark, the Lakehouse and dbt',
    displayOrder: 590,
    blurb: 'Transforming data at scale: Apache Spark, cloud warehouses and lakehouses with open table formats, and ELT with dbt.',
    topics: [
      t('DE_SPARK', 'Apache Spark', ['BATCH_STREAM_PROCESSING', 'DATA_PIPELINES'],
        ['Transform data at scale with PySpark, understand partitions and shuffles, fix skew and tune jobs, and ship them to production.']),
      t('DE_WAREHOUSE_LAKEHOUSE', 'Warehouses and Lakehouses', ['DATA_WAREHOUSING'],
        ['Use cloud warehouses and lakes, open table formats such as Delta and Iceberg, medallion layers, and control cost.']),
      t('DE_DBT', 'dbt and ELT', ['ETL_FUNDAMENTALS', 'DATA_MODELLING'],
        ['Build tested, documented dbt projects with incremental models and snapshots, structured for a team and run in CI.']),
    ],
  },

  /* ══════════════ DATA ENGINEER: ORCHESTRATION, STREAMING, QUALITY, CLOUD, CAPSTONE (batch DE3) ══════════════ */
  {
    moduleCode: 'DE_OPERATE',
    moduleName: 'Orchestration, Streaming, Quality and the Cloud',
    displayOrder: 600,
    blurb: 'Running data in production: orchestrated and streaming pipelines, quality and governance, the AWS and Azure data stacks, and the Data Engineer capstone.',
    topics: [
      t('DE_ORCHESTRATION', 'Orchestration', ['DATA_PIPELINES'],
        ['Orchestrate pipelines with Airflow, with retries, backfills and data-aware schedules, and compare Prefect and Dagster.']),
      t('DE_STREAMING', 'Streaming', ['BATCH_STREAM_PROCESSING'],
        ['Design Kafka topics and consumers, get delivery guarantees right, process streams with windows and watermarks, and use managed services.']),
      t('DE_QUALITY_GOVERNANCE', 'Data Quality and Governance', ['DATA_QUALITY'],
        ['Check data automatically, monitor freshness and lineage, and govern access and personal data.']),
      t('DE_CLOUD_DATA', 'The Cloud Data Stack', ['DATA_WAREHOUSING', 'CLOUD_STORAGE'],
        ['Map a data platform onto AWS and Azure services, query the lake with Athena, and run data infrastructure as code.']),
      t('DE_CAPSTONE', 'Capstone: A Data Platform', ['DATA_PIPELINES', 'DATA_MODELLING', 'ETL_FUNDAMENTALS', 'BATCH_STREAM_PROCESSING'],
        ['Plan, build, run, present and defend a data platform with ingestion, a lakehouse, Spark and dbt, orchestration, a stream and quality checks.']),
    ],
  },

  /* ══════════════ DATA ENGINEER: PLACEMENT (batch DE4) ══════════════ */
  {
    moduleCode: 'DE_PLACE',
    moduleName: 'Data Engineering Placement',
    displayOrder: 610,
    blurb: 'Year 4 teaches aptitude, coding, SQL rounds, core CS, HR and mocks for everyone; this adds the data engineer interview, scenario rounds and the candidate.',
    topics: [
      t('DE_IV', 'Data Engineer Interview Questions', ['DATA_MODELLING', 'ETL_FUNDAMENTALS', 'BATCH_STREAM_PROCESSING', 'DATA_WAREHOUSING', 'DATA_PIPELINES'],
        ['Answer data modelling, pipeline, Spark, warehouse, orchestration and streaming interview questions with the follow-up.']),
      t('DE_SCENARIO_ROUNDS', 'Data Engineering Scenario Rounds', ['DATA_PIPELINES', 'BATCH_STREAM_PROCESSING', 'DATA_MODELLING'],
        ['Handle pipeline design, broken-pipeline, SQL-and-modelling take-home and Spark optimisation rounds with structure and evidence.']),
      t('DE_PLACE_CANDIDATE', 'The Data Engineering Candidate', ['PLACEMENT_READINESS', 'PORTFOLIO_EVIDENCE', 'INTERVIEW_PERFORMANCE'],
        ['Present a data-engineering resume and portfolio, plan certifications, and get through a full interview loop.']),
    ],
  },
];

/** Every skill the track content names — the seeder refuses to import if one is not in the taxonomy. */
export const trackReferencedSkillKeys = (): string[] =>
  [...new Set(TRACK_MODULES.flatMap(m => m.topics.flatMap(tp => tp.skillKeys || [])))];
