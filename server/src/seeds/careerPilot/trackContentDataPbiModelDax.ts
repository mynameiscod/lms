/**
 * Career-track content: Power BI modelling and DAX (Data Analytics + AI), batch A3.
 *
 *  - DT_PBI_MODEL  the Power BI workflow, Power Query, the star schema and relationships, the date table.
 *  - DT_PBI_DAX    measures vs calculated columns, filter context and CALCULATE, time intelligence,
 *                  iterators, variables and ranking.
 *
 * One running model across both topics: Annapurna Mart, a South and West India grocery-and-home retail
 * chain, with a Sales fact and Products, Stores, Customers and Date dimensions. The measures in DAX build
 * on the model built in MODEL, so a student meets the same twelve sales again and again and can check
 * every figure by hand.
 *
 * Power BI cannot be run while authoring, so only documented behaviour (Microsoft Learn, SQLBI) is
 * stated; every rupee figure a measure would return was computed with pandas from the inline data.
 *
 * Both topics declare the single skill DASHBOARDING, so checkpoint questions carry no skillKey.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

/** The running dataset, shown in several units so each can be read on its own. */
const MODEL_DATA = `**Products** (5 rows)

| ProductID | ProductName | Category | UnitCost | ListPrice |
|---|---|---|---|---|
| P01 | Basmati Rice 5kg | Grocery | 520 | 699 |
| P02 | Sunflower Oil 1L | Grocery | 120 | 155 |
| P03 | Pressure Cooker 5L | Kitchen | 1,450 | 2,199 |
| P04 | Mixer Grinder 750W | Appliances | 2,600 | 3,499 |
| P05 | Cotton Bedsheet | Home | 480 | 799 |

**Stores** (4 rows — Kochi opened in July 2025 and has no sales in this extract)

| StoreID | StoreName | City | Region |
|---|---|---|---|
| S1 | Kukatpally | Hyderabad | South |
| S2 | Kothrud | Pune | West |
| S3 | T Nagar | Chennai | South |
| S4 | Edappally | Kochi | South |

**Customers** (4 rows)

| CustomerID | Tier |
|---|---|
| C101 | Gold |
| C102 | Silver |
| C103 | None |
| C104 | Gold |

**Sales** (12 rows, April–June 2025; Amount = Qty × UnitPrice, added in Power Query)

| SaleID | Date | StoreID | ProductID | CustomerID | Qty | UnitPrice | Amount |
|---|---|---|---|---|---|---|---|
| 1 | 03-Apr-2025 | S1 | P01 | C101 | 2 | 699 | 1,398 |
| 2 | 05-Apr-2025 | S2 | P04 | C102 | 1 | 3,499 | 3,499 |
| 3 | 12-Apr-2025 | S3 | P03 | C103 | 1 | 2,199 | 2,199 |
| 4 | 20-Apr-2025 | S1 | P02 | C104 | 6 | 155 | 930 |
| 5 | 02-May-2025 | S2 | P05 | C101 | 2 | 799 | 1,598 |
| 6 | 09-May-2025 | S1 | P04 | C103 | 1 | 3,499 | 3,499 |
| 7 | 15-May-2025 | S3 | P01 | C102 | 3 | 699 | 2,097 |
| 8 | 28-May-2025 | S2 | P02 | C104 | 10 | 155 | 1,550 |
| 9 | 04-Jun-2025 | S1 | P03 | C101 | 1 | 2,199 | 2,199 |
| 10 | 11-Jun-2025 | S3 | P05 | C103 | 3 | 799 | 2,397 |
| 11 | 19-Jun-2025 | S2 | P01 | C102 | 1 | 699 | 699 |
| 12 | 27-Jun-2025 | S3 | P04 | C104 | 2 | 3,499 | 6,998 |

Totals to check yourself against: 12 sales, 33 units, **₹29,063** in sales, ₹20,740 at cost, so ₹8,323
gross margin (28.64%). By category: Appliances ₹13,996, Grocery ₹6,674, Kitchen ₹4,398, Home ₹3,995.
By city: Chennai ₹13,691, Hyderabad ₹8,026, Pune ₹7,346. By month: April ₹8,026, May ₹8,744,
June ₹12,293.`;

export const TRACK_DATA_PBI_MODEL_DAX_BUNDLES: PilotBundle[] = [
  /* ══════════════════════════════════════════════════════════════════════════════════════
   * DT_PBI_MODEL — Power Query and the data model
   * ════════════════════════════════════════════════════════════════════════════════════ */

  /* ── POWERBI_TOUR ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PBI_MODEL_POWERBI_TOUR',
    notes: `You have built dashboards in Excel: a Table, some pivots, slicers, a refresh button. Power BI does
the same job for data that is bigger, comes from several systems, must refresh itself, and is read by
people who should never open a workbook. This unit is the map; the rest of the topic fills it in.

## The running example: Annapurna Mart

Annapurna Mart is a grocery-and-home retail chain with stores in Hyderabad, Pune, Chennai and Kochi.
Every till sale lands in a point-of-sale (POS) database; the category team keeps the product list in
Excel; the store list is a table in the company's SQL Server; loyalty tiers come from the CRM as a CSV.
The regional manager wants one report: sales by store, category and month, margin, and growth against
last year — refreshed every morning without anyone touching it.

That request is exactly what Power BI is for. Here is the same data we will use for the whole of this
topic and the DAX topic after it:

${MODEL_DATA}

## The five stages

| Stage | Where | What you do | Excel equivalent |
|---|---|---|---|
| 1. Get data | Power BI Desktop > Get data | Connect to Excel, CSV, a folder, SQL Server, SharePoint, hundreds more | Data > Get Data |
| 2. Transform | Power Query Editor | Clean and shape: types, trims, merges, appends — recorded as steps | Power Query in Excel (the same engine) |
| 3. Model | Model view | Tables, relationships between them, a date table | Several Tables plus XLOOKUP, or the Excel Data Model |
| 4. Calculate and visualise | Report view, DAX | Measures in DAX; charts, matrices, cards, slicers | Pivot tables, formulas, charts |
| 5. Publish and share | Power BI Service | Publish to a workspace, schedule refresh, share or publish an app | Emailing the workbook |

**Power BI Desktop** is the free Windows application where stages 1–4 happen; your work is saved as a
\`.pbix\` file. **Power BI Service** (app.powerbi.com) is the cloud side where reports are shared,
refreshed on a schedule and viewed in a browser or the Power BI Mobile app. When you publish, the
Service receives two things: the **report** (the pages of visuals) and the **semantic model** (the
tables, relationships and measures — Microsoft called this a *dataset* until late 2023, and you will
still see that word in older articles and job descriptions).

## Inside Power BI Desktop

The strip on the left switches views:

- **Report view** — the canvas where you build pages of visuals.
- **Table view** — the loaded rows of each table (older versions called it Data view).
- **Model view** — the tables as boxes with relationship lines between them.
- **DAX query view** — write and run DAX queries against the model (added in 2023–24 updates).

The **Data** pane on the right lists every table, column and measure. **Transform data** on the Home
ribbon opens the Power Query Editor.

## A first report from a CSV, in about ten minutes

1. **Get data > Text/CSV**, pick \`sales_q1.csv\` (the 12 Sales rows above). The preview shows the
   columns; click **Transform data** rather than Load, so you can check types first.
2. In Power Query, confirm Date is a date, Qty a whole number, UnitPrice and Amount decimal or fixed
   decimal numbers. **Close & Apply**.
3. In Report view, add a **Card** with Amount. Power BI shows *Sum of Amount* = **29,063** (or 29.06K
   with its default display units) — an *implicit* measure it created by summing the column.
4. Add a **Clustered column chart**: Date on the X-axis, Amount on the Y-axis. Power BI's Auto date/time
   feature splits the date into Year > Quarter > Month > Day; drill to Month and you see April 8,026,
   May 8,744, June 12,293.
5. Add a **Slicer** on StoreID. Click S3 and the card shows **13,691** and the chart re-draws for
   Chennai alone. Every visual on the page filters every other visual by default — this is called
   **cross-filtering**, and it is the behaviour the whole DAX topic is built on.

That report works, but it has three problems you will fix in this topic: the store shows as "S3"
because the Stores table is not there yet, the margin needs product costs from another source, and a
single table will not survive the second and third source. Those are modelling problems, and modelling
is most of the work.

## Import or DirectQuery

When you connect to a database, Power BI asks for a **storage mode**:

| Mode | What happens | Good for | Costs |
|---|---|---|---|
| Import | Data is copied into the model's in-memory engine (VertiPaq) | Most reports; fastest visuals; all DAX | Only as fresh as the last refresh; size limits (1 GB per model on Pro) |
| DirectQuery | Each visual sends a query to the source when it is viewed | Very large or near-real-time data | Slower visuals, load on the source, some DAX and Power Query limits |

Default to Import. Annapurna Mart's daily sales are a few lakh rows a year; Import with a morning
refresh is the right answer. (Microsoft Fabric adds a third mode, **Direct Lake**, for data already in
OneLake; you will meet it only in Fabric workspaces.)

## How the report reaches the manager

1. **Publish** from Desktop to a **workspace** in the Service — a shared folder for a team's content.
2. Set **scheduled refresh** on the semantic model: up to 8 refreshes a day on a Pro (shared)
   workspace, up to 48 on Premium or Fabric capacity.
3. Sources inside the company network (Annapurna's SQL Server, a file share) need an **on-premises data
   gateway** installed on a machine that can reach them; cloud sources (SharePoint Online, Azure SQL)
   usually do not.
4. **Share** the report, or bundle a workspace's reports into an **app** for a wider audience.

Licensing in one line: to publish and to share content, people need a **Power BI Pro** (or Premium Per
User) licence; viewers with a free licence can read content only when it sits in a workspace on Premium
or a large enough Fabric capacity. The Publishing unit in the next topic covers refresh, the gateway and
row-level security in depth.

## What a Power BI analyst actually spends time on

Roughly: a third getting and cleaning data in Power Query, a third modelling and writing DAX, a third
designing visuals and talking to the people who use them. New analysts reverse this — they spend hours
on colours and minutes on the model, and then the numbers are wrong.`,
    mcqs: [
      mcq('An Annapurna Mart analyst publishes a report from Power BI Desktop. Besides the report pages, what arrives in the Power BI Service as a separate item?', [
        ['The semantic model holding the tables, relationships and measures', true],
        ['A copy of the Power Query Editor that viewers can open and edit', false],
        ['An Excel workbook with one sheet for each page of the report', false],
        ['A gateway that keeps the store database connected to the report', false],
      ], 'Publishing creates a report and a semantic model (formerly called a dataset). The model holds the data, relationships and DAX; the report holds the visuals that query it.'),
      mcq('A card built from the 12-row sales CSV shows "Sum of Amount" as 29,063, though nobody wrote a measure. What is that value?', [
        ['An implicit measure Power BI made by summing the column', true],
        ['A calculated column Power BI added to the Sales table', false],
        ['A total typed into the CSV file by the export system', false],
      ], 'Dragging a numeric column into a visual makes Power BI aggregate it (Sum by default). That implicit measure works, but explicit DAX measures are better for anything you reuse.'),
      mcq('Annapurna Mart’s sales live in a SQL Server inside the head-office network. What does the Power BI Service need so the report can refresh at 6 am every day?', [
        ['An on-premises data gateway on a machine that can reach the server', true],
        ['A DirectQuery connection, because Import cannot refresh on a timer', false],
        ['A Power BI Desktop window left open with the report on that machine', false],
        ['A Premium capacity, since Pro workspaces have no scheduled refresh', false],
      ], 'The Service runs in the cloud and cannot see inside the company network, so an on-premises data gateway relays the refresh. Import models on Pro can refresh up to 8 times a day.'),
    ],
    checkpoint: [
      mcq('A report shows sales by store with a StoreID slicer. When the analyst clicks S3 in the slicer, the card changes from 29,063 to 13,691 and the chart redraws. What behaviour is this?', [
        ['Cross-filtering: one visual’s selection filters the others', true],
        ['A refresh of the source data triggered by the slicer click', false],
        ['A DAX calculated column recomputed for the chosen store', false],
      ], 'Selections in slicers and visuals filter the other visuals on the page by default. No data is reloaded; each visual re-evaluates its measures under the new filter.'),
      mcq('Annapurna Mart has about four lakh sales rows a year and the manager is happy with numbers as of each morning. Which storage mode fits best?', [
        ['Import, refreshed once each morning', true],
        ['DirectQuery, so every click queries the POS', false],
        ['DirectQuery for Sales, Import for nothing else', false],
        ['Live connection to the analyst’s Desktop file', false],
      ], 'Import is the default and the fastest; a few lakh rows fit easily, and daily freshness is all that is needed. DirectQuery suits very large or near-real-time data and costs speed.'),
      mcq('In which part of Power BI Desktop would you check that the Stores table is linked to the Sales table by StoreID?', [
        ['Model view', true],
        ['Report view', false],
        ['The Service’s workspace list', false],
        ['The Format pane of a visual', false],
      ], 'Model view draws each table as a box with relationship lines between them; double-clicking a line shows the columns, cardinality and filter direction.'),
    ],
  },

  /* ── POWER_QUERY ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PBI_MODEL_POWER_QUERY',
    notes: `Power Query is the part of Power BI that gets data and shapes it before it reaches the model. It is
the same engine you met in Excel (Data > Get Data), with the same rule: **every change is recorded as a
step, and every refresh replays the steps on the new data.** You never clean the same file twice.

## Annapurna Mart's four sources

| Query | Source | Arrives as | Problems in it |
|---|---|---|---|
| Sales | A SharePoint folder; the POS drops one CSV per month | sales_2025_04.csv, sales_2025_05.csv… | Dates as text "03/04/2025" (day first); StoreID " s1 " with spaces and lower case; Amount missing |
| Products | Excel workbook kept by the category team | Sheet "Catalogue" | Two title rows above the header; UnitCost has "₹1,450" as text |
| Stores | SQL Server table dbo.Stores | A clean database table | Extra columns nobody needs |
| Customers | CRM export CSV | customers.csv | Tier blank for new customers |

## The Power Query Editor

**Home > Transform data** opens it. Four areas matter:

- **Queries** pane (left): one query per table, plus helpers.
- **Preview** (centre): the first rows of the current step's result.
- **Applied Steps** (right): the recipe. Click any step to see the data as it was after that step.
- **Formula bar**: the step written in **M**, Power Query's language. Home > Advanced Editor shows the
  whole query as M.

Turn on **View > Column quality** and **Column distribution**. Column quality shows the share of
Valid, Error and Empty values in each column. Note the status bar: by default profiling looks at only
the **top 1,000 rows**; switch it to "Column profiling based on entire data set" before trusting it.

## Shaping the Sales query, step by step

**Get data > SharePoint folder** (or **Folder** for a local one) lists the files; **Combine & Transform
Data** stacks them into one table and creates helper queries (a sample file and a function) that apply
the same steps to every file. Next month's CSV is picked up automatically on refresh.

Then, on the combined table:

| Step | How | Why |
|---|---|---|
| Promoted Headers | Home > Use First Row as Headers | The CSV's first line is the column names |
| Trimmed and Uppercased StoreID | Transform > Format > Trim, then UPPERCASE | " s1 " must match "S1" in the Stores table |
| Changed Type with Locale | Right-click Date > Change Type > Using Locale > Date, English (India) | "03/04/2025" is 3 April, not 4 March |
| Changed Type | Qty whole number; UnitPrice fixed decimal | Text numbers cannot be summed |
| Added Custom | Add Column > Custom Column: \`[Qty] * [UnitPrice]\` named Amount | One stored line amount for the model |
| Removed Columns | Keep SaleID, Date, StoreID, ProductID, CustomerID, Qty, UnitPrice, Amount | Fewer columns = smaller, faster model |

The Date step deserves attention. A plain **Change Type > Date** uses the file's locale (File >
Options and settings > Options > Current file > Regional settings), which by default comes from the
Windows region of whoever created the file. With English (United States), "03/04/2025" becomes 4 March 2025 and
"20/04/2025" becomes an **Error** — the 20th month does not exist. Using Locale makes the conversion
explicit: the culture is written into the step, so the result no longer depends on any regional setting.

The M for two of those steps looks like this — you rarely type it, but you should be able to read it:

    #"Changed Type with Locale" = Table.TransformColumnTypes(#"Uppercased Text",
        {{"Date", type date}}, "en-IN"),
    #"Added Custom" = Table.AddColumn(#"Changed Type", "Amount",
        each [Qty] * [UnitPrice], type number)

Each step names the step before it; that chain is the recipe.

## Shaping Products from Excel

1. **Remove Top Rows** (2) to drop the title lines, then **Use First Row as Headers**.
2. **Replace Values** "₹" with nothing and "," with nothing in UnitCost, then **Change Type** to fixed
   decimal. (Or Split and Extract — any recorded step works.)
3. Rename "Prod Code" to ProductID so the key name matches Sales.

## Merge and Append — the two ways to combine queries

| Operation | Excel equivalent | SQL equivalent | Annapurna Mart use |
|---|---|---|---|
| **Append** | Pasting one table under another | UNION ALL | Stacking April, May and June sales files (the Folder connector does this for you) |
| **Merge** | XLOOKUP into a new column | JOIN | Bringing Region from Stores into a Targets table that has only StoreID |

Merge asks for the two tables, the matching column(s), and a **join kind**:

| Join kind | Keeps |
|---|---|
| Left outer (default) | All rows of the first table, matches from the second |
| Inner | Only rows that match in both |
| Left anti | Rows of the first with **no** match in the second |
| Full outer | Everything from both |

**Left anti** is the analyst's audit tool. Merge Sales with Stores on StoreID using Left anti, and the
result is every sale whose store code is missing from the store list — the rows that would otherwise
appear as "(Blank)" in every store visual. Run it after any new source arrives.

A warning that saves hours: **do not merge every dimension into the Sales table** to make one wide
table. It feels convenient and it is the mistake the next unit, on the star schema, is about. Use Merge
to fix a table, not to flatten the model.

## Query folding: let the database do the work

When the source is a database, Power Query tries to translate your steps into one SQL query and send it
to the server — **query folding**. Filtering Stores to Active = 1 and removing columns become a WHERE
and a SELECT list, so only the needed rows travel. Right-click a step: if **View Native Query** is
available, that step folds. Some steps break folding (for example many custom M functions, or adding an
index column), and every step after a non-folding step runs inside Power BI. Put filters and column
removal **early**, before anything that stops folding.

## Staging queries and load

A query you need only as an ingredient (a helper, a lookup used in a merge) should not become a model
table: right-click it and untick **Enable load**. **Close & Apply** then loads only the real tables.

## Refresh

**Refresh** in Desktop, or the scheduled refresh in the Service, re-runs every step against the source:
new monthly files are combined, new products are cleaned, the same trims and type changes apply. If a
source changes shape — the POS renames "Qty" to "Quantity" — the step that refers to "Qty" fails with an
error naming the missing column, and you fix that one step.`,
    workedExample: `**Goal: load three monthly sales files whose store codes and dates are messy, and prove nothing was
lost.**

The SharePoint folder holds sales_2025_04.csv, sales_2025_05.csv and sales_2025_06.csv, 4 rows each.
A sample of the raw June file:

    SaleID,Date,StoreID,ProductID,CustomerID,Qty,UnitPrice
    9,04/06/2025, s1 ,P03,C101,1,2199
    10,11/06/2025,S3,P05,C103,3,799
    11,19/06/2025,s2,P01,C102,1,699
    12,27/06/2025,S3 ,P04,C104,2,3499

**1. Connect and combine.** Get data > SharePoint folder > site URL > Combine & Transform Data. Power
Query shows 12 rows and adds a Source.Name column holding each file name — keep it for now; it tells
you which file a bad row came from.

**2. Fix the key.** Select StoreID > Transform > Format > Trim, then Format > UPPERCASE. " s1 " becomes
"S1", "S3 " becomes "S3".

**3. Fix the date.** Right-click Date > Change Type > Using Locale > Date, English (India). Column
quality for Date shows 100% Valid. (With a plain Change Type in a file whose locale is English (United States) it would
show 5 of the 12 rows as Error — every date after the 12th of its month, such as 19/06 and 27/06,
because there is no 19th month — while the other 7 would silently become wrong dates: 04/06 as 6 April,
11/06 as 6 November. That silent majority is the dangerous part.)

**4. Types and the amount.** Qty to Whole number, UnitPrice to Fixed decimal number, then Add Column >
Custom Column, name Amount, formula \`[Qty] * [UnitPrice]\`, and set its type to Fixed decimal.

**5. Audit before loading.** Reference the Sales query, Merge it with Stores on StoreID, join kind
**Left anti**. The result has **0 rows** — every StoreID now matches a store. Before step 2 the same
check returned 3 rows (" s1 ", "s2", "S3 "), which is exactly what would have shown up as "(Blank)" in
the store chart. Repeat with Products on ProductID and Customers on CustomerID.

**6. Reconcile.** In Report view, a card with COUNT of SaleID shows 12 and Sum of Amount shows 29,063 —
the same totals as the POS's own Q1 summary. Remove Source.Name if nobody needs it, untick Enable load on
the audit query, and Close & Apply.

**What makes this repeatable:** in July, the POS drops sales_2025_07.csv into the folder; the scheduled
refresh combines four files, applies the same trim, locale and amount steps, and the Left anti audit
query (refreshed with it) will show any new store code that the store list does not know yet.`,
    mcqs: [
      mcq('Annapurna Mart’s POS writes dates such as "20/04/2025". On an analyst’s laptop with US regional settings, a plain Change Type to Date turns those rows into errors. What is the correct fix?', [
        ['Change Type > Using Locale, choosing Date and English (India)', true],
        ['Replace "/" with "-" so Power Query reads the date the other way', false],
        ['Leave Date as text and convert it in a DAX calculated column', false],
        ['Set the laptop’s region to India and then re-create the report file', false],
      ], 'Using Locale records the culture in the step itself, so "20/04/2025" is read day-first whatever regional setting the file or machine has. Depending on a setting outside the step is what caused the errors.'),
      mcq('After merging Sales with Stores on StoreID using a Left anti join, Power Query returns 3 rows. What do those 3 rows represent?', [
        ['Sales whose StoreID has no match in the Stores table', true],
        ['Stores that had no sales at all in the period loaded', false],
        ['Sales that matched more than one row of the Stores table', false],
      ], 'Left anti keeps the rows of the first table with no match in the second. These sales would appear under a blank store in every visual; they usually reveal a key that needs trimming or a store missing from the list.'),
      mcq('The Stores query filters Active = 1, removes six columns, and then adds an index column. Which statement about query folding is accurate?', [
        ['Put the filter and column removal before steps that break folding', true],
        ['Folding happens only for CSV files, so the order of steps is irrelevant', false],
        ['An index column is always folded, so it should come first in the list', false],
        ['Folding is switched off whenever a query has more than five steps', false],
      ], 'Power Query translates foldable steps into the source’s query language, up to the first step that cannot fold. Filtering and removing columns early means the database sends less data.'),
    ],
    checkpoint: [
      mcq('The monthly POS files are stored in one SharePoint folder. Which approach loads every month, including next month’s file, with no edits to the report?', [
        ['The SharePoint folder connector with Combine & Transform', true],
        ['One Text/CSV query per month, appended with Append Queries', false],
        ['A Merge of the newest file with the previous month’s file', false],
        ['Copying each new file’s rows into the first CSV by hand', false],
      ], 'The folder connector combines every file in the folder and applies the same steps to each; a new file is picked up on refresh. Separate queries per month must be added by hand every time.'),
      mcq('After adding a Changed Type step, Column quality for UnitCost in the Products query shows 92% Valid and 8% Error. What is the most likely reason?', [
        ['Some UnitCost cells still contain text such as "₹1,450"', true],
        ['UnitCost has duplicate values in eight percent of rows', false],
        ['Column quality always reports some errors on numbers', false],
      ], 'A conversion error appears when a value cannot become the target type. Text with a rupee sign or comma fails to convert; Replace Values before the type change removes the cause.'),
      mcq('A new analyst merges Products, Stores and Customers into the Sales query until it is one 25-column table, then loads only that. What is the main problem with this design?', [
        ['It throws away the star schema the model and DAX are built for', true],
        ['Merge is not allowed on a query that came from a folder source', false],
        ['Power BI cannot load a table that has more than twenty columns', false],
        ['Merged columns are deleted on every scheduled refresh', false],
      ], 'Merge is legal, but flattening everything into the fact table repeats dimension text on every row, inflates the model and makes counts and filters harder. Dimensions belong in their own tables.'),
    ],
  },

  /* ── STAR_SCHEMA ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PBI_MODEL_STAR_SCHEMA',
    notes: `Power BI's engine and DAX are designed around one shape of model: the **star schema**. Getting it
right makes measures short and numbers correct; getting it wrong makes every measure a workaround.

## Facts and dimensions

Look at a business question: *"What were sales of Grocery in the South region in May?"* It has two kinds
of words:

- **Numbers to add up** — sales. These come from events: a sale, a delivery, a payment. A table of events
  is a **fact table**. It is long (one row per event), narrow, and mostly keys and numbers.
- **Words to filter and group by** — Grocery, South, May. These describe the things involved in the
  event. A table of descriptions is a **dimension table**. It is short (one row per product, per store,
  per day) and wide (many descriptive columns).

Annapurna Mart's model:

| Table | Kind | One row per | Key | Rows here |
|---|---|---|---|---|
| Sales | Fact | Till line | SaleID; foreign keys Date, StoreID, ProductID, CustomerID | 12 |
| Products | Dimension | Product | ProductID | 5 |
| Stores | Dimension | Store | StoreID | 4 |
| Customers | Dimension | Loyalty customer | CustomerID | 4 |
| Date | Dimension | Calendar day | Date | 730 (next unit) |

Draw it with Sales in the middle and the four dimensions around it, and it looks like a star.

## Relationships

In Model view, drag Products[ProductID] onto Sales[ProductID]. Power BI creates a **relationship** and
draws a line marked **1** at Products and **\\*** at Sales: **one-to-many**. One product appears on many
sales lines; each sales line has exactly one product.

A relationship has three properties (double-click the line to see them):

| Property | Annapurna Mart value | Meaning |
|---|---|---|
| Cardinality | One-to-many (1:\\*) | ProductID is unique in Products, repeated in Sales |
| Cross filter direction | Single | Filters flow from Products to Sales, not back |
| Active | Yes | Used automatically by every measure |

**Filters flow from the "one" side to the "many" side.** That one sentence explains most of Power BI.
Put Products[Category] on the rows of a matrix and SUM(Sales[Amount]) as the value: on the Grocery row,
the filter Category = "Grocery" lands on Products (P01, P02), flows along the relationship to Sales, and
only sales of P01 and P02 are summed — **₹6,674**. Appliances gives ₹13,996, Kitchen ₹4,398, Home ₹3,995.

The same matrix with Stores[Region] added as columns:

| Category | South | West | Total |
|---|---|---|---|
| Appliances | 10,497 | 3,499 | 13,996 |
| Grocery | 4,425 | 2,249 | 6,674 |
| Home | 2,397 | 1,598 | 3,995 |
| Kitchen | 4,398 | | 4,398 |
| **Total** | **21,717** | **7,346** | **29,063** |

Two dimensions filter the fact at once, each through its own relationship. No formula mentions Region or
Category — the model does the work. (Kitchen–West is empty: Kothrud sold no cookers in Q1.)

## Why one flat table causes trouble

The tempting alternative is to merge everything into Sales — one wide table with ProductName, Category,
StoreName, City, Region and Tier on every row. It breaks in several ways:

1. **Things with no facts disappear.** Edappally (Kochi) opened in July and has no sales. In a flat
   table it does not exist, so "number of stores" is 3, not 4, and a store list cannot show Kochi with
   ₹0. In the star, Stores has 4 rows and COUNTROWS(Stores) is 4.
2. **A second fact table has nowhere to join.** Annapurna's monthly **Targets** by store come from
   finance. In a star, Targets connects to the same Stores and Date dimensions, and one Region slicer
   filters actual and target together. With two flat tables, you need two slicers that do not talk.
3. **Size and speed.** The engine compresses columns; repeating "Mixer Grinder 750W" on every row of a
   crore-row fact costs memory that a 5-row Products table does not.
4. **DAX gets harder.** Share-of-category, ranking products and "customers who bought" all assume a
   dimension table to iterate or remove filters from.

## Cardinality, and the many-to-many surprise

| Cardinality | When | Annapurna example |
|---|---|---|
| One-to-many | Dimension key unique, repeated in fact | Products → Sales |
| One-to-one | Both sides unique | Stores → StoreDetails (usually: merge them instead) |
| Many-to-many | Neither side unique | Targets by **Region** related directly to Stores[Region] |

Many-to-many is legal but usually a sign a dimension is missing. Finance sets targets per region (South
₹60,000, West ₹25,000 a quarter), and Region repeats in Stores. Relate Targets[Region] to
Stores[Region] and Power BI offers many-to-many — then totals and filters need careful thought. The clean
fix is a tiny **Region** dimension (South, West) with one-to-many relationships to both Stores and
Targets. Rule: if a relationship wants to be many-to-many, look for the dimension you have not built.

A one-to-many that you expected can also turn into many-to-many by accident: if the Customers export
contains C104 twice, CustomerID is no longer unique, and Power BI will refuse one-to-many or create
many-to-many. Duplicates in a dimension key are a data problem; fix them in Power Query.

## Filter direction: Single, and when Both

**Single** (dimension filters fact) is the default and almost always right. **Both** lets the fact filter
the dimension too. A typical request: a Products slicer should list only products sold in the selected
store. Setting Products–Sales to Both does that, but:

- With several dimensions set to Both, there can be more than one filter path between two tables;
  Power BI refuses relationships that would make the model ambiguous, and the ones it accepts can filter
  in ways nobody expects.
- Bidirectional filters cost performance on large models.
- They interact with row-level security in ways that need explicit settings.

Prefer Single, and solve the slicer case another way (a visual-level filter on the slicer, such as
"Total Sales is not blank"), or switch direction inside one measure with CROSSFILTER.

## Active and inactive relationships

Sales has an order Date and, for home deliveries, a DeliveryDate. Both relate to the one Date table, but
only **one** relationship between two tables can be **active** (solid line); the second is **inactive**
(dashed). Measures use the active one; a measure can use the inactive one with
CALCULATE(..., USERELATIONSHIP(Sales[DeliveryDate], 'Date'[Date])). One Date table playing two roles is
called a **role-playing dimension**.

## Model hygiene

- Hide the foreign-key columns in Sales (StoreID, ProductID…) so report builders use the dimension
  columns instead.
- Set **Sort by column** where needed — Month name sorted by month number.
- Summarise numbers with measures, not by dragging raw fact columns (the DAX topic).
- Name tables as business nouns: Sales, Products — not "Query1" or "sales_2025_04 (2)".

A **snowflake** — Products related to a separate Categories table, related to a Departments table — works,
but each extra hop is one more relationship to maintain. For an analyst's model, flatten small chains
into the dimension in Power Query (merge Category into Products); that is the one merge that belongs.`,
    mcqs: [
      mcq('In Annapurna Mart’s model, a matrix has Products[Category] on rows and SUM(Sales[Amount]) as values. Why does the Grocery row show only ₹6,674 when no formula mentions Grocery?', [
        ['The row’s filter on Products flows to Sales through the relationship', true],
        ['Power BI copied Category into Sales during the last data refresh', false],
        ['The matrix recalculates SUM using a hidden calculated column per row', false],
        ['Sales is filtered by Category because both tables have a Grocery row', false],
      ], 'Each matrix row filters Products to one category; the one-to-many relationship carries that filter to the Sales rows with matching ProductID, and SUM adds only those.'),
      mcq('Finance sets quarterly targets per region, and the analyst relates Targets[Region] directly to Stores[Region]. Power BI offers only a many-to-many relationship. What is the cleaner design?', [
        ['A small Region dimension related one-to-many to Stores and Targets', true],
        ['Setting the relationship’s cross filter direction to Both', false],
        ['Merging Targets into the Sales table so both share one table', false],
        ['Removing duplicates from Stores until each region appears once', false],
      ], 'Region repeats in both tables, so neither side is unique. A Region dimension with one row per region gives each table a one-to-many relationship and lets one slicer filter both.'),
      mcq('Edappally (Kochi) opened in July and has no sales in the Q1 extract. In a single flat sales table, how many stores can a distinct count of store names find?', [
        ['3, because a store with no sales has no row in the table', true],
        ['4, because the flat table keeps every store from the list', false],
        ['5, because the blank store is counted as an extra value', false],
      ], 'A flat fact table only knows stores that appear on a sale. A separate Stores dimension keeps all 4, which is one reason the star schema is preferred.'),
    ],
    checkpoint: [
      mcq('A matrix shows Category on rows and Region on columns with Sum of Amount. Kitchen has 4,398 under South and an empty cell under West. What does the empty cell tell you?', [
        ['No Kitchen product was sold in a West store in the period', true],
        ['The relationship between Stores and Sales is inactive for West', false],
        ['Kitchen sales in West were negative and have been hidden', false],
        ['The West region is missing from the Stores dimension table', false],
      ], 'An empty cell means the combination of filters selects no Sales rows. West had sales of other categories, so the relationship works; Kothrud simply sold no pressure cookers.'),
      mcq('Sales has an order Date and a DeliveryDate, both related to the same Date table. One relationship line is solid, the other dashed. What does the dashed line mean?', [
        ['It is inactive; a measure must call USERELATIONSHIP to use it', true],
        ['It filters in both directions between Sales and the Date table', false],
        ['It is many-to-many, because both date columns repeat values', false],
      ], 'Only one relationship between two tables can be active. The inactive one is ignored unless a measure turns it on with USERELATIONSHIP inside CALCULATE.'),
      mcq('Someone sets every relationship in the Annapurna model to cross filter direction Both, so slicers list only relevant items. Which risk does that create?', [
        ['Ambiguous filter paths and slower, less predictable results', true],
        ['Relationships set to Both are deleted on the next refresh', false],
        ['Measures can no longer use SUM on any column of the Sales table', false],
        ['Single-direction slicers stop filtering the fact table at all', false],
      ], 'Bidirectional filters let facts filter dimensions, which can create more than one path between tables and hurt performance. Single direction plus targeted fixes is the recommended default.'),
    ],
  },

  /* ── DATE_TABLE ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PBI_MODEL_DATE_TABLE',
    notes: `Every business question has a time in it: this month, last year, year to date, the festive quarter.
Power BI answers them well only when the model has a proper **date table** — a dimension with one row
per calendar day — and it is the one table you build yourself rather than load.

## Why not just use Sales[Date]?

Sales[Date] has a row only for days on which something was sold. Annapurna's 12 Q1 sales fall on 12
different days; the other 79 days of April–June do not exist in that column. Three things go wrong:

1. **Gaps.** "Sales on 1 April" cannot be shown as zero if 1 April is not anywhere in the model.
2. **No attributes.** Indian companies report by **fiscal year** (April to March). Sales[Date] has no
   FiscalYear, FiscalQuarter or "Month Year" column, and adding them to a crore-row fact is waste.
3. **Time intelligence needs it.** DAX functions such as TOTALYTD, SAMEPERIODLASTYEAR and DATEADD (next
   topic) work by building sets of dates — "all days from 1 April to this day", "the same days a year
   earlier" — from a **complete, contiguous** date column. A column with gaps gives wrong or blank results.

Power BI's **Auto date/time** option hides a small date table behind every date column and gives you the
Year > Quarter > Month > Day hierarchy you saw in the first unit. It is fine for a quick look, but it
knows only calendar years, adds a hidden table per date column, and cannot be shared across two fact
tables. In a real model, build one date table and turn Auto date/time off (File > Options and settings >
Options > Current file > Data Load > Time intelligence).

## Building it with DAX

Modeling > **New table**, and:

    Date =
    ADDCOLUMNS (
        CALENDAR ( DATE ( 2024, 4, 1 ), DATE ( 2026, 3, 31 ) ),
        "Year", YEAR ( [Date] ),
        "Month No", MONTH ( [Date] ),
        "Month", FORMAT ( [Date], "MMM" ),
        "Month Year", FORMAT ( [Date], "MMM YYYY" ),
        "Fiscal Year",
            "FY " & ( YEAR ( [Date] ) - IF ( MONTH ( [Date] ) < 4, 1, 0 ) ) & "-"
                & RIGHT ( YEAR ( [Date] ) + IF ( MONTH ( [Date] ) >= 4, 1, 0 ), 2 ),
        "Fiscal Month No", IF ( MONTH ( [Date] ) >= 4, MONTH ( [Date] ) - 3, MONTH ( [Date] ) + 9 ),
        "Fiscal Quarter", "Q" & ROUNDUP ( IF ( MONTH ( [Date] ) >= 4, MONTH ( [Date] ) - 3, MONTH ( [Date] ) + 9 ) / 3, 0 ),
        "Weekday", FORMAT ( [Date], "ddd" ),
        "Is Weekend", WEEKDAY ( [Date], 2 ) > 5
    )

CALENDAR returns a one-column table of every date between the two arguments, inclusive. From 1 April
2024 to 31 March 2026 that is **730 rows** — two complete fiscal years, FY 2024-25 and FY 2025-26.

Check the fiscal columns by hand on three dates:

| Date | Fiscal Year | Fiscal Month No | Fiscal Quarter |
|---|---|---|---|
| 03-Apr-2025 | FY 2025-26 (2025 − 0, then 2026 → "26") | 1 | Q1 |
| 27-Jun-2025 | FY 2025-26 | 3 | Q1 |
| 15-Jan-2026 | FY 2025-26 (2026 − 1 = 2025, then 2026 → "26") | 10 | Q4 |

Alternatives that are just as good: **CALENDARAUTO(3)** builds whole fiscal years ending in March from
the earliest to the latest date anywhere in the model (watch out — a stray birth date in 1965 stretches
it); or build the table in **Power Query** with List.Dates, which suits teams that keep all shaping in
one place. What matters is the result, not the tool.

## The rules a date table must follow

1. **One row per day, no gaps, no duplicates, no blanks.**
2. **Whole years** — start on the first day of a (fiscal) year and end on the last day, covering every
   date in the facts. Year-to-date and last-year measures need the full range.
3. **A column of Date data type** with no time part (or the same time on every row).
4. **Mark as date table:** select the table, Table tools > **Mark as date table**, choose the Date
   column. Power BI validates rules 1 and 3 and refuses if they fail. Marking is required when the
   relationship to the fact uses something other than a Date-type column (for example an integer
   DateKey such as 20250403) and is good practice always.

## Connecting it

In Model view, relate 'Date'[Date] (one) to Sales[Date] (many), single direction. From now on, every
time-based visual uses the Date table's columns, never Sales[Date]. Hide Sales[Date] so nobody picks it by
mistake.

## Sorting the month names

Put 'Date'[Month] on an axis and the months appear alphabetically: Apr, Aug, Dec, Feb… Select the Month
column, Column tools > **Sort by column** > Fiscal Month No. Now April is first and March last, which is
what an Indian finance team expects. Do the same for "Month Year" (sort by a column such as
YEAR × 100 + MONTH, 202504) and "Weekday".

## What it gives you, shown on Annapurna's data

With the Date table related and marked:

| Fiscal Year | Fiscal Quarter | Month | Total |
|---|---|---|---|
| FY 2025-26 | Q1 | Apr | 8,026 |
| | | May | 8,744 |
| | | Jun | 12,293 |
| | Q1 total | | 29,063 |

And a line chart of daily sales on 'Date'[Date] can show the days with no sales as gaps or zeros
instead of skipping them. The next topic's time-intelligence measures — FYTD, same period last year,
month-over-month — all depend on this table.

## A practical warning: future dates

The table runs to 31 March 2026, but the data ends in June (or, in the full model, September) 2025.
Visuals that list months show Oct–Mar with blank sales, and a year-to-date measure will repeat the
September total for every later month. The DAX topic shows the fix (hide dates after the last sale).
Some teams also add an "Is Past" column — 'Date'[Date] <= the last sales date — to filter visuals.`,
    workedExample: `**Goal: give Annapurna Mart's model a date table that reports by Indian fiscal year, and prove it is
correct before anyone builds a measure on it.**

**1. Decide the range.** The facts start on 3 April 2025 and the full extract will run to the end of
the financial year. Last year's figures (FY 2024-25) are also needed for comparisons. So: 1 April 2024
to 31 March 2026 — two complete fiscal years.

**2. Create it.** Modeling > New table, paste the ADDCOLUMNS(CALENDAR(...)) definition from the notes.

**3. Check the row count.** A card with COUNTROWS('Date') shows **730**. Expected: 365 days from April
2024 to March 2025 (February 2025 has 28 days) plus 365 from April 2025 to March 2026 = 730. If it
showed 731, the range would include a 29 February — check the start and end dates.

**4. Check uniqueness and gaps.** Two cards: DISTINCTCOUNT('Date'[Date]) = 730 (no duplicates) and
INT(MAX('Date'[Date]) − MIN('Date'[Date])) + 1 = 730 (no gaps: the span in days equals the row count).

**5. Spot-check the fiscal columns.** Filter the table view to 31-Mar-2025 and 01-Apr-2025:

| Date | Fiscal Year | Fiscal Month No | Fiscal Quarter |
|---|---|---|---|
| 31-Mar-2025 | FY 2024-25 | 12 | Q4 |
| 01-Apr-2025 | FY 2025-26 | 1 | Q1 |

The year boundary falls between them, as it should.

**6. Mark and relate.** Table tools > Mark as date table > Date column: accepted. Model view: drag
'Date'[Date] onto Sales[Date]; Power BI proposes one-to-many, single direction. Hide Sales[Date].

**7. Sort.** Month sorted by Fiscal Month No; Month Year sorted by a YearMonth column.

**8. Reconcile.** A matrix with 'Date'[Fiscal Year] and 'Date'[Month] on rows and Sum of Amount shows
FY 2025-26: Apr 8,026, May 8,744, Jun 12,293, total 29,063 — the same as before the date table existed.
Adding a dimension must never change a total; if it does, some fact dates fall outside the table's range
and appear under a blank row.`,
    mcqs: [
      mcq("A date table is built with CALENDAR(DATE(2024,4,1), DATE(2026,3,31)). How many rows does it have?", [
        ['730', true],
        ['731', false],
        ['729', false],
        ['24', false],
      ], 'CALENDAR includes both ends. April 2024 to March 2025 is 365 days because February 2025 is not a leap month, and April 2025 to March 2026 is another 365, so 730 rows.'),
      mcq('Month names from the date table appear on a chart axis as Apr, Aug, Dec, Feb… Annapurna’s finance team wants April first and March last. What is the fix?', [
        ['Sort the Month column by the Fiscal Month No column', true],
        ['Rename the months with a number prefix such as 01-Apr', false],
        ['Mark the date table again with Month as its date column', false],
        ['Change the Month column’s data type to Date in Power Query', false],
      ], 'Sort by column tells Power BI to order one column by the values of another. Sorting Month by a fiscal month number puts April at 1 and March at 12.'),
      mcq("Power BI refuses to mark Annapurna's date table. Which defect would cause that?", [
        ['The Date column skips a few days between two dates', true],
        ['The table has a Fiscal Year text column alongside Date', false],
        ['The table begins on 1 April rather than on 1 January', false],
        ['The table is related to the Sales fact in one direction', false],
      ], 'A date table must have unique, non-blank, contiguous dates. Extra text columns, a fiscal start date and a single-direction relationship are all normal.'),
    ],
    checkpoint: [
      mcq("Using the date table's formulas, what are the Fiscal Year and Fiscal Quarter for 15-Jan-2026?", [
        ['FY 2025-26, Q4', true],
        ['FY 2026-27, Q1', false],
        ['FY 2025-26, Q1', false],
        ['FY 2026-27, Q4', false],
      ], 'January is before April, so the fiscal year started in April 2025: FY 2025-26. Fiscal month is 1 + 9 = 10, which is in the fourth quarter.'),
      mcq("After a date table is related to Sales, a matrix's FY 2025-26 total is ₹1,850 lower than before, and a (Blank) row shows ₹1,850. What is the likely cause?", [
        ['Some sales dates fall outside the date table’s range', true],
        ['The date table should be related to Sales in both directions', false],
        ['Auto date/time is still on, so Power BI counts some sales twice', false],
        ['Fiscal Year is text, so its subtotals cannot add up correctly', false],
      ], 'A fact row whose key has no match in the dimension goes to a blank row. Extending the date table to cover every fact date brings the ₹1,850 back under its fiscal year.'),
      mcq('The Sales fact relates to the date table through an integer DateKey such as 20250403, not a Date column. What must be done for time intelligence to work?', [
        ['Mark the table as a date table, choosing its Date column', true],
        ['Turn on Auto date/time so Power BI builds its own calendar', false],
        ['Convert DateKey to text so it matches the date’s format', false],
      ], 'When the relationship uses a non-date key, time-intelligence functions need the table marked as a date table so they know which column holds the dates.'),
    ],
  },

  /* ── DEBUGGING ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PBI_MODEL_DEBUGGING',
    notes: `Model problems rarely raise an error. The report loads, the visuals draw, and a number is wrong — or a
slicer quietly does nothing. Debug from **symptom → cause → fix**, and keep three checks to hand:

- **Reconcile to a total you trust.** A card with COUNTROWS(Sales) and SUM(Sales[Amount]) next to the
  source system's own figures (12 rows, ₹29,063 for Annapurna's Q1).
- **Look for (Blank).** A "(Blank)" row in a dimension visual means fact rows whose key matches nothing.
- **Open Model view.** Most problems are visible as a missing, dashed or double-arrowed line.

## 1. A "(Blank)" store with ₹2,199 on it

- **Symptom:** a store chart shows Kukatpally, Kothrud, T Nagar and a bar labelled (Blank) worth ₹2,199.
- **Cause:** sale 9 arrived as StoreID " s1 " — space and lower case — so it matches no row in Stores.
  Power BI puts unmatched fact rows on a blank member of the dimension.
- **Fix:** Trim and Uppercase StoreID in Power Query; add a Left anti merge as a standing audit query.
  Kukatpally rises from ₹5,827 to ₹8,026 and the blank bar disappears.

## 2. A slicer that filters nothing

- **Symptom:** a Region slicer on the page changes nothing; every visual shows ₹29,063 whatever is picked.
- **Cause:** Stores is not related to Sales at all (the auto-detected relationship was deleted, or never
  made because the column was named "Store Code" in one table and StoreID in the other). With no path,
  a filter on Stores cannot reach Sales.
- **Fix:** create the one-to-many relationship Stores[StoreID] → Sales[StoreID] in Model view. Also check
  the slicer's **Edit interactions** settings (Format > Edit interactions) — a visual set to "None" for
  that slicer ignores it by design.

## 3. Totals that are too big after adding customers

- **Symptom:** after relating Customers, sales by Tier add up to more than ₹29,063, and Power BI created
  the Customers–Sales relationship as **many-to-many**.
- **Cause:** the CRM export has C104 twice (once as Gold, once as Silver after an upgrade). CustomerID is
  not unique, so one-to-many was impossible, and C104's ₹9,478 can appear under both tiers.
- **Fix:** remove duplicates in Power Query on CustomerID, keeping the current row (sort by an
  UpdatedOn column first, then Remove Duplicates). Recreate the relationship as one-to-many.

## 4. The product slicer lists products the store never sold

- **Symptom:** with T Nagar selected, the Product slicer still lists all five products, including
  Sunflower Oil, which T Nagar never sold.
- **Cause:** correct behaviour. Filters flow from Stores to Sales, not from Sales back to Products, so
  the Products slicer is not filtered by the store.
- **Fix:** do not switch the relationship to Both by reflex. Add a visual-level filter to the slicer:
  Total Sales is not blank. Use a bidirectional relationship only after checking for ambiguous paths.

## 5. Sales in the wrong month, and some dates as errors

- **Symptom:** April shows more than ₹8,026, June less than ₹12,293, and Column quality on Date shows
  some Error values — always for days after the 12th.
- **Cause:** the Date column was converted with a plain Change Type in a file whose locale is English
  (United States), so "04/06/2025" was read month-first as 6 April, and "19/06/2025" failed because there
  is no 19th month.
- **Fix:** Change Type > Using Locale > Date, English (India) in the Sales query, so the culture is part
  of the step and does not depend on any file or machine setting.

## 6. The refresh fails with "column 'Qty' of the table wasn't found"

- **Symptom:** scheduled refresh fails overnight; the error names a column.
- **Cause:** the POS vendor renamed Qty to Quantity in the new month's file. A Changed Type step still
  refers to Qty.
- **Fix:** rename Quantity back to Qty as the first step after combining (or fix the source); then the
  later steps work for old and new files. Check the sample file in the folder's helper queries.

## 7. Time-based visuals that skip days or ignore the fiscal year

- **Symptom:** a daily sales line has no zero days; a "Year" axis shows 2025 rather than FY 2025-26.
- **Cause:** the visual uses Sales[Date] (with Auto date/time's calendar hierarchy), not the Date table.
- **Fix:** use 'Date'[Date] and the fiscal columns from the Date table, hide Sales[Date], and turn
  Auto date/time off for the file.

## 8. A model that doubled in size after one change

- **Symptom:** the .pbix grew from 40 MB to 95 MB and refresh takes twice as long.
- **Cause:** someone merged Products and Stores into Sales "for convenience", adding long text columns
  to every fact row; or Auto date/time added hidden tables for six date columns.
- **Fix:** keep dimensions as separate tables related by keys; remove columns nobody uses; turn off
  Auto date/time once a proper Date table exists.

## The order to check things

1. Do the row count and total match the source? (Reconcile.)
2. Is there a (Blank) member anywhere? (Keys that do not match.)
3. In Model view: is every dimension related, one-to-many, single direction, active?
4. Are time visuals using the Date table?`,
    mcqs: [
      mcq('A store chart shows a bar labelled (Blank) worth ₹2,199, and the source sale has StoreID " s1 ". What is the cause?', [
        ['The key does not match any StoreID, so it lands on a blank member', true],
        ['Kukatpally was marked inactive, so its sale is hidden as a blank', false],
        ['The relationship between Stores and Sales is set to filter Both', false],
        ['Power BI cannot draw a chart bar when the amount is below ₹5,000', false],
      ], 'Fact rows whose key matches no dimension row are grouped under a blank member. Trimming and uppercasing the key in Power Query makes " s1 " match S1.'),
      mcq('A Region slicer changes nothing on the page; every visual stays at ₹29,063. Model view shows no line between Stores and Sales. What fixes it?', [
        ['Create the one-to-many relationship from Stores[StoreID] to Sales[StoreID]', true],
        ['Change the slicer to a dropdown so it sends its filter to the other visuals', false],
        ['Convert Region to a measure so it can be evaluated in each visual', false],
      ], 'A filter on a dimension reaches the fact only through a relationship. Without one, the slicer filters the Stores table and nothing else.'),
      mcq('After relating Customers to Sales, Power BI made the relationship many-to-many, and sales by tier add up to more than the total. What is the most likely cause?', [
        ['A CustomerID appears twice in the Customers table', true],
        ['Sales contains customers who bought more than once', false],
        ['The Tier column contains a blank for one customer', false],
        ['Customers was loaded after Sales in Power Query', false],
      ], 'A dimension key must be unique for one-to-many. A duplicated customer (for example one row per tier change) breaks that, and its sales can appear under both tiers.'),
      mcq('With T Nagar picked in a store slicer, the Product slicer still lists Sunflower Oil, which T Nagar never sold. Which response is the recommended first step?', [
        ['Filter the slicer visual to products where sales are not blank', true],
        ['Set every relationship in the model to cross filter in both directions', false],
        ['Delete Sunflower Oil from Products so the slicer cannot list it', false],
        ['Merge Products into Sales so the slicer reads from the fact table', false],
      ], 'Filters flow from dimensions to the fact, so Products is not filtered by a store. A visual-level filter on the slicer fixes the list without making the model bidirectional.'),
    ],
  },

  /* ── PRACTICE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PBI_MODEL_PRACTICE',
    notes: `Six exercises on modelling decisions. Answer each on paper first, then check against the answers at
the end. Where an exercise gives data, it is all you need.

## Exercise 1 — Facts or dimensions?

A food-delivery company, ThaliGo, sends you these tables. Classify each as fact or dimension, name its
grain (one row per what), and draw the relationships.

| Table | Columns |
|---|---|
| Orders | OrderID, OrderDateTime, RestaurantID, CustomerID, RiderID, ItemsTotal, DeliveryFee, Discount |
| Restaurants | RestaurantID, Name, Cuisine, City, Zone, OnboardedOn |
| Riders | RiderID, Name, VehicleType, JoinedOn |
| Customers | CustomerID, City, SignupDate, IsPlusMember |
| Ratings | OrderID, FoodRating, DeliveryRating, RatedOn |

## Exercise 2 — Power Query steps

A bank branch exports loan applications as CSV:

    AppID,Applied,Branch Code,Amount
    L01,02/09/2025, vjw01 ,"25,00,000"
    L02,04/09/2025,VJW01,"3,00,000"
    L03,14/09/2025,vjw02 ,"8,50,000"

Branches is a clean table with codes VJW01 and VJW02. List the Power Query steps, in order, so that
Applied is a correct date, Branch Code matches Branches, and Amount can be summed. Then say how you would
prove every application matched a branch.

## Exercise 3 — How many rows?

You need a date table for a company whose fiscal year runs April–March, covering FY 2023-24 and
FY 2024-25. (a) What start and end dates? (b) How many rows? (c) What does Fiscal Month No return for
29-Feb-2024?

## Exercise 4 — Flat or star?

A colleague's model is one table: every Annapurna Mart sale with StoreName, City, Region, ProductName,
Category and Tier on each row. The manager now asks for (a) the number of stores in the South, including
Edappally (Kochi), which has no sales yet, and (b) actual versus monthly target per store, where targets
arrive as a separate file of StoreID, Month, Target. Explain what the flat table cannot do and sketch the
model that can.

## Exercise 5 — Cardinality and direction

For each proposed relationship, state the cardinality Power BI should use, or what is wrong:

1. Products[ProductID] (5 unique) → Sales[ProductID] (12 rows).
2. Customers[CustomerID] (C101, C102, C103, C104, C104) → Sales[CustomerID].
3. Targets[Region] (South, West, each repeated per quarter) → Stores[Region] (South, West, South, South).
4. 'Date'[Date] → Sales[DeliveryDate], when 'Date'[Date] → Sales[Date] already exists.

## Exercise 6 — Reconcile

After building Annapurna's star, a matrix of Region shows South ₹19,518, West ₹7,346, (Blank) ₹2,199;
total ₹29,063. The source system says South ₹21,717. Explain the gap, the likely key, and the fix.

## Answers

**1.** Orders: fact, one row per order, with foreign keys RestaurantID, CustomerID, RiderID and a date
(relate a Date table to the date part of OrderDateTime — add an OrderDate column in Power Query).
Restaurants, Riders, Customers: dimensions, one row per restaurant, rider, customer, each one-to-many to
Orders. Ratings: a fact at order grain (one row per rated order); relate it through OrderID to Orders, or
better, merge the ratings into Orders in Power Query since they share a grain, so restaurant and rider
filters reach them through the dimensions.

**2.** (1) Use First Row as Headers. (2) Trim and Uppercase Branch Code. (3) Change Type Using Locale,
Date, English (India), on Applied, so 14/09/2025 is 14 September. (4) Replace "," with nothing in Amount,
then Change Type to Whole number or Fixed decimal (L01 = 25,00,000 = 2500000). Proof: Merge with
Branches on Branch Code, Left anti — 0 rows means every application matched. Before step 2, the same
merge returns two rows — L01 (" vjw01 ") and L03 ("vjw02 ") — because "VJW01" already matches exactly.

**3.** (a) 1-Apr-2023 to 31-Mar-2025. (b) FY 2023-24 contains 29 Feb 2024, so 366 days; FY 2024-25 has
365; total **731**. (c) February is month 2, before April, so 2 + 9 = **11**.

**4.** (a) The flat table has no row for Edappally, so a distinct count of stores in the South gives 2,
not 3. (b) Targets are at Store × Month grain; they cannot sit on sales rows without repeating the target
on every sale. The model that works: Stores, Products, Customers and Date dimensions; Sales and Targets
as two facts. Stores → Sales and Stores → Targets on StoreID; Date → Sales on Date and Date → Targets on
a month-start date. One Region slicer then filters actual and target together, and COUNTROWS(Stores)
filtered to South gives 3.

**5.** (1) One-to-many, single direction. (2) Wrong — C104 is duplicated, so the key is not unique; fix the
duplicate in Power Query and the relationship becomes one-to-many. (3) Many-to-many — build a Region
dimension (South, West) related one-to-many to both. (4) One-to-many, but **inactive**, because only one
relationship between Date and Sales can be active; use it in measures with USERELATIONSHIP.

**6.** ₹21,717 − ₹19,518 = ₹2,199, exactly the (Blank) amount, so one South sale's StoreID does not match
any store. In Annapurna's data the ₹2,199 sales are sale 3 (T Nagar) and sale 9 (Kukatpally); a stray
space or lower-case code on one of them is the usual cause. Find it with a Left anti merge of Sales and
Stores, fix it with Trim and Uppercase, and keep the audit query.`,
    mcqs: [
      mcq('ThaliGo’s Orders table has one row per order with RestaurantID, CustomerID and RiderID. How should it relate to the Restaurants table?', [
        ['Restaurants one-to-many to Orders, filtering Orders', true],
        ['Orders one-to-many to Restaurants, filtering Restaurants', false],
        ['One-to-one, since every order has exactly one restaurant', false],
        ['Many-to-many, since restaurants and orders both repeat', false],
      ], 'Each restaurant appears once in Restaurants and many times in Orders, so the one side is Restaurants and filters flow from it to the order rows.'),
      mcq('A date table must cover FY 2023-24 and FY 2024-25 (April to March). How many rows does it need?', [
        ['731', true],
        ['730', false],
        ['732', false],
        ['729', false],
      ], 'FY 2023-24 contains 29 February 2024, so it has 366 days; FY 2024-25 has 365. 366 + 365 = 731.'),
      mcq('In Power Query, a branch export has codes " vjw01 ", "VJW01" and "vjw02 ". Branches lists VJW01 and VJW02. Before cleaning, how many of the three rows would a Left anti merge against Branches return?', [
        ['2', true],
        ['3', false],
        ['1', false],
        ['0', false],
      ], 'Merges match exactly. "VJW01" matches already; " vjw01 " and "vjw02 " differ by spaces and case, so those two rows have no match until Trim and Uppercase are applied.'),
      mcq('A Region matrix shows South ₹19,518, West ₹7,346 and (Blank) ₹2,199. The source says South is ₹21,717. What does the gap show?', [
        ['One South sale worth ₹2,199 has a StoreID that matches no store', true],
        ['South targets of ₹2,199 have been subtracted from actual sales', false],
        ['The matrix total double-counts one West sale worth ₹2,199', false],
      ], 'The missing South amount equals the (Blank) amount exactly, which points to one fact row whose store key does not match the Stores table.'),
      mcq('Sales already has an active relationship from the date table on Sales[Date]. The analyst adds a second one to Sales[DeliveryDate]. What state will the new relationship be in?', [
        ['Inactive, usable inside a measure through USERELATIONSHIP', true],
        ['Active, replacing the order-date relationship from that point', false],
        ['Rejected, since one table cannot be related twice to another', false],
        ['Active in both, so each visual chooses the date that it needs', false],
      ], 'Two tables can have several relationships, but only one can be active. The second is created inactive and is used by naming it in USERELATIONSHIP inside CALCULATE.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ───────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PBI_MODEL_INTERVIEW_QUESTION',
    notes: `Power BI interviews for analyst roles start with modelling, because a candidate who models well
writes simple DAX and one who does not writes heroic DAX. Answer each question aloud in about two
minutes, and use a concrete example — Annapurna Mart's model is a good one to keep in your head.

## Q1. "What is a star schema, and why does Power BI want one?"

**Model answer.** "A star schema has one or more fact tables — events with numbers, like sales lines —
surrounded by dimension tables that describe them: product, store, customer, date. Each dimension has a
unique key and relates one-to-many to the fact, with filters flowing from the dimension to the fact. Power
BI's engine compresses columns and is designed to filter facts through dimensions, so a star is both
faster and simpler to write DAX for. In a retail model I built, a matrix of Category by Region just works
because each dimension filters the Sales table through its relationship — Grocery in the South is
₹4,425 without any formula mentioning either. A flat table loses things that have no facts, such as a new
store with no sales, and a second fact like monthly targets has nothing shared to join to."

**Follow-ups:**
- *"When would you snowflake?"* — Rarely in Power BI; I flatten small chains such as Category into
  Products in Power Query. I keep a separate table only if it is shared by two facts or very large.
- *"What about two fact tables?"* — Each relates to the shared dimensions; one Store or Date slicer then
  filters both. I do not relate facts to each other directly.

## Q2. "When would you use a bidirectional relationship? What's the risk?"

**Model answer.** "Almost never by default. Single direction from dimension to fact is the standard. Both
directions make the fact filter the dimension — for example to make a product slicer show only products
sold in the selected store. The risks are ambiguous filter paths when several relationships are
bidirectional, slower queries, and surprises with row-level security. I solve the slicer case with a
visual-level filter, 'sales is not blank', and if a single measure needs the reverse direction I use
CROSSFILTER inside CALCULATE for that measure only. The one common legitimate use is a bridge table in a
genuine many-to-many design, such as customers with several bank accounts."

**Follow-ups:**
- *"What is many-to-many cardinality for?"* — Relating tables at different grains, such as targets by
  region to stores. I usually add the missing dimension instead — a Region table — and keep everything
  one-to-many.
- *"How would you notice a bad relationship?"* — Totals that do not reconcile, a (Blank) member, or a
  relationship Power BI made many-to-many when I expected one-to-many — which usually means a duplicate
  key in the dimension.

## Q3. "Import or DirectQuery — how do you decide? And why do you need a date table?"

**Model answer.** "I start with Import: it is fastest and supports all of DAX and Power Query. I move to
DirectQuery only if the data is too large to import or must be near real-time, accepting slower visuals
and more load on the source. Composite models let me mix the two, for example a huge fact in
DirectQuery with small dimensions imported. For dates, I always build a date table — one row per day,
contiguous, covering whole years, marked as a date table and related to the fact's date. It gives the
business's own calendar, like an April–March fiscal year, and time-intelligence functions like YTD and
same-period-last-year need a complete date column to work correctly. I turn Auto date/time off."

**Follow-ups:**
- *"Two date columns on the fact?"* — One active relationship (order date), one inactive (delivery
  date), and USERELATIONSHIP in the measures that need the second.
- *"Where do you build the date table, DAX or Power Query?"* — Either; I keep it wherever the team keeps
  its shaping, and I check row count, uniqueness and the fiscal boundaries before using it.

## How you are judged

The interviewer is listening for the direction of filters, the grain of each table, and what you check
— reconciling totals, looking for blank members. Naming those unprompted is what signals you have built
a model rather than followed a tutorial.`,
    mcqs: [
      mcq('An interviewer asks why you avoid making every relationship bidirectional. Which answer is accurate?', [
        ['It can create ambiguous filter paths and slows large models', true],
        ['Bidirectional relationships are allowed only in DirectQuery mode', false],
        ['Power BI deletes bidirectional relationships when it publishes', false],
      ], 'Both-direction filters are supported but can create more than one path between tables, cost performance, and interact with row-level security. Single direction is the default for good reason.'),
      mcq('You are asked how you would handle a sales fact with both an order date and a ship date. What is the standard answer?', [
        ['One date table: an active and an inactive relationship, with USERELATIONSHIP', true],
        ['Two separate date tables each marked as the model’s only date table', false],
        ['Merge both dates into one text column and relate the date table to it', false],
        ['Make both relationships active so each visual can pick the right one', false],
      ], 'Only one relationship between two tables can be active. The usual pattern is one Date table with the second relationship inactive, switched on per measure with USERELATIONSHIP.'),
      mcq('An interviewer asks what you check first after building a model from three sources. Which answer shows the right habit?', [
        ['Row counts and totals against the source, and any (Blank) members', true],
        ['The colour theme, so visuals look consistent from the start', false],
        ['That every relationship is set to many-to-many for flexibility', false],
        ['That Auto date/time is on so every date gets its own hierarchy', false],
      ], 'Reconciling to source totals and looking for blank members catches unmatched keys and duplicates before any measure is built on a wrong model.'),
    ],
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PBI_MODEL_CHECKPOINT',
    notes: `Ten questions on Power Query and the data model: reading a model and predicting what a visual will
show, choosing the right shaping step, and diagnosing a model that gives a wrong number or a slicer that
does nothing. Most use Annapurna Mart's Sales, Products, Stores, Customers and Date tables, whose totals
are ₹29,063 over 12 sales (Chennai ₹13,691, Hyderabad ₹8,026, Pune ₹7,346).`,
    checkpoint: [
      mcq('A matrix has Stores[City] on rows and Sum of Amount. A Products[Category] slicer is set to Appliances. Using Annapurna’s data, what does the Chennai row show?', [
        ['6,998', true],
        ['13,691', false],
        ['3,499', false],
        ['13,996', false],
      ], 'Both filters reach Sales through their relationships: Chennai (T Nagar) and Appliances leaves only sale 12, two mixer grinders at ₹3,499, so ₹6,998.'),
      mcq('In Power Query, Merge Sales with Stores on StoreID using an Inner join and load the result as the fact. What is lost?', [
        ['Sales whose StoreID matches no store are dropped silently', true],
        ['Stores with no sales are kept as rows with a blank amount', false],
        ['Every sale is duplicated once for each store in its region', false],
      ], 'An inner join keeps only matching rows, so sales with a bad store key vanish and the total falls with no warning. A left anti merge would have shown them for fixing.'),
      mcq("A model has Customers related one-to-many to Sales. A card shows COUNTROWS(Customers) and a Stores[City] slicer is set to Pune. The card still shows 4. Why?", [
        ['Filters on Stores reach Sales but not Customers in single direction', true],
        ['COUNTROWS ignores every slicer by design and counts the full table', false],
        ['Pune customers are counted as 4 because each bought once there', false],
        ['The Stores and Customers tables are related many-to-many', false],
      ], 'The Pune filter flows Stores → Sales. Customers is on the one side of its own relationship, so it is not filtered by Sales unless the relationship is bidirectional or a measure asks for it.'),
      mcq('The CRM export of customers has a Tier column that is blank for customers who joined this month. What does Annapurna’s Tier slicer show for them?', [
        ['A (Blank) item, unless Power Query replaces blanks with a label', true],
        ['Nothing — their sales are dropped from every visual of the report', false],
        ['They are assigned to the first tier alphabetically, Gold', false],
        ['An error, because a slicer column cannot contain blanks', false],
      ], 'A blank attribute value appears as (Blank) in slicers and axes. Replacing it with "New" in Power Query gives readers a meaningful label without losing the sales.'),
      mcq("Someone builds a time chart on Sales[Date] rather than the date table. The chart's year shows 2025 and Q2 includes April to June. What should the chart use instead?", [
        ['The date table’s Fiscal Year and Fiscal Quarter columns', true],
        ['Sales[Date] grouped into bins of three months each', false],
        ['A text column of month names typed into the Sales query', false],
      ], 'Auto date/time on Sales[Date] knows only calendar years and quarters. The Date table carries the April–March fiscal year, so April–June becomes FY 2025-26 Q1.'),
      mcq('A matrix of Stores[StoreName] with Sum of Amount lists Kukatpally, Kothrud and T Nagar, but not Edappally. Edappally exists in the Stores table. Why is it missing?', [
        ['Visuals hide rows with no data; Edappally has no sales yet', true],
        ['The Stores table failed to load Edappally’s row on refresh', false],
        ['Edappally’s StoreID is duplicated, so the row was merged away', false],
        ['Matrix visuals can show at most three rows per hierarchy level', false],
      ], 'By default a visual shows only dimension rows that return a value. "Show items with no data" on the StoreName field displays Edappally with a blank amount.'),
      mcq('A model with 18 months of fact data has its date table built with CALENDARAUTO(). The table starts in 1965. What is the likely reason?', [
        ['A date column elsewhere, such as birth dates, starts in 1965', true],
        ['CALENDARAUTO always starts sixty years before the current year', false],
        ['The date table’s Year column is stored as text, not a number', false],
        ['The relationship from the date table to Sales is inactive', false],
      ], 'CALENDARAUTO scans every date column in the model (except calculated ones) and spans whole years from the earliest to the latest. A Customers DateOfBirth column stretches it back.'),
      mcq('The category team renames the "Prod Code" heading in their catalogue sheet to "Product Code". Which Power Query step fails on the next refresh?', [
        ['The Renamed Columns step that turns "Prod Code" into ProductID', true],
        ['The relationship from Products to Sales in Model view', false],
        ['The Sort by column setting on the date table’s Month', false],
      ], 'Steps refer to columns by name. The rename step looks for "Prod Code", finds no such column, and the refresh fails with an error naming it; editing that one step fixes it.'),
      mcq('Finance’s Targets table has Region and Quarter. Annapurna’s analyst wants one Region slicer to filter both Sales and Targets. Which model works?', [
        ['A Region dimension, one-to-many to Stores and to Targets', true],
        ['Targets merged into Sales, repeating each target per row', false],
        ['Targets related to Sales directly on the Region column', false],
        ['Two Region slicers synced, one per fact table', false],
      ], 'A shared Region dimension filters Stores (and through it Sales) and Targets. Repeating targets on sales rows would multiply them; Sales has no Region column to relate to.'),
      mcq('In a file whose locale is English (United States), sales dated 04/06/2025 appear in April instead of June. The Power Query step on Date is a plain Changed Type. What is the fix?', [
        ['Change Type with Locale, English (India), on the Date column', true],
        ['Run the refresh again from the Power BI Service instead', false],
        ['Mark the date table again after each refresh of the model', false],
        ['Sort the Sales query by Date before changing its type', false],
      ], 'A plain type change reads dates with the file’s locale, which here is month-first. Using Locale writes the day-first culture into the step itself.'),
    ],
  },

  /* ══════════════════════════════════════════════════════════════════════════════════════
   * DT_PBI_DAX — measures, context, time intelligence, iterators
   * ════════════════════════════════════════════════════════════════════════════════════ */

  /* ── MEASURES_COLUMNS ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PBI_DAX_MEASURES_COLUMNS',
    notes: `DAX (Data Analysis Expressions) is the formula language of Power BI's model. It looks like Excel —
SUM, IF, DIVIDE — but it works on **tables and columns**, not cells, and the same formula gives a
different answer in every cell of a visual. This unit is about the two places DAX lives and the first
measures every model needs.

We continue with Annapurna Mart's model from the previous topic:

${MODEL_DATA}

## Two kinds of calculation

| | Calculated column | Measure |
|---|---|---|
| Computed | Once per row, **at data refresh**, and stored in the model | **When a visual asks**, for each cell, from whatever filters apply |
| Sees | The current row (row context) | The filters of the cell (filter context) |
| Reacts to slicers | No — the value was fixed at refresh | Yes — every click recomputes it |
| Costs | Memory, for every row | Query time, nothing stored |
| Use for | Something to slice, filter or group **by** | Something to **show** as a number |

## Calculated columns

Table tools > New column, in Sales:

    Line Cost = Sales[Qty] * RELATED ( Products[UnitCost] )

For each Sales row, DAX takes that row's Qty and, through the relationship, that product's UnitCost.
RELATED follows a relationship from the many side to the one side. Sale 12: 2 × 2,600 = 5,200.

A column you **group by** is a genuine reason for a calculated column:

    Price Band = IF ( Products[ListPrice] >= 2000, "Premium", "Everyday" )

Now "Premium" can sit in a slicer or on an axis: P03 and P04 are Premium, the rest Everyday. Even this
could be built in Power Query; prefer Power Query for columns that come from source data, and DAX
columns only when they need the model (RELATED, or a measure).

## Measures

Home > New measure. Put measures in a dedicated table (Enter data, an empty table named
"_Measures") so people can find them. The first five every sales model has:

    Total Sales = SUM ( Sales[Amount] )
    Orders = COUNTROWS ( Sales )
    Units = SUM ( Sales[Qty] )
    Customers Who Bought = DISTINCTCOUNT ( Sales[CustomerID] )
    Avg Order Value = DIVIDE ( [Total Sales], [Orders] )

On Annapurna's Q1 data, as cards: Total Sales **29,063**, Orders **12**, Units **33**, Customers Who
Bought **4**, Avg Order Value **2,421.92**.

Put them in a matrix by city and every number recomputes for each row:

| City | Total Sales | Orders | Customers Who Bought | Avg Order Value |
|---|---|---|---|---|
| Chennai | 13,691 | 4 | 3 | 3,422.75 |
| Hyderabad | 8,026 | 4 | 3 | 2,006.50 |
| Pune | 7,346 | 4 | 3 | 1,836.50 |
| **Total** | **29,063** | **12** | **4** | **2,421.92** |

Look at the total row. Customers Who Bought is **4**, not 3 + 3 + 3 = 9: the total cell has no city
filter, so DISTINCTCOUNT counts the distinct customers across all cities — the right answer, because
the same four loyalty customers shop in several cities. Avg Order Value's total is 29,063 / 12, not an
average of the three city averages. **A measure's total is the measure evaluated again with the total's
filters, never a sum of the rows above it.** That is usually what you want; the debugging unit shows
when it is not.

## Why measures are usually right: the margin percentage

Two ways to compute margin %:

    -- a calculated column in Sales
    Line Margin % = DIVIDE ( Sales[Amount] - Sales[Line Cost], Sales[Amount] )

    -- measures
    Total Cost = SUM ( Sales[Line Cost] )
    Gross Margin = [Total Sales] - [Total Cost]
    Margin % = DIVIDE ( [Gross Margin], [Total Sales] )

The measure gives **28.64%** for Q1 (8,323 / 29,063). Dragging the column into a card and choosing
Average gives **28.92%** — the average of twelve line percentages, where a ₹930 oil sale counts as much as
a ₹6,998 mixer sale. Ratios must be computed from totals at the level being shown; that is what a measure
does in every cell.

## DIVIDE, not /

    Avg Order Value = DIVIDE ( [Total Sales], [Orders] )

DIVIDE(numerator, denominator, alternate) returns BLANK (or the alternate value, if given) when the
denominator is zero or blank. The / operator divides anyway: a non-zero number divided by zero or blank
shows **Infinity**, and 0 / 0 shows **NaN**. Kothrud's door counter broke in May and logged 0 visitors
while the store sold ₹3,148: \`Sales per Visitor = [Total Sales] / [Visitors]\` shows Infinity in that
cell, while DIVIDE([Total Sales], [Visitors]) leaves it blank — honest, since the figure is unknown. Use /
only when the denominator can never be zero (dividing by a constant 100, say).

## SUM, COUNTROWS, DISTINCTCOUNT — choosing the aggregation

| Question | Measure | Q1 value |
|---|---|---|
| How much did we sell? | SUM(Sales[Amount]) | 29,063 |
| How many till lines? | COUNTROWS(Sales) | 12 |
| How many different customers? | DISTINCTCOUNT(Sales[CustomerID]) | 4 |
| How many products in the catalogue? | COUNTROWS(Products) | 5 |
| How many stores exist? | COUNTROWS(Stores) | 4 (Edappally included) |

COUNTROWS counts rows of a table; COUNT counts non-blank values in a column. On a fact table, prefer
COUNTROWS — it says what you mean and does not depend on a column having no blanks.

## Implicit vs explicit measures

Dragging Sales[Amount] onto a visual makes an **implicit** measure ("Sum of Amount"). It works, but it
cannot be reused inside other measures, and calculation groups and some features turn them off. Write
explicit measures, format them once (Measure tools > Format: ₹ currency, 0 decimals), and hide the raw
Amount column so nobody drags it.

## Naming and a rule of thumb

Name measures as a reader would say them: "Total Sales", "Margin %", not "SumAmt2". When choosing: if you
will put it on rows, columns or in a slicer, it is a **column**; if it is a number to show in a cell, it
is a **measure**.`,
    workedExample: `**Goal: build the core measures for Annapurna Mart and prove each one against a hand count.**

**1. A home for measures.** Home > Enter data > name the table _Measures > Load. (Once it holds a
measure, you can delete its empty column and Power BI shows it with a calculator icon at the top of the
Data pane.)

**2. Total Sales.** New measure: \`Total Sales = SUM ( Sales[Amount] )\`. Card: 29,063. Hand check: the
12 amounts add to 29,063.

**3. Cost needs the Products table.** The cost sits on Products, the quantity on Sales. Two options:

    Line Cost (column, in Sales) = Sales[Qty] * RELATED ( Products[UnitCost] )
    Total Cost = SUM ( Sales[Line Cost] )

or, with no stored column, an iterator (the next-but-one unit explains SUMX):

    Total Cost = SUMX ( Sales, Sales[Qty] * RELATED ( Products[UnitCost] ) )

Either gives **20,740**. Hand check on three rows: sale 1, 2 × 520 = 1,040; sale 4, 6 × 120 = 720; sale
12, 2 × 2,600 = 5,200.

**4. Margin.** \`Gross Margin = [Total Sales] - [Total Cost]\` → 8,323. \`Margin % = DIVIDE ( [Gross
Margin], [Total Sales] )\` → 0.2864; format as percentage with 2 decimals: **28.64%**.

**5. Check it moves with filters.** A matrix with Products[Category]:

| Category | Total Sales | Total Cost | Margin % |
|---|---|---|---|
| Appliances | 13,996 | 10,400 | 25.69% |
| Grocery | 6,674 | 5,040 | 24.48% |
| Home | 3,995 | 2,400 | 39.92% |
| Kitchen | 4,398 | 2,900 | 34.06% |
| **Total** | **29,063** | **20,740** | **28.64%** |

Hand check Home: two bedsheet sales, 5 units × ₹799 = 3,995 and 5 × ₹480 = 2,400; (3,995 − 2,400) /
3,995 = 39.92%.

Notice the total Margin % is not the average of the four category percentages (that would be 31.04%). It
is computed from the totals, which is what the finance team means by margin.

**6. Format and tidy.** Total Sales, Total Cost and Gross Margin as currency with ₹ and no decimals;
Margin % as percentage. Hide Sales[Amount] and Sales[Line Cost] from report view so authors use the
measures.`,
    mcqs: [
      mcq('A matrix of Annapurna’s sales by city shows Customers Who Bought = DISTINCTCOUNT(Sales[CustomerID]) as 3 for each of Chennai, Hyderabad and Pune. What does the total row show?', [
        ['4, the distinct customers across all cities together', true],
        ['9, the sum of the three city values shown above it', false],
        ['3, the largest of the values shown in the rows above', false],
        ['12, the number of sales rows in the fact table', false],
      ], 'The total cell evaluates the measure again without a city filter. The same four customers bought in several cities, so the distinct count over all sales is 4.'),
      mcq('Margin % as a measure, DIVIDE([Gross Margin], [Total Sales]), gives 28.64% for Q1. Averaging a calculated column of line margin % gives 28.92%. Why do they differ?', [
        ['The average weights a ₹930 sale the same as a ₹6,998 sale', true],
        ['Calculated columns round each line to whole percentages', false],
        ['DIVIDE leaves out lines that have a margin of exactly zero', false],
        ['The measure is computed on the date table, not on Sales', false],
      ], 'An average of ratios gives every line equal weight. The measure divides total margin by total sales, which weights each sale by its value — the figure the business means.'),
      mcq('Which of these belongs in a calculated column rather than a measure?', [
        ['A Price Band of Premium or Everyday to use in a slicer', true],
        ['Total Sales, to show on a card that a slicer filters', false],
        ['Average order value for each store in a matrix', false],
      ], 'Something you slice or group by needs a value stored on each row, so it is a column. Totals and averages shown in cells are measures, recomputed for each filter.'),
    ],
    checkpoint: [
      mcq('Sales per Visitor = [Total Sales] / [Visitors]. Kothrud’s counter logged 0 visitors in May while the store sold ₹3,148. What does the May cell for Kothrud show?', [
        ['Infinity, where DIVIDE would return a blank instead', true],
        ['Zero, because DAX treats any division by zero as 0', false],
        ['3,148, because a zero denominator is ignored by DAX', false],
      ], 'The / operator divides even when the denominator is zero, so a non-zero numerator gives Infinity. DIVIDE returns BLANK (or a chosen alternate) in that case.'),
      mcq('A calculated column in Customers is written as = SUM(Sales[Amount]). What does it show on each of the four customer rows?', [
        ['29,063 on every row', true],
        ['Each customer’s own total', false],
        ['Blank on every row', false],
        ['An error about row context', false],
      ], 'A calculated column has a row context but no filter context, and SUM ignores row context, so it adds the whole Sales table on every row. Wrapping it in CALCULATE, covered next, changes that.'),
      mcq('A colleague wants a "Units" card that changes when a store slicer is clicked. Where should the calculation live?', [
        ['A measure: Units = SUM(Sales[Qty])', true],
        ['A calculated column in Sales: = Sales[Qty]', false],
        ['A calculated column in Stores: = SUM(Sales[Qty])', false],
        ['A new table that copies Sales[Qty] at refresh', false],
      ], 'Measures are evaluated in the filter context of each visual, so the slicer changes the result. Columns are fixed at refresh and do not respond to slicers.'),
    ],
  },

  /* ── CALCULATE_CONTEXT ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PBI_DAX_CALCULATE_CONTEXT',
    notes: `Every number in a Power BI visual is a measure evaluated under a set of filters. Understanding which
filters, and how to change them, is the single biggest step from "can write SUM" to "can write DAX".
The two ideas are **filter context** and **row context**; the tool is **CALCULATE**.

## Filter context

The filter context of a cell is every filter that applies to it: the row and column headers of the
matrix, slicers, page and report filters, and filters from other visuals. In this matrix:

| Category | Hyderabad | Pune | Chennai |
|---|---|---|---|
| Grocery | 2,328 | 2,249 | 2,097 |

the cell 2,328 is \`Total Sales\` evaluated with the filter context **Products[Category] = "Grocery"** and
**Stores[City] = "Hyderabad"**. Those filters land on the dimensions and flow through relationships to
Sales; SUM adds the two surviving rows (sale 1, ₹1,398, and sale 4, ₹930).

## Row context

Row context means "the current row" while DAX walks a table — in a calculated column, or inside an
iterator such as SUMX. Row context **does not filter anything** by itself. That is why the calculated
column \`= SUM(Sales[Amount])\` in Customers shows 29,063 on every row: there is a current customer, but
no filter saying so.

## CALCULATE: evaluate an expression under modified filters

    CALCULATE ( <expression>, <filter1>, <filter2>, ... )

CALCULATE takes the current filter context, **applies its filter arguments** — each one replacing any
existing filter on the same column — and evaluates the expression in the result.

    Grocery Sales = CALCULATE ( [Total Sales], Products[Category] = "Grocery" )

| Category | Total Sales | Grocery Sales |
|---|---|---|
| Appliances | 13,996 | 6,674 |
| Grocery | 6,674 | 6,674 |
| Home | 3,995 | 6,674 |
| Kitchen | 4,398 | 6,674 |
| **Total** | **29,063** | **6,674** |

On the Appliances row the row's filter Category = "Appliances" is **replaced** by Category = "Grocery",
so every row shows 6,674. Filters on **other** columns survive: in a matrix by City, Grocery Sales is
2,328 for Hyderabad, 2,249 for Pune and 2,097 for Chennai, because the city filter is untouched.

If you want the filter to **intersect** with the existing one rather than replace it, wrap it:

    Grocery Sales (kept) = CALCULATE ( [Total Sales], KEEPFILTERS ( Products[Category] = "Grocery" ) )

Now the Appliances, Home and Kitchen rows are blank and the Grocery row is 6,674.

A boolean filter like \`Products[Category] = "Grocery"\` is shorthand for
\`FILTER ( ALL ( Products[Category] ), Products[Category] = "Grocery" )\` — a table of the allowed values of
one column. Conditions on a numeric column work the same way:

    Big-Ticket Sales = CALCULATE ( [Total Sales], Sales[Amount] > 3000 )

returns **13,996** for Q1 — sales 2, 6 and 12 (3,499 + 3,499 + 6,998).

## Removing filters: ALL and REMOVEFILTERS

The most common business measure is a **share of total**. You need the current number and a total with
some filter removed:

    % of Category Total =
    DIVIDE (
        [Total Sales],
        CALCULATE ( [Total Sales], REMOVEFILTERS ( Products[Category] ) )
    )

| Category | Total Sales | % of Category Total |
|---|---|---|
| Appliances | 13,996 | 48.16% |
| Grocery | 6,674 | 22.96% |
| Kitchen | 4,398 | 15.13% |
| Home | 3,995 | 13.75% |
| **Total** | **29,063** | **100.00%** |

REMOVEFILTERS removes the category filter for the denominator only; the numerator keeps it. ALL(...) used
as a CALCULATE filter does the same job (REMOVEFILTERS is a clearer name added in 2019); ALL also works
as a table function elsewhere, REMOVEFILTERS only inside CALCULATE.

Because only the category filter is removed, **other filters still apply**. Pick South in a Region
slicer and the denominator becomes South's total, 21,717:

| Category (South only) | Total Sales | % of Category Total |
|---|---|---|
| Appliances | 10,497 | 48.34% |
| Grocery | 4,425 | 20.38% |
| Kitchen | 4,398 | 20.25% |
| Home | 2,397 | 11.04% |

That is usually the right behaviour — "share within what I've selected". If the manager wants share of
the whole chain whatever is selected, remove filters from the whole table or model:
\`REMOVEFILTERS ( Products )\` removes all Products filters; \`REMOVEFILTERS ( Stores )\` would ignore the
region slicer too.

**Choose what to remove deliberately.** A share within region:

    % of Region =
    DIVIDE ( [Total Sales], CALCULATE ( [Total Sales], REMOVEFILTERS ( Stores[City] ) ) )

In a matrix with Region > City on rows, Chennai shows 13,691 / 21,717 = **63.04%**, Hyderabad
**36.96%**, Pune **100%** (the only West city). The region filter stays; only the city is removed.

ALLSELECTED is the third option: it removes filters coming from the visual's own rows and columns but
keeps those from slicers and filters outside it — "share of what's visible".

## FILTER, and why the column form is preferred

    CALCULATE ( [Total Sales], FILTER ( Sales, Sales[Amount] > 3000 ) )

also gives 13,996 here, but it is a different filter: it iterates the **whole Sales table** (with its
current filters) and filters by every column of it, which is slower on big tables and can interact
differently with other filters. Filter a **column**, not a table, whenever the condition is on one
column; use FILTER when the condition needs a measure or several tables.

## Context transition

When CALCULATE runs inside a row context, it turns the current row into a filter — **context
transition**. So in Customers:

    Customer Sales (column) = CALCULATE ( SUM ( Sales[Amount] ) )

gives each customer's own total: C101 **5,195**, C102 **6,295**, C103 **8,095**, C104 **9,478**.
Referencing a measure does the same, because every measure reference is wrapped in an implicit
CALCULATE: \`= [Total Sales]\` as a column in Customers gives the same four numbers. This is why a measure
called inside an iterator or a calculated column "knows" which row it is on — and why it can be slow on
millions of rows.

## The mental model to keep

1. Start from the cell's filters (rows, columns, slicers).
2. CALCULATE applies its arguments: replace filters on the same columns (or intersect, with
   KEEPFILTERS), remove them with REMOVEFILTERS/ALL, and turn any row context into filters.
3. Filters flow through relationships to the fact table.
4. The expression is evaluated over what remains.`,
    workedExample: `**Goal: a matrix by Region and City showing each city's sales, its share of its region, and its share
of the whole chain — and check every percentage by hand.**

**Measures:**

    % of Region =
    DIVIDE ( [Total Sales], CALCULATE ( [Total Sales], REMOVEFILTERS ( Stores[City] ) ) )

    % of Chain =
    DIVIDE ( [Total Sales], CALCULATE ( [Total Sales], REMOVEFILTERS ( Stores ) ) )

**The matrix** (Stores[Region] then Stores[City] on rows):

| Region / City | Total Sales | % of Region | % of Chain |
|---|---|---|---|
| South | 21,717 | 100.00% | 74.72% |
| — Chennai | 13,691 | 63.04% | 47.11% |
| — Hyderabad | 8,026 | 36.96% | 27.62% |
| West | 7,346 | 100.00% | 25.28% |
| — Pune | 7,346 | 100.00% | 25.28% |
| **Total** | **29,063** | **100.00%** | **100.00%** |

**Reasoning, cell by cell:**

- *Chennai, % of Region.* Numerator: filters Region = South, City = Chennai → 13,691. Denominator:
  CALCULATE removes the City filter, Region = South stays → 21,717. 13,691 / 21,717 = 0.6304.
- *Chennai, % of Chain.* Denominator removes every filter on Stores, Region and City alike → 29,063.
  13,691 / 29,063 = 0.4711.
- *South row, % of Region.* There is no city filter on a region subtotal, so removing it changes
  nothing: 21,717 / 21,717 = 100%. That is correct and is why subtotals of "% of parent" read 100%.

**Now add a slicer** on Products[Category] = Grocery. Chennai's % of Chain becomes 2,097 / 6,674 =
31.42%: REMOVEFILTERS(Stores) removed store filters only, so the denominator is all Grocery sales. If the
manager wanted "Chennai's grocery as a share of every rupee sold", the denominator would need
REMOVEFILTERS on Products too — a question to ask the manager, not to guess.

**Check:** 2,097 / 6,674 = 0.31420. The habit is the same every time: for each measure, say aloud which
filters the numerator and the denominator see.`,
    mcqs: [
      mcq('Grocery Sales = CALCULATE([Total Sales], Products[Category] = "Grocery") is placed in a matrix with Category on rows. What does it show on the Kitchen row?', [
        ['6,674, because the Kitchen filter is replaced by Grocery', true],
        ['Blank, because Kitchen and Grocery have no rows in common', false],
        ['4,398, because the row filter on Kitchen takes priority', false],
        ['11,072, because Kitchen and Grocery sales are added', false],
      ], 'A CALCULATE filter on a column replaces any existing filter on that column. Every category row shows the Grocery total; KEEPFILTERS would make the Kitchen row blank.'),
      mcq('% of Category Total divides [Total Sales] by CALCULATE([Total Sales], REMOVEFILTERS(Products[Category])). With a Region slicer on South, what is Appliances’ share, given South Appliances ₹10,497 and South total ₹21,717?', [
        ['48.34%, because the region filter still applies', true],
        ['48.16%, because REMOVEFILTERS ignores all slicers', false],
        ['36.12%, because the numerator loses the region', false],
        ['74.72%, the South share of the chain’s sales', false],
      ], 'Only the category filter is removed from the denominator, so it is South’s total, 21,717. 10,497 / 21,717 = 48.34%. The whole-chain figure would need region filters removed too.'),
      mcq('In the Customers table, a calculated column = CALCULATE(SUM(Sales[Amount])) shows 9,478 on C104’s row. What makes that happen?', [
        ['Context transition turns the current row into a filter', true],
        ['CALCULATE reads the customer from the active slicer', false],
        ['SUM adds only amounts that appear on the same row', false],
      ], 'Inside a row context, CALCULATE converts the row into an equivalent filter on Customers, which flows to Sales. Without CALCULATE, SUM would return the total of all sales on every row.'),
    ],
    checkpoint: [
      mcq('A matrix has Region > City on rows and % of Region = DIVIDE([Total Sales], CALCULATE([Total Sales], REMOVEFILTERS(Stores[City]))). What does the Hyderabad row show?', [
        ['36.96%', true],
        ['27.62%', false],
        ['63.04%', false],
        ['100.00%', false],
      ], 'Hyderabad is 8,026; removing the city filter but keeping Region = South gives 21,717. 8,026 / 21,717 = 36.96%. 27.62% is its share of the whole chain.'),
      mcq('Big-Ticket Sales = CALCULATE([Total Sales], Sales[Amount] > 3000). What does it return on a card for Annapurna’s Q1?', [
        ['13,996', true],
        ['29,063', false],
        ['6,998', false],
        ['10,497', false],
      ], 'Three sales exceed ₹3,000: sales 2 and 6 at 3,499 and sale 12 at 6,998, which total 13,996.'),
      mcq('Grocery Sales (kept) = CALCULATE([Total Sales], KEEPFILTERS(Products[Category] = "Grocery")). In a matrix by Category, what does the Home row show?', [
        ['Blank', true],
        ['6,674', false],
        ['3,995', false],
        ['10,669', false],
      ], 'KEEPFILTERS intersects the new filter with the row’s Category = Home, and no category is both Home and Grocery, so nothing survives and the cell is blank.'),
    ],
  },

  /* ── TIME_INTELLIGENCE ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PBI_DAX_TIME_INTELLIGENCE',
    notes: `"How are we doing against last year?" "What's the year to date?" "Is this month up on last month?"
These are the questions every sales report must answer, and DAX's **time-intelligence** functions answer
them by shifting the dates in the filter context. They need the date table from the modelling topic:
contiguous dates covering whole fiscal years, related to Sales[Date], and marked as a date table.

## The data: Annapurna Mart's monthly sales, whole chain (₹ lakh)

The full model now holds two fiscal years:

| Month | FY 2024-25 | FY 2025-26 |
|---|---|---|
| Apr | 42.0 | 46.8 |
| May | 39.5 | 44.1 |
| Jun | 41.2 | 45.9 |
| Jul | 44.8 | 47.3 |
| Aug | 46.1 | 50.6 |
| Sep | 52.3 | 55.0 |
| Oct | 61.7 | |
| Nov | 55.4 | |
| Dec | 48.9 | |
| Jan | 45.2 | |
| Feb | 43.6 | |
| Mar | 50.1 | |
| **Total** | **570.8** | **289.7** (to Sep) |

October is Diwali; FY 2025-26 has data to the end of September.

## Year to date — for an April fiscal year

    Sales FYTD = TOTALYTD ( [Total Sales], 'Date'[Date], "3/31" )

The third argument is the **year-end date**; "3/31" means the year ends on 31 March, so the year to
date runs from 1 April. (The string is read with the model's locale; "31/3" may be needed on a
day-first locale. Without it, YTD runs from 1 January — wrong for every Indian company's finance team.)

TOTALYTD is shorthand for \`CALCULATE ( [Total Sales], DATESYTD ( 'Date'[Date], "3/31" ) )\`. DATESYTD
looks at the last date in the current filter context — say 30 September 2025 — and returns every date
from 1 April 2025 to that date. CALCULATE then puts those dates in place of the month filter.

| Month (FY 2025-26) | Total Sales | Sales FYTD |
|---|---|---|
| Apr | 46.8 | 46.8 |
| May | 44.1 | 90.9 |
| Jun | 45.9 | 136.8 |
| Jul | 47.3 | 184.1 |
| Aug | 50.6 | 234.7 |
| Sep | 55.0 | 289.7 |

If the "3/31" were left out, September 2025's YTD would add January–March 2025 (45.2 + 43.6 + 50.1) to
April–September: **428.6** — a number that belongs to no financial year.

## Same period last year, and growth

    Sales LY = CALCULATE ( [Total Sales], SAMEPERIODLASTYEAR ( 'Date'[Date] ) )
    YoY % = DIVIDE ( [Total Sales] - [Sales LY], [Sales LY] )

SAMEPERIODLASTYEAR shifts the dates in the filter context back one year: September 2025 becomes
September 2024. It is equivalent to DATEADD('Date'[Date], -1, YEAR).

| Month | Total Sales | Sales LY | YoY % |
|---|---|---|---|
| Apr | 46.8 | 42.0 | 11.43% |
| May | 44.1 | 39.5 | 11.65% |
| Jun | 45.9 | 41.2 | 11.41% |
| Jul | 47.3 | 44.8 | 5.58% |
| Aug | 50.6 | 46.1 | 9.76% |
| Sep | 55.0 | 52.3 | 5.16% |

Year-to-date growth combines the two ideas:

    Sales FYTD LY = CALCULATE ( [Sales FYTD], SAMEPERIODLASTYEAR ( 'Date'[Date] ) )
    FYTD YoY % = DIVIDE ( [Sales FYTD] - [Sales FYTD LY], [Sales FYTD LY] )

At September: 289.7 against 265.9 → **8.95%**. The story for the manager: the first quarter grew about
11.5% (136.8 vs 122.7, +11.49%), the second only 6.77% (152.9 vs 143.2), so growth is slowing into the
festive season — worth a question before Diwali stock is ordered.

## Month over month

    Sales PM = CALCULATE ( [Total Sales], DATEADD ( 'Date'[Date], -1, MONTH ) )
    MoM % = DIVIDE ( [Total Sales] - [Sales PM], [Sales PM] )

September 2025: 55.0 vs 50.6 = **+8.70%**. April 2025 compares with March 2025 (50.1): **−6.59%**.
Because DATEADD works on the date table, it crosses the fiscal-year boundary without help. PREVIOUSMONTH
also exists, but it returns the whole previous month even when the current filter is a single day, so
DATEADD is the more general tool.

MoM in retail is noisy — festivals, salary days and the number of weekends move it. YoY compares like
with like and is the headline; MoM is for operations.

## Rolling periods

    Sales Rolling 3M =
    CALCULATE (
        [Total Sales],
        DATESINPERIOD ( 'Date'[Date], MAX ( 'Date'[Date] ), -3, MONTH )
    )

At September 2025: July + August + September = 152.9, an average of **50.97** a month. Rolling totals
smooth noise without waiting for a year end.

## Why time intelligence needs the date table

All of these functions build a set of dates from the **date column you pass** and use it as a filter.
That column must:

- **cover every date the shift lands on** — SAMEPERIODLASTYEAR for April 2025 needs April 2024 rows in the
  date table; if the table started in April 2025, Sales LY is blank everywhere;
- **be contiguous** — a set of "all days from 1 April to today" cannot be built from a column with
  gaps;
- **belong to the date dimension**, not to Sales: passing Sales[Date] makes the shift use only days on
  which something was sold, and filters from the Date table's columns are not replaced as expected.
  Always pass 'Date'[Date].

## Future months

The date table runs to 31 March 2026. For October 2025 to March 2026 there is no data, but Sales FYTD
still shows **289.7** for each of those months — the YTD up to that date includes April–September.
Hide it after the last sale:

    Sales FYTD =
    VAR LastSaleDate = CALCULATE ( MAX ( Sales[Date] ), REMOVEFILTERS ( Sales ) )
    RETURN
        IF (
            MIN ( 'Date'[Date] ) > LastSaleDate,
            BLANK (),
            TOTALYTD ( [Total Sales], 'Date'[Date], "3/31" )
        )

## A note on newer features

The functions above are the classic, documented set that every Power BI model uses. In 2025 Microsoft
previewed calendar-based time intelligence for custom calendars (such as 4-4-5 retail weeks); if your
company runs a retail week calendar, check whether it is generally available in your version before
relying on it.`,
    mcqs: [
      mcq("Annapurna Mart reports by an April–March year. Which measure gives the correct year to date?", [
        ["TOTALYTD([Total Sales], 'Date'[Date], \"3/31\")", true],
        ["TOTALYTD([Total Sales], 'Date'[Date])", false],
        ["TOTALYTD([Total Sales], Sales[Date], \"4/1\")", false],
        ["CALCULATE([Total Sales], 'Date'[Fiscal Year])", false],
      ], 'The third argument is the year-end date, so "3/31" starts the year on 1 April. Without it the year ends on 31 December; Sales[Date] is not a contiguous date column.'),
      mcq('Using the FY 2025-26 figures, Sales LY for August 2025 is 46.1 and Total Sales is 50.6. What does YoY % = DIVIDE([Total Sales] - [Sales LY], [Sales LY]) show?', [
        ['9.76%', true],
        ['8.89%', false],
        ['4.50%', false],
        ['6.98%', false],
      ], '(50.6 − 46.1) / 46.1 = 4.5 / 46.1 = 0.0976. Dividing by this year (8.89%) or showing the lakh difference (4.5) are the usual slips; 6.98% is August’s month-over-month growth.'),
      mcq("The date table was built from 1 April 2025, and Sales LY = CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Date'[Date])) is blank for every month. What is the cause?", [
        ['The date table has no FY 2024-25 dates to shift back to', true],
        ['SAMEPERIODLASTYEAR works only on calendar years, not fiscal', false],
        ['Sales LY needs DIVIDE around it to avoid blank results', false],
        ['The relationship to Sales must be set to both directions', false],
      ], 'Time-intelligence functions return dates from the date column. If last year’s dates are not in the date table, the shifted set is empty and the measure is blank.'),
    ],
    checkpoint: [
      mcq('Sales FYTD uses TOTALYTD with "3/31". What does it show for July 2025, given April 46.8, May 44.1, June 45.9 and July 47.3 (₹ lakh)?', [
        ['184.1', true],
        ['47.3', false],
        ['136.8', false],
        ['322.3', false],
      ], 'The fiscal year starts on 1 April, so July’s YTD is 46.8 + 44.1 + 45.9 + 47.3 = 184.1. 136.8 stops at June.'),
      mcq('Sales PM = CALCULATE([Total Sales], DATEADD(\'Date\'[Date], -1, MONTH)). For April 2025 (46.8), with March 2025 at 50.1, what does MoM % show?', [
        ['−6.59%', true],
        ['Blank, since April starts a new fiscal year', false],
        ['+7.05%', false],
        ['−3.30%', false],
      ], 'DATEADD shifts to March 2025 across the fiscal boundary. (46.8 − 50.1) / 50.1 = −0.0659. +7.05% divides 3.3 by 46.8 and has the wrong sign.'),
      mcq('The date table runs to March 2026 but sales stop in September 2025. A matrix shows Sales FYTD as 289.7 for every month from October to March. Why?', [
        ['YTD for a later month still includes April–September sales', true],
        ['TOTALYTD copies the last value forward on purpose for forecasts', false],
        ['Future months are filtered by Sales[Date], which repeats September', false],
        ['The year-end argument should be "9/30" when data stops in September', false],
      ], 'For October, DATESYTD returns 1 April to 31 October; only April–September have sales, so the sum is 289.7. A guard that blanks dates after the last sale fixes the display.'),
    ],
  },

  /* ── ITERATORS_VARIABLES ──────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PBI_DAX_ITERATORS_VARIABLES',
    notes: `SUM adds a column. Many business numbers are not a column: cost is quantity × the product's cost; average
sales per customer is an average of per-customer totals; a rank compares each product with every other.
These need **iterators** — functions that walk a table row by row — and they are much easier to read and
debug with **variables**.

## Iterators: the X functions

    SUMX ( <table>, <expression> )

SUMX creates a row context on each row of the table, evaluates the expression on that row, and adds up
the results. AVERAGEX, MINX, MAXX, COUNTX and RANKX work the same way.

**Cost without a stored column:**

    Total Cost = SUMX ( Sales, Sales[Qty] * RELATED ( Products[UnitCost] ) )

Row by row: sale 1, 2 × 520 = 1,040; sale 2, 1 × 2,600 = 2,600; … sale 12, 2 × 2,600 = 5,200. Sum:
**20,740**. SUM(Sales[Qty]) × something would be wrong because each row has a different cost.

The iterator respects the filter context: in a matrix row for Grocery, SUMX walks only the five Grocery
rows of Sales and gives 5,040.

**Average of per-customer totals:**

    Avg Sales per Customer = AVERAGEX ( VALUES ( Sales[CustomerID] ), [Total Sales] )

VALUES returns the distinct customers visible in the current filter context. For each, [Total Sales]
is evaluated — and because it is a measure, context transition filters it to that customer: 5,195,
6,295, 8,095, 9,478. Their average: **7,265.75**. Compare Avg Order Value, 2,421.92 — a different
question (per till line, not per customer).

## Fixing a total that a plain measure gets wrong

Annapurna pays a store bonus of 2% of sales, but only to stores that sold more than ₹8,000 in the
period:

    Store Bonus (naive) = IF ( [Total Sales] > 8000, [Total Sales] * 0.02, 0 )

| Store | Total Sales | Store Bonus (naive) |
|---|---|---|
| Kukatpally | 8,026 | 160.52 |
| Kothrud | 7,346 | 0.00 |
| T Nagar | 13,691 | 273.82 |
| **Total** | **29,063** | **581.26** |

The rows are right; the total is not. The total cell sees no store filter, so it tests 29,063 > 8,000
and pays 2% on everything. The finance team will pay 160.52 + 273.82 = **434.34**. The fix is to iterate
the stores at the total too:

    Store Bonus =
    SUMX (
        VALUES ( Stores[StoreName] ),
        IF ( [Total Sales] > 8000, [Total Sales] * 0.02, 0 )
    )

Now every row is unchanged and the total is **434.34**. Whenever a measure applies a rule "per store",
"per customer" or "per month", iterate that grain explicitly so totals obey the same rule.

## Variables: VAR … RETURN

    Margin % =
    VAR Sales = [Total Sales]
    VAR Cost = [Total Cost]
    VAR Margin = Sales - Cost
    RETURN
        DIVIDE ( Margin, Sales )

Variables make a long measure readable, let you name each step, and are evaluated **once** — so a value
used twice is computed once. For debugging, temporarily RETURN an intermediate variable to see what it
holds.

One rule surprises everyone: **a variable is a constant once defined.** It is evaluated in the filter
context where it is declared, and CALCULATE cannot change it later:

    Grocery Sales (wrong) =
    VAR s = [Total Sales]
    RETURN CALCULATE ( s, Products[Category] = "Grocery" )

This returns [Total Sales] unchanged — 29,063 on a card, not 6,674 — because s was already computed
before CALCULATE ran. Put the measure inside CALCULATE, or compute the variable with CALCULATE.

## Ranking with RANKX

    Product Rank = RANKX ( ALL ( Products[ProductName] ), [Total Sales] )

RANKX iterates the table in its first argument, evaluates [Total Sales] for each product, and returns
where the current product's value falls (largest = 1 by default).

| Product | Total Sales | Product Rank |
|---|---|---|
| Mixer Grinder 750W | 13,996 | 1 |
| Pressure Cooker 5L | 4,398 | 2 |
| Basmati Rice 5kg | 4,194 | 3 |
| Cotton Bedsheet | 3,995 | 4 |
| Sunflower Oil 1L | 2,480 | 5 |

**ALL is essential.** Without it, RANKX iterates only the products visible in the current row — one —
and every product ranks 1. ALL(Products[ProductName]) ranks against every product regardless of the row.
Use ALLSELECTED instead if the rank should be among the products a slicer leaves visible.

Ties: two products with equal sales share a rank, and by default (ties = Skip) the next rank is skipped
(1, 2, 2, 4); pass Dense as the last argument for 1, 2, 2, 3. A rank by city inside a region uses
ALL(Stores[City]) with the region filter left in place. A newer RANK function (with the window
functions added in 2022–23) does similar work; RANKX remains the most widely used.

**Top N** is usually done without a rank: the visual's filter pane > Filter type: Top N > Show items
Top 3 by Total Sales. A rank measure is for when the number itself must be shown or used.

## A measure that is too slow

    Grocery Sales (slow) =
    SUMX ( FILTER ( Sales, RELATED ( Products[Category] ) = "Grocery" ), Sales[Amount] )

It is correct (6,674), but on a crore-row Sales table it iterates every row, follows the relationship
for each, and builds a filtered copy before summing. The equivalent

    Grocery Sales = CALCULATE ( [Total Sales], Products[Category] = "Grocery" )

filters one column of a five-row dimension and lets the engine do the rest. Rules of thumb:

- Filter **columns**, not whole tables, in CALCULATE.
- Do not iterate the fact table when a dimension (stores, customers, months) is the grain you need.
- Avoid calling a measure inside SUMX over the whole fact table: context transition runs once per row,
  and on a fact table without a unique row, duplicate rows are counted together and the result can be
  wrong as well as slow.
- Use Performance analyzer (View > Performance analyzer) to see which visual is slow, and DAX query view
  to test a measure on its own.`,
    mcqs: [
      mcq('Store Bonus (naive) = IF([Total Sales] > 8000, [Total Sales] * 0.02, 0) shows 160.52, 0 and 273.82 for the three stores, and 581.26 in the total. Why is the total wrong?', [
        ['The total tests 29,063 against 8,000 and pays 2% on everything', true],
        ['IF cannot return a decimal value in the total row of a matrix', false],
        ['The total adds the rows but rounds each one up to the rupee', false],
        ['Kothrud’s zero row is counted as 2% of its 7,346 in the total', false],
      ], 'The total cell has no store filter, so the IF sees the whole chain’s sales. Iterating the stores with SUMX(VALUES(Stores[StoreName]), …) applies the rule per store and gives 434.34.'),
      mcq('Product Rank = RANKX(Products, [Total Sales]) shows 1 for every product in a table visual. What fixes it?', [
        ['Rank over ALL(Products[ProductName]) so every product is compared', true],
        ['Change the order argument so the largest value is ranked last', false],
        ['Replace [Total Sales] with SUM(Sales[Amount]) inside RANKX', false],
      ], 'In each row only one product is visible, so RANKX compares it with itself. ALL removes the row’s filter from the table being ranked.'),
      mcq('What does this measure return on a card? VAR s = [Total Sales] RETURN CALCULATE(s, Products[Category] = "Grocery")', [
        ['29,063, because s was computed before CALCULATE ran', true],
        ['6,674, because CALCULATE applies the Grocery filter to s', false],
        ['Blank, because a variable cannot be used inside CALCULATE', false],
        ['An error, as VAR cannot hold the value of a measure', false],
      ], 'Variables are evaluated once, in the context where they are defined, and then behave as constants. CALCULATE cannot change a value that has already been computed.'),
    ],
    checkpoint: [
      mcq('Avg Sales per Customer = AVERAGEX(VALUES(Sales[CustomerID]), [Total Sales]). Using Annapurna’s Q1 per-customer totals of 5,195, 6,295, 8,095 and 9,478, what does the card show?', [
        ['7,265.75', true],
        ['2,421.92', false],
        ['29,063', false],
        ['7,195.00', false],
      ], 'AVERAGEX evaluates [Total Sales] for each of the four customers and averages them: 29,063 / 4 = 7,265.75. 2,421.92 is the average per sale.'),
      mcq('A measure SUMX(Sales, Sales[Qty] * RELATED(Products[UnitCost])) is shown in a matrix row for Kitchen. Kitchen has two sales of one pressure cooker each, cost ₹1,450. What is the value?', [
        ['2,900', true],
        ['1,450', false],
        ['4,398', false],
        ['20,740', false],
      ], 'SUMX iterates only the Kitchen rows in the filter context: 1 × 1,450 on each of two rows, so 2,900. 4,398 is Kitchen’s sales, not cost.'),
      mcq('A rank of products must change when a Category slicer hides some products, so the best visible product is always 1. Which first argument should RANKX use?', [
        ['ALLSELECTED(Products[ProductName])', true],
        ['ALL(Products[ProductName])', false],
        ['VALUES(Sales[ProductID])', false],
        ['Products', false],
      ], 'ALLSELECTED removes the visual’s own row filter but keeps slicer filters, so ranking is among the products the slicer leaves. ALL would rank against every product.'),
    ],
  },

  /* ── DEBUGGING ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PBI_DAX_DEBUGGING',
    notes: `A wrong DAX measure almost never errors. It returns a number — often a plausible one. Debug by
**symptom → cause → fix**, and use three tools:

- **A test matrix**: the measure next to its numerator and denominator, by the grain that matters,
  with the total row on.
- **Variables**: RETURN an intermediate VAR to see what it holds.
- **DAX query view**: \`EVALUATE SUMMARIZECOLUMNS ( Stores[StoreName], "Sales", [Total Sales] )\` tests
  the measure outside any visual, filters included only when you add them.

## 1. A matrix total that is not the sum of its rows

- **Symptom:** Store Bonus rows are 160.52, 0, 273.82; the total says 581.26.
- **Cause:** the measure applies a condition (IF [Total Sales] > 8000) that is re-evaluated at the total,
  where it sees all stores together. Measures are not summed; they are recomputed.
- **Fix:** iterate the grain the rule belongs to:
  \`SUMX ( VALUES ( Stores[StoreName] ), <the per-store expression> )\` → 434.34. (If the total *should*
  be a recomputed figure — a ratio, a distinct count — the "wrong" total is in fact right; know which
  you want.)

## 2. A measure blank for some rows

- **Symptom:** Margin % is blank for Edappally and for a new product, Steel Tiffin, while other rows
  are fine.
- **Cause:** neither has any sales yet; Total Sales is BLANK, and DIVIDE returns BLANK. That is correct.
  Rows blank *despite* having sales are different: usually a key that does not match (the sale sits on
  the (Blank) member instead), or a measure that filters a column the visual does not relate to.
- **Fix:** for genuinely empty rows, decide whether the reader wants a blank or 0 (use
  \`[Total Sales] + 0\` with care — it makes every product-store combination appear). For rows with sales
  that show blank, look for a (Blank) member and fix the key in Power Query.

## 3. Share of total shows 100% on every row

- **Symptom:** in a matrix by Products[ProductName], % of Category Total is 100% for every product.
- **Cause:** the denominator removes the filter on Products[Category], but the rows filter
  Products[ProductName] — a filter that was never removed. Numerator and denominator see the same
  product.
- **Fix:** remove the filter the visual actually applies: REMOVEFILTERS(Products[ProductName]) for share
  within category, or REMOVEFILTERS(Products) for share of all products.

## 4. Time intelligence returns blank

- **Symptom:** Sales LY and Sales FYTD are blank for every month.
- **Causes, in order of frequency:**
  1. The visual uses Sales[Date] or its Auto date/time hierarchy, not the Date table's columns, so the
     shifted dates never replace the visual's filter.
  2. The Date table does not contain last year's dates.
  3. The Date table is not related to Sales, or the relationship is inactive.
  4. The relationship uses an integer DateKey and the table is not marked as a date table.
- **Fix:** use 'Date' columns in the visual, pass 'Date'[Date] to the function, extend the table to whole
  years, and mark it.

## 5. YTD that starts in January

- **Symptom:** Sales FYTD for May 2025 is 229.8, far above April + May (90.9).
- **Cause:** TOTALYTD without a year-end argument runs from 1 January, adding January–March 2025
  (138.9).
- **Fix:** \`TOTALYTD ( [Total Sales], 'Date'[Date], "3/31" )\`.

## 6. Infinity in a growth column

- **Symptom:** YoY % shows Infinity for Edappally, which opened in July 2025.
- **Cause:** written as ([Total Sales] - [Sales LY]) / [Sales LY]; Sales LY is BLANK, and the / operator
  divides by it anyway.
- **Fix:** DIVIDE(..., [Sales LY]) returns BLANK. A new store has no meaningful growth figure; say "new
  store" in a tooltip rather than showing a number.

## 7. Every product ranks 1

- **Symptom:** RANKX gives 1 on every row.
- **Cause:** the first argument is the filtered table (Products, or VALUES(Products[ProductName])), which
  in each row contains only that product.
- **Fix:** RANKX(ALL(Products[ProductName]), [Total Sales]), or ALLSELECTED to respect slicers.

## 8. A many-to-many surprise in a measure

- **Symptom:** Target Achievement % = DIVIDE([Total Sales], SUM(Targets[Target])) is far too low for each
  city. Targets are set per region (South ₹60,000, West ₹25,000), and Targets is related to Stores on
  Region as many-to-many.
- **Cause:** with City on rows, the City filter flows Stores → Targets through Region, so the Hyderabad and Chennai rows each receive South's whole ₹60,000 target,
  because a region target cannot be divided among cities — the target exists only at region grain.
- **Fix:** show target achievement only at the grain the target exists (Region) — blank it below that
  level with \`IF ( ISINSCOPE ( Stores[City] ), BLANK (), ... )\` — or ask finance for city targets. Better
  still, model a Region dimension with one-to-many relationships.

## 9. A variable that ignores CALCULATE

- **Symptom:** a refactored measure, VAR s = [Total Sales] RETURN CALCULATE(s, ...), shows the same
  number whatever the filter argument.
- **Cause:** variables are constants once evaluated.
- **Fix:** CALCULATE([Total Sales], ...) directly, or VAR s = CALCULATE([Total Sales], ...).`,
    mcqs: [
      mcq('In a matrix of products, % of Category Total = DIVIDE([Total Sales], CALCULATE([Total Sales], REMOVEFILTERS(Products[Category]))) shows 100% on every product. Why?', [
        ['The rows filter ProductName, which the denominator never removes', true],
        ['REMOVEFILTERS cannot be used on a column of a dimension table', false],
        ['DIVIDE returns 1 whenever the numerator is a measure', false],
        ['The matrix total overrides each row with the grand total', false],
      ], 'Numerator and denominator both keep the ProductName filter from the row, so they are equal. Remove the filter the visual applies — ProductName or the whole Products table.'),
      mcq('Sales FYTD for May 2025 shows 229.8 while April + May is 90.9. January to March 2025 were 45.2, 43.6 and 50.1. What is wrong?', [
        ['TOTALYTD has no year-end argument, so it starts on 1 January', true],
        ['The date table has duplicate rows for April and May 2025', false],
        ['SAMEPERIODLASTYEAR has been nested inside TOTALYTD by mistake', false],
      ], '45.2 + 43.6 + 50.1 = 138.9, and 138.9 + 90.9 = 229.8 — a calendar YTD. "3/31" as the year-end restarts it on 1 April.'),
      mcq('YoY % shows Infinity for Edappally, which opened in July 2025. The measure is ([Total Sales] - [Sales LY]) / [Sales LY]. What is the best fix?', [
        ['Use DIVIDE so a blank last-year value returns blank', true],
        ['Replace Sales LY with Total Sales for every new store', false],
        ['Add 1 to Sales LY so the denominator is never zero', false],
        ['Filter Edappally out of the Stores table in Power Query', false],
      ], 'Sales LY is blank for a store with no history, and / divides by it anyway. DIVIDE returns blank, which is the honest answer for a store with nothing to compare to.'),
      mcq('Sales LY is blank for every month, but the date table covers both fiscal years and is marked. The chart axis uses Sales[Date] by month. What is the most likely cause?', [
        ['The visual filters Sales[Date], so the shifted dates never apply', true],
        ['SAMEPERIODLASTYEAR needs a year-end argument such as "3/31"', false],
        ['A marked date table cannot be used with SAMEPERIODLASTYEAR', false],
        ['The date table relationship must be many-to-many for shifts', false],
      ], 'The function shifts dates on the Date table, but the visual’s filter is on Sales[Date] and stays in place, so the two filters select nothing in common. Use the Date table’s columns on the axis.'),
    ],
  },

  /* ── PRACTICE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PBI_DAX_PRACTICE',
    notes: `Six exercises on one new month. Annapurna Mart's July 2025 sales — Edappally (S4, Kochi) is now open.
The dimensions are unchanged (P01 Basmati Rice ₹699, cost 520; P02 Sunflower Oil ₹155, cost 120; P03
Pressure Cooker ₹2,199, cost 1,450; P04 Mixer Grinder ₹3,499, cost 2,600; P05 Cotton Bedsheet ₹799, cost
480; S1 Hyderabad, S2 Pune, S3 Chennai, S4 Kochi; Pune is West, the rest South).

| SaleID | Date | StoreID | ProductID | CustomerID | Qty | Amount |
|---|---|---|---|---|---|---|
| 13 | 02-Jul-2025 | S4 | P01 | C101 | 2 | 1,398 |
| 14 | 05-Jul-2025 | S1 | P04 | C104 | 1 | 3,499 |
| 15 | 09-Jul-2025 | S2 | P02 | C103 | 8 | 1,240 |
| 16 | 14-Jul-2025 | S3 | P05 | C102 | 2 | 1,598 |
| 17 | 18-Jul-2025 | S4 | P03 | C104 | 1 | 2,199 |
| 18 | 23-Jul-2025 | S1 | P01 | C103 | 4 | 2,796 |
| 19 | 27-Jul-2025 | S3 | P04 | C101 | 1 | 3,499 |
| 20 | 30-Jul-2025 | S4 | P02 | C102 | 12 | 1,860 |

Write each measure, then work out by hand what it returns for July. Answers at the end.

## Exercise 1 — The basics

Total Sales, Orders, Units, Avg Order Value (with DIVIDE), Customers Who Bought.

## Exercise 2 — Cost and margin

Total Cost with SUMX and RELATED, Gross Margin, Margin %. Then give Margin % for Grocery alone.

## Exercise 3 — Shares

In a matrix by Stores[City], % of Chain = DIVIDE([Total Sales], CALCULATE([Total Sales],
REMOVEFILTERS(Stores))). Give each city's share. Then with a Region slicer set to South, what is Kochi's
share?

## Exercise 4 — CALCULATE in a matrix

Grocery Sales = CALCULATE([Total Sales], Products[Category] = "Grocery"). What does it show (a) on a card,
(b) on the Kochi row of a matrix by City, (c) on the Appliances row of a matrix by Category?

## Exercise 5 — Ranking

Write City Rank so that, in a matrix by City, each city is ranked by July sales against all cities. Give
the ranks.

## Exercise 6 — Growth and YTD

June 2025 sales (from Q1) were ₹12,293, and Q1 totalled ₹29,063. Give July's MoM % and the FYTD at the
end of July. Then explain in one sentence why the MoM figure should not be reported as "sales are
growing fast".

## Answers

**1.** Total Sales = SUM(Sales[Amount]) = **18,089**. Orders = COUNTROWS(Sales) = **8**. Units =
SUM(Sales[Qty]) = **31**. Avg Order Value = DIVIDE([Total Sales], [Orders]) = **2,261.13**. Customers
Who Bought = DISTINCTCOUNT(Sales[CustomerID]) = **4**.

**2.** Total Cost = SUMX(Sales, Sales[Qty] * RELATED(Products[UnitCost])) = 1,040 + 2,600 + 960 + 960 +
1,450 + 2,080 + 2,600 + 1,440 = **13,130**. Gross Margin = **4,959**. Margin % = 4,959 / 18,089 =
**27.41%**. Grocery: sales 1,398 + 1,240 + 2,796 + 1,860 = 7,294; cost 1,040 + 960 + 2,080 + 1,440 =
5,520; margin % = 1,774 / 7,294 = **24.32%**.

**3.** Hyderabad 6,295 → **34.80%**; Kochi 5,457 → **30.17%**; Chennai 5,097 → **28.18%**; Pune 1,240 →
**6.85%**. With the South slicer, REMOVEFILTERS(Stores) removes the Region filter too (Region is a Stores
column), so the denominator stays 18,089 and Kochi is still **30.17%**. Share within the selection would
need ALLSELECTED(Stores) or REMOVEFILTERS(Stores[City]): 5,457 / 16,849 = 32.39%.

**4.** (a) **7,294**. (b) Kochi's grocery: 1,398 + 1,860 = **3,258** (the city filter stays). (c)
**7,294** — the Category filter is replaced by Grocery.

**5.** City Rank = RANKX(ALL(Stores[City]), [Total Sales]): Hyderabad **1** (6,295), Kochi **2**
(5,457), Chennai **3** (5,097), Pune **4** (1,240).

**6.** MoM % = (18,089 − 12,293) / 12,293 = **+47.15%**. FYTD at end of July = 29,063 + 18,089 =
**47,152**. One sentence: a month of eight sales is dominated by single large orders (two mixer grinders
are 39% of July), so the change mostly reflects a few baskets, not a trend — compare a rolling or
year-on-year figure on the full data before calling it growth.`,
    mcqs: [
      mcq('For Annapurna’s July sales of ₹18,089 over 8 orders, what does Avg Order Value = DIVIDE([Total Sales], [Orders]) return?', [
        ['2,261.13', true],
        ['2,421.92', false],
        ['4,522.25', false],
        ['583.52', false],
      ], '18,089 / 8 = 2,261.125. 2,421.92 is Q1’s figure; 583.52 divides by units (31) instead of orders.'),
      mcq('July Grocery sales were 7,294 at a cost of 5,520. What is Grocery’s Margin %?', [
        ['24.32%', true],
        ['32.14%', false],
        ['75.68%', false],
        ['27.41%', false],
      ], '(7,294 − 5,520) / 7,294 = 1,774 / 7,294 = 24.32%. 32.14% divides by cost; 27.41% is July’s overall margin.'),
      mcq('% of Chain uses REMOVEFILTERS(Stores) in its denominator. With a Region slicer on South, what is Kochi’s July share (Kochi 5,457, South 16,849, chain 18,089)?', [
        ['30.17%, as the region filter is removed with Stores', true],
        ['32.39%, as the slicer limits the denominator to South', false],
        ['93.15%, which is the South share of the whole chain', false],
      ], 'Region is a column of Stores, so REMOVEFILTERS(Stores) clears the slicer’s filter in the denominator: 5,457 / 18,089 = 30.17%.'),
      mcq('In a matrix of July sales by City, Grocery Sales = CALCULATE([Total Sales], Products[Category] = "Grocery"). What is the Kochi row?', [
        ['3,258', true],
        ['7,294', false],
        ['5,457', false],
        ['1,860', false],
      ], 'The city filter stays and Category is set to Grocery: Kochi’s grocery sales are 1,398 (rice) + 1,860 (oil) = 3,258.'),
      mcq('City Rank = RANKX(ALL(Stores[City]), [Total Sales]) on July data. Which city ranks 2?', [
        ['Kochi', true],
        ['Chennai', false],
        ['Hyderabad', false],
        ['Pune', false],
      ], 'July sales: Hyderabad 6,295, Kochi 5,457, Chennai 5,097, Pune 1,240. Kochi is second.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ───────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PBI_DAX_INTERVIEW_QUESTION',
    notes: `DAX questions in analyst interviews test whether you understand context, not whether you remember
function names. Expect to explain out loud and then write a measure on a whiteboard or a shared screen.

## Q1. "What's the difference between a calculated column and a measure?"

**Model answer.** "A calculated column is computed row by row when the data refreshes and stored in the
model; it sees the current row and does not react to slicers. A measure is computed when a visual asks,
for each cell, under that cell's filter context, and stores nothing. I use columns for things I slice or
group by — a price band, an age bracket — and measures for numbers I show. Ratios must be measures: in a
retail model I worked on, margin % as a measure was 28.64%, but averaging a line-level margin column gave
28.92%, because the average weighted a ₹930 sale the same as a ₹6,998 one."

**Follow-ups:**
- *"Why does a calculated column with SUM show the same number on every row?"* — It has a row context but
  no filter context, and SUM ignores row context. CALCULATE around it triggers context transition and
  filters to the current row.
- *"Calculated column in DAX or in Power Query?"* — Power Query when it comes from source data; DAX when it
  needs the model, such as RELATED or a measure.

## Q2. "Explain CALCULATE. Write a measure for each category's share of total sales."

**Model answer.** "CALCULATE evaluates an expression under a modified filter context. It starts from the
current filters, applies its arguments — a filter on a column replaces the existing filter on that column,
REMOVEFILTERS or ALL removes filters — turns any row context into a filter, and then evaluates. Share of
total needs the current sales divided by sales with the category filter removed:

    % of Category Total =
    DIVIDE ( [Total Sales], CALCULATE ( [Total Sales], REMOVEFILTERS ( Products[Category] ) ) )

In my example Appliances was 13,996 of 29,063, so 48.16%. Because only the category filter is removed, a
region slicer still applies, so it's the share within the selected region — which I'd confirm is what the
business wants; if they want share of the whole company I'd remove the store filters too, or use
ALLSELECTED for share of what's visible."

**Follow-ups:**
- *"What's context transition?"* — When CALCULATE runs inside a row context — in a calculated column or an
  iterator — the current row becomes a filter. Every measure reference has an implicit CALCULATE, so
  calling a measure inside SUMX gives a per-row result.
- *"Why DIVIDE?"* — It returns blank instead of Infinity or NaN when the denominator is zero or blank.

## Q3. "Write year-over-year growth. What can go wrong?"

**Model answer.** "With a proper date table — contiguous, whole years, marked, related to Sales:

    Sales LY = CALCULATE ( [Total Sales], SAMEPERIODLASTYEAR ( 'Date'[Date] ) )
    YoY % = DIVIDE ( [Total Sales] - [Sales LY], [Sales LY] )

For an Indian company I'd also write fiscal YTD with TOTALYTD and a '3/31' year end. Things that go
wrong: the visual uses the fact table's date column instead of the date table, so the shift does nothing
and the result is blank; the date table doesn't include last year; a new store has no last year, so I
rely on DIVIDE to return blank; and partial periods — comparing a half-finished current month with a full
month last year makes growth look terrible, so I either compare to the same days last year or only report
complete months."

**Follow-ups:**
- *"Monthly growth?"* — DATEADD('Date'[Date], -1, MONTH) for the previous month, which crosses the year
  boundary; but in retail I'd lead with YoY because festivals distort month-on-month.
- *"Totals in a matrix look wrong — why?"* — Measures are recomputed at the total, not summed. If a rule
  applies per store, I iterate stores with SUMX(VALUES(...)) so the total follows the same rule.

## How you are judged

Say what the filter context is before you write anything, give a number from a real example, and name a
failure mode. A candidate who explains why the total row behaves as it does is rarer than one who knows
twenty functions.`,
    mcqs: [
      mcq('An interviewer asks why you used DIVIDE instead of / in a YoY % measure. Which reason is accurate?', [
        ['It returns blank, or a chosen value, when last year is zero or blank', true],
        ['It is faster, as / makes the engine iterate every row of the fact', false],
        ['It is required whenever the numerator contains another measure', false],
      ], 'DIVIDE handles a zero or blank denominator by returning BLANK or an alternate result. With a non-zero numerator, the / operator returns Infinity in that case.'),
      mcq('You are asked why YoY growth for the current month looks very negative on the 10th of the month. What is the best explanation?', [
        ['Ten days this month are compared with a whole month last year', true],
        ['SAMEPERIODLASTYEAR counts only weekdays in the current month', false],
        ['The date table drops the current month until it is complete', false],
        ['DIVIDE rounds partial months down to zero before dividing', false],
      ], 'The current month holds only the days so far, while last year’s same month is complete. Compare the same days last year, or report complete months only.'),
      mcq('An interviewer asks what a variable is in DAX. Which statement is accurate?', [
        ['A value computed once where it is defined, then used as a constant', true],
        ['A column that is added to the table each time the measure runs', false],
        ['A filter that CALCULATE re-applies every time the variable is used', false],
        ['A setting that keeps a value from one visual to the next', false],
      ], 'VAR evaluates its expression once in the current filter context; RETURN uses that value. CALCULATE cannot later change a variable already computed.'),
    ],
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PBI_DAX_CHECKPOINT',
    notes: `Ten questions on DAX the way an analyst job uses it: predicting what a measure shows in a given cell,
choosing the measure for a business question, and diagnosing one that is wrong. They use Annapurna Mart's
Q1 model (Total Sales ₹29,063; Appliances ₹13,996, Grocery ₹6,674, Kitchen ₹4,398, Home ₹3,995; Chennai
₹13,691, Hyderabad ₹8,026, Pune ₹7,346) and the chain's monthly figures in ₹ lakh. Work out each answer
from the filter context of the cell.`,
    checkpoint: [
      mcq('A matrix has Category on rows. A measure is DIVIDE([Total Sales], CALCULATE([Total Sales], REMOVEFILTERS(Products))). What does the Kitchen row show?', [
        ['15.13%', true],
        ['100.00%', false],
        ['20.25%', false],
        ['31.42%', false],
      ], 'The denominator removes every Products filter: 29,063. Kitchen is 4,398, and 4,398 / 29,063 = 15.13%. 20.25% would be its share of South only.'),
      mcq('A card shows Customers Who Bought = DISTINCTCOUNT(Sales[CustomerID]) with a Month slicer on May 2025. In May, C101, C102, C103 and C104 each bought once. What is shown?', [
        ['4', true],
        ['1', false],
        ['12', false],
        ['16', false],
      ], 'DISTINCTCOUNT counts different customer IDs among May’s four sales; each of the four customers appears once, so 4.'),
      mcq('In a matrix by City, a measure is CALCULATE([Total Sales], Stores[City] = "Chennai"). What does the Pune row show?', [
        ['13,691', true],
        ['7,346', false],
        ['Blank', false],
        ['21,037', false],
      ], 'The City filter from the row is replaced by Chennai, so every city row shows Chennai’s 13,691. KEEPFILTERS would make Pune blank.'),
      mcq('Total Cost = SUMX(Sales, Sales[Qty] * RELATED(Products[UnitCost])). Which Q1 Grocery sale contributes 720 to it?', [
        ['Sale 4: six bottles of sunflower oil at a cost of 120', true],
        ['Sale 1: two bags of basmati rice at a cost of 520', false],
        ['Sale 8: ten bottles of sunflower oil at 155 each', false],
        ['Sale 11: one bag of basmati rice at 699 each', false],
      ], 'Each row contributes Qty × UnitCost: sale 4 is 6 × 120 = 720. Sale 1 is 1,040; sale 8 is 1,200 at cost (1,550 at price).'),
      mcq('Using the chain’s figures, Sales FYTD LY = CALCULATE([Sales FYTD], SAMEPERIODLASTYEAR(\'Date\'[Date])). FY 2024-25 April–June was 42.0, 39.5 and 41.2. What does it show for June 2025?', [
        ['122.7', true],
        ['41.2', false],
        ['136.8', false],
        ['81.5', false],
      ], 'The June 2025 FYTD covers April–June; shifting back a year covers April–June 2024: 42.0 + 39.5 + 41.2 = 122.7. 136.8 is this year’s FYTD.'),
      mcq('Store Bonus = SUMX(VALUES(Stores[StoreName]), IF([Total Sales] > 8000, [Total Sales] * 0.02, 0)). Stores sold 8,026, 7,346 and 13,691. What is the total row?', [
        ['434.34', true],
        ['581.26', false],
        ['273.82', false],
        ['146.92', false],
      ], 'SUMX applies the rule to each store and adds the results: 160.52 + 0 + 273.82 = 434.34. 581.26 is 2% of the whole 29,063, the naive total.'),
      mcq('Sales Rolling 3M uses DATESINPERIOD(\'Date\'[Date], MAX(\'Date\'[Date]), -3, MONTH). With July 47.3, August 50.6 and September 55.0, what does it show for September 2025?', [
        ['152.9', true],
        ['50.97', false],
        ['289.7', false],
        ['105.6', false],
      ], 'The window is the three months ending on 30 September: 47.3 + 50.6 + 55.0 = 152.9. 50.97 is that divided by 3, which a separate average measure would show.'),
      mcq('A calculated column in Products is Product Sales = [Total Sales]. What does it hold for Sunflower Oil, whose two Q1 sales were 930 and 1,550?', [
        ['2,480', true],
        ['29,063', false],
        ['1,550', false],
        ['Blank', false],
      ], 'A measure reference in a calculated column triggers context transition, filtering Sales to the current product: 930 + 1,550 = 2,480.'),
      mcq('A measure is VAR AllSales = CALCULATE([Total Sales], REMOVEFILTERS(Stores)) RETURN DIVIDE([Total Sales], AllSales). In a matrix by City, what does Hyderabad show?', [
        ['27.62%', true],
        ['100.00%', false],
        ['36.96%', false],
        ['8,026', false],
      ], 'AllSales is computed with store filters removed: 29,063. Hyderabad’s 8,026 / 29,063 = 27.62%. The variable correctly carries its own CALCULATE.'),
      mcq('The September 2025 card shows MoM % as +8.70% and YoY % as +5.16%. A manager asks which to put in the headline of a monthly retail review. Which is the better choice, and why?', [
        ['YoY, because it compares the same season and festival timing', true],
        ['MoM, because it is the larger and more encouraging figure', false],
        ['MoM, because YoY cannot be calculated on a fiscal-year model', false],
        ['YoY, because DATEADD returns blank for month-level shifts', false],
      ], 'Retail months differ by season, festivals and pay cycles, so the same month last year is the fair comparison. MoM is useful operationally but swings with the calendar.'),
    ],
  },
];
