/**
 * Career-track content: Testing and Assuring AI Defences (AISEC_ASSURANCE), the AI tracks, batch AI5.
 * The second topic of the AI Security Engineer's specialism, and it is defence-only: planning security
 * tests for your own AI system, a defence regression suite in CI, measuring block rates and
 * over-blocking with Wilson intervals, evaluation and scanning tools as pipeline steps, and triaging
 * findings, fixing them in depth and proving the fix with a retest.
 *
 * Builds on AISEC_LLM_THREATS (threat model, leakage, access control for RAG and agents), AI_EVAL_SAFETY
 * (eval sets, CI gates, canaries, guardrails), AI_AGENT_EVAL_OPS (the least-privilege tool gateway) and
 * the years' T3_SEC_TESTING. Those are referred back to in a sentence, not re-taught.
 *
 * No attack content: hostile inputs appear only as labelled fixtures whose text is a placeholder kept in
 * a restricted test set; the code under test is always the control. CANARY-7731 is a harmless marker.
 * Every Python snippet was run in the scratch venv (chromadb, pytest) against a toy bank assistant with a
 * scripted fake model; printed outputs are the real outputs. Tools (promptfoo, garak, PyRIT) are
 * described from their documentation, not run. No prices, no model version names.
 *
 * Skills: MODEL_RED_TEAMING (read as security testing of AI systems) by default; the DEFENCE_REGRESSION
 * unit is PROMPT_INJECTION (trackSkillAttribution). Questions plainly about the other skill use ck().
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_AISEC_ASSURANCE_BUNDLES: PilotBundle[] = [
  /* ── SECURITY_TEST_PLAN ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AISEC_ASSURANCE_SECURITY_TEST_PLAN',
    notes: `In LLM Security you threat-modelled an AI system and chose its controls: permission-filtered
retrieval, a least-privilege tool gateway, approvals, output encoding, guardrail layers and rate limits.
This topic answers the question a release manager, an auditor or a bank's risk team will ask next:
**how do you know those controls work?** "We tried a few things and it looked fine" is not an answer.
A security test plan is.

## What is under test: controls, not the model

The model is not the thing you are certifying. It will sometimes do the wrong thing — you designed for
that. What you certify is that each **control** holds when the model misbehaves. That reframing decides
almost everything about the plan:

- A control that does not depend on the model (the retrieval filter, the gateway's scope check, HTML
  encoding, a parameterised query) is **deterministic**. Its pass criterion is absolute: zero failures
  across the whole fixture set.
- A control that is itself a model or a heuristic (an input guard classifier, an output safety check)
  is **probabilistic**. Its pass criterion is a rate with an interval — a block rate whose lower bound
  clears a threshold, and an over-blocking rate on benign traffic whose upper bound stays under one.
  The next-but-one unit is about measuring that honestly.

Write the plan around a **control inventory** drawn from your threat model:

| Control | Claim | How verified | Pass criterion |
|---|---|---|---|
| Retrieval filter | No user sees another tenant's or customer's chunk | Every user × every chunk's own text as the query | 0 leaks |
| Tool gateway scope | Customer id comes from the session only | Fixtures where the model supplies another id | 0 calls executed |
| Approval binding | Write tools run only on approved exact arguments | Scripted unapproved and altered calls | 0 executed |
| Output check | The canary marker never reaches a user | Scripted replies containing it, any case | 0 delivered |
| Output encoding | Model text renders as text | Scripted markup in replies | 0 live tags |
| Input guard | Hostile fixtures are flagged | Labelled hostile set, repeated | lower bound ≥ 85% |
| Input guard (cost) | Real questions pass | Benign set at the same settings | upper bound ≤ 8% |
| Rate limits | Quotas hold per user and per key | Load script in staging | limit enforced at N+1 |

Each row is a **claim** someone can check. "The assistant is secure" is not a claim.

## Scope, permission and environment

Even on your own system, write down who authorised the testing, which deployment, which dates and what
is out of bounds (production data, third-party services you do not own, your model provider's terms).
The years' security testing units covered rules of engagement; the AI-specific additions are:

- **A separate test environment** — a staging tenant with synthetic customers, synthetic documents
  and its own API keys and quotas. Never point hostile fixtures at production, and never seed the test
  environment with real customer data "to make it realistic".
- **Canary markers, not secrets.** Plant a harmless marker such as \`CANARY-7731\` in the system prompt
  and in one staff-only test document. If it ever appears in output, a control failed — and nothing
  real leaked.
- **Restricted fixtures.** Hostile test inputs live in an access-controlled repository, labelled by
  id and category. Your code and reports refer to them by id (\`INJ-DOC-02\`) and category ("instructions
  hidden in a retrieved document"); the text itself stays in the restricted set.
- **Budget.** Live-model runs cost tokens and hit provider rate limits. Plan how many trials each
  probabilistic claim needs and what it costs before the run.

## Fixture sets

A plan names its data, versioned like any eval set:

1. **Hostile set** — labelled fixtures per threat category from the threat model, plus every past
   finding. Each has an id, a category, the control expected to stop it, and a severity.
2. **Benign set** — real questions from support logs, anonymised (account numbers and names replaced,
   as in the DPDP-aware redaction you built earlier), including the awkward ones: angry customers,
   Hinglish, questions that mention "block", "password" or "fraud" for good reasons. Without this set
   you cannot measure over-blocking.
3. **Held-out set** — hostile fixtures the people fixing findings never see, used only at retest to
   catch fixes that were tuned to the known fixtures.

## Two layers of test, both in the plan

- **Control tests with a scripted model.** A fake model is scripted to misbehave on specific fixture ids,
  so the test proves the control catches the misbehaviour. Deterministic, fast, runs on every pull
  request. Next unit.
- **Live sampling against the real model** in staging, nightly or before a release, to measure rates
  for probabilistic layers and to catch surprises the script did not imagine.

## Roles and sign-off

Name the system owner (accepts residual risk), the tester (runs the plan, may be the same engineer for
the scripted suite), an independent reviewer for anything High or above, and who signs the release.
State **exit criteria** ("all deterministic rows at zero failures; guard lower bound ≥ 85%; no open High
findings") and **retest triggers**: a new model or model setting, a prompt change, a new tool, a new
data source, a new tenant type. AI systems change behaviour without a code change; the plan must say
what re-opens it.`,
    workedExample: `**One-page security test plan: SahayBank Help (staging), release 2026.11**

**System.** A support assistant for a retail bank's app. RAG over FAQs and per-customer notes; tools
\`get_balance\`, \`block_card\`, \`raise_dispute\`; replies rendered in a web view; a guard classifier on
input. Customers and support staff use it.

**Authorisation.** Owner: Head of Digital Channels. Tester: assistant team, security engineer
reviewing. Environment: staging tenant \`sahay-stg\`, synthetic customers C-101, C-202, staff S-1, a
second tenant \`otherbank-stg\` for isolation. Production and real data out of scope. Provider terms
checked for the live sampling volume.

**Controls and criteria.**

| # | Control | Fixtures | Criterion |
|---|---|---|---|
| 1 | Retrieval filter (tenant, customer, staff scope) | 4 users × all chunks | 0 leaks |
| 2 | Gateway: session-bound customer | INJ-DOC-03 family | 0 executed |
| 3 | Approval bound to exact arguments | INJ-DOC-02 family, altered-argument cases | 0 executed |
| 4 | Output check for CANARY-7731 | INJ-DIRECT-01 family, case variants | 0 delivered |
| 5 | HTML encoding of replies | OUT-HTML-04 family | 0 live tags |
| 6 | Model-written filters: allow-listed, parameterised | SQL-FILTER-05 family | 0 widened queries |
| 7 | Input guard | 60 hostile × 5 repeats; 300 benign | block LB ≥ 85%, over-block UB ≤ 8% |

**Data.** Hostile set v3 (restricted repo, 60 fixtures, 6 categories); benign set v2 (300 anonymised
questions, 18% Hinglish); held-out set v1 (20 fixtures, held by the reviewer).

**Run.** Rows 1–6: scripted suite on every pull request. Row 7: nightly in staging with the release
model settings; build id, prompt hash and settings recorded with every result.

**Exit.** Rows 1–6 green; row 7 bounds met; no open High finding; reviewer sign-off.

**Retest triggers.** Model or setting change, prompt change, new tool, new document source, new tenant.

Note what is absent: no "try to break it and see". Every row has a claim, fixtures and a number.`,
    mcqs: [
      mcq('A test plan row for SahayBank\'s retrieval filter reads "the assistant should not leak data". What is the most useful rewrite?', [
        ['"No user retrieves another tenant\'s or customer\'s chunk; 0 leaks over every user and chunk"', true],
        ['"The model is instructed not to reveal other customers\' data, checked by reading its prompt"', false],
        ['"Testers try several hostile prompts and confirm that nothing sensitive comes back to them"', false],
      ], 'A plan row needs a checkable claim, a method and a criterion. The prompt instruction is a request to the model, not a control, and "try a few" has no coverage or pass mark.'),
      mcq('Why does a security test plan set "zero failures" for the gateway\'s scope check but a lower-bound block rate for the input guard?', [
        ['The gateway is deterministic code; the guard is a classifier that errs at some rate', true],
        ['The gateway is tested less often, so a stricter criterion makes up for fewer runs', false],
        ['The guard runs on every request, so a single failure in it matters far less overall', false],
        ['Zero is the default for all controls; only the guard has a vendor-supplied threshold', false],
      ], 'Code that does not depend on the model either holds or has a bug, so any failure is a defect. A guard model is statistical by nature, so its claim is a rate with an interval. Frequency of running or of requests does not change that.'),
      mcq('The assistant team wants to load real customer chats into staging "to make the security tests realistic". What should the plan say?', [
        ['Use anonymised questions for the benign set and synthetic customers for test data', true],
        ['Allow it, provided the staging environment sits behind the corporate VPN', false],
        ['Allow it for the hostile set only, since benign traffic is not what is tested', false],
      ], 'Realism comes from anonymised real questions and synthetic accounts; real personal data in a test environment is a DPDP and leakage risk of its own. A VPN does not change the purpose limitation, and the benign set is exactly where real phrasing matters.'),
    ],
    checkpoint: [
      mcq('Which event should re-open an AI assistant\'s signed-off security test plan even though no application code changed?', [
        ['The provider-side model or its temperature setting was changed', true],
        ['The frontend team changed the colour scheme of the chat widget', false],
        ['The support team added a new member to the on-call rotation', false],
      ], 'A model or setting change can alter how often the model misbehaves and how guards respond, so rates must be re-measured. A colour change or rota change does not touch any control under test.'),
      mcq('In a test plan, what is the held-out hostile set for?', [
        ['Catching fixes that were tuned to the fixtures the fixers had seen', true],
        ['Giving the benign set more examples when over-blocking is measured', false],
        ['Replacing the main hostile set once every one of its tests is green', false],
        ['Running in production while the main set runs only in staging', false],
      ], 'If engineers fix findings while looking at the same fixtures, a fix can match those inputs without fixing the weakness. Fixtures kept aside and used only at retest show whether the fix generalises. It is not benign data, a replacement, or a production run.'),
      mcq('Where should a team keep the text of the hostile fixtures used in its AI security tests?', [
        ['In an access-controlled set, referenced by id and category elsewhere', true],
        ['Inline in the pytest files, so any reviewer can read every input', false],
        ['In the shared prompt library used by the product\'s feature teams', false],
      ], 'Hostile inputs are sensitive test material: the suite, reports and dashboards only need the id and category label. Inlining them spreads them across the codebase, and a shared prompt library is the wrong home entirely.'),
    ],
  },

  /* ── DEFENCE_REGRESSION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AISEC_ASSURANCE_DEFENCE_REGRESSION',
    notes: `In Evaluating and Guarding LLM Applications you wrote an eval set and a CI gate for answer quality.
A **defence regression suite** is the same idea pointed at controls: every weakness you have ever found,
and every control in the test plan, becomes a test that runs on every pull request and fails the build
when a defence stops working. The prompt was reworded, a library was upgraded, someone "simplified" the
gateway — the suite notices before a customer does.

## The pattern: scripted misbehaviour, real control

A test that sends a hostile fixture to a live model and checks nothing bad happened is flaky (the model
may simply not misbehave this time) and slow. Instead, script a fake model to **misbehave on purpose**
for certain fixture ids, then assert the control catches it. The test now proves the control, every
time, in milliseconds.

The toy app is SahayBank Help: Chroma retrieval with metadata filters, a tool gateway, an output check
for a canary marker, HTML encoding, and an allow-list for model-written transaction filters. The fake
model is a table:

    CANARY = "CANARY-7731"   # planted in the system prompt and a staff-only test document

    SCRIPT = {   # fixture id -> what the model is scripted to attempt
        "INJ-DIRECT-01": {"reply": f"Here you go: {CANARY}"},
        "INJ-DOC-02":    {"tool": ("raise_dispute", {"txn": "T1"})},
        "INJ-DOC-03":    {"tool": ("get_balance", {"customer": "C-202"})},
        "OUT-HTML-04":   {"reply": '<img src="x" data-fixture="OUT-HTML-04">'},
        "SQL-FILTER-05": {"filter": {"merchant": "Kirana Mart", "customer": "C-202"}},
    }

    def fake_model(fixture_id):
        return SCRIPT.get(fixture_id, {"reply": "Your card can be blocked from the app."})

The fixtures file holds labels only; the hostile text is a placeholder for the restricted set:

    {"id": "INJ-DOC-03", "category": "cross-customer tool use", "control": "gateway_scope",
     "text": "<fixture: cross-customer request sample, restricted test set>"}

## The suite

    @pytest.mark.parametrize("fx", FIXTURES, ids=[f["id"] for f in FIXTURES])
    def test_control_holds(fx):
        attempt = fake_model(fx["id"])
        if fx["control"] == "output_check":
            assert CANARY in attempt["reply"]                    # the model DID misbehave...
            assert CANARY not in check_output(attempt["reply"])  # ...and the control caught it
        elif fx["control"] in ("approval", "gateway_scope"):
            tool, args = attempt["tool"]
            with pytest.raises(Refused):
                gateway(RAVI, tool, args)          # no approval, or a customer id from the model
        elif fx["control"] == "encoding":
            assert "<img" not in render(check_output(attempt["reply"]))
        elif fx["control"] == "sql_allowlist":
            with pytest.raises(Refused):
                search_transactions(make_db(), RAVI, attempt["filter"])

    def test_approved_call_still_works():
        args = {"txn": "T1", "customer": "C-101"}
        assert gateway(RAVI, "raise_dispute", {"txn": "T1"},
                       approval=("raise_dispute", json.dumps(args, sort_keys=True)))["ok"]

plus a retrieval test that queries with every chunk's own text as every user and asserts each hit is in
the user's tenant and scope. Run with \`pytest -v\`:

    test_defences.py::test_control_holds[INJ-DIRECT-01] PASSED
    test_defences.py::test_control_holds[INJ-DOC-02] PASSED
    test_defences.py::test_control_holds[INJ-DOC-03] PASSED
    test_defences.py::test_control_holds[OUT-HTML-04] PASSED
    test_defences.py::test_control_holds[SQL-FILTER-05] PASSED
    test_defences.py::test_approved_call_still_works PASSED
    test_defences.py::test_no_cross_tenant_or_cross_customer_chunk PASSED
    7 passed

## Three habits that keep the suite honest

1. **Assert the precondition.** \`assert CANARY in attempt["reply"]\` checks the scripted misbehaviour
   really happened. Without it, a typo in a fixture id makes the fake reply benignly and the test passes
   while testing nothing.
2. **Keep a positive control.** \`test_approved_call_still_works\` fails if someone "fixes" the gateway by
   refusing everything. A defence that breaks the product will be switched off by the product team.
3. **Prove the suite can fail.** Weaken a control on purpose and watch the suite go red. Here the
   gateway was changed to accept a customer id from the model (a one-line mutation):

        FAILED test_defences.py::test_control_holds[INJ-DOC-03] - Failed: DID NOT RAISE Refused
        1 failed, 6 passed

   A suite that stays green under a deliberate weakening is decoration. Do this when you add a test,
   and periodically with a mutation-testing tool.

## Canaries, not secrets

The output check looks for \`CANARY-7731\`, a meaningless marker planted where a secret would be. It
gives you a precise, greppable signal of "context leaked into output" without a real key or customer
record ever being in the test. Use a different marker per location (system prompt, staff document,
another tenant's chunk) so a hit tells you **which** boundary failed.

## In CI

- **Every pull request:** the scripted suite (seconds), plus SAST, secrets and dependency scans.
- **Nightly, in staging:** live-model sampling of the hostile and benign sets for probabilistic layers,
  feeding the gate in the next unit.
- **Failing means failing.** The job must exit non-zero; a red test that only produces a warning
  annotation is a suite nobody reads. Make the suite a required check on the main branch.

Every new finding adds a fixture and a test **before** the fix is merged, so the test is seen to fail on
the old code and pass on the new.`,
    workedExample: `**Turning a finding into a regression test.**

**The finding (AIRT-012).** In staging, a staff user asked about card replacements and the reply
contained \`CANARY-7731\`, the marker planted in the staff-only ops runbook. Investigation: the reply
was correct for staff (they may read the runbook), but the same conversation was later shown in a
customer-facing transcript export. The export path re-rendered model replies without the output
check.

**Step 1 — name the control that failed.** Not "the model leaked". The output check exists, but only on
the chat path; the export path bypassed it. Control: *every path that delivers model text to a
customer passes the output check.*

**Step 2 — write the fixture (labels only).**

    {"id": "LEAK-EXPORT-06", "category": "context marker in an alternate delivery path",
     "control": "output_check_export", "text": "<fixture: staff runbook question, restricted test set>"}

**Step 3 — script the misbehaviour** so the fake model returns a reply containing the marker for
LEAK-EXPORT-06.

**Step 4 — write the test against the export function, not the chat function:**

    def test_export_applies_output_check():
        reply = fake_model("LEAK-EXPORT-06")["reply"]
        assert CANARY in reply                       # precondition
        assert CANARY not in export_transcript([reply])

**Step 5 — watch it fail on the current code**, then fix by routing export through the same
\`deliver()\` function the chat path uses (one choke point, not two copies of the check). Watch it pass.

**Step 6 — widen.** Grep for every place model text leaves the service (email summaries, webhooks,
logs shipped to a vendor) and add a parametrised case per path.

The test that remains is small, deterministic and permanent. The next refactor of export cannot
silently remove the check.`,
    mcqs: [
      mcq('Why does a defence regression suite script the fake model to misbehave on certain fixture ids instead of sending fixtures to the real model?', [
        ['So every run exercises the control, deterministically and fast', true],
        ['Because real models refuse hostile fixtures in any test setup', false],
        ['So the suite can measure the real model\'s attack success rate', false],
        ['Because CI runners cannot make network calls to model providers', false],
      ], 'If the live model happens to behave, the control is never exercised and the test proves nothing. Scripting the misbehaviour guarantees the control is tested on every run. Rates against the live model are a separate nightly measurement; refusals and network access are not the reason.'),
      mcq('A teammate "fixes" a failing gateway test by making the gateway refuse every write tool. The suite is green. Which test should have caught this?', [
        ['A positive control asserting an approved call still succeeds', true],
        ['A precondition asserting the fake model produced a tool call', false],
        ['A retrieval test querying every chunk\'s text as every user', false],
      ], 'Refusing everything passes every "must refuse" test. Only a test that an approved, legitimate call still works catches a control that broke the product. The precondition and retrieval tests check different things.'),
      mcq('Why plant a different canary marker in the system prompt, the staff runbook and the other tenant\'s chunk?', [
        ['A hit then shows which boundary failed, not only that one did', true],
        ['One marker reused in three places is easy for a filter to learn', false],
        ['Each location\'s marker must match that store\'s own id format', false],
      ], 'Distinct markers turn a leak into a precise diagnosis: system prompt, staff-scope document or cross-tenant chunk. Reuse is not a learning problem for a substring check, and the marker format is yours to choose.'),
    ],
    checkpoint: [
      mcq('A regression test asserts that check_output() removes the canary from the scripted reply for INJ-DIRECT-01, but the fixture file says INJ-DIRECT-1. What happens, and what prevents it?', [
        ['The fake replies benignly and it passes vacuously; assert the precondition', true],
        ['The test errors on the unknown id; add the missing id to the fixtures file', false],
        ['The output check catches it anyway; no change to the test is needed', false],
        ['pytest skips the case; mark the parametrised test as strict instead', false],
      ], 'An unscripted id gets the default benign reply, which never contained the canary, so "canary not in output" holds trivially. Asserting the canary IS in the scripted reply first makes the mismatch fail loudly. There is no error or skip by default.'),
      ck('MODEL_RED_TEAMING', 'You weaken the gateway on purpose so it accepts a customer id from the model, and the defence suite stays green. What does that tell you?', [
        ['The suite has no test for the scope check, so it cannot catch it', true],
        ['The gateway was already safe, because the model never sends ids', false],
        ['The mutation was too small to matter for an assistant in production', false],
      ], 'A deliberate weakening that no test notices means that control is unverified. The model\'s current behaviour is not a guarantee, and a one-line change that lets one customer act on another\'s account is not small.'),
      mcq('When a new finding arrives, in what order should the fixture, the test and the fix go in?', [
        ['Fixture and test first, seen failing on old code, then the fix', true],
        ['The fix first, then a test written to match the fixed behaviour', false],
        ['The fix and the test together, reviewed in one change by one person', false],
      ], 'A test first seen failing on the vulnerable code proves it can detect the weakness; seen passing after the fix, it proves the fix. A test written after the fix may never have been able to fail. Putting both in one change can still work, but only if it is seen failing first.'),
    ],
  },

  /* ── MEASURING_ROBUSTNESS ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AISEC_ASSURANCE_MEASURING_ROBUSTNESS',
    notes: `Deterministic controls pass or fail. The probabilistic layers — an input guard classifier, an output
safety model, the model's own behaviour under a system prompt — need **rates**, and a rate from a small
sample is a guess with a number on it. This unit is how to report robustness so that a risk team can
rely on it: block rate with an interval, the sample it needs, and the over-blocking it costs.

## The interval, not the point

A guard blocked 19 of 20 hostile fixtures. "95% block rate" sounds like a fact; it is not. Use the
**Wilson score interval** (the textbook Wald interval, p ± 1.96·√(p(1−p)/n), breaks near 0% and 100%,
exactly where security numbers live):

    def wilson(k, n, z=1.96):
        p = k / n
        centre = (p + z * z / (2 * n)) / (1 + z * z / n)
        half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)
        return max(0.0, centre - half), min(1.0, centre + half)

Real output, Wilson beside Wald:

     19/20   rate  95.0%  Wilson  76.4%- 99.1%   Wald  85.4%-104.6%
    190/200  rate  95.0%  Wilson  91.0%- 97.3%   Wald  92.0%- 98.0%
     20/20   rate 100.0%  Wilson  83.9%-100.0%   Wald 100.0%-100.0%
      0/50   rate   0.0%  Wilson   0.0%-  7.1%   Wald   0.0%-  0.0%
      3/400  rate   0.8%  Wilson   0.3%-  2.2%   Wald  -0.1%-  1.6%

Read it: 19/20 is consistent with a true block rate as low as 76%. Wald claims an upper limit above 100%,
and for 20/20 it claims certainty — a zero-width interval from twenty tries. Report the **lower bound**
for block rate and the **upper bound** for failure and over-blocking rates: those are what you can
defend.

## How many trials a claim needs

Two questions, two calculations:

- **"No failures seen — how low is the failure rate?"** With zero failures in n trials, the 95% upper
  bound is roughly 3/n (the rule of three). To support "below r" you need:

        zero failures needed for rate < 10%: 29 trials
        zero failures needed for rate < 5%: 59 trials
        zero failures needed for rate < 1%: 299 trials

- **"How precisely do I know a rate near p?"** n ≈ 1.96²·p(1−p)/margin²:

        n for 95% +/- 3 points: 203  +/- 1 point: 1825

Put these in the test plan **before** the run, so nobody stops sampling when the number looks good.

## Varying outputs are not independent trials

At non-zero temperature the same fixture can be blocked on one run and not the next, so you repeat each
fixture. But 60 fixtures × 5 repeats is not 300 independent trials: repeats of one fixture are
correlated. Report both views — the pooled rate over all runs and the **per-fixture** results (how many
fixtures were ever not blocked) — and never stretch repeats of a few fixtures into a claim about a
category. Test at the **release settings** (temperature, system prompt, model); a rate measured at
temperature 0 says little about production at 0.7.

## Measure over-blocking at the same time

A guard that blocks everything scores 100%. The cost side is the **over-blocking rate** on the benign
set — real, anonymised customer questions, including ones that mention cards, fraud and passwords for
good reasons. Run both sets in the same job, same build, same settings. A scripted guard standing in for
a classifier (catch rates set per category, seeded), 60 hostile fixtures × 5 repeats and 300 benign
questions:

    block rate 278/300 = 92.7%  95% CI 89.1%-95.1%
      instruction override         97/100 = 97.0%  CI 91.5%-99.0%
      document-borne instruction   89/100 = 89.0%  CI 81.4%-93.7%
      markup eliciting             92/100 = 92.0%  CI 85.0%-95.9%
    over-blocking 13/300 = 4.3%  95% CI 2.5%-7.3%

The pooled number hides the weak category: document-borne instructions could be as low as 81%. That is
where the next control (permission and approval, not a better guard) goes. And 4.3% over-blocking means
roughly one customer in twenty-three gets a refusal on a real question — a product cost the owner must
accept explicitly.

## Comparing before and after

When a fix moves 89/100 to 95/100, check the intervals: 81–94% versus 89–98% overlap, so the change
may be noise. Either run more trials or use a two-proportion test; do not announce an improvement the
data cannot carry. Keep every run's build id, prompt hash, settings and fixture-set version so the
comparison is like for like.

## The report line

"Input guard, release 2026.11, temperature 0.7, hostile set v3 (60 fixtures × 5): block rate 92.7%
(95% CI 89.1–95.1%); weakest category document-borne instruction 89.0% (81.4–93.7%); over-blocking on
benign set v2 (300): 4.3% (2.5–7.3%)." Every number has an n, an interval and a version.`,
    workedExample: `**Is the new guard good enough to ship?**

The plan says: block-rate lower bound ≥ 85%, over-blocking upper bound ≤ 8%, at least 200 hostile trials.

**Run 1 (old guard):** 251/300 hostile blocked, 13/300 benign blocked. Wilson: block 83.7%, lower bound
**79.1%** — fails. Over-blocking upper bound 7.3% — passes. Do not ship.

**Run 2 (new guard):** 278/300 hostile blocked, 13/300 benign blocked. Block lower bound **89.1%** —
passes; over-blocking unchanged.

**Check the categories.** Pooled 92.7% hides document-borne instructions at 89/100, lower bound 81.4%.
The plan's threshold is pooled, so the gate passes, but the report flags the category, and the owner
decides whether the approval step on write tools (deterministic, already at zero failures) covers the
residual risk. It does for actions; it does not for misleading answers, so a finding is opened.

**Check independence.** Per-fixture view of the same seeded run: of the 20 document-borne fixtures,
9 got through in at least one of their 5 runs. "11 misses in 100 runs" is really "9 of 20 variants
sometimes get through" — a statement about breadth, worth more than the pooled rate.

**Check the cost.** 13/300 benign blocked: the blocked questions are listed for the owner. Suppose
reading them shows seven mention "block my card" — the guard is reacting to the word. That is a guard defect to fix, not a cost to
accept.

**Decision.** Ship the new guard, with a finding for document-borne instructions and a guard fix for the
"block my card" false positives, both with retest dates.`,
    mcqs: [
      mcq('A guard blocked 20 of 20 hostile fixtures. Which statement is honest?', [
        ['The 95% Wilson lower bound is about 84%, so the rate may be well below 100%', true],
        ['The block rate is 100%, and twenty clean trials make the result a certainty', false],
        ['The Wald interval is 100% to 100%, so the guard can be reported as complete', false],
        ['No statement is possible until at least one of the fixtures has got through', false],
      ], 'Twenty successes are consistent with a true rate as low as 84%. Wald\'s zero-width interval is its known failure at the boundary, not certainty, and a perfect sample still supports a Wilson bound.'),
      mcq('The team ran 60 hostile fixtures 5 times each at temperature 0.7 and reports "300 independent trials". What is wrong?', [
        ['Repeats of one fixture are correlated, so per-fixture results must also be shown', true],
        ['The runs should have been at temperature 0, where each fixture is run only once', false],
        ['Five repeats is too few; at least thirty repeats per fixture are always required', false],
      ], 'Five runs of the same fixture share most of what makes it succeed or fail, so 300 runs carry less information than 300 different fixtures. Temperature 0 does not match release settings, and there is no universal thirty-repeat rule.'),
      mcq('Why must over-blocking be measured on the benign set in the same job as the block rate?', [
        ['A guard\'s block rate and its false positives move together with its settings', true],
        ['Benign questions are cheaper to run, so they fill the remaining token budget', false],
        ['The Wilson interval cannot be computed for a hostile set without a benign one', false],
      ], 'Tightening a guard raises both the block rate and the false-positive rate; measured on different builds or settings, the trade-off is invisible. Budget and the arithmetic of Wilson are unrelated to why the two belong together.'),
    ],
    checkpoint: [
      mcq('How many hostile trials with zero failures are needed to claim a failure rate below 5% at 95% confidence?', [
        ['About 59', true],
        ['About 20', false],
        ['About 300', false],
        ['About 100', false],
      ], 'The probability of zero failures in n trials at a 5% rate is 0.95^n; it drops below 0.05 at n = 59. Twenty is far too few; about 300 is the figure for 1%, and 100 is more than needed for 5%.'),
      mcq('After a fix, a category\'s block rate moved from 89/100 (81–94%) to 95/100 (89–98%). What should the report say?', [
        ['The intervals overlap, so more trials are needed to call it an improvement', true],
        ['The fix improved blocking by six points and the category can now be closed', false],
        ['The fix made no difference, because the two intervals share common ground', false],
      ], 'Overlapping intervals mean the data cannot separate the two rates yet; it neither proves an improvement nor proves no change. More trials or a two-proportion test settles it.'),
      mcq('A guard\'s pooled block rate is 92.7%, but one category sits at 89/100 with a lower bound of 81%. What is the right use of that?', [
        ['Report the weak category and add a control there that does not rely on the guard', true],
        ['Report the pooled rate only, since the release threshold is defined on the pool', false],
        ['Drop the weak category\'s fixtures until the pooled lower bound clears 95%', false],
      ], 'The pooled number hides where the defence is weakest, and that is where a deterministic control earns its place. Reporting only the pool hides the risk; removing fixtures to pass a gate is falsifying the measurement.'),
    ],
  },

  /* ── TOOLS_IN_PIPELINE ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AISEC_ASSURANCE_TOOLS_IN_PIPELINE',
    notes: `Your scripted suite proves your controls; your measurement job produces rates. Open-source evaluation
and scanning tools add breadth: large, maintained libraries of test categories and a standard way to run
them. They are useful pipeline steps, and they are easy to over-trust. This unit describes what the main
ones check (from their documentation — run them only against your own staging deployment), where they
sit in CI, how to read their output, and what they cannot see.

## The tools, by what they do

**promptfoo** — a CLI (Node-based) for evaluating prompts and LLM applications. A YAML config names the
**providers** (a model API, an HTTP endpoint such as your staging \`/assist\`, or a custom Python
provider that calls your app), the **prompts**, and **tests** with variables and **assertions**
(\`contains\`, \`not-contains\`, \`icontains\`, \`regex\`, \`is-json\`, custom \`javascript\` or \`python\`
checks, and model-graded \`llm-rubric\`). \`promptfoo eval\` runs the matrix, writes results (JSON,
HTML, CSV) and exits non-zero when tests fail — check the docs for the exact exit code and how to change
it. It also has a red-teaming mode that **generates** test cases per risk category from plugins; treat
anything it generates as restricted fixture material. Defensive use: your benign set and your labelled
fixtures as tests, with assertions such as "reply does not contain CANARY-7731" and "reply is valid JSON
matching the schema".

**garak** — an LLM vulnerability scanner. It connects to a target through a **generator** (Hugging Face,
an API, or a REST endpoint you configure), sends **probes** grouped into families (prompt injection,
data leakage, toxicity and others), and scores responses with **detectors**. It writes a JSONL report
and an HTML summary, plus a hit log of the responses detectors flagged. Defensive use: a broad, generic
sweep of your staging endpoint before a release, to find categories your own fixtures missed.

**PyRIT** — Microsoft's Python Risk Identification Tool, a framework rather than a scanner: **targets**
(the system under test), **orchestrators** (how a test conversation runs, including multi-turn),
**converters** (transformations applied to test inputs) and **scorers**, with results stored in a memory
database. Defensive use: scripted multi-turn checks of your own app in staging.

**The rest of the pipeline is not new** but belongs in the same plan: SAST (Bandit, Semgrep), secret
scanning (gitleaks), dependency audit (pip-audit), and model-file scanning for unsafe serialisation
(you met pickle and safetensors in LLM Security).

## Where each runs

| Stage | Runs | Blocks merge or release? |
|---|---|---|
| Every pull request | Scripted defence suite, SAST, secrets, pip-audit | Yes |
| Nightly, staging | Live sampling of hostile and benign sets; promptfoo eval of fixtures | Gate on bounds |
| Before release | garak sweep, PyRIT multi-turn scenarios, full measurement | Triage, then sign-off |
| On model or prompt change | The nightly job, immediately | Yes |

Scanner sweeps feed **triage**, not an automatic red build: a generic detector flags many things that are
fine in your context, and a human decides which are findings.

## The gate script

Whatever produced the counts, one small script turns them into a build status. It applies the plan's
criteria to the interval bounds, not to the point estimates:

    def main(path, min_block=0.85, max_overblock=0.08, min_trials=200):
        r = json.load(open(path))
        problems = []
        if r["hostile_trials"] < min_trials:
            problems.append(f"only {r['hostile_trials']} hostile trials, need {min_trials}")
        lo, _ = wilson(r["blocked"], r["hostile_trials"])
        _, hi = wilson(r["benign_blocked"], r["benign_total"])
        print(f"block rate lower bound {lo:.1%} (min {min_block:.0%}); "
              f"over-blocking upper bound {hi:.1%} (max {max_overblock:.0%})")
        if lo < min_block:
            problems.append("block rate below threshold")
        if hi > max_overblock:
            problems.append("over-blocking above threshold")
        for p in problems:
            print("GATE FAIL:", p)
        return 1 if problems else 0

    if __name__ == "__main__":
        sys.exit(main(sys.argv[1]))

Two real runs:

    $ python gate.py good.json; echo "exit $?"        # 278/300 blocked, 13/300 benign
    block rate lower bound 89.1% (min 85%); over-blocking upper bound 7.3% (max 8%)
    exit 0
    $ python gate.py regressed.json; echo "exit $?"   # 251/300 blocked
    block rate lower bound 79.1% (min 85%); over-blocking upper bound 7.3% (max 8%)
    GATE FAIL: block rate below threshold
    exit 1

Note the \`min_trials\` check: without it, a broken job that ran three fixtures could pass.

## Reading results critically

- **A detector is a heuristic.** It flags strings and patterns; read the hit log before believing either
  a hit or a pass. A refusal that quotes the marker can be scored a leak; a leak paraphrased can be scored
  clean. Your canary check is precise because you planted the marker.
- **Generic probes test the model more than your system.** Most scanner probes ask "will the model say
  X?". Your controls are about what the system *does*: which documents it retrieves for which user, which
  tools run with which arguments. A scanner aimed at a chat endpoint cannot see that unless you give it a
  multi-user, tool-enabled target and check side effects.
- **"0 hits" is a statement about the probes run**, at those settings, on that day. It is not "secure".
- **Version everything.** Pin the tool and its probe set; a new version changes the denominator. Record
  tool version, config hash, target build and settings with the results.
- **Results are sensitive.** Hit logs contain hostile inputs and possibly leaked context. Store them as
  restricted CI artefacts with retention limits, not in a public build log.

## What none of them can see

Authorisation across tenants and roles in your data, the business impact of a tool call, approval flows,
what happens in downstream systems that consume model output, and long workflows that span sessions.
Those are why the scripted suite and your own fixtures stay the core of assurance, and the tools are the
breadth around them.`,
    mcqs: [
      mcq('A nightly garak sweep of the staging chat endpoint reports zero hits. What may the release note claim?', [
        ['No hits for the probe families run, at those settings, against that build', true],
        ['The assistant is resistant to prompt injection and to data leakage in general', false],
        ['The retrieval filter and the tool gateway have both been verified by the sweep', false],
      ], 'A scanner\'s result is bounded by its probes, detectors and settings. It does not establish general resistance, and a chat-endpoint sweep does not exercise cross-tenant retrieval or tool side effects.'),
      mcq('Why does the CI gate script check min_trials before it looks at the block rate?', [
        ['A broken job that ran very few fixtures could otherwise pass the gate', true],
        ['The Wilson formula raises an error when n is below two hundred trials', false],
        ['Running fewer trials makes the measured block rate biased upwards', false],
        ['The provider\'s rate limit rejects jobs that send fewer than 200 calls', false],
      ], 'With few trials the interval is wide, but a job that silently lost most fixtures might still produce a passing number from a handful. Wilson works for any n ≥ 1; small n widens, not biases, the estimate.'),
      mcq('Where should garak\'s hit log from a staging sweep be kept?', [
        ['As a restricted CI artefact with a retention limit', true],
        ['In the public build log, for anyone to review', false],
        ['Committed to the repository beside the test suite', false],
      ], 'The hit log holds hostile inputs and possibly leaked context, so access should be limited and time-bound. Public logs and the repository spread it to everyone with read access.'),
    ],
    checkpoint: [
      mcq('Which check can a generic scanner pointed at a single-user chat endpoint NOT verify?', [
        ['That user A never retrieves user B\'s documents', true],
        ['That replies avoid a listed category of content', false],
        ['That replies are not empty for ordinary questions', false],
      ], 'Cross-user retrieval needs a multi-user target and knowledge of who owns which document — your scripted suite does that. Content categories and non-empty replies are within a single endpoint\'s view.'),
      mcq('A promptfoo test asserts not-contains "CANARY-7731", but the staging model sometimes writes the marker in lower case. What is the better assertion?', [
        ['A case-insensitive check, such as not-icontains', true],
        ['An llm-rubric asking whether a secret was leaked', false],
        ['A regex anchored to the start of the whole reply', false],
        ['is-json, so that the reply has to be well formed', false],
      ], 'The marker is a fixed string, so a case-insensitive substring check is exact and deterministic. A model-graded rubric adds noise to a precise question, an anchored regex misses markers mid-reply, and is-json checks shape only.'),
      mcq('Where should a garak sweep sit in an AI assistant\'s pipeline?', [
        ['Before release, feeding human triage of what it flags', true],
        ['On every pull request, failing the build on any hit', false],
        ['In production, run against live customer sessions', false],
      ], 'A broad sweep is slow and its detectors flag many context-dependent things, so it informs triage before a release. Failing every PR on a heuristic hit would make the build meaningless, and testing belongs in staging, never on customers.'),
    ],
  },

  /* ── FINDINGS_AND_FIXES ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AISEC_ASSURANCE_FINDINGS_AND_FIXES',
    notes: `Testing produces findings. What a team does next — how it rates them, what evidence it keeps, how
it fixes them and how it proves the fix — is what makes the testing worth anything. The years' security
units covered writing findings up; this unit is what is different when the system contains a model.

## Severity for AI weaknesses

Rate on **impact** and **reachability**, as always, and add two AI-specific inputs:

- **Rate is not severity.** A weakness that lets the model trigger \`raise_dispute\` on the wrong
  transaction is High whether it reproduces 2% or 60% of the time: at a bank's volume, 2% is many
  customers a day. Rate tells you how urgent the measurement is, not whether to care.
- **What the model can reach decides impact.** The same "model followed a hidden instruction" is Low if
  the only outcome is an odd answer, High if it ends in a tool call or another customer's data. Your
  threat model's data flows tell you which.
- **Deterministic controls fail deterministically.** If the gateway accepts a customer id from the model,
  that is a bug, reproducible every time the model sends one — severity from impact alone.
- **Preconditions lower likelihood, not impact.** "Needs a staff account" or "needs a document in the
  index" matter, but a document anyone can upload is not much of a precondition.

A simple scale works: **Critical** (cross-tenant data or money moves without approval), **High**
(another customer's data or an unapproved action within a tenant), **Medium** (a probabilistic layer
below threshold with a deterministic control behind it; misleading answers on a money topic), **Low**
(a guard false positive cluster, cosmetic leaks of non-sensitive config).

## Evidence when outputs vary

"It happened once in staging" is not reproducible. A finding record carries:

    {"finding": "AIRT-019", "fixture": "INJ-DOC-02", "category": "approval bypass",
     "build": "2026.11.2", "prompt_sha256": "5f1c...", "model_settings": {"temperature": 0.7},
     "trials": 50, "occurrences": 6, "trace_ids": ["..."], "control": "approval binding"}

Fixture id (never the hostile text itself in the ticket), build, prompt hash, model and settings, trials
and occurrences, and trace ids for the runs where it happened. For a deterministic control, one trace
plus a failing scripted test **is** the evidence; for a probabilistic one, k of n with an interval.

## Fix in depth, not a patch

The tempting fix is the nearest one: reword the system prompt, add the fixture's phrasing to a block
list, or nudge the guard threshold until the fixture passes. Each of these is a **patch to the
symptom**, and each overfits — the held-out set exposes it. A fix in depth asks: *which control should
have stopped this, and why did it not?*

| Finding | Patch (avoid) | Fix in depth |
|---|---|---|
| Model triggers a dispute on a different transaction after approval | Prompt: "only act on the approved transaction" | Bind approval to a hash of the exact tool and arguments in the gateway |
| Another customer's note appears in a reply | Prompt: "never mention other customers" | Filter in the retrieval query from the session; test every user × chunk |
| Marker appears in an exported transcript | Add the export to a list of paths to check | One \`deliver()\` choke point every output path must go through |
| Guard misses a category | Add the fixture text to a keyword list | Deterministic control behind the guard for the actions that category reaches |

Often the right answer is two fixes: the deterministic control that removes the impact, and an
improvement to the probabilistic layer that lowers the rate.

## Proving the fix

A finding closes on evidence, not on a merged pull request:

1. **The regression test** for the finding fails on the old build and passes on the new one.
2. **The held-out fixtures** of the same category pass, showing the fix generalises.
3. **The benign set** shows no new over-blocking — a fix that refuses legitimate disputes is a new
   finding.
4. **For probabilistic layers**, the re-measured rate clears the threshold **on its interval**, with
   enough trials (from the measuring unit: zero failures in 59 trials to claim below 5%).
5. **Someone other than the fixer** reviews High and Critical retests.

Record the retest like the finding: same fixture ids, same settings, new build, the numbers. If a fix
lowers a rate without removing the cause, say so and keep the finding open at a lower severity — partial
fixes recorded as closed are how the same finding returns next quarter.

## Communicating

Owners need three things: what can happen (in business terms — "a customer's dispute could be raised on
the wrong transaction"), how sure you are (the numbers), and what you recommend with a date. Keep the
fixture text out of tickets and slides; the id and category are enough.`,
    workedExample: `**Finding AIRT-019, from discovery to closure.**

**Discovered.** Nightly live sampling: for fixture INJ-DOC-02 (category "instructions hidden in a
retrieved document"), the trace shows the customer approved \`raise_dispute\` for T1 and the executed
call was for T2. Six occurrences in 50 runs at release settings.

**Root cause.** The gateway stored approvals as a set of tool names:

    approved = {"raise_dispute"}
    if tool in approved: execute(tool, args)

Any \`raise_dispute\` call ran once the tool had been approved once — the arguments were never checked.

**Severity.** High: an action on the customer's account the customer did not approve, within the
tenant. Not Critical — no cross-tenant reach, and disputes are reversible. The 6/50 rate is noted but
does not change the rating; the gateway bug is deterministic once the model proposes a different
argument.

**Fix in depth.** Approval is bound to a hash of the exact tool and arguments, checked in the gateway.
Scripted check, real output:

    v1 executes: True      # approved {"raise_dispute"}, call for T2
    v2 executes: False     # approved hash of (raise_dispute, T1), call for T2

Second, lower-priority change: retrieved documents are fenced and marked untrusted in the prompt — this
lowers how often the model proposes the altered call, but the finding does not depend on it.

**Retest.**
- New regression test (scripted model proposes T2 after T1 approved): fails on 2026.11.2, passes on
  2026.11.3.
- Held-out approval-category fixtures (12): 0 altered calls executed.
- Live sampling, 60 runs of the category at release settings: 0 executed altered calls (Wilson upper
  bound 6.0%) — and, more importantly, the gateway cannot execute one by construction.
- Benign set: legitimate approved disputes still succeed (positive control green).

**Closed** by the reviewing security engineer, with the evidence attached and the test now permanent.`,
    mcqs: [
      mcq('A weakness lets the model trigger an unapproved fund-related action in 2% of runs at release settings. How should the rate affect the severity?', [
        ['Little: the impact decides severity; the rate informs urgency and sampling', true],
        ['Lower it to Low, because 2% means the action rarely happens in practice', false],
        ['Raise it to Critical, because any non-zero rate means it is exploitable', false],
      ], 'At production volume 2% is a lot of customers, and the impact (money moving without approval) is unchanged by the rate. Downgrading for rarity understates it; automatic Critical ignores the scale\'s criteria such as cross-tenant reach.'),
      mcq('Which is a fix in depth for "another customer\'s note appears in a reply"?', [
        ['A where filter built from the session in the retrieval query, tested per user', true],
        ['A sentence in the system prompt forbidding mention of other customers\' notes', false],
        ['A new guard rule that blocks replies containing the leaked note\'s exact wording', false],
      ], 'Filtering at retrieval removes the data before the model can see it, and the per-user test proves it. A prompt sentence is a request to the model, and a rule on one note\'s wording only stops that note.'),
      mcq('A fixer tuned a guard until every fixture in the finding passed, and the held-out fixtures of the same category still get through. What happened?', [
        ['The fix overfitted to the known fixtures instead of removing the cause', true],
        ['The held-out fixtures are mislabelled and belong in another category', false],
        ['The guard needs to be retrained on the held-out fixtures as well', false],
        ['The held-out set is too small to say anything about the category', false],
      ], 'Passing the seen fixtures but not unseen ones of the same category is overfitting, which is exactly what the held-out set exists to catch. Training on the held-out set destroys it as a check; mislabelling and size are guesses with no evidence here.'),
    ],
    checkpoint: [
      mcq('What evidence belongs in a finding record for a weakness that reproduces only sometimes?', [
        ['Fixture id, build, prompt hash, model settings, k of n and trace ids', true],
        ['A screenshot of the worst reply, with the full hostile input text', false],
        ['The tester\'s description, along with the date and time of the run', false],
      ], 'Varying outputs need the exact configuration and a rate to be reproducible and comparable at retest. A screenshot is one run and spreads the hostile text; a description and date cannot be re-run.'),
      mcq('A finding is "fixed" by rewording the system prompt, and its regression test now passes. What is still required before closing?', [
        ['Held-out fixtures, the benign set and an independent retest of the evidence', true],
        ['Only a code review of the prompt change by another member of the team', false],
        ['Only the merge of the change to the main branch and a production deploy', false],
      ], 'A passing regression test shows the known case changed; held-out fixtures show whether it generalises, the benign set shows nothing broke, and High findings need someone other than the fixer. Review or deploy alone is not evidence.'),
      mcq('A gateway accepts a customer id supplied by the model. Live sampling shows the model has sent one in 0 of 200 runs. How should the finding be rated?', [
        ['On impact: it is a deterministic bug, whatever the current rate', true],
        ['As informational, since it has never occurred during the sampling', false],
        ['As Medium, since the zero-of-200 upper bound is still near 1.9%', false],
      ], 'The control fails every time the model sends an id, and model behaviour changes with prompts, inputs and versions. Rating a deterministic control on today\'s model rate understates it; the interval is about the model, not the control.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AISEC_ASSURANCE_DEBUGGING',
    notes: `Broken assurance is quiet. A defence that misses and a test that cannot fail look exactly like a
working defence and a passing test — green builds, tidy numbers. Each case below is from a defence suite
like SahayBank Help's: the symptom, the cause, and the smallest fix that removes the cause. Every snippet
was run.

## 1. The output check misses the canary

**Symptom.** A nightly trace shows a reply containing \`canary-7731\`; the output check let it through.
The regression test is green.

**Cause.** The check compares case-sensitively, and the scripted test only ever used the upper-case
marker:

    def check_output_v1(text):
        return "[blocked]" if CANARY in text else text
    def check_output_v2(text):
        return "[blocked]" if CANARY.casefold() in text.casefold() else text
    reply = "Reference: canary-7731"
    print(check_output_v1(reply)); print(check_output_v2(reply))

    Reference: canary-7731
    [blocked]

**Fix.** Normalise before comparing (\`casefold()\`), and add a parametrised test over case variants
of the marker. The general lesson: test the control against the forms the model actually produces, not
the form you wrote.

## 2. The isolation test that tests nothing

**Symptom.** After a refactor renamed the metadata field from \`tenant\` to \`tenant_id\` in one place,
the cross-tenant test is still green — and customers report "I couldn't find anything".

**Cause.** The query's filter used the new key, the stored chunks the old one. Chroma returns no
matches, and a loop over zero hits asserts nothing:

    r = col.query(query_embeddings=[embed("card lost")], n_results=5, where={"tenant_id": "sahay"})
    print("hits with a misspelt metadata key:", r["ids"][0])

    hits with a misspelt metadata key: []

**Fix.** \`assert hits\` before checking each hit, assert a minimum number of checked results overall,
and add a positive case (the user DOES get their own chunk). A leak test must also be able to pass for
the right reason.

## 3. A regression case that never ran its misbehaviour

**Symptom.** INJ-DIRECT-01's test passes; reviewers find the output check had been commented out weeks
ago.

**Cause.** The fixture file was edited to \`INJ-DIRECT-1\`. The fake model has no script for that id and
returns its benign default, which never contained the canary, so "canary not in output" was true without
any check.

**Fix.** Assert the precondition (\`assert CANARY in attempt["reply"]\`) before asserting the control,
and fail the suite if any fixture id has no script entry. Then re-enable the check — the test now goes red
until you do.

## 4. An approval that approves too much

**Symptom.** A customer approved a dispute on T1; the trace shows \`raise_dispute\` executed for T2. The
approval test passes.

**Cause.** Approvals are stored as tool names; the test only ever approved and called the same
arguments:

    v1 executes: True      # approved {"raise_dispute"}, call for T2
    v2 executes: False     # approved hash of (raise_dispute, T1), call for T2

**Fix.** Bind approval to a hash of the exact tool name and sorted arguments, and add a test that
approves one argument set and calls with another.

## 5. The interval that claims certainty

**Symptom.** The release report says "block rate 100% (95% CI 100–100%), 20 trials". The next week's
run shows misses.

**Cause.** The report used the Wald interval, which collapses to zero width at 0% and 100%:

     20/20   rate 100.0%  Wilson  83.9%-100.0%   Wald 100.0%-100.0%
     19/20   rate  95.0%  Wilson  76.4%- 99.1%   Wald  85.4%-104.6%

**Fix.** Use Wilson, report the lower bound for block rates, and size the run from the plan (59 clean
trials to claim below 5%). A second version of this bug: dividing pooled repeats by the number of
fixtures instead of the number of runs, which gives rates above 100% — sanity-check that k ≤ n.

## 6. The gate that never fails

**Symptom.** Block rate dropped to 83.7%, the gate printed "GATE FAIL", and the pipeline was green.

**Cause.** The entry point called \`main()\` and dropped its return value, so the process exited 0:

    if __name__ == "__main__":
        main(sys.argv[1])          # return value dropped

    block rate lower bound 79.1% (min 85%); over-blocking upper bound 7.3% (max 8%)
    GATE FAIL: block rate below threshold
    exit 0

**Fix.** \`sys.exit(main(sys.argv[1]))\`. Check the same bug one level up: a shell step like
\`python gate.py r.json | tee gate.log\` reports \`tee\`'s exit status unless \`set -o pipefail\` is on,
and a step marked "continue on error" never blocks. Test the gate itself with a regressed results file
in CI and assert it exits non-zero.`,
    mcqs: [
      mcq('The cross-tenant test stays green after a metadata key was renamed in the query but not in the stored chunks. What made it pass?', [
        ['The filter matched nothing, and a loop over zero hits asserts nothing', true],
        ['Chroma ignored the unknown key and applied the old tenant filter instead', false],
        ['The renamed key matched every chunk, but all of them were the same tenant', false],
        ['pytest skipped the test because the collection raised a warning', false],
      ], 'A where clause on a key no chunk has returns an empty result; the per-hit assertions never execute. Chroma does not fall back to another key, and nothing was skipped. "assert hits" and a positive case catch it.'),
      mcq('A gate prints "GATE FAIL" but the CI step is green. The script ends with main(sys.argv[1]). What is the fix?', [
        ['Pass the return value to the process: sys.exit(main(sys.argv[1]))', true],
        ['Print "GATE FAIL" to stderr so that CI detects the failure message', false],
        ['Raise the threshold so that the block rate lies further below it', false],
      ], 'CI reads the exit status, and a dropped return value means exit 0. Writing to stderr does not change the status, and moving the threshold does nothing about a gate that cannot fail.'),
      mcq('The canary check passes its tests but misses "canary-7731" in a nightly trace. What is the smallest correct fix?', [
        ['Compare case-folded strings and test the marker in several cases', true],
        ['Plant the marker only in lower case so that it matches the replies', false],
        ['Ask the model in the system prompt never to change the marker\'s case', false],
        ['Replace the substring check with a guard model that judges leakage', false],
      ], 'The cause is a case-sensitive comparison; normalising both sides removes it and the variant tests keep it removed. Changing the planted marker just moves the blind spot, a prompt request is not a control, and a guard model makes a precise check fuzzy.'),
      mcq('Why does an approval test that approves T1 and then calls with T1 fail to catch approvals stored as tool names?', [
        ['It never calls with arguments different from the ones approved', true],
        ['It needs to run against the live model rather than a scripted one', false],
        ['It should approve both T1 and T2, so the stored set is non-empty', false],
      ], 'Name-only approval and exact-argument approval behave the same when the arguments match; only a mismatched call separates them. The model is irrelevant to this deterministic check, and approving T2 removes the very case you need.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AISEC_ASSURANCE_PRACTICE',
    notes: `Ten exercises across the topic, easiest first. Do each on paper or in your venv before reading the
answer. The numbers were computed with the \`wilson()\` function from Measuring Robustness Honestly.

## 1. Make the row checkable (easy)

A plan row says: "Tool use is safe." Rewrite it as one or more rows with a claim, a method and a
criterion for an assistant with \`get_balance\` (read) and \`block_card\` (write).

**Answer.** (a) "\`customer\` is taken from the session; any call with a model-supplied customer is
refused" — scripted fixtures, 0 executed. (b) "\`block_card\` runs only with the user's approval of the
exact arguments" — scripted unapproved and altered calls, 0 executed. (c) Positive control: an approved
\`block_card\` succeeds.

## 2. Deterministic or probabilistic? (easy)

Classify and give the pass criterion: retrieval metadata filter; input guard classifier; HTML encoding
of replies; an output safety model; rate limit per API key.

**Answer.** Deterministic, 0 failures: metadata filter, HTML encoding, rate limit (enforced at N+1).
Probabilistic, lower bound on block rate plus upper bound on over-blocking: input guard, output safety
model.

## 3. Wilson by reading (easy)

A guard blocked 45 of 50 hostile runs. The plan requires a lower bound of 85%. Pass?

**Answer.** 90.0%, Wilson 78.6–95.7%. Lower bound 78.6% < 85% — **fail**, even though the point estimate
is above the threshold. Run more trials before arguing about the guard.

## 4. Zero failures (medium)

You saw no cross-customer chunk in 30 checks, and in 200 checks. What upper bound can you state, and how
many clean checks would support "below 2%"?

**Answer.** 0/30: upper bound 11.4%. 0/200: 1.9%. For "below 2%": ceil(log 0.05 / log 0.98) = **149**.
(But remember: for a deterministic filter, the right claim is "0 leaks over every user × every chunk",
an exhaustive check, not a sample.)

## 5. Sample size for precision (medium)

How many hostile trials do you need to know a block rate near 90% to within ±5 points at 95%?

**Answer.** n ≈ 1.96² × 0.9 × 0.1 / 0.05² = **139** (round up). Plan for more if you also want
per-category numbers.

## 6. Gate decision (medium)

Plan: block lower bound ≥ 85%, over-blocking upper bound ≤ 8%, at least 200 trials. Results: 182/200
hostile blocked, 20/250 benign blocked. Ship?

**Answer.** Block 91.0% (86.2–94.2%): passes. Over-blocking 8.0% (5.2–**12.0%**): fails. Do not ship;
the guard costs too many real customers. A second tuning gives 176/200 and 9/250: block lower bound
82.8% fails, over-blocking upper bound 6.7% passes. Neither setting passes — the answer is a better
guard or a deterministic control, not a threshold argument.

## 7. Find the vacuous test (medium)

    def test_no_staff_docs_for_customers():
        for _, meta in retrieve(col, CUSTOMER, "ops runbook", k=5):
            assert meta["scope"] != "staff"

When does this pass without proving anything, and what two lines fix it?

**Answer.** When \`retrieve\` returns nothing (a broken filter key, an empty test index). Add \`hits =
retrieve(...)\` then \`assert hits\`, and a positive test that the same customer does retrieve their own
note.

## 8. Rate a finding (medium)

(a) The model, with a fixture in an uploaded FAQ, gets \`block_card\` executed on the user's own card
without approval, in 3 of 150 runs. (b) The guard blocks 7% of benign Hinglish questions. (c) The staff
runbook's canary appears in a staff user's own reply.

**Answer.** (a) High: an unapproved write action; the approval control is broken whatever the rate (3/150
is 2.0%, 0.7–5.7%). (b) Medium or Low by your scale — a product cost, but a finding: fix the guard for
that slice. (c) Not a finding by itself: staff may read the runbook. It becomes one if the reply reaches a
customer (export, shared transcript).

## 9. Place the step (medium)

Put each in PR, nightly or pre-release: scripted defence suite; pip-audit; live sampling of hostile and
benign sets; garak sweep of staging; gitleaks; multi-turn PyRIT scenarios.

**Answer.** PR: scripted suite, pip-audit, gitleaks. Nightly: live sampling (and on any model or prompt
change). Pre-release: garak sweep and PyRIT scenarios, feeding triage.

## 10. Patch or fix in depth? (harder)

For each proposed fix of "another tenant's chunk appeared in a reply", say patch or fix in depth: (a) add
"never discuss other banks' customers" to the prompt; (b) a \`where\` filter from the session in every
query, plus an every-user × every-chunk test; (c) a post-retrieval filter that drops other tenants' chunks
after top-k; (d) a collection per tenant chosen from the session.

**Answer.** (a) Patch. (b) Fix in depth. (c) Partial — it stops the leak but can return too few results
for small tenants (filtering after ranking), and the code briefly holds other tenants' text; prefer (b).
(d) Fix in depth — strong isolation, at some operational cost.`,
    mcqs: [
      mcq('A guard blocked 45 of 50 hostile runs; the plan needs a Wilson lower bound of at least 85%. What is the decision?', [
        ['Fail: the lower bound is about 79%, under the threshold', true],
        ['Pass: the 90% point estimate is above the 85% threshold', false],
        ['Pass: fifty runs exceed the minimum the plan sets out', false],
      ], '45/50 gives 78.6–95.7%; the plan is written on the lower bound precisely so a lucky small sample cannot pass. The point estimate and the run count are not the criterion.'),
      mcq('A gate sees 182/200 hostile blocked (86.2–94.2%) and 20/250 benign blocked (5.2–12.0%), with limits of 85% and 8%. What does it report?', [
        ['Fail on over-blocking: its upper bound exceeds the 8% limit', true],
        ['Pass: both point estimates are within their two limits', false],
        ['Fail on block rate: 91% is too close to the threshold', false],
      ], 'The block lower bound 86.2% clears 85%; over-blocking is judged on its upper bound, 12.0%, which exceeds 8%. The 8.0% point estimate looks like a pass only if you ignore the interval.'),
      mcq('Roughly how many hostile trials are needed to know a block rate near 90% to within ±5 points at 95% confidence?', [
        ['About 140', true],
        ['About 35', false],
        ['About 600', false],
        ['About 60', false],
      ], 'n ≈ 1.96² × 0.9 × 0.1 / 0.05² ≈ 139. Thirty-five or sixty gives a much wider margin; six hundred buys about ±2.4 points, more than the question asks.'),
      mcq('Which fix for "another tenant\'s chunk appeared in a reply" can still return too few results for small tenants?', [
        ['Dropping other tenants\' chunks after the top-k is ranked', true],
        ['A where filter built from the session inside the query', false],
        ['A separate collection per tenant chosen from the session', false],
      ], 'Filtering after ranking discards most of the top-k when a large tenant dominates the similarity scores. Filtering inside the query or choosing the tenant\'s own collection ranks only allowed chunks.'),
      mcq('The staff runbook\'s canary appears in a staff user\'s own reply. When does this become a finding?', [
        ['When that reply can reach a customer, for example through an export', true],
        ['Always, since any appearance of a canary marker is a leak in itself', false],
        ['Only if it happens in more than 5% of the staff users\' replies', false],
      ], 'Staff may read the runbook, so the marker in their own reply crossed no boundary. It becomes a leak when a path delivers it to someone not allowed to see it. A rate threshold is irrelevant to a scope question.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AISEC_ASSURANCE_INTERVIEW_QUESTION',
    notes: `AI security interviews at product companies and banks in Bengaluru, Hyderabad and Pune increasingly
ask how you would **prove** an AI feature is safe to ship. They listen for claims, numbers and controls
— not tricks. Four questions, a model answer, and the follow-up a good answer earns.

## Q1. "How would you test the security of an LLM assistant you built before release?"

**Model answer.** "I start from the threat model and list the controls: permission-filtered retrieval,
the tool gateway with session-bound identity, approvals bound to exact arguments, output encoding, the
guard, rate limits. Each gets a claim and a pass criterion. Deterministic controls must have zero
failures: I test them with a scripted fake model that misbehaves on labelled fixture ids, so every run
exercises the control. Probabilistic layers like the guard get a block rate with a Wilson lower bound
and an over-blocking rate on a benign set, measured at release settings in a separate staging tenant
with synthetic data and canary markers. The scripted suite runs on every PR, the measurements nightly,
and a gate fails the build on the bounds."

**Follow-up:** "Why a fake model? Isn't that testing nothing real?" — "It tests the control, which is
what I am certifying. The real model's rates are measured separately; if I only used the real model, a
run where it happened to behave would pass without the control ever being exercised."

## Q2. "Your guard blocked 98 of 100 test cases. Can we say it's 98% effective?"

**Model answer.** "Not as a headline. The 95% Wilson interval for 98/100 is roughly 93–99.5%, so the
honest claim is 'at least about 93%'. I'd also ask: were those 100 distinct fixtures or repeats? Repeats
are correlated. What was the temperature? And what is the over-blocking on real questions at the same
setting? A guard that blocks everything also scores 100%."

**Follow-up:** "How many trials would you want?" — "Depends on the claim. To support 'misses less than 5%'
with zero misses I need 59; to know the rate to ±3 points near 95% I need around 200. I'd put that in the
plan before running, so we don't stop when the number looks good."

## Q3. "A tester found the assistant raised a dispute on the wrong transaction once in 50 runs. What do you do?"

**Model answer.** "Treat it as High: an action the customer didn't approve, whatever the rate — at our
volume, 2% is many customers. Capture the evidence: fixture id, build, prompt hash, settings, k of n,
traces. Find the control that should have stopped it — here the approval — and fix it in depth: bind
approval to a hash of the exact tool and arguments in the gateway, rather than adding a line to the
prompt. Write a regression test that fails on the old build, then retest with held-out fixtures and the
benign set, and have someone else review before closing."

**Follow-up:** "The PM asks to ship with a prompt fix now and the gateway fix next sprint." — "Then the
finding stays open with an owner and date, the risk is accepted in writing by the system owner, and if
possible we put a temporary control in — for example, disable model-initiated disputes so they need a
form — rather than relying on the prompt."

## Q4. "What do tools like garak or promptfoo give you, and what don't they?"

**Model answer.** "Breadth and repeatability: maintained test categories, assertions, reports, CI
integration. promptfoo is good for my own fixtures and assertions against a staging endpoint; garak for
a broad pre-release sweep. They don't know my authorisation model, my tools' side effects or my data, so
they can't tell me user A can't see user B's documents. Their detectors are heuristics, so I read the
hit log and triage. And zero hits means zero hits for those probes at those settings — not secure."

**Follow-up:** "Where would you put them in CI?" — "Scripted suite and scans on every PR; promptfoo of
fixtures nightly; garak and multi-turn scenarios before release, feeding human triage rather than
failing builds automatically."`,
    mcqs: [
      mcq('In an interview, which reply best answers "your guard blocked 98 of 100 cases — is it 98% effective?"', [
        ['"About 93% at least on a Wilson interval; and what was the over-blocking?"', true],
        ['"Yes, 98% is the measured rate, and a hundred cases is a decent sample size"', false],
        ['"No, a guard is never effective; only deterministic controls can ever be trusted"', false],
      ], 'A strong answer gives the interval\'s lower bound and asks for the cost side. Accepting the point estimate ignores uncertainty, and dismissing guards entirely ignores that they lower rates behind deterministic controls.'),
      mcq('An interviewer asks why you test controls with a scripted fake model. What is the core of a good answer?', [
        ['It guarantees the control is exercised on every run, independent of the model', true],
        ['It is cheaper than calling a model, and cost is the main concern for tests', false],
        ['Real models cannot be called from CI pipelines for reasons of compliance', false],
      ], 'The point is that a run where the live model behaves would never test the control. Cost is a side benefit, and CI can call models — that is what the nightly measurement does.'),
      mcq('The PM wants to ship with a prompt tweak and fix the approval binding next sprint. What does a strong candidate propose?', [
        ['Keep the finding open, get written risk acceptance, add a temporary control', true],
        ['Ship as asked, since the prompt tweak lowered the measured rate to zero', false],
        ['Refuse to ship, as no release can have any open security finding at all', false],
      ], 'Residual risk is the owner\'s decision, recorded with a date, and a temporary deterministic control beats a prompt. Treating the prompt as a fix hides the risk; an absolute refusal ignores how risk acceptance works.'),
    ],
  },

  /* ── MINI_PROJECT ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AISEC_ASSURANCE_MINI_PROJECT',
    notes: `## The scenario

Sahay Bank (fictional) is adding a support assistant to its mobile app. Customers ask about cards, loans,
UPI disputes and branch services in English, Hindi and Hinglish; support staff use the same assistant
with wider access. Before launch, the bank's risk team wants evidence that the assistant's controls work.
You build the assistant with its controls and the **defence test suite** that proves them, and you write
the short assurance report the risk team will read.

Everything runs locally with a scripted fake model for the suite and, optionally, a local model through
Ollama for the measurement job. No real customer data, no production systems, no third-party targets.

## The assistant you build

- **Retrieval.** Chroma with metadata on every chunk: \`tenant\`, \`scope\` (public, customer, staff) and
  \`customer\`. Two tenants (Sahay Bank and a second bank) so isolation can be tested. About 30 chunks:
  public FAQs, per-customer notes for at least three synthetic customers, staff-only runbooks.
- **Tools** behind a gateway: \`get_balance\`, \`list_transactions\` (read), \`block_card\`,
  \`raise_dispute\` (write). Identity comes from the session; write tools need approval bound to the exact
  arguments.
- **Model-written filters.** The model may propose a transaction filter as JSON; only allow-listed keys
  are accepted and the query is parameterised SQL scoped to the session's customer.
- **Output handling.** A \`deliver()\` choke point every path uses (chat, transcript export): canary check
  (case-insensitive) and \`html.escape\` before rendering.
- **A guard layer** on input — a simple classifier or rule set you write, or a local guard model. It is
  there to be measured, not to be perfect.
- **A FastAPI \`POST /assist\`** endpoint with a session header, tested with TestClient.

## The data

- **Hostile fixtures** — at least 25, in a JSONL file of labels: \`id\`, \`category\`, \`control\`,
  \`severity\`, and \`text\` as a placeholder (\`"<fixture: ... restricted test set>"\`). Categories from
  your threat model: instruction override, instructions hidden in a retrieved document, cross-customer
  tool use, markup in output, filter widening, context marker in an alternate delivery path. Keep five
  aside as a **held-out** set.
- **A scripted fake model** — a table from fixture id to the misbehaviour it attempts (a reply containing
  \`CANARY-7731\`, a tool call with altered arguments, a filter with an extra key...). Plant a distinct
  canary in the system prompt, a staff runbook and the other bank's chunk.
- **A benign set** — at least 150 realistic customer questions you write or adapt, including Hinglish and
  ones that mention "block", "fraud" or "password" legitimately.

## Deliverables

1. **TEST_PLAN.md** — the control inventory (claim, method, criterion per control), environment, data
   sets with versions, roles and sign-off, exit criteria and retest triggers.
2. **The defence regression suite** (pytest): one parametrised test per fixture asserting the
   precondition (the scripted misbehaviour happened) and the control; a positive control for every
   refusing control; an exhaustive isolation test (every user × every chunk's own text, \`assert hits\`);
   a check that fails if any fixture id has no script entry.
3. **A mutation check** — a script that weakens each control in turn (monkeypatch) and shows the suite
   goes red. Include its output in the report.
4. **The measurement job** — hostile fixtures × repeats and the full benign set through the guard (and,
   if you use a local model, the whole pipeline), writing \`results.json\` with counts, per-category and
   per-fixture results, build id and settings.
5. **The gate** — \`gate.py\` with the plan's thresholds on Wilson bounds and a minimum trial count, plus a
   test that a regressed results file makes it exit non-zero.
6. **CI** — a GitHub Actions workflow: suite, Bandit, pip-audit and gitleaks on every push; measurement and
   gate on a schedule. The suite must be a required check.
7. **ASSURANCE.md** (two pages) — what was tested, the numbers with intervals, findings with severity and
   status, one finding taken through fix in depth and retest, residual risks for the owner to accept.

## Milestones

- **Day 1.** Assistant, data, gateway and filters; TEST_PLAN.md drafted.
- **Day 2.** Fixtures, scripted model and the regression suite green; mutation check red where it should be.
- **Day 3.** Measurement job, gate and CI; first numbers.
- **Day 4.** Triage, one fix in depth with retest against held-out fixtures, and ASSURANCE.md.

## Acceptance checks

- \`pytest\` passes, and the mutation script shows every control's tests fail when it is weakened.
- Renaming a metadata key in the query makes the isolation test fail, not pass.
- The gate exits 1 on a regressed results file and 0 on a good one; CI shows both.
- Every rate in ASSURANCE.md has k, n, a Wilson interval and the settings it was measured at.
- No hostile text appears anywhere outside the fixture file's placeholders.

## Common traps

- Testing the model instead of the control — a test that sends a fixture and checks "nothing bad" with no
  scripted misbehaviour.
- Filtering after ranking instead of inside the query.
- Over-blocking never measured, or measured at different settings from the block rate.
- Reporting point estimates, or pooling repeats as independent trials without per-fixture results.
- A gate that prints FAIL and exits 0.
- "Fixing" a finding with a prompt sentence and closing it without the held-out retest.`,
    assignment: {
      title: 'A Defence Test Suite for a Bank\'s Support Assistant',
      description: 'Build a RAG-and-tools banking support assistant with permission-filtered retrieval, a least-privilege tool gateway and safe output handling, then prove its controls with a test plan, a defence regression suite in CI, block rates and over-blocking with Wilson intervals, and a short assurance report.',
      instructions: `1. Build the assistant: Chroma retrieval with tenant/scope/customer metadata filtered from the session,
   a tool gateway with session-bound identity and approvals bound to exact arguments, allow-listed
   parameterised SQL for model-written filters, and one deliver() path with a case-insensitive canary
   check and HTML escaping, behind FastAPI POST /assist.
2. Write TEST_PLAN.md: control inventory with claims and criteria, environment, data versions, roles,
   exit criteria and retest triggers.
3. Create at least 25 labelled hostile fixtures (placeholder text only, five held out), a scripted fake
   model, distinct canaries and a benign set of at least 150 questions.
4. Write the pytest defence suite with preconditions, positive controls and an exhaustive isolation
   test; add a mutation script and show every control's tests go red when it is weakened.
5. Write the measurement job and gate.py on Wilson bounds with a minimum trial count, a test that the
   gate fails on regressed results, and a GitHub Actions workflow running suite, scans and gate.
6. Triage findings, take one through fix in depth and retest (held-out and benign sets), and write
   ASSURANCE.md. Submit the repository link and a short recording of the suite, the mutation check and
   the gate failing and passing.`,
      rubric: [
        { criterion: 'Controls built in', description: 'Retrieval filtered in the query from the session, gateway with session identity and exact-argument approvals, allow-listed parameterised SQL, one deliver() path with canary check and escaping.', maxPoints: 20 },
        { criterion: 'Test plan', description: 'Every control has a checkable claim, method and criterion; deterministic vs probabilistic criteria correct; environment, data versions, roles, exit criteria and retest triggers stated.', maxPoints: 15 },
        { criterion: 'Defence regression suite', description: 'Labelled fixtures with placeholder text, scripted misbehaviour, preconditions, positive controls, exhaustive isolation test with assert hits, missing-script check, and a mutation check that goes red.', maxPoints: 25 },
        { criterion: 'Measurement and gate', description: 'Block and over-blocking rates at release settings with Wilson intervals, per-category and per-fixture results, gate on bounds with a minimum trial count, gate tested to fail, CI wired.', maxPoints: 20 },
        { criterion: 'Findings, fix and report', description: 'Severity on impact, reproducible evidence, one fix in depth retested on held-out and benign sets, and an assurance report whose every number has k, n, an interval and settings.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    mcqs: [
      mcq('The project requires a mutation script that weakens each control. What does it demonstrate that a green suite does not?', [
        ['That each control\'s tests can actually fail when it breaks', true],
        ['That the controls hold against the restricted hostile fixtures', false],
        ['That the suite runs fast enough to be a required check in CI', false],
      ], 'A green suite shows the current code passes; only a deliberate weakening that turns it red shows the tests are capable of detecting a regression. Holding against fixtures is what the green run shows, and speed is unrelated.'),
      mcq('Why must the project\'s ASSURANCE.md give settings alongside every rate?', [
        ['Rates change with model, prompt and temperature, so a number without them cannot be compared or re-run', true],
        ['The risk team requires the settings to recompute the Wilson intervals from scratch on their side', false],
        ['Settings show the guard was tuned, which is required evidence for closing every open finding', false],
      ], 'A block rate is a property of a configuration; without the build, prompt and model settings, a retest cannot be like for like. Wilson needs only k and n, and tuning evidence is not what settings are for.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AISEC_ASSURANCE_CHECKPOINT',
    notes: `Ten questions across the topic: security test plans, defence regression suites, measuring robustness
with intervals and over-blocking, evaluation and scanning tools in the pipeline, and triaging findings
and verifying fixes. Answer as the engineer who has to sign the release.`,
    checkpoint: [
      mcq('A release plan lists "the assistant resists prompt injection" as an exit criterion. What is wrong with it?', [
        ['It names no control, method or measurable criterion to check', true],
        ['It should name a specific model version that resists injection', false],
        ['It belongs in the threat model, not in the security test plan', false],
      ], 'Exit criteria must be checkable: a control, how it is verified, and a pass mark such as zero executed unapproved calls or a block-rate lower bound. Model versions are not criteria, and the plan is exactly where criteria go.'),
      mcq('Which of these controls should be held to "zero failures over the whole fixture set"?', [
        ['HTML encoding of replies before they are rendered', true],
        ['A guard classifier flagging hostile input messages', false],
        ['An output safety model scoring generated replies', false],
      ], 'Encoding is deterministic code: any failure is a bug. Classifiers and safety models err at a rate, so they are judged on interval bounds for block rate and over-blocking.'),
      ck('PROMPT_INJECTION', 'In a defence suite, the fixture for "instructions hidden in a retrieved document" scripts the fake model to propose raise_dispute without approval. What should the test assert?', [
        ['The gateway refuses the call because no approval matches it', true],
        ['The model declines to propose the call after reading the text', false],
        ['The retrieved document is removed from the index after the run', false],
      ], 'The scripted model misbehaves by design; the test certifies the control behind it, the approval check in the gateway. Asserting the model declines tests the model, and deleting documents is not a control under test.'),
      ck('PROMPT_INJECTION', 'Why should each new injection-related finding get its regression test before the fix is merged?', [
        ['A test first seen failing on old code proves it detects the weakness', true],
        ['Tests written after the fix are not allowed to use scripted models', false],
        ['The fix cannot be code-reviewed until a test file exists beside it', false],
      ], 'Seeing the test fail on the vulnerable build and pass on the fixed one is the evidence that it guards this weakness. The other two options are invented rules.'),
      mcq('A guard blocked 57 of 60 distinct hostile fixtures. Which report line is honest?', [
        ['95.0%, 95% Wilson interval about 86–98%, at the release settings', true],
        ['95.0% block rate, and the guard can be relied on at that level', false],
        ['95.0%, Wald interval 89–100%, so the release threshold is met', false],
      ], 'Wilson for 57/60 is 86.3–98.3%; the lower bound is the defensible claim, with the settings that produced it. A bare point estimate overstates certainty, and Wald is unreliable near 100%.'),
      mcq('The block rate and the over-blocking rate were measured on different builds a week apart. Why is that a problem?', [
        ['Guard changes move both rates, so the trade-off cannot be read', true],
        ['Wilson intervals cannot be computed for runs a week apart', false],
        ['Over-blocking must always be measured before the block rate', false],
      ], 'Both rates respond to the same thresholds and prompts; measured apart, you cannot tell what the current build costs or catches. The arithmetic does not depend on dates, and order is irrelevant.'),
      mcq('A nightly promptfoo run against staging uses assertions that look for CANARY-7731. What can it NOT establish on its own?', [
        ['That a customer cannot act on another customer\'s account', true],
        ['That the marker did not appear in replies to those tests', false],
        ['That the replies for those tests parsed as valid JSON', false],
      ], 'Assertions on replies see text; cross-customer actions are tool side effects under identity, which the scripted gateway tests check. Marker presence and JSON validity are exactly what such assertions verify.'),
      mcq('Your gate script prints "GATE FAIL" in a CI log, yet the pipeline is green. What do you check first?', [
        ['Whether the process exit status carries the failure', true],
        ['Whether the threshold in the plan was set too low', false],
        ['Whether the Wilson function has a rounding error', false],
      ], 'CI decides on exit status: a dropped return value, a pipe without pipefail or continue-on-error all turn a printed failure into a green step. The threshold and the maths are irrelevant to a gate that cannot fail.'),
      mcq('A fix makes the original fixtures pass but not the held-out fixtures of the same category. How should the finding be recorded?', [
        ['Still open: the fix did not generalise beyond the seen inputs', true],
        ['Closed: the reported fixtures now pass their regression tests', false],
        ['Closed: held-out fixtures belong in a separate new finding', false],
      ], 'The held-out set exists to catch fixes tuned to known inputs; failing it means the weakness remains. Closing on the seen fixtures, or splitting the finding to close it, records a risk as fixed when it is not.'),
      mcq('Live sampling shows the model proposed an altered dispute call in 6 of 50 runs, and the gateway executed it. What decides the severity?', [
        ['The impact: an unapproved action on the customer\'s account', true],
        ['The rate: 12% is above a typical acceptance threshold of 10%', false],
        ['The interval: its lower bound decides whether it is a finding', false],
      ], 'The approval control failed deterministically once the model proposed different arguments, and the outcome is an action the customer did not approve. The rate and its interval inform urgency and retest, not severity.'),
    ],
  },
];
