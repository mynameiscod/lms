/**
 * Career-track content: statistics for decisions, hypothesis tests and A/B testing (Data Analytics + AI,
 * batch A3).
 *
 * DT_STATS_DECISIONS — describing skewed business data honestly, distributions, samples and bias, confidence
 * intervals, and correlation versus causation. Builds on Year 1's T_STATS (centre, spread, shape, conditional
 * probability, misleading statistics) rather than repeating it: here the same ideas meet pandas, SciPy and
 * the questions a manager asks an analyst.
 * DT_AB_TESTING — hypotheses and p-values, choosing a test, designing an experiment, the pitfalls that ruin
 * one, and reporting a result, ending with a checkout A/B test mini project.
 *
 * Every number shown was computed with pandas 3.0, NumPy 2.5 and SciPy 1.18 (the code also runs on pandas 2.2
 * and SciPy 1.11+). Simulated results quote the seed used. Interpretations are the frequentist ones: a 95%
 * confidence interval comes from a method that captures the true value in 95% of repeated samples, and a
 * p-value is the probability of data at least this extreme if the null hypothesis were true.
 *
 * DT_STATS_DECISIONS is two-skill, so every checkpoint question names STATISTICS_BASICS or PROBABILITY_BASICS
 * with ck(), following trackSkillAttribution.ts (SAMPLING and CONFIDENCE_INTERVALS are PROBABILITY_BASICS
 * units). DT_AB_TESTING is single-skill (HYPOTHESIS_TESTING), so its questions carry no skillKey.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const STATS = 'STATISTICS_BASICS';
const PROB = 'PROBABILITY_BASICS';

export const TRACK_DATA_STATS_BUNDLES: PilotBundle[] = [
  /* ══ DT_STATS_DECISIONS ══════════════════════════════════════════════════════════════════ */

  /* ── DESCRIBE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_STATS_DECISIONS_DESCRIBE',
    notes: `Year 1 showed you why a median can be more honest than a mean and why an average without a spread
is half an answer. This unit is the analyst's version: the summary a manager will **act on**, computed in
pandas, on data that is never as tidy as a textbook.

## The data used in this unit

ShopKart is an e-commerce marketplace. One home-decor seller's orders for a single day, in ₹:

    import pandas as pd

    v = pd.Series([349, 399, 420, 450, 499, 499, 520, 610, 680, 750, 1250, 8999],
                  name="order_value")

Eleven ordinary orders, and one ₹8,999 order — a customer who bought a full set of curtains for a new flat.
It is not an error. It is real revenue, and it is exactly the kind of row that makes summaries lie.

## Centre: mean, median, mode

    v.mean()            # 1285.4166...
    v.median()          # 509.5
    v.mode().tolist()   # [499]

The **mean is ₹1,285**, yet **10 of the 12 orders are below ₹760** and only one order — the ₹8,999 one —
is above the mean at all. That single order is **58% of the
day's ₹15,425** revenue, and it drags the mean up to a value almost no customer actually paid.

The **median, ₹509.50**, is the middle of the sorted values (the average of the 6th and 7th, ₹499 and ₹520).
Half the orders are below it, half above, and the ₹8,999 order could be ₹89,999 without moving it.

The **mode, ₹499**, is the most common value — useful here only because ₹499 is a price point. With
continuous data the mode is rarely meaningful; it shines for categories ("most common payment mode: UPI").

Which one do you report? **It depends on the question**, and saying which question you answered is the
honest part:

| Question | Right summary | Why |
|---|---|---|
| "What does a typical customer spend?" | Median, ₹509.50 | Not pulled by one big basket |
| "How much revenue per order did we make?" | Mean, ₹1,285 | Revenue = mean × orders; the big order is real money |
| "Which price point is most popular?" | Mode, ₹499 | A count question, not an average |

A useful middle ground is a **trimmed mean** — drop the most extreme values on each side and average the rest:

    from scipy import stats
    stats.trim_mean(v, 0.1)     # 607.7  (drops 10% from each end: here 1 order at each end)

## Spread: standard deviation, IQR and percentiles

    v.std()     # 2440.98   (pandas: sample SD, divides by n − 1)

A standard deviation of ₹2,441 on orders that are mostly ₹400–₹750 says nothing useful — like the mean, it is
dominated by the one large order. For skewed data, describe spread with **percentiles**:

    v.quantile([0.10, 0.25, 0.50, 0.75, 0.90])

    0.10     401.1
    0.25     442.5
    0.50     509.5
    0.75     697.5
    0.90    1200.0

- **Q1 = ₹442.50, Q3 = ₹697.50**, so the **interquartile range (IQR) = ₹255**: the middle half of orders sits in
  a ₹255 band.
- **p90 = ₹1,200**: 90% of orders are at or below about ₹1,200. Percentiles are how operations teams talk —
  "p90 delivery time", "p95 page load".

pandas interpolates between values for quantiles (the default \`interpolation="linear"\`), so Q1 = ₹442.50 is
not a value anybody paid; Excel's PERCENTILE.INC gives the same numbers, while PERCENTILE.EXC uses a different
rule and gives slightly different ones. Say which you used if someone will recompute.

## The five-number summary and describe()

    v.describe()

    count      12.000000
    mean     1285.416667
    std      2440.980669
    min       349.000000
    25%       442.500000
    50%       509.500000
    75%       697.500000
    max      8999.000000

Read it **top-down as a story**: 12 orders; the mean is far above the median (2.5×), so the data is
right-skewed; the max is 13× Q3, so look at the top rows before saying anything. min, Q1, median, Q3, max is
the **five-number summary** — what a box plot draws.

With the 1.5 × IQR rule the fences are 442.5 − 382.5 = **₹60** and 697.5 + 382.5 = **₹1,080**, so **two**
orders are flagged — the ₹1,250 and the ₹8,999. Being flagged is a prompt to look, not a reason to delete:
both are genuine sales.

## Comparing groups: always centre AND spread

Delivery minutes for 8 orders in each of two cities of a food-delivery app:

    d = pd.DataFrame({
        "city": ["Hyderabad"] * 8 + ["Pune"] * 8,
        "mins": [22, 25, 27, 28, 30, 31, 33, 95,
                 26, 28, 29, 30, 31, 32, 34, 36],
    })
    d.groupby("city")["mins"].agg(["mean", "median", "std"]).round(1)

               mean  median   std
    city
    Hyderabad  36.4    29.0  23.9
    Pune       30.8    30.5   3.2

By the mean, Pune is 5.6 minutes faster. By the median, **Hyderabad is slightly faster** (29 vs 30.5). The
truth: Hyderabad is usually quick but has one 95-minute disaster; Pune is consistently around half an hour.
Those are two different operational problems, and only the spread (SD 23.9 vs 3.2) and a look at the
maximum reveal it. A one-line "Pune is faster" would send the ops team to fix the wrong thing.

## What a summary hides — say it

Every summary throws information away. Good analysts add one sentence about what was lost:

- "Median order ₹509.50; one ₹8,999 order is 58% of the day's revenue."
- "Median delivery 29 minutes in Hyderabad, but one order took 95 — check that order."
- The **count** behind every number: an average of 12 orders and an average of 12,000 deserve different
  confidence (the next units make that precise).

## In Excel

AVERAGE, MEDIAN, MODE.SNGL, STDEV.S (sample, same as pandas) vs STDEV.P (population, same as NumPy's default),
QUARTILE.INC and PERCENTILE.INC. A PivotTable shows "Average" but has **no median** — one reason analysts
move the summary step into pandas or Power BI.`,
    workedExample: `**Task: a manager asks "what is our average order value?" for the ShopKart seller above. Answer it
properly.**

**1. Ask what the number is for.** If it is for a revenue forecast ("orders × average"), the mean is the
right input, because revenue is a sum. If it is for setting a free-delivery threshold ("most customers spend
about…"), it is the median.

**2. Compute both, plus the context.**

    summary = {
        "orders": v.count(),
        "revenue": v.sum(),
        "mean": round(v.mean(), 2),
        "median": v.median(),
        "p90": v.quantile(0.9),
        "largest_share": round(v.max() / v.sum(), 2),
    }
    summary
    # {'orders': 12, 'revenue': 15425, 'mean': 1285.42, 'median': 509.5,
    #  'p90': 1200.0, 'largest_share': 0.58}

**3. Check the effect of the extreme value.**

    v[v < 8999].mean(), v[v < 8999].median()     # (584.18..., 499.0)

Without the one ₹8,999 order the mean falls from ₹1,285 to ₹584 — a 55% drop from removing 1 of 12 rows. The
median moves only from ₹509.50 to ₹499.

**4. Write the answer with its caveat.**

"A typical order is about ₹510 (median of 12 orders). Revenue per order was ₹1,285, but one ₹8,999 order
made up 58% of the day's revenue; without it, revenue per order would have been ₹584. For planning, use the
median for customer behaviour and a longer period's mean for revenue."

Notice the answer never says "the average" without saying which one.`,
    mcqs: [
      mcq('A seller\'s 12 order values have mean ₹1,285 and median ₹509.50, and one order of ₹8,999 is 58% of revenue. Which statement is a fair summary for a manager?', [
        ['A typical order is about ₹510; one large order lifts the mean', true],
        ['Customers usually spend around ₹1,285 with this seller', false],
        ['The ₹8,999 order is an error and should be deleted first', false],
        ['Mean and median differ, so the data cannot be summarised', false],
      ], 'The median describes the typical customer and the mean is inflated by one real, large order. Deleting it would understate revenue; the honest summary reports both with the reason they differ.'),
      mcq('Two cities\' delivery times give Hyderabad mean 36.4 / median 29.0 / SD 23.9 and Pune mean 30.8 / median 30.5 / SD 3.2 minutes. What should the ops team conclude first?', [
        ['Hyderabad is usually fast but has rare very slow orders', true],
        ['Pune is faster than Hyderabad on every single order', false],
        ['Hyderabad is slower on most orders, by about 6 minutes', false],
        ['The two cities perform the same once rounding is applied', false],
      ], 'A median below Pune\'s with a much larger SD and mean points to a few extreme delays, not a slow city. That is a different problem (find the outliers) from a city that is slow throughout.'),
      mcq('Why does `v.std()` in pandas give 2.55 for [12, 15, 9, 14, 10] while `np.std(v)` gives 2.28?', [
        ['pandas divides by n − 1 and NumPy by n by default', true],
        ['NumPy rounds each value before it computes the SD', false],
        ['pandas uses the median instead of the mean inside', false],
        ['One of them silently drops the largest value first', false],
      ], 'pandas\' std() is the sample SD (ddof=1, like Excel\'s STDEV.S); NumPy defaults to ddof=0, the population SD (STDEV.P). Pass ddof explicitly when the two must agree.'),
    ],
    checkpoint: [
      ck(STATS, 'What do `pd.Series([200, 220, 250, 260, 3000]).mean()` and `.median()` return?', [
        ['786.0 and 250.0', true],
        ['250.0 and 786.0', false],
        ['786.0 and 235.0', false],
        ['732.5 and 250.0', false],
      ], 'The mean is 3930 / 5 = 786; the median is the middle sorted value, 250. One large value moves the mean far above four of the five values.'),
      ck(STATS, 'A bank reports "average account balance ₹1.8 lakh" when the median is ₹22,000. A journalist asks if a typical customer has ₹1.8 lakh. What is the accurate reply?', [
        ['No — half of customers hold ₹22,000 or less', true],
        ['Yes — the mean is the balance of a typical customer', false],
        ['No — the typical balance must be higher than ₹1.8 lakh', false],
        ['Yes — a mean and a median always tell the same story', false],
      ], 'Balances are right-skewed: a few very large accounts lift the mean. The median says half the customers have ₹22,000 or less, which is what "typical" means.'),
      ck(STATS, 'Delivery times have Q1 = 24, median 29 and Q3 = 36 minutes. Using the 1.5 × IQR rule, above what time is a delivery flagged?', [
        ['54 minutes', true],
        ['48 minutes', false],
        ['42 minutes', false],
        ['65 minutes', false],
      ], 'IQR = 36 − 24 = 12; the upper fence is 36 + 1.5 × 12 = 54. A flagged order is one to investigate, not automatically one to remove.'),
    ],
  },

  /* ── DISTRIBUTIONS ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_STATS_DECISIONS_DISTRIBUTIONS',
    notes: `Before you summarise a column, look at its **shape**. The shape decides which summary is honest, which
chart works, and whether "mean ± 2 SD" means anything. Business data has a small number of shapes that come up
again and again — learn to recognise them.

## The data used in this unit

Ten thousand simulated orders that behave like real e-commerce baskets, plus delivery times and rider
distances. Simulated so you can reproduce every number (seed 42):

    import numpy as np
    import pandas as pd

    rng = np.random.default_rng(42)
    orders = pd.Series(np.round(rng.lognormal(mean=6.2, sigma=0.8, size=10_000)), name="order_value")

## Shape 1: right-skewed (most business money data)

    orders.describe().round(1)

    count    10000.0
    mean       676.1
    std        649.0
    min         15.0
    25%        287.0
    50%        488.0
    75%        829.0
    max      12341.0

    orders.skew()                          # 3.65
    (orders < orders.mean()).mean()        # 0.658

Signs of right skew, all visible in \`describe()\`: **mean (676) well above median (488)**, max far from Q3, and a
positive \`skew()\`. **65.8% of orders are below the mean** — "above-average order" is a minority.

Order values, salaries, account balances, time spent on an app, and customers' lifetime spend are all
right-skewed: a floor at zero and no ceiling. Revenue is concentrated in the tail:

    top10 = orders[orders >= orders.quantile(0.9)]
    top10.sum() / orders.sum()             # 0.319

**The top 10% of orders bring in 31.9% of revenue.** That concentration is a finding in itself.

**"Mean ± 2 SD" is broken here.** 676 − 2 × 649 = **−₹622**, an impossible order value. (About 96% of these
orders still fall inside mean ± 2 SD, but only because the band starts below zero — the rule tells you nothing
useful.) Use percentiles instead: p50 ₹488, p90 ₹1,372, p95 ₹1,834, p99 ₹3,244.

## A log scale turns this shape into a usable one

    np.log10(orders).skew()     # -0.0  (essentially symmetric)

On a log scale ₹100, ₹1,000 and ₹10,000 are equally spaced — each step is "10 times more". A histogram of
\`np.log10(orders)\` looks like a bell; this data is **log-normal**. In practice:

- Plot money on a log x-axis (\`ax.set_xscale("log")\`) when values span several orders of magnitude.
- Compare groups by **ratios** ("Mumbai baskets are 1.3× Pune's") rather than differences.
- Label the axis in ₹, not in "log10(₹)": readers should never have to undo a logarithm.

## Shape 2: roughly normal (sums of many small effects)

    km = pd.Series(rng.normal(85, 12, 10_000))    # rider kilometres per day

Mean 85.2, SD 12.0, skew 0.01. Here the Year-1 rule works: **68.0% within 1 SD and 95.6% within 2 SD**
(theory: 68.3% and 95.4%). Heights, measurement error, and daily totals of many independent small events tend
to be bell-shaped. Real business data is normal less often than textbooks suggest — check, do not assume.

## Shape 3: skewed with a floor — delivery times

    dt = pd.Series(np.round(10 + rng.gamma(shape=3, scale=7, size=10_000)))

Mean 30.9, median 28.5, p90 **47** minutes, skew 1.14, and **11.8% of orders take more than 45 minutes**.
Nothing is delivered faster than about 10 minutes (cooking + travel), but a bad day has no upper limit. For an
SLA, the **p90 and the share above a threshold** matter far more than the mean: customers remember the slow
order, not the average one.

## Shape 4: two humps — the average customer who does not exist

A food-delivery app's monthly spend per customer mixes two groups: students ordering snacks and families
ordering dinners.

    spend = pd.Series(np.concatenate([rng.normal(600, 120, 6000),
                                      rng.normal(3200, 400, 4000)]))
    spend.mean(), spend.median()                    # (≈ 1642, ≈ 717)
    ((spend - spend.mean()).abs() < 300).sum()      # 5

The mean is about **₹1,642 a month**, yet only **5 customers in 10,000** spend within ₹300 of it. A marketing
plan aimed at "the average customer who spends ₹1,600" is aimed at nobody. Two humps mean **two segments**:
split them (\`pd.cut\`, or by a column that explains them, like household size) and summarise each separately.

## Choosing summaries and charts by shape

| Shape | Centre | Spread | Chart |
|---|---|---|---|
| Roughly normal | Mean | SD | Histogram |
| Right-skewed (money, time) | Median (+ mean if revenue matters) | IQR, p90/p95 | Histogram on a log axis, box plot |
| With a floor and a long tail (SLA times) | Median | p90, share above threshold | Histogram with the threshold marked |
| Two or more humps | Per segment | Per segment | Histogram split by segment |

## Look first — in two lines

    orders.plot.hist(bins=50)              # the shape
    orders.describe(percentiles=[.1, .5, .9, .99])

If the mean and median differ by more than about 10%, or the max is many times the p99, assume skew until you
have looked. Excel's equivalents are a histogram chart and SKEW(); Power BI's are the histogram visual and a
box-and-whisker custom visual.`,
    workedExample: `**Task: the category head of a fashion marketplace wants "the average order value" to set a free-shipping
threshold. The orders follow the shape above. Recommend a threshold.**

**1. Look at the shape before computing anything.** \`describe()\` shows mean ₹676 and median ₹488 with
skew 3.65: strongly right-skewed. An average would place the threshold above two-thirds of orders.

**2. Translate the business goal into a percentile.** A free-shipping threshold should nudge customers who
are *just below* it to add an item. If it sits at the median, half of orders already qualify; at p75, a quarter
do.

    orders.quantile([0.5, 0.6, 0.7, 0.75]).round(0)
    # 0.50    488.0
    # 0.60    596.0
    # 0.70    741.0
    # 0.75    829.0

**3. Check the share that would qualify at candidate thresholds.**

    for t in [499, 599, 799]:
        print(t, round((orders >= t).mean(), 3))
    # 499 0.486
    # 599 0.398
    # 799 0.267

Thresholds at round price points let marketing say "free shipping above ₹599".

**4. Recommend with reasoning.** "Orders are right-skewed (median ₹488, mean ₹676), so the mean would set the
threshold too high for most customers to reach. ₹599 sits at about the 60th percentile: 39.8% of orders
already qualify, and the 14.5% of orders between ₹450 and ₹599 are the ones most likely to add an item to
cross it. Test ₹599 against
the current threshold with an A/B test before rolling it out." — the A/B testing topic shows how.`,
    mcqs: [
      mcq('An orders column has mean ₹676, SD ₹649 and median ₹488. A colleague says "95% of orders lie between −₹622 and ₹1,974". What is wrong?', [
        ['Mean ± 2 SD assumes a symmetric shape; this data is skewed', true],
        ['The SD should be divided by the number of orders first', false],
        ['The range is correct but should be quoted to the paisa', false],
        ['Mean ± 2 SD always contains exactly 95% of any data', false],
      ], 'The lower end is an impossible negative order value, a sign that the normal-curve rule does not fit right-skewed data. Percentiles (p2.5, p97.5 or p90) describe it honestly.'),
      mcq('Monthly spend per customer has humps near ₹600 and ₹3,200, and the mean is ₹1,642. What should the analyst do before reporting?', [
        ['Split the customers into the two segments and summarise each', true],
        ['Report the mean, since it lies between the two groups', false],
        ['Take logs so the two humps merge into a single bell', false],
        ['Remove the higher hump as a set of outlying customers', false],
      ], 'Two humps mean two kinds of customer. Almost nobody spends near ₹1,642, so a single average describes no one; per-segment summaries do.'),
      mcq('Why plot order values on a log x-axis when they range from ₹15 to ₹12,341?', [
        ['Equal steps then mean equal ratios, so the tail stops hiding the bulk', true],
        ['Log axes remove outliers from the data before it is plotted', false],
        ['A log axis converts the order values into percentages of total', false],
        ['Matplotlib cannot draw values above ₹10,000 on a linear axis', false],
      ], 'On a linear axis most orders squash against the left edge. On a log axis ₹100→₹1,000 takes the same width as ₹1,000→₹10,000, so the shape of the bulk is visible.'),
    ],
    checkpoint: [
      ck(STATS, '`describe()` on monthly salaries shows mean ₹48,000, median ₹31,000 and max ₹9,50,000. What shape is the data, most likely?', [
        ['Right-skewed, with a long tail of high salaries', true],
        ['Left-skewed, with a long tail of low salaries', false],
        ['Symmetric and bell-shaped around ₹48,000', false],
        ['Bimodal, with two equal humps of salaries', false],
      ], 'A mean well above the median and a max far above both point to a few very large values on the right — the usual shape of pay and money data.'),
      ck(STATS, 'For delivery times with median 28.5, mean 30.9 and p90 47 minutes, which figure best supports a promise like "most orders arrive within 45 minutes"?', [
        ['The share of orders taking more than 45 minutes', true],
        ['The mean delivery time of 30.9 minutes', false],
        ['The median delivery time of 28.5 minutes', false],
        ['The standard deviation of the delivery times', false],
      ], 'A promise about a threshold is checked by the share above that threshold (11.8% in the unit\'s data). Centre measures say nothing about how many orders break the promise.'),
      ck(STATS, 'A log10 transform of order values gives a skew close to 0. What does that tell you about the original values?', [
        ['They are roughly log-normal and right-skewed', true],
        ['They were symmetric before the transformation', false],
        ['They contain negative and zero order values', false],
        ['They follow a normal curve with no outliers', false],
      ], 'If the logarithm is symmetric, the raw values are spread multiplicatively — a long right tail. Summaries and comparisons are then best done with medians, percentiles or ratios.'),
    ],
  },

  /* ── SAMPLING ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_STATS_DECISIONS_SAMPLING',
    notes: `Analysts rarely see everything. You see last month's orders, the customers who answered a survey, the
stores that sent their files on time. Every conclusion is about a **population** but computed from a
**sample**, and two things can go wrong: the sample can be **biased** (it differs from the population in a
systematic way), and it can be **small** (it differs by chance). Bias is the more dangerous of the two,
because more data does not fix it.

## Population, sample, parameter, statistic

| Term | Example |
|---|---|
| Population | All 2 lakh orders placed in March |
| Sample | 400 orders a finance auditor pulled |
| Parameter (true, usually unknown) | The mean order value of all 2 lakh orders |
| Statistic (computed) | The mean of the 400 sampled orders |

The whole of inference is the gap between the statistic you have and the parameter you want.

## Bias: the sample is the wrong shape

Year 1 met survivorship bias with returning aircraft. In analyst work it looks like this:

- **Survey (non-response) bias.** A fintech app emails a satisfaction survey; 8% reply, and 82% of replies are
  happy. The people who bother to reply are the very engaged and the very angry — not a miniature of all users.
- **Selection bias.** "Customers who use our premium tier spend 3× more" — premium customers *chose* the tier,
  and big spenders are the ones who choose it.
- **Survivorship bias.** Analysing only the stores still open in 2024 to learn "what makes a store succeed"
  hides every store with the same features that closed.
- **Convenience sampling.** Interviewing shoppers at one Bengaluru mall on a Saturday to represent a national
  brand's customers.
- **Time-window bias.** Measuring "average customer tenure" from current customers only misses everyone who
  churned early.

The fix is in the **design**: random samples where possible, the same sampling rule for everyone, and a
question you ask out loud — *who is missing from this data, and are they different?* Then compare the sample
to known population figures (city mix, device mix, new vs returning) before trusting it.

## Chance: why averages of samples behave predictably

Even a perfect random sample differs from the population by chance. The surprise is how **predictable**
that chance is. A simulation makes it concrete — a population of 2 lakh right-skewed orders (seed 7):

    import numpy as np
    import pandas as pd

    rng = np.random.default_rng(7)
    pop = pd.Series(np.round(rng.lognormal(6.2, 0.8, 200_000)))
    pop.mean(), pop.std(ddof=0), pop.median(), pop.skew()
    # (≈ 678.6, ≈ 639.9, 493.0, ≈ 3.52)

Now draw 2,000 random samples of each size and record each sample's mean:

    for n in [5, 30, 100, 400]:
        means = pd.Series([pop.sample(n, random_state=i).mean() for i in range(2000)])
        print(n, round(means.mean(), 1), round(means.std(), 1),
              round(pop.std(ddof=0) / np.sqrt(n), 1), round(means.skew(), 2))

| n | Mean of the 2,000 sample means | SD of the sample means | σ / √n | Skew of the means | Within 10% of the true mean |
|---|---|---|---|---|---|
| 5 | 670.6 | 273.3 | 286.2 | 1.50 | 19.4% |
| 30 | 680.5 | 114.0 | 116.8 | 0.46 | 44.2% |
| 100 | 679.6 | 64.0 | 64.0 | 0.33 | 72.0% |
| 400 | 677.7 | 30.9 | 32.0 | 0.08 | 97.2% |

Three things to see:

1. **Sample means centre on the true mean (678.6)** at every size. Random sampling is unbiased.
2. **Their spread shrinks like σ / √n.** That spread has a name — the **standard error** (SE). Quadrupling the
   sample (100 → 400) only **halves** it (64 → 31). Precision is expensive.
3. **Their shape becomes a bell** even though the orders are very skewed (skew 3.52 → 0.08). This is the
   **central limit theorem**: the mean of a reasonably large random sample is approximately normally
   distributed, whatever the shape of the data. "Reasonably large" depends on the skew — for this data, n = 30
   is still visibly skewed and n = 100+ is close.

The CLT is why the confidence intervals and tests in the next units work on skewed business data: they are
about the **mean**, and the mean's sampling distribution is close to normal at the sample sizes analysts use.

## In practice: one sample, and its standard error

You never have 2,000 samples. You have one, and you estimate the SE from it:

    s = pop.sample(100, random_state=1)
    s.mean(), s.std(), s.std() / np.sqrt(len(s))
    # (≈ 690.3, ≈ 682.2, ≈ 68.2)

"The mean order in our sample is ₹690, with a standard error of about ₹68" — so the true mean is plausibly
within a hundred-odd rupees of ₹690. The next unit turns that into a confidence interval.

## Bias versus chance

| | Chance (sampling error) | Bias |
|---|---|---|
| Cause | Which units happened to be picked | How units were picked or who answered |
| Shrinks with more data? | Yes, like 1 / √n | **No** — a bigger biased sample is confidently wrong |
| Measured by | Standard error, confidence interval | Not measured by any formula; found by thinking |

A survey of 50,000 app users who opted in to notifications has a tiny standard error and may still be badly
wrong about all users.`,
    mcqs: [
      mcq('A fintech app sends a survey to all 2 lakh users; 16,000 reply and 82% say they are satisfied. Why is "82% of users are satisfied" not safe to report?', [
        ['People who choose to reply may differ from those who do not', true],
        ['16,000 replies is too few to compute any percentage at all from it', false],
        ['Satisfaction has to be measured on a scale from 1 to 10', false],
        ['The figure should be rounded to 80% before it is reported', false],
      ], 'With an 8% response rate the replies are self-selected. The sample is large, so chance error is small, but non-response bias is not reduced by more replies.'),
      mcq('In the simulation, the SD of sample means is 64.0 at n = 100. Roughly what is it at n = 400?', [
        ['About 32, half as large', true],
        ['About 16, a quarter as large', false],
        ['About 64, unchanged with n', false],
        ['About 128, twice as large', false],
      ], 'The standard error is σ / √n, so four times the sample divides it by √4 = 2. The simulation gave 30.9 against a formula value of 32.0.'),
      mcq('Order values are heavily right-skewed (skew 3.5). What does the central limit theorem say about the mean of a random sample of 400 orders?', [
        ['Its sampling distribution is close to a normal curve', true],
        ['The 400 sampled orders will be close to a normal curve', false],
        ['The sample mean will equal the population mean exactly', false],
        ['The sample median will become equal to the sample mean', false],
      ], 'The CLT is about the distribution of the sample mean across repeated samples, not about the data. The 400 orders stay skewed; their mean behaves like a normal variable.'),
    ],
    checkpoint: [
      ck(PROB, 'A retail chain studies "what top stores have in common" using only the 140 stores open today, ignoring 60 that closed. Which bias is this?', [
        ['Survivorship bias', true],
        ['Non-response bias', false],
        ['Measurement bias', false],
        ['Confirmation bias', false],
      ], 'Stores that closed may have shared the same features. Studying only survivors makes features look like causes of success when they may be common to failures too.'),
      ck(PROB, 'Order values have a population SD of ₹600. What is the standard error of the mean of a random sample of 144 orders?', [
        ['₹50', true],
        ['₹4.17', false],
        ['₹600', false],
        ['₹25', false],
      ], 'SE = σ / √n = 600 / 12 = 50. It measures how far a sample mean typically falls from the true mean, not how spread out individual orders are.'),
      ck(PROB, 'An analyst doubles a survey from 5,000 to 10,000 responses, all collected from users who opted in to marketing emails. What improves?', [
        ['Only the chance error, by about 29%', true],
        ['Both the chance error and the bias', false],
        ['Only the bias, as the sample is larger', false],
        ['Neither, as doubling changes nothing', false],
      ], 'SE scales with 1 / √n, so doubling n multiplies it by 1 / √2 ≈ 0.71 — a 29% reduction. The sample still contains only opted-in users, so the bias is untouched.'),
    ],
  },

  /* ── CONFIDENCE_INTERVALS ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_STATS_DECISIONS_CONFIDENCE_INTERVALS',
    notes: `A sample mean on its own is a point estimate: "average delivery time is 34 minutes". The honest
version adds the uncertainty: "34 minutes, give or take about 2". A **confidence interval** is that "give
or take", calculated rather than guessed — and it is the number most often **misread** in business reports.

## The data used in this unit

A cloud-kitchen brand in Chennai timed 25 randomly chosen deliveries last week (minutes):

    import numpy as np
    import pandas as pd
    from scipy import stats

    t = pd.Series([28, 35, 31, 42, 26, 33, 38, 29, 45, 31, 27, 36, 40,
                   30, 34, 25, 39, 32, 37, 44, 29, 33, 41, 28, 36])

## Step 1: the standard error

    n = len(t)                    # 25
    m = t.mean()                  # 33.96
    s = t.std()                   # 5.719  (sample SD)
    se = s / np.sqrt(n)           # 1.144

The **standard error** (SE = s / √n) is the estimated spread of sample means — how much this mean would move
if you timed a different 25 deliveries.

## Step 2: a 95% interval for a mean

    tc = stats.t.ppf(0.975, df=n - 1)          # 2.0639
    (m - tc * se, m + tc * se)                  # (31.60, 36.32)

    # or in one call
    stats.t.interval(0.95, df=n - 1, loc=m, scale=se)

The interval is **mean ± critical value × SE** = 33.96 ± 2.06 × 1.144 = **31.6 to 36.3 minutes**.

Why 2.06 and not the 1.96 you may remember? With a small sample the SD itself is estimated, so we use the
**t distribution**, which has fatter tails. The t critical value is 2.776 at n = 5, 2.262 at n = 10, 2.064 at
n = 25 and 1.984 at n = 100 — it approaches 1.96 as n grows. Using 1.96 here would give 31.72 to 36.20, a bit
too narrow.

Other confidence levels trade width for confidence:

| Level | Interval |
|---|---|
| 90% | 32.00 to 35.92 |
| 95% | 31.60 to 36.32 |
| 99% | 30.76 to 37.16 |

## Step 3: a 95% interval for a proportion

A bank's app team asked 1,200 randomly chosen customers whether they would use a new savings feature; 312 said
yes.

    x, N = 312, 1200
    p = x / N                                   # 0.26
    se = np.sqrt(p * (1 - p) / N)               # 0.01266
    (p - 1.96 * se, p + 1.96 * se)              # (0.2352, 0.2848)

**26%, with a 95% interval of 23.5% to 28.5%** — a **margin of error of ±2.5 percentage points**. This simple
formula (the Wald interval) is fine when there are at least 10 yeses and 10 noes. For small samples or
proportions near 0% or 100%, use the Wilson interval, which SciPy gives directly:

    stats.binomtest(312, 1200).proportion_ci(method="wilson")
    # (0.2360, 0.2856)  — almost identical here

## What "95%" means — and what it does not

This is the part interviewers test.

**Correct:** "The method we used produces intervals that contain the true value in 95% of repeated samples."
If 100 analysts each timed their own random 25 deliveries and each built a 95% interval, about 95 of those
intervals would contain the true mean delivery time. We cannot know whether **ours** is one of the 95.

A simulation (seed 3) shows it: 1,000 samples of 40 from a skewed population with true mean 37.05, each
with a t-interval — **943 of the 1,000 intervals contained 37.05** (94.3%, close to the promised 95%; skewed
data with n = 40 slightly under-covers).

**Wrong:**
- ✗ "There is a 95% probability that the true mean is between 31.6 and 36.3." The true mean is a fixed number;
  it is either in this interval or not. The 95% describes the method, not this particular interval.
- ✗ "95% of deliveries take between 31.6 and 36.3 minutes." The interval is about the **mean**, not about
  individual deliveries; individual times in this sample range from 25 to 45.
- ✗ "The true value is most likely at the centre." The interval does not rank the values inside it.

A safe sentence for reports: **"We estimate the average delivery time at 34.0 minutes (95% CI 31.6 to 36.3)."**

## Margins of error in reports

- **The margin shrinks with √n.** At p = 26%, n = 1,200 gives ±2.5 pp; n = 4,800 (four times as many) gives
  ±1.2 pp — only half.
- **Planning a survey:** for ±3 pp at 95% in the worst case (p = 50%), n = 1.96² × 0.25 / 0.03² = 1,067.1, so
  **1,068 responses**. If you expect about 26%, 822 are enough.
- **Subgroups have bigger margins.** A poll of 1,000 at 40% has ±3.0 pp; the 100 respondents from one city
  have ±9.6 pp. "Lucknow customers are 6 points less keen" may be noise.
- **A margin covers chance only.** It says nothing about a biased sample (previous unit).
- **Small samples are wide.** 18 of 40 users (45%) gives a Wald interval of 29.6% to 60.4% — "somewhere between
  a third and three-fifths". Reporting "45% of users want this" without the interval overstates what you know.

## In Excel

CONFIDENCE.T(0.05, s, n) returns the half-width (2.06 × 1.144 ≈ 2.36 for the delivery data); CONFIDENCE.NORM
uses 1.96. For a proportion, build the formula by hand: =1.96*SQRT(p*(1-p)/n).`,
    workedExample: `**Task: a product manager says "our survey shows 45% of users want dark mode, up from 38% last quarter".
Last quarter's survey had 1,000 responses; this quarter's had 40. Is the rise real?**

**1. Interval for each estimate.**

    from scipy import stats
    import numpy as np

    def wald(x, n):
        p = x / n
        se = np.sqrt(p * (1 - p) / n)
        return round(p - 1.96 * se, 3), round(p + 1.96 * se, 3)

    wald(380, 1000)       # (0.35, 0.41)
    wald(18, 40)          # (0.296, 0.604)
    stats.binomtest(18, 40).proportion_ci(method="wilson")    # (0.307, 0.602)

Last quarter: 38%, roughly 35% to 41%. This quarter: 45%, but anywhere from about 30% to 60% is consistent with
40 responses.

**2. Read them.** This quarter's interval comfortably contains 38%. The data cannot tell a real rise from a
quarter-to-quarter wobble — a sample of 40 is simply too small to detect a 7-point change.

**3. Size the next survey.** For ±3 pp around 45%: 1.96² × 0.45 × 0.55 / 0.03² = 1,056.4, so 1,057
responses — call it 1,060.

**4. Report it.** "45% of this quarter's 40 respondents want dark mode (95% CI roughly 30% to 60%); the sample is
too small to say whether interest changed from last quarter's 38%. A 1,060-response survey would measure it to
within ±3 points."

Notice what the report does **not** say: it does not claim interest stayed the same either. "We cannot tell" is
a legitimate, useful result.`,
    mcqs: [
      mcq('A report says "average basket ₹842, 95% CI ₹801 to ₹883". Which reading is correct?', [
        ['The method used captures the true mean in 95% of repeated samples', true],
        ['There is a 95% probability that the true mean is ₹801 to ₹883', false],
        ['95% of customers spend between ₹801 and ₹883 per basket', false],
        ['The true mean is ₹842, and ₹801 to ₹883 is the rounding error', false],
      ], 'The 95% belongs to the procedure. The true mean is fixed; this interval either contains it or not. The interval is also about the mean, not individual baskets.'),
      mcq('312 of 1,200 surveyed customers (26%) want a feature, ±2.5 pp. Roughly what margin would 4,800 responses give at the same 26%?', [
        ['About ±1.2 percentage points', true],
        ['About ±0.6 percentage points', false],
        ['About ±2.5 percentage points', false],
        ['About ±5.0 percentage points', false],
      ], 'The margin is proportional to 1 / √n. Four times the responses divides it by 2: 2.48 pp becomes 1.24 pp.'),
      mcq('Why does a 95% interval for the mean of 25 delivery times use 2.064 rather than 1.96?', [
        ['The SD is estimated from the sample, so the t distribution is used', true],
        ['Delivery times are skewed, so a larger multiplier is always needed', false],
        ['2.064 is 1.96 adjusted for using a 90% level instead of 95%', false],
        ['Small samples need a bigger multiplier to remove their bias', false],
      ], 'With an estimated SD the standardised mean follows a t distribution with n − 1 = 24 degrees of freedom; its 97.5th percentile is 2.064. It approaches 1.96 as n grows.'),
    ],
    checkpoint: [
      ck(PROB, '90 of 400 randomly chosen customers redeemed a coupon. Using p ± 1.96 × √(p(1 − p)/n), what is the 95% interval?', [
        ['About 18.4% to 26.6%', true],
        ['About 20.4% to 24.6%', false],
        ['About 21.3% to 23.7%', false],
        ['About 14.3% to 30.7%', false],
      ], 'p = 0.225 and SE = √(0.225 × 0.775 / 400) = 0.0209, so the margin is 1.96 × 0.0209 = 0.041: 18.4% to 26.6%.'),
      ck(PROB, 'A national poll of 1,000 shoppers has a ±3 pp margin. The 100 Kolkata respondents show 40% preferring brand X. About what margin applies to that 40%?', [
        ['About ±10 pp, as the subgroup is only 100 people', true],
        ['About ±3 pp, the same margin stated for the whole poll', false],
        ['About ±0.3 pp, one-tenth of the poll\'s margin', false],
        ['No margin, since Kolkata was sampled completely', false],
      ], 'The margin depends on the size of the group the percentage is computed from: 1.96 × √(0.4 × 0.6 / 100) ≈ 0.096. Subgroup percentages are much less precise than the headline.'),
      ck(PROB, 'Two analysts compute 95% intervals for the same mean: one from 100 orders, one from 900 orders. How do the widths compare, other things equal?', [
        ['The 900-order interval is about one-third as wide', true],
        ['The 900-order interval is about one-ninth as wide', false],
        ['Both are equally wide, as both are 95% intervals', false],
        ['The 900-order interval is about three times as wide', false],
      ], 'Width is proportional to 1 / √n. √900 / √100 = 30 / 10 = 3, so the larger sample gives an interval one-third as wide.'),
    ],
  },

  /* ── CORRELATION_CAUSATION ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_STATS_DECISIONS_CORRELATION_CAUSATION',
    notes: `"Stores with more staff sell more." "Customers who use the wallet spend more." "Delivery partners on EVs
are late more often." Each sentence is a **correlation** someone found in a dashboard, and each is usually
followed by a decision — hire staff, push the wallet, drop the EVs. This unit is about measuring the
relationship correctly and about the questions to ask before anyone acts on it.

## Measuring correlation in pandas

A retail chain's 10 stores: weekday staff on the floor and monthly sales (₹ lakh).

    import pandas as pd
    from scipy import stats

    df = pd.DataFrame({
        "store": list("ABCDEFGHIJ"),
        "staff": [6, 8, 5, 10, 7, 12, 9, 4, 11, 8],
        "sales_lakh": [15.8, 17.1, 13.9, 19.4, 18.6, 24.2, 16.3, 12.4, 21.0, 20.5],
    })
    df[["staff", "sales_lakh"]].corr().round(3)

                staff  sales_lakh
    staff       1.000       0.893
    sales_lakh  0.893       1.000

    stats.pearsonr(df["staff"], df["sales_lakh"])     # r = 0.893, p ≈ 0.0005

**Pearson's r** runs from −1 (perfect straight line going down) to +1 (perfect line going up); 0 means no
**straight-line** relationship. r = 0.89 is strong. **r² = 0.80** — "staff numbers line up with 80% of the
variation in sales" — but that is still a description, not an explanation.

## Three ways the number misleads

**1. One point can make or break it.** Ten points with no pattern, then one extreme:

    x = pd.Series([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    y = pd.Series([5, 3, 6, 2, 7, 4, 6, 3, 5, 40])
    x.corr(y)                       # 0.524
    x[:9].corr(y[:9])               # 0.055   — without the last point
    x.corr(y, method="spearman")    # 0.312

A single ₹40-lakh store turns "no relationship" into "moderate". **Spearman's** correlation uses ranks, so it is
less moved by extremes — compute both, and plot.

**2. Zero correlation does not mean no relationship.** Conversion rate against discount size often rises and
then falls (deep discounts attract bargain hunters who abandon carts, in this illustrative data):

    d = pd.Series([0, 5, 10, 15, 20, 25, 30, 35, 40])
    c = pd.Series([2.0, 3.1, 3.9, 4.4, 4.6, 4.4, 3.9, 3.1, 2.0])
    d.corr(c)      # 0.0

r = 0.0, yet discount clearly matters. Pearson only sees straight lines. **Always scatter-plot** before quoting r.

**3. Correlation is not causation.** The stores with more staff may be the bigger stores in busier malls —
store size drives both staffing and sales. Adding staff to a small store in a quiet mall may sell nothing extra.

## Confounders, shown in data

A **confounder** is a third variable that drives both things you are comparing. A food-delivery app found
wallet users spend more per month. Simulated data (seed 11) built so that **the wallet has no effect at all**
— only customer tenure (months since joining) drives both wallet use and spend:

    w.groupby("wallet")["spend"].mean().round(0)
    # wallet
    # 0    1367
    # 1    1729
    w["wallet"].corr(w["spend"])       # 0.353

Wallet users appear to spend **₹362 more**. Now compare like with like — within tenure bands:

    w["band"] = pd.cut(w["tenure"], [0, 12, 24, 36], labels=["0-12", "13-24", "25-36"])
    w.groupby(["band", "wallet"], observed=True)["spend"].mean().round(0).unstack()

    wallet      0     1
    band
    0-12     1042  1105
    13-24    1516  1558
    25-36    1989  2022

Within each band the gap shrinks to ₹33–₹63 — and even that remainder is confounding left inside each 12-month
band, not a wallet effect, since by construction there is none. Meanwhile wallet use climbs with tenure
(22.0%, 47.4%, 72.9% of each band). The headline gap was mostly **"older customers spend more and use the
wallet more"**. Pushing new customers onto the wallet would not raise their spend.

Controlling for a confounder by **stratifying** (comparing within groups) is the analyst's first tool. Its limit:
you can only control for confounders you thought of and measured.

## Simpson's paradox: the aggregate flips

A delivery company compares its own riders with a partner fleet on on-time delivery:

| Fleet | Zone | Orders | On time | Rate |
|---|---|---|---|---|
| Own | Central | 300 | 210 | 70% |
| Own | Outskirts | 100 | 90 | 90% |
| Partner | Central | 100 | 65 | 65% |
| Partner | Outskirts | 300 | 255 | 85% |

    s.groupby("fleet")[["orders", "on_time"]].sum()
    #          orders  on_time      → rate
    # Own         400      300      0.75
    # Partner     400      320      0.80

**Own riders are better in both zones (70% vs 65%, 90% vs 85%) yet worse overall (75% vs 80%).** Own riders do
most of the hard Central deliveries; the partner fleet mostly does the easy Outskirts ones. Zone is a
confounder that changes the mix. The fair comparison is **within zone**. Whenever groups differ in their mix of
an important category, check the comparison inside each category before trusting the total.

## What an observational dataset cannot support

Data you **observed** (rather than an experiment you ran) can show association, but cannot by itself prove:

- "X **causes** Y" — confounders may explain it.
- "If we **change** X, Y will move" — the relationship may not hold when you intervene.
- The **direction**: do happy customers use the app more, or does using it make them happy?

What you **can** say: "Wallet users spend more; most of the gap is explained by tenure. To know whether the wallet
itself raises spend, we would need an experiment — e.g. offer a wallet incentive to a random half of new
users." That last sentence leads into the A/B testing topic, which is how analysts get from correlation to
cause.`,
    mcqs: [
      mcq('Ten points show r = 0.055; adding one extreme point raises Pearson\'s r to 0.524. What is the best next step?', [
        ['Plot the data, report Spearman too, and examine that point', true],
        ['Report r = 0.524, since every point of data should be used', false],
        ['Delete the extreme point so that r returns to its old value', false],
        ['Average the two r values and report about 0.29 as the answer', false],
      ], 'Pearson\'s r is sensitive to single extreme points. Plotting shows what is driving it, Spearman (0.312 here) is more robust, and the point needs checking, not silent deletion.'),
      mcq('Own riders are on time more often than the partner fleet in both zones, but less often overall. What explains it?', [
        ['Own riders handle far more orders in the harder zone', true],
        ['The overall rate was computed with the wrong formula', false],
        ['The zone rates are too small to be trusted at all', false],
        ['The partner fleet\'s data must contain duplicates', false],
      ], 'This is Simpson\'s paradox: the overall rate is a weighted mix, and own riders\' mix is weighted towards Central, where everyone is slower. Compare within zones.'),
      mcq('Discount size and conversion have r = 0.0, but conversion rises to a peak at 20% discount and then falls. What does r = 0 show?', [
        ['There is no straight-line relationship, not that there is none', true],
        ['Discount size has no effect of any kind on the conversion rate', false],
        ['The data must contain an error, as a peak should give r near 1', false],
        ['The relationship is causal, because the curve is so smooth', false],
      ], 'Pearson\'s r measures linear association only. A rise-then-fall pattern can give r = 0 while being a strong relationship — which is why you scatter-plot first.'),
    ],
    checkpoint: [
      ck(STATS, 'A dashboard shows that cities with more ATMs have more loan defaults (r = 0.78). Which explanation should the analyst test first?', [
        ['Bigger cities have both more ATMs and more loans', true],
        ['ATMs encourage customers to stop repaying loans', false],
        ['Defaults lead the bank to install more ATMs there', false],
        ['The correlation proves that ATMs cause defaults', false],
      ], 'City size (number of customers and loans) drives both counts. Comparing default rates per loan, or within city-size groups, removes that confounder.'),
      ck(STATS, 'What does `pd.Series([1, 2, 3, 4]).corr(pd.Series([10, 8, 6, 4]))` return?', [
        ['-1.0', true],
        ['1.0', false],
        ['0.0', false],
        ['-0.5', false],
      ], 'y falls by exactly 2 for each step in x — a perfect straight line sloping down, so Pearson\'s r is −1. The size of the slope does not affect r, only how close the points are to a line.'),
      ck(STATS, 'Wallet users spend ₹362 more a month overall, but only ₹33–₹63 more within each tenure band. What is the most defensible conclusion?', [
        ['Most of the overall gap is explained by tenure, not the wallet', true],
        ['The wallet raises spend by ₹362 a month for every single customer', false],
        ['The wallet lowers spend, as the gap shrinks within the bands', false],
        ['Tenure bands should not be used, as they change the answer', false],
      ], 'Stratifying by the confounder removes most of the gap. What remains could be leftover confounding; only an experiment would show what the wallet itself does.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_STATS_DECISIONS_DEBUGGING',
    notes: `Statistics bugs do not raise errors. The code runs, a number appears in a deck, and a decision is made on
it. Below are eight faults from real analyst work — the symptom, the cause, and the fix. Every number was
computed with pandas 3.0 and SciPy 1.18.

## 1. "Average order value ₹1,285" — and no customer spends that

**Symptom:** the weekly report's average order value jumps from ₹590 to ₹1,285; nobody can find an order near
it.
**Cause:** a mean on skewed data. One ₹8,999 order among 11 orders of ₹349–₹1,250 made up 58% of the day's
revenue. The median was ₹509.50.
**Fix:** report the median for "typical order", keep the mean for revenue maths, and show the count and the
largest orders. Make the report template print both, so the choice is visible.

## 2. "95% chance the true churn is between 11% and 14%"

**Symptom:** a slide states a confidence interval as a probability about the true value; finance quotes it as
a risk figure.
**Cause:** the frequentist interval was read as a probability statement about this one interval. The true churn
rate is fixed; it is inside this interval or it is not.
**Fix:** write "churn was 12.5% (95% CI 11% to 14%)" and, if asked, "the method captures the true rate in 95%
of samples". If the team genuinely wants probability statements about parameters, that is a Bayesian analysis,
done deliberately — not a re-wording.

## 3. Two tools, two standard deviations

**Symptom:** the notebook says SD 2.55 for [12, 15, 9, 14, 10]; a colleague's NumPy script says 2.28.
**Cause:** pandas' \`std()\` defaults to \`ddof=1\` (sample SD); \`np.std\` defaults to \`ddof=0\` (population SD).
**Fix:** use the sample SD for samples (nearly always) and pass \`ddof\` explicitly wherever two tools must agree.
Excel's STDEV.S matches pandas; STDEV.P matches NumPy.

## 4. The average of the averages

**Symptom:** "average order value across our cities: ₹470" — but the company-wide figure in finance's system is
₹598.
**Cause:** averaging three city averages (Delhi ₹620 on 9,000 orders, Jaipur ₹410 on 600, Indore ₹380 on 400)
gives (620 + 410 + 380) / 3 = ₹470, weighting a 400-order city the same as a 9,000-order one.
**Fix:** weight by orders, or recompute from the raw rows:

    (d["orders"] * d["avg"]).sum() / d["orders"].sum()      # 597.8

## 5. A margin of error borrowed from the whole sample

**Symptom:** "Lucknow customers are 6 points less keen than the national 40% (±3 pp)."
**Cause:** ±3 pp was the margin for all 1,000 respondents. Lucknow had 100, so its margin is about ±9.6 pp; a
6-point gap is well within it.
**Fix:** compute the interval from the group's own n, and say "the difference is within the margin" when it is.

## 6. A correlation that is all one row

**Symptom:** \`corr()\` between monthly marketing spend and orders over 10 months is 0.52; analysts start a
"spend drives orders" story.
**Cause:** one festive month (Diwali) has both the highest spend and an extreme order count. It is the pattern
of the 10-point example in the correlation unit: r = 0.524 with that month, **0.055 without it**.
**Fix:** scatter-plot first, compute Spearman too, and re-run without the extreme point to see how much one row
drives the result. Report the sensitivity.

## 7. Simpson's paradox in a fleet comparison

**Symptom:** "partner riders are more punctual: 80% vs 75%" — but the zone managers insist the own fleet is
better in every zone.
**Cause:** the managers are right: own riders are better in both Central (70% vs 65%) and Outskirts (90% vs
85%), but they do most of the hard Central orders. The totals mix two different workloads.
**Fix:** compare within the confounding category (\`groupby(["zone", "fleet"])\`), or standardise to a common mix.

## 8. A survey of survivors

**Symptom:** "customer satisfaction 4.6/5 — up from 4.1 last year".
**Cause:** the survey went to active customers. Many unhappy ones churned during the year and are no longer
asked; the rise could be entirely who was left.
**Fix:** state the population the sample comes from ("active customers on 1 March"), track churn alongside
satisfaction, and survey a sample that includes lapsed customers if the question is about all customers.

## A checklist before a statistic leaves your notebook

1. Which centre, and why? Is the data skewed?
2. What is n — for the whole and for every subgroup quoted?
3. Is there an interval, and is it worded correctly?
4. Who is missing from this sample?
5. Could a third variable or a mix difference explain this comparison?`,
    mcqs: [
      mcq('A deck says "average delivery fee per city: ₹31", computed as the mean of five city averages. Finance says ₹36. What is the likely cause?', [
        ['The city averages were not weighted by each city\'s orders', true],
        ['Finance includes taxes that the analyst\'s figure leaves out', false],
        ['The mean should have been a median for every one of the cities', false],
        ['The five city averages were rounded before being averaged', false],
      ], 'A mean of averages weights every city equally. If the big cities have higher fees, the order-weighted mean is higher; recompute from rows or weight by orders.'),
      mcq('An analyst writes "there is a 95% probability that average handling time is between 6.6 and 8.0 minutes". How should it be reworded?', [
        ['Average handling time was 7.3 minutes (95% CI 6.6 to 8.0)', true],
        ['95% of all calls are handled in between 6.6 and 8.0 minutes', false],
        ['Average handling time is certainly between 6.6 and 8.0', false],
        ['There is a 5% chance the true average is exactly 7.3', false],
      ], 'Report the estimate with its interval. The 95% describes how often the method captures the true value, not this interval, and it is about the mean, not individual calls.'),
      mcq('A notebook shows SD 2.55 and a NumPy script shows 2.28 for the same five values. Which change makes both report the sample SD?', [
        ['Call np.std(values, ddof=1) in the NumPy script', true],
        ['Call pd.Series(values).std(ddof=0) in the notebook', false],
        ['Round both results to one decimal place before use', false],
        ['Sort the values before computing either of the SDs', false],
      ], 'NumPy defaults to the population SD (ddof=0). Setting ddof=1 gives the sample SD, which is what pandas and Excel\'s STDEV.S compute.'),
      mcq('Satisfaction among active customers rose from 4.1 to 4.6 in a year when churn doubled. What is the main concern?', [
        ['Unhappy customers may have left, so the survey sees only those who stayed', true],
        ['A rise of 0.5 on a five-point scale is too small to report to anyone', false],
        ['Satisfaction should be reported as a median rather than as a mean', false],
        ['The survey should have used a seven-point scale instead of five', false],
      ], 'The population surveyed changed: churned customers are no longer asked. The rise may reflect who remained, not a better experience.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_STATS_DECISIONS_PRACTICE',
    notes: `Six exercises on data from a bank and a fintech app. Work each in a notebook first, then compare with the
answer. Every answer was computed with pandas 3.0 and SciPy 1.18.

    import numpy as np
    import pandas as pd
    from scipy import stats

## Exercise 1 — Describe loan amounts honestly

Personal-loan amounts for 10 applicants at one branch (₹ thousands):

    loans = pd.Series([120, 150, 180, 200, 210, 240, 260, 300, 350, 2500])

Find the mean, median, Q1, Q3 and the 1.5 × IQR fences. Which loans are flagged? Write one sentence for the
branch manager.

**Answer.** Mean **451**, median **225**, Q1 **185**, Q3 **290**, IQR 105, fences **27.5** and **447.5**. Only
the ₹25 lakh loan is flagged. "A typical loan is about ₹2.25 lakh; one ₹25 lakh loan (probably a different
product — check it) lifts the mean to ₹4.5 lakh."

## Exercise 2 — Percentiles for a service level

UPI payment confirmation times (seconds) for 20 transactions:

    upi = pd.Series([1.2, 0.8, 1.5, 0.9, 2.1, 1.1, 0.7, 1.0, 6.8, 1.3,
                     0.9, 1.4, 1.0, 1.8, 12.5, 1.1, 0.8, 1.2, 1.6, 0.9])

Find the mean, median, p90 and p95, and the share above 3 seconds. Which figure belongs in an SLA?

**Answer.** Mean **2.03 s**, median **1.15 s**, p90 **2.57 s**, p95 about **7.09 s** (pandas' linear
interpolation), **10%** above 3 seconds. The SLA should be a percentile or a threshold share ("90% confirm within
2.6 s", "no more than 5% over 3 s") — the mean is pulled up by two slow payments and describes none of them.

## Exercise 3 — A confidence interval for a mean

Average handling time (minutes) for 16 randomly sampled calls at a bank's call centre:

    aht = pd.Series([6.2, 7.8, 5.4, 9.1, 6.8, 7.2, 8.4, 5.9, 6.5, 10.2,
                     7.0, 6.1, 8.8, 7.5, 6.6, 7.9])

Compute the mean, SD, SE and a 95% t-interval.

**Answer.**

    n, m, s = len(aht), aht.mean(), aht.std()
    se = s / np.sqrt(n)
    stats.t.interval(0.95, df=n - 1, loc=m, scale=se)

n = 16, mean **7.34**, SD **1.302**, SE **0.326**, t critical **2.131**, 95% CI **6.64 to 8.03 minutes**.
Report: "Average handling time was 7.3 minutes (95% CI 6.6 to 8.0), from 16 sampled calls."

## Exercise 4 — A proportion and its margin

A fintech app sampled 500 users who signed up in January; 86 had stopped using the app by April.

Compute the churn rate, its 95% interval, and the sample size needed for a ±2 pp margin at the same rate.

**Answer.** p = **0.172**, SE 0.0169, 95% CI **13.9% to 20.5%** (margin ±3.3 pp). For ±2 pp:
1.96² × 0.172 × 0.828 / 0.02² = 1,367.8 → **1,368 users**.

## Exercise 5 — Correlation and what it can claim

EMI-to-income ratio (%) and days past due on the next instalment, for 10 borrowers:

    emi = pd.Series([18, 22, 25, 30, 34, 38, 42, 47, 52, 58])
    dpd = pd.Series([1.2, 1.5, 1.4, 2.2, 2.8, 2.6, 3.9, 4.4, 5.8, 7.1])

Compute Pearson and Spearman correlations. Can the bank conclude that lowering a borrower's EMI ratio will
reduce late payment?

**Answer.** Pearson **0.970**, Spearman **0.976**. A very strong association — but observational. Borrowers
with high EMI ratios may also have lower or less stable incomes, more other debts, or be in different products.
It supports using EMI ratio as a **risk signal** (it predicts lateness); it does not show that **changing** the
ratio would change behaviour. That would need, for example, a randomised restructuring offer.

## Exercise 6 — Find the paradox

Loan approval rates at two branches:

| Branch | Product | Applications | Approved |
|---|---|---|---|
| Metro | Gold loan | 200 | 180 |
| Metro | Personal | 800 | 480 |
| Town | Gold loan | 800 | 680 |
| Town | Personal | 200 | 110 |

Compute each branch's rate per product and overall. A regional head says "Town branch approves more — its
process must be better." Respond.

**Answer.** Metro: gold 90%, personal 60%, **overall 66%** (660 / 1,000). Town: gold 85%, personal 55%,
**overall 79%** (790 / 1,000). Metro approves a higher share of **both** products but a lower share overall,
because 80% of its applications are personal loans, which are approved less often. The overall gap is a
product-mix effect (Simpson's paradox). Compare branches within product, or standardise to a common mix.`,
    mcqs: [
      mcq('In Exercise 1, the loans have mean 451 and median 225 (₹ thousands). Which loan does the 1.5 × IQR rule flag?', [
        ['Only the ₹2,500 thousand loan, above the 447.5 fence', true],
        ['The ₹350 and ₹2,500 thousand loans, both above Q3', false],
        ['The ₹120 thousand loan, which falls below the median', false],
        ['None, since all of the loans are genuine applications', false],
      ], 'Q1 = 185 and Q3 = 290, so IQR = 105 and the fences are 27.5 and 447.5. Only 2,500 lies outside. Flagging means "look at it", not "it is an error".'),
      mcq('In Exercise 2, the UPI times have mean 2.03 s and median 1.15 s. Which statement belongs in a service-level agreement?', [
        ['90% of payments confirm within about 2.6 seconds', true],
        ['Payments confirm in about 2.0 seconds on average', false],
        ['The typical payment confirms in exactly 1.15 seconds', false],
        ['Payments confirm within 12.5 seconds at the most', false],
      ], 'An SLA is a promise about how many transactions meet a target, so it is written as a percentile or a share above a threshold. The mean is pulled up by two slow payments.'),
      mcq('Exercise 3 gives a 95% CI of 6.64 to 8.03 minutes from 16 calls. What would happen to the width with 64 calls and a similar SD?', [
        ['It would be roughly half as wide', true],
        ['It would be roughly a quarter as wide', false],
        ['It would stay about the same width', false],
        ['It would be roughly twice as wide', false],
      ], 'Width scales with 1 / √n: four times the calls halves the SE. The t multiplier also drops slightly (2.131 to about 2.0), so it is a little under half.'),
      mcq('Exercise 5 finds r = 0.97 between EMI-to-income ratio and days past due. Which use of the result is justified?', [
        ['Using the ratio as a warning signal for late payment', true],
        ['Cutting EMIs to make borrowers pay on time more often', false],
        ['Concluding that a high EMI ratio causes late payment', false],
        ['Dropping all other risk variables from the scorecard', false],
      ], 'A strong observational association supports prediction. Claims about what happens if the bank changes the ratio need an experiment or much stronger causal evidence.'),
      mcq('In Exercise 6, Metro approves 66% overall and Town 79%, but Metro is higher for both products. What should the regional head compare?', [
        ['Approval rates within each product, branch against branch', true],
        ['Only the overall rates, since they include every application', false],
        ['The number of approvals, since rates hide the volumes', false],
        ['The gold-loan rates alone, as gold loans are the safer product', false],
      ], 'The branches have different product mixes, and personal loans are approved less often. Within-product comparison (or a standardised mix) removes the mix effect.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_STATS_DECISIONS_INTERVIEW_QUESTION',
    notes: `Analyst interviews at Indian product companies, banks and consultancies rarely ask you to derive a
formula. They describe a business situation and listen for whether you **reason** like an analyst: which
summary, how sure, and what could be confounding it. Three common questions, model answers, and the follow-ups
a good answer earns.

## 1. "Our average order value went up 15% this month. Is that good news?"

**Model answer.** "Maybe — I would check four things before celebrating. First, the median: if the median did
not move, a few very large orders may have lifted the mean, and that may be one bulk buyer rather than a trend.
Second, the mix: did the share of high-value categories or cities change? A festival sale on electronics raises
average order value without anyone changing behaviour. Third, the count: if order *numbers* fell, AOV can rise
because small orders disappeared — for example after a minimum-order fee — and revenue might be flat or down.
Fourth, noise: I would compare with the usual month-to-month variation, or put a confidence interval on the
mean. Then I would report revenue = orders × AOV, so we see both parts."

**Follow-ups:**
- *"The median also rose 15%. Now?"* Then it is broad-based. I would still check mix (city, category, new vs
  returning) and any price changes, because a price rise lifts AOV without more value to the customer.
- *"How would you know if a new recommendation widget caused it?"* Not from this data — I would want an A/B test,
  or at least a comparison with a group that did not see the widget in the same period.

## 2. "Explain a confidence interval to a product manager."

**Model answer.** "When we measure something on a sample — say 26% of 1,200 surveyed users want a feature — we
know the true figure for all users is probably not exactly 26%. A 95% confidence interval, here about 23.5% to
28.5%, is the range our method produces so that, if we repeated the survey many times, about 95% of those
ranges would contain the true figure. In practice: the narrower it is, the more precisely we know the number;
if two groups' intervals are far apart, the difference is probably real. And it only covers random sampling
error — if the survey only reached our most engaged users, the interval does not fix that."

**Follow-ups:**
- *"So there is a 95% chance the true value is in that range?"* "Not in the strict sense — the true value is fixed
  and this particular interval either contains it or doesn't. The 95% is how reliable the method is. For decisions
  it's fine to think of it as 'a plausible range'."
- *"How would you make it narrower?"* More data — width falls with √n, so halving it needs four times the sample —
  or accept lower confidence (a 90% interval is narrower), which is a business call.

## 3. "Customers who use our app's budgeting tool have 40% lower churn. Should we push everyone to use it?"

**Model answer.** "Not on that evidence alone. Users who *choose* to set up a budget are probably more engaged
already — they would churn less with or without the tool. That is selection, a form of confounding. I would
first compare like with like: users of similar tenure, activity and product holding, with and without the tool.
If a large gap remains, that is more convincing but still not proof. The clean answer is an experiment: prompt a
random half of new users to set up a budget and compare churn between the halves. Randomising makes the groups
alike in everything except the prompt, so the difference is the effect of the prompt."

**Follow-ups:**
- *"An experiment takes three months. What can you do now?"* Stratified comparisons, matched groups, and a
  before/after check around any time the tool launched in only some cities — clearly labelled as suggestive.
- *"What would you measure besides churn?"* Guardrails like complaints or uninstalls — a pushy prompt could annoy
  users — and whether the prompted group actually used the tool (the effect of the prompt is diluted by people who
  ignore it).

## How to answer statistics questions well

Lead with the **business meaning**, then the method. Name the specific risk — skew, mix, selection, sample size —
rather than saying "it depends". And always end with what you would **do** next.`,
    mcqs: [
      mcq('An interviewer says "average order value rose 15% but order count fell 20%". What is the strongest first observation?', [
        ['Revenue fell about 8%, so the AOV rise may hide a loss', true],
        ['The rise in AOV more than makes up for fewer orders', false],
        ['Order count does not matter when AOV is rising fast', false],
        ['AOV and order count cannot both change in one month', false],
      ], 'Revenue = orders × AOV: 0.8 × 1.15 = 0.92, an 8% fall. AOV often rises when small orders disappear, which is not good news.'),
      mcq('Asked "how would you halve the width of a confidence interval?", which answer is correct?', [
        ['Collect about four times as many observations', true],
        ['Collect about twice as many observations', false],
        ['Switch from a 95% interval to a 99% interval', false],
        ['Remove the largest values before computing it', false],
      ], 'Width is proportional to 1 / √n, so halving it needs four times the data. A 99% interval is wider, and dropping values introduces bias.'),
      mcq('In the budgeting-tool question, which design would show whether the tool reduces churn?', [
        ['Prompting a random half of new users to set up a budget', true],
        ['Comparing users who chose the tool with those who did not', false],
        ['Surveying tool users about whether they plan to stay on', false],
        ['Comparing churn before and after the tool\'s launch date', false],
      ], 'Random assignment makes the groups alike apart from the prompt, so a churn difference can be attributed to it. Self-selected comparisons and before/after checks remain confounded.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_STATS_DECISIONS_CHECKPOINT',
    notes: `Ten questions across the topic: describing skewed data, distribution shapes, samples and bias, the
standard error and confidence intervals, and correlation, confounders and Simpson's paradox. Several give
numbers or code — work the answer out before you look at the options. Every value was computed with pandas 3.0
and SciPy 1.18.`,
    checkpoint: [
      ck(STATS, 'What does `pd.Series([150, 180, 210, 240, 4800]).agg(["mean", "median"])` return?', [
        ['mean 1116.0, median 210.0', true],
        ['mean 210.0, median 1116.0', false],
        ['mean 1116.0, median 195.0', false],
        ['mean 930.0, median 210.0', false],
      ], 'The sum is 5,580, so the mean is 1,116; the middle of the five sorted values is 210. One very large value lifts the mean above four of the five values.'),
      ck(STATS, 'What does `pd.Series([30, 32, 35, 38, 41, 44, 90]).quantile([0.25, 0.75]).tolist()` return?', [
        ['[33.5, 42.5]', true],
        ['[32.0, 44.0]', false],
        ['[31.0, 67.0]', false],
        ['[35.0, 41.0]', false],
      ], 'With linear interpolation the 25th percentile sits at position 1.5 (between 32 and 35) and the 75th at 4.5 (between 41 and 44), giving 33.5 and 42.5.'),
      ck(STATS, 'A dashboard shows customer lifetime value with mean ₹4,100 and median ₹1,250. Marketing wants to quote "a typical customer is worth ₹4,100". What is the right response?', [
        ['Quote the median; a minority of big customers lifts the mean', true],
        ['Quote the mean; it includes every customer in the base', false],
        ['Quote the midpoint of the two, about ₹2,675, as a compromise', false],
        ['Quote neither; skewed values cannot be summarised at all', false],
      ], 'Lifetime value is right-skewed. The median is what a typical customer is worth; the mean is right for total-value maths (customers × mean), and both can be shown with that label.'),
      ck(STATS, 'Customers\' monthly spend has two clear humps, at ₹600 and ₹3,200. Which summary is most useful to a marketing team?', [
        ['The median and size of each segment, reported separately', true],
        ['The overall mean, since it balances the two groups', false],
        ['The overall SD, since it shows how far apart they are', false],
        ['The overall mode, since it is the most common value', false],
      ], 'A bimodal distribution is two populations. One overall summary describes neither; per-segment summaries tell marketing who the customers actually are.'),
      ck(PROB, 'The sample means of 2,000 random samples of 100 skewed order values are plotted. What shape will the histogram of those means have, roughly?', [
        ['A bell centred near the population mean', true],
        ['The same right skew as the order values', false],
        ['A flat line across the range of the orders', false],
        ['Two humps, one each side of the median', false],
      ], 'By the central limit theorem, the mean of a reasonably large random sample is approximately normally distributed around the true mean, even when the data are skewed.'),
      ck(PROB, 'A sample of 64 orders has SD ₹800. What is the approximate half-width of a 95% interval for the mean (using 1.96)?', [
        ['₹196', true],
        ['₹100', false],
        ['₹1,568', false],
        ['₹24.50', false],
      ], 'SE = 800 / √64 = 100, and 1.96 × 100 = 196. The interval is the sample mean ± ₹196.'),
      ck(PROB, 'Which sentence about "survey: 26% want the feature, 95% CI 23.5% to 28.5%" is correct?', [
        ['Repeated surveys would give intervals that capture the true share 95% of the time', true],
        ['There is a 95% probability that the true share is between 23.5% and 28.5%', false],
        ['95% of the customers who were surveyed answered between 23.5% and 28.5%', false],
        ['The true share is 26%, and anything else in the interval is less likely', false],
      ], 'The confidence level describes the procedure over repeated samples. Any single interval either contains the fixed true share or it does not.'),
      ck(PROB, 'A poll of 400 gives p = 0.5 with a ±4.9 pp margin. Roughly what margin would 1,600 responses give?', [
        ['About ±2.5 pp', true],
        ['About ±1.2 pp', false],
        ['About ±4.9 pp', false],
        ['About ±9.8 pp', false],
      ], '1.96 × √(0.25 / 1600) = 0.0245. Four times the sample halves the margin.'),
      ck(STATS, 'A bank finds that customers with a credit card have higher savings balances (r = 0.4). What would most weaken a causal claim that cards raise savings?', [
        ['Card holders are mostly higher-income customers', true],
        ['The correlation was computed using Pearson\'s r', false],
        ['The analysis included more than 50,000 customers', false],
        ['Savings balances are reported in rupees per month', false],
      ], 'Income drives both who gets a card and how much is saved — a confounder. Comparing within income bands, or an experiment, is needed before claiming cause.'),
      ck(STATS, 'Department A of a retail chain has a higher return rate than B in every store, yet a lower return rate overall. What is the explanation?', [
        ['A sells mostly in stores where returns are rare for everyone', true],
        ['The overall rate was computed by adding the store rates', false],
        ['The store-level rates are too small to be reliable at all', false],
        ['B must have recorded some of A\'s returns by mistake', false],
      ], 'Simpson\'s paradox: A\'s sales are concentrated in low-return stores, so its overall rate is pulled down by its mix. Compare within stores or standardise to a common mix.'),
    ],
  },

  /* ══ DT_AB_TESTING ═══════════════════════════════════════════════════════════════════════ */

  /* ── HYPOTHESES_PVALUES ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_AB_TESTING_HYPOTHESES_PVALUES',
    notes: `The statistics topic ended on a problem: observational data shows association, not cause. The way analysts
get to cause is an **experiment** — and the way they decide whether an experiment's result is more than luck is
a **hypothesis test**. This unit is the logic; the next ones are the tests, the design and the traps.

## The question

A fintech app's KYC (identity check) flow has, over many months, been completed by **62%** of users who start
it. The product team built a shorter flow and gave it to **400** new users; **268** completed it — **67%**.

Is 67% evidence that the new flow is better, or could the old 62% produce 268 out of 400 by chance?

## Step 1: state the hypotheses

- **Null hypothesis, H₀:** the new flow's true completion rate is 62% — no change. The 67% is chance.
- **Alternative, H₁:** the true rate is not 62% (two-sided). Use a one-sided H₁ ("greater than 62%") only if
  you decided before seeing data that a worse result would be treated exactly like no difference — in product
  work, two-sided is the safe default, because a new flow can make things worse.

The test never proves H₁. It asks whether the data are **surprising if H₀ were true**.

## Step 2: how surprising? Simulate it

If the true rate really were 62%, how often would 400 users give 268 or more completions? Simulate the null
100,000 times (seed 0):

    import numpy as np
    rng = np.random.default_rng(0)
    sims = rng.binomial(400, 0.62, 100_000)
    (sims >= 268).mean()                        # 0.02151

About **2.2%** of the simulated "nothing changed" worlds produce a result at least this good. Counting
results at least as far from the expected 248 **in either direction** (≤ 228 or ≥ 268) gives about **4.5%**.

## Step 3: the same thing by formula

Under H₀, the sample proportion has standard error √(0.62 × 0.38 / 400) = **0.02427**.

    from scipy import stats

    p0, n, x = 0.62, 400, 268
    se = np.sqrt(p0 * (1 - p0) / n)
    z = (x / n - p0) / se                       # 2.06
    2 * stats.norm.sf(abs(z))                   # 0.0394  two-sided p-value

    stats.binomtest(268, 400, 0.62).pvalue      # 0.0394  exact binomial test

**z = 2.06**: the observed 67% is 2.06 standard errors above 62%. The two-sided **p-value is 0.039**. (The
normal approximation and the exact binomial test agree here; the simulation's 4.5% is slightly higher because
a count of exactly 228 or 268 sits on the boundary of a discrete distribution.)

## Step 4: decide, using a level you fixed in advance

The **significance level α** is the false-alarm rate you accept, set **before** looking at data — usually 0.05.
p = 0.039 < 0.05, so we **reject H₀**: the data are unlikely under "no change".

## What a p-value is — and is not

**Is:** the probability of getting data at least as extreme as what we saw, **if H₀ were true**.

**Is not:**
- ✗ "The probability that H₀ is true" (3.9% chance the flow does nothing). The p-value assumes H₀; it cannot
  also measure it.
- ✗ "The probability the result is a fluke" — same mistake in other words.
- ✗ "96.1% chance the new flow is better."
- ✗ A measure of **how big** or **how important** the effect is. A tiny effect in a huge sample can have
  p = 0.0001.
- ✗ "p = 0.06 means no effect." It means this data could not rule out no effect — often because the sample was
  too small.

## Two kinds of error

| | H₀ actually true (no effect) | H₀ actually false (real effect) |
|---|---|---|
| Reject H₀ | **Type I error** (false positive) — probability α | Correct (probability = **power**) |
| Do not reject | Correct | **Type II error** (false negative) — probability β |

- **Type I:** shipping a flow that does nothing. With α = 0.05, 1 in 20 tests of a useless change will look
  "significant". Run 20 such tests and the chance of at least one false positive is 1 − 0.95²⁰ = **64%**.
- **Type II:** abandoning a flow that works. For this test, if the true rate really were 67%, a 400-user test
  would reject H₀ only **54%** of the time — power 0.54. The team was close to a coin flip on detecting a real
  5-point improvement.

The same 67% from only **100 users** (67 completions) gives z = 1.03 and p = 0.30 (exact test 0.35): not
significant, but not evidence of "no effect" either — just too little data.

## In one sentence for a manager

"If the new flow were no better than the old one, a result this good would happen about 4 times in 100; that
is unusual enough for us to conclude it probably helps. The next step is to measure *how much* with a
confidence interval."`,
    workedExample: `**Task: a food-delivery app claims its new "reorder" button raised repeat orders. Before launch, 30% of
customers reordered within a week. In a pilot, 520 of 1,600 customers did (32.5%). Test it.**

**1. Hypotheses, fixed before looking:** H₀: the reorder rate is 30%. H₁: it is not 30% (two-sided).
α = 0.05.

**2. Compute.**

    from scipy import stats
    import numpy as np

    p0, n, x = 0.30, 1600, 520
    se = np.sqrt(p0 * (1 - p0) / n)          # 0.01146
    z = (x / n - p0) / se                     # 2.18
    p = 2 * stats.norm.sf(abs(z))             # 0.029
    stats.binomtest(x, n, p0).pvalue          # ≈ 0.03

**3. Decide.** p ≈ 0.03 < 0.05: reject H₀. The data would be unusual if the reorder rate were still 30%.

**4. Ask what the test did not check.** This compares the pilot with a historical rate, not with a control group
running at the same time. If the pilot ran in festival week, or in one city, the rise could be seasonal or local
— the test cannot tell. A **randomised A/B test**, where half the customers get the button at the same time, is
the stronger design, and it is what the rest of this topic builds.

**5. Report.** "Reorders were 32.5% in the pilot against a historical 30% (p ≈ 0.03). That is unlikely to be
chance alone, but the pilot had no concurrent control, so seasonality is not ruled out; we recommend an A/B
test before rollout."`,
    mcqs: [
      mcq('A KYC test gives p = 0.039 for "completion rate is still 62%". Which statement about p is correct?', [
        ['Data this extreme would occur about 3.9% of the time if H₀ were true', true],
        ['There is a 3.9% probability that the new flow makes no difference', false],
        ['There is a 96.1% probability that the new flow is better than the old', false],
        ['The new flow improves completion by 3.9 percentage points overall', false],
      ], 'A p-value is computed assuming H₀ is true; it describes how surprising the data are under H₀. It is not the probability of H₀, and it says nothing about effect size.'),
      mcq('A team runs 20 tests of button colours that in truth do nothing, each at α = 0.05. Roughly how likely is at least one "significant" result?', [
        ['About 64%', true],
        ['About 5%', false],
        ['About 20%', false],
        ['About 95%', false],
      ], 'Each null test has a 5% false-positive chance, so P(at least one) = 1 − 0.95²⁰ ≈ 0.64. Many tests make a false winner likely.'),
      mcq('The same 67% completion from only 100 users gives p = 0.30. What should the team conclude?', [
        ['The sample is too small to tell whether the flow helps', true],
        ['The new flow has now been shown to have no effect on KYC completion', false],
        ['The new flow is worse, since p is bigger than 0.05', false],
        ['The 400-user result must have been a false positive', false],
      ], 'Failing to reject H₀ is not evidence that H₀ is true. With 100 users the standard error is twice as large, so a real 5-point effect can easily go undetected.'),
    ],
    checkpoint: [
      mcq('An analyst sets α = 0.05, runs a test, gets p = 0.08, and then switches to α = 0.10 to call it significant. What is wrong?', [
        ['α must be fixed before seeing data, or it no longer limits false positives', true],
        ['Nothing — α can be any value the analyst thinks is suitable afterwards', false],
        ['α = 0.10 is never allowed in a business setting under any rule', false],
        ['The p-value should have been doubled before comparing it with α', false],
      ], 'α is a promise about the false-positive rate, and it only holds if chosen in advance. Choosing it after seeing p makes every borderline result "significant".'),
      mcq('A test of a new loan-offer page has power 0.54 for a real 5-point lift. What does that mean?', [
        ['If the lift is real, the test detects it only about half the time', true],
        ['There is a 54% chance that the page lifts conversion by 5 points', false],
        ['The p-value of the test will be 0.54 if the lift really is 5 points', false],
        ['54% of users will see the improvement that the new page brings', false],
      ], 'Power is the probability of rejecting H₀ when a specific effect is real. 0.54 means a 46% chance of a Type II error — missing a lift that exists.'),
      mcq('A z-test gives z = 2.5 for a two-sided test. What is the p-value, approximately?', [
        ['0.012', true],
        ['0.025', false],
        ['0.006', false],
        ['0.050', false],
      ], 'The two-sided p-value is 2 × P(Z > 2.5) = 2 × 0.0062 ≈ 0.012. One tail alone would be 0.006.'),
    ],
  },

  /* ── TESTS ─────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_AB_TESTING_TESTS',
    notes: `There are dozens of named tests. An analyst needs four, chosen by **what kind of metric** you are comparing,
and run with SciPy in a couple of lines. (In Excel, T.TEST and CHISQ.TEST cover two of them; the others need a
formula.)

## Which test for which question

| You are comparing | Example | Test |
|---|---|---|
| A **proportion** between two groups | Conversion: 4.0% vs 4.6% | Two-proportion z-test (or 2×2 chi-square — same answer) |
| A **mean** between two groups | Average basket ₹511 vs ₹569 | Welch's two-sample t-test |
| **Counts in categories** across groups | Payment method mix by city | Chi-square test of independence |
| A **skewed** metric where a typical value matters | Delivery minutes, old vs new routing | Mann–Whitney U (compares distributions/ranks) |

## 1. Two proportions: did conversion change?

An electronics store's product page, 12,000 visitors per version: old page 480 purchases (4.0%), new page 552
(4.6%).

    import numpy as np
    from scipy import stats

    x1, n1, x2, n2 = 480, 12000, 552, 12000
    p1, p2 = x1 / n1, x2 / n2                         # 0.04, 0.046
    pp = (x1 + x2) / (n1 + n2)                        # pooled 0.043
    se = np.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2))
    z = (p2 - p1) / se                                # 2.291
    2 * stats.norm.sf(abs(z))                         # 0.0220

Under H₀ both pages share one conversion rate, so the SE uses the **pooled** rate. p = 0.022: a 0.6-point gap
this size would be unusual if the pages converted equally.

The same test as a chi-square on the 2×2 table of counts:

    table = np.array([[480, 12000 - 480],
                      [552, 12000 - 552]])
    stats.chi2_contingency(table, correction=False)   # statistic 5.249, pvalue 0.0220

5.249 = 2.291² — the two tests are identical. SciPy applies **Yates' continuity correction** to 2×2 tables by
default (statistic 5.104, p = 0.0239); it is conservative, and most A/B tools do not use it, so pass
\`correction=False\` to match the z-test. Always feed chi-square **counts**, never percentages.

## 2. Two means: did the basket grow?

A home-goods site tested a "complete the look" widget. Basket value (₹) of 15 random orders per version:

    a = np.array([420, 515, 388, 610, 472, 530, 455, 698, 402, 560, 489, 615, 437, 508, 571])  # old
    b = np.array([468, 590, 412, 705, 520, 612, 498, 760, 455, 640, 530, 688, 470, 566, 626])  # widget
    a.mean(), b.mean()                     # 511.33, 569.33
    a.std(ddof=1), b.std(ddof=1)           # 87.78, 102.24

    r = stats.ttest_ind(b, a, equal_var=False)
    r.statistic, r.pvalue, r.df            # 1.667, 0.1069, 27.37
    r.confidence_interval(0.95)            # (-13.34, 129.34)

The widget group's mean is **₹58 higher**, but p = 0.107 and the 95% interval for the difference runs from
**−₹13 to +₹129**. Fifteen orders per group cannot separate a ₹58 difference from noise when baskets vary by
about ₹90–₹100. Not significant — and not evidence of no effect.

\`equal_var=False\` makes it **Welch's** t-test, which does not assume the two groups have equal spread. Use it by
default; it loses almost nothing when the spreads are equal (here the pooled test gives p = 0.107 too). With
thousands of orders per group, the CLT makes the t-test fine even for skewed basket values.

## 3. Chi-square: does payment mix differ by city?

A food-delivery app's orders by payment method:

|  | UPI | Card | COD |
|---|---|---|---|
| Bengaluru | 620 | 210 | 170 |
| Mumbai | 540 | 260 | 200 |
| Lucknow | 410 | 190 | 400 |

    import pandas as pd
    t = pd.DataFrame({"UPI": [620, 540, 410], "Card": [210, 260, 190], "COD": [170, 200, 400]},
                     index=["Bengaluru", "Mumbai", "Lucknow"])
    res = stats.chi2_contingency(t)
    res.statistic, res.dof, res.pvalue     # 176.57, 4, ≈ 4e-37
    res.expected_freq                      # 523.3 / 220.0 / 256.7 in every row

The test compares observed counts with what independence would predict (each city having the overall mix:
523.3 UPI, 220.0 Card, 256.7 COD per 1,000 orders). p is astronomically small: the mix differs by city. The
test says **that** it differs, not **where** — row percentages show it: COD is **40%** of Lucknow's orders
against **17%** in Bengaluru. Degrees of freedom = (rows − 1) × (columns − 1) = 4. Expected counts should be at
least 5 in every cell.

## 4. Skewed times: Mann–Whitney U

Delivery minutes for 300 orders under old and new routing (simulated, seed 5): medians **31 vs 29**, means
33.07 vs 30.75.

    stats.mannwhitneyu(new, old, alternative="two-sided").pvalue      # 0.0117
    stats.ttest_ind(new, old, equal_var=False).pvalue                 # 0.0132

Mann–Whitney asks whether values in one group tend to be larger than in the other, using ranks, so a few
extreme delays do not dominate. With 300 per group both tests agree. Prefer Mann–Whitney for small, very skewed
samples; prefer the t-test when the business cares about the **mean** itself (revenue per user, because revenue
adds up).

## The habits that matter more than the test

- Decide the test, the metric and α **before** looking at results.
- Report the **difference and its interval**, not just p.
- Check the test's assumptions in words: independent observations (one row per randomised unit), counts not
  percentages, large enough samples.`,
    workedExample: `**Task: a bank tested two versions of a credit-card offer email, 12,000 customers each. Version A: 480
applications. Version B: 552. Choose the test, run it, and state the result.**

**1. Choose.** The metric is a proportion (applied or not), two independent groups → two-proportion z-test,
equivalently a 2×2 chi-square without correction.

**2. Run.**

    from scipy import stats
    import numpy as np

    x1, n1, x2, n2 = 480, 12000, 552, 12000
    p1, p2 = x1 / n1, x2 / n2
    pp = (x1 + x2) / (n1 + n2)
    z = (p2 - p1) / np.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2))
    p = 2 * stats.norm.sf(abs(z))
    print(round(p1, 4), round(p2, 4), round(z, 3), round(p, 4))
    # 0.04 0.046 2.291 0.022

**3. Add the size of the effect.** The difference is 0.6 percentage points (a 15% relative lift). Its 95%
interval uses the unpooled SE:

    se = np.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2)
    (p2 - p1 - 1.96 * se, p2 - p1 + 1.96 * se)       # ≈ (0.0009, 0.0111)

About **+0.09 to +1.11 points**.

**4. State it.** "Version B's application rate was 4.6% against 4.0% for A (difference +0.6 pp, 95% CI +0.1 to
+1.1 pp, p = 0.022). B very probably performs better; the gain could be as small as 0.1 point, so we should
weigh it against any extra cost of B."`,
    mcqs: [
      mcq('A home-goods test compares mean basket value between two versions, with 15 orders each. Which SciPy call fits?', [
        ['stats.ttest_ind(b, a, equal_var=False)', true],
        ['stats.chi2_contingency([[b.mean(), a.mean()]])', false],
        ['stats.binomtest(len(b), len(a) + len(b))', false],
        ['stats.chisquare([b.mean(), a.mean()])', false],
      ], 'Comparing two independent means calls for Welch\'s t-test. Chi-square and binomial tests are for counts, and passing means into them gives meaningless results.'),
      mcq('An analyst runs chi2_contingency on [[4.0, 96.0], [4.6, 95.4]] — conversion percentages for 12,000 visitors per arm — and gets p = 0.83. What went wrong?', [
        ['Percentages were used instead of counts, hiding the sample size', true],
        ['Chi-square cannot be used for a table with two rows and columns', false],
        ['Yates\' correction should have been switched on for this table', false],
        ['The p-value of 0.83 is correct and shows the arms are identical', false],
      ], 'Chi-square depends on the counts. Treating 4.0 and 96.0 as counts pretends there were 100 visitors per arm; the real counts give p = 0.022.'),
      mcq('The payment-mix chi-square gives p ≈ 4e-37 for three cities. What does the test alone establish?', [
        ['The mix of payment methods is not the same in every city', true],
        ['Lucknow is the city whose payment mix differs from the others', false],
        ['COD causes customers to place fewer orders than UPI does', false],
        ['Every city differs from every other city on every method', false],
      ], 'A chi-square test of independence says the distribution differs across rows. Where and how it differs comes from row percentages or residuals, and nothing here is causal.'),
    ],
    checkpoint: [
      mcq('A grocery app compares the share of orders containing fresh produce (yes/no) between two store layouts. Which test fits?', [
        ['A two-proportion z-test or a 2×2 chi-square', true],
        ['Welch\'s t-test on the mean order value', false],
        ['A Mann–Whitney U test on the order IDs', false],
        ['A correlation between layout and order ID', false],
      ], 'The outcome is binary, so you compare two proportions. The z-test and the uncorrected 2×2 chi-square give the same p-value (chi-square = z²).'),
      mcq('A 2×2 chi-square without correction gives 5.249 for a conversion test. What is the matching z statistic?', [
        ['About 2.29', true],
        ['About 5.25', false],
        ['About 27.6', false],
        ['About 1.15', false],
      ], 'For a 2×2 table the chi-square statistic equals z², so z = √5.249 ≈ 2.291.'),
      mcq('Welch\'s t-test on 15 vs 15 baskets gives a difference of ₹58, p = 0.107, 95% CI −₹13 to +₹129. What is the right conclusion?', [
        ['The data cannot tell a ₹58 gain apart from noise', true],
        ['The widget has no effect on the value of baskets', false],
        ['The widget raises baskets by ₹58 with 89% certainty', false],
        ['The widget lowers basket value by about ₹13', false],
      ], 'The interval includes zero and runs up to ₹129: anything from a small loss to a large gain is consistent with the data. That is "not shown", not "no effect".'),
    ],
  },

  /* ── AB_DESIGN ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_AB_TESTING_AB_DESIGN',
    notes: `Most failed A/B tests were lost before they started: the wrong metric, the wrong unit, or a sample far too
small to see the effect anyone hoped for. Designing the test is the analyst's most valuable contribution —
and it is done **on paper, before any user sees the change**.

## The running example

ShopKart wants to test free delivery on orders above ₹499 (today: ₹799). The question from the business is "will
it increase sales?" — your job is to turn that into a test that can answer it.

## 1. One primary metric

Pick **one** metric that decides the test, defined precisely:

- **Primary:** purchase conversion = users who placed at least one order ÷ users assigned, within 14 days of
  assignment. Baseline: **3.2%**.

Why one? With five "main" metrics, one will move by chance (1 − 0.95⁵ = 23% for five independent null
metrics). Secondary metrics are fine — as context, not as the decision.

A good primary metric is **sensitive** to the change, **tied to value** (not clicks for their own sake), and
**measurable per randomised unit**.

## 2. Guardrail metrics

Guardrails are what must **not** get worse. For free delivery:

- Average delivery cost per order (the change might attract many small, loss-making orders).
- Gross margin per user.
- Order cancellation and return rates.
- Page load time and app crash rate (any engineering change).

A test that raises conversion while delivery cost per order rises 30% may be a loss. Decide in advance: "ship
only if conversion improves and margin per user does not fall by more than X".

## 3. The randomisation unit

Who gets randomised — a user, a session, a page view, a store, a city?

- **User** (logged-in ID or a stable device ID) is the default. A user sees one version throughout, so their
  experience is consistent and their outcome is one row.
- **Session or page view** randomisation lets one user see both versions — confusing for a price or delivery
  change, and it breaks the "one row per independent unit" assumption of the tests.
- **Cluster** randomisation (by store, city, delivery zone) when users affect each other — a rider-allocation
  change in a city affects every order in that city. Clusters are few, so such tests need far more time.

**Analyse at the unit you randomised.** Randomise users, then compute conversion per user — not per session.

## 4. Minimum detectable effect (MDE)

The MDE is the **smallest effect worth detecting** — a business decision, not a statistics one. "If free delivery
at ₹499 raises conversion by less than 10% relative (3.2% → 3.52%), it does not pay for the delivery cost."
So MDE = +0.32 percentage points.

## 5. Sample size

For two proportions, α = 0.05 (two-sided) and power 0.80:

n per group = ( z₁₋α/₂ · √(2 p̄ (1 − p̄)) + z₁₋β · √(p₁(1 − p₁) + p₂(1 − p₂)) )² ÷ (p₂ − p₁)²

with z₁₋α/₂ = 1.96, z₁₋β = 0.8416 and p̄ the average of p₁ and p₂.

    import math
    from scipy import stats

    def n_per_group(p1, p2, alpha=0.05, power=0.80):
        za = stats.norm.ppf(1 - alpha / 2)
        zb = stats.norm.ppf(power)
        pbar = (p1 + p2) / 2
        num = (za * math.sqrt(2 * pbar * (1 - pbar))
               + zb * math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2
        return math.ceil(num / (p2 - p1) ** 2)

    n_per_group(0.032, 0.0352)      # 49,777

| Baseline → target | Relative lift | Users per group |
|---|---|---|
| 3.2% → 3.84% | +20% | 13,015 |
| 3.2% → 3.52% | +10% | 49,777 |
| 3.2% → 3.36% | +5% | 194,530 |
| 20% → 22% | +10% | 6,510 |

Two lessons: **halving the MDE roughly quadruples the sample** (13,015 → 49,777 → 194,530), and **low baseline
rates need huge samples**. A quick check is Lehr's rule, n ≈ 16 p(1 − p) / δ² = 48,400 — close to the exact
49,777. Asking for 90% power instead of 80% raises it to 66,636.

For a **mean** metric, n per group = 2 (z₁₋α/₂ + z₁₋β)² σ² / δ². Average basket with SD ₹650: detecting a ₹30
change needs **7,370** orders per group; a ₹60 change needs **1,843**.

## 6. Duration

ShopKart has about 18,000 eligible users a day, split 50/50. Two groups of 49,777 = 99,554 users → **5.5 days**.
Round **up to whole weeks — 7 days** — because weekday and weekend shoppers differ, and a test that ends on a
Friday over-represents weekday behaviour. Long enough for at least one full weekly cycle; short enough to avoid
running into a festival sale.

If traffic is the constraint, flip the question: with 14 days (126,000 users per group) the smallest detectable
lift is about **0.20 points (3.2% → 3.4%)**. If that is smaller than the effect that matters, the test is
feasible; if the business needs to see 0.1 points, it is not, and no amount of analysis afterwards will fix it.

## 7. Write it down — the test plan

A one-page plan, agreed before launch: hypothesis; primary metric with exact definition; guardrails and their
thresholds; randomisation unit and split; eligibility (who enters the test); MDE, α, power, sample size and
end date; the decision rule. This document is what stops the arguments after the result.`,
    workedExample: `**Task: a fintech app wants to test a new onboarding screen. 12% of users who install the app complete
onboarding. The product team hopes for 13%. About 6,000 users install per day. Design the test.**

**1. Primary metric.** Onboarding completion within 24 hours of first open, per user. Baseline 12%.

**2. Guardrails.** Crash rate on the onboarding screens; 7-day retention (a "faster" onboarding that skips
explanations might lose users later); support tickets about KYC.

**3. Unit.** The user (device ID before login), 50/50 split, assigned at first app open.

**4. Sample size for 12% → 13%** (MDE 1 point, α 0.05, power 0.80):

    n_per_group(0.12, 0.13)          # 17,169

**5. Duration.** 2 × 17,169 = 34,338 users ÷ 6,000 a day = 5.7 days → run **7 days**, plus 24 hours for the
last users' completion window.

**6. Sense-check the MDE.** If the team would also act on a 2-point gain, a 12% → 14% test needs only 4,438 per
group — but it would likely miss a real 1-point gain. The MDE should come from "what is worth building", not
from what makes the test short.

**7. Decision rule, written before launch:** "Ship if completion improves with p < 0.05 and 7-day retention and
crash rate are not significantly worse; otherwise keep the current screen."`,
    mcqs: [
      mcq('A test needs 13,015 users per group to detect 3.2% → 3.84%. Roughly how many are needed to detect 3.2% → 3.52%?', [
        ['About 50,000 per group', true],
        ['About 26,000 per group', false],
        ['About 13,000 per group', false],
        ['About 6,500 per group', false],
      ], 'Halving the detectable difference roughly quadruples the required sample, because n scales with 1 / δ². The exact figure is 49,777.'),
      mcq('A delivery-fee change is randomised by session, so a returning user can see ₹0 one day and ₹49 the next. What is the main problem?', [
        ['Users see both versions, and sessions of one user are not independent', true],
        ['Sessions are too many, so the test will become far too sensitive to small changes', false],
        ['Randomising by session makes the sample-size formula unusable', false],
        ['Session IDs cannot be split into two groups at random by any tool', false],
      ], 'A price shown inconsistently confuses users and contaminates both arms, and a user\'s sessions are correlated, so tests that treat them as independent overstate certainty. Randomise by user.'),
      mcq('The sample-size calculation says 5.5 days. Why do analysts usually run the test for 7?', [
        ['A full week covers weekday and weekend behaviour equally', true],
        ['Statistical tests need a sample that is a multiple of seven', false],
        ['Seven days guarantees the result will reach significance', false],
        ['Users must see a new version for a week before it works', false],
      ], 'Shopping differs by day of week. Ending mid-week over-represents some days; whole weeks keep the sample representative of normal traffic.'),
    ],
    checkpoint: [
      mcq('A test of a "buy now, pay later" option raises checkout conversion. Which metric is the most important guardrail?', [
        ['The rate of missed repayments among the users who used it', true],
        ['The number of clicks on the "pay later" button in the cart', false],
        ['The share of checkout page views made on Android phones', false],
        ['The number of product reviews written during the test', false],
      ], 'A guardrail protects against harm the primary metric hides. More checkouts paid with credit the users cannot repay would be a loss, so repayment behaviour must be watched.'),
      mcq('Which choice of minimum detectable effect is best justified?', [
        ['The smallest lift that would pay for building and running the change', true],
        ['Whatever lift lets the test finish within three days of traffic', false],
        ['The lift seen in a competitor\'s published case study last year', false],
        ['A 50% relative lift, so that any real winner is detected quickly', false],
      ], 'The MDE is a business threshold: effects smaller than it are not worth acting on. Choosing it to make the test short means real, valuable effects will be missed.'),
      mcq('For basket value with SD ₹650, a test needs 7,370 orders per group to detect a ₹30 change. About how many for a ₹60 change?', [
        ['About 1,840', true],
        ['About 3,690', false],
        ['About 14,740', false],
        ['About 920', false],
      ], 'n = 2(z₁₋α/₂ + z₁₋β)²σ² / δ², so doubling δ divides n by 4: 7,370 / 4 ≈ 1,843.'),
    ],
  },

  /* ── AB_PITFALLS ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_AB_TESTING_AB_PITFALLS',
    notes: `A well-designed test can still be ruined while it runs or when it is read. These are the pitfalls that come
up in real analytics teams, each with a number that shows why it matters.

## 1. Peeking: stopping when it looks significant

The team checks the dashboard every morning and stops the test the first day p < 0.05. It feels harmless.

Simulate it: an **A/A test** (both arms identical, 4% conversion, 2,000 users per arm per day) run for 14 days,
5,000 times (seed 2024). Check p once at the end, and about **5.5%** of runs are "significant" — the promised 5%,
within simulation noise. Check **every day** and stop at the first p < 0.05, and **22.5%** of runs declare a
winner. Daily peeking more than quadruples the false-positive rate — for a change that does nothing.

The p-value wanders up and down as data arrive; given 14 chances, it will often dip below 0.05 at least once.

**Fixes:** fix the sample size and look at the decision metric once, at the end. If the business needs to
monitor early (for harm), use a method designed for it — a pre-planned sequential test (group-sequential
boundaries such as O'Brien–Fleming) or the "always-valid" sequential p-values that some experimentation
platforms provide. Watching **guardrails** daily for breakage is fine; stopping for a **win** is the problem.

## 2. Many metrics, many variants

A test report with 10 metrics: if the change does nothing, the chance that at least one shows p < 0.05 is
1 − 0.95¹⁰ = **40.1%** (for independent metrics; correlated ones are lower but still high). Four variants
against one control: **18.5%**.

**Fixes:** one pre-registered primary metric; treat the others as descriptive. With several variants or
decision metrics, tighten α — Bonferroni divides it by the number of comparisons (0.05 / 4 = 0.0125 for four
variants) — or use Holm or false-discovery-rate methods. A metric that "won" but was not planned is a
hypothesis for the next test, not a result.

## 3. Sample-ratio mismatch (SRM)

A 50/50 test ends with **50,912** users in control and **49,088** in treatment. Is 1.8% off a 50/50 split a
problem?

    from scipy import stats
    stats.chisquare([50912, 49088])
    # statistic 33.27, pvalue 8.0e-09

A split this uneven would happen by chance about 8 times in a **billion**. Something is removing or adding users
in one arm — a crash on the new page before logging, a redirect that loses users, bot filtering that treats the
arms differently, or users being re-assigned. Whatever it is probably also changes **who** is in each arm, so the
conversion comparison is untrustworthy. By contrast, 50,240 vs 49,760 gives p = 0.13: an ordinary chance wobble.

**Fix:** run the SRM check **first**, before looking at any outcome; analysts often use p < 0.001 as the alarm.
If it fails, find the cause (split it by device, browser, day) and do not report the result.

## 4. Novelty and primacy effects

A redesigned home page gets a burst of clicks in week 1 because it is new; by week 3 the gain has gone. The
opposite (primacy): regular users resist a changed menu at first, then adapt. **Fix:** run at least two weekly
cycles for changes regular users notice, and plot the daily lift — a lift that decays day by day is novelty.
Compare new users (who have no habit) with returning users.

## 5. Seasonality and the wrong period

A test during the Big Billion Days or Diwali week measures festival shoppers, who behave nothing like September
shoppers. A test ending on a Friday under-weights weekend behaviour. **Fix:** whole weeks, no major sale inside
the window unless the change is *for* the sale, and say in the report when the test ran.

## 6. Analysing at the wrong unit

Users were randomised, but conversion was computed per **session** and tested as if sessions were independent.
Sessions of the same user are alike (a keen buyer converts across many sessions), so the real uncertainty is
larger than the session-level test assumes. In a simulation (seed 9) with users who differ in their propensity
to buy, a session-level z-test on an A/A comparison gave **10.4%** false positives instead of 5%. **Fix:** one
row per randomised unit (per-user conversion), or a method that accounts for clustering (the delta method or
bootstrapping by user).

## 7. Interference between groups

A rider-allocation algorithm tested on half the orders in a city: treatment orders grab the nearest riders,
leaving control orders worse off. The measured "improvement" is partly stolen from control. **Fix:** randomise
by cluster (city, zone, or time slot — a "switchback" design) when the arms share a resource.

## The pre-flight and post-flight checks

**Before launch:** plan written; sample size and end date fixed; assignment tested on a small A/A run.
**Before reading results:** SRM check; dates and eligibility as planned; no outage or sale inside the window;
the primary metric computed per randomised unit.`,
    mcqs: [
      mcq('In 5,000 simulated A/A tests checked daily for 14 days, 22.5% were stopped as "significant". Checked once at the end, 5.5% were. What does this show?', [
        ['Repeated peeking with stopping inflates false positives far beyond α', true],
        ['A/A tests are unreliable and should not be used to check an experiment setup at all', false],
        ['Checking once at the end gives too few significant results to use', false],
        ['Fourteen days is too short for any A/B test on a 4% baseline', false],
      ], 'Each look is another chance for the wandering p-value to dip below 0.05. Stopping at the first dip turns a 5% false-positive rate into about 22%.'),
      mcq('A 50/50 test ends with 50,912 control and 49,088 treatment users; the SRM chi-square p is 8 × 10⁻⁹. What should the analyst do first?', [
        ['Find why users are missing from one arm before trusting any result', true],
        ['Reweight the two arms to 50/50 and then analyse conversion as usual', false],
        ['Ignore it, since a 1.8% imbalance is too small to matter for conversion', false],
        ['Report the conversion result with a note that the split was uneven', false],
      ], 'An SRM this extreme means assignment or logging is broken, and the missing users are probably not random. Reweighting cannot repair who is in each arm.'),
      mcq('A new home page lifted clicks 12% in week 1, 6% in week 2 and 1% in week 3. What is the most likely explanation?', [
        ['A novelty effect that fades as users get used to the page', true],
        ['A sample-ratio mismatch that keeps growing over the three weeks', false],
        ['A primacy effect, where users resist the page at first', false],
        ['Peeking at the results, which makes the lift shrink', false],
      ], 'A lift that decays as the change stops being new is the signature of novelty. The long-run effect is what matters, so the test needed to run long enough to see it settle.'),
    ],
    checkpoint: [
      mcq('An A/B report lists 10 metrics; the change in truth does nothing. About how likely is at least one metric at p < 0.05, if the metrics were independent?', [
        ['About 40%', true],
        ['About 5%', false],
        ['About 10%', false],
        ['About 60%', false],
      ], '1 − 0.95¹⁰ ≈ 0.40. That is why one primary metric is fixed in advance and the rest are read as context.'),
      mcq('A 50/50 test ends with 10,300 vs 9,700 users. `stats.chisquare([10300, 9700])` gives p ≈ 0.00002. What does this indicate?', [
        ['A sample-ratio mismatch: assignment or logging is likely broken', true],
        ['The treatment is significantly better than the control arm', false],
        ['The test needs to run longer until the arms become equal', false],
        ['Nothing — uneven splits are normal for tests of this size', false],
      ], 'A 3% gap on 20,000 users is very unlikely under a true 50/50 split (chi-square 18.0). The SRM must be explained before outcomes are read.'),
      mcq('A rider-allocation change is tested on a random half of orders in the same city. Why might the measured gain be overstated?', [
        ['Treatment orders can take riders that control orders would have had', true],
        ['Orders cannot be randomised, as each order is placed only once', false],
        ['Half the orders is too large a sample for a single city', false],
        ['Rider allocation can only be tested by surveying the riders', false],
      ], 'When arms share a resource, helping one hurts the other, so the gap between them overstates the effect of a full rollout. Randomising by city or time slot avoids it.'),
    ],
  },

  /* ── READING_RESULTS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_AB_TESTING_READING_RESULTS',
    notes: `The test has run, the SRM check passed, and SciPy has returned a p-value. The analyst's job is not finished
— it is half finished. A manager needs to know **what happened, how sure we are, whether it matters, and what to
do**. This unit is about the last two.

## The result

A food-delivery app tested a redesigned restaurant page, 10,000 users per arm:

    import numpy as np
    from scipy import stats

    x1, n1, x2, n2 = 410, 10000, 468, 10000          # control, treatment
    p1, p2 = x1 / n1, x2 / n2                         # 4.10%, 4.68%
    diff = p2 - p1                                    # +0.58 pp
    rel = diff / p1                                   # +14.15%

    pp = (x1 + x2) / (n1 + n2)
    z = diff / np.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2))      # 2.002
    p = 2 * stats.norm.sf(abs(z))                               # 0.0453

    se = np.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2)
    (diff - 1.96 * se, diff + 1.96 * se)                        # (+0.012 pp, +1.148 pp)

## Read the interval, not just the p-value

p = 0.045 says "probably not zero". The **95% confidence interval for the lift, +0.01 to +1.15 points**, says
much more: the true gain could be almost nothing or about 28% relative (0.3% to 28.0% relative). The point
estimate of +14% is the middle of a very wide range.

Translate it into money. With 3 lakh users a month and a ₹850 average order:

| | Extra orders a month | Extra GMV a month |
|---|---|---|
| Point estimate (+0.58 pp) | 1,740 | ₹14.8 lakh |
| Low end (+0.012 pp) | 36 | ₹30,600 |
| High end (+1.148 pp) | 3,444 | ₹29.3 lakh |

If the redesign costs ₹2 lakh a month to maintain, the low end does not pay for it. That is a **business**
judgement the interval makes possible and the p-value alone hides.

## Statistical vs practical significance

**Statistically significant** = unlikely to be zero. **Practically significant** = big enough to matter.
They come apart in both directions:

- **Huge sample, tiny effect.** 10 lakh users per arm: 4.10% vs 4.16%. p = 0.033, CI +0.005 to +0.115 pp
  (0.1% to 2.8% relative). Real, probably — and possibly worthless.
- **Small sample, big effect.** 1,000 per arm: 4.1% vs 5.2%. A +27% relative lift, p = 0.24, CI −0.75 to +2.95
  pp. Not significant — and also not evidence of no effect. This test was too small; the answer is "we don't
  know yet", not "it failed".
- **Clear and big.** 50,000 per arm: 4.10% vs 4.48%. p = 0.003, CI +0.13 to +0.63 pp (3.1% to 15.4% relative).
  Even the low end is a meaningful gain.

Compare the interval with the **MDE** you set in the design. If the whole interval sits above the MDE, ship. If
it straddles it, the effect may or may not be worth it. If it sits entirely below, the change does not do enough,
even if p < 0.05.

## The decision table

| Result | Guardrails | Recommendation |
|---|---|---|
| Significant, interval above MDE | Fine | Ship |
| Significant, interval includes small values | Fine | Ship if cheap; otherwise weigh cost against the low end |
| Not significant, interval wide | — | Inconclusive: the test lacked power; rerun bigger only if the effect would matter |
| Not significant, interval narrow around 0 | — | No meaningful effect; stop |
| Any | A guardrail is significantly worse | Do not ship as is; investigate the trade-off |

## Segments: look, but carefully

"It worked on Android but not iOS" is tempting. With 3 devices × 4 cities × 2 customer types, there are 24
segments — at α = 0.05 you expect about one "significant" segment by chance. Treat segment findings as
hypotheses unless they were planned, and check that the segment's own interval is not just noise.

## The one-page write-up

1. **Decision first:** "Recommend rolling out the new restaurant page to all users."
2. **What we tested and why** — one sentence each.
3. **Result with an interval:** "Conversion rose from 4.10% to 4.68% (+0.58 pp, 95% CI +0.01 to +1.15 pp;
   p = 0.045), worth an estimated ₹14.8 lakh GMV a month, plausibly anywhere from ₹0.3 lakh to ₹29 lakh."
4. **Guardrails:** each one, with "no significant change" or its interval.
5. **Checks:** SRM passed, ran 14 full days, no sales in the window.
6. **Caveats and next step:** "The lower end is close to zero; we will monitor conversion for four weeks after
   rollout."

No jargon in the headline. "p = 0.045" belongs in the detail, not the first line.`,
    mcqs: [
      mcq('A test with 10 lakh users per arm shows 4.10% vs 4.16%, p = 0.033, 95% CI +0.005 to +0.115 pp. What is the best summary?', [
        ['Probably a real effect, but it may be too small to be worth anything', true],
        ['A strong result that should be shipped as soon as possible', false],
        ['Not a real effect, since the lift is only 0.06 points in size', false],
        ['An invalid test, as the sample size is far too large to use', false],
      ], 'Large samples detect tiny effects. Whether a 0.1%–2.8% relative lift is worth acting on depends on cost, which is a practical, not a statistical, question.'),
      mcq('A 1,000-per-arm test shows 4.1% vs 5.2% (+27% relative) with p = 0.24. What should the report say?', [
        ['The test is inconclusive; the sample was too small to measure it', true],
        ['The change has been shown not to work and should be dropped for good', false],
        ['The change lifts conversion by 27% and should be shipped now', false],
        ['The change lowers conversion, as the p-value is above 0.05', false],
      ], 'The interval (−0.75 to +2.95 pp) covers both a loss and a large gain. Non-significance with a wide interval means "not measured", not "no effect".'),
      mcq('In a write-up for the business head, where should the p-value appear?', [
        ['In the supporting detail, after the decision and the interval', true],
        ['As the headline, since it is the main statistical output of the test', false],
        ['Nowhere — p-values should never be shown to the business', false],
        ['Only when it is below 0.01, to avoid confusing the reader', false],
      ], 'Lead with the decision and the effect size in business terms. The p-value supports the claim; it is not the claim, and leaving it out entirely hides how sure you are.'),
    ],
    checkpoint: [
      mcq('Control converts 200 of 5,000 (4.0%) and treatment 250 of 5,000 (5.0%). The pooled two-proportion z-test gives z = 2.41. What are the p-value and 95% CI for the difference, approximately?', [
        ['p ≈ 0.016, CI about +0.19 to +1.81 pp', true],
        ['p ≈ 0.032, CI about +0.50 to +1.50 pp', false],
        ['p ≈ 0.008, CI about −0.19 to +1.81 pp', false],
        ['p ≈ 0.160, CI about +0.19 to +1.81 pp', false],
      ], 'Two-sided p = 2 × P(Z > 2.41) ≈ 0.016. The unpooled SE is about 0.41 pp, so the interval is 1.0 ± 0.81: +0.19 to +1.81 pp.'),
      mcq('The design set an MDE of +0.5 pp. The result is +0.6 pp with a 95% CI of +0.1 to +1.1 pp. Which reading is most accurate?', [
        ['The effect is real but may be smaller than the MDE', true],
        ['The effect is certainly larger than the MDE', false],
        ['The effect is not significant, since 0.1 < 0.5', false],
        ['The effect is exactly 0.6 points, as estimated', false],
      ], 'The interval excludes zero, so it is significant, but it straddles the MDE: anything from +0.1 to +1.1 pp is plausible, including values not worth shipping for.'),
      mcq('A test is significant overall, and among 24 device × city segments, one (iOS in Pune) shows a negative effect with p = 0.04. What should the analyst conclude?', [
        ['With 24 segments, one chance "finding" is expected; treat it as a hypothesis', true],
        ['The change harms iOS users in Pune and must be switched off for them there at once', false],
        ['The overall result is invalid because one of the segments disagrees with it', false],
        ['Segment results are always more reliable than the overall result of a test', false],
      ], 'At α = 0.05, about 1 in 20 null segments will look significant. An unplanned segment result needs a follow-up test before anyone acts on it.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_AB_TESTING_DEBUGGING',
    notes: `A/B test mistakes rarely look like mistakes. They look like a winning experiment. Below are eight faults
from real experimentation work — symptom, cause, fix. Numbers were computed with SciPy 1.18; simulations quote
their seed.

## 1. A "significant" winner from peeking

**Symptom:** the new search ranking was "significant on day 4" and shipped; the uplift never showed up in the
monthly numbers.
**Cause:** the team checked p every day and stopped at the first p < 0.05. In 5,000 simulated A/A tests (seed
2024, 14 daily looks) this rule declared a winner **22.5%** of the time, against **5.5%** for one look at the
end.
**Fix:** fix the sample size and end date in the plan; read the primary metric once. If early stopping is needed,
use a pre-planned sequential design. Watch guardrails daily for breakage only.

## 2. The unbalanced split nobody checked

**Symptom:** treatment wins by 9%, but treatment has 41,081 users and control 42,273 in a 50/50 test.
**Cause:** sample-ratio mismatch. \`stats.chisquare([42273, 41081])\` gives p ≈ 0.00004. Splitting by device showed
all the missing users were on iOS — the new page crashed for some iOS users before the analytics event fired, so
the treatment arm lost exactly the users most likely to have a bad experience.
**Fix:** run the SRM check before reading any outcome, segment it by device, browser and day, and fix the
logging or assignment before rerunning.

## 3. Chi-square fed with percentages

**Symptom:** \`chi2_contingency([[4.0, 96.0], [4.6, 95.4]])\` gives p = 0.83 for a test with 12,000 users per arm;
the analyst reports "no difference".
**Cause:** chi-square works on counts. Percentages behave like a test on 100 users per arm. The real counts,
[[480, 11520], [552, 11448]], give chi-square 5.249 and p = 0.022.
**Fix:** always pass counts; sanity-check that the table's total equals the number of users.

## 4. Sessions analysed, users randomised

**Symptom:** a tiny lift with a surprisingly small p-value; the team cannot reproduce it.
**Cause:** users were randomised but conversion was computed and tested per session, as if sessions were
independent. One keen user's ten sessions all move together. In a simulated A/A comparison (seed 9), the
session-level test gave **10.4%** false positives instead of 5%.
**Fix:** one row per randomised unit — per-user conversion — or a clustered method (delta method, bootstrap by
user).

## 5. Ten metrics, one winner

**Symptom:** "conversion and revenue flat, but wishlist adds up 7% (p = 0.03) — ship it!"
**Cause:** ten metrics were tested; with no true effect at all, the chance at least one hits p < 0.05 is about
40%. Wishlist adds was not the planned decision metric.
**Fix:** decide on the primary metric in the plan; report others as context; treat an unplanned win as an idea for
the next test (or correct for multiple comparisons).

## 6. A one-sided test chosen after the fact

**Symptom:** the result had p = 0.08 (two-sided); the report says "p = 0.04, one-sided".
**Cause:** switching to a one-sided test after seeing the direction halves the p-value and silently doubles the
real false-positive rate in that direction.
**Fix:** choose the sidedness in the plan. If a harmful change would be treated differently from no change (it
always is in product work), use two-sided.

## 7. "Not significant, so it does not work"

**Symptom:** a new referral banner is dropped after a 1,000-per-arm test: 4.1% vs 5.2%, p = 0.24.
**Cause:** the test was underpowered. The 95% interval, −0.75 to +2.95 pp, includes a 70% relative gain. Power
for a 1-point lift at this size is low.
**Fix:** report the interval and say "inconclusive"; run the design's sample-size calculation before the next test.

## 8. A lift that is only the first week

**Symptom:** the redesigned home page won by 12% in a one-week test; three months after launch, engagement is back
where it was.
**Cause:** novelty effect — regular users clicked around the new design because it was new.
**Fix:** run two or more weekly cycles for visible changes; plot the daily lift; analyse new and returning users
separately.

## The order of checks when a result looks too good

1. SRM. 2. Dates, eligibility and exposure as planned. 3. Unit of analysis = unit of randomisation.
4. Planned primary metric, planned sidedness, looked at once. 5. Interval and practical size. 6. Novelty —
daily lift chart.`,
    mcqs: [
      mcq('A 50/50 test ends 42,273 vs 41,081 users, and splitting by device shows the shortfall is all iOS treatment users. What is the most likely cause?', [
        ['The new version failed on iOS before the user was logged', true],
        ['iOS users prefer the old version and switched back to it', false],
        ['Random assignment always gives uneven groups on iOS devices', false],
        ['The test ran too long, and some iOS users left the app', false],
      ], 'A shortfall in one arm on one platform points to a technical failure that removes users before logging. Those users are not random, so the comparison is biased.'),
      mcq('A report shows p = 0.04 "one-sided" for a test whose plan said two-sided, where the two-sided p was 0.08. What is the problem?', [
        ['Choosing sidedness after seeing the result inflates false positives', true],
        ['One-sided p-values must always be larger than two-sided ones', false],
        ['A one-sided test cannot be used for a conversion metric at all', false],
        ['Nothing — the one-sided p-value is the more accurate figure', false],
      ], 'Picking the tail that matches the observed direction halves p after the fact. The plan\'s two-sided test is the valid one.'),
      mcq('Per-session conversion is tested with a z-test although users were randomised. Why can the p-value be too small?', [
        ['Sessions of the same user are correlated, so the real uncertainty is larger', true],
        ['There are fewer sessions than users, so the sample is smaller than was first planned', false],
        ['The z-test cannot be used on any conversion rate below 10% in size', false],
        ['Sessions are randomised separately, so the two arms are mixed together', false],
      ], 'Treating correlated sessions as independent overstates the effective sample size. In the unit\'s A/A simulation, false positives rose to about 10%.'),
      mcq('After an underpowered test (4.1% vs 5.2%, 1,000 per arm, p = 0.24), what is the most useful recommendation?', [
        ['Report it as inconclusive and size a larger test if the effect would matter', true],
        ['Drop the change, as the test showed it has no effect on conversion', false],
        ['Ship the change, since a 27% relative lift is clearly very large', false],
        ['Rerun the same 1,000-per-arm test until it reaches significance', false],
      ], 'The interval spans a loss and a large gain. A properly sized test answers the question; repeating small tests until one is significant is another form of peeking.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_AB_TESTING_PRACTICE',
    notes: `Six exercises on experiments at a fintech app, a SaaS product and an e-commerce site. Write the code and the
sentence for each before reading the answer. Every answer was computed with SciPy 1.18.

    import math
    import numpy as np
    import pandas as pd
    from scipy import stats

## Exercise 1 — State it properly

A personal-finance app tested a new "round-up savings" prompt. Write H₀ and H₁ for "does the prompt change the
share of users who start a savings goal?", choose α, and interpret a result of p = 0.012.

**Answer.** H₀: the share starting a goal is the same with and without the prompt. H₁: it differs (two-sided).
α = 0.05, fixed beforehand. p = 0.012 means that if the prompt made no difference, a gap at least this large would
appear about 1.2% of the time; we reject H₀. It does **not** mean a 1.2% chance the prompt does nothing, and it
says nothing yet about how large the effect is — that needs the interval.

## Exercise 2 — Two proportions

An e-commerce checkout test, 60,000 users per arm: control 2,400 orders, treatment 2,610.

Compute both rates, the difference, the relative lift, z, the p-value and the 95% CI of the difference.

**Answer.** 4.00% vs 4.35%; difference **+0.35 pp**, relative lift **+8.75%**; z = **3.03**, p = **0.0024**; 95% CI
**+0.12 to +0.58 pp**. A clear, moderately sized improvement.

## Exercise 3 — Two means, small samples

Minutes spent on a SaaS dashboard per user per week, 12 random users per version:

    a = np.array([142, 98, 175, 120, 88, 160, 134, 110, 151, 127, 95, 168])   # old
    b = np.array([155, 122, 190, 141, 105, 172, 149, 138, 163, 150, 118, 181])  # new

Run Welch's t-test and interpret it.

**Answer.** Means **130.7** vs **148.7** minutes (+18.0); \`stats.ttest_ind(b, a, equal_var=False)\` gives t = 1.60,
p = **0.125**, 95% CI for the difference **−5.4 to +41.4 minutes**. Not significant: 12 users per group cannot
distinguish an 18-minute gain from noise when users differ by about 25–30 minutes. Inconclusive, not "no effect".

## Exercise 4 — Chi-square on plan choice

Subscription plan chosen by acquisition channel:

    t = pd.DataFrame({"Basic": [420, 310, 190], "Plus": [260, 240, 150], "Premium": [70, 95, 115]},
                     index=["Organic", "Paid social", "Referral"])

Is plan choice independent of channel? Where is the difference?

**Answer.** \`stats.chi2_contingency(t)\`: chi-square **61.21**, dof **4**, p ≈ **1.6 × 10⁻¹²** — plan mix differs
by channel. Row percentages: Premium is **25.3%** of referral sign-ups, **14.7%** of paid social and **9.3%** of
organic. The test is observational: referred users may differ in income or intent, so this does not show that
referrals *cause* Premium choices.

## Exercise 5 — Size a test

Baseline trial-to-paid conversion is 12%. The team wants to detect 13% with α = 0.05 (two-sided) and 80% power.
About 6,000 new trials start per day, split 50/50. How many users per group, and how many days?

**Answer.** Using the formula from the design unit, **17,169 per group**; 34,338 in total ÷ 6,000 a day = 5.7 days
→ run **7 days** (a full week), plus the time a trial takes to convert. Detecting 12% → 14% would need only 4,438
per group, but would miss a real one-point gain.

## Exercise 6 — Check the split

A 50/50 test reports 25,400 users in control and 24,300 in treatment. Run the SRM check and decide what to do.

**Answer.** \`stats.chisquare([25400, 24300])\`: chi-square **24.35**, p ≈ **8 × 10⁻⁷**. Far below 0.001 — a
sample-ratio mismatch. Do not report the outcome metrics. Break the counts down by day, device, browser and
entry page to find where treatment users are being lost, fix it, and rerun.`,
    mcqs: [
      mcq('In Exercise 2 (2,400 vs 2,610 orders out of 60,000 each), which result is correct?', [
        ['+0.35 pp, p ≈ 0.002, CI +0.12 to +0.58 pp', true],
        ['+0.35 pp, p ≈ 0.024, CI −0.12 to +0.58 pp', false],
        ['+8.75 pp, p ≈ 0.002, CI +0.12 to +0.58 pp', false],
        ['+0.35 pp, p ≈ 0.200, CI +0.35 to +0.35 pp', false],
      ], '4.35% − 4.00% = 0.35 pp (8.75% is the relative lift). z = 3.03 gives p ≈ 0.0024, and the unpooled 95% interval is +0.12 to +0.58 pp.'),
      mcq('In Exercise 3, Welch\'s t-test gives +18 minutes, p = 0.125, CI −5.4 to +41.4. Which conclusion is right?', [
        ['The data cannot tell whether the new dashboard changes time spent', true],
        ['The new dashboard increases time spent by exactly 18 minutes', false],
        ['The new dashboard has been shown to have no effect on weekly usage at all', false],
        ['The old dashboard is better, as the interval starts below zero', false],
      ], 'The interval includes zero and also large gains, so the test is inconclusive. Twelve users per group is far too few for this much user-to-user variation.'),
      mcq('In Exercise 4, chi-square gives p ≈ 1.6 × 10⁻¹² for plan by channel. Which statement is justified?', [
        ['Plan mix differs by channel; referrals have the highest Premium share', true],
        ['Referral marketing causes users to choose the Premium plan more often', false],
        ['Every channel differs from every other channel on every single plan', false],
        ['Organic users are less valuable and the channel should be cut back', false],
      ], 'The test shows association between channel and plan; row percentages show where (Premium 25.3% for referrals). It is observational, so no causal or budget conclusion follows directly.'),
      mcq('Exercise 5 needs 17,169 users per group for 12% → 13%. Why not simply plan for 12% → 14%, which needs 4,438?', [
        ['A real 1-point gain worth having would then probably be missed', true],
        ['A 2-point MDE makes the test less likely to give false positives', false],
        ['Sample-size formulas do not work for MDEs below 2 points at all', false],
        ['There is no reason; a larger MDE is always the better choice', false],
      ], 'Power is calculated for the MDE. A test sized for 2 points has low power for 1 point, so a valuable smaller effect would usually come out "not significant".'),
      mcq('Exercise 6 shows 25,400 vs 24,300 in a 50/50 test (SRM p ≈ 8 × 10⁻⁷). What is the right next step?', [
        ['Find where treatment users are lost before reading any outcome', true],
        ['Read the outcomes, since the split is within 5% of being equal', false],
        ['Randomly drop 1,100 control users to rebalance the two groups', false],
        ['Extend the test until the two groups have the same user count', false],
      ], 'An SRM this extreme means the arms no longer contain comparable users. Rebalancing or waiting does not fix who is missing; the cause must be found first.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_AB_TESTING_INTERVIEW_QUESTION',
    notes: `A/B testing is the most common "case" question in product-analyst interviews at Indian consumer companies —
e-commerce, food delivery, fintech, edtech. Interviewers want a structured design, a correct reading of results,
and the instinct to distrust a result that looks too good. Three questions, model answers, and the follow-ups.

## 1. "We want to test a new checkout page. How would you design the test?"

**Model answer.** "I'd start from the decision: we ship the new page if it increases completed purchases without
hurting anything important. So the **primary metric** is checkout conversion — users who complete a purchase
divided by users who reach checkout, per user, within the session or a day. **Guardrails**: payment failure rate,
average order value, refund and cancellation rates, and page load time.

I'd **randomise by user**, 50/50, so everyone sees one version consistently, and analyse per user. Then **sample
size**: with a baseline of, say, 40% and a minimum detectable effect the business cares about — say 1 point — I'd
compute the users per arm for 5% significance and 80% power, and convert that into days of traffic, rounded up to
whole weeks. Before launch I'd write all of this in a test plan, including the decision rule, and run a short A/A
check of the assignment. When it ends, I'd check sample-ratio mismatch first, then analyse the primary metric once,
with a confidence interval, then the guardrails."

**Follow-ups:**
- *"Why not just compare this month with last month?"* Everything else changes too — seasonality, campaigns,
  traffic mix. Randomising at the same time makes the groups alike in everything but the page.
- *"Traffic is low — the test would take 10 weeks."* Options: accept a larger MDE if the business would only act on
  a big gain; use a more sensitive metric earlier in the funnel; reduce variance with pre-experiment data (CUPED);
  or decide without a test and monitor, being honest about the risk.

## 2. "Your test shows a 5% lift with p = 0.03. The PM wants to ship. What do you check first?"

**Model answer.** "Four things before I agree. One, **sample-ratio mismatch** — if the arms are not the planned split,
something broke and the result isn't trustworthy. Two, **was this the planned metric and the planned stopping
point**? If we peeked daily and stopped when it crossed 0.05, or if this is one of ten metrics, the false-positive
risk is far above 5%. Three, the **confidence interval**: a 5% lift with an interval from 0.2% to 10% is real but
uncertain; is the low end still worth the cost? Four, **guardrails and novelty** — did anything get worse, and is the
lift stable across the days or decaying? If those pass, I'd support shipping and keep monitoring after launch."

**Follow-ups:**
- *"The SRM check fails. Can't we just reweight?"* No — the missing users are usually not random (a crash on one
  device, a redirect), so reweighting keeps the bias. Find the cause, fix it, rerun.
- *"What does p = 0.03 mean here?"* If the new checkout made no difference, a lift at least this large would show up
  about 3% of the time. It isn't the probability the change does nothing.

## 3. "The test was not significant. The PM says 'so it doesn't work'. How do you respond?"

**Model answer.** "Not significant means we couldn't distinguish the effect from zero — not that it is zero. I'd show
the confidence interval. If it's narrow and centred near zero — say −0.1 to +0.2 points — then any effect is too small
to matter, and I agree we stop. If it's wide — say −0.8 to +2.9 points — the test simply lacked power: it can't rule out
a large gain. Then the question is whether the plausible gain is worth a properly sized test. I'd also check the
power calculation we did beforehand; if the test was sized for a 2-point effect, a real 1-point effect would usually
look 'not significant'."

**Follow-ups:**
- *"Can we just run it a bit longer until it's significant?"* Extending without a plan is peeking in disguise. If we
  extend, we set a new fixed end based on a sample-size calculation, or use a sequential method.
- *"How would you explain power to the PM?"* "The chance our test would catch the improvement if it's really there.
  At 80% power, one real winner in five still looks like a loser."

## How to answer experiment questions well

Structure: **metric → guardrails → unit → size → duration → checks → decision**. Use numbers ("baseline 3.2%, MDE
10% relative, about 50,000 users per arm"). Always mention SRM and peeking — they are what separate someone who has
run tests from someone who has read about them.`,
    mcqs: [
      mcq('In a checkout A/B design, which is the best primary metric?', [
        ['Completed purchases per user who reaches checkout', true],
        ['Total page views of the checkout page per day', false],
        ['Number of clicks on the "Pay now" button per session', false],
        ['Average time users spend on the checkout page', false],
      ], 'The primary metric should reflect the value the change is meant to create and be measured per randomised unit. Page views, clicks and time can rise while purchases fall.'),
      mcq('An interviewer asks: "Results look great, p = 0.03. What do you check first?" Which answer is strongest?', [
        ['Whether the split matches the plan, i.e. a sample-ratio check', true],
        ['Whether p would be smaller if the test ran another week', false],
        ['Whether a one-sided test would make p smaller still', false],
        ['Whether the lift is larger on any device or city segment', false],
      ], 'An SRM means assignment or logging is broken, which invalidates everything else. It is checked before outcomes, and the other options are ways to inflate false positives.'),
      mcq('A PM asks to "run it a bit longer until it is significant". What is the best reply?', [
        ['That is peeking; set a new fixed end from a sample-size calculation', true],
        ['That is fine, as more data always makes a test more accurate', false],
        ['That is fine, as long as the test stops within one more week', false],
        ['That is impossible, as tests can never be extended once started', false],
      ], 'Extending until p crosses 0.05 inflates false positives just like daily peeking. A planned extension with a new fixed sample size, or a sequential design, is valid.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_AB_TESTING_MINI_PROJECT',
    notes: `# Analysing an A/B Test for a Checkout Change

You are the analyst on an Indian e-commerce company's checkout team. For two weeks the company tested a new
**one-page checkout** against the old multi-step checkout. The product manager wants to roll it out to everyone
and asks you for a recommendation. You will check that the experiment is trustworthy, analyse conversion and order
value with the right tests and intervals, check the guardrails, and write a one-page recommendation.

## The data

Generate the dataset with this script (seed fixed, so everyone gets the same 83,354 rows). It deliberately contains
at least one problem a careful analyst should catch.

    import numpy as np
    import pandas as pd

    rng = np.random.default_rng(2025)
    n = 84_000
    days = pd.date_range("2024-11-04", periods=14, freq="D")

    users = pd.DataFrame({
        "user_id": [f"U{i:06d}" for i in range(1, n + 1)],
        "assigned_on": rng.choice(days, n),
        "variant": rng.choice(["control", "one_page"], n),
        "device": rng.choice(["android", "ios", "web"], n, p=[0.62, 0.18, 0.20]),
        "new_customer": rng.random(n) < 0.35,
    })

    lost = (users["device"] == "ios") & (users["variant"] == "one_page") & (rng.random(n) < 0.09)
    users = users[~lost].reset_index(drop=True)

    base = np.where(users["new_customer"], 0.026, 0.041)
    lift = np.where(users["variant"] == "one_page", 1.08, 1.0)
    users["converted"] = (rng.random(len(users)) < base * lift).astype(int)

    aov = np.round(rng.lognormal(6.6, 0.7, len(users)))
    aov = np.where(users["variant"] == "one_page", np.round(aov * 0.97), aov)
    users["order_value"] = np.where(users["converted"] == 1, aov, np.nan)

    fail_p = np.where(users["variant"] == "one_page", 0.052, 0.045)
    users["payment_failed"] = np.where(users["converted"] == 1,
                                       (rng.random(len(users)) < fail_p).astype(int), np.nan)
    users["checkout_load_ms"] = np.round(
        rng.lognormal(np.where(users["variant"] == "one_page", 7.05, 7.0), 0.35)).astype(int)

    users.to_csv("checkout_test.csv", index=False)

**Analyse \`checkout_test.csv\` as if you had received it from the data platform** — the generator shows you how it
was made, but your report must find any problems from the data, the way you would at work.

| Column | Type | Meaning |
|---|---|---|
| user_id | text | One row per user who reached checkout during the test; unique |
| assigned_on | date | Day the user was assigned (4–17 November 2024, 14 days) |
| variant | text | \`control\` (old checkout) or \`one_page\` (new); planned split 50/50 |
| device | text | android, ios or web |
| new_customer | bool | True if this is the user's first order attempt |
| converted | 0/1 | 1 if the user completed a purchase — **primary metric** |
| order_value | ₹ | Value of the order; blank when converted = 0 |
| payment_failed | 0/1 | Among converted users, 1 if a payment attempt failed before succeeding; blank otherwise — **guardrail** |
| checkout_load_ms | integer | Checkout page load time in milliseconds — **guardrail** |

## The questions

1. **Is the experiment trustworthy?** Check the split overall and by device and by day (sample-ratio mismatch);
   check the date range and duplicates. If something is wrong, find where, explain the likely cause, and decide
   what can still be concluded.
2. **Conversion.** Compare conversion between variants with a two-proportion test and a 95% CI for the
   difference, overall and on the part of the data you trust. Report the relative lift.
3. **Order value.** Compare average order value with Welch's t-test and the median with Mann–Whitney; explain which
   one the business should care about. Compute **revenue per user** (total order value ÷ users in the arm) — it
   combines conversion and order value.
4. **Guardrails.** Payment failure rate (two-proportion test among converted users) and checkout load time (median
   and p90 by variant). Is anything worse?
5. **Segments.** New vs returning customers and device — only as hypotheses, with the multiple-comparison caveat.
6. **Recommendation.** Ship, do not ship, or fix and rerun — with the evidence and the risks.

## Deliverables

1. **\`ab_analysis.ipynb\`** — runs top to bottom after "Restart & Run All": load and validate; SRM checks; primary
   metric; order value and revenue per user; guardrails; segments; a results table.
2. **\`recommendation.pdf\` (or .docx), one page** — decision first; result with intervals in business terms (orders
   and ₹ per month, using an assumed 6 lakh checkout users a month — state the assumption); guardrails; validity
   checks and what they found; caveats and next step.
3. **\`README.md\`** — how to generate the data and run the notebook; library versions.

## Acceptance criteria

- The notebook regenerates the data from the script and reproduces every number in the one-pager.
- The SRM check is run **before** any outcome is analysed, overall and by device, with the chi-square statistic and
  p-value shown; any mismatch is located and its effect on the conclusions is explained.
- Conversion is compared with a two-proportion z-test (or uncorrected 2×2 chi-square) and a 95% CI for the
  difference in percentage points; the relative lift is also stated.
- Order value is tested with Welch's t-test **and** described with medians; revenue per user is reported per arm.
- Each guardrail has a test or interval, and the report says plainly whether it got worse.
- No p-value is described as the probability that a hypothesis is true; no CI is described as a 95% probability
  for the true value.
- Segment results are labelled as exploratory.
- The recommendation follows from the evidence, including the validity problems, and names what should happen next.`,
    mcqs: [
      mcq('Your first check of the project data finds the arms at 42,273 vs 41,081 users, with a chi-square p far below 0.001. What should come next in the notebook?', [
        ['Locate the imbalance by device and day before analysing conversion', true],
        ['Analyse conversion first and add the imbalance as a footnote later', false],
        ['Delete control users at random until the arms are exactly equal', false],
        ['Stop the analysis entirely, as no conclusion is possible at all', false],
      ], 'An SRM must be explained before outcomes are trusted. Locating it (which device, which days) shows which part of the data is still a fair comparison and how the result might be biased.'),
      mcq('The one-page arm converts more often but has slightly lower average order value. Which single metric best combines the two for the recommendation?', [
        ['Revenue per user: total order value divided by users in the arm', true],
        ['Median order value among converted users only, in each arm', false],
        ['The p-value of the conversion test divided by that of the AOV test', false],
        ['The number of orders in each arm, regardless of the arm\'s size', false],
      ], 'Revenue per user equals conversion × average order value, so it shows whether more orders outweigh smaller baskets. It is computed per randomised user, matching the design.'),
    ],
    assignment: {
      title: 'Analysing an A/B Test for a Checkout Change',
      description: 'Validate and analyse a two-week checkout A/B test — sample-ratio mismatch, conversion, order value, revenue per user and guardrails — and write a one-page recommendation with intervals in business terms.',
      instructions: `Complete the analysis described in this unit's brief and submit a repository link or a zip.

**Submit:**

1. \`ab_analysis.ipynb\` — generates the data with the brief's script, then: validation and SRM checks (overall, by
   device, by day); conversion with a two-proportion test and 95% CI; order value with Welch's t-test and medians;
   revenue per user; guardrails; exploratory segments; a final results table. It must run top to bottom after
   "Restart & Run All".
2. \`recommendation.pdf\` or \`.docx\`, one page — decision first; results with intervals in orders and ₹ a month (state
   your traffic assumption); guardrails; what the validity checks found and how they affect the conclusion; caveats
   and next step.
3. \`README.md\` — how to run it and the library versions (pandas, NumPy, SciPy).

**Before you submit,** go through the acceptance criteria in the brief and note each result at the end of the
notebook (for example: "SRM overall: chi-square = …, p = … — located in …").`,
      rubric: [
        { criterion: 'Experiment validity', description: 'SRM checked before outcomes, overall and by device and day, with statistic and p-value; the mismatch is located, its likely cause explained, and its effect on what can be concluded is handled (for example, analysing the unaffected devices separately).', maxPoints: 25 },
        { criterion: 'Correct tests and intervals', description: 'Two-proportion test and 95% CI for conversion; Welch\'s t-test plus medians for order value; revenue per user; guardrail tests; correct choice of unit (one row per user) and no peeking or post-hoc sidedness.', maxPoints: 30 },
        { criterion: 'Interpretation', description: 'p-values and intervals are interpreted correctly; statistical and practical significance are distinguished; results are translated into orders and ₹; segments are labelled exploratory with the multiple-comparison caveat.', maxPoints: 20 },
        { criterion: 'Recommendation', description: 'A one-page recommendation that leads with the decision, follows from the evidence including guardrails and validity problems, states risks plainly and names the next step.', maxPoints: 15 },
        { criterion: 'Reproducibility', description: 'The notebook regenerates the data and reproduces every number in the one-pager after Restart & Run All; the README explains how to run it and lists library versions.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_AB_TESTING_CHECKPOINT',
    notes: `Ten questions across the topic: hypotheses and p-values, choosing a test, designing an experiment, the
pitfalls that ruin one, and reading a result. Several give numbers — work them out before you look at the options.
Every value was computed with SciPy 1.18.`,
    checkpoint: [
      mcq('A test of a new loan-application page gives p = 0.02 for "conversion is unchanged". Which statement is correct?', [
        ['If conversion were unchanged, a gap this large would appear about 2% of the time', true],
        ['There is a 2% probability that the new page has no effect on conversion', false],
        ['There is a 98% probability that the new page converts better than the old', false],
        ['The new page improves conversion by about 2% relative to the old page', false],
      ], 'The p-value is computed assuming H₀; it measures how surprising the data are under H₀. It is not the probability of H₀ or of H₁, and it is not an effect size.'),
      mcq('Control converts 300 of 10,000 and treatment 330 of 10,000. The test gives p = 0.22 and a 95% CI of −0.18 to +0.78 pp. What is the right reading?', [
        ['The test cannot tell whether the change helps; the interval includes zero', true],
        ['The change lifts conversion by 10%, so it should be rolled out to everyone', false],
        ['The change has been proved to have no effect at all on conversion', false],
        ['The change lowers conversion, since the interval starts below zero', false],
      ], 'A 10% relative lift (3.0% → 3.3%) is the point estimate, but the interval runs from a small loss to a sizeable gain. "Not significant" here means "not measured precisely enough".'),
      mcq('Which test fits "do customers in Chennai, Kochi and Pune choose different delivery slots (morning, afternoon, evening)?"', [
        ['A chi-square test of independence on the counts', true],
        ['Welch\'s t-test on the average slot per city', false],
        ['A two-proportion z-test on Chennai versus Kochi', false],
        ['A Pearson correlation between city and slot', false],
      ], 'Two categorical variables with several levels each call for a chi-square test on a contingency table of counts. Averaging slot labels or correlating categories is meaningless.'),
      mcq('A test needs 49,777 users per group to detect 3.2% → 3.52%. With 18,000 eligible users a day split 50/50, how long should it run?', [
        ['7 days — 5.5 days of traffic, rounded up to a full week', true],
        ['3 days — 49,777 users is reached within 3 days', false],
        ['5 days — the sample is reached on the fifth day', false],
        ['14 days — every A/B test must always run two weeks', false],
      ], '2 × 49,777 = 99,554 users ÷ 18,000 a day = 5.5 days. Rounding up to a whole week keeps the weekday/weekend mix representative.'),
      mcq('Why do analysts randomise a delivery-fee test by user rather than by page view?', [
        ['Each user sees one fee consistently and is one independent unit', true],
        ['Page views are too few to give the test any statistical power', false],
        ['Users are easier to count than page views in the analytics tool', false],
        ['Randomising by page view always produces a sample-ratio mismatch', false],
      ], 'Per-view randomisation shows one user both fees, contaminating both arms, and a user\'s views are correlated. User-level randomisation and analysis avoid both problems.'),
      mcq('In simulated A/A tests checked every day for 14 days and stopped at the first p < 0.05, about 22.5% declared a winner. What should a team do instead?', [
        ['Fix the sample size and end date, and read the result once', true],
        ['Check twice a day so that the real effects are found much sooner', false],
        ['Lower α to 0.04 so daily checks stay at a 5% error rate', false],
        ['Stop at the first p < 0.01 instead of the first p < 0.05', false],
      ], 'Each look is another chance for a false positive. A fixed horizon (or a properly designed sequential test) keeps the false-positive rate at α; ad-hoc tweaks to the threshold do not.'),
      mcq('A 50/50 test ends with 5,060 vs 4,940 users. `stats.chisquare([5060, 4940])` gives p = 0.23. What does that mean?', [
        ['The split is consistent with 50/50; no sample-ratio mismatch', true],
        ['There is a sample-ratio mismatch that must be investigated first', false],
        ['The treatment arm converts better than the control arm', false],
        ['The test needs exactly 120 more treatment users to be valid', false],
      ], 'A 120-user gap on 10,000 is an ordinary chance wobble (chi-square 1.44). SRM alarms are usually raised only below p = 0.001.'),
      mcq('A test with 50,000 users per arm shows 4.10% vs 4.48% (p = 0.003, CI +0.13 to +0.63 pp). The MDE was +0.1 pp. What should the recommendation be, if guardrails are fine?', [
        ['Ship: even the low end of the interval is above the MDE', true],
        ['Rerun: p = 0.003 is too small to be believable', false],
        ['Do not ship: the lift is still under one whole percentage point', false],
        ['Do not ship: the interval does not contain zero', false],
      ], 'The whole interval sits above the minimum effect worth acting on, so the change is both statistically and practically significant.'),
      mcq('A report tests 4 variants against one control at α = 0.05 each. Using Bonferroni, what threshold should each comparison use?', [
        ['0.0125', true],
        ['0.0500', false],
        ['0.2000', false],
        ['0.0100', false],
      ], 'Bonferroni divides α by the number of comparisons: 0.05 / 4 = 0.0125. Without a correction, the chance of at least one false winner is about 18.5%.'),
      mcq('A new search page lifted clicks 10% overall; daily lift fell from 18% on day 1 to 2% on day 14. What is the most defensible conclusion?', [
        ['The long-run effect is probably small; the early lift looks like novelty', true],
        ['The real effect is 10%, as that is the average over the whole test', false],
        ['The real effect is 18%, as day 1 shows users\' true first reaction', false],
        ['The test is invalid, as daily lifts should always be the same size', false],
      ], 'A lift that decays as users get used to a change points to a novelty effect. The later days are closer to what a full rollout would deliver.'),
    ],
  },
];
