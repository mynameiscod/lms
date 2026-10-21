/**
 * Career-track content: the Capstone (DS_CAPSTONE), for Data Science + AI (batch S4).
 *
 * The capstone ties the track together: SQL and pandas to build an honest training table, statistics for every
 * comparison, scikit-learn pipelines with a time-based split, a baseline and two or three model families,
 * interpretation and error analysis, then the deployment topic's tools — a saved pipeline, a validated FastAPI
 * endpoint, a Streamlit demo, MLflow runs and a monitoring plan — and one GenAI feature whose value is measured,
 * not asserted. Nothing is re-taught; each unit points back to where the track taught it.
 *
 * Three options, one standard. Option A (recommended) is an NBFC's two-wheeler loans with a seeded generator:
 * 24,180 rows with known problems (duplicates, a -1 sentinel, annual income typed into a monthly field, a leaked
 * post-disbursal column, a mix shift from July 2024) and field officers' notes in English and Hinglish for the
 * GenAI feature. Every number quoted for Option A — default rates, PR-AUCs, the bootstrap interval, decline-share
 * values, calibration, PSI, MLflow comparison, the FastAPI TestClient responses and the skops untrusted-type list —
 * was produced by running the code with scikit-learn 1.9, pandas 3.0, FastAPI 0.156, MLflow 3.17 and skops 0.16.
 * The note fields in those runs were extracted with a regular-expression baseline (the generated notes are
 * templated); an LLM extractor is shown as a vendor-neutral sketch with the key read from the environment, and no
 * LLM output is shown as if run. Streamlit and Docker are named, not run.
 *
 * Attribution: the topic is multi-skill [ML_EVALUATION, MODEL_DEPLOYMENT, DL_TRANSFORMERS] with ML_EVALUATION as
 * the default; BUILD_DEPLOY_AI declares MODEL_DEPLOYMENT and DL_TRANSFORMERS. Every checkpoint question names the
 * skill it measures with ck().
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const EV = 'ML_EVALUATION';
const DEP = 'MODEL_DEPLOYMENT';
const TR = 'DL_TRANSFORMERS';

export const TRACK_DS_CAPSTONE_BUNDLES: PilotBundle[] = [
  /* ── BRIEF ─────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_CAPSTONE_BRIEF',
    notes: `**This is the project every data-science interviewer will ask you about.** One prediction problem, taken from
raw data to a model a business could actually use: an honest training table built with SQL and pandas, a baseline
and two or three model families compared on a split that imitates the future, interpretation and error analysis, the
model saved, served behind an API with a demo, tracked in MLflow and given a monitoring plan — and **one GenAI
feature whose value you have measured**. Then ten minutes in front of a panel and twenty minutes of "how do you
know?". Nothing here is new; it is the whole track, used together.

## Three options, one standard

| | **Option A — Sarathi Finance (data provided)** | **Option B — a hospital network** | **Option C — an agritech** |
|---|---|---|---|
| Business | An NBFC lending for two-wheelers in Telangana, Andhra Pradesh, Karnataka and Tamil Nadu | Outpatient clinics across a city | Seeds and fertiliser sold to farmers on credit, repaid at harvest |
| Decision the model supports | Approve an application, or refer it to a credit manager | Which booked appointments get a reminder call | Which farmers get credit, and how much |
| Target | Early default: two or more EMIs missed in the first 6 months | No-show for appointments booked 2+ days ahead | Not repaid within 60 days of harvest |
| The cost that matters | ₹40,000 lost per default vs ₹9,000 earned per good loan | A wasted doctor slot vs the cost of a call | Credit written off vs a farmer's lost season |
| GenAI feature to measure | Structured fields extracted from field officers' notes | Visit reason (free text) mapped to department and urgency | Call-centre transcripts classified by issue |
| The hard question you will face | "You only have outcomes for loans you approved" | "Is the model penalising patients who live far away?" | "Your labels depend on the monsoon — how will it hold up next year?" |

All three are graded on the same rubric. **Option A is recommended**: the data is generated below, it contains the
problems a data scientist meets at work, and the questions are agreed. Choose B or C only if you are aiming at that
industry and can describe the decision from the user's side. For B or C, bring a public dataset or write a generator,
meeting all of these:

- At least 10,000 rows covering at least 12 months, with a date on every row (you will split by time).
- A target with a business cost you can state in rupees, and the date on which it becomes known.
- A free-text column with at least 1,000 rows for the GenAI feature.
- No real personal data — no real names, phone numbers, Aadhaar or account numbers, no real patient records.

## The Option A data

Sarathi Finance funds commuter bikes, scooters, premium bikes and EVs. Each application has the applicant's details,
the bureau score (or none, for a first-time borrower), the loan terms and a field officer's verification note. Run
this once (seed fixed; about 24,000 rows, under a minute):

    import numpy as np
    import pandas as pd

    rng = np.random.default_rng(2611)
    n = 24_000

    app_date = pd.to_datetime("2023-01-01") + pd.to_timedelta(rng.integers(0, 731, n), unit="D")
    state = rng.choice(["Telangana", "Andhra Pradesh", "Karnataka", "Tamil Nadu"], n, p=[0.30, 0.25, 0.25, 0.20])
    gig_share = np.where(app_date >= "2024-07-01", 0.30, 0.12)          # delivery-platform tie-up from July 2024
    u = rng.random(n)
    employment = np.where(u < gig_share, "gig", np.where(u < gig_share + 0.38, "self_employed", "salaried"))
    age = rng.integers(21, 56, n)
    income = np.round(np.where(employment == "salaried", rng.lognormal(10.2, 0.35, n),
                      rng.lognormal(10.0, 0.45, n)), -2)
    ntc = rng.random(n) < 0.22                                             # new to credit: no bureau score
    bureau = np.where(ntc, -1, np.clip(rng.normal(715, 55, n), 300, 900).round())
    existing_emi = np.where(rng.random(n) < 0.45, np.round(rng.uniform(1500, 12000, n), -2), 0)
    segment = rng.choice(["commuter", "scooter", "premium", "EV"], n, p=[0.45, 0.30, 0.15, 0.10])
    price = {"commuter": 85_000, "scooter": 95_000, "premium": 1_60_000, "EV": 1_30_000}
    down_pct = np.round(rng.uniform(0.10, 0.35, n), 2)
    loan_amount = np.round(np.array([price[s] for s in segment]) * rng.uniform(0.9, 1.15, n) * (1 - down_pct), -2)
    tenure = rng.choice([12, 18, 24, 36], n, p=[0.15, 0.25, 0.40, 0.20])
    r = 0.18 / 12
    emi = np.round(loan_amount * r * (1 + r) ** tenure / ((1 + r) ** tenure - 1))
    foir = (existing_emi + emi) / income

    house = rng.choice(["owned", "rented", "family"], n, p=[0.35, 0.40, 0.25])
    years_job = rng.choice([0, 1, 2, 4, 7, 12], n, p=[0.12, 0.18, 0.20, 0.20, 0.18, 0.12])
    co_app = rng.random(n) < 0.30

    z = (-3.0 + np.where(ntc, 0.45, -0.012 * (bureau - 715)) + np.where(employment == "gig", 0.55, 0)
         + np.where(employment == "self_employed", 0.2, 0) + 2.2 * (foir - 0.35) - 2.0 * (down_pct - 0.2)
         - 0.55 * (house == "owned") + 0.25 * (house == "rented") - 0.45 * co_app + 0.45 * (years_job == 0)
         - 0.015 * (age - 35))
    default = (rng.random(n) < 1 / (1 + np.exp(-z))).astype(int)

    occ = {"gig": ["delivery partner with Swiggy", "Zomato delivery partner", "Rapido rider", "delivery boy for Zepto"],
           "self_employed": ["runs a kirana shop", "tailoring shop owner", "mobile repair shop", "sells vegetables at the market"],
           "salaried": ["works as a security guard", "staff nurse at a private hospital", "sales executive in a showroom", "machine operator in a factory"]}
    home = {"owned": ["own house", "house in his own name", "apna ghar hai"], "rented": ["stays on rent", "rented room", "kiraye ka ghar"],
            "family": ["lives with parents", "joint family house", "stays with brother's family"]}
    notes = []
    for i in range(n):
        if rng.random() < 0.05:
            notes.append(""); continue
        yrs = "less than a year" if years_job[i] == 0 else f"{years_job[i]} yrs"
        parts = [f"Applicant {rng.choice(occ[employment[i]])}, {yrs}.", f"{str(rng.choice(home[house[i]])).capitalize()}."]
        if co_app[i]:
            parts.append(str(rng.choice(["Wife also earning, co-applicant.", "Co-applicant: spouse, salaried.", "Biwi bhi kaam karti hai, co-applicant hai."])))
        if rng.random() < 0.3:
            parts.append(str(rng.choice(["Neighbour confirmed address.", "Office visit done.", "Customer polite, documents ok."])))
        rng.shuffle(parts)
        notes.append(" ".join(parts))

    bounces = np.where(default == 1, rng.choice([1, 2, 3], n, p=[0.3, 0.4, 0.3]), rng.choice([0, 1], n, p=[0.93, 0.07]))
    loans = pd.DataFrame({
        "loan_id": [f"SF{i:06d}" for i in range(1, n + 1)], "app_date": app_date.date, "state": state,
        "age": age, "employment_type": employment, "monthly_income": income, "bureau_score": bureau.astype(int),
        "existing_emi": existing_emi, "vehicle_segment": segment, "loan_amount": loan_amount,
        "down_payment_pct": down_pct, "tenure_months": tenure, "emi": emi, "officer_note": notes,
        "emi_bounces_first_3": bounces, "defaulted_6m": default,
    })
    annual = rng.random(n) < 0.01
    loans.loc[annual, "monthly_income"] *= 12                              # annual income typed into the monthly field
    loans = pd.concat([loans, loans.sample(180, random_state=5)], ignore_index=True)   # duplicated rows
    loans = loans.sort_values("app_date", kind="stable").reset_index(drop=True)
    loans.to_csv("sarathi_loans.csv", index=False)
    print(f"{len(loans):,} rows, default rate {loans.defaulted_6m.mean():.1%}")

Output:

    24,180 rows, default rate 7.3%

| Column | Meaning | Known at application? |
|---|---|---|
| loan_id, app_date, state | The loan, the date the application was made, the branch's state | Yes |
| age, employment_type, monthly_income, existing_emi | The applicant (employment: salaried, self_employed, gig) | Yes |
| bureau_score | 300–900, or **-1** when the applicant has no credit history | Yes |
| vehicle_segment, loan_amount, down_payment_pct, tenure_months, emi | The loan terms (18% a year, reducing balance) | Yes |
| officer_note | The field officer's verification note, English and Hinglish; blank for some | Yes — written before the decision |
| emi_bounces_first_3 | EMI bounces in the first three months | **No** |
| defaulted_6m | 1 = two or more EMIs missed in the first six months | No — this is the target |

The script shows how the data was made, but your findings must come from the data. Like real data, it contains
problems a careful data scientist catches before training anything — find them in the build. One is visible in the
table already: a column that is only known **after** the loan is disbursed can never be a feature, however much it
improves the score.

## What the GenAI feature must be

The officer notes hold information the form does not: whether the applicant owns the house, how long they have held
the job, whether a spouse earns too. A feature "earns its place" only if you can show two numbers:

1. **Extraction accuracy** — field by field, against notes you hand-labelled **before** looking at any model output.
2. **Model lift** — the same model with and without the extracted fields, on the same time-based validation set,
   with an interval on the difference (a paired bootstrap).

If simple rules extract the fields as well as an LLM on your hand-labelled sample, use the rules: they are free,
fast and predictable, and saying so is a strong answer, not a weak one. An LLM that writes approval decisions,
predicts default directly, or does arithmetic the code should do is not a GenAI feature — it is a liability.

## Write the plan: PLAN.md, one page

1. **The decision and the user** — who acts on the score, and what they do differently.
2. **The target** — exactly how it is defined and the date it becomes known; the point in time at which you score.
3. **Data checks** before any modelling — duplicates, sentinels, unit errors, leaked columns, missing text, the
   default rate by month.
4. **The split** — by date: train on the oldest data, validate on the next block, test once on the most recent.
5. **The metric** — PR-AUC and calibration for ranking and probability quality, and the ₹ value at the cutoff for the
   decision; the baseline every model must beat.
6. **Models** — two or three families, all as scikit-learn pipelines.
7. **The GenAI feature** — what is extracted, how accuracy and lift are measured, what text leaves the system.
8. **Deployment** — the API's input schema, the demo, MLflow, the monitoring plan, the fallback when anything fails.
9. **Risks, Not doing, and milestones.**

## Milestones (about four weeks part-time)

| Milestone | Done when |
|---|---|
| M1 — Data checked, baseline set | Every data problem found and decided; the time split fixed; a baseline scored |
| M2 — Models compared | Two or three families on validation, logged in MLflow; one chosen with reasons |
| M3 — Interpreted | Calibration, importance, error analysis by segment, a fairness check; test scored **once** |
| M4 — Served | The saved pipeline behind FastAPI with tests; a Streamlit demo calling it |
| M5 — GenAI measured | Hand labels; extraction accuracy; lift with an interval; cost and failure handling |
| M6 — Ready to defend | Model card, monitoring plan, Dockerfile, ten-minute talk rehearsed three times |

**Scope rule:** if PLAN.md does not fit on one page, something must move to "Not doing". Deep learning on a table of
24,000 rows is a "Not doing" unless you can show it beats the pipeline; it usually does not.`,
    workedExample: `**A filled-in PLAN.md for Option A (abridged).**

**Decision and user.** A Sarathi branch credit officer submits an application; the model returns P(early default)
and a band. *Approve* goes through; *refer* sends it to the regional credit manager. The model never rejects anyone
by itself.

**Target.** defaulted_6m = two or more EMIs missed in the first six months. It is known six months after
disbursal, so the newest usable labels are always six months old. We score at application, so every feature must
exist on the application date.

**Data checks (first pass already done).** 24,180 rows, of which 180 are exact duplicates. bureau_score = -1 for
22% (new to credit): a sentinel, not a score — the raw mean of the column is 557.5 against 715.1 for applicants who
have a score. About 1% of incomes look annual (120 rows above ₹3 lakh a month). officer_note is blank for 5.1%.
emi_bounces_first_3 is recorded after disbursal: **excluded**.

**Split.** Train: applications to 31 March 2024 (14,901 after de-duplication, 6.8% default). Validation: April–June
2024 (2,975, 7.1%). Test: July–December 2024 (6,124, 8.5%) — scored once, at the end.

**Metric.** PR-AUC (no-skill level = the default rate, about 7%), calibration by quintile, and the decision value:
₹9,000 per good loan approved, −₹40,000 per default approved, at decline shares of 0%, 5%, 10% and 20%.
**Baseline:** logistic regression on bureau score and the new-to-credit flag alone.

**Models.** Logistic regression (scaled, one-hot) and HistGradientBoosting, both as pipelines; a random forest only if
time allows.

**GenAI feature.** Extract house_owned, co_applicant and new_job (under a year in the job) from officer_note.
Hand-label 200 random notes first; field-level accuracy for rules and for the LLM; model PR-AUC with and without the
fields, paired bootstrap 95% interval. Only the note text and loan_id leave the system, through the approved account;
names and phone numbers are masked first.

**Deployment.** FastAPI /score with a Pydantic schema (allowed values for state, employment and segment); the pipeline
saved with skops; a Streamlit demo for credit managers; every run in MLflow; monitoring of input drift and score
distribution monthly, labels at six months; if the API fails, the application goes to manual review.

**Risks.** (1) Outcomes exist only for approved loans, so the model has never seen how rejected applicants behave — say
so, and do not claim the model is valid for them. (2) The mix of applicants may change; check the test period's mix
against training before trusting any number.

**Not doing:** neural networks on the table, loan pricing, collections scoring.`,
    mcqs: [
      mcq('A student adds emi_bounces_first_3 to the Sarathi features and validation PR-AUC jumps from 0.26 to 0.96. What should the plan say about this column?', [
        ['Exclude it: it is recorded after disbursal and cannot exist when the model scores', true],
        ['Keep it, because a large gain in PR-AUC is the main aim of the capstone build phase', false],
        ['Keep it but scale it first, since unscaled counts can dominate a logistic regression', false],
        ['Replace it with its square root so that the model does not lean on it quite so much', false],
      ], 'At application nobody has paid an EMI yet, so the column is unavailable at scoring time. A jump that large is the signature of leakage, not of a better model.'),
      mcq('Why does the Option A plan split the loans by application date instead of drawing a random 20% for validation?', [
        ['The model will score future applicants, and a date split shows how it holds up as the mix changes', true],
        ['A random split would put the same loan in both sets, because the CSV contains repeated loan IDs', false],
        ['scikit-learn cannot stratify a random split when the positive class is as rare as 7% of the rows', false],
        ['Date splits always give higher validation scores, which makes the comparison with the baseline easier', false],
      ], 'Deployment means scoring applications that arrive later. From July 2024 the share of gig workers more than doubles; only a time-based split lets validation and test see that kind of change.'),
      mcq('Which use of an LLM belongs in the Option A plan as the GenAI feature?', [
        ['Extracting house ownership, co-applicant and job tenure from officer notes, measured on hand labels', true],
        ['Reading each application row and stating whether the applicant will default within six months', false],
        ['Writing the final approve or reject decision for each loan so that credit managers save time', false],
        ['Computing each applicant\'s FOIR and EMI from the loan terms, so the formulas stay in one prompt', false],
      ], 'Turning free text into structured fields is a task language models do well, and both its accuracy and its lift on the model can be measured. Predictions, decisions and arithmetic belong to the model and the code.'),
    ],
    checkpoint: [
      ck(EV, 'Sarathi\'s finance team says a good loan earns about ₹9,000 and a default loses about ₹40,000. How should the capstone choose the share of applications to refer?', [
        ['Compute the net ₹ value on validation at several decline shares and pick the best', true],
        ['Refer every application whose predicted probability of default is above 0.5', false],
        ['Pick the decline share at which recall on defaulters first reaches 90% or more', false],
        ['Refer the same share as the default rate, so the two numbers match each other', false],
      ], 'The decision is economic, so evaluate it in rupees: on this data, referring the riskiest 10% gave the highest value. A 0.5 cutoff ignores the 4-to-1 cost ratio, and a recall target ignores the good customers lost.'),
      ck(DEP, 'The branch app will call the capstone model for every application. Which detail belongs in the plan\'s deployment section?', [
        ['The input schema with allowed values, and what happens to an application if the model is down', true],
        ['The full list of hyperparameters tried during the search, so the API can re-tune at request time', false],
        ['A copy of the training CSV inside the container, so the API can retrain the model on every call', false],
        ['The validation PR-AUC, which the API returns with every prediction as a sign of confidence', false],
      ], 'A deployed model needs a contract (fields, types, allowed values) and a fallback. Tuning and retraining are offline jobs; a global validation score says nothing about one application.'),
      ck(TR, 'How should the capstone show that the officer-note extraction is worth keeping?', [
        ['Field accuracy on notes hand-labelled first, and PR-AUC with and without the fields with an interval', true],
        ['A sample of twenty extracted notes that look correct when the student reads them through by eye', false],
        ['The LLM\'s own confidence score for each field, averaged over every note in the full dataset', false],
        ['The number of notes the LLM processed without an error, divided by the total number of notes', false],
      ], 'Two measurements answer the two questions: is the extraction right, and does it improve the decision? Self-reported confidence and an eyeball check measure neither.'),
    ],
  },

  /* ── BUILD_MODEL ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_CAPSTONE_BUILD_MODEL',
    notes: `# Capstone Build — The Model

Deliver the model your PLAN.md describes: an honest training table, a baseline, two or three model families compared
on a time-based split, a choice you can justify, interpretation, error analysis and a fairness check — with the test
set touched once. Deployment and the GenAI feature come in the next unit; this one produces the pipeline they will
ship. (Requirements are written for Option A; for B or C, apply each one to your data.)

## Requirements

**1. Data checks** — \`01_data_checks.ipynb\`. Before any model, list every data problem as **what, how many, what
you did, and the effect**. At minimum: exact duplicates; the bureau-score sentinel (turn -1 into missing and add a
new-to-credit flag — S1's missing-value lessons); incomes that look annual (decide a rule, count the rows, record
it); blank notes; the default rate by month and by employment type; and every column checked for "known at
application?". Exclude emi_bounces_first_3 and show, once, what including it would do — a model scoring a PR-AUC of
0.96 on validation is the clearest leakage demonstration you will ever have.

**2. The split** — train to 31 March 2024, validate April–June 2024, test July–December 2024. Fix it in code, print
the sizes and default rates, and do not move it after seeing results.

**3. Features** — FOIR = (existing EMI + new EMI) ÷ monthly income; the new-to-credit flag; for now, the three note
fields from a simple rules extractor (the next unit replaces or confirms it). Every transformation lives **inside** a
scikit-learn pipeline (ColumnTransformer: impute, scale, one-hot with handle_unknown="ignore"), so the same code runs
in training and in the API.

**4. Baseline, then models** — \`02_models.ipynb\`. The baseline is logistic regression on bureau score and the
new-to-credit flag. Then at least two families (logistic regression on all features; HistGradientBoosting; optionally
a random forest), tuned on the training data with time-ordered cross-validation (TimeSeriesSplit), compared on
validation. Log every run in MLflow (parameters, the split dates, the data seed, metrics).

The reference run on this data, for orientation — your numbers should be close if your cleaning matches:

    model                        ROC-AUC  PR-AUC  Brier   (validation, Apr–Jun 2024, 7.1% default)
    baseline bureau + ntc         0.621    0.113
    LR tabular                    0.754    0.243   0.0604
    LR tabular + notes            0.760    0.264   0.0595
    HGB tabular                   0.744    0.241   0.0606
    HGB tabular + notes           0.752    0.253   0.0601

Gradient boosting does not win here: the generating process is close to additive in the log-odds, which is exactly
the case where a well-specified logistic regression is hard to beat. Say that, rather than reaching for the fancier
model.

**5. Is the difference real?** A paired bootstrap on the validation set (resample rows, recompute both PR-AUCs,
2,000 times). For the note fields on this data: **+0.021, 95% interval −0.002 to +0.042** — probably a small gain,
not established. Report it that way.

**6. The decision** — the net value of declining the riskiest share, from finance's figures:

    decline share   defaults caught   good loans declined   net value (₹, validation)
    0%              0 of 212          0                     1,63,87,000
    5%              53 (25%)          96                    1,76,43,000
    10%             85 (40%)          213                   1,78,70,000
    20%             111 (52%)         484                   1,64,71,000

For a calibrated model, approving pays while 9,000 × (1 − p) > 40,000 × p, that is while p < 0.184 — a check on the
table above.

**7. Interpret and analyse errors** — \`03_interpretation.ipynb\`. Calibration by quintile (on validation, mean
predicted 0.183 vs actual 0.187 in the top fifth); permutation importance on validation; coefficients or SHAP for
the chosen model; error analysis by employment type, state and new-to-credit. A **fairness check**: referral rates and
calibration by group, and a statement of which attributes are not used and which features could act as proxies.

**8. Test once.** Only after the choice is made: the chosen pipeline's test PR-AUC and the test-period default rate
against the mean prediction. On this data the test default rate is 8.5% while the model predicts 7.6% on average —
the share of gig applicants rose from 12% to 31%. Explain what that means for deployment.

**9. MODEL_CARD.md** — intended use, the data and its period, the metrics with intervals, the cutoff and its value,
known limits (outcomes only for approved loans, the mix shift), and what the model must not be used for.

## Acceptance criteria

- Notebooks run top to bottom after "Restart & Run All"; the generator seed and library versions are in the README.
- Every data problem is listed with a count and a decision; the leaked column is excluded and its effect shown.
- The split is by date and was not changed after results; the test set was scored once.
- A baseline, at least two families, MLflow runs for each, and a paired-bootstrap interval for the key comparison.
- The cutoff is chosen from rupee values; calibration, importance, segment errors and a fairness check are reported.
- MODEL_CARD.md states intended use, limits and the mix shift honestly.`,
    mcqs: [
      mcq('In the Sarathi data, 120 rows have a monthly income above ₹3 lakh, most of them about twelve times a typical value. What should the data-checks notebook do?', [
        ['State a rule for treating them as annual figures, apply it, and report the count and its effect', true],
        ['Leave them in place, because tree models are not affected by large values in a numeric column', false],
        ['Drop every row with an income above the 99th percentile, without recording which ones were dropped', false],
        ['Replace them with the column mean, so that the overall average income is not pulled up by them', false],
      ], 'They look like annual income typed into a monthly field, which also distorts FOIR. A written rule, a count and its effect make the decision reviewable; silent drops or mean-filling hide it.'),
      mcq('Adding the note fields raises validation PR-AUC from 0.243 to 0.264, and a paired bootstrap gives a 95% interval of −0.002 to +0.042 for the gain. How should the report describe it?', [
        ['A probable small gain that the validation data cannot yet establish, kept if it is cheap to run', true],
        ['A significant improvement of 8.6%, since 0.264 is higher than 0.243 on the same validation rows', false],
        ['No effect at all, since the interval contains zero and the fields should be removed from the build', false],
        ['A gain that will be at least 0.042 on the test set, since the upper end of the interval is 0.042', false],
      ], 'The interval is mostly above zero but includes it: the honest reading is "probably helps a little, not proven". It neither proves a gain nor shows there is none.'),
    ],
    assignment: {
      title: 'Capstone: The Model',
      description: 'Build an honest training table, compare a baseline and at least two model families on a time-based split, choose a cutoff from rupee values, interpret the model, analyse its errors and fairness, test it once, and write the model card.',
      instructions: `Build the model described in this unit's notes for the option you chose in the Brief. Submit a repository link
or a zip.

**Submit:**

1. \`PLAN.md\` — the one-page plan, updated if the build changed it (say what changed and why).
2. \`01_data_checks.ipynb\` — every data problem with count, decision and effect; the leakage demonstration.
3. \`02_models.ipynb\` — the split, the baseline, at least two families as pipelines, tuning with time-ordered
   cross-validation, the paired bootstrap, the decline-share value table.
4. \`03_interpretation.ipynb\` — calibration, permutation importance, the chosen model's explanation, segment error
   analysis, the fairness check, the single test-set evaluation.
5. \`mlruns/\` or an exported MLflow comparison table showing every run.
6. \`MODEL_CARD.md\` and \`README.md\` (how to generate the data and run everything; library versions).

**Before you submit,** go through each acceptance criterion and note in the README where it is met.`,
      rubric: [
        { criterion: 'Data checks and leakage', description: 'Duplicates, the sentinel, unit errors, blank text and every column\'s availability at scoring time are checked and decided, with counts and effects; the leaked column is excluded and its effect shown.', maxPoints: 20 },
        { criterion: 'Validation design', description: 'Date-based split fixed in advance; time-ordered cross-validation for tuning; a baseline; the test set scored once; a paired-bootstrap interval for the key comparison.', maxPoints: 25 },
        { criterion: 'Models and the decision', description: 'At least two families as scikit-learn pipelines, compared fairly and logged in MLflow; the choice justified; the cutoff chosen from rupee values with the calculation shown.', maxPoints: 20 },
        { criterion: 'Interpretation, errors and fairness', description: 'Calibration, permutation importance and an explanation of the chosen model; errors analysed by segment; referral rates and calibration by group with proxies discussed; the test-period mix shift explained.', maxPoints: 20 },
        { criterion: 'Model card and reproducibility', description: 'MODEL_CARD.md states intended use, data period, metrics with intervals, limits and misuse; notebooks run from a clean start; README is complete.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },

  /* ── BUILD_DEPLOY_AI ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_CAPSTONE_BUILD_DEPLOY_AI',
    notes: `# Capstone Build — Deployment and the GenAI Feature

Two deliverables: the chosen pipeline running as a service a branch app could call — saved safely, served, tested,
demoed, tracked, containerised and watched — and the officer-note extraction, with its accuracy and its value
measured. The deployment topic taught every tool used here; this unit asks you to use them together on your own model.

## Part 1 — Serving the model

**Save it safely.** Save the **whole pipeline** (preprocessing and model together) with skops, and record the
scikit-learn, pandas and NumPy versions beside it. Loading a skops file audits the types it contains; on this
pipeline, scikit-learn 1.9 and skops 0.16 report one type that is not trusted by default:

    import skops.io as sio
    sio.dump(pipe, "default_model.skops")
    print(sio.get_untrusted_types(file="default_model.skops"))

Output:

    ['numpy.dtype']

Review the list, then pass it explicitly — never \`trusted=True\` on a file you did not make.

**Serve it** — \`api/app.py\`. Load the model **once**, at startup, in a lifespan handler; validate input with a
Pydantic v2 model whose categorical fields are \`Literal\` types, so an unknown state fails with a 422 instead of a
crash or a silent guess; compute derived features (new-to-credit flag, FOIR) in one place shared with training.

    from contextlib import asynccontextmanager
    from typing import Literal
    import pandas as pd
    import skops.io as sio
    from fastapi import FastAPI
    from pydantic import BaseModel, Field

    MODEL_VERSION = "lr-notes-2024q2"
    state = {}

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        state["model"] = sio.load("default_model.skops", trusted=["numpy.dtype"])   # reviewed list; loaded once
        yield

    app = FastAPI(lifespan=lifespan)

    class Application(BaseModel):
        age: int = Field(ge=18, le=70)
        monthly_income: float = Field(gt=0, le=300_000)
        bureau_score: int | None = Field(default=None, ge=300, le=900)   # None = new to credit
        existing_emi: float = Field(ge=0)
        loan_amount: float = Field(gt=0, le=300_000)
        down_payment_pct: float = Field(ge=0, le=0.9)
        tenure_months: Literal[12, 18, 24, 36]
        emi: float = Field(gt=0)
        state: Literal["Telangana", "Andhra Pradesh", "Karnataka", "Tamil Nadu"]
        employment_type: Literal["salaried", "self_employed", "gig"]
        vehicle_segment: Literal["commuter", "scooter", "premium", "EV"]
        house_owned: int = Field(ge=0, le=1)
        co_applicant: int = Field(ge=0, le=1)
        new_job: int = Field(ge=0, le=1)

    @app.get("/health")
    def health():
        return {"status": "ok", "model_version": MODEL_VERSION}

    @app.post("/score")
    def score(a: Application):
        row = a.model_dump()
        row["ntc"] = int(row["bureau_score"] is None)
        row["foir"] = (row["existing_emi"] + row["emi"]) / row["monthly_income"]
        p = float(state["model"].predict_proba(pd.DataFrame([row]))[0, 1])
        band = "refer" if p >= 0.148 else "approve"          # the 10% decline share from the build
        return {"p_default": round(p, 3), "band": band, "model_version": MODEL_VERSION}

**Test it** — \`tests/test_api.py\`, with FastAPI's TestClient used as a context manager so the lifespan runs:

    from fastapi.testclient import TestClient
    from app import app

    good = {"age": 27, "monthly_income": 22000, "bureau_score": None, "existing_emi": 0, "loan_amount": 78000,
            "down_payment_pct": 0.12, "tenure_months": 24, "emi": 3894, "state": "Telangana",
            "employment_type": "gig", "vehicle_segment": "commuter", "house_owned": 0, "co_applicant": 0, "new_job": 1}

    with TestClient(app) as client:
        r = client.post("/score", json=good); print(r.status_code, r.json())
        r = client.post("/score", json={**good, "state": "Kerala"}); print(r.status_code, r.json()["detail"][0]["msg"])
        r = client.post("/score", json={**good, "monthly_income": 264000}); print(r.status_code, r.json())

Output:

    200 {'p_default': 0.199, 'band': 'refer', 'model_version': 'lr-notes-2024q2'}
    422 Input should be 'Telangana', 'Andhra Pradesh', 'Karnataka' or 'Tamil Nadu'
    200 {'p_default': 0.153, 'band': 'refer', 'model_version': 'lr-notes-2024q2'}

The third call is the lesson: ₹2.64 lakh is inside the range, so validation accepts an annual figure typed as monthly
and the score drops. A range check is not a sanity check — add one (for example, income against the EMI and loan
amount) and decide whether the API rejects or flags it. Turn each printed line into an \`assert\` in pytest.

**Demo it** — \`demo/app.py\` in Streamlit: the inputs a credit manager would type, a call to the API (not a second
copy of the model), the probability, the band, and the three features that pushed this score up or down. Cache
anything loaded with \`st.cache_resource\`; never train inside the app. Streamlit is not part of the reference run, so
any screenshots in your README are your own.

**Track it.** Every run from the model build is in MLflow. The reference comparison on this data, sorted by
validation PR-AUC:

    import mlflow
    mlflow.set_tracking_uri("sqlite:///mlflow.db")
    runs = mlflow.search_runs(experiment_names=["sarathi-early-default"], order_by=["metrics.val_pr_auc DESC"])
    print(runs[["tags.mlflow.runName", "metrics.val_pr_auc", "metrics.val_roc_auc"]].round(3).to_string(index=False))

Output:

    tags.mlflow.runName  metrics.val_pr_auc  metrics.val_roc_auc
       lr_tabular_notes               0.264                0.760
      hgb_tabular_notes               0.253                0.752
             lr_tabular               0.243                0.754

Log the chosen pipeline with the run that produced it and register it, so "which model is live?" has one answer:

    with mlflow.start_run(run_name="lr_tabular_notes_logged"):
        mlflow.sklearn.log_model(pipe, name="model", registered_model_name="sarathi-early-default",
                                 skops_trusted_types=["numpy.dtype"])

Output (among MLflow's log lines):

    Successfully registered model 'sarathi-early-default'.
    Created version '1' of model 'sarathi-early-default'.

Two version notes. MLflow 3 names the logged model with \`name=\`; MLflow 2 code uses \`artifact_path=\`, which 3 still
accepts with a deprecation warning. And MLflow 3.17 saves scikit-learn models with skops by default, so the same
\`numpy.dtype\` review applies here — without \`skops_trusted_types\`, \`log_model\` refuses with an untrusted-types
error.

**Package it.** A Dockerfile for the API: a slim Python base image, pinned requirements, the model file copied in (or
fetched at start-up), the port and any settings from environment variables, a health check on \`/health\`. Docker is
not part of the reference run; the deployment topic shows the file.

**Watch it** — \`MONITORING.md\`. Labels arrive six months late, so watch inputs and scores in the meantime. On this
data, the population stability index of employment type between training and the July–December applications is
**0.275** (above the usual 0.25 "investigate" line) while FOIR (0.003) and bureau score (0.005) barely move — the
gig tie-up, not a broken pipeline. Write: what you compute monthly (PSI on key features, the score distribution, the
referral rate, the share of 422s), the thresholds, who is alerted, the early proxy you can watch before labels arrive
(first-EMI bounces), and the retraining rule.

## Part 2 — The GenAI feature: extracting fields from officer notes

**1. Hand-label first.** Draw 200 notes at random (fixed seed), excluding the blanks. For each, write house_owned,
co_applicant and new_job by hand, using written rules (for example, "lives with parents" is not owned; "Biwi bhi kaam
karti hai, co-applicant hai" is a co-applicant). Do this **before** you see any model output.

**2. A rules baseline.** Keyword rules for the three fields (the reference run used them to produce the build's
numbers). Measure them on your 200.

**3. An LLM extractor.** Use the tool and account your organisation or course has approved. Mask anything that looks
like a name or a phone number first; send only the note and its loan_id. A vendor-neutral sketch:

    import json, os, time

    API_KEY = os.environ["LLM_API_KEY"]                       # from the environment, never in code or notebooks
    FIELDS = {"house_owned": {0, 1}, "co_applicant": {0, 1}, "new_job": {0, 1}}

    def extract(loan_id, note):
        prompt = INSTRUCTIONS + note                          # field definitions, Hinglish examples, "JSON only"
        for attempt in range(3):
            try:
                out = json.loads(call_llm(prompt, api_key=API_KEY, timeout=10))   # your provider's SDK call
                if all(out.get(k) in allowed for k, allowed in FIELDS.items()):
                    return {"loan_id": loan_id, **{k: out[k] for k in FIELDS}, "source": "llm"}
            except (json.JSONDecodeError, TimeoutError, AttributeError):
                pass
            time.sleep(2 ** attempt)
        return {"loan_id": loan_id, **rules_extract(note), "source": "rules_fallback"}

Validate every response against the allowed values, retry with a timeout, fall back to the rules (and count how often),
keep the prompt fixed for a run, and save raw responses. Estimate the cost before running all notes: tokens per note
from the first 20, times the number of notes, times your provider's current prices held as variables.

**4. Measure.** Field-level accuracy for rules and LLM on the 200, with 95% intervals; disagreements read one by one.
Then the lift: the chosen model with and without the extracted fields on the validation split, paired-bootstrap
interval — and the same with the LLM's fields if they differ from the rules'. If tuning the prompt on the 200, re-measure
on a fresh 100.

**5. Where it runs in production.** Extraction happens when the note is saved, not inside \`/score\`; the API receives
the three fields. If extraction failed, the API scores with the tabular-only model and says so in the response
(\`model_version\`), so a slow LLM never blocks a branch.

## Acceptance criteria

- The pipeline is saved with skops and its untrusted types reviewed; library versions are recorded.
- The API loads the model once, validates every field, returns the model version, and has pytest tests for a valid
  call, an invalid category, a missing field and the income sanity check.
- The demo calls the API and shows a reason for the score; no training happens in the app.
- MLflow holds every run, and the shipped model is registered from the run that made it.
- A Dockerfile and MONITORING.md with metrics, thresholds, an early proxy and a retraining rule.
- 200 hand labels exist from before any model output; rules and LLM accuracy with intervals; the lift with an
  interval; the fallback counted; the cost estimated; no key in the repository.`,
    mcqs: [
      mcq('Loading the saved pipeline with skops raises UntrustedTypesFoundException naming numpy.dtype. What is the right fix?', [
        ['Review the list from get_untrusted_types and pass exactly those types as trusted', true],
        ['Pass trusted=True so that every type in the file is accepted without any listing', false],
        ['Switch to pickle.load, which reads the same file without raising any exception', false],
        ['Retrain the pipeline without NumPy so that the file holds no NumPy types at all', false],
      ], 'skops refuses unknown types until a person approves them. Reviewing the short list and passing it explicitly keeps the protection; trusting everything, or using pickle, throws it away.'),
      mcq('The LLM extractor times out for about 3% of notes at peak hours. What should happen to those applications?', [
        ['Score them with the tabular-only model, mark that in the response, and count the fallbacks', true],
        ['Hold them until the LLM responds, however long it takes, so every score uses the note fields', false],
        ['Set all three note fields to 1 for them, since a missing value is better than a blocked branch', false],
        ['Return an error to the branch app and ask the officer to resubmit the application again later', false],
      ], 'A branch must never wait on a slow model call. A documented fallback model keeps scoring honest, and counting fallbacks shows whether the feature is reliable enough to keep.'),
    ],
    assignment: {
      title: 'Capstone: Deployment and the GenAI Feature',
      description: 'Serve the chosen pipeline with a validated, tested FastAPI endpoint and a Streamlit demo, track and register it in MLflow, containerise it, write the monitoring plan, and build an officer-note extractor whose accuracy and model lift are measured against hand labels.',
      instructions: `Build both parts described in this unit's notes. Submit a repository link or a zip.

**Submit:**

1. \`model/\` — the skops file, the reviewed trusted-types list, and the library versions.
2. \`api/\` and \`tests/\` — the FastAPI app and its pytest suite (passing).
3. \`demo/\` — the Streamlit app and a two-minute screen recording of it calling the API.
4. MLflow — the experiment with every run and the registered model, or an exported comparison table and registry
   screenshot.
5. \`Dockerfile\` and \`MONITORING.md\` — metrics, thresholds, the early proxy, who is alerted, the retraining rule.
6. \`04_note_extraction.ipynb\` — the 200 hand labels and rules, the rules and LLM extractors, accuracy with intervals,
   the disagreements, the lift with a paired-bootstrap interval, the fallback count and the cost estimate.
7. \`AI_NOTES.md\` — the approved tool, what text was sent and what was masked, the prompt, the results, and whether
   you kept the LLM, the rules or neither — and why.

**Before you submit,** search the repository and notebook outputs for any API key, and run the tests from a clean
checkout.`,
      rubric: [
        { criterion: 'Saving and serving', description: 'Whole pipeline saved with skops and reviewed trusted types; model loaded once; Pydantic schema with allowed values; derived features computed in one shared place; model version returned; a sanity check beyond ranges.', maxPoints: 25 },
        { criterion: 'Tests, demo and packaging', description: 'pytest covers valid, invalid-category, missing-field and sanity cases and passes; the Streamlit demo calls the API and explains the score; Dockerfile with settings from the environment and a health check.', maxPoints: 20 },
        { criterion: 'Tracking and monitoring', description: 'Every run in MLflow and the shipped model registered from its run; MONITORING.md with PSI and score checks, thresholds, the early proxy, owners and a retraining rule tied to the delayed labels.', maxPoints: 20 },
        { criterion: 'GenAI feature measured', description: 'Hand labels made first with written rules; rules and LLM field accuracy with intervals; disagreements examined; model lift with a paired-bootstrap interval; the decision to keep LLM, rules or neither follows from the numbers.', maxPoints: 25 },
        { criterion: 'Safe use of the LLM', description: 'Approved tool; key from the environment; names and numbers masked; only the note sent; responses validated, retried with a timeout, with a counted fallback; cost estimated before the run.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  /* ── DEFENCE ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_CAPSTONE_DEFENCE',
    notes: `**The panel — a lead data scientist, an ML engineer, sometimes a credit or product head — will let you present for
ten minutes and then spend twenty asking how you know.** This unit gives you the script, the model card, the questions
you will get, what a strong answer holds, and six exercises to rehearse with.

## The ten-minute script

| Time | Show | Say |
|---|---|---|
| 0:00–0:45 | The decision and the headline | Who uses the score and how; the one number that matters ("referring the riskiest 10% raises value by about ₹15 lakh on three months of applications") |
| 0:45–2:30 | Data and target | The target and when it is known; the data problems found and what you did; the leaked column and why it is out |
| 2:30–4:30 | Validation and models | The date split; the baseline; the families compared; why the winner won; the interval on the key difference |
| 4:30–6:00 | Interpretation | Calibration; what drives the score; errors by segment; the fairness check |
| 6:00–7:30 | The GenAI feature | Hand labels first; rules vs LLM accuracy; the lift and its interval; what you kept and why |
| 7:30–9:00 | Live: API and demo | One application through the demo; an invalid input rejected; the MLflow run behind the live model |
| 9:00–10:00 | Limits and next steps | The mix shift; outcomes only for approved loans; the monitoring rule; what you would do with two more weeks |

Rehearse three times, timed, out loud. Keep a recording of the demo ready: if the live API fails, say what probably
failed, play the recording and carry on.

## The model card, one page

Intended use (approve or refer, never reject alone) · not intended for (pricing, collections, rejected-applicant
populations) · data (period, rows, default rate, exclusions) · metrics with intervals · cutoff and its ₹ value ·
performance by segment · known limits · monitoring and retraining rule · owner and date.

## The questions, and what a strong answer contains

1. **"Walk me from the raw CSV to one score."** Duplicates removed (180), the -1 sentinel to missing plus a flag, the
   income rule, the note fields, the pipeline's imputer, scaler and one-hot, the model, the cutoff, the band.
2. **"Why not a random split?"** The model scores future applicants; from July 2024 gig applicants went from 12% to
   31%. A random split mixes the periods and hides that.
3. **"Why logistic regression and not boosting?"** On validation it scored higher (PR-AUC 0.264 vs 0.253), is
   calibrated, and its reasons can be explained to a credit manager; you would switch for a gain larger than the noise.
4. **"Your PR-AUC is 0.26. Isn't that poor?"** Against a 7.1% default rate the no-skill level is about 0.07; the
   baseline was 0.11. Then give the business number.
5. **"How did you choose 0.148?"** From the rupee value at each decline share; and the break-even check p < 0.184.
6. **"You only have outcomes for loans that were approved."** Yes — the model has never seen how rejected applicants
   would have behaved, so it is not valid for them. Name a remedy: a small, controlled share of approvals below the
   cutoff, or bureau outcomes of rejected applicants elsewhere.
7. **"Is it fair to gig workers?"** Show referral rates next to actual default rates and calibration by group; say
   which attributes are not used and which features might act as proxies; the policy is the business's call, made
   with these numbers.
8. **"Did the LLM earn its place?"** Field accuracy for rules and LLM, the lift with its interval, the cost and the
   fallback count — and if rules matched the LLM, that you kept the rules.
9. **"What happens if the model service is down?"** The branch app sends the application to manual review; nothing
   is auto-approved.
10. **"How will you know it has gone stale?"** PSI on inputs and the score distribution monthly, an early proxy (first-EMI
    bounces), labels at six months, and the written retraining rule.
11. **"What would you do differently?"** One honest change with a reason.
12. **"What was the hardest bug?"** A specific one — how you found it and what now stops it recurring.

**What the panel is really scoring:** whether every number has a definition and an interval, whether you checked
before you concluded, whether you know what the model must not be used for, and whether you say "the data cannot tell
us that, but here is how we would find out" instead of bluffing.

## Exercises

1. **Write the headline.** In one sentence a credit head would repeat, state what the model does and what it is
   worth. Then cut it to 20 words.
2. **The model card.** Fill the one-page model card for your capstone. Have a classmate find one claim in it that no
   notebook supports.
3. **Three hard questions, timed.** Answer questions 4, 6 and 7 above aloud in under 90 seconds each. Record yourself
   and check every number you said against your notebooks.
4. **The fairness table.** Build the table of referral rate, actual default rate and mean prediction by employment
   type on validation. Write three sentences: what it shows, what it does not show, and what you would check next.
5. **Break your demo.** Send the API a missing field, an unknown state and an annual income; show what the demo does
   with each. Fix one thing you find.
6. **Two minutes on the GenAI feature.** Explain to a non-technical panellist what the note extraction does, how you
   know it is right, and what it adds — with your three numbers and no jargon.`,
    workedExample: `**The question: "Your test-period default rate was 8.5%, but your model predicted 7.6% on average. Is the
model broken?"**

A weak answer: "Models are never perfect; 7.6% is close to 8.5%."

A strong answer, with the numbers from the reference run:

> "No, but it is a warning I would act on. The test period, July to December 2024, is when Sarathi's tie-up with a
> delivery platform started: gig applicants went from 12% of applications in training to 31%. My monitoring check
> caught it — the PSI of employment type between training and that period is 0.275, above the 0.25 line — while
> FOIR and bureau score barely moved, at 0.003 and 0.005.
>
> Gig and self-employed borrowers default more, so the overall rate rose. Within groups the model is roughly right
> for gig workers — 9.9% predicted against 10.7% actual — but it under-predicts the self-employed: 7.7% against 9.2%.
> So the ranking still works, and the probabilities are now somewhat low.
>
> What I would do: keep the model serving, because it still ranks well, recalibrate it on the most recent labelled
> months, and confirm the 10% referral share still maximises value under the new mix. If self-employed calibration
> stays off after recalibration, that is a reason to retrain with recent data rather than adjust the cutoff."

The arithmetic behind it, run on the test period with the pipeline chosen in the build:

    t = test.copy()
    t["p"] = pipe.predict_proba(t[cols])[:, 1]
    print("mean predicted", t.p.mean().round(3), "actual", t.defaulted_6m.mean().round(3))
    print(t.groupby("employment_type").agg(mean_p=("p", "mean"), actual=("defaulted_6m", "mean")).round(3))

Output:

    mean predicted 0.076 actual 0.085
                     mean_p  actual
    employment_type
    gig               0.099   0.107
    salaried          0.051   0.053
    self_employed     0.077   0.092

The panel hears four things they are scoring for: the cause found with a monitoring number, the effect split by
segment, a distinction between ranking and calibration, and a decision with a rule behind it.`,
    mcqs: [
      mcq('A panellist says, "PR-AUC of 0.26 sounds poor." The validation default rate is 7.1% and the baseline scored 0.11. Which reply is strongest?', [
        ['A model with no skill scores about 0.07 here; 0.26 is far above that and the baseline, and here is its ₹ value', true],
        ['PR-AUC is always lower than ROC-AUC, so 0.26 is equivalent to a ROC-AUC well above 0.9 for this problem', false],
        ['Any PR-AUC above 0.25 is considered good in credit risk, so the model clears the industry standard', false],
        ['The score is low because the data is synthetic; on real Sarathi data it would be much higher', false],
      ], 'The no-skill PR-AUC equals the positive rate, so 0.26 is about 3.7 times it and well above the bureau-only baseline. Tying it to the rupee value answers the real concern.'),
      mcq('Asked "Is your model unfair to gig workers?", with referral rates of 16% for gig and 5.5% for salaried applicants, what should the student show?', [
        ['Referral and actual default rates side by side, calibration by group, and which inputs could be proxies', true],
        ['That employment type was one-hot encoded, so the model treats every category in exactly the same way', false],
        ['That the overall PR-AUC is good, which shows the model is accurate for every group in the data', false],
        ['That gig workers are a minority of applicants, so their referral rate has little effect on the total', false],
      ], 'Fairness is checked by group, not overall: here gig applicants default at 9.7% against 6.1%, and the model\'s means track that. Proxies and the policy decision still need saying.'),
      mcq('A panellist asks why the student chose logistic regression when HistGradientBoosting is "more powerful". Which reply is strongest?', [
        ['It scored higher on validation (0.264 vs 0.253), is calibrated and is easier to explain to credit', true],
        ['Gradient boosting cannot be saved with skops, so it could not be deployed behind the FastAPI service', false],
        ['Logistic regression always beats tree ensembles on tabular data with fewer than 50,000 rows', false],
        ['The course asked for a linear model in the capstone, so gradient boosting was never considered', false],
      ], 'The choice rests on the measured comparison plus calibration and explainability, with a willingness to switch for a gain larger than the noise. "Always" claims and rules are not reasons.'),
      mcq('"Your model was trained only on approved loans. What does that mean for applicants Sarathi used to reject?" What is the strongest answer?', [
        ['Their outcomes were never seen, so the model is not validated for them; a controlled sample of approvals could fix that', true],
        ['Nothing, because rejected applicants look like approved ones once the bureau score is included as a feature', false],
        ['The model can be trusted for them because it was tested on six months of data the training never saw', false],
        ['Rejected applicants can all be labelled as defaulters, which makes the training data complete, balanced and fully unbiased', false],
      ], 'This is selection bias: the labels exist only where past policy approved. Naming the limit and a way to learn about the missing population is what a credit panel wants to hear.'),
      mcq('During the demo the API returns 422 for an application typed with the state "Kerala". How should the student explain it to the panel?', [
        ['Intended: the schema lists the four states the model was trained on, so unknown values are refused clearly', true],
        ['A bug: the API should map any unknown state to the most common state in training and return a score in its place', false],
        ['A bug: Pydantic does not support Literal types properly, so the field should be a plain string instead', false],
        ['Intended: the model would crash on Kerala, so the API hides the crash by returning a 422 response', false],
      ], 'The model has never seen Kerala, so a score would be a guess. A clear 422 from the schema is the designed behaviour; supporting a new state means data and retraining.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_CAPSTONE_CHECKPOINT',
    notes: `Ten scenario questions across the whole Data Science + AI track — SQL, pandas, statistics, machine learning, deep
learning, NLP and GenAI, and deployment — at the level of judgement a hiring panel expects from someone who has taken
a model from raw data to a service. Each describes a situation from a capstone like yours; choose what you would
actually do, and be ready to say why.`,
    checkpoint: [
      ck(EV, 'A training table adds prior_loans = COUNT(*) OVER (PARTITION BY customer_id) to every application row. Validation looks excellent. What is wrong?', [
        ['It counts the customer\'s later loans too; count only loans dated before each application', true],
        ['COUNT(*) OVER needs an ORDER BY clause, or the database returns an error for each partition', false],
        ['Window functions cannot be used inside a training-table query, so a GROUP BY must replace it', false],
        ['It should be COUNT(DISTINCT customer_id), since one customer must be counted only once each', false],
      ], 'Without a frame limited to earlier rows, a first loan "knows" about loans taken later — information from the future. Order by application date and count only preceding rows.'),
      ck(EV, 'df.describe() shows a mean bureau score of 557.5, yet applicants with a score average 715.1. What explains it?', [
        ['A -1 code for new-to-credit applicants is being averaged as if it were a score', true],
        ['describe() rounds every column to a whole number before computing the mean', false],
        ['The column is stored as text, so pandas averaged only the first few rows', false],
        ['Scores above 900 are clipped to missing, which then pulls the summary mean down', false],
      ], 'About 22% of rows hold -1, which drags the mean down by roughly 160 points. Turn the sentinel into missing and add a new-to-credit flag before any modelling.'),
      ck(EV, 'Sarathi tests a new referral rule by assigning 40 branches at random, 20 to each rule, and then compares the default rates of about 9,000 loans with a two-proportion z-test. What is the flaw?', [
        ['Branches were randomised, so the analysis must treat branches, not loans, as the units', true],
        ['A two-proportion z-test needs at least 30,000 loans per arm before it gives a valid result', false],
        ['Default rates must be log-transformed first, because proportions are not normally distributed', false],
        ['Forty branches is too many; randomising at the branch level needs no more than ten of them', false],
      ], 'Loans in one branch share officers and local conditions, so they are not independent. Analysing loans as if they were randomised one by one makes the interval far too narrow.'),
      ck(EV, 'For a calibrated model, a good loan earns ₹9,000 and a default loses ₹40,000. Above what predicted probability of default does approving stop paying?', [
        ['About 0.18', true],
        ['About 0.50', false],
        ['About 0.07', false],
        ['About 0.23', false],
      ], 'Approving pays while 9,000 × (1 − p) > 40,000 × p, that is while p < 9,000 ÷ 49,000 ≈ 0.184. A 0.5 cutoff would ignore the four-to-one difference in costs.'),
      ck(EV, 'Five-fold shuffled cross-validation gives a PR-AUC of 0.31, but the date-based validation set gives 0.26. Which should the report use, and why?', [
        ['The date-based figure, since the model will score later applicants whose mix has changed', true],
        ['The cross-validated figure, since five folds average away the noise of one single split', false],
        ['The average of the two, since each method has its own bias that the other one partly cancels', false],
        ['Neither, since PR-AUC cannot be compared across splits with different default rates', false],
      ], 'Shuffled folds let the model train on applications from after the ones it is tested on. The date split imitates deployment, so its number is the honest one; tune with TimeSeriesSplit.'),
      ck(TR, 'A PyTorch model\'s validation accuracy changes from run to run on the same weights, and is lower than expected. The evaluation loop has torch.no_grad() but nothing else. What is the likely cause?', [
        ['model.eval() was never called, so dropout is still active during evaluation', true],
        ['torch.no_grad() changes the weights slightly each time a batch is evaluated', false],
        ['The validation DataLoader must use shuffle=True for the accuracy to be stable', false],
        ['The learning rate is too high, which makes the evaluation step itself unstable', false],
      ], 'no_grad() only stops gradient tracking. eval() switches dropout off and batch normalisation to its running statistics; without it, each pass drops different units and scores vary.'),
      ck(TR, 'An LLM labelled 3,000 support tickets, and a classifier was trained on those labels. How should the classifier\'s accuracy be measured?', [
        ['On a held-out sample labelled by people, not on more labels produced by the same LLM', true],
        ['On a held-out 20% of the LLM-labelled tickets, using the same labels as the training data', false],
        ['By asking the LLM to grade each prediction the classifier makes on a fresh set of tickets', false],
        ['By the agreement between the classifier and the LLM on the same 3,000 training tickets', false],
      ], 'Agreement with the LLM measures how well the classifier copies the LLM, errors included. Only human labels on held-out tickets measure accuracy against the truth.'),
      ck(TR, 'A retrieval-augmented assistant for credit officers often answers policy questions wrongly. What should be checked first?', [
        ['Whether the passage that holds the answer is in the top-k retrieved, on a labelled question set', true],
        ['Whether a larger LLM gives better answers, since generation quality is the usual cause of errors', false],
        ['Whether a longer system prompt with more instructions about policy questions reduces the errors', false],
        ['Whether raising the temperature makes the answers more varied and so more likely to be right', false],
      ], 'If the right passage is never retrieved, no prompt or model can answer from it. Measuring retrieval recall on labelled questions separates a retrieval fault from a generation fault.'),
      ck(DEP, 'Offline the model\'s PR-AUC is 0.26, but every live score sits near 0.02. The API computes FOIR from income sent in thousands of rupees. What is the lasting fix?', [
        ['Compute every derived feature inside the saved pipeline, so training and serving share code', true],
        ['Divide every live score by its mean, so that the distribution matches the training scores', false],
        ['Retrain the model on the live requests, so that it learns the API\'s version of FOIR', false],
        ['Lower the referral cutoff until the live referral rate matches the rate from validation', false],
      ], 'This is training–serving skew: the same feature is computed two ways. Moving the computation into the pipeline (or one shared function) removes the second copy instead of patching its symptoms.'),
      ck(DEP, 'Default labels arrive six months after a loan is disbursed. What should the monitoring plan watch in the meantime?', [
        ['Input drift such as PSI on key features, the score distribution, and an early proxy like first-EMI bounces', true],
        ['Nothing until the labels arrive, since accuracy is the only measure that shows a model has gone stale', false],
        ['The API\'s CPU and memory use, since a model service that is still running is a model that is still accurate', false],
        ['The validation PR-AUC from training, re-computed every month on the same validation set as before', false],
      ], 'Inputs and scores are available at once and show a changing population, and an early proxy hints at outcomes. Infrastructure metrics and an old validation set say nothing about the new applicants.'),
    ],
  },
];
