/**
 * Career-track content: Test Data and SQL for Testers (QA_TEST_DATA_SQL), QA / SDET, batch QA1.
 *
 * SQL as a tester uses it: proving what an action really wrote, finding the duplicate and the orphan row a screen
 * hides, creating and cleaning up the data a test needs, masking personal data out of test copies, and reconciling
 * a report or CSV export against the database. It builds on the years' "SQL Basics" (T_SQL) and the Year-2 query
 * lessons ("Questions That Span Tables", "Answering Questions Per Group"), and on the Python Full Stack track's
 * "Fixtures and Parametrised Tests"; those are referred to by title, not re-taught.
 *
 * One fictional company runs through the topic: YatraBus, a Hyderabad bus-booking start-up. Every output quoted in
 * the notes is real output from Python 3.13 with Flask 3.1, SQLite 3.50, pytest 9.1, DuckDB 2.0 (with its sqlite
 * extension) and pandas 3.0, run against a small Flask + SQLite booking app with three planted bugs (a double
 * charge on retry, an orphan seat row, an export that uses the UTC date and fans out over payments), its fixed
 * version, pytest factories with cleanup proved by row counts, an HMAC masking script over 1,000 synthetic
 * customers, and DuckDB reconciliations. Not run: PostgreSQL/MySQL behaviour (quoted from their documentation and
 * marked as such), Faker, Testcontainers and data-quality tools such as Great Expectations, which are named only.
 *
 * Skills: SQL_BASICS by default; the test-data lesson is TEST_DESIGN, and checkpoint questions elsewhere that are
 * plainly about test data design use ck('TEST_DESIGN', ...).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_QA_TEST_DATA_SQL_BUNDLES: PilotBundle[] = [
  /* ── SQL_FOR_TESTERS ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TEST_DATA_SQL_SQL_FOR_TESTERS',
    notes: `YatraBus sells bus seats between Hyderabad, Vijayawada and Bengaluru. A customer picks seats, pays by UPI, and the
screen says "Paid". A tester who stops at the screen has tested the screen. The database is where the money, the
seats and the customer's history really live, and the bugs that cost a company most are the ones the screen hides.

You can already write SELECT, joins and GROUP BY ("SQL Basics", "Questions That Span Tables"). This lesson is about
using them as evidence: act through the app, then ask the database what actually happened.

## The app under test

A small Flask app on SQLite with five tables: customers, trips, bookings (status PENDING or PAID, amount in paise),
booking_seats (one row per seat, with trip_id so the seat map can read it) and payments. Three endpoints matter:
POST /bookings, POST /bookings/<id>/pay and DELETE /bookings/<id> (a customer abandons an unpaid booking).

Drive it the way a user would, including the double tap every UPI user has done on a slow network:

    create: 201 {'amount_paise': 170000, 'id': 1, 'status': 'PENDING'}
    pay: 200 {'id': 1, 'status': 'PAID'} | retry: 200 {'id': 1, 'status': 'PAID'}
    GET : {'amount_paise': 170000, 'id': 1, 'status': 'PAID'}

Every response is correct. The booking page shows one paid booking of Rs 1,700. Now ask the database:

    SELECT id, booking_id, upi_ref, amount_paise FROM payments WHERE booking_id = 1;
    (1, 1, 'UPI-551', 170000)
    (2, 1, 'UPI-552', 170000)

Two payment rows. The customer was charged Rs 3,400 for two seats worth Rs 1,700, and nothing on screen says so.

## The tester's loop

1. **Know what the action should write.** Read the story or ask the developer: which tables, which rows, which
   columns, and what must not change. "Pay" should add exactly one payment row and flip one booking to PAID.
2. **Find the rows by a key you control.** Use the id the API returned, or a unique value you created (an email
   such as qa+7f3a@example.test). Never "the latest row" (ORDER BY id DESC LIMIT 1): on a shared test database
   another tester's row may be the latest.
3. **Check every column that matters.** amount_paise = fare x seats (85000 x 2 = 170000), status, foreign keys,
   created_at stored in UTC, flags. A row that exists with a wrong amount is still a bug.
4. **Check what should not have happened.** No second payment, no row in another customer's history, no change to
   the trip's fare.
5. **Repeat with the awkward paths:** retry, back button, two tabs, cancel half-way, a timeout.

## Five queries a tester keeps

**Rows the action wrote**, by key, with counts before and after:

    SELECT COUNT(*) FROM payments WHERE booking_id = ?;

**Duplicates**, grouped by the business key (what should be unique), never by the primary key:

    SELECT booking_id, COUNT(*) AS n, SUM(amount_paise) AS charged
    FROM payments GROUP BY booking_id HAVING COUNT(*) > 1;
    (1, 2, 340000)

**Orphans**, children whose parent is gone: the LEFT JOIN ... IS NULL you learned in "Questions That Span Tables".
After abandoning booking 2 (seat 21), the API said 204 and GET /bookings/2 said 404, but the seat map said:

    seat map: {'taken': [14, 15, 21], 'trip_id': 7}

    SELECT bs.id, bs.booking_id, bs.seat_no
    FROM booking_seats bs LEFT JOIN bookings b ON b.id = bs.booking_id
    WHERE b.id IS NULL;
    (3, 2, 21)

Seat 21 is blocked for every future customer, and the booking that blocked it no longer exists. On a sale day that is
lost revenue nobody can trace from the screen.

**Impossible states**: a PAID booking with no payment, a status outside the allowed set, an end date before a start
date. **Totals that must agree**: payment amount against booking amount, seats against amount.

## Why the orphan existed

The schema says booking_seats.booking_id REFERENCES bookings(id) ON DELETE CASCADE. SQLite ignores foreign keys
unless each connection runs PRAGMA foreign_keys = ON, and the app never did:

    foreign_keys pragma on a fresh connection: 0
    foreign_key_check: [('booking_seats', 3, 'bookings', 1)]

PRAGMA foreign_key_check lists every row that breaks a declared foreign key; run it on any SQLite database you
test. PostgreSQL and MySQL's InnoDB enforce declared foreign keys (per their documentation), but a schema can
simply not declare them, and bulk imports often switch checks off, so the orphan query is still worth running.

## Make the checks tests

Each query becomes an assertion in pytest, against a fresh database file per test (tmp_path):

    def test_retry_does_not_charge_twice(env):
        client, con = env
        bid = client.post("/bookings", json={"customer_id": 1, "trip_id": 7, "seats": [14]}).get_json()["id"]
        client.post(f"/bookings/{bid}/pay", json={"upi_ref": "UPI-551"})
        client.post(f"/bookings/{bid}/pay", json={"upi_ref": "UPI-552"})
        assert one(con, "SELECT COUNT(*) FROM payments WHERE booking_id = ?", bid) == 1

    E       AssertionError: assert 2 == 1
    E       assert [(21,)] == []
    2 failed, 1 passed in 1.63s

After the developer added UNIQUE on payments.booking_id, an "already PAID" check in the endpoint and the pragma, the
same file printed 3 passed in 0.61s. Those tests now guard the fix forever.

## Ground rules on shared databases

- Use a read-only account for checking; a tester who fixes data with UPDATE has hidden the bug.
- Filter on indexed keys and add LIMIT; a SELECT * on a large table slows everyone's environment.
- If the app writes asynchronously (a queue, a webhook), poll with a timeout instead of checking once.
- Confirm which database the environment points at before you trust an empty result.`,
    workedExample: `**Scenario.** Exploratory testing on YatraBus's UPI flow turns up the double charge above. Write the defect so a
developer can act on it, and leave a test behind.

**Step 1: reproduce through the API, not just the UI.** Create a booking for two seats, call pay twice with
different UPI references, then read the booking: 201, 200, 200, and GET shows status PAID, amount 170000.

**Step 2: collect the database evidence.**

    SELECT booking_id, COUNT(*) AS n, SUM(amount_paise) AS charged
    FROM payments GROUP BY booking_id HAVING COUNT(*) > 1;
    (1, 2, 340000)

**Step 3: write the report.**

    Title: Retrying UPI payment creates a second payment row and charges twice
    Severity: Critical (money taken twice); Priority: P1 before the Diwali sale
    Steps: POST /bookings (2 seats, trip 7) -> POST /bookings/1/pay -> repeat within 2 s
    Expected: one payments row for booking 1, total 170000 paise
    Actual: two rows (UPI-551, UPI-552), total 340000; UI shows one paid booking
    Evidence: the query above and its output; app log lines for both requests
    Note: payments.booking_id has no UNIQUE constraint; pay() does not check status

Notice what the report does not do: it does not prescribe the code. "Note" gives the developer the two facts that
point at the cause.

**Step 4: leave a regression test.** test_retry_does_not_charge_twice failed with assert 2 == 1 on the buggy
build and passed on the fixed one. A UNIQUE constraint is the strongest fix, because it protects the data even
from code paths nobody tested; the status check makes the retry return the same answer instead of an error,
which is what an idempotent payment API should do.

**What to say in a review.** "The UI was right and the data was wrong. I verify payments in the database by booking
id after every pay action, and the duplicate query runs in our nightly suite."`,
    mcqs: [
      mcq('After tapping Pay twice on a slow network, the YatraBus booking page shows one paid booking. What is the best next check?', [
        ['Count the payments rows for that booking id in the database', true],
        ['Refresh the booking page twice and confirm the status stays PAID', false],
        ['Check the browser console for errors during the second tap', false],
        ['Ask the developer whether the endpoint is meant to be idempotent', false],
      ], 'The screen showed one paid booking even when two payment rows existed, so only the database can prove how many charges happened. Refreshing re-reads the same summary, the console shows client errors not server writes, and asking about the design does not tell you what was written.'),
      mcq('A tester wants to find bookings that were paid more than once. Which query does that?', [
        ['GROUP BY booking_id on payments, keeping groups with COUNT(*) > 1', true],
        ['GROUP BY id, booking_id on payments, keeping groups with COUNT(*) > 1', false],
        ['SELECT DISTINCT booking_id FROM payments ordered by booking_id', false],
        ['COUNT(DISTINCT id) on payments compared with COUNT(*) on bookings', false],
      ], 'Duplicates are found by grouping on the key that should be unique. Adding the primary key id makes every group one row, so nothing is ever reported; DISTINCT hides duplicates instead of showing them, and comparing two table counts mixes unpaid bookings into the answer.'),
      mcq('An abandoned booking is gone (GET returns 404) but its seat still shows as taken. The SQLite schema declares ON DELETE CASCADE. What is the likely cause?', [
        ['The connection never ran PRAGMA foreign_keys = ON, so the cascade did not fire', true],
        ['ON DELETE CASCADE only applies to rows inserted after the schema was created', false],
        ['The DELETE statement was missing a COMMIT, so the seat row was rolled back later', false],
        ['SQLite only cascades deletes when the child table has its own primary key', false],
      ], 'SQLite enforces foreign keys, including cascades, only on connections that switch them on, and the demo printed foreign_keys 0. Cascades apply to all rows, the booking delete did commit (GET returned 404), and booking_seats already has a primary key.'),
    ],
    checkpoint: [
      mcq('Which query lists booking_seats rows whose booking no longer exists?', [
        ['A LEFT JOIN from booking_seats to bookings, keeping rows where bookings.id IS NULL', true],
        ['An INNER JOIN from booking_seats to bookings, keeping rows where bookings.id IS NULL', false],
        ['A LEFT JOIN from bookings to booking_seats, keeping rows where booking_seats.id IS NULL', false],
        ['A GROUP BY on booking_seats.booking_id, keeping groups with COUNT(*) = 0', false],
      ], 'The child table must be on the left so unmatched children survive with NULLs on the right. An inner join drops exactly the rows you want, the reversed join finds bookings without seats instead, and a group with zero rows cannot exist.'),
      mcq('On a shared QA database, a test checks "the newest payments row" to verify its own payment. Why is that unreliable?', [
        ['Another tester or job may have written a newer row in the meantime', true],
        ['Payment rows are not ordered by id unless the table has its own index on id', false],
        ['SQLite returns rows in random order whenever LIMIT is present', false],
        ['The newest row is cached by the app and may not be committed yet', false],
      ], 'On a shared database the latest row may belong to someone else, so verify by the id your action returned or by a unique value you created. ORDER BY id does order rows without any extra index, LIMIT does not randomise an ordered query, and caching does not explain picking the wrong row.'),
      mcq('Pay returns 200 and the booking shows PAID. Which further check best proves the payment was recorded correctly?', [
        ['One payments row for the booking, with amount equal to the booking amount', true],
        ['The booking row has status PAID and a freshly updated created_at timestamp value', false],
        ['The API response time stayed under the agreed 500 ms threshold', false],
        ['The trips table still holds the same fare for the trip that was booked', false],
      ], 'The action should create exactly one payment with the right amount; that is the row a double charge or a wrong amount would show up in. Status alone is what the UI already showed, created_at should not change on payment, response time is a separate concern, and an unchanged fare is a side check, not proof of the payment.'),
    ],
  },

  /* ── TEST_DATA ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TEST_DATA_SQL_TEST_DATA',
    notes: `Most flaky suites are not flaky because of timing; they are flaky because of data. A test passes alone and fails in
the suite because an earlier test left a row behind, or two parallel tests both used test@example.test, or a
"known" customer was edited by someone yesterday. This lesson is about data a test owns: creating it, removing it,
and never using a real person's details to do so.

## Three sources of test data

- **Created by the test**, through the API or directly in the database. Best for anything the test changes.
- **Reference data** seeded once per environment: trips, cities, fare tables. Tests read it and never change it.
- **Copies of production**, for realistic volume and odd values. Only ever masked (below).

Rule: a test creates what it changes, and cleans up what it creates.

## A factory, as a fixture

You met fixtures and yield teardown in "Fixtures and Parametrised Tests". A **factory fixture** returns a function,
so one test can make as many customers as it needs, with defaults it can override, and the fixture remembers
everything it made:

    @pytest.fixture
    def make_customer(db):
        created = []

        def make(**over):
            tag = uuid.uuid4().hex[:8]
            row = {"name": f"QA Customer {tag}", "email": f"qa+{tag}@example.test", "phone": "+910000000000"}
            row.update(over)
            cur = db.execute("INSERT INTO customers (name, email, phone) VALUES (:name, :email, :phone)", row)
            created.append(cur.lastrowid)
            return {"id": cur.lastrowid, **row}

        yield make
        for cid in reversed(created):
            db.execute("DELETE FROM customers WHERE id = ?", (cid,))

make_booking works the same way and depends on make_customer, so pytest tears it down first: bookings go before
the customers they point at. Its teardown deletes children before parents: payments, then booking_seats, then
the booking. Three details matter:

- **Unique values per call** (uuid in the email) so reruns and parallel workers (pytest-xdist) never collide on a
  UNIQUE column.
- **Reserved domains**: example.test, example.com and .invalid can never deliver mail to a real person.
- **A phone range your team agrees is fake**, and a test environment that never sends real SMS.

## Proving the cleanup

A session fixture counts rows in every table before the session and after it. On the shared SQLite file, with
foreign keys ON and one test failing on purpose:

    rows before session: {'customers': 0, 'bookings': 0, 'booking_seats': 0, 'payments': 0}
    ...F
    rows after session:  {'customers': 0, 'bookings': 0, 'booking_seats': 0, 'payments': 0}
    leaked: none
    1 failed, 3 passed in 0.97s

The failing test still cleaned up, because teardown after yield runs whatever the test did. Now the naive version,
whose teardown only deletes the booking and trusts the cascade on booking_seats:

    ERROR at teardown of test_paid_booking_has_exactly_one_payment
        | sqlite3.IntegrityError: FOREIGN KEY constraint failed
    rows after session:  {'customers': 2, 'bookings': 2, 'booking_seats': 2, 'payments': 2}
    leaked: {'customers': 2, 'bookings': 2, 'booking_seats': 2, 'payments': 2}
    1 failed, 3 passed, 2 errors in 0.82s

payments has no cascade, so deleting a paid booking failed, and then deleting its customer failed too. Every run
would add eight rows. Without the before/after count nobody would notice until the database was full of junk.

## Other ways to isolate

- **A fresh database per test** (a tmp_path SQLite file, as in the previous lesson, or a throwaway container with
  Testcontainers for PostgreSQL). Strongest isolation; nothing to clean.
- **Roll back a transaction** after each test. Works when the test and the code share one connection (Django's
  TestCase does this); it cannot undo what an app committed through its own connection.
- **A sweeper** that deletes rows tagged as test data (email LIKE 'qa+%@example.test') every night, as a safety
  net, never as the plan.

## Synthetic data

Generate data with a seeded generator (random.Random(42)) so a failure can be reproduced exactly; Faker with the
en_IN locale is the usual library. Make it awkward on purpose: names such as D'Souza, a name in Devanagari, a
comma inside a name, a 60-character name, amounts at the boundaries you found in "Test Design".

## Masking a production copy

India's Digital Personal Data Protection Act, 2023 limits personal data to the purpose it was collected for, and
testing is not that purpose. If a team needs production-shaped data, it masks before the copy leaves production.

Techniques: substitution (a fake name from a list), deterministic pseudonymisation (the same input always gives the
same token, so joins survive), nulling, shuffling within a column, and generalising (birth date to year). Use a
keyed hash (HMAC with a secret key): a plain hash of a phone number can be reversed by hashing every 10-digit
number.

The masking script over 1,000 synthetic customers, then its checks:

    source sample: (7, 'Imran Patel', 'imran.patel7@mailbox.example', '+918530876844', 'Pune')
    masked sample: (7, 'Lakshmi Naidu', 'user_dda43799f543@example.test', '+910000091500', 'Pune')
    original emails left             0
    original phones left             0
    tickets that still join          300
    distinct masked emails           1000
    distinct masked phones           997

The first phone scheme kept only five digits from the hash, and three customers collided; on a UNIQUE column the
load would have failed. Eight digits gave 1000 distinct. Always count distinct values after masking.

Free text leaks too: a support ticket that says "call me on 98480..." keeps the number after every column is
masked. Mask or drop free-text columns, logs and attachments, and treat the masked copy as sensitive anyway.`,
    mcqs: [
      mcq('A test passes alone but fails in the full suite with "UNIQUE constraint failed: customers.email". What is the most likely cause?', [
        ['Tests create customers with the same hard-coded email address', true],
        ['The suite runs too fast for SQLite to finish writing each row', false],
        ['pytest shares one database connection that loses its commits', false],
        ['The email column was added as UNIQUE after the tests were written', false],
      ], 'Two tests, a rerun, or a leaked row from a crashed cleanup all collide on one fixed email; a uuid tag per call removes the collision. SQLite does not lose rows to speed, a shared connection does not drop commits, and the constraint is correct: the data is what must change.'),
      mcq('A make_booking fixture deletes only the bookings row at teardown, relying on cascades. With foreign keys ON, paid bookings fail to clean up. Why?', [
        ['payments references bookings with no cascade, so the delete is refused', true],
        ['booking_seats rows are deleted after bookings, which reverses the order', false],
        ['Teardown code never runs when the test that used the fixture failed', false],
        ['SQLite cannot delete rows that were inserted inside the same session', false],
      ], 'The cascade exists only on booking_seats; a payment still points at the booking, so SQLite raised FOREIGN KEY constraint failed and the customer could not be deleted either. booking_seats did cascade, teardown runs after failures too, and SQLite deletes rows from any session.'),
      mcq('A team masks phone numbers with SHA-256 of the number, with no key. Why is that weak?', [
        ['Anyone can hash every 10-digit number and look up the originals', true],
        ['SHA-256 output changes on every run, so joins between tables break', false],
        ['SHA-256 hashes are longer than the column allows and get truncated', false],
        ['Hashing is reversible by design, so the number can be decoded back', false],
      ], 'There are only about ten billion 10-digit numbers, so an unkeyed hash can be reversed by brute force; a keyed HMAC with a secret prevents that. SHA-256 is deterministic, length can be handled by taking a prefix, and hashes are one-way, which is exactly why brute force rather than decoding is the risk.'),
    ],
    checkpoint: [
      ck('TEST_DESIGN', 'Which approach gives each test its own data and leaves nothing behind on a shared QA database?', [
        ['A factory fixture that records what it creates and deletes it in reverse order', true],
        ['A shared customer created once by a seed script and edited by each test', false],
        ['A cleanup query run by hand at the end of each sprint to remove test rows', false],
        ['A rollback in the test connection after the app has committed its writes', false],
      ], 'The factory gives every test fresh rows and its teardown removes them, children first, even when the test fails. A shared edited customer couples tests, manual cleanup lets junk pile up for weeks, and a rollback in the test connection cannot undo what the app committed on its own connection.'),
      ck('TEST_DESIGN', 'After masking 1,000 customers, distinct masked phone numbers come out as 997. What does that show?', [
        ['The mask maps different phones to the same value and needs more digits', true],
        ['Three customers had no phone number in the production copy to begin with', false],
        ['The masking key changed during the run and three rows used the old one', false],
        ['Three original phone numbers survived masking and must be removed by hand', false],
      ], 'Keeping five digits of the hash left a space of 100,000 values, so a few of 1,000 customers collided; eight digits gave 1,000 distinct. Missing phones would show as NULL, a changed key would not reduce distinct values this way, and the check for surviving originals returned 0.'),
      ck('TEST_DESIGN', 'Why should a test customer email use a domain such as example.test?', [
        ['Reserved domains can never deliver mail to a real person', true],
        ['Email validators reject all other domains in test environments', false],
        ['It lets the application skip sending email when it sees .test', false],
        ['It makes the email unique across every parallel test worker', false],
      ], 'example.com, example.test and .invalid are reserved, so a bug that sends mail from QA cannot reach anyone. Validators accept normal domains, the app does not know to skip them, and uniqueness comes from a per-test tag such as a uuid, not from the domain.'),
    ],
  },

  /* ── DATA_TESTING ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TEST_DATA_SQL_DATA_TESTING',
    notes: `Finance at YatraBus downloads a CSV every morning: "paid bookings for yesterday". They load it into Tally, reconcile it
against the UPI settlement from the bank, and pay GST on it. If the export is wrong, the books are wrong, and
nobody looks at the screen that produced it. Reports, exports and data flows are tested by reconciliation: build
the right answer independently and compare, row by row.

## What goes wrong in an export

- **Missing rows**: an inner join drops records with no match; a filter on the wrong date.
- **Extra rows**: another day's records; cancelled ones; test data.
- **Duplicates**: a join to a one-to-many table (payments, items) repeats the parent row ("Questions That Span
  Tables" called it a join that multiplies).
- **Wrong boundaries**: the business day is in IST but timestamps are stored in UTC.
- **Wrong values**: money as floats, rounding, a code that lost its leading zeros.
- **Broken format**: unescaped quotes or commas, an encoding Excel misreads, a missing header.

## The data

Six bookings, created with a controlled clock (UTC) and paid through the API, one of them retried:

    BK000001  2026-10-26 19:05 UTC  = 00:35 IST on the 27th   paid
    BK000002  2026-10-27 04:00 UTC                            paid, 2 seats
    BK000003  2026-10-27 09:30 UTC                            paid, then a retry
    BK000004  2026-10-27 12:00 UTC                            never paid
    BK000005  2026-10-27 15:00 UTC                            paid
    BK000006  2026-10-27 19:10 UTC  = 00:40 IST on the 28th   paid

The right answer for the IST day 2026-10-27 is BK000001, 2, 3 and 5: four bookings, Rs 4,250. Deciding that list
from the business rule, before looking at the export, is the test design.

The export for date=2026-10-27:

    booking_ref,customer,route,amount_inr,created_at
    BK000002,"Rao, Imran",Hyderabad-Vijayawada,1700.00,2026-10-27 04:00:00
    BK000003,"Meena Iyer",Hyderabad-Vijayawada,850.00,2026-10-27 09:30:00
    BK000003,"Meena Iyer",Hyderabad-Vijayawada,850.00,2026-10-27 09:30:00
    BK000005,"Rao, Imran",Hyderabad-Vijayawada,850.00,2026-10-27 15:00:00
    BK000006,"Meena Iyer",Hyderabad-Vijayawada,850.00,2026-10-27 19:10:00

Five rows. It looks plausible, which is why eyeballing exports does not work.

## Reconcile in DuckDB

DuckDB reads the CSV and attaches the app's SQLite file directly, so the comparison is plain SQL:

    d = duckdb.connect()
    d.sql("ATTACH 'u3.db' AS app (TYPE sqlite)")
    d.sql("""CREATE TABLE export AS SELECT * FROM read_csv('export_2026-10-27.csv', header = true,
             columns = {'booking_ref': 'VARCHAR', 'customer': 'VARCHAR', 'route': 'VARCHAR',
                        'amount_inr': 'DECIMAL(12,2)', 'created_at': 'TIMESTAMP'})""")
    d.sql("""CREATE TABLE expected AS
             SELECT 'BK' || lpad(CAST(id AS VARCHAR), 6, '0') AS booking_ref, amount_paise, created_at
             FROM app.bookings WHERE status = 'PAID'
               AND CAST(created_at AS TIMESTAMP) + INTERVAL 330 MINUTE >= TIMESTAMP '2026-10-27 00:00:00'
               AND CAST(created_at AS TIMESTAMP) + INTERVAL 330 MINUTE <  TIMESTAMP '2026-10-28 00:00:00'""")

Types are given explicitly: references are text, money is DECIMAL, never a guessed DOUBLE. The expected query is
written from the rule (PAID, IST day), not copied from the export's code; a copy would share its bugs.

Then five checks, from coarse to fine:

    -- 1. counts and totals
    export_rows 5 | export_refs 4 | expected_rows 4 | export_total_inr 5100.00 | expected_total_inr 4250.0
    -- 2. duplicates in the export
    BK000003  2
    -- 3. expected but missing from the export   (expected ANTI JOIN export)
    BK000001  2026-10-26 19:05:00
    -- 4. in the export but not expected          (export ANTI JOIN expected)
    BK000006  2026-10-27 19:10:00
    -- 5. amounts that disagree
    0 rows

Counts and totals tell you something is wrong; the key-level anti-joins in both directions tell you which rows.
Rs 850 too much is the sum of three defects, and only the row-level checks separate them:

- **Duplicate**: the export joins payments, and the retried booking has two payment rows (the bug from "SQL for
  Testers" now inflates revenue).
- **Missing**: it filters date(created_at) = '2026-10-27' on the UTC timestamp, so a booking at 00:35 IST falls on
  the 26th.
- **Extra**: for the same reason a booking at 00:40 IST on the 28th lands in the 27th.

The fix computes the IST day's bounds in UTC (2026-10-26 18:30 to 2026-10-27 18:30), drops the join to payments,
and writes rows with Python's csv module. The same reconciliation then printed 4 | 4 | 4 | 4250.00 | 4250.0 and
zero rows for every other check.

## Testing a report, beyond the totals

- The grand total equals the sum of the detail rows, and each subtotal equals its group.
- Boundary rows: 23:59:59 and 00:00:00 IST, the first and last day of a month, a leap day.
- An empty day gives a header and no rows, not an error or yesterday's file.
- Filters and sort order behave as documented; a large export is complete (no silent cap at 10,000 rows).
- The file opens correctly where it is used: quoted commas and quotes, UTF-8 (with a byte-order mark if users open
  it in Excel and names include Devanagari), leading zeros intact.

## Checks a tester adds to a data flow

A nightly job that copies bookings to the analytics warehouse is tested the same way at each step:

- **Row counts** in and out of every stage, with every drop explained ("3 rejected: no customer").
- **Uniqueness** of the key and **not-null** on required columns.
- **Referential checks**: every booking's customer exists downstream too.
- **Accepted values**: status in PENDING, PAID, CANCELLED.
- **Control totals**: sum of amount_paise equals the source for the same window.
- **Freshness**: max(created_at) in the target is within the expected delay.

Tools such as dbt tests, Great Expectations and Soda run these checks on a schedule (the Data Engineer track covers
them); the SQL underneath is what you wrote above.`,
    workedExample: `**Scenario.** Finance reports that yesterday's YatraBus export disagrees with the bank's UPI settlement by Rs 850.
Turn the investigation into a test that runs every night.

**Step 1: fix the right answer first.** The rule from the story: bookings with status PAID whose created_at, in
IST, falls on the requested date; one row per booking. In UTC that is created_at from 2026-10-26 18:30:00 up to,
but not including, 2026-10-27 18:30:00.

**Step 2: a fixture that builds the data and the comparison.** It creates the six bookings through the API with a
controlled clock, downloads the CSV, attaches the SQLite file in DuckDB and creates the export and expected
tables, exactly as in the notes. Each check is then one short test:

    def test_no_duplicate_rows(recon):
        assert refs(recon, "SELECT booking_ref FROM export GROUP BY 1 HAVING COUNT(*) > 1") == []

    def test_every_paid_booking_of_the_ist_day_is_exported(recon):
        assert refs(recon, "SELECT booking_ref FROM expected ANTI JOIN export USING (booking_ref)") == []

    def test_nothing_from_another_day_is_exported(recon):
        assert refs(recon, "SELECT booking_ref FROM export ANTI JOIN expected USING (booking_ref)") == []

    def test_total_matches_in_paise(recon):
        exported, expected = recon.execute(
            "SELECT (SELECT CAST(SUM(amount_inr) * 100 AS BIGINT) FROM export), "
            "(SELECT SUM(amount_paise) FROM expected)").fetchone()
        assert exported == expected

**Step 3: run it against the buggy build.**

    E   AssertionError: assert ['BK000003'] == []
    E   AssertionError: assert ['BK000001'] == []
    E   AssertionError: assert ['BK000006'] == []
    E   assert 510000 == 425000
    4 failed in 2.10s

Four failures, each naming the booking and the rule it broke; the developer does not need to rerun anything to
see the problem. On the fixed build: 4 passed in 1.77s.

**Step 4: compare in the smallest unit.** The total is compared in integer paise, not rupees as floats, so
rounding can never produce a false failure or hide a real one.

**One trap met on the way.** In DuckDB 2.0 a relation from d.sql() has no fetchone(); the error says to use
fetchall(), and con.execute(...).fetchone() works. Read the error; it usually names the fix.`,
    mcqs: [
      mcq('An export shows 5 rows and Rs 5,100; the expected set is 4 bookings and Rs 4,250. What should the tester run next?', [
        ['Anti-joins on booking_ref in both directions, plus a duplicate check on the export', true],
        ['A second download of the export, to check whether the totals are stable', false],
        ['A comparison of the export total against the bank settlement total only', false],
        ['A check of the CSV file encoding and line endings before anything else', false],
      ], 'Counts and totals only say that something is wrong; key-level comparisons name the duplicate (BK000003), the missing row (BK000001) and the extra one (BK000006). A re-download repeats the same bug, the bank total is one more aggregate, and encoding problems would not change the count of rows.'),
      mcq('Bookings are stored in UTC. Which created_at range in UTC covers the IST business day 2026-10-27?', [
        ['From 2026-10-26 18:30:00 up to but not including 2026-10-27 18:30:00', true],
        ['From 2026-10-27 00:00:00 up to but not including 2026-10-28 00:00:00', false],
        ['From 2026-10-27 05:30:00 up to but not including 2026-10-28 05:30:00', false],
        ['From 2026-10-26 18:30:00 up to and including 2026-10-27 18:30:00', false],
      ], 'IST is UTC+5:30, so midnight IST is 18:30 UTC on the previous day. The UTC calendar day is the original bug, adding 5:30 instead of subtracting shifts the window the wrong way, and an inclusive end counts a booking at exactly 00:00 IST on the next day twice.'),
      mcq('Why does the reconciliation read the CSV with booking_ref as VARCHAR and amount as DECIMAL instead of letting the reader guess?', [
        ['Guessed types can drop leading zeros or add float rounding, causing false matches or misses', true],
        ['DuckDB cannot read a CSV file at all unless every column type is supplied', false],
        ['VARCHAR and DECIMAL columns are needed before DuckDB can ATTACH a SQLite file', false],
        ['Explicit types make the reconciliation queries run several times faster', false],
      ], 'A reference like 000123 read as a number becomes 123 in pandas, and summing DOUBLE rupees can be off by fractions; either makes the comparison lie. DuckDB can infer types, ATTACH has nothing to do with CSV types, and speed is not the reason.'),
    ],
    checkpoint: [
      mcq('An export of paid bookings joins bookings to payments. One booking was paid twice. What will the export show?', [
        ['That booking twice, so row counts and totals are inflated', true],
        ['That booking once, because SELECT removes identical rows', false],
        ['No row for that booking, because the join cannot match two', false],
        ['That booking once, with its amount doubled in the one row', false],
      ], 'A join to a one-to-many table repeats the parent once per child, so BK000003 appeared twice and the total grew by Rs 850. SELECT keeps duplicates unless DISTINCT is asked for, a join matches every child, and nothing sums the payments into one row.'),
      mcq('Why should the expected set in a reconciliation not reuse the SQL the export itself runs?', [
        ['A copied query shares the export bugs, so both sides agree on wrong data', true],
        ['The export SQL is usually too slow to run against a test database', false],
        ['Reusing SQL breaks the rule that tests must never read app source code', false],
        ['The export SQL cannot be run in DuckDB because it is SQLite syntax', false],
      ], 'The value of a reconciliation is an independent answer from the business rule; the copied UTC filter and payments join would have produced the same five wrong rows. Speed and syntax are solvable, and testers read source code freely when it helps.'),
      mcq('A nightly job copies bookings to the analytics warehouse. Which check catches a run that silently loaded nothing new?', [
        ['A freshness check that max(created_at) in the target is within the expected delay', true],
        ['A uniqueness check on booking_id in the target table after each nightly run', false],
        ['An accepted-values check that status is only PENDING, PAID or CANCELLED', false],
        ['A not-null check on the customer_id and amount_paise columns in the target', false],
      ], 'If the job loads nothing, existing rows still pass uniqueness, accepted-values and not-null checks; only a freshness (or row count) check notices that the newest data is old. The other three check the quality of rows that are there, not whether new ones arrived.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TEST_DATA_SQL_DEBUGGING',
    notes: `Six things that went wrong while testing YatraBus's data. In each the check itself was wrong, which is worse than a
failing check: it says "all clear". Every message below is real output from SQLite, pytest, DuckDB or pandas.

## 1. The empty database

**Symptom.** A verification script fails at once:

    OperationalError: no such table: payments

The app had clearly written payments; the API returned 200.

**Cause.** The script opened sqlite3.connect("yatra.db") with a relative path. Run from a different working
directory, SQLite silently created a new, empty file there: "files now: ['app', 'yatra.db'] size of the new one: 0".
Against a server database the same mistake is pointing at the wrong environment.

**Fix.** Take the database location from the same configuration the app uses, as an absolute path or a
connection URL, and print it at the start of the run. For SQLite, connect with "file:...?mode=rw" and uri=True so
a missing file is an error (OperationalError: unable to open database file) rather than a fresh database.

## 2. The duplicate check that finds nothing

**Symptom.** A tester reproduces the double charge by hand, but the nightly duplicate query reports no rows.

    SELECT id, booking_id, COUNT(*) FROM payments GROUP BY id, booking_id HAVING COUNT(*) > 1;
    []

**Cause.** id is the primary key, so every group holds exactly one row.

**Fix.** Group only by the key that should be unique: GROUP BY booking_id gives [(1, 2)].

## 3. The orphan check that can never fire

**Symptom.** Seat 21 is blocked with no booking, but the orphan query is empty.

    SELECT bs.* FROM booking_seats bs JOIN bookings b ON b.id = bs.booking_id WHERE b.id IS NULL;
    []

**Cause.** An inner join keeps only matched rows, and a matched row never has b.id NULL. The query is a
contradiction that always returns nothing.

**Fix.** LEFT JOIN, child table on the left: [(2, 2, 21)]. Before trusting any "should be empty" check, plant one
bad row and confirm the check catches it.

## 4. The row the app wrote but the test cannot see

**Symptom.** The test counts payments straight after the request and gets 0; a minute later the row is there.

    app sees: 1 | test sees: 0
    test cleanup: OperationalError database is locked
    after commit, test sees: 1

**Cause.** The app's insert was still inside an open transaction. Other connections see only committed data, and
SQLite also refused the test's write while the app held the lock. With an asynchronous app (a queue worker, a
webhook) the write can simply happen later.

**Fix.** Ask the developers when the action commits. Where writes are asynchronous, poll with a timeout (check
every 200 ms for up to 10 s) instead of one immediate check or a fixed sleep.

## 5. Passes alone, fails in the suite

**Symptom.**

    IntegrityError: UNIQUE constraint failed: customers.email

on the second run, or on one of four pytest-xdist workers.

**Cause.** Every test inserts test@example.test. A previous run's cleanup crashed and left the row, or two workers
ran at the same moment.

**Fix.** A factory that adds a unique tag per call (qa+<uuid>@example.test) and a teardown that deletes children
before parents; the before/after row count from "Test Data" proves nothing leaks.

## 6. A CSV that parses into wrong values

**Symptom.** Reconciling an export by customer name reports every row as different, though counts and totals match.

**Cause.** The export wrote names with an f-string inside quotes. A name containing quotes broke the CSV:

    BK000001,"Ravi "RK" Kumar",850.00

Python's csv reader returned 'Ravi RK" Kumar"', and DuckDB's sniffer read the column with the quote characters
kept, '"Ravi "RK" Kumar"' and '"Asha Rao"' alike. No error anywhere; just wrong values.

**Fix.** The app must write CSV with a CSV library, which doubles the quotes: "Ravi ""RK"" Kumar". Add a name with a
quote, a comma and Devanagari to the test data so every export test meets one.

A related trap in pandas: read_csv turned a reference column 000123, 004512 into int64 [123, 4512], and every
anti-join then reported all rows missing. Read identifiers with dtype={"ref": "string"}.`,
    mcqs: [
      mcq('A verification script reports "no such table: payments" right after the app returned 200 for a payment. What should the tester check first?', [
        ['Which database file or environment the script actually connected to', true],
        ['Whether the payments table was dropped by a migration during the test', false],
        ['Whether the app returned 200 before or after it wrote the payment row', false],
        ['Whether the SQLite version supports the payments table column types', false],
      ], 'SQLite creates an empty file when a relative path resolves somewhere new, so "no such table" usually means the wrong database. A dropped table or the timing of the response would not make the whole table vanish for a working app, and SQLite accepts any column type.'),
      mcq('An orphan check written with an INNER JOIN and WHERE parent.id IS NULL has returned no rows for months. What is true?', [
        ['It cannot return rows, so it has never checked anything', true],
        ['It works, but only for rows created after the join was added', false],
        ['It works, as long as the foreign key is declared on the child', false],
        ['It returns rows only when foreign key enforcement is switched off', false],
      ], 'An inner join keeps matched rows only, and a matched parent id is never NULL, so the condition is always false. Declarations, enforcement and row age change nothing; a LEFT JOIN is needed, and planting a bad row would have exposed the problem.'),
      mcq('A test counts payments immediately after the request and sees 0; the row appears a moment later. Which fix is right?', [
        ['Poll for the row with a short interval and an overall timeout', true],
        ['Add time.sleep(5) before the query so the write has time to finish', false],
        ['Read with an uncommitted isolation level so open writes are visible', false],
        ['Mark the test as flaky and rerun it up to three times on failure', false],
      ], 'Polling waits only as long as needed and fails clearly after the timeout. A fixed sleep is slow and still flaky under load, reading uncommitted data would verify writes that might roll back, and rerunning hides the timing problem instead of handling it.'),
      mcq('Counts and totals match, but a reconcile by customer name flags a row whose name in the CSV is "Ravi "RK" Kumar". What is wrong?', [
        ['The export built CSV lines by hand, so the inner quotes were not doubled', true],
        ['The CSV was saved without a byte-order mark, so Excel misread the name', false],
        ['DuckDB cannot read any field whose text contains double-quote characters', false],
        ['The customers table stores the name in a column too short for the quotes', false],
      ], 'In CSV a quote inside a quoted field must be written twice; the f-string did not, so readers returned mangled names without any error. A byte-order mark affects encoding, DuckDB reads correctly escaped quotes fine, and the database held the name intact.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TEST_DATA_SQL_PRACTICE',
    notes: `Eight exercises on YatraBus data. Try each before reading the answer. The data for 1 to 5:

    customers: 1 Asha Rao '+91 90000 00001' | 2 Ravi Teja '9000000002' | 3 R. Teja '+919000000002'
               4 Meena Iyer '+919000000004'
    bookings (id, customer, status, amount_paise): 10 1 PAID 85000 | 11 2 PAID 170000 | 12 3 PAID 85000
               13 4 CANCELLED 85000 | 14 4 Paid 85000 | 15 1 PENDING 85000      (all on trip 7)
    booking_seats (booking, seat): 10-14 | 11-15 | 11-16 | 12-16 | 13-14 | 14-20 | 15-21
    payments (booking, amount_paise): 10 85000 | 11 17000 | 14 85000

## 1. Paid but never charged (easy)

Find bookings with status PAID that have no payment.

**Answer.**

    SELECT b.id FROM bookings b LEFT JOIN payments p ON p.booking_id = b.id
    WHERE b.status = 'PAID' AND p.id IS NULL;
    [(12,)]

Booking 14 has status 'Paid', not 'PAID', so it is not caught here; exercise 5 finds it.

## 2. Charged the wrong amount (easy)

**Answer.**

    SELECT b.id, b.amount_paise, p.amount_paise FROM bookings b JOIN payments p ON p.booking_id = b.id
    WHERE p.amount_paise <> b.amount_paise;
    [(11, 170000, 17000)]

A missing zero: Rs 170 charged for Rs 1,700. Classic unit confusion between rupees and paise.

## 3. One seat sold twice (medium)

**Answer.** Group by trip and seat, ignoring cancelled bookings:

    SELECT bs.trip_id, bs.seat_no, COUNT(*) AS n, GROUP_CONCAT(b.id) AS bookings
    FROM booking_seats bs JOIN bookings b ON b.id = bs.booking_id
    WHERE b.status <> 'CANCELLED'
    GROUP BY bs.trip_id, bs.seat_no HAVING COUNT(*) > 1;
    [(7, 16, 2, '11,12')]

Seat 14 appears twice too, but booking 13 was cancelled, so that is fine. Deciding which statuses count is the
test design; the SQL follows.

## 4. One person, two accounts (medium)

**Answer.** Normalise before grouping, or formatting hides the duplicate:

    SELECT substr(replace(replace(phone, ' ', ''), '+91', ''), -10) AS norm, COUNT(*), GROUP_CONCAT(id)
    FROM customers GROUP BY norm HAVING COUNT(*) > 1;
    [('9000000002', 2, '2,3')]

## 5. Values outside the allowed set (easy)

**Answer.**

    SELECT status, COUNT(*) FROM bookings WHERE status NOT IN ('PENDING', 'PAID', 'CANCELLED') GROUP BY status;
    [('Paid', 1)]

Report it with a suggestion: a CHECK constraint on status.

## 6. A factory for trips (medium)

Write a make_trip fixture that creates trips with a unique route name and removes them at teardown.

**Answer.**

    @pytest.fixture
    def make_trip(db):
        made = []
        def make(fare_paise=85000, travel_date="2026-11-02"):
            route = f"QA-ROUTE-{uuid.uuid4().hex[:6]}"
            cur = db.execute("INSERT INTO trips (route, travel_date, fare_paise) VALUES (?, ?, ?)",
                             (route, travel_date, fare_paise))
            made.append(cur.lastrowid)
            return {"id": cur.lastrowid, "route": route, "fare_paise": fare_paise}
        yield make
        for tid in reversed(made):
            db.execute("DELETE FROM trips WHERE id = ?", (tid,))

Any booking fixture that uses a trip must be torn down first; requesting make_trip inside make_booking makes pytest
do that.

## 7. The IST day in UTC (easy)

Write the WHERE clause for "paid on 1 November 2026, IST" when created_at is in UTC.

**Answer.** created_at >= '2026-10-31 18:30:00' AND created_at < '2026-11-01 18:30:00'. A half-open range: the
end is excluded, so a row at exactly midnight IST belongs to one day only.

## 8. Plan a reconciliation (hard)

An export says 1,204 rows and Rs 10,23,400; the database says 1,206 paid bookings and Rs 10,25,100 for the day.
List your checks in order.

**Answer.** (1) Confirm both sides use the same rule: IST day, status PAID, one row per booking. (2) Duplicates in
the export by booking_ref. (3) Anti-join expected to export, and export to expected; each row found has a
created_at you can check against the day's bounds. (4) Amount comparison per booking, in paise. (5) Explain the
total gap of Rs 1,700 with the rows found; a gap you cannot explain row by row is not finished.`,
    mcqs: [
      mcq('In practice exercise 1, why does a PAID-without-payment query miss booking 14?', [
        ['Its status is stored as Paid, which does not equal PAID', true],
        ['Its payment row exists, so the LEFT JOIN finds a match', false],
        ['It was cancelled, so the query excludes it on purpose', false],
      ], 'SQLite compares text case-sensitively with =, so status Paid is filtered out before the join matters. Booking 14 does have a payment, but the reason it is not listed is the status filter; the cancelled booking is 13. Exercise 5 finds the stray value.'),
      mcq('A double-booking check groups booking_seats by trip_id and seat_no. Which extra condition makes it correct for YatraBus?', [
        ['Count only seats whose booking is not CANCELLED', true],
        ['Count only seats whose booking has a payment row', false],
        ['Count only seats whose booking was created today', false],
        ['Count only seats on trips with more than one booking', false],
      ], 'A cancelled booking releases its seat, so seat 14 held by cancelled 13 and paid 10 is fine. Requiring a payment misses double-booked unpaid holds, a date filter misses older bookings, and the trip-level filter adds nothing the GROUP BY does not already do.'),
      mcq('Phones are stored as "+91 90000 00001", "9000000002" and "+919000000002". Why does GROUP BY phone miss the duplicate?', [
        ['The same number is written in different formats, so the values differ', true],
        ['GROUP BY ignores rows whose phone column contains space characters', false],
        ['Phone numbers must be cast to integers before GROUP BY can match them', false],
        ['GROUP BY compares only the first ten characters of each text value', false],
      ], 'Grouping compares exact values, and formatting makes one number look like three. Normalising spaces and the +91 prefix found customers 2 and 3. GROUP BY does not skip spaces or truncate, and casting to an integer would fail on the + and spaces.'),
      mcq('Which WHERE clause selects bookings made on 1 November 2026 in IST, with created_at stored in UTC?', [
        ['created_at >= \'2026-10-31 18:30:00\' AND created_at < \'2026-11-01 18:30:00\'', true],
        ['created_at >= \'2026-11-01 00:00:00\' AND created_at < \'2026-11-02 00:00:00\'', false],
        ['created_at >= \'2026-11-01 05:30:00\' AND created_at < \'2026-11-02 05:30:00\'', false],
        ['created_at BETWEEN \'2026-10-31 18:30:00\' AND \'2026-11-01 18:30:00\'', false],
      ], 'Midnight IST is 18:30 UTC the previous day, and the end must be excluded. The UTC calendar day is the original bug, adding 5:30 shifts the wrong way, and BETWEEN includes 18:30:00 so a booking at exactly midnight IST would count on both days.'),
      mcq('An export is Rs 1,700 below the database total for the day. When is the reconciliation finished?', [
        ['When rows found by the checks explain the whole Rs 1,700', true],
        ['When the export row count matches the count in the database', false],
        ['When the export is regenerated and the gap becomes smaller', false],
        ['When the gap is under one percent of the day total revenue', false],
      ], 'A reconciliation ends when every rupee of difference is traced to rows and causes. Matching counts can hide an extra and a missing row cancelling out, a smaller gap after regeneration is unexplained, and a percentage tolerance is wrong for money that should agree exactly.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TEST_DATA_SQL_INTERVIEW_QUESTION',
    notes: `Three questions that come up in QA and SDET interviews at product companies, GCCs and service companies, with an
answer that scores well and the follow-up a good interviewer asks next. Say them aloud in about two minutes each.

## Q1. "How do you verify that an action in the UI was saved correctly in the database?"

**Model answer.** "I find out from the story or the developer which tables and rows the action should touch. I
perform the action, take the id it returns, or a unique value I put in the data, and query those rows by key,
never 'the latest row', because on a shared environment that may be someone else's. I check every column that
matters: status, amounts, foreign keys, timestamps in UTC. Then I check what should not have happened: no
duplicate rows, no orphan children, nothing changed for other customers. On a booking app I found a double
charge that way: the UI showed one paid booking, the payments table had two rows for it. I raised it with the
query output as evidence and added a pytest test that counts payment rows after a retry."

**Follow-up.** "What if the write is asynchronous?" — "Then a single immediate check is wrong. I poll for the row
with a short interval and an overall timeout, and if there is a message queue I also check the message was
consumed. I never use a fixed sleep; it is slow when the system is fast and flaky when it is slow."

## Q2. "Write a query to find duplicate records."

**Model answer.** "First I ask what makes a record a duplicate, because that is the real question: for payments,
two rows for the same booking; for customers, the same phone after normalising format. Then:

    SELECT booking_id, COUNT(*) AS n
    FROM payments
    GROUP BY booking_id
    HAVING COUNT(*) > 1;

To see the full rows, I join this back to the table, or use COUNT(*) OVER (PARTITION BY booking_id) and keep rows
where it is above 1. I never include the primary key in the GROUP BY, because then every group has one row."

**Follow-up.** "And orphans?" — "LEFT JOIN from the child to the parent and keep rows where the parent key is
NULL. On SQLite I also run PRAGMA foreign_key_check, because foreign keys are off unless each connection turns
them on; that is exactly how I once found seats blocked by deleted bookings."

## Q3. "How do you manage test data in your automation framework?"

**Model answer.** "Three layers. Reference data such as cities and fares is seeded once per environment and never
changed by tests. Everything a test changes, the test creates through factory fixtures: a function with sensible
defaults and overrides, unique values per call so reruns and parallel workers do not collide, reserved email
domains like example.test. The fixture records what it created and deletes it in reverse order at teardown,
children before parents, and teardown runs even when the test fails. I prove there is no leakage with a row
count before and after the session. Where possible I prefer a fresh database per test run, for example a
container, which removes cleanup altogether. And I never use real customer data; if we need production-shaped
data, it is masked with a keyed hash before it leaves production, and I check that no original values survive."

**Follow-up.** "Why not just restore a database snapshot before every test?" — "It is a good option for a whole
suite run, but per test it is slow, and it hides tests that depend on each other's data. Each test owning its
data keeps tests independent, so they can run in any order and in parallel."`,
    mcqs: [
      mcq('An interviewer asks how you find duplicate customer accounts. What should you clarify before writing any SQL?', [
        ['What makes two customer rows count as the same person', true],
        ['Which SQL dialect and database version the company uses', false],
        ['Whether the customers table has an index on its primary key', false],
      ], 'Duplicates depend on a business definition, such as the same normalised phone or email, and the query follows from it. Dialect details rarely change a GROUP BY ... HAVING, and every primary key is indexed already; neither defines what a duplicate is.'),
      mcq('Asked "how do you keep test data from leaking between tests?", which answer shows the most practical experience?', [
        ['Factory fixtures that track and delete their rows, with a row count before and after the run', true],
        ['A nightly script that truncates every table in the shared QA database and reseeds it', false],
        ['One well-known test customer that every test logs in as and resets at the start', false],
      ], 'Tracking and deleting what each test creates, and proving it by counting rows, keeps tests independent and shows the leak if it happens. Truncating nightly destroys other teams data and lets leaks build up during the day, and one shared customer couples every test to every other.'),
      mcq('Asked what to do when the database write happens asynchronously after the API responds, which answer is strongest?', [
        ['Poll for the row with a short interval and fail after a clear overall timeout', true],
        ['Add a fixed sleep long enough for the slowest write you have ever observed in QA', false],
        ['Skip the database check for asynchronous actions and trust the API response', false],
      ], 'Polling returns as soon as the row exists and fails with a clear message when it never does. A fixed sleep is both slow and still flaky on a busy day, and trusting the API response is how the double-charge bug went unseen.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_TEST_DATA_SQL_CHECKPOINT',
    notes: `Ten questions across the topic: verifying actions in the database, duplicates and orphans, creating, cleaning up and
masking test data, and reconciling reports and exports. Answer without notes; the result shows which lesson to
revisit.`,
    checkpoint: [
      mcq('The UI shows a booking as paid once. What does a tester need to see before calling the payment flow correct?', [
        ['One payment row for the booking id, with the booking amount', true],
        ['A PAID status on the booking page after a full page reload', false],
        ['A 200 response from the pay endpoint on the first attempt', false],
        ['A payment row somewhere in the table created in the last minute', false],
      ], 'The database must hold exactly one payment for that booking with the right amount; that is what a double charge or wrong amount would break. The page and the 200 were both correct during the double-charge bug, and "a recent row" may be another tester\'s.'),
      mcq('Which query finds seats sold to two active bookings on the same trip?', [
        ['GROUP BY trip_id, seat_no over non-cancelled bookings, HAVING COUNT(*) > 1', true],
        ['GROUP BY booking_id over booking_seats, keeping groups with HAVING COUNT(*) > 1', false],
        ['SELECT DISTINCT trip_id, seat_no from booking_seats for all bookings on the trip', false],
        ['LEFT JOIN booking_seats to bookings, keeping rows where bookings.id IS NULL', false],
      ], 'A double sale is the same trip and seat twice among bookings that still hold seats. Grouping by booking finds bookings with several seats, DISTINCT hides the repeats, and the LEFT JOIN finds orphans, a different defect.'),
      mcq('A SQLite schema declares ON DELETE CASCADE, yet children survive their parent. Which command confirms the broken rows?', [
        ['PRAGMA foreign_key_check', true],
        ['PRAGMA integrity_check', false],
        ['PRAGMA table_info(booking_seats)', false],
        ['VACUUM followed by ANALYZE', false],
      ], 'foreign_key_check lists every row that violates a declared foreign key, exactly the orphans left because foreign_keys was off. integrity_check looks for file corruption, table_info only lists columns, and VACUUM and ANALYZE rebuild and gather statistics without checking references.'),
      ck('TEST_DESIGN', 'Two pytest-xdist workers both create a customer and one fails on a UNIQUE email. What is the right change?', [
        ['Give each created customer a unique tag, such as a uuid in the email', true],
        ['Run the customer tests serially, with a file lock shared by all the workers', false],
        ['Drop the UNIQUE constraint on email in the test database schema', false],
        ['Retry the failed test automatically until its insert succeeds', false],
      ], 'Unique values per created row remove the collision and keep the suite parallel. A lock throws away parallelism, dropping the constraint tests a different schema from production, and retries hide the clash instead of removing it.'),
      ck('TEST_DESIGN', 'A factory fixture creates a customer, a booking and a payment. In what order should teardown delete them?', [
        ['Payment, then booking, then customer', true],
        ['Customer, then booking, then payment', false],
        ['Booking, then payment, then customer', false],
        ['Any order, since teardown has no FKs', false],
      ], 'Children go before parents, so no delete is refused by a foreign key. Deleting the customer or booking first fails with FOREIGN KEY constraint failed when keys are enforced, which is how the naive fixture leaked eight rows per run.'),
      ck('TEST_DESIGN', 'How do you prove a test suite leaves no data behind on a shared database?', [
        ['Count rows per table before and after the session and compare', true],
        ['Check that every test in the run passed without any errors', false],
        ['Look in the UI for test customers after the run has finished', false],
        ['Read the teardown code and confirm it has a DELETE for every table', false],
      ], 'A before/after count is evidence: it showed "leaked: none" for the correct fixtures and eight leaked rows for the naive ones. Passing tests can still leak, the UI does not show every table, and reading code proves intent, not behaviour.'),
      ck('TEST_DESIGN', 'A team copies production customers into QA for realistic tests. What must happen first?', [
        ['Mask personal fields with a keyed method and verify no originals remain', true],
        ['Restrict the QA database to the testers who need to use the copy', false],
        ['Encrypt the backup file while it is copied between the two servers', false],
        ['Remove only the customers who have asked to delete their accounts', false],
      ], 'Testing is not the purpose personal data was collected for, so it is masked before it leaves production and checked afterwards (0 original emails and phones left). Access control and encryption in transit still leave real data in QA, and removing a few customers leaves everyone else exposed.'),
      mcq('An export is meant to contain paid bookings for one IST day but filters on date(created_at) of a UTC timestamp. Which rows go wrong?', [
        ['Bookings made between 00:00 and 05:30 IST land on the previous day', true],
        ['Bookings made between 18:30 and 24:00 IST land on the following day', false],
        ['Only bookings made at exactly midnight UTC are counted on both days', false],
        ['None, since SQLite converts timestamps to local time before date()', false],
      ], 'Midnight to 05:30 IST is still the previous date in UTC, so those bookings move a day back: BK000001 at 00:35 IST went missing and BK000006 at 00:40 IST on the next day crept in. 18:30 to 24:00 IST is the same date in UTC, and SQLite date() on the stored text just takes its date part, with no time-zone conversion.'),
      mcq('Counts and totals of an export match the database. What can still be wrong?', [
        ['An extra row and a missing row of the same amount can cancel out', true],
        ['Nothing, because equal counts and totals prove the rows are equal', false],
        ['Only the column order, which reconciliation does not need to check', false],
        ['Only the CSV encoding, because the numbers themselves are correct', false],
      ], 'Aggregates can agree by accident, as a wrong-day booking replacing a missing one of the same price would; only key-level anti-joins in both directions show it. Equal totals prove nothing about which rows, and values such as names can also be wrong when CSV quoting is broken.'),
      mcq('Why should a reconciliation compare money in integer paise rather than summed float rupees?', [
        ['Float sums can carry tiny errors that fail or hide an exact comparison', true],
        ['DuckDB cannot sum DECIMAL columns read in from any CSV export file', false],
        ['Integer comparisons run faster than float ones on large exports', false],
        ['Paise values stay readable for finance users when they open files', false],
      ], 'Binary floats cannot represent most decimal fractions exactly, so sums drift and an equality check becomes unreliable; integer paise compare exactly (510000 against 425000 in the failing test). DuckDB sums DECIMAL fine, speed is not the reason, and finance reads rupees, not paise.'),
    ],
  },
];
