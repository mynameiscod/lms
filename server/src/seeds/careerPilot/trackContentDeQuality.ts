/**
 * Career-track content: Data Quality and Governance (DE_QUALITY_GOVERNANCE), Data Engineer, batch DE3.
 *
 * Keeping a data platform correct and trustworthy once it runs unattended: the ways data goes wrong and where each is
 * checked, automated checks (pandera in Python, dbt tests in SQL, Great Expectations), quarantining bad rows instead of
 * dropping them, freshness/volume/schema monitors, lineage and impact analysis, and governance — catalogues, ownership,
 * access control, masking, pseudonymisation and tokenisation, retention, and India's DPDP Act in outline. It builds on
 * the Data Analytics track's "Data Quality Checks You Can Rerun" (checks on one file, not re-taught), DE2's "Tests,
 * Documentation and Sources" (dbt tests and freshness, referred to, not repeated), "Idempotent, Restartable Loads" and
 * "The Lakehouse and Medallion Layers".
 *
 * One fictional company runs through the topic: RupeeRail, a Bengaluru UPI payments app, with synthetic data only.
 * Every pandas, pandera (0.35, pandas 3.0) and DuckDB (2.0) snippet, the volume/freshness monitors, the lineage walk and
 * the masking/HMAC/tokenisation code were run on Windows and the printed output is quoted. Great Expectations, OpenLineage,
 * DataHub, Unity Catalog, AWS Glue/Lake Formation and Microsoft Purview are described from their documentation and NOT
 * run; the notes say so. DPDP Act content is an outline; students are told to check the current rules.
 *
 * Skill: DATA_QUALITY (the topic's only skill), so no ck() overrides are needed.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_DE_QUALITY_GOVERNANCE_BUNDLES: PilotBundle[] = [
  /* ── QUALITY_DIMENSIONS ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_QUALITY_GOVERNANCE_QUALITY_DIMENSIONS',
    notes: `A pipeline that crashes is the easy case: somebody gets paged and fixes it. The expensive case is a pipeline that
runs green every night and publishes a wrong number. The CEO's dashboard shows GMV down 6%, a merchant is paid short,
a fraud model scores on half the users — and nobody knows until a human notices. Data quality work is about turning
that silent wrongness into a loud, early, specific signal.

In the Data Analytics track ("Data Quality Checks You Can Rerun") you checked one monthly file in a notebook: row
count, unique key, missing values, ranges, allowed values. Those checks are still right. What changes for an engineer
is that the pipeline runs every hour with nobody watching, many teams read its output, and the check has to say not
only "something is wrong" but which dimension, where, and who should act.

## The dimensions, named

Teams name them slightly differently; these six cover nearly every incident you will see.

- **Completeness** — is everything that should be there, there? At column level: required fields filled. At table
  level: all the rows, all the partitions, all the sources. Volume (row count) is the usual proxy.
- **Validity** — does each value obey its rules? Type, format (a UPI ID looks like name@bank), range (amount above
  zero), allowed set (status in a known list).
- **Uniqueness** — is the grain respected? One row per transaction, per user per day, whatever the table promises.
- **Freshness** (timeliness) — is the data recent enough for the people using it?
- **Consistency** — does the data agree with itself (a SUCCESS payment has an amount) and with other systems (our
  total equals the bank's settlement file)? Includes referential integrity: every merchant_id exists in merchants.
- **Accuracy** — does it match reality? You can rarely check this directly; reconciliation against an independent
  source (the bank, the ledger, a physical count) is how you approximate it.

## One batch, every dimension

RupeeRail's hourly extract of UPI transactions (eight synthetic rows, amounts in paise) went through one DuckDB query
that measures each dimension:

    select
      count(*)                                   as rows,
      count(*) - count(payer_vpa)                as missing_vpa,
      count(*) - count(distinct txn_id)          as dup_txn_ids,
      count(*) filter (where status not in ('SUCCESS','FAILED','PENDING','REFUNDED')) as bad_status,
      count(*) filter (where amount_paise <= 0 and status = 'SUCCESS')               as nonpositive_success,
      count(*) filter (where merchant_id not in (select merchant_id from merchants)) as orphan_merchant,
      max(created_at)                            as newest_event
    from txns

    rows                                         8
    missing_vpa                                  2
    dup_txn_ids                                  1
    bad_status                                   1
    nonpositive_success                          1
    orphan_merchant                              1
    newest_event         2026-10-27 08:00:00+00:00

Read it dimension by dimension. Two missing payer IDs (completeness), both on the same transaction T1004, which
appears twice (uniqueness). One status is success in lower case (validity). One SUCCESS payment has amount 0
(consistency between two columns). One merchant M09 is not in the merchant table (referential consistency). The
newest event is an hour old (freshness — fine for an hourly job).

Then the check no single-table query can do: reconcile with the bank's settlement file.

    ours 144900 bank 219900 diff 75000

The bank paid out 750 rupees more than our SUCCESS total. The difference is exactly T1006 — the lower-case success
that our filter status = 'SUCCESS' did not count. A validity problem surfaced as a consistency problem, and only the
cross-system check proved it cost money. That is why reconciliation sits at the top of every payments team's list.

Per-column completeness as a share is one line of pandas, and worth publishing with every load:

    (df.isna().mean() * 100).round(1)
    payer_vpa  25.0    city  12.5    every other column 0.0

## Where each check belongs

You met the bronze/silver/gold layers in "The Lakehouse and Medallion Layers". Quality checks follow the same
shape: check as early as the data allows, and check again wherever meaning is added.

    where                   checks                                              typical action
    ingestion (raw/bronze)  file arrived, parses, expected columns and types,  fail the load; keep the raw file
                            row count plausible
    staging (silver)        not null, unique key, allowed values, formats,     quarantine bad rows; fail above
                            referential integrity                              a threshold
    marts (gold)            business rules, totals reconcile with a source     fail the publish; keep yesterday
                            of truth, grain of the fact table
    outside the pipeline    freshness, volume trend, schema drift              alert the owner

Two reasons for checking early. A bad row caught at staging has one owner and one cause; the same row found in a mart
has been joined, aggregated and copied into three other tables. And the earlier check is cheaper: a schema check on a
file costs nothing, a reconciliation over a year of facts does not.

Two reasons for checking again later. Joins create new failures (a join on a non-unique key multiplies revenue), and
business rules only exist in the marts ("a settled merchant's payouts equal their successful payments minus fees").

## Who owns a failure

Every check needs an answer to "who acts when this fails?". A missing column in the source extract belongs to the
producing team (the app's backend); an orphan merchant may be the merchant-onboarding pipeline running late; a
wrong total in a mart is yours. A check with no owner turns into a red light everybody learns to ignore — the
dbt lesson called that worse than no test, and it is.

## Severity, decided in advance

Not every failure should stop the pipeline. Decide per check, before the incident:

- **Block** — the output would be wrong in a way that costs money or trust: a duplicated settlement row, a missing
  day, a broken schema. Fail and keep yesterday's good data published.
- **Quarantine** — a few rows are bad but the rest are fine: set the bad rows aside with the reason, publish the
  rest, and fail only if the bad share passes a threshold (next lesson).
- **Warn** — worth a human look but not a stop: a null rate up from 1% to 3%, a known late source.

The cleaning lessons decided how to fix a bad value. An engineer's first question is different: who should know, and
should the pipeline keep going?`,
    workedExample: `**Scenario.** Monday 10:00. RupeeRail's CEO dashboard shows Sunday's GMV 6% below the previous Sunday. Finance
asks whether it is real. Nothing failed overnight. Walk the dimensions in the order that is cheapest to rule out.

**1. Freshness.** Did Sunday finish loading? max(loaded_at) on raw.upi_txns is 03:40 today, within its two-hour
promise. Not stale.

**2. Volume.** Sunday's row count is 1.53 million against a Sunday median of about 1.57 million: 2-3% low, inside
normal variation. The rows arrived; the money did not add up.

**3. Uniqueness and completeness.** unique txn_id passes; payer_vpa nulls are 0.2%, as usual. Nothing.

**4. Validity.** Group by status:

    SUCCESS 1,402,113   FAILED 89,450   success 31,226   PENDING 6,980   REFUNDED 1,201

success in lower case appears for the first time on Sunday. Every one has bank_code KBANK.

**5. Consistency.** Reconcile with KBANK's settlement file: the bank settled 31,226 more transactions than our mart
counted. The GMV query filters status = 'SUCCESS', so these vanished from the dashboard without an error.

**6. Root cause and owner.** The app team's Saturday release changed how one PSP's callback is parsed. The producing
team owns the fix; you own the protection.

**The fix, in three places.**
- Staging: normalise status with upper(trim(status)) — this is cleaning, as in the Data Analytics track — and keep
  the raw value in raw for audit.
- Staging test: accepted_values on the raw status column with severity warn, so the next new spelling is seen the
  day it appears rather than a week later.
- Mart: a reconciliation check against the bank settlement totals per bank per day that fails the publish when the
  difference exceeds a small tolerance.

**Result.** Sunday's GMV is restated (up 6.2%), finance gets a one-paragraph note, and the next silent status change
fails a check on the day it ships instead of surfacing in a board meeting.`,
    mcqs: [
      mcq('RupeeRail\'s merchant table has no row for M09, yet three transactions carry merchant_id M09. Which quality dimension is broken?', [
        ['Consistency, specifically referential integrity between the two tables', true],
        ['Uniqueness, because M09 must appear more than once in the merchant table', false],
        ['Freshness, because the transactions were loaded after the merchant table', false],
        ['Validity, because M09 does not match the expected merchant ID pattern format', false],
      ], 'A foreign key with no matching parent row is a referential-consistency failure. Uniqueness is about repeated keys, not missing ones. A late merchant load may be the cause, but the dimension broken is consistency. M09 has the same format as M01, so validity holds.'),
      mcq('Every column check passes on a payments mart, yet the daily total is short of the bank\'s settlement file. Which check found the problem?', [
        ['A reconciliation of our totals against the bank\'s settled totals', true],
        ['A not-null check on the amount column of the payments mart table', false],
        ['A uniqueness check on txn_id in the staging transactions model', false],
        ['A freshness check on the raw transaction table\'s latest load time', false],
      ], 'Only a cross-system comparison shows that rows the bank settled are missing from our count; each table can look fine on its own. Not-null and uniqueness passed already, and freshness says nothing about rows silently filtered out by a status spelling.'),
      mcq('Where should a check that the source file has the expected columns and types run in a medallion pipeline?', [
        ['At ingestion into raw/bronze, before any transformation reads it', true],
        ['In the gold marts, after joins, where business rules are applied', false],
        ['Only in the BI tool, where analysts would notice missing columns', false],
        ['Weekly, as a separate audit job that samples the warehouse tables', false],
      ], 'A schema check is cheapest and most specific at the boundary where the file arrives; downstream it surfaces as confusing join or type errors. Marts are for business rules, the BI tool is far too late, and a weekly audit lets a week of bad data through.'),
    ],
    checkpoint: [
      mcq('A dashboard is correct but shows yesterday\'s numbers at 11:00 because the morning load has not run. Which dimension is failing?', [
        ['Freshness', true],
        ['Validity', false],
        ['Accuracy', false],
        ['Uniqueness', false],
      ], 'The values are right but not recent enough for their users, which is freshness (timeliness). Validity is about values obeying rules, accuracy about matching reality, and uniqueness about the grain; none of those is broken here.'),
      mcq('In a staging model, 0.3% of a day\'s UPI rows have an unknown status and the rest are fine. What is usually the right default action?', [
        ['Quarantine those rows with the reason and publish the rest', true],
        ['Fail the whole day so that no partial data is ever published', false],
        ['Drop those rows silently, since 0.3% will not move totals', false],
        ['Replace the unknown status with SUCCESS so totals are complete', false],
      ], 'Quarantine keeps good data flowing and the bad rows visible and fixable; a threshold fails the run if the share grows. Failing everything stops the business for a fixable defect, silent drops hide a source change, and guessing SUCCESS invents money.'),
      mcq('Why should a quality check that fails have a named owner and a decided severity?', [
        ['Without them a failing check is ignored and stops being a signal', true],
        ['Owners are required by dbt or pandera before a check will compile', false],
        ['Severity decides how fast the check runs against the warehouse', false],
        ['A named owner lets the check fix the bad rows automatically later', false],
      ], 'A red check nobody acts on trains the team to ignore red checks, including real ones. Neither tool requires an owner to run, severity changes what happens on failure rather than speed, and an owner is a person who acts, not an automatic fix.'),
    ],
  },

  /* ── QUALITY_CHECKS ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_QUALITY_GOVERNANCE_QUALITY_CHECKS',
    notes: `Checks that live in a notebook run when you remember them. This lesson puts them in the pipeline, in three places a
data engineer uses: **pandera** in Python ingestion and transformation code, **dbt tests** in the warehouse, and
**Great Expectations** where a platform team has standardised on it. Then the part most tutorials skip: what the
pipeline does with the rows that fail.

## pandera: a schema next to the code

pandera (0.35 here, with pandas 3.0) describes a DataFrame as a schema of columns, types and checks. Since 0.24 the
pandas API is imported from pandera.pandas. RupeeRail's transaction schema:

    import pandera.pandas as pa

    schema = pa.DataFrameSchema(
        {
            "txn_id": pa.Column(str, unique=True),
            "payer_vpa": pa.Column(str, pa.Check.str_matches(r"^[a-z0-9._-]+@[a-z]+$")),
            "merchant_id": pa.Column(str, pa.Check.isin(["M01", "M02", "M03"])),
            "amount_paise": pa.Column("int64", pa.Check.gt(0)),
            "status": pa.Column(str, pa.Check.isin(["SUCCESS", "FAILED", "PENDING", "REFUNDED"])),
            "created_at": pa.Column("datetime64[us, UTC]"),
            "city": pa.Column(str, nullable=True),
        },
        strict=True,
    )

Columns are not nullable unless you say so, so payer_vpa is required without writing a check. strict=True rejects
columns the schema does not know — a new column from the producer is a contract change you want to hear about.
(The created_at type says us: pandas 3 parses timestamps at microsecond resolution, and pandera compares the type
exactly. The debugging unit shows the failure you get with ns.)

## Eager versus lazy

By default validate raises at the first failure:

    schema.validate(df)
    SchemaError : series 'txn_id' contains duplicate values:
    3    T1004
    4    T1004

A pipeline wants every problem in one run. lazy=True collects them into a DataFrame on the exception:

    try:
        schema.validate(df, lazy=True)
    except pa.errors.SchemaErrors as e:
        print(e.failure_cases[["column", "check", "failure_case", "index"]])

          column                                              check failure_case index
          txn_id                                   field_uniqueness        T1004     3
          txn_id                                   field_uniqueness        T1004     4
       payer_vpa                                       not_nullable          NaN     3
     merchant_id                        isin(['M01', 'M02', 'M03'])          M09     5
    amount_paise                                    greater_than(0)            0     2
    ...
          status isin(['SUCCESS', 'FAILED', 'PENDING', 'REFUNDED'])      success     5

**index** is the row label of the failing row — the key to quarantining. Some failures have no index: a wrong column type or an
unexpected column is a problem with the table, not a row. Hold that thought.

## Class-based schemas and cross-column rules

The same schema can be a class (pandera.typing.Series), with rules across columns:

    class Txn(pa.DataFrameModel):
        txn_id: Series[str] = pa.Field(unique=True)
        amount_paise: Series[int] = pa.Field(gt=0)
        status: Series[str] = pa.Field(isin=["SUCCESS", "FAILED", "PENDING", "REFUNDED"])

        @pa.dataframe_check
        def success_has_amount(cls, d):
            return (d["status"] != "SUCCESS") | (d["amount_paise"] >= 100)

A failing dataframe_check is reported once per column of the row — T1003 gave seven lines, all index 2 — so count
distinct index values. pandera also validates PySpark and Polars DataFrames (not run here) with a similar API.

## Fail loudly, or quarantine

Here is the decision as code. A day of 2,008 rows (2,000 good, the eight above mixed in):

    def validate_and_split(df, schema, max_bad=0.01):
        try:
            return schema.validate(df, lazy=True), None
        except pa.errors.SchemaErrors as e:
            fc = e.failure_cases
            table_level = fc[fc["index"].isna()]
            if len(table_level):
                raise RuntimeError("schema broken, not a row problem:\\n" + ...)
            reasons = (fc.assign(r=fc["column"].astype(str) + ":" + fc["check"].astype(str))
                         .groupby("index")["r"].agg(lambda s: "; ".join(sorted(set(s)))))
            is_bad = df.index.isin(reasons.index)
            share = is_bad.mean()
            if share > max_bad:
                raise RuntimeError(f"too many bad rows: {share:.2%} > {max_bad:.0%}")
            return df[~is_bad], df[is_bad].assign(reason=reasons, batch_id=..., quarantined_at=...)

Three outcomes, all from real runs:

    bad rows 5 of 2008 = 0.25%
    publish 2003 quarantine 5
    txn_id reason
     T1003 amount_paise:greater_than(0)
     T1004 payer_vpa:not_nullable; txn_id:field_uniqueness
     T1006 merchant_id:isin([...]); status:isin([...])
     ...

    (5% of statuses changed to "Success")
    RuntimeError: too many bad rows: 5.23% > 1%

    (the producer added a device_id column)
    RuntimeError: schema broken, not a row problem:
    column            check failure_case
      None column_in_schema    device_id

A few bad rows: publish the rest, quarantine them with reason, batch and time. Many: it is a changed source — fail.
A schema problem: always fail; no row-level split is right when the table itself is wrong.

The quarantine is a table (Parquet beside silver), not a log line. Someone reviews it, the cause is fixed, and the
rows are replayed through the same validation — safe only because the load is idempotent ("Idempotent, Restartable
Loads"). Quarantined payments still count in reconciliation: they are money that has not reached the mart.

## dbt tests: the same ideas, in the warehouse

"Tests, Documentation and Sources" taught the dbt tests themselves; this topic adds placement and policy. Generic
tests on staging; singular tests for business rules and reconciliation on marts; severity: warn with warn_if /
error_if where a quarantine-like tolerance is right; store_failures: true so failing rows sit in a readable table;
and an enforced contract on any mart another team reads. The contract idea works outside dbt too — RupeeRail diffs
a table's columns against the expected set from information_schema (DuckDB, run), which named a silent rename:

    missing ['amount'] extra ['amount_paise'] type changed []

## Great Expectations (from the documentation, not run here)

Great Expectations (GX Core, the open-source library, 1.x API) organises checks as **Expectations** grouped into a
**Suite**, validated against a **Batch** of data, with results rendered as HTML "Data Docs". In outline:

    import great_expectations as gx
    context = gx.get_context()
    source = context.data_sources.add_pandas("rupeerail")
    asset = source.add_dataframe_asset(name="upi_txns")
    batch_def = asset.add_batch_definition_whole_dataframe("hourly")
    batch = batch_def.get_batch(batch_parameters={"dataframe": df})
    suite = context.suites.add(gx.ExpectationSuite(name="upi_txns"))
    suite.add_expectation(gx.expectations.ExpectColumnValuesToNotBeNull(column="txn_id"))
    suite.add_expectation(gx.expectations.ExpectColumnValuesToBeInSet(
        column="status", value_set=["SUCCESS", "FAILED", "PENDING", "REFUNDED"]))
    result = batch.validate(suite)
    print(result.success)

The older 0.x API (get_validator and YAML contexts) fills many blog posts; check the version before copying.

**Choosing.** pandera for checks inside Python or Spark jobs, unit-testable with pytest; dbt tests wherever the
transformation is dbt; Great Expectations when a platform team wants one library and readable reports across many
sources and accepts more setup. Most teams of RupeeRail's size use two: pandera at ingestion, dbt in the warehouse.`,
    workedExample: `**Scenario.** RupeeRail's silver loader for UPI transactions currently does df.dropna() and writes the rest. Last
month 4% of rows vanished for a week before anyone noticed. You are asked to replace it with a validation step.

**1. Write the contract.** With the payments backend team, agree the columns, types and rules for the extract:
txn_id unique and required, payer_vpa required and shaped like name@bank, amount_paise a positive integer, status in
four values, created_at in UTC. Put it in the repository as the pandera schema; changes to it go through review
with both teams.

**2. Validate lazily.** Run schema.validate(df, lazy=True). On the first real day: 2,008 rows, 5 failing, 0.25%.

**3. Decide the policy, per failure type.**
- Table-level failures (unexpected column, wrong type) fail the load. The device_id column added by the app team
  stopped the job with "schema broken, not a row problem" and the backend team was told the same morning.
- Row failures under 1% are quarantined with the reason; above 1%, fail. The 5% "Success" spelling failed the run
  on the day it shipped, instead of disappearing for a week.

**4. Write the quarantine where people look.** silver/quarantine/upi_txns/ as Parquet with reason, batch_id and
quarantined_at; one row per bad source row. A daily summary (rows quarantined by reason) goes to the payments data
channel, and the quarantined share is a metric with a trend.

**5. Close the loop.** When the backend team fixes a source bug, the affected batch is reloaded and revalidated —
the load is idempotent, so replaying 26 October replaces that partition instead of adding to it.

**6. Test the validator itself.** Two pytest cases: a file with one bad amount is split 7/1, and a file with an
extra column raises. Run in CI, they stop someone "simplifying" the step back to dropna().

**Result.** Rows are never silently lost: each one is published, quarantined with a reason, or the run fails loudly
with the cause named.`,
    mcqs: [
      mcq('A pandera validate call raises at the first duplicate txn_id, and the engineer wants every problem in the batch at once. What should change?', [
        ['Call validate with lazy=True and read failure_cases from the exception', true],
        ['Set strict=False on the schema so that only the first problem is skipped', false],
        ['Wrap each column check in its own try block and call validate repeatedly', false],
        ['Set coerce=True so pandera converts bad values and then keeps validating', false],
      ], 'lazy=True runs every check and collects all failures into a DataFrame on SchemaErrors. strict only controls unknown columns, repeated validate calls still stop at the first error each time, and coercion changes types rather than collecting failures.'),
      mcq('In failure_cases, a column_in_schema failure for device_id has no index. What does a sound split function do with it?', [
        ['Fail the run, because a schema change is a table problem, not a bad row', true],
        ['Ignore it, because failures without an index cannot be quarantined at all', false],
        ['Quarantine every row in the batch, since each row now has the new column', false],
        ['Drop the device_id column and publish, since the rest of the data is fine', false],
      ], 'A missing index means the failure belongs to the table, so no row split can be correct; the producer has changed the contract and someone must decide. Ignoring it publishes unvalidated structure, quarantining everything hides the cause in a row table, and dropping columns silently loses data.'),
      mcq('RupeeRail quarantines bad rows unless they exceed 1% of a batch. Why fail the run above the threshold instead of quarantining more?', [
        ['A high bad share signals a changed source, not a few bad rows to review', true],
        ['The quarantine table has a hard size limit that 1% of rows would exceed', false],
        ['pandera cannot report more than one per cent of a batch as failure cases', false],
        ['Above 1% the good rows are also likely invalid, so they are dropped too', false],
      ], 'A few bad rows are normal noise; a jump means the producer changed something and publishing the remainder would hide a systemic problem. The threshold is a policy choice, not a storage or pandera limit, and the good rows are not judged invalid by the count.'),
    ],
    checkpoint: [
      mcq('A pandera dataframe_check fails for one row and failure_cases shows seven lines with the same index. How many bad rows are there?', [
        ['One, since the check is reported once per column of that row', true],
        ['Seven, since each line in failure_cases is a separate bad row', false],
        ['None, since dataframe-level checks never point at real rows', false],
        ['It cannot be known without rerunning validation in eager mode', false],
      ], 'A wide check reports each column of the failing row, so count distinct index values. Counting lines overstates it seven times, the index does point at the row, and eager mode would only show less.'),
      mcq('The Python ingestion job and the dbt project both check RupeeRail\'s transaction data. Which split of responsibility is sound?', [
        ['pandera at ingestion for contract and rows, dbt tests on the models it builds', true],
        ['Only dbt tests, because checking in Python duplicates work done in SQL later', false],
        ['Only pandera, because dbt tests cannot see rows that were already published', false],
        ['Both run identical checks on the same table so that one can verify the other', false],
      ], 'Each tool checks the data at the point it is produced: the raw contract at ingestion, joins and business rules in the warehouse. Skipping ingestion checks lets bad data land, dbt tests do read published tables, and duplicating identical checks adds cost without coverage.'),
      mcq('What does an enforced dbt contract on a mart protect the teams that read it from?', [
        ['A column type or name changing without the build failing', true],
        ['Rows that are stale because the source loaded hours late', false],
        ['Duplicate rows created by a join on a non-unique key', false],
        ['Values outside an allowed list in a status-like column', false],
      ], 'A contract fixes the mart\'s columns and types and fails the build if the SQL produces anything else. Freshness, duplicates and allowed values are checked by source freshness, unique and accepted_values tests, not by the contract.'),
    ],
  },

  /* ── OBSERVABILITY_LINEAGE ───────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_QUALITY_GOVERNANCE_OBSERVABILITY_LINEAGE',
    notes: `Checks test what you thought of. Monitors watch for what you did not: the table that stopped updating, the source
that sent half its rows, the column that quietly became 40% null. Data observability is the practice of watching
every important table's health over time, and lineage is the map that tells you, when one of them breaks, what else
is now wrong and who to tell.

## The monitors that catch most incidents

- **Freshness** — when did this table last receive data, against what it promised?
- **Volume** — is today's row count normal for today?
- **Schema** — did a column appear, disappear or change type?
- **Distribution** — null rate, share of each category, min/max/mean of key numbers, compared with history.
- **Check results** — the history of your pandera and dbt outcomes, so a trend is visible before a failure.

## Freshness, against a promise

A freshness monitor needs a per-table promise (an SLA, or "service level objective" if you prefer) and the load time,
not the event time. RupeeRail's four raw tables at 04:30 UTC (run in pandas):

               table            last_loaded_at  sla_hours  age_h state
        raw.upi_txns 2026-10-27 03:40:00+00:00          2    0.8    ok
       raw.merchants 2026-10-26 22:05:00+00:00         24    6.4    ok
      raw.kyc_events 2026-10-26 09:10:00+00:00          6   19.3 STALE
     raw.settlements 2026-10-27 02:55:00+00:00          6    1.6    ok

Merchants are loaded once a day, so six hours is fine for them; KYC events promised six hours and are nineteen
hours old. One SLA for every table would either cry wolf about merchants or miss KYC. Use load time (a _loaded_at
column your loader writes, or the warehouse's table metadata): event times come from devices and partners, and one
phone with its clock set to next year makes max(event_time) look fresh for months — the debugging unit shows it.
dbt's source freshness ("Tests, Documentation and Sources") is exactly this check for dbt sources; an orchestrator's
sensors and alerts ("Sensors, Data-Aware Scheduling and Alerts") are where it usually runs.

## Volume, without crying wolf

Eight weeks of synthetic daily UPI transaction counts for RupeeRail: weekends about 25-30% busier than weekdays, a
festival sale on Tuesday 20 October at nearly double, and today — Monday 26 October — at 690,000 because half the
partitions failed to land. Three monitors, all run:

    2026-10-19    1202432     (Monday)
    2026-10-20    2230782     (sale day)
    ...
    2026-10-25    1530100     (Sunday)
    2026-10-26     690000     (today)

**Trailing 28-day mean ± 3 standard deviations**

    naive band 638,985 .. 2,043,586  today 690,000  alert=False

It misses a 43% drop. The window mixes weekdays with busy weekends and includes the sale day, so the standard
deviation is 234,100; even without the sale day it is 159,225. A band wide enough to hold all of that holds a
disaster too.

**Same weekday, last four weeks, median ± 25%**

    same-weekday history: 1,214,858  1,240,643  1,176,041  1,202,432
    weekday median 1,208,645  ratio 0.57  alert=True

Comparing a Monday with Mondays removes the weekly pattern, and the median ignores one odd week. A robust z-score
(median and MAD instead of mean and standard deviation) on the eight Mondays gave -24.7 — unmistakable.

**Backtest before you trust it.** Replaying both monitors over the previous four weeks, each alerted on exactly one
day: the sale. That is a true anomaly and an expected one, so RupeeRail keeps a calendar of known events (sales,
festivals, bank holidays, the IPL final) and marks those alerts as expected instead of paging someone. Always
backtest a monitor on history before it pages anyone: a monitor that alerts every Saturday is switched off by the
second weekend, and then it misses the real drop.

## Schema and distribution monitors

Schema: store each table's columns and types after every load and diff them, as the previous lesson's contract
check did. Distribution: track the null
rate and category shares of key columns, and alert on a jump rather than a level — payer_vpa nulls going from 0.2%
to 3% in a day matter even though 3% is "low".

## Keep the results

Write every check and monitor outcome to one table, so history is queryable and a dashboard can show health:

    create table dq_results(run_at timestamptz, table_name varchar, check_name varchar,
                            status varchar, failed_rows bigint)

    select table_name, check_name, status, failed_rows from dq_results
    where run_at = (select max(run_at) from dq_results) and status <> 'pass'

        table_name       check_name status  failed_rows
      fct_payments recon_raw_vs_fct   fail            1
    raw.kyc_events     freshness_6h   fail         <NA>

Observability tools — commercial (Monte Carlo) and open-source (Elementary for dbt, Soda Core) — automate these
monitors and learn thresholds from history (from their documentation, not run). Owners and severities stay your job.

## Lineage: what depends on what

Lineage is the graph of which jobs read which datasets and write which others. dbt draws it for models from ref and
source. Across tools — an Airflow task, a Spark job, a dbt model, a Python loader — **OpenLineage** is the open
standard (written here from its specification, not run): each job run emits events (START, RUNNING, COMPLETE, FAIL,
ABORT) naming the job, the run, its input datasets and its output datasets, with optional facets such as the
schema, column-level lineage or data-quality metrics:

    {"eventType": "COMPLETE", "eventTime": "2026-10-27T01:12:09Z",
     "run": {"runId": "<uuid>"}, "job": {"namespace": "rupeerail-airflow", "name": "build_dim_users"},
     "inputs": [{"namespace": "duckdb://warehouse", "name": "stg_kyc"}],
     "outputs": [{"namespace": "duckdb://warehouse", "name": "dim_users"}], "producer": "..."}

Integrations exist for Airflow (the OpenLineage provider), Spark (a listener) and dbt; Marquez is the reference
server that stores and draws the graph, and catalogues such as DataHub and the cloud catalogues ingest it.

## Impact analysis: a graph walk

When raw.kyc_events went stale, what is affected? With lineage as a list of (upstream, downstream) edges, a
breadth-first walk answers it (plain Python, run):

    impact of broken stg_kyc:
      hop 1: dim_users  [-]
      hop 2: fct_payments  [-]
      hop 2: mart_kyc_funnel  [growth]
      hop 3: mart_merchant_settlement  [payments-eng]
      hop 3: mart_daily_gmv  [analytics]
      hop 3: ml_fraud_features  [risk-ml]
      hop 4: job:merchant payout file  [finance-ops]
      hop 4: dash:CEO GMV dashboard  [analytics]
      hop 4: model:fraud scorer  [risk-ml]
    consumers to notify: ['dash:CEO GMV dashboard', 'job:merchant payout file', 'mart_kyc_funnel', 'model:fraud scorer']
    owners: ['analytics', 'finance-ops', 'growth', 'risk-ml']

Walking upstream instead answers the other incident question — "the GMV dashboard is wrong; where could the cause
be?" — and gave nine candidates, from raw.upi_txns to fct_payments. graphlib.TopologicalSorter over the affected
nodes gives a safe rebuild order (stg_kyc, dim_users, fct_payments, ... the marts, then the consumers); the order of
independent siblings varied between runs, and any order that respects the edges is correct.

The leaves matter most: a payout file and a fraud model are where a stale table turns into money and customers.
Lineage plus ownership turns "something is broken" into four messages to four teams in the first ten minutes.`,
    workedExample: `**Scenario.** Tuesday 04:30 UTC (10:00 IST). The freshness monitor reports raw.kyc_events STALE: 19.3 hours old
against a six-hour promise. Every pipeline run since yesterday was green. Decide what to do in the first half hour.

**1. Confirm it is real.** Query max(_loaded_at) directly: 2026-10-26 09:10. The partner's KYC export job failed
silently; our loader ran, found no new file, and succeeded with zero rows. (Fix later: a loader that finds no file
when one is due should fail, not succeed.)

**2. Walk downstream.** The lineage walk lists dim_users, fct_payments, mart_kyc_funnel, three marts, and four
consumers: the CEO GMV dashboard, the merchant payout file, the fraud model and the growth team's KYC funnel.

**3. Judge each consumer's exposure.**
- Payout file (finance-ops): users who completed KYC yesterday are missing from dim_users, so their payments sit
  under an unknown user. Payout totals are still right per merchant. Low risk; tell them.
- Fraud scorer (risk-ml): new users look unverified, so the model over-flags them. Customer-facing; tell risk-ml
  first and suggest they relax the unverified-user rule until the data lands.
- KYC funnel (growth): yesterday's completions are undercounted. Put a banner on the dashboard.
- CEO GMV: unaffected in total, since GMV does not depend on KYC status. Say so explicitly; silence makes people
  assume the worst.

**4. Notify with the facts.** One message per owner: what is stale, since when, what it means for their output,
and when you will update them.

**5. Recover.** When the partner resends, load it, then rebuild in topological order from stg_kyc down. Freshness
returns to ok and the dq_results history shows the 19-hour gap.

**6. Prevent.** The loader now fails when an expected daily file is missing, and the freshness monitor pages after
eight hours instead of being read in the morning.`,
    mcqs: [
      mcq('A volume monitor uses the trailing 28-day mean ± 3 standard deviations and misses a 43% drop on a Monday. What is the main reason?', [
        ['Weekend peaks and a sale day inflate the deviation, so the band is very wide', true],
        ['Three standard deviations is too narrow, so the drop was treated as noise', false],
        ['The mean ignores Mondays, so Monday counts never enter the band at all', false],
        ['The monitor should have used event times instead of the daily row count', false],
      ], 'Mixing weekdays, busy weekends and a festival spike produced a standard deviation of 234,100, so the band reached down to 638,985. A narrower multiple would help but the real fix is comparing like with like; the mean includes Mondays, and event time is unrelated to a count band.'),
      mcq('Why should a freshness monitor use the load time rather than max(event_time) from the data?', [
        ['A device with a future clock makes max(event_time) look fresh for months', true],
        ['Event times are always in IST while load times are stored in UTC instead', false],
        ['Warehouses cannot compute a maximum over timestamp columns efficiently', false],
        ['Load time is the only timestamp that dbt source freshness will ever accept', false],
      ], 'Event times come from phones and partners and can be wrong or late; load time is written by your own loader and measures whether data is arriving. Time zones can be handled either way, max is cheap, and dbt accepts any loaded_at_field you name.'),
      mcq('In an OpenLineage run event, what makes lineage possible across Airflow, Spark and dbt?', [
        ['Each event names the job and its input and output datasets in one shared format', true],
        ['Each tool copies its data into Marquez so that rows can be traced to their jobs', false],
        ['Each event carries the full SQL text, which a parser turns into a graph later', false],
        ['Each tool writes to one shared database so the catalogue can read its tables', false],
      ], 'The standard is metadata: job, run, inputs and outputs (plus optional facets), emitted by any tool in the same shape, so a backend can join the graph. No data is copied, SQL text is optional and not how edges are formed, and the tools keep their own storage.'),
    ],
    checkpoint: [
      mcq('A monitor alerts on RupeeRail\'s festival sale day every year. What is the right change?', [
        ['Keep the alert but mark it expected using a calendar of known events', true],
        ['Widen the band permanently so that sale days no longer trigger it', false],
        ['Remove the volume monitor, because alerts on real events are noise', false],
        ['Exclude every Tuesday from monitoring, since the sale was a Tuesday', false],
      ], 'The spike is a true anomaly with a known cause, so annotating it keeps the monitor sensitive on normal days. A permanently wider band misses real drops, removing it loses all protection, and the weekday is irrelevant to a dated event.'),
      mcq('raw.kyc_events is stale. Which question does a downstream lineage walk from it answer?', [
        ['Which tables, jobs, models and dashboards are now affected, and who owns them', true],
        ['Which upstream partner export failed, and at what time it should have run', false],
        ['Which rows inside raw.kyc_events are invalid and need to be quarantined', false],
        ['How many hours the data has been stale relative to its six-hour promise', false],
      ], 'Downstream lineage gives impact and owners to notify. The failing partner job is an upstream question, row validity is a check on the table, and staleness is what the freshness monitor already told you.'),
      mcq('Why backtest a new anomaly monitor on past data before it is allowed to page anyone?', [
        ['To see how often it would alert, so a noisy monitor is fixed before it is ignored', true],
        ['To train the monitor, since anomaly checks cannot run until they have been fitted', false],
        ['To fill the dq_results table, because dashboards need history to draw a chart', false],
        ['To prove the data was correct in the past, which makes current alerts redundant', false],
      ], 'Replaying history shows false alerts (every weekend, say) that would get the monitor switched off. A median band needs no training step, filling a table is a side effect not the purpose, and past correctness says nothing about today.'),
    ],
  },

  /* ── GOVERNANCE_PRIVACY ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_QUALITY_GOVERNANCE_GOVERNANCE_PRIVACY',
    notes: `A payments platform holds names, phone numbers, UPI IDs, PAN numbers and every rupee each person spent. Governance
is how a data team makes sure the right people can find and use the data they need, nobody sees personal data they
do not need, and the company can show a regulator, an auditor or a customer what it holds and why. For a data
engineer it is mostly engineering: tags, grants, views, keyed hashes and deletion jobs.

## Catalogues and ownership

A catalogue answers "what data do we have, what does it mean, who owns it, and is it sensitive?". At minimum, every
published table has: an owner (a team, not a person who might leave), a description, column descriptions for
anything non-obvious, a classification (public, internal, confidential, personal), and lineage. dbt's docs give
you some of this for models; a catalogue gathers it across the whole platform.

The tools, described from their documentation (none was run here):

- **AWS Glue Data Catalog** holds table definitions for the lake (Athena, EMR and Redshift Spectrum read it), and
  **AWS Lake Formation** adds permissions on it: grants on databases, tables and columns, tag-based access control
  (LF-Tags), and data filters for row- and cell-level security. Amazon Macie scans S3 for sensitive data.
- **Databricks Unity Catalog** — a three-level namespace (catalog.schema.table), SQL GRANTs to groups, row filters
  and column masks defined as SQL functions, and lineage captured from queries.
- **Microsoft Purview** — scans Azure (and other) sources into a data map, classifies sensitive columns
  automatically, and provides the catalogue and lineage for Azure data platforms.
- **DataHub** — an open-source metadata platform: ingestion from warehouses, dbt, Airflow and BI tools, lineage,
  ownership, glossary terms and search.

The tool matters less than the habit: no table is published without an owner and a classification.

## Access control

Least privilege, applied with groups, never to individuals: analysts read marts, not raw; the fraud team reads
pseudonymised user keys, not phone numbers; only KYC operations can see PAN. Three mechanisms, in order of how often
you will use them:

- **Grants** on schemas and tables to roles or groups (and revoking the default "everyone can read").
- **Views** that expose only what a group needs. A masked view in DuckDB (run):

      create view users_analyst as
      select user_id, phone_hmac as phone_key, 'XXXXXX' || right(phone, 4) as phone_masked, city
      from users_raw

      user_id            phone_key phone_masked      city
           U1 7520e988e7c93d78530e   XXXXXX3210 Bengaluru

- **Column masks and row filters** in the platform (Unity Catalog, Lake Formation data filters, Snowflake masking
  policies), which apply the rule wherever the table is queried.

## Protecting personal data: five techniques

Run on three synthetic users (all output real):

**1. Masking for display** — hide most of the value where a human only needs to recognise it:

    user_id      phone            email        pan      city
         U1 XXXXXX3210 a***@example.com XXXXX1234X Bengaluru

Masking is for screens and support tools. It is lossy and useless as a join key.

**2. Plain hashing is not anonymisation.** sha256 of a phone number looks random, but the input space is small:

    sha256(phone) = 7619ee8cea49187f ...
    reversed to 9876543210 after 543,211 guesses in 0.95s

That was pure Python on one laptop core, knowing the first four digits. All Indian mobile numbers are a few
billion candidates — hours in Python, far less with GPU cracking tools. The same holds for PAN, Aadhaar-like IDs,
dates of birth and pincodes.

**3. Keyed hashing (HMAC) for pseudonymisation.** Mix in a secret key kept in a secrets manager (AWS Secrets Manager,
Azure Key Vault), never in code or the data:

    hmac.new(KEY, phone.encode(), hashlib.sha256).hexdigest()[:20]
    U1 7520e988e7c93d78530e     same input, same token: True

Same input, same output, so teams can still join and count distinct users; without the key, enumeration is
useless. This is the "salt" a pipeline needs: one secret, shared deliberately. A **random salt per record** (right
for passwords) breaks joins:

    salted twice: 37e30dadb2caa797$45e569b9bfe0 9d6aa8e5ebec9349$916272e1be2b equal? False

Pseudonymised data is still personal data in law: whoever holds the key can re-identify it.

**4. Tokenisation with a vault** — replace the value with a random token and store the mapping in a separate,
tightly controlled service. Only an authorised role can reverse it:

    token looks like: tok_... len 16
    kyc-ops gets: ABCPR1234K
    PermissionError: role analyst may not detokenise

Use it when some process must recover the original (sending a payout to the real account), which a hash cannot do.

**5. Generalisation** — keep what analysis needs and drop precision: age band instead of age, the first three digits
of a pincode:

    user_id age_band   pin3
         U1    18-25 560XXX

Encryption at rest and in transit is the baseline every cloud gives you; it protects against stolen disks and
snooping, not against an over-privileged analyst running SELECT.

## Retention and deletion

Keep personal data only as long as its purpose needs, then delete it — on a schedule, by design. Partition by date
so old data is dropped by partition. Raw zones are the usual leak: the mart was minimised, the raw JSON still holds
every phone number from 2022. Deleting one person from a lake means deleting from every layer and every copy; with
Delta or Iceberg ("Open Table Formats") that is a DELETE followed by removing old files (VACUUM or snapshot expiry),
otherwise time travel still holds the data. Backups and exports to other teams count too, which is why lineage
matters here as well.

## India's DPDP Act, in outline

The Digital Personal Data Protection Act, 2023 governs digital personal data in India. In outline: a **Data
Fiduciary** (the company deciding why and how data is processed) handles a **Data Principal**'s data on the basis of
notice and consent or certain legitimate uses; uses it for the stated purpose; protects it with reasonable security
safeguards; reports personal data breaches to the Data Protection Board and the affected people; and erases it when
the purpose is served or consent is withdrawn, unless a law requires keeping it. Principals have rights to
information, correction, erasure and grievance redressal. Children's data needs verifiable parental consent, and
larger "Significant Data Fiduciaries" have extra duties such as audits and impact assessments. Its rules were
notified with obligations phasing in over time.

This is an outline for engineers, not legal advice. **Check the current Act, the DPDP Rules and their dates on
MeitY's website, and your company's legal and privacy team, before relying on any detail** — including sector rules
that apply on top (RBI's payment-data storage requirements for a company like RupeeRail, for instance).

What it means for your pipelines: know where every personal field lives (classification and lineage), collect and
keep only what the purpose needs (minimisation), restrict and log access, be able to find and erase one person's
data across every layer, and be able to tell quickly what a breach exposed.`,
    workedExample: `**Scenario.** RupeeRail's growth team wants a table of users, their transactions and their city to study which
cities adopt UPI Lite fastest. The source has name, phone, email, PAN, date of birth, full address, and every
transaction. Design what you publish.

**1. Start from the purpose, not the source.** The analysis needs: a stable user key (to count users and repeat
use), city, an age band, transaction date, amount and type. It does not need name, phone, email, PAN, exact birth
date or street address. Leave them out — data minimisation is the strongest control there is.

**2. Pseudonymise the key.** user_key = HMAC-SHA256 of the internal user_id with the analytics key from Secrets
Manager. The fraud mart uses the same key, so the two can be joined if a later study needs it; nobody in growth can
reverse it. Not plain sha256 of the phone: that was reversed in under a second for a known prefix.

**3. Generalise.** age_band from date of birth (18-25, 26-35, 36-50, 51+); city kept, pincode reduced to three
digits; drop the address.

**4. Small groups.** A city with three users is close to identifying them. Suppress or merge any city-month cell
with fewer than, say, 20 users in the published aggregate.

**5. Access and classification.** Publish to the growth schema with a grant to the growth-analysts group only.
Catalogue entry: owner growth-data, classification personal (pseudonymised), purpose "UPI Lite adoption study",
retention 12 months, lineage from fct_payments and dim_users.

**6. Retention and erasure.** The table is rebuilt daily from the source, so a user erased upstream disappears at
the next build; the 12-month retention is a scheduled partition drop.

**Result.** Growth gets everything their analysis needs, and a leaked copy of the table exposes no name, phone, PAN
or exact age.`,
    mcqs: [
      mcq('A team stores sha256(phone_number) as the "anonymised" user key in an analytics table. What is the main risk?', [
        ['Phone numbers are few enough to hash them all and reverse the key', true],
        ['sha256 is too slow to compute for a table with millions of rows', false],
        ['Two different phone numbers often produce the same sha256 value', false],
        ['sha256 output changes between runs, so the key cannot be joined', false],
      ], 'The input space is small, so an attacker hashes every candidate number and matches; one core reversed a known-prefix number in under a second. sha256 is fast, collisions are practically impossible, and it is deterministic, which is exactly why enumeration works.'),
      mcq('Payments and fraud teams must join on a pseudonymous user key that analysts cannot reverse. Which technique fits?', [
        ['HMAC with one secret key from a secrets manager, shared by both pipelines', true],
        ['A random salt per record, stored next to each hash in the same table', false],
        ['Masking the phone to its last four digits and joining on the masked value', false],
        ['Encrypting the storage bucket at rest with a key from the cloud provider', false],
      ], 'A keyed hash is deterministic for joins and useless to anyone without the key. Per-record salts make the same phone hash differently every time, masked values collide across users, and encryption at rest does nothing once an analyst can query the table.'),
      mcq('Under India\'s DPDP Act, in outline, what must happen to personal data once its purpose is served or consent is withdrawn?', [
        ['It must be erased, unless a law requires it to be retained', true],
        ['It may be kept indefinitely if it is encrypted at rest', false],
        ['It must be moved to a separate archive bucket in India', false],
        ['It may be kept if it is masked in the reporting views', false],
      ], 'The Act requires erasure when the purpose is no longer served or consent is withdrawn, subject to legal retention duties; check the current rules for detail. Encryption and masking protect data but do not remove the duty, and an archive is still retention.'),
    ],
    checkpoint: [
      mcq('An analyst needs to count distinct users by city but must not see phone numbers. What should the published view expose?', [
        ['A keyed-hash user key and the city, without the phone column', true],
        ['The phone column masked to its last four digits, with the city', false],
        ['The raw phone, with a policy telling analysts not to look at it', false],
        ['The phone encrypted, with the decryption key given to analysts', false],
      ], 'A deterministic pseudonymous key counts distinct users without revealing anyone. Last-four masking collides across users and still leaks part of the number, a policy is not a control, and handing out the decryption key exposes the phone.'),
      mcq('A payout process must send money to a user\'s real bank account later. Which technique lets it recover the original value?', [
        ['Tokenisation, with the mapping held in a vault only payouts can read', true],
        ['HMAC pseudonymisation with a key stored in the secrets manager', false],
        ['Generalisation of the account number to its first few digits only', false],
        ['Masking the account number for display in the support console', false],
      ], 'A token can be swapped back for the original by an authorised service; that is the point of a vault. A keyed hash is one-way, generalisation and masking throw information away, so none of them can recover the account number.'),
      mcq('A user asks RupeeRail to erase their data. The marts are rebuilt nightly. Where is the data most likely to survive?', [
        ['In raw files, old table-format versions and exported copies', true],
        ['In the marts, since nightly rebuilds always keep old rows', false],
        ['In the catalogue, since it stores each table\'s row values', false],
        ['In the lineage graph, since it records each person\'s rows', false],
      ], 'Raw zones, time-travel versions not yet vacuumed, backups and exports are where personal data lingers. A rebuilt mart drops the erased user, and catalogues and lineage hold metadata about tables, not row values.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_QUALITY_GOVERNANCE_DEBUGGING',
    notes: `Seven things that went wrong in RupeeRail's quality and governance code. Each was reproduced on synthetic data with
pandas 3.0, pandera 0.35 and plain Python, and the output quoted is what it printed. The pattern is the same as in
every debugging unit: read the symptom, find the one cause, change only that. What makes these hard is that most of
them do not crash — a quality check that is wrong usually fails by passing.

## 1. A timestamp column that fails on every batch

**Symptom.** A schema that worked last year now fails on every batch, with no index:

    column                                 check         failure_case  index
    created_at  dtype('datetime64[ns, UTC]')  datetime64[us, UTC]   None

**Cause.** pandas 3 parses timestamps at microsecond resolution by default; the schema says nanoseconds, and pandera
compares data types exactly.

**Fix.** Declare the resolution the data really has ("datetime64[us, UTC]"), or cast once at the boundary you own
(df["created_at"].astype("datetime64[ns, UTC]")) and keep the schema. Do not switch on coerce for the whole schema
to make one column pass: coercion also hides real type changes from the producer.

## 2. The quarantine split that lets a broken schema through

**Symptom.** The producer added amount_rupees beside amount_paise. The load reported "good 3 bad 0" and published.

**Cause.** The split function dropped failure cases without an index before deciding:

    fc = e.failure_cases.dropna(subset=["index"])

The only failure was table-level (column_in_schema, failure_case amount_rupees, index None), so after dropna there
was nothing left and every row counted as good.

**Fix.** Check table-level failures first and fail the run if there are any; quarantine only row-level failures.
Add a test: a frame with one extra column must raise.

## 3. A freshness check that reports the data is from the future

**Symptom.** The partner feed has not loaded since 00:05, yet the monitor says it is fine:

    event-time lag h: -3744.5
    load-time lag h: 9.4

**Cause.** The monitor used max(created_at). One partner terminal had its clock set to April 2027, so the newest
"event" is five months ahead and the lag is negative — the table looks fresh until next April.

**Fix.** Measure freshness on load time (_loaded_at written by your loader). Separately, a validity check that
created_at is not more than a few minutes in the future catches the bad clock.

## 4. Impact analysis that finds no one to notify

**Symptom.** The lineage walk listed nine affected nodes, but the "consumers to notify" list was empty:

    buggy leaves: []

**Cause.** The graph is a defaultdict(list). Leaves were computed as affected - set(down), but the walk itself read
down[node] for every node it visited, and reading a missing key in a defaultdict inserts it. Every node became a key,
so nothing looked like a leaf.

**Fix.** A leaf is a node with no downstream edges: [n for n in affected if not down.get(n)]. .get does not insert.
The fixed walk named four consumers and four owning teams.

## 5. Two pseudonymised tables that will not join

**Symptom.** Payments and risk both store an HMAC phone key; joining them returns 0 rows. With the same key: 2.

**Cause.** Each team generated its own HMAC key. Keyed hashes from different keys never match — which is the
protection working as designed.

**Fix.** One analytics pseudonymisation key in the secrets manager, owned by the platform team, used by every
pipeline that must join; separate keys only where joining is meant to be impossible.

## 6. One person, three keys

**Symptom.** Distinct-user counts are too high. One user's phone produced three different keys:

    raw hashes distinct: 3
    normalised hashes distinct: 1

**Cause.** The phone arrived as 9876543210, +91 98765 43210 and 09876543210 from different apps. A hash changes
completely with any change of input.

**Fix.** Normalise before hashing (digits only, last ten digits for an Indian mobile), and put the normalisation in
the one shared function every pipeline calls.

## 7. A range check that passes half-empty data

**Symptom.** A schema with amount_paise nullable=True and Check.gt(0) validated all 4 rows; 2 of them had no amount.

**Cause.** nullable=True allows nulls, and checks skip null values by default. The rule "amounts are positive"
passed; nobody had written "amounts are present".

**Fix.** Make the column non-nullable, or, if some nulls are legitimate (FAILED transactions), write that rule
explicitly — a dataframe check that SUCCESS rows have an amount — and monitor the null rate.

## The habit

Every one of these passed silently or failed confusingly. Test the checks themselves: feed each one a batch it must
reject, and make sure it does.`,
    mcqs: [
      mcq('A pandera schema with "datetime64[ns, UTC]" fails on every batch after an upgrade to pandas 3, with failure_case datetime64[us, UTC]. What fixes it properly?', [
        ['Declare the us resolution in the schema, or cast once at the boundary you own', true],
        ['Set coerce=True on the whole schema, so every column is converted on the way in', false],
        ['Remove the created_at column from the schema, so the type is no longer checked', false],
        ['Downgrade pandera to an older release that ignores the timestamp resolution', false],
      ], 'pandas 3 parses to microseconds and pandera compares types exactly, so state the real type or convert deliberately. Schema-wide coercion hides real producer type changes, removing the column removes the check, and downgrading avoids rather than fixes it.'),
      mcq('A lineage walk built on defaultdict(list) reports no leaf consumers although a dashboard depends on the table. What is the cause?', [
        ['Reading a missing key in a defaultdict inserts it, so every node became a key', true],
        ['Breadth-first search cannot reach nodes that are more than three hops away', false],
        ['The dashboard has no owner, so the walk filters it out of the leaf list', false],
        ['A graph with diamonds in it must be walked depth-first to find any leaves', false],
      ], 'down[node] inside the walk created empty entries, so affected - set(down) was empty; down.get(n) does not insert. BFS reaches any depth, owners are looked up after leaves are found, and both search orders find the same leaves.'),
      mcq('Payments and risk store HMAC phone keys, and joining them returns zero rows. What is the likely cause?', [
        ['Each team used a different secret key, so the same phone hashes differently', true],
        ['HMAC output is random on each call, so equal phones never give equal keys', false],
        ['The key column is too short, so pandas cannot compare the two hash values', false],
        ['Joins on hashed columns need a special hash join that pandas does not have', false],
      ], 'A keyed hash is deterministic for one key and unrelated across keys, so teams that must join need one shared key. HMAC is not random, the truncated hex strings compare normally, and pandas joins any equal values.'),
      mcq('A freshness monitor on max(created_at) shows a negative lag of thousands of hours. What should it use instead?', [
        ['The load time written by the loader, not the event time in the data', true],
        ['The median created_at, which a few wrong clocks cannot move much', false],
        ['The minimum created_at, which is never in the future for any row', false],
        ['The row count, since a stale table always has fewer rows than usual', false],
      ], 'Load time measures whether data is arriving, which is what freshness means; event times come from devices with wrong clocks. A median or minimum of event time still does not measure arrival, and a row count is a volume check that a stale but full table can pass.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_QUALITY_GOVERNANCE_PRACTICE',
    notes: `Eight exercises, easiest first. Write your answer before reading ours. Answers 3, 4 and 6 were run with pandas 3.0,
pandera 0.35 and DuckDB 2.0 on the topic's synthetic RupeeRail data.

## 1. Name the dimension (easy)

For each, name the quality dimension: (a) 2% of rides have no drop location; (b) a ride_id appears twice; (c) a fare
of -40 rupees; (d) the rides table last loaded 30 hours ago against a 6-hour promise; (e) our ride revenue for
October is 1.2% below the payment gateway's settlement total; (f) rides reference a driver_id missing from drivers.

**Answer.** (a) completeness; (b) uniqueness; (c) validity; (d) freshness; (e) consistency across systems (and, by
proxy, accuracy); (f) consistency — referential integrity.

## 2. Where does it go? (easy)

Place each check at ingestion, staging, mart or monitor: (a) the file has the agreed columns; (b) payment status in
the allowed list; (c) settlement payouts equal successful payments minus fees per merchant; (d) today's row count is
normal for a Monday; (e) txn_id is unique.

**Answer.** (a) ingestion; (b) staging; (c) mart; (d) monitor; (e) staging (and again on the fact table, after joins).

## 3. Write the schema (medium)

Write a pandera check that every created_at falls inside the batch's day (26 October 2026, UTC), and a table-level
check that FAILED transactions are under 20% of the batch. Which RupeeRail row fails?

**Answer.**

    day_start = pd.Timestamp("2026-10-26", tz="UTC"); day_end = day_start + pd.Timedelta(days=1)
    s = pa.DataFrameSchema({
        "created_at": pa.Column("datetime64[us, UTC]",
            pa.Check(lambda c: (c >= day_start) & (c < day_end), name="in_batch_day")),
        "status": pa.Column(str),
    }, checks=[pa.Check(lambda d: (d["status"] == "FAILED").mean() < 0.20, name="failed_share_below_20pct")])

    column        check              failure_case  index
    created_at in_batch_day 2026-10-27 08:00:00+00:00      6

T1007 belongs to the next day's batch. The failed share was 0.143 after dropping the exact duplicate, so the
table-level check passed.

## 4. Reconcile two layers (medium)

Write one SQL query that compares SUCCESS counts and amounts per day between raw_txns and fct_payments and labels each
day ok or MISMATCH.

**Answer.**

    with r as (select txn_date, count(*) n, sum(amount) amt from raw_txns where status='SUCCESS' group by 1),
         f as (select txn_date, count(*) n, sum(amount) amt from fct_payments where status='SUCCESS' group by 1)
    select r.txn_date, r.n raw_n, f.n fct_n, r.amt raw_amt, f.amt fct_amt,
           case when r.n = f.n and r.amt = f.amt then 'ok' else 'MISMATCH' end as state
    from r left join f using (txn_date) order by 1

      txn_date  raw_n  fct_n  raw_amt  fct_amt    state
    2026-10-25      2      2    350.0    350.0       ok
    2026-10-26      3      2    595.0    520.0 MISMATCH

The left join from raw matters: a day missing entirely from the fact table shows up with NULLs and fails the
comparison instead of disappearing.

## 5. Quarantine or fail? (medium)

Decide for each: (a) 3 of 40,000 rows have a malformed UPI ID; (b) 6% of rows have status "Success"; (c) the file has
a new column device_id; (d) the file has 0 rows on a weekday; (e) 1 row has amount_paise 0 with status SUCCESS.

**Answer.** (a) quarantine; (b) fail — above the threshold, a source change; (c) fail — a table-level contract
change; (d) fail — a missing load is a completeness failure, not a quiet success; (e) quarantine, and tell the
producer, because a zero-value successful payment should not exist.

## 6. Pick the volume monitor (medium)

Daily counts have a strong weekly pattern and a sale day in the last four weeks. Which monitor caught a 43% Monday
drop, and why did the other miss it?

**Answer.** Same weekday, last four weeks, median ± 25%: ratio 0.57, alert. The trailing 28-day mean ± 3 standard
deviations had a band of 638,985 to 2,043,586 and did not alert on 690,000, because weekends and the sale day
inflated the standard deviation.

## 7. Choose the protection (medium)

Choose masking, HMAC pseudonymisation, tokenisation, generalisation or removal: (a) a support agent confirming a
caller's phone; (b) joining fraud and payments data on a user; (c) the payout service sending money to a bank
account; (d) a growth study needing age; (e) a growth study that does not need email.

**Answer.** (a) masking (last four digits); (b) HMAC with one shared key; (c) tokenisation with a vault; (d)
generalisation to age bands; (e) remove it — minimisation first.

## 8. Plan the incident (hard)

raw.settlements is stale by 10 hours. Lineage shows mart_merchant_settlement and the merchant payout file downstream.
List your first five actions.

**Answer.** (1) Confirm with max(_loaded_at) and the loader's logs. (2) Walk downstream and list owners:
payments-eng for the mart, finance-ops for the payout file. (3) Tell finance-ops before the payout cut-off and agree
to hold the file rather than pay from stale data. (4) Fix or rerun the load; rebuild downstream in topological
order. (5) Reconcile the payout total with the bank's settlement, then release, and add a check so the payout job
cannot run on a stale settlement table.`,
    mcqs: [
      mcq('A rides table has fares of -40 rupees on a few rows. Which dimension is that, and where is it first checked?', [
        ['Validity, checked in staging as a range rule on fare', true],
        ['Consistency, checked in the marts against the payment gateway', false],
        ['Completeness, checked at ingestion as a required-column rule', false],
        ['Accuracy, checked by a monthly audit against driver records', false],
      ], 'A value breaking its own rule is validity, and a range check belongs in staging where the values are first typed. Reconciliation happens later and is about totals, completeness is about missing values, and an audit catches it far too late.'),
      mcq('A batch of 40,000 UPI rows has 3 malformed payer IDs. Under a 1% threshold policy, what does the loader do?', [
        ['Publish 39,997 rows and quarantine 3 with the reason', true],
        ['Fail the load and keep yesterday\'s data in place', false],
        ['Publish all 40,000 rows and log a warning message', false],
        ['Drop the 3 rows and publish without any record of them', false],
      ], 'Three rows is far below 1%, so the good rows flow and the bad ones are kept with a reason for review. Failing everything is for table-level or high-share problems, publishing bad rows spreads them, and silent drops lose money and evidence.'),
      mcq('Why should a reconciliation query left-join from the raw daily totals to the fact table\'s?', [
        ['A day missing from the fact table then shows as NULL and fails', true],
        ['A left join is faster than an inner join on grouped daily totals', false],
        ['An inner join would count every SUCCESS transaction two times', false],
        ['The fact table has more days, so an inner join would drop them', false],
      ], 'With an inner join a day absent from the fact table disappears from the result and looks fine; the left join keeps it with NULLs that fail the comparison. Speed is not the reason, an inner join does not double count, and the raw side is the one that defines which days should exist.'),
      mcq('Which protection fits a support agent confirming a caller\'s registered phone number on a screen?', [
        ['Masking that shows only the last four digits', true],
        ['HMAC pseudonymisation with the analytics key', false],
        ['Tokenisation with the vault, shown as a token', false],
        ['Generalisation of the phone to its first digits', false],
      ], 'The agent needs to recognise the number, not use it, so a mask showing the last four digits is enough. An HMAC key or a token means nothing to a human reading it, and the first digits mostly identify the operator and region, not the person.'),
      mcq('The settlements table is 10 hours stale and the payout file is built from it. What is the first priority after confirming the staleness?', [
        ['Tell finance-ops before the payout cut-off so the file is held', true],
        ['Rebuild every mart in the warehouse so that all of them are fresh', false],
        ['Widen the freshness promise to 12 hours so the alert stops firing', false],
        ['Write a post-incident review before anyone else is told about it', false],
      ], 'The payout file is where stale data becomes wrong money, so its owner must know before it is sent. Rebuilding everything does not load the missing data, widening the promise hides the problem, and the review comes after the response.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_QUALITY_GOVERNANCE_INTERVIEW_QUESTION',
    notes: `Asked in data engineer and analytics engineer interviews at fintechs, product companies and GCCs in Bengaluru,
Hyderabad and Pune — often as "tell me about a time the data was wrong". Say each answer aloud in about two minutes,
then compare. Interviewers listen for whether you think about owners, severity and impact, not only tools.

## Q1. "How do you make sure the data your pipeline publishes is correct?"

**Model answer.** "In layers. At ingestion I validate the contract — columns, types, required fields — with pandera,
and a schema change fails the load. In staging I check validity, uniqueness and referential integrity; a few bad
rows go to a quarantine table with the reason, and above a threshold the run fails, because that is a source change,
not bad luck. In the warehouse, dbt tests on keys and accepted values, singular tests for business rules, and a
reconciliation against an independent source — for payments, the bank settlement. Outside the pipeline, freshness and
volume monitors, because checks only test what I thought of. Every check has an owner and a severity decided in
advance."

**Follow-up.** "What do you do with the quarantined rows?" — "They are a table, not a log line: reason, batch, time.
Someone reviews them daily, the producer fixes the cause, and the rows are replayed through the same validation —
the load is idempotent, so a replay replaces the partition. And they count in reconciliation, so nobody thinks the
money is complete when it is not."

## Q2. "A dashboard number dropped 40% overnight and nothing failed. How do you investigate?"

**Model answer.** "First I check whether it is the data or the business, cheapest first. Freshness: did yesterday
finish loading — by load time, not event time. Volume against the same weekday. Then uniqueness and nulls on the key
columns, then the distribution of status-like columns — a new spelling filtered out by a WHERE clause is a classic.
Then I walk lineage upstream from the dashboard to find which table changed first. Once I have the cause I walk
downstream to see who else is affected and tell them, then fix, backfill, and add the check that would have caught
it."

**Follow-up.** "How would you have caught it automatically?" — "A volume monitor comparing with the same weekday,
backtested so it does not alert every weekend, plus accepted-values on the raw status with severity warn, so a new
value is visible the day it appears."

## Q3. "How do you handle personal data in a data platform?"

**Model answer.** "Minimise first: if the analysis does not need the phone number, it never leaves raw. Classify
columns in the catalogue so we know where personal data is. Analysts get pseudonymised keys — an HMAC with a secret
key from the secrets manager, not a plain hash, because phone numbers can be enumerated. Where a process must recover
the value, tokenisation with a vault. Access through groups and views or column masks. Retention by partition so
old data is actually dropped, and an erasure process that covers raw, old table versions and exports. Under India's
DPDP Act that maps to purpose limitation, security safeguards and erasure, and I would check the current rules with
legal rather than rely on memory."

**Follow-up.** "Is the HMAC-ed data anonymous?" — "No. It is pseudonymous: whoever has the key can re-identify it,
so it is still personal data and still needs access control."

## Q4. "What is data lineage and how have you used it?"

**Model answer.** "Lineage is the graph of which jobs read and write which datasets. dbt gives it for models from ref;
across Airflow, Spark and dbt, OpenLineage is the standard — each run emits its inputs and outputs, and a backend
such as Marquez or a catalogue joins them. I use it in two directions: downstream for impact — when a source went
stale I listed the affected marts and the four consuming teams in minutes — and upstream for root cause. It also
answers governance questions: where does this phone number flow?"

**Follow-up.** "Table-level or column-level?" — "Table-level for impact; column-level when tracing personal data or a
single wrong metric, because one table can feed many columns that do not depend on the broken one."`,
    mcqs: [
      mcq('An interviewer asks what you do with quarantined rows. Which answer is strongest?', [
        ['Keep them in a table with reasons, fix the cause, replay them through validation', true],
        ['Delete them after a week, since they were already excluded from the published data', false],
        ['Correct them by hand inside the quarantine table and then copy them into the mart', false],
        ['Leave them in the logs, where engineers can search for them if somebody complains', false],
      ], 'Quarantine is a holding area with an owner: the cause is fixed upstream and the rows re-enter through the same checks, keeping the load idempotent and auditable. Deleting loses money and evidence, hand edits bypass validation, and logs are not reviewed.'),
      mcq('Asked how to investigate a 40% overnight drop when nothing failed, which first step would an interviewer rate highest?', [
        ['Rule out data causes cheapest first: freshness by load time, then volume', true],
        ['Ask the business team whether sales fell, since nothing failed overnight', false],
        ['Rebuild every model from scratch with a full refresh and then compare it', false],
        ['Read every SQL model changed in the last month for a filtering mistake', false],
      ], 'Quick data checks tell you within minutes whether the number is a pipeline problem. Asking the business first wastes their time if a load is missing, a full refresh is slow and may reproduce the problem, and reading a month of changes is the slowest path.'),
      mcq('A candidate says HMAC-pseudonymised user keys make a table anonymous. What is the correct follow-up point?', [
        ['Whoever holds the key can re-identify it, so it is still personal data', true],
        ['HMAC is reversible by anyone, so the table has no protection at all', false],
        ['HMAC keys expire after a year, so the table becomes anonymous later', false],
        ['HMAC only works on numbers, so names in the table are still exposed', false],
      ], 'Pseudonymous data can be linked back with the key, so it stays personal data needing access control. HMAC cannot be reversed without the key, keys do not expire by themselves, and HMAC works on any bytes.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_QUALITY_GOVERNANCE_CHECKPOINT',
    notes: `Ten questions across the topic: quality dimensions, automated checks and quarantine, observability and lineage,
and governance of personal data. Answer without notes; the result shows which lesson to revisit.`,
    checkpoint: [
      mcq('Every table check passes, but the payments mart is short of the bank settlement by exactly one lower-case "success" row. Which kind of check proved it?', [
        ['A cross-system reconciliation of totals', true],
        ['A not-null check on the status column', false],
        ['A uniqueness check on the transaction id', false],
        ['A volume check against the same weekday', false],
      ], 'Only comparing our total with an independent source shows that money is missing. The status is not null, the id is unique, and one row barely moves a volume monitor; the validity problem became visible as a consistency gap.'),
      mcq('In a medallion pipeline, which check belongs in the gold marts rather than at ingestion?', [
        ['Merchant payouts equal successful payments minus fees', true],
        ['The source file has the agreed columns and their types', false],
        ['Each row\'s payer UPI ID matches the name@bank pattern', false],
        ['The file arrived and has a plausible number of rows', false],
      ], 'Business rules that combine facts exist only in the marts. Column contracts and arrival are ingestion checks, and the UPI ID format is a staging validity check on single values.'),
      mcq('pandera validation with lazy=True returns failure cases, one of them with no index. What does that failure describe?', [
        ['A problem with the table itself, such as an extra column', true],
        ['A row whose index was dropped during an earlier merge step', false],
        ['A failure in a check that pandera could not finish running', false],
        ['A warning that pandera reports but does not count as failing', false],
      ], 'Table-level failures such as column_in_schema or a column dtype mismatch have no row index, which is why they must fail the run instead of being split. They are real failures, not warnings, and not a sign of lost row labels or an unfinished check.'),
      mcq('A batch has 5.2% of rows with a new status spelling, against a 1% quarantine threshold. What should the loader do?', [
        ['Fail the run, since this is a source change to raise with its producer', true],
        ['Quarantine the 5.2% and publish the remaining rows as on any other day', false],
        ['Publish everything, since a spelling change does not affect any amount', false],
        ['Raise the threshold to 6% for this source, so tomorrow\'s run will pass', false],
      ], 'Above the threshold the failures are systemic, so the right move is to stop and get the producer to act. Quarantining hides the change, publishing drops these payments from status-filtered totals, and moving the threshold defeats it.'),
      mcq('Which volume monitor suits daily counts with a strong weekly pattern?', [
        ['Compare with the median of the same weekday over recent weeks', true],
        ['Compare with the mean ± 3 standard deviations of the last 28 days', false],
        ['Compare with yesterday\'s count and alert on any change over 10%', false],
        ['Compare with the all-time maximum and alert if today is below it', false],
      ], 'Same-weekday medians remove the weekly cycle and resist one unusual week. A 28-day band mixes weekdays and weekends and becomes too wide, day-on-day comparison alerts every Saturday and Monday, and the all-time maximum alerts almost every day.'),
      mcq('A stale table is found. What does a downstream walk of the lineage graph give you first?', [
        ['The affected datasets and consumers, and the owners to notify', true],
        ['The root cause of the staleness in the upstream partner system', false],
        ['The rows in the stale table that should now be quarantined', false],
        ['The SQL that needs rewriting so the table loads more quickly', false],
      ], 'Downstream lineage is impact analysis: what is now wrong and who must know. Root cause is an upstream question, quarantine is about invalid rows, and lineage holds no query rewrites.'),
      mcq('In OpenLineage, which information does each run event carry that lets a backend build lineage?', [
        ['The job, the run, and its input and output datasets', true],
        ['The rows read and written, copied into the event body', false],
        ['The orchestrator\'s full DAG definition as a source file', false],
        ['The warehouse credentials, so lineage can query tables', false],
      ], 'An event is metadata: job, run id, inputs and outputs, with optional facets such as schema. No rows, DAG files or credentials are sent; the backend joins events into a graph.'),
      mcq('Why is sha256 of a phone number not enough to protect it in an analytics table?', [
        ['The candidate numbers are few enough to hash them all and match', true],
        ['sha256 is a reversible encoding that any library can decode back', false],
        ['sha256 gives different outputs each run, so it can leak patterns', false],
        ['sha256 output contains the last four digits of the phone number', false],
      ], 'Enumeration works because the input space is small; one laptop core reversed a known-prefix number in under a second. sha256 is not an encoding, it is deterministic, and its output reveals no digits directly.'),
      mcq('Payouts must later recover a user\'s real account number from the protected value. Which technique allows that?', [
        ['Tokenisation with a vault that only payouts may query', true],
        ['HMAC with a key shared by all analytics pipelines', false],
        ['Masking that keeps the last four digits on display', false],
        ['Generalising the account number to its bank branch', false],
      ], 'A vault maps tokens back to originals for authorised services. HMAC is one-way, masking and generalisation discard the information, so none of them can give back the account number.'),
      mcq('Under India\'s DPDP Act, in outline, which pipeline capability supports a user\'s request to erase their data?', [
        ['Finding and deleting one person\'s data across every layer and copy', true],
        ['Encrypting all of the user\'s data at rest with a new rotated key', false],
        ['Masking the user\'s phone number in every view analysts can read', false],
        ['Moving the user\'s rows to a cheaper archive storage class in India', false],
      ], 'Erasure means the data is gone from raw, marts, old versions and exports, which needs classification and lineage to find it. Encryption, masking and archiving all keep the data; check the current rules for the exact obligations.'),
    ],
  },
];
