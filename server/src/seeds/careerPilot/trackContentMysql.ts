/**
 * Career-track content: MySQL in Practice (JT_MYSQL), for Java Full Stack + AI and Java Backend
 * Engineer.
 *
 * Plain SQL — SELECT, joins, GROUP BY, normalisation — is taught by the years and is language- and
 * vendor-free. This topic is about what is MySQL's own: installing and connecting to a MySQL 8
 * server, its column types and character sets, InnoDB and its constraints, scripts, CSV imports and
 * mysqldump, and views, stored procedures and triggers. Every statement is MySQL 8 syntax.
 *
 * The topic declares two skills (DB_FUNDAMENTALS, SQL_BASICS), so every checkpoint question names
 * the one it measures, chosen from its own unit's skillKeys.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

/** A checkpoint question, attributed to the one skill it measures. */
const cq = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const DB = 'DB_FUNDAMENTALS';
const SQL = 'SQL_BASICS';

export const TRACK_MYSQL_BUNDLES: PilotBundle[] = [
  /* ── SETUP_WORKBENCH ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_MYSQL_SETUP_WORKBENCH',
    notes: `MySQL is a **server**: a long-running process (\`mysqld\`) that owns the data files and
listens for connections, by default on TCP port **3306**. Everything else — the \`mysql\` command-line
client, MySQL Workbench, your Java program through JDBC — is a **client** that connects to it, sends
SQL and reads the answers back. If the server is not running, no client can do anything.

## Installing MySQL 8

On Windows the MySQL Installer sets up the server as a Windows service (\`MySQL80\`), Workbench and
the shell in one go, and asks you for a **root password** — write it down. On Ubuntu,
\`sudo apt install mysql-server\` installs it as a systemd service. Check it is up:

    mysql -u root -p
    Enter password: ********
    mysql> SELECT VERSION();
    +-----------+
    | VERSION() |
    +-----------+
    | 8.0.36    |
    +-----------+

## Databases, users and privileges

In MySQL a **database** and a **schema** are the same thing. Create one, then a user for your
application — never let an application connect as root:

    CREATE DATABASE shop CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
    CREATE USER 'shop_app'@'localhost' IDENTIFIED BY 'S3cure!pass';
    GRANT SELECT, INSERT, UPDATE, DELETE ON shop.* TO 'shop_app'@'localhost';
    SHOW GRANTS FOR 'shop_app'@'localhost';
    USE shop;
    SHOW TABLES;

A MySQL account is a **user name plus a host**. \`'shop_app'@'localhost'\` and \`'shop_app'@'%'\` are
two different accounts with separate passwords and privileges; \`%\` means "from any host". A login
from another machine matches only an account whose host part allows it.

## Workbench

Workbench is a graphical client. A **connection** stores host, port, user and default schema.
In the SQL editor, Ctrl+Enter runs the statement under the cursor and Ctrl+Shift+Enter runs them
all; results appear in a grid below. By default Workbench runs in **safe updates** mode, which
refuses an \`UPDATE\` or \`DELETE\` without a key column in its \`WHERE\` — an intended guard against
updating every row by accident.

## Common mistakes

- Forgetting \`USE shop;\` and getting *ERROR 1046: No database selected*.
- Granting \`ALL PRIVILEGES ON *.*\` to the application user. Grant only what the app needs, on
  only its own database.
- Assuming a privilege change needs \`FLUSH PRIVILEGES\`: \`GRANT\` and \`CREATE USER\` take effect
  at once; FLUSH is only for direct edits to the grant tables.`,
    workedExample: `**Goal: give a new Spring Boot app its own database and login.**

Connect as root and create the database with a full Unicode character set:

    CREATE DATABASE library CHARACTER SET utf8mb4;

Create the account the application will use. The app runs on the same machine, so the host is
\`localhost\`:

    CREATE USER 'lib_app'@'localhost' IDENTIFIED BY 'Lib#2024pass';
    GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
      ON library.* TO 'lib_app'@'localhost';

Prove it from a new terminal by logging in as that user, not root:

    mysql -u lib_app -p library
    mysql> SELECT CURRENT_USER();      -- lib_app@localhost
    mysql> DROP DATABASE mysql;        -- ERROR 1044: Access denied

The second statement failing is the point: the app's account can work inside \`library\` and
nowhere else.`,
    mcqs: [
      mcq("A MySQL server holds the accounts 'dev'@'localhost' and 'dev'@'%'. How many distinct accounts is that?", [
        ['One account, listed twice because it has two allowed hosts', false],
        ['Two accounts, each with its own password and grants', true],
        ['One account; the % entry is a wildcard alias of it', false],
        ['Zero until FLUSH PRIVILEGES has been executed', false],
      ], 'A MySQL account is identified by user name and host together, so the two rows are separate accounts that can hold different passwords and privileges.'),
      mcq('Workbench rejects `DELETE FROM orders WHERE status = \'CANCELLED\';` with error 1175. What is the cause?', [
        ['Safe updates mode blocks a DELETE whose WHERE uses no key column', true],
        ['The status column must be declared as an ENUM before deleting', false],
        ['Workbench cannot run DELETE; it needs the mysql command line', false],
        ['The table is locked because autocommit is switched off in the session', false],
      ], 'Error 1175 is safe-updates mode refusing an UPDATE or DELETE whose WHERE does not use a key column. Filter by key, or turn it off for the session with SET SQL_SAFE_UPDATES = 0.'),
      mcq('In MySQL 8, what is the relationship between a database and a schema?', [
        ['A schema is a namespace inside a database, as in PostgreSQL', false],
        ['They are synonyms; CREATE SCHEMA creates a database', true],
        ['A schema is the table definitions only, without any rows', false],
      ], 'MySQL treats DATABASE and SCHEMA as the same keyword: CREATE SCHEMA shop and CREATE DATABASE shop do exactly the same thing. It has no extra namespace level.'),
    ],
    checkpoint: [
      cq(DB, "A teammate's laptop connects to your MySQL server over the LAN as app_user and gets \"Access denied\". Only 'app_user'@'localhost' exists. What is the minimal fix?", [
        ["Create an account such as 'app_user'@'192.168.1.%' and grant it", true],
        ['Run FLUSH PRIVILEGES so localhost accounts accept LAN logins', false],
        ['Restart mysqld so it rereads the account table on boot', false],
        ['Change the port from 3306 so the firewall lets them through', false],
      ], 'A localhost account only matches connections from the server machine itself. A login from the LAN needs an account whose host part covers that address.'),
      cq(DB, 'Why should a web application connect with its own MySQL user rather than root?', [
        ['Root accounts are never permitted to connect over JDBC drivers', false],
        ['A leaked or misused login can then touch only its own data', true],
        ['MySQL limits root to a single connection at a time', false],
      ], 'Least privilege: if the app is compromised or buggy, an account granted only on its own database cannot drop other databases or create users.'),
      cq(DB, 'After `CREATE DATABASE hr;` you run `CREATE TABLE staff (id INT);` in a fresh session and get ERROR 1046. What is missing?', [
        ['A default database: run USE hr; or write hr.staff', true],
        ['A primary key, which every MySQL table requires', false],
        ['A COMMIT after CREATE DATABASE so it becomes visible', false],
      ], 'Error 1046 is "No database selected". CREATE TABLE needs a current database from USE, or a qualified name such as hr.staff.'),
    ],
  },

  /* ── DATA_TYPES ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_MYSQL_DATA_TYPES',
    notes: `Choosing a column type decides what can be stored, how much space it takes, and which bugs
you will have later. MySQL 8 has a few types every Java developer must get right.

## Whole numbers

\`INT\` is 4 bytes, up to about 2.1 billion (4.29 billion \`UNSIGNED\`). \`BIGINT\` is 8 bytes and maps to
Java \`long\`; use it for ids of tables that can grow large. \`TINYINT\` is 1 byte. Note that in MySQL 8
\`INT(11)\` does **not** limit digits — the display width is deprecated and ignored.

## Money: DECIMAL, never FLOAT

\`FLOAT\` and \`DOUBLE\` are binary approximations:

    CREATE TABLE t (f FLOAT, d DECIMAL(10,2));
    INSERT INTO t VALUES (0.1, 0.1), (0.2, 0.2);
    SELECT SUM(f), SUM(d) FROM t;
    -- 0.30000000447034836 | 0.30

\`DECIMAL(10,2)\` stores exact decimal digits — 10 in total, 2 after the point — and maps to Java
\`BigDecimal\`. Money, quantities with fractions and tax rates go in DECIMAL.

## Text

\`VARCHAR(n)\` holds up to *n characters* (not bytes) and stores only what you put in. \`CHAR(n)\` is
fixed length, padded with spaces — good for codes such as a 2-letter country. \`TEXT\` holds up to
64 KB and cannot have a default value in older versions or be fully indexed; use it for long free text.

## Character sets: utf8mb4

MySQL's old \`utf8\` (an alias of \`utf8mb3\`) stores at most 3 bytes per character, so emoji and some
scripts fail. \`utf8mb4\` is real UTF-8 and is the MySQL 8 default, with collation
\`utf8mb4_0900_ai_ci\` (accent- and case-insensitive comparisons).

## Dates and times

\`DATE\` is a day; \`DATETIME\` stores the value exactly as given, range 1000–9999. \`TIMESTAMP\` is
converted from the session time zone to UTC on write and back on read, and its range ends in
**2038**. Use \`DATETIME\` for an appointment's local time, \`TIMESTAMP\` (or DATETIME in UTC) for
"when did this row change".

## ENUM and BOOLEAN

\`ENUM('NEW','PAID','SHIPPED')\` stores one of a fixed list compactly; adding a value needs an
\`ALTER TABLE\`. \`BOOLEAN\` is simply \`TINYINT(1)\`: \`TRUE\` is 1, and nothing stops a 7 being stored.

## Common mistakes

- \`FLOAT\` for prices; \`VARCHAR\` for dates (sorting \`'9/1/2024'\` after \`'10/1/2024'\`).
- \`utf8\` in an old script, then a customer's name with an emoji fails to insert.`,
    workedExample: `**Goal: choose types for an orders table.**

    CREATE TABLE orders (
      id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      customer_name VARCHAR(100) NOT NULL,
      country_code CHAR(2)       NOT NULL,
      total        DECIMAL(12,2) NOT NULL,
      status       ENUM('NEW','PAID','SHIPPED','CANCELLED') NOT NULL DEFAULT 'NEW',
      gift         BOOLEAN       NOT NULL DEFAULT FALSE,
      note         TEXT,
      placed_at    DATETIME      NOT NULL,
      updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4;

Reasoning: \`BIGINT\` because orders accumulate for years; \`CHAR(2)\` because every country code is
exactly two letters; \`DECIMAL(12,2)\` because a total must add up to the paisa; \`ENUM\` because the
status list is short and fixed; \`placed_at\` as DATETIME because it is the business time the
customer saw; \`updated_at\` as an automatic TIMESTAMP so MySQL maintains it on every change.`,
    mcqs: [
      mcq('A `price FLOAT` column holds 19.99 in many rows, and a report of `SUM(price)` is off by a fraction of a paisa. Which column type removes the error?', [
        ['DOUBLE, because it has twice the precision of FLOAT', false],
        ['DECIMAL(10,2), which stores exact decimal digits', true],
        ['INT, after multiplying every value by one hundred', false],
        ['VARCHAR(10), so the digits are kept exactly as typed', false],
      ], 'DOUBLE is still a binary approximation, so 19.99 is never stored exactly. DECIMAL stores the decimal digits themselves, so sums are exact. Integer paise also works but loses the natural rupee value; DECIMAL is the standard answer.'),
      mcq('A table uses `CHARACTER SET utf8` in MySQL 8. Inserting a name containing an emoji fails. Why?', [
        ['MySQL utf8 is utf8mb3, which allows at most three bytes per character', true],
        ['Emoji are not part of Unicode, so no MySQL charset can accept or store them', false],
        ['VARCHAR columns can hold only ASCII unless declared NVARCHAR', false],
        ['The collation must be changed to a binary one to store emoji', false],
      ], 'MySQL utf8 is an alias of utf8mb3, capped at three bytes per character. Emoji need four bytes, so the column must be utf8mb4.'),
      mcq('What does `INT(5)` limit in a MySQL 8 column definition?', [
        ['It caps stored values at five digits, so 123456 is rejected', false],
        ['Nothing about the stored range; the width is deprecated', true],
        ['It reserves five bytes of storage instead of the usual four', false],
      ], 'The display width of integer types never restricted values and is deprecated in MySQL 8. INT(5) still stores the full 4-byte INT range.'),
    ],
    checkpoint: [
      cq(SQL, 'A booking system must store a dentist appointment at 10:30 local time in Pune, and show exactly 10:30 even if the server time zone changes. Which type fits?', [
        ['TIMESTAMP, since it tracks and adjusts for time zones automatically', false],
        ['DATETIME, since it stores the value without conversion', true],
        ['DATE, since appointments are booked by the day', false],
        ['INT, holding the seconds since the Unix epoch', false],
      ], 'TIMESTAMP is converted through the session time zone, so a changed server zone shows a different hour. DATETIME stores the wall-clock value as given.'),
      cq(SQL, 'A `rating BOOLEAN` column accepts `INSERT ... VALUES (5)` without error. Why?', [
        ['MySQL BOOLEAN is a synonym for TINYINT(1), which holds -128 to 127', true],
        ['Strict mode was off, so MySQL silently stored TRUE in its place', false],
        ['BOOLEAN accepts any number but rounds it when it is read', false],
      ], 'BOOLEAN is just TINYINT(1) in MySQL, so any value in the TINYINT range is stored as given; only TRUE and FALSE are mapped to 1 and 0.'),
      cq(SQL, 'An `audit_log.created_at` column must keep working for rows written in 2040. Which choice is safe?', [
        ['TIMESTAMP, since it is the type meant for audit columns', false],
        ['DATETIME, since its range runs to the year 9999', true],
        ['YEAR, combined with a separate TIME column', false],
      ], 'TIMESTAMP stops at 2038-01-19 03:14:07 UTC. DATETIME runs to 9999-12-31, so dates beyond 2038 need DATETIME.'),
    ],
  },

  /* ── CONSTRAINTS_INNODB ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_MYSQL_CONSTRAINTS_INNODB',
    notes: `Constraints are rules the database enforces no matter which program writes to it. In MySQL
they only fully work in the **InnoDB** storage engine — the default since 5.5 and the only sensible
choice for an application.

## Why InnoDB

InnoDB gives you **transactions** (COMMIT, ROLLBACK), **row-level locking** so two users can update
different rows at once, **crash recovery** from its redo log, and it **enforces foreign keys**. The
older MyISAM has none of these: no transactions, whole-table locks, and it silently ignores
FOREIGN KEY clauses. Check a table with \`SHOW TABLE STATUS LIKE 'orders';\` or \`SHOW CREATE TABLE\`.

## Keys and AUTO_INCREMENT

    CREATE TABLE customers (
      id    INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(150) NOT NULL UNIQUE,
      age   INT CHECK (age >= 18)
    ) ENGINE=InnoDB;

\`AUTO_INCREMENT\` hands out the next id; \`LAST_INSERT_ID()\` returns the one this session just got.
Ids are not guaranteed gap-free: a rolled-back insert still consumes its number. In InnoDB the
primary key is the **clustered index** — rows are physically stored in key order — so keep it short.
\`UNIQUE\` allows several NULLs, because NULL is never equal to NULL. \`CHECK\` constraints are
**enforced only from MySQL 8.0.16**; earlier versions parsed and ignored them.

## Foreign keys and ON DELETE

    CREATE TABLE orders (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB;

Inserting an order for a customer that does not exist fails with **ERROR 1452**. Deleting a customer
who still has orders depends on the rule you chose:

- \`RESTRICT\` / \`NO ACTION\` (the default): refuse with **ERROR 1451**.
- \`CASCADE\`: delete the orders too.
- \`SET NULL\`: keep the orders with \`customer_id\` NULL — the column must be nullable.

Choose deliberately. CASCADE is right for parts that cannot exist alone (an order's line items);
it is dangerous for records with their own value (invoices), where RESTRICT protects history.

## Common mistakes

- Creating a child table before its parent, or with a different column type (\`INT\` vs
  \`BIGINT UNSIGNED\`): ERROR 3780 / 1215, "cannot add foreign key constraint".
- Expecting ids with no gaps; using them as invoice numbers.`,
    workedExample: `**Goal: decide ON DELETE for three relationships.**

    order_items.order_id   -> orders.id     ON DELETE CASCADE
    orders.customer_id     -> customers.id  ON DELETE RESTRICT
    orders.coupon_id       -> coupons.id    ON DELETE SET NULL

- An order line means nothing without its order, so deleting the order should remove its lines:
  **CASCADE**.
- A customer with orders is part of the company's financial history; deleting them should be
  refused until someone decides what to do: **RESTRICT** (ERROR 1451 tells the app why).
- A coupon being retired should not destroy the orders that used it; they simply no longer
  point at one: **SET NULL**, with \`coupon_id INT NULL\`.

Test the RESTRICT rule:

    DELETE FROM customers WHERE id = 7;
    -- ERROR 1451 (23000): Cannot delete or update a parent row: a foreign key constraint fails`,
    mcqs: [
      mcq('An old table was created with ENGINE=MyISAM and a FOREIGN KEY clause. Orders for missing customers insert fine. Why?', [
        ['MyISAM parses foreign key clauses but does not enforce them', true],
        ['Foreign keys need a CHECK constraint alongside to be enforced', false],
        ['The orders table must also list the customers in an index hint', false],
        ['Foreign keys are only checked when the session runs COMMIT', false],
      ], 'Only InnoDB enforces foreign keys. MyISAM accepts the clause and discards it, so nothing stops orphan rows. Convert with ALTER TABLE ... ENGINE=InnoDB.'),
      mcq('A `UNIQUE` index on `customers.phone` (nullable). Three customers have no phone. Can all three rows exist?', [
        ['No: the second NULL violates the unique index', false],
        ['Yes: NULLs never compare equal, so they do not clash', true],
        ['Only if the column is declared UNIQUE NULLS DISTINCT', false],
      ], 'A MySQL UNIQUE index allows any number of NULLs, because NULL is not equal to NULL. Add NOT NULL if every customer must have a distinct phone.'),
      mcq('Inserts into `orders` (AUTO_INCREMENT) give ids 1, 2, 3; the next insert is rolled back; the one after commits. What id does it get?', [
        ['3, since the rollback hands the number back', false],
        ['4, since rolled-back rows never consume an auto-increment id', false],
        ['5, since the rolled-back insert used up id 4', true],
      ], 'InnoDB does not return an auto-increment value on rollback, so gaps appear. Ids are unique and increasing but not consecutive.'),
    ],
    checkpoint: [
      cq(DB, 'A `payments.invoice_id` references `invoices.id`. Finance must never lose payment history when someone deletes an invoice by mistake. Which rule fits?', [
        ['ON DELETE CASCADE, so payments follow the invoice', false],
        ['ON DELETE RESTRICT, so the delete is refused', true],
        ['ON DELETE SET NULL, so payments become orphans', false],
        ['No foreign key, so the delete is never blocked', false],
      ], 'RESTRICT refuses to delete a parent that still has children, so a mistaken delete fails with error 1451 instead of erasing or orphaning payments.'),
      cq(DB, 'On MySQL 8.0.36, `CREATE TABLE p (qty INT CHECK (qty > 0));` then `INSERT INTO p VALUES (-2);`. What happens?', [
        ['The row is stored; CHECK is parsed but ignored', false],
        ['ERROR 3819: check constraint is violated', true],
        ['The value is clipped to 1 with a warning', false],
      ], 'From 8.0.16 MySQL enforces CHECK constraints, so the insert fails with error 3819. Only older versions silently ignored them.'),
      cq(DB, 'Two users update different rows of the same InnoDB table at the same moment. What does InnoDB do?', [
        ['Locks the whole table so the second user waits', false],
        ['Locks only the rows involved, so both proceed', true],
        ['Rejects the second update with a deadlock error', false],
      ], 'InnoDB uses row-level locking, so writers to different rows do not block each other. MyISAM locks the whole table.'),
    ],
  },

  /* ── SCRIPTS_DUMPS ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_MYSQL_SCRIPTS_DUMPS',
    notes: `A real project keeps its database as **files**: a schema script, seed data, and backups. Three
tools cover nearly everything — running a .sql file, loading a CSV, and mysqldump.

## Running a .sql script

From the shell, feed the file to the client:

    mysql -u root -p shop < schema.sql

Inside the client, use \`SOURCE\`:

    mysql> SOURCE C:/projects/shop/schema.sql;

In Workbench, File → Open SQL Script, then run all (Ctrl+Shift+Enter). A good script is
**re-runnable**: \`DROP TABLE IF EXISTS\` (children first) or \`CREATE TABLE IF NOT EXISTS\`, and parents
created before children so foreign keys resolve.

## Loading a CSV: LOAD DATA

    LOAD DATA LOCAL INFILE 'C:/data/products.csv'
    INTO TABLE products
    FIELDS TERMINATED BY ',' ENCLOSED BY '"'
    LINES TERMINATED BY '\\r\\n'
    IGNORE 1 LINES
    (sku, name, price);

\`LOCAL\` means the file is on the **client** machine. That needs \`local_infile\` enabled on the
server (\`SET GLOBAL local_infile = 1;\`) and the client started with \`--local-infile=1\`; otherwise you
get *ERROR 3948: Loading local data is disabled*. Without LOCAL, the file is read from the server's
disk and must sit in the directory named by \`secure_file_priv\`. \`IGNORE 1 LINES\` skips the header.
Windows files end lines with \\r\\n; get that wrong and the last column gains a stray carriage return.
LOAD DATA is many times faster than thousands of INSERTs.

## Backup and restore with mysqldump

    mysqldump -u root -p --single-transaction --routines --triggers shop > shop_2024-06-01.sql
    mysql -u root -p shop_restore < shop_2024-06-01.sql

mysqldump writes a **logical** backup: plain SQL that recreates the tables and inserts the rows.
\`--single-transaction\` takes a consistent snapshot of InnoDB tables without locking them;
\`--routines\` and \`--triggers\` include stored procedures and triggers (triggers are dumped by default,
routines are not). \`--databases shop\` adds the CREATE DATABASE and USE lines; without it you must
create the target database yourself before restoring. \`--no-data\` dumps the schema only.

## Common mistakes

- Never testing a restore. A backup you have not restored is a hope, not a backup.
- Running a script in the wrong database because it has no \`USE\` line.
- Forgetting \`--routines\`, then discovering after a restore that the procedures are gone.`,
    mcqs: [
      mcq('`mysql -u root -p < seed.sql` fails at its first INSERT with ERROR 1046. The script has no USE line. Which command fixes it without editing the file?', [
        ['mysql -u root -p shop < seed.sql', true],
        ['mysql -u root -p --force < seed.sql', false],
        ['mysql -u root -p -e seed.sql', false],
        ['mysqldump -u root -p shop < seed.sql', false],
      ], 'Naming the database on the command line makes it the default for the session, so unqualified table names resolve. --force only skips errors; mysqldump writes backups rather than running them.'),
      mcq('Which mysqldump option gives a consistent backup of InnoDB tables without locking them for the whole dump?', [
        ['--lock-all-tables', false],
        ['--single-transaction', true],
        ['--quick', false],
        ['--no-create-info', false],
      ], '--single-transaction starts a REPEATABLE READ transaction and dumps from that snapshot, so writers keep working. --lock-all-tables blocks them; --quick only streams rows.'),
      mcq('A CSV exported from Excel on Windows is loaded with `LINES TERMINATED BY \'\\n\'`. Every price imports but the last column of each row compares oddly. Why?', [
        ['IGNORE 1 LINES skipped the header and shifted the columns', false],
        ['Excel quotes every number, so LOAD DATA stores them as text', false],
        ['Each line ends in \\r\\n, so a \\r is left on the last field', true],
      ], 'Windows ends lines with carriage return plus newline. Splitting on \\n alone leaves the \\r attached to the final field; use LINES TERMINATED BY \'\\r\\n\'.'),
    ],
    checkpoint: [
      cq(SQL, 'You restore last night\'s dump and the app fails: stored procedures are missing, though every table is back. Which option was left off the dump?', [
        ['--triggers', false],
        ['--routines', true],
        ['--add-drop-table', false],
        ['--extended-insert', false],
      ], 'mysqldump omits stored procedures and functions unless --routines is given. Triggers, by contrast, are included by default.'),
      cq(SQL, 'Loading 2 million rows from a CSV takes hours as individual INSERT statements from a script. What is the MySQL-native faster route?', [
        ['Running the script through Workbench instead', false],
        ['Wrapping each INSERT in its own transaction', false],
        ['LOAD DATA INFILE into the table', true],
      ], 'LOAD DATA parses the file inside the server and writes rows in bulk, typically far faster than issuing millions of single-row statements.'),
      cq(SQL, 'A schema script must run cleanly on a fresh database and again on one where it already ran. Which pattern makes that true?', [
        ['DROP TABLE IF EXISTS for each table, children before parents, then CREATE', true],
        ['CREATE TABLE for each table, parents first, with --force on the client', false],
        ['TRUNCATE every table at the top so the CREATE lines succeed', false],
      ], 'Dropping children first avoids foreign key errors, IF EXISTS avoids errors on a fresh database, and the CREATE statements then rebuild everything.'),
    ],
  },

  /* ── VIEWS_PROCEDURES ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_MYSQL_VIEWS_PROCEDURES',
    notes: `MySQL can store logic inside the database: **views**, **stored procedures** and **triggers**.
Each has a proper use, and each can become a trap when business logic hides where the Java code
cannot see it.

## Views

A view is a **saved query** that you can select from like a table. It stores no rows of its own;
MySQL runs the underlying query each time.

    CREATE VIEW customer_totals AS
    SELECT c.id, c.name, SUM(o.total) AS spent
    FROM customers c JOIN orders o ON o.customer_id = c.id
    GROUP BY c.id, c.name;

    SELECT * FROM customer_totals WHERE spent > 10000;

Use views to name a frequently used join, or to expose only some columns to a reporting user
(\`GRANT SELECT ON shop.customer_totals TO 'report'@'%';\`). A view with GROUP BY, DISTINCT or
aggregates is not updatable. MySQL has no materialised views.

## Stored procedures

A procedure is a named program on the server, called with \`CALL\`. In the mysql client you must
change the delimiter so the semicolons inside the body do not end the CREATE:

    DELIMITER //
    CREATE PROCEDURE monthly_sales(IN p_year INT, IN p_month INT, OUT p_total DECIMAL(12,2))
    BEGIN
      SELECT COALESCE(SUM(total), 0) INTO p_total
      FROM orders
      WHERE YEAR(placed_at) = p_year AND MONTH(placed_at) = p_month;
    END //
    DELIMITER ;

    CALL monthly_sales(2024, 5, @t);
    SELECT @t;      -- 184250.00

Parameters are \`IN\`, \`OUT\` or \`INOUT\`. From Java you call one with \`CallableStatement\`.

## Triggers

A trigger runs automatically \`BEFORE\` or \`AFTER\` an \`INSERT\`, \`UPDATE\` or \`DELETE\`, once per row,
with \`NEW\` and \`OLD\` holding the row's values:

    CREATE TRIGGER price_audit AFTER UPDATE ON products
    FOR EACH ROW
      INSERT INTO price_history(product_id, old_price, new_price, changed_at)
      VALUES (OLD.id, OLD.price, NEW.price, NOW());

## Why most logic stays in Java

Procedures and triggers are hard to unit-test, invisible in a code review of the Java project,
versioned separately from the application, and tie you to MySQL's dialect. Triggers in particular
cause "spooky" side effects nobody expects. Keep business rules in the service layer; use these
tools for reporting views, audit trails and heavy set-based jobs close to the data.

## Common mistakes

- Forgetting \`DELIMITER\` and getting a syntax error at the first semicolon of the body.
- Writing a trigger that updates the same table it fires on: ERROR 1442.`,
    mcqs: [
      mcq('A view `active_users` is defined as `SELECT * FROM users WHERE active = 1`. A new active user is inserted into `users`. When does the view show them?', [
        ['Only after the view is refreshed with an ALTER VIEW statement', false],
        ['Immediately, since the view reruns its query each time', true],
        ['Overnight, when MySQL rebuilds the stored view rows', false],
      ], 'A MySQL view stores only its query, never rows, so every SELECT from it reads the current base table.'),
      mcq('In the mysql client, a CREATE PROCEDURE with several statements inside BEGIN ... END fails with a syntax error at the first semicolon. What is missing?', [
        ['A DELIMITER change so the body\'s semicolons do not end the statement', true],
        ['The SQL SECURITY INVOKER clause placed after the parameter list', false],
        ['A COMMIT after each statement inside the procedure body', false],
      ], 'The client splits input at the delimiter. Switching it to // (or $$) for the CREATE lets the semicolons inside the body reach the server intact.'),
      mcq('Inside a BEFORE UPDATE trigger on `products`, what do `OLD.price` and `NEW.price` hold?', [
        ['The table default and the value about to be written', false],
        ['The value about to be written and the previous value', false],
        ['The previous value and the value about to be written', true],
      ], 'OLD is the row as it was; NEW is the row as it will be stored. In a BEFORE trigger you may even modify NEW before it is written.'),
    ],
    checkpoint: [
      cq(SQL, 'A reporting tool must read customer names and totals but never see email or phone. Which MySQL feature fits best?', [
        ['A stored procedure that copies the whole table every night', false],
        ['A trigger that blanks the email and phone columns on every SELECT', false],
        ['A view with only the allowed columns, granted to the report user', true],
      ], 'A view exposes a chosen projection of the data and can be granted on its own, so the report user never has access to the base table. Triggers do not fire on SELECT.'),
      cq(SQL, 'A team puts its discount rules in a trigger on `orders`. Months later a Java developer cannot work out why totals change after saving. What is the core problem?', [
        ['Triggers are much slower than Java at doing any kind of decimal arithmetic', false],
        ['Logic in the database is hidden from the code being read and tested', true],
        ['MySQL triggers may fire only once per table on any given day', false],
      ], 'Triggers act implicitly. The behaviour is invisible in the application code, its tests and its reviews, which is why business rules usually belong in the service layer.'),
      cq(SQL, 'An AFTER INSERT trigger on `orders` runs `UPDATE orders SET flagged = 1 WHERE id = NEW.id`. What happens on insert?', [
        ['The new row is flagged as intended', false],
        ['ERROR 1442: cannot update the table the trigger fires on', true],
        ['The trigger loops until the server recursion depth limit is reached', false],
      ], 'MySQL forbids a trigger from modifying the table that fired it. Set NEW.flagged in a BEFORE INSERT trigger instead.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_MYSQL_DEBUGGING',
    notes: `MySQL errors carry a **number** and usually name the exact cause. Read the number first, then
check the one thing it points at. These are the faults a new Java developer meets in the first month.

## 1. Totals that are off by a fraction — FLOAT for money

    SELECT SUM(amount) FROM payments;   -- 1049.9999694824219

*Diagnosis:* \`amount\` is \`FLOAT\`. *Fix:* \`ALTER TABLE payments MODIFY amount DECIMAL(12,2) NOT NULL;\`
and fix any rows that were already rounded wrongly.

## 2. ERROR 1366: Incorrect string value: '\\xF0\\x9F\\x98\\x80'

*Diagnosis:* the bytes starting \`F0\` are a 4-byte UTF-8 character (an emoji) and the column is
\`utf8\`/utf8mb3. *Fix:* \`ALTER TABLE reviews CONVERT TO CHARACTER SET utf8mb4;\` and make sure the JDBC
connection also uses utf8mb4.

## 3. ERROR 1452: Cannot add or update a child row: a foreign key constraint fails

*Diagnosis:* the insert names a parent id that does not exist — often because the script inserts
\`orders\` before \`customers\`, or uses a hard-coded id. *Fix:* insert the parent first; never disable
\`FOREIGN_KEY_CHECKS\` to make the error go away.

## 4. Deleting one customer removed thousands of rows

*Diagnosis:* \`SHOW CREATE TABLE orders\` reveals \`ON DELETE CASCADE\`, and \`invoices\` cascades from
orders too. *Fix:* restore from backup, then change the rule to RESTRICT where history matters.

## 5. ERROR 1055: ... isn't in GROUP BY ... incompatible with sql_mode=only_full_group_by

    SELECT customer_id, name, SUM(total) FROM orders GROUP BY customer_id;

*Diagnosis:* \`name\` is neither grouped nor aggregated, so MySQL 8 refuses rather than picking an
arbitrary value. *Fix:* add it to GROUP BY (or use \`ANY_VALUE(name)\` if it truly does not matter);
do not switch the mode off.

## 6. Times shifted by 5½ hours

*Diagnosis:* the column is \`TIMESTAMP\` and the app's session time zone is UTC while Workbench uses
+05:30, so the same stored instant displays differently. *Fix:* set the zone explicitly
(\`connectionTimeZone\` in the JDBC URL, \`SET time_zone\`), and store UTC consistently.

## 7. ERROR 1045: Access denied for user 'app'@'10.0.0.5'

*Diagnosis:* only \`'app'@'localhost'\` exists; the app now runs on another host. *Fix:* create the
account for that host and grant it; check with \`SELECT user, host FROM mysql.user;\`.

## 8. ERROR 3948: Loading local data is disabled

*Diagnosis:* \`LOAD DATA LOCAL\` needs \`local_infile\` on in both server and client. *Fix:*
\`SET GLOBAL local_infile = 1;\` and reconnect with \`--local-infile=1\`, or put the file in
\`secure_file_priv\` and drop LOCAL.`,
    mcqs: [
      mcq("INSERT INTO comments(body) VALUES ('Great course 👍') fails with ERROR 1366 Incorrect string value: '\\xF0\\x9F\\x91\\x8D'. What is the fix?", [
        ['Convert the table to utf8mb4 so four-byte characters fit', true],
        ['Change body from VARCHAR to TEXT so that it can hold emoji symbols', false],
        ['Switch to a binary collation such as utf8_bin', false],
        ['Escape the emoji with a backslash before inserting', false],
      ], 'The bytes F0 9F 91 8D are one four-byte UTF-8 character. utf8 (utf8mb3) cannot store it in any column type or collation; only utf8mb4 can.'),
      mcq('A seed script stops at `INSERT INTO orders VALUES (1, 42, 999.00);` with ERROR 1452, though customer 42 is inserted later in the same script. What is the right fix?', [
        ['SET FOREIGN_KEY_CHECKS = 0 at the top of the script', false],
        ['Move the customer inserts above the order inserts', true],
        ['Drop the foreign key from orders permanently', false],
        ['Add ON DELETE CASCADE to the foreign key', false],
      ], 'Error 1452 means the referenced parent did not exist at insert time. Inserting parents first fixes the cause; turning checks off lets real orphans in unnoticed.'),
      mcq('`SELECT dept_id, emp_name, MAX(salary) FROM employees GROUP BY dept_id;` fails on MySQL 8 with ERROR 1055. Why?', [
        ['MAX cannot be combined with a GROUP BY clause in MySQL 8', false],
        ['emp_name is not grouped or aggregated under ONLY_FULL_GROUP_BY', true],
        ['dept_id must be the last column listed in the select list', false],
        ['The employees table needs an index on salary first', false],
      ], 'ONLY_FULL_GROUP_BY is on by default in MySQL 8, so every selected column must be grouped, aggregated or functionally dependent on the group key. emp_name is none of these.'),
      mcq("A Spring Boot app deployed to a new server gets ERROR 1045 Access denied for user 'shop'@'10.0.2.15'. The password is correct and the app worked on the developer's machine. What is the first thing to check?", [
        ['Whether an account exists for shop at that host, not only localhost', true],
        ['Whether the server has already run out of its max_connections', false],
        ['Whether the database tables use InnoDB rather than MyISAM', false],
        ['Whether the JDBC driver jar is on the classpath', false],
      ], 'MySQL matches the account on user and host. A login from 10.0.2.15 cannot use \'shop\'@\'localhost\'; it needs an account such as \'shop\'@\'10.0.2.%\'. Too many connections and a missing driver give different errors.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_MYSQL_PRACTICE',
    notes: `Work these on a real MySQL 8 server, in Workbench or the mysql client. Write each statement,
run it, and check the result before reading on.

## Exercise 1 — a database and a least-privilege user

Create a database \`clinic\` in utf8mb4, and a user \`clinic_app\` that can connect only from the same
machine and can read and write rows in \`clinic\` but cannot create or drop tables. Prove the last part
by trying \`DROP TABLE\` as that user.

## Exercise 2 — types for a patient table

Create \`patients\` with: a BIGINT auto-increment id; a name up to 120 characters that accepts any
script, including Tamil and emoji; a 10-digit mobile number (think: is it a number?); date of birth;
a consultation fee to the paisa; a gender from a fixed list; and a \`created_at\` MySQL fills in by
itself. Justify each type in a comment.

## Exercise 3 — keys and ON DELETE

Add \`doctors\` and \`appointments\`. An appointment needs a patient and a doctor. Deleting a patient
must remove their future appointments; deleting a doctor must be refused while appointments exist.
Write both foreign keys, then demonstrate error 1451 and the cascade.

## Exercise 4 — import and back up

Prepare a CSV of 20 patients with a header row and Windows line endings. Load it with
\`LOAD DATA LOCAL INFILE\`, enabling whatever it needs. Then take a mysqldump of \`clinic\` with its
routines, restore it into \`clinic_copy\`, and compare \`SELECT COUNT(*)\` in both.

## Exercise 5 — a view and a procedure

Create a view \`doctor_load\` showing each doctor and their number of appointments this month. Then
write a procedure \`book(IN p_patient BIGINT, IN p_doctor INT, IN p_at DATETIME)\` that inserts an
appointment. Call it, and select from the view to see the count rise.

## Exercise 6 — break and repair

On purpose: insert an appointment for patient 9999; insert a name with an emoji into a utf8 copy
of the table; run a GROUP BY that selects an ungrouped column. Record each error number, then fix
each one by its cause.`,
    mcqs: [
      mcq('For Exercise 2, which type should hold a 10-digit Indian mobile number such as 0987654321?', [
        ['INT, because a phone number is made of digits', false],
        ['CHAR(10) or VARCHAR(15), because it is an identifier, not a quantity', true],
        ['DECIMAL(10,0), so that no digit of the number can ever be lost', false],
        ['BIGINT UNSIGNED, which is comfortably large enough for ten digits', false],
      ], 'A phone number is never added or averaged, can begin with 0 and may need a + prefix; numeric types drop leading zeros. INT also cannot hold every 10-digit value.'),
      mcq('For Exercise 3, which clause on `appointments.doctor_id` makes deleting a doctor fail while appointments exist?', [
        ['ON DELETE SET NULL', false],
        ['ON DELETE RESTRICT', true],
        ['ON DELETE CASCADE', false],
        ['ON UPDATE CASCADE', false],
      ], 'RESTRICT (or the default NO ACTION) refuses the delete with error 1451 while child rows reference the parent.'),
      mcq('In Exercise 1, which GRANT lets `clinic_app` read and write rows but not drop tables?', [
        ["GRANT SELECT, INSERT, UPDATE, DELETE ON clinic.* TO 'clinic_app'@'localhost'", true],
        ["GRANT ALL PRIVILEGES ON clinic.* TO 'clinic_app'@'localhost' WITH GRANT OPTION", false],
        ["GRANT USAGE, CREATE VIEW ON clinic.* TO 'clinic_app'@'localhost'", false],
      ], 'The four data privileges cover reading and writing rows. ALL includes DROP; USAGE grants nothing beyond the ability to log in, and CREATE VIEW adds no row access.'),
      mcq('In Exercise 4, `SELECT COUNT(*)` gives 20 in `clinic` but `clinic_copy` has no tables after restoring with `mysql clinic_copy < clinic.sql`. The dump was taken with `--databases clinic`. What happened?', [
        ['--databases wrote USE clinic into the dump, so it restored into clinic', true],
        ['--databases dumps only the schema, never the rows of the tables', false],
        ['The restore needs --single-transaction to create the tables', false],
      ], 'With --databases, mysqldump writes CREATE DATABASE and USE clinic lines, which override the database named on the command line. Dump without --databases to restore under another name.'),
      mcq('In Exercise 5, the procedure body uses several statements. Typed in the mysql client, what must surround the CREATE PROCEDURE?', [
        ['SET autocommit = 0 before it and SET autocommit = 1 after it', false],
        ['START TRANSACTION before it and COMMIT after it', false],
        ['DELIMITER // before it and DELIMITER ; after it', true],
      ], 'Changing the client delimiter keeps the semicolons inside BEGIN ... END from ending the CREATE early. Transactions have nothing to do with it.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_MYSQL_INTERVIEW_QUESTION',
    notes: `Three questions a Java backend interviewer asks about MySQL, with answers that would earn the
follow-up, and the follow-up itself.

## Q1. "What is the difference between InnoDB and MyISAM, and which would you use?"

**Strong answer:** InnoDB is MySQL's default engine and the one I would use. It supports
**transactions** with COMMIT and ROLLBACK, **row-level locking** so concurrent writers do not block
each other, **foreign key enforcement**, and **crash recovery** through its redo log. Its primary key
is a clustered index, so rows are stored in key order. MyISAM has none of these: no transactions,
table-level locks, and it ignores foreign keys; after a crash its tables may need repair. MyISAM's
old advantages, such as full-text search and a fast \`COUNT(*)\`, no longer justify it — InnoDB has
had full-text indexes since 5.6.

**Follow-up:** "Why does the primary key choice matter more in InnoDB?" — Because every secondary
index stores the primary key value to find the row, so a long primary key (say a UUID string) makes
every index larger, and random keys cause page splits on insert.

## Q2. "DELETE vs TRUNCATE vs DROP — what is the difference?"

**Strong answer:** \`DELETE\` is DML: it removes rows matching a WHERE (or all rows), one by one, fires
DELETE triggers, can be rolled back in a transaction, and does not reset AUTO_INCREMENT.
\`TRUNCATE TABLE\` is DDL: it drops and recreates the table's storage, so it is very fast, resets
AUTO_INCREMENT, fires no triggers, causes an implicit commit so it cannot be rolled back, and fails if
another table's foreign key references it. \`DROP TABLE\` removes the table itself — structure, data,
indexes and triggers.

**Follow-up:** "CHAR vs VARCHAR?" — \`CHAR(n)\` is fixed length, right-padded with spaces (trailing
spaces are stripped on read), good for values that are always the same length such as a currency
code. \`VARCHAR(n)\` stores the actual length plus a 1–2 byte length prefix, for anything that varies.
In both, n counts characters, not bytes.

## Q3. "What is a stored procedure, and when would you not use one?"

**Strong answer:** A stored procedure is a named, compiled routine kept in the database and run with
\`CALL\`, taking IN, OUT and INOUT parameters. It is useful for heavy set-based work close to the
data, such as a nightly batch that would otherwise ship millions of rows to the application. I would
**not** put business rules in one: it is hard to unit-test and debug, it is versioned outside the
application code, it ties the system to MySQL's dialect, and it scales on the database server, the
most expensive thing to scale.

**Follow-up:** "How is a view different from a table?" — A view stores a query, not data; selecting
from it runs the query against the base tables, so it is always current. It takes no storage, can
hide columns for security, and is updatable only if it maps simply onto one table's rows.`,
    mcqs: [
      mcq('An interviewer asks what `TRUNCATE TABLE orders` does that `DELETE FROM orders` does not. Which answer is correct?', [
        ['It can remove only the rows a WHERE clause matches', false],
        ['It fires each DELETE trigger once for every row', false],
        ['It keeps the AUTO_INCREMENT counter where it was', false],
        ['It resets AUTO_INCREMENT and cannot be rolled back', true],
      ], 'TRUNCATE is DDL: it recreates the table, resets AUTO_INCREMENT, fires no triggers and commits implicitly. DELETE is DML and keeps the counter.'),
      mcq("A `currency CHAR(3)` column stores 'INR'. How much character space does each value use, and why choose CHAR here?", [
        ['Three characters always; every code has exactly three letters', true],
        ['As many characters as typed plus a length byte; CHAR is a VARCHAR alias', false],
        ['Up to 255 characters, padded; CHAR is chosen for faster sorting', false],
      ], 'CHAR(n) is fixed length, so it suits values that always have the same length, such as ISO currency codes, and needs no length prefix.'),
      mcq('Which reason is the strongest one for keeping a pricing rule in Java rather than in a stored procedure?', [
        ['Stored procedures cannot accept DECIMAL parameters', false],
        ['Java code is unit-tested, reviewed and versioned with the app', true],
        ['MySQL procedures stop running after the session commits its transaction', false],
      ], 'The cost of database-resident logic is that it escapes the application\'s tests, reviews and release process. Procedures can take DECIMAL and do run normally.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_MYSQL_CHECKPOINT',
    notes: `Ten scenarios from running a real MySQL 8 database: accounts, types, constraints, imports,
backups and server-side logic. Each describes a situation, not a definition — decide what you would
actually do. If you miss one, go back to the unit it comes from rather than retrying until it passes.`,
    checkpoint: [
      cq(DB, 'Your Java service and MySQL move to separate servers. The service now gets "Access denied", though nothing else changed. Where is the cause most likely?', [
        ['The JDBC URL still uses the default port 3306', false],
        ["The account exists only as 'svc'@'localhost'", true],
        ['InnoDB refuses logins from remote clients', false],
        ['The database name is case-sensitive on Linux', false],
      ], 'Accounts are user plus host. Once the client is on a different machine, a localhost-only account no longer matches its connections.'),
      cq(SQL, 'A wallet table must hold balances like 1234.56 and never drift after millions of additions. Which column definition is right?', [
        ['balance DOUBLE NOT NULL', false],
        ['balance DECIMAL(15,2) NOT NULL', true],
        ['balance FLOAT(15,2) NOT NULL', false],
        ['balance VARCHAR(20) NOT NULL', false],
      ], 'Only DECIMAL keeps exact decimal values. FLOAT and DOUBLE accumulate binary rounding errors, and VARCHAR cannot be summed reliably.'),
      cq(SQL, 'Users in a chat app type messages in Hindi with emoji. Which character set should the messages table use in MySQL 8?', [
        ['latin1', false],
        ['utf8mb3', false],
        ['utf8mb4', true],
      ], 'utf8mb4 covers all of Unicode, including four-byte emoji. utf8mb3 stops at three bytes, and latin1 cannot store Devanagari at all.'),
      cq(DB, 'Deleting a product category unexpectedly erased every product in it and every order line for those products. What does that point to?', [
        ['A MyISAM table ignoring its foreign keys', false],
        ['A chain of ON DELETE CASCADE foreign keys', true],
        ['A missing index on the category column of products', false],
      ], 'Rows in other tables vanished because each child foreign key cascaded the delete onward. MyISAM would have ignored the keys entirely, and indexes do not delete anything.'),
      cq(DB, 'A teammate proposes `SET FOREIGN_KEY_CHECKS = 0` to get past ERROR 1452 in a nightly import. What is the problem with that?', [
        ['It is not permitted for any user except root on InnoDB', false],
        ['It also disables primary key uniqueness for the session', false],
        ['It lets orphan rows in that later queries silently lose', true],
      ], 'Error 1452 reports a child row whose parent is missing. Disabling the check only hides it, leaving rows that joins quietly drop. Fix the load order or the data.'),
      cq(SQL, 'You must load a 500 MB CSV from your laptop into a remote MySQL 8 server. LOAD DATA LOCAL fails with ERROR 3948. What enables it?', [
        ['Copying the CSV into the secure_file_priv folder on the laptop', false],
        ['local_infile on the server and --local-infile=1 on the client', true],
        ['Granting the FILE privilege to your account on the server', false],
      ], 'LOCAL reads the file from the client, which needs local_infile enabled at both ends. secure_file_priv and FILE apply to non-LOCAL loads from the server\'s disk.'),
      cq(SQL, 'Before a risky migration you need a backup of the busy `shop` database without blocking customers. Which command fits?', [
        ['mysqldump --single-transaction --routines shop > shop.sql', true],
        ['mysqldump --lock-all-tables --routines shop > shop.sql', false],
        ['mysqldump --no-data --routines shop > shop.sql', false],
      ], '--single-transaction dumps a consistent InnoDB snapshot without locking writers, and --routines keeps procedures. --no-data would save no rows at all.'),
      cq(SQL, 'A dashboard runs the same five-table join in six places of the Java code. Which MySQL feature lets you define it once?', [
        ['A CHECK constraint on the joined columns', false],
        ['A trigger on each of the five tables', false],
        ['A view that names the join', true],
      ], 'A view stores the query once under a name; every caller selects from it, so the join is defined in a single place.'),
      cq(SQL, 'A report query works on MySQL 5.6 but fails on MySQL 8 with ERROR 1055 about a column not in GROUP BY. What is the correct fix?', [
        ['Group by or aggregate that column', true],
        ['Remove ONLY_FULL_GROUP_BY from sql_mode', false],
        ['Add an ORDER BY on the grouped column', false],
      ], 'MySQL 8 enforces ONLY_FULL_GROUP_BY so results are deterministic. Grouping or aggregating the column (or ANY_VALUE when it truly does not matter) fixes the query instead of hiding the problem.'),
      cq(DB, 'A new service must store orders with transactions and enforced foreign keys. A legacy script creates its tables with ENGINE=MyISAM. What should you do?', [
        ['Keep MyISAM and add CHECK constraints', false],
        ['Change them to ENGINE=InnoDB', true],
        ['Keep MyISAM and wrap writes in transactions', false],
      ], 'MyISAM supports neither transactions nor foreign keys, and wrapping its writes in a transaction changes nothing. InnoDB provides both.'),
    ],
  },
];
