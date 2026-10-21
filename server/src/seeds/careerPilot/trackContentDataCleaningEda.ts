/**
 * Career-track content: Python for data, cleaning and EDA (Data Analytics + AI, batch A2).
 *
 * DT_DATA_CLEANING — missing values, types and parsing, duplicates and messy text, outliers, and
 * quality checks you can rerun, ending with the one auto-graded exercise of the batch (plain Python,
 * standard library only, because the grader has no pandas).
 * DT_EDA_VIZ — the EDA workflow, Matplotlib and Seaborn, choosing an honest chart, and turning a
 * notebook into findings a manager reads, ending with a food-delivery EDA mini project.
 *
 * Every output shown was produced by running the code on pandas 3.0 / NumPy 2.5 / Matplotlib 3.11 /
 * Seaborn 0.13. The code itself also works on pandas 2.2; where the two print different things
 * (dtype names, Copy-on-Write warnings) the notes say which version shows what.
 *
 * Both topics are two-skill, so every checkpoint question names its skill with ck(): DATA_CLEANING or
 * DATA_QUALITY, and EXPLORATORY_ANALYSIS or DATA_VISUALISATION, following trackSkillAttribution.ts.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const CLEAN = 'DATA_CLEANING';
const QUALITY = 'DATA_QUALITY';
const EDA = 'EXPLORATORY_ANALYSIS';
const VIZ = 'DATA_VISUALISATION';

export const TRACK_DATA_CLEANING_EDA_BUNDLES: PilotBundle[] = [
  /* ══ DT_DATA_CLEANING ════════════════════════════════════════════════════════════════════ */

  /* ── MISSING_VALUES ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_DATA_CLEANING_MISSING_VALUES',
    notes: `In Excel a blank cell is easy to see. In a DataFrame of 2 lakh rows it is invisible — and pandas will
happily average around it, count past it and group without it. Handling missing values is not one
command; it is a decision you take **per column**, and you must be able to say what that decision did to
the answer.

## The data used in this unit

TiffinBox is a food-delivery app in Hyderabad and Pune. Here are ten orders from its export:

    import io
    import numpy as np
    import pandas as pd

    csv = """order_id,city,cuisine,order_value,discount,status,delivery_min,rating
    1001,Hyderabad,Biryani,450,50,DELIVERED,32,5
    1002,Hyderabad,Pizza,620,,DELIVERED,41,
    1003,Pune,Chinese,380,,CANCELLED,,
    1004,Pune,Biryani,540,60,DELIVERED,28,4
    1005,,South Indian,210,,DELIVERED,22,
    1006,Hyderabad,Pizza,890,100,DELIVERED,55,2
    1007,Pune,Biryani,480,,CANCELLED,,
    1008,Hyderabad,Chinese,350,,DELIVERED,30,
    1009,Pune,South Indian,190,20,DELIVERED,19,5
    1010,Hyderabad,Biryani,520,,DELIVERED,36,3
    """
    df = pd.read_csv(io.StringIO(csv))

(\`io.StringIO\` lets read_csv read a string as if it were a file — handy for small examples. With a real
file you write \`pd.read_csv("orders.csv")\`.)

## Step 1: find them — count and share

    df.isna().sum()

    order_id        0
    city            1
    cuisine         0
    order_value     0
    discount        6
    status          0
    delivery_min    2
    rating          5

    df.isna().mean().round(2)      # share missing: True counts as 1, False as 0
                                   # (columns with 0.0 left out below)

    city            0.1
    discount        0.6
    delivery_min    0.2
    rating          0.5

Always look at the share as well as the count: 5 missing ratings out of 10 is half the column.

**What counts as missing.** read_csv turns empty fields and the strings \`NA\`, \`N/A\`, \`NaN\`, \`null\` and a
few others into NaN. It does **not** recognise \`-\`, \`not given\` or \`0\` used as a placeholder. Tell it:

    pd.read_csv("orders.csv", na_values=["-", "not given"])

And never test for NaN with \`==\`: \`(df["rating"] == np.nan).sum()\` returns **0**, because NaN is not equal
to anything, not even itself. Use \`isna()\` / \`notna()\`.

## Step 2: ask WHY each one is missing

This is the step careless analysis skips. The same NaN means different things in different columns:

| Column | Why it is missing | What that means |
|---|---|---|
| discount | No coupon was used | A real value: **0** |
| delivery_min | The order was **cancelled** — it was never delivered | Not a value at all; exclude cancelled orders when measuring delivery time |
| city | The app failed to record it | Unknown; keep the order, label it |
| rating | The customer did not rate | Not random — who rates is a choice |

Check a reason instead of guessing it:

    df.loc[df["delivery_min"].isna(), "status"].value_counts()

    status
    CANCELLED    2

Both missing delivery times are cancelled orders — confirmed, not assumed.

## Step 3: decide per column — drop, fill, or leave

**Fill when the blank has a known meaning.**

    df["discount"] = df["discount"].fillna(0)
    df["city"] = df["city"].fillna("Unknown")

    # or several columns at once
    df = df.fillna({"discount": 0, "city": "Unknown"})

**Drop rows only for the analysis that needs the column.** \`df.dropna()\` with no arguments drops a row
if *any* column is missing — here it keeps **4 of 10 orders**. That is almost never what you want.
Name the column:

    len(df), len(df.dropna()), len(df.dropna(subset=["delivery_min"]))
    # (10, 4, 8)

**Leave it as NaN** when the analysis already skips it correctly. pandas' \`mean\`, \`sum\`, \`median\` and
\`count\` skip NaN by default, so \`df["rating"].mean()\` is the mean of the 5 ratings that exist:

    print(df["rating"].mean(), df["rating"].count())
    # 3.8 5

That is the right answer to "average rating *of orders that were rated*" — and you must say it in those
words, because 5 of 10 orders were not rated.

## Step 4: know what a careless fill changes

**Filling with 0 where 0 is false.** Average delivery time per city, with cancelled orders filled with 0:

    df.assign(delivery_min=df["delivery_min"].fillna(0)).groupby("city")["delivery_min"].mean().round(1)

    city
    Hyderabad    38.8
    Pune         11.8      # wrong: two "0-minute deliveries" that never happened

Leaving them as NaN gives Pune **23.5** minutes — the real figure. A fill of 0 made Pune look twice as
fast.

**Filling with the mean.** It keeps the mean the same but shrinks the spread, because every filled value
sits exactly at the centre:

    r = df["rating"]
    filled = r.fillna(r.mean())
    print(r.std().round(2), filled.std().round(2))
    # 1.3 0.87

Half the ratings are now invented, and any later test or chart sees a column that looks more consistent
than customers actually were. Mean-filling is occasionally acceptable for a few percent of a numeric
column feeding a model; for an analyst's report it is usually a quiet lie.

**Missing is often a signal.** Who rated?

    df.assign(rated=df["rating"].notna()).groupby("status")["rated"].mean()

    CANCELLED    0.000
    DELIVERED    0.625

Customers rate only delivered orders, and some cuisines are rated far more than others. A count of
"ratings received" is a finding in itself.

**groupby drops NaN keys by default.** The order with no city disappears from a city summary:

    df.groupby("city")["order_value"].sum()                 # Hyderabad 2830, Pune 1590 — total 4420
    df.groupby("city", dropna=False)["order_value"].sum()   # adds NaN 210 — total 4630, the real total

## The rule

For every column with missing values, write one line: **how many, why, what you did, and what it changes.**
That line goes in your cleaning log, and it is what makes your number believable.

> Excel and SQL comparison: \`dropna(subset=...)\` is \`WHERE col IS NOT NULL\`; \`fillna(0)\` is
> \`COALESCE(col, 0)\`; and pandas' \`mean\` skipping NaN behaves like SQL's \`AVG\`, which ignores NULLs.`,
    workedExample: `**Task.** The operations head of TiffinBox asks: *"For each city, how many orders did we deliver,
what was the average delivery time, and the average rating?"* Use the ten orders above.

**1. Decide per column before writing code.**

- discount: blank = no coupon → fill 0 (not needed for this question, but cheap to do right).
- city: one blank → keep the order as "Unknown" so the totals still add up.
- delivery_min: blank only for cancelled orders → the question is about *delivered* orders, so filter on
  status; do not fill.
- rating: half blank → leave NaN, and report how many ratings each average is based on.

**2. Write it.**

    summary = (
        df.fillna({"discount": 0, "city": "Unknown"})
          .query("status == 'DELIVERED'")
          .groupby("city")
          .agg(orders=("order_id", "count"),
               avg_delivery=("delivery_min", "mean"),
               rated=("rating", "count"),
               avg_rating=("rating", "mean"))
          .round(1)
    )

    print(summary)

               orders  avg_delivery  rated  avg_rating
    city
    Hyderabad       5          38.8      3         3.3
    Pune            2          23.5      2         4.5
    Unknown         1          22.0      0         NaN

**3. Check it.** 5 + 2 + 1 = 8 delivered orders, which matches the 8 rows with a delivery time. The
Unknown row is shown, not lost. \`count\` on rating counts only non-missing values, which is exactly the
"based on" number we wanted.

**4. Report with the caveats.** "Hyderabad delivered 5 orders averaging 38.8 minutes; Pune delivered 2
averaging 23.5. Ratings are thin — only 5 of 8 delivered orders were rated, so the averages (3.3 and 4.5)
are indicative only. One order had no city recorded."`,
    mcqs: [
      mcq('In the TiffinBox orders, `df.dropna()` keeps 4 of 10 rows, while `df.dropna(subset=["delivery_min"])` keeps 8. Why the difference?', [
        ['With no subset, a row is dropped if any column is blank', true],
        ['Without a subset, dropna only looks at the first column', false],
        ['subset makes dropna fill the gaps instead of dropping rows', false],
        ['dropna with no arguments drops whole columns as well', false],
      ], 'dropna() by default removes a row when any of its values is missing, so blank discounts and ratings remove orders too. Naming the column drops only the rows that analysis cannot use.'),
      mcq('A bank\'s loan file has `monthly_income` blank for 30% of applicants, mostly self-employed ones. The analyst fills the blanks with the column mean and reports average income. What has gone wrong?', [
        ['The blanks are not random, and the fill also hides the spread', true],
        ['fillna cannot be used on a column of float values', false],
        ['The mean is changed by the fill, so the report is wrong', false],
        ['Nothing — mean-filling is the standard fix for income', false],
      ], 'Filling with the mean leaves the mean unchanged but shrinks the spread, and because the missing incomes belong to one group (self-employed), the "average applicant" figure now reflects salaried applicants more than it should.'),
      mcq('`(df["rating"] == np.nan).sum()` returns 0 on a column with 5 blank ratings. Which line counts them correctly?', [
        ['df["rating"].isna().sum()', true],
        ['df["rating"].count()', false],
        ['(df["rating"] == None).sum()', false],
        ['len(df["rating"].dropna())', false],
      ], 'NaN is not equal to anything, itself included, so == np.nan is always False. isna() is the test for missing values; count() and dropna() give the number of values that are present.'),
    ],
    checkpoint: [
      ck(CLEAN, 'An orders export has `delivery_min` blank for every CANCELLED order. You need the average delivery time per city. What is the right handling?', [
        ['Keep only DELIVERED orders and leave delivery_min as it is', true],
        ['Fill the blanks with 0, as no time was spent delivering', false],
        ['Fill the blanks with the overall mean delivery time', false],
        ['Drop every row that has any blank value in any column', false],
      ], 'The blank means "never delivered", so those orders do not belong in a delivery-time average. A 0 would pull the average down; a mean would invent deliveries; dropping on any column loses good orders.'),
      ck(CLEAN, 'A college\'s fee file has 1,200 students, and `scholarship_amt` is blank for the 900 students without a scholarship. What does `df["scholarship_amt"].mean()` return?', [
        ['The average over the 300 students who have a value', true],
        ['The average over all 1,200, with blanks treated as 0', false],
        ['NaN, because the column contains missing values', false],
        ['An error until the blanks are filled or dropped', false],
      ], 'pandas skips NaN by default (skipna=True). If the question is "average scholarship per student", fill the blanks with 0 first; if it is "average award", the default is correct — say which.'),
      ck(CLEAN, 'A retail chain groups sales by `store_city` and gets a total ₹38,000 lower than `df["amount"].sum()`. What is the most likely cause?', [
        ['Rows with a blank store_city are left out by groupby', true],
        ['groupby rounds every amount down before adding them', false],
        ['sum() counts each blank amount as ₹1,000 in its total', false],
        ['The amount column has duplicates that groupby removed', false],
      ], 'groupby drops NaN keys unless you pass dropna=False (or fill the key first, e.g. "Unknown"). The sales are not lost from the data, only from the summary — which is why totals should be reconciled.'),
    ],
  },

  /* ── TYPES_PARSING ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_DATA_CLEANING_TYPES_PARSING',
    notes: `A column that looks like numbers is not necessarily numbers. If one cell in a 50,000-row amount column
says \`₹1,250\`, pandas reads the **whole column** as text, and every sum, mean and chart built on it is
either an error or nonsense. This unit is about getting each column to the right type — and proving you
did not lose rows on the way.

## The data

An e-commerce store's order export, as it really arrives:

    csv = """order_id,order_date,amount,pincode,payment
    E01,05/03/2024,"₹1,250",500032,UPI
    E02,13/03/2024,899,411001,Card
    E03,07/03/2024,"₹2,499.00",560001,upi
    E04,21/03/2024,-,600028,COD
    E05,02/04/2024,"Rs. 650",110001,UPI
    E06,30/03/2024,1 200,040012,Card
    """
    df = pd.read_csv(io.StringIO(csv))
    print(df.dtypes)

    order_id        str
    order_date      str
    amount          str
    pincode       int64
    payment         str

(On **pandas 2.x** the text columns show as \`object\`; **pandas 3.0** uses a dedicated string dtype, shown
as \`str\`. Either way the message is the same: amount and order_date are text.)

Three problems are already visible: amount is text, the dates are text, and pincode is a number — so
\`040012\` has become \`40012\`.

## Numbers stored as text

\`astype(float)\` fails loudly on the first bad value — which is good, it tells you something is wrong:

    df["amount"].astype(float)
    # ValueError: could not convert string to float: '₹1,250'

\`pd.to_numeric(..., errors="coerce")\` turns anything it cannot read into NaN. Used **straight away**, it
is dangerous:

    pd.to_numeric(df["amount"], errors="coerce").tolist()
    # [nan, 899.0, nan, nan, nan, nan]

Five of six amounts are now "missing" without any error. A mean on this column would quietly be the mean
of one order. The rule: **clean the text first, then coerce, then count what coerce destroyed.**

    cleaned = (df["amount"]
               .str.replace("₹", "", regex=False)
               .str.replace("Rs.", "", regex=False)
               .str.replace(",", "", regex=False)
               .str.replace(" ", "", regex=False)
               .str.strip())
    print(cleaned.tolist())
    # ['1250', '899', '2499.00', '-', '650', '1200']

    amount = pd.to_numeric(cleaned, errors="coerce")
    print(amount.tolist())
    # [1250.0, 899.0, 2499.0, nan, 650.0, 1200.0]

    # what did coerce turn into NaN that was NOT blank before?
    print(df.loc[amount.isna() & df["amount"].notna(), ["order_id", "amount"]])

      order_id amount
    3      E04      -

Exactly one value was lost, and you can see it: \`-\`, which the store uses for "not recorded". That is a
decision you now take on purpose (treat as missing), not an accident. \`regex=False\` matters: in a regular
expression \`.\` means "any character". It is the default from pandas 2.0, but code written for pandas 1.x
(which defaulted to regex=True) still turns up, so write it and nobody has to wonder.

> SQL comparison: this is \`CAST(REPLACE(REPLACE(amount, '₹', ''), ',', '') AS DECIMAL)\` — with the
> difference that pandas lets you see every row the cast failed on before you move on.

## Dates: the month-first trap

Indian data writes dates day-first: 05/03/2024 is **5 March**. pandas, without being told, assumes the US
order. Watch what it does with the first two dates alone:

    pd.to_datetime(pd.Series(["05/03/2024", "07/03/2024"])).tolist()
    # [Timestamp('2024-05-03 00:00:00'), Timestamp('2024-07-03 00:00:00')]

No error — just **3 May and 3 July**. On the full column it does fail, because pandas takes the format from
the first value and then meets 13/03/2024:

    pd.to_datetime(df["order_date"])
    # ValueError: time data "13/03/2024" doesn't match format "%m/%d/%Y"

That error is a gift. A file whose days all happen to be 12 or below gives no error and silently swaps
day and month. **Always give the format:**

    df["order_date"] = pd.to_datetime(df["order_date"], format="%d/%m/%Y")
    df["order_date"].dt.strftime("%d %b %Y").tolist()
    # ['05 Mar 2024', '13 Mar 2024', '07 Mar 2024', '21 Mar 2024', '02 Apr 2024', '30 Mar 2024']

\`dayfirst=True\` also works for a column in one format. The common format codes: \`%d\` day, \`%m\` month
number, \`%b\` short month name (Mar), \`%Y\` four-digit year, \`%H:%M\` time.

**Mixed formats in one column** (exports merged from two systems) need care. \`format="mixed"\` with
\`dayfirst=True\` looks convenient, but it applies day-first to ISO dates too:

    s = pd.Series(["2024-03-05", "05/03/2024", "5 Mar 2024", "31/02/2024"])
    pd.to_datetime(s, format="mixed", dayfirst=True, errors="coerce").tolist()
    # [Timestamp('2024-05-03 ...'), Timestamp('2024-03-05 ...'), Timestamp('2024-03-05 ...'), NaT]

The ISO date 2024-03-05 became 3 May. The safe way is one explicit format per pass, combined — shown in
the worked example.

## Codes that are not numbers

Pincodes, phone numbers, Aadhaar-style IDs and roll numbers are **labels**: you never add them, and a
leading zero matters. Read them as text:

    df = pd.read_csv(io.StringIO(csv), dtype={"pincode": str})
    df["pincode"].tolist()
    # ['500032', '411001', '560001', '600028', '110001', '040012']

The same applies in Excel, which also strips the zero unless the column is formatted as Text.

## Categories

A column with a few repeated values (payment mode, city, branch) can be stored as \`category\`. It uses less
memory and keeps a fixed list of allowed values — but standardise the text first, or "UPI" and "upi"
become two categories:

    df["payment"] = df["payment"].str.upper().astype("category")
    df["payment"].cat.categories.tolist()
    # ['CARD', 'COD', 'UPI']

## A checklist for every new file

1. \`df.dtypes\` (or \`df.info()\`) straight after reading — is every column the type you expect?
2. For each numeric-looking text column: strip symbols, then \`to_numeric(errors="coerce")\`, then list the
   rows coerce turned into NaN.
3. For each date column: \`to_datetime\` with an explicit \`format\`; then check min and max are plausible.
4. IDs and codes: \`dtype=str\` at read time.
5. Count rows before and after. A type conversion should never change the row count.`,
    workedExample: `**Task.** A retail chain merged two systems. Its \`bill_date\` column now holds three formats —
ISO from the new POS, day-first from the old one, and a few typed by hand — plus one impossible date and
one blank. Parse it without guessing.

    s = pd.Series(["2024-03-05", "05/03/2024", "5 Mar 2024", "31/02/2024", ""])

**1. Parse once per known format, with errors="coerce".** Each pass reads only the values in its own
format and turns the rest into NaT (Not a Time, the date version of NaN):

    iso = pd.to_datetime(s, format="%Y-%m-%d", errors="coerce")
    dmy = pd.to_datetime(s, format="%d/%m/%Y", errors="coerce")
    txt = pd.to_datetime(s, format="%d %b %Y", errors="coerce")

**2. Combine: take the first pass that worked.**

    parsed = iso.fillna(dmy).fillna(txt)
    print(pd.DataFrame({"raw": s, "parsed": parsed}))

              raw     parsed
    0  2024-03-05 2024-03-05
    1  05/03/2024 2024-03-05
    2  5 Mar 2024 2024-03-05
    3  31/02/2024        NaT
    4                    NaT

**3. Check.** All three readable formats give the same day — 5 March 2024, a Tuesday:

    parsed.dt.day_name().tolist()
    # ['Tuesday', 'Tuesday', 'Tuesday', nan, nan]

\`parsed.isna().sum()\` is 2: the blank, and 31 February, which no format accepts because the date does
not exist. Neither was guessed.

**4. Log it.** "bill_date: 3 formats parsed explicitly; 1 impossible date (31/02/2024) and 1 blank left
as missing — 2 of 5 rows." If this were real data you would now look up those two bills rather than drop
them silently.

Why not \`format="mixed", dayfirst=True\`? Because, as the notes show, it turns the ISO 2024-03-05 into 3
May. Explicit formats cost three lines and remove the guessing.`,
    mcqs: [
      mcq('An e-commerce export\'s amount column holds `"₹1,250"`, `"899"` and `"₹2,499.00"`. What does `pd.to_numeric(df["amount"], errors="coerce").mean()` give?', [
        ['899.0, the only value it could read as a number', true],
        ['1549.33, the mean of all three amounts', false],
        ['NaN, because the column still contains the ₹ sign', false],
        ['An error naming the first value with a ₹ sign', false],
      ], 'coerce turns "₹1,250" and "₹2,499.00" into NaN without complaint, and mean skips NaN — so the result is the mean of one value. Strip the symbols and commas before coercing, then check what was lost.'),
      mcq('A bank\'s branch file has the date "04/07/2024", meaning 4 July. What does `pd.to_datetime("04/07/2024")` return without a format?', [
        ['7 April 2024, read month-first', true],
        ['4 July 2024, read day-first', false],
        ['A ValueError about an ambiguous date', false],
        ['NaT, since the date is ambiguous', false],
      ], 'Without a format or dayfirst=True, pandas reads slashed dates month-first. Because 04 and 07 are both valid months, nothing fails; the date is silently wrong. Pass format="%d/%m/%Y".'),
      mcq('A student file has roll numbers like 0217 and pincodes like 040012. What is the best way to keep them correct?', [
        ['Read those columns with dtype=str in read_csv', true],
        ['Convert them with pd.to_numeric after reading', false],
        ['Store them as float so that no digits are lost', false],
        ['Multiply them by 1 to keep the leading zeros', false],
      ], 'They are labels, not quantities. Read as numbers, the leading zero is dropped at once; dtype=str keeps the text exactly as it was in the file.'),
    ],
    checkpoint: [
      ck(CLEAN, 'After cleaning, 4,980 of 5,000 amounts parse and 20 become NaN. Before using the column, what should you do?', [
        ['Look at the raw values of those 20 rows and decide', true],
        ['Fill the 20 with 0 so that the totals are not affected', false],
        ['Nothing — 0.4% is too small a share to matter', false],
        ['Rerun to_numeric without coerce until they parse', false],
      ], 'Coerce hides failures as NaN. Twenty rows might be a "-" placeholder, or a format you missed (like "1.2L") worth lakhs. Inspect them, then fix, treat as missing, or log them.'),
      ck(CLEAN, '`pd.to_datetime(df["joined"])` on a college file raises `time data "13/06/2023" doesn\'t match format "%m/%d/%Y"`. What is the right fix?', [
        ['Pass format="%d/%m/%Y", since the dates are day-first', true],
        ['Pass errors="coerce" so that the bad dates become NaT', false],
        ['Drop the rows whose day number is greater than 12', false],
        ['Convert the column to int before parsing the dates', false],
      ], 'pandas guessed month-first from the first value, and 13 is not a month. The data is day-first; saying so parses every row correctly. coerce would only hide the dates whose day is above 12.'),
      ck(CLEAN, 'Old code cleans an amount column with `.str.replace(".", "", regex=True)` to strip the dot from "Rs.". What does it turn "Rs.99.50" into?', [
        ['"" — an empty string', true],
        ['"Rs9950", with both dots removed', false],
        ['"Rs99.50", with the first dot removed', false],
        ['"9950", with only the digits left', false],
      ], 'As a regular expression, "." matches any character, so every character is replaced and nothing is left. pandas 2.0 and later default to regex=False (a literal dot); old code and regex=True need the dot escaped.'),
    ],
  },

  /* ── DUPLICATES_TEXT ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_DATA_CLEANING_DUPLICATES_TEXT',
    notes: `Two problems that look different are really one: **the same thing written two ways.** An identical
row exported twice inflates every count. "CSE", "cse " and "Computer Science" split one branch into three
bars on a chart. pandas compares text character by character, so to pandas these are all different.

## The data

A college placement cell collected registrations through a Google Form and a spreadsheet, then merged
them:

    csv = """reg_no,name,branch,city,phone
    21CS001,Ananya Rao,CSE,Bengaluru,9876500011
    21CS002,Rahul Verma,cse ,Bangalore,9876500012
    21EC003,Fatima Shaikh,ECE,Mysuru,9876500013
    21CS001,Ananya Rao,CSE,Bengaluru,9876500011
    21ME004,Karthik S,Mechanical,Mysore,9876500014
    21CS005,rahul verma,Computer Science,bengaluru,9876500012
    21EC006,Divya N,E.C.E,Hubballi,9876500015
    21CS007,Arjun  Patel,C.S.E,Bengaluru ,9876500016
    """
    df = pd.read_csv(io.StringIO(csv), dtype={"phone": str})

## Exact duplicates

    print(len(df), df.duplicated().sum(), df.duplicated(subset=["reg_no"]).sum())
    # 8 1 1

\`duplicated()\` marks a row True if an **identical** row appeared earlier. To see both copies, use
\`keep=False\`:

    df[df.duplicated(keep=False)]

        reg_no        name branch       city       phone
    0  21CS001  Ananya Rao    CSE  Bengaluru  9876500011
    3  21CS001  Ananya Rao    CSE  Bengaluru  9876500011

    df = df.drop_duplicates()      # 7 rows

Useful options:

- \`subset=["reg_no"]\` — duplicates by key, even if other columns differ (a student who submitted the form
  twice with a new phone number).
- \`keep="first"\` (default), \`keep="last"\`, or \`keep=False\` (drop every copy). To keep the **latest**
  record per key, sort by the timestamp first: \`df.sort_values("updated_at").drop_duplicates("reg_no",
  keep="last")\`.

> SQL comparison: \`drop_duplicates()\` is \`SELECT DISTINCT *\`; keeping the latest row per key is the
> \`ROW_NUMBER() OVER (PARTITION BY reg_no ORDER BY updated_at DESC) = 1\` pattern from the SQL topic.

## Inconsistent text

    df["branch"].value_counts()

    CSE                 1
    cse                 1
    ECE                 1
    Mechanical          1
    Computer Science    1
    E.C.E               1
    C.S.E               1

Seven "branches" from three. \`value_counts()\` on every text column is the fastest way to spot this.

**Step 1 — the mechanical fixes** with the \`.str\` methods: strip spaces, one case, remove punctuation.

    b = (df["branch"].str.strip()
                     .str.upper()
                     .str.replace(".", "", regex=False))
    b.value_counts()

    CSE                 3
    ECE                 2
    MECHANICAL          1
    COMPUTER SCIENCE    1

**Step 2 — the meaning fixes** with an explicit mapping. Only a human knows that "COMPUTER SCIENCE" is CSE:

    branch_map = {"CSE": "CSE", "COMPUTER SCIENCE": "CSE", "ECE": "ECE", "MECHANICAL": "MECH"}
    df["branch"] = b.map(branch_map)
    df["branch"].value_counts(dropna=False)

    CSE     4
    ECE     2
    MECH    1

\`.map(dict)\` turns any value **not** in the dictionary into NaN — which is useful: next month, a new
spelling ("CS&E") shows up as NaN in \`value_counts(dropna=False)\` instead of slipping through. If you
would rather keep unknown values unchanged, use \`.replace(dict)\`, as with cities:

    df["city"] = (df["city"].str.strip().str.title()
                  .replace({"Bangalore": "Bengaluru", "Mysore": "Mysuru"}))
    df["city"].value_counts()

    Bengaluru    4
    Mysuru       2
    Hubballi     1

Names often have doubled spaces. \`str.split()\` with no argument splits on any run of whitespace, so
splitting and joining collapses them:

    df["name"] = df["name"].str.split().str.join(" ").str.title()
    # 'Arjun  Patel' -> 'Arjun Patel', 'rahul verma' -> 'Rahul Verma'

## Near duplicates — only visible after cleaning

Now that names are standardised, a second look:

    df[df.duplicated(subset=["name", "phone"], keep=False)][["reg_no", "name", "branch", "phone"]]

        reg_no         name branch       phone
    1  21CS002  Rahul Verma    CSE  9876500012
    5  21CS005  Rahul Verma    CSE  9876500012

Same name, branch and phone, different registration numbers. The text cleaning revealed it — before,
"Rahul Verma" and "rahul verma" did not match. Is it one student registered twice, or a typing mistake in
reg_no? **Do not decide in code.** Flag it, ask the placement cell, and log the answer. Two people can share
a name; two people rarely share a phone, a name and a branch.

## Order matters

Clean the text **before** removing duplicates, or near duplicates survive. A good sequence:

1. Strip and standardise every text column (\`.str.strip()\`, one case, a mapping).
2. Drop exact duplicates; count how many.
3. Check duplicates on the business key (reg_no, order_id, phone) and investigate them.
4. \`value_counts()\` on each category column — every value should be one you expect.

Pandas 3.0 note: with the new string dtype, the \`.str\` methods work the same as on pandas 2.x \`object\`
columns; missing values stay missing through them (they come back as NaN, not the string "nan").`,
    mcqs: [
      mcq('In a registrations file, "Ananya Rao" appears twice with the same reg_no but different phone numbers. What does `df.duplicated().sum()` count for this pair?', [
        ['0, because the two rows are not identical', true],
        ['1, because the reg_no is the same in both', false],
        ['2, because both rows have a duplicate', false],
        ['1, because the name is the same in both', false],
      ], 'With no subset, duplicated() compares the whole row. A changed phone number makes them different rows; use subset=["reg_no"] to find duplicates by key.'),
      mcq('A retail chain maps store names with `df["store"].map({"Vizag": "Visakhapatnam", "Vskp": "Visakhapatnam"})`. What happens to the store "Guntur"?', [
        ['It becomes NaN, since it is not a key in the dictionary', true],
        ['It stays "Guntur", since only the listed values are changed', false],
        ['It raises a KeyError, since the key is missing', false],
        ['It becomes "Visakhapatnam", the last value given', false],
      ], 'Series.map with a dict returns NaN for any value not in the dict. Use .replace() to leave unlisted values unchanged, or include every valid value in the map.'),
      mcq('Cities in a bank\'s KYC file include " Pune", "PUNE" and "pune ". Which line makes them all "Pune"?', [
        ['df["city"].str.strip().str.title()', true],
        ['df["city"].str.title()', false],
        ['df["city"].str.upper().str.strip(" P")', false],
        ['df["city"].replace("pune", "Pune")', false],
      ], 'strip removes the spaces at either end and title gives one consistent case. title alone keeps the spaces; replace changes only an exact "pune" match.'),
    ],
    checkpoint: [
      ck(CLEAN, 'An e-commerce customer file has several rows per customer_id, one per address update, with an `updated_at` column. Which line keeps each customer\'s latest row?', [
        ['df.sort_values("updated_at").drop_duplicates("customer_id", keep="last")', true],
        ['df.drop_duplicates("customer_id", keep="last")', false],
        ['df.sort_values("updated_at").drop_duplicates(keep="last")', false],
        ['df.drop_duplicates("updated_at").drop_duplicates("customer_id")', false],
      ], 'keep="last" keeps the last row in the current order, so the rows must be sorted by time first. Without subset, rows that differ in address are not duplicates at all.'),
      ck(CLEAN, 'A food-delivery app\'s cuisine column has "North Indian", "north indian" and "N. Indian". After `.str.strip().str.lower()`, how many distinct values are left?', [
        ['2', true],
        ['1', false],
        ['3', false],
        ['0', false],
      ], 'Lower-casing merges the first two into "north indian", but "n. indian" is a different string. Abbreviations need an explicit mapping, which is why value_counts() is checked after every step.'),
      ck(CLEAN, 'You drop exact duplicates first, and only then standardise name case and spaces in a student file. What is the risk?', [
        ['Rows that differed only in case or spaces stay as duplicates', true],
        ['Standardising the text afterwards would create new duplicate rows', false],
        ['drop_duplicates fails on text that is not standardised yet', false],
        ['There is none — the order of the two steps does not matter', false],
      ], '"rahul verma" and "Rahul Verma" are different strings at the time duplicates are dropped, so both survive. Clean the text first, then look for duplicates.'),
    ],
  },

  /* ── OUTLIERS ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_DATA_CLEANING_OUTLIERS',
    notes: `An outlier is a value far from the rest. Finding one is easy; the analyst's real job is the next
question: **is it a mistake, or is it real?** A mistake you fix or remove. A real extreme you keep — often
it is the most interesting row in the file — but you make sure it does not distort a summary that is
meant to describe the typical case.

## The data

Twelve orders from an online electronics-accessories store in Chennai:

    orders = pd.DataFrame({
        "order_id": [f"K{i:02d}" for i in range(1, 13)],
        "customer_type": ["Retail"] * 10 + ["Corporate", "Retail"],
        "amount": [1250, 980, 1430, 1100, 125000, 1320, 870, 1510, 1190, 1050, 48000, 1280],
    })

    print(orders["amount"].mean(), orders["amount"].median())
    # 15415.0 1265.0

The mean is twelve times the median. Something is pulling it.

## Method 1: the IQR rule (the box-plot rule)

Q1 and Q3 are the 25th and 75th percentiles; the **IQR** (inter-quartile range) is Q3 − Q1, the spread of
the middle half. A value more than 1.5 × IQR beyond the quartiles is flagged.

    a = orders["amount"]
    q1, q3 = a.quantile(0.25), a.quantile(0.75)
    iqr = q3 - q1
    low, high = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    print(q1, q3, iqr, low, high)
    # 1087.5 1450.0 362.5 543.75 1993.75

    orders[(a < low) | (a > high)]

       order_id customer_type  amount
    4       K05        Retail  125000
    10      K11     Corporate   48000

The IQR rule uses quartiles, which the outliers themselves barely move, so it works even when the outliers
are huge. It is the same rule a box plot uses to draw its dots.

## Method 2: z-scores — and where they fail

A z-score is how many standard deviations a value is from the mean. A common rule flags |z| > 3:

    z = (a - a.mean()) / a.std()
    z.round(2).tolist()
    # [-0.38, -0.39, -0.38, -0.39, 2.96, -0.38, -0.39, -0.38, -0.38, -0.39, 0.88, -0.38]

The ₹1,25,000 order has z = 2.96 — **not flagged**. The outlier inflated the very mean and standard
deviation it is measured against (this is called *masking*). In a small sample it is worse: with n values,
no z-score can exceed (n − 1)/√n, which is 2.85 for n = 10. z-scores suit large, roughly bell-shaped data;
for skewed business data like order values, prefer IQR.

## Is it an error or real? Ask the data, then a person

**K05, ₹1,25,000, Retail.** A retail customer buying ₹1.25 lakh of phone cases and chargers? The other
retail orders are ₹870–₹1,510. Look at the order: if it has 2 items at ₹625, the amount was typed with two
extra zeros. Evidence that points to an **error**: impossible for its type, a round "extra zeros" pattern,
other columns that disagree (item count, payment amount).

**K11, ₹48,000, Corporate.** A company ordering accessories for a new office. Big, but plausible for its
type, and the payment record agrees. **Real.**

Some values are errors on their face: a negative delivery time, an age of 250, a date in 2099, a 140%
discount. Those need no debate.

## What to do with each

| Case | Action | Example |
|---|---|---|
| Error you can correct from another source | **Fix** it, log the change | K05 → ₹1,250 from the invoice |
| Error you cannot correct | Set to NaN (missing) or exclude, log it | delivery_min = −4 |
| Real extreme | **Keep** it; report it separately or use a robust measure | K11, the corporate order |
| Real, but the question is about the typical case | Analyse the segment separately, or use the median | "average retail basket" |

After fixing K05 from the invoice:

    fixed = orders.copy()
    fixed.loc[fixed["order_id"] == "K05", "amount"] = 1250
    print(fixed["amount"].mean(), fixed["amount"].median())
    # 5102.5 1250.0

    print(fixed.loc[fixed["customer_type"] == "Retail", "amount"].mean().round(2))
    # 1202.73 — the honest "average retail order"

The mean is still pulled by the real ₹48,000 order. That is not a reason to delete it: total revenue
must include it. It is a reason to report **retail and corporate separately** or to use the median.

**Capping** (\`a.clip(upper=high)\`) replaces extremes with a limit. It is common before training a model,
but in a report it changes real revenue, so say so if you do it.

## The habit

\`df.describe()\` on every numeric column, every time. Look at **min** and **max** first: a negative
minimum or a maximum ten times the 75th percentile is where outliers announce themselves.

    pd.Series([28, 31, 25, -4, 35, 29, 33, 240, 30, 27]).describe().round(1)
    # (count, std, 25% and 75% left out)

    mean      47.4      # far above the median of 29.5 — something is large
    min       -4.0      # impossible: a delivery cannot take negative minutes
    50%       29.5
    max      240.0      # 4 hours: error, or a real disaster? Check the order log.`,
    mcqs: [
      mcq('Delivery times in minutes have Q1 = 22 and Q3 = 34. Under the 1.5 × IQR rule, above what value is a delivery flagged?', [
        ['52 minutes', true],
        ['46 minutes', false],
        ['51 minutes', false],
        ['68 minutes', false],
      ], 'IQR = 34 − 22 = 12, and the upper fence is Q3 + 1.5 × 12 = 34 + 18 = 52. Anything above 52 minutes is drawn as a dot on a box plot.'),
      mcq('In ten orders, one is ₹1,25,000 and nine are near ₹1,200. Its z-score comes out below 3. Why does the z-score rule miss it?', [
        ['The outlier inflates the mean and SD it is measured by', true],
        ['z-scores can only flag the values below the mean', false],
        ['A z-score needs the data sorted in order first', false],
        ['The z-score uses the median, which ignores outliers', false],
      ], 'This is masking: the extreme value raises the mean and, much more, the standard deviation, so its own distance in SDs looks modest. With n = 10 no z-score can even exceed 2.85.'),
      mcq('A student\'s age in a college admissions file is 2004. What is the most sensible handling?', [
        ['Treat it as a birth year typed in the wrong column', true],
        ['Keep it, as a real outlier the data happens to contain', false],
        ['Replace it with the mean age of the rest of the batch', false],
        ['Cap it at the IQR upper fence for the age column', false],
      ], 'No student is 2004 years old, so it is an error — and its pattern (a plausible year) suggests what went wrong. Check the record and correct it, or set it to missing and log it.'),
    ],
    checkpoint: [
      ck(CLEAN, 'A grocery chain\'s bill amounts have Q1 = ₹400 and Q3 = ₹1,000. A Diwali bulk order of ₹9,800 by a verified hotel is above the fence. What should the analyst do?', [
        ['Keep it in revenue and report it or its segment apart', true],
        ['Delete it, because it is above the IQR upper fence', false],
        ['Replace it with ₹1,900, which is the value of the upper fence', false],
        ['Set it to NaN so it does not affect the average', false],
      ], 'It is a real order, so it belongs in total revenue. Flagging is not deleting: report it separately or use the median for "typical bill" questions.'),
      ck(CLEAN, 'Which outlier is clearly a data error rather than a real extreme?', [
        ['A delivery time of −4 minutes', true],
        ['A ₹3 lakh order from a corporate client', false],
        ['A customer with 41 orders in one month', false],
        ['A rating of 1 out of 5 on a late order', false],
      ], 'A negative duration is impossible. The others are unusual but possible and should be checked before anyone calls them errors.'),
      ck(CLEAN, 'Monthly salaries in an HR file are strongly right-skewed (a few senior leaders). Which approach to flag unusual salaries is most suitable?', [
        ['The IQR rule, as quartiles are not pulled by the extremes', true],
        ['A z-score above 3, since it assumes a symmetric bell shape', false],
        ['Anything above the mean, as half the values lie above it', false],
        ['Anything above the maximum of the previous month\'s file', false],
      ], 'Quartiles are robust to the extremes, so IQR fences stay meaningful on skewed data. z-scores rely on a mean and SD that the skew distorts, and "above the mean" is not unusual at all.'),
    ],
  },

  /* ── QUALITY_CHECKS ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_DATA_CLEANING_QUALITY_CHECKS',
    notes: `You cleaned March's file by hand in a notebook, and the numbers were right. Next month a new file
arrives, and something in it is different — a new status spelling, duplicated rows, an amount in paise.
If your checks lived only in your head, you will not notice until the regional manager does. This unit
turns "I looked at it" into **checks that run every time**, and a **cleaning log** that says what changed.

## What to check

Five kinds of check catch most real problems:

| Check | Question | pandas |
|---|---|---|
| Volume | Is the row count plausible? | \`len(df)\` between expected limits |
| Uniqueness | Is the key unique? | \`df["order_id"].is_unique\` / \`.duplicated().sum()\` |
| Completeness | Are required columns filled? | \`df[col].isna().sum()\` |
| Validity | Are values in range / in the allowed list? | \`.between(lo, hi)\`, \`.isin(allowed)\` |
| Consistency | Do totals reconcile with another source? | compare to finance's total |

## Checks as a function

Write the checks once, as a function that **returns a list of problems** — empty means clean. A list is
better than stopping at the first failure: you see everything wrong with the file in one run.

    def check(df):
        problems = []
        if len(df) == 0:
            problems.append("file has no rows")
        dup = df["order_id"].duplicated().sum()
        if dup:
            problems.append(f"{dup} duplicate order_id")
        for col in ["order_id", "order_date", "store", "amount"]:
            n = df[col].isna().sum()
            if n:
                problems.append(f"{n} missing {col}")
        bad_amt = (~df["amount"].between(1, 200000)).sum()
        if bad_amt:
            problems.append(f"{bad_amt} amount outside 1..200000")
        allowed = {"PAID", "REFUNDED"}
        bad_status = (~df["status"].isin(allowed)).sum()
        if bad_status:
            problems.append(f"{bad_status} status not in {sorted(allowed)}")
        return problems

(\`~\` means NOT on a True/False column. Note that \`between\` is False for a missing amount, so a blank
amount also counts as "outside" — which is what you want.)

Two monthly files from a supermarket chain in Andhra Pradesh — March's (four clean bills, not shown) and
April's:

    april = pd.DataFrame({
        "order_id": ["A1", "A2", "A2", "A4", "A5"],
        "order_date": pd.to_datetime(["2024-04-01", "2024-04-03", "2024-04-03", None, "2024-04-20"]),
        "store": ["Vizag", "Guntur", "Guntur", "Vizag", None],
        "amount": [1200.0, 0.0, 0.0, 3100.0, 250000.0],
        "status": ["PAID", "Paid", "Paid", "PAID", "PAID"],
    })

March passes:

    print(check(march))
    # []

April's does not:

    for p in check(april):
        print("-", p)

    - 1 duplicate order_id
    - 1 missing order_date
    - 1 missing store
    - 3 amount outside 1..200000
    - 2 status not in ['PAID', 'REFUNDED']

Every line is something to fix or explain **before** anyone sees a chart.

**assert or a list?** \`assert df["order_id"].is_unique, "duplicate ids"\` is fine in a notebook — it stops
the run with your message. In a script others run, prefer the list (or raise a \`ValueError\`): Python
skips \`assert\` statements entirely when run with the \`-O\` flag, and an assert reports only the first
failure.

## The cleaning log

Each cleaning step records what it did, so the result can be explained and reproduced:

    log = []

    def step(df, name, fn):
        before = len(df)
        out = fn(df)
        log.append({"step": name, "rows_before": before, "rows_after": len(out)})
        return out

    df = april
    df = step(df, "drop exact duplicates", lambda d: d.drop_duplicates())
    df = step(df, "upper-case status", lambda d: d.assign(status=d["status"].str.upper()))
    df = step(df, "drop rows missing order_date", lambda d: d.dropna(subset=["order_date"]))

    print(pd.DataFrame(log))

                               step  rows_before  rows_after
    0         drop exact duplicates            5           4
    1             upper-case status            4           4
    2  drop rows missing order_date            4           3

    print(check(df))
    # ['1 missing store', '2 amount outside 1..200000']

The checks run **again after cleaning**. Two problems remain — a ₹0 bill and a ₹2,50,000 bill, and a row
with no store — and they need a person, not a rule. That is the honest state of the data, and the log
says so.

## A pipeline for next month

Put the steps in order, in one function, and run the checks before and after:

    def clean(raw):
        log.clear()
        df = step(raw, "drop exact duplicates", lambda d: d.drop_duplicates())
        df = step(df, "upper-case status", lambda d: d.assign(status=d["status"].str.upper()))
        df = step(df, "drop rows missing order_date", lambda d: d.dropna(subset=["order_date"]))
        return df

    may = pd.read_csv("sales_2024_05.csv", parse_dates=["order_date"])
    print("before:", check(may))
    may_clean = clean(may)
    print("after:", check(may_clean))
    print(pd.DataFrame(log))

Next month is three lines, not an afternoon. Keep the function in a \`.py\` file the notebook imports, so the
same rules run everywhere.

> SQL comparison: the same checks are queries — \`SELECT order_id FROM sales GROUP BY order_id HAVING
> COUNT(*) > 1\`, \`WHERE amount NOT BETWEEN 1 AND 200000\`. Teams using dbt or Great Expectations write
> exactly these checks as tests; the idea is the same.`,
    mcqs: [
      mcq('Why does the `check(df)` function return a list of problems instead of stopping at the first one with assert?', [
        ['You see every problem in the file from a single run', true],
        ['Returning a list makes the check run faster than assert does', false],
        ['assert cannot test any condition on a DataFrame', false],
        ['A returned list automatically fixes the problems', false],
      ], 'An assert stops at the first failure, so you fix one problem, rerun and find the next. A list reports all of them at once — and asserts are skipped entirely under python -O.'),
      mcq('In a supermarket\'s bill file, `(~df["amount"].between(1, 200000)).sum()` returns 3. One bill is ₹0, one is ₹2,50,000. What can the third be?', [
        ['A bill with a missing amount', true],
        ['A bill of exactly ₹1', false],
        ['A bill of exactly ₹2,00,000', false],
        ['A bill whose amount has 2 decimal places', false],
      ], 'between includes both ends by default, so ₹1 and ₹2,00,000 pass. NaN compares as False, so ~ turns it True and a blank amount is counted as invalid.'),
      mcq('A cleaning log shows `rows_before 5,200, rows_after 3,100` for the step "convert amount to number". What does that suggest?', [
        ['The step dropped rows it should only have converted', true],
        ['The file had 2,100 genuinely duplicate orders', false],
        ['The conversion worked; type changes reduce rows', false],
        ['The log has added the two numbers the wrong way round', false],
      ], 'A type conversion should never change the row count. A big drop means the step (perhaps with a dropna after coerce) removed rows whose amounts failed to parse — exactly what a log is there to catch.'),
    ],
    checkpoint: [
      ck(QUALITY, 'A monthly sales file normally has 40,000–45,000 rows. This month it has 21,000 and every other check passes. What should happen?', [
        ['Flag it and confirm the file is complete before reporting', true],
        ['Report as usual, since all the other checks passed', false],
        ['Double each figure to make up for the missing half', false],
        ['Drop the volume check, since it fails on real data', false],
      ], 'A row count far outside its usual range often means a partial export or a missing store. Every row can be valid while half the month is absent — only a volume check catches that.'),
      ck(QUALITY, 'Which line checks that every `status` in a bank\'s transactions file is one of the allowed values?', [
        ['df["status"].isin(["SUCCESS", "FAILED", "PENDING"]).all()', true],
        ['df["status"].notna().all()', false],
        ['df["status"].is_unique', false],
        ['df["status"].nunique() == 3', false],
      ], 'isin(...).all() is True only if every value is in the list. notna checks completeness, is_unique checks uniqueness, and nunique() == 3 passes for any three values, such as a new "REVERSED".'),
      ck(QUALITY, 'An analyst cleans each month\'s file by editing cells in a notebook until it "looks right". What is the main weakness?', [
        ['The steps cannot be rerun or checked on next month\'s file', true],
        ['Notebooks cannot be used for cleaning data', false],
        ['Hand edits make pandas run more slowly over time', false],
        ['The notebook cannot be saved after editing data', false],
      ], 'Manual fixes leave no record and do not repeat. A cleaning function with a log and checks run before and after makes the result reproducible and explainable.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_DATA_CLEANING_DEBUGGING',
    notes: `Cleaning bugs rarely crash. They return a number that is a little wrong, and a manager decides
something on it. Below are eight faults from real analyst work — the symptom you notice, the cause, and
the one change that fixes it. Every example was run on pandas 3.0; where pandas 2.x behaves differently,
it says so.

## 1. KeyError on a column you can see

**Symptom:** \`df["amount"]\` raises \`KeyError: 'amount'\`, yet the column is right there in \`df.head()\`.
**Cause:** the header in the CSV was \`order_id, amount ,city\` — the column is really called \`" amount "\`.
\`print(df.columns.tolist())\` shows it: \`['order_id', ' amount ', 'city']\`.
**Fix:** clean the headers once, straight after reading:

    df.columns = df.columns.str.strip()          # add .str.lower() for one convention

## 2. The average order value is too low — and nobody saw an error

**Symptom:** average order value ₹776.33. Finance says about ₹1,180.
**Cause:** \`pd.to_numeric(df["amount"], errors="coerce")\` on values like \`"1,250"\`: every amount with a
comma became NaN, and \`mean()\` skipped them. The mean was taken over **3 of 6** orders:

    x = pd.to_numeric(s, errors="coerce")
    print(x.mean(), x.count())     # 776.333... 3

**Fix:** remove the commas first, then convert, then confirm nothing was lost:

    y = pd.to_numeric(s.str.replace(",", "", regex=False))
    print(round(y.mean(), 2), y.count())     # 1179.83 6

Leaving out \`errors="coerce"\` here is deliberate: if anything still fails, you want the error.

## 3. March sales appear in May

**Symptom:** the file covers 1–12 March only, yet a monthly chart shows sales spread from January to
December.
**Cause:** dates like \`05/03/2024\` (5 March) were parsed month-first, as 3 May. No error appeared because
every day in the file was 12 or below, so every value was also a valid month-first date. (One date such as
13/03 would have raised an error — a file without one gives no warning at all.)
**Fix:** \`pd.to_datetime(df["order_date"], format="%d/%m/%Y")\`. After parsing, check
\`df["order_date"].min()\`, \`.max()\` and the count per month against what you expect.

## 4. Revenue went up after joining the customer table

**Symptom:** 4 orders worth ₹2,400 become **8 rows worth ₹4,000** after adding each customer's city.
**Cause:** the customer master had customer C1 three times ("Pune", "Pune " and "pune"). Each of C1's two
orders matched three rows.

    m = orders.merge(custs, on="cust_id", how="left")
    print(len(orders), len(m), orders["amount"].sum(), m["amount"].sum())     # 4 8 2400 4000

**Fix:** clean and de-duplicate the lookup table first, and make pandas check the shape of the join:

    orders.merge(custs, on="cust_id", how="left", validate="many_to_one")
    # MergeError: Merge keys are not unique in right dataset; not a many-to-one merge

\`validate\` turns a silent doubling into an error. Also compare \`len()\` before and after every merge.

## 5. fillna "did nothing"

**Symptom:** after \`df["discount"].fillna(0, inplace=True)\`, the column still has NaN.
**Cause:** chained assignment. \`df["discount"]\` hands back a separate Series, and \`inplace=True\` changes
that, not \`df\`. On **pandas 3.0** (Copy-on-Write is always on) this never updates \`df\`, and pandas warns
with a \`ChainedAssignmentError\`. On **pandas 2.x** this particular line usually *does* update \`df\` but shows a
FutureWarning that it will stop working — so code that "worked" breaks on upgrade. The same applies to
\`df[df["discount"].isna()]["discount"] = 0\`, which never works on either version (pandas 2.x shows the
famous SettingWithCopyWarning).
**Fix:** assign the result back, or use one \`.loc\`:

    df["discount"] = df["discount"].fillna(0)
    df.loc[df["discount"].isna(), "discount"] = 0

## 6. drop_duplicates removed nothing

**Symptom:** a customer list has "Ravi Kumar", "ravi kumar " and "Ravi  Kumar" with the same phone; after
\`drop_duplicates()\` all 3 rows remain.
**Cause:** the rows are not identical text. pandas compares exactly.
**Fix:** standardise first, then de-duplicate:

    d["name"] = d["name"].str.split().str.join(" ").str.lower()
    len(d.drop_duplicates())        # 1

## 7. Pincodes lost a digit

**Symptom:** a delivery-zone report has pincodes like 40012 that match nothing.
**Cause:** read_csv read the column as numbers, and \`040012\` became 40012.
**Fix:** \`pd.read_csv(path, dtype={"pincode": str})\`. Any code or ID you never do arithmetic on should be
text.

## 8. Some ISO dates became the wrong month

**Symptom:** after merging two systems' exports, orders dated \`2024-03-05\` show as 3 May.
**Cause:** \`pd.to_datetime(s, format="mixed", dayfirst=True)\` — \`dayfirst\` was meant for the \`05/03/2024\`
values but was applied to the ISO ones too:

    pd.to_datetime(pd.Series(["2024-03-05", "05/03/2024"]), format="mixed", dayfirst=True).tolist()
    # [Timestamp('2024-05-03 00:00:00'), Timestamp('2024-03-05 00:00:00')]

**Fix:** parse each known format explicitly with \`errors="coerce"\` and combine with \`fillna\` (see the Types
and Parsing unit), then count what is left unparsed.

## How to debug a cleaning step you do not trust

1. Count rows, NaNs and the column total **before and after** every step.
2. Print the rows the step changed: \`df[before != after]\` or the rows that became NaN.
3. Check \`dtypes\` after every read and every conversion.
4. After a merge: same row count as the left table? If not, find the duplicated keys in the right one.
5. Reconcile one number with a source you trust (finance's total, the app's order count).`,
    mcqs: [
      mcq('After merging 10,000 orders with a store lookup table, the result has 10,640 rows. What is the first thing to check?', [
        ['Whether some store IDs appear more than once in the lookup', true],
        ['Whether the orders table has 640 rows with blank values', false],
        ['Whether the left merge should be replaced with an outer one', false],
        ['Whether pandas needs more memory for a merge this size', false],
      ], 'A left merge can only add rows when a key matches several rows on the right. Find duplicated keys with lookup["store_id"].duplicated(); validate="many_to_one" turns this into an error.'),
      mcq('A notebook line `df["city"].fillna("Unknown", inplace=True)` leaves the blanks in place on pandas 3.0. Which line fixes it on both pandas 2.x and 3.0?', [
        ['df["city"] = df["city"].fillna("Unknown")', true],
        ['df["city"].fillna("Unknown", inplace=False)', false],
        ['df["city"].copy().fillna("Unknown", inplace=True)', false],
        ['df[["city"]].fillna("Unknown", inplace=True)', false],
      ], 'Assigning the result back to the column updates the DataFrame on every version. The other three each change a separate object and leave df untouched.'),
      mcq('`df["amount"]` raises KeyError, but `df.head()` shows a column that looks like amount. What does `df.columns.tolist()` most likely show?', [
        ['A name with spaces around it, such as \' amount \'', true],
        ['The name amount written in capital letters only', false],
        ['No columns, as head() shows a cached old copy', false],
        ['Two columns that are both called amount', false],
      ], 'Spaces around a header are invisible in a printed table but are part of the name. Strip the headers after reading with df.columns = df.columns.str.strip().'),
      mcq('An analyst reports average delivery time from a column cleaned with `pd.to_numeric(..., errors="coerce")`. Values like "32 min" were in the raw data. What is the risk?', [
        ['Those values became NaN and the mean silently left them out', true],
        ['coerce turns "32 min" into 0, which lowers the mean', false],
        ['coerce raises an error on "32 min", stopping the run', false],
        ['coerce reads "32 min" as 32, which is what was meant', false],
      ], 'coerce turns unreadable values into NaN and mean skips NaN, so the average describes only the clean-looking rows. Strip the units first and count the NaNs coerce created.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_DATA_CLEANING_PRACTICE',
    notes: `Six cleaning exercises on one messy file, then a graded program. Write the code yourself first, run
it, and only then compare. Every expected answer below came from running the code on pandas 3.0 (pandas
2.x gives the same numbers).

## The data — personal-loan applications at a bank's South India branches

    import io
    import pandas as pd

    csv = """app_id,applied_on,branch_city,loan_amount,monthly_income,status
    L001,02-01-2024,Chennai,"₹2,50,000",45000,Approved
    L002,03-01-2024,chennai ,"₹1,20,000",,Rejected
    L003,05-01-2024,Madras,"Rs 3,00,000",62000,Approved
    L004,05-01-2024,Coimbatore,NA,38000,Pending
    L005,09-01-2024,Kochi,"₹75,000",29000,approved
    L002,03-01-2024,chennai ,"₹1,20,000",,Rejected
    L006,12-01-2024,Cochin,"₹50,00,000",51000,Approved
    L007,15-01-2024,Coimbatore,"₹1,80,000",,Pending
    L008,16-01-2024,Kochi,"₹2,20,000",47000,Approved
    """
    df = pd.read_csv(io.StringIO(csv))

Amounts use the Indian grouping (₹2,50,000 is 2.5 lakh), dates are DD-MM-YYYY, and the branch names come
in old and new spellings.

## Exercise 1 — Profile the missing values

How many rows are there, and how many blanks in each column?

**Answer.** 9 rows. \`df.isna().sum()\` gives loan_amount 1 and monthly_income 3, everything else 0. The
"NA" in L004 was read as missing automatically — read_csv treats the string \`NA\` as NaN by default.

## Exercise 2 — Remove exact duplicates

**Answer.** \`df.duplicated().sum()\` is 1 (L002 appears twice, identically). After
\`df = df.drop_duplicates()\` there are **8 rows**. Check \`df["app_id"].is_unique\` — now True.

## Exercise 3 — Convert loan_amount to a number

Strip ₹, "Rs" and the commas, convert, and report how many values could not be converted.

**Answer.**

    amt = (df["loan_amount"].str.replace("₹", "", regex=False)
                            .str.replace("Rs", "", regex=False)
                            .str.replace(",", "", regex=False)
                            .str.strip())
    df["loan_amount"] = pd.to_numeric(amt, errors="coerce")
    df["loan_amount"].tolist()
    # [250000.0, 120000.0, 300000.0, nan, 75000.0, 5000000.0, 180000.0, 220000.0]

One NaN — L004, which was already missing. Nothing new was lost; say that in your log.

## Exercise 4 — Parse the dates and count applications by weekday

**Answer.**

    df["applied_on"] = pd.to_datetime(df["applied_on"], format="%d-%m-%Y")
    df["applied_on"].dt.day_name().value_counts()

    Tuesday      3
    Friday       3
    Wednesday    1
    Monday       1

(2 January 2024 was a Tuesday. Without the format, 05-01-2024 would be read as 1 May.)

## Exercise 5 — Standardise the text and total the loans per city

Madras is Chennai and Cochin is Kochi. Also make the status values consistent.

**Answer.**

    df["branch_city"] = (df["branch_city"].str.strip().str.title()
                         .replace({"Madras": "Chennai", "Cochin": "Kochi"}))
    df["status"] = df["status"].str.title()
    df.groupby("branch_city")["loan_amount"].sum()

    Chennai        670000.0
    Coimbatore     180000.0
    Kochi         5295000.0

Kochi looks huge. Exercise 6 says why.

## Exercise 6 — Find the outlier and decide what it is

Use the IQR rule on loan_amount, then compare loan to monthly income.

**Answer.**

    a = df["loan_amount"]
    q1, q3 = a.quantile([0.25, 0.75])
    iqr = q3 - q1
    print(q1, q3, q1 - 1.5 * iqr, q3 + 1.5 * iqr)
    # 150000.0 275000.0 -37500.0 462500.0

L006 at ₹50,00,000 is far above ₹4,62,500. Its loan-to-monthly-income ratio is **98**; every other
application is between 2.6 and 5.6. A ₹50 lakh *personal* loan on ₹51,000 a month is implausible —
probably ₹5,00,000 with an extra zero. Do not "fix" it yourself: flag it to the branch, and until it is
confirmed, report Kochi with and without it. Also note that the two missing incomes are a Rejected and a
Pending application — the blanks are not random, so do not fill them with the average.

## Exercise 7 — the graded program

The assignment in this unit is a cleaning program in **plain Python** (no pandas — the grader runs Python
3.10 with the standard library only). It is the same work as the exercises above, done by hand with
\`csv\`, \`datetime\` and string methods: trim, normalise city names, parse amounts in several formats and
dates in three formats, drop duplicates, reject invalid rows, and print a summary. Writing it once without
pandas is the best way to understand what \`to_numeric\`, \`to_datetime\` and \`drop_duplicates\` are doing for
you.`,
    mcqs: [
      mcq('In the loan file, what does `pd.to_datetime("05-01-2024", format="%d-%m-%Y")` return?', [
        ['5 January 2024', true],
        ['1 May 2024', false],
        ['A ValueError, as the date uses dashes', false],
        ['NaT, as the day number comes first', false],
      ], 'The format says day, then month, then year, separated by dashes, so the value is read exactly as written: 5 January 2024.'),
      mcq('After `df.drop_duplicates()` the loan file has 8 rows. `df["app_id"].is_unique` returns True. What does that confirm?', [
        ['No application ID appears more than once', true],
        ['No column in the file has any missing values', false],
        ['Every loan amount is now stored as a number', false],
        ['The file has 8 different branch city names', false],
      ], 'is_unique checks one thing: every value in that column is different. It says nothing about blanks, types or other columns.'),
      mcq('The loan amounts are "₹2,50,000" style. Which value does Exercise 3\'s cleaning chain produce for "Rs 3,00,000" before to_numeric?', [
        ['"300000"', true],
        ['"3,00,000"', false],
        ['"Rs300000"', false],
        ['" 300000"', false],
      ], 'The chain removes "₹", then "Rs", then the commas, and strip() removes the space the "Rs " prefix left behind.'),
      mcq('The two missing monthly incomes belong to a Rejected and a Pending application. Why not fill them with the mean income of ₹45,333?', [
        ['The blanks are linked to status, so a mean would mislead', true],
        ['fillna cannot fill a column that has float values in it', false],
        ['The mean of the column cannot be computed with NaN in it', false],
        ['Filling would change the number of rows in the file', false],
      ], 'Missing only for non-approved applications means the gap is related to the outcome. Filling with the approved-heavy mean hides that and makes those applicants look like everyone else.'),
      mcq('A loan application has an amount 98 times the applicant\'s monthly income; the rest are 2.6–5.6. What is the best next step?', [
        ['Flag it and ask the branch to confirm the amount', true],
        ['Divide the amount by 10, since it is likely a typo', false],
        ['Delete the application from the file altogether', false],
        ['Keep it unchanged and say nothing in the report', false],
      ], 'It looks like an extra zero, but only the source can confirm. Flag it, report results with and without it, and record the decision in the cleaning log.'),
    ],
    assignment: {
      title: 'Clean a Messy Orders Export (plain Python)',
      description: 'Read a food-delivery app’s messy orders CSV from standard input, clean it with the standard library — trim, normalise cities, parse amounts and dates in several formats, drop duplicates, reject invalid rows — and print a summary.',
      instructions: `Write a Python program that reads a CSV of orders from standard input, cleans it and prints a
summary. **Use only the standard library** (csv, datetime, re, ...); pandas is not available.

**Input**

The first line is a header (\`order_id,date,city,amount,status\`) — skip it. Every following line is one
order. Use \`csv.reader(sys.stdin)\`, because an amount like \`"1,250"\` is quoted and contains a comma.
**Skip blank lines** completely (they are not counted anywhere).

**Cleaning rules, applied to each row in order**

1. Count the row as **read**.
2. A row that does not have exactly 5 fields is **invalid**.
3. \`order_id\`: trim spaces. Empty → **invalid**. If this order_id was already seen in an earlier row
   (valid or invalid, compared exactly after trimming), the row is a **duplicate**: count it and skip it.
4. \`date\`: trimmed, must match one of \`YYYY-MM-DD\`, \`DD/MM/YYYY\` or \`DD-MM-YYYY\` and be a real date
   (31/02/2024 is not). Otherwise **invalid**.
5. \`city\`: collapse runs of spaces, trim, Title Case. Empty → **invalid**. Then map the old names:
   Bangalore → Bengaluru, Bombay → Mumbai, Gurgaon → Gurugram, Calcutta → Kolkata.
6. \`amount\`: trim; remove one leading prefix \`Rs.\`, \`Rs\`, \`INR\` or \`₹\` (any case); remove commas
   and spaces. What remains must be digits with an optional decimal part (\`1250\`, \`300.5\`) and greater
   than 0. Otherwise **invalid**.
7. \`status\`: case-insensitive \`delivered\` → DELIVERED; \`cancelled\` or \`canceled\` → CANCELLED; anything
   else → **invalid**.

A row is **clean** if it is not invalid and not a duplicate.

**Output**

    Rows read: <n>
    Duplicates: <n>
    Invalid: <n>
    Clean: <n>
    Delivered: <n> orders, revenue <total of delivered amounts, 2 decimals>
    Cancelled: <n>
    By city:
    <City> <delivered revenue, 2 decimals>
    ...
    Date range: <earliest clean date> to <latest clean date>

City lines list only cities with delivered orders, **highest revenue first**, ties in alphabetical order.
If there are no delivered orders, print \`By city: none\` instead of the "By city:" block. If there are no
clean rows, print \`Date range: none\`. Dates print as YYYY-MM-DD.

**Example**

Input:

    order_id,date,city,amount,status
    F101,2024-03-02, bangalore ,450,Delivered
    F102,05/03/2024,Mumbai,"Rs 1,250.50",delivered
    F103,2024-03-04,Pune,300,Cancelled
    F101,2024-03-02,Bangalore,450,Delivered
    F104,31/02/2024,Pune,200,Delivered
    F105,18-03-2024,Bengaluru,INR 1650,DELIVERED

Output:

    Rows read: 6
    Duplicates: 1
    Invalid: 1
    Clean: 4
    Delivered: 3 orders, revenue 3350.50
    Cancelled: 1
    By city:
    Bengaluru 2100.00
    Mumbai 1250.50
    Date range: 2024-03-02 to 2024-03-18

(F101 appears twice; F104's date does not exist; " bangalore " and "Bengaluru" are the same city.)

**How it is graded**

Your program is run against every test case — the example above and several you cannot see, with
blank files, every kind of invalid value and tied cities — and scored on how many it passes. Output is
compared line by line. A reviewer uses the rubric for the design marks.`,
      rubric: [
        { criterion: 'Correct output', description: 'Every line matches for every test case, including quoted amounts, all three date formats, impossible dates, zero and negative amounts, unknown statuses, duplicates and an input with no rows.', maxPoints: 60 },
        { criterion: 'One function per rule', description: 'Separate small functions parse the date, the amount, the city and the status, each returning a value or None; the main loop only counts and collects.', maxPoints: 25 },
        { criterion: 'Clarity', description: 'Clear names, the alias table and date formats defined once as constants, no bare except, and no repeated parsing logic.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys
import csv
from datetime import datetime

ALIASES = {'Bangalore': 'Bengaluru', 'Bombay': 'Mumbai', 'Gurgaon': 'Gurugram', 'Calcutta': 'Kolkata'}
DATE_FORMATS = ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y')


def parse_date(raw):
    """Return a datetime.date, or None if raw matches none of DATE_FORMATS."""
    # TODO: try each format with datetime.strptime; a ValueError means "not this format"
    return None


def parse_amount(raw):
    """Return the amount as a float > 0, or None. Strip one Rs./Rs/INR/₹ prefix, commas and spaces."""
    # TODO
    return None


def clean_city(raw):
    """Collapse spaces, Title Case, apply ALIASES. Return None for an empty city."""
    # TODO
    return None


def parse_status(raw):
    """Return 'DELIVERED' or 'CANCELLED', or None for anything else."""
    # TODO
    return None


def main():
    reader = csv.reader(sys.stdin)
    next(reader, None)  # skip the header
    for row in reader:
        # TODO: skip blank lines; count read / duplicate / invalid; keep the clean rows
        pass
    # TODO: print the summary in the exact format the instructions give


main()
`,
        tests: [
          { input: 'order_id,date,city,amount,status\nF101,2024-03-02, bangalore ,450,Delivered\nF102,05/03/2024,Mumbai,"Rs 1,250.50",delivered\nF103,2024-03-04,Pune,300,Cancelled\nF101,2024-03-02,Bangalore,450,Delivered\nF104,31/02/2024,Pune,200,Delivered\nF105,18-03-2024,Bengaluru,INR 1650,DELIVERED\n', expectedOutput: 'Rows read: 6\nDuplicates: 1\nInvalid: 1\nClean: 4\nDelivered: 3 orders, revenue 3350.50\nCancelled: 1\nBy city:\nBengaluru 2100.00\nMumbai 1250.50\nDate range: 2024-03-02 to 2024-03-18' },
          { input: 'order_id,date,city,amount,status\nA1,2024-04-01,Delhi,-200,Delivered\nA2,2024-04-02,Delhi,abc,Delivered\nA3,2024-04-03,Delhi,0,Delivered\n,2024-04-04,Delhi,100,Delivered\nA4,2024-04-05,Delhi,100,Returned\n', expectedOutput: 'Rows read: 5\nDuplicates: 0\nInvalid: 5\nClean: 0\nDelivered: 0 orders, revenue 0.00\nCancelled: 0\nBy city: none\nDate range: none' },
          { input: 'order_id,date,city,amount,status\n', expectedOutput: 'Rows read: 0\nDuplicates: 0\nInvalid: 0\nClean: 0\nDelivered: 0 orders, revenue 0.00\nCancelled: 0\nBy city: none\nDate range: none', isHidden: true },
          { input: 'order_id,date,city,amount,status\n  X9 ,10/01/2024,  new   delhi ,"1,000",canceled\nX9,10/01/2024,New Delhi,1000,Delivered\nX10,2024-01-11,BOMBAY,Rs.700,Delivered\n\nX11,2024-01-09,Mumbai,300.5,delivered\nX12,2024-01-12,Kolkata,250\n', expectedOutput: 'Rows read: 5\nDuplicates: 1\nInvalid: 1\nClean: 3\nDelivered: 2 orders, revenue 1000.50\nCancelled: 1\nBy city:\nMumbai 1000.50\nDate range: 2024-01-09 to 2024-01-11', isHidden: true },
          { input: 'order_id,date,city,amount,status\nB1,2024-02-10,Hyderabad,500,Delivered\nB2,2024-02-11,Chennai,500,Delivered\nB3,2024-02-09,,500,Delivered\nB4,2024/02/12,Chennai,500,Delivered\nB5,2024-02-13,calcutta,rs 120.75,Delivered\nB6,2024-02-14,Chennai,0.00,Delivered\n', expectedOutput: 'Rows read: 6\nDuplicates: 0\nInvalid: 3\nClean: 3\nDelivered: 3 orders, revenue 1120.75\nCancelled: 0\nBy city:\nChennai 500.00\nHyderabad 500.00\nKolkata 120.75\nDate range: 2024-02-10 to 2024-02-13', isHidden: true },
          { input: 'order_id,date,city,amount,status\nC1,13/13/2024,Pune,100,Delivered\nC1,2024-05-01,Pune,100,Delivered\nC2,2024-05-02,Gurgaon,INR 2,Cancelled\n', expectedOutput: 'Rows read: 3\nDuplicates: 1\nInvalid: 1\nClean: 1\nDelivered: 0 orders, revenue 0.00\nCancelled: 1\nBy city: none\nDate range: 2024-05-02 to 2024-05-02', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_DATA_CLEANING_INTERVIEW_QUESTION',
    notes: `Almost every data analyst interview in India — from a service company's analytics team to a
startup — asks about cleaning, because it is most of the job. Interviewers are not testing whether you
know \`dropna\`. They are testing whether you **think before you change data**. Three questions, the
answer that gets you through, and the follow-up a good answer earns.

## 1. "A key column has 20% missing values. What do you do?"

**Model answer.** "First I find out *why* they are missing, because that decides everything. I check
whether the blanks cluster — by date, by source system, by city, by customer type. If, say, income is
missing mostly for self-employed applicants, the gap is not random and filling it with the average would
bias the result.

Then I decide per column. If the blank has a meaning — no coupon means discount 0 — I fill with that. If
the column is needed for a specific analysis, I exclude those rows *for that analysis only* and report the
base, like 'average rating from 6,200 rated orders out of 10,000'. I avoid mean-filling for a report,
because it invents values and shrinks the spread. If the gap is large and not random, I raise it with
whoever owns the data, because the fix might be upstream. And I write each decision in a cleaning log."

**Follow-ups:**
- *"When would you fill with the median instead of the mean?"* For skewed numbers like income or order
  value, where the mean is pulled by a few large values. Even then I would add a flag column
  (\`income_was_missing\`) so the fill is visible.
- *"What if the data is for a machine-learning model?"* Imputation is more acceptable there, ideally done
  inside the training pipeline so the test data is filled using training statistics only, plus the
  missing-flag column — the fact that it was missing is often predictive.

## 2. "How do you detect and handle outliers?"

**Model answer.** "I start with \`describe()\` and a box plot or histogram — min and max tell you a lot.
To flag values I usually use the IQR rule, 1.5 × IQR beyond the quartiles, because business data is
skewed and quartiles are not pulled by the extremes; z-scores work on large, bell-shaped data but an
extreme value inflates the standard deviation and can hide itself.

Then the important part: is each one an error or real? A negative delivery time or an age of 250 is an
error — I fix it from the source if I can, otherwise set it to missing. A ₹3 lakh corporate order is
real — I keep it, because total revenue must include it, but for 'typical order' questions I use the
median or analyse that segment separately. I never delete an outlier just because it is far from the
rest."

**Follow-ups:**
- *"Give an example where the outlier was the finding."* "A store with ten times the usual refunds turned
  out to be a fraud pattern" — outliers are often the most useful rows.
- *"What is winsorising?"* Capping extremes at a percentile (\`clip\`). Useful before modelling; in a report
  it changes real numbers, so I would say so.

## 3. "How do you know your cleaning did not break the data?"

**Model answer.** "Three habits. One: I count rows, blanks and the key totals before and after every
step, and I keep that in a log — a type conversion should never change the row count, and a merge should
not add rows unless I expect it to. Two: I reconcile one number with a trusted source — finance's monthly
revenue, the app's order count. Three: I write the checks as code — unique keys, required columns filled,
values in range, allowed categories — and run them again after cleaning and on every new file. If the
same pipeline runs next month, problems show up as a failed check instead of a wrong chart."

**Follow-ups:**
- *"A merge increased your row count. What happened?"* Duplicate keys on the right table; I would find
  them with \`duplicated()\` on the key and use \`validate="many_to_one"\` so it fails loudly next time.
- *"Which tools do teams use for this?"* Plain pandas checks, or dbt tests and Great Expectations at
  larger scale — the same checks, run automatically.

## How to answer cleaning questions well

Use a real example with numbers ("4% of orders had no city; I kept them as Unknown so totals still
reconciled"). Name the trade-off of every choice. And always say how you checked.`,
    mcqs: [
      mcq('An interviewer asks how you would handle missing ratings in a food-delivery dataset where 45% of orders are unrated. Which answer shows the best judgement?', [
        ['Analyse rated orders only and state the base the averages use', true],
        ['Fill the missing ratings with the mean so that no order is lost', false],
        ['Drop every order with a missing rating from all the analysis', false],
        ['Fill the missing ratings with 3, the middle of the scale', false],
      ], 'Rating is a choice customers make, so the gap is not random and any fill invents opinions. Use rated orders for rating questions, say how many, and keep unrated orders for everything else.'),
      mcq('Asked "how do you check a merge?", which answer would satisfy an interviewer?', [
        ['Compare row counts before and after, and use validate', true],
        ['Use an outer merge, so that no rows are ever lost', false],
        ['Sort both tables by the key column before merging', false],
        ['Merge on as many columns as the tables have in common', false],
      ], 'Row counts show fan-out or loss immediately, and validate="many_to_one" or "one_to_one" makes pandas raise an error when the keys are not what you assumed.'),
      mcq('An interviewer says: "Your cleaned file has 2% fewer rows than the raw one. Is that a problem?" What is the strongest reply?', [
        ['It depends — my log shows which step removed them and why', true],
        ['No, a 2% loss is normal for any cleaning process', false],
        ['Yes, cleaning should never remove any rows at all', false],
        ['No, as long as the averages still look reasonable', false],
      ], 'Removing duplicates or invalid rows is correct; losing rows to a bad conversion is not. Only a step-by-step log tells you which, and that is what the interviewer is probing for.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_DATA_CLEANING_CHECKPOINT',
    notes: `Ten questions on cleaning and data quality: missing values, types and dates, duplicates and messy
text, outliers, and checks you can rerun. Several show a few lines of pandas and ask what comes out —
work it out on paper for the values shown before choosing. Every snippet was run on pandas 3.0 and gives
the same result on 2.2.`,
    checkpoint: [
      ck(CLEAN, 'What does this print?\n\n    s = pd.Series(["1,200", "850", None, "abc"])\n    print(pd.to_numeric(s.str.replace(",", "", regex=False), errors="coerce").sum())', [
        ['2050.0', true],
        ['NaN', false],
        ['850.0', false],
        ['An error about "abc"', false],
      ], 'After removing the comma, "1200" and "850" convert; None stays missing and "abc" becomes NaN under coerce. sum skips NaN: 1200 + 850 = 2050.0.'),
      ck(CLEAN, 'Pending fees for five students are `pd.Series([4000, None, 2000, None, 3000])`. What do `.mean()` and `.fillna(0).mean()` return?', [
        ['3000.0 and 1800.0', true],
        ['1800.0 and 3000.0', false],
        ['3000.0 and 3000.0', false],
        ['NaN and 1800.0', false],
      ], 'mean skips NaN: 9000 / 3 = 3000. After filling with 0 it divides by 5: 9000 / 5 = 1800. Which is right depends on whether a blank means "no fee due" or "unknown".'),
      ck(CLEAN, 'Order values are 10, 12, 14, 16, 18 and 60 (in ₹100s). pandas gives Q1 = 12.5 and Q3 = 17.5. How many values does the 1.5 × IQR rule flag?', [
        ['1', true],
        ['0', false],
        ['2', false],
        ['6', false],
      ], 'IQR = 5, so the fences are 12.5 − 7.5 = 5 and 17.5 + 7.5 = 25. Only 60 lies outside.'),
      ck(CLEAN, 'What is `pd.to_datetime(pd.Series(["03/04/2024"]), format="%d/%m/%Y").dt.month[0]`?', [
        ['4', true],
        ['3', false],
        ['2024', false],
        ['NaT', false],
      ], 'The format says day first, so "03/04/2024" is 3 April and the month is 4. Without the format pandas would read it month-first as 4 March.'),
      ck(CLEAN, 'Payment modes are " UPI", "upi", "Card" and "Wallet". After `.str.strip().str.upper().map({"UPI": "UPI", "CARD": "CARD"})`, what does `value_counts(dropna=False)` show?', [
        ['UPI 2, CARD 1 and NaN 1', true],
        ['UPI 2, CARD 1 and WALLET 1', false],
        ['UPI 1, upi 1, CARD 1 and NaN 1', false],
        ['UPI 2 and CARD 1, nothing else', false],
      ], 'Stripping and upper-casing merge the two UPI spellings. map turns WALLET, which is not a key, into NaN — so the unmapped value is visible rather than lost.'),
      ck(CLEAN, 'A DataFrame has columns a = [1, None, 3, None] and b = [None, None, "x", "y"]. How many rows do `dropna(subset=["a"])`, `dropna()` and `dropna(how="all")` keep?', [
        ['2, 1 and 3', true],
        ['2, 2 and 3', false],
        ['1, 1 and 2', false],
        ['2, 1 and 4', false],
      ], 'subset=["a"] keeps the rows where a is present (1 and 3). Plain dropna keeps rows with nothing missing (only the third). how="all" drops only the second row, where every value is missing.'),
      ck(CLEAN, 'An analyst wants each delivery partner\'s most recent record from a file with `partner_id` and `updated_at`. Which line is correct?', [
        ['df.sort_values("updated_at").drop_duplicates("partner_id", keep="last")', true],
        ['df.drop_duplicates("partner_id", keep="last").sort_values("updated_at")', false],
        ['df.sort_values("partner_id").drop_duplicates("updated_at", keep="last")', false],
        ['df.drop_duplicates().sort_values("updated_at", ascending=False)', false],
      ], 'Sort by time first, then keep the last row per partner. Dropping first keeps whichever row happened to be last in file order, which is not necessarily the newest.'),
      ck(QUALITY, 'A check on a bank\'s transactions does `orders.merge(accounts, on="acct_id", how="left", validate="many_to_one")` and raises MergeError. What has it found?', [
        ['Some acct_id values appear more than once in accounts', true],
        ['Some transactions have no matching account at all', false],
        ['The acct_id columns have different dtypes in the two', false],
        ['The transactions table has duplicate acct_id values', false],
      ], 'many_to_one means the right table must have each key once. Many transactions per account is fine; a repeated account would multiply rows, and validate stops it.'),
      ck(QUALITY, 'An `ids` column is [101, 102, 102, NaN]. What do `ids.is_unique` and `ids.duplicated().sum()` return?', [
        ['False and 1', true],
        ['False and 2', false],
        ['True and 0', false],
        ['True and 1', false],
      ], '102 appears twice, so the column is not unique; duplicated() marks only the second 102. A uniqueness check also needs a completeness check, because the NaN is a separate problem.'),
      ck(QUALITY, 'A cleaned March file has the right number of rows, unique IDs and no blanks, but its total revenue is ₹3.1 lakh lower than finance\'s figure. Which kind of check found this?', [
        ['Reconciliation against an independent source', true],
        ['A uniqueness check on the order IDs', false],
        ['A completeness check on the required columns', false],
        ['A validity check on the allowed status values', false],
      ], 'Every row can be valid while a store or a day is missing, or amounts were mis-parsed. Only comparing a total with a trusted source catches that.'),
    ],
  },

  /* ══ DT_EDA_VIZ ══════════════════════════════════════════════════════════════════════════ */

  /* ── EDA_WORKFLOW ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EDA_VIZ_EDA_WORKFLOW',
    notes: `Exploratory data analysis (EDA) is what you do with a dataset before you know what it says. Done
badly, it is an hour of random charts. Done well, it is a short, ordered sequence: **questions first, then
one variable at a time, then pairs, then segments, then time** — writing down each finding with the
number that supports it.

## The data used through this topic

QuickBite is a food-delivery app in Hyderabad. The operations team has shared one month of orders (March
2024). The real file would come from a database; to let you reproduce every number in this topic, this
code builds an equivalent 600-order dataset. Run it once at the top of your notebook:

    import numpy as np
    import pandas as pd

    rng = np.random.default_rng(42)
    n = 600
    areas = ["Gachibowli", "Madhapur", "Kukatpally", "Secunderabad", "Banjara Hills"]
    cuisines = ["Biryani", "North Indian", "South Indian", "Chinese", "Pizza"]
    base_value = {"Biryani": 420, "North Indian": 380, "South Indian": 220, "Chinese": 330, "Pizza": 450}

    hour = rng.choice([12, 13, 14, 19, 20, 21, 22], size=n, p=[.12, .14, .08, .16, .2, .18, .12])
    day = rng.integers(1, 32, size=n)
    order_time = (pd.to_datetime("2024-03-01") + pd.to_timedelta(day - 1, "D")
                  + pd.to_timedelta(hour, "h") + pd.to_timedelta(rng.integers(0, 60, n), "min"))
    cuisine = rng.choice(cuisines, size=n, p=[.3, .2, .2, .15, .15])
    distance = rng.gamma(2.0, 1.6, size=n).round(1) + 0.5
    peak = np.isin(hour, [20, 21])
    delivery = (14 + 3.0 * distance + 7 * peak + rng.normal(0, 5, n)).round().clip(10)
    value = (np.array([base_value[c] for c in cuisine]) * rng.lognormal(0, 0.35, n)).round()
    cancel_p = np.where(delivery > 45, 0.30, 0.06)
    status = np.where(rng.random(n) < cancel_p, "CANCELLED", "DELIVERED")
    rating = (5.2 - 0.045 * delivery + rng.normal(0, 0.6, n)).round().clip(1, 5)
    rated = (rng.random(n) < 0.55) & (status == "DELIVERED")

    orders = pd.DataFrame({
        "order_id": np.arange(50001, 50001 + n),
        "order_time": order_time,
        "area": rng.choice(areas, size=n),
        "cuisine": cuisine,
        "order_value": value,
        "distance_km": distance,
        "delivery_min": np.where(status == "DELIVERED", delivery, np.nan),
        "status": status,
        "rating": np.where(rated, rating, np.nan),
    }).sort_values("order_time", ignore_index=True)

(You do not need to understand the generator to do the EDA — in fact, pretend you have not seen it, and
let the data tell you what is in it. That is the skill.)

## Step 0: write the questions down

The operations head's worry: "Customers are complaining about late deliveries." Turn that into questions
the data can answer:

1. How long do deliveries take, and how many are late (say, over 45 minutes)?
2. Does it depend on area, distance, cuisine or time of day?
3. Are late deliveries rated worse? Are they cancelled more?

Questions keep EDA from wandering. You will find other things on the way — write them down too.

## Step 1: what arrived — shape, types, blanks

    orders.shape          # (600, 9)
    orders.info()

     #   Column        Non-Null Count  Dtype
    ---  ------        --------------  -----
     0   order_id      600 non-null    int64
     1   order_time    600 non-null    datetime64[us]
     2   area          600 non-null    str
     3   cuisine       600 non-null    str
     4   order_value   600 non-null    float64
     5   distance_km   600 non-null    float64
     6   delivery_min  553 non-null    float64
     7   status        600 non-null    str
     8   rating        302 non-null    float64

(pandas 2.x shows \`object\` for the text columns and \`datetime64[ns]\`; the meaning is the same.)

Two findings already: **47 orders have no delivery time** (are they the cancelled ones? —
\`orders.loc[orders["delivery_min"].isna(), "status"].value_counts()\` says yes, all 47), and **only 302
orders are rated** — about half.

## Step 2: one variable at a time

**Numbers: describe, then a histogram.**

    orders["delivery_min"].describe().round(1)

    count    553.0
    mean      28.0
    std        8.8
    min       10.0
    25%       22.0
    50%       27.0
    75%       33.0
    max       65.0

    late = (orders["delivery_min"] > 45).sum()          # 19
    late / orders["delivery_min"].count()               # 19 / 553 = 0.034, about 3.4%

Mean 28.0 and median 27 are close: no extreme skew. Only 3.4% of delivered orders took over 45 minutes —
but cancelled orders are not in this number, and that matters (Step 4).

**Categories: value_counts.**

    orders["status"].value_counts(normalize=True).round(3)    # DELIVERED 0.922, CANCELLED 0.078
    orders["cuisine"].value_counts()   # Biryani 178, North Indian 129, South Indian 103, Pizza 101, Chinese 89

## Step 3: pairs — two variables together

    delivered = orders[orders["status"] == "DELIVERED"]
    delivered[["distance_km", "delivery_min", "order_value", "rating"]].corr().round(2)

                  distance_km  delivery_min  order_value  rating
    distance_km          1.00          0.73         0.01   -0.36
    delivery_min         0.73          1.00         0.02   -0.60
    order_value          0.01          0.02         1.00    0.08
    rating              -0.36         -0.60         0.08    1.00

Distance and delivery time move together strongly (0.73); delivery time and rating move opposite ways
(−0.60). Order value is unrelated to either. A correlation is a pointer to look closer, not a conclusion.

## Step 4: segments — groupby, the workhorse of EDA

    orders["hour"] = orders["order_time"].dt.hour
    orders.groupby("hour").agg(
        orders=("order_id", "count"),
        cancel_rate=("status", lambda s: (s == "CANCELLED").mean() * 100),
        median_delivery=("delivery_min", "median"),
    ).round(1)

          orders  cancel_rate  median_delivery
    hour
    12        74          6.8             26.0
    13        85          3.5             24.0
    14        51          9.8             23.5
    19        90          5.6             24.0
    20       125         10.4             31.0
    21       111         12.6             31.0
    22        64          3.1             23.0

The 8–10 pm window stands out on all three columns: most orders, the most cancellations and the slowest
deliveries. Grouped together: **11.4% cancelled at 8–10 pm against 5.5% at other hours**, median delivery
**31 vs 24.5 minutes**. Areas, by contrast, differ little (median delivery 25–29 minutes).

## Step 5: time — and a trap

    orders["weekday"] = orders["order_time"].dt.day_name()
    orders["date"] = orders["order_time"].dt.date
    wd = orders.groupby("weekday").agg(orders=("order_id", "count"), days=("date", "nunique"))
    wd["per_day"] = (wd["orders"] / wd["days"]).round(1)
    wd.sort_values("per_day", ascending=False)

               orders  days  per_day
    Friday        106     5     21.2
    Monday         85     4     21.2
    Wednesday      82     4     20.5
    Saturday       97     5     19.4
    Sunday         96     5     19.2
    Thursday       71     4     17.8
    Tuesday        63     4     15.8

Raw counts say Friday, Saturday and Sunday are busiest — but March 2024 had **five** of each and only four
of the other days. Per day, Monday ties Friday and the weekend is not special. Always ask "out of how
many?" before comparing counts.

## Step 6: write the findings down as you go

Keep a findings list in a Markdown cell, each with its evidence:

| # | Finding | Evidence | Confidence |
|---|---|---|---|
| 1 | 8–10 pm is the problem window | 39% of orders; 11.4% cancelled vs 5.5%; median 31 vs 24.5 min | High |
| 2 | Longer deliveries get worse ratings | corr −0.60; see worked example | Medium (half unrated) |
| 3 | Distance drives delivery time | corr 0.73 | High |
| 4 | Weekday differences are mostly calendar | per-day counts 15.8–21.2 | Medium (one month) |

That list — not the notebook — is what becomes the report.`,
    workedExample: `**Question.** Are late deliveries rated worse — and by how much?

**1. Choose the rows.** Only delivered and rated orders can answer it:

    delivered = orders[orders["status"] == "DELIVERED"]
    delivered["rating"].notna().sum()        # 302 rated, of 553 delivered

**2. Bucket the delivery time.** A correlation of −0.60 is hard to explain to a manager; buckets are not.
\`pd.cut\` puts each value into a range:

    buckets = pd.cut(delivered["delivery_min"], bins=[0, 30, 45, 200])
    delivered.groupby(buckets, observed=True)["rating"].agg(["mean", "count"]).round(2)

                  mean  count
    delivery_min
    (0, 30]       4.22    186
    (30, 45]      3.36    106
    (45, 200]     2.90     10

(\`(0, 30]\` means over 0 and up to 30. \`observed=True\` shows only buckets that occur; on pandas 2.x leaving
it out gives a FutureWarning.)

**3. Read it carefully.** Deliveries up to 30 minutes average 4.2 stars; 30–45 minutes, 3.4. That is a big
drop on a 5-point scale, and both groups are large. The over-45 group averages 2.9 — but from only **10**
ratings, so say "about 3, few ratings" rather than quoting 2.90 as if it were precise.

**4. Check what is missing.** The 47 cancelled orders have no delivery time and no rating, and cancellations
are highest at 8–10 pm, when deliveries are slowest. The customers most likely to be unhappy are partly
missing from this table — so the real effect may be **larger** than it looks.

**5. Write the finding.** "Rated orders delivered in 30 minutes or less average 4.2 stars; those taking
30–45 minutes average 3.4 (302 rated orders, March). Very late deliveries are rarely rated, and cancelled
orders are not rated at all, so this probably understates the problem. This shows association, not proof
that lateness causes low ratings — though it is the obvious explanation."`,
    mcqs: [
      mcq('In QuickBite\'s data, Friday has 106 orders and Tuesday 63. March 2024 had five Fridays and four Tuesdays. What is the fair comparison?', [
        ['21.2 orders per Friday against 15.8 per Tuesday', true],
        ['106 against 63 — Friday has about 70% more orders', false],
        ['53 against 31.5, halving both totals', false],
        ['None — weekdays cannot be compared in one month', false],
      ], 'Divide by the number of such days in the period: 106 / 5 = 21.2 and 63 / 4 = 15.75. Raw counts compare calendars as much as customer behaviour.'),
      mcq('`orders.info()` shows `delivery_min` with 553 non-null values out of 600. What should an EDA do next?', [
        ['Find which orders lack a time, e.g. by checking their status', true],
        ['Fill the 47 blanks with the median so that charts are complete', false],
        ['Drop the column, as it is not complete enough to use', false],
        ['Nothing — 92% complete is good enough to move on', false],
      ], 'The blanks are information. Here all 47 are cancelled orders, which changes how delivery-time results must be described.'),
      mcq('Delivery time and rating have a correlation of −0.60 among delivered, rated orders. What can you conclude?', [
        ['Slower deliveries tend to come with lower ratings', true],
        ['Slow deliveries are proven to cause low ratings', false],
        ['60% of ratings are explained by the delivery time', false],
        ['Ratings fall by 0.6 stars for each extra minute', false],
      ], 'A negative correlation describes a tendency for the two to move in opposite directions. It is not proof of cause, not a percentage explained (that would be r² ≈ 0.36), and not a slope.'),
    ],
    checkpoint: [
      ck(EDA, 'You open a new dataset for EDA. Which order of steps is the most useful?', [
        ['Questions, then single columns, then pairs, segments and time', true],
        ['Every chart type on every column, then pick the best ones', false],
        ['A correlation heatmap first, and then explain the strongest cell', false],
        ['Build a model first, then explore whatever it gets wrong', false],
      ], 'Starting from questions keeps the work focused, and checking single columns first catches types, blanks and outliers before they distort comparisons.'),
      ck(EDA, 'A delivery dataset\'s over-45-minute group has an average rating of 2.90 from 10 ratings; other groups have 100+ each. How should you report it?', [
        ['As about 3 stars, noting that it rests on only 10 ratings', true],
        ['As exactly 2.90, since that is what the data says', false],
        ['Leave it out, since 10 ratings is below any sensible threshold', false],
        ['Merge it into the 30–45 group so the sizes are equal', false],
      ], 'A small group gives a noisy average. Report it with its count and less precision rather than hiding it or presenting it as exact.'),
      ck(EDA, 'Cancelled orders have no delivery time and no rating, and cancellations peak when deliveries are slowest. What does this do to the "late deliveries get lower ratings" finding?', [
        ['It probably understates the effect, as unhappy cases are missing', true],
        ['It exaggerates the effect, because cancellations add low ratings', false],
        ['It has no effect, as cancelled orders are a separate topic', false],
        ['It makes the finding invalid, so it should be dropped', false],
      ], 'The customers most likely to be unhappy are not in the rated rows. Saying which way a gap probably biases a result is part of an honest finding.'),
    ],
  },

  /* ── MATPLOTLIB ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EDA_VIZ_MATPLOTLIB',
    notes: `Matplotlib is the library every other Python chart library is built on. pandas' \`.plot()\` and Seaborn
both draw on Matplotlib axes, so when you need to fix a title, an axis or a layout, you are using
Matplotlib whether you meant to or not. This unit uses its **object-oriented** style — the one that scales
from one chart to a dashboard.

## Figure and Axes

    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(8, 4))     # width, height in inches

- The **Figure** is the whole image — the page.
- An **Axes** is one chart on it: its own x-axis, y-axis, title and plotted data. (Not to be confused
  with "axis", the single x or y line.)

You draw by calling methods on \`ax\`: \`ax.plot\`, \`ax.bar\`, \`ax.hist\`, \`ax.scatter\`. You label with
\`ax.set_title\`, \`ax.set_xlabel\`, \`ax.set_ylabel\`. You save with \`fig.savefig("chart.png", dpi=150)\`.

There is also a shortcut style — \`plt.plot(...)\`, \`plt.title(...)\` — that draws on "the current axes".
It is fine for a quick look but becomes confusing with several charts. Prefer \`fig, ax\`.

## The four charts an analyst uses most

Using the QuickBite orders from the EDA workflow unit:

    delivered = orders[orders["status"] == "DELIVERED"]
    daily = orders.set_index("order_time").resample("D")["order_id"].count()
    by_cuisine = delivered.groupby("cuisine")["order_value"].sum().sort_values()

**Line — change over time.**

    fig, ax = plt.subplots(figsize=(8, 3.5))
    ax.plot(daily.index, daily.values, marker="o")
    ax.set_title("Orders per day, March 2024")
    ax.set_ylabel("Orders")
    ax.set_ylim(bottom=0)

\`daily\` has 31 values (one per day; the busiest day, 8 March, had 25 orders and the quietest 10).
\`resample("D")\` gives a row for every day even if a day had no orders, which keeps the line honest.

**Bar — compare categories.**

    fig, ax = plt.subplots(figsize=(7, 3.5))
    ax.barh(by_cuisine.index, by_cuisine.values / 1000)
    ax.set_title("Delivered revenue by cuisine, March 2024")
    ax.set_xlabel("Revenue (₹ thousand)")

\`by_cuisine\` runs from South Indian (₹21,575) to Biryani (₹72,423). Sorting the values before plotting
puts the bars in order; \`barh\` (horizontal) keeps long category names readable.

**Histogram — the shape of one number.**

    fig, ax = plt.subplots(figsize=(7, 3.5))
    ax.hist(delivered["delivery_min"], bins=range(10, 70, 5), edgecolor="white")
    ax.set_title("Delivery time, delivered orders")
    ax.set_xlabel("Minutes"); ax.set_ylabel("Orders")

\`bins=range(10, 70, 5)\` makes 5-minute bins from 10 to 65 (12 edges, 11 bars). Choose bins you can explain;
\`bins=3\` would squash this into three bars (315, 221 and 17 orders) and hide the shape entirely.

**Scatter — two numbers together.**

    fig, ax = plt.subplots(figsize=(6, 4))
    ax.scatter(delivered["distance_km"], delivered["delivery_min"], s=10, alpha=0.5)
    ax.set_xlabel("Distance (km)"); ax.set_ylabel("Delivery time (min)")

\`alpha=0.5\` makes points half-transparent so overlapping points show up as darker areas; \`s\` is the
marker size.

## Several charts in one figure: subplots

    fig, axes = plt.subplots(2, 2, figsize=(11, 7))
    print(type(axes).__name__, axes.shape)       # ndarray (2, 2)

    axes[0, 0].plot(daily.index, daily.values)
    axes[0, 0].set_title("Orders per day")
    axes[0, 1].barh(by_cuisine.index, by_cuisine.values / 1000)
    axes[0, 1].set_title("Revenue by cuisine (₹ thousand)")
    axes[1, 0].hist(delivered["delivery_min"], bins=range(10, 70, 5), edgecolor="white")
    axes[1, 0].set_title("Delivery time (min)")
    axes[1, 1].scatter(delivered["distance_km"], delivered["delivery_min"], s=10, alpha=0.5)
    axes[1, 1].set_title("Distance vs delivery time")

    fig.suptitle("QuickBite Hyderabad — March 2024")
    fig.tight_layout()
    fig.savefig("overview.png", dpi=150)

With \`plt.subplots(2, 2)\`, \`axes\` is a 2 × 2 NumPy array, indexed \`axes[row, col]\`. With \`plt.subplots(1, 3)\`
it is a flat array of 3 (\`axes[0]\` … \`axes[2]\`); with \`plt.subplots()\` it is a single Axes. Add
\`sharey=True\` when panels should be compared on the same scale. \`tight_layout()\` stops titles and labels
overlapping.

## pandas plotting is Matplotlib

    ax = by_cuisine.plot(kind="barh", figsize=(7, 3.5), title="Revenue by cuisine")
    ax.set_xlabel("₹")

\`.plot()\` returns the Matplotlib Axes, so every \`ax.set_...\` method still works. Use it for speed; drop to
\`ax\` methods for control.

## A chart is finished when

- It has a **title that says what it shows** (better: what it shows *and* the period).
- Both axes are labelled **with units** (₹, minutes, %, thousands).
- Bars start at zero; categories are sorted unless they have a natural order (months, hours).
- It answers one question. If it needs a paragraph to explain, split it.

Matplotlib 3.x note: the default style and colours have been stable since 2.0; everything here runs
unchanged on any 3.x version.`,
    mcqs: [
      mcq('After `fig, axes = plt.subplots(1, 3)`, how do you put a histogram on the middle chart?', [
        ['axes[1].hist(data)', true],
        ['axes[0, 1].hist(data)', false],
        ['axes[2].hist(data)', false],
        ['fig[1].hist(data)', false],
      ], 'With one row, axes is a flat array of three Axes, numbered from 0; the middle one is axes[1]. Two-index access applies only when there are several rows and columns.'),
      mcq('A bar chart of revenue by cuisine is drawn from `delivered.groupby("cuisine")["order_value"].sum()` without sorting. What does a reader see?', [
        ['Bars in alphabetical cuisine order, not by size', true],
        ['Bars sorted from the largest value to the smallest', false],
        ['Bars sorted from the smallest to the largest', false],
        ['Bars in a different random order on every run', false],
      ], 'groupby sorts its keys alphabetically by default, so the bars follow the names. Add .sort_values() so the reader does not have to rank them by eye.'),
      mcq('In `ax.scatter(x, y, s=10, alpha=0.5)` on 553 delivery points, what does alpha=0.5 achieve?', [
        ['Overlapping points show up darker, revealing density', true],
        ['Only half of the 553 points are actually drawn on the chart', false],
        ['The points are drawn at half the default size', false],
        ['The axis scales are halved to fit all the points', false],
      ], 'alpha sets transparency. Where many semi-transparent points overlap, the area looks darker, so dense regions are visible instead of being one solid blob.'),
    ],
    checkpoint: [
      ck(VIZ, 'What is `axes.shape` after `fig, axes = plt.subplots(2, 3)`?', [
        ['(2, 3)', true],
        ['(3, 2)', false],
        ['(6,)', false],
        ['(1, 6)', false],
      ], 'The first argument is the number of rows and the second the number of columns, and axes is returned as a 2 × 3 array indexed axes[row, col].'),
      ck(VIZ, 'A histogram of 553 delivery times uses `bins=3` and shows bars of 315, 221 and 17. What is the main problem?', [
        ['Three bins are too few to show the shape of the data', true],
        ['Histograms need exactly 10 bins to be considered valid', false],
        ['The bars should add to 600, the total of all orders', false],
        ['A histogram cannot show minutes on its x-axis', false],
      ], 'With so few bins, details such as the peak and the long right tail disappear. Pick a bin width that means something, such as 5 minutes.'),
      ck(VIZ, 'A daily orders chart is drawn from `orders.groupby(orders["order_time"].dt.date)["order_id"].count()`. Two days had no orders. How does the line chart treat them?', [
        ['Those days are missing and the line joins across them', true],
        ['Those days are plotted at 0, as the line dips to zero', false],
        ['The chart raises an error about missing dates', false],
        ['The two days are filled with the average daily count', false],
      ], 'groupby makes rows only for dates that occur, so the gap disappears. resample("D") on a datetime index creates every day, giving 0 for empty days.'),
    ],
  },

  /* ── SEABORN ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EDA_VIZ_SEABORN',
    notes: `Seaborn is built on Matplotlib and designed for statistical charts from a DataFrame. Where Matplotlib
makes you compute and then draw, Seaborn takes the **raw rows** and does the grouping, counting and
averaging itself — and adds colour by segment with one argument, \`hue\`.

    import seaborn as sns
    import matplotlib.pyplot as plt

    delivered = orders[orders["status"] == "DELIVERED"]      # QuickBite data from the EDA workflow unit

Every Seaborn function takes \`data=\` (the DataFrame) and column **names** for \`x\`, \`y\` and \`hue\`.

## Distributions: histplot and kdeplot

    sns.histplot(data=delivered, x="delivery_min", binwidth=5)
    sns.histplot(data=delivered, x="delivery_min", hue="area", element="step")

\`hue="area"\` draws one distribution per area in different colours. \`element="step"\` draws outlines, so five
overlapping areas stay readable. \`kdeplot\` draws a smoothed curve instead of bars — good for comparing
shapes, misleading on small data (it invents smoothness the data does not have).

## Comparing groups: box and violin plots

    sns.boxplot(data=delivered, x="cuisine", y="order_value")

A box plot shows each group's **median** (line), the **middle 50%** (box, Q1 to Q3), whiskers out to 1.5 ×
IQR, and dots for values beyond — the IQR outlier rule from the cleaning topic, drawn. The numbers behind
it:

    delivered.groupby("cuisine")["order_value"].describe()[["25%", "50%", "75%", "max"]].round(0)

                    25%    50%    75%     max
    Biryani       329.0  414.0  516.0  1407.0
    Chinese       264.0  312.0  449.0   770.0
    North Indian  291.0  387.0  482.0   991.0
    Pizza         340.0  428.0  516.0   904.0
    South Indian  174.0  207.0  264.0   596.0

South Indian orders are clearly smaller; Biryani has the longest tail (one ₹1,407 order). \`violinplot\`
shows the same comparison with the full shape of each distribution — more information, harder for a
manager to read. Use box plots for reports.

## Relationships: scatterplot, regplot, heatmap

    sns.scatterplot(data=delivered, x="distance_km", y="delivery_min", hue="cuisine", alpha=0.6)
    sns.regplot(data=delivered, x="distance_km", y="delivery_min", scatter_kws={"s": 8})

\`regplot\` adds a fitted straight line with a shaded confidence band. A correlation matrix becomes a heatmap:

    corr = delivered[["distance_km", "delivery_min", "order_value", "rating"]].corr().round(2)
    sns.heatmap(corr, annot=True, vmin=-1, vmax=1, cmap="coolwarm")

\`annot=True\` writes the numbers in the cells; \`vmin=-1, vmax=1\` fixes the colour scale so a 0.1 is not
painted as deeply as a 0.9 (without it, colours stretch to whatever range the matrix has). A diverging map
(\`coolwarm\`) makes negative and positive look different.

## Bar plots: what the bar means

    sns.barplot(data=delivered, x="area", y="delivery_min")

This bar is the **mean** delivery time per area — not a total — with an error bar (in Seaborn 0.13 the
default \`errorbar=("ci", 95)\`, a 95% confidence interval computed by bootstrapping). For a total, pass
\`estimator="sum"\`; for counts of rows, use \`sns.countplot(data=..., x="area")\`. Always say in the title
whether bars are means or totals — the cuisine bars are ₹447 (mean Biryani order) or ₹72,423 (total
Biryani revenue) depending on that one argument.

## Axes-level and figure-level functions

\`histplot\`, \`boxplot\`, \`scatterplot\` and \`heatmap\` are **axes-level**: they draw on one Matplotlib Axes
and return it, so you can pass \`ax=axes[0, 1]\` and use \`ax.set_title(...)\`.

\`displot\`, \`catplot\` and \`relplot\` are **figure-level**: they build a whole grid and return a
\`FacetGrid\`. Their superpower is \`col=\` / \`row=\` — one small chart per segment:

    g = sns.catplot(data=delivered, x="cuisine", y="order_value", kind="box", col="area", col_wrap=3)
    g.set_titles("{col_name}")

That draws five box plots, one per area, on shared axes. Because a FacetGrid is not an Axes, you cannot pass
it \`ax=\`; set titles and labels through \`g.set_titles\`, \`g.set_axis_labels\` or \`g.figure.suptitle\`.

## hue, col or a separate chart?

- 2–5 segments, one comparison → \`hue\`.
- More segments, or the overlap is unreadable → \`col=\` small multiples on shared axes.
- Different questions → different charts.

Seaborn 0.13 note: older tutorials use \`ci=95\` on barplot; that argument was replaced by
\`errorbar=("ci", 95)\` in 0.12. Pass \`errorbar=None\` to draw bars without error bars.`,
    mcqs: [
      mcq('`sns.barplot(data=delivered, x="cuisine", y="order_value")` draws a bar of about ₹447 for Biryani. Total Biryani revenue is ₹72,423. Why the difference?', [
        ['barplot shows the mean per group unless told otherwise', true],
        ['barplot shows only the first 100 rows of each group', false],
        ['barplot divides each group total by the number of groups', false],
        ['barplot shows the median order value of each group', false],
      ], 'The default estimator is the mean. Pass estimator="sum" for totals, and title the chart so readers know which it is.'),
      mcq('In a box plot of order value by cuisine, what does the line inside each box mark?', [
        ['The median of that group', true],
        ['The mean of that group', false],
        ['The most common value in that group', false],
        ['The 1.5 × IQR outlier limit', false],
      ], 'The box spans Q1 to Q3 and the line inside is the median. Whiskers reach to the last value within 1.5 × IQR, and points beyond are drawn as dots.'),
      mcq('A heatmap of a correlation matrix whose values all lie between −0.2 and 0.3 is drawn without vmin and vmax. What is the risk?', [
        ['Weak correlations get colours as strong as ±1 would', true],
        ['The heatmap refuses to draw without fixed limits', false],
        ['Negative values are drawn in the same colour as positive', false],
        ['The numbers in the cells are rounded to 0 or 1', false],
      ], 'The colour scale stretches to the data\'s own range, so 0.3 looks like a perfect correlation. vmin=-1, vmax=1 keeps the colours honest.'),
    ],
    checkpoint: [
      ck(VIZ, 'What type of object does `sns.catplot(data=delivered, x="cuisine", y="order_value", kind="box", col="area")` return?', [
        ['A FacetGrid, since it is a figure-level function', true],
        ['A single Matplotlib Axes, just like sns.boxplot returns', false],
        ['A NumPy array of five separate Axes objects', false],
        ['A DataFrame of the box-plot statistics', false],
      ], 'catplot, displot and relplot build a grid of charts and return a FacetGrid. Axes-level functions such as boxplot return a single Axes.'),
      ck(VIZ, 'You want delivery-time distributions for five areas compared without five overlapping histograms becoming unreadable. Which is the best choice?', [
        ['sns.displot(..., x="delivery_min", col="area", col_wrap=3)', true],
        ['sns.histplot(..., x="delivery_min", hue="area")', false],
        ['sns.heatmap(delivered[["area", "delivery_min"]])', false],
        ['sns.scatterplot(..., x="area", y="delivery_min")', false],
      ], 'Small multiples on shared axes give each area its own panel and keep them comparable. hue with five overlapping fills is hard to read; a heatmap needs a matrix.'),
      ck(VIZ, 'A manager is told "bars show delivery time by area" for a default `sns.barplot`. What should the chart title say to be accurate?', [
        ['Mean delivery time by area, with 95% confidence intervals', true],
        ['Total delivery time by area across the whole month', false],
        ['Median delivery time by area for delivered orders', false],
        ['Number of deliveries made in each of the areas', false],
      ], 'Default barplot bars are means, and the error bars are 95% confidence intervals in Seaborn 0.13. Saying so stops a reader taking them for totals, medians or counts.'),
    ],
  },

  /* ── HONEST_CHARTS ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EDA_VIZ_HONEST_CHARTS',
    notes: `A chart is an argument. Most misleading charts are not made by liars — they are made by analysts who
accepted the library's defaults or picked a chart type because it looked nice. This unit is about choosing
the chart that answers the question, and spotting the ones that mislead, including your own.

## Start from the question

| The question | Chart | Not this |
|---|---|---|
| Which is bigger? (compare categories) | Bar, sorted; horizontal if labels are long | Pie with many slices, 3-D bars |
| How did it change? (over time) | Line, time on the x-axis | Bars for 30+ time points, unsorted months |
| How is it spread? (one number) | Histogram, box plot | A single average |
| Do two numbers move together? | Scatter (plus a trend line if useful) | Two lines on dual axes |
| What share of the whole? | 100% stacked bar, or a pie with 2–3 slices | Pie with 8 slices |

If you cannot say the question in one sentence, the chart is not ready.

## Bars start at zero

A bar encodes its value by its **length**. Cut the axis and the lengths lie. QuickBite's mean delivery time
by area (delivered orders, from the EDA workflow unit):

    m = delivered.groupby("area")["delivery_min"].mean().sort_values()

    Banjara Hills    26.19
    Madhapur         27.61
    Kukatpally       28.42
    Secunderabad     28.80
    Gachibowli       29.11

The honest gap: Gachibowli is **11% slower** than Banjara Hills (29.11 / 26.19 = 1.11). Now draw it the
way a careless default — or a motivated presenter — might:

    fig, ax = plt.subplots()
    ax.bar(m.index, m.values)
    ax.set_ylim(26, 29.5)          # the axis now starts at 26

Gachibowli's bar is now 3.11 units tall and Banjara Hills' 0.19 — it **looks 16 times** as slow. The
fix is one line, \`ax.set_ylim(bottom=0)\` (Matplotlib's bar default already starts at 0; this chart only
lies because someone changed it).

**Lines and dots are different.** A line or dot plot encodes values by **position**, not length, so a
non-zero axis is acceptable when the variation is the point — a share price, a temperature, a delivery time
moving between 24 and 32 minutes. Label the axis clearly, and do not exaggerate a tiny change by zooming in
to fill the frame. If the change is small and that matters, say "up 0.4 minutes" in the title.

## Dual axes: almost always avoid

Two y-axes on one chart — orders on the left, average rating on the right — let you scale each axis
however you like, so the two lines can be made to cross, move together or diverge at will. Readers assume a
crossing means something. It does not. Prefer:

- **Two panels** stacked with a shared x-axis (\`plt.subplots(2, 1, sharex=True)\`), or
- both series **indexed to 100** at the start, on one axis.

## Pie charts

Humans compare lengths well and angles badly. QuickBite's order share by cuisine:

    orders["cuisine"].value_counts(normalize=True).mul(100).round(1)

    Biryani         29.7
    North Indian    21.5
    South Indian    17.2
    Pizza           16.8
    Chinese         14.8

In a pie, South Indian (17.2%) and Pizza (16.8%) are indistinguishable. In a sorted bar chart the order is
obvious. A pie is acceptable for 2–3 slices where the message is "about a third" — and never in 3-D, which
makes the front slices look bigger.

## Colour with a purpose

- **Highlight, do not decorate.** Grey for context, one strong colour for the point:

      colours = ["tab:red" if a == "Gachibowli" else "lightgrey" for a in m.index]
      ax.barh(m.index, m.values, color=colours)

- **Categorical** colours for unordered groups (areas); **sequential** (light to dark) for ordered values
  (low to high); **diverging** (two colours meeting at a neutral middle) for values above and below a centre,
  such as correlations from −1 to +1.
- About 1 in 12 men has red-green colour blindness. Do not rely on red vs green alone; add labels or use a
  colour-blind-safe palette (Seaborn's \`"colorblind"\`).
- The same category keeps the same colour across every chart in a report.

## Other quiet distortions

- **Cherry-picked ranges** — showing only the three weeks that went up. Show the full period, or say why not.
- **Totals where rates are fair** — "Gachibowli has the most late orders" when it simply has the most orders.
  Compare rates (late orders / orders).
- **Unequal bins or periods** — a "month" of 28 days next to one of 31 days; compare per day.
- **Too many decimals** — "average 28.0137 minutes" claims a precision you do not have.

## Checklist before a chart leaves your notebook

1. Does the title state the finding, with the period?
2. Bars from zero? Axes labelled with units?
3. Is this a rate or a total — and is that the fair comparison?
4. Would the chart still make the same point with a different, equally reasonable axis range?
5. Could a reader colour-blind to red/green read it?`,
    mcqs: [
      mcq('A bar chart shows mean delivery times of 26.2 and 29.1 minutes for two areas, with the y-axis from 26 to 29.5. How much longer does the 29.1 bar look?', [
        ['About 16 times as long', true],
        ['About 1.1 times as long', false],
        ['About 3 times as long', false],
        ['Exactly the same length', false],
      ], 'Above a baseline of 26, the bars are about 3.1 and 0.2 units long — roughly 16 times. The real difference is 11%, which a zero baseline shows.'),
      mcq('An analyst wants to show monthly orders and average rating together for a year. Which chart is the most honest choice?', [
        ['Two panels stacked with a shared month axis', true],
        ['One chart with two y-axes, orders left and rating right', false],
        ['A pie chart for each month with orders and rating', false],
        ['One bar chart with orders and ratings on one y-axis', false],
      ], 'Two scales on one chart can be stretched to suggest any relationship. Separate panels with a shared time axis show both series without implying that their lines crossing means anything.'),
      mcq('Which situation is a pie chart reasonable for?', [
        ['Showing that UPI is about two-thirds of payments, against cards', true],
        ['Comparing the order shares of nine cuisines that are close in size', false],
        ['Showing how monthly revenue changed over the last year', false],
        ['Comparing the delivery times of five different areas', false],
      ], 'A pie works for two or three parts of a whole with a simple message. Close shares, many slices, trends and averages need bars or lines.'),
    ],
    checkpoint: [
      ck(VIZ, 'A slide says "Gachibowli has the most late deliveries" and shows a bar chart of late-order counts. Gachibowli also has the most orders. What is the better chart?', [
        ['Late deliveries as a percentage of each area\'s orders', true],
        ['The same counts, drawn as a separate pie chart for each area', false],
        ['The same counts, with a log scale on the y-axis', false],
        ['Total orders per area drawn on a second y-axis', false],
      ], 'Counts grow with volume, so the busiest area tops almost any count. A rate (late / orders) compares areas fairly.'),
      ck(VIZ, 'Which of these charts can reasonably use a y-axis that does not start at zero?', [
        ['A line chart of daily median delivery time, 24 to 32 minutes', true],
        ['A bar chart of revenue by cuisine, ₹21,000 to ₹72,000', false],
        ['A bar chart of order counts by area, 113 to 126', false],
        ['A stacked bar of order share by payment mode', false],
      ], 'Lines encode values by position, so a clearly labelled non-zero axis is acceptable. Bars encode values by length, and a cut axis distorts every comparison between them.'),
      ck(VIZ, 'A correlation heatmap uses a red-to-green colour scale for values from −1 to +1. What is the best change?', [
        ['A diverging, colour-blind-safe map such as blue to red', true],
        ['A rainbow colour map to show more distinct levels', false],
        ['A single-colour sequential map going from light to dark', false],
        ['Removing the colours and keeping only the numbers', false],
      ], 'Correlations have a meaningful centre (0), so a diverging map fits; red-green is unreadable for many colour-blind viewers. A sequential map hides the sign, and rainbow maps distort order.'),
    ],
  },

  /* ── PRESENTING_FINDINGS ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EDA_VIZ_PRESENTING_FINDINGS',
    notes: `Your notebook has 60 cells, 25 charts and three dead ends. Your manager has five minutes. The last
step of EDA is to **throw most of it away** and keep the few findings that answer the question — each with
one chart, the evidence and its limits.

## The shape of a findings report

One to two pages (or 4–5 slides):

1. **The question** — one sentence, in the manager's words.
2. **The answer in two or three lines** — the summary someone reads if they read nothing else.
3. **Three findings**, each: a headline that states the finding, one chart, two or three sentences of
   evidence with numbers.
4. **Caveats** — what the data cannot tell you, and which way that could bias the result.
5. **What to do next** — recommendations and the analysis or test that would confirm them.

The notebook is the appendix, not the report.

## Headlines state the finding

| Weak (a topic) | Strong (a finding) |
|---|---|
| Delivery time by hour | Deliveries at 8–10 pm take 6.5 minutes longer than at other hours |
| Ratings analysis | Orders delivered within 30 minutes average 4.2 stars; 30–45 minutes, 3.4 |
| Distance | Delivery time rises steadily with distance: 22 minutes under 2 km, 40 minutes over 6 km |

The chart title can be the headline. A reader who looks only at titles should get the whole story.

## Numbers a manager can use

- **Round sensibly:** "31 minutes", "11%", "₹2.1 lakh" — not 31.0000 or 11.38%.
- **Give the base:** "11.4% of 236 orders", "from 302 rated orders". A percentage without its base hides
  how much to trust it.
- **Compare with something:** a number on its own means little; "31 vs 24.5 minutes" means a lot.
- **Use the reader's units:** ₹ lakh and crore for Indian business audiences; minutes, not seconds.

## Caveats are part of the finding

Not a disclaimer at the end that nobody reads — specific limits that change how to act:

- **Coverage:** one month (March 2024) — no seasonality, no festival weeks.
- **Missing data:** cancelled orders have no delivery time; only 302 of 553 delivered orders were rated.
- **Association, not cause:** peak hours are slower *and* busier; we have not shown which drives which.
- **Small groups:** the over-45-minute group has 10 ratings.

Say which way each caveat cuts: "Because cancelled orders — concentrated at peak hours — are not rated, the
rating gap is probably larger than shown."

## Recommendations you can test

A finding becomes useful when it suggests an action **and** a way to check it worked:

- "Add riders for 8–10 pm in the two slowest areas for two weeks; measure median delivery time and the
  cancellation rate against the same weeks without the change."
- Not: "Improve delivery times." (No owner, no action, no measure.)

## From notebook to report — the hygiene step

Before you write a single sentence, make sure the numbers are reproducible:

1. **Restart the kernel and run all cells.** A notebook run out of order can show numbers the code no longer
   produces.
2. Keep only the cells that produce the final findings; move experiments to a separate notebook.
3. Save each chart with \`fig.savefig("finding1.png", dpi=150, bbox_inches="tight")\` — \`bbox_inches="tight"\`
   stops labels being cut off.
4. Put the data source, date range and filters at the top of the report ("QuickBite orders, 1–31 March 2024,
   600 orders, Hyderabad").

## A one-page example (QuickBite, March 2024)

**Question:** Why are customers complaining about late deliveries?

**Summary:** Late deliveries cluster at 8–10 pm, when 39% of orders are placed. Those orders are slower and
twice as likely to be cancelled, and slow deliveries are rated much worse.

**Finding 1 — 8–10 pm is the problem window.** Median delivery is 31 minutes at 8–10 pm against 24.5 at
other hours, and 11.4% of peak orders are cancelled against 5.5%. *(Chart: median delivery and cancellation
rate by hour, two panels.)*

**Finding 2 — slow deliveries are rated lower.** Orders delivered within 30 minutes average 4.2 stars; 30–45
minutes, 3.4 (302 rated orders). *(Chart: average rating by delivery-time band, bars from zero, with counts.)*

**Finding 3 — distance drives delivery time.** Median delivery rises from 22 minutes under 2 km to 40 minutes
over 6 km. *(Chart: scatter of distance vs time with the medians marked.)*

**Caveats:** one month only; cancelled orders have no time or rating, so Finding 2 likely understates the
gap; association, not proof of cause.

**Next steps:** pilot extra riders 8–10 pm and a smaller delivery radius at peak in two areas for two weeks;
compare median time, cancellations and ratings with control areas.`,
    workedExample: `**Task.** Turn this notebook output into one finding a manager can act on.

    orders.groupby(orders["order_time"].dt.hour.isin([20, 21]))["status"].apply(lambda s: (s == "CANCELLED").mean())
    # False 0.054945...   True 0.114406...

    orders.groupby(orders["order_time"].dt.hour.isin([20, 21])).size()
    # False 364   True 236

**1. Say what the numbers are.** True = orders placed 8:00–9:59 pm. 11.4% of those 236 orders were
cancelled; 5.5% of the other 364.

**2. Write a headline that is a finding.**

- Weak: "Cancellation analysis by hour".
- Better: "Cancellations are higher in the evening".
- Strong: **"Orders placed 8–10 pm are cancelled twice as often (11.4% vs 5.5%)"** — specific window,
  comparison, numbers.

**3. Add the evidence and size of the problem.** "That is 27 of 236 peak orders against 20 of 364 at other
times. Peak hours carry 39% of orders, so they account for 57% of all cancellations (27 of 47)."

**4. Add the caveat that matters.** "We do not record why orders are cancelled. The peak window is also when
deliveries are slowest (median 31 vs 24.5 minutes), which is the likely link but is not proven."

**5. Add an action with a measure.** "Pilot extra riders for 8–10 pm in two areas for two weeks and compare
the cancellation rate with the other areas. Also add a 'reason for cancellation' field so the next analysis
does not have to guess."

**6. Pick the chart.** Cancellation rate by hour as a bar chart from zero, the 8 and 9 pm bars highlighted in
one colour, the rest grey, with the title being the headline from step 2.`,
    mcqs: [
      mcq('Which chart title works best in a findings report for QuickBite\'s operations head?', [
        ['8–10 pm orders are cancelled twice as often (11.4% vs 5.5%)', true],
        ['Cancellation rate by hour of day for March 2024', false],
        ['Analysis of cancellations across hours of the day', false],
        ['Chart 4: cancellations by hour (see the notebook for details)', false],
      ], 'A title that states the finding with its numbers lets a reader get the message from the title alone. The others name a topic and leave the reader to find the point.'),
      mcq('A report says "Ratings fall for slow deliveries" with no mention that only 302 of 553 delivered orders were rated. What is missing?', [
        ['The base and a caveat about who chose to rate', true],
        ['A pie chart of rated against unrated orders', false],
        ['The full notebook code pasted below the finding', false],
        ['A second finding to balance out the first one', false],
      ], 'Giving the base shows how much to trust the number, and saying that raters are self-selected tells the reader which way the result might be biased.'),
      mcq('Before copying numbers from a notebook into a report, what is the most important step?', [
        ['Restart the kernel and run every cell from the top', true],
        ['Increase the DPI of every chart saved from the notebook', false],
        ['Delete the markdown cells to keep it short', false],
        ['Rename the variables to match the report text', false],
      ], 'Cells run out of order can leave outputs that the current code no longer produces. A clean top-to-bottom run proves the numbers are reproducible.'),
    ],
    checkpoint: [
      ck(EDA, 'Which recommendation is the most useful at the end of a delivery-time analysis?', [
        ['Pilot extra 8–10 pm riders in two areas; compare time and cancellations', true],
        ['Improve delivery times across the city wherever this is possible', false],
        ['Look into the delivery data more deeply in the next quarter', false],
        ['Consider whether peak hours could be affecting performance', false],
      ], 'A useful recommendation names an action, where and when, and how success will be measured. The others cannot be acted on or checked.'),
      ck(EDA, 'A finding says 236 peak-hour orders had an 11.4% cancellation rate and 364 others 5.5%. What share of all 47 cancellations came from peak hours?', [
        ['About 57% (27 of 47)', true],
        ['About 39%, the peak share of orders', false],
        ['About 67%, two-thirds of all of them', false],
        ['About 11%, the peak cancellation rate', false],
      ], '11.4% of 236 is 27 cancellations; 27 / 47 ≈ 57%. Peak hours have 39% of orders but well over half the cancellations, which is the point worth reporting.'),
      ck(EDA, 'An EDA found that orders over 6 km take a median 40 minutes against 22 minutes under 2 km. Which caveat matters most when recommending a smaller delivery radius?', [
        ['It is an association; other factors may differ by distance', true],
        ['The medians should have been reported as means', false],
        ['Distances should have been recorded in miles', false],
        ['The two groups should have had the same size', false],
      ], 'Longer-distance orders may differ in area, restaurant or time of day as well. The link is strong and plausible, but a pilot is what shows a smaller radius would actually help.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EDA_VIZ_DEBUGGING',
    notes: `EDA bugs are dangerous because the output looks finished: a clean chart with a confident title. Here
are eight faults from real analysis work — the symptom, the cause, and the fix. They use the QuickBite
orders from the EDA workflow unit unless stated.

## 1. A small difference looks huge

**Symptom:** a slide shows Gachibowli's delivery time towering over Banjara Hills'. The manager asks for an
urgent review of Gachibowli.
**Cause:** \`ax.set_ylim(26, 29.5)\` on a bar chart. Mean times are 29.11 vs 26.19 minutes (11% apart), but
above a baseline of 26 the bars are 3.11 and 0.19 units long — 16 times.
**Fix:** bars start at zero: \`ax.set_ylim(bottom=0)\`. If a small difference matters, say it in the title:
"Gachibowli is about 3 minutes slower".

## 2. The months are in the wrong order

**Symptom:** a monthly revenue line goes April → February → January → March and zig-zags.
**Cause:** grouping by month **name** sorts the strings alphabetically:

    sales.groupby(sales["date"].dt.month_name())["amount"].sum().index.tolist()
    # ['April', 'February', 'January', 'March']

**Fix:** group by a real date period and format the labels afterwards —
\`sales.set_index("date").resample("MS")["amount"].sum()\` (MS = month start) or
\`groupby(sales["date"].dt.to_period("M"))\`.

## 3. The first week "crashed"

**Symptom:** weekly delivered revenue reads ₹21,028, ₹47,819, ₹47,003, ₹45,853, ₹52,226 — the first week
looks less than half the others.
**Cause:** \`resample("W")\` makes weeks ending on Sunday. March 2024 began on a Friday, so the first "week"
is 1–3 March: three days.
**Fix:** label or drop partial periods, or compare per-day averages. Always check how many days each period
covers before comparing totals.

## 4. Bars show the wrong measure

**Symptom:** a chart titled "Revenue by cuisine" shows Biryani at about ₹447. Finance says Biryani brought
in ₹72,423.
**Cause:** \`sns.barplot(data=delivered, x="cuisine", y="order_value")\` draws the **mean** per group by
default.
**Fix:** \`estimator="sum"\` for totals, or compute the totals with groupby and draw with \`ax.barh\`. Title
the chart with what the bars are.

## 5. The saved chart is blank

**Symptom:** \`overview.png\` is an empty white image, though the chart appeared on screen.
**Cause:** \`plt.show()\` came before \`plt.savefig(...)\`. Once a figure is shown — in a script after you close
the window, or in Jupyter at the end of the cell that drew it — pyplot is done with it, and a later
\`plt.savefig\` saves a new, empty figure.
**Fix:** save first, then show — or keep the object and use it: \`fig.savefig("overview.png", dpi=150,
bbox_inches="tight")\`, in the same cell that draws the chart.

## 6. The daily line skips quiet days

**Symptom:** a daily orders line is smooth, but the ops team says two days had no orders at all.
**Cause:** \`groupby(order_time.dt.date)\` creates rows only for dates that occur; the line joins straight
across the missing days.
**Fix:** \`orders.set_index("order_time").resample("D")["order_id"].count()\` — every day gets a row, with 0
where nothing happened.

## 7. Average rating is far too low

**Symptom:** average rating per area is 2.1–2.4 stars, though customer feedback is mostly positive.
**Cause:** this export stores **0** for "not rated". A 0 on a 1–5 scale is a placeholder, not a rating:
ratings 5, 4, 0, 0, 3, 0, 4 average 2.29; the four real ratings average 4.0.
**Fix:** \`df["rating"] = df["rating"].replace(0, np.nan)\` before any summary — and check \`value_counts()\`
on every rating or score column for values outside its scale.

## 8. Overlapping labels nobody can read

**Symptom:** fifteen restaurant names on the x-axis overlap into a black smear.
**Cause:** long category labels on a vertical bar chart.
**Fix:** use a horizontal bar chart (\`ax.barh\`), which gives labels room, sorted by value; or keep the top
10 and group the rest as "Other". Rotating the labels 45° works but is harder to read.

## How to debug a chart you do not trust

1. Print the numbers behind it (\`print(series)\`) and check two of them by hand.
2. Check the axis: where does it start, and are the units labelled?
3. Ask what each bar or point is — a mean, a total, a count, a rate — and what the base is.
4. Check the periods: complete, equal length, in time order.
5. Look for placeholders (0, −1, 999) and missing values in the plotted column.`,
    mcqs: [
      mcq('A monthly sales chart built with `groupby(df["date"].dt.month_name())` shows April first and March last. Which change fixes the order?', [
        ['Group by df["date"].dt.to_period("M") instead', true],
        ['Sort the result with sort_values() before plotting', false],
        ['Use a bar chart instead of a line chart', false],
        ['Group by df["date"].dt.day_name() instead', false],
      ], 'Month names sort alphabetically. Grouping by a monthly period keeps the time order; sort_values would order by sales, not by month.'),
      mcq('A weekly revenue chart shows the first week of March 2024 at less than half of the others. `resample("W")` was used. What is the most likely cause?', [
        ['The first week contains only 1–3 March, three days', true],
        ['resample drops the first row of the data by default', false],
        ['The first week had an unusual number of cancellations', false],
        ['resample("W") averages the days instead of adding them', false],
      ], 'Weekly bins end on Sunday, and 1 March 2024 was a Friday, so the first bin is a partial week. Compare per day or mark partial periods.'),
      mcq('A food-delivery rating column holds values 0 to 5, and 0 appears 4,100 times. What should you check before averaging?', [
        ['Whether 0 is a placeholder for "not rated"', true],
        ['Whether the column dtype is int or float', false],
        ['Whether the mean or the median is larger', false],
        ['Whether the ratings add up to a whole number', false],
      ], 'On a 1–5 scale, 0 is not a possible rating, so it almost certainly means "no rating". Treated as a real value, it drags every average down.'),
      mcq('A chart was shown in a Jupyter cell, and `plt.savefig("chart.png")` in the next cell produced a blank image. What is the fix?', [
        ['Call fig.savefig in the cell that draws the chart', true],
        ['Raise the dpi value passed to savefig', false],
        ['Save the image as a PDF file instead of PNG', false],
        ['Add plt.show() again after the savefig call', false],
      ], 'After the cell finishes, the figure is displayed and closed, so a later plt.savefig saves a fresh empty figure. Save in the same cell, ideally through the fig object.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EDA_VIZ_PRACTICE',
    notes: `Six EDA exercises on the QuickBite orders (build them with the generator in the EDA workflow unit).
For each: write the code, look at the output, write one sentence of finding, and draw the chart named. The
expected numbers come from running the code on pandas 3.0; pandas 2.x gives the same values.

    delivered = orders[orders["status"] == "DELIVERED"]
    orders["is_cancelled"] = orders["status"].eq("CANCELLED")

## Exercise 1 — Cancellation rate overall and by area

**Answer.**

    orders["is_cancelled"].mean() * 100                      # 7.8
    (orders.groupby("area")["is_cancelled"].mean() * 100).round(1).sort_values(ascending=False)

    Banjara Hills    10.2
    Kukatpally        9.0
    Secunderabad      7.1
    Madhapur          6.6
    Gachibowli        6.3

**Finding:** "7.8% of orders were cancelled; areas range from 6.3% to 10.2%." Careful: each area has only
113–126 orders, so 10.2% is 12 orders. That gap could be chance; do not lead a report with it. **Chart:**
horizontal bars from zero, sorted.

## Exercise 2 — Typical order value by cuisine

Use the median, because order values are right-skewed (mean ₹388.7, median ₹368).

**Answer.**

    orders.groupby("cuisine")["order_value"].median().sort_values()

    South Indian    207.0
    Chinese         319.0
    North Indian    392.0
    Biryani         413.0
    Pizza           428.0

**Finding:** "A typical South Indian order is about half the value of a Biryani or Pizza order." **Chart:**
\`sns.boxplot(data=delivered, x="order_value", y="cuisine")\` — horizontal boxes show the spread too.

## Exercise 3 — How far do orders travel?

**Answer.** \`orders["distance_km"].describe()\`: median 3.4 km, mean 3.8, 75% under 5.0 km, maximum 15.8 km.
The mean above the median and a far maximum mean a right tail: most orders are short, a few are very long.
**Chart:** histogram with 1 km bins, \`bins=range(0, 17)\`.

## Exercise 4 — Does distance explain delivery time?

**Answer.**

    bands = pd.cut(delivered["distance_km"], bins=[0, 2, 4, 6, 20])
    delivered.groupby(bands, observed=True)["delivery_min"].median()

    (0, 2]     22.0
    (2, 4]     26.0
    (4, 6]     30.0
    (6, 20]    40.0

and \`delivered["distance_km"].corr(delivered["delivery_min"])\` is **0.73**. **Finding:** "Each band of 2 km
adds roughly 4 minutes, and orders beyond 6 km take a median 40 minutes." **Chart:** scatter with
\`alpha=0.4\`, or \`sns.regplot\`.

## Exercise 5 — Area × peak hours

**Answer.**

    peak = delivered["order_time"].dt.hour.isin([20, 21]).map({True: "peak", False: "off_peak"})
    pv = delivered.pivot_table(index="area", columns=peak, values="delivery_min", aggfunc="median")

                   off_peak  peak
    Banjara Hills      23.0  31.0
    Gachibowli         27.0  31.0
    Kukatpally         25.0  32.0
    Madhapur           23.0  31.0
    Secunderabad       25.0  32.5

**Finding:** "Every area slows down at 8–10 pm, by 4 to 8 minutes; the peak is a city-wide problem, not one
area's." **Chart:** \`sns.heatmap(pv, annot=True, fmt=".0f", cmap="Blues")\` — sequential colours, because
these values are ordered, not centred on zero.

## Exercise 6 — Daily delivered revenue and its trend

**Answer.**

    daily = delivered.set_index("order_time").resample("D")["order_value"].sum()
    trend = daily.rolling(7).mean()

Total ₹2,13,929 for the month. The best day was 28 March (₹9,355) and the weakest 26 March (₹3,267) — two
days apart, which shows how noisy single days are. The 7-day rolling mean starts on 7 March (the first six
values are NaN, as a 7-day window needs 7 days) at about ₹6,680. **Chart:** the daily line in light grey
with the rolling mean in a strong colour on top, y-axis from zero, titled with the month.

**Then:** pick the two exercises whose findings matter most to an operations head and write each as a
headline with its evidence — the shape of the mini project's report.`,
    mcqs: [
      mcq('In Exercise 1, Banjara Hills has a 10.2% cancellation rate from 118 orders, against 6.3% from 126 in Gachibowli. How should this be reported?', [
        ['As a small-number difference that may be chance', true],
        ['As the main finding: Banjara Hills has a problem', false],
        ['As proof that Gachibowli has better delivery riders', false],
        ['It should not be reported, as rates cannot be compared', false],
      ], 'The difference is about five orders\' worth on groups of ~120. It may be noise; report it with its base and look for a pattern across months before acting.'),
      mcq('Why does Exercise 2 use the median rather than the mean to compare order values by cuisine?', [
        ['Order values are right-skewed, so a few big orders lift the mean', true],
        ['The median is the only statistic groupby can calculate', false],
        ['The mean cannot be computed for a float column', false],
        ['The median always gives a larger value than the mean', false],
      ], 'With a long right tail (mean ₹388.7, median ₹368), the median describes a typical order better. The mean is still right for totals and revenue per order.'),
      mcq('`daily.rolling(7).mean()` is computed on 31 daily values for March. How many of the results are NaN?', [
        ['6', true],
        ['7', false],
        ['0', false],
        ['3', false],
      ], 'A 7-day window needs seven values, so the first full window ends on day 7. Days 1–6 have no complete window and come back as NaN (unless min_periods is set).'),
      mcq('Exercise 5\'s pivot table of median delivery time is drawn as a heatmap. Which colour map suits it best?', [
        ['A sequential map such as "Blues", light to dark', true],
        ['A diverging map such as "coolwarm" centred at 0', false],
        ['A categorical palette with one colour per area', false],
        ['A rainbow map, to show as many levels as possible', false],
      ], 'Delivery times are ordered values with no meaningful centre, so a sequential map fits. Diverging maps are for values above and below a midpoint, such as correlations.'),
      mcq('The distance column has median 3.4 km, mean 3.8 km and maximum 15.8 km. What shape does that suggest?', [
        ['Right-skewed: most orders short, a few very long', true],
        ['Left-skewed: most orders are long, a few very short', false],
        ['Symmetric: the mean and median are nearly equal', false],
        ['Two separate groups of short and long orders', false],
      ], 'A mean above the median and a maximum far beyond the 75th percentile point to a long right tail. A histogram confirms it; a summary alone cannot show two groups.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EDA_VIZ_INTERVIEW_QUESTION',
    notes: `Analyst interviews test EDA in two ways: a talk-through ("here is a dataset, what would you do?") and
judgement questions about charts and conclusions. Three questions you are very likely to meet, the answer
that gets you through, and the follow-ups.

## 1. "Here is a dataset you have never seen. Walk me through your EDA."

**Model answer.** "First I ask what decision the analysis supports, and write down two or three questions —
that keeps me from making charts for their own sake. Then I check what arrived: shape, column types, blanks
and duplicates, with \`info()\`, \`isna().sum()\` and \`duplicated()\` — and for each blank column I find out
*why* it is blank.

Then one variable at a time: \`describe()\` and a histogram for numbers, looking at min, max and skew;
\`value_counts()\` for categories. Then pairs — a correlation matrix and scatter plots for numbers, groupby
for number-by-category. Then segments and time: by area, by hour, by week, always comparing rates rather
than raw counts, and checking periods are complete.

As I go, I keep a findings list with the evidence for each. At the end I pick the three that answer the
question, with one chart each and the caveats."

**Follow-ups:**
- *"What do you look for in describe()?"* Min and max for impossible values, mean vs median for skew, the
  count row for blanks, and whether the scale is what I expect (₹ or paise? minutes or seconds?).
- *"How long would you spend?"* Time-boxed — a first pass in an hour or two, then deeper only where a
  finding matters to the decision.

## 2. "How do you choose a chart? Give an example of a misleading one."

**Model answer.** "From the question: comparing categories → a sorted bar chart; change over time → a line;
a distribution → a histogram or box plot; two numbers together → a scatter. A pie only for two or three
parts of a whole.

A misleading example: a bar chart of delivery time by area with the y-axis starting at 26 minutes. A 3-minute
difference — 11% — looked like a sixteen-fold one. Bars encode length, so they must start at zero. Other
common ones: dual y-axes, which can make any two series appear related, and totals compared where rates are
fair — the biggest area always has the most complaints."

**Follow-ups:**
- *"When is a non-zero axis fine?"* Line charts, which encode position, when the variation is the point —
  with the axis clearly labelled.
- *"How do you use colour?"* Grey for context, one colour for the point; sequential for ordered values,
  diverging for values around a centre; never red-green alone.

## 3. "Your analysis shows customers who use coupons spend more. Can we say coupons make people spend more?"

**Model answer.** "Not from this alone — it is a correlation. Several things could explain it: customers who
already spend more may be the ones who receive or bother to use coupons (reverse direction, or selection);
coupons may be sent on big-order days like weekends and festivals (a confounder); or there may be a minimum
order value for the coupon, which pushes the basket up mechanically — that is a real effect, but a
different one from 'coupons make people spend more'.

To find out, I would compare like with like — the same customers with and without a coupon, or segments by
past spend — and ideally run an A/B test: randomly give a coupon to half of a group and compare spend. If a
test is not possible, I would present the finding as an association and say what would confirm it."

**Follow-ups:**
- *"What is a confounder?"* A third factor that affects both — here, a festival week raising both coupon use
  and order size.
- *"What if the test shows coupons raise order value but not profit?"* Then the business decision is about
  margin, not revenue — I would report revenue per order *and* margin after discount.

## How to answer EDA questions well

Name a real dataset you have explored and one surprising thing you found. Say how you checked it. Mention a
caveat before the interviewer has to ask.`,
    mcqs: [
      mcq('An interviewer asks what you check first in `df.describe()` on a new sales file. Which answer is strongest?', [
        ['Min and max for impossible values, then mean vs median for skew', true],
        ['The standard deviation, since it is the most important figure', false],
        ['The 25% row, since quartiles summarise the whole column', false],
        ['Nothing — describe() is only for checking the dtypes', false],
      ], 'Impossible minimums or huge maximums reveal errors and outliers at once, and a mean far from the median reveals skew — both shape everything that follows.'),
      mcq('"Stores with more staff have higher sales — should we hire more staff everywhere?" What is the best first response?', [
        ['Bigger, busier stores may simply have both; test before hiring', true],
        ['Yes, since the correlation clearly shows staff drive sales', false],
        ['No, since correlations between business numbers are meaningless', false],
        ['Yes, but only if the correlation is above 0.9', false],
      ], 'Store size and footfall are likely confounders that raise both staff and sales. A pilot in comparable stores shows whether extra staff causes extra sales.'),
      mcq('In an EDA talk-through, why do interviewers like hearing that you keep a findings list as you go?', [
        ['It shows each conclusion is tied to evidence and can be reported', true],
        ['It means fewer charts are needed in the final notebook', false],
        ['It makes the code in the notebook run more quickly', false],
        ['It replaces the need for any data cleaning beforehand', false],
      ], 'A running list of findings with numbers is what turns exploration into a report, and it shows the candidate distinguishes evidence from impressions.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EDA_VIZ_MINI_PROJECT',
    notes: `# An EDA Report on a Food-Delivery Dataset

You are a data analyst at a food-delivery app in an Indian city of your choice. The head of operations has
heard that "customers are unhappy with delivery" and wants to know what is actually going on before
deciding where to spend money: more riders, a smaller delivery radius, or a push for certain cuisines. You
will clean and explore three months of orders and deliver a notebook and a two-page findings report.

## The data

Use a public food-delivery dataset (Kaggle has several with Indian cities — Zomato and food-delivery-time
datasets are common), **or** generate one by extending the QuickBite generator from the EDA workflow unit to
**at least 3,000 orders over 3 months**, with every column below. If you generate it, add mess on purpose
(see "Data problems") and include the generator. Either way, describe the source in the report.

| Column | Type | Meaning |
|---|---|---|
| order_id | text | Unique order identifier |
| order_time | datetime | When the order was placed (day-first text in the raw file, e.g. 05/03/2024 19:42) |
| area | text | Delivery area / locality (6–10 areas) |
| restaurant_id | text | Restaurant identifier |
| cuisine | text | Biryani, North Indian, South Indian, Chinese, Pizza, Desserts, ... |
| order_value | ₹ | Basket value before discount (raw text may include ₹ and commas) |
| discount | ₹ | Blank when no coupon was used |
| distance_km | number | Restaurant to customer |
| delivery_min | number | Minutes from order to delivery; blank for cancelled orders |
| status | text | DELIVERED or CANCELLED (raw text in mixed case) |
| rating | 1–5 | Customer rating; blank (or 0 in some exports) when not rated |
| payment | text | UPI, Card, COD, Wallet |

**Data problems you must find and handle** (a real export will have several): day-first dates, ₹ and commas
in amounts, mixed-case status and area names (and at least one old spelling), duplicate order rows, 0 used
for "not rated", blank discounts that mean "no coupon", and a few impossible values (negative or 5-hour
delivery times).

## The questions

1. **Delivery time** — what is typical, how many orders are late (define "late" and justify it), and how
   does it vary by area, distance and hour of day?
2. **Cancellations** — what share are cancelled, and when and where do cancellations concentrate?
3. **Ratings** — how do ratings relate to delivery time? Who rates, and what does that do to your result?
4. **Cuisines and hours** — which cuisines dominate which hours, and what is a typical basket per cuisine?
5. **Your own question** — one finding nobody asked for, with evidence.

## Deliverables

1. **\`eda.ipynb\`** — runs top to bottom after "Restart & Run All", in this order: load; clean (with a
   cleaning log of every step, rows before/after); quality checks (a \`check(df)\` function run before and
   after cleaning); exploration organised by the questions; a findings list.
2. **\`report.pdf\` (or .docx), at most two pages** — the question; a 3-line summary; **three to five
   findings**, each with a headline that states the finding, one chart and the evidence with bases; a
   caveats section; recommendations with how to measure them.
3. **\`charts/\`** — each report chart saved as PNG from the notebook.
4. A short **README** — data source, how to run, library versions (pandas 2.2 or 3.0, Matplotlib,
   Seaborn).

## Acceptance criteria

- "Restart & Run All" completes without errors and reproduces every number in the report.
- The cleaning log accounts for every row: raw rows = clean rows + removed duplicates + excluded invalid rows.
- \`check(df)\` returns an empty list on the cleaned data, or every remaining problem is explained.
- Dates are parsed with an explicit format; no date falls outside the 3-month window.
- Delivery-time results exclude cancelled orders and say so; rating results state how many orders were rated.
- Every bar chart starts at zero; every chart has a title, labelled axes with units, and no pie with more
  than three slices.
- Comparisons across areas or hours use rates or medians, not raw counts or totals alone, and partial periods
  are marked or excluded.
- Each finding states its base and at least one caveat; no causal claim is made without saying how it could
  be tested.`,
    mcqs: [
      mcq('In the mini project, the cleaning log shows 3,240 raw rows, 3,105 clean rows and 95 removed duplicates. What must the log still account for?', [
        ['40 rows, excluded as invalid with their reasons', true],
        ['Nothing — dropping duplicates explains the gap', false],
        ['135 rows, which must be added back before analysis', false],
        ['95 rows, since duplicates are counted twice', false],
      ], 'Raw rows must equal clean rows plus duplicates plus invalid rows: 3,240 − 3,105 − 95 = 40. A log that does not reconcile hides rows lost by mistake.'),
      mcq('A project report shows an average rating of 2.3 stars, but most reviews read as positive. Which data problem from the brief is the likely cause?', [
        ['0 used for "not rated" being averaged as a real rating', true],
        ['Day-first dates being parsed as month-first dates', false],
        ['Discount blanks being left as missing values', false],
        ['Area names in mixed case splitting the groups', false],
      ], 'Zeros on a 1–5 scale pull the average down sharply. Replace 0 with NaN for rating, report the number of rated orders, and the average reflects real ratings.'),
    ],
    assignment: {
      title: 'An EDA Report on a Food-Delivery Dataset',
      description: 'Clean and explore a food-delivery orders dataset — delivery times, cancellations, cuisines, areas and hours — and deliver a reproducible notebook plus a two-page findings report with honest charts and stated caveats.',
      instructions: `Complete the analysis described in this unit's brief and submit a repository link or a zip.

**Submit:**

1. \`eda.ipynb\` — load, clean (with a cleaning log), quality checks before and after cleaning, exploration
   organised by the five questions, and a findings list. It must run top to bottom after "Restart & Run
   All".
2. \`report.pdf\` or \`.docx\`, at most two pages — question, summary, three to five findings (headline, one
   chart, evidence with bases), caveats, and recommendations with how each would be measured.
3. \`charts/\` with every chart used in the report, saved from the notebook.
4. \`README.md\` — data source (public dataset link, or your generator), how to run it, and library versions.

**Before you submit,** run every acceptance criterion in the brief and note the result at the end of the
notebook (for example: "raw 3,240 = clean 3,105 + duplicates 95 + invalid 40 ✔").`,
      rubric: [
        { criterion: 'Cleaning and quality checks', description: 'Every data problem in the brief is found and handled with a stated reason; the cleaning log reconciles raw rows to clean, duplicate and invalid rows; dates use an explicit format; check(df) runs before and after cleaning.', maxPoints: 25 },
        { criterion: 'Exploration and correctness', description: 'All five questions are answered with correct numbers; delivery-time results exclude cancelled orders; comparisons use rates or medians with their bases; partial periods and small groups are handled.', maxPoints: 30 },
        { criterion: 'Honest, readable charts', description: 'Chart types fit their questions; bars start at zero; titles state findings; axes are labelled with units; colour highlights the point and is colour-blind safe; no misleading dual axes or many-slice pies.', maxPoints: 20 },
        { criterion: 'Findings report', description: 'A two-page report a manager can act on: clear summary, three to five evidence-backed findings, specific caveats that say which way they bias results, and testable recommendations.', maxPoints: 15 },
        { criterion: 'Reproducibility', description: 'The notebook runs top to bottom without errors and reproduces every number in the report; the README explains the data source, how to run it and the library versions.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EDA_VIZ_CHECKPOINT',
    notes: `Ten questions on exploratory analysis and charts: the EDA workflow, groupby and bucketing, fair
comparisons, Matplotlib and Seaborn, honest chart choices and reporting findings. Several show code and
ask what it produces — work the numbers out for the values shown before you choose. Every snippet was run
on pandas 3.0, Matplotlib 3.11 and Seaborn 0.13.`,
    checkpoint: [
      ck(EDA, 'What does this print?\n\n    s = pd.cut(pd.Series([10, 30, 31, 45, 46]), bins=[0, 30, 45, 200])\n    print(s.value_counts(sort=False).tolist())', [
        ['[2, 2, 1]', true],
        ['[1, 3, 1]', false],
        ['[2, 1, 2]', false],
        ['[1, 2, 2]', false],
      ], 'pd.cut bins include their right edge: (0, 30] takes 10 and 30, (30, 45] takes 31 and 45, and (45, 200] takes 46.'),
      ck(EDA, 'Ratings in a delivery dataset are 2 stars × 16, 3 × 81, 4 × 130 and 5 × 75. What share of rated orders got 4 or 5 stars?', [
        ['About 68% (205 of 302)', true],
        ['About 43% (130 of 302)', false],
        ['About 50% (2 of the 4 levels)', false],
        ['About 75% (226 of 302)', false],
      ], '130 + 75 = 205 four- and five-star ratings out of 16 + 81 + 130 + 75 = 302 rated orders, which is 67.9%.'),
      ck(EDA, 'Order values in a month have mean ₹388.7, median ₹368 and a maximum of ₹1,407. A manager asks for "the typical order". What do you give?', [
        ['The median, ₹368, as the values are right-skewed', true],
        ['The mean, ₹388.7, as it uses every single order value', false],
        ['The maximum, ₹1,407, as the best case reached', false],
        ['The midpoint of the range, about ₹748', false],
      ], 'With a long right tail, a few large orders lift the mean. The median is the better "typical" figure; the mean stays right for revenue per order.'),
      ck(EDA, 'The correlation between order value and distance in an orders file is 0.01. What is the right reading?', [
        ['No linear relationship: bigger orders do not travel further', true],
        ['A weak positive effect: distance raises order value a little', false],
        ['Order value and distance are statistically independent', false],
        ['The correlation was computed wrongly and must be redone', false],
      ], 'A correlation near 0 means no linear relationship. It does not prove independence — a curved relationship can have r ≈ 0 — which is why a scatter plot is worth a look.'),
      ck(EDA, 'An EDA finds that areas with more delivery riders have longer delivery times. What is the most sensible interpretation to test?', [
        ['Busier areas get more riders and also have slower deliveries', true],
        ['Adding riders to an area makes its deliveries slower', false],
        ['Riders in those areas are less skilled than elsewhere', false],
        ['The rider counts must be wrong and should be ignored', false],
      ], 'Demand is a likely confounder: high-demand areas are given more riders and are also congested. A correlation between the two does not say adding riders slows anything down.'),
      ck(VIZ, 'Two bars have values 50 and 55, and the code sets `ax.set_ylim(45, 56)`. How many times as long does the 55 bar look?', [
        ['2 times', true],
        ['1.1 times', false],
        ['5 times', false],
        ['11 times', false],
      ], 'Above a baseline of 45 the bars are 5 and 10 units long — twice — while the values differ by 10%. Bars must start at zero for their lengths to be honest.'),
      ck(VIZ, 'What does `sns.countplot(data=orders, x="status")` show for a file with 553 DELIVERED and 47 CANCELLED orders?', [
        ['Two bars, of 553 and 47', true],
        ['Two bars of the mean order value per status', false],
        ['One bar of 600, coloured by status', false],
        ['Two bars of 92.2% and 7.8%', false],
      ], 'countplot counts rows in each category. Shares need the counts converted to percentages first, and means need barplot with a y column.'),
      ck(VIZ, 'What does `fig, axes = plt.subplots(3, 1, sharex=True)` give you?', [
        ['Three stacked charts that share one x-axis scale', true],
        ['One chart with three lines sharing its x-axis', false],
        ['Three side-by-side charts sharing one y-axis', false],
        ['One chart with three different x-axis scales', false],
      ], 'Three rows and one column stack the charts vertically, and sharex keeps their x-axes aligned — the honest alternative to a dual-axis chart for series with different units.'),
      ck(VIZ, 'You must show how order value is spread for each of six cuisines in one chart for a report. Which chart fits best?', [
        ['A box plot of order value, one box per cuisine', true],
        ['A pie chart of total order value by cuisine', false],
        ['A line chart of average order value by cuisine', false],
        ['A scatter plot of order value against order id', false],
      ], 'Box plots compare distributions across groups — median, spread and outliers side by side. A pie shows shares, a line implies an order between cuisines, and order id carries no meaning.'),
      ck(VIZ, 'A report compares monthly revenue for February (29 days) and March (31 days) of 2024 in a bar chart and says March grew 7%. What should the analyst check first?', [
        ['Revenue per day, since March had two more days', true],
        ['Whether a pie chart would show the change better', false],
        ['Whether the bars should use a log-scale y-axis', false],
        ['The colour of the bars for colour-blind readers', false],
      ], 'Two extra days alone add about 7% (31 / 29 ≈ 1.07). Per-day revenue shows whether anything actually grew.'),
    ],
  },

];
