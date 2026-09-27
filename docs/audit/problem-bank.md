# Problem Bank
**Completion:** 40%  |  **Priority:** P1  |  **Business Impact:** High

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

## Gaps (next phases)
- **Delivery (Phase 2):**
  - Assign bank problems to LMS batches.
  - CareerPilot practice reads from the bank.
  - Hackathon/battle draws from the bank.
  - Unified learner attempts collection.
- **Phase 3:**
  - External API: API keys, scopes, entitlements, rate limits, and a judge-as-a-service endpoint.
  - Interview Pilot pull.
- **Retire the old stores** once delivery reads from the bank: Thinking Lab problems, AssessmentItem live_code/sql, Assignment coding tests, LearningContentLibrary practiceQuestions, the passport built-ins, and the quiz `coding` type (whose tests are never executed).
- **Special judge:** custom checkers for problems with more than one valid answer.
- **Scale:**
  - A search engine to replace the regex title search.
  - Dedicated judge hosts. Piston is shared with students on the app VPS.
