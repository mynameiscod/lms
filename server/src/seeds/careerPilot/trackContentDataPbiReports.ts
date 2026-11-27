/**
 * Career-track content: Power BI reports and dashboards (Data Analytics + AI, batch A3).
 *
 * DT_PBI_REPORTS — choosing and formatting visuals, interactivity (slicers, drill-through, tooltips,
 * bookmarks), designing for an audience, and publishing with refresh and row-level security, ending
 * with a sales-performance dashboard mini project.
 *
 * Everything uses the retail-chain model built in DT_PBI_MODEL and DT_PBI_DAX (Sales fact, Products,
 * Stores, Customers, Date): students already know Power Query, the star schema, the date table and
 * the core measures, so this topic is about what a reader sees and who may see it. Power BI cannot be
 * run while authoring, so only documented behaviour (Microsoft Learn) is stated; every rupee figure and
 * percentage was checked in Python. Product names are current: Power BI Desktop, Power BI Service,
 * semantic model (formerly "dataset"), on-premises data gateway.
 *
 * The topic is two-skill, so every checkpoint question names its skill with ck(): DASHBOARDING by
 * default, DATA_VISUALISATION for the VISUALS unit (its only skill) and for chart-reading questions
 * elsewhere, following trackSkillAttribution.ts.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const DASH = 'DASHBOARDING';
const VIZ = 'DATA_VISUALISATION';

export const TRACK_DATA_PBI_REPORTS_BUNDLES: PilotBundle[] = [
  /* ── VISUALS ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PBI_REPORTS_VISUALS',
    notes: `You have a clean star schema and a set of measures. None of that reaches a manager until it is on a
page, and the page is where most Power BI reports fail: twelve visuals, four colours meaning nothing, and
the one number the reader came for hidden in a corner. This unit is about choosing the visual that
answers a question, and formatting it so the answer is obvious.

## The numbers used in this topic

The retail chain from the modelling and DAX topics: 64 stores in four regions, FY 2024-25 (April to
March, from the marked Date table), measures \`[Revenue]\`, \`[Margin]\`, \`[Margin %]\`, \`[Revenue LY]\`
and \`[Revenue YoY %]\`. Figures in ₹ crore:

| Region | Revenue | Revenue LY | YoY % | Margin | Margin % |
|---|---|---|---|---|---|
| North | 18.4 | 16.9 | 8.9% | 5.70 | 31.0% |
| South | 22.6 | 19.8 | 14.1% | 6.10 | 27.0% |
| West | 20.1 | 20.6 | −2.4% | 6.43 | 32.0% |
| East | 11.3 | 10.2 | 10.8% | 2.71 | 24.0% |
| **Total** | **72.4** | **67.5** | **7.3%** | **20.94** | **28.9%** |

Notice the total row: 7.3% growth and 28.9% margin are **not** the averages of the rows (7.8% and 28.5%).
A measure is evaluated again in the total's filter context — all regions — so it divides total margin by
total revenue. That is correct, and a reader will still ask about it, so you should be able to explain it.

## Start from the question, not the visual

Write the reader's question first, then pick the visual that answers it at a glance:

| Question | Visual | Why |
|---|---|---|
| How much did we sell this year? | **Card** (or a KPI visual with a target) | One number, big |
| Are we on target? | **KPI** visual, or a card with a target and a coloured variance | Number + goal + direction |
| Which region sold most? | **Bar chart**, sorted descending | Lengths compare easily; labels fit |
| How did sales move month by month? | **Line chart** on Date[Month] | Time is continuous; a line shows trend |
| Revenue *and* margin % by month | **Line and clustered column** (combo) | Two units, one shared axis — use sparingly |
| Region × category figures to look up | **Matrix** | Rows, columns and subtotals, like a pivot |
| A list of stores with several measures | **Table** | Exact values, sortable columns |
| Where are the weak stores? | **Map** (Azure Maps) or a bar chart by city | Geography only if location matters |
| Is discount related to margin, store by store? | **Scatter** | Two measures per point |
| How did last year's ₹67.5 cr become ₹72.4 cr? | **Waterfall** by region | Shows each region's contribution to the change |
| One chart per region, same scale | **Small multiples** on a line or bar chart | Comparison without four separate visuals |

The waterfall for that last question has four steps: South +2.8, North +1.5, East +1.1 and West −0.5,
ending at 72.4. A grouped column chart of LY vs this year shows the same data, but the reader has to
subtract in their head.

## What to leave out

- **Pie and donut charts with more than three slices.** Angles are hard to compare. Four regions at
  31.2%, 27.8%, 25.4% and 15.6% of revenue look almost the same as slices; as sorted bars the order is
  obvious.
- **Gauges** for a single number. A gauge spends a large area to show one value and a target; a card or
  KPI visual says the same in a quarter of the space.
- **Tables of thousands of rows** on an overview page. Nobody reads row 2,317. Put detail on a
  drill-through page (next unit).
- **Two y-axes** unless the reader already knows both series. A combo chart can make any two lines look
  related by choosing the axis ranges.
- **Decoration**: background images, borders on every visual, drop shadows, 3D effects from custom
  visuals. Each takes attention away from the data.

## Formatting that does work

In Power BI Desktop, select a visual and open **Format visual** in the Visualizations pane.

- **Title that states the finding**: "South grew fastest; West fell 2.4%" beats "Revenue by Region".
  A title can be bound to a measure (the *fx* button) so it updates with the filters.
- **Display units.** Power BI's built-in units are Thousands, Millions, Billions and Trillions — there
  is no lakh or crore option. Indian reports usually add a measure such as
  \`Revenue (₹ cr) = DIVIDE([Revenue], 10000000)\` formatted to one decimal place, and say "₹ crore" in
  the title or axis.
- **Sort** bars by value (the "…" menu > Sort axis), not alphabetically, unless the categories have a
  natural order (months, size bands).
- **Data labels** on a few bars instead of gridlines; turn gridlines off when every bar is labelled.
- **Consistent colour**: one colour for "this year", grey for "last year" or context, and a highlight
  colour only for the thing the title is about. Set them once in a **theme** (View > Themes, or a theme
  JSON file) so every page agrees.

## Conditional formatting

For a table or matrix: Format visual > **Cell elements**, pick the column, then switch on
**Background color**, **Font color**, **Data bars**, **Icons** or **Web URL**. Each opens a dialog with a
*Format style*:

- **Gradient** — colour scale from the lowest to highest value. Good for spotting outliers in a matrix
  of store × month.
- **Rules** — "if value < 0, red; if ≥ 0.10, green". Rules on YoY % make West's −2.4% stand out.
- **Field value** — the colour comes from a measure that returns a colour code, for example:

      YoY Colour =
      SWITCH ( TRUE (),
          [Revenue YoY %] < 0, "#C0392B",
          [Revenue YoY %] < 0.05, "#E67E22",
          "#1E8449" )

  Field value is the most flexible: the same measure can colour a table cell, a bar (Format > Columns >
  Color > fx) and a card's callout value, so the rule is written once.

Use conditional formatting for the one thing the reader must notice. A matrix where every cell is a
different shade of green tells the reader nothing.

## Common mistakes

- Choosing the visual first ("let's have a map") and then looking for a question it could answer.
- A pie chart of 64 stores. Use a sorted bar chart of the top 10 (Filters pane > Top N on the visual)
  with the rest on a detail page.
- Bars sorted alphabetically, so the reader hunts for the largest.
- Revenue shown as "7,24,00,00,00" or "724M" in a report for Indian readers, instead of "₹72.4 cr".
- Conditional formatting by colour alone (red/green), which colour-blind readers cannot tell apart; add an
  icon or the sign of the number.`,
    workedExample: `**Goal: the visuals for the regional head's overview, from her questions.**

The regional head says: "Every Monday I need to know if we're ahead of last year, which region is
dragging, and whether margin is holding."

**Step 1 — Write her three questions down.**
1. Are we ahead of last year? (one number and a direction)
2. Which region is dragging? (a comparison across four regions)
3. Is margin holding? (margin % over time)

**Step 2 — One visual per question.**
1. A **card** for \`[Revenue (₹ cr)]\` = 72.4, beside a card for \`[Revenue YoY %]\` = 7.3% coloured by
   the field-value measure \`YoY Colour\` (green here).
2. A **bar chart** of \`[Revenue YoY %]\` by Stores[Region], sorted descending: South 14.1%, East 10.8%,
   North 8.9%, West −2.4%. The negative bar points left of zero, so West is visibly the problem without
   any colour at all. Data labels on; gridlines off.
3. A **line chart** of \`[Margin %]\` by Date[Month] (April to March, from the Date table so the months
   are in fiscal order), with a constant line at 28% — the board's target — added from the Analytics
   pane.

**Step 3 — Titles that answer.** "Revenue ₹72.4 cr, up 7.3% on last year"; "West is the only region
below last year"; "Margin has stayed above 28% all year" — the third title is written only after
checking the line actually stays above 28%. If it does not, the title says which months fell below.

**Step 4 — What was rejected and why.**
- A pie of revenue share by region: four slices from 15.6% to 31.2% — the order is hard to see.
- A gauge for revenue vs target: one number in a big arc; the card plus YoY % says more.
- A matrix of 64 stores: useful, but it belongs on the store detail page, not on the Monday overview.

**Check:** read the page as the regional head would, in ten seconds. You should get "ahead by 7.3%, West
is the problem, margin is fine" before reading any axis. If you cannot, a visual or title is wrong.`,
    mcqs: [
      mcq('A matrix shows Margin % of 31.0%, 27.0%, 32.0% and 24.0% for four regions, and 28.9% in the total row. A manager says the total should be 28.5%, the average. What is happening?', [
        ['The total row evaluates the measure over all regions: total margin ÷ total revenue', true],
        ['The matrix is weighting each row by its number of stores rather than by its revenue', false],
        ['Power BI rounds each row before averaging, which moves the total by 0.4 points', false],
        ['The total row is a bug that is fixed by turning on "show totals as average"', false],
      ], 'A measure is recomputed in the total row\'s filter context — all regions — so it gives 20.94 ÷ 72.4 = 28.9%. Averaging the four percentages ignores that South sells twice as much as East.'),
      mcq('A report for Indian managers must show revenue as "₹72.4 cr". What is the usual way to do it in Power BI?', [
        ['Add a measure that divides revenue by 1,00,00,000 and format it to one decimal', true],
        ['Pick "Crores" from the display units list in the visual\'s data label settings', false],
        ['Change the report\'s locale to en-IN, which switches all display units to crore', false],
        ['Store revenue in crore in Power Query and delete the original rupee column', false],
      ], 'The built-in display units are Thousands, Millions, Billions and Trillions. A measure such as DIVIDE([Revenue], 10000000) keeps the original column intact and gives a clean crore figure.'),
      mcq('You want every red/amber/green rule for YoY growth to be written once and reused on a table cell, a bar colour and a card. Which conditional formatting style fits?', [
        ['Field value, driven by a measure that returns a colour code', true],
        ['Gradient, with the minimum set to red and the maximum to green', false],
        ['Rules, typed again in each visual\'s formatting dialog', false],
        ['Data bars, which carry their colour to any other visual', false],
      ], 'A measure that returns "#C0392B" or "#1E8449" can be used as the field value in any visual\'s colour setting, so changing a threshold happens in one place.'),
    ],
    checkpoint: [
      ck(VIZ, 'Revenue moved from ₹67.5 cr last year to ₹72.4 cr this year: South +2.8, North +1.5, East +1.1, West −0.5. Which visual shows how each region contributed to the change?', [
        ['A waterfall chart with one step per region', true],
        ['A donut chart of this year\'s revenue share', false],
        ['A gauge with last year as its target value', false],
        ['A scatter plot of revenue against last year', false],
      ], 'A waterfall starts at one total, adds or subtracts each category\'s change, and ends at the other total — exactly "how did 67.5 become 72.4".'),
      ck(VIZ, 'Four regions have 31.2%, 27.8%, 25.4% and 15.6% of revenue. The current visual is a pie chart. Why would a sorted bar chart serve the reader better?', [
        ['Bar lengths on a common baseline are easier to rank than slice angles', true],
        ['A pie chart in Power BI cannot show more than three categories at once', false],
        ['Bars show the exact percentages, while pies can only show rupee values', false],
        ['Pie charts ignore slicers, so the shares never change with the filters', false],
      ], 'People compare lengths far more accurately than angles. Pies can show percentages and do respond to slicers; the problem is purely perceptual.'),
      ck(VIZ, 'A line chart of Margin % by month shows the months as April, August, December, February… What fixes the order?', [
        ['Use the Date table\'s month column, sorted by its month-number column', true],
        ['Change the line chart into a column chart, which keeps the input order', false],
        ['Turn on data labels so the reader can find each month by its value', false],
        ['Rename the months to 01-Apr, 02-May and so on in the Sales table', false],
      ], 'Text sorts alphabetically. A Date table month-name column set to "Sort by column" on a fiscal month number keeps April to March in order on every visual.'),
    ],
  },

  /* ── INTERACTIVITY ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PBI_REPORTS_INTERACTIVITY',
    notes: `A static chart answers the question you thought of. An interactive report lets the reader answer the
next one — "and in the South?", "which stores?", "what about last quarter?" — without asking you for a
new report. Power BI gives you five tools for this, and each has a job.

## 1. Cross-filtering between visuals

Click a bar on a report page and the other visuals on that page react. By default:

- Most visuals **cross-highlight**: a column chart of revenue by category keeps its full bars and shows
  the South portion darker.
- Cards, tables and some others **cross-filter**: the revenue card changes from ₹72.4 cr to ₹22.6 cr when
  you click South.

You control this per pair of visuals: select the source visual, then **Format > Edit interactions**. Each
other visual shows small icons — **Filter**, **Highlight** or **None**. Set a "Total company revenue" card
to **None** if it must never change, and a monthly trend line to **Filter** if a highlighted line would
confuse the reader.

Ctrl+click selects several data points (South and East together: ₹33.9 cr).

## 2. Slicers

A slicer is a visual whose only job is filtering. Common types (Format > Slicer settings > Style):

| Style | Use for |
|---|---|
| Vertical list / Tile | A few values: four regions, three channels |
| Dropdown | Many values: 64 stores, 400 products |
| Between | A numeric or date range: discount between 0% and 10% |
| Relative date | "Last 3 months", "this fiscal year" — moves with today's date |

Good habits:

- Slice with the **dimension** columns (Stores[Region], Date[Fiscal Year]), never the fact table's own
  copies, so the filter flows down the one-to-many relationships to Sales.
- **Sync slicers** (View > Sync slicers) keeps a Fiscal Year slicer on every page in step, and can keep it
  visible on one page while still applying it on the others.
- Show the user what is selected — a card with a measure such as
  \`Selected Region = SELECTEDVALUE(Stores[Region], "All regions")\` — because a slicer scrolled out of
  view is a common reason for "the numbers are wrong".

## 3. The Filters pane

Three levels, applied in addition to slicers:

- **Filters on this visual** — e.g. Top N: the 10 stores by revenue.
- **Filters on this page** — e.g. Channel = "Store" for an in-store-only page.
- **Filters on all pages** — e.g. exclude the test store "ZZ-Training".

Filters you set and then **lock** or **hide** (the icons on the filter card) stay fixed for readers. Hidden
filters are the ones that later confuse people — put a note in the page subtitle when a page excludes
something.

## 4. Drill-down and drill-through

**Drill-down** moves through a **hierarchy** inside the same visual. Put Date[Fiscal Year], Date[Quarter]
and Date[Month] on the axis of a column chart; the drill arrows on the visual's header let the reader
click FY 2024-25 to see its quarters, then a quarter to see its months. "Expand all down one level"
shows every quarter at once.

**Drill-through** moves to **another page** about one item. The pattern:

1. Make a page called "Store detail" with the store's KPIs, a monthly trend and a table of its top
   products.
2. Drag **Stores[Store Name]** into the page's **Drill through** well (in the Visualizations pane). Power BI
   adds a **back button** automatically.
3. Decide **Keep all filters**: on, and the slicers from the source page (fiscal year, channel) travel
   with the reader; off, and only the store itself is passed.
4. On the overview, right-click a store's bar > **Drill through > Store detail**.

The drill-through option only appears on visuals whose data points include the drill-through field — a
bar chart of revenue by **region** cannot drill through to a **store** page, because a bar there is a
region, not one store.

## 5. Tooltips and report-page tooltips

Every visual has a default tooltip showing the values under the cursor. Add more measures to the
visual's **Tooltips** well — hovering on a region bar can show its Margin % and YoY % too.

A **report-page tooltip** is a small page shown on hover:

1. Create a page; in Format page > Page information turn on **Allow use as tooltip**, and set Canvas
   settings > Type to **Tooltip** (a small canvas).
2. Put a mini line chart of the last 12 months' revenue and a margin card on it.
3. On the overview's bar chart, Format > Tooltips > Type: **Report page**, and pick the page.

Now hovering on "Pune — FC Road" shows that store's 12-month trend without leaving the page.

## 6. Bookmarks, the Selection pane and buttons

A **bookmark** (View > Bookmarks > Add) saves the page's current state: filters and slicers, which
visuals are visible, sort order, drill level. You can choose what each bookmark captures (**Data**,
**Display**, **Current page**) from its "…" menu.

Two common uses:

- **A guided story**: "All India" → "South only" → "West stores below last year" as three bookmarks, shown
  in order with View > Bookmarks > View, like slides.
- **A chart/table toggle**: put a chart and a table in the same spot; in the **Selection pane** hide one,
  bookmark it, hide the other, bookmark again (with **Data** unticked, so the toggle does not reset the
  slicers). Two buttons with Action > Type: **Bookmark** switch between them.

A **bookmark navigator** or **page navigator** (Insert > Buttons > Navigator) builds the buttons for you.

## Common mistakes

- A "drill-through" that is really a hyperlink to another report, so every filter is lost.
- Bookmarks that capture Data by accident: clicking "Show table" also resets the reader's region slicer.
- Every visual cross-highlighting every other, so one click turns the page into a puzzle. Decide the
  interactions on purpose.
- A slicer on Sales[Region] that the Stores-based visuals ignore, when Stores[Region] was the column to
  use.`,
    workedExample: `**Goal: let the regional head go from "West is down 2.4%" to the stores responsible, in two clicks.**

**Start:** the overview page has a bar chart of \`[Revenue YoY %]\` by Stores[Region] and a Fiscal Year
slicer set to FY 2024-25.

**Step 1 — A store bar chart that follows the region.** Add a bar chart of \`[Revenue YoY %]\` by
Stores[Store Name], with a visual-level Top N filter of the **bottom 10** stores by \`[Revenue YoY %]\`.
With default interactions, clicking West on the region chart cross-filters it to West's stores. Check in
Format > Edit interactions that it is set to **Filter**, not Highlight — a highlighted bar chart would still
rank all 64 stores.

**Step 2 — A drill-through page.** New page "Store detail":
- Drill through well: Stores[Store Name]; Keep all filters: **on**, so FY 2024-25 travels with the reader.
- Cards: \`[Revenue (₹ cr)]\`, \`[Revenue YoY %]\`, \`[Margin %]\`.
- A line chart of \`[Revenue]\` and \`[Revenue LY]\` by Date[Month].
- A table of Products[Category] with \`[Revenue]\` and \`[Revenue YoY %]\`, conditional formatting by rules
  on the YoY column.
- The page title is a measure: \`"Store: " & SELECTEDVALUE(Stores[Store Name])\`.

**Step 3 — Try it.** On the overview, click West; the store chart shows West's ten weakest stores.
Right-click "Surat — Ring Road" > Drill through > Store detail. The detail page shows that one store, for
FY 2024-25, with its own trend. The back button returns to the overview with West still selected.

**Step 4 — Hover detail without leaving the page.** Make a tooltip page with a 12-month line and a Margin %
card, and set the store bar chart's tooltip type to that page.

**Check:** on the detail page, expand the Filters pane. It should list Store Name = Surat — Ring Road
and Fiscal Year = FY 2024-25, and the revenue card should match that store's bar on the overview. If the
card shows ₹72.4 cr, the page was opened without a drill-through (see the Debugging unit).`,
    mcqs: [
      mcq('Clicking "South" on a region bar chart changes the "Total company revenue" card from ₹72.4 cr to ₹22.6 cr, but the card must always show the whole company. What do you change?', [
        ['In Edit interactions on the bar chart, set the card to None', true],
        ['Move the card onto its own page so no slicer reaches it', false],
        ['Turn off cross-highlighting for the whole report in Options', false],
        ['Pin the card to a dashboard so it stops responding to clicks', false],
      ], 'Edit interactions controls how one visual affects each other visual. Setting the card to None keeps it at the company total while the other visuals still follow the click.'),
      mcq('A store drill-through page uses Stores[Store Name] in its Drill through well. On the overview, right-clicking a bar in the "Revenue by Region" chart offers no Drill through option. Why?', [
        ['A bar in that chart is a region, so it carries no single store to pass', true],
        ['Drill-through only works from table and matrix visuals, not bar charts', false],
        ['The drill-through page must be placed before the overview in the tabs', false],
        ['Keep all filters is off, which hides the drill-through menu entirely', false],
      ], 'Drill-through is offered when the clicked data point includes the drill-through field. A store-level bar chart or table can drill through; a region-level one cannot.'),
      mcq('A "Show table / Show chart" pair of bookmark buttons also resets the reader\'s Region slicer every time it is clicked. What is the cause?', [
        ['Both bookmarks were saved with Data captured, so they restore the slicer state', true],
        ['The table and the chart were placed on different layers in the Selection pane, so they clash', false],
        ['Buttons can only trigger page navigation, so the page reloads from scratch', false],
        ['The Region slicer was not synced, so bookmarks cannot read its current value', false],
      ], 'A bookmark that captures Data restores the filters it was saved with. Untick Data for display-only toggles so they change only which visuals are visible.'),
    ],
    checkpoint: [
      ck(DASH, 'A report page needs a Fiscal Year slicer that filters all five pages but is visible only on the overview. What does that?', [
        ['Sync slicers, with the slicer synced on all pages and visible on one', true],
        ['A page-level filter on the overview page, copied onto each other page', false],
        ['A bookmark per page that captures the overview slicer selection', false],
        ['A report-page tooltip holding the slicer, shown on every page', false],
      ], 'The Sync slicers pane has separate "sync" and "visible" ticks per page, so one slicer can apply everywhere and appear only where you want it.'),
      ck(DASH, 'A column chart has Date[Fiscal Year], Date[Quarter] and Date[Month] on its axis. What does a reader get by using its drill-down arrows?', [
        ['The same visual, moving from years to quarters to months', true],
        ['A new page about the one quarter the reader clicked on', false],
        ['A pop-up page with the month trend shown on hover', false],
        ['Three separate visuals, one for each level of the axis', false],
      ], 'Drill-down moves through a hierarchy inside the same visual. Moving to another page about one item is drill-through; a pop-up page on hover is a report-page tooltip.'),
      ck(VIZ, 'Ctrl+clicking South (₹22.6 cr) and East (₹11.3 cr) on a region chart, with default interactions, makes the revenue card show what?', [
        ['₹33.9 cr', true],
        ['₹72.4 cr', false],
        ['₹11.3 cr', false],
        ['₹22.6 cr', false],
      ], 'Ctrl+click selects several data points, and a card is cross-filtered by the selection: 22.6 + 11.3 = 33.9.'),
    ],
  },

  /* ── DASHBOARD_DESIGN ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PBI_REPORTS_DASHBOARD_DESIGN',
    notes: `A dashboard is not "all the charts". It is a page built for one kind of reader and the decisions that
reader takes. The same data makes a different page for the CFO, a regional head and a store manager —
and a page trying to serve all three serves none.

## Start with who reads it and what they decide

Write three lines before opening Power BI Desktop:

| | CFO | Regional head (South) | Store manager (Chennai — T Nagar) |
|---|---|---|---|
| Looks at it | Monthly, in a review | Every Monday | Every morning |
| Decides | Targets, budgets, which region to invest in | Which stores need a visit, where to move stock | What to reorder, which staff to roster |
| Needs | Revenue, margin, growth vs plan, by region | Store ranking, YoY, margin by category | Yesterday's sales, top/bottom products, stock-outs |
| Detail level | Region, quarter | Store, month | Product, day |

Each column is a different page (or a different report). If someone asks for "a dashboard", ask them to
fill in this table first.

## KPIs first, then context, then detail

A common shape, read top-left to bottom-right:

1. **Top band — 3 to 5 KPI cards.** Revenue, YoY %, Margin %, Orders, Average order value. Each card
   shows the value, a comparison (vs LY or vs target) and direction by colour **and** sign.
2. **Middle — the "where" and "when".** A bar chart by region or store (sorted) and a monthly trend line.
3. **Bottom or a drill-through page — the detail.** A table of stores or products, only for the people
   who need it.

A rule some teams use is **3–30–300**: the main message in 3 seconds (the KPI band), the explanation in
30 seconds (the charts), the detail in 300 seconds (tables and drill-through).

## Layout and consistency

- **Canvas**: the default 16:9 page (1280 × 720) fits a laptop and a projector. Do not make the page
  scroll unless it is a deliberately long page.
- **Grid**: align visuals to the gridlines (View > Gridlines, Snap to grid) and keep equal gaps; uneven
  edges make a page feel unfinished.
- **One theme**: a report theme sets fonts and colours for every visual. Use the same colour for the same
  thing on every page — if "this year" is navy on the overview it is navy on the store page.
- **Few visuals per page**: six to eight is plenty. More visuals mean more queries (slower), and more
  places for the eye to go.
- **Words**: a page title, a subtitle that says what is filtered ("FY 2024-25 · all channels · excludes
  franchise stores") and titles that state findings.

## Accessibility

- Do not rely on red and green alone; add a ▲/▼ icon or a sign.
- Add **alt text** to each visual (Format > General > Alt text) for screen-reader users.
- Set the **tab order** in the Selection pane so keyboard users move through visuals in reading order.
- Check contrast: light grey text on white is unreadable on a projector.

## Mobile layout

Store managers open the report on a phone. In Power BI Desktop, **View > Mobile layout** gives a
phone-shaped canvas where you drag in the visuals you want, in a single column: the KPI cards, then one
chart, then the slicer. A page without a mobile layout still opens on a phone, but as the shrunken
desktop page.

## Performance

A dashboard that takes 15 seconds to load will not be opened every morning.

- **Performance analyzer** (View > Performance analyzer > Start recording > Refresh visuals) lists every
  visual with its **DAX query**, **Visual display** and **Other** times in milliseconds. Sort by total and
  look at the slowest first.
- Common causes: a table visual with tens of thousands of rows; many visuals on one page each running a
  query; a slow measure (see the DAX topic); high-cardinality columns like a transaction ID on an axis.
- Fixes: move detail tables to a drill-through page, reduce visuals per page, use Top N filters, and fix
  the slowest measure rather than everything.

## Common mistakes

- One page for every audience, so the CFO scrolls past stock-outs and store managers past budgets.
- KPI cards with no comparison: "₹72.4 cr" alone does not say if that is good.
- Decorative backgrounds, logos taking a fifth of the page, and borders on every visual.
- A page subtitle missing, so nobody knows the numbers exclude franchise stores.`,
    mcqs: [
      mcq('A store manager checks the report on a phone each morning before opening the shop. What does she most need on the first screen?', [
        ['Yesterday\'s sales vs the same day last week, and her low-stock products', true],
        ['The four-region revenue waterfall for the full fiscal year so far, by quarter', false],
        ['A matrix of all 64 stores by month with conditional formatting', false],
        ['A scatter of discount against margin for every store in India', false],
      ], 'Design starts from what the reader decides: a store manager decides today\'s reorders and staffing, so yesterday and stock come first. Region and all-store views belong to other audiences.'),
      mcq('Performance analyzer shows a store table visual taking 2,400 ms for its DAX query and 3,100 ms for visual display, while the other six visuals take under 300 ms each. What is the sensible first fix?', [
        ['Move the large table to a drill-through page or limit it with a Top N filter', true],
        ['Remove the six fast visuals, since together they add up to more total waiting time', false],
        ['Switch the whole page to a dark theme so the visuals render faster', false],
        ['Add a second slicer so the page runs fewer queries on each refresh', false],
      ], 'Start with the slowest visual. A table rendering thousands of rows is slow both to query and to draw; showing it only when someone drills into a store fixes both.'),
      mcq('A KPI card shows "Margin % 28.9%" in a large font and nothing else. What should be added so the reader can judge it in three seconds?', [
        ['A comparison — vs target or last year — with direction shown by sign and colour', true],
        ['A border and a drop shadow so the card stands out from the other visuals', false],
        ['A gauge beside it, scaled from 0% to 100%, showing the same 28.9% value', false],
        ['The full margin formula in the card title so readers know how it is made', false],
      ], 'A number alone cannot be judged. Against a 28% target or last year\'s value, with ▲/▼ as well as colour, the reader knows at once whether 28.9% is good.'),
    ],
    checkpoint: [
      ck(DASH, 'A head of finance asks for "one dashboard for everyone — the CFO, regional heads and all 64 store managers". What is the best first step?', [
        ['Find out what each group decides and design separate pages or reports', true],
        ['Put every chart on one long scrolling page so everybody finds theirs', false],
        ['Build the CFO view first, since it has the most important audience', false],
        ['Add a slicer for each job role and let users filter the page to theirs', false],
      ], 'Different readers take different decisions at different levels of detail and frequency. A page per audience, from a shared model, serves each of them.'),
      ck(DASH, 'A store manager opens the report on a phone and sees the whole desktop page shrunk to fit. What was skipped in Power BI Desktop?', [
        ['Arranging the page in View > Mobile layout', true],
        ['Publishing the report to a separate workspace', false],
        ['Setting the canvas size to 1280 × 720 pixels', false],
        ['Turning on Snap to grid in the View tab', false],
      ], 'Without a mobile layout, the phone app shows the desktop page scaled down. Mobile layout lets you pick and stack the visuals that matter on a phone.'),
      ck(VIZ, 'A dashboard shows YoY growth in green when positive and red when negative, with no other marker. Which reader is let down, and what fixes it?', [
        ['Colour-blind readers; add a ▲/▼ icon or a sign beside each value', true],
        ['Mobile readers; increase the font size of the coloured values', false],
        ['Screen-reader users; switch the colours to a blue–orange palette', false],
        ['Printing readers; turn on a dark theme for the whole report', false],
      ], 'Red–green colour blindness is common. Encoding the direction twice — colour plus an icon or sign — keeps the meaning for everyone.'),
    ],
  },

  /* ── PUBLISH_SHARE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PBI_REPORTS_PUBLISH_SHARE',
    notes: `A .pbix file on your laptop is a prototype. A report becomes useful when the right people can open it
in a browser, it shows this morning's data without you touching it, and each person sees only what they
are allowed to see. That is the Power BI Service's job.

## Publishing

In Power BI Desktop, **Home > Publish**, sign in with your work account, and pick a **workspace**.
Publishing creates two items in the Service:

- a **semantic model** (called a "dataset" until 2023 — you will still see the old word in older articles
  and job descriptions): the tables, relationships and measures, plus the data if it is Import mode;
- a **report** connected to it.

Several reports can share one semantic model, which keeps "Revenue" meaning the same thing everywhere.

## Workspaces, roles and apps

- **My workspace** is personal. Do not build team reports there.
- A **workspace** is a shared area with four roles:

| Role | Can |
|---|---|
| Admin | Everything, including adding and removing people |
| Member | Publish, edit and share content; add Contributors and Viewers |
| Contributor | Publish and edit content |
| Viewer | View and interact only |

- An **app** is the clean way to give reports to readers: from the workspace, publish an app with a
  chosen set of reports, a navigation menu and **audiences** (different groups can see different
  reports in the same app). Readers install the app and see a tidy product; you keep working in the
  workspace and update the app when ready.
- You can also **share** a single report with named people, or send a link — fine for a handful of
  colleagues, hard to manage for 64 store managers.
- **Publish to web** creates a public link that anyone on the internet can open, with no sign-in. Never
  use it for company data.

**Licences, briefly**: to publish and share you need **Power BI Pro** (or Premium Per User). Readers also
need Pro — unless the workspace sits on **Premium capacity** or a **Fabric capacity of F64 or larger**, in
which case free-licence users can view. Ask what your company has before promising "everyone can see it".

## Refresh

With Import mode, the semantic model is a copy of the data taken at the last refresh.

- **Scheduled refresh**: on the semantic model's settings in the Service, set the times. On Pro (shared
  capacity) you get up to **8 scheduled refreshes a day**; on Premium or Fabric capacity, up to **48**.
- **Data source credentials** are stored on the semantic model's settings. When a password changes, the
  next refresh fails until the credentials are updated.
- **The on-premises data gateway** is needed when the source is inside the company network — a SQL
  Server in the head-office data centre, or Excel files on a file share. The Service is in the cloud and
  cannot reach those by itself; the gateway is a program installed on an always-on machine inside the
  network that the Service calls for each refresh. Use the **standard mode** gateway for shared reports
  (**personal mode** is only for one person's own content). Cloud sources (Azure SQL Database,
  SharePoint Online, Dataverse) usually need no gateway.
- Turn on **refresh failure notifications**. The Service also disables a schedule after repeated
  consecutive failures, and pauses it if nobody has opened content built on the model for about two
  months — "the report stopped updating" is often one of these.
- Put a **"Data as of"** card on every page — for example a measure returning the latest date in Sales —
  so a reader can see when the data is stale.

**Incremental refresh** (supported on Pro as well as Premium) refreshes only recent partitions — say, the
last 10 days — instead of reloading five years of sales each time. It needs RangeStart/RangeEnd parameters
in Power Query; set it up once the model is large enough to make full refreshes slow.

## Row-level security (RLS)

The chain has four regional heads. Each must see only their region's stores; the CFO sees everything.
RLS filters rows of the model for each user, so one report serves all of them.

**Step 1 — Define roles in Power BI Desktop.** Modeling > **Manage roles** > New role. A **static** role
filters a table with a DAX expression:

    Role "South"   on table Stores:   [Region] = "South"

Because Stores filters Sales through the one-to-many relationship, a South user's revenue card shows
₹22.6 cr, and every visual shows South stores only. Products and Customers are not filtered — a South
user can still see the full product list, with South's sales against it.

**Step 2 — Prefer dynamic RLS when there are many users.** Four static roles are manageable; 64 store
managers are not. Keep a small table **UserRegion** (Email, Region) maintained by HR or the business, and
use one role:

    Role "Regional access"   on table Stores:
    [Region] IN
        CALCULATETABLE (
            VALUES ( UserRegion[Region] ),
            UserRegion[Email] = USERPRINCIPALNAME ()
        )

\`USERPRINCIPALNAME()\` returns the signed-in user's sign-in name, usually their work email. A user with two
rows (South and East) sees both regions — ₹33.9 cr. A user with no rows sees no stores, and therefore
empty visuals. Hide the UserRegion table from report view so nobody builds a visual on it.

**Step 3 — Test in Desktop.** Modeling > **View as** > tick the role, and for dynamic RLS tick **Other
user** and type an email. Check the revenue card shows the expected region's figure.

**Step 4 — Assign people in the Service.** Open the semantic model's **Security** page, pick the role and
add users or (better) security groups. Use **Test as role** there to check again.

**The rule that catches everyone**: RLS applies to people with the **Viewer** role in the workspace (and
to app and shared-link readers). Workspace **Admins, Members and Contributors** can edit the model, so RLS
does not restrict them. A regional head added as a Member will see every region.

## Common mistakes

- Publishing to My workspace and sharing from there; when you leave the company, so does the report.
- A refresh that has been failing for a week because the gateway machine was switched off.
- RLS on the Sales table by typing region names into a role per person — 64 roles to maintain.
- Testing RLS while signed in as the workspace admin and concluding "RLS does not work".`,
    mcqs: [
      mcq('A scheduled refresh of a report built on a SQL Server in the company\'s Hyderabad data centre fails, while a report built on SharePoint Online refreshes fine. What is the most likely missing piece?', [
        ['An on-premises data gateway the Service can use to reach that SQL Server', true],
        ['A Premium capacity, because SQL Server is a Premium-only data source', false],
        ['A second publish of the report, since a refresh only covers cloud sources', false],
        ['A Viewer role for the Service in the workspace that holds the report', false],
      ], 'The Service runs in the cloud and cannot reach a server inside the company network by itself. A standard-mode on-premises data gateway inside the network makes that connection for each refresh.'),
      mcq('A dynamic RLS role filters Stores with [Region] IN the UserRegion rows for USERPRINCIPALNAME(). Meera has two rows in UserRegion: South (₹22.6 cr) and East (₹11.3 cr). As a Viewer, what does her revenue card show?', [
        ['₹33.9 cr — the stores in both of her regions', true],
        ['₹22.6 cr — only the first row that matches her email', false],
        ['₹72.4 cr — two matching rows switch the filter off', false],
        ['An error, because a user may only have one region', false],
      ], 'VALUES returns both regions for her email, and the IN test keeps stores in either one, so revenue is 22.6 + 11.3 = 33.9.'),
      mcq('The 64 store managers must get the sales report, but the analysts keep changing pages in the workspace. Which way of sharing fits best?', [
        ['Publish an app from the workspace, with the managers as an audience', true],
        ['Add all 64 managers as Members of the same workspace the analysts use', false],
        ['Use Publish to web and send the link to the managers by email', false],
        ['Export the report to PDF every morning and mail it to the managers', false],
      ], 'An app gives readers a stable, curated version and is updated only when you republish it. Members could edit the content and are not restricted by RLS; Publish to web makes the data public.'),
    ],
    checkpoint: [
      ck(DASH, 'A regional head who was added to the workspace as a Member says she sees every region, although the South role is assigned to her and works for others. Why?', [
        ['RLS does not restrict workspace Admins, Members or Contributors', true],
        ['RLS only takes effect after the next scheduled refresh has run', false],
        ['Her email is in mixed case, so the South role filter fails to match', false],
        ['RLS roles must be re-created in the Service after every publish', false],
      ], 'RLS applies to Viewers and to people reading through an app or a share. Members can edit the model, so they see all rows. Give report readers the Viewer role or app access.'),
      ck(DASH, 'A report must show sales data that is never more than an hour old during a 12-hour business day. The workspace is on a Pro licence with an Import-mode model. What is the problem?', [
        ['Pro allows at most 8 scheduled refreshes a day, so hourly needs 12', true],
        ['Import-mode models can be refreshed only once a day on any licence', false],
        ['Scheduled refresh on Pro needs a gateway even for cloud data sources', false],
        ['Pro refreshes only at whole hours, so one refresh is always missed', false],
      ], 'Shared capacity allows up to 8 scheduled refreshes a day; Premium or Fabric capacity allows up to 48. The alternatives are a capacity, a different storage mode, or relaxing the requirement.'),
      ck(DASH, 'A role on the Stores table has the filter [Region] = "South". The model has Stores → Sales and Products → Sales, both one-to-many, single direction. What does a South user see?', [
        ['South\'s sales only, while the Products list stays complete', true],
        ['South\'s sales only, and only products that South has sold', false],
        ['All sales, because the role was put on Stores, not on Sales', false],
        ['Nothing, because the Products table has no Region column', false],
      ], 'The role filters Stores, and Stores filters Sales through the relationship. With single-direction filters, Sales does not filter Products, so the product list stays whole.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PBI_REPORTS_DEBUGGING',
    notes: `Power BI report bugs rarely show an error. The page renders, the numbers look plausible, and a manager
acts on them. Below are eight faults from real reports on the retail-chain model — the symptom someone
reports, the cause, and the fix. Change one thing, then check the same number again.

## 1. "The matrix total is wrong"

**Symptom:** a matrix of Customers by region shows North 41,200, South 52,800, West 47,500 and East 23,900
distinct customers, and a total of 1,51,600. The rows add to 1,65,400. A manager says the total is wrong.
**Cause:** nothing is broken. \`[Customers] = DISTINCTCOUNT(Sales[CustomerKey])\` is evaluated again for the
total, over all regions. A customer who bought in two regions is one customer in the total but appears in
two rows, so the rows over-count by 13,800. The same happens with
Margin % (total 28.9%, not the 28.5% average) and averages.
**Fix:** explain it on the page — a subtitle such as "a customer who shops in two regions is counted once
in the total". If the reader genuinely needs the sum of the rows (for example a sum of monthly
targets), write the measure to iterate over the rows (SUMX over VALUES of the row column) — but only when
that number means something.

## 2. A measure is blank for some rows

**Symptom:** in a store table, \`[Revenue YoY %]\` is blank for 6 of the 64 stores.
**Cause:** those stores opened this fiscal year. \`[Revenue LY]\` is blank for them, and
\`DIVIDE([Revenue] - [Revenue LY], [Revenue LY])\` returns blank when the denominator is blank — exactly what
DIVIDE is designed to do.
**Fix:** the blank is correct; label it. Add a column or tooltip "New store — opened Aug 2024", or a
measure that returns the text "New" for them. Do not replace it with 0%, which says "no growth".

## 3. A slicer filters nothing

**Symptom:** choosing "Chennai" in a City slicer changes nothing on the page.
**Cause** — one of three, check in this order:
1. The slicer uses Sales[City], a column copied into the fact table, while the visuals use Stores-based
   measures and columns; or it uses a column of a table with no relationship to Sales.
2. **Edit interactions** for the slicer is set to None for those visuals.
3. The relationship from Stores to Sales is **inactive** (a dotted line in Model view).
**Fix:** slice on Stores[City]; check the interactions; check the relationship in Model view.

## 4. Time-intelligence measures are blank on a chart

**Symptom:** \`[Revenue LY]\` works in a card but is blank on a line chart by month.
**Cause:** the chart's axis is **Sales[OrderDate]** (or its auto date hierarchy), not the Date table. The
time-intelligence functions work through the marked Date table, which a fact-table date column does not
filter in the same way.
**Fix:** put Date[Month] (or Date[Date]) on the axis. While you are there, check that **Auto date/time**
is off (File > Options > Data load) so nobody builds charts on the hidden auto tables, and that the Date
table is marked and covers every date in Sales — the DAX topic's rules.

## 5. The many-to-many surprise

**Symptom:** a Budget table is at **category × month** grain and related to Products on Category (a
many-to-many relationship). A matrix of Products[Subcategory] shows Mobiles ₹4.0 cr, Laptops ₹4.0 cr and
Accessories ₹4.0 cr budget — and an Electronics total of ₹4.0 cr, not ₹12.0 cr.
**Cause:** the budget does not exist at subcategory level. Each subcategory row filters Products to that
subcategory, which still maps to the Electronics budget row, so every row shows the whole category's ₹4.0
cr; the total is the one budget, not the sum.
**Fix:** show budget only at the grain it exists. Hide it below category level with a measure that
returns BLANK() when \`ISINSCOPE(Products[Subcategory])\` is true, or allocate the budget to subcategories
in Power Query if the business agrees how.

## 6. A regional head sees every region

**Symptom:** the South role is assigned to Anita and "View as" in Desktop shows South only, but in the
Service she sees all four regions.
**Cause:** Anita is a **Member** of the workspace. RLS only restricts Viewers and app or share readers.
**Fix:** make her a Viewer (or give her the app), and test with **Test as role** in the semantic model's
Security page.

## 7. The report shows last Tuesday's numbers

**Symptom:** on Friday the "Data as of" card says Tuesday.
**Cause:** scheduled refresh has failed since Wednesday. Typical reasons: the gateway machine was
restarted or switched off, the SQL login's password changed (stale data source credentials), or the
schedule was disabled after repeated failures.
**Fix:** open the semantic model's **Refresh history**, read the error, fix the gateway or credentials,
run **Refresh now**, and turn on failure notifications so you hear first next time.

## 8. The store page shows company totals

**Symptom:** a manager opens "Store detail" and its cards show ₹72.4 cr — the whole company — instead of
one store.
**Cause:** she reached the page from the page tabs (or a page navigator button), not by drilling through.
Without a drill-through, nothing passes a store to the page, so its visuals show every store.
**Fix:** hide drill-through pages (right-click the page tab > Hide page) so they are reached only by
drilling through, leave them out of any page navigator, and add a card with
\`SELECTEDVALUE(Stores[Store Name], "No store selected — drill through from the overview")\` so the
problem explains itself if it happens again.

## The habit

For every surprising number: check what the filter pane says is applied, which column the visual uses
(dimension or fact), and what the measure does in a total. Most report bugs are one of those three.`,
    mcqs: [
      mcq('In a store table, [Revenue YoY %] is blank for 6 stores that opened in August 2024. The measure is DIVIDE([Revenue] - [Revenue LY], [Revenue LY]). What should you do?', [
        ['Leave the blank and label those stores as new, since no prior-year base exists', true],
        ['Wrap the measure so blanks become 0%, which shows the stores had no growth', false],
        ['Replace DIVIDE with the / operator so the missing values are calculated', false],
        ['Remove the six stores from the model so the table has no gaps in it', false],
      ], 'With no last-year revenue there is no growth rate. DIVIDE returning blank is correct; 0% would claim flat sales, and / would give an error or infinity.'),
      mcq('A matrix by subcategory shows the same ₹4.0 cr budget on Mobiles, Laptops and Accessories, and ₹4.0 cr as the Electronics total. The Budget table is at category × month grain. What is the cause?', [
        ['Budget exists only per category, so each subcategory row shows the whole category\'s figure', true],
        ['The Budget relationship is inactive, so the matrix shows the first budget value it finds', false],
        ['Subcategory is sorted by a different column, which copies values from the first row', false],
        ['The matrix total is set to "first" instead of "sum" in the visual\'s total settings', false],
      ], 'A subcategory still belongs to Electronics, which has one budget row, so every subcategory shows ₹4.0 cr. Show budget only at category level, or allocate it.'),
      mcq('A line chart of [Revenue] and [Revenue LY] by month shows Revenue but leaves Revenue LY blank. The same LY measure works in a card. What do you check first?', [
        ['Whether the chart\'s axis is a Sales date column instead of the Date table', true],
        ['Whether the chart has data labels turned on for both of its line series', false],
        ['Whether the card and the chart are on the same page of the report', false],
        ['Whether Revenue LY has been formatted as a percentage instead of currency', false],
      ], 'Time-intelligence measures rely on the marked Date table. An axis taken from the fact table does not give them the date filter they need.'),
      mcq('On Friday, the "Data as of" card shows Tuesday. Where do you look first?', [
        ['The semantic model\'s refresh history in the Power BI Service', true],
        ['The report\'s Performance analyzer pane in Power BI Desktop, page by page', false],
        ['The workspace role list, in case readers were made Viewers', false],
        ['The theme JSON file, in case the card format was changed', false],
      ], 'Stale data means refresh has not succeeded. Refresh history shows each attempt and its error — usually a gateway that is offline or expired credentials.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PBI_REPORTS_PRACTICE',
    notes: `Six exercises on the retail-chain model. Work each on paper (or in Power BI Desktop if you have
the model) before reading the answers at the end.

## Exercise 1 — Pick the visual

For each request, name the visual and one formatting choice:
1. "What's our revenue this year?"
2. "Rank the 64 stores by YoY growth — I only care about the worst 10."
3. "Show revenue and margin % by month on one chart."
4. "How did each region contribute to the ₹4.9 cr increase?"
5. "Is there a relationship between a store's average discount and its margin %?"
6. "Share of revenue by channel: Store 82%, Online 18%."

## Exercise 2 — Read the matrix

| Category | Revenue (₹ cr) | Margin (₹ cr) | Margin % |
|---|---|---|---|
| Grocery | 30.0 | 6.0 | 20.0% |
| Apparel | 12.0 | 5.4 | 45.0% |
| Electronics | 15.0 | 2.25 | 15.0% |

(a) What does the total row show for Margin %? (b) A manager expects 26.7%. Where does that come from, and
which number is right?

## Exercise 3 — Interactions

The overview has a region bar chart, a "Company revenue" card, a "Selected revenue" card and a category
column chart. Required: clicking a region changes "Selected revenue" and filters (not highlights) the
category chart; "Company revenue" never changes. Write the Edit interactions settings for the region bar
chart.

## Exercise 4 — Dynamic RLS

UserRegion:

| Email | Region |
|---|---|
| anita@chain.in | South |
| rahul@chain.in | North |
| meera@chain.in | South |
| meera@chain.in | East |

Region revenue (₹ cr): North 18.4, South 22.6, West 20.1, East 11.3. The role on Stores is
\`[Region] IN CALCULATETABLE(VALUES(UserRegion[Region]), UserRegion[Email] = USERPRINCIPALNAME())\`.
What does each of these Viewers see on the revenue card: Anita, Rahul, Meera, and vikram@chain.in (who is
assigned the role but has no row)?

## Exercise 5 — A refresh plan

Sales lands in an on-premises SQL Server by 6:00 every morning; store managers open the report at 9:00;
regional heads ask for a 14:00 update too. The workspace is on Pro. Write the refresh plan: what to
install, the schedule, and how a reader can tell whether data is fresh.

## Exercise 6 — Critique a page

A "Sales Overview" page has: 14 visuals; a pie chart of revenue for 64 stores; a gauge for revenue vs
target; a table of 1,80,000 sales rows; three slicers (Region, Month, Category) in different places; no
page subtitle; red/green colouring on YoY. List five changes, most important first.

## Answers

**1.** (1) A card, with a YoY % card beside it. (2) A bar chart by store with a visual-level Top N filter —
bottom 10 by \`[Revenue YoY %]\` — sorted ascending. (3) A line and clustered column chart, columns for
revenue, line for margin % on the secondary axis, both axes labelled. (4) A waterfall by region: South
+2.8, North +1.5, East +1.1, West −0.5. (5) A scatter, one point per store, with store name in the
details. (6) Two parts of a whole: a single bar or a donut is acceptable here; a card "Online 18%" is
often enough.

**2.** (a) Total margin ÷ total revenue = 13.65 ÷ 57.0 = **23.9%**. (b) 26.7% is the plain average of
20%, 45% and 15%; it gives Apparel the same weight as Grocery although Grocery sells 2.5 times as much.
23.9% is right.

**3.** Select the region bar chart > Format > Edit interactions: "Selected revenue" card → **Filter**;
category column chart → **Filter**; "Company revenue" card → **None**.

**4.** Anita ₹22.6 cr; Rahul ₹18.4 cr; Meera ₹33.9 cr (South + East); Vikram sees no stores, so the card
is blank. Give him a row, or he will report "the report is empty".

**5.** Install a **standard-mode on-premises data gateway** on an always-on server that can reach the SQL
Server; add the source to it and set credentials. Schedule refreshes at **06:30** (after the 6:00 load,
with margin) and **13:30**; both are within Pro's 8 a day. Turn on failure notifications. Put a
"Data as of" card, using the latest date in Sales, on every page.

**6.** (1) Cut to 6–8 visuals, KPI cards at the top. (2) Move the 1,80,000-row table to a drill-through
store page — it is also the slowest visual. (3) Replace the 64-slice pie with a bottom-10/top-10 bar chart.
(4) Replace the gauge with a card showing value, target and variance. (5) Group the slicers in one band,
add a subtitle saying what is filtered, and add ▲/▼ to the red/green YoY values.`,
    mcqs: [
      mcq('Grocery has ₹30.0 cr revenue at 20% margin, Apparel ₹12.0 cr at 45%, and Electronics ₹15.0 cr at 15%. What Margin % does a matrix total row show?', [
        ['23.9%', true],
        ['26.7%', false],
        ['20.0%', false],
        ['45.0%', false],
      ], 'Margins are 6.0 + 5.4 + 2.25 = 13.65 on revenue of 57.0, so 23.9%. The 26.7% is the unweighted average of the three percentages.'),
      mcq('Anita is a Viewer with one UserRegion row (South) under a dynamic RLS role on Stores. Vikram is assigned the same role but has no row. What does Vikram see on the revenue card?', [
        ['Nothing — no stores pass his filter, so the card is blank', true],
        ['All four regions, since a missing row removes the role\'s filter', false],
        ['South only, copied from the first user in the table', false],
        ['An error until the next scheduled refresh of the model', false],
      ], 'His email returns no regions, so the IN test keeps no stores and every visual is empty. Missing mapping rows fail closed, which is safer than showing everything.'),
      mcq('Sales lands in an on-premises SQL Server at 6:00; managers read the report at 9:00 and 14:00. With Pro and a gateway in place, which schedule fits?', [
        ['Refresh at 06:30 and 13:30, and show a "Data as of" card', true],
        ['Refresh at 05:30 and 13:30, before the load has finished', false],
        ['Refresh every 30 minutes all day for the freshest data', false],
        ['Refresh once at 09:00 when the managers open the report', false],
      ], 'Refresh after the data lands and before readers arrive. Every 30 minutes is 48 a day, beyond Pro\'s 8; refreshing at 9:00 makes the first readers wait or see yesterday.'),
      mcq('A page needs a chart of revenue in ₹ crore and margin % by month on one visual. Which visual is meant for this?', [
        ['A line and clustered column chart with margin % on the secondary axis', true],
        ['A stacked column chart with revenue and margin % stacked in each month', false],
        ['A clustered bar chart with revenue and margin % as two series of bars', false],
        ['A ribbon chart with revenue and margin % ranked within each month', false],
      ], 'Rupees and percentages have different units, so they need two axes; the combo visual draws one as columns and the other as a line. Stacking or clustering them on one axis is meaningless.'),
      mcq('Of these problems on a "Sales Overview" page, which should be fixed first for both speed and readability?', [
        ['A table of 1,80,000 sales rows on the overview page', true],
        ['The three slicers placed in different corners of the page', false],
        ['A gauge used to compare revenue against the yearly target', false],
        ['The missing subtitle that says which filters are applied', false],
      ], 'The huge table is the slowest visual and nobody reads it on an overview. Moving it to a drill-through page speeds the page up and removes clutter; the others matter but cost less.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PBI_REPORTS_INTERVIEW_QUESTION',
    notes: `Power BI interviews for analyst roles mix "how does it work" questions with "what would you do"
scenarios. These three come up again and again. Learn the shape of each answer, not the words.

## 1. "What is the difference between a report and a dashboard in Power BI?"

**Model answer.** "A **report** is built in Power BI Desktop (or the Service) on one semantic model. It can
have many pages, and it is interactive: slicers, cross-filtering, drill-down, drill-through, tooltips and
bookmarks.

A **dashboard** is a Power BI Service feature: a single canvas of **tiles** pinned from one or more
reports. It is a monitoring view — clicking a tile opens the report it came from — and it supports
**data alerts** on card, KPI and gauge tiles, for example 'email me when daily revenue drops below ₹15
lakh'. It has no slicers.

In practice many teams say 'dashboard' for a one-page overview report. In the job I would confirm what the
person means and usually build a report overview page, using a Service dashboard only when someone needs
tiles from several reports in one place, or alerts."

**Follow-ups:**
- *"Can a dashboard tile come from a different semantic model than another tile?"* Yes — that is one of the
  reasons to use a dashboard: pinning from several reports onto one canvas.
- *"Which one would you give the CFO?"* An app containing a one-page overview report, with drill-through
  to detail, because she will want to filter by region and quarter; plus an alert if there is a threshold
  she cares about.

## 2. "Each regional manager should only see their region. How do you do it?"

**Model answer.** "Row-level security. I would avoid one role per manager and use **dynamic RLS**: a
mapping table of email to region, maintained by the business, and one role with a filter on the Stores
dimension —
\`[Region] IN CALCULATETABLE(VALUES(UserRegion[Region]), UserRegion[Email] = USERPRINCIPALNAME())\`.
Stores filters Sales through the relationship, so every measure respects it. A manager with two regions
gets two rows. I test it in Desktop with View as > Other user, publish, assign the role in the semantic
model's Security page — to a security group, not names — and test again with Test as role.

Two things I would check: the managers must be **Viewers** or app readers, because Admins, Members and
Contributors are not restricted by RLS; and the mapping table must be hidden from report view."

**Follow-ups:**
- *"What happens to someone with no row in the mapping table?"* They see no data — the filter keeps no
  stores. That is the safe failure; I would add a message card for it.
- *"The CFO needs to see everything."* Either give her a row for every region, or put her in a separate
  role with no filter — RLS combines a user's roles, so she sees the union.
- *"Can RLS hide a column, like cost price?"* No — RLS filters rows. Hiding columns or tables is
  object-level security, usually set up with an external tool such as Tabular Editor.

## 3. "Users say the report is slow. What do you do?"

**Model answer.** "First I measure instead of guessing: open the page in Desktop with **Performance
analyzer**, refresh visuals and sort by duration. Each visual shows its DAX query time, visual display
time and other (waiting) time.

If one visual dominates — typically a big table or a matrix with thousands of rows — I move it to a
drill-through page or limit it with Top N. If the DAX query time is high, I copy the query and look at
the measure; often it is an iterator over the whole fact table or a FILTER on a full table where a simple
column filter would do. If every visual is a bit slow, the page has too many visuals; I cut it to six
to eight. I also check the model: high-cardinality columns we do not need, and whether the report is in
DirectQuery when Import would do.

Then I measure again and report the before and after — 'the overview went from 9 seconds to 2'."

**Follow-ups:**
- *"What is 'Other' time?"* Time a visual spent waiting — for other visuals' queries to finish or for
  the report to do other work — which is why many visuals on one page slow each other down.
- *"Import or DirectQuery?"* Import is fastest to query and the default; DirectQuery when data must be
  near real-time or is too big to import, accepting slower visuals and some DAX limits.`,
    mcqs: [
      mcq('An interviewer asks what a Power BI Service dashboard can do that a report page cannot. Which answer is correct?', [
        ['Hold pinned tiles from several reports and raise data alerts on card or KPI tiles', true],
        ['Use slicers and drill-through pages, which a report page does not support', false],
        ['Run DAX measures that are too complex for a report page to evaluate', false],
        ['Connect to on-premises data sources without the need for any gateway', false],
      ], 'Dashboards are single-canvas collections of tiles, possibly from different reports, with alerts. Slicers and drill-through belong to reports; gateways are needed either way for on-premises sources.'),
      mcq('In an RLS answer you are asked how the CFO, who has no region, can see everything while regional managers stay restricted. What is a correct approach?', [
        ['Add her to a separate role with no filter, since a user sees the union of roles', true],
        ['Make her a workspace Viewer, which removes every RLS filter for that user', false],
        ['Delete her row from the mapping table, which makes RLS show every region', false],
        ['Give her the regional role and turn off RLS in Desktop before publishing', false],
      ], 'RLS combines the roles a user belongs to, so an unfiltered role grants full access. Viewers are the people RLS does restrict, and a missing mapping row shows nothing.'),
      mcq('Performance analyzer shows a page where each of 16 visuals has a small DAX query time but a large "Other" time. What does that point to?', [
        ['Too many visuals on the page, each waiting for the others to finish', true],
        ['One slow measure that must be rewritten with variables to speed up', false],
        ['A gateway problem, since Other time is time spent reaching the source', false],
        ['A theme file that is too large, so each visual waits for its colours', false],
      ], 'Other is time a visual spent waiting rather than querying or drawing. With 16 visuals queuing on one page, cutting the number of visuals is the fix.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PBI_REPORTS_MINI_PROJECT',
    notes: `# A Sales Performance Dashboard in Power BI

You are the analyst for a retail chain with stores in four regions. The leadership team reviews sales
every Monday from a mix of Excel files and emails, and nobody agrees on the numbers. Build the Power BI
report that replaces them: one model, a KPI overview, a store drill-through page, security by region, and
a published report that refreshes itself.

This project brings the whole Power BI module together: Power Query and the star schema (DT_PBI_MODEL),
DAX measures (DT_PBI_DAX) and the report, design and Service skills from this topic.

## The data

Use a public retail-sales dataset (for example a superstore-style or multi-store sales dataset), reshaped
to the tables below, **or** generate one in Python with at least **40 stores, 300 products, 20,000
customers and 2,00,000 sales lines over two fiscal years** (April 2023 to March 2025). If you generate
it, include the generator and add the data problems listed below on purpose.

**Sales** (fact, one row per invoice line)

| Column | Type | Meaning |
|---|---|---|
| InvoiceNo | text | Invoice number; several lines per invoice |
| InvoiceDate | date | Date of sale (day-first text in the raw CSV, e.g. 05/03/2024) |
| StoreID | text | Store, e.g. ST-014 |
| ProductID | text | Product SKU |
| CustomerID | text | Loyalty customer; blank for walk-in customers |
| Qty | whole number | Units sold; negative for returns |
| UnitPrice | ₹ | Selling price per unit before discount |
| Discount | ₹ | Discount on the line; blank when none |
| UnitCost | ₹ | Cost per unit |
| Channel | text | Store or Online (mixed case in the raw file) |

**Products**: ProductID, ProductName, Subcategory, Category (Grocery, Apparel, Electronics, Home,
Personal Care), Brand, MRP.
**Stores**: StoreID, StoreName, City, State, Region (North, South, East, West), OpenDate, StoreManagerEmail.
**Customers**: CustomerID, Gender, AgeBand, City, JoinDate, LoyaltyTier.
**Targets**: Region, Month (first day of the month), TargetRevenue (₹).
**UserRegion**: Email, Region — the RLS mapping (include at least one person with two regions).
**Date**: built by you in Power Query or DAX, marked as the date table, with fiscal year (April start),
fiscal quarter, month name sorted by fiscal month number, and a weekday column.

**Data problems to find and handle:** day-first dates, mixed-case Channel, blank discounts, blank
CustomerID for walk-ins, returns as negative quantities, a few duplicated invoice lines, one store whose
StoreID has a trailing space in the Sales file, and stores that opened partway through the data.

## The questions the report must answer

1. **Are we ahead of last year and of target?** Revenue, margin, margin %, YoY % and achievement vs target
   — for the company and for each region.
2. **Where is the problem?** Which regions, stores and categories are below last year or below target?
3. **When?** Monthly trend of revenue vs last year, and fiscal year-to-date.
4. **What is a single store doing?** For any store: its KPIs, monthly trend, category mix and top 10
   products.
5. **One question of your own** that the data can answer — for example returns by category, walk-in vs
   loyalty customers, or weekday patterns.

## Deliverables

1. **\`SalesPerformance.pbix\`**, containing:
   - **Power Query** steps that clean every data problem above, with step names that say what they do.
   - A **star schema**: Sales as the fact; Products, Stores, Customers, Date as dimensions; Targets at its
     own region × month grain; one-to-many, single-direction relationships unless you justify otherwise.
   - **Measures** in a display folder: Revenue, Margin, Margin %, Revenue LY, Revenue YoY %, Revenue
     FYTD, Target, Achievement %, Customers, Average order value, Data as of — each with a description.
   - **Page 1 — Overview**: 4–5 KPI cards with comparisons, revenue YoY by region, monthly trend vs LY,
     category bars; fiscal-year and channel slicers; subtitle stating filters.
   - **Page 2 — Store detail**: a drill-through page on Stores[StoreName] with Keep all filters on, a back
     button, KPIs, monthly trend, category mix and top 10 products.
   - **A report-page tooltip** used on at least one visual.
   - **A mobile layout** for the overview page.
   - **RLS**: a dynamic role using UserRegion and USERPRINCIPALNAME().
2. **The published report** in a workspace (not My workspace), with scheduled refresh configured. If you
   cannot publish (no work account), submit screenshots of each Service setting you would use and explain
   them in the README instead.
3. **\`README.md\`** — data source, model diagram (screenshot), the list of measures with one line each,
   the refresh plan (gateway or not, schedule and why), how RLS works and how you tested it, and your
   answers to the five questions in one or two sentences each.
4. **Screenshots** of: the overview, a drill-through to one store, the tooltip, the mobile layout, and
   "View as" for two different users showing different regions.

## Acceptance criteria

- Revenue, Margin and Customers totals on the overview match a check you did outside Power BI (SQL, pandas
  or Excel) to the rupee for one fiscal year; the README shows that check.
- Duplicated invoice lines are removed, and the README says how many; returns reduce revenue rather than
  being dropped.
- Every visual uses dimension columns (not fact-table copies) on axes and slicers, and the Date table on
  every time axis; Auto date/time is off.
- YoY % is blank — and labelled — for stores with no prior-year sales, never 0%.
- The Margin % total row equals total margin ÷ total revenue, and the README explains why it is not the
  average of the rows.
- Drill-through from any store data point on the overview opens Store detail filtered to that store and
  the selected fiscal year.
- "View as" with two UserRegion emails shows two different, correct regional revenue figures; a user with
  two regions sees their sum; an email with no row sees no data.
- No page has more than eight visuals besides slicers and navigation; every chart title states a finding
  or a clear question; colour is never the only signal for good/bad.`,
    mcqs: [
      mcq('In the mini project, "View as" with an email that has rows for South and West shows ₹42.7 cr. South is ₹22.6 cr and West ₹20.1 cr. What does that tell you?', [
        ['The dynamic role works: a user with two regions sees the sum of both', true],
        ['The role is broken: a user should only ever see the first region listed', false],
        ['The role is filtering Products, not Stores, so the totals overlap', false],
        ['Refresh has not run yet, so View as shows yesterday\'s figures', false],
      ], 'The IN test keeps stores in either region, so revenue is 22.6 + 20.1 = 42.7 — exactly what the acceptance criteria ask you to demonstrate.'),
      mcq('A project submission shows YoY % of 0.0% for the four stores that opened in FY 2024-25. Which acceptance criterion does it fail, and why does it matter?', [
        ['YoY must be blank and labelled for new stores, as 0% falsely claims flat sales', true],
        ['YoY must be shown as 100% for new stores, since all of their sales are growth', false],
        ['New stores must be removed from the model so that they do not distort totals', false],
        ['YoY must use the company average for new stores so every row has a value', false],
      ], 'With no last-year sales there is no base for growth. A blank labelled "new store" is honest; 0%, 100% or an invented average would mislead the reader.'),
    ],
    assignment: {
      title: 'A Sales Performance Dashboard in Power BI',
      description: 'Build a Power BI report for a retail chain — Power Query cleaning, a star schema with a date table, DAX measures for revenue, margin, growth and FYTD, a KPI overview, a drill-through store page, dynamic row-level security by region, and a published report with scheduled refresh.',
      instructions: `Build the report described in this unit's brief and submit a zip or a repository link.

**Submit:**

1. \`SalesPerformance.pbix\` with the cleaned queries, star schema, Date table, measures (with
   descriptions), the Overview and Store detail pages, a report-page tooltip, a mobile layout and the
   dynamic RLS role.
2. The link to the published report, or — if you cannot publish — screenshots of each Service setting
   (workspace, scheduled refresh, gateway, RLS assignment) with an explanation.
3. \`README.md\` covering the data source, model diagram, measure list, refresh plan, how RLS works and
   was tested, the outside-Power BI totals check, and one- or two-sentence answers to the five questions.
4. Screenshots: overview, a store drill-through, the tooltip, the mobile layout, and "View as" for two
   users with different regions.

**Before you submit,** go through every acceptance criterion in the brief and record the result in the
README (for example: "FY 2024-25 revenue in Power BI ₹72,41,36,520 = pandas check ₹72,41,36,520 ✔").
Do not use Publish to web.`,
      rubric: [
        { criterion: 'Data preparation and model', description: 'Every listed data problem is handled in named Power Query steps; a star schema with a marked fiscal Date table and correct one-to-many relationships; Targets kept at its own grain; Auto date/time off.', maxPoints: 25 },
        { criterion: 'Measures and correctness', description: 'All listed measures are correct and described; totals match an outside check to the rupee; YoY is blank and labelled for new stores; totals behave correctly and the README explains the Margin % total.', maxPoints: 25 },
        { criterion: 'Report design and interactivity', description: 'An overview that answers the leadership questions in seconds — KPI cards with comparisons, sorted bars, a trend vs LY, finding titles, a filter subtitle; a working drill-through store page with a back button; a tooltip page; a mobile layout; accessible colour use.', maxPoints: 30 },
        { criterion: 'Security, publishing and refresh', description: 'A dynamic RLS role on the Stores dimension, tested with View as for single-region, two-region and no-row users; published to a shared workspace (or evidenced); a sensible refresh schedule and gateway decision with failure notifications.', maxPoints: 15 },
        { criterion: 'README and answers', description: 'Clear documentation of source, model, measures, refresh and RLS, with short, evidence-based answers to all five questions including the student\'s own.', maxPoints: 5 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PBI_REPORTS_CHECKPOINT',
    notes: `Ten questions on Power BI reports: choosing and reading visuals, interactions, drill-through and
bookmarks, designing for an audience, and publishing with refresh and row-level security. Most give you
figures from the retail-chain model — work out what the report would show before choosing.`,
    checkpoint: [
      ck(VIZ, 'A matrix shows distinct customers per region — 41,200, 52,800, 47,500 and 23,900 — and a total of 1,51,600. What explains the total?', [
        ['Customers who shop in several regions are counted once in the total', true],
        ['The matrix drops the smallest region from its total row by default', false],
        ['Distinct counts are sampled for totals, so the value is approximate', false],
        ['The total row uses last year\'s customer count unless told otherwise', false],
      ], 'DISTINCTCOUNT is evaluated again over all regions. The rows sum to 1,65,400; the 13,800 difference comes from customers who appear in several region rows but only once in the total.'),
      ck(VIZ, 'A report must show the 64 stores\' YoY growth so the regional head can spot the worst performers. Which visual and setting fit best?', [
        ['A bar chart sorted ascending, with a bottom-10 Top N filter', true],
        ['A pie chart of YoY growth with one slice for each of the stores', false],
        ['A gauge per store, laid out in an 8 × 8 grid on the page', false],
        ['A line chart with the 64 stores on the x-axis in name order', false],
      ], 'Sorted bars make ranking instant, and a Top N filter on the visual keeps it to the stores that need attention. A pie cannot show negative growth at all.'),
      ck(VIZ, 'A bar chart of YoY % by region uses a field-value colour measure: below 0% red, below 5% amber, otherwise green. North is 8.9%, West −2.4%, East 10.8%. Which bars are not green?', [
        ['Only West, which is red', true],
        ['West red and North amber', false],
        ['West red and East amber', false],
        ['None, since all are above zero', false],
      ], 'Only West (−2.4%) falls below 0% and is red; North (8.9%) and East (10.8%) are both 5% or more and stay green.'),
      ck(DASH, 'A drill-through page has Keep all filters on. A reader filters the overview to FY 2024-25 and Channel = Online, then drills through on one store. What does the detail page show?', [
        ['That store, for FY 2024-25, Online sales only', true],
        ['That store, for all years and both channels', false],
        ['All stores, for FY 2024-25, Online sales only', false],
        ['That store, for FY 2024-25 and both channels', false],
      ], 'Keep all filters passes the source page\'s filters and slicers along with the drill-through field, so the store, the year and the channel all apply.'),
      ck(DASH, 'You want a "Show table" button that swaps a chart for a table in the same place, without touching the reader\'s slicers. How do you build the bookmarks?', [
        ['Hide one visual in the Selection pane per bookmark, with Data unticked', true],
        ['Make two copies of the page and link the button to the second copy', false],
        ['Save two bookmarks with Data ticked, so each keeps its own slicers', false],
        ['Use a report-page tooltip that shows the table on hover instead', false],
      ], 'The Selection pane controls visibility, and a bookmark that does not capture Data changes only what is shown, leaving the reader\'s filters alone.'),
      ck(DASH, 'A CFO, a regional head and a store manager will all use reports from one model. What differs most between their pages?', [
        ['The decisions each takes, and so the level of detail and how often they read', true],
        ['The colour theme, since each audience should have a brand of its own', false],
        ['The measures, since each audience needs its own definition of revenue', false],
        ['Nothing — one page with every visual serves all three readers best', false],
      ], 'Pages are designed around decisions: the CFO by region and quarter, the regional head by store and month, the store manager by product and day. Measures stay shared so numbers agree.'),
      ck(DASH, 'Which pair of facts about the on-premises data gateway is correct?', [
        ['It runs inside the company network, and a cloud SQL source needs none', true],
        ['It runs in the Power BI Service, and every data source needs one', false],
        ['It is needed only on Premium, and it replaces the scheduled refresh', false],
        ['It runs on each reader\'s laptop, and it applies RLS to the data', false],
      ], 'The gateway is installed on a machine inside the network so the cloud Service can reach on-premises sources. Cloud sources such as Azure SQL Database are reached directly.'),
      ck(DASH, 'A semantic model on Pro has refreshed fine for months, then stops on Wednesday. The refresh history says the SQL login failed. What is the fix?', [
        ['Update the data source credentials on the semantic model, then refresh', true],
        ['Republish the .pbix from Desktop, which clears the stored refresh errors', false],
        ['Upgrade the workspace to Premium so the refresh can retry more often', false],
        ['Recreate the RLS roles, since a login error comes from role membership', false],
      ], 'A failed login means the stored credentials are no longer valid — often a changed password. Update them in the semantic model settings (or on the gateway data source) and run Refresh now.'),
      ck(DASH, 'A dynamic RLS role on Stores uses USERPRINCIPALNAME(). Rahul (North, ₹18.4 cr) is a workspace Viewer; Priya (no UserRegion row) is a workspace Contributor. What do they see?', [
        ['Rahul sees ₹18.4 cr; Priya sees all regions, as RLS skips Contributors', true],
        ['Rahul sees ₹18.4 cr; Priya sees nothing, as she has no mapping row', false],
        ['Both see all regions, because roles only apply inside apps', false],
        ['Both see nothing until each is added to the role by name', false],
      ], 'RLS restricts Viewers, so Rahul sees North only. Contributors can edit the content and are not restricted, so Priya sees everything despite having no row.'),
      ck(VIZ, 'A KPI band shows: Revenue ₹72.4 cr (▲ 7.3% vs LY), Margin % 28.9% (target 28%), and a gauge of orders. The page title says "Sales Overview". What one change most helps a 3-second read?', [
        ['A title that states the finding, such as "Revenue up 7.3%; West below LY"', true],
        ['A larger gauge for orders, so it matches the size of the other cards', false],
        ['A background image of a store, so readers know the subject at once', false],
        ['A drop shadow on the KPI cards, so they look separate from the charts', false],
      ], 'A finding title tells the reader the message before they read any visual. The gauge and decoration add nothing to that 3-second read.'),
    ],
  },
];
