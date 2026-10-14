/**
 * Career-track content: testing Spring Boot (JT_BOOT_TESTING), for Java Full Stack + AI and Java
 * Backend Engineer.
 *
 * The student arrives with a Spring Boot 3 REST API on Spring Data JPA and MySQL, secured with
 * Spring Security and a JWT filter (JT_BOOT_REST, JT_BOOT_DATA, JT_BOOT_SECURITY). This topic tests
 * that same application: JUnit 5 (Jupiter) and AssertJ for plain logic, Mockito for services,
 * MockMvc in a @WebMvcTest slice for controllers and their access rules, @DataJpaTest for queries,
 * and @SpringBootTest for the few flows that need everything. Every dependency named here arrives
 * with spring-boot-starter-test and spring-security-test.
 *
 * Boot 3.4 deprecated @MockBean in favour of Spring Framework's @MockitoBean; the notes use
 * @MockitoBean and say so, because students will meet both in existing code.
 *
 * The topic declares AUTOMATED_TESTING and SPRING_BOOT. Checkpoint questions default to
 * AUTOMATED_TESTING; the ones that measure knowing what Boot loads and wires are tagged SPRING_BOOT.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_BOOT_TESTING_BUNDLES: PilotBundle[] = [
  /* ── JUNIT5 ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_TESTING_JUNIT5',
    notes: `A **unit test** runs one small piece of your code — usually one method of one class — with no
database, no web server and no Spring context, and checks the result. It runs in milliseconds, so
you can have hundreds and run them on every save. In a Spring Boot project you already have
everything you need: \`spring-boot-starter-test\` brings **JUnit 5 (Jupiter)**, **AssertJ**,
**Mockito**, Hamcrest, JsonPath and \`spring-test\`.

    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>

Tests live under \`src/test/java\`, in the same package as the class they test, and Maven Surefire
runs every class whose name ends in \`Test\` or \`Tests\` when you type \`mvn test\`.

## The class under test

The library API charges a fee for late returns: nothing inside the 14-day loan period, then ₹5 per
day, capped at ₹200.

    public class LateFeeCalculator {
        static final int LOAN_DAYS = 14, PER_DAY = 5, CAP = 200;

        public int feeFor(LocalDate borrowed, LocalDate returned) {
            if (returned.isBefore(borrowed))
                throw new IllegalArgumentException("returned before borrowed");
            long late = ChronoUnit.DAYS.between(borrowed, returned) - LOAN_DAYS;
            return late <= 0 ? 0 : (int) Math.min(late * PER_DAY, CAP);
        }
    }

## A first test: arrange, act, assert

    import org.junit.jupiter.api.Test;
    import static org.assertj.core.api.Assertions.*;

    class LateFeeCalculatorTest {
        private final LateFeeCalculator calc = new LateFeeCalculator();

        @Test
        void chargesFivePerDayAfterTheLoanPeriod() {
            LocalDate borrowed = LocalDate.of(2026, 3, 1);          // arrange
            int fee = calc.feeFor(borrowed, borrowed.plusDays(17)); // act
            assertThat(fee).isEqualTo(15);                          // assert
        }

        @Test
        void rejectsAReturnDateBeforeTheBorrowDate() {
            LocalDate d = LocalDate.of(2026, 3, 10);
            assertThatThrownBy(() -> calc.feeFor(d, d.minusDays(1)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("before borrowed");
        }
    }

Three things to notice. The \`@Test\` import is **\`org.junit.jupiter.api.Test\`** — the JUnit 4
\`org.junit.Test\` looks identical and is silently ignored by the Jupiter engine. Test classes and
methods need not be \`public\` in JUnit 5. And JUnit creates a **new instance of the class for every
test method**, so a field like \`calc\` is fresh each time; tests never share state through fields.

## Assertions: JUnit's or AssertJ's

JUnit has \`assertEquals(expected, actual)\`, \`assertTrue\`, \`assertThrows\`. AssertJ's
\`assertThat(actual)\` reads left to right and gives far better failure messages, especially for
collections:

    assertThat(overdue).extracting(Loan::getMemberEmail)
                       .containsExactlyInAnyOrder("asha@lib.in", "ravi@lib.in");

A common bug with \`assertEquals\` is swapping the arguments, which makes the failure message say
"expected 0 but was 15" when the opposite is true.

## Covering the boundaries with a parameterised test

The bugs live at the edges: day 14, day 15, the day the cap is reached. Rather than five near-copies
of one test:

    @ParameterizedTest(name = "{0} days -> Rs {1}")
    @CsvSource({ "0,0", "14,0", "15,5", "54,200", "55,200", "200,200" })
    void feeAtTheBoundaries(int days, int expected) {
        LocalDate b = LocalDate.of(2026, 1, 1);
        assertThat(calc.feeFor(b, b.plusDays(days))).isEqualTo(expected);
    }

\`@ParameterizedTest\` comes from \`junit-jupiter-params\` (already in the starter). Other sources
are \`@ValueSource\`, \`@EnumSource\` and \`@MethodSource\` for objects.

## Lifecycle and naming

\`@BeforeEach\` / \`@AfterEach\` run around every test; \`@BeforeAll\` / \`@AfterAll\` run once and must
be \`static\`. \`@DisplayName\` and \`@Nested\` classes make the report read like a specification. Name
a test after the **behaviour**, not the method: \`chargesNothingOnTheLastDayOfTheLoan\` says what
broke when it fails; \`testFeeFor2\` does not.

## Testing one thing at a time

One test checks one behaviour, so a failure points at one cause. Test the **failure cases**
deliberately — a negative range, an empty list, a null — because the happy path is the one you
already tried by hand. And never let a test depend on today's date: pass dates in, or inject a
\`Clock\`.

## Common mistakes

- Importing \`org.junit.Test\`: the class compiles, Surefire reports "Tests run: 0", nothing fails.
- A test with no assertion — it passes whatever the code does.
- Calling \`LocalDate.now()\` inside the code under test, so the test passes in March and fails in April.
- One giant test that checks ten things and stops at the first failure.`,
    workedExample: `**Problem:** the librarian adds a rule — members with a \`PREMIUM\` plan get a 21-day loan period.
Change \`feeFor\` to take the plan, and write the tests that would have caught an off-by-one at the
new boundary.

    public int feeFor(Plan plan, LocalDate borrowed, LocalDate returned) {
        int loanDays = plan == Plan.PREMIUM ? 21 : 14;
        long late = ChronoUnit.DAYS.between(borrowed, returned) - loanDays;
        return late <= 0 ? 0 : (int) Math.min(late * PER_DAY, CAP);
    }

    @ParameterizedTest(name = "{0}, {1} days -> Rs {2}")
    @CsvSource({
        "STANDARD, 14, 0", "STANDARD, 15, 5",
        "PREMIUM,  21, 0", "PREMIUM,  22, 5", "PREMIUM, 100, 200"
    })
    void feeDependsOnThePlan(Plan plan, int days, int expected) {
        LocalDate b = LocalDate.of(2026, 1, 1);
        assertThat(calc.feeFor(plan, b, b.plusDays(days))).isEqualTo(expected);
    }

**Reasoning:** the change introduces one new boundary per plan, so each plan gets the last free day
and the first charged day — a \`<\` written as \`<=\` fails exactly one of those rows. JUnit converts
the CSV text \`PREMIUM\` to the enum automatically. The cap row proves the cap still applies to the
new plan. Each row is reported separately by name, so a failure says "PREMIUM, 22 days -> Rs 5"
rather than "feeDependsOnThePlan failed".`,
    mcqs: [
      mcq('LateFeeCalculatorTest compiles and its methods carry @Test from org.junit.Test, yet `mvn test` prints "Tests run: 0". Why?', [
        ['That is the JUnit 4 annotation, which the Jupiter engine ignores', true],
        ['Surefire only runs test classes and methods declared public', false],
        ['The methods need @DisplayName before JUnit 5 will detect them', false],
      ], 'spring-boot-starter-test brings only the Jupiter engine, which discovers org.junit.jupiter.api.Test. The JUnit 4 annotation has no engine to run it, so the methods are silently skipped. Visibility and @DisplayName do not affect discovery.'),
      mcq('Why does `@CsvSource({"14,0", "15,5", "54,200", "55,200"})` test feeFor better than one test with 17 days late?', [
        ['A parameterised test runs faster than four separate test methods', false],
        ['JUnit needs at least four rows before it reports a parameterised test', false],
        ['Off-by-one and cap bugs sit at these edges, and each row is reported alone', true],
      ], 'The rows sit on both sides of the loan-period boundary and the cap, where < versus <= mistakes show up, and JUnit reports each invocation separately. Speed is not the point, and one row is enough to run.'),
      mcq('A test class holds `private List<Loan> loans = new ArrayList<>();`, and test A adds two loans. What does test B see in the field?', [
        ['The two loans, because the field is shared by every test method', false],
        ['Either one, depending on the order in which JUnit chose to run the tests', false],
        ['An empty list, as JUnit builds a new instance for each test method', true],
      ], 'JUnit 5\'s default lifecycle is PER_METHOD: each test runs on a fresh instance, so instance fields are re-initialised. Only static fields, or @TestInstance(PER_CLASS), would carry state between tests.'),
    ],
    checkpoint: [
      mcq(`What does this test report when feeFor returns 15?

    @Test
    void lateFee() {
        assertEquals(calc.feeFor(b, b.plusDays(17)), 0);
    }`, [
        ['"expected: <15> but was: <0>", the reverse of the truth', true],
        ['"expected: <0> but was: <15>", which is the correct reading', false],
        ['It passes, as assertEquals ignores argument order for ints', false],
      ], 'assertEquals takes (expected, actual). With the arguments swapped, the computed 15 is labelled "expected" and the literal 0 "actual", so the failure message misleads whoever reads it. AssertJ\'s assertThat(actual).isEqualTo(expected) avoids the trap.'),
      mcq('The code under test calls `LocalDate.now()` to decide whether a loan is overdue. What is the best change for testability?', [
        ['Run the test only on the first day of each month', false],
        ['Inject a Clock and pass Clock.fixed(...) in the test', true],
        ['Assert only that the result is not null from now on', false],
        ['Mark the test @Disabled until the date is right again', false],
      ], 'A hidden call to the system clock makes the result depend on when the test runs. Injecting a java.time.Clock lets production use the system clock and the test use a fixed instant, so the test is deterministic.'),
      mcq('`emails` is a List<String> of overdue members. Which AssertJ line checks it holds exactly asha@lib.in and ravi@lib.in, in any order?', [
        ['assertThat(emails).containsExactly("asha@lib.in", "ravi@lib.in")', false],
        ['assertThat(emails).contains("asha@lib.in", "ravi@lib.in")', false],
        ['assertThat(emails).containsExactlyInAnyOrder("asha@lib.in", "ravi@lib.in")', true],
        ['assertThat(emails).containsAnyElementsOf(List.of("asha@lib.in", "ravi@lib.in"))', false],
      ], 'containsExactlyInAnyOrder fails if an email is missing, extra or duplicated, but accepts any order. containsExactly also demands the order, contains allows extra elements, and containsAnyElementsOf passes if just one is present.'),
    ],
  },

  /* ── MOCKITO ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_TESTING_MOCKITO',
    notes: `Most of your Spring code is **services** that call repositories, mailers and other services.
To unit-test \`LoanService\` you do not want a MySQL database behind \`LoanRepository\`; you want an
object that looks like the repository and does exactly what this test needs. That object is a
**mock**, and **Mockito** makes one from any interface or non-final class.

## The service

    @Service
    public class LoanService {
        private final BookRepository books;
        private final LoanRepository loans;
        private final Clock clock;

        public LoanService(BookRepository books, LoanRepository loans, Clock clock) { ... }

        @Transactional
        public Loan borrow(long bookId, Member member) {
            Book book = books.findById(bookId)
                .orElseThrow(() -> new BookNotFoundException(bookId));
            if (loans.countByMemberAndReturnedAtIsNull(member) >= 3)
                throw new LoanLimitException(member.getId());
            if (!book.isAvailable()) throw new BookUnavailableException(bookId);
            book.setAvailable(false);
            return loans.save(new Loan(book, member, LocalDate.now(clock)));
        }
    }

Constructor injection is what makes this testable without Spring: the test just passes mocks to
the constructor.

## The test

    @ExtendWith(MockitoExtension.class)
    class LoanServiceTest {
        @Mock BookRepository books;
        @Mock LoanRepository loans;
        Clock clock = Clock.fixed(Instant.parse("2026-03-01T10:00:00Z"), ZoneOffset.UTC);
        LoanService service;

        @BeforeEach
        void setUp() { service = new LoanService(books, loans, clock); }

        @Test
        void borrowingAnAvailableBookSavesALoan() {
            Book book = new Book(7L, "Clean Code", true);
            Member asha = new Member(1L, "asha@lib.in");
            when(books.findById(7L)).thenReturn(Optional.of(book));
            when(loans.countByMemberAndReturnedAtIsNull(asha)).thenReturn(0L);
            when(loans.save(any(Loan.class))).thenAnswer(inv -> inv.getArgument(0));

            Loan loan = service.borrow(7L, asha);

            assertThat(loan.getBorrowedOn()).isEqualTo(LocalDate.of(2026, 3, 1));
            assertThat(book.isAvailable()).isFalse();
        }

        @Test
        void aFourthLoanIsRefusedAndNothingIsSaved() {
            Member asha = new Member(1L, "asha@lib.in");
            when(books.findById(7L)).thenReturn(Optional.of(new Book(7L, "Clean Code", true)));
            when(loans.countByMemberAndReturnedAtIsNull(asha)).thenReturn(3L);

            assertThatThrownBy(() -> service.borrow(7L, asha)).isInstanceOf(LoanLimitException.class);
            verify(loans, never()).save(any());
        }
    }

\`@ExtendWith(MockitoExtension.class)\` creates the \`@Mock\` fields before each test. You can also
put \`@InjectMocks\` on a \`LoanService\` field and let Mockito call the constructor, but building it
yourself in \`@BeforeEach\` is explicit and works with a real \`Clock\`.

## Stubbing and verifying

- \`when(mock.method(args)).thenReturn(value)\` — a **stub**: what the mock returns.
  \`thenThrow(...)\` makes it throw; \`thenAnswer\` computes the result from the arguments.
- An unstubbed method returns an "empty" value: \`null\`, \`0\`, \`false\`, an empty \`Optional\` or
  collection.
- \`verify(mock).method(args)\` — checks a call **happened**; \`verify(mock, never())\`,
  \`times(2)\`. Verify things that matter as outcomes (a save, an email sent), not every internal
  call — that just ties the test to the implementation.
- For a \`void\` method, stub with \`doThrow(new MailException("down")).when(mailer).send(any())\`.

## Argument matchers and ArgumentCaptor

\`any()\`, \`anyLong()\`, \`eq(7L)\`, \`argThat(l -> ...)\` match arguments loosely. The rule: if one
argument uses a matcher, **all** must — \`when(repo.find(anyLong(), "x"))\` throws
\`InvalidUseOfMatchersException\`; write \`eq("x")\`.

To inspect what was passed in, capture it:

    ArgumentCaptor<Loan> saved = ArgumentCaptor.forClass(Loan.class);
    verify(loans).save(saved.capture());
    assertThat(saved.getValue().getMember()).isEqualTo(asha);

## Strict stubs

\`MockitoExtension\` uses **strict stubs**: a stub the test never uses fails it with
\`UnnecessaryStubbingException\`, and a stub called with different arguments reports a
\`PotentialStubbingProblem\`. That is a feature — it tells you the test is not exercising the path you
think. Remove the stub, or fix its arguments; reach for \`lenient()\` only when the stub is genuinely
shared and optional.

## When a mock lies to you

A mock does what you told it to, not what the real class does. If \`countByMemberAndReturnedAtIsNull\`
is misspelt, or its derived query is wrong, every service test still passes because the mock
returns 3 regardless. Mocks test the **service's logic given its collaborators' answers**; whether
the repository gives those answers is a job for a repository test against a database. Do not mock
value objects (\`Book\`, \`Loan\`) or types you do not own in detail (\`RestTemplate\` internals) —
use real objects or a higher-level wrapper.`,
    workedExample: `**Problem:** \`returnBook(loanId)\` sets \`returnedAt\`, makes the book available again, and asks
\`NotificationService\` to email the next member on the waiting list, if any. Test the waiting-list
case, and prove the email goes to the right member even though \`notify\` returns nothing.

    @Test
    void returningABookNotifiesTheFirstMemberWaiting() {
        Book book = new Book(7L, "Clean Code", false);
        Loan loan = new Loan(book, new Member(1L, "asha@lib.in"), LocalDate.of(2026, 2, 20));
        Member ravi = new Member(2L, "ravi@lib.in");
        when(loans.findById(40L)).thenReturn(Optional.of(loan));
        when(waitlist.firstWaitingFor(book)).thenReturn(Optional.of(ravi));

        service.returnBook(40L);

        assertThat(loan.getReturnedAt()).isEqualTo(LocalDate.of(2026, 3, 1));
        assertThat(book.isAvailable()).isTrue();
        ArgumentCaptor<Member> to = ArgumentCaptor.forClass(Member.class);
        verify(notifications).bookAvailable(to.capture(), eq(book));
        assertThat(to.getValue().getEmail()).isEqualTo("ravi@lib.in");
    }

**Reasoning:** the state changes (\`returnedAt\`, availability) are asserted on the real objects,
because \`Loan\` and \`Book\` are plain entities, not mocks. The notification is a side effect with no
return value, so the only evidence it happened is a \`verify\`; the captor pulls out the member so the
test can check the email address. Because one argument uses a captor, the other must be a matcher
too — \`eq(book)\`, not \`book\`. A second test with \`firstWaitingFor\` returning \`Optional.empty()\`
then verifies \`never()\`.`,
    mcqs: [
      mcq('This stub fails with InvalidUseOfMatchersException: `when(loans.findByMemberAndStatus(anyLong(), "ACTIVE"))`. What is the fix?', [
        ['Replace anyLong() with the literal 1L so neither uses a matcher', false],
        ['Wrap the raw value too: findByMemberAndStatus(anyLong(), eq("ACTIVE"))', true],
        ['Add lenient() in front of when so mixed arguments are allowed', false],
      ], 'Mockito needs either all raw values or all matchers in one call. eq("ACTIVE") turns the literal into a matcher; lenient() relaxes strictness, not the matcher rule. Using 1L works only if the test truly means member 1.'),
      mcq('In LoanServiceTest a mocked LoanRepository is stubbed to return 3 from countByMemberAndReturnedAtIsNull, and the test passes. What does it NOT prove?', [
        ['That the service refuses a fourth loan when the count is 3', false],
        ['That save is never called once the limit has been reached', false],
        ['That the derived query really counts unreturned loans in MySQL', true],
        ['That LoanLimitException is the exception type the service throws', false],
      ], 'The mock returns 3 whatever the query would do, so the service logic is proven but the repository method is not. Whether the derived query counts the right rows needs a @DataJpaTest against a database.'),
      mcq('A test stubs `when(books.findById(7L))` but the path it exercises throws before findById is ever called. With MockitoExtension, what happens?', [
        ['The test fails with UnnecessaryStubbingException', true],
        ['The stub is ignored and the test passes as normal', false],
        ['Mockito calls findById once itself to use the stub', false],
      ], 'MockitoExtension uses strict stubs, which report any stubbing the test never used. It is a hint that the test is not exercising the code path its author intended.'),
    ],
    checkpoint: [
      mcq(`What does this test print?

    @Mock BookRepository books;

    @Test
    void lookup() {
        System.out.println(books.findById(99L));
        System.out.println(books.count());
    }`, [
        ['null and then 0', false],
        ['A NullPointerException is thrown', false],
        ['Optional.empty and then null', false],
        ['Optional.empty and then 0', true],
      ], 'An unstubbed Mockito mock returns empty values suited to the return type: an empty Optional for findById, 0 for a long count, empty collections for lists. It does not return null for Optional and never touches a database.'),
      mcq('NotificationService.bookAvailable(...) returns void. Which line makes it throw during a test?', [
        ['when(notifications.bookAvailable(any(), any())).thenThrow(ex)', false],
        ['verify(notifications).bookAvailable(any(), any()).thenThrow(ex)', false],
        ['doThrow(ex).when(notifications).bookAvailable(any(), any())', true],
      ], 'when(...) needs a return value to wrap, so it does not compile around a void call. The do-family (doThrow, doNothing, doAnswer) stubs void methods; verify checks calls and cannot stub.'),
      mcq('Which verification belongs in a LoanService test, rather than tying the test to the implementation?', [
        ['verify(loans).save(any()) after a successful borrow', true],
        ['verify(books, times(1)).findById(7L) before every assertion', false],
        ['verifyNoMoreInteractions(books, loans) at the end of each test', false],
      ], 'Saving the loan is an outcome the service exists to produce. Counting every lookup or forbidding all other calls makes the test fail on harmless refactors, such as caching a lookup.'),
    ],
  },

  /* ── MOCKMVC ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_TESTING_MOCKMVC',
    notes: `A controller is mostly wiring: a URL and method, request JSON turned into a DTO, validation, a
status code, response JSON, and an access rule. Calling the controller method directly in a unit
test checks none of that. **MockMvc** sends a fake HTTP request through the real
\`DispatcherServlet\` — filters, security, Jackson, validation, \`@ControllerAdvice\` — without
starting Tomcat.

## @WebMvcTest: the web slice

    @WebMvcTest(BookController.class)
    @Import(SecurityConfig.class)
    class BookControllerTest {
        @Autowired MockMvc mvc;
        @Autowired ObjectMapper json;
        @MockitoBean BookService bookService;
        @MockitoBean JwtService jwtService;
        ...
    }

\`@WebMvcTest\` starts a **slice** of the context: controllers, \`@ControllerAdvice\`, Jackson,
converters, \`Filter\` beans and \`WebMvcConfigurer\`s, plus Spring Security's auto-configuration and
a \`MockMvc\` bean. It does **not** load \`@Service\`, \`@Repository\` or JPA, and it does not scan
ordinary \`@Configuration\` classes. Two consequences:

1. Every service the controller needs must be supplied as a mock with **\`@MockitoBean\`**, which
   replaces (or adds) that bean in the Spring context. Otherwise startup fails with
   \`NoSuchBeanDefinitionException\`. The same applies to your \`JwtAuthFilter\`: it is a \`Filter\`, so
   the slice loads it, and it needs a \`JwtService\`.
2. Your own \`SecurityConfig\` is not picked up unless you \`@Import\` it. Without it the slice uses
   Boot's default security: every request needs authentication, and CSRF protection is on.

**Name change:** before Spring Boot 3.4 this annotation was \`@MockBean\`
(\`org.springframework.boot.test.mock.mockito\`). Boot 3.4 deprecated it in favour of Spring
Framework 6.2's \`@MockitoBean\` (\`org.springframework.test.context.bean.override.mockito\`). They
do the same job; you will see both in real code.

## Sending a request, checking the response

    @Test
    @WithMockUser
    void getReturnsTheBookAsJson() throws Exception {
        when(bookService.find(7L)).thenReturn(new BookDto(7L, "Clean Code", "Robert Martin", true));

        mvc.perform(get("/api/books/{id}", 7))
           .andExpect(status().isOk())
           .andExpect(content().contentType(MediaType.APPLICATION_JSON))
           .andExpect(jsonPath("$.title").value("Clean Code"))
           .andExpect(jsonPath("$.available").value(true));
    }

    @Test
    @WithMockUser
    void anUnknownIdIs404() throws Exception {
        when(bookService.find(99L)).thenThrow(new BookNotFoundException(99L));
        mvc.perform(get("/api/books/99")).andExpect(status().isNotFound());
    }

The static imports are \`MockMvcRequestBuilders.*\`, \`MockMvcResultMatchers.*\` and
\`SecurityMockMvcRequestPostProcessors.*\`. \`jsonPath\` uses JsonPath syntax: \`$.title\`,
\`$.content[0].isbn\`, \`$.length()\`. The 404 comes from your \`@RestControllerAdvice\`, which the
slice loaded — so this test checks the exception mapping too.

## Posting JSON and validation errors

    @Test
    @WithMockUser(roles = "LIBRARIAN")
    void aBookWithoutATitleIsRejected() throws Exception {
        var body = new CreateBookRequest("", "Robert Martin", "9780132350884");
        mvc.perform(post("/api/books")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body)))
           .andExpect(status().isBadRequest())
           .andExpect(jsonPath("$.errors.title").exists());
        verifyNoInteractions(bookService);
    }

\`@Valid\` on the controller parameter runs Bean Validation before the method; a blank \`@NotBlank\`
title produces \`MethodArgumentNotValidException\`, which your advice turns into 400 with field
errors. \`verifyNoInteractions\` proves invalid input never reached the service.

## Testing the access rules

\`spring-security-test\` gives you ways to be someone:

- \`@WithMockUser(username = "asha", roles = "MEMBER")\` on a test — a security context with that user.
  \`roles = "LIBRARIAN"\` becomes the authority \`ROLE_LIBRARIAN\`, which \`hasRole("LIBRARIAN")\` checks.
- \`.with(user("asha").roles("MEMBER"))\` on one request — the same, per request.
- No annotation — an anonymous request.

Every protected endpoint deserves three tests: the right role succeeds, the wrong role gets
**403 Forbidden**, and no user gets **401 Unauthorized**.

    @Test
    @WithMockUser(roles = "MEMBER")
    void aMemberCannotAddBooks() throws Exception {
        mvc.perform(post("/api/books").contentType(MediaType.APPLICATION_JSON).content(validJson))
           .andExpect(status().isForbidden());
    }

    @Test
    void anonymousCannotListLoans() throws Exception {
        mvc.perform(get("/api/loans")).andExpect(status().isUnauthorized());
    }

401 means "I don't know who you are"; 403 means "I know, and you may not". Getting 401 where you
expect 403 usually means the mock user never reached the security context. With your stateless JWT
config imported, CSRF is disabled; with Boot's default security, a POST also needs \`.with(csrf())\`
or it is refused with 403 before any role check.

\`@WithMockUser\` does not test your JWT filter — it puts a user straight into the security context.
That is what you want here: the controller tests check **rules**; one \`@SpringBootTest\` checks that
a real token gets through.

## Common mistakes

- Forgetting \`contentType(APPLICATION_JSON)\` on a POST: 415 Unsupported Media Type.
- Asserting only \`status().isOk()\` and never the body.
- Using \`@SpringBootTest\` for every controller test — slow, and it needs a database.`,
    workedExample: `**Problem:** \`DELETE /api/books/{id}\` is for librarians only, returns 204, and returns 409 when
the book is on loan (\`BookOnLoanException\` mapped by the advice). Write the tests.

    @Test
    @WithMockUser(roles = "LIBRARIAN")
    void librarianDeletesAFreeBook() throws Exception {
        mvc.perform(delete("/api/books/7")).andExpect(status().isNoContent());
        verify(bookService).delete(7L);
    }

    @Test
    @WithMockUser(roles = "LIBRARIAN")
    void aBookOnLoanCannotBeDeleted() throws Exception {
        doThrow(new BookOnLoanException(7L)).when(bookService).delete(7L);
        mvc.perform(delete("/api/books/7"))
           .andExpect(status().isConflict())
           .andExpect(jsonPath("$.message").value("Book 7 is on loan"));
    }

    @Test
    @WithMockUser(roles = "MEMBER")
    void aMemberGets403() throws Exception {
        mvc.perform(delete("/api/books/7")).andExpect(status().isForbidden());
        verifyNoInteractions(bookService);
    }

    @Test
    void anonymousGets401() throws Exception {
        mvc.perform(delete("/api/books/7")).andExpect(status().isUnauthorized());
    }

**Reasoning:** the service is a \`@MockitoBean\`, so its \`void delete\` is stubbed with \`doThrow\`
for the conflict case. The 409 test proves the advice mapping and the message. The member test adds
\`verifyNoInteractions\` because a rule that returns 403 *after* deleting would still pass a
status-only check. The four tests together are the endpoint's whole contract.`,
    mcqs: [
      mcq('`@WebMvcTest(BookController.class)` fails to start: "No qualifying bean of type BookService". BookService is a @Service. What is the fix?', [
        ['Add @ComponentScan("com.library") to the test class', false],
        ['Switch to @SpringBootTest so the service is found', false],
        ['Annotate BookService with @Controller as well', false],
        ['Declare `@MockitoBean BookService bookService;` in the test', true],
      ], '@WebMvcTest loads only the web layer, so services are deliberately absent. @MockitoBean puts a mock into the context; widening the scan or using @SpringBootTest drags in JPA and a database, defeating the slice.'),
      mcq('A test with `@WithMockUser(roles = "MEMBER")` calls POST /api/books, which requires hasRole("LIBRARIAN"). Which status should it assert?', [
        ['401, since a member is not allowed to add books at all', false],
        ['404, since the route is hidden from members', false],
        ['403, since the user is known but lacks the role', true],
      ], 'The mock user is authenticated, so the rule fails on authorisation, not authentication: 403 Forbidden. 401 is reserved for requests with no authenticated user.'),
      mcq('Code written for Spring Boot 3.2 uses @MockBean; the project moves to Boot 3.4. What changes for those tests?', [
        ['They are deprecated but still work; @MockitoBean replaces them', true],
        ['They stop compiling, since Boot 3.4 removed @MockBean outright', false],
        ['They now create plain Mockito mocks outside the Spring context', false],
      ], 'Boot 3.4 deprecated @MockBean in favour of Spring Framework 6.2\'s @MockitoBean, which does the same job. Deprecated code compiles with a warning and should be migrated over time.'),
    ],
    checkpoint: [
      mcq('POST /api/books with a valid body and `@WithMockUser(roles = "LIBRARIAN")` returns 415. What did the test most likely leave out?', [
        ['.with(csrf()) on the request builder', false],
        ['andExpect(status().isCreated())', false],
        ['@Import(JacksonConfig.class) on the class', false],
        ['.contentType(MediaType.APPLICATION_JSON)', true],
      ], '415 Unsupported Media Type means no message converter accepts the request\'s content type; without contentType there is none to match the @RequestBody. A missing CSRF token gives 403, and an assertion cannot change the status.'),
      ck('SPRING_BOOT', 'Which bean does `@WebMvcTest(BookController.class)` load into the context by itself?', [
        ['The LoanRepository Spring Data interface', false],
        ['The @Service class BookService', false],
        ['The @RestControllerAdvice error handler', true],
        ['The MySQL DataSource from properties', false],
      ], 'The web slice includes controllers, @ControllerAdvice, filters, converters and Jackson, but no services, repositories or DataSource. That is why the advice\'s 404 and 400 mappings can be tested there.'),
      mcq('A controller test asserts only `status().isForbidden()` for a MEMBER calling DELETE /api/books/7. What extra line catches a rule checked after the delete runs?', [
        ['verifyNoInteractions(bookService)', true],
        ['andExpect(jsonPath("$.id").value(7))', false],
        ['andDo(print()) on the perform call', false],
      ], 'If the security check ran after the service call, the status would still be 403 but the book would be gone. verifyNoInteractions on the mocked service proves the request never reached it.'),
    ],
  },

  /* ── REPOSITORY_TESTS ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_TESTING_REPOSITORY_TESTS',
    notes: `Service tests mock the repository, and controller tests mock the service. Something has to check
that the queries really return the right rows from a real database, and that all the pieces work
together. That is the job of **@DataJpaTest** and **@SpringBootTest**.

## @DataJpaTest: the persistence slice

    @DataJpaTest
    class LoanRepositoryTest {
        @Autowired TestEntityManager em;
        @Autowired LoanRepository loans;

        @Test
        void findsOnlyUnreturnedLoansPastTheirDueDate() {
            Member asha = em.persist(new Member("asha@lib.in"));
            Book b1 = em.persist(new Book("Clean Code")), b2 = em.persist(new Book("Refactoring"));
            em.persist(new Loan(b1, asha, LocalDate.of(2026, 1, 1)));                          // overdue
            em.persist(new Loan(b2, asha, LocalDate.of(2026, 2, 25)));                         // not yet due
            Loan done = new Loan(em.persist(new Book("DDD")), asha, LocalDate.of(2026, 1, 1));
            done.setReturnedAt(LocalDate.of(2026, 1, 10));
            em.persistAndFlush(done);                                                         // returned

            List<Loan> overdue = loans.findOverdue(LocalDate.of(2026, 3, 1));

            assertThat(overdue).extracting(l -> l.getBook().getTitle()).containsExactly("Clean Code");
        }
    }

\`@DataJpaTest\` loads entities, Spring Data repositories, the \`EntityManager\`, \`TestEntityManager\`,
a \`DataSource\` and Flyway or Liquibase if present — nothing from the web layer, no services. Two
defaults matter:

- **Every test runs in a transaction that is rolled back** at the end, so tests do not see each
  other's rows.
- **The DataSource is replaced by an embedded database** (H2) if one is on the test classpath, even
  though your \`application.properties\` points at MySQL.

Each test above builds exactly the rows it needs: one that should match and one for each reason a
row should not (not yet due, already returned). A query test that inserts only matching rows proves
nothing about the \`WHERE\` clause.

\`persistAndFlush\` forces the \`INSERT\` now, so a constraint violation (a duplicate ISBN, a null
column) fails at that line rather than somewhere confusing later.

## H2 or a real MySQL

H2 is fast and needs nothing installed, but it is **not MySQL**. Native queries using
\`DATE_SUB\`, \`GROUP_CONCAT\` or \`JSON_EXTRACT\`, MySQL's case-insensitive collation, \`ON DUPLICATE
KEY UPDATE\` and Flyway scripts written in MySQL dialect can all pass on one and fail on the other.
H2's \`MODE=MySQL\` narrows the gap but does not close it.

**Testcontainers** starts a real MySQL in Docker for the tests. With Boot 3.1+ the wiring is one
annotation:

    @DataJpaTest
    @AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
    @Testcontainers
    class LoanRepositoryMySqlTest {
        @Container @ServiceConnection
        static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4");
        ...
    }

\`replace = NONE\` stops Boot swapping in H2; \`@ServiceConnection\` points the \`DataSource\` at the
container. The container is \`static\` so it starts once per class, not per test. The trade-off:
the first run pulls an image and each class pays a few seconds of startup, and CI needs Docker. In
return the test runs your real SQL on the database you ship on. A sensible rule: anything with a
native query, a MySQL-specific function or a migration is tested on MySQL.

## @SpringBootTest: the whole application

    @SpringBootTest
    @AutoConfigureMockMvc
    @Testcontainers
    class BorrowFlowIT {
        @Container @ServiceConnection
        static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4");
        @Autowired MockMvc mvc;

        @Test
        void aMemberLogsInAndBorrowsABook() throws Exception {
            String token = loginAs("asha@lib.in", "secret");
            mvc.perform(post("/api/loans").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content("{\\"bookId\\": 7}"))
               .andExpect(status().isCreated());
        }
    }

\`@SpringBootTest\` loads **everything** your application would: every bean, the real security
chain with the real JWT filter, the real database. Use it for a **few** flows that prove the pieces
fit — login, then a protected call — not for every rule. With
\`webEnvironment = RANDOM_PORT\` it starts a real server and you call it with \`TestRestTemplate\` or
\`WebTestClient\`; then the request runs on another thread, so a \`@Transactional\` on the test
**does not** roll back what the server wrote. Clean up with \`@Sql\` scripts or by deleting rows.

## What each test costs

| Test | Loads | Typical time | Use for |
|---|---|---|---|
| Plain JUnit + Mockito | nothing | ms | logic, rules, branches |
| @WebMvcTest | web layer | ~1 s per context | status codes, JSON, validation, access |
| @DataJpaTest | JPA layer | 1–5 s per context | queries, mappings, constraints |
| @SpringBootTest | everything | 5–20 s per context | a few end-to-end flows |

Spring **caches** contexts between test classes with the same configuration. Every distinct set of
\`@MockitoBean\`s, properties or profiles makes a new context, and \`@DirtiesContext\` throws one away.
A suite that "suddenly takes four minutes" usually has twenty slightly different configurations.`,
    mcqs: [
      mcq('application.properties points at MySQL and H2 is on the test classpath. Which database does a plain @DataJpaTest use?', [
        ['The MySQL server from application.properties', false],
        ['Whichever database the Flyway scripts name', false],
        ['An embedded H2 database that replaces it', true],
      ], 'By default @DataJpaTest applies @AutoConfigureTestDatabase, which replaces the configured DataSource with an embedded one when available. @AutoConfigureTestDatabase(replace = NONE) keeps the real one, typically together with Testcontainers.'),
      mcq('A test of findOverdue inserts only three overdue loans and asserts all three come back. What is wrong with it?', [
        ['@DataJpaTest cannot run a derived query that takes a date parameter', false],
        ['It needs @Commit, or the inserted loans stay invisible to the derived query', false],
        ['It includes no returned or not-yet-due loans, so the filter is untested', true],
      ], 'A query that returned every loan would also pass. The test must include rows the WHERE clause should exclude. The inserts are visible inside the test transaction, and derived queries with parameters work fine.'),
      mcq('A @SpringBootTest(webEnvironment = RANDOM_PORT) test is annotated @Transactional and POSTs a loan through TestRestTemplate. What happens to that row after the test?', [
        ['It stays, because the server handled it on its own thread', true],
        ['It is rolled back with the transaction of the test method', false],
        ['It is never written, because the server is only simulated', false],
      ], 'With a real server the request runs on a server thread with its own transaction, which commits independently of the test method\'s transaction. Rollback only covers work done on the test\'s own thread, as with MockMvc.'),
    ],
    checkpoint: [
      ck('SPRING_BOOT', `Which annotation makes this test use the MySQL container instead of H2?

    @DataJpaTest
    @Testcontainers
    class BookRepoTest {
        @Container @ServiceConnection
        static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4");
    }`, [
        ['@AutoConfigureTestDatabase(replace = Replace.NONE)', true],
        ['@AutoConfigureMockMvc on the BookRepoTest class', false],
        ['@Transactional(propagation = Propagation.NEVER)', false],
      ], '@ServiceConnection supplies the connection details of the container, but the default test-database replacement can still swap in an embedded database. replace = NONE tells the slice to keep the configured DataSource.'),
      mcq('Which test needs @SpringBootTest rather than a slice?', [
        ['A member logs in, gets a JWT, then borrows with it', true],
        ['GET /api/books/99 returns 404 from the advice', false],
        ['findByIsbn returns empty for an unknown ISBN', false],
        ['The late fee is capped at Rs 200 for any loan past 54 days', false],
      ], 'Only the login flow needs the real JWT filter, security chain, services and database together. The 404 fits @WebMvcTest, the query fits @DataJpaTest, and the fee rule is a plain unit test.'),
      ck('SPRING_BOOT', 'A suite has 30 test classes and each declares a different combination of @MockitoBean fields. Why is it slow?', [
        ['Mockito is slow to create mocks of Spring Data repositories', false],
        ['Each distinct combination forces Spring to build a new context', true],
        ['@MockitoBean makes every test class run on its own JVM fork', false],
      ], 'Spring caches application contexts by their configuration, and the set of overridden beans is part of that key. Thirty combinations mean up to thirty context startups; sharing a base configuration restores caching.'),
    ],
  },

  /* ── DEBUGGING ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_TESTING_DEBUGGING',
    notes: `A broken test is a bug report about either the code or the test. Read the first failure in the
Surefire output — the stack trace's last "Caused by" for a context that will not start, the
"expected / but was" line for an assertion — and decide which before you change anything. Each
case below is a fault students hit on this exact API.

## 1. NoSuchBeanDefinitionException in a @WebMvcTest

    Error creating bean with name 'bookController': Unsatisfied dependency expressed through
    constructor parameter 0: No qualifying bean of type 'com.library.book.BookService' available

**Cause:** \`@WebMvcTest\` loads only the web layer; services are not in the slice. The same error
names \`JwtService\` when your \`JwtAuthFilter\` (a \`Filter\`, so it *is* loaded) needs it.
**Fix:** add \`@MockitoBean BookService bookService;\` (and \`@MockitoBean JwtService jwtService;\`).
Do not "fix" it with \`@SpringBootTest\` or a wider component scan — that turns a 1-second test into
one that needs a database.

## 2. 401 or 403 where you expected 200

A GET returns **401**: the test has no user. Add \`@WithMockUser\` or \`.with(user(...))\`.

A POST with \`@WithMockUser(roles = "LIBRARIAN")\` returns **403** although the role is right.
**Cause:** your \`SecurityConfig\` was not imported, so the slice runs Boot's default security, which
has CSRF on, and the request carries no CSRF token. **Fix:** \`@Import(SecurityConfig.class)\` so the
test runs your real (stateless, CSRF-disabled) rules — or \`.with(csrf())\` if CSRF is really on.

\`@WithMockUser(roles = "ROLE_LIBRARIAN")\` errors before the request with "roles cannot start with
ROLE_": \`roles\` adds the prefix itself. Write \`roles = "LIBRARIAN"\`, or
\`authorities = "ROLE_LIBRARIAN"\`. And \`@WithMockUser(authorities = "LIBRARIAN")\` gives a 403:
without the prefix, \`hasRole("LIBRARIAN")\` does not match it.

## 3. The tests that never ran

\`mvn test\` prints \`Tests run: 0\` for a class full of tests, or a test that should fail passes.
**Cause:** \`import org.junit.Test;\` (JUnit 4). The Jupiter engine ignores it. **Fix:**
\`org.junit.jupiter.api.Test\` — and the same for \`@Before\` → \`@BeforeEach\`. Also check the class
name ends in \`Test\` / \`Tests\`, or Surefire never picks it up.

## 4. Stubbing that does not match

    org.mockito.exceptions.misusing.PotentialStubbingProblem:
    Strict stubbing argument mismatch. Please check:
     - this invocation of 'findByIsbn' method:  books.findByIsbn("978-0132350884");
     - has following stubbing(s) with different arguments:  books.findByIsbn("9780132350884");

**Cause:** the service normalises the ISBN (removes hyphens) or the test stubbed the wrong value.
The stub never matches, the mock returns an empty \`Optional\`, and the service throws
\`BookNotFoundException\`. **Fix:** stub the value the code actually passes, or a matcher that states
what matters (\`argThat(isbn -> isbn.endsWith("884"))\`). An \`UnnecessaryStubbingException\` is the
same story from the other side: a stub nothing called. Remove it, or ask why the path changed.

Also: \`when(repo.findByAuthorAndYear(anyString(), 2008))\` → \`InvalidUseOfMatchersException\`.
All arguments must be matchers once one is: \`eq(2008)\`.

## 5. Passes alone, fails in the suite

\`BookApiIT.listsThreeBooks\` passes when run by itself and fails in \`mvn test\` with
\`expected size 3 but was 5\`.
**Cause:** another \`@SpringBootTest\` class inserted two books and nothing removed them — a
\`RANDOM_PORT\` test commits through the server, or a test used \`@Commit\`, or a \`static\` list in a
test double kept state. Spring's cached context (and its database) is shared by every class with
the same configuration. **Fix:** each test creates the data it needs and asserts relative to it,
cleanup runs in \`@AfterEach\` or an \`@Sql(executionPhase = AFTER_TEST_METHOD)\` script, and the
suite never relies on test order.

## 6. The native query that fails only in @DataJpaTest

    @Query(value = "SELECT * FROM loans WHERE due_date < DATE_SUB(CURDATE(), INTERVAL 7 DAY)",
           nativeQuery = true)
    List<Loan> findLongOverdue();

Works against MySQL in the running app; in the test:
\`JdbcSQLSyntaxErrorException: Syntax error in SQL statement ... DATE_SUB\` (or a function not found).
**Cause:** \`@DataJpaTest\` replaced MySQL with H2, and H2 does not speak that MySQL syntax.
**Fix:** run the test on the real database — \`@AutoConfigureTestDatabase(replace = NONE)\` with a
Testcontainers MySQL and \`@ServiceConnection\`. Rewriting the query in portable JPQL also works,
but bending production SQL to suit the test database is the wrong way round.

## 7. LazyInitializationException in a test

A \`@SpringBootTest\` reads \`loan.getBook().getTitle()\` after the repository call and gets
\`could not initialize proxy - no Session\`. The test is not transactional, so the session closed when
\`findById\` returned. Fetch what you need in the query (\`JOIN FETCH\`) or assert through the API
response — not by adding \`@Transactional\` to hide what production would also hit.`,
    mcqs: [
      mcq('A @WebMvcTest for BookController fails with "No qualifying bean of type JwtService" though the controller never uses JwtService. Why?', [
        ['The slice loads the JwtAuthFilter, a Filter, which needs it', true],
        ['@WebMvcTest always needs every @Service of the whole app', false],
        ['JwtService is missing an @Component annotation of its own', false],
        ['MockMvc creates a real JWT for every request it sends out', false],
      ], 'Filter beans are part of the web slice, so the JWT filter is created and its own dependency must exist. A @MockitoBean JwtService satisfies it; other services are not needed.'),
      mcq('In a @WebMvcTest without @Import(SecurityConfig.class), `@WithMockUser(roles = "LIBRARIAN")` POST /api/books returns 403. What is the cause?', [
        ['The LIBRARIAN role is spelt differently in the mock', false],
        ['Boot\'s default security needs a CSRF token on POST', true],
        ['MockMvc cannot send POST requests in a slice test', false],
      ], 'Without your stateless config the slice applies Boot\'s default security, where CSRF is enabled, so a POST without .with(csrf()) is rejected with 403 before the role is even checked.'),
      mcq('BookApiIT passes alone but fails in the full suite with "expected size 3 but was 5". What should be fixed first?', [
        ['Run the suite with a fixed method order so it repeats', false],
        ['Add @DirtiesContext to every class in the whole suite', false],
        ['Rows another class committed are never cleaned up', true],
      ], 'The cached context shares one database between classes, and committed rows from another test leak into this one. Clean up after each test and assert on data the test created; ordering or discarding every context only hides it.'),
      mcq('A native query with DATE_SUB works in the running app but fails with a syntax error in @DataJpaTest. Which fix is right?', [
        ['Rewrite the query to suit H2 and keep the plain H2-backed slice', false],
        ['Mark the test @Disabled and test the query by hand later', false],
        ['Run that test on a MySQL Testcontainer with replace = NONE', true],
      ], '@DataJpaTest swapped MySQL for H2, which does not support that MySQL syntax. Testing on the production database checks the SQL you actually ship; changing production SQL for the test database is backwards.'),
    ],
  },

  /* ── PRACTICE ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_TESTING_PRACTICE',
    notes: `Six exercises on the library API you are building. Write each test first, run it, and make sure
you have seen it **fail** for the right reason before you make it pass — a test you never saw fail
might not be testing anything.

## Exercise 1 — The fee calculator, edges first

Write \`LateFeeCalculatorTest\` with a \`@ParameterizedTest\` covering: returned the same day, day
14, day 15, the day the cap is first reached, far past the cap, and a return date before the borrow
date (a separate \`assertThatThrownBy\` test). Then break the code on purpose — set \`LOAN_DAYS\`
to 13 — and note which rows fail and which cannot see the change.

## Exercise 2 — LoanService with Mockito

Test \`borrow\` for: success (the loan is saved with today's date from a fixed \`Clock\`), unknown
book, book already on loan, and member at the three-loan limit. For each failure, assert the
exception type **and** \`verify(loans, never()).save(any())\`. Use an \`ArgumentCaptor\` in the
success case to check the saved loan's member and book.

## Exercise 3 — BookController's contract

With \`@WebMvcTest(BookController.class)\`, \`@Import(SecurityConfig.class)\` and \`@MockitoBean\`s,
write: GET by id (200 with JSON fields checked), GET unknown id (404 from the advice), POST valid
(201 with a \`Location\` header), POST with a blank title (400 with the field error), and POST as a
MEMBER (403) and as nobody (401).

## Exercise 4 — The overdue query

With \`@DataJpaTest\` and \`TestEntityManager\`, test \`findOverdue(date)\` with one loan that should
match and one for each reason a loan should not: not yet due, already returned, due exactly today.
Decide from the requirements which way "due today" goes before you run it.

## Exercise 5 — H2 versus MySQL

Add the native \`findLongOverdue\` query with \`DATE_SUB\`. Run its test on H2 and record the error.
Then add Testcontainers MySQL with \`@ServiceConnection\` and \`replace = NONE\`, rerun, and write two
sentences on what each run costs.

## Exercise 6 — One real flow

Write one \`@SpringBootTest\` with \`@AutoConfigureMockMvc\` on Testcontainers MySQL: log in as a seeded
member, take the token from the response, borrow a book with \`Authorization: Bearer ...\`, and then
call \`GET /api/loans/me\` and find the loan. Make the test create and clean up its own data, then
run the whole suite twice in a row and confirm it is still green.`,
    mcqs: [
      mcq('In Exercise 1, LOAN_DAYS is set to 13 by mistake. Which of these @CsvSource rows fails?', [
        ['"0,0", a book returned on the same day it was borrowed', false],
        ['"14,0", the last free day of the fourteen-day loan', true],
        ['"55,200", a return well past the point of the cap', false],
        ['"200,200", a return many months after borrowing', false],
      ], 'With 13 loan days, 14 days counts as one day late and costs Rs 5, so "14,0" fails. The same-day row is still free, and the far rows are capped at Rs 200 either way, so they cannot see the change.'),
      mcq('In Exercise 2, the unknown-book test throws BookNotFoundException. Why also add `verify(loans, never()).save(any())`?', [
        ['Mockito fails any test that has no verify call in it', false],
        ['It proves no loan was written before the exception', true],
        ['It stops the exception escaping from the test method', false],
      ], 'The exception alone does not prove the service failed cleanly; a version that saved a loan and then threw would pass. never() pins down that nothing was persisted.'),
      mcq('In Exercise 3, POST /api/books as LIBRARIAN returns 201. Which assertion best checks the Location header?', [
        ['andExpect(header().string("Location", endsWith("/api/books/7")))', true],
        ['andExpect(jsonPath("$.location").value("/api/books/7"))', false],
        ['andExpect(content().string(containsString("Location")))', false],
      ], 'Location is an HTTP response header, so header() is the matcher that reads it. jsonPath and content() look only at the body, where the header does not appear.'),
      mcq('In Exercise 4, a loan due exactly on the query date is the edge case. What should decide which way it goes?', [
        ['Whatever the current findOverdue query already returns', false],
        ['The requirement, written down before running the test', true],
        ['H2\'s default date comparison rules for that column', false],
      ], 'A test that adopts the current output just records the bug if there is one. The rule ("overdue starts the day after the due date") comes from the requirement, and the test asserts it.'),
      mcq('In Exercise 6 the suite is green once and red on the second run. What is the most likely reason?', [
        ['Testcontainers reuses an image cached from the first run', false],
        ['The test left committed rows that clash on the rerun', true],
        ['MockMvc keeps the JWT from the first run in memory', false],
      ], 'Data committed by a full-context test persists unless it is cleaned up, so a second run hits duplicates or wrong counts. The image cache only speeds startup, and MockMvc holds no tokens between runs.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_TESTING_INTERVIEW_QUESTION',
    notes: `Three questions an interviewer for a Spring Boot role asks, almost word for word, with an answer
that earns the follow-up, and the follow-up itself. Practise them aloud with your own library API
as the example — "in my project" is what makes the answer believable.

## Q1. "How do you test a Spring Boot application?"

**Strong answer.** "In layers, cheapest first. Most tests are plain **JUnit 5 and Mockito** unit
tests of services — no Spring context, constructor injection lets me pass mocks, and they run in
milliseconds. Controllers I test with **\`@WebMvcTest\`** and MockMvc: it loads only the web layer,
services are \`@MockitoBean\`s, and I check status codes, JSON, validation errors and the access
rules — the right role, the wrong role gets 403, no user gets 401. Repositories I test with
**\`@DataJpaTest\`**, on a Testcontainers MySQL when the query is native or MySQL-specific. And a
handful of **\`@SpringBootTest\`** flows prove the pieces fit — log in, get a JWT, call a protected
endpoint. That's the test pyramid: many fast tests at the bottom, a few slow ones at the top."

**Follow-up:** "Why not just use @SpringBootTest everywhere?" — every test pays a full context start
and needs a database; a failure tells you "something is broken" instead of where; and differing
configurations break context caching, so the suite gets slower with every class.

## Q2. "What is the difference between @Mock and @MockBean / @MockitoBean?"

**Strong answer.** "\`@Mock\` is plain Mockito: it creates a mock object for a unit test, with the
\`MockitoExtension\`, and Spring knows nothing about it — I pass it to the constructor myself.
\`@MockitoBean\` is Spring's: it creates a Mockito mock and **puts it into the application context**,
replacing the real bean, so whatever the context injects gets the mock. I use it in slice tests,
like a \`@WebMvcTest\` that needs the service the controller depends on. Since Boot 3.4,
\`@MockBean\` is deprecated in favour of Spring Framework's \`@MockitoBean\`; same idea."

**Follow-up:** "What does @MockitoBean cost?" — each distinct set of overridden beans is a different
context configuration, so Spring cannot reuse its cached context and starts another one.

## Q3. "How would you test that only admins can delete a book?"

**Strong answer.** "A \`@WebMvcTest\` on the controller with my \`SecurityConfig\` imported and the
service mocked. Three tests: with \`@WithMockUser(roles = "LIBRARIAN")\` the DELETE returns 204 and
the service is called; with \`roles = "MEMBER"\` it returns 403 and I \`verifyNoInteractions\` on the
service, so the rule isn't applied after the damage; with no user it returns 401.
\`@WithMockUser\` skips the JWT filter on purpose — those tests are about the rule. One
\`@SpringBootTest\` sends a real token so the filter is tested once."

**Follow-up:** "H2 or a real database for repository tests?" — H2 is fast but is not MySQL: native
queries, functions, collation and migrations can differ. I use Testcontainers with
\`@ServiceConnection\` and \`replace = NONE\` for anything database-specific, and accept a few
seconds per class for running the SQL I actually ship.`,
    mcqs: [
      mcq('Asked "why not @SpringBootTest for every test?", which point carries most weight with an interviewer?', [
        ['@SpringBootTest is deprecated in Boot 3 in favour of the slices', false],
        ['It cannot test controllers at all, only services and their repositories', false],
        ['Each needs a full context and database, so the suite is slow and vague', true],
      ], 'The case against using it everywhere is cost and diagnosis: full startups, a database for every test, broken context caching, and failures that do not point at a layer. It is neither deprecated nor limited to services.'),
      mcq('The interviewer asks: "Your @WebMvcTest needs BookService. @Mock or @MockitoBean, and why?" Which answer is right?', [
        ['@Mock, since a controller test runs with no context', false],
        ['@MockitoBean, so the mock is the bean the context injects', true],
        ['Either one, because Spring treats both the same way', false],
      ], 'A @WebMvcTest builds a Spring context and the controller is created by it. Only @MockitoBean registers the mock in that context; a plain @Mock field is invisible to Spring and the slice fails to start.'),
      mcq('For "only librarians can delete", why does the strong answer add verifyNoInteractions to the MEMBER test?', [
        ['MockMvc requires a verify call in every security test', false],
        ['It makes the test independent of the whole JWT filter chain', false],
        ['A rule enforced after the delete would still return 403', true],
      ], 'A status assertion cannot tell a correctly blocked request from one that deleted the book and then failed a check. Verifying the service was never touched proves the rule fires first.'),
    ],
  },

  /* ── MINI_PROJECT ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_TESTING_MINI_PROJECT',
    notes: `# A Secured, Tested Library API

Build a library API on **Spring Boot 3, Spring Data JPA and MySQL 8**, secured with **Spring
Security and JWT**, and prove it works with **unit, MockMvc and repository tests**. The code is the
easy half; the tests are what is being graded.

## Entities

| Entity | Fields | Rules |
|---|---|---|
| \`Book\` | id, title, author, isbn (unique), totalCopies, availableCopies | availableCopies between 0 and totalCopies |
| \`Member\` | id, name, email (unique), passwordHash, role (\`LIBRARIAN\` / \`MEMBER\`) | password stored with BCrypt |
| \`Loan\` | id, book (\`@ManyToOne\`), member (\`@ManyToOne\`), borrowedOn, dueOn, returnedOn | dueOn = borrowedOn + 14 days |

Schema through Flyway migrations, with \`ddl-auto=validate\`.

## Endpoints

| Method | Path | Who | Result |
|---|---|---|---|
| POST | /api/auth/login | anyone | 200 with a JWT; 401 on bad credentials |
| GET | /api/books?title= | any logged-in user | 200, paged list |
| GET | /api/books/{id} | any logged-in user | 200, or 404 |
| POST | /api/books | LIBRARIAN | 201 with Location; 400 on invalid body; 409 on duplicate ISBN |
| DELETE | /api/books/{id} | LIBRARIAN | 204; 409 if any copy is on loan |
| POST | /api/loans | MEMBER | 201; 409 if no copy is free or the member has 3 open loans |
| POST | /api/loans/{id}/return | MEMBER (own loan) or LIBRARIAN | 200 with the late fee |
| GET | /api/loans/me | MEMBER | 200, the caller's open loans |
| GET | /api/loans/overdue | LIBRARIAN | 200, loans past dueOn and not returned |

Errors use one JSON shape from a \`@RestControllerAdvice\`: \`{ "status", "message", "errors" }\`.

## Roles

- **LIBRARIAN** manages books and sees overdue loans.
- **MEMBER** borrows, returns their own loans and sees their own loans. A member returning someone
  else's loan gets 403.

## Required tests

1. **Unit (JUnit 5, AssertJ):** \`LateFeeCalculator\` with a parameterised boundary test — Rs 5 per
   day after \`dueOn\`, capped at Rs 200.
2. **Service (Mockito):** \`LoanService.borrow\` and \`returnLoan\` — success, no free copy, the
   three-loan limit, returning an already-returned loan, returning another member's loan. Each
   failure verifies nothing was saved. A fixed \`Clock\`.
3. **Controller (@WebMvcTest + MockMvc):** for \`BookController\` and \`LoanController\`, every endpoint's
   success, its validation failure where it has a body, and — for each protected endpoint — right
   role, wrong role (403, with \`verifyNoInteractions\`) and anonymous (401).
4. **Repository (@DataJpaTest on Testcontainers MySQL):** \`findOverdue\` and the open-loan count, with
   rows that should and should not match; the unique ISBN constraint.
5. **Integration (@SpringBootTest):** one flow — log in as a member, borrow with the token, see the
   loan in \`/api/loans/me\`, return it.

## Acceptance criteria

- \`mvn test\` is green on a clean checkout with Docker running, twice in a row.
- No test depends on another test's data or on run order.
- No test calls \`LocalDate.now()\` indirectly without a fixed \`Clock\`.
- Every endpoint in the table has at least one test that asserts its status **and** its body.
- The README lists the test classes, which slice each uses, and why.`,
    mcqs: [
      mcq('The brief asks for repository tests on Testcontainers MySQL rather than H2. Which part of this project most needs it?', [
        ['The unique ISBN constraint and queries run on the MySQL schema', true],
        ['The LateFeeCalculator boundary rows in its parameterised test', false],
        ['The 401 for an anonymous user calling GET /api/loans/me', false],
      ], 'Constraints and queries depend on the real schema and dialect created by the Flyway migrations, which are written for MySQL. The fee rule needs no database, and access rules are tested in the web slice.'),
      mcq('Which test from the brief proves that a real JWT gets through the security filter?', [
        ['A @WebMvcTest using @WithMockUser(roles = "MEMBER") on it', false],
        ['A Mockito test of the LoanService.borrow method', false],
        ['The @SpringBootTest that logs in and borrows a book', true],
      ], '@WithMockUser places a user directly in the security context and bypasses the JWT filter, and a service test has no web layer at all. Only the full-context flow sends a real token through the real filter.'),
    ],
    assignment: {
      title: 'A Secured, Tested Library API',
      description: 'A Spring Boot 3 library API on Spring Data JPA and MySQL: books, members and loans, JWT login with LIBRARIAN and MEMBER roles, and a test suite of unit, Mockito, MockMvc, repository and one end-to-end test.',
      instructions: `Build the application described in this unit's brief and submit a repository link.

**Submit:**

1. The source: entities, Flyway migrations, repositories, services, controllers, the security
   configuration with the JWT filter, and the \`@RestControllerAdvice\`.
2. The tests under \`src/test/java\`, organised by layer: unit, service, controller, repository and
   integration.
3. A README with how to run the suite (Docker required), a table of test classes with the slice each
   uses and why, and the output of \`mvn test\` run twice in a row.

**Before you submit,** delete one line of production code that enforces a rule — the three-loan
limit, or a role check — and confirm at least one test fails. Restore it. A rule no test catches is
graded as untested.`,
      rubric: [
        { criterion: 'Working, secured API', description: 'Every endpoint in the table behaves as specified, passwords are BCrypt-hashed, JWT login works, and roles are enforced, including a member returning another member\'s loan.', maxPoints: 20 },
        { criterion: 'Unit and service tests', description: 'Parameterised boundary tests for the fee; Mockito tests for every borrow and return rule with a fixed Clock, exception types asserted and never() verifications on failure paths.', maxPoints: 20 },
        { criterion: 'Controller and security tests', description: '@WebMvcTest with mocked services and imported security config; status and body asserted; validation errors; right role, wrong role (403 with verifyNoInteractions) and anonymous (401) for each protected endpoint.', maxPoints: 25 },
        { criterion: 'Repository and integration tests', description: '@DataJpaTest on Testcontainers MySQL with rows that should and should not match; the unique constraint; one @SpringBootTest flow with a real token.', maxPoints: 20 },
        { criterion: 'Test independence and README', description: 'The suite is green twice in a row with no order dependence; the README explains which slice each test class uses and why.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_TESTING_CHECKPOINT',
    notes: `Ten questions across the whole topic: JUnit 5, Mockito, MockMvc with security, the JPA slice and
full-context tests. Most show a few lines of test code or a failure message and ask what happens,
or which test fits. Decide what the test loads and what it really proves before reading the options.`,
    checkpoint: [
      mcq(`What does this test report?

    @ExtendWith(MockitoExtension.class)
    class LoanServiceTest {
        @Mock LoanRepository loans;
        @InjectMocks LoanService service;

        @Test
        void countsOpenLoans() {
            when(loans.countByMemberAndReturnedAtIsNull(any())).thenReturn(2L);
            assertThat(service.openLoans(asha)).isEqualTo(2);
        }
    }`, [
        ['It passes; the stub answers for any member argument', true],
        ['It fails because @InjectMocks needs a real repository', false],
        ['It fails with UnnecessaryStubbingException for any()', false],
      ], '@InjectMocks constructs LoanService with the @Mock repository, and any() matches whatever member is passed, so the stub is used and the count is 2. Strictness only complains about stubs that are never called.'),
      ck('SPRING_BOOT', `Every @WebMvcTest request returns 401, even with @WithMockUser. JwtAuthFilter begins like this. What is wrong?

    String header = request.getHeader("Authorization");
    if (header == null) { response.sendError(401); return; }`, [
        ['@WithMockUser only works inside a @SpringBootTest context', false],
        ['The filter rejects instead of passing requests along', true],
        ['MockMvc strips the security context before each request', false],
        ['The test forgot to declare @MockitoBean for BookService', false],
      ], 'A JWT filter must let a request without a token continue down the chain so other authentication — here the mock user — can apply. One that sends 401 itself blocks every test request, and also breaks public endpoints.'),
      mcq(`Which status does this test receive?

    @Test
    @WithMockUser(roles = "MEMBER")
    void memberListsOverdue() throws Exception {
        mvc.perform(get("/api/loans/overdue"));   // hasRole("LIBRARIAN")
    }`, [
        ['It receives 403, and the test passes anyway', true],
        ['It receives 401, and the test then fails', false],
        ['It receives 200, and the test then fails', false],
      ], 'The member is authenticated but lacks the role, so the response is 403. The test has no andExpect, so it asserts nothing and passes regardless — a test that can never fail.'),
      mcq('A repository test calls `em.persistAndFlush(new Book("Dup", "9780132350884"))` after persisting a book with the same ISBN. Where does it fail?', [
        ['At the persistAndFlush line, with a constraint violation', true],
        ['Only when the test transaction is rolled back at the end', false],
        ['Nowhere; @DataJpaTest disables all unique constraints', false],
      ], 'Flushing sends the INSERT immediately, so the database\'s unique index rejects it on that line. Without the flush, the INSERT might never be sent before rollback and the duplicate would go unnoticed.'),
      ck('SPRING_BOOT', 'A test class uses @SpringBootTest with no webEnvironment attribute and @AutoConfigureMockMvc. What does it start?', [
        ['A real Tomcat on port 8080, shared by all tests', false],
        ['The full context with a mock servlet environment', true],
        ['Only the web slice, like @WebMvcTest would load', false],
      ], 'The default webEnvironment is MOCK: every bean is loaded, but no server listens on a port, and MockMvc drives the DispatcherServlet in-process. RANDOM_PORT or DEFINED_PORT are needed for a real server.'),
      mcq('Which pairing of test type to check is the best fit?', [
        ['@DataJpaTest — the 409 when a member already has 3 open loans', false],
        ['@SpringBootTest — the late-fee cap of Rs 200 per loan', false],
        ['Plain JUnit — the unique ISBN constraint on books', false],
        ['@WebMvcTest — the 400 for a blank title in POST /api/books', true],
      ], 'Validation and its 400 mapping live in the web layer, which @WebMvcTest loads. The loan limit is service logic for Mockito, the fee cap a plain unit test, and a database constraint needs @DataJpaTest.'),
      mcq(`Why does this stub never match?

    when(books.findByIsbn("978-0-13-235088-4")).thenReturn(Optional.of(cleanCode));
    // BookService strips hyphens before calling findByIsbn
    service.lookup("978-0-13-235088-4");`, [
        ['Mockito compares String arguments by reference, not equals', false],
        ['findByIsbn returns Optional, which Mockito cannot stub', false],
        ['The mock is called with the stripped ISBN, not the stubbed one', true],
      ], 'Stubs match arguments with equals(). The service passes "9780132350884", which differs from the stubbed string, so strict stubbing reports an argument mismatch and the mock would return an empty Optional.'),
      mcq('A test needs a loan that is overdue "today". The service uses `LocalDate.now(clock)`. Which setup keeps it passing next year?', [
        ['Insert a loan with dueOn set to 2026-03-01 exactly', false],
        ['Insert a loan due LocalDate.now().minusDays(1) inside the test', false],
        ['Use Clock.fixed at a known instant, and dates relative to it', true],
      ], 'A fixed Clock makes "today" a constant in the test, and dates built from it keep their relation. A hard-coded date drifts as real time passes; LocalDate.now() in the test can disagree with the service\'s clock at midnight or across zones.'),
      mcq('Which statement about a @DataJpaTest test method is correct by default?', [
        ['Its inserts are committed so the next test can read them', false],
        ['It runs in a transaction that is rolled back afterwards', true],
        ['It starts the web layer so repositories can be called', false],
      ], '@DataJpaTest is itself @Transactional, so each test\'s changes are rolled back and tests stay independent. It loads only the persistence layer.'),
      mcq('A @SpringBootTest(webEnvironment = RANDOM_PORT) borrows a book through TestRestTemplate, and a later test sees one copy fewer. What is the right fix?', [
        ['Add @Transactional to the test so the borrow rolls back', false],
        ['Delete the test\'s rows in @AfterEach or an @Sql script', true],
        ['Restart the context for each test with @DirtiesContext', false],
      ], 'The server commits on its own thread, so a test-level @Transactional cannot undo it. Explicit cleanup removes exactly what the test created; @DirtiesContext does not reset a shared database and is far slower.'),
    ],
  },
];
