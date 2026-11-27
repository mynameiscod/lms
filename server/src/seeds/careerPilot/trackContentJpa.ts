/**
 * Career-track content: Hibernate and JPA (JT_JPA), for Java Full Stack + AI and Java Backend Engineer.
 *
 * Everything here is Jakarta Persistence 3 with Hibernate 6, as Spring Boot 3 ships it:
 * `jakarta.persistence.*` imports, MySQL as the database, and Spring's @Transactional around the
 * work. The questions are about what Hibernate actually does with a mapping or a query — which SQL
 * it sends, when, and what breaks — because that is how JPA is examined in a backend interview.
 *
 * The topic is single-skill (JPA_HIBERNATE), so no question names a skillKey.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_JPA_BUNDLES: PilotBundle[] = [
  /* ── ORM_IDEA ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_JPA_ORM_IDEA',
    notes: `In the JDBC topic you wrote the same three things over and over: an SQL string, a loop
over a \`ResultSet\`, and code that copied each column into a field. An **ORM** (object-relational
mapper) writes that layer for you. You describe once how a class maps to a table, and from then on
you load, save and query **objects**.

## JPA is the standard, Hibernate is the implementation

- **JPA** — today **Jakarta Persistence** (package \`jakarta.persistence\`) — is a specification:
  annotations such as \`@Entity\` and interfaces such as \`EntityManager\`. It contains no engine.
- **Hibernate** is the most widely used implementation of it. Spring Boot 3's
  \`spring-boot-starter-data-jpa\` pulls in Hibernate 6 and wires it to your \`DataSource\`.

Code written against \`jakarta.persistence\` works on any JPA provider. Reaching for
\`org.hibernate.*\` classes ties you to Hibernate — sometimes worth it, but it should be a decision.

## The same job, twice

JDBC:

    try (PreparedStatement ps = con.prepareStatement(
            "SELECT id, name, price FROM product WHERE id = ?")) {
        ps.setLong(1, id);
        ResultSet rs = ps.executeQuery();
        if (rs.next()) return new Product(rs.getLong("id"), rs.getString("name"), rs.getBigDecimal("price"));
    }

JPA:

    Product p = entityManager.find(Product.class, id);
    p.setPrice(new BigDecimal("499.00"));   // inside a transaction: saved at commit, no UPDATE written

That second line is the real difference. Hibernate tracks the objects it loaded and works out the
\`UPDATE\` itself (dirty checking, covered later in this topic).

## What it costs

An ORM does not remove SQL; it **generates** it. That brings real costs:

- **Hidden queries.** Touching \`order.getCustomer().getName()\` can fire a SELECT you never wrote.
  Done in a loop, that is the N+1 problem.
- **A new mental model.** Entity states, the persistence context, flush timing and lazy loading
  are all things JDBC never made you think about.
- **Awkward fits.** Bulk updates, reporting queries with window functions and vendor-specific SQL
  are often clearer as native SQL.

Turn on \`spring.jpa.show-sql=true\` (or log \`org.hibernate.SQL\` at DEBUG) while learning, and read
every statement Hibernate sends. A developer who never looks at the generated SQL eventually ships
an N+1 to production.

## Common mistakes

- Saying "Hibernate replaces SQL" — you still need SQL to read the logs and fix slow queries.
- Mixing \`javax.persistence\` (Boot 2) imports into a Boot 3 project; they compile only if the old
  jar is present, and the annotations are then silently ignored.
- Choosing JPA for a job that is one bulk \`UPDATE\`: loading 100,000 entities to change one column is
  far slower than the single statement.`,
    workedExample: `**Problem:** a teammate asks whether to use JPA or plain JDBC for (a) the product
catalogue CRUD screens and (b) a nightly job that sets \`discount = 0\` on 2 million rows.

**(a) Catalogue CRUD → JPA.** The work is load one object, change a few fields, save it, with
relationships to categories. Mapping that by hand is repetitive and error-prone; dirty checking and
relationship mapping remove most of the code.

**(b) Nightly job → one SQL statement.** Through entities, Hibernate would load 2 million objects
into memory and issue 2 million UPDATEs. A single \`UPDATE product SET discount = 0\` (via
\`JdbcTemplate\`, a native query, or a JPQL bulk update) does it in one round trip.

The reasoning to state in an interview: an ORM pays off for object-at-a-time work over a rich
model, and costs you for set-at-a-time work — so a real application usually uses both.`,
    mcqs: [
      mcq('In a Spring Boot 3 project, which statement about JPA and Hibernate is accurate?', [
        ['JPA is a specification; Hibernate is one engine that implements it', true],
        ['Hibernate is the specification and JPA is its reference engine', false],
        ['JPA and Hibernate are just two different names for exactly the same library', false],
        ['JPA is used for MySQL and Hibernate is used for PostgreSQL', false],
      ], 'Jakarta Persistence defines annotations and interfaces but contains no engine. Hibernate implements that specification, and Boot 3 uses it as the default provider.'),
      mcq('A nightly job must zero the discount column on two million product rows. What is the sound approach?', [
        ['Load every Product entity and call setDiscount in a loop', false],
        ['Issue one bulk UPDATE statement rather than loading entities', true],
        ['Load products page by page and call merge on each of them', false],
        ['Call entityManager.refresh on each product after the change', false],
      ], 'Set-at-a-time work is what SQL does best. Loading entities would pull millions of objects into memory and send one UPDATE each; a single bulk statement does it in one round trip.'),
      mcq('Why should a developer learning JPA turn on logging of org.hibernate.SQL?', [
        ['It makes Hibernate cache queries between application restarts', false],
        ['It shows the SQL Hibernate generates, so hidden queries become visible', true],
        ['It is required before Hibernate will connect to a MySQL server', false],
        ['It switches Hibernate from lazy loading to eager loading everywhere in the app', false],
      ], 'An ORM generates SQL you did not write, including extra SELECTs from lazy loading. Reading the log is how you spot an N+1 or an unexpected query before production does.'),
    ],
    checkpoint: [
      mcq('A Boot 3 entity is annotated with javax.persistence.Entity instead of jakarta.persistence.Entity. What is the likely outcome?', [
        ['Hibernate 6 maps it normally, because both packages are equivalent', false],
        ['Hibernate 6 does not recognise it, so the class is not an entity', true],
        ['MySQL rejects the table because the annotation package is wrong', false],
        ['The class is mapped twice, once for each persistence package', false],
      ], 'Hibernate 6 reads only the jakarta.persistence annotations. A javax annotation, if it compiles at all, is ignored, and queries on the class fail with "not an entity".'),
      mcq('Inside a transaction, code calls find to load a Product and then setPrice. No save call follows. What happens at commit?', [
        ['Nothing, because no save or update method was called', false],
        ['Hibernate detects the change and issues an UPDATE itself', true],
        ['An exception is thrown because a managed entity was modified', false],
        ['The price change is written only on the next find call', false],
      ], 'Entities loaded in a transaction are managed. Hibernate compares them with their loaded snapshot at flush and generates the UPDATE — dirty checking — so no explicit save is needed.'),
      mcq('Which of these is a genuine cost of using an ORM compared with hand-written JDBC?', [
        ['It can no longer use transactions on the database', false],
        ['It can send queries the code never visibly asked for', true],
        ['It cannot map a column of type DECIMAL to a Java type', false],
        ['It needs a separate database server of its own to run', false],
      ], 'Lazy loading and cascades make Hibernate issue SQL that does not appear in your code. That convenience is exactly what produces N+1 problems when nobody reads the generated SQL.'),
    ],
  },

  /* ── ENTITIES ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_JPA_ENTITIES',
    notes: `An **entity** is a class whose instances Hibernate stores as rows. Three things make a
class an entity: \`@Entity\`, a field marked \`@Id\`, and a no-argument constructor (it may be
\`protected\`) so Hibernate can create instances by reflection.

    import jakarta.persistence.*;
    import java.math.BigDecimal;
    import java.time.LocalDateTime;

    @Entity
    @Table(name = "products")
    public class Product {

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @Column(nullable = false, length = 120)
        private String name;

        @Column(unique = true, nullable = false, length = 40)
        private String sku;

        @Column(precision = 10, scale = 2)
        private BigDecimal price;

        @Enumerated(EnumType.STRING)
        private ProductStatus status;

        @Column(name = "created_at", updatable = false)
        private LocalDateTime createdAt;

        @Transient
        private int cartQuantity;          // not stored

        protected Product() {}             // for Hibernate
        public Product(String name, String sku, BigDecimal price) { ... }
    }

## What each annotation decides

- \`@Table(name = "products")\` — the table name. Without it, the entity name is used.
- \`@Column\` — the column name, \`nullable\`, \`length\` (VARCHAR size, default 255), \`unique\`,
  \`precision\`/\`scale\` for decimals, and \`insertable\`/\`updatable\`. These attributes shape the
  DDL Hibernate generates; they are **not** validation — \`nullable = false\` does not stop you
  setting null in Java, the database rejects the INSERT.
- \`@Enumerated(EnumType.STRING)\` — store the enum's name. The default, \`ORDINAL\`, stores its
  position, so inserting a new constant in the middle of the enum silently changes the meaning of
  every existing row.
- \`@Transient\` — a field that exists only in Java.
- Java types map naturally: \`BigDecimal\` to DECIMAL, \`LocalDate\`/\`LocalDateTime\` to DATE/DATETIME,
  \`boolean\` to BIT. Use \`BigDecimal\` for money, never \`double\`.

## Field access

Putting \`@Id\` on a field means Hibernate reads and writes **fields** directly, not getters and
setters. Keep annotations on fields consistently.

## Schema generation

\`spring.jpa.hibernate.ddl-auto\` controls what Hibernate does to the schema at startup: \`create\`,
\`create-drop\`, \`update\`, \`validate\`, \`none\`. \`update\` adds missing columns but never drops or
renames, so a renamed field leaves the old column behind. In production use \`validate\` or \`none\`
and manage the schema with Flyway or Liquibase migrations.

## Common mistakes

- No no-arg constructor — Hibernate fails with "No default constructor for entity".
- Calling a field \`order\` or \`group\` without renaming the column — reserved words break the SQL.
- Making the entity class \`final\` — Hibernate cannot create the lazy proxies it needs.`,
    mcqs: [
      mcq('An enum field Status { ACTIVE, DISCONTINUED } is mapped with no @Enumerated annotation. A developer later inserts DRAFT as the first constant. What happens to existing rows?', [
        ['They keep their meaning, because enum names are stored', false],
        ['Their stored numbers now point at different constants', true],
        ['Hibernate migrates every row to the new positions', false],
        ['The application refuses to start until rows are fixed', false],
      ], 'The default is EnumType.ORDINAL, which stores the position. Inserting a constant shifts the positions, so a stored 0 that meant ACTIVE now reads as DRAFT. EnumType.STRING avoids this.'),
      mcq('What does @Column(nullable = false) on a JPA field actually do?', [
        ['Rejects a null in Java the moment the setter is called', false],
        ['Adds NOT NULL to the column in DDL that Hibernate generates', true],
        ['Replaces any null with an empty string before an INSERT', false],
        ['Makes Hibernate skip the column whenever its value is null', false],
      ], 'Column attributes describe the schema. With generated DDL the column becomes NOT NULL, so a null reaches the database and the INSERT fails there; Java-side checks need Bean Validation such as @NotNull.'),
      mcq('Why does a JPA entity need a no-argument constructor?', [
        ['Hibernate instantiates entities by reflection before filling fields', true],
        ['The database driver calls that constructor whenever it inserts a new row', false],
        ['Without one, the class cannot hold an @Id annotated field', false],
        ['Spring injects the EntityManager through that constructor', false],
      ], 'When Hibernate loads a row it creates an empty instance reflectively and then sets the fields. The constructor may be protected so application code still uses the meaningful one.'),
    ],
    checkpoint: [
      mcq('A Product field cartQuantity is used only on the checkout page and must never be stored. How is it mapped?', [
        ['@Column(insertable = false)', false],
        ['@Transient', true],
        ['@Column(nullable = true)', false],
        ['@Lob', false],
      ], '@Transient tells JPA the field is not persistent. insertable = false still maps a column — it only leaves it out of INSERT statements.'),
      mcq('With ddl-auto=update, a developer renames the field price to unitPrice. What does Hibernate do to the table?', [
        ['Renames the price column to unit_price, keeping its data', false],
        ['Adds a unit_price column and leaves price in place', true],
        ['Drops price and creates unit_price in its place', false],
        ['Refuses to start until the column is renamed', false],
      ], 'update only adds what is missing; it never drops or renames. The old column lingers with the old data, and the new one starts empty — one reason production uses migrations instead.'),
      mcq('Which Java type should map a product price stored in a DECIMAL(10,2) column?', [
        ['double', false],
        ['BigDecimal', true],
        ['float', false],
        ['String', false],
      ], 'BigDecimal represents decimal amounts exactly and maps to DECIMAL with precision and scale. double and float are binary fractions and drift on values like 0.10.'),
    ],
  },

  /* ── IDS ──────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_JPA_IDS',
    notes: `Every entity needs exactly one identifier, marked \`@Id\`. It is how Hibernate tells
two objects apart and how it finds the row again.

## Natural or surrogate?

- A **natural key** is real data that happens to be unique — a SKU, an email, a PAN number.
- A **surrogate key** is a meaningless number generated for the purpose.

Prefer a surrogate key as the \`@Id\` and put a \`unique\` constraint on the natural one. Natural keys
change (a product is re-skued, a user changes email), and changing a primary key means updating
every foreign key that points at it.

## @GeneratedValue strategies

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

- **IDENTITY** — the database generates the value (MySQL \`AUTO_INCREMENT\`). Hibernate cannot know
  the id until the row exists, so it must run the INSERT **immediately** on \`persist\` to read the
  key back. Consequence: **JDBC batch inserts are disabled** for that entity, even with
  \`hibernate.jdbc.batch_size\` set. Saving 10,000 products means 10,000 round trips.
- **SEQUENCE** — Hibernate asks a database sequence for values, and with \`allocationSize = 50\`
  reserves fifty ids per call. Inserts can be delayed and batched. PostgreSQL and Oracle have
  sequences; MySQL does not.

      @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "product_seq")
      @SequenceGenerator(name = "product_seq", sequenceName = "product_seq", allocationSize = 50)

- **TABLE** — emulates a sequence with a table and row locks. Portable but slow; avoid.
- **AUTO** — the provider chooses. Hibernate 6 on MySQL picks SEQUENCE emulated with a table
  (\`hibernate_sequence\`), which surprises people. Say IDENTITY explicitly on MySQL.
- **UUID** — \`@GeneratedValue(strategy = GenerationType.UUID)\` with a \`UUID\` field: generated in
  Java, so batching works, at the cost of a wider key and scattered index inserts.

## Long, not long

Use the wrapper \`Long\`. A \`null\` id means "not saved yet", which Spring Data's \`save\` uses to
choose between persist and merge. A primitive \`long\` is \`0\`, which looks like a real id.

## Common mistakes

- Setting the id by hand on an entity that also has \`@GeneratedValue\` — \`save\` then treats it as
  an existing row and runs a SELECT plus merge.
- Basing \`equals\`/\`hashCode\` on a generated id: it is \`null\` before persist and a value after, so
  the object changes hash code while sitting in a \`HashSet\`.
- Expecting batch inserts on MySQL with IDENTITY.`,
    mcqs: [
      mcq('Why does GenerationType.IDENTITY prevent Hibernate from batching inserts?', [
        ['MySQL does not allow two INSERT statements per connection', false],
        ['Each INSERT must run at once so the generated key can be read back', true],
        ['IDENTITY columns lock the whole table during every INSERT', false],
        ['Batching is supported only for entities without any relationships at all', false],
      ], 'With IDENTITY the database creates the key, and Hibernate needs it to make the entity managed. It therefore executes each INSERT at persist time, which leaves nothing to group into a batch.'),
      mcq('What does allocationSize = 50 on a @SequenceGenerator achieve?', [
        ['It limits the table to fifty rows per transaction', false],
        ['Hibernate reserves fifty ids per call to the sequence', true],
        ['It makes the sequence skip fifty numbers between rows', false],
        ['It caps the size of every batch insert at fifty rows', false],
      ], 'One call to the sequence yields a block of fifty values that Hibernate hands out in memory, so most persists need no database round trip.'),
      mcq('Why is a product SKU usually a poor choice for the @Id even though it is unique?', [
        ['A SKU can change, and every foreign key would need updating', true],
        ['A String column can never be used as a primary key', false],
        ['Hibernate refuses to map an @Id that it did not generate', false],
        ['Unique constraints and primary keys can never share the same column', false],
      ], 'Natural keys carry business meaning, and business meaning changes. A surrogate id never needs to change, while the SKU keeps a unique constraint of its own.'),
    ],
    checkpoint: [
      mcq('A Product uses @GeneratedValue(strategy = GenerationType.AUTO) on MySQL with Hibernate 6. What will a developer find?', [
        ['AUTO_INCREMENT on products, exactly as IDENTITY would give', false],
        ['A hibernate_sequence table emulating a sequence', true],
        ['UUID values generated in Java for every product row', false],
        ['An error, because AUTO is not allowed on MySQL', false],
      ], 'Hibernate 6 resolves AUTO to SEQUENCE, and since MySQL has no sequences it emulates one with a table. State IDENTITY explicitly if AUTO_INCREMENT is what you want.'),
      mcq('An entity has private long id (primitive) and @GeneratedValue. What problem does that cause with Spring Data save()?', [
        ['A new object has id 0, which is harder to read as unsaved', true],
        ['MySQL cannot store a primitive long in a BIGINT column', false],
        ['Hibernate cannot generate values for primitive fields', false],
        ['The id is generated twice, once in Java and once in MySQL', false],
      ], 'save decides new versus existing from the id. A null Long clearly means new; a primitive defaults to 0, which can be mistaken for an existing row and send the object through merge.'),
      mcq('A team must insert 50,000 order lines nightly on MySQL with batching. Which id choice allows batching?', [
        ['GenerationType.IDENTITY with batch_size set to 50', false],
        ['UUIDs generated in Java before persist is called', true],
        ['GenerationType.IDENTITY with ordered inserts enabled', false],
        ['AUTO_INCREMENT with the batch flushed every 50 rows', false],
      ], 'An id known before the INSERT lets Hibernate queue statements and send them as a JDBC batch. Any database-generated identity forces an immediate INSERT per row.'),
    ],
  },

  /* ── RELATIONSHIPS ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_JPA_RELATIONSHIPS',
    notes: `In a database a relationship is a **foreign key column**. In Java it is a **reference**
or a **collection**. JPA's job is to keep the two in step, and the one idea that makes it work is
the **owning side**: the side whose field controls the foreign key.

## Many-to-one, the side with the column

    @Entity
    public class Product {
        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "category_id", nullable = false)
        private Category category;
    }

\`products.category_id\` lives on the products table, so \`Product.category\` is the **owner**.
Setting it is what changes the column.

## One-to-many, the inverse side

    @Entity
    public class Category {
        @OneToMany(mappedBy = "category", cascade = CascadeType.ALL, orphanRemoval = true)
        private List<Product> products = new ArrayList<>();

        public void addProduct(Product p) { products.add(p); p.setCategory(this); }
        public void removeProduct(Product p) { products.remove(p); p.setCategory(null); }
    }

\`mappedBy = "category"\` says "the foreign key is managed by the \`category\` field on Product". This
side is the **inverse**: adding to the list alone writes nothing. That is why the helper methods set
**both** sides.

Without \`mappedBy\`, Hibernate treats \`@OneToMany\` as owning too, and maps it with a **join table**
\`category_products\` — an extra table you never wanted, plus extra INSERTs.

## Many-to-many

    @ManyToMany
    @JoinTable(name = "product_tags",
        joinColumns = @JoinColumn(name = "product_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private Set<Tag> tags = new HashSet<>();

    // on Tag:
    @ManyToMany(mappedBy = "tags")
    private Set<Product> products = new HashSet<>();

Use a \`Set\`, not a \`List\`. If the link needs its own data (quantity, date added), drop
\`@ManyToMany\` and model the join table as an entity with two \`@ManyToOne\`s.

## Cascade and orphanRemoval

- \`cascade = CascadeType.PERSIST\` / \`ALL\` — operations on the parent pass to the children:
  persisting a Category persists its new Products.
- \`orphanRemoval = true\` — a child **removed from the collection** is deleted.
- Cascade belongs on a parent that **owns the lifecycle** of its children (order → order lines).
  Never cascade \`REMOVE\` from a \`@ManyToOne\` or across a \`@ManyToMany\`: deleting one product would
  delete the shared category or tag for everyone.

## Common mistakes

- Setting only \`category.getProducts().add(p)\` — the inverse side; the foreign key stays null.
- \`toString\`, \`equals\` or JSON serialisation that walks both directions — infinite recursion.
- \`CascadeType.ALL\` on everything "to be safe".`,
    workedExample: `**Problem:** an order has many order lines; each line refers to a product. Map it.

1. **Where are the foreign keys?** \`order_lines.order_id\` and \`order_lines.product_id\`. So
   \`OrderLine\` owns both relationships.
2. **OrderLine:**

       @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "order_id", nullable = false)
       private PurchaseOrder order;
       @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "product_id", nullable = false)
       private Product product;

3. **PurchaseOrder** owns the lines' lifecycle — a line cannot exist without its order:

       @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
       private List<OrderLine> lines = new ArrayList<>();

4. **Product** does not own lines; deleting a product must not delete order history. No collection
   is needed on Product at all — a one-directional \`@ManyToOne\` is often the cleanest mapping.

Result: persisting an order persists its lines, removing a line from \`lines\` deletes it, and no
operation on an order ever touches a product row.`,
    mcqs: [
      mcq('Category has @OneToMany(mappedBy = "category") List<Product> products. Code calls category.getProducts().add(p) and nothing else. What is stored in products.category_id?', [
        ['The category id, because the list was updated', false],
        ['Nothing changes, because the inverse side was set', true],
        ['The id is set, and a join table row is also added for it', false],
        ['Hibernate throws an exception at flush time', false],
      ], 'mappedBy marks the collection as the inverse side. Only Product.category, the owning field, controls the foreign key, so it stays null unless p.setCategory(category) is also called.'),
      mcq('A @OneToMany List<Product> on Category has no mappedBy and no @JoinColumn. What schema does Hibernate expect?', [
        ['A category_id column on products and nothing else', false],
        ['A separate category_products join table', true],
        ['A products_id column on the category table', false],
        ['A JSON column on category holding the product ids', false],
      ], 'Without mappedBy the collection is treated as owning its own association, and a unidirectional @OneToMany defaults to a join table. That is an extra table and extra INSERTs nobody asked for.'),
      mcq('Product has @ManyToOne(cascade = CascadeType.REMOVE) Category category. What happens when one product is deleted?', [
        ['Only the product row is deleted, as expected', false],
        ['Its category is deleted too, along with what it holds', true],
        ['The category_id column on that product row is set to null first', false],
        ['Hibernate ignores cascade on a @ManyToOne field', false],
      ], 'Cascading REMOVE from child to parent deletes the shared category, which then fails on a foreign key or wipes other products. Cascade belongs on the parent that owns the children.'),
    ],
    checkpoint: [
      mcq('What does orphanRemoval = true on PurchaseOrder.lines do when a line is removed from the list?', [
        ['Sets the line\'s order_id to null and keeps the row', false],
        ['Deletes the order line row from the database', true],
        ['Detaches the line so it can be reattached later', false],
        ['Nothing until the parent order itself is deleted', false],
      ], 'orphanRemoval treats a child that leaves its parent\'s collection as having no reason to exist, so Hibernate issues a DELETE for it at flush.'),
      mcq('A product-to-tag link needs to record the date the tag was added. How should it be mapped?', [
        ['@ManyToMany with an extra @Column on the Set field', false],
        ['A ProductTag entity with two @ManyToOne fields and a date', true],
        ['@ManyToMany with @JoinTable naming a date column', false],
        ['Two @OneToMany collections, with mappedBy declared on each side', false],
      ], '@ManyToMany can map only the two foreign keys. As soon as the link carries data, the join table becomes an entity of its own, linked to each side by @ManyToOne.'),
      mcq('In a bidirectional Product–Category mapping, which side is the owner?', [
        ['Category, because it holds the collection of products', false],
        ['Product, because products holds the category_id column', true],
        ['Whichever side was persisted first in the transaction', false],
        ['Both sides, since each one holds a reference to the other', false],
      ], 'The owner is the side whose table has the foreign key column. That is the @ManyToOne side; the @OneToMany carries mappedBy and is the inverse.'),
    ],
  },

  /* ── JPQL ─────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_JPA_JPQL',
    notes: `**JPQL** (Jakarta Persistence Query Language) looks like SQL but queries **entities and
their fields**, not tables and columns. Hibernate translates it into the SQL for your database.

    List<Product> cheap = em.createQuery(
            "SELECT p FROM Product p WHERE p.price < :max ORDER BY p.name", Product.class)
        .setParameter("max", new BigDecimal("500"))
        .getResultList();

- \`Product\` is the **entity name**, \`p.price\` the **field** — not \`products\` or \`unit_price\`.
- \`:max\` is a **named parameter**, bound with \`setParameter\`. Never concatenate input into JPQL;
  that is JPQL injection, exactly like SQL injection.
- \`getSingleResult()\` throws \`NoResultException\` on zero rows and \`NonUniqueResultException\` on
  more than one. For "maybe one", use \`getResultStream().findFirst()\`.

## Navigating and joining

    SELECT p FROM Product p WHERE p.category.name = :cat          -- implicit join
    SELECT p FROM Product p JOIN p.category c WHERE c.name = :cat  -- explicit join
    SELECT c FROM Category c LEFT JOIN c.products p WHERE p IS NULL  -- empty categories

You join along **mapped relationships** (\`p.category\`), not on column equality.

## JOIN FETCH

A plain \`JOIN\` filters; it does not load the related objects. \`JOIN FETCH\` loads them in the same
query:

    SELECT o FROM PurchaseOrder o JOIN FETCH o.customer WHERE o.status = :status

Fetching a collection multiplies rows, so add \`DISTINCT\` in older versions (Hibernate 6 de-duplicates
parent entities automatically). You cannot paginate (\`setMaxResults\`) reliably over a collection
fetch — Hibernate does it in memory and logs a warning.

## Projections and aggregates

    List<CategoryTotal> totals = em.createQuery("""
            SELECT new com.shop.report.CategoryTotal(c.name, COUNT(p), SUM(p.price))
            FROM Product p JOIN p.category c
            GROUP BY c.name""", CategoryTotal.class).getResultList();

A **constructor expression** builds a DTO directly, which is cheaper than loading full entities for
a report.

## Bulk updates and native queries

\`UPDATE Product p SET p.discount = 0 WHERE p.category = :c\` with \`executeUpdate()\` changes rows in
one statement — but **bypasses the persistence context**: managed entities already loaded still
show the old value. For SQL JPQL cannot express (window functions, vendor features), use
\`createNativeQuery\`. In Spring Data, the same queries sit on \`@Query\` methods.

## Common mistakes

- Writing table or column names in JPQL — "Product is not mapped" or unknown attribute errors.
- \`getSingleResult()\` for a lookup that may return nothing.
- String concatenation of user input into the query.`,
    mcqs: [
      mcq('The table is products with a column unit_price; the entity is Product with field price. Which JPQL is valid?', [
        ['SELECT p FROM products p WHERE p.unit_price > 100', false],
        ['SELECT p FROM Product p WHERE p.price > 100', true],
        ['SELECT p FROM Product p WHERE p.unit_price > 100', false],
        ['SELECT * FROM Product WHERE price > 100', false],
      ], 'JPQL names the entity and its Java fields; Hibernate maps them to products.unit_price itself. Table names, column names and SELECT * are SQL, not JPQL.'),
      mcq('A lookup by SKU may find no product. What happens if the code uses getSingleResult()?', [
        ['It returns null when there is no matching row', false],
        ['It throws NoResultException when nothing matches', true],
        ['It returns an empty Product with every field null', false],
        ['It returns an Optional that the caller must check', false],
      ], 'getSingleResult insists on exactly one row: zero throws NoResultException and several throw NonUniqueResultException. getResultStream().findFirst() suits a lookup that may miss.'),
      mcq('After em.createQuery("UPDATE Product p SET p.discount = 0").executeUpdate(), a Product loaded earlier in the same transaction is read again. What discount does it show?', [
        ['0, because the bulk update refreshed the entity', false],
        ['Its old value, since bulk updates skip the context', true],
        ['null, because the entity was evicted from memory', false],
        ['It throws, because the entity is now stale', false],
      ], 'A bulk statement runs straight against the database. Managed copies in the persistence context are not touched, so call em.refresh or clear the context if they will be read again.'),
    ],
    checkpoint: [
      mcq('Which query loads orders and their customers in one SELECT?', [
        ['SELECT o FROM PurchaseOrder o JOIN o.customer c', false],
        ['SELECT o FROM PurchaseOrder o JOIN FETCH o.customer', true],
        ['SELECT o FROM PurchaseOrder o WHERE o.customer IS NOT NULL', false],
        ['SELECT o, o.customer.id FROM PurchaseOrder o', false],
      ], 'A plain JOIN only filters; the customers are still fetched later, one by one. JOIN FETCH initialises the association from the same result set.'),
      mcq('A search screen builds "WHERE p.name = \'" + input + "\'" into a JPQL string. What is the flaw?', [
        ['JPQL does not support the equals comparison on strings', false],
        ['Crafted input can change the query, so bind a parameter', true],
        ['Hibernate caches each distinct string forever, so nothing', false],
        ['The string must be in double quotes rather than single', false],
      ], 'Concatenated input becomes query syntax, which is JPQL injection. A named parameter such as :name keeps input as data and also lets the query plan be reused.'),
      mcq('A report needs only category name, product count and total value. Why prefer SELECT new CategoryTotal(...)?', [
        ['It is the only way JPQL allows GROUP BY in a query', false],
        ['It builds small DTOs without loading full entities', true],
        ['It lets Hibernate write the results back automatically', false],
        ['It forces the query to run as native SQL on MySQL', false],
      ], 'A constructor expression returns exactly the fields the report needs. No entities enter the persistence context, so there is no snapshot, dirty checking or lazy loading to pay for.'),
    ],
  },

  /* ── FETCHING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_JPA_FETCHING',
    notes: `Loading an entity raises a question: load what it points to **now** (eager) or **when
it is first used** (lazy)?

## The defaults

| Mapping | Default fetch |
|---|---|
| \`@ManyToOne\`, \`@OneToOne\` | **EAGER** |
| \`@OneToMany\`, \`@ManyToMany\` | **LAZY** |

A lazy association is a **proxy** (for a single reference) or an uninitialised **persistent
collection**. Touching it fires a SELECT — but only if the persistence context is still open.

Make every to-one association lazy and decide per query what to load:

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

Eager is decided at **mapping** time, for every query, forever. It cannot be turned off for a
screen that does not need the data, and eager to-one associations still produce N+1 when the query
is JPQL.

## The N+1 problem

    List<PurchaseOrder> orders = em.createQuery(
        "SELECT o FROM PurchaseOrder o", PurchaseOrder.class).getResultList();   // 1 query
    for (PurchaseOrder o : orders) {
        System.out.println(o.getCustomer().getName());                         // +1 each
    }

One query for 200 orders, then one SELECT per distinct customer: up to **201 queries** for one
screen. It is invisible in the code and obvious in the SQL log.

**Fixes:**

1. **JOIN FETCH** in the query that needs the data:
   \`SELECT o FROM PurchaseOrder o JOIN FETCH o.customer\`.
2. **Entity graph** — in Spring Data, \`@EntityGraph(attributePaths = "customer")\` on the repository
   method.
3. **Batch fetching** — \`spring.jpa.properties.hibernate.default_batch_fetch_size=50\` loads lazy
   proxies in groups with \`WHERE id IN (...)\`: 1 + 4 queries instead of 1 + 200.
4. **A DTO projection** when the screen needs only a few columns.

## LazyInitializationException

    @Transactional
    public PurchaseOrder load(Long id) { return repo.findById(id).orElseThrow(); }

    // in a controller, after the transaction has ended:
    order.getLines().size();   // LazyInitializationException: could not initialize proxy - no Session

The persistence context closed when the transactional method returned, so the lazy collection can
no longer be loaded. **Fix:** fetch what the caller needs inside the transaction (JOIN FETCH or
entity graph) and return a DTO. Do **not** fix it by switching to EAGER or by enabling
\`hibernate.enable_lazy_load_no_trans\`, which opens a new connection for every lazy touch.

(Spring Boot enables Open Session in View by default, keeping the context open through the web
request and hiding this exception — and hiding N+1s inside view rendering. Set
\`spring.jpa.open-in-view=false\` and fetch deliberately.)

## Two bag fetches

Join-fetching two \`List\` collections at once fails with **MultipleBagFetchException** — the
cartesian product cannot be split back into two unordered lists. Use \`Set\`, or fetch the second
collection in a separate query.`,
    workedExample: `**Problem:** the "recent orders" page logs 51 queries for 50 orders.

1. **Read the log.** One \`select ... from purchase_order\`, then 50 lines of
   \`select ... from customer where id=?\`. That is N+1 on \`order.customer\`.
2. **Find the trigger.** The page prints \`order.getCustomer().getName()\` per row.
3. **Fix at the query.**

       @Query("SELECT o FROM PurchaseOrder o JOIN FETCH o.customer ORDER BY o.createdAt DESC")
       List<PurchaseOrder> findRecentWithCustomer(Pageable page);

   Pagination is safe here because \`customer\` is a to-one association: fetching it does not
   multiply rows.
4. **Verify.** The log now shows one SELECT with a join. Leave a test asserting the query count
   (Hibernate's \`Statistics.getPrepareStatementCount()\`) so it cannot regress silently.`,
    mcqs: [
      mcq('Which association is fetched EAGERLY unless the mapping says otherwise?', [
        ['@OneToMany List<OrderLine> lines', false],
        ['@ManyToOne Customer customer', true],
        ['@ManyToMany Set<Tag> tags', false],
        ['@OneToMany(mappedBy = "order") Set<Payment> payments', false],
      ], 'JPA defaults to-one associations (@ManyToOne, @OneToOne) to EAGER and to-many collections to LAZY. That is why to-one fields are usually marked LAZY explicitly.'),
      mcq('Setting hibernate.default_batch_fetch_size=50 changes the 1 + 200 customer queries into roughly what?', [
        ['A single query that joins orders and customers', false],
        ['1 + 4 queries, loading customers with WHERE id IN', true],
        ['200 queries, each now running in a batch of fifty', false],
        ['No queries, because customers are cached in memory', false],
      ], 'Batch fetching initialises up to fifty pending proxies with one IN query. 200 customers become four extra queries — far better than 200, though still not the single join that JOIN FETCH gives.'),
      mcq('An order with lazy lines is returned from a @Transactional service and the controller calls getLines().size() with open-in-view disabled. What happens?', [
        ['The lines load, because the entity remembers the session', false],
        ['LazyInitializationException, as the context has closed', true],
        ['size() returns 0 because the collection never loaded', false],
        ['Hibernate quietly opens a fresh transaction and loads', false],
      ], 'The persistence context ended with the transaction, leaving a detached order with an uninitialised collection. Nothing can load it any more, so Hibernate throws.'),
    ],
    checkpoint: [
      mcq('A query join-fetches two List collections on Order: lines and payments. What error is expected?', [
        ['LazyInitializationException', false],
        ['MultipleBagFetchException', true],
        ['NonUniqueResultException', false],
        ['TransientObjectException', false],
      ], 'A List without an index column is a bag. Hibernate cannot split one cartesian result back into two bags, so it refuses. Use Set for one of them, or load the second collection in another query.'),
      mcq('Why is changing a collection to FetchType.EAGER a poor fix for LazyInitializationException?', [
        ['EAGER is not allowed on collections in Hibernate 6', false],
        ['Every query on the entity now loads it, needed or not', true],
        ['EAGER collections are never written to the database', false],
        ['EAGER disables dirty checking for the owning entity class', false],
      ], 'Fetch type in the mapping applies to every use of the entity. The collection is loaded even on screens that never touch it, often with N+1. Fetch per query with JOIN FETCH or an entity graph instead.'),
      mcq('What does spring.jpa.open-in-view=true, the Spring Boot default, actually do?', [
        ['Keeps the persistence context open for the whole web request', true],
        ['Opens a new transaction for every lazy association that is touched', false],
        ['Makes all associations eager while a view is rendering', false],
        ['Shares one persistence context across every request', false],
      ], 'Open Session in View binds the context to the request, so lazy loading works in controllers and views. It hides LazyInitializationException — and the N+1 queries it lets views trigger.'),
    ],
  },

  /* ── PERSISTENCE_CONTEXT ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_JPA_PERSISTENCE_CONTEXT',
    notes: `The **persistence context** is the set of entity instances an \`EntityManager\` is
currently managing. In Spring it lives for one transaction. It is both an identity map and a
change tracker, and most "magic" in JPA comes from it.

## The four entity states

| State | Meaning |
|---|---|
| **Transient** | \`new Product(...)\` — Hibernate has never seen it. No row, not tracked. |
| **Managed** | In the persistence context. Changes are detected and written. |
| **Detached** | Has a row, but its persistence context has closed (or it was evicted). Changes are not tracked. |
| **Removed** | Scheduled for deletion; the DELETE runs at flush. |

## The EntityManager operations

    @Transactional
    public void demo() {
        Product p = new Product("Pen", "PEN-1", new BigDecimal("20"));   // transient
        em.persist(p);                     // managed; INSERT queued (or run, with IDENTITY)

        Product found = em.find(Product.class, p.getId());   // same instance — no SELECT
        found.setPrice(new BigDecimal("25"));                // managed: no save needed

        em.remove(found);                  // removed; DELETE at flush
    }

- \`persist(e)\` — makes a **transient** entity managed. On a detached one it throws.
- \`find(Class, id)\` — returns the managed instance, from the context if present, else a SELECT.
  Returns \`null\` if no row exists.
- \`getReference(Class, id)\` — returns a **proxy** without a SELECT; the row is loaded on first
  access (\`EntityNotFoundException\` then if it does not exist). Useful for setting a foreign key.
- \`merge(e)\` — copies the state of a detached object **onto a managed instance and returns that
  instance**. The argument stays detached; keep using the returned object.
- \`remove(e)\` — works only on a managed entity.
- \`detach(e)\`, \`clear()\` — stop tracking one or all entities.

## The first-level cache

Within one persistence context, a given id maps to **one** Java object. Two \`find\`s for the same
id return the same instance and only the first hits the database. This is the **first-level cache**;
it is per transaction and cannot be turned off.

## Dirty checking and flush

When an entity becomes managed, Hibernate keeps a **snapshot** of its state. At **flush** it compares
each managed entity with its snapshot and generates UPDATEs for the differences. That is why
changing a managed entity needs no \`save\`.

Flush happens at commit, before a JPQL query whose results could be affected (\`FlushModeType.AUTO\`),
and on an explicit \`em.flush()\`. Flush sends SQL; it does **not** commit — a rollback still undoes it.

## Spring Data's save

\`repository.save(e)\` calls \`persist\` if the entity is new (null id) and \`merge\` otherwise. Calling
\`save\` on an already managed entity is harmless but unnecessary.

## Common mistakes

- \`em.merge(dto); dto.setX(...)\` — changing the argument, not the returned managed copy.
- Loading 100,000 entities in one transaction: every one is snapshotted. Flush and \`clear()\` in
  chunks for batch jobs.
- Believing \`flush()\` makes data visible to other transactions — only commit does.`,
    mcqs: [
      mcq('Inside one transaction, em.find(Product.class, 7L) is called twice. How many SELECTs reach the database?', [
        ['Two, one for each call to find', false],
        ['One, since the second comes from the context', true],
        ['None, since find never queries the database', false],
        ['Two, but the second one is sent in a batch', false],
      ], 'The persistence context guarantees one instance per id. The first find loads and registers it; the second returns that same object from the first-level cache.'),
      mcq('A detached Product d is passed to em.merge(d), and then the code calls d.setPrice(...). Is the new price saved?', [
        ['Yes, because merge reattached d to the context', false],
        ['No, merge returns a managed copy; d stays detached', true],
        ['Yes, but only if em.flush() is also called after the change', false],
        ['No, because merge throws for a detached entity', false],
      ], 'merge copies d\'s state onto a managed instance and returns that instance. The argument is not attached, so later changes to d are invisible to Hibernate.'),
      mcq('What does em.flush() do inside a transaction?', [
        ['Commits the transaction so other users see the data', false],
        ['Sends pending SQL to the database without committing', true],
        ['Clears the persistence context of every entity', false],
        ['Reloads every managed entity from the database', false],
      ], 'Flush synchronises the context with the database by executing the queued INSERTs, UPDATEs and DELETEs. The transaction is still open, so a rollback still undoes them.'),
    ],
    checkpoint: [
      mcq(`Which state is p in after this code, run in a transaction that has just committed?

    Product p = new Product("Pen", "PEN-1", price);
    em.persist(p);`, [
        ['Transient', false],
        ['Detached', true],
        ['Removed', false],
        ['Managed', false],
      ], 'persist made p managed; when the transaction committed, the persistence context closed. p still corresponds to a row but is no longer tracked, which is the detached state.'),
      mcq('A service needs to set an order\'s customer_id from a known customer id without loading the customer. Which call fits?', [
        ['em.find(Customer.class, id)', false],
        ['em.getReference(Customer.class, id)', true],
        ['em.merge(new Customer(id))', false],
        ['em.persist(new Customer(id))', false],
      ], 'getReference returns an uninitialised proxy carrying only the id, which is all the foreign key needs. find would issue a SELECT, and merge or persist would try to write a customer.'),
      mcq('A batch job loads and updates 200,000 products in one transaction and runs out of memory. What is the standard remedy?', [
        ['Switch every association on Product to EAGER', false],
        ['Flush and clear the context every few hundred rows', true],
        ['Call em.merge on each product right after updating it', false],
        ['Turn off the first-level cache for the job', false],
      ], 'Every managed entity is kept with a snapshot for dirty checking. Flushing then clearing in chunks writes the changes and releases the objects; the first-level cache itself cannot be disabled.'),
    ],
  },

  /* ── DEBUGGING ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_JPA_DEBUGGING',
    notes: `JPA bugs rarely look like bugs in your code. The code reads correctly; the SQL Hibernate
produced is what is wrong. So the first move is always the same: **turn on SQL logging and read
what was sent.**

    logging.level.org.hibernate.SQL=DEBUG
    logging.level.org.hibernate.orm.jdbc.bind=TRACE     # the bound parameter values
    spring.jpa.properties.hibernate.generate_statistics=true

Below are the faults you will meet, each with the symptom, the diagnosis and the fix.

## 1. The orders page is slow — N+1 selects

**Symptom:** 300 orders, 301 statements in the log: one \`select from purchase_order\`, then
\`select from customer where id=?\` repeated.
**Diagnosis:** the template prints \`order.customer.name\`; each access initialises a lazy proxy.
**Fix:** \`JOIN FETCH o.customer\` or \`@EntityGraph(attributePaths = "customer")\` on the query that
serves the page.

## 2. LazyInitializationException in the controller

**Symptom:** \`could not initialize proxy - no Session\` when the controller reads \`order.getLines()\`.
**Diagnosis:** the service's transaction ended; the order is detached. (With open-in-view off.)
**Fix:** load the lines inside the service with a fetch join and return a DTO.

## 3. An unexpected join table appears

**Symptom:** Hibernate creates \`category_products\`, and adding a product inserts a row there too.
**Diagnosis:** \`@OneToMany List<Product> products\` without \`mappedBy\` — both sides think they own
the relationship.
**Fix:** \`@OneToMany(mappedBy = "category")\`.

## 4. Deleting a product deletes its category

**Symptom:** removing one product raises a foreign-key error, or wipes the category's other
products.
**Diagnosis:** \`cascade = CascadeType.ALL\` (which includes REMOVE) on \`Product.category\`.
**Fix:** no cascade on a \`@ManyToOne\` to a shared parent.

## 5. An entity vanishes from a HashSet

**Symptom:** \`set.add(p); em.persist(p); set.contains(p)\` → \`false\`.
**Diagnosis:** \`hashCode()\` uses the generated \`id\`, which changed from null to a value.
**Fix:** base equality on a stable natural key (the SKU), or use the id in \`equals\` with a
constant \`hashCode()\` such as \`getClass().hashCode()\`.

## 6. StackOverflowError on logging or JSON

**Symptom:** \`toString()\` or Jackson serialisation overflows the stack.
**Diagnosis:** Category prints its products, each product prints its category, and so on.
**Fix:** leave associations out of \`toString\`; return DTOs from controllers rather than entities.

## 7. MultipleBagFetchException at startup or query time

**Diagnosis:** two \`List\` collections join-fetched in one query (or both EAGER).
**Fix:** a \`Set\` for one of them, or two queries.

## 8. "We renamed a column and the old data is still there"

**Diagnosis:** \`ddl-auto=update\` adds the new column and never drops or renames the old one.
**Fix:** write a migration (Flyway) that renames the column; use \`validate\` beyond development.`,
    mcqs: [
      mcq('Adding a product to a category inserts a row into products and another into category_products. What is the most likely mapping fault?', [
        ['Product.category is missing its @JoinColumn', false],
        ['Category.products lacks mappedBy, so it owns a join table', true],
        ['The products table has no primary key defined', false],
        ['CascadeType.PERSIST is missing from the Category.products field', false],
      ], 'Without mappedBy the @OneToMany is treated as a separate owning association, which Hibernate maps with a join table. mappedBy = "category" makes it the inverse of Product.category.'),
      mcq('equals and hashCode on Product use only its @GeneratedValue id. A new product is added to a HashSet and then persisted. Why does contains now return false?', [
        ['persist replaces the object with a new Java instance', false],
        ['The id went from null to a value, so the hash changed', true],
        ['HashSet cannot hold objects that have a JPA @Id', false],
        ['Hibernate clears every Set that holds managed entities', false],
      ], 'The object sits in the bucket chosen by its old hash code. After the id is assigned the hash differs, so lookup searches the wrong bucket. Use a stable key, or a constant hashCode.'),
      mcq('Logging a Category throws StackOverflowError. Category.toString prints products and Product.toString prints category. What is the right fix?', [
        ['Increase the thread stack size with the -Xss flag', false],
        ['Leave associations out of the toString methods', true],
        ['Mark both of the associations as FetchType.EAGER', false],
        ['Add @Transient to the products collection field', false],
      ], 'Each toString calls the other without end. Keeping associations out of toString breaks the cycle; a bigger stack only delays the crash, and @Transient would stop the collection being mapped at all.'),
      mcq('Thirty orders produce thirty-one SQL statements on a listing page. What is the best first fix?', [
        ['Add an index to the customer table on its id', false],
        ['Join-fetch the customer in the query behind that page', true],
        ['Set every @ManyToOne in the model to EAGER', false],
        ['Wrap the template rendering in a transaction of its own', false],
      ], 'One query plus one per order is the N+1 pattern. JOIN FETCH or an entity graph loads the customers in the same SELECT; EAGER changes every query and still gives N+1 with JPQL.'),
    ],
  },

  /* ── PRACTICE ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_JPA_PRACTICE',
    notes: `Work these in a Spring Boot 3 project with \`spring-boot-starter-data-jpa\` and MySQL (or
H2 in MySQL mode). Keep \`org.hibernate.SQL\` at DEBUG the whole time: for every exercise, **predict
the SQL before you run it**, then compare with the log.

## Exercise 1 — Map a library

Map \`Author\`, \`Book\` and \`Genre\`: a book has one author, an author has many books, and books and
genres are many-to-many. Use IDENTITY ids, \`BigDecimal\` price, \`@Enumerated(EnumType.STRING)\` for
a \`Format\` enum (PAPERBACK, HARDCOVER, EBOOK). Write \`addBook\`/\`removeBook\` helpers that set
both sides. Check the generated DDL: exactly one join table, \`book_genres\`.

## Exercise 2 — Five JPQL queries

Write and run: (a) books under a price, with a named parameter; (b) books by author name using a
join; (c) authors with no books (LEFT JOIN … IS NULL); (d) number of books per genre as a DTO via
\`SELECT new\`; (e) the most expensive book, as an \`Optional\`.

## Exercise 3 — Cause and cure an N+1

Load all books and print each author's name. Count the statements. Then fix it twice — once with
\`JOIN FETCH\`, once with \`@EntityGraph\` — and once more with \`default_batch_fetch_size\`. Record
the statement count for each.

## Exercise 4 — Trigger a LazyInitializationException on purpose

Set \`spring.jpa.open-in-view=false\`. Return an \`Author\` from a \`@Transactional\` service and read
\`getBooks()\` in the controller. Read the stack trace. Fix it by returning an \`AuthorDto\` built
inside the transaction.

## Exercise 5 — Watch the persistence context

In one \`@Transactional\` test: \`find\` the same book twice and assert the instances are \`==\`;
change its price without calling \`save\` and observe the UPDATE at commit; call \`em.flush()\` and see
the UPDATE appear early; \`em.detach\` it, change the title and confirm nothing is written.

## Exercise 6 — Cascades with care

Give \`Author.books\` \`cascade = ALL, orphanRemoval = true\`. Remove one book from the list and see
the DELETE. Then explain, in two sentences, why the same cascade on \`Book.genres\` would be a bug.`,
    mcqs: [
      mcq('In Exercise 1, which field of the library model should carry mappedBy?', [
        ['Book.author, the @ManyToOne side', false],
        ['Author.books, the @OneToMany side', true],
        ['Both Book.author and Author.books', false],
        ['Neither, since @JoinColumn is enough', false],
      ], 'The books table holds author_id, so Book.author owns the relationship. Author.books is the inverse and declares mappedBy = "author".'),
      mcq('For "authors with no books", which JPQL is correct?', [
        ['SELECT a FROM Author a JOIN a.books b WHERE b IS NULL', false],
        ['SELECT a FROM Author a LEFT JOIN a.books b WHERE b IS NULL', true],
        ['SELECT a FROM Author a WHERE a.books = 0', false],
        ['SELECT a FROM Author a JOIN FETCH a.books WHERE b IS NULL', false],
      ], 'An inner JOIN drops authors without books before the WHERE runs. A LEFT JOIN keeps them with a null book, which IS NULL then selects. IS EMPTY on the collection would also work.'),
      mcq('In Exercise 5, the test detaches a book, changes its title and lets the transaction commit. What SQL appears?', [
        ['An UPDATE of the title at commit', false],
        ['No UPDATE, because the book is no longer tracked', true],
        ['A DELETE followed by an INSERT of the book', false],
        ['A SELECT that reloads the book, followed by an UPDATE of the title', false],
      ], 'Dirty checking covers only managed entities. A detached instance is outside the persistence context, so its changes are never compared or written.'),
      mcq('Exercise 3 uses default_batch_fetch_size=25 with 100 books by 100 different authors. About how many statements run?', [
        ['1', false],
        ['5', true],
        ['101', false],
        ['26', false],
      ], 'One query loads the books. The 100 author proxies are then initialised 25 at a time with IN queries, which is four more: five statements in total.'),
      mcq('Why would cascade = ALL on Book.genres be a bug in the library model?', [
        ['Removing one book would delete genres other books still use', true],
        ['Cascades are not permitted on @ManyToMany associations', false],
        ['It would make the genres collection load eagerly every single time', false],
        ['It would turn the join table into a separate entity class', false],
      ], 'ALL includes REMOVE. Genres are shared between books, so deleting a book would cascade to delete Fiction for every book that has it, or fail on foreign keys.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_JPA_INTERVIEW_QUESTION',
    notes: `Three questions that come up in nearly every Java backend interview that touches
persistence, with answers at the level that gets a follow-up rather than a "next question".

## Q1. "What is the difference between JPA and Hibernate?"

**Strong answer:** JPA — now Jakarta Persistence — is a **specification**: the annotations
(\`@Entity\`, \`@OneToMany\`), the \`EntityManager\` API, JPQL and the lifecycle rules. It has no
implementation of its own. Hibernate is an **implementation** of it, and the default one in Spring
Boot. I code against \`jakarta.persistence\` so the mapping is portable, and I use Hibernate-specific
features — batch fetch size, \`@BatchSize\`, statistics, \`@NaturalId\` — where they earn it.
Spring Data JPA is a third layer on top: it generates repository implementations that call the
\`EntityManager\`.

**Follow-up:** "Then what does \`save()\` do?" — calls \`persist\` for a new entity (null id) and
\`merge\` otherwise; on an already managed entity it is unnecessary because dirty checking writes the
change at flush.

## Q2. "What is the N+1 problem and how do you fix it?"

**Strong answer:** one query loads N parents, and then accessing a lazy association on each parent
fires one more query per parent — N+1 round trips where one or two would do. It hides in code like
\`orders.forEach(o -> o.getCustomer().getName())\` and is obvious only in the SQL log. Fixes, in the
order I reach for them: **JOIN FETCH** or an **@EntityGraph** on the query that needs the data;
**batch fetching** (\`default_batch_fetch_size\`) as a safety net, which turns N into N/batch; and
a **DTO projection** when the screen needs a few columns. Switching to EAGER is not a fix — it
applies to every query and, with JPQL, still loads per row.

**Follow-up:** "Can you paginate with JOIN FETCH?" — for a to-one association, yes. For a collection,
no: rows multiply, and Hibernate paginates in memory with a warning (HHH90003004). Page the parent
ids first, then fetch their collections in a second query.

## Q3. "Explain lazy vs eager, and the entity lifecycle."

**Strong answer:** eager loads an association with its owner; lazy uses a proxy or uninitialised
collection loaded on first access. Defaults are EAGER for to-one and LAZY for to-many; I make
everything lazy and fetch per use case. Lazy loading needs an open persistence context, which is why
touching it after the transaction gives \`LazyInitializationException\`.

The states: **transient** (new, unknown to Hibernate), **managed** (in the persistence context,
changes tracked and flushed), **detached** (has a row, context closed), **removed** (DELETE at flush).
The persistence context is also the **first-level cache**: one instance per id per transaction.

**Follow-up:** "\`find\` vs \`getReference\`?" — \`find\` returns the entity (from the context or by a
SELECT) or \`null\`. \`getReference\` returns a proxy without querying; it fails with
\`EntityNotFoundException\` only when first accessed. Hibernate's old \`Session.get\` and \`load\` are
the same pair. \`getReference\` is ideal for setting a foreign key from a known id.`,
    mcqs: [
      mcq('An interviewer asks what Spring Data JPA adds on top of Hibernate. Which answer is accurate?', [
        ['It replaces Hibernate with a separate ORM engine of its own', false],
        ['It generates repositories that call the EntityManager', true],
        ['It is the specification that Hibernate implements', false],
        ['It adds a second-level cache that Hibernate lacks', false],
      ], 'Spring Data JPA is a repository abstraction. It derives queries from method names and @Query, and delegates every call to the JPA EntityManager, which Hibernate provides.'),
      mcq('Why is join-fetching a collection combined with setMaxResults(20) a problem?', [
        ['JPQL does not allow setMaxResults on any query', false],
        ['Rows multiply, so Hibernate pages the result in memory', true],
        ['The fetched collection is silently left uninitialised', false],
        ['MySQL rejects LIMIT on a statement containing a join', false],
      ], 'A collection fetch returns one row per child, so LIMIT 20 would cut a parent\'s children short. Hibernate therefore loads everything and pages in memory, warning HHH90003004.'),
      mcq('em.getReference(Customer.class, 99L) is called and no customer 99 exists. When does the failure surface?', [
        ['Immediately, with NoResultException from the call', false],
        ['When a field other than the id is first accessed', true],
        ['Never, because getReference returns null instead', false],
        ['At startup, when Hibernate validates the mapping', false],
      ], 'getReference returns a proxy without a SELECT. Only when the proxy must be initialised does Hibernate query, find no row, and throw EntityNotFoundException.'),
    ],
  },

  /* ── MINI_PROJECT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_JPA_MINI_PROJECT',
    notes: `# Mini Project — The Inventory App on JPA

In the JDBC topic you built a console inventory app with DAOs, \`PreparedStatement\`s and manual
transactions. Rebuild it on **Spring Boot 3 + Spring Data JPA + Hibernate 6 + MySQL**, keep the
same behaviour, and then write down honestly what got simpler and what got harder.

## The model

- **Category** — id, unique name. Has many products.
- **Product** — id, unique SKU, name, \`BigDecimal\` unit price, current quantity, status
  (\`@Enumerated(STRING)\`: ACTIVE, DISCONTINUED). Belongs to one category.
- **StockMovement** — id, product, type (IN, OUT, ADJUST), quantity, reason, \`LocalDateTime\`
  timestamp. Many movements per product; a movement never exists without its product.

## Requirements

1. **Mappings.** \`@ManyToOne(fetch = LAZY)\` from Product to Category and from StockMovement to
   Product; the \`@OneToMany\` sides use \`mappedBy\`. IDENTITY ids on MySQL, with a sentence in
   the README on what that does to batch inserts.
2. **Cascades chosen deliberately.** Product → movements may cascade; nothing cascades to Category.
   Deleting a product with movements is refused (mark it DISCONTINUED instead).
3. **Stock changes in a transaction.** A \`@Transactional\` \`StockService.move(sku, type, qty,
   reason)\` loads the product, refuses an OUT that would go below zero, updates the quantity
   **without calling save** (dirty checking), and records a StockMovement.
4. **JPQL reports**, each one query:
   - low stock: products below a threshold, with their category name;
   - stock value per category: \`SELECT new ...(c.name, SUM(p.unitPrice * p.quantity))\`;
   - movement history for one product between two dates, newest first;
   - top five products by units moved OUT in the last 30 days.
5. **No N+1.** Every listing that prints a related entity fetches it in the same query (JOIN FETCH,
   entity graph or DTO). \`spring.jpa.open-in-view=false\`.
6. **Schema.** \`ddl-auto=validate\` with the schema created by a Flyway migration (or a checked-in
   \`schema.sql\`).
7. **Comparison note.** Half a page comparing it with the JDBC version: lines of code, what
   disappeared (row mapping, UPDATE statements), and what appeared (fetch plans, entity states).

## Acceptance criteria

- An OUT of 15 on a product holding 10 is refused and neither the quantity nor the movement table
  changes.
- The low-stock report on 200 products logs **one** SELECT, verified with Hibernate statistics or
  the SQL log.
- Changing a price inside a service method issues an UPDATE with no \`save\` call in the code.
- Deleting a category that still has products is refused with a clear message.
- No entity's \`toString\` walks an association; no controller returns an entity.
- The README includes the SQL log for each report.

## What to submit

Repository link, README with sample runs and SQL logs, and the comparison note.`,
    mcqs: [
      mcq('StockService.move changes product.quantity and then returns without calling save. Why is the change still stored?', [
        ['Spring Data saves every entity it has ever returned', false],
        ['The product is managed, so dirty checking writes it', true],
        ['MySQL triggers copy the field into the products table', false],
        ['The StockMovement cascade writes the product as well', false],
      ], 'The product was loaded inside the @Transactional method, so it is managed. At commit Hibernate compares it with its snapshot and issues the UPDATE.'),
      mcq('Which cascade setting fits the inventory model?', [
        ['Product.category with CascadeType.ALL', false],
        ['Product.movements with mappedBy and PERSIST', true],
        ['Category.products with CascadeType.REMOVE', false],
        ['StockMovement.product with CascadeType.ALL', false],
      ], 'Movements belong to one product and have no life of their own, so cascading from product to movements is sound. Cascading toward Category, or from a movement to its product, would delete shared data.'),
    ],
    assignment: {
      title: 'The Inventory App on JPA',
      description: 'The JDBC inventory app rebuilt on Spring Boot 3, Spring Data JPA and Hibernate: Product, Category and StockMovement entities, transactional stock changes, JPQL reports with no N+1 queries, and a comparison with the JDBC version.',
      instructions: `Build the application described in this unit's brief and submit a repository link.

**Submit:**

1. The source: the three entities with their mappings, repositories, a \`StockService\`, the report
   queries, and a console or REST entry point.
2. The schema migration (Flyway) or \`schema.sql\`, with \`ddl-auto=validate\`.
3. A README with sample runs, including a refused OUT movement and a refused category delete, and
   the SQL log captured for each report.
4. The half-page comparison with your JDBC version.

**Before you submit,** run each report with \`org.hibernate.SQL\` at DEBUG and confirm it sends one
SELECT. A report that sends one query per row fails the "No N+1" criterion regardless of its output.`,
      rubric: [
        { criterion: 'Entity mappings', description: 'Correct @ManyToOne/@OneToMany with mappedBy, lazy to-one associations, BigDecimal money, STRING enums, IDENTITY ids with the batching consequence explained.', maxPoints: 25 },
        { criterion: 'Transactions and entity state', description: 'Stock moves are transactional, refused moves change nothing, updates rely on dirty checking, and cascades never reach Category.', maxPoints: 20 },
        { criterion: 'JPQL reports', description: 'All four reports are correct, use named parameters, and use a DTO constructor expression where only a few fields are needed.', maxPoints: 20 },
        { criterion: 'No N+1 queries', description: 'Every listing fetches related data in the same query; open-in-view is off; SQL logs in the README prove one SELECT per report.', maxPoints: 20 },
        { criterion: 'Comparison with JDBC', description: 'The note names concrete code that disappeared and concrete concepts that appeared, with a reasoned view of when each approach fits.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_JPA_CHECKPOINT',
    notes: `Ten questions across the whole topic: what an ORM costs, mappings and ids, relationships
and the owning side, JPQL, fetching and N+1, and the persistence context. Most give a few lines of
mapping or service code and ask what SQL Hibernate sends, or what goes wrong. Work out the SQL
first, then read the options.`,
    checkpoint: [
      mcq(`How many SQL statements does this method send, with IDENTITY ids and batch_size = 20?

    @Transactional
    public void importThree() {
        em.persist(new Product("A", "SKU-A", p1));
        em.persist(new Product("B", "SKU-B", p2));
        em.persist(new Product("C", "SKU-C", p3));
    }`, [
        ['One batched INSERT for all three products', false],
        ['Three separate INSERTs, sent as each persist runs', true],
        ['Three INSERTs, held back and sent together at commit', false],
        ['None, since nothing was flushed explicitly', false],
      ], 'IDENTITY forces each INSERT to run at persist time so the generated id can be read back. Batching cannot group them, so three statements go out immediately.'),
      mcq(`What is wrong with this mapping?

    @Entity class Category {
        @OneToMany(mappedBy = "category")
        List<Product> products;
    }
    @Entity class Product {
        @ManyToOne @JoinColumn(name = "category_id")
        Category category;
    }`, [
        ['mappedBy belongs on the @ManyToOne side of the pair instead', false],
        ['Nothing structural, though Product.category is eager', true],
        ['It creates a category_products join table', false],
        ['The @JoinColumn must sit on the Category side', false],
      ], 'The owning side and mappedBy are correct. The only concern is the default: @ManyToOne is EAGER unless fetch = FetchType.LAZY is stated.'),
      mcq(`A controller calls this and then reads order.getLines(). Open-in-view is off. What happens?

    @Transactional(readOnly = true)
    public PurchaseOrder get(Long id) {
        return em.find(PurchaseOrder.class, id);
    }`, [
        ['The lines are loaded on access as usual', false],
        ['LazyInitializationException on the lines', true],
        ['An empty list, as no lines were fetched', false],
        ['A NullPointerException from getLines()', false],
      ], 'find loads the order but not its lazy collection. Once the method returns the context is closed, so initialising the lines fails. Fetch them inside the transaction instead.'),
      mcq(`What does this print, inside one transaction?

    Product a = em.find(Product.class, 5L);
    Product b = em.find(Product.class, 5L);
    System.out.println(a == b);`, [
        ['false, since find creates a new object each time', false],
        ['true, since the context keeps one instance per id', true],
        ['false, unless equals has been overridden by id', false],
        ['true, but only if the second-level cache is on', false],
      ], 'The persistence context is an identity map: within it, an id maps to exactly one Java object. The second find returns the very same reference.'),
      mcq('A repository method returns orders with their lines using JOIN FETCH and Pageable. Hibernate logs HHH90003004. What does that mean?', [
        ['The query is paginated in memory after loading every row', true],
        ['The lines were skipped because pagination was requested', false],
        ['MySQL ran the LIMIT twice, once per joined table', false],
        ['The page size exceeded the default batch fetch size', false],
      ], 'With a collection fetch Hibernate cannot apply LIMIT in SQL without cutting children off, so it loads all rows and applies the page in memory, which this warning reports.'),
      mcq(`Which statement about this code is true?

    @Transactional
    public void rename(ProductDto dto) {
        Product detached = new Product(dto.id(), dto.name());
        Product managed = em.merge(detached);
        detached.setName("X");
    }`, [
        ['The name saved is "X", because merge attached detached', false],
        ['dto.name() is saved; the later edit to detached is lost', true],
        ['merge throws, because detached was never loaded first', false],
        ['Both objects are managed and both changes are written', false],
      ], 'merge copies the state onto a managed instance and returns it. The argument stays outside the context, so setting its name afterwards changes nothing in the database.'),
      mcq('A listing of 40 products prints each one\'s category name and the log shows 41 SELECTs. Which change fixes it for this page alone?', [
        ['Mark Product.category as FetchType.EAGER', false],
        ['Use JOIN FETCH p.category in the listing query', true],
        ['Add cascade = ALL to Product.category', false],
        ['Turn on spring.jpa.open-in-view for that one listing page', false],
      ], 'A fetch join in that one query loads the categories with the products. EAGER affects every query and still yields N+1 with JPQL; cascade and open-in-view do not change fetching.'),
      mcq('Product.equals compares ids and hashCode returns Objects.hash(id), with a generated id. Which situation breaks?', [
        ['Comparing two products that were each loaded by em.find', false],
        ['A new product put in a HashSet before it is persisted', true],
        ['Sorting a list of products by their name field', false],
        ['Passing a managed product to em.remove', false],
      ], 'Before persist the id is null; afterwards it has a value, so the hash code changes while the object sits in the set and lookups go to the wrong bucket.'),
      mcq('A Tag entity is shared by many products. Product.tags is @ManyToMany(cascade = CascadeType.ALL). What happens when a product is removed?', [
        ['Only the product and its product_tags rows are deleted, as intended', false],
        ['Hibernate also tries to delete each of the product\'s tags', true],
        ['The tags are detached but left in the database', false],
        ['The removal is refused because tags are shared', false],
      ], 'ALL includes REMOVE, so removing the product cascades to its tags. Those tags belong to other products too, so the delete either breaks their links or fails on foreign keys.'),
      mcq('Inside a transaction a product price is changed, and then a JPQL query on products runs before commit. When is the UPDATE sent?', [
        ['Only at commit, after the query has returned', false],
        ['Before the query, because of FlushModeType.AUTO', true],
        ['Never, since a query discards pending changes', false],
        ['After the query, as part of its result set', false],
      ], 'In AUTO flush mode Hibernate flushes pending changes that could affect a query before running it, so the query sees the new price. The transaction is still uncommitted.'),
    ],
  },
];
