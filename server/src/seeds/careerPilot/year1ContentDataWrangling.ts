/**
 * T_DATA_WRANGLING — nine units. DIRECTION: DATA.
 *
 * ── WHY THIS TOPIC EXISTS ─────────────────────────────────────────────────────────────────
 *
 * Data and AI/ML shared exactly the same direction units — matrices, statistics and an ML
 * introduction — so a student who chose Data received the identical plan to one who chose AI.
 * This topic is what a data student does that an ML student does not lead with: get a real, messy
 * table into shape and answer a question with it honestly.
 *
 * ── THE LINE THIS TOPIC HOLDS ─────────────────────────────────────────────────────────────
 *
 * Most introductions go straight to charts. Real datasets arrive with gaps, duplicates and numbers
 * stored as text, and an analysis built on them is wrong however good the chart looks. So the
 * order is deliberate: look, clean, then answer — and every change is recorded. pandas in Google
 * Colab, so nothing needs installing.
 *
 * Seeded as DRAFT. Nothing here reaches a student until an admin reviews and publishes it.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const DATA_WRANGLING_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T_DATA_WRANGLING_TABLES_AND_CSV',
    notes: `Almost all the data you will analyse arrives as a **table**: rows and columns.

**The single most important question about any dataset: what does one row represent?**

| Dataset | One row is |
|---|---|
| Student marks | One student, or one student in one subject? |
| Sales | One order, or one item within an order? |
| Weather | One day, or one hour, at one station? |

Get this wrong and every count is wrong. If a row is one *item in an order*, counting rows counts
items, not orders — and "number of orders" comes out several times too high.

**Columns are the properties of that thing**, and each column should hold one kind of value:
all numbers, all dates, all categories. A column that mixes "12", "twelve" and "N/A" is a cleaning
job waiting for you.

**Two kinds of columns you will treat differently:**

- **Numerical** — marks, price, temperature. You can average them.
- **Categorical** — city, subject, grade. You count and group them; averaging "city" means nothing.

Some columns look numerical and are not: a PIN code or a roll number is a label made of digits.
Averaging roll numbers produces a number that means nothing at all.

**CSV — comma-separated values.** The most common file format, and plain text:

    name,city,marks
    Asha,Pune,82
    Ravi,Chennai,74

Simple, readable, opened by everything. **And fragile:**

- A value containing a comma (\`"Hyderabad, Telangana"\`) must be quoted, or it splits into two columns.
- There is no type information — every value is text until something interprets it.
- Excel may quietly change values when opening one: long numbers into scientific notation,
  leading zeros dropped, text that looks like a date turned into a date.

**The habit to build now:** before any analysis, write one sentence — "each row is one ___,
and there are ___ columns describing it". It takes ten seconds and prevents the most expensive
mistake in the whole subject.`,
    mcqs: [
      mcq('An orders file has one row per item bought. Counting rows gives you:',
        [['The number of items, not the number of orders', true],
          ['The number of orders, as each row is an order', false],
          ['The number of customers who placed an order', false],
          ['The total value of everything that was sold', false]],
        'Which is why "what does one row represent?" comes before any counting.'),
      mcq('Which column is categorical even though it contains only digits?',
        [['PIN code', true], ['Price', false], ['Temperature', false], ['Marks', false]],
        'A PIN code is a label. Averaging it produces a number with no meaning.'),
      mcq('In a CSV, why must "Hyderabad, Telangana" be wrapped in quotes?',
        [['Otherwise its comma splits it into two columns', true],
          ['CSV files cannot store any capital letters', false],
          ['Place names must always be quoted in CSV', false],
          ['Quotes make the value load as a number', false]],
        'The comma is the separator. A value containing one must be quoted to stay in a single column.'),
      mcq('What type information does a plain CSV file carry?',
        [['None — every value is text until interpreted', true],
          ['A type for every column in the first row', false],
          ['Numbers and dates are marked automatically', false],
          ['A separate schema at the end of the file', false]],
        'That is why loading a CSV includes checking which types each column was given.'),
    ],
    checkpoint: [
      mcq('What should you establish before any analysis of a new dataset?',
        [['What one row represents, and what each column holds', true],
          ['Which chart will look best in the final report', false],
          ['How large the file is in megabytes on the disk', false],
          ['Which column name is the longest in the table', false]],
        'Every later count, average and chart depends on it.'),
      mcq('Opening a CSV of phone numbers in Excel may:',
        [['Change values, for example into scientific notation', true],
          ['Leave every value exactly as it was in the file', false],
          ['Refuse to open it because numbers are too long', false],
          ['Convert every phone number into a date value', false]],
        'Spreadsheet tools interpret as they open. Load data with code when exactness matters.'),
    ],
  },
  {
    unitCode: 'T_DATA_WRANGLING_LOADING',
    notes: `Open **colab.research.google.com**, start a new notebook, and load a file:

    import pandas as pd

    df = pd.read_csv("students.csv")

In Colab, upload the file with the folder icon on the left, or read one straight from a URL.
\`df\` is a **DataFrame** — pandas' table.

**Look before touching.** Five checks, every time, before any analysis:

    df.shape          # (rows, columns)
    df.head()         # the first five rows
    df.dtypes         # the type pandas gave each column
    df.isna().sum()   # missing values per column
    df.describe()     # count, mean, min, max... for numeric columns

**What each one catches:**

| Check | Finds |
|---|---|
| \`shape\` | Far fewer rows than expected — the file was cut off, or loaded wrongly |
| \`head()\` | Headers in the wrong row, columns split in the wrong place |
| \`dtypes\` | A numeric column loaded as \`object\` (text) — one bad value somewhere |
| \`isna().sum()\` | Gaps, and which columns have them |
| \`describe()\` | Impossible values: marks of 850, an age of -3, a max of 99999 |

**The most useful surprise is \`dtypes\`.** If \`marks\` shows \`object\` instead of \`int64\` or
\`float64\`, at least one value is not a number — "absent", "12 ", or "N/A". pandas then treats the
whole column as text, and \`df["marks"].mean()\` fails or, worse, does something unexpected.

**\`describe()\` finds data-entry errors fast.** A \`max\` of 999 in a marks-out-of-100 column is
almost always a placeholder someone used for "missing". Averaging it in drags every result up.

**Picking columns and rows:**

    df["marks"]                 # one column
    df[["name", "marks"]]       # several columns
    df.iloc[0]                  # the first row, by position

**Never edit the original file.** Load it, and do every change in code. The notebook then
records exactly what you did, and anyone — including you next week — can re-run it and get the
same result.`,
    mcqs: [
      mcq('`df.dtypes` shows the marks column as `object`. This most likely means:',
        [['At least one value in it is not a number', true],
          ['The column contains only whole numbers', false],
          ['pandas could not open the file at all', false],
          ['The column is the index of the table', false]],
        'One "absent" or "N/A" makes pandas load the whole column as text.'),
      mcq('Which check reveals a marks-out-of-100 column with a maximum of 999?',
        [['df.describe()', true], ['df.head()', false], ['df.shape', false], ['df.columns', false]],
        'describe shows min and max, which is where impossible values and placeholders show up.'),
      mcq('Why do the changes in code rather than editing the CSV by hand?',
        [['The notebook records every step and can be re-run', true],
          ['pandas cannot read a file that was edited', false],
          ['Editing a CSV by hand deletes its header row', false],
          ['Code changes make the file smaller on disk', false]],
        'Reproducibility: anyone can see and repeat exactly what was done to the raw data.'),
      mcq('What does `df.isna().sum()` report?',
        [['The number of missing values in each column', true],
          ['The total of every numeric column in the table', false],
          ['The number of rows that are exact duplicates', false],
          ['The number of columns that contain text values', false]],
        'isna marks each missing cell; sum counts them per column.'),
    ],
    checkpoint: [
      mcq('A file should have 5,000 rows, but df.shape shows (312, 4). You should first suspect:',
        [['The file was cut off or loaded incorrectly', true],
          ['The analysis only needs the first 312 rows', false],
          ['pandas always samples large files by default', false],
          ['The other rows were duplicates and got removed', false]],
        'shape is the first sanity check precisely because a truncated load looks like a normal table.'),
      mcq('Which is the correct order when meeting a new dataset?',
        [['Load, look with the five checks, then clean', true],
          ['Load, draw charts, then check the data types', false],
          ['Clean by hand in Excel, then load it with pandas', false],
          ['Draw charts, then load it, then look at it', false]],
        'Looking first is what tells you what cleaning is needed.'),
    ],
  },
  {
    unitCode: 'T_DATA_WRANGLING_CLEANING',
    notes: `Real data is messy in the same few ways, again and again. Cleaning is fixing those
ways deliberately — and writing down what you did.

**1. Missing values.** First find out *why* they are missing. The choices:

    df["marks"].isna().sum()             # how many
    df = df.dropna(subset=["marks"])     # drop rows missing marks
    df["city"] = df["city"].fillna("Unknown")

- **Drop** when few are missing and they are missing at random.
- **Fill** with a clear label for categories ("Unknown").
- **Be careful filling numbers with the mean.** It hides the gap and shrinks the spread. If 30%
  of incomes are missing, filling them with the average invents 30% of your data.

**2. Duplicates.**

    df.duplicated().sum()
    df = df.drop_duplicates()

Check first whether they are real duplicates or two genuine records that happen to look the same
— two students called Priya in the same city are not a duplicate.

**3. Wrong types.** Numbers stored as text, often because of one bad value:

    df["marks"] = pd.to_numeric(df["marks"], errors="coerce")

\`errors="coerce"\` turns anything unconvertible into a missing value — which you then see in
\`isna()\` and handle on purpose, rather than it silently breaking later.

**4. Inconsistent labels.** "Pune", "pune", " Pune" and "PUNE" are four cities to a computer:

    df["city"] = df["city"].str.strip().str.title()

**5. Impossible values.** A mark of 999, an age of -3. Decide the rule, then apply it:

    df = df[(df["marks"] >= 0) & (df["marks"] <= 100)]

**Keep a cleaning log.** For every step: what you changed, how many rows it affected, and why.

| Step | Rows affected | Why |
|---|---|---|
| Dropped rows missing marks | 14 | Marks is the value being analysed |
| Standardised city case | 203 | Same city spelled four ways |
| Removed marks above 100 | 3 | Placeholder 999 used for absent |

The log is what makes a conclusion believable. Without it, nobody — including you — can tell
whether a surprising result came from the data or from the cleaning.`,
    mcqs: [
      mcq('Why is filling many missing incomes with the average risky?',
        [['It invents data and makes the spread look smaller', true],
          ['pandas cannot calculate the mean of a column', false],
          ['The average is always larger than any income', false],
          ['Filled values are deleted when the file is saved', false]],
        'Every filled value sits exactly at the mean, so variation shrinks and the gap becomes invisible.'),
      mcq('What does `pd.to_numeric(col, errors="coerce")` do with the value "absent"?',
        [['Turns it into a missing value', true], ['Turns it into zero', false],
          ['Stops with an error', false], ['Leaves it as text', false]],
        'The value becomes NaN, which you then see and handle on purpose.'),
      mcq('"Pune", " pune" and "PUNE" appear in the city column. The fix is:',
        [['Strip spaces and standardise the case', true],
          ['Delete every row that is not spelled "Pune"', false],
          ['Leave them, since they mean the same city', false],
          ['Replace the column with numbers for each city', false]],
        'To a computer they are three different values, so every count by city would be split.'),
      mcq('Two rows share a name and city. Before dropping one as a duplicate you should:',
        [['Check whether they are genuinely the same record', true],
          ['Drop both, since neither can be trusted now', false],
          ['Keep whichever row has the longer name value', false],
          ['Merge them by adding their numbers together', false]],
        'Two real people can share a name and a city. Duplicates are identical records, not similar ones.'),
    ],
    checkpoint: [
      mcq('What is the purpose of a cleaning log?',
        [['To show exactly what changed, how much, and why', true],
          ['To store a backup copy of all the deleted rows', false],
          ['To speed up the analysis when it is re-run later', false],
          ['To prove the dataset had no problems to begin with', false]],
        'It lets anyone judge whether a result came from the data or from the cleaning.'),
      mcq('A marks column contains 999 for students who were absent. Before averaging you should:',
        [['Treat 999 as missing, not as a real mark', true],
          ['Include it, as it was recorded in the file', false],
          ['Replace it with 100, the highest real mark', false],
          ['Divide it by ten so it fits the marks range', false]],
        'A placeholder averaged in as a real value drags the result up for no reason at all.'),
    ],
  },
  {
    unitCode: 'T_DATA_WRANGLING_FILTER_AND_SORT',
    notes: `Most questions about data are questions about **which rows**, in **what order**.

**Filtering** keeps the rows that match a condition:

    df[df["marks"] >= 75]
    df[df["city"] == "Pune"]
    df[(df["city"] == "Pune") & (df["marks"] >= 75)]   # and
    df[(df["city"] == "Pune") | (df["city"] == "Delhi")]  # or
    df[df["city"].isin(["Pune", "Delhi"])]               # same, tidier

Note the \`&\` and \`|\` (not \`and\`/\`or\`), and the **brackets around each condition** — leave
them out and Python evaluates the parts in the wrong order and raises an error.

**Sorting:**

    df.sort_values("marks", ascending=False)             # highest first
    df.sort_values(["city", "marks"], ascending=[True, False])
    df.nlargest(5, "marks")                               # top five

**Turning a question into code, step by step.** "Which Pune students scored above 75, best
first?"

1. Which rows? City is Pune, marks above 75.
2. What order? Marks, highest first.
3. Which columns does the answer need? Name and marks.

    (df[(df["city"] == "Pune") & (df["marks"] > 75)]
       .sort_values("marks", ascending=False)[["name", "marks"]])

**Then sanity-check the answer.** Does the number of rows seem plausible? Is the top value
possible? If "students above 75" returns every single row, the condition is probably wrong — or
the column is text and the comparison is not doing what you think.

**Words in the question matter.** "Above 75" is \`> 75\`; "75 or more" is \`>= 75\`. The difference
changes who is counted, and a report built on the wrong one is quietly wrong.

**Filtering does not change \`df\`** unless you assign the result: \`top = df[df["marks"] > 75]\`.
Forgetting this and wondering why nothing changed is the most common beginner surprise.`,
    mcqs: [
      mcq('Which filter keeps Pune students with marks of 75 or more?',
        [['df[(df["city"] == "Pune") & (df["marks"] >= 75)]', true],
          ['df[df["city"] == "Pune" and df["marks"] >= 75]', false],
          ['df[(df["city"] == "Pune") | (df["marks"] >= 75)]', false],
          ['df[(df["city"] = "Pune") & (df["marks"] >= 75)]', false]],
        'pandas uses & with brackets round each condition; | would keep anyone matching either one.'),
      mcq('How do you sort so the highest marks come first?',
        [['df.sort_values("marks", ascending=False)', true],
          ['df.sort_values("marks")', false],
          ['df.sort("marks", reverse=True)', false],
          ['df.order_by("marks", "desc")', false]],
        'The default is ascending, lowest first; ascending=False reverses it.'),
      mcq('You filter `df[df["marks"] > 75]` but df still has every row. Why?',
        [['The filtered result was never assigned to anything', true],
          ['Filters only work on columns that are sorted', false],
          ['pandas ignores filters on numeric columns', false],
          ['The comparison should use >= instead of >', false]],
        'Filtering returns a new table. Keep it with top = df[df["marks"] > 75].'),
      mcq('"Students scoring above 75" should be written as:',
        [['marks > 75', true], ['marks >= 75', false], ['marks == 75', false], ['marks < 75', false]],
        'Above excludes 75 itself; "75 or more" would include it. The wording decides who is counted.'),
    ],
    checkpoint: [
      mcq('A filter for "marks above 90" returns every row. The most likely cause is:',
        [['The marks column is text, so the comparison is wrong', true],
          ['Every student genuinely scored more than ninety', false],
          ['The filter must be applied twice to take effect', false],
          ['pandas returns all rows when a filter is too strict', false]],
        'An implausible result is a signal to check types and the condition before believing it.'),
      mcq('Which gives the five highest-scoring students?',
        [['df.nlargest(5, "marks")', true], ['df.head(5)', false],
          ['df.sample(5)', false], ['df.tail(5)', false]],
        'head gives the first five rows in whatever order the file had, not the top five.'),
    ],
  },
  {
    unitCode: 'T_DATA_WRANGLING_GROUPING',
    notes: `Many questions are about **groups**: average marks per city, number of orders per
month, highest sale per product. That is \`groupby\`.

    df.groupby("city")["marks"].mean()
    df.groupby("city")["marks"].agg(["count", "mean", "median", "max"])
    df["city"].value_counts()        # how many rows per city

**Read a groupby as a sentence:** "split the table by city, take the marks column in each part,
and compute the mean". Split, pick, summarise.

**Always look at the count beside any average.** A city with an average of 95 looks best — until
you see it has 2 students while the others have 200. Small groups produce extreme averages by
chance.

    df.groupby("city")["marks"].agg(["count", "mean"])

**Mean or median?**

| Situation | Use |
|---|---|
| Values roughly symmetric, no extremes | Mean |
| A few very large or small values | Median |
| Incomes, prices, house sizes, time on site | Almost always median |

Five salaries of 20, 22, 25, 24 and 400 thousand have a **mean of 98** — a number no one in the
group earns — and a **median of 24**, which describes a typical person. The mean is pulled by the
extreme; the median is not.

**Percentages need the right denominator.** "30% of students failed" — 30% of all students, of
those who sat the exam, or of those who submitted? Say which. Comparing two groups' percentages
built on different denominators compares nothing.

**Counting the right thing** goes back to the first unit. If a row is one item in an order,
\`value_counts()\` of customer counts items per customer, not orders. Use
\`df.groupby("customer")["order_id"].nunique()\` to count distinct orders instead.`,
    mcqs: [
      mcq('What does `df.groupby("city")["marks"].mean()` compute?',
        [['The average mark for each city separately', true],
          ['The overall average mark, sorted by city', false],
          ['The number of students living in each city', false],
          ['The highest mark scored in every city', false]],
        'Split by city, take marks, summarise each part with the mean.'),
      mcq('Salaries are 20, 22, 25, 24 and 400 thousand. Which describes a typical person?',
        [['The median, 24 thousand', true], ['The mean, 98 thousand', false],
          ['The maximum, 400 thousand', false], ['The minimum, 20 thousand', false]],
        'One extreme value pulls the mean far from everyone; the median stays with the typical case.'),
      mcq('A city shows the highest average mark. What should you check before reporting it?',
        [['How many students that average is based on', true],
          ['Whether the city name is spelled correctly', false],
          ['Whether the marks column is sorted first', false],
          ['Whether the mean or maximum is higher there', false]],
        'Averages of tiny groups swing wildly by chance. Always show the count alongside.'),
      mcq('Rows are items within orders. How do you count orders per customer?',
        [['Count distinct order ids per customer', true],
          ['Count rows per customer with value_counts', false],
          ['Sum the item prices for each customer', false],
          ['Take the mean of order ids per customer', false]],
        'Counting rows counts items. nunique on order_id counts orders.'),
    ],
    checkpoint: [
      mcq('For house prices in a city, the better summary of a typical price is usually:',
        [['The median', true], ['The mean', false], ['The maximum', false], ['The sum', false]],
        'A few very expensive houses pull the mean upwards; the median stays with a typical house.'),
      mcq('Two reports say "30% failed", one of all students and one of those who sat the exam. They are:',
        [['Not comparable, since the denominators differ', true],
          ['Identical, since both of them say thirty per cent', false],
          ['Comparable once both are rounded to whole numbers', false],
          ['Comparable if both used the same exam paper', false]],
        'A percentage means nothing until you know what it is a percentage of.'),
    ],
  },
  {
    unitCode: 'T_DATA_WRANGLING_CHARTS',
    notes: `A chart answers **one question**. Choose the chart from the question, not the other way
round.

    import matplotlib.pyplot as plt

**Comparing categories → bar chart**

    df.groupby("city")["marks"].mean().sort_values().plot(kind="barh")

Sort the bars. An unsorted bar chart makes the reader do the ranking themselves.

**Change over time → line chart**

    monthly.plot(kind="line")

Lines imply continuity, so use them for time, not for unrelated categories.

**How values are spread → histogram**

    df["marks"].plot(kind="hist", bins=10)

Shows whether most students cluster, split into two groups, or have a long tail — none of which
an average reveals.

**Relationship between two numbers → scatter plot**

    df.plot(kind="scatter", x="study_hours", y="marks")

Shows whether one tends to rise with the other. **A pattern is not proof of cause**: students
who study more may also attend more, sleep better, or have more time.

**How charts mislead — and how to avoid doing it by accident:**

| Trick | Effect | Honest version |
|---|---|---|
| Bar chart axis starting at 70 | A 72 vs 75 difference looks huge | Start bar axes at zero |
| Two different y-axis scales side by side | False comparison | One shared scale |
| 3-D and pie charts with many slices | Sizes impossible to judge | Sorted bar chart |
| Only showing a convenient time range | Hides the real trend | Show the full period |
| No labels or units | Reader must guess | Title, axis labels, units |

**Every chart needs:** a title that states the finding ("Pune leads average marks by 6 points"),
labelled axes with units, and the source of the data. A chart that needs you standing beside it
to explain it is not finished.`,
    mcqs: [
      mcq('Which chart shows how marks are spread across all students?',
        [['A histogram', true], ['A line chart', false], ['A pie chart', false], ['A scatter plot', false]],
        'A histogram shows clustering, gaps and long tails that an average hides.'),
      mcq('Why should a bar chart\'s value axis usually start at zero?',
        [['Otherwise small differences look much larger', true],
          ['matplotlib cannot draw an axis that starts elsewhere', false],
          ['Bars must always be the same width as each other', false],
          ['Zero makes the chart load faster in the notebook', false]],
        'Bar length is read as size. Cutting the axis exaggerates every difference.'),
      mcq('A scatter plot shows marks rising with study hours. You can conclude:',
        [['They tend to rise together, but not that one causes the other', true],
          ['Studying more hours is proven to cause higher marks', false],
          ['Every student who studies more will score higher', false],
          ['Study hours and marks are measured in the same units', false]],
        'Other factors may drive both. A pattern is a question for further work, not a proof.'),
      mcq('Monthly sales over two years are best shown as:',
        [['A line chart', true], ['A pie chart', false], ['A histogram', false], ['A 3-D bar chart', false]],
        'Change over time is what line charts are for; the line reads as continuity.'),
    ],
    checkpoint: [
      mcq('What makes a good chart title?',
        [['It states the finding the chart shows', true],
          ['It repeats the name of the dataset file', false],
          ['It lists every column that was used', false],
          ['It is left blank so the chart speaks alone', false]],
        '"Pune leads average marks by 6 points" tells the reader what to look for.'),
      mcq('Comparing average marks across eight cities is best shown with:',
        [['A sorted bar chart', true], ['A pie chart', false],
          ['A line chart', false], ['A 3-D chart', false]],
        'Bars compare categories; sorting them does the ranking for the reader.'),
    ],
  },
  {
    unitCode: 'T_DATA_WRANGLING_DEBUGGING',
    notes: `The hardest bugs in data work do not crash. They produce a number that looks fine and is
wrong. Debugging an analysis means checking results against what is possible.

**Suspicious results, and where they usually come from:**

| What you see | Likely cause |
|---|---|
| A total far bigger than expected | A merge (join) duplicated rows |
| An average that seems too high | Placeholders like 999 still in the data |
| Fewer rows than expected after cleaning | A dropna or filter removed more than intended |
| A group appears twice ("Pune", "Pune ") | Labels not stripped or standardised |
| Sum of numbers gives a long string | Column is text, so "+" joined them |
| Percentages add up to more than 100 | Overlapping categories, or wrong denominator |

**Check row counts after every step.** Print \`len(df)\` before and after each cleaning or
merge. A step that should remove 14 rows and removes 1,400 is instantly visible.

**Merges are the classic silent multiplier.** Joining students to a marks table where each
student has several subjects turns one row per student into one row per subject:

    merged = students.merge(marks, on="student_id")
    len(students), len(merged)     # 500 vs 2,500

Nothing is wrong with the merge — but a count of "students" on \`merged\` is now five times too
high. Know what one row represents *after* every merge.

**Test with a case you can compute by hand.** Take three rows, work out the answer on paper,
run your code on just those three rows. If they disagree, the code is wrong, and you found it on
a table small enough to read.

**Look at the rows behind a surprising number.** If Chennai's average is 140, filter to Chennai
and look. The cause is almost always visible in the rows themselves: a stray 999, a duplicated
block, a value in the wrong unit.`,
    mcqs: [
      mcq('After merging students with their subject marks, the student count is five times too high. Why?',
        [['Each student now appears once per subject', true],
          ['The merge deleted the original student table', false],
          ['pandas counts every column as a separate row', false],
          ['The marks were converted from text to numbers', false]],
        'The merge was fine; what one row represents changed, and the count did not account for it.'),
      mcq('Adding a column of numbers produces "7285910". The cause is:',
        [['The column holds text, so the values were joined', true],
          ['The numbers were too large to add correctly', false],
          ['The column was sorted before adding up', false],
          ['pandas sums numbers as strings by default', false]],
        'With text, + concatenates. Convert with pd.to_numeric first.'),
      mcq('Why print the row count after each cleaning step?',
        [['To spot a step that removed far more rows than intended', true],
          ['Because pandas requires it before the next step runs', false],
          ['To make the notebook run more quickly overall', false],
          ['So the final chart shows the number of rows', false]],
        'Silent over-removal is only visible if you look at how many rows each step touched.'),
      mcq('A surprising average for one city is best investigated by:',
        [['Filtering to that city and reading its rows', true],
          ['Recalculating the average for every city again', false],
          ['Switching from the mean to the maximum value', false],
          ['Removing that city from the final report', false]],
        'The cause is usually visible in the rows: a placeholder, a duplicate block, a wrong unit.'),
    ],
    checkpoint: [
      mcq('What is a good way to test that an analysis step is correct?',
        [['Run it on a few rows you have worked out by hand', true],
          ['Run it twice and check the outputs are identical', false],
          ['Run it on the largest dataset you can find online', false],
          ['Check that it finishes without raising an error', false]],
        'Running without error proves nothing in data work; agreement with a hand-computed case does.'),
      mcq('Group percentages add up to 130%. The most likely cause is:',
        [['Categories overlap, or the denominator is wrong', true],
          ['Percentages above 100 are normal for groups', false],
          ['The values were rounded to whole numbers', false],
          ['The chart axis did not start at zero', false]],
        'Parts of one whole cannot exceed 100%. Something is counted twice or divided by the wrong total.'),
    ],
  },
  {
    unitCode: 'T_DATA_WRANGLING_PRACTICE',
    notes: `No new ideas. Work through unfamiliar datasets until look → clean → answer → check is a
habit.

**Each of these hides one problem. Find it before answering:**

1. **Class marks** — one "absent" value makes the marks column text. *Question:* average per
   section.
2. **Shop orders** — one row per item, not per order. *Question:* how many orders per customer?
3. **City survey** — the same city spelled four ways. *Question:* respondents per city.
4. **Monthly rainfall** — a month missing entirely, not just blank. *Question:* the wettest
   quarter.
5. **Salaries** — a few very large values. *Question:* a typical salary per department.
6. **Two tables** — students and results, joined. *Question:* how many students passed?

**Public datasets that work well in Colab:** data.gov.in, Kaggle's beginner datasets, and the
sample datasets that ship with seaborn (\`import seaborn as sns; sns.load_dataset("tips")\`).

**For every question, write down:**

| Item | Your answer |
|---|---|
| What one row represents | |
| The problem found, and how | |
| The cleaning applied, with row counts | |
| The answer | |
| One check that the answer is plausible | |

**The trap in practice sets is answering too quickly.** A number that comes out on the first try
is exactly the one that should be checked — the hidden problems above all produce believable,
wrong numbers.`,
    mcqs: [
      mcq('A salaries dataset has a few very large values. "Typical salary per department" should use:',
        [['The median per department', true], ['The mean per department', false],
          ['The total per department', false], ['The maximum per department', false]],
        'Extremes pull the mean; the median describes a typical person in each department.'),
      mcq('A month is missing entirely from monthly rainfall data. Before finding the wettest quarter you should:',
        [['Notice the gap and decide how to treat that quarter', true],
          ['Assume the missing month had no rain at all', false],
          ['Ignore it, since quarters are summed anyway', false],
          ['Copy the previous month into the missing one', false]],
        'A missing month makes its quarter look drier than it was. Say how you handled it.'),
      mcq('Which is a source of free public datasets?',
        [['data.gov.in', true], ['colab.research.google.com', false],
          ['pandas.read_csv', false], ['matplotlib.pyplot', false]],
        'Colab is where you work; pandas and matplotlib are tools; data.gov.in publishes data.'),
      mcq('How many orders per customer, when rows are items?',
        [['Count distinct order ids for each customer', true],
          ['Count rows for each customer in the table', false],
          ['Sum the quantity column for each customer', false],
          ['Count distinct customers in the whole table', false]],
        'The same lesson as the grouping unit, and the one practice sets test most often.'),
      mcq('Your first attempt gives a believable answer at once. You should:',
        [['Check it with one plausibility test before trusting it', true],
          ['Accept it, since it looks like a sensible number', false],
          ['Run the same code again to see it is repeated', false],
          ['Round it so it looks more like a real result', false]],
        'The hidden problems in this set all produce believable, wrong numbers.'),
    ],
    checkpoint: [
      mcq('Before joining two tables, what should you know?',
        [['What one row will represent after the join', true],
          ['Which of the two tables has more columns', false],
          ['Which table was created most recently', false],
          ['Whether both tables use the same colours', false]],
        'A join can multiply rows, and every later count depends on knowing it did.'),
      mcq('A "respondents per city" count shows Pune, pune and PUNE separately. The right step is:',
        [['Standardise the labels, then count again', true],
          ['Report all three counts exactly as they are', false],
          ['Keep only the most common of the three', false],
          ['Delete the rows with lower-case city names', false]],
        'One real city split three ways makes every comparison wrong.'),
    ],
  },
  {
    unitCode: 'T_DATA_WRANGLING_MINI_PROJECT',
    notes: `One small analysis, from raw file to conclusion, that another person could check.

**Why the whole path.** Charts are the visible part of data work and the smallest. Most of the
effort, and most of the mistakes, live in loading, cleaning and deciding what a number actually
measures. A project that shows the path is worth far more than one that shows only the picture.

**What "could check" means:**

- The raw file is linked, never edited by hand
- Every cleaning step is in code, with row counts and reasons in a log
- Each question has an answer, a chart that shows it, and a plausibility check
- The conclusion says what the data shows — and what it cannot show

**Build it in this order:**

1. **Choose a dataset and write three questions** before opening it.
2. **Look**: shape, head, dtypes, missing values, describe. Note what you find.
3. **Clean**, logging every step.
4. **Answer each question**, with a check and one honest chart.
5. **Write the conclusion**, including the limits: what is missing, what could not be answered.

**Resist more questions.** Three questions answered carefully, with honest charts and stated
limits, beat ten answered quickly.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — A Small Analysis',
      description: 'Take a real public dataset from raw file to written conclusion in a Colab notebook: look, clean with a log, answer three questions with honest charts, and state the limits.',
      instructions: `**The brief**

Choose ONE public dataset of at least a few hundred rows, for example:

- A dataset from **data.gov.in** (rainfall, crop production, school enrolment)
- A beginner dataset from **Kaggle** (student performance, used cars, movies)
- A **seaborn** sample dataset (\`tips\`, \`penguins\`, \`titanic\`)

Write **three questions** you want the data to answer before you start cleaning.

**Requirements**

1. **A Colab notebook** that runs top to bottom from the raw file.
2. **The five checks** on first load, with a sentence on what each revealed.
3. **A cleaning log**: every step, rows affected, and why.
4. **One answer per question**, each with a plausibility check.
5. **One honest chart per question**: the right type, labelled axes with units, a title that
   states the finding, bar axes from zero.
6. **At least one groupby** with counts shown beside averages.
7. **The right summary**: median where extremes exist, and why.

**What to submit**

1. The notebook link (set to view-only) and the raw data link.
2. The **cleaning log** table.
3. A **conclusion** (300–400 words): the answer to each question; what surprised you; the limits
   of the data — what is missing, what cannot be concluded, and one thing you would need to
   collect to answer better.

**Constraints**

- No editing the raw file by hand.
- No chart without labels and a finding-stating title.
- No causal claim ("X causes Y") from a pattern alone.

**Where the marks are.** The cleaning log and the limits. A careful analysis that says clearly
what it cannot conclude beats a confident one built on uncleaned data.`,
      rubric: [
        {
          criterion: 'Looking and cleaning',
          description: 'Five checks run and interpreted; every cleaning step in code with rows affected and reasons; raw file untouched.',
          maxPoints: 30,
        },
        {
          criterion: 'Answers',
          description: 'Each question answered correctly with filtering, sorting or grouping as needed; counts beside averages; appropriate summary statistic.',
          maxPoints: 25,
        },
        {
          criterion: 'Charts',
          description: 'Right chart type for each question; labelled axes with units; finding-stating titles; no misleading scales.',
          maxPoints: 20,
        },
        {
          criterion: 'Conclusion and limits',
          description: 'Clear answers; honest limits and missing data named; no causal claims from patterns; a concrete idea for better data.',
          maxPoints: 15,
        },
        {
          criterion: 'Reproducibility',
          description: 'Notebook runs top to bottom from the raw file and produces the reported results.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },
];
