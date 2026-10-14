/**
 * Career-track content: Python and MySQL (JT_PY_MYSQL), for Python Full Stack + AI.
 *
 * Every snippet targets MySQL 8 through PyMySQL 1.x/2.x on Python 3.10+, with mysql-connector-python
 * named as the alternative. The behaviour claimed for PyMySQL (placeholder escaping, the
 * "unsupported format character" error, autocommit off by default, `with` closing rather than
 * committing) was checked against PyMySQL 2.2. These units need a running database, so their
 * practice is questions and a project brief rather than auto-graded code.
 *
 * The Java JDBC topic and the years' SQL topics cover the SQL itself; everything here is about the
 * Python side — the DB-API, PyMySQL's %s placeholders, dict rows, dataclasses and context managers.
 * The topic's default attribution is PYTHON_DB, so checkpoint questions name no skillKey.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_PY_MYSQL_BUNDLES: PilotBundle[] = [
  /* ── DRIVER_CONNECT ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_MYSQL_DRIVER_CONNECT',
    notes: `Python does not ship a MySQL client. What it ships is a **standard shape** for database
drivers, the **DB-API 2.0** (PEP 249): every compliant driver offers \`connect()\`, a connection with
\`cursor()\`, \`commit()\`, \`rollback()\` and \`close()\`, and a cursor with \`execute()\`,
\`executemany()\`, \`fetchone()\`, \`fetchmany()\` and \`fetchall()\`. Learn it once and \`sqlite3\`,
PyMySQL, mysql-connector-python and psycopg (PostgreSQL) all feel the same.

## Choosing a driver

| Driver | Install | Notes |
|---|---|---|
| **PyMySQL** | \`pip install pymysql\` | Pure Python, no compiler needed — what this topic uses |
| mysql-connector-python | \`pip install mysql-connector-python\` | Oracle's official driver; \`cursor(dictionary=True)\` for dict rows |
| mysqlclient | \`pip install mysqlclient\` | C extension, fastest; the one Django recommends |

All three use the **\`%s\`** placeholder style (DB-API calls it \`format\`/\`pyformat\`), so the code below
moves between them with a changed import and connect call.

Install into the project's virtual environment, never globally:

    python -m venv .venv
    .venv\\Scripts\\activate          # Windows;  source .venv/bin/activate on Linux/macOS
    pip install pymysql

## Configuration comes from the environment

Hard-coding a password in source means it lands in Git and in every copy of the repository. Read it
from environment variables (or a \`.env\` file loaded by \`python-dotenv\` in development):

    import os
    import pymysql
    from pymysql.cursors import DictCursor

    def get_connection() -> pymysql.connections.Connection:
        return pymysql.connect(
            host=os.environ.get("DB_HOST", "localhost"),
            port=int(os.environ.get("DB_PORT", "3306")),
            user=os.environ["DB_USER"],          # KeyError at startup if missing: fail fast
            password=os.environ["DB_PASSWORD"],
            database=os.environ.get("DB_NAME", "library"),
            charset="utf8mb4",                   # full Unicode, including emoji and Indic scripts
            cursorclass=DictCursor,              # rows come back as dicts
            connect_timeout=5,
        )

\`os.environ["X"]\` (no default) for secrets is deliberate: a missing password should stop the program
at startup with a clear \`KeyError\`, not ten minutes later with "Access denied for user ''".

## Cursors: tuples or dicts

A **cursor** sends a statement and holds its result. The default PyMySQL cursor returns each row as
a **tuple**; \`DictCursor\` returns a **dict** keyed by column name:

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, title FROM books ORDER BY id LIMIT 2")
            for row in cur.fetchall():
                print(row["id"], row["title"])

With the default cursor the same rows are \`(1, 'Clean Code')\`, read as \`row[0]\`, \`row[1]\` — and
\`row["title"]\` raises \`TypeError: tuple indices must be integers or slices, not str\`. Dicts survive
someone reordering the SELECT list; prefer them. (\`SSCursor\` / \`SSDictCursor\` stream rows one by one
for very large results instead of loading them all into memory.)

## Closing: always, with \`with\`

A connection is a TCP socket plus a session on the server, and MySQL allows only \`max_connections\`
of them (151 by default). In PyMySQL 1.0 and later, a connection and a cursor are both **context
managers that close on exit**:

    with get_connection() as conn:       # conn.close() runs when the block ends, even on error
        with conn.cursor() as cur:       # so does cur.close()
            cur.execute("SELECT VERSION() AS v")
            print(cur.fetchone()["v"])

Note what \`with conn\` does **not** do: it does not commit. Closing a connection with an open
transaction makes the server roll that transaction back. (Very old PyMySQL versions behaved
differently, so older blog posts mislead here.)

## Connection errors you will meet

| Error | Meaning |
|---|---|
| \`OperationalError (2003, "Can't connect to MySQL server on ...")\` | Server not running, wrong host or port, firewall |
| \`OperationalError (1045, "Access denied for user ...")\` | Wrong user or password, or the user lacks access from this host |
| \`OperationalError (1049, "Unknown database 'libary'")\` | Database name typo, or it was never created |
| \`OperationalError (1040, "Too many connections")\` | Connections leaked somewhere — not closed |

All are subclasses of \`pymysql.MySQLError\`; the first element of \`e.args\` is MySQL's error number.

## Why learn this when Django has an ORM?

Django's ORM (the next part of this track) opens connections, builds parameterised SQL and maps
rows to objects for you. You learn the layer underneath because ORMs leak: a slow page, a
"too many connections" outage or a migration script is debugged at this level, and interviewers ask
how an ORM talks to the database.`,
    mcqs: [
      mcq('A script calls pymysql.connect(..., cursorclass=DictCursor) and then cur.execute("SELECT id, title FROM books"). What does cur.fetchone() return when the table has rows?', [
        ['A dict such as {\'id\': 1, \'title\': \'Clean Code\'}', true],
        ['A tuple such as (1, \'Clean Code\')', false],
        ['A Book object built from the selected columns automatically', false],
        ['A list holding every row of the result', false],
      ], 'DictCursor makes every fetched row a dict keyed by column name. The default cursor returns tuples, PyMySQL never builds your own classes, and fetchone returns one row, not all of them.'),
      mcq('Why does get_connection() read the password with os.environ["DB_PASSWORD"] rather than os.environ.get("DB_PASSWORD", "")?', [
        ['A missing secret then stops the program at startup', true],
        ['os.environ.get cannot read variables set in a .env file', false],
        ['PyMySQL refuses a password passed in as a str value', false],
        ['Square brackets hide the value from the process list', false],
      ], 'Indexing raises KeyError immediately when the variable is unset, so the misconfiguration is obvious. A silent empty default only fails later as a confusing "Access denied". Both forms read the same mapping.'),
      mcq('In PyMySQL 1.0+, what happens at the end of "with pymysql.connect(**cfg) as conn:" if an INSERT ran in the block and conn.commit() was never called?', [
        ['The connection closes and the server rolls the INSERT back', true],
        ['The block commits the INSERT automatically on a clean exit', false],
        ['The connection stays open so a later block can commit', false],
        ['PyMySQL raises an error about the pending transaction', false],
      ], 'A PyMySQL connection\'s __exit__ only calls close(). Autocommit is off by default, so the insert was never committed, and the server discards an open transaction when its session ends.'),
    ],
    workedExample: `**Problem:** write \`check_db.py\`, a startup check a deployment can run: connect using
environment variables, print the server version and the number of books, and exit with code 1 and a
readable message if anything goes wrong.

    import os
    import sys
    import pymysql
    from pymysql.cursors import DictCursor

    def main() -> int:
        try:
            with pymysql.connect(
                host=os.environ.get("DB_HOST", "localhost"),
                user=os.environ["DB_USER"],
                password=os.environ["DB_PASSWORD"],
                database=os.environ.get("DB_NAME", "library"),
                cursorclass=DictCursor,
                connect_timeout=5,
            ) as conn, conn.cursor() as cur:
                cur.execute("SELECT VERSION() AS version")
                print("MySQL", cur.fetchone()["version"])
                cur.execute("SELECT COUNT(*) AS n FROM books")
                print("books:", cur.fetchone()["n"])
            return 0
        except KeyError as e:
            print(f"missing environment variable {e}", file=sys.stderr)
        except pymysql.MySQLError as e:
            code, message = e.args[0], e.args[-1]
            print(f"database error {code}: {message}", file=sys.stderr)
        return 1

    if __name__ == "__main__":
        sys.exit(main())

**Reasoning:**

- One \`with\` statement holds both the connection and the cursor, so both close on every path —
  including when \`COUNT(*)\` fails because the \`books\` table does not exist (error 1146).
- \`COUNT(*) AS n\` gives the column a name, so the dict key is \`"n"\` rather than \`"COUNT(*)"\`.
- Catching \`pymysql.MySQLError\` (not bare \`Exception\`) reports database problems with MySQL's own
  error number, while genuine bugs in the script still show a traceback.
- Nothing is written, so there is nothing to commit. A deployment pipeline reads the exit code.`,
    checkpoint: [
      mcq('A teammate switches a module from PyMySQL to mysql-connector-python. Which line most likely needs to change for rows to still arrive as dicts?', [
        ['conn.cursor() becomes conn.cursor(dictionary=True)', true],
        ['Every %s placeholder must be rewritten as a ? placeholder', false],
        ['Every fetchall() call becomes fetch_all()', false],
        ['Every commit() call becomes save_changes()', false],
      ], 'mysql-connector-python asks for dict rows per cursor with dictionary=True instead of PyMySQL\'s DictCursor class. Both drivers follow the DB-API, so %s, fetchall and commit are unchanged.'),
      mcq('With the default PyMySQL cursor, this runs: cur.execute("SELECT title, copies FROM books WHERE id = 7"); row = cur.fetchone(); print(row["title"]). Book 7 exists. What happens?', [
        ['TypeError, because the row is a tuple', true],
        ['It prints the title of book 7', false],
        ['KeyError, because title is not selected', false],
        ['It prints None, as the key is not found', false],
      ], 'The default Cursor returns tuples, and indexing a tuple with a string raises "tuple indices must be integers or slices, not str". Use row[0], or connect with cursorclass=DictCursor.'),
      mcq('A web app opens a new PyMySQL connection in every request handler and never closes it. Under steady traffic, which error is the database most likely to return first?', [
        ['(1040, "Too many connections")', true],
        ['(1045, "Access denied for user")', false],
        ['(1049, "Unknown database")', false],
        ['(1146, "Table doesn\'t exist")', false],
      ], 'Every unclosed connection keeps a server session alive, so they accumulate until max_connections is reached and MySQL refuses logins with 1040. Credentials, database and tables are all fine.'),
    ],
  },

  /* ── PARAMETERISED_QUERIES ─────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_MYSQL_PARAMETERISED_QUERIES',
    notes: `Python makes it very easy to write the most dangerous line in web development:

    title = input("Search title: ")
    cur.execute(f"SELECT * FROM books WHERE title = '{title}'")     # NEVER

Type \`O'Brien's Guide\` and the SQL becomes \`... WHERE title = 'O'Brien's Guide'\` — a syntax error.
Type \`' OR '1'='1\` and it becomes \`... WHERE title = '' OR '1'='1'\`, which matches every row. That is
**SQL injection**: the user's text has become part of the *code*. The same goes for \`+\`, \`%\`
formatting and \`.format()\` — any way of building SQL text out of input.

## Placeholders: let the driver handle values

    cur.execute("SELECT * FROM books WHERE title = %s", (title,))

The query and the values travel **separately**. PyMySQL escapes each value for MySQL and puts it
where the \`%s\` is, so a quote in the input is just a character in the data:

    cur.mogrify("SELECT * FROM members WHERE email = %s", ("x' OR '1'='1",))
    # SELECT * FROM members WHERE email = 'x\\' OR \\'1\\'=\\'1'

(\`cur.mogrify\` returns the exact text PyMySQL would send — a handy debugging tool.)

Rules worth memorising:

- The placeholder is **\`%s\` for every type** — ints, Decimals, dates and None alike. \`%d\` fails.
  (\`?\` is \`sqlite3\`'s style, not PyMySQL's.)
- **Do not quote it**: \`WHERE title = '%s'\` produces \`''Clean Code''\` and a syntax error.
- The second argument is a **tuple** (or list): \`(title,)\` — note the comma. A dict works with
  named placeholders: \`"... WHERE id = %(id)s", {"id": 7}\`.
- Placeholders bind **values only**, never table or column names — those must come from an
  allow-list in your code.
- Python values map to SQL naturally: \`None\` → \`NULL\`, \`True\` → \`1\`, \`Decimal('9.50')\` → \`9.50\`,
  \`date(2026, 1, 2)\` → \`'2026-01-02'\`, a tuple → \`(1,2,3)\` (useful for \`IN %s\`).

## Writing: rowcount, lastrowid, executemany

    cur.execute(
        "INSERT INTO books (title, author, copies) VALUES (%s, %s, %s)",
        ("Clean Code", "Robert C. Martin", 3),
    )
    new_id = cur.lastrowid          # the AUTO_INCREMENT id MySQL just assigned
    conn.commit()

    cur.execute("UPDATE books SET copies = copies - 1 WHERE id = %s AND copies > 0", (new_id,))
    if cur.rowcount == 0:
        print("no copy available")

\`cur.rowcount\` is the number of rows the last statement changed (or returned, for a SELECT).
For many rows use **\`executemany\`** with a list of tuples:

    rows = [("Refactoring", "Martin Fowler", 2), ("The Pragmatic Programmer", "Hunt & Thomas", 4)]
    cur.executemany("INSERT INTO books (title, author, copies) VALUES (%s, %s, %s)", rows)
    conn.commit()

For an \`INSERT ... VALUES\` PyMySQL rewrites the batch into one multi-row INSERT — far fewer round
trips than a Python loop of \`execute\`. (After a multi-row insert, \`lastrowid\` is the id of the
**first** new row, as MySQL's \`LAST_INSERT_ID()\` defines it.)

## Reading rows into objects

Dicts are fine inside a function; across a codebase, a **dataclass** gives names, types and
editor completion:

    from dataclasses import dataclass
    from datetime import date
    from decimal import Decimal

    @dataclass
    class Book:
        id: int
        title: str
        author: str
        copies: int
        price: Decimal
        published: date | None = None

    def find_book(conn, book_id: int) -> Book | None:
        with conn.cursor() as cur:              # DictCursor connection
            cur.execute(
                "SELECT id, title, author, copies, price, published FROM books WHERE id = %s",
                (book_id,),
            )
            row = cur.fetchone()
        return Book(**row) if row else None

- \`fetchone()\` returns **None** when there is no row — check before using it.
- \`Book(**row)\` works because the SELECT names exactly the dataclass's fields. With \`SELECT *\`
  a new column in the table breaks it: \`TypeError: Book.__init__() got an unexpected keyword
  argument 'isbn'\`. List columns explicitly.
- PyMySQL returns \`DECIMAL\` as \`decimal.Decimal\`, \`DATE\` as \`datetime.date\`, \`NULL\` as \`None\`,
  and \`TINYINT(1)\` (MySQL's "BOOLEAN") as the int \`0\` or \`1\`, not a bool.`,
    workedExample: `**Problem:** a search box lets members filter books by author and an optional
minimum year, and sort by a column they pick. Write it safely.

    ALLOWED_SORT = {"title": "title", "year": "published", "copies": "copies"}

    def search_books(conn, author: str, min_year: int | None, sort: str) -> list[Book]:
        sql = ("SELECT id, title, author, copies, price, published FROM books "
               "WHERE author LIKE %s")
        params: list = [f"%{author}%"]
        if min_year is not None:
            sql += " AND YEAR(published) >= %s"
            params.append(min_year)
        column = ALLOWED_SORT.get(sort, "title")       # identifiers: allow-list only
        sql += f" ORDER BY {column}"
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return [Book(**row) for row in cur.fetchall()]

**Reasoning:**

- The **values** (\`author\`, \`min_year\`) only ever enter through \`%s\`. The \`%\` wildcards are added
  to the *value* in Python — \`f"%{author}%"\` builds data, not SQL, so it is safe.
- The **column name** cannot be a placeholder (it would be sent as the string \`'published'\` and
  MySQL would sort by a constant). It goes into the SQL text, but only after being looked up in
  \`ALLOWED_SORT\`, so a user can choose a column but never write SQL.
- The SQL is built from fixed fragments plus a parameter list that grows with it; the two always
  line up because each \`%s\` is appended together with its value.
- A user typing \`%\` as the author matches every book — injection-safe, but a product decision.`,
    mcqs: [
      mcq('Which call safely finds a member by the email the user typed into a login form?', [
        ['cur.execute("SELECT * FROM members WHERE email = %s", (email,))', true],
        ['cur.execute(f"SELECT * FROM members WHERE email = \'{email}\'")', false],
        ['cur.execute("SELECT * FROM members WHERE email = \'%s\'" % email)', false],
        ['cur.execute("SELECT * FROM members WHERE email = \'" + email + "\'")', false],
      ], 'Only the first passes the email separately so PyMySQL escapes it as data. The f-string, %-formatting and + versions all paste user text into the SQL before the driver sees it, which is injectable.'),
      mcq('cur.execute("INSERT INTO members (name, email) VALUES (%s, %s)", ("Asha", "asha@x.in")) succeeds on a table with an AUTO_INCREMENT id. How do you get the new member\'s id?', [
        ['Read cur.lastrowid', true],
        ['Read cur.rowcount', false],
        ['Call cur.fetchone()', false],
        ['Read the id from the tuple', false],
      ], 'lastrowid holds the AUTO_INCREMENT value MySQL assigned to the inserted row. rowcount is the number of rows affected (1 here), and an INSERT returns no result rows to fetch.'),
      mcq('A function runs SELECT * FROM books WHERE id = %s and returns Book(**row) for a dataclass with fields id, title, author. A DBA adds an isbn column to books. What happens on the next call?', [
        ['TypeError: an unexpected keyword argument \'isbn\'', true],
        ['The isbn value is silently dropped from the object', false],
        ['The Book object gains a new isbn attribute', false],
        ['MySQL refuses the query until the code changes', false],
      ], 'SELECT * now returns an isbn key, and unpacking it into a dataclass that has no isbn field raises TypeError. Naming the columns in the SELECT keeps the mapping stable.'),
    ],
    checkpoint: [
      mcq('What does PyMySQL send for cur.execute("SELECT * FROM books WHERE title = \'%s\'", ("Dune",))?', [
        ['WHERE title = \'\'Dune\'\', which MySQL rejects', true],
        ['WHERE title = \'Dune\', which finds the book', false],
        ['WHERE title = %s, with Dune sent separately', false],
        ['WHERE title = Dune, with the quotes removed', false],
      ], 'PyMySQL adds its own quotes when it escapes a string, so quoting the placeholder in the SQL doubles them and produces a syntax error. Write a bare %s.'),
      mcq('A route takes ?sort=price and runs cur.execute("SELECT * FROM books ORDER BY %s", (sort,)). The rows come back unsorted. Why?', [
        ['The column is bound as the string \'price\', a constant', true],
        ['ORDER BY needs a %d placeholder for numeric columns', false],
        ['PyMySQL ignores placeholders after ORDER BY entirely', false],
        ['The value needs to be passed as a list, not a tuple', false],
      ], 'Placeholders always produce escaped values, so the query becomes ORDER BY \'price\' — sorting by the same constant for every row. Column names must be chosen from an allow-list and placed in the SQL text.'),
      mcq('After cur.executemany("INSERT INTO loans (book_id, member_id) VALUES (%s, %s)", rows) with three tuples in rows, which statement about PyMySQL is true?', [
        ['It sends one multi-row INSERT for the batch', true],
        ['It commits each row as soon as it is inserted', false],
        ['It returns the three new ids as a Python list', false],
        ['It needs one %s for each value in the whole batch', false],
      ], 'PyMySQL recognises INSERT ... VALUES and rewrites the batch into a single multi-row statement. Nothing is committed until conn.commit(), and the SQL keeps one %s per column.'),
    ],
  },

  /* ── TRANSACTIONS ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_MYSQL_TRANSACTIONS',
    notes: `A **transaction** is a group of statements that succeed or fail together. Lending a book is
two writes — reduce \`books.copies\` and insert a \`loans\` row. If the program crashes between them,
the library has either a missing copy or a loan for a book it never lent.

## PyMySQL starts with autocommit off

The DB-API says a connection is transactional, and PyMySQL follows it: **\`autocommit\` is \`False\`
by default**. The first statement opens a transaction, and nothing you write is permanent until
\`conn.commit()\`:

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE books SET copies = copies + 5 WHERE id = %s", (3,))
        # forgot conn.commit()
    # connection closed -> MySQL rolls the update back

This is the opposite of the MySQL command-line client and Workbench, which autocommit — the
source of the classic "my script says it worked but the row isn't there".

## The pattern: commit on success, roll back on failure

    def lend_book(conn, book_id: int, member_id: int) -> int:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE books SET copies = copies - 1 WHERE id = %s AND copies > 0",
                    (book_id,),
                )
                if cur.rowcount == 0:
                    raise ValueError("no copies left")
                cur.execute(
                    "INSERT INTO loans (book_id, member_id, loaned_on) VALUES (%s, %s, CURDATE())",
                    (book_id, member_id),
                )
                loan_id = cur.lastrowid
            conn.commit()
            return loan_id
        except Exception:
            conn.rollback()
            raise

- Both statements run on the **same connection** — a transaction belongs to a connection.
- \`rollback()\` then **\`raise\`**: undo, and let the caller know it failed. Swallowing the exception
  would report a loan that never happened.
- The guarded \`UPDATE ... AND copies > 0\` plus the \`rowcount\` check makes "is a copy free?" and
  "take it" one atomic step, so two librarians cannot lend the last copy twice.

## A context manager makes it impossible to forget

    from contextlib import contextmanager

    @contextmanager
    def transaction(conn):
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise

    with get_connection() as conn, transaction(conn), conn.cursor() as cur:
        cur.execute(...)
        cur.execute(...)

On a clean exit the block commits; on any exception it rolls back and re-raises. (The \`try\` is
essential: without it, an exception at the \`yield\` skips \`commit()\` but also skips \`rollback()\`,
leaving the transaction to die with the connection — or to leak into the next user of a pooled one.)

## Autocommit on, and explicit begin

\`pymysql.connect(..., autocommit=True)\` (or \`conn.autocommit(True)\`) makes every statement commit on
its own — convenient for read-only scripts. You can still group writes with \`conn.begin()\` ...
\`conn.commit()\`.

## Three MySQL facts that surprise Python developers

- **Only InnoDB tables are transactional.** A MyISAM table ignores rollback.
- **DDL commits implicitly.** \`CREATE TABLE\`, \`ALTER TABLE\`, \`DROP\` end the current transaction
  first, so a migration that mixes DDL and data cannot be rolled back as a unit.
- **A long-lived transaction sees a snapshot.** Under InnoDB's default REPEATABLE READ, a script
  that polls \`SELECT\` in a loop on one connection without committing keeps reading the snapshot
  from its first read and never sees new rows. Commit (or use autocommit) between polls.

mysql-connector-python behaves the same way: autocommit off by default, \`commit()\`/\`rollback()\`,
\`start_transaction()\` for an explicit begin.`,
    workedExample: `**Problem:** returning a book must mark the loan returned, add the copy back, and
record a fine of ₹5 per day late — all or nothing. Use the \`transaction\` context manager.

    from datetime import date
    from decimal import Decimal

    FINE_PER_DAY = Decimal("5.00")

    def return_book(conn, loan_id: int, today: date) -> Decimal:
        with transaction(conn), conn.cursor() as cur:
            cur.execute(
                "SELECT book_id, due_on FROM loans "
                "WHERE id = %s AND returned_on IS NULL FOR UPDATE",
                (loan_id,),
            )
            loan = cur.fetchone()
            if loan is None:
                raise LookupError(f"loan {loan_id} is not open")
            days_late = max(0, (today - loan["due_on"]).days)
            fine = FINE_PER_DAY * days_late
            cur.execute(
                "UPDATE loans SET returned_on = %s, fine = %s WHERE id = %s",
                (today, fine, loan_id),
            )
            cur.execute("UPDATE books SET copies = copies + 1 WHERE id = %s", (loan["book_id"],))
        return fine

**Reasoning:**

- \`FOR UPDATE\` locks the loan row for this transaction, so two clicks on "Return" cannot both see it
  open and add two copies back; the second waits, then finds \`returned_on\` set and gets
  \`LookupError\`.
- \`loan["due_on"]\` is already a \`datetime.date\` (PyMySQL converts DATE columns), so subtraction gives
  a \`timedelta\` whose \`.days\` is the lateness.
- Money stays \`Decimal\` from the constant to the \`DECIMAL\` column; a float would drift.
- Raising \`LookupError\` inside the block triggers the rollback and reaches the caller; leaving the
  block normally commits all three changes at once.`,
    mcqs: [
      mcq('A script runs cur.execute("DELETE FROM loans WHERE returned_on < %s", (cutoff,)), prints cur.rowcount (it shows 40) and exits. Workbench still shows the 40 loans. What is the cause?', [
        ['PyMySQL had autocommit off and commit() was never called', true],
        ['rowcount counts rows matched, not rows actually deleted', false],
        ['Workbench caches table contents until it is restarted', false],
        ['The placeholder bound cutoff as text, so no row matched', false],
      ], 'PyMySQL connections start with autocommit off, so the delete ran inside a transaction that was discarded when the script ended. The rowcount of 40 shows the rows did match.'),
      mcq('In lend_book, what is the purpose of the bare raise after conn.rollback()?', [
        ['The caller learns the loan failed', true],
        ['It retries the transaction once before giving up', false],
        ['It is needed for rollback() to take effect at all', false],
        ['It closes the cursor that the with block opened', false],
      ], 'rollback() undoes the work on its own; re-raising passes the failure up so the caller can show an error. Without it, the function would return None as if a loan had been made.'),
      mcq('A migration script runs CREATE TABLE fines (...), then an INSERT that fails, then conn.rollback(). What remains?', [
        ['The fines table exists, with no rows from the failed INSERT', true],
        ['Nothing, because rollback() also undoes the CREATE TABLE', false],
        ['The table and the failed row, because DDL disables rollback', false],
        ['An error, since rollback() cannot follow a CREATE TABLE', false],
      ], 'MySQL commits implicitly around DDL, so the CREATE TABLE is permanent the moment it runs. The later INSERT is in a new transaction, and rollback undoes only that.'),
    ],
    checkpoint: [
      mcq('A @contextmanager transaction(conn) is written as: yield conn, then conn.commit() — with no try. A statement inside the with block raises. What does the helper do?', [
        ['Neither commits nor rolls back; the exception propagates', true],
        ['Rolls back automatically, then re-raises the exception', false],
        ['Commits the statements that succeeded before the error', false],
        ['Swallows the exception and leaves the block normally', false],
      ], 'The exception is thrown into the generator at the yield, and with no try it simply propagates, skipping the commit line — and nothing calls rollback. The open transaction is left for whoever reuses the connection.'),
      mcq('A dashboard script keeps one PyMySQL connection open and runs SELECT COUNT(*) FROM loans every minute without committing. New loans are added by the web app, yet the count never changes. Why?', [
        ['Its open transaction keeps reading the first snapshot', true],
        ['PyMySQL caches the result of identical SELECT strings', false],
        ['COUNT(*) is computed once per connection by MySQL', false],
        ['The web app\'s inserts are invisible to other users', false],
      ], 'With autocommit off, the first SELECT opens a transaction and InnoDB\'s REPEATABLE READ keeps returning that snapshot. Calling conn.commit() between polls, or using autocommit, lets it see new rows.'),
      mcq('Two librarians lend the last copy of book 9 at the same instant using UPDATE books SET copies = copies - 1 WHERE id = %s AND copies > 0 and a rowcount check. What happens?', [
        ['One update changes a row; the other sees rowcount 0', true],
        ['Both updates succeed and copies drops to -1 in the table', false],
        ['Both updates fail because the row is locked', false],
        ['MySQL raises a deadlock error for both sessions', false],
      ], 'InnoDB locks the row for the first update; the second waits, then re-checks copies > 0, finds 0 and changes nothing. The rowcount check turns that into a clean "no copies left".'),
    ],
  },

  /* ── REPOSITORY_LAYER ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_MYSQL_REPOSITORY_LAYER',
    notes: `When SQL is scattered across route handlers and CLI commands, a schema change means a search
through the whole project, and nothing can be tested without a database. The fix is to put all SQL
for one kind of data behind one class: a **repository** (the DAO pattern under another name).

## A repository class

    from dataclasses import dataclass

    @dataclass
    class Member:
        id: int | None
        name: str
        email: str

    class MemberRepository:
        def __init__(self, conn):
            self.conn = conn

        def add(self, member: Member) -> Member:
            with self.conn.cursor() as cur:
                cur.execute("INSERT INTO members (name, email) VALUES (%s, %s)",
                            (member.name, member.email))
                member.id = cur.lastrowid
            return member

        def get(self, member_id: int) -> Member | None:
            with self.conn.cursor() as cur:
                cur.execute("SELECT id, name, email FROM members WHERE id = %s", (member_id,))
                row = cur.fetchone()
            return Member(**row) if row else None

        def find_by_email(self, email: str) -> Member | None:
            with self.conn.cursor() as cur:
                cur.execute("SELECT id, name, email FROM members WHERE email = %s", (email,))
                row = cur.fetchone()
            return Member(**row) if row else None

Design choices worth defending in a review:

- **Takes a connection, does not open one.** The caller (a service function) owns the connection
  and the transaction, so a repository method can be one step of a bigger all-or-nothing operation.
  That is why \`add\` does not commit.
- **Returns domain objects**, never cursors or raw rows — callers do not know it is MySQL.
- **Only data access.** "A member may hold at most 3 loans" is a business rule; it lives in a
  service, not in SQL scattered through the repository.

## The service layer uses repositories

    class LoanService:
        def __init__(self, conn):
            self.conn = conn
            self.members = MemberRepository(conn)
            self.loans = LoanRepository(conn)

        def lend(self, member_id: int, book_id: int) -> int:
            with transaction(self.conn):
                if self.members.get(member_id) is None:
                    raise LookupError("no such member")
                if self.loans.count_open(member_id) >= 3:
                    raise ValueError("loan limit reached")
                return self.loans.create(member_id, book_id)

For unit tests, pass a \`FakeMemberRepository\` that keeps a dict in memory; for repository tests, run
against a real test database (a Docker MySQL, or a throwaway schema) inside a transaction you roll
back at the end of each test.

## Connection pools

Opening a MySQL connection costs a TCP handshake, authentication and session setup — often more than
the query. A command-line tool opens one connection and is done. A web server handling many
requests a second should **reuse** connections from a **pool**:

    from dbutils.pooled_db import PooledDB     # pip install DBUtils
    import pymysql

    pool = PooledDB(
        creator=pymysql, maxconnections=10, mincached=2, blocking=True,
        host=os.environ["DB_HOST"], user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"], database="library",
        cursorclass=DictCursor,
    )

    conn = pool.connection()      # borrow
    try:
        ...
    finally:
        conn.close()              # returns it to the pool, does not disconnect

- Create the pool **once** per process, at startup — never per request.
- \`close()\` on a pooled connection hands it back. Return it explicitly (\`try\`/\`finally\` or a
  teardown handler) rather than trusting garbage collection; when every connection is held, the next
  request waits (\`blocking=True\`) or gets DBUtils' \`TooManyConnections\` (\`blocking=False\`).
- MySQL drops connections idle longer than \`wait_timeout\` (8 hours by default); the next use fails
  with \`(2006, 'MySQL server has gone away')\`. Pools handle this with a ping before lending
  (\`ping=1\` in DBUtils, \`pool_pre_ping=True\` in SQLAlchemy); a lone connection can call
  \`conn.ping(reconnect=True)\`.

**SQLAlchemy** pools by default: \`create_engine("mysql+pymysql://user:pw@host/library",
pool_size=5, max_overflow=10, pool_pre_ping=True)\`. mysql-connector-python has its own
\`mysql.connector.pooling.MySQLConnectionPool\`.

## Where this goes next

Django's ORM is all of this, built for you: a model class is the dataclass, \`Member.objects\` is the
repository, every query is parameterised, \`transaction.atomic()\` is the context manager above, and
\`CONN_MAX_AGE\` keeps connections open between requests. Having written it by hand, you will know
what the ORM is doing — and what to look for when it does it slowly.`,
    mcqs: [
      mcq('Why does MemberRepository.add() take a connection from its constructor and not call commit()?', [
        ['The caller can combine it with other writes in one transaction', true],
        ['PyMySQL forbids calling commit() from inside a method defined on a class', false],
        ['lastrowid is lost as soon as a transaction commits', false],
        ['A repository may not hold a reference to a connection', false],
      ], 'If add() committed, a service could never make "add member and create first loan" all-or-nothing. Leaving the transaction to the caller keeps each repository method composable; lastrowid survives commit.'),
      mcq('A Flask app builds PooledDB(...) inside its get_db() helper, which every request calls. What is wrong?', [
        ['A new pool is created per request, so nothing is reused', true],
        ['PooledDB only works with mysql-connector-python', false],
        ['Pools may only be created inside a with block', false],
        ['Each request then shares a single cursor with every other request', false],
      ], 'A pool saves work only if it lives for the whole process. Building one per request opens fresh connections every time — slower than no pool, and leaky if the pools are never closed.'),
      mcq('A nightly report job reuses one PyMySQL connection opened at boot. The first run after a quiet weekend fails with (2006, \'MySQL server has gone away\'). What fixes it?', [
        ['Call conn.ping(reconnect=True) before using the connection', true],
        ['Switch every %s placeholder to a named %(x)s placeholder', false],
        ['Raise max_connections in the MySQL configuration file', false],
        ['Pass charset="utf8mb4" when opening the connection', false],
      ], 'MySQL closed the idle session after wait_timeout, so the old socket is dead. ping(reconnect=True) checks it and reconnects; pools do the same with a pre-ping. The other changes do not touch idle timeouts.'),
    ],
    checkpoint: [
      mcq('In a DBUtils pool, what does conn.close() do on a connection obtained from pool.connection()?', [
        ['It returns the connection to the pool for reuse', true],
        ['It disconnects from MySQL and shrinks the pool', false],
        ['It commits any open transaction and disconnects', false],
        ['It is ignored, since pooled connections never close', false],
      ], 'A pooled connection is a wrapper whose close() hands the real connection back. Holding connections without returning them is how a pool runs dry; close() does not commit on your behalf.'),
      mcq('LoanService.lend() must be unit-tested without a database. Which design makes that straightforward?', [
        ['Pass the service fake repositories that store data in dicts', true],
        ['Have the service open its own connection inside lend()', false],
        ['Move the loan-limit rule into the SQL of LoanRepository', false],
        ['Make every repository method commit its own changes immediately', false],
      ], 'Because the service only calls repository methods, a test can hand it in-memory fakes and check the rules directly. Opening connections or burying rules in SQL ties the test to MySQL.'),
      mcq('Which pairing of Django feature and hand-written equivalent from this unit is correct?', [
        ['transaction.atomic() and the transaction() context manager', true],
        ['CONN_MAX_AGE and the %s placeholder escaping rules in PyMySQL', false],
        ['Member.objects and the DictCursor row format', false],
        ['A model\'s Meta class and conn.ping(reconnect=True)', false],
      ], 'transaction.atomic() commits on a clean exit and rolls back on an exception, exactly like the hand-written helper. CONN_MAX_AGE is about keeping connections, and the manager plays the repository role.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_MYSQL_DEBUGGING',
    notes: `Python-to-MySQL bugs are few and recognisable. Read the whole traceback: the exception class
(\`ProgrammingError\`, \`OperationalError\`, \`IntegrityError\`, \`TypeError\`) and MySQL's error number
usually name the fault outright.

## 1. SQL built with an f-string

    cur.execute(f"SELECT * FROM books WHERE title = '{title}'")

Works in testing, then \`O'Brien's Guide\` raises \`ProgrammingError (1064, "You have an error in your
SQL syntax ...")\` — and \`' OR '1'='1\` returns every row. **Fix:** \`"... WHERE title = %s", (title,)\`.

## 2. A quoted placeholder

    cur.execute("SELECT * FROM members WHERE name = '%s'", (name,))

PyMySQL adds its own quotes, so the SQL becomes \`name = ''Ravi''\` → error 1064. **Fix:** a bare \`%s\`.

## 3. A placeholder for a table or column name

    cur.execute("SELECT * FROM %s", (table,))     # SELECT * FROM 'books'  -> 1064

Placeholders produce quoted values, never identifiers. **Fix:** pick the name from an allow-list
dict and put it in the SQL text.

## 4. A literal % next to placeholders

    cur.execute("SELECT * FROM books WHERE title LIKE 'Py%' AND copies > %s", (0,))
    # ValueError: unsupported format character ''' (0x27) at index 41

When arguments are passed, PyMySQL applies Python \`%\` formatting to the whole string, so every
literal \`%\` must be written \`%%\`. **Better fix:** bind the pattern too —
\`"... title LIKE %s AND copies > %s", ("Py%", 0)\`.

## 5. The write that vanished

The script printed "Saved 12 members", but the table is empty. PyMySQL's autocommit is **off**; the
transaction died when the connection closed. **Fix:** \`conn.commit()\` after the writes (or the
\`transaction()\` helper).

## 6. Rows that are not what you think

    row = cur.fetchone()
    print(row["title"])

\`TypeError: tuple indices must be integers or slices, not str\` — the connection uses the default
cursor; use \`DictCursor\`. \`TypeError: 'NoneType' object is not subscriptable\` — the query matched
nothing and \`fetchone()\` returned \`None\`; check before indexing.

## 7. A polling loop that never sees new data

A worker selects pending jobs every 10 seconds on one connection and never commits. Its first SELECT
opened a REPEATABLE READ snapshot, so new jobs never appear. **Fix:** \`conn.commit()\` after each
poll, or \`autocommit=True\` for a read-only worker.

## 8. "MySQL server has gone away" in the morning

\`OperationalError (2006, ...)\` or \`(2013, 'Lost connection to MySQL server during query')\` on the
first request after a quiet night: the server closed the idle connection after \`wait_timeout\`.
**Fix:** a pool with a pre-ping, or \`conn.ping(reconnect=True)\` before use.

## Method

Print \`cur.mogrify(sql, params)\` to see the exact SQL sent, run it in Workbench, and compare.
Change one thing, re-run, and keep the failing input as a test.`,
    mcqs: [
      mcq('cur.execute("SELECT * FROM books WHERE isbn LIKE \'978%\' AND copies > %s", (0,)) raises ValueError: unsupported format character. What is the best fix?', [
        ['Bind the pattern too: LIKE %s AND copies > %s with ("978%", 0)', true],
        ['Replace the %s placeholder with %d because copies is an integer', false],
        ['Wrap the whole SQL string in an f-string before execute', false],
        ['Call conn.commit() before the SELECT statement runs', false],
      ], 'With arguments present, PyMySQL %-formats the SQL, so the literal % before the quote is read as a format code. Binding the pattern removes the literal %; %d fails in PyMySQL and an f-string reintroduces injection.'),
      mcq('An import script logs "inserted 500 books" with no errors, but SELECT COUNT(*) FROM books in Workbench still shows the old total. Which line is most likely missing?', [
        ['conn.commit()', true],
        ['cur.fetchall()', false],
        ['conn.ping()', false],
        ['cur.close()', false],
      ], 'PyMySQL works inside a transaction by default, and an uncommitted transaction is rolled back when the connection closes. Fetching, pinging or closing the cursor does not make writes permanent.'),
      mcq('row = cur.fetchone(); return row["email"] fails with TypeError: \'NoneType\' object is not subscriptable. What does that tell you?', [
        ['The query matched no rows', true],
        ['The cursor returns tuples', false],
        ['The email column is NULL', false],
        ['The connection was closed', false],
      ], 'fetchone() returns None when there is no row, and indexing None gives this TypeError. A tuple row gives "tuple indices must be integers", and a NULL email would be returned as None without an error.'),
      mcq('A function runs cur.execute("DELETE FROM %s WHERE id = %s", (table, row_id)) and fails with error 1064. Why?', [
        ['The table name is sent as a quoted string value', true],
        ['DELETE statements cannot use placeholders at all', false],
        ['The id must be passed as a str for the %s to match', false],
        ['Two placeholders need executemany instead of execute', false],
      ], 'PyMySQL escapes every argument as a value, so the SQL becomes DELETE FROM \'loans\' ..., which is invalid. Choose the table from an allow-list and place it in the SQL text; the id placeholder is fine.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_MYSQL_PRACTICE',
    notes: `Work these against a local MySQL 8 database named \`practice\`, in a virtual environment with
\`pymysql\` installed and connection settings in environment variables.

    CREATE TABLE courses (
        id        INT AUTO_INCREMENT PRIMARY KEY,
        code      VARCHAR(20)   NOT NULL UNIQUE,
        title     VARCHAR(120)  NOT NULL,
        fee       DECIMAL(10,2) NOT NULL,
        seats     INT           NOT NULL CHECK (seats >= 0)
    ) ENGINE=InnoDB;

    CREATE TABLE enrolments (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        course_id  INT          NOT NULL,
        student    VARCHAR(100) NOT NULL,
        paid       DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (course_id) REFERENCES courses(id)
    ) ENGINE=InnoDB;

Every exercise: \`%s\` placeholders only, every connection and cursor in a \`with\`, rows mapped to a
\`@dataclass\`.

## Exercise 1 — Connect and report

\`db.py\` with \`get_connection()\` reading \`DB_HOST\`, \`DB_USER\`, \`DB_PASSWORD\`, \`DB_NAME\` and using
\`DictCursor\`. A \`__main__\` block prints the MySQL version. Unset \`DB_PASSWORD\` and confirm the error
is immediate and readable.

## Exercise 2 — Add and fetch

\`add_course(conn, code, title, fee, seats) -> int\` returning the new id (\`lastrowid\`), and
\`get_course(conn, code) -> Course | None\`. Store \`Decimal("4999.00")\`, read it back, and confirm the
type is \`Decimal\`. Insert a duplicate code and catch \`pymysql.err.IntegrityError\` (error 1062).

## Exercise 3 — Bulk load from CSV

Read \`courses.csv\` with \`csv.DictReader\` and insert all rows with one \`executemany\` and one commit.
Time it against a loop of \`execute\` + \`commit\` per row for 2,000 rows.

## Exercise 4 — Enrol in one transaction

\`enrol(conn, course_id, student, paid)\` decrements \`seats\` with a guarded UPDATE and inserts the
enrolment — both or neither. Force the INSERT to fail (a course id that does not exist) and confirm
\`seats\` did not change.

## Exercise 5 — Injection test

Write \`find_by_title(conn, fragment)\` with \`LIKE %s\`. Call it with \`' OR '1'='1\` and with
\`O'Reilly\`; both must run without error and match only real titles. Print \`cur.mogrify(...)\` to see
what was sent.

## Exercise 6 — A repository

Move exercises 2–5 into \`CourseRepository\` (no commits inside) and an \`EnrolmentService\` that owns
the transaction. Write two pytest tests for the service using a fake repository.

**Self-check:** no f-string or \`+\` touches SQL values; every write path ends in \`commit()\` or
\`rollback()\`; money is \`Decimal\` end to end.`,
    mcqs: [
      mcq('In Exercise 4 the enrolments INSERT fails on the foreign key after seats was decremented. With the transaction written correctly, what does seats show afterwards?', [
        ['Its value from before the enrol call', true],
        ['One less, because that UPDATE ran first', false],
        ['Zero, the column\'s CHECK lower limit', false],
        ['NULL, as the transaction was abandoned', false],
      ], 'The UPDATE and the INSERT share one transaction; the IntegrityError triggers rollback(), which undoes the decrement too. Rollback restores the earlier value, not a default.'),
      mcq('In Exercise 2, a course is inserted with fee Decimal("4999.00") into a DECIMAL(10,2) column. What type does PyMySQL return for fee when you read it back?', [
        ['decimal.Decimal', true],
        ['float', false],
        ['str', false],
        ['fractions.Fraction', false],
      ], 'PyMySQL converts MySQL DECIMAL (NEWDECIMAL) values to decimal.Decimal, which keeps money exact. Floats would introduce rounding errors, and the driver never returns a Fraction.'),
      mcq('Exercise 2 inserts the code PY101 twice. Which exception should the code catch for the second insert?', [
        ['pymysql.err.IntegrityError', true],
        ['pymysql.err.OperationalError', false],
        ['pymysql.err.ProgrammingError', false],
        ['KeyError from the dict row', false],
      ], 'A UNIQUE violation (MySQL error 1062, duplicate entry) is a data-integrity failure, raised as IntegrityError. OperationalError is for connection-level problems and ProgrammingError for bad SQL.'),
      mcq('Exercise 3 inserts 2,000 CSV rows with one executemany and one commit instead of 2,000 execute-and-commit pairs. Where does most of the speed-up come from?', [
        ['Far fewer network round trips and one transaction', true],
        ['executemany skips the table\'s UNIQUE checks', false],
        ['The rows are escaped once instead of per value', false],
        ['executemany runs the inserts on parallel threads', false],
      ], 'PyMySQL folds the batch into multi-row INSERTs and there is one commit instead of 2,000, each of which waits for a durable write. Constraints and per-value escaping still apply, and nothing runs in parallel.'),
      mcq('In Exercise 5, find_by_title(conn, "O\'Reilly") binds "%O\'Reilly%" to LIKE %s. What happens?', [
        ['It runs and matches titles containing O\'Reilly', true],
        ['It fails with a syntax error at the apostrophe', false],
        ['It returns every course in the table', false],
        ['It matches nothing, as the quote is stripped', false],
      ], 'A bound value is escaped as data, so the apostrophe is matched literally. Only SQL built by string formatting would break on it or be open to injection.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_MYSQL_INTERVIEW_QUESTION',
    notes: `Three questions a Python backend interview asks when the job touches a database. Practise
saying each answer in under two minutes, with a line of code where it helps.

## Q1. "How do you prevent SQL injection in Python?"

**Model answer.** Never build SQL text out of input — no f-strings, \`+\`, \`%\` or \`.format()\` with
user values. Pass values as parameters: \`cur.execute("SELECT * FROM users WHERE email = %s",
(email,))\`. The driver escapes each value (or sends it separately with server-side prepared
statements), so input is always data and can never change the query's structure. Placeholders only
cover values, so table or column names a user picks — say a sort column — come from an allow-list
in code. And an ORM like Django's or SQLAlchemy parameterises for you, but \`raw()\` or \`extra()\` with
an f-string is just as vulnerable.

**Follow-ups:** *"What placeholder does PyMySQL use?"* — \`%s\` for every type, or \`%(name)s\` with a
dict; \`sqlite3\` uses \`?\`. *"Is escaping input yourself enough?"* — It is fragile (character sets,
edge cases); parameters are the standard.

## Q2. "How do transactions work with a Python DB-API driver?"

**Model answer.** DB-API connections are transactional by default — PyMySQL and
mysql-connector both start with autocommit off — so the first statement begins a transaction and
nothing is permanent until \`conn.commit()\`. I wrap related writes in \`try\`: commit on success,
\`rollback()\` and re-raise on failure, usually through a small \`@contextmanager\` (or
\`transaction.atomic()\` in Django). Everything must run on the same connection. In MySQL I also
remember that only InnoDB is transactional and that DDL commits implicitly.

**Follow-ups:** *"What happens if you close without committing?"* — The server rolls back.
*"How do you stop two users booking the last seat?"* — A guarded \`UPDATE ... WHERE seats > 0\` with
a \`rowcount\` check, or \`SELECT ... FOR UPDATE\` inside the transaction.

## Q3. "Why use a connection pool, and how would you add one to a Flask app?"

**Model answer.** Connecting costs a handshake, authentication and session setup, and MySQL caps
concurrent connections. A pool opens a few connections once and lends them out, so requests skip
the setup and the app can never exceed a known number. In Flask I create the pool once at startup —
DBUtils' \`PooledDB(creator=pymysql, maxconnections=10, ...)\` or a SQLAlchemy engine — borrow a
connection per request, and return it in a \`teardown_appcontext\` handler. I enable a pre-ping so
connections MySQL dropped after \`wait_timeout\` are replaced instead of failing with "server has gone
away".

**Follow-ups:** *"How big?"* — Small and measured; the database, not the app, is the bottleneck.
*"What about Django?"* — It keeps a connection per thread open for \`CONN_MAX_AGE\` seconds rather than
a classic pool; Django 5.1+ adds native pooling for PostgreSQL only.

## How you are judged

Interviewers listen for the *why* — values vs code, all-or-nothing, the cost of a connection — and
for a real failure you have met: the write that vanished without \`commit()\`, the "too many
connections" outage. Definitions alone sound memorised.`,
    mcqs: [
      mcq('An interviewer shows User.objects.raw(f"SELECT * FROM users WHERE name = \'{name}\'") in a Django app and asks if the ORM makes it safe. What is the right answer?', [
        ['No — the f-string puts input into SQL; pass params instead', true],
        ['Yes — raw() escapes every value before sending the query', false],
        ['Yes — Django models reject any input containing quotes', false],
        ['No — but wrapping it in transaction.atomic() fixes it', false],
      ], 'raw() runs the SQL text it is given, and the f-string has already pasted the input into it. raw() accepts a params list for %s placeholders; transactions have nothing to do with injection.'),
      mcq('Asked "what happens if your Python code closes a MySQL connection without calling commit?", which answer is correct for PyMySQL defaults?', [
        ['The open transaction is rolled back by the server', true],
        ['The driver commits automatically before it closes', false],
        ['The changes stay pending until the next connection', false],
        ['MySQL keeps the changes but marks them as dirty', false],
      ], 'Autocommit is off, so the writes belong to an open transaction, and ending the session discards it. No driver default commits on close, and transactions do not carry over between connections.'),
      mcq('In a Flask app using a DBUtils pool, where should the borrowed connection be returned?', [
        ['In a teardown_appcontext handler that calls close()', true],
        ['At app startup, right after the pool object itself is created', false],
        ['Never; the pool reclaims idle connections itself', false],
        ['Inside each SQL statement, with a RETURN clause', false],
      ], 'teardown_appcontext runs after every request, even one that raised, so the connection always goes back. A pool cannot know you are finished with a connection unless close() is called.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_MYSQL_MINI_PROJECT',
    notes: `# A Library Manager on MySQL

Build a command-line library manager in Python on MySQL 8 through PyMySQL. No framework and no ORM:
dataclasses, a repository layer, parameterised SQL and explicit transactions. The Django part of the
track rebuilds this app with models, so keep the layers clean.

## Schema (run first)

    CREATE DATABASE library CHARACTER SET utf8mb4;
    USE library;

    CREATE TABLE books (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        isbn       VARCHAR(17)  NOT NULL UNIQUE,
        title      VARCHAR(200) NOT NULL,
        author     VARCHAR(120) NOT NULL,
        copies     INT          NOT NULL DEFAULT 1 CHECK (copies >= 0)
    ) ENGINE=InnoDB;

    CREATE TABLE members (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(100) NOT NULL,
        email      VARCHAR(150) NOT NULL UNIQUE,
        joined_on  DATE         NOT NULL DEFAULT (CURRENT_DATE)
    ) ENGINE=InnoDB;

    CREATE TABLE loans (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        book_id      INT           NOT NULL,
        member_id    INT           NOT NULL,
        loaned_on    DATE          NOT NULL,
        due_on       DATE          NOT NULL,
        returned_on  DATE          NULL,
        fine         DECIMAL(8,2)  NOT NULL DEFAULT 0,
        FOREIGN KEY (book_id)   REFERENCES books(id),
        FOREIGN KEY (member_id) REFERENCES members(id)
    ) ENGINE=InnoDB;

## Features (a numbered menu, or \`argparse\` subcommands)

1. Add a book (ISBN, title, author, copies) and print its id.
2. Search books by title or author fragment.
3. Register a member.
4. **Lend** a book to a member for 14 days — refused if no copy is free or the member already holds
   3 open loans.
5. **Return** a loan — sets \`returned_on\`, adds the copy back, and records a fine of ₹5 per day late.
6. List a member's open loans with due dates.
7. Overdue report: open loans past \`due_on\`, oldest first.
8. Exit.

## Design requirements

- Package layout: \`library/db.py\` (\`get_connection()\` from environment variables, \`transaction()\`
  context manager), \`library/models.py\` (dataclasses), \`library/repositories.py\`
  (\`BookRepository\`, \`MemberRepository\`, \`LoanRepository\`), \`library/services.py\`
  (\`LibraryService\` with the rules), \`library/cli.py\` (input and output only).
- **Every** value reaches SQL through \`%s\`; no f-string, \`+\` or \`%\` formatting touches SQL values.
  The search's sort column (if you offer one) comes from an allow-list.
- Repositories take a connection, return dataclasses, and never commit.
- **Lend and return are one transaction each**, using a guarded \`UPDATE ... WHERE copies > 0\` with a
  \`rowcount\` check (lend) and \`SELECT ... FOR UPDATE\` on the loan (return).
- Every connection and cursor closed with \`with\`; credentials never in source.
- Database errors become clear messages (duplicate ISBN, unknown member) and the menu continues.
- **pytest tests**: at least four service tests using fake in-memory repositories (lend refused with
  no copies, loan limit, fine calculation, return of an already-returned loan).

## Acceptance criteria

- Lending the last copy twice in a row: the second is refused, and \`copies\` never goes below zero.
- A forced failure between the copy decrement and the loan insert leaves \`copies\` unchanged.
- Returning a book 4 days late records a fine of 20.00 and \`copies\` goes back up by one.
- Searching for \`' OR '1'='1\` and for \`O'Reilly\` both run without error and return only real matches.
- A duplicate ISBN prints "ISBN already exists" and changes nothing.
- \`pytest\` passes without a database running.`,
    mcqs: [
      mcq('In the library manager, where should the "at most 3 open loans per member" rule live?', [
        ['In LibraryService, which asks LoanRepository for the count', true],
        ['In cli.py, right before the user is shown the lend prompt', false],
        ['In LoanRepository.create(), which refuses a fourth loan', false],
        ['In get_connection(), as a session variable on connect', false],
      ], 'Business rules belong in the service, which can be unit-tested with fake repositories. The repository only reads and writes data, and the CLI only handles input and output.'),
      mcq('Returning a loan must set returned_on, record the fine and add the copy back. Why does the return path start with SELECT ... FOR UPDATE on the loan row?', [
        ['So two returns of one loan cannot both see it open', true],
        ['So the SELECT can be run with the default tuple cursor', false],
        ['So MySQL computes the fine from the due_on column', false],
        ['So the loan row is copied into a separate history table', false],
      ], 'FOR UPDATE locks the row until the transaction ends; a second return waits, then sees returned_on set and is refused. Without it, both could add a copy back.'),
    ],
    assignment: {
      title: 'A Library Manager on MySQL',
      description: 'A command-line library manager in Python on MySQL 8: books, members and loans through dataclasses and a repository layer, parameterised queries, a transaction for every lend and return, and pytest tests for the rules.',
      instructions: `Build the app described in this unit's brief and submit it as a repository link or a zip.

**Submit:**

1. The \`library\` package (\`db.py\`, \`models.py\`, \`repositories.py\`, \`services.py\`, \`cli.py\`) and a
   \`tests\` folder with your pytest tests.
2. \`schema.sql\` (the brief's schema plus any seed rows) and \`requirements.txt\` pinning PyMySQL and
   pytest.
3. A README with: how to set the environment variables and run it, and terminal transcripts showing a
   normal lend and return, a refused lend (no copies), a late return with its fine, a duplicate ISBN,
   and the \`' OR '1'='1\` search.
4. A short paragraph explaining where each transaction begins and ends, and why two librarians can
   never lend the same last copy.

**Before you submit, check every acceptance criterion in the brief by running it**, not by reading
your code.`,
      rubric: [
        { criterion: 'Correct behaviour', description: 'All menu features work; lend refuses with no free copy or at the loan limit; returns compute the fine correctly; the overdue report matches a hand-written SELECT.', maxPoints: 25 },
        { criterion: 'Safe SQL and connection handling', description: 'Every value bound through %s with no string-built SQL; identifiers from an allow-list; every connection and cursor closed with a with block; credentials read from the environment.', maxPoints: 25 },
        { criterion: 'Transactions', description: 'Lend and return are each one transaction with commit and rollback; the guarded UPDATE checks rowcount; return locks the loan with FOR UPDATE; a forced failure leaves no partial change.', maxPoints: 20 },
        { criterion: 'Layered design and tests', description: 'Dataclass models, repositories that return them and never commit, rules in LibraryService, CLI with input and output only; at least four meaningful pytest tests pass without a database.', maxPoints: 20 },
        { criterion: 'Error handling and README', description: 'IntegrityError and lookup failures become clear messages and the menu continues; no swallowed exceptions; README transcripts and the transaction explanation are present and accurate.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_MYSQL_CHECKPOINT',
    notes: `Ten questions on Python and MySQL as a backend interview examines it: short PyMySQL snippets,
what they send to the server, and what happens to the data. They cover connecting and cursors,
%s placeholders and injection, rowcount and lastrowid, transactions, the repository layer and
connection pools. Answer from what the code actually does, not what it was meant to do.`,
    checkpoint: [
      mcq('cur.execute("SELECT id FROM members WHERE email = %s", (email,)) runs with email = "x\' OR \'1\'=\'1". How many rows can it return when no member has that literal email?', [
        ['None — the whole text is compared as one email', true],
        ['Every member, because the OR clause is true', false],
        ['Exactly one member, the first in the table', false],
        ['It raises a syntax error at the first quote', false],
      ], 'PyMySQL escapes the quotes, so MySQL compares the entire string with email and finds no match. The injection only works when the text is pasted into the SQL.'),
      mcq('After cur.execute("UPDATE books SET copies = copies - 1 WHERE id = %s AND copies > 0", (12,)), cur.rowcount is 0. Book 12 exists. What does that mean?', [
        ['Book 12 had no copies left, so nothing changed', true],
        ['The update succeeded but has not been committed', false],
        ['rowcount is only set after a SELECT statement', false],
        ['The placeholder failed to bind the integer 12', false],
      ], 'rowcount is the number of rows the UPDATE changed. With the row present, 0 means the copies > 0 guard was false. An uncommitted update still reports the rows it changed.'),
      mcq('Which call uses named placeholders correctly in PyMySQL?', [
        ['cur.execute("... WHERE id = %(id)s", {"id": 7})', true],
        ['cur.execute("... WHERE id = :id", {"id": 7})', false],
        ['cur.execute("... WHERE id = {id}", {"id": 7})', false],
        ['cur.execute("... WHERE id = ?id", {"id": 7})', false],
      ], 'PyMySQL\'s pyformat style accepts %(name)s with a dict. :id is the named style of sqlite3 and Oracle drivers, {id} is str.format syntax, and ?id is not a placeholder in any driver here.'),
      mcq('A service calls repo.add(member) then repo.add_card(member.id), and add_card raises IntegrityError. The service runs both inside the transaction() context manager. What is stored?', [
        ['Neither the member nor the card', true],
        ['The member only, since add() succeeded', false],
        ['Both, because IntegrityError is a warning', false],
        ['The card only, with a NULL member id', false],
      ], 'Both inserts ran on one connection in one transaction; the exception makes the context manager roll back everything since the transaction began, then re-raise.'),
      mcq('A module does conn = pymysql.connect(**cfg, autocommit=True) and then cur.execute("INSERT ...") with no commit. The script then crashes. Is the row saved?', [
        ['Yes — each statement committed as soon as it ran', true],
        ['No — a crash always rolls back the last statement', false],
        ['No — autocommit only applies to SELECT statements', false],
        ['Only if the cursor was closed before the crash', false],
      ], 'With autocommit on, MySQL commits every statement individually when it completes, so the insert was permanent before the crash. That is convenient but gives up all-or-nothing grouping.'),
      mcq('What does cur.fetchall() return for a SELECT that matches no rows, using DictCursor?', [
        ['An empty sequence', true],
        ['None', false],
        ['An empty dict', false],
        ['It raises an error', false],
      ], 'fetchall returns a sequence of rows, and with no rows that sequence is empty, so a for loop simply does nothing. It is fetchone that returns None when there is no row.'),
      mcq('A Flask app creates PooledDB(creator=pymysql, maxconnections=5, blocking=False, ...). Six slow requests each hold a borrowed connection at the same moment. What does the sixth pool.connection() call do?', [
        ['It raises the TooManyConnections error', true],
        ['It waits until one of the five is returned', false],
        ['It opens a sixth connection past the limit', false],
        ['It hands out a connection already in use', false],
      ], 'maxconnections is a hard cap, and with blocking=False the pool raises instead of waiting; blocking=True would make the sixth request wait. PyMySQL connections are not shared between threads.'),
      mcq('A repository returns Book(**row) from SELECT id, title, copies FROM books WHERE id = %s. Which dataclass fits that SELECT so the call works?', [
        ['Book with fields id, title, copies', true],
        ['Book with fields id, title, copies, author', false],
        ['Book with fields book_id, title, copies', false],
        ['Book with fields id and title only', false],
      ], 'Book(**row) passes each column as a keyword argument, so the field names must match the selected columns. An extra required field is missing, a renamed one gets an unexpected keyword, and a missing one rejects copies.'),
      mcq('A migration script runs: cur.execute("INSERT INTO books ..."); cur.execute("ALTER TABLE books ADD COLUMN isbn VARCHAR(17)"); then conn.rollback(). Is the inserted book still there?', [
        ['Yes — the ALTER TABLE committed the INSERT implicitly', true],
        ['No — rollback undoes both the INSERT and the ALTER', false],
        ['No — rollback undoes the INSERT but keeps the column', false],
        ['Yes — an INSERT can never be rolled back in MySQL', false],
      ], 'MySQL commits the open transaction before running DDL, so the INSERT became permanent when the ALTER started. The rollback has nothing left to undo.'),
      mcq('Why is Django\'s ORM, covered next in the track, still worth understanding at the PyMySQL level?', [
        ['Its slow queries and connection faults are debugged at that level', true],
        ['Django cannot connect to MySQL unless you write your own PyMySQL code', false],
        ['The ORM leaves SQL parameterisation for the developer to add', false],
        ['Django needs a repository class written for every model', false],
      ], 'The ORM generates parameterised SQL and manages connections for you, but when a page is slow or connections run out, you diagnose it by understanding the queries, transactions and connections underneath.'),
    ],
  },
];
