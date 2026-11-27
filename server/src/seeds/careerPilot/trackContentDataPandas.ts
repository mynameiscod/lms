/**
 * Career-track content: NumPy and pandas (Data Analytics + AI, batch A2).
 *
 * DT_PANDAS — Python for data: notebooks, NumPy arrays, reading data into pandas, selecting and
 * filtering, groupby and pivot tables, merging and reshaping, and dates. Batch A1 taught Excel and SQL,
 * so the notes keep saying what each pandas step is in those terms ("groupby is GROUP BY", "merge is a
 * JOIN", "pivot_table is a pivot table").
 *
 * Every output shown was produced by running the code (pandas 3.0, NumPy 2.5). The code is written to
 * run on pandas 2.2 too; where 2.x and 3.0 differ (Copy-on-Write, the string dtype, datetime
 * resolution, the 'M' frequency alias) the notes say which version prints what. The topic is
 * single-skill, so checkpoint questions carry no skillKey.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_DATA_PANDAS_BUNDLES: PilotBundle[] = [
  /* ══ DT_PANDAS ══════════════════════════════════════════════════════════════════════════ */

  /* ── NOTEBOOKS ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PANDAS_NOTEBOOKS',
    notes: `Almost every analyst writes pandas in a **notebook**: Jupyter on your own laptop, or Google Colab in
the browser. A notebook mixes code, its output, tables and charts, and your written notes in one
document — which is exactly what a manager or reviewer wants to read. It also has one trap that
catches nearly every beginner, and this unit is mostly about that trap.

## Cells and the kernel

A notebook is a list of **cells**. A *code* cell holds Python; a *Markdown* cell holds text and
headings. Behind the page runs a **kernel** — one Python process that keeps every variable you have
created in memory. Running a cell (Shift+Enter) sends its code to the kernel, and the number in
\`[ ]\` beside it is the order in which cells were run: \`[1]\`, \`[2]\`, \`[3]\`…

That number is the clue. The kernel does not care where a cell sits on the page — only **when it
was run**. Variables live in the kernel, not in the cells.

## The out-of-order bug

ShopKart's analyst has a sales file whose amounts total ₹5,986. She writes:

    # Cell 1
    import pandas as pd
    df = pd.read_csv('sales.csv')
    df['amount'] = df['qty'] * df['unit_price']
    print(df['amount'].sum())

    5986

    # Cell 2 — add 18% GST
    df['amount'] = df['amount'] * 1.18
    print(round(df['amount'].sum(), 2))

    7063.48

She tweaks a chart further down, scrolls up, and runs Cell 2 again to "check the number":

    8334.91

Cell 2 **changes df in place**, so the second run applied GST on top of GST (5,986 × 1.18 × 1.18).
Nothing on the page shows this: Cell 2's code looks correct, and its execution count just reads
\`[4]\` instead of \`[2]\`. If she now exports a chart, it shows inflated numbers.

The fix is a habit, not a trick:

- **Never overwrite a column with a function of itself** in a cell you might re-run. Create a new
  column instead — \`df['amount_gst'] = df['amount'] * 1.18\` gives 7063.48 however many times it runs.
- Read the raw file in one cell near the top, and treat df as "derived from that file", never edited by
  hand.
- Before you share anything: **Kernel → Restart & Run All** (Colab: **Runtime → Restart and run all**).
  If the notebook only works when cells are run in your special order, that run will fail — which is
  what you want to find out before your manager does.

The opposite bug is common too: you delete a cell that created \`stores\`, but the variable is still in
the kernel, so everything below keeps working — until the next restart, when it raises
\`NameError: name 'stores' is not defined\`.

## Jupyter on your laptop vs Google Colab

| | Jupyter (local) | Google Colab |
|---|---|---|
| Set-up | Install Python, then \`pip install notebook pandas\` (or Anaconda) | Nothing — a Google account and a browser |
| Your files | Read straight from your folders | Upload them, or mount Google Drive |
| Libraries | Whatever you installed, at the versions you chose | pandas, NumPy, Matplotlib preinstalled; Google picks the versions |
| Lifetime | Runs until you stop it | The runtime disconnects when idle or after a maximum session length; files uploaded to \`/content\` are deleted |
| Good for | Company data that must stay on your machine; repeatable work | Learning, sharing, a free GPU |

In Colab, keep data in Drive so it survives a disconnect:

    from google.colab import drive
    drive.mount('/content/drive')
    df = pd.read_csv('/content/drive/MyDrive/shopkart/sales.csv')

Never upload a company's customer data to a personal Colab or Drive — ask what is allowed first.

## Commands and shortcuts worth knowing

- **Shift+Enter** run and move on; **Esc** then **A**/**B** add a cell above/below; **Esc M** turn a
  cell into Markdown; **Esc D D** delete a cell.
- \`%pip install openpyxl\` installs a library into *this* kernel (better than \`!pip\`, which can
  install into a different Python).
- The last expression in a cell is displayed automatically: \`df.head()\` on its own line shows a
  formatted table, while \`print(df.head())\` shows plain text.

## A notebook that reproduces itself

Write notebooks someone else can run next month and get the same answer:

1. **First cell:** all imports, and print the versions, because pandas 2.x and 3.0 behave differently
   in places this topic points out:

        import sys, numpy as np, pandas as pd
        print(pd.__version__, np.__version__, sys.version.split()[0])

        3.0.6 2.5.4 3.13.15

2. **Paths relative to the notebook** (\`data/sales.csv\`), not \`C:/Users/ravi/Downloads/...\`.
3. **Raw files are read-only.** Clean in code; save cleaned output to a new file.
4. **Fix randomness.** \`df.sample(3)\` picks different rows every run; \`df.sample(3, random_state=7)\`
   picks the same three every time. For NumPy, create a generator with a seed:

        rng = np.random.default_rng(42)
        print(rng.integers(100, 1000, size=5))

        [180 796 689 494 489]

   Run it again from a fresh generator with seed 42 and you get the same five numbers.
5. **Markdown between steps**: the question, what this step does, and what you found. A notebook of
   bare code cells is not a report.
6. **Restart & Run All** as the last thing before you share, and check the numbers match.

The working rule: *the notebook, run top to bottom on a fresh kernel, is the analysis.* Anything you
did that is not in it did not happen.`,
    mcqs: [
      mcq('A notebook cell contains df[\'amount\'] = df[\'amount\'] * 1.18, and the amount column totals ₹5,986 before it runs. The analyst runs that cell twice. What does df[\'amount\'].sum() show now?', [
        ['About ₹8,334.91', true],
        ['About ₹7,063.48', false],
        ['About ₹14,126.96', false],
        ['₹5,986, since a cell runs once', false],
      ], 'Each run multiplies the current column by 1.18, so two runs give 5,986 × 1.18 × 1.18 ≈ 8,334.91. 7,063.48 is one run; 14,126.96 would be adding 18% twice to the original as 2 × 1.18.'),
      mcq('Before emailing a notebook to her manager, why should an analyst use Restart & Run All?', [
        ['It proves the notebook works top to bottom with no hidden state', true],
        ['It makes the notebook run faster for whoever opens it later', false],
        ['It saves the outputs in a form that Excel can open directly', false],
      ], 'Restarting empties the kernel, so any cell that relied on a variable from a deleted cell or on running cells in a special order fails now, not on the manager\'s machine.'),
      mcq('A student uploads sales.csv to Colab\'s file panel, analyses it, and comes back the next morning to a FileNotFoundError on the same read_csv line. What happened?', [
        ['The runtime was recycled, and uploaded files in /content were deleted', true],
        ['Colab renames every uploaded file overnight to protect the private data', false],
        ['read_csv works only on files read in the same browser tab', false],
        ['The file path must be written with backslashes in Colab', false],
      ], 'Colab runtimes are temporary; files uploaded into /content disappear when the runtime disconnects. Keep data in Google Drive and mount it, or re-upload.'),
    ],
    checkpoint: [
      mcq('The execution counts beside four cells read, from top to bottom, [3], [1], [5], [2]. What does that tell you?', [
        ['The cells ran out of page order, so the kernel may not match the page', true],
        ['The third cell has been run five times since the kernel started', false],
        ['The cells will be renumbered into page order the next time the file is saved', false],
      ], 'The number is the order of execution. A run order of 2nd, 4th, 1st, 3rd from the top means the results depend on that order; Restart & Run All shows whether the page alone reproduces them.'),
      mcq('An analyst deletes the cell that created stores = pd.read_csv(\'stores.csv\'), yet the merge cell below it still works. When will the problem appear?', [
        ['After a kernel restart, as a NameError on stores', true],
        ['Immediately, because deleting a cell deletes its variables', false],
        ['Never, because the notebook stores variables in the file', false],
        ['When the notebook is next saved, as a KeyError', false],
      ], 'Variables live in the kernel, not in cells. stores stays in memory until the kernel restarts; then nothing creates it and the merge cell raises NameError.'),
      mcq('A notebook draws df.sample(50) to spot-check rows, and a colleague who reruns it gets different rows and a different error count. What is the fix?', [
        ['Pass random_state, such as df.sample(50, random_state=7)', true],
        ['Sort df before sampling so the rows always come out in order', false],
        ['Use df.head(50), which is the same as sampling with a seed', false],
      ], 'random_state fixes the pseudo-random choice, so every run draws the same 50 rows. head(50) always takes the first 50, which is not a random sample of the file.'),
    ],
  },

  /* ── NUMPY ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PANDAS_NUMPY',
    notes: `pandas is built on **NumPy**. Every pandas column is a NumPy-style array underneath, so the ideas in this
unit — one type per array, arithmetic on whole arrays at once, true/false masks — are exactly how
pandas behaves. Learn them once here and pandas stops feeling magic.

## A list is not an array

    import numpy as np
    prices = [649, 299, 20, 165]          # a Python list
    print(prices * 2)

    [649, 299, 20, 165, 649, 299, 20, 165]

For a list, \`* 2\` means "repeat the list". For an array it means "multiply every element":

    p = np.array(prices)
    print(p * 2)
    print(p.dtype, p.shape)

    [1298  598   40  330]
    int64 (4,)

An array has one **dtype** (here 64-bit integers) and a **shape** (4 elements, one dimension). That
single type is what makes it fast: NumPy stores the numbers packed together and runs the loop in C.
Doubling a million numbers as a list comprehension took about 23 times longer than \`arr * 2\` on the
machine these notes were written on. On a sales file of a few lakh rows, that is the difference between
instant and waiting.

## Vectorised arithmetic: whole columns at once

Two arrays of the same length combine element by element — like dragging an Excel formula down a
column, without the dragging:

    qty = np.array([2, 1, 6, 3])
    revenue = p * qty
    print(revenue)
    print(revenue.sum(), revenue.mean(), revenue.max(), revenue.argmax())

    [1298  299  120  495]
    2212 553.0 1298 0

\`argmax()\` is the *position* of the largest value (0, the first order). No \`for\` loop anywhere; this
is called **vectorised** code, and it is how good pandas is written too.

## Boolean masks: the WHERE clause of NumPy

A comparison on an array gives an array of True/False — a **mask**:

    mask = revenue > 500
    print(mask)
    print(revenue[mask])
    print(mask.sum())

    [ True False False False]
    [1298]
    1

Putting the mask inside \`[ ]\` keeps only the True positions. \`mask.sum()\` counts the Trues, because
True counts as 1 — "how many orders above ₹500" in one step. Combine conditions with \`&\` (and),
\`|\` (or) and \`~\` (not), with **brackets round each condition**:

    print(revenue[(revenue > 100) & (revenue < 1000)])
    print(np.where(revenue >= 500, 'High', 'Low'))

    [299 120 495]
    ['High' 'Low' 'Low' 'Low']

\`np.where(condition, if_true, if_false)\` is Excel's \`IF\` over a whole column.

## Two dimensions, axes and broadcasting

Units sold by two stores (rows) on three days (columns):

    m = np.array([[120, 95, 130],
                  [80, 110, 90]])
    print(m.sum(axis=0))      # down the rows -> one total per column (per day)
    print(m.sum(axis=1))      # across the columns -> one total per row (per store)

    [200 205 220]
    [345 280]

Remember **axis=0 collapses the rows** and **axis=1 collapses the columns**; pandas uses the same
words.

**Broadcasting** stretches a smaller array to fit a bigger one. Day-wise price factors (normal, +10%
festival, −10% clearance) apply to every store at once:

    print(m * np.array([1.0, 1.1, 0.9]))

    [[120.  104.5 117. ]
     [ 80.  121.   81. ]]

The three factors are reused for each row. A single number broadcasts to everything — that is why
\`p * 2\` worked.

## dtypes bite

- Mixing types forces one common type: \`np.array([1, 2.5, 3]).dtype\` is \`float64\`, and
  \`np.array([1, '2', 3]).dtype\` is \`<U21\` — **strings**. One stray text value in a column of
  numbers turns the whole column into text, and arithmetic stops working. You will meet this again
  in pandas as "a number column read as text".
- Small integer types overflow silently:

      a = np.array([10, 20, 30], dtype=np.int8) * 10
      print(a)

      [100 -56  44]

  int8 holds −128 to 127, so 200 wraps round to −56. Leave dtypes at the default (int64, float64)
  unless you know why not.
- **NaN** ("not a number") marks missing values in float arrays, and it spreads:

      x = np.array([1.0, np.nan, 3.0])
      print(x.mean(), np.nanmean(x))

      nan 2.0

  NumPy's \`mean\` returns nan if anything is missing; \`np.nanmean\` skips it. pandas skips NaN by
  default — convenient, and dangerous when half a column is NaN (the cleaning topic returns to this).

## Slices are views

    print(p[1:3], p[[0, 3]])

    [299  20] [649 165]

A slice like \`p[1:3]\` is a **view** on the same memory — changing it changes \`p\`:

    s = p[1:3]
    s[0] = 0
    print(p)

    [649   0  20 165]

Picking positions with a list (\`p[[0, 3]]\`) or a mask makes a **copy**. Use \`.copy()\` whenever you
mean to change a piece without touching the original. pandas 3.0's Copy-on-Write removes this worry for
DataFrames (the selection unit explains it), but NumPy arrays still behave this way.

## What to take into pandas

- Think in **whole columns**, not rows: \`df['qty'] * df['unit_price']\`, never a loop.
- A filter is a **mask** inside brackets.
- **One dtype per column**; check it before you calculate.
- \`axis=0\` is down, \`axis=1\` is across.`,
    mcqs: [
      mcq('Order values are revenue = np.array([1298, 299, 120, 495]). What does (revenue > 300).sum() return?', [
        ['2', true],
        ['1793', false],
        ['[True False False True]', false],
        ['1', false],
      ], 'The comparison makes a mask with True at 1298 and 495, and summing a mask counts the Trues. 1793 would be revenue[revenue > 300].sum(), the total of those orders.'),
      mcq('m = np.array([[120, 95, 130], [80, 110, 90]]) holds units for two stores (rows) over three days (columns). What does m.sum(axis=0) give?', [
        ['[200 205 220], one total per day', true],
        ['[345 280], one total per store', false],
        ['625, the total of every cell', false],
      ], 'axis=0 collapses the rows, leaving one value per column. axis=1 collapses the columns and gives the per-store totals; no axis gives the grand total.'),
      mcq('A price list is loaded as np.array([649, 299, \'NA\', 165]). Why does multiplying it by a quantity array fail?', [
        ['The one text value makes the whole array a string array', true],
        ['NumPy cannot multiply two arrays of different names', false],
        ['NA is read as zero, and multiplying by zero is refused', false],
        ['Arrays must be converted to lists before arithmetic', false],
      ], 'An array has one dtype, so a single string forces every element to be a string (dtype <U21) and numeric arithmetic is no longer defined. Clean the value or use NaN for missing.'),
    ],
    checkpoint: [
      mcq('What does this print?\n\n    a = np.array([10, 20, 30], dtype=np.int8) * 10\n    print(a)', [
        ['[100 -56  44]', true],
        ['[100 200 300]', false],
        ['An OverflowError for the value 200', false],
        ['[100 127 127]', false],
      ], 'int8 holds −128 to 127. 200 and 300 wrap round to −56 and 44 without any error — which is why money columns should stay int64 or float64.'),
      mcq('x = np.array([1.0, np.nan, 3.0]). What do x.mean() and np.nanmean(x) return?', [
        ['nan and 2.0', true],
        ['2.0 and 2.0', false],
        ['1.33 and 2.0', false],
      ], 'NumPy\'s mean propagates NaN, so any missing value makes the result nan. nanmean ignores the NaN and averages 1.0 and 3.0. (pandas .mean() skips NaN by default.)'),
      mcq('p = np.array([649, 299, 20, 165]); s = p[1:3]; s[0] = 0. What is p now?', [
        ['[649   0  20 165]', true],
        ['[649 299  20 165]', false],
        ['[  0 299  20 165]', false],
        ['[649 299   0 165]', false],
      ], 'A basic slice is a view on the same memory, so writing to s[0] writes to p[1]. p[[1, 2]] or p[1:3].copy() would have made an independent copy.'),
    ],
  },

  /* ── SERIES_DATAFRAMES ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PANDAS_SERIES_DATAFRAMES',
    notes: `A **DataFrame** is a table: named columns, one row per record — an Excel sheet or a SQL table in
memory. Each column is a **Series**: one array with one dtype, plus labels. Both share an **index**,
the row labels on the left. This unit is about getting data in correctly and checking what arrived,
which is where most analysis errors start.

## The data used through this topic

ShopKart runs three grocery stores. **sales.csv** has 12 orders, January to March 2025:

    order_id,order_date,store_id,category,product,qty,unit_price,payment
    O1001,2025-01-03,S1,Grocery,Basmati Rice 5kg,2,649,UPI
    O1002,2025-01-03,S2,Personal Care,Shampoo 340ml,1,299,Card
    O1003,2025-01-05,S1,Snacks,Masala Chips,6,20,Cash
    O1004,2025-01-12,S3,Grocery,Toor Dal 1kg,3,165,UPI
    O1005,2025-01-19,S2,Beverages,Green Tea 100 bags,2,240,UPI
    O1006,2025-02-02,S1,Personal Care,Face Wash,2,185,Card
    O1007,2025-02-08,S3,Snacks,Namkeen Mix,4,55,Cash
    O1008,2025-02-14,S2,Grocery,Sunflower Oil 1L,5,155,UPI
    O1009,2025-02-21,S1,Beverages,Filter Coffee 500g,1,420,Card
    O1010,2025-03-01,S3,Grocery,Basmati Rice 5kg,1,649,UPI
    O1011,2025-03-09,S2,Snacks,Masala Chips,10,20,Cash
    O1012,2025-03-15,S1,Grocery,Toor Dal 1kg,4,165,UPI

**stores.csv** has four stores — S1 Ameerpet (Hyderabad, South), S2 Koramangala (Bengaluru, South),
S3 Andheri (Mumbai, West) and S4 Salt Lake (Kolkata, East), which opened in April and has no sales yet.

## Reading and the first four looks

    import pandas as pd
    df = pd.read_csv('sales.csv')
    print(df.shape)

    (12, 8)

**shape** is (rows, columns). Compare it with what you expected *before* doing anything else — 12
orders, 8 columns. Then look at a few rows:

    print(df[['order_id', 'order_date', 'category', 'qty', 'unit_price']].tail(2))

       order_id  order_date category  qty  unit_price
    10    O1011  2025-03-09   Snacks   10          20
    11    O1012  2025-03-15  Grocery    4         165

(\`head(n)\` shows the first rows, \`tail(n)\` the last. A wide table prints with \`...\` in the middle;
select the columns you want to see, or set \`pd.set_option('display.width', 120)\`.)

**info()** is the most useful single command: types, non-missing counts and memory.

    df.info()

    RangeIndex: 12 entries, 0 to 11
    Data columns (total 8 columns):
     #   Column      Non-Null Count  Dtype
    ---  ------      --------------  -----
     0   order_id    12 non-null     str
     1   order_date  12 non-null     str
     2   store_id    12 non-null     str
     3   category    12 non-null     str
     4   product     12 non-null     str
     5   qty         12 non-null     int64
     6   unit_price  12 non-null     int64
     7   payment     12 non-null     str
    dtypes: int64(2), str(6)

Read it line by line: every column has 12 non-null values (nothing missing); qty and unit_price are
numbers; the rest are text. **Version note:** pandas 3.0 shows text columns as \`str\`, its new
dedicated string dtype. pandas 2.x shows them as \`object\`. Both mean "text" for your purposes; just
recognise both. Note too that order_date is text — pandas does not guess dates unless you ask.

**describe()** summarises the numeric columns (count, mean, std, min, quartiles, max):

    df['amount'] = df['qty'] * df['unit_price']
    print(df['amount'].describe().round(1))

    count      12.0
    mean      498.8
    std       321.5
    min       120.0
    25%       279.2
    50%       450.0
    75%       651.8
    max      1298.0

Mean ₹498.8 but median (50%) ₹450 — a few large orders pull the mean up. A min of 0 or a negative, or a
max of 99999, is the first sign of bad data. **value_counts()** is the same check for a text column:

    print(df['category'].value_counts())

    category
    Grocery          5
    Snacks           3
    Personal Care    2
    Beverages        2
    Name: count, dtype: int64

That is \`SELECT category, COUNT(*) ... GROUP BY category ORDER BY 2 DESC\` in one line, and it is how
you spot "Grocery" and "grocery " as two different categories.

## Series and the index

\`df['qty']\` is a Series; its labels are the index 0, 1, 2…:

    print(df['qty'].head(3))

    0    2
    1    1
    2    6
    Name: qty, dtype: int64

The default index is just row numbers (a **RangeIndex**). You can make a column the index when it
uniquely identifies rows, then look rows up by it:

    d2 = df.set_index('order_id')
    print(d2.loc['O1004', 'product'])
    print(d2.index.is_unique)

    Toor Dal 1kg
    True

Check \`is_unique\` — pandas allows duplicate index labels, and a lookup on a duplicated label returns
several rows instead of one.

## read_csv options that save you later

Real files are messier. A finance export, **branch_sales.csv**:

    branch_code,month,revenue,footfall
    007,04-01-2025,"1,25,400",3120
    012,04-01-2025,"98,250",-
    045,04-01-2025,NA,2875
    007,04-02-2025,"1,31,900",3305

Read naïvely, almost everything is wrong:

    raw = pd.read_csv('branch_sales.csv')
    print(raw)
    print(raw.dtypes)

       branch_code       month   revenue footfall
    0            7  04-01-2025  1,25,400     3120
    1           12  04-01-2025    98,250        -
    2           45  04-01-2025       NaN     2875
    3            7  04-02-2025  1,31,900     3305
    branch_code    int64
    month            str
    revenue          str
    footfall         str

Branch "007" became the number 7; revenue is text because of the commas; one "-" made footfall text;
month is text. Fix each at the door:

    df = pd.read_csv('branch_sales.csv',
                     dtype={'branch_code': str},   # codes are labels, keep leading zeros
                     thousands=',',                 # 1,25,400 -> 125400 (Indian grouping works too)
                     na_values=['-'],               # treat '-' as missing
                     parse_dates=['month'], dayfirst=True)
    print(df)
    print(df.dtypes)

      branch_code      month   revenue  footfall
    0         007 2025-01-04  125400.0    3120.0
    1         012 2025-01-04   98250.0       NaN
    2         045 2025-01-04       NaN    2875.0
    3         007 2025-02-04  131900.0    3305.0
    branch_code               str
    month          datetime64[us]
    revenue               float64
    footfall              float64

Revenue and footfall became floats because they now contain NaN (a plain int64 column cannot hold a
missing value). "NA" was recognised as missing by default. \`dayfirst=True\` read 04-01-2025 as 4
January — without it, pandas reads it month-first, as 1 April. (**Version note:** pandas 3.0 shows
parsed dates as \`datetime64[us]\`; 2.x shows \`datetime64[ns]\`. Both are dates.)

Other options you will use: \`usecols=['order_id', 'qty', 'unit_price']\` loads only those columns
(useful for wide files), \`nrows=1000\` reads a sample, \`sep=';'\` or \`sep='\\t'\` for other separators,
and \`encoding='utf-8-sig'\` (or \`'latin-1'\`) when Excel-saved files show strange characters in the
first column name.

## read_excel

\`pd.read_excel('file.xlsx', sheet_name='Targets')\` reads one sheet (it needs the **openpyxl** library:
\`%pip install openpyxl\`). Business workbooks often have a title above the table:

    print(pd.read_excel('targets.xlsx', sheet_name='Targets').head(3))

      FY25 store targets (Rs)  Unnamed: 1
    0                     NaN         NaN
    1                store_id  jan_target
    2                      S1        4000

"Unnamed" columns and the real header sitting in the data mean the table starts lower down. Skip the
title rows:

    print(pd.read_excel('targets.xlsx', sheet_name='Targets', skiprows=2))

      store_id  jan_target
    0       S1        4000
    1       S2        3500
    2       S3        1500

\`sheet_name=None\` reads every sheet into a dict of DataFrames, keyed by sheet name.

## The arrival checklist

After every read: **shape** (row count as expected?), **head/tail** (columns lined up?), **info**
(right types, how many missing?), **describe** and **value_counts** (sensible ranges and categories?).
Five commands, under a minute, and they catch most problems before they become wrong answers.`,
    mcqs: [
      mcq('A branch file stores codes like 007 and 045. After pd.read_csv, the column holds 7 and 45. Which read_csv argument keeps the codes as they were?', [
        ['dtype={\'branch_code\': str}', true],
        ['thousands=\'0\'', false],
        ['parse_dates=[\'branch_code\']', false],
        ['na_values=[\'0\']', false],
      ], 'pandas guesses the type from the values and reads 007 as the integer 7. Declaring the column as str keeps it as a label with its leading zeros.'),
      mcq('A revenue column arrives with values such as "1,25,400" and dtypes shows it as text. Which read_csv option turns it into numbers as the file is read?', [
        ['thousands=\',\'', true],
        ['decimal=\',\'', false],
        ['sep=\',\'', false],
      ], 'thousands=\',\' strips the grouping commas, including Indian lakh grouping, before conversion. decimal=\',\' would read the comma as a decimal point, and sep is already a comma.'),
      mcq('df.info() for a 5,000-row loans file shows "income  3,412 non-null  float64". What does that mean?', [
        ['1,588 incomes are missing (NaN)', true],
        ['3,412 incomes are above zero', false],
        ['The column holds 3,412 unique values', false],
        ['3,412 rows failed to load from the file', false],
      ], 'Non-Null Count is the number of values that are not missing. 5,000 − 3,412 = 1,588 rows have no income — something to investigate before averaging it.'),
    ],
    checkpoint: [
      mcq('pd.read_excel(\'targets.xlsx\') returns columns named "FY25 store targets (Rs)" and "Unnamed: 1", with the real header store_id, jan_target appearing as row 1. The table\'s header is on the third row of the sheet. What fixes the read?', [
        ['skiprows=2', true],
        ['header=None', false],
        ['usecols=2', false],
        ['sheet_name=2', false],
      ], 'Skipping the two rows above the table makes the third row the header. header=None would number the columns and keep the title rows as data; sheet_name=2 reads a different sheet.'),
      mcq('A file has dates like 04-02-2025 meaning 4 February. pd.read_csv(..., parse_dates=[\'month\']) is used with no other date option. What date does the 04-02-2025 row get?', [
        ['2 April 2025', true],
        ['4 February 2025', false],
        ['NaT, because the format is unknown', false],
      ], 'Without dayfirst=True or an explicit format, pandas reads the first number as the month. Add dayfirst=True, or better, parse with format=\'%d-%m-%Y\'.'),
      mcq('For ShopKart\'s sales DataFrame with columns order_id, store_id, category, product, qty and unit_price, what does df.describe() show by default?', [
        ['Count, mean, spread and quartiles for qty and unit_price only', true],
        ['The same statistics for every one of the six columns', false],
        ['The number of distinct values in each text column', false],
        ['The first five rows, followed by a total row added at the very end', false],
      ], 'describe() summarises numeric columns unless you pass include=\'all\' or include=\'object\'/\'str\'. Use value_counts() or nunique() for text columns.'),
    ],
  },

  /* ── SELECT_FILTER ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PANDAS_SELECT_FILTER',
    notes: `Most analysis questions start with "which rows?" and "which columns?". This unit is the pandas version of
SQL's WHERE and SELECT list — and of Excel's filter button — plus the one warning everybody meets.
We use ShopKart's 12 orders with an amount column added:

    df = pd.read_csv('sales.csv')
    df['amount'] = df['qty'] * df['unit_price']

## Columns

    df['amount']                         # one column -> a Series
    df[['order_id', 'category', 'amount']]   # a list of columns -> a DataFrame

Note the double brackets: the outer \`[ ]\` selects, the inner \`[ ]\` is a Python list.
\`type(df['amount'])\` is a Series and \`type(df[['amount']])\` is a one-column DataFrame — they print
and behave differently, and many functions want one or the other.

## Rows by label (loc) and by position (iloc)

- **\`df.loc[rows, columns]\`** selects by **label** — index labels and column names.
- **\`df.iloc[rows, columns]\`** selects by **position** — 0, 1, 2…, like Python lists.

The difference that catches people is the slice end:

    print(df.loc[2:4, ['order_id', 'amount']])

      order_id  amount
    2    O1003     120
    3    O1004     495
    4    O1005     480

    print(df.iloc[2:4, [0, 8]])

      order_id  amount
    2    O1003     120
    3    O1004     495

**loc includes the end label (2, 3 and 4); iloc excludes the end position (2 and 3)**, exactly like a
Python slice. With the default 0, 1, 2… index the two look interchangeable — until you sort or filter
and the labels no longer match positions. Use loc with names and conditions; use iloc only when you
truly mean "the first n rows".

## Boolean filters — WHERE in pandas

A comparison on a column gives a True/False Series (a mask, as in NumPy); putting it in brackets keeps
the True rows:

    upi_big = df[(df['payment'] == 'UPI') & (df['amount'] > 500)]
    print(upi_big[['order_id', 'store_id', 'amount']])

       order_id store_id  amount
    0     O1001       S1    1298
    7     O1008       S2     775
    9     O1010       S3     649
    11    O1012       S1     660

Three rules, each the cause of a classic error:

1. Use **\`&\` for AND, \`|\` for OR, \`~\` for NOT** — not the words \`and\`/\`or\`/\`not\`. Python's \`and\`
   asks "is this whole Series true?", which has no answer: *ValueError: The truth value of a Series is
   ambiguous.*
2. **Brackets round every condition.** \`&\` binds tighter than \`==\`, so
   \`df['payment'] == 'UPI' & df['amount'] > 500\` is read as \`df['payment'] == ('UPI' & df['amount']) > 500\`
   and raises an error.
3. The filter returns a **new** DataFrame; df itself is unchanged unless you assign the result.

The filtered rows keep their original index labels (0, 7, 9, 11) — useful for tracing a row back to
the file.

## isin, between and query

    print(df[df['category'].isin(['Snacks', 'Beverages'])]['order_id'].tolist())

    ['O1003', 'O1005', 'O1007', 'O1009', 'O1011']

\`isin\` is SQL's \`IN (...)\`. \`between\` is SQL's BETWEEN and **includes both ends** by default:

    print(df[df['amount'].between(300, 660)][['order_id', 'amount']])

      order_id  amount
    3    O1004     495
    4    O1005     480
    5    O1006     370
    8    O1009     420
    9    O1010     649
    11   O1012     660

O1012 at exactly ₹660 is in. (\`inclusive='left'\` or \`'neither'\` changes that.) **query** lets you write
the condition as a string, which reads more like SQL; \`@\` refers to a Python variable:

    print(df.query("store_id == 'S1' and amount >= 370")[['order_id', 'amount']])

       order_id  amount
    0     O1001    1298
    5     O1006     370
    8     O1009     420
    11    O1012     660

    limit = 600
    print(df.query("amount > @limit")['order_id'].tolist())

    ['O1001', 'O1008', 'O1010', 'O1012']

Inside query, \`and\`/\`or\` are allowed. \`~df['payment'].isin(['Cash'])\` keeps every non-cash order.

## Filter and pick columns in one step with loc

    print(df.loc[df['amount'] > 600, ['order_id', 'product', 'amount']])

       order_id           product  amount
    0     O1001  Basmati Rice 5kg    1298
    7     O1008  Sunflower Oil 1L     775
    9     O1010  Basmati Rice 5kg     649
    11    O1012      Toor Dal 1kg     660

    print(df.loc[df['store_id'] == 'S3', 'amount'].sum())

    1364

"Total amount for store S3" — a filter and an aggregate, like \`SELECT SUM(amount) ... WHERE\`.

## Changing values: the chained-assignment trap

Suppose S2's orders must be zeroed for a test. The tempting line selects twice in a chain:

    d[d['store_id'] == 'S2']['amount'] = 0      # WRONG
    print(d.loc[d['store_id'] == 'S2', 'amount'].tolist())

    [299, 480, 775, 200]

Nothing changed. \`d[mask]\` makes a new DataFrame, and the assignment changes that temporary copy,
which is thrown away. What you see depends on the version:

- **pandas 2.x** prints a **SettingWithCopyWarning** ("A value is trying to be set on a copy of a slice
  from a DataFrame"). Some chained forms in 2.x, such as \`df['amount'][0] = 0\`, *did* change df — which
  is why the warning was so confusing.
- **pandas 3.0** uses **Copy-on-Write** by default: chained assignment **never** changes the original,
  and pandas warns with *ChainedAssignmentError: A value is being set on a copy of a DataFrame or Series
  through chained assignment.* The SettingWithCopyWarning no longer exists.

The fix is the same in both — **one \`loc\` call with the row condition and the column together**:

    d.loc[d['store_id'] == 'S2', 'amount'] = 0
    print(d.loc[d['store_id'] == 'S2', 'amount'].tolist())

    [0, 0, 0, 0]

The second form of the trap: you filter into a new variable and add a column to it.

    s1 = df[df['store_id'] == 'S1']
    s1['gst'] = s1['amount'] * 0.05

In pandas 2.x this raises the SettingWithCopyWarning (pandas cannot tell whether you meant to change
df). In 3.0 it runs silently. In **both**, s1 gets the column and df does not. If s1 is meant to be
its own table, say so: \`s1 = df[df['store_id'] == 'S1'].copy()\` — no warning in 2.x, clear intent in
both.

## A habit

Write every filter so a reader can say it aloud: "UPI orders above ₹500". If you cannot, split it into
named masks:

    is_upi = df['payment'] == 'UPI'
    is_big = df['amount'] > 500
    df[is_upi & is_big]`,
    workedExample: `**Brief from the Hyderabad area manager:** "Show me store S1's orders of ₹400 or more, and also any
Snacks orders from any store — just the order, store, product and amount, biggest first."

**1. Say the filter in words.** (store S1 AND amount ≥ 400) OR (category is Snacks). The brackets
matter: the Snacks orders do not need to be ≥ ₹400.

**2. Build named masks** so each piece can be checked on its own:

    s1_big = (df['store_id'] == 'S1') & (df['amount'] >= 400)
    snacks = df['category'] == 'Snacks'
    print(s1_big.sum(), snacks.sum(), (s1_big & snacks).sum())

    3 3 0

S1 has three orders of ₹400+ (O1001 ₹1,298, O1009 ₹420, O1012 ₹660) and there are three Snacks orders;
none is both, so the result should have exactly 3 + 3 − 0 = 6 rows.

**3. Filter, select, sort:**

    out = (df.loc[s1_big | snacks, ['order_id', 'store_id', 'product', 'amount']]
             .sort_values('amount', ascending=False))
    print(out)

       order_id store_id             product  amount
    0     O1001       S1    Basmati Rice 5kg    1298
    11    O1012       S1        Toor Dal 1kg     660
    8     O1009       S1  Filter Coffee 500g     420
    6     O1007       S3         Namkeen Mix     220
    10    O1011       S2        Masala Chips     200
    2     O1003       S1        Masala Chips     120

**4. Check against the count you predicted.** Six rows — matches step 2. O1003 is an S1 order under
₹400 that appears only because it is Snacks, which is what the manager asked for.

**What would have gone wrong:** writing \`df['store_id'] == 'S1' & df['amount'] >= 400 | snacks\` without
brackets raises an error; writing it with \`and\`/\`or\` raises the "truth value is ambiguous" error;
and forgetting the outer brackets round the S1 part would have changed the logic. Named masks make all
three mistakes hard to make.`,
    mcqs: [
      mcq('With the default 0, 1, 2… index, df.loc[2:4] and df.iloc[2:4] are run on the same 12-row DataFrame. How many rows does each return?', [
        ['loc returns 3 rows and iloc returns 2', true],
        ['Both return 2 rows, rows 2 and 3', false],
        ['Both return 3 rows, rows 2, 3 and 4', false],
        ['loc returns 2 rows and iloc returns 3', false],
      ], 'A loc slice includes its end label, so labels 2, 3 and 4 come back. iloc follows Python slicing and stops before position 4, giving positions 2 and 3.'),
      mcq('df[(df[\'payment\'] == \'UPI\') and (df[\'amount\'] > 500)] raises "The truth value of a Series is ambiguous". What is the correct line?', [
        ['df[(df[\'payment\'] == \'UPI\') & (df[\'amount\'] > 500)]', true],
        ['df[df[\'payment\'] == \'UPI\' and df[\'amount\'] > 500]', false],
        ['df[(df[\'payment\'] == \'UPI\'), (df[\'amount\'] > 500)]', false],
      ], 'Python\'s and needs a single True or False, which a Series cannot give. & combines the two masks row by row; the brackets are needed because & binds tighter than == and >.'),
      mcq('For ShopKart\'s orders, df[df[\'amount\'].between(300, 660)] is run, and one order is exactly ₹660. Is it in the result?', [
        ['Yes, between includes both ends by default', true],
        ['No, between excludes the upper end like a Python slice', false],
        ['No, between excludes both ends unless told otherwise', false],
        ['Only if the column is converted to float first', false],
      ], 'Series.between defaults to inclusive=\'both\', matching SQL\'s BETWEEN. Pass inclusive=\'left\', \'right\' or \'neither\' to change it.'),
    ],
    checkpoint: [
      mcq('On pandas 3.0, an analyst runs d[d[\'store_id\'] == \'S2\'][\'amount\'] = 0. What happens to d?', [
        ['Nothing changes in d, and pandas warns about chained assignment', true],
        ['S2\'s amounts become 0 in d, with no warning at all', false],
        ['Every amount in d becomes 0, not just S2\'s rows', false],
        ['The line raises a KeyError because of the double square brackets', false],
      ], 'Under Copy-on-Write the first selection is a new object, so the assignment changes only that temporary. Use d.loc[d[\'store_id\'] == \'S2\', \'amount\'] = 0. On pandas 2.x the same line leaves d unchanged with a SettingWithCopyWarning.'),
      mcq('ShopKart\'s orders have amounts above ₹600 in O1001, O1008, O1010 and O1012. What does this return?\n\n    limit = 600\n    df.query("amount > @limit")[\'order_id\'].tolist()', [
        ['[\'O1001\', \'O1008\', \'O1010\', \'O1012\']', true],
        ['An error, because query cannot read Python variables', false],
        ['Every order, because @limit is read as text', false],
      ], 'Inside query, @ refers to a variable in the surrounding Python code, so the condition is amount > 600 and the four large orders come back in index order.'),
      mcq('s1 = df[df[\'store_id\'] == \'S1\'] and then s1[\'gst\'] = s1[\'amount\'] * 0.05. Which statement is true on both pandas 2.x and 3.0?', [
        ['s1 gets a gst column and df does not', true],
        ['df and s1 both get the new gst column', false],
        ['Neither gets the column; the line fails', false],
        ['df gets the column and s1 does not', false],
      ], 'A boolean filter produces a new DataFrame, so the column is added to s1 only. 2.x also shows a SettingWithCopyWarning, which .copy() on the filter line removes; 3.0 shows nothing.'),
    ],
  },

  /* ── GROUPBY_AGG ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PANDAS_GROUPBY_AGG',
    notes: `\`groupby\` is SQL's GROUP BY and Excel's pivot table, in code. The idea is **split–apply–combine**:
split the rows into groups by a column, apply a calculation to each group, combine the results into one
table. ShopKart's 12 orders total ₹5,986; we add a month column for grouping:

    df = pd.read_csv('sales.csv', parse_dates=['order_date'])
    df['amount'] = df['qty'] * df['unit_price']
    df['month'] = df['order_date'].dt.strftime('%Y-%m')

## One column, one aggregate

    print(df.groupby('category')['amount'].sum().sort_values(ascending=False))

    category
    Grocery          3877
    Beverages         900
    Personal Care     669
    Snacks            540
    Name: amount, dtype: int64

Read it as SQL: \`SELECT category, SUM(amount) FROM df GROUP BY category ORDER BY 2 DESC\`. The result
is a Series whose index is the category. **Reconcile**: 3,877 + 900 + 669 + 540 = 5,986, the grand
total. Do that every time.

Common aggregates: \`sum, mean, median, min, max, count, size, nunique, first, last, std\`.

## Several keys

    print(df.groupby(['store_id', 'month'])['amount'].sum())

    store_id  month
    S1        2025-01    1418
              2025-02     790
              2025-03     660
    S2        2025-01     779
              2025-02     775
              2025-03     200
    S3        2025-01     495
              2025-02     220
              2025-03     649
    Name: amount, dtype: int64

Two keys give a two-level index (a **MultiIndex**). It is fine to read but awkward to work with; the
next two sections show how to get a flat table or a grid.

## Several aggregates: named aggregation

The clearest form names each output column and says which input and function make it:

    summary = df.groupby('store_id').agg(
        orders=('order_id', 'count'),
        revenue=('amount', 'sum'),
        avg_order=('amount', 'mean'),
        units=('qty', 'sum'),
    ).round(1)
    print(summary)

              orders  revenue  avg_order  units
    store_id
    S1             5     2868      573.6     15
    S2             4     1754      438.5     18
    S3             3     1364      454.7      8

That is \`SELECT store_id, COUNT(order_id) AS orders, SUM(amount) AS revenue, AVG(amount) AS
avg_order, SUM(qty) AS units ... GROUP BY store_id\`. A shorter form applies a list of functions to one
column: \`df.groupby('category')['amount'].agg(['sum', 'mean', 'max'])\`.

## Getting a flat table back

The group key becomes the index. For a normal table — to merge, save to CSV or chart — use
\`as_index=False\` or \`.reset_index()\`:

    print(df.groupby('store_id', as_index=False)['amount'].sum())

      store_id  amount
    0       S1    2868
    1       S2    1754
    2       S3    1364

## count vs size

- \`size()\` counts **rows** in each group, missing values included — \`COUNT(*)\`.
- \`count()\` counts **non-missing values** in a column — \`COUNT(column)\`.

If a Pune group has two rows and one has a missing amount, \`size\` says 2 and \`['amount'].count()\`
says 1. For "number of orders", use \`size()\` or count the ID column, which is never missing.

    print(df.groupby('payment').size())

    payment
    Card    3
    Cash    3
    UPI     6
    dtype: int64

## pivot_table: the Excel pivot

When you want one key down the side and another across the top, use **pivot_table**:

    pt = df.pivot_table(index='store_id', columns='month', values='amount',
                        aggfunc='sum', fill_value=0, margins=True, margins_name='Total')
    print(pt)

    month     2025-01  2025-02  2025-03  Total
    store_id
    S1           1418      790      660   2868
    S2            779      775      200   1754
    S3            495      220      649   1364
    Total        2692     1785     1509   5986

Rows = Excel's Rows area, columns = Columns area, values + aggfunc = Values area set to Sum,
\`margins=True\` = Grand Totals, \`fill_value=0\` = "for empty cells show 0". **Always pass aggfunc** —
the default is \`'mean'\`, the opposite of Excel's default Sum, and a pivot of means looks like a
pivot of totals.

## crosstab: counts in a grid

\`pd.crosstab(rows, columns)\` counts rows for each combination — handy for two category columns:

    print(pd.crosstab(df['store_id'], df['payment'], normalize='index').round(2))

    payment   Card  Cash   UPI
    store_id
    S1        0.40  0.20  0.40
    S2        0.25  0.25  0.50
    S3        0.00  0.33  0.67

\`normalize='index'\` turns each row into shares that add to 1 — "what share of each store's orders
were UPI?" (Excel: Show Values As % of Row Total.)

## Shares and per-row group values: transform

\`agg\` returns one row per group. \`transform\` returns a value **for every original row**, which is
what you need for "each order's share of its store's revenue":

    df['store_share'] = (df['amount'] / df.groupby('store_id')['amount'].transform('sum')).round(3)
    print(df[['order_id', 'store_id', 'amount', 'store_share']].head(4))

      order_id store_id  amount  store_share
    0    O1001       S1    1298        0.453
    1    O1002       S2     299        0.170
    2    O1003       S1     120        0.042
    3    O1004       S3     495        0.363

(SQL does this with a window function: \`amount / SUM(amount) OVER (PARTITION BY store_id)\`.) For a
category's share of the whole: \`g = df.groupby('category')['amount'].sum(); (g / g.sum() * 100).round(1)\`
gives Grocery 64.8%, Beverages 15.0%, Personal Care 11.2%, Snacks 9.0%.

## Filtering groups: HAVING

To keep groups that pass a test, aggregate and then filter the result — SQL's HAVING:

    rev = df.groupby('store_id')['amount'].sum()
    print(rev[rev > 2000])          # S1 only (2868)

## Mistakes to avoid

- Averaging an average: the mean of three stores' average orders is not the chain's average order.
  Recompute from rows: total amount ÷ total orders.
- Grouping on a text column with "Pune" and "pune " splits one city into two groups — clean first.
- Rows with a missing key are **dropped** by groupby by default (\`dropna=True\`), so the groups no
  longer add up to the total. The debugging unit shows this; \`dropna=False\` keeps them.`,
    workedExample: `**Brief from ShopKart's category head:** "For each category: how many orders, the revenue, the
average order value, and its share of total revenue — largest first. And tell me which payment method
dominates Grocery."

**1. Restate it.** One row per category; columns orders (count of order_id), revenue (sum of amount),
aov (revenue ÷ orders), share (% of the ₹5,986 total). Sorted by revenue descending.

**2. Aggregate with named aggregation:**

    cat = df.groupby('category').agg(orders=('order_id', 'count'),
                                     revenue=('amount', 'sum'))
    cat['aov'] = (cat['revenue'] / cat['orders']).round(1)
    cat['share_pct'] = (cat['revenue'] / cat['revenue'].sum() * 100).round(1)
    print(cat.sort_values('revenue', ascending=False))

                   orders  revenue    aov  share_pct
    category
    Grocery             5     3877  775.4       64.8
    Beverages           2      900  450.0       15.0
    Personal Care       2      669  334.5       11.2
    Snacks              3      540  180.0        9.0

AOV is computed as revenue ÷ orders from the totals — the same as \`('amount', 'mean')\` here, because
each row is one order. (If rows were order *lines*, the mean of lines would not be the AOV.)

**3. Reconcile.** Orders 5 + 2 + 2 + 3 = 12 rows; revenue adds to 5,986; shares add to 100.0. ✓

**4. The payment question** is a count of two category columns, so crosstab:

    print(pd.crosstab(df['category'], df['payment']))

    payment        Card  Cash  UPI
    category
    Beverages         1     0    1
    Grocery           0     0    5
    Personal Care     2     0    0
    Snacks            0     3    0

All five Grocery orders were UPI.

**5. Write the finding with its numbers.** "Grocery is 64.8% of revenue (₹3,877 from 5 orders, AOV
₹775) and every Grocery order was paid by UPI; Snacks has the most orders after Grocery but the lowest
AOV (₹180)." Then add the caveat a careful analyst always adds: *12 orders over three months is far
too few to call a pattern — rerun on the full year before acting.*`,
    mcqs: [
      mcq('A DataFrame has two rows for Pune, one with amount 100 and one with a missing amount. What do df.groupby(\'city\').size() and df.groupby(\'city\')[\'amount\'].count() report for Pune?', [
        ['2 and 1', true],
        ['1 and 2', false],
        ['2 and 2', false],
        ['1 and 1', false],
      ], 'size counts rows, like COUNT(*), so Pune has 2. count counts non-missing values in the column, like COUNT(amount), so it is 1.'),
      mcq('An analyst needs the store totals as an ordinary two-column table to merge with targets. Which line gives store_id as a column rather than the index?', [
        ['df.groupby(\'store_id\', as_index=False)[\'amount\'].sum()', true],
        ['df.groupby(\'store_id\')[\'amount\'].sum(as_index=False)', false],
        ['df.groupby(\'store_id\')[[\'amount\']].sum()', false],
      ], 'as_index=False belongs to groupby and keeps the key as a column; .reset_index() after the sum does the same. Double brackets give a DataFrame but the key is still the index.'),
      mcq('df.groupby(\'store_id\')[\'amount\'].transform(\'sum\') is run on ShopKart\'s 12 orders from 3 stores. How many values does it return?', [
        ['12, each row getting its own store\'s total', true],
        ['3, one total for each store', false],
        ['1, the grand total of all stores', false],
        ['4, three store totals plus a grand total', false],
      ], 'transform returns a result aligned to the original rows, so every order carries its store\'s total — exactly what a share-of-store calculation needs. agg would return 3 values.'),
    ],
    checkpoint: [
      mcq('In the store × month pivot_table of ShopKart\'s orders (sum of amount, margins=True), which value sits in the Total row under 2025-02?', [
        ['1785', true],
        ['2868', false],
        ['790', false],
        ['5986', false],
      ], 'The Total row sums each month across stores: 790 + 775 + 220 = 1,785. 2,868 is S1\'s row total, 790 S1\'s February cell, and 5,986 the grand total.'),
      mcq('df.pivot_table(index=\'category\', values=\'amount\') is run with no aggfunc on ShopKart\'s orders. For Snacks (₹120, ₹220 and ₹200), what value appears?', [
        ['180.0, the mean', true],
        ['540, the sum', false],
        ['3, the count', false],
      ], 'pivot_table\'s default aggfunc is mean, unlike Excel\'s default Sum. (120 + 220 + 200) / 3 = 180. Always pass aggfunc to say what you mean.'),
      mcq('What are the column names of the result?\n\n    df.groupby(\'category\').agg(orders=(\'order_id\', \'count\'), revenue=(\'amount\', \'sum\'))', [
        ['orders and revenue, with category as the index', true],
        ['order_id and amount, with category as the index', false],
        ['category, orders and revenue as three columns', false],
        ['count and sum, under a second header level', false],
      ], 'Named aggregation uses the keyword names as output columns. The group key is the index unless as_index=False or reset_index() is used.'),
    ],
  },

  /* ── MERGE_RESHAPE ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PANDAS_MERGE_RESHAPE',
    notes: `Data arrives in pieces: sales in one file, stores in another, targets in a spreadsheet. **merge** joins
them on a key — it *is* a SQL JOIN — and **concat** stacks them. Then **melt** and **pivot** turn a
table between long and wide shape. The single most important habit: **count the rows before and after
every merge.**

## merge = JOIN

    stores = pd.read_csv('stores.csv')     # S1–S4, one row per store
    m = df.merge(stores, on='store_id', how='left')
    print(len(df), len(m))
    print(m[['order_id', 'store_id', 'city', 'amount']].head(3))

    12 12
      order_id store_id       city  amount
    0    O1001       S1  Hyderabad    1298
    1    O1002       S2  Bengaluru     299
    2    O1003       S1  Hyderabad     120

12 rows before, 12 after: each order found exactly one store. Now \`m.groupby('city')['amount'].sum()\`
gives Bengaluru 1,754, Hyderabad 2,868, Mumbai 1,364.

| how= | SQL | Keeps |
|---|---|---|
| \`'inner'\` (default) | INNER JOIN | rows whose key is in both |
| \`'left'\` | LEFT JOIN | every left row; NaN where the right has no match |
| \`'right'\` | RIGHT JOIN | every right row |
| \`'outer'\` | FULL OUTER JOIN | everything from both |

**Which table is on the left matters.** "Every store, with its sales — even stores with none" puts
stores on the left:

    r = stores.merge(df.groupby('store_id', as_index=False)['amount'].sum(),
                     on='store_id', how='left')
    print(r)

      store_id   store_name       city region  amount
    0       S1     Ameerpet  Hyderabad  South  2868.0
    1       S2  Koramangala  Bengaluru  South  1754.0
    2       S3      Andheri     Mumbai   West  1364.0
    3       S4    Salt Lake    Kolkata   East     NaN

S4 has no sales, so its amount is NaN (and the column became float to hold it). An inner join would
have silently dropped Salt Lake from the report.

## The merge that multiplies rows

If the right table has **two rows for one key**, every matching left row is repeated. Suppose the
stores file has an old duplicate S1 row ("Ameerpet (old)"):

    m2 = df.merge(stores_dup, on='store_id', how='left')
    print(len(m2), m2['amount'].sum())

    17 8854

Five S1 orders became ten, and revenue jumped from ₹5,986 to ₹8,854 — S1's ₹2,868 counted twice. No
error, no warning. Two defences:

1. **Check the key is unique** on the lookup side: \`stores['store_id'].duplicated().sum()\` should be 0.
2. **Tell merge what you expect** with \`validate\`:

        df.merge(stores_dup, on='store_id', how='left', validate='many_to_one')

        MergeError: Merge keys are not unique in right dataset; not a many-to-one merge

   Many orders to one store is \`'many_to_one'\` (\`'m:1'\`); \`'one_to_one'\` and \`'one_to_many'\` exist too.
   (pandas 3.0 also lists the duplicated keys in the message.)

## Seeing what matched: indicator

    o = df.merge(stores, on='store_id', how='outer', indicator=True)
    print(o['_merge'].value_counts())

    _merge
    both          12
    right_only     1
    left_only      0

\`indicator=True\` adds a \`_merge\` column saying where each row came from. right_only = S4 (a store with
no orders); left_only would be orders whose store code is not in the master — usually a typo or a new
store someone forgot to add. This is the pandas version of the "unmatched rows" check you did in SQL.

## Keys with different names

    t = pd.DataFrame({'code': ['S1', 'S2', 'S3'], 'q1_target': [3000, 2000, 1500]})
    st = df.groupby('store_id', as_index=False)['amount'].sum()
    c = st.merge(t, left_on='store_id', right_on='code').drop(columns='code')
    c['vs_target_pct'] = (c['amount'] / c['q1_target'] * 100).round(1)
    print(c)

      store_id  amount  q1_target  vs_target_pct
    0       S1    2868       3000           95.6
    1       S2    1754       2000           87.7
    2       S3    1364       1500           90.9

Before merging, make sure the keys have the same type and spelling: "S1" never matches "s1 ", and a
code read as the number 7 never matches the text "007".

## concat: stacking files

April's orders arrive in a second file with the same columns. Stack them (SQL's UNION ALL):

    allo = pd.concat([jan_mar, apr], ignore_index=True)
    print(allo.shape)

    (13, 8)

\`ignore_index=True\` renumbers the rows 0–12. Without it, each piece keeps its own index and you get
duplicate labels (two rows labelled 0), which breaks \`loc\` lookups later. Check that the columns match
before stacking — a column spelled differently in one file becomes two half-empty columns.

## Long and wide: melt and pivot

A **wide** table has one column per month (how people like to read). A **long** table has one row per
store per month (how pandas, SQL and charting libraries like to work).

    wide = df.pivot_table(index='store_id', columns='month', values='amount',
                          aggfunc='sum').reset_index()
    print(wide)

    month store_id  2025-01  2025-02  2025-03
    0           S1     1418      790      660
    1           S2      779      775      200
    2           S3      495      220      649

**melt** goes wide → long (Excel users: "unpivot" in Power Query):

    long = wide.melt(id_vars='store_id', var_name='month', value_name='revenue')
    print(long.head(4))
    print(long.shape)

      store_id    month  revenue
    0       S1  2025-01     1418
    1       S2  2025-01      779
    2       S3  2025-01      495
    3       S1  2025-02      790
    (9, 3)

3 stores × 3 months = 9 rows. **pivot** goes back long → wide, and needs each (index, column) pair to
appear only once:

    print(long.pivot(index='store_id', columns='month', values='revenue'))

    month     2025-01  2025-02  2025-03
    store_id
    S1           1418      790      660
    S2            779      775      200
    S3            495      220      649

On the raw orders, \`df.pivot(index='store_id', columns='month', values='amount')\` fails with
*ValueError: Index contains duplicate entries, cannot reshape* — S1 has two January orders. \`pivot\`
only reshapes; \`pivot_table\` reshapes **and aggregates**, so use pivot_table on raw rows.

## The merge checklist

1. Know the **grain** of both tables (one row per what?).
2. Check the lookup key is **unique**: \`.duplicated().sum()\`.
3. Same key **type and spelling** on both sides.
4. Choose \`how\` by asking which rows must survive.
5. Pass \`validate\`, and use \`indicator=True\` when you need to see what did not match.
6. **Compare row counts and a total** before and after.`,
    workedExample: `**Brief:** "Q1 sales against target for every store — including Salt Lake — with region, and a flag
for stores under 90% of target." Targets come from finance as a wide sheet with a column per month:

    targets = pd.DataFrame({'store_id': ['S1', 'S2', 'S3', 'S4'],
                            '2025-01': [1200, 800, 500, 0],
                            '2025-02': [1000, 700, 500, 0],
                            '2025-03': [800, 500, 500, 0]})

**1. Grain.** Orders: one row per order. stores: one per store. targets: one per store, months as
columns. The answer: one row per store.

**2. Reshape targets long, then total them** (the months are columns, so melt first):

    t_long = targets.melt(id_vars='store_id', var_name='month', value_name='target')
    q1_t = t_long.groupby('store_id', as_index=False)['target'].sum()
    print(q1_t)

      store_id  target
    0       S1    3000
    1       S2    2000
    2       S3    1500
    3       S4       0

**3. Sales per store, then join everything onto the store master** — stores on the left, so S4
survives:

    sales = df.groupby('store_id', as_index=False)['amount'].sum()
    rep = (stores.merge(sales, on='store_id', how='left', validate='one_to_one')
                 .merge(q1_t, on='store_id', how='left', validate='one_to_one'))
    rep['amount'] = rep['amount'].fillna(0)
    print(len(stores), len(rep))

    4 4

**4. The percentage and the flag**, guarding against a zero target:

    rep['pct'] = (rep['amount'] / rep['target'].where(rep['target'] > 0) * 100).round(1)
    rep['under_90'] = rep['pct'] < 90
    print(rep[['store_id', 'store_name', 'region', 'amount', 'target', 'pct', 'under_90']])

      store_id   store_name region  amount  target   pct  under_90
    0       S1     Ameerpet  South  2868.0    3000  95.6     False
    1       S2  Koramangala  South  1754.0    2000  87.7      True
    2       S3      Andheri   West  1364.0    1500  90.9     False
    3       S4    Salt Lake   East     0.0       0   NaN     False

\`.where(target > 0)\` turns the zero target into NaN, so Salt Lake gets NaN rather than a
division-by-zero infinity; NaN < 90 is False, so it is not flagged — correct, since it had no target.

**5. Reconcile.** 4 stores in, 4 rows out; amounts add to 5,986; targets add to 6,500. Koramangala is
the only store under 90% (87.7%). Salt Lake should be reported as "opened in April — no Q1 target",
not left as a blank.`,
    mcqs: [
      mcq('ShopKart\'s 12 orders are merged how=\'left\' with a stores table where S1 appears twice. S1 has 5 orders. How many rows does the result have?', [
        ['17', true],
        ['12', false],
        ['13', false],
        ['10', false],
      ], 'Each of S1\'s 5 orders matches both S1 rows, giving 10 instead of 5; the other 7 orders match once. 7 + 10 = 17 — and revenue is overstated by S1\'s total.'),
      mcq('The report must list every store in stores.csv, including Salt Lake, which has no orders. Which merge does that?', [
        ['stores.merge(sales, on=\'store_id\', how=\'left\')', true],
        ['sales.merge(stores, on=\'store_id\', how=\'left\')', false],
        ['stores.merge(sales, on=\'store_id\', how=\'inner\')', false],
      ], 'A left join keeps every row of the left table, so stores must be on the left. With sales on the left, or an inner join, a store with no sales has nothing to match and disappears.'),
      mcq('A wide table has columns store_id, 2025-01, 2025-02 and 2025-03 for three stores. After .melt(id_vars=\'store_id\', var_name=\'month\', value_name=\'revenue\'), what is its shape?', [
        ['(9, 3)', true],
        ['(3, 4)', false],
        ['(3, 9)', false],
        ['(12, 3)', false],
      ], 'melt makes one row per store per month column: 3 × 3 = 9 rows, with columns store_id, month and revenue.'),
    ],
    checkpoint: [
      mcq('df.merge(stores_dup, on=\'store_id\', how=\'left\', validate=\'many_to_one\') is run, and stores_dup has two rows for S1. What happens?', [
        ['A MergeError is raised because the right keys are not unique', true],
        ['The duplicate S1 row is dropped and the merge succeeds', false],
        ['The merge succeeds and adds a column flagging the duplicates', false],
      ], 'validate checks the relationship before joining. many_to_one requires each key to appear once on the right; finding S1 twice stops the merge instead of silently multiplying rows.'),
      mcq('ShopKart\'s orders use stores S1–S3, and stores.csv lists S1–S4. With df.merge(stores, on=\'store_id\', how=\'outer\', indicator=True), how many rows have _merge equal to right_only?', [
        ['1', true],
        ['0', false],
        ['4', false],
        ['13', false],
      ], 'right_only rows exist only in the right table. S4 has no orders, so it appears once with NaN order columns; the other 12 rows are both.'),
      mcq('What does this print, where df has 12 rows labelled 0–11?\n\n    pd.concat([df.head(3), df.tail(2)]).index.tolist()', [
        ['[0, 1, 2, 10, 11]', true],
        ['[0, 1, 2, 3, 4]', false],
        ['[0, 1, 2, 0, 1]', false],
      ], 'concat keeps each piece\'s own labels unless ignore_index=True. head(3) has 0–2 and tail(2) has 10 and 11; with ignore_index=True they would become 0–4.'),
    ],
  },

  /* ── DATES_TIME_SERIES ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PANDAS_DATES_TIME_SERIES',
    notes: `Nearly every business question has a time in it: this month vs last, the weekly trend, the busiest
weekday. pandas handles all of it — once the dates are real dates. Text that *looks* like a date sorts
alphabetically, cannot be grouped by month, and cannot be subtracted.

## to_datetime, with a format

Indian files write day first. Tell pandas so — explicitly:

    raw = pd.Series(['03/04/2025', '15/04/2025', '31-04-2025', ''])
    print(pd.to_datetime(raw, format='%d/%m/%Y', errors='coerce'))

    0   2025-04-03
    1   2025-04-15
    2          NaT
    3          NaT
    dtype: datetime64[us]

- \`format='%d/%m/%Y'\` says exactly how to read it: day, month, 4-digit year. \`%d-%m-%Y\` for dashes,
  \`%d-%b-%Y\` for 03-Apr-2025, \`%Y-%m-%d\` for ISO dates.
- \`errors='coerce'\` turns anything that does not fit — 31 April does not exist, the second date uses
  dashes, the blank — into **NaT** ("not a time", the date version of NaN) instead of stopping. Then
  **count the NaTs**: \`.isna().sum()\`. Coercing without counting hides lost rows.

What happens without a format? pandas guesses from the **first** value and applies that guess to the
whole column:

    pd.to_datetime(pd.Series(['03/04/2025', '15/04/2025']))

    ValueError: time data "15/04/2025" doesn't match format "%m/%d/%Y"

It read 03/04 as March 4 (month first), so 15/04 — month 15 — fails. Worse is a column where every day
is 12 or less: no error at all, and every date is silently wrong. \`dayfirst=True\` fixes the guess
(\`pd.to_datetime(s, dayfirst=True)\` gives 3 April), but an explicit \`format\` is safer.

(**Version note:** pandas 3.0 stores parsed dates as \`datetime64[us]\`, microsecond resolution;
pandas 2.x uses \`datetime64[ns]\`. The values and everything below behave the same.)

## The .dt accessor

Once a column is datetime, \`.dt\` gives its parts — like Excel's YEAR(), MONTH(), TEXT(d,"dddd"):

    d = df['order_date']
    print(d.dt.year.iloc[0], d.dt.month.iloc[0], d.dt.day_name().iloc[:3].tolist())

    2025 1 ['Friday', 'Friday', 'Sunday']

Others: \`.dt.day\`, \`.dt.quarter\`, \`.dt.hour\`, \`.dt.dayofweek\` (Monday = 0), \`.dt.date\`,
\`.dt.strftime('%b %Y')\` for labels, and \`.dt.to_period('M')\` for a proper month:

    print(d.dt.to_period('M').iloc[:2])

    0    2025-01
    1    2025-01
    Name: order_date, dtype: period[M]

Group by \`d.dt.to_period('M')\` rather than by month *names*: "Apr", "Feb", "Jan", "Mar" sort
alphabetically, and month numbers alone merge January 2024 with January 2025. A period knows its year
and sorts in time order.

Weekday pattern:

    df['weekday'] = d.dt.day_name()
    print(df.groupby('weekday')['amount'].sum().sort_values(ascending=False))

    weekday
    Friday      2792
    Sunday      1665
    Saturday    1529

(Only three weekdays appear in 12 orders — with real data, also divide by the *number of Fridays* in
the period before saying "Fridays sell more".)

Date arithmetic works directly: \`(pd.Timestamp('2025-03-31') - d).dt.days\` gives days since each
order (87, 87, 85…), and \`d.max() - d.min()\` is \`71 days\`. Filter a period with plain comparisons:

    df.loc[(d >= '2025-02-01') & (d < '2025-03-01'), 'order_id'].tolist()

    ['O1006', 'O1007', 'O1008', 'O1009']

Use **"≥ first day and < first day of next month"** — it works whatever the time of day is.

## resample: grouping by calendar period

With the date as the index, \`resample\` groups by time buckets:

    ts = df.set_index('order_date')['amount']
    print(ts.resample('MS').sum())

    order_date
    2025-01-01    2692
    2025-02-01    1785
    2025-03-01    1509
    Freq: MS, Name: amount, dtype: int64

\`'MS'\` labels each month by its start; \`'ME'\` by its end (2025-01-31…); \`'W'\` weeks ending Sunday;
\`'D'\` days; \`'QS'\` quarters.

**Version note:** older tutorials write \`resample('M')\`. pandas 2.2 still accepts it with a
FutureWarning telling you to use \`'ME'\`; **pandas 3.0 rejects it** — *ValueError: Invalid frequency:
M … 'M' is no longer supported for offsets. Please use 'ME' instead.* Write \`'ME'\` or \`'MS'\` and the
code runs on both.

One real difference from groupby: resample creates **every period in the range, even empty ones**:

    print(ts.resample('W').sum().head(4))

    order_date
    2025-01-05    1717
    2025-01-12     495
    2025-01-19     480
    2025-01-26       0
    Freq: W-SUN, Name: amount, dtype: int64

The week ending 26 January had no orders and shows 0 — which is what a trend chart needs. A groupby on
week numbers would simply leave that week out and the chart would join two points across the gap.

## Period-over-period change

    mon = ts.resample('MS').sum()
    print(pd.DataFrame({'rev': mon, 'prev': mon.shift(1), 'change': mon.diff()}))
    print(mon.pct_change().round(3))

                 rev    prev  change
    order_date
    2025-01-01  2692     NaN     NaN
    2025-02-01  1785  2692.0  -907.0
    2025-03-01  1509  1785.0  -276.0

    order_date
    2025-01-01      NaN
    2025-02-01   -0.337
    2025-03-01   -0.155

\`shift(1)\` moves each value down one row, so each month sits next to the previous one (SQL's
\`LAG()\`). \`diff()\` is the change in ₹; \`pct_change()\` the change as a fraction — February is 33.7%
below January. The first month has nothing to compare with, so it is NaN, not 0.

## Rolling windows

A 10-day revenue series for one store, with a two-day sale on 6–7 March:

    daily = pd.DataFrame({'day': pd.date_range('2025-03-01', periods=10, freq='D'),
                          'revenue': [42000, 45500, 39800, 41200, 44100,
                                      61500, 66800, 43000, 40500, 42900]}).set_index('day')
    daily['avg_3d'] = daily['revenue'].rolling(3).mean().round(0)
    daily['vs_yesterday_pct'] = (daily['revenue'].pct_change() * 100).round(1)
    print(daily)

                revenue   avg_3d  vs_yesterday_pct
    day
    2025-03-01    42000      NaN               NaN
    2025-03-02    45500      NaN               8.3
    2025-03-03    39800  42433.0             -12.5
    2025-03-04    41200  42167.0               3.5
    2025-03-05    44100  41700.0               7.0
    2025-03-06    61500  48933.0              39.5
    2025-03-07    66800  57467.0               8.6
    2025-03-08    43000  57100.0             -35.6
    2025-03-09    40500  50100.0              -5.8
    2025-03-10    42900  42133.0               5.9

\`rolling(3).mean()\` averages each day with the two before it, smoothing noise. The first two rows are
NaN because a 3-row window is not full yet (\`min_periods=1\` would average what is there). Notice the
sale lifts the 3-day average for three days *after* it starts — a smoothed line lags, so do not read
the 8 March average as "8 March was strong".

**Missing days break row-count windows.** \`rolling(3)\` means "3 rows", not "3 days". If 4 March is
missing from the data, the window for 5 March reaches back to 2 March. A time-based window counts
calendar days instead:

    gap = daily.drop(pd.Timestamp('2025-03-04'))
    gap['revenue'].rolling(3).mean().loc['2025-03-05']      # 43133.3 — 2, 3 and 5 March
    gap['revenue'].rolling('3D').mean().loc['2025-03-05']   # 41950.0 — 3 and 5 March only

Or fill the calendar first with \`gap.asfreq('D')\`, which puts the missing day back as NaN so you can
see it.

## Checklist for time questions

1. Parse with an explicit \`format\`; count NaT afterwards.
2. Group by \`to_period('M')\` or resample — never by month names or month numbers alone.
3. Is the last period complete? A half month always "drops".
4. Use \`'ME'\`/\`'MS'\`, not \`'M'\`, so the code runs on pandas 2.2 and 3.0.
5. Before a rolling window, check for missing days.`,
    mcqs: [
      mcq('pd.to_datetime(pd.Series([\'31-04-2025\']), format=\'%d-%m-%Y\', errors=\'coerce\') is run. What comes back?', [
        ['NaT, because 31 April does not exist', true],
        ['2025-05-01, rolled over to the next valid day', false],
        ['2025-04-30, the last valid day of that month', false],
        ['A ValueError, because errors=\'coerce\' cannot apply', false],
      ], 'errors=\'coerce\' turns any value that cannot be parsed — including an impossible date — into NaT instead of raising. Count NaTs afterwards so lost rows are not hidden.'),
      mcq('A notebook written for pandas 1.x calls ts.resample(\'M\').sum(). What happens when it is run on pandas 3.0?', [
        ['It raises a ValueError asking for \'ME\' instead', true],
        ['It works exactly as before, with no message', false],
        ['It groups by minute, since M now means minutes', false],
      ], 'pandas 2.2 deprecated \'M\' for month-end with a FutureWarning, and 3.0 removed it. \'ME\' (month end) or \'MS\' (month start) works on 2.2 and 3.0. Minutes are \'min\'.'),
      mcq('daily[\'revenue\'].rolling(3).mean() is computed on ten days of revenue. Which rows of the result are NaN?', [
        ['The first two, where the window is not yet full', true],
        ['Only the first row, which has no previous day', false],
        ['The last two, where the window runs past the data', false],
        ['None, because rolling always fills partial windows', false],
      ], 'A 3-row window needs 3 values; rows 1 and 2 have fewer, so they are NaN unless min_periods is lowered. Rolling windows look backwards, not forwards.'),
    ],
    checkpoint: [
      mcq('Monthly revenue is ₹2,692 in January and ₹1,785 in February. What does mon.pct_change() show for February, rounded to three places?', [
        ['-0.337', true],
        ['-907', false],
        ['0.663', false],
        ['0.508', false],
      ], 'pct_change is (1,785 − 2,692) / 2,692 = −0.337, a 33.7% fall. −907 is diff(); 0.663 is the ratio February/January; 0.508 is January\'s rise measured from February.'),
      mcq('A daily series is missing 4 March. For 5 March, rolling(3) averages 2, 3 and 5 March. Which window averages only 3 and 5 March?', [
        ['rolling(\'3D\')', true],
        ['rolling(3, min_periods=1)', false],
        ['rolling(2)', false],
        ['rolling(3, center=True)', false],
      ], 'A string window like \'3D\' covers the last three calendar days (3–5 March), so only the dates present in that span are averaged. Integer windows count rows, whatever their dates.'),
      mcq('ShopKart had no orders in the week ending 26 January 2025. What does ts.resample(\'W\').sum() show for that week?', [
        ['A row for 2025-01-26 with 0', true],
        ['No row; the week is skipped', false],
        ['A row for 2025-01-26 with NaN', false],
      ], 'resample creates every period between the first and last date and sums an empty one to 0, so a trend chart shows the gap honestly. A groupby on week numbers would leave the week out.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PANDAS_DEBUGGING',
    notes: `pandas bugs come in two kinds. Some raise an error — annoying, but they tell you where to look. The
dangerous ones **give a believable number** that is wrong. Debug by **symptom → cause → fix**, and
lean on four checks that catch most of them:

- \`df.shape\` before and after every step (filter, merge, dropna, concat).
- \`df.dtypes\` / \`df.info()\` before any arithmetic.
- \`df.isna().sum()\` after every conversion.
- **Reconcile** every breakdown to a grand total.

## 1. KeyError for a column you can see

- **Symptom:** \`df['revenue']\` raises \`KeyError: 'revenue'\`, but \`df.head()\` clearly shows a revenue
  column.
- **Cause:** the header in the file is \`"revenue "\` with a trailing space (or a hidden BOM character,
  or different case). Print the real names: \`df.columns.tolist()\` shows \`['store_id', 'revenue ']\`.
- **Fix:** clean the names right after reading:
  \`df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')\`. For a BOM, read with
  \`encoding='utf-8-sig'\`.

## 2. The merge that tripled the rows

- **Symptom:** after \`orders.merge(products, on='sku')\`, 48,210 order lines became 1,44,630, and
  revenue tripled.
- **Cause:** the product master has **three rows per SKU** (one per price revision), so every line
  matched three times. merge never complains.
- **Fix:** check \`products['sku'].duplicated().sum()\` before merging; keep one row per SKU (the latest
  price, say — decide deliberately); merge with \`validate='many_to_one'\` so it fails loudly next
  time; and compare \`len()\` and the revenue total before and after.

## 3. A mean that ignored half the data

- **Symptom:** average order value comes out ₹736.67, but a glance at the file says it should be over
  ₹1,000.
- **Cause:** amounts were text like "1,299". \`pd.to_numeric(s, errors='coerce')\` turned every value
  with a comma into NaN, and \`.mean()\` **skips NaN silently**:

      amt = pd.Series(['850', '1,299', '640', '2,150', '1,050', '720'])
      n = pd.to_numeric(amt, errors='coerce')
      print(n.tolist(), n.mean(), n.count())

      [850.0, nan, 640.0, nan, nan, 720.0] 736.6666666666666 3

  Only 3 of 6 values were averaged — and all the large ones were the ones lost.
- **Fix:** remove the commas first: \`pd.to_numeric(amt.str.replace(',', '', regex=False))\` gives a
  mean of 1118.17 over all six. After any coerce, compare \`.count()\` with \`len()\`.

## 4. Dates parsed month-first

- **Symptom:** a monthly chart shows sales in months the store was closed, and "03/04/2025" appears as
  4 March.
- **Cause:** \`pd.to_datetime\` guessed month-first from the first value. With values like 15/04 later
  in the column you get a ValueError; if every day happens to be ≤ 12, you get **no error and wrong
  dates**.
- **Fix:** always give the format: \`pd.to_datetime(s, format='%d/%m/%Y')\`. Spot-check: the min and max
  date should match the period you expect.

## 5. An assignment that changed nothing

- **Symptom:** \`df[df['city'] == 'Pune']['discount'] = 0\` runs, but Pune's discounts are unchanged.
- **Cause:** chained indexing — the first \`[ ]\` makes a new object and the assignment changes that.
  pandas 2.x shows a SettingWithCopyWarning; pandas 3.0 (Copy-on-Write) shows a ChainedAssignmentError
  warning and *never* changes df this way.
- **Fix:** one loc call: \`df.loc[df['city'] == 'Pune', 'discount'] = 0\`. For a filtered table you mean
  to change, take \`.copy()\`.

## 6. Group totals that do not add up to the total

- **Symptom:** revenue by city adds up to ₹1,200; the total revenue is ₹2,000.

      s.groupby('city')['amount'].sum()       # Delhi 400, Pune 800
      s['amount'].sum()                       # 2000

- **Cause:** rows with a **missing city** are dropped by groupby by default (\`dropna=True\`).
- **Fix:** \`s.groupby('city', dropna=False)['amount'].sum()\` shows a NaN group of ₹800 — then decide
  whether to fill it as "Unknown" or fix the source. Always reconcile groups to the total.

## 7. Revenue column full of 2222222…

- **Symptom:** \`df['qty'] * df['unit_price']\` gives values like "2222222222…", and
  \`df['qty'].sum()\` returns '216' instead of 9.
- **Cause:** qty is **text** ('2', '1', '6'). Text × number repeats the text, and summing text joins it.
  One stray value in the file ("2 pcs") is enough to make the whole column text.
- **Fix:** \`df['qty'] = pd.to_numeric(df['qty'], errors='coerce')\`, then find what became NaN and fix
  it. Check dtypes before arithmetic.

## 8. Months in the wrong order

- **Symptom:** a monthly table reads Apr, Feb, Jan, Mar.
- **Cause:** grouping by \`dt.strftime('%b')\` gives text, which sorts alphabetically.
- **Fix:** group by \`dt.to_period('M')\` (sorts in time, keeps the year), and format labels only at the
  end, for display.

## A debugging routine

1. Reproduce on a small sample (\`df.head(20)\`, or a hand-made 5-row DataFrame).
2. Print shape, dtypes and \`isna().sum()\` at each step until the number goes wrong.
3. Read the **whole** error message from the bottom up — the last line says what, the line above it
   says where.
4. Fix the cause, then add a check (an \`assert\`, a \`validate=\`, a row count) so it cannot come back
   silently.`,
    mcqs: [
      mcq('df[\'revenue\'] raises KeyError: \'revenue\', and df.columns.tolist() shows [\'store_id\', \'revenue \']. What is the best fix?', [
        ['df.columns = df.columns.str.strip() straight after reading', true],
        ['Use df.revenue, which ignores any spaces in column names', false],
        ['Re-read the file with header=None so pandas renames columns', false],
        ['Wrap the name in double quotes: df["revenue"]', false],
      ], 'The header has a trailing space, so \'revenue\' is a different name. Stripping every column name once after reading fixes this and any similar header in the file.'),
      mcq('Six order amounts include "1,299", "2,150" and "1,050". pd.to_numeric(amt, errors=\'coerce\').mean() returns ₹736.67. What went wrong?', [
        ['The three values with commas became NaN and were skipped', true],
        ['The mean was computed on the text values and then rounded down', false],
        ['to_numeric divided each value containing a comma by 1,000', false],
      ], 'Coerce turns unparseable text into NaN, and mean ignores NaN — so only 850, 640 and 720 were averaged. Remove the commas first, and compare count() with len() after any coerce.'),
      mcq('Revenue by city sums to ₹1,200 but total revenue is ₹2,000, and the city column has some missing values. Why?', [
        ['groupby drops rows with a missing key by default', true],
        ['sum() skips any city that has fewer than two rows', false],
        ['The missing cities were counted as zero revenue', false],
        ['groupby only sums the first 1,000 rows of a DataFrame', false],
      ], 'groupby\'s dropna=True default leaves out rows whose key is NaN, here ₹800 of revenue. dropna=False shows them as a NaN group; then fill or fix the missing cities.'),
      mcq('A monthly summary grouped by df[\'date\'].dt.strftime(\'%b\') prints Apr, Feb, Jan, Mar. Which change gives time order and keeps the year?', [
        ['Group by df[\'date\'].dt.to_period(\'M\')', true],
        ['Group by df[\'date\'].dt.month_name()', false],
        ['Sort the result with sort_values(ascending=True)', false],
      ], 'Month abbreviations are text and sort alphabetically; month_name() has the same problem. A monthly period sorts in calendar order and keeps 2024 and 2025 apart. sort_values sorts by revenue, not month.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PANDAS_PRACTICE',
    notes: `Six exercises on one small dataset from **QuickBite**, a food-delivery app in Hyderabad. Save the two
files below, load them with pandas, and write each answer as code — never type a number into a cell.
Answers (all produced by running the code) are at the end; try first.

**qb_orders.csv**

    order_id,order_time,area,restaurant_id,cuisine,amount,delivery_min,status
    Q501,2025-06-06 12:40,Gachibowli,R1,Biryani,520,34,DELIVERED
    Q502,2025-06-06 13:05,Madhapur,R2,South Indian,240,22,DELIVERED
    Q503,2025-06-06 20:15,Kukatpally,R3,Chinese,410,48,DELIVERED
    Q504,2025-06-06 21:30,Gachibowli,R1,Biryani,780,41,DELIVERED
    Q505,2025-06-07 13:10,Madhapur,R4,North Indian,365,0,CANCELLED
    Q506,2025-06-07 19:50,Gachibowli,R3,Chinese,455,37,DELIVERED
    Q507,2025-06-07 20:45,Kukatpally,R1,Biryani,640,52,DELIVERED
    Q508,2025-06-07 21:20,Madhapur,R4,North Indian,590,29,DELIVERED
    Q509,2025-06-08 12:55,Kukatpally,R2,South Indian,180,25,DELIVERED
    Q510,2025-06-08 13:40,Gachibowli,R4,North Indian,720,44,DELIVERED
    Q511,2025-06-08 20:05,Madhapur,R1,Biryani,505,0,CANCELLED
    Q512,2025-06-08 21:10,Madhapur,R3,Chinese,385,31,DELIVERED

**qb_rest.csv**

    restaurant_id,restaurant,commission_pct
    R1,Paradise Point,22
    R2,Udupi Grand,18
    R3,Dragon Wok,20
    R4,Punjab Dhaba,20

## Exercise 1 — Load and inspect

Load the orders with order_time as a datetime. Print the shape and dtypes, and count orders by status.
Then make \`d\`, the delivered orders only, and print how many there are and their total amount.

## Exercise 2 — Filter

From the delivered orders, list order_id, area and amount for orders from **Gachibowli or Madhapur**
worth **more than ₹400**.

## Exercise 3 — groupby with named aggregation

For delivered orders, one row per cuisine: number of orders, revenue, and average delivery minutes
(one decimal), sorted by revenue, highest first.

## Exercise 4 — pivot_table

Delivered order **counts** with areas down the side and cuisines across, zeros for empty cells, and
totals.

## Exercise 5 — merge

Join the delivered orders to the restaurants. Check that the row count does not change (use
\`validate\`). Compute commission = amount × commission_pct / 100 and total it per restaurant, largest
first. What does QuickBite earn in total?

## Exercise 6 — dates and a rate

A delivery is **late** if it took more than 40 minutes. (a) What share of each area's delivered orders
were late? (b) Label each order **Lunch** (before 16:00) or **Dinner** and give the count and revenue
for each. (c) Daily delivered revenue with \`resample\`.

---

## Answers

**1.**

    o = pd.read_csv('qb_orders.csv', parse_dates=['order_time'])
    print(o.shape)                        # (12, 8)
    print(o['status'].value_counts())     # DELIVERED 10, CANCELLED 2
    d = o[o['status'] == 'DELIVERED']
    print(len(d), d['amount'].sum())      # 10 4920

dtypes: order_time is \`datetime64[us]\` on pandas 3.0 (\`[ns]\` on 2.x); amount and delivery_min are
int64; the text columns show \`str\` on 3.0 (\`object\` on 2.x). The two cancelled orders (₹365 and ₹505)
must not count as revenue — including them would give ₹5,790.

**2.**

    print(d[d['area'].isin(['Gachibowli', 'Madhapur']) & (d['amount'] > 400)][['order_id', 'area', 'amount']])

      order_id        area  amount
    0     Q501  Gachibowli     520
    3     Q504  Gachibowli     780
    5     Q506  Gachibowli     455
    7     Q508    Madhapur     590
    9     Q510  Gachibowli     720

**3.**

    print(d.groupby('cuisine').agg(orders=('order_id', 'count'), revenue=('amount', 'sum'),
                                   avg_min=('delivery_min', 'mean'))
           .sort_values('revenue', ascending=False).round(1))

                  orders  revenue  avg_min
    cuisine
    Biryani            3     1940     42.3
    North Indian       2     1310     36.5
    Chinese            3     1250     38.7
    South Indian       2      420     23.5

Reconcile: 3 + 2 + 3 + 2 = 10 orders; 1,940 + 1,310 + 1,250 + 420 = 4,920. ✓ Note that working on
\`o\` instead of \`d\` would have averaged in the cancelled orders' 0 minutes.

**4.**

    print(pd.pivot_table(d, index='area', columns='cuisine', values='order_id',
                         aggfunc='count', fill_value=0, margins=True))

    cuisine     Biryani  Chinese  North Indian  South Indian  All
    area
    Gachibowli        2        1             1             0    4
    Kukatpally        1        1             0             1    3
    Madhapur          0        1             1             1    3
    All               3        3             2             2   10

**5.**

    r = pd.read_csv('qb_rest.csv')
    m = d.merge(r, on='restaurant_id', how='left', validate='many_to_one')
    print(len(d), len(m))                 # 10 10
    m['commission'] = m['amount'] * m['commission_pct'] / 100
    print(m.groupby('restaurant')['commission'].sum().sort_values(ascending=False))

    restaurant
    Paradise Point    426.8
    Punjab Dhaba      262.0
    Dragon Wok        250.0
    Udupi Grand        75.6

Total ₹1,014.40. Paradise Point: delivered ₹520 + ₹780 + ₹640 = ₹1,940 × 22% = ₹426.80.

**6.**

    d = d.copy()                          # we are adding columns to a filtered table
    d['late'] = d['delivery_min'] > 40
    print(d.groupby('area')['late'].mean().round(2))

    area
    Gachibowli    0.50
    Kukatpally    0.67
    Madhapur      0.00

The mean of a True/False column is the share of Trues. Kukatpally: 2 of 3 late (48 and 52 min).

    d['slot'] = d['order_time'].dt.hour.map(lambda h: 'Lunch' if h < 16 else 'Dinner')
    print(d.groupby('slot')['amount'].agg(['count', 'sum']))

            count   sum
    slot
    Dinner      6  3260
    Lunch       4  1660

    print(d.set_index('order_time')['amount'].resample('D').sum())

    order_time
    2025-06-06    1950
    2025-06-07    1685
    2025-06-08    1285

(6–8 June 2025 are a Friday, Saturday and Sunday.) Daily totals add to ₹4,920 — the same as Exercise 1,
which is the check that nothing was lost.`,
    mcqs: [
      mcq('In QuickBite\'s practice data, what is the total amount of the DELIVERED orders?', [
        ['₹4,920', true],
        ['₹5,790', false],
        ['₹870', false],
        ['₹4,555', false],
      ], 'Ten delivered orders add to ₹4,920. ₹5,790 includes the two cancelled orders (₹365 and ₹505), whose total is ₹870; a cancelled order earns no revenue.'),
      mcq('In Exercise 6, d.groupby(\'area\')[\'late\'].mean() is run where late is delivery_min > 40. Which area has the highest late share?', [
        ['Kukatpally, at about 0.67', true],
        ['Gachibowli, at 0.50', false],
        ['Madhapur, at 0.00', false],
      ], 'Kukatpally\'s delivered orders took 48, 52 and 25 minutes, so 2 of 3 were late. The mean of a boolean column is the share of True values.'),
      mcq('Paradise Point (R1, 22% commission) has delivered orders of ₹520, ₹780 and ₹640 and a cancelled order of ₹505. What commission does Exercise 5 give it?', [
        ['₹426.80', true],
        ['₹537.90', false],
        ['₹1,940.00', false],
        ['₹388.00', false],
      ], 'Only delivered orders are merged: ₹1,940 × 22% = ₹426.80. Including the cancelled ₹505 would give ₹537.90; ₹1,940 is the revenue itself, and ₹388 applies 20% instead of 22%.'),
      mcq('In Exercise 4\'s pivot_table of delivered order counts (margins=True), what is the bottom-right All value?', [
        ['10', true],
        ['12', false],
        ['4', false],
      ], 'The grand total counts every delivered order once: 4 + 3 + 3 = 10 by area, and 3 + 3 + 2 + 2 = 10 by cuisine. 12 would include the cancelled orders.'),
      mcq('Exercise 6 adds columns to d, which was made by d = o[o[\'status\'] == \'DELIVERED\']. Why does the answer start with d = d.copy()?', [
        ['It marks d as its own table, so pandas 2.x does not warn', true],
        ['Without it, adding a column to d also adds it to o', false],
        ['copy() is required before using groupby on any DataFrame', false],
        ['It sorts d by order_time so that resample can work', false],
      ], 'A filter already returns a new table, so o is never changed — but pandas 2.x cannot tell and shows a SettingWithCopyWarning. .copy() states the intent; on 3.0 it is harmless.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PANDAS_INTERVIEW_QUESTION',
    notes: `Analyst interviews test pandas in two ways: a live exercise ("here's a DataFrame, find…") and
questions about how you work ("how do you know your merge is right?"). Interviewers listen for the
checks you make, not just whether the code runs. Practise saying these answers aloud.

## Q1. "Find the top 2 products by revenue in each city."

**Model answer.** "First I make sure I have city on each sale — orders only have store_id, so I merge
with the store master, many-to-one, and check the row count doesn't change. Then I aggregate to one
row per city and product, sort by city and revenue descending, and take the first two rows of each
city with groupby-head."

    m = df.merge(stores, on='store_id', how='left', validate='many_to_one')
    pc = m.groupby(['city', 'product'], as_index=False)['amount'].sum()
    top2 = (pc.sort_values(['city', 'amount'], ascending=[True, False])
              .groupby('city').head(2))
    print(top2)

             city             product  amount
    3   Bengaluru    Sunflower Oil 1L     775
    0   Bengaluru  Green Tea 100 bags     480
    4   Hyderabad    Basmati Rice 5kg    1298
    8   Hyderabad        Toor Dal 1kg     660
    9      Mumbai    Basmati Rice 5kg     649
    11     Mumbai        Toor Dal 1kg     495

"The important step is aggregating **before** ranking — Hyderabad sold Toor Dal in one order here, but
on real data a product appears in many orders, and ranking raw rows would rank individual orders."

**Follow-ups:**
- *"What about ties?"* — "head(2) cuts arbitrarily at a tie. If ties should all be kept I'd use
  \`pc.groupby('city')['amount'].rank(method='dense', ascending=False)\` and keep rank ≤ 2 — same as
  DENSE_RANK in SQL."
- *"How would you do it in SQL?"* — "ROW_NUMBER() OVER (PARTITION BY city ORDER BY revenue DESC) in a
  CTE, then WHERE rn <= 2."

## Q2. "You merged two tables and the row count went up. What happened, and what do you do?"

**Model answer.** "A left merge keeps the left table's rows, so it can only grow if a key on the right
appears more than once — each left row is repeated for every match. That also inflates any sum, so
it's serious. I'd check \`right['key'].duplicated().sum()\`, look at the duplicated keys with
\`right[right['key'].duplicated(keep=False)]\` to understand why — a price history, a typo, a store
listed under two names — and fix it deliberately: keep the current row, aggregate the right side first,
or add a second key column such as a date. Then I'd rerun with \`validate='many_to_one'\` so the merge
fails if it ever happens again, and confirm the row count and total match the original."

**Follow-ups:**
- *"And if the count went down?"* — "Then it was an inner join, or the keys don't match — different
  case, spaces, or type, like '007' vs 7. \`indicator=True\` shows the unmatched rows."
- *"Is a growing row count ever correct?"* — "Yes, for one-to-many on purpose — orders to order lines.
  Then I must not sum order-level columns afterwards, because they repeat."

## Q3. "The CSV is 6 GB and your laptop has 8 GB of RAM. How do you analyse it in pandas?"

**Model answer.** "First I'd ask whether I need all of it — often a database or BigQuery should do the
heavy aggregation and pandas gets the summary. If it must be pandas: read only the columns I need with
\`usecols\`; give dtypes up front — \`category\` for repeated text like city or status, smaller numeric
types where safe; and if it still doesn't fit, read it in chunks and aggregate each chunk, combining
the partial results."

    total = 0
    for chunk in pd.read_csv('sales.csv', chunksize=5, usecols=['qty', 'unit_price']):
        total += (chunk['qty'] * chunk['unit_price']).sum()
    print(total)

    5986

"(On the real file the chunk would be a million rows, not five.) Sums and counts combine across chunks
directly; a mean must be built from summed totals and counts, and a median can't be combined that way.
Converting the category column to \`category\` dtype cut its memory from 817 to 375 bytes even on 12
rows; on millions of rows with a few distinct values the saving is far larger. Finally I'd save the
cleaned data as Parquet, which loads much faster and keeps the dtypes."

**Follow-ups:**
- *"Why not just use apply with a function?"* — "apply runs Python per row, which is slow; vectorised
  column arithmetic runs in compiled code."
- *"Anything else beyond pandas?"* — "Polars or DuckDB handle bigger-than-memory data well, and DuckDB
  lets me run SQL straight on the CSV or Parquet file."

## How you are judged

Talk through the **grain** of each table, the **checks** (row counts, validate, reconcile to a total),
and the **edge cases** (ties, missing keys, incomplete months) without being asked. Code that runs is
the minimum; an answer that shows you know when it would be wrong is what gets the offer.`,
    mcqs: [
      mcq('An interviewer asks for the top 2 products by revenue in each city from order-level data. Which approach is correct?', [
        ['Sum per city and product, sort, then groupby(\'city\').head(2)', true],
        ['Sort the raw orders by amount, then take groupby(\'city\').head(2)', false],
        ['groupby(\'city\')[\'amount\'].max() and look up the product name', false],
      ], 'Products appear in many orders, so revenue must be aggregated per city and product first; ranking raw rows picks the two biggest orders, and max() gives only one order per city.'),
      mcq('A left merge of 48,210 order lines onto a product master returns 48,394 rows. What is the most likely cause?', [
        ['Some product keys appear more than once in the master', true],
        ['184 order lines had no match in the product master', false],
        ['The merge defaulted to an outer join and added products', false],
        ['pandas adds a header row for each unmatched product', false],
      ], 'A left merge keeps every left row once per match, so growth means duplicate keys on the right. Unmatched lines are kept with NaN, which does not add rows.'),
      mcq('A 6 GB CSV must be summed by region on a laptop with 8 GB of RAM. Which plan is sound?', [
        ['Read needed columns in chunks, sum each, then combine the sums', true],
        ['Read it all, then call df.info() to reduce its memory', false],
        ['Use df.apply on each row so that less is held at once', false],
      ], 'chunksize keeps only part of the file in memory, and sums combine exactly across chunks. info() only reports memory, and apply does not reduce what is loaded.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PANDAS_MINI_PROJECT',
    notes: `# Analysing a Retail Dataset with pandas

You are the analyst for **FreshCart**, a grocery and household chain with 10 stores in 4 regions (North,
South, East, West). The South regional manager, Ms Lakshmi Rao, wants answers about January–June 2025
and wants to be able to rerun your notebook next quarter on new files. You deliver a Jupyter or Colab
notebook that loads three files, joins them, answers her questions, and reproduces itself from top to
bottom.

## The data

Generate the files yourself with a short Python script (NumPy's \`default_rng\` with a fixed seed, so
the data is the same every run), and make them realistic: weekend peaks, a festival bump, some stores
bigger than others. Include the problems listed — handling them is part of the work.

**sales_lines.csv** — about 20,000–40,000 rows, one per product per invoice:

| Column | Example | Meaning and planted problems |
|---|---|---|
| line_id | FC-0012345 | unique line number |
| invoice_no | INV-25-004512 | one invoice has 1–6 lines |
| invoice_date | 14-02-2025 | day-first text; include some dates that would be misread month-first |
| store_code | S07 | include a few lower-case or space-padded codes (" s07") |
| sku | SKU-0231 | include 2–3 SKUs missing from the product master |
| qty | 3 | whole units; a few blanks |
| unit_price | 1,299 | ₹, some with thousands commas, so the column arrives as text |
| discount_pct | 10 | 0–30; blank means no discount |

**stores.csv** — one row per store: store_code, store_name, city, region, opened_on, sq_ft. Plant one
store that opened in April 2025 (so it has no Q1 sales) and keep store_code unique.

**products.csv** — 150–250 rows: sku, product_name, category (Grocery, Staples, Personal Care, Home
Care, Beverages, Snacks), sub_category, mrp, cost_price. Plant **one duplicated SKU** (a price
revision with two rows) that you must detect and resolve before merging.

## Questions to answer

1. **Sales by store and month.** Net revenue (qty × unit_price × (1 − discount_pct/100)) per store per
   month, as a store × month table with totals. Which store grew most from January to June?
2. **Top categories.** Revenue, gross margin (revenue − qty × cost_price) and margin % by category; each
   category's share of revenue. Which category has the most revenue, and which the best margin?
3. **Weekday pattern.** Average revenue **per day** for each weekday (Monday to Sunday, in that order).
   Divide by the number of such days in the period, not the number of invoices.
4. **Month-over-month growth.** Monthly revenue for the chain and for the South region, with the change
   in ₹ and %, and a 7-day rolling average of daily chain revenue to show the trend.
5. **Ms Rao's own question:** which South store earns the most revenue per square foot, and is the
   newest store on track compared with the others' first months?

## Deliverables

1. **The notebook**, with Markdown headings for each step: load, inspect, clean, join, each question,
   findings. First cell prints the pandas, NumPy and Python versions.
2. **A cleaning log** inside the notebook: rows read, blanks and bad values found per column, dates
   parsed (and NaT count), store codes fixed, the duplicate SKU and how you resolved it, lines whose SKU
   is not in the master (kept and labelled "Unknown product", with their revenue reported).
3. **The joined table** saved as \`sales_clean.parquet\` (or CSV), one row per sale line.
4. **One table per question**, each produced by code, plus at least two charts (a monthly line and a
   sorted bar chart), labelled with ₹ and a title that states the finding.
5. **A findings section** of five bullet points for Ms Rao, each with a number and any caveat (an
   incomplete month, a store with fewer days open, small samples).

## Acceptance criteria

- **Restart & Run All** completes without errors, and the numbers match what is written in the
  findings.
- Paths are relative; nothing is hard-typed into a result.
- After each merge, the row count equals the number of sales lines (checked in code, with
  \`validate='many_to_one'\`), and total revenue is unchanged.
- The cleaning log's counts add up: rows read − rows dropped = rows in the clean table, and every dropped
  row has a reason.
- Every breakdown (by store, category, month, weekday) reconciles to the same grand total.
- Months are real periods in calendar order; frequencies use \`'ME'\`/\`'MS'\`, so the notebook runs on
  pandas 2.2 and 3.0.
- No chained assignment; any filtered table that is modified is taken with \`.copy()\`.`,
    mcqs: [
      mcq('In the mini project, 31,480 sales lines are merged with products.csv and the result has 31,612 rows. What should you do before answering any question?', [
        ['Resolve the duplicated SKU deliberately and re-merge with validate', true],
        ['Drop 132 rows at random so the count goes back to 31,480', false],
        ['Carry on, since a difference of 0.4% cannot change any of the rankings', false],
      ], 'The extra 132 rows are lines that matched both rows of the duplicated SKU, so revenue is overstated for that product. Resolve the duplicate on purpose and let validate=\'many_to_one\' guard the merge.'),
      mcq('For the weekday question, Saturdays total ₹48.2 lakh and Tuesdays ₹45.1 lakh over January–June, with 26 Saturdays and 25 Tuesdays in that period. What should the notebook report?', [
        ['Revenue per day: about ₹1.85 lakh on Saturdays and ₹1.80 lakh on Tuesdays', true],
        ['Saturdays earn ₹3.1 lakh more than Tuesdays, so Saturday is clearly stronger', false],
        ['The totals per invoice, since days are not an analyst\'s unit of measure', false],
        ['Only the larger total, because the brief asks for a single weekday', false],
      ], 'Weekdays occur a different number of times in a period, so totals are unfair; averaging per day (48.2 / 26 and 45.1 / 25) shows the gap is much smaller than the totals suggest.'),
    ],
    assignment: {
      title: 'Analysing a Retail Dataset with pandas',
      description: 'A reproducible pandas notebook for a retail chain: three messy files cleaned and joined with checked merges, then sales by store and month, top categories and margins, weekday patterns, month-over-month growth and a regional manager\'s own question, with a cleaning log, charts and findings.',
      instructions: `Build the notebook described in this unit's brief and submit it.

**Submit:**

1. The notebook (.ipynb) — run with **Restart & Run All** immediately before you save it, so every output
   shown is from a clean run.
2. The script that generates the three CSV files (with its seed), or the files themselves.
3. The cleaned, joined table (\`sales_clean.parquet\` or CSV).
4. An HTML or PDF export of the notebook, so it can be read without running it.

**Before you submit, check every acceptance criterion in the brief:** row counts after each merge, the
cleaning log's arithmetic, every breakdown reconciling to one grand total, weekday averages per day,
and that the findings quote the numbers the notebook actually prints.`,
      rubric: [
        { criterion: 'Loading, cleaning and the cleaning log', description: 'Files read with the right dtypes and an explicit date format; prices, codes, blanks and discounts handled; the duplicate SKU detected and resolved deliberately; unknown SKUs kept and labelled; a cleaning log whose counts add up.', maxPoints: 25 },
        { criterion: 'Correct joins and reconciliation', description: 'Merges use the right keys and how=, validate=\'many_to_one\', and row-count and revenue checks in code; every breakdown reconciles to the same grand total.', maxPoints: 20 },
        { criterion: 'Answers to the five questions', description: 'Store × month table with totals; category revenue, margin and share; weekday revenue per day in Monday–Sunday order; monthly change in ₹ and % and a 7-day rolling average; revenue per sq ft and the new store compared fairly.', maxPoints: 30 },
        { criterion: 'Reproducibility and code quality', description: 'Runs top to bottom on a fresh kernel; versions printed; relative paths; seeded data generation; no chained assignment; frequencies that work on pandas 2.2 and 3.0; Markdown explaining each step.', maxPoints: 15 },
        { criterion: 'Findings and charts', description: 'Two or more labelled charts with titles that state the finding; five findings for the manager, each with a number and its caveat.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PANDAS_CHECKPOINT',
    notes: `Ten questions on NumPy and pandas: reading data, selecting and filtering, groupby and pivot tables,
merges, reshaping and dates. Most show a few lines of code on ShopKart's 12 orders (amounts total
₹5,986; stores S1–S3 have orders, S4 has none) and ask what it returns or what the analyst should do.
Answer from what pandas actually does — several questions name the pandas version where 2.x and 3.0
differ.`,
    checkpoint: [
      mcq('ShopKart\'s orders are paid by UPI (₹4,357), Card (₹1,089) and Cash (₹540). What does df.groupby(\'payment\')[\'amount\'].sum()[\'Card\'] return?', [
        ['1089', true],
        ['3', false],
        ['4357', false],
        ['5986', false],
      ], 'The groupby result is a Series indexed by payment method, so [\'Card\'] picks its total, ₹1,089. 3 is the number of card orders; 5,986 is the grand total.'),
      mcq('S1 has 5 orders, Snacks has 3 orders, and one order (O1003) is both. How many rows does df[df[\'store_id\'].eq(\'S1\') | df[\'category\'].eq(\'Snacks\')] have?', [
        ['7', true],
        ['8', false],
        ['1', false],
        ['5', false],
      ], '| keeps a row if either condition holds, and the shared row appears once: 5 + 3 − 1 = 7. 8 double-counts O1003; 1 is what & would give.'),
      mcq('What does df.merge(stores, on=\'store_id\', how=\'right\').shape[0] give, for 12 orders across S1–S3 and a stores table of S1–S4?', [
        ['13', true],
        ['12', false],
        ['4', false],
      ], 'A right join keeps every store. S1–S3 bring their 12 orders, and S4, with no orders, adds one row with NaN order columns.'),
      mcq('s = pd.Series([10, None, 30]). What do s.count() and s.mean() return?', [
        ['2 and 20.0', true],
        ['3 and 13.33', false],
        ['3 and 20.0', false],
        ['2 and NaN', false],
      ], 'count counts non-missing values, and pandas\' mean skips NaN by default: (10 + 30) / 2 = 20.0. len(s) and s.size are 3.'),
      mcq('What does this return?\n\n    pd.DataFrame({\'store\': [\'S1\', \'S2\'], \'Jan\': [1418, 779], \'Feb\': [790, 775]}).melt(id_vars=\'store\', var_name=\'month\', value_name=\'rev\').shape', [
        ['(4, 3)', true],
        ['(2, 3)', false],
        ['(4, 4)', false],
        ['(6, 2)', false],
      ], 'Two stores × two month columns = 4 rows, with columns store, month and rev. melt turns column headers into values of the month column.'),
      mcq('The largest ShopKart order is O1001, two Basmati Rice 5kg bags at ₹649. What does df.loc[df[\'amount\'].idxmax(), \'product\'] return?', [
        ['\'Basmati Rice 5kg\'', true],
        ['1298', false],
        ['\'Filter Coffee 500g\'', false],
      ], 'idxmax returns the index label of the largest amount (0), and loc then reads the product in that row. 1298 is the amount itself and 0 is the label.'),
      mcq('What happens on pandas 2.2 or 3.0?\n\n    pd.to_datetime(pd.Series([\'03/04/2025\', \'15/04/2025\']))', [
        ['A ValueError, because 15 is read as a month', true],
        ['Both parse as April dates, since 15 cannot be a month', false],
        ['The first becomes 3 April and the second NaT', false],
        ['Both are returned unchanged as text', false],
      ], 'With no format, pandas infers one from the first value — 03/04 as month/day — and applies it to all. 15/04 then fails. Pass format=\'%d/%m/%Y\'; errors=\'coerce\' would be needed to get NaT.'),
      mcq('An analyst runs df[\'qty\'].sum() and gets \'216\' for quantities 2, 1 and 6. What is wrong?', [
        ['qty is a text column, and summing text joins the strings', true],
        ['sum() returns a string whenever the column has fewer than 10 rows', false],
        ['The column was read with thousands=\',\' and lost its separators', false],
        ['One quantity is 216 and the other two are missing', false],
      ], '\'2\' + \'1\' + \'6\' concatenates to \'216\'. Convert with pd.to_numeric (finding whatever made the column text) before any arithmetic; numeric qty sums to 9.'),
      mcq('On pandas 3.0, s1 = df[df[\'store_id\'] == \'S1\'] is followed by s1[\'gst\'] = s1[\'amount\'] * 0.05. What does pandas 3.0 do?', [
        ['Adds gst to s1 only, with no warning', true],
        ['Adds gst to s1 and shows a SettingWithCopyWarning', false],
        ['Adds gst to both s1 and df', false],
        ['Raises a ChainedAssignmentError and adds nothing', false],
      ], 'Under 3.0\'s Copy-on-Write, s1 behaves as its own table and the SettingWithCopyWarning no longer exists. pandas 2.x adds the column to s1 too, but warns; df is unchanged in both.'),
      mcq('Monthly revenue is in a Series mon indexed by month start. Which line gives last month\'s value next to each month, like SQL\'s LAG?', [
        ['mon.shift(1)', true],
        ['mon.diff(1)', false],
        ['mon.rolling(2).sum()', false],
        ['mon.pct_change()', false],
      ], 'shift(1) moves every value down one row, so each month lines up with the previous month\'s revenue. diff and pct_change compute the change from it; rolling sums a window.'),
    ],
  },
];
