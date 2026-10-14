import { TopicSeed } from './year1MegaCurriculum';
import { u } from './year4UnitKit';
import { ending } from './trackUnitsWeb';

/**
 * Career-track content for Python Full Stack + AI, batch P1: what the years do not already teach.
 *
 * Years 1–3 teach Python from the first variable to OOP, modules, files and errors, and every data
 * structure and algorithm in Python; the track's packs reuse all of it. What is added here is the
 * Python a full-stack developer is expected to write and an interviewer expects to read — idioms,
 * generators, decorators, context managers, type hints, dataclasses and async — then testing it
 * with pytest, and Python talking to MySQL.
 */
export const TRACK_PYTHON: Record<string, TopicSeed> = {
  /* ── Pythonic and modern Python ── */
  JT_PY_MODERN: { category: 'UNIVERSAL', units: [
    u('COMPREHENSIONS', 'Comprehensions and Pythonic Loops', 'List, dict and set comprehensions, enumerate, zip, unpacking, and when a plain loop reads better.',
      ['Rewrite loops as comprehensions and idioms where it helps, and say when it does not'], 40),
    u('ITERATORS_GENERATORS', 'Iterators and Generators', 'The iterator protocol, yield, generator expressions, laziness, and itertools for real work.',
      ['Write a generator that streams data lazily and explain why it saves memory'], 45, { after: ['COMPREHENSIONS'] }),
    u('DECORATORS', 'Functions as Objects and Decorators', 'First-class functions, closures, *args/**kwargs, writing a decorator, and functools.wraps.',
      ['Write a timing or retry decorator correctly and explain what it wraps'], 45, { after: ['ITERATORS_GENERATORS'] }),
    u('CONTEXT_MANAGERS', 'Context Managers and Resources', 'with, __enter__/__exit__, contextlib, and never leaking a file, lock or connection.',
      ['Write a context manager and use with to release every resource you open'], 35, { after: ['DECORATORS'] }),
    u('TYPE_HINTS_DATACLASSES', 'Type Hints, Dataclasses and Enums', 'Annotations, Optional and generics, mypy in a project, @dataclass, and Enum — the shapes Django and FastAPI code is written in.',
      ['Type a module with hints, model data with dataclasses and enums, and check it with mypy'], 45, { after: ['CONTEXT_MANAGERS'] }),
    u('ASYNC_BASICS', 'async and await', 'The event loop, coroutines, asyncio.gather, what async helps (waiting on I/O) and what it does not (CPU work).',
      ['Run I/O-bound work concurrently with asyncio and say when async is the wrong tool'], 45, { after: ['TYPE_HINTS_DATACLASSES'] }),
    ...ending('Modern Python', 'ASYNC_BASICS', { project: ['MINI_PROJECT', 'Mini Project — A Log Analyser, the Pythonic Way', 'A command-line tool that streams a large log file with generators, filters and aggregates it with comprehensions, times itself with a decorator, closes everything with context managers, and is fully type-hinted.'] }),
  ] },

  /* ── Testing Python with pytest ── */
  JT_PY_TESTING: { category: 'UNIVERSAL', units: [
    u('PYTEST_BASICS', 'pytest: Writing and Running Tests', 'Test files and functions, plain assert, running and selecting tests, and reading a failure.',
      ['Write and run focused pytest tests, including the failure cases'], 40),
    u('FIXTURES_PARAMETRIZE', 'Fixtures and Parametrised Tests', 'Fixtures and their scope, conftest.py, tmp_path, and one test over many inputs with parametrize.',
      ['Share setup with fixtures and cover many cases with parametrize'], 40, { after: ['PYTEST_BASICS'] }),
    u('MOCKING', 'Mocking and Isolating Code', 'unittest.mock, patch where it is looked up, monkeypatch, and testing code that calls the network or the clock.',
      ['Test code that depends on time, files or HTTP by isolating those dependencies'], 40, { after: ['FIXTURES_PARAMETRIZE'] }),
    u('COVERAGE_TDD', 'Coverage, Test Design and TDD', 'pytest-cov, what coverage does and does not prove, test pyramids, and writing the test first.',
      ['Measure coverage, design a useful test suite, and work test-first on a small feature'], 35, { after: ['MOCKING'] }),
    ...ending('Python Testing', 'COVERAGE_TDD', { minutes: [40, 55, 35, 40] }),
  ] },

  /* ── Python talking to MySQL ── */
  JT_PY_MYSQL: { category: 'UNIVERSAL', units: [
    u('DRIVER_CONNECT', 'Connecting Python to MySQL', 'The DB-API, a MySQL driver (PyMySQL or mysql-connector), connections, cursors, and configuration from the environment.',
      ['Connect a Python program to MySQL and close it safely'], 40),
    u('PARAMETERISED_QUERIES', 'Parameterised Queries and SQL Injection', 'Why an f-string query is an attack, placeholders, and reading rows into dicts or dataclasses.',
      ['Query and update MySQL with parameters and map rows to Python objects'], 45, { after: ['DRIVER_CONNECT'] }),
    u('TRANSACTIONS', 'Transactions from Python', 'autocommit, commit and rollback, with-blocks, and keeping a transfer all-or-nothing.',
      ['Group statements into a transaction and roll back on failure'], 40, { after: ['PARAMETERISED_QUERIES'] }),
    u('REPOSITORY_LAYER', 'A Data-Access Layer and Connection Pools', 'Keeping SQL in one module behind functions or a repository class, and pooling connections.',
      ['Write a small repository layer over MySQL and explain where pooling helps'], 40, { after: ['TRANSACTIONS'] }),
    ...ending('Python and MySQL', 'REPOSITORY_LAYER', { project: ['MINI_PROJECT', 'Mini Project — A Library Manager on MySQL', 'A command-line library manager in Python on MySQL: books, members and loans through a repository layer, parameterised queries and a transaction for every loan, with pytest tests.'] }),
  ] },
};

/**
 * Batch P2: Django and Django REST Framework — the track's backend. One API is grown through the
 * topics (project → ORM → DRF → auth → tests) on MySQL, the way the Java track grows its Spring
 * Boot API, and the React app from the frontend packs is wired to it in P3.
 */
export const TRACK_DJANGO: Record<string, TopicSeed> = {
  /* ── Django core ── */
  JT_DJANGO_CORE: { category: 'UNIVERSAL', units: [
    u('PROJECT_APPS', 'Django Projects, Apps and manage.py', 'startproject and startapp, what each file is for, INSTALLED_APPS, and the request–response cycle.',
      ['Create a Django project with apps and trace a request from URL to response'], 40),
    u('URLS_VIEWS', 'URLs and Views', 'path() and include(), function-based and class-based views, request and response objects, and returning JSON.',
      ['Route URLs to function- and class-based views that return HTML or JSON'], 45, { after: ['PROJECT_APPS'] }),
    u('TEMPLATES_FORMS', 'Templates and Forms, Briefly', 'The template language and Django forms — enough to read them, since the track’s frontend is React.',
      ['Read and adjust Django templates and forms, and say why this track serves JSON instead'], 30, { after: ['URLS_VIEWS'] }),
    u('ADMIN', 'The Django Admin', 'Registering models, list displays, filters and search, and why the admin is a staff tool, not the product.',
      ['Give staff a working admin for the app’s models and lock it down'], 35, { after: ['TEMPLATES_FORMS'] }),
    u('SETTINGS_ENV', 'Settings, Environments, Static and Media Files', 'Settings per environment, secrets from environment variables, DEBUG and ALLOWED_HOSTS, static and media files, connecting MySQL.',
      ['Configure Django for development and production on MySQL with no secret in the code'], 40, { after: ['ADMIN'] }),
    ...ending('Django', 'SETTINGS_ENV', { project: ['MINI_PROJECT', 'Mini Project — A Course Catalogue with the Django Admin', 'A Django project on MySQL with a catalogue app: models, an admin for staff, JSON views for courses and categories, and settings split for development and production.'] }),
  ] },

  /* ── The Django ORM ── */
  JT_DJANGO_ORM: { category: 'UNIVERSAL', units: [
    u('MODELS_MIGRATIONS', 'Models and Migrations', 'Fields and options, Meta, makemigrations and migrate, and changing a model that already has data.',
      ['Model a schema in Django and evolve it safely with migrations'], 45),
    u('QUERYSETS', 'QuerySets: Filtering, Q and F', 'Lazy querysets, filter/exclude/get, field lookups, Q for OR, F for column arithmetic, and seeing the SQL.',
      ['Write ORM queries with lookups, Q and F objects, and read the SQL they produce'], 45, { after: ['MODELS_MIGRATIONS'] }),
    u('RELATIONSHIPS', 'Relationships: ForeignKey, ManyToMany and OneToOne', 'Relations, on_delete choices, related_name, through models, and querying across relations.',
      ['Model and query one-to-many and many-to-many relations with the right on_delete'], 45, { after: ['QUERYSETS'] }),
    u('PERFORMANCE', 'ORM Performance: N+1, select_related and prefetch_related', 'Spotting N+1 queries, select_related vs prefetch_related, only/defer, indexes, and counting queries.',
      ['Find and fix N+1 queries and slow ORM code by measuring the queries'], 45, { after: ['RELATIONSHIPS'] }),
    u('AGGREGATES_TRANSACTIONS', 'Aggregates, Annotations and Transactions', 'aggregate and annotate, values and grouping, transaction.atomic, select_for_update, and race conditions.',
      ['Report with aggregates and annotations and keep multi-step writes atomic'], 45, { after: ['PERFORMANCE'] }),
    ...ending('Django ORM', 'AGGREGATES_TRANSACTIONS', { minutes: [40, 55, 35, 40] }),
  ] },

  /* ── Django REST Framework ── */
  JT_DRF: { category: 'UNIVERSAL', units: [
    u('SERIALIZERS', 'Serializers', 'Serializer and ModelSerializer, read-only and write-only fields, nested and related data, and to_representation.',
      ['Turn models into JSON and JSON into validated models with DRF serializers'], 45),
    u('VIEWS_VIEWSETS', 'API Views, Generic Views, ViewSets and Routers', 'APIView, the generic views and mixins, ViewSets, routers, and status codes in responses.',
      ['Expose CRUD endpoints with the least code that stays readable'], 45, { after: ['SERIALIZERS'] }),
    u('VALIDATION_ERRORS', 'Validation and Error Responses', 'Field, object and model validation, raising ValidationError, a custom exception handler, and one error shape.',
      ['Validate input at the right level and return consistent, useful error responses'], 40, { after: ['VIEWS_VIEWSETS'] }),
    u('PAGINATION_FILTERING', 'Pagination, Filtering, Search and Ordering', 'Page-number and cursor pagination, django-filter, search and ordering filters, and never returning everything.',
      ['Serve paged, filtered, searchable and sorted list endpoints'], 40, { after: ['VALIDATION_ERRORS'] }),
    u('OPENAPI', 'API Documentation with OpenAPI', 'drf-spectacular, the schema, Swagger UI, and documenting what callers need.',
      ['Generate OpenAPI docs for a DRF API that another developer can call without asking'], 30, { after: ['PAGINATION_FILTERING'] }),
    ...ending('Django REST Framework', 'OPENAPI', { project: ['MINI_PROJECT', 'Mini Project — A Product Catalogue API on DRF', 'A Django REST Framework API on MySQL for a product catalogue: serializers, viewsets and routers, validation and one error shape, pagination, filtering and search, and Swagger docs.'] }),
  ] },

  /* ── Auth and security in Django ── */
  JT_DJANGO_AUTH: { category: 'UNIVERSAL', units: [
    u('USER_MODEL', 'Users, Passwords and a Custom User Model', 'Django’s auth app, password hashing, why to start with a custom user model, and registration.',
      ['Set up a custom user model with properly hashed passwords and a registration endpoint'], 40, { skillKeys: ['AUTHENTICATION'] }),
    u('JWT', 'JWT Authentication with Simple JWT', 'Access and refresh tokens, lifetimes, rotation and blacklisting, and what a JWT does not protect.',
      ['Issue, refresh and validate JWTs in a DRF API'], 45, { after: ['USER_MODEL'], skillKeys: ['AUTHENTICATION'] }),
    u('PERMISSIONS', 'Permissions and Object Ownership', 'Permission classes, IsAuthenticated and roles, custom object-level permissions, and scoping querysets to the user.',
      ['Restrict endpoints by role and make sure a user can only touch their own records'], 45, { after: ['JWT'], skillKeys: ['AUTHORIZATION'] }),
    u('SECURITY_SETTINGS', 'Securing a Django API', 'CSRF and when it applies, CORS with django-cors-headers, DEBUG off, ALLOWED_HOSTS, HTTPS settings and the deploy checklist.',
      ['Configure a Django API securely for production and pass manage.py check --deploy'], 40, { after: ['PERMISSIONS'] }),
    ...ending('Django Security', 'SECURITY_SETTINGS', { minutes: [45, 55, 40, 40] }),
  ] },

  /* ── Testing Django ── */
  JT_DJANGO_TESTING: { category: 'UNIVERSAL', units: [
    u('PYTEST_DJANGO', 'Testing Django with pytest-django', 'Settings for tests, the db fixture and test database, model and service tests.',
      ['Test models and services with pytest-django against a real test database'], 40),
    u('API_TESTS', 'Testing the API with APIClient', 'APIClient, authenticating in tests, asserting status and JSON, and testing permissions.',
      ['Test DRF endpoints end to end, including validation errors and access rules'], 45, { after: ['PYTEST_DJANGO'] }),
    u('FACTORIES', 'Test Data with factory_boy and Fixtures', 'Factories, sub-factories and traits, fixtures for users and tokens, and keeping tests independent.',
      ['Build test data with factories so each test sets up only what it needs'], 35, { after: ['API_TESTS'] }),
    ...ending('Django Testing', 'FACTORIES', { project: ['MINI_PROJECT', 'Mini Project — A Secured, Tested Library API on DRF', 'A Django REST Framework library API on MySQL: books, members and loans, JWT login with roles and ownership, and pytest-django tests for models, permissions and every endpoint.'] }),
  ] },
};

/**
 * Batch P3: the full stack and AI in Python. The React app is wired to the Django API and the
 * stack deployed; then a small FastAPI service holds the AI — chat, structured output, streaming,
 * RAG and an agent — which Django calls, and the capstone ties it together. The AI concepts
 * (JT_AI_CONCEPTS, JT_AI_AGENTS) are the language-free topics every "+ AI" track shares.
 */
export const TRACK_PY_STACK_AI: Record<string, TopicSeed> = {
  /* ── React and Django, together and deployed ── */
  JT_FULLSTACK_PY: { category: 'UNIVERSAL', units: [
    u('REACT_CALLS_DRF', 'React Calling the Django API', 'An axios client with the base URL from the environment, the Vite dev proxy, and DRF’s JSON and error shapes in React.',
      ['Call a Django REST Framework API from React through one configured client'], 40),
    u('CORS_CSRF', 'CORS and CSRF Between React and Django', 'django-cors-headers for the browser, why JWT in a header avoids CSRF, and when session auth needs it.',
      ['Allow exactly the React origin and explain when CSRF protection applies'], 35, { after: ['REACT_CALLS_DRF'] }),
    u('JWT_LOGIN_FLOW', 'The Login Flow End to End', 'Simple JWT login from React, keeping the access token, refreshing it, protected routes, and handling 401 and expiry.',
      ['Build a working JWT login across React and Django, including refresh and logout'], 55, { after: ['CORS_CSRF'], skillKeys: ['AUTHENTICATION'] }),
    u('FILE_UPLOAD', 'Uploading Files', 'Multipart from a React form, FileField and ImageField in DRF, size and type limits, and media storage.',
      ['Upload a file from React to Django with validation and storage outside the code'], 40, { after: ['JWT_LOGIN_FLOW'] }),
    u('ERRORS_ACROSS', 'Errors Across Both Halves', 'DRF’s validation errors in React forms, one error contract, and the network failure nobody handled.',
      ['Show API validation errors in a React form and handle failures gracefully'], 35, { after: ['FILE_UPLOAD'] }),
    u('DOCKER', 'Docker for Django and React', 'Gunicorn behind nginx, the React build served by nginx, collectstatic, and docker compose with MySQL.',
      ['Run the Django API, the React app and MySQL together with docker compose'], 50, { after: ['ERRORS_ACROSS'], skillKeys: ['CONTAINERS_DOCKER'] }),
    u('DEPLOY', 'Deploying the Python Stack', 'A managed MySQL, the API and the frontend on a cloud host, migrations on release, secrets in environment variables.',
      ['Deploy the Django and React stack with configuration kept out of the code'], 50, { after: ['DOCKER'], skillKeys: ['DEPLOYMENT'] }),
    ...ending('React and Django Integration', 'DEPLOY', { project: ['PROJECT', 'Project — A Django and React App, Deployed', 'The React frontend and the secured DRF API on MySQL as one application: login with refresh, roles, CRUD, an upload, consistent errors, Docker, and a public URL.'] }),
  ] },

  /* ── FastAPI, for the AI service ── */
  JT_FASTAPI: { category: 'UNIVERSAL', units: [
    u('ROUTES_PYDANTIC', 'FastAPI: Routes and Pydantic Models', 'Path and query parameters, request and response models with Pydantic v2, validation errors and the automatic docs.',
      ['Build typed FastAPI endpoints whose requests and responses are validated by Pydantic'], 45),
    u('ASYNC_DEPENDENCIES', 'Async Endpoints and Dependencies', 'async def and when it helps, Depends for settings, clients and auth, httpx for outbound calls, and timeouts.',
      ['Write async endpoints that share clients and settings through dependencies'], 45, { after: ['ROUTES_PYDANTIC'] }),
    u('SERVICE_AUTH', 'Securing a Service Django Calls', 'Settings from the environment, an API key or the user’s JWT between services, and keeping the AI key in one place.',
      ['Secure the AI service so only the Django app, acting for a user, can call it'], 40, { after: ['ASYNC_DEPENDENCIES'] }),
    u('DJANGO_CALLS_FASTAPI', 'Django Calling the AI Service', 'Why the AI lives in its own service, calling it from Django with timeouts and retries, and failing gracefully.',
      ['Call the FastAPI service from Django and keep the app working when it is slow or down'], 40, { after: ['SERVICE_AUTH'] }),
    u('TESTING', 'Testing FastAPI', 'TestClient, overriding dependencies, and testing the AI service without calling a real model.',
      ['Test FastAPI endpoints, with fake dependencies for the model and the database'], 35, { after: ['DJANGO_CALLS_FASTAPI'] }),
    ...ending('FastAPI', 'TESTING', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── Generative AI in Python ── */
  JT_AI_PY: { category: 'UNIVERSAL', units: [
    u('SDK_SETUP', 'Calling a Model from Python', 'A provider SDK in the FastAPI service, messages and parameters, the key from the environment, timeouts, retries and cost.',
      ['Call an LLM from the FastAPI service with the key kept out of the code and the cost under control'], 45),
    u('STRUCTURED_OUTPUT', 'Structured Output with Pydantic', 'Asking for JSON, validating it with a Pydantic model, retrying or failing safely when it does not parse.',
      ['Turn a model answer into a validated Pydantic object and handle the failure case'], 40, { after: ['SDK_SETUP'] }),
    u('STREAMING_REACT', 'Streaming a Chat Answer into React', 'Server-sent events from FastAPI, reading the stream in React as it arrives, and cancelling it.',
      ['Stream a chat answer from FastAPI to a React UI token by token'], 45, { after: ['STRUCTURED_OUTPUT'] }),
    u('EMBEDDINGS_VECTOR_STORE', 'Embeddings and a Vector Store in Python', 'Embedding documents, chunking them, storing vectors (Chroma or pgvector), and searching by meaning.',
      ['Ingest documents into a vector store from Python and search them by meaning'], 45, { after: ['STREAMING_REACT'], skillKeys: ['RAG_SYSTEMS'] }),
    u('RAG', 'RAG in Python, with and without LangChain', 'Retrieve, ground, cite — written by hand first, then with LangChain — and answering only from the app’s documents.',
      ['Answer questions over your own documents in Python, citing what the answer used'], 50, { after: ['EMBEDDINGS_VECTOR_STORE'], skillKeys: ['RAG_SYSTEMS'] }),
    ...ending('AI in Python', 'RAG', { project: ['MINI_PROJECT', 'Mini Project — An AI Help Desk on FastAPI', 'A FastAPI service that answers questions over a set of product documents with RAG — streamed to React, with cited sources, an "I don’t know" path and a small evaluation set — called from the Django app.'] }),
  ] },

  /* ── Agents in Python ── */
  JT_AI_AGENTS_PY: { category: 'UNIVERSAL', units: [
    u('TOOLS_PY', 'Tool Calling in Python', 'Tools as typed Python functions, the schema the model sees, running the loop, and checking every call against the user’s permissions.',
      ['Give a model tools backed by your own services, with checks on every call'], 45),
    u('LANGGRAPH', 'An Agent with LangGraph', 'State, nodes and edges, a tool-calling loop with a step limit, and a human approval step before anything irreversible.',
      ['Build a bounded tool-calling agent with LangGraph, including an approval step'], 45, { after: ['TOOLS_PY'] }),
    u('MEMORY_MCP_PY', 'Memory and MCP in Python', 'Per-user conversation memory and its limits, and using or exposing tools over MCP with the Python SDK.',
      ['Give an agent per-user memory and connect it to an MCP server'], 40, { after: ['LANGGRAPH'] }),
    ...ending('Python AI Agents', 'MEMORY_MCP_PY', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── The capstone ── */
  JT_CAPSTONE_PY: { category: 'UNIVERSAL', units: [
    u('BRIEF', 'The Capstone: Scope, Architecture and Plan', 'An e-commerce store or a job portal on React, Django, MySQL and a FastAPI AI service: the architecture, a design document and a plan.',
      ['Scope the capstone, draw its architecture and write a plan you can deliver in the time'], 45),
    u('BUILD_CORE', 'Capstone Build — The Full-Stack Application', 'React, Django REST Framework and MySQL: login and roles, the core features, tests, and a deployed first version.',
      ['Build and deploy the core application to the standard of the earlier projects'], 300, { unitType: 'PROJECT', after: ['BRIEF'] }),
    u('AI_FEATURES', 'Capstone Build — The AI Assistant and the Agent', 'The FastAPI AI service: a RAG assistant over the app’s own catalogue or listings, and an agent that acts for the user with approval.',
      ['Add a grounded AI assistant and a guarded agent to the application and evaluate both'], 240, { unitType: 'PROJECT', after: ['BUILD_CORE'], skillKeys: ['LLM_APPLICATIONS', 'AI_AGENTS'] }),
    u('DEFENCE', 'Demo Day: Presenting and Defending the Capstone', 'A five-minute demo, the architecture walk-through, and the questions a panel asks about it.',
      ['Demo the capstone and defend every design decision under questioning'], 45, { unitType: 'PRACTICE', after: ['AI_FEATURES'] }),
    u('CHECKPOINT', 'Capstone — Checkpoint', 'Where you actually are across the whole track, measured rather than felt.',
      ['Show full-stack and AI judgement at the standard a hiring panel expects'], 40, { unitType: 'CHECKPOINT', after: ['DEFENCE'] }),
  ] },
};
