/**
 * Career-track content: the Java full-stack candidate (JT_PLACE_JAVA_FS), for Java Full Stack + AI.
 *
 * Year 4 already teaches the generic resume, portfolio, project defence, HR and mock rounds
 * (T4_RESUME, T4_PORTFOLIO, T4_IV_PROJECT, T4_MOCK_*). This topic is the Java full-stack + AI
 * version of the same moment: the skills line an ATS filters a Java/Spring/React fresher on, the
 * track capstone (React + Spring Boot + MySQL + JWT + a Spring AI RAG assistant and an agent,
 * deployed) defended under follow-up, and one complete interview day for a Java full-stack fresher
 * role at a typical Indian service or product company.
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

export const TRACK_PLACE_JAVA_FS_BUNDLES: PilotBundle[] = [
  /* ── RESUME ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PLACE_JAVA_FS_RESUME',
    notes: `Year 4 taught you what a resume is for. This unit is narrower: the **Java full-stack fresher**
resume that gets through a campus or off-campus ATS for roles titled "Java Developer", "Java Full Stack
Developer", "Associate Software Engineer (Java)" or "Graduate Engineer Trainee — Java", and the GitHub that
makes every line on it checkable.

## The one-page template, in this order

1. **Header** — name, city, phone, a professional email, LinkedIn, GitHub, and the live URL of the capstone.
   No photo, date of birth, father's name or "Declaration" — Indian templates still carry them; recruiters
   at product companies read them as a sign of a copied template.
2. **Summary** (two lines, optional) — role + stack + one proof. "Java full-stack developer (Spring Boot 3,
   React 18, MySQL) who built and deployed a job portal with a RAG-based resume assistant."
3. **Skills** — grouped, plain text, no bars (see below).
4. **Projects** — the capstone first, then two more. For a fresher this is the section that is read.
5. **Experience / internships** — if any; above Projects only if it was real engineering work.
6. **Education** — B.Tech branch, college, year, CGPA (state it if ≥ 7; many service companies filter at
   6 or 60%). Class XII and X percentages in one line — mass recruiters still check them.
7. **Certifications / achievements** — only ones you can talk about (an Oracle Java SE cert, a LeetCode or
   CodeChef rating, a hackathon placing). Skip course-completion badges.

## The skills line an ATS filters on

Recruiters search the ATS with the job description's own words. Use the exact names they type:

    Languages:   Java 17, JavaScript (ES6+), SQL, HTML5, CSS3
    Backend:     Spring Boot 3, Spring Data JPA, Hibernate, Spring Security (JWT), REST APIs, JUnit 5, Mockito
    Frontend:    React 18, Redux Toolkit, Vite, Bootstrap
    Database:    MySQL 8
    AI:          Spring AI, RAG (embeddings + vector store), LLM tool calling / agents
    Tools:       Git, GitHub, Docker, Maven, Postman, Linux basics

Write "Spring Boot", not "SpringBoot"; "Hibernate/JPA", not "ORM". Put **DSA in Java** under Languages only
if you can solve a medium problem in Java live. Never list a skill you cannot defend for five minutes —
the technical round is built from this line.

## Project bullets: verb + what + how + number

Each bullet starts with a past-tense verb, names the technology, and carries a number you can explain.

- Weak: "Worked on login module using Spring."
- Strong: "Built JWT login with Spring Security 6 and BCrypt; stateless filter chain secures 23 REST endpoints
  across USER and ADMIN roles."
- Strong: "Cut the job-search API from ~900 ms to ~120 ms by adding a composite MySQL index on (city, role) and
  replacing an N+1 JPA fetch with a JOIN FETCH query."
- Strong: "Added a Spring AI RAG assistant over 1,200 job descriptions (pgvector/Chroma); answers cite the source
  posting, and a 40-question test set scores 34/40 correct."

Numbers must be ones you measured — endpoints, rows, latency before/after, test count, coverage, users in a demo.
An interviewer will ask "how did you measure 120 ms?"; "Postman timings over 20 calls" is a fine answer,
"I don't remember" is not.

## What not to write

- **Rating bars or stars** ("Java ★★★★☆") — an ATS cannot read them and a human reads them as self-graded.
- **Adjectives** — "hardworking", "quick learner", "passionate", "team player". Show them in a bullet or drop them.
- **Skills you cannot defend** — Kubernetes, Kafka, microservices, AWS "expert" after one tutorial. The round-2
  interviewer will pick exactly that line.
- **Tutorial clones as projects** — a to-do app or a copied "Netflix clone" adds nothing; one deployed capstone
  with an AI feature does.
- **Two-column, image-heavy templates** — many ATS parsers read across columns and scramble the text. Single
  column, standard headings, export to PDF from Word/Google Docs, file named \`Firstname_Lastname_Java_FullStack.pdf\`.

## Matching a job description (10 minutes per application)

1. Copy the JD; highlight every technology and verb ("Spring Boot", "microservices", "REST", "unit testing").
2. For each highlighted word you genuinely have, make sure the **same word** appears in your skills or a bullet.
3. Reorder: the bullet matching the JD's first requirement goes first under its project.
4. For a word you do not have, do **not** add it — note it as a gap to prepare for the interview.
Keep one master resume and a copy per company type (service/mass-recruiter, product, AI-leaning startup).

## The GitHub that backs every claim

A recruiter or interviewer will open the GitHub link — often during the interview.

- **Profile README** — two lines on who you are, the stack, links to the three projects and the live demo.
- **Pinned repos** — exactly the projects on the resume, capstone first. Unpin forks and coursework.
- **Each repo's README** — one-line description, live URL, a screenshot or GIF, an architecture diagram
  (React → Spring Boot → MySQL, plus the AI service), a "Run locally" block (\`docker compose up\`), the API list
  or Swagger link, and a "What I learned / known limits" section.
- **Commit history** — many small commits over weeks with real messages ("add JOIN FETCH to avoid N+1 on
  /jobs"), not one "initial commit" of 9,000 lines; that looks copied.
- **No secrets** — no \`application.properties\` with the DB password or OpenAI key; use environment variables and
  a \`.env.example\`. A leaked key in a public repo is an instant negative.
- **Tests visible** — a \`src/test\` folder with real JUnit/Mockito tests backs "JUnit 5" on the skills line.

The rule: **every resume line points at something checkable** — a repo, a commit, a test, a live URL.`,
    workedExample: `**A weak resume, rewritten.** Priya, B.Tech CSE 2026, CGPA 7.8, sends this projects section:

    PROJECTS
    1. Online Shopping Website
       - Made a shopping website using Java, Spring, React, MySQL.
       - Worked on frontend and backend.
       - Used AI chatbot.
    SKILLS: Java ★★★★★  Spring ★★★★  React ★★★  AWS  Kubernetes  Microservices  Hardworking

**What a recruiter sees.** No verbs that show ownership, no numbers, "used AI chatbot" (whose? what did it do?),
rating bars the ATS cannot read, AWS/Kubernetes/microservices she has never deployed, and an adjective in the
skills line. Nothing links to proof.

**Step 1 — inventory what is true.** Priya lists what she actually built: React 18 + Vite storefront; Spring
Boot 3 REST API with 18 endpoints; JPA entities Product, Order, OrderItem, Customer on MySQL 8; JWT login with
USER/ADMIN; a Spring AI assistant that answers "which phone under ₹20,000 has the best battery?" from the product
catalogue (RAG over 600 product descriptions); deployed with Docker Compose on a ₹500/month VPS; 31 JUnit tests.

**Step 2 — rewrite with verb + what + how + number.**

    PROJECTS
    ShopSmart — Full-stack e-commerce with an AI shopping assistant   github.com/priya-dev/shopsmart | shopsmart.live
    React 18, Spring Boot 3, Spring Data JPA, MySQL 8, Spring Security (JWT), Spring AI, Docker
     - Built 18 REST endpoints for catalogue, cart and orders; order placement runs in one @Transactional
       service so stock and order rows never disagree.
     - Secured the API with Spring Security 6 + JWT (USER/ADMIN); 31 JUnit 5/Mockito tests cover auth and orders.
     - Added a RAG shopping assistant with Spring AI over 600 product descriptions; it answers only from
       retrieved products and links each one, refusing questions outside the catalogue.
     - Deployed with Docker Compose (React/Nginx, Boot, MySQL) on a Linux VPS; README has a one-command local setup.

    SKILLS
    Languages: Java 17, JavaScript (ES6+), SQL | Backend: Spring Boot 3, Spring Data JPA, Hibernate,
    Spring Security (JWT), REST, JUnit 5 | Frontend: React 18, Redux Toolkit | Database: MySQL 8
    AI: Spring AI, RAG | Tools: Git, Docker, Maven, Postman

**Step 3 — check against a JD.** The target JD (a Pune product company) asks for "Java, Spring Boot, REST,
Hibernate, React, unit testing, Git". Every word now appears verbatim. "Microservices" is in the JD's
"good to have"; Priya does **not** add it — she prepares to answer "how would you split ShopSmart into
services?" instead.

**Step 4 — make GitHub agree.** Pin ShopSmart first; README gets the live link, a screenshot, an architecture
diagram, \`docker compose up\`, and a "Known limits" section ("assistant has no conversation memory; stock
decrement is not safe under concurrent checkout beyond one instance"). The OpenAI key moves to an
environment variable and is rotated, because it had been committed once.

Result: the same project, now one line per checkable claim — and a list of things the interviewer will ask
that Priya has already rehearsed.`,
    mcqs: [
      mcq('Rahul\'s skills line reads "Java ★★★★☆, SpringBoot ★★★★, ReactJS ★★★". A Bengaluru recruiter searches the ATS for "Spring Boot". What is the most likely problem?', [
        ['The stars rank him above other candidates who list skills as plain text', false],
        ['"SpringBoot" may not match the search term, and the stars are unreadable', true],
        ['ATS tools only read the Projects section, so the skills line is ignored', false],
        ['Recruiters filter on CGPA first, so the skills spelling never matters', false],
      ], 'Recruiters search with the JD\'s exact words. "SpringBoot" can miss a "Spring Boot" query, and rating stars are images or symbols an ATS cannot interpret — a human reads them as self-grading anyway.'),
      mcq('Which capstone bullet would hold up best when the round-2 interviewer asks "how do you know?"', [
        ['Developed a highly scalable, secure job portal using cutting-edge AI tools', false],
        ['Worked on the backend of a job portal with Spring Boot and React', false],
        ['Reduced /jobs search from ~900 ms to ~120 ms with a (city, role) index', true],
      ], 'It names the change, the technology and a measured before/after the candidate can explain (and repeat in Postman). "Highly scalable" and "worked on" give the interviewer nothing to verify and nothing to credit.'),
      mcq('A JD for a Java full-stack fresher lists "Kafka" under good-to-have. Arjun has only watched one Kafka video. What should his resume do?', [
        ['Add Kafka to the skills line so the ATS search matches the JD', false],
        ['Add Kafka under a separate "Familiar with" heading to soften the claim a bit', false],
        ['Mention Kafka in the summary instead of the skills section', false],
        ['Leave Kafka off and prepare to discuss where async messaging would fit', true],
      ], 'Anything on the resume is fair game in the technical round; one video cannot survive five minutes of questions. Leaving it off and being ready to say where a queue would help (e.g. sending order emails) is honest and still shows judgement.'),
    ],
    checkpoint: [
      ck('PORTFOLIO_EVIDENCE', 'Sneha\'s capstone repo has a single commit "initial commit" with 9,400 lines, and application.properties contains spring.ai.openai.api-key=sk-.... What should she fix first?', [
        ['Rotate the key and move it to an environment variable before anything else', true],
        ['Squash the history further so the repo looks cleaner to a recruiter', false],
        ['Make the repo private so nobody can see the code or the history', false],
        ['Add a longer README so the single commit is less noticeable', false],
      ], 'A committed secret is live risk (anyone can spend on that key) and an instant negative to a reviewer; it must be rotated, not just deleted, because git history keeps it. The one-commit history is a credibility issue to address after.'),
      ck('PLACEMENT_READINESS', 'Kiran applies to an Infosys-style mass-recruiter drive and to an AI-leaning Hyderabad startup with the same resume. What is the sensible change between the two copies?', [
        ['None — one resume for every company keeps the story consistent', false],
        ['Swap the capstone for a simpler, smaller project in the mass-recruiter copy', false],
        ['Reorder bullets so the copy for each JD leads with what it asks for', true],
        ['Add AI frameworks he has not used to the startup copy only', false],
      ], 'Same true facts, different emphasis: the mass-recruiter copy leads with Core Java, SQL and academics; the startup copy leads with the Spring AI/RAG bullet. Adding untrue skills to either is what fails in the interview.'),
      ck('PORTFOLIO_EVIDENCE', 'Which item in a capstone README most directly backs the resume claim "JUnit 5, Mockito"?', [
        ['A badge saying "tests: passing" copied from another repository', false],
        ['A sentence in the README stating that the project is fully tested', false],
        ['A screenshot of the IDE showing the JUnit 5 dependency listed in pom.xml', false],
        ['A src/test folder with service tests and the command that runs them', true],
      ], 'Evidence is the tests themselves plus a way to run them (mvn test). A copied badge, a sentence or a dependency in pom.xml proves only that the library is on the classpath, not that tests exist.'),
    ],
  },

  /* ── DEFEND_CAPSTONE ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PLACE_JAVA_FS_DEFEND_CAPSTONE',
    notes: `Your capstone — React + Spring Boot + MySQL + JWT, a Spring AI **RAG assistant** and a tool-using
**agent**, deployed — is the single biggest thing in a fresher's technical round 2. Panels spend 15–25 minutes
on it. Year 4's project-defence topic covers the generic shape; here are the questions panels ask about **this**
stack, each with a strong answer, the follow-up, and the wrong answers that sink candidates. The examples use a
job portal ("HireLoop"); swap in your e-commerce app where needed.

## 1. "Tell me about your project" — the 2-minute pitch

**Strong:** problem → users → stack → your part → one number → the AI bit → where it runs.
"HireLoop is a job portal for freshers. Candidates search and apply; recruiters post jobs and shortlist. React 18
front end, Spring Boot 3 REST API, MySQL 8 through Spring Data JPA, JWT auth with candidate and recruiter roles.
The AI part is a resume assistant: it retrieves the five most similar job postings with embeddings and asks the
LLM to suggest which to apply for, citing them; and an agent that can draft a cover letter and save it as a
draft application. It is deployed with Docker Compose on a VPS — here is the link. I built the backend and the AI
service; my teammate did most of the React screens."
**Follow-up:** "Show me." — have it open in a tab, logged in as both roles.
**Wrong:** a 6-minute feature tour; "we used AI to make it smart"; not saying what *you* did.

## 2. "Walk me through the architecture"

**Strong:** draw boxes left to right — browser (React, JWT in memory) → Nginx → Spring Boot (controller → service
→ repository) → MySQL; Spring Boot → embedding model + vector store (pgvector / Chroma) and → LLM API. Trace one
request: "\`POST /api/applications\` hits the JWT filter, the controller validates the DTO, \`ApplicationService\`
checks the job is open inside a \`@Transactional\` method, saves through \`ApplicationRepository\`, returns 201."
**Follow-up:** "Where is the JWT validated, and what happens when it expires?" → a \`OncePerRequestFilter\` before
\`UsernamePasswordAuthenticationFilter\`; expired → 401; the client redirects to login (or uses a refresh token if
you built one — say whether you did).
**Wrong:** naming technologies without the flow; "Spring handles it".

## 3. "What was the hardest bug?"

**Strong — situation, symptom, how you found it, fix, what you'd do differently:**
"Listing 20 jobs took ~2 s. I turned on \`spring.jpa.show-sql\` and saw 41 queries: one for jobs and two lazy loads
per job for company and skills — an N+1. I changed the repository method to a \`JOIN FETCH\` query for company
and used \`@EntityGraph\` for skills; it dropped to 2 queries and ~150 ms. Now I check the SQL log for every new
list endpoint."
**Follow-up:** "Why not make the relations EAGER?" → EAGER loads them everywhere, even where unused, and does not
fix N+1 for collections in queries; fetch per use case instead.
**Wrong:** "No major bugs"; a CSS alignment issue; a bug a teammate fixed.

## 4. "Why this design?" (e.g. why a monolith, why MySQL, why JWT)

**Strong:** a reason tied to the constraint, plus the alternative you rejected.
"One Spring Boot app because one developer, one deploy, and the modules (jobs, applications, AI) share the same
data. Microservices would add network calls and separate deploys for no gain at our size. MySQL because the data
is relational — applications join candidates and jobs, and I needed transactions."
**Wrong:** "Because the course used it"; "microservices are better" without a reason.

## 5. "What breaks at 10× users?"

**Strong:** name the first bottleneck with evidence, then the fix in order.
"At 10× — say 2,000 concurrent users — the LLM calls break first: each takes 2–4 s and the provider rate-limits
us. I would cache answers for identical queries, put the assistant behind a per-user rate limit, and make the
cover-letter agent async. Next is MySQL search: add indexes I can see in \`EXPLAIN\`, then read replicas. The Boot
app itself is stateless because of JWT, so I can run three instances behind Nginx."
**Follow-up:** "Anything that stops you running three instances?" → in-memory caches or scheduled jobs that
would run three times; uploaded resumes stored on local disk (move to object storage).
**Wrong:** "Use Kubernetes"; "Spring Boot scales automatically".

## 6. "How do you know the AI is right?"

**Strong:** evaluation, grounding and refusal.
"I built a test set of 40 questions with the job IDs a correct answer should cite. I run it after each prompt or
chunking change and count correct citations — 34/40 now, up from 26 when chunks were whole postings. The prompt
tells the model to answer only from the retrieved postings and to say 'I couldn't find a matching job'
otherwise; every answer links its sources so a user can check. I also log the retrieved chunks to debug wrong
answers — usually retrieval, not the LLM."
**Follow-up:** "What is a hallucination here and how would you catch one in production?" → a job ID or salary not
present in the retrieved context; check that every cited ID was in the retrieved set.
**Wrong:** "GPT is very accurate"; "I tested it manually and it worked".

## 7. "How did you secure the agent's tools?"

**Strong:** least privilege, user scoping, confirmation, limits.
"The agent has two tools: \`searchJobs\` (read-only) and \`saveDraftApplication\`. The tools call my service
layer, not the database, and take the user ID from the **SecurityContext**, never from the model's arguments —
so a prompt like 'save this for user 17' cannot act as someone else. It can only *draft*; submitting needs the
user's click. I cap it at 5 tool calls per request and validate every argument like any API input. Text inside
job postings is treated as data, so a posting saying 'ignore your instructions' cannot add tools."
**Follow-up:** "What is prompt injection?" → instructions hidden in content the model reads that try to override
yours; defend by limiting what tools can do, not by trusting the prompt.
**Wrong:** "The system prompt tells it not to do bad things."

## 8. "What would you change?"

**Strong:** a real limitation you found, and why you'd change it.
"I'd move the cover-letter agent to an async job with a status endpoint, because users wait 8 seconds today. And
I'd add Testcontainers so repository tests run on real MySQL — H2 hid a query that only failed on MySQL."
**Wrong:** "Nothing, it's complete"; "I'd add more features".

## 9. Other questions panels ask about this stack

- "Where is the JWT stored in React and why?" — memory or an httpOnly cookie, and the XSS/CSRF trade-off of each.
- "How do you handle CORS?" — \`CorsConfigurationSource\` in Spring Security allowing the front-end origin only.
- "Show me one test." — open a \`@WebMvcTest\` or service test with Mockito.
- "What happens if the LLM API is down?" — timeout, fallback message, the rest of the portal still works.

**Rule for the whole defence:** never claim what you cannot show. "I don't know, but here's how I'd find out"
scores better than an invented answer the panel can see through.`,
    workedExample: `**Whiteboard: "Walk me through what happens when a candidate asks the assistant a question."**

Draw this as you talk:

    [React chat]  --POST /api/assistant/ask {question}, Bearer JWT-->
    [JwtAuthFilter] -> [AssistantController] -> [AssistantService]
         1. embed(question)                -> embedding model
         2. vectorStore.similaritySearch(k=5, filter: status=OPEN) -> 5 job chunks
         3. prompt = system rules + 5 chunks (with job IDs) + question
         4. chatClient.prompt(...).call()  -> LLM
         5. check every cited jobId ∈ retrieved IDs; else drop the citation
    <-- 200 {answer, sources:[jobId, title, url]}

Say it in order:

1. "The request carries the JWT; the filter puts the candidate in the SecurityContext."
2. "The service embeds the question and asks the vector store for the five nearest job chunks, filtered to open
   jobs — I filter in the store so closed jobs are never retrieved."
3. "I build the prompt: rules ('answer only from these postings, cite job IDs, say you couldn't find one
   otherwise'), the chunks with their IDs, then the question. With Spring AI that's a \`ChatClient\` call."
4. "Before returning I check the cited IDs are in the retrieved set — a cheap hallucination guard."
5. "The response carries the sources so the UI shows clickable postings."

**The follow-up chain and strong answers.**
- "Why k=5?" — "I tried 3, 5 and 10 on my 40-question set; 5 gave the most correct citations, 10 added noise
  and cost."
- "How are postings chunked?" — "Title + company + skills + the first part of the description as one chunk,
  long descriptions split at ~500 tokens with overlap; whole-posting chunks retrieved worse (26/40 vs 34/40)."
- "When does the index update?" — "On job create/update the service re-embeds that posting; on close it
  updates the metadata so the filter excludes it."
- "What does a request cost?" — "One embedding call and one chat call, about 1,500 input tokens; I log token
  usage per request."

A candidate who can draw this and survive those four follow-ups has shown the panel they built the AI part,
not pasted it.`,
    mcqs: [
      mcq('In a 2-minute capstone pitch, which sentence does the most work for a panel that has not seen the project?', [
        ['"It uses many advanced technologies like AI, Docker and React."', false],
        ['"It is a very useful project that can help a lot of students."', false],
        ['"It took us around six months and many late nights to finally finish it."', false],
        ['"I built the Boot API and the RAG assistant; my teammate did the UI."', true],
      ], 'Panels need to know what you personally owned so they can question you on it. Lists of buzzwords, usefulness claims and effort stories do not tell them where to probe or what to credit.'),
      mcq('Asked "how do you know the AI is right?", Meena says "I tested it a lot and it gave good answers." What would turn this into a strong answer?', [
        ['Naming a larger model, since a bigger LLM makes fewer mistakes', false],
        ['Saying the system prompt instructs the model to always be accurate', false],
        ['A fixed question set with expected sources, re-scored after each change', true],
        ['Explaining that users can report wrong answers through an in-app feedback form', false],
      ], 'A repeatable evaluation set with expected citations gives a number that moves when prompts or chunking change. A bigger model, a prompt instruction or user reports are not evidence that the current system answers correctly.'),
      mcq('The capstone agent\'s tool is saveDraftApplication(userId, jobId, letter), and userId comes from the model\'s arguments. What is the security flaw?', [
        ['A crafted prompt can make the model act for another user', true],
        ['The tool should be marked @Transactional to be thread-safe', false],
        ['The jobId should be a String rather than a Long in the tool', false],
        ['Tool methods must be static or Spring AI cannot invoke them', false],
      ], 'Anything the model supplies can be steered by prompt injection. The acting user must come from the authenticated SecurityContext; the model may choose the job and draft the letter, never the identity.'),
    ],
    checkpoint: [
      ck('TECHNICAL_EXPLANATION', 'Asked "what was the hardest bug?", which answer would a panel score highest?', [
        ['"No serious bugs — we tested carefully, so things mostly worked."', false],
        ['"Listing 20 jobs ran 41 queries; show-sql exposed N+1; JOIN FETCH cut it to 2."', true],
        ['"The navbar overlapped the page on mobile until I fixed the CSS."', false],
        ['"Deployment failed a few times, but my teammate managed to fix it."', false],
      ], 'It has a symptom, how it was diagnosed (the SQL log), the cause, the fix and a measured result — all on the backend the candidate claims. "No bugs", a cosmetic fix or a teammate\'s fix give nothing to credit.'),
      ck('TECHNICAL_EXPLANATION', 'The panel asks "what breaks first at 10× users?" for a capstone whose assistant takes ~3 s per LLM call. Which answer shows the best judgement?', [
        ['"Spring Boot scales automatically, so nothing would really break."', false],
        ['"I would migrate the whole app to microservices on Kubernetes first."', false],
        ['"LLM latency and rate limits; cache, rate-limit and go async first."', true],
        ['"MySQL, because a relational database cannot handle that much load."', false],
      ], 'It names the bottleneck the numbers point to (slow, rate-limited external calls) and fixes it in proportion. "Scales automatically" is false, Kubernetes is a jump with no diagnosis, and MySQL handles far more than 10× a capstone.'),
      ck('TECHNICAL_EXPLANATION', 'Asked "why a monolith and not microservices?", which answer is strongest for a two-person capstone?', [
        ['"Microservices are outdated now, so a monolith is the modern choice."', false],
        ['"Our course only taught a monolith, so we built the app as one."', false],
        ['"One deploy and shared data suit our size; services add network cost."', true],
        ['"Monoliths are always faster than microservices in every single situation."', false],
      ], 'A good design answer ties the choice to the constraints (team size, deploys, shared transactional data) and names the rejected alternative\'s cost. Fashion, "the course did it" and absolute claims all show no reasoning.'),
    ],
  },

  /* ── MOCK_LOOP ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PLACE_JAVA_FS_MOCK_LOOP',
    notes: `One complete interview day for a **Java full-stack fresher** role (₹4–8 LPA at a service company,
₹8–15 LPA at a product company or funded startup). Run it with a friend or mentor as interviewer, in order, in
one day, with real timers. Year 4's mocks rehearse each round type alone; this strings the Java full-stack
version together so you feel the fatigue of round 4 after rounds 1–3.

## Round 0 — Online test (90 min, proctored, camera on)

| Section | Time | What it is |
|---|---|---|
| Aptitude | 25 min, 20 q | Quant (percentages, time & work, P&C), logical, verbal |
| Technical MCQ | 20 min, 20 q | Java output, OOP, collections, SQL, OS/DBMS basics |
| Coding | 45 min, 2 problems | One easy (string/array), one medium (hashing, two pointers, or a simple DP) |

**Sample coding pair:** (1) Given a string, return the first non-repeating character (LinkedHashMap or a 26-int
count array). (2) Given an array of meeting intervals, return the minimum rooms needed (sort + min-heap).
**Scored on:** hidden test cases passed (partial credit per case), not code style. Edge cases — empty input,
all repeating — are where marks go.
**Tactics:** do the easy problem fully first; read the input format twice (many fail on Scanner parsing); in Java
use \`BufferedReader\` for big inputs; never leave the second problem blank — a brute force passes some cases.

## Round 1 — Technical: Core Java + DSA (40–45 min)

**Opening (2 min):** "Introduce yourself" — 60 seconds, end on the capstone.
**Questions:**
1. "What happens when you put a key in a HashMap? What if two keys have the same hash?" — follow-up: treeification
   after 8 entries in a bucket (Java 8+), why \`equals\`/\`hashCode\` must agree.
2. "Why is String immutable?" — follow-up: string pool, \`==\` vs \`equals\` on \`new String("a")\`.
3. "Checked vs unchecked exceptions — which does your capstone throw from the service layer and why?"
4. "\`ArrayList\` vs \`LinkedList\` for your job listing?" — follow-up: cost of \`get(i)\` in each.
5. "Explain \`synchronized\` vs \`ConcurrentHashMap\`."
6. Coding on a shared editor (15 min): "Reverse words in a sentence in place-ish" or "check if two strings are
   anagrams" — then "what is the complexity?" and "what if the input is 1 GB?"
**Scored on:** correctness, explaining while coding, complexity stated unprompted, handling a hint.
Strong = talks through approach before typing, tests with an example, fixes own bug. Weak = silent typing,
cannot state complexity, argues with the hint.

## Round 2 — Technical: Spring Boot, JPA, React, SQL and the project (45–60 min)

1. "Walk me through your capstone's architecture." (10–15 min with follow-ups — see DEFEND_CAPSTONE.)
2. "What does \`@SpringBootApplication\` do?" — follow-up: how auto-configuration decides to create a DataSource.
3. "Your \`/jobs\` endpoint is slow — how do you find out why?" — SQL log, N+1, \`EXPLAIN\`, indexes.
4. "\`@Transactional\` on a private method — does it work?" — no, proxy-based; follow-up: self-invocation.
5. "How does your JWT filter work?" — follow-up: what if the token is stolen?
6. "In React, why does this effect run twice in development?" — StrictMode in React 18; follow-up: cleanup.
7. SQL on paper: "Top 3 companies by number of applications in the last 30 days" — \`JOIN\`, \`GROUP BY\`,
   \`ORDER BY ... LIMIT 3\`, a \`WHERE\` on date.
**Scored on:** depth beyond definitions, connecting answers to *your* code, honesty at the edge of knowledge.
Strong = "In my project I did X because Y." Weak = textbook definition, then silence at the first follow-up.

## Round 3 — Managerial / techno-managerial (20–30 min)

"Tell me about a disagreement in your capstone team." "A deadline you missed?" "If a production bug came in at
6 pm on Friday, what do you do?" "Would you work on a support project in Java 8 for the first year?"
**Scored on:** ownership, clarity, judgement under constraints, realistic attitude to service-company work.
Strong = specific story (STAR) with what *you* did and learned. Weak = blames teammates, "I never miss deadlines".

## Round 4 — HR (15–20 min)

"Why this company?", "Relocation to any city?", "Service agreement/bond?", "Higher studies plans?", "Expected CTC?"
**Scored on:** consistency with the resume, stability, no red flags. Research the company's Java/Spring work and
locations beforehand. For CTC at a mass recruiter, the package is fixed — say you're fine with the offered band.

## Debrief template (fill in within an hour, per round)

    Round:            Interviewer's top-scored moment:
    Questions asked:  (verbatim, as many as you remember)
    Answered well:    (why — what made it strong)
    Weak / blank:     (exact question + what a strong answer would have been)
    Follow-up I failed: (the second question is where most marks are lost)
    Resume lines probed: (were they defensible?)
    Fix before next mock: (max 3, each with a date)

Run the loop again a week later on the "Fix" items. Two loops with debriefs beat ten unrecorded mock rounds.`,
    mcqs: [
      mcq('In the 45-minute coding section of the online test, Vikram solves the easy problem in 10 minutes and gets stuck on the medium one. With 10 minutes left, what should he do?', [
        ['Leave the medium problem blank rather than submit a partial attempt', false],
        ['Submit a brute-force solution that passes at least the small cases', true],
        ['Spend the time restyling the easy problem\'s code for readability', false],
        ['Rewrite the easy problem with a faster algorithm for extra marks', false],
      ], 'Online tests score hidden test cases with partial credit; a brute force usually clears the small ones. Style is not scored, and a correct easy solution earns no more marks for being faster.'),
      mcq('In technical round 1 the interviewer gives a hint after Ananya\'s anagram solution fails on "Listen"/"Silent". Which response scores best?', [
        ['Explaining that the problem statement did not mention mixed case', false],
        ['Restarting the solution from scratch with a completely new approach', false],
        ['Agreeing, lower-casing both strings, and re-running the example', true],
        ['Asking the interviewer to explain how they would write the fix', false],
      ], 'Interviewers score how a candidate takes a hint: acknowledge, apply it to the existing code, and re-test. Arguing, abandoning working code or handing the problem back all signal poor collaboration.'),
      mcq('Round 2 asks "Does @Transactional on a private method in your OrderService work?" What is the accurate answer for Spring Boot 3 with default proxies?', [
        ['Yes, Spring applies it to every method regardless of visibility', false],
        ['No; proxy-based AOP does not intercept private methods', true],
        ['Yes, but only when the class is also annotated @Service', false],
        ['No; @Transactional works only on controller methods', false],
      ], 'Spring\'s default transaction support wraps the bean in a proxy that intercepts calls coming from outside the bean; a private method (and a self-invoked public one) bypasses it. Annotating the class @Service does not change that.'),
      mcq('In the managerial round, asked about a disagreement in the capstone team, which answer would be scored strongest?', [
        ['"We never disagreed; our team always got along really well."', false],
        ['"My teammate kept writing really bad code, so I rewrote all of it myself."', false],
        ['"I disagreed on storing JWT in localStorage; we compared, chose a cookie."', true],
        ['"I let the team leader decide, since it was not my responsibility."', false],
      ], 'Managerial rounds score ownership and how conflict is resolved. A concrete technical disagreement settled by comparing options shows both; "never disagreed", blaming a teammate or deferring entirely shows neither.'),
      mcq('After a mock loop, Rohit\'s debrief says only "Round 2 went badly." What is the most useful rewrite?', [
        ['"Round 2 went badly; I need to study Spring much harder next time."', false],
        ['"Failed follow-up: JWT theft; strong answer: short expiry, refresh rotation."', true],
        ['"Round 2 interviewer asked hard questions that were not in the syllabus."', false],
        ['"I felt nervous in round 2, so I should practise staying more calm."', false],
      ], 'A debrief is useful only if it records the exact question, what a strong answer is, and a fix that can be practised. "Study harder", blaming the questions or noting nerves gives nothing specific to rehearse.'),
    ],
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PLACE_JAVA_FS_CHECKPOINT',
    notes: `This checkpoint measures the judgement a Java full-stack hiring panel looks for, not memorised facts:
choosing what goes on the resume, making GitHub back it, defending the capstone's design and AI under
follow-up, and handling each round of the interview day.

Before you start, recall the three rules of this topic:
- **Every claim is checkable** — a resume line points at a repo, a test, a live URL or a measured number.
- **Answer with your own code** — "in my project I did X because Y" beats a textbook definition.
- **Honesty at the edge** — "I haven't used that; here's how I'd approach it" beats a bluff the panel can see.

Each question is a scenario. Pick what a strong candidate would actually do.`,
    checkpoint: [
      ck('PLACEMENT_READINESS', 'Divya\'s skills line lists "Java, Spring Boot, React, MySQL, AWS, Kubernetes". She has deployed only with Docker Compose on a VPS. What should she change?', [
        ['Keep both, since recruiters rarely ask about cloud tools for freshers', false],
        ['Replace AWS and Kubernetes with Docker, which she can actually defend', true],
        ['Move AWS and Kubernetes into the summary so they are less prominent', false],
        ['Keep them and watch tutorials the night before each interview', false],
      ], 'The technical round is built from the skills line, and a fresher listing Kubernetes invites exactly that question. Docker is what she used and can explain; moving the claim elsewhere on the resume does not make it defensible.'),
      ck('PLACEMENT_READINESS', 'A Chennai product company\'s JD says "Java, Spring Boot, Hibernate, REST, React, unit testing". Sai\'s resume says "ORM" and "testing" instead. What is the right edit?', [
        ['Leave it; an ATS understands that ORM and Hibernate are the same', false],
        ['Add every keyword from the JD to a hidden white-text block', false],
        ['Use the JD\'s words: "Hibernate/JPA" and "JUnit 5 unit testing"', true],
        ['Rewrite the whole resume around the JD and drop the capstone', false],
      ], 'Recruiters search the JD\'s exact terms, so true skills should use those words. Keyword stuffing in hidden text is detected and looks dishonest; dropping the capstone throws away the strongest evidence.'),
      ck('PORTFOLIO_EVIDENCE', 'An interviewer opens Harsha\'s GitHub during the call. Which state of his pinned repos helps him most?', [
        ['Twelve pinned repos including course forks, to show breadth of work', false],
        ['Only the three resume projects, capstone first, each README with a live link', true],
        ['One private repo with the capstone, plus a note asking for access', false],
        ['The capstone as a single zip file uploaded in the repo for safety', false],
      ], 'Pinned repos should match the resume exactly so every claim is one click from its evidence. Forks dilute it, a private repo cannot be checked during the call, and a zip hides the history and the code.'),
      ck('TECHNICAL_EXPLANATION', 'Mid-defence, the panel asks how Spring AI\'s vector store computes similarity. Pooja used it but never looked into this. What is the best response?', [
        ['Describe a confident, detailed algorithm so she does not appear weak', false],
        ['Say it is internal to Spring AI and not something developers need', false],
        ['Say she hasn\'t checked; she believes it is cosine similarity on embeddings', true],
        ['Change the topic to the React front end, which she knows better', false],
      ], 'Stating the limit of what you verified, then giving your best reasoned understanding, is what panels credit. An invented algorithm is easily exposed, dismissing the question looks incurious, and deflecting is noticed.'),
      ck('TECHNICAL_EXPLANATION', 'The capstone stores uploaded resumes on the Spring Boot server\'s local disk. The panel asks what stops you running three instances behind Nginx. What is the best answer?', [
        ['Nothing — the app uses JWT, so it is already fully stateless', false],
        ['Files on one instance\'s disk are missing on the others; use object storage', true],
        ['Nginx cannot balance Spring Boot apps, so a cloud balancer is needed', false],
        ['MySQL allows only one application connection, so it must be scaled out first', false],
      ], 'JWT makes authentication stateless, but local files are still state: a resume uploaded through instance A is not on B or C. Moving files to shared object storage fixes it; Nginx and MySQL handle multiple instances fine.'),
      ck('TECHNICAL_EXPLANATION', 'The RAG assistant cites job #4812, which was not among the five retrieved chunks. How should the candidate describe this to the panel?', [
        ['As a hallucination; the fix is to reject citations outside the retrieved set', true],
        ['As a retrieval success, since the model found a job the search missed', false],
        ['As a MySQL indexing bug, since the job ID should have been retrieved', false],
        ['As expected behaviour that a higher temperature setting would reduce', false],
      ], 'Anything the model asserts that is not in its context is a hallucination. Checking every cited ID against the retrieved set catches it cheaply. Higher temperature makes output more random, not more grounded.'),
      ck('INTERVIEW_PERFORMANCE', 'In technical round 1, asked to find duplicates in an array, Nikhil starts typing immediately and in silence. What should he have done first?', [
        ['Asked to switch to a problem he has already practised before', false],
        ['Written the most optimised solution possible without discussion', false],
        ['Told the interviewer that he prefers to code without being interrupted', false],
        ['Stated the approach and complexity, checked an example, then coded', true],
      ], 'Interviewers score the reasoning as much as the code. Stating the plan (a HashSet, O(n) time and space) and checking it on an example lets them redirect early and gives credit even if the code has a slip.'),
      ck('INTERVIEW_PERFORMANCE', 'In the HR round of a service company, Lakshmi is asked "Are you open to relocating to any of our centres?" She prefers Hyderabad. What is the best answer?', [
        ['"Only Hyderabad; I will not accept any other location."', false],
        ['"Yes, I\'m open; Hyderabad would be my preference if possible."', true],
        ['"I\'ll decide once I see which location the offer letter states."', false],
        ['"Anywhere at all, I have no preference about the location."', false],
      ], 'Mass recruiters assign locations by project need and screen for flexibility; stating openness with an honest preference passes that screen. A hard refusal is a red flag, and pretending to have no preference can backfire at joining.'),
      ck('INTERVIEW_PERFORMANCE', 'In round 2 the interviewer asks a React question Arun cannot answer, then moves to SQL. Arun is still rattled. What does a strong candidate do?', [
        ['Reset and answer the SQL question fully; one miss rarely decides the round', true],
        ['Apologise again for the React answer before starting the SQL question', false],
        ['Ask to go back to React so he can try to recover the lost marks', false],
        ['Answer the SQL question briefly to save time for the next question', false],
      ], 'Panels score the whole round; a missed question costs far less than letting it spoil the next three. Repeated apologies and asking to revisit draw more attention to it, and short answers lose the SQL marks too.'),
      ck('INTERVIEW_PERFORMANCE', 'After two mock loops, Ravi\'s debriefs show he fails the follow-up on every Spring question but answers the first question well. What should his next week focus on?', [
        ['For each missed follow-up, the "why" behind the answer, in his own code', true],
        ['More mocks with new interviewers, without changing his preparation', false],
        ['Memorising more Spring definitions so that the first answers get longer and fuller', false],
        ['Skipping Spring topics and focusing only on DSA for the next week', false],
      ], 'Failing follow-ups means definitions without understanding. Working through why (e.g. why @Transactional needs a proxy) against his own project is the fix the debrief points to; more mocks or longer definitions repeat the gap.'),
    ],
  },
];
