/**
 * T2_TRACK_DATA — twelve units. Year 2, direction track.
 *
 * ── THE POSITION THIS TRACK TAKES ─────────────────────────────────────────────────────────
 *
 * Data analysis is taught here as a discipline of not being wrong in public. The tools — pandas,
 * SQL, a charting library — are a week's learning. The judgement is the year's: what one row
 * represents, what a dataset cannot answer, which average lies, and when the honest output is "I
 * cannot tell you that from this data".
 *
 * Half of the job is communication, and the track says so repeatedly, because students arrive
 * believing it is the half that does not count.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const DATA_TRACK_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T2_TRACK_DATA_DATA_LITERACY',
    notes: `Before any analysis, one question: **what does one row represent?** Everything you compute
afterwards depends on the answer, and getting it wrong invalidates all of it.

That is the **grain** of a dataset, and it has to be stated in a sentence:

- "One row is one order" — so \`COUNT(*)\` is a number of orders
- "One row is one order *line*" — so \`COUNT(*)\` is a number of items, and counting orders means
  counting distinct order ids
- "One row is one customer per month" — so a customer appears twelve times a year, and summing spend
  across the table double-counts nothing, but averaging spend averages customer-months

**The commonest analysis error in existence** is computing a number at the wrong grain: an average
order value that is really an average line value, a customer count that is really a row count.

**Then ask what each column actually is:**

| Question | Why it matters |
|---|---|
| What does this column mean? | "status" could be payment, delivery or account status |
| What are its possible values? | Six statuses, or forty, including three misspellings |
| What does blank mean? | Not applicable, not recorded, or genuinely zero |
| When was it recorded? | At the event, or backfilled later from something else |
| Who typed it? | A system, or a person under time pressure |

**Blank is three different things**, and conflating them produces wrong answers quietly. A missing
delivery date might mean not yet delivered, never delivered, or the field was added last year and old
rows have none. Those lead to three different analyses.

**Types matter more than they look.** A date stored as text sorts alphabetically. A number stored as
text does not sum. An id stored as a number gets averaged by a tool that assumes numbers are
quantities, which is how you get "the average customer id is 4,812".

**Ask what the data does not contain.** Cancelled orders excluded from the export, customers who
never bought, the branch that joined the system last month. What was left out shapes every conclusion
and appears nowhere in the file.

**Write the grain and the column meanings down** before analysing. Ten minutes, and it is the
difference between an analysis you can defend and a number you have to withdraw.`,
    mcqs: [
      mcq('The grain of a dataset is:',
        [['What one row represents', true],
          ['The number of rows it contains', false],
          ['The level of detail in its columns', false],
          ['How often it is refreshed', false]],
        'Everything computed afterwards depends on the answer.'),
      mcq('If one row is one order line, then `COUNT(*)` gives:',
        [['A number of items', true],
          ['A number of orders', false],
          ['A number of customers', false],
          ['A number of products', false]],
        'Counting orders means counting distinct order ids.'),
      mcq('A blank value in a delivery date column could mean:',
        [['Not yet delivered, never delivered, or not recorded', true],
          ['Only that the delivery has not happened', false],
          ['That the record is invalid', false],
          ['That the value is zero', false]],
        'Three meanings leading to three different analyses.'),
      mcq('An id stored as a number is a hazard because:',
        [['Tools average it as a quantity', true],
          ['Ids should always be text', false],
          ['Numeric ids cannot be joined', false],
          ['They sort in the wrong order', false]],
        'Hence "the average customer id is 4,812".'),
    ],
    checkpoint: [
      mcq('The commonest analysis error is:',
        [['Computing a number at the wrong grain', true],
          ['Using the mean instead of the median', false],
          ['Failing to remove outliers', false],
          ['Charting with a truncated axis', false]],
        'An average order value that is really an average line value.'),
      mcq('Asking what the data does not contain matters because:',
        [['What was excluded shapes every conclusion', true],
          ['Missing data can be imputed', false],
          ['Exports are usually incomplete', false],
          ['It determines the sample size', false]],
        'Cancelled orders, customers who never bought, the branch that joined last month.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_DATA_COLLECTION',
    notes: `Every dataset was produced by a process, and that process decided what is in it. Knowing
the process tells you what the data can and cannot answer.

**The sources, and what each brings with it:**

**Operational databases** — accurate about what the business recorded, shaped for running the
business rather than analysing it. Deleted records may be genuinely gone, and a "status" column may
have changed meaning when the software was updated.

**Exports and spreadsheets** — a snapshot at a moment, often hand-edited, frequently with a header
row that is not the first row and a total row at the bottom that is not data.

**APIs** — current state, usually paged and rate limited, and often unable to tell you history. What
something was last month may be unrecoverable.

**Logs** — enormous, detailed, and recording only what somebody decided to log.

**Surveys and forms** — self-reported, which is a different kind of fact entirely. People
misremember, round, and answer what they think is expected.

**Third-party data** — check the methodology before using it, and check when it was collected.

**The biases that appear in every dataset:**

- **Selection** — who is in it. Reviews come from people with strong feelings; app analytics come
  only from people who installed it.
- **Survivorship** — who is missing. Analysing current customers to understand churn omits everybody
  who left.
- **Measurement** — a sensor that fails in the cold, a form that defaults to "Mumbai", a process that
  rounds down.
- **Time** — a month containing a festival, a promotion, or an outage is not a typical month.

**The survivorship case is worth recognising by name**, because it is convincing and wrong: the
companies that succeeded, the students who finished, the users still active. Analysing only what
remains produces confident conclusions about a population you did not observe.

**Ask before analysing:** who or what is missing, what a row had to survive to be here, what has
changed in the collection since the oldest row, and whether the period covered is representative.

**Write the answers down.** They become the limitations section of your report, and a report without
one is a report that will eventually embarrass you.`,
    mcqs: [
      mcq('Survivorship bias in a churn analysis means:',
        [['Everybody who already left is missing from the data', true],
          ['Long-tenured customers are overrepresented', false],
          ['Cancelled accounts are counted twice', false],
          ['Recent customers dominate the sample', false]],
        'Confident conclusions about a population you did not observe.'),
      mcq('Survey data differs from operational data because it is:',
        [['Self-reported, a different kind of fact', true],
          ['Collected more recently', false],
          ['Smaller in volume', false],
          ['Less structured', false]],
        'People misremember, round, and answer what they think is expected.'),
      mcq('An operational database is shaped for:',
        [['Running the business, not analysing it', true],
          ['Reporting and analysis', false],
          ['Long-term historical storage', false],
          ['Export to spreadsheets', false]],
        'Which is why a status column may have changed meaning along the way.'),
      mcq('A month containing a festival or an outage is an example of:',
        [['Time bias', true],
          ['Selection bias', false],
          ['Measurement bias', false],
          ['Survivorship bias', false]],
        'Never generalise from one unusual period.'),
    ],
    checkpoint: [
      mcq('APIs are often unable to answer historical questions because:',
        [['They return current state, not history', true],
          ['They are rate limited', false],
          ['They page their results', false],
          ['They exclude deleted records', false]],
        'What something was last month may be unrecoverable.'),
      mcq('The answers to "who is missing?" become:',
        [['The limitations section', true],
          ['The sampling strategy', false],
          ['The data cleaning log', false],
          ['The list of required joins', false]],
        'A report without one will eventually embarrass you.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_DATA_LOADING',
    notes: `Look at the data before you do anything to it. Every hour spent on an analysis built over
an unexamined dataset is an hour at risk.

    import pandas as pd

    df = pd.read_csv("orders.csv")

    df.shape          # how many rows and columns
    df.head(20)       # what does it look like
    df.dtypes         # what did the loader think each column was
    df.info()         # non-null counts per column
    df.describe()     # numeric ranges, at a glance
    df.isna().sum()   # missing values per column

**Six commands, and they answer most of what you need to know before starting.**

**\`dtypes\` is where the early problems are.** A column of numbers read as \`object\` means
something in it is not a number — a comma, a currency symbol, a stray "N/A" — and the loader gave up
on the whole column.

**Loading correctly is easier than repairing afterwards:**

    df = pd.read_csv(
        "orders.csv",
        dtype={"customer_id": str, "pin_code": str},   # ids are not quantities
        parse_dates=["created_at"],
        na_values=["", "NA", "N/A", "-", "null", "unknown"],
        thousands=",",
    )

**Keep ids as strings.** A customer id read as a number loses leading zeros, and a pin code becomes
an integer that can be averaged.

**\`na_values\` matters** because real exports mark missing data half a dozen different ways, and
each unmarked one becomes a string that poisons its column.

**Check what you loaded against what you expected:** row count against the source, the date range
against the period you asked for, the number of distinct customers against something you know.
Loading silently wrong is the failure mode of this stage — a file truncated at a million rows, a
sheet that is not the one you meant, a delimiter guessed wrongly.

**Look at the extremes.** \`df.sort_values("total").head()\` and \`.tail()\` show the smallest and
largest values, which is where the impossible ones live: a negative quantity, a date in 1900, a total
of 99,999,999.

**Never modify the source file.** Load, transform in code, and write the result somewhere new. An
analysis that edits its own input cannot be repeated, and repeating it is exactly what somebody will
ask you to do.`,
    mcqs: [
      mcq('A numeric column loaded as `object` usually means:',
        [['Something in it is not a number', true],
          ['The column has missing values', false],
          ['The file used the wrong encoding', false],
          ['The column contains very large numbers', false]],
        'A comma, a currency symbol, or a stray "N/A".'),
      mcq('Ids and pin codes should be loaded as strings because:',
        [['Numeric loading loses leading zeros', true],
          ['Strings use less memory', false],
          ['They cannot be joined as numbers', false],
          ['Pandas requires it for merges', false]],
        'They are labels, not quantities.'),
      mcq('Specifying `na_values` matters because:',
        [['Exports mark missing data in several different ways', true],
          ['Pandas cannot detect empty strings', false],
          ['It speeds up loading', false],
          ['Missing values must be counted', false]],
        'Each unmarked one poisons its column as a string.'),
      mcq('The failure mode of the loading stage is:',
        [['Loading silently wrong', true],
          ['Running out of memory', false],
          ['Slow reading of large files', false],
          ['Type conversion errors', false]],
        'Check the row count and date range against what you expected.'),
    ],
    checkpoint: [
      mcq('Sorting by a numeric column and viewing both ends reveals:',
        [['Impossible values, like a date in 1900', true],
          ['The distribution shape', false],
          ['Duplicate rows', false],
          ['Missing value patterns', false]],
        'The extremes are where the nonsense lives.'),
      mcq('An analysis that edits its own source file:',
        [['Cannot be repeated, which you will be asked to do', true],
          ['Risks corrupting the original data only', false],
          ['Is acceptable with a backup', false],
          ['Runs faster than writing a new file', false]],
        'Load, transform in code, write somewhere new.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_DATA_CLEANING',
    notes: `Cleaning is where analysis becomes defensible or does not. Every change alters the answer,
so every change needs a reason and a record.

**Missing values: understand before deciding.** Is it missing at random, or does the absence mean
something? Customers without a phone number may be the ones who signed up before it was required —
which is a fact about them, not noise.

| Option | When |
|---|---|
| Leave as missing | Most functions skip them, and the gap is informative |
| Drop the rows | Few, random, and not representative of anything |
| Fill with zero | Missing genuinely means none |
| Fill with mean or median | Rarely defensible; it invents data and shrinks variance |
| Fill from another source | Best, when possible |
| Add a "was missing" flag | Keeps the information that it was absent |

**Dropping rows is a decision with consequences.** Drop every row with any missing value and you may
drop half your data and, worse, a *non-random* half — the incomplete records are often systematically
different.

**Duplicates: decide what identifies a row** before removing anything. Two orders with the same
customer, product and timestamp might be a double submission, or might be two genuine identical
purchases.

    df.duplicated(subset=["order_id"]).sum()
    df = df.drop_duplicates(subset=["order_id"], keep="last")

**Inconsistent categories** are the most common cleaning job in real data:

    "Mumbai", "mumbai", "MUMBAI", " Mumbai", "Bombay", "Mumbaii"

Normalise case and whitespace, then map the known variants explicitly. Never fuzzy-match silently —
review the mapping, because "Bombay" to "Mumbai" is correct and some other pair will not be.

**Outliers are not errors.** A total of 50,00,000 might be a data entry mistake or your largest
customer. Investigate before removing, and if you remove it, say so and report both numbers.

**The cleaning log is the deliverable**, not an afterthought:

| Change | Rows affected | Why | Effect on the result |
|---|---|---|---|
| Dropped rows with no customer_id | 412 (0.8%) | Cannot attribute; all from the migration | Revenue down 0.3% |
| Normalised city names | 1,840 | 14 spellings of 5 cities | Chennai now ranks second |

**Without that log your analysis is unreproducible and unverifiable**, which means it is an opinion.
With it, somebody can disagree with a specific decision — which is what makes it work rather than
an assertion.`,
    mcqs: [
      mcq('Filling missing values with the mean is rarely defensible because:',
        [['It invents data', true],
          ['The mean is hard to compute', false],
          ['It changes the row count', false],
          ['Most tools cannot handle it', false]],
        'Leaving it missing is usually more honest.'),
      mcq('Dropping every row with any missing value risks:',
        [['Removing a non-random half', true],
          ['Introducing duplicates', false],
          ['Changing the column types', false],
          ['Breaking the index', false]],
        'Incomplete records are often systematically different.'),
      mcq('"Mumbai", "mumbai" and "Bombay" should be:',
        [['Normalised, then mapped and reviewed', true],
          ['Fuzzy-matched automatically', false],
          ['Left as separate categories', false],
          ['Dropped as unreliable', false]],
        'Some pair in an automatic mapping will be wrong.'),
      mcq('An outlier should be:',
        [['Investigated before any decision to remove it', true],
          ['Removed if beyond three standard deviations', false],
          ['Kept in every case', false],
          ['Replaced with the median', false]],
        'It might be a data entry error or your largest customer.'),
    ],
    checkpoint: [
      mcq('The cleaning log should record, per change:',
        [['What, how many rows, why, and the effect', true],
          ['The code that performed it', false],
          ['The date and the analyst', false],
          ['The column types before and after', false]],
        'The effect column is what makes the decision reviewable.'),
      mcq('An analysis without a cleaning log is:',
        [['An opinion nobody can verify or dispute', true],
          ['Acceptable if the code is available', false],
          ['Reproducible from the output alone', false],
          ['Only a problem for published work', false]],
        'The log is what makes it work rather than an assertion.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_DATA_EXPLORATION',
    notes: `Exploration is looking at what is there before deciding what to ask. Done properly it
changes the question you came with.

**Start with one variable at a time:**

    df["total"].describe()
    df["total"].hist(bins=50)
    df["city"].value_counts()
    df["status"].value_counts(normalize=True)

**The distribution is the thing to look at, not the average.** A mean of 1,200 could be most orders
near 1,200, or most orders at 200 with a few at 50,000. Those are different businesses, and the
histogram tells you which within a second.

**What to look for in a distribution:**

- **Skew** — a long tail on one side, which is normal for money and time
- **Multiple peaks** — usually two populations mixed together, and the most interesting finding
  available at this stage
- **A spike at zero**, or at a round number, which often means a default value rather than real data
- **A cliff** at a round number — a limit, a cap, or a truncated export

**Then two variables:**

    df.groupby("city")["total"].agg(["count", "mean", "median"])
    df.plot.scatter(x="items", y="total")
    df[["total", "items", "discount"]].corr()

**Correlation is not causation**, and at second year that phrase is well worn — but the version that
matters is more specific: a correlation between two variables is often caused by a third you have not
measured. Ice cream sales and drowning both rise in summer.

**Look at time.** Almost every dataset has a trend, a weekly rhythm, and events:

    df.set_index("created_at").resample("W")["total"].sum().plot()

**Let the data suggest questions.** "Why do Tuesdays dip?" "Why does this city have twice the average
order and half the orders?" "What happened in March?" Following one of those is usually more valuable
than the question you were given.

**Write down what you notice as you go**, including what you decide not to pursue. Exploration is
easy to do twice by accident and hard to reconstruct afterwards.`,
    mcqs: [
      mcq('A histogram is more informative than a mean because:',
        [['Very different distributions share the same mean', true],
          ['It is easier to read', false],
          ['It shows the sample size', false],
          ['Means are affected by missing values', false]],
        'Most orders near 1,200, or most at 200 with a few at 50,000.'),
      mcq('Two peaks in a distribution usually indicate:',
        [['Two populations mixed together', true],
          ['A data entry error', false],
          ['Insufficient bins in the histogram', false],
          ['A seasonal effect', false]],
        'The most interesting finding available at this stage.'),
      mcq('A spike at zero or at a round number often means:',
        [['A default value rather than real data', true],
          ['A genuine cluster of small orders', false],
          ['A rounding rule in the source system', false],
          ['A missing value encoded as zero only', false]],
        'Worth checking before it becomes part of an average.'),
      mcq('The precise version of "correlation is not causation" is that:',
        [['A third unmeasured variable often causes both', true],
          ['Correlations are usually coincidental', false],
          ['Causation requires an experiment', false],
          ['Correlation coefficients are unreliable', false]],
        'Ice cream sales and drowning both rise in summer.'),
    ],
    checkpoint: [
      mcq('A cliff at a round number in a distribution suggests:',
        [['A cap, a limit, or a truncated export', true],
          ['A natural boundary in the data', false],
          ['An outlier removal already applied', false],
          ['A sampling artefact', false]],
        'Worth chasing before trusting anything above it.'),
      mcq('Recording what you notice during exploration matters because:',
        [['Easy to redo by accident, hard to reconstruct', true],
          ['It is required for the report', false],
          ['It documents the cleaning decisions', false],
          ['It proves the analysis was thorough', false]],
        'Including what you decided not to pursue.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_DATA_DESCRIPTIVE_STATS',
    notes: `Summarising data is where honest analysis and misleading analysis diverge, usually without
anybody intending the second.

**Mean, median, mode — and when each is right:**

| Statistic | Use when |
|---|---|
| **Mean** | The distribution is roughly symmetric and outliers are meaningful |
| **Median** | It is skewed — income, prices, response times, almost anything about money |
| **Mode** | The data is categories |

**The mean of a skewed distribution is not the typical value.** In a room with nine people earning
₹30,000 and one earning ₹30,00,000, the mean salary is ₹3,27,000 and nobody earns anything like it.
The median, ₹30,000, describes the room.

**Report spread, never a centre alone.** "Average delivery time: 3 days" hides whether every delivery
is 3 days or half are next-day and half take a week. Give a range or a standard deviation, and
better, the quartiles:

    df["delivery_days"].describe()       # count, mean, std, min, 25%, 50%, 75%, max

**Percentiles are what operational people actually use.** "95% of orders ship within 4 days" is a
promise you can make; an average cannot be.

**Always give the count.** "Chennai has the highest average order value" means one thing with 4,000
orders and nothing at all with three. Small groups produce extreme averages by chance, and a table
without counts invites exactly that mistake.

**Percentages need their base.** "Sales up 200%" from two to six is a different story from 2,000 to
6,000. Give the absolute numbers alongside.

**Beware the average of averages.** The mean of per-city average order values is not the overall
average order value unless every city has the same number of orders. Compute from the underlying
rows.

**And Simpson's paradox**, which is worth knowing by name: a trend that appears in every group can
reverse when the groups are combined, because of how the group sizes differ. It is not a curiosity —
it appears in real comparisons of before and after, of A and B, and of branch against branch.

**The honest summary:** a centre, a spread, a count, and a note about the shape. Four numbers, and
almost nobody provides all four.`,
    mcqs: [
      mcq('The median is preferred to the mean for income because:',
        [['A skewed distribution makes the mean untypical', true],
          ['Medians are easier to compute', false],
          ['Income has no outliers', false],
          ['Means require a normal distribution', false]],
        'Nine people at 30,000 and one at 30,00,000 gives a mean nobody earns.'),
      mcq('Reporting an average without a spread hides:',
        [['Whether the values are grouped or spread', true],
          ['The sample size', false],
          ['Whether outliers were removed', false],
          ['The units of measurement', false]],
        '"Average delivery 3 days" could be every order, or half next-day and half a week.'),
      mcq('"Chennai has the highest average order value" is meaningless without:',
        [['The number of orders behind it', true],
          ['The median as well', false],
          ['A comparison to last year', false],
          ['The standard deviation', false]],
        'Small groups produce extreme averages by chance.'),
      mcq('The mean of per-city averages equals the overall mean only when:',
        [['Every city has the same number of orders', true],
          ['The cities have similar distributions', false],
          ['There are no outliers', false],
          ['The data is complete', false]],
        'Otherwise compute from the underlying rows.'),
    ],
    checkpoint: [
      mcq('Simpson\'s paradox describes:',
        [['A trend in every group reversing when combined', true],
          ['A correlation caused by a third variable', false],
          ['An average distorted by outliers', false],
          ['A sample that is not representative', false]],
        'It appears in real before-and-after and branch-against-branch comparisons.'),
      mcq('An honest summary of a variable contains:',
        [['A centre, spread, count and shape', true],
          ['A mean and a standard deviation', false],
          ['A median and a range', false],
          ['A chart and a headline number', false]],
        'Almost nobody provides all four.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_DATA_SQL_FOR_ANALYSIS',
    notes: `SQL written for analysis is a different craft from SQL written for an application. The
question is usually bigger, the query is read by other people, and the answer must be defensible.

**Answer one question per query, and name it:**

    -- Monthly revenue and order count, paid orders only, last 12 months
    SELECT DATE_TRUNC('month', created_at) AS month,
           COUNT(*)                        AS orders,
           SUM(total)                      AS revenue,
           SUM(total) / COUNT(*)           AS avg_order_value
    FROM orders
    WHERE status = 'paid'
      AND created_at >= NOW() - INTERVAL '12 months'
    GROUP BY 1
    ORDER BY 1;

**Build with CTEs, in steps you can check:**

    WITH paid AS (
      SELECT * FROM orders WHERE status = 'paid'
    ), per_customer AS (
      SELECT customer_id, COUNT(*) AS orders, SUM(total) AS spent
      FROM paid GROUP BY customer_id
    )
    SELECT ... FROM per_customer ...

Each step is runnable alone, which is how you verify a long query rather than hoping.

**Window functions are the analysis tool SQL adds**, and they are worth the hour they take to learn:

    SELECT month, revenue,
           LAG(revenue) OVER (ORDER BY month)                    AS prev_month,
           revenue - LAG(revenue) OVER (ORDER BY month)          AS change,
           AVG(revenue) OVER (ORDER BY month ROWS 2 PRECEDING)   AS rolling_3m,
           RANK() OVER (PARTITION BY city ORDER BY revenue DESC) AS rank_in_city
    FROM monthly;

Month-on-month change, rolling averages and ranking within a group are three of the most-asked
analysis questions, and each is one line.

**The missing-period problem, again**, because it matters most here: a month with no orders does not
appear, and a chart drawn from that silently omits it. Generate the periods and left-join:

    SELECT g.month, COALESCE(SUM(o.total), 0) AS revenue
    FROM generate_series(...) AS g(month)
    LEFT JOIN orders o ON DATE_TRUNC('month', o.created_at) = g.month
    GROUP BY g.month ORDER BY g.month;

**Check the grain after every join.** A join to a table with several matching rows multiplies your
totals, and it is the commonest reason an analysis number is too large.

**Comment the business logic**, not the SQL. "Excludes internal test accounts (customer_id < 100)"
is worth ten lines explaining what GROUP BY does.

**Save your queries in a repository.** "How did we calculate that last quarter?" is asked
constantly, and a folder of named, commented queries answers it in seconds.`,
    mcqs: [
      mcq('CTEs are preferred for analysis queries because:',
        [['Each step can be run and checked alone', true],
          ['They execute faster than subqueries', false],
          ['They allow window functions', false],
          ['They avoid the need for joins', false]],
        'Which is how you verify a long query rather than hoping.'),
      mcq('`LAG(revenue) OVER (ORDER BY month)` gives you:',
        [['The previous month on the same row', true],
          ['A running total', false],
          ['A rank within each month', false],
          ['The average over all months', false]],
        'Month-on-month change becomes one line.'),
      mcq('A month with no orders is missing from a grouped report unless:',
        [['You generate the periods and join', true],
          ['You use COALESCE on the sum', false],
          ['You add a HAVING clause', false],
          ['You order by month explicitly', false]],
        'A chart drawn from the grouped result silently omits it.'),
      mcq('The commonest reason an analysis number is too large is:',
        [['A join multiplying rows before the aggregate', true],
          ['An incorrect date filter', false],
          ['Missing values counted as zero', false],
          ['Integer division rounding', false]],
        'Check the grain after every join.'),
    ],
    checkpoint: [
      mcq('Comments in an analysis query should explain:',
        [['The business logic behind a filter', true],
          ['What each SQL clause does', false],
          ['The expected row count', false],
          ['Which tables are joined', false]],
        'The SQL is visible; the reason for a filter is not.'),
      mcq('Saving analysis queries in a repository answers:',
        [['How something was calculated last quarter', true],
          ['"Which tables are available?"', false],
          ['"Why is this query slow?"', false],
          ['"Who has access to this data?"', false]],
        'A question asked constantly, and answerable in seconds.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_DATA_VISUALISATION',
    notes: `A chart is an argument. Choosing it badly, or scaling it badly, makes an argument you did
not intend.

**Choose the chart from the question:**

| Question | Chart |
|---|---|
| How has this changed over time? | Line |
| How do these categories compare? | Bar, sorted by value |
| How is this distributed? | Histogram or box plot |
| Do these two things move together? | Scatter |
| What are the parts of a whole? | Stacked bar — and rarely a pie |

**Pie charts fail at their one job.** People compare angles badly, and a pie with more than four
slices is unreadable. A sorted bar chart shows the same data and can actually be read.

**Bar charts start at zero. Always.** A truncated axis turns a 3% difference into a visual doubling,
and that is the single most common way a chart lies — often without anybody deciding to.

**Line charts may truncate**, because they show change rather than magnitude — but say so on the
axis.

**Sort bars by value**, not alphabetically, unless the order carries meaning (months, sizes). The
reader is asking which is biggest, and sorting answers it before they read a label.

**Label directly** where you can. A legend makes the eye travel back and forth; a label at the end of
each line does not.

**Keep the ink for the data.** Gridlines faint, no 3D, no gradients, no background image. Every
decoration competes with the thing you are showing.

**Colour carries meaning or it should not be there.** Six colours for six bars that are already
labelled is noise; one highlighted bar among grey ones is an argument. And check it works for
colourblind readers, who are about one in twelve men.

**Title the finding, not the data.** "Revenue by month" describes the axes. "Revenue fell 18% after
the March price change" is what you are actually saying — and if you cannot write that title, you may
not have a finding yet.

**Annotate the events.** A vertical line marking a launch, an outage or a price change turns a chart
somebody must interpret into one that explains itself.

**Show the count** when charting averages, and consider showing the spread. An average bar chart over
groups of wildly different sizes is confident and misleading.`,
    mcqs: [
      mcq('Bar charts must start at zero because:',
        [['A truncated axis exaggerates a difference', true],
          ['Convention requires it', false],
          ['Charting libraries assume it', false],
          ['Negative values would be hidden', false]],
        'The most common way a chart lies, often unintentionally.'),
      mcq('Pie charts are discouraged because:',
        [['People compare angles badly', true],
          ['They cannot show percentages', false],
          ['They require more space', false],
          ['They cannot be sorted', false]],
        'A sorted bar chart shows the same data readably.'),
      mcq('A chart title should state:',
        [['The finding, not the axes', true],
          ['The data source and period', false],
          ['The chart type and variables', false],
          ['The question being answered', false]],
        'If you cannot write that title, you may not have a finding yet.'),
      mcq('Bars should be sorted by value rather than alphabetically because:',
        [['The reader is asking which is biggest', true],
          ['Alphabetical order is harder to render', false],
          ['It reduces the number of labels', false],
          ['It makes the axis shorter', false]],
        'Unless the order itself carries meaning, like months.'),
    ],
    checkpoint: [
      mcq('Six colours for six already-labelled bars is:',
        [['Noise; one highlighted bar is an argument', true],
          ['Good practice for distinguishing categories', false],
          ['Required for accessibility', false],
          ['Neutral, since colour is decorative', false]],
        'Colour should carry meaning or not be there.'),
      mcq('Annotating a chart with a vertical line at a launch date:',
        [['Turns a chart into one that explains itself', true],
          ['Is a decoration best avoided', false],
          ['Replaces the need for a title', false],
          ['Should only be used for outages', false]],
        'The event is usually the reason for the shape.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_DATA_DATA_QUALITY',
    notes: `Before anybody acts on your number, you have to believe it yourself. This unit is the set
of checks that stand between an analysis and an embarrassment.

**The plausibility check, first and cheapest.** Does the magnitude make sense? If revenue for the
month is ₹40 lakh and the business does about ₹5 lakh, something is wrong — and it is almost always
you, not the business.

**Reconcile against something known.** Compare your total to the finance figure, your customer count
to the CRM, last month's number to what was reported last month. A number that matches an independent
source is a number you can defend.

**Recompute a different way.** Get the same answer with a different query, a different tool, or by
hand for one small slice. Two methods agreeing is real evidence; one method is a claim.

**Check one record end to end.** Pick a single customer, follow them from the raw data through every
transformation to the final number, and verify by hand. This finds grain errors, join multiplication
and filter mistakes faster than anything else.

**The specific checks worth running every time:**

- Row counts at each stage — where did rows disappear or multiply?
- Totals before and after each join
- The date range of the output against what was asked for
- Nulls in the final output, and whether they should be there
- The extremes — the largest and smallest values in the result
- Percentages that should sum to 100, and do not

**Know when not to answer.** Sometimes the honest output is: "This data cannot answer that question,
because it does not contain cancelled orders" or "I can give you a number but the March data is
incomplete, so the trend is not reliable". That answer is far more valuable than a confident wrong
one, and it is what distinguishes an analyst from a report generator.

**State your assumptions with the number.** "Revenue was ₹12.4 lakh, excluding cancelled and internal
orders, for orders created rather than shipped in the period." Every one of those clauses changes the
number, and somebody will eventually ask about each.

**If you find you were wrong, say so immediately.** A corrected number costs credibility once; a
wrong number people have acted on costs far more, for far longer.`,
    mcqs: [
      mcq('An implausible magnitude in your result is almost always:',
        [['A mistake in your analysis, not in the business', true],
          ['A genuine anomaly worth reporting', false],
          ['A data quality issue at the source', false],
          ['A rounding or unit problem', false]],
        'Check yourself before you report something surprising.'),
      mcq('Following one customer end to end through the analysis finds:',
        [['Grain, join and filter mistakes', true],
          ['Missing values in the source', false],
          ['Performance problems in the query', false],
          ['Bias in the data collection', false]],
        'Faster than any other single check.'),
      mcq('Computing the same answer a second way gives you:',
        [['Evidence rather than a claim', true],
          ['A confidence interval', false],
          ['Protection against source data errors', false],
          ['A faster query', false]],
        'Two methods agreeing is real evidence.'),
      mcq('"This data cannot answer that question" is:',
        [['More valuable than a confident wrong answer', true],
          ['An admission of insufficient skill', false],
          ['Acceptable only when data is missing entirely', false],
          ['A last resort after trying alternatives', false]],
        'It distinguishes an analyst from a report generator.'),
    ],
    checkpoint: [
      mcq('Assumptions should be stated with the number because:',
        [['Each clause changes it, and somebody will ask', true],
          ['It is required by reporting standards', false],
          ['It shortens the methodology section', false],
          ['Readers expect qualifications', false]],
        '"Excluding cancelled orders, by creation date" is part of the answer.'),
      mcq('On discovering your reported number was wrong, you should:',
        [['Say so immediately', true],
          ['Correct it quietly in the next report', false],
          ['Verify the correction thoroughly first', false],
          ['Assess whether anybody acted on it', false]],
        'A wrong number people have acted on costs far more, for far longer.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_DATA_DEBUGGING',
    notes: `A wrong analysis produces a number, not an error. These are the shapes, and where each
one comes from.

**The number is far too large.** A join multiplied rows. Count rows before and after each join; the
one that grew unexpectedly is your answer.

**The number is far too small.** An inner join dropped unmatched rows, a filter excluded more than
intended, or a NULL comparison quietly removed everything with a missing value.

**Two reports disagree.** Almost always different definitions: created date against shipped date,
including cancelled or not, one timezone against another, "customer" meaning account or person.
Compare the definitions before comparing the numbers, and nine times in ten the numbers were both
right.

**A period is missing from a chart.** Grouping produces only periods that have rows.

**Percentages do not sum to 100.** Rounding, or a category everything else falls into that you did
not include, or rows counted twice.

**A trend that reverses when you split the data.** Simpson's paradox — check the group sizes.

**The result changed since yesterday and nothing changed.** Late-arriving data, a source that
backfills, a relative date range that has moved, or a non-deterministic query with a tie in its
ordering.

**Everything looks right and one number is impossible.** Follow that single record back through every
step. The stage where it stops making sense is the bug.

**The tools:**

    df.shape                                  # after every transformation
    df["id"].duplicated().sum()               # multiplication check
    df.groupby("x").size().sort_values()      # tiny groups behind extreme averages
    df.isna().sum()                           # where nulls entered

**The discipline that prevents most of this: check the row count after every step.** An analysis
notebook with \`df.shape\` after each transformation catches multiplication and loss at the moment it
happens, rather than at the end when the cause is twenty steps back.

**And when a result surprises you, assume you are wrong first.** The chance that you made a mistake
is much higher than the chance that a business changed by 400% and nobody noticed. That assumption is
the single most valuable habit in this track.`,
    mcqs: [
      mcq('Two reports giving different numbers is almost always:',
        [['Different definitions rather than a calculation error', true],
          ['A data quality problem at the source', false],
          ['A timezone bug in one of them', false],
          ['A stale cache in one report', false]],
        'Compare the definitions and nine times in ten both numbers were right.'),
      mcq('A result that changed overnight with no code change suggests:',
        [['Late data, or a moving date range', true],
          ['A corrupted source file', false],
          ['A library version upgrade', false],
          ['A permissions change', false]],
        'Also a non-deterministic query with a tie in its ordering.'),
      mcq('Checking `df.shape` after every transformation catches:',
        [['Multiplication and loss as it happens', true],
          ['Type conversion errors', false],
          ['Missing values entering the data', false],
          ['Incorrect aggregation logic', false]],
        'Rather than at the end, twenty steps from the cause.'),
      mcq('When a result surprises you, the right first assumption is:',
        [['That you made a mistake', true],
          ['That the business genuinely changed', false],
          ['That the source data is wrong', false],
          ['That the tool has a bug', false]],
        'The single most valuable habit in this track.'),
    ],
    checkpoint: [
      mcq('Percentages not summing to 100 can be caused by:',
        [['Rounding, a missing category, or double counting', true],
          ['An incorrect denominator only', false],
          ['Floating point precision alone', false],
          ['Null values in the grouping column', false]],
        'Check which before adjusting anything.'),
      mcq('An impossible single value among correct ones should be:',
        [['Followed back until it stops making sense', true],
          ['Removed as an outlier', false],
          ['Reported as a data quality issue', false],
          ['Compared against the source system', false]],
        'The stage where it stops making sense is where the bug is.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_DATA_PRACTICE',
    notes: `No new ideas. Answer real questions from real data until the checks are automatic.

**Use genuinely messy public data** — government portals, Kaggle, a data export you have. Clean
teaching datasets remove exactly what this track is about.

**Do these:**

1. **State the grain.** Take three datasets and write down, in a sentence each, what one row
   represents and what the blanks mean. Verify by counting something you can check.
2. **Clean with a log.** Clean one dataset properly, recording every change, how many rows it
   touched, and its effect on your headline number.
3. **Explore before asking.** Take a dataset with no question attached, explore it, and write down
   the three most interesting things you found and why they matter.
4. **Answer the same question two ways** — in SQL and in pandas — and reconcile any difference. There
   usually is one.
5. **Find your own wrong number.** Deliberately build an analysis with a join that multiplies rows,
   observe the inflated total, then fix it and measure the difference.
6. **Fix a misleading chart.** Take a chart with a truncated axis, a pie with nine slices, or
   alphabetical bars, and rebuild it honestly. Put them side by side.
7. **Reconcile against a source.** Compute something you can check independently, and account for
   every unit of difference.
8. **Write one finding for a non-technical reader.** One page: what you found, what it means, what
   you are not sure about.

**Record for each:** what you expected, what the data actually showed, and what check caught your
mistake.

**The standard this set aims at:** anybody can produce a number. The skill is being able to say why
it is right, what it excludes, and how confident you are.`,
    mcqs: [
      mcq('Clean teaching datasets are unsuitable for this practice because:',
        [['They remove exactly what the track is about', true],
          ['They are too small', false],
          ['They lack interesting questions', false],
          ['They are already analysed elsewhere', false]],
        'Inconsistent categories, missing values and odd grain are the subject.'),
      mcq('Answering a question in SQL and in pandas usually reveals:',
        [['A difference, which then has to be reconciled', true],
          ['That one tool is more accurate', false],
          ['A performance gap between them', false],
          ['That the question was ambiguous', false]],
        'Reconciling the difference is the exercise.'),
      mcq('Deliberately building a row-multiplying join teaches you:',
        [['What an inflated total looks like', true],
          ['How to write better joins', false],
          ['Which join types to avoid', false],
          ['How to optimise a slow query', false]],
        'Recognition is the skill.'),
      mcq('Reconciling against an independent source requires you to:',
        [['Account for every unit of difference', true],
          ['Match the number exactly', false],
          ['Use the same tool as the source', false],
          ['Explain any difference over five per cent', false]],
        'An unexplained gap is an unfinished reconciliation.'),
      mcq('The standard this practice set aims at is being able to say:',
        [['Why it is right, and how confident you are', true],
          ['What the number is, with a chart', false],
          ['Which method produced it', false],
          ['How long the analysis took', false]],
        'Anybody can produce a number.'),
    ],
    checkpoint: [
      mcq('Exploring a dataset with no question attached practises:',
        [['Letting the data suggest the question', true],
          ['Faster data loading', false],
          ['Working without requirements', false],
          ['Generating more charts', false]],
        'Often more valuable than the question you were given.'),
      mcq('Writing a finding for a non-technical reader must include:',
        [['What you are not sure about', true],
          ['The methodology in full', false],
          ['The code that produced it', false],
          ['A comparison with other analyses', false]],
        'What you found, what it means, and where the uncertainty is.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_DATA_MINI_PROJECT',
    notes: `A complete analysis of a real dataset, from a question to a conclusion somebody could act
on — with every number defensible.

**Why end to end.** The track has taught the stages; this proves you can carry a question through all
of them without losing the grain, the caveats or the audience. It is also exactly the shape of the
work an employer will give you in your first month.

**What is being assessed:** that the question is answerable from this data, that the cleaning is
logged and justified, that the numbers reconcile, that the charts are honest, and that the
uncertainty is stated rather than hidden.

**Build it in this order:**

1. **The question**, written precisely, including what would count as an answer.
2. **The data**, understood: grain, columns, gaps, and what it cannot tell you.
3. **Cleaning**, logged as you go.
4. **Exploration**, before analysis, recorded.
5. **The analysis**, verified two ways.
6. **The communication**: charts, the written finding, the limitations.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Project — An Analysis You Can Defend',
      description: 'Answer a real question from a messy real dataset, with a logged cleaning process, reconciled numbers, honest charts and a stated uncertainty.',
      instructions: `**The brief**

Take a **real, messy dataset** of at least 20,000 rows — a public dataset, an organisation's export,
or data you collect — and answer a genuine question with it.

The question must be one somebody would actually ask, and one where the answer could change a
decision.

**Requirements**

1. **A question statement** written first: the question, why it matters, what would count as an
   answer, and what result would change somebody's mind.
2. **A data understanding note**: the grain in a sentence, every column's meaning, what blanks mean
   per column, and what the dataset cannot answer.
3. **A cleaning log**: every change, rows affected, the reason, and its effect on the headline
   number.
4. **An exploration record**: what you looked at before analysing, and what changed your approach.
5. **The analysis**, answering the question, computed **two independent ways** with any difference
   reconciled.
6. **At least four charts**, each chosen from its question, honest axes, titles stating findings, and
   counts shown where averages are charted.
7. **Three verification checks**, including one record traced end to end by hand.
8. **A written report for a non-technical reader** (600–900 words): the finding, what it means, the
   caveats, and what you would recommend.
9. **A limitations section** naming what the data could not tell you and what would be needed.
10. **Reproducible code**: a clean clone with the raw data untouched, running end to end.

**What to submit**

1. The code and the report.
2. The **question statement** and the **data understanding note**.
3. The **cleaning log** and the **exploration record**.
4. The **verification evidence**, including the hand-traced record.
5. The **charts**, with a note on why each was chosen.
6. A **short write-up** (300–400 words): the moment the data said something other than you expected;
   the cleaning decision that changed the answer most; what you would collect differently if you
   controlled the source.

**Constraints**

- The raw data is never modified. All transformation in code.
- No number in the report without a check behind it.
- No chart with a truncated bar axis, and no pie chart with more than four slices.

**Where the marks are.** The cleaning log, the verification, and the limitations. A plausible number
with a chart is what everybody produces; a number you can defend under questioning, with its
uncertainty stated, is an analyst.`,
      rubric: [
        {
          criterion: 'Question and data understanding',
          description: 'A genuine answerable question stated first; grain and column meanings documented; what the data cannot answer named honestly.',
          maxPoints: 20,
        },
        {
          criterion: 'Cleaning and rigour',
          description: 'Every change logged with rows affected, reason and effect; decisions defensible rather than automatic.',
          maxPoints: 25,
        },
        {
          criterion: 'Analysis and verification',
          description: 'Computed two independent ways with differences reconciled; three checks including one hand-traced record; grain preserved through joins.',
          maxPoints: 25,
        },
        {
          criterion: 'Communication',
          description: 'Four or more charts chosen from their questions with honest axes and finding-led titles; report readable by a non-technical audience.',
          maxPoints: 20,
        },
        {
          criterion: 'Limitations and write-up',
          description: 'Uncertainty stated rather than hidden; an honest account of a surprising result and of the most influential cleaning decision.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },
];
