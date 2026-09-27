# Problem Bank
**Completion:** 80%  |  **Priority:** P1  |  **Business Impact:** High

## Purpose & Business Goal
One store of runnable coding problems, authored once and REFERENCED by every product: LMS assignments,
CareerPilot practice, hackathon/battle exams, the planned Interview Pilot and an external API for colleges.
It replaces about 10 separate problem + test-case stores that each had their own difficulty scale, test
format and scorer. Target size: 10,000 DSA problems now, up to 1M later.

## Ownership
- `scope: 'global'`: CodeBegun's library. Every institute can use it; only SUPER_ADMIN can edit it.
- `scope: 'tenant'`: private to one institute; that institute's authors edit it.
- Institutes can **duplicate** a global problem to customise it. A super admin can **promote** an institute problem to global.

## Key Files
- **Models:** `server/src/models/CodingProblem.ts`
  - `codingproblems`
  - `codingproblemtestcases`: tests are kept in a separate collection so a list over a million problems never loads inputs, and hidden tests never travel with a problem document.
  - `problembankcounters`: problem numbers, one sequence for global and one per tenant.
- **Vocabulary:** `server/src/config/problemBankTaxonomy.ts`
  - 9 judge languages: python, java, cpp, c, javascript, typescript, csharp, go, rust. SQL is its own problem kind.
  - 44 topics in 6 groups.
  - easy/medium/hard with default marks 10/20/30.
  - Normalisers that map legacy scales and aliases onto these.
- **Judge:** `server/src/services/problemJudgeService.ts`
  - Builds the program as hidden header + learner code + hidden footer, HackerRank-style stubs, so function-style problems work.
  - Runs through `codeRunner.executeBatch` (Java compiles once).
  - Verdicts: AC/WA/TLE/RE/CE/BUSY. Score is weighted by test weight × marks.
  - Hidden cases are masked for learners.
  - Expected outputs can be generated from the reference solution (Polygon-style).
- **Service:** `server/src/services/problemBankService.ts`: validation (errors vs publish blockers vs warnings), visibility, CRUD, duplicate, promote, archive-instead-of-delete once published, and a background verification queue that runs every language's solution against every test.
- **Import:** `server/src/services/problemImportService.ts`: JSON, CSV or XLSX, with a preview step before commit, templates, and verification queued automatically.
- **AI:** `server/src/services/problemAiService.ts`
  - Claude (`PROBLEM_GEN_MODEL`, default `claude-opus-5`, adaptive thinking, structured JSON output, server-side refusal fallback) writes the statement, test inputs and a solution per language.
  - Expected outputs come from actually running the first solution. Every other language's solution is then judged against those outputs; a solution that fails is dropped and that language keeps only its starter code.
  - Runs as a polled job.
- **Migration:** `server/src/services/problemMigrationService.ts`: copies ThinkingProblem, AssessmentItem (live_code/sql) and coding Assignments into the bank as tenant drafts. Idempotent through a unique `legacyRef`.
- **API:** `routes/problemBankRoutes.ts` at `/api/v1/problem-bank`.
  - Auth: `tenantResolver` (token tenant wins) + roleGuard `create_courses|edit_courses|manage_own_courses|manage_tenant`.
  - Rate limits: `problemBankAi`, `problemBankRun`.
- **UI:** `client/src/pages/ProblemBank/`, routes `/problem-bank`, `/problem-bank/new`, `/problem-bank/:id`.
  - **Library:** stats, filters (search/difficulty/topic/language/company/owner/status/verification), table, row actions.
  - **Studio:** tabs for Statement, Tests, Code & solutions, Settings and Learner preview, plus a live Test Lab that runs the unsaved draft (Run samples / Run all tests / Custom input / Verify all languages).
  - Import, AI and migration dialogs.
- **Tests:** `server/src/tests/problemBank.test.ts` (20).

## Compared with top platforms
| Capability | LeetCode | HackerRank | Codeforces Polygon | Problem Bank |
|---|---|---|---|---|
| Topic/company tags, difficulty | ✓ | ✓ | – | ✓ |
| Hidden weighted tests | – | ✓ | ✓ | ✓ |
| Head/tail stubs (function problems) | driver | ✓ | – | ✓ header/footer |
| Outputs from reference solution | – | – | ✓ | ✓ |
| Multi-language solution verification | – | – | ✓ invocation matrix | ✓ |
| Bulk import | – | ✓ | ✓ packages | ✓ JSON/CSV/XLSX |
| AI drafting with executed answers | – | – | – | ✓ |
| Custom checker / interactive | ✓ | ✓ | ✓ | ✗ (later) |
| Test generators / validators | – | – | ✓ | ✗ (later) |

## Delivery (Phase 2, 2026-09-27)
- **Problem Sets:** `models/ProblemSet.ts` (`problemsets`) is the delivery layer.
  - Contents: ordered bank problems, each with an optional marks override.
  - Audience: batch, user, all LMS students, or all CareerPilot members. These are the same targets the Code Visualizer uses.
  - Opening and due dates, whether late submissions are allowed, and status draft/published/closed.
  - Admin UI lives under `/problem-bank/sets`: list, editor with a problem picker, audience and dates, plus a progress report grid with CSV export and per-learner code review.
- **One attempt log:** `models/ProblemSubmission.ts` (`problemsubmissions`) records every submission from every product, with `context.product` set to lms, careerpilot, exam, practice or api.
  - Per-case results are stored without any inputs or outputs.
  - Staff previews are stored as `practice` and left out of reports.
- **Learner API:** `/api/v1/coding-practice` (`services/problemDeliveryService.ts`).
  - Access is resolved per set.
  - The problem view shows samples and starter code only.
  - Run executes the samples or custom input.
  - Submit runs all tests and is recorded. A BUSY sandbox result is not recorded.
  - A first solve awards XP, streak and coins through the existing LMS gamification and the CareerPilot XP and coin engines.
- **Learner UI:** `client/src/pages/CodingPractice/` in a LeetCode-style layout (description, submissions, editorial unlocked on solve, per-language code drafts saved locally). It serves LMS learners at `/coding-practice` and CareerPilot members at `/careerpilot/coding`.
- **Hackathon exams:** a section can set `source: 'problem_bank'`, with filters `pbDifficulties`, `topics`, `tags` and `languages`.
  - `hackathonExamDrawService.problemBankFilter` builds the query.
  - `examItemResolver.loadExamItems` loads questions from either store.
  - Run and grade go through the bank judge, so header and footer stubs apply. A BUSY result triggers a retry rather than a 0.
  - Candidates can pick any language the problem allows.
  - Existing exam-bank sections are unchanged; all 141 exam tests pass.

## External API (Phase 3, 2026-09-27)
- **Endpoint:** `/api/v1/external`, authenticated by API key (`X-API-Key: cbk_live_…`) rather than a user session (`routes/externalApiRoutes.ts`, `services/externalApiService.ts`).
- **Clients:** `models/ApiClient.ts` (`apiclients`).
  - Key: shown once at creation and stored only as a SHA-256 hash, plus a 13-character prefix for telling keys apart.
  - Scopes: `problems:read`, `judge:run`, `judge:submit`, `submissions:read`.
  - Entitlement: the whole library, a difficulty/topic filter, or specific problem sets. Optionally the institute's own published problems too.
  - Limits: per-minute requests and per-day judge calls.
  - Also: an expiry date, and status active/revoked.
- **Daily usage:** `apiusages`.
- **Endpoints:**
  - `GET /problems` (filters, `updatedSince` for syncing)
  - `GET /problems/random` (interview pick with `exclude`)
  - `GET /problems/{id}`
  - `POST /problems/{id}/run`
  - `POST /problems/{id}/submissions` (`externalUserId`, `reference`)
  - `GET /submissions`
  - `GET /submissions/{id}`
  - `GET /usage`
- **Errors:** `{error:{code,message}}` with a real HTTP status. 429 responses carry `Retry-After`.
- **Guarantees:** hidden tests, solutions and wrapper code are never returned. Submissions are recorded in `problemsubmissions` with `context.product='api'`. A client can read only its own submissions.
- **Admin UI:** Problem Bank → **API access** (institute admins only). Create, edit, rotate, revoke and delete clients (a client with submissions is revoked rather than deleted). Shows usage today and over 30 days, how many problems each client can see, and a built-in API reference with cURL, Node and Python examples, including the Interview Pilot recipe.
- **Interview Pilot** is a client of this API: `GET /problems/random` → the candidate codes → `POST /submissions` with `reference=<interviewId>`.
- **Tests:** 2 key unit tests, plus a 32-step API smoke test covering auth, isolation, no leaks, scopes, rate limits, quota, rotation and revocation.

## Gaps (next phases)
- **Delivery leftovers:**
  - Coding sets on the LMS student dashboard's upcoming deadlines.
  - Tech Battles drawing from the bank.
  - Migrating CareerPilot's built-in practice list to the bank.
- **API follow-ups:**
  - Webhooks for completed submissions.
  - An OpenAPI/Swagger file.
  - Usage-based billing reports.
- **Retire the old stores** once delivery reads from the bank: Thinking Lab problems, AssessmentItem live_code/sql, Assignment coding tests, LearningContentLibrary practiceQuestions, the passport built-ins, and the quiz `coding` type (whose tests are never executed).
- **Special judge:** custom checkers for problems with more than one valid answer.
- **Scale:**
  - A search engine to replace the regex title search.
  - Dedicated judge hosts. Piston is shared with students on the app VPS.
