import { TopicSeed } from './year1MegaCurriculum';
import { u } from './year4UnitKit';
import { ending } from './trackUnitsWeb';
import { interview } from './trackUnitsPlacement';

/**
 * Career-track content for Data Engineer — building the pipelines, models and platforms that analysts,
 * data scientists and products read from. The track stands on Core Python, Git, the years' SQL and
 * database lessons, pandas and cleaning from the Data Analytics track, and the years' Linux and Docker
 * (packs CORE_PYTHON, GIT_TOOLS, SQL_ANALYTICS, DE_YEAR_BASICS); these topics add what a data engineer
 * does at work: model data, ingest it reliably, transform it at scale with Spark and dbt, orchestrate and
 * stream it, keep it correct and governed, and run it on AWS (with Azure equivalents).
 *
 * Everything runs on a laptop with open-source tools (DuckDB, PySpark in local mode, dbt with DuckDB,
 * Delta Lake, Prefect/Airflow, a local Kafka-compatible broker where one is available), with the cloud
 * services taught on the AWS Free Tier / an Azure free account and a budget alarm set first. Skills are
 * the DATA domain of the role catalogue (aiDataSecuritySkills.ts).
 */

/** Batch DE1: foundations — data modelling, Python ingestion, SQL for engineers. */
export const TRACK_DE_FOUNDATIONS: Record<string, TopicSeed> = {
  /* ── Data modelling ── */
  DE_DATA_MODELLING: { category: 'UNIVERSAL', units: [
    u('OLTP_VS_OLAP', 'Operational and Analytical Data', 'Why the database an app writes to is the wrong shape for analysis: OLTP versus OLAP, row and column stores, and where a data engineer sits between them.',
      ['Explain why analytical data is modelled and stored differently from operational data'], 35),
    u('NORMALISATION_REVISITED', 'Normalisation and When to Break It', 'The normal forms from the years, revisited for engineers: what they protect, what they cost in joins, and when denormalising is the right call.',
      ['Decide when to normalise and when to denormalise a data model, and say what each costs'], 35, { after: ['OLTP_VS_OLAP'] }),
    u('DIMENSIONAL_MODELLING', 'Dimensional Modelling: Facts, Dimensions and the Star Schema', 'The grain of a fact table, additive and semi-additive measures, conformed dimensions, surrogate keys, and star versus snowflake.',
      ['Design a star schema for a business process starting from its grain'], 45, { after: ['NORMALISATION_REVISITED'] }),
    u('SLOWLY_CHANGING', 'Slowly Changing Dimensions', 'Type 1, 2 and 3 changes, effective dates and current flags, and loading a Type 2 dimension correctly.',
      ['Model and load dimensions whose attributes change over time without losing history'], 40, { after: ['DIMENSIONAL_MODELLING'] }),
    u('MODERN_MODELLING', 'One Big Table, Data Vault and Modelling for the Lakehouse', 'Wide denormalised tables, data vault in outline, medallion layers (bronze, silver, gold) and choosing a modelling approach for a team.',
      ['Choose a modelling approach for a team and a platform, and defend the choice'], 35, { after: ['SLOWLY_CHANGING'] }),
    ...ending('Data Modelling', 'MODERN_MODELLING', { project: ['MINI_PROJECT', 'Mini Project — A Warehouse Model for a Food-Delivery Company',
      'For a food-delivery company in Hyderabad: pick the business processes, declare each grain, design the fact and dimension tables (with a Type 2 restaurant dimension), load sample data in DuckDB, and answer five business questions with SQL against your model.'] }),
  ] },

  /* ── Python for ingestion ── */
  DE_PYTHON_INGESTION: { category: 'UNIVERSAL', units: [
    u('FILE_FORMATS', 'Data Formats: CSV, JSON, Parquet and Avro', 'What each format is good and bad at, schemas and types, compression, columnar storage, and why Parquet is the default for analytics.',
      ['Choose a file format for a dataset and convert between formats without losing types'], 40),
    u('API_INGESTION', 'Ingesting from APIs', 'Pagination, rate limits, retries with backoff, authentication, incremental pulls by cursor or timestamp, and landing raw responses untouched.',
      ['Ingest data from a paginated, rate-limited API reliably and incrementally'], 45, { after: ['FILE_FORMATS'] }),
    u('DATABASE_EXTRACTS', 'Extracting from Databases', 'Full versus incremental extracts, watermarks, change data capture in outline, reading in chunks, and not hurting the production database.',
      ['Extract data incrementally from an operational database without overloading it'], 40, { after: ['API_INGESTION'] }),
    u('IDEMPOTENT_LOADS', 'Idempotent, Restartable Loads', 'Why every load must be safe to run twice: partition overwrite, upserts, deduplication keys, run ids and checkpoints.',
      ['Write loads that give the same result however many times they run'], 45, { after: ['DATABASE_EXTRACTS'] }),
    u('PIPELINE_CODE', 'Pipeline Code You Can Trust: Config, Logging and Tests', 'Configuration per environment, structured logging, testing transformations with pytest and fixtures, and packaging a pipeline.',
      ['Structure, log and test pipeline code like production software'], 40, { after: ['IDEMPOTENT_LOADS'] }),
    ...ending('Python for Ingestion', 'PIPELINE_CODE', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── SQL for engineers ── */
  DE_SQL_ENGINEERING: { category: 'UNIVERSAL', units: [
    u('SQL_FOR_PIPELINES', 'SQL as a Pipeline Language', 'CTEs as steps, building tables with CREATE TABLE AS, views versus tables, and writing SQL that someone else can maintain.',
      ['Write multi-step SQL transformations that read like a pipeline'], 40),
    u('UPSERTS_MERGE', 'Upserts with MERGE and INSERT ... ON CONFLICT', 'Insert-or-update in different databases, deduplicating before a merge, and handling deletes.',
      ['Load changed rows into a table with MERGE or an upsert, correctly and once'], 40, { after: ['SQL_FOR_PIPELINES'] }),
    u('PARTITIONING_INDEXES', 'Partitioning, Clustering and Indexes', 'Partitioning by date, partition pruning, clustering and sort keys, indexes in OLTP versus analytics, and how each changes cost.',
      ['Lay out a large table so the common queries read as little data as possible'], 40, { after: ['UPSERTS_MERGE'] }),
    u('QUERY_PLANS', 'Reading Query Plans and Fixing Slow SQL', 'EXPLAIN and EXPLAIN ANALYZE, scans versus seeks, join strategies, spills, and the usual fixes.',
      ['Read a query plan and fix the cause of a slow query'], 45, { after: ['PARTITIONING_INDEXES'] }),
    ...ending('SQL for Data Engineers', 'QUERY_PLANS', { minutes: [40, 50, 35, 40] }),
  ] },
};

/** Batch DE2: processing — Spark, warehouses and lakehouses, dbt. */
export const TRACK_DE_PROCESSING: Record<string, TopicSeed> = {
  /* ── Apache Spark ── */
  DE_SPARK: { category: 'UNIVERSAL', units: [
    u('SPARK_MODEL', 'How Spark Works: Drivers, Executors and Lazy Plans', 'The cluster model, DataFrames, transformations versus actions, lazy evaluation and the query plan, and running Spark locally.',
      ['Explain how Spark turns code into distributed work and run it locally'], 45),
    u('DATAFRAME_API', 'The PySpark DataFrame API', 'Reading and writing data, select, filter, withColumn, groupBy and agg, joins, and Spark SQL on the same data.',
      ['Transform data with the PySpark DataFrame API and Spark SQL'], 45, { after: ['SPARK_MODEL'] }),
    u('PARTITIONS_SHUFFLES', 'Partitions, Shuffles and Joins', 'What a partition is, which operations shuffle, broadcast versus sort-merge joins, and reading the plan for exchanges.',
      ['Predict and reduce shuffles in a Spark job'], 45, { after: ['DATAFRAME_API'] }),
    u('SKEW_TUNING', 'Data Skew, Caching and Tuning', 'Spotting skew, salting and adaptive query execution, caching and when it hurts, file sizes and the small-files problem.',
      ['Diagnose and fix a skewed or slow Spark job'], 45, { after: ['PARTITIONS_SHUFFLES'] }),
    u('SPARK_UDFS_WINDOWS', 'Window Functions, UDFs and Complex Types', 'Windows in Spark, built-in functions before UDFs, pandas UDFs, and arrays, maps and structs from nested JSON.',
      ['Use windows and nested types in Spark, and avoid slow Python UDFs'], 40, { after: ['SKEW_TUNING'] }),
    u('SPARK_IN_PRODUCTION', 'Spark in Production: Jobs, Testing and Platforms', 'Packaging and submitting jobs, testing Spark code, and where Spark runs: EMR, Databricks, Synapse and Fabric in outline.',
      ['Ship a tested Spark job and choose where to run it'], 40, { after: ['SPARK_UDFS_WINDOWS'] }),
    ...ending('Apache Spark', 'SPARK_IN_PRODUCTION', { project: ['MINI_PROJECT', 'Mini Project — A Spark Job for Ride Events',
      'For a ride-hailing company in Bengaluru: process a month of synthetic ride and payment events with PySpark — clean, deduplicate, join, find and fix a skewed join, write partitioned Parquet, and report the run time before and after tuning.'] }),
  ] },

  /* ── Warehouses and lakehouses ── */
  DE_WAREHOUSE_LAKEHOUSE: { category: 'UNIVERSAL', units: [
    u('WAREHOUSE_ARCH', 'Cloud Data Warehouses', 'Columnar storage, separation of storage and compute, Redshift, BigQuery and Snowflake compared, and how they bill.',
      ['Explain how a cloud warehouse stores and queries data and what drives its cost'], 40),
    u('DATA_LAKES', 'Data Lakes and Object Storage', 'A lake on S3 or ADLS, folder and partition layouts, schema on read, and how a lake turns into a swamp.',
      ['Lay out a data lake that stays usable as it grows'], 40, { after: ['WAREHOUSE_ARCH'] }),
    u('TABLE_FORMATS', 'Open Table Formats: Delta Lake and Apache Iceberg', 'ACID on files, the transaction log, time travel, schema evolution, MERGE on a lake, and compaction.',
      ['Use an open table format for reliable updates and history on a lake'], 45, { after: ['DATA_LAKES'] }),
    u('MEDALLION', 'The Lakehouse and Medallion Layers', 'Bronze, silver and gold, what belongs in each, and serving BI and ML from the same platform.',
      ['Design bronze, silver and gold layers for a real data flow'], 40, { after: ['TABLE_FORMATS'] }),
    u('WAREHOUSE_COST', 'Performance and Cost in the Warehouse', 'Partition and cluster choices, materialised views, query cost controls, and finding the expensive queries.',
      ['Cut warehouse cost and query time with evidence'], 35, { after: ['MEDALLION'] }),
    ...ending('Warehouses and Lakehouses', 'WAREHOUSE_COST', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── dbt and ELT ── */
  DE_DBT: { category: 'UNIVERSAL', units: [
    u('ELT_DBT', 'ELT and dbt', 'Why transformation moved into the warehouse, what dbt is, projects, models, ref and source, and running dbt on DuckDB.',
      ['Build a dbt project and explain how ref and source create the lineage'], 45),
    u('DBT_TESTS_DOCS', 'Tests, Documentation and Sources', 'Generic and singular tests, source freshness, documentation and the lineage graph.',
      ['Test and document dbt models so a broken assumption fails the run'], 40, { after: ['ELT_DBT'] }),
    u('DBT_INCREMENTAL', 'Incremental Models and Snapshots', 'Materialisations, incremental strategies, late-arriving data, and snapshots for Type 2 history.',
      ['Build incremental models and snapshots that stay correct as data arrives late'], 45, { after: ['DBT_TESTS_DOCS'] }),
    u('DBT_PROJECT_PRACTICE', 'A dbt Project a Team Can Work In', 'Staging, intermediate and mart layers, naming, macros and Jinja in moderation, packages, and dbt in CI.',
      ['Structure a dbt project and its CI for a team'], 40, { after: ['DBT_INCREMENTAL'] }),
    ...ending('dbt and ELT', 'DBT_PROJECT_PRACTICE', { minutes: [40, 50, 35, 40] }),
  ] },
};

/** Batch DE3: operate — orchestration, streaming, quality and governance, the cloud data stack, capstone. */
export const TRACK_DE_OPERATE: Record<string, TopicSeed> = {
  /* ── Orchestration ── */
  DE_ORCHESTRATION: { category: 'UNIVERSAL', units: [
    u('ORCHESTRATION_WHY', 'Why Pipelines Need an Orchestrator', 'Dependencies, schedules, retries, backfills and visibility — what cron cannot do — and Airflow, Prefect and Dagster compared.',
      ['Explain what an orchestrator adds over scheduled scripts and choose one'], 35),
    u('AIRFLOW_DAGS', 'Airflow DAGs, Tasks and Operators', 'DAGs and tasks, operators and the TaskFlow API, dependencies, schedules and data intervals, and XComs used sparingly.',
      ['Write an Airflow DAG with clear dependencies and a correct schedule'], 45, { after: ['ORCHESTRATION_WHY'] }),
    u('RETRIES_BACKFILLS', 'Retries, Backfills and Idempotent Tasks', 'Retries and timeouts, catchup and backfills, templated dates, and why a task must be safe to re-run for a given interval.',
      ['Backfill a pipeline safely and make every task re-runnable for its interval'], 45, { after: ['AIRFLOW_DAGS'] }),
    u('SENSORS_EVENTS', 'Sensors, Data-Aware Scheduling and Alerts', 'Waiting for data, dataset/asset-triggered DAGs, SLAs and failure alerts, and keeping a DAG from blocking the cluster.',
      ['Trigger pipelines on data rather than time and alert when they fail'], 40, { after: ['RETRIES_BACKFILLS'] }),
    u('PREFECT_DAGSTER', 'Prefect and Dagster in Practice', 'The same pipeline in Prefect flows and Dagster assets, and what each model makes easy or hard.',
      ['Build a flow in Prefect and compare it with Airflow and Dagster'], 35, { after: ['SENSORS_EVENTS'] }),
    ...ending('Orchestration', 'PREFECT_DAGSTER', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── Streaming ── */
  DE_STREAMING: { category: 'UNIVERSAL', units: [
    u('BATCH_VS_STREAM', 'Batch, Micro-batch and Streaming', 'Latency versus cost and complexity, event time versus processing time, and when streaming is worth it.',
      ['Decide whether a use case needs streaming, micro-batch or batch'], 35),
    u('KAFKA_BASICS', 'Apache Kafka: Topics, Partitions and Consumer Groups', 'Brokers, topics and partitions, keys and ordering, offsets, consumer groups and retention.',
      ['Explain how Kafka stores and delivers events and design topics and keys'], 45, { after: ['BATCH_VS_STREAM'] }),
    u('DELIVERY_SEMANTICS', 'Delivery Guarantees and Exactly-Once', 'At-most, at-least and exactly-once, idempotent producers and consumers, and deduplication downstream.',
      ['Design a stream pipeline that neither loses nor double-counts events'], 40, { after: ['KAFKA_BASICS'] }),
    u('STREAM_PROCESSING', 'Stream Processing with Spark Structured Streaming', 'Sources and sinks, windows and watermarks, late data, state, and checkpoints.',
      ['Aggregate a stream by event-time windows with correct handling of late data'], 45, { after: ['DELIVERY_SEMANTICS'] }),
    u('MANAGED_STREAMING', 'Managed Streaming: Kinesis, MSK and Event Hubs', 'AWS Kinesis and MSK, Azure Event Hubs, change data capture with Debezium in outline, and what managed services take off your hands.',
      ['Choose and configure a managed streaming service on AWS or Azure'], 35, { after: ['STREAM_PROCESSING'] }),
    ...ending('Streaming', 'MANAGED_STREAMING', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── Data quality and governance ── */
  DE_QUALITY_GOVERNANCE: { category: 'UNIVERSAL', units: [
    u('QUALITY_DIMENSIONS', 'Data Quality: What Can Go Wrong', 'Completeness, validity, uniqueness, freshness and consistency, and where in a pipeline each is checked.',
      ['Name the ways data goes wrong and place a check for each in a pipeline'], 35),
    u('QUALITY_CHECKS', 'Automated Checks with Pandera, dbt Tests and Great Expectations', 'Schema and value checks in code, contracts at the boundaries, failing loudly versus quarantining bad rows.',
      ['Add automated quality checks that stop bad data before it is published'], 45, { after: ['QUALITY_DIMENSIONS'] }),
    u('OBSERVABILITY_LINEAGE', 'Data Observability and Lineage', 'Freshness and volume monitors, anomaly alerts, lineage with OpenLineage in outline, and finding what a broken table affects.',
      ['Monitor pipelines for silent failures and trace their impact through lineage'], 40, { after: ['QUALITY_CHECKS'] }),
    u('GOVERNANCE_PRIVACY', 'Governance, Catalogues and Personal Data', 'Catalogues and ownership, access control, masking and tokenisation, retention, and personal data under India\'s DPDP Act in outline.',
      ['Govern a data platform so the right people see the right data and personal data is protected'], 40, { after: ['OBSERVABILITY_LINEAGE'] }),
    ...ending('Data Quality and Governance', 'GOVERNANCE_PRIVACY', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── The cloud data stack ── */
  DE_CLOUD_DATA: { category: 'UNIVERSAL', units: [
    u('AWS_DATA_STACK', 'The AWS Data Stack', 'S3 as the lake, Glue catalogue and jobs, Athena, Redshift, EMR and Lake Formation — what each is for and how they connect.',
      ['Map a data platform onto AWS services and say what each does'], 45),
    u('ATHENA_GLUE', 'Querying the Lake: Glue Catalogue and Athena', 'Crawlers and tables, partitions and partition projection, Parquet and cost per query, and CTAS.',
      ['Query a partitioned S3 lake with Athena at low cost'], 40, { after: ['AWS_DATA_STACK'] }),
    u('AZURE_DATA_STACK', 'The Azure Data Stack', 'ADLS Gen2, Data Factory, Synapse and Microsoft Fabric, and Azure Databricks — mapped to the AWS services you know.',
      ['Map the same data platform onto Azure services'], 40, { after: ['ATHENA_GLUE'] }),
    u('DATA_PLATFORM_OPS', 'Running a Data Platform: IaC, CI/CD and Cost', 'Terraform for data infrastructure, CI for pipelines and dbt, environments, secrets, and keeping the bill under control.',
      ['Run data infrastructure and pipelines as code with CI and cost controls'], 40, { after: ['AZURE_DATA_STACK'] }),
    ...ending('The Cloud Data Stack', 'DATA_PLATFORM_OPS', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── The Data Engineer capstone ── */
  DE_CAPSTONE: { category: 'UNIVERSAL', units: [
    u('BRIEF', 'The Capstone: A Data Platform for a Real Business', 'A platform for an e-commerce, fintech or logistics business: sources, consumers, freshness needs, the model, and the plan.',
      ['Scope a data platform — sources, model, freshness and delivery plan — for a business'], 45),
    u('BUILD_PIPELINES', 'Capstone Build — Ingestion, Models and Transformations', 'Incremental ingestion from an API and a database, a lakehouse with bronze, silver and gold, Spark for the heavy step, and dbt models with tests.',
      ['Build the ingestion and transformation side of the platform, tested and re-runnable'], 300, { unitType: 'PROJECT', after: ['BRIEF'], skillKeys: ['DATA_PIPELINES', 'DATA_MODELLING'] }),
    u('BUILD_OPERATE', 'Capstone Build — Orchestration, Streaming, Quality and the Cloud', 'An orchestrated schedule with backfills, one streaming feed, quality checks and alerts, lineage, and the platform deployed on AWS with a cost report.',
      ['Run the platform reliably — orchestrated, monitored, governed and on the cloud'], 240, { unitType: 'PROJECT', after: ['BUILD_PIPELINES'], skillKeys: ['ETL_FUNDAMENTALS', 'BATCH_STREAM_PROCESSING'] }),
    u('DEFENCE', 'Demo Day: Presenting and Defending the Platform', 'A live backfill and a broken-data drill, the lineage and the dashboards, the cost, and the questions a data hiring panel asks.',
      ['Demo the platform and defend its design and decisions under questioning'], 45, { unitType: 'PRACTICE', after: ['BUILD_OPERATE'] }),
    u('CHECKPOINT', 'Capstone — Checkpoint', 'Where you actually are across the whole track, measured rather than felt.',
      ['Show data-engineering judgement at the standard a hiring panel expects'], 40, { unitType: 'CHECKPOINT', after: ['DEFENCE'] }),
  ] },
};

/**
 * Batch DE4: Year-4 placement for Data Engineer. Aptitude, coding rounds, the SQL rounds, core CS, HR and
 * mocks are shared placement packs; these add the data engineer interview, scenario rounds and the candidate.
 */
export const TRACK_DE_PLACE: Record<string, TopicSeed> = {
  /* ── The data engineer interview ── */
  DE_IV: { category: 'UNIVERSAL', units: interview('Data Engineer Interview', [
    ['IV_MODELLING', 'Data Modelling Questions', 'Grain, facts and dimensions, star versus snowflake, slowly changing dimensions, and modelling a business process on the spot.', ['DATA_MODELLING']],
    ['IV_PIPELINES', 'ETL and Pipeline Questions', 'Batch versus incremental, idempotency, CDC, file formats, retries and backfills, and a pipeline that failed overnight.', ['ETL_FUNDAMENTALS']],
    ['IV_SPARK', 'Spark Questions', 'Lazy evaluation, partitions and shuffles, joins and skew, caching, and reading a slow job.', ['BATCH_STREAM_PROCESSING']],
    ['IV_WAREHOUSE', 'Warehouse and Lakehouse Questions', 'Columnar storage, partitioning and clustering, table formats, medallion layers, and warehouse cost.', ['DATA_WAREHOUSING']],
    ['IV_ORCH_STREAM', 'Orchestration and Streaming Questions', 'Airflow concepts, schedules and backfills, Kafka partitions and offsets, delivery guarantees, and windows and late data.', ['DATA_PIPELINES']],
  ]) },

  /* ── Scenario rounds ── */
  DE_SCENARIO_ROUNDS: { category: 'UNIVERSAL', units: [
    u('PIPELINE_DESIGN_ROUND', 'The Pipeline Design Round', 'Designing a pipeline on a whiteboard for stated sources, freshness and volume, and defending each choice.',
      ['Design a data pipeline to requirements and defend its trade-offs'], 45),
    u('BROKEN_PIPELINE_ROUND', 'The Broken-Pipeline Round', 'A failed DAG, a dashboard showing wrong numbers, a job that doubled overnight — investigating aloud, in order, with evidence.',
      ['Investigate a broken pipeline or wrong numbers aloud with a clear method'], 45, { after: ['PIPELINE_DESIGN_ROUND'] }),
    u('SQL_MODELLING_TAKEHOME', 'The SQL and Modelling Take-Home', 'A typical take-home: model raw data, write the transformations and tests, and a README a reviewer can run.',
      ['Deliver a modelling-and-SQL take-home that gets a call-back'], 45, { after: ['BROKEN_PIPELINE_ROUND'] }),
    u('SPARK_ROUND', 'The Spark Optimisation Round', 'Reading a slow job\'s plan with the interviewer and choosing the fixes, with numbers.',
      ['Optimise a Spark job in an interview and explain why each change helps'], 40, { after: ['SQL_MODELLING_TAKEHOME'] }),
    u('TIMED_SCENARIOS', 'Timed Scenario Set', 'Three data-engineering scenario questions under time, with model answers and how each is scored.',
      ['Answer timed data-engineering scenarios with structure and evidence'], 50, { unitType: 'PRACTICE', after: ['SPARK_ROUND'] }),
    u('CHECKPOINT', 'Data Engineering Scenario Rounds — Checkpoint', 'Where you actually are on this, measured rather than felt.',
      ['Show structured data-engineering scenario thinking at interview standard'], 40, { unitType: 'CHECKPOINT', after: ['TIMED_SCENARIOS'] }),
  ] },

  /* ── The data engineering candidate ── */
  DE_PLACE_CANDIDATE: { category: 'UNIVERSAL', units: [
    u('RESUME', 'A Data Engineer\'s Resume and Portfolio', 'The skills line recruiters filter on, project bullets with evidence (row counts, freshness, run time, cost), and a portfolio repository that runs.',
      ['Write a data-engineering resume and portfolio whose every claim can be checked'], 45, { skillKeys: ['PLACEMENT_READINESS', 'PORTFOLIO_EVIDENCE'] }),
    u('CERTIFICATIONS', 'Certifications and the Data Engineering Career Path', 'Cloud data certifications (AWS, Azure, Databricks, Snowflake) — what each proves and when it helps — and data roles and paths in India.',
      ['Plan certifications and a first data-engineering role that fit your goals'], 35, { after: ['RESUME'], skillKeys: ['PLACEMENT_READINESS'] }),
    u('MOCK_LOOP', 'The Data Engineer Interview Loop — Mock', 'Online SQL and Python test, a technical round, a design round, a hiring-manager round and HR — as one mock day, with the debrief.',
      ['Go through a complete data-engineering interview loop and act on its debrief'], 60, { unitType: 'PRACTICE', after: ['CERTIFICATIONS'], skillKeys: ['INTERVIEW_PERFORMANCE'] }),
    u('CHECKPOINT', 'Data Engineering Placement — Checkpoint', 'Where you actually are on this, measured rather than felt.',
      ['Show the judgement a data hiring panel looks for'], 40, { unitType: 'CHECKPOINT', after: ['MOCK_LOOP'] }),
  ] },
};
