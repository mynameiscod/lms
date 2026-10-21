import { TopicSeed } from './year1MegaCurriculum';
import { u } from './year4UnitKit';
import { ending } from './trackUnitsWeb';
import { interview } from './trackUnitsPlacement';

/**
 * Career-track content for the data and AI tracks — Data Analytics + AI first, then Data Science + AI,
 * then AI Engineer and Machine Learning Engineer, each reusing the one before.
 *
 * The years already teach SQL from the first SELECT to joins and design, Python basics, and Year 1's
 * introductions to data wrangling, statistics, machine learning and generative AI; the packs reuse all of
 * it. These topics add what an analyst is hired for: Excel, SQL written to answer business questions,
 * pandas, statistics for decisions, Power BI, metrics and storytelling, and AI used well in analysis.
 *
 * Skills are the DATA domain of the role catalogue (aiDataSecuritySkills.ts), seeded with
 * `seedAiDataSecurityRoles <tenant> --skills-only`.
 */

/** Batch A1: Excel and SQL for analysts. */
export const TRACK_DATA_A1: Record<string, TopicSeed> = {
  /* ── Excel: formulas and lookups ── */
  DT_EXCEL_CORE: { category: 'UNIVERSAL', units: [
    u('WORKBOOKS_TABLES', 'Workbooks, Ranges and Excel Tables', 'Cells, ranges and references, structured Excel Tables, data types, and keeping raw data apart from analysis.',
      ['Lay out a workbook so raw data, calculations and output stay separate, using Excel Tables'], 35),
    u('FORMULAS_REFERENCES', 'Formulas, Functions and Absolute References', 'Operators, SUM, AVERAGE, COUNT and ROUND, relative vs absolute vs mixed references, and named ranges.',
      ['Write formulas that copy correctly, using relative, absolute and mixed references'], 40, { after: ['WORKBOOKS_TABLES'] }),
    u('LOGIC_CONDITIONAL', 'Logic and Conditional Aggregation', 'IF, IFS, AND, OR, IFERROR, and COUNTIFS, SUMIFS and AVERAGEIFS for questions with conditions.',
      ['Answer conditional business questions with IF logic and the IFS aggregation functions'], 45, { after: ['FORMULAS_REFERENCES'] }),
    u('LOOKUPS', 'Lookups: XLOOKUP, INDEX-MATCH and VLOOKUP', 'Joining two tables in a sheet, exact vs approximate match, missing keys, and why VLOOKUP breaks when columns move.',
      ['Combine data from two tables with XLOOKUP or INDEX-MATCH and handle keys that are missing'], 45, { after: ['LOGIC_CONDITIONAL'] }),
    u('TEXT_DATES', 'Text and Date Functions', 'TRIM, LEFT, MID, TEXTSPLIT and TEXT; dates as numbers, EOMONTH, DATEDIF and NETWORKDAYS; and dates that are really text.',
      ['Clean text fields and calculate with dates, including dates stored as text'], 40, { after: ['LOOKUPS'] }),
    u('CLEANING_IN_EXCEL', 'Cleaning Data in Excel', 'Duplicates, inconsistent categories, blanks, Flash Fill, data validation, and Power Query as the repeatable way.',
      ['Clean a messy sheet so the same cleaning can be repeated next month'], 40, { after: ['TEXT_DATES'] }),
    ...ending('Excel Formulas', 'CLEANING_IN_EXCEL', { minutes: [40, 55, 35, 40] }),
  ] },

  /* ── Excel: analysis, pivots and dashboards ── */
  DT_EXCEL_ANALYSIS: { category: 'UNIVERSAL', units: [
    u('SORT_FILTER', 'Sorting, Filtering and Dynamic Arrays', 'Multi-level sort, filters, and FILTER, SORT, UNIQUE and SORTBY — results that update themselves.',
      ['Answer "which ones" questions with sorting, filtering and dynamic array functions'], 35),
    u('PIVOT_TABLES', 'Pivot Tables', 'Rows, columns, values and filters, grouping dates, % of total, and the questions a pivot answers in seconds.',
      ['Summarise a dataset with pivot tables, including grouped dates and percentage views'], 45, { after: ['SORT_FILTER'] }),
    u('CHARTS', 'Charts That Answer the Question', 'Choosing bar, line, scatter or a table, pivot charts, and the defaults that mislead.',
      ['Choose and format a chart that answers a specific business question honestly'], 40, { after: ['PIVOT_TABLES'] }),
    u('WHAT_IF', 'What-If Analysis and Scenarios', 'Goal Seek, data tables, scenario comparisons, and keeping assumptions in labelled input cells.',
      ['Model a simple business scenario with clearly separated assumptions and compare outcomes'], 40, { after: ['CHARTS'] }),
    u('DASHBOARD', 'An Excel Dashboard', 'Slicers, KPI cards, a layout someone else can read, and refreshing it from new data.',
      ['Build a one-page Excel dashboard that refreshes when new data arrives'], 45, { after: ['WHAT_IF'] }),
    ...ending('Excel Analysis', 'DASHBOARD', { project: ['MINI_PROJECT', 'Mini Project — A Sales Dashboard in Excel', 'A monthly sales workbook: cleaned raw data in a Table, lookups to product and region data, pivot tables by region, product and month, honest charts, slicers, and a one-page dashboard with three written findings.'] }),
  ] },

  /* ── SQL that answers business questions ── */
  DT_SQL_ANALYST: { category: 'UNIVERSAL', units: [
    u('QUESTION_TO_QUERY', 'From a Business Question to a Query', 'Turning "how are sales doing?" into a precise question, the grain of a table, and checking row counts as you go.',
      ['Restate a vague business question precisely and write the query that answers it'], 40),
    u('AGGREGATION_PATTERNS', 'Aggregation Patterns', 'GROUP BY with several columns, HAVING, COUNT DISTINCT, conditional aggregation with CASE, and percentages of a total.',
      ['Summarise data with grouped and conditional aggregates, including percentages'], 45, { after: ['QUESTION_TO_QUERY'] }),
    u('JOINS_FOR_ANALYSIS', 'Joins for Analysis, and the Rows They Lose or Double', 'LEFT JOIN to keep everything, anti-joins for "never", and spotting a join that multiplies rows.',
      ['Join tables for analysis without losing or duplicating rows, and find what never happened'], 45, { after: ['AGGREGATION_PATTERNS'] }),
    u('SUBQUERIES_CTES', 'Subqueries and CTEs', 'Breaking a question into steps with WITH, correlated subqueries, and when each reads better.',
      ['Answer multi-step questions with CTEs and subqueries'], 45, { after: ['JOINS_FOR_ANALYSIS'] }),
    u('DATES_NULLS', 'Dates, NULLs and Messy Values in SQL', 'Truncating dates to months, date arithmetic, COALESCE and NULL in aggregates, and cleaning text in a query.',
      ['Group by period, handle NULLs correctly in aggregates, and clean values inside a query'], 40, { after: ['SUBQUERIES_CTES'] }),
    ...ending('SQL for Analysis', 'DATES_NULLS', { minutes: [40, 60, 35, 40] }),
  ] },

  /* ── Window functions and analyst queries ── */
  DT_SQL_WINDOWS: { category: 'UNIVERSAL', units: [
    u('WINDOW_BASICS', 'Window Functions: OVER and PARTITION BY', 'What a window is, aggregates that keep every row, PARTITION BY, and how it differs from GROUP BY.',
      ['Add group totals and shares to every row with window aggregates'], 45),
    u('RANKING', 'Ranking: ROW_NUMBER, RANK and DENSE_RANK', 'Top-N per group, ties, and deduplicating with ROW_NUMBER.',
      ['Find the top N per group and remove duplicates with ranking functions'], 40, { after: ['WINDOW_BASICS'] }),
    u('RUNNING_MOVING', 'Running Totals, Moving Averages, LAG and LEAD', 'Ordered windows and frames, cumulative sums, 7-day averages, and change from the previous period.',
      ['Compute running totals, moving averages and period-over-period change'], 45, { after: ['RANKING'] }),
    u('COHORTS_RETENTION', 'Cohorts, Retention and Funnels in SQL', 'First-purchase cohorts, retention by month, and conversion through the steps of a funnel.',
      ['Write cohort retention and funnel conversion queries'], 50, { after: ['RUNNING_MOVING'] }),
    ...ending('SQL Window Functions', 'COHORTS_RETENTION', { project: ['MINI_PROJECT', 'Mini Project — An E-commerce Analysis in SQL', 'A set of SQL queries over an orders, customers and products database answering a manager’s brief: revenue by month and category, top products per region, repeat-customer share, monthly cohort retention and a checkout funnel — each query explained and its result checked.'] }),
  ] },
};

/** Batch A2: Python for data — pandas, cleaning, and exploratory analysis with charts. Python basics are the years’ own. */
export const TRACK_DATA_A2: Record<string, TopicSeed> = {
  /* ── NumPy and pandas ── */
  DT_PANDAS: { category: 'UNIVERSAL', units: [
    u('NOTEBOOKS', 'Jupyter Notebooks and Google Colab', 'Cells and kernels, running out of order and the bugs it causes, Colab vs a local Jupyter, and keeping a notebook reproducible.',
      ['Work in a notebook that runs top to bottom and produces the same result every time'], 30),
    u('NUMPY', 'NumPy Arrays and Vectorised Thinking', 'Arrays vs lists, dtypes, vectorised arithmetic, boolean masks, broadcasting, and aggregate functions.',
      ['Replace Python loops with vectorised NumPy operations and masks'], 40, { after: ['NOTEBOOKS'] }),
    u('SERIES_DATAFRAMES', 'Series, DataFrames and Reading Data', 'read_csv and read_excel with the options that matter, head, info, describe and dtypes, and the index.',
      ['Load CSV and Excel data into pandas correctly and inspect what arrived'], 40, { after: ['NUMPY'] }),
    u('SELECT_FILTER', 'Selecting and Filtering Rows and Columns', 'Columns, loc and iloc, boolean filters with & and |, isin and between, query, and the SettingWithCopy warning.',
      ['Select exactly the rows and columns a question needs, without chained-assignment bugs'], 45, { after: ['SERIES_DATAFRAMES'] }),
    u('GROUPBY_AGG', 'groupby, agg and pivot_table', 'Split-apply-combine, several aggregates at once, named aggregation, pivot_table and crosstab — SQL GROUP BY in pandas.',
      ['Summarise data by groups with groupby, agg and pivot_table'], 45, { after: ['SELECT_FILTER'] }),
    u('MERGE_RESHAPE', 'Merging, Concatenating and Reshaping', 'merge like a SQL join and the rows it multiplies, concat, and melt and pivot between long and wide.',
      ['Combine and reshape DataFrames without losing or duplicating rows'], 45, { after: ['GROUPBY_AGG'] }),
    u('DATES_TIME_SERIES', 'Dates and Time Series in pandas', 'to_datetime, the .dt accessor, resample by week or month, rolling windows, and period-over-period change.',
      ['Analyse data over time with datetime columns, resampling and rolling windows'], 45, { after: ['MERGE_RESHAPE'] }),
    ...ending('pandas', 'DATES_TIME_SERIES', { project: ['MINI_PROJECT', 'Mini Project — Analysing a Retail Dataset with pandas', 'A notebook that loads a retail chain’s sales, stores and products files, joins them, and answers a regional manager’s questions — sales by store and month, top categories, weekday patterns and month-over-month growth — with every step reproducible.'] }),
  ] },

  /* ── Cleaning and data quality ── */
  DT_DATA_CLEANING: { category: 'UNIVERSAL', units: [
    u('MISSING_VALUES', 'Missing Values', 'Finding them, why they are missing, dropping vs filling, and the analysis a careless fill quietly changes.',
      ['Decide per column how to handle missing values and say what the choice does to the result'], 40),
    u('TYPES_PARSING', 'Types and Parsing', 'Numbers stored as text, ₹ and commas, mixed date formats, categories, and to_numeric with errors.',
      ['Convert messy columns to the right types without silently losing rows'], 40, { after: ['MISSING_VALUES'] }),
    u('DUPLICATES_TEXT', 'Duplicates and Inconsistent Text', 'Exact and near duplicates, inconsistent spellings and cases, the .str methods, and mapping categories to one name.',
      ['Remove duplicates and standardise inconsistent text categories'], 40, { after: ['TYPES_PARSING'] }),
    u('OUTLIERS', 'Outliers: Errors or Real?', 'Spotting outliers with IQR and z-scores, telling a data error from a real extreme, and what to do with each.',
      ['Detect outliers and decide, with reasons, whether to fix, keep or exclude them'], 40, { after: ['DUPLICATES_TEXT'] }),
    u('QUALITY_CHECKS', 'Data Quality Checks You Can Rerun', 'Row counts, uniqueness, ranges and allowed values as assertions, a cleaning log, and a pipeline you can run on next month’s file.',
      ['Write repeatable data quality checks and a cleaning log for a dataset'], 40, { after: ['OUTLIERS'], skillKeys: ['DATA_QUALITY'] }),
    ...ending('Data Cleaning', 'QUALITY_CHECKS', { minutes: [40, 60, 35, 40] }),
  ] },

  /* ── Exploratory analysis and charts ── */
  DT_EDA_VIZ: { category: 'UNIVERSAL', units: [
    u('EDA_WORKFLOW', 'The EDA Workflow', 'Starting from questions, one variable at a time, then pairs, segments and time — and writing down what you find as you go.',
      ['Explore an unfamiliar dataset systematically and record findings with evidence'], 40),
    u('MATPLOTLIB', 'Charts with Matplotlib', 'Figure and axes, line, bar, histogram and scatter, labels and titles, and subplots.',
      ['Draw clear, labelled charts with Matplotlib'], 40, { after: ['EDA_WORKFLOW'], skillKeys: ['DATA_VISUALISATION'] }),
    u('SEABORN', 'Statistical Charts with Seaborn', 'Distributions, box and violin plots, relationships and heatmaps of correlation, and hue for segments.',
      ['Show distributions, relationships and segments with Seaborn'], 40, { after: ['MATPLOTLIB'], skillKeys: ['DATA_VISUALISATION'] }),
    u('HONEST_CHARTS', 'Choosing an Honest Chart', 'Matching the chart to the question, axes that start at zero (and when they need not), dual axes, pie charts, and colour.',
      ['Choose the chart that answers the question and avoid the ones that mislead'], 35, { after: ['SEABORN'], skillKeys: ['DATA_VISUALISATION'] }),
    u('PRESENTING_FINDINGS', 'From Notebook to Findings', 'A short report a manager reads: the question, three findings with one chart each, caveats, and what to do next.',
      ['Turn an exploratory notebook into a short, honest findings report'], 40, { after: ['HONEST_CHARTS'] }),
    ...ending('EDA and Visualisation', 'PRESENTING_FINDINGS', { project: ['MINI_PROJECT', 'Mini Project — An EDA Report on a Food-Delivery Dataset', 'Clean and explore a food-delivery orders dataset — delivery times, cancellations, cuisines, areas and hours — and deliver a notebook plus a two-page findings report with honest charts and stated caveats.'] }),
  ] },
};

/** Batch A3: statistics for decisions, A/B testing, and Power BI. Year 1's T_STATS is the base. */
export const TRACK_DATA_A3: Record<string, TopicSeed> = {
  /* ── Statistics for decisions ── */
  DT_STATS_DECISIONS: { category: 'UNIVERSAL', units: [
    u('DESCRIBE', 'Describing Data Honestly', 'Mean, median and mode on skewed business data, spread, percentiles and the five-number summary — computed in pandas.',
      ['Summarise a business metric with the right centre and spread, and say what the summary hides'], 40),
    u('DISTRIBUTIONS', 'Distributions in Business Data', 'Normal, skewed and long-tailed data, order values and delivery times, log scales, and why the average customer does not exist.',
      ['Recognise the shape of a distribution and choose summaries and charts that fit it'], 40, { after: ['DESCRIBE'] }),
    u('SAMPLING', 'Samples, Populations and Bias', 'Sampling, survey and survivorship bias, and the central limit theorem as an intuition rather than a formula.',
      ['Spot a biased sample and explain why averages of samples behave predictably'], 40, { after: ['DISTRIBUTIONS'], skillKeys: ['PROBABILITY_BASICS'] }),
    u('CONFIDENCE_INTERVALS', 'Confidence Intervals', 'Standard error, a 95% interval for a mean and a proportion, what "95%" does and does not mean, and margins of error in reports.',
      ['Compute and correctly interpret a confidence interval for a mean and a proportion'], 45, { after: ['SAMPLING'], skillKeys: ['PROBABILITY_BASICS'] }),
    u('CORRELATION_CAUSATION', 'Correlation, Causation and Confounders', 'Correlation coefficients, confounding variables, Simpson’s paradox, and the claims an observational dataset cannot support.',
      ['Measure correlation and explain why it does not show cause, with a confounder from the data'], 40, { after: ['CONFIDENCE_INTERVALS'] }),
    ...ending('Statistics for Decisions', 'CORRELATION_CAUSATION', { minutes: [40, 55, 35, 40] }),
  ] },

  /* ── Hypothesis tests and A/B testing ── */
  DT_AB_TESTING: { category: 'UNIVERSAL', units: [
    u('HYPOTHESES_PVALUES', 'Hypotheses and p-values', 'Null and alternative hypotheses, what a p-value is and is not, significance levels, and Type I and II errors.',
      ['State hypotheses for a business question and interpret a p-value correctly'], 45),
    u('TESTS', 'Choosing and Running a Test', 'Two-sample t-tests, tests of proportions and chi-square, run with SciPy, and which test fits which question.',
      ['Choose the right test for a comparison and run it in Python'], 45, { after: ['HYPOTHESES_PVALUES'] }),
    u('AB_DESIGN', 'Designing an A/B Test', 'One metric that matters, guardrail metrics, randomisation units, minimum detectable effect, sample size and duration.',
      ['Design an A/B test with a primary metric, guardrails and a sample size that can detect the effect'], 45, { after: ['TESTS'] }),
    u('AB_PITFALLS', 'A/B Testing Pitfalls', 'Peeking, many metrics and many variants, sample-ratio mismatch, novelty effects, and seasonality.',
      ['Find the flaw in a badly run experiment and say how it should have been run'], 40, { after: ['AB_DESIGN'] }),
    u('READING_RESULTS', 'Reading and Reporting Results', 'Statistical vs practical significance, confidence intervals for the lift, and writing the recommendation a manager can act on.',
      ['Turn a test result into a clear, honest recommendation'], 40, { after: ['AB_PITFALLS'] }),
    ...ending('A/B Testing', 'READING_RESULTS', { project: ['MINI_PROJECT', 'Mini Project — Analysing an A/B Test for a Checkout Change', 'An e-commerce company tested a one-page checkout against the old one. Check the experiment for sample-ratio mismatch, analyse conversion and order value with the right tests and intervals, check the guardrails, and write a one-page recommendation.'] }),
  ] },

  /* ── Power BI: data and the model ── */
  DT_PBI_MODEL: { category: 'UNIVERSAL', units: [
    u('POWERBI_TOUR', 'Power BI: Desktop, Service and the Workflow', 'Get data, transform, model, visualise, publish — what each part of Power BI is for and how a report reaches its readers.',
      ['Describe the Power BI workflow and build a first report from a CSV'], 35),
    u('POWER_QUERY', 'Power Query: Getting and Shaping Data', 'Connecting to Excel, CSV and SQL, applied steps, changing types, merging and appending queries, and refreshing.',
      ['Clean and combine sources in Power Query so the same steps run on every refresh'], 45, { after: ['POWERBI_TOUR'] }),
    u('STAR_SCHEMA', 'The Star Schema and Relationships', 'Fact and dimension tables, one-to-many relationships, cardinality, filter direction, and why one flat table causes trouble.',
      ['Model data as a star schema with correct relationships and filter direction'], 45, { after: ['POWER_QUERY'] }),
    u('DATE_TABLE', 'The Date Table', 'A proper calendar table, marking it as a date table, fiscal years, and why time intelligence needs it.',
      ['Build and connect a date table that supports time intelligence'], 35, { after: ['STAR_SCHEMA'] }),
    ...ending('Power BI Modelling', 'DATE_TABLE', { minutes: [40, 55, 35, 40] }),
  ] },

  /* ── Power BI: DAX ── */
  DT_PBI_DAX: { category: 'UNIVERSAL', units: [
    u('MEASURES_COLUMNS', 'Measures vs Calculated Columns', 'What each computes and when, SUM, COUNTROWS, DISTINCTCOUNT and DIVIDE, and why measures are usually right.',
      ['Choose between a measure and a calculated column and write basic measures'], 40),
    u('CALCULATE_CONTEXT', 'Filter Context and CALCULATE', 'Row context and filter context, CALCULATE, FILTER, ALL and REMOVEFILTERS, and percentage-of-total measures.',
      ['Use CALCULATE to change filter context and write share-of-total measures'], 50, { after: ['MEASURES_COLUMNS'] }),
    u('TIME_INTELLIGENCE', 'Time Intelligence', 'Year-to-date, previous period, same period last year, and month-over-month growth with the date table.',
      ['Write YTD, previous-period and growth measures that respect the date table'], 45, { after: ['CALCULATE_CONTEXT'] }),
    u('ITERATORS_VARIABLES', 'Iterators, Variables and Ranking', 'SUMX and AVERAGEX, VAR for readable measures, RANKX, and a measure that is too slow.',
      ['Write readable measures with variables, iterators and ranking'], 45, { after: ['TIME_INTELLIGENCE'] }),
    ...ending('DAX', 'ITERATORS_VARIABLES', { minutes: [45, 60, 35, 40] }),
  ] },

  /* ── Power BI: reports and dashboards ── */
  DT_PBI_REPORTS: { category: 'UNIVERSAL', units: [
    u('VISUALS', 'Choosing and Formatting Visuals', 'Cards, bar, line, matrix, maps and scatter in Power BI, conditional formatting, and what to leave out.',
      ['Pick and format Power BI visuals that answer the reader’s question'], 40, { skillKeys: ['DATA_VISUALISATION'] }),
    u('INTERACTIVITY', 'Slicers, Drill-Through, Tooltips and Bookmarks', 'Cross-filtering, slicers, drill-down and drill-through pages, report tooltips, and bookmarks for guided views.',
      ['Make a report people can explore with slicers, drill-through and tooltips'], 45, { after: ['VISUALS'] }),
    u('DASHBOARD_DESIGN', 'Designing a Dashboard for Its Audience', 'Who reads it and what they decide, KPIs first, layout, consistency, mobile layout, and performance.',
      ['Design a dashboard around its audience’s decisions'], 40, { after: ['INTERACTIVITY'] }),
    u('PUBLISH_SHARE', 'Publishing, Refresh and Row-Level Security', 'Workspaces and apps in the Power BI Service, scheduled refresh and the gateway, sharing, and row-level security.',
      ['Publish a report, schedule its refresh, and restrict rows by user with RLS'], 40, { after: ['DASHBOARD_DESIGN'] }),
    ...ending('Power BI Reports', 'PUBLISH_SHARE', { project: ['MINI_PROJECT', 'Mini Project — A Sales Performance Dashboard in Power BI', 'A Power BI report for a retail chain built from sales, stores, products and a date table: Power Query cleaning, a star schema, DAX measures for revenue, margin, growth and YTD, a KPI overview page, a drill-through store page, row-level security by region, and a published, refreshing report.'] }),
  ] },
};

/** Batch A4: business metrics and storytelling, AI for analysts, and the capstone. Year 1's T_GENAI is the base. */
export const TRACK_DATA_A4: Record<string, TopicSeed> = {
  /* ── Business metrics and storytelling ── */
  DT_METRICS_STORY: { category: 'UNIVERSAL', units: [
    u('KPIS', 'Choosing the Right Metrics', 'KPIs vs vanity metrics, a north-star metric, leading and lagging indicators, and defining a metric precisely enough to compute.',
      ['Choose and precisely define the metrics that match a business goal'], 40),
    u('UNIT_ECONOMICS', 'Funnels, Retention and Unit Economics', 'Conversion funnels, retention and churn, average order value, CAC and LTV — the numbers an e-commerce or SaaS manager watches.',
      ['Compute and explain funnel, retention and unit-economics metrics for a business'], 45, { after: ['KPIS'] }),
    u('ROOT_CAUSE', 'Why Did the Metric Move?', 'Checking the data first, then segmenting, decomposing a metric into its parts, and separating seasonality from a real change.',
      ['Investigate a sudden change in a metric systematically and find its cause'], 45, { after: ['UNIT_ECONOMICS'] }),
    u('STORYTELLING', 'Telling the Story in the Data', 'The one-line answer first, three supporting points, one chart per point, and what the reader should do next.',
      ['Structure an analysis as a clear story with a recommendation'], 40, { after: ['ROOT_CAUSE'] }),
    u('STAKEHOLDERS', 'Working With Stakeholders', 'Turning a vague request into a scoped question, ad-hoc requests vs dashboards, presenting to managers, and saying "the data cannot tell us that".',
      ['Scope an analysis request with a stakeholder and present the result to them'], 35, { after: ['STORYTELLING'] }),
    ...ending('Business Metrics and Storytelling', 'STAKEHOLDERS', { project: ['MINI_PROJECT', 'Mini Project — Diagnosing a Drop in Orders', 'Daily orders on a food-delivery app fell 18% in a week. Check the data, segment by city, platform, cuisine and new vs returning users, decompose the drop, find the cause, and present a five-slide story with a recommendation.'] }),
  ] },

  /* ── AI for analysts ── */
  DT_AI_ANALYST: { category: 'UNIVERSAL', units: [
    u('AI_IN_ANALYSIS', 'Where AI Helps an Analyst, and Where It Hurts', 'Drafting queries and code, explaining unfamiliar code, summarising — and confident wrong numbers, invented columns and leaked data.',
      ['Say where AI speeds up analysis and where it must not be trusted without checking'], 35),
    u('PROMPTING_FOR_DATA', 'Prompting for SQL, pandas and DAX', 'Giving the schema and sample rows, stating the grain and the business rule, asking for one step at a time, and asking for the reasoning.',
      ['Write prompts that produce correct SQL, pandas and DAX for a described dataset'], 45, { after: ['AI_IN_ANALYSIS'], skillKeys: ['PROMPT_ENGINEERING'] }),
    u('VERIFYING_AI', 'Verifying AI-Generated Analysis', 'Checking row counts and totals against a known number, testing a generated query on a case you can work by hand, and spotting a plausible-looking wrong answer.',
      ['Verify AI-generated queries and code before their numbers reach anyone'], 45, { after: ['PROMPTING_FOR_DATA'] }),
    u('COPILOTS', 'Copilot in Excel and Power BI, and Chat-Based Data Analysis', 'What Copilot and chat assistants can do with a workbook, report or uploaded file, their limits, and what company data may never be pasted in.',
      ['Use AI assistants inside Excel and Power BI productively and within data-privacy rules'], 40, { after: ['VERIFYING_AI'] }),
    u('LLM_API_AUTOMATION', 'Automating Analysis with an LLM API', 'Calling an LLM from Python to label, summarise or extract fields from text, asking for JSON, validating it, batching, and keeping the cost in view.',
      ['Automate a text-labelling step with an LLM API, with validated structured output and a cost estimate'], 45, { after: ['COPILOTS'] }),
    u('TEXT_ANALYSIS', 'Analysing Customer Feedback with AI', 'Categorising reviews and tickets with an LLM vs keyword rules, sentiment, checking a sample by hand, and measuring how often the AI is right.',
      ['Categorise free-text feedback with an LLM and measure its accuracy against a hand-labelled sample'], 45, { after: ['LLM_API_AUTOMATION'] }),
    ...ending('AI for Analysts', 'TEXT_ANALYSIS', { project: ['MINI_PROJECT', 'Mini Project — AI-Assisted Customer Feedback Analysis', 'Label 2,000 app-store reviews by theme and sentiment with an LLM, check the labels against a hand-labelled sample of 100, report the accuracy, and turn the results into a short findings report with the top three issues and their trend.'] }),
  ] },

  /* ── The capstone ── */
  DT_CAPSTONE_DA: { category: 'UNIVERSAL', units: [
    u('BRIEF', 'The Capstone: Scope, Data and Plan', 'A business problem from retail, food delivery or fintech: the questions, the data sources, the metrics, the deliverables and a plan.',
      ['Scope an end-to-end analysis project and write a plan you can deliver in the time'], 45),
    u('BUILD_ANALYSIS', 'Capstone Build — The Analysis', 'SQL to extract, pandas to clean and explore, statistics or an A/B test where the question needs one, and documented findings.',
      ['Deliver a reproducible analysis that answers the business questions with evidence'], 300, { unitType: 'PROJECT', after: ['BRIEF'] }),
    u('BUILD_DASHBOARD_AI', 'Capstone Build — The Dashboard and the AI Insights', 'A Power BI dashboard for the stakeholder, and AI used where it earns its place — feedback themes or narrative summaries — with its accuracy checked.',
      ['Deliver a dashboard for the stakeholder and an AI-assisted insight whose accuracy is measured'], 240, { unitType: 'PROJECT', after: ['BUILD_ANALYSIS'], skillKeys: ['DASHBOARDING', 'LLM_APPLICATIONS'] }),
    u('DEFENCE', 'Demo Day: Presenting the Capstone', 'A ten-minute presentation to a manager, the questions they ask about the numbers, and defending every method and caveat.',
      ['Present the capstone as a story and defend its methods under questioning'], 45, { unitType: 'PRACTICE', after: ['BUILD_DASHBOARD_AI'] }),
    u('CHECKPOINT', 'Capstone — Checkpoint', 'Where you actually are across the whole track, measured rather than felt.',
      ['Show analyst judgement at the standard a hiring manager expects'], 40, { unitType: 'CHECKPOINT', after: ['DEFENCE'] }),
  ] },
};

/**
 * Batch A5: Year-4 placement for analysts — what an analyst interview asks that the shared aptitude, HR, portfolio and
 * mock packs do not: SQL rounds, Excel and Power BI, statistics and pandas, case interviews, and the candidate.
 */
export const TRACK_DATA_A5: Record<string, TopicSeed> = {
  /* ── SQL interview rounds for analysts ── */
  DT_IV_SQL_DA: { category: 'UNIVERSAL', units: interview('Analyst SQL Interview', [
    ['IV_AGGREGATES_JOINS', 'Aggregations and Joins Under Interview Pressure', 'GROUP BY and HAVING traps, COUNT(*) vs COUNT(col), joins that multiply rows, anti-joins, and NULLs in every one of them.', ['SQL_AGGREGATION']],
    ['IV_WINDOWS', 'Window Functions in Interviews', 'Top-N per group, ties, running totals, LAG for change, and deduplication — the window questions every analyst round asks.', ['SQL_WINDOW_FUNCTIONS']],
    ['IV_CASE_QUERIES', 'Business Case Queries', 'Month-over-month growth, second-highest, retention, repeat customers, and "users who did X but not Y", written live and explained.', ['SQL_AGGREGATION']],
    ['IV_QUERY_HYGIENE', 'Writing SQL an Interviewer Trusts', 'Checking row counts, readable CTEs, testing on a small case, and explaining what an index does for a slow analyst query.', ['SQL_AGGREGATION']],
  ]) },

  /* ── Excel and Power BI at interview depth ── */
  DT_IV_EXCEL_BI: { category: 'UNIVERSAL', units: interview('Excel and Power BI Interview', [
    ['IV_EXCEL', 'Excel in the Analyst Round', 'Lookups and their failures, pivot tables, conditional aggregation, absolute references and the live Excel task.', ['SPREADSHEET_ANALYSIS']],
    ['IV_PBI_MODEL', 'Power BI Modelling Questions', 'Star schema vs flat tables, relationships and filter direction, Power Query vs DAX, and import vs DirectQuery.', ['DASHBOARDING']],
    ['IV_DAX', 'DAX Questions', 'Measures vs columns, filter context and CALCULATE, time intelligence, and the totals-row question.', ['DASHBOARDING']],
    ['IV_DASHBOARD_DESIGN', 'Dashboard Design and Critique', 'Critiquing a dashboard in the interview, choosing KPIs for an audience, and explaining RLS and refresh.', ['DASHBOARDING']],
  ]) },

  /* ── Statistics, A/B testing and pandas at interview depth ── */
  DT_IV_STATS_PYTHON: { category: 'UNIVERSAL', units: interview('Statistics and Python Interview', [
    ['IV_STATS', 'Statistics Questions', 'Mean vs median, distributions, sampling bias, confidence intervals and correlation vs causation — explained in plain words.', ['STATISTICS_BASICS']],
    ['IV_AB', 'A/B Testing Questions', 'p-values, power and sample size, what to do when the test is inconclusive, peeking and sample-ratio mismatch.', ['HYPOTHESIS_TESTING']],
    ['IV_PANDAS', 'pandas in the Technical Round', 'groupby, merge, pivot, apply vs vectorised code, dates, and the pandas task done live.', ['DATA_WRANGLING']],
    ['IV_CLEANING_EDA', 'Cleaning and EDA Questions', 'Missing values, outliers, duplicates and how you would explore a dataset you have never seen.', ['DATA_CLEANING']],
  ]) },

  /* ── Case interviews ── */
  DT_CASE_INTERVIEWS: { category: 'UNIVERSAL', units: [
    u('GUESSTIMATES', 'Guesstimates', 'Structuring an estimate (how many food orders in Pune a day?), stating assumptions, sanity checks, and talking through it.',
      ['Structure and talk through a market-size or volume estimate with clear assumptions'], 40),
    u('METRIC_CASES', 'Metric Cases', '"Orders dropped 10% — what do you do?", choosing a metric for a feature, and trade-offs between metrics.',
      ['Work a metric investigation or metric-choice case aloud with a clear structure'], 45, { after: ['GUESSTIMATES'] }),
    u('PRODUCT_BUSINESS_CASES', 'Product and Business Cases', 'Should we launch this, how would you measure this feature, and which segment to target — answered with data.',
      ['Answer a product or business case with a structured, data-led recommendation'], 45, { after: ['METRIC_CASES'] }),
    u('TAKE_HOME', 'The Take-Home Assignment', 'Reading the brief, scoping, cleaning, analysing, and the short report and notebook that win the next round.',
      ['Complete a take-home analysis assignment to the standard that gets a call-back'], 45, { after: ['PRODUCT_BUSINESS_CASES'] }),
    u('TIMED_CASES', 'Timed Case Set', 'A guesstimate, a metric case and a product case under time, with model answers and how each is scored.',
      ['Solve a timed set of case questions with structure and clear communication'], 50, { unitType: 'PRACTICE', after: ['TAKE_HOME'] }),
    u('CHECKPOINT', 'Case Interviews — Checkpoint', 'Where you actually are on this, measured rather than felt.',
      ['Show structured business thinking at case-interview standard'], 40, { unitType: 'CHECKPOINT', after: ['TIMED_CASES'] }),
  ] },

  /* ── The analyst candidate ── */
  DT_PLACE_DA_FS: { category: 'UNIVERSAL', units: [
    u('RESUME', 'An Analyst Resume and Portfolio', 'The skills line recruiters filter on (SQL, Excel, Power BI, Python, statistics), project bullets with business impact, and a portfolio of notebooks and a published dashboard.',
      ['Write an analyst resume and portfolio whose every claim can be checked'], 45, { skillKeys: ['PLACEMENT_READINESS', 'PORTFOLIO_EVIDENCE'] }),
    u('DEFEND_CAPSTONE', 'Defending Your Analytics Capstone', 'Walking a panel through the question, data, methods, findings and caveats, and the follow-ups they ask about the numbers and the AI.',
      ['Defend the capstone analysis end to end under follow-up questions'], 45, { after: ['RESUME'], skillKeys: ['TECHNICAL_EXPLANATION'] }),
    u('MOCK_LOOP', 'The Analyst Interview Loop — Mock', 'Online test (aptitude, SQL, Excel), a technical round, a case round, a hiring-manager round and HR — as one mock day.',
      ['Go through a complete analyst interview loop and act on its debrief'], 60, { unitType: 'PRACTICE', after: ['DEFEND_CAPSTONE'], skillKeys: ['INTERVIEW_PERFORMANCE'] }),
    u('CHECKPOINT', 'Analyst Placement — Checkpoint', 'Where you actually are on this, measured rather than felt.',
      ['Show the judgement an analytics hiring panel looks for'], 40, { unitType: 'CHECKPOINT', after: ['MOCK_LOOP'] }),
  ] },
};
