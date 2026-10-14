/**
 * Career-track content: testing Django (JT_DJANGO_TESTING), for Python Full Stack + AI.
 *
 * The student arrives with the library API built through JT_DJANGO_CORE, JT_DJANGO_ORM, JT_DRF and
 * JT_DJANGO_AUTH (books, authors, members and loans on MySQL, Simple JWT, staff-only writes and
 * per-member ownership), and with pytest itself from JT_PY_TESTING (discovery, fixtures, scopes,
 * parametrize, mocking). This topic does not re-teach pytest; it teaches what pytest-django and DRF
 * add on top: the settings module, the django_db mark and the test database, transactions, query
 * counting, APIClient and authentication in tests, the 401/403/404 rules, the settings and
 * mailoutbox fixtures, and factory_boy.
 *
 * Every output, status code, JSON body and error message quoted here was produced by running the
 * tests under Django 5.2, Django REST Framework 3.18, Simple JWT 5.5, pytest 9.1, pytest-django 4.14
 * and factory_boy 3.3 on Python 3.13, against SQLite. MySQL behaviour (test database naming,
 * privileges, collation) is stated as Django documents it, and the text says so.
 *
 * The topic declares AUTOMATED_TESTING and DJANGO_REST. Checkpoint questions default to
 * AUTOMATED_TESTING; the ones that measure knowing what DRF itself does (status codes, ownership,
 * request formats) are tagged DJANGO_REST.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_DJANGO_TESTING_BUNDLES: PilotBundle[] = [
  /* ── PYTEST_DJANGO ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_TESTING_PYTEST_DJANGO',
    notes: `You already know pytest. **pytest-django** is the plugin that lets pytest run tests against a
Django project: it configures Django before collection, builds a test database, wraps each test in a
transaction, and adds Django-aware fixtures. Install it with \`pip install pytest-django\` (4.x
supports Django 4.2 and 5.x).

## Telling pytest which settings to use

Django cannot start without a settings module. Put it in \`pytest.ini\` (or \`pyproject.toml\`) at the
project root, next to \`manage.py\`:

    # pytest.ini
    [pytest]
    DJANGO_SETTINGS_MODULE = config.settings_test
    python_files = test_*.py

    # or pyproject.toml
    [tool.pytest.ini_options]
    DJANGO_SETTINGS_MODULE = "config.settings_test"

The header of every run confirms what was picked up:
\`django: version: 5.2.18, settings: config.settings_test (from ini)\`. The order of precedence is
the \`--ds\` command-line option, then the \`DJANGO_SETTINGS_MODULE\` environment variable, then the
ini file — so a stale variable exported in your shell silently wins over \`pytest.ini\`, and the
header says \`(from env)\`.

A small **test settings module** that imports the real one and changes only what tests need is
worth having from day one:

    # config/settings_test.py
    from .settings import *

    # Django's default hasher is deliberately slow; tests create many users.
    PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

On the library API this one line took 15 API tests from **9.2 s to 0.6 s**, because every
\`create_user\` and every JWT login hashes a password. MD5 is fine here and nowhere else.

## The database is locked by default

A test that touches the ORM without asking for the database fails:

    from library.models import Author

    def test_count_authors():
        assert Author.objects.count() == 0

    E   RuntimeError: Database access not allowed, use the "django_db" mark,
        or the "db" or "transactional_db" fixtures to enable it.

This is deliberate: tests that do not need a database stay fast and cannot accidentally depend on
one. Opt in per test, per module, or through a fixture:

    import pytest

    @pytest.mark.django_db
    def test_count_authors():
        assert Author.objects.count() == 0

    pytestmark = pytest.mark.django_db        # every test in this module

    @pytest.fixture
    def member(db):                           # requesting "db" enables access
        return User.objects.create_user("asha", password="pass1234")

A fixture that requests \`db\` gives database access to every test that uses the fixture, which is
why most suites never write the mark on API tests — the \`member\` fixture brings it.

## The test database

pytest-django creates the test database **once per run**, the first time a test needs it (a run
of only non-database tests never creates one), applies your migrations to it, and destroys it at the
end. Your development data is never touched.

- **SQLite:** the test database is in memory by default
  (\`connection.settings_dict["NAME"]\` reads \`file:memorydb_default?mode=memory&cache=shared\`
  inside a test), so it is fast and needs no setup.
- **MySQL** (as Django documents it): the test database is \`test_\` + your \`NAME\`
  (\`test_library\`), created with \`CREATE DATABASE\`, so the user in your settings needs the
  privilege to create and drop databases. Set its character set in the \`TEST\` dict:

        DATABASES = {"default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": "library", "USER": "library_app", "PASSWORD": env("DB_PASSWORD"),
            "TEST": {"NAME": "test_library", "CHARSET": "utf8mb4", "COLLATION": "utf8mb4_0900_ai_ci"},
        }}

Two flags save time on a real database: \`--reuse-db\` keeps the test database between runs (no
create, no migrate), and \`--create-db\` forces a fresh one after you change migrations.

**SQLite locally, MySQL in CI.** Many teams run SQLite on laptops and the real engine in CI (a
MySQL service container in GitHub Actions). That is reasonable as long as CI is the judge, because
the engines differ in ways tests notice. Run on SQLite, \`Book.objects.create(title="x" * 300)\` on a
\`CharField(max_length=200)\` saves all 300 characters (SQLite does not enforce VARCHAR length), and
\`filter(title="clean code")\` does not find "Clean Code" — while MySQL's default \`_ci\` collation
compares case-insensitively and would find it, and strict mode rejects the long title. A bug that
only exists on MySQL can only be caught on MySQL.

## One transaction per test

\`@pytest.mark.django_db\` wraps each test in a transaction and **rolls it back** afterwards, so
every test starts with empty tables (plus whatever data migrations inserted):

    @pytest.mark.django_db
    def test_create_one():
        Author.objects.create(name="Premchand")
        assert Author.objects.count() == 1

    @pytest.mark.django_db
    def test_starts_empty():
        assert Author.objects.count() == 0      # passes in any order

Because nothing is ever committed, two things behave differently from production:

- **\`transaction.on_commit\` callbacks never run.** A service that sends its email in
  \`on_commit\` sends nothing in the test.
- Code that needs a **second connection to see committed rows** (a thread, \`select_for_update\`
  races) sees nothing.

For those, \`@pytest.mark.django_db(transaction=True)\` (or the \`transactional_db\` fixture) really
commits and then **empties every table** after the test. It is much slower, so use it only where
the commit is the point. For on_commit alone there is a cheaper tool:

    @pytest.mark.django_db
    def test_due_reminder_sent(mailoutbox, django_capture_on_commit_callbacks):
        with django_capture_on_commit_callbacks(execute=True):
            send_due_reminder(loan)         # registers send_mail in on_commit
        assert len(mailoutbox) == 1

pytest-django also **reorders** the run: tests that use the database go first, transactional ones
after them, and tests with no database last — so a transactional test's flush cannot surprise an
ordinary one.

## Django's TestCase still works

Existing \`django.test.TestCase\` classes run under pytest unchanged; pytest-django handles their
database setup:

    from django.test import TestCase

    class LoanTests(TestCase):
        @classmethod
        def setUpTestData(cls):          # once per class, rolled back after the class
            cls.member = User.objects.create_user("ravi")
            cls.book = Book.objects.create(isbn="9780132350884", title="Clean Code", author=...)

        def test_borrow(self):
            Loan.objects.create(member=self.member, book=self.book)
            self.assertEqual(Loan.objects.count(), 1)

New code is usually written as plain functions with fixtures, because fixtures compose and are
shared through \`conftest.py\`; mixing both styles in one project is fine.

## Counting queries

An N+1 bug is invisible in a test that only checks the result. Pin the number of queries:

    @pytest.mark.django_db
    def test_book_list_is_one_query(django_assert_num_queries):
        BookFactory.create_batch(3)
        with django_assert_num_queries(1):
            names = [b.author.name for b in Book.objects.select_related("author")]

Remove \`select_related\` and it fails with
\`Expected to perform 1 queries but 4 were done (add -v option to show queries)\` — one for the books
and one per author — and \`-v\` prints all four SQL statements. \`django_assert_max_num_queries(n)\`
allows *up to* n, and \`TestCase.assertNumQueries(n)\` is the class-based equivalent.

## Two built-in fixtures you will use constantly

- **\`settings\`** — change a setting for one test; it is restored afterwards:

        @pytest.mark.django_db
        def test_loan_limit(settings):
            settings.MAX_ACTIVE_LOANS = 1
            ...

- **\`mailoutbox\`** — pytest-django switches the email backend to the in-memory
  \`locmem.EmailBackend\` for tests (even if settings say SMTP), and \`mailoutbox\` is the list of
  messages sent during the test: \`mailoutbox[0].to\`, \`.subject\`, \`.body\`.

## Common mistakes

- Expecting the mark on a helper to cover the test: the test, or one of its fixtures, must request
  database access.
- Using \`transaction=True\` everywhere "to be safe": the suite becomes several times slower.
- Asserting that an on_commit email was sent in a plain \`django_db\` test, and "fixing" it by
  calling the function twice.
- Trusting a green SQLite run for MySQL-specific behaviour.`,
    workedExample: `**Problem.** \`borrow(member, book)\` in \`library/services.py\` refuses a loan when the member
already has \`settings.MAX_ACTIVE_LOANS\` active loans, creates the loan, and emails the member.
Test both paths without touching the real limit of 3 or a real mail server.

    # library/services.py
    def borrow(member, book):
        active = Loan.objects.filter(member=member, returned_on__isnull=True).count()
        if active >= settings.MAX_ACTIVE_LOANS:
            raise LoanRefused(f"limit of {settings.MAX_ACTIVE_LOANS} active loans reached")
        loan = Loan.objects.create(member=member, book=book)
        send_mail("Loan confirmed", f"You borrowed {book.title}",
                  "library@example.com", [member.email])
        return loan

**Step 1 — decide what each test needs.** Both need the database (the service queries and creates),
so both get \`django_db\`. The limit is a setting, so the \`settings\` fixture lowers it to 1 — one
loan is then enough to reach it, instead of three. The email goes through Django's mail API, so
\`mailoutbox\` captures it.

**Step 2 — the happy path.**

    @pytest.mark.django_db
    def test_borrow_creates_loan_and_emails(mailoutbox):
        member = User.objects.create_user("asha", email="asha@example.com")
        book = Book.objects.create(isbn="9780132350884", title="Clean Code",
                                   author=Author.objects.create(name="Robert Martin"))

        loan = borrow(member, book)

        assert loan.returned_on is None
        assert Loan.objects.filter(member=member).count() == 1
        assert len(mailoutbox) == 1
        assert mailoutbox[0].to == ["asha@example.com"]
        assert mailoutbox[0].subject == "Loan confirmed"

**Step 3 — the refusal.** A tiny helper keeps the setup short (the FACTORIES unit replaces it):

    def make_book(isbn):
        author, _ = Author.objects.get_or_create(name="Robert Martin")
        return Book.objects.create(isbn=isbn, title=f"Book {isbn}", author=author)

    @pytest.mark.django_db
    def test_borrow_refused_at_limit(settings, mailoutbox):
        settings.MAX_ACTIVE_LOANS = 1
        member = User.objects.create_user("ravi", email="ravi@example.com")
        borrow(member, make_book("9780000000001"))

        with pytest.raises(LoanRefused, match="limit of 1"):
            borrow(member, make_book("9780000000002"))

        assert Loan.objects.filter(member=member).count() == 1
        assert len(mailoutbox) == 1          # only the first loan's email

**Step 4 — check it can fail.** Change \`>=\` to \`>\` in the service: the refusal test fails because
the second loan is created. Put it back.

The last two assertions matter: a refusal must leave **no** loan and send **no** extra email, and
only asserting the exception would not prove either. Run both tests in either order — each starts
from an empty, rolled-back database, so neither depends on the other.`,
    mcqs: [
      mcq('`pytest.ini` says `DJANGO_SETTINGS_MODULE = config.settings_test`, but the run header shows `settings: config.settings (from env)`. Why?', [
        ['pytest.ini is read only when pytest is started via manage.py', false],
        ['An exported environment variable outranks the ini file', true],
        ['pytest-django ignores ini keys written in upper case', false],
        ['The test settings module failed to import, so Django fell back', false],
      ], 'pytest-django resolves the settings module from --ds first, then the environment variable, then the ini file. A variable left exported in the shell wins, and the header says "(from env)". Unset it or pass --ds.'),
      mcq(`What happens when pytest runs this test?

    def test_no_books_yet():
        assert Book.objects.count() == 0`, [
        ['It passes, since the test database starts empty', false],
        ['It is skipped with a reason saying the database is not enabled', false],
        ['It fails with RuntimeError: Database access not allowed', true],
        ['It queries the development database and passes or fails by data', false],
      ], 'pytest-django blocks database access unless the test has the django_db mark or requests the db or transactional_db fixture (directly or through another fixture). The error message names all three ways in.'),
      mcq('A service registers `transaction.on_commit(lambda: send_mail(...))`. In a test marked only `@pytest.mark.django_db`, `mailoutbox` stays empty. What is the cheapest fix?', [
        ['Wrap the call in django_capture_on_commit_callbacks(execute=True)', true],
        ['Mark the test @pytest.mark.django_db(transaction=True) everywhere', false],
        ['Switch EMAIL_BACKEND to SMTP in the test settings file', false],
        ['Call transaction.commit() inside the test body after the service', false],
      ], 'The django_db test runs inside a transaction that is rolled back, so on_commit callbacks never fire. The capture fixture collects them and, with execute=True, runs them; transaction=True also works but flushes every table and is far slower.'),
    ],
    checkpoint: [
      mcq(`Run in this file order, what is the result?

    @pytest.mark.django_db
    def test_add_author():
        Author.objects.create(name="Premchand")
        assert Author.objects.count() == 1

    @pytest.mark.django_db
    def test_authors_empty():
        assert Author.objects.count() == 0`, [
        ['The second test fails, since the first one committed its row', false],
        ['Both pass, as each test is rolled back when it ends', true],
        ['Both fail, as the test database is shared by the run', false],
        ['The first test fails, as create() needs transaction=True', false],
      ], 'pytest-django wraps each django_db test in a transaction and rolls it back afterwards, so the author created by the first test is gone before the second starts. Order does not matter.'),
      mcq(`Which statement about this test is true, given the view uses Book.objects.all() without select_related?

    def test_list(api_client_as_member, django_assert_num_queries):
        BookFactory.create_batch(3)
        with django_assert_num_queries(1):
            api_client_as_member.get("/api/books/")   # serializer reads book.author.name`, [
        ['It passes, because the serializer reuses one connection', false],
        ['It passes, because the test database caches related rows', false],
        ['It fails, reporting 4 queries were done instead of 1', true],
        ['It fails because query counting needs transaction=True', false],
      ], 'One query loads the books and the serializer then triggers one query per author: 4 in all. django_assert_num_queries reports "Expected to perform 1 queries but 4 were done"; select_related("author") brings it to 1.'),
      mcq('A test changes `settings.MAX_ACTIVE_LOANS = 1` through the `settings` fixture. What does the next test see?', [
        ['1, until a test sets it back explicitly', false],
        ['1, but only in tests in the same module', false],
        ['The original value, since the fixture restores it', true],
        ['An AttributeError, since the setting was deleted', false],
      ], 'The settings fixture records each change and undoes it when the test finishes, exactly like override_settings. That is why it is preferred over assigning to django.conf.settings directly, which would leak into later tests.'),
    ],
  },

  /* ── API_TESTS ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_TESTING_API_TESTS',
    notes: `A service test proves the rules; an **API test** proves what a client actually gets: the URL is
routed, the user is authenticated, the permission is checked, the serializer validates, and the
response has the right status and JSON. DRF ships the tools in \`rest_framework.test\`.

## APIClient

\`APIClient\` sends requests through the whole Django stack (URLs, middleware, view, renderer)
without a server:

    from rest_framework.test import APIClient

    @pytest.fixture
    def api_client():
        return APIClient()

    @pytest.mark.django_db
    def test_books_need_login(api_client):
        response = api_client.get("/api/books/")
        assert response.status_code == 401
        assert response.json() == {"detail": "Authentication credentials were not provided."}

Two habits to adopt immediately:

- **Pass \`format="json"\`** on \`post\`, \`put\` and \`patch\`. The default request format is
  **multipart** — a request sent without it goes out as \`multipart/form-data\`, which happens to
  work for flat fields but not for nested objects or lists. Or set it once:
  \`REST_FRAMEWORK = {..., "TEST_REQUEST_DEFAULT_FORMAT": "json"}\`.
- **Prefer \`reverse()\` to hard-coded URLs** once the suite grows. A router registered as
  \`router.register("books", BookViewSet)\` names its routes \`book-list\` and \`book-detail\`:
  \`reverse("book-list")\` is \`/api/books/\` and \`reverse("book-detail", args=[5])\` is
  \`/api/books/5/\`.

## Asserting the response

    def test_librarian_adds_book(librarian_client):
        author = AuthorFactory(name="Robert Martin")
        response = librarian_client.post(
            "/api/books/",
            {"isbn": "9780132350884", "title": "Clean Code", "author": author.id},
            format="json",
        )
        assert response.status_code == 201
        body = response.json()
        assert body["title"] == "Clean Code"
        assert body["author_name"] == "Robert Martin"
        assert Book.objects.filter(isbn="9780132350884").exists()

\`response.json()\` parses the rendered body — what a client really receives. \`response.data\` is
the Python data **before** rendering (a \`ReturnDict\` or \`ReturnList\`); it is handy for quick
checks, but values like dates and decimals may not match their JSON form, so assert on \`json()\`
when the wire format matters. Assert the **database** too: a 201 with the right body proves little
if nothing was saved.

**Validation errors** come back as 400 with one list of messages per field, which makes them easy
to pin:

    response = librarian_client.post("/api/books/", {"isbn": "12AB", "title": ""}, format="json")
    assert response.status_code == 400
    assert response.json() == {
        "isbn": ["ISBN must be 13 digits."],
        "title": ["This field may not be blank."],
        "author": ["This field is required."],
    }

## Authenticating in tests: two ways

**\`force_authenticate\`** tells the client to skip authentication and treat every request as
coming from that user:

    @pytest.fixture
    def member_client(member):
        client = APIClient()
        client.force_authenticate(user=member)
        return client

It is fast and right for most tests — you are testing the endpoint, not the login. But it skips
**everything** authentication would check: no token, no password, and not even \`is_active\`. A
deactivated user forced onto the client gets **200** from \`/api/books/\`.

**A real JWT login** exercises the actual authentication path. Use it in a few tests that are
about authentication itself:

    @pytest.mark.django_db
    def test_login_then_list_books(api_client):
        User.objects.create_user("ravi", password="pass1234")
        response = api_client.post("/api/token/",
                                   {"username": "ravi", "password": "pass1234"}, format="json")
        assert response.status_code == 200          # body has "access" and "refresh"

        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.json()['access']}")
        assert api_client.get("/api/books/").status_code == 200

        api_client.credentials()                     # clear the header
        assert api_client.get("/api/books/").status_code == 401

\`credentials()\` sets headers for **every** later request on that client until it is called again.
A wrong password returns 401 with \`{"detail": "No active account found with the given
credentials"}\`, and a garbage token returns 401 with \`"code": "token_not_valid"\`.

For calling a view function directly (no URL routing), \`APIRequestFactory\` builds a request and the
module-level \`force_authenticate(request, user=...)\` attaches a user:

    request = APIRequestFactory().get("/api/books/")
    force_authenticate(request, user=member)
    response = BookViewSet.as_view({"get": "list"})(request)

## Testing permissions: 401, 403 and 404

Access rules are where APIs leak data, so test every rule from the outside. On the library API:

| Who | Request | Expected | Why |
|---|---|---|---|
| nobody | GET /api/books/ | **401** | JWT authentication is configured, so DRF answers 401 with \`WWW-Authenticate: Bearer realm="api"\` |
| member | POST /api/books/ | **403** | authenticated, but writes are staff-only |
| librarian | POST /api/books/ | **201** | staff passes the permission |
| member | GET /api/loans/<someone else's id>/ | **404** | the viewset's queryset is \`Loan.objects.filter(member=request.user)\`, so the row does not exist for this user |
| member | DELETE /api/loans/<someone else's id>/ | **404** | same queryset, same answer — and the loan must still exist afterwards |
| member | PUT /api/loans/<own id>/ | **405** | the viewset allows only GET, POST and DELETE |

Two subtleties worth knowing:

- **401 versus 403 for anonymous users depends on the authentication class.** DRF returns 401 only
  when the first authentication class sends a \`WWW-Authenticate\` header (JWT and Basic do). With
  only \`SessionAuthentication\`, the same anonymous request gets **403** with the same "credentials
  were not provided" message.
- **404 for other people's records is a choice, and a good one.** Filtering the queryset by owner
  hides that the record exists at all; an object-level permission on an unfiltered queryset would
  answer 403, which confirms the id is real. Whichever you choose, the test pins it.

A permission test is not finished until it checks **the database did not change** — a 403 that
still deleted the row is the worst bug in this unit:

    def test_member_cannot_delete_others_loan(member_client):
        other = LoanFactory()
        response = member_client.delete(f"/api/loans/{other.id}/")
        assert response.status_code == 404
        assert Loan.objects.filter(pk=other.pk).exists()

Parametrize (from the pytest topic) turns the table into one test per row, each with its own id
in the report.

## Common mistakes

- Overriding \`REST_FRAMEWORK\` with the \`settings\` fixture to change a view's permissions: a view
  class reads \`DEFAULT_PERMISSION_CLASSES\` when it is defined, at import, so the override does not
  reach it. Test the real configuration, or set the view's \`permission_classes\` explicitly.
- Testing only the happy path with \`force_authenticate\` and never once logging in for real.
- Posting nested data without \`format="json"\`.`,
    workedExample: `**Problem.** Members may see and cancel only their own loans; librarians may add books.
Write the access tests for \`/api/loans/\` and \`/api/books/\` so a regression in either rule fails
loudly.

**Step 1 — fixtures in \`tests/conftest.py\`.** One anonymous client and one forced client per role.

    @pytest.fixture
    def api_client():
        return APIClient()

    @pytest.fixture
    def member(db):
        return UserFactory()

    @pytest.fixture
    def member_client(member):
        client = APIClient()
        client.force_authenticate(user=member)
        return client

    @pytest.fixture
    def librarian_client(db):
        client = APIClient()
        client.force_authenticate(user=UserFactory(staff=True))
        return client

**Step 2 — the list shows only my loans.** Create one loan for this member and one for someone
else; the list must contain exactly mine.

    def test_loan_list_is_mine_only(member_client, member):
        mine = LoanFactory(member=member)
        LoanFactory()                                  # another member's
        response = member_client.get("/api/loans/")
        assert response.status_code == 200
        assert [row["id"] for row in response.json()] == [mine.id]

**Step 3 — someone else's loan is invisible, for reading and deleting.**

    @pytest.mark.parametrize("method", ["get", "delete"])
    def test_others_loan_is_404(member_client, method):
        other = LoanFactory()
        response = getattr(member_client, method)(f"/api/loans/{other.id}/")
        assert response.status_code == 404
        assert Loan.objects.filter(pk=other.pk).exists()

**Step 4 — the book rules by role.**

    def test_anonymous_gets_401(api_client, db):
        assert api_client.get("/api/books/").status_code == 401

    def test_member_cannot_add_book(member_client):
        response = member_client.post("/api/books/", {"isbn": "9780000000001",
                     "title": "X", "author": AuthorFactory().id}, format="json")
        assert response.status_code == 403
        assert not Book.objects.exists()

**Step 5 — prove the tests bite.** Change \`get_queryset\` to \`Loan.objects.all()\`: step 2 fails
(two ids) and step 3 fails (200 and 204). Remove the staff check: step 4's member test fails with
201. Restore both. Running the real code, all of these passed; with each rule broken, the matching
test failed — which is the only evidence that a permission test is worth having.`,
    mcqs: [
      mcq('A test posts `{"book": 3, "notes": ["fragile cover"]}` with `client.post(url, data)` and no `format`. The serializer rejects the list. What is the likely cause?', [
        ['APIClient strips list values from every request it sends', false],
        ['The default test format is multipart, not JSON', true],
        ['force_authenticate must be called before any POST with data', false],
        ['DRF only accepts lists in PUT requests, not in POST requests', false],
      ], 'Without format="json" (or TEST_REQUEST_DEFAULT_FORMAT), APIClient encodes the data as multipart/form-data. Flat fields survive; nested structures do not arrive as JSON would send them.'),
      mcq('A member is deactivated (`is_active=False`). A test uses `client.force_authenticate(user=member)` and calls `GET /api/books/`. What status does it get?', [
        ['401, because inactive users fail authentication', false],
        ['403, because IsAuthenticated rejects inactive users', false],
        ['200, since forced auth skips those checks', true],
      ], 'force_authenticate bypasses the authentication classes entirely, so the active check that JWT login performs never runs. To test that inactive users are refused, log in for real and expect the token endpoint to answer 401.'),
      mcq('Why does the library API answer `GET /api/loans/<id>/` for another member\'s loan with 404 rather than 403?', [
        ['DRF converts every 403 into 404 when the user is not staff', false],
        ['The router has no route for loans belonging to other members', false],
        ['The loan is soft-deleted for members who did not create it', false],
        ['get_queryset filters by owner, so the row is not found at all', true],
      ], 'The detail lookup runs against get_queryset(), which returns only this member\'s loans; another member\'s id simply does not match, and DRF answers "No Loan matches the given query." with 404, never revealing the record exists.'),
    ],
    checkpoint: [
      ck('DJANGO_REST', `The API uses only SessionAuthentication with IsAuthenticated. What does an anonymous request get?

    response = APIClient().get("/api/books/")`, [
        ['401 with a WWW-Authenticate header naming the session scheme', false],
        ['403 with "Authentication credentials were not provided."', true],
        ['302 redirect to the login page configured in settings', false],
        ['200 with an empty list, since there is no user to filter by', false],
      ], 'DRF returns 401 only when the first authentication class provides a WWW-Authenticate header. SessionAuthentication does not, so the not-authenticated error is sent as 403 — with JWT configured the same request would be 401.'),
      mcq(`What does the second request return?

    client = APIClient()
    token = client.post("/api/token/", {"username": "ravi", "password": "pass1234"},
                        format="json").json()["access"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    client.get("/api/books/")
    client.credentials()
    client.get("/api/books/")`, [
        ['401, because credentials() with no arguments clears the header', true],
        ['200, because the token is cached on the client after first use', false],
        ['200, because the access token has not expired yet', false],
        ['400, because an empty Authorization header is malformed', false],
      ], 'credentials() replaces the stored headers; called with nothing it removes them, so the second GET carries no token and JWT authentication answers 401.'),
      ck('DJANGO_REST', `A member deletes another member's loan. Which assertions make this a complete test?

    response = member_client.delete(f"/api/loans/{other.id}/")`, [
        ['The status code 404 alone is enough', false],
        ['Status 404, and the loan still exists afterwards', true],
        ['Any status among 403, 404 or 204, since all mean refused', false],
        ['An empty JSON body, and the loan is gone', false],
      ], 'The status proves what the client was told; only checking the database proves nothing was deleted. Accepting 204 would let the very bug the test exists for pass.'),
    ],
  },

  /* ── FACTORIES ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_TESTING_FACTORIES',
    notes: `Every API test needs a user, a book with an author, a loan with a book and a member. Building
those by hand in each test buries the one field the test is about, and a new required column breaks
fifty tests at once. **factory_boy** (\`pip install factory_boy\`, 3.3) builds valid objects with one
call and lets each test override only what it cares about.

## A DjangoModelFactory

    # tests/factories.py
    import factory
    from django.contrib.auth import get_user_model
    from library.models import Author, Book, Loan

    class UserFactory(factory.django.DjangoModelFactory):
        class Meta:
            model = get_user_model()
            skip_postgeneration_save = True

        username = factory.Sequence(lambda n: f"member{n}")
        email = factory.LazyAttribute(lambda o: f"{o.username}@example.com")
        password = factory.django.Password("pass1234")

    class AuthorFactory(factory.django.DjangoModelFactory):
        class Meta:
            model = Author

        name = factory.Faker("name")

    class BookFactory(factory.django.DjangoModelFactory):
        class Meta:
            model = Book

        isbn = factory.Sequence(lambda n: f"978{n:010d}")
        title = factory.Faker("sentence", nb_words=3)
        author = factory.SubFactory(AuthorFactory)
        copies = 1

The declarations:

- **\`Sequence\`** gives a counter, for **unique** fields: \`member0\`, \`member1\`, ... and ISBNs that can
  never collide. The counter keeps running across tests (a later test may get \`member7\`), so never
  assert on a generated value — pass the value you assert on.
- **\`LazyAttribute\`** computes a field from the others: the email follows the username.
- **\`Faker\`** gives realistic text (\`"name"\`, \`"sentence"\`, \`"email"\`, \`"date_this_month"\`). Use it
  for fields nobody asserts on; random values in a unique field can collide.
- **\`SubFactory\`** builds the related object: a book gets its own author automatically.
- **\`factory.django.Password\`** stores a properly hashed password. A plain \`password = "pass1234"\`
  stores the raw string in the hash column: \`check_password("pass1234")\` is False and the JWT login
  in a test returns 401.

## Using it

    book = BookFactory()                                 # saved, with a saved author
    book = BookFactory(title="Clean Code")               # override one field
    book = BookFactory(author__name="R. K. Narayan")     # reach into the SubFactory
    books = BookFactory.create_batch(3, author=author)   # three books, one shared author
    loan = LoanFactory(member=member)                    # a loan for this member

Double underscores pass values down to a SubFactory. Passing an existing object (\`author=author\`)
replaces the SubFactory entirely, so \`create_batch(3, author=author)\` creates no extra authors.

## build versus create

\`BookFactory()\` is \`BookFactory.create()\`: it **saves** to the database, and so needs
\`django_db\`. \`BookFactory.build()\` makes an **unsaved** instance — \`pk\` is None and the SubFactory
author is unsaved too — with no database at all:

    def test_isbn_display():                  # no django_db needed
        book = BookFactory.build(isbn="9780132350884")
        assert format_isbn(book) == "978-0-13-235088-4"

Use \`build()\` for anything that only reads attributes (serializer output from an instance,
\`__str__\`, pure functions); use \`create()\` when a query must find the row. Calling \`.save()\` on a
built book fails with \`ValueError: save() prohibited to prevent data loss due to unsaved related
object 'author'.\` — the author was never saved.

## Traits: named variations

A trait bundles several field values under one flag, declared in \`class Params\`:

    class UserFactory(factory.django.DjangoModelFactory):
        ...
        class Params:
            staff = factory.Trait(
                is_staff=True,
                username=factory.Sequence(lambda n: f"librarian{n}"),
            )

    class LoanFactory(factory.django.DjangoModelFactory):
        class Meta:
            model = Loan

        book = factory.SubFactory(BookFactory)
        member = factory.SubFactory(UserFactory)

        class Params:
            returned = factory.Trait(returned_on=factory.Faker("date_this_month"))

\`UserFactory(staff=True)\` is a librarian; \`LoanFactory(returned=True)\` is a closed loan. The test
reads as the scenario, not as a list of columns.

## post_generation: after the object exists

Some data can only be attached after the instance exists — many-to-many rows, or a value derived
from the saved object. A \`post_generation\` hook receives what the caller passed:

    class BookFactory(factory.django.DjangoModelFactory):
        ...
        class Meta:
            model = Book
            skip_postgeneration_save = True

        @factory.post_generation
        def tags(obj, create, extracted, **kwargs):
            if extracted:                    # BookFactory(tags=["python", "testing"])
                obj.tags = list(extracted)
                if create:
                    obj.save()

For a real many-to-many it would call \`obj.genres.add(*extracted)\` — only when \`create\` is True,
since an unsaved object cannot have m2m rows. Without \`skip_postgeneration_save = True\`, factory_boy
3.3 warns *DeprecationWarning: ...will stop saving the instance after postgeneration hooks in the
next major release* — set it and save explicitly when your hook needs to.

## Fixtures that use factories

Factories make objects; **fixtures** decide which ones a test receives. Keep the common cast in
\`tests/conftest.py\`:

    @pytest.fixture
    def member(db):
        return UserFactory()

    @pytest.fixture
    def member_client(member):
        client = APIClient()
        client.force_authenticate(user=member)
        return client

    @pytest.fixture
    def jwt_client(db):
        """A client logged in through the real token endpoint."""
        UserFactory(username="jwtuser")
        client = APIClient()
        token = client.post("/api/token/", {"username": "jwtuser", "password": "pass1234"},
                            format="json").json()["access"]
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return client

A test then asks for \`member_client\` and \`member\` and gets the **same** member in both, because
fixtures are cached per test.

## Keeping tests independent

- **Each test creates what it needs**, through factories, inside its own rolled-back transaction.
  No test relies on rows another test made.
- **No shared mutable fixtures** above function scope for database objects: a module-scoped
  \`member\` would outlive the rollback that cleans it up.
- **Assert on values you set**, not on Sequence or Faker output.
- Django's JSON **fixture files** (\`loaddata\`) are a poor fit for tests: they are shared,
  invisible from the test, and break silently when a model changes. Factories keep the data next
  to the assertion.
- Run the suite in random order now and then (\`pytest-randomly\`) to flush out hidden coupling.`,
    mcqs: [
      mcq('A test uses `BookFactory.build()` and then calls `book.save()`. It raises `ValueError: save() prohibited to prevent data loss due to unsaved related object \'author\'`. Why?', [
        ['build() also built the SubFactory author without saving it', true],
        ['build() returns a read-only copy that refuses to save', false],
        ['The test lacks django_db, and this is how that error shows', false],
        ['Sequence values are only assigned when create() is used', false],
      ], 'build() applies the build strategy all the way down, so the author is an unsaved instance too. Saving the book would point its foreign key at nothing; use BookFactory() when the row must exist.'),
      mcq('`UserFactory` declares `password = "pass1234"`. A test creates a user with it and posts to `/api/token/`. What happens?', [
        ['200, since the factory sets the password the same way create_user does', false],
        ['500, because the password column rejects unhashed strings', false],
        ['401, since the raw string is stored and check_password fails', true],
        ['400, because the token view requires an email address too', false],
      ], 'A plain attribute is written straight into the password field, which Django expects to hold a hash. check_password("pass1234") is False, so Simple JWT finds no active account with those credentials. factory.django.Password hashes it.'),
      mcq('Which call gives three books by the same, single author?', [
        ['BookFactory.create_batch(3, author=AuthorFactory())', true],
        ['BookFactory.create_batch(3)', false],
        ['BookFactory.build_batch(3, author__name="Kalam")', false],
        ['[BookFactory(author__name="Kalam") for _ in range(3)]', false],
      ], 'Passing an existing author replaces the SubFactory, so all three books share it. author__name only sets the name on a new author built for each book, giving three authors that happen to share a name.'),
    ],
    checkpoint: [
      mcq(`Two tests in one run. What do they print?

    @pytest.mark.django_db
    def test_one():
        print(UserFactory().username)

    @pytest.mark.django_db
    def test_two():
        print(UserFactory().username)`, [
        ['member0 in both, since each test is rolled back', false],
        ['member0, then member1', true],
        ['Two random Faker usernames', false],
        ['member1, then member2', false],
      ], 'The database is rolled back between tests, but the Sequence counter lives in Python and keeps counting. That is exactly why tests must not assert on generated values.'),
      mcq('Which declaration makes `LoanFactory(returned=True)` produce a closed loan?', [
        ['returned = factory.Faker("date_this_month") as a field', false],
        ['A post_generation hook named returned that saves the loan', false],
        ['returned = factory.LazyAttribute(lambda o: o.returned_on)', false],
        ['class Params: returned = factory.Trait(returned_on=...)', true],
      ], 'A Trait in class Params is a flag, not a model field: when it is True it applies its field values (here returned_on). The others would try to set a nonexistent "returned" field or never set returned_on.'),
      mcq('A `member` fixture is changed to `scope="module"` and uses `UserFactory()`. What problem does this create?', [
        ['None, because factories are always function-scoped', false],
        ['It errors with ScopeMismatch, since db is function-scoped', true],
        ['Each test still gets a new member, since factories ignore scope', false],
        ['The member is created twice, once per test', false],
      ], 'pytest refuses a wider-scoped fixture that depends on a narrower one: a module fixture cannot request the function-scoped db fixture (ScopeMismatch). Database objects belong in function-scoped fixtures, rolled back with each test.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_TESTING_DEBUGGING',
    notes: `Eight ways a Django test suite fails or, worse, passes when it should not. Each was reproduced on
the library API. Symptom, cause, fix.

## 1. RuntimeError: Database access not allowed

**Cause:** the test, or every fixture it uses, never asked for the database. Often the test uses a
factory directly instead of the \`member\` fixture that would have brought \`db\`. **Fix:**
\`@pytest.mark.django_db\`, \`pytestmark\` for the module, or have the fixture request \`db\`.

## 2. TransactionManagementError after an expected IntegrityError

    @pytest.mark.django_db
    def test_duplicate_isbn():
        BookFactory(isbn="9780000000001")
        with pytest.raises(IntegrityError):
            BookFactory(isbn="9780000000001")
        assert Book.objects.count() == 1     # TransactionManagementError

*An error occurred in the current transaction. You can't execute queries until the end of the
'atomic' block.* **Cause:** the test runs inside one transaction, and the failed INSERT broke it.
**Fix:** wrap the expected failure in its own savepoint:
\`with pytest.raises(IntegrityError): with transaction.atomic(): BookFactory(...)\`.

## 3. The email assertion that never sees an email

\`assert len(mailoutbox) == 1\` fails with 0, though the code clearly calls \`send_mail\`. **Cause:** it
calls it inside \`transaction.on_commit\`, and a \`django_db\` test never commits. **Fix:**
\`django_capture_on_commit_callbacks(execute=True)\`; \`transaction=True\` only if a real commit matters.

## 4. Every API test returns 401 or 403 after a login fixture

The \`jwt_client\` fixture logs in and gets 401 from \`/api/token/\`. **Cause:** the user factory set
\`password = "pass1234"\` as a plain attribute, so the stored "hash" is the raw string. **Fix:**
\`factory.django.Password("pass1234")\` or \`set_password\` before saving.

## 5. Nested data arrives empty

A POST with \`{"items": [...]}\` is rejected as missing the field. **Cause:** no \`format="json"\`; the
default is multipart. **Fix:** pass \`format="json"\` or set \`TEST_REQUEST_DEFAULT_FORMAT\`.

## 6. Overriding REST_FRAMEWORK changes nothing

\`settings.REST_FRAMEWORK = {..., "DEFAULT_PERMISSION_CLASSES": [AllowAny]}\` in a test, and the view
still answers 401. **Cause:** \`APIView.permission_classes\` is read from the defaults when the view
class is defined, at import — long before the test changes the setting. **Fix:** test the real
configuration; if a test truly needs another policy, patch the view's \`permission_classes\` with
\`monkeypatch.setattr\`.

## 7. Green on SQLite, red in CI on MySQL

A search test passes locally and fails in CI, or the reverse. **Cause:** engine differences — SQLite
compares strings case-sensitively and ignores \`max_length\`; MySQL's \`_ci\` collations compare
case-insensitively and strict mode refuses over-long values. **Fix:** treat the MySQL CI run as the
truth, and write the test for the behaviour you want on MySQL (\`iexact\` if case must not matter).

## 8. A suite that takes minutes for 200 tests

\`pytest --durations=10\` shows setup and login tests at about 1.5 s each. **Cause:** Django's default
password hasher is deliberately slow, and every user and every login hashes. **Fix:**
\`PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]\` in test settings only, and
\`--reuse-db\` on a real database. On the library API that took 15 tests from 9.2 s to 0.6 s.`,
    mcqs: [
      mcq(`This test errors on its last line with TransactionManagementError. What is the fix?

    @pytest.mark.django_db
    def test_isbn_unique():
        BookFactory(isbn="9780000000001")
        with pytest.raises(IntegrityError):
            BookFactory(isbn="9780000000001")
        assert Book.objects.count() == 1`, [
        ['Mark the test django_db(transaction=True) so each insert commits', false],
        ['Catch IntegrityError with try/except instead of pytest.raises', false],
        ['Wrap the duplicate create in transaction.atomic()', true],
        ['Call connection.close() after the pytest.raises block', false],
      ], 'The failed INSERT breaks the test\'s surrounding transaction, so further queries are refused. An inner atomic() is a savepoint: the failure rolls back to it and the outer transaction stays usable.'),
      mcq('`pytest --durations=5` shows every slowest entry is a fixture creating users or a JWT login, each about 1.5 s. What is the most effective change?', [
        ['Use the MD5 password hasher in the test settings', true],
        ['Make the user fixtures session-scoped and shared', false],
        ['Replace pytest-django with django.test.TestCase', false],
        ['Run the suite with transaction=True everywhere', false],
      ], 'Hashing with the production hasher is deliberately slow and happens on every create_user and every login. A fast hasher in test settings removes the cost; sharing users across tests would trade speed for coupling.'),
      mcq('A test sets `settings.REST_FRAMEWORK` to use `AllowAny` and expects an anonymous GET on `/api/loans/` to succeed, but it still gets 401. Why?', [
        ['The settings fixture only works for settings that Django itself defines', false],
        ['The view class read its permission defaults when it was imported', true],
        ['AllowAny does not apply to viewsets, only to function views', false],
        ['The test database blocks anonymous requests by default', false],
      ], 'APIView.permission_classes is assigned from api_settings when the class body runs, at import time. Changing the setting later does not touch classes that already exist.'),
      mcq('A test asserts `len(mailoutbox) == 1` after `borrow()` and gets 0. The service wraps `send_mail` in `transaction.on_commit`. What is happening?', [
        ['mailoutbox only records mail sent through EmailMessage objects', false],
        ['The settings say SMTP, so mail went to a real server instead', false],
        ['The test transaction is rolled back, so on_commit never runs', true],
        ['send_mail fails silently because the member has no email set', false],
      ], 'A django_db test never commits, so callbacks registered with on_commit are discarded. pytest-django already swaps in the locmem backend; the fix is django_capture_on_commit_callbacks(execute=True).'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_TESTING_PRACTICE',
    notes: `Six exercises on the library API from the DRF and auth topics (or a fresh project with
\`Author\`, \`Book\`, \`Loan\` and the default user). Install \`pytest pytest-django factory_boy\` into the
project's venv. For each one, **watch the test fail first** — break the code on purpose if you must.

**Exercise 1 — Wire it up.** Add \`pytest.ini\` with \`DJANGO_SETTINGS_MODULE\` and a
\`config/settings_test.py\` that imports the real settings and switches to the MD5 hasher. Write one
model test without the mark and read the error; add the mark and see it pass. Run once with
\`DJANGO_SETTINGS_MODULE\` exported to another value and find the \`(from env)\` in the header.

**Exercise 2 — Factories.** Write \`UserFactory\` (Sequence username, LazyAttribute email, hashed
password, a \`staff\` trait), \`AuthorFactory\` (Faker name), \`BookFactory\` (Sequence ISBN, SubFactory
author) and \`LoanFactory\` (a \`returned\` trait). Prove \`BookFactory.build()\` needs no database and
\`create_batch(3, author=a)\` makes exactly one author.

**Exercise 3 — Service rules.** Test \`borrow()\`: a loan is created and one email is sent; the
member limit (lowered with the \`settings\` fixture) refuses with no new loan and no new email; a book
with all copies out is refused. Add a duplicate-ISBN test that uses \`transaction.atomic()\` correctly.

**Exercise 4 — The access table.** One parametrized test per resource covering anonymous (401),
member (403 on book writes), librarian (201), another member's loan (404 for GET and DELETE, row
still present) and an unsupported method (405).

**Exercise 5 — Real login.** A \`jwt_client\` fixture that logs in through \`/api/token/\`. Test: a wrong
password gives 401; a deactivated user cannot get a token; a garbage token gives 401 with
\`token_not_valid\`. Then show that \`force_authenticate\` lets the deactivated user through, and write
one sentence on what that means for which tests may use it.

**Exercise 6 — Query budget.** For \`GET /api/books/\` (author name in each row) and
\`GET /api/loans/\` (book title in each row), add \`django_assert_max_num_queries\` with the number you
expect. Remove \`select_related\` from one view and read the failure with \`-v\`.`,
    mcqs: [
      mcq('In Exercise 1, the run header reads `settings: config.settings (from env)` though pytest.ini names `config.settings_test`. What should you do?', [
        ['Rename pytest.ini to setup.cfg so it is read first', false],
        ['Unset the exported DJANGO_SETTINGS_MODULE, or pass --ds', true],
        ['Add django_find_project = false to the ini file', false],
        ['Move settings_test.py into the tests folder instead', false],
      ], 'The environment variable outranks the ini file, so a leftover export wins. Removing it lets the ini apply; --ds outranks both when you want to be explicit.'),
      mcq('Exercise 2 asks you to prove `BookFactory.build()` needs no database. Which test does that?', [
        ['A test with no django_db mark that asserts build().pk is None', true],
        ['A django_db test asserting Book.objects.count() == 0 after build()', false],
        ['A test calling build().save() and expecting success', false],
        ['A transaction=True test that builds and then flushes', false],
      ], 'Without the mark, any query raises "Database access not allowed", so a passing unmarked test proves build() made no query. The django_db version would pass too but proves nothing about needing the database.'),
      mcq('Exercise 3\'s refusal test asserts only `pytest.raises(LoanRefused)`. Which extra assertion catches a service that creates the loan and then raises?', [
        ['assert str(exc) contains "limit"', false],
        ['assert mailoutbox is a list', false],
        ['assert the member\'s loan count is unchanged', true],
        ['assert settings.MAX_ACTIVE_LOANS == 1', false],
      ], 'A buggy service could save the loan before checking the limit and still raise. Only checking the count (and the outbox) after the refusal proves nothing was written.'),
      mcq('In Exercise 4, a librarian test posts a book and gets 201, but a later test in the same run finds no such book. Is that a bug?', [
        ['Yes: the POST did not commit, so the API is broken', false],
        ['Yes: the librarian fixture must be module-scoped to keep data', false],
        ['No, but only because SQLite discards rows between requests', false],
        ['No: each test is rolled back, so later tests start empty', true],
      ], 'Rows created in one django_db test are rolled back when it ends. A later test that needs the book must create it, which is the point of keeping tests independent.'),
      mcq('In Exercise 6, `GET /api/loans/` returns 10 loans and the serializer reads `loan.book.title`. Without `select_related("book")`, how many queries does the list make, ignoring authentication?', [
        ['1', false],
        ['2', false],
        ['10', false],
        ['11', true],
      ], 'One query for the loans and one more per loan to load its book: 1 + 10. With select_related("book") the books are joined into the first query, so it is 1.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_TESTING_INTERVIEW_QUESTION',
    notes: `Three questions Python backend interviews ask about testing a Django API, with an answer that gets
you through and the follow-up a good answer earns.

## 1. "How do you test a Django REST API?"

**Model answer.** With pytest and pytest-django. Business rules sit in services or model methods and
get fast tests marked \`django_db\`, each running in a transaction that is rolled back, so tests never
depend on each other. Endpoints get API tests with DRF's \`APIClient\`: I assert the status code, the
JSON body with \`response.json()\`, and the database afterwards. Most tests authenticate with
\`force_authenticate\`, and a few go through the real JWT login, because forcing skips the
authentication checks entirely. Test data comes from factory_boy factories, so each test creates
only what it needs. I also pin query counts on list endpoints with \`django_assert_num_queries\` to
catch N+1 regressions.

**Follow-up:** "What do you test for permissions?" Every rule from the outside: anonymous gets 401
(with JWT), an authenticated user without the role gets 403, another user's record gets 404 because
the queryset is filtered by owner, and for every refused write I assert the row is unchanged — a
403 that still modified data is the worst case.

## 2. "SQLite in tests, MySQL in production — is that OK?"

**Model answer.** For fast local feedback, yes, but CI should run the suite on the production
engine. They differ in ways tests notice: SQLite does not enforce \`max_length\`, compares strings
case-sensitively, and has different locking, while MySQL's default collation is case-insensitive and
strict mode rejects over-long values. pytest-django creates the MySQL test database as
\`test_<name>\`, so the CI user needs create/drop privileges, and \`--reuse-db\` keeps runs quick
locally.

**Follow-up:** "How do you keep the MySQL run fast?" A fast password hasher in test settings,
\`--reuse-db\`, \`transaction=True\` only where a real commit matters, and splitting the suite across
CI workers with pytest-xdist, which gives each worker its own test database.

## 3. "Fixtures or factories — what is the difference?"

**Model answer.** A factory (factory_boy) **builds objects**: \`BookFactory(title="Clean Code")\`
makes a valid book with an author, filling everything I did not specify, with Sequences for unique
fields and traits like \`UserFactory(staff=True)\`. A pytest fixture **decides what a test receives**
and manages its lifetime: a \`member_client\` fixture creates a member with the factory and returns
an authenticated client. I avoid Django's JSON fixture files for tests because they are shared,
invisible from the test, and break when the schema changes.

**Follow-up:** "When would you use build() instead of create()?" When nothing needs to be in the
database — \`__str__\`, a serializer's output for an instance, a pure function. \`build()\` makes no
query, so the test needs no \`django_db\` and runs in microseconds.`,
    mcqs: [
      mcq('An interviewer asks why you log in through `/api/token/` in a few tests when `force_authenticate` is simpler. Which answer is strongest?', [
        ['force_authenticate cannot be combined with permission classes', false],
        ['Forced auth skips authentication, so only a real login tests it', true],
        ['Real logins are faster because tokens are cached by Simple JWT', false],
        ['force_authenticate only works for staff and superusers', false],
      ], 'force_authenticate bypasses the authentication classes, so token parsing, expiry and the is_active check are never exercised. A handful of real-login tests covers that path; the rest stay fast.'),
      mcq('You split a pytest-django suite across 4 CI workers with pytest-xdist on MySQL. What happens to the test database?', [
        ['All workers share test_library and lock each other out', false],
        ['xdist disables the test database and the workers use the real one', false],
        ['Each worker gets its own test database with a worker suffix', true],
        ['Only the first worker can use the database; others are skipped', false],
      ], 'pytest-django gives each xdist worker a separate test database (the name gets a suffix such as _gw0), so parallel workers cannot see or lock each other\'s data. The CI user still needs privileges to create them.'),
      mcq('A candidate says "we load a JSON fixture file with all our test data before the suite." What is the main risk an interviewer wants you to name?', [
        ['loaddata cannot load foreign keys between tables', false],
        ['Fixture files are only supported by unittest-style tests', false],
        ['JSON fixtures are slower to parse than YAML fixtures', false],
        ['Shared hidden data that goes stale as models change', true],
      ], 'A shared data file couples every test to rows it cannot see, and it silently goes stale as models change. Factories put the data a test needs right next to the assertion.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_TESTING_MINI_PROJECT',
    notes: `# A Secured, Tested Library API on DRF

Finish the library API as a team would ship it: Django 5.x and Django REST Framework on MySQL,
JWT login with two roles, ownership rules, and a pytest-django suite that proves every rule. The
React topic will put a front end on this API, so its contract matters.

## The domain

- **Author** — name.
- **Book** — 13-digit ISBN (unique), title, author, number of copies.
- **Member** — your custom user model from the auth topic, with an \`is_staff\` flag for librarians.
- **Loan** — book, member, borrowed date, returned date (null while out).

## Endpoints

| Method and path | Who | Behaviour |
|---|---|---|
| POST /api/token/, /api/token/refresh/ | anyone | Simple JWT login and refresh |
| GET /api/books/ (?search=, ?author=, pagination) | any logged-in user | list, author name in each row, in **one** query |
| POST / PATCH / DELETE /api/books/ | librarian | create, edit, remove (refused while copies are out) |
| GET /api/loans/ | member | **own** loans only; librarians see all |
| POST /api/loans/ | member | borrow: refused at the active-loan limit or when no copy is free |
| POST /api/loans/{id}/return/ | owner or librarian | sets returned_on; returning twice is refused |
| GET /api/loans/{id}/ | owner or librarian | another member's loan is **404** |

Borrowing sends a confirmation email (\`send_mail\`, after commit). The active-loan limit is a setting,
\`MAX_ACTIVE_LOANS\`, default 3.

## The test suite (the main deliverable)

- \`pytest.ini\` with \`DJANGO_SETTINGS_MODULE\`, a \`settings_test.py\` with a fast hasher.
- \`tests/factories.py\`: factories for every model, Sequences for unique fields, a \`staff\` trait and
  a \`returned\` trait, hashed passwords.
- \`tests/conftest.py\`: \`api_client\`, \`member\`, \`librarian\`, \`member_client\`, \`librarian_client\` and a
  \`jwt_client\` that logs in for real.
- **Service tests**: borrow and return rules, the limit via the \`settings\` fixture, the email via
  \`mailoutbox\` and \`django_capture_on_commit_callbacks\`.
- **API tests** for every row of the table: status, JSON body and the database afterwards.
- **Permission tests** as a parametrized table: 401 / 403 / 404 / 405, every refused write leaving
  the data unchanged.
- **Query budgets** on both list endpoints.
- At least three tests through the real JWT login, including a deactivated member.

## Acceptance criteria

- \`pytest\` passes on a clean checkout on SQLite, and on MySQL in CI (a GitHub Actions workflow with
  a MySQL 8 service container).
- Breaking any one rule (remove the owner filter, the staff check, the limit, \`select_related\`)
  makes at least one named test fail. Show this in the README for two rules.
- No test depends on another: \`pytest -p randomly\` (or reversing the file order) still passes.
- No test asserts on a Sequence or Faker value.
- The whole suite runs in under 10 seconds on SQLite.`,
    mcqs: [
      mcq('The brief requires that removing the owner filter from `LoanViewSet.get_queryset` makes a named test fail. Which test does that most directly?', [
        ['A member GETs another member\'s loan and expects 404', true],
        ['A librarian lists all loans and expects 200', false],
        ['A member borrows a book and expects 201', false],
        ['An anonymous request to the loans list expects 401', false],
      ], 'Without the filter the other member\'s loan is found and returned with 200, so the 404 expectation fails. The other tests pass whether or not the owner filter exists.'),
      mcq('Borrowing sends its email after commit. How should the API test check that a successful borrow sends exactly one email?', [
        ['Mark it transaction=True and check the SMTP server log', false],
        ['Patch send_mail and assert it was called before the response', false],
        ['Capture and execute on_commit callbacks; check mailoutbox', true],
        ['Assert len(mailoutbox) == 1 in a plain django_db test', false],
      ], 'In a django_db test nothing commits, so on_commit callbacks must be captured and executed; the locmem backend then records the message in mailoutbox. The plain version sees 0 messages.'),
    ],
    assignment: {
      title: 'A Secured, Tested Library API on DRF',
      description: 'A Django REST Framework library API on MySQL — books, members and loans, JWT login with librarian and member roles, ownership rules — and a pytest-django suite with factories that proves every endpoint and access rule.',
      instructions: `Build the API and the test suite described in this unit's brief and submit a repository link.

**Submit:**

1. The Django project: models, migrations, serializers, viewsets, permissions and the borrow/return
   services; settings reading MySQL credentials from the environment.
2. \`pytest.ini\`, \`config/settings_test.py\`, \`tests/factories.py\`, \`tests/conftest.py\` and the test
   modules (services, API, permissions, query budgets, real login).
3. A GitHub Actions workflow that runs the suite against a MySQL 8 service container, and a link to
   a green run.
4. A README with: how to run the tests locally, the access table with the test name that covers each
   row, and two "broken rule" demonstrations (the change you made and the failing test's output).

**Before you submit,** run \`pytest -v\` and \`pytest -p randomly\` (or another order) and confirm both
pass, and check every acceptance criterion in the brief by running it.`,
      rubric: [
        { criterion: 'API behaviour and rules', description: 'Every endpoint in the table works as specified: roles, ownership (404 for others\' loans), the active-loan limit, the free-copy check, return-once, and the confirmation email after commit.', maxPoints: 25 },
        { criterion: 'Permission and API tests', description: 'A parametrized access table covers 401/403/404/405 and success for each role; every refused write asserts the database is unchanged; responses are checked with status, JSON and database state.', maxPoints: 25 },
        { criterion: 'Factories and fixtures', description: 'Factories with Sequences for unique fields, SubFactories, staff and returned traits, hashed passwords; conftest fixtures for each client including a real JWT login; no test depends on another or asserts on generated values.', maxPoints: 20 },
        { criterion: 'pytest-django usage', description: 'Correct settings configuration, django_db only where needed, on_commit captured rather than transaction=True everywhere, settings and mailoutbox fixtures, query budgets on list endpoints, fast hasher in test settings.', maxPoints: 20 },
        { criterion: 'CI on MySQL and README', description: 'A green GitHub Actions run on MySQL 8; README maps each access rule to its test and shows two broken-rule demonstrations with real output.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_DJANGO_TESTING_CHECKPOINT',
    notes: `Ten questions across the topic: pytest-django's settings, database access and transactions, the
test database, query counts, APIClient and authentication, status codes for access rules, and
factory_boy. Most show a short test and ask what pytest-django or DRF does with it. Work out which
transaction the test is in and which user the request carries before you read the options.`,
    checkpoint: [
      mcq(`What does this test report?

    def test_member_str():
        member = UserFactory.build(username="asha")
        assert str(member) == "asha"`, [
        ['It passes; build() makes no query, so no django_db is needed', true],
        ['It fails with "Database access not allowed" from the factory', false],
        ['It errors because the Sequence needs a database counter', false],
        ['It passes, but only if the db fixture is autouse', false],
      ], 'build() creates an unsaved instance in Python only, and str(user) returns the username without touching the database. The mark is required only when a query actually runs.'),
      mcq('With MySQL settings `NAME = "library"` and no TEST name, what database does pytest-django create for the run, as Django documents it?', [
        ['library, emptied before the tests run', false],
        ['An in-memory copy of library held by the driver', false],
        ['library_test, created alongside the real one', false],
        ['test_library, which requires create privileges', true],
      ], 'Django names the test database test_ plus NAME and creates it with CREATE DATABASE, so the configured user needs permission to create and drop databases. Only SQLite defaults to an in-memory test database.'),
      mcq(`Which test needs \`transaction=True\` rather than a plain django_db mark?`, [
        ['One that saves a book and reads it back in the same test', false],
        ['One where a background thread must see rows the test committed', true],
        ['One that asserts an IntegrityError on a duplicate ISBN', false],
        ['One that counts queries made by the book list endpoint', false],
      ], 'A plain django_db test never commits, so another connection (a thread has its own) cannot see its rows. Reading back on the same connection, savepoint-wrapped integrity errors and query counting all work inside the rolled-back transaction.'),
      ck('DJANGO_REST', `A deactivated member is used like this. What status comes back?

    client.force_authenticate(user=deactivated_member)
    client.get("/api/books/")`, [
        ['401, because JWT rejects inactive accounts', false],
        ['403, because IsAuthenticated checks is_active', false],
        ['200, because forced authentication skips those checks', true],
      ], 'force_authenticate sets request.user directly and never runs the authentication classes, so the active check in the login path does not apply. That is why a test about deactivated users must log in for real.'),
      ck('DJANGO_REST', `Loans are filtered by owner in get_queryset. What does this member get?

    other = LoanFactory()
    member_client.get(f"/api/loans/{other.id}/")`, [
        ['403 with "You do not have permission to perform this action."', false],
        ['200 with the loan, since ids are visible to all members', false],
        ['404 with "No Loan matches the given query."', true],
        ['401, since the member is not the loan\'s owner', false],
      ], 'The detail lookup searches only the filtered queryset, so another member\'s loan is not found: 404. The response confirms nothing about whether that id exists.'),
      mcq(`What is in mailoutbox after this test body runs?

    @pytest.mark.django_db
    def test_notice(mailoutbox):
        transaction.on_commit(lambda: send_mail("Due", "Book due", "a@x.in", ["m@x.in"]))`, [
        ['One message, sent to m@x.in', false],
        ['Nothing, since the callback waits for a commit that never happens', true],
        ['One message, but only if EMAIL_BACKEND is set to locmem', false],
        ['Nothing, since send_mail is blocked in tests', false],
      ], 'The test runs inside a transaction that is rolled back, so callbacks registered with on_commit are dropped. Running it inside django_capture_on_commit_callbacks(execute=True) puts one message in mailoutbox.'),
      ck('DJANGO_REST', `Librarians only may add books. What does this assert prove if it passes?

    response = member_client.post("/api/books/", payload, format="json")
    assert response.status_code == 403
    assert not Book.objects.exists()`, [
        ['That members are refused and that nothing was saved', true],
        ['That members are refused, but not whether a row was saved', false],
        ['That the payload was invalid for members only', false],
        ['That the member is not logged in', false],
      ], 'The status shows the permission refused the request, and the database check proves the refusal left no book behind. A 401 would mean not logged in; a 400 would mean invalid data.'),
      mcq(`How many authors exist after this, in a django_db test?

    BookFactory(author__name="Kalam")
    BookFactory(author__name="Kalam")`, [
        ['One, since author__name finds the existing author', false],
        ['None, since the double underscore only sets the field in memory', false],
        ['One, because SubFactory caches the object it creates', false],
        ['Two, since each book builds a new author with that name', true],
      ], 'author__name passes a value into the SubFactory, which still creates a new author for each book. To share one author, create it and pass author=that_author (or use django_get_or_create on the author factory).'),
      mcq(`What does the second line return?

    api_client.post("/api/token/", {"username": "ravi", "password": "wrong"}, format="json")`, [
        ['400 with a field error on the password', false],
        ['401 with "No active account found with the given credentials"', true],
        ['403 with "You do not have permission to perform this action."', false],
        ['200 with a refresh token but no access token', false],
      ], 'Simple JWT\'s token view answers bad credentials (or an inactive account) with 401 and that exact detail message, deliberately not saying which of the two was wrong.'),
      mcq(`Why might this pass locally on SQLite and fail in CI on MySQL with the default collation?

    BookFactory(title="Clean Code")
    assert Book.objects.filter(title="clean code").count() == 0`, [
        ['MySQL stores titles in upper case by default', false],
        ['SQLite and MySQL use different test database names', false],
        ['MySQL compares case-insensitively, so it finds the book', true],
        ['MySQL rolls back the factory before the filter runs', false],
      ], 'SQLite\'s = is case-sensitive, so it finds nothing; MySQL\'s _ci collations treat "clean code" and "Clean Code" as equal, so the count is 1. Write tests for the behaviour you want on the production engine, and run CI there.'),
    ],
  },
];
