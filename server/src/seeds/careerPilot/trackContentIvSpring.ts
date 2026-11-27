/**
 * Career-track content, batch 6: Spring, Spring Boot and Hibernate at interview depth (JT_IV_SPRING),
 * for Java Full Stack + AI.
 *
 * The students have already built a Spring Boot 3 REST API on Spring Data JPA and MySQL, secured it
 * with Spring Security 6 and JWT, and tested it. The track's Spring topics taught all of that; this
 * topic is what an interviewer asks once they know you have used it: how auto-configuration decides,
 * the order of the bean lifecycle, why a singleton must not hold request state, @Transactional
 * propagation, rollback rules and self-invocation, N+1, the two caches, optimistic locking, PUT vs
 * PATCH, versioning, revoking a JWT, when CSRF matters, test slices, and how services talk and fail.
 *
 * Each question-set unit declares one skillKey (SPRING_CORE, SPRING_BOOT, JPA_HIBERNATE,
 * SPRING_SECURITY), so its checkpoint questions name none; the topic CHECKPOINT names the skill each
 * question measures. Stack: Java 17, Spring Boot 3, Spring Framework 6, Spring Security 6, Hibernate 6,
 * jakarta.* packages.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_IV_SPRING_BUNDLES: PilotBundle[] = [
  /* ── IV_SPRING_CORE ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_SPRING_IV_SPRING_CORE',
    notes: `Spring Core questions sound basic ("what is IoC?") and are used to find out whether you have
only used annotations or understand what the container does with them. Each answer below is what a
strong candidate says in about a minute, then the follow-up the interviewer is setting up, then the
answers that lose marks.

## 1. What is Inversion of Control, and how is Dependency Injection related?

**Strong answer.** IoC means my objects do not create or look up their own collaborators; something
outside them — the Spring container — creates the objects and wires them together. DI is the way
Spring does IoC: the dependencies are *handed in* through the constructor (or a setter or field). The
payoff is that \`OrderService\` depends on a \`PaymentGateway\` interface, and the container decides
whether that is the real Razorpay client or a test double.

**Follow-up.** "So what is the container, concretely?" — the \`ApplicationContext\`: it reads bean
definitions (component scan, \`@Bean\` methods), instantiates them, injects dependencies, runs the
lifecycle callbacks, and wraps beans in proxies where needed (transactions, security, \`@Async\`).

**Wrong answers.** "IoC and DI are the same thing" (DI is one form of IoC); "DI means using
\`@Autowired\`" (constructor injection needs no annotation when there is one constructor).

## 2. Constructor, setter or field injection — which do you use and why?

**Strong answer.** Constructor injection, for required dependencies. The fields can be \`final\`, the
object can never exist half-built, a unit test can create it with \`new\` and pass mocks, and a class
whose constructor grows to eight parameters is telling you it does too much. Setter injection only
for genuinely optional dependencies. Field injection hides dependencies and needs reflection to test.

    @Service
    public class OrderService {
        private final OrderRepository orders;
        private final PaymentGateway payments;

        public OrderService(OrderRepository orders, PaymentGateway payments) {  // no @Autowired needed
            this.orders = orders;
            this.payments = payments;
        }
    }

**Follow-up.** "What happens with a circular dependency under constructor injection?" — see 7.

## 3. What scopes can a bean have? Is a singleton bean thread-safe?

**Strong answer.** \`singleton\` (default: one instance per container), \`prototype\` (a new one each
time it is requested), and in a web app \`request\`, \`session\` and \`application\`. A singleton is
**not** made thread-safe by Spring — one instance serves every request thread at once. It is safe
only because we keep it **stateless**: its fields are other beans and configuration, never data about
the current request.

**Follow-up.** "Show me a singleton that is broken." —

    @Service
    public class CheckoutService {
        private String currentUser;                 // BUG: shared by every thread

        public Receipt checkout(String user, Cart cart) {
            this.currentUser = user;                // request A writes "asha"
            ...                                     // request B writes "ravi" meanwhile
            return billing.charge(currentUser, cart);  // A may now charge "ravi"
        }
    }

Fix: keep it in a local variable or pass it as a parameter. If state truly belongs to a request,
use a \`@RequestScope\` bean, never a field on a singleton.

**Wrong answers.** "Spring synchronises singleton beans"; "make the method \`synchronized\`" (it
serialises every checkout through one lock — correct but a throughput disaster).

## 4. You inject a prototype bean into a singleton. How many prototype instances do you get?

**Strong answer.** One. Injection happens once, when the singleton is created, so the singleton keeps
the same prototype instance for ever. If you need a fresh one per call, ask the container each time:
\`ObjectProvider<T>.getObject()\`, a \`@Lookup\` method, or a scoped proxy.

**Wrong answer.** "A new one on every method call" — that is what people expect, and why this is asked.

## 5. Walk me through a bean's lifecycle.

**Strong answer.**

    1. Instantiate (constructor; constructor injection happens here)
    2. Populate properties (setter and field injection)
    3. Aware callbacks (BeanNameAware, ApplicationContextAware ...)
    4. BeanPostProcessor.postProcessBeforeInitialization
    5. @PostConstruct
    6. InitializingBean.afterPropertiesSet()
    7. custom init method (@Bean(initMethod = "..."))
    8. BeanPostProcessor.postProcessAfterInitialization   <- AOP proxies are created here
    9. bean in use
    10. on shutdown: @PreDestroy -> DisposableBean.destroy() -> custom destroy method

**Follow-up.** "Why can't you call a \`@Transactional\` method of the bean from its own
\`@PostConstruct\`?" — the proxy is created at step 8, after \`@PostConstruct\`, and you are calling
\`this\` anyway; there is no transaction. "Are destroy callbacks called for prototype beans?" — No:
the container hands a prototype over and forgets it.

**Wrong answers.** Putting \`@PostConstruct\` before injection, or saying the proxy exists from the
start.

## 6. @Component versus @Bean? And what does @Configuration add?

**Strong answer.** \`@Component\` (and \`@Service\`, \`@Repository\`, \`@Controller\`) marks *my own
class* for component scanning. \`@Bean\` is a factory method in a configuration class — used for
classes I cannot annotate (a third-party \`RestClient\`, an \`ObjectMapper\`) or when creation needs
logic. In a \`@Configuration\` class (default \`proxyBeanMethods = true\`) Spring subclasses the
class with CGLIB, so one \`@Bean\` method calling another returns the existing singleton. With
\`proxyBeanMethods = false\` (or \`@Bean\` methods in a plain \`@Component\`, "lite mode") that
inner call is an ordinary Java call and creates a second object.

**Follow-up.** "Why does Boot's own auto-configuration use \`proxyBeanMethods = false\`?" — faster
startup and no CGLIB subclass; it injects dependencies as method parameters instead of calling
sibling methods.

## 7. What happens with a circular dependency?

**Strong answer.** With constructor injection — \`A(B b)\` and \`B(A a)\` — it cannot be satisfied:
neither can be built first, and Spring fails at startup with *"The dependencies of some of the beans
in the application context form a cycle"*. Since Spring Boot 2.6 circular references are **prohibited
by default** even for field injection (\`spring.main.allow-circular-references\` turns the old
behaviour back on). The real fix is design: extract the shared logic into a third bean, or have one
side publish an event. \`@Lazy\` on one parameter (injecting a proxy) is a workaround.

**Wrong answer.** "Spring resolves cycles automatically" — true only of setter/field injection in
older versions, and turned off by default now.

## 8. Two beans implement the same interface. What happens and how do you choose?

**Strong answer.** Injecting the interface fails with \`NoUniqueBeanDefinitionException\`. Choose with
\`@Primary\` (the default choice), \`@Qualifier("razorpay")\` at the injection point, or inject all of
them — \`List<PaymentGateway>\` or \`Map<String, PaymentGateway>\` keyed by bean name — which is how a
strategy pattern is done in Spring.

## 9. BeanFactory versus ApplicationContext?

**Strong answer.** \`BeanFactory\` is the basic container: creates beans lazily on request.
\`ApplicationContext\` extends it with eager singleton creation at startup (so wiring errors show
at boot, not at the first request), events, internationalisation, environment and profiles, and
automatic registration of BeanPostProcessors. Every Spring Boot app uses an ApplicationContext.

## 10. How does @Autowired actually get processed?

**Strong answer.** By a BeanPostProcessor — \`AutowiredAnnotationBeanPostProcessor\` — that finds
injection points and resolves them by type, then narrows by qualifier, \`@Primary\`, and finally by
matching the parameter or field name to a bean name. Annotations are only metadata; post-processors
give them behaviour. The same is true of \`@Transactional\`, \`@Async\` and \`@PreAuthorize\`.`,
    workedExample: `**The question.** "Our checkout sometimes emails the receipt to the wrong customer, only under
load. Here is the service. What is wrong, and how do you fix it?"

    @Service
    public class ReceiptService {
        private Customer customer;
        private final MailClient mail;

        public ReceiptService(MailClient mail) { this.mail = mail; }

        public void send(Order order) {
            this.customer = order.getCustomer();
            String body = render(order);          // takes ~40 ms
            mail.send(customer.getEmail(), body);
        }
    }

**Step 1 — name the scope.** \`@Service\` with no \`@Scope\` is a singleton: one \`ReceiptService\` for
the whole application. Tomcat runs each request on its own thread, so two checkouts call \`send\` on
the same object at the same time.

**Step 2 — draw the interleaving on the whiteboard.**

    thread A: customer = asha
    thread B: customer = ravi
    thread A: render(order A) ... mail.send(customer.getEmail())   -> ravi's address
    thread B: render(order B) ... mail.send(customer.getEmail())   -> ravi's address

Under low traffic the 40 ms window rarely overlaps, which is why it "only happens under load".

**Step 3 — fix the design, not the symptom.**

    public void send(Order order) {
        Customer customer = order.getCustomer();   // local: lives on this thread's stack
        mail.send(customer.getEmail(), render(order));
    }

**Step 4 — pre-empt the follow-ups.** "Why not \`synchronized\`?" — it would be correct but would make
every receipt in the system wait in a single queue. "Why not prototype scope?" — the controller that
injects it is itself a singleton, so it would still hold one instance (question 4). The rule you
state to close: *a singleton holds collaborators and configuration, never per-request data.*`,
    mcqs: [
      mcq(`A bean prints a letter at each lifecycle hook. In what order do the letters appear at startup?

    public class Indexer implements InitializingBean {
        public Indexer() { System.out.print("C"); }
        @PostConstruct void ready() { System.out.print("P"); }
        public void afterPropertiesSet() { System.out.print("A"); }
        void init() { System.out.print("I"); }
    }
    // registered with @Bean(initMethod = "init")`, [
        ['C, then A, then P, then I', false],
        ['C, then P, then A, then I', true],
        ['C, then I, then P, then A', false],
        ['P, then C, then A, then I', false],
      ], 'The constructor runs first; then the init callbacks in their fixed order: @PostConstruct, then InitializingBean.afterPropertiesSet(), then the custom init method named on @Bean.'),
      mcq(`ReportService is a singleton. Its field \`@Autowired private Exporter exporter;\` refers to a bean
declared \`@Scope("prototype")\`. A controller calls \`reportService.export()\` three times, and each call
uses \`exporter\`. How many Exporter instances has the container created for ReportService?`, [
        ['Three, because a prototype is created per method call', false],
        ['Four: one at injection and one for every later call', false],
        ['One, created when ReportService itself was injected', true],
        ['None until the first call, then one per request thread', false],
      ], 'Injection happens once, when the singleton is built, so the singleton keeps one prototype instance for good. Getting a fresh one per call needs ObjectProvider.getObject(), @Lookup or a scoped proxy.'),
      mcq('Under load, a singleton `TokenService` that stores the caller\'s user id in an instance field before using it two lines later starts issuing tokens for the wrong user. What is the best fix?', [
        ['Mark the class @Scope("prototype") so each caller gets one', false],
        ['Declare the field volatile so every thread sees its value', false],
        ['Make the method synchronized to stop threads overlapping', false],
        ['Keep the user id in a local variable or a method parameter', true],
      ], 'The singleton is shared by every request thread, so the field is shared too. A local lives on each thread\'s own stack. volatile only fixes visibility, synchronized serialises every call, and a prototype injected into a singleton caller is still one instance.'),
    ],
    checkpoint: [
      mcq(`How many Clock objects exist in the context after startup?

    @Configuration(proxyBeanMethods = false)
    public class TimeConfig {
        @Bean Clock clock() { return Clock.systemUTC(); }
        @Bean Scheduler scheduler() { return new Scheduler(clock()); }
        @Bean Auditor auditor() { return new Auditor(clock()); }
    }`, [
        ['One, because Spring intercepts calls between @Bean methods', false],
        ['Two, because the clock bean is shared by only one caller', false],
        ['Zero, because a Clock cannot be a bean in a config class', false],
        ['Three: the bean plus one for each plain method call', true],
      ], 'With proxyBeanMethods = false there is no CGLIB subclass, so clock() inside scheduler() and auditor() is an ordinary Java call. The container makes its own Clock bean, and each call makes another.'),
      mcq('`SmsGateway` and `WhatsAppGateway` both implement `Notifier` and are both `@Component`s with no `@Primary` or `@Qualifier`. `AlertService` has one constructor, `AlertService(Notifier channel)`. What happens?', [
        ['Spring picks whichever component it scanned first', false],
        ['Spring injects a composite that calls both gateways', false],
        ['Startup fails with NoUniqueBeanDefinitionException', true],
        ['AlertService is skipped and the app starts without it', false],
      ], 'Two candidates match the type and nothing narrows it: no @Primary, no @Qualifier, and the parameter name channel matches neither bean name. The context refuses to guess and fails at startup.'),
      mcq('In a Spring Boot 3 app, `InvoiceService(TaxService tax)` and `TaxService(InvoiceService invoices)` both use constructor injection. What happens when the app starts?', [
        ['Spring builds one of them half-done and finishes it later', false],
        ['Startup fails, reporting that the beans form a cycle', true],
        ['Both beans are created lazily on their first use instead', false],
        ['The app starts, but the first call overflows the stack', false],
      ], 'Neither constructor can run before the other bean exists, so constructor cycles cannot be resolved at all, and Boot (2.6+) also prohibits circular references by default. The fix is to break the cycle in the design.'),
    ],
  },

  /* ── IV_BOOT ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_SPRING_IV_BOOT',
    notes: `"How does Spring Boot work?" is the most common Boot question, and "it configures things
automatically" is the answer that ends the topic badly. The interviewer wants the mechanism.

## 1. What does @SpringBootApplication do?

**Strong answer.** It combines three annotations: \`@SpringBootConfiguration\` (a \`@Configuration\`),
\`@EnableAutoConfiguration\` (load Boot's auto-configuration classes) and \`@ComponentScan\` (scan
this package **and its sub-packages**). That last part is why the main class sits in the root package —
a \`@Service\` in a sibling package is simply never found.

**Wrong answer.** "It starts Tomcat." \`SpringApplication.run\` creates the context; Tomcat is started
by auto-configuration because it is on the classpath.

## 2. How does auto-configuration decide what to configure?

**Strong answer.** Boot 3 reads a list of auto-configuration classes from
\`META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports\` in every jar
(Boot 2 used \`spring.factories\`; Boot 3.0 dropped that for auto-configuration). Each class is
guarded by **conditions**, evaluated at startup:

    @AutoConfiguration
    @ConditionalOnClass(DataSource.class)                 // only if the class is on the classpath
    @EnableConfigurationProperties(DataSourceProperties.class)
    public class DataSourceAutoConfiguration {
        @Bean
        @ConditionalOnMissingBean                         // only if YOU didn't define one
        @ConditionalOnProperty(prefix = "spring.datasource", name = "url")
        DataSource dataSource(DataSourceProperties p) { ... }
    }

Auto-configuration is processed **after** your own configuration, so \`@ConditionalOnMissingBean\`
sees your beans: define your own \`ObjectMapper\` or \`DataSource\` and Boot's backs off. That is the
whole philosophy — sensible defaults that step aside.

**Follow-up.** "How would you find out why a bean was or wasn't configured?" — start with
\`--debug\` (or \`debug=true\`) to print the **condition evaluation report**: positive matches, negative
matches and the reason for each; or the Actuator \`/actuator/conditions\` endpoint.

**Follow-up.** "How do you turn one off?" —
\`@SpringBootApplication(exclude = DataSourceAutoConfiguration.class)\` or
\`spring.autoconfigure.exclude=...\`.

## 3. What is a starter?

**Strong answer.** A dependency descriptor: \`spring-boot-starter-web\` is a pom that pulls in Spring
MVC, Jackson, Tomcat and validation at versions known to work together. It contains (almost) no code.
Versions come from the \`spring-boot-dependencies\` BOM via the parent, which is why you write no
version numbers. Writing your own starter = an auto-configuration module + a starter pom that depends
on it.

## 4. In what order are properties resolved?

**Strong answer.** Higher wins: command-line arguments > Java system properties > OS environment
variables > profile-specific files (\`application-prod.yml\`) > \`application.yml\`; and a file
outside the jar beats one packaged inside it. Environment variables bind by **relaxed binding**:
\`SPRING_DATASOURCE_URL\` sets \`spring.datasource.url\`. That is how the same jar runs in every
environment — config in the environment, not in the build.

**Wrong answer.** "application.properties overrides everything."

## 5. Profiles — what and how?

\`spring.profiles.active=prod\` loads \`application-prod.yml\` on top of the defaults and activates
beans marked \`@Profile("prod")\`. Use them for *which* infrastructure (a real mail sender vs a
logging fake), not for secrets: secrets come from environment variables or a secrets manager.

## 6. @Value or @ConfigurationProperties?

\`@ConfigurationProperties(prefix = "app.jwt")\` binds a whole group into a typed object (a record
works), validated with \`@Validated\`, discoverable in IDE metadata. \`@Value("\${app.jwt.ttl}")\` is
fine for one value. Strong candidates prefer the former for anything with more than two keys.

## 7. How does Boot run without an external server?

The embedded server (Tomcat by default) is a library inside the executable "fat" jar; the
\`spring-boot-maven-plugin\` repackages the jar with a launcher. Switch to Jetty or Undertow by
excluding \`spring-boot-starter-tomcat\` and adding the other starter.

## 8. What is Actuator and what does it expose by default?

Production endpoints: \`health\`, \`info\`, \`metrics\`, \`env\`, \`loggers\`, \`conditions\`,
\`prometheus\` (with Micrometer's registry). Over HTTP **only \`/actuator/health\` is exposed by
default**; others need \`management.endpoints.web.exposure.include\`. \`env\` and \`heapdump\` leak
secrets, so expose deliberately, ideally on a separate management port, behind security.

**Follow-up.** "Liveness vs readiness?" — liveness: is the process alive (restart if not); readiness:
can it take traffic now (stop routing if not, e.g. during startup or when the DB is down).

## 9. What does spring-boot-devtools do, and should it ship?

Automatic restart on classpath change and LiveReload, with caching disabled. It disables itself when
run from a packaged jar, and is declared \`optional\`/\`developmentOnly\` so it never ships.`,
    mcqs: [
      mcq('Your app declares its own `@Bean ObjectMapper` with a custom date format. What happens to the `ObjectMapper` that Jackson auto-configuration would have created?', [
        ['Both exist, and Spring MVC uses whichever was created first', false],
        ['Boot\'s one is skipped, because its @Bean is on-missing-bean', true],
        ['Startup fails, since two beans of one type now compete', false],
        ['Boot\'s one replaces yours, since auto-config runs last', false],
      ], 'Auto-configuration runs after user configuration, and JacksonAutoConfiguration guards its ObjectMapper with @ConditionalOnMissingBean. Seeing yours, it backs off — the defaults step aside.'),
      mcq('A library written for Spring Boot 2 registers its auto-configuration only under the `EnableAutoConfiguration` key in `META-INF/spring.factories`. You add it to a Boot 3 app. What happens?', [
        ['It is loaded as usual, since spring.factories never changed', false],
        ['Startup fails with an error naming the unsupported file', false],
        ['It is ignored: Boot 3 reads AutoConfiguration.imports only', true],
        ['It is loaded, but only once the debug flag is switched on', false],
      ], 'Boot 2.7 introduced META-INF/spring/...AutoConfiguration.imports and Boot 3.0 removed auto-configuration registration via spring.factories, so the library\'s configuration silently never runs.'),
      mcq('A colleague asks why the `DataSource` they expected was not created. Which is the quickest way to see Boot\'s reasoning for that specific auto-configuration?', [
        ['Start with --debug and read the condition evaluation report', true],
        ['Set logging.level.root=TRACE and search the startup output', false],
        ['Open spring-boot-dependencies and look up the version number', false],
        ['Call /actuator/beans and look for the missing DataSource', false],
      ], 'The condition evaluation report lists each auto-configuration with the condition that matched or failed and why (missing class, missing property, existing bean). /actuator/beans only lists beans that exist.'),
    ],
    checkpoint: [
      mcq(`What port does the app listen on?

    # application.properties          server.port=8080
    # application-prod.properties     server.port=9090
    # started with:  SERVER_PORT=7070 java -jar shop.jar --spring.profiles.active=prod`, [
        ['8080, since application.properties is the base file', false],
        ['9090, because the active prod profile file wins', false],
        ['7070, as an environment variable beats both files', true],
      ], 'Environment variables rank above every application*.properties file, profile-specific or not, and SERVER_PORT binds to server.port by relaxed binding. Only a command-line --server.port would beat it.'),
      mcq('A fresh Spring Boot 3 app adds `spring-boot-starter-actuator`. `GET /actuator/health` returns 200, but `GET /actuator/metrics` returns 404. Why?', [
        ['Metrics needs Micrometer, which the starter leaves out', false],
        ['Only health is exposed over HTTP until you include more', true],
        ['Metrics are served at /metrics, without the prefix', false],
        ['Security blocks it, and a block is reported as a 404', false],
      ], 'By default Boot exposes only the health endpoint over the web. management.endpoints.web.exposure.include=health,metrics (or a list) exposes others — chosen deliberately, because some leak secrets.'),
      mcq('A configuration class is annotated `@ConditionalOnClass(name = "com.mysql.cj.jdbc.Driver")` and the MySQL driver jar is not on the classpath. What happens at startup?', [
        ['Startup fails with a ClassNotFoundException for the driver', false],
        ['The class loads, but each of its @Bean methods returns null', false],
        ['The class is skipped quietly and listed as a negative match', true],
        ['Boot downloads the missing driver from Maven Central', false],
      ], 'A failed condition simply excludes the configuration; using the class name as a string means nothing tries to load the missing class. The condition report shows it as a negative match.'),
    ],
  },

  /* ── IV_REST ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_SPRING_IV_REST',
    notes: `REST questions test whether you design an API for its clients — the React app, the mobile
app still running last year's build, the retrying gateway — or only for your own controller.

## 1. @Controller versus @RestController?

**Strong answer.** \`@RestController\` = \`@Controller\` + \`@ResponseBody\` on every method: the return
value is written to the response body by an \`HttpMessageConverter\` (Jackson for JSON) instead of
being treated as a view name. Content negotiation picks the converter from the \`Accept\` header.

## 2. @PathVariable, @RequestParam, @RequestBody — when each?

Path variable identifies the resource (\`/orders/42\`); request param filters, sorts or pages a
collection (\`/orders?status=OPEN&page=2\`); request body carries the representation being created or
replaced (JSON). Rule of thumb: if removing it changes *which* resource you mean, it belongs in the path.

## 3. Which status codes do you return, and how?

**Strong answer.** \`200\` with a body; \`201 Created\` plus a \`Location\` header for a create;
\`204 No Content\` for a delete; \`400\` malformed or invalid input; \`401\` not authenticated;
\`403\` authenticated but not allowed; \`404\` no such resource; \`409 Conflict\` for a duplicate or a
version clash; \`422\` (some teams) for valid JSON that breaks a business rule; \`500\` only for our own
bugs. Return them with \`ResponseEntity\`:

    @PostMapping
    ResponseEntity<TicketDto> create(@Valid @RequestBody NewTicket body) {
        TicketDto t = service.create(body);
        return ResponseEntity.created(URI.create("/api/v1/tickets/" + t.id())).body(t);
    }

**Wrong answer.** Returning 200 with \`{"error": "not found"}\` — every client and monitor now has to
parse bodies to know whether a call failed.

## 4. How does validation work, and what does the client get?

\`@Valid\` on a \`@RequestBody\` runs Bean Validation (\`@NotBlank\`, \`@Email\`, \`@Positive\`) before
your method; a failure throws \`MethodArgumentNotValidException\`, which Spring turns into a 400 —
your method body never runs. Constraints on \`@PathVariable\`/\`@RequestParam\` are method validation
(Spring 6.1+ has it built in, earlier you needed \`@Validated\` on the class). Use a global handler to
return field-level errors in a consistent shape.

## 5. How do you handle exceptions globally?

**Strong answer.** A \`@RestControllerAdvice\` with \`@ExceptionHandler\` methods mapping domain
exceptions to status codes; the **most specific** exception type wins. Spring 6 supports
\`ProblemDetail\` (RFC 9457, formerly 7807) so error bodies have a standard shape:

    @ExceptionHandler(OrderNotFoundException.class)
    ProblemDetail notFound(OrderNotFoundException e) {
        ProblemDetail p = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
        p.setTitle("Order not found");
        return p;
    }

**Follow-up.** "Does the advice catch exceptions thrown in a security filter?" — No; filters run
before the \`DispatcherServlet\`. Security errors go through its \`AuthenticationEntryPoint\` and
\`AccessDeniedHandler\`.

## 6. PUT versus PATCH — and what does idempotent mean?

**Strong answer.** An operation is **idempotent** if doing it twice leaves the server in the same
state as doing it once. GET, PUT and DELETE are idempotent; POST is not. **PUT replaces** the whole
resource with the representation sent — send it three times, same result. **PATCH applies a partial
change**; whether it is idempotent depends on the patch: \`{"email": "a@b.in"}\` is, but
\`{"op": "increment", "by": 100}\` is not.

**Follow-up.** "A payment POST times out and the client retries. How do you stop a double charge?" —
an **idempotency key**: the client sends a unique \`Idempotency-Key\` header; the server stores the
key with the result, and a repeat with the same key returns the stored result instead of charging.

**Wrong answer.** "PUT is for update, PATCH is also for update" — misses replace vs partial.

## 7. How do you version an API?

Options: URI (\`/api/v1/orders\`) — visible, cache-friendly, the common choice; header
(\`X-API-Version: 2\`); media type (\`Accept: application/vnd.shop.v2+json\`); query param. Version
only on **breaking** changes (removing or renaming a field, changing a type); adding an optional field
is not breaking. Keep v1 running until the clients that depend on it are gone — a mobile app in the
field cannot be force-updated. (Spring Framework 7 adds first-class API-version mapping; on Boot 3 you
do it with paths or headers.)

## 8. Why return DTOs rather than entities?

Exposing a JPA entity leaks the schema, lets clients over-post fields they should not set
(\`role\`, \`balance\`), triggers lazy loading during serialisation (or \`LazyInitializationException\`),
and loops forever on bidirectional relations. A DTO (a record) is the API contract; the entity can
change behind it.

## 9. How do you return a large collection?

Paginate: \`Pageable\` in the controller (\`?page=0&size=20&sort=createdAt,desc\`), \`Page<T>\` or
\`Slice<T>\` from the repository; cap \`size\`. For feeds that change while being read, cursor/keyset
pagination (\`?after=981\`) avoids skipped and duplicated rows.

## 10. What makes an API RESTful rather than just HTTP + JSON?

Resources named by nouns, the HTTP method carrying the verb, standard status codes, statelessness
(each request carries what is needed to serve it — e.g. the JWT), and cacheable responses where safe.`,
    mcqs: [
      mcq('A mobile client times out and resends the same request three times. Which request leaves the server in the same state as sending it once?', [
        ['POST /orders with the cart as the request body', false],
        ['PATCH /wallets/7 with {"op":"credit","amount":100}', false],
        ['PUT /orders/42/address with the full new address', true],
        ['POST /payments with the order id and the amount', false],
      ], 'PUT replaces the address with the same representation each time, so it is idempotent. Each POST creates another order or payment, and a credit-by-100 PATCH adds 100 every time it arrives.'),
      mcq('`NewUser` has `@NotBlank String name`. A client posts `{"name": ""}` to a handler declared `create(@Valid @RequestBody NewUser body)`, and no exception handler is defined. What happens?', [
        ['The handler runs and must check the name for itself', false],
        ['Spring answers 400; the handler body never executes', true],
        ['Spring answers 500, since validation threw an exception', false],
        ['Spring stores the user and attaches a warning header', false],
      ], 'Bean Validation runs during argument resolution; MethodArgumentNotValidException is thrown before the method is invoked, and Spring\'s default handling maps it to 400 Bad Request.'),
      mcq('A `@RestControllerAdvice` has one handler for `RuntimeException` (returns 500) and one for `OrderNotFoundException extends RuntimeException` (returns 404). A controller throws `OrderNotFoundException`. Which status does the client get?', [
        ['500, because the RuntimeException handler was declared first', false],
        ['404, because the most specific matching handler is chosen', true],
        ['Startup fails, since two handlers match one exception type', false],
      ], 'Spring picks the handler whose declared exception type is closest to the thrown one in the hierarchy, not the first declared, so the OrderNotFoundException handler runs.'),
    ],
    checkpoint: [
      mcq('`POST /api/v1/tickets` succeeds and the new ticket has id 981. Which response follows HTTP semantics best?', [
        ['200 OK with the ticket, and no Location header at all', false],
        ['204 No Content with the new id in a custom header', false],
        ['201 Created, a Location of /api/v1/tickets/981, and the body', true],
        ['202 Accepted with a body that says the ticket was saved', false],
      ], '201 says a resource was created, and the Location header tells the client where it now lives. 202 means accepted for later processing, and 204 has no body to return the ticket in.'),
      mcq('Version 3.1 of your Android app reads `name` from `GET /api/v1/profile`. The web team wants to replace it with `firstName` and `lastName`. Many users never update the app. What do you do?', [
        ['Rename the field in v1 and ask users to update the app', false],
        ['Serve the new shape at v2 and keep v1 until 3.1 fades', true],
        ['Return both shapes in v1 on alternate calls for a while', false],
        ['Drop the field and let the app fall back to the email', false],
      ], 'Removing or renaming a field is a breaking change, and a mobile client in the field cannot be forced to update. Publish the new contract as a new version and retire v1 only when its traffic has gone.'),
      mcq('A controller returns a JPA `Customer` entity directly. `Customer` has `@OneToMany(mappedBy = "customer") List<Order> orders`, and `Order` has `@ManyToOne Customer customer`, with no Jackson annotations. The collection is loaded. What happens on `GET /customers/5`?', [
        ['Jackson writes the customer once with its orders, then stops', false],
        ['Jackson skips the orders field, as it is a lazy collection', false],
        ['Serialisation recurses customer, order, customer until it fails', true],
        ['Hibernate converts the entity into a DTO before writing it', false],
      ], 'Each Order points back at its Customer, which lists the orders again, so Jackson recurses until it fails with an infinite-recursion error. Returning a DTO that does not contain the back-reference avoids it.'),
    ],
  },

  /* ── IV_JPA ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_SPRING_IV_JPA',
    notes: `Hibernate questions are where interviewers separate "I used Spring Data" from "I know what SQL
my code runs". Have one N+1 story and one \`@Transactional\` story of your own ready.

## 1. JPA, Hibernate, Spring Data JPA — what is each?

JPA (Jakarta Persistence, \`jakarta.persistence.*\` since Boot 3 — \`javax.*\` before) is the
specification; Hibernate is the implementation Boot uses; Spring Data JPA generates repository
implementations on top (\`findByEmail\`, \`Pageable\`, \`@Query\`). Spring Data does not replace
Hibernate — every repository call ends up in an \`EntityManager\`.

## 2. What are the entity states?

**Strong answer.** *Transient* (new object, unknown to Hibernate), *managed* (in the current
persistence context — changes are tracked), *detached* (was managed, context closed), *removed*
(scheduled for delete). A managed entity is saved by **dirty checking** at flush: change a field
inside a transaction and an UPDATE is issued without calling \`save()\`. \`persist\` makes a
transient object managed; \`merge\` copies a detached object's state onto a managed copy and returns
that copy.

**Follow-up.** "So why does your code call \`save()\` after changing a loaded entity?" — it is
harmless but not needed inside a transaction; saying so scores.

## 3. Lazy versus eager — what are the defaults?

\`@ManyToOne\` and \`@OneToOne\` are **EAGER** by default; \`@OneToMany\` and \`@ManyToMany\` are
**LAZY**. Good practice: make everything LAZY and fetch what each use case needs. Touching a lazy
association after the session closed throws \`LazyInitializationException\`. Boot's
\`spring.jpa.open-in-view\` (true by default, with a startup warning) keeps the session open through
the web request, hiding the error and causing queries during JSON serialisation — many teams turn it off.

## 4. What is the N+1 problem and how do you fix it?

**Strong answer.** One query loads N parents, then one more query per parent loads its association:
1 + N round trips. Spot it in the SQL log (\`spring.jpa.show-sql\` or the
\`org.hibernate.SQL\` logger) or Hibernate statistics. Fixes:

    @Query("select o from Order o join fetch o.customer where o.status = :s")
    List<Order> findWithCustomer(@Param("s") Status s);           // one query, joined

    @EntityGraph(attributePaths = "items")
    List<Order> findByStatus(Status s);                            // same, declaratively

    spring.jpa.properties.hibernate.default_batch_fetch_size=50    // 1 + N/50 queries

or a DTO projection that selects only the columns needed.

**Follow-up.** "Join-fetch a collection *and* paginate?" — Hibernate cannot limit rows of a join that
multiplies parents, so it fetches everything and paginates in memory (warning HHH90003004). Page the
parent ids first, then fetch their collections, or use batch fetching.

**Wrong answer.** "Make it EAGER" — eager on a collection still loads with extra selects for a JPQL
query and loads data you did not want everywhere else.

## 5. First-level versus second-level cache?

**Strong answer.** The **first-level cache** is the persistence context: per \`EntityManager\` (per
transaction, in Spring), always on — \`find\` the same id twice and the second returns the same object
without SQL. The **second-level cache** is shared across sessions (per \`SessionFactory\`), off by
default, enabled per entity with \`@Cache\` and a provider (Ehcache, Caffeine via JCache). It suits
read-mostly reference data (countries, product categories), not fast-changing rows. The query cache
is separate again and caches only ids.

## 6. How does @Transactional work, and when does it silently not work?

**Strong answer.** Spring wraps the bean in a **proxy**; the proxy opens the transaction, calls your
method, commits or rolls back. Anything that bypasses the proxy bypasses the transaction:

- **Self-invocation** — \`this.audit()\` from inside the same class calls the real object, so the
  annotation on \`audit()\` is ignored.
- **private** methods are never proxied (Spring 6 does handle protected and package-private methods
  with class-based proxies).
- An object you created with \`new\` is not a bean, so there is no proxy.

Fix self-invocation by moving the method to another bean.

## 7. When does a transaction roll back?

By default on **unchecked** exceptions (\`RuntimeException\`) and \`Error\`, **not** on checked
exceptions — a method that throws \`IOException\` after saving still commits. Use
\`@Transactional(rollbackFor = Exception.class)\` when a checked exception should undo the work. A
caught exception does not roll anything back — the proxy never sees it.

## 8. What are the propagation types you actually use?

\`REQUIRED\` (default): join the current transaction or start one. \`REQUIRES_NEW\`: suspend the
current one and run in a new, independent transaction — used for an audit log that must survive the
caller's rollback. \`NESTED\`: a savepoint inside the current one (JDBC only). \`MANDATORY\`: fail if
there is none.

**Follow-up — the classic trap.** An outer \`REQUIRED\` method calls an inner \`REQUIRED\` method on
another bean; the inner one throws a runtime exception, the outer catches it and carries on. The
inner proxy already marked the shared transaction **rollback-only**, so at commit Spring throws
\`UnexpectedRollbackException\` and nothing is saved.

## 9. Optimistic versus pessimistic locking?

**Optimistic**: a \`@Version\` column; every UPDATE adds \`where version = ?\` and increments it.
If two users edit the same row, the second update matches zero rows and Hibernate throws
\`OptimisticLockException\` (Spring: \`ObjectOptimisticLockingFailureException\`) — return 409 and let
the client reload. Best when conflicts are rare. **Pessimistic**:
\`@Lock(LockModeType.PESSIMISTIC_WRITE)\` issues \`SELECT ... FOR UPDATE\`, holding a row lock until
commit — for hot rows like a seat or a stock counter, at the cost of waiting and deadlock risk.

## 10. Why does inserting 10,000 rows with saveAll take so long?

\`GenerationType.IDENTITY\` (MySQL \`AUTO_INCREMENT\`) needs the id back after each INSERT, so
Hibernate **cannot batch** inserts. Options: \`hibernate.jdbc.batch_size\` with a sequence/table
generator, or JDBC batch / \`LOAD DATA\` for bulk loads. Also flush and clear the persistence context
every few hundred rows, or it grows without bound.

## 11. What does readOnly = true do?

\`@Transactional(readOnly = true)\` lets Hibernate skip dirty checking (no snapshots kept), sets the
JDBC connection read-only (routing replicas can use it) — a free win on query methods.`,
    workedExample: `**The question.** "This endpoint lists 50 open orders with each customer's name. It takes 900 ms.
Find the problem without a profiler."

    @Entity class Order {
        @ManyToOne(fetch = FetchType.LAZY) Customer customer;
        @OneToMany(mappedBy = "order") List<OrderItem> items;   // LAZY by default
    }

    List<Order> open = orderRepository.findByStatus(Status.OPEN);   // 50 orders
    return open.stream()
        .map(o -> new OrderRow(o.getId(), o.getCustomer().getName(), o.getItems().size()))
        .toList();

**Step 1 — turn on the SQL log and count.**

    select ... from orders where status=?              -- 1
    select ... from customer where id=?                -- up to 50 (one per distinct customer)
    select ... from order_item where order_id=?        -- 50

Up to **101 queries** for one page. Each costs a network round trip to MySQL; that is the 900 ms.

**Step 2 — fix the to-one side with a fetch join, the to-many side separately.**

    @Query("select o from Order o join fetch o.customer where o.status = :s")
    List<Order> findOpenWithCustomer(@Param("s") Status s);

Fetching \`items\` in the same query would multiply rows (one row per item) and break pagination if
you later add it. For the count, do not load the items at all:

    @Query("""
        select new com.shop.OrderRow(o.id, c.name, count(i))
        from Order o join o.customer c left join o.items i
        where o.status = :s group by o.id, c.name""")
    List<OrderRow> openRows(@Param("s") Status s);

**Step 3 — state the result and the trade-off.** One query, a few milliseconds. The projection
returns exactly what the screen needs and nothing is managed, so there is no dirty checking either.
Close with the general rule: *decide what each use case fetches; never let lazy loading decide it in
a loop.*`,
    mcqs: [
      mcq(`\`Order\` has \`@ManyToOne Customer customer\` with no fetch type set. This runs, and the 50 orders
belong to 50 different customers. How many SELECT statements reach MySQL?

    List<Order> all = orderRepository.findAll();    // 50 orders
    all.forEach(o -> System.out.println(o.getCustomer().getName()));`, [
        ['1, because EAGER makes the query join the customer table', false],
        ['2, one for the orders and one batched for all customers', false],
        ['51, one for the orders and then one for each customer', true],
        ['101, two for each order and then one for the list itself', false],
      ], 'findAll runs JPQL select o from Order o; JPQL does not honour EAGER as a join, so Hibernate loads each distinct customer with its own SELECT right after: 1 + 50. A join fetch or batch fetching fixes it.'),
      mcq(`What happens to the audit row when \`placeOrder\` later throws a RuntimeException?

    @Service
    public class OrderService {
        @Transactional
        public void placeOrder(Order o) {
            repo.save(o);
            this.audit(o);                    // writes an audit row
            throw new IllegalStateException("stock");
        }
        @Transactional(propagation = Propagation.REQUIRES_NEW)
        public void audit(Order o) { auditRepo.save(new Audit(o)); }
    }`, [
        ['It is kept, because audit ran in its own new transaction', false],
        ['It is rolled back, as self-invocation skipped the proxy', true],
        ['It is kept, as REQUIRES_NEW always commits on the spot', false],
        ['Startup fails, as one class mixes propagation settings', false],
      ], 'this.audit() calls the real object, not the Spring proxy, so REQUIRES_NEW is never applied and the audit row is part of placeOrder\'s transaction, which rolls back. Moving audit() to another bean fixes it.'),
      mcq('A `@Transactional` method saves a refund and then throws a checked `IOException` because writing the receipt file failed. No `rollbackFor` is set. What happens to the refund row?', [
        ['It is rolled back, as every exception rolls back by default', false],
        ['It is committed: checked exceptions do not trigger rollback', true],
        ['It stays pending until the receipt file write is retried', false],
        ['It is rolled back only when the method is declared public', false],
      ], 'Spring\'s default rollback rule covers RuntimeException and Error only. A checked exception propagates but the transaction commits, unless you set rollbackFor = Exception.class (or the specific type).'),
    ],
    checkpoint: [
      mcq('`Product` has a `@Version int version`. Admins Meena and Arjun both load product 7 at version 3. Meena saves a price change, then Arjun saves a stock change. What happens to Arjun\'s save?', [
        ['It succeeds and silently overwrites Meena\'s price change', false],
        ['It merges both changes, since they touch different columns', false],
        ['It fails with an optimistic-locking exception for version 3', true],
        ['It blocks until Meena\'s transaction releases the row lock', false],
      ], 'Meena\'s update set version to 4. Arjun\'s UPDATE says where version = 3, matches no row, and Hibernate throws an optimistic-locking failure; the API should return 409 so he reloads. No row lock is held in between.'),
      mcq(`How many SELECT statements does this method send to the database?

    @Transactional
    public void compare() {
        Product a = em.find(Product.class, 1L);
        Product b = em.find(Product.class, 1L);
        System.out.println(a == b);
    }`, [
        ['Two, one SELECT for each call to find', false],
        ['One, and the program then prints true', true],
        ['One, and the program then prints false', false],
        ['None, as find is served by the L2 cache', false],
      ], 'Both calls run in one persistence context. The first loads the row; the second finds id 1 in the first-level cache and returns the same instance, so a == b is true. The second-level cache is off by default.'),
      mcq('`checkout()` (`@Transactional`) calls `inventory.reserve()` on another bean (also `@Transactional`, default propagation). `reserve()` throws a RuntimeException, `checkout()` catches it, logs it and returns normally. What is the outcome?', [
        ['checkout commits everything except the reservation work', false],
        ['checkout commits fully, since the exception was caught', false],
        ['Commit fails with UnexpectedRollbackException; nothing saved', true],
        ['reserve is retried once on a fresh, separate transaction', false],
      ], 'Both methods share one REQUIRED transaction. When the exception passed through reserve()\'s proxy it marked that transaction rollback-only; catching it later cannot undo the mark, so the commit is turned into a rollback.'),
    ],
  },

  /* ── IV_SECURITY ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_SPRING_IV_SECURITY',
    notes: `Security questions check two things: that you know where Spring Security sits in a request,
and that you know the weaknesses of what you built — a candidate who says "JWT is secure" without
qualifying it loses the round.

## 1. Authentication versus authorization? 401 versus 403?

**Strong answer.** Authentication: *who are you* (password, token). Authorization: *may you do
this* (roles, ownership). 401 Unauthorized really means *unauthenticated* — no or bad credentials;
403 Forbidden means we know who you are and the answer is no.

## 2. How does a request pass through Spring Security?

**Strong answer.** Spring Security is servlet filters in front of the \`DispatcherServlet\`:
\`DelegatingFilterProxy\` → \`FilterChainProxy\` → the matching \`SecurityFilterChain\` (CORS, CSRF,
authentication filters such as my JWT filter, \`ExceptionTranslationFilter\`, and
\`AuthorizationFilter\` last). An authentication filter that succeeds stores an \`Authentication\` in
the \`SecurityContextHolder\` (a thread-local); the authorization filter then checks the rules.
In Security 6 you declare a \`SecurityFilterChain\` bean — \`WebSecurityConfigurerAdapter\` was removed.

**Follow-up.** "Where does your JWT filter go?" — \`addFilterBefore(jwtFilter,
UsernamePasswordAuthenticationFilter.class)\`, a \`OncePerRequestFilter\` that validates the token and
sets the context. "What happens to the security context in an \`@Async\` method?" — it is a
thread-local, so it is empty on the other thread unless you use a delegating executor.

## 3. What is in a JWT, and is it encrypted?

Three base64url parts: header (\`alg\`), payload (claims: \`sub\`, \`exp\`, \`iat\`, roles), signature.
It is **signed, not encrypted** — anyone can read the payload, so never put a password, PAN or
anything private in it. The signature only proves it was not altered. HS256 needs a strong secret
(at least 256 bits) shared by every verifier; RS256 lets other services verify with a public key.

## 4. What are JWT's weaknesses? How do you log someone out or revoke a token?

**Strong answer.** A JWT is valid until it expires; the server keeps no record, so **you cannot
revoke it** by default. Mitigations:

- short-lived **access tokens** (5–15 minutes) plus a **refresh token** stored server-side, rotated on
  every use and revocable — logout or a ban deletes the refresh token;
- for immediate revocation, a **denylist** of token ids (\`jti\`) in Redis until their expiry, or a
  \`tokenVersion\` on the user row that each token carries and the filter compares (bumped on password
  change) — both reintroduce a lookup, which is the honest trade-off;
- validate \`exp\`, the algorithm (never accept \`alg: none\`), issuer and audience.

**Wrong answer.** "Delete it on the client" — the token still works for anyone who copied it.

## 5. Stateless JWT or server sessions?

Sessions: a cookie with a session id, state on the server; revocation is trivial (delete the
session), but several instances need sticky sessions or a shared store (Spring Session + Redis).
JWT: no server state, scales horizontally, works across services and mobile; revocation and token
size are the costs. For a single web app with one backend, sessions are perfectly good — saying so
shows judgement.

## 6. What is CSRF and when do you need protection?

**Strong answer.** Cross-site request forgery: a page on \`evil.example\` makes the victim's browser
send a request to your site, and the browser **attaches your cookies automatically**. It matters
whenever authentication rides on something the browser sends by itself — a session cookie, or a JWT
in a cookie. Spring's defence is a CSRF token the attacker's page cannot read, plus \`SameSite\`
cookies. A pure REST API that takes the JWT **only from the \`Authorization\` header** can disable
CSRF, because a forged cross-site request cannot set that header.

**Wrong answer.** "We disabled CSRF because it's an API" — the reason is *the header*, not the word API.

## 7. What is CORS and why does my React app get blocked?

The browser's same-origin policy blocks reading responses from another origin
(\`localhost:5173\` → \`localhost:8080\`); CORS is the server telling the browser which origins may.
A request with an \`Authorization\` header triggers a **preflight** \`OPTIONS\`; if Spring Security
handles it before CORS is configured, the preflight gets 401 and the browser reports a CORS error.
Fix: \`http.cors(...)\` with a \`CorsConfigurationSource\`. CORS protects users in browsers; it does
nothing against curl.

## 8. How are passwords stored?

Hashed with a slow, salted, adaptive function — \`BCryptPasswordEncoder\` (or Argon2): a random salt
per password stored inside the hash, and a cost factor you raise as hardware improves. Never
encrypt (reversible) and never MD5/SHA-256 alone (fast to brute-force). \`DelegatingPasswordEncoder\`
prefixes \`{bcrypt}\` so you can migrate algorithms later.

## 9. hasRole versus hasAuthority?

\`hasRole("ADMIN")\` checks for the authority \`ROLE_ADMIN\`; \`hasAuthority("ADMIN")\` checks the
string as-is. Mixing them up is the commonest cause of an unexpected 403. Method-level rules use
\`@EnableMethodSecurity\` and \`@PreAuthorize("hasRole('ADMIN') or #id == authentication.name")\`.

## 10. Where would you keep the JWT in the React app?

Memory or \`localStorage\`: simple, but readable by any XSS. An \`httpOnly\`, \`Secure\`,
\`SameSite\` cookie: invisible to JavaScript, but now the browser sends it automatically, so CSRF
protection must come back. There is no free option; name the trade-off.`,
    mcqs: [
      mcq('An admin bans a user at 10:00. The user\'s JWT was issued at 09:30 with a 24-hour expiry, and the API checks only its signature and expiry. What change limits how long such a user keeps access?', [
        ['Encrypt the JWT payload so its claims cannot be read', false],
        ['Use 15-minute access tokens with a revocable refresh token', true],
        ['Move the token from localStorage into sessionStorage', false],
        ['Sign the token with RS256 instead of HS256 from now on', false],
      ], 'A JWT stays valid until exp. Short access tokens bound the window, and the refresh step checks server-side state that a ban deletes. Encryption, storage location and algorithm do not make an issued token revocable.'),
      mcq('A user is granted the authority `"ADMIN"` (no prefix). The endpoint is secured with `.requestMatchers("/admin/**").hasRole("ADMIN")`. What does the user get?', [
        ['200, since the user holds an authority named ADMIN', false],
        ['401, as the user has not been authenticated at all', false],
        ['403, as hasRole looks for the authority ROLE_ADMIN', true],
        ['500, as Spring cannot parse an authority with no prefix', false],
      ], 'hasRole adds the ROLE_ prefix before comparing, so it needs ROLE_ADMIN. The user is authenticated, so the answer is 403. Either grant ROLE_ADMIN or use hasAuthority("ADMIN").'),
      mcq('React on `http://localhost:5173` calls `http://localhost:8080/api/orders` with an `Authorization: Bearer` header. The browser console shows a CORS error, and the network tab shows an `OPTIONS` request answered with 401. What is the fix?', [
        ['Add the frontend origin to the JWT audience claim', false],
        ['Disable CSRF, since CSRF tokens block cross-origin calls', false],
        ['Send the bearer token on the OPTIONS request as well', false],
        ['Configure CORS in the security chain via http.cors()', true],
      ], 'The browser sends the preflight without credentials. Without http.cors() and a CorsConfigurationSource, Spring Security demands authentication for it and answers 401. With CORS configured, preflights are handled first.'),
    ],
    checkpoint: [
      mcq('Your API reads the JWT only from the `Authorization` header and sets no cookies. Why is disabling CSRF protection safe here?', [
        ['A JWT is signed, so a forged request fails verification', false],
        ['A forged cross-site request cannot attach that header', true],
        ['CORS already rejects every request from other origins', false],
        ['CSRF attacks only work against GET, and you use POST', false],
      ], 'CSRF works because browsers attach cookies automatically. A page on another site cannot make the browser add your Authorization header, so a forged request arrives unauthenticated. CORS does not stop a simple request from being sent.'),
      mcq('To protect against XSS, the team moves the JWT from `localStorage` into an `httpOnly` cookie. What must they now reconsider?', [
        ['CSRF, as the browser will now send the cookie on its own', true],
        ['CORS, which cannot be configured once cookies are in use', false],
        ['Password hashing, since cookies expose the stored hash', false],
        ['Token expiry, because cookies make tokens last for ever', false],
      ], 'An httpOnly cookie hides the token from scripts, but the browser now attaches it to cross-site requests automatically — exactly the condition CSRF needs. CSRF tokens or SameSite cookies come back into play.'),
      mcq('Two users choose the same password. Their stored BCrypt hashes are `$2a$10$Xq...` and `$2a$10$Lm...`, completely different. Why?', [
        ['The cost factor 10 makes BCrypt output vary between runs', false],
        ['The user id is mixed in as a pepper before hashing', false],
        ['BCrypt encrypts with a key that rotates every session', false],
        ['Each hash uses its own random salt stored inside it', true],
      ], 'BCrypt generates a random salt per password and stores it in the hash string after the cost factor. Identical passwords therefore hash differently, which defeats precomputed rainbow tables.'),
    ],
  },

  /* ── IV_ARCHITECTURE ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_SPRING_IV_ARCHITECTURE',
    notes: `The last part of a Spring round leaves the framework: how you test, whether you would split the
app into services, and what you do when one of them is slow at 2 a.m. Judgement scores here, not
buzzwords.

## 1. How do you test a Spring Boot application?

**Strong answer.** A pyramid. Most tests are **plain unit tests** — JUnit 5 + Mockito on a service,
no Spring context, milliseconds each. Then **slice tests**: \`@WebMvcTest(OrderController.class)\`
loads only MVC (controller, advice, Jackson, \`MockMvc\`) with the service mocked;
\`@DataJpaTest\` loads only JPA and repositories, transactional and rolled back after each test.
A few **\`@SpringBootTest\`** tests load the whole context, often with a random port and
\`TestRestTemplate\`/\`WebTestClient\`, for the main flows.

**Follow-up.** "Why not \`@SpringBootTest\` everywhere?" — slow, and a failure tells you less.
"\`@MockBean\`?" — deprecated in Boot 3.4 in favour of \`@MockitoBean\`; and each distinct set of mocked
beans creates a new cached context, so scattering them makes the suite slow.

## 2. H2 or a real MySQL in tests?

\`@DataJpaTest\` replaces your datasource with an embedded one by default. H2 is fast but is not
MySQL: native queries, JSON columns and some functions behave differently, so a green test proves
little. **Testcontainers** starts a real MySQL in Docker; with Boot 3.1+ \`@ServiceConnection\` wires it,
and \`@AutoConfigureTestDatabase(replace = NONE)\` stops the swap.

## 3. Monolith or microservices?

**Strong answer.** Start with a **modular monolith**: one deployable, clear packages per domain
(orders, payments, catalogue) that talk through interfaces. Microservices buy independent deployment
and scaling per team at the cost of network calls, partial failure, distributed data, and far more
operations (deploys, monitoring, tracing). They pay off with several teams stepping on each other or
parts with very different load — not for a four-person team with one product.

**Wrong answer.** "Microservices are better because Netflix uses them."

## 4. How do services talk to each other?

Synchronous HTTP — \`RestClient\` (Boot 3.2+), \`WebClient\`, or OpenFeign / HTTP interface clients:
simple and immediate, but the caller is down when the callee is. Asynchronous messaging — Kafka or
RabbitMQ: the producer publishes an event (\`OrderPlaced\`) and moves on; consumers process when they
can. Decouples availability, at the cost of eventual consistency and harder debugging. Use sync for
queries that need an answer now, events for "this happened, react to it".

## 5. How do calls between services fail, and how do you defend?

**Strong answer.** The dangerous failure is **slow**, not down. Without a timeout, every request
thread waits on the slow service, the pool runs out, and the caller stops answering too — a
**cascading failure**. Defences, usually with Resilience4j:

- **timeouts** on every outbound call (connect and read);
- **retries** with exponential backoff and jitter — only for idempotent operations or with an
  idempotency key;
- a **circuit breaker** that stops calling a failing service for a while and fails fast;
- a **bulkhead** (separate pool) so one slow dependency cannot take every thread;
- a **fallback** (cached data, a "try later" response) where the business allows.

## 6. How do you keep data consistent across services?

Database per service, so no cross-service transactions; two-phase commit is avoided. A **saga**:
a sequence of local transactions with compensating actions (reserve stock → charge → on failure
release stock). The **transactional outbox**: write the event to an \`outbox\` table in the same
local transaction as the business change, and a relay publishes it — so "saved but event lost" cannot
happen.

## 7. What sits in front of the services?

An **API gateway** (Spring Cloud Gateway): one entry point for routing, authentication, rate limiting.
**Service discovery** (Eureka, or Kubernetes DNS) so callers find instances. **Central config**
(Spring Cloud Config or environment/ConfigMaps).

## 8. How do you log in production?

SLF4J with Logback; structured (JSON) logs shipped to one place (ELK, Loki); levels used properly
(\`ERROR\` means someone must act); **never** log passwords, tokens or full card numbers. A **trace
id** propagated across services (Micrometer Tracing, W3C \`traceparent\`) and put in every log line
via MDC, so one failing request can be followed through every service.

## 9. How is configuration handled in production?

The same artefact in every environment; configuration from environment variables or a config
service; secrets from a secrets manager or Kubernetes Secrets, never in Git. Actuator
liveness/readiness probes tell the orchestrator when to restart and when to route; graceful shutdown
(\`server.shutdown=graceful\`) lets in-flight requests finish during a deploy.`,
    mcqs: [
      mcq('You want to test that `POST /api/orders` returns 400 with field errors for invalid input, quickly and without a database. Which test setup fits best?', [
        ['@SpringBootTest with a random port and a real MySQL', false],
        ['@DataJpaTest with the controller autowired into it', false],
        ['@WebMvcTest on the controller, the service as a mock', true],
        ['A plain JUnit test that calls the controller method', false],
      ], '@WebMvcTest loads only the MVC slice — controller, validation, advice, Jackson — and MockMvc exercises real request handling. A direct method call skips validation and status mapping; the other two drag in the database.'),
      mcq('`order-service` calls `inventory-service` over HTTP with no timeout. Inventory starts taking 30 s per response. Within minutes, `order-service` also stops answering, even its health check. What happened, and what prevents it?', [
        ['Inventory exhausted the shared database pool; add indexes', false],
        ['Waiting calls used up every thread; add timeouts and a breaker', true],
        ['The JVM ran out of heap; give order-service more memory', false],
        ['Kafka lag built up; add partitions to the order topic', false],
      ], 'Each request thread blocked on the slow call until the pool was empty — a cascading failure. A read timeout bounds each wait, and a circuit breaker stops calling the failing service and fails fast.'),
      mcq('`order-service` saves an order in MySQL, commits, then publishes `OrderPlaced` to Kafka. The pod is killed between the commit and the publish. What is the standard fix?', [
        ['Publish to Kafka first and save the order to MySQL after', false],
        ['Wrap both steps in one @Transactional method in the service', false],
        ['Write the event to an outbox table in the same transaction', true],
        ['Retry the publish three times in a finally block afterwards', false],
      ], 'The outbox row commits atomically with the order, and a relay publishes it later, so the event cannot be lost. @Transactional does not cover Kafka, reversing the order risks an event with no order, and a killed pod runs no finally.'),
    ],
    checkpoint: [
      mcq('A repository uses a MySQL-specific native query with `JSON_EXTRACT`. Its `@DataJpaTest` fails with a syntax error, though the app works against MySQL. What is the right fix?', [
        ['Rewrite the query in plain JPQL so that H2 can parse it', false],
        ['Mark the test @Disabled and rely on manual testing in staging', false],
        ['Use a real MySQL via Testcontainers and stop the DB swap', true],
        ['Change the slice to @SpringBootTest, which loads MySQL itself', false],
      ], '@DataJpaTest swaps in an embedded database by default, which does not speak MySQL\'s JSON functions. Testcontainers with @AutoConfigureTestDatabase(replace = NONE) runs the same query on real MySQL.'),
      mcq('A four-developer startup with one product and about 2,000 users proposes splitting its Spring Boot app into eight microservices "to scale". What is the strongest response?', [
        ['Agree, since each service can then scale on its own', false],
        ['Agree, but put all eight services on one shared database', false],
        ['Keep a modular monolith; split when teams or load require', true],
        ['Rewrite it as serverless functions instead of services', false],
      ], 'At this size microservices add network failure, distributed data and operational cost with no team or load problem to solve. Clear module boundaries keep a later split possible; a shared database would remove the main benefit anyway.'),
      mcq('A request fails after passing through the gateway, `order-service` and `payment-service`, each writing its own logs. How do you find every log line for that one request?', [
        ['Search all three services by the timestamp of the failure', false],
        ['Propagate a trace id and log it on every line via the MDC', true],
        ['Raise all three services to DEBUG and replay the request', false],
        ['Log the full request body in every service it passes through', false],
      ], 'A trace id carried in the traceparent header (Micrometer Tracing) and put into the MDC lets one search return the whole path. Timestamps collide under load, and logging bodies risks leaking personal data.'),
    ],
  },

  /* ── RAPID_FIRE ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_SPRING_RAPID_FIRE',
    notes: `A screening call: thirty questions, one line each, about ten seconds per answer. Say the line,
stop, and let them ask for more. Hesitating on these costs more than a slightly imperfect answer.

**Spring Core**

1. *Default bean scope?* — Singleton, one per application context.
2. *Is a singleton bean thread-safe?* — Only if it is stateless; Spring adds no locking.
3. *Preferred injection type?* — Constructor: final fields, testable, no half-built objects.
4. *Is @Autowired needed on a single constructor?* — No, since Spring 4.3.
5. *@Component vs @Bean?* — @Component on my class for scanning; @Bean on a factory method, for classes I don't own.
6. *What runs first: @PostConstruct or afterPropertiesSet?* — @PostConstruct.
7. *When are AOP proxies created?* — In BeanPostProcessor after-initialisation, after the init callbacks.
8. *Destroy callbacks on a prototype bean?* — Never called; the container does not track prototypes.
9. *Two beans of one type — how to pick?* — @Primary, @Qualifier, or inject a List/Map of all.
10. *Circular references in Boot 2.6+?* — Prohibited by default; startup fails.

**Spring Boot**

11. *@SpringBootApplication is?* — @SpringBootConfiguration + @EnableAutoConfiguration + @ComponentScan.
12. *Where does Boot 3 list auto-configurations?* — META-INF/spring/…AutoConfiguration.imports.
13. *How does Boot back off for your bean?* — @ConditionalOnMissingBean.
14. *See why a config did not apply?* — --debug condition evaluation report, or /actuator/conditions.
15. *Env var for spring.datasource.url?* — SPRING_DATASOURCE_URL (relaxed binding).
16. *Which wins: env var or application-prod.yml?* — The environment variable.
17. *Actuator endpoints exposed over HTTP by default?* — Only health.
18. *Default embedded server?* — Tomcat.

**REST**

19. *Status for a successful create?* — 201 with a Location header.
20. *401 vs 403?* — 401 not authenticated; 403 authenticated but not allowed.
21. *Is PUT idempotent? PATCH?* — PUT yes; PATCH only if the patch itself is.
22. *Make a payment POST safe to retry?* — Idempotency-Key header, stored with the result.
23. *Standard error body in Spring 6?* — ProblemDetail (RFC 9457).

**JPA and transactions**

24. *Default fetch for @ManyToOne? @OneToMany?* — EAGER; LAZY.
25. *Fix N+1?* — join fetch, @EntityGraph, batch fetch size, or a DTO projection.
26. *First-level cache scope?* — The persistence context, roughly one transaction.
27. *Default rollback rule?* — Unchecked exceptions and Errors; checked ones commit.
28. *Why does @Transactional on a method called via this not work?* — Self-invocation bypasses the proxy.
29. *Optimistic locking in JPA?* — A @Version column; a stale update throws.

**Security and production**

30. *Is a JWT encrypted?* — No, signed; anyone can read the payload.
31. *When is CSRF needed?* — When the browser sends credentials automatically, i.e. cookies.
32. *How do you store passwords?* — BCrypt (salted, adaptive), never reversible encryption.
33. *Stop one slow service sinking others?* — Timeouts, circuit breaker, bulkhead.`,
    mcqs: [
      mcq('In a screening call you are asked which annotation lets Boot\'s `DataSource` step aside when you define your own. Which one?', [
        ['@ConditionalOnMissingBean', true],
        ['@ConditionalOnProperty', false],
        ['@ConditionalOnClass', false],
        ['@Primary', false],
      ], '@ConditionalOnMissingBean registers Boot\'s bean only when no bean of that type exists yet, and auto-configuration runs after yours, so yours wins.'),
      mcq('Quick one: an `@Entity` field is `@OneToMany List<Review> reviews` with no fetch attribute. How is it fetched?', [
        ['Eagerly, with a join, whenever the entity is loaded', false],
        ['Lazily, only when the collection is first accessed', true],
        ['Never, unless you query the reviews table yourself', false],
      ], 'To-many associations default to LAZY in JPA; to-one associations (@ManyToOne, @OneToOne) default to EAGER.'),
      mcq('Rapid fire: a Spring Boot 3 app sets `SPRING_JPA_SHOW_SQL=true` as an environment variable. Which property does that set?', [
        ['spring.jpa.show.sql', false],
        ['spring.jpa.show-sql', true],
        ['SPRING.JPA.SHOW_SQL', false],
        ['jpa.spring.show_sql', false],
      ], 'Relaxed binding maps an upper-case, underscore-separated environment variable onto the canonical dotted, kebab-case property name, so SPRING_JPA_SHOW_SQL sets spring.jpa.show-sql.'),
      mcq('One line: which HTTP status should an endpoint return when a `@Version` check fails on update?', [
        ['400 Bad Request', false],
        ['404 Not Found', false],
        ['409 Conflict', true],
        ['500 Internal Server Error', false],
      ], 'The request is valid and the resource exists; it clashes with the resource\'s current state. 409 tells the client to reload and retry, and 500 would wrongly report a server bug.'),
      mcq('Screening question: which part of a JWT can a client read without the signing key?', [
        ['None of it, the key is needed to read any part', false],
        ['Only the header, as the payload is encrypted', false],
        ['The header and payload, base64url-encoded', true],
      ], 'Header and payload are only base64url-encoded, not encrypted; the key is needed to create or verify the signature, not to read the claims. So nothing secret belongs in the payload.'),
      mcq('Fast: in Spring Boot 3.4+, which annotation replaces `@MockBean` for putting a Mockito mock into the test context?', [
        ['@MockitoBean', true],
        ['@InjectMocks', false],
        ['@TestBean', false],
        ['@SpyBean', false],
      ], 'Spring Framework 6.2 added @MockitoBean (and @MockitoSpyBean), and Boot 3.4 deprecated @MockBean in its favour. @InjectMocks is plain Mockito with no Spring context.'),
    ],
  },

  /* ── MOCK ────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_SPRING_MOCK',
    notes: `**Format.** A 35-minute technical round two with a backend engineer, focused on Spring. Do it with a
friend reading this script, or record yourself answering aloud. The interviewer scores each answer
strong, OK or weak, using the signals below.

## Opening (3 minutes)

"Tell me about the backend of your capstone — just the shape: what frameworks, what database, how
the frontend talks to it."

- **Strong:** 60 seconds, a clear chain — React → REST API on Spring Boot 3 → service layer →
  Spring Data JPA → MySQL, JWT auth, deployed in Docker; names one decision and why.
- **Weak:** lists every technology on the resume without structure.

## Q1. Dependency injection (4 minutes)

"Why constructor injection? What scope is your \`OrderService\`, and could it hold the current user
in a field?"

- **Follow-up:** "You need a new \`PdfBuilder\` per call inside that singleton. How?"
- **Strong:** singleton, must be stateless, explains the race, answers \`ObjectProvider\`/\`@Lookup\`.
- **OK:** knows singleton is the default but not why field state is dangerous.
- **Weak:** "Spring makes beans thread-safe."

## Q2. Auto-configuration (4 minutes)

"You added \`spring-boot-starter-data-jpa\` and suddenly the app won't start: 'Failed to configure a
DataSource'. Why, and what decided that?"

- **Strong:** the starter put JPA on the classpath, \`DataSourceAutoConfiguration\` matched its
  \`@ConditionalOnClass\` and needs a URL; fix with properties or exclude it; mentions \`--debug\`.
- **Weak:** "Spring needs a database," with no mechanism.

## Q3. REST design (4 minutes)

"Design the endpoints to cancel an order and to change its delivery address. Status codes?"

- **Follow-up:** "The client retries the cancel after a timeout — any problem?"
- **Strong:** \`POST /orders/{id}/cancellation\` or \`PATCH\` with status; \`PUT\` the address;
  404/409 cases; cancel is naturally idempotent if a second cancel returns the same result.
- **Weak:** \`GET /cancelOrder?id=5\`.

## Q4. N+1 (5 minutes)

"Your orders page got slow after we added the customer name column. What do you check first?"

- **Strong:** turns on SQL logging, counts 1 + N, fixes with join fetch / entity graph / projection,
  mentions the collection + pagination trap.
- **OK:** knows N+1 by name, suggests EAGER.
- **Weak:** "Add an index" or "add caching."

## Q5. Transactions (5 minutes)

Show this on screen:

    @Transactional
    public void transfer(long from, long to, BigDecimal amt) throws InsufficientFundsException {
        debit(from, amt);
        credit(to, amt);           // throws InsufficientFundsException (checked)
    }

"Is the debit rolled back?"

- **Strong:** no — checked exception, default rule commits; fix with \`rollbackFor\`; adds that
  two concurrent transfers need \`@Version\` or a row lock.
- **Weak:** "Yes, @Transactional rolls back on any exception."

## Q6. Security (5 minutes)

"A user reports their account was compromised; they changed their password. Is the attacker out?"

- **Strong:** not if the attacker holds a valid JWT; short access tokens + refresh revocation, or a
  token version checked by the filter; explains the stateless trade-off.
- **Follow-up:** "Your token is in an httpOnly cookie now — what else must you turn on?" → CSRF.
- **Weak:** "Tokens are signed, so they're safe."

## Q7. Whiteboard task (6 minutes)

"Write the repository method and service code that reserve stock for an order so two buyers cannot
take the last unit." Expected sketch:

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Stock s where s.productId = :id")
    Stock lockStock(@Param("id") long id);

    @Transactional
    public void reserve(long productId, int qty) {
        Stock s = stockRepo.lockStock(productId);          // SELECT ... FOR UPDATE
        if (s.getAvailable() < qty) throw new OutOfStockException(productId);
        s.setAvailable(s.getAvailable() - qty);            // dirty checking writes it
    }

- **Strong:** locks or uses \`@Version\` with a retry, explains the choice (hot row → pessimistic),
  keeps the check and the write in one transaction; or a single conditional UPDATE
  (\`... set available = available - :q where id = :id and available >= :q\`) and checks the row count.
- **Weak:** reads, checks and saves with no lock or version.

## Close (2 minutes)

"Any questions for me?" — ask about how they test, deploy, or handle on-call. Never "no".

**Scoring.** Five or more strong with no weak → clear pass. A weak on transactions or security is
usually a fail for a backend role, because those bugs lose money or data.`,
    mcqs: [
      mcq('In the mock, the candidate answers the transfer question with "`@Transactional` rolls back on any exception, so the debit is undone." How should that answer be scored, and why?', [
        ['Strong, since rolling back the debit is the safe outcome', false],
        ['OK, since checked exceptions roll back only on private methods', false],
        ['Weak: a checked exception leaves the transaction to commit', true],
      ], 'By default Spring rolls back only on RuntimeException and Error. The checked InsufficientFundsException lets the debit commit, so the money disappears; rollbackFor fixes it. Getting this wrong is a serious signal.'),
      mcq('For the "last unit of stock" whiteboard task, which sketch earns a strong score?', [
        ['Read stock, check it, then save it, inside one plain method', false],
        ['Cache the stock count in a singleton field and decrement it', false],
        ['Run the check in a @PostConstruct and reject orders early', false],
        ['Lock the stock row for update, check and decrement in one tx', true],
      ], 'Reading without a lock lets two buyers both see one unit; a singleton field is shared state outside the database and lost on restart. Locking (or @Version, or a conditional UPDATE) in one transaction makes the check-and-write atomic.'),
      mcq('Asked why adding `spring-boot-starter-data-jpa` broke startup with "Failed to configure a DataSource", which answer shows the mechanism the interviewer wants?', [
        ['The starter replaced Tomcat with an embedded database', false],
        ['JPA on the classpath matched a condition needing a URL', true],
        ['Spring Data JPA needs Hibernate 5 but Boot 3 ships 6', false],
        ['Component scanning found no @Repository and gave up', false],
      ], 'The starter puts DataSource and JPA classes on the classpath, so the DataSource auto-configuration\'s @ConditionalOnClass matches; it then needs spring.datasource.url and, with no embedded database present, fails.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_SPRING_CHECKPOINT',
    notes: `Ten questions across the whole Spring round: the container, Boot's auto-configuration, REST
design, JPA and transactions, and security. Each is a scenario or a snippet of the kind an
interviewer puts in front of you. Work out what Spring actually does before you look at the options;
if two seem right, ask which one the framework guarantees.`,
    checkpoint: [
      ck('SPRING_CORE', `Two requests hit this singleton at the same moment, for Asha and Ravi. What can Asha's response contain?

    @RestController
    public class GreetingController {
        private final StringBuilder buf = new StringBuilder();
        @GetMapping("/greet")
        String greet(@RequestParam String name) {
            buf.setLength(0);
            buf.append("Hello, ").append(name);
            return buf.toString();
        }
    }`, [
        ['Always "Hello, Asha", as each request gets its own controller', false],
        ['Always "Hello, Asha", as StringBuilder is synchronized', false],
        ['Nothing; Spring rejects a controller with a mutable field', false],
        ['"Hello, Ravi" or a mixed string, as both threads share buf', true],
      ], 'The controller is a singleton and buf is one shared object; the two threads interleave setLength and append. StringBuilder is not synchronized (StringBuffer is), and Spring does not reject mutable fields.'),
      ck('SPRING_CORE', 'A bean\'s `@PostConstruct` method calls its own `@Transactional` method `warmCache()`. No transaction is opened. Which reason is correct?', [
        ['It is a call on this, before the proxy is even created', true],
        ['@PostConstruct methods always run with transactions off', false],
        ['warmCache() must be declared final for the proxy to work', false],
        ['Transactions need the web request thread, which isn\'t there', false],
      ], 'The call goes through this, not a proxy, and the proxy is created only in the post-processing step after the init callbacks. A final method could not even be overridden by a CGLIB proxy.'),
      ck('SPRING_BOOT', 'You add `spring-boot-starter-data-jpa` to an app with no datasource properties and no embedded database on the classpath. What happens at startup?', [
        ['Boot creates an in-memory H2 database automatically', false],
        ['Startup fails, as the DataSource has no URL to use', true],
        ['The app starts, and JPA stays off until first use', false],
        ['Boot asks for a JDBC URL on the console at startup', false],
      ], 'The starter puts JPA and DataSource classes on the classpath, so their auto-configuration conditions match. Boot can default to an embedded database only if one such as H2 is on the classpath; without it, there is no URL.'),
      ck('SPRING_BOOT', '`DELETE /api/v1/carts/12/items/3` succeeds. A retry of the same request arrives after the item is gone. Which pair of responses is consistent with DELETE being idempotent?', [
        ['200 then 500, because the second delete found nothing to delete', false],
        ['204 then 201, because the retry recreates the deleted item', false],
        ['204 then 409, because a deleted item can never be deleted', false],
        ['204 then 204 or 404; the server state is the same either way', true],
      ], 'Idempotency concerns server state, not the response code: after one or two deletes the item is gone. Returning 204 or 404 on the retry are both accepted conventions; 500 would report a bug that is not there.'),
      ck('SPRING_BOOT', 'An `@ExceptionHandler` in a `@RestControllerAdvice` maps `TokenExpiredException` to 401. The exception is thrown inside your JWT `OncePerRequestFilter`. What does the client get?', [
        ['401 from the advice, as advice catches all exceptions', false],
        ['Not that handler\'s answer; filters run before MVC', true],
        ['A 302 redirect to the Spring Security login page', false],
        ['Exactly 404, as the controller is never reached', false],
      ], 'Filters run before the DispatcherServlet, so MVC exception handling never sees the exception. The filter must write the response itself or delegate to an AuthenticationEntryPoint.'),
      ck('JPA_HIBERNATE', `What does this print, and how many UPDATE statements run at commit?

    @Transactional
    public void rename(long id) {
        Customer c = repo.findById(id).orElseThrow();
        c.setName("Kavya");
        System.out.println("done");
    }   // no call to save()`, [
        ['Prints done; one UPDATE runs at commit by dirty checking', true],
        ['Prints done; no UPDATE runs, since save() was never called', false],
        ['Throws an error, as a managed entity cannot be changed', false],
        ['Prints done; the UPDATE runs at once, before it prints', false],
      ], 'c is managed in the transaction\'s persistence context. At flush (on commit) Hibernate compares it with its snapshot, sees the changed name, and issues one UPDATE without any save() call.'),
      ck('JPA_HIBERNATE', 'An endpoint loads an `Order` in a `@Transactional(readOnly = true)` service method and returns it. With `spring.jpa.open-in-view=false`, Jackson then reads `order.getItems()`, a lazy collection. What happens?', [
        ['Jackson quietly loads the items in a new transaction', false],
        ['The items field is written as an empty JSON array', false],
        ['The readOnly flag makes the items load eagerly at first', false],
        ['LazyInitializationException: the session already closed', true],
      ], 'Without open-in-view the persistence context closes when the service method returns. Touching an uninitialised lazy collection afterwards throws LazyInitializationException; fetch what is needed in the query and return a DTO.'),
      ck('JPA_HIBERNATE', 'A cinema booking service must stop two users booking the same seat in a busy show where clashes are frequent. Which approach fits best?', [
        ['Optimistic locking with @Version and no retry logic', false],
        ['A second-level cache on the Seat entity to read faster', false],
        ['A pessimistic write lock on the seat row in one transaction', true],
        ['@Transactional(readOnly = true) on the booking method', false],
      ], 'With frequent clashes, optimistic locking makes many users fail and retry. SELECT ... FOR UPDATE serialises bookings for that seat row inside the transaction. Caching and readOnly do nothing for concurrent writes.'),
      ck('SPRING_SECURITY', 'Your security config has `.requestMatchers("/api/admin/**").hasRole("ADMIN")` and `.anyRequest().authenticated()`. A request to `/api/admin/users` carries no token at all. What status comes back?', [
        ['401, because no one has been authenticated for it', true],
        ['403, because the caller does not have the ADMIN role', false],
        ['200, as the anonymous user passes the matcher', false],
        ['404, as the path is hidden from unauthenticated users', false],
      ], 'With no credentials the caller is anonymous; ExceptionTranslationFilter sends an anonymous caller who is denied to the authentication entry point, which answers 401. A logged-in user without the role would get 403.'),
      ck('SPRING_SECURITY', 'A user changes their password after a suspected leak. Which design makes every JWT issued before the change stop working at once?', [
        ['Store a token version on the user and check it in the filter', true],
        ['Shorten the expiry of all tokens issued from this point on', false],
        ['Ask the browser to delete the token from localStorage', false],
        ['Switch the signing algorithm from HS256 to RS256 from now', false],
      ], 'Bumping a tokenVersion on the user row and comparing it with the version claim in each token rejects all older tokens immediately, at the cost of a lookup. Shorter expiry and client deletion do not touch tokens already stolen.'),
    ],
  },
];
