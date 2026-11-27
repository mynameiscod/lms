/**
 * Career-track content: model deployment and MLOps basics (Data Science + AI, batch S4).
 *
 * DS_DEPLOYMENT — saving and loading a model safely (joblib, pickle as code execution, skops, the whole
 * pipeline, pinned versions), serving it behind a validated FastAPI endpoint, a Streamlit demo, experiment
 * tracking and the registry in MLflow, monitoring for data and concept drift, and packaging the API in a
 * container with its configuration kept out of the code; ending with a mini project that deploys S1's churn
 * model.
 *
 * The Python track's JT_FASTAPI teaches FastAPI itself (routes, Pydantic, 422 bodies, lifespan, dependencies,
 * TestClient) and JT_FULLSTACK_PY teaches Docker to an engineer. Nothing here re-teaches either: this topic is
 * about what changes when the thing behind the endpoint is a model — one object that must be loaded once,
 * validated inputs it can score, categories it never saw, versions that must match, and a world that drifts.
 *
 * One model runs through the topic: the telecom churn pipeline from S1 (make_churn(), 6,000 prepaid customers,
 * StandardScaler + OneHotEncoder(handle_unknown="ignore") + LogisticRegression). Every output shown was
 * produced by running the code with scikit-learn 1.9.1, pandas 3.0.6, NumPy 2.5.4, FastAPI 0.156 with
 * Pydantic 2.14 (tested through TestClient, never a live server), MLflow 3.17 on a local SQLite store, skops
 * 0.16, joblib 1.6 and SciPy 1.18, on one laptop CPU — timings are that machine's and only their ratios
 * matter. Streamlit and Docker were not run: their code follows the documentation and any output shown for
 * them is marked illustrative.
 *
 * The topic is three-skill (MODEL_DEPLOYMENT, EXPERIMENT_TRACKING, MODEL_MONITORING). Every checkpoint
 * question names its skill with ck(): the EXPERIMENT_TRACKING and MONITORING_DRIFT units use their own single
 * skill, the other units MODEL_DEPLOYMENT, and the CHECKPOINT spreads its ten over all three, following
 * trackSkillAttribution.ts.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const DEP = 'MODEL_DEPLOYMENT';
const EXP = 'EXPERIMENT_TRACKING';
const MON = 'MODEL_MONITORING';

export const TRACK_DS_DEPLOYMENT_BUNDLES: PilotBundle[] = [
  /* ── SAVING_MODELS ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_DEPLOYMENT_SAVING_MODELS',
    notes: `A model that lives only inside a notebook dies when the kernel restarts. Before it can be served, demoed or
monitored, the trained object has to be written to a file and read back somewhere else — on a server, in a
container, next month. This unit is about doing that so the file loads, predicts exactly what it predicted in
the notebook, and cannot be used to attack the machine that loads it.

## The model this topic deploys

The telecom churn model from S1: prepaid customers, 19.6% of whom did not recharge the following month.
\`make_churn()\` is the generator from the decision-trees unit; the pipeline is the one from the pipelines unit:

    import numpy as np, pandas as pd
    from sklearn.compose import ColumnTransformer
    from sklearn.preprocessing import OneHotEncoder, StandardScaler
    from sklearn.pipeline import Pipeline
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import roc_auc_score

    NUM = ["tenure_months", "monthly_recharge", "data_gb", "call_drops", "complaints_90d",
           "days_since_recharge", "dual_sim"]
    CAT = ["plan", "circle"]

    def build_pipeline(C=1.0):
        pre = ColumnTransformer([("num", StandardScaler(), NUM),
                                 ("cat", OneHotEncoder(handle_unknown="ignore"), CAT)])
        return Pipeline([("pre", pre), ("clf", LogisticRegression(C=C, max_iter=1000))])

    df = make_churn()
    X, y = df[NUM + CAT], df["churned"]
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, random_state=0, stratify=y)
    pipe = build_pipeline().fit(X_tr, y_tr)
    print("test AUC", round(roc_auc_score(y_te, pipe.predict_proba(X_te)[:, 1]), 3))

    test AUC 0.749

## Save the whole pipeline, not the model

    import joblib
    joblib.dump(pipe, "churn_pipeline.joblib")
    loaded = joblib.load("churn_pipeline.joblib")
    print(type(loaded).__name__, [n for n, _ in loaded.steps])
    print("identical:", np.array_equal(pipe.predict_proba(X_te)[:, 1], loaded.predict_proba(X_te)[:, 1]))

    Pipeline ['pre', 'clf']
    identical: True

The file is about 4 KB. Saving only the classifier is the classic mistake — the scaler's means and the encoder's
category list are learned too, and without them a raw row cannot be scored:

    clf_only = pipe.named_steps["clf"]
    clf_only.predict_proba(X_te.iloc[[0]])

    ValueError: could not convert string to float: 'Prepaid 199'

Whoever loads a bare classifier has to rebuild the preprocessing by hand, and any difference (a different
category order, scaling with this month's mean) silently changes every prediction. **One object goes in the
file: raw columns in, probability out.**

## Loading a pickle runs code

\`joblib\` and \`pickle\` store instructions for rebuilding an object, and one allowed instruction is "call this
function with these arguments". A harmless demonstration:

    import pickle
    class Payload:
        def __reduce__(self):
            return (print, ("this line ran while the file was being LOADED",))

    blob = pickle.dumps(Payload())
    obj = pickle.loads(blob)

    this line ran while the file was being LOADED

Replace \`print\` with \`os.system\` and loading the file runs a shell command. So: **never load a pickle or joblib
file you did not create or cannot trace to a source you trust** — not a model "shared on a drive", not one
downloaded from a forum. This is why model hubs flag pickle files and why safer formats exist.

## skops: a format that refuses unknown types

\`skops.io\` saves scikit-learn objects without arbitrary code, and on load it checks every type in the file
against a list of trusted ones:

    import skops.io as sio
    sio.dump(pipe, "churn_pipeline.skops")
    print(sio.get_untrusted_types(file="churn_pipeline.skops"))
    m = sio.load("churn_pipeline.skops")
    print("skops identical:", np.array_equal(m.predict_proba(X_te)[:, 1], pipe.predict_proba(X_te)[:, 1]))

    []
    skops identical: True

Everything in this pipeline is a standard scikit-learn type, so nothing is untrusted. Add your own function and
skops stops:

    def cap_gb(X):
        return np.minimum(X, 60)
    p2 = make_pipeline(FunctionTransformer(cap_gb), LogisticRegression()).fit(df[["data_gb"]], df["churned"])
    sio.dump(p2, "custom.skops")
    print(sio.get_untrusted_types(file="custom.skops"))
    sio.load("custom.skops")

    ['__main__.cap_gb']
    UntrustedTypesFoundException: Untrusted types found in the file: ['__main__.cap_gb'].

You then pass \`trusted=[...]\` naming **only the types you have reviewed** — never the whole list
\`get_untrusted_types()\` returns, which would make the check pointless. (Older skops releases treated fewer types
as trusted by default and accepted \`trusted=True\`; 0.16 wants the explicit list.) Notice also \`__main__.cap_gb\`:
a function defined in a notebook belongs to the notebook. Put custom transformers in a module (\`features.py\`)
that both training and serving import, or the API cannot find them — with joblib the load fails with
\`AttributeError: Can't get attribute 'cap_gb' on <module '__main__' ...>\`.

## Pin the versions — a file is not portable across scikit-learn releases

A pickle stores an object's internal attributes, and scikit-learn changes internals between releases. Loading a
file saved by another version gives a warning at best:

    InconsistentVersionWarning: Trying to unpickle estimator StandardScaler from version 1.6.1 when using
    version 1.9.1. This might lead to breaking code or invalid results. Use at your own risk.

(Produced here by saving with the version string set to 1.6.1; this pipeline raised seven such warnings, one per
estimator object inside it.) At worst it fails with an \`AttributeError\` about a private attribute, or loads and
predicts slightly differently. skops does not solve this — it is about safety, not compatibility. The fixes:

- **Pin** the training environment's versions in \`requirements.txt\` and install exactly those where the model
  is served (\`scikit-learn==1.9.1\`, \`numpy==2.5.4\`, \`pandas==3.0.6\`).
- **Save metadata beside the model**, so whoever loads it knows what it needs:

        meta = {"sklearn": sklearn.__version__, "numpy": np.__version__, "python": platform.python_version(),
                "features": NUM + CAT, "test_auc": 0.749, "trained_on": "2026-10-01"}
        json.dump(meta, open("churn_pipeline.meta.json", "w"), indent=2)

        {"sklearn": "1.9.1", "numpy": "2.5.4", "python": "3.13.15", "features": [...], "test_auc": 0.749, ...}

- **To upgrade scikit-learn, retrain and re-save** with the new version (and check the metrics match), rather
  than carrying an old file forward.
- Add a **known-answer test**: score a handful of saved rows after every load and compare with the probabilities
  recorded at training time.

## Checklist

- Save the fitted **pipeline**, with custom code in an importable module.
- joblib for your own files; skops when files cross a trust boundary; never load an untrusted pickle.
- Record versions, features, metrics and the training date next to the file; pin versions where it is loaded.
- Prove it after loading: identical predictions on known rows.`,
    workedExample: `**Task: an NBFC's credit team hands you \`default_model.pkl\` from a shared drive and asks you to put it behind
an API by Friday. Nobody remembers how it was trained. What do you do before it scores a single applicant?**

**Step 1 — Do not load it on your laptop or the server.** A pickle can run any code when loaded. First find who
created it and where: the training notebook, the commit, the person. If the source cannot be traced, the only safe
course is to retrain from the notebook.

**Step 2 — Load it once, in a sandbox, if it is traced.** A throwaway container with no credentials and no network,
the same Python and library versions as training (ask, or read them from the notebook's environment). Watch for
\`InconsistentVersionWarning\` — it means the versions differ.

**Step 3 — Find out what it is.** \`type(model)\` and, for a pipeline, \`model.steps\`. If it is a bare classifier,
the preprocessing is somewhere else — find it, because the API needs both.

**Step 4 — Reproduce known predictions.** Take ten applicants whose scores were recorded when the model was
validated and check the loaded model gives the same numbers. If it does not, stop: something in the environment or
preprocessing differs.

**Step 5 — Re-save it properly.** Rebuild as one \`Pipeline\`, save with skops (or joblib, if the file never leaves
your team), and write the metadata file: versions, feature list, validation metrics, training date, owner.

**Step 6 — Pin and test.** \`requirements.txt\` with exact versions; a test that loads the file and checks the ten
known predictions, run in CI and at container start.

**What to say:** "I won't load an untraced pickle — loading one can run code. Once we trace it, I'll check it
reproduces its recorded predictions, re-save it as one pipeline with its versions, and add a test that fails if
those predictions ever change."`,
    mcqs: [
      mcq('A colleague saved only the LogisticRegression step of the churn pipeline. What happens when the API passes it a raw customer row?', [
        ['It fails, because the scaler and the encoder that turn the raw row into numbers were not saved', true],
        ['It works, because a logistic regression scales and one-hot encodes the raw columns on its own', false],
        ['It works but more slowly, because the classifier has to refit the preprocessing on every single call', false],
        ['It returns the class label instead of a probability, because predict_proba needs the pipeline', false],
      ], 'The classifier was trained on scaled numbers and one-hot columns. Given "Prepaid 199" it raises "could not convert string to float". The fitted preprocessing belongs in the same saved object.'),
      mcq('Why is loading a pickle or joblib file from an unknown source dangerous?', [
        ['Unpickling can call any function, so the file can run code on your machine', true],
        ['The file may be compressed with a codec your installed Python cannot read', false],
        ['Pickle files hold data only and cannot store a model with all its weights', false],
        ['The loaded model is shared with its author, who can then read every prediction', false],
      ], 'Pickle rebuilds objects by calling functions named in the file — the __reduce__ demo printed a line during loading. A malicious file can call os.system instead.'),
      mcq('skops reports untrusted types [\'__main__.cap_gb\'] for a pipeline you built yourself. What is the right response?', [
        ['Review that function and pass trusted=[\'__main__.cap_gb\'], or move it into a module', true],
        ['Pass whatever get_untrusted_types() returns every time, so that loading never fails', false],
        ['Switch back to pickle, since skops cannot store pipelines with custom transformers', false],
        ['Delete the FunctionTransformer step, because skops only accepts built-in estimators', false],
      ], 'skops asks you to vouch for each unknown type. Trusting a reviewed function is fine; trusting whatever the file contains, automatically, removes the protection. A module also makes the function importable by the API.'),
    ],
    checkpoint: [
      ck(DEP, 'A model saved with scikit-learn 1.6 is loaded in a service running 1.9 and shows InconsistentVersionWarning. What is the sound fix?', [
        ['Retrain and re-save under 1.9, or pin the service to 1.6, and check known predictions', true],
        ['Silence the warning, since scikit-learn files load identically across all versions', false],
        ['Convert the file to skops, which makes it compatible with every future scikit-learn release', false],
        ['Load it twice and average the two results, so any small version difference cancels', false],
      ], 'Pickled estimators carry version-specific internals. Either match the versions or retrain under the new one, then confirm the saved known-answer rows still score the same. skops is about safety, not compatibility.'),
      ck(DEP, 'Which item belongs in the metadata file saved next to a deployed model?', [
        ['The library versions, the feature list, the validation metrics and the training date', true],
        ['The complete training dataset, so that the server can refit the model if it needs to', false],
        ['The database password, so the serving code can fetch new customer features directly', false],
        ['The notebook\'s full cell outputs, so reviewers can see every plot that was produced', false],
      ], 'Whoever loads the file needs to know what environment it needs, which columns it expects, how good it was and when it was trained. Data and secrets do not belong beside the model.'),
      ck(DEP, 'A pipeline with a FunctionTransformer(cap_gb) defined in a notebook is loaded in the API with joblib. What error is likely, and why?', [
        ['AttributeError: Can\'t get attribute \'cap_gb\' — the function lived only in the notebook', true],
        ['ValueError: could not convert string — the function changed the column types on save', false],
        ['MemoryError — joblib stores a copy of the whole notebook session with each function', false],
        ['No error — joblib embeds the source code of every function it saves into the file', false],
      ], 'Pickle stores functions by reference (module and name), not by code. A function in __main__ of the notebook does not exist in the API process. Put it in a module both import.'),
    ],
  },

  /* ── SERVING_API ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_DEPLOYMENT_SERVING_API',
    notes: `The retention team's campaign tool, the call-centre screen and the nightly batch job all need churn scores. None
of them can open a notebook. A small HTTP service — send a customer, get a probability — lets every one of them use
the same model. FastAPI itself (routes, Pydantic models, the 422 body, lifespan, TestClient) is taught in the Python
track's FastAPI topic; this unit is about what changes when the thing behind the endpoint is a model.

## The service

    from contextlib import asynccontextmanager
    from typing import Literal
    import joblib, pandas as pd
    from fastapi import FastAPI
    from pydantic import BaseModel, Field

    MODEL_PATH = "churn_pipeline.joblib"
    MODEL_VERSION = "churn-lr-2026-10-01"
    THRESHOLD = 0.278                       # break-even from the offer economics in S1

    class Customer(BaseModel):
        tenure_months: int = Field(ge=0, le=600)
        monthly_recharge: int = Field(gt=0)
        data_gb: float = Field(ge=0)
        call_drops: int = Field(ge=0)
        complaints_90d: int = Field(ge=0)
        days_since_recharge: int = Field(ge=0)
        dual_sim: Literal[0, 1]
        plan: str
        circle: str

    class Prediction(BaseModel):
        churn_probability: float
        send_offer: bool
        model_version: str

    ml = {}

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        ml["model"] = joblib.load(MODEL_PATH)        # once, at startup
        yield
        ml.clear()

    app = FastAPI(title="Churn scoring", lifespan=lifespan)

    @app.post("/predict", response_model=Prediction)
    def predict(c: Customer):
        X = pd.DataFrame([c.model_dump()])
        p = float(ml["model"].predict_proba(X)[0, 1])
        return Prediction(churn_probability=round(p, 4), send_offer=p >= THRESHOLD, model_version=MODEL_VERSION)

    class Batch(BaseModel):
        customers: list[Customer] = Field(min_length=1, max_length=1000)

    @app.post("/predict/batch", response_model=list[Prediction])
    def predict_batch(batch: Batch):
        X = pd.DataFrame([c.model_dump() for c in batch.customers])
        ps = ml["model"].predict_proba(X)[:, 1]
        return [Prediction(churn_probability=round(float(p), 4), send_offer=bool(p >= THRESHOLD),
                           model_version=MODEL_VERSION) for p in ps]

    @app.get("/health")
    def health():
        return {"status": "ok", "model_loaded": "model" in ml, "model_version": MODEL_VERSION}

Four model-specific decisions are in that code:

1. **The model loads once**, in \`lifespan\`, before the first request — not inside \`predict\`.
2. **The input schema mirrors the training columns**, with the ranges the model can sensibly score.
3. **The response says what to do and which model said it** — the probability, the decision at the agreed
   threshold, and the model version, so every logged score can be traced to a model.
4. **The endpoint builds a DataFrame with the training column names**, because the pipeline's ColumnTransformer
   selects columns by name.

The handlers are plain \`def\`, not \`async def\`: \`predict_proba\` is CPU work that would block the event loop, and
FastAPI runs \`def\` handlers in a thread pool.

## Testing it (TestClient, no server needed)

    from fastapi.testclient import TestClient
    good = {"tenure_months": 6, "monthly_recharge": 199, "data_gb": 3.5, "call_drops": 6, "complaints_90d": 2,
            "days_since_recharge": 38, "dual_sim": 1, "plan": "Prepaid 199", "circle": "Bihar"}
    with TestClient(app) as client:                      # "with" runs the lifespan, so the model loads
        print(client.get("/health").json())
        r = client.post("/predict", json=good); print(r.status_code, r.json())

    {'status': 'ok', 'model_loaded': True, 'model_version': 'churn-lr-2026-10-01'}
    200 {'churn_probability': 0.891, 'send_offer': True, 'model_version': 'churn-lr-2026-10-01'}

A six-month customer with two complaints, six dropped calls, a second SIM and no recharge for 38 days: 89% risk,
send the offer. Bad input never reaches the model:

    bad = dict(good, tenure_months=-3, dual_sim=2); bad.pop("circle")
    r = client.post("/predict", json=bad); print(r.status_code)
    for e in r.json()["detail"]: print(e["loc"], e["type"], e["msg"])

    422
    ['body', 'tenure_months'] greater_than_equal Input should be greater than or equal to 0
    ['body', 'dual_sim'] literal_error Input should be 0 or 1
    ['body', 'circle'] missing Field required

Without the schema, \`tenure_months=-3\` would have been scaled and scored, and the caller would have received a
confident, meaningless probability. Note Pydantic v2's default "lax" mode: \`"6"\` is accepted and converted to 6,
but \`"six"\` is a 422 (\`Input should be a valid integer, unable to parse string as an integer\`). Use
\`Field(strict=True)\` where a string must be rejected.

## The category the model never saw

The schema accepts any \`circle\`. What happens with "Assam", which was not in training?

    new = dict(good, circle="Assam", plan="Prepaid 349")
    r = client.post("/predict", json=new); print(r.status_code, r.json())

    200 {'churn_probability': 0.9382, 'send_offer': True, 'model_version': 'churn-lr-2026-10-01'}

It scores, because the encoder was built with \`OneHotEncoder(handle_unknown="ignore")\`: an unknown value becomes
all zeros. With the default \`handle_unknown="error"\`, the same request raises inside the endpoint —

    ValueError: Found unknown categories ['Assam'] in column 1 during transform

— and the caller gets a **500**. Neither is automatically right. "ignore" keeps the service up but scores the
customer as if they were in no circle at all (0.938 instead of 0.891 here); the alternative is to declare the
allowed values (\`circle: Literal["Karnataka", "Tamil Nadu", ...]\`) so an unknown one is a clear **422**. Choose per
field, and either way **log the unknown values** — a new circle in production is a sign the model needs retraining.

## Single versus batch

    1000 single calls 6539 ms, one batch of 1000 7.9 ms

(\`predict_proba\` on one row at a time versus one 1,000-row DataFrame, this laptop.) The per-call overhead —
building a DataFrame, validating, running each pipeline step — dominates for one row. Real-time screens use
\`/predict\`; anything scoring many customers at once (the nightly campaign list) should use the batch endpoint, or
skip the API and score the table directly with the same saved pipeline.

## Tests worth writing

    @pytest.fixture(scope="module")
    def client():
        with TestClient(app) as c:
            yield c

    def test_known_customer_scores_as_before(client):
        r = client.post("/predict", json=RISKY)
        assert r.status_code == 200
        assert r.json()["churn_probability"] == pytest.approx(0.891, abs=1e-3)

    def test_invalid_input_is_rejected_not_scored(client):
        assert client.post("/predict", json=dict(RISKY, tenure_months=-3)).status_code == 422

    def test_unseen_circle_still_scores(client):
        assert client.post("/predict", json=dict(RISKY, circle="Assam")).status_code == 200

    def test_batch_matches_single(client):
        single = client.post("/predict", json=RISKY).json()
        batch = client.post("/predict/batch", json={"customers": [RISKY, RISKY]}).json()
        assert batch == [single, single]

The first is the most valuable: a **known-answer test** fails the build if a library upgrade, a new pipeline file
or a code change moves the score of a customer whose answer you recorded.`,
    workedExample: `**Task: the call-centre app will call the churn API while an agent is on the phone, and the agent needs an answer
within 200 ms. In load testing, the 95th-percentile latency is 310 ms. Find out why and fix it.**

**Step 1 — Time the parts.** Add timing around the handler's steps and log them. The result per request: load
model 259 ms, build DataFrame 1 ms, predict 42 ms. (The team had swapped in a 500-tree random forest: a 91 MB
file.)

**Step 2 — Read the handler.**

    @app.post("/predict")
    def predict(c: Customer):
        model = joblib.load("rf.joblib")        # here is the 259 ms
        ...

The model is read from disk and unpickled on every request.

**Step 3 — Load once.** Move the load into \`lifespan\` and keep the object in application state. Now each request
pays only the 42 ms prediction — a 7× faster endpoint, and the server is no longer reading 91 MB per request.

**Step 4 — Check the memory.** Each worker process holds its own copy: four uvicorn workers × 91 MB is about 364
MB before Python itself. Size the container for that, or use fewer workers.

**Step 5 — Is the forest worth it?** In S1 the forest and the logistic model were close on AUC; the logistic
pipeline is 4 KB and predicts in a few milliseconds. Put the numbers side by side: if the forest is not clearly
better on the metric that matters, the smaller model is the better product.

**Step 6 — Lock it in.** A test that calls \`/predict\` 50 times and checks the median time stays under a budget
catches the regression if someone moves the load back.

**What to say:** "The model was being loaded from disk on every request. Loading it once at startup took the
endpoint from about 300 ms to about 40 ms; I also checked memory per worker and whether the bigger model earns its
cost."`,
    mcqs: [
      mcq('Why does the churn endpoint build pd.DataFrame([c.model_dump()]) rather than a NumPy array of the values?', [
        ['The ColumnTransformer selects its columns by name, so the input needs the training column names', true],
        ['NumPy arrays cannot hold integers and floats together, so the model would reject the request body', false],
        ['FastAPI can only pass data frames to a model, because Pydantic converts every body into pandas', false],
        ['A DataFrame is much faster than an array for a single row, which matters for real-time latency', false],
      ], 'The pipeline was fitted on a DataFrame and its ColumnTransformer picks "plan", "circle" and the numeric columns by name. Building the frame from the validated model keeps the names and the order right.'),
      mcq('A request has tenure_months = -3. With the Customer schema (Field(ge=0)), what does the caller receive?', [
        ['A 422 naming tenure_months, and the model is never called', true],
        ['A 200 with a probability, because the scaler handles negatives', false],
        ['A 500, because the model raises an error on the negative value', false],
        ['A 200 with tenure_months clipped to zero before the prediction', false],
      ], 'Pydantic validates the body before the handler runs, so invalid input is rejected with a 422 that names the field. Without the constraint, -3 would have been scored silently.'),
      mcq('The batch job must score 40 lakh customers every night. Which approach suits it best?', [
        ['Score them in large batches with the same saved pipeline, not one request per customer', true],
        ['Send 40 lakh single /predict requests in a loop, so the job reuses the real-time path', false],
        ['Add more workers to /predict until the single requests finish within the night window', false],
        ['Retrain the model each night on the customers being scored, then predict for each one', false],
      ], 'Per-call overhead dominates single predictions: 1,000 single calls took 6.5 s against 8 ms for one batch of 1,000. A batch endpoint, or scoring the table directly with the same pipeline file, is far cheaper.'),
    ],
    checkpoint: [
      ck(DEP, 'The encoder was fitted with the default handle_unknown="error", and a request arrives with circle = "Assam". What does the caller see?', [
        ['A 500, because the encoder raises ValueError for the unseen category inside the endpoint', true],
        ['A 422, because Pydantic knows which circles the model saw during training and rejects it', false],
        ['A 200 with the probability of an average customer, because unknown values are imputed', false],
        ['A 200 with the circle silently replaced by the most frequent circle in the training data', false],
      ], 'The schema only says circle is a string, so the request passes validation; the encoder then raises "Found unknown categories". Either declare allowed values (a clear 422) or use handle_unknown="ignore", and log unknown values.'),
      ck(DEP, 'What is the main reason to return model_version with every prediction?', [
        ['So each logged score can be traced to the exact model that produced it', true],
        ['So the client can choose which version of the model scores the request', false],
        ['Because FastAPI requires a version field in every response_model class', false],
        ['So that browsers cache responses separately for each model version used', false],
      ], 'When a model is replaced, scores before and after come from different models. Logging the version with each score lets you compare, audit and roll back.'),
      ck(DEP, 'Which test gives the strongest protection against a library upgrade silently changing the model\'s scores?', [
        ['A known-answer test that checks a recorded customer still scores 0.891', true],
        ['A test that checks /health returns a status code of 200 after startup', false],
        ['A test that checks the response JSON has a churn_probability key in it', false],
        ['A test that checks the probability is a number between zero and one', false],
      ], 'Only a recorded input with its recorded output detects a changed score. The other tests pass whether the model is right or wrong.'),
    ],
  },

  /* ── STREAMLIT_DEMO ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_DEPLOYMENT_STREAMLIT_DEMO',
    notes: `The retention head will not read a notebook or call an API. She will move a slider and watch the churn risk change.
**Streamlit** turns a Python script into a web page with inputs, outputs and charts, with no HTML or JavaScript.
It is the fastest way to let a non-technical audience try a model — in a review meeting, at demo day, or on a
capstone page. (Streamlit was not run for this unit; the code follows its documentation, and the model numbers
shown were computed with the same pipeline in Python.)

## How Streamlit runs your script

This is the one idea everything else follows from: **every time a user changes any widget, Streamlit reruns the
whole script from top to bottom.** A slider moved from 6 to 7 means every line runs again — imports, data loading,
everything. So anything slow must be cached, and anything that must survive a rerun must be stored in
\`st.session_state\`.

## The demo

    # demo.py — run with:  streamlit run demo.py
    import joblib, pandas as pd, streamlit as st

    st.set_page_config(page_title="Churn risk", layout="centered")

    @st.cache_resource                       # load once per server process, shared by every user
    def load_model():
        return joblib.load("churn_pipeline.joblib")

    model = load_model()
    st.title("Will this prepaid customer recharge next month?")
    st.caption("Demo of churn model churn-lr-2026-10-01 on simulated data. Not for decisions about real customers.")

    with st.form("customer"):
        col1, col2 = st.columns(2)
        tenure = col1.slider("Months with us", 1, 72, 6)
        plan = col1.selectbox("Plan", ["Prepaid 199", "Prepaid 299", "Prepaid 479", "Prepaid 719"])
        circle = col1.selectbox("Circle", ["Karnataka", "Tamil Nadu", "Maharashtra", "UP East", "Bihar"])
        data_gb = col1.number_input("Data used per month (GB)", 0.0, 200.0, 3.5)
        complaints = col2.selectbox("Complaints in last 90 days", [0, 1, 2, 3], index=2)
        drops = col2.slider("Dropped calls per month", 0, 15, 6)
        gap = col2.slider("Days since last recharge", 0, 60, 38)
        dual = col2.checkbox("Has another operator's SIM", value=True)
        submitted = st.form_submit_button("Score this customer")

    if submitted:
        X = pd.DataFrame([{"tenure_months": tenure, "monthly_recharge": int(plan.split()[1]), "data_gb": data_gb,
                           "call_drops": drops, "complaints_90d": complaints, "days_since_recharge": gap,
                           "dual_sim": int(dual), "plan": plan, "circle": circle}])
        p = model.predict_proba(X)[0, 1]
        st.metric("Churn risk", f"{p:.0%}")
        st.write("Send the ₹150 retention offer" if p >= 0.278 else "No offer needed")

Decisions worth copying:

- **\`@st.cache_resource\` for the model.** Without it, every slider move would reload the file. Use
  \`cache_resource\` for models and connections (one shared object, not copied) and \`st.cache_data\` for data such as
  a DataFrame read from a file (each caller gets a copy, so one user's edits cannot leak into another's).
- **A form.** Inside \`st.form\`, widget changes do not rerun the script until the button is pressed — the user sets
  eight inputs and scores once.
- **\`monthly_recharge\` derived from the plan**, not a separate input: the demo must not let a user build a customer
  the model never saw (Prepaid 199 with a ₹719 recharge).
- **The caption says what this is.** Simulated data, model version, not for real decisions.

With the defaults above the page shows **Churn risk 89%** and "Send the ₹150 retention offer" — the same 0.891 the
API returned for this customer.

## Show why, not just how much

A number alone invites "why?". For a logistic model, each feature's contribution to the log-odds is its
coefficient times its (scaled) value — exact, cheap, and easy to chart:

    pre, clf = model.named_steps["pre"], model.named_steps["clf"]
    z = pre.transform(X)
    z = z.toarray() if hasattr(z, "toarray") else z
    contrib = pd.Series(z[0] * clf.coef_[0], index=pre.get_feature_names_out())
    top = contrib.reindex(contrib.abs().sort_values(ascending=False).index).head(5).round(2)
    print(top.to_string())

    num__tenure_months          1.16
    num__complaints_90d         0.95
    num__days_since_recharge    0.48
    num__call_drops             0.47
    cat__plan_Prepaid 199      -0.45

In the app, \`st.bar_chart(top)\` under the metric, with plain labels ("New customer (6 months)", "2 complaints").
Numeric contributions are relative to an average customer, because the features were standardised; the one-hot
ones are not centred, so read them as "compared with no plan at all" — and here \`plan\` and \`monthly_recharge\` carry
the same information, which splits their weight oddly. Show the top few and keep the caveat in the caption. For a
tree ensemble, SHAP values (from S2) play the same role.

## What a demo is not

A demo is for showing and discussing a model. It is **not** the production service:

- It has no authentication (unless you add it), no rate limits and no input logging.
- Many people sharing one Streamlit process is fine for a review, not for the call-centre's traffic.
- If the demo loads its own copy of the model, it can drift from what the API serves. For anything beyond a
  meeting, have the demo **call the API** (\`requests.post(API_URL + "/predict", json=...)\`) so both show the same model.

## Sharing it

\`streamlit run demo.py\` serves it locally (by default on port 8501). To share: Streamlit Community Cloud or a
Hugging Face Space from a GitHub repository, with \`requirements.txt\` pinned to the training versions and any
secrets in the platform's secrets settings (\`st.secrets\`), never in the code. Use simulated or anonymised data — a
public demo with real customer records is a data breach.`,
    mcqs: [
      mcq('A user moves one slider in a Streamlit app. What does Streamlit do?', [
        ['It reruns the whole script from the top, with the new slider value', true],
        ['It reruns only the lines that use the slider\'s new value, then it stops', false],
        ['It sends the new value to the server and waits for a button press', false],
        ['It updates the slider in the browser and leaves the script alone', false],
      ], 'Streamlit\'s model is "rerun everything on every interaction". That is why slow steps are cached and why a form is used to batch several inputs into one run.'),
      mcq('Which decorator suits loading the churn pipeline in a Streamlit app?', [
        ['@st.cache_resource, which keeps one shared object for all users', true],
        ['@st.cache_data, which hands every caller a fresh copy of the model', false],
        ['No decorator, since Streamlit loads each file only once by default', false],
        ['@st.fragment, which saves the model to the browser\'s local storage', false],
      ], 'A model is a resource: one object shared across sessions. cache_data is for data such as DataFrames, where returning copies protects users from each other\'s changes.'),
      mcq('Why does the demo derive monthly_recharge from the chosen plan instead of offering it as its own input?', [
        ['So users cannot build impossible customers that the model never saw', true],
        ['Because Streamlit cannot place more than seven widgets inside a form', false],
        ['Because the pipeline drops monthly_recharge before it makes a prediction', false],
        ['So the demo runs faster, as each separate input adds one more rerun', false],
      ], 'In the data the recharge is the plan\'s price. Letting users pick both creates combinations outside the training data, and the model\'s answer for them means nothing.'),
    ],
    checkpoint: [
      ck(DEP, 'The demo will be shown to the retention head and later used by six regional managers. Why should it call the churn API rather than load its own model file?', [
        ['So the demo and the product always show the same model and version', true],
        ['Because Streamlit cannot load joblib files, so it has to use HTTP', false],
        ['Because the API is always faster than predicting inside the demo', false],
        ['So the managers can retrain the model from the demo\'s form inputs', false],
      ], 'A separate copy of the model in the demo can fall behind the deployed one. Calling the API means what people try in the demo is exactly what the product serves.'),
      ck(DEP, 'Inside st.form, a user changes four widgets and then presses the submit button. How many times does the script rerun because of this?', [
        ['Once, when the submit button is pressed', true],
        ['Four times, once for every changed widget', false],
        ['Five times, four widgets plus the button', false],
        ['Never, because forms do not rerun scripts', false],
      ], 'Widgets inside a form do not trigger reruns; the submit button does, once, with all the new values. That is why the demo puts its eight inputs in a form.'),
      ck(DEP, 'Which statement about a Streamlit demo of the churn model is correct?', [
        ['It is for showing and discussing the model, not for serving production traffic', true],
        ['It replaces the API, since it already has a URL that other systems and apps can call', false],
        ['It is safe to publish with real customer data, as long as it has no login', false],
        ['It needs no pinned requirements, because the platform installs the newest', false],
      ], 'A demo lacks authentication, logging and capacity for production use. Real customer data must not appear in a public demo, and unpinned versions can break the saved model.'),
    ],
  },

  /* ── EXPERIMENT_TRACKING ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_DEPLOYMENT_EXPERIMENT_TRACKING',
    notes: `Three weeks into a project, someone asks: "The model with AUC 0.78 — what data was it trained on, with which
settings, and is that the one we shipped?" If the answer lives in notebook cells that have since been re-run, nobody
knows. **Experiment tracking** records every training run — its parameters, metrics, model file, code version and
data — in one place you can search, so the comparison and the choice are evidence rather than memory. **MLflow** is
the most widely used open-source tool for it.

## Set up: a local store

    import mlflow, mlflow.sklearn
    mlflow.set_tracking_uri("sqlite:///mlflow.db")      # runs in a local SQLite file; artefacts under ./mlruns
    mlflow.set_experiment("telecom-churn")

To browse runs: \`mlflow ui --backend-store-uri sqlite:///mlflow.db\` and open the address it prints (port 5000 by
default). A team points the tracking URI at a shared MLflow server instead; the code does not change.

## Log every candidate the same way

    from sklearn.model_selection import StratifiedKFold, cross_val_score
    from sklearn.ensemble import HistGradientBoostingClassifier

    cv = StratifiedKFold(5, shuffle=True, random_state=0)
    def candidates():
        for C in [0.01, 1.0]:
            yield f"logreg-C{C}", build_pipeline(C=C), {"model": "logreg", "C": C}
        for lr in [0.05, 0.2]:
            p = build_pipeline()
            p.steps[-1] = ("clf", HistGradientBoostingClassifier(learning_rate=lr, max_iter=200, random_state=0))
            yield f"hgb-lr{lr}", p, {"model": "hgb", "learning_rate": lr, "max_iter": 200}

    for name, pipe, params in candidates():
        with mlflow.start_run(run_name=name):
            mlflow.log_params(params)
            mlflow.log_param("data_seed", 21)
            auc = cross_val_score(pipe, X_tr, y_tr, cv=cv, scoring="roc_auc")
            mlflow.log_metric("cv_auc_mean", auc.mean())
            mlflow.log_metric("cv_auc_std", auc.std())
            pipe.fit(X_tr, y_tr)
            trusted = ["sklearn.ensemble._hist_gradient_boosting.predictor.TreePredictor"] if params["model"] == "hgb" else None
            mlflow.sklearn.log_model(pipe, name="model", input_example=X_tr.head(3), skops_trusted_types=trusted)

What makes runs **comparable**: the same training rows, the same CV splitter with a fixed seed, and the same metric
names for every candidate — one loop, not four notebooks. Note the test set is not touched here.

## Compare

    runs = mlflow.search_runs(experiment_names=["telecom-churn"], order_by=["metrics.cv_auc_mean DESC"])
    print(runs[["tags.mlflow.runName", "params.model", "metrics.cv_auc_mean", "metrics.cv_auc_std"]].round(4))

    tags.mlflow.runName params.model  metrics.cv_auc_mean  metrics.cv_auc_std
           logreg-C0.01       logreg               0.7775              0.0215
            logreg-C1.0       logreg               0.7769              0.0224
             hgb-lr0.05          hgb               0.7400              0.0146
              hgb-lr0.2          hgb               0.7106              0.0127

\`search_runs\` returns a pandas DataFrame, so comparison is ordinary pandas. Read it honestly: the two logistic
runs differ by **0.0006** with a fold-to-fold standard deviation of about **0.02** — that is a tie, and either is
fine. The boosted models are clearly worse here (the data was generated from a logistic formula, so a linear model
fits it well). The choice: logistic regression, and with a tie, the simpler or more regularised one.

## What else to log

- **Data version:** a hash of the training file (\`hashlib.sha256(open(path, "rb").read()).hexdigest()\`) or a
  dataset ID, as a parameter. A metric without its data is uninterpretable.
- **Code version:** run training from a script in a git repository and MLflow records the commit
  (\`mlflow.source.git.commit\`) as a tag; from a notebook, log it yourself.
- **Artefacts:** \`mlflow.log_figure\` for a calibration plot, \`mlflow.log_dict\` for the feature list and threshold.
- **The environment:** \`log_model\` writes a \`requirements.txt\` it infers from what is imported. Read it: in this
  run it also captured \`torch\` because torch was installed in the environment, which the churn model does not
  need. Pass \`pip_requirements=[...]\` with exact versions when inference picks up too much.

\`mlflow.sklearn.autolog()\` logs parameters, training metrics and the model automatically. It is handy for
exploration, but it does not know your CV scheme or the business metric — log those explicitly.

## Register the model you ship

The **model registry** gives the chosen model a name and numbered versions, and an **alias** says which version is
in use:

    from mlflow import MlflowClient
    run_id = mlflow.search_runs(experiment_names=["telecom-churn"], filter_string="params.model = 'logreg'",
                                order_by=["metrics.cv_auc_mean DESC"], max_results=1).loc[0, "run_id"]
    mv = mlflow.register_model(f"runs:/{run_id}/model", "telecom-churn")
    MlflowClient().set_registered_model_alias("telecom-churn", "champion", mv.version)

    m = mlflow.sklearn.load_model("models:/telecom-churn@champion")
    print("test AUC", round(roc_auc_score(y_te, m.predict_proba(X_te)[:, 1]), 3))

    Created version '1' of model 'telecom-churn'.
    test AUC 0.75

The test set is used **once**, on the chosen model, and that number is logged to its run. The API then loads
\`models:/telecom-churn@champion\`; promoting a retrained model is moving the alias to a new version, and rolling back
is moving it back — no code change.

## MLflow 2 versus 3

Tutorials differ, so know the changes (this unit ran MLflow 3.17):

- \`log_model(..., name="model")\` replaces \`artifact_path="model"\`. Logged models are first-class objects with
  their own IDs (\`models:/m-...\`); \`log_model\` returns a \`ModelInfo\` whose \`model_uri\` you can pass straight to
  \`register_model\`. The older \`runs:/<run_id>/model\` still works — here MLflow logged a warning that the run had no
  artefact at that path and registered the logged model instead.
- Registry **stages** (Staging/Production) are deprecated in favour of **aliases** such as \`@champion\`.
- In 3.17, scikit-learn models are saved with **skops** by default, not pickle. A model with types skops does not
  trust by default (here the gradient-boosting \`TreePredictor\`) fails to log until you name them in
  \`skops_trusted_types\` — the same review-then-trust rule as the saving unit.`,
    workedExample: `**Task: an agritech's crop-yield team has 40 runs in MLflow from three people. The manager asks which model to
put in production. The top of the sorted table shows R² 0.91, 0.86 and 0.85.**

**Step 1 — Check the runs are comparable.** Filter to runs that logged the same data hash and the same CV scheme.
The 0.91 run logged \`data_hash\` of a different file — Pooja's run included the 2025 kharif season, which the others
held out as the test set. It is not comparable; it was evaluated partly on its own test data.

**Step 2 — Compare like with like.** Among comparable runs: 0.86 ± 0.03 (gradient boosting, 600 trees) and 0.85 ±
0.02 (random forest). A difference of 0.01 against a standard deviation of 0.02–0.03 is a tie.

**Step 3 — Break the tie on what matters in production.** From the logged artefacts: the boosted model is 3 MB and
predicts a district in 5 ms; the forest is 240 MB. Error by state (a logged figure) shows the boosted model is
better in rain-fed districts, which the business cares about most.

**Step 4 — Test once.** Load the chosen run's model, score the held-out 2025 kharif season once, and log the
result to that run.

**Step 5 — Register and alias.** Register it as \`crop-yield\`, set alias \`champion\`, and write in the version's
description why it was chosen and what it was tested on.

**Step 6 — Fix the process.** One training script that logs the data hash, the CV scheme and fixed metric names,
so the next comparison needs no detective work.

**What to say:** "The top run wasn't comparable — it trained on our test season. Among comparable runs, the top two
tied within noise; I chose the smaller, faster one that's better where it matters, tested it once on the held-out
season, and registered it as the champion."`,
    mcqs: [
      mcq('Two runs have cv_auc_mean 0.7775 and 0.7769, each with cv_auc_std near 0.022. What should you conclude?', [
        ['They are tied within noise; pick on simplicity, cost or other evidence', true],
        ['The first run is better and should be shipped, since it scored higher on CV', false],
        ['The second run is better, because a lower AUC means less overfitting', false],
        ['Neither can be used until both reach a standard deviation below 0.001', false],
      ], 'A gap of 0.0006 is tiny next to fold-to-fold variation of about 0.02. Treat it as a tie and decide on other grounds.'),
      mcq('In MLflow 3, how do you point a serving app at whichever model version is currently approved?', [
        ['Load models:/telecom-churn@champion and move the alias when a version is promoted', true],
        ['Load the newest run in the experiment, because the latest run is always the best', false],
        ['Copy the model file into the app\'s repository each time a new run finishes', false],
        ['Load the version whose stage is "Production", the recommended way in MLflow 3', false],
      ], 'Aliases name a version without changing code: promoting or rolling back moves the alias. Stages are deprecated in favour of aliases.'),
      mcq('Why log a hash of the training data file as a parameter of each run?', [
        ['So you can tell whether two runs were trained on the same data', true],
        ['So MLflow can rebuild the training file from the hash if needed', false],
        ['So that the run is encrypted and other teams cannot read metrics', false],
        ['Because MLflow will not log metrics until a data hash is present', false],
      ], 'A metric is only comparable with another trained and evaluated on the same data. The hash identifies the data; it cannot reconstruct it.'),
    ],
    checkpoint: [
      ck(EXP, 'A teammate\'s run reports AUC 0.81 against everyone else\'s 0.78, but logged a metric named "auc" while the rest logged "cv_auc_mean". What is the first check?', [
        ['Whether the 0.81 was measured the same way, on the same data and splits', true],
        ['Whether the 0.81 run used a newer MLflow release than the other runs did', false],
        ['Whether the run name follows the team\'s naming rules for this experiment', false],
        ['Whether the 0.81 run logged its model file with a different flavour type', false],
      ], 'A different metric name often means a different measurement — a single split, training AUC or other data. Comparable runs log the same metric from the same procedure.'),
      ck(EXP, 'When should the held-out test set be used in a tracked experiment?', [
        ['Once, on the model chosen from the logged CV results, with the score logged to its run', true],
        ['On every run, so that the runs can be sorted by test score when it is time to choose', false],
        ['Never; the cross-validation score already stands in for the test score in every case', false],
        ['After every new hyperparameter value, so that the search can be steered by test data', false],
      ], 'Sorting runs by test score turns the test set into a validation set and inflates the estimate. Choose on CV, then test the chosen model once.'),
      ck(EXP, 'MLflow 3.17 refuses to log a HistGradientBoosting pipeline, naming TreePredictor as an untrusted type. What is going on?', [
        ['It saves scikit-learn models with skops by default and wants that type trusted explicitly', true],
        ['The model is too large to log, and MLflow stores trees only when they are compressed first', false],
        ['HistGradientBoosting cannot be logged, so the run must switch to a different model family', false],
        ['The tracking store is SQLite, which cannot hold the tree arrays that boosted models contain', false],
      ], 'Recent MLflow 3 releases default to skops serialization for scikit-learn. A type outside skops\'s default trusted set must be named in skops_trusted_types after review.'),
    ],
  },

  /* ── MONITORING_DRIFT ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_DEPLOYMENT_MONITORING_DRIFT',
    notes: `A deployed model does not break the way code breaks. It keeps returning probabilities, the API keeps answering 200,
and the numbers slowly stop meaning what they did. Customers change, a competitor launches an offer, the app team
starts sending data in different units. **Monitoring** is how you find out before the business does.

## What can change

- **Data drift (covariate shift):** the inputs' distribution changes. A 5G data pack launches and data use jumps;
  a campaign brings in thousands of new customers with short tenure.
- **Concept drift:** the relationship between inputs and the target changes. A rival's cheap dual-SIM plan makes
  dual-SIM customers far more likely to leave — the same customer profile now churns more.
- **Data quality problems:** a pipeline sends nulls, a unit changes (MB instead of GB), a category is renamed.
  Not drift in the statistical sense, but the most common real failure — check these first.

## Measuring data drift: PSI

The **Population Stability Index** compares a feature's distribution now with a reference (the training data):
cut the reference into bins (deciles), and for each bin compare the share of reference rows r with the share of
current rows c:

    PSI = Σ (c − r) × ln(c / r)

    def psi(ref, cur, bins=10):
        edges = np.unique(np.quantile(ref, np.linspace(0, 1, bins + 1)))
        edges[0], edges[-1] = -np.inf, np.inf
        r = np.histogram(ref, edges)[0] / len(ref)
        c = np.histogram(cur, edges)[0] / len(cur)
        r, c = np.clip(r, 1e-4, None), np.clip(c, 1e-4, None)     # avoid log(0) for empty bins
        return float(np.sum((c - r) * np.log(c / r)))

A common rule of thumb from credit scoring: **below 0.1 stable, 0.1–0.25 worth investigating, above 0.25 a major
shift.** These are conventions, not statistical tests.

A production month for the churn model, simulated: a 5G pack raised data use by 60%, and a campaign made 30% of
customers brand new (tenure 1–3 months).

    ref = make_churn()                         # training-time data
    cur = make_churn(n=3000, seed=99)
    cur["data_gb"] = np.round(cur["data_gb"] * 1.6, 1)
    new = rng.random(len(cur)) < 0.30
    cur.loc[new, "tenure_months"] = rng.integers(1, 4, new.sum())
    for col in ["tenure_months", "data_gb", "call_drops", "days_since_recharge"]:
        ks = ks_2samp(ref[col], cur[col])
        print(f"{col:22s} PSI {psi(ref[col], cur[col]):.3f}  KS p={ks.pvalue:.2g}")

    tenure_months          PSI 0.454  KS p=2.2e-140
    data_gb                PSI 0.439  KS p=1.7e-126
    call_drops             PSI 0.003  KS p=0.86
    days_since_recharge    PSI 0.007  KS p=0.8

The two changed features stand out; the untouched ones are near zero. For categorical features, compare category
shares the same way (here every plan's share moved by under half a point).

## Why not just a statistical test?

The Kolmogorov–Smirnov test asks "are these two samples from exactly the same distribution?" With production
volumes the answer is almost always "no", even when nothing important changed:

    2% shift, n=200k: PSI 0.0010  KS p=3.6e-23

A 2% rise in data use across 2 lakh customers is "highly significant" and practically irrelevant. With large
samples, judge drift by **size** (PSI, the change in mean or share), not by p-value.

## Watch the model's output too

    score PSI 0.044; mean score ref 0.196 cur 0.222

The scores moved much less than two of the inputs. Not every input shift matters to the model: a change in a
feature with a small coefficient barely moves the output. **Prediction drift** — the score distribution and the
share of customers above the offer threshold — is cheap to watch daily and tells you whether the business
decision is changing.

## Concept drift needs labels — and churn labels arrive late

A churn label is known only a month after the prediction (did they recharge?). Scoring three months against their
real outcomes, the last one after a rival launched a cheap dual-SIM plan:

    Jul (as trained)             AUC 0.768  mean predicted 0.190  actual churn 0.182
    Aug (as trained)             AUC 0.742  mean predicted 0.195  actual churn 0.196
    Sep (rival dual-SIM offer)   AUC 0.743  mean predicted 0.200  actual churn 0.288

In September **no input drifted** — the customers looked the same — and the AUC held, because the model still ranks
customers well. But the model predicts 20% churn where 28.8% happened: it is **miscalibrated**, so the break-even
threshold now targets too few customers and the offer's economics are wrong. Feature drift checks could never have
seen this; only the delayed labels show it. Monitor **AUC and calibration (mean predicted vs actual) per labelled
month**, and while waiting for labels, watch proxies (recharge rates in the first two weeks, port-out requests).

## When to retrain

A monitoring plan states rules in advance:

| Signal | Check | Action |
|---|---|---|
| Input data quality | Every batch: nulls, ranges, unknown categories | Alert and fix the pipeline; do not retrain on broken data |
| Feature drift | Weekly PSI on the top features | Above 0.25: investigate — is the change real and expected? |
| Prediction drift | Daily score distribution and share above threshold | A sudden jump: check inputs and upstream changes first |
| Performance | Monthly, when labels arrive: AUC and mean predicted vs actual | AUC below 0.72, or a calibration gap above 20% relative: retrain |

Retraining means training a **challenger** on recent data with the same tracked procedure, comparing it with the
**champion** on the same latest labelled month, and moving the registry alias only if it wins. A drift alert is a
reason to look, not an automatic reason to retrain: the 5G pack is a real, expected change — note it, check that
performance holds, and retrain when the labels show the model is hurt.`,
    workedExample: `**Task: a hospital network's no-show model (predicting which outpatients will miss appointments, so the call centre
can remind them) has a PSI alert of 0.38 on "days_between_booking_and_visit". The operations head asks whether
the model is broken.**

**Step 1 — Is the data right?** Check the raw values: the median gap went from 9 days to 21. The booking system
team confirms nothing changed in how the field is computed. So it is a real change, not a bug.

**Step 2 — Find the cause.** A new online booking portal launched last month; patients now book further ahead.
This is data drift with a known cause.

**Step 3 — Does it hurt the model?** No-show labels arrive on the visit day, so most of the first month is
labelled. The model's AUC on portal bookings is 0.71 against 0.74 historically; mean predicted no-show 18%, actual
24% for long-gap bookings. Long gaps were rare in training, so the model under-predicts them.

**Step 4 — Decide.** Retrain on the last six months with a flag for portal bookings; evaluate the challenger on
the most recent labelled month against the current model; promote it only if it is better there, both in AUC and
in calibration for long-gap bookings.

**Step 5 — Adjust the monitor.** Reset the reference distribution to the new model's training data after the
retrain, so the alert does not fire forever on a change that is now understood, and add the portal share as a
monitored field.

**What to say:** "The alert is a real change: the new portal makes people book further ahead. The model is
under-predicting no-shows for those bookings by about six points, so we're retraining with recent data and will
switch only if the new model is better on last month's appointments."`,
    mcqs: [
      mcq('Reference bin shares are 0.5, 0.3 and 0.2; current shares are 0.3, 0.3 and 0.4. What is the PSI, to two decimals?', [
        ['0.24', true],
        ['0.40', false],
        ['0.10', false],
        ['0.14', false],
      ], 'PSI = (0.3 − 0.5)·ln(0.6) + 0 + (0.4 − 0.2)·ln(2) = 0.102 + 0.139 = 0.24 — a shift worth investigating.'),
      mcq('In September the inputs did not drift and AUC held at 0.743, but actual churn was 28.8% against 20% predicted. What kind of change is this?', [
        ['Concept drift that broke calibration while leaving the ranking intact', true],
        ['Data drift in the inputs, which PSI on the features would have caught', false],
        ['No real change, since the AUC stayed close to its value in training', false],
        ['A data quality fault, because the labels must have been entered wrongly', false],
      ], 'The customers looked the same but behaved differently: the input–outcome relationship moved. Ranking survived, so AUC held; the probabilities no longer match reality, which breaks threshold economics.'),
      mcq('A 2% rise in data use across 2 lakh customers gives a KS p-value of 3.6e-23 and a PSI of 0.001. How should this be read?', [
        ['A tiny, practically unimportant shift that is detectable only because n is huge', true],
        ['A major shift, since a p-value that small proves the model is now badly wrong', false],
        ['A sign the KS test is broken, because PSI and KS must always agree on drift', false],
        ['A shift that requires immediate retraining, as any significant change does', false],
      ], 'With huge samples, every small difference is statistically significant. Effect-size measures such as PSI say whether it is large enough to matter.'),
    ],
    checkpoint: [
      ck(MON, 'The churn label for a prediction is known only a month later. What should be monitored daily in the meantime?', [
        ['Input quality, feature drift and the distribution of the predicted scores', true],
        ['The AUC of the day\'s predictions, computed against the day\'s own scores', false],
        ['Nothing at all, since monitoring a model is impossible without the labels', false],
        ['The training loss of the model, recomputed each day on the training data', false],
      ], 'Before labels arrive, data quality, input drift and prediction drift (plus early proxies) are what can be observed. Performance is checked when labels land.'),
      ck(MON, 'A 5G data pack launch pushes the data_gb PSI to 0.44. What is the sound response?', [
        ['Confirm the cause, then check whether the model\'s performance and scores are affected', true],
        ['Retrain at once, because any PSI above 0.25 means the model has stopped working properly', false],
        ['Remove data_gb from monitoring, since the change is real and expected by everyone', false],
        ['Clip data_gb back to the training range in the API, so the drift disappears', false],
      ], 'A drift alert is a reason to look. A real, explained change may or may not hurt the model; performance and score drift decide whether to retrain. Hiding it, or clipping inputs, only hides it.'),
      ck(MON, 'A retrained challenger and the current champion must be compared before switching. Which comparison is fair?', [
        ['Both scored on the same most recent labelled month that neither was trained on', true],
        ['The challenger\'s CV score on recent data against the champion\'s old test score', false],
        ['Each model scored on its own training data, since both were fitted the same way', false],
        ['The challenger\'s test AUC against the champion\'s AUC on the September labels', false],
      ], 'Only the same evaluation data makes the comparison fair. Old test scores and training scores measure different things on different data.'),
    ],
  },

  /* ── DOCKER_CLOUD ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_DEPLOYMENT_DOCKER_CLOUD',
    notes: `"It works on my laptop" is not a deployment. The churn API needs a specific Python, exact library versions, the model
file and a few settings, on a machine you did not set up. A **container image** bundles the code, the dependencies
and the model into one artefact that runs the same anywhere Docker runs; a cloud host runs that image and keeps it
up. Docker itself is taught in the full-stack tracks; this unit covers what is particular to a model service.
(Docker was not run for this unit: the Dockerfile and commands follow the documentation, and their output is
illustrative. The configuration code was run.)

## The project layout

    churn-api/
      app/
        main.py              # the FastAPI service from the serving unit
        features.py          # any custom transformers the pipeline imports
      models/
        churn_pipeline.joblib
        churn_pipeline.meta.json
      tests/test_api.py
      requirements.txt
      Dockerfile
      .dockerignore

## Pinned requirements — the versions the model was trained with

    scikit-learn==1.9.1
    numpy==2.5.4
    pandas==3.0.6
    joblib==1.6.0
    fastapi==0.156.8
    uvicorn==0.54.0

The first four must match the training environment exactly (the metadata file says which); the saved pipeline is
not portable across scikit-learn releases.

## The Dockerfile

    FROM python:3.13-slim
    WORKDIR /app
    ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

    COPY requirements.txt .
    RUN pip install --no-cache-dir -r requirements.txt

    COPY app/ ./app/
    COPY models/ ./models/

    RUN useradd --create-home appuser
    USER appuser

    EXPOSE 8000
    CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]

Each line has a reason:

- **The same Python minor version as training** (the model was saved under 3.13), on a slim base.
- **Requirements before code.** Docker caches each layer; copying \`requirements.txt\` and installing first means a
  code change does not reinstall every library.
- **\`--host 0.0.0.0\`**, or the server listens only inside the container and nothing outside can reach it.
- **A non-root user**, so a compromised process has less to break.
- **\`.dockerignore\`** listing \`mlruns/\`, \`data/\`, \`notebooks/\`, \`.venv/\` and \`.env\` — the image needs neither
  training data nor secrets, and copying them in makes it larger and leaks them.

**Model in the image, or fetched at start?** Baking the file in (as above) makes the image self-contained: the
image tag identifies code *and* model, and rollback is redeploying the previous tag. Downloading at startup from
the MLflow registry or object storage (\`models:/telecom-churn@champion\`) lets you change the model without a new
image, but the container now depends on that store being reachable and the alias being right. Small teams usually
bake it in; either way, log the model version at startup.

## Configuration from the environment

Settings that differ between laptop, staging and production — the model path, the model version, the offer
threshold, any API keys — come from environment variables, not the code:

    def load_config():
        return {
            "model_path": os.environ.get("MODEL_PATH", "/app/models/churn_pipeline.joblib"),
            "model_version": os.environ["MODEL_VERSION"],          # required: no silent default
            "threshold": float(os.environ.get("OFFER_THRESHOLD", "0.278")),
        }

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        cfg = load_config()
        state["model"] = joblib.load(cfg["model_path"])             # fail at startup, not on the first request
        state["cfg"] = cfg
        yield

Run through TestClient with different environments:

    MODEL_VERSION unset                       -> startup failed: KeyError 'MODEL_VERSION'
    MODEL_VERSION=churn-lr-2026-10-01, OFFER_THRESHOLD=0.30
                                              -> {'status': 'ok', 'model_version': 'churn-lr-2026-10-01', 'threshold': 0.3}
    MODEL_PATH=models/missing.joblib          -> startup failed: FileNotFoundError [Errno 2] No such file or directory: 'models/missing.joblib'

**Fail fast**: a container missing its configuration or its model should refuse to start, so the platform never
sends it traffic — far better than starting and returning 500 on every request. (The Python track's FastAPI topic
uses \`pydantic-settings\` for this; the idea is the same.) Secrets go in the host's secret store and arrive as
environment variables; they never go into the image or the repository.

## Build, run, check (illustrative)

    docker build -t churn-api:2026-10-01 .
    docker run -p 8000:8000 -e MODEL_VERSION=churn-lr-2026-10-01 churn-api:2026-10-01
    curl http://localhost:8000/health

The health response is the same JSON the TestClient returned. Tag images with something meaningful (a date or the
git commit), never only \`latest\`, so you know what is running and can roll back.

## Deploying to a cloud host

Managed container services — Google Cloud Run, AWS App Runner or ECS, Azure Container Apps, Render — follow the
same steps:

1. Push the image to a registry (Artifact Registry, ECR, ACR, Docker Hub).
2. Create the service from the image; set the port (8000), the environment variables, and secrets from the
   secret store.
3. Set the **health check path** to \`/health\`. The platform sends traffic only to healthy containers and replaces
   failed ones.
4. Size memory for the model: each uvicorn worker loads its own copy. Two workers and a 4 KB logistic model need
   little; four workers and a 91 MB forest need about 364 MB for the models alone.
5. Restrict who can call it (an API key, or network rules so only the campaign tool and call-centre app reach it).

A health check that only returns \`{"status": "ok"}\` proves the process is alive. A better one also confirms the
model is loaded and returns its version — and the startup known-answer test from the saving unit catches a model
that loaded but scores differently.`,
    mcqs: [
      mcq('Why does the Dockerfile copy requirements.txt and install it before copying the application code?', [
        ['So a code change reuses the cached dependency layer instead of reinstalling everything', true],
        ['Because pip refuses to install packages when the application code is already present in the image', false],
        ['So that the code is compiled against the libraries, which makes the image run faster', false],
        ['Because Docker builds the instructions in reverse order, so the code is copied first', false],
      ], 'Docker caches layers and rebuilds from the first changed one. With dependencies installed first, editing main.py rebuilds only the cheap layers after it.'),
      mcq('The container starts, but nothing outside it can reach the API on port 8000. Which mistake is most likely?', [
        ['uvicorn is listening on 127.0.0.1 instead of 0.0.0.0', true],
        ['The model file inside the image is a joblib file', false],
        ['The image is based on python:3.13-slim, not full', false],
        ['The health endpoint returns JSON and not plain text', false],
      ], 'Bound to 127.0.0.1, the server accepts connections only from inside the container. --host 0.0.0.0 listens on all interfaces, so the published port works.'),
      mcq('The service needs MODEL_VERSION to start. Which behaviour is best when it is missing?', [
        ['Refuse to start, so the platform never routes traffic to a misconfigured container', true],
        ['Start with the version set to "unknown", and log a warning on every single request', false],
        ['Start and return a 500 for each request until somebody notices and sets the variable', false],
        ['Read the version from the newest model file in the folder, whichever one that may be', false],
      ], 'Failing fast at startup makes the health check fail and the deployment stop, instead of serving untraceable or broken predictions.'),
    ],
    checkpoint: [
      ck(DEP, 'Which of these should be listed in the churn API\'s .dockerignore file?', [
        ['The mlruns folder, the training data and the .env file', true],
        ['The requirements.txt file and the application folder', false],
        ['The models folder holding the saved churn pipeline file', false],
        ['The Dockerfile itself and the test folder for the API', false],
      ], 'The image needs the code, requirements and model. Experiment artefacts and data add size, and .env holds secrets that must never be baked into an image.'),
      ck(DEP, 'What does baking the model file into the image give you, compared with downloading it at startup?', [
        ['An image tag that identifies both the code and the model, so rollback is redeploying the old tag', true],
        ['A model that updates itself whenever the registry alias moves, without redeploying anything', false],
        ['A smaller image, because the model is compressed into the base image during the docker build', false],
        ['Protection against version mismatch, because Docker converts the model to the new scikit-learn', false],
      ], 'A self-contained image pins code and model together. Downloading at startup allows model changes without a rebuild but adds a dependency on the registry being reachable and correct.'),
      ck(DEP, 'A cloud host runs four uvicorn workers of an API whose model file is 91 MB. Roughly how much memory do the loaded models alone need?', [
        ['About 364 MB, as every worker process loads its own copy', true],
        ['About 91 MB, since the workers share one copy of the model', false],
        ['About 23 MB, as the model is divided among the four workers', false],
        ['Almost none, because the model stays on disk until it is used', false],
      ], 'Workers are separate processes and each loads the model in lifespan. Memory scales with workers × model size.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_DEPLOYMENT_DEBUGGING',
    notes: `Deployment faults are rarely in the model. They sit in the seams — between the notebook and the file, the file and
the server, the server and its callers, last month's data and this month's. Eight faults, each with symptom, cause
and fix, that reach real model services.

## 1. The pickle that will not load on the server

**Symptom:** \`InconsistentVersionWarning: Trying to unpickle estimator StandardScaler from version 1.6.1 when using
version 1.9.1\` in the logs — or an \`AttributeError\` naming a private scikit-learn attribute — and predictions that
differ slightly from the notebook's.
**Cause:** the server installed the newest scikit-learn; the model was saved with an older one. Pickled estimators
store version-specific internals.
**Fix:** pin the training versions in \`requirements.txt\` and install exactly those; record them in the metadata
file; to upgrade, retrain and re-save. Add a known-answer test that runs at startup.

## 2. The model is loaded on every request

**Symptom:** each prediction takes about 300 ms although the model predicts in about 40; disk reads spike with
traffic.
**Cause:** \`joblib.load(...)\` inside the handler. For the 91 MB forest, loading took 259 ms of every request.
**Fix:** load once in \`lifespan\` (or at module import) and keep it in application state. Measure memory per worker
afterwards.

## 3. A new circle crashes the API

**Symptom:** the API returns **500** for some customers; the log shows \`ValueError: Found unknown categories
['Assam'] in column 1 during transform\`.
**Cause:** the encoder was fitted with the default \`handle_unknown="error"\`, and the schema accepted any string.
The operator expanded into a circle the model never saw.
**Fix:** decide per field — \`OneHotEncoder(handle_unknown="ignore")\` to keep scoring (the customer is treated as in
no known circle), or a \`Literal[...]\` of known values so the caller gets a clear 422. Log unknown values either way;
a new circle is a retraining signal.

## 4. The Streamlit demo retrains on every click

**Symptom:** the demo takes eight seconds to respond to each slider move and gives slightly different risks for the
same inputs.
**Cause:** the script reads the CSV and calls \`fit\` at the top. Streamlit reruns the whole script on every
interaction, so it retrains every time — with a random split, so the model changes too.
**Fix:** train offline, save the pipeline, and load it with \`@st.cache_resource\`. Put the inputs in an
\`st.form\` so the script reruns once per submission.

## 5. MLflow runs that cannot be compared

**Symptom:** the runs table has AUCs from 0.74 to 0.83 and nobody can say which model is best; some runs have
\`auc\`, others \`roc_auc\` or \`val_auc\`.
**Cause:** each person trained in their own notebook — different splits, some on a single validation split, one
on training data, different metric names, no data version.
**Fix:** one training script used by everyone: the same split and CV seed, a fixed set of metric names, and the
data hash and git commit logged on every run. Old runs that do not follow it are archived, not compared.

## 6. A drift alert on a feature that legitimately changed

**Symptom:** the data_gb PSI alert has fired every week for a month (0.44). The team now ignores all alerts.
**Cause:** a 5G data pack launched; data use really rose. The alert is correct and uninformative after the first
week, and nobody checked whether the model was affected.
**Fix:** investigate once — confirm the cause, check score drift and the next labelled month's AUC and
calibration. If the model holds, record the change and reset the reference after the next retrain; if not,
retrain. Alerts that fire forever train people to ignore the one that matters.

## 7. Correct code, wrong unit

**Symptom:** after the mobile app team's release, the share of customers flagged for the offer drops from 26% to
11%; no errors anywhere.
**Cause:** the app began sending \`data_gb\` in megabytes (3,500 instead of 3.5). The schema allowed any value ≥ 0,
so every heavy-looking user was scored as very loyal. This is **training–serving skew**: the model receives
something different from what it was trained on.
**Fix:** state units in the schema (\`Field(ge=0, le=500, description="GB per month")\`), so absurd values are a
422; monitor input ranges and the share above threshold; agree the contract with the calling team in writing.

## 8. The custom transformer cannot be found

**Symptom:** the API fails at startup with \`AttributeError: Can't get attribute 'cap_gb' on <module '__main__' ...>\`.
**Cause:** \`cap_gb\` was defined in the training notebook. Pickle saves a function as a reference to its module and
name, and the API process has no \`__main__.cap_gb\`.
**Fix:** move custom functions and classes into a module (\`app/features.py\`) that both the training code and the
API import, then retrain and re-save so the pickle references \`features.cap_gb\`.

## A debugging order for model services

1. Did the service start, with the model and version you expected? (Logs, \`/health\`.)
2. Does a known customer score what it scored at training time? (The known-answer test.)
3. Are the inputs what training saw — names, units, categories, ranges?
4. Only then: has the world changed? (Drift and labelled performance.)`,
    mcqs: [
      mcq('After an app release, the share of customers flagged for the offer drops from 26% to 11%, with no errors logged. What should be checked first?', [
        ['Whether the inputs changed units or meaning, by comparing their ranges with training', true],
        ['Whether customers suddenly became loyal, by surveying a sample of flagged customers', false],
        ['Whether the model needs more trees, by retraining it with a much larger ensemble size', false],
        ['Whether the API is too slow, by load testing the predict endpoint at peak traffic', false],
      ], 'A sudden shift right after an upstream release points to training–serving skew — here data_gb arriving in MB. Input range checks find it in minutes.'),
      mcq('A Streamlit demo takes eight seconds per click and gives slightly different risks for the same inputs. What is the cause?', [
        ['The script retrains the model at the top, and Streamlit reruns the script on every interaction', true],
        ['Streamlit adds random noise to each prediction to protect the privacy of the underlying data', false],
        ['The browser is caching old predictions and mixing them with the new ones on every refresh', false],
        ['The model was saved with joblib, which loads a slightly different copy of it on each read', false],
      ], 'Every interaction reruns the script, so a fit at the top retrains each time — slow, and with a random split, a different model. Train offline and load with @st.cache_resource.'),
      mcq('The API logs "Found unknown categories [\'Assam\'] in column 1 during transform" and returns 500. Which fix is appropriate?', [
        ['Use handle_unknown="ignore" or restrict circle to known values, and log unknown circles', true],
        ['Retrain the model on every request so that each new circle is learned the moment it appears', false],
        ['Catch the exception in the endpoint and return a churn probability of 0.5 for the customer', false],
        ['Remove the circle column from the request body, so callers can never send the field at all', false],
      ], 'Either score with the unknown circle encoded as all zeros or reject it clearly with a 422; both beat a 500. A made-up 0.5 hides the problem, and dropping the field breaks the pipeline.'),
      mcq('The data_gb drift alert has fired weekly for a month after a 5G pack launch, and the team now ignores all alerts. What fixes this?', [
        ['Investigate once, check performance, record the change, reset the reference later', true],
        ['Raise every alert\'s PSI threshold to 1.0 so that no alert fires again for any feature', false],
        ['Delete data_gb from the model, because a feature that drifts can no longer be trusted', false],
        ['Retrain the model every single week until the alert on data_gb stops firing by itself', false],
      ], 'A real change deserves one investigation and a decision based on performance. Alerts that fire forever teach people to ignore them; silencing all of them or dropping the feature throws away information.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_DEPLOYMENT_PRACTICE',
    notes: `Six exercises. Work each on paper or in a notebook before reading the answer; the numbers were checked in Python
(the timings are from the units' laptop runs).

## Exercise 1 — PSI by hand

A feature's training data was cut into three bins holding 50%, 30% and 20% of customers. This month the same bins
hold 30%, 30% and 40%. Compute the PSI and say what the rule of thumb makes of it.

**Answer.** PSI = Σ (c − r)·ln(c / r):
(0.3 − 0.5)·ln(0.6) = (−0.2)(−0.511) = 0.102; the middle bin contributes 0; (0.4 − 0.2)·ln(2) = 0.2 × 0.693 = 0.139.
Total **0.241** — in the "investigate" band (0.1–0.25), at its top. Note both terms are positive: PSI adds up movement
in either direction.

## Exercise 2 — Load once

Measured on one machine: loading the 91 MB forest pipeline takes 259 ms; one prediction takes 42 ms. One worker
handles one request at a time. How many requests per second can it serve if the model is loaded on every request,
and if it is loaded once?

**Answer.** Per request 259 + 42 = 301 ms → 1000 / 301 ≈ **3.3 requests/s**. Loaded once: 1000 / 42 ≈ **23.8
requests/s** — about 7× more from moving one line. With four workers, the loaded-once service needs about 4 × 91 =
364 MB for the models.

## Exercise 3 — The nightly batch

The operator scores 40 lakh customers each night. With the logistic pipeline on the same laptop, single-row
predictions took 6.54 ms each; one batch of 1,000 rows took 7.9 ms. Estimate both ways of scoring everyone.

**Answer.** Single rows: 4,000,000 × 6.54 ms = 26,160 s ≈ **7.3 hours** — before any HTTP overhead. Batches:
4,000 batches × 7.9 ms ≈ **32 seconds**. Score the table in batches with the saved pipeline; keep the real-time
endpoint for the call centre.

## Exercise 4 — A schema for a lending model

An NBFC's default model takes age (21–65), monthly income (₹, positive), loan amount (₹10,000 to ₹5,00,000), tenure
(12, 24 or 36 months), employment (salaried or self-employed), city tier (1, 2 or 3) and existing EMI (₹, default 0,
must be less than monthly income). Write the Pydantic v2 model.

**Answer.**

    from typing import Literal
    from pydantic import BaseModel, Field, model_validator

    class Applicant(BaseModel):
        age: int = Field(ge=21, le=65)
        monthly_income: int = Field(gt=0)
        loan_amount: int = Field(ge=10_000, le=5_00_000)
        tenure_months: Literal[12, 24, 36]
        employment: Literal["salaried", "self_employed"]
        city_tier: Literal[1, 2, 3]
        existing_emi: int = Field(default=0, ge=0)

        @model_validator(mode="after")
        def emi_below_income(self):
            if self.existing_emi >= self.monthly_income:
                raise ValueError("existing_emi must be less than monthly_income")
            return self

Checked: age 19 with tenure 18 gives two errors — \`Input should be greater than or equal to 21\` and \`Input should
be 12, 24 or 36\`; an EMI of 32,000 on an income of 30,000 gives \`Value error, existing_emi must be less than
monthly_income\`. The cross-field rule needs a model validator because no single field can check it.

## Exercise 5 — Review a Dockerfile

    FROM python:latest
    COPY . /app
    WORKDIR /app
    RUN pip install fastapi uvicorn scikit-learn pandas joblib
    ENV MODEL_VERSION=churn-lr-2026-10-01 DB_PASSWORD=Sup3r$ecret
    CMD ["uvicorn", "app.main:app", "--port", "8000"]

Find at least five problems.

**Answer.** (1) \`python:latest\` — the Python version changes under you; pin the training version (\`3.13-slim\`).
(2) Unpinned libraries — the next build installs a newer scikit-learn than the model was saved with; install from a
pinned \`requirements.txt\`. (3) \`COPY . /app\` before installing — every code change reinstalls everything, and
without a \`.dockerignore\` it copies data, \`mlruns\` and \`.env\` into the image. (4) A password in the image — anyone
with the image can read it; pass secrets at run time from the host's secret store. (5) No \`--host 0.0.0.0\` —
uvicorn listens on 127.0.0.1 and the service is unreachable. (6) Runs as root. (7) A model version baked into the
image as config is fine only if the model file is too; otherwise set it at deploy time.

## Exercise 6 — Write the retraining rule

The churn model's monthly labelled results: July AUC 0.768, mean predicted 0.190, actual churn 0.182; August 0.742,
0.195, 0.196; September 0.743, 0.200, 0.288. The team's rule is "retrain if AUC falls below 0.72 or the calibration
gap exceeds 20% of the actual rate". Apply it to each month and say what you would do in October.

**Answer.** Calibration gap = |predicted − actual| / actual. July: 0.008 / 0.182 = **4%**; August: 0.001 / 0.196 =
**0.5%**; September: 0.088 / 0.288 = **31%**. AUC never falls below 0.72, so only September triggers, on calibration.
In October: train a challenger including September's customers, compare it with the champion on the most recent
labelled month (AUC and calibration), and move the alias only if it wins. Until then, the offer threshold is
targeting too few customers — consider recalibrating (or lowering the threshold) as a stopgap and tell the
retention team.`,
    mcqs: [
      mcq('Reference shares in four bins are 0.25 each; current shares are 0.10, 0.20, 0.30 and 0.40. What is the PSI, to two decimals?', [
        ['0.23', true],
        ['0.30', false],
        ['0.15', false],
        ['0.07', false],
      ], 'PSI = (−0.15)ln(0.4) + (−0.05)ln(0.8) + 0.05·ln(1.2) + 0.15·ln(1.6) = 0.137 + 0.011 + 0.009 + 0.071 ≈ 0.23.'),
      mcq('Loading a model takes 180 ms and a prediction takes 20 ms. One worker serves one request at a time. How many requests per second does it handle if it loads the model on every request?', [
        ['5', true],
        ['50', false],
        ['20', false],
        ['10', false],
      ], 'Each request costs 180 + 20 = 200 ms, so 1000 / 200 = 5 per second. Loaded once, the same worker would handle 50.'),
      mcq('A model predicts a mean churn of 0.15 for a month in which 0.20 actually churned. What is the calibration gap relative to the actual rate?', [
        ['25%', true],
        ['5%', false],
        ['33%', false],
        ['15%', false],
      ], '|0.15 − 0.20| / 0.20 = 0.25. Relative to the predicted rate it would be 33%, which is why a rule must say which rate it divides by.'),
      mcq('Why does the lending schema need a model validator for "existing EMI must be less than monthly income"?', [
        ['The rule compares two fields, and a field constraint can only see its own value', true],
        ['Field constraints cannot express any "less than" rule, even against a fixed number', false],
        ['Model validators run faster than field constraints on every incoming request body', false],
        ['Pydantic v2 removed Field(lt=...), so every comparison now has to be a validator', false],
      ], 'Field(lt=...) compares with a constant. A rule involving two fields runs after the fields are validated, in a model validator.'),
      mcq('A Dockerfile sets ENV DB_PASSWORD=... in the image. What is the problem?', [
        ['Anyone who can pull the image can read the password from its configuration', true],
        ['Environment variables set in a Dockerfile cannot be read by Python at all', false],
        ['The variable is wiped at runtime, so the service can never reach the database', false],
        ['Docker refuses to build an image whose configuration contains the word PASSWORD', false],
      ], 'Image configuration and layers are readable by anyone with the image. Secrets are passed at run time from the host\'s secret store.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_DEPLOYMENT_INTERVIEW_QUESTION',
    notes: `Data-science interviews now regularly include "how would you put this in production?". Product companies and
fintechs ask it of freshers too, because a model that never leaves a notebook earns nothing. The interviewer is
listening for one saved pipeline, a validated API, versions that match, tracking, and a plan for when the world
changes. Three questions, model answers, follow-ups.

## 1. "You've built a churn model in a notebook. Walk me through getting it into production."

**Model answer.** "First I'd make the model a single artefact: the whole scikit-learn pipeline — preprocessing and
classifier — trained by a script, not a notebook, with the runs tracked in MLflow: parameters, CV metrics, the data
version and the git commit. I'd choose on cross-validation, test the chosen one once, and register it with an alias
like champion.

How it's served depends on the use. The retention campaign runs monthly, so batch scoring is enough: a scheduled
job loads the pipeline, scores the whole base in chunks and writes scores to a table. If the call centre needs a
score live, I'd add a small FastAPI service: a Pydantic schema matching the training columns with sensible ranges,
the model loaded once at startup, the model version in every response, and tests — including a known-answer test
that checks a recorded customer still gets the same score.

I'd package it in a Docker image with the exact library versions used in training, configuration from environment
variables, and a health check, and deploy to a managed container service. Finally, monitoring: input quality and
drift weekly, the score distribution daily, and AUC and calibration each month when the churn labels arrive, with a
rule for when to retrain."

**Follow-ups:**
- *"Batch or real-time — how do you choose?"* By when the decision is made. If decisions are made monthly from a
  list, batch is simpler, cheaper and easier to audit. Real-time only when the input arrives at decision time — an
  agent on a call, a loan application being filled in.
- *"What breaks most often?"* The seams, not the model: version mismatches, inputs in different units or with new
  categories, and features computed differently in training and serving.

## 2. "Your model's accuracy has dropped in production. How do you investigate?"

**Model answer.** "I'd go from the cheapest explanation to the most expensive. First, is it the data pipeline?
Check for nulls, changed units, renamed categories and new values — a field arriving in MB instead of GB looks
exactly like a model failing. Then, is it the same model? Check the version in the logs and run the known-answer
test.

If the inputs are sound, I'd look at drift: PSI per feature against the training data, and the score
distribution. That tells me whether the customers changed. Then performance on recent labelled data — AUC for
ranking and predicted versus actual rate for calibration, by segment. A model can keep its AUC and still be
miscalibrated after something like a competitor's offer; that's concept drift, and only labels show it.

If it's real drift, I'd train a challenger on recent data with the same tracked procedure, compare it with the
current model on the latest labelled month, and promote it only if it wins. And I'd tell the business what the
drop means in their terms — offers going to the wrong customers — and what I'm doing about it."

**Follow-ups:**
- *"Labels take a month to arrive. What do you do until then?"* Watch what can be seen now — input quality, drift,
  score distribution, share above threshold — and early proxies such as recharges in the first fortnight.
- *"Why not retrain automatically every week?"* Retraining on broken data bakes the bug in, and an unreviewed model
  can be worse. Scheduled retraining is fine with an automatic champion–challenger comparison and a human or a
  strict rule deciding promotion.

## 3. "Is it safe to load a model file someone sends you? How do you save models?"

**Model answer.** "Not if it's a pickle or joblib file I can't trace. Unpickling can call any function, so a file
can run code on my machine the moment I load it. I'd only load files our own training produced, from our own
storage or registry.

To save, I use the whole pipeline, so the preprocessing travels with the model, plus a metadata file with the
library versions, feature list, metrics and training date. joblib is fine inside the team; when files cross a
trust boundary I'd use skops, which checks every type in the file and refuses unknown ones until I've reviewed
them. Either way, the serving environment pins the same scikit-learn version, because pickled models aren't
guaranteed to load correctly across versions; to upgrade, I retrain and re-save."

**Follow-ups:**
- *"Does skops fix the version problem?"* No — it's about what code can run on load, not about compatibility
  between scikit-learn releases. Pinning and retraining handle versions.
- *"How do you know the loaded model is the right one?"* A known-answer test at startup, the version in the
  metadata and in every response, and the registry recording which run produced it.`,
    mcqs: [
      mcq('An interviewer asks whether the churn model should be served in real time. Which reasoning is strongest?', [
        ['Choose by when the decision is made: monthly campaigns suit batch, live calls need real time', true],
        ['Always serve in real time, since it gives fresher scores and costs about the same to run', false],
        ['Always use batch, because a real-time API cannot use a scikit-learn pipeline for scoring', false],
        ['Choose by the model type: linear models are batch-only and tree models suit real time', false],
      ], 'The serving pattern follows the decision. Batch is simpler and cheaper when decisions are made from lists; real time is needed only when the input arrives at decision time.'),
      mcq('Asked how to investigate a production accuracy drop, which first step shows the best judgement?', [
        ['Check the data pipeline and the model version before suspecting real drift', true],
        ['Retrain on the latest data straight away, then see whether accuracy recovers', false],
        ['Switch to a more complex model, since the current one has clearly gone stale', false],
        ['Ask the business to wait a quarter, so the drift can show itself more clearly', false],
      ], 'The cheapest and most common causes — broken inputs, a wrong model version — come first. Retraining on broken data bakes the bug into the next model.'),
      mcq('Asked "does skops fix the scikit-learn version problem?", which answer is correct?', [
        ['No; skops controls which types can load, and versions are handled by pinning and retraining', true],
        ['Yes; skops rewrites the model into a format that every scikit-learn release can read correctly', false],
        ['Yes; skops stores the scikit-learn source code with the model, so any version works', false],
        ['No; skops cannot store a pipeline at all, only a single estimator such as a classifier', false],
      ], 'skops is a safety measure against code execution on load. Compatibility across releases still needs matched versions or retraining.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_DEPLOYMENT_MINI_PROJECT',
    notes: `# Mini Project — Deploying the Churn Model

A prepaid telecom operator's retention team has been sent spreadsheets of churn scores by a data scientist who
re-runs a notebook each month. They want the model as a service: the campaign tool will request scores for the
whole base before each monthly offer, the call-centre app will score one customer during a call, and the team lead
wants a page she can try herself. You will take the churn model from S1 into use: tracked experiments, a saved
pipeline, a validated and tested API, a demo, a container, and a monitoring plan.

## The data

Use the S1 classification mini project's script (\`telecom_churn.csv\`, 12,000 customers) and the leakage decisions
you made there: \`port_out_request\` and \`days_since_last_recharge\` as exported are not available at the start of the
month and must not be features. Then generate a **production month** to monitor against:

    import numpy as np, pandas as pd
    rng = np.random.default_rng(77)
    prod = pd.read_csv("telecom_churn.csv").sample(3000, random_state=5).reset_index(drop=True)
    prod["data_gb_month"] = (prod["data_gb_month"] * 1.5).round(1)          # a 5G data pack launched
    newc = rng.random(len(prod)) < 0.25                                     # a campaign brought new customers
    prod.loc[newc, "tenure_months"] = rng.integers(1, 4, newc.sum())
    prod.loc[rng.choice(len(prod), 40, replace=False), "circle"] = "Assam"  # expansion into a new circle
    bug = rng.choice(len(prod), 30, replace=False)                          # an upstream bug: MB, not GB
    prod.loc[bug, "data_gb_month"] = prod.loc[bug, "data_gb_month"] * 1000
    prod.drop(columns="churned").to_csv("production_month.csv", index=False)

The file has 3,000 customers: 782 with a new short tenure, 40 in Assam and 30 with data use in megabytes. The
comments name the four changes so you can check your work — a legitimate shift in data use, a wave of new
customers, an unseen circle, and a units bug; a real export would not label them.

## Tasks

1. **Track the experiments.** In one training script (not a notebook), log at least four candidate pipelines to
   MLflow — logistic regression at two strengths and one tree ensemble at least — with the same stratified CV seed,
   the same metric names (CV ROC AUC mean and std, average precision), the data file's hash and the git commit.
   Choose one from the runs table with a reason that respects the standard deviations. Test it once; log the test
   score to its run; register it and set the alias \`champion\`.
2. **Save it properly.** The whole pipeline (any custom transformer in a module), plus a metadata JSON with library
   versions, feature list, threshold, metrics and training date. Show that the reloaded file reproduces the
   notebook's probabilities exactly.
3. **Serve it with FastAPI.** \`POST /predict\` for one customer, \`POST /predict/batch\` for up to 1,000, \`GET /health\`.
   A Pydantic schema matching the features with realistic ranges and units; the model loaded once at startup; the
   response gives probability, the offer decision at the S1 break-even threshold, and the model version. Decide
   and justify how an unseen circle is handled.
4. **Test it.** With TestClient: a known-answer test for three recorded customers, invalid input returning 422,
   the unseen-circle behaviour you chose, and batch results matching single results.
5. **Demo it.** A Streamlit page for the team lead: inputs in a form, the risk and the decision, the top drivers in
   plain words, the model version and a "simulated data" caption; the model loaded with \`@st.cache_resource\` (or the
   page calls your API).
6. **Containerise it.** A Dockerfile on the training Python version with pinned requirements, configuration from
   environment variables (the service refuses to start without \`MODEL_VERSION\`), a non-root user, \`--host 0.0.0.0\`
   and a \`.dockerignore\`. Build and run it if you have Docker; otherwise say so — the tests above must still pass.
7. **Monitor the production month.** Score \`production_month.csv\` through your batch code. Report: rows the schema
   rejects and why; unknown categories; PSI for every numeric feature and the share change for each category; the
   score distribution and share above threshold against training. Separate the **legitimate** changes from the
   **bug**, and say which you would fix and which you would watch.
8. **Write the monitoring plan** (one page): what is checked daily, weekly and monthly; thresholds; who is alerted;
   the retraining rule; and how a challenger is compared with the champion before the alias moves.

## Deliverables

1. **A repository** with \`train.py\`, \`app/\` (the API and any custom transformers), \`demo.py\`, \`tests/\`,
   \`monitor.py\`, \`Dockerfile\`, \`.dockerignore\`, \`requirements.txt\` and the saved model with its metadata.
2. **\`monitoring_report.md\`** — the production-month results with numbers, and the monitoring plan.
3. **\`README.md\`** — how to train, run the API, run the tests, run the demo, build the image, and which environment
   variables are required; plus a screenshot of the MLflow runs table and of the demo.

## Acceptance criteria

- Every candidate run logs the same metrics, CV seed, data hash and commit; the choice cites mean and std; the test
  set is used once, on the chosen model.
- The saved file is one pipeline; reloading reproduces the probabilities exactly; versions are pinned and recorded.
- The API loads the model once, validates every field with units and ranges, returns the model version, and has a
  stated, tested policy for unseen categories.
- The tests pass, including a known-answer test.
- The container configuration has no secrets in the image and fails fast without required settings.
- The monitoring report finds the units bug and the unseen circle, measures the data-use and tenure shifts with PSI,
  and distinguishes the legitimate changes from the bug.
- The plan states concrete thresholds, what labels arrive when, and the champion–challenger rule.`,
    mcqs: [
      mcq('In the project\'s production month, 30 rows have data_gb_month a thousand times too large. How should the service treat them?', [
        ['Reject them through the schema\'s upper bound and report the units bug upstream', true],
        ['Score them as normal, since the model was trained to handle extreme usage values', false],
        ['Divide by 1,000 silently whenever a value looks too large, and carry on scoring', false],
        ['Treat them as drift and retrain the model so that it learns the new data range', false],
      ], 'Values in MB are a contract breach, not a change in customers. A schema bound makes them a visible 422; silent correction guesses, and retraining on them bakes the bug in.'),
      mcq('Why must port_out_request stay out of the deployed model\'s features?', [
        ['It is known only after the month starts, so it leaks the outcome being predicted', true],
        ['It is a binary column, and the API schema cannot validate a binary input field', false],
        ['It has too few distinct values to be any use to a logistic regression model', false],
        ['It is a personal detail that the telecom regulator forbids any model to use', false],
      ], 'A port-out request is part of leaving. At scoring time, the start of the month, it is not yet known — the S1 leakage audit dropped it for that reason.'),
    ],
    assignment: {
      title: 'Deploying the Churn Model',
      description: 'Take the S1 telecom churn model into use: tracked MLflow experiments, a saved and versioned pipeline, a validated and tested FastAPI service, a Streamlit demo, a container with configuration from the environment, and a monitoring report and plan built on a simulated production month.',
      instructions: `Complete the project described in this unit's brief and submit a repository link or a zip.

**Submit:**

1. A repository with \`train.py\` (MLflow-tracked candidates with the same CV seed, metric names, data hash and
   commit; the choice, one test evaluation, registration with the alias \`champion\`); the saved pipeline with its
   metadata JSON; \`app/\` with \`/predict\`, \`/predict/batch\` and \`/health\`, the model loaded once and the version in
   every response; \`tests/\` with a known-answer test, invalid-input tests, the unseen-circle policy and a
   batch-equals-single test; \`demo.py\`; \`monitor.py\`; \`Dockerfile\`, \`.dockerignore\` and pinned \`requirements.txt\`.
2. \`monitoring_report.md\` — the production month: rejected rows and why, unknown categories, PSI per numeric
   feature, category share changes, score distribution and share above threshold; which changes are legitimate and
   which is a bug; then the one-page monitoring plan with thresholds and the champion–challenger rule.
3. \`README.md\` — how to train, serve, test, demo and build; required environment variables; screenshots of the
   MLflow runs table and the demo.

**Before you submit,** go through the acceptance criteria in the brief and note each result at the end of the README
(for example: "Chosen run: …, CV AUC … ± …; test AUC …; tests passed: …; units-bug rows rejected: …").`,
      rubric: [
        { criterion: 'Tracked experiments and a reproducible artefact', description: 'Candidates logged with identical CV, metric names, data hash and commit; a choice that respects the standard deviations; the test set used once; the model registered with an alias; one saved pipeline that reproduces its probabilities, with versions pinned and recorded in metadata.', maxPoints: 25 },
        { criterion: 'A validated, tested API', description: 'Schema with units and realistic ranges; model loaded once; probability, decision and model version returned; a stated policy for unseen categories; batch endpoint; passing tests including a known-answer test and invalid-input cases.', maxPoints: 30 },
        { criterion: 'Demo and packaging', description: 'A Streamlit page with a form, cached model or API call, decision and plain-language drivers, and an honest caption; a Dockerfile on the training Python with pinned requirements, environment configuration that fails fast, no secrets, non-root, 0.0.0.0 and a .dockerignore.', maxPoints: 20 },
        { criterion: 'Monitoring report and plan', description: 'The units bug and unseen circle found and handled; PSI and share changes measured; legitimate changes separated from the bug; a plan with daily, weekly and monthly checks, concrete thresholds, label timing and a champion–challenger rule.', maxPoints: 25 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_DEPLOYMENT_CHECKPOINT',
    notes: `Ten questions across the topic: saving models safely, serving them behind a validated API, demos, experiment
tracking and the registry, drift and monitoring, and packaging. Two give numbers — work them out before you look at
the options.`,
    checkpoint: [
      ck(DEP, 'What should a saved churn model file contain so that the API can score a raw customer row?', [
        ['The fitted pipeline: preprocessing and classifier saved together as one object', true],
        ['The classifier\'s coefficients, with the preprocessing rewritten in the API code', false],
        ['The training data, so that the API can refit the model whenever it starts up', false],
        ['The notebook itself, so that the API can rerun its cells to rebuild the model', false],
      ], 'One object, raw columns in and probability out, keeps the fitted scaling and encoding identical to training. Reimplementing preprocessing by hand invites silent differences.'),
      ck(DEP, 'Which practice makes it safe to load model files in a production service?', [
        ['Load only files your own training produced, from storage you control, or use skops', true],
        ['Scan each pickle file with an antivirus tool, which reliably detects harmful payloads', false],
        ['Rename .pkl files to .joblib, because joblib files cannot carry any executable code', false],
        ['Load files only inside a try/except block, so that any harmful code is never run', false],
      ], 'Unpickling runs code as it loads, so the defence is controlling the source or using a format that refuses unknown types. joblib is pickle underneath, and try/except runs too late.'),
      ck(DEP, 'Where should the churn API load its model, and why?', [
        ['Once at startup, in the lifespan handler, so requests pay only for prediction', true],
        ['Inside each request handler, so every request always uses the newest model file', false],
        ['In the client application, which then sends the loaded model along with requests', false],
        ['Lazily on every tenth request, to balance memory use against loading time costs', false],
      ], 'Loading per request added 259 ms to a 42 ms prediction for the forest. Load once and keep the object; change models by redeploying or moving an alias.'),
      ck(DEP, 'The schema accepts circle as any string, and the encoder uses handle_unknown="ignore". A customer from a new circle is scored. What is the trade-off?', [
        ['The service stays up, but the customer is scored as belonging to no known circle', true],
        ['The service stays up, and the score is exactly what a retrained model would give', false],
        ['The request fails with a 422, so the caller must fix the circle and send it again', false],
        ['The request fails with a 500, because ignore only applies to the training data', false],
      ], 'Unknown categories become all-zero columns, so the circle effect is missing from the score. Log such values: they are a signal the model needs retraining.'),
      ck(EXP, 'Four people trained churn models in separate notebooks and logged them to MLflow. What makes their runs comparable?', [
        ['The same data, the same CV splits and seed, and identical metric names', true],
        ['The same run name prefix, so that the runs sort together in the table', false],
        ['The same laptop, so every run is timed on identical hardware throughout', false],
        ['The same MLflow experiment, which makes every metric in it comparable', false],
      ], 'Comparability comes from the procedure: the same rows, the same splits and the same metric definitions. Sitting in one experiment does not make two numbers measure the same thing.'),
      ck(EXP, 'What does setting the alias "champion" on version 3 of a registered model allow?', [
        ['The service loads models:/name@champion, so promotion and rollback need no code change', true],
        ['MLflow retrains version 3 every night on new data until the alias is removed again', false],
        ['Version 3 is protected from deletion and from being loaded by any other services', false],
        ['The registry automatically compares version 3 with every new run that is logged', false],
      ], 'An alias is a movable name for a version. The service refers to the alias; moving it to another version promotes or rolls back without touching code.'),
      ck(MON, 'Reference bin shares are 0.4, 0.4 and 0.2; current shares are 0.2, 0.4 and 0.4. What is the PSI, to two decimals?', [
        ['0.28', true],
        ['0.40', false],
        ['0.14', false],
        ['0.20', false],
      ], 'PSI = (0.2 − 0.4)·ln(0.5) + 0 + (0.4 − 0.2)·ln(2) = 0.139 + 0.139 = 0.28 — above the 0.25 rule-of-thumb mark for a major shift.'),
      ck(MON, 'A model\'s AUC is unchanged month to month, but its mean predicted churn is 0.20 against 0.29 actual. What does the business lose?', [
        ['Correct offer decisions, since the probabilities used with the threshold are too low', true],
        ['Nothing, because an unchanged AUC means the model is still working exactly as built', false],
        ['The ranking of customers, since calibration and ranking always degrade together', false],
        ['Only some reporting accuracy, since threshold decisions do not use probabilities', false],
      ], 'The break-even threshold assumes the probabilities are right. Under-predicting churn means fewer customers cross it, so offers miss churners even though the ranking is fine.'),
      ck(MON, 'Why is a KS-test p-value a poor drift alarm for a feature measured on 2 lakh customers?', [
        ['With that many rows even trivial shifts are significant, so it alarms constantly', true],
        ['The KS test only works on categorical features, and this feature is numeric', false],
        ['The KS test needs labels, which arrive a month after each churn prediction', false],
        ['With that many rows the test loses power and misses large shifts in the feature data', false],
      ], 'A 2% shift gave p = 3.6e-23 with PSI 0.001. At production volumes, judge drift by effect size such as PSI rather than by significance.'),
      ck(DEP, 'The containerised API starts without MODEL_VERSION set. Which behaviour should the code produce?', [
        ['Fail at startup, so the health check fails and no traffic reaches the container', true],
        ['Start normally and report "unknown" as the version in every prediction response', false],
        ['Start normally and read the version from whichever model file was changed last', false],
        ['Start normally and fill in the version from the Docker image\'s "latest" tag name', false],
      ], 'Required configuration missing is a deployment error. Failing fast stops the rollout instead of serving predictions that cannot be traced to a model.'),
    ],
  },
];
