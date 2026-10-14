/**
 * Career-track content: Spring Data JPA (JT_BOOT_DATA), for Java Full Stack + AI and Java Backend
 * Engineer.
 *
 * Students arrive having mapped entities, written JPQL and fought N+1 in the Hibernate/JPA topic,
 * and having built controllers, DTOs and one error shape in the Spring Boot REST topic. This topic
 * joins the two: repositories instead of a hand-written EntityManager DAO, derived and @Query
 * methods, paging, and a transactional service between the controller and the database. Spring
 * Boot 3, Java 17, jakarta.persistence, MySQL 8.
 *
 * The topic declares two skills (SPRING_BOOT, JPA_HIBERNATE). REPOSITORIES and QUERIES declare
 * JPA_HIBERNATE themselves; the rest default to SPRING_BOOT, and checkpoint questions that really
 * test JPA behaviour say so with ck().
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_BOOT_DATA_BUNDLES: PilotBundle[] = [
  /* ── REPOSITORIES ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_DATA_REPOSITORIES',
    notes: `In the Hibernate/JPA topic every data-access class looked the same: inject an
\`EntityManager\`, write \`find\`, \`persist\`, a JPQL query for "all", a JPQL query for "by
name". **Spring Data JPA** writes that class for you. You declare an interface; Spring generates the
implementation at startup.

## Connecting Boot to MySQL

\`pom.xml\`:

    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>com.mysql</groupId>
        <artifactId>mysql-connector-j</artifactId>
        <scope>runtime</scope>
    </dependency>

\`application.yml\` (the dev profile — you met profiles in the REST topic):

    spring:
      datasource:
        url: jdbc:mysql://localhost:3306/catalogue?serverTimezone=UTC
        username: catalogue_app
        password: \${DB_PASSWORD}          # from the environment, never committed
      jpa:
        hibernate:
          ddl-auto: update                # dev only; prod uses validate + Flyway
        show-sql: false
        open-in-view: false               # explained in the service-layer unit
    logging:
      level:
        org.hibernate.SQL: DEBUG

With the starter on the classpath, auto-configuration creates a HikariCP \`DataSource\`, an
\`EntityManagerFactory\` (Hibernate 6), a \`JpaTransactionManager\`, and scans for repository
interfaces under the package of your \`@SpringBootApplication\` class. Entities and repositories in a
package **outside** that tree are not found.

## A repository is an interface

    public interface ProductRepository extends JpaRepository<Product, Long> {
    }

The two type arguments are the entity and the type of its \`@Id\`. No class, no \`@Repository\`
annotation (it is harmless but unnecessary). At startup Spring creates a proxy backed by
\`SimpleJpaRepository\`, which holds an \`EntityManager\` and implements every inherited method.

## What you get without writing a line

The interfaces stack up:

- \`Repository\` — a marker; declares nothing.
- \`CrudRepository\` / \`ListCrudRepository\` — \`save\`, \`saveAll\`, \`findById\`, \`findAll\`,
  \`existsById\`, \`count\`, \`deleteById\`, \`delete\`. The \`List\` variant returns \`List\` instead of
  \`Iterable\`.
- \`PagingAndSortingRepository\` / \`ListPagingAndSortingRepository\` — \`findAll(Sort)\`,
  \`findAll(Pageable)\`.
- \`JpaRepository\` — all of the above plus \`flush\`, \`saveAndFlush\`, \`saveAllAndFlush\`,
  \`deleteAllInBatch\`, \`getReferenceById\`.

Using it:

    @Component
    class SeedData implements CommandLineRunner {
        private final ProductRepository products;
        SeedData(ProductRepository products) { this.products = products; }

        @Override public void run(String... args) {
            if (products.count() == 0) {
                products.save(new Product("Steel bottle", "SKU-101", new BigDecimal("499.00")));
            }
            Optional<Product> p = products.findById(1L);
            p.ifPresent(x -> log.info("Loaded {}", x.getName()));
        }
    }

## What save() really does

    @Transactional
    public <S extends T> S save(S entity) {
        if (entityInformation.isNew(entity)) { em.persist(entity); return entity; }
        else { return em.merge(entity); }
    }

"New" means the \`@Id\` is \`null\` (or a \`@Version\` field is \`null\`). Two consequences you already
understand from the persistence-context unit:

- For an existing entity, \`merge\` returns a **different, managed** instance. Always use the return
  value: \`product = repo.save(product);\`
- For an entity that is already managed inside a transaction, \`save\` is unnecessary — dirty
  checking writes the change at commit.

## Transactions you get for free

\`SimpleJpaRepository\` is annotated \`@Transactional(readOnly = true)\` at class level, and its
writing methods (\`save\`, \`delete\`…) are \`@Transactional\`. So each repository call runs in its own
transaction **unless** a caller already started one, in which case it joins it. Two \`save\` calls
from a controller are two separate transactions — the service-layer unit fixes that.

## findById vs getReferenceById

- \`findById(id)\` → \`Optional<Product>\`; runs a SELECT (or uses the persistence context).
- \`getReferenceById(id)\` → a lazy proxy, no SELECT. Ideal for setting a foreign key:
  \`order.setCustomer(customers.getReferenceById(customerId))\`. Touching a field of a missing
  row throws \`EntityNotFoundException\`.

## Common mistakes

- \`findById(id).get()\` — throws a bare \`NoSuchElementException\`. Use
  \`orElseThrow(() -> new ResourceNotFoundException("Product", id))\` so your
  \`@RestControllerAdvice\` turns it into a 404.
- Declaring \`JpaRepository<Product, Integer>\` when the id is \`Long\` — \`findById\` then takes the
  wrong type and fails at runtime.
- Calling \`deleteAll()\` on a big table: it loads every entity and deletes one by one.
  \`deleteAllInBatch()\` is a single \`DELETE\`, but skips cascades and lifecycle callbacks.`,
    workedExample: `**Problem:** the product catalogue API from the REST topic stores products in a
\`HashMap\`. Move it to MySQL without changing a single endpoint.

**Step 1 — dependencies and config.** Add \`spring-boot-starter-data-jpa\` and
\`mysql-connector-j\`; put the datasource in \`application-dev.yml\` with the password from
\`\${DB_PASSWORD}\`.

**Step 2 — make Product an entity.** \`@Entity\`, \`@Id @GeneratedValue(strategy = IDENTITY) Long id\`,
\`@Column(unique = true) String sku\`, a protected no-arg constructor.

**Step 3 — replace the map with a repository.**

    public interface ProductRepository extends JpaRepository<Product, Long> {}

**Step 4 — swap the calls in the service.**

    map.values()          ->  repo.findAll()
    map.get(id)           ->  repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Product", id))
    map.put(id, p)        ->  p = repo.save(p)
    map.remove(id)        ->  repo.deleteById(id)

**Step 5 — check the SQL.** Start the app, call \`GET /api/products/1\`, and read one
\`select ... from products p1_0 where p1_0.id=?\` in the log. The controller and DTOs did not change,
which is the payoff of keeping the controller unaware of storage.`,
    mcqs: [
      mcq('`interface OrderRepository extends JpaRepository<Order, Long> {}` compiles, and nothing implements it. How does a service still get a working OrderRepository injected?', [
        ['Spring generates a proxy backed by SimpleJpaRepository at startup', true],
        ['The Java compiler writes an implementing class during the build', false],
        ['Hibernate maps the interface itself as an entity in its own table', false],
        ['Injection fails until a class annotated @Repository implements it', false],
      ], 'Spring Data scans for repository interfaces and creates a proxy for each, delegating to SimpleJpaRepository, which implements the inherited methods with an EntityManager.'),
      mcq('A detached Product with id 7 is passed to `repo.save(p)` and the code keeps using `p` afterwards. Why can later changes to `p` be lost?', [
        ['save copies the id to a new row and deletes the old row', false],
        ['save ignores any object that was not loaded in this request', false],
        ['save merges it, and the managed copy is the returned object', true],
      ], 'For an entity with a non-null id, save calls merge, which copies the state onto a managed instance and returns that. The original argument stays detached, so changes to it are not tracked.'),
      mcq('A Spring Boot app keeps entities in com.shop.model and the main class in com.shop.app. Repositories in com.shop.app.repo fail with "Not a managed type: Product". What is the cause?', [
        ['Product has no @Repository annotation on it', false],
        ['The entity package is outside the scanned tree', true],
        ['MySQL has not created the products table yet', false],
        ['JpaRepository cannot be used with a Long id', false],
      ], 'Boot scans entities and repositories from the package of the @SpringBootApplication class downwards. com.shop.model is a sibling, so Product is never registered; move the main class up to com.shop or add @EntityScan.'),
    ],
    checkpoint: [
      mcq('A controller calls `productRepo.save(a); productRepo.save(b);` with no @Transactional anywhere. The second save fails. What is in the database?', [
        ['Neither row, as both calls share one transaction', false],
        ['Row b only, because it was the last call made', false],
        ['Both rows, because Spring retries the failed one', false],
        ['Row a is committed, since each save had its own', true],
      ], 'SimpleJpaRepository marks save as @Transactional, so with no outer transaction each call starts and commits its own. The first is already committed when the second fails.'),
      mcq('Which repository call sets an order\'s customer from a known customerId without running a SELECT on customers?', [
        ['customers.findById(customerId).get()', false],
        ['customers.existsById(customerId)', false],
        ['customers.getReferenceById(customerId)', true],
        ['customers.findAll().get(customerId)', false],
      ], 'getReferenceById returns an uninitialised proxy holding only the id, which is all Hibernate needs to write the foreign key. findById and existsById both query the table.'),
      mcq('A nightly cleanup calls `auditLogRepo.deleteAll()` on a table of 400,000 rows and takes minutes. What is it doing?', [
        ['Locking each row one at a time before dropping the table', false],
        ['Loading every entity and deleting them one at a time', true],
        ['Copying the table to a backup before removing the rows', false],
        ['Waiting on a TRUNCATE that runs inside a transaction', false],
      ], 'deleteAll() calls findAll and then delete per entity so cascades and callbacks run. deleteAllInBatch() issues a single DELETE statement instead, at the cost of skipping those.'),
    ],
  },

  /* ── QUERIES ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_DATA_QUERIES',
    notes: `\`findById\` and \`findAll\` cover a handful of screens. Everything else — products in a
price range, orders by status, a search box — is a query you declare on the repository.

## Derived queries: the method name is the query

    public interface ProductRepository extends JpaRepository<Product, Long> {
        List<Product> findByStatus(ProductStatus status);
        Optional<Product> findBySku(String sku);
        List<Product> findByPriceBetween(BigDecimal min, BigDecimal max);
        List<Product> findByNameContainingIgnoreCase(String text);
        List<Product> findByCategoryNameOrderByPriceDesc(String categoryName);
        List<Product> findTop5ByStatusOrderByCreatedAtDesc(ProductStatus status);
        boolean existsBySku(String sku);
        long countByStatus(ProductStatus status);
    }

Spring parses the name: a subject (\`find…By\`, \`exists…By\`, \`count…By\`, \`delete…By\`,
\`findTop5…By\`), then property expressions joined by \`And\`/\`Or\`, each with an optional operator —
\`Between\`, \`LessThan\`, \`GreaterThanEqual\`, \`Like\`, \`Containing\`, \`StartingWith\`, \`In\`,
\`IsNull\`, \`True\`, \`IgnoreCase\` — and an optional \`OrderBy…Asc/Desc\`. \`CategoryName\` walks the
association \`product.category.name\` and produces a join.

**Names are checked at startup.** A typo — \`findByNmae\` — stops the application with
\`PropertyReferenceException: No property 'nmae' found for type 'Product'\`. That is a feature: the
mistake cannot reach production.

Return types: \`List<T>\`, \`Optional<T>\`, a bare \`T\` (null if none), \`Stream<T>\` (inside a
transaction, closed with try-with-resources), \`Page<T>\`/\`Slice<T>\`. A single-value return type
when several rows match throws \`IncorrectResultSizeDataAccessException\`.

**When to stop:** \`findByStatusAndCategoryNameAndPriceLessThanAndNameContainingIgnoreCase\` works,
and nobody can read it. Past two or three conditions, write the query.

## @Query: JPQL you write yourself

    @Query("""
           select p from Product p
           where p.category.id = :categoryId and p.price <= :maxPrice
           order by p.price
           """)
    List<Product> findAffordableInCategory(@Param("categoryId") Long categoryId,
                                           @Param("maxPrice") BigDecimal maxPrice);

The JPQL is the same language as the JPQL unit: entity and field names, not tables and columns.
Spring validates it at startup too. Named parameters with \`@Param\` survive reordering arguments;
positional \`?1\` does not.

**Fixing N+1 at the repository:**

    @Query("select o from Order o join fetch o.customer where o.status = :status")
    List<Order> findWithCustomerByStatus(@Param("status") OrderStatus status);

    @EntityGraph(attributePaths = {"customer"})
    List<Order> findByStatus(OrderStatus status);      // same effect on a derived query

## Native queries

    @Query(value = "SELECT * FROM products WHERE MATCH(name) AGAINST (:q)", nativeQuery = true)
    List<Product> fullTextSearch(@Param("q") String q);

Use native SQL for what JPQL cannot express — MySQL full-text search, window functions, vendor
hints. The price: table and column names are hard-coded, and the query is not checked at startup.

## Modifying queries

    @Modifying(clearAutomatically = true)
    @Transactional
    @Query("update Product p set p.status = 'DISCONTINUED' where p.stock = 0")
    int discontinueOutOfStock();

\`@Modifying\` is required for UPDATE/DELETE, and it must run in a transaction. A bulk update goes
straight to the database **around** the persistence context, so entities already loaded keep their
old values — \`clearAutomatically = true\` clears the context afterwards.

## Projections: return only the columns you need

A list page needs id, name and price, not twelve columns and two associations.

**Interface projection** — Spring selects only the getters' properties:

    public interface ProductSummary {
        Long getId();
        String getName();
        BigDecimal getPrice();
    }
    List<ProductSummary> findByStatus(ProductStatus status);

**Class/record projection** — a DTO built by the query:

    public record ProductRow(Long id, String name, BigDecimal price) {}

    @Query("select new com.shop.dto.ProductRow(p.id, p.name, p.price) from Product p where p.status = :s")
    List<ProductRow> listRows(@Param("s") ProductStatus s);

Projections are read-only: they are not managed, so changing them writes nothing. That is exactly
what a listing endpoint wants.

## Common mistakes

- \`findByname\` (lower-case n) — property names are capitalised in the method name.
- Forgetting \`@Modifying\` on an UPDATE \`@Query\` — "Not supported for DML operations".
- Concatenating user input into a native query string — SQL injection, exactly as in JDBC.
  Always bind parameters.
- \`Optional<Product> findByCategoryId(...)\` when a category has many products — throws as soon as
  a second product is added.`,
    mcqs: [
      mcq('The repository declares `List<Product> findByNmae(String name);`. When does the mistake surface?', [
        ['The first time a request calls the method', false],
        ['At startup, when the method name is parsed', true],
        ['Never; the method silently returns an empty list', false],
        ['At compile time, as an error from javac', false],
      ], 'Spring Data parses every derived query method while creating the repository proxy. An unknown property throws PropertyReferenceException and the context fails to start.'),
      mcq('`Optional<Product> findByCategoryId(Long categoryId)` worked in testing. In production a category has 40 products. What happens on the call?', [
        ['It returns the first product, ordered by id', false],
        ['It returns Optional.empty() without any error', false],
        ['It throws IncorrectResultSizeDataAccessException', true],
        ['It returns the most recently added of the 40', false],
      ], 'A single-value return type promises at most one row. When the query returns more, Spring Data throws IncorrectResultSizeDataAccessException; the method should return a List or a Page.'),
      mcq('A listing endpoint shows id, name and price of 500 products. Which repository method fits best?', [
        ['List<Product> findAll() mapped to DTOs in the controller', false],
        ['List<ProductSummary> findByStatus(...) with three getters', true],
        ['A native SELECT * query that returns List<Object[]>', false],
      ], 'An interface projection makes Spring select only the three columns, and the result is read-only. Loading full entities fetches every column and risks lazy loading during mapping.'),
    ],
    checkpoint: [
      mcq(`What does this method do when it runs inside a transaction?

    @Query("update Product p set p.price = p.price * 0.9 where p.category.id = :id")
    int discount(@Param("id") Long id);`, [
        ['Updates the prices and returns the count of rows changed', false],
        ['Fails, because an UPDATE @Query also needs @Modifying', true],
        ['Loads each product and lets dirty checking write prices', false],
        ['Returns the number of products without changing them', false],
      ], '@Query defaults to a SELECT. Without @Modifying Spring calls getResultList on an UPDATE and Hibernate rejects it as a DML operation; @Modifying makes it call executeUpdate.'),
      mcq('After `repo.discontinueOutOfStock()` (a @Modifying bulk update without clearAutomatically), the same transaction reads a product loaded earlier. Which status does it see?', [
        ['The old status still held in the persistence context', true],
        ['The new status, because bulk updates refresh entities', false],
        ['Null, since bulk updates detach every loaded entity', false],
        ['An error about a stale entity in the context cache', false],
      ], 'A JPQL bulk update goes straight to the database and bypasses the persistence context. Entities already loaded keep their old field values until the context is cleared or refreshed.'),
      mcq('A search box passes text into `@Query(value = "SELECT * FROM products WHERE name LIKE \'%" + q + "%\'", nativeQuery = true)` built by string concatenation in a custom method. What is the risk?', [
        ['The query cannot use the index on name', false],
        ['SQL injection through the search text', true],
        ['Hibernate caches a separate plan per input', false],
        ['MySQL rejects LIKE inside a native query', false],
      ], 'Concatenating user input into SQL lets a crafted string change the query. Bind it as a parameter (:q with CONCAT(\'%\', :q, \'%\')), exactly as PreparedStatement did in JDBC.'),
    ],
  },

  /* ── PAGINATION_SORTING ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_DATA_PAGINATION_SORTING',
    notes: `\`GET /api/products\` returning \`repo.findAll()\` is fine with 30 products in dev. In
production the table has 80,000 rows, the response is 40 MB, and the browser hangs. A list
endpoint must **page**: return one slice and tell the client how to get the next.

## Pageable and Page

    Pageable pageable = PageRequest.of(0, 20, Sort.by("price").descending());
    Page<Product> page = productRepo.findAll(pageable);

    page.getContent();        // the 20 products on this page
    page.getNumber();         // 0 — page numbers start at ZERO
    page.getSize();           // 20
    page.getTotalElements();  // 80000
    page.getTotalPages();     // 4000
    page.isFirst(); page.isLast(); page.hasNext();

Hibernate turns this into two statements:

    select ... from products p1_0 order by p1_0.price desc limit ?, ?   -- the page
    select count(p1_0.id) from products p1_0                            -- for the totals

Any query method can take a \`Pageable\` as its last parameter:

    Page<Product> findByStatus(ProductStatus status, Pageable pageable);

## Slice: when you do not need a total

\`Page\` always runs the count query, which on a large filtered table can cost more than the page
itself. \`Slice<T>\` fetches \`size + 1\` rows to know whether there is a next page and skips the count
— right for infinite scroll, where the UI only needs "load more".

## Sorting

    Sort sort = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id"));
    List<Product> all = productRepo.findAll(sort);

Always add a **unique tie-breaker** (usually \`id\`). If 300 products share a price, MySQL may
return them in a different order on each query, and a product can appear on page 1 *and* page 2
while another never appears.

## Paging in the controller

Spring MVC resolves a \`Pageable\` straight from query parameters:

    @GetMapping
    public Page<ProductDto> list(
            @PageableDefault(size = 20, sort = "name") Pageable pageable) {
        return productService.list(pageable);
    }

    GET /api/products?page=2&size=50&sort=price,desc&sort=id,asc

\`page\` is zero-based. \`size\` is capped by \`spring.data.web.pageable.max-page-size\` (default 2000 —
lower it, e.g. to 100). If your frontend counts from 1, either subtract one in the client or set
\`spring.data.web.pageable.one-indexed-parameters=true\` — pick one and document it.

## Return a page of DTOs, in a stable shape

    public Page<ProductDto> list(Pageable pageable) {
        return productRepo.findAll(pageable).map(ProductDto::from);
    }

Serialising \`PageImpl\` directly gives a JSON shape that Spring Data does not promise to keep (Boot
3.3+ logs a warning). Either enable \`@EnableSpringDataWebSupport(pageSerializationMode = VIA_DTO)\`
or return your own record:

    public record PageResponse<T>(List<T> items, int page, int size, long totalItems, int totalPages) {
        static <T> PageResponse<T> of(Page<T> p) {
            return new PageResponse<>(p.getContent(), p.getNumber(), p.getSize(),
                                      p.getTotalElements(), p.getTotalPages());
        }
    }

## Paging pitfalls

- **Sorting on whatever the client sends.** \`?sort=passwordHash\` or a non-existent property throws
  \`PropertyReferenceException\` → 500. Whitelist sortable fields.
- **Join-fetching a collection with paging** — Hibernate pages in memory with warning HHH90003004
  (you met this in the fetching unit). Page the parent ids first.
- **A custom @Query with joins** may need an explicit \`countQuery\`, because the derived count of a
  complex query can be wrong or slow.
- **Deep pages are slow.** \`limit 400000, 20\` makes MySQL read and discard 400,000 rows. For deep
  scrolling, use keyset paging: \`where id > :lastSeenId order by id limit 20\`.`,
    mcqs: [
      mcq('A React table shows "Page 1" and calls `/api/products?page=1&size=20` for it, with Spring\'s default Pageable settings. What does the user see?', [
        ['Products 1 to 20, as expected', false],
        ['An error, as page 1 is not valid', false],
        ['Every product, since size is ignored', false],
        ['Products 21 to 40, the second page', true],
      ], 'Spring Data pages are zero-based, so page=1 is the second page. Either send page - 1 from the client or set one-indexed-parameters=true on the server, consistently.'),
      mcq('An infinite-scroll feed needs only "is there more?". Why return Slice<Post> rather than Page<Post>?', [
        ['A Slice caches pages so scrolling back up is free', false],
        ['A Slice sorts the rows without needing an ORDER BY', false],
        ['A Slice skips the count query that Page always runs', true],
        ['A Slice streams every remaining row to the client', false],
      ], 'Page needs totalElements, so it runs a COUNT on every request. Slice fetches one extra row to answer hasNext and never counts, which is cheaper on a large filtered table.'),
      mcq('Products are paged with `sort=price` only, and many share a price. Users report a product on both page 2 and page 3. What fixes it?', [
        ['Add id as a second sort key so the order is total', true],
        ['Switch from Page to Slice so no count query runs', false],
        ['Raise the page size so fewer pages are requested', false],
        ['Cache the first page so it cannot change later on', false],
      ], 'With ties, MySQL may order equal prices differently on each query, so rows shift between pages. A unique tie-breaker such as id makes the order deterministic.'),
    ],
    checkpoint: [
      mcq('For `PageRequest.of(3, 25)` against 180 matching rows, what do getContent().size() and getTotalPages() return?', [
        ['25 and 7', false],
        ['5 and 8', false],
        ['25 and 8', true],
        ['5 and 7', false],
      ], '180 rows at 25 per page make 8 pages (0 to 7). Page index 3 covers rows 75 to 99, which is a full page of 25.'),
      mcq('A client calls `/api/orders?sort=internalNotesHash`, a property Order does not have. What does the API return if nothing guards it?', [
        ['A page sorted by id, the default fallback', false],
        ['An unsorted page with the property ignored', false],
        ['A 500 caused by a PropertyReferenceException', true],
        ['A 400 produced by Bean Validation on Pageable', false],
      ], 'Spring Data builds the ORDER BY from the Sort, finds no such property and throws. Unless a handler maps it, the client sees a 500 — so sortable fields should be whitelisted.'),
      mcq('An admin screen jumps to page 20,000 of an orders table with size 20 and it takes seconds. Which approach removes the cost?', [
        ['Lowering the page size to 10 rows', false],
        ['Keyset paging on id > the last seen id', true],
        ['Adding a second ORDER BY on created_at', false],
        ['Switching to Page from a List result', false],
      ], 'An offset of 400,000 forces MySQL to read and discard every earlier row. Keyset paging seeks straight to the last id through the index, so deep pages cost the same as the first.'),
    ],
  },

  /* ── SERVICE_TRANSACTIONS ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_DATA_SERVICE_TRANSACTIONS',
    notes: `With repositories in place, the API has three layers, and each has one job:

- **Controller** — HTTP: paths, status codes, \`@Valid\` DTOs in and out. No business rules.
- **Service** — the use case: "place an order", "restock a product". Business rules, the
  **transaction boundary**, and mapping entities to DTOs.
- **Repository** — data access only.

## Why the transaction belongs on the service

Placing an order changes three things: stock goes down, an order is inserted, its lines are inserted.
Either all three happen or none do. A repository call is its own transaction, so the boundary has to
be one level up:

    @Service
    @Transactional(readOnly = true)                 // default for every method
    public class OrderService {

        private final OrderRepository orders;
        private final ProductRepository products;
        private final CustomerRepository customers;

        public OrderService(OrderRepository o, ProductRepository p, CustomerRepository c) {
            this.orders = o; this.products = p; this.customers = c;
        }

        @Transactional                              // read-write for this method
        public OrderDto place(PlaceOrderRequest req) {
            Order order = new Order(customers.getReferenceById(req.customerId()));
            for (LineRequest l : req.lines()) {
                Product p = products.findById(l.productId())
                        .orElseThrow(() -> new ResourceNotFoundException("Product", l.productId()));
                if (p.getStock() < l.quantity()) throw new InsufficientStockException(p.getSku());
                p.setStock(p.getStock() - l.quantity());       // no save: p is managed
                order.addLine(p, l.quantity());
            }
            return OrderDto.from(orders.save(order));            // mapped INSIDE the transaction
        }

        public OrderDto get(Long id) {
            return orders.findWithLinesById(id).map(OrderDto::from)
                    .orElseThrow(() -> new ResourceNotFoundException("Order", id));
        }
    }

If \`InsufficientStockException\` (a \`RuntimeException\`) is thrown on the third line, the stock
already decremented on lines one and two is rolled back. The \`ResourceNotFoundException\` reaches the
\`@RestControllerAdvice\` you wrote in the REST topic and becomes a 404.

## The rules @Transactional plays by

You met the proxy in Spring Core; here is what it means day to day.

- **Rollback** happens for \`RuntimeException\` and \`Error\`. A **checked** exception commits
  unless you say \`@Transactional(rollbackFor = Exception.class)\`.
- **Only calls through the proxy are intercepted.** \`this.helper()\` from inside the same class
  skips the proxy, so \`@Transactional\` on \`helper()\` does nothing. Move it to another bean.
- **Private methods are not proxied.** \`@Transactional\` on a \`private\` method is silently ignored.
- **readOnly = true** lets Hibernate skip dirty checking and snapshots, and the MySQL driver may use
  a read-only transaction. Use it on query methods.
- **Propagation** defaults to \`REQUIRED\`: join the caller's transaction or start one.
  \`REQUIRES_NEW\` suspends it and starts a fresh one — right for an audit log that must be kept
  even if the business transaction rolls back.
- Catching an exception inside the transaction and carrying on does not save you: if a repository
  call already marked the transaction rollback-only, commit fails with
  \`UnexpectedRollbackException\`.

## Keep entities out of the API

Return DTOs from the service, never entities, because:

1. **Lazy loading after the transaction.** With \`spring.jpa.open-in-view=false\`, Jackson touching
   \`order.getLines()\` after the service returned throws \`LazyInitializationException\`.
2. **Infinite recursion.** \`Order → lines → order → lines…\` makes Jackson overflow the stack.
3. **Leaking fields.** \`passwordHash\`, internal flags and every future column become part of the
   public API.

Map inside the transaction, and fetch what the DTO needs in the query (\`join fetch\` or
\`@EntityGraph\`) so the mapping does not trigger N+1.

## open-in-view: turn it off

Boot enables \`spring.jpa.open-in-view\` by default and logs a warning. It keeps the
\`EntityManager\` open until the HTTP response is written, so lazy loading "works" in controllers
and during JSON serialisation — by firing queries outside any transaction, on a connection held for
the whole request, often in an N+1 pattern nobody sees. Set it to \`false\`, and let a
\`LazyInitializationException\` tell you exactly which data the service forgot to fetch.

## Optimistic locking, briefly

Two admins edit the same product at once; the second save silently overwrites the first. Add

    @Version private Long version;

and Hibernate writes \`update ... where id=? and version=?\`. If nothing matched, it throws
\`ObjectOptimisticLockingFailureException\`; map it to 409 Conflict in your advice.`,
    workedExample: `**Problem:** \`GET /api/orders/42\` works in dev but, after someone set
\`open-in-view: false\` in prod, returns 500 with \`LazyInitializationException: could not initialize
proxy - no Session\`. The controller is:

    @GetMapping("/{id}")
    public Order get(@PathVariable Long id) {
        return orderService.find(id);      // returns the entity
    }

**Diagnosis.** The service's transaction ends when \`find\` returns. Jackson then serialises the
entity, reaches \`lines\` (a lazy collection), and there is no session to load it. In dev,
open-in-view kept the session open, hiding the problem — and firing one query per line's product.

**Fix in three moves.**

1. Fetch what the response needs, in one query:

       @EntityGraph(attributePaths = {"lines", "lines.product", "customer"})
       Optional<Order> findWithLinesById(Long id);

2. Map inside the transaction:

       @Transactional(readOnly = true)
       public OrderDto get(Long id) {
           return orders.findWithLinesById(id).map(OrderDto::from)
                   .orElseThrow(() -> new ResourceNotFoundException("Order", id));
       }

3. Return the DTO from the controller: \`public OrderDto get(...)\`.

**Result:** one SELECT with joins, no lazy loading after the transaction, no recursion, and the
JSON contains only the fields \`OrderDto\` declares.`,
    mcqs: [
      mcq('`placeOrder()` is @Transactional and throws a checked `PaymentDeclinedException` after the stock update. Nothing else is configured. What happens to the stock?', [
        ['It is rolled back, as any exception rolls back', false],
        ['It is left locked until the request times out', false],
        ['It is rolled back only if the exception is logged', false],
        ['It is committed, as checked exceptions commit', true],
      ], 'By default Spring rolls back on RuntimeException and Error only. A checked exception lets the transaction commit unless rollbackFor names it, so the stock change is kept.'),
      mcq('An audit row must be saved even when the order transaction around it rolls back. Which setting on `AuditService.record()` does that?', [
        ['@Transactional(readOnly = true)', false],
        ['@Transactional(propagation = REQUIRED)', false],
        ['@Transactional(propagation = REQUIRES_NEW)', true],
        ['@Transactional(rollbackFor = Exception.class)', false],
      ], 'REQUIRES_NEW suspends the caller\'s transaction and commits its own independently. REQUIRED would join the order transaction and be rolled back with it.'),
      mcq('Which is the strongest reason for a service to return OrderDto instead of the Order entity to the controller?', [
        ['Entities cannot be converted to JSON by Jackson', false],
        ['DTOs are faster to create than JPA entity objects', false],
        ['Spring rejects entities as controller return values', false],
        ['Lazy fields get touched after the transaction has ended', true],
      ], 'Once the service returns, the persistence context is gone; serialising lazy associations then fails or, with open-in-view, fires hidden queries. A DTO built inside the transaction carries exactly what the response needs.'),
    ],
    checkpoint: [
      mcq(`Why is no UPDATE missing here, even though save is never called?

    @Transactional
    public void restock(Long id, int qty) {
        Product p = products.findById(id).orElseThrow();
        p.setStock(p.getStock() + qty);
    }`, [
        ['findById returns a detached copy that saves itself', false],
        ['setStock calls the repository save method internally', false],
        ['Spring Data flushes every entity after each getter call', false],
        ['p is managed, so dirty checking writes it at commit', true],
      ], 'Inside the transaction the loaded product is managed. At commit Hibernate compares it with its snapshot, sees the changed stock and issues the UPDATE itself.'),
      mcq('With Boot\'s default open-in-view still on, a controller returns entities and the page loads fine but slowly. What is open-in-view hiding?', [
        ['Lazy loads during JSON writing, often as N+1 queries', true],
        ['A connection leak that Hikari fixes on every request', false],
        ['Transactions that never commit until the app restarts', false],
        ['Second-level cache misses on every entity it touches', false],
      ], 'open-in-view keeps the EntityManager open while the response is written, so lazy associations load one by one during serialisation, outside any transaction. Turning it off exposes those loads as exceptions.'),
      mcq('Two admins load product 9 (version 3) and both submit edits. The entity has `@Version Long version`. What happens to the second save?', [
        ['It overwrites the first admin\'s edit without any error', false],
        ['It waits on a row lock until the first admin logs out', false],
        ['It fails with an optimistic locking exception', true],
        ['It is merged field by field with the first edit', false],
      ], 'The first update bumps the version to 4. The second sends where version=3, matches no row, and Spring throws ObjectOptimisticLockingFailureException, which the API should map to 409.'),
    ],
  },

  /* ── DEBUGGING ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_DATA_DEBUGGING',
    notes: `Spring Data bugs come in two kinds: the app refuses to start (good — the message names
the problem), or it starts and does something subtly wrong (read the SQL log). Keep these on while
debugging:

    logging.level.org.hibernate.SQL=DEBUG
    logging.level.org.hibernate.orm.jdbc.bind=TRACE
    logging.level.org.springframework.transaction=DEBUG     # shows where transactions begin and end

## 1. The app will not start: "No property 'titel' found for type 'Book'"

**Cause:** a derived query method name does not match a field — \`findByTitel\`, or \`findByname\`
with a lower-case property, or a field that was renamed while the method was not.
**Fix:** match the Java field name exactly, capitalised: \`findByTitle\`. Read the last
\`Caused by:\` line of the startup stack trace; it names the repository and the method.

## 2. LazyInitializationException after the service returns

**Symptom:** \`could not initialize proxy [Order#42] - no Session\` in the controller or during JSON
serialisation.
**Cause:** the service returned an entity; its transaction ended; something touched a lazy
association afterwards.
**Fix:** fetch what is needed with \`join fetch\`/\`@EntityGraph\` and map to a DTO **inside** the
service method. Do not "fix" it with \`FetchType.EAGER\` or by turning open-in-view back on.

## 3. @Transactional that does nothing

**Symptom:** a failure halfway leaves half the rows written.
**Cause:** \`@Transactional\` is on a \`private\` method, or on a method called as \`this.method()\`
from the same class. Both bypass the Spring proxy, so no transaction starts.
**Fix:** make the method \`public\` and call it from another bean (or put \`@Transactional\` on the
public entry point). The transaction DEBUG log shows whether "Creating new transaction" appears.

## 4. Page index off by one

**Symptom:** the first page of the UI never shows the first 20 products; the last page is empty.
**Cause:** the frontend counts pages from 1, Spring from 0.
**Fix:** send \`page - 1\`, or set \`spring.data.web.pageable.one-indexed-parameters=true\` — one or
the other, not both.

## 5. Data vanishes on every restart

**Symptom:** test data entered yesterday is gone each morning.
**Cause:** \`spring.jpa.hibernate.ddl-auto=create\` (or \`create-drop\`) — Hibernate drops and
recreates the tables at startup. Sometimes it is set in a profile file nobody checked.
**Fix:** \`update\` for local dev at most; \`validate\` or \`none\` everywhere else, with schema changes
in Flyway migrations.

## 6. Open-in-view hiding N+1

**Symptom:** \`/api/orders\` is fast with 10 orders and takes 4 seconds with 500; the log shows one
\`select ... from customers where id=?\` per order, **after** the service log line.
**Cause:** the controller returns entities, open-in-view keeps the session alive, and Jackson lazily
loads each customer during serialisation.
**Fix:** \`spring.jpa.open-in-view=false\`, an \`@EntityGraph(attributePaths = "customer")\` on the
query, and a DTO.

## 7. StackOverflowError / "Infinite recursion" in the response

**Symptom:** \`HttpMessageNotWritableException: Could not write JSON: Infinite recursion\`.
**Cause:** the controller returns an entity with a bidirectional relationship — \`Order.lines\` →
\`OrderLine.order\` → \`Order.lines\`…
**Fix:** return DTOs. \`@JsonIgnore\`/\`@JsonManagedReference\` silence it, but leave the entity as your
public API.

## 8. "Not supported for DML operations"

**Cause:** an UPDATE/DELETE \`@Query\` without \`@Modifying\`.
**Fix:** add \`@Modifying\` and make sure a transaction is active.`,
    mcqs: [
      mcq('A service class has `public void importAll(List<Row> rows) { for (Row r : rows) this.importOne(r); }` and `@Transactional public void importOne(Row r)`. Row 50 fails. What is in the database?', [
        ['Nothing, because all rows shared one transaction', false],
        ['Only row 50 is missing; the rest were all committed', false],
        ['Rows 1 to 49, each written outside a transaction', true],
        ['Only the first row, since the proxy commits once', false],
      ], 'this.importOne() is a self-call that bypasses the proxy, so @Transactional never applies. Each repository save commits on its own, leaving rows 1 to 49 and no rollback.'),
      mcq('Every morning the dev database is empty, though nobody deletes data. application-dev.yml has `ddl-auto: create`. Why?', [
        ['Hibernate drops and recreates the tables at each startup', true],
        ['MySQL clears InnoDB tables that have no foreign keys', false],
        ['HikariCP truncates tables when its connections expire', false],
        ['Spring Data deletes rows it did not insert in that run', false],
      ], 'create tells Hibernate to drop the schema and generate it again whenever the application starts. Use update locally at most, and validate or none elsewhere with migrations.'),
      mcq('The log shows the service line "loaded 300 orders", then 300 customer SELECTs. open-in-view is on and the controller returns `List<Order>`. Where do the 300 queries come from?', [
        ['The repository query, which loads customers eagerly', false],
        ['Jackson touching each lazy customer while writing JSON', true],
        ['Hikari validating the connection before every row', false],
        ['The second-level cache refreshing each customer', false],
      ], 'Because the queries appear after the service finished, they come from serialisation: open-in-view keeps the session alive, and each lazy customer is loaded one by one as Jackson reads it.'),
      mcq('Returning a `Category` entity from a controller fails with "Could not write JSON: Infinite recursion". What is the root fix?', [
        ['Mark Category.products as FetchType.EAGER', false],
        ['Raise the JVM stack size with the -Xss flag', false],
        ['Map Category to a DTO without back references', true],
        ['Turn open-in-view on so serialising can finish', false],
      ], 'Category references products and each product references its category, so Jackson loops. A DTO carries only the fields the client needs and has no cycle; a bigger stack just delays the overflow.'),
    ],
  },

  /* ── PRACTICE ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_DATA_PRACTICE',
    notes: `Use the product catalogue API from the REST topic and move it onto MySQL 8. Keep
\`org.hibernate.SQL\` at DEBUG and \`spring.jpa.open-in-view=false\` throughout, and for each exercise
**predict the SQL before you run it**.

## Exercise 1 — Repositories and seed data

Create \`Category\` and \`Product\` entities (\`@ManyToOne\` from product to category) and a
\`JpaRepository\` for each. Write a \`CommandLineRunner\` under a \`dev\` profile that inserts three
categories and 30 products only if the table is empty (\`count() == 0\`). Replace the \`HashMap\` in
your service with the repository; every existing endpoint must still pass its Postman calls.

## Exercise 2 — Six query methods

Add, and call each once from a test endpoint or a \`@DataJpaTest\`:
(a) \`findBySku\` returning \`Optional\`; (b) products in a price range; (c) name contains text,
ignoring case; (d) the five newest products in a category, by category **name**; (e) a JPQL
\`@Query\` for products whose stock is below a threshold, with named parameters; (f) an interface
projection \`ProductSummary\` (id, name, price) for the list page. Then misspell one method name and
read the startup error.

## Exercise 3 — A paged, sorted list endpoint

Change \`GET /api/products\` to take a \`Pageable\` with \`@PageableDefault(size = 20, sort = "name")\`.
Cap \`max-page-size\` at 100. Return your own \`PageResponse<ProductDto>\` record. Whitelist the sort
fields (name, price, createdAt) and answer 400 for anything else through your
\`@RestControllerAdvice\`. Call \`?page=0&size=5&sort=price,desc&sort=id,asc\` and read both SQL
statements.

## Exercise 4 — A transactional use case

Add \`OrderService.place(PlaceOrderRequest)\` that checks stock, decrements it and creates the order
with its lines. Throw \`InsufficientStockException\` (a \`RuntimeException\`) when any line cannot be
filled, and prove with a test that the earlier lines' stock is unchanged after the failure. Then
change the exception to a checked one and observe that the stock **is** decremented — fix it with
\`rollbackFor\`.

## Exercise 5 — Break and fix the boundary

Return the \`Order\` entity from \`GET /api/orders/{id}\` and observe the
\`LazyInitializationException\`. Fix it with an \`@EntityGraph\` repository method and an \`OrderDto\`
mapped inside the service. Count the statements before and after.

## Exercise 6 — Bulk update and optimistic locking

Write a \`@Modifying\` query that marks all zero-stock products DISCONTINUED and returns the count.
Then add \`@Version\` to \`Product\`, update the same product from two \`curl\` calls carrying the same
version, and map \`ObjectOptimisticLockingFailureException\` to 409 Conflict.`,
    mcqs: [
      mcq('In Exercise 1, the seed runner must not insert the 30 products a second time on restart. Which check fits?', [
        ['productRepo.findAll().isEmpty() before each save', false],
        ['productRepo.existsById(1L) inside the loop', false],
        ['Rely on ddl-auto=create to clear the table', false],
        ['productRepo.count() == 0 once before seeding', true],
      ], 'count() runs a single SELECT COUNT and answers whether the table is empty. findAll loads every row just to test emptiness, and relying on create would wipe real data.'),
      mcq('Exercise 2(d) asks for the five newest products in a category given its name. Which derived method is right?', [
        ['findTop5ByCategoryNameOrderByCreatedAtDesc(String name)', true],
        ['findByCategoryNameTop5OrderByCreatedAtDesc(String name)', false],
        ['findTop5ByCategoryOrderByCreatedAtDesc(String name)', false],
        ['findFirst5ByNameOrderByCreatedAtAscending(String name)', false],
      ], 'Top5 belongs in the subject before By, CategoryName walks product.category.name, and OrderByCreatedAtDesc sorts newest first. Category alone would compare the entity with a String.'),
      mcq('Exercise 3 calls `?page=0&size=5&sort=price,desc&sort=id,asc` on a Page method. How many SQL statements should the log show?', [
        ['One, with LIMIT and ORDER BY together', false],
        ['Two: the page query and a count query', true],
        ['Five, one for each product on the page', false],
        ['Three: page, count and a sort validation', false],
      ], 'A Page needs totals, so Spring Data runs the limited, ordered SELECT and then a COUNT. The sort is validated in Java, not with a query.'),
      mcq('In Exercise 4 the exception becomes a checked `InsufficientStockException extends Exception`, and the stock of earlier lines stays decremented. Which change restores the rollback?', [
        ['@Transactional(readOnly = true) on the place method', false],
        ['@Transactional(rollbackFor = InsufficientStockException.class)', true],
        ['@Transactional(propagation = REQUIRES_NEW) on place', false],
        ['Catching the exception and logging it inside place()', false],
      ], 'Checked exceptions commit by default. rollbackFor tells the transaction interceptor to roll back for that type too; catching it would swallow the failure and still commit.'),
      mcq('In Exercise 6, both curl calls send version 2 for product 5. What do the two responses look like once the 409 mapping is in place?', [
        ['Both 200, with the second edit winning silently', false],
        ['Both 409, as each sees the other\'s version change', false],
        ['200 for the first and 409 for the second request', true],
        ['409 for the first and 200 for the second request', false],
      ], 'The first update matches version 2 and bumps it to 3. The second still sends version 2, matches no row, raises the optimistic locking exception, and the advice maps it to 409.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_DATA_INTERVIEW_QUESTION',
    notes: `Three questions that come up whenever a fresher's resume says "Spring Boot, Spring Data
JPA, MySQL", with answers that earn the follow-up.

## Q1. "You only wrote an interface. Who implements ProductRepository?"

**Strong answer:** Spring Data does, at startup. It scans for interfaces extending \`Repository\`,
and for each creates a proxy whose default methods are implemented by \`SimpleJpaRepository\` using
the JPA \`EntityManager\` — Hibernate underneath. For my own methods it parses the name
(\`findByStatusAndPriceLessThan\`) into a JPQL query, or uses the \`@Query\` I gave it, and it
validates both when the context starts, so a typo fails the build's startup test, not a customer
request. \`SimpleJpaRepository\` is \`@Transactional(readOnly = true)\` with read-write overrides on
\`save\` and \`delete\`, so every repository call is transactional on its own.

**Follow-up:** "What does \`save\` do for an existing entity?" — it calls \`merge\` and returns the
managed copy; you must use the return value. For an entity already managed in the current
transaction, calling \`save\` is redundant — dirty checking writes it at commit.

## Q2. "Where do you put @Transactional, and why didn't my rollback happen?"

**Strong answer:** on the **service** method that represents one use case — placing an order — so
everything it does commits or rolls back together; \`readOnly = true\` on query methods. It works
through a proxy, which gives the classic reasons a rollback does not happen:

1. The exception is **checked** — the default rolls back only on unchecked exceptions; use
   \`rollbackFor\`.
2. The method is called from the **same class** (\`this.place()\`), so the proxy is bypassed.
3. The method is **private** (or final), so it cannot be proxied.
4. The exception was **caught and swallowed** inside the method.

**Follow-up:** "When would you use \`REQUIRES_NEW\`?" — for work that must survive the caller's
rollback, like writing an audit or failure log. It takes a second connection while the first is
suspended, so it is not free under load.

## Q3. "How would you serve a list endpoint over a table of a million orders?"

**Strong answer:** never \`findAll()\`. Accept a \`Pageable\` (zero-based page, a capped size, a
whitelisted sort with \`id\` as a tie-breaker), and return a page of DTOs — ideally a **projection**
that selects only the columns the screen shows, with an index matching the filter and sort. If the
client does not need a total, return a \`Slice\` to skip the \`COUNT\`. For deep scrolling or exports,
switch from offset to **keyset** paging (\`where id > :lastId order by id limit 50\`) because a large
offset makes MySQL read and throw away every earlier row.

**Follow-up:** "Can you page an entity with its collection fetched?" — not with a collection
\`join fetch\`; Hibernate pages in memory. Page the order ids first, then load those orders with their
lines in a second query (or use batch fetching).`,
    mcqs: [
      mcq('An interviewer asks when Spring Data checks that `findByEmailAddress` refers to a real property. What is the accurate answer?', [
        ['On the first call, when the JPQL is generated lazily', false],
        ['At compile time, using an annotation processor', false],
        ['At application startup, when the proxy is created', true],
        ['Only when the query is listed in a named query file', false],
      ], 'Repository proxies are built while the ApplicationContext starts, and each query method is parsed then. An invalid property name fails startup rather than a later request.'),
      mcq('In the rollback answer, which of these is NOT a reason a @Transactional method fails to roll back?', [
        ['The method is invoked as this.place() from its own class', false],
        ['The method throws a checked exception with no rollbackFor', false],
        ['The method is public and is called from another bean', true],
        ['The exception is caught and logged inside the method', false],
      ], 'A public method called from another bean goes through the proxy, which is exactly how @Transactional is meant to work. The other three bypass the proxy or hide the exception from it.'),
      mcq('Why does the model answer suggest keyset paging for exporting a million orders instead of page=N offsets?', [
        ['Large offsets make MySQL scan and discard earlier rows', true],
        ['Offset paging cannot be combined with ORDER BY in JPQL', false],
        ['Spring Data limits offset paging to 10,000 rows total', false],
        ['Keyset paging returns rows without any SQL query at all', false],
      ], 'LIMIT offset, size still walks past offset rows, so cost grows with the page number. Keyset paging seeks to the last seen id through the index and stays fast at any depth.'),
    ],
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOT_DATA_CHECKPOINT',
    notes: `Ten questions across the topic: repositories and save, derived and @Query methods,
projections, paging, and the transactional service layer. Most show a few lines of repository or
service code and ask what Spring and Hibernate do with them. Predict the SQL and the transaction
boundaries before you read the options.`,
    checkpoint: [
      ck('JPA_HIBERNATE', `Which statement is true of this repository when the application starts?

    public interface BookRepository extends JpaRepository<Book, Long> {
        List<Book> findByAuthorNameAndPublishedYearGreaterThan(String name, int year);
    }`, [
        ['It fails unless a class implements the method', false],
        ['It needs @Query because the name has a join', false],
        ['It starts, deriving a query that joins Book.author', true],
        ['It starts, but the method returns an empty list', false],
      ], 'AuthorName walks the association book.author.name, so Spring Data derives a JPQL query with a join plus the year condition. No implementation or @Query is needed.'),
      ck('JPA_HIBERNATE', `How many rows does this load from MySQL, and of what?

    public interface ProductView { String getName(); BigDecimal getPrice(); }
    List<ProductView> findByStatus(ProductStatus status);`, [
        ['Matching rows, only the name and price columns', true],
        ['Matching rows, every column, then trimmed in Java', false],
        ['Every row in the table, filtered later in Java', false],
        ['One row, as interface projections return a single row', false],
      ], 'A closed interface projection lets Spring Data select only the properties its getters name. The WHERE on status still runs in MySQL, so only matching rows come back.'),
      mcq(`A request arrives as GET /api/products?page=2&size=10. What rows does this return?

    @GetMapping
    public Page<ProductDto> list(Pageable pageable) {
        return service.list(pageable);
    }`, [
        ['Rows 11 to 20 of the result', false],
        ['Rows 2 to 11 of the result', false],
        ['Rows 1 to 20 of the result', false],
        ['Rows 21 to 30 of the result', true],
      ], 'Page numbers are zero-based by default, so page 2 is the third page. With size 10 that skips 20 rows and returns rows 21 to 30.'),
      mcq(`What happens when the second save fails?

    @Service
    public class TransferService {
        public void move(Long from, Long to, int qty) {
            Stock a = repo.findById(from).orElseThrow();
            Stock b = repo.findById(to).orElseThrow();
            a.remove(qty); repo.save(a);
            b.add(qty);    repo.save(b);   // throws
        }
    }`, [
        ['Both saves roll back, because the service is a bean', false],
        ['Neither save ran, since findById locks the rows', false],
        ['Spring retries the second save before failing', false],
        ['The first save stays committed; stock is lost', true],
      ], 'move() has no @Transactional, so each repository save runs and commits its own transaction. The first is already committed when the second fails; the service method needs @Transactional.'),
      mcq(`Why does the order still get saved when the payment fails?

    @Service
    public class CheckoutService {
        public void checkout(Cart c) { this.saveOrderAndCharge(c); }

        @Transactional
        void saveOrderAndCharge(Cart c) {
            orders.save(toOrder(c));
            payments.charge(c);        // throws RuntimeException
        }
    }`, [
        ['RuntimeException does not trigger a rollback', false],
        ['save commits at once because orders is a proxy', false],
        ['The self-call bypasses the transactional proxy', true],
        ['payments.charge runs in a different thread pool', false],
      ], 'checkout calls saveOrderAndCharge on this, not through the Spring proxy, and the method is package-private too. No transaction starts, so orders.save commits on its own.'),
      ck('JPA_HIBERNATE', `What does this print, assuming product 3 has status ACTIVE beforehand?

    @Transactional
    public void run() {
        Product p = repo.findById(3L).orElseThrow();
        repo.markAllDiscontinued();      // @Modifying update, no clearAutomatically
        System.out.println(p.getStatus());
    }`, [
        ['DISCONTINUED', false],
        ['ACTIVE', true],
        ['null', false],
        ['It throws a StaleStateException', false],
      ], 'The bulk update changes the row in MySQL but bypasses the persistence context, so the already loaded entity still holds ACTIVE. clearAutomatically or a refresh would show the new value.'),
      mcq(`A teammate set this in application-prod.yml. What is the risk?

    spring:
      jpa:
        hibernate:
          ddl-auto: create-drop`, [
        ['Startup fails on MySQL, as create-drop is H2-only', false],
        ['Only new columns are added, so nothing is lost', false],
        ['The schema is checked, and startup fails on drift', false],
        ['Production tables are dropped and recreated', true],
      ], 'create-drop builds the schema at startup and drops it at shutdown, so every deploy wipes production data. Production should use validate or none with Flyway migrations.'),
      mcq(`What does GET /api/orders/7 return, with open-in-view set to false?

    @GetMapping("/{id}")
    public Order get(@PathVariable Long id) {
        return orderService.findEntity(id);   // @Transactional(readOnly = true)
    }
    // Order.lines is @OneToMany (lazy) and has no @JsonIgnore`, [
        ['The order JSON with its lines loaded', false],
        ['The order JSON with lines as an empty list', false],
        ['A 500 from a lazy initialisation failure', true],
        ['A 404, because the lines could not be found', false],
      ], 'The transaction ends when findEntity returns. Jackson then reads the lazy lines collection with no open session, and Hibernate throws LazyInitializationException, surfacing as a 500.'),
      ck('JPA_HIBERNATE', `Each of 50 orders has a different customer. How many SELECTs does this run?

    @EntityGraph(attributePaths = {"customer"})
    List<Order> findByStatus(OrderStatus status);
    // the service maps every order to a DTO including customer.name`, [
        ['51', false],
        ['2', false],
        ['50', false],
        ['1', true],
      ], 'The entity graph makes Hibernate join the customer into the same SELECT, so the DTO mapping finds every customer already loaded. Without it, mapping would add one query per order.'),
      mcq(`Two requests run this at the same moment for product 4, which has stock 1 and a @Version field. What is the outcome?

    @Transactional
    public void buyOne(Long id) {
        Product p = products.findById(id).orElseThrow();
        if (p.getStock() < 1) throw new OutOfStockException();
        p.setStock(p.getStock() - 1);
    }`, [
        ['Both succeed and the stock ends at minus one', false],
        ['One commits; the other fails on the version check', true],
        ['Both fail because the version check is shared', false],
        ['Both succeed and the stock ends at zero', false],
      ], 'Both read version n and stock 1. The first commit updates where version = n and bumps it; the second matches no row and throws ObjectOptimisticLockingFailureException, so stock cannot go negative.'),
    ],
  },
];
