/**
 * Career-track content: AI for analysts (Data Analytics + AI, batch A4).
 *
 * DT_AI_ANALYST — where AI helps and hurts in analysis, prompting for SQL, pandas and DAX, verifying
 * what an AI produces, Copilot in Excel and Power BI and chat-based data analysis, automating a
 * text-labelling step with an LLM API, and measuring how often AI labels on customer feedback are
 * right, ending with an AI-assisted feedback-analysis mini project.
 *
 * Students already have Year 1's "Generative AI and how it works" (tokens, why answers vary,
 * hallucination) and "AI-assisted coding", plus this track's SQL, pandas, statistics and Power BI.
 * Nothing here re-teaches how a model works; it teaches an analyst's discipline around one. Tools are
 * vendor-neutral where possible, and no prices or model versions are quoted — cost is taught as a
 * formula with the price left as a variable. Copilot features are described only at the level of
 * documented, stable behaviour, with the warning that they change often and depend on licence.
 * Every number (averages, fan-out totals, token counts, accuracy, precision, recall, Wilson
 * intervals) was computed in Python.
 *
 * The topic is two-skill. Every checkpoint question names its skill with ck(): LLM_APPLICATIONS by
 * default, PROMPT_ENGINEERING for the PROMPTING_FOR_DATA unit (its only skill) and for prompt-design
 * questions in the topic checkpoint, following trackSkillAttribution.ts.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const LLM = 'LLM_APPLICATIONS';
const PE = 'PROMPT_ENGINEERING';

export const TRACK_DATA_AI_ANALYST_BUNDLES: PilotBundle[] = [
  /* ── AI_IN_ANALYSIS ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_AI_ANALYST_AI_IN_ANALYSIS',
    notes: `You can now write SQL, clean data in pandas, test a hypothesis and build a Power BI report. An AI
assistant can draft every one of those in seconds. That makes you faster — and it makes it very easy to
hand a manager a confident, well-formatted, wrong number. This unit draws the line between the two.

## Where AI genuinely speeds an analyst up

| Task | What the AI does well | What you still do |
|---|---|---|
| **Drafting a query** | Writes the joins, GROUP BY and window functions from a clear description | Give it the schema and the business rule; check the result |
| **Translating** | Turns a working SQL query into pandas or a DAX measure, or the reverse | Check both give the same total |
| **Explaining code** | Walks through a 120-line query a colleague left behind, clause by clause | Confirm the explanation against the data |
| **Regex and text cleaning** | Writes the pattern for "pull the 6-digit PIN code out of an address" | Test it on ten real addresses, including odd ones |
| **Error messages** | Explains "ambiguous column name" or a pandas SettingWithCopyWarning | Fix the cause, not just the message |
| **First drafts of words** | A summary paragraph, an email to a stakeholder, chart titles | Make every number in it one you computed |
| **Labelling text at scale** | Sorting 20,000 reviews into themes (later units) | Measure how often it is right |

The pattern: AI is good at **producing a first draft of something you can check**. It is bad at being the
only source of a number.

## Where it hurts

**1. Confident wrong numbers.** A model generates plausible text; it does not run your query unless a
tool actually executes code, and even then it can execute the wrong logic. A food-delivery analyst asks
for "average order value in June". The generated query is

    SELECT AVG(order_value) FROM orders WHERE order_date >= '2025-06-01';

On a sample of eight orders — ₹420, ₹385, ₹1,250 (cancelled), ₹510, ₹298, ₹960 (cancelled), ₹445 and
₹362 — this returns **₹578.75**. The business defines AOV over **delivered** orders only: the six delivered
orders average **₹403.33**. Nothing errored. The query is tidy. It is off by 43% because the business rule
was never in the prompt and the model did not ask.

**2. Invented columns and tables.** Asked about "repeat customers", a model may write
\`WHERE is_repeat_customer = 1\` against a table that has no such column. That one fails loudly. The
dangerous version is when a column with a similar name exists — \`active\` meaning "account not deleted"
rather than "ordered in the last 30 days" — and the query runs.

**3. Plausible but wrong logic.** Averaging city-level percentages instead of dividing totals, a join
that multiplies rows, a date filter that misses the last day of the month. These are exactly the
mistakes you learned to catch in SQL and pandas — the AI makes them too, and faster.

**4. Answers that vary.** Ask the same question twice and you may get two different queries. That is
fine for a draft and unacceptable for a reported number, which is why the number comes from code you
saved and ran, not from the chat.

**5. Leaked data.** Pasting 5,000 customer rows with names and phone numbers into a public chatbot sends
personal data to a third party your company has no contract with. In India the Digital Personal Data
Protection Act, 2023 puts duties on companies that process personal data, and almost every employer has
a policy on which AI tools are approved. The rule for this whole topic:

> **Never paste personal or confidential company data into a tool your company has not approved.**
> Give the AI the **schema and a few made-up rows**, not the data.

## A working rule for every AI-assisted number

1. **The AI drafts; you run.** The number in your report comes from a query or notebook you executed.
2. **Check it against something you already know** — a finance total, last month's dashboard, a row count.
3. **Work one case by hand** — one customer, one day — and see that the query agrees.
4. **Say how you got it.** "Drafted with an AI assistant, verified against the finance GMV" is a normal
   thing to write in a methods note.

## What the AI cannot know

It does not know that your company counts a "new user" from first order, not from sign-up; that
Hyderabad was split into two zones in April; that the \`orders\` table double-logs app crashes. That
knowledge — the business rules and the quirks of the data — is the part of the job that is yours, and it
is why the next unit is about putting it into the prompt.`,
    mcqs: [
      mcq('A generated query returns an average order value of ₹578.75 for eight June orders, two of which were cancelled. The business defines AOV over delivered orders, which average ₹403.33. What went wrong?', [
        ['The prompt never stated the delivered-only rule, so the query averaged all orders', true],
        ['AVG in SQL ignores the two highest values, which pushes the average up instead', false],
        ['The date filter included May orders, which raised the average by about 43 percent', false],
        ['Cancelled orders have negative values, which AVG treats as positive amounts', false],
      ], 'The query averaged all eight orders (₹578.75); the two cancelled ones were ₹1,250 and ₹960. The business rule — delivered only, ₹403.33 — has to be in the prompt and checked in the output.'),
      mcq('For which of these tasks is an AI assistant most useful to an analyst, with the least risk?', [
        ['Explaining a long query a colleague wrote, clause by clause, before you test it', true],
        ['Giving the final Q2 revenue figure to put directly into the board presentation', false],
        ['Deciding which of two KPI definitions the business should formally adopt this year', false],
        ['Receiving the full customer table so it can find the top spenders by name', false],
      ], 'Explaining code produces something you can check against the data. A final reported number must come from a query you ran, a KPI definition is a business decision, and customer data must not be pasted into an unapproved tool.'),
      mcq('An AI-generated query filters on customers.active = 1 to count "active customers". The column exists and the query runs. Why is this still a risk?', [
        ['The column may mean "account not deleted", not "ordered recently", so it counts the wrong thing', true],
        ['A column that the AI suggested is always read-only, so the filter is silently ignored', false],
        ['The query will be slower because AI-written filters cannot make use of any index', false],
        ['Boolean columns must be compared with TRUE in SQL, so the value 1 matches no rows', false],
      ], 'A plausibly named column with a different meaning is worse than an invented one: there is no error to warn you. Check what the column means in the data dictionary or with the data owner.'),
    ],
    checkpoint: [
      ck(LLM, 'An analyst at a fintech app wants help segmenting 5,000 customers and plans to paste the rows, with names and phone numbers, into a free public chatbot. What should happen instead?', [
        ['Share only the schema and a few made-up rows, and run the real analysis on approved tools', true],
        ['Paste the rows but delete the column headers first, so the data cannot be understood', false],
        ['Paste the rows in two halves on different days so no single chat holds all of them at once', false],
        ['Paste the rows, then ask the chatbot to forget the data once it has finished', false],
      ], 'Personal data must not go to a tool the company has not approved. The AI only needs the structure to draft code; the real data stays where it is allowed to be.'),
      ck(LLM, 'Which statement about an AI chat assistant answering "what was our June revenue?" from a description of your tables is accurate?', [
        ['Unless a tool runs code on the data, the figure it gives is generated text, not a result', true],
        ['It computes the figure exactly, because it has the table descriptions in its context window', false],
        ['It returns the same figure every time, because revenue is a fixed historical value', false],
        ['It will refuse to answer unless the revenue figure is already in its training data', false],
      ], 'A model generates likely text. Without executing a query on your data it can only produce a plausible-looking number, which is why the reported number must come from code you ran.'),
      ck(LLM, 'An AI drafts a query for monthly repeat-customer rate. Before the number goes in the weekly report, which check is the most useful?', [
        ['Work one customer by hand and compare the overall figure with a number you already trust', true],
        ['Ask the same AI assistant whether the query it wrote is correct, and accept its answer', false],
        ['Run the query twice and confirm that both runs return exactly the same rate', false],
        ['Check that the query is formatted neatly and uses aliases for every table and column name', false],
      ], 'A hand-worked case tests the logic and a known total tests the scale. Asking the same model to grade itself, rerunning deterministic SQL, or checking formatting proves nothing about correctness.'),
    ],
  },

  /* ── PROMPTING_FOR_DATA ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_AI_ANALYST_PROMPTING_FOR_DATA',
    notes: `"Write SQL for monthly revenue by city" gets you a query. Whether it is the right query depends on
things the model cannot see: your table names, which column holds the money, whether cancelled orders
count, and what one row means. A good data prompt hands those over.

## The five things a data prompt needs

**1. The schema** — table names, column names and types, and the keys:

    orders(order_id INT PK, customer_id INT, order_ts TIMESTAMP, status VARCHAR, amount_inr DECIMAL)
    order_items(order_id INT, product_id INT, qty INT, price_inr DECIMAL)   -- many rows per order
    customers(customer_id INT PK, city VARCHAR, signup_date DATE)

**2. A few sample rows** — **made up**, in the real format. Three rows tell the model that \`status\` holds
'DELIVERED' and 'CANCELLED' in capitals and that \`order_ts\` has a time part. Never real customer rows in an
unapproved tool.

**3. The grain** — what one row of the *answer* is: "one row per city per month".

**4. The business rules** — the things only you know: "revenue = sum of amount_inr for DELIVERED orders",
"months are calendar months in IST", "exclude test accounts (customer_id below 100)".

**5. The output you want** — the dialect (PostgreSQL, MySQL, SQL Server, BigQuery), "pandas, assuming a
DataFrame called orders", or "a DAX measure in a model where Sales relates to Date on OrderDate".

## A weak prompt and a strong one

Weak:

> Write SQL to get monthly revenue by city.

Strong:

> PostgreSQL. Tables: (schema above). Sample rows: (three made-up rows per table).
> I need one row per city per calendar month from January to March 2025, with total revenue.
> Revenue = SUM(orders.amount_inr) for status = 'DELIVERED'. order_items has several rows per order — do not
> join it, it is not needed here. Exclude customer_id < 100 (test accounts).
> Return city, month (first day of the month), revenue, ordered by month then revenue descending.
> Explain each clause in one line after the query.

The strong prompt removes the guesses the model would otherwise make silently: which status counts, which
table holds the money, and a join that would multiply rows.

## Why "do not join order_items" matters

If the model joins \`order_items\` and sums \`orders.amount_inr\`, every order is counted once per item.
Three orders of ₹500 (2 items), ₹300 (1 item) and ₹800 (3 items) total **₹1,600**, but the joined sum
is 500×2 + 300 + 800×3 = **₹3,700**. This "fan-out" is the most common error in generated SQL. Telling the
model the grain of each table — "many rows per order" — prevents it.

## One step at a time

For anything longer than one query, ask for **one step**, run it, then ask for the next:

1. "Write the CTE that gives one row per customer with their first delivered order date." — run it,
   check the row count equals the number of distinct customers with a delivered order.
2. "Now add the month of that first order as cohort_month." — run it, eyeball five rows.
3. "Now count customers who ordered again in each of the next three months." — run it, hand-check one
   cohort.

A 60-line answer in one go is harder to check than three 15-line answers that you verified in turn.

## Ask for the reasoning and the assumptions

End the prompt with "List any assumptions you made" or "Explain each step". The list often contains the
bug: *"I assumed amount_inr includes the delivery fee"* — does it? You can only answer that if the model
says it.

## The same idea in pandas and DAX

**pandas:** say what the DataFrames are called, their dtypes (\`order_ts\` is datetime64, \`status\` is a
string), and the rules. Ask for a line count check: "after each merge, print the row count".

**DAX:** say the model's tables and relationships ("Sales[OrderDate] relates to 'Date'[Date]; 'Date' is
marked as the date table"), the existing measures to reuse (\`[Revenue]\`), and the visual it will sit in.
Without the relationships, a model will often write a CALCULATE with FILTER over the whole Sales table
when a simple filter on 'Date' would do — and time-intelligence functions need the marked date table.

## When the answer is wrong

Do not say "that's wrong, try again". Say **what** is wrong and show the evidence: "This returns 4,812
customers but there are only 3,950 distinct customer_ids with a delivered order — I think the join to
order_items multiplies rows." A specific correction gets a specific fix.`,
    workedExample: `**Goal: a correct DAX measure for "Revenue, same period last year" in a retail model, using AI.**

**Context you have:** Sales(OrderDate, StoreID, ProductID, Qty, NetAmount); 'Date' table marked as the date
table, related one-to-many to Sales[OrderDate]; an existing measure \`[Revenue] = SUM(Sales[NetAmount])\`;
fiscal year starts 1 April.

**Attempt 1 — the weak prompt.** "DAX for last year's revenue."
The answer:

    Revenue LY = CALCULATE(SUM(Sales[NetAmount]), YEAR(Sales[OrderDate]) = YEAR(TODAY()) - 1)

Problems you can see without running it: it ignores the existing \`[Revenue]\` measure; it hard-codes
"last calendar year from today", so in a monthly chart every month shows the same full-year figure; and
it filters a fact-table column instead of using the date table.

**Attempt 2 — the strong prompt.**

> Power BI model: Sales(OrderDate, StoreID, ProductID, Qty, NetAmount). 'Date'[Date] is marked as the date
> table and relates one-to-many to Sales[OrderDate]. Existing measure: [Revenue] = SUM(Sales[NetAmount]).
> I need [Revenue LY]: revenue for the same period one year earlier, so that on a matrix by 'Date'[Month]
> each month shows the same month last year. Reuse [Revenue]. Explain the function you choose in two lines.

The answer:

    Revenue LY = CALCULATE([Revenue], SAMEPERIODLASTYEAR('Date'[Date]))

with the explanation that SAMEPERIODLASTYEAR shifts the dates in the current filter context back one year.

**Step 3 — verify, do not trust.** Put \`[Revenue]\` and \`[Revenue LY]\` in a matrix by month. Check that
April 2025's Revenue LY equals April 2024's Revenue on the row above it a year earlier. Then check one
month by hand against a SQL total. Only then build \`[Revenue YoY %]\` on top.

**What changed between attempts:** the model, the tables, the relationships, the existing measure, and the
visual it will sit in were all stated. Nothing about the wording was clever — the context was complete.`,
    mcqs: [
      mcq('Three orders of ₹500, ₹300 and ₹800 have 2, 1 and 3 rows in order_items. A generated query joins order_items to orders and sums orders.amount_inr. What does it return?', [
        ['₹3,700, because each order amount is counted once per item row', true],
        ['₹1,600, because SUM counts each distinct order amount only once', false],
        ['₹2,600, because the single-item order is dropped by the join', false],
        ['₹4,800, because every amount is multiplied by the total of 6 items', false],
      ], 'The join repeats each order per item: 500×2 + 300×1 + 800×3 = 3,700, against a true total of 1,600. Stating that order_items has many rows per order prevents this fan-out.'),
      mcq('Which addition to a prompt for "monthly revenue by city" removes the most guesswork for the model?', [
        ['The rule that revenue is SUM(amount_inr) for DELIVERED orders only', true],
        ['The phrase "you are a world-class senior data analyst" at the top', false],
        ['A request to make the query as short and as fast as it can be', false],
        ['A note that the result will be shown to the company\'s senior leadership team', false],
      ], 'The business rule is information the model cannot infer from the schema. A persona, a brevity request or the audience do not tell it which orders count.'),
      mcq('A generated cohort query returns 4,812 customers, but only 3,950 distinct customer_ids have a delivered order. What is the most useful next prompt?', [
        ['State the two counts and that the order_items join probably multiplies rows', true],
        ['Say "that\'s wrong, try again" and run whatever query comes back next', false],
        ['Ask for the same query written in a different SQL dialect this time', false],
        ['Ask the model to add DISTINCT to every column in the final SELECT', false],
      ], 'A specific correction with evidence gets a specific fix. "Try again" invites a different guess, and blanket DISTINCT can hide the duplication without fixing the logic.'),
    ],
    checkpoint: [
      ck(PE, 'You want pandas code for customer cohorts from a DataFrame of orders. Which prompt detail most helps the model write correct code?', [
        ['The DataFrame name, column dtypes such as order_ts as datetime64, and the cohort rule', true],
        ['The number of rows in the full DataFrame and how long the current script takes to run', false],
        ['The version of Windows on your laptop and the name of the editor you are using', false],
        ['A request that the code fit on one line using as many chained methods as possible', false],
      ], 'The model needs names, types and the business rule to write code that runs and means the right thing. Row counts, the operating system or one-liner style do not change the logic.'),
      ck(PE, 'A prompt asks an AI for a complete 60-line retention analysis in one reply. What approach makes the result easier to verify?', [
        ['Ask for one step at a time, running and checking each before asking for the next', true],
        ['Ask for the whole analysis twice and keep whichever answer is longer and more detailed', false],
        ['Ask for the analysis without comments so there is less text to read through', false],
        ['Ask for the analysis in DAX instead, because DAX cannot contain logic errors', false],
      ], 'Short steps, each with its own check (row count, a hand-worked case), find errors where they occur. A long single answer hides which step went wrong.'),
      ck(PE, 'You end a data prompt with "List any assumptions you made". Why is this useful?', [
        ['A stated assumption, such as amounts including the delivery fee, can be checked against the data', true],
        ['The model becomes deterministic when it lists assumptions, so the answer stops varying', false],
        ['Listing assumptions makes the model run the query against the real database first', false],
        ['It stops the model from making assumptions at all, so the answer has none left to list', false],
      ], 'Assumptions are where silent errors live. Once written down, each one can be confirmed or corrected — "does amount_inr include the delivery fee?" is a question you can answer.'),
    ],
  },

  /* ── VERIFYING_AI ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_AI_ANALYST_VERIFYING_AI',
    notes: `Every AI-drafted query or notebook gets the same treatment before its numbers reach anyone. It is not
slow — most checks take a minute — and it is the difference between "AI makes me faster" and "AI made me
wrong faster".

## Check 1 — Row counts at every step

After every join, filter and merge, know how many rows you expect and look at how many you got.

- A join of orders (48,210 rows) to customers on customer_id should still give 48,210 rows. More means the
  customer table has duplicate keys; fewer means some orders have no customer (an inner join dropped them).
- In pandas, print \`len(df)\` after each step, or use \`validate='many_to_one'\` in \`merge\` so a duplicated key
  raises an error instead of multiplying rows.
- In SQL, \`SELECT COUNT(*), COUNT(DISTINCT order_id)\` on the result: if they differ, rows were multiplied.

## Check 2 — Reconcile to a known total

Find a number someone else already trusts — the finance team's monthly GMV, last month's dashboard, the
count in the source system — and compare.

A fintech app's AI-drafted query gives March UPI GMV of **₹51.2 crore**. Finance reports **₹48.6 crore**. The
gap is 5.3%. Rather than averaging the two or picking one, find the cause: here the query had no filter on
\`status\`, so failed and reversed transactions were included. Add \`status = 'SUCCESS'\` and the figure
should match finance; if it does not, the difference is the next thing to explain.

A known total is never a full proof — a query can get the total right and split it wrongly (you will see
this in Practice) — but a total that does not match is a certain sign of a problem.

## Check 3 — A case you can work by hand

Take a tiny slice — one customer, one day, eight rows — work out the answer on paper, and run the query on
just that slice.

Fintech app, "monthly active users in March = users with at least one successful transaction in March":

| user | txn_ts | status |
|---|---|---|
| u1 | 2025-03-02 10:00 | SUCCESS |
| u1 | 2025-03-05 12:00 | SUCCESS |
| u2 | 2025-03-09 09:00 | FAILED |
| u3 | 2025-03-11 20:00 | SUCCESS |
| u6 | 2025-03-20 14:00 | SUCCESS |
| u4 | 2025-03-31 18:40 | SUCCESS |
| u2 | 2025-03-31 23:10 | FAILED |
| u5 | 2025-04-01 08:00 | SUCCESS |

By hand: u1, u3, u6 and u4 — **4** users. The generated query:

    SELECT COUNT(user_id) FROM txns
    WHERE txn_ts BETWEEN '2025-03-01' AND '2025-03-31';

returns **5**. Three faults, each visible only because the slice was small enough to check:
1. \`COUNT(user_id)\` counts rows, not users — u1 is counted twice.
2. No status filter — u2's failed transaction counts.
3. \`BETWEEN ... '2025-03-31'\` means up to **midnight at the start** of 31 March on a timestamp column, so
   u4's evening transaction is missed.

Fixing only the first fault (\`COUNT(DISTINCT user_id)\`) gives **4** — the right number for the wrong
reasons (u2 wrongly in, u4 wrongly out). That is why you check the **list of users**, not just the count.
The correct filter is \`txn_ts >= '2025-03-01' AND txn_ts < '2025-04-01' AND status = 'SUCCESS'\`.

## Check 4 — Does the number make sense?

- Is a conversion rate between 0% and 100%? Is a retention curve falling, not rising, over months?
- Is it within the range of last month's ±20%? If not, is there a reason (a sale, a festival, an outage)?
- Do the parts add to the whole — city revenues to national revenue, theme counts to total reviews?

## Check 5 — Read the code, every line

You do not have to have written it to be responsible for it. Read the generated code and say what each
line does. Watch for: inner joins where you needed left joins, \`dropna()\` with no column list, averages of
ratios, hard-coded dates, and columns you do not recognise.

## Keep the evidence

Write down what you checked: "Row count after join 48,210 = orders ✔; GMV ₹48.6 cr = finance ✔; MAU hand
check on 8 rows ✔". It takes a minute, and when someone challenges the number in a meeting, you have the
answer.`,
    workedExample: `**Goal: verify an AI-drafted pandas notebook that reports refund rate by city for a food-delivery app.**

**The claim:** "Refund rate in Bengaluru is the highest of all cities." The notebook:

    df = orders.merge(refunds, on='order_id')
    rate = df.groupby('city').size() / orders.groupby('city').size()

**Check 1 — row counts.** \`len(orders)\` = 48,210. \`len(refunds)\` = 4,250, but
\`refunds['order_id'].nunique()\` = 3,906: some orders received two partial refunds and have two rows.
\`len(df)\` after the merge = 4,250, so the numerator counts **refund rows**, not refunded orders. Overall
the notebook's logic gives 4,250 ÷ 48,210 = 8.8%; cities where partial refunds are common — Bengaluru among
them — are inflated most.

**Fix the logic, then recheck.**

    refunded_ids = set(refunds['order_id'])
    orders['refunded'] = orders['order_id'].isin(refunded_ids)
    rate = orders.groupby('city')['refunded'].mean()

Each order is now counted once, refunded or not, and no order can be lost or duplicated. Had the original
merge used \`validate='one_to_one'\`, pandas would have raised an error on the duplicated order_ids instead of
quietly counting them twice.

**Check 2 — known total.** The overall refund rate, \`orders['refunded'].mean()\`, should match the payments
team's figure for the month: 3,906 refunded orders ÷ 48,210 orders = 8.1%. Then re-check whether Bengaluru
is still the highest.

**Check 3 — by hand.** Filter to one small city's one day — 12 orders, 1 refund — and confirm the code gives
1/12 = 8.3% for that slice.

**Check 4 — sense.** City rates should be spread around 8.1%; a city at 0% or 40% needs a look at its row
count before it goes in a slide.

**Write-up line:** "Refund rate by city, notebook drafted with an AI assistant; merge corrected to left
join; total 8.1% matches payments team; one-day hand check passed."`,
    mcqs: [
      mcq('A generated SQL filter is txn_ts BETWEEN \'2025-03-01\' AND \'2025-03-31\' on a timestamp column. A successful transaction at 18:40 on 31 March is missing. Why?', [
        ['The end value means midnight at the start of 31 March, so later times fall outside', true],
        ['BETWEEN excludes both of its end points, so 1 March and 31 March are both dropped', false],
        ['Timestamps are compared as text, so 18:40 sorts after every other date in the month', false],
        ['The database stores 31 March in UTC, which moves 18:40 into the month of April', false],
      ], 'A date literal on a timestamp column is 00:00:00. Use txn_ts >= \'2025-03-01\' AND txn_ts < \'2025-04-01\' to include the whole of 31 March.'),
      mcq('In pandas, what does merge(..., validate=\'many_to_one\') do when joining orders to a customers table?', [
        ['Raises an error if a customer key appears more than once in the customers table', true],
        ['Drops duplicated customers automatically, keeping the first row for each key', false],
        ['Checks that every order has a matching customer and fills in any missing ones itself', false],
        ['Sorts the result so each customer\'s orders sit together in consecutive rows', false],
      ], 'validate checks the key relationship and raises a MergeError if it is broken, so a duplicated key fails loudly instead of silently multiplying orders.'),
      mcq('An AI query for March GMV returns ₹51.2 crore; finance reports ₹48.6 crore. What is the right next step?', [
        ['Find which rows explain the 5.3% gap, such as failed transactions, before reporting either', true],
        ['Report the average of the two figures, ₹49.9 crore, as the best available estimate', false],
        ['Report the AI figure, because a query on raw data is more precise than finance', false],
        ['Report the finance figure and delete the query, since it can never be fixed', false],
      ], 'A mismatch with a trusted total is a signal to find the cause. Averaging or picking one hides the problem; here a missing status filter included failed transactions.'),
    ],
    checkpoint: [
      ck(LLM, 'On eight hand-checked rows, the correct March active-user count is 4. A generated query returns 4 after you change COUNT(user_id) to COUNT(DISTINCT user_id). Why is that not yet enough?', [
        ['The list of users may still be wrong, with a failed-only user in and a 31 March user out', true],
        ['COUNT(DISTINCT) is slower than COUNT, so the query must be rewritten before it is used', false],
        ['A hand check on eight rows can never be trusted, so the full month must be checked by eye', false],
        ['DISTINCT removes users with one transaction, so the count is right only by chance', false],
      ], 'Two errors can cancel. Here u2 (failed only) was wrongly included and u4 (31 March evening) wrongly excluded. Checking the actual user list, not just the count, exposes both.'),
      ck(LLM, 'After an AI-drafted join of orders (48,210 rows) to customers on customer_id, the result has 49,377 rows. What does that tell you?', [
        ['Some customer_ids appear more than once in customers, so orders were duplicated', true],
        ['Some orders have no matching customer, so the inner join added placeholder rows', false],
        ['The join worked as intended, since a join always returns more rows than either side', false],
        ['The customers table has more rows than orders, and their counts were added together', false],
      ], 'A many-to-one join should keep the order count. Extra rows mean duplicated keys on the "one" side; dropping rows would mean unmatched orders under an inner join.'),
      ck(LLM, 'A generated query gets the national revenue total right, matching finance to the rupee. Which error could it still contain?', [
        ['Revenue assigned to the wrong cities through a join on the wrong key', true],
        ['A date filter that silently left out the last day of the month', false],
        ['A missing status filter that included cancelled orders in revenue', false],
        ['A fan-out join that counted each order once for every item in it', false],
      ], 'Errors in the total — a missing day, cancelled orders, fan-out — would break the match. A wrong join key can move money between groups and still sum to the same total.'),
    ],
  },

  /* ── COPILOTS ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_AI_ANALYST_COPILOTS',
    notes: `Not all AI help comes from a separate chat window. Excel and Power BI now have assistants built in, and
chat assistants can take an uploaded file and run code on it. This unit is about using them well and
within the rules.

**A warning before anything else.** These products change every few months: features are added, renamed,
moved between licences, or switched on and off by administrators. What is described here is the stable,
documented shape of what they do. Before relying on a feature, check what **your** organisation's licence
and admin settings allow — and expect the menus to look different from any screenshot you have seen.

## Copilot in Excel

Copilot in Excel works on data in the workbook, and it works best when that data is a properly formatted
**Excel Table** with clear headers (the habit from the Excel topic pays off here). It has generally needed
the file to be saved in OneDrive or SharePoint, and it needs a licence that includes Copilot.

What it can typically do, from a prompt in the Copilot pane:

- **Suggest a formula column** — "add a column for days between order date and delivery date" — and show
  the formula before inserting it.
- **Highlight, sort and filter** — "highlight stores where margin is below 20%".
- **Summarise and chart** — create a PivotTable or chart of "revenue by region by month".
- **Answer questions about the data** — "which category grew fastest?" — sometimes using Python in Excel
  for heavier analysis, where available.

How to use it well:
- Read the formula it proposes. A suggested \`=AVERAGE(...)\` over a column of percentages is the same
  average-of-ratios mistake you would reject from a colleague.
- Check totals in the PivotTable it builds against a SUM you can see.
- Treat its written insights ("Electronics grew fastest") as claims to check, not findings.

## Copilot in Power BI

In Power BI, Copilot features have generally required the workspace to be on a **paid capacity** and to
be enabled by an administrator. Documented capabilities include:

- **Creating a report page** from a prompt, using the fields in the semantic model.
- **Summarising** a report page or visuals in plain language — for example in a narrative visual that
  updates with filters.
- **Answering questions** about the data in the model.
- **Writing and explaining DAX** — suggesting a query in DAX query view, or a description for a measure.

How to use it well:
- It can only be as good as the model. Clear table and column names, descriptions on measures, a marked
  date table and hidden helper columns all help it pick the right fields. A model full of "Column1" and
  "Measure 7" produces poor answers.
- A generated page is a **draft**: apply the design rules from the reports topic — fewer visuals, titles
  that state findings, sorted bars.
- A narrative summary states numbers; check them against the visuals and make sure it describes what is
  actually filtered.
- RLS still applies to the person viewing, so Copilot's answers are limited to the rows they may see.

## Chat-based data analysis

Several chat assistants let you upload a CSV or Excel file and ask questions. The useful ones **write and
run Python** (usually pandas) in a sandbox, and show you the code. That is a real step up from a model
guessing a number: the figure comes from code. It still has limits:

- **It reads the file as it understands it.** Day-first dates (05/03/2025) can be parsed as month-first;
  a header row two lines down, merged cells or an Indian-format number "1,25,000" stored as text can all
  be misread. Look at the code's \`read_csv\` line and the first rows it printed.
- **It makes the same logic mistakes** — averages of ratios, dropping rows with missing values, the wrong
  denominator. Read the code like any other.
- **Files and sessions are temporary** and have size limits; very large files may be sampled, truncated or
  refused. Note what it actually read (rows and columns).
- **Every number in the reply** should be traceable to a printed result in the code output, not just the
  prose summary.

## What data may go in — the rule

| Data | Approved company tool (enterprise licence, data protection agreed) | Public or personal AI account |
|---|---|---|
| Schema, column names, made-up sample rows | Yes | Yes |
| Aggregated, non-confidential figures (published results) | Yes | Usually yes, if policy allows |
| Customer personal data (names, phones, emails, addresses, PAN) | Only if policy allows that use | **Never** |
| Confidential business data (unreleased revenue, pricing plans, contracts) | Only if policy allows | **Never** |

Enterprise versions of these tools usually come with commitments about how prompts and files are handled;
consumer versions may differ. You do not need to know the legal details — you need to know **which tools
your company has approved** and to ask when you are not sure. When you need help on data you cannot share,
give the tool the **schema and synthetic rows** and run the resulting code yourself where the data lives.`,
    mcqs: [
      mcq('Copilot in Excel proposes a "Margin %" summary using =AVERAGE over a column of store-level margin percentages. What should you do?', [
        ['Reject it and compute total margin divided by total revenue, since stores differ in size', true],
        ['Accept it, because Copilot uses the workbook data and so cannot make any logic error at all', false],
        ['Accept it if the column is formatted as a percentage, which weights the average', false],
        ['Ask Copilot to round the result to one decimal, which fixes the weighting problem', false],
      ], 'An average of ratios gives a small store the same weight as a large one. Copilot\'s suggestions are drafts to check with the same rules you apply to any formula.'),
      mcq('A chat assistant ran pandas on your uploaded CSV and reports March sales far below February. The file has dates such as 05/03/2025 meaning 5 March. What do you check first?', [
        ['Whether its read_csv line parsed the dates as month-first, moving rows between months', true],
        ['Whether the assistant has a limit on the number of questions asked in one session', false],
        ['Whether the CSV was saved with commas or semicolons as its column separator character', false],
        ['Whether the assistant\'s summary paragraph uses the same currency symbol as the file', false],
      ], 'Read as month-first, 05/03/2025 becomes 3 May, so March rows scatter across other months. Checking the parsing line and a few parsed dates finds this quickly.'),
      mcq('Copilot in Power BI picks the wrong fields when asked for "revenue by store", in a model with columns named Column1 and Measure 7. What most improves its answers?', [
        ['Clear table, column and measure names with descriptions, and hidden helper columns', true],
        ['Typing the prompt in capital letters so Copilot treats it as more important', false],
        ['Adding more visuals to the report so Copilot has more examples to copy from', false],
        ['Turning off the date table so Copilot has fewer tables to choose between', false],
      ], 'Copilot works from the semantic model\'s metadata. Meaningful names and descriptions let it map "revenue" and "store" to the right fields.'),
    ],
    checkpoint: [
      ck(LLM, 'Your company has approved an enterprise AI assistant but not public chatbots. Which request is acceptable on a personal account of a public chatbot?', [
        ['A pandas question that includes only column names and three made-up rows', true],
        ['A summary of the unreleased quarterly revenue figures by business unit', false],
        ['A list of customers with their phone numbers to find duplicate accounts', false],
        ['The pricing plan for next quarter, so it can suggest discount levels', false],
      ], 'Schema and synthetic rows carry no personal or confidential data. Unreleased revenue, customer contact details and pricing plans must stay in approved tools, if allowed at all.'),
      ck(LLM, 'A colleague says a Copilot feature described in a training video is missing from her Power BI. What is the most likely explanation?', [
        ['The feature depends on licence, capacity or admin settings, and the product changes often', true],
        ['Copilot works only in reports that have no row-level security roles defined in them', false],
        ['Copilot features appear only after a report has been viewed a set number of times', false],
        ['Her semantic model has too few measures, so Copilot has hidden its whole menu', false],
      ], 'Copilot availability varies with licensing, capacity and tenant settings, and features move and change frequently — so check your own organisation\'s setup.'),
      ck(LLM, 'A chat assistant writes "total revenue is ₹4.82 crore" after analysing an uploaded file. What makes that number trustworthy enough to use?', [
        ['It matches a printed result from the code that ran and a total you already know', true],
        ['It is written confidently, in a full sentence, with the rupee symbol included', false],
        ['The assistant was asked to double-check it and replied that it was correct', false],
        ['The same figure appears again when the question is asked again in a brand-new chat', false],
      ], 'A number is trustworthy when it traces to executed code and reconciles with a known figure. Confidence, self-checks and repetition do not verify anything.'),
    ],
  },

  /* ── LLM_API_AUTOMATION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_AI_ANALYST_LLM_API_AUTOMATION',
    notes: `Labelling 50 reviews in a chat window is fine. Labelling 20,000 reviews every month is a pipeline: a
Python script that sends text to an LLM API, gets structured labels back, checks them, and saves them
next to the original rows. This unit is how an analyst builds that step safely. (How models and tokens
work is from Year 1; here it is used, not re-taught.)

## The shape of the job

    reviews.csv (review_id, review_text, rating, date)
      → batches of 20
      → LLM API call with instructions + the batch, asking for JSON
      → validate each label
      → labels.csv (review_id, theme, sentiment)
      → join back to reviews on review_id

The code below is **illustrative and vendor-neutral**. Each provider has its own endpoint, request fields
and response shape — read your provider's documentation for those parts. The structure is the same
everywhere.

## Keys come from the environment

    import os
    API_URL = os.environ["LLM_API_URL"]
    API_KEY = os.environ["LLM_API_KEY"]   # never written in the notebook or committed to Git

A key pasted into a notebook ends up in Git history, in a shared drive, in a screenshot. Set it as an
environment variable (or in your company's secrets store) and read it.

## Ask for JSON with a fixed label set

    THEMES = ["Delivery delay", "Wrong or missing item", "Food quality", "Payment or refund", "App issue", "Other"]
    SENTIMENTS = ["positive", "neutral", "negative"]

    INSTRUCTIONS = (
        "You label app-store reviews for a food-delivery app. For each review return one object with "
        "review_id, theme and sentiment. theme must be exactly one of: " + ", ".join(THEMES) + ". "
        "sentiment must be exactly one of: positive, neutral, negative. "
        'Return only JSON: {"labels": [{"review_id": ..., "theme": ..., "sentiment": ...}]}'
    )

A fixed list stops the model inventing "Late delivery" in one batch and "Delivery delay" in the next.
Asking for the **review_id back** lets you join the labels by id rather than by position.

## Call with a timeout and retries

    import json, time, requests

    def call_llm(batch, retries=3):
        payload = {
            "temperature": 0,
            "messages": [
                {"role": "system", "content": INSTRUCTIONS},
                {"role": "user", "content": json.dumps(batch, ensure_ascii=False)},
            ],
        }
        for attempt in range(retries):
            try:
                r = requests.post(API_URL, json=payload,
                                  headers={"Authorization": "Bearer " + API_KEY}, timeout=60)
                if r.status_code == 429 or r.status_code >= 500:   # rate limited or server error
                    time.sleep(2 ** attempt)
                    continue
                r.raise_for_status()
                return extract_text(r.json())    # provider-specific: pull the reply text out
            except requests.Timeout:
                time.sleep(2 ** attempt)
        raise RuntimeError("LLM call failed after retries")

Temperature 0 reduces variation between runs; it does not make the labels correct.

## Validate every reply

    def validate(reply_text, batch):
        data = json.loads(reply_text)                      # fails loudly if it is not JSON
        labels = data["labels"]
        sent_ids = {r["review_id"] for r in batch}
        got_ids = {l["review_id"] for l in labels}
        if got_ids != sent_ids:
            raise ValueError(f"ids mismatch: missing {sent_ids - got_ids}, extra {got_ids - sent_ids}")
        for l in labels:
            if l["theme"] not in THEMES or l["sentiment"] not in SENTIMENTS:
                raise ValueError(f"bad label {l}")
        return labels

A batch that fails validation is retried once, then written to a \`failed_batches\` list for you to look
at — never silently skipped, or the counts in your report will not add up to the reviews you had.

## Batch, and keep the cost in view

    BATCH = 20
    results, failed = [], []
    for i in range(0, len(reviews), BATCH):
        batch = reviews[i:i + BATCH][["review_id", "review_text"]].to_dict("records")
        try:
            results += validate(call_llm(batch), batch)
        except Exception as e:
            failed.append({"review_ids": [r["review_id"] for r in batch], "error": str(e)})
    labels = pd.DataFrame(results)
    n_failed = sum(len(f["review_ids"]) for f in failed)
    assert len(labels) + n_failed == len(reviews)   # nothing vanished quietly

**Cost** is tokens × price per token, for input and output separately:

    cost = input_tokens × price_in + output_tokens × price_out

Leave the prices as variables, read from your provider's current price page; they change often.

For 2,000 reviews averaging 60 tokens, instructions of 350 tokens and about 25 output tokens per review:

| | Calls | Input tokens | Output tokens |
|---|---|---|---|
| One review per call | 2,000 | 2,000 × (350 + 60) = 8,20,000 | 50,000 |
| 20 reviews per call | 100 | 100 × (350 + 20 × 60) = 1,55,000 | 50,000 |

Batching sends the instructions 100 times instead of 2,000, cutting input tokens by about 81%. Batches too
large bring other problems — a reply cut off at the output limit, or one bad review spoiling a whole batch
— so 10 to 50 short texts per call is a common range. **Run 100 reviews first**, measure the real tokens
used (most APIs report them in the response), and estimate the full run from that.

## Before you run it on real data

- Is this data allowed to go to this API under your company's agreement with the provider? Customer
  reviews published on an app store are public; support tickets with phone numbers are not — mask them
  first (replace digits with a placeholder) or use an approved internal deployment.
- Save the prompt text and the label list with the output, so next month's run is comparable.`,
    workedExample: `**Goal: estimate cost and run time before labelling 12,000 support tickets for an edtech app.**

**Measure on a pilot.** Run 100 tickets in batches of 25. The API's usage figures show: instructions about
400 tokens per call, tickets averaging 80 tokens, output about 30 tokens per ticket.

**Scale up.**
- Calls: 12,000 ÷ 25 = **480**.
- Input tokens: 480 × (400 + 25 × 80) = 480 × 2,400 = **11,52,000**.
- Output tokens: 12,000 × 30 = **3,60,000**.
- Cost = 11,52,000 × price_in + 3,60,000 × price_out. With prices quoted per million tokens, that is
  1.152 × P_in + 0.36 × P_out — fill in today's prices from the provider's page.

**Compare with no batching.** 12,000 calls × (400 + 80) = **57,60,000** input tokens — five times as many,
for the same output.

**Run time.** If one call takes about 6 seconds and the provider's rate limit allows the script to run
calls one after another, 480 calls take about 48 minutes. Check the rate limit on your account; a 429
response means slow down, and the retry with backoff handles it.

**Masking.** Tickets contain phone numbers and email addresses. Before any call:

    import re
    text = re.sub(r"\\b\\d{10}\\b", "<PHONE>", text)
    text = re.sub(r"\\S+@\\S+", "<EMAIL>", text)

and check on 50 tickets that nothing personal is left — then confirm the API is approved for this data.

**Write-down for the manager:** "12,000 tickets, 480 calls, about 15 lakh tokens in total, cost =
(formula with today's prices), under an hour to run, personal details masked first."`,
    mcqs: [
      mcq('Labelling 2,000 reviews of about 60 tokens with 350-token instructions, how many input tokens do batches of 20 use, compared with one review per call?', [
        ['1,55,000 with batches, against 8,20,000 one at a time', true],
        ['8,20,000 with batches, against 1,55,000 one at a time', false],
        ['1,20,000 with batches, against 1,55,000 one at a time', false],
        ['1,55,000 with batches, the same as one review per call', false],
      ], 'Batched: 100 calls × (350 + 20 × 60) = 1,55,000. One per call: 2,000 × (350 + 60) = 8,20,000. The saving is the instructions, sent 100 times instead of 2,000.'),
      mcq('Why does the labelling prompt ask the model to return each review_id with its label?', [
        ['So labels are joined to reviews by id, not by position in the reply', true],
        ['So the model can look the review up in its own training data', false],
        ['So the API bills each review separately rather than per call', false],
        ['So the reply is shorter, because ids use fewer tokens than text', false],
      ], 'If a reply skips or reorders a review, matching by position shifts every later label. Returning ids lets you join on them and detect missing ones.'),
      mcq('Where should the API key for an LLM labelling notebook be kept?', [
        ['In an environment variable or secrets store, read with os.environ', true],
        ['In the first cell of the notebook, so teammates can rerun it easily', false],
        ['In a comment at the top of the script, removed before each commit', false],
        ['In the prompt text, so the provider can identify the calling account', false],
      ], 'A key written in a notebook spreads through Git history, shared drives and screenshots. Reading it from the environment keeps it out of the code.'),
    ],
    checkpoint: [
      ck(LLM, 'A labelling script calls an LLM API with temperature 0. A teammate says this guarantees correct labels. What is accurate?', [
        ['It reduces variation between runs, but the labels still need checking for accuracy', true],
        ['It guarantees correct labels, because the model always picks its most likely answer', false],
        ['It makes the API cheaper, because fewer tokens are generated at low temperatures', false],
        ['It makes the API refuse any review it is not sure about, so errors are avoided', false],
      ], 'Lower temperature makes output more repeatable, not more correct. A consistently wrong label is still wrong — accuracy is measured against a hand-labelled sample.'),
      ck(LLM, 'A validated batch reply has 19 labels for 20 reviews sent. What should the script do?', [
        ['Treat it as a failed batch, retry it, and record it if it fails again', true],
        ['Keep the 19 labels and give the missing review the most common theme', false],
        ['Zip the 19 labels to the first 19 reviews and skip the twentieth one', false],
        ['Keep the 19 labels and drop the review, since one review is too few to matter', false],
      ], 'A count mismatch means the reply is incomplete or misaligned. Retrying and logging failures keeps the totals honest; guessing or zipping by position corrupts labels.'),
      ck(LLM, 'Your cost estimate for labelling must survive next quarter\'s price change. How should it be written?', [
        ['As input tokens × price_in + output tokens × price_out, with the prices as variables', true],
        ['As a fixed rupee amount per review, copied from a blog post about API prices', false],
        ['As the number of API calls only, since every call costs the same amount', false],
        ['As the number of reviews only, since the providers charge per item labelled', false],
      ], 'Providers charge per token, with different rates for input and output that change over time. A formula with prices as variables stays correct when they do.'),
    ],
  },

  /* ── TEXT_ANALYSIS ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_AI_ANALYST_TEXT_ANALYSIS',
    notes: `Ratings tell you *how* unhappy customers are. The text tells you *why*. An edtech app gets 3,000 reviews
a month; nobody reads them all, so the product team never learns that "video keeps buffering" doubled
after the last release. Categorising feedback into themes turns that text into a number you can trend.

## Two ways to categorise

**Keyword rules.** A dictionary of words per theme:

    RULES = {
        "Video playback": ["buffer", "video", "lag", "stuck"],
        "Pricing & refunds": ["refund", "price", "expensive", "money"],
        ...
    }

Fast, free, fully explainable, and easy to keep stable month to month. Weak on anything not phrased the
way you expected: "the lecture freezes every 5 minutes" has no keyword; "the video on refunds was great"
is tagged Pricing & refunds; "not expensive at all" is negative-sounding by keyword.

**LLM labelling.** The method from the last unit: a fixed theme list, JSON output, batches. It understands
paraphrase, negation, Hinglish ("payment ho gaya but course unlock nahi hua") and mixed reviews far better
than keywords. It costs money per run, can drift if the prompt or model changes, and its errors are less
predictable.

A sensible analyst often uses both: an LLM for the labels, and a few keyword checks as a sanity test ("of
the reviews containing 'refund', what share did the LLM put in Pricing & refunds?").

## Designing the theme list

- **Read 100–200 reviews first** and write themes from what customers actually say.
- **Mutually exclusive** where possible, with a rule for reviews that mention two things ("pick the main
  complaint", or allow up to two themes and say so).
- **Always an "Other"** — and if Other grows past about 10%, read it: a new theme is hiding there.
- **Definitions, not just names**: "App bugs — crashes, login failures, features not working; not video
  playback". Put the definitions in the prompt.

## Sentiment

Sentiment labels (positive, neutral, negative) add a dimension, but the star rating already captures much
of it. Sentiment by **theme** is what is useful: "Course content" reviews are 70% positive while "Support"
reviews are 85% negative. Watch for reviews where the rating and the text disagree (5 stars, "worst app") —
often sarcasm, or a review left on the wrong app.

## Measuring how often the AI is right

You cannot report "28% of complaints are about pricing" until you know how accurate the labels are.

1. **Draw a random sample** — 100 reviews from the month, not the first 100.
2. **Label them by hand**, ideally two people independently, settling disagreements, **before** looking at
   the AI's labels.
3. **Compare** in a confusion matrix: rows are the hand label (truth), columns the AI label.

For the edtech app's 100 reviews:

| Hand label ↓ / AI label → | Video | Pricing | Content | Bugs | Support | Total |
|---|---|---|---|---|---|---|
| Video playback | **19** | 0 | 1 | 2 | 0 | 22 |
| Pricing & refunds | 0 | **23** | 0 | 0 | 2 | 25 |
| Course content | 1 | 1 | **15** | 0 | 1 | 18 |
| App bugs | 3 | 0 | 0 | **17** | 0 | 20 |
| Support | 0 | 3 | 0 | 0 | **12** | 15 |
| Total | 23 | 27 | 16 | 19 | 15 | 100 |

- **Accuracy** = diagonal ÷ total = (19 + 23 + 15 + 17 + 12) ÷ 100 = **86%**.
- **Precision** for a theme = correct ÷ column total: of the 27 the AI called Pricing, 23 were — **85.2%**.
- **Recall** for a theme = correct ÷ row total: of the 25 truly about Pricing, the AI found 23 — **92.0%**.
- Course content has high precision (15/16 = 93.8%) and lower recall (15/18 = 83.3%): when the AI says
  "content", it is right, but it misses some.
- The main confusion is **Bugs labelled as Video** (3 reviews) — the definitions need a sharper line between
  "the app crashes" and "the video does not play".

On the same sample, the keyword rules got 71 of 100 right. The LLM's advantage — 86% against 71% — is
evidence you can show a manager.

**How sure are you of 86%?** On 100 reviews, a 95% Wilson interval for 86/100 is about **77.9% to 91.5%**.
"About 86%, very likely between 78% and 92%" is the honest statement. More hand-labelled reviews narrow it.

## Reporting with the error in mind

If the AI labelled 560 of 2,000 reviews (28.0%) as Pricing & refunds, and its precision is 85.2% and recall
92.0% for that theme, it slightly **over-assigns** Pricing. An adjusted estimate of the true count is
predicted × precision ÷ recall = 560 × 0.852 ÷ 0.920 ≈ **519** (26%). For a slide, "about a quarter of reviews
are about pricing and refunds" is honest; "28.0%" claims more precision than the labels have.

Trends are usually safer than levels: if the method is unchanged, a theme going from 12% to 24% of reviews
after a release is a real signal even with 86% accuracy.

## Keep the labels comparable over time

Save the prompt, theme definitions and label list with each month's output, and re-check accuracy on a
fresh 100-review sample whenever any of them — or the model behind the API — changes.`,
    workedExample: `**Goal: decide whether LLM labels are good enough to report "top complaint themes" for a food-delivery
app, from a 100-ticket hand check.**

**The hand check** (3 themes; rows = hand label, columns = LLM label):

| | Late delivery | Wrong/missing item | Payment/refund | Total |
|---|---|---|---|---|
| Late delivery | 34 | 4 | 2 | 40 |
| Wrong/missing item | 6 | 25 | 1 | 32 |
| Payment/refund | 3 | 2 | 23 | 28 |
| Total | 43 | 31 | 26 | 100 |

**Step 1 — accuracy.** Diagonal: 34 + 25 + 23 = 82, so **82%**.

**Step 2 — per theme.**
- Late delivery: precision 34/43 = **79.1%**, recall 34/40 = **85.0%**. The model labels some wrong-item and
  payment complaints as late delivery — probably because angry tickets often mention waiting.
- Wrong/missing item: precision 25/31 = 80.6%, recall 25/32 = 78.1%.
- Payment/refund: precision 23/26 = 88.5%, recall 23/28 = 82.1%.

**Step 3 — read the errors.** Of the 6 wrong-item tickets labelled "Late delivery", 5 say something like
"waited 50 minutes and then the biryani was missing". The main complaint is the missing item. Add to the
definitions: "If an item was missing or wrong, use Wrong/missing item even if the order was also late."

**Step 4 — re-run and re-check** on a **fresh** sample of 100 (not the same 100, which you have now tuned
to). If accuracy improves, keep the new prompt and record its version.

**Step 5 — the decision.** At 82% with known biases, the labels are good enough to rank themes and track
trends, with a caveat on the slide; not good enough to quote "Late delivery is 43.0% of tickets" to one
decimal.`,
    mcqs: [
      mcq('In a 100-review hand check, the AI labelled 27 reviews as Pricing & refunds, and 23 of those were truly about pricing. What is the AI\'s precision for that theme?', [
        ['85.2%', true],
        ['92.0%', false],
        ['86.0%', false],
        ['23.0%', false],
      ], 'Precision = correct ÷ everything the AI put in that theme = 23 ÷ 27 = 85.2%. 92.0% is the recall (23 of the 25 true pricing reviews), and 86% is the overall accuracy.'),
      mcq('Which review would a keyword rule for "Pricing & refunds" (refund, price, expensive, money) most likely mislabel?', [
        ['"The video explaining the refund policy was clear and helpful"', true],
        ['"I paid twice and still have not received my refund after 10 days"', false],
        ['"The yearly plan price went up from ₹4,999 to ₹6,499 overnight"', false],
        ['"Too expensive for what it offers compared with other learning apps"', false],
      ], 'The word "refund" matches, but the review is praise for course content. Keywords cannot tell what the review is about, only which words it contains.'),
      mcq('Why should the 100 reviews for an accuracy check be drawn at random from the month?', [
        ['So the sample represents all reviews, rather than one day or one kind of review', true],
        ['So the AI has not seen those reviews before, which it would otherwise remember later', false],
        ['So the hand labels match the AI labels more often, which raises the accuracy', false],
        ['So the reviews are shorter on average, which makes them cheaper to label', false],
      ], 'Accuracy measured on the first 100 rows — one day, maybe one app version — may not hold for the month. A random sample gives an estimate that applies to all reviews.'),
    ],
    checkpoint: [
      ck(LLM, 'LLM labels agree with careful hand labels on 86 of 100 random reviews. Which statement is the most honest?', [
        ['Accuracy is about 86%, likely between roughly 78% and 92% on a sample this size', true],
        ['Accuracy is exactly 86.0%, and this holds for every month the labels are used', false],
        ['Accuracy cannot be known at all without hand-labelling every review in the month', false],
        ['Accuracy is 100% on the reviews the AI is confident about, so the rest can be dropped', false],
      ], 'A 95% Wilson interval for 86/100 is about 77.9% to 91.5%. It is an estimate from a sample, valid while the prompt and model stay the same.'),
      ck(LLM, 'An LLM labels 560 of 2,000 reviews as Pricing & refunds. On the hand check its precision for that theme is 85.2% and recall 92.0%. What does that suggest?', [
        ['It slightly over-assigns Pricing, so the true count is nearer 519 than 560', true],
        ['It slightly under-assigns Pricing, so the true count is nearer 600 than 560', false],
        ['The count is exact, because precision and recall are both above 85 percent', false],
        ['The theme cannot be reported, because its precision is below 90 percent', false],
      ], 'Precision below recall means the AI puts more reviews in the theme than truly belong. Predicted × precision ÷ recall = 560 × 0.852 ÷ 0.920 ≈ 519.'),
      ck(LLM, 'The "Other" theme grows from 6% to 19% of reviews in one month while the prompt is unchanged. What should the analyst do?', [
        ['Read a sample of the Other reviews, since a new theme is probably hiding there', true],
        ['Merge Other into the largest theme so the chart has fewer categories to show', false],
        ['Drop the Other reviews from the report, since they cannot be categorised', false],
        ['Re-run the labelling at a higher temperature so that fewer of the reviews land in Other', false],
      ], 'A jump in Other usually means customers are complaining about something the theme list does not cover — a new release bug, a new payment method. Reading them finds it.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_AI_ANALYST_DEBUGGING',
    notes: `AI-assisted analysis fails in quiet ways: the code runs, the chart renders, and the number is wrong.
Here are eight faults from real analysis work — the symptom someone notices, the cause, and the fix.

## 1. The generated join used the wrong key

**Symptom:** a revenue-by-city table for an e-commerce site adds up to the right national total, but Pune
looks small and Nagpur large compared with last quarter.
**Cause:** the generated query joined \`orders o JOIN customers c ON o.order_id = c.customer_id\`. Each order
was matched to whichever customer happened to have the same number. The total survives because every
order still appears once; the split by city is noise.
**Fix:** \`ON o.customer_id = c.customer_id\`. Then hand-check: pick three orders, look up their customers'
cities yourself, and compare with the query.

## 2. A pandas line that silently drops rows

**Symptom:** a notebook reports 14,400 orders for the month; the order system says 50,000.
**Cause:** an AI-suggested cleaning step, \`df = df.dropna()\`. It drops any row with a missing value in
**any** column — and \`coupon_code\` is empty for the 35,600 orders without a coupon.
**Fix:** drop only on the columns that must be present, \`df.dropna(subset=['order_id', 'amount'])\`, and
print \`len(df)\` before and after every cleaning step.

## 3. The inner merge that lost cash orders

**Symptom:** payment-method shares look like 100% digital for a food-delivery app that accepts cash.
**Cause:** \`orders.merge(payments, on='order_id')\` — an inner join. Cash-on-delivery orders have no row in
the payments table, so 6,235 of 48,210 orders (12.9%) vanish.
**Fix:** \`how='left'\`, then fill the payment method for unmatched orders as "Cash on delivery" — after
confirming with the data owner that this is what a missing row means.

## 4. A column that does not exist — and the "fix" that made it worse

**Symptom:** the generated query fails with \`column "is_repeat" does not exist\`. Someone asks the AI to fix
it; the new query runs and reports 71% repeat customers, far above the usual 38%.
**Cause:** the model invented \`is_repeat\`; its "fix" swapped in \`customers.active\`, which means "account not
deleted" — almost everyone.
**Fix:** define the metric yourself ("a customer with two or more delivered orders in the period") and
ask for SQL for **that** definition. Check columns against the data dictionary, not the model's guess.

## 5. The LLM label set drifted between batches

**Symptom:** a theme chart shows "Late delivery" 11%, "Delivery delay" 9%, "late delivery" 4% and
"Delayed order" 3%.
**Cause:** the prompt said "label the main complaint" without a fixed list, so each batch named themes its
own way.
**Fix:** a fixed theme list in the prompt, validation that rejects any label not in the list, and a re-run.
Do not just merge the four names by hand — other themes will have drifted too.

## 6. Labels shifted by one row

**Symptom:** reviews saying "food was cold" are labelled "Payment or refund"; the next review, about a
refund, is labelled "App issue".
**Cause:** one batch reply returned 19 labels for 20 reviews, and the script zipped labels to reviews by
position. Every label after the missing one belongs to the review before it.
**Fix:** ask for review_id in each label, join on it, and fail the batch if the set of ids does not match
what was sent.

## 7. Average of city conversion rates

**Symptom:** an AI-drafted summary says "overall checkout conversion is 7.7%"; the funnel dashboard says
5.7%.
**Cause:** it averaged three city rates — Mumbai 5% (6,000 orders / 1,20,000 sessions), Pune 8% (1,600 /
20,000), Jaipur 10% (1,000 / 10,000) — getting 7.67%. Mumbai has 80% of the sessions but a third of the
weight.
**Fix:** total orders ÷ total sessions = 8,600 ÷ 1,50,000 = **5.73%**.

## 8. The month that was 3% short

**Symptom:** March revenue from a generated query is about 3% below finance, every year.
**Cause:** \`WHERE order_ts BETWEEN '2025-03-01' AND '2025-03-31'\` on a timestamp — everything after midnight
on 31 March is excluded; one day of 31 is 3.2%.
**Fix:** \`order_ts >= '2025-03-01' AND order_ts < '2025-04-01'\`.

## The habit

Row counts after every step, one known total, one hand-worked case, and a fixed label list with
validation. Almost every fault above is caught by one of those four.`,
    mcqs: [
      mcq('After an AI-suggested df = df.dropna(), a month\'s orders fall from 50,000 to 14,400. coupon_code is empty for 35,600 orders. What is the fix?', [
        ['Drop rows only where required columns are missing, using dropna(subset=[...])', true],
        ['Fill every missing value with zero first, then call dropna() again exactly as before', false],
        ['Keep the 14,400 rows, since orders without a coupon are incomplete records', false],
        ['Replace dropna() with drop_duplicates(), which removes the same bad rows', false],
      ], 'dropna() with no arguments removes a row if any column is missing. An empty coupon_code is normal, so only columns that must be present belong in subset.'),
      mcq('A labelled-review file shows "food was cold" tagged as Payment or refund, and the next review, about a refund, tagged as App issue. What is the likely cause?', [
        ['A reply missed one label and the labels were matched to reviews by position', true],
        ['The model was run at temperature 0, which makes it repeat the previous label', false],
        ['The theme list was too long, so the model chose labels at random for the batch', false],
        ['The reviews were in Hinglish, which the model always labels as Payment issues', false],
      ], 'Labels one row out of step point to a missing label and positional matching. Returning review_id with each label and joining on it prevents the shift.'),
      mcq('An AI summary gives checkout conversion as 7.7% by averaging Mumbai 5%, Pune 8% and Jaipur 10%. Sessions are 1,20,000, 20,000 and 10,000; orders 6,000, 1,600 and 1,000. What is the correct overall rate?', [
        ['5.73%', true],
        ['7.67%', false],
        ['8.00%', false],
        ['6.50%', false],
      ], 'Overall = 8,600 orders ÷ 1,50,000 sessions = 5.73%. The simple average gives Jaipur\'s 10,000 sessions the same weight as Mumbai\'s 1,20,000.'),
      mcq('A theme chart shows "Late delivery", "Delivery delay", "late delivery" and "Delayed order" as separate bars. What is the right fix?', [
        ['Put a fixed theme list in the prompt, reject labels not in it, and re-run', true],
        ['Rename the four bars by hand to one name, and leave the other themes as they are', false],
        ['Lower the batch size to one review per call, so the names stay the same', false],
        ['Sort the bars alphabetically, so that the similar names sit next to each other', false],
      ], 'Without a fixed list, every theme can drift, not only this one. A list in the prompt plus validation makes the labels consistent; merging by hand fixes only what you noticed.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_AI_ANALYST_PRACTICE',
    notes: `Six exercises on using AI in analysis. Work each before reading the answers at the end.

## Exercise 1 — Fix the prompt

An analyst writes: *"Write a query for repeat customers last quarter."* The database has
\`orders(order_id, customer_id, order_ts TIMESTAMP, status, amount_inr)\` and
\`customers(customer_id, city, signup_date)\`; status is 'DELIVERED', 'CANCELLED' or 'RETURNED'; the company
defines a repeat customer as one with two or more delivered orders in the quarter; the quarter is
January–March 2025; the database is PostgreSQL. List what is missing from the prompt and write a better one.

## Exercise 2 — Hand-check a generated query

customers:

| customer_id | city |
|---|---|
| 1 | Pune |
| 2 | Pune |
| 3 | Nagpur |

orders:

| order_id | customer_id | amount_inr | status |
|---|---|---|---|
| 1 | 2 | 400 | DELIVERED |
| 2 | 3 | 250 | DELIVERED |
| 3 | 1 | 600 | DELIVERED |
| 4 | 1 | 150 | CANCELLED |

Generated query:

    SELECT c.city, SUM(o.amount_inr) AS revenue
    FROM orders o JOIN customers c ON o.order_id = c.customer_id
    WHERE o.status = 'DELIVERED'
    GROUP BY c.city;

(a) What is the correct delivered revenue by city? (b) What does the query return? (c) Does the total
match? What does that teach you?

## Exercise 3 — Estimate the cost

12,000 support tickets; instructions 400 tokens; tickets average 80 tokens; output about 30 tokens per
ticket; batches of 25. Prices are P_in and P_out per million tokens. Give calls, input tokens, output
tokens and the cost formula. How many input tokens would one-ticket-per-call use?

## Exercise 4 — Read a confusion matrix

Food-delivery tickets, 100 hand-labelled (rows = hand label, columns = LLM label):

| | Late | Wrong item | Payment |
|---|---|---|---|
| Late | 34 | 4 | 2 |
| Wrong item | 6 | 25 | 1 |
| Payment | 3 | 2 | 23 |

Compute accuracy, and precision and recall for "Late".

## Exercise 5 — Approved or not?

Your company has approved an enterprise AI assistant inside its Microsoft 365 tenant, and nothing else.
For each, say where it may go — the approved assistant, a public chatbot, or neither without masking:
(a) the orders table schema with three invented rows; (b) last quarter's unpublished revenue by region;
(c) 2,000 support tickets containing customer phone numbers; (d) a Python error message from your notebook;
(e) public app-store reviews.

## Exercise 6 — Review the pandas

An AI wrote this to compute refund rate:

    df = orders.merge(refunds, on='order_id')
    df = df.dropna()
    refund_rate = len(df) / len(orders)

orders has 48,210 rows; refunds has 3,906 rows, one per refunded order; 410 refund rows have a blank
\`reason\`. What does the code report, what is the right figure, and how do you fix it?

## Answers

**1.** Missing: the dialect, the schema, the definition of "repeat" (2+ **delivered** orders), the exact
quarter, the timestamp handling, and the output wanted. Better: *"PostgreSQL. orders(order_id,
customer_id, order_ts TIMESTAMP, status, amount_inr); status is DELIVERED, CANCELLED or RETURNED. Repeat
customer = 2 or more DELIVERED orders with order_ts >= '2025-01-01' and < '2025-04-01'. Return the number of
repeat customers and the number of customers with at least one delivered order in that quarter, and the
ratio. Explain each clause."*

**2.** (a) Pune: orders 1 (customer 2) and 3 (customer 1) = 400 + 600 = **₹1,000**; Nagpur: order 2 =
**₹250**. Order 4 is cancelled. (b) The join matches order_id to customer_id: order 1 → customer 1 (Pune)
₹400, order 2 → customer 2 (Pune) ₹250, order 3 → customer 3 (Nagpur) ₹600 — **Pune ₹650, Nagpur ₹600**.
(c) Both total ₹1,250. A matching total does **not** prove a breakdown is right; hand-check a few rows'
groups too.

**3.** Calls 12,000 ÷ 25 = **480**; input 480 × (400 + 25 × 80) = **11,52,000**; output 12,000 × 30 =
**3,60,000**; cost = 1.152 × P_in + 0.36 × P_out. One per call: 12,000 × 480 = **57,60,000** input tokens.

**4.** Accuracy (34 + 25 + 23) ÷ 100 = **82%**. Late: precision 34 ÷ 43 = **79.1%**, recall 34 ÷ 40 =
**85.0%**.

**5.** (a) Either. (b) The approved assistant only. (c) Neither until phone numbers are masked — and then
only the approved assistant, if policy allows tickets there. (d) Either, after checking the message has no
data values in it. (e) Either — they are public — though the approved tool is still the better habit.

**6.** The inner merge keeps only the 3,906 refunded orders; \`dropna()\` then drops the 410 with a blank
reason, leaving 3,496. It reports 3,496 ÷ 48,210 = **7.3%**. The right figure is 3,906 ÷ 48,210 = **8.1%**.
Fix: left-merge with \`validate='one_to_one'\`, mark refunded = refund row present, do not drop on
\`reason\`, and take the mean of refunded.`,
    mcqs: [
      mcq('A generated query joins orders to customers on o.order_id = c.customer_id. The correct split is Pune ₹1,000 and Nagpur ₹250; the query gives Pune ₹650 and Nagpur ₹600. What does this show?', [
        ['A matching total of ₹1,250 does not prove the breakdown by city is right', true],
        ['The query is correct, since a join on any id column gives the same result', false],
        ['The total must also be wrong, since a wrong join always changes the total', false],
        ['Cancelled orders were included, which moved ₹350 from Pune to Nagpur', false],
      ], 'Each delivered order still appears once, so the total matches, but each is assigned to the wrong customer\'s city. Hand-checking a few rows\' groups catches what a total cannot.'),
      mcq('12,000 tickets are labelled in batches of 25, with 400 instruction tokens per call and tickets averaging 80 tokens. How many input tokens does the run use?', [
        ['11,52,000', true],
        ['57,60,000', false],
        ['9,60,000', false],
        ['4,80,000', false],
      ], '480 calls × (400 + 25 × 80) = 480 × 2,400 = 11,52,000. One ticket per call would be 12,000 × 480 = 57,60,000.'),
      mcq('On 100 hand-labelled tickets, "Late" has 34 correct, 43 predicted as Late in total, and 40 truly Late. What are its precision and recall?', [
        ['Precision 79.1%, recall 85.0%', true],
        ['Precision 85.0%, recall 79.1%', false],
        ['Precision 34.0%, recall 40.0%', false],
        ['Precision 82.0%, recall 82.0%', false],
      ], 'Precision is 34 ÷ 43 predicted = 79.1%; recall is 34 ÷ 40 true = 85.0%. 82% is the overall accuracy across all three themes.'),
      mcq('Your only approved AI tool is an enterprise assistant in the company tenant. Which item may go into a public chatbot?', [
        ['The orders table schema with three invented sample rows', true],
        ['Last quarter\'s unpublished revenue broken down by region', false],
        ['Support tickets that still contain customer phone numbers', false],
        ['A customer list exported to find duplicate accounts in it', false],
      ], 'A schema with invented rows contains no personal or confidential data. Unpublished revenue, unmasked tickets and customer lists stay out of unapproved tools.'),
      mcq('An inner merge of 48,210 orders with 3,906 refund rows, followed by dropna() that removes 410 rows with a blank reason, gives a refund rate of 3,496 ÷ 48,210. What is the correct rate?', [
        ['8.1%, since all 3,906 refunds count whatever their reason', true],
        ['7.3%, since refunds without a reason are not real refunds', false],
        ['100%, since every order left after the merge was refunded', false],
        ['0.9%, since only the 410 refunds without a reason are new', false],
      ], 'A blank reason does not make a refund less real. 3,906 ÷ 48,210 = 8.1%; the dropna on an optional column removed 410 genuine refunds.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_AI_ANALYST_INTERVIEW_QUESTION',
    notes: `Analyst interviews now almost always include a question about AI. Interviewers are not testing
whether you use it — everyone does — but whether you can be trusted with it. These three come up often.

## 1. "How do you use AI tools in your analysis work, and how do you make sure the numbers are right?"

**Model answer.** "I use an AI assistant mostly for drafting: a first version of a SQL query or pandas code
from a description, translating between SQL and DAX, explaining code someone else wrote, and regular
expressions. I give it the schema, a few made-up rows and the business rule — for example 'revenue means
delivered orders only' — and I ask for one step at a time.

I never report a number the AI gave me in text. Every number comes from code I ran, and I check it three
ways: row counts after each join, a known total — usually the finance figure or last month's dashboard —
and one case I can work by hand. In one project, a generated query for monthly active users gave 5 on an
eight-row test where the right answer was 4: it counted transactions not users, included failed ones, and
its BETWEEN missed the last evening of the month. I'd only have found that by hand-checking.

And I only put company data into tools the company has approved; otherwise I give the AI the schema and
synthetic rows."

**Follow-ups:**
- *"Isn't that slower than just using the AI's answer?"* "The checks take minutes. A wrong number in a
  leadership review costs far more, and after one of those nobody trusts the next number either."
- *"What if the AI's query and yours disagree?"* "I find the row-level difference — which customers or
  orders are in one and not the other — rather than picking one. That usually shows a filter or join one
  of us got wrong."

## 2. "We have 50,000 customer support tickets. Product wants to know the top complaints by next week. How would you approach it?"

**Model answer.** "First I'd read 150–200 tickets myself to draft a theme list with definitions and an
'Other'. Then I'd check what we may send where: tickets often contain phone numbers and emails, so I'd mask
them and use an approved LLM API or internal deployment.

I'd write a script that labels in batches of around 20–25, asks for JSON with the ticket id, theme and
sentiment from the fixed list, validates every reply, retries failures and logs what still fails. Before
the full run I'd pilot 100 tickets to measure tokens and estimate the cost — tokens times price per token —
and the run time.

To know whether the labels are good, I'd hand-label a random 100 — ideally with a colleague — and compute
accuracy and per-theme precision and recall. If accuracy is, say, 86%, I'd report themes as ranked shares
with that caveat, and trends over time, rather than exact percentages. The deliverable is the top three
themes with counts, a trend by week, example tickets for each, and the method and accuracy on one slide."

**Follow-ups:**
- *"Why not keyword rules?"* "They are cheap and explainable, and I'd use a few as a sanity check. But
  they miss paraphrase, negation and Hinglish, and on a test sample they are usually clearly less accurate.
  I'd show both accuracies and let the numbers decide."
- *"How would you know if the labels get worse next month?"* "Keep the prompt and theme list versioned, watch
  the share of 'Other', and re-check a fresh random 100 whenever the prompt or model changes."

## 3. "Your manager asks you to paste our customer list into a free AI chatbot to segment it. What do you do?"

**Model answer.** "I'd raise it politely before doing it. Customer names, phone numbers and purchase
history are personal data, and a free consumer chatbot is not a tool the company has an agreement with, so
it would likely break our data policy and our obligations under India's data-protection law.

Then I'd offer a way to get the same result: segmentation doesn't need names at all. I can give the AI the
column names and a few invented rows to help draft the code — RFM scores, or k-means on spend and
frequency — and run that code on the real data inside our own environment, or use the company's approved
AI tool if there is one. The manager gets the segments, and no customer data leaves."

**Follow-ups:**
- *"What if the manager insists?"* "I'd check the policy or ask the data-protection or IT team, in writing,
  so the decision is made by someone entitled to make it — and I'd still offer the safe route."
- *"Is it fine if we remove the names?"* "Better, but phone numbers, emails, addresses and even rare
  combinations of city, age and purchases can identify people. Aggregates or synthetic rows are the safe
  form."`,
    mcqs: [
      mcq('In an interview you are asked how you make sure AI-generated numbers are right. Which answer is strongest?', [
        ['I run the code myself and check row counts, a known total and one hand-worked case', true],
        ['I ask the assistant to double-check its answer, and use it if it says it is correct', false],
        ['I use the newest model available, since newer models no longer make such errors', false],
        ['I compare its answer with a second AI assistant, and use it when the two agree', false],
      ], 'Interviewers want evidence-based checks. Self-checks, newer models or a second model agreeing do not verify a number against the data.'),
      mcq('For labelling 50,000 support tickets, an interviewer asks how you would know whether the AI labels are good enough. What is the best answer?', [
        ['Hand-label a random sample and compute accuracy, precision and recall by theme', true],
        ['Check that the labels came back as valid JSON from every single API call', false],
        ['Look at the ten tickets the model was most confident about, and confirm them', false],
        ['Run the labelling twice and measure how often the two runs give the same label', false],
      ], 'Valid JSON and repeatability show the pipeline works, not that labels are right. Accuracy against a random hand-labelled sample measures correctness.'),
      mcq('Your manager insists on pasting the customer list into a free chatbot after you raise the policy concern. What is the professional response?', [
        ['Ask the data-protection or IT team in writing, and offer to run the analysis safely', true],
        ['Paste the list, since the manager has taken responsibility for the decision', false],
        ['Paste the list after deleting the names, which makes all the rows anonymous', false],
        ['Refuse and stop working on the segmentation request until it is withdrawn', false],
      ], 'The decision belongs to someone entitled to make it, and a safe alternative — synthetic rows to draft code, analysis inside the company — usually gets the manager what they need.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_AI_ANALYST_MINI_PROJECT',
    notes: `# AI-Assisted Customer Feedback Analysis

You are the analyst for a food-delivery app operating in eight Indian cities. App-store ratings fell from
4.3 to 3.9 over two quarters, and the product head wants to know why — not from a few angry reviews in a
group chat, but from all of them. You will label 2,000 app-store reviews by theme and sentiment with an LLM,
measure how accurate those labels are against a hand-labelled sample, and turn the result into a short
findings report with the top three issues and their trend.

This project uses everything in this topic: prompting with a fixed label set, an LLM API called from Python
with validated JSON, batching and a cost estimate, and measuring accuracy — plus pandas and charts from
earlier topics.

## The data

Use a public app-store review dataset for a food-delivery or similar consumer app, **or** generate one.
You need at least **2,000 reviews over at least six months** with:

| Column | Meaning |
|---|---|
| review_id | Unique id |
| review_date | Date of the review |
| rating | 1–5 stars |
| review_text | The review (English, Hinglish or mixed) |
| app_version | Version at the time of the review, if available |

If you generate data, write the reviews to be realistic and varied — different lengths, typos, Hinglish,
sarcasm, reviews that mention two problems — and keep the generator script. Public reviews contain no
contact details, but check: mask any phone numbers or email addresses before sending text anywhere.

## The questions

1. What are the main themes in the reviews, and what share of reviews does each account for?
2. Which themes are most negative, and which drive 1- and 2-star reviews?
3. How has each theme's share changed month by month — what grew as the rating fell?
4. How accurate are the AI labels, overall and by theme, and how much does that limit what you can claim?
5. What should the product team fix first, and what evidence supports it?

## Deliverables

1. **\`theme_definitions.md\`** — 5 to 8 themes plus "Other", each with a one-line definition and two example
   reviews, written after reading at least 150 reviews.
2. **\`label_reviews.py\`** (or a notebook) that:
   - reads the API key from an environment variable;
   - sends reviews in batches with a fixed theme list and sentiment list, asking for JSON with review_id;
   - validates every reply (JSON parses, ids match the batch, labels in the lists), retries with a timeout,
     and records any batch that still fails;
   - writes \`labels.csv\` (review_id, theme, sentiment) and prints the token counts used.
3. **\`hand_labels.csv\`** — a **random** sample of 100 reviews labelled by you (and, if possible, a second
   person) **before** looking at the AI labels.
4. **\`evaluate.ipynb\`** — confusion matrix, accuracy with a 95% interval, precision and recall per theme,
   the three most common confusions with examples, and the accuracy of a simple keyword-rule baseline on the
   same 100 reviews.
5. **\`findings.pdf\`** or a slide deck (5–6 slides): the one-line answer, the top three issues with their
   share and trend, a chart of theme share by month, sentiment by theme, three example reviews per top issue,
   and a method-and-limits slide stating accuracy and cost.
6. **\`README.md\`** — how to run it, the cost formula with your measured tokens (prices as variables), and
   what you would do with another week.

## Acceptance criteria

- The API key appears nowhere in the code, notebook outputs or repository history.
- Every one of the 2,000 reviews has a valid label, or appears in a logged list of failures with the
  reason; labels + failures = 2,000.
- Labels are joined to reviews by review_id, never by position.
- The hand-labelled sample is random (the sampling code is shown) and was labelled before comparing.
- Accuracy, precision and recall are computed correctly from the confusion matrix; the 95% interval is
  stated; the LLM is compared with the keyword baseline.
- The findings state shares at a precision the accuracy supports ("about a quarter", not "26.43%"), and the
  limits slide says what the labels cannot show.
- The top three issues are backed by share, trend and example reviews, and the recommendation follows from
  them.
- The cost estimate shows tokens × price per token for input and output, with prices as variables.`,
    mcqs: [
      mcq('In the mini project, 1,962 of the 2,000 reviews have valid labels; the batches holding the rest failed validation even after a retry. What must the submission show?', [
        ['The 38 unlabelled reviews logged as failures, so labels plus failures equal 2,000', true],
        ['Only the 1,962 labels, since failed batches can safely be left out of the counts', false],
        ['The 38 reviews given the most common theme, so every review has a label to show', false],
        ['A re-run of the whole project from scratch until every batch passes its validation', false],
      ], 'Labels plus logged failures must account for every review — 1,962 + 38 = 2,000 — so nothing vanishes from the counts. Guessing labels for the failed reviews hides the gap.'),
      mcq('Your LLM labels reach 84% accuracy on the random 100, and the keyword baseline 69%. How should the findings report a theme the AI put at 26.4% of reviews?', [
        ['As about a quarter of reviews, with the accuracy stated on the limits slide', true],
        ['As exactly 26.4%, since the LLM was more accurate than the keyword baseline', false],
        ['As 26.4% minus 16 points of error, which gives a corrected share of 10.4%', false],
        ['Not at all, since any accuracy below 90% makes theme shares meaningless', false],
      ], 'Labels with roughly 84% accuracy support rounded shares and trends, not decimals. Subtracting the error rate from a share is not a valid correction.'),
    ],
    assignment: {
      title: 'AI-Assisted Customer Feedback Analysis',
      description: 'Label 2,000 app-store reviews by theme and sentiment with an LLM API, measure the labels\' accuracy against a random hand-labelled sample of 100, and report the top three issues and their trend to a product head.',
      instructions: `Build the analysis described in this unit's brief and submit a repository link or a zip.

**Submit:**

1. \`theme_definitions.md\` with 5–8 themes plus Other, each defined with two example reviews.
2. \`label_reviews.py\` (or notebook): key from an environment variable, batched calls with a fixed label
   list, JSON with review_id, validation, retries with a timeout, a failure log, and printed token counts.
3. \`labels.csv\`, \`hand_labels.csv\` (random 100, with the sampling code) and the failure log.
4. \`evaluate.ipynb\`: confusion matrix, accuracy with a 95% interval, precision and recall per theme, the
   top three confusions with examples, and the keyword-baseline accuracy.
5. \`findings.pdf\` or a 5–6 slide deck: answer first, top three issues with share, trend and examples,
   sentiment by theme, and a method-and-limits slide with accuracy and the cost formula.
6. \`README.md\`: how to run, measured tokens, cost = input tokens × price_in + output tokens × price_out
   (prices as variables), and next steps.

**Before you submit,** check every acceptance criterion in the brief and record the result in the README
(for example: "labels 1,962 + logged failures 38 = 2,000 ✔"). Do not commit the API key or any personal
data.`,
      rubric: [
        { criterion: 'Labelling pipeline', description: 'Key from the environment; fixed theme and sentiment lists; batched calls asking for JSON with review_id; every reply validated (parse, ids, allowed labels); retries with a timeout; failures logged so labels plus failures equal the review count; labels joined by id.', maxPoints: 30 },
        { criterion: 'Accuracy measurement', description: 'A random 100-review sample labelled by hand before comparison; a correct confusion matrix; accuracy with a 95% interval; precision and recall per theme; the main confusions explained with examples; a keyword baseline compared on the same sample.', maxPoints: 30 },
        { criterion: 'Findings and recommendation', description: 'The top three issues backed by share, monthly trend, sentiment and example reviews; shares stated at a precision the accuracy supports; a clear recommendation for the product team that follows from the evidence.', maxPoints: 25 },
        { criterion: 'Theme design, cost and documentation', description: 'Themes written from reading real reviews, with definitions and an Other category; a cost estimate as tokens × price with prices as variables and measured token counts; a README that lets someone rerun the work and states its limits.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_AI_ANALYST_CHECKPOINT',
    notes: `Ten questions on AI for analysts: prompting for SQL, pandas and DAX, verifying what an AI produces,
working within data rules, automating labelling with an LLM API, and measuring label accuracy. Most give you
figures — work out the answer before looking at the options.`,
    checkpoint: [
      ck(PE, 'A prompt for a weekly-revenue query gives the schema and the dialect. Which further detail is most likely to change the query the model writes?', [
        ['That only DELIVERED orders count and that weeks start on Monday in IST', true],
        ['That the query will be run by the analytics team every Monday morning', false],
        ['That the orders table has about forty lakh rows across three years', false],
        ['That the result will be pasted into the weekly email to the sales head', false],
      ], 'Business rules — which orders count, how a week is defined, the time zone — change the SQL. Who runs it or where the result goes does not.'),
      ck(PE, 'You ask an AI for a DAX "Revenue LY" measure and get CALCULATE(SUM(Sales[NetAmount]), YEAR(Sales[OrderDate]) = YEAR(TODAY()) - 1). What should the next prompt add?', [
        ['The marked date table, its relationship to Sales, the existing [Revenue] measure, and the visual', true],
        ['A request to write the same measure again using shorter names for every column', false],
        ['A request for a calculated column instead, since measures cannot look back a year', false],
        ['The current date, so that TODAY() returns the right year when the report is refreshed', false],
      ], 'Without the model\'s structure, the AI hard-coded a calendar year and filtered the fact table. Given the date table and existing measure, it can write CALCULATE([Revenue], SAMEPERIODLASTYEAR(\'Date\'[Date])).'),
      ck(PE, 'An AI-drafted query returns 4,812 customers; you know 3,950 have a delivered order. Which follow-up prompt is best?', [
        ['Give both counts and say the order_items join probably multiplies the rows', true],
        ['Ask the model to try a completely different approach to the same question', false],
        ['Ask the model to explain why its first answer of 4,812 was in fact correct', false],
        ['Ask for the query again with a LIMIT so the result stays under 3,950 rows', false],
      ], 'Evidence plus a hypothesis lets the model fix the actual fault. A fresh attempt is another guess, and a LIMIT hides the error.'),
      ck(PE, 'Which instruction in a review-labelling prompt does most to keep labels consistent across 100 batches?', [
        ['A fixed list of themes with one-line definitions, and "use exactly one of these"', true],
        ['"Be as accurate and careful as you possibly can when you label these reviews"', false],
        ['"Use whatever theme names best describe each review in your own words"', false],
        ['"Answer in a friendly tone, as the labels will be read by the product team"', false],
      ], 'A closed label set with definitions stops names drifting from batch to batch, and validation can then reject anything outside it.'),
      ck(LLM, 'A query joining 48,210 orders to payments returns 41,975 rows, and the cash-on-delivery share comes out at zero. What happened?', [
        ['An inner join dropped the 6,235 orders that have no payments row', true],
        ['The payments table duplicated 6,235 digital orders during the join', false],
        ['Cash orders were filtered by a WHERE clause on the payment status', false],
        ['The join key was cast to text, which removed rows with leading zeros', false],
      ], 'Cash-on-delivery orders have no payments row, so an inner join removes them — 12.9% of orders. A left join keeps them.'),
      ck(LLM, 'A March revenue query is 3.2% below finance every year; it uses BETWEEN \'2025-03-01\' AND \'2025-03-31\' on a timestamp. What is the cause?', [
        ['Sales after midnight at the start of 31 March are left out of the month', true],
        ['BETWEEN rounds every timestamp down to the hour before comparing them', false],
        ['The query counts 1 March twice, which finance then removes as a duplicate', false],
        ['Finance includes April sales in March, which makes its figure larger', false],
      ], 'The upper bound is 2025-03-31 00:00:00, so almost a whole day — about 1/31, or 3.2% — is missed. Use < \'2025-04-01\'.'),
      ck(LLM, 'Which data may an analyst send to an LLM API that the company has not approved?', [
        ['Column names with a few invented rows to get help drafting code', true],
        ['Support tickets after removing only the customers\' first names', false],
        ['Unreleased monthly revenue, as long as the city names are removed', false],
        ['A sample of 50 real customer rows, as long as it is under 100 rows', false],
      ], 'Only data with no personal or confidential content can go to an unapproved tool. Partial removal or small samples still expose real customers and business data.'),
      ck(LLM, 'A labelling run costs input tokens × price_in + output tokens × price_out. Batching 20 reviews per call instead of one cuts which part, and why?', [
        ['Input tokens, because the instructions are sent once per call, not per review', true],
        ['Output tokens, because the model writes shorter labels when given many reviews', false],
        ['Both equally, because the provider gives a discount on larger requests', false],
        ['Neither, because tokens are counted per review whatever the batch size', false],
      ], 'The instructions are repeated on every call, so fewer calls means fewer input tokens. Output is roughly one label per review either way.'),
      ck(LLM, 'On a random 100 hand-labelled reviews, the App bugs theme has 17 correct out of 19 predicted and 20 truly about bugs. What are precision and recall?', [
        ['Precision 89.5%, recall 85.0%', true],
        ['Precision 85.0%, recall 89.5%', false],
        ['Precision 17.0%, recall 20.0%', false],
        ['Precision 86.0%, recall 86.0%', false],
      ], 'Precision = 17 ÷ 19 predicted = 89.5%; recall = 17 ÷ 20 true = 85.0%.'),
      ck(LLM, 'After a prompt change, an analyst re-measures label accuracy on the same 100 reviews she used to tune the new prompt, and gets 93%. Why is this figure optimistic?', [
        ['The prompt was tuned on those reviews, so a fresh random sample is needed', true],
        ['A sample of 100 is always too small to estimate any accuracy at all', false],
        ['Accuracy must be measured on reviews the model has never been trained on', false],
        ['The hand labels change each time they are compared with new AI labels', false],
      ], 'Fixing the errors you saw on a sample makes that sample look better than new data will. A fresh random sample gives an honest estimate.'),
    ],
  },
];
