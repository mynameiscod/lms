/**
 * Career-track content: The Data Engineering Candidate (DE_PLACE_CANDIDATE), Data Engineer, batch DE4 — the last topic
 * of Year-4 placement for the Data Engineer track. The shared Year-4 packs teach resume format, aptitude, HR and generic
 * mocks; this is the data-engineering version: a resume and portfolio whose every claim can be checked (row counts,
 * freshness, run time, cost) and that leaks no credentials or real data, the AWS, Microsoft, Databricks and Snowflake
 * data certifications and the data career paths in India, and one complete data-engineering interview loop.
 * Modelled on CL_PLACE_CANDIDATE.
 *
 * The evidence throughout is the track's capstone (DE_CAPSTONE, "A Data Platform for a Real Business"). The capstone
 * content was being written in parallel; its lab build follows Haatly, a fictional marketplace for sellers of sarees,
 * brassware and home decor from smaller Indian cities (an orders API feed and an operational database, bronze/silver/
 * gold on Delta, Spark for silver, dbt with tests, a Type 2 seller snapshot). Figures quoted for it here are labelled as
 * examples of the shape a claim takes; students replace every one with the figures from their own run logs.
 * Certifications are described by what they prove and who asks for them — no exam prices, passing scores, question
 * counts or durations, and no salary figures; the notes send students to the official pages. The round-0 SQL solution
 * was run on the sample shown with DuckDB 2.0 and SQLite (identical results), the naive version too, and the Python
 * partition-gap solution with Python 3.13 (scratchpad de_place_candidate); their output is quoted.
 *
 * Attribution: the topic is multi-skill (PLACEMENT_READINESS default, PORTFOLIO_EVIDENCE, INTERVIEW_PERFORMANCE).
 * Every checkpoint question names its skill with ck(), within what its unit declares; practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const PR = 'PLACEMENT_READINESS';
const PE = 'PORTFOLIO_EVIDENCE';
const IP = 'INTERVIEW_PERFORMANCE';

export const TRACK_DE_PLACE_CANDIDATE_BUNDLES: PilotBundle[] = [
  /* ── RESUME ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_PLACE_CANDIDATE_RESUME',
    notes: `The shared Year-4 resume pack covers format, length and the basics. This unit is the **data engineering** version:
the resume that gets through the filter for roles titled "Data Engineer — Trainee", "Associate Data Engineer",
"ETL Developer", "Big Data Engineer", "Analytics Engineer" or "Data Platform Engineer I", and a portfolio a reviewer
can actually run. Data hiring has two problems of its own. Every applicant lists the same words — Spark, Airflow,
Kafka, Snowflake — so the list alone proves nothing. And a pipeline is judged by things a resume rarely states: how
many rows, how fresh, how long it ran, what it cost, and what happens when it runs twice.

## Who reads it, and what they filter on

| Employer | Typical first filter | What wins the shortlist |
|---|---|---|
| Product companies (Bengaluru, Hyderabad, Pune, Gurugram) | Strong SQL, Python, one of Spark or dbt, a warehouse | A platform you built and ran, with numbers and tests |
| Global capability centres (banks, retailers, insurers) | SQL, Python, Spark or Databricks, AWS or Azure, sometimes a certification | Clean, documented code; data quality and process discipline |
| IT services and analytics consultancies | SQL, an ETL tool or Spark, a cloud, willingness to learn any stack | Breadth, clear communication, a certification in progress |
| Startups | Can you own the pipelines alone: Python, SQL, a warehouse, orchestration, cost sense | A working repo that rebuilds everything, and an honest cost note |

Services firms and consultancies often place freshers on support of existing pipelines first; GCCs and product
teams test SQL harder than anyone. Many employers run a **background verification** after the offer: education,
previous employment and certifications checked with the issuer through your credential ID. A claim that cannot
survive that check is not worth the risk.

## The skills line a filter searches

Use the job description's spellings, grouped, and only what you can defend for ten minutes:

    Languages:      SQL (window functions, CTEs, MERGE), Python (pandas, pyarrow, pytest)
    Processing:     PySpark (DataFrames, joins, partitioning), dbt (models, tests, incremental, snapshots), DuckDB
    Storage:        Parquet, Delta Lake, PostgreSQL; dimensional modelling, SCD Type 2, medallion layers
    Orchestration:  Airflow (DAGs, backfills), Prefect
    Streaming:      Kafka concepts, Spark Structured Streaming (windows, watermarks)
    Cloud (AWS):    S3, Glue Data Catalog, Athena, IAM roles; Azure: ADLS Gen2, Data Factory (concepts)
    Quality/ops:    dbt tests, pandera, freshness and volume checks, Git, Docker, Linux

Leave out what you only watched: "Hadoop", "Hive", "Informatica", "Snowflake", "Kafka Streams", "real-time ML
feature store" — unless you used them. If a JD names a tool you know only by its equivalent, write the one you used
and be ready to map it aloud ("I orchestrated with Prefect locally and wrote the Airflow DAG; both are tasks,
dependencies, retries and a schedule"). **Every word on this line is a question in the technical round** — "Spark"
means you will be asked what a shuffle is and why a join was slow; "Airflow" means "what does catchup do?".

## Bullets: what you built + the evidence + the measured result

A data bullet is credible when it names the data, the method and numbers someone could recount. The four numbers
panels trust are **volume** (rows, files, size), **freshness** (when the data is ready against when it is needed),
**run time** (and on what machine), and **cost** (from your own bill).

- Weak: "Built scalable ETL pipelines using Spark, Airflow and AWS for big data processing."
- Ingestion: "Incremental orders ingestion from a paginated API with a watermark and retries; re-running a day
  replaces its partition, so a rerun leaves row counts unchanged (shown by a test that loads the same day twice)."
- Processing: "PySpark silver step keeps the latest version of each order line and quarantines bad rows instead of
  dropping them; one day of about 13,000 orders runs in a few minutes on a laptop (timing in the README)."
- Modelling: "dbt star schema at order-line grain with a Type 2 seller dimension; 30-plus tests (unique, not-null,
  relationships, accepted values) run on every build; gold is published only when the build passes."
- Operations: "Orchestrated daily with backfills; a freshness check alerts when gold is older than its 07:00 target;
  a deliberately broken feed was caught by a test and gold was not published (recording in the README)."
- Cloud and cost: "Lake on S3 queried by Athena through the Glue catalogue, partitioned by date so a one-day query
  scans one partition; lab cost taken from my own bill, with a budget alarm set before anything was created."

The volumes and timings above are examples of the shape a claim takes — replace every one with yours, and keep the
run log, the test output and the billing export that produced each number. Say what the machine was ("on a 16 GB
laptop") and never present a laptop timing as a production benchmark. **Cost figures** come from your own bill or
the provider's pricing calculator, labelled as lab or estimate; never quote a price from a blog.

## A portfolio that runs

Nobody will keep a cluster or a warehouse running for a recruiter. "Runs" means a reviewer can clone it, run one
command and see the whole pipeline work on generated data:

    haatly-data-platform/
      README.md         the diagram, the sources and their freshness targets, a results table, how to run it
      DECISIONS.md      each lab shortcut (DuckDB for the warehouse, one machine) next to its production choice
      Makefile          make demo: generate data, ingest, silver, dbt build, checks — on a laptop, no cloud bill
      generate/         the synthetic-data generator with a fixed seed (the data itself is NOT committed)
      ingest/           API and database extractors, watermarks, retries; pytest tests
      spark/            the silver job and its tests on small fixtures
      dbt/              models, tests, snapshots, docs; profiles.yml reads credentials from environment variables
      orchestration/    the DAG or flow, with backfill instructions
      infra/            the AWS pieces as code (S3, IAM role, Glue database) and a teardown
      docs/             lineage graph, the data dictionary, the cost note, the broken-feed drill write-up

The README leads with a results table: rows per layer for a sample day, tests run and passed, freshness achieved,
run time and machine, what a rerun changes (nothing), and the cost note. A short screen recording of a backfill and
of the broken-feed drill carries what a reviewer will not run. Generated data beats a downloaded dataset: it has no
licence or privacy questions, and you can inject the duplicates and late rows your pipeline claims to handle.

## What never to publish

- **Credentials** — AWS keys, \`.env\` files, a \`profiles.yml\` with a real password, connection strings in a
  notebook's output. If one was ever committed, revoke and rotate it: deleting the file leaves it in git history.
- **Real personal data** — names, phone numbers, UPI ids, addresses, even from a "public" dataset you scraped.
  India's DPDP Act applies to personal data; generated data avoids the question entirely.
- **An employer's or client's work** — internship pipelines, schemas, table names or dashboards, even "anonymised".
- **Gigabytes of data in Git** — commit the generator and a tiny fixture, not the lake.

## Copies for different roles — the facts never change, only the order

| Target | Lead with | Push down |
|---|---|---|
| Data engineer (platform) | Ingestion, Spark, orchestration, the cloud pieces | dbt documentation |
| Analytics engineer | The dbt model, tests, the star schema and SCD | Spark internals |
| ETL developer at a services firm | Pipelines, SQL depth, scheduling, a certification in progress | Streaming |
| Big data or Databricks-heavy GCC role | PySpark, Delta, partitioning, skew fixes | DuckDB specifics |

LinkedIn and Naukri use the same spellings and the same numbers; pin the platform repository in Featured.`,
    workedExample: `**A weak data-engineering resume section, rewritten.** Pooja, B.Tech 2026, sends:

    SKILLS: Big Data, Hadoop, Hive, Spark, Kafka, Airflow, Snowflake, Databricks, AWS, Azure, GCP, Python, SQL,
            Machine Learning, Power BI
    PROJECTS
    1. Real-time big data pipeline processing millions of records using Kafka and Spark.
    2. Built a data warehouse in Snowflake for an e-commerce company.
    3. ETL pipeline with 99% accuracy.

**What a data panel sees.** Hadoop and Hive with no work behind them; three clouds. "Millions of records" with no
time, freshness or proof. Project 2 says "for an e-commerce company" — a reviewer will ask which one, and a class
project presented as client work costs trust. "99% accuracy" has no meaning for a pipeline: correct rows are not a
percentage you round.

**Step 1 — inventory what is true.** Her capstone is the Haatly platform: API and database ingestion with
watermarks, bronze/silver/gold on Delta, a PySpark silver job, dbt with tests and a Type 2 seller snapshot, a daily
schedule with backfills, freshness checks, S3 with Athena for one week of data. She used Snowflake only in a free
trial for an afternoon, never ran Kafka against a broker, and never touched Hadoop or GCP.

**Step 2 — rewrite.**

    Haatly — a data platform for a crafts marketplace                    github.com/pooja-r/haatly-data-platform
    Python, PySpark, dbt, Delta Lake, DuckDB, Prefect/Airflow, AWS (S3, Glue Data Catalog, Athena)
     - Incremental ingestion from a paginated orders API and an operational database (watermarks, retries);
       a rerun of any day leaves row counts unchanged — a test loads the same day twice.
     - PySpark silver: latest version per order line, bad rows quarantined with a reason, not dropped.
     - dbt star schema at order-line grain with an SCD Type 2 seller dimension; every build runs the tests
       and gold is published only on a pass.
     - Daily schedule with backfills; freshness alert at the 07:00 target; a broken feed was stopped by a
       test before gold (recording in the README). Lab cost from my own bill, budget alarm set first.

    SKILLS
    SQL (windows, MERGE), Python (pandas, pyarrow, pytest) | PySpark | dbt | Delta Lake, Parquet, DuckDB
    Prefect, Airflow (DAGs, backfills) | AWS S3, Glue Data Catalog, Athena, IAM | Git, Docker, Linux

**Step 3 — remove what must go.** Hadoop, Hive, GCP and "Machine Learning" come off; Snowflake comes off the
skills line (she can say in an interview that she tried the free trial). "Real-time" goes: her streaming lesson
work can appear as one honest line — "Spark Structured Streaming with windows and a watermark, run locally". She
searches every repository's history for keys and passwords (\`git log --all -p\` and a secret scanner), rotates
anything she finds, and checks that no generated file with names or phone numbers is committed. For a JD asking
for Snowflake, she keeps the truth and maps it: "I built the warehouse layer in dbt on DuckDB; dbt runs on
Snowflake with a different adapter, and the modelling and tests carry over".`,
    mcqs: [
      mcq('Kiran\'s pipeline repository has a dbt profiles.yml committed with the warehouse password "so reviewers can run it straight away". What should he do?', [
        ['Rotate the password, purge the file from history, and read credentials from environment variables', true],
        ['Leave it, since the lab warehouse holds only generated data and no reviewer would misuse the access', false],
        ['Rename it to profiles.example.yml with the same contents, so dbt ignores it but reviewers can still copy it', false],
        ['Make the repository private until placements end, then switch it back to public once he has an offer', false],
      ], 'A committed password is exposed the moment it is pushed: it lives in history and every clone, so it must be rotated and the file purged; dbt profiles can read env_var() instead. Renaming or hiding the repository for a while leaves the same secret where it was.'),
      mcq('A GCC job description lists "Snowflake, Informatica, Airflow, Python". Shruti built her warehouse layer in dbt on DuckDB and has never used Informatica. How should her skills line handle it?', [
        ['List dbt, DuckDB and Airflow with what she built, and map them to Snowflake aloud in the interview', true],
        ['Add Snowflake and Informatica, since the recruiter\'s keyword filter rejects resumes that lack them', false],
        ['Write "all major ETL and warehouse tools", which matches every filter without naming any one tool', false],
        ['Leave out the warehouse work entirely, since DuckDB looks like a toy next to an enterprise warehouse', false],
      ], 'True tool names with real work behind them survive the technical round, and panels accept that modelling and tests transfer across warehouses. Unused tools fail the first follow-up, catch-all phrases cannot be checked, and hiding the work throws away her strongest evidence.'),
      mcq('Which README line gives a data-engineering reviewer the most checkable evidence about Haatly\'s daily run?', [
        ['A sample day\'s rows per layer, tests passed, finish time against the 07:00 target, and the machine used', true],
        ['"The pipeline is fast, reliable and production-grade, built on modern lakehouse best practices"', false],
        ['A screenshot of the orchestrator\'s UI with every task in green on the final day before submission', false],
        ['"Processes big data at scale", with a link to the Delta Lake documentation page on performance', false],
      ], 'Volume, test results, freshness against a target and the machine are numbers a reviewer can recount from the run log. Adjectives, one green screenshot or the vendor\'s documentation say nothing about how this pipeline behaves.'),
    ],
    checkpoint: [
      ck(PR, 'Vikram\'s bullet says "Built scalable ETL pipelines using Spark and AWS for big data". Which rewrite would a data-platform lead trust most?', [
        ['The source and method in one line, plus the rows, run time and a rerun that changed nothing', true],
        ['The same bullet with "scalable" replaced by "enterprise-grade", which reads as more senior to a panel', false],
        ['Every AWS and Apache tool he has heard of, so the bullet matches as many recruiter filters as possible', false],
        ['"Passionate big-data enthusiast with hands-on exposure to the modern data stack" in place of the bullet', false],
      ], 'A credible bullet names what was built, how it is safe and numbers someone can check. Swapping buzzwords, piling on tool names or adding adjectives gives the panel nothing to probe and nothing to believe.'),
      ck(PE, 'Which item best backs Ananya\'s bullet "Reruns are safe: loading a day twice leaves row counts unchanged"?', [
        ['A test that loads one day twice and asserts the counts, plus the run log showing it passing', true],
        ['A sentence in the README saying the loads were carefully designed with idempotency in mind', false],
        ['A screenshot of the lake folder after the final run, showing exactly one Parquet file per day', false],
        ['A certificate from an online course on data engineering whose syllabus covered idempotency', false],
      ], 'The claim is about behaviour when a load repeats, so the evidence must repeat a load and check the result. A sentence, a folder listing taken once or a course certificate shows nothing about what her pipeline does on a second run.'),
      ck(PE, 'Rohan did his best pipeline work in an internship at an insurance GCC. A recruiter asks to see the code. What should he share?', [
        ['The same pattern rebuilt on generated data in his own repository, and the internship described in general terms', true],
        ['The internship DAGs and SQL with the company and table names replaced, since the logic itself is generic', false],
        ['The full internship repository, since recruiters must keep candidate material confidential by law', false],
        ['Screenshots of the internal dashboards his pipeline fed, with customer names blurred out beforehand', false],
      ], 'Internship code, schemas and dashboards belong to the employer, and renaming or blurring still leaks them. Rebuilding the pattern on generated data shows the same skill honestly, and describing the work in general terms is allowed.'),
    ],
  },

  /* ── CERTIFICATIONS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_PLACE_CANDIDATE_CERTIFICATIONS',
    notes: `Data engineering job descriptions in India name certifications less often than cloud roles but more often than
general software roles — especially at IT services firms, consultancies and GCCs, which are cloud or platform
partners and must show certified staff. This unit covers what each common data certification proves, who asks for
it, a sensible order for someone who has finished this track, and the data career paths. **Exam names, codes,
prices, passing scores, question counts, durations and renewal rules change, and exams are retired and replaced** —
read the official AWS Certification, Microsoft Learn, Databricks and Snowflake pages before you book anything, and
do not trust a number from a forum or a training institute's advertisement.

## What a certification proves — and what it does not

A certification proves you passed an exam on a defined body of knowledge on a given date. It does **not** prove you
can find why yesterday's revenue doubled, which is why the panel asks about your capstone regardless. Certifications
help in three ways: they get a resume past a filter that names them; they help an employer's business (partners of
AWS, Microsoft, Databricks and Snowflake must show certified people, so services firms count them); and they give a
structured syllabus for a platform you have not used much. This track gave you the concepts; a certification maps
them onto one vendor's services and names.

## The certifications in a data engineer's world

| Certification | Body | What it proves | Who tends to ask |
|---|---|---|---|
| AWS Certified Data Engineer – Associate | AWS | Ingestion and transformation, data store choice and management, operating and monitoring pipelines, and security and governance on AWS (S3, Glue, Athena, Redshift, Kinesis, EMR, Lake Formation and friends) | AWS-heavy GCCs, product companies on AWS, AWS partners |
| Microsoft's data engineer certification | Microsoft | Microsoft retired the Azure Data Engineer Associate exam (DP-203) in 2025; its data engineer certification is now the Fabric Data Engineer Associate. Ingesting, transforming and securing data and running pipelines on Microsoft's analytics platform | Microsoft-stack GCCs, services firms, Azure partners |
| Databricks Certified Data Engineer Associate | Databricks | The lakehouse on Databricks: Spark SQL and PySpark ETL, Delta Lake, incremental processing, production jobs and pipelines, and Unity Catalog governance | Databricks-heavy GCCs and consultancies; often named alongside Azure or AWS |
| Databricks Certified Data Engineer Professional | Databricks | Advanced pipeline design, optimisation, testing and deployment on Databricks | Later, with experience |
| SnowPro Core | Snowflake | Snowflake's architecture: storage and compute separation, virtual warehouses, loading and unloading, performance, data sharing, access control | Snowflake partners and the companies that run Snowflake |
| SnowPro Advanced: Data Engineer | Snowflake | Designing and running data pipelines on Snowflake in depth; it requires SnowPro Core first | Later, with Snowflake work behind you |

Fundamentals exams — AWS Cloud Practitioner, Microsoft's Azure Data Fundamentals (DP-900) — exist too, as do the
Google Cloud Professional Data Engineer and the dbt Analytics Engineering certification. Check each one's current
name and status on its official page; the table above is the shape, not a booking guide.

Notes that matter when choosing:

- **Pick the platform your target employers run.** The concepts are the same — lake, warehouse, Spark, orchestration,
  governance — but each exam tests one vendor's names and defaults. Count what your target postings name.
- **AWS Data Engineer – Associate fits this track best if you target AWS.** Your Cloud Data Stack lessons (S3, IAM,
  Glue catalogue, Athena) are a start on its syllabus, not all of it: Redshift, Kinesis and EMR operations, Lake
  Formation and the monitoring services need their own study on AWS Skill Builder.
- **Microsoft: read the current page first.** Because DP-203 was retired, older blogs and course adverts still
  recommend it. A certification you already hold stays on your record until its expiry; you cannot newly earn a
  retired one. Fundamentals certifications do not expire; associate-level Microsoft certifications are kept current
  through a free online renewal assessment — check the current rule on Microsoft Learn.
- **Databricks Associate rewards Spark and Delta depth**, which this track gave you. Databricks Academy publishes
  free self-paced learning; the exam asks about Databricks-specific features you only meet on the platform, so use a
  trial or community workspace, not just your local PySpark.
- **SnowPro Core is the gate to Snowflake's advanced exams.** It is worth it when your target employers run
  Snowflake; otherwise it is a vendor syllabus you will not use.
- **Not yet:** the Professional and Advanced levels. They are designed for people with real work experience; aim at
  them after a year or two in the job, often with employer support.
- A course-completion badge or a free "accreditation" from a learning portal is **not** a proctored certification,
  and your resume must say which one you hold. A certification carries its **credential ID or verification link**;
  "exam booked for March" is honest and acceptable; "certified" before you pass is not.

## A sensible order for this track's graduate

| Your target | First | Then | Later, with experience |
|---|---|---|---|
| AWS-based data engineer | AWS Data Engineer – Associate | Databricks Associate if postings name Databricks | A professional or specialty-level exam |
| Azure / Microsoft-stack GCC | Microsoft's current data engineer certification (DP-900 optional before it) | Databricks Associate (Azure Databricks is common) | The vendor's next level |
| Databricks-heavy team or consultancy | Databricks Data Engineer Associate | The cloud's data engineer associate | Databricks Professional |
| Snowflake shop or partner | SnowPro Core | SnowPro Advanced: Data Engineer, once you have used it | — |
| IT services mass hiring | Whatever the employer names (often a fundamentals exam) | The matching associate | Whatever the first project needs |

One certification at a time, **applying in parallel**. The order comes from counting what your own target JDs name.

## Data careers in India

| Role | What the job is | What gets you there |
|---|---|---|
| Data engineer (trainee / associate) | Build and run ingestion, transformation and warehouse loads | SQL, Python, Spark or dbt, one cloud, the capstone |
| ETL / pipeline support engineer | Monitor scheduled jobs, rerun and fix failures, handle data tickets; common first role at services firms | SQL, scheduling, Linux, calm methodical debugging |
| Analytics engineer | Own the modelled layer: dbt models, tests, metrics definitions, documentation | SQL depth, modelling, dbt, talking to analysts |
| Big data / Spark engineer | Large Spark jobs on Databricks, EMR or Synapse; tuning and cost | PySpark depth, partitioning, skew, the Spark UI |
| Data platform engineer | The platform others build on: orchestration, catalogues, access, CI, infrastructure as code | Engineering depth, Docker, cloud, automation |
| Streaming engineer | Event pipelines on Kafka or Kinesis, low-latency features | Streaming concepts, distributed systems, usually after a first role |
| BI developer / data analyst | Dashboards and reporting on the modelled data | SQL, a BI tool, business sense — a different path, not a lesser one |
| Data architect | Designing the estate across teams | Years of building first — not a fresher role |

Titles are inconsistent — "big data engineer" at one company is "data engineer" at another, and some "data engineer"
roles are mostly report building — so read the responsibilities, not the title. A common path is two to three years
as a data engineer or analytics engineer, then towards platform, streaming, ML data engineering or architecture.

## Choosing a first role

| Employer | What you get | What it costs you |
|---|---|---|
| Product company | Ownership, real data volumes, strong code review | Few entry openings, a high SQL and coding bar |
| GCC | Mature platforms, process, structured training | Narrower scope at first; hours sometimes aligned to another time zone |
| IT services or analytics consultancy | Training, a certification push, many domains | You may start on support or a non-data project; bonds and service agreements are common |
| Startup | Breadth: you own every pipeline | Little mentoring; you may be the only data person |

Ask in every interview: what the first six months of work are, whether juniors write pipeline and model changes that
reach production (with review), who is called when a nightly job fails, how training and certification are
supported, and any bond or service agreement. Six months of rerunning failed jobs without fixing causes teaches less
than one month of reviewed changes.`,
    workedExample: `**Choosing a certification and a first role — two candidates, the same question.** Both finished the track and the
Haatly capstone. Both ask: "Which certification should I do first?"

**Divya** wants a data engineer role in Hyderabad. Her shortlist of twenty postings (GCCs, two consultancies, a few
product companies) names: Databricks in nine, Azure data services in eight, AWS Glue or Redshift in six, Snowflake
in four; a specific certification in seven, mostly Microsoft's or Databricks'. Both consultancies say they are
Databricks partners.

A weak plan: "Cloud Practitioner, then Azure Data Fundamentals, then the AWS and Microsoft associates, then
Databricks and SnowPro, and only then apply." That is many months and several exam fees before one application,
for four vendors when her postings cluster around two.

A strong plan, written out:

    Goal:          data engineer at a GCC or consultancy in Hyderabad, applying from this month
    Evidence now:  Haatly repo (ingestion, PySpark silver, dbt with tests, Delta, schedule, S3 + Athena), resume rewritten
    First:         Databricks Data Engineer Associate — named in 9 of 20; matches my Spark and Delta work
    Second:        Microsoft's current data engineer certification, if an Azure-first offer or project needs it
    Not now:       fundamentals exams (I know the syllabus), SnowPro (4 of 20, and I have not used Snowflake)
    Apply:         now, in parallel — "Databricks Data Engineer Associate, exam booked" is honest
    Before booking: read the current exam guide on the official page; practise in a Databricks workspace

**Aman** wants an analytics engineer or data engineer role at a Bengaluru product company. His shortlist rarely
names a certification; it names SQL, Python, dbt, Airflow, a warehouse and "ownership". A certification is not his
bottleneck: the depth of his SQL and design answers is. His plan: deepen the capstone (an incremental dbt model
that survives late rows, a second broken-data drill, better docs), practise the SQL and pipeline-design rounds, and
take the AWS Data Engineer – Associate later only if the AWS-heavy teams he meets ask for it.

**What the two plans share.** Each starts from real job descriptions, not a forum list; each counts what the target
employers name; each applies while studying; and each can say in one sentence why this certification and not the
others. That sentence is the answer to "Why did you choose this certification?"`,
    mcqs: [
      mcq('Sameer finished this track and targets data engineer roles at AWS-heavy GCCs. Which first certification fits him best?', [
        ['AWS Certified Data Engineer – Associate, the data exam on the cloud his postings name', true],
        ['SnowPro Core, because every warehouse role in India now filters on a Snowflake credential', false],
        ['A professional-level exam, so that his resume stands above every other fresher in the pile', false],
        ['Azure Data Fundamentals, since a fundamentals exam on any cloud counts the same at a GCC', false],
      ], 'The associate matches both his target cloud and the data work he did. Snowflake is named only by teams that run it, professional exams are designed for experienced engineers, and an Azure fundamentals exam does not answer an AWS data filter.'),
      mcq('A training institute\'s advert tells Lavanya to book the Azure Data Engineer Associate exam (DP-203) for her Azure-first targets. What should she do first?', [
        ['Check Microsoft Learn, since DP-203 was retired and its current data engineer exam replaced it', true],
        ['Book it at once, because an older exam code is easier to pass and counts the same with employers', false],
        ['Skip Microsoft certifications entirely, because a retired exam means Azure data roles are gone', false],
        ['Ask the institute for a DP-203 voucher, since vouchers keep a retired exam open for a year or two', false],
      ], 'Exams are retired and replaced, and adverts lag behind, so the official page is the source of truth. A retired exam cannot be newly earned, Azure data roles certainly still exist, and an institute voucher does not reopen an exam Microsoft has closed.'),
      mcq('Why does the Databricks Data Engineer Associate suit a graduate of this track more naturally than SnowPro Core?', [
        ['Its syllabus centres on Spark and Delta Lake, which the track taught in depth', true],
        ['Databricks exams are open-book, so anyone who knows PySpark can pass without any extra preparation', false],
        ['SnowPro Core requires two years of paid Snowflake work, which no fresher can show at the booking stage', false],
        ['Databricks certifications never expire, so the credential stays valid for the whole of her career', false],
      ], 'The fit comes from the syllabus overlap with what she built, though she still needs the Databricks-specific features. Claims about open-book exams, a work-experience rule or lifelong validity are not things to assume — read the official exam guide.'),
    ],
    checkpoint: [
      ck(PR, 'Manoj has finished the track and wants a data engineer role. Which certification plan is strongest?', [
        ['Count what his target postings name, book the most-named one, and apply while he prepares', true],
        ['Pass the AWS, Microsoft, Databricks and Snowflake exams before sending a single application', false],
        ['Skip certifications entirely, since a strong capstone replaces them in every employer\'s filter', false],
        ['Start with a professional-level exam, so every associate exam after it seems easy by comparison', false],
      ], 'A plan driven by his own postings fixes the real filter problem while the capstone carries the interview, and applying in parallel loses no time. Collecting four vendors delays everything, some filters really do name one, and professional exams assume work experience.'),
      ck(PR, 'Two offers: an IT services firm where Neha would start on night-batch support, and a startup where she would build pipelines alone. She wants to become a data platform engineer. What should decide it?', [
        ['Which role has her writing reviewed pipeline changes that reach production in her first year', true],
        ['Always the startup, because only startups let freshers touch real production data pipelines', false],
        ['Always the services firm, because platform roles are open only to those who served a bond first', false],
        ['Whichever pays more, because the kind of employer makes no difference on a data platform path', false],
      ], 'Platform skill grows from building and changing real systems with feedback, so the deciding facts are the work and the review. Either "always" rule ignores the specifics of each offer, and pay alone says nothing about what the first years teach.'),
      ck(PR, 'In an interview Farah is asked, "Why Databricks and not the AWS data exam?" Which answer is strongest?', [
        ['Most of her target postings name Databricks, and it builds on the Spark and Delta work in her capstone', true],
        ['The AWS exam is worthless now and nobody in Indian data hiring takes it seriously any more', false],
        ['Databricks was the only exam her college placement cell was offering vouchers for that term', false],
        ['Her seniors said the Databricks exam is the easiest data certification to pass, so she chose it', false],
      ], 'A strong answer gives reasons tied to her goal and her evidence. Dismissing a credential the panel may hold, or pointing to vouchers or friends, shows no judgement of her own.'),
    ],
  },

  /* ── MOCK_LOOP ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_PLACE_CANDIDATE_MOCK_LOOP',
    notes: `One complete interview day for an **entry data engineer** role in India — the shape most product companies, GCCs and
the stronger services and consultancy teams use. Pay varies widely by city, employer and role; check current
figures for each company rather than trusting a forum. Run it with a friend or mentor as interviewer, in one day,
with real timers. The question banks are the other placement topics: Data Engineer Interview Questions for round 1,
Data Engineering Scenario Rounds for rounds 2 and 3. Your evidence in every round is your capstone.

## Round 0 — Online assessment (75–90 min, proctored)

| Section | Time | What it is |
|---|---|---|
| Aptitude | 20 min | quant, logical, reading comprehension |
| SQL | 30 min | one or two queries over a small schema, run against hidden data |
| Python | 25 min | a data-handling function with hidden tests |

**SQL sample.** "\`payment_events(txn_id, merchant_id, status, amount, event_ts)\` holds every status event of a UPI
payment: PENDING, then SUCCESS or FAILED; a failed payment may be retried and succeed; the feed sometimes delivers
the same event twice. For each merchant, report transactions, how many succeeded, the successful amount, the failed
percentage and how many are still pending — by each transaction's **latest** status — highest successful amount
first."

    WITH dedup AS (
      SELECT DISTINCT txn_id, merchant_id, status, amount, event_ts FROM payment_events
    ),
    latest AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY txn_id ORDER BY event_ts DESC) AS rn
      FROM dedup
    )
    SELECT merchant_id,
           COUNT(*) AS txns,
           SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) AS succeeded,
           SUM(CASE WHEN status = 'SUCCESS' THEN amount ELSE 0 END) AS success_amount,
           ROUND(100.0 * SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) / COUNT(*), 1) AS failed_pct,
           SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS still_pending
    FROM latest
    WHERE rn = 1
    GROUP BY merchant_id
    ORDER BY success_amount DESC, merchant_id;

On a 13-row sample (two merchants, six transactions, one duplicated SUCCESS event, one payment that failed and was
retried to success, one left pending) it returns, in DuckDB and SQLite alike:

    merchant_id  txns  succeeded  success_amount  failed_pct  still_pending
    M_BOOKS         3          2          750.00         0.0              1
    M_CHAI          3          2          180.00        33.3              0

The naive \`SUM(amount) WHERE status = 'SUCCESS'\` straight over the events returns M_CHAI 300.00 with "7
transactions" — the duplicated event counted twice and events counted as payments. The traps: **dedupe before
counting, count transactions not events, and use the latest status** (a solution that marks any transaction with a
FAILED event as failed calls M_BOOKS' retried payment a failure). Say aloud the question you would ask: what if two
events of one transaction share a timestamp? (Then add a tie-breaker such as an event sequence number.)

**Python sample.** "Given a lake folder's partition names (\`dt=YYYY-MM-DD\`, plus junk such as \`_SUCCESS\`, possibly
duplicated) and a date range, return the missing dates as collapsed ranges." Build a set of the dates present, walk
the range a day at a time, and open or close a run at each gap. For partitions 1, 2, 2, 5, 6 and 9 October checked
over 1–10 October, a correct solution printed:

    2026-10-03 .. 2026-10-04 (2 days)
    2026-10-07 .. 2026-10-08 (2 days)
    2026-10-10 (1 day)

**Scored on:** hidden tests — an empty folder (one range covering everything), a range of one day that is present
(an empty list), junk names, duplicates, a gap at the very end. In the interview, say what it is for: a freshness
and completeness check that tells you which days to backfill.

## Round 1 — Technical (45 min)

Six or seven questions across SQL, modelling, pipelines, Spark and the cloud, for example: "What is the grain of
your fact table, and what breaks if you join a dimension at the wrong grain?", "How do you make a daily load safe to
rerun?", "What causes a shuffle, and how did you fix a skewed join?", "Type 1 or Type 2 for a seller's city — why?",
"Parquet or CSV in the lake, and what does partitioning by date buy an Athena query?", "Your capstone in three
minutes."

**Scored on:** correct, explained plainly, honest at the edge of knowledge, connected to something you built.

## Round 2 — Pipeline design (45 min)

"A food-delivery app wants an hourly dashboard of orders, cancellations and delivery times by city, and finance
needs exact daily totals that match the payment gateway. Design it." Clarify (sources, volume, how fresh, who reads
it, what must be exact), estimate (orders a day, bytes a day), propose (CDC or incremental extract into a raw layer,
cleaned and deduplicated silver, a fact at order grain, an hourly incremental model and a separate reconciled daily
finance model), plan the failures (late events, reruns, a source schema change, a backfill), then quality checks and
the cost shape. Name what you would leave out ("no streaming: hourly freshness does not need it").

**Scored on:** requirements first, the grain stated, numbers, idempotent loads, honest trade-offs, cost awareness.

## Round 3 — Hiring manager: the broken pipeline (30 min)

"Yesterday's revenue on the dashboard is double the usual. Walk me through it." A strong candidate states the method
before guessing: is it real or a data fault (compare against the source system's total), what changed (a deploy, a
backfill, a rerun, a source change), then checks in order — row counts per layer for that day, duplicate keys in
the fact, whether a rerun appended instead of replacing the partition, a join that fanned out after a dimension
gained a second current row. Then the fix, the backfill, and the guard (a uniqueness test, an idempotent load, a
volume check that would have alerted). Variants: a job that ran four hours instead of forty minutes, a night where
the source file never arrived, a dbt test failing after an upstream column was renamed.

Then the people questions: "You reran a backfill on the production tables by mistake. What do you do?" → stop, tell
the team at once, help restore (table history, snapshots or a re-run from bronze), then write a blameless note and a
guard — never hide it. "Who would you tell if finance's numbers were wrong for a week?"

**Scored on:** a hypothesis before each query, reading results aloud, narrowing in order, ownership.

## Round 4 — HR (15 min)

"Are you comfortable supporting jobs that fail at night?", "Relocation and the service agreement?", "Expected CTC?"
— honest and consistent with your resume. Ask your own questions: the first six months, code review, who is on call
for pipelines, certification support.

## Scoring sheet (1–4 per row)

| Row | 1 | 4 |
|---|---|---|
| SQL and coding | Wrong grain, duplicates missed | Correct, deduplicated, edge cases named |
| Modelling | No grain stated | Grain, keys and history choices justified |
| Pipeline thinking | "Run it again" | Idempotent loads, late data, backfills, checks |
| Evidence | "It should scale" | Measured rows, run times and freshness from the capstone, labelled lab |
| Communication | Rambling or jargon | Clear enough for an analyst to act on |
| Integrity | Bluffs, hides mistakes | "I don't know — here is how I'd find out"; owns errors |

## Debrief template (fill within an hour)

    Round / interviewer role:
    Questions asked, verbatim:
    Answered well — why:
    Weak or blank — the question + what a strong answer contains:
    Facts I could not recall (syntax, Spark behaviour, service names):
    Fix before the next loop (max 3, each with a date):`,
    mcqs: [
      mcq('In the round-0 SQL problem, transaction T6 went PENDING, then FAILED, then SUCCESS after a retry. How should a correct solution count it?', [
        ['As one successful transaction, because its latest status is SUCCESS', true],
        ['As one failed transaction, because any FAILED event marks the payment failed', false],
        ['As three transactions, one for each event the feed delivered for T6', false],
        ['As two transactions, one failed and one successful, since it was retried', false],
      ], 'The task asks for each transaction\'s latest status, and T6 ended in SUCCESS, so it is one success. Treating any FAILED event as final, or counting events or attempts as transactions, are exactly the traps the hidden tests check.'),
      mcq('Why did the naive query report M_CHAI\'s successful amount as 300.00 instead of 180.00?', [
        ['A SUCCESS event was delivered twice, and the query summed events without deduplicating', true],
        ['DuckDB rounds DECIMAL amounts upward when a SUM runs over a window function partition', false],
        ['The PENDING events also carried amounts, and the naive query added every status together', false],
        ['The retried payment from M_BOOKS was attributed to M_CHAI because their timestamps overlap', false],
      ], 'T1\'s SUCCESS event appeared twice, so 120 was added twice: 120 + 120 + 60 = 300. The naive query filtered on SUCCESS, so PENDING amounts were not added, DECIMAL sums are exact, and rows keep their own merchant_id.'),
      mcq('Round 2: designing an hourly city dashboard plus exact daily finance totals. What should Gaurav do before drawing any boxes?', [
        ['Clarify sources, freshness and what must be exact, then state the grain and estimate volume', true],
        ['Pick Kafka and Spark Structured Streaming, so any freshness the panel adds later is covered', false],
        ['Ask for the cloud budget in rupees and refuse to design anything until a number is given', false],
        ['Draw the full lakehouse with every layer and tool he knows, since panels reward completeness', false],
      ], 'Requirements, grain and numbers come first: hourly freshness does not need streaming, and exact finance totals need a reconciled model. Choosing the heaviest stack or drawing everything shows no judgement, and a design round expects stated assumptions rather than a refusal.'),
      mcq('Round 3: "yesterday\'s revenue is double". Which first step scores best?', [
        ['Check whether it is real against the source total, then ask what changed: a rerun, deploy or backfill', true],
        ['Rerun yesterday\'s whole pipeline at once, since a fresh run usually fixes a bad number', false],
        ['Add DISTINCT to the dashboard query so the duplicated rows disappear from the chart', false],
        ['Tell the business the dashboard is fine, because doubling usually means a big sale day', false],
      ], 'The method is to establish whether the number is wrong, then follow what changed. A blind rerun may append again and destroys evidence, DISTINCT on the dashboard hides the fault instead of fixing the load, and assuming a sale day skips the check entirely.'),
      mcq('After the mock day, Ritika\'s debrief says "SQL round went badly". Which rewrite is most useful?', [
        ['"Counted events, not transactions, and forgot to dedupe; do three latest-status drills by 14 Nov"', true],
        ['"SQL round went badly; I will revise every SQL topic of all four years over the next month"', false],
        ['"The problem was far harder than anything a fresher data engineer would ever meet at work"', false],
        ['"I was nervous in the SQL round, so I must try to stay much calmer in the next interviews"', false],
      ], 'A useful debrief names the exact gap and a dated fix. Revising everything, blaming the problem or noting nerves gives nothing specific to practise before the next loop.'),
    ],
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_PLACE_CANDIDATE_CHECKPOINT',
    notes: `This checkpoint measures the judgement a data hiring panel looks for: a resume whose every claim has evidence behind
it, a portfolio that runs and leaks nothing, certifications chosen for a reason, and method and honesty across the
interview day.

Recall the rules of this topic:
- **Every claim is checkable** — rows, freshness, run time and cost from a log, a test, a recording, a credential ID.
- **Nothing published that should not be** — no credentials, real personal data, employer work or bulk data.
- **Method before answers**, and mistakes owned out loud.

Each question is a scenario. Pick what a strong candidate would actually do.`,
    checkpoint: [
      ck(PR, 'Sanjay\'s skills line reads "Hadoop, Hive, Pig, Spark, Kafka, Flink, Airflow, Snowflake, Databricks". He used Spark, Airflow and a little Databricks. What should he do?', [
        ['Cut it to what he used, grouped by area, each item something he can defend for ten minutes', true],
        ['Keep the list, because a long line of tools shows the breadth a data engineering role wants', false],
        ['Add more tools, because recruiters match keywords and the longest line wins the first filter', false],
        ['Keep the list but mark the unused tools "familiar", so that nobody can later call them false', false],
      ], 'Every item on the line becomes a technical question; unused tools fail the first follow-up and cost trust in the rest. "Familiar" is still a claim he cannot back, and breadth without depth is not what panels reward.'),
      ck(PR, 'A GCC JD says "Databricks Data Engineer Associate preferred". Isha has the capstone and her exam is booked for next month. How should her resume show it?', [
        ['"Databricks Data Engineer Associate (exam booked, month)", with the capstone leading', true],
        ['"Databricks certified", because she expects to have passed by the time anyone checks', false],
        ['Nothing about it, because an unfinished certification counts against a fresh candidate', false],
        ['"Databricks Associate equivalent", since her capstone already covers its whole syllabus', false],
      ], 'True status is honest and still answers a "preferred" line; claiming a pass in advance fails background verification. Hiding it wastes a relevant signal, and "equivalent" is a claim nobody can check.'),
      ck(PR, 'Arvind has offers from a GCC data platform team and a services firm where he would monitor and rerun failed batch jobs on shifts. He wants to design pipelines. Which question matters most?', [
        ['Whether he will write and ship reviewed pipeline and model changes in his first year', true],
        ['Which office is nearer his flat, since commuting time matters a lot on rotating shifts', false],
        ['Which company has more LinkedIn followers, since a known brand helps the next switch', false],
        ['Which offer carries the more senior-sounding title, since titles set his next job level', false],
      ], 'His goal is pipeline design, so the deciding fact is whether the first year builds that skill with feedback. Commute, brand and title matter less than the work he will actually do.'),
      ck(PE, 'Which file should NOT be in Haritha\'s public data-platform repository?', [
        ['A CSV of 50,000 real customers\' names and phone numbers, "for realistic testing"', true],
        ['The synthetic-data generator with a fixed seed, so a reviewer gets the same data', false],
        ['DECISIONS.md, listing each lab shortcut beside the choice production would make', false],
        ['A pytest test that loads one day twice and asserts the row counts do not change', false],
      ], 'Real personal data in a public repository is a privacy breach, and India\'s DPDP Act applies to it; generated data does the job without the risk. The generator, honest trade-offs and the rerun test are exactly what reviewers want.'),
      ck(PE, 'Prakash\'s README claims "bad data never reaches gold". What makes this claim checkable?', [
        ['A recorded drill where a broken feed fails a dbt test and gold is not published', true],
        ['A README sentence saying the pipeline has many tests and the data was always clean in practice', false],
        ['A screenshot of the dbt docs site showing the lineage graph from bronze through to gold tables', false],
        ['A link to the dbt documentation page that explains how tests and the build command behave', false],
      ], 'The claim is about behaviour when data is bad, so the evidence must show bad data stopped, plus the code that stops it. A sentence, a lineage picture or the vendor\'s documentation shows nothing about his pipeline under failure.'),
      ck(PE, 'Nikita\'s cost note says "the AWS part cost almost nothing". How should she make the claim checkable without quoting prices from a blog?', [
        ['Cost by service from her own bill for the lab weeks, what drove it, and a labelled estimate', true],
        ['A list of free-tier limits copied from a blog post, since all her usage stayed inside them', false],
        ['A promise that she deleted the buckets after the demo, so the bill could not have been large', false],
        ['Each service\'s price from a 2023 article multiplied by how many services the platform used', false],
      ], 'Figures from her own billing data, with what drove them and a labelled estimate, can be checked. Copied limits, promises and stale prices describe someone else\'s bill, not hers.'),
      ck(IP, 'In round 1 Tarun is asked how Delta Lake handles two writers committing at once, and he is unsure of the detail. What should he do?', [
        ['Say what he knows, name the gap, say where he would check it, and explain why it matters', true],
        ['Give a confident, detailed answer anyway, because pausing looks under-prepared to a panel', false],
        ['Say concurrent writes never happen in real pipelines, so the question does not matter much', false],
        ['Steer the answer to his dbt work, where he is far more confident than he is with Delta Lake', false],
      ], 'Panels score honesty at the edge of knowledge; a confident wrong answer is worse than a named gap. Concurrent writers do happen (a backfill beside the daily run), and dodging leaves the gap where the panel can see it.'),
      ck(IP, 'In the broken-pipeline round, the interviewer adds: "Row counts per layer for that day are normal." How should Bhavana change her plan?', [
        ['Drop the duplicate-load theory and look at values and joins: a fan-out, a unit change, a currency bug', true],
        ['Keep checking for duplicate loads, since changing course now would look indecisive to the panel', false],
        ['Declare the dashboard tool faulty and propose replacing it, since the data counts are all normal', false],
        ['Ask the interviewer to name the broken component, so that she can move straight to the fix', false],
      ], 'New evidence should narrow the search: normal counts point at values or at a join that multiplies amounts downstream. Sticking to a disproved theory, blaming the tool without evidence or handing the question back all fail the method being tested.'),
      ck(IP, 'A panellist asks Yash: "Your capstone loads orders daily. Why not stream them?" Which answer is strongest?', [
        ['The consumers need data by 07:00, so a daily batch meets it with less cost and fewer moving parts', true],
        ['Streaming does not work with Delta Lake, so a daily batch was the only option open to him', false],
        ['Kafka is limited to small volumes, so the order feed was too large for streaming to handle', false],
        ['Batch is always more accurate than streaming, since streaming systems drop a share of events', false],
      ], 'The design follows the freshness the consumers need, and streaming adds cost and operational work without a need. Delta Lake supports streaming writes, Kafka handles very large volumes, and well-built streaming pipelines do not lose events by design.'),
      ck(IP, 'In the HR round, Pallavi is asked: "Are you comfortable supporting jobs that fail at night?" She has never done it but is willing. What is the best answer?', [
        ['Say yes honestly, mention her backfill and broken-feed drills, and ask how the rota works', true],
        ['Say she loves night support, because any hesitation at this stage will cost her the offer', false],
        ['Say she cannot do it at all, and hope the team makes an exception for her after she joins', false],
        ['Avoid the question and talk about her capstone instead, so that the topic quietly drops', false],
      ], 'An honest yes backed by relevant practice, plus a question about the rota, builds trust. Overstating enthusiasm, refusing and hoping for an exception, or dodging all create problems after joining.'),
    ],
  },
];
