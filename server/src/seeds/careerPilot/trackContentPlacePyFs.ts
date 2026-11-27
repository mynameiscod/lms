/**
 * Career-track content: the Python full-stack candidate (JT_PLACE_PY_FS), for Python Full Stack + AI.
 *
 * Year 4 already teaches the generic resume, portfolio, project defence, HR and mock rounds
 * (T4_RESUME, T4_PORTFOLIO, T4_IV_PROJECT, T4_MOCK_*). This topic is the Python full-stack + AI
 * version of the same moment: the skills line an ATS filters a Python/Django/React fresher on, the
 * track capstone (React → Django REST Framework on MySQL → a FastAPI AI service with RAG and a
 * LangGraph agent, the browser streaming from FastAPI with a short-lived token Django issues)
 * defended under follow-up, and one complete interview day for a Python full-stack fresher role at a
 * typical Indian service or product company.
 *
 * Attribution: the topic is multi-skill (PLACEMENT_READINESS, PORTFOLIO_EVIDENCE,
 * TECHNICAL_EXPLANATION, INTERVIEW_PERFORMANCE). Checkpoint questions name the one skill they
 * measure — from the unit's own skillKeys where the unit declares them. Practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_PLACE_PY_FS_BUNDLES: PilotBundle[] = [
  /* ── RESUME ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PLACE_PY_FS_RESUME',
    notes: `Year 4 taught you what a resume is for. This unit is narrower: the **Python full-stack fresher**
resume that gets through a campus or off-campus ATS for roles titled "Python Developer", "Python Full Stack
Developer", "Associate Software Engineer — Python/Django", "Backend Engineer (Python)" or "GenAI Engineer —
Fresher", and the GitHub that makes every line on it checkable.

## The one-page template, in this order

1. **Header** — name, city, phone, a professional email, LinkedIn, GitHub, and the live URL of the capstone.
   Leave out photo, date of birth, marital status, father's name and the "I hereby declare…" line — product
   companies read them as a copied template, and none of them is searchable.
2. **Summary** (two lines, optional) — role + stack + one proof. "Python full-stack developer (Django REST
   Framework, React 18, MySQL) who built and deployed an e-commerce store with a FastAPI RAG assistant and a
   LangGraph shopping agent."
3. **Skills** — grouped, plain text, no bars or percentages (see below).
4. **Projects** — the capstone first, then two more. For a fresher this is the section that gets read.
5. **Experience / internships** — only if it was real engineering work; otherwise below Projects.
6. **Education** — B.Tech branch, college, year, CGPA (state it if ≥ 7; many service companies cut at 6 or
   60%). Class XII and X percentages on one line — mass recruiters still check them.
7. **Achievements** — ones you can talk about: a LeetCode/CodeChef rating, a hackathon result, an open-source
   PR that was merged. Skip "completed Python course" badges.

## The skills line an ATS filters on

Recruiters search the ATS with the job description's own words. Use the exact spellings they type:

    Languages:   Python 3, SQL, JavaScript (ES6+), HTML5, CSS3
    Backend:     Django, Django REST Framework (DRF), FastAPI, REST APIs, Simple JWT, Pydantic
    Frontend:    React 18, Redux Toolkit, Vite
    Database:    MySQL 8 (Django ORM, PyMySQL)
    Testing:     pytest, pytest-django
    AI:          LLM APIs (OpenAI SDK), RAG (embeddings + vector store), LangChain, LangGraph agents
    Tools:       Git, GitHub, Docker, Docker Compose, Linux, Postman, Nginx

Write "Django REST Framework (DRF)" once so both spellings match; "FastAPI", not "Fast API"; "pytest", not
"PyTest framework". List **LangChain** only if you can say what you used it for (loaders, splitters, a
retriever) — and say plainly that the agent itself is LangGraph. Never list a skill you cannot defend for
five minutes; round 2 is built from this line.

## Project bullets: verb + what + how + number

Each bullet starts with a past-tense verb, names the technology, and carries a number you measured.

- Weak: "Did backend in Django."
- Strong: "Built 21 DRF endpoints (ViewSets + routers) with Simple JWT auth and object-level permissions so a
  customer can read only their own orders; 64 pytest-django tests."
- Strong: "Cut the product-list API from 47 SQL queries to 3 (~780 ms → ~110 ms) using select_related and
  prefetch_related, found with django-debug-toolbar."
- Strong: "Built a FastAPI RAG assistant over 850 product descriptions in Chroma; streams answers over SSE and
  cites product ids; scored 37/45 on a fixed evaluation set."

Every number must survive "how did you measure that?" — "the query count from the debug toolbar, timings
averaged over 20 requests in Postman" is fine; "it felt faster" is not.

## What not to write

- **Skill bars and percentages** ("Python 90%") — an ATS cannot read them and a human reads them as self-graded.
- **Adjectives** — "dedicated", "fast learner", "passionate about AI". Show them in a bullet or drop them.
- **Skills you cannot defend** — "Machine Learning, Deep Learning, TensorFlow, AWS, Kubernetes, Microservices"
  copied from a JD. Calling an LLM API is not machine learning; do not let the resume claim it is.
- **Notebook projects passed off as full stack** — a Titanic Kaggle notebook is not a Python developer project.
  One deployed capstone with an API, a UI and an AI service is worth more than five notebooks.
- **Two-column, icon-heavy Canva templates** — many ATS parsers read across columns and scramble the text.
  Single column, standard headings, PDF exported from Word/Google Docs, named
  \`Firstname_Lastname_Python_FullStack.pdf\`.

## Matching a job description (10 minutes per application)

1. Copy the JD; highlight every technology and verb ("Django", "REST APIs", "ORM", "unit testing", "GenAI").
2. For each highlighted word you genuinely have, make sure the **same word** appears in your skills or a bullet
   ("ORM" → "Django ORM"; "unit testing" → "pytest").
3. Reorder: the bullet that answers the JD's first requirement goes first under its project.
4. A word you do not have stays off — write it on your interview-prep list instead.
Keep one master resume and three copies: service/mass-recruiter (Python, SQL, academics first), product
(Django/DRF depth, tests, performance), AI-leaning startup (FastAPI, RAG, the agent, evaluation).

## The GitHub that backs every claim

Interviewers open the GitHub link — often during the call, sharing their screen.

- **Profile README** — two lines on who you are, the stack, links to the three projects and the live demo.
- **Pinned repos** — exactly the resume projects, capstone first. Unpin forks and lab assignments.
- **The capstone README** — one-line description, live URL, a screenshot or GIF of the streaming chat, an
  architecture diagram (React → nginx → Django/DRF → MySQL, and React → FastAPI AI service → vector store/LLM),
  "Run locally" (\`cp .env.example .env && docker compose up\`), the API list or the DRF browsable API /
  FastAPI \`/docs\` link, how to run the tests (\`pytest\`), the evaluation score, and "Known limits".
- **Commit history** — many small commits over weeks with real messages ("prefetch order lines on
  /api/orders/"), not one 12,000-line upload. A single commit looks copied.
- **No secrets** — no \`SECRET_KEY\`, DB password or \`OPENAI_API_KEY\` in \`settings.py\` or a committed \`.env\`;
  \`.env\` in \`.gitignore\`, a \`.env.example\` with placeholders. A leaked key must be **revoked**, not just deleted —
  git history keeps it.
- **Tests and requirements visible** — a \`tests/\` folder with pytest-django tests and a pinned
  \`requirements.txt\` (or \`pyproject.toml\`) back the skills line.

The rule: **every resume line points at something checkable** — a repo, a commit, a test, a live URL, a score.`,
    workedExample: `**A weak resume, rewritten.** Aditya, B.Tech IT 2026, CGPA 7.4, sends this:

    SKILLS: Python 95%  Django 85%  React 70%  Machine Learning  Deep Learning  AWS  ChatGPT
    PROJECTS
    1. E-Commerce Website (Python)
       - Developed website using Django and React.
       - Integrated ChatGPT in website.
    2. Movie Recommendation System — Jupyter notebook
    3. Calculator using Tkinter

**What a recruiter sees.** Percentages the ATS cannot parse; "Machine Learning, Deep Learning" with no ML work
anywhere; "ChatGPT" as a skill; no numbers; a Tkinter calculator taking a project slot; nothing links to proof.

**Step 1 — inventory what is true.** Aditya lists what he actually built: KartLane, a store with React 18 + Vite
+ Redux Toolkit; Django 5 + DRF with 19 endpoints, Simple JWT, CUSTOMER/ADMIN permissions; MySQL 8 through the
Django ORM; checkout in \`transaction.atomic()\` with \`select_for_update()\` on stock; 58 pytest-django tests; a
FastAPI service with a RAG assistant over 620 product descriptions (Chroma) that streams over SSE and a
LangGraph agent with five tools that fills the cart but cannot place an order; Docker Compose on a cloud VM with
HTTPS. Two smaller projects: a FastAPI + PyMySQL expense tracker with 22 tests, and a CLI log analyser.

**Step 2 — rewrite with verb + what + how + number.**

    PROJECTS
    KartLane — e-commerce store with an AI shopping assistant      github.com/aditya-k/kartlane | kartlane.in
    React 18, Django REST Framework, MySQL 8, Simple JWT, FastAPI, Chroma, LangGraph, Docker, pytest
     - Built 19 DRF endpoints with Simple JWT and object-level permissions; customers see only their own
       orders, enforced in get_queryset and covered by 58 pytest-django tests.
     - Made checkout safe under concurrency: transaction.atomic + select_for_update on stock rows; a test
       proves the second buyer of the last unit gets a clean 409.
     - Built a FastAPI RAG assistant over 620 products; streams over SSE using a 90-second token issued by
       Django; scored 37/45 on a fixed evaluation set (up from 29 after re-chunking).
     - Added a LangGraph agent with 5 tools that call Django as the user; it fills the cart but has no
       place-order tool; capped at 6 steps per message.
    Expense Tracker API — FastAPI, Pydantic, PyMySQL, MySQL 8 | 22 pytest tests, parameterised SQL throughout
    LogLens — Python CLI that summarises 1 GB nginx logs with generators in ~40 s and constant memory

    SKILLS
    Languages: Python 3, SQL, JavaScript (ES6+) | Backend: Django, Django REST Framework (DRF), FastAPI,
    Simple JWT, Pydantic | Frontend: React 18, Redux Toolkit | Database: MySQL 8 (Django ORM, PyMySQL)
    Testing: pytest, pytest-django | AI: OpenAI SDK, RAG, LangChain (loaders/splitters), LangGraph
    Tools: Git, Docker Compose, Nginx, Linux, Postman

**Step 3 — check against a JD.** The target JD (a Gurugram SaaS company) asks for "Python, Django, DRF, REST,
MySQL/PostgreSQL, unit testing, Git; GenAI exposure a plus". Every word Aditya has appears verbatim.
"PostgreSQL" stays off — he used MySQL — and he prepares to say what would change moving the ORM to Postgres.
The notebook and the calculator are gone; "Machine Learning" is gone because he did none.

**Step 4 — make GitHub agree.** Pin KartLane first; the README gets the live link, a GIF of the streaming chat,
the architecture diagram, \`docker compose up\`, \`pytest\`, the 37/45 evaluation table and "Known limits"
("assistant has no memory across sessions; images stored on the VM's disk"). He finds \`OPENAI_API_KEY\` in an
old commit of \`ai/.env\`, revokes the key, issues a new one and adds \`.env\` to \`.gitignore\`.

Result: three projects, each line a checkable claim — and a list of follow-ups Aditya has already rehearsed.`,
    mcqs: [
      mcq('Farhan\'s skills line reads "Python 95%, Djnago, Fast API, ReactJS". The recruiter\'s ATS search is "Django AND FastAPI". What goes wrong?', [
        ['Percentages push his profile above candidates with plain skill lists', false],
        ['The misspelt and split names can miss the search entirely', true],
        ['The ATS only searches the summary, so the skills line is never read', false],
        ['Recruiters do not search for frameworks when hiring freshers', false],
      ], 'An ATS matches the recruiter\'s exact terms; "Djnago" and "Fast API" may not match "Django" and "FastAPI" at all, so a qualified profile drops out of the search. The percentage is unreadable noise, not a ranking boost.'),
      mcq('Which KartLane bullet best survives a round-2 interviewer asking "how do you know?"', [
        ['Developed a robust, scalable and secure Django backend for the store', false],
        ['Worked on the DRF APIs and the AI features for an e-commerce project', false],
        ['Cut the product list from 47 queries to 3 with prefetch_related', true],
      ], 'It names the change, the tool and a measured before/after (a query count anyone can see in django-debug-toolbar). "Robust and scalable" and "worked on" give the interviewer nothing to verify or credit.'),
      mcq('Swathi\'s capstone calls the OpenAI API for a RAG assistant. Her draft skills line adds "Machine Learning, Deep Learning, NLP". What should she do?', [
        ['Keep them, because any LLM project counts as machine learning work', false],
        ['Move them into the summary where they read as broad interests', false],
        ['Remove them and list "LLM APIs, RAG" — what she can defend', true],
        ['Keep only "Deep Learning", since GPT models are neural networks', false],
      ], 'Calling a hosted model and retrieving context is application engineering, not training models. A panel that sees "Deep Learning" will ask about backpropagation or loss functions; listing exactly what she built keeps every line defensible.'),
    ],
    checkpoint: [
      ck('PORTFOLIO_EVIDENCE', 'Mohit notices his public capstone repo once committed ai/.env containing OPENAI_API_KEY=sk-proj-..., though the latest commit deleted the file. What must he do?', [
        ['Nothing more; the latest commit no longer contains the file', false],
        ['Revoke the key at the provider and issue a new one now', true],
        ['Rename the repository so search engines lose the old link', false],
        ['Add a note in the README asking people not to use the key', false],
      ], 'Git history keeps every committed file, and bots scan public repos for keys within minutes. Only revoking the key stops misuse; then load the new one from the environment and keep .env in .gitignore.'),
      ck('PLACEMENT_READINESS', 'Nandini applies to a TCS-style mass-recruiter drive and an AI startup in Bengaluru. Which difference between her two resume copies is right?', [
        ['The startup copy leads with the FastAPI RAG and agent bullets', true],
        ['The startup copy adds TensorFlow, since AI startups expect it', false],
        ['The mass-recruiter copy drops the capstone to keep things short', false],
        ['Both copies stay identical so her story never looks inconsistent', false],
      ], 'Same true facts, different order: the mass-recruiter copy leads with Python, SQL and academics; the startup copy leads with the AI service and its evaluation. Adding a framework she never used is what fails in the interview.'),
      ck('PORTFOLIO_EVIDENCE', 'Which item in the KartLane repository most directly backs the resume line "pytest, pytest-django"?', [
        ['pytest and pytest-django pinned in requirements.txt', false],
        ['A README sentence saying every endpoint is tested', false],
        ['A tests/ folder of API tests and the pytest command', true],
        ['A green "build passing" badge from another project', false],
      ], 'Evidence is the tests themselves plus a way to run them. A pinned dependency proves only that the package installs; a sentence or a borrowed badge proves nothing about this code.'),
    ],
  },

  /* ── DEFEND_CAPSTONE ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PLACE_PY_FS_DEFEND_CAPSTONE',
    notes: `Your capstone — React → Django REST Framework on MySQL → a FastAPI AI service with **RAG** and a
**LangGraph agent**, the browser streaming from FastAPI with a **short-lived token** Django issues, deployed — is
the biggest single thing in a fresher's technical round 2. Panels spend 15–25 minutes on it. Year 4's
project-defence topic covers the generic shape; here are the questions panels ask about **this** stack, each
with a strong answer, the follow-up, and the wrong answers that sink candidates. The examples use the store
("KartLane"); swap in the job portal where needed.

## 1. "Tell me about your project" — the 2-minute pitch

**Strong:** problem → users → stack → your part → one number → the AI bit → where it runs.
"KartLane is an online store for a small electronics shop that was losing orders in Instagram DMs. Customers
browse, fill a cart and track orders; the admin manages stock and order status. React 18 front end, a Django REST
Framework API on MySQL 8 with Simple JWT and per-role permissions, 58 pytest-django tests. The AI lives in a
separate FastAPI service: an assistant that answers from the catalogue with citations, streamed token by token,
and a LangGraph agent that can search and fill your cart but can't place the order. Docker Compose on a cloud
VM — here's the live link. I built the DRF API and the AI service; my teammate built most of the React screens."
**Follow-up:** "Show me." — have it open, logged in as a customer and as the admin, the chat ready.
**Wrong:** a six-minute feature tour; "we used ChatGPT to make it intelligent"; never saying what *you* did.

## 2. "Walk me through the architecture"

**Strong:** draw boxes left to right — React → nginx → Django/DRF (Gunicorn) → MySQL; React → nginx → FastAPI
(Uvicorn) → vector store (Chroma) and the LLM API. Then trace one request:
"\`POST /api/orders/\` carries the Simple JWT access token. DRF's \`JWTAuthentication\` sets \`request.user\`;
\`IsAuthenticated\` passes; the serializer validates the cart; the view opens \`transaction.atomic()\`, locks the
product rows with \`select_for_update()\`, checks stock, creates the Order and OrderLines with the price copied
in, decrements stock, returns 201."
**Follow-up:** "Where does the LLM key live?" → only in the FastAPI service's environment; never in React, never
in Django, never in Git.
**Wrong:** naming technologies without a flow; "Django handles everything".

## 3. "Why two frameworks — Django *and* FastAPI?"

**Strong:** a reason tied to the workload, plus what you rejected.
"Django gives me the ORM, migrations, admin, auth and DRF permissions — the boring, transactional part done
right. Model calls are different: slow (2–10 s), bursty, streamed, and I/O-bound. In Django each streamed answer
would hold a Gunicorn sync worker for its whole length, so ten people chatting could block checkout. FastAPI is
async — one Uvicorn worker awaits many model calls — and it deploys and scales separately, so a new prompt or
model never redeploys the store. I rejected doing everything in FastAPI because I'd rebuild auth, admin and
migrations by hand."
**Follow-up:** "Then why does Django issue the stream token?" → Django owns users, limits and permissions; FastAPI
should not have to trust or understand the main access token. Django checks the user is logged in and under
their daily limit, then signs a ~90-second token naming the user and conversation; FastAPI only verifies it.
**Wrong:** "FastAPI is faster than Django" with nothing behind it; "the tutorial used both".

## 4. "How does streaming work, and why the short-lived token?"

**Strong:** "React calls \`POST /api/ai/token/\` on Django; it returns a JWT signed with a secret Django and FastAPI
share, valid for 90 seconds. React then \`fetch\`es \`/ai/chat/stream\` with it and reads the body with a
\`ReadableStream\` reader. A FastAPI dependency verifies the token **before** the \`StreamingResponse\` starts —
expired or wrong signature is a clean 401, not a half-open stream. Events are JSON over SSE: \`token\`, then
\`done\` with the sources, or \`error\`. nginx has \`proxy_buffering off\` for that path, or the user sees nothing
until the end."
**Follow-up:** "Why not just reuse the access token?" → it lives 5–15 minutes and is accepted by every Django
endpoint; a token that only opens one stream for 90 seconds limits what a leak can do, and FastAPI never sees a
credential that could place orders.
**Wrong:** "WebSockets" (when you didn't build them); "the token is in localStorage forever".

## 5. "What was the hardest bug?"

**Strong — symptom, how you found it, cause, fix, what you do now:**
"The order history page took ~1.4 s. django-debug-toolbar showed 61 queries for 20 orders: one for orders and
then lazy loads of each order's lines and each line's product — an N+1 hidden in the serializer's nested fields. I
changed the view's queryset to \`prefetch_related('lines__product')\` and \`select_related('user')\`; it dropped to
3 queries and ~140 ms, and I added a pytest test using \`django_assert_num_queries(3)\` so it can't come back."
**Follow-up:** "select_related vs prefetch_related?" → \`select_related\` follows a ForeignKey/OneToOne with a SQL
JOIN in the same query; \`prefetch_related\` runs a second query for reverse FKs and many-to-many and joins in
Python.
**Wrong:** "No major bugs"; a CSS issue; a bug your teammate fixed.

## 6. "What breaks at 10× users?"

**Strong:** the first bottleneck with evidence, then fixes in order.
"At 10× — a few hundred people chatting at once — model calls break first: 3–6 s each and the provider's rate
limit. I'd cache answers to identical catalogue questions, keep the per-user daily limit Django already
enforces, and add a concurrency cap in FastAPI so we queue instead of hitting 429s. Next is MySQL: the product
search uses \`icontains\`, which can't use an index — I'd add a FULLTEXT index or a search service. Django and
FastAPI are stateless behind nginx, so I can add Gunicorn and Uvicorn workers or containers."
**Follow-up:** "Anything stopping a second Django container?" → product images are on the VM's disk (move to
object storage); a scheduled re-embedding job would run twice (one scheduler); the Chroma files are local to one
container.
**Wrong:** "Use Kubernetes"; "Python is slow, so rewrite it in Go".

## 7. "How do you know the AI is right?"

**Strong:** evaluation, grounding, refusal.
"I wrote 45 questions with the product ids a correct answer must cite, including ten that have no answer in the
catalogue. A pytest-style script runs them after every prompt, chunking or model change: 37/45 now, from 29 when
each chunk was a whole product page. The prompt says answer only from the retrieved products and cite ids; if
retrieval returns nothing above the similarity threshold, the service replies 'I couldn't find that in our
catalogue' **without calling the model**. After generation I drop any cited id that was not in the retrieved set.
And I log retrieved chunks per question — most wrong answers were retrieval, not the model."
**Follow-up:** "Why structured output?" → the answer comes back as a Pydantic model (\`answer\`, \`product_ids\`),
so citations are data I can check, not text I have to parse.
**Wrong:** "GPT-4 is very accurate"; "I tried it a few times and it worked".

## 8. "How did you secure the agent's tools?"

**Strong:** least privilege, the user's identity, approval, limits.
"The LangGraph agent has five tools — \`search_products\`, \`get_product\`, \`add_to_cart\`, \`remove_from_cart\`,
\`order_status\`. Every tool calls **Django's API with the user's own short-lived token**, so the same DRF
permission classes apply — it can never read another customer's orders, and the AI service never opens a MySQL
connection. There is no \`place_order\` tool; the agent ends with 'your cart is ready', and only the customer's
click places the order. The graph has a \`recursion_limit\` of 6 steps, every tool argument is validated by a
Pydantic schema, and product descriptions are treated as data — a description saying 'ignore your instructions'
can't give the model a tool it doesn't have."
**Follow-up:** "What is prompt injection?" → instructions hidden in content the model reads; the defence is what
the tools *can* do, not a sentence in the system prompt.
**Wrong:** "The system prompt tells the agent to be safe."

## 9. "What would you change?"

**Strong:** a real limitation you found and why.
"I'd move the vector store from Chroma's local files to pgvector or a managed store, so the AI service can run
two replicas. And I'd run the test suite against MySQL in CI instead of SQLite — one \`icontains\` collation
difference only showed up in production."
**Wrong:** "Nothing, it's complete"; "add more features".

**Rule for the whole defence:** never claim what you cannot show. "I haven't measured that — here's how I would"
scores better than an invented number the panel can see through.`,
    workedExample: `**Whiteboard: "What happens, end to end, when a customer types 'phone under ₹20,000 with the best
battery' into the chat?"**

Draw this as you talk:

    [React chat] --POST /api/ai/token/ (Bearer access JWT)--> [Django/DRF]
                     checks login + daily limit; signs {sub: user_id, conv: 812, exp: +90 s}
                 <-- {stream_token}
    [React chat] --POST /ai/chat/stream {question} (Bearer stream_token)--> [nginx, proxy_buffering off]
                 --> [FastAPI]
         0. Depends(verify_stream_token): bad/expired -> 401 before any streaming
         1. embed(question)                               -> embedding model
         2. chroma.query(k=5, where={"is_active": True})  -> 5 product chunks with ids
         3. if best distance > threshold: send "couldn't find it", done (no chat call)
         4. prompt = rules + 5 chunks (ids) + question; client.chat.completions.create(stream=True)
         5. yield SSE events: token, token, ... then done {sources: [ids ∩ retrieved]}
    [React] reads the body with getReader(), appends tokens; Stop button aborts the fetch

Say it in order:

1. "React first gets a 90-second stream token from Django — Django is where the user and their limits live."
2. "FastAPI verifies it in a dependency, before the \`StreamingResponse\` exists, so a bad token is a clean 401."
3. "It embeds the question and asks Chroma for the five nearest product chunks, filtered to active products in
   the query, so a discontinued phone is never retrieved."
4. "If nothing is close enough, it says so without calling the model — no cost, no invented phone."
5. "Otherwise it streams the model's tokens as SSE events and ends with a \`done\` event carrying only the cited ids
   that were actually retrieved. The UI renders those as product links."

**The follow-up chain and strong answers.**
- "Why k=5?" — "I tried 3, 5 and 8 on my 45-question set; 5 scored best, 8 added off-topic phones and tokens."
- "How did you chunk products?" — "Name, brand, price and key specs as one chunk; long descriptions split at
  about 400 tokens with overlap. Whole pages scored 29/45, these 37/45."
- "What happens when the admin changes a price?" — "A Django signal marks the product dirty; an ingestion job
  calls \`/api/internal/catalogue/changes/\` and re-embeds only changed products, so price answers aren't stale."
- "What if the user closes the tab mid-answer?" — "The fetch is aborted, FastAPI sees the disconnect and the
  generator stops, so we stop paying for tokens nobody reads."

A candidate who can draw this and survive those four follow-ups has shown the panel they built the AI service,
not pasted it.`,
    mcqs: [
      mcq('A panel asks Keerthana why the KartLane chat streams from FastAPI instead of through a Django view. Which reason is the strongest?', [
        ['Django has no way of returning a streamed HTTP response', false],
        ['A long answer would tie up a Gunicorn worker that serves checkout', true],
        ['FastAPI can call the OpenAI SDK, which Django is unable to import', false],
        ['Browsers block streamed responses that come from a Django server', false],
      ], 'Django can stream, but under sync Gunicorn workers each multi-second answer holds a worker that could be serving orders. An async FastAPI service awaits many model calls per worker and scales separately; any Python app can import the SDK.'),
      mcq('In KartLane, the FastAPI dependency that verifies the 90-second stream token runs before StreamingResponse is returned. Why does that ordering matter?', [
        ['Tokens can only be decoded inside a synchronous def function', false],
        ['Once streaming starts, the status code is already sent as 200', true],
        ['SSE events cannot carry JSON unless the token was checked first', false],
        ['Uvicorn rejects any response that does not set a cookie header', false],
      ], 'The status line is sent with the first bytes of a streamed response. Verifying first lets an expired or forged token get a clean 401; checking inside the generator would mean a 200 followed by an error event.'),
      mcq('The KartLane agent\'s add_to_cart tool takes (user_id, product_id, qty) and writes to MySQL with PyMySQL from the FastAPI service. What is the main flaw?', [
        ['PyMySQL cannot be used from an async service', false],
        ['The model controls user_id and Django\'s permissions are bypassed', true],
        ['qty should be a string so the model can pass "two"', false],
        ['LangGraph tools must return a dict, never a bool', false],
      ], 'Anything the model supplies can be steered by prompt injection, and writing to MySQL directly skips every DRF permission. Tools should call Django\'s API with the user\'s own token, so identity comes from authentication, not from the model.'),
    ],
    checkpoint: [
      ck('TECHNICAL_EXPLANATION', 'Asked for his hardest bug, which answer from Varun would a panel score highest?', [
        ['"Order history ran 61 queries; prefetch_related cut it to 3, now tested."', true],
        ['"Nothing serious came up, because we tested every feature very carefully."', false],
        ['"The React cart badge did not update until I fixed the Redux selector."', false],
        ['"Docker builds failed for a day, but my teammate sorted it out for us."', false],
      ], 'It has a symptom, how it was found (query count), the cause (N+1 through nested serializers), a measured fix and a guard against regression — all in the part Varun claims. A cosmetic fix or a teammate\'s fix gives nothing to credit.'),
      ck('TECHNICAL_EXPLANATION', 'The panel asks Ishita how she knows KartLane\'s assistant answers correctly. Which answer shows the most rigour?', [
        ['"I use one of the strongest models, so wrong answers are now very rare."', false],
        ['"My system prompt tells the model to never make up any information."', false],
        ['"45 fixed questions with expected ids, re-scored after every change."', true],
        ['"Friends tried it for a week and none of them reported a wrong answer."', false],
      ], 'A fixed evaluation set with expected citations gives a number that moves when prompts, chunking or models change. Model strength, a prompt instruction or friends\' impressions are not evidence about this system.'),
      ck('TECHNICAL_EXPLANATION', 'KartLane runs one Django container and one FastAPI container with Chroma storing vectors in local files. The panel asks what blocks a second FastAPI replica. Best answer?', [
        ['Nothing; FastAPI is async, so any number of replicas just works', false],
        ['Each replica would have its own vector files; use a shared store', true],
        ['The stream token cannot be verified by more than one process', false],
        ['Uvicorn cannot run behind nginx when there are two upstreams', false],
      ], 'Local Chroma files are state: an ingestion run updates one replica\'s copy and not the other\'s. A shared vector store (pgvector or a Chroma server) fixes it; a signed token verifies anywhere the secret is, and nginx balances upstreams fine.'),
    ],
  },

  /* ── MOCK_LOOP ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PLACE_PY_FS_MOCK_LOOP',
    notes: `One complete interview day for a **Python full-stack fresher** role (₹3.5–7 LPA at a service
company, ₹8–16 LPA at a product company or AI-leaning startup). Run it with a friend or mentor as interviewer,
in order, in one day, with real timers. Year 4's mocks rehearse each round type alone; this strings the Python
full-stack version together so you feel round 4's fatigue after rounds 1–3.

## Round 0 — Online test (90 min, proctored, camera on)

| Section | Time | What it is |
|---|---|---|
| Aptitude | 25 min, 20 q | Quant (ratios, profit & loss, time-speed-distance), logical, verbal |
| Technical MCQ | 20 min, 20 q | Python output questions, OOP, SQL, OS/DBMS/networking basics |
| Coding | 45 min, 2 problems | One easy (strings/lists), one medium (hashing, sliding window, stack, or a simple DP) |

**Sample Python output MCQ:** \`def f(x, acc=[]): acc.append(x); return acc\` then \`f(1); print(f(2))\` → \`[1, 2]\`
(the default list is created once). Know mutable defaults, \`is\` vs \`==\`, slicing, integer division, closures.
**Sample coding pair:** (1) Given a string, return the length of the longest substring without repeating
characters (sliding window + dict of last index). (2) Given daily temperatures, return how many days until a
warmer one for each day (monotonic stack).
**Scored on:** hidden test cases passed (partial credit per case), not style.
**Tactics:** read input with \`sys.stdin\` (\`data = sys.stdin.read().split()\`) — \`input()\` in a loop is slow for
10⁵ lines; watch recursion depth (default ~1000) on DFS problems; do the easy problem completely first; never
leave the second blank — a brute force passes the small cases.

## Round 1 — Technical: Python + DSA (40–45 min)

**Opening (2 min):** "Introduce yourself" — 60 seconds, ending on the capstone.
**Questions:**
1. "A list and a tuple — when would you choose a tuple, and can a tuple ever change?" — follow-up: a tuple holding
   a list; why tuples can be dict keys and lists cannot (hashability).
2. "How is a dict lookup O(1) on average?" — follow-up: what happens on a hash collision; why keys must be
   immutable; insertion order guaranteed since 3.7.
3. "Write a decorator that times a function." — follow-up: why \`functools.wraps\`; a decorator with arguments.
4. "Generator vs list comprehension for a 2 GB log file?" — follow-up: \`yield\`, lazy evaluation, memory.
5. "What is the GIL and does it matter for your Django app?" — follow-up: threads for I/O, processes for CPU,
   why Gunicorn runs several worker processes.
6. Coding on a shared editor (15 min): "Group a list of words into anagrams" (dict keyed by sorted word or a
   26-count tuple) or "merge overlapping intervals" — then "what's the complexity?" and "what if the list
   doesn't fit in memory?"
**Scored on:** correctness, thinking aloud, complexity stated unprompted, using a hint.
Strong = explains the approach before typing, walks an example, fixes own bug, writes idiomatic Python
(\`enumerate\`, \`collections.defaultdict\`, \`Counter\`). Weak = silent typing, C-style index loops everywhere,
cannot state complexity, argues with the hint.

## Round 2 — Technical: Django/DRF, React, SQL and the AI service (45–60 min)

1. "Walk me through your capstone." (10–15 min with follow-ups — see DEFEND_CAPSTONE.)
2. "What happens between a request reaching Gunicorn and your DRF view running?" — URL resolver, middleware
   (security, session, CSRF, auth), the view; DRF authentication then permission classes.
3. "Your order list is slow — how do you find out why?" — django-debug-toolbar / query logging, N+1,
   \`select_related\`/\`prefetch_related\`, \`EXPLAIN\`, indexes.
4. "Where do you validate that quantity is at least 1, and where do you check stock?" — serializer
   \`validate_quantity\` for input shape; stock inside the locked transaction, because validation happens before
   the lock and can race.
5. "You added a field to a model — what has to happen before production works?" — \`makemigrations\`, review,
   commit the migration, \`migrate\` on deploy; follow-up: a NOT NULL column on a table with rows.
6. "In React, a user clicks Stop mid-answer — how does your chat stop the stream?" — \`AbortController\`, aborting
   the fetch; cleanup in \`useEffect\` on unmount.
7. "In FastAPI, \`async def\` vs \`def\` for an endpoint that calls PyMySQL?" — a blocking driver inside \`async def\`
   blocks the event loop; plain \`def\` runs in the thread pool.
8. SQL on paper: "Customers who placed more than 3 orders in October, with their total spend" — \`JOIN\`,
   \`WHERE\` on the date range, \`GROUP BY\`, \`HAVING COUNT(*) > 3\`.
**Scored on:** depth beyond definitions, tying answers to *your* code, honesty at the edge.
Strong = "In KartLane I did X because Y." Weak = a textbook definition, then silence at the first follow-up.

## Round 3 — Managerial / techno-managerial (20–30 min)

"Tell me about a time your teammate's code broke your feature." "Your AI feature was late — what did you cut?"
"A customer reports wrong prices in the chatbot answer on a Saturday — what do you do?" "Would you join a
Python support/maintenance project for the first year?"
**Scored on:** ownership, clear thinking under constraints, realistic attitude to first-year work.
Strong = a specific STAR story with what *you* did and what changed afterwards. Weak = blame, "I'm a
perfectionist", "I have never missed a deadline".

## Round 4 — HR (15–20 min)

"Why Python and not Java?", "Why our company?", "Comfortable with a service agreement?", "Night shifts or
rotational shifts?", "Plans for an MS or MBA?", "Expected CTC?"
**Scored on:** consistency with the resume, stability, no red flags. Read the company's Python/AI work and
office locations beforehand. At a mass recruiter the package is fixed — say you're comfortable with the offered
band.

## Debrief template (fill it within an hour, one block per round)

    Round / interviewer role:
    Questions asked (verbatim, in order):
    Answered well — and what made it strong:
    Weak or blank — exact question + what a strong answer would have said:
    Follow-up where I lost the thread:
    Resume or GitHub lines that were probed — did they hold up?
    Time: did I finish the coding task? how long was my intro?
    Fix before next loop (max 3, each with a date and how I'll practise it):

Run the loop again a week later, starting from the "Fix" items. Two recorded loops beat ten mocks nobody wrote
down.`,
    mcqs: [
      mcq('In the online test\'s coding section, Pavan\'s Python solution reads 200,000 lines with input() in a loop and times out on the large hidden cases. What is the likely fix?', [
        ['Wrap the whole solution in a try/except so timeouts are skipped', false],
        ['Read all input at once with sys.stdin and split it into tokens', true],
        ['Convert the solution to a recursive one so it runs more quickly', false],
        ['Add print statements after each line to keep the judge active', false],
      ], 'Calling input() hundreds of thousands of times is slow; reading sys.stdin once and splitting is the standard fix. Recursion adds overhead and depth limits, and print statements only slow the program further.'),
      mcq('In round 1, Sanjana\'s group-anagrams solution compares every pair of words with sorted(). The interviewer hints "can you do it in one pass?" Which response scores best?', [
        ['Insisting the pairwise version is fine because the sample input is small', false],
        ['Keying a defaultdict(list) by the sorted word and re-running the example', true],
        ['Asking the interviewer to write the one-pass version so she can learn it', false],
        ['Deleting the code and switching to a completely different language', false],
      ], 'Interviewers score how a hint is used: take it, apply it to the code on screen, and re-test on an example. Arguing, handing the problem back or starting over all signal poor collaboration.'),
      mcq('Round 2 asks: "A FastAPI endpoint declared async def calls a blocking PyMySQL query. What happens under load?"', [
        ['FastAPI automatically moves the blocking call into a thread pool', false],
        ['The query blocks the event loop and stalls every other request', true],
        ['PyMySQL detects the event loop and switches itself to async mode', false],
        ['Uvicorn restarts the worker whenever a call blocks for too long', false],
      ], 'Inside async def, a blocking driver call runs on the event loop thread and freezes all concurrent requests until it returns. Declaring the endpoint with plain def makes FastAPI run it in its thread pool; an async driver is the other option.'),
      mcq('In the managerial round, Tarun is asked "Your AI feature was running late — what did you cut?" Which answer scores best?', [
        ['"Nothing; I stayed up for three nights straight and finished everything on time."', false],
        ['"My teammate was slow, so the AI feature was entirely his responsibility."', false],
        ['"I cut chat memory, shipped grounded answers first and noted it as a limit."', true],
        ['"I asked the mentor to extend the deadline until all the features were done."', false],
      ], 'Managerial rounds look for prioritisation and ownership: cutting a lower-value feature, shipping the core and recording the trade-off. Heroics, blame or pushing the deadline show none of that.'),
      mcq('Meghana\'s debrief after round 2 says "Django questions were tough." Which rewrite is most useful for the next loop?', [
        ['"Django questions were tough; I must revise all of Django again this week."', false],
        ['"Missed: stock check in serializer races; fix: check inside the row lock."', true],
        ['"The interviewer asked advanced Django topics that freshers never need."', false],
        ['"I was nervous in round 2, so next time I should try to stay much calmer."', false],
      ], 'A debrief works only when it records the exact question, what a strong answer is, and a specific fix to practise. "Revise everything", blaming the questions or noting nerves gives nothing concrete to rehearse.'),
    ],
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PLACE_PY_FS_CHECKPOINT',
    notes: `This checkpoint measures the judgement a Python full-stack hiring panel looks for, not memorised
facts: choosing what goes on the resume, making GitHub back it, defending the capstone's two-service design and
its AI under follow-up, and handling each round of the interview day.

Recall the three rules of this topic before you start:
- **Every claim is checkable** — a resume line points at a repo, a test, a live URL, a measured number or an
  evaluation score.
- **Answer with your own code** — "in KartLane I did X because Y" beats a textbook definition.
- **Honesty at the edge** — "I haven't used that; here's how I'd approach it" beats a bluff the panel can see.

Each question is a scenario. Pick what a strong candidate would actually do.`,
    checkpoint: [
      ck('PLACEMENT_READINESS', 'Rhea\'s skills line lists "Python, Django, DRF, React, MySQL, Kubernetes, AWS SageMaker". She has deployed only with Docker Compose on one VM. What should she change?', [
        ['Keep both tools, since panels rarely ask freshers about the cloud', false],
        ['Drop Kubernetes and SageMaker and list Docker Compose instead', true],
        ['Move Kubernetes and SageMaker into the summary to soften them', false],
        ['Keep them and skim the tutorials the night before each interview', false],
      ], 'Round 2 is built from the skills line, and a fresher listing Kubernetes and SageMaker invites exactly those questions. Docker Compose is what she used and can defend; moving a claim elsewhere on the page does not make it true.'),
      ck('PLACEMENT_READINESS', 'A Noida product company\'s JD asks for "Python, Django ORM, REST APIs, unit testing". Gopal\'s resume says "ORM" and "testing". What is the right edit?', [
        ['Leave it; any ATS knows that ORM and Django ORM mean the same', false],
        ['Paste the full JD in white text at the bottom of the resume page', false],
        ['Use the JD\'s words: "Django ORM" and "unit testing with pytest"', true],
        ['Rebuild the resume around the JD and remove the capstone section', false],
      ], 'Recruiters search the JD\'s exact terms, so true skills should be written in those words. Hidden keyword text is detected and looks dishonest; removing the capstone throws away the strongest evidence.'),
      ck('PORTFOLIO_EVIDENCE', 'During a video interview the panel opens Yash\'s GitHub. Which state of his profile helps him most?', [
        ['Fifteen pinned repos including lab work and forks, to show range', false],
        ['The three resume projects pinned, capstone first, with live links', true],
        ['The capstone kept private, with a note that access is on request', false],
        ['The capstone uploaded as a single zip file to keep the code safe', false],
      ], 'Pinned repos should match the resume so every claim is one click from its evidence. Forks dilute it, a private repo cannot be checked during the call, and a zip hides both the code and the commit history.'),
      ck('TECHNICAL_EXPLANATION', 'Mid-defence, the panel asks how Chroma measures similarity between embeddings. Lavanya used Chroma\'s defaults and never checked. Best response?', [
        ['Give a detailed, confident algorithm so that she does not look weak', false],
        ['Say it is an internal library detail that developers never need', false],
        ['Say she didn\'t check the default, then reason about distance metrics', true],
        ['Steer the discussion to the React screens, which she knows better', false],
      ], 'Stating what she verified and then reasoning aloud (cosine vs L2 distance on embeddings, and how she would confirm the configured metric) is what panels credit. An invented answer is easily exposed, dismissal looks incurious, and deflection is noticed.'),
      ck('TECHNICAL_EXPLANATION', 'Asked "why does Django issue a separate 90-second token instead of FastAPI accepting the normal access JWT?", which answer is strongest?', [
        ['The access JWT is too large to fit inside an HTTP header', false],
        ['A narrow, short-lived token limits a leak to one chat stream', true],
        ['FastAPI is unable to verify any token that Simple JWT signed', false],
        ['Django tokens expire at midnight, so streams would break daily', false],
      ], 'The stream token names one user and conversation and lives about 90 seconds, so a leaked one opens a single stream briefly — it cannot place orders. Django also checks limits when issuing it, keeping user policy in one place.'),
      ck('TECHNICAL_EXPLANATION', 'KartLane\'s assistant cites product #3307, which was not among the five chunks Chroma returned. How should the candidate explain it?', [
        ['As retrieval working well, since the model found a better phone', false],
        ['As a MySQL index problem, since the product should have matched', false],
        ['As a hallucination, caught by keeping only ids that were retrieved', true],
        ['As normal behaviour that raising the temperature would fix', false],
      ], 'Anything the model asserts that is not in its context is a hallucination. Intersecting cited ids with the retrieved set catches it cheaply. Higher temperature makes output more random, not more grounded.'),
      ck('TECHNICAL_EXPLANATION', 'A panellist suggests adding a place_order tool to the LangGraph agent "so it can finish the purchase". What is the best response?', [
        ['Add it; the agent already calls Django as the user, so it is safe', false],
        ['Add it, but only with a system prompt telling it to ask first', false],
        ['Keep checkout a user click; an injected prompt could buy things', true],
        ['Refuse, because LangGraph agents cannot call POST endpoints', false],
      ], 'Irreversible actions need human approval that the model cannot fake — a click, or a LangGraph interrupt the user must resume. A prompt instruction can be overridden by injected text, and LangGraph tools can call any endpoint.'),
      ck('INTERVIEW_PERFORMANCE', 'In round 1, asked to find the first non-repeated character, Kavya starts typing nested for-loops in silence. What should she have done first?', [
        ['Asked for an easier problem that she had already practised', false],
        ['Stated a Counter-based O(n) plan and checked it on an example', true],
        ['Told the interviewer she prefers to code without any questions', false],
        ['Written the shortest one-line solution she could think of', false],
      ], 'Interviewers score reasoning as much as code. Saying the plan (count with Counter, then scan in order; O(n) time) and checking an example lets them redirect early and earns credit even if the code has a slip.'),
      ck('INTERVIEW_PERFORMANCE', 'In round 2, Dinesh blanks on a React useEffect cleanup question; the interviewer moves to a SQL GROUP BY question. What does a strong candidate do?', [
        ['Apologise again for the React answer before starting the SQL one', false],
        ['Ask to return to React so he can try to win back the lost marks', false],
        ['Answer the SQL briefly so that more time is left for later topics', false],
        ['Reset and answer the SQL fully; one miss rarely decides a round', true],
      ], 'Panels score the whole round; one missed question costs far less than letting it spoil the next three. Repeated apologies and asking to revisit draw attention to the miss, and a rushed SQL answer loses those marks too.'),
      ck('INTERVIEW_PERFORMANCE', 'Across two mock loops, Siddharth answers every first Django question well but fails each follow-up ("why?", "what if?"). What should next week focus on?', [
        ['Working out the why behind each missed follow-up in his own code', true],
        ['Booking more mocks with new interviewers and changing nothing else', false],
        ['Memorising longer textbook definitions for each of the Django topics', false],
        ['Dropping Django and studying only DSA problems for the whole week', false],
      ], 'Failing follow-ups means definitions without understanding. Tracing why (e.g. why a stock check in the serializer can race) in his own code is the fix the debriefs point to; more mocks or longer definitions repeat the gap.'),
    ],
  },
];
