# Code Execution Engine
**Completion:** 70%  |  **Priority:** P1  |  **Business Impact:** High

## Purpose & Business Goal
Shared low-level service that compiles/runs student code and compares output against expected test-case output. It is the trust anchor for every coding feature (Assignments, Code Snippet Assessments, Code Playground, per-day practice DSA). If grading is wrong, scores and certifications lose credibility.

## Primary Users & Roles
- Consumed by services, not users directly: `submissionService`, `assessmentCodeGradingService`, playground run endpoint, `dayContentGeneratorService`.
- Indirectly every STUDENT (running/submitting code) and INSTRUCTOR (grading).

## Key Files (traced)
- `server/src/services/codeRunnerService.ts` (777 lines) — single class, exported as a singleton.
- Consumers: `server/src/services/submissionService.ts`, `assessmentCodeGradingService.ts`, `playgroundRoutes.ts`, `dayContentGeneratorService`.
- Config: `docker-compose.yml` (`piston` service), `scripts/piston-init.sh`, env `PISTON_URL`.

## Dependencies & Connected Modules
- **Piston** (self-hosted engine-server) at `PISTON_URL=http://piston:2000/api/v2`.
- Uses global `fetch` (Node 18+). No SDK.
- Language enum imported from `models/Assignment.ts` (`ProgrammingLanguage`).

## Entry / Exit Points
- `execute(input)` — main entry. Routes: HTML/CSS → `evaluateMarkup`; else Piston (`executeWithPiston`) if `useRealExecution`; else `simulateExecution`.
- `getAvailableLanguages()`, `healthCheck()` — hit Piston `/runtimes`.
- Exit: HTTP POST `${PISTON_URL}/execute`.

## Database Tables & Relationships
- **None.** Stateless service; results are persisted by callers (Submission.testCaseResults etc.).

## Events / Notifications / Emails / WhatsApp
- None. Pure compute; only `console.log` diagnostics.

## AI Features (which model, or "None")
- None.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| Piston (self-hosted) | Real multi-language code execution | ₹0 (runs in project docker-compose) | `useRealExecution` explicitly disabled if URL contains `emkc.org` (public API), so no dependency on public rate-limited endpoint |
| — Simulation fallback | Pattern-match grading when no Piston | ₹0 | NOT real execution — a correctness risk (see debt) |

## Validation Rules & Edge Cases
- **Java**: filename derived from `public class X` (else `Main.java`) — required by Piston to compile.
- **Compiled languages**: run limit forced to 15s (`run_timeout`/`run_cpu_time`) because javac cold-start ~7s; compile limits capped at 10s to match `PISTON_COMPILE_*` (else HTTP 400).
- **Compile errors**: read from dedicated compile stage OR heuristically from `run.stderr` (Java compiles in run stage) via regex (`error:|cannot find symbol|';' expected`...).
- **SIGKILL / null exit code** → "Time limit exceeded" message (infinite loop / missing stdin).
- **Output normalization**: CRLF→LF, strip trailing per-line whitespace, drop trailing blank lines, trim — forgiving but content-preserving.
- **HTML/CSS**: no DOM on server → `evaluateMarkup` checks required tags + visible text tokens are present (whitespace/case/attr/order forgiving). Empty expected → auto-pass.
- Language→Piston version map hardcoded (Java 15.0.2, Python 3.10, C/C++ 10.2, etc.); SQL→sqlite3.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 78 | Robust real-execution path with hard-won edge-case handling (Java compile, timeouts, stderr parsing, normalization). Loses points for simulation fallback and fake time/memory metrics. |
| Frontend/UI | N/A | No UI (internal service). |
| API | 70 | Clean internal contract; but no dedicated HTTP API, no per-language config surface, no batching. |
| Database | N/A | Stateless. |
| Automation | 65 | Auto-executes per test case sequentially (no parallelism/batching). |
| AI | 0 | None (correct). |
| Testing | 5 | No automated tests. |
| **Overall** | **70** | Solid where Piston is up; the simulation fallback + fabricated metrics are the main integrity gaps. |

## Gaps (mark "Not Implemented")
- **Real time/memory metrics** — `executionTime`/`memoryUsed` are `Math.random()` values, NOT actual measurements ("Not Implemented").
- **Simulation mode integrity** — pattern-matching fallback can pass/fail code incorrectly; must never grade real submissions but nothing enforces Piston presence.
- **Parallel/batched execution** — test cases run sequentially in a loop (slow for many cases / compiled langs).
- **Step-through debugging** — Not Implemented here (see Code Playground "trace" endpoint).
- **Resource sandboxing config** — memoryLimit passed by callers but not enforced in Piston request body.
- **Retry/circuit-breaker** on Piston failure — single attempt, returns error.
- **Automated tests** — Not Implemented.
- **SQL execution** — mapped to sqlite3 but multi-statement/schema-setup semantics unverified.

## Technical Debt / Performance / Security / Scalability
- Fabricated performance metrics pollute analytics and are shown to students.
- Sequential per-test execution: an assignment with 15 hidden Java cases could take >2 min (each ~9.5s CPU) — blocks the submit request. Needs batching or a job queue.
- Simulation fallback is a silent correctness/security hole for scored work — should hard-fail closed if `PISTON_URL` unset in production.
- No concurrency limit toward Piston — burst submissions could overwhelm the single container.
- Hardcoded language versions drift from installed runtimes.

## Suggestions & AI Opportunities
- Enforce "Piston required in prod" (throw if simulation would grade a scored submission).
- Return Piston's real `run.cpu_time`/wall time instead of random; expose memory if available.
- Batch test cases via Piston's ability to accept stdin per run, or a worker pool + queue (BullMQ) to parallelize and offload from the request thread.
- Add circuit-breaker + health-gated routing; surface `healthCheck()` on an admin dashboard.
- AI opportunity: Claude-based "explain this compile/runtime error" helper layered on stderr output.

## Estimated Dev Effort
- Real metrics + fail-closed simulation: ~2 dev-days.
- Queue/parallel execution: ~5 dev-days.
- Health dashboard + circuit breaker: ~2 dev-days.
- Tests: ~3 dev-days.
- **Total to ~90%: ~2–3 weeks.**
