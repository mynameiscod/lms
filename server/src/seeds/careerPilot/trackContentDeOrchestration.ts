/**
 * Career-track content: Orchestration (DE_ORCHESTRATION), Data Engineer, batch DE3.
 *
 * Running pipelines on a schedule without a person watching: what an orchestrator adds over cron, Airflow DAGs with
 * the TaskFlow API, schedules and data intervals, retries, timeouts, catchup and backfills, sensors and data-aware
 * (dataset/asset) scheduling, alerts, and the same pipeline in Prefect and Dagster. It builds on DE1's "Idempotent,
 * Restartable Loads" (partition replace, upserts, run ids), "Pipeline Code You Can Trust" and DE2's dbt topic; those
 * are referred to by title, not re-taught. Here the question is what a scheduler does to those loads: retries, reruns
 * and backfills all run them again for an interval.
 *
 * One fictional company runs through the topic: RupeeRail, a Bengaluru UPI payments company whose nightly pipeline
 * pulls settlement files from three partner banks, loads the lake, runs dbt and refreshes the merchant payouts
 * dashboard. Verified on the lab machine (Windows, Python 3.13): Prefect 3.9 flows run for real (retries with a delay
 * list, mapping, cache hits, parameter validation, retry_condition_fn, a timeout, an on_failure hook, the
 * prefect.runtime scheduled time), a 40-line graphlib orchestrator, DuckDB 2.0 retry-after-write loads, and plain-Python
 * simulations of Airflow's data intervals, catchup counts, the UTC ds trap, backfill waves and sensor slot use; every
 * quoted output is real. NOT run: Airflow (it does not run on Windows) and Dagster; their code is written from the
 * documentation for Airflow 2.x and 3.x (version differences are marked in the notes) and checked only with
 * python -m py_compile.
 *
 * Skill: DATA_PIPELINES (the topic's only skill).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_DE_ORCHESTRATION_BUNDLES: PilotBundle[] = [
  /* ── ORCHESTRATION_WHY ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_ORCHESTRATION_ORCHESTRATION_WHY',
    notes: `RupeeRail, a UPI payments company in Bengaluru, settles money with three partner banks every night. Its first data
pipeline was four lines of crontab on one EC2 machine:

    30 1 * * *  python extract_settlements.py
    0  2 * * *  python load_lake.py
    30 2 * * *  cd dbt && dbt build
    0  3 * * *  python refresh_payouts_dashboard.py

It worked for six weeks. Then one month produced this incident list: a bank API was slow, extract finished at 02:10,
and load_lake at 02:00 loaded two banks out of three; dbt failed on a schema change and the dashboard refreshed
anyway with yesterday's numbers; the machine rebooted for patching and a whole night was simply skipped; and after a
bug fix somebody re-ran 18 to 24 October by hand, editing a date in each script. Merchants noticed every one of these
before the data team did.

## What cron cannot do

Cron knows one thing: start this command at this time. Everything else above is missing:

- **Dependencies.** load_lake should start when extract has succeeded, not at 02:00. Timing gaps are guesses.
- **A run is for a period.** The 02:00 run processes 26 October's settlements. Cron has no idea which day a run is
  for, so reruns and backfills mean editing scripts.
- **Retries and timeouts.** A bank API returning 503 at 01:30 usually works at 01:32. A hung call should be killed.
- **State and history.** Which task failed, for which day, on which attempt, with which log? Cron keeps no record.
- **Backfills.** "Run 1 to 31 October again, three days at a time" is one command for an orchestrator.
- **Visibility and alerts.** A failed run should page someone, and a skipped one should be visible.
- **Limits.** Do not hit the warehouse with forty queries at once; cap concurrent runs.

## An orchestrator in 40 lines

To see what the tools do, here is a toy one: graphlib's TopologicalSorter orders the tasks, each task gets two retries,
and state is recorded per (day, task). extract_payments fails once (transient); dbt_build fails until a model is fixed.

    run 1, 2026-10-27
      extract_orders     success (attempt 1)
      extract_payments   attempt 1 failed: extract_payments failed for 2026-10-27
      extract_payments   success (attempt 2)
      load_lake          success (attempt 1)
      dbt_build          attempt 1 failed ... attempt 3 failed
      refresh_dashboard  upstream_failed
    fix dbt model, clear and rerun the same interval
      extract_orders     skipped (already success)
      extract_payments   skipped (already success)
      load_lake          skipped (already success)
      dbt_build          success (attempt 1)
      refresh_dashboard  success (attempt 1)

Three things happened that cron cannot do: the order came from the dependency graph, a transient failure healed itself,
and after the fix only the failed task and what depends on it ran again, for the same day, while the dashboard
never refreshed with stale data. Airflow, Prefect and Dagster are this idea built properly: a metadata database
holding every run and task state, a scheduler deciding what is due, workers executing, and a UI.

## What an orchestrator is not

It is not the compute engine. A worker should start a Spark job, a dbt build or a warehouse query and wait; it should
not hold 40 GB of DataFrames itself. It is not a data-quality tool (it runs your checks; see the quality topic). And it
is not a streaming system: it starts batch work on schedules or events, from minutes apart to monthly.

## The three you will meet

    Tool      Unit of work           Strength                                 Weak spot
    Airflow   DAG of tasks           the industry default; huge operator      heavier to run; scheduling semantics
              (TaskFlow or            library (AWS, GCP, Azure, dbt, Spark);   (data intervals) trip beginners
              operators)             managed: MWAA, Cloud Composer, Astronomer
    Prefect   Python flows and       plain Python, runs on a laptop with      no built-in idea of a data interval;
              tasks                  no setup; retries, caching, params       smaller operator ecosystem
    Dagster   software-defined       thinks in tables (assets), partitions,   a different mental model to learn;
              assets                 lineage and checks built in              smaller community than Airflow

Airflow 3.0 (2025) was a major release: a new Task SDK (from airflow.sdk import dag, task), tasks talk to an API
server instead of the database, Datasets were renamed Assets, and some defaults changed. Many companies still run
2.x, so the next lessons mark which feature belongs to which version.

Cloud-native options exist too: on AWS, Step Functions and Glue workflows; on Azure, Data Factory pipelines (and an
Apache Airflow job in Microsoft Fabric). They are fine for a few pipelines inside one cloud; most data teams with
dozens of pipelines still pick one of the three above.

## Choosing, honestly

- The company already runs Airflow: use Airflow. A second orchestrator is a second on-call system.
- A small team, Python-heavy, greenfield, wants something running this week: Prefect.
- A platform centred on tables and dbt models, where "is this table fresh and correct?" is the main question: Dagster.
- Whatever you pick, keep the work in plain functions and CLIs (extract.py, dbt build) and keep the orchestrator a
  thin layer that calls them. Then moving tools is a week of wrapper code, not a rewrite.`,
    workedExample: `**Task.** Turn RupeeRail's crontab into an orchestrated pipeline design before writing any code.

**Step 1: tasks and edges.** Three extracts (one per bank) can run in parallel; load waits for all three; dbt build
waits for load; refresh waits for dbt.

    extract_kaveri  ─┐
    extract_ganga   ─┼─> load_lake ─> dbt_build ─> refresh_payouts
    extract_narmada ─┘

**Step 2: what is one run for?** One IST business day of settlements. The run that starts at 02:00 on 27 October
covers 26 October 00:00 to 27 October 00:00 IST. Every task receives that interval; none reads the clock.

**Step 3: failure policy, per task.**

    extract_*      3 retries, 2-minute delay doubling: bank APIs return 503s and recover
    load_lake      1 retry; safe because it replaces the day's partition in one transaction
    dbt_build      0 retries: a failing test is a data problem, not a blip
    refresh        runs only if dbt_build succeeded (the default rule: all upstream succeeded)

**Step 4: limits and timeouts.** max_active_runs 1 for the nightly schedule (3 during a backfill); each extract is
killed after 30 minutes, so a hung connection cannot hold the night hostage.

**Step 5: alerts.** Page the on-call only when a task has failed its final attempt; post to the team channel when the
run succeeds after 07:30 IST, because the payouts team reads the dashboard at 08:00.

**Step 6: backfill.** "Rerun 18 to 24 October" becomes one backfill command over seven intervals. That is safe only
because load_lake replaces a whole day (DE1's "Idempotent, Restartable Loads").

**Result.** Every incident in the list has an answer: dependencies replace timing guesses, the interval replaces
hand-edited dates, retries absorb blips, upstream_failed stops a stale refresh, and the history and alerts mean the
data team hears first.`,
    mcqs: [
      mcq("RupeeRail's crontab starts load_lake at 02:00 and the extract at 01:30. One night the extract takes 40 minutes. What does load_lake do?", [
        ["It starts on time and loads whatever part of the extract has already landed", true],
        ["It waits for the extract process to exit, because cron tracks running jobs", false],
        ["It is skipped for the night, because cron refuses to start overlapping jobs", false],
        ["It fails at once, because cron passes the extract's exit code to the next line", false],
      ], "Cron only starts commands at times; it knows nothing about other lines, so load_lake runs at 02:00 against a half-written extract. Cron neither waits for, skips around, nor passes exit codes between jobs, which is exactly the gap an orchestrator's dependencies fill."),
      mcq("In the toy orchestrator, dbt_build failed all three attempts and was then fixed. On the rerun of 27 October, why did the three extract tasks not run again?", [
        ["Their state for that day was already success, so only the failed path was resumed", true],
        ["Extract tasks are never rerun by an orchestrator once their output file exists", false],
        ["The retries of dbt_build had already re-executed the extracts in the first run", false],
        ["graphlib removes finished nodes from the graph after the first topological sort", false],
      ], "The orchestrator records state per (interval, task) and resumes from the failure, so successful upstream work is skipped. It does not look at files, retries repeat only the failing task, and the graph is rebuilt on every run; the skip comes from recorded state."),
      mcq("A team wants its Airflow workers to read 40 GB of settlements into pandas, join them and write Parquet. What is the better design?", [
        ["Have the task start a Spark or warehouse job and wait, so the heavy work runs on compute built for it", true],
        ["Give the Airflow workers more memory, because Airflow is designed to be the processing engine as well", false],
        ["Split the join into many small XComs so the scheduler can spread the data across all of its workers", false],
        ["Move the join into a sensor in reschedule mode, so it releases the worker slot between the pokes", false],
      ], "An orchestrator coordinates work; the heavy lifting belongs to Spark, dbt or the warehouse, with the task triggering it and waiting. Bigger workers make every worker expensive, XComs are for small values in the metadata database, and sensors wait for conditions rather than process data."),
    ],
    checkpoint: [
      mcq("Which of these can an orchestrator give a pipeline that a crontab entry cannot?", [
        ["Knowing which data interval a run is for, so a rerun of 24 October is one command", true],
        ["Starting a Python script at 02:00 every night on a Linux server in the data centre", false],
        ["Writing each script's stdout and stderr to a log file named after the script", false],
        ["Running a command once a month on the first day, at a fixed time in the morning", false],
      ], "Runs tied to intervals, with recorded state, are what make reruns and backfills simple. Starting a script at a time, redirecting its output and monthly schedules are all things cron already does."),
      mcq("A start-up's data platform already runs 120 Airflow DAGs. A new team proposes Prefect for its four new pipelines because it is easier to start with. What is the strongest argument against?", [
        ["A second orchestrator means a second system to deploy, monitor, secure and be on call for", true],
        ["Prefect cannot run Python code, so the team would have to rewrite its pipelines in SQL", false],
        ["Prefect flows cannot call dbt or Spark, so the four pipelines would lose their transforms", false],
        ["Airflow refuses to schedule DAGs when another orchestrator is installed on the network", false],
      ], "Operating cost, not capability, decides this: two orchestrators double the alerting, upgrades and on-call knowledge. Prefect runs plain Python and can call dbt or Spark like anything else, and Airflow has no notion of other tools."),
      mcq("Which design keeps a pipeline easy to move from Airflow to Dagster later?", [
        ["Keep the logic in plain functions and CLIs and make each task a thin call to them", true],
        ["Write all of the logic inside operators so the orchestrator owns every single step", false],
        ["Pass the data between steps as XComs so the orchestrator holds the intermediate results", false],
      ], "If tasks only call extract(), load() or dbt build, a new orchestrator needs new wrappers, not new logic. Logic inside operators and data inside XComs both tie the pipeline to one tool's API and storage."),
    ],
  },

  /* ── AIRFLOW_DAGS ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_ORCHESTRATION_AIRFLOW_DAGS',
    notes: `Airflow does not run on Windows. Use WSL2 or the official Docker Compose file from the Airflow docs; for a quick
look, airflow standalone starts every component with an admin login. The DAGs below were written from the Airflow
documentation and checked with python -m py_compile; they were not executed on the lab machine.

## Versions: check which one you have

    Thing                  Airflow 2.x                              Airflow 3.x
    decorators             from airflow.decorators import dag, task from airflow.sdk import dag, task
    BashOperator           airflow.operators.bash                   airflow.providers.standard.operators.bash
    schedule argument      schedule= (2.4+); schedule_interval old  schedule= only
    default schedule       one day                                  None (runs only when triggered)
    catchup default        True                                     False
    data-aware triggers    Dataset (2.4+)                           Asset
    cron string meaning    an interval (see below)                  a trigger time (see below)

## A DAG file

RupeeRail's nightly settlements DAG, TaskFlow style:

    import pendulum
    from airflow.sdk import dag, task
    from airflow.timetables.interval import CronDataIntervalTimetable
    from airflow.providers.standard.operators.bash import BashOperator

    BANKS = ["kaveri_bank", "ganga_bank", "narmada_bank"]

    @dag(
        dag_id="rupeerail_settlements",
        schedule=CronDataIntervalTimetable("0 2 * * *", timezone="Asia/Kolkata"),
        start_date=pendulum.datetime(2026, 10, 1, tz="Asia/Kolkata"),
        catchup=False,
        max_active_runs=1,
        default_args={"owner": "data-platform", "retries": 2},
        tags=["settlements", "tier-1"],
    )
    def rupeerail_settlements():

        @task
        def extract(bank: str, data_interval_start=None) -> str:
            day = data_interval_start.in_timezone("Asia/Kolkata").to_date_string()
            return f"s3://rr-raw/settlements/bank={bank}/day={day}/part.json"

        @task
        def load(paths: list[str], data_interval_start=None) -> int:
            ...   # replace the day's partition in one transaction
            return len(paths)

        dbt_build = BashOperator(
            task_id="dbt_build",
            bash_command='cd /opt/dbt/rupeerail && dbt build --select +fct_settlements --vars "{day: $DAY}"',
            env={"DAY": "{{ data_interval_start.in_timezone('Asia/Kolkata') | ds }}"},
            append_env=True,
        )

        @task
        def publish(n_files: int) -> None:
            print(f"{n_files} bank files loaded; dashboard refreshed")

        paths = extract.expand(bank=BANKS)
        n = load(paths)
        n >> dbt_build >> publish(n)

    rupeerail_settlements()

The pieces:

- **The DAG** is the graph plus its scheduling settings. The last line calls the decorated function; forget it and the
  DAG never appears. start_date is fixed and timezone-aware; never datetime.now().
- **Tasks.** An operator is a template (BashOperator, SQLExecuteQueryOperator, the Amazon provider's GlueJobOperator or
  AthenaOperator); a task is one use of it in a DAG; a task instance is that task for one run. A @task function is a
  task whose operator runs your Python.
- **Dependencies.** Passing one TaskFlow result into another (load(paths)) creates the edge. For operators use >> and
  <<; a list fans in or out ([a, b] >> c); chain(a, b, c) for long lines.
- **Dynamic task mapping.** extract.expand(bank=BANKS) creates one task instance per bank at run time (Airflow 2.3+),
  each retried and logged separately.
- **Context.** Naming a parameter data_interval_start (or logical_date, ti and so on) makes Airflow pass that value in.

The file is parsed again every 30 seconds or so (the processor's min_file_process_interval). Top-level code runs on
every parse, so never call an API or a database at the top of a DAG file; do it inside tasks.

## Schedules and data intervals

This is the part beginners get wrong. In Airflow 2, a cron schedule means **intervals**: the run for an interval is
created after the interval ends, and its logical date is the interval's start. A plain-Python simulation of
"0 2 * * *" in Asia/Kolkata, start_date 20 October, at 10:00 on 27 October:

    interval 20 Oct 02:00 -> 21 Oct 02:00 IST | runs at 21 Oct 02:00 | ds (UTC) 2026-10-19 | IST day 2026-10-20
    ...
    interval 26 Oct 02:00 -> 27 Oct 02:00 IST | runs at 27 Oct 02:00 | ds (UTC) 2026-10-25 | IST day 2026-10-26
    catchup=True  creates 7 runs
    catchup=False creates 1 run: the latest, 26 Oct -> 27 Oct

The run that fires on 27 October processes 26 October: "today's run loads yesterday" is the design, not a bug.

Airflow 3 changed the default for a cron string to CronTriggerTimetable: the run fires at the tick and its interval is
empty (start = end = the tick):

    fires 27 Oct 02:00 IST | logical_date = interval start = end = 2026-10-27 02:00 | ds (UTC) 2026-10-26

Two traps are visible. Airflow renders ds from the logical date in UTC, and 02:00 IST is 20:30 UTC the day before, so
ds is a day behind the IST day in both versions. And code that assumed Airflow 2 intervals silently shifts by a day on
Airflow 3. The defence: pass the timetable explicitly (CronDataIntervalTimetable, available in 2.x and 3.x) and derive
the business day from data_interval_start converted to Asia/Kolkata, as the DAG above does. Check the rendered values
with airflow dags test before trusting them.

## XComs, sparingly

A @task's return value is an XCom, stored in the metadata database. Use XComs for small things: S3 paths, row counts,
a batch id. Never return a DataFrame: write it to S3 or a table and pass the path. The metadata database is not a data
store, and a large XCom slows the whole Airflow installation.

## Test before you deploy

    from airflow.models import DagBag

    def test_dags_import_cleanly():
        bag = DagBag(dag_folder="dags", include_examples=False)
        assert bag.import_errors == {}
        assert "rupeerail_settlements" in bag.dags

Run it in CI. Locally, dag.test() (2.5+) or airflow dags test rupeerail_settlements 2026-10-26 runs one DAG run in a
single process, rendered templates and all, without the scheduler.`,
    workedExample: `**Task.** Before deploying rupeerail_settlements, predict exactly what the run that fires at 02:00 IST on
27 October sees, and confirm it with airflow dags test.

**Step 1: the interval.** With CronDataIntervalTimetable("0 2 * * *", timezone="Asia/Kolkata"), the run firing at
27 Oct 02:00 IST covers:

    data_interval_start = 2026-10-26 02:00 IST = 2026-10-25T20:30:00+00:00
    data_interval_end   = 2026-10-27 02:00 IST = 2026-10-26T20:30:00+00:00
    logical_date        = data_interval_start

**Step 2: the business day.** RupeeRail's settlement day runs midnight to midnight IST, and the 02:00 run should load
26 October. data_interval_start.in_timezone("Asia/Kolkata").to_date_string() gives "2026-10-26". The tempting
{{ ds }} would give 2026-10-25, the UTC date of the logical date; that is the bug this DAG avoids.

**Step 3: the mapped tasks.** extract.expand(bank=BANKS) becomes three task instances, extract[0] to extract[2], each
with its own retries and log. load receives a list of three paths.

**Step 4: the dbt command.** The env value renders to DAY=2026-10-26 and dbt build receives --vars "{day: 2026-10-26}".

**Step 5: confirm.** In WSL2 or the Docker Compose stack:

    airflow dags test rupeerail_settlements 2026-10-26T02:00:00+05:30     # the logical date = interval start

Read the task logs for the rendered DAY and the three paths. If they say 2026-10-25, the date logic is wrong, and it is
cheaper to learn that here than from a merchant at 08:00.

**Step 6: why catchup=False.** With start_date 1 October and catchup=True, the first deploy on 27 October would create
26 runs at once. Old days are reloaded on purpose with a backfill (next lesson), not by accident at deploy time.`,
    mcqs: [
      mcq("A new DAG file defines @dag def payouts_daily(): ... with three tasks, but the DAG never shows up in the UI and there are no import errors. What is the likeliest cause?", [
        ["The file never calls payouts_daily(), so no DAG object is created at parse time", true],
        ["TaskFlow DAGs appear in the UI only after their first manual trigger from the CLI", false],
        ["The DAG has no tags, and the UI hides untagged DAGs from the default list view", false],
        ["The three tasks have no retries, so the scheduler refuses to register the DAG", false],
      ], "The decorator only defines a factory; calling it at module level creates the DAG that the parser collects. Triggering, tags and retries have nothing to do with whether a DAG is registered."),
      mcq("On Airflow 2 with schedule '0 2 * * *' in Asia/Kolkata (interval semantics), which IST day of data should the run that starts at 02:00 on 27 October process?", [
        ["26 October, because the run covers the interval that has just ended", true],
        ["27 October, because a run always processes the day on which it starts", false],
        ["25 October, because Airflow keeps one full interval of safety margin", false],
        ["Both days, because the interval spans 26 and 27 October from 02:00", false],
      ], "Under interval semantics a run is created once its interval ends and covers that interval, here 26 Oct 02:00 to 27 Oct 02:00, which the business maps to 26 October. Processing the start day is the trigger model, there is no extra safety interval, and the DAG converts the interval to one business day."),
      mcq("A task returns a 2-million-row pandas DataFrame so the next task can use it. What is the right change?", [
        ["Write the data to S3 or a table and return the path, which is small enough for an XCom", true],
        ["Return the DataFrame as JSON text instead, because XComs are stored as compressed blobs", false],
        ["Merge both tasks into a sensor, because sensors share memory between consecutive pokes", false],
        ["Increase the scheduler's heartbeat so the XCom has more time to be written to the database", false],
      ], "XComs live in the metadata database and are meant for small values such as paths and counts. JSON text is just as large, sensors do not share memory between pokes, and heartbeats have nothing to do with XCom size."),
    ],
    checkpoint: [
      mcq("Which start_date setting causes trouble in an Airflow DAG?", [
        ["start_date=datetime.now(), because it changes on every parse of the file", true],
        ["start_date=pendulum.datetime(2026, 10, 1, tz='Asia/Kolkata') with catchup=False", false],
        ["start_date set a month in the past together with a backfill run started on purpose", false],
      ], "A start date that moves every time the file is parsed means the first interval never completes, so runs are missing or erratic. A fixed, timezone-aware start date is the recommended form, and a past date with a deliberate backfill is normal."),
      mcq("RupeeRail moves a DAG from Airflow 2 to Airflow 3 without changing schedule='0 2 * * *'. What happens to its daily load if the code uses data_interval_start as the day?", [
        ["It shifts by a day: Airflow 3 treats a cron string as a trigger time with an empty interval", true],
        ["Nothing changes, because the meaning of a cron string is identical in every Airflow version", false],
        ["The DAG stops running, because Airflow 3 rejects cron strings and requires a timetable object", false],
        ["It loads two days per run, because Airflow 3 doubles the interval for cron-based schedules", false],
      ], "Airflow 3's default for cron strings is CronTriggerTimetable, so data_interval_start is the run time, not the previous tick. Cron strings are still accepted, nothing doubles, and the fix is to pass CronDataIntervalTimetable explicitly or change the date logic."),
      mcq("Which dependency line makes load_lake wait for all three extract tasks?", [
        ["[extract_kaveri, extract_ganga, extract_narmada] >> load_lake", true],
        ["load_lake >> [extract_kaveri, extract_ganga, extract_narmada]", false],
        ["extract_kaveri >> extract_ganga >> extract_narmada, load_lake", false],
        ["chain(load_lake, extract_kaveri, extract_ganga, extract_narmada)", false],
      ], "A list on the left of >> fans in, so load_lake waits for every extract. The reversed form makes the extracts wait for the load, the third line runs the extracts one after another and leaves load_lake unconnected, and chain starting with load_lake also puts it first."),
    ],
  },

  /* ── RETRIES_BACKFILLS ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_ORCHESTRATION_RETRIES_BACKFILLS',
    notes: `An orchestrator will run every task of yours more than once: retries after a failure, a "clear" after a fix, a
backfill over last month. DE1's "Idempotent, Restartable Loads" taught the load patterns; this lesson is about the
scheduler side: which failures to retry, how long to wait, and how to make a task correct for its interval however
many times it runs.

## Retry what is transient, fail fast on the rest

A bank API returning 503, a throttled warehouse, a dropped connection: retry. A 401 for an expired token, a missing
column, a file with the wrong schema: retrying wastes time and delays the alert. Airflow's knobs, per DAG in
default_args and per task where one step is flakier:

    default_args={
        "retries": 3,
        "retry_delay": timedelta(minutes=2),
        "retry_exponential_backoff": True,      # 2, 4, 8 ... minutes
        "max_retry_delay": timedelta(minutes=20),
        "execution_timeout": timedelta(minutes=45),
    }

To stop retrying a permanent error in Airflow, raise AirflowFailException (from airflow.exceptions): the task fails
at once whatever retries says. Prefect does the same with retry_condition_fn. Run for real (Prefect 3.9), a task with
retries=3 that raises PermissionError("401 Unauthorized") and a condition that retries only a Transient exception:

    attempts made: 1 | state: FAILED

Without the condition, the same task with retries=2 burned three attempts and two delays before failing:

    Task run failed with exception: PermissionError('401 Unauthorized: token expired') - Retry 1/2 will start 1 second(s) from now
    Task run failed with exception: PermissionError('401 Unauthorized: token expired') - Retry 2/2 will start 1 second(s) from now
    ... - Retries are exhausted

## Timeouts

Without a timeout, a hung socket holds a worker slot until someone notices. Airflow has execution_timeout per task and
dagrun_timeout per run. A Prefect task with timeout_seconds=2 that awaited asyncio.sleep(5):

    Finished in state TimedOut('Task run exceeded timeout of 2.0 second(s)', type=FAILED)

One honest finding: on the Windows lab machine, a *synchronous* Prefect task calling time.sleep(5) with the same
timeout_seconds=2 ran to completion. Timeouts are implemented differently per platform and per sync/async code, so
test that yours actually fires (make the task sleep past it once) before relying on it. Set the network client's own
timeout too (requests timeout=, boto3 read_timeout); it is the first line of defence.

## A retry runs after a partial success

The dangerous failure is the one that happens after the write. Two loads in DuckDB, each failing on attempt 1 after
its data was written (as when a worker loses its heartbeat after the commit), with retries=1:

    task_append attempt 1: metadata DB heartbeat lost after the insert -> retry
    txns_append (1000, 599000)
    task_replace attempt 1: metadata DB heartbeat lost after the commit -> retry
    txns_replace (500, 299500)
    source (500, 299500)
    after a manual clear-and-rerun: (500, 299500)

The append doubled the day's transactions and nothing errored. The replace (delete the interval and insert it, one
transaction) gave the source's numbers after the retry and after a third, manual rerun. A task is safe only if it is
idempotent **for its interval**: its output for 26 October depends only on 26 October's input, and writing it again
replaces rather than adds. Side effects count too: a task that emails merchants must record that it sent the email for
that interval and check before sending.

## Never read the clock

A task that uses date.today() (or now() in SQL) loads the wrong day whenever it is not run on schedule. Simulated:
backfilling 18 to 24 October on 27 October with such a task:

    partitions written: ['2026-10-27'] x 7 runs

Seven runs, one partition, overwritten seven times; the week you meant to fix is untouched. Every date must come from
the run: in Python tasks the data_interval_start/data_interval_end arguments, in templated fields Jinja:

    DELETE FROM analytics.fct_txns
     WHERE txn_ts >= '{{ data_interval_start }}' AND txn_ts < '{{ data_interval_end }}';

Use the half-open interval (>= start, < end) so a transaction at exactly 00:00 belongs to one day, not two. Templates
render only in an operator's templated fields (sql, bash_command, env and so on), not in arbitrary Python strings.

## Catchup and backfill

**Catchup** creates runs for every interval between start_date and now that has none; the default is True in Airflow 2
(catchup_by_default) and False in Airflow 3. A DAG with start_date 1 January deployed on 27 October with catchup=True
would queue some 300 runs at once. Set catchup=False and backfill on purpose.

A **backfill** runs chosen past intervals:

    # Airflow 2: runs from the CLI process; keep the terminal alive (or use tmux)
    airflow dags backfill -s 2026-10-01 -e 2026-10-31 rupeerail_settlements

    # Airflow 3: the scheduler runs it, it shows in the UI
    airflow backfill create --dag-id rupeerail_settlements \\
        --from-date 2026-10-01 --to-date 2026-10-31 --max-active-runs 3 --reprocess-behavior completed

reprocess-behavior says whether intervals that already have runs are skipped, rerun only if failed, or rerun even if
completed; check --help on your version. To rerun a few tasks rather than whole runs, clear them (airflow tasks clear
with a date range and a task regex, or the UI): cleared tasks run again with their original interval.

How long will it take? Thirty-one runs of 20 minutes each:

    max_active_runs=1: 31 waves x 20 min = 10.3 h
    max_active_runs=3: 11 waves x 20 min = 3.7 h
    max_active_runs=8: 4 waves x 20 min = 1.3 h

More parallel runs are faster only if the warehouse and source APIs can take the load; a partner bank's API rate limit
is usually the real ceiling. Put calls to one API in an Airflow **pool** with a few slots, and every DAG shares them.

If each day depends on the previous one (a running balance, a Type 2 dimension), set depends_on_past=True on that
task and run the backfill with max_active_runs=1, oldest first.`,
    workedExample: `**Scenario.** A bug in RupeeRail's fee calculation went live on 1 October and was fixed on 28 October.
fct_settlements must be rebuilt for 1 to 27 October while the nightly run keeps working.

**Step 1: confirm the task is interval-idempotent.** load_settlements deletes the rows for [data_interval_start,
data_interval_end) and inserts that interval in one transaction. No date.today(), no now(). If this were not true,
the fix would start here, not with the backfill.

**Step 2: confirm raw data exists.** The raw zone keeps every bank file by day, so the backfill re-reads raw rather
than calling the banks' APIs for 27 days of history (which the rate limit would not allow anyway).

**Step 3: choose concurrency.** Each day takes about 20 minutes, mostly in dbt. The warehouse can take three at
once; max_active_runs=3 gives 9 waves (27 runs) of 20 minutes, about 3 hours.

**Step 4: start it (Airflow 3).**

    airflow backfill create --dag-id rupeerail_settlements \\
        --from-date 2026-10-01 --to-date 2026-10-27 \\
        --max-active-runs 3 --reprocess-behavior completed

On Airflow 2 the equivalent is airflow dags backfill with -s and -e, run in tmux because it lives in the CLI process.

**Step 5: keep it out of the nightly run's way.** The nightly run writes only the newest day and the backfill stops at
27 October, so they never write the same partition. The pool on the bank APIs is irrelevant here because the backfill
reads raw files.

**Step 6: prove it.** Per day, before and after:

    SELECT settle_day, count(*), sum(amount_paise), sum(fee_paise)
    FROM analytics.fct_settlements WHERE settle_day BETWEEN '2026-10-01' AND '2026-10-27'
    GROUP BY 1 ORDER BY 1

Counts and amounts must not change (the bug was in fees); fees should. Then clear one day and rerun it: the numbers
must be identical. That second run is the test that the task really is idempotent.`,
    mcqs: [
      mcq("An extract task fails with HTTP 401 because the partner's API token expired. It has retries=5 with exponential backoff. What should happen?", [
        ["Fail at once, for example by raising AirflowFailException, and alert someone to rotate the token", true],
        ["Let all five retries run, because a 401 usually clears itself after a few minutes of exponential backoff", false],
        ["Raise retries to ten, because a longer backoff gives the partner time to refresh the token", false],
        ["Mark the task skipped, so the downstream load runs on the data from the previous successful day", false],
      ], "An expired token is permanent until a person acts, so retrying only delays the alert. Retrying more or longer changes nothing, and skipping lets downstream tasks publish stale numbers."),
      mcq("A load task inserts the day's rows, commits, and the worker then dies before Airflow records success. With retries=1, what makes the retry harmless?", [
        ["The task replaces the rows of its interval in one transaction instead of appending to the table", true],
        ["Airflow rolls back the committed insert automatically before it starts the retry of the failed task instance", false],
        ["The retry delay gives the database enough time to remove any duplicate rows on its own", false],
        ["Setting retry_exponential_backoff so that the retry runs later than the original attempt", false],
      ], "Airflow cannot undo what a task committed; only an interval-replace (or keyed upsert) makes the second write land on the same rows. The DuckDB run showed the append doubling while the replace kept the source totals. Delays and backoff change when the retry runs, not what it writes."),
      mcq("A backfill of 30 days with max_active_runs=10 starts failing with 429 Too Many Requests from a bank API. What is the targeted fix?", [
        ["Put the API tasks in a pool with a few slots, so all runs share a fixed number of calls at once", true],
        ["Set catchup=True on the DAG so that the scheduler spreads the 30 runs out over the next month", false],
        ["Remove the retries from the extract task so that failed calls do not add to the request count", false],
        ["Change the schedule to hourly so that each run asks the API for one twenty-fourth of the data", false],
      ], "A pool caps concurrent task instances that use one resource across every run and DAG, matching the API's limit. Catchup does not pace runs, removing retries turns 429s into failures, and an hourly schedule changes the DAG rather than the backfill."),
    ],
    checkpoint: [
      mcq("Which task is safe to run three times for 26 October?", [
        ["One that deletes rows in [data_interval_start, data_interval_end) and inserts them in a transaction", true],
        ["One that inserts the rows for date.today() minus one day and logs how many rows it inserted", false],
        ["One that appends the rows for its interval and then runs a SELECT DISTINCT check across the whole table", false],
        ["One that inserts the rows for its interval only if the table had rows for the previous interval", false],
      ], "Replacing exactly its interval atomically gives the same table each time. date.today() depends on when it runs, an append followed by a check still duplicates, and checking the previous day does not stop a second insert for this one."),
      mcq("Why should a daily DAG's SQL filter use ts >= start AND ts < end rather than BETWEEN start AND end?", [
        ["A row at exactly midnight would match two adjacent intervals with BETWEEN and be loaded twice", true],
        ["BETWEEN is not allowed inside Airflow templates, so the rendered SQL would fail to parse", false],
        ["The half-open form makes the database use a partition index that BETWEEN cannot use", false],
      ], "BETWEEN includes both ends, so a 00:00:00 row belongs to the day ending and the day starting. Jinja renders BETWEEN fine, and both forms can use the same index or partition pruning; the issue is correctness."),
      mcq("A DAG with start_date 1 January 2026 and catchup=True is deployed for the first time on 27 October. What happens on Airflow 2?", [
        ["The scheduler creates runs for every past interval since 1 January and starts working through them", true],
        ["Only the most recent interval runs, and earlier intervals wait until a person starts a backfill", false],
        ["The DAG is paused automatically until someone confirms the number of past intervals in the UI", false],
        ["Nothing runs until the next scheduled time, because catchup applies only to intervals after deploy", false],
      ], "Catchup fills every missing interval between start_date and now, here about 300 runs. Running only the latest is catchup=False, Airflow does not pause and ask, and catchup is precisely about past intervals."),
    ],
  },

  /* ── SENSORS_EVENTS ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_ORCHESTRATION_SENSORS_EVENTS',
    notes: `RupeeRail's clearing partner drops a settlement file in S3 some time between 04:00 and 07:30 IST. Scheduling the
load at 08:00 wastes up to four hours of freshness; scheduling it at 05:00 fails on the late days. The answer is to
wait for the data, not the clock, and to say loudly when it does not come.

## Sensors

A sensor is a task that waits until a condition is true: a key exists in S3 (S3KeySensor in the Amazon provider), a
partition exists, an API says an export is ready. Its settings:

- poke_interval: seconds between checks.
- timeout: total seconds to wait before the sensor fails (or is skipped, with soft_fail=True).
- mode: "poke" holds a worker slot for the whole wait; "reschedule" frees the slot between checks.
- deferrable=True (on sensors that support it): the wait moves to the **triggerer**, a separate process running
  thousands of async waits cheaply; no worker slot is held at all.

Why it matters, in a plain-Python model of a scheduler with 8 slots, 8 sensors waiting for a file, and the task that
produces the file needing a free slot:

    poke       8 slots, 8 sensors | producer started: None | file ready: None | slot-minutes held by sensors: 1920.0
    reschedule 8 slots, 8 sensors | producer started: 0 | file ready: 10 | slot-minutes held by sensors: 1.2
    poke       10 slots, 8 sensors | producer started: 0 | file ready: 10 | slot-minutes held by sensors: 88.0

In poke mode the sensors took every slot, so the task that would make them succeed could never start: a deadlock that
lasts until the sensors time out. This happens in real life when catchup or a backfill starts many runs whose first
task is a sensor. Use deferrable sensors where available, reschedule mode otherwise, a pool to cap sensors, and always
a timeout.

    wait = S3KeySensor(
        task_id="wait_for_clearing_file",
        bucket_name="rr-partner-drop",
        bucket_key="clearing/settlement_{{ data_interval_end.in_timezone('Asia/Kolkata') | ds_nodash }}.csv",
        deferrable=True,
        poke_interval=300,
        timeout=6 * 60 * 60,
    )

data_interval_end is the run's trigger time under both Airflow 2 interval timetables and Airflow 3 trigger
timetables, which makes it the safer anchor for "today's file" here. For a custom condition, @task.sensor (2.5+)
wraps a function that returns PokeReturnValue(is_done=..., xcom_value=...).

## Data-aware scheduling: Datasets and Assets

Sensors wait inside a DAG. Often the better design is to start a DAG *because* data changed. Airflow 2.4 added
Datasets; Airflow 3 renamed them Assets (from airflow.sdk import Asset):

    settlements = Asset("s3://rr-lake/silver/settlements")
    payouts = Asset("s3://rr-lake/gold/merchant_payouts")

    @task(outlets=[settlements])          # in the ingest DAG
    def load_settlements(): ...

    @dag(schedule=[settlements], ...)     # runs after each update of settlements
    def merchant_payouts(): ...

    @dag(schedule=(settlements | payouts), ...)   # either one updated (2.9+)
    def refresh_recon_dashboard(): ...

An asset event is recorded only when the producing task **succeeds**, so a failed load never triggers the payouts DAG.
Airflow knows about updates made by its own tasks (and events posted to its REST API); it does not watch S3 by itself.
Version notes: & and | conditions arrived in 2.9, as did schedules combining a time and datasets; Airflow 3 adds an
@asset decorator and watchers that start a DAG from an external message queue (check the docs for your release).
Assets also give lineage: the UI shows which DAG produces and which consumes each one.

Older code uses ExternalTaskSensor to wait for a task in another DAG; it needs both DAGs' intervals to line up and
breaks quietly when one schedule changes. Prefer assets for cross-DAG dependencies.

## Alerts

- on_failure_callback (per task in default_args, or per DAG) runs a function with the context: DAG, task, interval,
  exception, log URL. Alert on the **final** failure; on_retry_callback is for a quieter channel, if anything.
- Notifiers (2.6+), such as the Slack provider's SlackNotifier, are ready-made callbacks.
- A useful alert says what failed, for which interval, the first error line, the log link, the owner and the runbook.

## SLAs and freshness

Airflow 2 had task-level sla= and sla_miss_callback; they were confusing and Airflow 3.0 removed them. Later 3.x
releases add Deadline Alerts for "this run must finish by" checks; read the docs for your version. Either way, keep
one check outside the scheduler: a small monitor that asks "is max(loaded_at) of fct_settlements newer than 08:00
today?" If the scheduler itself is down, its own callbacks never fire; an independent freshness check still does (the
quality topic's "Data Observability and Lineage" builds these).`,
    workedExample: `**Scenario.** RupeeRail's payouts team reads the merchant payouts dashboard at 08:00 IST. The clearing file lands
between 04:00 and 07:30. Design the DAGs so the dashboard is as fresh as possible and nobody is surprised at 08:00.

**Step 1: split by data, not by time.** Three DAGs:

    settlement_ingest      04:00 daily: deferrable S3 sensor, then load_settlements (outlet: settlements)
    merchant_payouts       schedule=[settlements]: compute payouts (outlet: payouts)
    refresh_recon_dashboard schedule=(settlements | payouts)

The payouts DAG starts minutes after the file lands, whether that is 04:10 or 07:25.

**Step 2: the sensor.** deferrable=True so a slow morning holds no worker slot; poke_interval 300 seconds; timeout
six hours, so at 10:00 it fails instead of waiting forever. The key is built from data_interval_end in IST.

**Step 3: failure alerts.** default_args gets on_failure_callback that posts to #data-oncall with the DAG, task,
interval, first error line and log link. Retries stay on extracts only, so the alert fires after the final attempt.

**Step 4: the 07:30 warning.** A separate monitoring check at 07:30 queries max(loaded_at) on fct_settlements. If
today's file has not loaded, it messages the payouts team: "Settlement file not received yet; dashboard shows 26 Oct."
A late partner is not an engineering failure, but the business must hear about it before 08:00.

**Step 5: backfills stay sane.** A backfill of the ingest DAG starts sensors for old days; their files exist, so each
sensor succeeds on its first check. Because the sensor is deferrable, even 30 of them hold no slots.

**Result.** Freshness follows the partner rather than a guess, a missing file becomes a message rather than an empty
dashboard, and the scheduler cannot deadlock on its own sensors.`,
    mcqs: [
      mcq("During a 20-day backfill, every run starts with an S3 sensor in poke mode and the worker pool has 16 slots. The DAG that writes those files is stuck queued. Why?", [
        ["The poking sensors hold all 16 slots, so the producing task can never get one", true],
        ["Sensors always run before every other task in Airflow, across the whole cluster", false],
        ["Backfill runs are given a lower priority, so their producing tasks never start", false],
        ["S3 sensors lock the bucket while they poke, so writers cannot add the new files", false],
      ], "A poke-mode sensor occupies a worker slot for its entire wait, and twenty of them can starve the task they are waiting for; the simulation showed the same deadlock. Sensors have no global precedence, priority does not explain a full stall, and S3 has no such lock."),
      mcq("The merchant_payouts DAG is scheduled on the settlements asset. The ingest task that lists settlements as an outlet fails after writing half the data. What does merchant_payouts do?", [
        ["Nothing: an asset event is recorded only when the producing task succeeds", true],
        ["It runs at once, because the task touched the asset before it failed", false],
        ["It runs at its next cron time instead, as the fallback for a failed event", false],
        ["It runs with a warning flag, so that the payouts DAG can skip bad rows", false],
      ], "Asset (Dataset) events are emitted on success only, which is what makes asset scheduling safe. Touching the data is not an event, an asset-only schedule has no cron fallback, and there is no warning flag passed to consumers."),
      mcq("RupeeRail's Airflow scheduler crashed at midnight and nobody noticed until 09:00. Which check would have caught it by 07:30?", [
        ["An independent freshness monitor querying max(loaded_at) on the table at 07:30", true],
        ["An on_failure_callback on every task that posts to the on-call Slack channel", false],
        ["A task-level sla on the load task with an sla_miss_callback sending an email", false],
        ["Raising retries on every task so that failures recover before anybody looks", false],
      ], "Callbacks and SLAs are run by the scheduler, so a dead scheduler sends nothing. Only a check outside it, looking at the data's freshness, notices that nothing happened. More retries cannot help when no task runs at all."),
    ],
    checkpoint: [
      mcq("What does deferrable=True change for an S3KeySensor?", [
        ["The wait runs in the triggerer process, so no worker slot is held between checks", true],
        ["The sensor checks S3 only once and fails if the file is not already present then", false],
        ["The sensor's task is postponed until all other tasks in the DAG have finished", false],
        ["The scheduler retries the sensor forever, ignoring the timeout that was set", false],
      ], "Deferring hands the wait to the triggerer's async loop and frees the worker. It still checks repeatedly, it is not reordered after other tasks, and the timeout still applies."),
      mcq("Which is the better way to make a payouts DAG start after the settlements DAG has loaded today's data?", [
        ["Schedule it on an Asset that the settlements load task declares as an outlet", true],
        ["Schedule it thirty minutes after the settlements DAG's usual finishing time each morning", false],
        ["Add an ExternalTaskSensor that must match the other DAG's interval exactly", false],
      ], "Asset scheduling starts the consumer when the producer succeeds, whatever time that is. A fixed delay is a guess, and ExternalTaskSensor depends on both schedules lining up and breaks when one changes."),
      mcq("A sensor is set with poke_interval=300 and timeout=21600. The file never arrives. What happens?", [
        ["After six hours of checks every five minutes the sensor fails, and its failure alert fires", true],
        ["It keeps checking every five minutes until the file arrives, however many days that takes", false],
        ["It checks for five minutes, then marks itself successful so the DAG can continue onwards", false],
        ["It waits 21,600 checks, once every 300 seconds, before giving up on the missing file", false],
      ], "timeout is the total wait in seconds (21,600 s is six hours) and poke_interval the gap between checks; when the timeout passes the sensor fails, or is skipped with soft_fail. It does not wait forever, never succeeds without the condition, and timeout counts seconds, not checks."),
    ],
  },

  /* ── PREFECT_DAGSTER ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_ORCHESTRATION_PREFECT_DAGSTER',
    notes: `The same RupeeRail pipeline (three bank extracts, a day load, a slow reference lookup) in Prefect and in Dagster.
The Prefect code below was run with Prefect 3.9 on the lab machine and the output is real. Dagster was not installed;
its code is written from the Dagster documentation and only checked with python -m py_compile.

## Prefect: flows and tasks are Python functions

    from datetime import date, timedelta
    from prefect import flow, task, get_run_logger
    from prefect.cache_policies import INPUTS, TASK_SOURCE

    @task(retries=3, retry_delay_seconds=[1, 2, 4])
    def fetch_settlements(bank: str, day: date) -> list[dict]: ...

    @task(cache_policy=INPUTS + TASK_SOURCE, cache_expiration=timedelta(hours=12))
    def fx_rates(day: date) -> dict: ...

    @task
    def load_day(rows: list[dict], day: date, db: str) -> int: ...   # delete + insert the day, one transaction

    @flow(log_prints=True)
    def daily_settlements(day: date, banks: list[str] = ["kaveri_bank", "ganga_bank", "narmada_bank"],
                          db: str = "rr.duckdb") -> int:
        fx_rates(day)
        batches = fetch_settlements.map(banks, day)
        rows = [r for batch in batches.result() for r in batch]
        return load_day(rows, day, db)

    daily_settlements(day=date(2026, 10, 27))   # run twice

No server, no DAG folder: calling the flow ran it, with a temporary local API server started for the run. The output,
with kaveri_bank's API failing twice:

    Task run 'fx_rates-c74' - calling the slow rates service for 2026-10-27
    Task run 'fetch_settlements-c22' - partner API returned 503 (attempt 1)
    Task run 'fetch_settlements-c22' - ... Retry 1/3 will start 1 second(s) from now
    Task run 'fetch_settlements-4bc' - Finished in state Completed()
    Task run 'fetch_settlements-36e' - Finished in state Completed()
    Task run 'fetch_settlements-c22' - ... Retry 2/3 will start 2 second(s) from now
    Task run 'fetch_settlements-c22' - Finished in state Completed()
    Task run 'load_day-6df' - 2026-10-27: 10 rows for the day, 10 in table
    second run:
    Task run 'fx_rates-7b5' - Finished in state Cached(type=COMPLETED)
    Task run 'load_day-270' - 2026-10-27: 10 rows for the day, 10 in table

What it shows: .map created one task run per bank, running concurrently, and only the failing one retried, on the
listed delays (1 then 2 seconds). The cached task did not run again for the same input and source. The second load
replaced the day: still 10 rows. (A string argument to map would be iterated character by character; wrap constants
in unmapped().)

**Parameters are validated** from the type hints. day="2026-10-27" was converted to datetime.date; day="27-10-2026"
stopped the run before any task started:

    prefect.exceptions.ParameterTypeError: Flow run received invalid parameters:
     - day: Input should be a valid date or datetime, invalid character in year

**Scheduling** happens through a deployment: daily_settlements.serve(name="nightly", schedule=Cron("0 2 * * *",
timezone="Asia/Kolkata")) for a long-running process, or flow.deploy to a work pool (Docker, Kubernetes, ECS) in
production. Prefect has no data interval: a scheduled run gets only its parameters, so the flow works out its day
from the scheduled time:

    from prefect.runtime import flow_run
    sched = flow_run.scheduled_start_time.astimezone(ZoneInfo("Asia/Kolkata"))
    day = sched.date() - timedelta(days=1)

(In Prefect 3.9 this is a standard datetime; the pendulum method in_timezone failed with AttributeError, a bug we hit
and fixed.) A **backfill** is a loop over days, or run_deployment with parameters for each day:

    2026-10-24: 11 rows for the day, 11 in table
    2026-10-25: 13 rows for the day, 24 in table
    2026-10-26: 10 rows for the day, 34 in table
    2026-10-25: 13 rows for the day, 34 in table     # rerun of the 25th: still 34

**Alerts**: state hooks such as @flow(on_failure=[alert_on_call]) ran when a flow failed:

    Running hook 'alert_on_call' in response to entering state 'Failed'
    ALERT -> #data-oncall: refunds run independent-newt ended FAILED: Flow run encountered an exception: ...

In production, Prefect Cloud or a self-hosted server adds automations (notify when a flow run fails or is late).

## Dagster: describe the tables, not the steps

Dagster's main idea is the **software-defined asset**: a function that produces a table or file, with its upstream
assets as dependencies. Partitions give it what Airflow calls intervals:

    import dagster as dg

    daily = dg.DailyPartitionsDefinition(start_date="2026-10-01", timezone="Asia/Kolkata")

    @dg.asset(partitions_def=daily)
    def raw_settlements(context: dg.AssetExecutionContext) -> dg.MaterializeResult:
        day = context.partition_key                    # "2026-10-26"
        ...
        return dg.MaterializeResult(metadata={"rows": rows})

    @dg.asset(partitions_def=daily, deps=[raw_settlements])
    def fct_settlements(context: dg.AssetExecutionContext) -> None: ...

    @dg.asset_check(asset=fct_settlements)
    def no_negative_amounts() -> dg.AssetCheckResult:
        return dg.AssetCheckResult(passed=bad == 0, metadata={"bad_rows": bad})

    settlements_job = dg.define_asset_job("settlements_job", selection=[raw_settlements, fct_settlements],
                                          partitions_def=daily)
    defs = dg.Definitions(assets=[raw_settlements, fct_settlements], asset_checks=[no_negative_amounts],
                          schedules=[dg.build_schedule_from_partitioned_job(settlements_job, hour_of_day=2)])

dagster dev opens a UI showing the asset graph, which partitions of which asset are materialised, and lets you
backfill a range of partitions by selecting them. In tests, dg.materialize([...], partition_key="2026-10-26") runs
assets in-process. The dagster-dbt integration loads every dbt model as an asset, so dbt lineage and Python assets
share one graph. Newer releases add declarative automation (materialise an asset when its upstream changes).

## Comparing them

    Question                 Airflow                     Prefect                       Dagster
    unit of work             task in a DAG               task in a flow                asset (a table/file)
    "which day?"             data interval, built in     a parameter you pass          partition key, built in
    backfill                 CLI/UI over intervals       loop or run_deployment        select partitions in UI
    run locally              Docker/WSL, dags test       just call the flow            dagster dev, materialize()
    branching/dynamic        mapping, branch operators   plain Python if/for           partitions, dynamic outputs
    ecosystem                largest operator library    Python-first integrations     strong dbt and lineage story

What each makes easy or hard: Prefect makes dynamic, Python-shaped work (loops, conditionals, retries per call) trivial
and leaves interval discipline to you. Airflow gives intervals, backfills and a huge operator catalogue, at the price
of more infrastructure and stricter rules about what a DAG file may do. Dagster makes "is this table fresh, which
partitions are missing, which checks failed" the first screen, at the price of thinking in assets rather than steps.`,
    workedExample: `**Task.** RupeeRail's Airflow DAG must also run at a partner company that uses Prefect. Port it, deciding each
concept consciously rather than translating line by line.

**1. The interval.** Airflow passed data_interval_start; Prefect passes nothing. Make day: date | None a parameter. A
manual or backfill run passes it; a scheduled run computes yesterday in IST from flow_run.scheduled_start_time.

**2. Dynamic tasks.** extract.expand(bank=BANKS) becomes fetch_settlements.map(banks, day). The date is not iterable,
so it is treated as a constant; a string constant would need unmapped().

**3. Retries.** Airflow's retries=3 with exponential backoff becomes retries=3, retry_delay_seconds=[60, 120, 240].
The 401 rule (fail at once) becomes a retry_condition_fn that returns True only for transient errors.

**4. dbt.** BashOperator becomes a task that calls subprocess.run(["dbt", "build", "--select", "+fct_settlements",
"--vars", f"{{day: {day}}}"], check=True), so a failing dbt test fails the task.

**5. Downstream triggers.** The Airflow asset that started merchant_payouts becomes either a call to the payouts
flow at the end of this flow (simple), or a Prefect automation reacting to this flow's completion (decoupled).

**6. Schedule and alerts.** serve(name="nightly", schedule=Cron("0 2 * * *", timezone="Asia/Kolkata")); an
on_failure hook posts to the on-call channel.

**7. Backfill.** A loop over 1 to 27 October calling run_deployment with day set, three at a time. It is safe because
load_day still replaces a whole day, a property of the task that no orchestrator provides for you.

**What did not change:** extract, load and the dbt project. Only the wrapper moved, which is the point of keeping
pipeline logic out of the orchestrator.`,
    mcqs: [
      mcq("A Prefect flow calls fetch.map(banks, day) where banks is a list of three names and day is a date. What runs?", [
        ["Three task runs, one per bank, each getting the same day", true],
        ["One task run receiving the whole list of banks as one value", false],
        ["Three task runs per bank, one for each part of the date value", false],
        ["Nine task runs, one for every pairing of bank and position", false],
      ], "map iterates the iterable arguments together and passes non-iterables such as a date to every call unchanged. It does not collapse to one call or form combinations; only a string, being iterable, would need unmapped() to stay constant."),
      mcq("Which question does Dagster's asset model answer more directly than a task-based DAG?", [
        ["Which partitions of fct_settlements are materialised, and did their checks pass", true],
        ["Which worker process ran the extract task, and how much memory it used at peak", false],
        ["Which Python version the scheduler runs, and which providers are installed with it", false],
      ], "Assets and partitions are first-class in Dagster, so the UI shows a table's materialised days and check results. Worker resources and installed packages are operational details that every orchestrator reports in some form, not what the asset model changes."),
      mcq("RupeeRail's Prefect flow is scheduled at 02:00 IST but takes day as a required parameter with no default. What happens at 02:00?", [
        ["The scheduled run cannot supply the missing day, so the flow needs a default or a computed day", true],
        ["Prefect fills in the scheduled date automatically, in the same way Airflow passes a data interval", false],
        ["Prefect skips the scheduled run silently and waits for somebody to trigger it with a day", false],
        ["The run starts, and day is set to None, so the load task falls back to today's date", false],
      ], "Prefect has no data interval; a scheduled run gets only the parameters the deployment defines. Give day a default of None and compute it from flow_run.scheduled_start_time, or set it in the schedule's parameters. Prefect neither invents a date nor quietly sets a required parameter to None."),
    ],
    checkpoint: [
      mcq("What does Prefect's cache_policy=INPUTS + TASK_SOURCE do on a second run with the same arguments?", [
        ["Returns the stored result without running the task, unless its code has changed", true],
        ["Runs the task again but writes the output to the same storage key as the first run", false],
        ["Skips the task and every downstream task, marking the whole flow run as Cached", false],
        ["Runs the task twice and compares both results, raising an error if they differ", false],
      ], "The cache key combines the inputs and the task's source; a match returns the cached result (the run showed Cached(type=COMPLETED)). It does not rerun, does not skip downstream tasks, and does not compare runs."),
      mcq("In Dagster, what plays the role of Airflow's data interval for a daily table?", [
        ["A partition key from a DailyPartitionsDefinition, read through context.partition_key", true],
        ["The asset's group name, which Dagster sets to the date of the latest materialisation", false],
        ["The run's start time, which every asset reads from the system clock when it begins", false],
      ], "Partitioned assets receive their partition key (for example 2026-10-26), and backfills select ranges of keys. Group names organise assets in the UI, and reading the clock is exactly the habit partitions avoid."),
      mcq("Why does a Prefect backfill loop over 24 to 26 October stay correct when the 25th is rerun?", [
        ["load_day replaces that day's rows in a transaction, so the rerun gives the same table", true],
        ["Prefect detects that the 25th has already succeeded and refuses to run it again", false],
        ["The cache on fx_rates makes the whole flow return the earlier result for that day", false],
        ["Prefect's result storage deduplicates rows written by the same flow on the same day", false],
      ], "The real run showed 34 rows before and after rerunning the 25th because the task is idempotent for its day. Prefect does not refuse reruns, the cache applies to one task's return value only, and result storage does not touch your tables."),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_ORCHESTRATION_DEBUGGING',
    notes: `Six orchestration failures from RupeeRail's first quarter. Outputs marked "real" were produced on the lab machine
(Prefect 3.9, DuckDB 2.0, plain-Python simulations); Airflow messages are paraphrased because Airflow cannot run there
and the exact text differs between versions. In each case: read the run's state and log for the failing interval
first, then change one thing.

## 1. The DAG that takes 40 seconds to parse

**Symptom.** A new DAG shows in the UI as broken with an import timeout, and the whole scheduler feels slow.

**Cause.** The file calls the bank's API at module level to build the list of banks. The DAG processor runs top-level
code on every parse (every 30 seconds or so), and the import timeout (dagbag_import_timeout, 30 seconds by default)
was exceeded.

**Fix.** Move the call into a task and map over its result (get_banks() then extract.expand(bank=...)), or read a
small config file. A DAG file should parse in well under a second; DagBag in a pytest catches regressions.

## 2. The dashboard is always a day behind

**Symptom.** The load for "yesterday" picks up the day before yesterday. Real simulation of the template's value:

    data_interval_start 2026-10-26T00:00:00+05:30 = 2026-10-25T18:30:00+00:00
    ds rendered from UTC: 2026-10-25   business day in IST: 2026-10-26

**Cause.** The SQL used {{ ds }}; Airflow renders it from the logical date in UTC, and an IST midnight is 18:30 UTC
the previous day.

**Fix.** Use {{ data_interval_start.in_timezone('Asia/Kolkata') | ds }}, or filter on the interval timestamps
directly, and check the rendered SQL with airflow dags test.

## 3. Revenue doubled after a "successful" retry

**Symptom.** One day's transactions are exactly twice the source. The run history shows attempt 1 failed, attempt 2
succeeded. Real DuckDB output:

    txns_append (1000, 599000)       source (500, 299500)

**Cause.** The task appended, committed, then lost its heartbeat; the retry appended again.

**Fix.** Delete the interval and insert it in one transaction (txns_replace stayed at 500 after the retry and a
manual rerun). Then reload the bad day.

## 4. A backfill that changed nothing

**Symptom.** A seven-day backfill went green, but 18 to 24 October still show the old numbers. Real simulation:

    partitions written: ['2026-10-27'] x 7 runs

**Cause.** The task computed its date with date.today() - timedelta(days=1), so every run loaded the day before the
backfill was started.

**Fix.** Take the date from data_interval_start/end (or the flow's day parameter in Prefect). Search the repository
for today(), now() and CURRENT_DATE in pipeline code; each one is a backfill bug waiting.

## 5. A backfill that never finishes

**Symptom.** Thirty backfill runs are "running", nothing completes, and the producing DAG's tasks sit queued. Real
model of 8 slots and 8 poking sensors:

    poke       8 slots, 8 sensors | producer started: None | file ready: None | slot-minutes held by sensors: 1920.0

**Cause.** Poke-mode sensors held every worker slot, so the task that writes their files never ran.

**Fix.** deferrable=True (or mode="reschedule"), a pool for sensors, and a timeout on every sensor.

## 6. The Prefect schedule that crashed at 02:00

**Symptom.** Manual runs with day="2026-10-27" worked; every scheduled run failed. Real output:

    AttributeError: 'datetime.datetime' object has no attribute 'in_timezone'. Did you mean: 'astimezone'?

**Cause.** Manual runs passed day, so the scheduled-time branch never ran in testing. In Prefect 3.9,
flow_run.scheduled_start_time is a standard datetime; in_timezone is a pendulum method copied from older code.

**Fix.** flow_run.scheduled_start_time.astimezone(ZoneInfo("Asia/Kolkata")), and a test that calls the flow with
day=None. Real output after the fix: settling datetime.date(2026, 10, 27).`,
    mcqs: [
      mcq("A DAG's daily SQL uses {{ ds }} and its schedule is midnight in Asia/Kolkata. Analysts say every load is one day behind. What is the cause?", [
        ["ds is rendered from the logical date in UTC, which for an IST midnight is the previous day", true],
        ["ds is the date on which the run started, so it is one day after the data interval it covers", false],
        ["The scheduler applies a one-day delay to every DAG whose timezone differs from the server", false],
        ["Jinja caches the first rendered value of ds and reuses it for every later scheduled run", false],
      ], "00:00 IST is 18:30 UTC the day before, so ds shows the previous date; the simulation printed 2026-10-25 against an IST day of 2026-10-26. ds is not the start date, there is no timezone delay, and templates are rendered per run."),
      mcq("A backfill over seven days goes green but the target table is unchanged for those days. Which line in the task is the first suspect?", [
        ["day = date.today() - timedelta(days=1)", true],
        ["con.execute('BEGIN') before the DELETE", false],
        ["retries=3 in the task's default_args", false],
        ["max_active_runs=3 on the DAG decorator", false],
      ], "A date computed from the clock makes every backfill run load the same recent day, exactly as the simulation's seven writes to 2026-10-27 showed. A transaction, retries and run concurrency affect safety and speed, not which day is loaded."),
      mcq("A new DAG appears as broken with an import timeout. The file creates a database connection and runs a query at module level to decide how many tasks to create. What is the right fix?", [
        ["Move the query into a task and use dynamic task mapping over its result", true],
        ["Raise dagbag_import_timeout to five minutes so that the query can finish", false],
        ["Cache the query result in a global variable so that it runs only on deploy", false],
        ["Run the query inside default_args so that it executes once per DAG run", false],
      ], "Top-level code runs on every parse, so the work belongs in a task, with expand() creating one task instance per result. A longer timeout makes every parse slower, globals do not survive separate parse processes, and default_args is evaluated at parse time too."),
      mcq("Scheduled runs of a Prefect flow fail, but manual runs from the terminal always pass. What does the evidence point to first?", [
        ["A code path that only runs without the parameter, such as computing the day from the schedule", true],
        ["A broken network route between the work pool and the partner bank, which only exists at night", false],
        ["A Prefect limit on scheduled runs, which must be raised on the server before cron works at all", false],
      ], "When the difference between failing and passing runs is how they are started, look at what differs: manual runs passed day, scheduled ones took the untested branch. A network fault would also hit manual runs at that hour, and Prefect has no such scheduled-run limit."),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_ORCHESTRATION_PRACTICE',
    notes: `Eight exercises, easiest first. Work each on paper before reading the answer. Use RupeeRail's settings unless
an exercise says otherwise: Asia/Kolkata, daily runs, loads that replace their interval.

## 1. Read an interval (easy)

Airflow 2, schedule CronDataIntervalTimetable("30 3 * * *", timezone="Asia/Kolkata"). For the run that fires at
03:30 IST on 5 November, give data_interval_start and data_interval_end in IST, and the business day it should load.

**Answer.** Start 4 Nov 03:30 IST, end 5 Nov 03:30 IST; with midnight-to-midnight business days, the run loads 4
November (convert data_interval_start to IST and take its date).

## 2. Count catchup runs (easy)

start_date 1 November 00:00 IST, schedule "0 2 * * *" (interval semantics), catchup=True, first deployed at 10:00 IST
on 8 November. How many runs are created, and which is the last interval?

**Answer.** Ticks at 02:00 on 1 to 8 November make seven completed intervals, so seven runs; the last covers 7 Nov
02:00 to 8 Nov 02:00. (The same reasoning gave seven runs for 20 to 27 October in the lesson's simulation.)

## 3. Wire dependencies (easy)

extract_orders and extract_payments run in parallel; join waits for both; quality_check follows join; publish and
notify both follow quality_check. Write it with >>.

**Answer.** [extract_orders, extract_payments] >> join >> quality_check >> [publish, notify]

## 4. Choose retries (medium)

For each, choose retries and a reason: (a) a partner API that throttles at peak, (b) dbt build, whose failures are
mostly test failures, (c) a sensor waiting for a file, (d) a task sending the merchants' payout email.

**Answer.** (a) 3 to 5 with exponential backoff and a pool; (b) 0 or 1, because a failing test is a data problem; (c)
none, a timeout instead, since the sensor already retries by checking; (d) retries only if the task records sent
emails per interval and checks first, otherwise a retry emails merchants twice.

## 5. Make the SQL interval-safe (medium)

Rewrite: INSERT INTO fct_txns SELECT * FROM stg_txns WHERE txn_date = CURRENT_DATE - 1

**Answer.**

    BEGIN;
    DELETE FROM fct_txns
     WHERE txn_ts >= '{{ data_interval_start }}' AND txn_ts < '{{ data_interval_end }}';
    INSERT INTO fct_txns SELECT * FROM stg_txns
     WHERE txn_ts >= '{{ data_interval_start }}' AND txn_ts < '{{ data_interval_end }}';
    COMMIT;

The clock is gone, the interval is half-open, and the delete makes reruns replace rather than add.

## 6. Size a backfill (medium)

Ninety days to backfill, 15 minutes a run, and the warehouse can take four concurrent runs. How long, and what else
limits you?

**Answer.** ceil(90 / 4) = 23 waves x 15 minutes = 5 h 45 min. Other limits: source API rate limits (use a pool), the
nightly run's need for capacity (pause or schedule the backfill around it), and depends_on_past, which forces one
run at a time.

## 7. Sensor or asset? (medium)

(a) A partner drops a file in S3 at an unknown time. (b) Your payouts DAG must run after your own settlements DAG
loads. (c) Wait until a partner API says an export is ready.

**Answer.** (a) a deferrable S3KeySensor with a timeout; (b) an Asset outlet on the load task and schedule=[asset] on
payouts; (c) @task.sensor returning PokeReturnValue, in reschedule mode, with a timeout.

## 8. Port to Prefect (hard)

Translate retries=3, retry_delay=2 minutes with exponential backoff, the day from data_interval_start, and
extract.expand(bank=BANKS) to Prefect.

**Answer.** @task(retries=3, retry_delay_seconds=[120, 240, 480]); a flow parameter day: date | None = None, computed
from flow_run.scheduled_start_time in IST when None; fetch.map(banks, day). Add retry_condition_fn so a 401 is not
retried.`,
    mcqs: [
      mcq("A DAG's start_date is 10 November 00:00 IST with schedule '0 6 * * *' (interval semantics) and catchup=True. It is first deployed at 09:00 IST on 13 November. How many runs are created?", [
        ["Three runs, for the intervals that ended on 11, 12 and 13 November", true],
        ["Four runs, one for each of the calendar days from 10 to 13 November", false],
        ["One run, for the interval that started at 06:00 IST on 13 November", false],
        ["Two runs, because the interval ending on 13 November is still open", false],
      ], "Ticks at 06:00 on 10, 11, 12 and 13 November bound three completed intervals by 09:00 on the 13th. Calendar days are not intervals, the interval starting on the 13th has not ended, and the one ending at 06:00 on the 13th is complete."),
      mcq("Which dependency line makes publish and notify both start after quality_check?", [
        ["quality_check >> [publish, notify]", true],
        ["[publish, notify] >> quality_check", false],
        ["publish >> quality_check >> notify", false],
        ["quality_check << [publish, notify]", false],
      ], "A list on the right of >> fans out from quality_check. The second and fourth lines make quality_check wait for publish and notify, and the third puts publish before the check."),
      mcq("A backfill has 90 runs of 15 minutes each and max_active_runs=4. Roughly how long does it take if nothing else limits it?", [
        ["About 5 h 45 min, being 23 waves of 15 minutes each", true],
        ["About 22 h 30 min, as the runs execute one by one", false],
        ["About 1 h 30 min, as each wave runs 15 runs at once", false],
        ["About 6 h 30 min, as 26 waves of 15 minutes each", false],
      ], "90 / 4 rounds up to 23 waves, and 23 x 15 minutes is 345 minutes. One at a time would take 22.5 hours, waves hold four runs not fifteen, and 26 waves does not follow from the numbers."),
      mcq("A task sends each merchant a payout email for its interval. Under what condition is it safe to give it retries?", [
        ["When it records which emails it sent for the interval and checks that before sending", true],
        ["When the retry delay is long enough for the mail server to discard the first attempt", false],
        ["When it is the last task in the DAG, so that no downstream task is affected by retrying", false],
        ["When the email body contains the interval's date, so merchants can spot the duplicates", false],
      ], "A side effect is idempotent only if the task remembers what it already did for that interval. Mail servers do not discard sent mail, being last in the DAG does not stop duplicates, and asking merchants to spot repeats is not a design."),
      mcq("For a partner export that is ready only when the partner's API says so, which waiting approach fits best?", [
        ["@task.sensor returning PokeReturnValue, in reschedule mode with a timeout", true],
        ["An Asset on the partner's API URL, which Airflow polls on its own schedule", false],
        ["A poke-mode sensor with no timeout, so that it never misses the export", false],
        ["A fixed time.sleep(3600) in the task, followed by a single API request", false],
      ], "A decorated sensor can call any API and frees its slot between checks, and the timeout bounds the wait. Airflow does not poll external URLs for assets, a timeout-less poke sensor can block slots forever, and a fixed sleep is both slow and unreliable."),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_ORCHESTRATION_INTERVIEW_QUESTION',
    notes: `Four questions data-engineering interviewers ask about orchestration, with an answer that scores well and the
follow-up a good answer earns. Say them aloud; interviewers listen for intervals, idempotency and operational habits,
not for a list of Airflow features.

## 1. "Your daily DAG failed at 3 a.m. Walk me through what you do."

**Model answer.** "First the blast radius: which task, which interval, and what is downstream, so I know whether a
dashboard is wrong right now. Then the log of the failed attempt: is it transient (a 503, a timeout) or permanent (a
schema change, a bad file, an expired credential)? Transient and retries exhausted: rerun the failed task for that
interval by clearing it; downstream runs after it. Permanent: fix the cause, then clear. Because our tasks replace
their interval, a rerun is safe. If the business reads the data at 8, I tell them at 7:30 whether it will be ready."

**Follow-up.** "How do you know the rerun did not double anything?" Compare per-interval counts and sums with the
source, and point to the load pattern (delete-insert or MERGE on a key) that makes a rerun replace rather than add.

## 2. "What is the logical date, and why does my daily DAG run for yesterday?"

**Model answer.** "In Airflow 2's interval model a run covers an interval and starts when the interval ends, so the
run at 02:00 on the 27th processes the 26th, and its logical date is the interval's start. I never use the clock in a
task; I use data_interval_start and data_interval_end. Airflow 3 changed the default for cron strings to a trigger
model, so I set the timetable explicitly, and I convert to IST before taking a date, because ds is UTC."

**Follow-up.** "What breaks if a task uses now()?" Every backfill and late rerun loads the wrong day; the simulation
in this topic wrote seven backfill runs into one partition.

## 3. "How would you backfill a year of data for a DAG that is already running daily?"

**Model answer.** "Check the task is idempotent for its interval and that raw data for the year exists. Decide the
order: if each day depends on the previous (a running balance), depends_on_past and one run at a time; otherwise
parallel. Size the concurrency to the warehouse and source limits with max_active_runs and pools. Run a small slice,
verify counts, then the rest, keeping the backfill's dates away from the partition the nightly run writes. Afterwards
compare totals per month with the source."

**Follow-up.** "The backfill would take four days. What then?" Process a month per run if the transform allows it
(a different DAG or a parameter), or move the heavy work to Spark sized for the job, rather than 365 small runs.

## 4. "Airflow, Prefect or Dagster for a new team?"

**Model answer.** "If the company already runs one, that one: a second orchestrator doubles operations. Greenfield:
Airflow for a broad operator ecosystem and a large hiring pool; Prefect for a small Python team that wants dynamic
flows running quickly; Dagster when the platform is centred on tables and dbt and the team wants lineage and checks
per asset. Whatever we pick, tasks stay thin wrappers over plain code."

**Follow-up.** "What does Prefect not give you that Airflow does?" A built-in data interval: in Prefect you pass the
day as a parameter and build backfills as loops or deployment runs, so interval discipline is your job.`,
    mcqs: [
      mcq("An interviewer asks how you will know a rerun of a failed load did not double the data. Which answer is strongest?", [
        ["Compare per-day counts and sums with the source, and explain that the load replaces its interval", true],
        ["Check that the rerun's task state is success, since Airflow marks any duplicated loads as failed ones", false],
        ["Look at the task log for the INSERT statement and confirm that it ran exactly one time", false],
        ["Trust the retry settings, since a task with retries cannot write the same rows twice", false],
      ], "Evidence against the source plus a load design that replaces rather than adds is what an interviewer wants. Airflow does not detect duplicates, one INSERT in the rerun says nothing about the earlier attempt, and retries are exactly what causes double writes when a load appends."),
      mcq("In an interview you are asked why a daily Airflow 2 DAG that ran at 02:00 on the 27th processed the 26th. What is the accurate explanation?", [
        ["A run covers an interval and starts once it ends, so the 02:00 run on the 27th covers the 26th", true],
        ["Airflow always waits a day before running a DAG, to give late-arriving data a chance to land", false],
        ["The scheduler ran late and caught up with the previous day's run instead of the current one", false],
        ["The DAG's timezone was wrong, and correcting it would make the run process the 27th instead", false],
      ], "Interval semantics are the reason: the interval 26th 02:00 to 27th 02:00 has just ended. There is no blanket one-day wait, nothing ran late, and fixing a timezone would not change which interval a run covers."),
      mcq("A year-long backfill is estimated at four days of runtime. Which response shows the most engineering judgement?", [
        ["Process larger slices per run, such as a month, or move the heavy step to suitably sized Spark", true],
        ["Set max_active_runs to 365 so every day of the year runs at the same moment on the cluster", false],
        ["Turn on catchup and let the scheduler work through the year at whatever pace it chooses", false],
      ], "Changing the unit of work or the engine attacks the cause. Running 365 at once overwhelms the warehouse and source limits, and catchup is just an unplanned backfill with the same total work."),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_ORCHESTRATION_CHECKPOINT',
    notes: `Ten questions across the topic: why orchestrate, Airflow DAGs and data intervals, retries and backfills, sensors,
assets and alerts, and Prefect and Dagster. Answer without notes; the result shows which lesson to revisit.`,
    checkpoint: [
      mcq("A team's four cron jobs are timed 30 minutes apart. What is the main weakness an orchestrator removes?", [
        ["Each step starts by the clock, so a slow upstream step lets the next one read partial data", true],
        ["Cron cannot start Python scripts directly, so each step has to be wrapped in a shell script first", false],
        ["Cron jobs cannot run at night, because the server pauses the crontab while it is idle", false],
        ["Cron jobs always run twice when the server clock moves forward for daylight saving", false],
      ], "Timing gaps are guesses; dependencies make each step wait for the previous one's success. Cron runs Python directly and runs at night, and India has no daylight saving change, so the last option is not the issue either."),
      mcq("Which value should a daily task use to decide which rows to load?", [
        ["The run's data_interval_start and data_interval_end", true],
        ["The worker's clock at the moment the task begins", false],
        ["The maximum date already present in the target table", false],
        ["The date written in the DAG file's start_date setting", false],
      ], "The interval ties the task to the period the run is for, so retries and backfills load the right rows. The clock and the table's maximum both change with when the task runs, and start_date is fixed for every run."),
      mcq("Which piece of a DAG file runs every time the file is parsed, not only when a run executes?", [
        ["Code at module level, outside any task function or operator", true],
        ["The body of a @task function, as soon as the DAG is unpaused", false],
        ["The bash_command of a BashOperator, rendered and run at parse", false],
      ], "Module-level code executes on each parse, which is why it must stay cheap. Task bodies and operator commands run only when a task instance executes."),
      mcq("A task appends rows and commits, then fails before Airflow records success. Retries are 2. What does the table look like for that day after the retry succeeds?", [
        ["Twice the rows, since the retry appended the interval's data again", true],
        ["The correct rows, since Airflow undoes a failed attempt's writes", false],
        ["No rows, since a failed attempt deletes its interval on retrying", false],
        ["The correct rows, since the database rejects identical inserts", false],
      ], "Airflow has no way to undo committed writes, and a plain table accepts identical rows, so the retry doubles the day. Only an interval-replace or keyed upsert makes the retry harmless."),
      mcq("Why is catchup=False usually set on a new production DAG, with past days loaded by a backfill?", [
        ["It stops an unplanned flood of runs at deploy time and lets the backfill be paced and checked", true],
        ["It is the only setting under which Airflow allows a DAG to be backfilled later from the CLI", false],
        ["It makes the scheduler skip failed intervals, so a bad day does not block the following days", false],
        ["It tells Airflow to process every interval in a single run, which is faster than one per day", false],
      ], "With catchup on, deploying creates a run for every missed interval at once. Backfills work either way, catchup has nothing to do with skipping failures, and it never merges intervals into one run."),
      mcq("Which setting stops a 20-day backfill from overwhelming a partner bank's rate-limited API?", [
        ["A pool with a few slots assigned to every task that calls that API", true],
        ["A longer poke_interval on the sensors at the start of each run", false],
        ["A higher retries value so that the throttled calls try again a bit later", false],
        ["Setting depends_on_past to False on each of the extract tasks", false],
      ], "A pool caps how many task instances use the resource at once, across runs and DAGs. Poke intervals affect sensors only, extra retries add calls under throttling, and depends_on_past False allows more parallelism, not less."),
      mcq("Twenty sensors in poke mode wait for files whose producing task cannot start. What is the best fix?", [
        ["Make the sensors deferrable or reschedule-mode, cap them with a pool, and give them timeouts", true],
        ["Lower poke_interval to one second so that each of the sensors notices the files much sooner", false],
        ["Remove the timeouts so the sensors keep waiting until the producing task eventually runs", false],
        ["Raise the producing task's retries so it keeps asking the scheduler for a free worker slot", false],
      ], "The deadlock comes from sensors holding slots; freeing them between checks and capping them removes it, and timeouts bound any wait. Faster pokes, no timeouts and more retries all leave the slots occupied."),
      mcq("A payouts DAG is scheduled on an Asset that the settlements load lists as an outlet. When does the payouts DAG run?", [
        ["After each successful run of the settlements load task that updates the asset", true],
        ["At midnight each day, with the Asset acting as a precondition that is checked", false],
        ["Whenever any file in the S3 path changes, since Airflow watches the bucket", false],
      ], "Asset events come from successful producing tasks and trigger the consumer. An asset-only schedule has no fixed time, and Airflow does not watch S3 for changes on its own."),
      mcq("Which alerting setup tells the on-call engineer when the Airflow scheduler itself has stopped?", [
        ["A freshness check outside Airflow on the table's latest load time", true],
        ["An on_failure_callback added to every single task in every DAG that we own", false],
        ["An on_retry_callback that posts to Slack on each retry attempt", false],
        ["An email_on_failure flag set to True in each DAG's default_args", false],
      ], "Callbacks and emails are sent by Airflow, so a stopped scheduler sends nothing; a monitor outside it notices the data going stale. That is why freshness checks belong in every on-call setup."),
      mcq("What is the main difference in how Prefect and Airflow know which day a run is for?", [
        ["Airflow passes a data interval to every run; in Prefect the day is a parameter you design", true],
        ["Prefect passes a data interval to every run; Airflow requires the day as a parameter", false],
        ["Both pass a data interval, but Prefect's interval always ends at midnight in UTC time instead", false],
        ["Neither knows the day, so both must read it from the worker's clock when they start", false],
      ], "Airflow's runs carry data_interval_start/end; a Prefect flow gets only its parameters, so you pass the day or derive it from the scheduled time. The reversed and the 'both' options are wrong, and reading the clock is what breaks backfills."),
    ],
  },
];
