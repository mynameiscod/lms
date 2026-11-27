/**
 * Career-track content: Python for Ingestion (DE_PYTHON_INGESTION), Data Engineer, batch DE1.
 *
 * Getting data in, reliably: choosing and converting file formats without losing types, pulling from paginated,
 * rate-limited APIs with retries and backoff, extracting incrementally from operational databases with watermarks,
 * writing loads that are safe to run twice, and structuring pipeline code with configuration, structured logs and
 * pytest. It builds on Core Python and pytest, the years' SQL and "Transactions, Constraints and Integrity", and the Data
 * Analytics track's "Series, DataFrames and Reading Data", "Types and Parsing" and "Data Quality Checks You Can
 * Rerun"; those are referred to by title, not re-taught. Upserts in SQL are taught fully in DE_SQL_ENGINEERING.
 *
 * One fictional company runs through the topic: TiffinTrail, a Hyderabad food-delivery start-up whose data team
 * lands orders, payment settlements and restaurant menus every day. Every output quoted in the notes is real output
 * from Python 3 with pandas 3.0, pyarrow 25, fastavro, DuckDB 2.0, sqlite3, requests and pytest 9 on synthetic data:
 * the format sizes and dtype round trips, a local fake API (http.server) with cursor pagination, a rate limit and
 * injected 503s, sqlite watermark extracts, DuckDB/pyarrow loads run twice, and a 12-test pytest suite that passes.
 * Not run: anything against a real cloud service or a real PostgreSQL/MySQL server (PostgreSQL behaviour is quoted
 * from its documentation and marked as such), and Debezium/CDC tooling, which is described in outline only.
 *
 * Skills: ETL_FUNDAMENTALS by default; the idempotent-loads and pipeline-code lessons are DATA_PIPELINES, and
 * checkpoint questions elsewhere that are plainly about load safety or pipeline engineering use ck('DATA_PIPELINES', ...).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_DE_PYTHON_INGESTION_BUNDLES: PilotBundle[] = [
  /* ── FILE_FORMATS ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_PYTHON_INGESTION_FILE_FORMATS',
    notes: `TiffinTrail, a food-delivery start-up in Hyderabad, receives data in every shape: restaurant partners email CSV
menus, the app's event service writes JSON, the payments partner streams Avro, and the analysts want Parquet. In
"Series, DataFrames and Reading Data" you read a CSV into pandas; here the question is different: which format
should data live in, and what silently breaks when you convert between them?

## The experiment

Generate 200,000 synthetic orders with eight columns that look like real ones: int64 ids, an int32 restaurant
id, a category (city), a code with leading zeros (outlet_code, e.g. "004512"), a float amount, a nullable integer
tip (Int64, 70% missing), a timezone-aware timestamp in Asia/Kolkata, and a boolean. Write the same DataFrame
five ways and look at the files:

    orders.csv                 13.5 MB
    orders.csv.gz               3.3 MB
    orders.jsonl               32.0 MB
    orders.avro                 3.6 MB    (fastavro, deflate codec)
    orders_snappy.parquet       4.3 MB
    orders_zstd.parquet         3.3 MB

JSON lines is the biggest because every row repeats every key. Gzip shrinks CSV a lot, but a .csv.gz cannot be
split or read column by column; to read one column you decompress everything.

## Round trips: what survives

Read each file back with no hints, the way most scripts do:

    CSV                       JSON lines                       Parquet
    restaurant_id  int64      restaurant_id  int64             restaurant_id  int32
    city           str        city           str               city           category
    outlet_code    int64      outlet_code    int64             outlet_code    str
    tip            float64    tip            float64           tip            Int64
    placed_at      str        placed_at      datetime64[us, UTC]   placed_at  datetime64[us, Asia/Kolkata]

    outlet_code sample: [120044, 4512, 300871, 93310]  original: ['120044', '004512', '300871', '093310']
    Parquet equal to original: True

CSV lost five things: the leading zeros (a code is not a number), the nullable integer (missing values forced it
to float64), the timestamp (a string now), the category and the int32 width. JSON lines kept the instant but moved
it to UTC and dropped the +05:30 offset. Parquet gave back exactly what was written, because the schema travels
inside the file. CSV can be read correctly, but only if you tell it everything, every time:

    pd.read_csv("orders.csv", dtype={"outlet_code": "string", "tip": "Int64", "city": "category"},
                parse_dates=["placed_at"])

That is the real cost of CSV: the schema lives in someone's head, so every reader re-guesses it.

## Inside a Parquet file

Parquet is **columnar**: rows are grouped into row groups (here one group of 200,000 rows), and inside a row group
each column is stored together as a column chunk, encoded (dictionary, run-length) and compressed. The footer holds
the schema and, per column chunk, statistics such as min and max:

    num_rows: 200000   num_row_groups: 1   num_columns: 8
    city: dictionary<values=string, indices=int8>
    order_id  min 1      max 200000   compressed 1,071,978 bytes
    amount    min 80.01  max 1500.0   compressed   927,958 bytes

Two consequences make Parquet the default for analytics. **Column projection**: reading two of eight columns read
only those chunks (0.013 s against 0.226 s for the same two columns from CSV on this laptop). **Predicate
pushdown**: with filters=[("amount", ">", 1400)], a reader can skip whole row groups whose max is below 1400. Spark,
DuckDB, Athena and Synapse all use these statistics, which is why a query engine charges less to scan Parquet.

Snappy compresses less but decompresses very fast; zstd is smaller (3.3 MB here) at a little more CPU. Either is
fine; pick one per platform and stop debating.

## Avro: rows, with a schema

Avro is a compact **row-based** binary format with the schema (JSON) in the file header. It is the usual choice for
records in flight, such as Kafka messages, because a writer appends one record at a time and readers handle
**schema evolution** by rules. A v1 file read with a v2 reader schema that adds a field with a default:

    [{'txn_id': 1, 'amount_paise': 19990, 'upi_app': 'unknown'}]

The same new field without a default fails: SchemaResolutionError: No default value for field upi_app in Payment.
Rule: new fields get defaults, or old data cannot be read. Avro is poor for analytics: to sum one column you read
every row.

## Money and time

    0.1 + 0.2  ->  0.30000000000000004

Store money as integer paise or as a decimal type (Parquet decimal128(12, 2) round-tripped 199.90 + 0.10 + 0.20 to
exactly 200.20). Store timestamps as UTC with the zone recorded; convert to IST only for display.

## Partitioned layouts

Writing the orders with partition_cols=["order_date"] created 30 folders named order_date=2026-10-01 and so on (the
"Hive" layout). A query for one day touched one folder: 6,567 rows, the other 29 never opened. Partition by the
column most queries filter on (usually a date), and keep files large: thousands of tiny Parquet files are slower than
a few big ones because every file costs an open and a footer read. Aim for files in the tens to hundreds of MB.

## Choosing

    Format       Good at                                      Bad at
    CSV          everyone can open it; partners send it       types, nulls, nesting, size, splitting
    JSON lines   nested API payloads, raw landing             size, types (numbers vs codes), speed
    Avro         streams, record-at-a-time writes, evolution  analytical scans of a few columns
    Parquet      analytics, compression, pruning, types       appending one row; humans reading it

The rule TiffinTrail follows: **land exactly what you received** (CSV, JSON, Avro) in a raw zone, then convert to
Parquet with an explicit schema as the next step. Delta Lake and Iceberg, which you meet later, are table formats
built on Parquet files. On AWS the lake is S3 and Athena or Glue read the Parquet; on Azure it is ADLS Gen2 with
Synapse or Fabric reading the same files.`,
    workedExample: `**Scenario.** A restaurant partner uploads menu_2026-10-26.csv every morning. Item codes such as 000123 must stay
strings, prices are rupees with paise, and updated_at carries +05:30. Convert it to Parquet so that nothing is
guessed, and make a bad file fail loudly instead of loading wrong values.

**Step 1: write the schema down.** The schema is a contract, so it lives in code, not in the reader's head:

    schema = pa.schema([
        ("item_code", pa.string()),
        ("restaurant_id", pa.string()),
        ("item_name", pa.string()),
        ("price_inr", pa.decimal128(10, 2)),
        ("is_veg", pa.bool_()),
        ("updated_at", pa.timestamp("us", tz="UTC")),
    ])

**Step 2: read with it, then write Parquet.**

    t = pv.read_csv("menu_2026-10-26.csv",
                    convert_options=pv.ConvertOptions(column_types=schema, include_columns=schema.names))
    pq.write_table(t.select(schema.names).cast(schema), "menu_2026-10-26.parquet", compression="zstd")

**Step 3: prove the round trip.**

    {'item_code': '000123', 'restaurant_id': 'R0042', 'item_name': 'Masala Dosa',
     'price_inr': Decimal('89.00'), 'is_veg': True, 'updated_at': datetime(2026, 10, 26, 3, 45, tzinfo=UTC)}
    schema matches: True

The code kept its zeros, the price is an exact decimal, and 09:15 IST became 03:45 UTC: the same instant.

**Step 4: a bad file.** The next day a partner exports "1,099.00" with a thousands separator:

    ArrowInvalid In CSV column #3: The string '1,099.00' is not a valid decimal128 number

That failure is the point. A script that lets pandas guess would read the column as text, the price would never
reach a SUM, and nobody would notice for a week. Failing at the boundary, with the column named, is a five-minute fix.

**What to say in review.** Raw CSV kept untouched in the raw zone; an explicit schema in code; Parquet with zstd in the
clean zone; a bad file stops the run with a clear error instead of loading wrong types.`,
    mcqs: [
      mcq('TiffinTrail reads outlets.csv with plain pd.read_csv and outlet code "004512" becomes 4512. What is the correct fix?', [
        ['Pass dtype={"outlet_code": "string"} so the code is never parsed as a number', true],
        ['Pad the integer back with zfill(6) after reading, which restores the original code', false],
        ['Save the file as orders.csv.gz instead, since gzip keeps leading zeros intact', false],
        ['Use pd.read_json on the same data, because JSON readers keep codes as text', false],
      ], 'A code is an identifier, so it must be read as a string. zfill guesses the original width and breaks when codes differ in length, compression changes size not parsing, and pandas\' JSON reader also turned outlet_code into int64 in the experiment.'),
      mcq('A 200,000-row orders file is 13.5 MB as CSV and 4.3 MB as snappy Parquet. Why is the Parquet file so much faster for "average amount by city"?', [
        ['The engine reads only the city and amount column chunks', true],
        ['Parquet files are cached in memory by the operating system', false],
        ['Parquet stores pre-computed averages for each column', false],
        ['Snappy decompresses faster than the CSV parser can tokenise rows', false],
      ], 'Columnar storage lets a reader fetch two of eight columns and skip the rest (0.013 s against 0.226 s in the experiment). The OS caches any file, Parquet keeps min/max statistics but not averages, and decompression speed alone does not explain skipping six columns.'),
      mcq('A payments team adds a field upi_app to its Avro schema. Old files must still be readable with the new schema. What must the new field have?', [
        ['A default value in the reader schema', true],
        ['A logicalType annotation such as uuid', false],
        ['A position at the start of the record', false],
        ['A union type that excludes null', false],
      ], 'Avro schema resolution fills a field missing from old data with its default; without one, fastavro raised SchemaResolutionError. Logical types and field order do not help, and a null-free union still has nothing to fill old records with.'),
    ],
    checkpoint: [
      mcq('Which format would you choose for the analysts\' copy of three years of order history that they query by date and a few columns?', [
        ['Parquet, partitioned by order date', true],
        ['Gzipped CSV, one file per month of orders', false],
        ['JSON lines, so that nested fields stay readable', false],
        ['Avro, since it carries the schema in each file', false],
      ], 'Parquet gives column projection, statistics for skipping, types and compression, and date partitions let a query open only the days it needs. Gzipped CSV cannot be read by column, JSON lines is the largest and slowest, and Avro is row-based, which suits streams rather than scans.'),
      mcq('After a CSV round trip, a nullable integer column "tip" with many missing values comes back as float64. Why?', [
        ['Missing values in a plain integer column force pandas to use float with NaN', true],
        ['CSV stores every number as a 64-bit float in the file header', false],
        ['pandas rounds integers to floats whenever a file is above 10 MB', false],
        ['The tip values were written with decimals in the original file', false],
      ], 'Without a dtype hint, pandas parses a numeric column with blanks as float64 because NaN is a float. CSV has no header types, file size is irrelevant, and the tips were whole numbers; reading with dtype={"tip": "Int64"} keeps them integers.'),
      mcq('Why does a team store rupee amounts as integer paise or decimal128 rather than float64?', [
        ['Binary floats cannot represent most decimal fractions exactly, so sums drift', true],
        ['Float64 columns cannot be written to Parquet files by pyarrow at all', false],
        ['Integer and decimal columns compress to roughly a tenth of the size', false],
        ['Query engines refuse to sum float columns that represent currencies', false],
      ], '0.1 + 0.2 printed 0.30000000000000004; across millions of rows such errors make ledgers disagree. Parquet stores floats fine, the compression gain is not the reason, and engines happily sum floats, which is exactly the danger.'),
    ],
  },

  /* ── API_INGESTION ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_PYTHON_INGESTION_API_INGESTION',
    notes: `TiffinTrail's payment partner exposes settlements (money paid out to restaurants) through a REST API: Bearer-token
auth, 50 rows per page by default, a cursor for the next page, at most four requests per second, and the occasional
503 when its own systems are busy. Your job is to land every settlement in the lake every hour, without losing a row,
without hammering the partner, and without re-downloading everything each time.

The code below ran against a small fake API (Python's http.server in a thread) that behaves exactly like that:
it returns 401 without the token, 429 with "Retry-After: 1" above four calls a second, and a 503 on every seventh call.

## Pagination: follow what the server gives you

APIs paginate in three common ways:

- **Offset/page number** (?page=3 or ?offset=100). Simple, but if rows are inserted while you page, rows shift
  between pages and you skip or repeat some.
- **Cursor** (?cursor=opaque). The server returns next_cursor; you pass it back unchanged and stop when it is null.
  Stable under inserts; prefer it whenever it is offered.
- **Time window** (?updated_since=...&updated_before=...). Lets you ask for changes only; combine with a cursor
  inside the window.

The loop is always the same: request, save, read next_cursor, stop when there is none. Never compute the next page
yourself when the server hands you a cursor.

## Retries with backoff, and what not to retry

    RETRYABLE = {429, 500, 502, 503, 504}

    def get_with_retries(session, url, params, max_attempts=6, base=0.5, cap=8.0):
        for attempt in range(1, max_attempts + 1):
            try:
                resp = session.get(url, params=params, timeout=(3.05, 30))
            except (requests.ConnectionError, requests.Timeout) as exc:
                status, wait = type(exc).__name__, None
            else:
                if resp.status_code == 200:
                    return resp
                if resp.status_code not in RETRYABLE:
                    raise FatalHTTPError(f"{resp.status_code}: {resp.text[:200]}")
                status = resp.status_code
                wait = float(resp.headers["Retry-After"]) if "Retry-After" in resp.headers else None
            if attempt == max_attempts:
                raise FatalHTTPError(f"gave up after {attempt} attempts, last={status}")
            if wait is None:
                wait = random.uniform(0, min(cap, base * 2 ** attempt))   # exponential, full jitter
            time.sleep(wait)

Four decisions are in those lines:

1. **A timeout on every call.** requests has no default timeout; without one a hung connection hangs the job for
   ever. (3.05, 30) is connect and read timeouts.
2. **Retry only what can succeed later**: 429, 5xx and network errors. A 401 or 400 will fail the same way every
   time; retrying it only delays the alert. In the run: fatal: 401: {"error": "invalid token"}, on the first attempt.
3. **Honour Retry-After** when the server sends it; it knows its own limits.
4. **Exponential backoff with jitter.** Waits grow (1, 2, 4, 8 s, capped) and are randomised so that twenty workers
   that failed together do not retry together and knock the service over again.

A retry also means the same request may reach the server twice, so only retry requests that are safe to repeat.
GET is; a POST that creates something needs an idempotency key, which payment APIs support for exactly this reason.

## Rate limits: stay under, not just recover

Four requests per second is 240 per minute. If the partner allows that, plan for less: throttle yourself (a sleep
between pages or a token bucket) and treat 429 as a signal you planned badly. Ask for the largest page size the
API allows; 250 rows at 50 a page is five requests, at 100 a page it is three.

## Authentication

Tokens come from the environment or a secrets manager (AWS Secrets Manager, Azure Key Vault), never from the code
or the repo: s.headers["Authorization"] = f"Bearer {os.environ['SETTLEMENTS_TOKEN']}". OAuth client-credentials
tokens expire, so refresh on 401 once, then fail. Never log the header.

## Incremental pulls and landing raw

    def ingest(state_file="lake/_state/settlements.json", page_size=50):
        state = json.loads(Path(state_file).read_text()) if Path(state_file).exists() else {"watermark": ""}
        run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S") + "-" + uuid.uuid4().hex[:6]
        out_dir = Path(f"lake/raw/settlements/run_id={run_id}")
        ...
        while True:
            resp = get_with_retries(s, BASE_URL, params)
            page_no += 1
            (out_dir / f"page_{page_no:04d}.json").write_bytes(resp.content)   # raw, untouched
            ...
        (out_dir / "_SUCCESS").write_text(json.dumps({"pages": page_no, "rows": rows}))
        tmp.write_text(json.dumps({"watermark": max_seen, "last_run_id": run_id}))
        os.replace(tmp, state_path)   # the watermark moves only after the data has landed

Three runs, with ten new settlements and one reversal arriving upstream between the first and second:

    attempt 1: 429, sleeping 1.00s
    run acd565: 5 pages, 250 rows, watermark -> 2026-10-20T04:10:00Z
    attempt 1: 503, sleeping 0.13s
    run ac8bf5: 1 pages, 11 rows, watermark -> 2026-10-20T05:10:00Z
    run d72083: 1 pages, 0 rows, watermark -> 2026-10-20T05:10:00Z

The second run fetched only the 11 changed rows; the third, nothing. Note what the code does not do:

- It does not parse, rename or drop fields before saving. The response bytes are stored as received, so when a bug
  is found next month you re-process from raw instead of asking the partner for six months of history.
- It does not move the watermark until every page is on disk and _SUCCESS is written. A crash on page 4 leaves the
  old watermark, the next run repeats the window, and downstream readers ignore folders without _SUCCESS.
- It takes the watermark from the data (max updated_at seen), not from the clock of the machine running the job.

Repeating a window means the same settlement can land twice; that is fine, because the load step deduplicates on
settlement_id (the idempotent loads lesson). AWS runs this pattern as a Lambda or a Glue Python shell job writing to
S3; on Azure, an Azure Function or a Data Factory REST copy writing to ADLS Gen2.`,
    workedExample: `**Scenario.** The partner tells TiffinTrail that on sale days (a cricket final, Diwali) there are about 1.2 million
settlements, the API allows 4 requests per second with at most 100 rows a page, and finance needs the data within
an hour of the day closing. Will the hourly job keep up, and what changes if it crashes half-way?

**Step 1: requests needed.** 1,200,000 / 100 rows = 12,000 requests. At page size 50 it would be 24,000.

**Step 2: time at the limit.** 12,000 / 4 per second = 3,000 s = 50 minutes, if nothing fails. Plan at 80% of the
limit to leave room for retries and for other clients on the same key: 12,000 / 3.2 = 3,750 s, about 62 minutes.
That misses the one-hour target on the worst day.

**Step 3: options, cheapest first.**

- Pull hourly through the day instead of once at night: the 1.2 million spread over 24 runs is roughly 50,000 rows
  (500 requests, about 3 minutes) per run.
- Ask the partner for a bulk export (a daily file in S3) for the full day and use the API only for the last hour.
- Parallelise by merchant range, only if the partner's limit is per merchant or per endpoint; four workers sharing
  one 4-per-second key gain nothing and earn more 429s.

**Step 4: the crash.** The job dies at page 7,000 of 12,000. Because the watermark moves only after _SUCCESS, the
next run starts again from the old watermark, and the 7,000 landed pages sit in a folder that downstream readers skip.
That costs 7,000 repeated requests. If that is too expensive, save the cursor after each page in a checkpoint file
(run_id, last cursor) and resume from it when the same run restarts; the watermark still moves only at the end.

**Step 5: what the reviewer checks.** Page size at the API's maximum, a self-imposed throttle below the limit,
Retry-After honoured, a per-run folder with _SUCCESS, the watermark taken from the data, and a load step that
deduplicates on settlement_id, so repeating a window is harmless.`,
    mcqs: [
      mcq('The settlements API returns 401 for a run because the token was rotated. What should the ingestion code do?', [
        ['Fail at once with a clear error, after at most one token refresh', true],
        ['Retry six times with exponential backoff, the same as for a 503', false],
        ['Skip the page and continue, so that the remaining pages still land', false],
        ['Lower the page size, since a 401 often means the response was too big', false],
      ], 'Authentication errors do not fix themselves with time, so retrying only delays the alert; one refresh for an expired OAuth token is reasonable. Skipping a page silently loses data, and 401 is about credentials, not response size.'),
      mcq('Twenty TiffinTrail workers get 503 at the same moment and all retry after exactly 2 seconds. What is the problem, and the fix?', [
        ['They hit the API together again; add random jitter to each wait', true],
        ['Two seconds is too short; always wait a fixed 60 seconds instead', false],
        ['503 is not retryable; workers should stop and page the on-call', false],
        ['They should switch to POST requests, which are not rate limited', false],
      ], 'Synchronised retries recreate the spike that caused the 503. Jitter spreads them out. A fixed long wait wastes time and still synchronises, 503 is a classic retryable status, and POST is neither exempt from limits nor safe to repeat.'),
      mcq('Why does the ingest function write the new watermark only after every page and the _SUCCESS marker are on disk?', [
        ['A crash mid-run then repeats the window instead of skipping rows', true],
        ['Writing state first would make the API return pages out of order', false],
        ['The partner\'s API rejects requests while a state file is open', false],
        ['It makes each run download fewer pages than the run before it', false],
      ], 'If the watermark moved first and the job died, the next run would start after rows that never landed, losing them for good. The API does not know about the state file, and the ordering is about correctness, not page counts.'),
    ],
    checkpoint: [
      mcq('An API offers both ?page=N and a next_cursor field. New orders arrive while you page through. Which should you use?', [
        ['The cursor, passing back exactly what the server returned', true],
        ['Page numbers, because you can fetch the pages in any order you like', false],
        ['Page numbers, sorted descending so new rows come last', false],
        ['Either; inserts during paging never change page contents', false],
      ], 'Cursor pagination is stable under concurrent inserts because the server continues from a position, not a row count. With page numbers, inserted rows shift later rows into the next page, so rows are skipped or repeated; inserts do change page contents.'),
      mcq('Which call is missing something a production pipeline needs: session.get(url, params=params)?', [
        ['A timeout, since requests waits for ever by default', true],
        ['A User-Agent header, which servers require for every GET', false],
        ['stream=True, which every JSON response requires', false],
        ['verify=False, so certificate errors do not stop it', false],
      ], 'requests has no default timeout, so one hung connection hangs the whole job. User-Agent is sent by default, streaming is for large downloads, and disabling certificate checks is a security hole, not a fix.'),
      mcq('A data engineer saves the API\'s JSON exactly as received, before any parsing. What is the main benefit?', [
        ['The data can be reprocessed after a bug fix without calling the API again', true],
        ['Raw JSON is smaller than Parquet, so it saves storage costs over time', false],
        ['The raw files can be queried faster than the cleaned tables can be', false],
        ['It removes the need for a watermark between incremental runs', false],
      ], 'Raw landing is insurance: a parsing bug found later is fixed by re-reading raw files, which the partner may no longer serve. Raw JSON is larger and slower than Parquet, and incremental pulls still need a watermark.'),
    ],
  },

  /* ── DATABASE_EXTRACTS ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_PYTHON_INGESTION_DATABASE_EXTRACTS',
    notes: `TiffinTrail's orders live in the app's database, which also serves every customer placing an order. The data team
needs a copy in the lake every hour. The rule that shapes everything here: **the production database belongs to the
customers**. An extract that slows checkout at 8 p.m. on a Friday is an incident, however correct its data is.

The examples ran on sqlite with 100,000 synthetic orders; the SQL and the ideas carry over to PostgreSQL and MySQL
("Reading a Query Plan" and "Deadlocks and Long Transactions" from Year 3 are the background).

## Full or incremental

**Full extract**: read the whole table every run. Simple, always correct, catches deletes, and fine for small tables
(5,000 restaurants, a city list). It does not scale: 40 million orders every hour is a full scan every hour.

**Incremental extract**: read only rows changed since the last run, using a **watermark**, the highest change
marker you have already loaded. It needs a column that reliably changes on every insert and update: an updated_at
maintained by the application or a trigger, or a monotonically increasing id for append-only tables such as a ledger.

## Reading in chunks

Even a full extract must not load everything into memory at once:

    for n, chunk in enumerate(pd.read_sql("SELECT * FROM orders", src, chunksize=25_000)):
        chunk.to_parquet(f"extract/full/part-{n:04d}.parquet", index=False)

    chunk 0: 25000 rows, 2.4 MB in memory
    ...
    full extract rows: 100000

Memory stays at one chunk. (With SQLAlchemy and PostgreSQL, add execution_options(stream_results=True) so the
driver uses a server-side cursor; otherwise some drivers fetch the whole result before pandas sees the first chunk.)

## The watermark query, and the index it needs

    df = pd.read_sql("SELECT * FROM orders WHERE updated_at > ? ORDER BY updated_at, order_id",
                     conn, params=(since,))

Always a bound parameter, never string formatting. And the filter must be able to use an index:

    SEARCH orders USING INDEX ix_orders_updated (updated_at>?)   <- WHERE updated_at > '2026-10-20T00:00:00'
    SCAN orders                                                  <- WHERE date(updated_at) > '2026-10-20'

Wrapping the column in a function turned an index range read into a scan of every row. On a 40-million-row table
that is the difference between milliseconds and a production slowdown.

## Two ways a watermark loses rows

Runs against the sqlite source:

    first incremental: 100000 watermark 2026-10-26T10:40:00
    second: 3 [5, 6, 7]                         # three refunds stamped 2026-10-27T09:00
    third (no lookback): 0 -> order 8 missed    # a slow transaction committed a row stamped 08:59

**Late commits.** updated_at is set when the statement runs, but the row becomes visible when the transaction
commits. A transaction that started at 08:59 and committed at 09:01 has a timestamp below a watermark of 09:00 that
was taken in between. The fix is a **lookback**: read from watermark minus a safety window and deduplicate later.

    with 10-minute lookback: [8, 5, 6, 7]   (re-reads 5, 6, 7; dedup downstream)

Add an upper bound too: read up to now minus a few minutes rather than up to now, so rows still being written are
picked up by the next run, not half-read by this one.

**Hard deletes.** A deleted row has no updated_at to find:

    after hard delete, incremental sees: 0 rows; source count 99999

Options: ask the application team for soft deletes (deleted_at), run a periodic full key comparison (extract only
the ids, compare with the lake), or use change data capture.

## Change data capture, in outline

CDC reads the database's own change log instead of querying tables: the PostgreSQL write-ahead log through logical
replication, or the MySQL binlog. Tools such as Debezium (usually into Kafka) or AWS DMS emit every insert, update
and delete in commit order, including deletes and the before-image of updates, with almost no load on the tables.
The price is operational: replication slots that must be monitored (an abandoned slot makes PostgreSQL keep WAL until
the disk fills), schema changes to handle, and one more system to run. Use watermarks first; move to CDC when you need
deletes, sub-minute latency or very large tables. Azure's equivalents are Data Factory's incremental copy and CDC.

## Not hurting production

- Extract from a **read replica**, not the primary, where one exists.
- Use a dedicated read-only user with a statement timeout, so a bad query is killed rather than left running.
- Run large backfills off-peak, in chunks, with **keyset pagination** instead of OFFSET:

      SELECT order_id, updated_at FROM orders WHERE (updated_at, order_id) > (?, ?)
      ORDER BY updated_at, order_id LIMIT 40000
      -- plan: SEARCH orders USING COVERING INDEX ix_orders_updated (updated_at>?)

  OFFSET 2,000,000 makes the database read and discard two million rows for every page; keyset continues from the
  last key it returned, using the index. The tie-breaker (order_id) matters: many rows share an updated_at.
- Select the columns you need, not SELECT * on a table with a 2 MB JSON column.
- Keep each read short: a transaction held open for an hour on PostgreSQL holds back vacuum for the whole database.

Land each extract as Parquet in a run folder, exactly as the API lesson did, and let DuckDB check it:

    SELECT count(*), min(updated_at), max(updated_at) FROM 'extract/full/*.parquet'
    [(100000, '2026-10-01T00:00:00', '2026-10-26T10:40:00')]`,
    workedExample: `**Scenario.** TiffinTrail asks for three tables in the lake every hour. Choose an extract strategy for each and say
what could go wrong.

**The tables.**

    Table          Rows        Changes                               Columns of note
    restaurants    5,200       edited by ops a few times a day       no updated_at
    orders         40 million  inserted and updated (status flow)    updated_at set by the app, indexed
    ledger_entries 300 million append-only, never updated            entry_id BIGINT identity

**restaurants: full extract.** 5,200 rows is one small query; reading all of it each hour is cheaper than building
anything clever, it catches deletes for free, and there is no reliable change column anyway. Load it as a full
replace of the target table (next lesson).

**orders: incremental on updated_at.** Query updated_at > watermark minus a 15-minute lookback and up to now minus 2
minutes, ordered by (updated_at, order_id), in keyset pages of 50,000 from the read replica. Deduplicate on order_id,
keeping the latest updated_at. Two checks before trusting it: is updated_at really set on every update path,
including the nightly admin script that edits rows directly? And are orders ever hard-deleted? If either answer is
"sometimes", add a nightly full comparison of order_id against the lake, or ask for CDC.

**ledger_entries: incremental on entry_id.** Append-only with an identity column, so WHERE entry_id > last_id ORDER
BY entry_id is a clean watermark. One trap: identity values are allocated before commit, so entry 1001 can commit after
1002. A small lookback on the id (re-read the last few thousand ids) plus dedup on entry_id covers it.

**What to write in the design note.**

- The replica's lag: if the replica is 5 minutes behind, the extract is too; take the watermark from the data.
- A read-only user with a statement timeout of a few minutes.
- The first load (the backfill) is separate: chunked by month, run at night, resumable.
- Row counts per run logged, and a daily reconciliation: count of orders per day in the source against the lake.`,
    mcqs: [
      mcq('An hourly extract filters WHERE date(updated_at) >= ? on a 40-million-row orders table and slows the app. Why?', [
        ['The function on the column stops the database using the updated_at index', true],
        ['date() forces the database to lock the table for the duration of the read', false],
        ['Reading by date returns more rows than an equivalent timestamp filter would', false],
        ['Bound parameters are slower than literal values typed into the query text', false],
      ], 'The sqlite plan changed from SEARCH USING INDEX to SCAN when the column was wrapped in date(). Plain reads do not lock the table, the row count depends on the range not the syntax, and bound parameters are the correct, safe way to pass values.'),
      mcq('A TiffinTrail extract uses WHERE updated_at > :watermark. A row stamped 08:59 commits at 09:01, after a run took the watermark 09:00. What happens, and the fix?', [
        ['The row is never extracted; re-read a lookback window and dedupe', true],
        ['The row arrives in the next run, since commit time is what counts', false],
        ['The database rejects the late commit, so no data can be lost', false],
        ['The row is read twice; switch the filter from > to >= at once', false],
      ], 'The filter compares stored timestamps, and 08:59 is below the saved watermark, so later runs skip it; the run showed "order 8 missed". Commit time is not stored, databases accept the commit, and >= only re-reads rows exactly at the watermark.'),
      mcq('A backfill pages through orders with LIMIT 50000 OFFSET n. Page 800 takes minutes. What is the better approach?', [
        ['Keyset pagination: WHERE (updated_at, order_id) > (last values) with LIMIT', true],
        ['A bigger OFFSET step, so that fewer pages are needed to reach the end of the table', false],
        ['ORDER BY RANDOM() so that the pages spread their load across the disk', false],
        ['Removing ORDER BY, since the database returns rows in insert order anyway', false],
      ], 'OFFSET makes the database read and discard every earlier row, so later pages get slower; keyset continues from the last key through the index. Bigger steps do not remove the discarding, random order breaks paging, and without ORDER BY there is no guaranteed order.'),
    ],
    checkpoint: [
      mcq('The source deletes cancelled orders outright. What will an updated_at watermark extract do about them?', [
        ['Miss the deletes entirely; the lake keeps the rows', true],
        ['Pick them up as rows with a NULL updated_at value', false],
        ['Fail with an error the next time it runs its query', false],
        ['Remove them from the lake on the following run', false],
      ], 'A deleted row has no updated_at to match, so the query never sees it and the lake keeps a row the source no longer has. Soft deletes, a periodic key comparison or CDC are the fixes.'),
      mcq('When is a full extract the right choice over an incremental one?', [
        ['A small table with no reliable change column, where deletes matter', true],
        ['A 300-million-row append-only ledger with an identity key column', false],
        ['Any table at all, as long as the extract runs on the primary database', false],
        ['A large table whose updated_at is indexed and set on every update', false],
      ], 'Small tables are cheap to read fully, and a full read catches deletes without any change column. The ledger and the indexed orders table are textbook incremental cases, and running on the primary is a reason to read less, not more.'),
      mcq('What does change data capture read, compared with a watermark query?', [
        ['The database\'s change log, so it sees deletes and every update', true],
        ['The table every hour, comparing each row with the previous copy', false],
        ['Application logs, parsing the SQL statements the app executed', false],
        ['A trigger table that the data team adds to every source table', false],
      ], 'CDC tools read the write-ahead log or binlog, which records every insert, update and delete in commit order with little load on the tables. Hourly comparison is a full diff, app logs are not a reliable change record, and triggers are a different, heavier technique.'),
    ],
  },

  /* ── IDEMPOTENT_LOADS ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_PYTHON_INGESTION_IDEMPOTENT_LOADS',
    notes: `Every pipeline is run twice sooner or later: a scheduler retries after a timeout, someone clicks "re-run" after a
fix, a backfill covers days that were already loaded, the API lesson repeated a window on purpose. A load is
**idempotent** when running it again with the same input leaves the target exactly as one run did. If your loads
are not, every retry is a data incident.

All results below are from DuckDB 2.0 and pyarrow, each load run twice.

## The naive append

    for run in range(2):
        con.execute("INSERT INTO fact_orders_append SELECT *, 'r', now() FROM batch")

    append twice: (2000, 500000.0)       # 1,000 orders, revenue doubled

Nothing failed. The dashboard showed double revenue for 25 October until finance asked. That is the danger: a
non-idempotent load does not error, it lies.

## Pattern 1: replace the partition

When a batch is "everything for one day", make the load "replace that day": delete the partition, insert the batch,
in **one transaction**.

    def load_day(con, df, day, run_id):
        con.execute("BEGIN")
        try:
            con.execute("DELETE FROM fact_orders WHERE order_date = ?", [day])
            con.execute("INSERT INTO fact_orders SELECT *, ?, now() FROM df", [run_id])
            con.execute("COMMIT")
        except Exception:
            con.execute("ROLLBACK")
            raise

    overwrite twice: (1000, 250000.0, 'run-1')
    crash: worker killed -> rows still 1000

Run twice, still 1,000 rows. Killed between the DELETE and the INSERT, the transaction rolled back and the old day
was still there, rather than an empty day on the dashboard. The partition key must match the batch exactly: a batch
for 25 October that also contains three late orders from the 24th would delete the 25th and insert into both.

The same idea for files: pyarrow's write_dataset with existing_data_behavior="delete_matching" replaces the
partition folders it writes to.

    files append:    2 files, 2000 rows    # existing_data_behavior="overwrite_or_ignore" + unique file names
    files overwrite: 1 files, 1000 rows    # existing_data_behavior="delete_matching"

Spark's equivalent is dynamic partition overwrite (spark.sql.sources.partitionOverwriteMode=dynamic); Delta Lake
offers replaceWhere. Plain files have no transaction, so a crash mid-write can leave a partial folder; table formats
(Delta, Iceberg) fix that, which is one reason they exist.

## Pattern 2: upsert on a key

When a batch is "changes to some rows" (an incremental extract), insert new keys and update existing ones. You
will meet MERGE and ON CONFLICT fully in "Upserts with MERGE and INSERT ... ON CONFLICT"; the point here is what
makes an upsert idempotent.

**Deduplicate the batch first.** The change batch held order 5 twice (OUT_FOR_DELIVERY at 10:00, REFUNDED at 11:00).
Without dedup:

    INSERT INTO t SELECT * FROM ch ON CONFLICT (order_id) DO UPDATE SET status = excluded.status
    [(5, 'OUT_FOR_DELIVERY'), (6, 'A')]

DuckDB 2.0 silently kept the first row it met: the refund was lost, and with another row order the answer would
differ. (PostgreSQL refuses instead: "ON CONFLICT DO UPDATE command cannot affect row a second time".) Keep the
latest version per key before the upsert:

    INSERT INTO fact_orders
      SELECT order_id, order_date, status, amount_paise, ?, now() FROM changes
      QUALIFY row_number() OVER (PARTITION BY order_id ORDER BY updated_at DESC) = 1
    ON CONFLICT (order_id) DO UPDATE SET status = excluded.status, amount_paise = excluded.amount_paise,
        _run_id = excluded._run_id, _loaded_at = excluded._loaded_at

    upsert twice: 1001 [(5, 'REFUNDED', 'up-1'), (2001, 'DELIVERED', 'up-1')]

**Guard against old data.** If a late, older change can arrive after a newer one (the lookback re-reads rows), add
WHERE excluded.updated_at >= target.updated_at to the update so that an old version never overwrites a new one.

## Pattern 3: remember what you loaded

For file drops (a partner's daily CSV), keep a table of processed files and skip them:

    run 0: loaded ['settlements_2026-10-24.csv', 'settlements_2026-10-25.csv']
    run 1: loaded []

Insert the file's row in the same transaction as its data, so "loaded" and "recorded as loaded" cannot disagree.

## Run ids and checkpoints

Stamp every row with the _run_id that wrote it and keep a load audit table (run_id, partition, rows, started,
finished, status). When numbers look wrong you can ask "which run wrote these rows?" and delete exactly that run's
output. A **checkpoint** (last file, last cursor, last chunk) lets a long job resume where it stopped; write it
atomically (write a temp file, then os.replace) and only after the work it records is committed.

## Choosing

    Batch is...                        Load as...
    a whole day / partition            delete + insert that partition in one transaction
    changed rows with a key            dedupe, then MERGE / ON CONFLICT with an "is newer" guard
    a set of files                     processed-files table, file and data in one transaction
    a small full extract               replace the whole table (CREATE OR REPLACE / swap)

What is never acceptable for a production table: a bare INSERT of whatever arrived.`,
    workedExample: `**Scenario.** A bug in the city mapping put every Kochi order under Chennai from 18 to 24 October. The fix is merged.
Reload those seven days into fact_orders without double-counting anything, while the hourly job keeps running.

**Step 1: confirm the load is per-day replace.** fact_orders is loaded by load_day(con, df, day, run_id): delete the
day, insert the day, one transaction. Rerunning a day is therefore safe; that was decided on day one, not today.

**Step 2: re-derive from raw.** Raw extracts for each day are still in the lake (land raw, always), so the backfill
reads raw, applies the fixed transform, and loads:

    run_id = "backfill-city-fix-20261027"
    for day in pd.date_range("2026-10-18", "2026-10-24").strftime("%Y-%m-%d"):
        df = clean_orders(read_raw(day))           # the fixed transform
        load_day(con, df, day, run_id)
        log.info("reloaded", extra={"ctx": {"run_id": run_id, "day": day, "rows": len(df)}})

**Step 3: avoid fighting the hourly job.** The hourly job only writes today's partition, so the two never touch the
same day. If they could (a backfill that includes today), take a lock or pause the schedule for the run.

**Step 4: prove it.** Before and after, per day:

    SELECT order_date, count(*), sum(amount_paise) FROM fact_orders
    WHERE order_date BETWEEN '2026-10-18' AND '2026-10-24' GROUP BY 1 ORDER BY 1

Row counts and revenue per day must be unchanged (the bug moved orders between cities, it did not create any); only
the city split changes. Run the backfill a second time: the query must return the same numbers, and _run_id shows
which rows the backfill wrote.

**Why this was a ten-minute job.** Raw data was kept, the load replaces whole partitions, and every row carries
its run id. Without those, the same fix means a manual delete script, a guess at which rows were wrong, and a week
of finance asking why revenue moved.`,
    mcqs: [
      mcq('A daily load does DELETE WHERE order_date = day, then INSERT, as two separate auto-committed statements. The worker is killed between them. What does the dashboard show?', [
        ['No orders for that day until a rerun, since the delete was already committed', true],
        ['The old rows for that day, since the database undoes the DELETE automatically', false],
        ['Double the orders for that day, because the INSERT still ran in the background', false],
        ['An error on the dashboard, because the table is locked until someone unlocks it', false],
      ], 'Auto-commit made the DELETE permanent on its own, so the day is empty until someone reruns. Only a single transaction around both statements would roll back to the old rows, as the DuckDB test showed; the INSERT never ran, and no lock is left behind.'),
      mcq('A change batch contains order 5 twice: OUT_FOR_DELIVERY at 10:00 and REFUNDED at 11:00. What must the load do before the upsert?', [
        ['Keep only the latest row per order_id, ordered by updated_at', true],
        ['Sort the batch by order_id so the database applies both in turn', false],
        ['Load each duplicate in its own transaction, one after another', false],
        ['Nothing, because the database always applies the newest row', false],
      ], 'Without dedup, DuckDB 2.0 kept the first row (OUT_FOR_DELIVERY) and PostgreSQL raises an error; neither reliably applies the newest. Sorting by order_id does not choose a version, and separate transactions still depend on the order they happen to run in.'),
      mcq('A partner drops one settlements CSV per day into a folder. What makes rerunning the loader safe?', [
        ['Recording each loaded file name in the same transaction as its rows', true],
        ['Moving each file to an archive folder after the loader has finished', false],
        ['Adding a random UUID to every row so that no two rows are identical', false],
      ], 'A processed-files table written atomically with the data lets the next run skip exactly what is loaded. Moving files after loading can fail between the two steps and reload, and random UUIDs make duplicates unique rather than preventing them.'),
    ],
    checkpoint: [
      mcq('What does it mean for a load to be idempotent?', [
        ['Running it again on the same input leaves the same result', true],
        ['It loads each row in its own separate database transaction', false],
        ['It runs at the same time every day without manual triggers', false],
        ['It refuses to start if the previous run has not finished', false],
      ], 'Idempotent means a second (or tenth) run with the same input changes nothing beyond the first. Per-row transactions, schedules and run locks are all different properties, and none of them makes a rerun safe by itself.'),
      mcq('Which load for a daily batch of orders is idempotent?', [
        ['Delete that day\'s partition and insert the batch in one transaction', true],
        ['Insert the batch after checking that the target table is not empty', false],
        ['Append the batch and then run a deduplication job once every weekend', false],
        ['Insert the batch with a new _loaded_at timestamp on every row', false],
      ], 'Replacing the partition atomically gives the same table however many times it runs. A non-empty check does not stop a second insert, weekend dedup leaves the week wrong, and a fresh timestamp only makes duplicates look different.'),
      mcq('An upsert re-reads a lookback window, so an older version of an order can arrive after a newer one. What guard belongs in the update?', [
        ['Update only when the incoming updated_at is not older than the stored one', true],
        ['Update only when the incoming status differs from the status now stored', false],
        ['Update only when the run_id of the batch is greater than the one stored', false],
      ], 'Comparing the change timestamps means a stale version can never overwrite a newer one. A different status is exactly what a stale row has, and run ids order the runs, not the source changes they carry.'),
    ],
  },

  /* ── PIPELINE_CODE ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_PYTHON_INGESTION_PIPELINE_CODE',
    notes: `Most pipelines start as a notebook that worked once. The one that pages the on-call at 3 a.m. is usually that
notebook, scheduled: a hard-coded path, a password in a cell, print statements, and no test. This lesson turns
TiffinTrail's order pipeline into software: configured per environment, logging in a form machines can search,
tested with pytest, and packaged so the scheduler runs exactly what was tested. You know pytest from Core Python;
this is how a data team uses it.

## A layout that scales

    orders-pipeline/
      pyproject.toml
      src/orders_pipeline/
        config.py      settings from the environment
        logs.py        JSON logging
        transform.py   pure functions: DataFrame in, DataFrame out
        load.py        the only module that writes to the warehouse
        cli.py         argument parsing, wiring, exit codes
      tests/
        conftest.py    fixtures
        test_transform.py  test_load.py  test_config.py

The split that matters: **transforms are pure functions** (no I/O, no globals), so they are trivial to test; I/O sits
at the edges (extract, load, cli). If a function both reads a file and cleans the data, you can only test it with a
file.

## Configuration per environment

The same code runs in dev, staging and prod; only configuration changes. pydantic-settings reads environment
variables (and an optional .env file for local work), validates types, and refuses to start without required values:

    class Settings(BaseSettings):
        model_config = SettingsConfigDict(env_prefix="ORDERS_", env_file=".env", extra="ignore")
        env: str = "dev"
        source_db_url: str
        warehouse_path: str = "warehouse.duckdb"
        batch_size: int = 25_000
        api_token: SecretStr

Run without ORDERS_SOURCE_DB_URL, it fails before touching any data:

    pydantic_core._pydantic_core.ValidationError: 1 validation error for Settings
    source_db_url
      Field required [type=missing, input_value={'api_token': 't'}, input_type=dict]

ORDERS_BATCH_SIZE="50000" arrives as a string and becomes an int; SecretStr keeps the token out of repr() and logs.
Secrets come from the platform (AWS Secrets Manager or SSM Parameter Store injected as environment variables, Azure
Key Vault on Azure), never from a committed file; .env goes in .gitignore.

## Structured logging

print("done") tells you nothing at 3 a.m. One JSON object per line, with the run id on every line, can be searched
in CloudWatch Logs Insights or Azure Monitor:

    class JsonFormatter(logging.Formatter):
        def format(self, record):
            doc = {"ts": datetime.fromtimestamp(record.created, timezone.utc).isoformat(timespec="seconds"),
                   "level": record.levelname, "logger": record.name, "msg": record.getMessage()}
            doc.update(getattr(record, "ctx", {}))
            if record.exc_info:
                doc["exc"] = self.formatException(record.exc_info)
            return json.dumps(doc)

    log.info("done", extra={"ctx": {**ctx, "rows_in": len(raw), "rows_out": n}})

A real run of the CLI:

    {"ts": "2026-10-27T13:58:26+00:00", "level": "INFO", "logger": "orders_pipeline", "msg": "start", "run_id": "20261026-a1", "env": "dev", "input": "raw.jsonl"}
    {"ts": "2026-10-27T13:58:26+00:00", "level": "INFO", "logger": "orders_pipeline.load", "msg": "upserted", "run_id": "20261026-a1", "rows": 2}
    {"ts": "2026-10-27T13:58:26+00:00", "level": "INFO", "logger": "orders_pipeline", "msg": "done", "run_id": "20261026-a1", "env": "dev", "input": "raw.jsonl", "rows_in": 3, "rows_out": 2}

Log counts in and out of every step (3 raw rows became 2 orders: a duplicate was collapsed), never row contents or
secrets (customer phone numbers in logs are a DPDP Act problem). On failure, log.exception records the traceback
and the CLI exits non-zero, so the scheduler marks the run failed instead of green.

## Testing transformations

Fixtures in conftest.py give each test a small, hand-written input whose right answer you know:

    @pytest.fixture
    def raw_orders():
        return pd.DataFrame({
            "order_id": [1, 1, 2, 3],
            "status": ["placed", " delivered ", "CANCELLED", "teleported"],
            "amount_paise": ["25000", "25000", "18000", "9900"],
            "updated_at": ["2026-10-25T10:00:00Z", "2026-10-25T10:40:00Z", "2026-10-25T11:00:00Z", "2026-10-25T11:05:00Z"],
        })

Each test checks one rule:

    def test_latest_version_of_each_order_wins(raw_orders):
        out = clean_orders(raw_orders)
        assert out["order_id"].tolist() == [1, 2]
        assert out.loc[out.order_id == 1, "status"].item() == "DELIVERED"

    def test_bad_amount_fails_loudly(raw_orders):
        raw_orders.loc[0, "amount_paise"] = "2,500"
        with pytest.raises(ValueError):
            clean_orders(raw_orders)

    @pytest.mark.parametrize("status", ["delivered", "DELIVERED", "  Delivered"])
    def test_status_is_normalised(raw_orders, status): ...

Also worth a test: that the function does not modify its input (pd.testing.assert_frame_equal against a copy).

## Testing the load, including idempotency

A DuckDB in-memory database is a real SQL engine that starts in milliseconds, so the load is tested for real:

    @pytest.fixture
    def con():
        c = duckdb.connect(":memory:")
        yield c
        c.close()

    def test_load_is_idempotent(con, raw_orders):
        batch = clean_orders(raw_orders)
        upsert_orders(con, batch, "run-1")
        first = con.execute("SELECT * EXCLUDE (_run_id) FROM orders ORDER BY order_id").fetchall()
        upsert_orders(con, batch, "run-2")
        assert con.execute("SELECT * EXCLUDE (_run_id) FROM orders ORDER BY order_id").fetchall() == first

monkeypatch.setenv tests configuration; tmp_path gives a fresh folder for file-writing code. The whole suite:

    12 passed in 1.96s

Tests that need a real PostgreSQL run in CI against a container (testcontainers or a service in the CI job); keep
them few and the pure-function tests many.

## Packaging and running

pyproject.toml declares dependencies and a console script (orders-pipeline = "orders_pipeline.cli:main"), and
[tool.pytest.ini_options] sets pythonpath = ["src"]. Pin exact versions in a lock file for deployment, build one
Docker image ("Containers and Docker" from Year 3), and have Airflow, Prefect or a cron job run that image with a run id and a
date argument. The CLI takes the logical date as a parameter rather than reading the clock, so rerunning yesterday
is "orders-pipeline --date 2026-10-26", not a code change.`,
    workedExample: `**Scenario.** An analyst's notebook cleans the settlements feed and has run daily for a month by being copied into a
cron job. Last week it reported zero refunds for a day because the partner changed "REFUND" to "refund". Make it
trustworthy, and make sure that bug cannot return.

**Step 1: write the failing test first.** Reproduce the bug as a test before touching the code:

    def test_status_is_case_insensitive():
        raw = pd.DataFrame({"settlement_id": ["S1"], "status": ["refund"], "amount_paise": ["5000"],
                            "updated_at": ["2026-10-20T05:00:00Z"]})
        assert clean_settlements(raw)["status"].tolist() == ["REFUND"]

It fails against the notebook's logic, which compared status == "REFUND" exactly. Now the fix (str.strip().str.upper())
has a test that will fail if anyone removes it.

**Step 2: pull the logic out of the notebook.** Cell by cell: file paths and credentials go to Settings; the cleaning
cells become clean_settlements(raw) in transform.py, returning a new DataFrame; the write becomes load.py with the
idempotent upsert; print becomes log.info with counts.

**Step 3: make bad input fail, not shrink.** The notebook silently dropped rows it could not parse. Decide each rule
explicitly: an unknown status is counted and logged as rejected (and the run fails if more than 1% of rows are
rejected); a non-numeric amount raises. A test for each.

**Step 4: wire it to run.** The CLI takes --date and --run-id, exits 1 on failure, and logs JSON. The scheduler runs
the packaged image with pytest already green in CI.

**Step 5: what changed for the team.**

    Before                               After
    path and password in a cell          Settings from env / Secrets Manager
    print("done")                        JSON logs with run_id and row counts
    silent row loss                      rejects counted, threshold fails the run
    no tests                             unit tests, an idempotency test, CI
    rerun = edit the date in a cell      orders-pipeline --date 2026-10-26`,
    mcqs: [
      mcq('TiffinTrail\'s clean_orders(path) reads a CSV and cleans it in one function. Why is clean_orders(df) the better signature?', [
        ['A pure DataFrame-in, DataFrame-out function can be tested without files', true],
        ['pandas reads a CSV faster when the call is outside a function body', false],
        ['Functions that take paths cannot be imported by a pytest test module at all', false],
        ['A DataFrame argument is copied, so the original file is never changed', false],
      ], 'Keeping I/O at the edges makes the transform a pure function you can feed a three-row fixture. Read speed does not depend on where the call sits, pytest can import any function, and passing a DataFrame does not copy it (that is why a no-mutation test is useful).'),
      mcq('The pipeline must refuse to start in prod if ORDERS_SOURCE_DB_URL is missing. Which approach does that?', [
        ['A pydantic-settings field with no default, validated at startup', true],
        ['os.environ.get("ORDERS_SOURCE_DB_URL", "sqlite:///local.db")', false],
        ['Reading the value lazily the first time the extract step runs', false],
        ['A .env file committed to the repository with the prod value', false],
      ], 'A required settings field raises ValidationError before any work starts. A default silently points prod at a local database, lazy reading fails half-way through a run, and a committed .env leaks credentials.'),
      mcq('Which log line is the most useful for a failing nightly run that someone must debug from CloudWatch?', [
        ['{"level": "ERROR", "msg": "failed", "run_id": "20261026-a2", "input": "orders.jsonl", "exc": "..."}', true],
        ['print(f"Error!!! {e}") written to standard output', false],
        ['{"level": "ERROR", "msg": "failed", "row": {"phone": "98xxxxxx01", "amount": 25000}}', false],
        ['logging.error("something went wrong, please check")', false],
      ], 'A JSON line with run id, input and traceback is searchable and tells you which run and file failed. print loses level and context, logging row contents leaks personal data, and a vague message gives nothing to search for.'),
    ],
    checkpoint: [
      mcq('What does a pytest fixture in conftest.py give a test suite for a pipeline?', [
        ['Shared, known inputs or resources that each test receives fresh', true],
        ['A way to run all of the tests in parallel across several CI machines', false],
        ['Automatic mocking of every database call made by the code', false],
        ['A record of which tests passed in the previous run of pytest', false],
      ], 'Fixtures build inputs such as a small DataFrame or an in-memory DuckDB connection, and by default each test gets its own. Parallel runs need a plugin, mocking is explicit, and pass history is not what fixtures do.'),
      mcq('How should a pipeline test that its load is idempotent?', [
        ['Load the same batch twice and assert the table is identical after each', true],
        ['Load once and check that the number of rows is greater than zero', false],
        ['Mock the database and assert the INSERT statement was called once', false],
        ['Run the load in production twice a week and compare the dashboards', false],
      ], 'Idempotency is a property of running twice, so the test runs twice against a real engine such as in-memory DuckDB. A row-count check passes for a duplicating load, a mock tests the code\'s calls rather than the data, and production is not a test bed.'),
      mcq('Why should the pipeline CLI take the logical date as an argument rather than use today\'s date?', [
        ['Reruns and backfills of past days need no code change', true],
        ['Reading the system clock in Python is slow and unreliable', false],
        ['Schedulers cannot run a program that reads the clock', false],
        ['It makes the run id unique for every run of the job', false],
      ], 'With --date, rerunning 26 October is a command, and the same code serves the daily run and a backfill. Reading the clock is fast and schedulers do not care; run ids need their own unique part regardless of the date.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_PYTHON_INGESTION_DEBUGGING',
    notes: `Six ingestion bugs from TiffinTrail's first month. None of them crashed loudly at first; most produced wrong numbers.
For each: the symptom, the cause, and the one change that fixes it. Every error message below is real output from
the library named.

## 1. Codes that lost their zeros

**Symptom.** A join between orders and outlets matches 60% of rows. Outlet "004512" exists in both files.

**Cause.** pd.read_csv guessed outlet_code was a number: [120044, 4512, 300871, 93310]. In one file the column had a
letter somewhere, so it stayed text there; "004512" no longer equals 4512.

**Fix.** Read identifiers as strings, always: dtype={"outlet_code": "string"}, or an explicit pyarrow schema. Never
"fix" with zfill(6): codes do not all have the same width.

## 2. A day of Parquet files that will not read together

**Symptom.**

    ds.dataset(["p1.parquet", "p2.parquet"]).to_table()
    ArrowInvalid: Float value 10.500000 was truncated converting to int64

**Cause.** Monday's file wrote tip as int64; Tuesday's batch had a 10.5 tip and pandas wrote float64. The dataset took
the first file's schema and could not fit the second into it. The writer let the data decide the schema.

**Fix.** Write every file with the same explicit schema (pa.Table.from_pandas(df, schema=SCHEMA)), so a bad value
fails at write time with the column named, and decide what tip is (paise as int64). Rewrite the odd file.

## 3. The incremental extract that "lost" refunds

**Symptom.** Finance finds 14 refunds in the app that are not in the lake. The extract logs no errors.

**Cause.** The query is WHERE updated_at > :watermark, and the watermark is the max(updated_at) of the last run.
Refunds are written by a slow batch transaction: rows stamped 08:59 commit at 09:01, after a run saved 09:00. In the
sqlite reproduction: "third (no lookback): 0 -> order 8 missed".

**Fix.** Read from watermark minus a lookback (15 minutes here) and deduplicate on order_id downstream, keeping the
latest updated_at; re-extract the affected window once to repair the lake.

## 4. A watermark compared in the wrong time zone

**Symptom.** After a refactor the hourly job either crashes or, after a "fix", re-reads five and a half hours of data
every run.

**Cause.** updated_at is UTC-aware; the saved watermark was a naive string "2026-10-25 11:00:00":

    df[df.updated_at > pd.Timestamp("2026-10-25 11:00:00")]
    TypeError: Invalid comparison between dtype=datetime64[us, UTC] and Timestamp

The "fix" localised it to Asia/Kolkata, so 11:00 IST became 05:30 UTC, five and a half hours earlier than intended.

**Fix.** Store watermarks as ISO 8601 strings with the offset ("2026-10-25T11:00:00Z") and keep everything in UTC
inside the pipeline. Convert to IST only in reports.

## 5. Retries that made things worse

**Symptom.** On sale days the settlements job takes hours, and the partner emails about traffic from TiffinTrail's IP.

**Cause.** The retry loop retried every non-200 immediately, up to 50 times, including 401 after a token rotation and
429 without reading Retry-After. Ten workers did this together.

**Fix.** Retry only 429, 5xx and network errors; honour Retry-After; otherwise exponential backoff with jitter and a
cap; fail fast on 4xx; and throttle below the published limit. In the fake-API run a 429 cost one 1-second sleep.

## 6. The upsert that kept the wrong version

**Symptom.** Some refunded orders show OUT_FOR_DELIVERY in the warehouse, though the app shows REFUNDED.

**Cause.** The change batch had two rows for the same order. Without dedup, DuckDB 2.0 kept the first:

    [(5, 'OUT_FOR_DELIVERY'), (6, 'A')]

(PostgreSQL would have refused: "ON CONFLICT DO UPDATE command cannot affect row a second time".)

**Fix.** QUALIFY row_number() OVER (PARTITION BY order_id ORDER BY updated_at DESC) = 1 before the upsert, plus a
guard so an older version never overwrites a newer one. Add a pytest test with a duplicate key so it stays fixed.

## The habit

Read the error text first; in pyarrow and pydantic it names the column. When there is no error, compare counts:
rows in the source, rows landed, rows loaded, per day. Most ingestion bugs are a count that does not match.`,
    mcqs: [
      mcq('Two Parquet files for one table fail together with "ArrowInvalid: Float value 10.500000 was truncated converting to int64". What is the root cause?', [
        ['The files were written with schemas inferred from each batch, not a fixed one', true],
        ['One of the files is corrupt and should be deleted from the lake right away', false],
        ['pyarrow cannot read two Parquet files written on different days together', false],
        ['The dataset needs a larger memory limit before it can cast the columns', false],
      ], 'Each writer let pandas infer tip\'s type, so one file is int64 and another float64. The files are valid, pyarrow reads many files happily when schemas agree, and memory is unrelated to a type conflict.'),
      mcq('Comparing a UTC-aware updated_at column with pd.Timestamp("2026-10-25 11:00:00") raises a TypeError. What is the right fix?', [
        ['Save the watermark with its offset, e.g. "2026-10-25T11:00:00Z"', true],
        ['Strip the time zone from the updated_at column before comparing', false],
        ['Localise the watermark to Asia/Kolkata, the company\'s time zone', false],
        ['Compare the two values as strings, which avoids the type error', false],
      ], 'An explicit UTC offset makes the instant unambiguous. Stripping zones hides which instant is meant, localising to IST moved the watermark back five and a half hours, and string comparison of different formats gives wrong answers.'),
      mcq('A retry loop retries every failed request immediately up to 50 times. Which change fixes the most problems at once?', [
        ['Retry only 429/5xx/network errors, with backoff and jitter', true],
        ['Lower the limit to 10 retries but keep retrying immediately', false],
        ['Retry every failure but always wait a fixed 30 seconds first', false],
        ['Retry only on a 401, since tokens expire often during runs', false],
      ], 'Classifying errors stops pointless retries of 4xx, and backoff with jitter stops the retry storm. Fewer immediate retries still hammer the API, a fixed wait synchronises workers and still retries 400s, and a 401 needs a token, not repetition.'),
      mcq('Finance reports refunds missing from the lake, with no errors in the extract logs. What should you check first?', [
        ['Whether late-committing rows fall below the saved watermark', true],
        ['Whether the S3 lake bucket has run out of its storage capacity', false],
        ['Whether the Parquet files use snappy instead of zstd', false],
        ['Whether pandas was upgraded since the last month-end', false],
      ], 'Silent loss with a strict > watermark is the classic late-commit gap, and the sqlite run reproduced it. A full bucket produces write errors, compression codecs do not drop rows, and an upgrade is a guess without evidence.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_PYTHON_INGESTION_PRACTICE',
    notes: `Nine exercises, easiest first. Write your answer before reading the one below it. The arithmetic was checked in
Python, and the code answers follow the code that ran in the lessons.

## 1. Pick the format (easy)

For each, name the format to store it in and one reason: (a) the payments partner's event stream, read record by
record by a consumer; (b) two years of orders queried by analysts by date; (c) a restaurant's menu file as it was
emailed to you; (d) the API's responses, exactly as received.

**Answer.** (a) Avro: row-based, compact, schema evolution with defaults. (b) Parquet partitioned by order_date:
column projection, statistics, types. (c) Keep the original CSV untouched in the raw zone, then convert to Parquet
with an explicit schema. (d) The raw JSON bytes, one file per page in a run folder.

## 2. Read it right (easy)

outlets.csv has outlet_code ("004512"), opened_on ("2024-03-15"), seats (blank for cloud kitchens) and city. Write
the pandas call that loses nothing.

**Answer.**

    pd.read_csv("outlets.csv", dtype={"outlet_code": "string", "seats": "Int64", "city": "category"},
                parse_dates=["opened_on"])

outlet_code as string keeps zeros; Int64 keeps seats an integer with missing values; the date is parsed, not text.

## 3. How long will the pull take? (easy)

An API has 90,000 new records, at most 100 per page, and a limit of 3 requests per second. How many requests, and
how long at the limit and at 80% of it?

**Answer.** 90,000 / 100 = 900 requests. 900 / 3 = 300 s (5 minutes). At 80% (2.4 per second): 375 s, about 6
minutes. At 50 per page it doubles to 1,800 requests, so ask for the maximum page size first.

## 4. Backoff arithmetic (medium)

The retry function uses base=0.5, cap=8.0, max_attempts=6 and sleeps random.uniform(0, min(cap, base * 2 ** attempt))
after attempts 1 to 5. What is the longest each sleep can be, and the longest total sleeping before it gives up?

**Answer.** Attempt 1: 1 s, 2: 2 s, 3: 4 s, 4: 8 s, 5: min(8, 16) = 8 s. Total at most 23 s. With full jitter the
expected total is about half of that. If the server sends Retry-After, that value is used instead.

## 5. The incremental query (medium)

Write the query (with bound parameters) for orders changed since the watermark, with a 15-minute lookback and an
upper bound of now minus 2 minutes, in an order that supports keyset paging.

**Answer.**

    SELECT order_id, status, amount_paise, updated_at
    FROM orders
    WHERE updated_at > :since AND updated_at <= :until
    ORDER BY updated_at, order_id

with since = watermark - 15 minutes and until = now (UTC) - 2 minutes, both computed in Python and passed as
parameters. Save until (or the max updated_at read) as the next watermark only after the data has landed.

## 6. Which rows are missed? (medium)

Watermark after the 09:00 run: 08:58:30 (the max updated_at read). Transactions: A stamps 08:58:00 and commits
08:58:10; B stamps 08:59:00 and commits 09:00:40; C stamps 09:02:00 and commits 09:02:05. The next run is at 10:00
with a strict > watermark and no lookback. Which rows does it read?

**Answer.** It reads B (08:59:00 > 08:58:30) and C. A was already read at 09:00. Nothing is missed in this case,
because the watermark came from the data (08:58:30), not the clock (09:00). Had the job saved 09:00 as the
watermark, B (stamped 08:59, committed after the read) would have been lost. Lesson: watermarks from data, plus a
lookback anyway.

## 7. Make this load idempotent (medium)

    df = extract_day(day)
    con.execute("INSERT INTO fact_orders SELECT * FROM df")

**Answer.**

    con.execute("BEGIN")
    try:
        con.execute("DELETE FROM fact_orders WHERE order_date = ?", [day])
        con.execute("INSERT INTO fact_orders SELECT *, ?, now() FROM df", [run_id])
        con.execute("COMMIT")
    except Exception:
        con.execute("ROLLBACK")
        raise

And check that df contains only rows for that day; a stray row for another date would be inserted without its day
being deleted first.

## 8. A test that would have caught it (medium)

Write a pytest test showing that dedupe_latest(df) keeps the newest row per order_id.

**Answer.**

    def test_dedupe_keeps_latest():
        df = pd.DataFrame({"order_id": [5, 5, 6],
                           "status": ["OUT_FOR_DELIVERY", "REFUNDED", "DELIVERED"],
                           "updated_at": pd.to_datetime(["2026-10-26 10:00", "2026-10-26 11:00", "2026-10-26 11:05"])})
        out = dedupe_latest(df).sort_values("order_id")
        assert out["status"].tolist() == ["REFUNDED", "DELIVERED"]

Put the duplicate first in the input on purpose: a version that keeps the first row fails this test.

## 9. OFFSET versus keyset (hard)

A backfill reads 2,000,000 rows in pages of 50,000. With LIMIT/OFFSET, page k (from 1) makes the database read
k x 50,000 rows and return the last 50,000. How many rows are read in total? With keyset?

**Answer.** 40 pages. OFFSET reads 50,000 x (1 + 2 + ... + 40) = 50,000 x 820 = 41,000,000 rows, more than twenty
times the table. Keyset reads each row once through the index: 2,000,000. On a production database that is the
difference between a quiet backfill and an incident.`,
    mcqs: [
      mcq('A partner API returns 60,000 records at most 200 per page and allows 2 requests a second. Planning at 80% of the limit, how long does a full pull take?', [
        ['About 3 minutes: 300 requests at 1.6 per second is roughly 188 seconds', true],
        ['About 2.5 minutes: 300 requests at 2 per second is exactly 150 seconds', false],
        ['About 6 minutes: 600 requests at 1.6 per second is roughly 375 seconds', false],
        ['About 30 seconds: 60 requests at 2 per second is exactly 30 seconds', false],
      ], '60,000 / 200 = 300 requests; at 80% of 2 per second (1.6) that is 187.5 s. Two seconds per request at the full limit ignores the planning margin, 600 requests assumes 100 per page, and 60 requests assumes 1,000 per page.'),
      mcq('With base=1, cap=10 and wait = uniform(0, min(cap, base * 2 ** attempt)), what is the longest wait after attempt 4?', [
        ['10 seconds, because 2 ** 4 = 16 is capped at 10', true],
        ['16 seconds, because the cap only applies from attempt 5', false],
        ['8 seconds, because attempt 4 uses 2 ** 3 in the formula', false],
        ['4 seconds, because full jitter halves the computed wait', false],
      ], 'base * 2 ** 4 = 16, and min(10, 16) = 10 is the upper bound of the uniform draw. The cap applies on every attempt, the exponent is the attempt number itself, and jitter randomises below the bound rather than halving it.'),
      mcq('Which pandas call reads a seats column that is blank for cloud kitchens as whole numbers with missing values?', [
        ['dtype={"seats": "Int64"}', true],
        ['dtype={"seats": "int32"}', false],
        ['dtype={"seats": "float64"}', false],
        ['converters={"seats": int}', false],
      ], 'The capital-I Int64 is pandas\' nullable integer, which holds <NA>. Plain int32 cannot hold missing values and raises, float64 turns counts into floats, and int("") in a converter raises ValueError on the blanks.'),
      mcq('A load does DELETE WHERE order_date = day then INSERT in one transaction. The batch for 25 October contains two late orders dated the 24th. What happens on each rerun?', [
        ['The two 24th orders are inserted again, duplicating them on every run', true],
        ['The 24th is deleted and reloaded too, so the table stays fully correct', false],
        ['The transaction fails because the rows do not match the partition key', false],
        ['The two late orders are dropped silently by the database at load time', false],
      ], 'Only the 25th is deleted, but rows for both days are inserted, so the 24th gains two duplicates per run. Nothing deletes the 24th, the database does not check rows against the variable used in the DELETE, and it does not drop them; filter the batch to its day or delete every day it contains.'),
      mcq('A backfill of 2,000,000 rows in 40 pages of 50,000 uses LIMIT/OFFSET. Roughly how many rows does the database read in total?', [
        ['About 41 million, since each page re-reads all earlier rows', true],
        ['Exactly 2 million, since every row is returned only once', false],
        ['About 80 million, since every page re-reads the whole table', false],
        ['About 4 million, since OFFSET reads each row at most twice', false],
      ], 'Page k reads k x 50,000 rows, so the total is 50,000 x 820 = 41,000,000. Two million is what keyset pagination reads; pages do not each read the whole table, and there is no "at most twice" rule for OFFSET.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_PYTHON_INGESTION_INTERVIEW_QUESTION',
    notes: `Four questions that come up in data engineer interviews at product companies, GCCs and service companies, with an
answer that would score well and the follow-up a good interviewer asks next. Say them aloud; time yourself to
about two minutes each.

## Q1. "How would you ingest data from a third-party REST API every hour?"

**Model answer.** "First I read the API's contract: auth, pagination style, page size limit, rate limit, and whether
it supports a changed-since filter. The job keeps a watermark from the data, the max updated_at it loaded. Each run
asks for changes since the watermark minus a small lookback, follows the cursor until there is none, and saves each
response untouched into a run folder in S3, with a _SUCCESS marker at the end. Only then does it move the
watermark. Requests have timeouts; I retry 429, 5xx and network errors with exponential backoff and jitter, honour
Retry-After, and fail fast on 4xx. The token comes from Secrets Manager. The load step parses the raw pages,
deduplicates on the record id and upserts, so a repeated window is harmless."

**Follow-up.** "The API has no changed-since filter." — "Then I pull the full set if it is small, or by a creation
date window if records never change. If they change and are large, I ask the provider for a bulk export or webhooks,
and meanwhile do a full pull at a lower frequency and diff it against the lake."

## Q2. "What does idempotent mean for a pipeline, and how do you achieve it?"

**Model answer.** "Running it again with the same input gives the same result. Retries, reruns and backfills happen
all the time, so every load must be safe to repeat. For a daily batch I replace the partition: delete the day and
insert the day in one transaction, or a dynamic partition overwrite in Spark. For change data I deduplicate to the
latest version per key and upsert with MERGE or ON CONFLICT, with a guard so an older version cannot overwrite a newer
one. For files I record each processed file in the same transaction as its rows. Every row carries a run id, so I can
see and undo exactly what one run wrote. And I test it: load twice, assert the table is unchanged."

**Follow-up.** "What about side effects, like sending an email per new order?" — "Those are not idempotent by
nature, so they need their own record: an outbox table keyed by order id, and the sender skips ids already sent.
Or an idempotency key that the receiving API deduplicates on."

## Q3. "How do you extract incrementally from a production database?"

**Model answer.** "From a read replica, with a read-only user and a statement timeout. If there is a reliable
updated_at, indexed, I read rows above the watermark minus a lookback and below now minus a couple of minutes, in
keyset pages ordered by updated_at and the primary key, and deduplicate downstream. The lookback covers transactions
that commit after a later timestamp was read. I keep the filter index-friendly: no functions on the column.
Watermarks miss hard deletes, so I either get soft deletes, compare keys periodically, or use CDC from the WAL or
binlog with Debezium or DMS."

**Follow-up.** "When would you move to CDC?" — "When deletes matter, when latency must be seconds, or when the table
is so large that even an indexed incremental query hurts. The cost is operating it: replication slots to monitor,
schema changes to handle."

## Q4. "Why Parquet and not CSV for the lake?"

**Model answer.** "Parquet is columnar and typed. A query reads only the columns it needs and can skip row groups
using min/max statistics, so engines like Athena or Spark scan far less data, and they charge or run by data scanned.
It compresses well; in a test, 200,000 orders were 13.5 MB as CSV and 4.3 MB as snappy Parquet. The schema is in
the file, so codes keep their leading zeros, nullable integers stay integers and timestamps keep their zone; CSV lost
all of those on a round trip. CSV is still fine for the raw copy a partner sends; I convert it with an explicit
schema."

**Follow-up.** "Then why does anyone use Avro?" — "It is row-based, so it suits writing one record at a time, as in
Kafka, and it has clear schema-evolution rules: a new field with a default can be read from old data."`,
    mcqs: [
      mcq('Asked "how do you make a daily load safe to rerun?", which answer would an interviewer rate highest?', [
        ['Replace the day\'s partition in one transaction, and prove it by loading twice in a test', true],
        ['Make sure the scheduler never runs the job twice, so duplicates cannot happen', false],
        ['Append the batch, then run SELECT DISTINCT over the whole table every week', false],
        ['Add a unique UUID to every row so the database can tell the copies apart', false],
      ], 'Atomic partition replacement plus a test that loads twice is idempotency, shown. Schedulers do retry and people do rerun, weekly dedup leaves the data wrong for days, and UUIDs make duplicate rows look distinct instead of preventing them.'),
      mcq('In an interview you propose WHERE updated_at > watermark. The interviewer asks what it misses. Which answer is complete?', [
        ['Hard deletes, and rows that commit after a later watermark was read', true],
        ['Only rows inserted in the same second as the watermark value', false],
        ['Nothing, provided updated_at is indexed in the source table', false],
        ['Rows whose primary key is lower than the last loaded key', false],
      ], 'Deletes leave no updated_at, and late commits land below a watermark already saved; lookback and CDC address them. Same-second rows are one symptom, an index affects speed not correctness, and keys are not part of a timestamp watermark.'),
      mcq('An interviewer asks why you save raw API responses before parsing them. What is the strongest reason?', [
        ['Reprocessing after a parsing bug, without asking the provider for history', true],
        ['Raw JSON is cheaper to store than the equivalent Parquet output files', false],
        ['Analysts prefer to query raw JSON directly instead of modelled tables', false],
      ], 'Raw landing lets you replay any day through fixed code, even when the API no longer serves that history. JSON is larger than Parquet, and analysts should query modelled, typed tables, not raw payloads.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_PYTHON_INGESTION_CHECKPOINT',
    notes: `Ten questions across the topic: file formats, API ingestion, database extracts, idempotent loads and pipeline code.
Answer without notes; the result shows which lesson to revisit.`,
    checkpoint: [
      mcq('A partner\'s CSV has item codes like 000123 and prices like 89.00. What should the conversion to Parquet use?', [
        ['An explicit schema: codes as strings, prices as a decimal type', true],
        ['pandas type inference, then a cast of any wrong columns afterwards', false],
        ['Every column read as float64 first, to avoid any parsing errors', false],
        ['Gzip compression, which keeps the original text of each value', false],
      ], 'Writing the schema down keeps leading zeros and exact money, and makes a bad file fail with the column named. Inference already lost the zeros before any cast, floats are wrong for both codes and money, and compression does not affect parsing.'),
      mcq('An analyst\'s query reads two columns of a 50-column Parquet table filtered on amount. Which two features reduce what is read?', [
        ['Column projection and row-group min/max statistics', true],
        ['Gzip compression and a header row naming columns', false],
        ['Schema evolution and default values for new fields', false],
        ['Record-at-a-time appends and an embedded schema', false],
      ], 'Columnar layout lets a reader fetch only the two columns, and statistics let it skip row groups that cannot match the filter. Header rows and gzip describe CSV, schema evolution is an Avro strength, and record appends suit Avro rather than scans.'),
      mcq('An API call returns 429 with "Retry-After: 5". What should the client do?', [
        ['Wait five seconds, then retry the same request', true],
        ['Retry immediately, since 429 is only a warning', false],
        ['Stop the run and alert, as 429 is a client error', false],
        ['Retry at once with a smaller page size instead', false],
      ], 'Retry-After tells you exactly how long the server wants you to wait, and 429 is retryable. Immediate retries earn more 429s, it is a 4xx that is meant to be retried after waiting, and page size does not change the request rate.'),
      mcq('Which statement about cursor pagination is accurate?', [
        ['You pass back the server\'s next_cursor and stop when it is null', true],
        ['You build the next cursor yourself by adding the page size to it', false],
        ['Cursors make it safe to fetch all pages in parallel from the start', false],
        ['Cursor APIs return every page sorted by a random order each call', false],
      ], 'A cursor is opaque: you return it unchanged until the server stops sending one. Computing it yourself breaks when the format changes, you cannot know later cursors in advance to fetch in parallel, and cursor pagination relies on a stable order.'),
      mcq('Why should a large extract read from a read replica with a statement timeout set on its user?', [
        ['So that a slow or bad extract cannot slow down customer transactions', true],
        ['Because replicas always hold more recent data than the primary does', false],
        ['Because a primary database refuses connections from read-only users', false],
        ['So the extract can skip the watermark and read the whole table each run', false],
      ], 'The replica takes read load off the primary, and the timeout kills a runaway query. Replicas lag rather than lead, primaries accept read-only users, and a replica is no excuse to drop incremental reads.'),
      mcq('An orders extract must not miss rows that commit late. Which design handles this?', [
        ['Read from watermark minus a lookback, then dedupe on order_id', true],
        ['Save the job\'s start time as the watermark for the next run', false],
        ['Switch the filter to >= so rows equal to the watermark are read', false],
        ['Run the job every minute so that the gap is too short to matter', false],
      ], 'A lookback re-reads a window that late commits fall into, and dedup removes the repeats. Clock-based watermarks make the gap worse, >= covers only the exact boundary value, and running more often shrinks the gap without closing it.'),
      ck('DATA_PIPELINES', 'A load is killed between DELETE of a day and INSERT of the new rows, both inside one transaction. What is the state of the table?', [
        ['The old rows for that day, because the transaction rolled back', true],
        ['No rows for that day, because the DELETE had already happened', false],
        ['The new rows only, because the INSERT had been prepared already', false],
        ['Both old and new rows, because the engine keeps both versions', false],
      ], 'A transaction is all or nothing; DuckDB showed "rows still 1000" after a kill between the two statements. An empty day happens only with separate auto-committed statements, the INSERT never committed, and the engine does not merge versions.'),
      ck('DATA_PIPELINES', 'Why stamp every loaded row with a _run_id?', [
        ['To find and remove exactly what one run wrote when it was wrong', true],
        ['To make duplicate rows distinct so primary keys never conflict', false],
        ['To let the database order the rows by when they were loaded', false],
        ['To replace the need for a watermark in the next incremental run', false],
      ], 'A run id answers "which run wrote this?" and lets you undo one bad run precisely. Making duplicates distinct hides them, ordering by load time is what a timestamp is for, and watermarks track the source, not the load.'),
      ck('DATA_PIPELINES', 'Which part of a pipeline should be a pure function tested with small hand-made DataFrames?', [
        ['The transformation that cleans and deduplicates the rows', true],
        ['The extract that queries the production read replica', false],
        ['The scheduler definition that runs the job every hour', false],
        ['The upload that writes Parquet files to the S3 bucket', false],
      ], 'Transforms have no I/O, so a three-row fixture with a known answer tests every rule. Extracts and uploads are I/O at the edges, tested with a few integration tests, and the schedule is configuration rather than logic.'),
      ck('DATA_PIPELINES', 'A pipeline reads its database password from a constant in config.py that is committed to Git. What is the right fix?', [
        ['Read it from the environment, injected from a secrets manager', true],
        ['Encode it in base64 so that it no longer looks like a password', false],
        ['Move the constant to a separate file that is also committed', false],
        ['Keep it in config.py but make the repository private instead', false],
      ], 'Secrets belong in a secrets manager (AWS Secrets Manager, Azure Key Vault) and reach the code as environment variables, and the leaked one must be rotated. Base64 is not encryption, another committed file is the same leak, and private repositories still leak through clones and forks.'),
    ],
  },
];
