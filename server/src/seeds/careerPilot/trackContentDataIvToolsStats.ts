/**
 * Career-track placement content for Data Analytics + AI, Year 4: Excel and Power BI at interview
 * depth (DT_IV_EXCEL_BI) and statistics, A/B testing and pandas at interview depth (DT_IV_STATS_PYTHON).
 *
 * The student built all of this in Year 3 — lookups and pivots, the star schema and DAX, the report
 * and RLS, the statistics and A/B testing units, pandas and cleaning. These units are the interview
 * version: the questions a panel asks, the answer that earns the follow-up, the follow-up itself and
 * the trap. The stems go one level deeper than Year 3 — pivot calculated fields that multiply sums,
 * 15-digit precision on IDs, HASONEVALUE vs ISINSCOPE on a total row, a measure inside an iterator,
 * DirectQuery limits and query folding, OLS vs RLS, base rates, the delta between "p = 0.055" and
 * "no effect", power and variance reduction, NaN keys that match in a pandas merge, all-NaN groups
 * that sum to 0, Copy-on-Write in pandas 3.0, and missingness that is itself a signal.
 *
 * Every pandas output and every statistic was computed (pandas 3.0.6, SciPy); pandas 2.x
 * differences are noted where they change an answer. Excel and Power BI answers are documented
 * behaviour.
 *
 * Attribution: both topics are multi-skill. Each IV_* unit declares one skill and its checkpoint
 * questions name that skill; each CHECKPOINT unit spreads its ten over the topic's skills. Practice
 * mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_DATA_IV_TOOLS_STATS_BUNDLES: PilotBundle[] = [
  /* ── IV_EXCEL ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_IV_EXCEL_BI_IV_EXCEL',
    notes: `Almost every analyst hiring process in India has an Excel moment: a screening question about
lookups, a "share your screen and build a pivot" task, or a take-home workbook. Interviewers are not
checking that you know VLOOKUP exists — Year 3 covered that. They are checking whether you know how
each tool **fails silently**, because a wrong number in a report is worse than an error. Each
question below has the answer that earns the follow-up, the follow-up, and the trap.

## Q1. "VLOOKUP, INDEX/MATCH or XLOOKUP — which do you use and why?"

**Strong answer.** "XLOOKUP where the company's Excel has it (Microsoft 365 / Excel 2021+), because
it defaults to exact match, can look left, takes the return column as a range so inserted columns
do not break it, and has a built-in not-found value. INDEX/MATCH where I must support older
versions. VLOOKUP only when I am reading someone else's file."

**Follow-up:** "What does XLOOKUP do with duplicate keys?" — returns the first match top to bottom.
\`search_mode\` -1 searches last-to-first, which is how you get the **latest** price from a log
sorted by date. Neither tells you a duplicate exists — check with \`COUNTIF(key_range, key) > 1\`.

**Trap:** saying "VLOOKUP is exact by default". Its fourth argument defaults to TRUE (approximate),
and on unsorted data approximate match returns a wrong row with no error.

## Q2. "How do you look up on two keys — say store and month?"

**Strong answer.** Either a helper key column (\`=[@Store]&"|"&[@Month]\`) on both sides, or a
boolean-array lookup: \`=XLOOKUP(1, (Stores=H2)*(Months=I2), Revenue)\`. Multiplying two TRUE/FALSE
arrays gives 1 only where both match. The delimiter in the helper key matters: without it, store
"S1" + month "12" and store "S11" + month "2" both become "S112".

## Q3. "Your SUMIFS total doesn't match the system. What do you check?"

**Strong answer**, in order: numbers stored as text (SUMIFS silently skips text in the sum range —
compare \`COUNT\` with \`COUNTA\`), trailing spaces or different spellings in the criteria column,
dates with a time part falling outside a "<=" end date, hidden subtotal rows, and filters
(SUMIFS ignores filters; \`SUBTOTAL(109, …)\` and \`AGGREGATE\` respect them).

**Follow-up:** "How do you sum only visible rows *with* a condition?" — \`SUMPRODUCT\` over
\`SUBTOTAL(103, OFFSET(...))\` is the classic trick; in a Table, a helper column with
\`=SUBTOTAL(103,[@Key])\` (1 if visible) and then \`SUMIFS\` on it is clearer.

## Q4. "Why does a pivot's calculated field give a wrong margin?"

**Strong answer.** "A pivot calculated field works on the **sums** of the fields, not row by row.
\`=Price*Qty\` becomes SUM(Price) × SUM(Qty) for each pivot cell — nonsense for revenue. Ratios are
fine that way (\`=Profit/Revenue\` is SUM(Profit)/SUM(Revenue), which is the correct weighted
margin), but products are not. Compute revenue as a column in the source table, or use a Data
Model measure."

**Follow-up:** "And distinct counts?" — tick *Add this data to the Data Model* when creating the
pivot; then *Distinct Count* appears in Value Field Settings. A normal pivot only counts rows.

## Q5. "Average of averages — is it OK?"

**Strong answer.** No, unless the groups are the same size. City A: 10 orders averaging ₹500; city
B: 990 orders averaging ₹200. The average of the two averages is ₹350; the real average order is
(10×500 + 990×200) / 1,000 = ₹203. Use \`SUMPRODUCT(counts, averages)/SUM(counts)\` or go back to
the raw rows.

## Q6. "A 16-digit card or account number shows a 0 at the end. Why?"

**Strong answer.** Excel stores numbers with **15 significant digits** of precision; the 16th digit
of a number is replaced by 0, and it cannot be recovered. IDs, phone numbers, Aadhaar-style or card
numbers and PIN codes are **text**, not numbers: import them as Text in Power Query or the
import wizard. Same root cause as leading zeros vanishing and "MARCH1"-style codes turning into dates.

## Q7. "What are volatile functions and why do they matter in a big workbook?"

**Strong answer.** \`TODAY\`, \`NOW\`, \`RAND\`, \`OFFSET\` and \`INDIRECT\` recalculate on every change
anywhere in the workbook. A 2-lakh-row sheet full of \`OFFSET\` makes every edit slow. Replace
\`OFFSET\` ranges with Tables or \`INDEX(...):INDEX(...)\`, and put \`TODAY()\` in one cell that others
reference. \`INDIRECT\` also breaks when sheets are renamed, because its reference is a text string.

## Q8. "COUNTA says 500 non-empty cells, but you can see blanks."

**Strong answer.** Cells holding a formula that returns \`""\` count as non-empty for \`COUNTA\`, but
\`COUNTBLANK\` counts them as blank — so COUNTA + COUNTBLANK can exceed the number of cells. Test
emptiness with \`LEN(cell)=0\` when formulas are involved.

## Q9. "How many rows can Excel hold, and what do you do past that?"

**Strong answer.** 1,048,576 rows by 16,384 columns per sheet. Past that — or well before, when it
gets slow — load the file through Power Query into the **Data Model**, which holds far more rows
compressed, and analyse it with a PivotTable on the model; or move the work to SQL or pandas.

## The live task

Interviewers often share a sheet of orders and say "give me revenue by city for March, the top
three products, and the share of repeat customers" with 15 minutes on the clock. What they score:
converting the range to a Table first, checking types (COUNT vs COUNTA on the amount column),
stating the definition you used ("repeat = more than one order in the data"), and sanity-checking
that the city totals add up to the grand total. Talking while you work matters as much as the
formulas.

## How you are judged

Strong candidates name the silent failure of each tool and how they would catch it. Weak ones
know the syntax and nothing about what happens when the data is messy.`,
    workedExample: `**Task (shared screen, 15 minutes): "Here are 2,000 orders — OrderID, Date, Customer, City,
Product, Qty, UnitPrice. Give me March revenue by city, the top three products by revenue, and the
share of customers who ordered more than once."**

1. **Make it a Table** (Ctrl+T), name it \`tblOrders\`. Say why: formulas grow with new rows.
2. **Check types out loud.** \`=COUNT(tblOrders[UnitPrice])\` vs \`=COUNTA(...)\` — equal, so no
   text numbers. \`=COUNT(tblOrders[Date])\` equal to the row count, so the dates are real dates.
3. **Add Revenue** as a column: \`=[@Qty]*[@UnitPrice]\`. Not a pivot calculated field — that would
   multiply sums.
4. **March by city.** A pivot with City on rows, Revenue in values, Date in a filter; or by formula
   with a city list from \`=UNIQUE(tblOrders[City])\`:
   \`=SUMIFS(tblOrders[Revenue], tblOrders[City], H2, tblOrders[Date], ">="&DATE(2025,3,1),
   tblOrders[Date], "<"&DATE(2025,4,1))\`. Using "<" 1 April instead of "<=" 31 March is deliberate:
   it keeps orders with a time part on 31 March.
5. **Top three products.** \`=TAKE(SORTBY(UNIQUE(tblOrders[Product]), SUMIFS(tblOrders[Revenue],
   tblOrders[Product], UNIQUE(tblOrders[Product])), -1), 3)\` — or a pivot sorted descending with a
   Top 10 filter set to 3. Mention ties: if products 3 and 4 tie, say so rather than silently
   picking one.
6. **Repeat share.** State the definition: a customer with more than one order. Helper:
   \`=COUNTIFS(tblOrders[Customer], UNIQUE(tblOrders[Customer]))\` gives orders per customer;
   \`=SUM(--(that>1))/ROWS(that)\` is the share.
7. **Sanity check.** The city totals for March must add to the March total from a single SUMIFS.
   Say the number aloud and what it means: "Pune is 38% of March revenue."

What separates the strong candidate is steps 2, 3 and 7 — and saying the definitions out loud.`,
    mcqs: [
      mcq('A price log has one row per price change, sorted oldest to newest. Which formula returns the latest price for product P210?', [
        ['=XLOOKUP("P210", Log[Product], Log[Price], , 0, -1)', true],
        ['=XLOOKUP("P210", Log[Product], Log[Price], , 0, 1)', false],
        ['=VLOOKUP("P210", Log, 3, TRUE) on the unsorted product key', false],
        ['=INDEX(Log[Price], MATCH("P210", Log[Product], 0))', false],
      ], 'search_mode -1 makes XLOOKUP search from the last row upwards, so in a log sorted by date it finds the newest entry. Search mode 1 and MATCH with 0 both return the first, oldest match; approximate VLOOKUP on unsorted keys is simply unreliable.'),
      mcq('A pivot has a calculated field Revenue = Price * Qty. For a city with two orders (₹100 × 2 and ₹50 × 4), what does the pivot show for that city?', [
        ['₹400, because the field is applied to each source row first', false],
        ['₹900, because it multiplies the sum of Price by the sum of Qty', true],
        ['₹300, because it multiplies the average price by the total quantity', false],
        ['An error, because calculated fields cannot multiply two fields', false],
      ], 'Pivot calculated fields operate on the sums of the fields: (100 + 50) × (2 + 4) = 900, while the true revenue is 200 + 200 = 400. Revenue must be a column in the source table (or a Data Model measure).'),
      mcq('Customer IDs such as 4012888812345678 were typed into Excel as numbers. What happens to them?', [
        ['They are kept exactly, since Excel stores up to 30 digits', false],
        ['They are rounded to the nearest thousand on display only', false],
        ['They switch to scientific notation but keep every digit', false],
        ['Digits past the 15th become 0 and cannot be recovered', true],
      ], 'Excel keeps 15 significant digits for numbers, so the 16th digit is replaced by 0 in the stored value, not just the display. Identifiers must be imported or typed as text.'),
    ],
    checkpoint: [
      ck('SPREADSHEET_ANALYSIS', 'Two cities report average order values of ₹500 (10 orders) and ₹200 (990 orders). A summary row shows =AVERAGE(B2:B3) = ₹350. What is the true average order value across all 1,000 orders?', [
        ['₹350, since the two city averages are weighted equally', false],
        ['₹203, from (10 × 500 + 990 × 200) divided by 1,000', true],
        ['₹347, from the geometric mean of the two city averages', false],
        ['₹200, since the larger city alone sets the overall value', false],
      ], 'An average of averages ignores group sizes. Weighting by orders gives (5,000 + 1,98,000) / 1,000 = ₹203. SUMPRODUCT(counts, averages) / SUM(counts) does this in one formula.'),
      ck('SPREADSHEET_ANALYSIS', 'A helper key =[@Store]&[@Month] is used to look up targets by store and month, where Month is a number 1–12. Which pair of rows will collide?', [
        ['Store S1 in month 1 and store S1 in month 11 of the year', false],
        ['Store S1 in month 12 and store S11 in month 2 of the year', true],
        ['Store S2 in month 1 and store S1 in month 2 of the same year', false],
        ['No pair can collide, as stores and months are both unique', false],
      ], '"S1" & "12" and "S11" & "2" both produce "S112", so one lookup returns the other store\'s target without any error. A delimiter such as "|" between the parts makes every key unique.'),
      ck('SPREADSHEET_ANALYSIS', 'Column C has 500 cells, each with a formula that returns "" when there is no data; 120 of them return "". What do =COUNTA(C2:C501) and =COUNTBLANK(C2:C501) return?', [
        ['380 and 120, because empty strings are treated as blank', false],
        ['500 and 0, because every cell holds a formula and is filled', false],
        ['500 and 120, because each function treats "" differently', true],
        ['380 and 0, because "" is neither a value nor truly blank', false],
      ], 'COUNTA counts any cell that is not empty, and a formula returning "" is not empty, so it gives 500. COUNTBLANK counts cells that are empty or contain "", so it gives 120. The two do not add to the cell count.'),
    ],
  },

  /* ── IV_PBI_MODEL ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_IV_EXCEL_BI_IV_PBI_MODEL',
    notes: `Power BI interviews for analyst roles spend more time on the **model** than on visuals, because
a bad model makes every measure harder and every number suspect. Expect to draw a star schema on
paper, defend each relationship, and say where a transformation belongs. Year 3 built the model;
these are the questions that test whether you understand why it is built that way.

## Q1. "Why a star schema and not one big flat table?"

**Strong answer.** "Facts at one grain, descriptions in dimensions. Filters flow from the one side
to the many side, so a slicer on Product filters Sales cleanly. VertiPaq compresses low-cardinality
dimension columns well and stores each description once instead of on every sale. DAX stays simple
— no DISTINCT gymnastics to count products. And dimensions are shared: Sales and Targets can both
be filtered by the same Date and Store tables."

**Follow-up:** "When is a flat table acceptable?" — a small, one-off report with a single fact and
no second fact to relate. It stops working the day a second fact (targets, returns, stock) arrives.

**Trap:** "Star schema is faster because it has fewer rows." It is about filter flow, compression
and shared dimensions, not row counts.

## Q2. "What is the grain of a fact table, and why say it out loud?"

**Strong answer.** The grain is what one row means — "one row per order line", "one row per store
per day". Every measure depends on it: \`COUNTROWS(Sales)\` is lines, not orders, if the grain is
order line. Mixing grains (budget per month per category against sales per day per product) means
relating the budget to dimensions at **its** grain — a Category column and a Month column — never
forcing it onto the product level.

## Q3. "Snowflake or flatten?"

**Strong answer.** For Power BI, flatten Product → Subcategory → Category into one Product
dimension in Power Query. A snowflake adds relationships to traverse, a longer filter path and more
tables for report builders to understand; the storage saved is tiny.

## Q4. "Single or both cross-filter direction?"

**Strong answer.** Single by default (dimension filters fact). Both only for a specific need —
typically a bridge table in a many-to-many pattern — because bidirectional filters can create
**ambiguous paths** (two routes between tables, which Power BI resolves by making a relationship
inactive), slow queries and surprising slicer behaviour. If a slicer should list only values that
have sales, a visual-level filter or a measure filter on the slicer is the safer fix.

## Q5. "Power Query or DAX for a new column?"

**Strong answer.** "As far upstream as possible, as far downstream as necessary." A column that
depends only on its row (a full name, a price band, a fiscal-year label) belongs in Power Query —
or in the source view — where it compresses well and refreshes once. DAX calculated columns are for
logic that needs the model (a related table's value, a rank over the model). Anything that must
respond to slicers is a **measure**, not a column.

## Q6. "Import, DirectQuery, or something in between?"

**Strong answer.**
- **Import:** data copied into the compressed in-memory model; fastest visuals; data is as fresh
  as the last refresh (Pro allows 8 scheduled refreshes a day, Premium/PPU 48); a Pro semantic
  model is limited to 1 GB compressed.
- **DirectQuery:** every visual sends a query to the source at view time; data is current;
  performance is the source's; Power Query steps must fold; a query that returns more than 1
  million rows to Power BI fails.
- **Composite / Dual:** big fact in DirectQuery, small dimensions in Dual or Import.
- **Live connection:** to a published semantic model or Analysis Services — no Power Query at all.

**Follow-up:** "Your Import model takes 40 minutes to refresh. What do you do?" — remove unused
columns (especially high-cardinality ones like GUIDs and timestamps with seconds), split DateTime
into Date and Time, make sure steps **fold** back to the source, and use **incremental refresh**
(RangeStart/RangeEnd parameters) so only recent partitions reload.

## Q7. "What is query folding?"

**Strong answer.** Power Query translating its steps into one native query (SQL) that the source
runs. Filters and column removals then happen in the database, not on the gateway. Some steps break
folding (for example, adding an index column, or certain custom M functions); every step **after**
a non-folding step runs locally. Right-click a step — if *View Native Query* is available, that
step folds.

## Q8. "Two date columns on the fact — order date and ship date?"

**Strong answer.** One Date dimension, two relationships; one active, one inactive, and measures
that need ship date use \`USERELATIONSHIP\`. Or, when report builders need both on the same visual,
a second date table (role-playing dimension). Year 3 built the first; say when you would choose the
second.

## Q9. "How would you keep the history of a customer's city?"

**Strong answer.** Slowly changing dimension Type 2: a new row per change, with a surrogate key,
valid-from and valid-to dates, and the fact keyed to the surrogate key in force when the sale
happened. Type 1 overwrites and loses history. Usually built upstream in the warehouse, but an
analyst must know what it is and why "sales by customer city" can differ between the two.

## How you are judged

The panel listens for **grain**, **filter direction** and **where** each calculation lives. A
candidate who says "I made all relationships both-ways so the slicers work" has told them the model
was never designed.`,
    mcqs: [
      mcq('A Power Query has 9 steps. Step 4 adds an index column and stops folding. Which steps run in the source database?', [
        ['All nine steps, since Power Query rewrites the whole query', false],
        ['Only steps 1 to 3; step 4 and every step after run locally', true],
        ['Steps 1 to 3 and 5 to 9; only the index step runs locally', false],
        ['None of them, because an index column disables native SQL', false],
      ], 'Folding stops at the first step that cannot be translated, and every later step runs in the Power Query engine on the data already fetched. Put filters and column removals before a step that breaks folding.'),
      mcq('An Import model refreshes for 40 minutes, mostly loading three years of unchanged history every night. Which change addresses that directly?', [
        ['Switch every relationship to both directions to share filters', false],
        ['Move all measures into calculated columns computed on refresh', false],
        ['Set incremental refresh with RangeStart and RangeEnd parameters', true],
        ['Turn on Auto date/time so the model builds its own date tables', false],
      ], 'Incremental refresh partitions the table by date and reloads only recent partitions, so the unchanged history is not fetched every night. The other changes either do nothing for refresh time or make it worse.'),
      mcq('A finance team wants every visual to show the source\'s current numbers with no refresh schedule. Which trade-off comes with DirectQuery?', [
        ['Each visual queries the source, so speed depends on that database', true],
        ['The model is capped at 1 GB, so large facts must be summarised', false],
        ['Power Query cannot connect to SQL Server in DirectQuery mode', false],
        ['Measures are not allowed and every value must be a column', false],
      ], 'DirectQuery sends queries to the source when a report is viewed, so data is current but performance and load fall on the source. The 1 GB limit belongs to Import models on Pro, and measures work in DirectQuery.'),
    ],
    checkpoint: [
      ck('DASHBOARDING', 'Targets are set per Category per Month; Sales is one row per order line per day per product. How should Targets join the model?', [
        ['Relate Targets to Sales directly on ProductID and OrderDate', false],
        ['Merge Targets into Sales in Power Query so each line has one', false],
        ['Split each monthly target evenly across products and days', false],
        ['Relate Targets to dimensions at its grain: category and month', true],
      ], 'Facts at different grains share dimensions at the coarser grain: a Category dimension (or column) and a Month-level date key. Merging or splitting invents numbers at a grain the target was never set at.'),
      ck('DASHBOARDING', 'Product, Subcategory and Category are three separate tables chained by relationships. What would you do in a Power BI model, and why?', [
        ['Keep the chain, because it saves storage worth the extra joins', false],
        ['Flatten them into one Product dimension in Power Query', true],
        ['Relate each of the three tables to the Sales fact separately', false],
        ['Set the chain to both directions so each table filters the others', false],
      ], 'A snowflaked dimension adds relationships to traverse and tables to understand, for very little saved space in VertiPaq. One flattened Product dimension gives a clean star; relating each to Sales would need keys Sales does not have.'),
      ck('DASHBOARDING', 'A fiscal-year label ("FY 2025-26") depends only on the row\'s date. Where should the column be created?', [
        ['A DAX measure, so that it responds to slicers on the page', false],
        ['A DAX calculated column, so it can use time intelligence', false],
        ['A visual-level calculation added to each chart that uses it', false],
        ['In Power Query or the source, since it needs only the row', true],
      ], 'A column that depends only on its own row belongs upstream, where it is computed once at refresh and compresses well. A label for grouping cannot be a measure, and a DAX column adds nothing here.'),
    ],
  },

  /* ── IV_DAX ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_IV_EXCEL_BI_IV_DAX',
    notes: `DAX questions separate people who wrote measures from people who understand them. Year 3 taught
CALCULATE, REMOVEFILTERS, time intelligence and the totals-row fix with SUMX. Interviewers go one
step further: they show you a number that looks wrong and ask whether it is a bug.

## Q1. "Explain filter context and row context in one minute."

**Strong answer.** "**Filter context** is the set of filters in force when a measure is evaluated —
from rows and columns of the visual, slicers, page and report filters, and CALCULATE. **Row
context** is 'the current row' while iterating — in a calculated column, or inside SUMX and other
X functions. Row context does **not** filter anything by itself. CALCULATE turns a row context into
an equivalent filter context — context transition."

**Follow-up:** "Where does context transition happen without CALCULATE?" — whenever you reference
a **measure** inside an iterator or a calculated column, because every measure is wrapped in an
implicit CALCULATE.

## Q2. "Why does SUMX(Customers, SUM(Sales[Amount])) give four times the total?"

**Strong answer.** "SUMX iterates Customers, but SUM(Sales[Amount]) has no CALCULATE around it, so
the customer row does not filter Sales; every iteration returns the full total, and with four
customers you get 4 × total. \`SUMX(Customers, [Total Sales])\` works because the measure reference
triggers context transition — each customer row becomes a filter."

## Q3. "The total row is smaller than the sum of the rows. Bug?"

**Strong answer.** "Not necessarily — the total is the measure evaluated in the total's filter
context, not the sum of the rows. For \`DISTINCTCOUNT(Sales[CustomerID])\` by category, a customer
who bought in two categories counts in both rows but once in the total. That total is *correct*."
Then say when it is a bug: a measure with an IF on a threshold (Year 3's bonus case), where the
business wants the sum of row results — fixed with SUMX over the row's dimension values.

## Q4. "How do you show something different on the total row?"

**Strong answer.** \`IF(ISINSCOPE(Products[Category]), [Measure], BLANK())\`. **ISINSCOPE** is TRUE
only when the column is a grouping level of the visual at that cell. **HASONEVALUE** is also TRUE on
the total row when a slicer filters the column to a single value — so a measure that uses it to
detect "not a total" shows a number in the total row as soon as someone picks one category.

## Q5. "ALL, ALLSELECTED, ALLEXCEPT, REMOVEFILTERS?"

**Strong answer.**
- \`REMOVEFILTERS(T[col])\` / \`ALL(T[col])\` as a CALCULATE modifier — drop filters on that column.
- \`ALLEXCEPT(T, T[col])\` — drop filters on every column of T except col.
- \`ALLSELECTED(T[col])\` — restore the filters from **outside** the visual (slicers, page) while
  ignoring the visual's own rows. "% of the visible total" uses ALLSELECTED; "% of all categories,
  whatever the slicer says" uses REMOVEFILTERS.

## Q6. "What is BLANK and how does it behave?"

**Strong answer.** BLANK is DAX's missing value. \`BLANK() + 5\` is 5; \`BLANK() = 0\` is TRUE (with
\`=\`, blank equals zero and empty string); the strict operator \`==\` makes \`BLANK() == 0\` FALSE.
Visuals hide rows where every measure is blank — which is why adding \`+ 0\` to a measure suddenly
fills a table with every product that never sold.

## Q7. "COUNT, COUNTROWS, DISTINCTCOUNT?"

**Strong answer.** \`COUNTROWS(Sales)\` counts rows of the table in context. \`COUNT(Sales[OrderID])\`
counts non-blank values in a column. \`DISTINCTCOUNT\` counts distinct values — and **counts BLANK
as a value** if one is present; \`DISTINCTCOUNTNOBLANK\` does not. For "orders" when the grain is
order line, you need \`DISTINCTCOUNT(Sales[OrderID])\`, not COUNTROWS.

## Q8. "FILTER(Sales, …) or a boolean filter in CALCULATE?"

**Strong answer.** \`CALCULATE([Total Sales], Sales[Amount] > 3000)\` is shorthand for a FILTER over
**that column's** values and is efficient. \`FILTER(Sales, Sales[Amount] > 3000)\` iterates the whole
table — slower on a large fact, and it brings every Sales column into the filter, which can
override other filters. Use FILTER over a table when the condition needs several columns or a
measure: \`FILTER(VALUES(Stores[Store]), [Total Sales] > 8000)\`.

## Q9. "Measure or calculated column — what does each cost?"

**Strong answer.** A column is computed at refresh and **stored** — it takes memory and never
reacts to slicers. A measure is computed at query time and stores nothing. A column that is used
only to be summed (Qty × Price) is often better as a SUMX measure, which saves memory on a large
fact.

## How you are judged

Read the number before you defend the formula. Strong candidates say "that total is right because
…" or "that total is wrong because …" — with the filter context as the reason.`,
    workedExample: `**Question: "A matrix shows Customers = DISTINCTCOUNT(Sales[CustomerID]) by Category: Grocery 6,
Kitchen 4, Personal Care 3. The total says 9. Your manager says the total should be 13. Who is right?"**

1. **Say what the total is.** "The total row is the measure evaluated with no Category filter —
   distinct customers across all categories."
2. **Explain the gap.** "The 4 extra counts come from customers who bought in more than one
   category — four people in two categories each, or two people in three. Each row counts them; the
   total counts each person once."
3. **Prove it in the model.** A quick check measure:
   \`Multi-Category = COUNTROWS(FILTER(VALUES(Sales[CustomerID]),
   CALCULATE(DISTINCTCOUNT(Products[Category])) > 1))\`
   — the CALCULATE causes context transition per customer, so it counts the customers who bought
   from more than one category. It should return a number consistent with the overlap.
4. **Answer the business question.** "If you want 'how many people bought from us', 9 is right. If
   you want 'category-customer relationships' for a cross-sell view, 13 is the sum — and I would
   label it that way, with SUMX(VALUES(Products[Category]), [Customers])."
5. **The contrast.** "If this were a bonus with an IF on each store's sales, the total row would be
   the bug and SUMX would be the fix. Here, the total row is the truth."

The panel is listening for step 1: the total is a new evaluation, not an addition.`,
    mcqs: [
      mcq('A card shows SUMX(Customers, SUM(Sales[Amount])) as 1,16,252. Total sales are 29,063 and Customers has 4 rows. Why?', [
        ['SUM ignores the iterator\'s row, so each of 4 rows returns the total', true],
        ['SUMX double-counts every sale linked to more than one customer', false],
        ['The relationship is many-to-many, so each sale appears four times', false],
        ['SUMX adds a running total, so later rows include earlier ones', false],
      ], 'Row context alone filters nothing. Without CALCULATE (or a measure reference), SUM(Sales[Amount]) is evaluated in the outer filter context on every customer row: 4 × 29,063 = 1,16,252. SUMX(Customers, [Total Sales]) causes context transition and gives 29,063.'),
      mcq('A measure IF(HASONEVALUE(Products[Category]), [Sales], BLANK()) is meant to blank the matrix total. A user picks only "Grocery" in a slicer. What does the total row show?', [
        ['Blank, because a total row never has a single category in it', false],
        ['An error, because HASONEVALUE cannot be used in a total row', false],
        ['Grocery sales, because the slicer leaves one category in scope', true],
        ['The sales of every category, because slicers do not affect totals', false],
      ], 'With the slicer on one value, Category has one value even on the total row, so HASONEVALUE is TRUE and the total shows a number. ISINSCOPE(Products[Category]) checks whether the column is a grouping level of the visual and blanks the total either way.'),
      mcq('Sales has one row per order line. Which measure counts orders, not lines?', [
        ['COUNTROWS(Sales), because it counts the rows in filter context', false],
        ['DISTINCTCOUNT(Sales[OrderID]), counting each order ID once', true],
        ['COUNT(Sales[OrderID]), because it skips duplicate order IDs', false],
        ['COUNTA(Sales[OrderID]), because it counts text values once', false],
      ], 'At order-line grain an order with three lines is three rows. COUNTROWS, COUNT and COUNTA all count rows or non-blank values, duplicates included; only DISTINCTCOUNT counts each OrderID once.'),
    ],
    checkpoint: [
      ck('DASHBOARDING', 'A table of products shows only products with sales. A colleague changes the measure to [Total Sales] + 0. What happens?', [
        ['Nothing changes, because adding zero does not alter any value', false],
        ['Products with no sales now appear with 0, often hundreds of rows', true],
        ['The total row becomes 0, because BLANK plus zero gives zero', false],
        ['The measure errors, because BLANK cannot be added to a number', false],
      ], 'Visuals hide rows where every measure returns BLANK. BLANK + 0 is 0, which is a value, so every product in the dimension now gets a row. Show zeros deliberately, not as a side effect.'),
      ck('DASHBOARDING', 'A matrix of categories has a Region slicer. Which denominator gives each category\'s share of the total visible under the slicer, ignoring the matrix rows?', [
        ['CALCULATE([Sales], REMOVEFILTERS(Products[Category], Stores))', false],
        ['CALCULATE([Sales], ALLSELECTED(Products[Category]))', true],
        ['CALCULATE([Sales], ALLEXCEPT(Products, Stores[Region]))', false],
        ['CALCULATE([Sales], Products[Category] = "All categories")', false],
      ], 'ALLSELECTED restores the filters coming from outside the visual (the Region slicer) while removing the matrix\'s own category filter. Removing filters on Stores would ignore the slicer, and ALLEXCEPT names a column from another table.'),
      ck('DASHBOARDING', 'A 2-crore-row Sales fact has a calculated column LineValue = Sales[Qty] * Sales[Price], used only inside SUM. What is the better design, and why?', [
        ['Keep the column, because columns are faster than any measure', false],
        ['Move it to a measure with SUM, since SUM can multiply columns', false],
        ['Make it a calculated table, so it refreshes separately', false],
        ['A SUMX measure: the column costs memory on 2 crore rows', true],
      ], 'A calculated column is stored for every row at refresh. A measure such as SUMX(Sales, Sales[Qty] * Sales[Price]) stores nothing and gives the same result in every filter context. SUM takes one column only.'),
    ],
  },

  /* ── IV_DASHBOARD_DESIGN ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_IV_EXCEL_BI_IV_DASHBOARD_DESIGN',
    notes: `Many analyst interviews include a **dashboard critique**: the interviewer shares a screenshot —
sometimes yours from the portfolio — and asks "what would you change?" Others ask you to pick KPIs
for an audience, or to explain how the data stays secure and fresh. These questions test judgement,
so a structured answer beats a list of opinions.

## Q1. "Critique this dashboard."

**Strong answer — a fixed order.** (1) **Audience and decision:** who opens this and what do they
decide? (2) **The top line:** are the 3–5 headline KPIs visible without scrolling, each with a
comparison (vs target, vs last period)? (3) **Each visual answers one question:** right chart type,
honest axis, sorted bars, no 3D or dual-axis tricks. (4) **Consistency:** one colour per meaning,
same number formats (₹ lakh/crore), titles that state the finding. (5) **Interaction and trust:**
slicers that apply where the reader expects, a "data as of" date, a definition for every KPI.

**Follow-up:** "What would you remove first?" — anything that does not change a decision: a big map
that shows four cities, a gauge that hides the target, a table that repeats a chart.

**Trap:** opening with colours. Start with audience and decision.

## Q2. "Pick KPIs for the regional sales head versus a store manager."

**Strong answer.** The regional head decides where to put attention and money: revenue vs target by
store, growth vs last year, margin %, and the stores that are off-plan — ranked. The store manager
decides today's actions: yesterday's sales vs target, footfall and conversion, stock-outs, and the
top items. Same data, different grain and time horizon.

## Q3. "How do you make sure a manager sees only her region?"

**Strong answer.** Row-level security. A role with a DAX filter on the Region dimension; **static**
(one role per region, members assigned in the Service) or **dynamic** (a mapping table of email to
region, filtered with \`USERPRINCIPALNAME()\`). Test with *View as* in Desktop and *Test as role* in
the Service.

**Follow-ups the panel uses:**
- "Does RLS hide a column, say salary?" — No. RLS filters **rows**. Hiding a table or column is
  **object-level security** (OLS), defined with an external tool such as Tabular Editor.
- "The workspace has the manager as a Member. Is she restricted?" — No. RLS applies to people with
  **Viewer** access; Admins, Members and Contributors of the workspace see all data. Share through an
  app or Viewer role.
- "What about a bidirectional relationship?" — security filters flow one way unless *Apply security
  filter in both directions* is set on that relationship.

## Q4. "How does the data stay fresh?"

**Strong answer.** Import models refresh on a schedule (up to 8 a day on Pro, 48 on Premium/PPU).
On-premises sources need an **on-premises data gateway**; cloud sources do not. Refresh failures
email the owner, and after four consecutive failures Power BI disables the schedule — so a "data as
of" card on the page is not decoration, it is how readers notice. DirectQuery needs no data refresh,
at the cost of query speed.

## Q5. "Your dashboard is slow. What do you do?"

**Strong answer.** Performance analyzer first: is it the **DAX query**, the **visual display**, or
"Other" (waiting on other visuals)? Then: fewer visuals per page (each one is a query), remove
high-cardinality columns from tables, simplify heavy measures (FILTER over a whole fact), and check
storage mode. Measure before and after.

## Q6. "A manager wants 40 KPIs on one page."

**Strong answer.** Ask which decisions they make weekly, put the 4–6 KPIs for those on page one, and
put the rest on drill-through or detail pages. Offer the summary-to-detail path rather than saying
no.

## Q7. "How do you prove a dashboard number is right?"

**Strong answer.** Reconcile one number to the source system for a fixed period (for example,
March revenue matches the finance close within rounding), document the definition in a tooltip or
an info page, and keep a short test list — total, one region, one store — that you re-run after
each model change.

## How you are judged

Structure and audience. A candidate who starts "who uses this and what do they decide?" and ends
"here is how I would check it is right" is rated above one with better design taste and no order.`,
    mcqs: [
      mcq('A regional manager is a Member of the report\'s workspace, and a dynamic RLS role limits each manager to her region. What does she see in the report?', [
        ['Only her region, because RLS applies to every signed-in user', false],
        ['All regions, because RLS does not restrict workspace Members', true],
        ['Nothing, because Members must be added to a role to see data', false],
        ['Only her region, but only after the next scheduled refresh', false],
      ], 'RLS filters apply to users with Viewer access. Workspace Admins, Members and Contributors can edit the semantic model and see all data. Give readers the app or the Viewer role.'),
      mcq('HR asks that the Salary column be hidden from store managers while they still see all employee rows for their store. What do you use?', [
        ['A row-level security role with a filter on the Salary column', false],
        ['Object-level security on the Salary column for that role', true],
        ['A hidden column in the report view, unhidden only for HR', false],
        ['A page-level filter that removes Salary from every visual', false],
      ], 'RLS filters rows, so it cannot hide a column while keeping the rows. Object-level security secures a table or column for a role. Hiding a column in a report is cosmetic and gives no security.'),
      mcq('Asked to critique a dashboard in an interview, which opening shows the strongest structure?', [
        ['The colours clash, so I would move to the company palette first', false],
        ['I would add more slicers so each reader can explore any angle', false],
        ['I would replace the tables with charts, which read more easily', false],
        ['Who opens it and what they decide, then whether the KPIs fit', true],
      ], 'A critique starts from audience and decision, because every later judgement — which KPIs, which chart, what to remove — follows from them. Colours and slicers are details that come later.'),
    ],
    checkpoint: [
      ck('DASHBOARDING', 'Scheduled refresh of a sales report has failed four nights in a row because the gateway machine was off. What else has happened?', [
        ['The report switched to DirectQuery until the gateway returns', false],
        ['Nothing else; refresh will run again by itself the next night', false],
        ['Power BI has disabled the refresh schedule until it is fixed', true],
        ['The semantic model was deleted to free space in the workspace', false],
      ], 'Power BI turns off a refresh schedule after four consecutive failures and emails the owner. Until someone fixes the gateway and re-enables it, the data stays stale — which a "data as of" card makes visible.'),
      ck('DASHBOARDING', 'Performance analyzer shows a visual with DAX query 90 ms, visual display 120 ms and Other 4,200 ms. What does the large Other time mean?', [
        ['The DAX measure is slow and should be rewritten with FILTER', false],
        ['The visual waited for other visuals on the page to finish', true],
        ['The gateway is slow, so the data source must be upgraded', false],
        ['The visual has too many colours and takes long to render', false],
      ], '"Other" is time spent waiting — usually behind other visuals\' queries on the same page. The fix is fewer visuals per page, not a faster measure; this visual\'s own query and render are quick.'),
      ck('DASHBOARDING', 'A store manager opens a dashboard each morning to decide what to do that day. Which KPI set fits her best?', [
        ['Year-to-date revenue by region and a five-year growth trend', false],
        ['Yesterday\'s sales vs target, conversion and current stock-outs', true],
        ['Company margin by category and market share by state', false],
        ['Customer lifetime value and acquisition cost by channel', false],
      ], 'KPIs follow the decision. A store manager acts on today\'s floor: yesterday against target, how many visitors bought, and what is out of stock. The others serve regional, finance or marketing decisions.'),
    ],
  },

  /* ── RAPID_FIRE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_IV_EXCEL_BI_RAPID_FIRE',
    notes: `A screening call: thirty questions in about ten minutes. One correct line each. Cover the answer,
say yours out loud, then check.

## Excel

1. **VLOOKUP's default match type?** — Approximate (TRUE); always pass FALSE.
2. **XLOOKUP's default match type?** — Exact.
3. **XLOOKUP search_mode for "last match"?** — -1 (last to first).
4. **Rows in one sheet?** — 1,048,576.
5. **Digits of precision for a number?** — 15.
6. **Shortcut to make a range a Table?** — Ctrl+T.
7. **Key that cycles $A$1 / A$1 / $A1 / A1?** — F4.
8. **Which functions respect filtered-out rows?** — SUBTOTAL and AGGREGATE.
9. **Does COUNTA count a formula returning ""?** — Yes.
10. **What does a pivot calculated field operate on?** — Sums of the fields.
11. **How do you get Distinct Count in a pivot?** — Add the data to the Data Model.
12. **Name two volatile functions.** — OFFSET, INDIRECT (also TODAY, NOW, RAND).
13. **IFERROR vs IFNA?** — IFNA catches only #N/A; IFERROR hides every error.
14. **Function for a weighted average?** — SUMPRODUCT(weights, values) / SUM(weights).
15. **What does a #SPILL! error mean?** — A dynamic array's output range is blocked.

## Power BI

16. **Engine that stores Import data?** — VertiPaq (in-memory, columnar, compressed).
17. **Scheduled refreshes a day on Pro?** — 8 (48 on Premium/PPU).
18. **Pro semantic model size limit?** — 1 GB.
19. **Rows DirectQuery may return to Power BI in one query?** — 1 million.
20. **What connects Power BI Service to on-premises SQL Server?** — The on-premises data gateway.
21. **Active relationships allowed between two tables?** — One.
22. **Function to use an inactive relationship?** — USERELATIONSHIP inside CALCULATE.
23. **Two parameters incremental refresh needs?** — RangeStart and RangeEnd.
24. **Who does RLS not apply to?** — Workspace Admins, Members and Contributors.
25. **Security for hiding a column?** — Object-level security (OLS).
26. **Function behind dynamic RLS?** — USERPRINCIPALNAME().

## DAX

27. **What triggers context transition?** — CALCULATE, or a measure reference in row context.
28. **BLANK() = 0 in DAX?** — TRUE; use == for a strict comparison.
29. **Function that is TRUE only at a visual's grouping level?** — ISINSCOPE.
30. **Does DISTINCTCOUNT count BLANK?** — Yes; DISTINCTCOUNTNOBLANK does not.

## Scoring

25+ correct and quick: strong. 20–24: revise the misses. Under 20, or "VLOOKUP is exact by default"
or "RLS hides columns": go back to the question sets.`,
    mcqs: [
      mcq('Rapid fire: "How many rows does one Excel worksheet hold?"', [
        ['65,536 rows in current versions', false],
        ['1,048,576 rows in current versions', true],
        ['10,00,000 rows in current versions', false],
        ['16,384 rows in current versions', false],
      ], 'Since Excel 2007 a worksheet has 1,048,576 rows and 16,384 columns (A to XFD). 65,536 was the limit of the old .xls format; 16,384 is the column count.'),
      mcq('Rapid fire: "How many scheduled refreshes a day does a Pro workspace allow?"', [
        ['48 a day, the same as Premium', false],
        ['24 a day, once every hour', false],
        ['8 a day, set in the schedule', true],
        ['Unlimited, set by the gateway', false],
      ], 'Power BI Pro allows up to 8 scheduled refreshes a day per semantic model; Premium capacity and Premium Per User allow 48.'),
      mcq('Rapid fire: "Which DAX function lets a measure use an inactive relationship?"', [
        ['CROSSFILTER inside a FILTER call', false],
        ['RELATED inside an iterator call', false],
        ['TREATAS inside a SUMX call', false],
        ['USERELATIONSHIP inside CALCULATE', true],
      ], 'USERELATIONSHIP activates an existing inactive relationship for the duration of a CALCULATE. CROSSFILTER changes direction; RELATED follows an active relationship; TREATAS applies a virtual one.'),
      mcq('Rapid fire: "What does IFNA catch that IFERROR also catches, and what does it leave alone?"', [
        ['It catches #N/A only and leaves #DIV/0! and #VALUE! visible', true],
        ['It catches every error and also replaces blank results', false],
        ['It catches #DIV/0! only and leaves #N/A for lookups visible', false],
        ['It catches #VALUE! only and leaves #N/A and #REF! visible', false],
      ], 'IFNA handles only #N/A — the "not found" of a lookup — so real problems such as #DIV/0! or #VALUE! still show. IFERROR hides every error, including the ones that mean the formula is wrong.'),
      mcq('Rapid fire: "Which two Power Query parameters does incremental refresh require?"', [
        ['StartDate and EndDate, typed as Date', false],
        ['RangeStart and RangeEnd, typed as DateTime', true],
        ['FromKey and ToKey, typed as whole numbers', false],
        ['RefreshFrom and RefreshTo, typed as Text', false],
      ], 'Incremental refresh needs parameters named exactly RangeStart and RangeEnd of type Date/Time, used to filter the table; the service substitutes partition boundaries into them.'),
    ],
  },

  /* ── MOCK ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_IV_EXCEL_BI_MOCK',
    notes: `The interviewer's script for a 35-minute Excel and Power BI round at an analytics firm or a
product company's BI team. Do it with a friend reading the interviewer's lines, or record yourself.
The scoring notes are what a panel writes down.

## Opening (3 min)

"Walk me through the Power BI report in your portfolio — who it was for and one decision it
supports."

- **Strong:** names the audience ("the regional sales head"), one decision ("which stores get the
  extra promotion budget"), and the two KPIs that drive it.
- **OK:** describes the pages.
- **Weak:** lists visuals and colours.

## Q1 — Excel (5 min)

"Your SUMIFS for March revenue is ₹2.1 lakh below the billing system. Talk me through it."

- **Strong:** text-numbers (COUNT vs COUNTA), dates with times and the end-date condition (uses
  "<" 1 April), spelling and spaces in the criteria, subtotal rows; then "I would reconcile one
  day first to narrow it down."
- **OK:** two of these, unordered.
- **Weak:** "I would redo the formula."

## Q2 — Excel (4 min)

"A pivot calculated field Revenue = Price × Qty shows numbers far too big. Why?"

- **Strong:** calculated fields work on sums — SUM(Price) × SUM(Qty); add a Revenue column to the
  source or use a Data Model measure.
- **Weak:** "Refresh the pivot."

## Q3 — Modelling (6 min)

"Draw the model for sales, targets per category per month, and stores. Defend each relationship."

- **Strong:** Sales and Targets as two facts; Date, Product, Store dimensions; Targets related at
  its grain (Category, Month); all single direction; says the grain of each fact aloud.
- **OK:** a star for Sales, unsure about Targets.
- **Weak:** merges Targets into Sales, or relates fact to fact.

## Q4 — DAX (6 min)

"A matrix of customers by category: rows add to 13, total says 9. Fix it."

- **Strong:** "Nothing to fix — distinct customers overlap across categories; the total is a new
  evaluation." Then gives the case where the total *is* wrong (a threshold IF) and the SUMX fix.
- **OK:** explains the overlap but not the contrast.
- **Weak:** wraps it in SUMX to make the total 13 without asking what the business needs.

## Q5 — Security and refresh (5 min)

"Managers must see only their region; one manager says she sees all regions. What happened?"

- **Strong:** checks whether she has a Member/Contributor/Admin role in the workspace (RLS ignores
  those), whether her email is in the mapping table and spelled the same as her sign-in, and tests
  with *Test as role*.
- **Weak:** "RLS must be broken; I would rebuild it."

## Q6 — Critique (6 min)

The interviewer shares a page with 14 visuals, a 3D pie of revenue by 12 categories, a gauge, and
no dates. "What do you change?"

- **Strong:** audience and decision first; headline KPIs with comparisons; replace the 3D pie with
  sorted bars; add "data as of"; move detail to drill-through; names what to remove.
- **Weak:** starts with colours.

## Scoring

Hire bar: strong on Q3 and Q4, at least OK elsewhere. One confident wrong fact ("calculated fields
work row by row", "RLS applies to everyone in the workspace") outweighs two OK answers.`,
    mcqs: [
      mcq('In Q1, the candidate\'s SUMIFS uses "<="&DATE(2025,3,31) and the dates carry times of day. Which March orders are left out?', [
        ['Orders placed on 1 March before 10 a.m., due to rounding', false],
        ['Orders on 31 March after midnight, i.e. most of that day', true],
        ['No orders, because SUMIFS ignores the time part of a date', false],
        ['Orders on every day of March that were placed after noon', false],
      ], 'A date with a time is a serial number with a fraction, so 31-Mar-2025 14:30 is greater than 31-Mar-2025 (midnight) and fails "<=". Using "<" 1 April keeps the whole of 31 March.'),
      mcq('In Q3, a candidate relates the Targets fact directly to Sales on Category. Why does the panel mark this down?', [
        ['Facts should relate through shared dimensions, not to each other', true],
        ['Power BI cannot relate two tables that both contain numbers', false],
        ['Category is text, and relationships need whole-number keys', false],
        ['The relationship would make every Targets row inactive', false],
      ], 'Category is not unique in either fact, so a fact-to-fact link is many-to-many and filters only one way along an odd path. Shared dimensions (Category, Date) let one slicer filter both facts at their own grain.'),
      mcq('In Q4, a candidate wraps the customer measure in SUMX(VALUES(Products[Category]), [Customers]) so the total shows 13. What did the candidate miss?', [
        ['SUMX cannot iterate VALUES of a column from a dimension table', false],
        ['The new total counts a customer once per category bought in', true],
        ['DISTINCTCOUNT cannot be used inside an iterator such as SUMX', false],
        ['The rows will now all show 13, not their category counts', false],
      ], 'Summing category-level counts makes the total "customer-category pairs", so a person who bought in two categories is counted twice. That can be a valid metric, but it is not "customers", and the business question decides.'),
      mcq('In Q5, the manager seeing all regions turns out to be a workspace Contributor. What is the right fix?', [
        ['Rewrite the RLS filter with USERNAME() instead of the UPN', false],
        ['Add her to the RLS role a second time in the Service', false],
        ['Give her Viewer access or the app instead of Contributor', true],
        ['Turn on bidirectional filtering for the region relationship', false],
      ], 'RLS is enforced only for Viewers; Contributors, Members and Admins see all rows. Readers should consume the report through the app or a Viewer role.'),
      mcq('In Q6, which change most improves the 3D pie of revenue across 12 categories?', [
        ['A 2D pie with data labels on all twelve slices of the pie', false],
        ['A donut chart with the total revenue shown in the centre', false],
        ['A treemap so that every category has a coloured rectangle', false],
        ['A bar chart sorted by revenue, with the value on each bar', true],
      ], 'Twelve slices are hard to compare by angle, and 3D distorts the front slices. Sorted bars put the categories in rank order on one common scale, which is what the reader needs.'),
    ],
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_IV_EXCEL_BI_CHECKPOINT',
    notes: `Ten questions across the topic — Excel's silent failures, the model, DAX evaluation, security and
refresh. Each is the kind of thing an interviewer slides across the table. Read the numbers fully;
the traps are in the details.`,
    checkpoint: [
      ck('SPREADSHEET_ANALYSIS', 'A sheet has 2,000 rows. Rows for Goa are filtered out. Which formula sums the Amount column for the visible rows only?', [
        ['=SUM(D2:D2001), as SUM skips hidden rows by default', false],
        ['=SUMIF(D2:D2001, "<>Goa"), as it excludes filtered rows', false],
        ['=SUBTOTAL(109, D2:D2001), as it skips filtered-out rows', true],
        ['=SUMPRODUCT(D2:D2001), as it reads only displayed cells', false],
      ], 'SUBTOTAL ignores rows hidden by a filter (and with 101–111 codes, manually hidden rows too). SUM and SUMPRODUCT include every row, and SUMIF would test the amount, not the city.'),
      ck('SPREADSHEET_ANALYSIS', 'A dashboard sheet uses OFFSET in 40,000 formulas and every edit takes seconds. What is the cause, and the usual fix?', [
        ['OFFSET is volatile; use Tables or INDEX ranges instead', true],
        ['OFFSET is slow only on Mac; switch the file to Windows', false],
        ['The file is too wide; split the columns into two sheets', false],
        ['Calculation is set to manual; switch it back to automatic', false],
      ], 'Volatile functions recalculate whenever anything in the workbook changes, so 40,000 OFFSETs run on every edit. Structured Table references or INDEX(...):INDEX(...) ranges are not volatile.'),
      ck('SPREADSHEET_ANALYSIS', 'A pivot\'s calculated field Margin = Profit / Revenue shows 24% for South. Rows in the source have margins of 10%, 30% and 50%. Is 24% plausible?', [
        ['No, the field must equal the simple average of the rows, 30%', false],
        ['No, calculated fields cannot divide one field by another', false],
        ['No, the pivot must be refreshed to show the row-level value', false],
        ['Yes, it is total profit over total revenue, a weighted margin', true],
      ], 'Calculated fields work on sums, so this is SUM(Profit) / SUM(Revenue) — the revenue-weighted margin, which is the right number for a ratio. Large low-margin rows pull it below the simple average.'),
      ck('SPREADSHEET_ANALYSIS', 'Which lookup fails silently rather than with an error when the key column is not sorted?', [
        ['=XLOOKUP(A2, Keys, Values) with its default arguments', false],
        ['=VLOOKUP(A2, Table, 3) with no fourth argument given', true],
        ['=INDEX(Values, MATCH(A2, Keys, 0)) with match type 0', false],
        ['=XLOOKUP(A2, Keys, Values, "missing") with not-found text', false],
      ], 'Without a fourth argument VLOOKUP does an approximate match that assumes sorted keys; on unsorted data it returns some row\'s value with no error. The others use exact match and show #N/A or the not-found text.'),
      ck('DASHBOARDING', 'A report uses DirectQuery on a sales table with 30 crore rows. A table visual lists every order ID. What happens?', [
        ['It works, but the first view takes a few minutes to cache', false],
        ['It fails once the query returns over 1 million rows', true],
        ['It silently samples 1 lakh rows and shows those only', false],
        ['It switches the table to Import mode for that visual', false],
      ], 'DirectQuery has a limit of 1 million rows returned to Power BI for one query; a visual that needs more fails with an error. Aggregate in the visual or add filters.'),
      ck('DASHBOARDING', 'Why might two relationships set to both directions make Power BI mark a third relationship inactive?', [
        ['Because only two relationships may be active in a model', false],
        ['Because bidirectional filters always slow down refreshes', false],
        ['They create two filter paths between tables, an ambiguity', true],
        ['Because a dimension can be related to only one fact table', false],
      ], 'Bidirectional filters can open more than one path between two tables. Power BI refuses an ambiguous model and leaves one relationship inactive, which then quietly changes what slicers do.'),
      ck('DASHBOARDING', 'A customer\'s city changed from Pune to Bengaluru in June. Finance wants sales before June shown under Pune. What does the customer dimension need?', [
        ['Type 1 changes, overwriting the city on the customer row', false],
        ['A calculated column that reads the latest city from the CRM', false],
        ['A bidirectional relationship from Customers to Sales', false],
        ['Type 2 changes: a new row per change, with valid dates', true],
      ], 'A Type 2 slowly changing dimension keeps a row per version with a surrogate key and validity dates, and each sale points to the version in force at the time. Type 1 overwrites and moves all history to Bengaluru.'),
      ck('DASHBOARDING', 'Grocery, Kitchen and Personal Care show 6, 4 and 3 customers; the total shows 9 with DISTINCTCOUNT. What do you tell the manager?', [
        ['The total is correct; multi-category buyers count once', true],
        ['The total is wrong and needs SUMX to add up to 13 customers', false],
        ['The model has a missing relationship, so the total is low', false],
        ['The total excludes customers with blank IDs, so it is low', false],
      ], 'The total row re-evaluates the distinct count without a category filter, so a customer is counted once. The 4 extra counts in the rows come from people who bought in more than one category. The number of people who bought is 9.'),
      ck('DASHBOARDING', 'A measure CALCULATE([Sales], FILTER(Sales, Sales[Amount] > 3000)) is slow on a 5-crore-row fact. What is the better form?', [
        ['CALCULATE([Sales], FILTER(ALL(Sales), Sales[Amount] > 3000))', false],
        ['SUMX(Sales, IF(Sales[Amount] > 3000, Sales[Amount], 0))', false],
        ['CALCULATE([Sales], Sales[Amount] > 3000)', true],
        ['CALCULATE([Sales], VALUES(Sales), Sales[Amount] > 3000)', false],
      ], 'The boolean filter is shorthand for FILTER over the Amount column\'s values, not over every row and column of the fact. FILTER(ALL(Sales)) also drops the visual\'s filters, which changes the answer.'),
      ck('DASHBOARDING', 'A dynamic RLS role filters Region by USERPRINCIPALNAME(). One manager sees nothing at all. What is the most likely cause?', [
        ['She is a workspace Member, so RLS hides all rows from her', false],
        ['Her sign-in email is not in the mapping table, or differs', true],
        ['The report must be refreshed before RLS applies to new users', false],
        ['USERPRINCIPALNAME() works only in Power BI Desktop, not online', false],
      ], 'If the UPN matches no row of the mapping table, the role filter keeps no regions and every visual is blank. A Member would see everything, not nothing. Test with "Test as role" using her exact sign-in.'),
    ],
  },

  /* ── IV_STATS ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_IV_STATS_PYTHON_IV_STATS',
    notes: `Statistics questions in an analyst interview are rarely about formulas. The panel wants to know
whether you can explain an idea to a manager in plain words and whether you notice when a number is
misleading. Year 3 covered the mechanics — spread, the CLT, confidence intervals, Simpson's paradox.
These are the questions that test whether the ideas stuck.

## Q1. "Mean or median for salaries / order values / delivery times?"

**Strong answer.** "Median for a skewed variable when I want the typical case — nine freshers at ₹6
LPA and one lead at ₹60 LPA have a mean of ₹11.4 LPA and a median of ₹6 LPA. But the **mean** is what
adds up: revenue = orders × mean order value, so for totals and forecasts I need the mean. I report
both when they differ much, and the gap itself tells me the data is skewed."

**Follow-up:** "What about P90?" — for delivery or latency, the 90th percentile describes the bad
experiences the median hides; ten deliveries of 18–30 minutes plus one of 55 have a median of 23
but a P90 of 32.5 (numpy's default linear interpolation).

## Q2. "Standard deviation vs standard error?"

**Strong answer.** "SD describes how spread out individual values are. SE describes how much a
**statistic** — usually the mean — would vary from sample to sample: SD / √n. 1,600 orders with SD
₹400 give SE ₹10, so a 95% interval for the mean of ₹850 is about ₹830 to ₹870. More data shrinks the
SE, not the SD."

## Q3. "A fraud model flags a transaction. What is the chance it is fraud?"

**Strong answer** — always ask for the base rate. With 1% fraud, a model that catches 90% of fraud
and wrongly flags 5% of genuine transactions: per 10,000 transactions, 90 true flags and 495 false
flags, so P(fraud | flag) = 90 / 585 ≈ **15.4%**. "Most flags are genuine customers — which is why
flagged payments go to review, not auto-block."

**Trap:** answering 90%. That is P(flag | fraud), the reverse conditional.

## Q4. "Correlation is 0.6. What does that tell you?"

**Strong answer.** A moderate **linear** association; r² = 0.36, so a straight line explains about
36% of the variance. It says nothing about cause, and nothing about non-linear patterns (y = x² on
1–5 still gives r ≈ 0.98, while a U-shape can give r ≈ 0). Look at the scatter plot.

**Follow-up:** "Then how do you get at cause?" — an experiment if possible; otherwise compare like
with like (segments, before/after with a control group), and say what you could not rule out.

## Q5. "The worst-performing stores last month improved after the training. Did it work?"

**Strong answer.** "Not shown yet. Picking stores because they were at their worst guarantees some
improvement from **regression to the mean** — part of a bad month is bad luck that does not repeat.
I need a comparison group of similarly bad stores that did not get the training."

## Q6. "Name some sampling biases you have seen."

**Strong answer**, with examples: **selection** (a survey in the app misses churned users),
**survivorship** (analysing only loans that are still active), **non-response** (only angry or
delighted customers reply), **convenience** (interviewing customers in one mall). Then: "I check who
is missing before I trust a rate."

## Q7. "What distribution would you expect for … ?"

**Strong answer.** Order values and incomes: right-skewed, often roughly log-normal. Orders per
minute: Poisson-like counts — at an average of 3 a minute, a minute with none happens about 5% of
the time (e^-3 ≈ 0.050). Conversions out of n visitors: binomial. Heights or measurement errors:
close to normal. Knowing the shape tells you whether a mean ± 2 SD band means anything.

## Q8. "Explain a confidence interval to a manager in one sentence."

**Strong answer.** "If we repeated this survey many times, intervals built this way would contain the
true value 95% of the time; ours is ₹830 to ₹870, so the true average is very likely in that range,
and we should not read meaning into differences smaller than that."

## How you are judged

Plain words, a concrete number, and the caveat. A candidate who says "it depends" without saying
**on what** loses the point; one who asks for the base rate or the comparison group wins it.`,
    mcqs: [
      mcq('1% of transactions are fraud. A model flags 90% of frauds and 5% of genuine transactions. Roughly what share of flagged transactions are fraud?', [
        ['About 90%, the share of fraud the model catches', false],
        ['About 15%, since false flags outnumber the true flags', true],
        ['About 95%, one minus the false-positive rate of 5%', false],
        ['About 1%, the same as the base rate of fraud overall', false],
      ], 'Per 10,000 transactions: 100 frauds give 90 flags, and 9,900 genuine ones give 495 false flags. 90 / 585 ≈ 15.4%. 90% is P(flag | fraud), the reverse conditional.'),
      mcq('An analyst reports SD ₹400 and SE ₹10 for 1,600 order values. A manager asks why the two differ so much. What is the right explanation?', [
        ['SE is SD divided by √1,600: the spread of the mean, not of orders', true],
        ['SE is SD divided by 40 because 40 outliers were removed first', false],
        ['SE measures rounding error in the data, which is always small', false],
        ['SD is computed on the sample and SE on the whole population', false],
      ], 'Standard error is the standard deviation of the sample mean: 400 / √1,600 = 400 / 40 = 10. Individual orders vary by about ₹400; the average of 1,600 of them varies by about ₹10 from sample to sample.'),
      mcq('The 20 lowest-scoring call-centre agents in March got coaching, and their April scores rose. Why is that not yet evidence the coaching worked?', [
        ['Coaching effects appear only after three months of data', false],
        ['Scores of 20 agents are too few to compute any average', false],
        ['Agents picked at their worst tend to improve regardless', true],
        ['April has more working days, so scores rise every year', false],
      ], 'Selecting on an extreme month means part of the low score was bad luck that does not repeat — regression to the mean. A comparison group of similar low scorers without coaching is needed to separate the effect.'),
    ],
    checkpoint: [
      ck('STATISTICS_BASICS', 'Ten deliveries took 18, 20, 21, 22, 22, 24, 25, 27, 30 and 55 minutes. Which summary best describes the bad experiences a manager should watch?', [
        ['The median of 23 minutes, because it ignores the outlier', false],
        ['The P90 of about 32.5 minutes, which tracks the slow tail', true],
        ['The mean of 26.4 minutes, because it uses every delivery', false],
        ['The minimum of 18 minutes, the best the fleet can manage', false],
      ], 'The median describes the typical delivery and hides the slow ones; the mean blends them. A high percentile such as P90 (32.5 with numpy\'s default interpolation) describes the tail that drives complaints.'),
      ck('STATISTICS_BASICS', 'x is 1 to 5 and y = x². Pearson\'s r is about 0.98. What does that show about r?', [
        ['The relationship must be linear, because r is close to 1', false],
        ['r is wrong here and should be 1, because y depends on x exactly', false],
        ['r measures linear fit; a curve can still score near 1', true],
        ['r near 1 proves that x causes y in this kind of data', false],
      ], 'Pearson\'s r measures how well a straight line fits. On 1–5, y = x² is close to a line, so r ≈ 0.98 though the relationship is a curve — and a U-shape can give r near 0. Plot before reading r.'),
      ck('STATISTICS_BASICS', 'A bank studies only loans still active today to find what predicts repayment. What bias is built in?', [
        ['Non-response bias, since some borrowers ignored the survey', false],
        ['Survivorship bias, since defaulted loans were closed and left out', true],
        ['Recall bias, since borrowers misremember their past payments', false],
        ['Measurement bias, since EMIs are recorded in two currencies', false],
      ], 'Loans that defaulted or were written off are no longer active, so they are missing from the data — the very cases the study needs. Any pattern found describes survivors only.'),
    ],
  },

  /* ── IV_AB ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_IV_STATS_PYTHON_IV_AB',
    notes: `Product companies, fintechs and e-commerce firms in India ask A/B testing questions in nearly every
analyst loop. Year 3 covered the test itself — the z-test, sample size, peeking, SRM. Interviewers
now push on judgement: what you do when the result is borderline, how you would get an answer faster,
and when an A/B test is the wrong tool.

## Q1. "Define a p-value without saying 'probability the null is true'."

**Strong answer.** "Assuming the change does nothing, the p-value is the probability of seeing a
difference at least as large as ours just from random assignment. Small p means our result would be
surprising if nothing changed. It is not the probability that the change works, and it says nothing
about how big the effect is."

## Q2. "Control 480/12,000, treatment 540/12,000, p = 0.055. Ship it?"

**Strong answer.** "4.0% vs 4.5%, a 12.5% relative lift. Pooled z ≈ 1.92, p ≈ 0.055, and the 95%
interval for the difference is about −0.01 to +1.01 percentage points. That is **not 'no effect'** —
it is 'we cannot rule out zero, and the plausible range is mostly positive'. The decision depends on
cost: if the change is cheap and has no guardrail damage, shipping is a reasonable business call
stated as such; if it is costly, extend to the pre-planned sample or re-run with more power. What I
would not do is switch to one-sided or slice segments until something is significant."

## Q3. "How do you size a test?"

**Strong answer.** Decide the **MDE** from the business (the smallest lift worth shipping), then
n per group ≈ (z₁₋α/₂ + z₁₋β)² × [p₁(1−p₁) + p₂(1−p₂)] / δ². For 10% → 11% at α = 0.05 and 80%
power, that is about **14,750 per group** (Lehr's rule of thumb, 16·p(1−p)/δ², gives 14,400).
Going from 80% to 90% power multiplies n by about 1.34. Then convert to days of traffic and round up
to whole weeks.

**Follow-up:** "You only have 5,000 users per group. What can you detect?" — at a 10% base, an MDE of
about 1.7 percentage points (a 17% relative lift). "If the realistic effect is 1 point, this test
cannot find it — I would say so before running it."

## Q4. "How would you get a result with fewer users?"

**Strong answer.** Reduce variance: **CUPED** uses each user's pre-experiment value of the metric as
a covariate; with a correlation ρ between pre and post, variance falls by a factor of (1 − ρ²), so
ρ = 0.7 needs about 51% of the original sample. Also: a more sensitive metric closer to the change
(add-to-cart rather than revenue), trimming extreme values for revenue metrics (decided in advance),
and testing on the relevant population only (users who reach checkout).

## Q5. "Randomise by user, analyse by session — problem?"

**Strong answer.** Yes. Sessions from the same user are correlated, so treating them as independent
understates the variance and gives p-values that are too small. Analyse at the unit of
randomisation, or use a method for ratio metrics (the delta method, or bootstrapping users).

## Q6. "When is an A/B test the wrong tool?"

**Strong answer.** **Network effects or shared resources** — a rider-allocation change on half the
orders in a city changes the riders the other half get; use geo or time-based switchback tests.
**Too little traffic** — a B2B tool with 300 customers. **Long-term outcomes** — a credit policy
whose defaults show up in 12 months. **Ethics or law** — showing different prices for the same thing
can break trust or regulation. Then the answer is a quasi-experiment (difference-in-differences with
a control region), a staged rollout, or a holdout group.

## Q7. "Results look great. What do you check before reporting?"

**Strong answer.** SRM first (5,200 vs 4,800 in a 50/50 split gives χ² = 16, p ≈ 0.00006 — the
assignment is broken, so the result is untrustworthy); guardrails (cancellations, refunds, latency);
novelty (does the lift decay day by day?); whether the metric and the analysis were the ones
planned; and Twyman's law — any result that looks too good is usually a bug.

## How you are judged

The panel wants decisions, not definitions: what you would **do** with p = 0.055, an underpowered
design or a broken split, and why.`,
    workedExample: `**Question: "Checkout conversion: control 480 of 12,000, treatment 540 of 12,000. Walk me through
your read-out."**

1. **Health checks first.** The split is exactly 12,000 / 12,000 against a planned 50/50, so no SRM.
   Guardrails: refunds and payment failures unchanged (say you would check).
2. **Effect size.** 4.0% → 4.5%: +0.5 percentage points, +12.5% relative.
3. **Uncertainty.** Pooled two-proportion z-test: pooled p = 1,020 / 24,000 = 4.25%;
   SE = √(0.0425 × 0.9575 × (2/12,000)) ≈ 0.0026; z ≈ 0.005 / 0.0026 ≈ 1.92; two-sided p ≈ 0.055.
   95% CI for the difference (unpooled SE) ≈ −0.01 to +1.01 pp.
4. **What it means.** "We cannot rule out zero at the 5% level. The data are consistent with anything
   from no change to about a one-point lift, and most of that range is positive."
5. **Was it powered?** For a 0.5-point lift on a 4% base, a test needs about 25,500 per group at 80%
   power — this one had 12,000, so an inconclusive result was the likely outcome even if the effect
   is real. Say this was a design gap.
6. **Recommendation.** "If the change is cheap and guardrails are clean, I would ship and keep a 5%
   holdout to confirm the lift over the next month. If it costs engineering time to maintain, run it
   to the full 25,500 per group first."
7. **What not to do.** No switching to a one-sided test after the fact, no hunting through
   segments for a significant one.`,
    mcqs: [
      mcq('Control converts 480 of 12,000 and treatment 540 of 12,000; p ≈ 0.055 and the 95% CI is about −0.01 to +1.01 pp. Which read-out is right?', [
        ['The test proves the change has no effect on conversion', false],
        ['Zero is not ruled out, but the plausible range is mostly up', true],
        ['The lift is 12.5% for certain, since the CI is mostly positive', false],
        ['Switching to a one-sided test is fine, as it gives p ≈ 0.03', false],
      ], 'A p just above 0.05 means zero is inside the interval, not that the effect is zero. The interval runs from about no change to about +1 point. Switching to one-sided after seeing the data inflates false positives.'),
      mcq('A metric\'s pre-experiment value correlates 0.7 with its value during the test. Using CUPED, roughly what sample gives the same power as before?', [
        ['About 70% of the original sample', false],
        ['About 30% of the original sample', false],
        ['About 49% more than the original', false],
        ['About 51% of the original sample', true],
      ], 'CUPED reduces variance by a factor of 1 − ρ² = 1 − 0.49 = 0.51, and the required sample scales with variance, so about 51% of the original users give the same power.'),
      mcq('A test randomises users but computes conversion per session and runs a z-test on sessions. What goes wrong?', [
        ['Nothing, as long as the number of sessions is large enough', false],
        ['Sessions of one user are correlated, so p-values are too small', true],
        ['Sessions inflate the variance, so p-values come out too large', false],
        ['The z-test cannot be used on any proportion computed per session', false],
      ], 'The independent unit is the user. Treating a user\'s many sessions as independent understates the variance and overstates significance. Analyse per user, or use the delta method or a user-level bootstrap.'),
    ],
    checkpoint: [
      ck('HYPOTHESIS_TESTING', 'A test plans a base conversion of 10% and an MDE of 1 point (to 11%), α = 0.05 two-sided, 80% power. Roughly how many users per group?', [
        ['About 1,500 per group', false],
        ['About 3,700 per group', false],
        ['About 14,750 per group', true],
        ['About 59,000 per group', false],
      ], '(1.96 + 0.84)² × (0.10 × 0.90 + 0.11 × 0.89) / 0.01² ≈ 7.85 × 0.1879 / 0.0001 ≈ 14,750. Lehr\'s shortcut 16 × 0.09 / 0.0001 gives 14,400 — the same order.'),
      ck('HYPOTHESIS_TESTING', 'A new rider-assignment rule is tested on a random half of orders in Hyderabad. Why can the result mislead?', [
        ['Orders are too many, so every tiny difference looks significant', false],
        ['Both halves share one rider pool, so each arm changes the other', true],
        ['Hyderabad is one city, so the result cannot be calculated at all', false],
        ['Riders see both versions, so the test has a sample ratio mismatch', false],
      ], 'Treatment orders take riders that control orders would have had, so the arms interfere — the test measures a mixed system. Geo splits or time-based switchback tests avoid the shared pool.'),
      ck('HYPOTHESIS_TESTING', 'With 5,000 users per group and a 10% base rate, the smallest lift detectable at 80% power is about 1.7 points. The expected lift is 1 point. What do you say?', [
        ['Run it; a 1-point lift will show as significant if it is real', false],
        ['Run it with α = 0.20 instead, so a 1-point lift shows up', false],
        ['Run it and look at segments, where the effect will be larger', false],
        ['This design cannot detect it; get more users or more power', true],
      ], 'An effect below the MDE will usually come out non-significant even if real, wasting the test. Say so before running: more users, a longer run, variance reduction, or a more sensitive metric.'),
    ],
  },

  /* ── IV_PANDAS ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_IV_STATS_PYTHON_IV_PANDAS',
    notes: `The pandas part of an analyst loop is usually a shared notebook: "here is an orders table — give
me X". The panel watches whether you reach for vectorised operations, whether you check row counts
after a merge, and whether you know the defaults that silently change answers. Outputs below were
run on pandas 3.0; where 2.x differs, it is noted.

## Q1. "agg vs transform vs apply?"

**Strong answer.** \`agg\` returns one row per group. \`transform\` returns a result **aligned to the
original rows** — the group's value repeated on each row — which is what you need for "share of
city total" or "flag orders above the city average":

    df['share'] = df['rev'] / df.groupby('city')['rev'].transform('sum')

\`apply\` runs arbitrary Python per group and is the slowest; use it when nothing else fits.

## Q2. "count vs size?"

**Strong answer.** \`size\` counts rows per group; \`count\` counts **non-null** values in a column.
For a city whose only amount is missing, \`size\` is 1 and \`count\` is 0. And \`sum\` of an all-NaN
group is **0**, not NaN (pass \`min_count=1\` to get NaN) — an empty group silently reports zero
revenue.

## Q3. "What happens to missing keys in groupby and merge?"

**Strong answer.** \`groupby\` drops NaN keys by default (\`dropna=True\`) — those rows vanish from the
totals; pass \`dropna=False\` to keep them as their own group. \`merge\` does the **opposite of SQL**:
it matches NaN keys to each other (None and NaN alike), so a missing customer ID on the left joins to
every missing ID on the right. Drop or fill missing keys before merging.

## Q4. "How do you make sure a merge did not multiply rows?"

**Strong answer.** Check \`len\` before and after, and declare the expectation:

    orders.merge(products, on='pid', how='left', validate='many_to_one')

\`validate\` raises \`MergeError\` ("Merge keys are not unique in right dataset") if the product master
has duplicate keys. \`indicator=True\` adds a \`_merge\` column (left_only / right_only / both) to see
what did not match.

## Q5. "pivot vs pivot_table?"

**Strong answer.** \`pivot\` only reshapes and raises \`ValueError: Index contains duplicate entries,
cannot reshape\` if a row/column pair appears twice. \`pivot_table\` aggregates duplicates — with
**mean** by default, which is wrong for revenue; pass \`aggfunc='sum'\`.

## Q6. "Why is apply(axis=1) slow and what do you use instead?"

**Strong answer.** It calls a Python function once per row. Vectorised column arithmetic runs in
compiled code over whole arrays. For conditional labels use \`np.where\` (two outcomes) or
\`np.select\` (several):

    df['band'] = np.select([df.amt >= 1000, df.amt >= 500], ['High', 'Mid'], default='Low')

## Q7. "Days since each customer's previous order?"

**Strong answer.**

    o = o.sort_values(['user', 'd'])
    o['gap'] = o.groupby('user')['d'].diff().dt.days

The first order per user gets NaN — say so, and say what it means ("no previous order"), rather than
filling it with 0.

## Q8. "Top 2 products per city, keeping ties honest?"

**Strong answer.** \`groupby('city')['rev'].rank(method=...)\`. \`method='first'\` breaks ties by row
order (exactly 2 per city, arbitrary among ties); \`'min'\` gives tied rows the same rank (may return
more than 2); \`'dense'\` ranks 1, 1, 2 with no gaps. Pick one and say why.

## Q9. "What changed in pandas 3.0 that bites old notebooks?"

**Strong answer.** **Copy-on-Write** is always on: \`df[df.x > 1]['y'] = 9\` never modifies \`df\` (it
raises a \`ChainedAssignmentError\` warning) — use \`df.loc[df.x > 1, 'y'] = 9\`. In 2.x the same line
gave \`SettingWithCopyWarning\` and also did not change \`df\`. Text columns default to the new
\`str\` dtype instead of \`object\`.

## How you are judged

Correct code is the floor. The bar is: row counts checked, defaults named, and the edge case (ties,
missing keys, the first order) called out before the interviewer asks.`,
    workedExample: `**Task (shared notebook): "orders has order_id, user, city, d (datetime) and rev. Give me, per
city, revenue, orders, and each city's share of total revenue; then the median days between a
user's orders."**

    import pandas as pd

    print(len(orders), orders['order_id'].is_unique)          # grain check first
    print(orders[['city', 'rev']].isna().sum())               # missing keys / values

    by_city = (orders.groupby('city', dropna=False)
                     .agg(revenue=('rev', 'sum'), orders=('order_id', 'nunique'))
                     .reset_index())
    by_city['share'] = by_city['revenue'] / by_city['revenue'].sum()
    assert abs(by_city['revenue'].sum() - orders['rev'].sum()) < 1e-6   # nothing lost

    o = orders.sort_values(['user', 'd'])
    o['gap_days'] = o.groupby('user')['d'].diff().dt.days
    print(o['gap_days'].median(), o['gap_days'].notna().sum())

**What to say while typing:**
1. "I check the grain — one row per order? — before I count anything."
2. "\`dropna=False\` keeps orders with no city as their own row, so the shares add to 100%."
3. "Named aggregation gives readable columns; \`nunique\` on order_id in case the table is per line."
4. "The assert proves the city totals reconcile to the whole table."
5. "The first order of each user has no gap — the median uses only users with two or more orders,
   and I report how many gaps it is based on."

That narration — grain, missing keys, reconciliation, the edge case — is what gets marked.`,
    mcqs: [
      mcq(`What does this print (pandas 3.0)?

    df = pd.DataFrame({'city': ['Pune', 'Pune', 'Goa', 'Delhi', 'Goa'],
                       'amount': [100, 300, 200, None, 400]})
    print(df.groupby('city')['amount'].sum().to_dict())`, [
        ["{'Delhi': nan, 'Goa': 600.0, 'Pune': 400.0}", false],
        ["{'Delhi': 0.0, 'Goa': 600.0, 'Pune': 400.0}", true],
        ["{'Goa': 600.0, 'Pune': 400.0}", false],
        ["{'Pune': 400.0, 'Goa': 600.0, 'Delhi': 0.0}", false],
      ], 'Sum skips NaN, and the sum of nothing is 0, so Delhi shows 0.0 — an empty group silently reports zero. groupby sorts keys by default, so the order is Delhi, Goa, Pune. Use min_count=1 to get NaN instead.'),
      mcq(`How many rows does the merge return?

    left = pd.DataFrame({'k': ['a', None, np.nan], 'v': [1, 2, 3]})
    right = pd.DataFrame({'k': ['a', np.nan], 'w': [10, 20]})
    print(len(left.merge(right, on='k')))`, [
        ['1, since missing keys never match in an inner join', false],
        ['2, since None and NaN are treated as different keys', false],
        ['3, since pandas matches missing keys with each other', true],
        ['It raises an error, since keys cannot contain missing values', false],
      ], 'Unlike SQL, pandas merge treats missing keys as equal: both the None row and the NaN row on the left match the NaN row on the right, plus the "a" match — 3 rows. Drop or fill missing keys before merging.'),
      mcq('A store × month table has two rows for (S1, Jan). What does df.pivot(index="store", columns="month", values="rev") do?', [
        ['It keeps the first of the two S1 rows and drops the other', false],
        ['It averages the two S1 rows, as pivot_table would by default', false],
        ['It sums the two S1 rows into one cell for January', false],
        ['It raises ValueError because a pair of keys is duplicated', true],
      ], 'pivot only reshapes; a duplicate index/column pair raises "Index contains duplicate entries, cannot reshape". pivot_table aggregates duplicates, with mean as the default aggfunc — pass aggfunc="sum" for revenue.'),
    ],
    checkpoint: [
      ck('DATA_WRANGLING', 'Which line adds each order\'s share of its city\'s revenue as a new column, keeping one row per order?', [
        ["df['share'] = df['rev'] / df.groupby('city')['rev'].sum()", false],
        ["df['share'] = df['rev'] / df.groupby('city')['rev'].transform('sum')", true],
        ["df['share'] = df.groupby('city')['rev'].agg('sum') / df['rev']", false],
        ["df['share'] = df['rev'] / df['rev'].sum()", false],
      ], 'transform returns the city total aligned to every original row, so the division is row by row. The plain sum is indexed by city and does not align with the order rows; dividing by the overall sum gives share of total, not of city.'),
      ck('DATA_WRANGLING', 'Revenues are [500, 300, 500, 200]. What does s.rank(ascending=False, method="dense") return?', [
        ['[1.5, 3.0, 1.5, 4.0]', false],
        ['[1.0, 3.0, 1.0, 4.0]', false],
        ['[1.0, 2.0, 1.0, 3.0]', true],
        ['[1.0, 2.0, 3.0, 4.0]', false],
      ], 'Dense ranking gives ties the same rank and leaves no gap: 500 → 1, 300 → 2, 200 → 3. The default "average" gives 1.5 to the ties; "min" gives 1, 3, 1, 4.'),
      ck('DATA_WRANGLING', 'On pandas 3.0, df[df.x > 1]["y"] = 9 is run. What happens to df?', [
        ['Rows with x > 1 get y = 9, and a warning is raised', false],
        ['df is unchanged; a ChainedAssignmentError warning appears', true],
        ['Every row gets y = 9, since the filter is applied after', false],
        ['It raises KeyError, since y cannot be set on a filtered view', false],
      ], 'Under Copy-on-Write (always on in 3.0) a chained assignment writes to a temporary object and never reaches df; pandas warns with ChainedAssignmentError. df.loc[df.x > 1, "y"] = 9 is the correct form.'),
    ],
  },

  /* ── IV_CLEANING_EDA ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_IV_STATS_PYTHON_IV_CLEANING_EDA',
    notes: `"Here is a dataset you have never seen — what do you do?" is asked in almost every analyst loop,
sometimes as the opening of a take-home. The panel is not looking for a list of pandas functions.
They want an order, a reason for each step, and judgement about what to fix versus what to report.

## Q1. "You get a new dataset. Walk me through the first 30 minutes."

**Strong answer — in this order.**
1. **What is one row?** Find the grain and the key; check the key is unique.
2. **Shape and types:** rows, columns, dtypes; numbers stored as text, dates as strings.
3. **Coverage:** date range, gaps (a missing week), and whether the last period is partial.
4. **Missing values:** per column, and **where** they cluster (one city, one month, one app version).
5. **Distributions:** describe, value counts, impossible values (negative quantity, age 230,
   rating 0 on a 1–5 scale).
6. **Reconcile:** one total against a number the business already knows.
7. **Write down findings and questions** as you go — they become the first slide.

**Trap:** opening with charts. Charts on unchecked data look convincing and may be wrong.

## Q2. "How do you handle missing values?"

**Strong answer.** First ask **why** they are missing. Missing completely at random (a logging
glitch) can be dropped or imputed with little bias. Missing **because of** something — ratings
missing for cancelled orders, income missing for rejected applicants — is a finding, not a gap:
imputing it invents data and hides the pattern. Options: drop, impute (median for skewed numbers,
mode or "Unknown" for categories), add a "was missing" flag, or leave it and report it.

**Follow-up:** "What does mean imputation do to the spread?" — it shrinks it. Filling the two gaps
in [10, 20, —, 40, —, 30] with the mean 25 cuts the sample SD from 12.9 to 10.0, so later
confidence intervals look tighter than the data supports.

## Q3. "How do you find and treat outliers?"

**Strong answer.** Find with the IQR rule or percentiles, but **decide with domain knowledge**.
Delivery times 12, 15, 18, 20, 22, 25, 28, 30, 95: Q1 = 18, Q3 = 28 (pandas' default linear
interpolation), IQR = 10, upper fence 43 — so 95 is flagged. Is it a typo, a test order, or a real
three-hour delivery during a flood? Errors get fixed or removed; real extremes stay, and you
report a median beside the mean (here 22 vs 29.4).

## Q4. "Duplicates?"

**Strong answer.** Exact duplicates (same row twice from a re-run load) — drop. Duplicate **keys**
with different values — decide the rule: keep the latest by an update timestamp
(\`sort_values('updated').drop_duplicates('cust', keep='last')\`), or merge fields. Fuzzy duplicates
("Ananya Rao" vs "Ananya  Rao", phone with and without +91) need normalising first. Always log how
many rows each rule removed.

## Q5. "The cleaned file has 3% fewer rows. Is that OK?"

**Strong answer.** "Only if I can say which rule removed which rows, and the removed rows are not
concentrated in one segment. If all 3% are from one city, the city's numbers are now biased." Keep a
cleaning log: rows in, rows removed per rule, rows out.

## Q6. "What do you look at in EDA beyond summary statistics?"

**Strong answer.** Segments (by city, channel, device, cohort), time trends, relationships between
pairs of variables, and anything surprising followed up with a question to the data owner. The
output of EDA is **questions and hypotheses**, not charts.

## Q7. "A column of ratings has many zeros."

**Strong answer.** Check the allowed range first. If ratings are 1–5, a 0 is a code for "not rated"
— treat it as missing, not as a terrible rating, or the average falls for no real reason.

## How you are judged

Order and reasons. "I check the grain and reconcile a total before I clean anything" separates a
working analyst from someone who has memorised \`df.dropna()\`.`,
    mcqs: [
      mcq('Delivery times are 12, 15, 18, 20, 22, 25, 28, 30 and 95 minutes. Using pandas quantiles and the 1.5 × IQR rule, what is the upper fence?', [
        ['43 minutes, from Q3 = 28 plus 1.5 × an IQR of 10', true],
        ['52 minutes, from the mean of 29.4 plus 1.5 × the SD', false],
        ['45 minutes, from Q3 = 30 plus 1.5 × an IQR of 10', false],
        ['37 minutes, from the median 22 plus 1.5 × an IQR of 10', false],
      ], 'pandas\' default linear interpolation gives Q1 = 18 and Q3 = 28, so IQR = 10 and the upper fence is 28 + 15 = 43. The 95-minute delivery is flagged — then domain knowledge decides whether it is an error.'),
      mcq('Ratings are missing for 30% of orders, and almost all of them are cancelled orders. What is the best treatment?', [
        ['Fill them with the median rating so the averages are complete', false],
        ['Drop the rows, as missing values are random noise in surveys', false],
        ['Treat the gap as a finding: cancelled orders were never rated', true],
        ['Fill them with 1, since a cancelled order is a bad experience', false],
      ], 'The values are missing because of something — the order was cancelled — so imputing invents ratings for experiences that never happened. Report rated orders only and state the coverage.'),
      mcq('An analyst fills two missing values in [10, 20, None, 40, None, 30] with the mean. What happens to the sample standard deviation?', [
        ['It stays at 12.9, as the mean of the data has not changed', false],
        ['It rises to 15.8, as there are now more values in the data', false],
        ['It falls from about 12.9 to 10.0, as the fills sit on the mean', true],
        ['It becomes undefined, as the fills create duplicate values', false],
      ], 'Two values placed exactly at the mean add count without adding spread, so the SD falls from 12.9 to 10.0. Later intervals then look more precise than the data supports.'),
    ],
    checkpoint: [
      ck('DATA_CLEANING', 'A customer table has C1 twice: Pune (updated 1 Jan) and Mumbai (updated 1 Mar). Which line keeps each customer\'s latest city?', [
        ["c.drop_duplicates('cust', keep='first')", false],
        ["c.sort_values('upd').drop_duplicates('cust', keep='last')", true],
        ["c.drop_duplicates(keep='last')", false],
        ["c.sort_values('upd', ascending=False).drop_duplicates('cust', keep='last')", false],
      ], 'Sorting ascending by update date puts the newest row last for each customer, and keep="last" keeps it. Without a sort, "first" or "last" depends on file order; keep="last" after a descending sort keeps the oldest.'),
      ck('DATA_CLEANING', 'After cleaning, 3% of rows are gone, and nearly all came from Kochi. What is the risk?', [
        ['None, since 3% is below the usual 5% tolerance for cleaning', false],
        ['The Kochi figures are now biased and need to be flagged', true],
        ['The total revenue will be 3% higher than the raw total', false],
        ['The dates will shift, as rows were removed from the middle', false],
      ], 'A small overall loss can be a large loss in one segment. If Kochi lost most of its rows, Kochi\'s numbers — and any comparison with it — are unreliable. A per-rule, per-segment cleaning log catches this.'),
      ck('DATA_CLEANING', 'A rating column allows 1 to 5, and 4,100 rows hold 0. What should the analyst do?', [
        ['Keep the zeros, as they are the angriest customers in the data', false],
        ['Replace them with 1, the lowest allowed rating on the scale', false],
        ['Treat 0 as "not rated", i.e. missing, and confirm with the owner', true],
        ['Drop every row with a 0 rating, including its order revenue', false],
      ], 'A value outside the allowed range is a code, usually "not rated". Averaging it as a score drags the mean down for no real reason. Treat it as missing for ratings, keep the rows for revenue, and confirm the code.'),
    ],
  },

  /* ── RAPID_FIRE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_IV_STATS_PYTHON_RAPID_FIRE',
    notes: `A screening call: thirty questions in about ten minutes. One correct line each. Cover the answer,
say yours out loud, then check.

## Statistics

1. **Mean or median for incomes?** — Median for the typical case; mean for totals.
2. **SE of a mean?** — SD / √n.
3. **Share of a normal distribution within ±1.96 SD?** — 95%.
4. **r = 0.6 — share of variance a line explains?** — 36% (r²).
5. **Bias from studying only active loans?** — Survivorship bias.
6. **Why do the worst stores "improve" next month?** — Regression to the mean.
7. **Distribution for orders per minute?** — Poisson.
8. **P(fraud | flag) depends on what you forgot?** — The base rate.
9. **P(none) for a Poisson with mean 3?** — e^-3 ≈ 5%.
10. **Does a 95% CI contain the true value with 95% probability?** — The *method* captures it 95% of the time.

## A/B testing

11. **What is α?** — The false-positive rate you accept when nothing changed.
12. **What is power?** — The chance of detecting a real effect of the MDE size.
13. **Default power in most plans?** — 80%.
14. **n from 80% to 90% power?** — About 1.34 times.
15. **n to halve the MDE?** — About 4 times.
16. **Lehr's rule for n per group?** — 16 × variance / δ².
17. **What does SRM stand for?** — Sample ratio mismatch.
18. **Variance reduction with a pre-period covariate?** — CUPED.
19. **CUPED variance factor at ρ = 0.7?** — 1 − 0.49 = 0.51.
20. **Test design when arms share riders or sellers?** — Switchback or geo split.
21. **Twyman's law?** — A result that looks too good is usually wrong.

## pandas and cleaning

22. **One row per group or aligned to rows — which is transform?** — Aligned to rows.
23. **Sum of an all-NaN group?** — 0 (NaN with min_count=1).
24. **Does groupby keep NaN keys by default?** — No; dropna=True.
25. **Do NaN keys match in merge?** — Yes, unlike SQL.
26. **Argument that checks merge cardinality?** — validate.
27. **pivot_table's default aggfunc?** — mean.
28. **Nullable integer dtype?** — Int64 (capital I).
29. **pd.cut intervals default to which side closed?** — Right, e.g. (0, 10].
30. **1.5 × IQR fences for Q1 18, Q3 28?** — 3 and 43.

## Scoring

25+ correct and quick: strong. 20–24: revise the misses. Under 20, or "p is the probability the
null is true" or "NaN keys never match": go back to the question sets.`,
    mcqs: [
      mcq('Rapid fire: "What does pivot_table use to combine duplicate entries if you pass no aggfunc?"', [
        ['sum of the values', false],
        ['mean of the values', true],
        ['first of the values', false],
        ['count of the values', false],
      ], 'pivot_table defaults to aggfunc="mean", which silently averages revenue when it should be summed. Pass aggfunc="sum" for additive measures.'),
      mcq('Rapid fire: "Roughly how much more sample do you need for 90% power instead of 80%?"', [
        ['About 13% more users per group', false],
        ['About 34% more users per group', true],
        ['About twice as many per group', false],
        ['About four times as many per group', false],
      ], 'n scales with (z₁₋α/₂ + z₁₋β)²: (1.96 + 1.28)² / (1.96 + 0.84)² ≈ 10.51 / 7.85 ≈ 1.34. Four times is what halving the MDE costs.'),
      mcq('Rapid fire: "What does pd.cut([10, 20, 30], [0, 10, 20, 30]) put 10 into?"', [
        ['The interval (10, 20]', false],
        ['The interval [10, 20)', false],
        ['The interval [0, 10)', false],
        ['The interval (0, 10]', true],
      ], 'pd.cut closes intervals on the right by default (right=True), so 10 falls in (0, 10]. Pass right=False for left-closed bins such as [0, 10).'),
      mcq('Rapid fire: "A 50/50 test ends with 5,200 and 4,800 users. What is the first concern?"', [
        ['Sample ratio mismatch: the split itself looks broken', true],
        ['Novelty effect: the treatment is still too new to read', false],
        ['Low power: 10,000 users are too few for any test', false],
        ['Peeking: the team must have stopped the test early', false],
      ], 'Against an expected 5,000 / 5,000, the chi-square is 16 with p ≈ 0.00006 — far too uneven to be chance. The assignment or logging is broken, so the result cannot be trusted until it is found.'),
      mcq('Rapid fire: "Which dtype holds whole numbers and missing values together?"', [
        ['int64, which stores NaN as -1', false],
        ['float32, which keeps integers exact', false],
        ['Int64, the nullable integer dtype', true],
        ['object, which is the fastest choice', false],
      ], 'NumPy int64 cannot hold NaN — astype(int) on a column with NaN raises IntCastingNaNError. pandas\' nullable Int64 stores integers with <NA> for missing values.'),
    ],
  },

  /* ── MOCK ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_IV_STATS_PYTHON_MOCK',
    notes: `The interviewer's script for a 40-minute statistics, experimentation and pandas round at a
product company or fintech. Do it with a friend reading the interviewer's lines, or record
yourself. The scoring notes are what a panel writes down.

## Opening (3 min)

"Tell me about one analysis where the data surprised you."

- **Strong:** a specific dataset, the surprise ("ratings were missing only for cancelled orders"),
  what they did about it, and what changed in the conclusion.
- **Weak:** a general description of a project with no surprise.

## Q1 — Statistics (5 min)

"Average order value went up 8% this month. My CEO is happy. Should she be?"

- **Strong:** asks whether the mean was pulled by a few large orders (compare the median), whether
  order **count** moved (AOV can rise while revenue falls), whether the mix changed (more of a
  high-value city), and whether 8% is outside normal month-to-month variation.
- **OK:** two of these.
- **Weak:** "Yes, 8% is a big increase."

## Q2 — Probability (4 min)

"1% of loan applications are fraudulent. Our model catches 90% of fraud and flags 5% of genuine
applications. What fraction of flagged applications are fraud?"

- **Strong:** works the 10,000-application table aloud: 90 true flags, 495 false, 90 / 585 ≈ 15%.
  Adds "so flags should go to review, not rejection".
- **Weak:** "90%."

## Q3 — A/B design (7 min)

"We want to test a new checkout page. Design the test."

- **Strong:** hypothesis and primary metric (checkout conversion per user), guardrails (payment
  failures, refunds, page load time), randomisation unit (user), MDE from the business, sample size
  and run length in whole weeks, SRM check, no peeking, the decision rule written in advance.
- **OK:** metric and sample size, no guardrails.
- **Weak:** "Split the traffic and see which is better."

## Q4 — Reading a result (6 min)

"Control 480 / 12,000, treatment 540 / 12,000, p = 0.055. The PM wants to ship. You?"

- **Strong:** "Zero is not ruled out; the interval is about −0.01 to +1.01 points, mostly positive.
  The test was underpowered for a half-point lift. If the change is cheap and guardrails are clean,
  shipping with a holdout is a reasonable business call — labelled as such." Refuses one-sided
  switching and segment fishing.
- **Weak:** "Not significant, so the change does not work."

## Q5 — pandas (10 min, shared notebook)

"orders(order_id, user, city, d, rev) and users(user, signup_city). Revenue per signup city, and the
share of users with a second order within 30 days."

- **Strong:** checks uniqueness of users.user and uses \`validate='many_to_one'\`; checks row count
  after the merge; uses \`dropna=False\` or reports users with no signup city; computes the gap per
  user with \`groupby().diff()\`; defines the denominator (all users with a first order) out loud.
- **OK:** correct numbers, no checks.
- **Weak:** \`apply\` over rows, no idea how many rows the merge returned.

## Q6 — Cleaning judgement (5 min)

"In the users table, 12% of signup cities are blank — all from one app version. What do you do?"

- **Strong:** not random — a logging bug in that version; report it to engineering, keep the users
  as "Unknown" rather than dropping them, and check whether that version's users differ (newer
  users, one platform).
- **Weak:** fills with the most common city.

## Scoring

Hire bar: strong on Q3 and Q4, at least OK elsewhere, notebook correct. A confident wrong answer to
Q2 ("90%") or "p = 0.055 means no effect" outweighs two OK answers.`,
    mcqs: [
      mcq('In Q1, average order value rose 8% while the number of orders fell 12%. What happened to revenue?', [
        ['It rose about 8%, because AOV drives revenue', false],
        ['It fell about 5%, since 1.08 × 0.88 ≈ 0.95', true],
        ['It fell about 4%, since 8% minus 12% is −4%', false],
        ['It is unchanged, because the two effects cancel', false],
      ], 'Revenue = orders × AOV, so the factors multiply: 1.08 × 0.88 = 0.9504, a fall of about 5%. Subtracting percentages is an approximation that gives −4%.'),
      mcq('In Q3, which choice of primary metric fits a checkout-page test randomised by user?', [
        ['Page views of the checkout page per day, across all users', false],
        ['Average revenue per order among users who did convert', false],
        ['Checkout conversion per user, with payment failures as a guardrail', true],
        ['Time on the checkout page, since longer means more engagement', false],
      ], 'The metric should match the change and the unit of randomisation: the share of users who complete checkout. Revenue per converter conditions on the outcome, and time on page can rise because the page got worse.'),
      mcq('In Q4, the PM proposes rerunning the analysis one-sided, which gives p ≈ 0.027. What should the candidate say?', [
        ['That is fine, since the expected direction was positive anyway', false],
        ['That is fine, as long as the one-sided α is also set to 0.10', false],
        ['Choosing the test after seeing data inflates false positives', true],
        ['One-sided tests cannot be used for conversion-rate metrics', false],
      ], 'The test was planned two-sided; switching after seeing the direction halves the p-value without new evidence. The honest read-out is the planned test, plus the interval and a business decision.'),
      mcq('In Q5, users.user turns out to have 40 duplicate IDs. What does merge(..., validate="many_to_one") do?', [
        ['It keeps the first row for each duplicate user ID and continues', false],
        ['It raises MergeError, since the right-hand keys are not unique', true],
        ['It returns the merge and adds a warning column to the result', false],
        ['It drops the 40 duplicate IDs from both tables before merging', false],
      ], 'validate checks the declared relationship and raises MergeError ("Merge keys are not unique in right dataset") instead of silently multiplying order rows. Then you decide which user row is correct.'),
      mcq('In Q6, 12% of signup cities are blank, all from one app version. Why is filling them with the most common city wrong?', [
        ['The mode is unstable and changes each time the data is loaded', false],
        ['It biases that city upward with users from one app version', true],
        ['pandas cannot fill text columns with a single repeated value', false],
        ['Missing text values must always be dropped, never filled in', false],
      ], 'The gap is caused by a bug in one version, not chance. Filling with the mode moves all those users into one city and hides the bug. Keep them as "Unknown", report the bug, and compare that version\'s users.'),
    ],
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_IV_STATS_PYTHON_CHECKPOINT',
    notes: `Ten questions across the topic — base rates and spread, experiment judgement, pandas defaults
and cleaning decisions. Each is the kind of thing an interviewer slides across the table. Work the
numbers before you choose.`,
    checkpoint: [
      ck('STATISTICS_BASICS', 'Nine analysts earn ₹6 LPA and their lead earns ₹60 LPA. A recruiter says "the average salary here is ₹11.4 LPA". What is the better summary of a typical salary?', [
        ['₹11.4 LPA, since the mean uses every salary in the team', false],
        ['₹33 LPA, the midpoint between the lowest and the highest', false],
        ['₹6 LPA, the median, as one high salary pulls the mean up', true],
        ['₹60 LPA, since the lead is the most experienced person', false],
      ], 'Mean = (9 × 6 + 60) / 10 = 11.4, but nine of ten people earn 6. The median, 6, describes the typical salary; the mean is right for the total payroll.'),
      ck('STATISTICS_BASICS', 'Orders arrive at an average of 3 a minute, roughly Poisson. About how often is a minute with no orders?', [
        ['About 5% of minutes', true],
        ['About 33% of minutes', false],
        ['Never, since the mean is 3', false],
        ['About 0.3% of minutes', false],
      ], 'For a Poisson count, P(0) = e^(−λ) = e^(−3) ≈ 0.050. A quiet minute is unusual but expected about once every 20 minutes — not a sign of an outage on its own.'),
      ck('STATISTICS_BASICS', 'A survey link is sent only inside the app, and 82% of respondents say they are satisfied. What is the main problem?', [
        ['The sample is too large, so small differences look large', false],
        ['Churned users never see the app, so the sample skews happy', true],
        ['Satisfaction cannot be measured with a percentage at all', false],
        ['The survey needs a control group to be meaningful at all', false],
      ], 'People who left the app cannot be reached in the app, so the sample over-represents those who stayed — selection bias. The 82% describes current users, not all customers.'),
      ck('HYPOTHESIS_TESTING', 'A test finishes with 5,200 users in control and 4,800 in treatment for a planned 50/50 split. What do you do first?', [
        ['Report the result, as 400 users is a small difference', false],
        ['Reweight the treatment arm to 5,200 users and analyse it', false],
        ['Find the cause of the uneven split before using results', true],
        ['Rerun the analysis with a one-sided test to regain power', false],
      ], 'A chi-square against 5,000 / 5,000 gives 16, p ≈ 0.00006: the split is broken (assignment, redirects or logging). Until the cause is known, any difference between arms may come from who was counted, not the change.'),
      ck('HYPOTHESIS_TESTING', 'A new credit-limit policy may change defaults that appear only after 12 months. Why is a two-week A/B test the wrong tool here?', [
        ['A/B tests cannot be used in any regulated financial product', false],
        ['Two weeks cannot observe the outcome that matters, defaults', true],
        ['Credit limits are numbers, and A/B tests need yes/no outcomes', false],
        ['Users would notice the test and change how they repay loans', false],
      ], 'The primary outcome happens long after the test ends, so a short test would measure only early proxies. A staged rollout with a holdout, followed for months, or a quasi-experiment fits better.'),
      ck('HYPOTHESIS_TESTING', 'Which statement about a p-value of 0.03 is correct?', [
        ['There is a 3% chance the change has no effect at all', false],
        ['There is a 97% chance the change has the observed effect', false],
        ['With no real change, a gap this large shows up 3% of the time', true],
        ['The effect is large, as it is significant at the 5% level', false],
      ], 'A p-value assumes the null is true and gives the chance of a difference at least this extreme. It is not the probability of the null, and it says nothing about effect size.'),
      ck('DATA_WRANGLING', 'df.groupby("city")["amount"].count() returns 0 for Delhi, but .size() returns 1. What does Delhi\'s row hold?', [
        ['A missing amount, counted by size but not by count', true],
        ['An amount of 0, which count skips as a false value', false],
        ['Nothing at all, since size counts the group label only', false],
        ['A duplicate key, which count removes and size keeps', false],
      ], 'size counts rows in the group; count counts non-null values in the column. One row with a missing amount gives size 1 and count 0. A real 0 would be counted.'),
      ck('DATA_WRANGLING', 'An orders table has 4 rows with product IDs 1, 1, 2, 3; the product master has IDs 1, 1, 2, 3 (P1 is duplicated). How many rows does orders.merge(products, on="pid") return?', [
        ['4 rows, as each order matches one product', false],
        ['5 rows, as only one order picks up the extra P1', false],
        ['6 rows, as both P1 orders match both P1 rows', true],
        ['8 rows, as every order matches every product row', false],
      ], 'Each of the two P1 orders matches both P1 master rows (2 × 2 = 4), plus one row each for P2 and P3: 6. Revenue summed after this merge is overstated; validate="many_to_one" would have raised an error.'),
      ck('DATA_CLEANING', 'A loans file has income missing for 18% of applications, nearly all of them rejected. An analyst fills them with the median income. What goes wrong?', [
        ['Nothing, as the median is robust to outliers in income', false],
        ['Rejected applicants get invented incomes, hiding a pattern', true],
        ['The median cannot be computed while values are missing', false],
        ['The income column changes dtype from float to object', false],
      ], 'The values are missing for a reason tied to the outcome (rejection), so filling them invents data and weakens the real relationship between income and approval. Flag them, analyse separately, and report.'),
      ck('DATA_CLEANING', 'Which first step in exploring an unfamiliar orders table catches the most errors before any chart is drawn?', [
        ['Plot a histogram of every numeric column to see their shapes', false],
        ['Run a correlation matrix to find the strongest relationships', false],
        ['Train a quick model to see which columns predict revenue', false],
        ['Find what one row means and check that its key is unique', true],
      ], 'Grain and key uniqueness decide whether every later count and sum is right — duplicated order rows would inflate every chart. Shape, types, coverage and a reconciliation follow; charts come after.'),
    ],
  },
];
