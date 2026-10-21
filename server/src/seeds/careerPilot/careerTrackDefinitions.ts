import { TrackPriority, PackKind } from '../../data/careerTrackPolicy';

/**
 * The career tracks and skill packs CareerPilot ships, as authored — the starting point an admin
 * then edits on the Career Tracks screen. Imported with seedCareerTracks.ts.
 *
 * A pack names topics from ANY year: Year 1's HTML, CSS, DOM and Git; Year 3's async JavaScript
 * and component design; and the `track` pool's Bootstrap, JavaScript, ES6+ and React. Nothing is
 * copied — the lessons are where they were written.
 */

export interface PackDefinition { key: string; title: string; kind: PackKind; description: string; topics: [string, TrackPriority][] }
export interface TrackDefinition {
  key: string; name: string; language: string; description: string; order: number;
  specializePacks: string[]; placementPacks: string[];
}

export const PACKS: PackDefinition[] = [
  /* ── Java Full Stack + AI, batch 1: the frontend half ── */
  { key: 'WEB_HTML', title: 'HTML', kind: 'SKILL',
    description: 'Structure, semantics, forms and accessibility — the page every framework renders.',
    topics: [['T_HTML', 'MUST'], ['T_FORMS', 'MUST'], ['T_ACCESSIBILITY', 'SHOULD']] },
  { key: 'CSS_BOOTSTRAP', title: 'CSS and Bootstrap', kind: 'SKILL',
    description: 'Layout, the box model, Flexbox and Grid, responsive design, then Bootstrap 5.',
    topics: [['T_CSS', 'MUST'], ['JT_BOOTSTRAP', 'MUST']] },
  { key: 'JAVASCRIPT', title: 'JavaScript', kind: 'SKILL',
    description: 'The language, the DOM, modern ES6+, the web\'s requests and responses, and async code.',
    topics: [['JT_JS_CORE', 'MUST'], ['T_JS_DOM', 'MUST'], ['JT_JS_ES6', 'MUST'], ['T_HTTP', 'SHOULD'], ['T3_FRONTEND_ADV_JS', 'MUST']] },
  { key: 'REACT', title: 'React', kind: 'SKILL',
    description: 'Components to a deployed multi-page app: hooks, routing, APIs, Redux Toolkit and Vite.',
    topics: [['JT_REACT_BASICS', 'MUST'], ['JT_REACT_HOOKS', 'MUST'], ['T3_FRONTEND_COMPONENTS', 'SHOULD'], ['JT_REACT_ROUTING', 'MUST'],
      ['JT_REACT_STATE', 'SHOULD'], ['T3_FRONTEND_STATE', 'OPTIONAL'], ['JT_REACT_BUILD', 'MUST']] },
  { key: 'GIT_TOOLS', title: 'Git and Developer Tools', kind: 'SKILL',
    description: 'Version control with Git and GitHub, and an editor set up to work in.',
    topics: [['T_GIT', 'MUST'], ['T_EDITOR', 'SHOULD']] },

  /* ── Java Full Stack + AI, batch 2: Java and DSA in Java ── */
  { key: 'CORE_JAVA', title: 'Core Java', kind: 'SKILL',
    description: 'Java from the first program: fundamentals, OOP, exceptions, collections, lambdas and streams, concurrency and the JVM.',
    topics: [['JT_JAVA_START', 'MUST'], ['JT_JAVA_BASICS', 'MUST'], ['JT_JAVA_OOP', 'MUST'], ['JT_JAVA_EXCEPTIONS', 'MUST'],
      ['JT_JAVA_COLLECTIONS', 'MUST'], ['JT_JAVA_MODERN', 'MUST'], ['JT_JAVA_CONCURRENCY', 'SHOULD']] },
  { key: 'DSA_JAVA', title: 'DSA in Java', kind: 'SKILL',
    description: 'The data structures and algorithms interviews ask, solved in Java.',
    topics: [['JT_JAVA_DSA_LINEAR', 'MUST'], ['JT_JAVA_DSA_NONLINEAR', 'MUST']] },

  /* ── Java Full Stack + AI, batch 3: MySQL, persistence and Spring core ── */
  { key: 'MYSQL', title: 'MySQL', kind: 'SKILL',
    description: 'SQL from the first SELECT to joins, design, transactions and indexes — and MySQL itself.',
    topics: [['T_SQL', 'MUST'], ['T2_DB_QUERY', 'MUST'], ['T2_DB_DESIGN', 'MUST'], ['JT_MYSQL', 'MUST'],
      ['T3_TRANSACTIONS_INTEGRITY', 'SHOULD'], ['T3_QUERY_PERF', 'SHOULD']] },
  { key: 'JAVA_PERSISTENCE', title: 'JDBC and Hibernate/JPA', kind: 'SKILL',
    description: 'Java talking to MySQL: JDBC first, then Hibernate and JPA.',
    topics: [['JT_JDBC', 'MUST'], ['JT_JPA', 'MUST']] },
  { key: 'SPRING_CORE', title: 'Spring Core', kind: 'SKILL',
    description: 'Inversion of control, dependency injection, beans, configuration and AOP — what Spring Boot is built on.',
    topics: [['JT_SPRING_CORE', 'MUST']] },

  /* ── Java Full Stack + AI, batch 4: Spring Boot and the full stack ── */
  { key: 'SPRING_BOOT', title: 'Spring Boot', kind: 'SKILL',
    description: 'A REST API on Spring Boot: controllers, validation, errors, Spring Data JPA, security with JWT, and tests.',
    topics: [['JT_BOOT_REST', 'MUST'], ['JT_BOOT_DATA', 'MUST'], ['JT_BOOT_SECURITY', 'MUST'], ['JT_BOOT_TESTING', 'MUST']] },
  { key: 'FULLSTACK_DEPLOY', title: 'Full-Stack Integration and Deployment', kind: 'SKILL',
    description: 'React talking to Spring Boot — CORS, a JWT login flow, uploads and errors — then Docker and a deployed stack.',
    topics: [['JT_FULLSTACK', 'MUST']] },

  /* ── Java Full Stack + AI, batch 5: generative AI, agentic AI and the capstone ── */
  { key: 'GENAI_JAVA', title: 'Generative AI for Java Developers', kind: 'SKILL',
    description: 'How models work, prompting and RAG — then Spring AI in your own Spring Boot and React app.',
    topics: [['T_GENAI', 'MUST'], ['JT_AI_CONCEPTS', 'CORE'], ['JT_AI_SPRING', 'CORE'], ['T3_AI_ASSISTED', 'SHOULD']] },
  { key: 'AGENTIC_AI_JAVA', title: 'Agentic AI', kind: 'SKILL',
    description: 'Agents, tools, memory and MCP — when to build one, and building one in Java with guardrails.',
    topics: [['JT_AI_AGENTS', 'CORE'], ['JT_AI_AGENTS_JAVA', 'CORE']] },
  { key: 'CAPSTONE_JAVA_AI', title: 'Capstone: Full Stack + AI', kind: 'SKILL',
    description: 'One application that proves the track: React, Spring Boot and MySQL, deployed, with an AI assistant and an agent.',
    topics: [['JT_CAPSTONE', 'MUST']] },

  /* ── Year-4 placement packs. The Java-specific ones are new; the rest are Year 4's own, for every track. ── */
  { key: 'PL_APTITUDE', title: 'Aptitude', kind: 'PLACEMENT',
    description: 'Quantitative, reasoning, data interpretation and verbal — the first round of most campus drives.',
    topics: [['T4_AP_QUANT', 'MUST'], ['T4_AP_REASONING', 'MUST'], ['T4_AP_VERBAL', 'MUST'], ['T4_AP_DI', 'SHOULD']] },
  { key: 'PL_CODING_JAVA', title: 'Coding Rounds in Java', kind: 'PLACEMENT',
    description: 'The coding-round patterns, then timed problems solved in Java.',
    topics: [['T4_PL_DSA_PATTERNS', 'MUST'], ['T4_PL_DSA_STRUCTURES', 'MUST'], ['T4_PL_COMPLEXITY', 'MUST'], ['JT_CODING_JAVA', 'MUST'],
      ['T4_PL_DSA_ADVANCED', 'SHOULD'], ['T4_PL_CODING_SETS', 'SHOULD']] },
  { key: 'PL_JAVA_INTERVIEW', title: 'Java, Spring and Hibernate Interviews', kind: 'PLACEMENT',
    description: 'Core Java and Spring/Hibernate at interview depth, and the Java and Spring sections of online tests.',
    topics: [['JT_IV_CORE_JAVA', 'MUST'], ['JT_IV_SPRING', 'MUST'], ['JT_MCQ_JAVA_SPRING', 'MUST']] },
  { key: 'PL_WEB_INTERVIEW', title: 'Web and SQL Interviews', kind: 'PLACEMENT',
    description: 'HTML, CSS, JavaScript, React and SQL at interview depth — for every full-stack track.',
    topics: [['JT_IV_FRONTEND', 'MUST'], ['JT_IV_SQL_MYSQL', 'MUST']] },
  { key: 'PL_AI_INTERVIEW', title: 'AI Engineering Interviews', kind: 'PLACEMENT',
    description: 'LLM features, RAG and agents at interview depth — for every "+ AI" track.',
    topics: [['JT_IV_AI', 'SHOULD']] },
  { key: 'PL_CORE_CS', title: 'Core CS and Technical Rounds', kind: 'PLACEMENT',
    description: 'How a technical interview runs, and OS, networks, DBMS, Git and testing as interviews and MCQs ask them.',
    topics: [['T4_IV_METHOD', 'MUST'], ['T4_MCQ_CORE_CS', 'MUST'], ['T4_IV_CORE_CS', 'SHOULD'], ['T4_MCQ_ENGINEERING', 'SHOULD'], ['T4_IV_DSA', 'SHOULD']] },
  { key: 'PL_PROJECT_DESIGN', title: 'Project Defence and System Design', kind: 'PLACEMENT',
    description: 'Defending your own project, and the system-design round.',
    topics: [['T4_IV_PROJECT', 'MUST'], ['T4_SD_FUNDAMENTALS', 'SHOULD'], ['T4_SD_INTERVIEW', 'SHOULD']] },
  { key: 'PL_JAVA_FS_CANDIDATE', title: 'The Java Full-Stack Candidate', kind: 'PLACEMENT',
    description: 'A Java full-stack resume and GitHub, the capstone defended, and a full Java interview loop.',
    topics: [['JT_PLACE_JAVA_FS', 'MUST']] },
  { key: 'PL_HR_PORTFOLIO', title: 'HR, Communication and Applications', kind: 'PLACEMENT',
    description: 'Structured answers, the HR questions, presenting work, the resume and portfolio, and applying.',
    topics: [['T4_HR_STAR', 'MUST'], ['T4_HR_QUESTIONS', 'MUST'], ['T4_RESUME', 'MUST'], ['T4_PORTFOLIO', 'MUST'],
      ['T4_COMM_PRESENT', 'SHOULD'], ['T4_APPLICATIONS', 'SHOULD'], ['T4_COMM_WRITTEN', 'OPTIONAL']] },
  { key: 'PL_MOCKS', title: 'Mocks and the Six-Round Simulation', kind: 'PLACEMENT',
    description: 'Technical, project and HR mocks, then the full six-round simulation and its debrief.',
    topics: [['T4_MOCK_TECHNICAL', 'MUST'], ['T4_MOCK_SPECIALIZATION', 'MUST'], ['T4_MOCK_HR', 'MUST'], ['T4_SIM_ROUNDS', 'MUST'],
      ['T4_SIM_DEBRIEF', 'MUST'], ['T4_VERIFY_GAPS', 'SHOULD']] },

  /* ── Python Full Stack + AI, batch P1: Python (the years' Python reused, the gaps added) and DSA in Python ── */
  { key: 'CORE_PYTHON', title: 'Core Python', kind: 'SKILL',
    description: 'Python from the first variable — the years’ lessons — to OOP, modules, files and errors, then modern Python and pytest.',
    topics: [['T_VARIABLES', 'MUST'], ['T_CONDITIONS', 'MUST'], ['T_LOOPS', 'MUST'], ['T_FUNCTIONS', 'MUST'], ['T_ARRAYS', 'MUST'],
      ['T2_OOP_OBJECTS', 'MUST'], ['T2_OOP_PRINCIPLES', 'MUST'], ['T2_PY_STRUCTURE', 'MUST'], ['T2_PY_ROBUST', 'MUST'],
      ['JT_PY_MODERN', 'MUST'], ['JT_PY_TESTING', 'MUST'], ['T3_ADV_OOP', 'SHOULD']] },
  { key: 'DSA_PYTHON', title: 'DSA in Python', kind: 'SKILL',
    description: 'The data structures and algorithms interviews ask, in Python — the years’ lessons, in order.',
    topics: [['T2_DS_LINEAR', 'MUST'], ['T2_DS_KEYED', 'MUST'], ['T2_ALGORITHMS', 'MUST'], ['T2_DSA_INTERVIEW', 'MUST'],
      ['T3_TREES_BST', 'MUST'], ['T3_GRAPHS', 'MUST'], ['T3_GREEDY_DP', 'MUST'], ['T3_HEAPS', 'SHOULD']] },
  { key: 'PYTHON_DATA', title: 'Python and MySQL', kind: 'SKILL',
    description: 'Python reaching MySQL directly — before the Django ORM does it for you.',
    topics: [['JT_PY_MYSQL', 'MUST']] },
  /* ── Python Full Stack + AI, batch P2: Django and Django REST Framework ── */
  { key: 'DJANGO', title: 'Django and Django REST Framework', kind: 'SKILL',
    description: 'A REST API on Django and DRF over MySQL: the ORM, serializers and viewsets, JWT and permissions, and tests.',
    topics: [['JT_DJANGO_CORE', 'MUST'], ['JT_DJANGO_ORM', 'MUST'], ['JT_DRF', 'MUST'], ['JT_DJANGO_AUTH', 'MUST'], ['JT_DJANGO_TESTING', 'MUST']] },
  /* ── Python Full Stack + AI, batch P3: the stack together, FastAPI and AI in Python, the capstone ── */
  { key: 'FULLSTACK_DEPLOY_PY', title: 'React and Django: Integration and Deployment', kind: 'SKILL',
    description: 'React talking to Django — CORS, a JWT login flow, uploads and errors — then Docker and a deployed stack.',
    topics: [['JT_FULLSTACK_PY', 'MUST']] },
  { key: 'GENAI_PY', title: 'Generative AI for Python Developers', kind: 'SKILL',
    description: 'How models work, prompting and RAG — then a FastAPI AI service in your own Django and React app.',
    topics: [['T_GENAI', 'MUST'], ['JT_AI_CONCEPTS', 'CORE'], ['JT_FASTAPI', 'MUST'], ['JT_AI_PY', 'CORE'], ['T3_AI_ASSISTED', 'SHOULD']] },
  { key: 'AGENTIC_AI_PY', title: 'Agentic AI in Python', kind: 'SKILL',
    description: 'Agents, tools, memory and MCP — when to build one, and building one in Python with guardrails.',
    topics: [['JT_AI_AGENTS', 'CORE'], ['JT_AI_AGENTS_PY', 'CORE']] },
  { key: 'CAPSTONE_PY_AI', title: 'Capstone: Python Full Stack + AI', kind: 'SKILL',
    description: 'One application that proves the track: React, Django and MySQL with a FastAPI AI service, deployed, with an assistant and an agent.',
    topics: [['JT_CAPSTONE_PY', 'MUST']] },
  /* ── Python Full Stack + AI, batch P4: Year-4 placement (the rest is the shared placement packs) ── */
  { key: 'PL_CODING_PYTHON', title: 'Coding Rounds in Python', kind: 'PLACEMENT',
    description: 'The coding-round patterns, then timed problems solved in Python.',
    topics: [['T4_PL_DSA_PATTERNS', 'MUST'], ['T4_PL_DSA_STRUCTURES', 'MUST'], ['T4_PL_COMPLEXITY', 'MUST'], ['JT_CODING_PYTHON', 'MUST'],
      ['T4_PL_DSA_ADVANCED', 'SHOULD'], ['T4_PL_CODING_SETS', 'SHOULD']] },
  { key: 'PL_PYTHON_INTERVIEW', title: 'Python, Django and FastAPI Interviews', kind: 'PLACEMENT',
    description: 'Python, Django, DRF and FastAPI at interview depth, and the Python and Django sections of online tests.',
    topics: [['JT_IV_PYTHON', 'MUST'], ['JT_IV_DJANGO', 'MUST'], ['JT_MCQ_PYTHON_DJANGO', 'MUST']] },
  { key: 'PL_PY_FS_CANDIDATE', title: 'The Python Full-Stack Candidate', kind: 'PLACEMENT',
    description: 'A Python full-stack resume and GitHub, the capstone defended, and a full Python interview loop.',
    topics: [['JT_PLACE_PY_FS', 'MUST']] },

  /* ── .NET Full Stack + AI, batch N1: C# and DSA in C# ── */
  { key: 'CORE_CSHARP', title: 'Core C#', kind: 'SKILL',
    description: 'C# from the first program: fundamentals, OOP, exceptions, collections and generics, LINQ and modern C#, and async.',
    topics: [['JT_CS_START', 'MUST'], ['JT_CS_BASICS', 'MUST'], ['JT_CS_OOP', 'MUST'], ['JT_CS_EXCEPTIONS', 'MUST'],
      ['JT_CS_COLLECTIONS', 'MUST'], ['JT_CS_LINQ', 'MUST'], ['JT_CS_ASYNC', 'MUST']] },
  { key: 'DSA_CSHARP', title: 'DSA in C#', kind: 'SKILL',
    description: 'The data structures and algorithms interviews ask, solved in C#.',
    topics: [['JT_CS_DSA_LINEAR', 'MUST'], ['JT_CS_DSA_NONLINEAR', 'MUST']] },

  /* ── .NET Full Stack + AI, batch N2: SQL Server, data access and the container ── */
  { key: 'SQL_SERVER', title: 'SQL Server', kind: 'SKILL',
    description: 'SQL from the first SELECT to joins, design, transactions and indexes — and SQL Server and T-SQL themselves.',
    topics: [['T_SQL', 'MUST'], ['T2_DB_QUERY', 'MUST'], ['T2_DB_DESIGN', 'MUST'], ['JT_SQLSERVER', 'MUST'],
      ['T3_TRANSACTIONS_INTEGRITY', 'SHOULD'], ['T3_QUERY_PERF', 'SHOULD']] },
  { key: 'DOTNET_DATA_ACCESS', title: 'ADO.NET and Entity Framework Core', kind: 'SKILL',
    description: 'C# reaching SQL Server directly with ADO.NET and Dapper, then through Entity Framework Core.',
    topics: [['JT_ADONET', 'MUST'], ['JT_EFCORE', 'MUST']] },
  { key: 'DOTNET_DI', title: 'Dependency Injection and Configuration', kind: 'SKILL',
    description: 'The .NET service container, lifetimes, configuration and the options pattern, and logging.',
    topics: [['JT_DOTNET_DI', 'MUST']] },

  /* ── .NET Full Stack + AI, batch N3: ASP.NET Core and the full stack ── */
  { key: 'ASPNET_CORE', title: 'ASP.NET Core Web API', kind: 'SKILL',
    description: 'A REST API on ASP.NET Core: controllers and minimal APIs, validation, errors, EF Core, security with JWT, and tests.',
    topics: [['JT_ASPNET_API', 'MUST'], ['JT_ASPNET_DATA', 'MUST'], ['JT_ASPNET_SECURITY', 'MUST'], ['JT_ASPNET_TESTING', 'MUST']] },
  { key: 'FULLSTACK_DEPLOY_DOTNET', title: 'React and ASP.NET Core: Integration and Deployment', kind: 'SKILL',
    description: 'React talking to ASP.NET Core — CORS, a JWT login flow, uploads and errors — then Docker and a deployed stack.',
    topics: [['JT_FULLSTACK_DOTNET', 'MUST']] },

  /* ── .NET Full Stack + AI, batch N4: AI and the capstone ── */
  { key: 'GENAI_DOTNET', title: 'Generative AI for .NET Developers', kind: 'SKILL',
    description: 'How models work, prompting and RAG — then LLM features in your own ASP.NET Core and React app with the OpenAI .NET SDK and Semantic Kernel.',
    topics: [['T_GENAI', 'MUST'], ['JT_AI_CONCEPTS', 'CORE'], ['JT_AI_DOTNET', 'CORE'], ['T3_AI_ASSISTED', 'SHOULD']] },
  { key: 'AGENTIC_AI_DOTNET', title: 'Agentic AI in .NET', kind: 'SKILL',
    description: 'Agents, tools, memory and MCP — when to build one, and building one in C# with Semantic Kernel and guardrails.',
    topics: [['JT_AI_AGENTS', 'CORE'], ['JT_AI_AGENTS_DOTNET', 'CORE']] },
  { key: 'CAPSTONE_DOTNET_AI', title: 'Capstone: .NET Full Stack + AI', kind: 'SKILL',
    description: 'One application that proves the track: React, ASP.NET Core and SQL Server with AI built in, deployed, with an assistant and an agent.',
    topics: [['JT_CAPSTONE_DOTNET', 'MUST']] },

  /* ── .NET Full Stack + AI, batch N5: Year-4 placement (the rest is the shared placement packs) ── */
  { key: 'PL_CODING_CSHARP', title: 'Coding Rounds in C#', kind: 'PLACEMENT',
    description: 'The coding-round patterns, then timed problems solved in C#.',
    topics: [['T4_PL_DSA_PATTERNS', 'MUST'], ['T4_PL_DSA_STRUCTURES', 'MUST'], ['T4_PL_COMPLEXITY', 'MUST'], ['JT_CODING_CSHARP', 'MUST'],
      ['T4_PL_DSA_ADVANCED', 'SHOULD'], ['T4_PL_CODING_SETS', 'SHOULD']] },
  { key: 'PL_DOTNET_INTERVIEW', title: 'C#, ASP.NET Core and EF Core Interviews', kind: 'PLACEMENT',
    description: 'C#, ASP.NET Core, EF Core and SQL Server at interview depth, and the C# and .NET sections of online tests.',
    topics: [['JT_IV_CSHARP', 'MUST'], ['JT_IV_ASPNET', 'MUST'], ['JT_MCQ_CSHARP_DOTNET', 'MUST']] },
  { key: 'PL_DOTNET_FS_CANDIDATE', title: 'The .NET Full-Stack Candidate', kind: 'PLACEMENT',
    description: 'A .NET full-stack resume and GitHub, the capstone defended, and a full .NET interview loop.',
    topics: [['JT_PLACE_DOTNET_FS', 'MUST']] },

  /* ── Data Analytics + AI, batch A1: Excel and SQL for analysts ── */
  { key: 'EXCEL', title: 'Excel for Analysts', kind: 'SKILL',
    description: 'Excel from formulas, lookups and cleaning to pivot tables, honest charts, scenarios and a dashboard.',
    topics: [['DT_EXCEL_CORE', 'MUST'], ['DT_EXCEL_ANALYSIS', 'MUST']] },
  { key: 'SQL_ANALYTICS', title: 'SQL for Analysts', kind: 'SKILL',
    description: 'SQL from the first SELECT — the years’ lessons — to the queries analysts are hired for: aggregation, joins, CTEs, window functions, cohorts and funnels.',
    topics: [['T_SQL', 'MUST'], ['T2_DB_QUERY', 'MUST'], ['T2_DB_DESIGN', 'SHOULD'], ['DT_SQL_ANALYST', 'MUST'], ['DT_SQL_WINDOWS', 'MUST']] },

  /* ── Data Analytics + AI, batch A2: Python for data ── */
  { key: 'PYTHON_FOR_DATA', title: 'Python for Data', kind: 'SKILL',
    description: 'Python from the first variable — the years’ lessons — to pandas, cleaning data you can trust, and exploratory analysis with honest charts.',
    topics: [['T_VARIABLES', 'MUST'], ['T_CONDITIONS', 'MUST'], ['T_LOOPS', 'MUST'], ['T_FUNCTIONS', 'MUST'], ['T_ARRAYS', 'MUST'],
      ['T2_PY_ROBUST', 'SHOULD'], ['DT_PANDAS', 'MUST'], ['DT_DATA_CLEANING', 'MUST'], ['DT_EDA_VIZ', 'MUST']] },
];

export const TRACKS: TrackDefinition[] = [
  { key: 'JAVA_FULLSTACK_AI', name: 'Java Full Stack + AI', language: 'Java', order: 10,
    description: 'HTML, CSS, Bootstrap, JavaScript and React; Core Java, MySQL, Spring Boot; then generative and agentic AI built into your own app.',
    /* Batches: 1 frontend, 2 Java and DSA, 3 MySQL/persistence/Spring core, 4 Spring Boot and the full stack, 5 AI and the capstone; Spring Boot and AI packs are appended as they land. */
    specializePacks: ['WEB_HTML', 'CSS_BOOTSTRAP', 'JAVASCRIPT', 'REACT', 'GIT_TOOLS', 'CORE_JAVA', 'DSA_JAVA', 'MYSQL', 'JAVA_PERSISTENCE', 'SPRING_CORE', 'SPRING_BOOT', 'FULLSTACK_DEPLOY', 'GENAI_JAVA', 'AGENTIC_AI_JAVA', 'CAPSTONE_JAVA_AI'],
    placementPacks: ['PL_APTITUDE', 'PL_CODING_JAVA', 'PL_JAVA_INTERVIEW', 'PL_WEB_INTERVIEW', 'PL_AI_INTERVIEW', 'PL_CORE_CS',
      'PL_PROJECT_DESIGN', 'PL_JAVA_FS_CANDIDATE', 'PL_HR_PORTFOLIO', 'PL_MOCKS'] },
  { key: 'PY_FULLSTACK_AI', name: 'Python Full Stack + AI', language: 'Python', order: 20,
    description: 'HTML, CSS, Bootstrap, JavaScript and React; Python, Django and Django REST Framework on MySQL; FastAPI and AI in Python built into your own app.',
    /* Batches: P1 Python and DSA in Python (frontend packs shared with Java Full Stack), P2 Django, P3 the stack, AI and the capstone, P4 placement. */
    specializePacks: ['WEB_HTML', 'CSS_BOOTSTRAP', 'JAVASCRIPT', 'REACT', 'GIT_TOOLS', 'CORE_PYTHON', 'DSA_PYTHON', 'MYSQL', 'PYTHON_DATA', 'DJANGO',
      'FULLSTACK_DEPLOY_PY', 'GENAI_PY', 'AGENTIC_AI_PY', 'CAPSTONE_PY_AI'],
    placementPacks: ['PL_APTITUDE', 'PL_CODING_PYTHON', 'PL_PYTHON_INTERVIEW', 'PL_WEB_INTERVIEW', 'PL_AI_INTERVIEW', 'PL_CORE_CS',
      'PL_PROJECT_DESIGN', 'PL_PY_FS_CANDIDATE', 'PL_HR_PORTFOLIO', 'PL_MOCKS'] },
  { key: 'DOTNET_FULLSTACK_AI', name: '.NET Full Stack + AI', language: 'C#', order: 30,
    description: 'HTML, CSS, Bootstrap, JavaScript and React; C#, ASP.NET Core Web API and Entity Framework Core on SQL Server; then AI with the OpenAI .NET SDK and Semantic Kernel built into your own app.',
    /* Batches: N1 C# and DSA in C# (frontend packs shared with the other full-stack tracks); SQL Server, ASP.NET Core, AI and placement packs are appended as they land. */
    specializePacks: ['WEB_HTML', 'CSS_BOOTSTRAP', 'JAVASCRIPT', 'REACT', 'GIT_TOOLS', 'CORE_CSHARP', 'DSA_CSHARP', 'SQL_SERVER', 'DOTNET_DATA_ACCESS', 'DOTNET_DI', 'ASPNET_CORE', 'FULLSTACK_DEPLOY_DOTNET', 'GENAI_DOTNET', 'AGENTIC_AI_DOTNET', 'CAPSTONE_DOTNET_AI'],
    placementPacks: ['PL_APTITUDE', 'PL_CODING_CSHARP', 'PL_DOTNET_INTERVIEW', 'PL_WEB_INTERVIEW', 'PL_AI_INTERVIEW', 'PL_CORE_CS',
      'PL_PROJECT_DESIGN', 'PL_DOTNET_FS_CANDIDATE', 'PL_HR_PORTFOLIO', 'PL_MOCKS'] },
  { key: 'DATA_ANALYTICS_AI', name: 'Data Analytics + AI', language: 'SQL, Python and Power BI', order: 40,
    description: 'Excel, SQL and Python with pandas; statistics and A/B tests; Power BI dashboards; business metrics and storytelling; and AI used well in every step of the analysis.',
    /* Batches: A1 Excel and SQL; Python for data, statistics, Power BI, AI for analysts and placement are appended as they land. */
    specializePacks: ['EXCEL', 'SQL_ANALYTICS', 'PYTHON_FOR_DATA'],
    placementPacks: [] },
];
