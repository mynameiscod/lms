/**
 * Career-track content: The AI Candidate (AI_PLACE_CANDIDATE), the AI tracks, batch AI6 — the last topic of Year-4
 * placement for all five AI tracks (AI Engineer, Generative AI, Agentic AI, MLOps, AI Security). The shared Year-4
 * packs teach resume format, aptitude, HR and generic mocks; this is the AI version: a resume and portfolio whose
 * every claim can be checked, the track's capstone defended one level deeper than its own Demo Day unit, and one
 * complete AI interview loop. Modelled on DS_PLACE_FS.
 *
 * Track-specific guidance sits inside the notes: a skills line and portfolio per track, and the panel's deeper
 * questions for each capstone (Campus Desk, Listing Studio, AP Desk, Rakshak, and the defence-focused AI Security
 * capstone "An AI Product, Secure by Design", described from its unit list). Capstone figures quoted are the ones
 * those capstones' own units use; figures marked illustrative are teaching numbers, and students are told to use
 * their own. The online-assessment metric example (recall@3 0.500, MRR 0.278) and the illustrative block-rate
 * intervals (Wilson, 95%) were run. AI Security content is defensive only. No prices and no model version names.
 *
 * Attribution: the topic is multi-skill (PLACEMENT_READINESS default, PORTFOLIO_EVIDENCE, TECHNICAL_EXPLANATION,
 * INTERVIEW_PERFORMANCE). Every checkpoint question names its skill with ck(); practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const PR = 'PLACEMENT_READINESS';
const PE = 'PORTFOLIO_EVIDENCE';
const TE = 'TECHNICAL_EXPLANATION';
const IP = 'INTERVIEW_PERFORMANCE';

export const TRACK_AI_PLACE_CANDIDATE_BUNDLES: PilotBundle[] = [
  /* ── RESUME ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_PLACE_CANDIDATE_RESUME',
    notes: `The shared Year-4 resume pack covers format, length and the basics. This unit is the **AI** version: the resume
that gets through the filter for roles titled "AI Engineer", "GenAI Engineer", "LLM Engineer", "Agentic AI Engineer",
"ML Engineer — MLOps", "ML Platform Engineer" or "AI Security Engineer", and a portfolio where every claim can be
opened, run and checked. AI hiring has one problem other hiring does not: every applicant has "built a chatbot".
Your resume wins by showing what most of them cannot — **measurement, cost and safety**.

## Who reads it, and what they filter on

| Employer | Typical first filter | What wins the shortlist |
|---|---|---|
| Product companies and fintechs (Bengaluru, Hyderabad, Pune) | Python, LLM APIs, RAG, a backend framework | A deployed feature with an evaluation table and a cost per request |
| Global capability centres | Python, cloud basics, MLOps or GenAI keywords, academics | Clean, documented, tested repositories; governance awareness |
| AI startups | Shipping speed, agents, evaluation | A working demo, a short write-up, honest limits |
| Service companies' AI practices | Python, GenAI, one cloud, communication | Clear explanations; a project a client would recognise |

## The skills line a filter searches — one per track

Use the job description's spellings, grouped, and only what you can defend for ten minutes. Shared rows first:

    Languages:   Python, SQL                 Backend: FastAPI, Pydantic, pytest, Docker, Git
    LLM core:    prompt design, structured output, RAG (hybrid search, re-ranking), LLM evaluation

Then the row your track earned:

    AI Engineer:     Qdrant/pgvector, BM25, cross-encoders, LangGraph (one approved tool action), tracing, caching
    Generative AI:   Hugging Face transformers, PEFT/LoRA, SFT data preparation, vision-language input, speech (WER)
    Agentic AI:      LangGraph (state graphs, interrupts, checkpointers), MCP servers, tool design, trajectory evaluation
    MLOps:           DVC, MLflow registry, pandera, GitHub Actions, Kubernetes, Prometheus/Grafana, Terraform basics
    AI Security:     OWASP LLM Top 10, threat modelling, access control for RAG, guardrails, defence regression testing (promptfoo)

Leave out what you ran once in a tutorial: "CUDA", "distributed training", "AutoGen, CrewAI", "AWS SageMaker".
**Every word on this line is a question in the technical round.**

## Project bullets: problem + method + measured result + cost or safety

An AI bullet needs a number with a **definition and a method** behind it. "95% accuracy" on a chatbot means nothing
— accurate by whose judgement, on which questions?

- Weak: "Built a RAG chatbot using LangChain and OpenAI with high accuracy."
- AI Engineer: "Hybrid retrieval (BM25 + dense + re-rank) over 46 college circulars: recall@5 0.91 on an 80-question
  golden set written before the build; faithfulness 0.93 by a judge checked against 40 hand labels."
- Generative AI: "LoRA fine-tune of a small open model for listing copy: 2 rule violations per 100 against 7 for a
  prompted large model on 171 held-out listings, at a fraction of the cost per listing."
- Agentic AI: "Invoice-matching agent over its own MCP server: correct disposition 0.92 across 40 scenarios × 5
  runs; 0 unapproved side effects; resumes after a crash without repeating an email."
- MLOps: "Fraud-scoring platform: any model rebuilt from commit and data hash; canary gate with rollback in under
  10 minutes; a slice monitor caught a collect-request scam overall recall hid."
- AI Security: "Claims assistant built secure by design (permission-filtered retrieval, tool gateway, layered
  guardrails): defence suite in CI blocks 97.5% of 600 trials, with over-blocking on a benign set reported."

Every number must be one you can reproduce from your repository on the spot. If a number is from an illustrative
run in a lesson, it is not yours — replace it with your own.

## The portfolio that backs every line

| Track | Lead piece | Second piece | What a reviewer should be able to run |
|---|---|---|---|
| AI Engineer | Campus Desk (or your option) | Shipping the Policy Assistant | make eval → the README's table |
| Generative AI | Listing Studio's ladder | A Fine-Tuned Support-Reply Model | The ladder evaluation on the test set |
| Agentic AI | AP Desk | A Research-and-Report Agent Team | The scenario suite with trajectory scores |
| MLOps | Rakshak | A Reproducible Credit-Risk Pipeline | dvc repro, then the promotion rule |
| AI Security | Your secure-by-design capstone | A Defence Test Suite for a Bank's Support Assistant | The defence regression suite and its block and over-blocking table |

Rules that apply to all five:

- **README first**: the problem, the headline numbers with how they were measured, a link to DESIGN.md and
  EVALUATION.md (or an assurance report), how to run it, and "Known limits".
- **A demo on synthetic or public data**, with a two-minute recording for when the free tier sleeps or the provider
  is down. No real customer, patient or student data, even "anonymised".
- **No secrets in history.** Keys come from the environment. If a key was ever committed, rotate it — deleting the
  file does not remove it from git history.
- **AI Security only:** publish tests of the product you built, with harmless canary markers instead of real
  secrets. Never probe or publish anything about a real company's product.
- **LinkedIn and Naukri** use the same skill spellings and the same numbers; the capstone goes in Featured.

## Copies for different roles — the facts never change, only the order

| Target | Lead with | Push down |
|---|---|---|
| AI / LLM Engineer | Retrieval and evaluation numbers, the deployed service | Fine-tuning details |
| GenAI Engineer | The ladder, the fine-tune, multimodal input | Kubernetes |
| Agent Engineer | Tools, approvals, trajectory evaluation, durability | Classical ML |
| MLOps / Platform | Rebuild, registry, CI, canary, monitoring | Prompt design |
| AI Security | Threat model, controls, block rates with intervals and over-blocking | Model training |`,
    workedExample: `**A weak AI resume section, rewritten.** Sneha, B.Tech CSE 2026, Generative AI track, sends:

    SKILLS: Python, AI, ML, DL, NLP, CV, LLM, GPT, LangChain, AutoGen, CrewAI, Kubernetes, AWS, Azure, Prompt Engineering
    PROJECTS
    1. AI Listing Generator — generates product descriptions using LLMs with 95% accuracy.
    2. PDF Chatbot — chat with your PDFs using LangChain and a vector DB.
    3. Custom LLM — fine-tuned an open-source LLM on custom data.

**What a panel sees.** An indefensible skills line; "95% accuracy" on text with no single right answer; the PDF
chatbot every applicant has; a fine-tune never compared with not fine-tuning.

**Step 1 — inventory what is true.** Her capstone (Listing Studio): a family split, a 171-listing human-approved
test set, the ladder L0 → L1 (plus retrieval) → L2 (LoRA) against a large reference model, rule checks in code,
blind pairwise preference, a regression set, a FastAPI service with an evaluation gate in CI. She has never used
AutoGen, CrewAI, Kubernetes or Azure.

**Step 2 — rewrite.**

    Listing Studio — house-style product listings for a handloom brand        github.com/sneha-r/listing-studio
    Python, Hugging Face transformers, PEFT (LoRA), FastAPI, Pydantic, Docker
     - Built a prompt → retrieval → LoRA ladder and kept each rung only if it beat the one below on 171
       held-out, human-approved listings (family split, so no design appears in both train and test).
     - LoRA model: 2 rule violations per 100 vs 7 for a prompted large model; preference margin within
       the interval (reported, not hidden); runs on one rented GPU, keeping unreleased designs in-house.
     - Photo input corrected colour and weave attributes the seller's notes got wrong; accuracy per attribute
       measured on labels made from the photos.
     - Served the adapter with FastAPI; schema, rule and regression checks gate every release in CI.

    SKILLS
    Python, SQL | transformers, PEFT/LoRA, SFT data preparation | RAG (hybrid search) | vision-language input
    LLM evaluation (pairwise preference, bootstrap intervals) | FastAPI, Pydantic, pytest, Docker, Git

**Step 3 — check against a JD.** A GCC asks for "Python, LLMs, RAG, fine-tuning (LoRA/QLoRA), evaluation, Docker,
Azure a plus". Every true keyword is there; Azure stays off, and if asked she says "not yet — here is what I did
deploy".

**Step 4 — make the portfolio agree.** The README leads with the ladder table; the demo runs on synthetic listings;
the PDF chatbot and the vague fine-tune move to a Practice section or off the page.`,
    mcqs: [
      mcq('Rohit\'s resume says "RAG chatbot over college documents — 96% accuracy". A panellist asks how that was measured and he says he checked twenty answers by eye. What should the bullet have said?', [
        ['Recall@5 and faithfulness on a golden set written before the build, with how the judge was checked', true],
        ['A higher accuracy figure from a larger sample of answers he checks by eye before the interview', false],
        ['"High accuracy" with no figure, so the panel has no number to question him on in the round', false],
        ['The name of the embedding model and vector database, which shows the depth of the stack', false],
      ], 'A number needs a definition and a method. Twenty answers judged by eye is neither; retrieval recall and faithfulness on a set written before the build, with the judge checked against human labels, are. Hiding the number or listing tools avoids the question rather than answering it.'),
      mcq('An MLOps fresher role lists "Python, Docker, Kubernetes, MLflow, CI/CD, monitoring". Kavya did the MLOps track. Which bullet should lead her copy?', [
        ['Any registered model rebuilt from commit and data hash; canary release with a rehearsed rollback', true],
        ['A fraud model with tuned hyperparameters and the best holdout recall of all the models she tried', false],
        ['A RAG assistant with hybrid search and a cross-encoder re-ranker over a set of policy documents', false],
        ['A list of every tool in her capstone, in the order the job description happens to mention them', false],
      ], 'An MLOps panel hires for the platform around the model: reproducibility, releases and rollback. Model tuning and RAG are true work but answer a different JD; a tool list is not a result.'),
      mcq('Which public demo is safe to link from an AI Security student\'s resume?', [
        ['The assistant she built, its controls, and her defence suite with canary markers instead of secrets', true],
        ['Screenshots of a weakness she found by probing a bank\'s live chatbot, with the bank\'s name hidden', false],
        ['A public collection of prompts that get past popular assistants\' safety rules, sorted by success', false],
        ['A recording of her testing her internship employer\'s assistant, shared with the team\'s permission', false],
      ], 'Security portfolio work must be on a system you built, tested with harmless markers, and published only where you may publish it. Probing a live product, a collection of bypass prompts or an employer\'s internal system are not yours to make public.'),
    ],
    checkpoint: [
      ck(PR, 'Arjun did the Agentic AI track. His skills line lists "LangGraph, MCP, AutoGen, CrewAI, Semantic Kernel, Kubernetes"; he has used only the first two. What should he do?', [
        ['Keep LangGraph and MCP with what he built in them, and drop the frameworks he has not used', true],
        ['Keep all six, since agent roles filter on framework names and the extra ones cost him nothing', false],
        ['Move the unused four to a "Familiar with" line, which interviewers treat as off limits', false],
        ['Replace the line with "agentic AI frameworks", which covers every framework with one phrase', false],
      ], 'Each named framework becomes a question in the technical round, and one question exposes a bluff. Naming what he built — state graphs, interrupts, an MCP server — is honest and matches more specific searches.'),
      ck(PE, 'Which item best backs the bullet "0 unapproved side effects across 200 scenario runs"?', [
        ['The scenario suite in the repository, a command that runs it, and the results table it prints', true],
        ['A screenshot of the approval screen from the live demo, showing the AP manager clicking "Approve" on a hold', false],
        ['A sentence in the README saying every side effect is checked by a human before it happens', false],
        ['A certificate from a course on building safe agents, with the course\'s final grade attached', false],
      ], 'Evidence is the thing that produced the number: the suite, a way to run it, and its output. One screenshot shows one run; a sentence or a certificate says nothing about this agent.'),
      ck(PR, 'Divya has one capstone (Campus Desk) and two JDs: an "LLM Engineer" at a product company and an "AI Engineer — Client Delivery" at a service company\'s AI practice. What should her two copies do?', [
        ['Same facts in both; lead the first with evaluation and serving, the second with users and explanation', true],
        ['Send one identical copy to both, so that her story never differs between the two applications', false],
        ['Add Azure and Copilot Studio to the service-company copy, since client work tends to use them', false],
        ['Remove the numbers from the service-company copy, because client teams prefer plain language', false],
      ], 'The facts never change; the order does. A product team reads evaluation and serving first; a client-delivery team reads who used it and how she explained it. Adding unused tools or removing the evidence weakens either copy.'),
    ],
  },

  /* ── DEFEND_CAPSTONE ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_PLACE_CANDIDATE_DEFEND_CAPSTONE',
    notes: `Your capstone's Demo Day unit rehearsed the ten-minute demo and the first round of questions. A placement panel
has read your README and goes **one level deeper**: it asks about numbers you did not put on a slide, the case your
evaluation did not cover, and the decision you would reverse. Below are those questions for each track's capstone,
with what a strong answer contains. Build the same list for your own option if you chose B or C.

## The table you must know without looking

Whatever the track: the headline metric and how it is measured; the size of your test set and how it was written;
the baseline or alternative you compared against; p95 latency and cost per request (tokens × price per million, or
GPU-seconds); the worst failure class; and the one safety rule enforced in code rather than in a prompt.

## AI Engineer — Campus Desk (cited answers and one approved action)

1. **"Recall@5 is 0.91. Which 9% fail, and does it matter?"** Name the class (table questions; Telugu-English
   follow-ups) and whether the answer then refused or answered wrongly — a miss that refuses is cheap, a miss that
   answers from the 2023 circular is not.
2. **"Two students ask the same thing a minute apart. Same answer?"** Not guaranteed; what you pinned
   (temperature, retrieval order, the cache key) and what you measured across repeated runs.
3. **"The second 'yes' returned the same ticket. Show me where."** The idempotency key on the request, the
   database constraint, and the test.
4. **"At 10,000 questions a day, what breaks first?"** Usually the re-ranker's latency or the provider's rate limit,
   not the vector database; the cache hit rate you measured, and the cheaper model for easy questions.

## Generative AI — Listing Studio (the ladder)

1. **"The reference model won on preference. Why ship L2?"** The interval crossed zero; L2 broke fewer rules, kept
   designs in-house and cost far less per listing — and the switch is configuration, both sit behind one API.
2. **"Your family split — what would the score have been without it?"** If you measured the random split, give
   both; the gap is how much memorising a random split would have rewarded.
3. **"You served a quantised adapter. Same model as the one you evaluated?"** No — you re-ran the evaluation on the
   served artefact and report both rows.
4. **"Where did training targets come from?"** Approved listings, distilled examples with the provider's terms
   checked, and a test set no generated text ever touched.

## Agentic AI — AP Desk (multi-step work with approvals)

1. **"What share of invoices ever reach the model?"** Clean matches are code and make no model call; give the share
   and the tokens per exception invoice.
2. **"An approval was given, then the worker crashed before the checkpoint. Is the email sent twice?"** No: the
   tool's idempotency key, checked by the server, covers the gap between a side effect and its checkpoint.
3. **"Five runs of the same scenario disagree. Which do you report?"** All five: pass^k (every run passes) for the
   safety cases, the mean for the rest, and the flaky scenario read trace by trace.
4. **"Why not a planner and three specialist agents?"** Each agent adds calls, hand-off errors and cost; one bounded
   investigator met the targets; say which measured failure would justify a second.

## MLOps — Rakshak (the platform around a fraud model)

1. **"The collect slice had 8 frauds in the holdout. So promotion never really tested it?"** Agreed; that is why the
   slice monitor exists — and why larger holdout windows or slice oversampling are the fix.
2. **"Retraining moved the collect slice only from 0.046 to 0.092. Why?"** The features cannot see the scam; the
   fix is a payee-level feature and a temporary rule, not more training.
3. **"Why does the pod pin a version instead of using @champion?"** An alias move would deploy itself on the next
   restart with no canary.
4. **"Your canary gate has no recall in it."** Labels arrive days later; the gate checks errors, p99, challenge rate
   and score distribution now; quality is judged at promotion and by slice afterwards.

## AI Security — an AI product, secure by design

This capstone builds one product — an insurer's claims assistant, an HR copilot with tools or an edtech tutor —
with its controls designed in: permission-filtered retrieval, a least-privilege tool gateway, layered guardrails,
safe output handling and abuse monitoring. Then it proves them: a defence regression suite in CI, block rates with
intervals, over-blocking measured on a benign set, a findings-and-fixes log and governance documents. The panel (an
AppSec engineer, an AI engineer, often a risk or compliance person) asks:

1. **"Your block rate is 97.5%. Over how many trials, and how sure are you?"** Cases × runs each, because outputs
   vary; the interval, not just the point; and the over-blocking rate on the benign set, because a control that
   refuses everything also "blocks" every test.
2. **"Which control would you remove first, and what would break?"** Know what each layer carries: permission
   filtering stops cross-user leaks before the model sees anything; the guard model is the last, leakiest layer.
3. **"Why is this finding High and not Critical?"** Impact (whose data, what action) and likelihood, the evidence
   that reproduces it despite varying outputs, and the fix and retest in your findings-and-fixes log.
4. **"Your scanning tool in CI reports nothing. Is it safe?"** No — tools check known patterns; your own regression
   cases cover your product's specific controls, and you say which risks neither covers.
5. **"Which control lives in a prompt?"** Ideally none you rely on: retrieval filtered by the user's permissions,
   model output treated as untrusted, side effects behind confirmation in the tool gateway.
6. **"What does your governance pack say the residual risk is?"** The system card's known limits, who accepted the
   remaining risk, and the monitoring that would show it growing.

**The rule for every answer:** the number, how it was measured, how sure you are, and what you would do next. Say
"I haven't measured that — here is how I would" before the panel has to drag it out of you.`,
    workedExample: `**The question (AI Security panel): "Your defence suite's block rate rose from 69% to 97.5%. Convince me the
controls work — and not just that the assistant now says no to everything."** The numbers are illustrative; use your
own.

A weak answer: "We added a guard model and a stronger system prompt, and after that almost every test was blocked.
The scanning tool in CI also reported no critical issues."

A strong answer, written as you talk:

    Defence regression suite: 120 cases (cross-claimant data requests, instructions planted in uploaded
      claim documents, unsafe tool requests, output-handling cases) × 5 runs = 600 trials, canary markers only
      prompt-only build     414 / 600 blocked   69.0%   (95% interval 65.2–72.6%)
      controls designed in  585 / 600 blocked   97.5%   (95% interval 95.9–98.5%)
    Benign set: 400 real-style claim questions
      over-blocking         2.0% → 3.5%   (interval for 3.5%: 2.1–5.8%; budget 5%)
    Cost of the guard layer: p95 latency +180 ms

Say it in order:

1. "Same 120 cases on both builds, five runs each because outputs vary, so the comparison is like for like."
2. "Most of the gain is architecture, not the guard. Retrieval returns only the logged-in claimant's documents,
   filtered before the model sees anything; output is rendered as text; the tool gateway lets the assistant request
   a callback only with the user's confirmation."
3. "The guard model is the last layer, and its price is on the slide: over-blocking rose to 3.5%, and the interval's
   upper end crosses my 5% budget, so I'm growing the benign set before I claim it is under budget."
4. "The 15 trials not blocked are all in one class — off-policy replies over several turns. It is the top open item
   in my findings-and-fixes log, rated Medium because no case reached another claimant's data."

**The follow-up chain.**
- "Why trust five runs?" — "For the cross-claimant cases I require all five runs to hold, and every one does."
- "What would make you stop the launch?" — "Any failure in the cross-claimant class, in CI or in monitoring."`,
    mcqs: [
      mcq('A panellist asks the Campus Desk student: "Recall@5 is 0.91 — what happens on the 9% of questions where retrieval misses?" What is the strongest reply?', [
        ['Split them: most hit the refusal path, a few answered from an old circular — those are the ones to fix', true],
        ['They are answered from the model\'s own background knowledge, which is usually right about general college rules', false],
        ['That 9% is within the industry norm for RAG systems, so it does not need any further investigation', false],
        ['They are all table questions, so the fix is a larger embedding model that understands tables better', false],
      ], 'A miss that ends in a correct refusal is cheap; a miss that confidently answers from a superseded circular is the real defect. Answering from parametric knowledge breaks grounding, "industry norm" is not an analysis, and a bigger model is a guess until the failure class is read.'),
      mcq('The Listing Studio student is asked, "You evaluated a full-precision checkpoint but serve a quantised adapter. Which number is real?" What should she say?', [
        ['The served artefact\'s own evaluation on the same test set, reported next to the checkpoint\'s row', true],
        ['The checkpoint\'s numbers, since quantisation is lossless for adapters trained with LoRA at rank 16', false],
        ['Neither, because a quantised model cannot be evaluated with the same metrics as the original model', false],
        ['The checkpoint\'s numbers minus one point, which is the usual quality loss caused by quantisation', false],
      ], 'Users get the served model, so it must be evaluated as served. Quantisation is not lossless, the same metrics apply, and a rule-of-thumb deduction is not a measurement.'),
      mcq('An AP Desk panellist asks: "The same scenario passed in four of five runs. Is it passing?" Which answer is strongest?', [
        ['For safety scenarios no — they must pass every run; for the rest, report the rate and read the failing trace', true],
        ['Yes — four of five is 80%, which is above the 0.90 target once rounded across the whole suite', false],
        ['Yes — the failing run was probably a provider glitch, so it can be dropped from the reported results', false],
        ['No — the scenario is flaky, so it should be removed from the suite until it behaves the same way', false],
      ], 'Agents vary run to run, so safety cases need every run to hold (pass^k), and a failing run is evidence to read, not noise to discard. Rounding up, dropping runs or deleting the scenario all hide the very behaviour the suite exists to catch.'),
    ],
    checkpoint: [
      ck(TE, 'A panel asks the Rakshak student why retraining on recent weeks lifted the collect-request slice\'s recall only from 0.046 to 0.092. What is the strongest explanation?', [
        ['The features cannot see the scam, so the fix is a payee-level feature and a temporary rule', true],
        ['The model needs more trees and a lower learning rate, since retraining did not converge fully', false],
        ['The labels for recent weeks were wrong, so retraining should wait until they are corrected', false],
        ['The slice is too small to matter, because overall recall stayed within its alert margin', false],
      ], 'The scam uses the payer\'s own old device in daytime to young payee accounts, which the current inputs do not distinguish. More training on the same features cannot find a signal they do not carry; the labels were late, not wrong, and a small slice failing is exactly what slices exist to catch.'),
      ck(TE, 'An AI Security panellist says: "Your defence suite blocks 97.5% of cases, so the product is safe." Over-blocking on the benign set rose from 2% to 3.5%. What should the student say?', [
        ['Safer, not safe: name the class still getting through, and report the over-blocking and latency costs', true],
        ['Agree, since a block rate above 95% on the regression suite proves the product is now safe enough to launch', false],
        ['Disagree, since guard models never reduce real risk and the rise must come from random variation', false],
        ['Agree, and add that 3.5% over-blocking is acceptable for every product in every domain', false],
      ], 'A defence result has two sides: what still gets through, and what the controls cost genuine users. Claiming "safe" ignores the residual class; dismissing the controls ignores the measurement; an over-blocking rate is acceptable only for a given product\'s users.'),
      ck(TE, 'A Campus Desk panellist asks: "A student says yes twice to the certificate request. How do you know only one request is created?" Which answer uses evidence best?', [
        ['An idempotency key on the request, a unique constraint in the database, and the test that sends it twice', true],
        ['The system prompt tells the model to call the submit tool only once per conversation with a student', false],
        ['The model runs at temperature 0, so it makes the same single call each time it is asked to submit', false],
        ['The portal\'s staff would notice a duplicate request and delete it before issuing the certificate', false],
      ], 'Exactly-once behaviour has to be enforced by the system: a key and a constraint, proven by a test. A prompt or temperature setting cannot guarantee it, and relying on staff to clean up moves the bug to someone else.'),
    ],
  },

  /* ── MOCK_LOOP ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_PLACE_CANDIDATE_MOCK_LOOP',
    notes: `One complete interview day for an **entry AI engineer** role in India — the shape most product companies, GCCs
and AI startups use, with the specialism round swapped for your track. Pay varies widely by city, company and role;
check current figures for each company rather than trusting a number from a forum. Run it with a friend or mentor as
interviewer, in one day, with real timers. The question banks are the AI placement topics: LLM Engineering Interview
Questions for round 2, your specialism's interview topic for the follow-ups, and AI System Design Interviews for
round 3.

## Round 0 — Online assessment (90 min, proctored)

| Section | Time | What it is |
|---|---|---|
| Aptitude | 25 min | quant, logical, data interpretation |
| Python coding | 40 min | two problems: one DSA, one practical (records, metrics, text) |
| AI and ML MCQs | 25 min | tokens and context, embeddings, RAG, evaluation, overfitting, metrics |

**Sample practical problem.** "For each query you get the ranked chunk ids and the set of relevant ids. Print mean
recall@3 and MRR to three decimals."

    q1: [c4, c1, c9, c2]  relevant {c1}       q2: [c7, c3, c5, c8]  relevant {c5, c6}
    q3: [c2, c6, c1, c4]  relevant {c9}
    → recall@3 0.500   MRR 0.278

(q1 has recall 1 and reciprocal rank 1/2; q2 recall 1/2 and 1/3; q3 nothing.) **Scored on:** hidden tests — a
query with no relevant chunk in the list, an empty list, duplicates.

## Round 1 — Coding (45 min)

1. A DSA problem at medium level (a heap, a sliding window, a graph search), in Python, with complexity stated.
2. A practical one: "Write a per-user rate limiter — at most N calls in any 60-second window — for an LLM endpoint."
   A strong answer keeps a deque of timestamps per user, drops ones older than 60 seconds on each call, and says
   what changes with several servers (a shared store such as Redis).

**Scored on:** working code, tests written aloud, edge cases named before being asked.

## Round 2 — LLM or ML technical (45 min)

The interviewer picks five; the specialism ones match your track.

1. "Why does the same prompt give different answers?" → sampling, temperature, and non-determinism even at 0;
   what you pin and how you evaluate across repeated runs.
2. "Your RAG answers are wrong but faithful. Where do you look?" → retrieval first: recall@k on a golden set, then
   chunking, hybrid search and re-ranking.
3. "How do you know your LLM judge is right?" → agreement with human labels on a sample, and where they disagree.
4. GenAI: "Prompt, RAG or fine-tune for a house writing style?" → prompt first; fine-tune when style and format
   resist prompting, proven against the prompted baseline on held-out data.
5. Agentic: "Workflow or agent?" → a workflow when the steps are known; an agent only when the next step depends on
   what it finds — and approvals before side effects.
6. MLOps: "How would you notice a model failing when labels arrive a month late?" → proxies, input drift, score
   distribution, slices, and quality once labels mature.
7. AI Security: "Indirect prompt injection — where does it come from and what actually stops it?" → retrieved
   documents, emails, tool results; least privilege and confirmation, not a prompt.
8. "Your capstone in three minutes" → then two DEFEND_CAPSTONE follow-ups.

**Scored on:** correct, explained plainly, trade-offs named, honest at the edge of knowledge.

## Round 3 — AI system design (45 min)

"Design a support assistant for a bank's credit-card customers, in English and Hinglish, 50,000 conversations a
day." A strong candidate spends five minutes on requirements (what it may do, what it must never do, latency, who
sees which data), proposes a baseline, then retrieval with per-customer permissions, the model path with a small and
a large model, an evaluation set, guardrails and confirmation before any action, cost (tokens × price per million ×
volume), monitoring and a rollout. Track variants: MLOps candidates get "serve and monitor the dispute-risk model
behind it"; AI Security candidates get "threat-model this assistant".

**Scored on:** structure, numbers estimated aloud, safety designed in, a clear recommendation.

## Round 4 — Hiring manager (30 min)

"Tell me about a time your evaluation was wrong." "The product head saw a great demo and wants to launch on Friday;
there is no evaluation set — what do you do?" → say what is unknown and the risk, offer a fast evaluation on 50 real
questions by Thursday and a limited rollout, and put it in writing. "The provider is retiring the model you use next
month — what is your plan?" → the evaluation suite decides the replacement, behind a config change and a canary.

**Scored on:** ownership, judgement under pressure, explaining AI risk to non-engineers.

## Round 5 — HR (15 min)

"Why AI engineering?", "Higher studies?", "Relocation and service agreement?", "Expected CTC?" — answers consistent
with the resume.

## Scoring sheet (1–4 per row)

| Row | 1 | 4 |
|---|---|---|
| Correctness | Errors not noticed | Correct, with checks unprompted |
| Explanation | Jargon, no structure | Plain words, one idea at a time |
| Evidence | "It worked well" | Numbers with a method and a baseline |
| Safety thinking | Safety in the prompt | Safety in the architecture, and tested |
| Honesty | Bluffs | "I don't know — here is how I'd find out" |
| Composure | Stalls when challenged | Updates the answer and carries on |

## Debrief template (fill within an hour)

    Round / interviewer role:
    Questions asked, verbatim:
    Answered well — why:
    Weak or blank — the question + what a strong answer contains:
    Numbers I could not reproduce on the spot:
    Fix before the next loop (max 3, each with a date):`,
    mcqs: [
      mcq('Round 0: for three queries the reciprocal ranks of the first relevant chunk are 1/2, 1/3 and 0 (none found). What is the MRR?', [
        ['0.278', true],
        ['0.417', false],
        ['0.333', false],
        ['0.500', false],
      ], 'MRR averages over every query, including the one with no relevant chunk (which scores 0): (0.5 + 0.333 + 0) ÷ 3 = 0.278. Averaging over only the two queries that found something gives 0.417, which overstates retrieval.'),
      mcq('Round 1 asks for a per-user limit of N LLM calls in any 60-second window. Which design is the standard strong answer?', [
        ['A deque of timestamps per user, dropping entries older than 60 s before each call is checked', true],
        ['A counter per user that resets at the start of each clock minute, checked before every model call', false],
        ['A single global counter for all users together, checked and reset once every 60 seconds', false],
        ['A sleep of 60 ÷ N seconds before every call, so no user can ever go over the limit', false],
      ], 'A sliding window needs the recent timestamps; a deque makes dropping old ones cheap. A clock-minute counter allows 2N calls across a minute boundary, a global counter lets one user starve the rest, and sleeping slows every user even when under the limit.'),
      mcq('In round 2 the interviewer says, "Our RAG bot\'s answers are faithful to the retrieved text but often wrong." Where should the candidate look first?', [
        ['Retrieval: recall@k on a golden set, then chunking, hybrid search and re-ranking', true],
        ['Generation: a stronger model and a longer system prompt that insists on correct answers', false],
        ['Temperature: set it to 0 so that the model stops inventing details that look plausible', false],
        ['Fine-tuning: train the model on the company documents so it no longer needs retrieval', false],
      ], 'Faithful but wrong means the model correctly used the wrong passages, so the fault is upstream. A bigger model, a lower temperature or a fine-tune do not fix passages that should never have been retrieved.'),
      mcq('The hiring manager says: "A great demo; the product head wants to launch on Friday with no evaluation set." Which answer scores best?', [
        ['State the risk, offer a quick evaluation on 50 real questions and a limited rollout, and put it in writing', true],
        ['Launch on Friday as asked, since the product head owns the decision and the demo went very well', false],
        ['Refuse to launch until a full evaluation set of several thousand labelled questions has been written', false],
        ['Launch on Friday and quietly build the evaluation set afterwards, before anyone sees a failure', false],
      ], 'Ownership is making the unknown visible and offering a fast, safe path: a small real evaluation and a limited rollout. Silent compliance, a flat refusal or a quiet launch each leave the risk unmanaged.'),
      mcq('After the mock day, Aman\'s debrief says "System design went badly". Which rewrite is most useful?', [
        ['"Skipped requirements and never estimated cost; redo the bank design by 14 Nov with numbers aloud"', true],
        ['"System design went badly; I will study every single AI system design topic again during this coming week"', false],
        ['"The design interviewer expected far more than a fresher can be asked to know in 45 minutes"', false],
        ['"I was anxious in the design round, so next time I will try to relax before it begins"', false],
      ], 'A useful debrief names the exact gap and a dated fix to practise. Revising everything, blaming the interviewer or noting nerves gives nothing specific to do differently next time.'),
    ],
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_PLACE_CANDIDATE_CHECKPOINT',
    notes: `This checkpoint measures the judgement an AI hiring panel looks for: a resume whose every number has a method
behind it, a portfolio a reviewer can run in minutes, a capstone defended past its slides, and composure across the
interview day.

Recall the rules of this topic:
- **Every number has a definition, a method and a baseline** — and, where outputs vary, a run count.
- **Every claim is checkable** — a repository, an evaluation command, a demo on data you may publish.
- **Safety lives in the architecture**, and you can show the test that proves it.

Each question is a scenario. Pick what a strong candidate would actually do.`,
    checkpoint: [
      ck(PR, 'Neha\'s project bullet reads "Agentic AI system using LangGraph, MCP, RAG, memory and tools". Which rewrite is strongest?', [
        ['What the agent does, its disposition accuracy over scenario runs, and that no action ran unapproved', true],
        ['The same tools in bold and in alphabetical order, so a recruiter scanning the page finds them faster', false],
        ['"End-to-end autonomous agent that replaces manual work", which states the business value in one line', false],
        ['The list extended with AutoGen and CrewAI, so the bullet matches more agent job descriptions', false],
      ], 'A list of tools is not a result. The task, a measured outcome over repeated runs and the safety property give a panel something to probe; "replaces manual work" is a claim with no evidence, and unused frameworks invite exposure.'),
      ck(PR, 'A GCC posts "GenAI Engineer: Python, RAG, LLM evaluation, responsible AI, stakeholder communication". Which bullet fits it best?', [
        ['"Measured faithfulness against 40 hand labels and presented the refusal results to the college office"', true],
        ['"Worked with 12 GenAI libraries, including LangChain, LlamaIndex, Chroma, Qdrant and Hugging Face transformers"', false],
        ['"Built a chatbot with 98% accuracy that outperformed every other team in the college hackathon"', false],
        ['"Passionate about generative AI, with strong problem-solving skills and a deep love of learning"', false],
      ], 'The JD asks for evaluation and communication; the bullet shows both with something concrete. A library count, an unexplained accuracy or adjectives show neither.'),
      ck(PR, 'Varun did the MLOps track and is applying to a startup whose JD says "ML Engineer — you will own models from notebook to production". How should his copy lead?', [
        ['The rebuild, promotion rule, canary and rollback — then the model itself, kept short and honest', true],
        ['The fraud model\'s hyperparameter search, since owning models from notebook to production means owning their accuracy first', false],
        ['A summary of the MLOps course syllabus, so the startup can see every topic he has covered', false],
        ['His CGPA and coursework, since startups weigh academic results most heavily for freshers', false],
      ], '"Notebook to production" is the platform work his track proved. Leading with it, and stating the model plainly, matches the JD; tuning details, a syllabus or grades do not show ownership.'),
      ck(PE, 'A reviewer clones Pooja\'s Campus Desk repository with ten minutes to spare. Which state helps most?', [
        ['A README with the results table first, docker compose up and make eval reproducing that table', true],
        ['A repository with every experiment notebook she ran, so the reviewer can see her whole process', false],
        ['A short README and a link to a demo video, since reviewers prefer watching to running code', false],
        ['The code with all secrets included, so the reviewer can run it at once without any setup', false],
      ], 'Reviewers read before they run. Results first and one command that reproduces them let a claim be checked in minutes; a pile of notebooks or a video alone does not, and committing secrets is a security failure.'),
      ck(PE, 'Sameer, on the AI Security track, wants evidence for "defence suite block rate rose from 69% to 97.5%". What should his portfolio contain?', [
        ['The suite in CI on his own build, run counts, both results with intervals, and the benign set', true],
        ['Screenshots of the five most worrying test cases from the suite, chosen to show the panel how serious each one was', false],
        ['A blog post explaining the OWASP LLM Top 10, with his opinion on which category matters most', false],
        ['The guard model\'s confusion matrix from its model card, as published by the people who built it', false],
      ], 'The claim is a measured change, so the evidence is the suite, how many runs, both results and what the fix cost benign users — on a target he may publish. Screenshots, an essay or someone else\'s model card measure none of that.'),
      ck(TE, 'Asked "Why does your agent need a model at all?", the AP Desk student should say:', [
        ['Matching is code; the model handles only exceptions whose next step depends on what it finds', true],
        ['The model is more accurate than code at comparing quantities and prices on invoices and POs', false],
        ['Every agentic capstone must use a model on each step, or it would not count as an agent', false],
        ['Code cannot read PDF invoices reliably at all, so the model has to process every single invoice end to end', false],
      ], 'A model comparing numbers is a design error: code is exact, free and testable. The model earns its place on exceptions, vendor replies and drafted queries — and the share of invoices that reach it is the number to give.'),
      ck(TE, 'A panellist asks the Listing Studio student: "A large prompted model won on preference. Wasn\'t the fine-tune a waste?" What is the strongest reply?', [
        ['The margin\'s interval crossed zero; L2 broke fewer rules, cost less and kept designs in-house', true],
        ['Yes, and she would remove the fine-tune and use the large model in every future version', false],
        ['No, because fine-tuned models are always more accurate in a narrow domain than prompted ones', false],
        ['No, because preference judgements are subjective and so should never be reported in a held-out evaluation', false],
      ], 'The honest answer gives the measured trade-off: an uncertain preference gap against fewer rule violations, lower cost and data staying in-house. "Always more accurate" is false, and dropping preference hides a result she measured.'),
      ck(TE, 'A Rakshak panellist asks: "Your canary passed. Then the model went live and recall on collect requests collapsed. What did your process miss?" What is the best answer?', [
        ['The canary checks what it can see in hours; slice recall needs late labels, so the slice monitor caught it', true],
        ['The canary was too short; running it for a month would have let fraud labels arrive before promotion', false],
        ['Nothing — recall on one slice does not matter as long as the overall recall alert stays silent', false],
        ['The model was not reproducible, since a reproducible model would have kept the same recall', false],
      ], 'A canary judges errors, latency, challenge rate and score distribution; fraud labels take days to weeks. Quality per slice is watched after release, which is how the scam was found. A month-long canary is impractical, and reproducibility is a different property.'),
      ck(IP, 'In the LLM round, Tanvi realises mid-answer that she said cross-encoders are faster than bi-encoders. What should she do?', [
        ['Stop, say she had it backwards, and explain why the cross-encoder is the slower re-ranker', true],
        ['Carry on with the answer, since correcting herself mid-answer would make her look badly under-prepared', false],
        ['Switch to talking about her capstone, where she feels more confident with the details', false],
        ['Wait to see whether the interviewer noticed before deciding to say anything about it', false],
      ], 'Interviewers score self-correction highly — it is the checking habit they want at work. A cross-encoder scores each query-passage pair jointly, which is why it re-ranks a short list. Ploughing on or changing the subject leaves a wrong answer on the record.'),
      ck(IP, 'In the design round, the interviewer says Vikram\'s plan to run a large model on every message is "too expensive at 50,000 conversations a day". What is the best response?', [
        ['Estimate the cost aloud, then route easy messages to a smaller model and cache frequent answers', true],
        ['Defend the plan, since answer quality matters more than cost and changing the design now would look indecisive', false],
        ['Drop the language model entirely and propose a keyword FAQ search for every customer message', false],
        ['Ask the interviewer what budget they have in mind, and wait for them to propose the design', false],
      ], 'A challenge tests whether the design adapts. Doing the arithmetic, then routing and caching with the quality check that guards them, keeps the design and shows judgement; abandoning the model or handing the problem back does not.'),
    ],
  },
];
