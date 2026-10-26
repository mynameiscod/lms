/**
 * Career-track content: Running AI Applications in Production (AI_PRODUCTION), the AI tracks, batch AI1.
 *
 * Scope: the four GenAI application patterns and the architecture each needs; model routing, exact and
 * semantic caching and provider fallbacks; cost, latency and rate-limit budgets; tracing and
 * observability; background jobs for slow AI work; and deploying the FastAPI service with its secrets,
 * health checks and a safe way to change prompts or models. The mini project takes the policy-document
 * RAG service from AI_RAG_DEEP's mini project to production.
 *
 * Builds on JT_AI_CONCEPTS (tokens, cost, structured output), JT_FASTAPI and JT_AI_PY (FastAPI, calling a
 * model, Pydantic) and DS_DEPLOYMENT (Docker, configuration from the environment, health endpoints for a
 * model API). Those ideas get one sentence of reference, not a re-teach.
 *
 * Every Python snippet that needs no paid key was run in the scratch venv and its printed output is the
 * real output (timings vary by a few milliseconds run to run). The fake model stands in for a provider
 * call. The Celery example needs a broker and was written from the documented API, not run. No prices and
 * no model version names: the cost lesson uses made-up "price units" so the arithmetic is visible.
 *
 * Skills: GENAI_APP_PATTERNS by default; BACKGROUND_JOBS is API_FUNDAMENTALS and DEPLOY_AI_SERVICE is
 * MODEL_DEPLOYMENT (trackSkillAttribution). Checkpoint questions plainly about another skill use ck().
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const DEP = 'MODEL_DEPLOYMENT';
const API = 'API_FUNDAMENTALS';

export const TRACK_AI_PRODUCTION_BUNDLES: PilotBundle[] = [
  /* ── APP_PATTERNS ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_PRODUCTION_APP_PATTERNS',
    notes: `You can already call a model from FastAPI and ground it with retrieval (Building with LLMs and the
Python AI topic). The question at a job is different: **what shape of system** does this product need?
Almost every GenAI feature in production is one of four patterns, and each pattern has its own latency
budget, failure mode and definition of "working". Pick the pattern first; the architecture follows.

## 1. The chat assistant

A user types, the system answers, the user follows up. Examples: an HR policy assistant on the intranet,
a support bot in a bank's app, a course doubt-solver.

- **Latency:** interactive. The first words must appear within a second or two, so you **stream**.
- **State:** the conversation lives on your server (a session table), and you resend the relevant turns
  each call. Long conversations are summarised or trimmed, or cost grows with every turn.
- **Grounding:** usually RAG over the company's documents, with citations.
- **Failure mode:** a confident wrong answer in front of the user. Guardrails, "I don't know" behaviour
  and an escalation path to a human matter more than cleverness.
- **Quality signal:** groundedness on a sampled set, thumbs-down rate, escalation rate.

## 2. The extraction pipeline

A document goes in, a fixed structure comes out: invoice fields, resume skills, KYC form data, the
clauses of a contract. No conversation at all.

- **Latency:** often not interactive; seconds to minutes is fine.
- **Output:** a schema, validated in code, at temperature 0.
- **Failure mode:** a wrong field silently stored. So every record is **validated**, and failures go to a
  **human review queue** rather than the database.
- **Quality signal:** field-level accuracy against a labelled set, review-queue rate.

    from typing import Literal
    from pydantic import BaseModel, Field, ValidationError

    class Invoice(BaseModel):
        vendor: str = Field(min_length=2)
        gstin: str = Field(pattern=r"^\\d{2}[A-Z]{5}\\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")
        total_inr: float = Field(gt=0)
        category: Literal["TRAVEL", "SOFTWARE", "OFFICE", "OTHER"]

    FAKE_REPLIES = {   # what the model returned for three invoices
        "inv-1": '{"vendor": "Sharma Travels", "gstin": "29ABCDE1234F1Z5", "total_inr": 18450, "category": "TRAVEL"}',
        "inv-2": '{"vendor": "CloudKart", "gstin": "29ABCDE1234F1Z", "total_inr": 4999, "category": "SOFTWARE"}',
        "inv-3": '{"vendor": "Stationery Hub", "gstin": "27PQRSX9876K1Z2", "total_inr": -120, "category": "Office"}',
    }

    accepted, review = [], []
    for doc_id, raw in FAKE_REPLIES.items():
        try:
            accepted.append((doc_id, Invoice.model_validate_json(raw)))
        except ValidationError as e:
            review.append((doc_id, [err["loc"][0] for err in e.errors()]))

    print("accepted:", [d for d, _ in accepted])
    print("to human review:", review)

prints

    accepted: ['inv-1']
    to human review: [('inv-2', ['gstin']), ('inv-3', ['total_inr', 'category'])]

A GSTIN one character short, a negative total and "Office" instead of "OFFICE" never reach the ledger.

## 3. The copilot inside a product

The model sits inside an existing workflow and **suggests**; the user accepts, edits or rejects. Examples:
"draft a reply" in a CRM, "write the SQL for this question" in a dashboard tool, "suggest test cases" in
a code editor.

- **Context:** the user's current screen, record or file, not a document library.
- **Actions:** if it calls tools (create a ticket, update a field), it calls **your API with the
  user's own permissions**, never a superuser key. A copilot must not be able to do what the user cannot.
- **Failure mode:** a bad suggestion accepted without reading. Show diffs, ask for confirmation on any
  write, and log who accepted what.
- **Quality signal:** acceptance rate and edit distance between the suggestion and what was kept.

## 4. Batch enrichment

Run a model over a large set of records offline: tag 2 lakh support tickets by category, summarise every
product review, translate a catalogue into Hindi and Tamil.

- **Latency:** irrelevant per item; total throughput and cost are what count. Providers offer **batch
  APIs** at a lower price with a completion window of hours, which is ideal here.
- **Engineering:** a job that is **resumable** (skip items already done), **idempotent** (re-running
  does not double-write), rate-limited, and that records the prompt version on every output row.
- **Failure mode:** a prompt bug discovered after 1.5 lakh rows. Run a sample of 200, review it, then
  run the rest.

## The decision, in one table

    Pattern            User waiting?   State            Output             Biggest risk
    Chat assistant     yes, streams    conversation     free text + cites  confident wrong answer
    Extraction         rarely          none             validated schema   wrong field stored
    Copilot            yes, short      the open record  suggestion / diff  bad action accepted
    Batch enrichment   no              job progress     rows in a table    bug at scale, cost

## The building blocks they share

Whatever the pattern, a production GenAI service ends up with the same pieces, and the rest of this
topic builds them one by one:

1. A **gateway** in front of providers: routing, caching, fallbacks, keys in one place.
2. A **prompt registry**: versioned templates, the version logged on every call.
3. **Budgets**: cost per request, timeouts, rate limits per user.
4. **Tracing**: every model call, retrieval and tool step, with tokens and latency.
5. **Background jobs** for anything slower than a few seconds.
6. A **deployment** with configuration from the environment and an evaluation gate on every prompt or
   model change.

## When the answer is "no LLM"

A strong engineer also says when the pattern is wrong. If the "chatbot" users actually want is a search
box over twelve FAQ entries, build the search box. If the extraction is from a fixed government form
with fixed positions, a template parser is cheaper and exact. If a rule decides the outcome (leave
balance, loan eligibility), compute it in code and let the model only explain the result. The model is
for language that varies; deterministic logic stays deterministic.`,
    workedExample: `**Problem:** a 4,000-employee IT services company in Hyderabad wants "AI for the HR portal". The
product manager's list:

1. Employees ask policy questions ("Can I carry forward unused earned leave?", often in Hinglish).
2. HR uploads offer letters and wants the CTC, joining date and location pulled into the HRMS.
3. HR business partners want a "draft a reply" button on employee tickets.
4. The 18 months of old tickets should be tagged by category for a report.

**Step 1 — name the pattern for each.** (1) is a **chat assistant** with RAG over policy PDFs. (2) is
an **extraction pipeline**. (3) is a **copilot** inside the ticket screen. (4) is **batch enrichment**.

**Step 2 — set the budget per pattern.**

- Assistant: first token under 2 s, answer under 8 s, citations on every answer, "I don't know" when the
  policies do not cover it.
- Extraction: under a minute per letter is fine; zero wrong CTCs stored, so every record is validated
  and failures go to an HR reviewer.
- Copilot: draft in under 5 s; never sent automatically; the partner edits and clicks Send.
- Batch: overnight is fine; use the provider's batch API; resumable; tag a 200-ticket sample first.

**Step 3 — spot the deterministic parts.** "How many leaves do I have left?" is not a policy question,
it is a database lookup. The assistant calls the HRMS for the balance (as the logged-in employee) and
uses the model only to phrase the answer. Leave eligibility is computed by rule, never guessed.

**Step 4 — sketch the shared architecture.**

    browser / HRMS ──► FastAPI service ──► gateway (route, cache, fallback) ──► providers
                          │    │                         │
                          │    └── retrieval (policy index)
                          │
                          ├── Redis queue ──► workers (extraction, batch tagging)
                          └── traces + cost per request ──► dashboard

**Step 5 — order the work.** Ship the extraction pipeline first: it has a labelled set (letters already
keyed in by HR) so accuracy is measurable on day one, and a human reviews failures. The assistant comes
second, behind an evaluation set of 60 real questions. The copilot and batch job reuse the same gateway
and tracing, so they are cheap once the first two exist.`,
    mcqs: [
      mcq('A lending startup wants a model to read uploaded salary slips and fill the applicant\'s employer, net pay and month into its loan system. Which pattern and safeguard fit best?', [
        ['An extraction pipeline that validates each record and queues failures for review', true],
        ['A chat assistant that asks the applicant to confirm the figures in a conversation', false],
        ['A batch enrichment job run monthly over every slip received in the previous month', false],
        ['A copilot that suggests figures to the applicant while they fill in the loan form', false],
      ], 'Fixed fields out of a document is extraction, and the risk is a wrong figure stored silently, so validation and a human review queue are the safeguard. A chat flow adds latency without checking anything, and a monthly batch is far too slow for a loan decision.'),
      mcq('A CRM\'s "draft a reply" copilot can also close tickets through a tool call. It was given a service account key with admin rights so the tool call always succeeds. What is the problem?', [
        ['The copilot can now do things the logged-in user is not allowed to do', true],
        ['Admin keys make every model call slower because of the extra checks', false],
        ['Tool calls only work when the model runs at a temperature above one', false],
      ], 'A copilot acts for the user, so it must call your API with the user\'s permissions. An admin key lets a prompt-injected or simply wrong suggestion close tickets the user could never touch. Latency and temperature have nothing to do with authorisation.'),
      mcq('An e-commerce team must translate 3 lakh product descriptions into Tamil before a festival sale in two weeks. Which design fits?', [
        ['A resumable batch job on the provider\'s batch API, with a reviewed sample first', true],
        ['A streaming chat endpoint that translators call once for every product listing', false],
        ['One synchronous request per product made from the page when a shopper opens it', false],
      ], 'Nobody waits on each item, so throughput and cost matter: batch APIs are cheaper and a resumable job survives failures. Translating on page view puts latency and cost in front of shoppers, and a chat endpoint adds a human to every one of 3 lakh items.'),
    ],
    checkpoint: [
      mcq('An HR assistant is asked "How many earned leaves do I have left?". Where should the number in the answer come from?', [
        ['A lookup in the HRMS as the logged-in employee, which the model then phrases', true],
        ['The leave policy PDF retrieved by RAG, which the model then calculates from', false],
        ['The model\'s own estimate, checked afterwards against the policy for errors', false],
        ['A cached answer given earlier to another employee who asked the same thing', false],
      ], 'The balance is a fact in a database, so code fetches it with the user\'s permissions and the model only explains it. Calculating from the policy ignores what the employee actually took, and a cached answer from someone else is both wrong and a data leak.'),
      mcq('Which quality signal is the most useful for a "suggest a reply" copilot in a support tool?', [
        ['How often agents accept drafts and how much they edit before sending', true],
        ['How many tokens each draft uses compared with the previous model', false],
        ['How quickly the first token of each draft appears on the screen', false],
      ], 'A copilot succeeds when people keep what it suggests, so acceptance rate and edit distance measure quality directly. Token counts and first-token time are cost and speed measures; they say nothing about whether the drafts were any good.'),
      mcq('A college wants a chatbot that answers twelve fixed questions about exam dates and hall tickets. What is the strongest engineering recommendation?', [
        ['A search box or FAQ page, because the answers are few, fixed and known', true],
        ['A chat assistant with RAG, because students prefer to type questions', false],
        ['A fine-tuned model, because the exam answers must be exactly correct', false],
        ['A copilot inside the portal, because it can see each student\'s record', false],
      ], 'Twelve fixed answers do not need language generation; a search or FAQ is exact, instant and free to run. RAG and fine-tuning add cost and the chance of a wrong date, and a copilot is for suggesting edits inside a workflow, not for static facts.'),
    ],
  },

  /* ── ROUTING_CACHING ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_PRODUCTION_ROUTING_CACHING',
    notes: `Every request does not need your largest model, and many requests have been answered before. A
**gateway** layer in front of the providers decides which model to call, whether a cached answer can be
reused, and what to do when a provider fails. It is the cheapest performance and cost win in most GenAI
services.

## Routing: a small model first

Three common strategies, from simplest to most capable:

1. **Rules.** Short lookups go to a small model; anything with "compare", "calculate", "draft", or a long
   input goes to a large one. Crude but transparent and easy to test.
2. **A classifier.** A cheap model (or a tiny trained classifier on embeddings) labels each request
   *simple* or *complex*. Train it on traces you already have, labelled by which model's answer passed
   your evaluation.
3. **A cascade.** Call the small model; if its output fails validation, or a cheap check says it is
   unsure ("not found in the documents", schema error, low retrieval score), escalate to the large one.
   You pay twice on the hard minority and once on the easy majority.

Measure routing with your evaluation set: the router is good if quality stays within your threshold of
"large model always" while the large-model share drops. Log the routing decision on every trace.

## Exact caching

Same input, same answer: store it. The **key** is the whole thing: model, prompt version, parameters
that change output (temperature, max tokens) and the normalised input. Leave out the prompt version and
users get last week's answers after you ship a new prompt.

- **Normalise** cheaply: lower-case, collapse whitespace. Do not normalise away meaning.
- **Scope** the key by tenant, and by user when the answer depends on who asks.
- **TTL and invalidation:** when the HR team uploads a new leave policy, answers built on the old one
  must go. Tag cache entries with the document ids they cite and delete by tag on re-index.
- Use **Redis** in production so every worker shares the cache; a Python dict lives in one process.

## Semantic caching

"How many casual leaves per year?" and "How many casual leaves do I get in a year?" are different
strings with the same answer. A semantic cache embeds the question (you met embeddings in Building with
LLMs) and reuses an answer whose question is similar enough. It is also where caching goes wrong.

    import hashlib, json
    import numpy as np
    from sentence_transformers import SentenceTransformer

    def fake_model(name, prompt):
        return f"[{name}] answer to: {prompt[:40]}"

    def route(question: str) -> str:
        q = question.lower()
        hard = len(q.split()) > 25 or any(w in q for w in ("compare", "calculate", "why", "draft"))
        return "large" if hard else "small"

    class ExactCache:
        def __init__(self):
            self.store = {}
        def key(self, model, prompt_version, prompt):
            norm = " ".join(prompt.lower().split())
            raw = json.dumps({"m": model, "v": prompt_version, "p": norm})
            return hashlib.sha256(raw.encode()).hexdigest()
        def get(self, k):
            return self.store.get(k)
        def put(self, k, v):
            self.store[k] = v

    class SemanticCache:
        def __init__(self, threshold=0.90):
            self.enc = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
            self.vecs, self.answers, self.threshold = [], [], threshold
        def get(self, question):
            if not self.vecs:
                return None, 0.0
            v = self.enc.encode(question, normalize_embeddings=True)
            sims = np.array(self.vecs) @ v
            i = int(sims.argmax())
            return (self.answers[i] if sims[i] >= self.threshold else None), float(sims[i])
        def put(self, question, answer):
            self.vecs.append(self.enc.encode(question, normalize_embeddings=True))
            self.answers.append(answer)

    exact, semantic = ExactCache(), SemanticCache()

    def answer(question, prompt_version="leave-v3"):
        model = route(question)
        k = exact.key(model, prompt_version, question)
        if (hit := exact.get(k)):
            return "exact", hit
        hit, score = semantic.get(question)
        if hit:
            return f"semantic {score:.2f}", hit
        out = fake_model(model, question)
        exact.put(k, out); semantic.put(question, out)
        return f"miss ({model}, best {score:.2f})", out

    for q in ["How many casual leaves do I get in a year?",
              "how many casual leaves do I get in a year?  ",
              "How many casual leaves do I get per year?",
              "How many sick leaves do I get in a year?",
              "Compare the leave policy for interns and full-time staff"]:
        how, out = answer(q)
        print(f"{how:22} | {q}")

prints

    miss (small, best 0.00) | How many casual leaves do I get in a year?
    exact                  | how many casual leaves do I get in a year?
    semantic 0.97          | How many casual leaves do I get per year?
    miss (small, best 0.81) | How many sick leaves do I get in a year?
    miss (large, best 0.19) | Compare the leave policy for interns and full-time staff

Look at the fourth line. *Sick* leave scored **0.81** against *casual* leave: one word apart, different
answer. A threshold of 0.80 would have served the casual-leave answer to a sick-leave question. That is
the semantic cache's core risk, and why:

- the threshold is chosen from **labelled pairs** of your own traffic (same-answer and different-answer),
  not from intuition;
- the cache is scoped by tenant, prompt version and the user's **permissions** (an answer built from
  documents user A may see must never be served to user B);
- personalised answers ("my leave balance") are never semantically cached.

## Provider-side prompt caching

Many providers cache a long, **identical prefix** of the prompt (system message, tool definitions,
shared documents) and bill those input tokens at a discount on later calls. You get it by putting the
stable parts first and the variable parts (retrieved chunks, the question) last. It does not return a
stored answer; it only makes re-reading the same prefix cheaper and faster.

## Fallbacks

Providers return 429 (rate limited), 5xx and timeouts. A fallback chain tries a second provider or
model when the first fails with a **retryable** error:

- Set a **timeout** on every call; a hung call is worse than a failed one.
- Fall back only on errors that a different provider could fix (429, 5xx, timeout). A 400 because your
  request is malformed will fail everywhere.
- Add a **circuit breaker**: after N failures in a minute, stop calling the broken provider for a while
  instead of paying a timeout on every request.
- The fallback model must have passed your evaluation set too. A fallback that answers badly is an
  outage with extra steps.

## The gateway

Routing, caching, fallbacks, keys, rate limits and logging belong in **one place**, not copied into
every endpoint. Teams either write a small internal module or run a gateway such as **LiteLLM** or a
cloud provider's AI gateway, which gives one API over many providers. Either way, application code asks
for "the answer model", and the gateway decides which real model that means today.`,
    workedExample: `**Problem:** the policy assistant gets about 40,000 questions a month. Traces show many are
near-duplicates. The team wants a semantic cache but is afraid of serving wrong answers. Choose the
threshold.

**Step 1 — collect labelled pairs.** From last month's traces, take 300 pairs of questions whose
embeddings are similar (cosine above 0.7) and have an HR analyst mark each pair: *same answer* or
*different answer*. Examples:

    "casual leave per year?"   vs "how many CL in a year?"          same
    "casual leave per year?"   vs "sick leave per year?"            different
    "notice period for L3?"    vs "notice period for L5?"           different
    "WFH policy for interns"   vs "can interns work from home?"     same

**Step 2 — score every pair** with the same encoder the cache uses and sort by similarity.

**Step 3 — read the table at candidate thresholds.**

    threshold  pairs above  of which "different"   wrong-answer rate   hit share
    0.80       171          19                     11.1%              57%
    0.85       128          6                      4.7%               43%
    0.90       84           1                      1.2%               28%
    0.93       55           0                      0.0%               18%

(The numbers are the team's own; your table will differ.) Every "different" pair above the threshold is
a user who would get someone else's answer.

**Step 4 — decide with the cost of a wrong answer in mind.** A wrong leave-policy answer causes a real
HR dispute; a slightly lower hit rate only costs model calls. The team picks **0.93**: no wrong answers
in the sample, still 18% of traffic served from cache.

**Step 5 — reduce the risk further.**

- Scope the key: tenant, prompt version, and the **set of documents the user may read**.
- Never semantically cache questions containing "my", an employee id, or a number the answer depends on
  ("L3" vs "L5" was a near miss).
- Tag entries with the document ids cited; drop them when those documents are re-indexed.
- Log every semantic hit with its score, and sample 50 hits a week for review.

**Step 6 — keep the exact cache in front.** It is free of this risk and catches repeated clicks and
retries, so it goes first; the semantic cache only sees exact misses.`,
    mcqs: [
      mcq('A team ships prompt version answer-v4, but users keep getting answers in the old format for the next day. The exact-cache key is a hash of the model name and the normalised question. What is the fix?', [
        ['Add the prompt version and output-shaping parameters to the cache key', true],
        ['Lower the semantic-cache threshold so fewer old answers are matched', false],
        ['Switch the cache from Redis to an in-process Python dictionary instead', false],
        ['Raise the temperature so the model produces a fresh answer each time', false],
      ], 'A cache key must include everything that changes the output. Without the prompt version, answer-v3 entries satisfy answer-v4 requests until their TTL runs out. The semantic threshold and temperature are unrelated, and a per-process dict only makes the cache inconsistent across workers.'),
      mcq('A gateway falls back to a second provider on every exception. During one incident, requests with an oversized payload fail at both providers and the error dashboard doubles. What should change?', [
        ['Fall back only on retryable errors such as 429, 5xx and timeouts', true],
        ['Add a third provider so the oversized requests have one more chance', false],
        ['Remove the timeout so that the slow providers can finish their work', false],
      ], 'A 400 for an invalid or oversized request fails everywhere, so falling back only spends time and doubles the noise. Retry or fall back on errors another provider could actually fix. A third provider repeats the waste and removing timeouts lets hung calls pile up.'),
      mcq('To use provider-side prompt caching, how should a RAG prompt be ordered?', [
        ['System message and tool definitions first, retrieved chunks and question last', true],
        ['The user\'s question first, so the model reads the most important part early', false],
        ['Retrieved chunks first, then the system message, then the user\'s question', false],
      ], 'Provider prompt caches match an identical prefix, so the parts that are the same on every call must come first. Putting the question or the chunks first makes every prefix different and nothing is ever reused.'),
    ],
    checkpoint: [
      mcq('In a semantic cache with a threshold of 0.80, "How many sick leaves per year?" is served the stored answer to "How many casual leaves per year?" (similarity 0.81). What is the right response?', [
        ['Pick the threshold from labelled same-answer and different-answer pairs', true],
        ['Replace the embedding model with a larger one and keep the 0.80 setting', false],
        ['Remove the exact cache, because it is what produced this wrong answer', false],
        ['Cache only the answers that the large model produced in the first place', false],
      ], 'Near-identical wording can need a different answer, so the threshold is a measured choice: label real pairs and pick the point where different-answer pairs stop slipping through. A bigger encoder still needs a measured threshold, and the exact cache was not involved in this hit.'),
      mcq('A cascade router sends every question to a small model first. When should it escalate to the large model?', [
        ['When the small answer fails validation or says it is not in the documents', true],
        ['On every question, so both answers can be compared and the better one shown', false],
        ['Only when the user complains with a thumbs-down after seeing the answer', false],
      ], 'A cascade pays for the large model only on the hard minority, using cheap signals such as a schema failure or a "not found" answer. Calling both every time removes the saving, and waiting for a complaint shows the user a bad answer first.'),
      mcq('A multi-tenant HR assistant shares one semantic cache across all client companies. What is the most serious risk?', [
        ['One company\'s policy answer can be served to an employee of another', true],
        ['The cache will grow too large to fit in one Redis instance in a month', false],
        ['Employees of the smaller companies will see slower responses overall', false],
        ['The similarity scores will drift as more tenants add their questions', false],
      ], 'Two companies\' "What is the notice period?" look identical to an embedding but have different answers, and serving one to the other leaks a confidential policy. Cache keys and lookups must be scoped by tenant and permission; size and speed are secondary concerns.'),
    ],
  },

  /* ── COST_LATENCY ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_PRODUCTION_COST_LATENCY',
    notes: `In Building with LLMs you met the cost formula: tokens times price per million. In production you turn
it into **budgets** that code enforces: a cost per request, a latency target, a concurrency limit towards
the provider, and a quota per user. A feature without them is fine in the demo and a surprise on the
first invoice.

## Cost per request, measured not guessed

Every response carries a usage block (input tokens, output tokens, often cached input tokens). Record it
on every call and compute the cost in code, with prices read from the provider's current price page and
kept in configuration. The numbers below are made-up "price units" so the arithmetic is visible:

    PRICE_PER_M = {  # fill in from the provider's current price page; these are placeholders
        "small": {"input": 1.0, "output": 4.0},
        "large": {"input": 10.0, "output": 40.0},
    }
    def request_cost(model, input_tokens, output_tokens, cached_input_tokens=0, cached_discount=0.5):
        p = PRICE_PER_M[model]
        billable_in = (input_tokens - cached_input_tokens) + cached_input_tokens * (1 - cached_discount)
        return (billable_in * p["input"] + output_tokens * p["output"]) / 1_000_000

    c_small = request_cost("small", 3_200, 250)
    c_large = request_cost("large", 3_200, 250)
    print(f"small: {c_small:.6f}  large: {c_large:.6f}  ratio: {c_large / c_small:.1f}x")
    mix = 0.8 * c_small + 0.2 * c_large
    print(f"80/20 routed mix per request: {mix:.6f}; per 1M requests/month: {mix * 1_000_000:,.0f}")
    trimmed = request_cost("small", 1_600, 250)
    print(f"trimming the prompt from 3200 to 1600 tokens: {c_small:.6f} -> {trimmed:.6f}")

prints

    small: 0.004200  large: 0.042000  ratio: 10.0x
    80/20 routed mix per request: 0.011760; per 1M requests/month: 11,760
    trimming the prompt from 3200 to 1600 tokens: 0.004200 -> 0.002600

Two lessons sit in those lines. In a RAG app, **input tokens dominate** (3,200 in, 250 out), so trimming
the prompt saves more than capping the answer. And routing only 20% of traffic to the large model still
nearly triples the bill compared with all-small, so the router's large-model share is a number to watch.

## Where the tokens go, and how to trim them

- **Retrieved chunks.** Five 600-token chunks is 3,000 tokens. Re-rank and send the best three.
- **Conversation history.** Resending 20 turns grows cost every turn. Keep the last few turns verbatim
  and a running summary of the rest.
- **The system prompt.** Teams paste rules for months. Cut what evaluation shows does not matter, and put
  what stays first so provider prompt caching applies.
- **Output.** Set max tokens to what the UI shows. Ask for "at most 120 words".

## Latency: what the user actually feels

Total latency is retrieval + model time to first token + generation time. Generation is roughly
proportional to output tokens, so long answers are slow answers. Two numbers matter:

- **Time to first token (TTFT):** with **streaming** the user sees words in about a second even if the
  whole answer takes eight. Stream every chat answer (you built streaming in the Python AI topic).
- **p95, not the average:** the slowest 5% of requests are the ones users complain about. Budget and
  alert on p95.

Run independent steps concurrently (fetch the leave balance while retrieving policies) and cap the work
in flight towards a provider so a traffic spike does not turn into a wall of 429s:

    import asyncio, time

    LIMIT = asyncio.Semaphore(4)          # at most 4 calls in flight to the provider

    async def fake_llm(i):
        await asyncio.sleep(0.2)
        return i

    async def guarded(i):
        async with LIMIT:
            return await asyncio.wait_for(fake_llm(i), timeout=5)

    async def main():
        t = time.perf_counter()
        out = await asyncio.gather(*(guarded(i) for i in range(10)))
        print(len(out), "calls in", round(time.perf_counter() - t, 1), "s")

    asyncio.run(main())

prints \`10 calls in 0.6 s\`: three waves of at most four.

## Retries with exponential backoff and jitter

Rate limits and brief 5xx errors are normal. Retry them, but **wait longer each time** and add
**randomness**, or every client that failed together retries together and the provider is hit by the
same spike again (a retry storm).

    import random, time

    class RateLimited(Exception): pass

    def with_retries(call, *, attempts=4, base=0.5, cap=8.0, retry_on=(RateLimited,), sleep=time.sleep):
        for attempt in range(attempts):
            try:
                return call()
            except retry_on as e:
                if attempt == attempts - 1:
                    raise
                delay = random.uniform(0, min(cap, base * 2 ** attempt))   # full jitter
                print(f"  attempt {attempt + 1} failed ({type(e).__name__}); sleeping {delay:.2f}s")
                sleep(delay)

With a seeded generator and a call that fails twice, it printed:

    attempt 1 failed (RateLimited); sleeping 0.16s
    attempt 2 failed (RateLimited); sleeping 0.15s
    result: ok

Rules: retry only retryable errors (429, 5xx, timeouts, never a 400); honour a \`Retry-After\` header when
present; cap total attempts; and remember the user is waiting, so an interactive request gets fewer
retries than a background job. The OpenAI SDK retries for you (\`OpenAI(max_retries=2, timeout=20.0)\`),
and **tenacity** gives the same policy as a decorator:
\`@retry(wait=wait_random_exponential(multiplier=0.5, max=8), stop=stop_after_attempt(4))\`.

## A quota per user: the token bucket

One user (or one script) must not spend the whole budget. A token bucket gives each user a capacity
that refills at a steady rate: bursts are allowed, sustained abuse is not.

    class TokenBucket:
        def __init__(self, capacity, refill_per_sec, now=time.monotonic):
            self.capacity, self.rate, self.now = capacity, refill_per_sec, now
            self.buckets = {}                      # user_id -> (tokens, last_time)
        def allow(self, user_id, cost=1.0):
            t = self.now()
            tokens, last = self.buckets.get(user_id, (self.capacity, t))
            tokens = min(self.capacity, tokens + (t - last) * self.rate)
            if tokens >= cost:
                self.buckets[user_id] = (tokens - cost, t)
                return True
            self.buckets[user_id] = (tokens, t)
            return False

    clock = [0.0]
    tb = TokenBucket(capacity=5, refill_per_sec=0.5, now=lambda: clock[0])
    print("burst of 7:", [tb.allow("u42") for _ in range(7)])
    clock[0] += 4.0                                   # 4 s later -> 2 tokens back
    print("after 4 s:", [tb.allow("u42") for _ in range(3)])
    print("other user:", tb.allow("u99"))

prints

    burst of 7: [True, True, True, True, True, False, False]
    after 4 s: [True, True, False]
    other user: True

Set \`cost\` to the request's model tokens instead of 1 and the same bucket becomes a **token quota**. In
a service with several workers the buckets live in Redis, not in a dict, and a refused request returns
**429 with Retry-After**, not a 500.`,
    workedExample: `**Problem:** the HR assistant's monthly model bill is three times the budget the finance team
approved. Bring it inside budget without hurting answer quality.

**Step 1 — measure before cutting.** Group last month's traces by cost driver:

    share of cost   cause
    46%             retrieved context: 6 chunks of ~650 tokens on every question
    21%             history: full conversation resent, average 14 turns
    18%             large model: router sent 35% of traffic to it
    9%              output: answers averaging 420 tokens, UI shows ~150
    6%              everything else

**Step 2 — attack the biggest line first.** Re-rank and send 3 chunks instead of 6. The evaluation set
of 60 questions is run before and after: groundedness unchanged, recall@3 after re-ranking equals the
old recall@6. Context cost halves.

**Step 3 — history.** Keep the last 4 turns verbatim plus a 150-token summary of earlier turns. The
multi-turn evaluation cases still pass.

**Step 4 — routing.** Traces show most large-model calls were short factual questions that only
contained the word "why". Tighten the rule, add a cascade (small first, escalate on "not found" or a
failed citation check). Large-model share drops from 35% to 12%; evaluation score drops by less than
the agreed tolerance.

**Step 5 — output.** Set max tokens to 250 and ask for "at most 120 words with citations". Users see the
same amount; the long tail of 900-token essays disappears.

**Step 6 — enforce it.** Add a per-user token bucket (20 questions a burst, refilling 1 per minute) after
finding one employee's script calling the endpoint 3,000 times a day. Put the cost per request on the
dashboard with an alert when the daily total crosses 110% of the daily budget.

**Result:** the bill falls below budget, quality on the evaluation set is within tolerance, and the
team can show which change saved what, because each was measured separately.`,
    mcqs: [
      mcq('A RAG endpoint sends 3,000 input tokens and gets 200 output tokens per call. Output tokens cost four times as much as input tokens per million. Which change saves the most?', [
        ['Halving the retrieved context from 3,000 to 1,500 input tokens', true],
        ['Halving the answer length from 200 to 100 output tokens', false],
        ['Turning on streaming so the answer appears to the user sooner', false],
        ['Retrying failed calls with exponential backoff and with jitter', false],
      ], 'Weighted by price, input is 3,000 units and output 200 × 4 = 800 units. Removing 1,500 input tokens saves 1,500 units; halving output saves only 400. Streaming improves perceived speed, not cost, and retries do not reduce what successful calls spend.'),
      mcq('After a provider outage ends, every client retries at exactly 1 s, 2 s and 4 s, and the provider is overwhelmed again at each of those moments. What is missing?', [
        ['Random jitter in the delays, so retries spread out over time', true],
        ['A larger number of attempts, so more of the retries succeed', false],
        ['A shorter base delay, so all the clients finish retrying sooner', false],
      ], 'Without jitter, clients that failed together retry together, recreating the spike. Randomising the delay spreads the load. More attempts or shorter delays make the storm worse.'),
      mcq('A token bucket has capacity 5 and refills 0.5 tokens per second. A user sends 5 requests at once, then 3 more after 4 seconds. How many of the last 3 are allowed?', [
        ['Two, because 4 seconds refill exactly 2 tokens into the bucket', true],
        ['Three, because the bucket refills fully once a burst has ended', false],
        ['None, because the bucket stays empty until a full minute passes', false],
        ['One, because each refill adds a single token every 4 seconds', false],
      ], 'The burst empties the bucket; 4 s × 0.5 tokens per second puts 2 back, so two requests pass and the third is refused. Buckets refill continuously at the stated rate, not all at once and not after a fixed window.'),
    ],
    checkpoint: [
      mcq('A chat answer takes 8 seconds in total, and users say the assistant "feels frozen". Which change helps most without changing the model?', [
        ['Stream the tokens so the first words show in about a second', true],
        ['Raise the per-user token bucket so fewer requests wait in line', false],
        ['Add another retry so that slow calls are attempted once again', false],
      ], 'Perceived speed is time to first token. Streaming shows progress almost immediately while total time is unchanged. A larger quota does not speed a single answer, and retrying a slow call makes it slower still.'),
      mcq('Which error should a retry wrapper around a model call NOT retry?', [
        ['400 Bad Request caused by an invalid parameter in the request', true],
        ['429 Too Many Requests returned with a Retry-After header set', false],
        ['503 Service Unavailable during a brief incident at the provider', false],
        ['A read timeout after 20 seconds with no response from the API', false],
      ], 'A 400 says the request itself is wrong, so the same request fails again however long you wait. Rate limits, 5xx errors and timeouts are transient and are what backoff exists for.'),
      mcq('Your service runs four Uvicorn workers. A per-user rate limiter keeps its buckets in a Python dict. What actually happens?', [
        ['Each worker has its own buckets, so a user gets about four times the limit', true],
        ['The dict is shared between workers, so the limit works exactly as designed', false],
        ['The workers lock the dict in turn, so every request becomes much slower', false],
        ['Python raises an error, because a dict cannot be used across processes', false],
      ], 'Workers are separate processes with separate memory, so each enforces the limit alone and requests spread across them. Shared state such as rate-limit buckets belongs in Redis. Nothing is shared or locked, and no error is raised, which is why the bug goes unnoticed.'),
    ],
  },

  /* ── TRACING ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_PRODUCTION_TRACING',
    notes: `When a user reports "the assistant was slow and wrong this morning", logs that say \`POST /ask 200 8.4s\`
tell you nothing. You need to see **inside** the request: which documents were retrieved, which model
was called with which prompt version, how many tokens it used, whether it came from cache, and where the
8.4 seconds went. That is a **trace**.

## Traces, spans and attributes

- A **trace** is one request end to end, with one trace id.
- A **span** is one step inside it: \`retrieve\`, \`rerank\`, \`llm.call\`, \`tool.get_leave_balance\`. Spans
  nest: each has a parent, a start, a duration and a status.
- **Attributes** are key-value facts on a span: model, prompt version, input and output tokens, cache
  hit, number of chunks, \`finish_reason\`.

You can build the idea with a context manager and a context variable that remembers the current span:

    import time, uuid, re, json
    from contextlib import contextmanager
    from contextvars import ContextVar

    _current = ContextVar("current_span", default=None)
    SPANS = []

    @contextmanager
    def span(name, **attrs):
        parent = _current.get()
        s = {"trace_id": parent["trace_id"] if parent else uuid.uuid4().hex[:8],
             "span_id": uuid.uuid4().hex[:6], "parent": parent["span_id"] if parent else None,
             "name": name, "attrs": dict(attrs), "status": "ok"}
        token = _current.set(s)
        start = time.perf_counter()
        try:
            yield s
        except Exception as e:
            s["status"] = f"error: {type(e).__name__}"
            raise
        finally:
            s["ms"] = round((time.perf_counter() - start) * 1000)
            _current.reset(token)
            SPANS.append(s)

    PHONE = re.compile(r"\\b[6-9]\\d{9}\\b")
    EMAIL = re.compile(r"\\b[\\w.+-]+@[\\w-]+\\.[\\w.]+\\b")
    def redact(text):
        return EMAIL.sub("<email>", PHONE.sub("<phone>", text))

    def handle(question, user_id):
        with span("request", route="/ask", user=user_id, question=redact(question)):
            with span("retrieve", k=5) as s:
                time.sleep(0.03); s["attrs"]["hits"] = 5
            with span("rerank") as s:
                time.sleep(0.12)
            with span("llm.call", model="small", prompt_version="leave-v3") as s:
                time.sleep(0.40)
                s["attrs"].update(input_tokens=3200, output_tokens=180)
            return "answer"

    handle("I am Priya, 9876543210, priya@example.com - how many casual leaves?", "u42")
    for s in sorted(SPANS, key=lambda s: s["parent"] is not None):
        indent = "  " if s["parent"] else ""
        print(f"{indent}{s['name']:10} {s['ms']:>4} ms  {json.dumps(s['attrs'])}")

prints (milliseconds vary a little run to run)

    request     551 ms  {"route": "/ask", "user": "u42", "question": "I am Priya, <phone>, <email> - how many casual leaves?"}
      retrieve     30 ms  {"k": 5, "hits": 5}
      rerank      120 ms  {}
      llm.call    400 ms  {"model": "small", "prompt_version": "leave-v3", "input_tokens": 3200, "output_tokens": 180}

One glance says where the time went. Notice too what redaction missed: the **name** "Priya" is still
there. Regexes catch phone numbers and emails; names, addresses and free-text details need a proper PII
detector (Microsoft Presidio is a common choice) or not logging the raw text at all.

## Use OpenTelemetry, not your own format

In a real service use **OpenTelemetry** (OTel), the open standard for traces. FastAPI, httpx and many
LLM SDKs have auto-instrumentation, and OTel's **GenAI semantic conventions** name the attributes
(\`gen_ai.request.model\`, \`gen_ai.usage.input_tokens\`) so every tool understands them:

    from opentelemetry import trace
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import SimpleSpanProcessor
    from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

    exporter = InMemorySpanExporter()           # in production: OTLPSpanExporter to your collector
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    trace.set_tracer_provider(provider)
    tracer = trace.get_tracer("policy-assistant")

    with tracer.start_as_current_span("request") as root:
        root.set_attribute("app.route", "/ask")
        with tracer.start_as_current_span("retrieve") as s:
            s.set_attribute("retrieval.k", 5)
        with tracer.start_as_current_span("llm.call") as s:
            s.set_attribute("gen_ai.request.model", "small")
            s.set_attribute("gen_ai.usage.input_tokens", 3200)
            s.set_attribute("gen_ai.usage.output_tokens", 180)

    for s in exporter.get_finished_spans():
        parent = s.parent.span_id if s.parent else None
        print(s.name, "child" if parent else "root", dict(s.attributes))
    print("same trace:", len({s.context.trace_id for s in exporter.get_finished_spans()}) == 1)

prints

    retrieve child {'retrieval.k': 5}
    llm.call child {'gen_ai.request.model': 'small', 'gen_ai.usage.input_tokens': 3200, 'gen_ai.usage.output_tokens': 180}
    request root {'app.route': '/ask'}
    same trace: True

Spans finish inside-out, which is why the root is printed last. In production use a
\`BatchSpanProcessor\` with an OTLP exporter. LLM-focused tools such as **Langfuse**, **LangSmith** and
**Arize Phoenix** accept these traces and add prompt views, token cost and evaluation scores per trace.

## Logging prompts without leaking personal data

Prompts contain what users typed: names, phone numbers, Aadhaar or PAN numbers, health details in a
leave request. Under India's **DPDP Act** you must have a purpose for keeping personal data and keep it
no longer than needed.

- Redact before the span is written, not in the dashboard.
- Store full prompt text for a **sample** (or only on errors), with a short retention period.
- Keep ids, token counts, model and prompt version on every trace; they contain no personal data.
- Restrict who can open raw prompts, and log who did.

## Dashboards and alerts: errors AND quality

Operational: request rate, error rate, p50/p95 latency and TTFT, cost per request and per day, cache hit
rate, fallback rate, large-model share. **Quality** needs its own signals, because a model that answers
wrongly returns 200 OK:

- thumbs-down rate and "I don't know" rate, per day and per prompt version;
- an automatic groundedness check (an LLM judge or citation check) on a daily sample of traces;
- retrieval score distribution, which drops when an index build goes wrong.

Alert on changes: a jump in "I don't know" after a re-index, or a groundedness drop after a prompt
release, is an incident even when every request succeeded.`,
    workedExample: `**Problem:** the p95 latency of the policy assistant doubled from 4 s to 8 s on Tuesday. Nothing was
deployed. Find the cause from traces.

**Step 1 — compare span durations, not request totals.** Pull Monday's and Tuesday's traces and take
p95 per span name:

    span             Monday p95   Tuesday p95
    retrieve           90 ms        95 ms
    rerank            180 ms       175 ms
    llm.call         3,100 ms     7,200 ms
    total            4,000 ms     8,100 ms

The time went into \`llm.call\`. Retrieval is innocent.

**Step 2 — split llm.call by its attributes.** Group by model, cache hit and fallback:

    attribute                     Monday     Tuesday
    large-model share             12%        12%
    fallback = true               0.5%       38%
    output tokens p95             260        265

Output length is unchanged, so the model is not writing more. But 38% of calls used the fallback.

**Step 3 — open a fallback trace.** Its \`llm.call\` span has a child span for the primary attempt with
status \`error: APITimeoutError\` after **4 s** (the configured timeout), then a second child for the
fallback provider taking 3 s. The primary provider is timing out; every timed-out request pays 4 s of waiting
before the fallback starts.

**Step 4 — confirm and act.** The provider's status page shows degraded performance in one region. The
circuit breaker never opened because its threshold was "50 failures in 1 minute" and the service sees
about 30 requests a minute. Lower it to a failure *rate* (over 30% in 2 minutes), so the breaker opens
and requests go straight to the fallback while the primary is sick.

**Step 5 — check quality, not only speed.** Filter Tuesday's traces with fallback = true and look at
the daily groundedness sample: the fallback scores slightly lower but within tolerance, which was
verified when it was added. Without tracing, the team would have been guessing between "the index is
slow", "the prompt got longer" and "the provider is slow".`,
    mcqs: [
      mcq('A trace shows a 6-second request with spans retrieve (80 ms), rerank (150 ms) and llm.call (5,600 ms), and the llm.call span has output_tokens = 1,400. What is the most likely fix?', [
        ['Cap the output length, because generation time grows with output tokens', true],
        ['Use a faster vector database, because retrieval is clearly the bottleneck', false],
        ['Remove the re-ranker, because it adds the most time of all the steps', false],
      ], 'Nearly all the time is in the model span, and 1,400 output tokens is a long answer; generation time is roughly proportional to output. Retrieval and re-ranking together take under a quarter of a second, so changing them cannot recover five seconds.'),
      mcq('A team logs every full prompt to its tracing tool forever. Prompts include employees\' phone numbers and leave reasons. What is the best change?', [
        ['Redact before writing, sample raw text, and set a short retention period', true],
        ['Encrypt the dashboard login so only the engineering team can open it', false],
        ['Stop tracing completely, because traces will always contain personal data', false],
      ], 'Personal data should not be written in the first place where it is not needed, and what is kept should be sampled and kept briefly, which the DPDP Act expects. A login does not reduce what is stored, and dropping tracing loses ids and token counts that hold no personal data.'),
      mcq('Every request returns 200 OK and latency is normal, but users say answers got worse after a re-index. Which alert would have caught it?', [
        ['A jump in the daily "I don\'t know" rate or a drop in a groundedness sample', true],
        ['An error-rate alert on the 5xx responses returned by the /ask endpoint', false],
        ['A p95 latency alert set on the llm.call span of each request trace', false],
        ['A CPU alert on the containers that run the retrieval service workers', false],
      ], 'Quality failures return 200 and run at normal speed, so only quality signals catch them: abstention rate, thumbs-down and an automatic groundedness check on sampled traces. Error, latency and CPU alerts all stay quiet while answers degrade.'),
    ],
    checkpoint: [
      mcq('In a trace, what does a span represent?', [
        ['One step inside a request, such as a retrieval or a model call', true],
        ['One complete user session, from login to the user\'s logout', false],
        ['One log line written to standard output by the service code', false],
      ], 'A trace is one request; spans are its steps, nested with parents, durations, statuses and attributes. A session spans many requests, and a log line has no duration or parent.'),
      mcq('Which attributes are most worth recording on every llm.call span of a RAG service?', [
        ['Model, prompt version, token counts, cache hit and finish_reason', true],
        ['The full raw prompt and the user\'s phone number, for quick support', false],
        ['The developer who wrote the prompt and the date it was last changed', false],
        ['The server hostname and the Python version on which the call ran', false],
      ], 'These answer the questions you ask during an incident: which model and prompt, what it cost, whether it was cached, and whether it was cut off. Raw personal data should be redacted or sampled, and authorship or host details belong in version control and infrastructure metrics.'),
      mcq('A semantic-cache hit rate dashboard shows the rate climbing from 18% to 41% overnight with no traffic change. What should you check first?', [
        ['Whether the threshold or cache scope changed and wrong answers are served', true],
        ['Whether the provider lowered its prices, which makes cached answers cheaper', false],
        ['Whether users started streaming, which makes cache lookups succeed more', false],
      ], 'A sudden jump in hits with the same traffic usually means the cache became looser: a lowered threshold or a dropped tenant or prompt-version scope, both of which serve wrong answers. Prices and streaming do not change whether a lookup matches.'),
    ],
  },

  /* ── BACKGROUND_JOBS ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_PRODUCTION_BACKGROUND_JOBS',
    notes: `"Summarise these 40 policy PDFs", "re-index the knowledge base", "run the evaluation set": each takes
minutes, and an HTTP request must not wait that long. Gateways cut idle connections (often around 60
seconds), mobile networks drop, and a blocked worker serves nobody else. Slow AI work becomes a **job**.

## The shape of a job API

1. \`POST /summaries\` validates the input, records a job, queues the work and returns **202 Accepted**
   with a \`job_id\` straight away.
2. A worker picks the job up and updates its **status** and **progress** as it goes.
3. The client follows it: **polling** \`GET /summaries/{job_id}\` every few seconds (simplest), a
   **server-sent events** stream of progress, or a **webhook** to the caller's URL when it finishes.
4. The result is stored (a table, object storage) and fetched by id.

## Idempotency: the retried POST

Networks retry. A user double-clicks. If a POST is repeated, you must not start two jobs that each bill
40 model calls and email HR twice. The client sends an **Idempotency-Key** header (a UUID per logical
action); the server remembers key → job id and returns the same job for a repeat.

Workers need the same care, because queues deliver **at least once**: a worker can crash after doing
the work but before acknowledging it, and the job runs again. So each step checks whether its output
already exists ("summary for doc hr-02 already stored, skip"), and side effects such as emails are
recorded so they happen once.

## A pattern you can run: FastAPI BackgroundTasks

\`BackgroundTasks\` runs a function **in the same process, after the response is sent**. Good for small
jobs (seconds to a minute) when losing a job on a restart is acceptable.

    import time, uuid
    from fastapi import FastAPI, BackgroundTasks, Header, HTTPException
    from pydantic import BaseModel

    app = FastAPI()
    JOBS: dict[str, dict] = {}          # in production: Redis or a database table
    IDEMPOTENCY: dict[str, str] = {}    # idempotency key -> job id

    class SummariseRequest(BaseModel):
        document_ids: list[str]

    def summarise_documents(job_id: str, document_ids: list[str]) -> None:
        job = JOBS[job_id]
        job["status"] = "running"
        for i, doc in enumerate(document_ids, start=1):
            time.sleep(0.01)                               # stands in for a slow model call
            job["results"].append(f"summary of {doc}")
            job["progress"] = round(100 * i / len(document_ids))
        job["status"] = "done"

    @app.post("/summaries", status_code=202)
    def start_summary(req: SummariseRequest, background: BackgroundTasks,
                      idempotency_key: str = Header(...)):
        if idempotency_key in IDEMPOTENCY:                 # a retried POST returns the same job
            return {"job_id": IDEMPOTENCY[idempotency_key], "reused": True}
        job_id = uuid.uuid4().hex[:8]
        JOBS[job_id] = {"status": "queued", "progress": 0, "results": []}
        IDEMPOTENCY[idempotency_key] = job_id
        background.add_task(summarise_documents, job_id, req.document_ids)
        return {"job_id": job_id, "reused": False}

    @app.get("/summaries/{job_id}")
    def job_status(job_id: str):
        if job_id not in JOBS:
            raise HTTPException(404, "unknown job")
        return JOBS[job_id]

The tests (\`pytest -q\` printed \`3 passed\`):

    from fastapi.testclient import TestClient
    from jobs_api import app

    client = TestClient(app)

    def test_job_runs_and_reports_progress():
        r = client.post("/summaries", json={"document_ids": ["hr-01", "hr-02", "travel-07"]},
                        headers={"Idempotency-Key": "abc-1"})
        assert r.status_code == 202
        job_id = r.json()["job_id"]
        # TestClient runs background tasks before returning, so the job is already finished here
        body = client.get(f"/summaries/{job_id}").json()
        assert body["status"] == "done" and body["progress"] == 100
        assert len(body["results"]) == 3

    def test_retried_post_does_not_start_a_second_job():
        first = client.post("/summaries", json={"document_ids": ["a"]}, headers={"Idempotency-Key": "abc-2"}).json()
        again = client.post("/summaries", json={"document_ids": ["a"]}, headers={"Idempotency-Key": "abc-2"}).json()
        assert again == {"job_id": first["job_id"], "reused": True}

    def test_missing_idempotency_key_is_rejected():
        r = client.post("/summaries", json={"document_ids": ["a"]})
        assert r.status_code == 422

Its limits are why real systems add a queue: the job dies with the process, it competes with requests
for CPU, and two replicas cannot share the \`JOBS\` dict.

## A worker pool in one process: a thread queue

    import queue, threading, time

    jobs = queue.Queue()
    status = {}

    def worker():
        while True:
            job_id, docs = jobs.get()
            try:
                status[job_id] = "running"
                for d in docs:
                    time.sleep(0.05)       # slow model call
                status[job_id] = "done"
            except Exception as e:
                status[job_id] = f"failed: {e}"
            finally:
                jobs.task_done()

    for _ in range(2):                     # two workers = at most two model calls at once
        threading.Thread(target=worker, daemon=True).start()

    for n in range(4):
        status[f"job{n}"] = "queued"
        jobs.put((f"job{n}", ["d1", "d2"]))
    time.sleep(0.02)
    print("shortly after:", status)
    jobs.join()
    print("after join:   ", status)

prints

    shortly after: {'job0': 'running', 'job1': 'running', 'job2': 'queued', 'job3': 'queued'}
    after join:    {'job0': 'done', 'job1': 'done', 'job2': 'done', 'job3': 'done'}

The worker count is also a concurrency limit towards the provider. Still one process, still lost on
restart.

## The production answer: Celery (or RQ) with a broker

A **broker** (Redis or RabbitMQ) holds the queue outside your API; **workers** are separate processes or
containers that you scale on their own. This needs a running broker, so it is shown, not run here:

    # tasks.py
    from celery import Celery
    from openai import RateLimitError, APITimeoutError

    app = Celery("policy", broker="redis://redis:6379/0", backend="redis://redis:6379/1")
    app.conf.task_acks_late = True            # acknowledge after the work, so a crash re-runs it
    app.conf.worker_prefetch_multiplier = 1   # long tasks: take one at a time

    @app.task(bind=True, autoretry_for=(RateLimitError, APITimeoutError),
              retry_backoff=True, retry_backoff_max=60, retry_jitter=True, max_retries=5)
    def summarise(self, job_id, document_ids):
        for i, doc_id in enumerate(document_ids, start=1):
            if summary_exists(job_id, doc_id):      # idempotent: skip work already done
                continue
            store_summary(job_id, doc_id, call_model(doc_id))
            self.update_state(state="PROGRESS", meta={"done": i, "total": len(document_ids)})
        return {"job_id": job_id, "count": len(document_ids)}

The API enqueues with \`summarise.delay(job_id, ids)\` (or \`apply_async(..., task_id=job_id)\`), reads
status with \`AsyncResult(task_id, app=app).state\` and \`.info\`, and workers run with
\`celery -A tasks worker --concurrency=4 --loglevel=info\`. **RQ** is a smaller alternative on Redis
(\`Queue(connection=Redis()).enqueue(fn, *args)\`). Choose by size: BackgroundTasks for small, lossy work;
a broker and workers for anything a user is paying or waiting for.`,
    workedExample: `**Problem:** HR uploads 400 policy PDFs at once and clicks "Summarise all". The first version did
it inside the POST handler; the browser showed a gateway timeout after a minute, the user clicked
again, and the provider bill showed every PDF summarised twice. Redesign it.

**Step 1 — return at once.** \`POST /summaries\` validates the file ids, writes a \`job\` row
(status \`queued\`, total 400, done 0) and returns **202** with the job id. The page shows a progress bar.

**Step 2 — stop the double run.** The browser generates an \`Idempotency-Key\` when the button is
clicked and sends it with the POST. A repeat with the same key returns the existing job id. The double
click now costs nothing.

**Step 3 — split the work.** One Celery task per document (400 small tasks) rather than one task for
400 documents. A failure retries one document, not the whole batch, and four workers process four at a
time, which is also the concurrency cap towards the provider.

**Step 4 — make each task idempotent.** Before calling the model, a task checks whether
\`summary(job_id, doc_id)\` exists; after a worker crash and redelivery, finished documents are skipped.
The summary is written with an upsert keyed on \`(job_id, doc_id)\`.

**Step 5 — retries that do not hammer.** \`autoretry_for\` rate-limit and timeout errors, with
\`retry_backoff\` and \`retry_jitter\`, five attempts. A document that still fails is marked \`failed\`
with the error, and the job finishes as \`done_with_errors\` listing it, rather than spinning forever.

**Step 6 — progress the user can trust.** Each task increments \`done\` (or \`failed\`) atomically in the
job row; \`GET /summaries/{job_id}\` returns \`{"status": "running", "done": 137, "failed": 2,
"total": 400}\`. When the count reaches 400, a final step emails HR once, recording \`notified_at\` so
a re-run does not email again.

**Result:** the request takes 200 ms, the user sees progress, a crash or redeploy loses nothing, and no
document is billed twice.`,
    mcqs: [
      mcq('An endpoint that runs a 3-minute evaluation inside the request fails with a 504 from the load balancer, though the server log shows it finished. What is the right redesign?', [
        ['Return 202 with a job id and let a worker run it while the client polls', true],
        ['Raise the load balancer timeout to ten minutes so the request can finish', false],
        ['Make the endpoint async so that the event loop can wait for the result', false],
        ['Cache the evaluation result so that the next identical request is quick', false],
      ], 'Long work should not hold an HTTP connection: networks, gateways and users all give up. A job id with polling or events survives all of that. A longer timeout only moves the failure, async still keeps the connection open, and caching does not help the first run.'),
      mcq('A Celery task emails HR after summarising documents. With task_acks_late enabled, a worker crashed just after sending the email, and HR got two emails. Why?', [
        ['The task was redelivered and the email step did not check it had run', true],
        ['task_acks_late makes Celery run every task twice to confirm the result', false],
        ['The broker duplicated the message because Redis was out of memory', false],
      ], 'Late acknowledgement means a crash before the ack leads to redelivery, which is the point: no work is lost. The price is that tasks must be idempotent, so a side effect like an email records that it happened and is skipped on a re-run. Celery does not run tasks twice by design.'),
      mcq('Which statement about FastAPI\'s BackgroundTasks is accurate?', [
        ['It runs after the response, in the same process, so a restart loses it', true],
        ['It sends the function to a Redis queue that a separate worker consumes', false],
        ['It retries the function automatically with backoff if it raises an error', false],
      ], 'BackgroundTasks is an in-process hook that runs once the response has been sent. It has no broker, no retries and no persistence, which is why it suits small, lossy jobs and why Celery or RQ is used for work that must survive a deploy.'),
    ],
    checkpoint: [
      mcq('A client\'s POST to start a bulk-extraction job times out on a mobile network and the app retries it. What stops the server from starting the job twice?', [
        ['An Idempotency-Key header that maps a repeated POST to the same job', true],
        ['A longer client timeout, so the first request gets time to complete', false],
        ['Returning 200 instead of 202, so the client knows the job has started', false],
      ], 'A key per logical action lets the server recognise the retry and return the existing job id. A longer timeout still leaves retries possible on bad networks, and the status code does not prevent a second job.'),
      mcq('Which HTTP status best fits a response to "start a summary job", sent before the job has run?', [
        ['202 Accepted, with the job id and a link to the status endpoint', true],
        ['201 Created, with the finished summary in the body of the response', false],
        ['200 OK, with an empty body, since nothing has been produced yet', false],
        ['204 No Content, as the job will report back by email later on', false],
      ], '202 says the request was accepted for processing that is not finished, which is exactly a queued job. 201 implies the resource exists now, and 200 or 204 with no job id leaves the client nothing to follow.'),
      mcq('A queue delivers each message at least once. What must every worker task therefore be?', [
        ['Idempotent, so running it a second time causes no extra effect', true],
        ['Asynchronous, so it can await the broker between every step', false],
        ['Short, so it finishes before the broker can deliver it again', false],
      ], 'At-least-once delivery means a task can run twice after a crash or timeout, so it must check for its own output and record side effects. Async code and short tasks reduce nothing; a short task can be redelivered just as easily.'),
    ],
  },

  /* ── DEPLOY_AI_SERVICE ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_PRODUCTION_DEPLOY_AI_SERVICE',
    notes: `You containerised a model API in the deployment topic of the data science track (Docker, configuration
from the environment, a health endpoint). An LLM service adds three things that one did not have: a
**secret** that costs money if it leaks, a **slow-to-load** retrieval index or embedding model, and
**behaviour that changes without a code change**, because a new prompt or model is a release too.

## The image

    FROM python:3.12-slim
    ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 HF_HOME=/models
    WORKDIR /app
    COPY requirements.txt .
    RUN pip install --no-cache-dir -r requirements.txt
    # bake the embedding model into the image, so containers do not download it at start-up
    RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"
    COPY app/ app/
    COPY prompts/ prompts/
    RUN useradd --create-home appuser && chown -R appuser /app /models
    USER appuser
    EXPOSE 8000
    CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]

Pinned \`requirements.txt\`, a \`.dockerignore\` that excludes \`.env\` and \`.git\`, and **no API key**
anywhere in the image. Anyone who can pull an image can read every layer.

## Configuration and secrets from the environment

    import hashlib
    from contextlib import asynccontextmanager
    from fastapi import FastAPI, Response
    from pydantic import SecretStr
    from pydantic_settings import BaseSettings, SettingsConfigDict

    class Settings(BaseSettings):
        model_config = SettingsConfigDict(env_prefix="POLICY_")
        llm_api_key: SecretStr                 # required: no default, so a missing key fails at startup
        primary_model: str = "small"
        fallback_model: str = "small-backup"
        prompt_version: str = "answer-v3"
        canary_prompt_version: str | None = None
        canary_percent: int = 0

\`Settings()\` reads \`POLICY_LLM_API_KEY\` and the rest from the environment, validates types, and raises
at start-up if the key is missing: the container fails at deploy time, not on the first user's
question. \`SecretStr\` prints as \`SecretStr('**********')\`, so the key does not end up in a log by
accident. In production the value comes from the platform's secret store (Kubernetes Secrets, AWS
Secrets Manager, Azure Key Vault), injected as an environment variable. Rotate it on a schedule and at
once if it ever appears in a log or a commit.

## Liveness and readiness

    STATE = {"index_loaded": False}

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.settings = Settings()        # raises ValidationError if POLICY_LLM_API_KEY is unset
        STATE["index_loaded"] = True           # load the vector index / embedding model once here
        yield

    app = FastAPI(lifespan=lifespan)

    @app.get("/healthz")                       # liveness: the process is up
    def healthz():
        return {"status": "ok"}

    @app.get("/readyz")                        # readiness: it can serve traffic
    def readyz(response: Response):
        if not STATE["index_loaded"]:
            response.status_code = 503
            return {"ready": False}
        s = app.state.settings
        return {"ready": True, "model": s.primary_model, "prompt_version": s.prompt_version}

- **Liveness** answers "is the process stuck?"; failing it restarts the container. Keep it trivial.
  Never call the model provider from it, or a provider outage restarts all your containers.
- **Readiness** answers "can this container serve?"; failing it removes the container from the load
  balancer without killing it. It goes green only after the index and embedding model have loaded.

## Rolling out a new prompt or model

Treat a prompt or model change as a deployment:

1. **Version it.** Prompts are files in the repo (\`prompts/answer-v4.txt\`); the active version is
   configuration. Every trace records it.
2. **Gate it.** CI runs the evaluation set against the new version and fails the build if quality falls
   below the threshold (the evaluation topic covers how to build that set).
3. **Canary it.** Send a small, **sticky** share of users to the new version and compare their traces:

        def prompt_version_for(user_id: str, s: Settings) -> str:
            """Sticky canary: the same user always lands in the same bucket."""
            if s.canary_prompt_version and s.canary_percent:
                bucket = int(hashlib.sha256(user_id.encode()).hexdigest(), 16) % 100
                if bucket < s.canary_percent:
                    return s.canary_prompt_version
            return s.prompt_version

   Hashing, not \`random()\`, keeps one user's experience consistent between questions.
4. **Roll back fast.** Rolling back is changing one environment variable, not rebuilding the image.

## The tests

    import pytest
    from fastapi.testclient import TestClient
    from pydantic import ValidationError
    from deploy_app import app, Settings, prompt_version_for

    def test_ready_reports_config(monkeypatch):
        monkeypatch.setenv("POLICY_LLM_API_KEY", "test-key")
        monkeypatch.setenv("POLICY_PROMPT_VERSION", "answer-v4")
        with TestClient(app) as client:                     # 'with' runs the lifespan
            assert client.get("/healthz").json() == {"status": "ok"}
            body = client.get("/readyz").json()
            assert body == {"ready": True, "model": "small", "prompt_version": "answer-v4"}

    def test_missing_key_fails_fast(monkeypatch):
        monkeypatch.delenv("POLICY_LLM_API_KEY", raising=False)
        with pytest.raises(ValidationError):
            Settings()

    def test_secret_is_not_printed(monkeypatch):
        monkeypatch.setenv("POLICY_LLM_API_KEY", "sk-very-secret")
        assert "sk-very-secret" not in repr(Settings())

    def test_canary_is_sticky_and_roughly_sized(monkeypatch):
        monkeypatch.setenv("POLICY_LLM_API_KEY", "k")
        s = Settings(canary_prompt_version="answer-v4", canary_percent=10)
        users = [f"user{i}" for i in range(1000)]
        first = [prompt_version_for(u, s) for u in users]
        assert first == [prompt_version_for(u, s) for u in users]
        share = first.count("answer-v4") / len(users)
        assert 0.07 < share < 0.13

\`pytest -q\` printed \`4 passed\`; the canary share over 1,000 users was 0.086, close to 10%.

## Scaling

An LLM service mostly **waits** on the provider, so async endpoints and a few workers handle many
requests per container. Embedding and re-ranking are **CPU-bound**: keep them off the event loop (a
thread pool, or a separate embedding service) and size workers to cores. Scale containers horizontally
behind the load balancer; shared state (cache, rate-limit buckets, job status) lives in Redis, so any
replica can serve any request.`,
    workedExample: `**Problem:** the team wants to ship prompt \`answer-v4\`, which cites the policy clause number. Last
time a prompt change went straight to everyone and broke the mobile app's citation parser for a day.
Plan the release.

**Step 1 — gate in CI.** The pull request adds \`prompts/answer-v4.txt\`. CI runs the 60-question
evaluation set with the new version: groundedness 0.91 (v3: 0.90), citation format valid on 60/60,
"I don't know" correct on all 8 unanswerable questions. The gate is "no metric worse than v3 by more
than 0.02", so it passes.

**Step 2 — deploy with the new prompt switched off.** The image now contains v4, but the environment
still says \`POLICY_PROMPT_VERSION=answer-v3\` and \`POLICY_CANARY_PERCENT=0\`. Readiness reports the
active version, so the deploy is verified without changing behaviour.

**Step 3 — canary 5%.** Set \`POLICY_CANARY_PROMPT_VERSION=answer-v4\` and \`POLICY_CANARY_PERCENT=5\`.
The hash keeps each employee on one version. For two days compare, per version: thumbs-down rate,
"I don't know" rate, tokens per answer, p95 latency and mobile-app parse errors.

    metric                 v3 (95%)    v4 (5%)
    thumbs-down            4.1%        3.6%
    tokens per answer      182         205
    p95 latency            4.2 s       4.4 s
    mobile parse errors    0           0

v4 is slightly longer (clause numbers) but within the latency budget, and the parser is unaffected,
because the mobile team was given the format a sprint earlier.

**Step 4 — widen.** 25%, then 100%, a day each, watching the same table. Then set
\`POLICY_PROMPT_VERSION=answer-v4\` and the canary back to 0.

**Step 5 — rollback plan, written before starting.** If thumbs-down rises by more than one point or
parse errors appear, set the canary percent to 0: one config change, applied in a minute, no rebuild.
A model change follows exactly the same steps, with \`POLICY_PRIMARY_MODEL\` instead of the prompt.`,
    mcqs: [
      mcq('A team\'s liveness probe calls the LLM provider to check "the whole system works". During a provider outage, what happens?', [
        ['Every container fails liveness and is restarted over and over', true],
        ['The containers keep serving cached answers until it recovers', false],
        ['The load balancer sends traffic to the fallback provider instead', false],
      ], 'Liveness failures restart containers, so tying it to an external dependency turns someone else\'s outage into a restart loop of your own. Liveness should check only the process; readiness checks local readiness such as a loaded index, and fallbacks are the gateway\'s job.'),
      mcq('Why does the Dockerfile download the embedding model during the build rather than when the container starts?', [
        ['Start-up becomes fast and does not depend on reaching the model hub', true],
        ['The model can only be loaded by root, which the build stage runs as', false],
        ['Downloading at build time makes the model smaller once it is loaded', false],
        ['A model downloaded at runtime cannot be used by more than one worker', false],
      ], 'Baking the weights in means a new replica is ready in seconds and still starts when the hub is slow or unreachable. The size of the model and the user that loads it do not change, and workers can share a runtime download; the gain is start-up speed and independence.'),
      mcq('A canary picks the prompt version with random() on every request. Users complain that answers change style between two questions. What fixes it?', [
        ['Assign by a hash of the user id, so each user stays on one version', true],
        ['Lower the canary share to 1%, so far fewer users see the new prompt', false],
        ['Run the canary only at night, when traffic is low and users are few', false],
      ], 'A sticky assignment (hash of user id modulo 100) keeps each user\'s experience consistent and makes per-version comparisons clean. A smaller share or night-time window still flips users between versions at random.'),
    ],
    checkpoint: [
      mcq('Where should the LLM API key for a containerised FastAPI service come from?', [
        ['A secret store, injected into the container as an environment variable', true],
        ['A .env file copied into the image so every container has the same key', false],
        ['A constant in settings.py, kept private by making the repository private', false],
      ], 'The image and the repository are read by many people and systems, so a key in either has leaked. A secret store injects it at runtime and allows rotation. A private repository is still not a secret store.'),
      mcq('A new replica reports ready before its vector index has loaded, and its first users get errors. What should the readiness endpoint do?', [
        ['Return 503 until the index and embedding model have finished loading', true],
        ['Return 200 at once, so the load balancer adds the replica much sooner', false],
        ['Call the model provider, so readiness proves that the key is working', false],
        ['Restart the container whenever any request returns an error to users', false],
      ], 'Readiness exists so the load balancer sends traffic only to replicas that can serve it; it turns green after local start-up work completes. Calling the provider couples readiness to an outside service, and restarting on request errors is liveness misuse.'),
      mcq('A new model passes the evaluation gate in CI. What is the safest next step?', [
        ['Canary it to a small sticky share, compare traces, then widen it', true],
        ['Switch all traffic to it, as the evaluation set already passed it', false],
        ['Rebuild the image with the new model hard-coded in the source code', false],
      ], 'An evaluation set is a sample; real traffic finds what it missed. A sticky canary limits the damage and gives per-version metrics, and keeping the model in configuration makes rollback one change. Hard-coding it turns rollback into a rebuild.'),
    ],
  },

  /* ── DEBUGGING ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_PRODUCTION_DEBUGGING',
    notes: `Production AI bugs are rarely exceptions. The request returned 200, but it was the wrong answer, the
wrong cost or the wrong speed. Start every investigation from a **trace** of a failing request and
compare it with a good one: which span changed, which attribute is different.

## 1. The cache that answers the wrong question

**Symptom:** an employee asks about paternity leave and gets the maternity leave answer, with a cache-hit
flag on the trace.

    hit, score = semantic.get(question)
    if score >= 0.80:
        return hit

**Cause:** the threshold was guessed. "paternity leave days?" and "maternity leave days?" embed at about
0.85. The cache also has no tenant scope, so it is one bug away from a data leak.
**Fix:** choose the threshold from labelled same-answer and different-answer pairs; scope by tenant,
prompt version and the user's document permissions; never semantically cache questions where one word
flips the answer (entitlements, grades, amounts). Log the score on every hit.

## 2. Old answers after a prompt release

**Symptom:** \`answer-v4\` is live but half the answers still have the old format, for exactly 24 hours.

    key = sha256(f"{model}:{normalise(question)}".encode()).hexdigest()
    redis.set(key, answer, ex=86_400)

**Cause:** the prompt version is not in the key, so v3 answers satisfy v4 lookups until their 24-hour
TTL expires.
**Fix:** put everything that changes the output in the key: model, prompt version, temperature, max
tokens, tenant. Tag entries with cited document ids and invalidate by tag on re-index.

## 3. The retry storm

**Symptom:** a 30-second provider blip becomes a 10-minute outage. The provider's dashboard shows request
spikes at regular intervals.

    for attempt in range(8):
        try:
            return client.chat.completions.create(**req)
        except Exception:
            time.sleep(2 ** attempt)

**Causes:** no jitter, so every client retries at the same instants; \`except Exception\` retries 400s
and validation errors that can never succeed; eight attempts with up to 128 s sleeps on a request a user
is waiting for; and the SDK's own \`max_retries\` multiplies all of it.
**Fix:** retry only 429, 5xx and timeouts; full jitter; honour \`Retry-After\`; two or three attempts on
interactive paths; one retry layer (either the SDK's or yours, not both); a circuit breaker.

## 4. The job that ran twice

**Symptom:** after a deploy, 120 documents are summarised twice and some HR managers get two emails.

    @app.task(acks_late=True)
    def summarise(job_id, ids):
        for doc_id in ids:
            store_summary(job_id, doc_id, call_model(doc_id))   # plain INSERT
        send_email(job_id)

**Cause:** the deploy stopped workers mid-task; with late acks the broker redelivered, which is correct,
but the task is not idempotent: it repeats finished documents and the email.
**Fix:** skip documents whose summary exists; upsert keyed on \`(job_id, doc_id)\`; record
\`notified_at\` and send only when it is empty; give workers a graceful shutdown period.

## 5. The deploy that took everything down

**Symptom:** a new release goes out, every pod restarts every 30 seconds, and the old version is gone.

    @app.get("/healthz")
    def healthz():
        client.chat.completions.create(model=settings.primary_model, messages=[...])
        return {"ok": True}

**Causes:** liveness calls the provider, so any provider slowness kills pods; and loading the 400 MB
embedding model takes 40 s, longer than the liveness probe's initial delay, so new pods are killed
before they finish starting. There was no readiness probe, so the rollout replaced healthy old pods.
**Fix:** a trivial liveness check; a readiness check that turns green after the index and model load; a
start-up probe or a longer initial delay; model weights baked into the image.

## 6. The trace with missing children

**Symptom:** traces show the request span but no \`llm.call\` child for summaries done in a thread pool.
**Cause:** work submitted to a thread with \`executor.submit(fn)\` does not carry the current context, so
the span inside it has no parent and starts a new trace.
**Fix:** use OpenTelemetry's instrumentation for the executor, or copy the context explicitly:
\`ctx = contextvars.copy_context(); executor.submit(ctx.run, fn)\`. Check after any change that one
request produces one trace id.`,
    mcqs: [
      mcq('Users get the maternity-leave answer when they ask about paternity leave, and the trace shows a semantic-cache hit with score 0.85. What is the root cause?', [
        ['A threshold chosen without testing pairs that look alike but differ', true],
        ['An exact cache that ignored the case of the words in the question', false],
        ['A provider prompt cache that matched the same system prompt prefix', false],
        ['A retry that returned the previous request\'s answer after a timeout', false],
      ], 'Two questions one word apart embed very close together, and only a threshold measured on labelled pairs (plus never caching entitlement questions semantically) prevents this. Case-insensitive exact keys still differ here, and provider prompt caching never returns a stored answer.'),
      mcq('A retry loop catches Exception and sleeps 2 ** attempt seconds for up to eight attempts. Which is NOT one of its problems?', [
        ['It sleeps between attempts instead of retrying immediately each time', true],
        ['It retries 400 errors that will fail again however long it waits', false],
        ['It has no jitter, so many clients retry at the very same moments', false],
        ['It can keep a waiting user blocked for minutes on one request', false],
      ], 'Waiting between attempts is correct; retrying immediately would make overload worse. The real faults are retrying non-retryable errors, the missing jitter that synchronises clients, and an attempt count far too high for an interactive request.'),
      mcq('After a deploy, a Celery task ran twice for the same job and inserted duplicate summaries. acks_late is on. Which fix addresses the cause?', [
        ['Make the task idempotent: skip done items and upsert by a job and doc key', true],
        ['Turn acks_late off, so a task that crashed halfway is simply forgotten', false],
        ['Add a sleep at the start of the task so the redelivery arrives too late', false],
      ], 'Redelivery after a crash is what protects you from losing work; the defect is a task that is unsafe to repeat. Turning off late acks trades duplicates for lost jobs, and a sleep changes timing, not correctness.'),
      mcq('Spans for model calls made inside a ThreadPoolExecutor appear as separate traces with no parent. Why?', [
        ['The thread does not inherit the current context unless it is copied', true],
        ['OpenTelemetry cannot record spans from any code that runs in a thread', false],
        ['The executor ran the calls too fast for their spans to be recorded', false],
      ], 'The current span is held in a context variable, and a plain submit to another thread starts with an empty context, so the new span becomes a root. Copying the context or using the executor instrumentation keeps the parent; OTel records threaded spans fine.'),
    ],
  },

  /* ── PRACTICE ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_PRODUCTION_PRACTICE',
    notes: `Ten exercises, from quick to hard. Work each on paper or in your editor before reading the answer. The
prices are made-up price units per million tokens: small model 1 in / 4 out, large model 10 in / 40 out.

## Exercise 1 (easy) — name the pattern

(a) Tag 5 lakh old support tickets by category. (b) "Explain this error" button in an internal log
viewer. (c) Pull PAN, name and date of birth from uploaded KYC forms. (d) An exam doubt-solver students
chat with.

**Answer:** (a) batch enrichment; (b) copilot inside a product; (c) extraction pipeline with validation
and a review queue; (d) chat assistant with RAG over the course material.

## Exercise 2 (easy) — cost per request

A call to the small model uses 2,400 input and 300 output tokens. What does it cost?

**Answer:** (2,400 × 1 + 300 × 4) / 1,000,000 = 3,600 / 1,000,000 = 0.0036 price units.

## Exercise 3 (easy) — which errors to retry

Mark each retry or no-retry: 429, 400 invalid parameter, 503, read timeout, 401 invalid key, a Pydantic
validation error on the model's JSON.

**Answer:** retry 429, 503 and the timeout (with backoff and jitter). Never retry 400 or 401; they fail
again. The validation error is not a transport retry; it gets one *repair* call that includes the error
message, then a fallback.

## Exercise 4 (medium) — routing arithmetic

All traffic on the large model costs 0.042 per request (3,200 in, 250 out). Routing 85% to small
(0.0042) and 15% to large: what is the new cost per request and the saving?

**Answer:** 0.85 × 0.0042 + 0.15 × 0.042 = 0.00357 + 0.0063 = 0.00987. Saving: 1 − 0.00987 / 0.042 ≈
76.5%. Only worth it if the evaluation score stays within tolerance.

## Exercise 5 (medium) — design a cache key

Write the exact-cache key for a multi-tenant policy assistant that has prompt versions and a
temperature setting.

**Answer:**

    raw = json.dumps({"tenant": tenant_id, "model": model, "prompt": prompt_version,
                      "temp": temperature, "max_tokens": max_tokens,
                      "q": " ".join(question.lower().split())}, sort_keys=True)
    key = "ans:" + hashlib.sha256(raw.encode()).hexdigest()

\`sort_keys=True\` makes the JSON, and therefore the hash, stable.

## Exercise 6 (medium) — the token bucket

Capacity 10, refill 0.2 per second. A user sends 10 requests at t = 0, then 4 at t = 15 s. How many of
the 4 pass?

**Answer:** the burst empties the bucket. 15 s × 0.2 = 3 tokens back, so 3 pass and the fourth gets
429 with \`Retry-After: 5\` (one token needs 5 s).

## Exercise 7 (medium) — backoff delays

Base 0.5 s, cap 8 s, full jitter. What is the maximum possible wait before attempts 2, 3, 4 and 5?

**Answer:** the upper bounds are 0.5 × 2^0 = 0.5, 1, 2 and 4 seconds; each actual wait is random
between 0 and that bound. The cap of 8 is first reached on the fifth wait.

## Exercise 8 (medium) — read a trace

    request    7,900 ms
      retrieve    110 ms
      llm.call  7,600 ms   model=small output_tokens=210 attempts=3 fallback=false

What happened, and what do you change?

**Answer:** output is short, so generation is not the cost; three attempts mean two failures with
backoff. Look at the child spans' statuses (likely 429). Fix the cause: a concurrency cap or rate limit
towards the provider, fewer retries on an interactive path, and an alert on retry rate.

## Exercise 9 (hard) — job API

Write the request and response sequence for "re-index 300 documents" with a client that may retry.

**Answer:** \`POST /reindex\` with \`Idempotency-Key: 6f1c…\` → \`202 {"job_id": "j41", "status_url":
"/jobs/j41"}\`. A repeat with the same key → \`202 {"job_id": "j41"}\`. \`GET /jobs/j41\` →
\`{"status": "running", "done": 120, "failed": 1, "total": 300}\`; finally \`"done_with_errors"\`
listing the failed document. Workers skip documents already indexed at the current version.

## Exercise 10 (hard) — plan a model change

Primary model moves to a newer one. List the steps from pull request to 100%.

**Answer:** model name in configuration only; CI runs the evaluation set with the new model and gates
on the agreed thresholds; check cost per request with the new tokeniser and prices; deploy with the new
model off; canary 5% by user-id hash; compare thumbs-down, "I don't know" rate, cost and p95 per
version; widen to 25% and 100%; keep the old model as the fallback for a week; rollback is one
environment variable.`,
    mcqs: [
      mcq('A call uses 4,000 input and 500 output tokens on a model priced at 2 units per million input and 8 units per million output. What does it cost?', [
        ['0.012 price units, from 8,000 plus 4,000 units over one million', true],
        ['0.036 price units, from adding the token counts and multiplying by 8', false],
        ['0.008 price units, from counting only the 4,000 input tokens at 2', false],
        ['0.009 price units, from charging all 4,500 tokens at the input rate', false],
      ], 'Input and output are priced separately: 4,000 × 2 = 8,000 and 500 × 8 = 4,000, so 12,000 / 1,000,000 = 0.012. The distractors use one rate for everything or forget the output tokens, which is how real estimates go wrong.'),
      mcq('A token bucket has capacity 6 and refills 0.25 tokens per second. After an emptying burst, how long until a user can make two requests?', [
        ['8 seconds, because each token takes 4 seconds to refill', true],
        ['2 seconds, because the bucket refills at a rate of one per second', false],
        ['24 seconds, because the whole bucket must refill before any use', false],
      ], 'At 0.25 tokens per second, one token takes 4 s, so two take 8 s. A bucket does not wait to fill completely; requests pass as soon as enough tokens are present.'),
      mcq('With full jitter, base 1 s and a cap of 10 s, what is the possible wait before the fourth attempt?', [
        ['A random time between 0 and 4 seconds', true],
        ['Exactly 4 seconds, every time it retries', false],
        ['A random time between 4 and 8 seconds', false],
        ['Exactly 8 seconds, the base times three', false],
      ], 'The wait before attempt n is random in [0, min(cap, base × 2^(n−2))] when counting from the first retry, so before the fourth attempt the bound is 1 × 2^2 = 4 s. Fixed delays are what jitter removes, and the cap is not reached yet.'),
      mcq('Which exact-cache key is correct for a multi-tenant assistant with versioned prompts?', [
        ['A hash of tenant, model, prompt version, settings and the normalised question', true],
        ['A hash of the question alone, so that the hit rate is as high as it can be', false],
        ['A hash of the model and question, so it survives the next prompt change', false],
      ], 'Every input that changes the answer belongs in the key; leaving out the tenant leaks answers across companies and leaving out the prompt version serves stale formats. "Surviving" a prompt change is exactly the bug.'),
      mcq('A trace shows llm.call at 7.6 s with only 210 output tokens and attempts = 3. What is the most likely cause of the delay?', [
        ['Two failed attempts and their backoff waits before the one that worked', true],
        ['A long answer, since generation time grows with the output tokens', false],
        ['Slow retrieval, since the retrieve span always runs inside llm.call', false],
      ], 'A 210-token answer is short, so generation is not the problem; the attempt count says two calls failed and the time went into them and the waits between them. Retrieval is its own span, recorded at 110 ms.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_PRODUCTION_INTERVIEW_QUESTION',
    notes: `These are the production questions asked in GenAI and AI engineer interviews at product companies and
GCCs. Interviewers want structure (measure, then change), trade-offs, and the failure you would watch for.

## Q1. "Our GenAI feature costs three times what we planned. What do you do?"

**Model answer:** "First I measure where the cost goes, from traces with token counts per span: context,
history, output, and which model. In a RAG app input usually dominates. Then I change one thing at a
time, each checked against the evaluation set: re-rank and send fewer chunks; trim history to the last
few turns plus a summary; order the prompt so the stable prefix is cached by the provider; cap output to
what the UI shows; route easy requests to a small model with a cascade for the rest; add exact caching,
and semantic caching only with a measured threshold. Finally I enforce it: cost per request on a
dashboard, an alert on the daily total, and per-user quotas so one script cannot spend the budget."

**Follow-up:** "Routing saved 70% but quality dropped a bit. Ship it?" — "Depends on the agreed
tolerance. I'd look at which questions got worse; if they share a feature (multi-part questions,
comparisons), I tighten the router for that class rather than accept or reject the whole change."

## Q2. "Design caching for an internal HR assistant used by 30 client companies."

**Model answer:** "Two layers. An exact cache in Redis keyed on tenant, model, prompt version, settings
and the normalised question, with entries tagged by the document ids they cite, invalidated when those
documents are re-indexed. Behind it, an optional semantic cache, scoped by tenant and by the set of
documents the user may read, with a threshold chosen from labelled pairs of real questions, and never
used for personal or entitlement questions. I'd log the similarity on every hit and review a sample
weekly. I'd also use the provider's prompt caching by putting the system prompt first."

**Follow-up:** "What's the worst thing that can go wrong?" — "Serving one company's policy to another's
employee. That's why tenant is in every key and lookup, and why I'd write a test that asks the same
question as two tenants and asserts different answers."

## Q3. "A user action needs two minutes of LLM work. How do you build the API?"

**Model answer:** "Not synchronously. POST returns 202 with a job id; the client sends an Idempotency-Key
so retries don't create a second job. Work goes on a queue (Celery or RQ on Redis), split into small
tasks so a failure retries one piece. Tasks are idempotent because delivery is at least once: check for
existing output, upsert, record side effects like emails. Retries with backoff and jitter on 429 and
timeouts, a final failed state with the error, and progress the client can poll or stream over SSE."

**Follow-up:** "Why not FastAPI BackgroundTasks?" — "It runs in the API process: a deploy or crash loses
the job, it competes with requests for CPU, and replicas can't share its state. Fine for small,
loss-tolerant work like sending a notification, not for work a user is waiting on."

## Q4. "How do you ship a new prompt safely?"

**Model answer:** "As a release. The prompt is a versioned file; the active version is configuration;
every trace records it. CI runs the evaluation set and blocks the merge if metrics fall below
threshold. I deploy with it off, canary a small sticky share by hashing the user id, compare
thumbs-down, abstention, cost and latency per version, then widen. Rollback is one config change."

**Follow-up:** "The canary looks fine but you're not sure 5% is enough data. What then?" — "Check the
sample size against the difference I care about; if it's too small, extend the canary in time rather
than widening it, or run the new prompt in **shadow** on a copy of traffic and score both offline."`,
    mcqs: [
      mcq('In an interview you are asked to cut an LLM feature\'s cost. Which opening shows the strongest approach?', [
        ['Measure where tokens go per span, then change one thing at a time against evals', true],
        ['Move everything to the smallest model straight away and see if users complain', false],
        ['Turn on semantic caching at a low threshold so most requests are served free', false],
        ['Cut the system prompt in half, since prompts are usually the largest cost', false],
      ], 'Interviewers look for measure-then-change: without traces you do not know whether context, history, output or model choice drives cost, and without an evaluation set you cannot tell what each cut did to quality. The others are guesses, and a low semantic threshold also serves wrong answers.'),
      mcq('An interviewer asks for the single worst failure of a shared semantic cache in a multi-tenant product. What is the best answer?', [
        ['An answer built from one tenant\'s documents is served to another tenant', true],
        ['The hit rate is lower than expected for the first few weeks after launch', false],
        ['The embedding step adds a few milliseconds of latency to every request', false],
      ], 'A cross-tenant hit leaks confidential content, which is a security incident rather than a performance issue. Hit rate and embedding latency are tuning concerns.'),
      mcq('You propose BackgroundTasks for a two-minute document job, and the interviewer pushes back. What is the strongest reason they are right?', [
        ['The job runs in the API process, so a deploy or crash loses it', true],
        ['BackgroundTasks cannot call an LLM provider from inside a task', false],
        ['BackgroundTasks always blocks the response until the task ends', false],
      ], 'BackgroundTasks has no broker or persistence; the job lives and dies with the API process and shares its resources. It can call any code, and it runs after the response is sent, not before.'),
    ],
  },

  /* ── MINI_PROJECT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_PRODUCTION_MINI_PROJECT',
    notes: `# Mini Project — Shipping the Policy Assistant

In the deep RAG topic you built a policy-document assistant: HR and travel policy PDFs indexed with hybrid
search and re-ranking, answers with citations, and recall@5 reported for each improvement. It runs on your
laptop. Now an IT services company of about 4,000 employees, with offices in Bengaluru, Hyderabad and Pune,
wants it on the intranet next month. The HR head's conditions, from the kickoff call:

- "It must never tell someone the wrong leave entitlement. If it is not sure, it says so and links the
  policy."
- "Finance approved a monthly budget. I want to see cost per question, every day."
- "When the AI provider has a bad day, the assistant must still work."
- "Nobody changes the prompt on a Friday evening and breaks it. Show me how changes are checked."
- "Employee data stays protected. We are covered by the DPDP Act like everyone else."

## What you start with

- Your RAG service from the deep RAG mini project (or the reference solution): ingestion, the index,
  hybrid retrieval with re-ranking, and an answer function with citations.
- The policy PDFs from that project, plus a new \`policies_v2/\` folder with an updated leave policy that
  HR will publish halfway through the project (it changes the carry-forward limit).
- \`eval/questions.jsonl\`: 60 questions with expected answers and the policy clause each should cite, of
  which 8 are deliberately not answerable from the policies, and 10 are in Hinglish ("WFH kitne din allowed
  hai interns ke liye?").
- \`traffic/sample_questions.txt\`: 2,000 real-looking questions for a load and cache test, with many
  near-duplicates, some containing phone numbers and employee ids.

A real model API key is needed for the full run. Every component must also run against a **fake model**
(a function that returns a canned answer with fake usage numbers), so tests pass offline and in CI.

## Deliverables

1. **A FastAPI service** (\`app/\`) with \`POST /ask\` (streams the answer, returns citations and a
   \`request_id\`), \`POST /reindex\` (a background job that returns 202 and a job id, with an
   Idempotency-Key), \`GET /jobs/{id}\`, \`GET /healthz\` and \`GET /readyz\`.
2. **A gateway module** (\`app/gateway.py\`): a router (small model first, a cascade to the large one on
   a failed citation check or "not found"), an exact cache in Redis keyed on tenant, model, prompt version,
   settings and the normalised question, entries tagged by cited document ids, a fallback provider on 429,
   5xx and timeouts only, a timeout on every call, retries with backoff and jitter, and a simple circuit
   breaker. A semantic cache is optional; if you add one, include your threshold table from labelled pairs
   and exclude entitlement questions.
3. **Budgets:** cost per request computed from usage and a prices file (\`config/prices.yaml\`, filled
   from the provider's page on the day you run it), a per-user token bucket in Redis that returns 429 with
   \`Retry-After\`, a concurrency cap towards the provider, and \`max_tokens\` set from what the UI shows.
4. **Tracing:** OpenTelemetry spans for request, retrieve, rerank, each llm.call attempt and cache lookup,
   with model, prompt version, tokens, cost, cache hit, fallback and \`finish_reason\` as attributes, one
   trace id per request, and PII redaction before anything is written. Export to the console or to
   Langfuse / Phoenix if you have one running.
5. **Deployment:** a Dockerfile (slim base, pinned requirements, embedding model baked in, non-root,
   no secrets), a \`docker-compose.yml\` with the API, a worker and Redis, configuration through
   pydantic-settings with a required, \`SecretStr\` API key, and a readiness check that waits for the index.
6. **A release gate:** \`make eval\` (or a script) runs the 60 questions against the active prompt version,
   reports groundedness, citation accuracy, correct abstentions on the 8 unanswerable questions, and cost,
   and exits non-zero if any agreed threshold is missed. Wire it into a CI workflow file.
7. **A prompt rollout:** ship \`answer-v2\` (it must quote the clause number) through the gate, then a
   sticky 10% canary by hashed user id, and write up the per-version comparison.
8. **\`REPORT.md\`:** the cost report (per request, per day for the 2,000-question run, before and after
   your optimisations, with what each change saved), the cache hit rate, p50/p95 latency and TTFT, a
   fallback drill (primary forced to fail: what happened, how long), the re-index of \`policies_v2/\` and
   proof that stale cached answers about carry-forward disappeared, and the evaluation results.

## Milestones

**Milestone 1 — service and container (day 1–2).** Wrap the RAG code in the FastAPI app with lifespan
loading, settings from the environment, health and readiness. Build the image and run it with compose.
TestClient tests for every endpoint against the fake model. *Check:* \`docker compose up\` then
\`curl /readyz\` returns the model and prompt version; a missing key stops the container at start-up.

**Milestone 2 — gateway and budgets (day 3–4).** Router, exact cache, fallback, retries, rate limit and cost
per request. *Check:* replay the 2,000 questions with the fake model; report hit rate, large-model
share and cost; a forced 503 from the primary sends traffic to the fallback without user-visible errors.

**Milestone 3 — tracing and privacy (day 5).** Spans and attributes, redaction, a sampled raw-prompt log
with a retention setting. *Check:* one request gives one trace id with all child spans; grep your logs
for the phone numbers in the sample traffic and find none.

**Milestone 4 — jobs and re-index (day 6).** \`/reindex\` as a worker job, idempotent per document, with
progress. Publish \`policies_v2/\`. *Check:* a repeated POST with the same key returns the same job;
killing the worker mid-job and restarting it finishes without duplicates; carry-forward answers now cite
the new policy, and no cached answer cites the old one.

**Milestone 5 — gate and rollout (day 7–8).** The evaluation gate in CI, then \`answer-v2\` through it and
a 10% canary. *Check:* deliberately break the prompt (remove the "say you don't know" rule) and show the
gate failing the build on the abstention metric.

## Acceptance criteria

- Every endpoint has TestClient tests that pass offline with the fake model.
- No API key in the image, the repository or any log line; \`SecretStr\` in settings.
- Cache key includes tenant and prompt version; the re-index invalidates by document tag.
- Fallback only on retryable errors; jittered backoff; a timeout on every provider call.
- Cost per request is on every trace and summed in the report; prices are read from config, not code.
- The evaluation gate exits non-zero on a regression and is wired into CI.
- Wrong-entitlement answers on the evaluation set: zero. Unanswerable questions: abstained, with a link.

## Hints

- Write the fake model first; it makes every later milestone testable in seconds.
- Keep one retry layer: either the SDK's \`max_retries\` or yours.
- Put the stable system prompt first, so the provider's prompt caching applies.
- Read your own traces every day of the project; most bugs are visible in them before a test fails.`,
    assignment: {
      title: 'Shipping the Policy Assistant',
      description: 'Take the policy-document RAG service to production: a FastAPI service in Docker with configuration from the environment, a gateway with routing, exact caching and a provider fallback, cost and rate budgets, OpenTelemetry tracing with PII redaction, a background re-index job, an evaluation gate in CI and a canaried prompt release.',
      instructions: `Complete the project described in this unit's brief and submit a repository link or a zip.

**Submit:**

1. The repository: \`app/\` (endpoints, gateway, budgets, tracing), the worker, \`tests/\` passing offline
   with the fake model, \`Dockerfile\`, \`.dockerignore\`, \`docker-compose.yml\`, pinned
   \`requirements.txt\`, \`config/prices.yaml\`, \`prompts/\` with both versions, the evaluation script and
   the CI workflow.
2. \`REPORT.md\`: the cost report before and after each optimisation, hit rate, p50/p95 latency and TTFT,
   the fallback drill, the re-index and stale-cache proof, the evaluation results for both prompt versions,
   the canary comparison, and a screenshot or console dump of one full trace.
3. \`README.md\`: how to run locally, run the tests, run the gate, and the environment variables
   required (names only, never values).

**Before you submit,** go through the acceptance criteria in the brief and record each result at the end
of the report (for example: "tests passed: 31; wrong entitlements: 0/60; abstentions correct: 8/8;
cost per request before/after: …; fallback drill: no failed requests").`,
      rubric: [
        { criterion: 'Service, container and configuration', description: 'Endpoints as specified with streaming, a 202 job API and idempotency; lifespan loading; health vs readiness used correctly; slim non-root image with the model baked in and no secrets; settings from the environment with a required SecretStr key; tests for every endpoint passing offline.', maxPoints: 20 },
        { criterion: 'Gateway: routing, caching and fallback', description: 'A measured router with a cascade; an exact cache keyed on tenant, model, prompt version and settings, invalidated by document tag on re-index; fallback only on retryable errors; timeouts, jittered retries and a circuit breaker; any semantic cache justified with a threshold table.', maxPoints: 25 },
        { criterion: 'Budgets and the cost report', description: 'Cost per request from real usage and a prices file; a Redis token bucket returning 429 with Retry-After; a concurrency cap; a report that attributes savings to individual changes and shows quality held on the evaluation set.', maxPoints: 20 },
        { criterion: 'Tracing and privacy', description: 'One trace per request with child spans for each step and attempt; model, prompt version, tokens, cost, cache and fallback attributes; redaction before writing, sampled raw prompts with retention; the fallback drill explained from traces.', maxPoints: 15 },
        { criterion: 'Release gate and rollout', description: 'An evaluation script that exits non-zero on a regression and runs in CI; the deliberately broken prompt failing the gate; answer-v2 shipped through a sticky canary with a per-version comparison and a written rollback plan.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    mcqs: [
      mcq('HR publishes a new leave policy that changes the carry-forward limit. After the re-index, some employees still get the old limit. Which part of the brief\'s design is missing?', [
        ['Dropping cache entries tagged with the ids of the re-indexed documents', true],
        ['A higher semantic-cache threshold, so that fewer old answers can match', false],
        ['A larger Redis instance, so that the new answers have room to be stored', false],
      ], 'The brief tags every cache entry with the document ids it cites and invalidates by tag on re-index, which is what removes the stale carry-forward answers. Without that step old answers live until their TTL. Redis deletes keys while serving reads without difficulty.'),
      mcq('Why does the brief require every component to run against a fake model?', [
        ['So tests and the CI gate run offline, fast and free of provider flakiness', true],
        ['So the production service can skip the real model when it gets too costly', false],
        ['So the evaluation scores come out higher than they would with a real model', false],
      ], 'A fake model makes endpoint, gateway, retry and job tests deterministic and runnable anywhere, including CI without a key. It is never a production substitute, and the real evaluation run uses the real model so its scores mean something.'),
    ],
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_PRODUCTION_CHECKPOINT',
    notes: `Ten questions across the topic: application patterns, routing and caching, cost and latency budgets,
tracing, background jobs and deployment. Several describe a trace or a number; work out your answer before
you read the options.`,
    checkpoint: [
      mcq('An insurance company wants claim forms turned into structured records for its claims system, with no wrong amounts stored. Which design fits?', [
        ['Schema output at temperature 0, validated, with failures sent to reviewers', true],
        ['A chat assistant that talks each claimant through the form one field at a time', false],
        ['A copilot that suggests amounts which the claims system then saves on its own', false],
        ['A nightly batch job that stores whatever the model returns for every form', false],
      ], 'This is the extraction pattern: a fixed schema, validated in code, with a human review queue for anything that fails, so a wrong amount is never stored silently. A chat flow is slow and checks nothing, a copilot that saves on its own is not a copilot, and storing raw output skips validation.'),
      mcq('A gateway cascade routes to a small model and escalates on a failed citation check. The large-model share rises from 12% to 40% after a re-index. What does that most likely indicate?', [
        ['Retrieval got worse, so more small-model answers fail the citation check', true],
        ['The small model was silently upgraded, so it now escalates more requests', false],
        ['Users started asking longer questions, which always go to the large model', false],
      ], 'The escalation signal is a failed citation check, and a re-index is the change, so the likely story is poorer retrieval making grounded answers harder. The router is doing its job; the trace attributes for retrieval scores will confirm it. Question length is not the escalation rule here.'),
      mcq('Which item does NOT belong in an exact-cache key for a policy assistant?', [
        ['The request id generated for each incoming request', true],
        ['The prompt version that will produce the answer', false],
        ['The tenant whose documents the answer is built from', false],
        ['The temperature and max tokens used for the call', false],
      ], 'A request id is unique per request, so including it makes every lookup a miss. Prompt version, tenant and output-shaping settings all change the answer and must be in the key.'),
      mcq('A RAG call uses 5,000 input and 200 output tokens, and output costs four times input per token. Roughly what share of the call\'s cost is input?', [
        ['About 86%, since input is 5,000 units and output 800 of 5,800', true],
        ['About 50%, since input and output are priced at the same rate', false],
        ['About 20%, since the output tokens are four times as costly', false],
        ['About 96%, since 5,000 is 96% of the 5,200 tokens used', false],
      ], 'Weight by price: 5,000 × 1 versus 200 × 4 = 800, so input is 5,000 / 5,800 ≈ 86%. Counting tokens without the price ratio gives 96%, which is the common mistake; the 20% option inverts the weighting.'),
      mcq('An interactive endpoint has a 10-second budget and a retry wrapper with 6 attempts and backoff capped at 8 seconds. What is the main problem?', [
        ['The retries alone can blow far past the 10-second budget for the user', true],
        ['Six attempts are too few to get past an ordinary provider rate limit', false],
        ['Backoff capped at 8 seconds removes any need for jitter on the waits', false],
      ], 'Interactive paths need few retries because the user is waiting; several capped waits can add tens of seconds. Background jobs can afford more attempts. A cap does not replace jitter, which prevents synchronised retries.'),
      mcq('After a release, thumbs-down doubles while error rate, latency and cost look normal. Which trace attribute lets you check whether the release caused it?', [
        ['The prompt version recorded on each llm.call span', true],
        ['The HTTP status code recorded on the request span', false],
        ['The container hostname recorded on the request span', false],
      ], 'Grouping thumbs-down by prompt version shows whether the new version is responsible, which is why the version is logged on every call. Status codes are all 200 in a quality regression, and the hostname does not identify what changed.'),
      ck(API, 'A worker crashes while summarising document 37 of 50. With late acknowledgement, the task is delivered again. What should the task do?', [
        ['Skip the 36 stored summaries and continue from document 37 onwards', true],
        ['Start again from document 1 and insert all 50 summaries a second time', false],
        ['Mark the whole job failed, since a redelivered task cannot be trusted', false],
        ['Wait for an operator to confirm before it processes any further items', false],
      ], 'At-least-once delivery is safe only with idempotent tasks: check for existing output, upsert, and carry on. Re-inserting duplicates the work and the bill, and failing or pausing the job throws away the recovery that redelivery provides.'),
      ck(API, 'Which pair of endpoints is the standard shape for a slow summarisation feature?', [
        ['POST returning 202 with a job id, and GET returning the job status', true],
        ['POST returning 200 with the summary after the whole job has finished', false],
        ['GET with the documents in the query string, returning the summary', false],
      ], 'A 202 with a job id releases the connection at once and the status endpoint lets the client follow progress. Holding a POST open for minutes hits gateway timeouts, and GET with documents in the URL is both unsafe for long inputs and not how work is started.'),
      ck(DEP, 'Pods of a new release are killed during start-up because loading the embedding model takes 40 seconds. What is the right fix?', [
        ['A start-up probe or longer initial delay, and readiness after loading', true],
        ['Remove the liveness probe so that no pod can ever be restarted again', false],
        ['Load the embedding model lazily on the first user request that needs it', false],
        ['Point liveness at the model provider so that it reflects real health', false],
      ], 'Slow start-up needs a start-up probe or a longer delay, with readiness going green only when the model is loaded. Removing liveness loses stuck-process recovery, lazy loading makes the first user pay 40 seconds, and probing the provider couples your pods to its outages.'),
      ck(DEP, 'A team wants to switch the primary model. Which plan is safest?', [
        ['Gate it on the evaluation set, canary by user hash, and keep it in config', true],
        ['Change the model in the code and deploy, since the API shape is the same', false],
        ['Switch every user at once overnight, when traffic and risk are lowest', false],
      ], 'A model change alters behaviour like a prompt change does, so it goes through the evaluation gate and a sticky canary, and living in configuration makes rollback one change. The same API shape says nothing about answer quality, and an overnight switch still sends everyone the untested model.'),
    ],
  },
];
