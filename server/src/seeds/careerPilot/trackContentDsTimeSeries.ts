/**
 * Career-track content: time series and forecasting (Data Science + AI, batch S3).
 *
 * DS_TIME_SERIES — what makes time data different (trend, weekly and festival seasonality, autocorrelation,
 * stationarity), the baselines every forecast must beat, exponential smoothing and (S)ARIMA in statsmodels,
 * forecasting as supervised learning with lag and festival features and no peeking at the future, and honest
 * evaluation with rolling-origin backtests and prediction intervals. Ends with a cloud-kitchen mini project.
 *
 * Builds on DS_ML_WORKFLOW (time-based splits, TimeSeriesSplit, the seasonal-naive baseline as an idea),
 * DS_REGRESSION (MAE, RMSE and the MAPE trap) and DS_ENSEMBLES (LightGBM). Datasets are simulated with fixed
 * seeds: one outlet of a Bengaluru biryani cloud kitchen (make_orders) and all six outlets of the brand across
 * Bengaluru, Hyderabad and Kochi (make_kitchen), with weekly rhythm, payday and monsoon lifts, and festivals on
 * their real dates. Every output shown was produced by running the code with pandas 3.0, NumPy 2.5, statsmodels
 * 0.15, scikit-learn 1.9 and LightGBM 4.7; the code is written for statsmodels 0.14+ and says where an API changed.
 * The topic is single-skill, so checkpoint questions carry no skillKey.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_DS_TIME_SERIES_BUNDLES: PilotBundle[] = [
  /* ── TS_BASICS ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_TIME_SERIES_TS_BASICS',
    notes: `Every model so far assumed the rows were exchangeable: shuffle them and nothing changes. A time series breaks
that assumption on purpose. Today's orders are related to yesterday's and to last Saturday's; the order of the rows
*is* the information. That changes how you look at the data, how you split it and which models make sense.

## The data used in this topic

"Biryani Junction" is a cloud kitchen — no dining room, orders only through the delivery apps — with its busiest
outlet in Koramangala, Bengaluru. You have its daily orders from 1 January 2022 to 30 June 2025: 1,277 days. The
generator below builds in what a real kitchen sees: steady growth, a strong weekly rhythm, a small lift in the
first three days of the month (salary credited), rainy monsoon evenings, and festivals on their real dates —
Diwali (people eat at home), Eid al-Fitr and Bakrid (biryani day), Onam, Holi and New Year's Eve.

    import numpy as np
    import pandas as pd

    FESTIVALS = {
        "Diwali": ["2022-10-24", "2023-11-12", "2024-10-31", "2025-10-20"],
        "Eid al-Fitr": ["2022-05-03", "2023-04-22", "2024-04-11", "2025-03-31"],
        "Bakrid": ["2022-07-10", "2023-06-29", "2024-06-17", "2025-06-07"],
        "Onam": ["2022-09-08", "2023-08-29", "2024-09-15", "2025-09-05"],
        "Holi": ["2022-03-18", "2023-03-08", "2024-03-25", "2025-03-14"],
        "New Year's Eve": ["2022-12-31", "2023-12-31", "2024-12-31"],
    }
    EFFECT = {"Diwali": 0.60, "Eid al-Fitr": 1.45, "Bakrid": 1.35, "Onam": 0.90, "Holi": 0.80, "New Year's Eve": 1.50}

    def make_orders(start="2022-01-01", end="2025-06-30", seed=7):
        rng = np.random.default_rng(seed)
        dates = pd.date_range(start, end, freq="D")
        n = len(dates)
        t = np.arange(n) / 365.25
        level = 300 * (1.15 ** t)                                          # ~15% growth a year
        weekday = np.array([0.88, 0.85, 0.90, 0.95, 1.12, 1.22, 1.18])[dates.dayofweek]
        payday = np.where(dates.day <= 3, 1.06, 1.0)
        monsoon = dates.month.isin([6, 7, 8, 9])
        rain = np.where(monsoon & (rng.random(n) < 0.35), 1.18, 1.0)
        fest = np.ones(n)
        for name, days in FESTIVALS.items():
            for d in pd.to_datetime(days):
                fest[dates == d] *= EFFECT[name]
                if name == "Diwali":
                    fest[dates == d - pd.Timedelta(days=1)] *= 0.80
        mean = level * weekday * payday * rain * fest
        orders = rng.poisson(mean * rng.gamma(60, 1 / 60, n))
        return pd.DataFrame({"date": dates, "orders": orders, "rain": (rain > 1).astype(int)})

    s = make_orders().set_index("date")["orders"].asfreq("D")
    s.index.freq                     # <Day> — a regular daily index, no gaps
    s.describe()                     # mean 402.4, sd 103.8, min 137, max 876

Two habits from the first line: put the dates in a **DatetimeIndex**, and make the frequency explicit with
\`asfreq("D")\`. A missing day then shows up as NaN instead of silently disappearing — which matters the moment you
compute "the same day last week".

## Look at it at three zoom levels

    s.groupby(s.index.year).mean().round(1)
    # 2022: 334.4   2023: 390.2   2024: 442.0   2025 (Jan–Jun): 484.3

    s.resample("MS").mean().round(1).loc["2024"]
    # Jan 377.2  Feb 398.0  Mar 437.2  Apr 409.5  May 411.7  Jun 482.3
    # Jul 466.0  Aug 481.0  Sep 478.2  Oct 452.6  Nov 460.1  Dec 449.9

    dow = s.groupby(s.index.day_name()).mean()
    (dow / dow.mean()).round(3)
    # Monday 0.867  Tuesday 0.836  Wednesday 0.883  Thursday 0.939  Friday 1.099  Saturday 1.213  Sunday 1.162

Three things are visible already. A **trend**: about 15% more orders each year. A **weekly season**: Saturday is
about 45% busier than Tuesday. And a **yearly shape**: June to September jump (monsoon evenings — nobody wants to
go out in the rain), which a monthly view shows and a daily plot hides under the weekly zig-zag.

\`resample\` changes the frequency (daily to monthly); \`rolling(7).mean()\` smooths without changing it. A 7-day
rolling mean removes the weekly pattern exactly, because every window contains one of each weekday:

    s.rolling(7).mean().iloc[:8].round(1).tolist()
    # [nan, nan, nan, nan, nan, nan, 295.0, 311.4]

The first six values are NaN — there are not yet seven days to average. Note also that \`rolling\` is
**trailing** by default: the value on 7 January averages 1–7 January, including 7 January itself. Fine for a chart;
a leak if you later use it as a feature to predict 7 January (the ML unit returns to this).

## Decomposition: trend + season + remainder

A **decomposition** splits the series into a slow trend, a repeating seasonal pattern and what is left. Two forms:

- **additive**: orders = trend + season + remainder — the weekly swing is a fixed number of orders;
- **multiplicative**: orders = trend × season × remainder — the weekly swing is a fixed *percentage*.

When the level grows, a kitchen's Saturday surplus grows with it, so multiplicative is the natural choice here (or,
equivalently, additive on the log of the series).

    from statsmodels.tsa.seasonal import seasonal_decompose, STL

    cd = seasonal_decompose(s, model="multiplicative", period=7)
    cd.seasonal.loc["2024-06-03":"2024-06-09"].round(3).tolist()     # Monday to Sunday
    # [0.867, 0.835, 0.885, 0.941, 1.098, 1.214, 1.161]
    cd.trend.isna().sum()                                             # 6 — 3 days lost at each end

The classical decomposition uses a centred moving average for the trend (so it loses half a window at each end) and
one fixed seasonal pattern for the whole history. **STL** (Seasonal-Trend decomposition using Loess) is the modern
default: the seasonal pattern may evolve slowly, there are no missing ends, and \`robust=True\` stops a festival
spike from bending the trend.

    res = STL(s, period=7, robust=True).fit()
    res.trend.iloc[[0, 365, 730, 1095, -1]].round(1).tolist()
    # [286.5, 341.2, 402.6, 459.9, 503.8]

How strong are the components? A common measure compares the remainder's variance with the variance of remainder
plus component: strength = max(0, 1 − Var(R) / Var(R + component)).

    var = np.var
    seasonal_strength = max(0, 1 - var(res.resid) / var(res.resid + res.seasonal))   # 0.538
    trend_strength    = max(0, 1 - var(res.resid) / var(res.resid + res.trend))      # 0.523

Both around 0.5: real structure, and a lot of day-to-day noise on top. That noise sets a floor no model will get under.

## Festivals: seasonality that moves

Diwali, Eid and Onam follow lunar or regional calendars, so they land on a different date each year — a "same day
last year" rule misses them. Measure each festival against the same weekday in the two weeks before and after:

    for name, days in FESTIVALS.items(): ...   # ratio = festival day / mean of the same weekday at ±7 and ±14 days

    Diwali          0.44  0.65  0.60          mean 0.56
    Eid al-Fitr     1.28  1.41  1.22  1.69    mean 1.40
    Bakrid          1.99  1.24  1.06  1.36    mean 1.41
    Onam            0.71  1.08  1.17          mean 0.98
    Holi            0.93  0.56  1.06  0.57    mean 0.78
    New Year's Eve  1.75  1.59  1.72          mean 1.68

Two lessons. Festivals are huge — Diwali roughly halves orders, Eid adds 40% — so a forecast that ignores the
calendar is wrong by hundreds of orders on exactly the days the kitchen most needs to plan. And with only three or
four occurrences each, the estimates are noisy (Bakrid ranges from 1.06 to 1.99). Festival effects are worth
pooling across outlets and years, and worth checking with the operations team.

## Autocorrelation: the series remembers

The **autocorrelation function (ACF)** is the correlation of the series with itself shifted by k days:

    from statsmodels.tsa.stattools import acf
    a = acf(s, nlags=28)
    # lag 1: 0.485   lag 2: 0.233   lag 3: 0.077   lag 6: 0.468   lag 7: 0.610
    # lag 14: 0.579  lag 21: 0.585  lag 28: 0.596

Read it like a forecaster. Lag 7 (0.61) beats lag 1 (0.49): *last Saturday tells you more about this Saturday than
yesterday (a Friday) does.* Peaks at 7, 14, 21, 28 are the weekly season; the slow decay underneath is the trend.
After removing the weekly pattern with a seasonal difference (orders − orders 7 days ago), the picture changes:

    a7 = acf(s.diff(7).dropna(), nlags=14)
    # lag 1: 0.031   lag 2: 0.038   lag 7: -0.464   lag 14: -0.054

Almost nothing left at short lags, and a strong *negative* spike at 7 — the signature of differencing a pattern that
was already stable. The ARIMA unit turns exactly this into a model term.

## Stationarity

A series is **stationary** when its mean, variance and autocorrelation do not depend on when you look. Orders that
grow 15% a year are not. Classical models (ARIMA) assume stationarity *after* transformation, so you test before and
after differencing. Two tests with opposite null hypotheses are used together:

- **ADF** (augmented Dickey–Fuller): null = "has a unit root" (non-stationary). Small p → stationary.
- **KPSS**: null = "is stationary". Small p → non-stationary.

    from statsmodels.tsa.stattools import adfuller, kpss

                  ADF stat   ADF p     KPSS stat   KPSS p
    raw             -1.80    0.379       8.461     0.010
    diff(1)        -12.96    0.000       0.026     0.100
    diff(7)        -14.70    0.000       0.004     0.100

Raw: ADF cannot reject a unit root and KPSS rejects stationarity — both say non-stationary. After differencing,
both agree it is stationary. (statsmodels reports KPSS p-values only between 0.01 and 0.10 and warns when the true
value lies outside that table.) Gradient-boosted models do not need stationarity in this sense, but they have their
own version of the problem: trees cannot predict above the highest value they saw, so trend must be handled
explicitly (the ML unit).

## What to say about a new series in two minutes

"Daily, 1,277 days, no gaps. Trend about +15% a year; a multiplicative weekly cycle with Saturday 1.21× and Tuesday
0.84× the average; a monsoon lift June to September; festivals that move each year and swing orders by −45% to
+70%. Lag-7 autocorrelation 0.61 beats lag 1. Non-stationary as it stands; stationary after a weekly difference."`,
    mcqs: [
      mcq('The Koramangala series has ACF 0.49 at lag 1 and 0.61 at lag 7. What does that tell a forecaster?', [
        ['Last week’s same weekday predicts a day better than yesterday does', true],
        ['The series is stationary, since every autocorrelation is below one', false],
        ['Yesterday is the strongest predictor, as lag 1 always dominates an ACF', false],
        ['The weekly pattern is too weak to model, so it can safely be ignored', false],
      ], 'A higher autocorrelation at lag 7 than at lag 1 is the weekly season showing through: a Saturday resembles last Saturday more than it resembles Friday.'),
      mcq('Why is a multiplicative decomposition more natural than an additive one for this kitchen’s orders?', [
        ['The weekend surplus grows as the level grows, so it is a fixed percentage', true],
        ['Order counts are integers, and additive models require continuous values', false],
        ['Multiplicative decomposition is the only form that statsmodels supports', false],
        ['The trend is falling, and additive models need a trend that is rising', false],
      ], 'When the seasonal swing scales with the level, season × trend describes it with one stable set of factors (Saturday ≈ 1.21×). An additive model would need the Saturday surplus in orders to keep changing.'),
      mcq('On the raw series, ADF gives p = 0.379 and KPSS gives p = 0.010. What do the two tests conclude together?', [
        ['Both point to a non-stationary series', true],
        ['Both point to a stationary series', false],
        ['They disagree, so neither can be used', false],
        ['The series is stationary around a trend', false],
      ], 'ADF’s null is non-stationarity and it is not rejected; KPSS’s null is stationarity and it is rejected. Both lead to the same conclusion, which differencing then fixes.'),
    ],
    checkpoint: [
      mcq('A colleague computes s.rolling(7).mean() on daily orders. What is the value on 7 January the average of?', [
        ['Orders on 1 to 7 January, including 7 January itself', true],
        ['Orders on 4 to 10 January, centred on 7 January itself', false],
        ['Orders on 31 December to 6 January, ending the day before', false],
        ['Orders on 7 to 13 January, the seven days starting that day', false],
      ], 'pandas rolling windows are trailing and include the current row unless center=True. As a model feature it must be shifted, or it contains the very day being predicted.'),
      mcq('Why do festivals such as Diwali, Eid and Onam need special handling that a "same day last year" rule does not give?', [
        ['They follow lunar or regional calendars and land on a different date each year', true],
        ['They change orders by too little to matter for a cloud kitchen’s daily plan', false],
        ['They always fall on weekends, so the weekly season already accounts for them', false],
        ['They happen too often for a yearly rule to separate one from the next', false],
      ], 'A moving festival is invisible to a fixed-date or fixed-lag rule. It has to enter the model as a calendar feature, with its own estimated effect.'),
      mcq('After a weekly difference, the ACF is near zero at lags 1 and 2 but −0.46 at lag 7. What does the spike suggest?', [
        ['The weekly pattern was stable, so differencing it left a seasonal MA signature', true],
        ['The differenced series still has a strong trend that has to be removed again', false],
        ['The data contains missing days that have shifted the weekly pattern by one', false],
        ['The orders follow a monthly cycle, which shows up as a spike at lag seven', false],
      ], 'Differencing a nearly fixed seasonal pattern creates negative correlation at the seasonal lag. In a SARIMA model this appears as a seasonal MA coefficient close to −1.'),
    ],
  },

  /* ── BASELINE_FORECASTS ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_TIME_SERIES_BASELINE_FORECASTS',
    notes: `Before any model, decide what "good" means. In forecasting the answer is never an absolute number — "MAE 80
orders" means nothing alone — it is **better than the simplest method that a sensible person would use anyway**.
Those methods are the baselines. They take one line each, and they are surprisingly hard to beat.

## The setup

The kitchen plans staff and raw material four weeks ahead, so the forecast horizon is **28 days**. The forecast is
made at the end of 2 June 2025 for 3–30 June:

    s = make_orders().set_index("date")["orders"].asfreq("D")
    H = 28
    train, test = s.iloc[:-H], s.iloc[-H:]          # train ends 2025-06-02; test 2025-06-03 .. 2025-06-30
    test.mean()                                      # 520.3

Note what the test window contains: the first month of the monsoon and **Bakrid on Saturday 7 June** (859 orders,
the busiest day in the window).

## Seven baselines

    idx = test.index
    fc = {}
    fc["mean of history"]   = pd.Series(train.mean(), idx)
    fc["naive (last value)"] = pd.Series(train.iloc[-1], idx)
    fc["seasonal naive (last week)"] = pd.Series(np.tile(train.iloc[-7:].values, 4), idx)
    fc["moving average, 28 days"] = pd.Series(train.iloc[-28:].mean(), idx)
    slope = (train.iloc[-1] - train.iloc[0]) / (len(train) - 1)
    fc["drift"] = pd.Series(train.iloc[-1] + slope * np.arange(1, H + 1), idx)
    last4 = train.iloc[-28:].values.reshape(4, 7).mean(axis=0)            # mean of each weekday, last 4 weeks
    fc["seasonal mean, last 4 weeks"] = pd.Series(np.tile(last4, 4), idx)
    fc["same weekday last year"] = pd.Series(s.shift(364).loc[idx].values, idx)

What each one assumes:

| Baseline | Forecast for every future day | Assumes |
|---|---|---|
| mean of history | the average of all past days | nothing changes, ever |
| naive | the last observed day | tomorrow is like today, forever |
| seasonal naive | the same weekday last week | this week repeats |
| moving average | the average of the last 28 days | the recent level holds, no weekly shape |
| drift | the last value plus the average daily change | the trend line continues |
| seasonal mean | each weekday's mean over the last 4 weeks | the recent weekly shape repeats, less noisily |
| same weekday last year | the value 364 days ago (52 weeks, so the weekday matches) | this year repeats last year |

The last one uses 364, not 365, so that a Saturday is compared with a Saturday.

## The scores

The **MASE** column divides each method's MAE by the in-sample MAE of the seasonal-naive method over the training
data (68.3 orders here). MASE below 1 means "better than repeating last week did, on average, in the past"; it is
comparable across outlets of different sizes and is safe when actuals are small.

    scale = np.mean(np.abs(train.diff(7).dropna()))          # 68.3

    method                          MAE    RMSE   MAPE%   MASE   bias (actual − fc)
    mean of history               140.5   186.7    23.8   2.06        120.5
    naive (last value)            121.7   165.7    21.2   1.78         84.3
    seasonal naive (last week)    100.0   137.3    19.7   1.47         17.3
    moving average, 28 days       110.4   144.8    21.4   1.62         25.3
    drift                         121.1   164.6    21.1   1.77         82.2
    seasonal mean, last 4 weeks    94.3   121.3    18.2   1.38         25.3
    same weekday last year        108.8   141.9    20.1   1.59         47.8

Reading it:

- **Ignoring the week costs most.** Naive and drift repeat one day (a Monday, 436 orders) for four weeks, so every
  weekend is badly short. Their bias is +80: orders exceed the forecast.
- **Seasonal methods win**, and averaging four weeks beats copying one: last week contained random noise that the
  seasonal naive copies faithfully into every future week. Averaging four of each weekday cancels some of it.
- **"Last year" is beaten by "last month".** The kitchen grew about 15% in a year, and last year's level is stale.
- **All MASE values are above 1** in this window. June was harder than the average past week: the monsoon and
  Bakrid. One window is one draw; a single month can flatter or punish any method.

## One window is not enough: rolling origins

Repeat the comparison from 12 forecast origins, 28 days apart, each forecasting the following 28 days:

    origins = [len(s) - H - 28 * k for k in range(12)]
    for o in origins:
        tr, te = s.iloc[:o], s.iloc[o:o + H]
        ...                                   # the four baselines, MAE on te

    method                          mean MAE   sd across origins   wins
    naive (last value)                107.0          28.8             0
    seasonal naive (last week)         77.3          12.1             1
    moving average, 28 days            78.7          11.5             0
    seasonal mean, last 4 weeks        61.6          11.9            11

Over a year of origins the seasonal mean wins 11 of 12 and its average MAE (61.6) is much lower than June's 94.3 —
June was a hard month, not a typical one. This is the **bar**: a model for this outlet is worth deploying only if
it beats about 62 orders of MAE on the same backtest. The evaluation unit formalises the backtest.

## Why bother with baselines

1. **They catch broken pipelines.** A model that loses to "same weekday, last four weeks" has a bug or a leak, or
   the data has no signal the model can use.
2. **They set expectations.** If the best baseline is at MASE 0.9 and the model at 0.85, the model is a 6% gain,
   not a breakthrough — which may or may not be worth its maintenance.
3. **They are a fallback.** When the model's pipeline fails at 2 a.m., the kitchen still needs a number tomorrow.
4. **Sometimes they are the answer.** Plenty of production forecasts are seasonal means with a festival adjustment.`,
    workedExample: `**Goal: give the Koramangala operations manager a defensible "bar" for any forecasting model, in one table.**

**Step 1 — fix the question.** Horizon 28 days (staffing is planned four weeks ahead), daily granularity, one
outlet. The metric: MAE in orders (the manager thinks in orders), with MASE alongside to compare later with other
outlets.

**Step 2 — choose candidates that cost nothing.** Naive, seasonal naive (last week), a 28-day moving average and
the 4-week seasonal mean. Each is one line of pandas.

**Step 3 — score them on more than one month.** Twelve origins, 28 days apart, each forecasting the following 28
days. Mean MAE (sd): naive 107.0 (28.8), seasonal naive 77.3 (12.1), moving average 78.7 (11.5), seasonal mean
**61.6 (11.9)**, which wins 11 of 12 origins.

**Step 4 — read the spread, not just the mean.** The sd of about 12 orders across origins says that a single month
can move MAE by ±12 by luck alone. June 2025 on its own gave the seasonal mean 94.3 — a model that "scores 85 in
June" has not beaten the bar; it has to be compared on the same 12 origins.

**Step 5 — write the sentence.** "Repeating the average of each weekday over the last four weeks misses by about
62 orders a day across the last year (about 13% of a typical day). Any model must beat that on the same backtest to
be worth running."

**Why it worked:** the baseline was chosen by the same backtest that will judge the models, it respects the weekly
season, and the spread shows how big a difference has to be before it means anything.`,
    mcqs: [
      mcq('The naive forecast (repeat the last day, a Monday) has a bias of +84 orders over the June test window. What causes it?', [
        ['It copies a quiet weekday onto every weekend for four weeks', true],
        ['It uses the mean of history, which is far below today’s level', false],
        ['It overreacts to the trend and so forecasts too many orders', false],
        ['It includes Bakrid in the history, which pulls forecasts up', false],
      ], 'Repeating one Monday (436 orders) misses every busier day, so actuals exceed the forecast on average. Positive bias here means under-forecasting.'),
      mcq('Why does the seasonal mean of the last four weeks beat the seasonal naive forecast on 11 of 12 origins?', [
        ['Averaging four of each weekday cancels noise that one week copies forward', true],
        ['It uses a longer history, so it can follow the trend more than one week can', false],
        ['It includes the test weeks in its average, which gives it an unfair edge', false],
        ['It ignores the weekly season, which is only noise in daily order counts', false],
      ], 'Last week’s values contain random day-to-day noise. Seasonal naive repeats it four times; averaging four weeks keeps the weekday shape and shrinks the noise.'),
      mcq('A method scores MASE 1.47 in one test month. What does that mean?', [
        ['Its MAE was 1.47 times the in-sample MAE of repeating last week', true],
        ['It was right on 47% more days than the seasonal-naive forecast', false],
        ['Its percentage error was 1.47%, which is excellent for daily data', false],
        ['It beat the seasonal-naive forecast by 47% in that test window', false],
      ], 'MASE scales MAE by the training-period MAE of a seasonal-naive forecast. Above 1 means a larger error than that benchmark achieved historically.'),
    ],
    checkpoint: [
      mcq('Why does a "same weekday last year" baseline on daily data use a lag of 364 days rather than 365?', [
        ['364 is exactly 52 weeks, so a Saturday is matched with a Saturday', true],
        ['365 would include a leap day, which breaks pandas date arithmetic', false],
        ['364 removes the trend, while 365 would leave it inside the forecast', false],
        ['statsmodels only accepts seasonal periods divisible by seven days', false],
      ], 'With a strong weekly season the weekday matters more than the calendar date. 52 × 7 = 364 keeps the weekday aligned; 365 shifts it by one day.'),
      mcq('Across 12 origins the best baseline has mean MAE 61.6 with sd 11.9. A model scores MAE 85 in one month. What can be concluded?', [
        ['Nothing yet: it must be scored on the same 12 origins to compare', true],
        ['The model is worse, since 85 is well above the baseline mean of 61.6', false],
        ['The model is better, since every forecast beats a simple baseline', false],
        ['The baseline is unreliable, since its errors vary between origins', false],
      ], 'A single month can be much harder than average — June gave the same baseline 94.3. Comparisons must use the same windows, with the spread in view.'),
      mcq('Which baseline repeats the recent level for every future day but ignores the weekly shape?', [
        ['The 28-day moving average', true],
        ['The seasonal naive forecast', false],
        ['The 4-week seasonal mean', false],
        ['Same weekday last year', false],
      ], 'A flat moving average carries the level but forecasts the same number for a Tuesday and a Saturday. The other three are seasonal methods.'),
    ],
  },

  /* ── ETS_ARIMA ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_TIME_SERIES_ETS_ARIMA',
    notes: `Baselines either remember one week or average a few. Classical forecasting models do something more careful:
they keep a running estimate of the level, the trend and the seasonal pattern, and update each a little every day.
Two families dominate: **exponential smoothing** (ETS) and **ARIMA**. Both live in statsmodels.

## Simple exponential smoothing — the idea

Keep a level ℓ. Each day, move it part of the way towards the new observation:

    ℓ_t = α · y_t + (1 − α) · ℓ_(t−1)        forecast for every future day = ℓ_t

With α = 0.3, a level of 400 and two days of 430 and 380 orders: ℓ = 0.3 × 430 + 0.7 × 400 = 409, then
0.3 × 380 + 0.7 × 409 = 400.3. A small α gives a smooth, slow level; α near 1 is the naive forecast. The weights on
past days decay exponentially — hence the name.

## Holt-Winters: level + trend + season

Holt added a trend term; Winters added a seasonal term. Each has its own smoothing parameter, estimated by
maximising the likelihood:

    from statsmodels.tsa.holtwinters import ExponentialSmoothing

    s = make_orders().set_index("date")["orders"].asfreq("D").astype(float)
    H = 28; train, test = s.iloc[:-H], s.iloc[-H:]

    hw = ExponentialSmoothing(train, trend="add", damped_trend=True,
                              seasonal="mul", seasonal_periods=7).fit()
    hw.forecast(H).iloc[:7].round(1).tolist()
    # [412.8, 434.6, 458.6, 539.6, 598.1, 571.0, 424.5]      Tue 3 June .. Mon 9 June

                                              α       β      γ     φ     AICc      MAE    RMSE   bias
    additive trend, additive season         0.028   0.000  0.015   —   10407.7   86.5   114.6   25.4
    damped trend, multiplicative season     0.038   0.000  0.000  0.80 10394.3   85.7   112.1   29.0
    seasonal mean, last 4 weeks (baseline)    —       —      —     —       —      94.3   121.3   25.3

What the fitted parameters say is often more useful than the error. α ≈ 0.03 — the level is very stable, so the
model averages over roughly the last month; γ ≈ 0 — the weekly shape does not change; β = 0 and a damped trend
(φ = 0.8, the trend fades within a few days) — day-to-day growth is too small to estimate against the noise; the
level update absorbs it. Lower **AICc** (Akaike's information criterion, corrected for sample size) prefers the
multiplicative season, as the decomposition suggested.

Both models beat the June baseline (94.3) by about 9%. A **damped** trend is the safe default for anything you will
forecast more than a few steps ahead: an undamped trend extrapolates growth forever.

## ARIMA in three letters

**AR(p)**: today depends on the last p values. **I(d)**: difference d times to remove trend. **MA(q)**: today depends
on the last q forecast errors. The seasonal version, **SARIMA(p,d,q)(P,D,Q,m)**, adds the same three at the seasonal
lag m = 7. The model is fitted on the log of orders, so a multiplicative pattern becomes additive and the forecast
can never be negative.

    from statsmodels.tsa.statespace.sarimax import SARIMAX

    y = np.log(train)
    m = SARIMAX(y, order=(1, 1, 1), seasonal_order=(0, 1, 1, 7)).fit(disp=False)
    f = np.exp(m.forecast(H))

    order × seasonal_order          AIC     Ljung–Box p (lag 14)   MAE
    (1,1,1) × none               -388.8           0.000           111.5
    (1,0,0) × (1,0,0,7)          -191.3           0.000           100.8
    (0,1,1) × (0,1,1,7)          -986.2           0.017            84.8
    (1,1,1) × (0,1,1,7)          -985.9           0.051            84.8
    (2,1,1) × (0,1,1,7)          -988.0           0.204            85.0

Anything without seasonal differencing is far behind — the weekly pattern is the main signal. Among the seasonal
models the AICs and errors are almost identical, which is normal: the order matters much less than getting the
differencing and the season right. A \`ConvergenceWarning\` on some fits is routine here: check \`m.mle_retvals\`,
try other start values or a simpler model, and remember the warning alone is no reason to trust or distrust a model.

Choosing orders: difference until stationary (the basics unit: one regular and one weekly difference), then read
the ACF/PACF of the differenced series for small p and q, and compare a handful of candidates by AIC on the
**training** data. The \`pmdarima\` package's \`auto_arima\` automates this search; it is not part of statsmodels.

## Reading the coefficients

    m.summary().tables[1]
                 coef    std err        z      P>|z|
    ar.L1      0.0374      0.028    1.354      0.176
    ma.L1     -0.9714      0.008  -125.6      0.000
    ma.S.L7   -0.9980      0.043   -23.46     0.000
    sigma2     0.0254      0.001    18.75     0.000

The AR term is not significant: drop it, and (0,1,1)(0,1,1,7) is the classic "airline" model. Two MA coefficients
close to −1 are telling you something: a regular difference followed by MA(1) with θ ≈ −0.97 is the same as simple
exponential smoothing with α = 1 + θ ≈ 0.03 — the Holt-Winters α above. And a seasonal MA near −1 says the weekly
pattern is essentially fixed (γ ≈ 0 above). The two families have found the same structure.

## Residuals: the model's report card

If a model has captured the structure, what is left should look like noise: mean about zero, no autocorrelation,
roughly constant spread. The **Ljung–Box** test checks the autocorrelation part (null = no autocorrelation up to the
lag). A small p-value means there is structure left to model.

    from statsmodels.stats.diagnostic import acorr_ljungbox
    acorr_ljungbox(hw.resid, lags=[7, 14], return_df=True)
    # lag 7: p = 0.135    lag 14: p = 0.005      ← something left at two weeks

Residual checks do not replace a backtest; they tell you *what* is missing. Here that is the calendar.

## Adding what the calendar knows: SARIMAX

The X in SARIMAX is **exogenous regressors** — features known for the future. Festival dates and paydays are known
years ahead; tomorrow's rain is not.

    def exog(idx):
        X = pd.DataFrame(index=idx)
        for name, days in FESTIVALS.items():
            X[name] = idx.isin(pd.to_datetime(days)).astype(int)
        X["diwali_eve"] = idx.isin(pd.to_datetime(FESTIVALS["Diwali"]) - pd.Timedelta(days=1)).astype(int)
        X["payday"] = (idx.day <= 3).astype(int)
        return X

    mx = SARIMAX(y, exog=exog(train.index), order=(1, 1, 1), seasonal_order=(0, 1, 1, 7)).fit(disp=False)
    np.exp(mx.params[exog(train.index).columns]).round(3)
    # Diwali 0.561  Eid al-Fitr 1.345  Bakrid 1.403  Onam 0.894  Holi 0.783  New Year's Eve 1.572
    # diwali_eve 0.716  payday 1.063
    fx = np.exp(mx.forecast(H, exog=exog(test.index)))       # future exog must be supplied

                                              MAE    RMSE   bias    AIC
    SARIMA (1,1,1)(0,1,1,7)                  84.8   111.6   27.1   -985.9
    SARIMA (1,1,1)(0,1,1,7) + calendar        76.1   100.8   21.4  -1111.3

    Bakrid, 7 June: actual 859; plain SARIMA 595; with calendar 828

Because the model is in logs, each coefficient exponentiates to a multiplier: Diwali × 0.56, Bakrid × 1.40,
payday × 1.06 — close to how the data was generated. Ljung–Box on these residuals: p = 0.36 at lag 7 and 0.22 at
lag 14, nothing obvious left. The calendar cut June's MAE by another 10%, almost all of it on one day.

## Prediction intervals

State-space models give intervals directly:

    fr = mx.get_forecast(H, exog=exog(test.index))
    ci = np.exp(fr.conf_int(alpha=0.2))          # 80% interval, back-transformed
    # first day [356, 525] ... last day [350, 518];  20 of 28 actual days inside (71%)

They assume the model is right and the errors are normal; in practice they are usually too narrow — here 71% of
days fell inside an "80%" interval. The evaluation unit checks coverage properly.

## API changes worth knowing

- \`statsmodels.tsa.arima_model.ARIMA\` (old) was removed in 0.13; calling it raises \`NotImplementedError\` pointing
  to \`statsmodels.tsa.arima.model.ARIMA\` (note the dot) and \`SARIMAX\`. Old tutorials still use the removed one.
- \`ExponentialSmoothing\` lives in \`statsmodels.tsa.holtwinters\`; the state-space \`ETSModel\`
  (\`statsmodels.tsa.exponential_smoothing.ets\`) adds proper prediction intervals for ETS.
- Give statsmodels a series with a regular frequency (\`asfreq("D")\`), or forecasts lose their dates.`,
    mcqs: [
      mcq('A Holt-Winters fit reports α = 0.03 and γ = 0.00. What does that say about the kitchen’s orders?', [
        ['The level moves slowly and the weekly shape is essentially fixed', true],
        ['The level is very volatile and the weekly shape changes each week', false],
        ['The model failed to converge, so both parameters are meaningless', false],
        ['The series has no weekly pattern, so the season should be dropped', false],
      ], 'A small α averages over many past days; γ = 0 means the seasonal factors are never updated because they do not need to be. Both match the stable weekly rhythm in the data.'),
      mcq('In a SARIMAX fitted on log(orders), the Bakrid coefficient is 0.339. What does it mean?', [
        ['Bakrid multiplies the expected orders by about exp(0.339) ≈ 1.40', true],
        ['Bakrid adds about 0.339 orders to the forecast for that whole day', false],
        ['Bakrid raises the orders by 33.9 percentage points over the trend', false],
        ['Bakrid has a 33.9% chance of falling on the forecast day in question', false],
      ], 'With a log target, a coefficient b on a 0/1 feature multiplies the forecast by exp(b). exp(0.339) ≈ 1.40, close to the 1.35–1.41 seen in the data.'),
      mcq('Holt-Winters residuals give a Ljung–Box p-value of 0.005 at lag 14. What should be done next?', [
        ['Look for the structure left in the residuals, such as calendar effects', true],
        ['Accept the model, as a small p-value shows the residuals are white noise', false],
        ['Switch off the seasonal component, since it causes the autocorrelation', false],
        ['Difference the forecasts, since the residuals are what is non-stationary', false],
      ], 'Ljung–Box’s null is “no autocorrelation”. Rejecting it means the residuals still contain a pattern — here festivals and paydays, which SARIMAX with calendar regressors then captured.'),
    ],
    checkpoint: [
      mcq('With simple exponential smoothing, α = 0.2 and a current level of 500, a day of 450 orders arrives. What is the new level?', [
        ['490', true],
        ['460', false],
        ['475', false],
        ['500', false],
      ], 'ℓ = α·y + (1 − α)·ℓ = 0.2 × 450 + 0.8 × 500 = 90 + 400 = 490. 460 swaps the weights.'),
      mcq('Why must future values of every exogenous regressor be supplied when forecasting with SARIMAX?', [
        ['The forecast for each day uses the regressors’ values on that day', true],
        ['statsmodels re-estimates the model from them before each forecast', false],
        ['They are needed only to compute intervals, not the point forecast', false],
        ['They replace the seasonal terms, which are dropped when forecasting', false],
      ], 'A regression term needs its input on the forecast day. That is why only features known in advance — festivals, paydays, planned promotions — belong in exog; tomorrow’s actual rain does not.'),
      mcq('Which statement about the removed statsmodels.tsa.arima_model.ARIMA is correct?', [
        ['Calling it raises NotImplementedError; use statsmodels.tsa.arima.model.ARIMA', true],
        ['It still works but is slower than SARIMAX, so it is fine for small datasets', false],
        ['It was renamed to AutoARIMA and now chooses the model orders automatically', false],
        ['It was moved into scikit-learn, so it must be imported from sklearn instead', false],
      ], 'The old ARMA/ARIMA classes were removed in statsmodels 0.13 in favour of the state-space implementation in statsmodels.tsa.arima.model and SARIMAX. auto_arima belongs to pmdarima.'),
    ],
  },

  /* ── ML_FORECASTING ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_TIME_SERIES_ML_FORECASTING',
    notes: `ARIMA and Holt-Winters fit one model per series. A brand with six outlets — or a grocery app with 50,000
products — needs something else: **one** model that learns from all the series at once, with features for the
calendar, festivals and promotions. The trick is to turn forecasting into ordinary supervised learning: each row is
(series, day), the target is that day's orders, and the features are things known **before** the forecast was made.

## The data: six outlets

\`make_kitchen()\` extends the generator to the whole brand: four outlets in Bengaluru (one, Whitefield, opened in
March 2023 and took months to find customers), one in Hyderabad, where Eid and Bakrid are bigger, and one in
Kochi, where people eat at home on Onam and the monsoon lasts into October. 7,238 outlet-days.

    k = make_kitchen().sort_values(["outlet", "date"]).reset_index(drop=True)
    k.groupby("outlet").orders.mean().round(1)
    # Gachibowli 306.9  HSR Layout 271.4  Indiranagar 293.9  Kakkanad 204.8  Koramangala 403.7  Whitefield 210.0

## The one rule: a feature must be known at forecast time

The forecast is made at the end of 2 June for 3–30 June (horizon 1 to 28 days). For a single model serving every
horizon, a lag feature must be at least 28 days old — on 30 June, yesterday's orders do not exist yet.

    def add_features(df):
        df = df.copy()
        g = df.groupby("outlet")["orders"]                       # every lag within one outlet
        for L in [28, 35, 42, 49, 364]:
            df[f"lag_{L}"] = g.shift(L)
        df["roll_mean_28"] = g.transform(lambda x: x.shift(28).rolling(28).mean())   # shift first, then roll
        df["same_dow_mean"] = df[["lag_28", "lag_35", "lag_42", "lag_49"]].mean(axis=1)
        df["dow"] = df.date.dt.dayofweek
        df["dom"] = df.date.dt.day
        df["month"] = df.date.dt.month
        df["payday"] = (df.date.dt.day <= 3).astype(int)
        for name, days in FESTIVALS.items():                     # dates are known years ahead
            df["fest_" + name.split()[0].lower().replace("'", "")] = df.date.isin(pd.to_datetime(days)).astype(int)
        df["diwali_eve"] = df.date.isin(pd.to_datetime(FESTIVALS["Diwali"]) - pd.Timedelta(days=1)).astype(int)
        df["outlet"] = df.outlet.astype("category")
        df["city"] = df.city.astype("category")
        return df

    f = add_features(k)
    feats = [c for c in f.columns if c not in ("date", "orders", "rain")]
    CUT = pd.Timestamp("2025-06-02")
    tr = f[f.date <= CUT].dropna(subset=["roll_mean_28"])                         # 6,740 rows
    te = f[(f.date > CUT) & (f.date <= CUT + pd.Timedelta(days=28))]              # 168 rows = 6 outlets × 28 days

Three details carry most of the risk. \`groupby("outlet")\` before \`shift\` — otherwise the first rows of one outlet
get the last rows of another. \`shift(28)\` **before** \`rolling\` — otherwise the window includes the day being
predicted. And the \`rain\` column is excluded: it is recorded on the day, so in June you do not know July's.

## A global LightGBM model

    import lightgbm as lgb
    params = dict(n_estimators=600, learning_rate=0.03, num_leaves=31, min_child_samples=20,
                  subsample=0.8, subsample_freq=1, colsample_bytree=0.8, random_state=0, verbose=-1)

    m = lgb.LGBMRegressor(**params).fit(tr[feats], tr.orders / tr.roll_mean_28)   # target: ratio to recent level
    pred = m.predict(te[feats]) * te.roll_mean_28

                                                    MAE    WAPE    bias
    seasonal mean of last 4 weeks (per outlet)     58.6   16.2%    35.8
    LightGBM, target = orders                      56.8   15.7%    30.6
    LightGBM, target = log1p(orders)               58.0   16.0%    33.6
    LightGBM, target = orders / roll_mean_28       55.3   15.3%    27.9

**WAPE** (weighted absolute percentage error) = Σ|error| / Σ actual: total misses as a share of total orders. It
pools outlets fairly and never divides by a small day.

Why the ratio target: **trees cannot extrapolate**. A tree predicts averages of training targets, so it can never
forecast above the highest value it has seen. A two-line check: fit LightGBM on a straight line from 300 to 482
orders over two years and forecast the next month — it answers **479.7** every day, while a linear model continues
to 482.5 … 489.8. Dividing by the recent level turns "how many orders" into "how much busier than lately", a quantity
that does not grow with the business and is shared across big and small outlets. (Differencing or a log of the
ratio does the same job.)

## Rare events: what one festival flag can and cannot do

Bakrid, 7 June 2025 — every model above missed it badly:

    outlet        actual   baseline   LightGBM (ratio)
    Gachibowli       782        422          453
    Koramangala      863        557          610
    Whitefield       644        300          309

There are three Bakrids in the training data, so 17 outlet-day rows with \`fest_bakrid = 1\` (Whitefield missed
2022). With \`min_child_samples=20\`, LightGBM may not even make a leaf that small. Two fixes:

    min_child_samples=5                                 MAE 54.2   (Bakrid: 534, 691, 377 for the three above)
    + fest_uplift: historical ratio per festival×city   MAE 52.5   (Bakrid: 617, 695, 375)

The second feature is computed **from the training rows only**: for each festival and city, the mean of festival-day
orders divided by \`same_dow_mean\`. It hands the model the effect directly (Bakrid × 1.36 in Bengaluru, × 1.56 in
Hyderabad, Onam × 0.68 in Kochi but 0.96 in Bengaluru) instead of asking it to rediscover it from 17 rows. Domain
knowledge is the cheapest feature engineering there is.

    imp = m.booster_.feature_importance("gain")   # share of gain
    # dow 0.417  roll_mean_28 0.092  same_dow_mean 0.081  lag_364 0.065  dom 0.059  lag_35 0.053 ...

## Direct, recursive — and the shortcut that is cheating

Lags of 1–7 days are strong predictors for tomorrow. Three ways to use them for a 28-day horizon:

    model with lags 1–7, lags filled with ACTUALS in the test window          MAE 54.5   ← impossible in production
    same model, lags filled RECURSIVELY with its own forecasts                 MAE 55.1
    direct model, lags ≥ 28 only (above)                                       MAE 55.3

- **Recursive**: predict day 1, feed the prediction in as lag 1 for day 2, and so on. Errors compound with the
  horizon, and every forecast day needs a full feature rebuild.
- **Direct**: use only lags at least as old as the horizon — one model for all 28 days (as here), or one model per
  horizon band (1–7 days with lags ≥ 7, 8–14 with lags ≥ 14 …), which uses short lags where they are honest.
- **Filling lags with actuals** is what an evaluation does by accident when it builds features on the whole
  dataset and then scores days 2–28. The score describes a one-day-ahead forecast, not the 28-day one you will ship.

Here short lags barely help (day-to-day noise is mostly independent), so direct is simpler at no cost. On series
with momentum — a viral menu item, a UPI outage spreading over days — short lags matter more and a short-horizon
model is worth having.

## Two leaks that look like improvements

    + 7-day rolling mean that INCLUDES the forecast day (no shift)       MAE 50.0  (vs 56.8 for the same model without it)
    + the actual rain flag of the forecast day                            MAE 45.4  (vs 52.5)

Both look like solid gains, and both use information the kitchen will not have on 2 June. The rolling mean contains
one-seventh of the target. Rain is real signal — rainy evenings add 18% — but a 28-day-ahead forecast cannot know
it. The honest use of rain is a short-horizon update (tomorrow's weather forecast, for tomorrow's prep), or as a
scenario ("if the week is wet, add 6%").

## The whole recipe

1. One row per series per day, sorted, on a complete calendar (no silent gaps).
2. Lags and rolling statistics computed **within each series**, shifted by at least the horizon before rolling.
3. Calendar features that are known in advance: day of week, day of month, month, paydays, festivals (with a
   historical uplift where events are rare), planned promotions.
4. A scale-free target (ratio to recent level, or log differences) so trees need not extrapolate.
5. Validation that reproduces the real forecast moment — the next unit.`,
    workedExample: `**Goal: a colleague's new feature improved the six-outlet MAE from 56.8 to 50.0. Decide whether to ship it.**

**Step 1 — read the feature's code, not its score.**

    k["roll_7"] = k.groupby("outlet").orders.transform(lambda x: x.rolling(7).mean())

No \`shift\`. On 30 June this averages 24–30 June — six days that are in the future at forecast time (2 June) and
the target itself.

**Step 2 — ask the forecast-time question for every feature.** "At the end of 2 June, could I compute this for
30 June?" For \`lag_28\` yes (2 June). For \`roll_7\` no. For \`fest_bakrid\` yes (the calendar is published). For
\`rain\` no.

**Step 3 — rebuild it honestly and re-score.** \`x.shift(28).rolling(7).mean()\` is a legal version: the mean of the
seven days ending 28 days earlier. It adds little beyond \`roll_mean_28\` and \`same_dow_mean\`, which the model
already has.

**Step 4 — check the bias, too.** The leaky model's bias was +6.7 orders against +30.6 for the honest one: it
"knew" June was busy because June's orders were inside the feature. A suspiciously small bias on a month that
surprised every other method is a second clue.

**Step 5 — write it down.** "The 50.0 used the target day's own orders. With the feature built from data available
on 2 June, the gain disappears. Not shipped; added a unit test that every feature for date d uses only rows dated
d − 28 or earlier."

**Why it worked:** a leak cannot be found by looking at the score — a leak produces a better score. It is found by
asking, for each feature, when its value would actually be known.`,
    mcqs: [
      mcq('A single LightGBM model forecasts days 1 to 28 after the forecast date. What is the shortest lag it may use?', [
        ['28 days, so the value exists for even the furthest forecast day', true],
        ['1 day, because each forecast can use the actual from the day before', false],
        ['7 days, because the weekly season repeats every seven days of data', false],
        ['364 days, because only last year’s values are free of any leakage', false],
      ], 'On day 28 of the horizon the most recent known value is 28 days old. A shorter lag is either unavailable or must be filled recursively with forecasts.'),
      mcq('Why does the model predict orders divided by the 28-day rolling mean rather than raw orders?', [
        ['Trees cannot forecast above values seen in training, so a ratio removes growth', true],
        ['LightGBM requires a target between 0 and 1, which the ratio guarantees for it', false],
        ['The ratio removes the weekly season, which trees are unable to learn at all', false],
        ['Raw orders are integers, and gradient boosting needs a continuous target', false],
      ], 'A tree’s prediction is an average of training targets, so it caps at the past maximum — 479.7 on a line that kept rising. Relative to the recent level, a growing outlet looks like its past.'),
      mcq('Adding the actual rain flag of the forecast day cut MAE from 52.5 to 45.4. Why should it not be used in the 28-day forecast?', [
        ['Rain on a day four weeks ahead is not known when the forecast is made', true],
        ['Rain is a binary flag, and LightGBM cannot split on binary features well', false],
        ['Rain has no real effect on orders, so the improvement must be random noise', false],
        ['Rain is already in the month feature, so it counts the same effect twice', false],
      ], 'The feature is genuinely predictive — that is why the score improved — but its value is unavailable at forecast time. It belongs in a short-horizon update, not a four-week plan.'),
    ],
    checkpoint: [
      mcq('Lags are created with df["orders"].shift(7) on a table of six outlets stacked one after another. What goes wrong?', [
        ['The first rows of each outlet receive the last values of the previous outlet', true],
        ['The lag is computed in reverse, so it holds the values from a week ahead', false],
        ['pandas raises an error, because shift needs a DatetimeIndex to work at all', false],
        ['Nothing, since the table is sorted by date within each of the outlets', false],
      ], 'shift works on row order, not on outlet. Grouping first — df.groupby("outlet")["orders"].shift(7) — keeps each lag inside its own series; here 35 rows were wrong without it.'),
      mcq('What is the main drawback of the recursive strategy for a 28-day forecast?', [
        ['Errors in early forecasts feed into later ones as lag features', true],
        ['It needs a separate model for each of the twenty-eight days', false],
        ['It cannot use calendar features such as festivals or paydays', false],
        ['It can only be used with ARIMA models and not with LightGBM', false],
      ], 'Each predicted day becomes an input for the next, so mistakes compound with the horizon. The direct strategy avoids this by using only lags that are actually known.'),
      mcq('Bakrid appears on only 17 outlet-day rows in training and a LightGBM model ignores it. Which fix uses domain knowledge most directly?', [
        ['A feature holding each festival’s historical uplift, computed from training rows', true],
        ['Dropping all festival days from training so they cannot confuse the model', false],
        ['Raising min_child_samples so that rare festival rows get their own leaves', false],
        ['Adding more trees, so that the model eventually notices the festival rows', false],
      ], 'Rare events give trees too few rows to learn from. Passing the measured effect (Bakrid × 1.36 in Bengaluru, × 1.56 in Hyderabad) as a feature tells the model what the calendar already knows.'),
    ],
  },

  /* ── FORECAST_EVALUATION ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_TIME_SERIES_FORECAST_EVALUATION',
    notes: `Every number so far came from one forecast window — June 2025 — and June was unusual. This unit makes
evaluation honest: the right metric for the decision, a backtest over many windows, and intervals that say how
wrong the forecast may be.

## Point metrics, and what each one hides

| Metric | Formula | Good for | Trap |
|---|---|---|---|
| MAE | mean \\|e\\| | "orders off per day", in the business's unit | not comparable across outlets of different size |
| RMSE | √mean e² | punishing big misses | dominated by a few days (festivals) |
| MAPE | mean \\|e\\| / y | a percentage everyone understands | explodes on small days; undefined at zero |
| WAPE | Σ\\|e\\| / Σy | percentage for a group of series | hides which series is bad |
| MASE | MAE / in-sample seasonal-naive MAE | comparing across series; "beats the naive?" | less intuitive to non-analysts |
| bias | mean (actual − forecast) | systematic over- or under-forecasting | can be zero while errors are huge |

The regression topic showed MAPE's problem with small actuals. In a kitchen it is worse: a day the gas line failed
at 7 p.m. records 3 orders.

    actual   = [3, 420, 380, 510, 455]
    forecast = [310, 400, 395, 480, 470]
    # absolute % errors: 10233.3, 4.8, 3.9, 5.9, 3.3
    # MAPE = 2050.2%    MAPE without the outage day = 4.5%    WAPE = 21.9%

One broken day turns MAPE into nonsense. WAPE weights each day by its size, so the outage counts for what it is:
307 of the 387 missed orders, out of 1,768 — WAPE 21.9%. The real fix is upstream — mark closures and outages as such, and exclude them from
both training and scoring (a closed kitchen has no demand to forecast).

Bias deserves its own line in every report. A kitchen that under-forecasts runs out of biryani on Saturday night;
one that over-forecasts throws food away. The two have different costs, and a forecast with zero MAE improvement
can still be much better if it removes a bias.

## Rolling-origin backtesting

Pretend to be in the past, repeatedly. Choose several **forecast origins**; for each, train only on data up to the
origin, forecast the next 28 days, and score. Expanding the training window each time mimics retraining every month.

    last = pd.Timestamp("2025-06-02")
    origins = [last - pd.Timedelta(days=28 * i) for i in range(6, -1, -1)]   # 7 origins, Dec 2024 .. Jun 2025
    rows = []
    for o in origins:
        tr = f[f.date <= o].dropna(subset=["roll_mean_28"])
        te = f[(f.date > o) & (f.date <= o + pd.Timedelta(days=28))]
        upl = uplift_table(tr)                       # festival uplift from THIS training window only
        ...                                          # fit, predict; Holt-Winters per outlet; seasonal mean
        rows.append(...)
    bt = pd.concat(rows)                              # 1,176 rows = 7 origins × 6 outlets × 28 days

Everything computed from data — scalers, encodings, festival uplifts, the choice of hyperparameters — must be
recomputed inside the loop from that origin's training data. scikit-learn's \`TimeSeriesSplit\` produces the
same expanding-window folds for a single series; for many series stacked together, split on dates as above.

    method                                  MAE    WAPE    MASE    bias     WAPE by origin
    seasonal mean, last 4 weeks            43.9   13.4%    0.89    +9.2    12.6 11.8 12.7 13.5 13.2 13.1 16.2
    Holt-Winters per outlet (mult.)        39.9   12.1%    0.80    +7.9    10.8 10.8 11.9 13.0 11.1 11.8 14.9
    LightGBM global (ratio + uplift)       40.3   12.2%    0.82    +6.0    11.2 11.4 12.9 11.9 11.3 12.2 14.5

This is the honest picture, and it is humbling. On June alone the global LightGBM model beat the baseline clearly and
edged Holt-Winters; across seven windows it **ties** Holt-Winters (39.9 vs 40.3 MAE, each winning some origins). Both beat the
baseline by about 9%. The last column also shows June 2025 (the last origin) was the hardest month for every method.

Which would you deploy? Not "the one with the lowest number" — they are the same within noise. Holt-Winters is six
small models anyone can inspect; LightGBM is one model that handles new outlets, festivals and promotions in one
place, and will scale to sixty outlets. Here the deciding argument is what the kitchen plans next, not the third
digit of MAE.

Error by horizon is worth a glance too:

    MAE by forecast week (LightGBM):  week 1 38.7   week 2 38.2   week 3 43.6   week 4 40.5
    MAE by forecast week (baseline):  week 1 42.3   week 2 42.0   week 3 48.2   week 4 43.2

Flat-ish, as expected for a direct model whose inputs are all at least 28 days old. A model using short lags
would be much better in week 1 and converge towards these numbers later.

## Prediction intervals, and checking them

A staffing plan needs a range, not a point. Two practical ways:

**Quantile regression** — train LightGBM with \`objective="quantile"\` at α = 0.1 and α = 0.9 for an 80% interval:

    lo = lgb.LGBMRegressor(**params, objective="quantile", alpha=0.1).fit(tr[F], y).predict(te[F]) * te.roll_mean_28
    hi = lgb.LGBMRegressor(**params, objective="quantile", alpha=0.9).fit(tr[F], y).predict(te[F]) * te.roll_mean_28

    80% interval coverage over the backtest: 69.2%  (13.9% below, 16.9% above; mean width 100 orders)
    by origin: 0.71 0.75 0.68 0.68 0.70 0.71 0.61

**Empirical residual quantiles** — take the ratio actual / forecast from earlier backtest windows, and use its 10th
and 90th percentiles around each new forecast:

    q10, q90 = (bt.orders / bt.lgbm)[earlier_origins].quantile([0.1, 0.9])   # 0.816, 1.195
    coverage on the June origin: 68.5%

Both claim 80% and deliver about 69%. That is the usual finding, and the reason to **measure coverage on a
backtest** rather than trust the nominal level. Quantile models fitted on training data are overconfident — their
errors on the training rows are smaller than on new ones. Residual quantiles assume the future is as noisy as the
past, and June's monsoon was noisier than the winter months they came from. Fixes: widen the quantiles until
backtest coverage matches (a simple form of conformal prediction), or calibrate separately for monsoon and dry
months.

An interval that covers 69% when it says 80% is not useless — it is mislabelled. Report what it actually covers.

## From forecast to decision

The kitchen does not need the median; it needs to know how many associates to roster. If one associate handles 60
orders a day and costs ₹900, each order of spare capacity costs ₹15. A missed order (late delivery, cancellation,
lost rating) costs about ₹45 of margin. Staff to the quantile where the two balance — the **critical ratio**:

    q* = cost of under / (cost of under + cost of over) = 45 / (45 + 15) = 0.75

So roster for the 75th-percentile forecast, not the mean. Quantile forecasts (with coverage checked) make that
possible; a point forecast does not.

## A backtest report in five lines

"Seven monthly origins, Dec 2024 to Jun 2025, 28-day horizon, six outlets. LightGBM and Holt-Winters tie at WAPE
12.2% and 12.1%, against 13.4% for the seasonal mean. Bias is +6 orders a day (slight under-forecasting). The 80%
interval covers 69% — widen it until the backtest shows 80%, or label it a 70% interval. June was hardest for every method (monsoon,
Bakrid)."`,
    mcqs: [
      mcq('One outlet day records 3 orders because of a gas failure, and MAPE over five days jumps to 2,050%. What is the best response?', [
        ['Mark the outage as a closure and leave it out of training and scoring', true],
        ['Report MAPE as it is, since every error counts the same in percentages', false],
        ['Replace MAPE with RMSE, which is not affected by small actual values', false],
        ['Add the outage day to the forecast as a festival with a negative effect', false],
      ], 'A closed kitchen has no demand to forecast. Excluding known outages fixes the data; a weighted measure such as WAPE also stops one tiny day dominating the score.'),
      mcq('Over seven backtest origins, LightGBM scores MAE 40.3 and Holt-Winters 39.9, each winning some origins. What is the right reading?', [
        ['They are tied within noise, so the choice rests on other grounds', true],
        ['Holt-Winters is better and should be deployed for that reason alone', false],
        ['LightGBM is better, because it won the single June window clearly', false],
        ['The backtest failed, since one method should win every origin', false],
      ], 'A 0.4-order gap with origin-to-origin swings of several orders is not a difference. Maintenance, new outlets and how the method scales then decide.'),
      mcq('Missing an order costs ₹45 and an order of spare staff capacity costs ₹15. At which forecast quantile should staffing be set?', [
        ['The 75th percentile', true],
        ['The 25th percentile', false],
        ['The 50th percentile', false],
        ['The 90th percentile', false],
      ], 'The critical ratio is under-cost / (under-cost + over-cost) = 45 / 60 = 0.75. Under-staffing costs three times as much, so plan above the median.'),
    ],
    checkpoint: [
      mcq('An "80%" prediction interval contains the actual value on 69% of backtest days. What should be done?', [
        ['Widen it until backtest coverage reaches 80%, or report it as about 70%', true],
        ['Nothing, since 69% is close enough to 80% for a forecast of this kind', false],
        ['Narrow it, because more days outside means the interval is too wide', false],
        ['Discard intervals and report only the point forecast to the kitchen', false],
      ], 'Coverage below the nominal level means the interval is too narrow. Either recalibrate it on the backtest (a simple conformal step) or label it with the coverage it actually achieves.'),
      mcq('In a rolling-origin backtest, where must the festival uplift table be computed?', [
        ['Inside the loop, from each origin’s training data only', true],
        ['Once, from the full dataset, before the loop is started', false],
        ['From the test window of each origin, after forecasting', false],
        ['From the last origin only, then reused for every origin', false],
      ], 'Anything learned from data is part of the model. Computing it once on all data lets later festivals inform earlier forecasts — a leak the backtest is meant to rule out.'),
      mcq('Three outlets have actuals 400, 250 and 20 with forecasts 380, 270 and 40. What is the WAPE?', [
        ['About 9.0%', true],
        ['About 37.7%', false],
        ['About 20.0%', false],
        ['About 6.0%', false],
      ], 'WAPE = Σ|error| / Σactual = (20 + 20 + 20) / 670 ≈ 9.0%. 37.7% is MAPE, dragged up by the 100% error on the 20-order outlet.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_TIME_SERIES_DEBUGGING',
    notes: `Forecasting code fails quietly. Most bugs do not crash; they produce a forecast that looks plausible and is
built on the wrong days. Eight faults from the cloud-kitchen notebooks — symptom, cause, fix.

## 1. "Last week" that is not last week

**Symptom:** a seasonal-naive forecast is oddly poor around a few dates; a Saturday is forecast like a Friday.
**Cause:** the export skipped days (a reporting outage, a closed kitchen with no rows). \`s.shift(7)\` moves by seven
*rows*, not seven days. With 12 dates missing from 1,277, **79 rows (6.2%)** of \`shift(7)\` pointed to the wrong day.
**Fix:** put the series on a complete calendar first — \`s.asfreq("D")\` (12 NaNs appear, and you decide how to fill
them) — or shift by time: \`s.shift(7, freq="D")\` aligned back on the index.

## 2. Lags that cross from one outlet to the next

**Symptom:** the first week of Whitefield's history has lag values in the hundreds — before Whitefield had sold
anything.
**Cause:** \`df["orders"].shift(7)\` on a table of outlets stacked one after another. The first seven rows of each
outlet took the last seven of the outlet above it: **35 wrong rows** across six outlets.
**Fix:** \`df.groupby("outlet")["orders"].shift(7)\`, and the same for every rolling feature
(\`groupby(...).transform(lambda x: x.shift(28).rolling(28).mean())\`).

## 3. The feature that contains the answer

**Symptom:** a new "7-day rolling mean" feature improves MAE from 56.8 to **50.0** and nearly removes the bias.
**Cause:** \`rolling(7).mean()\` without a shift includes the day being predicted (and, at a 28-day horizon, six other
future days).
**Fix:** shift by at least the horizon before rolling. Test it: for any date d, every feature must be computable from
rows dated d − 28 or earlier.

## 4. A random split on time data

**Symptom:** a model with lags 1–7 scores MAE **40.7** with \`train_test_split\`; on the last 20% of dates, the same
model scores **43.7** — and that is still a one-day-ahead score.
**Cause:** shuffled rows put days from the "future" into training, and a test day's neighbours (the day before and
after, which share its weather and its week) into training.
**Fix:** split by date. Train on everything up to a cut-off, test on what follows; use rolling origins for anything
you report.

## 5. Holt-Winters refuses the series

**Symptom:**

    ValueError: endog must be strictly positive when usingmultiplicative trend or seasonal components.

(The missing space is in statsmodels' own message.)
**Cause:** a day with 0 orders — the kitchen was shut for a refit — in a multiplicative model.
**Fix:** a zero here is not demand. Mark closure days, set them to NaN and fill them (for example with the seasonal
mean) for fitting, and exclude them when scoring. Do not add 1 to everything to make the error go away; the model
would then learn a kitchen that sells one order on refit days.

## 6. statsmodels and the missing frequency

**Symptom:** at fit time, \`ValueWarning: A date index has been provided, but it has no associated frequency
information and so will be ignored when e.g., forecasting.\` Then \`forecast()\` fails with
\`ValueError: No supported index is available.\` (statsmodels 0.15; in 0.14 it returned forecasts numbered 0, 1, 2 …
with a FutureWarning instead of dates.)
**Cause:** the index has gaps, so pandas cannot infer a daily frequency.
**Fix:** \`asfreq("D")\` and deal with the NaNs; with a complete daily index statsmodels infers the frequency (and
says so with a milder warning), or set it explicitly.

## 7. Midnight in the wrong time zone

**Symptom:** after a data-platform migration, Friday orders rise and Saturday orders fall; the weekday factors shift
by several points.
**Cause:** order timestamps are now stored in UTC and the daily table groups by the UTC date. India is UTC+5:30, so
an order at 00:40 IST on Saturday is 19:10 UTC on Friday. Every order from midnight to 5:30 a.m. — a cloud kitchen's
late-night trade — lands on the previous day.
**Fix:** convert before grouping: \`ts.dt.tz_convert("Asia/Kolkata").dt.date\`. Better still, define the business day
explicitly (many kitchens count until 4 a.m.).

## 8. The forecast that stops growing

**Symptom:** a LightGBM model on raw orders forecasts Whitefield — growing 30% a year — almost flat, and the forecast
sits under the actuals month after month.
**Cause:** trees predict averages of training targets, so they cannot go above the highest value seen. On a straight
line from 300 to 482 orders, LightGBM forecasts **479.7** for every future day.
**Fix:** model a scale-free target — orders divided by the recent level, or a log difference — and multiply back;
or use a linear or statistical model for the trend and trees for the rest.

## The order of checks when a forecast looks wrong

1. Is the calendar complete and in the right time zone? (\`asfreq\`, duplicates, closures marked.)
2. Is every lag and rolling feature computed within its series and shifted by at least the horizon?
3. Is the split by time, with everything learned from data recomputed per origin?
4. Can the model express the trend (ratio or differenced target)?
5. Are zeros real demand, or closures and outages?`,
    mcqs: [
      mcq('A daily series has 12 missing dates. What does s.shift(7) return on the rows after a gap?', [
        ['The value seven rows back, which is no longer seven days back', true],
        ['NaN, because pandas detects the gap and refuses to shift over it', false],
        ['The value seven days back, since shift always works on calendar time', false],
        ['An error, since shift needs a frequency to be set on the index first', false],
      ], 'shift(n) moves by rows. After a gap, seven rows span more than seven days, so “last week” becomes the wrong weekday. asfreq("D") restores the calendar first.'),
      mcq('After moving to a new data platform, the Friday share of orders rises and Saturday’s falls. What is the most likely cause?', [
        ['Orders are now grouped by UTC date, moving late-night orders a day back', true],
        ['Customers changed their habits on the same day as the platform migration', false],
        ['The new platform drops Saturday orders above a size limit it has set', false],
        ['The forecasting model was retrained, which shifted the weekday factors', false],
      ], 'IST is UTC+5:30, so orders from midnight to 5:30 a.m. land on the previous UTC date. Converting to Asia/Kolkata before grouping restores the business day.'),
      mcq('ExponentialSmoothing with seasonal="mul" fails with “endog must be strictly positive”. The series has zeros on 14 refit days. What is the right fix?', [
        ['Mark the refit days as closures, fill them for fitting and skip them in scoring', true],
        ['Add one to every value so the series is positive, then fit the model again', false],
        ['Switch to an additive season, which accepts the zeros and needs no other change', false],
        ['Drop the outlet from the forecast, since its history is too damaged to use', false],
      ], 'The zeros are not demand. Treating them as missing keeps the model from learning fake low days; adding one or switching models hides the problem instead of fixing it.'),
      mcq('A LightGBM model with lags 1–7 scores MAE 40.7 on a shuffled split and 43.7 on the last 20% of dates. Which number is closer to reality, and why?', [
        ['43.7, since a time split keeps future days out of the training data', true],
        ['40.7, since a shuffled split tests the model on a wider range of days', false],
        ['Neither, as MAE cannot be used to compare two different splits at all', false],
        ['Both equally, since the same model and features were used in each case', false],
      ], 'Shuffling lets training rows from later dates — and a test day’s neighbours — inform the model. A time split reproduces the real situation, though with lags 1–7 it is still only a one-day-ahead score.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_TIME_SERIES_PRACTICE',
    notes: `Six exercises. Work each on paper or in a notebook before reading the answer.

## Exercise 1 — Two baselines by hand

Last week (Monday to Sunday) the HSR Layout outlet sold 410, 395, 420, 445, 520, 590 and 560 orders. This week it
sold 430, 380, 455, 440, 560, 610 and 530. Compute the MAE of (a) the seasonal-naive forecast and (b) the naive
forecast (last value, 560, repeated).

**Answer.** (a) Absolute errors 20, 15, 35, 5, 40, 20, 30 → 165 / 7 = **23.6 orders**. (b) 130, 180, 105, 120, 0, 50,
30 → 615 / 7 = **87.9 orders**. Ignoring the week makes the error almost four times bigger.

## Exercise 2 — Exponential smoothing by hand

Simple exponential smoothing with α = 0.3 starts at a level of 400. The next two days bring 430 and 380 orders.
What is the forecast for the day after?

**Answer.** ℓ₁ = 0.3 × 430 + 0.7 × 400 = **409**. ℓ₂ = 0.3 × 380 + 0.7 × 409 = 114 + 286.3 = **400.3**. The forecast for
every future day is the latest level, **400.3**.

## Exercise 3 — Reading MASE

Outlet A's model has a test MAE of 45 orders; the in-sample MAE of repeating last week was 60. Outlet B's model has
MAE 30; its seasonal-naive in-sample MAE was 25. Which model is doing its job?

**Answer.** A: 45 / 60 = **0.75** — better than repeating last week. B: 30 / 25 = **1.2** — worse than the naive
benchmark, despite the smaller MAE. B is a quieter outlet; MAE alone would have ranked the outlets backwards.

## Exercise 4 — MAPE versus WAPE

On one day, three outlets have actuals 400, 250 and 20 (Whitefield's first week) and forecasts 380, 270 and 40.
Compute MAPE and WAPE.

**Answer.** Absolute errors are 20 each. Percentage errors 5%, 8% and 100% → MAPE = **37.7%**. WAPE = 60 / 670 =
**9.0%**. The same 20-order miss counts 20 times more at the tiny outlet under MAPE.

## Exercise 5 — Which features are legal?

The forecast is made at the end of 2 June for every day from 3 to 30 June, with one model for all horizons. For a
row dated 20 June, say whether each feature is allowed: (a) orders on 13 June; (b) orders on 23 May; (c) the mean of
orders over the 28 days ending 23 May; (d) a flag for Bakrid on 7 June; (e) whether it rained on 20 June; (f) a
discount campaign the marketing team scheduled in May for 18–22 June.

**Answer.** (a) **No** — 13 June is after the forecast date. (b) **Yes** — 28 days back from 20 June is 23 May, before
2 June. (c) **Yes**, for the same reason. (d) **Yes** — festival dates are published in advance (though for a row
dated 20 June a Bakrid flag is 0). (e) **No** — not known on 2 June. (f) **Yes** — a planned promotion is known in
advance; record the plan, not what actually ran.

## Exercise 6 — Is the interval honest?

An 80% interval was reported for each of 28 days; the actual value fell inside on 19 days. Is that bad luck or a
mis-calibrated interval?

**Answer.** Expected inside: 0.8 × 28 = **22.4**. 19 of 28 is **67.9%**. If the interval really covered 80%, the chance
of 19 or fewer days inside is about **9%** (binomial, n = 28, p = 0.8). One month is weak evidence on its own; the same
shortfall across a seven-origin backtest (69% of 1,176 days) is conclusive — the interval is too narrow.`,
    mcqs: [
      mcq('In Exercise 1, what is the MAE of the seasonal-naive forecast for the week?', [
        ['About 23.6 orders', true],
        ['About 87.9 orders', false],
        ['About 16.5 orders', false],
        ['About 33.0 orders', false],
      ], 'The absolute errors against last week’s same days are 20, 15, 35, 5, 40, 20 and 30, summing to 165; 165 / 7 ≈ 23.6. 87.9 is the naive forecast’s MAE.'),
      mcq('In Exercise 2, what is the forecast after the two days of 430 and 380 orders?', [
        ['400.3', true],
        ['409.0', false],
        ['405.0', false],
        ['380.0', false],
      ], 'The level moves to 409 after the first day and to 0.3 × 380 + 0.7 × 409 = 400.3 after the second. 405 is just the mean of the two days.'),
      mcq('In Exercise 3, outlet B’s model has MAE 30 and an in-sample seasonal-naive MAE of 25. What is its MASE, and what does it mean?', [
        ['1.2 — worse than simply repeating the previous week', true],
        ['0.83 — better than simply repeating the previous week', false],
        ['1.2 — better than outlet A, which has the larger MAE', false],
        ['30 — the MASE equals the MAE for a single outlet', false],
      ], 'MASE = 30 / 25 = 1.2. Above 1 means a larger error than the seasonal-naive benchmark achieved, whatever the raw MAE looks like next to another outlet.'),
      mcq('In Exercise 5, a forecast made on 2 June for 20 June wants a feature for orders on 13 June. Why is it not allowed?', [
        ['13 June is after the forecast date, so its orders are not yet known', true],
        ['13 June falls in a different week, so it cannot describe the target day', false],
        ['Lags must be multiples of seven, and seven days is too short a lag', false],
        ['Only rolling means may be used as features, never single past days', false],
      ], 'Every feature must be computable on 2 June. For a single model covering 28 days that means lags of at least 28 days; 13 June is in the future at forecast time.'),
      mcq('In Exercise 6, 19 of 28 days fall inside an 80% interval. What does the binomial calculation show?', [
        ['A true 80% interval gives 19 or fewer about 9% of the time', true],
        ['A true 80% interval can never give fewer than 22 days inside', false],
        ['The interval is too wide, since it should contain fewer days', false],
        ['The result proves the interval is wrong, at the 1% level', false],
      ], 'P(X ≤ 19) for n = 28, p = 0.8 is about 0.09 — unusual but possible in one month. Across a long backtest, the same 69% coverage is decisive.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_TIME_SERIES_INTERVIEW_QUESTION',
    notes: `Forecasting questions come up at quick-commerce and food-delivery companies, retailers, power utilities,
fintechs (UPI volumes, cash at ATMs) and supply-chain analytics firms. The interviewer checks three things: that you
respect time (no leakage, honest validation), that you start simple, and that you connect the forecast to a
decision.

## 1. "How would you forecast daily orders for each of our 400 dark stores for the next four weeks?"

**Model answer.** "First the decision: is this for staffing, inventory or both, and at what level — store-day,
store-hour, store-SKU? That sets the horizon and the metric. Say store-day, 28 days, for staffing.

Then baselines: the mean of each weekday over the last four weeks per store, and same week last year where there is
history. I'd backtest them over several monthly origins to set the bar.

For the model, with 400 related series I'd build one global gradient-boosted model rather than 400 ARIMAs: rows are
store-days, features are lags at least 28 days old, rolling means shifted by the horizon, day of week, paydays,
festivals with their historical uplift by city, planned promotions, and store attributes. The target would be
relative to the store's recent level so trees don't need to extrapolate growth, and new stores borrow strength from
similar ones. I'd compare it with per-store Holt-Winters on the same rolling-origin backtest — WAPE, MASE and bias
— and add quantile forecasts, because staffing should follow a cost-based quantile, not the mean."

**Follow-ups:**
- *"What about stores that opened last month?"* A global model with store attributes and the ratio target handles
  them; or forecast them from a similar store's shape scaled to their level, and switch when history builds up.
- *"Hourly instead?"* Then there is a daily season within the weekly one — hour-of-day × day-of-week features, or
  forecast the day and split it with recent hourly profiles.

## 2. "Diwali is on a different date every year. How do you handle it?"

**Model answer.** "A fixed lag like 'same day last year' misses it, so the festival has to be a calendar feature: a
flag for the day, plus flags for the days around it if behaviour changes before and after — for food delivery the
eve and the day itself drop, and sweets or gifting categories rise in the week before. Festival dates are published
years ahead, so these features are legal for any horizon.

With only three or four Diwalis in the history, the model sees very few rows, so I'd give it the measured effect —
the historical ratio of festival days to the same weekday nearby, by city — as a feature, and pool across stores.
Effects differ by region: Onam matters in Kerala, Eid more in Hyderabad, Durga Puja in Kolkata. Then I'd check
festival days separately in the backtest, because an average error over a month hides a 40% miss on the one day
operations cares about."

**Follow-ups:**
- *"What if a festival falls on a weekend?"* The weekday and festival effects combine — a log or ratio target makes
  them multiply naturally, which is usually right.
- *"A new festival campaign this year?"* Planned promotions go in as known future features; with no history, use
  last year's comparable campaign or an explicit uplift assumption, and say so.

## 3. "When would you use ARIMA instead of gradient boosting?"

**Model answer.** "ARIMA and exponential smoothing are strong when there are few series, each with a long clean
history and stable patterns — monthly electricity demand for a state, a company's total UPI volume. They're fast,
give intervals, and their parameters are readable: an exponential-smoothing α of 0.03 says the level is stable.

Gradient boosting wins when there are many related series, many external drivers — promotions, prices, festivals,
weather — and enough data to learn interactions. It needs more care: features shifted by the horizon, a target that
handles trend, and intervals from quantile models or backtest residuals.

In practice I'd run both on the same rolling-origin backtest. In one project with six outlets they tied — 12.1% vs
12.2% WAPE — and the choice came down to maintenance and the plan to grow to more outlets, not accuracy."

**Follow-ups:**
- *"What is stationarity and why does ARIMA need it?"* Constant mean, variance and autocorrelation over time; the
  AR and MA parts model a stable correlation structure, so trend and season are removed by differencing first, and
  ADF/KPSS tests check the result.
- *"How do you choose p, d, q?"* d from tests and plots; p and q from the ACF/PACF of the differenced series and AIC
  among a few candidates; then residual checks with Ljung–Box and, above all, the backtest.

## How to answer forecasting questions well

Start with the decision and the horizon. Name a baseline before a model. Say how you would validate, by time. End
with uncertainty and the decision the forecast feeds.`,
    mcqs: [
      mcq('An interviewer asks how to forecast 400 dark stores. Which opening shows the strongest judgement?', [
        ['Clarify the decision and horizon, set backtested baselines, then build a global model', true],
        ['Fit an auto-ARIMA to each of the 400 stores, since it chooses all of the orders itself', false],
        ['Train an LSTM on all stores together, since deep learning beats every other approach', false],
        ['Average the last year of orders for each store and use that number as the forecast', false],
      ], 'The decision fixes the horizon and metric, baselines set the bar, and a global model suits many related series. Jumping to a named algorithm skips the parts interviewers probe.'),
      mcq('Why is a historical festival uplift feature useful for Diwali in a gradient-boosted forecast?', [
        ['With only a few Diwalis in history, the trees see too few rows to learn the effect', true],
        ['Diwali falls on the same date each year, so the uplift is identical every time', false],
        ['Gradient boosting cannot use binary flags, so the festival must become a number', false],
        ['The uplift feature removes the need for a time-based validation of the model', false],
      ], 'Rare events give trees almost no rows. A measured effect, pooled across stores and years, hands the model what three or four occurrences cannot teach it.'),
      mcq('Which situation favours exponential smoothing or ARIMA over a global gradient-boosted model?', [
        ['A few long, clean series with stable patterns and few external drivers', true],
        ['Thousands of related series with promotions, prices and festival effects', false],
        ['Many new stores with short histories that must borrow from similar stores', false],
        ['A rich table of external features whose interactions drive the demand', false],
      ], 'Per-series statistical models shine on long, stable histories. Many series, short histories and many drivers are where a global model learns what single-series models cannot.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_TIME_SERIES_MINI_PROJECT',
    notes: `# Mini Project — Forecasting Daily Orders for a Cloud Kitchen

"Biryani Junction" runs six delivery-only kitchens: four in Bengaluru (Koramangala, HSR Layout, Indiranagar and
Whitefield, which opened in September 2024), one in Gachibowli, Hyderabad, and one in Kakkanad, Kochi. Every
Thursday the operations head rosters kitchen associates and orders rice, meat and packaging for the next four weeks.
Today that plan comes from "last month plus a bit". You will build the forecast behind it: **daily orders for each
outlet for 1–28 July 2025**, with a range, and a staffing recommendation.

## The data

Generate it with this script (seed fixed). It contains **deliberate traps**; finding them is part of the project.

    import numpy as np
    import pandas as pd

    rng = np.random.default_rng(2025)
    FEST = {  # festival: (dates, effect on orders)
        "Diwali": (["2022-10-24", "2023-11-12", "2024-10-31"], 0.60),
        "Eid al-Fitr": (["2022-05-03", "2023-04-22", "2024-04-11", "2025-03-31"], 1.45),
        "Bakrid": (["2022-07-10", "2023-06-29", "2024-06-17", "2025-06-07"], 1.35),
        "Onam": (["2022-09-08", "2023-08-29", "2024-09-15"], 0.90),
        "New Year's Eve": (["2022-12-31", "2023-12-31", "2024-12-31"], 1.50),
    }
    OUTLETS = {"Koramangala": (310, 0.14, "2022-01-01"), "HSR Layout": (230, 0.10, "2022-01-01"),
               "Indiranagar": (270, 0.04, "2022-01-01"), "Gachibowli": (250, 0.12, "2022-01-01"),
               "Kakkanad": (170, 0.11, "2022-01-01"), "Whitefield": (140, 0.30, "2024-09-01")}
    rows = []
    for outlet, (base, growth, opened) in OUTLETS.items():
        d = pd.date_range(opened, "2025-06-30", freq="D")
        n = len(d)
        level = base * (1 + growth) ** (np.arange(n) / 365.25) * (1 - 0.5 * np.exp(-np.arange(n) / 45) if outlet == "Whitefield" else 1)
        mult = np.array([0.88, 0.85, 0.90, 0.95, 1.12, 1.22, 1.18])[d.dayofweek] * np.where(d.day <= 3, 1.06, 1.0)
        mult *= np.where(d.month.isin([6, 7, 8, 9]) & (rng.random(n) < 0.35), 1.18, 1.0)            # rainy evenings
        mult *= np.where((d >= "2025-03-10") & (d <= "2025-03-23"), 1.40, 1.0)                     # app-wide 40%-off campaign
        for name, (days, eff) in FEST.items():
            e = eff * (1.25 if outlet == "Gachibowli" and name in ("Eid al-Fitr", "Bakrid") else 1)
            e = 0.65 if (outlet == "Kakkanad" and name == "Onam") else e
            mult *= np.where(d.isin(pd.to_datetime(days)), e, 1.0)
        orders = rng.poisson(level * mult * rng.gamma(50, 1 / 50, n))
        if outlet == "HSR Layout":                                     # kitchen shut for a fire-safety refit
            orders[(d >= "2024-08-05") & (d <= "2024-08-18")] = 0
        rows.append(pd.DataFrame({"date": d, "outlet": outlet, "orders": orders}))
    df = pd.concat(rows, ignore_index=True)
    df = df.drop(df[(df.outlet == "Indiranagar") & df.date.between("2023-07-03", "2023-07-09")].index)  # export gap
    df = df.drop(df.sample(25, random_state=4).index)                                                     # scattered missing days
    df = pd.concat([df, df[df.date.between("2025-01-13", "2025-01-15")]])                                 # an export re-run
    df = df.sample(frac=1, random_state=5).reset_index(drop=True)
    df["date"] = df.date.dt.strftime("%d-%m-%Y")
    df.to_csv("kitchen_orders.csv", index=False)

The file has 6,674 rows and three columns: \`date\` (DD-MM-YYYY text), \`outlet\`, \`orders\`. Treat the generator as
the kitchen's history; you would not have its code in real life, so every trap must be found **from the data**.

**What the operations team can tell you:** festival dates are on the company calendar (Muharram on 6 July 2025 has
never mattered for orders); the app ran a 40%-off campaign from 10 to 23 March 2025 and none is planned for July;
HSR Layout was closed for two weeks in August 2024; one associate handles about **60 orders a day** at a cost of
**₹900** a day; a missed or badly late order costs about **₹45** of margin and rating.

## Tasks

1. **Load and audit.** Parse dates explicitly (\`format="%d-%m-%Y"\`), sort, and find: duplicate rows, missing
   dates per outlet (a scattered few and one whole week), the closure recorded as zeros, the promotion spike, and
   the new outlet's short history. For each, state your treatment and why.
2. **Explore.** Per outlet: trend, weekly factors, the monsoon lift, festival effects by city (Hyderabad's Eid,
   Kochi's Onam). One decomposition (STL or classical) for one outlet, read in words.
3. **Baselines.** Seasonal naive and the 4-week seasonal mean per outlet, on a rolling-origin backtest: at least six
   origins, 28 days apart, ending with the origin 2 June 2025.
4. **A seasonal model.** Holt-Winters (multiplicative season, damped trend) or SARIMA(X) with calendar regressors,
   per outlet, on the same backtest. Report the fitted parameters for one outlet and what they mean; check residuals.
5. **A gradient-boosted model.** One LightGBM model across outlets: lags of at least 28 days computed within each
   outlet, rolling means shifted before rolling, calendar and festival features (with a historical uplift computed
   from each origin's training data), a promotion flag, a scale-free target. Same backtest.
6. **Compare honestly.** MAE, WAPE, MASE and bias per method — overall, by outlet and by origin — plus the error on
   festival days. Say whether the differences exceed the origin-to-origin spread.
7. **Intervals.** 80% intervals for your chosen method (quantile models or backtest residuals); report their actual
   backtest coverage and recalibrate if needed.
8. **Forecast and staff.** Refit on all data to 30 June and forecast 1–28 July for every outlet. Compute the critical
   ratio from the costs above, take that quantile of the forecast, and convert it to associates per outlet per day
   (rounded up). Compare the total roster with "last month plus 10%".

## Deliverables

1. **\`kitchen_forecast.ipynb\`** — runs top to bottom after "Restart & Run All".
2. **\`july_forecast.csv\`** — outlet, date, forecast, lower and upper 80% bounds, recommended associates.
3. **\`ops_note.pdf\`** (or .docx), **one page** for the operations head: the forecast for July in a chart, the staffing
   plan, how accurate the method has been (in orders a day and %), its range, and when not to trust it.
4. **\`README.md\`** — how to run it; library versions (pandas, NumPy, statsmodels, LightGBM).

## Acceptance criteria

- Dates parsed with an explicit format; the 18 duplicate rows removed; every outlet put on a complete daily calendar
  with the missing days counted and handled.
- The 14 HSR Layout zeros treated as a closure — excluded from training targets and from scoring, not forecast as
  demand; the March promotion flagged as a feature or excluded, with the choice explained.
- Whitefield's short history handled deliberately (it cannot have a 364-day lag; say what the model uses instead).
- Every lag and rolling feature computed within its outlet and shifted by at least 28 days; no feature uses
  information after the forecast origin, including the festival uplift.
- At least six rolling origins; baselines, the seasonal model and LightGBM compared on the same windows with spread.
- Interval coverage measured on the backtest and reported honestly.
- Staffing set at the critical-ratio quantile (0.75), converted to associates, and compared with the current rule.
- The note is readable by someone who has never heard of MAE.`,
    mcqs: [
      mcq('HSR Layout shows 14 consecutive days of zero orders in August 2024, when the kitchen was shut for a refit. How should they be treated?', [
        ['As a closure: excluded from training targets and scoring, not as demand', true],
        ['As genuine demand, since the model should learn that orders can drop to zero', false],
        ['As outliers to be replaced with the outlet’s overall mean before modelling', false],
        ['As a reason to drop HSR Layout from the forecast and the staffing plan', false],
      ], 'A closed kitchen had no chance to sell, so the zeros carry no information about demand. Treating them as demand drags the level down and breaks multiplicative models.'),
      mcq('Using the project’s costs — ₹45 per missed order and ₹900 per associate handling 60 orders — at which quantile should staffing be planned?', [
        ['The 75th percentile of the forecast', true],
        ['The 50th percentile of the forecast', false],
        ['The 95th percentile of the forecast', false],
        ['The 25th percentile of the forecast', false],
      ], 'Spare capacity costs ₹900 / 60 = ₹15 per order. The critical ratio is 45 / (45 + 15) = 0.75, so the plan sits above the median because shortages cost three times as much.'),
    ],
    assignment: {
      title: 'Forecasting Daily Orders for a Cloud Kitchen',
      description: 'Forecast the next 28 days of orders for each outlet of a cloud-kitchen brand: audit the history for gaps, duplicates, closures and promotions; compare baselines, a seasonal model and a gradient-boosted model with lag and festival features on a rolling-origin backtest; produce calibrated prediction intervals; and turn the forecast into a staffing plan.',
      instructions: `Complete the project described in this unit's brief and submit a repository link or a zip.

**Submit:**

1. \`kitchen_forecast.ipynb\` — generates the data with the brief's script, then: the audit (duplicates, missing
   days, the closure, the promotion, the new outlet) with each treatment stated; exploration with one decomposition
   read in words; baselines, a seasonal model and one LightGBM model across outlets on a rolling-origin backtest of
   at least six origins; the comparison with spread, by outlet and on festival days; 80% intervals with measured
   coverage; the July forecast and the staffing plan at the critical-ratio quantile. It must run top to bottom after
   "Restart & Run All".
2. \`july_forecast.csv\` — outlet, date, forecast, lower and upper bounds, associates.
3. \`ops_note.pdf\` or \`.docx\`, one page — the plan first, then accuracy, range and limits.
4. \`README.md\` — how to run it and the library versions.

**Before you submit,** go through the acceptance criteria in the brief and note each result at the end of the
notebook (for example: "Duplicates removed: 18; missing days per outlet: …").`,
      rubric: [
        { criterion: 'Data audit and preparation', description: 'Dates parsed explicitly; duplicates removed; each outlet on a complete calendar with missing days counted and handled; the closure treated as missing, not demand; the promotion and the new outlet handled with stated reasons.', maxPoints: 25 },
        { criterion: 'Leak-free features and models', description: 'Baselines, a seasonal model with readable parameters and residual checks, and a global LightGBM model whose lags and rolling features are computed within outlet and shifted by at least the horizon; festival uplift and anything else learned from data recomputed per origin; a scale-free target.', maxPoints: 25 },
        { criterion: 'Honest evaluation', description: 'A rolling-origin backtest with at least six origins used for every method; MAE, WAPE, MASE and bias reported overall, by outlet and by origin; festival days examined; differences judged against the spread; interval coverage measured and recalibrated if needed.', maxPoints: 30 },
        { criterion: 'Decision and communication', description: 'July forecast with bounds; staffing at the critical-ratio quantile converted to associates and compared with the current rule; a one-page note a non-analyst can act on, including when not to trust the forecast; README and versions included.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_TIME_SERIES_CHECKPOINT',
    notes: `Ten questions across the topic: trend, seasonality and stationarity, baselines, exponential smoothing and
ARIMA, forecasting with machine learning, and honest evaluation. Several give numbers — work them out before looking
at the options.`,
    checkpoint: [
      mcq('A daily series has an ACF of 0.61 at lag 7 and peaks again at 14, 21 and 28. What is the most likely structure?', [
        ['A weekly seasonal pattern', true],
        ['A monthly seasonal pattern', false],
        ['A series of independent days', false],
        ['A single structural break', false],
      ], 'Repeated autocorrelation peaks at multiples of 7 days are the signature of a weekly season. Independent days would give an ACF near zero at every lag.'),
      mcq('A kitchen’s Saturday surplus grows from 80 to 110 orders as average daily orders rise from 330 to 450. Which decomposition fits best?', [
        ['Multiplicative, since the surplus stays a roughly fixed share of the level', true],
        ['Additive, since the surplus is measured in orders and not as a percentage', false],
        ['Neither, since a changing surplus means the series has no seasonality at all', false],
        ['Additive on the differences, since the surplus is growing every single year', false],
      ], '80 / 330 ≈ 24% and 110 / 450 ≈ 24%: the swing scales with the level. That is a multiplicative season, or an additive one on the log scale.'),
      mcq('Which baseline would you expect to do worst on a daily series with a strong weekly pattern and steady growth?', [
        ['The mean of the full history', true],
        ['The seasonal naive forecast', false],
        ['The 4-week seasonal mean', false],
        ['The same weekday 52 weeks ago', false],
      ], 'The long-run mean ignores both the weekly pattern and the growth, so it is biased low and flat. In the Koramangala example it scored MASE 2.06, the worst of all.'),
      mcq('In SARIMA(1,1,1)(0,1,1,7) fitted to a daily series, what does the seasonal part (0,1,1,7) do?', [
        ['Differences at lag 7 and adds one seasonal MA term at lag 7', true],
        ['Adds one autoregressive term at each lag from one up to seven', false],
        ['Differences seven times so the series has no trend remaining', false],
        ['Fits a seven-day moving average and forecasts it as a constant', false],
      ], 'The seasonal order (P, D, Q, m) = (0, 1, 1, 7) means one seasonal difference (y_t − y_(t−7)) and one MA term on the error seven days back, with no seasonal AR term.'),
      mcq('An ARIMA(0,1,1) fit gives an MA coefficient of −0.97. Which simpler model is it equivalent to?', [
        ['Simple exponential smoothing with α ≈ 0.03', true],
        ['The naive forecast that repeats the last day', false],
        ['Simple exponential smoothing with α ≈ 0.97', false],
        ['A linear trend fitted by ordinary least squares', false],
      ], 'ARIMA(0,1,1) is simple exponential smoothing with α = 1 + θ. With θ = −0.97, α ≈ 0.03: a slow, stable level, matching the Holt-Winters fit.'),
      mcq('A colleague builds roll_7 = df.groupby("outlet").orders.transform(lambda x: x.rolling(7).mean()) as a feature for a 28-day forecast. What is wrong?', [
        ['It includes the target day and the days just before it, which are not yet known', true],
        ['It mixes outlets together, because transform ignores the grouping it is given', false],
        ['It is too short a window to capture the weekly season, so it adds no signal', false],
        ['Nothing — rolling means are always safe, since they smooth over the noise', false],
      ], 'A trailing window ending on the target day contains the target itself. It must be shifted by at least the horizon — x.shift(28).rolling(7).mean() — before it is legal.'),
      mcq('A LightGBM model trained on raw daily orders of a fast-growing outlet forecasts a flat line under the actuals. What is the cause?', [
        ['Trees predict averages of seen targets, so they cannot rise above the past maximum', true],
        ['The learning rate is too high, so the model overshoots and then settles back down', false],
        ['LightGBM ignores date features, so it has no way of knowing that time has passed', false],
        ['The model is underfitting because it has too few trees to follow the growth trend', false],
      ], 'A tree’s leaves hold averages of training targets, so its forecast is capped by history. A ratio or differenced target, or a trend model, fixes this.'),
      mcq('Why are several forecast origins used in a backtest instead of one test window?', [
        ['One window can be unusually easy or hard, and several show the spread', true],
        ['statsmodels requires at least six origins before it will produce a forecast', false],
        ['Several origins let the test data be used for training, which raises accuracy', false],
        ['A single window would leak information that several windows do not contain', false],
      ], 'June 2025 gave the best baseline MAE 94 against 62 on average. Several origins show how much scores move by chance, and whether one method’s lead is real.'),
      mcq('Missing an order costs ₹80 of margin, and each order of spare staff capacity costs ₹20. What is the critical ratio for staffing?', [
        ['0.80', true],
        ['0.25', false],
        ['0.20', false],
        ['0.75', false],
      ], 'Critical ratio = under-cost / (under-cost + over-cost) = 80 / 100 = 0.80. Plan staff at the 80th percentile of the forecast. 0.25 is the over/under ratio.'),
      mcq('A forecast has a lower MAE than the old method but a bias of −40 orders a day. What does the negative bias mean for the kitchen?', [
        ['It over-forecasts on average, so food and staff will be wasted', true],
        ['It under-forecasts on average, so the kitchen will run short', false],
        ['It is unbiased, since a negative bias cancels positive errors', false],
        ['Bias is not relevant once the MAE of a model has improved', false],
      ], 'Bias here is actual − forecast; −40 means forecasts are 40 orders above actuals on average. Over-forecasting has a cost — waste — that MAE alone does not reveal.'),
    ],
  },
];
