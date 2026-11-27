import { SeedBook } from '../types';

/**
 * Java Full Stack + AI track: the technical questions a fresher applying for a
 * Java full-stack role is asked. Spring Boot 3 / Java 17+ throughout.
 */
const book: SeedBook = {
  slug: 'track-java-fullstack',
  title: 'Java Full Stack + AI Interview Questions',
  kind: 'topic',
  subject: 'Java Full Stack + AI',
  description: `40 Java full-stack interview questions: Core Java and DSA, JDBC/Hibernate/JPA, Spring Boot REST and security, React integration, deployment, Spring AI and project scenarios.`,
  color: '#c2410c',
  emblem: '☕',
  audience: 'careerpilot',
  stages: ['specialize', 'placement'],
  tracks: ['JAVA_FULLSTACK_AI'],
  order: 200,
  chapters: [
    {
      title: `Core Java and DSA for backend work`,
      questions: [
        {
          q: `What is the difference between Comparable and Comparator? Sort a list of employees by salary, then by name.`,
          a: `- **Comparable** gives a class its *natural order*. The class itself implements \`compareTo()\`, so there is only one such order (for example, \`String\` sorts alphabetically).
- **Comparator** is a separate object that defines *any* order you want. You can have many comparators for the same class without touching it.

In real projects DTOs and entities are usually sorted with comparators built from Java 8 helper methods:

\`\`\`java
record Employee(String name, double salary) {}

List<Employee> list = new ArrayList<>(List.of(
    new Employee("Ravi", 50000),
    new Employee("Anu", 50000),
    new Employee("Kiran", 65000)));

list.sort(Comparator.comparingDouble(Employee::salary)
                    .thenComparing(Employee::name));
// Anu 50000, Ravi 50000, Kiran 65000
\`\`\`

Use \`.reversed()\` for descending order. Comparable lives in \`java.lang\`; Comparator lives in \`java.util\`.`,
          d: 'easy',
          at: 'Service companies, product companies',
          tip: `Show Comparator.comparing(...).thenComparing(...): it proves you write modern Java, not only anonymous classes.`,
        },
        {
          q: `What is Optional in Java? How should and should not it be used?`,
          a: `\`Optional<T>\` (Java 8) is a container that either holds a value or is empty. It makes "this might be missing" visible in a method's return type, so callers are pushed to handle the empty case instead of getting a \`NullPointerException\`.

Spring Data JPA uses it: \`findById()\` returns \`Optional<User>\`.

\`\`\`java
User user = userRepository.findById(id)
        .orElseThrow(() -> new UserNotFoundException(id));

String city = userRepository.findById(id)
        .map(User::getCity)
        .orElse("Unknown");
\`\`\`

**Good use:** return type of a lookup method that may find nothing.

**Avoid:**
- calling \`get()\` without checking — it throws if empty, which defeats the purpose;
- using Optional for fields, method parameters or inside collections;
- returning \`null\` from a method declared to return Optional.

Prefer \`orElseThrow\`, \`map\`, \`ifPresent\` and \`orElseGet\` (lazy) over \`isPresent()\` + \`get()\`.`,
          d: 'easy',
          tip: `Mention that findById in Spring Data returns Optional; it links the Java answer to your Spring work.`,
        },
        {
          q: `Using streams, find the total order amount per customer and the top 3 customers by total.`,
          a: `\`Collectors.groupingBy\` groups elements by a key, and a downstream collector reduces each group.

\`\`\`java
record Order(String customer, double amount) {}

Map<String, Double> totals = orders.stream()
    .collect(Collectors.groupingBy(
        Order::customer,
        Collectors.summingDouble(Order::amount)));

List<String> top3 = totals.entrySet().stream()
    .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
    .limit(3)
    .map(Map.Entry::getKey)
    .toList();   // Java 16+
\`\`\`

Points to explain:
- \`filter\`, \`map\`, \`sorted\`, \`limit\` are **intermediate** operations: lazy, they return a new stream.
- \`collect\` and \`toList\` are **terminal**: they trigger the work.
- A stream can be consumed only once.

In a real backend this aggregation should often happen in SQL (\`GROUP BY customer_id\`) so you do not load every order into memory; use streams for data already in memory.`,
          d: 'medium',
          at: 'Product companies',
          tip: `Saying "I would push this GROUP BY to the database for large data" shows backend judgement.`,
        },
        {
          q: `What are records in Java and why are they useful for DTOs?`,
          a: `A **record** (standard since Java 16) is a compact way to declare an immutable data carrier. The compiler generates the constructor, accessor methods, \`equals()\`, \`hashCode()\` and \`toString()\`.

\`\`\`java
public record ProductResponse(Long id, String name, BigDecimal price) {
    public ProductResponse {               // compact constructor for validation
        if (price.signum() < 0) throw new IllegalArgumentException("price < 0");
    }
}

ProductResponse p = new ProductResponse(1L, "Pen", new BigDecimal("20"));
p.name();   // accessor, no "get" prefix
\`\`\`

Why they suit DTOs (request and response objects in a REST API):
- fields are \`final\`, so the object cannot be changed by accident;
- far less boilerplate than a class with getters, setters and Lombok;
- Jackson (used by Spring Boot) serializes and deserializes records.

Records should **not** be used as JPA entities: JPA needs a no-argument constructor and mutable state for proxies and dirty checking.`,
          d: 'easy',
        },
        {
          q: `Why must equals() and hashCode() be overridden together? What goes wrong with JPA entities?`,
          a: `The contract: if two objects are \`equals()\`, they **must** have the same \`hashCode()\`. Hash-based collections (\`HashMap\`, \`HashSet\`) first use the hash to find a bucket and then \`equals()\` inside it. If you override only \`equals()\`, two "equal" objects land in different buckets, so a \`HashSet\` keeps duplicates and \`contains()\` returns false.

With **JPA entities** there is an extra trap. The \`id\` is often \`null\` until the entity is saved. If \`hashCode()\` uses the id, the hash changes after \`save()\`, and an entity already inside a \`HashSet\` can no longer be found.

A common safe pattern:

\`\`\`java
@Override
public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof Student other)) return false;
    return id != null && id.equals(other.id);
}

@Override
public int hashCode() {
    return getClass().hashCode();   // constant per class, never changes
}
\`\`\`

Alternatively use a stable business key such as an email or ISBN. Avoid Lombok's \`@Data\` on entities for this reason.`,
          d: 'medium',
          tip: `The "id is null before save" point is what separates a JPA developer from someone who memorised the contract.`,
        },
        {
          q: `Your service must call two slow external APIs. How do you call them in parallel in Java?`,
          a: `Calling them one after another costs the **sum** of both times; in parallel it costs roughly the **slower** one. \`CompletableFuture\` with an \`ExecutorService\` is the standard approach.

\`\`\`java
ExecutorService pool = Executors.newFixedThreadPool(4);

CompletableFuture<Profile> profileF =
    CompletableFuture.supplyAsync(() -> profileClient.get(userId), pool);
CompletableFuture<List<Order>> ordersF =
    CompletableFuture.supplyAsync(() -> orderClient.list(userId), pool);

Dashboard result = profileF
    .thenCombine(ordersF, Dashboard::new)
    .orTimeout(3, TimeUnit.SECONDS)
    .exceptionally(ex -> Dashboard.empty())
    .join();
\`\`\`

Points to explain:
- Use your own bounded pool; the default common pool is shared and small.
- Always set a **timeout** and a fallback with \`exceptionally\`, so one slow API does not hang the request.
- In Spring you can declare the executor as a bean, or use \`@Async\` methods returning \`CompletableFuture\`.
- From Java 21, **virtual threads** (\`Executors.newVirtualThreadPerTaskExecutor()\`) make blocking I/O calls cheap, and Spring Boot 3.2+ can enable them with a property.`,
          d: 'hard',
          at: 'Product companies',
        },
        {
          q: `Implement an LRU cache in Java.`,
          a: `An **LRU (Least Recently Used)** cache evicts the entry that was used longest ago once it is full. \`LinkedHashMap\` with *access order* does the bookkeeping for you: every \`get\` moves the entry to the end, and \`removeEldestEntry\` lets you drop the oldest.

\`\`\`java
class LRUCache<K, V> extends LinkedHashMap<K, V> {
    private final int capacity;

    LRUCache(int capacity) {
        super(capacity, 0.75f, true);   // true = access order
        this.capacity = capacity;
    }

    @Override
    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
        return size() > capacity;
    }
}

LRUCache<Integer, String> cache = new LRUCache<>(2);
cache.put(1, "a"); cache.put(2, "b");
cache.get(1);      // 1 is now most recent
cache.put(3, "c"); // evicts 2
\`\`\`

Both \`get\` and \`put\` are **O(1)**. If the interviewer wants it from scratch, use a \`HashMap<K, Node>\` plus a doubly linked list: the map finds the node in O(1), the list moves it to the head and removes the tail in O(1). This class is not thread-safe; wrap it or use a library like Caffeine in production.`,
          d: 'medium',
          at: 'Amazon, product companies',
          tip: `Give the LinkedHashMap answer first, then offer the HashMap + doubly linked list version.`,
        },
        {
          q: `Check whether a string of brackets is balanced. Why use ArrayDeque instead of Stack?`,
          a: `Push every opening bracket; on a closing bracket, the top of the stack must be its matching opener. At the end the stack must be empty.

\`\`\`java
static boolean isBalanced(String s) {
    Deque<Character> stack = new ArrayDeque<>();
    Map<Character, Character> pairs = Map.of(')', '(', ']', '[', '}', '{');
    for (char c : s.toCharArray()) {
        if (c == '(' || c == '[' || c == '{') {
            stack.push(c);
        } else if (pairs.containsKey(c)) {
            if (stack.isEmpty() || stack.pop() != pairs.get(c)) return false;
        }
    }
    return stack.isEmpty();
}
// isBalanced("{[()]}") -> true, isBalanced("([)]") -> false
\`\`\`

Time O(n), space O(n).

**Why ArrayDeque:** \`java.util.Stack\` extends \`Vector\`, whose methods are all synchronized, so it is slower for no benefit in single-threaded code, and it inherits list methods that break the stack idea. The Java documentation itself recommends \`Deque\` / \`ArrayDeque\` for stack behaviour.`,
          d: 'easy',
          at: 'TCS, Infosys, Accenture',
        },
      ],
    },
    {
      title: `JDBC, Hibernate, JPA and MySQL`,
      questions: [
        {
          q: `What are the steps to use JDBC? Why prefer PreparedStatement over Statement?`,
          a: `Basic JDBC flow with MySQL:
1. Add the driver (\`mysql-connector-j\`); since JDBC 4 it registers itself.
2. Open a \`Connection\` with \`DriverManager\` (or better, a pooled \`DataSource\`).
3. Create a \`PreparedStatement\` and set parameters.
4. Execute and read the \`ResultSet\`.
5. Close everything — \`try-with-resources\` does it automatically.

\`\`\`java
String sql = "SELECT id, name FROM users WHERE email = ?";
try (Connection con = DriverManager.getConnection(url, user, pass);
     PreparedStatement ps = con.prepareStatement(sql)) {
    ps.setString(1, email);
    try (ResultSet rs = ps.executeQuery()) {
        while (rs.next()) {
            System.out.println(rs.getLong("id") + " " + rs.getString("name"));
        }
    }
}
\`\`\`

**PreparedStatement** sends the value separately from the SQL text, so input like \`' OR '1'='1\` is treated as data — this prevents **SQL injection**. It is also precompiled and reusable, and handles types (dates, decimals) cleanly. Never build SQL by string concatenation with user input.`,
          d: 'easy',
          at: 'TCS, Wipro, Cognizant',
        },
        {
          q: `What is ORM? What is the difference between JPA, Hibernate and Spring Data JPA?`,
          a: `**ORM (Object-Relational Mapping)** maps Java classes to tables and objects to rows, so you work with objects and the framework writes the SQL.

- **JPA (Jakarta Persistence API)** is a *specification*: a set of interfaces and annotations (\`@Entity\`, \`@Id\`, \`EntityManager\`). It has no code that talks to a database by itself. In Spring Boot 3 the package is \`jakarta.persistence\` (it was \`javax.persistence\` before).
- **Hibernate** is the most popular *implementation* of JPA. It does the real work — generating SQL, caching, lazy loading — and has extra features beyond JPA.
- **Spring Data JPA** sits on top of JPA. It removes boilerplate: you declare an interface like \`UserRepository extends JpaRepository<User, Long>\` and Spring generates the implementation, including queries derived from method names.

\`\`\`text
Your code -> Spring Data JPA -> JPA API -> Hibernate -> JDBC -> MySQL
\`\`\`

Coding to JPA annotations keeps your entities portable across implementations.`,
          d: 'easy',
          at: 'Service companies, product companies',
          tip: `"JPA is the spec, Hibernate implements it, Spring Data JPA removes the boilerplate" — say it in one line first.`,
        },
        {
          q: `Explain the entity lifecycle states in JPA/Hibernate.`,
          a: `An entity object is in one of four states relative to the persistence context (the \`EntityManager\` / Hibernate \`Session\`):

1. **Transient (new)** — created with \`new\`, not associated with any context, no database row.
2. **Managed (persistent)** — associated with an open context, for example after \`persist()\` or when loaded with \`find()\`. Changes are tracked and written automatically at flush/commit (**dirty checking**) — no explicit update call needed.
3. **Detached** — was managed, but the context closed (end of the transaction) or \`detach()\` was called. Changes are no longer tracked; \`merge()\` copies its state back into a managed instance.
4. **Removed** — marked with \`remove()\`; the row is deleted at flush/commit.

\`\`\`java
@Transactional
public void rename(Long id, String name) {
    Student s = em.find(Student.class, id); // managed
    s.setName(name);                        // no save() needed
}                                           // commit -> UPDATE runs
\`\`\`

Understanding this explains why a change sometimes "saves itself" and why lazy loading fails on detached objects.`,
          d: 'medium',
        },
        {
          q: `What is the difference between lazy and eager loading? What causes LazyInitializationException?`,
          a: `- **Eager** loading fetches the related data together with the entity.
- **Lazy** loading returns a proxy and runs the query only when you first access the relation.

JPA defaults: \`@ManyToOne\` and \`@OneToOne\` are **EAGER**; \`@OneToMany\` and \`@ManyToMany\` are **LAZY**. A common best practice is to make everything lazy and fetch what each use case needs explicitly.

\`\`\`java
@ManyToOne(fetch = FetchType.LAZY)
private Department department;
\`\`\`

**LazyInitializationException** happens when you touch a lazy relation **after the session is closed** — typically when a controller or Jackson serializes an entity returned from a \`@Transactional\` service method.

Fixes:
- fetch what you need inside the transaction with \`JOIN FETCH\` or \`@EntityGraph\`;
- map entities to **DTOs** inside the service and return DTOs from controllers;
- avoid enabling \`open-in-view\` or \`enable_lazy_load_no_trans\` as a "fix" — they hide extra queries. (Spring Boot enables open-in-view by default and logs a warning; many teams set \`spring.jpa.open-in-view=false\`.)`,
          d: 'medium',
          at: 'Product companies',
        },
        {
          q: `What is the N+1 select problem in Hibernate and how do you fix it?`,
          a: `You run **1** query to load N parents, and then Hibernate runs **N** more queries, one per parent, to load a lazy relation. 100 departments become 101 queries.

\`\`\`java
List<Department> depts = deptRepo.findAll();          // 1 query
for (Department d : depts) {
    System.out.println(d.getEmployees().size());      // +1 query each
}
\`\`\`

**Detect it:** enable SQL logging (\`spring.jpa.show-sql=true\` or Hibernate statistics) and count queries per request.

**Fixes:**
1. **JOIN FETCH** in JPQL:
\`\`\`java
@Query("select distinct d from Department d left join fetch d.employees")
List<Department> findAllWithEmployees();
\`\`\`
2. **@EntityGraph** on a repository method: \`@EntityGraph(attributePaths = "employees")\`.
3. **Batch fetching**: \`@BatchSize(size = 50)\` or \`hibernate.default_batch_fetch_size\`, which loads children with an \`IN (...)\` query per batch.
4. **DTO projection**: select only the columns the screen needs.

Note that fetch-joining a collection together with pagination makes Hibernate paginate in memory; for paged lists use batch fetching or a two-step query (ids first, then fetch).`,
          d: 'hard',
          at: 'Product companies',
          tip: `Name the detection step (SQL logs) before the fixes — interviewers want to know you can find it, not just fix it.`,
        },
        {
          q: `How do you map a one-to-many relationship in JPA? What is the owning side and mappedBy?`,
          a: `In the database the foreign key sits on the "many" table, so in JPA the **@ManyToOne side owns** the relationship. The \`@OneToMany\` side uses \`mappedBy\` to say "the mapping is defined by that field over there" — it does not create another join column or join table.

\`\`\`java
@Entity
public class Department {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToMany(mappedBy = "department", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Employee> employees = new ArrayList<>();

    public void addEmployee(Employee e) {   // keep both sides in sync
        employees.add(e);
        e.setDepartment(this);
    }
}

@Entity
public class Employee {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;          // owning side
}
\`\`\`

Only changes on the owning side are written to the foreign key, which is why the helper method sets both sides. Without \`mappedBy\`, Hibernate assumes a separate join table.`,
          d: 'medium',
        },
        {
          q: `What is the difference between find() and getReference()? Explain first-level and second-level cache.`,
          a: `- \`find()\` (Hibernate \`get()\`) hits the database immediately (unless cached) and returns the real object, or \`null\` if not found.
- \`getReference()\` (Hibernate \`load()\`) returns a **proxy** without a query; the query runs on first access, and it throws \`EntityNotFoundException\` if the row does not exist. Useful to set a foreign key without loading the parent:

\`\`\`java
order.setCustomer(em.getReference(Customer.class, customerId)); // no SELECT
\`\`\`

(Spring Data's \`getReferenceById()\` does the same.)

**First-level cache** = the persistence context itself. It is per session/transaction and always on: loading the same id twice in one transaction runs one query and returns the same instance.

**Second-level cache** is shared across sessions, optional, and needs a provider such as Ehcache or another JCache implementation. It suits read-mostly reference data (countries, categories). It is configured per entity with \`@Cacheable\` and a cache concurrency strategy, and it adds the risk of stale data if the table is changed outside Hibernate.`,
          d: 'medium',
        },
        {
          q: `How does @Transactional work in Spring? Explain propagation, rollback rules and the self-invocation trap.`,
          a: `\`@Transactional\` makes Spring wrap the bean in a **proxy**. The proxy starts a transaction before the method, commits after it, and rolls back on failure.

**Rollback rules:** by default it rolls back on **unchecked** exceptions (\`RuntimeException\`, \`Error\`) but **not** on checked exceptions. Use \`@Transactional(rollbackFor = Exception.class)\` if needed.

**Propagation** decides what happens when a transactional method calls another:
- \`REQUIRED\` (default) — join the current transaction or start one;
- \`REQUIRES_NEW\` — suspend the current one and start a fresh, independent transaction (for example, writing an audit log that must survive a rollback);
- others include \`SUPPORTS\`, \`MANDATORY\`, \`NEVER\`, \`NESTED\`.

**Self-invocation trap:** calling a \`@Transactional\` method from another method *in the same class* bypasses the proxy, so the annotation is ignored. Move the method to another bean.

\`\`\`java
@Transactional(readOnly = true)  // hint for reads, Hibernate skips dirty checking
public List<OrderDto> list() { ... }
\`\`\`

Put transactions on the **service** layer, not controllers. MySQL's InnoDB engine is needed for transactions (MyISAM does not support them); its default isolation level is REPEATABLE READ.`,
          d: 'hard',
          at: 'Product companies',
          tip: `The proxy explanation answers three follow-ups at once: self-invocation, private methods, and checked exceptions.`,
        },
      ],
    },
    {
      title: `Spring Core and Spring Boot`,
      questions: [
        {
          q: `What are IoC and dependency injection? Why is constructor injection preferred?`,
          a: `**Inversion of Control (IoC)** means your classes do not create their own dependencies; the **Spring container** creates objects (beans) and wires them together. **Dependency Injection (DI)** is how it hands those dependencies in.

\`\`\`java
@Service
public class OrderService {
    private final OrderRepository repo;
    private final PaymentClient payments;

    public OrderService(OrderRepository repo, PaymentClient payments) {
        this.repo = repo;          // with one constructor, @Autowired is optional
        this.payments = payments;
    }
}
\`\`\`

Three styles: constructor, setter and field (\`@Autowired\` on a field).

**Why constructor injection:**
- dependencies can be \`final\` — the object is never half-built;
- required dependencies are obvious, and missing ones fail at startup;
- easy to unit test: \`new OrderService(mockRepo, mockPayments)\` without Spring;
- a constructor with too many parameters is a visible sign the class does too much.

Field injection hides dependencies and needs reflection or Spring to test.`,
          d: 'easy',
          at: 'TCS, Infosys, Cognizant, product companies',
        },
        {
          q: `What are bean scopes in Spring? Describe the bean lifecycle.`,
          a: `**Scopes:**
- **singleton** (default) — one instance per Spring container, shared by everyone. Must be stateless or thread-safe.
- **prototype** — a new instance every time it is requested.
- Web-aware scopes: **request**, **session**, **application** (and **websocket**).

\`\`\`java
@Component
@Scope("prototype")
public class ReportBuilder { ... }
\`\`\`

A trap: injecting a prototype bean into a singleton gives you only **one** prototype instance (injection happens once). Use \`ObjectProvider<ReportBuilder>\` to get a new one each time.

**Lifecycle (simplified):**
1. Instantiate the bean.
2. Inject dependencies.
3. Aware callbacks (\`BeanNameAware\`, \`ApplicationContextAware\`).
4. \`BeanPostProcessor\` before-init — this is where proxies for \`@Transactional\` etc. are prepared.
5. Init: \`@PostConstruct\`, then \`afterPropertiesSet()\`, then a custom init method.
6. Bean is ready to use.
7. On shutdown: \`@PreDestroy\`, \`destroy()\`, custom destroy method (prototype beans are not destroyed by the container).`,
          d: 'medium',
        },
        {
          q: `What is the difference between @Component, @Service, @Repository, @Controller and @RestController?`,
          a: `All are **stereotype annotations** picked up by component scanning, so the class becomes a Spring bean. \`@Service\`, \`@Repository\` and \`@Controller\` are specialisations of \`@Component\` that say which layer the class belongs to.

| Annotation | Layer | Extra behaviour |
|---|---|---|
| \`@Component\` | Generic | None |
| \`@Service\` | Business logic | None today — documents intent |
| \`@Repository\` | Data access | Translates database exceptions into Spring's \`DataAccessException\` hierarchy |
| \`@Controller\` | Web (MVC) | Methods return view names by default |
| \`@RestController\` | Web (REST) | \`@Controller\` + \`@ResponseBody\`: return values are written as JSON |

\`\`\`java
@RestController
@RequestMapping("/api/products")
public class ProductController { ... }
\`\`\`

Spring Data JPA interfaces (\`extends JpaRepository\`) do not need \`@Repository\` — Spring creates them automatically.`,
          d: 'easy',
          at: 'TCS, Wipro, Capgemini',
        },
        {
          q: `What does Spring Boot add on top of Spring? Explain starters, auto-configuration and @SpringBootApplication.`,
          a: `Spring Boot makes a Spring application runnable with almost no setup.

- **Starters** are curated dependency bundles with compatible versions. \`spring-boot-starter-web\` brings Spring MVC, Jackson and embedded Tomcat; \`spring-boot-starter-data-jpa\` brings Hibernate and Spring Data JPA.
- **Auto-configuration** creates beans based on what is on the classpath and in your properties. If it sees a MySQL driver and \`spring.datasource.url\`, it creates a \`DataSource\` (HikariCP pool), an \`EntityManagerFactory\` and a transaction manager. It backs off when you define your own bean.
- **Embedded server**: the app is a single runnable jar (\`java -jar app.jar\`), no external Tomcat needed.
- **Actuator** adds health and metrics endpoints.

\`\`\`java
@SpringBootApplication   // = @Configuration + @EnableAutoConfiguration + @ComponentScan
public class ShopApplication {
    public static void main(String[] args) {
        SpringApplication.run(ShopApplication.class, args);
    }
}
\`\`\`

Component scanning starts from this class's package, so keep it in the root package. Spring Boot 3 requires Java 17 or later.`,
          d: 'easy',
          at: 'Service companies, product companies',
        },
        {
          q: `Write a REST controller for products with GET by id and POST with validation.`,
          a: `\`\`\`java
public record ProductRequest(
        @NotBlank String name,
        @NotNull @Positive BigDecimal price) {}

@RestController
@RequestMapping("/api/products")
public class ProductController {
    private final ProductService service;

    public ProductController(ProductService service) { this.service = service; }

    @GetMapping("/{id}")
    public ProductResponse get(@PathVariable Long id) {
        return service.findById(id);      // throws ProductNotFoundException if absent
    }

    @PostMapping
    public ResponseEntity<ProductResponse> create(@Valid @RequestBody ProductRequest req) {
        ProductResponse saved = service.create(req);
        return ResponseEntity
                .created(URI.create("/api/products/" + saved.id()))
                .body(saved);              // 201 Created + Location header
    }
}
\`\`\`

Explain:
- \`@PathVariable\` reads \`/api/products/5\`; \`@RequestParam\` reads \`?page=2\`.
- \`@RequestBody\` turns JSON into the record with Jackson.
- \`@Valid\` triggers Bean Validation (\`spring-boot-starter-validation\`, \`jakarta.validation\` annotations). A failure returns **400**.
- POST returns **201** with a \`Location\` header; GET returns **200**; a missing product should be **404**.
- Controllers stay thin; logic lives in the service.`,
          d: 'medium',
          at: 'Product companies, service companies',
        },
        {
          q: `How do you handle exceptions globally in a Spring Boot REST API?`,
          a: `Use a class annotated with \`@RestControllerAdvice\` and methods with \`@ExceptionHandler\`. Every controller then returns the same, clean error format instead of stack traces.

\`\`\`java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ProductNotFoundException.class)
    public ResponseEntity<ProblemDetail> notFound(ProductNotFoundException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(pd);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> invalid(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
          .forEach(e -> errors.put(e.getField(), e.getDefaultMessage()));
        return ResponseEntity.badRequest().body(errors);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> other(Exception ex) {
        // log the full exception here
        return ResponseEntity.internalServerError()
               .body(ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR));
    }
}
\`\`\`

\`ProblemDetail\` (Spring 6 / Boot 3) follows the RFC 7807/9457 standard error format. Map each exception to the right status: 400, 404, 409 for conflicts, 500 for the unexpected — and never leak internal messages for 500s.`,
          d: 'medium',
        },
        {
          q: `How do Spring Data JPA repositories work? Show derived queries, @Query and pagination.`,
          a: `You declare an interface; Spring generates the implementation at startup. \`JpaRepository\` already gives \`save\`, \`findById\`, \`findAll\`, \`deleteById\`, \`count\` and paging.

\`\`\`java
public interface ProductRepository extends JpaRepository<Product, Long> {

    // derived query: parsed from the method name
    List<Product> findByCategoryAndPriceLessThan(String category, BigDecimal max);

    Optional<Product> findByNameIgnoreCase(String name);

    // explicit JPQL (entity and field names, not table names)
    @Query("select p from Product p where p.stock < :limit")
    List<Product> lowStock(@Param("limit") int limit);

    // paging and sorting
    Page<Product> findByCategory(String category, Pageable pageable);
}

Page<Product> page = repo.findByCategory("books",
        PageRequest.of(0, 20, Sort.by("price").descending()));
page.getContent(); page.getTotalElements(); page.getTotalPages();
\`\`\`

Notes:
- \`@Query(nativeQuery = true)\` runs raw SQL when JPQL is not enough.
- Update/delete queries need \`@Modifying\` and a transaction.
- \`Page\` runs an extra \`COUNT\` query; use \`Slice\` when you only need "is there a next page".
- Long derived names become unreadable — switch to \`@Query\` then.`,
          d: 'medium',
          at: 'Product companies',
        },
        {
          q: `How do you secure a Spring Boot 3 REST API with JWT?`,
          a: `**Flow:**
1. Client posts username and password to \`/api/auth/login\`.
2. Server checks them with an \`AuthenticationManager\` (passwords stored with BCrypt) and returns a signed **JWT** containing the user id, roles and an expiry.
3. The client sends \`Authorization: Bearer <token>\` on every request.
4. A filter validates the signature and expiry, and sets the user in the \`SecurityContext\`. The server keeps no session (**stateless**).

In Spring Security 6 (Boot 3), \`WebSecurityConfigurerAdapter\` is removed; you declare a \`SecurityFilterChain\` bean:

\`\`\`java
@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwtFilter) throws Exception {
        http.csrf(csrf -> csrf.disable())                 // OK for stateless token APIs
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
}
\`\`\`

Keep the signing key out of code, use short expiries with refresh tokens, and always use HTTPS. A production alternative is \`spring-boot-starter-oauth2-resource-server\`, which validates JWTs for you.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Explain the four-step flow before showing config; many candidates paste config they cannot explain.`,
        },
      ],
    },
    {
      title: `React, integration, deployment and GenAI`,
      questions: [
        {
          q: `Your React app on localhost:3000 gets a CORS error calling Spring Boot on localhost:8080. Why, and how do you fix it?`,
          a: `Browsers enforce the **same-origin policy**: a page may call another origin (different scheme, host or **port**) only if that server allows it with CORS headers such as \`Access-Control-Allow-Origin\`. Ports 3000 and 8080 are different origins, so the browser blocks the response. Postman works because it is not a browser.

**Fix on the server** — allow only the front-end origin:

\`\`\`java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:3000", "https://shop.example.com")
                .allowedMethods("GET", "POST", "PUT", "DELETE")
                .allowCredentials(true);
    }
}
\`\`\`

If Spring Security is on, also enable \`http.cors(...)\` so the preflight \`OPTIONS\` request is not rejected before reaching MVC. \`@CrossOrigin\` on a controller works for small cases.

**Alternatives:** a dev proxy in the React tool (Vite \`server.proxy\`), or serving both behind one domain with Nginx in production, which removes CORS entirely. Never use \`*\` with credentials.`,
          d: 'medium',
          at: 'Product companies, service companies',
          tip: `Say "different port = different origin" and "Postman is not a browser" — those two lines explain the whole bug.`,
        },
        {
          q: `Write a React component that loads a product list from your Spring Boot API.`,
          a: `\`\`\`tsx
import { useEffect, useState } from 'react';

type Product = { id: number; name: string; price: number };

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/products', { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(setProducts)
      .catch(err => { if (err.name !== 'AbortError') setError(err.message); })
      .finally(() => setLoading(false));
    return () => controller.abort();   // cleanup if the component unmounts
  }, []);                              // [] = run once after first render

  if (loading) return <p>Loading…</p>;
  if (error) return <p>Could not load products: {error}</p>;
  return (
    <ul>
      {products.map(p => <li key={p.id}>{p.name} — ₹{p.price}</li>)}
    </ul>
  );
}
\`\`\`

Explain: \`useState\` holds data, loading and error; \`useEffect\` with \`[]\` runs the request once; \`fetch\` does not throw on 404/500, so check \`res.ok\`; each list item needs a stable \`key\`. Larger apps often use a library such as TanStack Query for caching and retries.`,
          d: 'easy',
        },
        {
          q: `How do you manage configuration for dev and production in Spring Boot without hard-coding secrets?`,
          a: `Use **profiles** and **externalised configuration**.

\`application.yml\` holds shared defaults; \`application-dev.yml\` and \`application-prod.yml\` hold per-environment values. Activate one with \`spring.profiles.active=prod\` (or the \`SPRING_PROFILES_ACTIVE\` environment variable).

\`\`\`yaml
# application-prod.yml
spring:
  datasource:
    url: jdbc:mysql://db:3306/shop
    username: shop_app
    password: \${DB_PASSWORD}      # read from an environment variable
  jpa:
    hibernate:
      ddl-auto: validate          # never create/update schema in prod
\`\`\`

Spring Boot reads properties from many sources with a fixed priority: command-line arguments and environment variables override files in the jar. So the same jar runs everywhere, and secrets come from the environment, a secrets manager or the deployment platform.

Read values with \`@ConfigurationProperties\` (type-safe, preferred for groups) or \`@Value\`. Never commit real passwords or API keys to Git; add local override files to \`.gitignore\`. Use Flyway or Liquibase for schema changes instead of \`ddl-auto=update\`.`,
          d: 'easy',
        },
        {
          q: `How would you deploy a Spring Boot + React application?`,
          a: `**Build both:**
- React: \`npm run build\` produces static files (HTML, JS, CSS).
- Spring Boot: \`mvn clean package\` produces a runnable jar.

**Option 1 — one jar:** copy the React build into \`src/main/resources/static\` so Spring Boot serves the UI and the API from one origin. Simple, no CORS; add a forward to \`index.html\` for client-side routes.

**Option 2 — separate (more common):** serve React from Nginx or a CDN, run the API as a service, and let Nginx route \`/api\` to the backend.

**Containers:**
\`\`\`dockerfile
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY target/shop.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
\`\`\`
Run the API, MySQL and Nginx with Docker Compose, or deploy to a cloud VM, AWS Elastic Beanstalk, Azure App Service or Kubernetes.

**Checklist:** prod profile, secrets from environment variables, HTTPS, database migrations (Flyway), health check (Actuator \`/actuator/health\`), logs collected, and a CI pipeline (for example GitHub Actions) that builds, tests and deploys on every merge.`,
          d: 'medium',
          at: 'Product companies, startups',
        },
        {
          q: `Explain a typical Git workflow in a team. What is the difference between merge and rebase?`,
          a: `**Feature-branch workflow:**
\`\`\`bash
git checkout -b feature/cart-api      # branch from main
git add . && git commit -m "Add cart endpoints"
git pull --rebase origin main         # stay up to date
git push -u origin feature/cart-api   # open a pull request
\`\`\`
A teammate reviews the pull request, CI runs the tests, then it is merged into \`main\`.

**merge vs rebase:**
- \`git merge main\` adds a **merge commit** joining both histories. History is true and safe for shared branches, but can get noisy.
- \`git rebase main\` **replays your commits on top of** the latest main, giving a straight line. It rewrites commit ids, so never rebase a branch others have already pulled.

**Merge conflict:** Git marks the file with \`<<<<<<<\`, \`=======\`, \`>>>>>>>\`. Edit it to the correct final code, then \`git add\` and continue (\`git commit\` or \`git rebase --continue\`).

Also know \`git stash\`, \`git log --oneline\`, \`git revert\` (safe undo on shared history) versus \`git reset\` (moves the branch, for local work).`,
          d: 'easy',
          at: 'Service companies, product companies',
        },
        {
          q: `How do you call an LLM from a Spring Boot application?`,
          a: `**Spring AI** (1.0 released in 2025) gives a common API over providers such as OpenAI, Azure OpenAI, Anthropic, Google and local Ollama models. Add the starter for your provider, set the API key in configuration, and inject a \`ChatClient.Builder\`.

\`\`\`java
@RestController
public class AssistantController {
    private final ChatClient chatClient;

    public AssistantController(ChatClient.Builder builder) {
        this.chatClient = builder
            .defaultSystem("You are a helpful assistant for an online bookstore. Answer briefly.")
            .build();
    }

    @GetMapping("/api/ask")
    public String ask(@RequestParam String question) {
        return chatClient.prompt()
                .user(question)
                .call()
                .content();
    }
}
\`\`\`

Things to mention:
- The key comes from an environment variable, never from code or the front end — the browser calls *your* API, your API calls the LLM.
- \`.stream()\` instead of \`.call()\` returns tokens as they arrive for a chat-like UI.
- \`.entity(MyRecord.class)\` maps the answer into a Java object (structured output).
- Without Spring AI you can call the provider's REST API with \`RestClient\` or use the provider's own Java SDK.
- Handle timeouts, rate limits and cost: cache answers and limit input size.`,
          d: 'medium',
          tip: `Stress that the API key stays on the server; that is the first thing a reviewer checks in an AI feature.`,
        },
        {
          q: `What is RAG (Retrieval-Augmented Generation)? How would you build it in a Java application?`,
          a: `An LLM only knows its training data. **RAG** gives it your own data at question time: you **retrieve** the most relevant pieces of your documents and put them into the prompt, so the model answers from them.

**Steps:**
1. **Ingest:** split documents (PDFs, FAQs, product data) into chunks of a few hundred words.
2. **Embed:** turn each chunk into an *embedding* — a vector of numbers that captures meaning — using an embedding model.
3. **Store:** save vectors in a **vector store** (PGVector, Redis, Elasticsearch, Chroma, etc.).
4. **Retrieve:** embed the user's question and find the most similar chunks (similarity search).
5. **Generate:** send the question plus those chunks to the LLM with an instruction like "answer only from this context; say you don't know otherwise".

In Spring AI, the \`EmbeddingModel\` and \`VectorStore\` abstractions handle steps 2–4, and an advisor such as \`QuestionAnswerAdvisor\` attached to the \`ChatClient\` does retrieval and prompt-stuffing automatically.

**Why RAG instead of fine-tuning:** data stays current (re-index, no retraining), answers can cite sources, and it is cheaper. Quality depends mostly on chunking and retrieval, so test with real questions and show source links to users.`,
          d: 'hard',
          at: 'Product companies, AI startups',
        },
        {
          q: `What is an AI agent? How does tool calling work, for example in Spring AI?`,
          a: `A plain chat call takes text and returns text. An **agent** lets the LLM decide on **actions**: it can call tools (your functions), look at the results, and continue until the goal is done. The loop is roughly *think → call tool → observe result → repeat → final answer*.

**Tool (function) calling:** you describe your methods to the model; when it needs one, it returns a structured request ("call \`getOrderStatus\` with id 42"), your code runs it, and the result goes back to the model.

\`\`\`java
class OrderTools {
    private final OrderService orders;
    OrderTools(OrderService orders) { this.orders = orders; }

    @Tool(description = "Get the delivery status of an order by its id")
    String getOrderStatus(Long orderId) {
        return orders.statusOf(orderId);
    }
}

String answer = chatClient.prompt()
        .user("Where is my order 42?")
        .tools(new OrderTools(orderService))
        .call()
        .content();
\`\`\`

Spring AI runs the tool and sends the result back automatically.

**Safety:** tools run with your server's permissions, so check that the logged-in user owns order 42, prefer read-only tools, require confirmation for actions like refunds, cap the number of steps and log every tool call.`,
          d: 'medium',
          tip: `Always add the authorisation point: the model asking for order 42 does not mean this user may see it.`,
        },
      ],
    },
    {
      title: `Scenarios and project questions`,
      questions: [
        {
          q: `Explain your full-stack capstone project.`,
          a: `Use a fixed structure and keep it to about two minutes:

1. **Problem and users** — one line: "An online bookstore where customers browse, order and track books, and admins manage stock."
2. **Architecture** — React front end → Spring Boot REST API → MySQL, with JWT authentication. Mention layers: controller → service → repository → entity, and DTOs between them.
3. **Your part** — be specific: "I built the cart and order APIs, the JWT security config and the order history page."
4. **Data model** — main tables and relationships: users, books, orders, order_items (order ↔ book is many-to-many through order_items).
5. **One hard problem** — a real one: an N+1 query on the order history page fixed with \`JOIN FETCH\`, or stock going negative fixed with optimistic locking.
6. **Quality** — validation, global exception handling, unit tests with JUnit and Mockito, Git with pull requests.
7. **Deployment and next steps** — where it runs, and what you would add (payments, caching, an AI search assistant).

Keep a diagram ready, know every line you claim, and expect follow-ups on any technology you name.`,
          d: 'easy',
          at: 'All companies',
          tip: `Prepare one "problem I debugged" story with numbers (queries dropped from 101 to 1). Interviewers remember those.`,
        },
        {
          q: `An endpoint works on your machine but returns 500 in production. How do you debug it?`,
          a: `Work from evidence, not guesses:

1. **Read the logs** for the request time — the stack trace usually names the cause. If logs lack detail, that is the first fix (log exceptions in your global handler with a request id).
2. **Reproduce** with the same input (Postman/curl) against a staging or prod-like environment.
3. **Compare environments** — the usual suspects:
   - wrong profile or missing environment variable (DB password, API key);
   - database differences: a missing migration/column, different data (nulls that never occur in your test data), case-sensitive table names on Linux MySQL;
   - different Java version or dependency versions;
   - network: an external service or the DB not reachable from the server, firewall, timeouts;
   - file paths and permissions (Windows-style paths hard-coded in code, upload folders that do not exist).
4. Check **Actuator** health and metrics, and the server's memory/disk.
5. Fix, add a **test** that covers the case, and deploy through the normal pipeline.

Mention what you would *not* do: edit code directly on the server or turn on debug logging for everything permanently.`,
          d: 'medium',
          at: 'Product companies, service companies',
        },
        {
          q: `The "My orders" API takes 6 seconds with 50,000 orders in MySQL. How do you make it fast?`,
          a: `First **measure** where time goes: enable SQL logging or Hibernate statistics, and time the request.

Likely causes and fixes:
1. **No pagination** — loading every order. Return pages: \`Page<OrderDto> findByUserId(Long userId, Pageable p)\`.
2. **N+1 queries** — order items and books loaded lazily one by one. Use \`@EntityGraph\`, \`JOIN FETCH\` or batch fetching.
3. **Missing index** — the filter column has no index, so MySQL scans the table. Check with \`EXPLAIN\`:
\`\`\`sql
EXPLAIN SELECT * FROM orders WHERE user_id = 42 ORDER BY created_at DESC LIMIT 20;
CREATE INDEX idx_orders_user_created ON orders (user_id, created_at);
\`\`\`
   A composite index on (user_id, created_at) serves both the filter and the sort.
4. **Too many columns** — fetching whole entities with large text fields. Use a **DTO projection** selecting only what the screen shows.
5. **Serializing entities** — Jackson walking relations can trigger lazy loads; return DTOs.
6. Only after that, **caching** (Spring Cache with Redis) for data read often and changed rarely.

Re-measure after each change and report the before/after numbers.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Lead with "measure first", then pagination, N+1 and indexes. Jumping straight to caching is a red flag.`,
        },
        {
          q: `Design the REST API for a library management system.`,
          a: `Use **nouns for resources**, HTTP methods for actions, and correct status codes.

| Method | Endpoint | Purpose | Success |
|---|---|---|---|
| GET | \`/api/books?author=&page=0&size=20\` | Search/list books | 200 |
| GET | \`/api/books/{id}\` | One book | 200 / 404 |
| POST | \`/api/books\` | Add book (admin) | 201 + Location |
| PUT | \`/api/books/{id}\` | Replace book | 200 |
| PATCH | \`/api/books/{id}\` | Partial update (e.g. copies) | 200 |
| DELETE | \`/api/books/{id}\` | Remove book | 204 |
| POST | \`/api/loans\` | Borrow (body: bookId) | 201 / 409 if no copy free |
| POST | \`/api/loans/{id}/return\` | Return a book | 200 |
| GET | \`/api/members/{id}/loans\` | A member's loans | 200 |

Design points:
- Validation errors → **400**, not logged in → **401**, not allowed → **403**, rule broken (no copies, limit reached) → **409**.
- Paginate lists; filter with query parameters.
- Use DTOs for request/response; never expose entities directly.
- Version the API (\`/api/v1\`) if outside clients use it.
- Borrowing must check availability and decrease copies in **one transaction**.`,
          d: 'medium',
          at: 'Service companies, product companies',
        },
        {
          q: `Two admins edit the same product at the same time and one change is silently lost. How do you prevent this?`,
          a: `This is the **lost update** problem. Two common solutions:

**1. Optimistic locking (preferred for web apps)** — add a version column. Hibernate includes it in the \`WHERE\` clause of every update and increments it.

\`\`\`java
@Entity
public class Product {
    @Id private Long id;
    private int stock;
    @Version
    private Long version;
}
\`\`\`
\`\`\`sql
UPDATE product SET stock = ?, version = 6 WHERE id = ? AND version = 5;
\`\`\`
If someone else already saved version 6, zero rows match and Hibernate throws \`OptimisticLockException\` (Spring: \`ObjectOptimisticLockingFailureException\`). Return **409 Conflict** and let the user reload. The client should send the version it read with its update.

**2. Pessimistic locking** — lock the row while reading:
\`\`\`java
@Lock(LockModeType.PESSIMISTIC_WRITE)
Optional<Product> findWithLockById(Long id);   // SELECT ... FOR UPDATE
\`\`\`
Good for short, high-contention operations like decrementing stock in a flash sale, but it holds database locks and can cause waits or deadlocks.

For a simple counter you can also use an atomic SQL update: \`UPDATE product SET stock = stock - 1 WHERE id = ? AND stock > 0\`.`,
          d: 'hard',
          at: 'Product companies',
        },
        {
          q: `How do you store user passwords securely in your Spring Boot project?`,
          a: `Never store passwords in plain text, and never encrypt them (encryption can be reversed). Store a **slow, salted hash**.

Spring Security's \`BCryptPasswordEncoder\` does this:
- it adds a random **salt**, so the same password gives different hashes and precomputed (rainbow) tables are useless;
- it is deliberately slow (configurable *strength*), so brute-forcing stolen hashes is expensive.

\`\`\`java
@Bean
PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

// registration
user.setPassword(passwordEncoder.encode(rawPassword));

// login (Spring Security normally does this for you)
boolean ok = passwordEncoder.matches(rawPassword, user.getPassword());
\`\`\`

Do not use MD5 or SHA-256 alone — they are fast, which helps attackers.

Related good practices: enforce a minimum length, rate-limit login attempts, never log passwords or return them in API responses (keep them out of DTOs), and use HTTPS so they are not sent in clear text. \`PasswordEncoderFactories.createDelegatingPasswordEncoder()\` lets you upgrade algorithms later.`,
          d: 'easy',
          at: 'Service companies, product companies',
        },
        {
          q: `How do you implement profile-photo upload with React and Spring Boot?`,
          a: `**Front end:** send \`multipart/form-data\` with \`FormData\` — do not set the \`Content-Type\` header yourself; the browser adds the boundary.

\`\`\`tsx
async function upload(file: File) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/users/me/photo', { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
}
\`\`\`

**Back end:**
\`\`\`java
@PostMapping(value = "/api/users/me/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public ResponseEntity<Void> upload(@RequestParam("file") MultipartFile file) throws IOException {
    if (file.isEmpty()) return ResponseEntity.badRequest().build();
    String type = file.getContentType();
    if (!"image/png".equals(type) && !"image/jpeg".equals(type))
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).build();
    String name = UUID.randomUUID() + (type.equals("image/png") ? ".png" : ".jpg");
    storage.save(name, file.getInputStream());   // disk or S3/Blob storage
    userService.updatePhoto(currentUserId(), name);
    return ResponseEntity.noContent().build();
}
\`\`\`

Points: set \`spring.servlet.multipart.max-file-size\`; validate type and size; generate your own file name (never trust the original — path traversal); store files in object storage (S3, Azure Blob) and only the key in MySQL, not the bytes.`,
          d: 'medium',
        },
        {
          q: `You are asked to add an AI "ask about our products" chatbot to your project. What risks would you handle?`,
          a: `Building the call is easy; making it safe and affordable is the real work.

1. **API key safety** — the key lives on the server in an environment variable or secret store. The React app calls your Spring endpoint, never the LLM provider directly.
2. **Wrong or made-up answers (hallucination)** — use RAG over your product data, tell the model to answer only from the given context, show sources, and say "I don't know" when nothing matches.
3. **Prompt injection** — users (or documents) may write "ignore your instructions…". Keep the system prompt server-side, never let model output run commands directly, and authorise every tool call against the logged-in user.
4. **Private data** — do not send passwords, payment data or other users' records to the model; mask personal data in logs.
5. **Cost and abuse** — per-user rate limits, maximum input length, a token budget, caching common answers, and a cheaper model where it is good enough.
6. **Reliability** — timeouts, retries with backoff, a fallback message when the provider is down, and streaming for a responsive UI.
7. **Quality checks** — keep a small set of test questions with expected answers and re-run them when you change prompts or models; log questions and feedback (thumbs up/down).`,
          d: 'hard',
          at: 'Product companies, AI startups',
          tip: `Group answers as security, correctness, cost, reliability. A structured list beats a long story here.`,
        },
      ],
    },
  ],
};

export default book;
