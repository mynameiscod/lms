/**
 * Career-track content: Excel for analysts (Data Analytics + AI), batch A1.
 *
 *  - DT_EXCEL_CORE      formulas, references, conditional logic, lookups, text and dates, cleaning.
 *  - DT_EXCEL_ANALYSIS  sorting and dynamic arrays, pivot tables, charts, what-if, dashboards.
 *
 * Everything is Microsoft 365 Excel. Functions that need Excel 2021 or 365 (XLOOKUP, FILTER, SORT,
 * SORTBY, UNIQUE, LET) or 365 only (TEXTSPLIT, TEXTBEFORE, TEXTAFTER) are labelled, with the older
 * equivalent beside them. Excel cannot be run while authoring, so only documented behaviour is
 * stated; every rupee figure was checked by hand or with Python.
 *
 * Both topics declare the single skill SPREADSHEET_ANALYSIS, so checkpoint questions carry no
 * skillKey.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_DATA_EXCEL_BUNDLES: PilotBundle[] = [
  /* ══════════════════════════════════════════════════════════════════════════════════════
   * DT_EXCEL_CORE — formulas, lookups and cleaning
   * ════════════════════════════════════════════════════════════════════════════════════ */

  /* ── WORKBOOKS_TABLES ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EXCEL_CORE_WORKBOOKS_TABLES',
    notes: `An analyst's Excel file is not a page of numbers; it is a small system that takes in raw data,
calculates from it and shows a result. Most spreadsheet errors at work come from mixing those three
jobs on one sheet. This unit is about the layout that keeps them apart.

## Cells, ranges and references

A **cell** is one box, named by column letter and row number: \`B2\`. A **range** is a rectangle of
cells written with a colon: \`B2:F9\` is columns B to F, rows 2 to 9. A whole column is \`D:D\`. A
reference to another sheet carries the sheet name, in quotes if it has a space:

    ='Raw Data'!F2          the value of F2 on the sheet called Raw Data
    =SUM(Raw!F2:F9)         a range on the sheet called Raw

## What a cell can hold

| Kind | Example | Default alignment |
|---|---|---|
| Number | 1499, 18%, ₹2,350 (a number with a currency format) | right |
| Text | Pune, SK1001, "1499" typed with a leading apostrophe | left |
| Date | 03-Jan-2025 (stored as the number 45660) | right |
| Logical | TRUE, FALSE | centre |
| Error | #N/A, #VALUE!, #REF!, #DIV/0! | centre |

The alignment hint matters. If one "amount" in a column sits on the left when nobody set the
alignment, it is **text that looks like a number**, and \`SUM\` will silently skip it. Dates are
numbers too — a date that sits on the left is text and will not group, sort or subtract properly.

## One table, one record per row

Here is ShopKart's January order sheet laid out the way analysis needs it:

| OrderID | OrderDate | City | Category | Qty | UnitPrice | Amount |
|---|---|---|---|---|---|---|
| SK1001 | 03-Jan-2025 | Pune | Electronics | 2 | 1,499 | 2,998 |
| SK1002 | 03-Jan-2025 | Mumbai | Home | 1 | 2,350 | 2,350 |
| SK1003 | 05-Jan-2025 | Pune | Fashion | 3 | 799 | 2,397 |
| SK1004 | 07-Jan-2025 | Delhi | Electronics | 1 | 12,999 | 12,999 |
| SK1005 | 09-Jan-2025 | Mumbai | Fashion | 4 | 649 | 2,596 |
| SK1006 | 12-Jan-2025 | Delhi | Home | 2 | 1,150 | 2,300 |
| SK1007 | 15-Jan-2025 | Pune | Electronics | 1 | 3,299 | 3,299 |
| SK1008 | 18-Jan-2025 | Mumbai | Electronics | 2 | 2,199 | 4,398 |

The rules it follows — the same "tidy data" rules you will meet in pandas and SQL:

- **One header row**, each column holding one kind of fact.
- **One order per row**. No subtotal rows, no blank spacer rows, no merged cells.
- **The city is repeated on every row** rather than written once as a merged heading. Sorting,
  filtering, pivot tables and formulas all need every row to carry its own values.

A sheet with merged "Pune" headings and a "Total" line after each month looks tidy to a person and
is useless to Excel: a pivot counts the total line as another order and doubles the figures.

## Excel Tables (Ctrl+T)

Select any cell in the data and press **Ctrl+T** (Insert > Table). Then, on the Table Design tab,
give it a name such as **tblOrders**. A Table gives you:

- **Automatic growth.** Rows pasted or typed directly below the table become part of it, and every
  formula, pivot and chart that uses the table includes them.
- **Structured references** that read like English:

      =[@Qty]*[@UnitPrice]          in the Amount column: this row's Qty times this row's price
      =SUM(tblOrders[Amount])       on another sheet: the whole Amount column, however long

  The \`@\` means "the value in this same row".
- **Calculated columns.** Type the Amount formula once and Excel fills it down the whole column,
  and into every new row.
- **A Total Row** (Table Design > Total Row) that uses \`SUBTOTAL(109, ...)\`, which counts only the
  rows visible after a filter. An ordinary \`=SUM(tblOrders[Amount])\` elsewhere ignores filters and
  keeps showing ₹33,337 for all eight orders; the Total Row shows ₹8,694 when the table is filtered
  to Pune.

## Separate raw data, calculation and output

A workbook a manager will reuse every month has separate sheets:

| Sheet | Holds | Rule |
|---|---|---|
| Raw | The export exactly as received | Never typed over |
| Lookups | Product list, region map, targets, rates | One table per sheet area, each named |
| Calc | Cleaned copy, helper columns | Formulas only |
| Report | Pivots, charts, the numbers people read | Reads from Calc, never from typing |

If a number in Raw looks wrong, you do not fix it in Raw; you correct it in a recorded cleaning step
(a formula, a mapping table or Power Query) so next month's export gets the same treatment and
anyone can see what was changed.

## Common mistakes

- Typing totals into the data area, then building a pivot that counts them as orders.
- Leaving the data as a plain range, so next month's extra rows fall outside every formula.
- Hard-typing a number into a report cell "just this once"; next month nobody knows it is not a
  formula.`,
    mcqs: [
      mcq('ShopKart keeps its 2,400 January orders in a Table named tblOrders. Next week 300 new orders are pasted directly below the last row. What happens to =SUM(tblOrders[Amount]) on the Report sheet?', [
        ['It includes the new rows, because the table grows to take them in', true],
        ['It still sums only the first 2,400 rows until the formula is edited', false],
        ['It returns #REF!, because the size of the table no longer matches', false],
        ['It doubles, as the pasted rows are counted inside and outside the table', false],
      ], 'Rows added directly beneath an Excel Table become part of it, and a structured reference such as tblOrders[Amount] always means the whole column as it now stands.'),
      mcq('The Amount column of tblOrders holds =[@Qty]*[@UnitPrice]. What does the @ mean in that formula?', [
        ['The value from the same row of that column', true],
        ['The whole Qty column, summed before it is multiplied', false],
        ['An absolute reference that stays fixed when the formula is copied', false],
        ['A named range defined on a different sheet of the workbook', false],
      ], 'In a structured reference, @ restricts the column to the current row, so each row multiplies its own quantity by its own price.'),
      mcq('A colleague\'s order sheet has a merged city heading over each block, a blank row between months and a typed "Total" row after each month. Why is this layout a problem for analysis?', [
        ['Sorting, filtering and pivots expect every row to be one complete record', true],
        ['Excel cannot save a workbook that holds merged cells on more than one sheet', false],
        ['Formulas are unable to refer to any sheet that contains blank rows', false],
      ], 'Analysis tools treat each row as a record with its own values. Merged headings leave rows without a city, blank rows split the range, and total rows are counted as if they were extra orders.'),
    ],
    checkpoint: [
      mcq('In a column of order amounts, one cell shows 1,250 on the left of the cell while every other amount sits on the right. Nobody changed the alignment. What does that most likely mean?', [
        ['The value is stored as text, so SUM will skip it', true],
        ['The cell holds a negative number displayed without a minus sign', false],
        ['The cell uses a currency format from a different country', false],
        ['The cell contains a formula rather than a typed number', false],
      ], 'By default Excel aligns numbers right and text left. A left-aligned "number" is text, and SUM over a range ignores text, so the total comes out too low.'),
      mcq('A monthly sales workbook has sheets Raw, Lookups, Calc and Report. A new analyst wants to type corrections straight into Raw whenever a figure looks wrong. What is the better practice?', [
        ['Keep Raw as received and correct values in a recorded cleaning step', true],
        ['Correct Raw directly, so that the report shows right numbers as early as possible', false],
        ['Delete the suspicious rows from Raw so they never reach the report', false],
      ], 'Raw stays an exact copy of the export so the work can be repeated and checked. A recorded correction — a formula, a mapping table, a Power Query step — applies again to next month\'s file and shows what changed.'),
      mcq('On the Report sheet, =SUM(tblOrders[Amount]) shows ₹33,337 for eight orders. You filter tblOrders to show only the three Pune orders, worth ₹8,694. What does the Report formula show now?', [
        ['₹33,337, because SUM includes rows hidden by a filter', true],
        ['₹8,694, because a table formula follows the filter on the table', false],
        ['₹0 until the filter is cleared, because a filtered table is frozen', false],
        ['#VALUE!, because a filtered column cannot be totalled', false],
      ], 'SUM adds every cell in the column whether or not a filter hides it. Only SUBTOTAL(109, ...) or AGGREGATE — which the Table\'s Total Row uses — skips filtered-out rows.'),
    ],
  },

  /* ── FORMULAS_REFERENCES ──────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EXCEL_CORE_FORMULAS_REFERENCES',
    notes: `A formula starts with \`=\`. It can use numbers, cell references, operators and functions, and
Excel recalculates it whenever a cell it depends on changes. The skill an analyst needs is writing a
formula once and copying it across hundreds of rows without it going wrong.

## Operators and order

| Operator | Meaning | Example | Result |
|---|---|---|---|
| \`+ - * /\` | arithmetic | =2998*18% | 539.64 |
| \`^\` | power | =1.1^2 | 1.21 |
| \`&\` | join text | ="SK"&1001 | SK1001 |
| \`= <> > < >= <=\` | compare, giving TRUE/FALSE | =F2>=3000 | TRUE or FALSE |

Excel applies \`^\` before \`*\` and \`/\`, and those before \`+\` and \`-\`; use brackets to make your
intent clear. One trap: a leading minus sign (negation) is applied **before** \`^\`, so \`=-3^2\`
returns **9**, not -9. Write \`=-(3^2)\` if you mean -9.

## The everyday functions

    =SUM(G2:G9)        33337     total of the Amount column in the ShopKart table
    =AVERAGE(G2:G9)    4167.125  mean order value
    =MIN(G2:G9)        2300      smallest order
    =MAX(G2:G9)        12999     largest order
    =COUNT(G2:G9)      8         cells holding NUMBERS
    =COUNTA(A2:A9)     8         cells that are not empty (any type)
    =COUNTBLANK(H2:H9)           empty cells
    =ROUND(G2*18%,2)   539.64    GST on SK1001, rounded to paise

What they skip matters more than what they do:

- **SUM, AVERAGE, MIN, MAX** ignore text and empty cells in a range. A number stored as text is
  ignored too, without any warning.
- **AVERAGE ignores blanks but includes zeros.** Marks of 72, (blank), 0, 88 and "absent" average to
  (72+0+88)/3 = **53.33**: three numbers counted, the blank and the text skipped.
- **COUNT** counts only numbers; **COUNTA** counts anything that is not empty, including text and
  formulas returning "". Comparing the two on an amount column is a quick test for text-numbers.

## Formatting is not rounding

Put \`=100/3\` in A1, A2 and A3 and format them to two decimals. Each shows 33.33, but each still
holds 33.3333…, so \`=SUM(A1:A3)\` shows **100.00**, not the 99.99 a reader adds up by eye. When a
figure must be exact to the paisa — a GST amount on an invoice, a split bill — round it in the
formula with \`ROUND(x, 2)\` so the stored value is what is shown.

## Relative, absolute and mixed references

When you copy a formula, its references move by the same number of rows and columns. That is what
you want for "this row's quantity", and wrong for "the GST rate in F1".

| Written | Copied down one row | Copied right one column | Use it for |
|---|---|---|---|
| \`F1\` | F2 | G1 | relative: the cell in the same relative position |
| \`$F$1\` | $F$1 | $F$1 | absolute: one fixed input cell, e.g. a rate |
| \`$F1\` | $F2 | $F1 | column fixed, row moves |
| \`F$1\` | F2 → F$1 | G$1 | row fixed, column moves |

Press **F4** while the cursor is on a reference to cycle F1 → $F$1 → F$1 → $F1.

**The classic bug:** the GST rate 18% is in F1 and E2 holds \`=D2*F1\`. Copied down, E3 becomes
\`=D3*F2\` — F2 is empty, so every row after the first shows 0. The fix is \`=D2*$F$1\`.

## Named ranges

Select F1, type **GST_Rate** in the Name Box (left of the formula bar) and press Enter. Now
\`=D2*GST_Rate\` is absolute automatically and says what it means. Use names for the few inputs a
model depends on: a tax rate, a target, an exchange rate.

## Common mistakes

- A rate typed into the formula (\`=D2*0.18\`) instead of referring to an input cell: when GST changes,
  someone has to find every copy.
- Formatting a column to two decimals and assuming the values are rounded.
- Forgetting \`$\` on a lookup range, so the range slides down as the formula is copied.`,
    workedExample: `**Goal: a price grid showing every product's price after three discount levels, from ONE
formula.**

The layout: list prices down column A, discount rates across row 2.

|   | A | B | C | D |
|---|---|---|---|---|
| 2 | List price | 5% | 10% | 15% |
| 3 | 1,000 | | | |
| 4 | 2,500 | | | |
| 5 | 4,000 | | | |

The price after discount is list price × (1 − discount). In B3:

    =$A3*(1-B$2)

Why those dollar signs:

- \`$A3\` — the column is locked, the row is free. Copied right, it keeps reading column A (the list
  price); copied down, it moves to A4, A5.
- \`B$2\` — the row is locked, the column is free. Copied down, it keeps reading row 2 (the discount);
  copied right, it moves to C$2, D$2.

Copy B3 across to D3, then the three cells down to row 5. D5 now holds \`=$A5*(1-D$2)\`:

|   | A | B | C | D |
|---|---|---|---|---|
| 3 | 1,000 | 950 | 900 | 850 |
| 4 | 2,500 | 2,375 | 2,250 | 2,125 |
| 5 | 4,000 | 3,800 | 3,600 | 3,400 |

**Check it:** 4,000 × (1 − 0.15) = 3,400. Without the dollar signs, \`=A3*(1-B2)\` copied to D5 would
read \`=C5*(1-D4)\` — two empty or wrong cells — which is the bug mixed references exist to prevent.`,
    mcqs: [
      mcq('F1 holds the GST rate 18%. E2 has =D2*F1, copied down to E50. E2 is right, but E3 to E50 all show 0. Why?', [
        ['The reference to F1 is relative, so E3 uses F2, which is empty', true],
        ['GST must be entered as 0.18, since Excel cannot multiply by a percentage', false],
        ['Copied formulas only recalculate after F9 is pressed in each cell', false],
        ['Column E is formatted as text, and text formulas display as zero', false],
      ], 'Copying down one row moves every relative reference down one row, so F1 becomes F2, F3 and so on — empty cells, which count as 0. =D2*$F$1 keeps the rate fixed.'),
      mcq('B3 holds =$A3*(1-B$2) and is copied to D5. What formula does D5 contain?', [
        ['=$A5*(1-D$2)', true],
        ['=$A3*(1-D$2)', false],
        ['=$A5*(1-B$2)', false],
        ['=A5*(1-D2)', false],
      ], 'The move is two rows down and two columns right. $A3 keeps its column and moves its row to $A5; B$2 keeps its row and moves its column to D$2.'),
      mcq('A1, A2 and A3 each hold =100/3 and are formatted to show two decimals. A4 holds =SUM(A1:A3). What do the four cells display?', [
        ['33.33 three times, and 100.00 in A4', true],
        ['33.33 three times, and 99.99 in A4', false],
        ['33.33 three times, and #VALUE! in A4 because of the rounding', false],
      ], 'Formatting changes only what is displayed. Each cell still stores 33.333…, so the sum is exactly 100. Use ROUND in the formula when the stored value must match the display.'),
    ],
    checkpoint: [
      mcq('A margin sheet has the formula =-3^2 in a cell. What value does Excel show?', [
        ['9', true],
        ['-9', false],
        ['6', false],
        ['#NUM!', false],
      ], 'Excel applies negation before the ^ operator, so it computes (-3)^2 = 9. To get -9 the formula must be =-(3^2).'),
      mcq('Marks in B2:B6 are 72, an empty cell, 0, 88 and the text "absent". What do =AVERAGE(B2:B6) and =COUNT(B2:B6) return?', [
        ['53.33 and 3', true],
        ['32 and 5', false],
        ['80 and 2', false],
        ['53.33 and 4', false],
      ], 'Both functions use only the numbers 72, 0 and 88: the blank and the text are skipped, but the zero is a number. 160 / 3 = 53.33, and COUNT is 3.'),
      mcq('Which reference keeps pointing at row 1 but lets the column change when a formula is copied to the right?', [
        ['A$1', true],
        ['$A1', false],
        ['$A$1', false],
        ['A1', false],
      ], 'A dollar sign locks the part it stands in front of. A$1 locks the row and leaves the column free; $A1 does the opposite; $A$1 locks both.'),
    ],
  },

  /* ── LOGIC_CONDITIONAL ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EXCEL_CORE_LOGIC_CONDITIONAL',
    notes: `Most business questions have a condition in them: "how many late deliveries in Chennai?",
"revenue from orders over ₹500", "average delivery time for veg orders". Excel answers them with
two families of functions: **IF logic** that labels each row, and the **IFS aggregations** that
count, sum and average only the rows that meet conditions.

The data for this unit — a week of orders from Swaad Express, a food-delivery app, in A1:E9:

| Order | City | Type | Amount | Mins |
|---|---|---|---|---|
| FD01 | Hyderabad | Veg | 420 | 28 |
| FD02 | Chennai | Non-veg | 780 | 41 |
| FD03 | Hyderabad | Non-veg | 650 | 35 |
| FD04 | Bengaluru | Veg | 310 | 22 |
| FD05 | Chennai | Veg | 520 | 47 |
| FD06 | Hyderabad | Veg | 890 | 52 |
| FD07 | Bengaluru | Non-veg | 1,120 | 38 |
| FD08 | Hyderabad | Non-veg | 275 | 19 |

## IF: one condition, two outcomes

    =IF(E2>40,"Late","On time")

\`IF(test, value_if_true, value_if_false)\`. FD02, FD05 and FD06 come out "Late". Text in a result
or a comparison goes in double quotes; numbers do not.

## IFS: several bands (Excel 2019 and later)

    =IFS(D2>=1000,"Large",D2>=500,"Medium",TRUE,"Small")

IFS checks the pairs in order and returns the value for the **first** test that is TRUE, so the
bands must run from the top down. The last pair \`TRUE,"Small"\` is the catch-all. **Without it, a
row that matches no test returns #N/A** — the ₹310 order would show #N/A instead of "Small". In
older Excel the same thing is a nested IF:

    =IF(D2>=1000,"Large",IF(D2>=500,"Medium","Small"))

## AND, OR, NOT

    =IF(AND(D2>=500,E2>45),"Coupon","")        both must hold: FD05 and FD06 get a coupon
    =IF(OR(B2="Chennai",E2>45),"Review","")    either is enough: FD02, FD05, FD06

## IFERROR — use it narrowly

\`=IFERROR(D2/E2,0)\` shows 0 instead of #DIV/0! when E2 is 0. IFERROR catches **every** error,
including the ones that mean your formula is broken — a mistyped range, a lookup key that does not
exist. Wrapping a whole model in IFERROR(…,0) turns mistakes into zeros that quietly lower totals.
Use it only where you know which error you expect, and prefer \`IFNA\` for lookups, which catches only
#N/A.

## COUNTIFS, SUMIFS, AVERAGEIFS

These answer conditional questions in one cell, with no helper column:

    =COUNTIFS(B2:B9,"Hyderabad",C2:C9,"Veg")                 2      (FD01, FD06)
    =SUMIFS(D2:D9,B2:B9,"Hyderabad")                        2235   (420+650+890+275)
    =SUMIFS(D2:D9,B2:B9,"Hyderabad",E2:E9,">30")            1540   (650+890)
    =AVERAGEIFS(E2:E9,C2:C9,"Veg")                          37.25  ((28+22+47+52)/4)
    =COUNTIF(E2:E9,">40")                                   3

Rules that trip people up:

- In **SUMIFS and AVERAGEIFS the range being added comes first**, then range–criterion pairs. The
  older **SUMIF** is the other way round: \`=SUMIF(B2:B9,"Hyderabad",D2:D9)\`.
- Every pair is joined by AND. For OR, add two COUNTIFS together (if a row cannot match both).
- A comparison goes **inside the quotes**: \`">30"\`, \`"<>Veg"\`. To use a cell's value, join it on:
  \`">"&H1\`. Writing \`">H1"\` looks for values greater than the text "H1".
- Criteria are not case-sensitive, but spaces count: "Hyderabad " with a trailing space is not
  "Hyderabad", and the count comes out too low.
- \`"*bad"\` uses a wildcard: * for any characters, ? for one.

## A summary table driven by criteria cells

Put the cities in G2:G4 and write once in H2, then copy down:

    =SUMIFS($D$2:$D$9,$B$2:$B$9,G2)

| City | Revenue |
|---|---|
| Hyderabad | 2,235 |
| Chennai | 1,300 |
| Bengaluru | 1,430 |

The total is 4,965, which matches \`=SUM(D2:D9)\` — **always reconcile a breakdown back to the
grand total**; a mismatch means a city is misspelt or missing.`,
    mcqs: [
      mcq('=IFS(D2>=1000,"Large",D2>=500,"Medium") is filled down the Amount column. What does it show for a ₹310 order?', [
        ['#N/A, because no test is TRUE and there is no catch-all pair', true],
        ['Small, because IFS falls back to the last band automatically', false],
        ['A blank, because IFS returns an empty string when nothing matches', false],
        ['Medium, because 310 is closer to 500 than it is to 1000', false],
      ], 'IFS returns #N/A when none of its tests is TRUE. A final TRUE,"Small" pair acts as the "otherwise" and catches every remaining row.'),
      mcq('Swaad Express keeps City in B2:B9, Amount in D2:D9 and delivery Mins in E2:E9. Which formula totals Amount for Hyderabad orders that took more than 30 minutes?', [
        ['=SUMIFS(D2:D9,B2:B9,"Hyderabad",E2:E9,">30")', true],
        ['=SUMIFS(B2:B9,"Hyderabad",E2:E9,">30",D2:D9)', false],
        ['=SUMIF(B2:B9,"Hyderabad",D2:D9,E2:E9,">30")', false],
        ['=SUMIFS(D2:D9,B2:B9,"Hyderabad",E2:E9,>30)', false],
      ], 'SUMIFS takes the range to add first, then range–criterion pairs. SUMIF accepts only one condition, and a comparison criterion must be text in quotes.'),
      mcq('A manager wants an order flagged "Review" when the city is Chennai or the delivery took over 45 minutes. Which formula does that?', [
        ['=IF(OR(B2="Chennai",E2>45),"Review","")', true],
        ['=IF(AND(B2="Chennai",E2>45),"Review","")', false],
        ['=IF(B2="Chennai",E2>45,"Review")', false],
        ['=OR(B2="Chennai",E2>45,"Review")', false],
      ], 'OR is TRUE when either test holds; AND would need both. IF then turns TRUE into "Review" and FALSE into an empty string.'),
    ],
    checkpoint: [
      mcq('City in B2:B6 is Pune, Pune, Goa, Pune, Goa; Type in C2:C6 is Veg, Non-veg, Veg, Veg, Veg. What does =COUNTIFS(B2:B6,"Pune",C2:C6,"Veg") return?', [
        ['2', true],
        ['3', false],
        ['5', false],
        ['1', false],
      ], 'COUNTIFS needs both conditions on the same row. Rows 2 and 5 are Pune and Veg; row 3 is Pune but Non-veg.'),
      mcq('H1 holds 40. Which formula counts deliveries in E2:E500 that took longer than the number in H1?', [
        ['=COUNTIF(E2:E500,">"&H1)', true],
        ['=COUNTIF(E2:E500,">H1")', false],
        ['=COUNTIF(E2:E500,>H1)', false],
        ['=COUNTIF(E2:E500,H1>)', false],
      ], 'The criterion is a piece of text. ">"&H1 builds the text ">40"; ">H1" compares against the literal letters H1, and the unquoted forms are not valid syntax.'),
      mcq('An analyst wraps every formula in a margin model in IFERROR(..., 0) "to keep it clean". Why is this risky?', [
        ['A broken lookup or bad range then shows 0 and quietly lowers totals', true],
        ['IFERROR slows a workbook so much that it stops recalculating', false],
        ['IFERROR turns every result into text, so later SUMs ignore them', false],
      ], 'IFERROR hides every kind of error, including the ones that signal a mistake. The model looks tidy but reports wrong totals; catch only the error you expect, such as IFNA on a lookup.'),
    ],
  },

  /* ── LOOKUPS ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EXCEL_CORE_LOOKUPS',
    notes: `Data rarely arrives in one table. The order export has a product ID; the product name, category
and price live in a product master. A **lookup** brings a value from one table into another by a
matching key — the spreadsheet version of a SQL join.

ShopKart's two tables:

**tblProducts** (F1:I5)

| ProductID | Name | Category | Price |
|---|---|---|---|
| P101 | Bluetooth Earbuds | Electronics | 1,499 |
| P102 | Steel Bottle 1L | Home | 449 |
| P103 | Cotton Kurta | Fashion | 899 |
| P104 | Smart Watch | Electronics | 3,299 |

**tblOrders** (A1:C5)

| OrderID | ProductID | Qty |
|---|---|---|
| SK2001 | P103 | 2 |
| SK2002 | P101 | 1 |
| SK2003 | P109 | 1 |
| SK2004 | P104 | 1 |

## XLOOKUP (Excel 2021 and 365)

    =XLOOKUP(B2, $F$2:$F$5, $I$2:$I$5, "Not found")
    =XLOOKUP([@ProductID], tblProducts[ProductID], tblProducts[Price], "Not found")

\`XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode], [search_mode])\`.
It is an **exact match by default**, can return a column on either side of the key, and the fourth
argument says what to show when the key is missing. Results: SK2001 → 899, SK2002 → 1,499,
SK2003 → "Not found" (there is no P109), SK2004 → 3,299.

Give it a multi-column return array and it **spills** several values at once:
\`=XLOOKUP(B2,F2:F5,G2:I5)\` fills Name, Category and Price into three cells.

## INDEX-MATCH (every version)

    =INDEX($I$2:$I$5, MATCH(B2, $F$2:$F$5, 0))

MATCH finds the **position** of the key (P103 is 3rd), INDEX returns the 3rd value of the price
column. The \`0\` is essential: it means exact match. MATCH's default (1) is approximate. INDEX-MATCH
works in every Excel version and, like XLOOKUP, can look left.

## VLOOKUP (every version, and still everywhere)

    =VLOOKUP(B2, $F$2:$I$5, 4, FALSE)

Look B2 up in the **first column** of F2:I5 and return the **4th column**, exact match. Its
weaknesses are why XLOOKUP exists:

- **It can only look to the right** of the key column.
- **The column number is typed in.** Insert a Brand column between Name and Category and the range
  becomes F:J, but 4 still says 4 — the formula now quietly returns Category instead of Price.
- **The last argument defaults to TRUE (approximate match).** Leave it out on a product code and a
  missing code can return a neighbouring product's price instead of #N/A.

## When the key is missing

SK2003's P109 is not in the product list. Each function's answer:

| Formula | Result |
|---|---|
| XLOOKUP without if_not_found | #N/A |
| XLOOKUP with "Not found" | Not found |
| INDEX-MATCH with 0 | #N/A |
| VLOOKUP with FALSE | #N/A |

#N/A is information: a key that does not match. Count the misses before you hide them:

    =COUNTIF(tblOrders[Price],"Not found")      or     =SUM(--ISNA(C2:C500))

A key that "is clearly there" but still gives #N/A is almost always one of two things: **spaces**
("P103 " from a pasted export) or **number versus text** (101 in one table, "101" in the other).
TRIM, VALUE or TEXT on one side fixes it.

If the lookup table holds the same key twice, every lookup returns the **first** match from the top
and never warns you. Check a master table's keys are unique with \`=COUNTIF(F:F,F2)\` > 1.

## Approximate match: bands and slabs

Approximate match is right for **bands**, such as a commission slab table sorted ascending:

| From sales (₹) | Rate |
|---|---|
| 0 | 0% |
| 50,000 | 2% |
| 1,00,000 | 3.5% |
| 2,00,000 | 5% |

    =VLOOKUP(87500, $K$2:$L$5, 2, TRUE)             2%      largest "From" not above 87,500
    =XLOOKUP(87500, $K$2:$K$5, $L$2:$L$5, , -1)     2%      match_mode -1: exact or next smaller

A salesperson with ₹87,500 earns 87,500 × 2% = ₹1,750; one with ₹2,40,000 earns ₹12,000.
VLOOKUP's approximate match **requires the first column sorted ascending**; unsorted, it returns
wrong rows without an error. XLOOKUP's match mode -1 does not need the table sorted.

## The SQL view

XLOOKUP with "Not found" is a LEFT JOIN from orders to products: every order is kept, and a missing
product shows a placeholder instead of NULL. A lookup returning the first of several matches is
exactly the case where a SQL join would instead **duplicate** the order row — the same data problem
showing up differently.`,
    workedExample: `**Goal: complete the order sheet with product name and amount, and report how many orders
could not be priced.**

1. Turn both ranges into Tables (Ctrl+T) and name them tblOrders and tblProducts.
2. In tblOrders add a column **Name**:

       =XLOOKUP([@ProductID], tblProducts[ProductID], tblProducts[Name], "Not found")

3. Add **Price**, deliberately without if_not_found so a missing product shows as #N/A:

       =XLOOKUP([@ProductID], tblProducts[ProductID], tblProducts[Price])

4. Add **Amount**: \`=IFNA([@Qty]*[@Price], 0)\` — IFNA catches only the #N/A from a missing key,
   so any other error (for example a text quantity) still shows.
5. Count the problem rows on the report sheet: \`=SUM(--ISNA(tblOrders[Price]))\`.

| OrderID | ProductID | Qty | Name | Price | Amount |
|---|---|---|---|---|---|
| SK2001 | P103 | 2 | Cotton Kurta | 899 | 1,798 |
| SK2002 | P101 | 1 | Bluetooth Earbuds | 1,499 | 1,499 |
| SK2003 | P109 | 1 | Not found | #N/A | 0 |
| SK2004 | P104 | 1 | Smart Watch | 3,299 | 3,299 |

Total amount: 1,798 + 1,499 + 3,299 = **₹6,596**, with **1 order unpriced**. The report says both
numbers. Writing "₹6,596" alone would hide a missing product; the right next step is to ask the
catalogue team about P109, not to delete the row.

**Older Excel:** replace step 3 with \`=INDEX(tblProducts[Price], MATCH([@ProductID], tblProducts[ProductID], 0))\`.`,
    mcqs: [
      mcq('=VLOOKUP(B2,F2:I5,4,FALSE) has returned Price for months. Someone inserts a new Brand column between Name and Category inside the table. What does the formula return now?', [
        ['The Category value, because the column number 4 did not change', true],
        ['The Price, because VLOOKUP follows the column that was moved', false],
        ['#REF!, because the range was changed underneath the formula', false],
        ['#N/A, because the inserted Brand column is still empty', false],
      ], 'The range grows to F:J but the typed index 4 stays 4, which is now Category. XLOOKUP and INDEX-MATCH refer to the return column itself, so they survive inserted columns.'),
      mcq('Which lookup can return a value from a column to the left of the key column without rearranging the table?', [
        ['XLOOKUP or INDEX-MATCH', true],
        ['VLOOKUP with a negative column number', false],
        ['VLOOKUP with range_lookup set to TRUE', false],
        ['HLOOKUP after transposing the table with a formula', false],
      ], 'VLOOKUP always searches the first column and returns from columns to its right. XLOOKUP and INDEX-MATCH take a separate return range, which can be anywhere.'),
      mcq('Commission slabs in A2:B5 are 0 → 0%, 50,000 → 2%, 1,00,000 → 3.5% and 2,00,000 → 5%, sorted ascending. What does =VLOOKUP(87500,A2:B5,2,TRUE) return?', [
        ['2%', true],
        ['3.5%', false],
        ['#N/A', false],
        ['0%', false],
      ], 'Approximate match returns the row with the largest value not greater than the lookup value. 50,000 is the largest slab start not above 87,500, so the rate is 2%.'),
    ],
    checkpoint: [
      mcq('An XLOOKUP for product P109 returns #N/A although P109 is visible in the product list, which was pasted from a supplier PDF. What do you check first?', [
        ['Hidden spaces, or a key stored as text on one side only', true],
        ['Whether the product list is sorted in ascending order', false],
        ['Whether XLOOKUP is limited to a few thousand rows', false],
        ['Whether calculation is set to manual for this sheet', false],
      ], 'XLOOKUP matches exactly by default, so "P109 " with a trailing space, or 101 against "101", does not match. Sorting does not matter for an exact match, and XLOOKUP has no small row limit.'),
      mcq('Why is =VLOOKUP(B2,Products,3) without a fourth argument dangerous for product codes?', [
        ['It defaults to approximate match and can return a wrong row', true],
        ['It searches from the bottom of the table up towards the top', false],
        ['It returns #REF! once the table has more than three columns', false],
      ], 'Leaving out range_lookup means TRUE, an approximate match meant for sorted bands. For an ID it can return a nearby product\'s value instead of reporting #N/A.'),
      mcq('The product list holds P104 twice: ₹3,299 near the top and ₹3,499 further down. What does =XLOOKUP("P104",tblProducts[ProductID],tblProducts[Price]) return?', [
        ['₹3,299, the first match from the top', true],
        ['₹3,499, the last match in the list', false],
        ['₹6,798, both prices added together', false],
        ['#N/A, because the key appears twice', false],
      ], 'XLOOKUP searches top to bottom by default and stops at the first match, without warning about the duplicate. A master table\'s keys must be checked for uniqueness.'),
    ],
  },

  /* ── TEXT_DATES ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EXCEL_CORE_TEXT_DATES',
    notes: `Exports from billing systems, forms and banks arrive with codes that pack several facts into one
cell, names in every capitalisation, and dates that are not dates. This unit is the toolkit.

## Pulling text apart

The order code **PUN-2025-00417** packs city, year and a sequence number. With it in A2:

    =LEFT(A2,3)             PUN        first 3 characters
    =MID(A2,5,4)            2025       4 characters starting at position 5
    =RIGHT(A2,5)            00417      last 5 characters (text)
    =VALUE(RIGHT(A2,5))     417        the same as a number
    =LEN(A2)                14

When the pieces vary in length, find the separator instead of counting:

    =FIND("@", B2)                          position of @ (FIND is case-sensitive; SEARCH is not)
    =MID(B2, FIND("@",B2)+1, 100)           everything after @: the email domain
    =TEXTAFTER(B2, "@")                     the same in Excel 365
    =TEXTBEFORE(A2, "-")                    PUN (365)
    =TEXTSPLIT("Pune|Electronics|2", "|")   spills Pune, Electronics, 2 into three cells (365)

TEXTSPLIT, TEXTBEFORE and TEXTAFTER are Microsoft 365 (and Excel 2024) functions; in Excel 2021 or
earlier use FIND with LEFT/MID, or **Data > Text to Columns**, which splits a column in place.

## Tidying text

    =TRIM(B2)            removes leading and trailing spaces and squeezes inner runs to one space
    =PROPER(TRIM(B2))    "  RAHUL   verma " → "Rahul Verma"
    =UPPER(B2), =LOWER(B2)
    =CLEAN(B2)           removes non-printing characters (codes 0–31) from pasted text
    =SUBSTITUTE(B2,"₹","")      remove a character
    =C2&" - "&D2         join; =TEXTJOIN(", ",TRUE,C2:E2) joins a range, skipping blanks

TRIM does **not** remove the non-breaking space (character 160) that web pages and PDFs use. If TRIM
leaves a stubborn space, use \`=TRIM(SUBSTITUTE(B2,CHAR(160)," "))\`.

## Dates are numbers

Excel stores a date as the number of days since 1 January 1900: **15-Jan-2025 is 45672**. The
format only changes how it looks. That is why date arithmetic works:

    =B2-A2                       days between two dates (25-Mar-2025 minus 10-Mar-2025 = 15)
    =A2+30                       30 days later
    =YEAR(A2), =MONTH(A2), =DAY(A2)
    =DATE(2025,1,15)             build a date from parts
    =EOMONTH(A2,0)               last day of A2's month    (15-Jan-2025 → 31-Jan-2025)
    =EOMONTH(A2,1)               last day of next month    (→ 28-Feb-2025)
    =EDATE(A2,3)                 same day three months later
    =DATEDIF(A2,TODAY(),"Y")     whole years between, e.g. an employee's service in years
    =NETWORKDAYS(A2,B2,Holidays) working days, Monday–Friday, counting both ends
    =TEXT(A2,"mmm-yyyy")         "Jan-2025", as TEXT

**NETWORKDAYS** from 1-Jan-2025 to 31-Jan-2025 is **23**; with 14-Jan-2025 (Pongal, a Tuesday) in
the Holidays range it is **22**. A holiday that falls on a weekend changes nothing.
\`NETWORKDAYS.INTL\` handles other weekends, such as a six-day week.

**TEXT returns text.** A "Month" column built with \`=TEXT(A2,"mmm-yyyy")\` sorts alphabetically —
Apr-2025 before Jan-2025. To group by month and keep date order, use \`=EOMONTH(A2,-1)+1\` (the first
of the month, still a real date) and format it as mmm-yyyy.

## Dates that are really text

Signs: left-aligned, \`=ISNUMBER(A2)\` is FALSE, and \`=MONTH(A2)\` gives #VALUE!. Causes:

- **Day/month order.** A CSV written as dd/mm/yyyy opened on a computer set to mm/dd/yyyy: 05/01/2025
  becomes **1 May** (wrong but a real date), while 23/01/2025 cannot be a month 23 and stays text.
  Half the column is silently wrong, half is text. Fix it on import (Data > From Text/CSV, set the
  column type to Date with the right locale) rather than by hand.
- **Odd separators**, such as 15.01.2025. Rebuild the date from its pieces:

      =DATE(RIGHT(A2,4), MID(A2,4,2), LEFT(A2,2))     → 15-Jan-2025, a real date

- **A trailing space** or an apostrophe. \`=DATEVALUE(TRIM(A2))\` converts text that matches your
  computer's date settings.

## Common mistakes

- Using TEXT for a month column, then wondering why the pivot sorts Apr, Aug, Dec, Feb.
- Subtracting dates that are text and getting #VALUE!.
- Trusting a column of dates where every day is 12 or less — those are the ones day/month swaps
  turn into wrong dates without any error.`,
    mcqs: [
      mcq('A2 holds the order code PUN-2025-00417. What does =MID(A2,5,4) return?', [
        ['2025', true],
        ['-2025', false],
        ['N-20', false],
        ['2025-0', false],
      ], 'MID starts at character 5 and takes 4 characters. Characters 1–4 are "PUN-", so positions 5 to 8 are 2025 — returned as text.'),
      mcq('Order dates from a CSV are left-aligned. =MONTH(A2) works for a row showing 05/01/2025 but gives #VALUE! for one showing 23/01/2025. The file uses day/month order. What happened?', [
        ['Excel read them as month/day: low days became wrong dates, the rest stayed text', true],
        ['MONTH works only on dates displayed with a four-digit year, so it rejects some rows', false],
        ['The CSV includes times, and MONTH cannot read a date that has a time part', false],
      ], 'On a month/day system 05/01/2025 is a valid date (1 May, wrong), while 23/01/2025 cannot be month 23 and stays text, so MONTH fails on it. Set the column type and locale when importing.'),
      mcq('A Month column built with =TEXT(A2,"mmm-yyyy") is sorted, and Apr-2025 appears before Jan-2025. Why?', [
        ['TEXT returns text, and text sorts alphabetically', true],
        ['SORT orders months by how many days each month has', false],
        ['The yyyy code makes Excel sort the years in descending order', false],
      ], 'Once a date is turned into text it is just letters, and "Apr" comes before "Jan". Keep a real date such as the first of the month and format it to look like Jan-2025.'),
    ],
    checkpoint: [
      mcq('What does =EOMONTH(DATE(2025,1,15),1) show when the cell is formatted as a date?', [
        ['28-Feb-2025', true],
        ['31-Jan-2025', false],
        ['15-Feb-2025', false],
        ['01-Mar-2025', false],
      ], 'EOMONTH moves the given number of months and returns the last day of that month. One month after January is February, which ends on 28-Feb-2025.'),
      mcq('B2 holds "  RAHUL   verma " copied from a web form. Which formula returns "Rahul Verma"?', [
        ['=PROPER(TRIM(B2))', true],
        ['=TRIM(PROPER(LEFT(B2)))', false],
        ['=UPPER(TRIM(B2))', false],
        ['=CLEAN(B2)', false],
      ], 'TRIM removes the outer spaces and squeezes the inner run to one space; PROPER then capitalises each word. CLEAN removes only non-printing characters.'),
      mcq('A2 holds the date 10-Mar-2025 and B2 holds 25-Mar-2025. What does =B2-A2 return when the cell is formatted as a number?', [
        ['15', true],
        ['16', false],
        ['#VALUE!', false],
        ['25', false],
      ], 'Dates are stored as day numbers, so subtracting them gives the number of days between: 25 − 10 = 15. NETWORKDAYS is the function that counts both ends.'),
    ],
  },

  /* ── CLEANING_IN_EXCEL ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EXCEL_CORE_CLEANING_IN_EXCEL',
    notes: `Analysts commonly say most of the work is cleaning. The skill is not only making the data
right once; it is making the cleaning **repeatable**, because the same messy file arrives again next
month.

Here is part of a customer list exported from a bank branch's account-opening forms:

| CustID | Name | City | Phone | Account | Income |
|---|---|---|---|---|---|
| C101 | Priya Sharma | Hyderabad | 9876501234 | Savings | 65000 |
| C102 | rahul verma | hyderabad | 9845012345 | savings | |
| C103 | Mohd Irfan | Hyd | 9900112233 | Current | 120000 |
| C101 | Priya Sharma | Hyderabad | 9876501234 | Savings | 65000 |
| C104 |  Anil Kumar | HYD  | 98450 12345 | Salary | 48000 |

## Step 1 — profile before you change anything

Count before fixing, so you know what changed:

    =COUNTA(A2:A501)                 rows
    =ROWS(UNIQUE(A2:A501))           distinct customer IDs (365/2021)
    =COUNTBLANK(F2:F501)             missing incomes
    =UNIQUE(C2:C501)                 every spelling of every city, spilled into a list

UNIQUE on the City column is the fastest way to see the mess: Hyderabad, hyderabad, Hyd, "HYD ".

## Step 2 — fix spaces and case

Helper columns with \`=TRIM(B2)\`, \`=PROPER(TRIM(B2))\`; then copy and **Paste Special > Values** over
the originals in your working copy (never in Raw). Remember TRIM leaves the non-breaking space
CHAR(160).

## Step 3 — standardise categories with a mapping table

PROPER turns "hyderabad" into "Hyderabad" but cannot know that "Hyd" means Hyderabad. Make a small
table of every variant and its standard name, and look it up:

| Variant | Standard |
|---|---|
| hyderabad | Hyderabad |
| hyd | Hyderabad |
| secunderabad | Hyderabad |

    =XLOOKUP(LOWER(TRIM(C2)), tblCityMap[Variant], tblCityMap[Standard], PROPER(TRIM(C2)))

New spellings next month are handled by adding a row to the map — the rule is visible and
reusable, unlike a dozen Find & Replace operations nobody remembers.

## Step 4 — duplicates

First **flag**, then decide:

    =COUNTIF($A$2:A2, A2)>1          TRUE on the 2nd, 3rd … appearance of an ID
    =COUNTIF($A$2:$A$501, A2)>1      TRUE on EVERY row of an ID that appears more than once

The expanding range \`$A$2:A2\` grows as the formula is copied down, so it counts only appearances
so far. **Data > Remove Duplicates** deletes rows in place and compares only the columns you tick:
tick Phone alone and two family members sharing a phone become one customer. Decide what makes a
row a duplicate (here, the same CustID) before you remove anything, and keep the count of rows
removed.

## Step 5 — blanks

A blank is a decision, not a cell to fill with 0. An empty Income means "not stated"; filling it
with 0 says the customer earns nothing and drags \`AVERAGE\` down. Options: leave it blank (AVERAGE
skips it), flag it in a column, or fill it from another source. **Home > Find & Select > Go To
Special > Blanks** selects every empty cell so you can see where they are.

## Step 6 — stop the mess coming back: Data Validation

On the input form or sheet, **Data > Data Validation > List** with source \`=tblCityMap[Standard]\`
gives a dropdown, so users cannot type "Hyd" in the first place. Validation can also restrict a
phone column to whole numbers of 10 digits, or a date column to dates in this financial year.

## Flash Fill

Type the first result by hand next to the data (for "Anil Kumar" type "Anil") and press **Ctrl+E**;
Excel guesses the pattern and fills the column. It is fast, but it fills **values, not formulas**:
next month's rows are not filled, and a guess that is wrong on row 312 gives no warning. Use it for
one-off work and check the result.

## Power Query: cleaning you can replay

**Data > Get Data** (or **From Table/Range**) opens Power Query. Every action becomes a recorded
step in **Applied Steps**: Trim, Capitalise Each Word, Replace Values, Merge with the city map,
Remove Duplicates on CustID, Change Type to Date. **Close & Load** writes a clean Table. Next month,
drop in the new file and press **Refresh**: every step runs again, in order. This is the professional
answer to "I clean the same file every month" — and the steps are the documentation.

## A cleaning log

Keep a short log on a sheet: *500 rows received; 6 duplicate CustIDs removed; 11 city variants
mapped; 40 incomes blank, left blank*. The log is what lets a manager trust the numbers.`,
    mcqs: [
      mcq('Flash Fill split "Name - City" into two columns for March. In April, new rows are added under the data. What happens to the split columns?', [
        ['Nothing: Flash Fill typed values once, so it has to be run again', true],
        ['They extend automatically, like a calculated column in a Table', false],
        ['They show #SPILL! until the new rows are filled in by hand', false],
      ], 'Flash Fill writes static values, not formulas. New rows get nothing until Flash Fill is run again, which is why it suits one-off work rather than a monthly process.'),
      mcq('Remove Duplicates is run on a customer sheet with only the Phone column ticked. Two rows share a phone number but are different people in one family. What happens?', [
        ['The second row is deleted, though it is a different customer', true],
        ['Both rows are kept, because their names are different', false],
        ['Both rows are deleted, so no repeated phone number remains', false],
        ['Excel asks which of the two rows should be kept', false],
      ], 'Remove Duplicates compares only the ticked columns and keeps the first row of each match. Decide what defines a duplicate — here the customer ID — before removing anything.'),
      mcq('A sales file arrives every month in the same messy shape. Why is Power Query a better choice than cleaning it by hand each time?', [
        ['Its steps are recorded and re-run on the new file with Refresh', true],
        ['It is the only tool in Excel that can strip leading and trailing spaces', false],
        ['It fixes the source system so that future files arrive already clean', false],
      ], 'Power Query records each transformation as an Applied Step. Refresh repeats them on next month\'s file, so the cleaning is repeatable and documented; the source system is unchanged.'),
    ],
    checkpoint: [
      mcq('In B2, =COUNTIF($A$2:A2,A2)>1 is copied down a column of 500 customer IDs. Which rows show TRUE?', [
        ['Every repeat after an ID\'s first appearance', true],
        ['Every row of an ID that appears more than once, including the first', false],
        ['Only the last copy of each repeated ID', false],
        ['IDs that appear exactly once in the column', false],
      ], 'The range $A$2:A2 grows one row at a time, so each row counts the appearances so far. The first appearance counts 1 (FALSE); every later one counts 2 or more (TRUE).'),
      mcq('City values include "Hyderabad", "hyderabad", "Hyd" and "HYD ". What is the most reliable fix before building a city summary?', [
        ['A mapping table of variants to one name, applied by lookup after TRIM', true],
        ['Sorting the column so that the variants sit next to each other', false],
        ['Applying PROPER to the column so every value starts with a capital letter', false],
      ], 'Trimming and case fixes cannot know that "Hyd" means Hyderabad. A mapping table handles every variant, can be extended next month, and documents the rule.'),
      mcq('A survey sheet has blank Income cells for 40 of 600 respondents. A teammate fills them with 0 so that the average "works". What is the effect?', [
        ['The average falls, since 40 people now count as earning ₹0', true],
        ['Nothing changes, because AVERAGE already counted blanks as 0', false],
        ['The average rises, because AVERAGE skips cells holding zero', false],
      ], 'AVERAGE skips blanks but includes zeros. Filling 40 blanks with 0 adds 40 people with no income to the denominator and drags the mean down.'),
    ],
  },
  /* ── DEBUGGING ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EXCEL_CORE_DEBUGGING',
    notes: `A wrong spreadsheet rarely announces itself. Sometimes you get an error value; more often you
get a number that looks reasonable and is wrong. Debug by **symptom → cause → fix**, and check one
thing at a time. Two habits catch most problems before anyone else sees them: **reconcile every
breakdown to a grand total**, and **compare COUNT with COUNTA** on any column that should be numbers.

Tools that help: **Formulas > Evaluate Formula** steps through a formula one piece at a time;
**Trace Precedents** draws arrows to the cells a formula reads; **Ctrl+\`** (the key left of 1) shows
formulas instead of results across the sheet; selecting cells shows their Sum and Count in the status
bar without writing anything.

## 1. #N/A from a lookup, for a key that is "clearly there"

- **Symptom:** \`=XLOOKUP(B2,tblProducts[ProductID],tblProducts[Price])\` gives #N/A for P103, and P103
  is visible in the product list.
- **Cause:** the key differs invisibly — "P103 " with a trailing space from an export, or 101 stored as
  a number in one table and as text in the other. Test with \`=B2=F4\` (FALSE) and \`=LEN(B2)\`.
- **Fix:** clean the key on one side: \`TRIM\`, \`VALUE\` for text-numbers, or \`TEXT(B2,"0")\` the other
  way. Then fix the cleaning step so it does not come back.

## 2. A total that is too low, with no error anywhere

- **Symptom:** \`=SUM(D2:D400)\` is ₹3,40,000 below the billing system. \`=COUNT(D2:D400)\` is 381 but
  \`=COUNTA(D2:D400)\` is 399.
- **Cause:** 18 amounts are stored as **text** (left-aligned, often with a small green triangle). SUM
  skips text without warning.
- **Fix:** select the column and use the warning icon's **Convert to Number**, or Data > Text to
  Columns > Finish, or a helper column \`=VALUE(D2)\`. Re-check that COUNT now equals COUNTA.

## 3. A total that is exactly double

- **Symptom:** the January total is twice what the finance team reports.
- **Cause:** the data has a typed subtotal row after each city or month, and \`SUM\` over the whole
  range adds every order **and** every subtotal. The same data in a pivot counts the subtotal rows as
  orders.
- **Fix:** take subtotal rows out of the data; totals belong in a pivot or a separate summary. If
  subtotals must stay, build them with \`SUBTOTAL(9, …)\` and total with \`SUBTOTAL(9, …)\`, which skips
  other SUBTOTAL cells.

## 4. #VALUE! from simple arithmetic

- **Symptom:** \`=D2*E2\` gives #VALUE!; D2 shows "₹1,200" on the left of the cell.
- **Cause:** the ₹ sign was typed or exported as part of the text, so D2 is text Excel cannot turn
  into a number.
- **Fix:** \`=VALUE(SUBSTITUTE(D2,"₹",""))\`, and at source keep amounts as plain numbers with a currency
  **format**, never typed symbols.

## 5. First row right, every other row 0 or wrong

- **Symptom:** E2 \`=D2*F1\` gives the right GST; E3 onwards show 0.
- **Cause:** F1, the rate, is a relative reference and slid down to F2, F3… when copied.
- **Fix:** \`=D2*$F$1\` (press F4), or name the cell GST_Rate. Use Ctrl+\` to see the copied formulas.

## 6. A lookup that returns a plausible but wrong price

- **Symptom:** an order for P109, which is not in the catalogue, shows ₹899 — another product's price.
- **Cause:** \`=VLOOKUP(B2,F2:I5,4)\` without the fourth argument does an approximate match and returns
  the nearest key below. No error, just a wrong number.
- **Fix:** \`=VLOOKUP(B2,F2:I5,4,FALSE)\`, or XLOOKUP, which is exact by default.

## 7. #REF! after tidying the workbook

- **Symptom:** a report suddenly shows #REF! everywhere.
- **Cause:** a column, row or sheet that formulas pointed at was **deleted** (not cleared). The
  formula now literally contains #REF! in place of the reference.
- **Fix:** Undo if you can. Otherwise rebuild the reference. Prefer Tables and structured references,
  which adjust when columns move, and never delete a "helper" column without Trace Dependents first.

## 8. A COUNTIFS that comes out too low

- **Symptom:** \`=COUNTIFS(B2:B500,"Mumbai",C2:C500,">="&DATE(2025,1,1))\` gives 41; filtering the
  sheet by eye shows about 60 Mumbai orders in 2025.
- **Cause:** some City cells are "Mumbai " with a trailing space, and some dates are text (left-aligned),
  which a date comparison does not match.
- **Fix:** \`=UNIQUE(B2:B500)\` exposes the city variants; \`=SUM(--ISTEXT(C2:C500))\` counts the text dates.
  Clean both columns, then recount.

## The order to check things

1. Is every number a number? (COUNT vs COUNTA, alignment, ISNUMBER.)
2. Does each key match exactly? (TRIM, LEN, type.)
3. Does every copied reference point where you think? (Ctrl+\`, F2 on a cell far down.)
4. Do the parts add up to the whole? (Reconcile to the grand total.)`,
    mcqs: [
      mcq('=SUM(D2:D400) of order amounts is ₹3,40,000 below the billing system. =COUNT(D2:D400) is 381 and =COUNTA(D2:D400) is 399. What is the likely cause?', [
        ['18 amounts are stored as text, which SUM skips', true],
        ['18 rows are hidden by a filter, and SUM leaves hidden rows out', false],
        ['18 cells hold refunds as negative numbers that SUM subtracts', false],
        ['18 orders are duplicates that SUM counts only once', false],
      ], 'COUNT counts numbers and COUNTA counts every non-empty cell, so 18 cells hold something that is not a number. SUM silently ignores text; it does include rows hidden by a filter.'),
      mcq('A monthly sales sheet has a typed subtotal row after each city, and =SUM(D2:D400) comes out exactly twice the real total. What is the right fix?', [
        ['Take the subtotal rows out of the data and total only the order rows', true],
        ['Change SUM to AVERAGE and multiply the result by the number of rows', false],
        ['Format the subtotal rows in bold so that Excel leaves them out', false],
      ], 'Each order is added once on its own row and again inside its city subtotal, so the sum doubles. Totals belong in a pivot or summary, not in the data; formatting does not change what SUM adds.'),
      mcq('=D2*E2 returns #VALUE! for a row where D2 shows "₹1,200" sitting on the left of the cell. What is the cause?', [
        ['D2 is text including the ₹ sign, which Excel cannot multiply', true],
        ['E2 is empty, and multiplying by an empty cell is an error', false],
        ['The comma in 1,200 must be removed from every number format', false],
        ['Rupee-formatted cells can be added but never multiplied', false],
      ], 'A typed ₹ makes the cell text that cannot be converted to a number, so arithmetic fails. An empty E2 counts as 0 and gives 0, not an error. Keep amounts as numbers with a currency format.'),
      mcq('An order for product code P109, which is not in the catalogue, shows a price of ₹899 from =VLOOKUP(B2,F2:I5,4). What explains the wrong price?', [
        ['The missing fourth argument makes it an approximate match', true],
        ['VLOOKUP fills a missing key with the price on the row above', false],
        ['Column 4 is counted from the right-hand end of the table', false],
      ], 'Without FALSE, VLOOKUP does an approximate match and returns the nearest key below P109, so a wrong price appears with no error. FALSE or XLOOKUP gives #N/A for a missing code.'),
    ],
  },

  /* ── PRACTICE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EXCEL_CORE_PRACTICE',
    notes: `Six exercises on one small dataset. Type the table into a blank sheet (A1:F7), make it a Table
named **tblLoans**, and write each answer as a formula — never type a result. Check your results
against the answers at the end.

Loan applications received by a bank branch in Vijayawada in September 2025:

| AppID | Applicant | Type | Amount | Score | Applied |
|---|---|---|---|---|---|
| L01 | Ravi Kumar | Home | 25,00,000 | 742 | 02-Sep-2025 |
| L02 | Anjali Rao | Personal | 3,00,000 | 688 | 04-Sep-2025 |
| L03 | Mohd Irfan | Vehicle | 8,50,000 | 715 | 04-Sep-2025 |
| L04 | Sneha Patil | Home | 42,00,000 | 790 | 11-Sep-2025 |
| L05 | Kiran Das | Personal | 1,50,000 | 640 | 15-Sep-2025 |
| L06 | Lakshmi N | Vehicle | 6,00,000 | 702 | 22-Sep-2025 |

A rates table in H1:I4:

| Type | Rate |
|---|---|
| Home | 8.5% |
| Vehicle | 9.25% |
| Personal | 11.5% |

## Exercise 1 — counts and totals
How many Home loan applications are there? What is the total amount applied for as Vehicle loans?
Use COUNTIF and SUMIFS.

## Exercise 2 — a decision column
Add a column **Decision**: "Approve" when Score is 700 or more, "Review" from 650 to 699,
"Reject" below 650. Write it once with IFS, and once with nested IF for Excel 2016.

## Exercise 3 — a rate lookup
Add **Rate** with XLOOKUP from the rates table, then **FirstYearInterest** = Amount × Rate
(simple interest, for this exercise). Then write the Rate formula again with INDEX-MATCH.

## Exercise 4 — dates
Add **DaysLeftInMonth** = the number of days from the application date to the end of its month.
Use EOMONTH. Which application day was a Monday? Use \`=TEXT([@Applied],"dddd")\`.

## Exercise 5 — conditional averages
What is the average Score of the applications that would be approved? What total amount would be
approved? Use AVERAGEIFS and SUMIFS with \`">=700"\`.

## Exercise 6 — text
Add **Surname**: everything after the first space in Applicant. Write it with MID and FIND so it
works in every version, and with TEXTAFTER for Excel 365.

## Answers

1. \`=COUNTIF(tblLoans[Type],"Home")\` → **2**. \`=SUMIFS(tblLoans[Amount],tblLoans[Type],"Vehicle")\` →
   **₹14,50,000**.
2. \`=IFS([@Score]>=700,"Approve",[@Score]>=650,"Review",TRUE,"Reject")\` — L01, L03, L04, L06 Approve;
   L02 Review; L05 Reject. Nested: \`=IF([@Score]>=700,"Approve",IF([@Score]>=650,"Review","Reject"))\`.
3. \`=XLOOKUP([@Type],$H$2:$H$4,$I$2:$I$4)\`. Interest: L01 ₹2,12,500; L02 ₹34,500; L03 ₹78,625;
   L04 ₹3,57,000; L05 ₹17,250; L06 ₹55,500. INDEX-MATCH:
   \`=INDEX($I$2:$I$4,MATCH([@Type],$H$2:$H$4,0))\`.
4. \`=EOMONTH([@Applied],0)-[@Applied]\` → L01 28, L02 26, L03 26, L04 19, L05 15, L06 8. L05 and L06
   (15 and 22 September) were Mondays.
5. \`=AVERAGEIFS(tblLoans[Score],tblLoans[Score],">=700")\` → **737.25** ((742+715+790+702)/4).
   \`=SUMIFS(tblLoans[Amount],tblLoans[Score],">=700")\` → **₹81,50,000**.
6. \`=MID([@Applicant],FIND(" ",[@Applicant])+1,50)\` and \`=TEXTAFTER([@Applicant]," ")\` → Kumar, Rao,
   Irfan, Patil, Das, N. (For "Mohd Irfan" the surname is "Irfan"; real name data needs a rule for
   three-part names — decide it with whoever uses the report.)

**Reconcile:** all six amounts add to ₹86,00,000; approved ₹81,50,000 plus Review ₹3,00,000 plus
Reject ₹1,50,000 gives the same ₹86,00,000.`,
    mcqs: [
      mcq('In tblLoans, Type is Home, Personal, Vehicle, Home, Personal, Vehicle and Amount is 25,00,000; 3,00,000; 8,50,000; 42,00,000; 1,50,000; 6,00,000. What does =SUMIFS(tblLoans[Amount],tblLoans[Type],"Vehicle") return?', [
        ['₹14,50,000', true],
        ['₹8,50,000', false],
        ['₹86,00,000', false],
        ['2', false],
      ], 'SUMIFS adds Amount only on Vehicle rows: 8,50,000 + 6,00,000 = 14,50,000. ₹86,00,000 is every loan, and 2 is the count of Vehicle rows.'),
      mcq('The decision column is =IFS([@Score]>=700,"Approve",[@Score]>=650,"Review",TRUE,"Reject"). What does it return for a score of 688?', [
        ['Review', true],
        ['Approve', false],
        ['Reject', false],
        ['#N/A', false],
      ], '688 fails the first test (>=700) and passes the second (>=650), and IFS returns the value for the first TRUE test. The TRUE pair at the end means no row can reach #N/A.'),
      mcq('The rates table lists Home 8.5%, Vehicle 9.25% and Personal 11.5%. What does =[@Amount]*XLOOKUP([@Type],$H$2:$H$4,$I$2:$I$4) give for a ₹6,00,000 Vehicle loan?', [
        ['₹55,500', true],
        ['₹51,000', false],
        ['₹69,000', false],
        ['₹5,550', false],
      ], 'XLOOKUP finds Vehicle and returns 9.25%; 6,00,000 × 0.0925 = 55,500. ₹51,000 uses the Home rate and ₹69,000 the Personal rate.'),
      mcq('An application date in tblLoans is 22-Sep-2025. What does =EOMONTH([@Applied],0)-[@Applied] return?', [
        ['8', true],
        ['9', false],
        ['30', false],
        ['22', false],
      ], 'EOMONTH(date, 0) is 30-Sep-2025, and 30 − 22 = 8 days. Subtracting two dates gives the days between them, not counting the start day.'),
      mcq('Which formula returns the surname "Patil" from "Sneha Patil" in B2 and works in every Excel version?', [
        ['=MID(B2,FIND(" ",B2)+1,50)', true],
        ['=LEFT(B2,FIND(" ",B2)-1)', false],
        ['=TEXTAFTER(B2," ")', false],
        ['=TRIM(B2)', false],
      ], 'FIND gives the space\'s position and MID takes the characters after it. LEFT with FIND returns the first name, and TEXTAFTER is a Microsoft 365 function, so it does not work in every version.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ───────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EXCEL_CORE_INTERVIEW_QUESTION',
    notes: `Analyst interviews nearly always include Excel, often as a live screen-share. The questions
below are the ones asked most. Practise answering each aloud in under two minutes, and expect the
interviewer to hand you a sheet and say "show me".

## Q1. "VLOOKUP, INDEX-MATCH or XLOOKUP — which do you use, and why?"

**Model answer.** "On Excel 365 I use XLOOKUP: it is exact match by default, it can return columns on
either side of the key, it refers to the return column itself so inserting a column does not break
it, and it has an if-not-found argument. Where colleagues are on older Excel I use INDEX-MATCH with 0
as the match type, which has the same strengths except the built-in not-found value. I avoid VLOOKUP
in shared models because its column number is hard-coded — insert a column and it silently returns the
wrong field — and because leaving out FALSE gives an approximate match. Whichever I use, I count the
#N/A results before hiding them, because a missing key is a data problem someone needs to know about."

**Follow-ups:**
- *"When would you want approximate match?"* — For bands: tax slabs, commission tiers, discount
  levels. VLOOKUP's TRUE needs the first column sorted ascending; XLOOKUP's match mode -1 does not.
- *"The key is there but you get #N/A — why?"* — Spaces or number-versus-text; check with LEN and
  ISNUMBER, fix with TRIM or VALUE.
- *"What if the lookup table has duplicate keys?"* — Lookups return the first match silently, so I
  check uniqueness with COUNTIF first; in SQL the same duplicate would multiply rows in a join.

## Q2. "You receive a customer list with duplicates, inconsistent city names and blanks. Walk me through cleaning it."

**Model answer.** "First I keep the raw file untouched and work on a copy, and I profile it: row
count, distinct IDs, blanks per column, and UNIQUE on the categorical columns to see every variant.
Then TRIM and PROPER for spaces and case; a mapping table for variants like Hyd and Secunderabad,
applied with XLOOKUP; duplicates flagged with COUNTIF on the customer ID — I decide what defines a
duplicate before removing anything; and blanks left blank or flagged, not filled with zero, because
zero changes averages. If the file comes every month I do it all in Power Query so Refresh repeats
it. Finally I write a short log: how many rows came in, how many duplicates removed, what was mapped."

**Follow-ups:**
- *"How do you stop it happening again?"* — Data Validation lists on the input sheet, and feedback to
  the team or system that produces the file.
- *"Remove Duplicates or a formula?"* — Flag with a formula first so I can review; Remove Duplicates
  deletes in place and compares only the ticked columns.

## Q3. "Calculate total sales by region and month using formulas, not a pivot. How do you check it?"

**Model answer.** "I put regions down a column and month-start dates across a row, then one SUMIFS
with mixed references, copied over the grid:

    =SUMIFS(tblSales[Amount], tblSales[Region], $A2,
            tblSales[Date], ">="&B$1, tblSales[Date], "<="&EOMONTH(B$1,0))

Region locks its column, the month locks its row. Dates must be real dates for the comparisons to
work, so I check ISNUMBER on the date column first. Then I reconcile: the grid's grand total must
equal SUM of the whole Amount column. If it is lower, some rows have a region or date outside my
labels — a misspelt region or a text date — and I find them with UNIQUE or a COUNTIFS of rows not
matched."

**Follow-ups:**
- *"Why not a pivot?"* — I would, for exploration. Formulas suit a fixed report layout that must not
  change shape, and they reference a Table so new data flows in.
- *"What if the date column has times in it?"* — The "<=" end-of-month test would miss sales after
  midnight on the last day; use \`"<"&EOMONTH(B$1,0)+1\` instead.

## How you are judged

Interviewers want to hear the failure modes — wrong column after an insert, text-numbers, totals that
do not reconcile — not just function names. Mentioning that you check results against a total, out
loud, is what separates an analyst from someone who knows Excel.`,
    mcqs: [
      mcq('An interviewer asks why you avoid VLOOKUP in a shared model. Which reason is accurate?', [
        ['Its column index is typed in, so inserting a column can return the wrong field', true],
        ['It is not supported in Excel 365 and will be removed in the next release', false],
        ['It can only search tables that have been sorted in descending order', false],
      ], 'VLOOKUP is still fully supported, and exact match needs no sorting. Its real weakness is the hard-coded column number, plus the approximate-match default.'),
      mcq('In a region-by-month SUMIFS grid, the Date column contains date and time values. Why can "<="&EOMONTH(B$1,0) miss sales?', [
        ['A sale at 3 pm on the last day is later than that date\'s midnight', true],
        ['EOMONTH returns text, so the comparison with real dates fails', false],
        ['SUMIFS ignores any criterion that compares against a date value', false],
        ['The time part makes every date in the column sort as text', false],
      ], 'EOMONTH returns the last day at 00:00. A value with a time on that day is larger, so "<=" excludes it. Testing "<" the next day\'s start includes the whole last day.'),
      mcq('After building a sales-by-region grid with SUMIFS, the grid\'s grand total is ₹42,000 lower than SUM of the whole Amount column. What does this most likely show?', [
        ['Some rows have a region or date the grid does not list', true],
        ['SUMIFS rounds each cell, and the rounding adds up to ₹42,000', false],
        ['The SUM of the whole column double-counts the header row', false],
      ], 'SUMIFS adds only rows matching a listed region and month, so the gap is rows with a misspelt region, a text date or a date outside the months shown. A header is text and SUM ignores it.'),
    ],
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EXCEL_CORE_CHECKPOINT',
    notes: `Ten questions on Excel formulas the way an analyst job uses them: reading a formula and saying
what it returns, choosing the formula for a business question, and diagnosing a sheet that gives the
wrong answer. They cover references, conditional aggregation, lookups, text and dates, and cleaning.
Work each one from what Excel actually does — including what it silently skips.`,
    checkpoint: [
      mcq('Order dates are in A2:A900, amounts in C2:C900, and H1 holds the date 01-Feb-2025. Which formula totals February 2025 sales?', [
        ['=SUMIFS(C2:C900,A2:A900,">="&H1,A2:A900,"<="&EOMONTH(H1,0))', true],
        ['=SUMIFS(C2:C900,A2:A900,"Feb-2025")', false],
        ['=SUMIF(A2:A900,">="&H1,C2:C900)', false],
        ['=SUMIFS(A2:A900,C2:C900,">="&H1,C2:C900,"<="&EOMONTH(H1,0))', false],
      ], 'Two date criteria on the same column bound the month, from the 1st to EOMONTH. The SUMIF version has no end date, and the last option adds the dates while testing the amounts.'),
      mcq('An amount column gives =COUNT(D2:D501) = 480 and =COUNTA(D2:D501) = 500. What does that tell you?', [
        ['20 non-empty cells are not numbers, so SUM would skip them', true],
        ['20 cells are empty and should be filled in with zeros', false],
        ['20 of the amounts are duplicates of other rows', false],
        ['20 cells are hidden by the current filter on the sheet', false],
      ], 'COUNTA counts every non-empty cell and COUNT only numbers. Twenty cells hold text — often numbers stored as text — which SUM and AVERAGE ignore.'),
      mcq('B2 holds =B$1*$A2 and is copied to C3. What formula is in C3?', [
        ['=C$1*$A3', true],
        ['=B$1*$A3', false],
        ['=C$1*$A2', false],
        ['=C2*A3', false],
      ], 'The copy moves one column right and one row down. B$1 keeps row 1 and moves to column C; $A2 keeps column A and moves to row 3.'),
      mcq('A2:A6 hold Pune, Goa, Delhi, Goa, Agra and C2:C6 hold 120, 340, 560, 780, 900. What does =INDEX(C2:C6,MATCH("Goa",A2:A6,0)) return?', [
        ['340', true],
        ['780', false],
        ['1120', false],
        ['#N/A', false],
      ], 'MATCH with 0 returns the position of the first exact match, 2, and INDEX returns the 2nd value of C2:C6. Lookups do not add up repeated keys.'),
      mcq('An order was placed on Friday 3-Jan-2025 and delivered on Thursday 9-Jan-2025. What does =NETWORKDAYS(A2,B2) return?', [
        ['5', true],
        ['6', false],
        ['4', false],
        ['7', false],
      ], 'NETWORKDAYS counts Monday-to-Friday days including both ends: Friday the 3rd, then Monday to Thursday, the 6th to the 9th. That is 5; the weekend is skipped.'),
      mcq('TRIM has been applied to a product-code column pasted from a website, yet XLOOKUP still cannot match "P205". LEN shows 5 characters. What is the likely cause?', [
        ['A non-breaking space, character 160, which TRIM leaves alone', true],
        ['TRIM converts codes to lower case, so "p205" no longer matches', false],
        ['XLOOKUP needs the product list sorted before it can match', false],
      ], 'Web pages often use the non-breaking space (CHAR(160)), which TRIM does not remove. SUBSTITUTE(B2,CHAR(160)," ") before TRIM fixes it.'),
      mcq('=XLOOKUP(B2,tblProducts[ProductID],tblProducts[Price],0) is used to price orders. What is the risk of using 0 as the if_not_found value?', [
        ['An unknown product counts as free, and totals quietly drop', true],
        ['XLOOKUP rejects a number as the if_not_found argument', false],
        ['It switches XLOOKUP over to approximate matching', false],
        ['Every order then shows 0, whether or not it matched', false],
      ], 'The fourth argument is used only when the key is missing, so missing products show ₹0 and blend into the totals. A visible "Not found" or #N/A, counted and reported, is safer.'),
      mcq('A slab table in A2:B5 lists 1,00,000 → 3.5%, 0 → 0%, 2,00,000 → 5% and 50,000 → 2% in that order. =VLOOKUP(120000,A2:B5,2,TRUE) gives an unexpected rate. Why?', [
        ['Approximate match needs the first column sorted ascending', true],
        ['VLOOKUP cannot return percentages from a lookup table', false],
        ['TRUE asks for an exact match, and 1,20,000 is not in the list', false],
        ['The slab values must be stored as text for VLOOKUP to read them', false],
      ], 'Approximate match uses a binary search that assumes ascending order; on an unsorted column it can stop on the wrong row without an error. Sort the slabs, or use XLOOKUP with match mode -1.'),
      mcq('A team cleans the same vendor file every month: trim names, map city variants, remove duplicate IDs, fix date types. Which approach repeats the cleaning with the least effort and risk?', [
        ['Power Query steps, refreshed on each new file', true],
        ['Flash Fill, run again on each month\'s columns', false],
        ['A written checklist of manual Find & Replace edits', false],
      ], 'Power Query records each step and replays it on Refresh, so the cleaning is identical every month and documented. Flash Fill and manual edits must be redone and can differ each time.'),
      mcq('A Swaad Express sheet has City in B2:B9 and delivery Mins in E2:E9. Which formula gives the average delivery time for Chennai orders?', [
        ['=AVERAGEIFS(E2:E9,B2:B9,"Chennai")', true],
        ['=AVERAGEIFS(B2:B9,"Chennai",E2:E9)', false],
        ['=AVERAGE(E2:E9,"Chennai")', false],
        ['=AVERAGEIF(E2:E9,"Chennai",B2:B9)', false],
      ], 'AVERAGEIFS takes the range to average first and then range–criterion pairs. AVERAGE has no criteria, and the AVERAGEIF version has the condition and average ranges swapped.'),
    ],
  },

  /* ══════════════════════════════════════════════════════════════════════════════════════
   * DT_EXCEL_ANALYSIS — sorting, pivots, charts, what-if and dashboards
   * ════════════════════════════════════════════════════════════════════════════════════ */

  /* ── SORT_FILTER ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EXCEL_ANALYSIS_SORT_FILTER',
    notes: `"Which stores did best?", "which orders were over ₹50,000 in the South?", "what are our
regions?" — these are **which ones** questions, answered by sorting and filtering. Excel has two ways:
the menu tools that rearrange the sheet, and the dynamic array functions that produce an answer in
another place and **update themselves** when the data changes.

The data for this topic — weekly sales lines from UrbanMart, a retail chain, in a Table named
**tblSales** (A1:E13):

| WeekOf | Store | Region | Category | Revenue |
|---|---|---|---|---|
| 08-Jan-2025 | S101 | South | Grocery | 48,000 |
| 15-Jan-2025 | N201 | North | Apparel | 62,000 |
| 22-Jan-2025 | W301 | West | Electronics | 1,15,000 |
| 29-Jan-2025 | S102 | South | Electronics | 88,000 |
| 05-Feb-2025 | N201 | North | Grocery | 51,000 |
| 12-Feb-2025 | W302 | West | Apparel | 47,000 |
| 19-Feb-2025 | S101 | South | Apparel | 39,000 |
| 26-Feb-2025 | N202 | North | Electronics | 1,32,000 |
| 05-Mar-2025 | W301 | West | Grocery | 56,000 |
| 12-Mar-2025 | S102 | South | Grocery | 61,000 |
| 19-Mar-2025 | N201 | North | Apparel | 70,000 |
| 26-Mar-2025 | W302 | West | Electronics | 98,000 |

Total revenue: **₹8,67,000**.

## Sorting with the menu

**Data > Sort** sorts by several levels: Region A→Z, then Revenue largest→smallest within each region.
Select one cell inside the data (or use a Table) so Excel sorts whole rows; selecting a single column
and choosing "Continue with the current selection" sorts that column alone and **scrambles the rows**
— each revenue now sits next to the wrong store. Sorting a Table header's dropdown is always safe.

Custom lists (File > Options > Advanced > Edit Custom Lists) sort months or sizes in their natural
order instead of A→Z.

## Filtering with the menu

**Ctrl+Shift+L** adds filter arrows. Text filters (contains, begins with), number filters (greater
than, top 10), date filters (this month, between). A filter **hides** rows; it does not remove them,
and a plain SUM still counts the hidden ones (SUBTOTAL and AGGREGATE do not).

## Dynamic arrays (Excel 2021 and 365)

A dynamic array formula returns many values into the cells below and right of it — it **spills**.
Refer to the whole result with \`#\`: if the formula is in H2, \`H2#\` is the spilled range.

    =UNIQUE(tblSales[Region])                               South, North, West
    =SORT(UNIQUE(tblSales[Region]))                         North, South, West
    =FILTER(tblSales, tblSales[Region]="South")             the 4 South rows, all columns
    =FILTER(tblSales, (tblSales[Region]="South")*(tblSales[Revenue]>50000), "None")
                                                            2 rows: S102 ₹88,000 and S102 ₹61,000
    =FILTER(tblSales, (tblSales[Region]="West")+(tblSales[Category]="Electronics"))
                                                            6 rows: West OR Electronics
    =SORT(tblSales, 5, -1)                                  every row, revenue high to low
    =SORTBY(tblSales[Store], tblSales[Revenue], -1)         stores ordered by revenue
    =TAKE(SORT(tblSales,5,-1), 3)                           top 3 lines (TAKE is 365 only)

The top three lines are N202 ₹1,32,000, W301 ₹1,15,000 and W302 ₹98,000.

How the conditions work: each comparison gives an array of TRUE/FALSE. **Multiplying** two arrays
gives 1 only where both are TRUE — **AND**. **Adding** gives a non-zero value where either is TRUE —
**OR**. The third argument of FILTER is what to show when nothing matches; without it, an empty result
is the **#CALC!** error.

\`SORT(array, sort_index, sort_order)\`: sort_index is the column **number within the array**, and
sort_order is 1 for ascending, -1 for descending. \`SORTBY\` sorts by another range, so the column you
sort by need not be in the output.

## #SPILL!

A spilled result needs empty cells to land in. **#SPILL!** means something is in the way — a typed
value, another formula, or merged cells — or the formula is **inside an Excel Table**, where dynamic
arrays cannot spill. Select the error to see the dashed outline of where it wants to go; clear that
area, or move the formula outside the Table.

## In older Excel

FILTER, SORT, SORTBY and UNIQUE do not exist in Excel 2019 or earlier. There you use menu sorting and
filtering, **Advanced Filter** (Data > Advanced) to copy matching rows elsewhere, **Remove Duplicates**
on a copy for a distinct list, and LARGE with INDEX-MATCH for a top N. A workbook using dynamic arrays
opened in old Excel shows the results as fixed values with the formulas wrapped in _xlfn.

## Common mistakes

- Sorting one column out of a table and breaking every row.
- Forgetting FILTER's "none" argument, so an empty month shows #CALC! on a report.
- Writing OR with a comma inside FILTER — \`FILTER(t, a, b)\` treats b as the "if empty" value, not a
  second condition.`,
    mcqs: [
      mcq('In tblSales, which formula lists the South rows with revenue above ₹50,000?', [
        ['=FILTER(tblSales,(tblSales[Region]="South")*(tblSales[Revenue]>50000))', true],
        ['=FILTER(tblSales,(tblSales[Region]="South")+(tblSales[Revenue]>50000))', false],
        ['=FILTER(tblSales,tblSales[Region]="South",tblSales[Revenue]>50000)', false],
        ['=SORT(tblSales,tblSales[Region]="South",tblSales[Revenue]>50000)', false],
      ], 'Multiplying the two TRUE/FALSE arrays keeps rows where both are true — AND. Adding gives OR, and a third FILTER argument is the value to show when nothing matches, not another condition.'),
      mcq('A report cell holds =UNIQUE(tblSales[Region]) and shows #SPILL!. A note is typed two cells below it. What is wrong?', [
        ['The note is in the range where the list needs to spill', true],
        ['UNIQUE cannot read a column that belongs to an Excel Table', false],
        ['The Region column holds a repeated value, which UNIQUE rejects', false],
        ['The workbook needs to be saved before UNIQUE can recalculate', false],
      ], 'UNIQUE returns three regions and needs three empty cells below it. Anything in that area blocks the spill; clear it and the list appears.'),
      mcq('=SORT(tblSales,5,-1) is entered on a report sheet. What does it return?', [
        ['Every row of tblSales, ordered by Revenue from high to low', true],
        ['The five rows with the highest revenue, in their original table order', false],
        ['Column 5 alone, sorted in ascending order of value', false],
      ], 'SORT returns the whole array; 5 is the column within the array to sort by (Revenue) and -1 means descending. To keep only the top rows, wrap it in TAKE in Excel 365.'),
    ],
    checkpoint: [
      mcq('=FILTER(tblSales,tblSales[Region]="East") is on a report, and the chain has no East region yet. What does the cell show?', [
        ['#CALC!, because the result is empty and there is no if_empty value', true],
        ['A blank cell, because FILTER hides an empty result by default', false],
        ['#N/A, because East is not found in the Region column', false],
        ['#SPILL!, because there are no rows available to spill into the sheet below', false],
      ], 'An empty FILTER result is the #CALC! error unless the third argument supplies something to show, such as "No sales".'),
      mcq('An analyst selects only the Revenue column and sorts it largest to smallest, choosing "Continue with the current selection". What happens to the data?', [
        ['Revenues are reordered alone and no longer match their stores', true],
        ['Excel sorts whole rows anyway, because it detects the Table', false],
        ['The sort is refused because the column holds currency values', false],
      ], 'Continuing with the current selection sorts only the selected cells, so each revenue moves away from its store and date. Sorting from a single cell, or a Table header, keeps rows together.'),
      mcq('Which formula lists UrbanMart\'s stores in order of revenue, highest first, without showing the Revenue column?', [
        ['=SORTBY(tblSales[Store],tblSales[Revenue],-1)', true],
        ['=SORT(tblSales[Store],tblSales[Revenue],-1)', false],
        ['=SORT(tblSales[Store],1,-1)', false],
        ['=UNIQUE(tblSales[Store],tblSales[Revenue])', false],
      ], 'SORTBY sorts one range by another, so Revenue drives the order without appearing. SORT\'s second argument is a column number within its own array, and SORT(Store,1,-1) sorts the store codes Z to A.'),
    ],
  },

  /* ── PIVOT_TABLES ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EXCEL_ANALYSIS_PIVOT_TABLES',
    notes: `A pivot table is the fastest way to answer "what is the total by X?" — by region, by month, by
category, or any two at once — without writing a formula. It is a summary built from a source range;
it does not change the source.

## Building one

Click inside **tblSales** (from the previous unit) and choose **Insert > PivotTable**, new worksheet.
The field list has four areas:

| Area | What it does | Example |
|---|---|---|
| Rows | one row per distinct value | Region |
| Columns | one column per distinct value | WeekOf, grouped by month |
| Values | the number to aggregate | Sum of Revenue |
| Filters | a filter over the whole pivot | Category |

Region in Rows and Revenue in Values gives:

| Region | Sum of Revenue |
|---|---|
| North | 3,15,000 |
| South | 2,36,000 |
| West | 3,16,000 |
| **Grand Total** | **8,67,000** |

Always build pivots from a **Table**: when rows are added, the Table grows and a refresh picks them
up. A pivot built on a fixed range such as A1:E13 ignores row 14 forever.

## Sum or Count — what Excel picks

Dropped into Values, a field that is **all numbers** becomes Sum. If the column contains **any text or
blank cell**, Excel picks **Count** instead — the first sign of text-numbers or empty cells in your
data. Change it in **Value Field Settings** (Sum, Count, Average, Max, Min…), and set a number format
there too so it survives refreshes.

"Count of Store" counts **rows that have a store**, not different stores: UrbanMart's 12 lines would
show 12. For the number of **distinct** stores (6), tick **Add this data to the Data Model** when
creating the pivot; Value Field Settings then offers **Distinct Count**.

## Grouping dates

Put WeekOf in Columns and Excel 365 groups it automatically into Years, Quarters and Months (or
right-click a date > **Group** and choose Months and Years). Grouping needs **every** value in the
column to be a real date. One text date or a blank and Excel says **"Cannot group that selection"**.
Choose **Years as well as Months** whenever data crosses a year, or January 2024 and January 2025 are
added together into one "Jan".

| Region | Jan | Feb | Mar | Grand Total |
|---|---|---|---|---|
| North | 62,000 | 1,83,000 | 70,000 | 3,15,000 |
| South | 1,36,000 | 39,000 | 61,000 | 2,36,000 |
| West | 1,15,000 | 47,000 | 1,54,000 | 3,16,000 |
| **Grand Total** | **3,13,000** | **2,69,000** | **2,85,000** | **8,67,000** |

## Show Values As

Right-click a value > **Show Values As** changes what the number means without new formulas:

- **% of Grand Total** — share of everything. North 36.33%, South 27.22%, West 36.45%.
- **% of Column Total** — share within each column. In February, North is 1,83,000 / 2,69,000 = 68.0%
  of the month.
- **% of Row Total** — share within each row.
- **Difference From / % Difference From** (previous month) — February is ₹44,000 (14.1%) below
  January; March is ₹16,000 (5.9%) above February.
- **Running Total In** a month field — cumulative revenue.

You can add the same field to Values twice — once as Sum, once as % of Grand Total — to show both.

## Things a pivot does that people forget

- **Refresh.** A pivot does not update when its source changes. **Data > Refresh All** (Ctrl+Alt+F5)
  updates every pivot in the workbook; PivotTable Options can refresh on opening the file.
- **Drill down.** Double-click any value and Excel puts the rows behind it on a new sheet — the
  quickest check that a number is what you think it is.
- **Sort** the rows by value (right-click > Sort > Largest to Smallest) to rank regions.
- **GETPIVOTDATA.** Clicking a pivot cell while writing a formula produces
  \`=GETPIVOTDATA("Revenue",$A$3,"Region","North")\`, which keeps working when the pivot is rearranged.
  It returns #REF! if the item is not visible in the pivot, for example after a filter removes it.

## Reading pivots honestly

A pivot shows totals; it does not show whether a total is high because of many small sales or one big
one. Before reporting "North is our best region", drill into it: in February one Electronics line of
₹1,32,000 is most of North's month.`,
    workedExample: `**Goal: answer three questions from UrbanMart's manager with one pivot each, and check them.**

**Q1. Which category earns most, and what share of revenue is it?**
Rows: Category. Values: Revenue twice — Sum, and Show Values As % of Grand Total. Sort by Sum,
largest first.

| Category | Sum of Revenue | % of total |
|---|---|---|
| Electronics | 4,33,000 | 49.94% |
| Apparel | 2,18,000 | 25.14% |
| Grocery | 2,16,000 | 24.91% |
| **Grand Total** | **8,67,000** | **100.00%** |

Answer: Electronics, about half of revenue from three of the twelve lines.

**Q2. How did each month compare with the one before?**
Rows: WeekOf grouped by Months and Years. Values: Revenue (Sum) and Revenue again with % Difference
From > (previous).

| Month | Revenue | vs previous |
|---|---|---|
| Jan-2025 | 3,13,000 | |
| Feb-2025 | 2,69,000 | −14.06% |
| Mar-2025 | 2,85,000 | +5.95% |

**Q3. How many different stores reported in each region?**
Recreate the pivot with **Add this data to the Data Model** ticked; Rows: Region; Values: Store as
**Distinct Count**. North 2 (N201, N202), South 2, West 2 — six stores in all. A normal Count of Store
would have said North 4, which is lines, not stores.

**Check every answer** against the data: the Q1 and Q2 grand totals are both ₹8,67,000, matching
\`=SUM(tblSales[Revenue])\`; double-clicking Feb-2025 shows the four February rows (51,000 + 47,000 +
39,000 + 1,32,000 = 2,69,000).`,
    mcqs: [
      mcq('Revenue is dragged into Values and the pivot shows "Count of Revenue" instead of a sum. What does that suggest about the Revenue column?', [
        ['It contains at least one text or blank cell', true],
        ['It is formatted as currency rather than as a number', false],
        ['It has more rows than a pivot is able to sum', false],
        ['It was added to Values before Region was put in Rows', false],
      ], 'Excel defaults to Sum only when every cell in the field is a number. Any text or blank makes the default Count, which is often the first sign of numbers stored as text.'),
      mcq('A pivot built on the range A1:E13 is refreshed after 200 new rows are pasted below row 13. The totals do not change. Why?', [
        ['The source is a fixed range, so the new rows are outside it', true],
        ['Pivot tables refresh only when the workbook is reopened', false],
        ['New rows are added to the pivot only after a full Excel restart', false],
      ], 'A pivot reads exactly the range it was given. Building it on an Excel Table means the source grows with the data, so a refresh includes new rows.'),
      mcq('In a Region × Month pivot, which Show Values As option shows each region\'s share of that month\'s revenue?', [
        ['% of Column Total', true],
        ['% of Grand Total', false],
        ['% of Row Total', false],
        ['Running Total In', false],
      ], 'With months as columns, each column total is the month\'s revenue, so % of Column Total gives the regions\' shares within each month. % of Row Total would split a region across months.'),
    ],
    checkpoint: [
      mcq('A pivot shows "Count of Store" = 12 for UrbanMart, but the chain has 6 stores. What should the analyst use for the number of stores?', [
        ['Distinct Count, after adding the data to the Data Model', true],
        ['Sum of Store, which adds up the store codes instead', false],
        ['Count of Store with the Grand Total turned off', false],
        ['Average of Store, divided by the number of regions', false],
      ], 'Count counts rows that have a store, so a store appearing in several lines is counted each time. Distinct Count, available when the pivot uses the Data Model, counts different values.'),
      mcq('Grouping the OrderDate field by month fails with "Cannot group that selection". What is the most likely cause?', [
        ['Some cells in OrderDate are text or blank, not real dates', true],
        ['The pivot already has a field in the Columns area', false],
        ['Dates in a pivot table can only be grouped by year, never by month or quarter', false],
      ], 'Date grouping needs every value in the field to be a real date. A single text date or empty cell blocks it; clean the column and refresh.'),
      mcq('A pivot groups two years of order dates by Months only. What does the "Jan" row show?', [
        ['January of both years added together', true],
        ['January of the most recent year only', false],
        ['January of the earlier year only', false],
        ['An error until Quarters are also selected', false],
      ], 'Grouping by Months alone merges the same month across years. Group by Years and Months to keep January 2024 and January 2025 apart.'),
    ],
  },

  /* ── CHARTS ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EXCEL_ANALYSIS_CHARTS',
    notes: `A chart exists to answer one question faster than a table can. Start from the question, choose
the chart that answers it, then remove everything that does not help.

## Question → chart

| The question | Chart | Why |
|---|---|---|
| How has revenue changed month by month? | **Line** | position along time; the slope is the answer |
| Which region / category is biggest? | **Bar** (horizontal) or column, sorted | lengths are easy to compare; bars fit long labels |
| What is each region's revenue in each month? | **Clustered column**, or small multiples | a few series side by side |
| How is the total made up, and does it change? | **100% stacked bar**, or a table | parts of a whole, a few parts |
| Do stores with more staff sell more? | **Scatter** | relationship between two numbers |
| The exact numbers matter (a finance review) | **Table** with conditional formatting | people will read the values anyway |

A **pie** works only for a share of one whole with two to four parts; people compare angles badly,
and with six slices nobody can rank them. A sorted bar chart answers the same question better.

## UrbanMart examples

- **"Is revenue falling?"** Monthly totals Jan ₹3,13,000, Feb ₹2,69,000, Mar ₹2,85,000. A line chart
  with three points shows the dip and partial recovery.
- **"Which category matters most?"** Electronics ₹4,33,000, Apparel ₹2,18,000, Grocery ₹2,16,000 — a
  sorted bar chart; the title says the finding: *Electronics is half of Q1 revenue*.

## Pivot charts

Select a pivot and **Insert > PivotChart**. The chart follows the pivot: filter or slice the pivot and
the chart changes. It is the easiest way to build charts that refresh with new data — but the chart
shows exactly what the pivot shows, so sort and format the pivot first.

## Defaults that mislead

- **A value axis that does not start at zero on a bar or column chart.** Bar length is the message, so
  a truncated axis makes ₹2,69,000 look a fraction of ₹3,13,000. Excel can choose a non-zero minimum on
  its own when values are close together; check **Format Axis > Bounds > Minimum** and set it to 0 for
  bars. A **line** chart may use a narrower axis, because it shows change, not size — but say so.
- **3-D effects** distort lengths and angles. Never use them for data.
- **Two value axes** (a secondary axis) let you make any two lines appear to move together by choosing
  scales. Use two charts instead.
- **Unsorted bars** make the reader do the ranking. Sort by value unless the order means something
  (months, age bands).
- **Too many series.** A line chart with twelve stores is spaghetti. Highlight the one that matters in
  colour and grey the rest, or use small multiples.
- **A line chart for categories.** A line joining North → South → West implies an order and a trend
  that do not exist.
- **Chart titles that name the data instead of the finding.** "Revenue by Month" makes the reader
  work; "Revenue fell 14% in February and recovered partly in March" tells them.

## Formatting that helps

Label values directly instead of making people read a legend; delete gridlines that add nothing;
format numbers in lakhs or thousands (₹3.13 L) so labels stay short; use one colour plus one
highlight. **Sparklines** (Insert > Sparklines) put a tiny line in a single cell beside each row —
useful for twelve stores' trends in a table.`,
    mcqs: [
      mcq('A manager asks, "Has our monthly revenue been rising or falling this year?" Which chart answers it most directly?', [
        ['A line chart of monthly revenue', true],
        ['A pie chart with one slice per month', false],
        ['A scatter plot of revenue against store', false],
        ['A 3-D column chart of each region', false],
      ], 'A trend over time is read from the slope of a line. A pie hides order and compares angles badly; scatter is for two numeric variables; 3-D distorts lengths.'),
      mcq('A column chart of January ₹3,13,000 and February ₹2,69,000 makes February look about half of January. What is the likely cause?', [
        ['The value axis starts well above zero', true],
        ['The columns are sorted from largest to smallest', false],
        ['The chart uses a different colour for each month', false],
      ], 'In a bar or column chart, length carries the meaning. With the axis starting near ₹2,60,000 the bars show only the top slice of each value and exaggerate the gap; set the minimum to 0.'),
      mcq('Which situation is a pie chart reasonably suited to?', [
        ['Online versus in-store shares of this year\'s sales', true],
        ['Revenue for each of the twelve months of the year', false],
        ['Revenue of fifteen stores, to find the top performer', false],
        ['The link between advertising spend and revenue', false],
      ], 'A pie shows the parts of one whole and works with very few parts. Months are a trend, fifteen slices cannot be ranked by eye, and a relationship between two numbers needs a scatter plot.'),
    ],
    checkpoint: [
      mcq('An analyst puts revenue and number of orders on one chart with two value axes, and the lines appear to move together. Why should a reviewer be cautious?', [
        ['The axis scales can be set to make any two lines look alike', true],
        ['Two value axes make Excel add the two series together before plotting them', false],
        ['Order counts can never be shown on a chart with rupees', false],
      ], 'With a secondary axis, each line\'s scale is chosen independently, so apparent agreement may be an artefact of the scaling. Two separate charts, or an indexed comparison, are more honest.'),
      mcq('A line chart joins North, South and West revenue with one line. What is wrong with that choice?', [
        ['A line implies an order and a trend that regions do not have', true],
        ['Line charts are limited to at most two data points', false],
        ['Region names cannot be used as labels on a category axis', false],
        ['The line will be drawn in alphabetical order of the values', false],
      ], 'Lines connect points along an ordered axis, usually time. Regions are separate categories, so a sorted bar chart shows the comparison without suggesting a trend.'),
      mcq('Which chart title best serves a manager reading a monthly report?', [
        ['Revenue fell 14% in February and recovered partly in March', true],
        ['Revenue by Month, January to March 2025 (in ₹ lakh)', false],
        ['Chart 3: Sum of Revenue by WeekOf (Months), all regions', false],
      ], 'A title stating the finding tells the reader what to see; the axis labels and a note can carry the units and period. A field-name title makes the reader work the answer out.'),
    ],
  },

  /* ── WHAT_IF ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EXCEL_ANALYSIS_WHAT_IF',
    notes: `"What if delivery apps raise commission to 25%?" "How many orders a day do we need to break
even?" A what-if model answers these by keeping every assumption in its own labelled cell and every
result as a formula of those cells. Change an input and the whole model updates.

## Layout: inputs, calculations, outputs

A cloud kitchen in Bengaluru, monthly model:

| | A | B |
|---|---|---|
| 1 | **Inputs** | |
| 2 | Orders per day | 120 |
| 3 | Average order value (₹) | 350 |
| 4 | Days per month | 30 |
| 5 | Food cost (% of revenue) | 35% |
| 6 | Delivery app commission (% of revenue) | 22% |
| 7 | Fixed costs per month (₹) — rent and salaries | 2,30,000 |
| 9 | **Calculations** | |
| 10 | Revenue | =B2*B3*B4 |
| 11 | Variable costs | =B10*(B5+B6) |
| 12 | Contribution | =B10-B11 |
| 13 | **Profit** | =B12-B7 |

Results: revenue ₹12,60,000; variable costs ₹7,18,200; contribution ₹5,41,800; profit **₹3,11,800**.

Rules that make a model trustworthy:

- **Every number typed once, in an input cell**, with a label and unit. No 0.35 hidden inside a
  formula.
- **Inputs look different** (a fill colour for input cells is common practice) so a user knows what
  they may change.
- **Name key inputs** (Commission, Orders_per_day) so formulas read clearly.
- **Results are formulas only.**

## Goal Seek: one input to hit one target

**Data > What-If Analysis > Goal Seek**: *Set cell* B13 (profit), *To value* 0, *By changing cell* B2
(orders per day). Excel tries values until profit is 0: **about 50.94 orders a day**, so the kitchen
needs 51 orders a day to break even. The changing cell must hold a **typed value**, not a formula, and
the set cell must be a **formula** that depends on it. Goal Seek overwrites the input — note the
original value first.

## Data tables: a grid of outcomes

A **one-variable data table** lists several commission rates down a column with the profit formula at
the top; a **two-variable** table crosses two inputs. Put \`=B13\` in the corner cell, orders per day
down the left, order values across the top, select the block, then **Data > What-If Analysis > Data
Table**, Row input cell B3, Column input cell B2:

| Profit (₹) | AOV 300 | AOV 350 | AOV 400 |
|---|---|---|---|
| 80 orders/day | 79,600 | 1,31,200 | 1,82,800 |
| 100 orders/day | 1,57,000 | 2,21,500 | 2,86,000 |
| 120 orders/day | 2,34,400 | 3,11,800 | 3,89,200 |
| 140 orders/day | 3,11,800 | 4,02,100 | 4,92,400 |

The cells hold \`{=TABLE(B3,B2)}\`, which Excel maintains; you cannot edit one cell of it. Large data
tables slow recalculation — the calculation option "Automatic except for data tables" exists for that.

## Scenarios: named sets of inputs

**Scenario Manager** stores named sets of input values — *Base*, *Commission 25%*, *Monsoon slump* —
and a **Summary** report shows each scenario's results side by side. A simpler approach many analysts
prefer: put the scenarios as columns in an assumptions table and pick one with a dropdown and XLOOKUP,
so the comparison is visible in the sheet.

With commission at 25% instead of 22%, profit falls from ₹3,11,800 to **₹2,74,000** — three points of
commission cost ₹37,800 a month.

## When the question has several inputs and limits

Goal Seek changes one input. For several inputs under constraints ("which product mix maximises profit
with 200 kitchen hours?"), Excel's **Solver** add-in is the tool; it is beyond this unit.

## Common mistakes

- Typing a result over a formula while "trying a number", which breaks the model silently.
- Assumptions buried inside formulas, so nobody can see or change them.
- Presenting one number as the forecast. A table of outcomes over a sensible range is more honest.`,
    workedExample: `**Goal: tell the kitchen's owner what a commission rise to 25% means, and how many orders a
day would offset it.**

1. **Base case.** With the inputs above, profit is ₹3,11,800 a month.
2. **Change one input.** Set B6 to 25%. Variable costs become 12,60,000 × 0.60 = ₹7,56,000, contribution
   ₹5,04,000, profit **₹2,74,000** — down ₹37,800.
3. **Goal Seek the recovery.** Set cell B13 to 311800 by changing B2. Each order now contributes
   350 × (1 − 0.35 − 0.25) = ₹140, so profit is 140 × 30 × orders − 2,30,000. Solving
   4,200 × orders = 5,41,800 gives **129 orders a day** (exactly 129.0). Goal Seek reports about 129.
4. **Check by hand.** 129 × 350 × 30 = ₹13,54,500 revenue; × 0.40 = ₹5,41,800 contribution; minus
   ₹2,30,000 = ₹3,11,800. It matches the base profit.
5. **Restore the inputs** (Goal Seek overwrote B2 with 129) and write the answer:

> If commission rises to 25%, monthly profit falls by ₹37,800 to ₹2,74,000. To keep today's profit
> the kitchen needs about 129 orders a day instead of 120 — 9 more a day, or 7.5% more orders.

The model did the arithmetic; the analyst's job was choosing the comparison and stating it in terms
the owner can act on.`,
    mcqs: [
      mcq('Goal Seek is asked to set B13 (profit) to 0 by changing B10, which holds =B2*B3*B4. Excel refuses. Why?', [
        ['The changing cell must hold a typed value, not a formula', true],
        ['Goal Seek can only aim for a target value that is above zero', false],
        ['The set cell has to be on a separate sheet from the inputs', false],
        ['Goal Seek works only when the inputs are named ranges', false],
      ], 'Goal Seek varies an input by typing new values into it, so the changing cell must be a constant. The set cell is the formula that depends on it; the target can be any value, including 0.'),
      mcq('A two-variable data table crosses orders per day (down) with average order value (across). Which input cells must the Data Table dialog be given?', [
        ['Row input: the AOV input cell; column input: the orders input cell', true],
        ['Row input: the profit formula; column input: the revenue formula', false],
        ['Row input: the top-left corner cell; column input: the bottom-right cell of the table', false],
      ], 'The values across the top row are substituted into the row input cell, and the values down the left column into the column input cell. Both must be the model\'s input cells.'),
      mcq('Why should a model keep the 22% commission in a labelled input cell rather than typing 0.22 inside the formulas?', [
        ['So one change updates every result, and the assumption is visible', true],
        ['Because Excel cannot multiply by a decimal typed inside a formula', false],
        ['Because a percentage inside a formula is rounded to a whole number', false],
      ], 'A typed constant inside formulas must be found and edited in every copy, and a reader cannot see it. One labelled input makes the assumption visible and the model easy to test.'),
    ],
    checkpoint: [
      mcq('In the cloud kitchen model each order contributes ₹150.50 and fixed costs are ₹2,30,000 a month over 30 days. Goal Seek returns about 50.94 orders a day for profit 0. What should the analyst report?', [
        ['About 51 orders a day are needed to break even', true],
        ['50 orders a day, rounding the result to the nearest order', false],
        ['50.94 orders a day, exactly as Goal Seek returned it', false],
        ['230 orders a day, from the fixed costs alone', false],
      ], 'Orders are whole, and 50 a day would leave a small loss, so break-even needs 51. 150.50 × 30 × 51 = ₹2,30,265, just above ₹2,30,000.'),
      mcq('A manager wants to compare three named sets of assumptions — Base, Commission 25% and Monsoon slump — side by side. Which tool is built for that?', [
        ['Scenario Manager with a Summary report', true],
        ['Goal Seek, run once for each set of assumptions', false],
        ['A pivot table built on the inputs block of the model', false],
      ], 'Scenario Manager stores named sets of input values and its Summary shows each set\'s results in one table. Goal Seek finds one input for one target.'),
      mcq('An analyst "tests" a model by typing 4,00,000 over the Profit cell to see how the chart looks, then forgets. What has happened?', [
        ['Profit is now a fixed number and no longer follows the inputs', true],
        ['Excel restores the profit formula when the workbook is saved', false],
        ['The inputs are recalculated backwards to give that profit', false],
        ['The chart refuses to update until the cell is unlocked', false],
      ], 'Typing over a formula replaces it with a constant. Every later change to the inputs leaves profit at ₹4,00,000, a silent error; protecting formula cells guards against it.'),
    ],
  },

  /* ── DASHBOARD ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EXCEL_ANALYSIS_DASHBOARD',
    notes: `A dashboard is one screen that answers the questions a manager asks every week, and keeps
answering them when next week's data arrives. Building one in Excel brings together everything in
this module: a clean Table, pivots, charts and a little interactivity.

## Start from the questions

Before opening Excel, write down the three to five questions the dashboard must answer. For
UrbanMart's regional manager:

1. How much did we sell this period, and is it on target?
2. Which regions and categories are driving it?
3. Is the trend up or down?
4. Which stores need attention?

Everything on the page should answer one of these. Anything else goes.

## The structure behind it

| Sheet | Contents |
|---|---|
| Data | tblSales — the raw lines, appended each week (or loaded by Power Query) |
| Lookups | store → region, targets by month |
| Pivots | the pivot tables feeding the charts, all built on tblSales |
| Dashboard | KPI cards, charts, slicers — no raw numbers typed |

## KPI cards

A KPI card is a big number with context: value, comparison and direction. Calculate it in cells, not
by typing:

    Revenue      =SUM(tblSales[Revenue])                          ₹8,67,000
    Lines        =ROWS(tblSales)                                  12
    Avg line     =KPI_Revenue/KPI_Lines                           ₹72,250
    vs target    =KPI_Revenue/Target-1                            e.g. +3.2%

or from a pivot, so the card follows the slicers:

    =GETPIVOTDATA("Revenue", Pivots!$A$3)

Format the number large, the label small, and the comparison in colour (green above target, red
below) with conditional formatting. ₹8.67 L reads faster than 867000.

## Slicers and timelines

Select a pivot, **PivotTable Analyze > Insert Slicer** and choose Region and Category. A slicer is a set
of buttons that filters the pivot. To make one slicer control **every** pivot on the dashboard, use
**Slicer > Report Connections** and tick each pivot — they must share the same source (here tblSales).
**Insert Timeline** gives a date slider for month or quarter selection.

KPI cards built with \`SUM(tblSales[...])\` do **not** follow slicers; cards built with GETPIVOTDATA from
a connected pivot do. Decide which you want and make every card behave the same way.

## Layout someone else can read

- **Top left is read first:** put the KPI cards there, then the trend, then the breakdowns.
- **A title with the period and the data date**: "UrbanMart sales, Jan–Mar 2025 — data to 26-Mar-2025".
- **Align** cards and charts to the grid; same fonts, same number formats, one highlight colour.
- **Turn off gridlines** on the dashboard sheet (View > Gridlines) and hide pivot field buttons on the
  charts.
- **Three written findings** under the charts beat ten charts without words.

## Refreshing with new data

The test of a dashboard is next week. The flow:

1. New rows are pasted below tblSales (or Power Query's source file is replaced).
2. **Data > Refresh All** (Ctrl+Alt+F5) refreshes Power Query and every pivot; pivot charts and
   GETPIVOTDATA cards follow.
3. Check the total on the dashboard against \`=SUM(tblSales[Revenue])\` and against the source system.

If step 2 is forgotten, the dashboard shows last week's numbers with this week's date in the title.
Setting each pivot to **Refresh data when opening the file** and showing a "Data to" date from
\`=MAX(tblSales[WeekOf])\` guards against it.

## Sharing it

Protect the dashboard sheet so slicers still work but cells cannot be typed over (Review > Protect
Sheet, allowing "Use PivotTable & PivotChart" and slicers). Save a PDF for people who only need to
read it. And when the dashboard needs to refresh itself from a database every morning, that is the
point to move it to Power BI — later in this track.`,
    mcqs: [
      mcq('A Region slicer filters the first pivot on the dashboard but not the second, though both use tblSales. What should the analyst do?', [
        ['Tick the second pivot under Slicer > Report Connections', true],
        ['Insert a second Region slicer for the second pivot', false],
        ['Convert the second pivot back into a normal cell range', false],
        ['Refresh All, which links every slicer to every pivot', false],
      ], 'A slicer controls only the pivots it is connected to. Report Connections lists the pivots sharing its source and links them, so one slicer filters all of them.'),
      mcq('A KPI card shows =SUM(tblSales[Revenue]), and the manager notices it does not change when she clicks the South button on the Region slicer. Why?', [
        ['Slicers filter pivots, and this formula reads the Table directly', true],
        ['SUM cannot read a column of a Table while a slicer is in use', false],
        ['The card needs a Refresh All after every single click on any of the slicers', false],
      ], 'A slicer filters the connected pivot tables, not the Table itself. A card built with GETPIVOTDATA from a connected pivot follows the slicer.'),
      mcq('New rows were pasted into tblSales on Monday, but Tuesday\'s dashboard still shows last week\'s totals. What step was missed?', [
        ['Data > Refresh All, so the pivots read the new rows', true],
        ['Saving the workbook, which pivots need before they update', false],
        ['Re-applying the slicers to each pivot table by hand', false],
        ['Sorting tblSales by date before building the pivots', false],
      ], 'Pivot tables keep a cached copy of their source and update only on refresh. Refresh All updates every pivot and query; a "Data to" date on the dashboard makes a stale refresh visible.'),
    ],
    checkpoint: [
      mcq('A dashboard\'s title says "data to 26-Mar-2025". Which formula keeps that date correct after each weekly load?', [
        ['=MAX(tblSales[WeekOf])', true],
        ['=TODAY()', false],
        ['=MIN(tblSales[WeekOf])', false],
        ['=COUNT(tblSales[WeekOf])', false],
      ], 'The latest date in the data is the date the figures run to. TODAY shows the date the file is opened, which hides a missed load; MIN is the earliest date.'),
      mcq('Which is the best first step when designing a sales dashboard for a regional manager?', [
        ['List the few questions it must answer every week', true],
        ['Choose a colour theme and the dashboard\'s fonts', false],
        ['Add a chart for every column in the sales data', false],
      ], 'The questions decide which numbers and charts belong on the page; anything that does not answer one is clutter. Design and formatting come after.'),
      mcq('A manager says the dashboard\'s Total Revenue card shows ₹8,67,000 but the slicer is set to North, whose pivot shows ₹3,15,000. What is the fix?', [
        ['Feed every card from the connected pivot, e.g. with GETPIVOTDATA', true],
        ['Delete the slicer, so that no card can ever disagree with another', false],
        ['Type the North figure into the card whenever North is selected', false],
      ], 'Mixed sources make cards disagree when a slicer is used. Reading every card from the sliced pivot makes the whole page follow the same filter.'),
    ],
  },

  /* ── DEBUGGING ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EXCEL_ANALYSIS_DEBUGGING',
    notes: `Analysis tools fail differently from formulas: a pivot that quietly shows old numbers, a chart
that exaggerates, a dynamic array that will not appear. Work from the symptom.

## 1. #SPILL! where a list should be

- **Symptom:** \`=UNIQUE(tblSales[Region])\` shows #SPILL!.
- **Cause:** something occupies the cells the result needs — a typed note, another formula, merged
  cells — or the formula has been written **inside an Excel Table**, where arrays cannot spill.
- **Fix:** click the error to see the dashed spill area; clear it, unmerge, or move the formula
  outside the Table.

## 2. #CALC! on the report when a filter finds nothing

- **Symptom:** a "South orders over ₹1,00,000" list shows #CALC! this month.
- **Cause:** FILTER returned no rows and has no third argument.
- **Fix:** \`=FILTER(..., ..., "No orders")\`.

## 3. A pivot that ignores new data

- **Symptom:** rows were added but pivot totals are unchanged.
- **Cause:** either the pivot was not refreshed, or its source is a fixed range like A1:E13 that the
  new rows fall outside.
- **Fix:** **Refresh All**; then **PivotTable Analyze > Change Data Source** to the Table name
  (tblSales) so future rows are included.

## 4. Count instead of Sum

- **Symptom:** "Count of Revenue" appears; totals look like small whole numbers.
- **Cause:** at least one Revenue cell is text or blank, so Excel defaulted to Count.
- **Fix:** find the cells (\`=COUNT\` vs \`=COUNTA\`, or filter for blanks), convert them, refresh, and set
  Value Field Settings to Sum.

## 5. "Cannot group that selection"

- **Symptom:** grouping a date field by month fails.
- **Cause:** a text date or a blank in the column.
- **Fix:** \`=SUM(--ISTEXT(tblSales[WeekOf]))\` and \`=COUNTBLANK(tblSales[WeekOf])\` find them; clean and
  refresh.

## 6. Months in the wrong order

- **Symptom:** the pivot or chart shows Apr, Aug, Dec, Feb, Jan…
- **Cause:** the month field is **text**, built with TEXT(date,"mmm"), so it sorts alphabetically.
- **Fix:** group the real date field by month instead, or use the month-start date formatted as mmm.

## 7. A slicer that filters only one chart

- **Symptom:** clicking North changes one chart but not the others.
- **Cause:** the other pivots are not connected to the slicer — or they were built from a **different
  source** (a copy of the data), so they cannot be connected.
- **Fix:** Slicer > Report Connections; rebuild stray pivots on tblSales.

## 8. A dramatic chart from an ordinary change

- **Symptom:** a column chart makes a 14% dip look like a collapse.
- **Cause:** the value axis starts near the smallest value instead of zero.
- **Fix:** Format Axis > Bounds > Minimum = 0 for any bar or column chart.

## 9. GETPIVOTDATA shows #REF!

- **Symptom:** a KPI card that worked yesterday now shows #REF!.
- **Cause:** the item it asks for is no longer visible in the pivot — filtered out by a slicer, or
  the field was removed from the layout.
- **Fix:** keep the fields the card needs in the pivot, or wrap the card in \`IFERROR(…,0)\` **only**
  when "no data for this selection" really means zero.`,
    mcqs: [
      mcq('=UNIQUE(tblSales[Category]) was typed into a new column inside tblSales and shows #SPILL!. Nothing else is nearby. What is the cause?', [
        ['Dynamic arrays cannot spill inside an Excel Table', true],
        ['UNIQUE cannot read a column of its own Table', false],
        ['The Category column has fewer than two distinct values', false],
        ['Spilled formulas need calculation set to manual', false],
      ], 'Excel Tables do not allow spilled results, so a dynamic array formula in a Table column shows #SPILL!. Move it to a cell outside the Table.'),
      mcq('A pivot\'s month row labels read Apr, Feb, Jan, Mar. The Month field was created with =TEXT([@WeekOf],"mmm"). What is the fix?', [
        ['Group the real date field by month instead of using text months', true],
        ['Sort the source Table by WeekOf, then refresh the pivot', false],
        ['Change the TEXT code from "mmm" to "mmmm" to show full names', false],
      ], 'TEXT turns dates into words, which a pivot sorts alphabetically. Grouping the real date field keeps calendar order, whatever the source order is.'),
      mcq('A pivot chart makes a 14% fall in February revenue look like a collapse. What is the likely cause?', [
        ['The value axis minimum is set far above zero', true],
        ['The pivot is showing Sum rather than Average', false],
        ['The chart has data labels switched on', false],
        ['The months are in calendar rather than value order', false],
      ], 'When the axis starts near the smallest value, column heights show only the difference, so a moderate fall looks huge. Fix the minimum at 0 on bar and column charts.'),
      mcq('A KPI card using GETPIVOTDATA("Revenue",Pivots!$A$3,"Region","West") turns into #REF! when the Region slicer is set to North. Why?', [
        ['West is no longer visible in the pivot, so there is nothing to return', true],
        ['GETPIVOTDATA stops working once a pivot has any slicer connected to it at all', false],
        ['The slicer deleted the West rows from the source Table', false],
      ], 'GETPIVOTDATA reads values shown in the pivot. When a filter hides West, the item is not in the pivot and the function returns #REF!. Slicers never change the source data.'),
    ],
  },

  /* ── PRACTICE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EXCEL_ANALYSIS_PRACTICE',
    notes: `Six exercises on one dataset. Enter it in a sheet, make it a Table named **tblFees**, and answer
each with a dynamic array formula, a pivot table or a chart as stated. Answers are at the end.

Fee collections at an engineering college in Guntur, first term 2025:

| Receipt | Date | Branch | Year | Mode | Amount |
|---|---|---|---|---|---|
| R01 | 03-Jun-2025 | CSE | 1 | UPI | 45,000 |
| R02 | 04-Jun-2025 | ECE | 2 | Card | 42,000 |
| R03 | 10-Jun-2025 | CSE | 3 | UPI | 48,000 |
| R04 | 18-Jun-2025 | MECH | 1 | Cash | 38,000 |
| R05 | 02-Jul-2025 | CSE | 2 | Card | 46,000 |
| R06 | 07-Jul-2025 | ECE | 1 | UPI | 42,000 |
| R07 | 15-Jul-2025 | MECH | 3 | UPI | 39,000 |
| R08 | 21-Jul-2025 | CSE | 1 | Cash | 45,000 |
| R09 | 04-Aug-2025 | ECE | 3 | UPI | 44,000 |
| R10 | 11-Aug-2025 | CSE | 2 | UPI | 46,000 |

Total: **₹4,35,000**.

## Exercise 1 — dynamic arrays
(a) A sorted list of branches. (b) Every UPI receipt from CSE. (c) The receipts sorted by Amount,
highest first. (d) The three largest receipts (Excel 365).

## Exercise 2 — a pivot by branch
Rows: Branch; Values: Amount as Sum and as % of Grand Total. Sort largest first.

## Exercise 3 — a pivot by month
Rows: Date grouped by Months (and Years); Columns: Mode; Values: Sum of Amount. Which month
collected most? What share of July was UPI?

## Exercise 4 — distinct versus count
How many receipts came from CSE, and how many different years of study did they come from?

## Exercise 5 — a chart
Make a chart that answers "Which payment mode brings in the most money?" Choose the type, sort it,
start the axis at zero and write a title that states the finding.

## Exercise 6 — a target what-if
The college's target for the term was ₹4,80,000. In a cell, compute the shortfall and the percentage
of target achieved. If the average receipt stays the same, how many more receipts are needed to reach
the target? (Use a formula, not Goal Seek, then check it with Goal Seek.)

## Answers

1. (a) \`=SORT(UNIQUE(tblFees[Branch]))\` → CSE, ECE, MECH. (b)
   \`=FILTER(tblFees,(tblFees[Branch]="CSE")*(tblFees[Mode]="UPI"))\` → R01, R03, R10. (c)
   \`=SORT(tblFees,6,-1)\`. (d) \`=TAKE(SORT(tblFees,6,-1),3)\` → R03 ₹48,000, then R05 and R10 at ₹46,000
   (a tie — say so when you report a "top 3").
2. CSE ₹2,30,000 (52.87%), ECE ₹1,28,000 (29.43%), MECH ₹77,000 (17.70%).
3. June ₹1,73,000, July ₹1,72,000, August ₹90,000 — June collected most, by ₹1,000. July's UPI was
   42,000 + 39,000 = ₹81,000 of ₹1,72,000, or 47.1%.
4. Count of Receipt for CSE is **5**; Distinct Count of Year (Data Model) for CSE is **3** (years 1, 2
   and 3).
5. A sorted bar chart: UPI ₹2,64,000, Card ₹88,000, Cash ₹83,000. Title: *UPI brings in about 61% of
   fee collections*.
6. Shortfall \`=480000-SUM(tblFees[Amount])\` → ₹45,000; achieved \`=SUM(tblFees[Amount])/480000\` →
   90.6%. Average receipt ₹43,500, so 45,000 / 43,500 = 1.03 → **2 more receipts** (one is not enough).`,
    mcqs: [
      mcq('In tblFees, which formula returns every CSE receipt paid by UPI?', [
        ['=FILTER(tblFees,(tblFees[Branch]="CSE")*(tblFees[Mode]="UPI"))', true],
        ['=FILTER(tblFees,(tblFees[Branch]="CSE")+(tblFees[Mode]="UPI"))', false],
        ['=FILTER(tblFees,tblFees[Branch]="CSE",tblFees[Mode]="UPI")', false],
        ['=SORT(tblFees,tblFees[Branch]="CSE",tblFees[Mode]="UPI")', false],
      ], 'Both conditions must hold, so the arrays are multiplied. The + version returns receipts that are CSE or UPI, and the comma version treats the second test as the if_empty value.'),
      mcq('Branch totals in tblFees are CSE ₹2,30,000, ECE ₹1,28,000 and MECH ₹77,000, out of ₹4,35,000. What does % of Grand Total show for CSE?', [
        ['52.87%', true],
        ['47.13%', false],
        ['33.33%', false],
        ['100.00%', false],
      ], '2,30,000 / 4,35,000 = 0.5287. 47.13% is everyone except CSE, and 33.33% would be an equal split between three branches.'),
      mcq('CSE has five fee receipts, from students in years 1, 3, 2, 1 and 2. A pivot shows Year for CSE as Count and as Distinct Count. What do they show?', [
        ['Count 5, Distinct Count 3', true],
        ['Count 3, Distinct Count 5', false],
        ['Count 5, Distinct Count 5', false],
        ['Count 9, Distinct Count 3', false],
      ], 'Count counts rows with a value (five receipts); Distinct Count counts different values (years 1, 2 and 3). Count 9 would be the sum of the year numbers.'),
      mcq('June\'s fee collections are ₹1,73,000 and July\'s ₹1,72,000. In a Month × Mode pivot, July UPI is ₹81,000. What is UPI\'s share of July?', [
        ['47.1%', true],
        ['46.8%', false],
        ['18.6%', false],
        ['52.9%', false],
      ], '81,000 / 1,72,000 = 0.471. 18.6% is UPI-in-July as a share of the whole term (₹4,35,000), and 52.9% is the non-UPI share of July.'),
      mcq('Collections are ₹4,35,000 from 10 receipts against a target of ₹4,80,000. At the same average receipt, how many more receipts reach the target?', [
        ['2', true],
        ['1', false],
        ['10', false],
        ['45', false],
      ], 'The shortfall is ₹45,000 and the average receipt is ₹43,500. One receipt leaves ₹1,500 short, so two are needed; 45 confuses rupees in thousands with receipts.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ───────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EXCEL_ANALYSIS_INTERVIEW_QUESTION',
    notes: `For analyst roles, the Excel analysis questions are usually practical: "here is a sales file,
what would you show the manager?" Answer with the steps you would take and the checks you would make.

## Q1. "Walk me through building a sales dashboard in Excel."

**Model answer.** "I start by asking the manager which three or four questions it must answer each
week — revenue against target, which regions and products drive it, the trend, and anything needing
attention. Then I set up the data properly: raw data as an Excel Table, or loaded with Power Query if
it comes as a file each week; lookup tables for product and region; and checks that the totals match
the source system. I build the pivots on that Table, pivot charts from them — a line for the trend,
sorted bars for regions and products — KPI cards that read from the pivots with GETPIVOTDATA so they
follow the slicers, and Region, Category and a date timeline as slicers connected to every pivot.
Layout: KPIs top left, trend next, then breakdowns, a title with the data-to date, and three written
findings. Finally I test it with next week's data: append, Refresh All, and reconcile the total."

**Follow-ups:**
- *"How do you make sure it is up to date?"* — Refresh All, refresh on open, and a 'data to'
  date from MAX of the date column on the page.
- *"When would you move it to Power BI?"* — When it needs to refresh itself from a database on a
  schedule, handle millions of rows, or be shared with many people with row-level access.

## Q2. "What can a pivot table tell you that a SUMIFS table can't, and what are its pitfalls?"

**Model answer.** "A pivot gives any breakdown in seconds, groups dates by month and quarter,
shows % of total, % of column, difference from previous month and running totals without formulas,
and lets me double-click a number to see the rows behind it. SUMIFS is better for a fixed report
layout. The pitfalls: it doesn't update until refreshed; it defaults to Count if the column has text
or blanks; Count counts rows, so for distinct customers I need the Data Model's Distinct Count; it
can't group dates if one is text; and grouping by month alone merges the same month across years."

**Follow-ups:**
- *"How would you show month-over-month growth?"* — Show Values As % Difference From, base field
  Month, base item (previous).
- *"Your pivot total doesn't match finance — what do you check?"* — Refresh, source range, text
  amounts, a filter on the pivot, subtotal rows in the data, then drill into the month that differs.

## Q3. "Here is a chart of monthly revenue. Is anything wrong with it?"

**Model answer.** "I check what question it answers and whether it answers it honestly. For monthly
revenue I expect a line or columns in date order. Then: does a column chart's axis start at zero —
a truncated axis turns a small dip into a collapse; are there 3-D effects or a second axis that could
manufacture a pattern; are months in calendar order rather than alphabetical; is the period complete —
a half-finished month at the end looks like a drop; and does the title say what we should see. I'd
also ask what it's compared with — last year's same months, or a target — because a trend alone
doesn't say whether it's good."

**Follow-ups:**
- *"When is a non-zero axis acceptable?"* — On a line chart showing change, labelled clearly — never on
  bars, whose length is the value.
- *"How would you show twelve stores' trends?"* — Small multiples or sparklines beside a table; or
  highlight the few stores that matter and grey the rest.

## How you are judged

Interviewers listen for the questions you ask first, the checks you make (refresh, reconcile, drill
down) and honesty in charts. "I'd build a pivot" is the start of an answer, not the whole of one.`,
    mcqs: [
      mcq('An interviewer asks how you would show month-over-month growth in a pivot without formulas. Which answer is correct?', [
        ['Show Values As % Difference From, with Month and (previous) as the base', true],
        ['Show Values As % of Grand Total, then subtract each month\'s value by eye', false],
        ['Show Values As Running Total In, which adds the growth across months', false],
      ], '% Difference From compares each item with a base item; choosing the month field and (previous) gives each month\'s change against the one before. Running total accumulates, it does not compare.'),
      mcq('The last month in a monthly revenue chart shows a sharp drop, and the data runs to the 12th of that month. What should the analyst say first?', [
        ['The month is incomplete, so the drop is not comparable', true],
        ['Revenue collapsed and needs urgent attention this week', false],
        ['The axis should be switched to a logarithmic scale', false],
        ['The chart should be redrawn as a pie of monthly shares', false],
      ], 'Twelve days of sales compared with full months always looks like a fall. Mark it as month-to-date, compare it with the same days of the previous month, or leave it out.'),
      mcq('A pivot\'s revenue total does not match the finance team\'s figure. Which check is a sensible first step?', [
        ['Refresh the pivot and confirm its source covers every row', true],
        ['Change the aggregation from Sum to Average and compare', false],
        ['Delete the pivot and rebuild it using SUMIFS formulas', false],
      ], 'A stale cache or a fixed source range that misses new rows are the commonest causes, and both are quick to rule out before looking for text amounts, filters or subtotal rows.'),
    ],
  },

  /* ── MINI_PROJECT ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EXCEL_ANALYSIS_MINI_PROJECT',
    notes: `# A Sales Dashboard in Excel

You are the analyst for **UrbanMart**, a retail chain with 12 stores in 4 regions (North, South, East,
West). The regional head wants a one-page Excel dashboard for January–June 2025 that she can refresh
herself each month. You build the workbook from three files.

## The data

Create the files yourself (a Python script, or by hand with formulas such as RANDBETWEEN and then
Paste Values) so they are realistic and **deliberately messy** — cleaning is part of the work.

**sales_lines.csv** — about 1,500–2,000 rows, one per product per store per day with sales:

| Column | Example | Planted problems to include |
|---|---|---|
| LineID | UM-000123 | 5–10 exact duplicate lines |
| Date | 14-02-2025 | some dates as text, dd-mm-yyyy |
| StoreCode | s101, "S101 " | mixed case, trailing spaces |
| ProductID | P017 | 2–3 IDs not in the product master |
| Qty | 3 | a few blanks |
| UnitPrice | 1,299 | a few stored as text, one with "₹" |

**products.csv** — 40–60 products: ProductID, ProductName, Category (Grocery, Apparel, Electronics,
Home), CostPrice.

**stores.csv** — StoreCode, StoreName, City, Region, plus a monthly **Target** table by region.

## Questions the dashboard must answer

1. What was revenue for the period and the selected month, and how does it compare with target?
2. How did revenue move month by month, and which month changed most?
3. Which region and which category contribute most, as a share of revenue?
4. Which five products earned the most, and which store is furthest below its region's average?
5. What is the gross margin (revenue − cost) by category?

## Deliverables

1. **Raw** sheet: the files as received, untouched.
2. **Clean** sheet or Power Query output: a Table **tblSales** with trimmed, upper-case store codes;
   real dates; numeric Qty and UnitPrice; duplicates removed; Revenue = Qty × UnitPrice; ProductName,
   Category and Cost from products by XLOOKUP (or INDEX-MATCH), and Region from stores. Missing
   products are kept and labelled "Unknown product", not deleted.
3. A **cleaning log**: rows in, duplicates removed, dates converted, values fixed, unmatched products —
   with counts.
4. **Pivots** sheet: pivot tables on tblSales for region, category, month (grouped by month and year)
   and product; % of total and % difference from previous month where useful.
5. **Dashboard** sheet: 4 KPI cards (revenue, vs target, gross margin %, number of lines or orders),
   a monthly trend line, sorted bar charts for region and category, a top-5 products view, slicers for
   Region and Category plus a month timeline — connected to every pivot — and a title with the data-to
   date.
6. **Three written findings** on the dashboard, each with a number ("East is 9% below target, driven by
   Apparel in March").
7. A **refresh test**: add one more month of rows (or a second file), Refresh All, and show the
   dashboard updates; note what you had to do.

## Acceptance criteria

- The dashboard's total revenue equals \`=SUM(tblSales[Revenue])\` and the sum of the region pivot.
- The cleaning log's counts add up: rows in − duplicates removed = rows in tblSales.
- No hard-typed numbers on the Dashboard sheet; every figure is a formula, a pivot or a chart.
- Every chart's value axis starts at zero (bars/columns), months are in calendar order, and titles
  state findings.
- Every slicer filters every pivot and every KPI card.
- After the refresh test, the totals change and still reconcile.`,
    mcqs: [
      mcq('In the mini project, the cleaning log says 1,842 rows were received and 9 duplicates removed, but tblSales has 1,830 rows. What should you conclude?', [
        ['Three rows were lost somewhere else, and the cleaning must be checked', true],
        ['The log is right, because Power Query always drops a few rows', false],
        ['Nothing, because a gap of only three rows is within normal rounding for a file this size', false],
      ], '1,842 − 9 = 1,833, so three rows disappeared without being logged — perhaps a filter step or a failed type conversion removed them. Rows do not round; every one must be accounted for.'),
      mcq('Lines for two product IDs are not in the product master. What does the brief ask you to do with them?', [
        ['Keep them, labelled "Unknown product", and report the count', true],
        ['Delete them, so that every revenue figure has a known category', false],
        ['Give them the category of the product with the nearest ID', false],
        ['Leave them as #N/A in the Table so that the pivots fail', false],
      ], 'Deleting the lines would understate revenue, and guessing a category invents data. Keeping and labelling them preserves the total and makes the gap visible to the catalogue team.'),
    ],
    assignment: {
      title: 'A Sales Dashboard in Excel',
      description: 'A one-page, refreshable Excel dashboard for a retail chain\'s January–June sales: messy raw files cleaned into a Table, lookups to product and store data, pivots by region, category, month and product, honest charts, connected slicers and three written findings.',
      instructions: `Build the workbook described in this unit's brief and submit it as an .xlsx file (with the three
CSV files you generated, or the script that generates them).

**Submit:**

1. The workbook with sheets Raw, Clean (or Power Query output), Lookups, Pivots and Dashboard.
2. The cleaning log, on its own sheet, with counts that add up.
3. A screenshot of the dashboard with no slicer selected, and one with Region = one region and a
   single month selected.
4. A short note (half a page) describing the refresh test: what data you added, the steps you took,
   and the before and after totals.

**Before you submit, check every acceptance criterion in the brief** — reconcile the totals, click
every slicer and confirm every card and chart responds, and look at every chart's axis.`,
      rubric: [
        { criterion: 'Clean, reconciled data', description: 'Raw kept untouched; tblSales has real dates, numeric values, trimmed codes and no duplicates; lookups bring in product, category, cost and region; unknown products kept and labelled; the cleaning log counts reconcile exactly.', maxPoints: 30 },
        { criterion: 'Correct analysis', description: 'Pivots built on the Table; months grouped with years; % of total and month-over-month change correct; top-5 products and the weakest store identified correctly; gross margin by category correct; dashboard total equals SUM of tblSales.', maxPoints: 25 },
        { criterion: 'Honest, readable dashboard', description: 'KPI cards top left, trend line, sorted bars with axes from zero, calendar-order months, titles that state findings, consistent formats, no hard-typed numbers.', maxPoints: 20 },
        { criterion: 'Interactivity and refresh', description: 'Region, Category and timeline slicers connected to every pivot; KPI cards follow the slicers; the refresh test shows new data flowing through with Refresh All.', maxPoints: 15 },
        { criterion: 'Written findings', description: 'Three findings, each specific and supported by a number on the page, written for the regional head rather than about Excel.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_EXCEL_ANALYSIS_CHECKPOINT',
    notes: `Ten questions on analysing data in Excel: dynamic arrays, pivot tables, charts, what-if models
and dashboards. Most give a small scenario and ask what Excel will show or what the analyst should do.
Answer from what Excel actually does, and from what an honest report needs.`,
    checkpoint: [
      mcq('Region is in B2:B13 and Revenue in E2:E13. Which formula lists the rows that are in the West region OR have revenue above ₹1,00,000?', [
        ['=FILTER(A2:E13,(B2:B13="West")+(E2:E13>100000))', true],
        ['=FILTER(A2:E13,(B2:B13="West")*(E2:E13>100000))', false],
        ['=FILTER(A2:E13,OR(B2:B13="West",E2:E13>100000))', false],
        ['=FILTER(A2:E13,B2:B13="West",E2:E13>100000)', false],
      ], 'Adding the two TRUE/FALSE arrays keeps rows where either is true. Multiplying gives AND; OR() collapses the arrays to one single TRUE or FALSE; the comma form makes the second test the if_empty value.'),
      mcq('A pivot shows Region × Month revenue. North is ₹1,83,000 of February\'s ₹2,69,000 and ₹3,15,000 of the ₹8,67,000 total. With % of Column Total (months as columns), what does North\'s February cell show?', [
        ['68.03%', true],
        ['36.33%', false],
        ['58.10%', false],
        ['21.11%', false],
      ], '% of Column Total divides by the month\'s total: 1,83,000 / 2,69,000 = 68.03%. 36.33% is North\'s share of the grand total, 58.10% its February share of North\'s own revenue, and 21.11% February North over the grand total.'),
      mcq('A pivot built from tblSales shows January to March. April\'s rows were appended to tblSales this morning, but the pivot still ends at March. What is needed?', [
        ['Refresh the pivot; the Table already includes the April rows', true],
        ['Change the data source to include the new April rows', false],
        ['Add an April field to the pivot\'s Columns area', false],
        ['Rebuild the pivot from scratch, since a pivot cannot add months it has not seen', false],
      ], 'Because the source is a Table, the April rows are already in range; the pivot only needs a refresh to read them. Changing the source is needed only for a fixed range.'),
      mcq('A two-variable data table shows profit for 80–140 orders a day against AOV ₹300–₹400. The manager asks why one cell cannot be edited. What is the reason?', [
        ['The cells form one {=TABLE()} array that Excel maintains', true],
        ['The sheet is protected each time a data table is created', false],
        ['Data tables store values only and cannot be changed afterwards', false],
      ], 'A data table fills its results with a single TABLE array formula, and part of an array cannot be edited. Change the inputs or rebuild the table instead.'),
      mcq('In a monthly profit model, profit = orders × 30 × ₹140 − ₹2,30,000. Goal Seek sets profit to ₹3,11,800 by changing orders. What value does it find?', [
        ['129', true],
        ['120', false],
        ['55', false],
        ['137', false],
      ], 'Contribution needed is 3,11,800 + 2,30,000 = 5,41,800; each order a day contributes 140 × 30 = 4,200 a month; 5,41,800 / 4,200 = 129.'),
      mcq('Which chart best answers "Did the CSE, ECE and MECH branches each collect more in July than in June?"', [
        ['Clustered columns, one pair of June and July bars per branch', true],
        ['A pie chart showing all six branch-and-month amounts as slices', false],
        ['A scatter plot of June amounts against branch name', false],
        ['A single line joining CSE, ECE and MECH for July', false],
      ], 'The question compares two months within each branch, so paired columns per branch make each comparison direct. A pie mixes months and branches, and scatter needs two numeric axes.'),
      mcq('A dashboard uses one Region slicer, three pivots on tblSales, and a fourth pivot built from a copy of the data on another sheet. The fourth pivot cannot be ticked in Report Connections. Why?', [
        ['It does not share the slicer\'s source, so it cannot be connected', true],
        ['A slicer can be connected to at most three pivot tables', false],
        ['The fourth pivot must be refreshed before it can be listed', false],
      ], 'Report Connections lists only pivots built on the same source. Rebuild the fourth pivot on tblSales and it can be linked to the slicer.'),
      mcq('A pivot\'s Values area shows "Count of Amount" for a fees Table, and the totals look like small whole numbers. What should the analyst check first?', [
        ['Whether some Amount cells are text or blank', true],
        ['Whether the Table has more than 65,536 rows', false],
        ['Whether the Amount column is formatted as currency', false],
        ['Whether Amount was placed in Rows by mistake', false],
      ], 'Excel defaults to Count when the field contains any text or blank. Find and fix those cells, refresh, and set the field to Sum; formatting does not change the default.'),
      mcq('=TAKE(SORT(tblFees,6,-1),3) returns R03 ₹48,000, R05 ₹46,000 and R10 ₹46,000. What should the analyst note when reporting the "top 3"?', [
        ['The 2nd and 3rd places are tied, so the cut-off is arbitrary if more tie', true],
        ['TAKE sorts the rows a second time, so the order shown on the report may be reversed', false],
        ['SORT drops tied rows, so a fourth receipt may be missing', false],
      ], 'SORT keeps every row, and TAKE returns the first three of them. When values tie at the boundary, another receipt with the same amount could be left out, so a top-N must mention ties.'),
      mcq('A dashboard card reads =SUM(tblSales[Revenue]) and the title reads "data to" =TODAY(). The weekly load was forgotten. What will a reader see?', [
        ['Last week\'s total, dated today, with no sign it is stale', true],
        ['An error, because the Table has not changed since last week', false],
        ['A blank card until the new data has been loaded', false],
        ['This week\'s total, since SUM reads the source file directly', false],
      ], 'Nothing in the card detects a missed load, and TODAY changes every day. Showing =MAX of the date column instead makes a stale dashboard obvious.'),
    ],
  },
];
