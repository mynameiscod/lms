/**
 * T_SQL — the complete topic, thirteen units.
 *
 * ── WHY THIS TOPIC ────────────────────────────────────────────────────────────────────────
 *
 * Thirteen STANDARD-depth UNIVERSAL units, which is the largest single source of the
 * ADVANCED_UNIVERSAL role still missing for strong learners, plus a DEBUG, a PRACTICE and an
 * INTEGRATION unit. Databases are third in the authoring priority and they are shared core for
 * SOFTWARE_BACKEND, WEB_DEVELOPMENT and DATA, so the capacity serves several directions at once
 * without anything being duplicated per direction.
 *
 * ── THE LINE THIS TOPIC HOLDS ─────────────────────────────────────────────────────────────
 *
 * SQL is usually taught as syntax, which produces students who can write SELECT and cannot say
 * why their query returned nothing. Every unit here leads with the MODEL — a row is a fact, a
 * key is an identity, a join is a matching rule, NULL is unknown rather than empty — because
 * every classic SQL surprise follows from one of those and none of them follows from syntax.
 *
 * The three genuine traps get units of their own rather than a footnote: NULL in a WHERE
 * clause, HAVING versus WHERE, and an UPDATE without a WHERE.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const SQL_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T_SQL_WHY_DATABASES',
    notes: `You can store data in a file. The question is what a database gives you that a file or a
spreadsheet does not, and the answer is not "it is bigger".

**1. Querying without loading everything.** "Which students scored above 80 in Physics" against
a file means reading all of it and filtering in your own code. A database answers it directly,
and it does so efficiently even when the data will not fit in memory.

**2. Structure that is enforced.** A column declared as a date cannot hold "tomorrow". A
spreadsheet will happily accept it, and you find out months later when a calculation produces
nonsense.

**3. Relationships that stay honest.** A foreign key means a row cannot point at a student who
does not exist. In two files you can delete a student and leave their marks orphaned, and
nothing notices until something breaks.

**4. Concurrent access.** Two people editing a spreadsheet produce two spreadsheets. A database
handles simultaneous readers and writers and decides what happens when they collide.

**5. Transactions.** Several changes that must all happen or none of them — moving money between
accounts is the standard example, and a crash halfway through a file rewrite is the standard
disaster.

**6. Durability.** Committed means committed, including through a power cut.

**When a file is genuinely the right answer**, because "use a database" is not always the
mature choice: configuration, a log you only ever append to, a one-off script's output, data
that is genuinely a document rather than rows and columns.

**Relational, specifically.** Data lives in tables of rows and columns, tables reference each
other by key, and the query language describes *what you want* rather than how to get it. You
write "the students in Physics scoring above 80"; the database decides how to find them, and
that separation is why a query keeps working when the data grows a thousandfold.`,
    mcqs: [
      mcq('Which is NOT a reason to choose a database over a file?',
        [['Databases are always faster for every operation', true],
          ['Structure is enforced', false],
          ['Concurrent access is handled', false],
          ['Relationships can be guaranteed', false]],
        'Reading one small file end to end beats a database round trip. The wins are structure, relationships, concurrency and durability.'),
      mcq('SQL is called declarative because:',
        [['You describe WHAT you want, and the database decides how to get it', true],
          ['It is written in uppercase', false],
          ['It cannot be used in programs', false],
          ['It has no loops', false]],
        'That separation is why a query keeps working when the data grows a thousandfold and the access strategy has to change.'),
      mcq('A foreign key prevents which problem?',
        [['A row referring to something that does not exist', true],
          ['Duplicate rows', false],
          ['Slow queries', false],
          ['Wrong data types', false]],
        'In two separate files you can delete a student and orphan their marks, and nothing notices until something breaks.'),
      mcq('When is a plain file the better choice?',
        [['Configuration, or a log you only ever append to', true],
          ['Any data under a million rows', false],
          ['When several people edit it', false],
          ['When relationships matter', false]],
        '"Use a database" is not automatically the mature answer, and the exceptions are worth naming.'),
    ],
    checkpoint: [
      mcq('Two people edit the same spreadsheet simultaneously. What happens, and how does a database differ?',
        [['You get two divergent copies; a database arbitrates concurrent writes', true],
          ['The spreadsheet merges them', false],
          ['No difference', false],
          ['The database also produces two copies', false]],
        'Concurrency is one of the things you cannot add to a file approach afterwards without effectively writing a database.'),
      mcq('What does a transaction guarantee?',
        [['Several changes all happen, or none of them do', true],
          ['Changes are fast', false],
          ['Changes are logged', false],
          ['Only one user can write', false]],
        'The half-completed transfer is the standard example, and the standard disaster when a file rewrite crashes midway.'),
    ],
  },
  {
    unitCode: 'T_SQL_TABLES_ROWS_COLUMNS',
    notes: `A relational database stores data in tables. A table is a grid, and the vocabulary is
worth getting exactly right because everything later depends on it.

    students
    +----+--------+-------+----------------+
    | id | name   | year  | email          |
    +----+--------+-------+----------------+
    |  1 | Asha   |     1 | asha@x.edu     |
    |  2 | Ravi   |     2 | ravi@x.edu     |
    +----+--------+-------+----------------+

- A **column** is an attribute — the same kind of thing for every row, with one declared type.
- A **row** is one *fact*: everything the table records about one student.
- A **table** is a set of rows of the same shape.

**"A row is one fact" is the design rule**, and it is the one that prevents most bad schemas.
If a row is trying to record two things, it wants to be two rows, or two tables.

The classic failure:

    | id | name | subject1 | mark1 | subject2 | mark2 |

This looks reasonable and is not. What happens with a third subject? Every query that mentions
subjects has to mention all of them. Finding "everybody who took Physics" requires checking
every subject column. The shape of the data has been fixed by the table rather than the reality.

The relational answer is a second table:

    marks
    +------------+---------+------+
    | student_id | subject | mark |
    +------------+---------+------+
    |          1 | Physics |   82 |
    |          1 | Maths   |   74 |
    +------------+---------+------+

Now a student can have any number of marks, and "everybody who took Physics" is one condition.

**Types are declared and enforced.** INTEGER, TEXT/VARCHAR, DATE, BOOLEAN, DECIMAL. Use DECIMAL
for money — floating point cannot represent 0.1 exactly, which is the same fact as
\`0.1 + 0.2 != 0.3\`, and it is not acceptable in a financial column.

**NULL means unknown, not empty and not zero.** A student with no recorded email has NULL, not
\`""\`. The distinction matters enormously in a WHERE clause and has its own unit.

**Order is not a property of a table.** Rows come back in whatever order is convenient unless
you ask for one. A query that appears sorted is telling you about today's storage, not about a
guarantee.`,
    mcqs: [
      mcq('What does one row represent?',
        [['One fact — everything the table records about a single thing', true],
          ['One column value', false],
          ['One query result', false],
          ['One user', false]],
        'The design rule that prevents most bad schemas: a row trying to record two things wants to be two rows or two tables.'),
      mcq('What is wrong with columns `subject1, mark1, subject2, mark2`?',
        [['The number of subjects is fixed by the table, and queries must mention every column', true],
          ['It uses too much space', false],
          ['Column names cannot contain digits', false],
          ['Nothing', false]],
        'A third subject means a schema change and rewriting every query. A second table lets a student have any number of marks.'),
      mcq('Which type should money use?',
        [['DECIMAL — floating point cannot represent 0.1 exactly', true],
          ['FLOAT', false], ['INTEGER', false], ['TEXT', false]],
        'The same fact as 0.1 + 0.2 not equalling 0.3, and it is not acceptable in a financial column.'),
      mcq('Rows come back in a consistent order without ORDER BY. What can you conclude?',
        [['Nothing — order is not guaranteed and may change at any time', true],
          ['The table is sorted', false],
          ['Insert order is preserved', false],
          ['The primary key orders it', false]],
        'It is telling you about today\'s storage rather than about a guarantee, which is why relying on it breaks later without a code change.'),
    ],
    checkpoint: [
      mcq('A student may have many marks. How should this be modelled?',
        [['A separate marks table with one row per mark, referencing the student', true],
          ['Repeated columns on the students table', false],
          ['A comma-separated list in one column', false],
          ['One table per student', false]],
        'One row per fact. Both alternatives fix the number of marks or make querying them impossible.'),
      mcq('NULL in an email column means:',
        [['Unknown — no email has been recorded', true],
          ['An empty string', false],
          ['Zero', false],
          ['An invalid address', false]],
        'Unknown rather than empty, and that distinction changes how it behaves in every comparison.'),
    ],
  },
  {
    unitCode: 'T_SQL_KEYS',
    notes: `Keys are how rows are identified and how tables refer to each other. They are the
mechanism behind the "relational" in relational database.

**A primary key identifies a row uniquely.**

    CREATE TABLE students (
      id    INTEGER PRIMARY KEY,
      name  TEXT NOT NULL,
      email TEXT UNIQUE
    );

Properties: unique, never NULL, and it should never change. That last one is why \`email\` is a
poor primary key even though it is unique — people change their email, and every row anywhere
pointing at the old one is then wrong.

**Natural versus surrogate keys.** A natural key is real data that happens to be unique — a roll
number, an ISBN. A surrogate key is a meaningless number the database generates. Surrogate keys
are usually preferred precisely *because* they are meaningless: nothing about the world can
change and invalidate them.

**A foreign key points at another table's primary key.**

    CREATE TABLE marks (
      id         INTEGER PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id),
      subject    TEXT NOT NULL,
      mark       INTEGER
    );

**The guarantee this buys** is the whole point: the database will refuse to insert a mark for
student 99 if no such student exists, and refuse to delete a student who still has marks. That
refusal is a feature. Without it you accumulate rows pointing at nothing, and you discover them
when a report shows a blank name.

**What happens on delete** is something you choose:

- \`ON DELETE RESTRICT\` — refuse while children exist. The safe default.
- \`ON DELETE CASCADE\` — delete the children too. Right for genuinely owned data, dangerous
  otherwise.
- \`ON DELETE SET NULL\` — keep the row, forget the reference.

Choosing CASCADE without thinking is how one deletion removes far more than anybody intended.

**Keys and indexes are different things** that get confused. A primary key gets an index
automatically because uniqueness has to be checked. A foreign key usually does **not** in MySQL
and PostgreSQL, and an unindexed foreign key is a very common cause of a join that was fast in
development and is slow in production.`,
    mcqs: [
      mcq('Why is email a poor primary key even when unique?',
        [['It can change, and everything referencing the old value becomes wrong', true],
          ['It is too long', false],
          ['It is not unique', false],
          ['Text keys are not allowed', false]],
        'A primary key should be stable as well as unique, which is the main argument for meaningless surrogate keys.'),
      mcq('What does a foreign key constraint prevent?',
        [['Inserting a row that references a non-existent parent, and deleting a parent with children', true],
          ['Duplicate values', false],
          ['NULL values', false],
          ['Slow queries', false]],
        'Both halves matter. The refusal is the feature — without it you accumulate rows pointing at nothing.'),
      mcq('`ON DELETE CASCADE` is dangerous when:',
        [['The child rows are not genuinely owned by the parent', true],
          ['The table is large', false],
          ['There is no index', false],
          ['It is never dangerous', false]],
        'Choosing it without thinking is how one deletion removes far more than anybody intended.'),
      mcq('A join on a foreign key is slow in production and was fast in development. Likely cause?',
        [['The foreign key has no index — most databases do not create one automatically', true],
          ['The constraint is missing', false],
          ['Too many columns', false],
          ['The key is a surrogate', false]],
        'Primary keys are indexed automatically because uniqueness must be checked; foreign keys generally are not.'),
    ],
    checkpoint: [
      mcq('Which is the better primary key for a students table?',
        [['A generated id, because nothing in the world can invalidate it', true],
          ['Email', false], ['Full name', false], ['Phone number', false]],
        'All three alternatives are real data that can change or turn out not to be unique.'),
      mcq('A deletion is refused because child rows exist. What is happening?',
        [['A foreign key with RESTRICT is protecting referential integrity', true],
          ['The table is locked', false],
          ['A permission problem', false],
          ['A bug', false]],
        'The database is preventing orphans. The fix is to decide deliberately what should happen to the children.'),
    ],
  },
  {
    unitCode: 'T_SQL_SELECT',
    notes: `\`SELECT\` asks for data. It is the statement you will write most, and the habits you form
here persist.

    SELECT name, email FROM students;
    SELECT * FROM students;

**Name your columns rather than using \`*\`.** \`*\` is convenient at the prompt and a liability in
anything saved:

- Adding a column silently changes what your query returns
- Your code receives columns it was not written for
- You transfer data you do not need, which matters on a wide table
- The query no longer documents what it depends on

**Aliases make the output readable:**

    SELECT name AS student_name, year AS study_year FROM students;

**Expressions are allowed in the select list:**

    SELECT name, mark, mark * 1.1 AS scaled FROM marks;
    SELECT first_name || ' ' || last_name AS full_name FROM students;

**\`DISTINCT\` removes duplicate ROWS, not duplicate values in a column:**

    SELECT DISTINCT year FROM students;             -- distinct years
    SELECT DISTINCT year, course FROM students;     -- distinct PAIRS

The second returns a year more than once when it appears with different courses. Expecting
otherwise is a common surprise.

**Reading order is not execution order**, and knowing this explains several error messages:

    written:  SELECT ... FROM ... WHERE ... GROUP BY ... HAVING ... ORDER BY ...
    executed: FROM ... WHERE ... GROUP BY ... HAVING ... SELECT ... ORDER BY ...

\`SELECT\` runs almost last. That is why an alias defined in the select list cannot be used in
\`WHERE\` — the alias does not exist yet when \`WHERE\` runs — but *can* be used in \`ORDER BY\`,
which runs after. This one fact resolves a whole family of confusing errors.`,
    mcqs: [
      mcq('Why avoid `SELECT *` in saved queries?',
        [['Adding a column silently changes the result, and the query stops documenting its dependencies', true],
          ['It is slower to parse', false],
          ['It is invalid SQL', false],
          ['It does not work with joins', false]],
        'Convenient at the prompt and a liability in anything that runs again later, especially inside application code.'),
      mcq('`SELECT DISTINCT year, course` returns:',
        [['Distinct PAIRS, so a year can appear more than once', true],
          ['Distinct years only', false],
          ['Distinct courses only', false],
          ['An error', false]],
        'DISTINCT applies to the whole row of the select list, which is a frequent surprise.'),
      mcq('Why can an alias be used in ORDER BY but not in WHERE?',
        [['WHERE runs before SELECT, so the alias does not exist yet; ORDER BY runs after', true],
          ['Aliases only work on sorting', false],
          ['It is an arbitrary rule', false],
          ['WHERE does not support aliases by design', false]],
        'Reading order is not execution order, and this one fact resolves a whole family of confusing errors.'),
      mcq('Which is valid in a select list?',
        [['`mark * 1.1 AS scaled`', true],
          ['`WHERE mark > 50`', false],
          ['`GROUP mark`', false],
          ['`ORDER mark`', false]],
        'Expressions and aliases belong in the select list; the others are separate clauses.'),
    ],
    checkpoint: [
      mcq('You add a column to a table and application code breaks. Likely cause?',
        [['The code used SELECT * and received a column it was not written for', true],
          ['The table needs reindexing', false],
          ['A constraint was violated', false],
          ['The alias changed', false]],
        'Precisely the failure mode that naming columns prevents, and it appears long after the query was written.'),
      mcq('Which clause executes FIRST?',
        [['FROM', true], ['SELECT', false], ['ORDER BY', false], ['WHERE', false]],
        'The source must be established before anything can be filtered from it, which is why SELECT running late makes sense.'),
    ],
  },
  {
    unitCode: 'T_SQL_WHERE',
    notes: `\`WHERE\` filters rows. Most of it is what you would expect from any programming language,
and one part of it is not.

    SELECT name FROM students WHERE year = 1;
    SELECT name FROM students WHERE year >= 2 AND course = 'CSE';
    SELECT name FROM students WHERE year IN (1, 2);
    SELECT name FROM students WHERE name LIKE 'A%';
    SELECT name FROM students WHERE mark BETWEEN 40 AND 60;

\`=\` is comparison here — SQL has no assignment in a query, so there is no \`==\`. Strings use
single quotes. \`LIKE\` patterns use \`%\` for any sequence and \`_\` for one character.

**Now the part that is genuinely different: NULL.**

NULL means *unknown*. So any comparison with it is unknown, not false:

    WHERE email = NULL        -- matches NOTHING, even rows that have NULL
    WHERE email != NULL       -- also matches nothing
    WHERE email IS NULL       -- correct
    WHERE email IS NOT NULL   -- correct

**Why \`= NULL\` matches nothing.** "Is this unknown value equal to that unknown value?" cannot be
answered yes, so SQL answers *unknown*, and WHERE keeps only rows where the condition is
definitely true. This is three-valued logic — true, false, unknown — and it is the single
biggest difference between SQL conditions and the ones you have written before.

**The consequence that bites hardest:**

    SELECT name FROM students WHERE year != 1;

This EXCLUDES students whose year is NULL. They are not year 1, but SQL cannot confirm they are
not, so they are left out. Most people expect "everybody except year 1" and get something
smaller, with no warning.

The fix, when you mean it:

    WHERE year != 1 OR year IS NULL

**NULL in arithmetic propagates.** \`mark + 5\` is NULL when \`mark\` is NULL. \`COALESCE(mark, 0)\`
substitutes a value.

**Filter early.** WHERE runs before grouping and before SELECT, so it is the cheapest place to
reduce the rows under consideration.`,
    workedExample: `**Goal: find every student who has not passed, and discover why the first three attempts are wrong.**

    students
    | id | name  | mark |
    |  1 | Asha  |   82 |
    |  2 | Ravi  |   31 |
    |  3 | Meera | NULL |     -- not yet marked
    |  4 | Dev   |   45 |

Pass mark is 40.

**Attempt 1:**

    SELECT name FROM students WHERE mark < 40;
    -- Ravi

Correct as far as it goes. But Meera is missing, and whether she should be there depends on the
question: "has not passed" probably includes "has not been marked". The query answered a
narrower question than was asked.

**Attempt 2:**

    SELECT name FROM students WHERE mark < 40 OR mark = NULL;
    -- Ravi

No change, and no error. \`mark = NULL\` is unknown for every row including Meera's, so it
contributes nothing. This is the trap: it looks like it handles the case and does not.

**Attempt 3:**

    SELECT name FROM students WHERE NOT (mark >= 40);
    -- Ravi

Still no Meera. \`NULL >= 40\` is unknown; \`NOT unknown\` is still unknown; WHERE keeps only
definitely-true. Negation does not rescue you from three-valued logic.

**Correct:**

    SELECT name FROM students WHERE mark < 40 OR mark IS NULL;
    -- Ravi, Meera

**And the one that catches people in reports:**

    SELECT name FROM students WHERE mark != 82;
    -- Ravi, Dev

Meera is absent again. She is not 82, but SQL cannot confirm it. A report of "everybody except
the top scorer" quietly loses every unmarked student, and the total will not add up — which is
usually how anybody notices.

**The habit:** whenever a column is nullable and you write \`!=\` or \`NOT\`, ask what should happen
to the NULLs, and say so explicitly.`,
    mcqs: [
      mcq('`WHERE email = NULL` matches:',
        [['No rows at all, even those where email is NULL', true],
          ['Rows where email is NULL', false],
          ['Rows where email is empty', false],
          ['All rows', false]],
        'Comparing to an unknown yields unknown, and WHERE keeps only definitely-true. `IS NULL` is the test.'),
      mcq('`WHERE year != 1` on a table with NULL years does what?',
        [['Excludes the NULL rows as well as the year-1 rows', true],
          ['Includes the NULL rows', false],
          ['Errors', false],
          ['Treats NULL as 0', false]],
        'They are not year 1, but SQL cannot confirm it. Most people expect "everybody except year 1" and get something smaller.'),
      mcq('`NOT (mark >= 40)` still misses NULL marks because:',
        [['NOT unknown is still unknown, and WHERE keeps only definitely-true', true],
          ['NOT does not work on numbers', false],
          ['The parentheses are wrong', false],
          ['It does include them', false]],
        'Three-valued logic. Negation does not rescue you from it, which is why the explicit IS NULL is needed.'),
      mcq('`mark + 5` where mark is NULL gives:',
        [['NULL — unknown propagates through arithmetic', true],
          ['5', false], ['0', false], ['An error', false]],
        'COALESCE(mark, 0) is how you substitute a value when that is what you mean.'),
    ],
    checkpoint: [
      mcq('A report of "all students except the top scorer" has a total that does not add up. Likely cause?',
        [['A `!=` comparison silently excluded rows with NULL in that column', true],
          ['A missing join', false],
          ['Wrong aggregate', false],
          ['A LIMIT clause', false]],
        'The totals not adding up is usually how anybody notices, long after the report was trusted.'),
      mcq('The habit that prevents NULL filtering bugs is:',
        [['Whenever a nullable column is used with != or NOT, decide explicitly what NULLs should do', true],
          ['Never use NULL columns', false],
          ['Always use COALESCE', false],
          ['Avoid NOT entirely', false]],
        'The decision has to be made anyway; the only question is whether it is made deliberately or by accident.'),
    ],
  },
  {
    unitCode: 'T_SQL_ORDER_AND_LIMIT',
    notes: `\`ORDER BY\` sorts the result. \`LIMIT\` takes only the first few. Together they answer
"the top N", which is one of the commonest things anybody asks of data.

    SELECT name, mark FROM marks ORDER BY mark DESC;
    SELECT name, mark FROM marks ORDER BY mark DESC LIMIT 10;
    SELECT name FROM students ORDER BY year, name;          -- year, then name within year
    SELECT name FROM students ORDER BY year DESC, name ASC;

\`ASC\` is the default. Multiple columns sort by the first, then break ties with the second.

**A query without ORDER BY has no order.** This is worth stating flatly because it causes real
bugs. The rows arrive in whatever sequence was convenient, and that can change when the data
grows, an index is added, or the query plan changes. A result that "has always come back sorted"
is not a guarantee and will eventually stop.

**Which makes \`LIMIT\` without \`ORDER BY\` meaningless.**

    SELECT * FROM students LIMIT 10;     -- ten arbitrary students

Not the first ten, not the newest ten — ten unspecified rows, possibly different next time.
\`LIMIT\` only means something once the order is defined.

**Pagination**, and the trap in it:

    SELECT name FROM students ORDER BY id LIMIT 20 OFFSET 40;    -- page 3

Two things to know. First, the ORDER BY must be **deterministic** — if it is on a column with
ties, rows can appear on two pages or none as the tie is broken differently each time. Add a
unique tiebreaker: \`ORDER BY created_at, id\`.

Second, large OFFSETs are slow, because the database must produce and discard every skipped row.
\`OFFSET 100000\` does the work of a hundred thousand rows to return twenty. For deep pagination,
"where id > the last id I saw" is the scalable pattern.

**ORDER BY can use a select-list alias**, unlike WHERE, because it runs after SELECT:

    SELECT mark * 1.1 AS scaled FROM marks ORDER BY scaled DESC;

**NULLs sort together**, at one end or the other depending on the database. If it matters, say
so explicitly rather than relying on the default.`,
    mcqs: [
      mcq('`SELECT * FROM students LIMIT 10` returns:',
        [['Ten arbitrary rows, possibly different each time', true],
          ['The first ten inserted', false],
          ['The ten lowest ids', false],
          ['The ten most recent', false]],
        'LIMIT only means something once an order is defined. Without ORDER BY there is no first.'),
      mcq('Paginating with `ORDER BY created_at` where ties exist causes:',
        [['Rows appearing on two pages or none, as ties break differently between queries', true],
          ['An error', false],
          ['Slower queries only', false],
          ['Duplicate rows in one page', false]],
        'A unique tiebreaker such as `ORDER BY created_at, id` makes the order deterministic and the pagination stable.'),
      mcq('Why is `OFFSET 100000` slow?',
        [['The database must produce and discard every skipped row', true],
          ['It locks the table', false],
          ['It disables indexes', false],
          ['It is not slow', false]],
        'Which is why deep pagination uses "where id > the last id I saw" instead of counting from the start each time.'),
      mcq('An alias can be used in ORDER BY but not WHERE because:',
        [['ORDER BY runs after SELECT, where the alias is created', true],
          ['ORDER BY is more permissive by design', false],
          ['Aliases are only for sorting', false],
          ['It cannot be used in either', false]],
        'The same execution-order fact that explains the WHERE restriction, seen from the other side.'),
    ],
    checkpoint: [
      mcq('A query has always returned rows in a useful order and suddenly does not. Likely cause?',
        [['There was no ORDER BY, and the plan or the data changed', true],
          ['The table was corrupted', false],
          ['A new constraint', false],
          ['The client changed', false]],
        'The order was never a guarantee. It survived until an index was added or the table grew.'),
      mcq('Which gives the top 5 marks reliably?',
        [['`ORDER BY mark DESC LIMIT 5`', true],
          ['`LIMIT 5`', false],
          ['`ORDER BY mark LIMIT 5`', false],
          ['`WHERE mark > 80 LIMIT 5`', false]],
        'The third returns the five LOWEST, since ASC is the default — an easy and silent mistake.'),
    ],
  },
  {
    unitCode: 'T_SQL_AGGREGATES',
    notes: `Aggregate functions collapse many rows into one value.

    SELECT COUNT(*) FROM students;
    SELECT AVG(mark) FROM marks;
    SELECT MIN(mark), MAX(mark), SUM(mark) FROM marks;

**\`COUNT(*)\` and \`COUNT(column)\` are different**, and the difference is NULL:

    COUNT(*)        -- every row
    COUNT(email)    -- rows where email IS NOT NULL
    COUNT(DISTINCT year)  -- distinct non-null values

So \`COUNT(*)\` and \`COUNT(email)\` differ by exactly the number of missing emails, which is
occasionally a useful way to count them.

**Every aggregate except \`COUNT(*)\` ignores NULL**, and this is where averages go wrong:

    | mark |
    |   80 |
    |   40 |
    | NULL |

\`AVG(mark)\` is 60, not 40. It sums 120 and divides by **2**, not 3 — the NULL row is not
counted at all. If an unmarked student should count as zero, you must say so:
\`AVG(COALESCE(mark, 0))\` gives 40.

Neither is wrong; they answer different questions. The bug is not knowing which one you asked.

**\`AVG\` on an empty set is NULL, not 0.** Code that displays the result must handle it, and
\`COALESCE(AVG(mark), 0)\` is the usual fix.

**You cannot mix an aggregate with a plain column** without grouping:

    SELECT name, AVG(mark) FROM marks;     -- error, or nonsense

The aggregate collapses everything to one row; \`name\` has many values and no rule for choosing.
Some databases reject it, and MySQL historically returned an arbitrary name — which is worse,
because it looks like an answer. Grouping is the next unit and it is what makes this query
meaningful.

**Aggregates cannot appear in WHERE**, because WHERE runs before grouping:

    WHERE AVG(mark) > 50      -- error
    HAVING AVG(mark) > 50     -- correct`,
    mcqs: [
      mcq('`AVG` of 80, 40 and NULL is:',
        [['60 — NULL is excluded from both the sum and the count', true],
          ['40', false], ['120', false], ['NULL', false]],
        'It divides by 2 rather than 3. If an unmarked student should count as zero, COALESCE says so explicitly.'),
      mcq('`COUNT(*)` minus `COUNT(email)` equals:',
        [['The number of rows where email is NULL', true],
          ['Zero always', false],
          ['The number of distinct emails', false],
          ['An error', false]],
        'A useful side effect of the difference, and a quick way to count missing values.'),
      mcq('`AVG(mark)` over zero rows returns:',
        [['NULL', true], ['0', false], ['An error', false], ['An empty string', false]],
        'Which is why display code needs COALESCE(AVG(mark), 0) or an explicit check for no data.'),
      mcq('`SELECT name, AVG(mark) FROM marks` without GROUP BY is:',
        [['Meaningless — the aggregate is one row and name has many values', true],
          ['Valid and useful', false],
          ['Valid but slow', false],
          ['The same as with GROUP BY', false]],
        'MySQL historically returned an arbitrary name, which is worse than an error because it looks like an answer.'),
    ],
    checkpoint: [
      mcq('Why can an aggregate not appear in WHERE?',
        [['WHERE runs before grouping, so the aggregate does not exist yet', true],
          ['Aggregates are too slow', false],
          ['It is an arbitrary restriction', false],
          ['It can', false]],
        'HAVING exists for exactly this, and it is the same execution-order fact that governs aliases.'),
      mcq('An average is higher than expected on data with missing values. Likely cause?',
        [['NULLs were excluded from the divisor rather than counted as zero', true],
          ['Rounding', false],
          ['The wrong column', false],
          ['Duplicate rows', false]],
        'Both behaviours are defensible; the bug is not knowing which question you asked.'),
    ],
  },
  {
    unitCode: 'T_SQL_GROUP_BY',
    notes: `\`GROUP BY\` collapses rows into one row per group, so aggregates can be computed per
category rather than over everything.

    SELECT subject, AVG(mark) AS avg_mark
    FROM marks
    GROUP BY subject;

One row per subject, with that subject's average.

**The rule for the select list:** every column must either appear in the \`GROUP BY\` or be inside
an aggregate. Anything else has many values per group and no rule for choosing one.

    SELECT subject, student_id, AVG(mark) FROM marks GROUP BY subject;   -- wrong

**Grouping by several columns** groups by the combination:

    SELECT subject, year, COUNT(*) FROM marks GROUP BY subject, year;

**Now the distinction that matters most in this unit: HAVING versus WHERE.**

    SELECT subject, AVG(mark) AS avg_mark
    FROM marks
    WHERE mark IS NOT NULL          -- filters ROWS, before grouping
    GROUP BY subject
    HAVING AVG(mark) > 50           -- filters GROUPS, after aggregating
    ORDER BY avg_mark DESC;

- **WHERE** removes rows before any grouping happens. It cannot see aggregates.
- **HAVING** removes whole groups after aggregation. It can.

They are not interchangeable and they produce different answers:

    WHERE mark > 50 ... GROUP BY subject     -- average of the marks above 50
    GROUP BY subject ... HAVING AVG(mark) > 50   -- subjects whose overall average exceeds 50

The first discards low marks and then averages what is left, so almost every subject qualifies
and the averages are inflated. The second keeps every mark and asks which subjects average
above 50. Both are valid queries; only one answers "which subjects are performing well".

**Prefer WHERE when you can.** Filtering rows before grouping means fewer rows to group, so it
is cheaper. Use HAVING only for conditions that genuinely need the aggregate.

**Groups with no rows do not appear.** A subject nobody took produces no row at all, rather than
a row with zero — which is why "every subject and its count" needs a join from the subjects
table rather than a GROUP BY over marks.`,
    workedExample: `**Goal: which subjects are performing poorly — and three queries that answer different questions.**

    marks
    | student | subject | mark |
    | 1       | Physics |   82 |
    | 2       | Physics |   30 |
    | 3       | Physics |   35 |
    | 4       | Maths   |   90 |
    | 5       | Maths   |   88 |

**Question: which subjects have an average below 50?**

    SELECT subject, AVG(mark) AS avg_mark
    FROM marks
    GROUP BY subject
    HAVING AVG(mark) < 50;

Physics: (82+30+35)/3 = 49. Maths: 89. Result: **Physics**. Correct.

**Now the common mistake:**

    SELECT subject, AVG(mark) AS avg_mark
    FROM marks
    WHERE mark < 50
    GROUP BY subject;

Read what this does. WHERE removes every mark of 50 or more *first*, so Physics is left with 30
and 35, averaging 32.5 — and Maths disappears entirely, having no marks below 50.

    Physics | 32.5

It returns Physics, which looks like the same answer. But the 32.5 is the average of the failing
marks, not the subject's average, and Maths vanished rather than being excluded on merit. Give
Maths one low mark and it will appear in this list as a poorly-performing subject while
averaging 70.

**The third variant, which is legitimate and different again:**

    SELECT subject, AVG(mark) AS avg_mark
    FROM marks
    WHERE mark IS NOT NULL
    GROUP BY subject
    HAVING AVG(mark) < 50;

Here WHERE removes rows that are not data at all — unmarked entries — and HAVING does the
filtering that answers the question. **This is the right shape: WHERE for "which rows count",
HAVING for "which groups qualify".**

**The test to apply:** does your condition concern one row, or a whole group? One row is WHERE.
A group is HAVING. Getting this wrong produces a plausible number, which is the dangerous kind
of wrong.`,
    mcqs: [
      mcq('WHERE and HAVING differ how?',
        [['WHERE filters rows before grouping; HAVING filters groups after aggregating', true],
          ['They are interchangeable', false],
          ['HAVING is faster', false],
          ['WHERE cannot be used with GROUP BY', false]],
        'The order is the whole distinction, and it is why only HAVING can see an aggregate.'),
      mcq('`WHERE mark < 50 GROUP BY subject` computes:',
        [['The average of the failing marks only, and drops subjects with none', true],
          ['The average per subject', false],
          ['Subjects averaging below 50', false],
          ['The same as HAVING AVG(mark) < 50', false]],
        'It looks like the same answer on small data and diverges completely the moment a strong subject has one low mark.'),
      mcq('Which columns may appear in the select list with GROUP BY?',
        [['Those in the GROUP BY, and aggregates', true],
          ['Any column', false],
          ['Only aggregates', false],
          ['Only the grouped column', false]],
        'Anything else has many values per group and no rule for choosing one.'),
      mcq('Why prefer WHERE over HAVING when both would work?',
        [['Filtering before grouping means fewer rows to group, so it is cheaper', true],
          ['HAVING is deprecated', false],
          ['WHERE is more readable', false],
          ['They cost the same', false]],
        'Use HAVING only for conditions that genuinely need the aggregate.'),
    ],
    checkpoint: [
      mcq('"Students who have taken more than 3 subjects" needs which clause?',
        [['HAVING COUNT(*) > 3 — the condition is about a group', true],
          ['WHERE COUNT(*) > 3', false],
          ['WHERE subject_count > 3', false],
          ['ORDER BY COUNT(*)', false]],
        'The test: does the condition concern one row or a whole group? A count is a group property.'),
      mcq('A subject nobody has taken does not appear in a GROUP BY over marks. Why?',
        [['There are no rows to group, so no group exists', true],
          ['It is filtered by HAVING', false],
          ['It appears with a zero', false],
          ['A NULL problem', false]],
        'Which is why "every subject and its count" needs a join from the subjects table rather than grouping the marks.'),
    ],
  },
  {
    unitCode: 'T_SQL_JOINS',
    notes: `A join combines rows from two tables using a matching rule. It is what makes the
relational model useful, and what people find hardest — usually because they think in terms of
"combining tables" rather than "which rows survive".

    SELECT s.name, m.subject, m.mark
    FROM students s
    JOIN marks m ON s.id = m.student_id;

**Think in rows, not tables.** The join produces one output row for every PAIR that satisfies
the condition. A student with three marks appears three times. That is not a bug — the result
is "student-mark facts", and each is a separate fact.

**INNER JOIN keeps only matching pairs.** A student with no marks disappears entirely. A mark
whose student was deleted disappears too. \`JOIN\` alone means \`INNER JOIN\`.

**LEFT JOIN keeps every row from the left table**, filling NULL where nothing matched:

    SELECT s.name, m.mark
    FROM students s
    LEFT JOIN marks m ON s.id = m.student_id;

A student with no marks appears once, with NULL for \`mark\`. **The question decides the join:**
"marks with student names" is inner; "all students and their marks if any" is left.

**The classic LEFT JOIN mistake**, which turns it back into an inner join:

    SELECT s.name FROM students s
    LEFT JOIN marks m ON s.id = m.student_id
    WHERE m.mark > 50;

The rows with no match have \`m.mark\` NULL, \`NULL > 50\` is unknown, and WHERE drops them. The
LEFT JOIN has been undone. The fix is to put the condition in the join:

    LEFT JOIN marks m ON s.id = m.student_id AND m.mark > 50

**ON versus WHERE for an inner join makes no difference; for a LEFT JOIN it changes everything.**
\`ON\` decides what counts as a match; \`WHERE\` filters the result after the join. That sentence
is the whole of this trap.

**Finding rows with no match** is the idiom worth memorising:

    SELECT s.name FROM students s
    LEFT JOIN marks m ON s.id = m.student_id
    WHERE m.id IS NULL;                      -- students with no marks at all

**Always qualify columns** with a table alias in a join. \`id\` is ambiguous when both tables have
one, and \`s.id\` versus \`m.id\` is also how you keep track of which you meant.

**Joining on the wrong column produces a huge wrong result rather than an error.** If the row
count explodes, check the join condition first.`,
    mcqs: [
      mcq('A student with three marks appears how many times in an inner join?',
        [['Three — one row per matching pair', true],
          ['Once', false], ['Once per table', false], ['It depends on the order', false]],
        'Thinking in rows rather than tables is what makes this obvious rather than surprising.'),
      mcq('`LEFT JOIN ... WHERE m.mark > 50` behaves how?',
        [['As an inner join — NULL > 50 is unknown, so unmatched rows are dropped', true],
          ['As a left join', false],
          ['Raises an error', false],
          ['Returns only unmatched rows', false]],
        'The fix is to move the condition into ON, which decides what counts as a match rather than filtering afterwards.'),
      mcq('Which finds students with no marks at all?',
        [['LEFT JOIN marks, then WHERE m.id IS NULL', true],
          ['INNER JOIN with WHERE mark IS NULL', false],
          ['WHERE NOT EXISTS marks', false],
          ['RIGHT JOIN students', false]],
        'The anti-join idiom, and worth memorising because the alternatives are far less obvious to read.'),
      mcq('A join returns far more rows than either table holds. Check what first?',
        [['The join condition — likely joining on the wrong column', true],
          ['Indexes', false], ['The WHERE clause', false], ['Row limits', false]],
        'A wrong join condition produces a huge wrong result rather than an error, so row count is the symptom to watch.'),
    ],
    checkpoint: [
      mcq('"All students and their marks if any" needs:',
        [['LEFT JOIN', true], ['INNER JOIN', false], ['CROSS JOIN', false], ['A subquery', false]],
        '"If any" is the phrase that signals it. Inner would silently drop students with no marks.'),
      mcq('For an INNER JOIN, does a condition in ON or WHERE differ?',
        [['No — but for a LEFT JOIN it changes everything', true],
          ['Yes, ON is always faster', false],
          ['Yes, WHERE is required', false],
          ['They always differ', false]],
        'Which is exactly why the LEFT JOIN trap catches people who learned the habit on inner joins.'),
    ],
  },
  {
    unitCode: 'T_SQL_INSERT_UPDATE_DELETE',
    notes: `Reading data is safe. Writing it is not, and the difference in care required is larger
than the difference in syntax.

**INSERT:**

    INSERT INTO students (name, year, email)
    VALUES ('Asha', 1, 'asha@x.edu');

    INSERT INTO students (name, year) VALUES ('Ravi', 2), ('Meera', 1);

**Always name the columns.** Without the list you depend on column order, so adding a column
breaks every insert in your codebase — silently, if the types happen to line up.

**UPDATE — and the WHERE clause you must never forget:**

    UPDATE students SET year = 2 WHERE id = 5;

    UPDATE students SET year = 2;            -- EVERY STUDENT. No warning.

This is the most destructive ordinary mistake in SQL. It is valid, it runs, and it reports how
many rows it changed — which is the first sign anything is wrong, and by then it has happened.

**The habit that prevents it:** write the WHERE first, as a SELECT.

    SELECT * FROM students WHERE id = 5;     -- check it is what you meant
    UPDATE students SET year = 2 WHERE id = 5;

Run the SELECT, look at the rows, then change \`SELECT *\` into \`UPDATE ... SET\`. You will never
run an unfiltered UPDATE if the WHERE exists before the UPDATE does.

**DELETE, same shape and same danger:**

    DELETE FROM students WHERE id = 5;
    DELETE FROM students;                    -- empties the table

**Transactions make a mistake recoverable:**

    BEGIN;
    UPDATE students SET year = 2 WHERE id = 5;
    SELECT * FROM students WHERE id = 5;     -- verify
    COMMIT;                                  -- or ROLLBACK to undo

Inside a transaction nothing is permanent until COMMIT. For any change you are not certain
about, this converts a disaster into a decision.

**\`ROLLBACK\` only helps before \`COMMIT\`.** Afterwards, recovery means a backup.

**Two more habits worth having:** run destructive statements against a copy first when you can,
and make sure your UPDATE's WHERE uses a key rather than a value that might match more rows than
you think.`,
    mcqs: [
      mcq('`UPDATE students SET year = 2;` does what?',
        [['Sets every student to year 2 — valid, immediate, and usually a disaster', true],
          ['Raises an error', false],
          ['Updates nothing', false],
          ['Updates the first row', false]],
        'The row count it reports is usually the first sign anything is wrong, and by then it has happened.'),
      mcq('The habit that prevents an unfiltered UPDATE is:',
        [['Write the WHERE as a SELECT first, check it, then convert it to an UPDATE', true],
          ['Always use transactions', false],
          ['Update one row at a time', false],
          ['Avoid UPDATE', false]],
        'Transactions help too, but this one makes the mistake structurally impossible rather than recoverable.'),
      mcq('Why name columns in an INSERT?',
        [['Otherwise it depends on column order, and adding a column breaks it silently', true],
          ['It is required', false],
          ['It is faster', false],
          ['To allow NULLs', false]],
        'Silently is the important word — if the types happen to line up, the data goes into the wrong columns.'),
      mcq('`ROLLBACK` after `COMMIT` does what?',
        [['Nothing — once committed, recovery means a backup', true],
          ['Undoes the transaction', false],
          ['Undoes the last statement', false],
          ['Raises an error', false]],
        'The window in which a transaction protects you closes at COMMIT, which is what makes the verify-before-commit step worth the keystrokes.'),
    ],
    checkpoint: [
      mcq('You must change one row and are not certain of the WHERE. Safest sequence?',
        [['BEGIN, update, SELECT to verify, then COMMIT or ROLLBACK', true],
          ['Update and check afterwards', false],
          ['Delete and re-insert', false],
          ['Update with LIMIT 1', false]],
        'It converts an irreversible mistake into a decision, which is the entire purpose of a transaction here.'),
      mcq('An UPDATE reports "42 rows affected" when you expected 1. What has happened?',
        [['The WHERE matched more rows than intended — check before committing', true],
          ['A database error', false],
          ['Normal behaviour', false],
          ['A trigger fired', false]],
        'Inside a transaction this is still recoverable. Outside one it is already done.'),
    ],
  },
  {
    unitCode: 'T_SQL_DEBUGGING',
    notes: `"The query returns nothing" has a small number of causes. Check them in this order and
you will find it faster than by staring at the SQL.

**1. Is there any data at all?**

    SELECT COUNT(*) FROM students;

Obvious and skipped constantly. An empty table, or the wrong database entirely, accounts for a
surprising share of empty results.

**2. Remove the WHERE clause.**

    SELECT * FROM students LIMIT 5;

If this returns rows and the filtered version does not, the filter is the problem. You have
halved the search space in one query.

**3. Then suspect NULL.** A \`!=\` or \`NOT\` against a nullable column silently excludes the NULL
rows. This is the single commonest cause of "rows I can see are missing".

    SELECT COUNT(*) FROM students WHERE email IS NULL;

**4. Then suspect the exact value.** Case and whitespace:

    WHERE name = 'asha'        -- may not match 'Asha'
    WHERE name = 'Asha '       -- trailing space, matches nothing

    SELECT DISTINCT name FROM students WHERE name LIKE 'As%';

Looking at what is actually stored settles it immediately.

**5. Then suspect the join.** An INNER JOIN drops rows with no match on either side. Change it
to a LEFT JOIN temporarily and see whether the rows reappear — if they do, the matching rule is
wrong or the related rows genuinely do not exist.

Also check for the LEFT-JOIN-undone pattern: a condition on the right-hand table sitting in
WHERE rather than in ON.

**6. Then suspect the grouping.** A HAVING clause removes whole groups, and it is easy to filter
away everything without noticing.

---

**When the result is WRONG rather than empty**, the causes differ:

- **Far too many rows** — a join condition that is wrong or missing. Compare the row count with
  the count of each table.
- **Numbers too high** — a join is duplicating rows before an aggregate. \`SUM\` over a join that
  multiplied the rows counts things twice. Aggregate first, then join, or use DISTINCT
  deliberately.
- **Averages surprising** — NULLs excluded from the divisor.
- **Order wrong** — no ORDER BY, or sorting text where you meant numbers.

**The general method** is the same as everywhere else: simplify until it works, then add back
one piece at a time. Start from \`SELECT * FROM one_table LIMIT 5\` and build up.`,
    mcqs: [
      mcq('A query returns nothing. What is the first check?',
        [['Whether the table has any rows at all', true],
          ['The join condition', false],
          ['NULL handling', false],
          ['The index', false]],
        'Obvious and constantly skipped. An empty table or the wrong database accounts for a surprising share of these.'),
      mcq('Rows you can see in the table are missing from a filtered result. Most likely cause?',
        [['A `!=` or NOT against a nullable column excluded the NULLs', true],
          ['A missing index', false],
          ['Wrong table', false],
          ['A LIMIT clause', false]],
        'The single commonest cause of this exact symptom, and it produces no error.'),
      mcq('A SUM over a join is roughly double what you expect. Likely cause?',
        [['The join duplicated rows before the aggregate ran', true],
          ['Wrong column type', false],
          ['Missing GROUP BY', false],
          ['NULLs counted as zero', false]],
        'A one-to-many join multiplies the rows, and summing afterwards counts the same value once per match.'),
      mcq('Converting an INNER JOIN to a LEFT JOIN temporarily tells you:',
        [['Whether rows are missing because of the match, or genuinely absent', true],
          ['Whether the index is used', false],
          ['Whether the data is stale', false],
          ['Nothing useful', false]],
        'A diagnostic rather than a fix — it separates "the matching rule is wrong" from "there is nothing to match".'),
    ],
    coding: [
      {
        title: 'Order the diagnostic checks',
        description: `A query returns no rows. Put the checks in the order that finds the cause fastest, printing one number per line.

1. Suspect NULL in the WHERE clause
2. Check the table has any rows at all
3. Remove the WHERE clause and see if rows appear
4. Check the join condition

Print four lines: the check to do first, then second, then third, then fourth.`,
        starter: `# Print four numbers, one per line.
`,
        language: 'python',
        tests: [
          { input: '', expectedOutput: '2\n3\n1\n4' },
        ],
      },
    ],
    checkpoint: [
      mcq('A join returns far more rows than either table contains. Check first:',
        [['The join condition — probably joining on the wrong column', true],
          ['The WHERE clause', false],
          ['Indexes', false],
          ['The GROUP BY', false]],
        'Comparing the result count against each table\'s count identifies this immediately.'),
      mcq('The general debugging method for SQL is:',
        [['Simplify until it works, then add one piece back at a time', true],
          ['Rewrite the query', false],
          ['Add indexes', false],
          ['Check the logs', false]],
        'The same method as a shell pipeline or a program, and it works for the same reason: it localises the fault.'),
    ],
  },
  {
    unitCode: 'T_SQL_PRACTICE',
    notes: `No new syntax. Everything here uses SELECT, WHERE, ORDER BY, LIMIT, aggregates,
GROUP BY, HAVING, joins and the write statements — against real questions about a real dataset.

**Why real questions.** "Write a query using GROUP BY" has done the hard part for you. The skill
is going from "which subjects are dragging the year average down" to SQL, and that translation
is what these problems train.

**The method, every time:**

1. **Look at the tables first.** \`SELECT * FROM table LIMIT 5\` for each. You cannot write a join
   without knowing what the columns are called and which one relates to which.
2. **Say the question in one sentence**, precisely. "Average mark per subject, for subjects with
   at least five marks, highest first." The sentence maps almost directly onto clauses.
3. **Build up.** Get the FROM and a bare SELECT working, then add WHERE, then GROUP BY, then
   HAVING, then ORDER BY. Run it at each step.
4. **Sanity-check the row count.** More rows than the base table usually means a join has
   multiplied them.

**The checklist before trusting a result:**

- Is any column here nullable, and did I use \`!=\` or \`NOT\` on it?
- Is my condition about a row (WHERE) or a group (HAVING)?
- Does my LEFT JOIN have a condition in WHERE that undoes it?
- Did I ORDER BY, if the order matters at all?
- Would this still be right if a student had no marks? If a subject had none?

**Estimate first.** "About 200 students, so at most 200 rows" — and if you get 800, a join is
duplicating. An estimate that disagrees with the result is nearly always the query being wrong
rather than your intuition.`,
    mcqs: [
      mcq('"Subjects with an average above 60, highest first" needs which clauses?',
        [['GROUP BY subject, HAVING AVG(mark) > 60, ORDER BY the average DESC', true],
          ['WHERE mark > 60, GROUP BY subject', false],
          ['GROUP BY subject, WHERE AVG(mark) > 60', false],
          ['ORDER BY mark DESC LIMIT', false]],
        'The second averages only the high marks; the third is invalid because WHERE cannot see an aggregate.'),
      mcq('"Students who have never submitted an assignment" is best written as:',
        [['LEFT JOIN assignments, then WHERE the assignment id IS NULL', true],
          ['INNER JOIN with WHERE submitted IS NULL', false],
          ['WHERE assignment_count = 0', false],
          ['GROUP BY student HAVING COUNT(*) = 0', false]],
        'Inner join cannot return them at all, and a group with no rows does not exist to be counted.'),
      mcq('Your result has 800 rows from a 200-row students table. Most likely:',
        [['A join is producing one row per match, multiplying the students', true],
          ['A missing LIMIT', false],
          ['Duplicate data', false],
          ['A wrong ORDER BY', false]],
        'Estimating the expected count first is what makes this visible rather than accepted.'),
      mcq('Before writing a join, the first step is:',
        [['Look at a few rows of each table to see the columns and how they relate', true],
          ['Decide inner or left', false],
          ['Write the WHERE', false],
          ['Check the indexes', false]],
        'You cannot write a join condition without knowing the column names, and guessing produces the empty result.'),
      mcq('A query is correct but returns rows in an unhelpful order. What is missing?',
        [['ORDER BY — without it there is no defined order', true],
          ['An index', false], ['DISTINCT', false], ['A GROUP BY', false]],
        'And if it currently looks sorted, that is today\'s storage rather than a guarantee.'),
    ],
    checkpoint: [
      mcq('The condition "the student has more than three marks" belongs in:',
        [['HAVING, because it is a property of a group', true],
          ['WHERE', false], ['ON', false], ['ORDER BY', false]],
        'The test is always: one row, or a whole group? A count is a group property.'),
      mcq('A LEFT JOIN result is missing the unmatched rows. What should you look for?',
        [['A condition on the right-hand table sitting in WHERE rather than ON', true],
          ['A missing index', false],
          ['Wrong join column', false],
          ['A LIMIT', false]],
        'NULL fails the WHERE test, so the left join is silently converted back to an inner one.'),
    ],
  },
  {
    unitCode: 'T_SQL_MINI_PROJECT',
    notes: `Design a small schema from a description, populate it, and answer real questions with
it. This is the first project where the **design** is assessed as heavily as the queries.

**Why design first.** Every SQL problem you have solved so far came with the tables already
made. In practice the schema is the decision that determines whether later questions are easy or
impossible — and a bad schema cannot be rescued by clever queries. Getting "one row is one fact"
right at the start is worth more than any amount of SQL technique afterwards.

**The method:**

1. **Find the nouns in the description.** Each distinct kind of thing is usually a table.
2. **Find the relationships.** One-to-many becomes a foreign key on the "many" side. Many-to-many
   needs a third table holding the two keys.
3. **Decide what identifies each row.** Prefer a generated id over real data that can change.
4. **Decide what may be NULL**, and mean it. NULL should say "unknown", never "not applicable" —
   if a column is only meaningful for some rows, that is usually a sign of two tables.
5. **Write the CREATE statements with constraints.** NOT NULL, UNIQUE and REFERENCES are the
   schema documenting and enforcing its own rules.
6. **Populate with enough data to be interesting** — including the awkward cases: a student with
   no marks, a subject nobody took, a NULL somewhere legitimate.
7. **Then write the queries.**

**Step 6 is the one people skip, and it is where the marks are.** Five tidy rows per table will
make every query appear to work. The empty cases are what reveal whether you used the right join
and handled NULL, and putting them in deliberately is how you find your own bugs before a marker
does.

The brief, acceptance criteria and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — Design a Schema and Answer Real Questions',
      description: `Design a small relational schema from a written description, populate it including the awkward cases, and answer a set of questions with SQL. The design and the awkward-case data are assessed as heavily as the queries.`,
      instructions: `**The description**

A college library lends books to students.

- Each **book** has a title, an author, an ISBN and a number of copies owned.
- Each **student** has a name, a roll number and an email. Email may be unknown.
- A **loan** records that a student borrowed a specific book on a date, and returned it on a
  date — or has not returned it yet.
- A student may borrow the same book more than once, at different times.
- Some books have never been borrowed. Some students have never borrowed anything.

**Part 1 — Schema**

Write the \`CREATE TABLE\` statements. You must include:

- A primary key on every table
- Foreign keys with an explicit \`ON DELETE\` choice
- \`NOT NULL\` where a value is genuinely required
- \`UNIQUE\` where appropriate
- Correct types, including for dates

**Part 2 — Data**

Insert enough rows to make the queries meaningful, and **deliberately include**:

- A student with no loans
- A book never borrowed
- A loan not yet returned
- A student with an unknown email
- A student who borrowed the same book twice

**Part 3 — Queries**

Write one query for each:

1. All books currently on loan, with the borrower's name.
2. Every student and how many loans they have taken — **including those with none**.
3. Books never borrowed.
4. Students with more than two loans.
5. The average number of days a returned book was kept.
6. For each book, copies owned minus copies currently out, as "available".
7. Students with an overdue loan (not returned, borrowed more than 14 days ago).

**What to submit**

1. A \`.sql\` file with the schema, the inserts and the seven queries, commented.
2. A **design note** (roughly 250-400 words):
   - Your tables and why each exists
   - How you modelled "borrowed the same book twice" and why
   - Which columns are nullable and what NULL means in each
   - Your ON DELETE choice for each foreign key, with the reason
3. **Query output** for all seven, from your own data.
4. A short note on **which queries needed a LEFT JOIN and why** an inner join would have been
   wrong.

**Constraints**

- No ORM, no application code. SQL only.
- No \`SELECT *\` in the seven queries.
- Every query must be correct on your awkward-case data, not only on the tidy rows.

**Where the marks are.** Queries 2, 3 and 6 are the ones the awkward cases break. If your data
does not contain a student with no loans and a book never borrowed, you have not tested them.`,
      rubric: [
        {
          criterion: 'Schema design',
          description: 'Tables match the nouns, one row is one fact, repeated borrowing modelled correctly. Keys, NOT NULL, UNIQUE and types all appropriate.',
          maxPoints: 25,
        },
        {
          criterion: 'Constraints and ON DELETE',
          description: 'Foreign keys present with an explicit and defensible ON DELETE choice per relationship, explained in the design note.',
          maxPoints: 15,
        },
        {
          criterion: 'Awkward-case data',
          description: 'All five required cases present in the inserted data, and the queries demonstrably correct against them.',
          maxPoints: 20,
        },
        {
          criterion: 'Queries',
          description: 'All seven correct, using LEFT JOIN where required, HAVING rather than WHERE for group conditions, and correct NULL handling.',
          maxPoints: 25,
        },
        {
          criterion: 'Design note',
          description: 'Explains the modelling decisions and what NULL means per column, rather than describing the tables. Identifies which queries needed a LEFT JOIN and why.',
          maxPoints: 15,
        },
      ],
      totalPoints: 100,
    },
  },
];
