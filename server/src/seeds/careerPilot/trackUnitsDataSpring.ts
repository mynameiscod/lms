import { TopicSeed } from './year1MegaCurriculum';
import { u } from './year4UnitKit';
import { ending } from './trackUnitsWeb';

/**
 * Career-track content, batch 3: MySQL itself, JDBC, Hibernate/JPA and Spring core, for Java Full
 * Stack + AI (and Java Backend Engineer). SQL is not taught again here: the years' SQL topics are
 * language-free and the track's MySQL pack reuses them; this adds what is MySQL's own, and Java
 * reaching it. These topics need a database or a framework to run, so their practice is questions
 * and project briefs rather than auto-graded code.
 */
export const TRACK_DATA_SPRING: Record<string, TopicSeed> = {
  /* ── MySQL ── */
  JT_MYSQL: { category: 'UNIVERSAL', units: [
    u('SETUP_WORKBENCH', 'Installing MySQL 8 and Working in Workbench', 'The server, the client, Workbench, databases, users and privileges.',
      ['Install MySQL 8, connect with Workbench and the mysql client, and create a database and a user'], 40, { skillKeys: ['DB_FUNDAMENTALS'] }),
    u('DATA_TYPES', 'MySQL Data Types', 'INT and BIGINT, DECIMAL for money, VARCHAR and TEXT, DATETIME and TIMESTAMP, ENUM, BOOLEAN and utf8mb4.',
      ['Choose MySQL column types correctly, including for money, time and text in any language'], 40, { after: ['SETUP_WORKBENCH'], skillKeys: ['SQL_BASICS'] }),
    u('CONSTRAINTS_INNODB', 'Keys, Constraints and InnoDB', 'AUTO_INCREMENT, PRIMARY and FOREIGN KEY, UNIQUE, CHECK, ON DELETE rules, and why InnoDB.',
      ['Create tables with keys and constraints and choose ON DELETE behaviour deliberately'], 45, { after: ['DATA_TYPES'], skillKeys: ['DB_FUNDAMENTALS'] }),
    u('SCRIPTS_DUMPS', 'Scripts, Imports and mysqldump', 'Running .sql files, loading CSV data, and backing up and restoring a database.',
      ['Run schema scripts, import CSV data and back up and restore with mysqldump'], 40, { after: ['CONSTRAINTS_INNODB'], skillKeys: ['SQL_BASICS'] }),
    u('VIEWS_PROCEDURES', 'Views, Stored Procedures and Triggers', 'What each is for, how to write one, and why most application logic stays in Java.',
      ['Write a view, a stored procedure and a trigger, and say when not to'], 40, { after: ['SCRIPTS_DUMPS'], skillKeys: ['SQL_BASICS'] }),
    ...ending('MySQL', 'VIEWS_PROCEDURES', { minutes: [40, 55, 35, 40] }),
  ] },

  /* ── JDBC ── */
  JT_JDBC: { category: 'UNIVERSAL', units: [
    u('DRIVER_CONNECTION', 'The JDBC Driver and a Connection', 'The MySQL Connector/J driver, the JDBC URL, DriverManager and closing what you open.',
      ['Connect a Java program to MySQL and close the connection safely'], 40),
    u('PREPARED_STATEMENTS', 'Statement, PreparedStatement and SQL Injection', 'Why string-built SQL is an attack, and how parameters close it.',
      ['Query and update with PreparedStatement and explain how it prevents SQL injection'], 45, { after: ['DRIVER_CONNECTION'] }),
    u('RESULTSET_MAPPING', 'Reading Results into Objects', 'Walking a ResultSet, reading columns by type, handling NULL, and mapping rows to objects.',
      ['Map a ResultSet to a list of Java objects, including NULL columns'], 40, { after: ['PREPARED_STATEMENTS'] }),
    u('TRANSACTIONS', 'Transactions in JDBC', 'autoCommit, commit and rollback, and keeping a transfer all-or-nothing.',
      ['Group statements into a transaction and roll back on failure'], 45, { after: ['RESULTSET_MAPPING'] }),
    u('CONNECTION_POOLS', 'DataSource and Connection Pools', 'Why opening a connection per request fails under load, and HikariCP.',
      ['Use a DataSource with a connection pool and size it sensibly'], 35, { after: ['TRANSACTIONS'] }),
    u('DAO_PATTERN', 'The DAO Pattern', 'Keeping SQL in one layer behind an interface, so the rest of the code never sees it.',
      ['Write a DAO interface and its JDBC implementation'], 40, { after: ['CONNECTION_POOLS'] }),
    ...ending('JDBC', 'DAO_PATTERN', { project: ['MINI_PROJECT', 'Mini Project — An Inventory App on JDBC', 'A console inventory system on MySQL through JDBC: products, stock movements and reports, with DAOs, PreparedStatements and transactions.'] }),
  ] },

  /* ── Hibernate and JPA ── */
  JT_JPA: { category: 'UNIVERSAL', units: [
    u('ORM_IDEA', 'What an ORM Does, and What It Costs', 'Objects and tables, JPA the standard and Hibernate the implementation.',
      ['Explain what JPA and Hibernate do, and the trade-offs against hand-written JDBC'], 35),
    u('ENTITIES', 'Entities and Mappings', '@Entity, @Table, @Column, field types and what Hibernate creates from them.',
      ['Map a class to a table with JPA annotations'], 45, { after: ['ORM_IDEA'] }),
    u('IDS', 'Primary Keys and ID Generation', '@Id, @GeneratedValue strategies, and natural vs surrogate keys.',
      ['Choose an ID generation strategy and explain its consequences on MySQL'], 35, { after: ['ENTITIES'] }),
    u('RELATIONSHIPS', 'Relationships: One-to-Many and Many-to-Many', '@ManyToOne, @OneToMany, @ManyToMany, the owning side, mappedBy and cascades.',
      ['Model one-to-many and many-to-many relationships and say which side owns the foreign key'], 55, { after: ['IDS'] }),
    u('JPQL', 'JPQL and Queries', 'Querying objects rather than tables, parameters, joins, and native queries when needed.',
      ['Write JPQL queries with parameters and joins'], 45, { after: ['RELATIONSHIPS'] }),
    u('FETCHING', 'Lazy and Eager Loading, and the N+1 Problem', 'Fetch types, LazyInitializationException, and fixing N+1 with join fetch.',
      ['Diagnose and fix an N+1 query problem and a LazyInitializationException'], 45, { after: ['JPQL'] }),
    u('PERSISTENCE_CONTEXT', 'The Persistence Context and Entity States', 'Transient, managed, detached and removed; dirty checking; and what flush does.',
      ['Explain entity states and why a changed managed entity is saved without a save call'], 40, { after: ['FETCHING'] }),
    ...ending('JPA and Hibernate', 'PERSISTENCE_CONTEXT', { project: ['MINI_PROJECT', 'Mini Project — The Inventory App on JPA', 'The JDBC inventory app rebuilt on JPA/Hibernate: entities and relationships, JPQL reports, and no N+1 queries — with a note on what got simpler and what got harder.'] }),
  ] },

  /* ── Spring core ── */
  JT_SPRING_CORE: { category: 'UNIVERSAL', units: [
    u('WHY_SPRING', 'Why Spring Exists', 'What a container does for you, and the problems of wiring an application by hand.',
      ['Explain what problem the Spring container solves'], 30),
    u('IOC_DI', 'Inversion of Control and Dependency Injection', 'Constructor injection, @Autowired, and why depending on interfaces makes code testable.',
      ['Wire classes through constructor injection and explain inversion of control'], 45, { after: ['WHY_SPRING'] }),
    u('BEANS_SCOPES', 'Beans, Scopes and the Bean Lifecycle', 'Singleton and prototype, request scope, @PostConstruct and @PreDestroy.',
      ['Choose a bean scope and hook into the bean lifecycle'], 40, { after: ['IOC_DI'] }),
    u('CONFIGURATION', 'Configuration: Component Scanning, @Bean, @Value and Profiles', 'How beans are found, defining them in Java config, reading properties, and dev/prod profiles.',
      ['Configure beans by scanning and by @Bean methods, read properties, and switch profiles'], 45, { after: ['BEANS_SCOPES'] }),
    u('SPRING_MVC', 'Spring MVC: The DispatcherServlet and Controllers', 'How a request reaches a controller method, and @Controller vs @RestController.',
      ['Trace a request through the DispatcherServlet to a controller and back'], 40, { after: ['CONFIGURATION'] }),
    u('AOP', 'AOP and Proxies: How @Transactional Works', 'Aspects, advice and pointcuts, the proxy behind them, and the self-invocation trap.',
      ['Explain how Spring proxies apply @Transactional and why calling a method on this skips it'], 45, { after: ['SPRING_MVC'] }),
    ...ending('Spring Core', 'AOP', { minutes: [40, 55, 40, 40] }),
  ] },
};
