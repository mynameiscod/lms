/**
 * Career-track content: JDBC (JT_JDBC), for Java Full Stack + AI and Java Backend Engineer.
 *
 * Every snippet targets MySQL 8 through Connector/J 8 (driver class com.mysql.cj.jdbc.Driver) on
 * JDBC 4.2+, because that is the stack the track's MySQL pack installs and the one an interviewer
 * will assume. These units need a running database, so their practice is questions and a project
 * brief rather than auto-graded code.
 *
 * The topic is single-skill (JDBC), so no question names a skillKey.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_JDBC_BUNDLES: PilotBundle[] = [
  /* ── DRIVER_CONNECTION ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_JDBC_DRIVER_CONNECTION',
    notes: `**JDBC** (Java Database Connectivity) is the standard API in \`java.sql\` that lets Java talk to
any relational database. The API is a set of interfaces — \`Connection\`, \`PreparedStatement\`,
\`ResultSet\` — and a **driver** supplies the classes that implement them for one database. For
MySQL that driver is **Connector/J**.

## Adding the driver

With Maven, add the dependency (the artifact was renamed in 8.0.31):

    <dependency>
        <groupId>com.mysql</groupId>
        <artifactId>mysql-connector-j</artifactId>
        <version>8.4.0</version>
    </dependency>

Since JDBC 4, a driver on the classpath registers itself through \`META-INF/services\`, so the old
\`Class.forName("com.mysql.cj.jdbc.Driver")\` line is no longer needed. If the jar is missing, nothing
fails at compile time — you get \`SQLException: No suitable driver found for jdbc:mysql://...\` at
runtime.

## The JDBC URL

    jdbc:mysql://localhost:3306/shop?serverTimezone=UTC

\`jdbc:mysql://\` picks the driver, then host, port (3306 is MySQL's default), the database name, and
optional properties after \`?\`.

## Opening and closing a connection

    String url = "jdbc:mysql://localhost:3306/shop";
    try (Connection conn = DriverManager.getConnection(url, "shop_app", "s3cret")) {
        System.out.println("Connected to " + conn.getMetaData().getDatabaseProductVersion());
    } catch (SQLException e) {
        System.err.println("Could not connect: " + e.getMessage());
    }

A \`Connection\` is a real network socket plus a server-side session. **try-with-resources** closes it
when the block ends, even when an exception is thrown — the only reliable way to close it. Every
\`Connection\`, \`Statement\` and \`ResultSet\` implements \`AutoCloseable\`, so the same pattern
applies to all three, and they close in reverse order of opening.

## Why it matters

MySQL limits concurrent connections (\`max_connections\`, 151 by default). A program that forgets to
close them leaks one per call until the server answers "Too many connections" and every user is
locked out — usually hours after the faulty code shipped.

## Common mistakes

- Hard-coding the password in source; read it from an environment variable or config file.
- Closing in a \`finally\` block by hand and forgetting the null check or a nested close.
- Catching \`SQLException\` and printing nothing — the message names the exact problem (wrong
  password, unknown database, refused connection).
- Using \`localhost:3307\` or the wrong database name and blaming the driver.`,
    workedExample: `**Problem:** connect to the \`shop\` database with credentials from environment variables, print
the server version, and make sure the connection is always closed.

    public class ConnectCheck {
        public static void main(String[] args) {
            String url = "jdbc:mysql://localhost:3306/shop?serverTimezone=UTC";
            String user = System.getenv("DB_USER");
            String pass = System.getenv("DB_PASS");
            try (Connection conn = DriverManager.getConnection(url, user, pass)) {
                DatabaseMetaData meta = conn.getMetaData();
                System.out.println(meta.getDatabaseProductName() + " " + meta.getDatabaseProductVersion());
            } catch (SQLException e) {
                System.err.println("SQLState " + e.getSQLState() + ": " + e.getMessage());
            }
        }
    }

**Reasoning:** the URL picks Connector/J by its \`jdbc:mysql:\` prefix; credentials stay out of the
source; try-with-resources closes the connection on both paths; and printing the SQLState
(\`28000\` for bad credentials, \`08S01\` for a link failure) tells you which problem you have.`,
    mcqs: [
      mcq('Which part of jdbc:mysql://db.internal:3306/inventory tells DriverManager which driver should handle the connection?', [
        ['The jdbc:mysql: prefix', true],
        ['The port number 3306', false],
        ['The database name inventory', false],
        ['The host name db.internal', false],
      ], 'DriverManager asks each registered driver whether it accepts the URL, and Connector/J accepts URLs beginning jdbc:mysql:. Host, port and database only matter once that driver is chosen.'),
      mcq('A project compiles fine but fails at startup with "No suitable driver found for jdbc:mysql://localhost:3306/shop". What is the most likely cause?', [
        ['Connector/J is not on the runtime classpath', true],
        ['The MySQL server is stopped on that host', false],
        ['The shop_app user has the wrong password', false],
        ['Class.forName was left out of the main method', false],
      ], 'JDBC code compiles against java.sql interfaces alone, so a missing driver jar only shows up at runtime as "No suitable driver". A stopped server or a bad password produce different errors, and JDBC 4 drivers no longer need Class.forName.'),
      mcq('Why is try-with-resources preferred for a JDBC Connection over calling close() at the end of the try block?', [
        ['It closes the connection even when an exception is thrown', true],
        ['It makes the connection faster to open on the network', false],
        ['It is required by the JDBC specification since version 4', false],
        ['It keeps the connection open for the next method to reuse', false],
      ], 'A close() at the end of the try block is skipped whenever an earlier line throws, leaking the connection. try-with-resources closes it on every exit path; it has no effect on speed and is not mandated by the spec.'),
    ],
    checkpoint: [
      mcq('Since JDBC 4.0, how does the Connector/J driver become available to DriverManager?', [
        ['It registers itself from META-INF/services when on the classpath', true],
        ['It must be loaded with Class.forName before every single connection is made', false],
        ['It is bundled inside the JDK and needs no dependency at all', false],
        ['It is downloaded automatically from the MySQL server at connect', false],
      ], 'JDBC 4 drivers are discovered through the ServiceLoader mechanism from the jar\'s META-INF/services entry, so being on the classpath is enough. The JDK ships no MySQL driver, and Class.forName is only a legacy habit.'),
      mcq('A batch job opens a connection with DriverManager.getConnection inside a loop and never closes it. After a few hundred iterations, what is most likely to happen?', [
        ['MySQL refuses new logins with "Too many connections"', true],
        ['The JVM closes each connection automatically at loop end', false],
        ['The driver reuses the first connection for every iteration', false],
        ['The job runs normally because sockets cost nothing', false],
      ], 'Each unclosed Connection holds a server session until garbage collection might eventually finalize it, so sessions pile up past max_connections and MySQL rejects further logins.'),
      mcq('Which statement about the default MySQL JDBC URL jdbc:mysql://localhost/shop is correct?', [
        ['It connects to port 3306 because no port is given', true],
        ['It fails because the port number is mandatory', false],
        ['It connects to port 8080, the default web port', false],
        ['It connects to the first database the user can see', false],
      ], 'When the port is omitted Connector/J uses MySQL\'s default, 3306. The database name shop is still taken from the path, so it does not pick an arbitrary database.'),
    ],
  },

  /* ── PREPARED_STATEMENTS ───────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_JDBC_PREPARED_STATEMENTS',
    notes: `There are two ways to send SQL through JDBC, and only one of them is safe with user input.

## The dangerous way: Statement and string concatenation

    String sql = "SELECT * FROM users WHERE email = '" + email + "'";
    ResultSet rs = conn.createStatement().executeQuery(sql);

If a user types \`' OR '1'='1\` as their email, the SQL becomes
\`WHERE email = '' OR '1'='1'\` — true for every row. That is **SQL injection**: input crossing from
data into code. Escaping quotes by hand is never complete; there is always another trick.

## The right way: PreparedStatement

    String sql = "SELECT id, name FROM users WHERE email = ?";
    try (PreparedStatement ps = conn.prepareStatement(sql)) {
        ps.setString(1, email);
        try (ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                System.out.println(rs.getInt("id") + " " + rs.getString("name"));
            }
        }
    }

The SQL text with \`?\` placeholders is fixed before any user value is seen. \`setString(1, email)\`
binds the value to the first placeholder (indexes start at **1**). The driver sends it strictly as a
value, so \`' OR '1'='1\` is just an odd-looking email that matches nobody.

## Reading versus changing

- \`executeQuery()\` for \`SELECT\` — returns a \`ResultSet\`.
- \`executeUpdate()\` for \`INSERT\`, \`UPDATE\`, \`DELETE\` — returns the number of affected rows.

    try (PreparedStatement ps = conn.prepareStatement(
            "INSERT INTO products (sku, name, price) VALUES (?, ?, ?)",
            Statement.RETURN_GENERATED_KEYS)) {
        ps.setString(1, "PEN-01");
        ps.setString(2, "Blue Pen");
        ps.setBigDecimal(3, new BigDecimal("12.50"));
        ps.executeUpdate();
        try (ResultSet keys = ps.getGeneratedKeys()) {
            if (keys.next()) System.out.println("New id " + keys.getLong(1));
        }
    }

\`getGeneratedKeys()\` returns the \`AUTO_INCREMENT\` id, but only if you asked for it with
\`Statement.RETURN_GENERATED_KEYS\`.

## What placeholders cannot do

A \`?\` stands for a **value** only — never a table name, column name, \`ORDER BY\` column or SQL
keyword. For a user-chosen sort column, check the input against a fixed allow-list in Java. An
\`IN\` list needs one \`?\` per value. For \`LIKE\`, put the wildcards in the bound value:
\`ps.setString(1, "%" + term + "%")\`.

## Common mistakes

- Building the SQL with \`+\` and then passing it to \`prepareStatement\` — still injectable.
- Using \`setInt(0, ...)\`: index 0 throws an \`SQLException\`.
- Calling \`executeQuery()\` for an \`UPDATE\`; Connector/J refuses it.`,
    mcqs: [
      mcq('A login query is built as "... WHERE email = \'" + email + "\'" and run through a Statement. What input lets an attacker match every row?', [
        ["' OR '1'='1", true],
        ['admin@example.com', false],
        ["O'Brien without a closing quote", false],
        ['An email longer than the column width', false],
      ], 'The input closes the string literal and adds OR \'1\'=\'1\', which is true for every row, turning data into SQL logic. A plain email matches one user and an unmatched quote only causes a syntax error.'),
      mcq('After ps.executeUpdate() on an INSERT into a table with an AUTO_INCREMENT id, ps.getGeneratedKeys() returns an empty result. What was missed?', [
        ['Passing Statement.RETURN_GENERATED_KEYS to prepareStatement', true],
        ['Calling conn.commit() before reading the generated keys back', false],
        ['Calling ps.executeQuery() instead of executeUpdate()', false],
        ['Declaring the id column as BIGINT instead of INT', false],
      ], 'Generated keys are only collected when the statement is prepared with RETURN_GENERATED_KEYS (or the key column names). Commit and column type do not affect whether the driver returns them.'),
      mcq('A search screen lets users choose the sort column. Which approach is safe?', [
        ['Check the choice against a fixed list, then append it', true],
        ['Write ORDER BY ? and bind the chosen column with setString', false],
        ['Escape quotes in the column name before appending it', false],
        ['Wrap the column name in single quotes inside the SQL', false],
      ], 'Placeholders bind values, so ORDER BY ? sorts by a constant string, not a column. Identifiers cannot be bound, so the only safe way is an allow-list of known column names chosen in Java.'),
    ],
    checkpoint: [
      mcq('What does ps.executeUpdate() return after "UPDATE products SET price = ? WHERE category = ?" runs?', [
        ['The number of rows the statement changed', true],
        ['A ResultSet holding the updated rows', false],
        ['true if any row matched, false otherwise', false],
        ['The new price that was written to the rows', false],
      ], 'executeUpdate returns an int row count for INSERT, UPDATE and DELETE. A ResultSet comes from executeQuery, and the boolean comes from execute().'),
      mcq('Why can a value bound with ps.setString(1, input) not change the structure of the SQL it is used in?', [
        ['The SQL is parsed before the value is sent, as data only', true],
        ['setString removes every quote character from the input', false],
        ['MySQL rejects any value that contains an SQL keyword', false],
        ['The driver encrypts the value so the parser cannot read it', false],
      ], 'With a PreparedStatement the statement shape is fixed by the placeholders, and the bound value is transmitted (or escaped by the driver) strictly as a literal. Nothing is stripped or rejected; the value simply never becomes code.'),
      mcq('To find products whose name contains a user-typed term, which binding is correct for "SELECT * FROM products WHERE name LIKE ?"?', [
        ['ps.setString(1, "%" + term + "%")', true],
        ['Write LIKE \'%?%\' and call ps.setString(1, term)', false],
        ['ps.setString(1, term) and let LIKE add the wildcards', false],
        ['ps.setString(0, "%" + term + "%")', false],
      ], 'The wildcards belong in the bound value. A ? inside quotes is a literal question mark, not a placeholder, LIKE adds nothing on its own, and parameter indexes start at 1.'),
    ],
  },

  /* ── RESULTSET_MAPPING ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_JDBC_RESULTSET_MAPPING',
    notes: `A \`ResultSet\` is a **cursor** over the rows a query returned. It starts positioned *before* the
first row; \`next()\` moves to the next row and returns \`false\` when there are none left.

## Walking the rows

    List<Product> list = new ArrayList<>();
    String sql = "SELECT id, sku, name, price, supplier_id FROM products WHERE quantity < ?";
    try (PreparedStatement ps = conn.prepareStatement(sql)) {
        ps.setInt(1, 10);
        try (ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                list.add(mapRow(rs));
            }
        }
    }

Reading a column before calling \`next()\` throws \`SQLException\` ("Before start of result set").
For a query that returns at most one row, use \`if (rs.next())\` and return \`Optional.empty()\`
otherwise.

## Reading columns by type

    private Product mapRow(ResultSet rs) throws SQLException {
        Product p = new Product();
        p.setId(rs.getInt("id"));
        p.setSku(rs.getString("sku"));
        p.setName(rs.getString("name"));
        p.setPrice(rs.getBigDecimal("price"));            // DECIMAL -> BigDecimal, never double
        int supplier = rs.getInt("supplier_id");
        p.setSupplierId(rs.wasNull() ? null : supplier);   // NULL handling
        return p;
    }

Read by **column label** rather than position: \`getInt("id")\` survives someone reordering the
SELECT list. If you do use positions, they start at **1**. With an alias such as
\`SELECT COUNT(*) AS total\`, read \`getInt("total")\`.

## NULL is the trap

\`getInt\`, \`getLong\`, \`getDouble\` and \`getBoolean\` return primitives, so a SQL \`NULL\` comes back
as \`0\` or \`false\` — indistinguishable from a real zero. Two fixes:

- Call \`rs.wasNull()\` immediately after the getter.
- Use \`rs.getObject("supplier_id", Integer.class)\` (JDBC 4.1+), which returns \`null\`.

\`getString\` and \`getBigDecimal\` already return \`null\` for SQL \`NULL\`.

## Dates and times

Use \`java.time\`: \`rs.getObject("created_at", LocalDateTime.class)\` for \`DATETIME\` and
\`LocalDate.class\` for \`DATE\` (JDBC 4.2). Avoid the old \`java.util.Date\`.

## Why a mapper method

Putting the row-to-object code in one \`mapRow\` keeps every query that returns products consistent;
change a column once, fix it once.

## Common mistakes

- \`while (rs.next())\` when one row is expected, silently keeping the last match.
- Money read with \`getDouble\` — \`0.1 + 0.2\` problems in an invoice.
- Returning the \`ResultSet\` itself out of the method: it dies with its statement.`,
    workedExample: `**Problem:** find one product by SKU, returning \`Optional<Product>\`.

    public Optional<Product> findBySku(Connection conn, String sku) throws SQLException {
        String sql = "SELECT id, sku, name, price, supplier_id FROM products WHERE sku = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, sku);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? Optional.of(mapRow(rs)) : Optional.empty();
            }
        }
    }

**Reasoning:** \`sku\` is UNIQUE, so at most one row: \`if\`-style \`rs.next()\` rather than a loop. The
\`ResultSet\` is fully read into a \`Product\` before the try block closes it, so nothing outside the
method ever holds a live cursor.`,
    mcqs: [
      mcq('A discount column is NULL for a row, and the code reads it with rs.getInt("discount"). What value does it get?', [
        ['0', true],
        ['null', false],
        ['-1', false],
        ['An SQLException is thrown', false],
      ], 'getInt returns a primitive int, which cannot be null, so SQL NULL is returned as 0. Only wasNull() or getObject(..., Integer.class) can tell a NULL apart from a real zero.'),
      mcq('Code runs ResultSet rs = ps.executeQuery(); String n = rs.getString("name"); with no other call in between. What happens?', [
        ['SQLException, because the cursor is before the first row', true],
        ['It returns the name stored in the first row of the result', false],
        ['It returns null because no row has been selected yet', false],
        ['It returns the name from the last row of the result', false],
      ], 'A ResultSet starts before the first row. Until next() moves onto a row there is no current row to read from, and Connector/J throws "Before start of result set".'),
      mcq('Which getter is the right choice for a MySQL DECIMAL(10,2) price column?', [
        ['rs.getBigDecimal("price")', true],
        ['rs.getDouble("price") and round it to two places', false],
        ['rs.getFloat("price")', false],
        ['rs.getLong("price")', false],
      ], 'BigDecimal keeps the exact decimal value MySQL stores. double and float are binary approximations that introduce rounding errors in money, and getLong would drop the paise entirely.'),
    ],
    checkpoint: [
      mcq('"SELECT name, quantity FROM products" is read with rs.getInt(2). Which column does that return?', [
        ['quantity, because column positions start at 1', true],
        ['The third column, because positions start at 0', false],
        ['name, the first column in the SELECT list', false],
        ['The id column, which is always position 1', false],
      ], 'JDBC column indexes are 1-based and follow the SELECT list, so position 1 is name and 2 is quantity. The table\'s id is not part of this result at all.'),
      mcq('Which call returns null rather than 0 for a NULL supplier_id column?', [
        ['rs.getObject("supplier_id", Integer.class)', true],
        ['rs.getInt("supplier_id")', false],
        ['rs.getLong("supplier_id") cast to an Integer object', false],
        ['rs.getShort("supplier_id")', false],
      ], 'getObject with a target class (JDBC 4.1+) returns a boxed Integer and therefore can return null. The primitive getters all map SQL NULL to 0.'),
      mcq('A method returns the ResultSet from inside try (PreparedStatement ps = ...) { return ps.executeQuery(); }. What goes wrong for the caller?', [
        ['The ResultSet is closed along with its statement', true],
        ['The caller sees only the first row of the result', false],
        ['The query runs again each time next() is called', false],
        ['Nothing — a ResultSet stays open until read fully', false],
      ], 'Closing a Statement closes its current ResultSet, and try-with-resources closes ps as the method returns. Map rows into objects inside the method and return those instead.'),
    ],
  },

  /* ── TRANSACTIONS ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_JDBC_TRANSACTIONS',
    notes: `A **transaction** is a group of statements that succeed or fail together. A JDBC connection
starts in **auto-commit** mode: every single statement is committed the moment it runs. That is fine
for one statement and wrong for two that must both happen.

## The problem

Moving 500 from account 1 to account 2 is two updates. In auto-commit, if the second update fails
(a constraint, a crash, a lost network), the first is already permanent: 500 has vanished.

## The pattern

    public void transfer(Connection conn, int from, int to, BigDecimal amount) throws SQLException {
        String debit  = "UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ?";
        String credit = "UPDATE accounts SET balance = balance + ? WHERE id = ?";
        boolean oldAuto = conn.getAutoCommit();
        conn.setAutoCommit(false);
        try (PreparedStatement d = conn.prepareStatement(debit);
             PreparedStatement c = conn.prepareStatement(credit)) {
            d.setBigDecimal(1, amount); d.setInt(2, from); d.setBigDecimal(3, amount);
            if (d.executeUpdate() != 1) throw new SQLException("Insufficient funds or no account " + from);
            c.setBigDecimal(1, amount); c.setInt(2, to);
            if (c.executeUpdate() != 1) throw new SQLException("No account " + to);
            conn.commit();
        } catch (SQLException e) {
            conn.rollback();
            throw e;
        } finally {
            conn.setAutoCommit(oldAuto);
        }
    }

- \`setAutoCommit(false)\` starts a transaction that lasts until \`commit()\` or \`rollback()\`.
- Both statements must use the **same Connection** — a transaction belongs to one connection.
- \`rollback()\` in the catch undoes everything since the transaction began, then the exception is
  rethrown so the caller knows.
- Restoring auto-commit in \`finally\` matters when the connection goes back to a pool.
- Checking the row count turns "no matching row" into a failure instead of a silent success.

## ACID in one line each

**Atomic** — all or nothing. **Consistent** — constraints hold before and after. **Isolated** —
concurrent transactions do not see each other's half-done work (InnoDB defaults to
\`REPEATABLE READ\`; change it with \`conn.setTransactionIsolation\`). **Durable** — once committed,
it survives a crash.

## Savepoints

\`Savepoint sp = conn.setSavepoint();\` then \`conn.rollback(sp)\` undoes only work after the savepoint.
Useful for "try the optional step, keep the rest".

## Common mistakes

- Forgetting \`setAutoCommit(false)\`, so the "transaction" commits statement by statement.
- Opening a new connection for the second statement — it is outside the transaction.
- Catching the exception, logging it and carrying on without rollback.
- Tables on MyISAM, which ignores transactions entirely; use InnoDB.`,
    mcqs: [
      mcq('A transfer runs two UPDATE statements on a fresh connection without calling setAutoCommit(false). The credit fails with a constraint error. What state is the database in?', [
        ['The debit is already committed; the money is gone', true],
        ['Both updates are rolled back automatically by the driver', false],
        ['Neither update ran, as the batch was rejected', false],
        ['The debit waits uncommitted until close()', false],
      ], 'In auto-commit mode each statement commits as soon as it succeeds, so the debit was permanent before the credit even ran. Only an explicit transaction makes the two all-or-nothing.'),
      mcq('In a JDBC transfer, the debit uses connection A and the credit opens connection B from DriverManager. A rollback is then called on A after B fails. Is the transfer atomic?', [
        ['No — a transaction covers only statements on one connection', true],
        ['Yes — rollback on A undoes the work on every open connection in the JVM', false],
        ['Yes — MySQL groups both by the same user name', false],
        ['No — but only because B was never set to autoCommit false', false],
      ], 'Transactions are per connection (per server session). Work on B is independent of A\'s transaction, so the steps must share one Connection to commit or roll back together.'),
      mcq('Why does the transfer code check that each executeUpdate() returned 1?', [
        ['A zero count means no row matched, which must fail the transfer', true],
        ['executeUpdate returns 0 whenever the statement had a syntax error', false],
        ['MySQL commits automatically when the count is greater than 1', false],
        ['It is needed so rollback() knows how many rows to undo', false],
      ], 'An UPDATE that matches no row (unknown account, or balance too low under the WHERE guard) succeeds with a count of 0. Without the check the code would commit a half transfer; syntax errors throw instead.'),
    ],
    checkpoint: [
      mcq('After conn.setAutoCommit(false), two INSERTs run and then the program exits without commit() or rollback(). What should you rely on?', [
        ['Nothing — always end the transaction explicitly', true],
        ['Both rows are always saved when the JVM exits', false],
        ['Only the first INSERT is saved automatically', false],
        ['The rows are saved the next time the app starts', false],
      ], 'What happens to an uncommitted transaction on close or disconnect depends on the driver, pool and server (MySQL rolls back an abandoned session). Correct code ends every transaction with commit() or rollback() and never depends on that.'),
      mcq('Which ACID property is the reason a failed transfer must leave both balances exactly as they were?', [
        ['Atomicity', true],
        ['Isolation', false],
        ['Durability', false],
        ['Consistency', false],
      ], 'Atomicity is the all-or-nothing guarantee: either every statement takes effect or none does. Isolation concerns concurrent transactions, durability concerns surviving a crash after commit.'),
      mcq('A batch import inserts 1,000 rows; rows 1–600 are valid and must stay, but an optional audit step after them may fail. Which JDBC feature undoes only the audit step?', [
        ['A Savepoint set before the audit, then rollback(sp)', true],
        ['Calling rollback() with no arguments after the audit', false],
        ['Turning autoCommit back on just before the audit', false],
        ['Calling setTransactionIsolation before the audit', false],
      ], 'rollback(savepoint) undoes only the work done after that savepoint and keeps the transaction open. A plain rollback() discards all 600 rows, and isolation level has nothing to do with undoing work.'),
    ],
  },

  /* ── CONNECTION_POOLS ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_JDBC_CONNECTION_POOLS',
    notes: `Opening a database connection is slow: a TCP handshake, TLS, authentication and session setup —
often tens of milliseconds, far longer than the query itself. A web app that opens a fresh
connection for every request spends most of its time connecting, and under load it opens hundreds
at once and hits MySQL's \`max_connections\`.

## The pool

A **connection pool** opens a fixed set of connections once and lends them out. Your code asks a
\`javax.sql.DataSource\` for a connection, uses it, and "closes" it — which, for a pooled connection,
**returns it to the pool** instead of closing the socket. **HikariCP** is the standard pool (Spring
Boot uses it by default).

    HikariConfig cfg = new HikariConfig();
    cfg.setJdbcUrl("jdbc:mysql://localhost:3306/shop");
    cfg.setUsername(System.getenv("DB_USER"));
    cfg.setPassword(System.getenv("DB_PASS"));
    cfg.setMaximumPoolSize(10);            // most connections ever open
    cfg.setMinimumIdle(2);
    cfg.setConnectionTimeout(5_000);       // ms to wait for a free connection
    HikariDataSource ds = new HikariDataSource(cfg);

    try (Connection conn = ds.getConnection();
         PreparedStatement ps = conn.prepareStatement("SELECT COUNT(*) FROM products")) {
        try (ResultSet rs = ps.executeQuery()) {
            rs.next();
            System.out.println(rs.getInt(1));
        }
    }   // conn goes back to the pool here

Create **one** \`HikariDataSource\` for the whole application and close it on shutdown.

## Code against DataSource, not DriverManager

\`DataSource\` is an interface. A DAO that receives a \`DataSource\` neither knows nor cares whether it
is pooled, which also makes it easy to test.

## Sizing

Bigger is not better. Each connection uses memory and a thread on the server, and a database with
four cores cannot run 200 queries at once anyway. Start small (HikariCP's default is 10) and measure.
A common starting formula is \`cores * 2 + effective disks\` on the database host.

## Pool exhaustion

If code forgets to close connections, the pool runs dry. The next \`getConnection()\` waits
\`connectionTimeout\` and then throws \`SQLTransientConnectionException\` ("Connection is not
available, request timed out"). Hikari's \`leakDetectionThreshold\` logs a stack trace for any
connection held too long — the fastest way to find the leaking line.

## Common mistakes

- Creating a new \`HikariDataSource\` per request — a pool per request is no pool.
- Leaving a borrowed connection with \`autoCommit=false\` or a half-done transaction.
- Raising \`maximumPoolSize\` to "fix" timeouts that are really leaks or slow queries.`,
    mcqs: [
      mcq('In code that gets a Connection from a HikariDataSource, what does conn.close() do?', [
        ['Returns the connection to the pool for reuse', true],
        ['Closes the socket and shrinks the pool by one', false],
        ['Shuts down the whole pool and its connections', false],
        ['Nothing — pooled connections must not be closed', false],
      ], 'The pool hands out a proxy whose close() returns the physical connection to the pool. Not calling it is exactly how pools leak; shutting the pool down is ds.close().'),
      mcq('An app under load starts failing with "Connection is not available, request timed out after 30000ms". Which cause should you check first?', [
        ['A code path that borrows a connection and never closes it', true],
        ['The MySQL server running out of disk space for its table data files', false],
        ['The JDBC URL missing the serverTimezone property', false],
        ['HikariCP being slower than DriverManager for queries', false],
      ], 'That message means every pooled connection is checked out. The usual cause is a leak — a connection not closed on some path — and leakDetectionThreshold will point at the line that borrowed it.'),
      mcq('Why should an application create one HikariDataSource at startup instead of one per request?', [
        ['A new pool per request reopens connections every time', true],
        ['HikariCP throws an error if two pools exist in one JVM', false],
        ['A DataSource can only be used from the thread that made it', false],
        ['One pool lets MySQL skip authentication for every query', false],
      ], 'The benefit of a pool is reusing already-open connections. A pool created per request opens fresh connections each time — slower than DriverManager — and leaks pools unless each is closed.'),
    ],
    checkpoint: [
      mcq('A team raises maximumPoolSize from 10 to 300 (and max_connections to match) on a 4-core MySQL server to fix slow pages. What is the likely outcome?', [
        ['Throughput gets worse as the server thrashes on contention', true],
        ['Every page becomes about thirty times faster', false],
        ['HikariCP refuses to start because 300 exceeds its built-in pool limit', false],
        ['Nothing changes because the pool ignores this setting', false],
      ], 'A few cores can only execute a few queries at once; hundreds of active connections add context switching, memory and lock contention. HikariCP has no built-in cap at that size; pools should be small and measured, and slow pages are usually slow queries or leaks.'),
      mcq('What is the main reason a DAO should accept a javax.sql.DataSource rather than call DriverManager.getConnection itself?', [
        ['The DAO works the same with a pool or a test database', true],
        ['DataSource connections never need to be closed by code', false],
        ['DriverManager cannot connect to MySQL 8 servers', false],
        ['DataSource makes every query run inside a transaction', false],
      ], 'DataSource is an interface, so the caller decides whether it is a HikariCP pool in production or a simple source in tests. Connections from it still must be closed, and it does not change transaction behaviour.'),
      mcq('Which HikariCP setting helps you find the line of code that leaks connections?', [
        ['leakDetectionThreshold', true],
        ['maximumPoolSize', false],
        ['minimumIdle', false],
        ['initializationFailTimeout', false],
      ], 'leakDetectionThreshold logs a stack trace of where a connection was borrowed if it is held longer than the threshold. The other settings control pool size, idle connections and how startup reacts to an unreachable database, not leak diagnosis.'),
    ],
  },

  /* ── DAO_PATTERN ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_JDBC_DAO_PATTERN',
    notes: `A **DAO** (Data Access Object) puts all the SQL for one kind of entity behind an interface. The rest
of the program asks for products; it never sees a \`Connection\`, a \`PreparedStatement\` or a column
name.

## The interface: what, not how

    public interface ProductDao {
        Optional<Product> findById(int id);
        List<Product> findLowStock();
        int insert(Product p);                 // returns the generated id
        boolean updatePrice(int id, BigDecimal price);
        boolean delete(int id);
    }

## The JDBC implementation: how

    public class JdbcProductDao implements ProductDao {
        private final DataSource ds;
        public JdbcProductDao(DataSource ds) { this.ds = ds; }

        @Override
        public Optional<Product> findById(int id) {
            String sql = "SELECT id, sku, name, price, quantity, reorder_level FROM products WHERE id = ?";
            try (Connection c = ds.getConnection();
                 PreparedStatement ps = c.prepareStatement(sql)) {
                ps.setInt(1, id);
                try (ResultSet rs = ps.executeQuery()) {
                    return rs.next() ? Optional.of(map(rs)) : Optional.empty();
                }
            } catch (SQLException e) {
                throw new DataAccessException("findById " + id, e);
            }
        }

        @Override
        public boolean updatePrice(int id, BigDecimal price) {
            String sql = "UPDATE products SET price = ? WHERE id = ?";
            try (Connection c = ds.getConnection();
                 PreparedStatement ps = c.prepareStatement(sql)) {
                ps.setBigDecimal(1, price);
                ps.setInt(2, id);
                return ps.executeUpdate() == 1;
            } catch (SQLException e) {
                throw new DataAccessException("updatePrice " + id, e);
            }
        }
        // findLowStock, insert, delete and map follow the same shape
    }

\`DataAccessException\` here is your own unchecked exception that wraps the \`SQLException\` as its
cause — so callers are not forced to handle a JDBC type, and nothing is swallowed.

## Why bother

- **One place for SQL.** Rename a column and you change one class.
- **Testable callers.** A service that depends on \`ProductDao\` can be tested with an in-memory fake.
- **Replaceable.** The same interface can later be implemented with JPA — which is exactly what the
  next topic does.

## Transactions across DAOs

A DAO method that opens its own connection cannot share a transaction with another DAO. When a
**service** must change two tables atomically (a stock movement plus the product's quantity), the
service opens the connection, turns off auto-commit, and passes that connection to DAO methods
written to accept one — then commits or rolls back itself.

## Common mistakes

- Business rules ("refuse a sale below stock") inside the DAO instead of the service.
- DAO methods that return a \`ResultSet\`, leaking JDBC to callers.
- Catching \`SQLException\` and returning \`null\`, so failures look like "not found".`,
    mcqs: [
      mcq('Which method signature belongs in a ProductDao interface?', [
        ['Optional<Product> findBySku(String sku)', true],
        ['ResultSet findBySku(Connection c, String sku)', false],
        ['PreparedStatement findBySkuStatement(String sku)', false],
        ['String findBySkuSql(String sku)', false],
      ], 'A DAO interface speaks in domain objects so callers never touch JDBC. Returning a ResultSet, a statement or SQL text leaks exactly the details the pattern exists to hide.'),
      mcq('A JdbcProductDao method catches SQLException and returns Optional.empty(). What is wrong with that?', [
        ['A database failure is reported to callers as "not found"', true],
        ['Optional cannot be returned from an interface method', false],
        ['SQLException is unchecked, so catching it is not allowed', false],
        ['The connection is left open because of the catch block', false],
      ], 'Swallowing the exception makes an outage indistinguishable from a missing row, so callers make wrong decisions. Wrap it in an unchecked exception with the cause instead; try-with-resources still closes the connection.'),
      mcq('An OrderService must insert an order row and decrement stock atomically, using OrderDao and ProductDao. Where should the transaction be controlled?', [
        ['In the service, passing one connection to both DAOs', true],
        ['Inside each DAO method, each with its own separate commit', false],
        ['In the MySQL table definition using a trigger', false],
        ['In main(), by turning autoCommit off globally', false],
      ], 'Atomicity needs both statements on one connection in one transaction, and only the service knows that the two belong together. Per-DAO commits make each step independent again.'),
    ],
    checkpoint: [
      mcq('What is the main benefit of a service depending on the ProductDao interface rather than JdbcProductDao?', [
        ['It can be unit-tested with a fake DAO and no database', true],
        ['The interface makes every query run noticeably faster', false],
        ['Interfaces close the JDBC connections automatically', false],
        ['It stops the DAO from needing any SQL statements', false],
      ], 'Programming to the interface lets a test supply an in-memory implementation, and production supply the JDBC one. It has no effect on query speed or resource handling.'),
      mcq('Where should the rule "a sale cannot take stock below zero" be decided in a DAO-based design?', [
        ['In the service layer, using data the DAO returns', true],
        ['Inside the JDBC URL as a connection property', false],
        ['In the Product constructor that the DAO calls while mapping', false],
        ['In the console menu that reads the quantity', false],
      ], 'Business rules belong in the service, which coordinates DAOs; the DAO only reads and writes. A database CHECK constraint can back the rule up, but the decision and its message belong to the service.'),
      mcq('A DAO wraps SQLException in its own unchecked DataAccessException. Why pass the SQLException as the cause?', [
        ['So the SQLState and original stack trace are kept', true],
        ['So the transaction is rolled back automatically', false],
        ['So the compiler forces callers to catch it', false],
        ['So the connection pool can retry the query', false],
      ], 'Chaining the cause preserves the vendor error code, SQLState and stack trace for whoever diagnoses the failure. It does not roll back anything or force handling, since the wrapper is unchecked.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_JDBC_DEBUGGING',
    notes: `JDBC bugs cluster into a small set of faults. Each has a symptom you can recognise and a single
fix. Read the exception message first — it usually names the fault.

## 1. "No suitable driver found for jdbc:mysql://..."

Connector/J is not on the runtime classpath (dependency missing, wrong scope, or a fat jar built
without it) — or the URL is mistyped, e.g. \`jdbc:mysq://\`. Fix the dependency or the URL; do not
add \`Class.forName\` and hope.

## 2. Timestamps off by hours

    jdbc:mysql://localhost:3306/shop

Times written from Java and read in Workbench differ by 5h30m. The driver and server disagree about
the session time zone. Set it explicitly — \`?connectionTimeZone=UTC\` (or the older
\`serverTimezone=UTC\`) — and store UTC.

## 3. SQL built by concatenation

    String sql = "DELETE FROM products WHERE sku = '" + sku + "'";

A SKU of \`x' OR '1'='1\` deletes the table. Use a \`PreparedStatement\` with \`?\`.

## 4. "Before start of result set"

    ResultSet rs = ps.executeQuery();
    String name = rs.getString("name");     // no next() yet

Call \`rs.next()\` first and check its result.

## 5. Column index 0

    ps.setString(0, sku);   // or rs.getInt(0)

Both throw — parameter and column indexes start at **1**.

## 6. NULL read as 0

    int supplier = rs.getInt("supplier_id");   // NULL becomes 0, a real-looking id

Use \`rs.wasNull()\` or \`getObject("supplier_id", Integer.class)\`.

## 7. Half a transfer committed

The debit committed and the credit failed, because \`setAutoCommit(false)\` was never called — or the
catch block logged the error and did not \`rollback()\`.

## 8. Catching SQLException and carrying on

    try { dao.save(p); } catch (SQLException e) { }   // the order "succeeded"

The user is told it worked. Rethrow, or wrap with the cause.

## 9. Pool exhaustion after a few hours

    Connection c = ds.getConnection();
    PreparedStatement ps = c.prepareStatement(sql);
    ...                                                // no close on the error path

Works in testing, then "Connection is not available, request timed out". Use try-with-resources on
every \`Connection\`, \`PreparedStatement\` and \`ResultSet\`.

## Method

Reproduce with one input, read the full exception (message, SQLState, cause), form one hypothesis,
change one thing, and re-run.`,
    mcqs: [
      mcq('A report shows every order placed at 09:00 IST as 03:30. Inserts and reads use Connector/J 8 with the URL jdbc:mysql://db:3306/shop. What do you fix first?', [
        ['Set connectionTimeZone (or serverTimezone) explicitly in the URL', true],
        ['Store each timestamp in a formatted VARCHAR column instead of DATETIME', false],
        ['Add Class.forName for the Connector/J driver class', false],
        ['Switch from PreparedStatement to plain Statement', false],
      ], 'A fixed 5h30m shift means the driver and server disagree on the session time zone. Declaring it in the URL (and storing UTC) fixes the conversion; text columns or driver loading do not touch it.'),
      mcq('This code ships: try { ps.executeUpdate(); } catch (SQLException e) { log.debug("oops"); } return true; What fault does it introduce?', [
        ['A failed write is reported to the caller as a success', true],
        ['The SQL statement is executed twice on every call', false],
        ['The connection is closed before the update can run', false],
        ['The update becomes vulnerable to SQL injection', false],
      ], 'Swallowing the exception and returning true hides the failure; the caller tells the user it worked. Rethrow or wrap the SQLException so the failure travels up.'),
      mcq('A service works for an hour, then every request times out waiting for a connection. Logs show no slow queries. Which code is the likely culprit?', [
        ['Connection c = ds.getConnection(); with close() only on success', true],
        ['try (Connection c = ds.getConnection()) { ... } around each query', false],
        ['ps.setInt(1, id) used instead of concatenating the id', false],
        ['rs.getObject("qty", Integer.class) used for a nullable column', false],
      ], 'A connection closed only on the success path leaks whenever an exception occurs, and a pool of 10 drains over time. try-with-resources closes on every path; the other lines are correct practice.'),
      mcq('ps.setString(0, sku) throws an SQLException. Why?', [
        ['Parameter indexes start at 1, not 0', true],
        ['setString cannot bind to a VARCHAR column', false],
        ['The SKU value contains a quote character', false],
        ['The statement must be executed before binding', false],
      ], 'JDBC parameter and column indexes are 1-based, so index 0 is out of range. setString is the right setter for VARCHAR, and quotes in a bound value are harmless.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_JDBC_PRACTICE',
    notes: `Work these against a local MySQL 8 database named \`practice\` with this table:

    CREATE TABLE students (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(100) NOT NULL,
        email      VARCHAR(150) NOT NULL UNIQUE,
        mentor_id  INT NULL,
        fee_paid   DECIMAL(10,2) NOT NULL DEFAULT 0,
        joined_on  DATE NOT NULL
    );

Write each exercise as a method that takes a \`Connection\` or \`DataSource\`, uses try-with-resources
throughout, and never builds SQL with \`+\`.

## Exercise 1 — Insert and return the id

\`int addStudent(Connection c, String name, String email, LocalDate joined)\` inserts a row and
returns the generated id. Hint: \`Statement.RETURN_GENERATED_KEYS\`, \`ps.setObject(4, joined)\`.

## Exercise 2 — Find by email

\`Optional<Student> findByEmail(Connection c, String email)\`. Map \`mentor_id\` to an \`Integer\` that
is \`null\` when the column is NULL. Test it with an email containing a quote: \`o'neil@x.com\`.

## Exercise 3 — Search by name fragment

\`List<Student> search(Connection c, String fragment)\` using \`LIKE ?\`, ordered by name. Verify that
typing \`%\` returns everyone, then decide whether you want that.

## Exercise 4 — Pay fees in one transaction

\`void recordPayment(Connection c, int studentId, BigDecimal amount)\` adds to \`fee_paid\` and
inserts into a \`payments(student_id, amount, paid_at)\` table — both or neither. Force the second
insert to fail (a bad student id with a foreign key) and confirm \`fee_paid\` did not change.

## Exercise 5 — Batch insert

Insert 1,000 generated students with \`addBatch()\` and one \`executeBatch()\` inside a single
transaction. Time it against 1,000 separate auto-committed inserts, then add
\`rewriteBatchedStatements=true\` to the URL and time it again.

## Exercise 6 — A DAO

Move exercises 1–3 into \`StudentDao\` / \`JdbcStudentDao\` taking a \`DataSource\`, and write a
\`main\` that uses only the interface.

**Self-check:** every resource in try-with-resources, every value bound with a setter, no
\`getInt\` on a nullable column without \`wasNull\`, money as \`BigDecimal\`.`,
    mcqs: [
      mcq('In Exercise 4, the payments INSERT fails on a foreign key after fee_paid was updated. With correct transaction code, what does fee_paid show afterwards?', [
        ['Its original value, because rollback undid the update', true],
        ['The increased value, because that UPDATE itself succeeded first', false],
        ['Zero, because rollback resets the column default', false],
        ['NULL, because the transaction was left incomplete', false],
      ], 'Both statements share a transaction; the failure leads to rollback(), which restores every change made since setAutoCommit(false). Rollback restores the previous value, not a default.'),
      mcq('Which code binds a java.time.LocalDate to a DATE placeholder in JDBC 4.2?', [
        ['ps.setObject(4, joinedOn)', true],
        ['ps.setString(4, joinedOn)', false],
        ['ps.setLong(4, joinedOn)', false],
        ['ps.setInt(4, joinedOn)', false],
      ], 'JDBC 4.2 maps java.time types through setObject/getObject, so a LocalDate binds directly. The other setters do not accept a LocalDate argument and will not compile.'),
      mcq('For Exercise 5, what does addBatch() followed by one executeBatch() change compared with calling executeUpdate() 1,000 times?', [
        ['Rows are sent in groups, cutting round trips', true],
        ['Every row is checked for SQL injection twice', false],
        ['Rows skip the table\'s UNIQUE constraint checks', false],
        ['The inserts no longer need any open connection', false],
      ], 'Batching queues parameter sets and sends them together, reducing network round trips; with rewriteBatchedStatements=true Connector/J even folds them into multi-row INSERTs. Constraints still apply to every row.'),
      mcq('Exercise 2 is tested with the email o\'neil@x.com bound through ps.setString. What should happen?', [
        ['The row is found; the quote is just part of the value', true],
        ['A syntax error, because the quote ends the string', false],
        ['Every row is returned, as in an injection attack', false],
        ['The quote is silently removed before matching', false],
      ], 'A bound parameter is sent as data, so the apostrophe is matched literally. Only concatenated SQL would break on it or be exploitable.'),
      mcq('In Exercise 3, a user types % as the search fragment and binds it as "%" + fragment + "%". What is returned?', [
        ['Every student, since % matches any text in LIKE', true],
        ['No student, since % is escaped by the driver', false],
        ['An SQLException for the unescaped wildcard', false],
        ['Only students whose name contains a % sign', false],
      ], 'Binding protects against injection but does not escape LIKE wildcards, so a bound % still matches anything. If that is unwanted, escape % and _ in Java and add ESCAPE to the SQL.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_JDBC_INTERVIEW_QUESTION',
    notes: `Three questions that come up in almost every Java backend interview that touches databases. Say
the answers aloud until they take under two minutes each.

## Q1. "What is the difference between Statement and PreparedStatement, and how does PreparedStatement prevent SQL injection?"

**Model answer.** A \`Statement\` sends whatever SQL string you give it, so any user value has to be
concatenated into the text — and a value like \`' OR '1'='1\` then becomes part of the SQL. A
\`PreparedStatement\` is created from SQL with \`?\` placeholders, and values are bound separately
with \`setString\`, \`setInt\` and so on. The structure of the statement is fixed before any value
arrives, and the driver sends each value strictly as data — so input can never change what the
query does. It also handles types (dates, decimals, NULL via \`setNull\`) correctly, and the server or
driver can reuse the parsed statement when it is run many times.

**Follow-up:** *"Can PreparedStatement protect a dynamic ORDER BY column?"* — No. Placeholders bind
values, not identifiers; validate the column against an allow-list. *"Is a PreparedStatement built
with string concatenation safe?"* — No; the injection happens before \`prepareStatement\` sees the
text.

## Q2. "What is a connection pool and why would you use one?"

**Model answer.** Opening a database connection means a network handshake, authentication and
session setup — far more expensive than a typical query. A pool such as HikariCP opens a small set of
connections once and lends them to requests; \`close()\` on a borrowed connection returns it rather
than closing it. That gives low latency, a hard cap on how many connections the app opens (protecting
the database), and settings for timeouts and leak detection. In Spring Boot it is HikariCP by
default.

**Follow-up:** *"How big should the pool be?"* — Small and measured: roughly cores × 2 plus disks on
the DB server is a starting point, because a database cannot run more queries in parallel than it
has resources for. *"What happens when it is exhausted?"* — \`getConnection\` waits
\`connectionTimeout\` and throws; the cause is usually a leak.

## Q3. "Explain ACID, and how you do commit and rollback in JDBC."

**Model answer.** Atomic: all statements or none. Consistent: constraints hold before and after.
Isolated: concurrent transactions do not see each other's partial work. Durable: committed data
survives a crash. In JDBC a connection is in auto-commit mode, so I call \`setAutoCommit(false)\`,
run the statements on that same connection, call \`commit()\` if all succeed, and \`rollback()\` in
the catch block before rethrowing — then restore auto-commit, especially for pooled connections.

**Follow-up:** *"What is the difference between execute, executeQuery and executeUpdate?"* —
\`executeQuery\` returns a \`ResultSet\` for a SELECT; \`executeUpdate\` returns an affected-row count for
INSERT/UPDATE/DELETE/DDL; \`execute\` runs anything and returns \`true\` if the first result is a
\`ResultSet\`, after which you call \`getResultSet()\` or \`getUpdateCount()\`.

## How you are judged

The interviewer listens for the *why* (data vs code, cost of a connection, all-or-nothing) and for
whether you name a real failure — leaked connections, half-committed transfers — rather than reciting
definitions.`,
    mcqs: [
      mcq('An interviewer asks what stmt.execute(sql) returns when sql is a SELECT. What is the right answer?', [
        ['true, and the rows come from getResultSet()', true],
        ['The ResultSet itself, ready for next()', false],
        ['The number of rows that the SELECT statement matched', false],
        ['false, because SELECT changes no rows', false],
      ], 'execute returns a boolean: true when the first result is a ResultSet (fetched with getResultSet()), false when it is an update count (fetched with getUpdateCount()).'),
      mcq('Asked "does a PreparedStatement make dynamic table names safe?", which answer is correct?', [
        ['No — a ? binds values only, so allow-list identifiers', true],
        ['Yes — setString quotes the table name safely', false],
        ['Yes — the driver checks the name against the schema', false],
        ['No — but setObject can bind a table name instead', false],
      ], 'Placeholders stand for values, never for table or column names; a bound string would be a literal, not an identifier. No setter changes that, so names must be chosen from a fixed list in code.'),
      mcq('Which reason for using a connection pool would an interviewer accept as the main one?', [
        ['Reusing open connections avoids per-request setup cost', true],
        ['Pooled connections bypass the MySQL permission system', false],
        ['A pool lets queries skip the network to reach MySQL', false],
        ['Pooled connections make every SQL query run faster', false],
      ], 'The expensive part a pool removes is connecting: handshake, authentication and session setup. Queries still go over the network with the same permissions and run at the same speed once they arrive.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_JDBC_MINI_PROJECT',
    notes: `# An Inventory App on JDBC

Build a console inventory system for a small shop, on MySQL 8 through JDBC. No framework: plain
Java, Connector/J and HikariCP. This is the app the JPA topic will rebuild, so design it cleanly.

## Schema (run this first)

    CREATE DATABASE inventory;
    USE inventory;

    CREATE TABLE products (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        sku            VARCHAR(30)   NOT NULL UNIQUE,
        name           VARCHAR(100)  NOT NULL,
        price          DECIMAL(10,2) NOT NULL CHECK (price >= 0),
        quantity       INT           NOT NULL DEFAULT 0 CHECK (quantity >= 0),
        reorder_level  INT           NOT NULL DEFAULT 5
    ) ENGINE=InnoDB;

    CREATE TABLE stock_movements (
        id          BIGINT AUTO_INCREMENT PRIMARY KEY,
        product_id  INT          NOT NULL,
        change_qty  INT          NOT NULL,
        reason      ENUM('IN','OUT','ADJUST') NOT NULL,
        note        VARCHAR(200) NULL,
        moved_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
    ) ENGINE=InnoDB;

## Features (a numbered console menu)

1. Add a product (SKU, name, price, reorder level); print the generated id.
2. List all products, sorted by name.
3. Find a product by SKU.
4. Update a product's price.
5. **Stock in** — add quantity, with an optional note.
6. **Stock out** — remove quantity; refused if it would go below zero.
7. **Low-stock report** — products where \`quantity <= reorder_level\`.
8. Movement history for one product, newest first.
9. Exit.

## Design requirements

- \`ProductDao\` and \`StockMovementDao\` interfaces with JDBC implementations taking a \`DataSource\`.
- An \`InventoryService\` that owns the rules and the transactions; \`Main\` only reads input and prints.
- **Every** SQL statement is a \`PreparedStatement\`; no string-built SQL anywhere.
- Every \`Connection\`, \`PreparedStatement\` and \`ResultSet\` in try-with-resources.
- **Stock in/out is one transaction**: insert the movement row and update \`products.quantity\` on the
  same connection, commit together, roll back on any failure. Stock out uses
  \`UPDATE products SET quantity = quantity - ? WHERE id = ? AND quantity >= ?\` and checks that one
  row changed, so two clerks cannot oversell.
- Money as \`BigDecimal\`; nullable \`note\` read as \`null\`, not \`"null"\`.
- Credentials from environment variables; one \`HikariDataSource\` for the whole run.
- \`SQLException\` wrapped in your own unchecked exception with the cause; \`Main\` prints a clear
  message and the menu continues.

## Acceptance criteria

- Adding a duplicate SKU prints "SKU already exists" and changes nothing.
- Stocking out more than is available prints a refusal; quantity and movements are unchanged.
- Killing the program between the movement insert and the quantity update (simulate with a thrown
  exception) leaves no orphan movement row.
- Entering \`' OR '1'='1\` as a SKU finds nothing and breaks nothing.
- The low-stock report matches a hand-written \`SELECT\` in Workbench.
- Non-numeric quantities and prices are rejected at input, without a stack trace.`,
    mcqs: [
      mcq('Two clerks stock out the last 3 units of a product at the same moment. Which design keeps quantity from going negative?', [
        ['A guarded UPDATE ... WHERE quantity >= ? and checking the row count', true],
        ['Reading quantity in Java, comparing, then running a plain UPDATE', false],
        ['Calling commit() twice so the second clerk sees the change', false],
        ['Running the stock-out with a Statement instead of a PreparedStatement', false],
      ], 'The guarded UPDATE checks and changes the row in one atomic statement, and a count of 0 means refuse. Read-then-write in Java lets both clerks read 3 before either writes.'),
      mcq('In the inventory app, why must the stock_movements INSERT and the products UPDATE share one Connection with autoCommit off?', [
        ['So a failure in either leaves neither change in place', true],
        ['So the second statement can reuse the first PreparedStatement', false],
        ['So MySQL can enforce the foreign key between the tables', false],
        ['So the pool does not count them as two borrowed connections', false],
      ], 'Only a single transaction on one connection makes the movement and the quantity change all-or-nothing. Foreign keys are enforced either way, and statement reuse is unrelated.'),
    ],
    assignment: {
      title: 'An Inventory App on JDBC',
      description: 'A console inventory system on MySQL 8 through JDBC: products, stock in and out, a low-stock report and movement history, built with DAOs, PreparedStatements, a HikariCP DataSource and a transaction for every stock movement.',
      instructions: `Build the app described in this unit's brief and submit it as a repository link or a zip.

**Submit:**

1. The Java source: \`Product\` and \`StockMovement\` classes, \`ProductDao\` and \`StockMovementDao\`
   interfaces with JDBC implementations, an \`InventoryService\`, and a \`Main\` with the menu.
2. \`schema.sql\` (the brief's schema plus any seed rows you used) and the \`pom.xml\` showing the
   Connector/J and HikariCP dependencies.
3. A README with: how to run it (environment variables included), and console transcripts showing a
   normal session, a refused stock-out, a duplicate SKU, and the \`' OR '1'='1\` SKU search.
4. A short paragraph explaining where your transactions begin and end, and why the stock-out
   cannot oversell.

**Before you submit, check every acceptance criterion in the brief by running it**, not by reading
your code.`,
      rubric: [
        { criterion: 'Correct behaviour', description: 'All nine menu features work; the low-stock report and movement history match the database; duplicate SKUs and oversells are refused with clear messages.', maxPoints: 25 },
        { criterion: 'Safe SQL and resource handling', description: 'Every statement is a PreparedStatement with bound values; every Connection, PreparedStatement and ResultSet is in try-with-resources; one HikariDataSource; credentials not in source.', maxPoints: 25 },
        { criterion: 'Transactions', description: 'Stock in and out insert the movement and update quantity on one connection with commit and rollback; a forced failure leaves no orphan movement; the guarded UPDATE checks its row count.', maxPoints: 20 },
        { criterion: 'DAO and service design', description: 'DAO interfaces return domain objects only; rules live in InventoryService; Main does input and output only; NULL notes and DECIMAL prices mapped correctly.', maxPoints: 20 },
        { criterion: 'Error handling and README', description: 'SQLException wrapped with its cause and never swallowed; bad input rejected without a stack trace; README transcripts and the transaction explanation are present and accurate.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_JDBC_CHECKPOINT',
    notes: `Ten questions on JDBC as a Java backend interview examines it: reading short code, predicting what
it does against MySQL, and choosing the fix. They cover the driver and URL, PreparedStatement and
injection, ResultSet mapping and NULL, transactions, connection pools and the DAO pattern. Answer
from what the code actually does, not from what it was meant to do.`,
    checkpoint: [
      mcq('rs = ps.executeQuery("SELECT ...") is called on a PreparedStatement created from SQL with ? placeholders. What happens with Connector/J?', [
        ['It throws, since that overload is not for PreparedStatement', true],
        ['It runs the new SQL and ignores the prepared one', false],
        ['It binds the new SQL into the first placeholder', false],
        ['It runs the prepared SQL and silently ignores the string argument', false],
      ], 'executeQuery(String) is inherited from Statement, and the JDBC spec says a PreparedStatement must throw SQLException if it is called. Use the no-argument executeQuery() on a PreparedStatement.'),
      mcq('Code: while (rs.next()) { total += rs.getInt("qty"); } on 3 rows with qty 4, NULL and 6. What is total?', [
        ['10', true],
        ['4', false],
        ['An SQLException on the second row', false],
        ['NullPointerException on the second row', false],
      ], 'getInt returns 0 for the NULL row, so the sum is 4 + 0 + 6 = 10. Here that happens to be harmless, but the same 0 would be wrong for an id or a price.'),
      mcq('A DAO runs "UPDATE products SET price = ? WHERE id = ?" with ps.executeQuery(). What happens?', [
        ['Connector/J throws: the statement returns no result set', true],
        ['The update runs and an empty ResultSet is returned', false],
        ['The update runs and the row count is in the ResultSet', false],
        ['Nothing runs, and the method returns null', false],
      ], 'executeQuery is only for statements that produce a ResultSet; Connector/J rejects an UPDATE with an SQLException. Changes go through executeUpdate, which returns the affected-row count.'),
      mcq('conn.setAutoCommit(false); insertOrder(conn); updateStock(conn); conn.commit(); — updateStock throws and nothing catches it in this method. What is missing?', [
        ['A catch that calls conn.rollback() before rethrowing', true],
        ['A second commit() call inside updateStock itself', false],
        ['A call to setAutoCommit(true) before insertOrder', false],
        ['A Savepoint between insertOrder and updateStock', false],
      ], 'Without rollback the order insert stays pending on a connection that may be returned to a pool or reused. The transaction must be explicitly rolled back on failure; a savepoint alone does not undo anything.'),
      mcq('Which JDBC URL is valid for Connector/J 8 connecting to a database named crm on host db1?', [
        ['jdbc:mysql://db1:3306/crm', true],
        ['mysql://db1:3306/crm', false],
        ['jdbc:mysql:db1/crm:3306', false],
        ['jdbc://mysql/db1:3306/crm', false],
      ], 'The form is jdbc:mysql://host:port/database. Without the jdbc: prefix DriverManager finds no driver, and the other forms put host, port and database in the wrong places.'),
      mcq('An app opens a new HikariDataSource inside each HTTP request handler and never closes it. What will monitoring show over time?', [
        ['MySQL connection count climbing until logins are refused', true],
        ['A flat connection count, since Hikari shares all pools', false],
        ['Faster requests, since every request has its own pool', false],
        ['No effect, since unused pools close themselves at once', false],
      ], 'Every new pool opens its own connections and keeps them until the pool is closed, so connections accumulate per request until MySQL hits max_connections.'),
      mcq('Which line is vulnerable to SQL injection?', [
        ['conn.prepareStatement("SELECT * FROM t WHERE c = \'" + v + "\'")', true],
        ['conn.prepareStatement("SELECT * FROM t WHERE c = ?") then setString', false],
        ['ps.setString(1, v) where v contains a single quote character', false],
        ['ps.setObject(1, v) where v is a LocalDate from user input', false],
      ], 'The first line concatenates input into the SQL text before preparing it, so the placeholder protection never applies. Values bound with a setter are always treated as data.'),
      mcq('A findAll() reads rows into Product objects and returns List<Product>. Which choice matters most for a nullable discount column of type INT?', [
        ['Use an Integer field and getObject(..., Integer.class)', true],
        ['Use an int field and rs.getInt, which returns -1', false],
        ['Use a String field and rs.getString, then parse it to an int', false],
        ['Use a long field and rs.getLong to avoid overflow', false],
      ], 'Only a boxed Integer can hold "no value", and getObject with Integer.class returns null for SQL NULL. getInt returns 0, not -1, and parsing strings or widening types does not solve the NULL problem.'),
      mcq('A ProductService test must run without MySQL. What makes that possible in a DAO design?', [
        ['The service depends on the ProductDao interface', true],
        ['The DAO catches every SQLException internally', false],
        ['The DAO opens its connection in a static block', false],
        ['The service builds its own SQL for each query', false],
      ], 'Because the service only knows the interface, a test can pass an in-memory fake implementation. Static connections and SQL in the service tie it to a real database.'),
      mcq('Which statement about rs.next() is correct?', [
        ['It moves to the next row and returns false when none remain', true],
        ['It returns the next row as an Object array of its columns', false],
        ['It must be called after reading each column of the row', false],
        ['It reloads the query from the database for every call', false],
      ], 'next() advances the cursor one row and returns whether there is a current row. Columns are read with getters after it, and rows are fetched from the already-executed result, not by re-running the query.'),
    ],
  },
];
