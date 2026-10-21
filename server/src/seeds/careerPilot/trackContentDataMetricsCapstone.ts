/**
 * Career-track content: business metrics and storytelling, and the capstone (Data Analytics + AI, batch A4).
 *
 * DT_METRICS_STORY — choosing and defining metrics, funnels, retention and unit economics, finding why a
 * metric moved, telling the story in the data and working with stakeholders, ending with a mini project that
 * diagnoses an 18% drop in a food-delivery app's orders. Single-skill (BUSINESS_METRICS), so its questions
 * carry no skillKey.
 * DT_CAPSTONE_DA — the track's capstone: a scoped brief, the analysis build (SQL, pandas, statistics), the
 * dashboard and AI build (Power BI, an LLM labelling step with measured accuracy), demo day, and a checkpoint
 * across the whole track. Multi-skill [BUSINESS_METRICS, DASHBOARDING, LLM_APPLICATIONS] with
 * BUSINESS_METRICS as the default, so every checkpoint question names its skill with ck(), following
 * trackSkillAttribution.ts.
 *
 * Every rupee figure, rate, decomposition and accuracy figure was computed in Python (pandas 3.0, NumPy 2.5,
 * SciPy 1.18); both data generators were run and the figures quoted from them are their real output. AI
 * tools are described vendor-neutrally and at the level of documented, stable behaviour; their features change
 * often and depend on the licence.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const BM = 'BUSINESS_METRICS';
const DASH = 'DASHBOARDING';
const LLM = 'LLM_APPLICATIONS';

export const TRACK_DATA_METRICS_CAPSTONE_BUNDLES: PilotBundle[] = [
  /* ══ DT_METRICS_STORY ════════════════════════════════════════════════════════════════════ */

  /* ── KPIS ──────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_METRICS_STORY_KPIS',
    notes: `You can now pull any number out of SQL, pandas or Power BI. The harder question — the one a hiring manager
actually tests — is **which** number. A company can track a thousand things; it can steer by about five. This
unit is about choosing those five and defining each one so precisely that two analysts compute the same value.

## Vanity metrics and KPIs

A **vanity metric** goes up and to the right and makes a slide look good, but nobody can act on it and it does
not track whether the business is healthier. A **KPI** (key performance indicator) is tied to a goal, moves when
the business really gets better or worse, and suggests an action when it moves.

| Business | Vanity metric | KPI that matters |
|---|---|---|
| Edtech app | Total app downloads (4.2 lakh!) | Weekly learners who complete at least one lesson |
| Food delivery | Restaurants listed | Orders delivered per week, and repeat-order rate |
| Fintech (UPI + bill pay) | Registered users | Monthly transacting users |
| Retail chain | Footfall counted at the door | Revenue per store per day, like-for-like growth |
| D2C brand | Instagram followers | Repeat-purchase rate within 90 days |

Downloads are cumulative — they can only rise, even in a month when half your learners quit. "Weekly learners
completing a lesson" can fall, which is exactly why it is useful.

A quick test for any metric: **"If this number doubled tomorrow, would we be sure the business is better? And if
it fell, would we know what to do?"** If either answer is no, it is not a KPI.

## The north-star metric

Many product companies pick one **north-star metric** — the single number that best captures the value customers
get, and that predicts revenue. Examples:

- Food delivery: **orders delivered per week** (each one is a customer who got value and paid).
- A UPI/bill-pay app: **monthly transacting users** — not sign-ups, which cost money and earn nothing.
- An edtech subscription: **weekly active learners** (completing at least one lesson).

A north star is supported by **input metrics** that teams can move directly: for food delivery, restaurant
availability, delivery time, app conversion, and new-user activation. Teams own inputs; leadership watches the
north star.

## Leading and lagging indicators

A **lagging** indicator tells you what already happened (monthly revenue, quarterly renewals). A **leading**
indicator moves first and predicts it.

An edtech company found that of 10,000 learners who signed up in March, **3,100 completed a lesson in their first
week**. Three months later, **27%** of those 3,100 renewed (837 learners), against **6%** of the other 6,900 (414
learners). Overall renewal was 1,251 / 10,000 = **12.5%**. "First-week lesson completion" is a leading indicator for
renewal: the product team can see it within seven days and act on it, instead of waiting three months for the
renewal number. (It is a correlation, so the team should test whether *pushing* first-week completion raises
renewal — the A/B testing topic is how.)

## Defining a metric precisely enough to compute

"Conversion rate" is not a definition. A definition names five things:

1. **Numerator** — what is counted (orders? distinct users who ordered?).
2. **Denominator** — out of what (sessions? users? users who reached checkout?).
3. **Time window and time zone** — calendar day in IST, rolling 7 days, Monday–Sunday week.
4. **Filters** — exclude test accounts, staff orders, cancelled orders, bots.
5. **Grain** — per user, per session, per order.

The same week of data at a fashion e-commerce site:

| Definition | Calculation | Value |
|---|---|---|
| Orders per session | 3,600 orders ÷ 1,20,000 sessions | **3.0%** |
| Users who ordered per user | 3,000 users ÷ 48,000 users | **6.25%** |

Both are "conversion", and one is more than double the other. If marketing reports one and product reports the
other, the meeting is spent arguing about numbers instead of decisions. Write the definition down — in a metrics
dictionary, a DAX measure description, or a comment above the SQL — and reuse it everywhere.

A good written definition looks like this:

> **Weekly active learners (WAL).** Distinct \`user_id\`s with at least one \`lesson_completed\` event between Monday
> 00:00 and Sunday 23:59 IST. Excludes accounts with \`is_internal = 1\` and accounts created by the QA team.
> Source: \`events\` table. Owner: Growth analytics.

## Counter-metrics (guardrails)

Every KPI can be gamed. Push "orders delivered" with deep discounts and margin collapses; push "average delivery
time" down and restaurants get fewer orders because the radius shrinks. Pair each KPI with a **counter-metric**:
orders with contribution margin per order; delivery time with order cancellations; tickets closed with tickets
reopened.

## How many metrics?

For a business review: **one north star, three to five KPIs, a guardrail for each**. Everything else is a
diagnostic metric you look at only when a KPI moves.`,
    mcqs: [
      mcq('An edtech startup reports "4.2 lakh total downloads, up every month". Why is this a weak KPI?', [
        ['It is cumulative and cannot fall even when learners quit', true],
        ['Downloads are too hard to count accurately on Android', false],
        ['It is a lagging indicator, and KPIs must always be leading', false],
        ['It is a large number, and KPIs should be small percentages', false],
      ], 'A cumulative count only rises, so it cannot signal a problem. A KPI must be able to fall when the business gets worse — weekly learners completing a lesson can.'),
      mcq('One analyst reports conversion as 3.0% and another as 6.25% for the same week at a fashion site. What most likely explains it?', [
        ['They used different denominators: sessions versus users', true],
        ['One of them forgot to exclude all the cancelled orders', false],
        ['One of them used the median rather than the mean', false],
        ['The two dashboards refresh at different times of day', false],
      ], '3,600 orders ÷ 1,20,000 sessions = 3.0%; 3,000 ordering users ÷ 48,000 users = 6.25%. Both are valid; the metric must say which one it is.'),
      mcq('A food-delivery team is told to cut average delivery time. Which counter-metric should be watched alongside it?', [
        ['Orders lost because restaurants fell outside the radius', true],
        ['The number of restaurants that joined in that month', false],
        ['Average delivery time measured in seconds instead', false],
        ['Total downloads of the delivery partner app in that month', false],
      ], 'The easiest way to cut delivery time is to shrink the delivery radius, which loses orders. The counter-metric catches the KPI being improved at the business\'s expense.'),
    ],
    checkpoint: [
      mcq('A UPI and bill-payment app wants one north-star metric. Which choice best reflects value delivered to customers?', [
        ['Monthly transacting users', true],
        ['Total registered users so far', false],
        ['App-store rating this month', false],
        ['Number of push alerts sent', false],
      ], 'A user who transacts got value and generates revenue. Registrations are cumulative and cost money, ratings are noisy, and notifications sent measure effort, not value.'),
      mcq('Of 3,100 learners who finished a lesson in week one, 27% renewed; of the other 6,900, 6% renewed. What is the overall renewal rate?', [
        ['12.5%', true],
        ['16.5%', false],
        ['33.0%', false],
        ['10.2%', false],
      ], '0.27 × 3,100 = 837 and 0.06 × 6,900 = 414, so 1,251 of 10,000 renewed: 12.5%. Averaging 27% and 6% (16.5%) ignores that the groups differ in size.'),
      mcq('Which of these is a definition of "weekly active learners" that two analysts would compute identically?', [
        ['Distinct users with a lesson_completed event, Mon–Sun IST, internal accounts excluded', true],
        ['Learners who were active on the platform at some point or other during the recent week', false],
        ['Users who opened the app in the last week, as shown on the product dashboard', false],
        ['All learners counted on the weekly engagement chart, minus the obvious test users', false],
      ], 'A precise definition names the event, the window and time zone, the grain (distinct users) and the filters. "Active", "recent" and "obvious" leave each analyst to decide differently.'),
    ],
  },

  /* ── UNIT_ECONOMICS ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_METRICS_STORY_UNIT_ECONOMICS',
    notes: `Three families of numbers come up in almost every analyst interview and every business review: **funnels**
(how many people get from step to step), **retention** (how many come back), and **unit economics** (whether each
customer or order makes or loses money). Each is simple arithmetic; the skill is choosing the right base.

## Funnels

An e-commerce site's checkout funnel for one week:

| Step | Users | Step conversion | From visit |
|---|---|---|---|
| Visited | 2,00,000 | — | 100% |
| Viewed a product | 1,10,000 | 55% | 55.0% |
| Added to cart | 22,000 | **20%** | 11.0% |
| Started checkout | 9,900 | 45% | 4.95% |
| Placed order | 6,930 | 70% | **3.47%** |

Two readings, both needed:

- **Step conversion** finds the weakest step: only 20% of product viewers add to cart. That is where product
  pages, price or delivery promise lose people.
- **Overall conversion** (6,930 ÷ 2,00,000 = 3.465%) is what the business reports.

In pandas:

    import pandas as pd
    f = pd.DataFrame({"step": ["visit", "view", "cart", "checkout", "order"],
                      "users": [200000, 110000, 22000, 9900, 6930]})
    f["step_conv"] = f["users"] / f["users"].shift(1)
    f["overall"] = f["users"] / f["users"].iloc[0]

Funnels must be built **per user, in order, within a window** — a user counts at "checkout" only if they also
viewed a product in the same session or day. A funnel built from separate event counts can show a step above
100%.

## Retention and churn

**Retention** is the share of a starting group still active after some time; **churn** is the share that left.
Always compute it per **cohort** — users grouped by when they started.

A fintech app's January cohort of 8,000 new users:

| Month | Active | Retention |
|---|---|---|
| M0 (January) | 8,000 | 100% |
| M1 | 3,600 | 45% |
| M2 | 2,800 | 35% |
| M3 | 2,400 | 30% |

The curve falls steeply and then flattens — normal for consumer apps. The flat part (here about 30%) is the core
of users who found real value. Product teams try to lift that floor.

In pandas, from an \`events\` table with \`user_id\` and \`month\` (a monthly Period):

    first = events.groupby("user_id")["month"].min().rename("cohort")
    e = events.join(first, on="user_id")
    e["age"] = (e["month"] - e["cohort"]).apply(lambda d: d.n)     # months since start
    counts = e.groupby(["cohort", "age"])["user_id"].nunique().unstack()
    retention = counts.div(counts[0], axis=0)

## Average order value and frequency

**AOV** = revenue ÷ orders. If the week's 6,930 orders brought ₹29,45,000, AOV = **₹425**. Revenue can always be
split as **customers × orders per customer × AOV** — the decomposition used in the next unit.

## CAC, LTV and payback

- **CAC** (customer acquisition cost) = acquisition spend ÷ new customers acquired. ₹18 lakh on ads and referral
  bonuses for 6,000 new paying customers → CAC = **₹300**.
- **LTV** (lifetime value) = the margin a customer brings over their life. For a subscription with constant churn:

      LTV = (monthly revenue per customer × gross margin) ÷ monthly churn

  An edtech plan at ₹499 a month, 70% gross margin, 8% monthly churn: 499 × 0.70 ÷ 0.08 = **₹4,366**.
- **LTV ÷ CAC**: with CAC ₹1,200, the ratio is **3.6**. A common rule of thumb is that above about 3 is healthy and
  below 1 means each customer loses money.
- **Payback period** = CAC ÷ monthly margin per customer = 1,200 ÷ 349.30 = **3.4 months**. Payback matters to a
  startup's cash even when LTV looks good.

Two warnings. **Use margin, not revenue** — LTV on revenue makes every business look profitable. And **the churn
formula assumes constant churn**, which real cohorts never have: churn is high in month one and low later. The
worked example shows how to compute LTV from the cohort curve instead.

## Contribution margin per order

For a marketplace, the unit is often the **order**. A food-delivery order with AOV ₹420: commission 22% (₹92.40) +
delivery fee charged ₹25 − delivery partner cost ₹55 − platform discount ₹30 − payment cost 2% (₹8.40) = **₹24.00**
contribution. Raise the discount to ₹45 and it falls to **₹9.00**. A "growth" campaign can make every extra order
nearly worthless — which is why discounts are tested against contribution, not orders.`,
    workedExample: `**Task: an edtech app sells a ₹399-a-month plan with a 75% gross margin. Marketing spends ₹900 to acquire each
paying learner. The CFO asks: "Do we earn back what we spend, and when?"**

**Step 1 — Do not reach for the formula first.** Monthly churn is not constant here; the cohort data shows it.
Retention of the paying cohort, month by month (M0 = the month they first paid):

    import numpy as np
    ret = np.array([100, 62, 48, 41, 37, 34, 32, 30, 29, 28, 27, 26]) / 100
    churn = 1 - ret[1:] / ret[:-1]     # 38%, 22.6%, 14.6%, 9.8%, ... about 3–4% by month 8

Month-one churn is **38%**; by months 8–11 it is about **3–4%**. A single "churn rate" would be wrong either way:
using 38% gives LTV = 399 × 0.75 ÷ 0.38 = ₹788; using 4% gives ₹7,481 — a tenfold disagreement.

**Step 2 — LTV from the curve.** Each month's expected margin per acquired learner = retention × ₹399 × 0.75
(₹299.25):

    margin = ret * 399 * 0.75
    margin.sum()            # 1478.30  — 12-month LTV
    np.cumsum(margin)       # 299, 485, 628, 751, 862, 964, ...

Over twelve months the average acquired learner pays for **4.94 months** (the sum of the retention column) and
brings **₹1,478** of margin. LTV/CAC = 1,478 ÷ 900 = **1.6**.

**Step 3 — Payback.** Cumulative margin passes ₹900 in the **sixth paid month** (₹862 after five, ₹964 after six).

**Step 4 — The answer, in the CFO's terms.**

> "Yes, but slowly. Each ₹900 spent on acquisition earns back about ₹1,478 in margin in the first year — 1.6 times
> the cost — and it takes six months of payments to break even. The weak spot is the first month: 38% of new payers
> leave after one month. Cutting that to 30% would be worth more than a 10% cut in ad spend, so I would put the next
> experiment there."

**Why this is the right method:** the cohort curve uses what customers actually did. The constant-churn formula is a
shortcut for when churn really is roughly flat — check that before using it, and say which you used.`,
    mcqs: [
      mcq('In the funnel 2,00,000 visits → 1,10,000 product views → 22,000 add-to-cart → 9,900 checkout → 6,930 orders, which step has the lowest step conversion?', [
        ['Product view to add-to-cart, at 20%', true],
        ['Visit to product view, at 55%', false],
        ['Checkout to order, at 70%', false],
        ['From add-to-cart to checkout, at 45%', false],
      ], '22,000 ÷ 1,10,000 = 20%, the weakest step. The largest absolute loss is at the first step, but the lowest rate points to where the page, price or delivery promise loses people.'),
      mcq('A plan costs ₹499 a month at a 70% gross margin, monthly churn is 8%, and CAC is ₹1,200. What is LTV ÷ CAC using the constant-churn formula?', [
        ['About 3.6', true],
        ['About 5.2', false],
        ['About 0.4', false],
        ['About 2.4', false],
      ], 'LTV = 499 × 0.70 ÷ 0.08 = ₹4,366; 4,366 ÷ 1,200 = 3.6. Using revenue instead of margin gives ₹6,238 and 5.2, which overstates the value.'),
      mcq('A food-delivery order earns ₹24 in contribution. The growth team proposes raising the platform discount from ₹30 to ₹45. What happens to contribution per order if nothing else changes?', [
        ['It falls to ₹9', true],
        ['It falls to ₹0', false],
        ['It rises to ₹39', false],
        ['It stays at ₹24', false],
      ], 'Every extra rupee of discount comes straight out of contribution: 24 − 15 = ₹9. The campaign must bring enough extra orders to make up for the thinner margin on all of them.'),
    ],
    checkpoint: [
      mcq('A fintech app\'s January cohort of 8,000 users has 2,400 active in month 3. A colleague reports "month-3 churn is 70%". Which reading is more useful?', [
        ['Month-3 retention is 30%, and the cohort curve shows when users leave', true],
        ['Month-3 churn is 70%, so the product is failing for nearly all of its users', false],
        ['Monthly churn is 23.3%, found by dividing the 70% evenly by three months', false],
        ['Retention cannot be measured until the cohort is at least one year old', false],
      ], '2,400 ÷ 8,000 = 30% retained. The full curve (45%, 35%, 30%) shows a steep first-month drop that flattens — a single churn figure, or an even split, hides that shape.'),
      mcq('An edtech cohort\'s churn is 38% in month one and about 4% by month ten. Why is LTV = margin ÷ churn a poor estimate here?', [
        ['The formula assumes churn is constant, and it clearly is not', true],
        ['The formula only works for e-commerce orders and not for plans', false],
        ['The formula needs revenue rather than margin to be correct', false],
        ['The formula ignores CAC, which must be subtracted first', false],
      ], 'With churn falling sharply, plugging in 38% gives ₹788 and 4% gives ₹7,481. Summing margin over the actual retention curve uses what customers really did.'),
      mcq('An ad campaign cost ₹18 lakh and brought 6,000 new paying customers, plus 2,000 sign-ups who never paid. What is the CAC per paying customer?', [
        ['₹300', true],
        ['₹225', false],
        ['₹900', false],
        ['₹150', false],
      ], 'CAC is spend divided by the customers the business is paying to acquire: ₹18,00,000 ÷ 6,000 = ₹300. Counting free sign-ups (8,000) gives ₹225 and makes acquisition look cheaper than it is.'),
    ],
  },

  /* ── ROOT_CAUSE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_METRICS_STORY_ROOT_CAUSE',
    notes: `"Revenue is down 8% this week — why?" is the most common message an analyst gets, usually at 9:40 on a Monday.
Answering it well is a method, not a flash of insight. Follow the same five steps every time, in this order.

## Step 1 — Is the drop real? Check the data first

Before explaining a change, rule out that the **measurement** changed. A large share of "drops" are:

- **Partial data** — today's bar compared with full days; a pipeline that loaded 5 of 6 cities.
- **A tracking change** — an app release moved or renamed an event; a new analytics tag counts page refreshes as
  sessions.
- **A definition change** — someone edited the measure, the filter, or the time zone (UTC vs IST moves every order
  between 00:00 and 05:30 IST to the previous day).
- **Duplicates or missing joins** — a join that fans out, or a lookup table missing new stores.

Quick checks: compare the dashboard number with the source table; compare with an independent source (payments
received, the finance ledger); look at row counts by day and by source; ask "was anything released or changed
on that date?"

## Step 2 — Internal or external?

Was there a release, a price change, a campaign ending, an outage? Or a festival, exam season, a cricket final,
heavy rain in one city, a competitor's sale? Keep a **calendar of events** next to your metrics. Many "mysteries"
are on it.

## Step 3 — Segment

Split the change by every dimension you have: city, platform (Android/iOS/web), new vs returning, channel, product
category, payment method. You are looking for **concentration**: is the drop everywhere (points to something broad
— seasonality, pricing, a macro event) or in one segment (points to something specific — a release on one
platform, a problem in one city)?

    t = df[df["week"].isin([prev, last])].pivot_table(
        index="platform", columns="week", values="orders", aggfunc="sum")
    t["change"] = t[last] - t[prev]
    t["share_of_drop"] = t["change"] / t["change"].sum()

\`share_of_drop\` is the key column. A segment with 60% of the volume and 100% of the drop is your lead.

## Step 4 — Decompose the metric

Write the metric as a product of parts, and see which part moved:

    Revenue = visitors × conversion × average order value
    Orders  = sessions × conversion
    GMV     = active customers × orders per customer × AOV

A retail chain's week:

| | Last week | This week | Change |
|---|---|---|---|
| Footfall | 52,000 | 50,500 | −2.9% |
| Conversion (bills ÷ footfall) | 31% | 29% | −6.5% |
| Average bill (ATV) | ₹1,450 | ₹1,465 | +1.0% |
| Revenue | ₹2,33,74,000 | ₹2,14,54,925 | **−8.2%** |

Conversion is the biggest mover. To split the ₹19.2 lakh fall exactly, use logs: each factor's share is
ln(new/old) ÷ ln(total new/old). Footfall explains **34%** (₹6.6 lakh), conversion **78%** (₹14.9 lakh), and the
higher average bill offsets **−12%** (+₹2.3 lakh). Now the question is narrower: *why did fewer walk-ins buy?*
— stock-outs, long billing queues, a price change.

## Watch for the mix effect

Sometimes **no segment changed at all** and the total still moved. An e-commerce site converts 4.0% on the app and
2.0% on web — both unchanged this week. But a web campaign changed the traffic mix from 60% app to 45% app:

    0.60 × 4.0% + 0.40 × 2.0% = 3.2%   (last week)
    0.45 × 4.0% + 0.55 × 2.0% = 2.9%   (this week)

Overall conversion "fell" from 3.2% to 2.9% while every segment held steady. That is a **mix shift**, not a
performance problem — and the report should say so, or the app team will spend a week hunting a bug that does not
exist.

## Step 5 — Seasonality versus a real change

Compare like with like: this Tuesday with last Tuesday (weekday pattern), this week with the same week last year
(festivals move — Diwali can fall in October or November), and the change against normal week-to-week noise. If
orders move ±3% in an ordinary week, a 2% drop needs no explanation; an 18% drop does.

## Write it up as you go

Keep a short log: what you checked, what you found, what you ruled out. "Not data: payments ledger shows the same
drop. Not seasonal: same week last year was flat. Concentrated: Pune is 85% of the drop." That log is half of
the final answer.`,
    workedExample: `**Task: a quick-commerce app's GMV for September is ₹3.02 crore against ₹3.12 crore in August (−3.2%). The
category head asks whether marketing is to blame because "visitors were down".**

**Step 1 — Check the data.** The GMV matches the payments ledger within 0.2%, and order counts by day show no gaps.
The drop is real.

**Step 2 — Decompose.**

| | August | September |
|---|---|---|
| Visitors | 9,00,000 | 9,60,000 |
| Conversion | 2.8% | 2.5% |
| AOV | ₹1,240 | ₹1,260 |
| Orders | 25,200 | 24,000 |
| GMV | ₹3,12,48,000 | ₹3,02,40,000 |

    import math
    old = dict(visitors=900_000, conv=0.028, aov=1240)
    new = dict(visitors=960_000, conv=0.025, aov=1260)
    gmv_old = old["visitors"] * old["conv"] * old["aov"]        # 31,248,000
    gmv_new = new["visitors"] * new["conv"] * new["aov"]        # 30,240,000
    total = math.log(gmv_new / gmv_old)
    for k in old:
        share = math.log(new[k] / old[k]) / total
        print(k, round(share, 2), round((gmv_new - gmv_old) * share))
    # visitors -1.97  +19,83,995
    # conv      3.46  -34,83,865
    # aov      -0.49   +4,91,870

**Step 3 — Read it.** Visitors were **up** 6.7%, not down, and added about ₹19.8 lakh. AOV rose and added ₹4.9 lakh.
Conversion fell from 2.8% to 2.5% (−10.7%) and removed ₹34.8 lakh — more than the whole drop. Marketing brought
more people; fewer of them bought.

**Step 4 — Next question, not a conclusion.** Segment conversion by traffic source: if the extra 60,000 visitors came
from a new low-intent channel (say a coupon aggregator), the mix effect explains much of it. If conversion fell on
existing channels too, look at availability, delivery slots and prices.

**The message:** "September GMV fell 3.2% because conversion fell from 2.8% to 2.5%; traffic was actually up 6.7%.
I am now checking whether the new traffic converts worse or whether conversion fell across the board."`,
    mcqs: [
      mcq('Daily orders on a food app look 35% lower today in a dashboard viewed at 2 p.m. What should be checked before anything else?', [
        ['Whether today is a partial day compared against full days', true],
        ['Whether competitors cut their prices earlier today', false],
        ['Whether the drop is spread evenly across every single city', false],
        ['Whether the delivery partners were paid on time', false],
      ], 'Step one is ruling out a measurement problem. A day that is only 14 hours old will always look lower than full days; compare the same hours instead.'),
      mcq('App conversion stays at 4.0% and web at 2.0%, yet overall conversion falls from 3.2% to 2.9%. What is the explanation?', [
        ['The traffic mix shifted towards the lower-converting web', true],
        ['There is a tracking bug that affects both platforms equally', false],
        ['Both platforms got worse by an amount too small to see', false],
        ['Overall conversion must be computed incorrectly somewhere', false],
      ], 'With app share falling from 60% to 45%, the weighted average falls even though neither segment changed: 0.45 × 4% + 0.55 × 2% = 2.9%.'),
      mcq('Footfall fell 2.9%, conversion fell from 31% to 29%, and average bill rose 1%. Which factor explains most of an 8.2% revenue fall?', [
        ['Conversion, at about 78% of the fall', true],
        ['Footfall, at about 34% of the fall', false],
        ['Average bill, at about 12% of the fall', false],
        ['All three in equal parts of a third', false],
      ], 'Using log shares, conversion accounts for about 78%, footfall 34%, and the higher average bill offsets 12%. The next question is why fewer visitors bought.'),
    ],
    checkpoint: [
      mcq('Orders fell 4% this week. Segmenting by platform shows iOS is 20% of orders but 90% of the drop. What does that suggest?', [
        ['A cause specific to iOS, such as a release, is likely', true],
        ['A broad cause, like seasonality, affected every platform', false],
        ['The iOS drop is random noise and can safely be ignored', false],
        ['iOS users have all moved over to the Android app instead', false],
      ], 'A drop concentrated in one segment points to something specific to it. A seasonal or market-wide cause would show up across platforms in proportion to their size.'),
      mcq('An analyst compares Diwali week\'s orders with the ordinary week before and reports a 40% rise "from the new campaign". What is the flaw?', [
        ['Festival seasonality is not separated from the campaign effect', true],
        ['A 40% rise is far too large to be measured with daily data', false],
        ['Orders should only be compared month to month, never week to week', false],
        ['Campaign effects can only be measured in revenue, not orders', false],
      ], 'Comparing a festival week with an ordinary week mixes seasonality into the result. Compare with the same festival period last year, or use a holdout group.'),
      mcq('Monthly GMV fell 3.2%. Visitors rose 6.7%, AOV rose 1.6%, and conversion fell from 2.8% to 2.5%. What is the right summary?', [
        ['Conversion fell enough to outweigh more visitors and higher AOV', true],
        ['Fewer visitors came, which is the reason GMV fell during the month', false],
        ['AOV fell, so customers bought cheaper items than in August', false],
        ['GMV fell because of all three factors moving together', false],
      ], 'Decomposing GMV = visitors × conversion × AOV shows conversion removed about ₹34.8 lakh while visitors and AOV added about ₹24.8 lakh back.'),
    ],
  },

  /* ── STORYTELLING ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_METRICS_STORY_STORYTELLING',
    notes: `An analysis nobody acts on was a waste of a week. Managers read your work in the two minutes between meetings,
so the structure has to do the work: **the answer first, the evidence next, the action last.** This unit gives you
one structure that fits almost every analysis, and the rules for the charts inside it.

## The one-line answer first

Analysts are trained to tell the story in the order they did the work: "First I pulled the data, then I cleaned it,
then I looked at cities…". The reader wants the opposite order. Lead with the answer:

> **Weak:** "We analysed October sales data for the eight Pune stores across categories, days and payment modes."
> **Strong:** "Pune revenue fell 9% in October because three stores ran out of staples during a distributor
> dispute; restoring supply should recover about ₹18 lakh a month."

If the reader stops after one sentence, they should still know what happened and what to do. This is often called
the **pyramid principle**: the main point at the top, supporting points under it, details under those.

## Three supporting points

Under the answer, give **three** (rarely more) supporting points, each a full sentence that could be checked:

1. "The fall is in three of the eight stores: they lost 24% of their revenue while the other five grew 2%." (The
   three bring 42% of Pune's revenue, so 0.42 × −24% + 0.58 × +2% ≈ −9%.)
2. "Customers still came in — footfall was flat — but fewer bought: conversion in those stores fell from 34% to 27%."
3. "It began on 6 October, when out-of-stock staples in those stores jumped from 2% to 31% of SKUs."

Each point is a claim plus the number that proves it. "Those stores were interesting" is not a point.

## One chart per point, and the title says the point

Every chart answers one question, and its **title states the answer**, not the topic:

| Topic title (weak) | Message title (strong) |
|---|---|
| "Revenue by store" | "Three Pune stores lost 24% of revenue; the other five grew 2%" |
| "Stock availability trend" | "Staples stock-outs jumped from 2% to 31% on 6 October" |
| "Revenue by region, FY25" | "South grew fastest, but West still brings the most revenue" |

Then design the chart so the reader sees that answer in three seconds:

- **Highlight** the bar or line that matters in a strong colour; grey everything else.
- **Annotate** the event directly on the chart ("distributor dispute begins") instead of in a legend.
- **Start bar charts at zero**; a line chart of a rate may zoom in, but label the axis clearly.
- **Remove** gridlines, 3D effects, data labels on every point, and legends you can replace with direct labels.
- One chart, one message. If you need to say "and also…", that is a second chart.

## Situation, complication, resolution

For a longer story — a deck or a written report — a reliable arc is:

- **Situation**: what the reader already knows. "Pune stores have grown 5–7% a year."
- **Complication**: what changed or what is at risk. "October revenue fell 9%, and Diwali stock is due next week."
- **Resolution**: what you found and recommend. "Three stores lost their staples supply; switch them to the backup
  distributor now."

## End with the action

Every analysis ends with **what the reader should do next**, who should do it, and what it is worth:

> "Recommendation: move the three stores to the backup distributor this week (supply team), and add an alert when
> staples availability in any store falls below 95% (analytics). Expected recovery: about ₹18 lakh of revenue a
> month."

If the evidence does not support a recommendation, say what decision it **does** support, or what extra data would
settle it. "Inconclusive — we need two more weeks of data to tell" is a legitimate ending; a vague one is not.

## Caveats in proportion

State limitations honestly but briefly, after the main story: "October had one more Sunday than last October; removing that
effect changes the fall from 9% to about 10%, so it does not affect the conclusion." A caveat that changes the
answer belongs in the answer.

## The five-slide shape

1. **Title slide with the answer** as its headline.
2. **What happened** — the main metric over time, with the event marked.
3. **Where** — the segment breakdown that locates it.
4. **Why** — the evidence for the cause.
5. **What to do** — recommendation, owner, expected impact, how we will know it worked.

Appendix slides hold methods and extra cuts for whoever asks.`,
    mcqs: [
      mcq('Which opening line of an analysis report follows the "answer first" structure?', [
        ['Pune revenue fell 9% because three stores ran out of staples in October', true],
        ['We analysed October sales data across the eight Pune stores and categories', false],
        ['This report covers the data sources, the cleaning steps and the method', false],
        ['Several interesting patterns appeared in last week\'s order data', false],
      ], 'The first line should carry the finding and its cause, so a reader who stops there still knows what happened. Method and scope go later or in an appendix.'),
      mcq('A chart is titled "Revenue by region, FY25". What is the better title?', [
        ['South grew fastest, but West still brings the most revenue', true],
        ['Revenue by region for FY25, with all of the figures in ₹ crore', false],
        ['Regional revenue analysis — fiscal year 2024-25', false],
        ['Figure 3: regional breakdown of the annual revenue', false],
      ], 'A message title states what the reader should take from the chart. The others describe the topic and leave the reader to find the point.'),
      mcq('An analysis cannot support a recommendation because there are only five days of data. How should it end?', [
        ['State it is inconclusive and what data would settle the question', true],
        ['Recommend the option the manager seemed to prefer in the meeting', false],
        ['Leave the ending out, as no recommendation is possible at all', false],
        ['Present every chart made so the reader can decide for themselves', false],
      ], 'An honest ending says what the evidence supports and what would resolve the rest. Guessing, ending vaguely, or dumping charts all shift the analyst\'s job onto the reader.'),
    ],
    checkpoint: [
      mcq('A five-slide story about an order drop has the slides in the order "Data sources, Method, Cities, Platforms, Conclusion". What is the main problem?', [
        ['The answer arrives last; it should be the first slide\'s headline', true],
        ['There are too few slides to cover the analysis in enough depth for a manager', false],
        ['Data sources must never be shown to a manager in any form', false],
        ['Cities should always come after platforms in any analysis', false],
      ], 'The structure follows the analyst\'s process instead of the reader\'s need. Lead with the answer, then where, why and what to do; method belongs in an appendix.'),
      mcq('A chart of daily orders for six cities uses six bright colours and a legend, but only one city matters to the story. What is the best fix?', [
        ['Colour that city strongly, grey the rest, and label it directly', true],
        ['Keep all six colours, but move the legend up above the chart area', false],
        ['Show the six cities as a 3D pie chart for a cleaner look', false],
        ['Add data labels to every point so each value can be read', false],
      ], 'Highlighting the one line that carries the message, with a direct label, lets the reader see the point at once. More colours, labels or 3D add clutter.'),
      mcq('Which supporting point is written well for a story about falling orders?', [
        ['Three Pune stores lost 24% of revenue; the rest grew 2%', true],
        ['Those three stores behaved differently from the others', false],
        ['We looked closely at platform-level trends this week', false],
        ['Platforms are an important dimension for order volume', false],
      ], 'A supporting point is a checkable claim with the number that proves it. The others are vague, describe the process, or state a generality.'),
    ],
  },

  /* ── STAKEHOLDERS ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_METRICS_STORY_STAKEHOLDERS',
    notes: `Most of an analyst's requests arrive as one line on chat: "Can you pull sales for the South?" or "Why are users
leaving?" The analyst who answers that literally spends a day and delivers something nobody uses. The analyst who
asks four questions first spends an hour and delivers a decision. This unit is about that hour.

## Turn a vague request into a scoped question

A regional manager at a retail chain writes: *"Sales in Chennai look bad. Can you look into it?"*

Ask, in a short call or message:

1. **What decision will this inform?** "Whether to extend the Diwali discount in Chennai stores, or cut it."
2. **What does 'bad' mean, compared with what?** "Same-store sales are down vs last year; the target was +6%."
3. **What period and which stores?** "October 1–20; the six Chennai stores that were open last year."
4. **By when, and in what form?** "Thursday's review; one slide is enough."

Now write the scoped question back to them and get a yes:

> "Why are like-for-like sales in the six Chennai stores open since last year down for October 1–20 vs the same
> days last year, and does the discount appear to help? One slide for Thursday."

That paragraph prevents the two most common failures: answering the wrong question, and answering the right one
too late.

## Ad-hoc question or dashboard?

| Ad-hoc analysis | Dashboard |
|---|---|
| A one-time question: "Why did X happen?" | A repeated question: "How are we doing this week?" |
| Needs judgement and a story | Needs stable, well-defined metrics |
| Delivered as a slide, doc or message | Delivered as a refreshed report |
| Done in hours or days | Built once, maintained for months |

If the same ad-hoc request arrives for the third time, propose a dashboard. If someone asks for a dashboard to
answer a one-time question, do the analysis instead — a dashboard nobody opens after week two is waste.

## Presenting to managers

- **Start with the answer** and the decision it supports (the previous unit's structure).
- **Use their words and their units**: "₹14 lakh a month" and "about 6,800 orders a week", not "a 0.35 pp
  conversion delta".
- **Bring one number they already know** — last month's revenue, the target — so they can anchor everything else.
- **Pre-wire**: show the main finding to the key person before the big meeting, especially if it is bad news about
  their area. Nobody should be surprised in front of their boss.
- **Have the appendix ready**: the method, the segment cuts, the caveats. You will be asked.

## Saying "the data cannot tell us that"

Some questions cannot be answered with the data you have, and pretending they can is the fastest way to lose trust.

- "**Why** did these customers leave?" — order data shows **that** they left and **when**, not why. Suggest an
  exit survey or a sample of support tickets.
- "**Did** the campaign cause the sales rise?" — with no control group, you can show the rise and rule out obvious
  alternatives (seasonality, a price cut), but not prove cause. Suggest a holdout next time.
- "What will sales be next Diwali?" — you can give a range with assumptions, not a single certain number.

Say it constructively: **what the data does show, what it cannot show, and what would let us answer it.**

> "The data shows churned customers ordered 40% less often in their last two months, so we can flag them early. It
> cannot tell us why they left. A three-question exit survey on the cancellation screen would."

## Handling pushback

When a stakeholder dislikes the answer — "that can't be right, my stores are doing fine" — do not argue and do not
fold. Show the definition and the source, offer to reconcile with **their** number line by line, and fix anything
that is genuinely wrong. Usually the difference is a definition (all stores vs like-for-like, gross vs net of
returns). Agreeing on the definition is the work.`,
    mcqs: [
      mcq('A manager writes "Sales in Chennai look bad, can you look into it?" What should the analyst do first?', [
        ['Ask what decision it informs, compared with what, and by when', true],
        ['Pull every Chennai sales table and build a full dashboard', false],
        ['Reply that the request is too vague to be answered at all', false],
        ['Start segmenting Chennai sales by every single dimension available', false],
      ], 'Four scoping questions — decision, comparison, scope, deadline and format — turn a vague request into one that can be answered on time. Building or segmenting first risks answering the wrong question.'),
      mcq('The same "weekly sales by store" request has arrived for the third time this month. What should the analyst propose?', [
        ['A refreshed dashboard with stable, agreed definitions', true],
        ['A longer one-off analysis with more segments each time', false],
        ['Declining the request, since it was already answered', false],
        ['A standing meeting to read the numbers out every week', false],
      ], 'A repeated "how are we doing?" question is what a dashboard is for. One-off analyses are for one-time "why" questions that need judgement.'),
      mcq('A product head asks "Why did these 2,000 subscribers cancel?" and only order data exists. What is the best reply?', [
        ['Show what the data reveals, then suggest an exit survey for the "why"', true],
        ['Infer the reasons from order patterns and present them as the cause', false],
        ['Reply that the question cannot be answered and close the request', false],
        ['Ask an LLM to guess the most likely reasons from the order history', false],
      ], 'Order data shows that and when customers left, not why. Saying what it can show, what it cannot, and how to find out keeps trust and still moves the question forward.'),
    ],
    checkpoint: [
      mcq('A stakeholder says your Chennai figure of −4% "can\'t be right — my report says +2%". What is the most productive response?', [
        ['Reconcile both numbers line by line, starting with definitions', true],
        ['Restate your figure and the method more firmly in the meeting', false],
        ['Switch to their +2% figure to keep the relationship smooth', false],
        ['Average the two figures and report −1% as the compromise', false],
      ], 'Differences usually come from definitions — all stores vs like-for-like, gross vs net of returns. Reconciling finds the cause and fixes whichever number is wrong.'),
      mcq('A finding shows the West region manager\'s stores are behind target. The review with the CEO is tomorrow. What should the analyst do today?', [
        ['Show the finding to the West manager before the meeting', true],
        ['Keep it unchanged and reveal it first in front of the CEO', false],
        ['Leave the West region out of the deck to avoid conflict', false],
        ['Soften the numbers so the gap looks smaller than it is', false],
      ], 'Pre-wiring lets the manager check the numbers and prepare a response, so the meeting is about decisions, not surprise. Hiding or softening the finding damages trust.'),
      mcq('Which scoped question is ready to be analysed?', [
        ['Why are like-for-like sales in six Chennai stores down, 1–20 Oct vs last year?', true],
        ['What is going on with Chennai sales, and are things getting any better lately?', false],
        ['Can we get all the Chennai data so the team can explore whatever stands out?', false],
        ['How are the southern stores doing overall, compared with all the other regions?', false],
      ], 'A scoped question names the metric, the stores, the period and the comparison. The others leave the analyst to guess what "going on", "explore" or "doing" means.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_METRICS_STORY_DEBUGGING',
    notes: `Metric bugs are dangerous because the number still looks like a number. Nothing errors; a dashboard simply tells a
leadership team something false. Below are eight faults from real analytics work — symptom, cause, fix — with the
numbers recomputed in Python.

## 1. A conversion rate with the wrong denominator

**Symptom:** a new e-commerce dashboard shows "conversion 42%", and the marketing head asks why it is ten times the
industry figure.
**Cause:** the measure divides 8,400 orders by the 20,000 users who **reached checkout**, not by the 2,40,000 who
visited. Checkout-to-order is 42%; visit-to-order is **3.5%**.
**Fix:** name every rate by both ends ("checkout-to-order conversion") and write the denominator into the measure's
description. Keep both measures if both are useful; never label either one just "conversion".

## 2. A churn number that mixes cohorts

**Symptom:** blended monthly churn falls from 6.8% to 5.5%; the team celebrates better retention.
**Cause:** acquisition was cut. Month A had 20,000 tenured subscribers churning at 4% and 5,000 new ones at 18%
(1,700 of 25,000 = 6.8%). Month B had 22,000 tenured at 4% and only 2,000 new at **22%** (1,320 of 24,000 = 5.5%).
New-subscriber churn got **worse**; the blend improved only because there were fewer new subscribers in it.
**Fix:** report churn by cohort or by tenure band (month 1, months 2–3, 4+). A blended rate can move just because
the mix moved.

## 3. A "drop" that is a tracking change

**Symptom:** iOS "orders" in the product-analytics tool fell 12% overnight; the orders database is flat.
**Cause:** app release 5.2.0 moved the \`order_placed\` event from the confirmation screen to a server callback; the
old client event stopped firing for users on the new version, and the server event goes to a different table.
**Fix:** reconcile analytics counts against the system of record (orders DB, payments) daily; keep a release and
tracking-change log; alert when the two sources disagree by more than a small threshold.

## 4. Today compared with full days

**Symptom:** a 2 p.m. alert fires: "orders −40% today".
**Cause:** the daily chart includes today, which has 14 hours of data, against full 24-hour days.
**Fix:** exclude the current day from daily comparisons, or compare the same hours ("orders by 2 p.m. today vs by
2 p.m. last Tuesday").

## 5. UTC days in an IST business

**Symptom:** late-night food orders look tiny on Mondays and huge on Sundays; daily totals do not match finance.
**Cause:** timestamps are stored in UTC and the query groups by \`DATE(created_at)\`. Every order between 00:00 and
05:29 IST lands on the previous date.
**Fix:** convert before grouping — \`DATE(CONVERT_TZ(created_at, '+00:00', '+05:30'))\` in MySQL, or
\`dt.tz_localize("UTC").dt.tz_convert("Asia/Kolkata")\` in pandas — and state the time zone in the metric definition.

## 6. A join that fans out

**Symptom:** revenue in the new report is 7% above the finance figure.
**Cause:** orders were joined to \`payments\`, which has one row **per payment attempt**. An order paid on the second
UPI attempt appears twice, and its amount is summed twice.
**Fix:** check row counts before and after every join (\`len(df)\` before and after, or
\`merge(..., validate="many_to_one")\`); join to successful payments only, or aggregate payments to one row per order
first.

## 7. An average of averages

**Symptom:** "average order value across our cities is ₹373", but the overall AOV in the finance report is ₹502.
**Cause:** the analyst averaged three city AOVs — Mumbai ₹520 (40,000 orders), Indore ₹310 (2,000), Patna ₹290
(1,500) — giving each city equal weight. Weighted by orders, the AOV is (40,000 × 520 + 2,000 × 310 + 1,500 × 290) ÷
43,500 = **₹502**.
**Fix:** recompute ratios from totals (total revenue ÷ total orders), never by averaging the ratios. In DAX, a
measure \`DIVIDE([Revenue], [Orders])\` does this at every level automatically.

## 8. Festival week against an ordinary week

**Symptom:** "orders are down 22% week on week — something is broken".
**Cause:** last week was Diwali week. This week is an ordinary week, and it is 4% **above** the same post-Diwali week
last year.
**Fix:** compare with the same period last year (aligned on the festival, not the calendar date) and keep a holiday
calendar beside the metric.

## The order of checks when a metric looks wrong

1. Partial periods and time zone. 2. Source of record vs analytics. 3. Releases and tracking changes on that date.
4. Row counts through every join. 5. Denominators and definitions. 6. Mix and cohorts. 7. Seasonality and calendar.`,
    mcqs: [
      mcq('Blended monthly churn fell from 6.8% to 5.5% after acquisition spend was cut. New-subscriber churn rose from 18% to 22%. What happened?', [
        ['Fewer high-churn new users in the mix lowered the blended rate', true],
        ['Retention genuinely improved across every subscriber group', false],
        ['The churn calculation must have counted cancellations twice', false],
        ['Tenured subscribers began churning much less than before', false],
      ], 'Tenured churn stayed at 4%; new-subscriber churn worsened. The blend fell only because new subscribers were 8% of the base instead of 20%. Report churn by cohort or tenure.'),
      mcq('Revenue in a new report is 7% higher than finance\'s figure after joining orders to the payments table. What is the most likely fault?', [
        ['Payment retries duplicate orders, so amounts are summed twice', true],
        ['Finance excludes taxes and the new report includes them all', false],
        ['The payments table is missing the most recent day of data', false],
        ['Orders paid in cash were dropped from the finance figure', false],
      ], 'A table with one row per payment attempt fans out the join. Checking row counts before and after, or using merge(validate="many_to_one"), catches it.'),
      mcq('City AOVs are Mumbai ₹520 (40,000 orders), Indore ₹310 (2,000) and Patna ₹290 (1,500). What is the correct overall AOV?', [
        ['About ₹502', true],
        ['About ₹373', false],
        ['About ₹520', false],
        ['About ₹410', false],
      ], 'Total revenue ÷ total orders = (20,800,000 + 620,000 + 435,000) ÷ 43,500 ≈ ₹502. Averaging the three AOVs (₹373) gives Patna the same weight as Mumbai.'),
      mcq('Late-night orders look tiny on Mondays and large on Sundays, and daily totals differ from finance. What should be checked?', [
        ['Whether UTC timestamps are grouped into dates without converting to IST', true],
        ['Whether delivery partners work fewer hours on Monday nights in each city', false],
        ['Whether the dashboard is refreshing more slowly on Mondays than Sundays', false],
        ['Whether Monday orders are being cancelled more often than Sunday orders', false],
      ], 'Grouping UTC times by date puts orders from 00:00–05:29 IST on the previous day. Convert to Asia/Kolkata before taking the date.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_METRICS_STORY_PRACTICE',
    notes: `Six exercises across an edtech app, a fintech app, an e-commerce site and a food-delivery company. Work each
one — with pandas or a calculator — and write the one-sentence answer before reading ours. Every number was
computed in Python.

## Exercise 1 — Where does the funnel leak?

An edtech app's free-trial funnel for October:

    funnel = pd.DataFrame({
        "step": ["landing", "signed_up", "started_lesson", "finished_3_lessons", "paid"],
        "users": [80000, 12000, 7800, 3120, 1092]})

Compute step conversion and overall conversion. Which step would you work on first?

**Answer.** Steps: 15%, 65%, 40%, 35%; overall **1.37%** (1,092 ÷ 80,000). The landing page has the lowest rate and
loses the most people (68,000), but landing traffic is often low-intent and hard to move. After sign-up, the step that
loses the **most learners** is "started a lesson → finished three" (4,680 lost, a 40% step rate); the last step has
the lowest rate (35%) but loses fewer (2,028). Since finishing lessons is what leads to paying, the lesson step is a
strong first target — say which reasoning you used, rate or volume.

## Exercise 2 — Read a cohort table

A fintech app's monthly cohorts (users active in each month after joining):

    cohorts = pd.DataFrame({
        "size": [5000, 6200, 8000],
        "M1": [2150, 2480, 2560],
        "M2": [1700, 1922, None],
        "M3": [1500, None, None]}, index=["Jan", "Feb", "Mar"])

Compute retention. March was a big cashback promotion. What do you tell the growth team?

**Answer.** M1 retention: Jan **43%**, Feb **40%**, Mar **32%**. M2: Jan 34%, Feb 31%. The March cohort is the
largest but retains far worse in month one — the cashback brought many users who came for the cashback and left.
Blended M1 retention across all three is 37.4%, which hides that. Report the promotion's users as their own cohort
and judge the promotion on retained users, not sign-ups.

## Exercise 3 — Does acquisition pay?

A bill-payment app earns ₹14 net per transaction; an active user transacts 2.5 times a month; monthly churn is
about 6% and steady; CAC is ₹450. Compute monthly margin per user, LTV, LTV ÷ CAC and payback.

**Answer.** Monthly margin ₹35; LTV = 35 ÷ 0.06 = **₹583**; LTV ÷ CAC = **1.3**; payback = 450 ÷ 35 = **12.9
months**. Each user does earn back their cost, but only just, and it takes more than a year — weak unit economics.
Levers: cut CAC (referrals over paid ads), raise transactions per user, or reduce churn.

## Exercise 4 — Decompose a change

E-commerce GMV: August 9,00,000 visitors, 2.8% conversion, AOV ₹1,240; September 9,60,000 visitors, 2.5%, ₹1,260.
How much did each factor contribute?

**Answer.** GMV ₹3,12,48,000 → ₹3,02,40,000 (**−3.2%**, −₹10.08 lakh). Log shares: visitors **+₹19.8 lakh**,
conversion **−₹34.8 lakh**, AOV **+₹4.9 lakh**. Conversion is the whole story; traffic actually rose.

## Exercise 5 — Every city held steady, yet the average rose

A food-delivery company's average delivery time rose from 30.0 to 31.3 minutes. Bengaluru averages 34 minutes and
Pune 26, unchanged. Orders: last month Bengaluru 50,000 and Pune 50,000; this month Bengaluru 80,000 and Pune 40,000.
Explain.

**Answer.** (34 × 50,000 + 26 × 50,000) ÷ 1,00,000 = **30.0**; (34 × 80,000 + 26 × 40,000) ÷ 1,20,000 = **31.3**.
No city got slower; Bengaluru's share of orders rose from 50% to 67%. It is a mix shift. Report delivery time by city
alongside the overall figure.

## Exercise 6 — Define it, then title it

(a) Write a precise definition for "repeat-purchase rate" for a D2C skincare brand. (b) Rewrite this chart title:
"Repeat purchases by acquisition channel".

**Answer.** (a) "Of customers whose first order was delivered in a calendar month (IST), the share who place a second
non-cancelled, non-returned order within 90 days of the first delivery. Excludes staff and test accounts; one customer
= one \`customer_id\` after merging duplicate phone numbers." (b) A message title such as "Customers from referrals
come back twice as often as those from Instagram ads" — using whatever the chart actually shows.`,
    mcqs: [
      mcq('In Exercise 1, which statement about the edtech funnel is correct?', [
        ['Overall conversion is 1.37%; after sign-up, most learners are lost between lessons 1 and 3', true],
        ['Overall conversion is 1.37%; finishing lessons to paying has the lowest rate of all steps', false],
        ['Overall conversion is 9.1%, and the landing page is the only step worth improving at all', false],
        ['Overall conversion is 35%, which is the final step\'s rate from finished lessons to paid', false],
      ], '1,092 ÷ 80,000 = 1.37%. After sign-up, 4,680 learners drop between starting and finishing three lessons, more than at any other later step. The lowest rate of all is the landing page (15%), not the final step (35%).'),
      mcq('In Exercise 2, March M1 retention is 32% against 43% and 40% for January and February. What should the growth team hear?', [
        ['The cashback cohort retains worst; judge the promotion on retained users', true],
        ['March was the best month, as it brought the largest cohort of users', false],
        ['Retention is 37.4% on average, so there is nothing to worry about', false],
        ['Retention fell because of seasonality in March, and not because of the promotion', false],
      ], '2,560 ÷ 8,000 = 32%. The biggest cohort retains worst, which the blended 37.4% hides. Users who came for cashback often leave once it ends.'),
      mcq('In Exercise 3 (₹14 per transaction, 2.5 transactions a month, 6% churn, CAC ₹450), what is the payback period?', [
        ['About 12.9 months', true],
        ['About 3.2 months', false],
        ['About 7.5 months', false],
        ['About 1.3 months', false],
      ], 'Monthly margin is 14 × 2.5 = ₹35, so 450 ÷ 35 ≈ 12.9 months. 1.3 is the LTV ÷ CAC ratio, not a period.'),
      mcq('In Exercise 5, average delivery time rose from 30.0 to 31.3 minutes though neither city got slower. Why?', [
        ['Bengaluru, the slower city, grew from 50% to 67% of orders', true],
        ['Pune got slightly slower, but the change was rounded away', false],
        ['Delivery times are skewed, so the mean must be wrong here', false],
        ['More orders always make every delivery slower on average', false],
      ], 'Weighted by orders, the average moves towards the slower city as its share grows. Reporting by city alongside the total shows that no city changed.'),
      mcq('In Exercise 6, which phrase must a precise definition of "repeat-purchase rate" include?', [
        ['A second valid order within 90 days of the first delivery', true],
        ['Customers who seem to like the brand and buy again later', false],
        ['Any customer with more than one row in the orders table', false],
        ['People who repeat a purchase in the same calendar year', false],
      ], 'A computable definition fixes the event, the window, and what counts — non-cancelled, non-returned orders. "Seem to like", raw row counts and calendar years each give different answers.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_METRICS_STORY_INTERVIEW_QUESTION',
    notes: `Metric cases are the core of business- and product-analyst interviews at Indian consumer companies. The
interviewer is not looking for the "right" cause — there isn't one — but for a **structured** approach, sensible
numbers, and the habit of checking the data before theorising. Three questions, model answers, and the follow-ups.

## 1. "Orders dropped 10% yesterday. What do you do?"

**Model answer.** "First I'd make sure the drop is real. Is yesterday complete — all cities, all hours, IST? Does the
orders database agree with the analytics tool? Was there any release, tracking change or pipeline issue? If the
payments ledger shows the same drop, it's real.

Second, context: is a 10% daily drop unusual? I'd compare with the same weekday over the last few weeks and the same
date last year — a Monday after a long weekend or the day after a festival can easily be 10% lower. I'd also check
for external events: a cricket final, heavy rain, a competitor's sale.

Third, segment: city, platform, app version, new vs returning users, restaurant category, payment method. I'm looking
for concentration — if one platform or one city carries most of the drop, that's where the cause is.

Fourth, decompose: orders = sessions × conversion. Did fewer people open the app, or did the same number open it and
fewer order? Then the funnel: menu views, add-to-cart, checkout, payment success.

Finally I'd form a hypothesis, confirm it with the specific data — say, payment failures on one app version — and
report: what happened, the size, the cause, and the fix, with an alert so we see it earlier next time."

**Follow-ups:**
- *"It's only in two cities, and only for restaurants on one cloud-kitchen partner."* Partner-related: check whether
  that partner's restaurants were offline or showing "closed", from when; quantify lost orders per hour and escalate
  to the partner team, with an alert on restaurant availability.
- *"Sessions are flat, conversion fell."* People arrive but do not finish: look at each funnel step to find which one
  broke — menu load, cart, payment.

## 2. "We're launching UPI AutoPay for monthly bills in our fintech app. What metrics would you track?"

**Model answer.** "I'd start from the goal: more users paying bills through us, reliably, every month. The
**north-star** for the feature: monthly active AutoPay mandates that executed successfully. Then:

- **Adoption**: share of bill-paying users who set up a mandate; setup funnel — started, bank selected, approved
  in the UPI app, confirmed.
- **Reliability**: mandate execution success rate; failure reasons (insufficient balance, bank decline, expired
  mandate).
- **Retention / value**: bills paid per user per month, and whether AutoPay users are retained better than manual
  payers — compared fairly, since keen users self-select into AutoPay.
- **Guardrails**: complaints and disputes per 1,000 mandates, mandate cancellations, support tickets.

I'd define each precisely — numerator, denominator, window — and launch with an A/B test or a staged rollout if we
want to claim AutoPay itself causes better retention."

**Follow-ups:**
- *"AutoPay users retain 20% better. Ship to everyone?"* That is correlation; users who choose AutoPay were already
  committed. A randomised nudge (some users shown the AutoPay prompt, some not) measures the real effect.
- *"Which single metric would you show the CEO?"* Successful AutoPay payments per month — it combines adoption and
  reliability and is directly tied to revenue.

## 3. "Daily active users are up 15%, but revenue is flat. What's going on?"

**Model answer.** "Revenue = active users × share who pay × revenue per payer. If users rose 15% and revenue didn't,
either the new users don't pay or existing payers are paying less. I'd check: where did the new users come from — a
campaign, a free feature, a referral reward? Do they convert to paying at the old rate? Did average revenue per payer
fall — a discount, a cheaper plan, a mix shift towards a cheaper city? Also: is DAU defined the same way as before — a
new background event or a notification-open counted as 'active' can inflate DAU with no real usage. I'd present a
decomposition showing which factor offset the user growth."

**Follow-ups:**
- *"The new users came from a cashback campaign."* Look at their cohort: conversion to paying and month-1 retention
  versus earlier cohorts; judge the campaign on retained payers and contribution, not DAU.
- *"How would you have caught this earlier?"* Pair DAU with a revenue-linked counter-metric (paying users or revenue per
  DAU) on the same dashboard.

## How to answer metric cases well

**Clarify → check the data → context (seasonality, events) → segment → decompose → hypothesis → confirm → recommend.**
Say numbers out loud ("if 60% of orders are Android…"), think in formulas, and finish with an action.`,
    mcqs: [
      mcq('In a "orders dropped 10% yesterday" case, what should a strong answer do before segmenting the data?', [
        ['Confirm the drop is real and compare it with normal variation', true],
        ['Assume a competitor ran a sale and estimate its effect on us', false],
        ['Recommend a discount campaign to win back the lost orders', false],
        ['List every possible cause the interviewer might be thinking of', false],
      ], 'Checking completeness, sources and tracking first, then the usual day-to-day variation, avoids explaining a drop that is a data artefact or an ordinary Monday.'),
      mcq('AutoPay users retain 20% better than manual payers. An interviewer asks "So should we push AutoPay to everyone?" Which reply is strongest?', [
        ['Users self-select into AutoPay; a randomised nudge would show its real effect', true],
        ['Yes, since a 20% retention gain is large enough to justify a full rollout now', false],
        ['No, as retention is a lagging metric and should not guide decisions at all', false],
        ['Yes, but only after checking that the 20% is statistically significant first', false],
      ], 'Committed users choose AutoPay, so the gap mixes selection with effect. Randomising who is prompted separates them; significance alone does not fix selection bias.'),
      mcq('DAU rose 15% but revenue stayed flat. Which decomposition frames the investigation best?', [
        ['Revenue = active users × share who pay × revenue per payer', true],
        ['Revenue = DAU × session length × app-store rating per user', false],
        ['Revenue = sign-ups + active users − churned users in a month', false],
        ['Revenue = DAU ÷ monthly active users × average order count', false],
      ], 'Writing revenue as a product of factors shows which one offset the user growth: new users who do not pay, or payers paying less. The other formulas do not equal revenue.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_METRICS_STORY_MINI_PROJECT',
    notes: `# Diagnosing a Drop in Orders

You are the analyst at a food-delivery app operating in six Indian cities. On Monday morning the head of growth
messages you: *"Orders last week were down about 18% on the week before. The leadership review is Wednesday. What
happened, and what do we do?"*

Your job: check that the drop is real, segment it, decompose it, find the cause, and present it as a five-slide
story with a recommendation. This project uses everything in the topic — metric definitions, segmentation,
decomposition, mix effects, data checks, storytelling and stakeholder communication — plus the pandas and charting
skills from earlier topics.

## The data

Generate the data with this script (seed fixed, so everyone gets the same 5,040 rows):

    import numpy as np
    import pandas as pd

    rng = np.random.default_rng(1847)
    dates = pd.date_range("2024-09-02", "2024-09-29", freq="D")          # four full Mon–Sun weeks
    cities = {"Bengaluru": 1.00, "Mumbai": 0.95, "Delhi": 0.90, "Hyderabad": 0.70, "Chennai": 0.55, "Pune": 0.45}
    platforms = {"android": 0.62, "ios": 0.18, "web": 0.20}
    cuisines = {"North Indian": 0.30, "South Indian": 0.22, "Biryani": 0.20, "Chinese": 0.15, "Pizza": 0.13}
    users = {"new": 0.25, "returning": 0.75}
    base_conv = {"new": 0.11, "returning": 0.24}

    rows = []
    for d in dates:
        weekend = 1.18 if d.dayofweek >= 5 else 1.0
        for city, cw in cities.items():
            for plat, pw in platforms.items():
                for cui, kw in cuisines.items():
                    for ut, uw in users.items():
                        sessions = rng.poisson(5200 * cw * pw * kw * uw * weekend)
                        conv = base_conv[ut]
                        if plat == "android" and d >= pd.Timestamp("2024-09-23"):
                            conv *= 0.72 if ut == "returning" else 0.64
                        orders = rng.binomial(sessions, conv)
                        logged = sessions
                        if plat == "web" and d >= pd.Timestamp("2024-09-23"):
                            logged = int(round(sessions * 1.9))
                        aov = rng.normal(410 if ut == "returning" else 365, 12)
                        rows.append((d.date(), city, plat, cui, ut, logged, orders, round(orders * aov)))

    df = pd.DataFrame(rows, columns=["date", "city", "platform", "cuisine", "user_type", "sessions", "orders", "gmv"])
    df.to_csv("daily_orders.csv", index=False)
    pd.DataFrame({
        "release_date": ["2024-09-10", "2024-09-17", "2024-09-23", "2024-09-23"],
        "platform": ["ios", "android", "android", "web"],
        "version": ["6.31.0", "8.13.2", "8.14.0", "analytics-tag-v2"],
        "notes": ["Dark mode", "Bug fixes", "New payment sheet", "Analytics tag replaced"],
    }).to_csv("release_log.csv", index=False)

**Analyse the two CSV files as if they had arrived from the data team.** The script shows how the data was made,
but your slides must establish every finding from the data itself, the way you would at work — and the data
contains more than one thing a careful analyst should notice.

**daily_orders.csv** — one row per date × city × platform × cuisine × user type:

| Column | Meaning |
|---|---|
| date | Calendar date (IST), 2 to 29 September 2024 — four Monday-to-Sunday weeks |
| city | Bengaluru, Mumbai, Delhi, Hyderabad, Chennai, Pune |
| platform | android, ios, web |
| cuisine | North Indian, South Indian, Biryani, Chinese, Pizza |
| user_type | new (first order ever) or returning |
| sessions | App or web sessions logged by the analytics tool |
| orders | Orders placed (from the orders database) |
| gmv | Gross order value in ₹ |

**release_log.csv** — app and web releases with date, platform, version and a one-line note.

## The questions

1. **Is the drop real?** Weekly orders and GMV for all four weeks; how big is last week's change against normal
   week-to-week variation? Is anything in the data itself suspicious, and does it affect the conclusion?
2. **Where is it?** Segment last week vs the week before by city, platform, cuisine and user type. Report each
   segment's change and its **share of the total drop**.
3. **Is it fewer visits or fewer orders per visit?** Decompose orders into sessions × conversion for the segments that
   matter. Treat any segment whose sessions look wrong with care, and explain why.
4. **When did it start, and what lines up with it?** Daily orders and conversion for the key segment; match the
   timing against the release log.
5. **What is it worth?** Orders and GMV lost per week if nothing changes.
6. **What should happen?** A recommendation with an owner, the expected recovery, and how you will know it worked.

## Deliverables

1. **\`diagnosis.ipynb\`** — generates or loads the data and runs top to bottom after "Restart & Run All": data checks,
   weekly totals, segment tables with share of drop, the sessions × conversion decomposition, daily charts, and the
   size of the loss.
2. **\`orders_drop.pdf\` (or .pptx), five slides** — 1: the answer as a headline; 2: what happened (weekly or daily
   orders with the event marked); 3: where (the segment that carries the drop); 4: why (the evidence for the cause);
   5: what to do (recommendation, owner, impact, monitoring). Every chart title states its finding. Appendix slides are
   allowed for method and extra cuts.
3. **\`message.md\`** — the three-to-five-line message you would send the head of growth on Monday afternoon, answer first.

## Acceptance criteria

- The notebook reproduces every number on the slides.
- The data checks come **before** the explanation, and anything suspicious in the data is identified, explained and
  shown not to change (or to change) the conclusion.
- Segment tables show both percentage change and share of the total drop.
- The decomposition uses orders, not logged sessions alone, where sessions are unreliable, and says why.
- The cause is supported by at least two independent pieces of evidence (for example: concentration in one segment
  **and** timing that matches the release log).
- The loss is quantified in orders and ₹ per week.
- Each slide has one message, stated in its title; slide 1's headline alone tells the reader what happened and what
  to do.
- The recommendation names an owner, the expected recovery and the metric that will confirm it.`,
    mcqs: [
      mcq('While segmenting the project data, you see web conversion halve last week while web orders are flat. What is the right way to treat it?', [
        ['Check whether session logging changed, since orders did not move', true],
        ['Report web as the main cause, since its conversion fell the most', false],
        ['Drop web from the analysis entirely, as its data must be wrong', false],
        ['Average web\'s conversion with the other platforms to smooth it', false],
      ], 'Conversion = orders ÷ sessions. If orders, which come from the orders database, are flat, a sudden jump in logged sessions is the likelier explanation; the release log is where to confirm it.'),
      mcq('Which pair of evidence would most convincingly support a release as the cause of the drop?', [
        ['The drop sits in one platform and starts on that release\'s date', true],
        ['The drop is spread evenly across every city and every cuisine', false],
        ['The drop is larger at the weekend than on weekdays in all cities', false],
        ['The drop is about the same size as a normal week-to-week change', false],
      ], 'Concentration in the released platform plus timing that matches the release are two independent signals. An even spread or ordinary-sized change points away from a release.'),
    ],
    assignment: {
      title: 'Diagnosing a Drop in Orders',
      description: 'Check, segment and decompose an 18% week-on-week drop in a food-delivery app\'s orders, find the cause, size the loss, and present it as a five-slide story with a recommendation.',
      instructions: `Complete the diagnosis described in this unit's brief and submit a repository link or a zip.

**Submit:**

1. \`diagnosis.ipynb\` — generates the data with the brief's script, then: data checks; weekly totals for all four
   weeks; last week vs the week before by city, platform, cuisine and user type, with share of the drop; the
   sessions × conversion decomposition; daily charts for the key segment matched against the release log; the loss in
   orders and ₹ per week. It must run top to bottom after "Restart & Run All".
2. \`orders_drop.pdf\` or \`.pptx\` — five slides with message titles (answer, what, where, why, what to do), plus
   optional appendix slides.
3. \`message.md\` — the short message to the head of growth, answer first.
4. \`README.md\` — how to run the notebook and the library versions.

**Before you submit,** check each acceptance criterion in the brief and note at the end of the notebook where each one
is met.`,
      rubric: [
        { criterion: 'Data checks first', description: 'Totals and normal week-to-week variation established before explaining; the suspicious data is found, explained using the release log, and its effect on the conclusion stated.', maxPoints: 20 },
        { criterion: 'Segmentation and decomposition', description: 'All four dimensions segmented with percentage change and share of drop; orders decomposed into sessions × conversion for the key segments; reliable and unreliable measures distinguished.', maxPoints: 30 },
        { criterion: 'Cause and impact', description: 'The cause is supported by at least two independent pieces of evidence, including timing; the loss is sized in orders and ₹ per week; alternative explanations are ruled out explicitly.', maxPoints: 20 },
        { criterion: 'Story and recommendation', description: 'Five slides, one message each, titles that state findings, the answer in slide 1; a recommendation with owner, expected recovery and the metric that confirms it; a crisp answer-first message.', maxPoints: 20 },
        { criterion: 'Reproducibility', description: 'The notebook regenerates the data and reproduces every number on the slides after Restart & Run All; README with library versions.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_METRICS_STORY_CHECKPOINT',
    notes: `Ten questions across the topic: choosing and defining metrics, funnels, retention and unit economics, finding why
a metric moved, storytelling and stakeholders. Most give numbers — work them out before you look at the options.
Every value was computed in Python.`,
    checkpoint: [
      mcq('A D2C skincare brand\'s goal is "grow repeat revenue". Marketing reports Instagram followers up 40%. Which KPI should the brand track instead?', [
        ['The share of first-time buyers who reorder within 90 days', true],
        ['The number of likes per post on the brand\'s Instagram page', false],
        ['The total number of first orders placed since the launch', false],
        ['The number of product pages viewed per website session', false],
      ], 'A repeat-purchase rate moves directly with the goal and can fall. Followers and likes are vanity metrics, and a cumulative first-order count cannot show repeat behaviour.'),
      mcq('A funnel goes 50,000 visits → 20,000 product views → 5,000 add-to-cart → 4,000 orders. What are the overall conversion and the weakest step?', [
        ['8%; product view to add-to-cart at 25%', true],
        ['8%; visit to product view at 40%', false],
        ['10%; add-to-cart to order at 80%', false],
        ['25%; product view to add-to-cart at 8%', false],
      ], '4,000 ÷ 50,000 = 8%. Step rates are 40%, 25% and 80%, so view-to-cart is the weakest step.'),
      mcq('A ₹299-a-month plan has an 80% gross margin and steady 5% monthly churn. CAC is ₹1,500. What is the payback period?', [
        ['About 6.3 months', true],
        ['About 5.0 months', false],
        ['About 3.2 months', false],
        ['About 20 months', false],
      ], 'Monthly margin is 299 × 0.80 = ₹239.20, so 1,500 ÷ 239.20 ≈ 6.3 months. Using revenue (₹299) gives 5.0; 3.2 is the LTV ÷ CAC ratio (₹4,784 ÷ ₹1,500).'),
      mcq('Sessions rose 5% this week while orders fell 10%. By how much did conversion change?', [
        ['It fell by about 14%', true],
        ['It fell by about 15%', false],
        ['It fell by about 5%', false],
        ['It rose by about 5%', false],
      ], 'Orders = sessions × conversion, so conversion changed by 0.90 ÷ 1.05 = 0.857, a fall of about 14.3%. Subtracting the percentages (15%) is only an approximation.'),
      mcq('An e-commerce site\'s overall return rate rose from 9% to 11%, but the rate in every category is unchanged. What is the most likely explanation?', [
        ['Sales shifted towards categories that are returned more often', true],
        ['Each category\'s return rate rose by an amount too small to see', false],
        ['The overall rate was computed by averaging category rates', false],
        ['Customers are returning items for a new and unknown reason', false],
      ], 'If no category changed, the total can only move because the mix of sales changed — for example, more fashion, which is returned far more than groceries.'),
      mcq('The product-analytics tool shows iOS orders down 15% since Tuesday, but the orders database shows them flat. What is the most likely cause?', [
        ['A tracking change in Tuesday\'s iOS release stopped an event firing', true],
        ['iOS users switched to ordering on the web on Tuesday instead', false],
        ['The orders database is lagging and will catch up within a week', false],
        ['iOS users are placing fewer but larger orders since Tuesday', false],
      ], 'When the system of record is flat and only the analytics count fell, the measurement changed, not the business. Check the release for moved or renamed events.'),
      mcq('After acquisition spend was cut, blended monthly churn fell from 6.8% to 5.5%. What should the analyst check before calling it better retention?', [
        ['Churn by cohort or tenure, since the user mix has changed', true],
        ['Whether the churn figure is significant at the 5% level', false],
        ['Whether churn would be lower still if spend were cut more', false],
        ['Whether churn is reported on a weekly rather than monthly basis', false],
      ], 'New subscribers churn far more than tenured ones. With fewer new subscribers, the blend falls even if every group\'s churn is unchanged or worse.'),
      mcq('A slide shows weekly revenue by region. Which title would a manager read and understand fastest?', [
        ['North missed target for the third week; others are on track', true],
        ['Weekly revenue by region, compared against weekly targets', false],
        ['Regional revenue performance for the latest four weeks', false],
        ['Revenue by region (₹ lakh), week ending 22 September', false],
      ], 'A message title states the finding the chart proves. The others describe the chart and leave the reader to work out the point.'),
      mcq('A marketing head asks: "Did our September TV campaign cause the 12% sales rise?" There was no holdout region. What is the best reply?', [
        ['The rise is real, but without a control we cannot prove cause; use a holdout next time', true],
        ['Yes, because sales rose by 12% in the same month as the campaign ran on TV', false],
        ['No, because the rise is too small to be caused by a national TV campaign', false],
        ['Yes, but only after first checking that the 12% sales rise is statistically significant', false],
      ], 'Without a comparison group, seasonality, pricing and other campaigns cannot be separated from the TV effect. Saying what the data shows and how to answer it next time keeps trust.'),
      mcq('An order has AOV ₹500, 20% commission, a ₹20 delivery fee charged, ₹60 delivery cost, a ₹25 discount and a 2% payment cost. What is the contribution per order?', [
        ['₹25', true],
        ['₹45', false],
        ['₹35', false],
        ['₹5', false],
      ], '₹100 commission + ₹20 fee − ₹60 delivery − ₹25 discount − ₹10 payment cost = ₹25. Forgetting the payment cost gives ₹35; forgetting the fee charged gives ₹5.'),
    ],
  },

  /* ══ DT_CAPSTONE_DA ══════════════════════════════════════════════════════════════════════ */

  /* ── BRIEF ─────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_CAPSTONE_DA_BRIEF',
    notes: `**This is the project every analyst interviewer will ask you about.** One end-to-end analysis of a real business
question: data pulled with SQL, cleaned and explored in pandas, a statistical test where the question needs one, a
Power BI dashboard the stakeholder would actually open, AI used where it earns its place — with its accuracy
measured — and a ten-minute story you can defend under questioning. Nothing here is new; everything is the track,
used together.

## Choose a business

**Option A — Bazaar Fresh, a grocery chain (data provided).** Sixteen stores in Hyderabad, Bengaluru, Chennai and
Pune; 18 months of bills (October 2023 to March 2025); a loyalty programme; an SMS coupon experiment in January
2025; and 2,500 customer reviews. Leadership's questions for the quarterly review:

1. How is **like-for-like** revenue growing by city, and why has Chennai slowed since October?
2. Did the January **SMS coupon** (₹50 off, code SMS50) make loyalty members visit more, and did it pay for itself?
3. What do customers **complain about**, in which stores, and is it getting better or worse?
4. A **weekly dashboard** the city managers can use without asking the analytics team.

**Option B — a food-delivery business.** **Option C — a fintech app** (UPI, bill payments or lending). For B or C,
bring a public dataset or build a generator, meeting all of these:

- At least three related tables and 50,000 transaction rows over at least six months.
- One question that needs a statistical test (an experiment, or a before/after with a comparison group).
- One free-text column (reviews, tickets, chat transcripts) with at least 1,000 rows.
- No real personal data — no real names, phone numbers, emails or account numbers.

Option A is recommended: the data is known to contain the problems an analyst meets at work, and the questions are
already agreed. Pick B or C only if you are aiming at that industry and can describe it from the customer's side.

## The Option A data

Generate it with this script (seed fixed; about 3 lakh bills and 10 lakh bill lines, roughly 40 MB of CSV, a few
seconds to run):

    import numpy as np
    import pandas as pd

    rng = np.random.default_rng(3107)
    days = pd.date_range("2023-10-01", "2025-03-31", freq="D")               # 18 months

    stores = pd.DataFrame({
        "store_id": [f"BF{i:02d}" for i in range(1, 17)],
        "city": np.repeat(["Hyderabad", "Bengaluru", "Chennai", "Pune"], 4),
        "format": np.tile(["Super", "Express", "Express", "Super"], 4),
        "open_date": "2021-06-01",
    })
    stores.loc[stores.store_id.isin(["BF04", "BF08"]), "open_date"] = "2024-07-15"   # two new stores

    cats = {"Staples": 30, "Fresh": 25, "Dairy": 15, "Snacks": 20, "Personal Care": 20, "Home Care": 15}
    products = pd.DataFrame({"category": np.repeat(list(cats), list(cats.values()))})
    products.insert(0, "product_id", [f"P{i:04d}" for i in range(1, len(products) + 1)])
    products["mrp"] = np.round(rng.uniform(30, 600, len(products)))
    margin = products.category.map({"Staples": 0.12, "Fresh": 0.30, "Dairy": 0.14, "Snacks": 0.28,
                                    "Personal Care": 0.33, "Home Care": 0.26})
    products["unit_cost"] = np.round(products.mrp * (1 - margin), 1)

    customers = pd.DataFrame({"customer_id": [f"C{i:05d}" for i in range(1, 24_001)]})
    customers["home_store"] = rng.choice(stores.store_id, len(customers))
    customers["join_date"] = rng.choice(pd.date_range("2021-06-01", "2024-12-31"), len(customers))
    customers["tier"] = rng.choice(["Silver", "Gold", "Platinum"], len(customers), p=[0.70, 0.24, 0.06])

    parts = []
    for s in stores.itertuples():
        open_days = days[days >= s.open_date]
        lam = np.full(len(open_days), 45.0 if s.format == "Super" else 25.0)
        lam[open_days.dayofweek >= 5] *= 1.25
        if s.city == "Chennai":
            lam[open_days >= "2024-10-01"] *= 0.90                             # a competitor opened nearby
        n = rng.poisson(lam)
        if s.store_id == "BF06":
            n[(open_days >= "2024-11-11") & (open_days <= "2024-11-17")] = 0   # POS outage: no data
        o = pd.DataFrame({"store_id": s.store_id, "order_date": np.repeat(open_days, n)})
        pool = customers.loc[customers.home_store == s.store_id, "customer_id"].to_numpy()
        o["customer_id"] = np.where(rng.random(len(o)) < 0.6, rng.choice(pool, len(o)), "")   # blank = walk-in
        parts.append(o)

    # SMS coupon test: 6,000 members randomised on 6 Jan 2025; some SMS customers make an extra visit
    test = customers.sample(6000, random_state=7)[["customer_id", "home_store"]].reset_index(drop=True)
    test["group"] = rng.choice(["control", "sms"], len(test))
    extra = test[(test.group == "sms") & (rng.random(len(test)) < 0.06)]
    parts.append(pd.DataFrame({
        "store_id": extra.home_store.to_numpy(),
        "order_date": pd.Timestamp("2025-01-06") + pd.to_timedelta(rng.integers(0, 28, len(extra)), unit="D"),
        "customer_id": extra.customer_id.to_numpy(), "coupon_code": "SMS50"}))
    orders = pd.concat(parts, ignore_index=True).sort_values(["order_date", "store_id"], kind="stable")
    orders.insert(0, "order_id", [f"O{i:07d}" for i in range(1, len(orders) + 1)])
    orders["coupon_code"] = orders["coupon_code"].fillna("")
    orders["payment_mode"] = rng.choice(["UPI", "upi", "Card", "Cash"], len(orders), p=[0.50, 0.08, 0.22, 0.20])
    test = test.drop(columns="home_store").assign(sent_on="2025-01-06")

    items = pd.DataFrame({"order_id": np.repeat(orders.order_id.to_numpy(), rng.integers(1, 7, len(orders)))})
    items["line_no"] = items.groupby("order_id").cumcount() + 1
    pick = rng.integers(0, len(products), len(items))
    items["product_id"] = products.product_id.to_numpy()[pick]
    items["qty"] = rng.choice([1, 1, 1, 2, 2, 3], len(items))
    items["unit_price"] = np.round(products.mrp.to_numpy()[pick] * rng.choice([1.0, 0.95, 0.9], len(items), p=[0.6, 0.3, 0.1]), 2)
    returned = rng.random(len(items)) < 0.006
    items.loc[returned, "qty"] *= -1                                               # returns
    items = pd.concat([items, items.sample(700, random_state=9)], ignore_index=True)  # duplicated lines

    templates = [  # (theme, text, rating range)
        ("billing", "Billing took 25 minutes, only one counter open", (1, 2)),
        ("billing", "Long queue at the billing counter on Sunday", (1, 3)),
        ("billing", "Quick billing today, self-checkout worked well", (4, 5)),
        ("stock", "Toor dal was out of stock again", (1, 3)),
        ("stock", "Half the atta shelf was empty", (1, 2)),
        ("stock", "Could not find Amul butter, staff said no stock", (2, 3)),
        ("fresh", "Vegetables were not fresh", (1, 2)),
        ("fresh", "Milk packet was close to its expiry date", (1, 2)),
        ("fresh", "Fresh fruits and good quality onions", (4, 5)),
        ("staff", "Staff were very helpful in finding things", (4, 5)),
        ("staff", "Rude staff at the counter", (1, 2)),
        ("staff", "Nobody on the floor to ask for help", (2, 3)),
        ("price", "Prices are higher than the kirana next door", (2, 3)),
        ("price", "Good offers on Surf Excel this week", (4, 5)),
        ("price", "Charged MRP on an item marked as discounted", (1, 2)),
        ("billing", "Billing mein 20 minute lag gaye, sirf ek counter khula tha", (1, 2)),
        ("fresh", "Sabzi bilkul fresh nahi thi", (1, 2)),
        ("staff", "Staff ne achhe se help kiya", (4, 5)),
    ]
    t = rng.integers(0, len(templates), 2500)
    reviews = pd.DataFrame({
        "review_id": [f"R{i:05d}" for i in range(1, 2501)],
        "store_id": rng.choice(stores.store_id, 2500),
        "review_date": rng.choice(days, 2500),
        "rating": [int(rng.integers(templates[i][2][0], templates[i][2][1] + 1)) for i in t],
        "text": [templates[i][1] for i in t],
    })
    second = rng.random(2500) < 0.3                                                 # some reviews mention two things
    reviews.loc[second, "text"] += ". " + pd.Series([templates[i][1] for i in rng.integers(0, len(templates), second.sum())],
                                                   index=reviews.index[second])

    for name, df in [("stores", stores), ("products", products), ("customers", customers), ("orders", orders),
                     ("order_items", items), ("sms_test", test), ("reviews", reviews)]:
        df.to_csv(f"{name}.csv", index=False)
        print(f"{name}: {len(df):,} rows")

| File | One row per | Key columns |
|---|---|---|
| stores.csv | store | store_id, city, format (Super/Express), open_date |
| products.csv | product | product_id, category, mrp, unit_cost |
| customers.csv | loyalty member | customer_id, home_store, join_date, tier |
| orders.csv | bill | order_id, store_id, order_date, customer_id (blank = walk-in), coupon_code, payment_mode |
| order_items.csv | bill line | order_id, line_no, product_id, qty (negative = return), unit_price |
| sms_test.csv | member in the experiment | customer_id, group (control/sms), sent_on |
| reviews.csv | review | review_id, store_id, review_date, rating (1–5), text |

As always, the script shows how the data was made, but your findings must come from the data. It contains problems a
careful analyst should catch before trusting any total — find them in the build.

## Write the plan: PLAN.md, one page

1. **The questions**, each rewritten as a scoped question (metric, population, period, comparison) and agreed with
   the "stakeholder" (your mentor or a classmate playing the regional head).
2. **Metric definitions** — revenue (net of returns?), like-for-like (which stores count, and why), bills, average
   bill, visit rate in the experiment (window, who counts).
3. **Data checks** you will run before any analysis — duplicates, returns, blanks, coverage by store and day, new
   stores, unexpected categories.
4. **Method per question** — the SQL, the pandas, the test, the chart.
5. **Where AI is used and how you will check it** — and where it is **not** used.
6. **Deliverables and milestones** (below), and the two biggest risks with what you will do about them.

## Milestones (about three weeks part-time)

| Milestone | Done when |
|---|---|
| M1 — Data loaded and checked | CSVs in a SQL database; a data-check notebook with every problem found and a decision for each |
| M2 — Analysis | Questions 1 and 2 answered in a notebook with numbers, tests and intervals; FINDINGS.md drafted |
| M3 — Dashboard | Power BI model, measures and pages working on the full data |
| M4 — AI insight | Reviews labelled; 100 hand labels; accuracy measured; themes in the dashboard |
| M5 — Story | Ten-minute deck, rehearsed three times, timed |

**Scope rule:** if the plan does not fit on one page, there is too much in it. Move the extras to a "Not doing" list.`,
    workedExample: `**A filled-in PLAN.md for Option A (abridged).**

**Q1 scoped:** "How did like-for-like net revenue change by city, October–March FY25 vs the same months a year
earlier? For Chennai, is the change in bills, average bill, or both, and in members or walk-ins?" Like-for-like =
the 14 stores open throughout both periods; BF04 and BF08 (opened 15 July 2024) are excluded and reported
separately.

**Q2 scoped:** "Among the 6,000 members randomised on 6 January 2025, did the SMS group visit at least once in the
following 28 days more often than control? Does the extra margin cover the ₹50 coupons redeemed?" Primary metric:
share of members with ≥1 bill from 6 January to 2 February. Checks first: the split (sample-ratio check), and that
both groups are members with comparable history.

**Q3 scoped:** "Share of reviews per theme (billing, stock, freshness, staff, price, other) by city and quarter, and the
negative share within each theme." AI labels with measured accuracy; the dashboard shows the corrected shares.

**Definitions:** net revenue = Σ qty × unit_price including negative lines for returns, after removing duplicated
lines; a bill = one order_id; average bill = net revenue ÷ bills; a member bill has a customer_id.

**Data checks:** duplicate (order_id, line_no) rows; negative quantities; blank customer_id share; payment_mode
values; bills per store per day (to find gaps); store open dates.

**Method:** SQL for extraction and the like-for-like store list; pandas for cleaning, decomposition (revenue = bills ×
average bill) and the test (two-proportion z-test, 95% CI, SRM chi-square); Power BI star schema with Date, Store,
Product and Customer dimensions; LLM API for review labels, checked against 100 hand labels.

**Not using AI for:** any number in the findings. The LLM labels text and drafts sentences; every figure comes from
SQL, pandas or DAX.

**Risks:** (1) the 10-lakh-row lines table is slow in Excel — use SQL and pandas, never Excel, for it; (2) LLM labels
may be wrong in a systematic way — hand-label the sample **before** seeing AI labels so the comparison is honest.

**Not doing:** demand forecasting, product recommendations, price elasticity.`,
    mcqs: [
      mcq('A student wants to add demand forecasting, price elasticity and a recommendation engine to the capstone plan, which now runs to three pages. What is the right move?', [
        ['Move the extras to "Not doing" and keep the plan to one page', true],
        ['Keep everything, since more methods impress any interview panel', false],
        ['Split the plan into three documents, one for each new method', false],
        ['Drop the agreed questions to make room for the new methods', false],
      ], 'The one-page limit is a scope check. A capstone that answers the agreed questions well beats one that half-answers six; extras go on the "Not doing" list.'),
      mcq('Why does the Option A plan exclude stores BF04 and BF08 from the like-for-like comparison?', [
        ['They opened in July 2024, so they have no year-earlier sales', true],
        ['They are Super stores, which are always reported on separately', false],
        ['Their data is known to contain a week of missing bills', false],
        ['They are in cities that are not part of the review', false],
      ], 'Like-for-like compares stores open in both periods. Including new stores would show growth that comes from opening them, not from existing stores selling more.'),
      mcq('Why should the 100 reviews be hand-labelled before the student looks at the AI\'s labels?', [
        ['Seeing the AI\'s label first biases the human towards agreeing', true],
        ['The AI cannot label any review that has been read by a person', false],
        ['Hand labels must be finished first so they can train the LLM', false],
        ['The order does not matter, as long as both sets are complete', false],
      ], 'If the human sees the AI label first, they tend to accept it, which inflates the measured accuracy. Independent hand labels make the comparison honest.'),
    ],
    checkpoint: [
      ck(BM, 'For the SMS coupon question, which primary metric is defined precisely enough to compute?', [
        ['Share of randomised members with at least one bill from 6 Jan to 2 Feb', true],
        ['Whether customers seemed to visit more after the SMS went out in January', false],
        ['Total revenue of all stores in January compared with that in December', false],
        ['Number of SMS50 coupons redeemed across the whole chain in January', false],
      ], 'The metric names the population (randomised members), the event (a bill) and the window. Chain revenue mixes in everyone else, and coupon redemptions exist only in the SMS group, so they cannot be compared with control.'),
      ck(DASH, 'City managers will use the capstone dashboard every Monday. What should its first page show?', [
        ['A few KPIs vs last year and target, with a city filter and drill-through', true],
        ['Every chart from the analysis notebook, so nothing is left out of it at all', false],
        ['A table of all 10 lakh bill lines that managers can scroll and filter', false],
        ['The LLM\'s narrative summary of the week, in place of any numbers', false],
      ], 'A recurring audience needs a few well-defined KPIs with comparisons and a way to drill into their city. Notebook charts answer one-off questions; raw rows and unchecked text do not serve a weekly review.'),
      ck(LLM, 'Where in the Option A capstone does an LLM earn its place?', [
        ['Labelling 2,500 free-text reviews by theme, with accuracy measured', true],
        ['Computing like-for-like revenue growth by city for each quarter', false],
        ['Running the two-proportion test for the SMS coupon experiment', false],
        ['Deciding which stores count as like-for-like in the growth comparison', false],
      ], 'Classifying free text at volume is a task an LLM does well, and its accuracy can be measured. Totals, tests and definitions are exact calculations or decisions that belong in SQL, pandas and the plan.'),
    ],
  },

  /* ── BUILD_ANALYSIS ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_CAPSTONE_DA_BUILD_ANALYSIS',
    notes: `# Capstone Build — The Analysis

Deliver the analysis your PLAN.md describes: data in a SQL database, extraction in SQL, cleaning and exploration in
pandas, a properly checked statistical test, and findings a manager can act on. The dashboard and the AI come in the
next unit — this one produces the numbers they will show. (Requirements are written for Option A; for B or C, apply
each one to your data.)

## Requirements

**1. Load and extract with SQL.** Load the seven CSVs into MySQL, PostgreSQL or SQLite with sensible types and keys.
Put every extraction query in \`sql/\`, one file per question, each with a comment saying what it returns and at what
grain. At minimum:

- Net revenue, bills and average bill by store and month (one row per store-month).
- The like-for-like store list: stores with sales in every month of both comparison periods.
- One row per experiment member: group, and number of bills from 6 January to 2 February 2025.

**2. Check and clean in pandas** — \`01_data_checks.ipynb\`. Before any analysis, find and decide on every data problem.
Report each as **what, how many, what you did, and the effect on totals**. Look at least for: duplicated bill lines,
returns, blank customer IDs, inconsistent category values, gaps in bills by store and day, and stores that were not
open for the whole period. A gap is not a fall in sales: say how you treat it.

**3. Answer Question 1 — like-for-like growth** — \`02_growth.ipynb\`.

- Like-for-like net revenue growth by city, October–March FY25 vs October–March FY24.
- For any city that slowed: decompose revenue = bills × average bill, and split bills into members vs walk-ins. When
  did it start? Is it every store in the city or some?
- New stores reported separately; total chain growth shown both with and without them.

**4. Answer Question 2 — the SMS experiment** — \`03_sms_test.ipynb\`.

- Sample-ratio check on the split, **before** any outcome.
- Visit rate (≥1 bill in 28 days) by group, the difference in percentage points with a two-proportion z-test and a
  95% CI; bills per member by group as a secondary metric.
- **Does it pay?** Extra visits × average margin per visit, against ₹50 × coupons redeemed — state each assumption
  (for example, the margin rate, computed from products.csv).
- A recommendation: roll out, do not, or test again differently — with the caveats.

**5. Write FINDINGS.md** — answer first for each question, three supporting points with numbers, the caveats, and
what you would do next. Every number in it must trace to a notebook cell.

## Acceptance criteria

- \`sql/\` queries run on a fresh database loaded from the CSVs; notebooks run top to bottom after "Restart & Run All".
- Every data problem is listed with its count, the decision and the effect on totals; no analysis uses data before
  the checks.
- Like-for-like is defined in writing, and new stores are excluded from it.
- The decomposition explains the slowing city's change in bills and average bill, members and walk-ins.
- The experiment has an SRM check, a test, a CI in percentage points, and a cost-benefit with stated assumptions; no
  p-value is described as the probability that the coupon works.
- FINDINGS.md leads with answers and uses no number that is not reproduced in a notebook.`,
    mcqs: [
      mcq('In the data checks, one Bengaluru store has zero bills for 11–17 November 2024 and normal days either side. How should the analysis treat it?', [
        ['As missing data, flagged and handled, not as a week with no sales', true],
        ['As a real week with no sales that lowers the store\'s growth', false],
        ['As an outlier week, deleted together with the store entirely', false],
        ['As a data error that can be filled with zeros and then safely ignored', false],
      ], 'An abrupt gap with normal days either side is far likelier a data outage than a store selling nothing. Treat it as missing — exclude the week from both periods, or estimate it and say so — and report its effect on the totals.'),
      mcq('The SMS group visited more often than control. Why is "SMS50 coupons redeemed" a poor measure of the coupon\'s effect?', [
        ['Control has no coupons, and some redeemers would have visited anyway', true],
        ['Coupons are redeemed too rarely to be measured in only four weeks', false],
        ['Coupon codes are recorded only for card payments, not UPI payments', false],
        ['Redemptions can only be counted once the experiment has fully ended for everyone', false],
      ], 'The effect is the difference between randomised groups in visits. Redemptions cannot be compared with control and include members who would have shopped regardless — paying them ₹50 is a cost, not a gain.'),
    ],
    assignment: {
      title: 'Capstone: The Analysis (SQL, pandas, statistics)',
      description: 'Load the capstone data into a SQL database, check and clean it in pandas, answer the like-for-like growth and SMS experiment questions with decomposition, a two-proportion test and a cost-benefit, and write findings a manager can act on.',
      instructions: `Build the analysis described in this unit's notes for the option you chose in the Brief. Submit a repository
link or a zip.

**Submit:**

1. \`PLAN.md\` — the one-page plan from the Brief, updated if the analysis changed it.
2. \`sql/\` — the load script or instructions and one query file per question, each commented with what it returns
   and its grain.
3. \`01_data_checks.ipynb\`, \`02_growth.ipynb\`, \`03_sms_test.ipynb\` — each runs top to bottom after "Restart & Run
   All".
4. \`FINDINGS.md\` — answer first for each question, supporting numbers, caveats, next steps.
5. \`README.md\` — how to generate the data, load the database and run the notebooks; library and database versions.

**Before you submit,** go through each acceptance criterion and note in the README where it is met.`,
      rubric: [
        { criterion: 'Data checks and cleaning', description: 'Every data problem is found and listed with its count, the decision taken and the effect on totals; checks come before analysis; returns, duplicates, blanks, gaps and new stores are handled deliberately.', maxPoints: 25 },
        { criterion: 'SQL and pandas', description: 'Extraction queries are correct at the stated grain, commented and reproducible; pandas code is clear; joins are checked for fan-out; like-for-like is defined in writing and applied consistently.', maxPoints: 20 },
        { criterion: 'Growth analysis', description: 'Like-for-like growth by city; the slowing city decomposed into bills and average bill, members and walk-ins, with timing and store-level detail; new stores reported separately.', maxPoints: 20 },
        { criterion: 'Experiment analysis', description: 'SRM check first; visit-rate test with a CI in percentage points and a correct interpretation; secondary metric; a cost-benefit with stated assumptions and a recommendation that follows from it.', maxPoints: 20 },
        { criterion: 'Findings and reproducibility', description: 'FINDINGS.md leads with answers and supporting numbers, states caveats and next steps; every number is reproduced by a notebook; README explains how to run everything.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },

  /* ── BUILD_DASHBOARD_AI ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_CAPSTONE_DA_BUILD_DASHBOARD_AI',
    notes: `# Capstone Build — The Dashboard and the AI Insights

Two deliverables: a Power BI report the city managers would open every Monday, and an AI-assisted insight from the
reviews whose accuracy you have measured. The analysis unit gave you the numbers; this unit puts them in front of
the stakeholder and adds what only text can tell you.

## Part 1 — The Power BI report

**Model.** A star schema: a Sales fact at bill-line grain (from order_items joined to orders in Power Query or SQL),
and Date, Store, Product and Customer dimensions. A marked date table with fiscal year (April start), fiscal quarter
and week. Duplicated lines removed **upstream** (SQL or Power Query) with a note of how many; returns kept as
negative lines.

**Measures** (DAX, each with a description stating its definition):

- Net Revenue, Bills (distinct order_id), Average Bill = DIVIDE([Net Revenue], [Bills]).
- Gross Margin % from unit_cost.
- Member Share of Bills.
- Like-for-like Revenue Growth % vs the same period last year, counting only stores open in both periods.
- Visit Rate by experiment group (or show the experiment result as a static, labelled visual from your notebook).

**Pages:**

1. **Overview** — the KPIs vs last year with clear comparison, a city slicer, and a trend by week.
2. **City and store** — a drill-through from any city to its stores; bills and average bill side by side.
3. **Customers and the SMS test** — members vs walk-ins; the experiment result with its interval and a one-line
   reading.
4. **What customers say** — review themes by city and quarter from Part 2, with the measured accuracy stated on the
   page.

**Access.** Row-level security so each city manager sees only their city; test it with "View as". If you have no
Power BI Service licence, show RLS working in Desktop and export the report to PDF.

Every visual has a title that states its finding, the BF06 outage week is marked rather than hidden, and every number
on the overview matches FINDINGS.md.

## Part 2 — AI-assisted insight from the reviews

**1. Hand-label first.** Draw a random sample of 100 reviews (fixed seed). Label each with **one theme** —
billing, stock, freshness, staff, price, other — and a **sentiment** — positive, negative, mixed — using written rules
(for example: "two themes → the one the rating is about; if unclear, the first"). Do this **before** you see any AI
label.

**2. Label all 2,500 with an LLM API.** Use the tool and account your organisation (or your course) has approved. The
reviews contain no personal data, but strip anything that looks like a phone number or name anyway — the habit
matters. An illustrative, vendor-neutral sketch:

    import json, os, time

    API_KEY = os.environ["LLM_API_KEY"]                  # from the environment, never in the notebook
    THEMES = {"billing", "stock", "freshness", "staff", "price", "other"}
    SENTIMENTS = {"positive", "negative", "mixed"}

    def label_batch(batch):                              # batch: list of (review_id, text), about 20 per call
        ids = {rid for rid, _ in batch}
        prompt = INSTRUCTIONS + "\\n".join(f"{rid}\\t{text}" for rid, text in batch)
        for attempt in range(3):
            try:
                raw = call_llm(prompt, api_key=API_KEY, timeout=30)   # your provider's SDK call
                rows = json.loads(raw)
                good = [r for r in rows if r.get("review_id") in ids
                        and r.get("theme") in THEMES and r.get("sentiment") in SENTIMENTS]
                if len(good) == len(batch):
                    return good
            except (json.JSONDecodeError, TimeoutError, AttributeError):
                pass
            time.sleep(2 ** attempt)                     # back off, then retry
        return [{"review_id": rid, "theme": "UNLABELLED", "sentiment": "UNLABELLED"} for rid in ids]

\`INSTRUCTIONS\` gives the label set with a one-line definition of each, two examples per theme (not from your sample),
the tie-break rule, and "return only a JSON list of {review_id, theme, sentiment}". Keep the temperature low and the
prompt fixed for the whole run, and save the raw responses.

**Cost before you run.** Measure the tokens of the first batch, then estimate:

    est_cost = n_batches * (input_tokens_per_batch * price_per_input_token
                            + output_tokens_per_batch * price_per_output_token)

with the prices taken from your provider's current price list as variables. State the estimate in the README.

**3. Measure accuracy.** Compare AI labels with your 100 hand labels: overall accuracy with a 95% interval, a
confusion matrix, and precision and recall per theme. Count the UNLABELLED rows. If a theme is badly mis-labelled,
improve the instructions **once**, re-run, and re-measure on a fresh sample — not the same 100 you tuned on.

**4. Report it honestly.** Theme shares by city and quarter, with the measured accuracy stated beside them. Where a
theme's recall is low, say the AI undercounts it and by roughly how much.

**5. Optional: a narrative summary.** An LLM may draft the weekly two-line summary **from a table of numbers you
computed** — never from raw data. Check every number in the draft against the table before it goes on a page.

## Acceptance criteria

- The .pbix opens and refreshes from the provided files or database; measures have descriptions; RLS is tested.
- Every overview number matches FINDINGS.md; titles state findings; the outage week is marked.
- 100 hand labels exist, made before the AI run, with written rules.
- The LLM code reads its key from the environment, validates every response against the label sets, retries with a
  timeout, batches, and logs failures; a cost estimate is stated.
- Accuracy, its interval, the confusion matrix and per-theme precision and recall are reported, and the dashboard's
  review page states the accuracy.
- No number in the report or the summary comes from the LLM without being checked against a computed figure.`,
    mcqs: [
      mcq('The LLM returns a label "Queue" for some reviews, which is not in the label set. What should the labelling code do?', [
        ['Reject it as invalid, retry the batch, and log it if it still fails', true],
        ['Accept it, and add "Queue" as a brand-new seventh theme in the dashboard', false],
        ['Map it silently to whichever theme appears most often overall', false],
        ['Drop those reviews from the data without recording anything', false],
      ], 'Every response is validated against the allowed labels. Accepting new labels lets the label set drift; silent mapping or dropping hides errors that the accuracy check should see.'),
      mcq('On the 100 hand-labelled reviews, the AI\'s recall for "price" is 67%, while other themes are 81–93%. How should the dashboard present the price share?', [
        ['State that the AI likely undercounts price complaints, and by how much', true],
        ['Show the AI\'s price share as it is, since overall accuracy is 85%', false],
        ['Remove the price theme from the dashboard as unreliable data', false],
        ['Multiply every theme\'s share by the overall accuracy figure', false],
      ], 'Low recall means the AI misses price complaints, so its share is too low. Saying so, with the measured size, keeps the insight usable; hiding the theme or applying one blanket factor does not fix the bias.'),
    ],
    assignment: {
      title: 'Capstone: The Dashboard and the AI Insights',
      description: 'A Power BI report for city managers — star schema, described measures, four pages, row-level security — and an LLM labelling of 2,500 reviews whose accuracy is measured against 100 hand labels and reported on the dashboard.',
      instructions: `Build both parts described in this unit's notes. Submit a repository link or a zip.

**Submit:**

1. \`bazaar_fresh.pbix\` (or your option's equivalent) and a PDF export of every page.
2. \`MEASURES.md\` — each measure's DAX and its one-line definition; the RLS roles and how you tested them.
3. \`04_review_labels.ipynb\` — the sample, the hand labels (\`hand_labels_100.csv\`) and their rules, the LLM run (key
   from the environment, validation, retries, batching, failure log), the cost estimate, and the accuracy analysis:
   overall with a 95% interval, confusion matrix, per-theme precision and recall.
4. \`AI_NOTES.md\` — the approved tool used, what data was sent and what was removed first, the instructions prompt, the
   accuracy results, and what you would change.
5. A two-minute screen recording of the report: the overview, a drill-through, the RLS view as one city manager.

**Before you submit,** confirm that every overview number matches FINDINGS.md, and that no API key appears anywhere in
the repository or notebook outputs.`,
      rubric: [
        { criterion: 'Model and measures', description: 'Star schema at bill-line grain with a marked date table; duplicates removed upstream; measures correct, described and consistent with FINDINGS.md; like-for-like measure counts only comparable stores.', maxPoints: 25 },
        { criterion: 'Report design and access', description: 'Four pages built for the city managers; KPI comparisons; drill-through; message titles; outage marked; RLS by city implemented and tested.', maxPoints: 25 },
        { criterion: 'AI labelling pipeline', description: 'Approved tool; key from the environment; fixed instructions; every response validated against the label sets; retries with timeout; batching; failures logged; cost estimated before the run.', maxPoints: 20 },
        { criterion: 'Accuracy measured and reported', description: 'Independent hand labels made first; accuracy with a 95% interval; confusion matrix; per-theme precision and recall; known biases stated on the dashboard; no unchecked AI number anywhere.', maxPoints: 20 },
        { criterion: 'Documentation', description: 'MEASURES.md, AI_NOTES.md, the PDF export and the recording are complete and accurate.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  /* ── DEFENCE ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_CAPSTONE_DA_DEFENCE',
    notes: `**The panel — a hiring manager, a senior analyst, sometimes a business head — will let you present for ten minutes
and then spend twenty asking how you know.** This unit gives you the presentation script, the questions you will get,
and what a strong answer holds.

## The ten-minute script

| Time | Show | Say |
|---|---|---|
| 0:00–0:45 | Title slide with the headline answer | The business, the three questions, and the one-sentence answer to the most important one |
| 0:45–3:00 | Question 1: like-for-like growth | The definition (which stores, why); the city that slowed; the decomposition into bills and average bill, members and walk-ins; when it started |
| 3:00–5:00 | Question 2: the SMS experiment | The design (randomised, 28-day window); the sample-ratio check; the difference with its interval; whether it paid, with the assumptions |
| 5:00–6:30 | Question 3: what customers say | How the LLM labelled the reviews; the measured accuracy and its interval; the top themes by city; where the AI undercounts |
| 6:30–8:30 | The dashboard, live | The overview a city manager sees on Monday; a drill-through; the view as one city manager under RLS |
| 8:30–10:00 | Recommendations | Three actions with owners and expected impact; the biggest caveat; what you would do with two more weeks |

Rehearse it three times, timed, out loud. Keep the PDF export open in case the .pbix misbehaves. If something fails,
say what you think failed, switch to the PDF, and carry on — calm recovery is itself a signal.

## The questions, and what a strong answer contains

1. **"Walk me through how you got from the raw files to the first number on your dashboard."** CSV → SQL tables with
   keys → the extraction query at its grain → the cleaning decisions (duplicates removed, returns kept as negatives,
   outage week flagged) → the Power BI model → the measure's definition. Name the counts at each step.
2. **"Why like-for-like? Isn't total growth what the CEO cares about?"** Both matter, and you show both. Total growth
   includes new stores, so it measures expansion; like-for-like measures whether existing stores are doing better. A
   chain can grow 10% in total while every old store shrinks.
3. **"How do you know the Chennai slowdown isn't seasonal?"** You compared the same months a year earlier, the other
   cities over the same months were steady, and the change began at a specific point. Then say what you **cannot**
   tell from the data — the cause outside the store — and how you would find out (store-manager input, competitor
   openings, a short customer survey).
4. **"Your SMS result is significant. Should we send it to all members?"** The interval in percentage points, the
   cost-benefit under stated assumptions, and the risks: novelty, coupon fatigue, members trained to wait for
   coupons. A strong answer suggests a rollout with a holdout group to keep measuring.
5. **"What does your p-value mean?"** If the SMS made no difference, a gap at least this large would appear this
   often by chance. It is not the probability that the SMS works.
6. **"How do you know the AI labels are right?"** The hand-labelled sample, the accuracy with its interval, and the
   per-theme recall. See the worked example.
7. **"Why use an LLM at all? Wouldn't keyword rules do?"** Compare them: rules miss Hinglish and indirect phrasing
   ("waited forever at the counter"); an LLM handles them but must be checked. If rules scored as well on your sample,
   you would use rules — cheaper and fully predictable.
8. **"What did you send to the LLM, and was that allowed?"** Only review text and IDs, through an approved account,
   with names and phone numbers stripped; no customer table, no bills. Name the policy you followed.
9. **"What if the LLM returns something unexpected?"** Validation against the label set, retries with a timeout,
   an UNLABELLED fallback that is counted and reported. Give the count from your run.
10. **"A city manager says your numbers don't match theirs."** Reconcile: same stores, same dates, same definition of
    revenue (net of returns?), same time zone. Offer to go line by line.
11. **"What would you do differently?"** One honest change with a reason — for example, hand-labelling 200 reviews for
    a tighter interval, or agreeing metric definitions with the city managers before building the dashboard.
12. **"What was the hardest problem?"** A specific one — a join that fanned out, a gap you first read as a sales
    drop — how you found it, and what now stops it recurring.

**What the panel is really scoring:** whether you checked before you concluded, whether every number has a
definition, whether you know the limits of your methods (statistical and AI), and whether you say "the data cannot
tell us that, but here is how we would find out" instead of bluffing.`,
    workedExample: `**The question: "How do you know your AI theme labels are right?"**

A weak answer: "I read through a lot of them and they looked good."

A strong answer, with the numbers from a hand-labelled sample of 100 reviews:

> "Before running the model I hand-labelled a random sample of 100 reviews with written rules, without seeing the AI
> labels. The AI agreed with me on 85 of the 100 — 85% accuracy, and with only 100 reviews the 95% interval is about
> 77% to 91%.
>
> The errors are not random. Recall per theme: billing 93%, freshness 90%, stock 86%, staff 81%, **price 67%**. Five
> of the 15 price complaints were labelled as stock or billing — reviews like 'charged MRP on an item marked as
> discounted', which mention the counter. So the AI **undercounts price complaints**: it puts 11% of reviews in price
> where my sample says 15%. On the dashboard I state the accuracy and flag that price is likely understated by about a
> quarter.
>
> If the price share drove a decision, I would add two price examples to the instructions, re-run, and measure again
> on a **fresh** 100, because the first 100 were used to tune the prompt."

The arithmetic behind it:

    import numpy as np, pandas as pd
    from scipy import stats

    labels = ["billing", "stock", "fresh", "staff", "price"]
    m = pd.DataFrame([[25, 0, 0, 2, 0],      # rows: hand label; columns: AI label
                      [0, 19, 2, 0, 1],
                      [0, 2, 18, 0, 0],
                      [3, 0, 0, 13, 0],
                      [2, 3, 0, 0, 10]], index=labels, columns=labels)
    np.trace(m.values) / m.values.sum()                                   # 0.85
    stats.binomtest(85, 100).proportion_ci(method="wilson")               # (0.767, 0.907)
    (np.diag(m) / m.sum(axis=1)).round(3)    # recall: 0.926 0.864 0.900 0.812 0.667
    (np.diag(m) / m.sum(axis=0)).round(3)    # precision: 0.833 0.792 0.900 0.867 0.909

Precision for price is high (91%): when the AI says "price" it is usually right; it just misses some. That is
exactly the pattern that makes a share too low rather than too noisy — and it is what a panel wants to hear you
distinguish.`,
    mcqs: [
      mcq('A panellist asks, "Total revenue grew 11%, so why does your headline say like-for-like growth was only 3%?" Which answer is strongest?', [
        ['Total includes two new stores; like-for-like shows how existing stores did', true],
        ['Like-for-like is the more accurate number, so total growth is not useful', false],
        ['The 11% includes returns, which like-for-like growth always excludes', false],
        ['The two figures differ only because of rounding in the two Power BI measures', false],
      ], 'Both figures are right and answer different questions: expansion versus the health of existing stores. A strong answer explains the definition and shows both.'),
      mcq('Mid-demo, the .pbix fails to open on the panel\'s laptop. What should the student do?', [
        ['Say what likely failed, switch to the PDF export, and continue', true],
        ['Restart the laptop and wait until Power BI Desktop opens again', false],
        ['Skip the dashboard section and move straight on to questions', false],
        ['Apologise and ask to reschedule the whole presentation later', false],
      ], 'A prepared fallback and a calm diagnosis keep the story going and show professionalism. Waiting, skipping or rescheduling loses the panel\'s time and the dashboard\'s evidence.'),
      mcq('Asked "Why not just use keyword rules for the review themes?", which reply is strongest?', [
        ['Rules missed Hinglish and indirect phrasing on my sample; if they scored as well, I would use them', true],
        ['LLMs are always more accurate than keyword rules on any kind of text, so rules were never needed at all', false],
        ['Keyword rules cannot be run in Python, so an LLM was the only practical choice for the project', false],
        ['The course required an LLM, so keyword rules were never considered as an option in the project', false],
      ], 'The strong answer compares the two on evidence and would choose the cheaper, predictable option if it were as good. "Always" claims and "we were told to" are not reasons.'),
      mcq('The AI agreed with the hand labels on 85 of 100 reviews. A panellist asks how precise that figure is. What is the best answer?', [
        ['About 77% to 91% with 95% confidence, because the sample is only 100', true],
        ['Exactly 85%, since every one of the 100 reviews was checked by hand', false],
        ['Between 84% and 86%, because the full 2,500 reviews were labelled', false],
        ['It cannot be estimated without first labelling all 2,500 by hand', false],
      ], 'The 85% comes from a sample of 100, so it has sampling uncertainty; the Wilson 95% interval is about 76.7% to 90.7%. Labelling more of the reviews by hand would narrow it.'),
      mcq('A panellist asks, "What exactly did you send to the LLM?" Which answer shows the right practice?', [
        ['Review IDs and text only, via an approved account, with names and numbers removed', true],
        ['The full customer and bill tables, so the model had all the context it needed', false],
        ['Whatever fitted in the prompt, since the free chat tool does not keep any data', false],
        ['Nothing sensitive, because the model provider promised not to read any of it', false],
      ], 'Send the minimum the task needs, through a tool the organisation has approved, with personal details removed. Assumptions about what a tool keeps or promises are not a policy.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_CAPSTONE_DA_CHECKPOINT',
    notes: `Ten scenario questions across the whole Data Analytics + AI track — SQL, pandas, statistics, Power BI, business
metrics and AI — at the level of judgement a hiring manager expects from someone who has delivered an end-to-end
analysis. Each describes a situation from a capstone like yours; choose what you would actually do, and be ready to
say why.`,
    checkpoint: [
      ck(BM, 'A query to find members with no bill in March reads: customers c LEFT JOIN orders o ON o.customer_id = c.customer_id WHERE o.order_date >= \'2025-03-01\' AND o.order_id IS NULL. It returns zero rows. Why?', [
        ['The date filter in WHERE removes the NULL rows; it belongs in the ON clause', true],
        ['LEFT JOIN cannot return rows that have no match in the orders table at all', false],
        ['The date must be written as a DATE() call or MySQL ignores the whole comparison', false],
        ['IS NULL must be tested on o.customer_id rather than on the order_id column', false],
      ], 'For unmatched customers o.order_date is NULL, and NULL >= a date is not true, so WHERE drops exactly the rows wanted. Putting the date condition in ON keeps them.'),
      ck(BM, 'In pandas, bill lines are merged with a payments table and net revenue comes out 4% above the finance figure. What check would have caught it?', [
        ['Comparing row counts before and after, or merge with validate="many_to_one"', true],
        ['Converting every amount column to float before the merge is carried out', false],
        ['Sorting both DataFrames by order_id before merging them into one table', false],
        ['Using an outer join instead of an inner join so that no rows are lost on either side', false],
      ], 'A payments table with several rows per bill fans out the merge and repeats line amounts. validate= raises an error when the right side is not unique per key, and a row-count check shows it at once.'),
      ck(BM, 'A fintech cashback test gives 7.6% vs 8.4% conversion with 5,000 users per arm: p = 0.14, 95% CI −0.26 to +1.86 pp. What is the right conclusion?', [
        ['Inconclusive: the interval includes zero and also a meaningful gain', true],
        ['The cashback works, as 8.4% is clearly higher than the 7.6% control', false],
        ['The cashback does not work, as the p-value is above the 0.05 level', false],
        ['The cashback reduces conversion, as the interval starts below zero', false],
      ], 'A non-significant result with a wide interval means the test could not tell. A larger, properly sized test would; "no effect" is not shown.'),
      ck(BM, 'Chain revenue grew 11% in a year in which two new stores opened; the 14 older stores grew 3%. Which figure answers "are our existing stores doing better?"', [
        ['The 3% like-for-like growth of the 14 older stores', true],
        ['The 11% total growth, since it includes every store', false],
        ['An average of 11% and 3%, weighted by store count', false],
        ['Neither, as growth can only be compared monthly', false],
      ], 'Like-for-like compares stores open in both periods, so it isolates existing-store performance from expansion. The total answers a different question.'),
      ck(DASH, 'A Power BI card uses Average Bill = AVERAGE(Sales[LineAmount]) and shows ₹528, while the average bill is about ₹1,850. What is the fix?', [
        ['DIVIDE([Net Revenue], DISTINCTCOUNT(Sales[OrderID]))', true],
        ['AVERAGEX(Sales, Sales[LineAmount] * Sales[Qty])', false],
        ['SUM(Sales[LineAmount]) / COUNTROWS(Sales)', false],
        ['A calculated column that averages each bill line in turn', false],
      ], 'AVERAGE over the line table gives the average line, not the average bill. Revenue divided by distinct bills is correct at every filter level; the other options still work per line.'),
      ck(DASH, 'A city manager in Pune opens the dashboard and can see Chennai stores. Which change fixes it?', [
        ['An RLS role filtering Store[City] by the user, tested with "View as"', true],
        ['A Pune bookmark set as the default view when the report is first opened', false],
        ['A city slicer that is hidden on the report page and set to Pune', false],
        ['A separate copy of the report saved for each city\'s manager', false],
      ], 'Only row-level security restricts what data a user can query. Bookmarks and slicers change the view but the user can still reach other cities, and copies multiply maintenance.'),
      ck(DASH, 'A store\'s weekly revenue shows zero for the week of a POS outage. How should the dashboard handle that week?', [
        ['Mark it as missing data on the visual and exclude it from comparisons', true],
        ['Hide the week from every visual so the trend line looks smooth again', false],
        ['Show zero, since that is what the data contains for those seven days', false],
        ['Fill it with the average of the weeks before and after, unmarked', false],
      ], 'A gap is not a sales collapse. Marking it keeps the reader informed, and excluding it from comparisons stops a data outage from distorting growth figures.'),
      ck(LLM, 'An LLM drafts the weekly summary: "North region revenue fell 18% this quarter." The computed figure is −6%. What process prevents this?', [
        ['The LLM drafts only from a table of computed numbers, and each is checked', true],
        ['Lowering the temperature so the model repeats its figures more reliably each time', false],
        ['Asking the model to double-check its own numbers before it replies', false],
        ['Giving the model the raw bill data so it can compute the figures itself', false],
      ], 'Numbers come from SQL, pandas or DAX; the LLM only words them, and every figure in its draft is verified against the source table. Temperature and self-checks reduce, not remove, invented numbers.'),
      ck(LLM, 'The AI labelled 2,500 reviews. On 100 hand labels it agrees 85% of the time, but recall for "price" is 67%. What should the findings say?', [
        ['Theme shares with the accuracy stated, noting price is likely undercounted', true],
        ['Theme shares as labelled, since 85% accuracy is high enough for reporting', false],
        ['Nothing about themes, as any figure below 90% accuracy cannot be used', false],
        ['Theme shares multiplied by 0.85 so that they reflect the overall accuracy', false],
      ], 'Reporting the measured accuracy and the known direction of error keeps the insight usable and honest. A blanket correction ignores that the errors are concentrated in one theme.'),
      ck(LLM, 'A colleague wants to paste 5,000 support tickets, including customer phone numbers, into a free public chatbot to "find themes quickly". What is the right response?', [
        ['Use only a company-approved tool, after removing personal details', true],
        ['Go ahead, since the chatbot is free and very quick to use for this', false],
        ['Go ahead, but paste the tickets in small batches of a few hundred', false],
        ['Ask the chatbot whether it stores data before pasting the tickets in', false],
      ], 'Personal data must never go into a tool the company has not approved. Approved tooling, minimal data and stripped identifiers are the rule; batching or asking the tool does not change it.'),
    ],
  },
];
