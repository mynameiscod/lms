/**
 * Career-track content: the Spring container (JT_SPRING_CORE), for Java Full Stack + AI and Java
 * Backend Engineer.
 *
 * This is the Spring Framework 6 core that Spring Boot 3 is built on: the container, dependency
 * injection, bean scopes and lifecycle, configuration, the DispatcherServlet and proxies. Spring
 * Boot's own REST, Data JPA and Security come in a later topic; the examples here use Boot only as
 * the usual way an application starts (`@SpringBootApplication`, `application.properties`).
 *
 * The questions are about what the container does with a specific piece of code, because that is
 * how Spring is examined in an interview: "which bean is injected?", "why is this null?", "why did
 * the transaction not roll back?".
 *
 * The topic is single-skill (SPRING_CORE), so no question names a skillKey.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_SPRING_CORE_BUNDLES: PilotBundle[] = [
  /* ── WHY_SPRING ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_SPRING_CORE_WHY_SPRING',
    notes: `Every non-trivial Java application is a graph of objects: a controller needs a service, the
service needs a repository and a mail sender, the repository needs a \`DataSource\`. Somebody has
to create those objects, in the right order, and hand each one what it needs. Spring's core is a
**container** that does exactly that job.

## Wiring by hand

    public class Main {
        public static void main(String[] args) {
            DataSource ds = new HikariDataSource(config());
            OrderRepository repo = new JdbcOrderRepository(ds);
            MailSender mail = new SmtpMailSender("smtp.example.com", 587);
            OrderService service = new OrderService(repo, mail);
            OrderController controller = new OrderController(service);
            // ... and 200 more lines like this as the app grows
        }
    }

This works for five classes. At fifty it breaks down: every new dependency means editing the
wiring code, one object must be shared but someone calls \`new\` twice, a test wants a fake
\`MailSender\` but \`OrderService\` creates its own, and nobody closes the connection pool on shutdown.

## Wiring by the container

    @Repository
    public class JdbcOrderRepository implements OrderRepository {
        public JdbcOrderRepository(DataSource ds) { ... }
    }

    @Service
    public class OrderService {
        private final OrderRepository repo;
        private final MailSender mail;
        public OrderService(OrderRepository repo, MailSender mail) {
            this.repo = repo;
            this.mail = mail;
        }
    }

    @SpringBootApplication
    public class ShopApplication {
        public static void main(String[] args) {
            SpringApplication.run(ShopApplication.class, args);
        }
    }

The classes only **declare** what they need. At startup Spring scans the packages, finds the
annotated classes, works out the dependency graph from the constructors, creates each object once
(a **bean**), injects it wherever it is needed, and closes everything in reverse order on shutdown.
The object graph lives in the \`ApplicationContext\`.

## What you get beyond \`new\`

- **One place that decides the implementation.** Swap \`SmtpMailSender\` for a fake in tests or for
  an SES sender in production without touching \`OrderService\`.
- **Lifecycle.** Init and destroy hooks run at the right time.
- **Cross-cutting behaviour.** Because the container hands out the objects, it can hand out a
  *proxy* that adds transactions, security or caching around your method — the basis of
  \`@Transactional\`.
- **Configuration.** Values come from properties files and environment variables, switched by profile.

## Common mistakes

- Thinking Spring is "a web framework". The container is the core; web, data and security are
  modules built on it.
- Calling \`new OrderService(...)\` yourself inside a Spring app. That object is not a bean: nothing
  is injected into it and no proxy wraps it.
- Treating Spring Boot and Spring as rivals. Boot is Spring plus auto-configuration and an embedded
  server; the container underneath is the same.`,
    mcqs: [
      mcq('In a Spring application, what is a "bean"?', [
        ['Any Java class that has a no-argument constructor', false],
        ['An object created and managed by the Spring container', true],
        ['A class annotated with @Entity and mapped to a table', false],
        ['A serialisable JavaBean with getters and setters only', false],
      ], 'A bean is simply an object whose creation, wiring and lifecycle the ApplicationContext manages. Constructors, getters or @Entity have nothing to do with it; @Entity objects are in fact usually NOT beans.'),
      mcq('A test wants OrderService to use a fake MailSender, but OrderService\'s constructor does `this.mail = new SmtpMailSender()`. Why is that the core problem Spring\'s container addresses?', [
        ['The class chooses its own collaborator, so nobody can supply a different one', true],
        ['SmtpMailSender is not thread-safe, so it must never be created with new', false],
        ['Constructors are not allowed to create objects when Spring is on the classpath', false],
      ], 'When a class creates its own dependency, the choice is hard-coded. Declaring the dependency as a constructor parameter lets the container — or a test — decide which implementation to pass in.'),
      mcq('How does Spring Boot relate to the Spring Framework container?', [
        ['Boot replaces the container with a lighter one of its own design', false],
        ['Boot runs on the same container and adds auto-configuration', true],
        ['Boot is only a build plugin and has no runtime part at all', false],
      ], 'Spring Boot starts an ordinary Spring ApplicationContext; it adds auto-configured beans, sensible defaults and an embedded server, but beans, injection and proxies are plain Spring Framework.'),
    ],
    checkpoint: [
      mcq('Inside a @Service method a developer writes `ReportService rs = new ReportService(null);` even though ReportService is also a @Service bean. What does the developer actually have?', [
        ['The same singleton bean the container created at startup', false],
        ['A plain object outside the container, with nothing injected or proxied', true],
        ['A second bean that Spring registers automatically in the context for later reuse', false],
      ], 'The container only manages objects it creates. Calling new gives an ordinary object: no dependencies are injected, no @Transactional proxy wraps it, and Spring does not know it exists.'),
      mcq('Which object holds the beans of a running Spring application and lets you look one up?', [
        ['The ApplicationContext', true],
        ['The DispatcherServlet', false],
        ['The ClassLoader of the main class', false],
        ['The JVM system properties map', false],
      ], 'The ApplicationContext is the container: it creates beans, resolves dependencies and answers getBean(...). The DispatcherServlet is a web component that itself lives in the context.'),
      mcq('Why can Spring add transactions around a service method without that method containing any transaction code?', [
        ['The Java compiler rewrites every annotated method at build time', false],
        ['The container hands callers a proxy that wraps the real bean', true],
        ['The JDBC driver reads @Transactional from the call stack', false],
      ], 'Because the container decides what object is injected, it can inject a proxy that begins and commits the transaction and then delegates to your bean. That only works for objects the container hands out.'),
    ],
  },

  /* ── IOC_DI ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_SPRING_CORE_IOC_DI',
    notes: `**Inversion of Control (IoC)** is the principle: your class no longer controls the creation of
its collaborators; something outside does. **Dependency Injection (DI)** is the technique Spring
uses to achieve it: the dependencies are passed in — through the constructor, a setter or a field.

## Constructor injection — the default

    public interface PaymentGateway { Receipt charge(Money amount); }

    @Service
    public class CheckoutService {
        private final PaymentGateway gateway;
        private final OrderRepository orders;

        public CheckoutService(PaymentGateway gateway, OrderRepository orders) {
            this.gateway = gateway;
            this.orders = orders;
        }
    }

Since Spring 4.3, **a class with a single constructor needs no \`@Autowired\`**: Spring uses it.
\`@Autowired\` is only required when there are several constructors and you must say which one.

Why constructor injection is preferred:

- Fields can be \`final\`; the object is never half-built.
- Required dependencies are obvious and the object fails at startup if one is missing.
- A unit test simply calls \`new CheckoutService(fakeGateway, fakeRepo)\` — no Spring needed.
- A constructor with eight parameters is a visible signal the class does too much.

## Field injection — why it is discouraged

    @Service
    public class CheckoutService {
        @Autowired private PaymentGateway gateway;   // works, but...
    }

The field cannot be \`final\`, the dependency is hidden from the class's API, and a test must use
reflection or start a Spring context to set it. \`new CheckoutService()\` leaves \`gateway\` null.

Setter injection (\`@Autowired\` on a setter) is acceptable for genuinely **optional** dependencies.

## Depend on interfaces

\`CheckoutService\` depends on \`PaymentGateway\`, not \`StripeGateway\`. Spring finds the one bean
implementing it. Production gets \`StripeGateway\`; a test gets \`FakeGateway\`.

## Stereotype annotations

\`@Component\` marks a class for scanning. \`@Service\`, \`@Repository\` and \`@Controller\` are
specialisations of it: functionally the same for injection, but they document the layer, and
\`@Repository\` additionally gets persistence exception translation into Spring's
\`DataAccessException\` hierarchy.

## Two beans of the same type

If both \`StripeGateway\` and \`PaypalGateway\` are beans, injecting \`PaymentGateway\` fails with
\`NoUniqueBeanDefinitionException\`. Fix it with:

    @Primary @Component class StripeGateway implements PaymentGateway { ... }   // the default

    public RefundService(@Qualifier("paypalGateway") PaymentGateway gateway) { ... }  // explicit

\`@Qualifier\` wins over \`@Primary\` at the injection point that names it. The default bean name is
the class name with a lower-case first letter.

## Common mistakes

- Injecting the concrete class everywhere, so nothing can be swapped.
- Adding \`@Autowired\` to every constructor "to be safe" — harmless but noise.
- Using field injection and then wondering why a hand-made object in a test is full of nulls.`,
    workedExample: `**Problem.** NotificationService sends an SMS through \`SmsClient\`. Make it testable.

Before:

    @Service
    public class NotificationService {
        private final SmsClient sms = new TwilioSmsClient("key");
        public void notify(String phone, String text) { sms.send(phone, text); }
    }

A test would send real SMS messages. Step one: make \`SmsClient\` an interface and \`TwilioSmsClient\`
a \`@Component\` implementing it. Step two: take the dependency through the constructor.

    @Service
    public class NotificationService {
        private final SmsClient sms;
        public NotificationService(SmsClient sms) { this.sms = sms; }   // no @Autowired needed
        public void notify(String phone, String text) { sms.send(phone, text); }
    }

Test, with no Spring at all:

    RecordingSms fake = new RecordingSms();
    new NotificationService(fake).notify("+91...", "hi");
    assertEquals(1, fake.sent.size());

The class stopped choosing its collaborator — that is the inversion — and the constructor is how it
is now handed one.`,
    mcqs: [
      mcq('A @Service class has exactly one constructor, taking a UserRepository, and no @Autowired anywhere. What does Spring 6 do?', [
        ['Fails at startup because @Autowired is missing on it', false],
        ['Uses that constructor and injects the repository', true],
        ['Creates the bean and leaves the repository null', false],
      ], 'Since Spring 4.3 a single constructor is used for injection automatically. @Autowired is only needed to choose among several constructors.'),
      mcq('Why is `@Autowired private PaymentGateway gateway;` discouraged compared with a constructor parameter?', [
        ['Field injection is slower because it uses reflection on every method call', false],
        ['The field cannot be final and a plain `new` in a test leaves it null', true],
        ['Spring 6 no longer supports @Autowired on fields of any kind at all', false],
      ], 'Field injection still works in Spring 6 and the reflection happens once at startup. The real costs are that the dependency is hidden, cannot be final, and must be set by reflection or a container in tests.'),
      mcq('Two @Component classes, EmailNotifier and SmsNotifier, implement Notifier. A constructor asks for one Notifier and neither class has @Primary. What happens at startup?', [
        ['Spring picks the bean whose class name sorts first', false],
        ['NoUniqueBeanDefinitionException: two candidates match', true],
        ['Spring injects a composite that calls both notifiers in turn', false],
      ], 'With two candidates and no @Primary, @Qualifier or matching parameter name, Spring refuses to guess and fails with NoUniqueBeanDefinitionException.'),
    ],
    checkpoint: [
      mcq('StripeGateway is marked @Primary. RefundService\'s constructor declares `@Qualifier("paypalGateway") PaymentGateway g`. Which bean does RefundService receive?', [
        ['stripeGateway, because @Primary always takes precedence over qualifiers', false],
        ['paypalGateway, because the qualifier names it explicitly', true],
        ['Neither; startup fails because the two hints conflict', false],
      ], '@Primary sets the default for injection points that do not say otherwise. A @Qualifier at the injection point is more specific and wins there.'),
      mcq('Which statement best separates IoC from DI?', [
        ['IoC is the principle of giving up control of creating collaborators; DI is one way to implement it', true],
        ['IoC is Spring\'s XML configuration; DI is its newer annotation-based configuration style', false],
        ['IoC applies only to web controllers; DI applies to services, repositories and other beans in the app', false],
      ], 'Inversion of Control is the general idea that something outside the class creates and supplies its collaborators. Dependency Injection — passing them in through a constructor or setter — is how Spring realises it.'),
      mcq('Besides marking a class for scanning, what does @Repository add that @Component does not?', [
        ['It opens a database transaction around each public method it declares', false],
        ['It translates persistence exceptions to DataAccessException', true],
        ['It makes the bean prototype-scoped by default', false],
      ], '@Repository is eligible for PersistenceExceptionTranslationPostProcessor, which converts vendor exceptions into Spring\'s DataAccessException hierarchy. It does not start transactions or change scope.'),
    ],
  },

  /* ── BEANS_SCOPES ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_SPRING_CORE_BEANS_SCOPES',
    notes: `A bean's **scope** says how many instances the container creates and how long each lives.

## Singleton — the default

One instance per \`ApplicationContext\`, created at startup (eagerly) and shared by every class that
injects it. Almost all services, repositories and controllers are singletons — so they must be
**stateless** or thread-safe, because every request thread uses the same object.

    @Service
    public class PriceService {
        private BigDecimal lastPrice;        // BUG: shared across all request threads
    }

Note this is not the GoF singleton: you could still \`new\` the class; Spring just makes one.

## Prototype

    @Component
    @Scope("prototype")
    public class ReportBuilder { private final List<String> lines = new ArrayList<>(); ... }

A **new instance every time** the bean is requested from the container. Spring creates and injects
it, then forgets it: **destroy callbacks are not called for prototypes**.

## Web scopes

\`request\` (one per HTTP request), \`session\` (one per HTTP session) and \`application\`. They exist
only in a web-aware context.

## The prototype-into-singleton gotcha

    @Service
    public class ExportService {
        private final ReportBuilder builder;          // prototype
        public ExportService(ReportBuilder builder) { this.builder = builder; }
    }

The singleton is built **once**, so it is injected **once** — every export reuses the same
"prototype" instance, and its list keeps growing. Fixes: inject \`ObjectProvider<ReportBuilder>\`
and call \`getObject()\` each time, use a \`@Lookup\` method, or give the prototype a scoped proxy
(\`@Scope(value = "prototype", proxyMode = ScopedProxyMode.TARGET_CLASS)\`). A request-scoped
bean injected into a singleton needs the same proxy; \`@RequestScope\` sets it up by default.

## The lifecycle

1. Instantiate (constructor, with constructor injection).
2. Populate setter/field dependencies.
3. Aware callbacks, then \`BeanPostProcessor\` before-init.
4. **\`@PostConstruct\`** method — dependencies are ready; warm caches, validate config.
5. \`BeanPostProcessor\` after-init — **this is where proxies (AOP, @Transactional) are created**.
6. Bean in use.
7. On context close, **\`@PreDestroy\`** — release resources (singletons only).

    @Component
    public class RateCache {
        @PostConstruct void load()   { ... }   // jakarta.annotation.PostConstruct in Spring 6
        @PreDestroy   void flush()   { ... }
    }

In Spring 6 / Boot 3 these annotations come from \`jakarta.annotation\`, not \`javax.annotation\`.
\`@Bean(initMethod = "start", destroyMethod = "stop")\` does the same for classes you cannot annotate.

## Common mistakes

- Storing per-request data in a field of a singleton.
- Using dependencies inside the constructor of a field-injected bean (they are still null) —
  use \`@PostConstruct\` or constructor injection.
- Expecting \`@PreDestroy\` on a prototype to run.`,
    mcqs: [
      mcq('A singleton @Service stores the current user\'s cart in an instance field. What goes wrong under load?', [
        ['Each request gets its own copy, so memory grows without limit', false],
        ['Concurrent requests share one instance and overwrite each other\'s cart', true],
        ['Spring detects the mutable field and makes the bean prototype-scoped instead', false],
      ], 'A singleton is one shared object used by every request thread. Mutable per-user state in its fields leaks between users and races; it belongs in parameters, the request or a store.'),
      mcq('ReportBuilder is @Scope("prototype") and is injected through the constructor of a singleton ExportService. How many ReportBuilder instances does ExportService ever use?', [
        ['One, created when ExportService itself was built', true],
        ['A new one on every call to an ExportService method', false],
        ['One per HTTP request handled by the application', false],
      ], 'Injection happens once, when the singleton is created, so it holds one prototype instance forever. To get a fresh one per use, ask the container each time via ObjectProvider or @Lookup.'),
      mcq('When does a method annotated with @PostConstruct run?', [
        ['Before the constructor, so that fields can be prepared', false],
        ['After construction and injection, before the bean is used', true],
        ['Only when the first HTTP request reaches the running application', false],
      ], '@PostConstruct runs once the bean has been instantiated and all its dependencies injected, and before it is handed out — the right place for initialisation that needs those dependencies.'),
    ],
    checkpoint: [
      mcq('A prototype-scoped bean declares a @PreDestroy method that closes a file. When does Spring call it?', [
        ['When the application context is closed', false],
        ['Never; Spring does not manage prototype destruction', true],
        ['When the garbage collector later reclaims the instance', false],
      ], 'For prototypes, the container creates and configures the instance and then hands over responsibility. Destruction callbacks are not invoked; the client must clean up.'),
      mcq('At which lifecycle stage does Spring normally swap a bean for its @Transactional proxy?', [
        ['In a BeanPostProcessor after initialisation', true],
        ['Inside the bean\'s own constructor call', false],
        ['When the JVM first loads the bean\'s class', false],
      ], 'Proxies are created by a BeanPostProcessor (the auto-proxy creator) in postProcessAfterInitialization, after @PostConstruct, and the proxy is what gets registered and injected.'),
      mcq('A Boot 3 project imports `javax.annotation.PostConstruct` and the method never runs. What is the likely cause?', [
        ['Spring 6 moved to Jakarta EE, so the annotation must come from jakarta.annotation', true],
        ['@PostConstruct only works on beans whose scope has been declared as prototype', false],
        ['The method must be declared public static void for the container to be able to call it', false],
      ], 'Spring Framework 6 is built on Jakarta EE 9+, so lifecycle annotations come from jakarta.annotation. The old javax one is not recognised.'),
    ],
  },

  /* ── CONFIGURATION ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_SPRING_CORE_CONFIGURATION',
    notes: `Spring needs to know which beans exist. There are two ways to tell it, and you will use both.

## Component scanning

\`@SpringBootApplication\` includes \`@ComponentScan\`, which scans **the package of the
application class and its sub-packages** for \`@Component\` (and \`@Service\`, \`@Repository\`,
\`@Controller\`, \`@Configuration\`):

    com.shop.ShopApplication          // scans com.shop.**
    com.shop.order.OrderService       // found
    com.billing.InvoiceService        // NOT found — different root package

Keep the main class in the root package. A class outside it is simply never registered, and the
first injection point that needs it fails with \`NoSuchBeanDefinitionException\`.

## @Configuration and @Bean

Use \`@Bean\` for objects you cannot annotate — library classes — or that need construction logic:

    @Configuration
    public class HttpConfig {
        @Value("\${payments.base-url}")
        private String baseUrl;

        @Bean
        public RestClient paymentsClient() {
            return RestClient.builder().baseUrl(baseUrl).build();
        }

        @Bean
        public PaymentsApi paymentsApi() {
            return new PaymentsApi(paymentsClient());   // see below
        }
    }

The bean's name is the method name. In a \`@Configuration\` class (full mode) the class itself is
CGLIB-proxied, so calling another \`@Bean\` method returns the **existing singleton** rather than a
new object. Prefer declaring the dependency as a method parameter — \`paymentsApi(RestClient
paymentsClient)\` — which is clearer and also works in \`proxyBeanMethods = false\` mode.

**@Component vs @Bean:** \`@Component\` goes on your own class and is discovered by scanning;
\`@Bean\` goes on a factory method in a \`@Configuration\` class and gives you full control over
construction.

## Properties and @Value

\`application.properties\`:

    app.name=ShopFront
    app.max-cart-items=50

    @Service
    public class CartService {
        public CartService(@Value("\${app.max-cart-items}") int maxItems,
                           @Value("\${app.currency:INR}") String currency) { ... }
    }

\`\${...}\` is a property placeholder; after the colon is a default. Without a default, a missing
key fails startup with "Could not resolve placeholder". Environment variables override the file
(\`APP_MAX_CART_ITEMS=80\`). For a group of settings, \`@ConfigurationProperties(prefix = "app")\`
binds them to a typed class.

## Profiles

    @Configuration
    @Profile("dev")
    class DevMailConfig { @Bean MailSender mail() { return new ConsoleMailSender(); } }

    @Configuration
    @Profile("prod")
    class ProdMailConfig { @Bean MailSender mail() { return new SmtpMailSender(...); } }

Activate with \`spring.profiles.active=prod\` (property, \`--spring.profiles.active=prod\` on the
command line, or \`SPRING_PROFILES_ACTIVE\`). \`application-prod.properties\` is loaded on top of
\`application.properties\` when \`prod\` is active. With no active profile, Spring uses \`default\`
— and neither bean above exists.

## Common mistakes

- A config class outside the scanned package.
- Writing \`@Value("app.name")\` without \`\${}\` — that injects the literal text "app.name".
- Forgetting to activate a profile, so a \`@Profile\` bean is silently missing.`,
    mcqs: [
      mcq('The main class is com.shop.ShopApplication. A @Service lives in com.payments.PayService. What happens when OrderService asks for PayService?', [
        ['It is injected, since all @Service classes on the classpath are found', false],
        ['Startup fails with NoSuchBeanDefinitionException for PayService', true],
        ['OrderService starts with a null PayService and fails later on', false],
      ], 'Component scanning starts at the package of the @SpringBootApplication class (com.shop) and covers only its sub-packages. com.payments is never scanned, so no PayService bean exists to inject.'),
      mcq('What does `@Value("${app.region:ap-south-1}") String region` inject when application.properties has no app.region?', [
        ['The text "ap-south-1", the default after the colon', true],
        ['null, since the property does not exist in the file', false],
        ['The literal text "${app.region:ap-south-1}"', false],
      ], 'In a placeholder, the part after the colon is the default value used when the key cannot be resolved from any property source.'),
      mcq('When is @Bean the right choice instead of putting @Component on a class?', [
        ['When the class comes from a library you cannot annotate', true],
        ['When the bean must be a singleton rather than prototype', false],
        ['When the class has more than one constructor parameter', false],
      ], '@Bean methods let you register objects of classes you do not own, or that need construction logic. Scope and constructor arity work the same for both approaches.'),
    ],
    checkpoint: [
      mcq('Two @Configuration classes define a MailSender bean, one with @Profile("dev") and one with @Profile("prod"). The app starts with no profile set. What happens when a service needs MailSender?', [
        ['The dev bean is used, as dev is the implicit default', false],
        ['No MailSender bean exists, so startup fails', true],
        ['Both beans load, causing a uniqueness error', false],
      ], 'With nothing active, only the "default" profile is active. Neither "dev" nor "prod" matches, so neither configuration loads and the dependency cannot be satisfied.'),
      mcq('A field is declared `@Value("app.name") String name;`. What value does it receive?', [
        ['The property value, for example ShopFront', false],
        ['The literal string app.name', true],
        ['null, until the context refreshes', false],
      ], 'Without the ${...} placeholder syntax, @Value treats its argument as a literal (or a SpEL expression with #{...}), so the field receives the text "app.name".'),
      mcq('In a full @Configuration class, bean method a() calls b(), and b() is also a @Bean. What does that call return?', [
        ['A brand-new object every time a() runs', false],
        ['The singleton bean b already in the container', true],
        ['null, because @Bean methods cannot call each other', false],
      ], 'Full-mode @Configuration classes are CGLIB-subclassed so that calls between @Bean methods are intercepted and return the container\'s existing bean, preserving singleton semantics.'),
    ],
  },

  /* ── SPRING_MVC ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_SPRING_CORE_SPRING_MVC',
    notes: `Spring MVC is the web layer built on the container. One servlet, the **DispatcherServlet**,
receives every request and routes it to your code. In Spring Boot it is registered automatically
on the embedded Tomcat.

## The journey of a request

    GET /orders/42  Accept: application/json
      → DispatcherServlet
      → HandlerMapping: which method handles GET /orders/{id}?  → OrderController.get
      → HandlerAdapter: resolve arguments (@PathVariable, @RequestParam, @RequestBody), call it
      → controller returns a value
      → @ResponseBody? HttpMessageConverter (Jackson) writes JSON
        otherwise: a view name → ViewResolver → template (Thymeleaf) renders HTML
      → response

Exceptions thrown along the way go to **HandlerExceptionResolvers**, which is how
\`@ExceptionHandler\` and \`@ControllerAdvice\` work.

## @Controller vs @RestController

    @Controller
    public class PageController {
        @GetMapping("/orders")
        public String list(Model model) {
            model.addAttribute("orders", service.all());
            return "orders/list";          // a VIEW NAME → templates/orders/list.html
        }
    }

    @RestController                         // = @Controller + @ResponseBody on every method
    @RequestMapping("/api/orders")
    public class OrderApi {
        private final OrderService service;
        public OrderApi(OrderService service) { this.service = service; }

        @GetMapping("/{id}")
        public OrderDto get(@PathVariable long id) { return service.find(id); }   // → JSON

        @PostMapping
        public ResponseEntity<OrderDto> create(@RequestBody @Valid NewOrder body) {
            OrderDto saved = service.create(body);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        }
    }

With \`@Controller\`, a returned \`String\` is a view name. With \`@RestController\`, the same
\`String\` is written straight into the response body. Returning an object from a plain
\`@Controller\` method without \`@ResponseBody\` makes Spring look for a view and fail.

## Binding arguments

- \`@PathVariable\` — a segment of the URL template.
- \`@RequestParam\` — a query string or form parameter (\`?page=2\`); required unless
  \`required = false\` or a \`defaultValue\` is given, else a 400.
- \`@RequestBody\` — the body, converted by Jackson from JSON.
- \`@RequestHeader\`, \`HttpServletRequest\`, \`Principal\` — also injectable.

## Controllers are singletons

One controller instance handles all concurrent requests. Keep request data in method parameters,
never in fields.

## Common mistakes

- Using \`@Controller\` for an API and getting "Circular view path" or a 404 template error.
- Two methods mapped to the same path and verb — startup fails with an ambiguous mapping.
- Expecting \`@RequestBody\` to read query parameters.`,
    mcqs: [
      mcq('Which component decides which controller method handles GET /api/orders/7?', [
        ['The HandlerMapping consulted by the DispatcherServlet', true],
        ['The ViewResolver bean configured for the web application', false],
        ['The embedded Tomcat connector on port 8080', false],
      ], 'The DispatcherServlet asks its HandlerMappings — for annotations, RequestMappingHandlerMapping — to match the path and verb to a handler method. ViewResolvers only come in afterwards for HTML views.'),
      mcq('A @Controller (not @RestController) method returns the String "done" with no @ResponseBody. What does Spring do with it?', [
        ['Writes the text done as the response body', false],
        ['Treats done as a view name and resolves a template', true],
        ['Converts it to JSON: the quoted string "done"', false],
      ], 'In a plain @Controller, a String return value is a logical view name handed to the ViewResolver. Only @ResponseBody (implied by @RestController) writes it to the body.'),
      mcq('An endpoint declares `@RequestParam int page` and the client calls it without ?page. What is the result?', [
        ['page silently defaults to 0 because int is a primitive type', false],
        ['A 400 Bad Request for the missing required parameter', true],
        ['The method runs and page is set to null', false],
      ], '@RequestParam is required by default. A missing parameter raises MissingServletRequestParameterException, mapped to 400. Use required = false with Integer, or defaultValue, to make it optional.'),
    ],
    checkpoint: [
      mcq('What exactly does @RestController add to @Controller?', [
        ['@ResponseBody applied to every handler method', true],
        ['Automatic JSON validation of every request body', false],
        ['A new controller instance for each HTTP request', false],
      ], '@RestController is a composed annotation of @Controller and @ResponseBody, so return values are written to the response through message converters instead of being treated as view names.'),
      mcq('An API method returns an OrderDto object from a @RestController. Which component turns it into JSON?', [
        ['An HttpMessageConverter backed by Jackson', true],
        ['The ViewResolver for the json view name', false],
        ['The DispatcherServlet calling toString()', false],
      ], 'For @ResponseBody return values, Spring picks an HttpMessageConverter that matches the Accept header; with Jackson on the classpath, MappingJackson2HttpMessageConverter serialises the object.'),
      mcq('An OrderApi controller keeps `private Long currentOrderId;` set by each request and read later in the same method. Why does this misbehave under concurrent traffic?', [
        ['The controller is a singleton shared by all request threads', true],
        ['Spring resets controller fields to null between each request', false],
        ['Long fields cannot be used in controllers that return JSON', false],
      ], 'Controllers are singleton beans, so a field is shared by every concurrent request; one request\'s value overwrites another\'s. Request data belongs in local variables and parameters.'),
    ],
  },

  /* ── AOP ────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_SPRING_CORE_AOP',
    notes: `Some behaviour cuts across many classes: transactions, security checks, timing, caching.
**Aspect-Oriented Programming** lets you write it once and apply it by rule instead of pasting it
into every method.

## Vocabulary

- **Aspect** — the class holding the cross-cutting code.
- **Advice** — what runs: \`@Before\`, \`@AfterReturning\`, \`@AfterThrowing\`, \`@After\`, \`@Around\`.
- **Pointcut** — which methods it applies to.
- **Join point** — one method execution being advised.

    @Aspect
    @Component
    public class TimingAspect {
        @Around("execution(* com.shop.service..*(..))")
        public Object time(ProceedingJoinPoint pjp) throws Throwable {
            long start = System.nanoTime();
            try {
                return pjp.proceed();                  // call the real method
            } finally {
                log.info("{} took {} ms", pjp.getSignature(), (System.nanoTime() - start) / 1_000_000);
            }
        }
    }

An \`@Around\` advice that forgets \`pjp.proceed()\` silently stops the real method from running.

## Spring AOP is proxy-based

Spring does not rewrite your bytecode. When a bean matches a pointcut, the container injects a
**proxy** in its place. Callers call the proxy; the proxy runs the advice and delegates to the
real object.

- **JDK dynamic proxy** — implements the bean's interfaces; only interface methods are proxied,
  and the proxy is not an instance of the concrete class.
- **CGLIB proxy** — a generated subclass of the class. **Spring Boot defaults to CGLIB**
  (\`spring.aop.proxy-target-class=true\`). A subclass cannot override \`final\` or \`private\`
  methods, so those are never advised.

## How @Transactional works

\`@Transactional\` is just advice applied through that same proxy:

    proxy.placeOrder()  → begin transaction
                         → target.placeOrder()
                         → commit, or roll back on RuntimeException / Error
                           (checked exceptions do NOT roll back unless rollbackFor says so)

## The self-invocation trap

    @Service
    public class OrderService {
        public void placeAll(List<Order> orders) {
            for (Order o : orders) placeOrder(o);      // this.placeOrder — bypasses the proxy
        }
        @Transactional
        public void placeOrder(Order o) { ... }
    }

The call from \`placeAll\` goes through \`this\`, the raw object, not the proxy — so **no
transaction starts**. The same applies to \`@Async\` and \`@Cacheable\`. Fixes: put
\`@Transactional\` on the externally called method, move \`placeOrder\` into another bean, or (rarely)
inject a self-reference.

\`@Transactional\` on a \`private\` method is likewise ignored: the proxy cannot intercept it. In
Spring 6, protected and package-private methods are supported by class-based proxies, but public
is the safe convention.

## Common mistakes

- Expecting an aspect to apply to an object created with \`new\`.
- Catching an exception inside the transactional method, so nothing rolls back.
- Expecting a checked exception to roll back by default.`,
    mcqs: [
      mcq('In OrderService, `placeAll()` calls `this.placeOrder()`, and only placeOrder is @Transactional. A controller calls placeAll. Does a transaction start?', [
        ['Yes, Spring sees the annotation on placeOrder', false],
        ['No, the internal call bypasses the proxy', true],
        ['Yes, but only for the first order in the loop', false],
      ], 'The transaction advice lives in the proxy. placeAll runs on the target object, and calling placeOrder through this never passes through the proxy, so no transaction is begun.'),
      mcq('What happens if an @Around advice never calls `pjp.proceed()`?', [
        ['Spring calls the target method automatically afterwards', false],
        ['The target method is skipped and the advice result is returned', true],
        ['Startup fails because the advice is considered invalid', false],
      ], '@Around fully controls the invocation. Without proceed(), the real method never runs and the caller receives whatever the advice returns — often null.'),
      mcq('Spring Boot proxies a @Service class that implements no interface. Which proxy type does it use?', [
        ['A CGLIB subclass of the service class', true],
        ['A JDK dynamic proxy of java.lang.Object', false],
        ['No proxy; such beans cannot be advised', false],
      ], 'JDK dynamic proxies need interfaces. CGLIB generates a subclass at runtime, and Spring Boot uses CGLIB by default even when interfaces exist.'),
    ],
    checkpoint: [
      mcq('A @Transactional method throws a checked IOException after inserting a row. With default settings, what happens to the insert?', [
        ['It is rolled back, as any exception rolls back', false],
        ['It is committed, as checked exceptions do not roll back', true],
        ['It stays pending until the next transaction commits', false],
      ], 'By default Spring rolls back only on RuntimeException and Error. A checked exception commits unless rollbackFor = IOException.class (or Exception.class) is declared.'),
      mcq('Why does @Transactional on a `private` method have no effect?', [
        ['A proxy cannot intercept a private method call', true],
        ['Private methods always run in auto-commit mode', false],
        ['Spring forbids annotations on private members', false],
      ], 'Proxy-based AOP works by overriding (CGLIB) or implementing (JDK) the method. A private method cannot be overridden, so the proxy never sees the call and no advice runs.'),
      mcq('A bean implementing PaymentGateway is advised with a JDK dynamic proxy. Another class injects the concrete type StripeGateway. What happens?', [
        ['Injection fails: the proxy is not a StripeGateway', true],
        ['Injection succeeds but the advice is lost', false],
        ['Spring injects the raw target behind the proxy', false],
      ], 'A JDK proxy implements only the interfaces, so it is not assignable to the concrete class and Spring reports a type mismatch (BeanNotOfRequiredTypeException). CGLIB proxies, or injecting the interface, avoid this.'),
    ],
  },

  /* ── DEBUGGING ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_SPRING_CORE_DEBUGGING',
    notes: `Most Spring failures happen at **startup**, and the message tells you exactly what is wrong
if you read it from the bottom: the last "Caused by" names the real problem. Each case below is a
fault you will meet; work out the cause before the fix.

## 1. NoSuchBeanDefinitionException

    No qualifying bean of type 'com.billing.TaxCalculator' available:
    expected at least 1 bean which qualifies as autowire candidate.

\`TaxCalculator\` is annotated \`@Service\`, but the app class is \`com.shop.ShopApplication\`.
**Cause:** \`com.billing\` is outside the scanned package tree. **Fix:** move it under \`com.shop\`,
or (if it is a library) register it with a \`@Bean\` or \`@Import\`. Also check the annotation is
really there and that a \`@Profile\` or \`@ConditionalOn...\` is not excluding it.

## 2. NoUniqueBeanDefinitionException

    expected single matching bean but found 2: smsNotifier,emailNotifier

**Cause:** two beans implement the requested interface. **Fix:** \`@Primary\` on the default, or
\`@Qualifier("smsNotifier")\` at the injection point. Do not delete one at random.

## 3. Circular dependency at startup

    The dependencies of some of the beans in the application context form a cycle:
    ┌─────┐
    |  orderService  →  invoiceService  →  orderService
    └─────┘

With constructor injection, neither can be built first. Spring Boot 2.6+ forbids cycles by
default. **Fix:** it is a design smell — extract the shared logic into a third bean both depend
on, or publish an event. \`@Lazy\` on one parameter works but hides the problem.

## 4. The transaction that did not roll back

\`placeOrder\` is \`@Transactional\` and throws, yet the row stays. Check, in order: is it called via
\`this\` from the same class (self-invocation)? Is the method \`private\` or \`final\`? Is the exception
checked (no rollback by default)? Is it caught inside the method? Is the object a bean at all?

## 5. NullPointerException on an injected field

    ReportJob job = new ReportJob();
    job.run();   // NPE: job.repository is null

\`@Autowired\` fields are filled only in objects **the container created**. **Fix:** inject
\`ReportJob\` instead of calling \`new\`; and switch it to constructor injection so the mistake cannot
compile silently.

## 6. The prototype that never refreshes

A \`@Scope("prototype")\` \`Counter\` injected into a singleton keeps counting across requests:
it was injected once. **Fix:** \`ObjectProvider<Counter>\` and \`getObject()\` per use.

## 7. Could not resolve placeholder

    Could not resolve placeholder 'payments.api-key' in value "\${payments.api-key}"

**Cause:** the key is missing from every property source — often defined only in
\`application-prod.properties\` while the dev profile is active, or misspelt (\`api_key\`).
**Fix:** add it, give it a default, or supply the environment variable.

## 8. Wrong active profile

The app sends real emails from a laptop. Logs show \`The following 1 profile is active: "prod"\` —
an \`SPRING_PROFILES_ACTIVE=prod\` left in the shell. Always read that startup line first.`,
    mcqs: [
      mcq('Startup fails: "The dependencies of some of the beans form a cycle: userService → auditService → userService". Both use constructor injection. What is the best fix?', [
        ['Switch both to field injection so the cycle resolves itself', false],
        ['Extract the shared logic into a third bean both can depend on', true],
        ['Set spring.main.allow-circular-references=true everywhere', false],
      ], 'A cycle means two classes depend on each other\'s behaviour — a design problem. Extracting the shared part removes the cycle; field injection or allowing circular references only hides it.'),
      mcq('A scheduled job does `new InvoiceMailer().send(...)` and gets a NullPointerException on its @Autowired MailSender field. Why?', [
        ['MailSender is prototype-scoped, so it was already destroyed', false],
        ['Objects created with new are never injected by the container', true],
        ['@Autowired fields are filled only after the first HTTP request', false],
      ], 'Only beans the container creates receive injection. A new-ed InvoiceMailer is a plain object, so its @Autowired field stays null. Inject InvoiceMailer instead.'),
      mcq('Locally the app fails with "Could not resolve placeholder \'payments.api-key\'", but production starts fine. The key is only in application-prod.properties. What is the cause?', [
        ['application-prod.properties is loaded only when prod is active', true],
        ['Placeholders with hyphens are never resolved in local runs', false],
        ['The key must be duplicated as an @Value default in each class', false],
      ], 'Profile-specific files load only for their active profile. Locally prod is not active, so the key exists in no property source; add it to application.properties, a dev file, or give a default.'),
      mcq('A developer\'s laptop app writes to the production database. Which startup log line should be checked first?', [
        ['"Started ShopApplication in 3.2 seconds"', false],
        ['"The following 1 profile is active: prod"', true],
        ['"Tomcat initialized with port 8080 (http)"', false],
      ], 'Which profile is active decides which configuration and datasource load. A stray SPRING_PROFILES_ACTIVE=prod explains production connections, and Spring logs the active profiles at startup.'),
    ],
  },

  /* ── PRACTICE ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_SPRING_CORE_PRACTICE',
    notes: `Work these without looking things up. Each one is small; the goal is that the container's
behaviour becomes something you predict, not something you discover.

## Exercise 1 — From new to injection

    public class SignupService {
        private final UserRepository repo = new JdbcUserRepository();
        private final Mailer mailer = new SmtpMailer();
    }

Rewrite it for Spring: annotate the implementations, make \`SignupService\` take both through a
single constructor (no \`@Autowired\`), and write a unit test that constructs it with fakes and no
Spring context.

## Exercise 2 — Two implementations

Add \`SesMailer\` beside \`SmtpMailer\`, both implementing \`Mailer\`. Predict the startup error, then
fix it twice: once with \`@Primary\` on \`SmtpMailer\`, once with \`@Qualifier("sesMailer")\` only in
\`SignupService\`. Explain which bean each other class now receives.

## Exercise 3 — Scope experiment

Create a \`@Scope("prototype")\` \`IdGenerator\` with a field set from \`UUID.randomUUID()\` in its
constructor. Inject it into a singleton controller, call the endpoint three times and print the
id. Explain the output, then change the controller to use \`ObjectProvider<IdGenerator>\` and
repeat. Add \`@PostConstruct\` / \`@PreDestroy\` logging and note which ones run, and when.

## Exercise 4 — Configuration and profiles

Define \`app.greeting=Hello\` in \`application.properties\` and \`app.greeting=Hello from prod\` in
\`application-prod.properties\`. Inject it with \`@Value("\${app.greeting}")\`. Run with no profile,
with \`--spring.profiles.active=prod\`, and with the environment variable \`APP_GREETING=Hi\`.
Record the value each time and explain the precedence. Then add \`@Profile("dev")\` to a
\`ConsoleMailer\` \`@Bean\` and confirm it disappears without the dev profile.

## Exercise 5 — Trace a request

For \`@GetMapping("/api/users/{id}")\` in a \`@RestController\`, write out every component the
request passes through, from the DispatcherServlet to the JSON in the response. Then change the
class to \`@Controller\` and describe the new error.

## Exercise 6 — Prove the self-invocation trap

Write a service with \`public void outer()\` calling \`@Transactional public void inner()\`. In
\`inner\`, log \`TransactionSynchronizationManager.isActualTransactionActive()\`. Call \`outer\`
from a controller, then call \`inner\` directly, and compare. Fix it by moving \`inner\` to a
second bean.`,
    mcqs: [
      mcq('After Exercise 1, how does a plain JUnit test create SignupService with fakes?', [
        ['new SignupService(fakeRepo, fakeMailer), no Spring involved', true],
        ['By starting the full context with @SpringBootTest every time', false],
        ['By using reflection to set two private fields after creation', false],
      ], 'Constructor injection makes dependencies ordinary constructor arguments, so a unit test just passes fakes. Needing a context or reflection is the cost of field injection.'),
      mcq('In Exercise 3, the singleton controller injects the prototype IdGenerator through its constructor. What do three calls print?', [
        ['The same id three times', true],
        ['Three different ids', false],
        ['null on the first call only', false],
      ], 'The controller was constructed once and received one IdGenerator instance. Prototype scope only means "new instance per request to the container", and the container was asked only once.'),
      mcq('In Exercise 4, prod is active and APP_GREETING=Hi is set in the environment. What does app.greeting resolve to?', [
        ['Hi, as OS environment variables outrank properties files', true],
        ['Hello from prod, as profile files always win over others', false],
        ['Hello, as application.properties is read last of all', false],
      ], 'In Spring Boot\'s property ordering, OS environment variables take precedence over application.properties and application-{profile}.properties packaged in the jar. Relaxed binding maps APP_GREETING to app.greeting.'),
      mcq('In Exercise 6, inner() logs isActualTransactionActive(). What is logged when the controller calls outer(), and outer() calls inner()?', [
        ['true, because inner() carries @Transactional', false],
        ['false, because the call goes through this, not the proxy', true],
        ['true only if outer() is declared as a final method', false],
      ], 'outer() is not transactional and calls inner() on the target object directly, bypassing the proxy that would begin a transaction, so no transaction is active.'),
      mcq('In Exercise 5, the class is changed from @RestController to @Controller and the method still returns a UserDto. What typically happens?', [
        ['Spring returns the same JSON, since Jackson is present', false],
        ['Spring tries to resolve a view and the request errors', true],
        ['The application refuses to start due to the return type', false],
      ], 'Without @ResponseBody, a non-String return value is added to the model and Spring derives a view name from the URL; no such template exists, so the request fails instead of writing JSON.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_SPRING_CORE_INTERVIEW_QUESTION',
    notes: `Three questions asked in almost every Java backend interview, with an answer at the standard
that earns the follow-up, and the follow-up itself.

## Q1. "What is the difference between IoC and DI? Which injection style do you use?"

**Strong answer.** "Inversion of Control is the principle: my class doesn't create its
collaborators, something outside does — in Spring, the container. Dependency Injection is how that
happens: the container passes them in. There are three styles. **Constructor injection** is what I
use by default: fields can be \`final\`, required dependencies are explicit, the bean fails fast at
startup if one is missing, and a unit test just calls the constructor. With a single constructor
I don't even need \`@Autowired\`. **Setter injection** I keep for optional dependencies.
**Field injection** I avoid — it hides dependencies and makes testing need reflection or a
context."

**Follow-up:** "What if two beans implement the interface you inject?" — \`NoUniqueBeanDefinitionException\`;
fix with \`@Primary\` for a default or \`@Qualifier\` at the injection point; qualifier wins.

## Q2. "Explain bean scopes and the bean lifecycle."

**Strong answer.** "The default is **singleton** — one instance per context, created at
startup, shared by all threads, so it must be stateless. **Prototype** gives a new instance each
time the container is asked, and Spring doesn't call its destroy callbacks. Web apps add
**request**, **session** and **application**. The lifecycle is: instantiate, inject, Aware
callbacks, BeanPostProcessor before-init, \`@PostConstruct\`, BeanPostProcessor after-init — which
is where AOP proxies are made — then use, and \`@PreDestroy\` on shutdown."

**Follow-up:** "Prototype injected into a singleton?" — injected once, so effectively one instance;
use \`ObjectProvider\`, \`@Lookup\` or a scoped proxy.

## Q3. "How does @Transactional work, and when does it not work?"

**Strong answer.** "Spring wraps the bean in a proxy — CGLIB by default in Boot, or a JDK proxy
for interfaces. Callers get the proxy; it opens a transaction through the
\`PlatformTransactionManager\`, calls the real method, and commits, or rolls back on an unchecked
exception. Because it is a proxy, it fails silently when the method is called from inside the same
class via \`this\`, when the method is private or final, when the object was created with \`new\`,
when the exception is checked without \`rollbackFor\`, or when the exception is caught inside."

**Follow-up:** "@Component vs @Bean?" — \`@Component\` on your own class, found by scanning;
\`@Bean\` on a factory method in a \`@Configuration\` class, for third-party classes or custom
construction. "Propagation?" — \`REQUIRED\` joins an existing transaction, \`REQUIRES_NEW\` suspends
it and starts its own.`,
    mcqs: [
      mcq('An interviewer asks why your answer favours constructor injection. Which reason is the one they most want to hear?', [
        ['It runs faster than setter injection at request time', false],
        ['Dependencies are explicit, final and easy to fake in tests', true],
        ['It is the only style that Spring Boot 3 still supports', false],
      ], 'All three styles still work in Spring 6, and none affects request-time speed. The case for constructors is immutability, explicit required dependencies, fail-fast startup and container-free tests.'),
      mcq('Follow-up: "A method annotated @Transactional(propagation = REQUIRES_NEW) is called from inside an active transaction. What happens?"', [
        ['It joins the caller\'s transaction like REQUIRED', false],
        ['The outer one is suspended and a new one runs', true],
        ['An exception is thrown for the nested call', false],
      ], 'REQUIRES_NEW suspends the existing transaction and commits or rolls back its own independently. (It still only applies when the call goes through the proxy.)'),
      mcq('Asked "@Component or @Bean for a Jackson ObjectMapper with custom modules?", which answer is strongest?', [
        ['@Bean, since ObjectMapper is a library class built in code', true],
        ['@Component, by subclassing ObjectMapper inside the project', false],
        ['Neither; library classes can never become Spring beans', false],
      ], 'You cannot annotate ObjectMapper, and it needs configuration at construction. A @Bean method in a @Configuration class registers the configured instance — exactly what @Bean is for.'),
    ],
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_SPRING_CORE_CHECKPOINT',
    notes: `Ten questions across the whole topic: the container, injection, scopes and lifecycle,
configuration and profiles, the DispatcherServlet, and proxies. Most show a short piece of code or
a startup message and ask what the container does with it. Answer from what you can predict, not
from what you half remember — that is what an interviewer tests.`,
    checkpoint: [
      mcq(`What does this print when the context starts?

    @Component
    class A {
        A(B b) { System.out.println("A"); }
    }
    @Component
    class B {
        B() { System.out.println("B"); }
    }`, [
        ['A then B', false],
        ['B then A', true],
        ['Only A', false],
        ['Only B', false],
      ], 'A needs a B for its constructor, so the container must build B first. Dependency resolution dictates the order: B is printed, then A.'),
      mcq('A class has two constructors, `Shop()` and `Shop(Inventory inv)`, neither annotated. Which does Spring 6 use?', [
        ['Shop(Inventory), as it has the most parameters', false],
        ['Shop(), the no-argument constructor', true],
        ['Neither; startup fails as ambiguous', false],
      ], 'With multiple constructors and no @Autowired, Spring falls back to the default no-arg constructor. To inject Inventory, annotate the constructor you want with @Autowired.'),
      mcq(`What is injected into OrderService?

    @Primary @Component class FedEx implements Courier {}
    @Component class Dhl implements Courier {}

    @Service class OrderService {
        OrderService(@Qualifier("dhl") Courier c) { ... }
    }`, [
        ['FedEx, the primary bean', false],
        ['Dhl, the qualified bean', true],
        ['Both, as a list of beans', false],
      ], 'The default bean name of Dhl is "dhl". A @Qualifier at the injection point overrides the @Primary default for that point only.'),
      mcq('A singleton bean injects `ObjectProvider<Basket> baskets` where Basket is a prototype, and calls `baskets.getObject()` twice. How many Basket instances result?', [
        ['One, shared by both calls', false],
        ['Two, one per getObject() call', true],
        ['Zero until the context closes', false],
      ], 'ObjectProvider defers the lookup: each getObject() asks the container, and a prototype bean is created afresh on every request to the container.'),
      mcq('Which statement about `@Configuration(proxyBeanMethods = false)` is correct?', [
        ['A call from one @Bean method to another returns a new object', true],
        ['Beans in the class become prototype-scoped by default', false],
        ['The class is then ignored by component scanning entirely', false],
      ], 'In lite mode the configuration class is not CGLIB-proxied, so inter-bean method calls are plain Java calls that create new objects. Declare dependencies as method parameters instead.'),
      mcq('The log shows `No active profile set, falling back to 1 default profile: "default"`. A bean marked @Profile("!prod") exists. Is it created?', [
        ['Yes, because prod is not active', true],
        ['No, because no profile is active', false],
        ['Only if dev is explicitly active', false],
      ], 'The "!" negates the profile expression: the bean is registered whenever prod is NOT active, which includes running with only the default profile.'),
      mcq('A @RestController method `@GetMapping("/items/{id}") Item get(@PathVariable long id)` receives GET /items/abc. What happens?', [
        ['id is set to 0 and the method runs', false],
        ['A 400 response from a type mismatch', true],
        ['A 404 because no mapping matches', false],
      ], 'The path matches the mapping, but "abc" cannot be converted to long; Spring throws MethodArgumentTypeMismatchException, which the default resolvers turn into 400 Bad Request.'),
      mcq(`What happens when transfer() is called from a controller?

    @Service class BankService {
        public void transfer() { debitAndCredit(); }
        @Transactional
        void debitAndCredit() { debit(); credit(); }   // credit() throws RuntimeException
    }`, [
        ['The debit is rolled back with the credit', false],
        ['The debit stays: no transaction was opened', true],
        ['Spring rejects the bean at startup', false],
      ], 'transfer() is not transactional and calls debitAndCredit() through this, bypassing the proxy, so no transaction exists; debit() auto-commits before credit() fails.'),
      mcq('An aspect uses `@Around("execution(* com.shop..*Service.*(..))")`. Which call is advised?', [
        ['A public method on a CGLIB-proxied OrderService bean', true],
        ['A final method on the same OrderService bean', false],
        ['A method on an OrderService created with new', false],
      ], 'Only calls through the container\'s proxy are advised. CGLIB cannot override a final method, and a new-ed object has no proxy at all.'),
      mcq('An app fails with "No qualifying bean of type \'com.reports.PdfExporter\'". PdfExporter has @Component and the main class is com.shop.App. What is the most direct fix?', [
        ['Move PdfExporter under the com.shop package tree', true],
        ['Mark PdfExporter\'s constructor with @Autowired', false],
        ['Change PdfExporter\'s scope to prototype', false],
      ], 'Scanning covers com.shop and its sub-packages only, so the annotation on com.reports.PdfExporter is never seen. Moving it (or adding the package to scanning, or a @Bean) registers it.'),
    ],
  },
];
