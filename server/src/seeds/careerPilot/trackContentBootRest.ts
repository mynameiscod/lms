/**
 * Career-track content: Spring Boot and REST APIs (JT_BOOT_REST), for Java Full Stack + AI and Java
 * Backend Engineer.
 *
 * Spring Boot 3 on Java 17 with Maven: starters and auto-configuration, REST controllers, DTOs and
 * status codes, Bean Validation, one error shape through @RestControllerAdvice, configuration and
 * profiles, and OpenAPI docs. Persistence is an in-memory map here on purpose; Spring Data JPA,
 * Spring Security and testing are later topics that grow this same API.
 *
 * The questions are about a specific controller, request or log line, because that is how REST in
 * Spring Boot is examined: "what does this endpoint return?", "why is this a 415?", "why did the
 * validation not fire?".
 *
 * Attribution: the topic declares SPRING_BOOT and REST_APIS and defaults to SPRING_BOOT. A
 * checkpoint question that measures HTTP and REST design (verbs, status codes, idempotency, resource
 * paths) names REST_APIS with ck(); the rest take the default. Practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_BOOT_REST_BUNDLES: PilotBundle[] = [
  /* ── INITIALIZR ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_REST_INITIALIZR',
    notes: `In the Spring Core topic you saw the container, beans and the DispatcherServlet. Setting all of
that up by hand — a servlet container, Jackson, a DispatcherServlet, a DataSource, matching library
versions — used to take a day of XML. **Spring Boot** does it for you with three ideas:
**starters**, **auto-configuration** and an **embedded server**.

## Generating a project

Go to **start.spring.io** (Spring Initializr), or use *New Project → Spring Boot* in IntelliJ, and
choose:

- Project: **Maven**, Language: **Java**, Spring Boot: the latest **3.x** release
- Group \`com.codebegun\`, Artifact \`catalogue\`, Packaging **Jar**, Java **17**
- Dependencies: **Spring Web**, **Validation**, **Spring Boot DevTools**

Download, unzip, open in the IDE. The layout:

    catalogue/
    ├── pom.xml
    ├── mvnw, mvnw.cmd                 # Maven wrapper: no global Maven install needed
    └── src/
        ├── main/
        │   ├── java/com/codebegun/catalogue/
        │   │   └── CatalogueApplication.java
        │   └── resources/
        │       ├── application.properties
        │       ├── static/            # files served as-is (rarely used by an API)
        │       └── templates/         # server-side views (not used by an API)
        └── test/java/com/codebegun/catalogue/
            └── CatalogueApplicationTests.java

## The pom: parent and starters

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.4</version>
    </parent>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
    </dependencies>

Notice that the starters have **no \`<version>\`**. The parent imports Boot's dependency management
(a "BOM"), which pins a tested-together version of Spring, Jackson, Tomcat, Hibernate Validator and
hundreds of other libraries. You upgrade one number — the parent — and everything moves together.

A **starter** is a dependency that pulls in a coherent set of libraries.
\`spring-boot-starter-web\` brings Spring MVC, Jackson for JSON, and embedded Tomcat.
\`spring-boot-starter-validation\` brings Hibernate Validator. \`spring-boot-starter-data-jpa\`
(next topic) brings Hibernate and HikariCP.

## @SpringBootApplication

    @SpringBootApplication
    public class CatalogueApplication {
        public static void main(String[] args) {
            SpringApplication.run(CatalogueApplication.class, args);
        }
    }

It is three annotations in one:

- \`@SpringBootConfiguration\` — a \`@Configuration\` class.
- \`@ComponentScan\` — scan **this package and its sub-packages**. Keep this class in the root
  package (\`com.codebegun.catalogue\`) and put controllers in \`...catalogue.product\` and so on.
- \`@EnableAutoConfiguration\` — switch on auto-configuration.

## Auto-configuration

Boot ships hundreds of \`@AutoConfiguration\` classes. Each one is **conditional**:

    @AutoConfiguration
    @ConditionalOnClass(DispatcherServlet.class)        // only if Spring MVC is on the classpath
    public class DispatcherServletAutoConfiguration {
        @Bean
        @ConditionalOnMissingBean                         // only if you did not define one
        public DispatcherServlet dispatcherServlet() { ... }
    }

So the rule is: **what is on the classpath decides what is configured, and any bean you define
yourself wins.** Add the web starter and you get a DispatcherServlet, Jackson's \`ObjectMapper\` and
Tomcat. Add a JDBC driver and a \`DataSource\` appears (and startup fails if you have not set a URL).
Run with \`--debug\` (or \`debug=true\` in properties) to print the **conditions evaluation report**:
which auto-configurations matched and why the others did not.

## The embedded server

There is no Tomcat to install and no WAR to deploy. Tomcat runs **inside** your application, on
port **8080** by default:

    ./mvnw spring-boot:run                 # run from source
    ./mvnw clean package                   # builds target/catalogue-0.0.1-SNAPSHOT.jar
    java -jar target/catalogue-0.0.1-SNAPSHOT.jar

The jar is an executable "fat jar": your classes plus every dependency plus Tomcat. Change the port
with \`server.port=9090\` in \`application.properties\`.

DevTools restarts the app automatically when the classpath changes (after a build in the IDE). It
is excluded from the packaged jar, so it never reaches production.

## Common mistakes

- Putting a controller in \`com.codebegun.api\` while the main class is in
  \`com.codebegun.catalogue\` — it is outside the scan and never registered.
- Adding \`<version>\` to every starter "to be safe", and ending up with Spring 6.0 and Jackson from
  a different generation.
- Adding \`spring-boot-starter-data-jpa\` "for later" and then wondering why startup says
  *Failed to configure a DataSource*: auto-configuration saw Hibernate and tried to help.`,
    workedExample: `**Problem.** Generate a project and expose \`GET /api/health\` returning \`{"status":"UP","time":"..."}\`.

1. Initializr: Maven, Java 17, Boot 3.x, dependency **Spring Web**. Unzip, open.
2. Create \`com/codebegun/catalogue/health/HealthController.java\` — a sub-package of the main class,
   so it is scanned:

       package com.codebegun.catalogue.health;

       import java.time.Instant;
       import org.springframework.web.bind.annotation.GetMapping;
       import org.springframework.web.bind.annotation.RestController;

       @RestController
       public class HealthController {
           record Health(String status, Instant time) {}

           @GetMapping("/api/health")
           public Health health() {
               return new Health("UP", Instant.now());
           }
       }

3. Run \`./mvnw spring-boot:run\`. The log ends with *Tomcat started on port 8080* and
   *Started CatalogueApplication in 1.9 seconds*.
4. \`curl http://localhost:8080/api/health\` prints \`{"status":"UP","time":"2026-10-14T05:30:12.123Z"}\`.

What Boot did without being asked: started Tomcat (web starter on the classpath), registered a
DispatcherServlet, created an \`ObjectMapper\` with the Java time module (so \`Instant\` is written as
ISO text), and found the controller by scanning. You wrote one class.`,
    mcqs: [
      mcq('A pom.xml uses spring-boot-starter-parent 3.3.4 and lists spring-boot-starter-web with no <version> tag. Where does the starter\'s version come from?', [
        ['Maven picks the newest version published on Maven Central', false],
        ['The parent\'s dependency management pins a tested version', true],
        ['The build fails until a version is written for the starter', false],
      ], 'spring-boot-starter-parent imports Boot\'s dependency BOM, which fixes a version for every starter and library it manages. That is why upgrading the parent upgrades Spring, Jackson and Tomcat together.'),
      mcq('An app\'s only dependency is spring-boot-starter-web, and it defines no DispatcherServlet bean of its own. Why does it still have one at runtime?', [
        ['An auto-configuration matched because Spring MVC is on the classpath', true],
        ['The embedded Tomcat registers it from a web.xml inside the jar', false],
        ['@RestController classes each create a private DispatcherServlet', false],
      ], 'DispatcherServletAutoConfiguration is conditional on the MVC classes being present and on no user-defined bean existing. The web starter puts those classes there, so the condition matches.'),
      mcq('The main class is com.shop.app.ShopApplication and a controller lives in com.shop.web.OrderController. Requests to its path return 404. Why?', [
        ['Controllers must be in the very same package as the main class', false],
        ['com.shop.web is not under com.shop.app, so it is never scanned', true],
        ['OrderController needs an @Component next to @RestController', false],
      ], '@SpringBootApplication scans its own package and sub-packages only. com.shop.web is a sibling, not a child, so the controller is never registered and no mapping exists for its path.'),
    ],
    checkpoint: [
      mcq('An app defines its own @Bean ObjectMapper with a custom date format. Boot also auto-configures an ObjectMapper. Which one does Spring MVC use?', [
        ['Yours, because the auto-configured bean is @ConditionalOnMissingBean', true],
        ['Boot\'s, because auto-configuration runs before your configuration', false],
        ['Neither; startup fails with two beans of the same type', false],
      ], 'Auto-configured beans back off when you define your own of that type. Auto-configuration is processed after user configuration precisely so that these conditions can see your beans.'),
      mcq('You add spring-boot-starter-data-jpa to a working web app and set no spring.datasource properties. What happens on the next start?', [
        ['It starts normally and creates tables in a temporary folder', false],
        ['It fails: a DataSource is needed but no URL is configured', true],
        ['It starts, and the JPA starter stays idle until first used', false],
      ], 'JPA on the classpath triggers DataSource auto-configuration. With no URL and no embedded database driver it cannot build one and startup fails with "Failed to configure a DataSource".'),
      mcq('Which command produces a single jar you can copy to a server and start with java -jar, Tomcat included?', [
        ['./mvnw clean package', true],
        ['./mvnw spring-boot:run', false],
        ['./mvnw dependency:tree', false],
        ['./mvnw clean compile', false],
      ], 'package builds the executable fat jar in target/ via the Boot Maven plugin. spring-boot:run runs from source without producing a deployable jar, and compile stops before packaging.'),
    ],
  },

  /* ── REST_CONTROLLERS ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_REST_REST_CONTROLLERS',
    notes: `A REST API exposes **resources** (products, orders, students) at URLs and uses the **HTTP
method** to say what to do with them. In Spring Boot a resource is served by a controller.

## @RestController

    @RestController
    @RequestMapping("/api/products")
    public class ProductController {
        private final ProductService service;

        public ProductController(ProductService service) {
            this.service = service;
        }

        @GetMapping
        public List<ProductDto> list() { return service.findAll(); }

        @GetMapping("/{id}")
        public ProductDto get(@PathVariable long id) { return service.findById(id); }
    }

\`@RestController\` is \`@Controller\` + \`@ResponseBody\`: whatever a method returns is written to
the response body — converted to JSON by Jackson — instead of being treated as a view name. With a
plain \`@Controller\`, returning a \`ProductDto\` makes Spring look for a template and fail.

The class-level \`@RequestMapping("/api/products")\` is a prefix for every method in the class.

## One annotation per verb

| Annotation | Verb | Typical use | Idempotent? |
|---|---|---|---|
| \`@GetMapping\` | GET | read one or many | yes (and safe) |
| \`@PostMapping\` | POST | create a new resource | no |
| \`@PutMapping\` | PUT | replace a resource completely | yes |
| \`@PatchMapping\` | PATCH | change some fields | not guaranteed |
| \`@DeleteMapping\` | DELETE | remove a resource | yes |

**Idempotent** means sending the same request twice leaves the server in the same state as sending
it once. Deleting product 7 twice: it is gone either way (the second call may return 404, but the
state is the same). POSTing an order twice creates two orders — which is why a payment page warns you
not to press *Pay* again.

## Designing the paths

    GET    /api/products              list
    GET    /api/products/42           one product
    POST   /api/products              create
    PUT    /api/products/42           replace
    DELETE /api/products/42           delete
    GET    /api/categories/3/products products in a category (sub-resource)

Plural nouns, no verbs (\`/api/getProducts\` and \`/api/products/delete/42\` are RPC in REST
clothing), lower-case with hyphens (\`/api/order-items\`), and the verb carries the action.

## Path variables and query parameters

    @GetMapping("/{id}")
    public ProductDto get(@PathVariable long id) { ... }

    @GetMapping("/search")
    public List<ProductDto> search(
            @RequestParam String q,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page) { ... }

- A **path variable** identifies *which* resource: \`/api/products/42\`.
- A **query parameter** filters, sorts or pages a collection: \`/api/products/search?q=pen&page=2\`.

\`@RequestParam\` is **required by default**: \`/search\` without \`q\` is a **400 Bad Request**.
\`/api/products/abc\` for a \`long id\` is also a 400 — the conversion fails before your method runs.
The variable name is matched from the parameter name, which works because the Boot parent compiles
with \`-parameters\`; otherwise write \`@PathVariable("id")\`.

Note that \`/search\` and \`/{id}\` can coexist: Spring prefers the more specific literal path.

## An in-memory service for now

    @Service
    public class ProductService {
        private final Map<Long, ProductDto> store = new ConcurrentHashMap<>();
        private final AtomicLong ids = new AtomicLong();
        ...
    }

A \`ConcurrentHashMap\` because the service is a singleton used by many request threads at once. The
Spring Data topic replaces it with a repository; the controller does not change.

## Common mistakes

- \`@Controller\` instead of \`@RestController\` → *Circular view path* or a template error.
- Two methods mapped to the same verb and path → startup fails with *Ambiguous mapping*.
- Verbs in URLs, and using GET for something that changes data (a crawler or a link preview will
  happily call it).`,
    mcqs: [
      mcq('A class annotated @Controller (not @RestController) has @GetMapping("/api/ping") returning the String "pong". What does the caller get?', [
        ['The text pong, written straight into the response body', false],
        ['An error: Spring treats "pong" as a view name to render', true],
        ['A JSON object of the form {"value":"pong"} from Jackson', false],
      ], 'Without @ResponseBody, a String return value from a @Controller is a view name, so Spring tries to resolve a template called pong and fails. @RestController adds @ResponseBody to every method.'),
      mcq('With @GetMapping("/search") public List<ProductDto> search(@RequestParam String q), what happens on GET /api/products/search with no q?', [
        ['400 Bad Request, because the parameter is required', true],
        ['200 OK, with q set to null inside the method', false],
        ['404 Not Found, because no mapping matches the URL', false],
      ], '@RequestParam defaults to required = true, so a missing q fails parameter binding with a 400 before the method runs. Use required = false or a defaultValue for an optional parameter.'),
      mcq('A team names its endpoints POST /api/createStudent and GET /api/deleteStudent?id=5. What is the main REST problem?', [
        ['The paths should use camelCase segments, not lower case', false],
        ['Actions are in the path and a GET changes server data', true],
        ['Query parameters cannot carry identifiers in Spring Boot', false],
      ], 'In REST the URL names the resource and the HTTP method names the action: POST /api/students and DELETE /api/students/5. A GET must be safe, because browsers, proxies and crawlers may repeat it freely.'),
    ],
    checkpoint: [
      ck('REST_APIS', 'A client retries DELETE /api/products/7 after a timeout; the first call had actually succeeded. Which statement about the retry is correct?', [
        ['It is harmless: DELETE is idempotent, the product stays deleted', true],
        ['It is dangerous: a second DELETE removes the next product too', false],
        ['It is refused by Spring, which blocks any repeated DELETE', false],
      ], 'Idempotent means repeating the request leaves the same server state. The retry may get 404 instead of 204, but nothing further changes, which is why clients can safely retry DELETE and PUT but not POST.'),
      mcq('A controller has @GetMapping("/{id}") get(@PathVariable long id). A browser requests /api/products/abc. What happens?', [
        ['The method runs with id set to 0', false],
        ['400 Bad Request: "abc" cannot become a long', true],
        ['404 Not Found: the pattern needs digits', false],
        ['500 Internal Server Error from Jackson', false],
      ], 'The path matches {id}, then type conversion of "abc" to long fails with MethodArgumentTypeMismatchException, which Spring answers with 400. The method body never runs.'),
      ck('REST_APIS', 'Which path design fits REST for "all orders placed by customer 12"?', [
        ['GET /api/customers/12/orders', true],
        ['POST /api/getOrdersForCustomer/12', false],
        ['GET /api/orders/listByCustomer?do=12', false],
        ['GET /api/customer-orders-fetch/12', false],
      ], 'Orders belonging to a customer are a sub-resource of that customer, read with GET. The other paths put verbs in the URL, and one uses POST for a read.'),
    ],
  },

  /* ── REQUEST_RESPONSE ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_REST_REQUEST_RESPONSE',
    notes: `Reading data is half an API. The other half is accepting a body from the client and answering
with the status code that tells the client exactly what happened.

## @RequestBody

    @PostMapping
    public ProductDto create(@RequestBody CreateProductRequest req) { ... }

Spring reads the request body and, because the request says \`Content-Type: application/json\`,
hands it to Jackson, which builds a \`CreateProductRequest\` from the JSON. If the header says
something else (\`text/plain\`, or a form), the answer is **415 Unsupported Media Type**. If the
JSON is malformed — a missing quote, a trailing comma, \`"price": "abc"\` for a number — the answer is
**400 Bad Request** (\`HttpMessageNotReadableException\`).

## DTOs: what crosses the wire

A **DTO** (data transfer object) is a class shaped for the API, not for the database. Records are a
good fit in Java 17:

    public record CreateProductRequest(String name, String sku, BigDecimal price, Long categoryId) {}

    public record ProductDto(Long id, String name, String sku, BigDecimal price, String categoryName) {}

Why not accept and return the JPA \`Product\` entity directly?

- **Over-posting.** A client sends \`"id": 1\` or \`"createdBy": "admin"\` and Jackson happily sets
  fields the client was never meant to control.
- **Leaking.** Every field of the entity is serialised — including a \`passwordHash\` or an internal
  cost price — and any new column becomes part of the API without anyone deciding so.
- **Coupling.** Renaming a column breaks every client of the API.
- **Recursion.** \`Product.category\` → \`Category.products\` → \`Product.category\`... Jackson follows
  the bidirectional relationship until a \`StackOverflowError\` (or a lazy-loading exception).

So: a **request DTO** per write operation (create and update can differ), a **response DTO**
shaped for what the client shows, and mapping code in the service.

## ResponseEntity and status codes

Returning an object gives **200 OK**. When the outcome deserves another status, return a
\`ResponseEntity\`:

    @PostMapping
    public ResponseEntity<ProductDto> create(@RequestBody CreateProductRequest req) {
        ProductDto saved = service.create(req);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(saved.id()).toUri();
        return ResponseEntity.created(location).body(saved);        // 201 + Location header
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();                   // 204, no body
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDto> get(@PathVariable long id) {
        return service.find(id)
                .map(ResponseEntity::ok)                             // 200
                .orElse(ResponseEntity.notFound().build());          // 404
    }

\`@ResponseStatus(HttpStatus.CREATED)\` on a method is a shorter way to set a fixed status when you
do not need headers.

## Which status for which outcome

| Outcome | Status |
|---|---|
| Read succeeded | 200 OK |
| Resource created | 201 Created (+ \`Location\`) |
| Done, nothing to return (delete, some updates) | 204 No Content |
| Body malformed or fails validation | 400 Bad Request |
| Not logged in / bad token | 401 Unauthorized |
| Logged in, not allowed | 403 Forbidden |
| No such resource | 404 Not Found |
| Conflicts with current state (duplicate SKU) | 409 Conflict |
| Wrong Content-Type | 415 Unsupported Media Type |
| Bug on the server | 500 Internal Server Error |

The **4xx** family means *the client must change something*; **5xx** means *the server failed*. A
duplicate SKU is not a 500 — nothing is broken; the client asked for something that conflicts.

## Common mistakes

- Returning 200 with \`{"success": false}\` for an error: clients, monitoring and caches all trust
  the status line, not your field.
- Forgetting \`Content-Type: application/json\` in Postman or curl and getting 415.
- Returning the entity "just for now" and finding it in production a year later.`,
    workedExample: `**Problem.** \`PUT /api/products/{id}\` must replace a product's name, SKU and price. It must answer 200
with the updated product, 404 if the id does not exist, and 409 if the new SKU belongs to another
product.

Step 1 — the request DTO. PUT replaces the resource, so every replaceable field is in it; the id is
**not**, because the path already says which product:

    public record UpdateProductRequest(String name, String sku, BigDecimal price) {}

Step 2 — the service decides the outcome and signals it with exceptions (the next units turn these
into responses in one place; for now we handle them here):

    public ProductDto update(long id, UpdateProductRequest req) {
        ProductDto existing = store.get(id);
        if (existing == null) throw new ProductNotFoundException(id);
        boolean skuTaken = store.values().stream()
                .anyMatch(p -> p.sku().equalsIgnoreCase(req.sku()) && !p.id().equals(id));
        if (skuTaken) throw new DuplicateSkuException(req.sku());
        ProductDto updated = new ProductDto(id, req.name(), req.sku(), req.price(), existing.categoryName());
        store.put(id, updated);
        return updated;
    }

Step 3 — the controller:

    @PutMapping("/{id}")
    public ResponseEntity<ProductDto> update(@PathVariable long id, @RequestBody UpdateProductRequest req) {
        try {
            return ResponseEntity.ok(service.update(id, req));
        } catch (ProductNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (DuplicateSkuException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
    }

Step 4 — check each outcome with curl:

    curl -X PUT localhost:8080/api/products/1 -H "Content-Type: application/json" \\
         -d '{"name":"Gel Pen","sku":"PEN-01","price":20.00}'          # 200 + body
    curl -X PUT localhost:8080/api/products/999 ...                     # 404
    curl -X PUT localhost:8080/api/products/1 ... '"sku":"NB-02"' ...   # 409 if NB-02 is product 2

The try/catch in every method is repetitive — the Exception Handling unit removes it.`,
    mcqs: [
      mcq('Postman sends POST /api/products with a valid JSON body but the header Content-Type: text/plain. The method takes @RequestBody CreateProductRequest. What comes back?', [
        ['400 Bad Request, because Jackson could not parse the body into the record type', false],
        ['415 Unsupported Media Type, since no converter reads text/plain into it', true],
        ['201 Created, because Jackson parses the body anyway', false],
      ], 'Spring chooses a message converter from the Content-Type. No converter turns text/plain into a CreateProductRequest, so it rejects the request with 415 before looking at the body.'),
      mcq('A Product entity has @ManyToOne Category, and Category has @OneToMany List<Product> products. A controller returns the Product entity directly. What is the classic failure?', [
        ['Jackson follows product → category → products in a loop', true],
        ['Spring refuses to return any class annotated with @Entity', false],
        ['The category is silently left out of the response JSON', false],
      ], 'Serialising a bidirectional relationship makes Jackson walk back and forth until a StackOverflowError or a lazy-loading error. A response DTO with only the fields the client needs avoids it.'),
      mcq('POST /api/products creates a product. Which response best follows HTTP conventions?', [
        ['200 OK with the text "Product created successfully"', false],
        ['204 No Content, so the client fetches the product again', false],
        ['201 Created, a Location header and the new product body', true],
      ], '201 Created says a new resource exists, the Location header says where it lives, and returning the created representation saves the client a second request.'),
    ],
    checkpoint: [
      ck('REST_APIS', 'POST /api/products is sent with a SKU that another product already uses. Which status should the API return?', [
        ['409 Conflict', true],
        ['500 Internal Server Error', false],
        ['404 Not Found', false],
        ['200 OK with an error field', false],
      ], 'The request is well-formed but conflicts with the current state of the resource, which is exactly 409. Nothing on the server failed, so 5xx is wrong, and 200 hides the failure from every client.'),
      mcq('A CreateUserRequest DTO deliberately has no role field, though the User entity does. A client sends {"name":"Asha","role":"ADMIN"}. What is the effect?', [
        ['The user is created as an ADMIN from the extra field', false],
        ['role is not on the DTO, so it cannot reach the entity', true],
        ['Spring rejects the request because of the unknown field', false],
      ], 'Jackson only sets properties the DTO has, and by default Boot ignores unknown JSON properties. Because the service builds the entity from the DTO, a client cannot over-post a role.'),
      mcq('Which controller method returns 204 with an empty body?', [
        ['return ResponseEntity.noContent().build();', true],
        ['return ResponseEntity.ok().build();', false],
        ['return ResponseEntity.accepted().build();', false],
        ['return ResponseEntity.status(201).build();', false],
      ], 'noContent() is 204. ok() is 200 even with no body, accepted() is 202 for work queued for later, and 201 means a resource was created.'),
    ],
  },

  /* ── VALIDATION ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_REST_VALIDATION',
    notes: `Never trust a request body. A form in the React app can be bypassed with one curl command, so the
API must check every field itself. Spring Boot uses **Bean Validation** (Jakarta Validation, with
Hibernate Validator as the implementation), added by \`spring-boot-starter-validation\`.

## Constraints on the DTO

    import jakarta.validation.constraints.*;

    public record CreateProductRequest(
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Pattern(regexp = "[A-Z]{2,5}-\\\\d{2,4}", message = "must look like PEN-01") String sku,
            @NotNull @DecimalMin(value = "0.01") @Digits(integer = 8, fraction = 2) BigDecimal price,
            @PositiveOrZero Integer stock,
            @Email String supplierEmail) {}

The common ones:

| Annotation | Checks |
|---|---|
| \`@NotNull\` | not null (an empty string passes) |
| \`@NotEmpty\` | not null and length/size > 0 (\`" "\` passes) |
| \`@NotBlank\` | not null and has a non-whitespace character — strings only |
| \`@Size(min, max)\` | length of a string or size of a collection |
| \`@Min\`, \`@Max\`, \`@Positive\`, \`@PositiveOrZero\` | numeric range |
| \`@DecimalMin\`, \`@Digits\` | for \`BigDecimal\` amounts |
| \`@Email\`, \`@Pattern\` | format |
| \`@Past\`, \`@Future\` | dates |

Every constraint except \`@NotNull\` (and the \`Not*\` family) **treats null as valid**. \`@Email\` on a
null email passes; add \`@NotBlank\` if the field is required. And use **boxed** types (\`Integer\`,
not \`int\`) when you want "missing" to be detectable — a missing \`int\` becomes \`0\` silently.

## @Valid turns it on

    @PostMapping
    public ResponseEntity<ProductDto> create(@Valid @RequestBody CreateProductRequest req) { ... }

**Without \`@Valid\` the annotations do nothing.** With it, Spring validates the object after Jackson
builds it; if any constraint fails, the method is **not called** and Spring throws
\`MethodArgumentNotValidException\`, answered by default with **400 Bad Request**.

Nested objects are validated only if the field itself is marked \`@Valid\`:

    public record CreateOrderRequest(
            @NotNull Long customerId,
            @NotEmpty List<@Valid OrderLineRequest> lines) {}

## What the caller sees

Boot's default 400 body says little about *which* field failed. A client building a form needs
something like:

    {
      "status": 400,
      "message": "Validation failed",
      "fieldErrors": {
        "name": "must not be blank",
        "price": "must be greater than or equal to 0.01"
      }
    }

You build that body from the exception's \`getBindingResult().getFieldErrors()\` — the next unit
does it once, for the whole API, in \`@RestControllerAdvice\`. Custom \`message = "..."\` texts on the
annotations become those messages.

## Validating path and query parameters

    @GetMapping("/search")
    public List<ProductDto> search(@RequestParam @Size(min = 2) String q) { ... }

From Spring Boot 3.2 (Spring 6.1), constraints placed directly on controller method parameters are
checked by built-in method validation and a failure is a \`HandlerMethodValidationException\` (400).
On older versions you add \`@Validated\` on the controller class and get a
\`ConstraintViolationException\` instead — which, unhandled, becomes a 500. Know which version you
are on.

## Validation is not business rules

Bean Validation checks the **shape** of one request: required, length, range, format. "SKU must be
unique" or "stock cannot go below zero" depend on the database; they live in the service and
produce a 409 or a 422, not a field-format error.

## Common mistakes

- Forgetting \`@Valid\` and assuming the annotations work on their own.
- \`@NotNull\` on a \`String\` that must have content — \`""\` passes; use \`@NotBlank\`.
- \`@NotBlank\` on an \`Integer\` — it applies only to character sequences and fails at runtime with
  *No validator could be found*.
- Missing \`spring-boot-starter-validation\`: since Boot 2.3 the web starter does not include it, so
  \`@Valid\` silently validates nothing.`,
    mcqs: [
      mcq('A DTO has @NotBlank String name, and the controller declares create(@RequestBody CreateProductRequest req) without @Valid. A client sends {"name":""}. What happens?', [
        ['The method runs and receives the empty name', true],
        ['Spring returns 400, since the constraint failed', false],
        ['Jackson refuses to set a blank value on the record', false],
      ], 'Constraint annotations are only metadata. Spring validates a @RequestBody only when the parameter is marked @Valid (or @Validated), so the empty name reaches the method.'),
      mcq('A field is declared @Email String supplierEmail with no other constraint. A request omits supplierEmail entirely. Does validation pass?', [
        ['No, @Email rejects a missing value as malformed', false],
        ['Yes, @Email like most constraints accepts null', true],
        ['No, a missing field always fails Bean Validation', false],
      ], 'Bean Validation constraints other than the @Not* family consider null valid, so that "optional but well-formed" is expressible. Add @NotBlank as well if the email is required.'),
      mcq('Which constraint rejects null, an empty string and a string of three spaces?', [
        ['@NotNull', false],
        ['@NotEmpty', false],
        ['@NotBlank', true],
        ['@Size(min = 0)', false],
      ], '@NotBlank requires at least one non-whitespace character. @NotNull accepts "" and "   ", @NotEmpty accepts "   ", and @Size(min = 0) accepts everything except over-long values.'),
    ],
    checkpoint: [
      mcq('CreateOrderRequest has @NotEmpty List<OrderLineRequest> lines, and OrderLineRequest has @Positive int quantity. A body with one line of quantity -3 passes validation. Why?', [
        ['@Positive does not apply to primitive int fields, only to boxed types', false],
        ['The list elements are not marked @Valid, so they are not checked', true],
        ['@NotEmpty on the list switches off checks inside it', false],
      ], 'Validation cascades into nested objects only through @Valid, either on the field or as List<@Valid OrderLineRequest>. Without it, only the list itself (not empty) is checked.'),
      mcq('A project built from Initializr with only "Spring Web" has @Valid on its @RequestBody parameters, yet invalid bodies are accepted. What is missing?', [
        ['The spring-boot-starter-validation dependency', true],
        ['An @EnableValidation annotation on the main class', false],
        ['A Validator bean declared in a @Configuration', false],
        ['The jakarta.servlet-api dependency in the pom', false],
      ], 'Since Boot 2.3 the web starter no longer brings Hibernate Validator. Without a Bean Validation provider on the classpath, @Valid has nothing to run. Adding the validation starter fixes it.'),
      mcq('A @Valid @RequestBody fails one constraint. Which statement about the controller method is true?', [
        ['It runs, and receives a null argument in place of the body', false],
        ['It runs, and Spring adds the errors to the response afterwards', false],
        ['It never runs; MethodArgumentNotValidException is thrown', true],
      ], 'Validation happens during argument resolution, before invocation. A failure throws MethodArgumentNotValidException, which Spring answers with 400 unless your advice handles it differently.'),
    ],
  },

  /* ── EXCEPTION_HANDLING ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_REST_EXCEPTION_HANDLING',
    notes: `Without a plan, every error in an API looks different: Boot's default JSON for one, a Whitelabel
HTML page for another, a stack trace for a third, and a try/catch in every controller method. The
front-end team then writes a different parser per endpoint. The fix is **one error shape for the
whole API, produced in one place.**

## Throw meaningful exceptions from the service

    public class ResourceNotFoundException extends RuntimeException {
        public ResourceNotFoundException(String resource, Object id) {
            super(resource + " " + id + " not found");
        }
    }

    public class DuplicateResourceException extends RuntimeException {
        public DuplicateResourceException(String message) { super(message); }
    }

    public ProductDto findById(long id) {
        ProductDto p = store.get(id);
        if (p == null) throw new ResourceNotFoundException("Product", id);
        return p;
    }

The controller now has no try/catch at all: it calls the service and returns the result.

## One error shape

    public record ApiError(
            Instant timestamp,
            int status,
            String error,
            String message,
            String path,
            Map<String, String> fieldErrors) {}

## @RestControllerAdvice

    @RestControllerAdvice
    public class GlobalExceptionHandler {
        private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

        @ExceptionHandler(ResourceNotFoundException.class)
        public ResponseEntity<ApiError> notFound(ResourceNotFoundException ex, HttpServletRequest req) {
            return build(HttpStatus.NOT_FOUND, ex.getMessage(), req, Map.of());
        }

        @ExceptionHandler(DuplicateResourceException.class)
        public ResponseEntity<ApiError> conflict(DuplicateResourceException ex, HttpServletRequest req) {
            return build(HttpStatus.CONFLICT, ex.getMessage(), req, Map.of());
        }

        @ExceptionHandler(MethodArgumentNotValidException.class)
        public ResponseEntity<ApiError> invalid(MethodArgumentNotValidException ex, HttpServletRequest req) {
            Map<String, String> fields = new LinkedHashMap<>();
            ex.getBindingResult().getFieldErrors()
              .forEach(fe -> fields.putIfAbsent(fe.getField(), fe.getDefaultMessage()));
            return build(HttpStatus.BAD_REQUEST, "Validation failed", req, fields);
        }

        @ExceptionHandler(Exception.class)
        public ResponseEntity<ApiError> unexpected(Exception ex, HttpServletRequest req) {
            log.error("Unhandled error on {}", req.getRequestURI(), ex);   // full trace in the log
            return build(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong", req, Map.of());
        }

        private ResponseEntity<ApiError> build(HttpStatus s, String msg, HttpServletRequest req,
                                               Map<String, String> fields) {
            ApiError body = new ApiError(Instant.now(), s.value(), s.getReasonPhrase(), msg,
                                         req.getRequestURI(), fields);
            return ResponseEntity.status(s).body(body);
        }
    }

\`@RestControllerAdvice\` is \`@ControllerAdvice\` + \`@ResponseBody\`: its handlers apply to **every**
controller, and what they return is written as JSON.

How Spring picks a handler: the **closest matching exception type** wins — a
\`ResourceNotFoundException\` goes to its own handler, not to the \`Exception\` catch-all. An
\`@ExceptionHandler\` method inside a controller applies to that controller only and is tried before
the global advice.

## The catch-all and what it must not do

The \`Exception\` handler is your safety net. It **logs the full stack trace** for you and returns a
**generic message** to the client. Never put \`ex.getMessage()\` of an unknown exception in the
response: it can contain SQL, table names, file paths or a customer's data.

## ProblemDetail — the standard shape

Spring 6 also supports RFC 9457 *Problem Details* (\`application/problem+json\`):

    @ExceptionHandler(ResourceNotFoundException.class)
    public ProblemDetail notFound(ResourceNotFoundException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        pd.setTitle("Resource not found");
        return pd;
    }

Either your own record or \`ProblemDetail\` is fine. What matters is that **every** error from the
API has the same shape, so the React app can show \`message\` and highlight \`fieldErrors\` with one
piece of code.

## @ResponseStatus on the exception

    @ResponseStatus(HttpStatus.NOT_FOUND)
    public class ResourceNotFoundException extends RuntimeException { ... }

This sets the status but gives Boot's default body, not yours. It is fine for a quick prototype;
the advice gives you control over the body.

## Common mistakes

- Catching exceptions in the controller and returning \`null\` — the client gets 200 with an empty body.
- A catch-all that returns \`ex.toString()\` to the client.
- Advice in a package outside the component scan, so it is never registered and nothing changes.
- A broad \`RuntimeException\` handler with no specific one for not-found: the closest match is then
  the broad handler, and every missing product is reported as a 500 instead of a 404.`,
    workedExample: `**Problem.** The React team reports three different error formats from the catalogue API. Make
\`GET /api/products/999\`, an invalid \`POST\`, and a bug all answer in one shape.

Before (inside the controller):

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable long id) {
        try { return ResponseEntity.ok(service.findById(id)); }
        catch (Exception e) { return ResponseEntity.status(404).body(e.getMessage()); }   // plain text
    }

Problems: any exception — even a NullPointerException bug — is reported as 404, and the body is a
bare string.

After: the controller shrinks to \`return service.findById(id);\`, and \`GlobalExceptionHandler\` from
the notes handles everything.

    GET /api/products/999
    404 {"timestamp":"...","status":404,"error":"Not Found",
         "message":"Product 999 not found","path":"/api/products/999","fieldErrors":{}}

    POST /api/products  {"name":"","price":-5}
    400 {"timestamp":"...","status":400,"error":"Bad Request","message":"Validation failed",
         "path":"/api/products","fieldErrors":{"name":"must not be blank",
         "price":"must be greater than or equal to 0.01","sku":"must not be blank"}}

    (a bug throws NullPointerException)
    500 {"timestamp":"...","status":500,"error":"Internal Server Error",
         "message":"Something went wrong","path":"/api/products/3","fieldErrors":{}}
    and the log has the full stack trace with "Unhandled error on /api/products/3".

The bug is now a 500 (as it should be — it is the server's fault) instead of a misleading 404, and
the front end has one parser.`,
    mcqs: [
      mcq('An advice class has @ExceptionHandler(Exception.class) and @ExceptionHandler(ResourceNotFoundException.class). The service throws ResourceNotFoundException. Which handler runs?', [
        ['The Exception handler, because it is declared first in the class', false],
        ['The ResourceNotFoundException one, as the closest type match', true],
        ['Both run, and the response body is merged from the two results', false],
      ], 'Spring chooses the handler whose declared exception type is nearest in the hierarchy to the thrown exception. Declaration order does not matter, and only one handler handles an exception.'),
      mcq('A catch-all handler returns ResponseEntity.status(500).body(ex.getMessage()). Why is that a problem in production?', [
        ['A 500 response is not allowed to have any body at all', false],
        ['Internal details such as SQL or file paths can reach clients', true],
        ['getMessage() always returns null for runtime exceptions', false],
      ], 'Messages of unexpected exceptions often carry SQL fragments, table names, hostnames or user data. Log the full exception on the server and return a generic message to the caller.'),
      mcq('What is the practical difference between putting @ResponseStatus(HttpStatus.NOT_FOUND) on an exception class and handling it in @RestControllerAdvice?', [
        ['@ResponseStatus sets only the status; the advice also controls the body', true],
        ['@ResponseStatus works only for checked exceptions, not runtime ones', false],
        ['The advice applies to one controller, @ResponseStatus to all of them', false],
      ], 'With @ResponseStatus the status is right but the body is Boot\'s default error JSON. An @ExceptionHandler in the advice returns your own ApiError or ProblemDetail, keeping one error shape across the API.'),
    ],
    checkpoint: [
      mcq('ProductController declares its own @ExceptionHandler(ResourceNotFoundException.class), and a @RestControllerAdvice also handles that type. A product is not found in ProductController. Whose handler runs?', [
        ['The global advice, since it applies to every controller', false],
        ['The controller\'s own handler, which is tried first', true],
        ['Neither; Spring fails on startup with a duplicate handler', false],
      ], 'Handlers declared in the controller are consulted before @ControllerAdvice handlers for exceptions from that controller. Other controllers still use the global advice.'),
      mcq('A GlobalExceptionHandler in package com.acme.errors never runs, though the main class is com.acme.shop.ShopApplication. What is the likely reason?', [
        ['@RestControllerAdvice works only alongside @EnableWebMvc', false],
        ['The advice must implement HandlerExceptionResolver first', false],
        ['com.acme.errors is outside the scanned package tree', true],
      ], 'The advice is a component and is found by scanning from com.acme.shop downwards. com.acme.errors is a sibling package, so the advice bean is never created.'),
      mcq('In a MethodArgumentNotValidException handler, which call gives the field name and message for each failed constraint?', [
        ['ex.getBindingResult().getFieldErrors()', true],
        ['ex.getCause().getStackTrace()', false],
        ['ex.getParameter().getAnnotations()', false],
        ['ex.getSuppressed()[0].getMessage()', false],
      ], 'The BindingResult holds every validation failure, and each FieldError has getField() and getDefaultMessage(). The other calls return stack frames, annotations or suppressed exceptions, not field errors.'),
    ],
  },

  /* ── CONFIG_PROFILES_LOGGING ────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_REST_CONFIG_PROFILES_LOGGING',
    notes: `The same jar runs on your laptop, on the test server and in production. What changes between them
— the database URL, a password, the port, how much is logged — must come from **configuration**, not
from code edits and rebuilds.

## application.properties or application.yml

    # application.properties
    server.port=8080
    app.catalogue.max-page-size=50
    app.catalogue.low-stock-threshold=5

    # application.yml — same thing, nested
    server:
      port: 8080
    app:
      catalogue:
        max-page-size: 50
        low-stock-threshold: 5

Pick one format per project. Both live in \`src/main/resources\`.

## Reading values: @Value and @ConfigurationProperties

    @Value("\${app.catalogue.max-page-size:20}")    // :20 is the default if the key is missing
    private int maxPageSize;

\`@Value\` is fine for one value. For a group, bind a typed object:

    @ConfigurationProperties(prefix = "app.catalogue")
    @Validated
    public record CatalogueProperties(
            @Min(1) @Max(200) int maxPageSize,
            @PositiveOrZero int lowStockThreshold) {}

    @SpringBootApplication
    @ConfigurationPropertiesScan        // registers every @ConfigurationProperties class found
    public class CatalogueApplication { ... }

Inject \`CatalogueProperties\` like any bean. Kebab-case keys (\`max-page-size\`) bind to camelCase
fields (\`maxPageSize\`) — **relaxed binding** — and \`@Validated\` makes a bad value fail at startup
rather than at 2 a.m.

## Profiles

A profile is a named set of configuration. Profile-specific files sit next to the main one:

    application.yml           # shared defaults
    application-dev.yml       # only when "dev" is active
    application-prod.yml      # only when "prod" is active

    # application-dev.yml
    logging:
      level:
        com.codebegun: DEBUG
    springdoc:
      swagger-ui:
        enabled: true

    # application-prod.yml
    server:
      port: 8080
    logging:
      level:
        root: WARN
        com.codebegun: INFO

Activate with \`spring.profiles.active=dev\`, \`--spring.profiles.active=prod\` on the command line, or
the environment variable \`SPRING_PROFILES_ACTIVE=prod\`. Profile-specific values **override** the
shared file. Beans can also be profile-specific: \`@Profile("dev")\` on a \`@Component\` that seeds
sample data.

## Where values come from, and who wins

Boot reads many sources. The ones you will use, from **highest priority to lowest**:

1. Command-line arguments: \`java -jar app.jar --server.port=9000\`
2. Environment variables: \`SERVER_PORT=9000\`
3. Profile-specific files: \`application-prod.yml\`
4. \`application.yml\` / \`application.properties\` in the jar

Environment variables map by relaxed binding: \`app.catalogue.max-page-size\` →
\`APP_CATALOGUE_MAXPAGESIZE\`, \`spring.datasource.url\` → \`SPRING_DATASOURCE_URL\`.

## Secrets stay out of Git

    spring:
      datasource:
        url: \${DB_URL}
        password: \${DB_PASSWORD}

Placeholders resolve from environment variables. The password lives in the server's environment (or
a secrets manager), not in the repository — a leaked GitHub repo must not leak the database.

## Logging with SLF4J

Boot sets up **SLF4J** with **Logback** by default. Use the SLF4J API:

    private static final Logger log = LoggerFactory.getLogger(ProductService.class);

    log.debug("Searching products q={} page={}", q, page);
    log.info("Product created id={} sku={}", saved.id(), saved.sku());
    log.warn("Low stock for sku={} qty={}", sku, qty);
    log.error("Payment callback failed for order={}", orderId, ex);   // exception LAST: full trace

Levels from noisy to quiet: **TRACE < DEBUG < INFO < WARN < ERROR**. Setting a logger to INFO shows
INFO, WARN and ERROR. Set per package:

    logging.level.root=INFO
    logging.level.com.codebegun.catalogue=DEBUG
    logging.level.org.springframework.web=DEBUG       # see every mapping and request

Use \`{}\` placeholders, not string concatenation: the message is built only if the level is
enabled. **Never log passwords, tokens, OTPs or full card numbers.**

## Common mistakes

- \`application-Prod.yml\` with a capital letter, or activating \`production\` when the file says
  \`prod\` — the profile silently does not apply.
- \`log.error("Failed: " + e.getMessage())\` — the stack trace is lost; pass \`e\` as the last argument.
- Committing \`application-prod.yml\` with the real database password.`,
    mcqs: [
      mcq('application.yml sets server.port: 8080 and the app is started with java -jar app.jar --server.port=9000 while the environment has SERVER_PORT=8500. Which port is used?', [
        ['8080, because the packaged file is read first', false],
        ['8500, because environment variables win over arguments', false],
        ['9000, because command-line arguments have top priority', true],
      ], 'Command-line arguments outrank environment variables, which outrank the application files packaged in the jar. That ordering lets an operator override anything at launch.'),
      mcq('Which line logs an exception so that its full stack trace appears in the log?', [
        ['log.error("Order sync failed for {}", orderId, ex);', true],
        ['log.error("Order sync failed: " + ex.getMessage());', false],
        ['log.error("Order sync failed for {}", ex.toString());', false],
      ], 'SLF4J treats a Throwable passed as the final argument as the exception to print, including the stack trace. The other two log only a one-line message and lose where the failure happened.'),
      mcq('The service has logging.level.com.codebegun=WARN. Which of these calls in com.codebegun.catalogue.ProductService produce output?', [
        ['Only the log.error calls', false],
        ['The log.warn and log.error calls', true],
        ['The log.info, log.warn and log.error calls', false],
      ], 'A logger at WARN emits WARN and the more severe ERROR. INFO, DEBUG and TRACE are below the threshold and are skipped; the level applies to the package and its sub-packages.'),
    ],
    checkpoint: [
      mcq('A @ConfigurationProperties(prefix = "app.mail") record has a field fromAddress. Which property key binds to it?', [
        ['app.mail.from-address', true],
        ['mail.app.fromaddress', false],
        ['app.mail.address.from', false],
        ['app.mailFrom.address', false],
      ], 'The prefix plus the property name, written in kebab case by convention, binds through relaxed binding: app.mail.from-address → fromAddress. The others put the segments in the wrong order.'),
      mcq('application-prod.yml exists in the jar, but on the server the database URL from it is not used. The app was started with SPRING_PROFILES_ACTIVE=production. What is wrong?', [
        ['Profiles can be activated only with command-line arguments', false],
        ['The active profile name must match the file suffix exactly', true],
        ['Profile files are ignored once the app runs from a jar', false],
      ], 'Boot loads application-{profile}.yml for each active profile. "production" looks for application-production.yml, which does not exist, so only the shared file applies. Environment variables are a valid way to activate.'),
      mcq('A team wants the production database password out of Git. Which setup is right?', [
        ['password: ${DB_PASSWORD} in yml, value set in the server env', true],
        ['The password in application-prod.yml in a private repository', false],
        ['The password Base64-encoded in application.yml in the repo', false],
        ['The password in a Java constant that the build obfuscates', false],
      ], 'A placeholder keeps only the variable name in the repository, and the value is supplied by the environment or a secrets manager at runtime. Base64 and obfuscation are reversible, and private repos still leak.'),
    ],
  },

  /* ── OPENAPI ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_REST_OPENAPI',
    notes: `An API is only finished when another developer — the React team, a mobile team, a partner — can
call it without asking you. **OpenAPI** is the standard machine-readable description of a REST
API, and **Swagger UI** is the web page that renders it and lets you try every endpoint.

## Add springdoc

    <dependency>
        <groupId>org.springdoc</groupId>
        <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
        <version>2.6.0</version>
    </dependency>

(springdoc is not managed by the Boot parent, so this one needs a version; the 2.x line is for
Boot 3, the 1.x line was for Boot 2.)

Restart and open:

- \`http://localhost:8080/v3/api-docs\` — the OpenAPI spec as JSON (\`/v3/api-docs.yaml\` for YAML)
- \`http://localhost:8080/swagger-ui.html\` — redirects to Swagger UI

You wrote no documentation and already have a page listing every endpoint, its parameters, its
request body schema (from your DTO records and their validation constraints) and its responses.
springdoc builds the spec **from the code at startup**, which is the point: it cannot drift out of
date the way a Word document does.

## Describe what the code cannot

    @RestController
    @RequestMapping("/api/products")
    @Tag(name = "Products", description = "Catalogue products")
    public class ProductController {

        @Operation(summary = "Get one product",
                   description = "Returns a product by id. Prices are in INR.")
        @ApiResponse(responseCode = "200", description = "Found")
        @ApiResponse(responseCode = "404", description = "No product with that id",
                     content = @Content(schema = @Schema(implementation = ApiError.class)))
        @GetMapping("/{id}")
        public ProductDto get(@Parameter(description = "Product id", example = "42")
                              @PathVariable long id) { ... }
    }

    public record CreateProductRequest(
            @Schema(example = "Gel Pen 0.5mm") @NotBlank String name,
            @Schema(example = "PEN-01", description = "Two to five capitals, a dash, digits")
            @NotBlank String sku,
            @Schema(example = "25.00") @NotNull @DecimalMin("0.01") BigDecimal price) {}

\`@Tag\` groups endpoints, \`@Operation\` gives a summary, \`@ApiResponse\` lists the outcomes your
advice produces (the 404 and 400 shapes), and \`@Schema(example = ...)\` makes *Try it out* useful.
Validation annotations already appear in the schema (\`required\`, \`maxLength\`, \`minimum\`).

## API-level information

    @Bean
    public OpenAPI catalogueOpenApi() {
        return new OpenAPI().info(new Info()
                .title("Catalogue API")
                .version("v1")
                .description("Products and categories for the CodeBegun store"));
    }

## Turn it off where it does not belong

    # application-prod.yml
    springdoc:
      api-docs:
        enabled: false
      swagger-ui:
        enabled: false

Many teams keep docs on in dev and test and off (or behind login) in production, so the whole map
of the API is not public. The Security topic shows how to permit \`/swagger-ui/**\` and
\`/v3/api-docs/**\` when Security is added.

## Using the spec

- Front-end developers read Swagger UI instead of messaging you.
- Postman can import \`/v3/api-docs\` to create a whole collection.
- Generators (openapi-generator) build a typed TypeScript client for the React app from the spec.

## Common mistakes

- Adding the old \`springdoc-openapi-ui\` 1.x artifact to a Boot 3 project — it fails with
  \`javax\` class errors.
- Documenting only the 200 response, so clients discover 400/404/409 shapes by trial.
- Leaving Swagger UI public in production along with every internal admin endpoint.`,
    mcqs: [
      mcq('After adding springdoc-openapi-starter-webmvc-ui 2.x, where is the machine-readable spec served by default?', [
        ['/swagger-ui/spec.json', false],
        ['/v3/api-docs', true],
        ['/actuator/openapi', false],
        ['/api/docs.yaml', false],
      ], 'springdoc serves the OpenAPI document at /v3/api-docs (and /v3/api-docs.yaml), and the interactive page at /swagger-ui.html. The other paths are not springdoc defaults.'),
      mcq('A DTO field is declared @NotBlank @Size(max = 100) String name. What does springdoc do with those annotations?', [
        ['Ignores them, as only @Schema feeds the spec', false],
        ['Marks name required with maxLength 100 in the schema', true],
        ['Enforces them in Swagger UI in place of @Valid', false],
      ], 'springdoc reads Bean Validation annotations and reflects them in the generated schema. It documents the rules; enforcing them on real requests is still the job of @Valid in the controller.'),
      mcq('Why is a spec generated from the code at startup preferred over a hand-written API document?', [
        ['It stays in step with the endpoints as the code changes', true],
        ['It makes the endpoints respond faster to every incoming request', false],
        ['It removes the need for validation on request bodies', false],
      ], 'Hand-written docs drift as soon as someone adds a parameter. A spec built from mappings and DTOs reflects the code that is actually running; speed and validation are unaffected.'),
    ],
    checkpoint: [
      mcq('A Boot 3 project adds org.springdoc:springdoc-openapi-ui:1.7.0 and startup fails with errors about javax.servlet classes. What is the fix?', [
        ['Add the javax.servlet-api dependency to the pom', false],
        ['Use springdoc-openapi-starter-webmvc-ui 2.x instead', true],
        ['Downgrade Spring Boot to 2.7 to keep the docs', false],
      ], 'springdoc 1.x targets Boot 2 and the javax namespace. Boot 3 moved to jakarta, and springdoc 2.x (the starter-webmvc-ui artifact) is its matching line. Mixing in javax APIs does not fix it.'),
      mcq('Which annotation documents that GET /api/products/{id} can answer 404 with the ApiError body?', [
        ['@ApiResponse(responseCode = "404", ...)', true],
        ['@ResponseStatus(HttpStatus.NOT_FOUND)', false],
        ['@Operation(hidden = true)', false],
        ['@Tag(name = "404")', false],
      ], '@ApiResponse adds a documented response with its status and schema. @ResponseStatus changes real behaviour, hidden = true removes the operation from docs, and @Tag only groups endpoints.'),
      mcq('A team wants Swagger UI in dev but not in production. Which approach fits Spring Boot best?', [
        ['Delete the springdoc dependency before every prod build', false],
        ['Comment out the @Operation annotations in a release branch', false],
        ['springdoc.swagger-ui.enabled=false in application-prod.yml', true],
      ], 'A profile-specific property switches the UI (and api-docs) off in prod with the same jar. Removing dependencies or annotations per build makes dev and prod different artefacts.'),
    ],
  },

  /* ── DEBUGGING ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_REST_DEBUGGING',
    notes: `Spring Boot REST bugs fall into a short list. Each has a recognisable symptom — usually the status
code or the first lines of the startup log — and a single fix. Read the status and the log first.

## 1. 404 for an endpoint you can see in the code

    @RestController
    @RequestMapping("/api/product")          // singular
    public class ProductController { @GetMapping("/{id}") ... }

    GET /api/products/1   →  404

**Cause:** the path does not match — \`product\` vs \`products\`, a missing \`/api\`, or a
\`server.servlet.context-path=/shop\` you forgot is prefixing everything. **Fix:** compare the URL
character by character; set \`logging.level.org.springframework.web=DEBUG\` and Boot logs the
mappings it registered and which handler (if any) matched.

## 2. The controller is never registered at all

The main class is \`com.codebegun.catalogue.CatalogueApplication\`; the controller is in
\`com.codebegun.api\`. **Cause:** outside the component scan. **Fix:** move it under the main
class's package. The same fault makes a service fail with *Parameter 0 of constructor in
ProductController required a bean of type 'ProductService' that could not be found* — the service is
outside the scan or is missing \`@Service\`.

## 3. 415 Unsupported Media Type

**Cause:** the request has no \`Content-Type: application/json\` (Postman's *Text* or *form-data*
tab, or curl without \`-H\`). **Fix:** send the header; in the React client, axios sets it for
objects automatically.

## 4. 400 with "JSON parse error"

    {"name": "Pen", "price": "twenty"}         // price is BigDecimal
    {"name": "Pen", "price": 20,}              // trailing comma

**Cause:** \`HttpMessageNotReadableException\` — malformed JSON or a value of the wrong type. **Fix:**
correct the body; in your advice, map this exception to your 400 shape with a clear message.

## 5. 405 Method Not Allowed

\`POST /api/products/5\` when only \`PUT /api/products/5\` exists. **Cause:** the path matches but not
the verb. **Fix:** use the right verb, or add the mapping. The response's \`Allow\` header lists the
verbs that exist.

## 6. Validation never fires

**Cause:** \`@Valid\` missing on the \`@RequestBody\` parameter, or \`spring-boot-starter-validation\`
missing from the pom, or nested objects without \`@Valid\`. **Fix:** add whichever is missing; test
with an obviously invalid body.

## 7. StackOverflowError or "Could not write JSON: lazy loading"

**Cause:** returning entities with a bidirectional relationship (\`Product.category\` ↔
\`Category.products\`). **Fix:** return DTOs. (\`@JsonIgnore\` or \`@JsonManagedReference\` hide the
symptom but leave the entity as your API.)

## 8. The Whitelabel Error Page in a browser

*"This application has no explicit mapping for /error"*. **Cause:** an error happened (often a 404 or
a 500) and Boot's fallback error view rendered it as HTML for a browser. It is a symptom, not the
bug: look at the status it shows and at the log. **Fix:** the underlying fault; a
\`@RestControllerAdvice\` gives API clients JSON instead.

## 9. "Web server failed to start. Port 8080 was already in use."

**Cause:** another copy of the app (an old run in another IDE tab) or another program is on 8080.
**Fix:** stop it — on Windows \`netstat -ano | findstr :8080\` then \`taskkill /PID <pid> /F\` — or
set \`server.port\` to another port.

## 10. "Failed to configure a DataSource: 'url' attribute is not specified"

**Cause:** a JPA or JDBC starter is on the classpath but no \`spring.datasource.url\`. **Fix:**
configure the database, or remove the starter until you need it.

## Method

Reproduce with curl or Postman, read the **status code** and the **first exception** in the log (the
last *Caused by* is usually the real one), form one hypothesis, change one thing, restart, re-run.`,
    mcqs: [
      mcq('A React app POSTs to /api/students and gets 405 Method Not Allowed. The controller has @RequestMapping("/api/students") and only a @GetMapping method. What is the cause?', [
        ['CORS is blocking the POST before it reaches the controller', false],
        ['The path exists, but no handler is mapped for the POST verb', true],
        ['The request body failed validation and Spring hid it as 405', false],
        ['The controller is outside the component scan of the app', false],
      ], '405 means a mapping matched the path but not the method; the Allow header lists GET. A controller outside the scan would give 404, and validation failures are 400.'),
      mcq('Startup fails with: "Parameter 0 of constructor in OrderController required a bean of type \'OrderService\' that could not be found." OrderService has @Service. What do you check first?', [
        ['Whether OrderService\'s package is under the main class\'s package', true],
        ['Whether the database is up before the application context starts', false],
        ['Whether OrderController has @Autowired on its constructor', false],
        ['Whether server.port is free before the service is created', false],
      ], 'An annotated class is still invisible if it is outside the component scan. A single constructor needs no @Autowired, and the database and port are unrelated to bean discovery.'),
      mcq('In Postman, a POST body is entered on the "form-data" tab and the endpoint takes @RequestBody ProductRequest. Which status is expected?', [
        ['400 Bad Request', false],
        ['415 Unsupported Media Type', true],
        ['422 Unprocessable Entity', false],
        ['500 Internal Server Error', false],
      ], 'form-data sends multipart/form-data, and no JSON message converter reads that into a @RequestBody object, so Spring answers 415. Switching to raw JSON sets Content-Type: application/json.'),
      mcq('The log shows "Web server failed to start. Port 8080 was already in use." on Windows. Which action addresses the cause?', [
        ['Find the process holding 8080 with netstat and stop it', true],
        ['Add @CrossOrigin to every controller in the application', false],
        ['Delete the target folder and rebuild with mvn compile', false],
        ['Change the main class package to the root of the project', false],
      ], 'Another process, often an earlier run of the same app, owns the port. Stop it (netstat -ano | findstr :8080, then taskkill) or set server.port; CORS, rebuilds and packages do not free a port.'),
    ],
  },

  /* ── PRACTICE ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_REST_PRACTICE',
    notes: `Build these in one Spring Boot 3 project (Maven, Java 17, *Spring Web* and *Validation*), keeping data
in a \`ConcurrentHashMap\` inside a \`@Service\`. Test every endpoint with curl or Postman, and write
down the status code you expect **before** you send each request.

The resource is a **Student** in a coaching institute: \`id\`, \`name\`, \`email\`, \`phone\` (10 digits),
\`course\` (\`JAVA_FS\`, \`PYTHON_DS\`, \`MERN\`), \`feePaid\` (\`BigDecimal\`).

## Exercise 1 — Skeleton and health

Generate the project, add \`GET /api/health\` returning \`{"status":"UP"}\`, set \`server.port=8081\`,
and run it from the jar (\`./mvnw clean package\`, then \`java -jar\`). Then run with \`--debug\` and
find \`DispatcherServletAutoConfiguration\` in the conditions report.

## Exercise 2 — CRUD with the right verbs and statuses

| Method | Path | Success |
|---|---|---|
| GET | /api/students | 200 + list |
| GET | /api/students/{id} | 200, or 404 |
| POST | /api/students | 201 + Location + body |
| PUT | /api/students/{id} | 200, or 404 |
| DELETE | /api/students/{id} | 204, or 404 |

Use \`CreateStudentRequest\` and \`StudentDto\` records; the client never sends \`id\`.

## Exercise 3 — Filtering

\`GET /api/students?course=JAVA_FS&minFee=10000\` — both parameters optional. An unknown course value
(\`?course=JAVA\`) must be a 400, not a 500. Hint: binding a String to an enum already fails with 400;
check what your advice does with \`MethodArgumentTypeMismatchException\`.

## Exercise 4 — Validation

\`name\` not blank, max 80; \`email\` valid and required; \`phone\` exactly 10 digits
(\`@Pattern(regexp = "\\\\d{10}")\`); \`feePaid\` zero or more. Send a body that breaks all four at once
and confirm you see four field errors, not just the first.

## Exercise 5 — One error shape

Add \`ApiError\` and a \`@RestControllerAdvice\` handling not-found (404), duplicate email (409),
validation (400 with \`fieldErrors\`), malformed JSON (400) and anything else (500, generic message,
logged). Remove every try/catch from the controller.

## Exercise 6 — Profiles and docs

Create \`application-dev.yml\` (DEBUG logging for your package, Swagger UI on) and
\`application-prod.yml\` (INFO, Swagger UI off). Add springdoc, \`@Tag\` and \`@Operation\` on each
endpoint, and \`@ApiResponse\` for the 404 and 409 shapes. Start with each profile and confirm
\`/swagger-ui.html\` is there in one and not the other.

**Self-check:** no entity or map value is returned without going through a DTO; no endpoint name
contains a verb; every error the API can produce has the same JSON shape.`,
    mcqs: [
      mcq('In Exercise 2, DELETE /api/students/9 is sent for a student that exists. Which response matches the table?', [
        ['200 OK with the deleted student', false],
        ['204 No Content with no body', true],
        ['202 Accepted with a job id', false],
        ['201 Created with a Location', false],
      ], 'The exercise specifies 204 for a successful delete: the action is complete and there is nothing to return. 202 is for work queued for later, and 201 is for creation.'),
      mcq('In Exercise 3, GET /api/students?course=JAVA binds course to an enum Course with values JAVA_FS, PYTHON_DS and MERN. What should the client receive?', [
        ['200 with all students, ignoring the bad filter', false],
        ['500, because valueOf threw an IllegalArgumentException', false],
        ['400, because the value is not a valid Course', true],
      ], 'The conversion fails with MethodArgumentTypeMismatchException, a client error that Spring answers with 400. Your advice must keep it a 400 rather than letting a catch-all turn it into 500.'),
      mcq('For Exercise 4, which constraint accepts "9876543210" and rejects "98765-4321"?', [
        ['@Size(max = 10)', false],
        ['@Pattern(regexp = "\\\\d{10}")', true],
        ['@Digits(integer = 10, fraction = 0)', false],
        ['@Positive', false],
      ], '@Pattern on a String matches the whole value against the regex, so exactly ten digits pass and a dash fails. @Size(max = 10) accepts "98765-4321", which is also ten characters long.'),
      mcq('In Exercise 4, a body breaks name, email, phone and feePaid together. With @Valid and a field-error handler, what should the response contain?', [
        ['Only the first failed field, then validation stops', false],
        ['Four field errors, one for each broken field', true],
        ['A 500, because more than one constraint failed', false],
      ], 'Bean Validation evaluates every constraint and collects all violations, and the BindingResult holds them all. Reporting every field at once lets the form show all problems in one round trip.'),
      mcq('In Exercise 6 the app is started with --spring.profiles.active=prod, and application-prod.yml sets springdoc.swagger-ui.enabled: false. What does /swagger-ui.html return?', [
        ['The Swagger UI page, since the dependency is present', false],
        ['A 404, because the UI endpoint is switched off', true],
        ['A 401, because docs always need a login in prod', false],
      ], 'With the property false, springdoc does not register the UI endpoints, so the path is not found. Without Spring Security there is no login, and the dependency alone does not override the property.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_REST_INTERVIEW_QUESTION',
    notes: `Three questions that open almost every Spring Boot interview for a fresher or 0–2 year backend role.
Practise saying each answer aloud in under two minutes, with one concrete example from your project.

## Q1. "What is Spring Boot, and how does auto-configuration work?"

**Model answer.** Spring Boot is Spring Framework with opinionated defaults: starters that bring a
tested set of dependencies, auto-configuration that creates the beans an app usually needs, and an
embedded server so the app runs as a plain jar. \`@SpringBootApplication\` combines
\`@Configuration\`, \`@ComponentScan\` and \`@EnableAutoConfiguration\`. Auto-configuration classes are
listed in the starter jars and are conditional — \`@ConditionalOnClass\` checks whether a library is
on the classpath, \`@ConditionalOnMissingBean\` backs off if I define my own bean, and
\`@ConditionalOnProperty\` reads configuration. So adding the web starter gives me a DispatcherServlet,
Jackson and Tomcat, and defining my own \`ObjectMapper\` replaces Boot's.

**Follow-ups:** *"How do you see what was auto-configured?"* — run with \`--debug\` for the
conditions evaluation report, or the Actuator \`/actuator/conditions\` endpoint. *"How do you switch
one off?"* — \`@SpringBootApplication(exclude = DataSourceAutoConfiguration.class)\` or
\`spring.autoconfigure.exclude\`. *"Spring vs Spring Boot?"* — same container; Boot removes the setup.

## Q2. "Difference between PUT, PATCH and POST? Which are idempotent? Which status codes do you return?"

**Model answer.** POST creates a resource under a collection — \`POST /api/orders\` — and is not
idempotent: two calls create two orders; I return 201 with a Location header. PUT replaces the whole
resource at a known URL — \`PUT /api/orders/12\` with the full representation — and is idempotent:
sending it twice leaves the same state; I return 200 with the body or 204. PATCH changes only the
fields sent; it is not guaranteed idempotent (\`{"op":"increment"}\` would not be). GET, PUT and
DELETE are idempotent; GET is also safe. For errors: 400 for invalid input, 404 for a missing id,
409 for a conflict like a duplicate email, and 500 only for genuine server faults.

**Follow-ups:** *"401 vs 403?"* — 401 means not authenticated (no or bad token), 403 means
authenticated but not allowed. *"What if a client PUTs to an id that does not exist?"* — either 404,
or create it and return 201 if clients choose ids; I would return 404 when the server assigns ids.
*"How do you make a POST payment safe to retry?"* — an idempotency key header the server remembers.

## Q3. "How do you handle exceptions and validation in a Spring Boot REST API?"

**Model answer.** Input validation uses Bean Validation annotations on request DTOs — \`@NotBlank\`,
\`@Email\`, \`@Size\` — and \`@Valid\` on the \`@RequestBody\`; a failure throws
\`MethodArgumentNotValidException\` before my method runs. The service throws specific exceptions
like \`ResourceNotFoundException\`. One \`@RestControllerAdvice\` class has \`@ExceptionHandler\`
methods that map each to a status — validation to 400 with a map of field errors, not-found to 404,
duplicates to 409 — and a catch-all for \`Exception\` that logs the stack trace and returns a generic
500 message. Every error has the same JSON shape (my own record, or Spring 6's \`ProblemDetail\`), so
the front end handles errors in one place, and controllers have no try/catch.

**Follow-ups:** *"Why not return entities?"* — over-posting, leaking fields, coupling the API to the
schema, and JSON recursion; DTOs avoid all four. *"What if two handlers match?"* — the closest
exception type wins; a controller-local handler beats the advice.

## How you are judged

Interviewers listen for the mechanism (conditions, \`@Valid\` triggering an exception, closest
handler) and for one real example — "when I added the JPA starter, startup failed until I set the
datasource URL" — rather than definitions recited from a blog.`,
    mcqs: [
      mcq('An interviewer asks how to stop Spring Boot from auto-configuring a DataSource in one app. Which answer is correct?', [
        ['@SpringBootApplication(exclude = DataSourceAutoConfiguration.class)', true],
        ['Mark the main class with @Lazy so that no beans are created early', false],
        ['Set server.datasource.enabled=false in the application.properties', false],
      ], 'Auto-configurations can be excluded on @SpringBootApplication or with spring.autoconfigure.exclude. @Lazy only delays bean creation, and server.datasource.enabled is not a real property.'),
      mcq('Asked "a client calls PUT /api/profiles/12 with the same body three times — what is the state afterwards?", what is the right answer?', [
        ['Three copies of profile 12 now exist on the server side', false],
        ['Profile 12 matches the body, as after a single call', true],
        ['The second and third calls are rejected with 409', false],
      ], 'PUT replaces the resource at that URL with the given representation, so repeating it changes nothing further — that is what idempotent means. Only POST would create more resources.'),
      mcq('An interviewer asks: "A logged-in user without the ADMIN role calls an admin-only endpoint. Which status code?" What is the best answer?', [
        ['401 Unauthorized, because the user is missing a needed role', false],
        ['403 Forbidden, because the user is known but not allowed', true],
        ['404 Not Found, because the endpoint is hidden from them', false],
      ], '401 means the request is not authenticated at all. A user whose identity is known but who lacks permission gets 403. Hiding with 404 is a deliberate design choice, not the standard answer.'),
    ],
  },

  /* ── MINI_PROJECT ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_REST_MINI_PROJECT',
    notes: `# A Product Catalogue REST API

Build the REST API for an online stationery shop's catalogue on Spring Boot 3, Java 17 and Maven.
Data lives in memory in this project (a \`ConcurrentHashMap\` per resource inside a service); the
Spring Data topic will swap that for MySQL without touching your controllers, so keep the layers
clean.

## Resources

**Category:** \`id\`, \`name\` (unique, 2–50 chars), \`description\` (optional, up to 200).

**Product:** \`id\`, \`name\` (2–100 chars), \`sku\` (unique, pattern \`[A-Z]{2,5}-\\d{2,4}\`, e.g.
\`PEN-01\`), \`price\` (\`BigDecimal\`, at least 0.01), \`stock\` (0 or more), \`categoryId\` (must exist),
\`active\` (boolean, default true).

## Endpoints

| Method | Path | Purpose | Success | Errors |
|---|---|---|---|---|
| GET | /api/categories | list categories | 200 | — |
| POST | /api/categories | create a category | 201 + Location | 400, 409 |
| GET | /api/products | list products; optional \`categoryId\`, \`q\` (name contains), \`minPrice\`, \`maxPrice\` | 200 | 400 |
| GET | /api/products/{id} | one product | 200 | 404 |
| POST | /api/products | create | 201 + Location | 400, 404 (category), 409 (SKU) |
| PUT | /api/products/{id} | replace | 200 | 400, 404, 409 |
| PATCH | /api/products/{id}/stock | body \`{"change": -3}\`; adjust stock | 200 | 400, 404, 409 (would go negative) |
| DELETE | /api/products/{id} | delete | 204 | 404 |
| GET | /api/health | health | 200 | — |

Responses return \`ProductDto\` with \`categoryName\` included, never the internal objects.

## Design requirements

- Packages under the main class: \`category\`, \`product\`, \`common\` (errors, config).
- Request DTOs (records) with Bean Validation and \`@Valid\`; response DTOs separate from them.
- Services hold the rules (unique SKU, category exists, stock not negative) and throw specific
  exceptions; controllers contain no try/catch and no business logic.
- One \`@RestControllerAdvice\` producing one \`ApiError\` shape for 400 (with \`fieldErrors\`), 404, 409,
  malformed JSON, type mismatches, and 500 (generic message, full trace logged).
- \`@ConfigurationProperties(prefix = "catalogue")\` for \`maxResults\` (cap on list size) and
  \`lowStockThreshold\`; log a WARN when a stock change leaves a product at or below the threshold.
- \`application-dev.yml\` and \`application-prod.yml\`: DEBUG vs INFO for your package; Swagger UI on in
  dev, off in prod. A \`@Profile("dev")\` component seeds 3 categories and 10 products.
- springdoc with \`@Tag\`, \`@Operation\` and \`@ApiResponse\` for every documented error status, and
  \`@Schema(example = ...)\` on request DTO fields.

## Acceptance criteria

- Creating a product with a duplicate SKU returns 409 in the \`ApiError\` shape and changes nothing.
- A body with blank name, bad SKU and negative price returns 400 listing all three fields.
- \`{"price": "abc"}\` returns 400 (not 500); \`GET /api/products/xyz\` returns 400.
- \`PATCH .../stock\` with a change that would make stock negative returns 409; stock is unchanged.
- \`DELETE\` twice on the same id returns 204 and then 404.
- \`POST\` returns a \`Location\` header that, when followed, returns the same product.
- With \`prod\` active, \`/swagger-ui.html\` is not available and logs show no DEBUG lines.
- No response anywhere contains a stack trace.`,
    mcqs: [
      mcq('In the catalogue API, PATCH /api/products/5/stock with {"change": -10} arrives when stock is 4. Which response does the brief require?', [
        ['200, with stock clamped to zero', false],
        ['409, and stock stays at 4', true],
        ['400, as change must be positive', false],
      ], 'The request is well-formed, but applying it would break a rule about the current state (stock cannot go negative), so it is a conflict: 409 with no change. Clamping silently loses the client\'s intent.'),
      mcq('POST /api/products names a categoryId that does not exist. Which status does the brief list for this case?', [
        ['404, since the referenced category is not found', true],
        ['500, since the lookup threw an exception', false],
        ['201, and the category is created on the fly', false],
      ], 'The brief maps a missing category to 404 through the ResourceNotFoundException handler. A 500 would wrongly blame the server, and silently creating categories breaks the catalogue\'s rules.'),
    ],
    assignment: {
      title: 'A Product Catalogue REST API',
      description: 'A Spring Boot 3 REST API for a stationery shop\'s catalogue: categories and products with CRUD endpoints, request and response DTOs, Bean Validation, one error shape through @RestControllerAdvice, configuration properties, dev and prod profiles, and Swagger documentation.',
      instructions: `Build the API described in this unit's brief and submit it as a repository link or a zip.

**Submit:**

1. The Maven project (\`pom.xml\`, \`src/\`), runnable with \`./mvnw spring-boot:run\` and as a jar.
2. \`application.yml\`, \`application-dev.yml\` and \`application-prod.yml\`, with no secrets in them.
3. A Postman collection (or a \`requests.http\` file) covering every endpoint, including at least one
   request for each error status in the endpoints table.
4. A README with: how to run each profile, the Swagger UI URL, and the actual responses (status and
   body) for the acceptance criteria — duplicate SKU, the three-field validation failure, the
   negative-stock PATCH, the double DELETE and the malformed price.
5. A short paragraph explaining where each rule is enforced (DTO validation vs service) and why.

**Before you submit, run every acceptance criterion against the running app**, not by reading your
code.`,
      rubric: [
        { criterion: 'Endpoints and HTTP semantics', description: 'All endpoints in the table work; verbs and paths are RESTful; 201 with a working Location on create, 204 on delete, 200 elsewhere; filters on GET /api/products behave as described.', maxPoints: 25 },
        { criterion: 'DTOs and validation', description: 'Separate request and response records; no internal object returned directly; every field rule from the brief enforced with Bean Validation and @Valid; all failed fields reported together.', maxPoints: 20 },
        { criterion: 'Error handling', description: 'One @RestControllerAdvice; one ApiError shape for 400, 404, 409 and 500; malformed JSON and type mismatches are 400; no stack trace in any response; unexpected errors logged in full.', maxPoints: 20 },
        { criterion: 'Business rules and structure', description: 'Unique SKU, existing category and non-negative stock enforced in services with specific exceptions; controllers have no try/catch; packages under the main class; thread-safe in-memory stores.', maxPoints: 15 },
        { criterion: 'Configuration, profiles and logging', description: '@ConfigurationProperties for maxResults and lowStockThreshold; dev and prod profiles differ as specified; seed data only in dev; WARN logged for low stock with placeholders, not concatenation.', maxPoints: 10 },
        { criterion: 'Documentation', description: 'Swagger UI available in dev with tags, operation summaries, documented error responses and request examples; README and Postman collection complete and accurate.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_REST_CHECKPOINT',
    notes: `Ten questions on Spring Boot REST APIs as a backend interview examines them: reading a controller,
a DTO or a config file and saying what a request actually gets back. They cover starters and
auto-configuration, mappings and parameters, request bodies and status codes, validation, global
exception handling, configuration and profiles, and OpenAPI. Answer from what the code does, not
from what it was meant to do.`,
    checkpoint: [
      mcq('@RestController @RequestMapping("/api/orders") class OrderController { @GetMapping("/{id}") ... }. With server.servlet.context-path=/shop, which URL reaches that method?', [
        ['/api/orders/7', false],
        ['/shop/api/orders/7', true],
        ['/api/shop/orders/7', false],
        ['/shop/orders/7', false],
      ], 'The context path prefixes every URL the application serves, then the class mapping, then the method mapping: /shop + /api/orders + /7. Without the prefix the request is a 404.'),
      ck('REST_APIS', 'A client sends GET /api/products?page=two where page is declared @RequestParam(defaultValue = "0") int page. What does it receive?', [
        ['200 with page 0, since the default applies', false],
        ['400, because "two" is not a valid int', true],
        ['500, because Integer.parseInt threw', false],
      ], 'defaultValue is used only when the parameter is absent. A present but unconvertible value fails type conversion, which Spring answers with 400 as a client error.'),
      mcq('public record SignupRequest(@NotBlank String name, @Valid @NotNull AddressDto address) {} and AddressDto has @NotBlank String pincode. The controller uses @Valid @RequestBody. A body has a name and "address": {"pincode": ""}. Result?', [
        ['201, because only top-level fields are checked', false],
        ['400 with a field error on address.pincode', true],
        ['400 with a field error on name and address', false],
      ], '@Valid on the address field cascades validation into AddressDto, so the blank pincode is reported with the path address.pincode. The name is present, so it has no error.'),
      ck('REST_APIS', 'Which pairing of outcome and status code is correct for a REST API?', [
        ['Malformed JSON body → 500 Internal Server Error', false],
        ['Product created → 200 OK with an empty body', false],
        ['Order id not found → 404 Not Found', true],
        ['Duplicate email on signup → 400 with no body', false],
      ], 'A missing resource is 404. Malformed input is the client\'s fault (400), a creation is 201 with the new resource, and a duplicate is a state conflict (409) with an explanatory body.'),
      mcq('An advice method is @ExceptionHandler(RuntimeException.class) returning 500, and there is no handler for ResourceNotFoundException (which extends RuntimeException). GET /api/products/999 hits a missing id. What does the client see?', [
        ['404, because Spring infers it from the exception name', false],
        ['500, because the RuntimeException handler catches it', true],
        ['200 with an empty body, since nothing was returned', false],
      ], 'With no closer match, the RuntimeException handler is the nearest type and answers 500. Spring does not read meaning from exception names; add a specific handler (or @ResponseStatus) for 404.'),
      mcq('application.yml has app.max-results: 50; application-dev.yml has app.max-results: 5. The app runs with the dev profile active. What value does @Value("${app.max-results}") get?', [
        ['50, from the shared application.yml file', false],
        ['5, as profile-specific files override the shared one', true],
        ['Startup fails because the key is defined twice', false],
      ], 'Profile-specific files are loaded on top of the shared file, so for keys defined in both the profile value wins. Defining a key in several sources is normal; precedence decides.'),
      ck('REST_APIS', 'A payment endpoint is POST /api/payments. A mobile client on a flaky network retries the POST after a timeout. What risk does the API designer have to handle?', [
        ['None: POST is idempotent, so the retry is ignored', false],
        ['The customer may be charged twice by the retry', true],
        ['The retry is turned into a GET by most proxies', false],
      ], 'POST is not idempotent: each call may create a new payment. Designers add an idempotency key that the server remembers, so a repeated request returns the first result instead of charging again.'),
      mcq('A @Service logs log.debug("Loaded {} products", list.size()) and the app runs with logging.level.root=INFO and nothing else set. Is the line printed?', [
        ['Yes, DEBUG is above INFO in severity', false],
        ['No, DEBUG is below the INFO threshold', true],
        ['Yes, placeholders force the message out', false],
        ['No, debug() only prints in unit tests', false],
      ], 'Levels go TRACE < DEBUG < INFO < WARN < ERROR, and a logger at INFO drops DEBUG. Placeholders only avoid building the message; set the package to DEBUG to see the line.'),
      mcq('A controller method returns ResponseEntity.created(URI.create("/api/products/42")).body(dto). What does the client receive?', [
        ['200 with the body and a Link header', false],
        ['201 with Location: /api/products/42 and the body', true],
        ['204 with Location: /api/products/42 and no body', false],
        ['302 redirecting to /api/products/42', false],
      ], 'created(uri) sets status 201 and the Location header to the given URI, and body(dto) adds the representation. A redirect or 204 would not return the created product.'),
      mcq('Which change makes Spring Boot use Jetty instead of the default embedded Tomcat?', [
        ['Set server.engine=jetty in application.properties and restart', false],
        ['Exclude the Tomcat starter and add spring-boot-starter-jetty', true],
        ['@EnableJetty on the main class in place of @SpringBootApplication', false],
      ], 'The embedded server is chosen by what is on the classpath. Excluding spring-boot-starter-tomcat from the web starter and adding the Jetty starter switches it; there is no such property or annotation.'),
    ],
  },
];
