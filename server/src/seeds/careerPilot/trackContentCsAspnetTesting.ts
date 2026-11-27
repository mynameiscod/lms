/**
 * Career-track content (.NET Full Stack + AI, batch N3): testing ASP.NET Core (JT_ASPNET_TESTING).
 *
 * The student arrives with an ASP.NET Core 8 Web API on EF Core 8 and SQL Server, secured with
 * Identity and JWT bearer authentication (JT_ASPNET_API, JT_ASPNET_DATA, JT_ASPNET_SECURITY). This
 * topic tests that same library API: xUnit for plain logic, Moq for services, WebApplicationFactory
 * (Microsoft.AspNetCore.Mvc.Testing) for the HTTP surface including secured endpoints, and SQLite
 * in-memory or Testcontainers SQL Server for data access.
 *
 * The notes target xUnit v2 (the version the .NET 8 `dotnet new xunit` template references) and
 * say where xUnit v3 differs. TimeProvider and FakeTimeProvider are .NET 8.
 *
 * The topic declares AUTOMATED_TESTING and ASPNET_CORE. Every checkpoint question names its skill:
 * AUTOMATED_TESTING for what a test proves, ASPNET_CORE for knowing what the host loads, registers
 * and runs.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const T = 'AUTOMATED_TESTING';
const A = 'ASPNET_CORE';

export const TRACK_CS_ASPNET_TESTING_BUNDLES: PilotBundle[] = [
  /* ── XUNIT ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_TESTING_XUNIT',
    notes: `A **unit test** runs one small piece of your code — usually one method of one class — with no
database, no web server and no DI container, and checks the result. It runs in milliseconds, so you
can keep hundreds of them and run them on every change. In .NET the most common framework is
**xUnit**, and it is what \`dotnet new xunit\` creates.

## Setting up the test project

Tests live in their own project next to the API, referencing it:

    dotnet new xunit -n Library.Tests
    dotnet add Library.Tests reference Library.Api
    dotnet sln add Library.Tests
    dotnet test

The template references three packages, and all three matter: **xunit** (the attributes and
\`Assert\`), **xunit.runner.visualstudio** (the adapter that lets \`dotnet test\` and Visual Studio
find the tests) and **Microsoft.NET.Test.Sdk** (the test host). Remove the runner and \`dotnet test\`
builds happily and runs nothing.

## The class under test

The library charges a fee for late returns: nothing inside the 14-day loan, then ₹5 per day, capped
at ₹200.

    public class LateFeeCalculator
    {
        public const int LoanDays = 14, PerDay = 5, Cap = 200;

        public int FeeFor(DateOnly borrowed, DateOnly returned)
        {
            if (returned < borrowed)
                throw new ArgumentException("Returned before borrowed.", nameof(returned));
            int late = returned.DayNumber - borrowed.DayNumber - LoanDays;
            return late <= 0 ? 0 : Math.Min(late * PerDay, Cap);
        }
    }

## A first test: arrange, act, assert

    public class LateFeeCalculatorTests
    {
        private readonly LateFeeCalculator _calc = new();

        [Fact]
        public void FeeFor_ThreeDaysLate_ChargesFifteen()
        {
            var borrowed = new DateOnly(2026, 3, 1);                 // arrange
            int fee = _calc.FeeFor(borrowed, borrowed.AddDays(17));  // act
            Assert.Equal(15, fee);                                   // assert
        }

        [Fact]
        public void FeeFor_ReturnBeforeBorrow_Throws()
        {
            var d = new DateOnly(2026, 3, 10);
            var ex = Assert.Throws<ArgumentException>(() => _calc.FeeFor(d, d.AddDays(-1)));
            Assert.Equal("returned", ex.ParamName);
        }
    }

Things to notice:

- **\`[Fact]\`** marks a test with no parameters. The class and the method must be **public** —
  xUnit v2 does not discover tests in a non-public class (analyzer xUnit1000 warns you).
- **\`Assert.Equal(expected, actual)\`** — expected first. Swap them and a failure says
  "Expected: 0, Actual: 15" when the truth is the reverse.
- **\`Assert.Throws<T>\` checks the exact type.** If the code throws \`ArgumentNullException\` (a
  subclass), \`Assert.Throws<ArgumentException>\` fails; \`Assert.ThrowsAny<ArgumentException>\`
  accepts subclasses. It returns the exception so you can check \`ParamName\` or \`Message\`.
- xUnit creates a **new instance of the test class for every test**. The \`_calc\` field is fresh
  each time, so tests cannot leak state through fields. The **constructor** is your per-test setup
  and **\`IDisposable.Dispose\`** your per-test teardown — there is no \`[SetUp]\` attribute.

## Theories: one test, many rows

The bugs live at the edges: day 14, day 15, the day the cap is reached. Instead of six near-copies:

    [Theory]
    [InlineData(0, 0)]
    [InlineData(14, 0)]
    [InlineData(15, 5)]
    [InlineData(54, 200)]
    [InlineData(55, 200)]
    public void FeeFor_AtTheBoundaries(int daysKept, int expected)
    {
        var b = new DateOnly(2026, 1, 1);
        Assert.Equal(expected, _calc.FeeFor(b, b.AddDays(daysKept)));
    }

Each \`[InlineData]\` row is reported as its own test case, so a failure names the row. When the
data is not a compile-time constant (a \`DateOnly\`, an object), use **\`[MemberData]\`** with a
static property, ideally a strongly typed **\`TheoryData<...>\`**:

    public static TheoryData<Plan, int, int> PlanCases => new()
    {
        { Plan.Standard, 15, 5 },
        { Plan.Premium,  15, 0 },
    };

    [Theory, MemberData(nameof(PlanCases))]
    public void FeeDependsOnPlan(Plan plan, int days, int expected) { ... }

## Assertions worth knowing

    Assert.True(book.IsAvailable);
    Assert.Null(result);
    Assert.Empty(overdue);
    var only = Assert.Single(overdue);          // fails unless exactly one; returns it
    Assert.Contains(overdue, l => l.MemberId == "asha");
    Assert.Equivalent(new { Title = "Clean Code", Copies = 2 }, book);  // compares public members
    await Assert.ThrowsAsync<ConflictException>(() => service.BorrowAsync(7, "asha"));

\`Assert.ThrowsAsync\` returns a \`Task\`; **it must be awaited** and the test must be \`async Task\`.
Without the \`await\` the assertion's result is never observed and the test passes even when nothing
throws (analyzer xUnit2021 flags it).

## One behaviour per test

A test checks one behaviour, so a failure points at one cause; name it after that behaviour
(\`FeeFor_LastFreeDay_ChargesNothing\`, not \`Test2\`). Test the failure paths deliberately — an empty
list, a return before the borrow, a null — because the happy path is the one you tried by hand. And
never let a test depend on today's date: pass dates in, or inject a clock (next unit).

## xUnit v3

xUnit v3 (2024) keeps \`[Fact]\`, \`[Theory]\` and \`Assert\`, but test projects become executables and
\`IAsyncLifetime\` returns \`ValueTask\`. The ideas in this topic are the same in both.`,
    workedExample: `**Problem:** members on the \`Premium\` plan get a 21-day loan. Change \`FeeFor\` to take the plan, and
write the theory that would catch an off-by-one at the new boundary.

    public int FeeFor(Plan plan, DateOnly borrowed, DateOnly returned)
    {
        int loanDays = plan == Plan.Premium ? 21 : LoanDays;
        int late = returned.DayNumber - borrowed.DayNumber - loanDays;
        return late <= 0 ? 0 : Math.Min(late * PerDay, Cap);
    }

    [Theory]
    [InlineData(Plan.Standard, 14, 0)]
    [InlineData(Plan.Standard, 15, 5)]
    [InlineData(Plan.Premium, 21, 0)]
    [InlineData(Plan.Premium, 22, 5)]
    [InlineData(Plan.Premium, 100, 200)]
    public void FeeFor_DependsOnPlan(Plan plan, int days, int expected)
    {
        var b = new DateOnly(2026, 1, 1);
        Assert.Equal(expected, _calc.FeeFor(plan, b, b.AddDays(days)));
    }

**Reasoning:** the change adds one boundary per plan, so each plan gets its last free day and its
first charged day — a \`<\` written as \`<=\` fails exactly one of those rows. Enum values are
compile-time constants, so \`[InlineData]\` accepts them directly. The cap row proves the cap still
applies to the new plan. Each row shows up in the test explorer as a separate case with its
arguments, so a failure reads "FeeFor_DependsOnPlan(plan: Premium, days: 22, expected: 5)".`,
    mcqs: [
      mcq('LateFeeCalculatorTests is declared `internal class` and its methods carry [Fact]. `dotnet test` builds and reports no tests from it. Why?', [
        ['[Fact] methods must also be marked static to be discovered', false],
        ['xUnit v2 only discovers tests in public classes', true],
        ['Test classes need a [TestClass] attribute in xUnit', false],
      ], 'xUnit v2 discovers test methods on public classes only, and analyzer xUnit1000 warns about it. Methods are instance methods, and [TestClass] belongs to MSTest, not xUnit.'),
      mcq('FeeFor is changed to throw ArgumentOutOfRangeException. What happens to `Assert.Throws<ArgumentException>(() => _calc.FeeFor(d, d.AddDays(-1)))`?', [
        ['It passes, since the thrown type derives from ArgumentException', false],
        ['It fails, because Assert.Throws demands the exact exception type', true],
        ['It fails to compile, as the generic argument no longer matches the throw', false],
      ], 'Assert.Throws<T> requires exactly T. A derived exception fails it; Assert.ThrowsAny<T> is the assertion that accepts subclasses. The compiler knows nothing about which exceptions a method throws.'),
      mcq('A test class keeps `private readonly List<Loan> _loans = new();` and one test adds two loans. What does the next test in the class see in _loans?', [
        ['An empty list, as xUnit creates a new class instance for every test', true],
        ['The two loans, because all tests in one class share a single instance', false],
        ['Either, depending on the order xUnit happened to run the two tests in', false],
      ], 'xUnit constructs the test class once per test, so instance fields are re-initialised. Sharing state across a class requires a class fixture (IClassFixture<T>) or a static field.'),
    ],
    checkpoint: [
      ck(T, `What does this test report when FeeFor returns 15?

    [Fact]
    public void LateFee()
    {
        Assert.Equal(_calc.FeeFor(b, b.AddDays(17)), 0);
    }`, [
        ['It fails, reporting Expected 15 and Actual 0 — the reverse of the truth', true],
        ['It fails, reporting Expected 0 and Actual 15 — exactly the right reading', false],
        ['It passes, because Assert.Equal compares the two integers in either order', false],
      ], 'Assert.Equal takes (expected, actual). With the arguments swapped the computed 15 is labelled Expected and the literal 0 Actual, so the failure message misleads whoever reads it.'),
      ck(T, `How many test cases does xUnit report for this method?

    [Theory]
    [InlineData(14, 0)]
    [InlineData(15, 5)]
    [InlineData(55, 200)]
    public void Boundaries(int days, int expected) { ... }`, [
        ['One test, which loops over the three rows internally', false],
        ['Three, one per InlineData row, each with its arguments', true],
        ['None, because a theory also needs a [Fact] attribute on the method', false],
      ], 'A [Theory] is expanded into one test case per data row, and each is reported (and can fail) separately with its argument values in the name. [Fact] and [Theory] are alternatives, not a pair.'),
      ck(T, `This test passes even though BorrowAsync never throws. Why?

    [Fact]
    public async Task Borrow_WhenNoCopyFree_Throws()
    {
        Assert.ThrowsAsync<ConflictException>(() => _service.BorrowAsync(7, "asha"));
    }`, [
        ['ConflictException is caught by xUnit before the assertion can run', false],
        ['ThrowsAsync only checks exceptions thrown synchronously by the lambda', false],
        ['The Task returned by ThrowsAsync is never awaited, so its failure is lost', true],
      ], 'Assert.ThrowsAsync reports its result through the Task it returns. Without await, the test method finishes before that Task is observed, so a failed assertion never reaches xUnit. Analyzer xUnit2021 warns about exactly this.'),
    ],
  },

  /* ── MOQ ────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_TESTING_MOQ',
    notes: `Most of your ASP.NET Core code is **services** that call repositories, an email sender and the
clock. To unit-test \`LoanService\` you do not want SQL Server running; you want its collaborators
replaced by **test doubles** you control. **Moq** creates them from an interface at run time.

    dotnet add Library.Tests package Moq

## The service under test

    public class LoanService(IBookRepository books, ILoanRepository loans, TimeProvider clock)
    {
        public const int MaxOpenLoans = 3;

        public async Task<Loan> BorrowAsync(int bookId, string memberId)
        {
            var book = await books.FindAsync(bookId)
                       ?? throw new NotFoundException($"Book {bookId} not found.");
            if (book.AvailableCopies == 0)
                throw new ConflictException("No copy is free.");
            if (await loans.CountOpenAsync(memberId) >= MaxOpenLoans)
                throw new ConflictException("Loan limit reached.");

            var today = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
            var loan = new Loan { BookId = bookId, MemberId = memberId,
                                  BorrowedOn = today, DueOn = today.AddDays(14) };
            book.AvailableCopies--;
            await loans.AddAsync(loan);
            return loan;
        }
    }

Because the service depends on **interfaces** (and on \`TimeProvider\`, the .NET 8 abstraction for
"now"), a test can hand it anything. That is the payoff of the constructor injection you learned in
the DI topic.

## Setup, Object, Verify

    public class LoanServiceTests
    {
        private readonly Mock<IBookRepository> _books = new();
        private readonly Mock<ILoanRepository> _loans = new();
        private readonly FakeTimeProvider _clock =
            new(new DateTimeOffset(2026, 3, 1, 9, 0, 0, TimeSpan.Zero));
        private readonly LoanService _service;

        public LoanServiceTests() =>
            _service = new LoanService(_books.Object, _loans.Object, _clock);

        [Fact]
        public async Task Borrow_FreeCopy_SavesLoanDueInFourteenDays()
        {
            var book = new Book { Id = 7, AvailableCopies = 1 };
            _books.Setup(b => b.FindAsync(7)).ReturnsAsync(book);
            _loans.Setup(l => l.CountOpenAsync("asha")).ReturnsAsync(0);

            var loan = await _service.BorrowAsync(7, "asha");

            Assert.Equal(new DateOnly(2026, 3, 15), loan.DueOn);
            Assert.Equal(0, book.AvailableCopies);
            _loans.Verify(l => l.AddAsync(It.Is<Loan>(x => x.BookId == 7 && x.MemberId == "asha")),
                          Times.Once());
        }

        [Fact]
        public async Task Borrow_AtLoanLimit_ThrowsAndSavesNothing()
        {
            _books.Setup(b => b.FindAsync(7)).ReturnsAsync(new Book { Id = 7, AvailableCopies = 2 });
            _loans.Setup(l => l.CountOpenAsync("asha")).ReturnsAsync(3);

            await Assert.ThrowsAsync<ConflictException>(() => _service.BorrowAsync(7, "asha"));
            _loans.Verify(l => l.AddAsync(It.IsAny<Loan>()), Times.Never());
        }
    }

- **\`Setup(...).ReturnsAsync(x)\`** says what a call returns; \`.ThrowsAsync(ex)\` makes it fail.
  For a synchronous method use \`.Returns(x)\` / \`.Throws(ex)\`.
- **\`mock.Object\`** is the fake implementation you pass to the code under test. Passing the
  \`Mock<T>\` itself does not compile.
- **Argument matching:** a literal (\`FindAsync(7)\`) matches by \`Equals\`; \`It.IsAny<int>()\`
  matches anything; \`It.Is<Loan>(x => ...)\` matches a predicate.
- **\`Verify(..., Times.Once())\`** checks a call happened; \`Times.Never()\` that it did not. On a
  failure path, verifying the save **never** happened is what proves the service failed cleanly.
- **\`FakeTimeProvider\`** (package Microsoft.Extensions.TimeProvider.Testing, .NET 8) gives a fixed
  "now" you can \`Advance(TimeSpan)\`. No mock needed for the clock.

## Loose versus strict

By default a mock is **loose**: a call with no matching setup returns a default — \`null\`, \`0\`,
\`false\`, and for \`Task<T>\` a completed task holding that default. So a setup with the wrong argument
does not fail loudly; \`FindAsync\` quietly returns \`null\` and your service throws "not found" for a
reason you did not intend. \`new Mock<IBookRepository>(MockBehavior.Strict)\` throws a
\`MockException\` on any call without a setup. \`VerifyNoOtherCalls()\` fails if anything was called
that you did not verify. Use both sparingly — they also fail when harmless calls are added.

## Capturing what was passed

    Loan? saved = null;
    _loans.Setup(l => l.AddAsync(It.IsAny<Loan>()))
          .Callback<Loan>(l => saved = l)
          .Returns(Task.CompletedTask);

## What Moq cannot do

Moq generates a subclass at run time, so it can only override **interface members and virtual
members**. Setting up a non-virtual method on a concrete class throws \`NotSupportedException\`
("Non-overridable members ... may not be used in setup / verification expressions"). The fix is to
depend on an interface — not to make everything virtual.

## When a mock lies to you

A mock returns what you told it, so it agrees with your assumptions even when they are wrong:

- **Mocking \`DbContext\` or \`DbSet\`.** A mocked \`DbSet\` runs LINQ in memory, so a query that EF
  Core cannot translate to SQL passes the test and throws in production. Test data access against a
  real database (the last concept unit) and mock *your* repository interface, not EF Core.
- **Stubbing a behaviour the real dependency does not have** — a repository that "returns the
  saved entity with its Id" when the real one does not.
- **Verifying every call.** A test that verifies each internal call breaks on every refactoring
  while the behaviour is unchanged. Verify the calls that are the point (the save, the email), and
  assert on results for the rest.

For \`ILogger<T>\`, pass \`NullLogger<T>.Instance\` rather than mocking it.`,
    mcqs: [
      mcq('A test does `_books.Setup(b => b.FindAsync(7)).ReturnsAsync(book)` but the service calls FindAsync(8). With a default Mock<IBookRepository>, what does FindAsync(8) return?', [
        ['A completed Task holding null, as loose mocks return defaults', true],
        ['It throws a MockException because no setup matches that call', false],
        ['The same book, since Setup on FindAsync matches every int value', false],
      ], 'Mocks are loose by default: an unmatched call returns the default value, and for Task<Book?> that is a completed Task whose result is null. Only MockBehavior.Strict throws on unmatched calls, and a literal argument matches by Equals.'),
      mcq('`new Mock<LoanCalculator>().Setup(c => c.Compute(loan))` throws NotSupportedException mentioning non-overridable members. What is the cause?', [
        ['Moq cannot mock a class that has a constructor with parameters', false],
        ['Compute is not virtual, so Moq\'s runtime subclass cannot override it', true],
        ['Setup must be called on mock.Object rather than on the mock itself', false],
      ], 'Moq builds a proxy subclass, which can only override interface or virtual members. A non-virtual method cannot be intercepted. Moq can pass constructor arguments, and Setup belongs on the Mock<T>.'),
      mcq('Why does the loan-limit test verify `AddAsync(It.IsAny<Loan>())` with Times.Never() after asserting the ConflictException?', [
        ['Moq reports a test as inconclusive when it has no Verify call', false],
        ['It makes the ConflictException propagate out of the test method', false],
        ['It proves no loan was saved before the service threw its exception', true],
      ], 'The exception alone does not show the service failed cleanly; a version that saved the loan and then threw would still pass. Times.Never() pins down that nothing was persisted. Moq has no rule requiring Verify.'),
    ],
    checkpoint: [
      ck(T, `What happens when this test runs?

    var books = new Mock<IBookRepository>();
    var service = new LoanService(books, loans.Object, clock);`, [
        ['It fails to compile, as Mock<IBookRepository> is not an IBookRepository', true],
        ['It compiles, and Moq unwraps the mock into an implementation at run time', false],
        ['It compiles but throws a MockException on the first call to the service', false],
      ], 'Mock<T> is the controller of the fake; the fake itself is mock.Object, which implements the interface. Passing the Mock<T> is a type error caught by the compiler.'),
      ck(T, 'LoanService reads the date with `clock.GetUtcNow()` from an injected TimeProvider. Which test setup keeps "due in 14 days" deterministic?', [
        ['Assert only that DueOn is later than DateTime.Now in the test', false],
        ['Inject a FakeTimeProvider fixed at a known instant', true],
        ['Run the test only in the IST time zone so the date always agrees', false],
      ], 'FakeTimeProvider (Microsoft.Extensions.TimeProvider.Testing) makes "now" a constant the test chooses, so the expected due date can be computed exactly. A weaker assertion or a time-zone convention only hides the dependency on real time.'),
      ck(T, `Which call does this setup capture?

    Loan? saved = null;
    _loans.Setup(l => l.AddAsync(It.IsAny<Loan>()))
          .Callback<Loan>(l => saved = l)
          .Returns(Task.CompletedTask);`, [
        ['Only the first loan, as Callback runs once and then removes itself', false],
        ['None, because Callback is ignored when Returns is also configured', false],
        ['Every AddAsync call, leaving saved holding the last loan passed in', true],
      ], 'The setup matches any Loan and the callback runs on every matching call, overwriting saved each time. Callback and Returns combine: the callback runs, then the configured return value is produced.'),
    ],
  },

  /* ── INTEGRATION_TESTS ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_TESTING_INTEGRATION_TESTS',
    notes: `Unit tests check the service. Something has to check everything around it: routing, model
binding, \`[ApiController]\` validation, the exception handler that turns \`NotFoundException\` into
404 ProblemDetails, authentication, authorization and JSON. **\`WebApplicationFactory<TEntryPoint>\`**
(package **Microsoft.AspNetCore.Mvc.Testing**) starts your real application — the real
\`Program.cs\`, the real middleware — on an in-memory **TestServer**, and hands you an \`HttpClient\`
that talks to it without opening a port.

    dotnet add Library.Tests package Microsoft.AspNetCore.Mvc.Testing

## Making Program visible

With top-level statements the compiler generates an **internal** \`Program\` class, and the test
project cannot name it — \`WebApplicationFactory<Program>\` fails with CS0122 "'Program' is
inaccessible due to its protection level". Add one line at the end of \`Program.cs\`:

    public partial class Program { }

## The first test

    public class BooksApiTests(WebApplicationFactory<Program> factory)
        : IClassFixture<WebApplicationFactory<Program>>
    {
        [Fact]
        public async Task GetBook_Unknown_Returns404ProblemDetails()
        {
            var client = factory.CreateClient();

            var response = await client.GetAsync("/api/books/999");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
            Assert.Equal(404, problem!.Status);
        }
    }

- **\`IClassFixture<WebApplicationFactory<Program>>\`** builds the factory — and so the host — once
  for the class and injects it into every test's constructor. Without it you would start the app for
  every test.
- **\`CreateClient()\`** returns an \`HttpClient\` whose base address is \`http://localhost\`; requests
  go straight into the pipeline in memory.
- Assert on **\`StatusCode\`**, not \`EnsureSuccessStatusCode()\`. That throws an
  \`HttpRequestException\` that hides which status you actually got and the ProblemDetails body.

## A custom factory: replacing services

The real app talks to SQL Server and reads the JWT key from configuration. A test needs its own
database and its own settings. Derive from the factory and override \`ConfigureWebHost\`:

    public class LibraryApiFactory : WebApplicationFactory<Program>
    {
        private readonly SqliteConnection _conn = new("DataSource=:memory:");

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");
            builder.UseSetting("Jwt:Key", TestTokens.Key);

            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<DbContextOptions<LibraryDbContext>>();
                _conn.Open();
                services.AddDbContext<LibraryDbContext>(o => o.UseSqlite(_conn));
            });
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            _conn.Dispose();
        }
    }

**\`ConfigureTestServices\`** runs *after* the application's own registrations, so what you add there
wins — *except* for a \`DbContext\`, where you must **remove** the app's
\`DbContextOptions<LibraryDbContext>\` first. In EF Core 8, \`AddDbContext\` registers the options with
\`TryAdd\`, so a second call is **silently ignored**: the tests keep using the SQL Server connection
string from the app — failing to connect, or worse, writing to a real database. (EF Core 9 changed
this: configurations accumulate, leaving both gives an \`InvalidOperationException\` saying two
database providers are registered, and Microsoft's sample also removes
\`IDbContextOptionsConfiguration<LibraryDbContext>\`.) Create the schema once the host is built, from
a scope: \`db.Database.EnsureCreated()\`.

## Sending and reading JSON

    var response = await client.PostAsJsonAsync("/api/books",
        new { title = "", author = "R. Martin", isbn = "9780132350884", totalCopies = 2 });

    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
    Assert.True(problem!.Errors.ContainsKey("Title"));

\`[ApiController]\` answers an invalid body with **400** and a \`ValidationProblemDetails\` whose
\`errors\` maps each field to its messages — before your action runs. For a successful create,
check \`response.Headers.Location\` as well as the status 201.

## Testing secured endpoints

Two approaches, and a good suite uses both.

**1. A test authentication scheme** — fast, lets each test pick a role:

    public class TestAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger, UrlEncoder encoder)
        : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
    {
        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            if (!Request.Headers.TryGetValue("X-Test-Role", out var role))
                return Task.FromResult(AuthenticateResult.NoResult());
            var claims = new[] { new Claim(ClaimTypes.NameIdentifier, "member-1"),
                                 new Claim(ClaimTypes.Role, role.ToString()) };
            var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));
            return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal, "Test")));
        }
    }

    // in ConfigureTestServices
    services.AddAuthentication("Test")
            .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", _ => { });

With no header the handler returns \`NoResult\`, so an \`[Authorize]\` endpoint answers **401**; with
\`X-Test-Role: Member\` on a \`[Authorize(Roles = "Librarian")]\` endpoint it answers **403**. (The
.NET 8 \`AuthenticationHandler\` constructor no longer takes \`ISystemClock\`.) If \`Program.cs\` sets
\`DefaultAuthenticateScheme\` and \`DefaultChallengeScheme\` explicitly, those win over the default
scheme, so the test must set them to "Test" too.

**2. A real token** — slower, but it is the only way to test that **\`AddJwtBearer\`** really
validates what your login endpoint issues. Log in through \`POST /api/auth/login\` with a seeded user
and send the token:

    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

Use the test scheme for the many "right role, wrong role, nobody" tests, and one or two real-token
tests for the JWT configuration itself.`,
    workedExample: `**Problem:** \`DELETE /api/books/{id}\` is for librarians, returns 204, and must not touch a book for
anyone else. Write the three access tests with the \`LibraryApiFactory\` and the test scheme.

    public class DeleteBookTests(LibraryApiFactory factory) : IClassFixture<LibraryApiFactory>
    {
        private HttpClient ClientAs(string? role)
        {
            var c = factory.CreateClient();
            if (role is not null) c.DefaultRequestHeaders.Add("X-Test-Role", role);
            return c;
        }

        [Fact]
        public async Task Librarian_Gets204_AndBookIsGone()
        {
            int id = await factory.SeedBookAsync("Refactoring");
            var r = await ClientAs("Librarian").DeleteAsync($"/api/books/{id}");
            Assert.Equal(HttpStatusCode.NoContent, r.StatusCode);
            Assert.Equal(HttpStatusCode.NotFound,
                (await ClientAs("Librarian").GetAsync($"/api/books/{id}")).StatusCode);
        }

        [Fact]
        public async Task Member_Gets403_AndBookRemains()
        {
            int id = await factory.SeedBookAsync("Refactoring");
            var r = await ClientAs("Member").DeleteAsync($"/api/books/{id}");
            Assert.Equal(HttpStatusCode.Forbidden, r.StatusCode);
            Assert.Equal(HttpStatusCode.OK,
                (await ClientAs("Librarian").GetAsync($"/api/books/{id}")).StatusCode);
        }

        [Fact]
        public async Task Anonymous_Gets401()
        {
            var r = await ClientAs(null).DeleteAsync("/api/books/1");
            Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);
        }
    }

**Reasoning:** each test creates its own book (\`SeedBookAsync\` opens a scope on
\`factory.Services\` and saves through the real \`LibraryDbContext\`), so the tests do not depend on
each other's data. The 403 test checks the book is **still there** — a status code alone cannot tell
"blocked before the delete" from "deleted, then failed a check". The 401 test needs no seeded book:
authorization rejects the request before routing values are ever used.`,
    mcqs: [
      mcq('The test project has `class ApiTests : IClassFixture<WebApplicationFactory<Program>>` and fails to build with CS0122 "\'Program\' is inaccessible due to its protection level". What is the usual fix?', [
        ['Add `public partial class Program { }` at the end of Program.cs', true],
        ['Reference Microsoft.AspNetCore.Mvc.Testing from the API project too', false],
        ['Rename Program to Startup so WebApplicationFactory can locate it', false],
      ], 'Top-level statements generate an internal Program class. Declaring a public partial Program in the API project makes it visible to the test assembly; the testing package is only needed by the test project.'),
      mcq('On EF Core 8, a custom factory calls `services.AddDbContext<LibraryDbContext>(o => o.UseSqlite(conn))` in ConfigureTestServices without removing anything. Which database does the first query use?', [
        ['The SQLite connection, because the later registration replaces the first', false],
        ['Neither; the host refuses to start with two DbContext registrations', false],
        ['SQL Server, because the second AddDbContext call is quietly ignored', true],
      ], 'In EF Core 8 AddDbContext registers DbContextOptions<T> with TryAdd, so the app\'s SQL Server options stay and the SQLite call has no effect. Removing DbContextOptions<LibraryDbContext> first is the documented approach (EF Core 9 instead reports two providers).'),
      mcq('With the TestAuthHandler, a request carrying `X-Test-Role: Member` calls an action marked [Authorize(Roles = "Librarian")]. What status comes back?', [
        ['401, because the member has not presented a JWT to the API', false],
        ['404, because the role check hides endpoints from other roles', false],
        ['403, as the user is authenticated but lacks the Librarian role', true],
      ], 'The test scheme authenticates the request as a Member, so authorization runs and fails the role requirement, which is a forbid: 403. 401 is for a request with no authenticated user at all.'),
    ],
    checkpoint: [
      ck(A, 'Why does a custom WebApplicationFactory register its replacement services inside ConfigureTestServices?', [
        ['It is the only callback that may call AddDbContext in a test host', false],
        ['It runs after Program.cs registers its services, so its registrations win', true],
        ['It runs before Program.cs, so the app can overwrite anything that is unsafe', false],
      ], 'ConfigureTestServices is applied after the application\'s own service registrations, so services added there take precedence and registrations removed there stay removed. That ordering is the whole reason it exists.'),
      ck(T, `What does this test prove when it passes?

    var r = await client.PostAsJsonAsync("/api/books", new { title = "" });
    r.EnsureSuccessStatusCode();`, [
        ['That the API rejects a book with a blank title', false],
        ['Nothing useful: it passes only if the API accepted a blank title', true],
        ['That validation returned a ValidationProblemDetails body with errors for title', false],
      ], 'EnsureSuccessStatusCode throws for 400, so the test passes only when the invalid book was accepted. To test validation, assert the status is 400 and read the ValidationProblemDetails errors.'),
      ck(A, 'Program.cs sets `DefaultAuthenticateScheme` and `DefaultChallengeScheme` to JwtBearer. A test adds `AddAuthentication("Test").AddScheme<...>("Test", ...)` and every request still returns 401. Why?', [
        ['The explicit authenticate and challenge defaults outrank the default scheme', true],
        ['A custom handler cannot be added once AddJwtBearer has already been registered', false],
        ['TestServer strips every request header whose name starts with X-', false],
      ], 'AddAuthentication("Test") sets DefaultScheme, but the more specific DefaultAuthenticateScheme and DefaultChallengeScheme still name JwtBearer, so the test handler never runs. The test must set those two options to "Test" as well.'),
    ],
  },

  /* ── DATABASE_TESTS ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_TESTING_DATABASE_TESTS',
    notes: `Service tests mock the repository, and some integration tests do not care about storage. Something
still has to check that your **EF Core queries, mappings, constraints and migrations** work on a
database engine. The question is which engine.

## Why the EF Core in-memory provider misleads

\`UseInMemoryDatabase("test")\` looks convenient and Microsoft's own testing guidance discourages it
for this purpose, because it is **not a relational database**:

- **No constraints.** A unique index on \`Isbn\` is not enforced, so the duplicate-ISBN test passes
  and production throws \`DbUpdateException\`.
- **LINQ runs in memory.** A query EF Core cannot translate to SQL works in the test and fails in
  production with "could not be translated".
- **No raw SQL**: \`FromSql\` and \`ExecuteSqlRaw\` are not supported.
- **Different string comparison**: in-memory comparisons are case-sensitive .NET comparisons; SQL
  Server's default collation is case-insensitive. \`b.Title == "clean code"\` finds the book in SQL
  Server and not in memory.
- **No transactions**: by default \`BeginTransaction\` throws, because transactions are ignored
  (\`InMemoryEventId.TransactionIgnoredWarning\` is configured as an error).

A test that passes against something that is not your database proves little about your database.

## Option 1: SQLite in-memory

SQLite is a real relational engine that runs inside the test process. An in-memory SQLite database
lives **only as long as its connection is open**, so open one connection and give that connection to
EF Core:

    public class LoanQueryTests : IDisposable
    {
        private readonly SqliteConnection _conn = new("DataSource=:memory:");
        private readonly DbContextOptions<LibraryDbContext> _options;

        public LoanQueryTests()
        {
            _conn.Open();
            _options = new DbContextOptionsBuilder<LibraryDbContext>().UseSqlite(_conn).Options;
            using var db = new LibraryDbContext(_options);
            db.Database.EnsureCreated();
        }

        [Fact]
        public async Task Overdue_ExcludesReturnedAndNotYetDue()
        {
            var today = new DateOnly(2026, 3, 20);
            using (var db = new LibraryDbContext(_options))
            {
                db.Loans.AddRange(
                    Loan(due: today.AddDays(-1)),                              // overdue
                    Loan(due: today.AddDays(-5), returned: today.AddDays(-6)), // returned
                    Loan(due: today));                                         // due today
                await db.SaveChangesAsync();
            }

            using var check = new LibraryDbContext(_options);
            var overdue = await new LoanRepository(check).FindOverdueAsync(today);

            Assert.Single(overdue);
        }

        public void Dispose() => _conn.Dispose();
    }

Seeding and querying through **separate \`DbContext\` instances** matters: with one context, the
query could be answered from entities the change tracker already holds, and you would not be
testing the SQL round trip.

SQLite enforces unique indexes and foreign keys, and translates LINQ to SQL — far closer than the
in-memory provider. But it is **not SQL Server**: no schemas like \`dbo\`, different types (EF Core's
SQLite provider cannot order by a \`decimal\` column), no T-SQL in raw queries, and your SQL Server
migrations do not apply to it, which is why the setup uses \`EnsureCreated\`.

## Option 2: SQL Server in a container

For queries and migrations that must be SQL Server's, run a real SQL Server in Docker for the test
run with **Testcontainers** (package Testcontainers.MsSql):

    public class SqlServerFixture : IAsyncLifetime
    {
        private readonly MsSqlContainer _db = new MsSqlBuilder()
            .WithImage("mcr.microsoft.com/mssql/server:2022-latest")
            .Build();

        public string ConnectionString => _db.GetConnectionString();

        public async Task InitializeAsync()
        {
            await _db.StartAsync();
            await using var ctx = new LibraryDbContext(new DbContextOptionsBuilder<LibraryDbContext>()
                .UseSqlServer(ConnectionString).Options);
            await ctx.Database.MigrateAsync();   // the real migrations, on the real engine
        }

        public Task DisposeAsync() => _db.DisposeAsync().AsTask();
    }

    [CollectionDefinition("SqlServer")]
    public class SqlServerCollection : ICollectionFixture<SqlServerFixture> { }

    [Collection("SqlServer")]
    public class BookRepositoryTests(SqlServerFixture fx) { ... }

\`IAsyncLifetime\` gives the fixture async setup and teardown (\`Task\` in xUnit v2, \`ValueTask\` in v3).
A **collection fixture** starts one container for every class in the collection, not one per class.
Startup takes seconds, so this is for the tests that need it. Docker must be running wherever the
tests run, including CI.

## Keeping tests independent

The database outlives a single test, so tests can see each other's rows. Three fixes:

- **Each test creates its own data** and asserts only on it — find "the loan I just created", not
  "there are 3 loans".
- **Reset between tests.** The **Respawn** library deletes all rows (keeping the schema and
  \`__EFMigrationsHistory\`) quickly: create a \`Respawner\` once, call \`ResetAsync\` before each test.
- **Run database classes serially.** xUnit v2 runs test *classes* in parallel by default (each class
  is its own collection). Put classes that share a database in the **same \`[Collection]\`** so they
  run one after another.

Choose per test: plain unit tests for rules, SQLite for most query tests, the SQL Server container
for anything that depends on SQL Server itself — raw T-SQL, collation, the migrations.`,
    mcqs: [
      mcq('A test using UseInMemoryDatabase saves two books with the same ISBN and passes. Production has a unique index on Isbn. What does that mean?', [
        ['The unique index must be missing from the production schema too', false],
        ['The in-memory provider does not enforce indexes, so it proved nothing', true],
        ['EF Core checks uniqueness itself, so production behaves the same way', false],
      ], 'The in-memory provider is not relational and ignores unique indexes. SQL Server enforces them, so production throws a DbUpdateException that the test could never see.'),
      mcq('Seeding uses `UseSqlite("DataSource=:memory:")` with a connection string, and the query test fails with "SQLite Error 1: \'no such table: Loans\'". What is wrong?', [
        ['SQLite cannot create a table whose name is a plural English word', false],
        ['EnsureCreated must be called after every SaveChanges in SQLite', false],
        ['Each connection opens a new, empty in-memory database of its own', true],
      ], 'An in-memory SQLite database exists only while its connection is open, and every new connection gets a fresh one. Opening one SqliteConnection and passing it to UseSqlite keeps the schema created by EnsureCreated.'),
      mcq('Why does the SqlServerFixture call `MigrateAsync()` instead of `EnsureCreated()`?', [
        ['It applies the real migrations, so the tests also check them on SQL Server', true],
        ['EnsureCreated is not supported when the provider is SQL Server', false],
        ['MigrateAsync runs faster because it skips creating any of the table indexes', false],
      ], 'MigrateAsync applies the same migrations production uses, so a broken migration fails the suite. EnsureCreated works on SQL Server but builds the schema from the model, bypassing the migrations.'),
    ],
    checkpoint: [
      ck(T, 'Two repository test classes share one SQL Server container. Each passes alone; together they fail on row counts now and then. What is the most likely cause?', [
        ['Testcontainers gives each class a different database at random', false],
        ['xUnit runs the two classes in parallel against the same tables', true],
        ['MigrateAsync rolls back every row a test inserts when it finishes', false],
      ], 'In xUnit v2 each test class is its own collection, and collections run in parallel, so two classes write to the same tables at the same time. Putting both in one [Collection] and resetting data between tests removes the race.'),
      ck(T, '`db.Books.Where(b => b.Title == "clean code")` finds "Clean Code" on SQL Server. What does the same query return with the in-memory provider?', [
        ['The book, because EF Core lower-cases both sides of a comparison', false],
        ['The book, since the in-memory provider emulates SQL Server rules', false],
        ['Nothing, because the comparison is a case-sensitive .NET one', true],
      ], 'The in-memory provider evaluates the LINQ with ordinary .NET string equality, which is case-sensitive. SQL Server\'s default collation is case-insensitive, so the two disagree — one reason the provider is a poor stand-in.'),
      ck(T, `Why does this test query through a second context instead of reusing db?

    using (var db = new LibraryDbContext(_options)) { db.Loans.Add(loan); await db.SaveChangesAsync(); }
    using var check = new LibraryDbContext(_options);
    var found = await check.Loans.Include(l => l.Book).SingleAsync(l => l.Id == loan.Id);`, [
        ['So the result comes from SQL, not the first context\'s tracked entities', true],
        ['A DbContext may run only one SaveChanges and one query in its lifetime', false],
        ['SQLite drops every row when the first DbContext instance is disposed', false],
      ], 'A context that saved the loan already tracks it, so navigation fix-up can fill in data without the mapping or the Include ever being exercised. A fresh context must load everything from the database.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_TESTING_DEBUGGING',
    notes: `A failing test is a bug report about either the code or the test. Read the first error in the
\`dotnet test\` output — the build error, the inner exception at the bottom of a stack trace, or the
"Expected / Actual" lines — and decide which it is before changing anything. Each case below is a
fault students hit on this library API.

## 1. "No test is available"

    No test is available in ...\\Library.Tests.dll. Make sure that test discoverer & executors
    are registered and platform & framework version settings are appropriate and try again.

**Cause:** the project references \`xunit\` but not **\`xunit.runner.visualstudio\`** (or not
\`Microsoft.NET.Test.Sdk\`), so \`dotnet test\` has no adapter to find the tests. **Fix:** add the
missing package. A related silent case: the test class is \`internal\` — the tests compile and are not
discovered. Make it \`public\`.

## 2. A test that cannot fail

    [Fact]
    public async Task Borrow_NoFreeCopy_Throws()
    {
        Assert.ThrowsAsync<ConflictException>(() => _service.BorrowAsync(7, "asha"));
    }

It passes even with the check deleted. **Cause:** the \`Task\` from \`ThrowsAsync\` is never awaited,
so its failure is never observed. **Fix:** \`await Assert.ThrowsAsync<...>(...)\`. Make it a habit to
break the code once and watch every new test fail.

## 3. CS0122 on WebApplicationFactory<Program>

    error CS0122: 'Program' is inaccessible due to its protection level

**Cause:** top-level statements generate an internal \`Program\`. **Fix:** add
\`public partial class Program { }\` to the end of \`Program.cs\`.

## 4. The tests are still talking to SQL Server

The custom factory adds SQLite, yet the first request fails with a \`SqlException\` ("A
network-related or instance-specific error occurred while establishing a connection to SQL
Server") — or, on a developer machine, quietly succeeds against the local SQL Server database.
**Cause:** on EF Core 8, \`AddDbContext\` registers its options with \`TryAdd\`, so the second call in
\`ConfigureTestServices\` was ignored and the app's SQL Server options are still in force. (On EF Core
9 the same mistake instead throws an \`InvalidOperationException\` about two database providers being
registered.) **Fix:** \`services.RemoveAll<DbContextOptions<LibraryDbContext>>()\` before adding the
test one — and on EF Core 9 also remove \`IDbContextOptionsConfiguration<LibraryDbContext>\`.

## 5. 401 on every request despite the test scheme

The \`TestAuthHandler\` is registered and the header is sent, yet everything answers **401** (with
\`WWW-Authenticate: Bearer\`). That header is the clue: the JWT handler, not yours, challenged.
**Cause:** \`Program.cs\` sets \`DefaultAuthenticateScheme\` and \`DefaultChallengeScheme\` to
JwtBearer, which outrank the \`DefaultScheme\` your test changed — or the controller says
\`[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]\`. **Fix:** set those
options to the test scheme in \`ConfigureTestServices\`, or put the scheme in a policy the test can
configure. Do not delete \`[Authorize]\` to make the test green.

A **403** where you expected 200 is a different bug: the user is authenticated but the role claim is
wrong — e.g. the handler sends \`"librarian"\` and the attribute says \`Roles = "Librarian"\`. Role
checks are case-sensitive string matches on the claim.

## 6. "no such table" from SQLite

    Microsoft.Data.Sqlite.SqliteException: SQLite Error 1: 'no such table: Books'.

**Cause:** \`UseSqlite("DataSource=:memory:")\` with a connection *string*: every new connection
opens a new, empty database, so the schema \`EnsureCreated\` built is gone. **Fix:** open one
\`SqliteConnection\`, keep it open for the test's lifetime, pass the connection to \`UseSqlite\`. If
the error appears through \`WebApplicationFactory\`, check that \`EnsureCreated\` ran against the
replaced context, from a scope on \`factory.Services\`.

## 7. Green alone, red in the full run

\`BooksApiTests\` passes alone and fails in \`dotnet test\` with "Assert.Equal() Failure: Expected 3,
Actual 5". **Cause:** another class wrote to the same database, in parallel or earlier. **Fix:**
assert on data the test created, reset with Respawn, and put classes sharing a database in one
\`[Collection]\`. Do not "fix" it by ordering tests.

## 8. Moq refuses the setup

    System.NotSupportedException: Unsupported expression: c => c.Compute(It.IsAny<Loan>())
    Non-overridable members (here: LoanCalculator.Compute) may not be used in setup / verification expressions.

**Cause:** mocking a concrete class's non-virtual method. **Fix:** depend on an interface
(\`ILoanCalculator\`) and mock that — or, for a pure calculation, use the real class.`,
    mcqs: [
      mcq('`dotnet test` builds Library.Tests and prints "No test is available in ...Library.Tests.dll". The project references xunit and Microsoft.NET.Test.Sdk. What is missing?', [
        ['The xunit.runner.visualstudio adapter package', true],
        ['A [TestClass] attribute on each xUnit test class', false],
        ['A reference to Microsoft.AspNetCore.Mvc.Testing', false],
        ['The Moq package for creating the fake objects', false],
      ], 'dotnet test discovers xUnit tests through the xunit.runner.visualstudio adapter. Without it the assembly builds and nothing is found. [TestClass] is MSTest, and the testing and mocking packages do not affect discovery.'),
      mcq('Every request in the integration tests returns 401 with a `WWW-Authenticate: Bearer` header, although the TestAuthHandler is registered. What does the header tell you?', [
        ['The token sent by the test has expired since the suite started', false],
        ['The JWT bearer handler issued the challenge, not the test scheme', true],
        ['TestServer blocks authentication headers on in-memory requests', false],
        ['The role claim does not match the role in the [Authorize] attribute', false],
      ], 'WWW-Authenticate: Bearer is written by the JwtBearer handler when it challenges, so the request was authenticated with JwtBearer rather than the test scheme. A role mismatch would give 403, not 401.'),
      mcq('BooksApiTests passes alone but fails in the full run with "Expected 3, Actual 5" on a count of books. What should be fixed first?', [
        ['Run the suite with a fixed test order so the result repeats', false],
        ['Raise the expected count to 5 to match the full-run database', false],
        ['Data from other classes reaches the same tables the test counts', true],
        ['Create a brand-new WebApplicationFactory inside each test method', false],
      ], 'Classes run in parallel and share the database, so rows from other tests are counted. Asserting on the test\'s own data, resetting between tests and grouping database classes in one collection fix the cause; the other options hide it.'),
      mcq('A test sends `X-Test-Role: librarian` and gets 403 from an action marked `[Authorize(Roles = "Librarian")]`. Why?', [
        ['The test handler must also add a Name claim before roles apply', false],
        ['Role names in the attribute are matched to the claim case-sensitively', true],
        ['A role header is only read on GET requests by the TestServer', false],
      ], 'The user is authenticated, so the failure is authorization: the role claim "librarian" does not equal "Librarian" in a case-sensitive comparison, which gives 403.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_TESTING_PRACTICE',
    notes: `Six exercises on the library API you are building. Write each test, run it, and **see it fail for
the right reason** before you make it pass — break the production line it protects, watch the test
go red, restore it. A test you never saw fail might not be testing anything.

## Exercise 1 — The fee calculator, edges first

Write \`LateFeeCalculatorTests\` with a \`[Theory]\` covering: returned the same day, day 14, day 15,
the first day the cap is reached, far past the cap. Add a \`[Fact]\` for a return before the borrow
date that also checks \`ParamName\`. Then change \`LoanDays\` to 13 and note which rows fail and which
cannot see the change.

## Exercise 2 — LoanService with Moq

Test \`BorrowAsync\` for: success (due date from a \`FakeTimeProvider\`, one copy fewer, \`AddAsync\`
called once with the right book and member), unknown book (\`NotFoundException\`), no free copy and
the three-loan limit (\`ConflictException\`). Every failure test verifies \`AddAsync\` was **never**
called. Then add \`ReturnAsync\`: a member returning someone else's loan gets
\`ForbiddenException\`.

## Exercise 3 — The custom factory

Build \`LibraryApiFactory\` with SQLite in-memory, \`UseSetting\` for the JWT key, and the test
authentication scheme driven by an \`X-Test-Role\` header. Add a \`SeedBookAsync\` helper that opens a
scope on \`Services\` and saves through the real context. Prove it works with \`GET /api/books/{id}\`
returning 200 for a seeded book.

## Exercise 4 — BooksController's contract

Through the factory: GET unknown id (404, ProblemDetails with status 404), POST valid as Librarian
(201 and a \`Location\` header you then GET), POST with a blank title (400, \`errors\` contains
\`Title\`), POST a duplicate ISBN (409), POST as Member (403) and with no header (401). For the 403,
check afterwards that no book was created.

## Exercise 5 — The overdue query, three ways

Write the \`FindOverdueAsync\` test with rows that should match and rows that should not (returned,
not yet due, due exactly today). Run it on \`UseInMemoryDatabase\`, then SQLite, then the SQL Server
container. Add a case-insensitive title search and a raw SQL query, and record which engine catches
what.

## Exercise 6 — One real token

Write one test that seeds a user through \`UserManager\`, calls \`POST /api/auth/login\`, reads the
token, sets the \`Authorization: Bearer\` header, borrows a book and sees it in
\`GET /api/loans/me\`. Then change the test's signing key by one character and confirm the borrow
returns 401. Run the whole suite twice in a row and confirm it is still green.`,
    mcqs: [
      mcq('In Exercise 1, LoanDays is set to 13 by mistake. Which [InlineData] row fails?', [
        ['(0, 0): the book is returned the same day it was borrowed', false],
        ['(14, 0): the last free day of a fourteen-day loan', true],
        ['(55, 200): a return well past the point where the cap applies', false],
        ['(200, 200): a return months after the book was borrowed', false],
      ], 'With 13 loan days, keeping a book 14 days is one day late and costs Rs 5, so (14, 0) fails. The same-day row is still free, and the far rows are capped at Rs 200 either way, so they cannot see the change.'),
      mcq('In Exercise 2, why does the unknown-book test use `_books.Setup(b => b.FindAsync(99)).ReturnsAsync((Book?)null)` instead of no setup at all?', [
        ['Without a setup the loose mock throws on FindAsync(99)', false],
        ['ReturnsAsync(null) does not compile without the cast to Book?', false],
        ['Moq ignores Verify calls on a mock that has no setups', false],
        ['It states the scenario explicitly, though a loose mock also gives null', true],
      ], 'A loose mock would already return a completed Task holding null, so the test works either way. The explicit setup documents the scenario the test is about, which matters to the next reader; it does not change Moq\'s behaviour.'),
      mcq('In Exercise 4, the POST as Member returns 403 as expected. What does the follow-up check that no book was created add?', [
        ['It proves authorization ran before the book was saved', true],
        ['It makes the TestServer release the test database file', false],
        ['It is needed because 403 responses have no body to read', false],
      ], 'A 403 alone cannot distinguish a request blocked before the action from one that saved the book and then failed a later check. Seeing the data unchanged proves the rule fires first.'),
      mcq('In Exercise 5, which check fails only on the SQL Server container and passes on both the in-memory provider and SQLite?', [
        ['A unique ISBN index rejecting a duplicate book on save', false],
        ['A raw query written in T-SQL with TOP and GETDATE()', false],
        ['A broken migration that the real schema depends on', true],
        ['A LINQ query that EF Core cannot translate into SQL', false],
      ], 'Only the container runs MigrateAsync on SQL Server. SQLite uses EnsureCreated, and the in-memory provider has no schema. SQLite already catches the unique index and untranslatable LINQ, and it rejects T-SQL too, so those do not pass there.'),
      mcq('In Exercise 6, the test signs in successfully but the borrow call returns 401 after the key is changed in the test. What has the test demonstrated?', [
        ['That login and borrowing use two different user accounts', false],
        ['That AddJwtBearer rejects a token whose signature does not verify', true],
        ['That the factory restarts the host whenever a setting changes', false],
      ], 'The changed key makes the signature invalid under the API\'s key, and the bearer handler refuses to authenticate the request, so [Authorize] answers 401. This is the JWT configuration the test scheme deliberately bypasses.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_TESTING_INTERVIEW_QUESTION',
    notes: `Three questions an interviewer for a .NET role asks, close to word for word, with an answer that
earns the follow-up, and the follow-up itself. Practise them aloud with your own library API as the
example — "in my project" is what makes an answer believable.

## Q1. "How do you test an ASP.NET Core Web API?"

**Strong answer.** "In layers, cheapest first. Business rules are **xUnit** unit tests with **Moq**
for the dependencies — \`LoanService\` gets mocked repositories and a \`FakeTimeProvider\`, no
database, milliseconds each. The HTTP surface I test with **\`WebApplicationFactory<Program>\`**: the
real pipeline in memory, so routing, \`[ApiController]\` validation, my exception handler's
ProblemDetails, and the access rules — right role, wrong role gets 403, nobody gets 401. In the
factory I swap SQL Server for SQLite in \`ConfigureTestServices\` and use a test authentication
scheme. Queries and migrations that depend on SQL Server run against a **Testcontainers** SQL Server.
Many fast tests at the bottom, a few slow ones at the top."

**Follow-up:** "Why not just use the EF Core in-memory provider?" — it is not relational: no
unique constraints, no transactions, no raw SQL, case-sensitive comparisons, and LINQ that would
fail translation still runs. Microsoft's own guidance discourages it for testing data access.

## Q2. "What is the difference between a mock and a stub, and when would you not mock?"

**Strong answer.** "A **stub** supplies answers — \`Setup(...).ReturnsAsync(book)\` — so the code
under test can run. A **mock** is also checked afterwards — \`Verify(r => r.AddAsync(...),
Times.Once())\` — because the call itself is the behaviour, like saving the loan or sending the
email. In Moq one object can be both. I don't mock what I don't own: I don't mock \`DbContext\` or
\`DbSet\`, because a mocked \`DbSet\` runs the LINQ in memory and hides translation failures — I
test the repository against a real database instead. I don't mock simple value calculations
either; I use the real class. And I verify only the calls that are the point, so a refactoring
doesn't break tests whose behaviour didn't change."

**Follow-up:** "Loose or strict mocks?" — loose by default, because strict mocks fail when harmless
calls are added. The cost is that an unmatched setup quietly returns \`null\`, so I keep setups
specific and assert on results.

## Q3. "How would you test that only librarians can delete a book?"

**Strong answer.** "An integration test through \`WebApplicationFactory\` with a test authentication
handler that takes the role from a header. Three tests: as a Librarian, \`DELETE\` returns 204 and a
follow-up GET returns 404; as a Member it returns 403 and the book is **still there** — because a
403 alone doesn't prove the rule ran before the delete; with no user it returns 401. The test
scheme bypasses JWT on purpose, so separately one test logs in for a real token and calls a
protected endpoint, to test the \`AddJwtBearer\` configuration itself."

**Follow-up:** "How do you keep these tests independent?" — each test seeds its own book through a
scope on \`factory.Services\`; database classes share one \`[Collection]\` so they don't run in
parallel against the same tables; and Respawn resets the SQL Server container between tests.`,
    mcqs: [
      mcq('Asked "why not test data access with UseInMemoryDatabase?", which answer best shows you understand the risk?', [
        ['It is slower than SQLite in-memory for any realistic test suite', false],
        ['It needs Docker, which many CI servers do not have available', false],
        ['It is not relational, so constraints and SQL translation go untested', true],
      ], 'The point is fidelity: no constraints, no transactions, no raw SQL, different string comparison and no SQL translation. It is fast and needs no Docker, so neither of the other answers is a reason to avoid it.'),
      mcq('The interviewer asks why you would not mock DbSet<Book> to test BookRepository. Which answer is right?', [
        ['Moq cannot create a mock of any generic type such as DbSet<T>', false],
        ['A mocked DbSet runs LINQ in memory, hiding queries EF Core cannot translate', true],
        ['DbSet<T> is a sealed class, so no mocking library is able to intercept its calls', false],
      ], 'The danger is false confidence: the mocked set evaluates the query as LINQ to Objects, so a query SQL Server would reject still passes. Moq handles generic types, and DbSet<T> is not sealed — it is designed so it can be mocked, which is exactly the trap.'),
      mcq('For "only librarians can delete", why does the strong answer check that the book still exists after the Member\'s 403?', [
        ['A rule checked after the delete would also return 403', true],
        ['WebApplicationFactory caches 403 responses between tests', false],
        ['The Member test would otherwise leave the database locked', false],
      ], 'A status code cannot distinguish a request blocked before the action from one that deleted the book and then failed a check. Seeing the book unchanged proves the rule fires first.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_TESTING_MINI_PROJECT',
    notes: `# A Secured, Tested Library API

Build a library API on **ASP.NET Core 8, EF Core 8 and SQL Server**, secured with **ASP.NET Core
Identity and JWT bearer authentication**, and prove it works with **unit, integration and database
tests**. The code is the easier half; the tests are what is being graded.

## Entities

| Entity | Fields | Rules |
|---|---|---|
| \`Book\` | Id, Title, Author, Isbn (unique index), TotalCopies, AvailableCopies | 0 ≤ AvailableCopies ≤ TotalCopies |
| \`Member\` | an Identity user (\`IdentityUser\`) with roles \`Librarian\` / \`Member\` | password hashed by Identity, never logged |
| \`Loan\` | Id, BookId, MemberId, BorrowedOn, DueOn, ReturnedOn | DueOn = BorrowedOn + 14 days |

Schema through EF Core migrations; no \`EnsureCreated\` in production code. "Now" comes from an
injected \`TimeProvider\`.

## Endpoints

| Method | Path | Who | Result |
|---|---|---|---|
| POST | /api/auth/login | anyone | 200 with a JWT; 401 on bad credentials |
| GET | /api/books?title=&page= | any signed-in user | 200, paged list |
| GET | /api/books/{id} | any signed-in user | 200, or 404 ProblemDetails |
| POST | /api/books | Librarian | 201 with Location; 400 ValidationProblemDetails; 409 on duplicate ISBN |
| DELETE | /api/books/{id} | Librarian | 204; 409 if any copy is on loan |
| POST | /api/loans | Member | 201; 409 if no copy is free or the member has 3 open loans |
| POST | /api/loans/{id}/return | the loan's member, or a Librarian | 200 with the late fee; 403 for another member |
| GET | /api/loans/me | Member | 200, the caller's open loans |
| GET | /api/loans/overdue | Librarian | 200, loans past DueOn and not returned |

Every error is ProblemDetails, produced by one exception handler (\`IExceptionHandler\` on .NET 8)
that maps \`NotFoundException\` to 404, \`ConflictException\` to 409 and \`ForbiddenException\` to
403. \`[ApiController]\` produces the 400s.

## Required tests

1. **Unit (xUnit):** \`LateFeeCalculator\` with a \`[Theory]\` on the boundaries — Rs 5 per day after
   DueOn, capped at Rs 200.
2. **Service (Moq):** \`LoanService.BorrowAsync\` and \`ReturnAsync\` — success, no free copy, the
   three-loan limit, returning an already-returned loan, returning another member's loan. Every
   failure verifies nothing was saved. A \`FakeTimeProvider\`.
3. **Integration (WebApplicationFactory):** a \`LibraryApiFactory\` on SQLite with a test
   authentication scheme. For every endpoint, its success case and its validation or conflict case;
   for every protected endpoint, right role, wrong role (403, data unchanged) and anonymous (401).
   One test logs in through \`/api/auth/login\` and uses the real token.
4. **Database (Testcontainers SQL Server):** migrations applied with \`MigrateAsync\`;
   \`FindOverdueAsync\` and the open-loan count with rows that should and should not match; the
   unique ISBN index raising \`DbUpdateException\`. Data reset between tests with Respawn.

## Acceptance criteria

- \`dotnet test\` is green on a clean clone with Docker running, twice in a row.
- No test depends on another test's data or on run order; database classes share one collection.
- Nothing in the code under test reads \`DateTime.Now\` or \`DateTime.UtcNow\` directly.
- Every endpoint in the table has a test asserting its status **and** its body or headers.
- The README lists the test classes, which kind each is, and why that kind was chosen.`,
    mcqs: [
      mcq('The brief puts the duplicate-ISBN check in the Testcontainers SQL Server tests. Why not in the WebApplicationFactory tests on SQLite alone?', [
        ['SQLite cannot store an ISBN of thirteen digits in a text column', false],
        ['Only the SQL Server run applies the real migrations that create the index', true],
        ['WebApplicationFactory cannot send two POST requests in a single test', false],
      ], 'The index that matters is the one the migrations create on SQL Server. The SQLite factory builds its schema from the model with EnsureCreated, so it would still pass if the migration forgot the index.'),
      mcq('Which test in the brief is the only one that proves AddJwtBearer accepts the tokens the login endpoint issues?', [
        ['Any integration test that sends X-Test-Role: Member', false],
        ['The Moq test of LoanService.BorrowAsync with a fake clock', false],
        ['The test that logs in and calls the API with that token', true],
      ], 'The test scheme authenticates requests without any JWT, and a service test has no HTTP pipeline. Only a request carrying the issued token goes through the real bearer handler and its validation parameters.'),
    ],
    assignment: {
      title: 'A Secured, Tested Library API',
      description: 'An ASP.NET Core 8 library API on EF Core and SQL Server: books, members and loans, Identity with JWT login and Librarian and Member roles, and a test suite of xUnit unit tests, Moq service tests, WebApplicationFactory integration tests and Testcontainers database tests.',
      instructions: `Build the application described in this unit's brief and submit a repository link.

**Submit:**

1. The solution: \`Library.Api\` (entities, \`LibraryDbContext\`, migrations, repositories, services,
   controllers, the JWT and Identity configuration, the exception handler) and \`Library.Tests\`.
2. Tests organised by kind: \`Unit\`, \`Services\`, \`Integration\` (with \`LibraryApiFactory\` and
   \`TestAuthHandler\`) and \`Database\` (with the SQL Server fixture and collection).
3. A README with how to run the suite (Docker required), a table of test classes with the kind each
   is and why, and the \`dotnet test\` summary from two runs in a row.

**Before you submit,** delete one line of production code that enforces a rule — the three-loan
limit, a role on an endpoint, or the ownership check on returns — and confirm at least one test
fails. Restore it. A rule no test catches is graded as untested.`,
      rubric: [
        { criterion: 'Working, secured API', description: 'Every endpoint in the table behaves as specified with ProblemDetails errors; Identity hashes passwords; JWT login works; roles and the per-loan ownership check are enforced.', maxPoints: 20 },
        { criterion: 'Unit and service tests', description: 'A boundary [Theory] for the fee; Moq tests for every borrow and return rule with a FakeTimeProvider, exception types asserted with awaited ThrowsAsync, and Times.Never() on failure paths.', maxPoints: 20 },
        { criterion: 'Integration and security tests', description: 'A custom WebApplicationFactory replacing the database correctly; status and body asserted; validation and conflict cases; right role, wrong role (403, data unchanged) and anonymous (401) for each protected endpoint; one real-token test.', maxPoints: 25 },
        { criterion: 'Database tests', description: 'Testcontainers SQL Server with MigrateAsync; query tests with rows that should and should not match; the unique index; Respawn or equivalent between tests.', maxPoints: 20 },
        { criterion: 'Independence and README', description: 'Green twice in a row with no order dependence or shared-data assertions; the README explains which kind each test class is and why.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_ASPNET_TESTING_CHECKPOINT',
    notes: `Ten questions across the topic: xUnit, Moq, WebApplicationFactory with security, and database
tests. Most show a few lines of test code or a failure and ask what happens or which test fits.
Decide what each test actually runs — real pipeline, mock, which database — before reading the
options.`,
    checkpoint: [
      ck(T, `What does this test report?

    [Fact]
    public async Task CountsOpenLoans()
    {
        _loans.Setup(l => l.CountOpenAsync(It.IsAny<string>())).ReturnsAsync(2);
        Assert.Equal(2, await _service.OpenLoansAsync("asha"));
    }`, [
        ['It fails, because It.IsAny<string>() does not match a literal value', false],
        ['It passes, since the setup answers for any member id passed in', true],
        ['It fails, as ReturnsAsync cannot be used for methods returning int', false],
      ], 'It.IsAny<string>() matches every string, so the setup answers 2 for "asha". ReturnsAsync is for a method returning Task<int>, which CountOpenAsync does.'),
      ck(A, 'Where does `factory.CreateClient()` send its requests?', [
        ['To a Kestrel server the factory starts on a random free port', false],
        ['Into the app\'s pipeline on an in-memory TestServer, with no socket', true],
        ['To the URL in launchSettings.json for the Development profile', false],
      ], 'WebApplicationFactory hosts the app on TestServer, and the client\'s handler passes requests straight into the middleware pipeline in memory. No port is opened and launchSettings.json is not used.'),
      ck(T, 'A test class takes `WebApplicationFactory<Program>` in its constructor but does not implement IClassFixture<...>. What happens when the tests run?', [
        ['xUnit fails each test because it cannot satisfy the constructor argument', true],
        ['xUnit creates a new factory for each test by calling its constructor', false],
        ['The factory is shared, since xUnit infers the fixture from the type', false],
      ], 'xUnit injects constructor arguments only from fixtures the class declares (IClassFixture, or a collection fixture). Without the declaration the tests fail because the argument cannot be resolved.'),
      ck(A, `What status does this request get?

    // [Authorize(Roles = "Librarian")] on DELETE /api/books/{id}
    // TestAuthHandler returns NoResult() when X-Test-Role is absent
    var r = await factory.CreateClient().DeleteAsync("/api/books/3");`, [
        ['403 Forbidden, because no role was supplied in the header', false],
        ['404 Not Found, because book 3 was never seeded in this test', false],
        ['401 Unauthorized, because no user was authenticated', true],
      ], 'NoResult leaves the request anonymous, so the authorization middleware challenges and the response is 401 before the action or the database is reached. 403 is for an authenticated user without the role.'),
      ck(T, 'Which pairing of check to test kind is the best fit?', [
        ['WebApplicationFactory: the Rs 200 cap on a single late fee', false],
        ['Moq unit test: the unique ISBN index on the Books table', false],
        ['Testcontainers SQL Server: the 403 for a member deleting a book', false],
        ['WebApplicationFactory: the 400 for a book with a blank title', true],
      ], 'Validation and its 400 response come from [ApiController] in the pipeline, which the factory runs. The fee cap is a plain unit test, the index needs a real database, and a role check needs no SQL Server.'),
      ck(T, `Why does this stub never match?

    _books.Setup(b => b.FindByIsbnAsync("978-0-13-235088-4")).ReturnsAsync(cleanCode);
    // BookService removes the hyphens before calling FindByIsbnAsync
    var found = await service.LookupAsync("978-0-13-235088-4");`, [
        ['The mock is called with "9780132350884", which is not the stubbed string', true],
        ['Moq matches string arguments by reference, so equal text can never match', false],
        ['FindByIsbnAsync returns Task<Book?>, which Moq cannot stub with ReturnsAsync', false],
      ], 'Literal arguments match by Equals. The service passes the hyphen-free ISBN, which differs from the stub\'s argument, so the loose mock returns its default: a Task holding null.'),
      ck(A, 'The factory calls `builder.UseSetting("Jwt:Key", TestTokens.Key)`. What does that change?', [
        ['It adds a second signing key that is accepted alongside the real one', false],
        ['The app reads Jwt:Key as the test value through IConfiguration', true],
        ['It writes the key into appsettings.Testing.json for later runs', false],
      ], 'UseSetting supplies a configuration value to the host, so code reading builder.Configuration["Jwt:Key"] gets the test key. Nothing is written to disk and the key is replaced, not added.'),
      ck(T, 'A test uses a SQLite in-memory database through a single open SqliteConnection. Which bug can it still miss that a SQL Server container would catch?', [
        ['A duplicate value inserted into a column with a unique index', false],
        ['A LINQ query that EF Core is unable to translate to any SQL', false],
        ['A foreign key violation when a loan names a missing book', false],
        ['A migration that creates the Isbn index on the wrong column', true],
      ], 'SQLite enforces unique indexes and foreign keys and needs translatable LINQ, but its schema comes from EnsureCreated, so migrations never run. Only MigrateAsync on SQL Server exercises them.'),
      ck(T, `What does this report when the service never calls AddAsync?

    _loans.Verify(l => l.AddAsync(It.IsAny<Loan>()), Times.Once());`, [
        ['Nothing, as Verify only records the calls for a later assertion', false],
        ['It throws a MockException saying the call happened zero times', true],
        ['It passes, because loose mocks treat missing calls as satisfied', false],
      ], 'Verify asserts immediately: when the expected call count is not met it throws a MockException describing the expected and actual invocations, failing the test. Loose behaviour concerns unmatched calls, not verification.'),
      ck(A, '`db.Database.EnsureCreated()` must run for the factory\'s SQLite database. Where does a test get a LibraryDbContext to call it on?', [
        ['From a new LibraryDbContext built with the production connection string', false],
        ['From the HttpClient by calling a special setup endpoint in the API', false],
        ['From a scope created on factory.Services, resolving the context', true],
      ], 'DbContext is scoped, so the test creates a scope from factory.Services and resolves the replaced context, which uses the shared SQLite connection. A hand-built context would point at SQL Server, and a setup endpoint ships test code in the API.'),
    ],
  },
];
