import { SeedBook, Y1_Y2 } from '../types';

/**
 * SQL interview questions. Every example uses one small schema:
 *   employees(id, name, dept_id, salary, manager_id, hired_on)
 *   departments(id, name)
 * SQL is MySQL 8 compatible.
 */
const book: SeedBook = {
  slug: 'sql-interview',
  title: 'SQL Interview Questions',
  kind: 'topic',
  subject: 'SQL',
  description: 'The 40 SQL questions freshers are asked most: DDL/DML, filtering and aggregation, joins, keys and normalization, window functions, indexes and transactions, with runnable MySQL.',
  color: '#0369a1',
  emblem: '🗄️',
  audience: 'all',
  stages: Y1_Y2,
  tracks: [],
  order: 30,
  chapters: [
    {
      title: 'Basics and DDL/DML',
      questions: [
        {
          q: `What is SQL? Explain DDL, DML, DCL and TCL with examples.`,
          a: `**SQL (Structured Query Language)** is the standard language for defining, querying and changing data in relational databases such as MySQL, PostgreSQL, Oracle and SQL Server. Its commands fall into four groups:

- **DDL (Data Definition Language)** defines structure: \`CREATE\`, \`ALTER\`, \`DROP\`, \`TRUNCATE\`, \`RENAME\`.
- **DML (Data Manipulation Language)** works on rows: \`SELECT\`, \`INSERT\`, \`UPDATE\`, \`DELETE\`. (Some books put \`SELECT\` in a separate DQL group.)
- **DCL (Data Control Language)** manages permissions: \`GRANT\`, \`REVOKE\`.
- **TCL (Transaction Control Language)** manages transactions: \`COMMIT\`, \`ROLLBACK\`, \`SAVEPOINT\`.

\`\`\`sql
CREATE TABLE departments (id INT PRIMARY KEY, name VARCHAR(50));   -- DDL
INSERT INTO departments VALUES (1, 'Engineering');                 -- DML
GRANT SELECT ON company.departments TO 'report_user'@'%';          -- DCL
COMMIT;                                                             -- TCL
\`\`\``,
          d: 'easy',
          at: 'TCS, Infosys, Wipro',
          tip: `Give one command per group; interviewers often follow up with "is TRUNCATE DDL or DML?" (DDL).`,
        },
        {
          q: `What is the difference between DELETE, TRUNCATE and DROP?`,
          a: `| | DELETE | TRUNCATE | DROP |
|---|---|---|---|
| Type | DML | DDL | DDL |
| Removes | Selected rows (WHERE allowed) | All rows | The whole table: data, structure, indexes |
| Rollback | Yes, inside a transaction | No in MySQL (implicit commit) | No in MySQL (implicit commit) |
| Triggers | Fires DELETE triggers | Does not | Does not |
| AUTO_INCREMENT | Not reset | Reset to start | Gone with the table |
| Speed | Slow, row by row, logged | Fast, deallocates pages | Fast |

\`\`\`sql
DELETE FROM employees WHERE dept_id = 3;  -- only dept 3 rows
TRUNCATE TABLE employees;                 -- empty table, structure stays
DROP TABLE employees;                     -- table no longer exists
\`\`\`

TRUNCATE also fails on a table referenced by a foreign key in MySQL, while DELETE works if no child rows block it.`,
          d: 'easy',
          at: 'TCS, Accenture, Cognizant, Capgemini',
          tip: `Mention rollback, WHERE support and AUTO_INCREMENT reset: those three points cover most follow-ups.`,
        },
        {
          q: `What is the difference between CHAR and VARCHAR?`,
          a: `- **CHAR(n)** is fixed length. MySQL always stores n characters, padding shorter values with spaces (trailing spaces are removed when you read it back). Good for values that are always the same length: country codes, PIN codes, \`'Y'/'N'\` flags.
- **VARCHAR(n)** is variable length. It stores only the characters used plus 1 or 2 bytes for the length. Good for names, emails and addresses.

\`\`\`sql
CREATE TABLE demo (
  state_code CHAR(2),       -- 'KA', 'TN' — always 2
  full_name  VARCHAR(100)   -- 'Ravi' uses ~5 bytes, not 100
);
\`\`\`

CHAR can be marginally faster for fixed-size data because rows have predictable width; VARCHAR saves space when lengths vary. Both have a maximum: CHAR up to 255 characters, VARCHAR up to 65,535 bytes (shared with the row size limit).`,
          d: 'easy',
          at: 'Infosys, HCL',
        },
        {
          q: `Write the DDL to create the employees and departments tables used in most SQL interview questions.`,
          a: `\`\`\`sql
CREATE TABLE departments (
  id   INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE employees (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  name       VARCHAR(100) NOT NULL,
  dept_id    INT,
  salary     DECIMAL(10,2) CHECK (salary >= 0),
  manager_id INT NULL,
  hired_on   DATE DEFAULT (CURRENT_DATE),
  FOREIGN KEY (dept_id)    REFERENCES departments(id),
  FOREIGN KEY (manager_id) REFERENCES employees(id)
);
\`\`\`

Points worth saying aloud: \`DECIMAL\` (not \`FLOAT\`) for money because it is exact; \`manager_id\` is a **self-referencing foreign key**, and it is nullable because the CEO has no manager; \`dept_id\` is nullable so a new joiner can exist before being assigned. \`CHECK\` constraints are enforced from MySQL 8.0.16 onward.`,
          d: 'easy',
          at: 'Wipro, Tech Mahindra',
          tip: `Explain each choice (DECIMAL for money, nullable manager_id); that is what turns a syntax answer into a design answer.`,
        },
        {
          q: `How do you insert, update and delete rows? What happens if you run UPDATE without a WHERE clause?`,
          a: `\`\`\`sql
INSERT INTO employees (name, dept_id, salary, manager_id, hired_on)
VALUES ('Asha', 1, 65000, NULL, '2024-07-01'),
       ('Ravi', 1, 52000, 1,    '2025-01-15');

UPDATE employees SET salary = salary * 1.10 WHERE dept_id = 1;

DELETE FROM employees WHERE id = 2;
\`\`\`

**UPDATE (or DELETE) without WHERE affects every row in the table.** \`UPDATE employees SET salary = 0;\` sets everyone's salary to zero. In autocommit mode (MySQL's default) the change is permanent immediately.

Safe habits:
- Run the same WHERE as a \`SELECT\` first to see which rows will change.
- Wrap risky changes in \`START TRANSACTION; ... ROLLBACK/COMMIT;\`.
- MySQL's \`SET SQL_SAFE_UPDATES = 1;\` refuses UPDATE/DELETE without a key-based WHERE or LIMIT.`,
          d: 'easy',
          at: 'Accenture, Capgemini',
        },
        {
          q: `What is NULL in SQL? Why does \`WHERE manager_id = NULL\` return nothing?`,
          a: `**NULL means "unknown or missing"**, not zero and not an empty string. Any comparison with NULL using \`=\`, \`<>\`, \`<\` etc. gives **UNKNOWN**, and WHERE keeps only rows that are TRUE, so \`= NULL\` never matches anything.

Use \`IS NULL\` / \`IS NOT NULL\`:

\`\`\`sql
SELECT name FROM employees WHERE manager_id IS NULL;      -- the CEO

-- replace NULL with a default when displaying
SELECT name, COALESCE(dept_id, 0) AS dept FROM employees;  -- IFNULL() also works in MySQL
\`\`\`

Other NULL behaviours interviewers check:
- \`NULL + 100\` is NULL.
- Aggregates like \`SUM\`, \`AVG\`, \`COUNT(col)\` ignore NULLs; \`COUNT(*)\` does not.
- \`GROUP BY\` puts all NULLs into one group.
- MySQL also offers the null-safe operator \`<=>\`: \`NULL <=> NULL\` is 1.`,
          d: 'medium',
          at: 'TCS, Infosys, Deloitte',
          tip: `Say the words "three-valued logic: TRUE, FALSE, UNKNOWN" — it shows you know why, not just the rule.`,
        },
        {
          q: `How do you copy a table's structure only, or its structure and data, in MySQL?`,
          a: `\`\`\`sql
-- 1. Structure only, including indexes, keys and AUTO_INCREMENT
CREATE TABLE employees_backup LIKE employees;

-- 2. Then copy the data into it
INSERT INTO employees_backup SELECT * FROM employees;

-- 3. Structure + data in one step (columns and types only;
--    primary key, indexes and foreign keys are NOT copied)
CREATE TABLE employees_copy AS SELECT * FROM employees;

-- 4. Structure only with CTAS: a WHERE that is never true
CREATE TABLE employees_empty AS SELECT * FROM employees WHERE 1 = 0;

-- 5. Copy only some rows
CREATE TABLE eng_employees AS
SELECT * FROM employees WHERE dept_id = 1;
\`\`\`

The key difference: \`CREATE TABLE ... LIKE\` keeps the full definition (indexes, primary key), whereas \`CREATE TABLE ... AS SELECT\` creates plain columns. Neither copies foreign key constraints or triggers. In SQL Server the equivalent is \`SELECT * INTO new_table FROM old_table\`.`,
          d: 'medium',
          at: 'Cognizant, LTIMindtree',
        },
        {
          q: `In what order does the database logically execute the clauses of a SELECT query?`,
          a: `You write \`SELECT ... FROM ... WHERE ... GROUP BY ... HAVING ... ORDER BY ... LIMIT\`, but the logical processing order is:

1. **FROM / JOIN** — build the source rows
2. **WHERE** — filter individual rows
3. **GROUP BY** — form groups
4. **HAVING** — filter groups
5. **SELECT** — compute columns, aliases, window functions
6. **DISTINCT** — remove duplicates
7. **ORDER BY** — sort
8. **LIMIT / OFFSET** — cut the result

\`\`\`sql
SELECT dept_id, AVG(salary) AS avg_sal
FROM employees
WHERE hired_on >= '2023-01-01'
GROUP BY dept_id
HAVING AVG(salary) > 50000
ORDER BY avg_sal DESC
LIMIT 3;
\`\`\`

This explains common errors: you cannot use the alias \`avg_sal\` in WHERE (it does not exist yet), you cannot use aggregates in WHERE, but you can use the alias in ORDER BY. (MySQL also allows aliases in GROUP BY and HAVING as a non-standard extension.) The optimizer may physically reorder steps, but results must match this order.`,
          d: 'medium',
          at: 'Amazon, Infosys, Zoho',
          tip: `Use it to explain why an alias works in ORDER BY but not in WHERE — that follow-up is almost guaranteed.`,
        },
      ],
    },
    {
      title: 'Filtering, sorting and aggregation',
      questions: [
        {
          q: `What is the difference between WHERE and HAVING?`,
          a: `- **WHERE** filters **individual rows before grouping**. It cannot use aggregate functions.
- **HAVING** filters **groups after GROUP BY**. It is where aggregate conditions go.

\`\`\`sql
-- Departments with more than 5 employees hired since 2023
SELECT dept_id, COUNT(*) AS headcount
FROM employees
WHERE hired_on >= '2023-01-01'   -- row filter
GROUP BY dept_id
HAVING COUNT(*) > 5;             -- group filter
\`\`\`

\`WHERE COUNT(*) > 5\` is an error because WHERE runs before groups exist.

Performance tip: put non-aggregate conditions in WHERE, not HAVING. \`HAVING dept_id = 2\` works, but it groups every department first and discards the rest afterwards, while \`WHERE dept_id = 2\` throws rows away early and can use an index. HAVING without GROUP BY treats the whole table as one group.`,
          d: 'easy',
          at: 'TCS, Accenture, Wipro, Capgemini',
          tip: `One line answer: WHERE filters rows before grouping, HAVING filters groups after. Then show one query using both.`,
        },
        {
          q: `What is the difference between COUNT(*), COUNT(column) and COUNT(DISTINCT column)?`,
          a: `- **COUNT(*)** counts all rows, including rows with NULLs.
- **COUNT(column)** counts rows where that column is **not NULL**.
- **COUNT(DISTINCT column)** counts unique non-NULL values.

\`\`\`sql
SELECT COUNT(*)                AS total_employees,
       COUNT(manager_id)       AS have_a_manager,     -- CEO excluded
       COUNT(DISTINCT dept_id) AS departments_used
FROM employees;
\`\`\`

If there are 10 employees, one CEO with \`manager_id\` NULL and staff spread across 3 departments, this returns 10, 9 and 3.

\`COUNT(1)\` behaves exactly like \`COUNT(*)\` — the constant 1 is never NULL — and there is no performance difference in modern MySQL. The same NULL rule applies to \`SUM\`, \`AVG\`, \`MIN\` and \`MAX\`: they skip NULLs, so \`AVG(salary)\` divides by the number of non-NULL salaries, not by the number of rows.`,
          d: 'easy',
          at: 'Infosys, Cognizant',
        },
        {
          q: `Explain LIKE, IN and BETWEEN with examples.`,
          a: `\`\`\`sql
-- LIKE: pattern match. % = any number of chars, _ = exactly one char
SELECT name FROM employees WHERE name LIKE 'A%';    -- starts with A
SELECT name FROM employees WHERE name LIKE '%an%';  -- contains 'an'
SELECT name FROM employees WHERE name LIKE '_a%';   -- 2nd letter is a

-- IN: matches any value in a list (cleaner than many ORs)
SELECT name FROM employees WHERE dept_id IN (1, 3, 5);

-- BETWEEN: inclusive range on both ends
SELECT name FROM employees WHERE salary BETWEEN 40000 AND 60000;
SELECT name FROM employees
WHERE hired_on BETWEEN '2024-01-01' AND '2024-12-31';
\`\`\`

Things to mention:
- \`BETWEEN a AND b\` includes both a and b. On a DATETIME column, \`'2024-12-31'\` means midnight, so later times on the 31st are missed; use \`< '2025-01-01'\` instead.
- A leading wildcard (\`'%an'\`) cannot use a normal index.
- \`NOT IN\` with a NULL in the list returns no rows.`,
          d: 'easy',
          at: 'TCS, HCL',
        },
        {
          q: `Write a query to find the second highest salary from the employees table.`,
          a: `**Method 1: subquery with MAX** (works everywhere)

\`\`\`sql
SELECT MAX(salary) AS second_highest
FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);
\`\`\`

**Method 2: LIMIT with OFFSET** (MySQL/PostgreSQL)

\`\`\`sql
SELECT DISTINCT salary AS second_highest
FROM employees
ORDER BY salary DESC
LIMIT 1 OFFSET 1;
\`\`\`

**Method 3: DENSE_RANK** (MySQL 8+)

\`\`\`sql
SELECT DISTINCT salary AS second_highest
FROM (SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
      FROM employees) t
WHERE rnk = 2;
\`\`\`

Edge cases interviewers probe: **ties** — if two people share the top salary, \`DISTINCT\`/\`DENSE_RANK\` still return the true second distinct value; without \`DISTINCT\`, method 2 would return the top salary again. **Only one distinct salary** — method 1 returns NULL (one row), methods 2 and 3 return no rows; wrap with \`SELECT (subquery)\` if a NULL row is required.`,
          d: 'medium',
          at: 'TCS, Infosys, Accenture, Amazon',
          tip: `Give two methods and raise the tie case yourself; that alone often decides the round.`,
        },
        {
          q: `How do you find the Nth highest salary?`,
          a: `**Using DENSE_RANK (MySQL 8+)** — clearest and handles ties. Here N = 3:

\`\`\`sql
SELECT DISTINCT salary
FROM (SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
      FROM employees) ranked
WHERE rnk = 3;
\`\`\`

**Using LIMIT/OFFSET** — skip N-1 distinct salaries:

\`\`\`sql
SELECT DISTINCT salary FROM employees
ORDER BY salary DESC
LIMIT 1 OFFSET 2;          -- OFFSET = N - 1
\`\`\`

**Correlated subquery** — works on old databases without window functions:

\`\`\`sql
SELECT DISTINCT e1.salary
FROM employees e1
WHERE 2 = (SELECT COUNT(DISTINCT e2.salary)     -- N - 1
           FROM employees e2
           WHERE e2.salary > e1.salary);
\`\`\`

The correlated version reads "a salary that has exactly N-1 distinct salaries above it". It runs the inner query per row, so it is O(n²) and slow on big tables. Note that OFFSET cannot take an expression like \`N-1\` directly in MySQL; inside a stored function you compute it into a variable first.`,
          d: 'medium',
          at: 'Infosys, Cognizant, Capgemini',
          tip: `Use DENSE_RANK, not ROW_NUMBER or RANK, so duplicate salaries do not shift the Nth value.`,
        },
        {
          q: `Write a query to find duplicate records in a table.`,
          a: `Group by the columns that define a duplicate and keep groups with more than one row. Here, two employees with the same name in the same department are treated as duplicates:

\`\`\`sql
SELECT name, dept_id, COUNT(*) AS copies
FROM employees
GROUP BY name, dept_id
HAVING COUNT(*) > 1;
\`\`\`

To see the full duplicate rows (with their ids), join back or use a window function:

\`\`\`sql
SELECT *
FROM (SELECT e.*,
             COUNT(*) OVER (PARTITION BY name, dept_id) AS copies
      FROM employees e) t
WHERE copies > 1
ORDER BY name, id;
\`\`\`

Pre-MySQL 8 alternative:

\`\`\`sql
SELECT e.*
FROM employees e
JOIN (SELECT name, dept_id FROM employees
      GROUP BY name, dept_id HAVING COUNT(*) > 1) d
  ON e.name = d.name AND e.dept_id = d.dept_id;
\`\`\`

Always clarify which columns make a row a "duplicate" — the \`id\` column is unique, so grouping by every column including \`id\` finds nothing.`,
          d: 'medium',
          at: 'TCS, Wipro, Accenture',
        },
        {
          q: `How do you delete duplicate rows but keep one copy of each?`,
          a: `Keep the row with the smallest \`id\` in each duplicate group and delete the rest.

**MySQL self-join DELETE:**

\`\`\`sql
DELETE e1
FROM employees e1
JOIN employees e2
  ON  e1.name    = e2.name
  AND e1.dept_id = e2.dept_id
  AND e1.id      > e2.id;     -- e1 is a later copy
\`\`\`

**MySQL 8 with ROW_NUMBER:**

\`\`\`sql
DELETE FROM employees
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY name, dept_id ORDER BY id) AS rn
    FROM employees
  ) t
  WHERE rn > 1
);
\`\`\`

The extra derived table \`t\` is required: MySQL does not let you DELETE from a table while selecting from the same table directly in a subquery (error 1093), but it allows it when the subquery is materialized as a derived table.

Finally, prevent it happening again with a unique constraint: \`ALTER TABLE employees ADD UNIQUE (name, dept_id);\`. Run a \`SELECT\` version first and do it inside a transaction.`,
          d: 'hard',
          at: 'Amazon, Deloitte, Cognizant',
          tip: `Finish with "then add a UNIQUE constraint" — fixing the cause impresses more than the delete.`,
        },
        {
          q: `Find the highest-paid employee in each department, showing name, department name and salary.`,
          a: `A plain \`GROUP BY dept_id\` gives the maximum salary but not *who* earns it. Two correct approaches:

**Join to a grouped subquery** (works in any version):

\`\`\`sql
SELECT d.name AS department, e.name, e.salary
FROM employees e
JOIN (SELECT dept_id, MAX(salary) AS max_sal
      FROM employees GROUP BY dept_id) m
  ON e.dept_id = m.dept_id AND e.salary = m.max_sal
JOIN departments d ON d.id = e.dept_id;
\`\`\`

**Window function** (MySQL 8+):

\`\`\`sql
SELECT department, name, salary
FROM (SELECT d.name AS department, e.name, e.salary,
             RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS rnk
      FROM employees e
      JOIN departments d ON d.id = e.dept_id) t
WHERE rnk = 1;
\`\`\`

Both return **all** employees tied for the top salary. If exactly one row per department is required, use \`ROW_NUMBER()\` with a tie-breaker (\`ORDER BY e.salary DESC, e.hired_on\`).

A common wrong answer is \`SELECT dept_id, name, MAX(salary) ... GROUP BY dept_id\`: with \`ONLY_FULL_GROUP_BY\` it errors, and without it MySQL returns an arbitrary name.`,
          d: 'hard',
          at: 'Amazon, Infosys, Zoho',
        },
      ],
    },
    {
      title: 'Joins and subqueries',
      questions: [
        {
          q: `What are the different types of joins in SQL?`,
          a: `- **INNER JOIN** — only rows that match in both tables.
- **LEFT (OUTER) JOIN** — all rows from the left table; NULLs where the right has no match.
- **RIGHT (OUTER) JOIN** — all rows from the right table; NULLs where the left has no match.
- **FULL OUTER JOIN** — all rows from both (not supported directly in MySQL).
- **CROSS JOIN** — every combination of rows (Cartesian product).
- **SELF JOIN** — a table joined to itself using aliases.

\`\`\`sql
-- Employees with their department; employees without a dept are dropped
SELECT e.name, d.name AS dept
FROM employees e
INNER JOIN departments d ON d.id = e.dept_id;

-- All employees; dept shows NULL for unassigned ones
SELECT e.name, d.name AS dept
FROM employees e
LEFT JOIN departments d ON d.id = e.dept_id;
\`\`\`

With 3 matched employees and 1 unassigned employee, INNER returns 3 rows and LEFT returns 4.`,
          d: 'easy',
          at: 'TCS, Infosys, Wipro, Accenture',
          tip: `Draw two circles (Venn) if there is a whiteboard, and give the row counts for one small example.`,
        },
        {
          q: `What is the difference between UNION and UNION ALL?`,
          a: `Both stack the results of two SELECTs vertically. The difference is duplicates:

- **UNION** removes duplicate rows (it sorts or hashes the combined result to do so).
- **UNION ALL** keeps every row, including duplicates, and is therefore **faster**.

\`\`\`sql
-- Everyone who is either in dept 1 or earns over 80,000
SELECT name FROM employees WHERE dept_id = 1
UNION
SELECT name FROM employees WHERE salary > 80000;     -- a person in both appears once

SELECT name FROM employees WHERE dept_id = 1
UNION ALL
SELECT name FROM employees WHERE salary > 80000;     -- appears twice
\`\`\`

Rules for both: the SELECTs must have the **same number of columns** with compatible types; column names come from the first SELECT; a single \`ORDER BY\` at the end sorts the whole result.

Use UNION ALL when you know the sets cannot overlap or duplicates are acceptable — it avoids an unnecessary de-duplication step.`,
          d: 'easy',
          at: 'Capgemini, Cognizant, HCL',
        },
        {
          q: `What is a CROSS JOIN and when would you use it?`,
          a: `A **CROSS JOIN** returns the **Cartesian product**: every row of the first table paired with every row of the second. If \`employees\` has 10 rows and \`departments\` has 4, the result has 40 rows. There is no ON condition.

\`\`\`sql
SELECT e.name, d.name AS dept
FROM employees e
CROSS JOIN departments d;
\`\`\`

Writing \`FROM employees, departments\` without a WHERE gives the same result — which is why a forgotten join condition produces a huge, wrong result.

Real uses:
- Generating combinations, e.g. every size × every colour of a product.
- Building a report grid, e.g. every department × every month, then LEFT JOIN actual figures so empty months show 0.

\`\`\`sql
SELECT d.name, m.month
FROM departments d
CROSS JOIN (SELECT 1 AS month UNION ALL SELECT 2 UNION ALL SELECT 3) m;
\`\`\``,
          d: 'easy',
          at: 'Wipro, Tech Mahindra',
        },
        {
          q: `Using a self join, list each employee with their manager's name.`,
          a: `The manager is also a row in \`employees\`, so join the table to itself with two aliases: one for the employee, one for the manager.

\`\`\`sql
SELECT e.name AS employee,
       m.name AS manager
FROM employees e
LEFT JOIN employees m ON m.id = e.manager_id
ORDER BY manager, employee;
\`\`\`

Use **LEFT JOIN** so the CEO (whose \`manager_id\` is NULL) still appears, with manager shown as NULL. An INNER JOIN would silently drop them. Use \`COALESCE(m.name, 'No manager')\` for a friendlier label.

Common follow-ups:

\`\`\`sql
-- Employees who earn more than their manager
SELECT e.name, e.salary, m.name AS manager, m.salary AS mgr_salary
FROM employees e
JOIN employees m ON m.id = e.manager_id
WHERE e.salary > m.salary;

-- Number of direct reports per manager
SELECT m.name, COUNT(e.id) AS reports
FROM employees m
JOIN employees e ON e.manager_id = m.id
GROUP BY m.id, m.name;
\`\`\``,
          d: 'medium',
          at: 'TCS, Amazon, Infosys, Accenture',
          tip: `Say why you chose LEFT JOIN (keeps the CEO). Then offer "employees earning more than their manager" before they ask.`,
        },
        {
          q: `Find departments that have no employees.`,
          a: `Three standard ways:

**LEFT JOIN + IS NULL**

\`\`\`sql
SELECT d.id, d.name
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id
WHERE e.id IS NULL;
\`\`\`

**NOT EXISTS**

\`\`\`sql
SELECT d.id, d.name
FROM departments d
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.dept_id = d.id);
\`\`\`

**NOT IN** (careful)

\`\`\`sql
SELECT id, name FROM departments
WHERE id NOT IN (SELECT dept_id FROM employees WHERE dept_id IS NOT NULL);
\`\`\`

The LEFT JOIN version works because unmatched departments get NULL in every employee column; checking a column that can never be NULL in a real match (the primary key \`e.id\`) isolates them.

The \`WHERE dept_id IS NOT NULL\` in the NOT IN version is essential: if any employee has a NULL \`dept_id\`, \`NOT IN\` returns no rows at all. NOT EXISTS has no such trap, which is why many prefer it.`,
          d: 'medium',
          at: 'Infosys, Cognizant, Deloitte',
        },
        {
          q: `What is the difference between a correlated and a non-correlated subquery?`,
          a: `- A **non-correlated subquery** is independent of the outer query. It runs once and its result is reused.
- A **correlated subquery** refers to a column of the outer query, so logically it runs **once per outer row**.

\`\`\`sql
-- Non-correlated: company-wide average computed once
SELECT name, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);

-- Correlated: average of *this employee's* department
SELECT e.name, e.dept_id, e.salary
FROM employees e
WHERE e.salary > (SELECT AVG(e2.salary)
                  FROM employees e2
                  WHERE e2.dept_id = e.dept_id);
\`\`\`

You can spot a correlated subquery by the outer alias (\`e.dept_id\`) inside it; it cannot run on its own.

Correlated subqueries can be slow on large tables. The same logic is often rewritten with a join to a grouped derived table or a window function:

\`\`\`sql
SELECT name, dept_id, salary
FROM (SELECT e.*, AVG(salary) OVER (PARTITION BY dept_id) AS dept_avg
      FROM employees e) t
WHERE salary > dept_avg;
\`\`\``,
          d: 'medium',
          at: 'Accenture, Capgemini, Amazon',
        },
        {
          q: `MySQL does not support FULL OUTER JOIN. How do you get the same result?`,
          a: `A FULL OUTER JOIN returns matched rows plus unmatched rows from **both** sides. In MySQL, combine a LEFT JOIN and a RIGHT JOIN with UNION:

\`\`\`sql
SELECT e.name AS employee, d.name AS department
FROM employees e
LEFT JOIN departments d ON d.id = e.dept_id

UNION

SELECT e.name, d.name
FROM employees e
RIGHT JOIN departments d ON d.id = e.dept_id;
\`\`\`

The result includes employees with no department (department NULL) and departments with no employees (employee NULL).

\`UNION\` removes the matched rows that appear in both halves. But it would also merge two genuinely different rows that happen to look identical (e.g. two employees named Ravi in the same department). A safer form uses UNION ALL and keeps only the unmatched rows from the second half:

\`\`\`sql
SELECT e.name, d.name FROM employees e
LEFT JOIN departments d ON d.id = e.dept_id
UNION ALL
SELECT NULL, d.name FROM departments d
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.dept_id = d.id);
\`\`\``,
          d: 'medium',
          at: 'Cognizant, Zoho',
        },
        {
          q: `What is the difference between IN and EXISTS? Why can NOT IN return no rows?`,
          a: `- **IN** compares a value against the list a subquery returns.
- **EXISTS** only checks whether the correlated subquery returns **any row**; it stops at the first match.

Modern MySQL optimizes both into semi-joins, so performance is often similar. EXISTS tends to win when the inner table is large and indexed on the join column.

**The NOT IN trap:** if the subquery returns even one NULL, \`NOT IN\` returns nothing. Example — "employees who manage nobody":

\`\`\`sql
-- WRONG: returns 0 rows, because the CEO's manager_id is NULL
SELECT name FROM employees
WHERE id NOT IN (SELECT manager_id FROM employees);
\`\`\`

\`x NOT IN (1, 2, NULL)\` means \`x <> 1 AND x <> 2 AND x <> NULL\`; the last part is UNKNOWN, so the whole condition is never TRUE.

\`\`\`sql
-- RIGHT: NOT EXISTS ignores NULLs naturally
SELECT e.name FROM employees e
WHERE NOT EXISTS (SELECT 1 FROM employees r WHERE r.manager_id = e.id);

-- or filter the NULLs out
SELECT name FROM employees
WHERE id NOT IN (SELECT manager_id FROM employees WHERE manager_id IS NOT NULL);
\`\`\``,
          d: 'hard',
          at: 'Amazon, Oracle, Deloitte',
          tip: `The NOT IN + NULL example is the real test here. Show the wrong query, explain why, then fix it.`,
        },
      ],
    },
    {
      title: 'Keys, constraints and normalization',
      questions: [
        {
          q: `What is the difference between a primary key and a unique key?`,
          a: `| | Primary key | Unique key |
|---|---|---|
| Purpose | Identifies each row | Prevents duplicate values in a column |
| NULLs | Not allowed | Allowed (MySQL allows many NULLs) |
| How many per table | Only one (can be composite) | Many |
| Index in InnoDB | The clustered index — rows are stored in PK order | A secondary (non-clustered) index |

\`\`\`sql
CREATE TABLE users (
  id    INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(120) UNIQUE,
  phone VARCHAR(15)  UNIQUE
);
\`\`\`

Here \`id\` identifies the row, while \`email\` and \`phone\` must each be unique but are not the row's identity. Both constraints create an index automatically, so lookups on them are fast. A primary key is effectively \`UNIQUE + NOT NULL\` with the extra role of being the table's main identifier, which foreign keys usually reference.`,
          d: 'easy',
          at: 'TCS, Infosys, Wipro',
        },
        {
          q: `What is a foreign key? What do ON DELETE CASCADE and ON DELETE SET NULL do?`,
          a: `A **foreign key** is a column whose values must match a primary (or unique) key in another table. It enforces **referential integrity**: you cannot insert an employee into a department that does not exist.

\`\`\`sql
CREATE TABLE employees (
  id      INT PRIMARY KEY,
  name    VARCHAR(100),
  dept_id INT,
  CONSTRAINT fk_emp_dept FOREIGN KEY (dept_id)
    REFERENCES departments(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);
\`\`\`

What happens when the parent department row is deleted:
- **RESTRICT / NO ACTION** (default) — the delete is refused while employees reference it.
- **CASCADE** — the child rows are deleted too.
- **SET NULL** — the child's \`dept_id\` becomes NULL (the column must allow NULL).

\`ON UPDATE\` works the same way when the parent key changes. Choose carefully: CASCADE on orders → order_items is sensible; CASCADE on departments → employees would silently delete staff.`,
          d: 'easy',
          at: 'Accenture, Capgemini, HCL',
        },
        {
          q: `What constraints are available in SQL? Give an example of each.`,
          a: `Constraints are rules the database enforces on data:

- **NOT NULL** — a value is required.
- **UNIQUE** — no two rows share the value.
- **PRIMARY KEY** — unique + not null, identifies the row.
- **FOREIGN KEY** — value must exist in the referenced table.
- **CHECK** — value must satisfy a condition (enforced from MySQL 8.0.16).
- **DEFAULT** — value used when none is supplied.

\`\`\`sql
CREATE TABLE employees (
  id       INT PRIMARY KEY AUTO_INCREMENT,
  name     VARCHAR(100) NOT NULL,
  email    VARCHAR(120) UNIQUE,
  dept_id  INT,
  salary   DECIMAL(10,2) CHECK (salary > 0),
  hired_on DATE DEFAULT (CURRENT_DATE),
  FOREIGN KEY (dept_id) REFERENCES departments(id)
);

-- Adding one later
ALTER TABLE employees ADD CONSTRAINT chk_name CHECK (CHAR_LENGTH(name) >= 2);
\`\`\`

Constraints protect data no matter which application writes it, which is why they are better than validation in code alone.`,
          d: 'easy',
          at: 'Infosys, Tech Mahindra',
        },
        {
          q: `Explain super key, candidate key, primary key, alternate key, composite key and surrogate key.`,
          a: `Take \`students(roll_no, email, aadhaar, name)\`:

- **Super key** — any set of columns that uniquely identifies a row: \`{roll_no}\`, \`{roll_no, name}\`, \`{email, name}\`...
- **Candidate key** — a *minimal* super key (no column can be removed): \`{roll_no}\`, \`{email}\`, \`{aadhaar}\`.
- **Primary key** — the candidate key you choose as the main identifier: \`roll_no\`.
- **Alternate key** — the candidate keys not chosen: \`email\`, \`aadhaar\` (usually enforced with UNIQUE).
- **Composite key** — a key made of two or more columns.
- **Surrogate key** — an artificial key with no business meaning, usually AUTO_INCREMENT; the opposite is a **natural key** like Aadhaar.

\`\`\`sql
CREATE TABLE enrollments (
  student_id INT,
  course_id  INT,
  enrolled_on DATE,
  PRIMARY KEY (student_id, course_id)   -- composite key
);
\`\`\`

Surrogate keys are popular because natural keys can change (an email) or be long, which makes joins and indexes heavier.`,
          d: 'medium',
          at: 'TCS, Cognizant, Wipro',
        },
        {
          q: `What is normalization and why is it needed?`,
          a: `**Normalization** is organising tables so each fact is stored **once**, by splitting data into related tables based on dependencies. Its goal is to remove redundancy and the **anomalies** redundancy causes.

Example of a badly designed table:

\`\`\`sql
-- emp_id | emp_name | dept_name   | dept_location
--   1    | Asha     | Engineering | Bengaluru
--   2    | Ravi     | Engineering | Bengaluru
\`\`\`

- **Update anomaly** — if Engineering moves to Pune, you must update every Engineering row; miss one and the data contradicts itself.
- **Insert anomaly** — you cannot record a new department until it has an employee.
- **Delete anomaly** — deleting the last employee of a department deletes the department's information too.

The fix is to move department facts to their own table and reference them:

\`\`\`sql
CREATE TABLE departments (id INT PRIMARY KEY, name VARCHAR(50), location VARCHAR(50));
CREATE TABLE employees  (id INT PRIMARY KEY, name VARCHAR(100),
                         dept_id INT REFERENCES departments(id));
\`\`\`

Normal forms (1NF, 2NF, 3NF, BCNF) are the step-by-step rules for getting there.`,
          d: 'medium',
          at: 'Infosys, Accenture, Capgemini',
          tip: `Name the three anomalies (update, insert, delete) with one example each — that is what the question is really testing.`,
        },
        {
          q: `Explain 1NF, 2NF and 3NF with an example.`,
          a: `Start with \`orders(order_id, customer_id, customer_city, products, product_id, product_name, qty)\`.

**1NF — atomic values, no repeating groups.** A column like \`products = 'Pen, Book'\` breaks 1NF. One value per cell, one row per product:
\`order_items(order_id, product_id, product_name, qty, customer_id, customer_city)\`, key = \`(order_id, product_id)\`.

**2NF — 1NF + no partial dependency.** Every non-key column must depend on the **whole** composite key. \`product_name\` depends only on \`product_id\`, and \`customer_id\` only on \`order_id\`. Split:

\`\`\`sql
CREATE TABLE products    (product_id INT PRIMARY KEY, product_name VARCHAR(80));
CREATE TABLE orders      (order_id INT PRIMARY KEY, customer_id INT, customer_city VARCHAR(50));
CREATE TABLE order_items (order_id INT, product_id INT, qty INT,
                          PRIMARY KEY (order_id, product_id));
\`\`\`

**3NF — 2NF + no transitive dependency.** In \`orders\`, \`customer_city\` depends on \`customer_id\`, not on \`order_id\` (order_id → customer_id → city). Move it:

\`\`\`sql
CREATE TABLE customers (customer_id INT PRIMARY KEY, city VARCHAR(50));
ALTER TABLE orders DROP COLUMN customer_city;
\`\`\`

Memory line: every non-key column depends on **the key (1NF), the whole key (2NF), and nothing but the key (3NF)**.`,
          d: 'hard',
          at: 'TCS, Infosys, Wipro, Accenture',
          tip: `Use one table and normalize it step by step; quote "the key, the whole key, nothing but the key" at the end.`,
        },
        {
          q: `What is BCNF, and when would you deliberately denormalize?`,
          a: `**BCNF (Boyce-Codd Normal Form)** is a stricter 3NF: for every functional dependency X → Y, **X must be a super key**. 3NF allows an exception when Y is part of a candidate key; BCNF does not.

Example: \`teaching(student, subject, teacher)\`, where each teacher teaches one subject and a student has one teacher per subject. Key = \`(student, subject)\`. But \`teacher → subject\`, and \`teacher\` is not a super key, so it violates BCNF (while satisfying 3NF). Fix: \`teacher_subject(teacher, subject)\` and \`student_teacher(student, teacher)\`.

**Denormalization** means intentionally adding redundancy to make reads faster, accepting extra work on writes. Use it when:
- Read-heavy reports join many large tables (data warehouses, dashboards).
- A value is expensive to compute every time, e.g. storing \`order_total\` or a post's \`like_count\`.

\`\`\`sql
ALTER TABLE departments ADD COLUMN headcount INT DEFAULT 0;
-- kept correct by the application, a trigger or a scheduled job
\`\`\`

The cost: the redundant copy must be kept in sync, or the data becomes inconsistent. Normalize first, then denormalize only measured bottlenecks.`,
          d: 'hard',
          at: 'Amazon, Oracle, Deloitte',
        },
        {
          q: `Can a foreign key be NULL? Can a foreign key reference the same table?`,
          a: `**Yes to both.**

**NULL foreign key:** a foreign key column can hold NULL unless it is also declared \`NOT NULL\`. NULL means "no related row yet", and the database does not check NULLs against the parent table. Example: a new joiner whose \`dept_id\` is NULL until they are assigned.

**Self-referencing foreign key:** a column can reference the primary key of its own table. This models hierarchies — employees and managers, category trees, comment replies.

\`\`\`sql
CREATE TABLE employees (
  id         INT PRIMARY KEY,
  name       VARCHAR(100),
  manager_id INT NULL,
  FOREIGN KEY (manager_id) REFERENCES employees(id)
);

INSERT INTO employees VALUES (1, 'CEO Meera', NULL);  -- top of the tree
INSERT INTO employees VALUES (2, 'Asha', 1);
INSERT INTO employees VALUES (3, 'Ravi', 2);
INSERT INTO employees VALUES (4, 'Kiran', 99);        -- fails: no employee 99
\`\`\`

The CEO row needs \`manager_id\` NULL — without nullable foreign keys you could never insert the first row. Also, a foreign key value may repeat (many employees, one manager); it is not unique.`,
          d: 'medium',
          at: 'Cognizant, HCL',
        },
      ],
    },
    {
      title: 'Window functions, indexes and transactions',
      questions: [
        {
          q: `What is the difference between ROW_NUMBER, RANK and DENSE_RANK?`,
          a: `All three number rows in an ordered window. They differ only on **ties**:

- **ROW_NUMBER()** — unique 1, 2, 3, 4 even for equal values (order among ties is arbitrary unless you add a tie-breaker).
- **RANK()** — ties share a rank, then numbers are **skipped**: 1, 2, 2, 4.
- **DENSE_RANK()** — ties share a rank, **no gaps**: 1, 2, 2, 3.

\`\`\`sql
SELECT name, salary,
       ROW_NUMBER() OVER (ORDER BY salary DESC) AS row_num,
       RANK()       OVER (ORDER BY salary DESC) AS rnk,
       DENSE_RANK() OVER (ORDER BY salary DESC) AS dense_rnk
FROM employees;
\`\`\`

| name | salary | row_num | rnk | dense_rnk |
|---|---|---|---|---|
| Asha | 90000 | 1 | 1 | 1 |
| Ravi | 75000 | 2 | 2 | 2 |
| Kiran | 75000 | 3 | 2 | 2 |
| Meera | 60000 | 4 | 4 | 3 |

When to use: ROW_NUMBER for de-duplication and pagination; DENSE_RANK for "Nth highest salary"; RANK for competition-style rankings. Add \`PARTITION BY dept_id\` to restart numbering per department. Available in MySQL 8.0+.`,
          d: 'medium',
          at: 'Amazon, Infosys, Deloitte, Accenture',
          tip: `Draw the 4-row table with a tie; it answers the question faster than any definition.`,
        },
        {
          q: `What are window functions? Write a running total of salary cost by hire date within each department.`,
          a: `A **window function** computes a value over a set of rows related to the current row **without collapsing them** like GROUP BY does. Syntax: \`function() OVER (PARTITION BY ... ORDER BY ... frame)\`.

\`\`\`sql
SELECT name, dept_id, hired_on, salary,
       SUM(salary) OVER (PARTITION BY dept_id
                         ORDER BY hired_on, id
                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_cost,
       AVG(salary) OVER (PARTITION BY dept_id)   AS dept_avg,
       LAG(salary) OVER (PARTITION BY dept_id ORDER BY hired_on) AS prev_hire_salary
FROM employees;
\`\`\`

- \`PARTITION BY\` restarts the calculation for each department.
- \`ORDER BY\` inside OVER defines the running order.
- The \`ROWS\` frame makes it a strict row-by-row running total. Without it, the default \`RANGE\` frame treats rows with the same \`hired_on\` as one step.

Useful families: ranking (\`ROW_NUMBER\`, \`RANK\`, \`DENSE_RANK\`, \`NTILE\`), aggregates (\`SUM\`, \`AVG\`, \`COUNT\` with OVER), and offset (\`LAG\`, \`LEAD\`, \`FIRST_VALUE\`). Window functions cannot appear in WHERE — wrap the query in a derived table or CTE to filter on them.`,
          d: 'medium',
          at: 'Amazon, Zoho, Deloitte',
        },
        {
          q: `Write a query to get the top 3 highest-paid employees in each department.`,
          a: `Rank within each department, then filter in an outer query (a window function cannot be used in WHERE directly):

\`\`\`sql
WITH ranked AS (
  SELECT d.name AS department, e.name, e.salary,
         DENSE_RANK() OVER (PARTITION BY e.dept_id
                            ORDER BY e.salary DESC) AS rnk
  FROM employees e
  JOIN departments d ON d.id = e.dept_id
)
SELECT department, name, salary, rnk
FROM ranked
WHERE rnk <= 3
ORDER BY department, rnk;
\`\`\`

Choosing the function changes the meaning — say which you mean:
- \`DENSE_RANK\` — top 3 **salary levels**; may return more than 3 people when there are ties.
- \`RANK\` — ties share a place and the next place is skipped.
- \`ROW_NUMBER\` — exactly 3 people per department; ties broken arbitrarily unless you add \`ORDER BY e.salary DESC, e.id\`.

Without window functions (MySQL 5.7), use a correlated count:

\`\`\`sql
SELECT e.dept_id, e.name, e.salary
FROM employees e
WHERE (SELECT COUNT(DISTINCT e2.salary) FROM employees e2
       WHERE e2.dept_id = e.dept_id AND e2.salary > e.salary) < 3;
\`\`\``,
          d: 'hard',
          at: 'Amazon, Flipkart, Infosys',
          tip: `Ask "should ties both count?" before writing. Choosing DENSE_RANK vs ROW_NUMBER from the answer shows clear thinking.`,
        },
        {
          q: `What is an index? What are its advantages and disadvantages?`,
          a: `An **index** is a separate data structure (a **B+ tree** in MySQL InnoDB) that keeps column values sorted with pointers to the rows, like the index at the back of a book. It lets the database find rows without scanning the whole table.

\`\`\`sql
CREATE INDEX idx_emp_dept ON employees(dept_id);

-- Check whether a query uses it
EXPLAIN SELECT * FROM employees WHERE dept_id = 3;

DROP INDEX idx_emp_dept ON employees;
\`\`\`

**Advantages**
- Much faster \`WHERE\`, \`JOIN\`, \`ORDER BY\` and \`GROUP BY\` on indexed columns.
- Enforces uniqueness (UNIQUE index).

**Disadvantages**
- Slower \`INSERT\`, \`UPDATE\`, \`DELETE\`, because every index must also be updated.
- Extra disk space and memory.
- Little benefit on small tables or on low-selectivity columns (e.g. a gender column with two values).

Index columns used often in filters and joins (foreign keys especially); avoid indexing everything on write-heavy tables. Primary and unique keys are indexed automatically.`,
          d: 'easy',
          at: 'TCS, Infosys, Capgemini',
        },
        {
          q: `What is the difference between a clustered and a non-clustered index?`,
          a: `- **Clustered index** — determines the **physical order** of rows; the leaf level of the index *is* the table data. So a table can have **only one**.
- **Non-clustered (secondary) index** — a separate structure holding the indexed column(s) plus a pointer to the row. A table can have **many**.

**In MySQL InnoDB:**
- The **primary key is the clustered index**. With no PK, InnoDB uses the first NOT NULL UNIQUE index, otherwise a hidden row id.
- Secondary indexes store the **primary key value** as the pointer. A lookup by secondary index finds the PK, then searches the clustered index again (a "bookmark lookup").

\`\`\`sql
CREATE TABLE employees (
  id INT PRIMARY KEY,            -- clustered
  name VARCHAR(100),
  dept_id INT,
  INDEX idx_dept (dept_id)       -- non-clustered
);
\`\`\`

Consequences: range scans on the PK (\`WHERE id BETWEEN 100 AND 200\`) are very fast; a long PK (e.g. a UUID string) makes every secondary index bigger; random PKs cause page splits on insert, which is why AUTO_INCREMENT integers are the usual choice. A **covering index** — one containing all columns the query needs — avoids the second lookup.`,
          d: 'medium',
          at: 'Amazon, Oracle, Infosys, Accenture',
          tip: `Say "one clustered per table because data can be sorted only one way", then add the InnoDB PK detail.`,
        },
        {
          q: `What are the ACID properties of a transaction?`,
          a: `A **transaction** is a group of statements treated as a single unit. ACID guarantees it behaves reliably:

- **Atomicity** — all or nothing. If any statement fails, the whole transaction is rolled back.
- **Consistency** — the database moves from one valid state to another; constraints (PK, FK, CHECK) hold before and after.
- **Isolation** — concurrent transactions do not see each other's partial work; the degree is set by the isolation level.
- **Durability** — once committed, changes survive crashes (InnoDB writes them to the redo log first).

Classic example: transferring a salary advance between two accounts.

\`\`\`sql
START TRANSACTION;
UPDATE accounts SET balance = balance - 5000 WHERE id = 1;
UPDATE accounts SET balance = balance + 5000 WHERE id = 2;
-- if either fails or balance would go negative:
-- ROLLBACK;
COMMIT;
\`\`\`

Without atomicity, a crash between the two updates would make ₹5,000 disappear. In MySQL, only the **InnoDB** engine is transactional; MyISAM is not. \`SAVEPOINT name\` and \`ROLLBACK TO name\` undo part of a transaction.`,
          d: 'easy',
          at: 'TCS, Infosys, Wipro, Cognizant',
          tip: `Use the bank-transfer example and map each letter to it; examiners remember the example more than the definitions.`,
        },
        {
          q: `Explain transaction isolation levels and the problems each one prevents.`,
          a: `Three read problems can happen when transactions run concurrently:
- **Dirty read** — reading another transaction's **uncommitted** change, which may be rolled back.
- **Non-repeatable read** — reading the same row twice and getting different values because another transaction committed an update in between.
- **Phantom read** — re-running a range query and seeing new or missing rows because another transaction inserted or deleted.

| Level | Dirty | Non-repeatable | Phantom |
|---|---|---|---|
| READ UNCOMMITTED | possible | possible | possible |
| READ COMMITTED | prevented | possible | possible |
| REPEATABLE READ | prevented | prevented | possible (SQL standard) |
| SERIALIZABLE | prevented | prevented | prevented |

\`\`\`sql
SELECT @@transaction_isolation;                          -- MySQL 8
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
\`\`\`

MySQL InnoDB defaults to **REPEATABLE READ**. It uses MVCC snapshots so plain SELECTs see a consistent snapshot, and next-key (gap) locks for locking reads, which prevents most phantoms. Oracle and PostgreSQL default to READ COMMITTED. Higher isolation means fewer anomalies but more locking/waiting and lower concurrency, so pick the lowest level that is still correct for the use case.`,
          d: 'hard',
          at: 'Amazon, Oracle, Deloitte',
          tip: `Learn the table; then mention MySQL's default is REPEATABLE READ while Oracle/PostgreSQL use READ COMMITTED.`,
        },
        {
          q: `You created an index, but a query still does a full table scan. What could be the reasons?`,
          a: `Common reasons the optimizer cannot or will not use an index:

1. **Function or expression on the column** — \`WHERE YEAR(hired_on) = 2024\` hides the column. Rewrite as a range.
2. **Leading wildcard** — \`LIKE '%kumar'\` cannot seek in a B+ tree; \`LIKE 'kumar%'\` can.
3. **Composite index not used from the left** — an index on \`(dept_id, salary)\` serves \`dept_id = ?\` and \`dept_id = ? AND salary > ?\`, but not \`salary > ?\` alone (**leftmost prefix rule**).
4. **Implicit type conversion** — comparing a VARCHAR column to a number: \`WHERE phone = 98450...\`.
5. **Low selectivity / small table** — if most rows match, a full scan is genuinely cheaper.
6. **OR across different columns** without an index on each.

\`\`\`sql
CREATE INDEX idx_dept_sal ON employees(dept_id, salary);
CREATE INDEX idx_hired    ON employees(hired_on);

-- Bad: function on column
EXPLAIN SELECT * FROM employees WHERE YEAR(hired_on) = 2024;
-- Good: sargable range
EXPLAIN SELECT * FROM employees
WHERE hired_on >= '2024-01-01' AND hired_on < '2025-01-01';
\`\`\`

Use \`EXPLAIN\`: \`type = ALL\` means a full scan; check the \`key\` column for the index chosen. Outdated statistics can be refreshed with \`ANALYZE TABLE employees;\`.`,
          d: 'hard',
          at: 'Amazon, Flipkart, Zoho',
          tip: `Lead with "functions on indexed columns" and the leftmost-prefix rule, then show EXPLAIN — that is what seniors look for.`,
        },
      ],
    },
  ],
};

export default book;
