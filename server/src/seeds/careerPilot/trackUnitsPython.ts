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
