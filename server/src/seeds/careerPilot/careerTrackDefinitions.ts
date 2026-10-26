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

  /* ── Data Analytics + AI, batch A3: statistics, A/B tests and Power BI ── */
  { key: 'STATISTICS_ANALYTICS', title: 'Statistics and A/B Testing', kind: 'SKILL',
    description: 'Probability and statistics from Year 1, then statistics for business decisions, hypothesis tests and A/B testing.',
    topics: [['T_STATS', 'MUST'], ['DT_STATS_DECISIONS', 'MUST'], ['DT_AB_TESTING', 'MUST']] },
  { key: 'POWER_BI', title: 'Power BI', kind: 'SKILL',
    description: 'Power BI from Power Query and the star schema to DAX measures, interactive reports and published, secured dashboards.',
    topics: [['DT_PBI_MODEL', 'MUST'], ['DT_PBI_DAX', 'MUST'], ['DT_PBI_REPORTS', 'MUST']] },

  /* ── Data Analytics + AI, batch A4: metrics, AI for analysts and the capstone ── */
  { key: 'ANALYTICS_STORY', title: 'Business Metrics and Storytelling', kind: 'SKILL',
    description: 'The metrics a business runs on, finding why one moved, and telling the story so a manager acts on it.',
    topics: [['DT_METRICS_STORY', 'MUST']] },
  { key: 'AI_FOR_ANALYSTS', title: 'AI for Analysts', kind: 'SKILL',
    description: 'How generative AI works (Year 1), then AI used well in analysis: prompting for SQL, pandas and DAX, verifying it, Copilots, and LLM-powered text analysis.',
    topics: [['T_GENAI', 'MUST'], ['DT_AI_ANALYST', 'CORE'], ['T3_AI_ASSISTED', 'SHOULD']] },
  { key: 'CAPSTONE_DA_AI', title: 'Capstone: Data Analytics + AI', kind: 'SKILL',
    description: 'One end-to-end analysis that proves the track: SQL, pandas and statistics, a Power BI dashboard, and a measured AI-assisted insight, presented and defended.',
    topics: [['DT_CAPSTONE_DA', 'MUST']] },

  /* ── Data Analytics + AI, batch A5: Year-4 analyst placement ── */
  { key: 'PL_DA_SQL', title: 'Analyst SQL Rounds', kind: 'PLACEMENT',
    description: 'The SQL questions analyst interviews ask, written live and explained.',
    topics: [['DT_IV_SQL_DA', 'MUST'], ['JT_IV_SQL_MYSQL', 'SHOULD']] },
  { key: 'PL_DA_TOOLS', title: 'Excel, Power BI, Statistics and pandas Interviews', kind: 'PLACEMENT',
    description: 'Excel, Power BI and DAX, statistics and A/B testing, and pandas at interview depth.',
    topics: [['DT_IV_EXCEL_BI', 'MUST'], ['DT_IV_STATS_PYTHON', 'MUST']] },
  { key: 'PL_DA_CASES', title: 'Case Interviews', kind: 'PLACEMENT',
    description: 'Guesstimates, metric and product cases, and take-home assignments.',
    topics: [['DT_CASE_INTERVIEWS', 'MUST']] },
  { key: 'PL_DA_CANDIDATE', title: 'The Analyst Candidate', kind: 'PLACEMENT',
    description: 'An analyst resume and portfolio, the capstone defended, and a full analyst interview loop.',
    topics: [['T4_IV_METHOD', 'MUST'], ['T4_IV_PROJECT', 'MUST'], ['DT_PLACE_DA_FS', 'MUST']] },
  { key: 'PL_DA_CODING', title: 'Coding in Analyst Online Tests', kind: 'PLACEMENT',
    description: 'The Python coding question many analyst online tests include: the common patterns, solved in Python.',
    topics: [['T4_PL_DSA_PATTERNS', 'SHOULD'], ['JT_CODING_PYTHON', 'SHOULD']] },

  /* ── Data Science + AI, batch S1: machine learning foundations ── */
  { key: 'ML_FOUNDATIONS', title: 'Machine Learning Foundations', kind: 'SKILL',
    description: 'What machine learning is (Year 1), the maths it uses, and the workflow that keeps a model honest.',
    topics: [['T_ML_INTRO', 'MUST'], ['DS_MATH_ML', 'MUST'], ['DS_ML_WORKFLOW', 'MUST']] },
  { key: 'SUPERVISED_ML', title: 'Supervised Learning', kind: 'SKILL',
    description: 'Regression and classification with scikit-learn, measured and interpreted for the business.',
    topics: [['DS_REGRESSION', 'MUST'], ['DS_CLASSIFICATION', 'MUST']] },

  /* ── Data Science + AI, batch S2: applied machine learning ── */
  { key: 'APPLIED_ML', title: 'Applied Machine Learning', kind: 'SKILL',
    description: 'Ensembles, evaluation and interpretability, and feature engineering — what turns a model into one a business can trust.',
    topics: [['DS_FEATURE_ENG', 'MUST'], ['DS_ENSEMBLES', 'MUST'], ['DS_EVALUATION', 'MUST']] },
  { key: 'UNSUPERVISED_ML', title: 'Unsupervised Learning', kind: 'SKILL',
    description: 'Clustering, dimensionality reduction, customer segmentation and anomaly detection.',
    topics: [['DS_UNSUPERVISED', 'MUST']] },

  /* ── Data Science + AI, batch S3: forecasting, deep learning, NLP and GenAI ── */
  { key: 'FORECASTING', title: 'Time Series and Forecasting', kind: 'SKILL',
    description: 'Decomposition, baselines, exponential smoothing and ARIMA, ML forecasting with lag features, and honest backtests.',
    topics: [['DS_TIME_SERIES', 'MUST']] },
  { key: 'DEEP_LEARNING_DS', title: 'Deep Learning', kind: 'SKILL',
    description: 'Neural networks and backpropagation, PyTorch, training well, transfer learning for images, and sequence models.',
    topics: [['DS_DEEP_LEARNING', 'MUST']] },
  { key: 'NLP_GENAI_DS', title: 'NLP and Generative AI for Data Science', kind: 'SKILL',
    description: 'How generative AI works (Year 1), then text from TF-IDF to transformers and LLMs, embeddings, and evaluating LLM output and RAG.',
    topics: [['T_GENAI', 'MUST'], ['DS_NLP_GENAI', 'CORE']] },

  /* ── Data Science + AI, batch S4: deployment and the capstone ── */
  { key: 'ML_DEPLOYMENT', title: 'Model Deployment and MLOps Basics', kind: 'SKILL',
    description: 'Saving, serving with FastAPI, demoing with Streamlit, tracking with MLflow, packaging with Docker and monitoring for drift.',
    topics: [['DS_DEPLOYMENT', 'MUST']] },
  { key: 'CAPSTONE_DS_AI', title: 'Capstone: Data Science + AI', kind: 'SKILL',
    description: 'One end-to-end ML project that proves the track: a validated, interpreted model, deployed, with a measured GenAI feature, presented and defended.',
    topics: [['DS_CAPSTONE', 'MUST']] },

  /* ── Data Science + AI, batch S5: Year-4 data-science placement ── */
  { key: 'PL_DS_ML', title: 'ML and Probability Interviews', kind: 'PLACEMENT',
    description: 'Machine learning, deep learning and deployment at interview depth, and probability and statistics puzzles.',
    topics: [['DS_IV_ML', 'MUST'], ['DS_IV_PROBABILITY', 'MUST']] },
  { key: 'PL_DS_ANALYTICS_IV', title: 'SQL, Statistics and pandas Interviews', kind: 'PLACEMENT',
    description: 'The SQL rounds and the statistics, A/B and pandas questions data-science interviews share with analyst interviews.',
    topics: [['DT_IV_SQL_DA', 'MUST'], ['DT_IV_STATS_PYTHON', 'MUST']] },
  { key: 'PL_DS_CASES', title: 'ML Case and System-Design Interviews', kind: 'PLACEMENT',
    description: 'ML product cases end to end and the data-science take-home.',
    topics: [['DS_ML_CASE', 'MUST']] },
  { key: 'PL_DS_CODING', title: 'Coding Rounds for Data Scientists', kind: 'PLACEMENT',
    description: 'Algorithms, data manipulation and metrics in plain Python, plus the DSA patterns and Python rounds many online tests include.',
    topics: [['DS_CODING_ML', 'MUST'], ['T4_PL_DSA_PATTERNS', 'SHOULD'], ['JT_CODING_PYTHON', 'SHOULD']] },
  { key: 'PL_DS_CANDIDATE', title: 'The Data Science Candidate', kind: 'PLACEMENT',
    description: 'A data-science resume and portfolio, the capstone defended, and a full data-science interview loop.',
    topics: [['T4_IV_METHOD', 'MUST'], ['T4_IV_PROJECT', 'MUST'], ['DS_PLACE_FS', 'MUST']] },

  /* ── The AI tracks (AI Engineer, Generative AI, Agentic AI, MLOps, AI Security), setup: what they reuse ── */
  { key: 'AI_PY_BUILD', title: 'Building AI Applications in Python', kind: 'SKILL',
    description: 'How generative AI works (Year 1), building with LLMs — prompts, cost, embeddings, RAG and failure — then FastAPI and an AI service in Python.',
    topics: [['T_GENAI', 'MUST'], ['JT_AI_CONCEPTS', 'CORE'], ['JT_FASTAPI', 'MUST'], ['JT_AI_PY', 'CORE'], ['T3_AI_ASSISTED', 'SHOULD']] },
  { key: 'DEVOPS_FOR_ML', title: 'Linux, Containers and CI/CD', kind: 'SKILL',
    description: 'The Linux, Docker and CI/CD the years teach, and the cloud basics an ML platform runs on.',
    topics: [['T2_LINUX', 'MUST'], ['T3_CONTAINERS', 'MUST'], ['T3_CICD_MONITORING', 'MUST'], ['T3_CLOUD_INFRA', 'SHOULD'], ['T3_CLOUD_CONFIG', 'SHOULD']] },
  { key: 'SECURITY_FOR_AI', title: 'Security Foundations', kind: 'SKILL',
    description: 'The security the years teach — threats and threat modelling, web security and the OWASP Top 10, authentication and authorisation — before securing AI systems.',
    topics: [['T2_SECURITY', 'MUST'], ['T3_SEC_THREATS', 'MUST'], ['T3_THREAT_MODELING', 'MUST'], ['T3_WEB_SECURITY', 'MUST'], ['T3_AUTH', 'MUST'],
      ['T3_SEC_APPSEC', 'MUST'], ['T3_SECURE_CODING', 'SHOULD'], ['T3_SEC_TESTING', 'SHOULD']] },
  /* ── The AI tracks, batch AI1: the shared AI engineering core ── */
  { key: 'AI_CORE_ENGINEERING', title: 'The AI Engineering Core', kind: 'SKILL',
    description: 'How LLMs really behave, RAG on a real vector database, evaluation and guardrails, and running AI applications in production.',
    topics: [['AI_LLM_INTERNALS', 'MUST'], ['AI_RAG_DEEP', 'CORE'], ['AI_EVAL_SAFETY', 'CORE'], ['AI_PRODUCTION', 'MUST']] },
  /* ── The AI tracks, batch AI2: the Generative AI specialism and the AI Engineer / GenAI capstones ── */
  { key: 'FINE_TUNING', title: 'Fine-Tuning Open Models', kind: 'SKILL',
    description: 'When fine-tuning is worth it, datasets, LoRA and QLoRA, a training run, evaluating it honestly, and serving the result.',
    topics: [['AI_FINE_TUNING', 'MUST']] },
  { key: 'MULTIMODAL_AI', title: 'Multimodal AI', kind: 'SKILL',
    description: 'Vision-language models, document AI, speech in and out, image generation done responsibly, and multimodal RAG.',
    topics: [['AI_MULTIMODAL', 'MUST']] },
  { key: 'CAPSTONE_AI_ENG', title: 'Capstone: An AI Product, End to End', kind: 'SKILL',
    description: 'One AI product that proves the track: retrieval, generation and an agent action, evaluated, guarded and deployed.',
    topics: [['AI_CAPSTONE_ENG', 'MUST']] },
  { key: 'CAPSTONE_GENAI', title: 'Capstone: A Generative AI Product', kind: 'SKILL',
    description: 'One generative AI product that proves the track: prompting, RAG and a fine-tune, each earning its place, shipped.',
    topics: [['AI_CAPSTONE_GENAI', 'MUST']] },
  /* ── The AI tracks, batch AI3: the Agentic AI specialism and its capstone ── */
  { key: 'AGENTIC_SYSTEMS', title: 'Agentic AI Systems', kind: 'SKILL',
    description: 'Orchestration and multi-agent design, tools, MCP servers and memory, and evaluating, securing and running agents in production.',
    topics: [['AI_AGENT_ORCHESTRATION', 'CORE'], ['AI_AGENT_TOOLS_MEMORY', 'CORE'], ['AI_AGENT_EVAL_OPS', 'MUST']] },
  { key: 'CAPSTONE_AGENTIC', title: 'Capstone: An Agentic Product', kind: 'SKILL',
    description: 'One agent system that proves the track: orchestrated, tooled, remembering, evaluated, secured and deployed.',
    topics: [['AI_CAPSTONE_AGENTIC', 'MUST']] },
  /* ── The AI tracks, batch AI4: MLOps and its capstone ── */
  { key: 'MLOPS_PLATFORM', title: 'MLOps: Pipelines, Delivery and Monitoring', kind: 'SKILL',
    description: 'Versioned, validated and reproducible pipelines; CI/CD, Kubernetes and infrastructure as code for ML; monitoring, retraining and LLMOps.',
    topics: [['MLOPS_PIPELINES', 'CORE'], ['MLOPS_CICD_INFRA', 'CORE'], ['MLOPS_MONITORING', 'MUST']] },
  { key: 'CAPSTONE_MLOPS', title: 'Capstone: An ML Platform', kind: 'SKILL',
    description: 'One ML platform that proves the track: a reproducible pipeline, gated releases on Kubernetes, monitoring and retraining.',
    topics: [['AI_CAPSTONE_MLOPS', 'MUST']] },
];

/** Placement packs every AI track shares; each track adds its own specialist interviews as they land. */
const AI_PLACEMENT = ['PL_APTITUDE', 'PL_CODING_PYTHON', 'PL_AI_INTERVIEW', 'PL_CORE_CS', 'PL_PROJECT_DESIGN', 'PL_HR_PORTFOLIO', 'PL_MOCKS'];

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
    specializePacks: ['EXCEL', 'SQL_ANALYTICS', 'PYTHON_FOR_DATA', 'STATISTICS_ANALYTICS', 'POWER_BI', 'ANALYTICS_STORY', 'AI_FOR_ANALYSTS', 'CAPSTONE_DA_AI'],
    placementPacks: ['PL_APTITUDE', 'PL_DA_SQL', 'PL_DA_TOOLS', 'PL_DA_CASES', 'PL_AI_INTERVIEW', 'PL_DA_CODING', 'PL_DA_CANDIDATE', 'PL_HR_PORTFOLIO', 'PL_MOCKS'] },
  { key: 'DATA_SCIENCE_AI', name: 'Data Science + AI', language: 'Python', order: 50,
    description: 'SQL, pandas and statistics; machine learning with scikit-learn from regression to ensembles and clustering; deep learning, NLP and GenAI; deploying a model; and a capstone you can defend.',
    /* Batches: S1 ML foundations, regression and classification (SQL, pandas and statistics are Data Analytics' packs); later ML, deep learning, deployment and placement packs are appended as they land. */
    specializePacks: ['SQL_ANALYTICS', 'PYTHON_FOR_DATA', 'STATISTICS_ANALYTICS', 'ML_FOUNDATIONS', 'SUPERVISED_ML', 'APPLIED_ML', 'UNSUPERVISED_ML', 'FORECASTING', 'DEEP_LEARNING_DS', 'NLP_GENAI_DS', 'ML_DEPLOYMENT', 'CAPSTONE_DS_AI'],
    placementPacks: ['PL_APTITUDE', 'PL_DS_ML', 'PL_DS_ANALYTICS_IV', 'PL_DS_CASES', 'PL_DS_CODING', 'PL_AI_INTERVIEW', 'PL_DS_CANDIDATE', 'PL_HR_PORTFOLIO', 'PL_MOCKS'] },

  /* The AI tracks — Python, one shared AI core, a specialism each. Setup holds what they reuse; the shared
     core (AI1), each specialism (AI2–AI5), placement (AI6) and the bank (AI7) are appended as they land. */
  { key: 'AI_ENGINEERING', name: 'AI Engineer', language: 'Python', order: 60,
    description: 'Python and DSA; machine learning foundations; building with LLMs — RAG, vector databases, evaluation and guardrails; agents; and shipping an AI application to production.',
    specializePacks: ['CORE_PYTHON', 'DSA_PYTHON', 'GIT_TOOLS', 'ML_FOUNDATIONS', 'AI_PY_BUILD', 'AI_CORE_ENGINEERING', 'AGENTIC_AI_PY', 'ML_DEPLOYMENT', 'CAPSTONE_AI_ENG'],
    placementPacks: AI_PLACEMENT },
  { key: 'GENAI_ENGINEERING', name: 'Generative AI Engineer', language: 'Python', order: 70,
    description: 'Python; how LLMs and transformers work; prompting, RAG and evaluation in depth; fine-tuning open models; multimodal AI; and a production GenAI application.',
    specializePacks: ['CORE_PYTHON', 'DSA_PYTHON', 'GIT_TOOLS', 'AI_PY_BUILD', 'AI_CORE_ENGINEERING', 'NLP_GENAI_DS', 'FINE_TUNING', 'MULTIMODAL_AI', 'AGENTIC_AI_PY', 'CAPSTONE_GENAI'],
    placementPacks: AI_PLACEMENT },
  { key: 'AGENTIC_AI', name: 'Agentic AI Engineer', language: 'Python', order: 80,
    description: 'Python; building with LLMs; tools and function calling; agents with LangGraph; memory, MCP and multi-agent orchestration; evaluating agents and running them safely in production.',
    specializePacks: ['CORE_PYTHON', 'DSA_PYTHON', 'GIT_TOOLS', 'AI_PY_BUILD', 'AI_CORE_ENGINEERING', 'AGENTIC_AI_PY', 'AGENTIC_SYSTEMS', 'CAPSTONE_AGENTIC'],
    placementPacks: AI_PLACEMENT },
  { key: 'MLOPS', name: 'MLOps Engineer', language: 'Python', order: 90,
    description: 'Python; machine learning foundations; Linux, Docker and CI/CD; ML pipelines, versioning and experiment tracking; deploying and monitoring models and LLM applications.',
    specializePacks: ['CORE_PYTHON', 'GIT_TOOLS', 'ML_FOUNDATIONS', 'SUPERVISED_ML', 'DEVOPS_FOR_ML', 'ML_DEPLOYMENT', 'MLOPS_PLATFORM', 'CAPSTONE_MLOPS'],
    placementPacks: AI_PLACEMENT },
  { key: 'AI_SECURITY', name: 'AI Security Engineer', language: 'Python', order: 100,
    description: 'Python; security foundations, threat modelling and the OWASP Top 10; building with LLMs and agents; the OWASP LLM Top 10, prompt injection, red teaming and guardrail engineering.',
    specializePacks: ['CORE_PYTHON', 'GIT_TOOLS', 'SECURITY_FOR_AI', 'AI_PY_BUILD', 'AI_CORE_ENGINEERING', 'AGENTIC_AI_PY'],
    placementPacks: AI_PLACEMENT },
];
