import { TopicSeed } from './year1MegaCurriculum';
import { u } from './year4UnitKit';
import { ending } from './trackUnitsWeb';

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
