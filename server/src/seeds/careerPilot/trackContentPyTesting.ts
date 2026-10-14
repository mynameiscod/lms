/**
 * Career-track content: testing Python with pytest (JT_PY_TESTING), for Python Full Stack + AI.
 *
 * Years 2 and 3 teach testing as an idea — what a good test is, edge cases, coverage as a signal,
 * red-green-refactor — with only a few lines of pytest. This topic is the tool itself: how pytest
 * finds and reports tests, fixtures and their scopes, parametrize, unittest.mock and monkeypatch,
 * freezing time, faking HTTP, and pytest-cov. The questions are about specific test files and what
 * pytest does with them, so none repeats the years' conceptual stems.
 *
 * Every output, report line and error message quoted here was produced by running the code under
 * pytest 9.1 with pytest-cov 7, responses and freezegun on Python 3.13; nothing used is newer than
 * Python 3.10 unless the text says so.
 *
 * The topic is single-skill (AUTOMATED_TESTING), so no question names a skillKey. There is no
 * project and no auto-graded exercise: the runner grades stdout, and a pytest suite is not that.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_PY_TESTING_BUNDLES: PilotBundle[] = [
  /* ── PYTEST_BASICS ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_TESTING_PYTEST_BASICS',
    notes: `pytest is the test runner nearly every Python team uses, including for Django and FastAPI
projects. Install it into the project's virtual environment (\`pip install pytest\`) and run it from
the project root with \`pytest\` (or \`python -m pytest\`, which also puts the current directory on
\`sys.path\` — handy when imports of your own package fail).

## How pytest finds tests

With no configuration, pytest walks the directories under where you ran it and collects:

- **files** named \`test_*.py\` or \`*_test.py\` — \`test_orders.py\` and \`orders_test.py\` are
  collected; \`tests_orders.py\` and \`check_orders.py\` are not;
- **functions** in those files whose names start with \`test\`;
- **classes** whose names start with \`Test\` and that have **no \`__init__\`**, and the \`test*\`
  methods inside them. A test class needs no base class.

A \`TestCart\` class that defines \`__init__\` is skipped with a *PytestCollectionWarning: cannot
collect test class 'TestCart' because it has a __init__ constructor*. A helper named
\`check_total()\` inside a test file is never run — which is exactly what you want for helpers, and a
nasty surprise if you meant it as a test.

    # src/shop/cart.py
    def add(a, b):
        return a + b

    def parse_qty(text):
        n = int(text)
        if n < 0:
            raise ValueError(f"quantity must be >= 0, got {n}")
        return n

    # tests/test_cart.py
    import pytest
    from shop.cart import add, parse_qty

    def test_add():
        assert add(2, 3) == 5

    class TestParseQty:
        def test_zero_is_allowed(self):
            assert parse_qty("0") == 0

        def test_negative_is_refused(self):
            with pytest.raises(ValueError, match="must be >= 0"):
                parse_qty("-3")

## Plain assert, rewritten

unittest makes you call \`self.assertEqual(a, b)\` so it can show both values. pytest lets you write
an ordinary \`assert\` and **rewrites** it while importing the test module, so a failure explains
itself:

    def test_add():
        assert add(1, 2) == 4

    E       assert 3 == 4
    E        +  where 3 = add(1, 2)

For lists, dicts and long strings it prints a diff (\`At index 2 diff: 3 != 4\`). Rewriting happens
only in test modules and \`conftest.py\` — an \`assert\` inside your application code gets no such
help, and is stripped entirely under \`python -O\`, so never use \`assert\` for validation in
production code.

## Exceptions and floats

\`pytest.raises\` is a context manager that **fails the test if the block does not raise** the given
type (or a subclass). \`match=\` is a regular expression searched in \`str(exception)\`, and the
\`as\` name gives you the exception afterwards:

    with pytest.raises(ValueError, match=r"got -3$") as excinfo:
        parse_qty("-3")
    assert "quantity" in str(excinfo.value)

Put only the raising call inside the block: any line after it in the block never runs.

Floats need \`pytest.approx\`: \`0.1 + 0.2 == 0.3\` is False in binary floating point, while
\`0.1 + 0.2 == pytest.approx(0.3)\` passes (default relative tolerance 1e-6). It works on lists and
dicts of numbers too.

## Running a subset

| Command | What it does |
|---|---|
| \`pytest -v\` | one line per test with its full id, e.g. \`tests/test_cart.py::TestParseQty::test_zero_is_allowed PASSED\` |
| \`pytest -q\` | quiet: dots and a summary |
| \`pytest -x\` | stop after the first failure |
| \`pytest -k "qty and not negative"\` | run tests whose id matches the expression (case-insensitive substring match on names) |
| \`pytest tests/test_cart.py::test_add\` | run one test by its id |
| \`pytest --lf\` | rerun only the tests that failed last time |
| \`pytest -m slow\` / \`-m "not slow"\` | select by marker |
| \`pytest -s\` | do not capture output, so \`print\` shows immediately |

## Markers

A marker is a label: \`@pytest.mark.slow\`. Built-ins include \`skip\`, \`skipif(condition, reason=...)\`
and \`xfail\` (expected to fail — reported as XFAIL, not as a failure). Your own markers must be
registered, or pytest warns *PytestUnknownMarkWarning: Unknown pytest.mark.slow - is this a typo?*:

    # pyproject.toml
    [tool.pytest.ini_options]
    testpaths = ["tests"]
    markers = ["slow: talks to a real service; deselect with -m 'not slow'"]
    addopts = "--strict-markers"

With \`--strict-markers\` an unregistered marker is a collection **error**, which catches
\`@pytest.mark.slwo\` before it silently selects nothing.

## Reading the result

Each test ends as **passed**, **failed** (an assertion or exception in the test body), **error**
(something broke in setup or teardown — usually a fixture), **skipped** or **xfailed**. The exit code
is 0 when everything passed, 1 when any test failed, and 5 when no tests were collected — which is
how CI notices a misnamed test folder.

## Common mistakes

- Naming the file \`tests_cart.py\` or the function \`check_add\` and wondering why "0 tests ran".
- Two \`test_utils.py\` files in different folders without \`__init__.py\`: pytest stops with
  *import file mismatch*. Give test files unique names or make the folders packages.
- Writing \`return result == 5\` instead of \`assert\`: the test passes, with only a
  *PytestReturnNotNoneWarning* to tell you.`,
    workedExample: `**Problem.** Test \`parse_price(text)\`, which turns \`"₹1,299.50"\` into the float
\`1299.5\` and raises \`ValueError("empty price")\` for \`""\` or \`"   "\`.

**Decide what to check.** One normal value, one value with no paise, the float comparison, and each
refusal — with the message, so a different \`ValueError\` (say from \`float()\`) cannot pass the test
by accident.

    import pytest
    from shop.prices import parse_price

    def test_rupees_and_paise():
        assert parse_price("₹1,299.50") == pytest.approx(1299.5)

    def test_whole_rupees():
        assert parse_price("₹40") == 40

    def test_blank_is_refused():
        with pytest.raises(ValueError, match="empty price"):
            parse_price("   ")

**Run and read.** \`pytest -v tests/test_prices.py\` prints three ids. Suppose
\`test_blank_is_refused\` fails with *Regex pattern did not match* and the actual message is
\`could not convert string to float: ''\` — the function forgot to strip and check before calling
\`float()\`. The \`match=\` argument found the bug; a bare \`pytest.raises(ValueError)\` would have
passed.

**Select while fixing.** \`pytest -k blank -x\` reruns just that test until it is green, then
\`pytest\` runs everything once more.`,
    mcqs: [
      mcq('A folder holds `test_orders.py`, `orders_test.py`, `tests_orders.py` and `check_orders.py`, and each file contains one function named `test_total()`. With no pytest configuration, how many tests does `pytest` collect?', [
        ['One — only test_orders.py matches the default pattern', false],
        ['Three — every file whose name contains "test"', false],
        ['Four, since the function names all start with test', false],
        ['Two — test_orders.py and orders_test.py', true],
      ], 'The default file patterns are test_*.py and *_test.py. tests_orders.py matches neither (the prefix is "tests", not "test_"), and check_orders.py does not either, so only two files — and their two functions — are collected.'),
      mcq(`This test fails. Apart from the line \`E  assert 3 == 4\`, what does pytest show to explain it?

    from calc import add

    def test_add():
        assert add(1, 2) == 4`, [
        ['The line "+  where 3 = add(1, 2)" under the comparison', true],
        ['Nothing more, just a bare AssertionError with no detail at all', false],
        ['A traceback into calc.add showing its return line', false],
        ['A hint suggesting self.assertEqual for better output', false],
      ], 'pytest rewrites assert statements in test modules so it can report intermediate values. It prints the evaluated comparison and then where each value came from — here that 3 is the result of add(1, 2).'),
      mcq('A file defines `test_float`, `test_float_plain` and `test_add`. Which tests does `pytest -k "float and not plain"` run?', [
        ['test_float and test_float_plain, since both contain "float"', false],
        ['test_float and test_add, everything except the plain one', false],
        ['Only test_float', true],
        ['None of them: -k expects a marker name, not a test name', false],
      ], '-k evaluates a boolean expression against each test\'s name: "float" matches two tests and "not plain" removes test_float_plain, leaving just test_float. The other two are reported as deselected.'),
    ],
    checkpoint: [
      mcq(`What does pytest do with this class in test_cart.py?

    class TestCart:
        def __init__(self):
            self.items = []

        def test_starts_empty(self):
            assert self.items == []`, [
        ['Runs test_starts_empty once, calling __init__ first', false],
        ['Fails test_starts_empty with a TypeError about the __init__ signature', false],
        ['Collects it as an error and stops the whole session', false],
        ['Skips the class and warns that it has an __init__ constructor', true],
      ], 'pytest creates a fresh instance per test method and will not collect a Test* class that defines __init__. It emits a PytestCollectionWarning and runs nothing from the class — setup belongs in a fixture instead.'),
      mcq(`What is the outcome of this test?

    def test_divide():
        with pytest.raises(ZeroDivisionError):
            1 / 0
            assert False, "should never get here"`, [
        ['It passes; the line after the division never runs', true],
        ['It fails on assert False with the message shown', false],
        ['It errors, because a with block may hold only one line', false],
        ['It fails, since ZeroDivisionError escapes pytest.raises', false],
      ], 'The exception leaves the with block at 1 / 0, pytest.raises catches it, and the block is over. Any statement after the raising call inside the block is skipped, which is why only the raising call belongs there.'),
      mcq('A test asserts `total == 0.3` where `total = 0.1 + 0.2`, and it fails. Which assertion is the correct fix?', [
        ['assert round(total) == round(0.3)', false],
        ['assert str(total) == "0.3"', false],
        ['assert total == pytest.approx(0.3)', true],
        ['assert total is 0.3', false],
      ], 'pytest.approx compares within a relative tolerance (1e-6 by default), which absorbs binary floating-point error. Rounding to an integer makes both sides 0 and hides real bugs, the string form is "0.30000000000000004", and is compares identity.'),
    ],
  },

  /* ── FIXTURES_PARAMETRIZE ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_TESTING_FIXTURES_PARAMETRIZE',
    notes: `A **fixture** is a function that prepares something a test needs. A test asks for it by
naming it as a parameter, and pytest calls the fixture and passes in what it returns. No base class,
no \`setUp\` method, and each test lists exactly what it depends on.

    import pytest
    from shop.cart import Cart

    @pytest.fixture
    def cart():
        return Cart(owner="asha")

    def test_new_cart_is_empty(cart):
        assert cart.total() == 0

    def test_add_item(cart):
        cart.add("pen", 20, qty=3)
        assert cart.total() == 60

Each test receives a **fresh** \`Cart\`, so \`test_add_item\` cannot leak into the other. Fixtures can
request other fixtures the same way, and pytest builds the chain.

## Teardown with yield

Code after \`yield\` is teardown. It runs after the test **even when the test fails**:

    @pytest.fixture
    def db():
        conn = connect_test_db()
        conn.execute("BEGIN")
        yield conn                  # the test runs here
        conn.execute("ROLLBACK")    # always undone afterwards
        conn.close()

If the code *before* \`yield\` raises, the test is reported as an **error** (not a failure), and the
teardown does not run — there is nothing to tear down. Keep each fixture to one resource so a
half-built setup cannot leave something open.

## Scope

\`@pytest.fixture(scope=...)\` decides how long one instance lives: \`"function"\` (default, one per
test), \`"class"\`, \`"module"\`, \`"package"\` or \`"session"\` (one for the whole run). A wider scope is
for something **expensive and read-only** — a started container, a loaded ML model. Shared mutable
state is a trap:

    @pytest.fixture(scope="module")
    def rows():
        return []

    def test_one(rows):
        rows.append(1)
        assert len(rows) == 1

    def test_two(rows):
        rows.append(2)
        assert len(rows) == 2      # passes — but only because test_one ran first

A fixture may only use fixtures of the **same or wider** scope. A session fixture that requests a
function fixture stops with *ScopeMismatch: You tried to access the function scoped fixture ... with
a session scoped request object*.

\`autouse=True\` applies a fixture to every test in its scope without being named — useful for "reset
the cache" or "block network", easy to overuse because it hides a dependency.

## conftest.py

Fixtures in a \`conftest.py\` are available to every test in that directory and below, **without an
import**. Put shared fixtures in \`tests/conftest.py\`; put ones only the API tests need in
\`tests/api/conftest.py\`. Never import from conftest — pytest loads it itself.

## Built-in fixtures you will use weekly

    def test_writes_report(tmp_path):            # a fresh pathlib.Path directory per test
        out = tmp_path / "report.csv"
        write_report(out, [("pen", 20)])
        assert out.read_text() == "item,price\\npen,20\\n"

    def test_greets(capsys):                    # captured stdout/stderr
        greet("Ravi")
        out, err = capsys.readouterr()
        assert out == "Hello, Ravi!\\n"

    def test_reads_key(monkeypatch):           # undone automatically after the test
        monkeypatch.setenv("API_KEY", "test-key")
        assert load_settings().api_key == "test-key"

\`monkeypatch\` also has \`delenv\`, \`setattr\` and \`chdir\`; every change is reverted when the test
ends, so the next test sees the real environment.

## parametrize: one test, many inputs

    @pytest.mark.parametrize("raw, expected", [
        ("10", 10),
        ("0", 0),
        (" 7 ", 7),
    ], ids=["ten", "zero", "padded"])
    def test_parse_qty(raw, expected):
        assert parse_qty(raw) == expected

This is three tests — \`test_parse_qty[ten]\`, \`[zero]\`, \`[padded]\` — and each passes or fails on its
own, unlike a loop inside one test that stops at the first bad case and hides the rest. Without
\`ids\`, pytest builds ids from the values (\`test_parse_qty[10-10]\`). Use \`pytest.param(...,
id="...", marks=pytest.mark.xfail)\` to label or mark a single case.

Stacking two \`parametrize\` decorators gives the **cartesian product**: 2 values × 3 values = 6
tests. A fixture can be parametrized too — \`@pytest.fixture(params=["sqlite", "mysql"])\` with
\`request.param\` — and then every test using it runs once per backend.

The argument names must match the tuple length: \`"a, b"\` with \`(1, 2, 3)\` is a collection error
naming both counts.`,
    workedExample: `**Problem.** \`load_config(path)\` reads a small \`key=value\` file, ignores blank lines and
\`#\` comments, and raises \`ValueError\` on a line with no \`=\`. Test it without touching any real file.

**Build the input with a fixture.** A helper fixture writes text into \`tmp_path\` and returns the path,
so each test owns its own file:

    import pytest
    from app.config import load_config

    @pytest.fixture
    def write_cfg(tmp_path):
        def _write(text):
            p = tmp_path / "app.cfg"
            p.write_text(text)
            return p
        return _write

A fixture that returns a function (a **factory fixture**) lets the test choose the content.

**Cover the valid shapes with parametrize.**

    @pytest.mark.parametrize("text, expected", [
        ("port=8000\\n", {"port": "8000"}),
        ("# comment\\n\\nport=8000\\n", {"port": "8000"}),
        ("a=1\\nb=2\\n", {"a": "1", "b": "2"}),
    ], ids=["single", "comment-and-blank", "two-keys"])
    def test_valid_files(write_cfg, text, expected):
        assert load_config(write_cfg(text)) == expected

**Cover the refusal separately.**

    def test_line_without_equals_is_refused(write_cfg):
        with pytest.raises(ValueError, match="line 2"):
            load_config(write_cfg("port=8000\\noops\\n"))

**Result.** Four tests, each with a readable id, no files left behind (pytest manages \`tmp_path\`),
and a new case is one more tuple rather than one more function.`,
    mcqs: [
      mcq(`Both tests pass when the file runs top to bottom. What does test_two depend on?

    @pytest.fixture(scope="module")
    def rows():
        return []

    def test_one(rows):
        rows.append(1)
        assert len(rows) == 1

    def test_two(rows):
        rows.append(2)
        assert len(rows) == 2`, [
        ['Nothing — every test receives its own fresh, empty list from the fixture', false],
        ['On pytest resetting the list between the two tests', false],
        ['On test_one having run first and appended to the same list', true],
      ], 'scope="module" creates one list for the whole file, so test_two sees the 1 that test_one appended. Run test_two alone (pytest -k two) and it fails — shared mutable state in a wide-scoped fixture couples tests.'),
      mcq(`How many tests does pytest collect from this function?

    @pytest.mark.parametrize("a", [1, 2])
    @pytest.mark.parametrize("b", [10, 20, 30])
    def test_grid(a, b):
        assert a < b`, [
        ['6, every combination of a and b', true],
        ['2, one per value of a', false],
        ['5, one per value listed in either decorator', false],
        ['3, one per value of b', false],
      ], 'Stacked parametrize decorators multiply: each of the 2 values of a is paired with each of the 3 values of b, giving 6 tests with ids such as test_grid[10-1].'),
      mcq('A `user` fixture is defined in `tests/conftest.py`. A test in `tests/api/test_orders.py` names `user` as a parameter but has no import for it. What happens?', [
        ['It works; conftest fixtures reach every test below that folder', true],
        ['The test errors: fixture \'user\' not found', false],
        ['It works only if test_orders.py does "from conftest import user"', false],
        ['It works only if tests/api has its own copy of the conftest', false],
      ], 'pytest loads each conftest.py itself and makes its fixtures visible to all tests in that directory and its subdirectories. Importing from conftest is unnecessary and can cause double-registration problems.'),
    ],
    checkpoint: [
      mcq(`test_save fails on its assertion. Does "rolled back" get printed?

    @pytest.fixture
    def db():
        conn = connect()
        yield conn
        print("rolled back")
        conn.rollback()

    def test_save(db):
        save(db, order)
        assert count(db) == 99`, [
        ['Yes — teardown after yield runs whether the test passed or failed', true],
        ['No — a failing test skips the code after yield', false],
        ['Only when pytest runs with -s, which enables teardown', false],
        ['No — the failure is reported as an error and stops the fixture', false],
      ], 'Code after yield is the fixture\'s teardown and runs after the test regardless of its outcome. (-s only stops output capture, so the print becomes visible; it does not decide whether teardown runs.)'),
      mcq(`What happens when test_x runs?

    @pytest.fixture
    def small():
        return 1

    @pytest.fixture(scope="session")
    def big(small):
        return small

    def test_x(big):
        pass`, [
        ['It passes; big is created once and small once per test', false],
        ['small is widened to session scope automatically', false],
        ['test_x errors at setup with ScopeMismatch', true],
        ['test_x fails with a NameError for small', false],
      ], 'A session-scoped fixture lives for the whole run and cannot depend on something torn down after every test. pytest refuses with ScopeMismatch during setup, so the test is reported as an error.'),
      mcq(`What makes this test pass?

    def greet(name):
        print(f"Hello, {name}!")

    def test_greet(capsys):
        greet("Ravi")
        out, err = capsys.readouterr()
        assert out == ???`, [
        ['"Hello, Ravi!"', false],
        ['None, since print returns None', false],
        ['["Hello, Ravi!"]', false],
        ['"Hello, Ravi!\\n"', true],
      ], 'capsys.readouterr() returns everything written to stdout so far as one string, including the newline print adds. Comparing with "Hello, Ravi!" misses that trailing newline and fails.'),
    ],
  },

  /* ── MOCKING ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_TESTING_MOCKING',
    notes: `Code that calls an HTTP API, reads the clock or sends an email is slow, flaky and sometimes
costly to test for real. You **replace the dependency** for the length of the test. Python ships the
tools in \`unittest.mock\`; pytest adds \`monkeypatch\`.

## Mock and MagicMock

    from unittest.mock import Mock, MagicMock

    gateway = Mock()
    gateway.charge.return_value = {"status": "ok"}
    result = gateway.charge(500, currency="INR")

    gateway.charge.assert_called_once_with(500, currency="INR")
    print(gateway.charge.call_count)     # 1

A \`Mock\` invents any attribute you touch and records every call. \`MagicMock\` also implements the
magic methods: \`len(MagicMock())\` is 0 and you can iterate it, while \`len(Mock())\` raises
*TypeError: object of type 'Mock' has no len()*. \`patch\` creates MagicMocks by default.

**side_effect** controls what a call does instead of returning \`return_value\`:

    m = Mock(side_effect=[1, 2, ValueError("boom")])
    m(); m()          # 1, then 2
    m()               # raises ValueError
    m()               # StopIteration — the list is used up

    Mock(side_effect=lambda x: x * 2)(21)    # 42
    Mock(side_effect=TimeoutError)()          # raises TimeoutError

A list is perfect for "fails twice, then succeeds" retry tests.

## patch — and where to patch

\`patch("module.name")\` swaps a name **in a module's namespace** for the duration of a \`with\` block or
a decorated test. The rule that trips everyone: **patch where the name is looked up, not where it is
defined.**

    # rates.py
    import requests
    def fetch_rate(cur):
        r = requests.get(f"https://api.example.com/rates/{cur}", timeout=5)
        r.raise_for_status()
        return r.json()["rate"]

    # billing.py
    from rates import fetch_rate        # billing now has its OWN name fetch_rate
    def to_inr(amount, cur):
        return round(amount * fetch_rate(cur), 2)

    # test_billing.py
    from unittest.mock import patch
    import billing

    def test_to_inr():
        with patch("billing.fetch_rate", return_value=80.0) as fake:
            assert billing.to_inr(2, "USD") == 160.0
        fake.assert_called_once_with("USD")

Patching \`"rates.fetch_rate"\` here changes nothing \`billing\` uses — the real function runs and makes
a real network call. If billing had done \`import rates\` and called \`rates.fetch_rate(...)\`, then
\`"rates.fetch_rate"\` would be the right target, because the lookup happens on \`rates\` at call time.

Stacked \`@patch\` decorators pass mocks **bottom-up**: the decorator nearest the function supplies the
first argument.

## autospec and spec — mocks that keep you honest

A plain Mock accepts any arguments and any attribute, so a test can pass against a method that does
not exist. \`Mock(spec=Repo)\` refuses attributes Repo lacks (\`r.sav(...)\` raises AttributeError), and
\`autospec\` also checks call signatures:

    with patch("billing.fetch_rate", autospec=True) as fake:
        fake.return_value = 80.0
        billing.fetch_rate("USD", "EXTRA")   # TypeError: too many positional arguments

Use \`autospec=True\` (or \`create_autospec\`) by default when patching your own functions and
classes. Mock also rejects misspelt assertions that start with \`assert\` — \`m.assert_called_onse()\`
raises AttributeError instead of silently passing.

## monkeypatch for attributes and environment

    def test_fetch_rate(monkeypatch):
        class FakeResp:
            def raise_for_status(self): pass
            def json(self): return {"rate": 90.0}
        monkeypatch.setattr(rates.requests, "get", lambda url, timeout: FakeResp())
        assert rates.fetch_rate("GBP") == 90.0

\`monkeypatch.setattr("billing.fetch_rate", fake)\` takes a dotted string too. Same rule: patch the
name the code under test will look up.

## The clock

\`datetime.now()\` cannot be monkeypatched directly — \`monkeypatch.setattr(datetime.datetime, "now",
...)\` fails with *TypeError: cannot set 'now' attribute of immutable type 'datetime.datetime'*. Three
working options, best first:

1. **Inject it.** \`def greeting(now=None): now = now or datetime.now()\` — the test passes a fixed
   \`datetime\`; no patching at all.
2. **Patch the module's name.** If \`shop.py\` did \`from datetime import datetime\`, then
   \`patch("shop.datetime")\` with \`fake.now.return_value = datetime(2026, 1, 5, 18, 0)\`.
3. **freezegun** (\`pip install freezegun\`): \`@freeze_time("2026-01-05 18:30:00")\` makes
   \`datetime.now()\` and \`date.today()\` return that moment everywhere.

## HTTP

The \`responses\` library intercepts \`requests\` calls:

    import responses

    @responses.activate
    def test_rate_lookup():
        responses.get("https://api.example.com/rates/USD", json={"rate": 83.2})
        assert rates.fetch_rate("USD") == 83.2
        responses.get("https://api.example.com/rates/XXX", status=404)
        with pytest.raises(requests.HTTPError):
            rates.fetch_rate("XXX")

Inside an activated test, a URL you did not register raises \`requests.ConnectionError\` instead of
reaching the internet, so a forgotten stub is loud. (For \`httpx\`, the equivalent is \`respx\` or
\`pytest-httpx\`.) Test the error paths — 404, 500, timeout via \`side_effect\` — because those are
what production actually hits.

## What not to mock

Mock the **edges you do not own** (network, clock, email, payment provider). Do not mock the code
you are testing, and be wary of mocking your own small classes: a test that only checks "the mock
was called" can pass while the real code is broken.`,
    workedExample: `**Problem.** \`notify_overdue(loans, mailer)\` emails each member whose loan is past due
today. Test it without sending mail and without depending on today's date.

    # library/notify.py
    from datetime import date

    def notify_overdue(loans, mailer, today=None):
        today = today or date.today()
        sent = 0
        for loan in loans:
            if loan["due"] < today:
                mailer.send(loan["email"], f"Book overdue: {loan['title']}")
                sent += 1
        return sent

**Isolate both edges.** The clock is injected (\`today=\`), so no patching is needed. The mailer is
passed in, so a Mock — with a spec, so a typo like \`mailer.snd\` fails — stands in for it.

    from datetime import date
    from unittest.mock import Mock, call
    from library.notify import notify_overdue

    class Mailer:
        def send(self, to, body): ...

    def test_only_overdue_loans_are_mailed():
        mailer = Mock(spec=Mailer)
        loans = [
            {"email": "a@x.in", "title": "Dune", "due": date(2026, 3, 1)},
            {"email": "b@x.in", "title": "Emma", "due": date(2026, 3, 9)},
        ]
        sent = notify_overdue(loans, mailer, today=date(2026, 3, 5))
        assert sent == 1
        assert mailer.send.call_args_list == [call("a@x.in", "Book overdue: Dune")]

**Add the failure path.** If the mailer raises for one member, should the rest still be mailed?
Write that down as a test with \`mailer.send.side_effect = [ConnectionError(), None]\` before deciding
— the test makes the behaviour a decision instead of an accident.`,
    mcqs: [
      mcq(`billing.py does \`from rates import fetch_rate\` and calls \`fetch_rate(cur)\`. Which patch makes \`billing.to_inr\` use a fake rate?

    def test_to_inr():
        with patch(???, return_value=80.0):
            assert billing.to_inr(2, "USD") == 160.0`, [
        ['"rates.fetch_rate", where the function is defined', false],
        ['"billing.fetch_rate", the name billing looks up', true],
        ['"requests.get", since fetch_rate calls it', false],
        ['"fetch_rate", which patches it in every module', false],
      ], 'from-import copies the reference into billing\'s namespace, so billing looks up billing.fetch_rate at call time. Patching rates.fetch_rate leaves billing\'s copy pointing at the real function, which then makes a real network call.'),
      mcq(`What happens on the third call?

    m = Mock(side_effect=[1, 2, ValueError("boom")])
    m()
    m()
    m()`, [
        ['It returns None, the default once the list is used', false],
        ['It returns 2 again, repeating the last value', false],
        ['It returns the ValueError object without raising', false],
        ['It raises ValueError("boom")', true],
      ], 'An iterable side_effect is consumed one item per call: values are returned, and an exception instance (or class) in the sequence is raised. A fourth call would raise StopIteration because the list is exhausted.'),
      mcq('Code under test calls `len(items)` and loops over `items`. Why does passing `Mock()` as `items` break, while `MagicMock()` works?', [
        ['Mock records calls but MagicMock does not, so it is lighter', false],
        ['Mock has no __len__ or __iter__; MagicMock pre-configures them', true],
        ['MagicMock is a spec\'d mock of list, Mock is not', false],
        ['Mock raises on every attribute access until configured', false],
      ], 'Plain Mock does not support magic methods, so len(Mock()) raises TypeError. MagicMock configures them with sensible defaults — len is 0, iteration yields nothing — which is also why patch creates MagicMocks.'),
    ],
    checkpoint: [
      mcq(`fetch_rate is defined as \`def fetch_rate(cur):\`. What does each fake do with this call?

    loose = Mock()
    strict = create_autospec(fetch_rate)
    loose("USD", "EXTRA")
    strict("USD", "EXTRA")`, [
        ['Both raise TypeError, since both know fetch_rate', false],
        ['loose raises TypeError; strict records the call', false],
        ['loose accepts the call; strict raises TypeError', true],
        ['Both accept it and record two positional arguments', false],
      ], 'A plain Mock accepts any arguments. create_autospec copies the real signature, so a call fetch_rate could never receive fails with "too many positional arguments" — catching a test that has drifted from the real API.'),
      mcq('A test tries `monkeypatch.setattr(datetime.datetime, "now", lambda: fixed)` to freeze the clock. What happens?', [
        ['It raises TypeError: the type is immutable', true],
        ['It works, and monkeypatch undoes it when the test ends', false],
        ['It works only with a classmethod, not with a lambda', false],
        ['It silently does nothing; now() keeps the real time', false],
      ], 'datetime.datetime is a built-in type implemented in C, and its attributes cannot be replaced. Inject the time as a parameter, patch the name in the module under test, or use freezegun.'),
      mcq(`What does this test see when fetch_rate("EUR") runs?

    @responses.activate
    def test_eur():
        responses.get("https://api.example.com/rates/USD", json={"rate": 83.2})
        rates.fetch_rate("EUR")`, [
        ['The USD response, the only one registered', false],
        ['A real request goes out to api.example.com', false],
        ['An empty 200 response with a JSON null body', false],
        ['requests.ConnectionError is raised', true],
      ], 'Inside an activated responses context every requests call is intercepted, and one with no matching registration raises ConnectionError rather than reaching the network — so a missing stub fails loudly.'),
    ],
  },

  /* ── COVERAGE_TDD ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_TESTING_COVERAGE_TDD',
    notes: `## Measuring coverage with pytest-cov

    pip install pytest-cov
    pytest --cov=app --cov-report=term-missing

\`--cov=app\` measures only your package (not the tests or libraries). \`term-missing\` adds the line
numbers no test executed:

    Name          Stmts   Miss  Cover   Missing
    -------------------------------------------
    app/fees.py       9      1    89%   10

\`--cov-report=html\` writes \`htmlcov/index.html\` with the unexecuted lines highlighted — the fastest
way to see what a suite skips.

## Line coverage misses branches

    def late_fee(days):
        fee = 0
        if days > 7:
            fee = 50
        return fee

    def test_late():
        assert late_fee(10) == 50

Every line runs, so line coverage is 100% — yet the case \`days <= 7\` was never tested. Add
\`--cov-branch\` and the report shows a partial branch, \`3->5\`: from line 3 the jump straight to line
5 (the \`if\` being false) never happened. Turn branch coverage on; it is the honest number.

## What coverage cannot tell you

Coverage records which lines **ran**, not whether anything **checked** them:

    def test_discount_member():
        discount(100, True)        # no assert — still counts as covered

So coverage cannot tell you whether assertions are strong, whether the expected values are right,
whether edge cases you never thought of exist, or whether the code does what the user needs. It is
useful in one direction: an uncovered line is definitely untested. \`--cov-fail-under=85\` makes the
run exit non-zero below 85% even when every test passed — fine as a floor in CI, harmful as a target
people game with assert-free tests.

## Shaping the suite — the pyramid

| Level | Example in a Python web app | How many | Speed |
|---|---|---|---|
| Unit | \`calculate_gst(amount, state)\` with plain asserts | many | milliseconds |
| Integration | a repository against a real MySQL in Docker, or a FastAPI route with \`TestClient\` | some | 10–500 ms |
| End-to-end | a browser (Playwright) logging in and placing an order | few | seconds each |

Most rules should be proven at the unit level, because a unit failure points at one function. Keep a
few end-to-end tests for the journeys that make money. A suite that is mostly browser tests is slow,
flaky and points nowhere when it fails.

Keep tests fast so people run them: mark the slow ones (\`@pytest.mark.slow\`) and run \`-m "not
slow"\` locally, everything in CI.

## TDD in pytest: red, green, refactor

1. **Red** — write one small failing test for the next behaviour. Run it and **see it fail**, for
   the reason you expect (not an ImportError).
2. **Green** — write the least code that passes. Hard-coding is allowed; the next test will force
   the real logic.
3. **Refactor** — with the tests green, clean up names and duplication, running \`pytest\` after each
   change.

A short session on \`slugify(title)\`:

    def test_lowercases_and_joins_with_dashes():
        assert slugify("Hello World") == "hello-world"        # red: NameError → write slugify

    def slugify(title):
        return title.lower().replace(" ", "-")                # green

    def test_strips_punctuation():
        assert slugify("Hi, there!") == "hi-there"            # red: got "hi,-there!"

    import re
    def slugify(title):
        words = re.findall(r"[a-z0-9]+", title.lower())
        return "-".join(words)                                # green; both tests pass

    @pytest.mark.parametrize("title, slug", [               # refactor the tests too
        ("Hello World", "hello-world"),
        ("Hi, there!", "hi-there"),
        ("  many   spaces ", "many-spaces"),
    ])
    def test_slugify(title, slug):
        assert slugify(title) == slug

TDD shines for logic with clear inputs and outputs and for bug fixes (write the failing test that
reproduces the bug first). It is awkward for exploratory UI work or a spike you will throw away —
write those tests after the shape settles.`,
    mcqs: [
      mcq(`With only this test, line coverage of late_fee is 100%. What does adding \`--cov-branch\` report?

    def late_fee(days):
        fee = 0
        if days > 7:
            fee = 50
        return fee

    def test_late():
        assert late_fee(10) == 50`, [
        ['Still 100%, because every line was executed', false],
        ['A missing line, since return fee runs only once', false],
        ['An error, as branch coverage needs an else clause', false],
        ['A partial branch: the if being false was never taken', true],
      ], 'Branch coverage tracks each possible jump. Only days > 7 was tested, so the path from the if straight to return (shown as 3->5) never ran, and the file drops below 100% even though every line executed.'),
      mcq('A test calls `discount(100, True)` and asserts nothing. The line it exercises shows as covered. What does that coverage prove?', [
        ['Only that the line ran without raising an exception', true],
        ['That discount returns the right value for members', false],
        ['That the member branch is tested for its boundaries', false],
        ['Nothing, because pytest-cov ignores tests with no assert', false],
      ], 'Coverage records execution, not verification. The test would pass and the line would stay covered even if discount returned the wrong number — which is why coverage cannot measure assertion quality.'),
      mcq(`Doing TDD, this is the first test and slugify does not exist yet. What is the next step?

    def test_lowercases_and_joins_with_dashes():
        assert slugify("Hello World") == "hello-world"`, [
        ['Write slugify fully, covering punctuation and spaces', false],
        ['Add five more tests first so the design is complete', false],
        ['Run the test, see it fail, then write the least code to pass', true],
        ['Measure coverage, which is 0%, then decide on the code', false],
      ], 'Red-green-refactor: run the new test and watch it fail for the expected reason, then make it pass with the smallest change. Later tests (punctuation, extra spaces) drive the rest of the logic.'),
    ],
    checkpoint: [
      mcq('`pytest --cov=app --cov-fail-under=90` runs; all 40 tests pass and total coverage is 77%. What is the result?', [
        ['Exit code 0 — coverage is only a report', false],
        ['A non-zero exit: the required 90% was not reached', true],
        ['pytest reruns the tests until coverage reaches 90%', false],
        ['The uncovered tests are marked as failed', false],
      ], '--cov-fail-under turns the coverage total into a pass/fail gate: pytest-cov prints "Required test coverage of 90% not reached" and the run exits non-zero, so CI fails even though every test passed.'),
      mcq(`What does the "Missing" column tell you in this report?

    Name          Stmts   Miss  Cover   Missing
    app/fees.py       9      1    89%   10`, [
        ['No test executed line 10 of app/fees.py', true],
        ['Line 10 has a failing assertion in some test', false],
        ['10 statements in the file have no test', false],
        ['Line 10 raised an exception during the run', false],
      ], 'With --cov-report=term-missing, the Missing column lists line numbers that never ran during the test session. Here 1 of 9 statements was missed, and it is line 10.'),
      mcq('A team\'s suite is 300 Playwright browser tests that take 35 minutes and fail randomly a few times a week. Which change helps most?', [
        ['Add retries to every browser test so the flakes pass', false],
        ['Raise the coverage gate so more code is exercised', false],
        ['Move most rules to unit and API-level tests, keep a few E2E', true],
        ['Run the browser suite once a week instead of per commit', false],
      ], 'Rules proven by fast unit tests (and FastAPI TestClient or repository tests) fail precisely and quickly. A handful of end-to-end journeys is enough at the top of the pyramid; retries and weekly runs hide problems.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_TESTING_DEBUGGING',
    notes: `Seven ways a pytest suite misleads you. Each one either runs nothing, passes when it should
fail, or fails for a reason that has nothing to do with the code. Symptom, cause, fix.

## 1. "no tests ran"

\`pytest\` prints *no tests ran* and exits with code 5. **Cause:** the files are named
\`tests_users.py\` or \`user_tests.py.txt\`, or the functions are \`check_*\`, or you ran pytest from a
folder above a \`testpaths\` setting that points elsewhere. **Fix:** name files \`test_*.py\` /
\`*_test.py\` and functions \`test_*\`; run \`pytest --collect-only -q\` to see what pytest would collect.

## 2. An assertion that can never fail

    assert (total == 60, "total should be 60")

**Cause:** the parentheses make a two-element tuple, and a non-empty tuple is always truthy. pytest
warns *PytestAssertRewriteWarning: assertion is always true, perhaps remove parentheses?* — which
scrolls past in a big run. **Fix:** \`assert total == 60, "total should be 60"\`. A close cousin is
\`return total == 60\`, which passes with only a *PytestReturnNotNoneWarning*. Run with
\`-W error::pytest.PytestReturnNotNoneWarning\` or read the warnings summary.

## 3. The mock that is never used

\`patch("rates.fetch_rate")\` and the test still makes a real HTTP call (or fails with
\`ConnectionError\` in CI). **Cause:** the module under test did \`from rates import fetch_rate\`, so it
has its own name. **Fix:** patch \`"billing.fetch_rate"\` — where it is looked up.

## 4. Passes in the suite, fails alone (or the reverse)

\`pytest -k test_two\` fails but \`pytest\` passes. **Cause:** a \`scope="module"\` or \`"session"\` fixture
returns a mutable object that tests modify, or a test changes a module-level global or
\`os.environ\` directly. **Fix:** keep mutable fixtures function-scoped; change environment and
globals with \`monkeypatch\` so they are restored; check with \`pip install pytest-randomly\`.

## 5. "fixture 'client' not found"

The fixture lives in \`tests/api/conftest.py\` and the failing test is in \`tests/web/\`. **Cause:**
conftest fixtures reach only their own folder and below. **Fix:** move it up to \`tests/conftest.py\`.
The error message lists every available fixture — read it; the name is often just misspelt.

## 6. import file mismatch

*import file mismatch: imported module 'test_utils' has this __file__ attribute ...* **Cause:** two
test files with the same basename (\`tests/api/test_utils.py\`, \`tests/web/test_utils.py\`) in
directories without \`__init__.py\`. **Fix:** rename one, or add \`__init__.py\` to the test folders;
delete stale \`__pycache__\` if the message persists after renaming.

## 7. A typo in a marker selects nothing

\`@pytest.mark.slwo\` on the slow tests, so \`pytest -m "not slow"\` still runs them for ten minutes.
**Cause:** unknown markers are only a warning by default. **Fix:** register markers in
\`pyproject.toml\` and add \`--strict-markers\` to \`addopts\`; the typo becomes a collection error.

## 8. A mock assertion that asserts nothing

\`mailer.send.called_once_with("a@x.in")\` — no \`assert_\` prefix. On Python before 3.12 this just
created a new child mock and **passed**; 3.12+ raises AttributeError for this misspelling. **Fix:**
always use the \`assert_called_once_with\` family, or compare \`call_args_list\` with \`==\` inside a
plain \`assert\`, and build mocks with \`spec\` / \`autospec\`.`,
    mcqs: [
      mcq('After `pytest`, the summary shows a `PytestAssertRewriteWarning: assertion is always true` pointing at `assert (len(cart) == 2, "two items expected")`. What is wrong?', [
        ['The parentheses make a non-empty tuple, which is always true', true],
        ['len() cannot be called inside an assert statement', false],
        ['pytest cannot rewrite an assert that carries a message', false],
        ['The message must come first, before the comparison', false],
      ], 'assert (x, "msg") asserts a two-element tuple, and any non-empty tuple is truthy, so the test can never fail. Remove the parentheses: assert len(cart) == 2, "two items expected".'),
      mcq('`pytest -k test_two` fails, but a full `pytest` run passes. test_two uses a `scope="session"` fixture returning a dict. What is the most likely cause?', [
        ['-k skips fixtures, so the dict is never created', false],
        ['Session fixtures only work when every test in the session is selected', false],
        ['-k runs tests in reverse order, breaking the fixture', false],
        ['test_two depends on another test having changed the shared dict', true],
      ], 'A session-scoped fixture returns the same dict to every test. In the full run an earlier test mutates it into the state test_two expects; alone, test_two sees the pristine dict. Make the fixture function-scoped or stop mutating it.'),
      mcq('The slow tests are marked `@pytest.mark.slwo`, and `pytest -m "not slow"` still runs them. Which setting would have caught this at collection?', [
        ['-x, which stops the run on the first suspicious test', false],
        ['-v, which prints the marker names next to each test', false],
        ['--strict-markers, with the marker registered', true],
        ['--lf, which reruns only the tests that failed last time', false],
      ], 'By default an unknown marker is only a PytestUnknownMarkWarning. With markers registered and --strict-markers in addopts, "slwo" is unregistered, so collection fails and names the typo.'),
      mcq('A test in `tests/web/test_pages.py` errors with `fixture \'client\' not found`. The fixture is defined in `tests/api/conftest.py`. What fixes it?', [
        ['Import client from tests.api.conftest in test_pages.py', false],
        ['Move client into tests/conftest.py, above both folders', true],
        ['Rename the fixture so pytest re-indexes it', false],
        ['Add autouse=True to the client fixture', false],
      ], 'A conftest.py serves its own directory and the ones below it, so tests/web cannot see tests/api/conftest.py. Moving the fixture to the shared parent makes it visible to both, with no imports.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_TESTING_PRACTICE',
    notes: `Six exercises. Create a small project (\`src/\` or a flat folder plus \`tests/\`), a virtual
environment, and \`pip install pytest pytest-cov responses freezegun\`. For each one, run the test and
watch it **fail first** — break the code on purpose if you must — so you know it can.

**Exercise 1 — A validator, fully pinned.** Write \`validate_pin(code: str) -> str\` for Indian PIN
codes: exactly six digits, not starting with 0, surrounding spaces stripped; return the clean code or
raise \`ValueError\` with a message saying what is wrong. Test it with one \`parametrize\` for valid
inputs (\`"560001"\`, \`" 110011 "\`) and one for invalid inputs with \`ids\` (\`"empty"\`, \`"five-digits"\`,
\`"leading-zero"\`, \`"letters"\`), using \`pytest.raises(..., match=...)\`.

**Exercise 2 — A fixture with teardown.** Write a \`yield\` fixture that creates an \`sqlite3\` in-memory
database with a \`students\` table and closes it after the test. Write two tests that each insert a row
and assert the count is 1 — they must pass in any order. Then change the fixture to
\`scope="module"\` and explain the failure you get.

**Exercise 3 — Files and output.** \`export_csv(rows, path)\` writes a header and rows; \`summary(rows)\`
prints \`"<n> students, average <avg:.1f>"\`. Test the file with \`tmp_path\` and the print with
\`capsys\`, including the empty-list case (decide what it should print and test that).

**Exercise 4 — Patch in the right place.** Put \`fetch_weather(city)\` (uses \`requests.get\`) in
\`weather.py\` and \`advice(city)\` in \`planner.py\` using \`from weather import fetch_weather\`. Write one
test that patches the wrong target and observe the real call (or the ConnectionError offline), then
fix the target. Add an \`autospec=True\` version and call the fake with a wrong argument count to see
it refuse.

**Exercise 5 — HTTP and time.** Test \`fetch_weather\` with \`responses\` for 200, 404 and a timeout
(\`responses.get(url, body=requests.Timeout())\`). Then test a \`greeting()\` that depends on the hour:
first by injecting \`now\`, then with \`@freeze_time\`. Note which version you would rather maintain.

**Exercise 6 — Coverage and TDD.** Run \`pytest --cov=. --cov-branch --cov-report=term-missing\` over
exercises 1–5 and close any partial branch that matters. Then build \`split_bill(total, people,
tip_percent=0)\` test-first: one failing test at a time (even split, rounding so the parts add up to
the total in paise, zero people refused, tip), committing after each green.`,
    mcqs: [
      mcq(`In Exercise 2 the fixture is changed to scope="module". Each test inserts one row and asserts the table holds 1 row. What happens?

    @pytest.fixture(scope="module")
    def conn():
        c = sqlite3.connect(":memory:")
        c.execute("CREATE TABLE students (name TEXT)")
        yield c
        c.close()`, [
        ['The second test to run sees 2 rows and fails', true],
        ['Both pass; sqlite clears an in-memory table per test', false],
        ['Both fail, since module fixtures cannot yield', false],
        ['The first test fails because the table is created late', false],
      ], 'With module scope both tests share one connection and one in-memory database, so the second insert makes the count 2. Function scope gives each test its own empty database, which is why it is the default.'),
      mcq('Exercise 1 checks `validate_pin("05600")` with `pytest.raises(ValueError)` and no `match=`. Why is adding `match` worth it here?', [
        ['Without match, pytest.raises accepts any exception type at all', false],
        ['match makes the test run faster by skipping the traceback output', false],
        ['pytest.raises without match only works with custom exception classes', false],
        ['The input breaks two rules; match proves which one was reported', true],
      ], '"05600" is both five digits and starts with 0. A bare pytest.raises(ValueError) passes whichever check fires; match="six digits" (or "start with 0") pins the message the user will see.'),
      mcq('Exercise 4\'s planner.py does `from weather import fetch_weather`. You patch `"weather.fetch_weather"` with `autospec=True`. What does `advice("Pune")` use?', [
        ['The autospec fake, since autospec follows imports', false],
        ['A TypeError, because planner\'s call does not match the spec', false],
        ['The real fetch_weather, because planner kept its own reference', true],
        ['Nothing, the call is skipped while the patch is active', false],
      ], 'autospec checks signatures but does not change where patch applies. planner bound fetch_weather into its own namespace at import, so only patching "planner.fetch_weather" reaches the code under test.'),
      mcq('In Exercise 5 you register `responses.get(url, body=requests.Timeout())`. What does `requests.get(url, timeout=5)` do inside the test?', [
        ['Returns a response whose body is the text "Timeout"', false],
        ['Raises the requests.Timeout exception immediately', true],
        ['Waits 5 seconds and then raises a real timeout', false],
        ['Returns status 408 with an empty body', false],
      ], 'When the registered body is an exception instance, responses raises it from the request, with no waiting. That is how you test the timeout path in milliseconds.'),
      mcq('Exercise 6\'s split_bill must give parts that add up to the total. Which first test best starts the TDD cycle?', [
        ['assert split_bill(100, 0) raises ValueError', false],
        ['assert split_bill(100, 3, tip_percent=10) == [36.67, 36.67, 36.66]', false],
        ['assert sum(split_bill(100, 3)) == 100 for 1,000 random totals', false],
        ['assert split_bill(90, 3) == [30, 30, 30]', true],
      ], 'Start with the simplest behaviour that forces the function to exist and return the right shape — an even split. Rounding, the zero-people refusal and tips each get their own red-green step afterwards.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_TESTING_INTERVIEW_QUESTION',
    notes: `Three questions Python backend interviews ask about testing, with an answer that gets you
through and the follow-up a good answer earns.

## 1. "What is a pytest fixture, and how is it different from setUp in unittest?"

**Model answer.** A fixture is a function decorated with \`@pytest.fixture\` that provides something a
test needs; the test requests it by naming it as a parameter. Unlike \`setUp\`, which runs for every
test in a class whether it needs the thing or not, a fixture is used only by tests that ask for it,
fixtures can depend on other fixtures, they can live in \`conftest.py\` and be shared without imports,
and teardown sits right next to setup after a \`yield\`. Scope (\`function\` up to \`session\`) controls
how often it is built — for example one database container per session but one transaction per
test, rolled back after \`yield\`.

**Follow-up:** "When would you use session scope, and what is the risk?" For something expensive and
read-only: a started Docker container, a loaded model, a compiled schema. The risk is shared mutable
state — if a test changes it, later tests depend on order. Pair a session-scoped resource with a
function-scoped fixture that gives each test a clean slice (a transaction, a temp schema).

## 2. "How do you test code that calls an external API?"

**Model answer.** Not against the real API in unit tests — it is slow, flaky, rate-limited and may
cost money. I isolate the HTTP layer: either the code takes a client I can pass a fake to, or I
intercept the request with \`responses\` (for requests) or \`respx\` (for httpx) and register the
responses I need — success, 404, 500 and a timeout — so the error handling is tested too. When I use
\`unittest.mock.patch\`, I patch where the name is looked up (\`"billing.fetch_rate"\` if billing did a
from-import) and use \`autospec=True\` so the fake keeps the real signature. A small number of contract
or integration tests run against a sandbox environment separately.

**Follow-up:** "Your mock-based tests passed but production broke when the API changed its JSON —
how do you prevent that?" Mocks only encode my assumption about the API. Add a contract check: a
scheduled test against the provider's sandbox, or a schema (pydantic model) the response must
validate against, so a change fails a test rather than a customer request.

## 3. "Is 90% coverage good? What does coverage tell you?"

**Model answer.** Coverage tells you which lines (with \`--cov-branch\`, which branches) ran during the
tests. It cannot tell you whether those tests asserted anything meaningful — a test with no
\`assert\` still covers lines. So a low number is a reliable warning, and a high number is not proof
of quality. I use branch coverage, look at *which* lines are missing (error handling and edge cases
are the usual gaps), and use a modest \`--cov-fail-under\` as a floor so coverage does not quietly
fall, not as a target.

**Follow-up:** "How would you check that the tests actually catch bugs?" Break the code on purpose —
flip a \`>=\` to \`>\` and see if a test fails — which is what mutation testing (\`mutmut\`) automates.
Surviving mutants show weak assertions that coverage cannot see.`,
    mcqs: [
      mcq('An interviewer asks how to share one Postgres container across a test run but keep tests independent. Which fixture design fits?', [
        ['Session scope for the container, function scope per transaction', true],
        ['One function-scoped fixture that starts a fresh container for every test', false],
        ['One session-scoped fixture whose single connection every test writes to', false],
        ['An autouse module fixture that deletes all the tables at the end of the file', false],
      ], 'The expensive resource is built once (session scope), while each test gets a transaction opened before yield and rolled back after, so no test sees another\'s writes. A container per test is far too slow; a shared writable connection couples tests.'),
      mcq('Mock-based tests for a payment client all pass, but production breaks when the provider renames a JSON field. What would have caught it?', [
        ['Switching every Mock in those tests to a MagicMock', false],
        ['A contract test against the sandbox, or schema validation', true],
        ['Raising the coverage gate on the payment client module', false],
        ['Running the mocked tests in a random order on every commit', false],
      ], 'Mocks encode your assumption about the API, so they keep passing when reality changes. A scheduled test against the provider\'s sandbox, or validating responses against a model, notices the change.'),
      mcq('A candidate says: "Our suite has 95% coverage, so the code is well tested." Which reply shows the best understanding?', [
        ['95% is too low; only 100% line coverage proves correctness', false],
        ['Coverage is meaningless, so it should not be measured at all', false],
        ['Coverage proves the lines ran; it says nothing about the asserts', true],
        ['Branch coverage would make 95% a guarantee of correctness', false],
      ], 'Coverage is a one-way signal: uncovered code is untested, but covered code may be checked weakly or not at all. Mutation testing or reading the assertions is how you judge the tests themselves.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_TESTING_CHECKPOINT',
    notes: `Ten questions across the topic: discovery and plain assert, fixtures and scopes, parametrize,
mocking and where to patch, time and HTTP, coverage and test design. Most show a small test file and
ask what pytest does with it. Decide what is collected, which fixture instance each test gets, and
which name a patch replaces before you read the options.`,
    checkpoint: [
      mcq(`What does pytest collect from this file, test_orders.py?

    def test_total():
        assert 2 + 2 == 4

    def check_tax():
        assert 18 == 18

    class TestRefund:
        def test_full(self):
            assert True`, [
        ['test_total and TestRefund::test_full', true],
        ['Only test_total', false],
        ['test_total, check_tax and TestRefund::test_full', false],
        ['Only TestRefund::test_full', false],
      ], 'Functions must start with test and classes with Test (without __init__). check_tax matches neither rule, so it is treated as a helper and never runs.'),
      mcq(`Which decorator stack gives these two mocks to the test in this order?

    def test_charge(mock_fetch, mock_send):
        ...`, [
        ['@patch("app.fetch") above @patch("app.send")', false],
        ['@patch("app.send") above @patch("app.fetch")', true],
        ['Either order — patch matches arguments by name', false],
      ], 'Decorators apply bottom-up, so the patch nearest the function supplies the first mock argument. For mock_fetch to come first, @patch("app.fetch") must be the lower decorator, with app.send above it.'),
      mcq(`How many tests run, and with what ids?

    @pytest.mark.parametrize("raw, expected", [
        ("10", 10), ("0", 0), (" 7 ", 7),
    ], ids=["ten", "zero", "padded"])
    def test_parse(raw, expected):
        assert int(raw) == expected`, [
        ['One test that loops over three cases', false],
        ['Three: test_parse[0], test_parse[1], test_parse[2]', false],
        ['Three: test_parse[10-10], test_parse[0-0], test_parse[ 7 -7]', false],
        ['Three: test_parse[ten], test_parse[zero], test_parse[padded]', true],
      ], 'Each tuple becomes its own test, and ids= replaces the generated ids. Without ids, pytest would build ids from the values; with them, a failure names the case directly, such as test_parse[padded].'),
      mcq('A `yield` fixture opens a file, but the line before `yield` raises `FileNotFoundError`. How does pytest report the test that requested it?', [
        ['As ERROR at setup, and the code after yield does not run', true],
        ['As FAILED, with the teardown after yield still being run', false],
        ['As SKIPPED, because its fixture was unavailable', false],
        ['As PASSED, since the test body never executed', false],
      ], 'An exception in fixture setup is reported as an error, not a test failure, and since the generator never reached yield there is no teardown to run. Errors point at the fixture, failures at the code under test.'),
      mcq(`shop.py does \`from datetime import datetime\` and is_happy_hour() reads datetime.now(). Which test reliably makes it 18:00?`, [
        ['monkeypatch.setattr(datetime.datetime, "now", fake_now) inside the test', false],
        ['with patch("datetime.now", return_value=datetime(2026, 1, 5, 18))', false],
        ['patch("shop.datetime"), then set its now.return_value to 18:00', true],
        ['monkeypatch.setenv("TZ", "18:00") before calling is_happy_hour()', false],
      ], 'shop looks up its own name datetime, so replacing shop.datetime with a mock whose now() returns a fixed value controls the clock. The built-in type cannot be modified, and "datetime.now" is not a module attribute that patch can target.'),
      mcq(`Which statement about this test is true?

    def test_member_discount():
        discount(100, True)`, [
        ['It fails, because every pytest test must contain an assert', false],
        ['pytest-cov leaves its lines out, since nothing is asserted', false],
        ['It is reported as XFAIL until an assert statement is added', false],
        ['It passes, and the lines it runs count as covered', true],
      ], 'A test with no assertion passes as long as nothing raises, and the lines it executes count as covered. Coverage measures execution, not checking — this is exactly what it cannot detect.'),
      mcq(`What is in received after this test?

    received = []

    @pytest.fixture
    def tracker():
        received.append("setup")
        yield
        received.append("teardown")

    def test_a(tracker):
        assert False

    def test_b(tracker):
        pass`, [
        ['["setup", "teardown", "setup", "teardown"]', true],
        ['["setup", "setup", "teardown", "teardown"]', false],
        ['["setup", "setup"]', false],
        ['["setup", "teardown", "setup"]', false],
      ], 'The fixture is function-scoped, so it is set up and torn down around each test, and the teardown after yield runs even though test_a failed. Two tests give two setup/teardown pairs.'),
      mcq('A retry helper should call `send()` up to three times and succeed if any attempt does. Which fake best tests "fails twice, then succeeds"?', [
        ['Mock(side_effect=[ConnectionError(), ConnectionError(), "ok"])', true],
        ['Mock(return_value="ok") with call_count checked afterwards', false],
        ['Mock(side_effect=ConnectionError) for every call', false],
        ['MagicMock(), relying on its truthy default return value', false],
      ], 'A list side_effect plays out call by call: the first two raise, the third returns "ok". Asserting the result is "ok" and call_count == 3 tests the retry exactly; a constant return or constant error tests only one path.'),
      mcq('`pytest -m "not slow"` is run on a project with no marker configuration, and some tests carry `@pytest.mark.slow`. What happens?', [
        ['It errors, since slow was never registered', false],
        ['The slow tests are deselected; pytest warns the mark is unknown', true],
        ['Every test runs, because -m ignores marks that were never registered', false],
        ['Only the slow tests run, as -m inverts unknown markers', false],
      ], 'Selection by -m works on any marker, registered or not; an unregistered one only produces PytestUnknownMarkWarning. It becomes an error only with --strict-markers.'),
      mcq('A login flow is tested only by 40 browser tests. A bug in `hash_password()` makes 38 of them fail with "timeout waiting for #dashboard". What does adding unit tests for `hash_password()` give you?', [
        ['Nothing new, since the browser tests already catch the bug', false],
        ['Higher coverage, which removes the need for browser tests', false],
        ['A fast failure that names the function, not 38 vague ones', true],
        ['Fewer flaky runs, because unit tests retry automatically', false],
      ], 'A unit test fails in milliseconds and points at the exact function and input. End-to-end failures show only a symptom far from the cause, which is why most rules belong at the bottom of the pyramid.'),
    ],
  },
];
