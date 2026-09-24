# Code Execution Visualizer — Phase 0: Current State & Implementation Plan

**Status:** Inspection complete. No code written.
**Date:** 24 September 2026
**Scope:** Repository inspection and live-system measurement, per the Phase 0 brief.

Everything below marked **[verified]** was measured or read directly from the repository or the
running production containers. Everything marked **[assumed]** needs confirming before it is
relied on. Nothing here is inferred from how systems like this usually work.

---

## 0. Executive summary

The platform already has most of the substrate this module needs: a self-hosted sandbox, an
admission-control queue with real measured tuning, Socket.io wired into the running server,
BullMQ in production, Monaco in seven pages, and a role/permission system with tenant scoping.
The architecture proposed in the brief fits the existing system without structural change.

**One finding blocks the entire design, and it is also a live production bug.**

Piston's stdout ceiling is **1024 bytes**. At 1025 bytes the process is **SIGKILLed and zero
output is returned** — not truncated, lost. This was measured, not inferred. It means:

1. A trace cannot be delivered over stdout as the sandbox is currently configured, and stdout
   is the only channel Piston offers.
2. **Any existing student program that prints more than 1 KB already fails today**, and fails
   looking like a timeout or a wrong answer rather than a platform limit.

Raising `PISTON_OUTPUT_MAX_SIZE` is therefore a prerequisite for Phase 1 and an independent
bug fix worth shipping on its own.

Second significant finding: there is **no staging environment and no CI**. A module that runs
untrusted code and touches the shared sandbox should not be developed against production.

---

## 1. System topology **[verified]**

| Item | Value |
|---|---|
| Host | 8-core AMD EPYC 9354P, 31.3 GB RAM, Ubuntu 22.04 |
| Containers | 15, across three products (LMS, CRM, VoicePilot), **no CPU or memory limits** |
| Deploy | Blue/green. `scripts/fast-deploy.sh` builds locally, ships the image over SSH, `deploy-image.sh` flips slots |
| Datastore | MongoDB **standalone** — no multi-document transactions |
| Cache/queue backend | Redis (`lms-redis`) |
| Sandbox | `lms-piston` (`ghcr.io/engineer-man/piston`) |
| Reverse proxy | nginx on the host, with `active-slot.conf` pointing at the live slot |

Relevant containers: `lms-server-blue`, `lms-piston`, `lms-redis`, plus CRM and VoicePilot
services sharing the same uncapped host.

---

## 2. Backend architecture **[verified]**

- **Express 4** + **Mongoose 7**, TypeScript, compiled to `dist/` (`npm run build` → `tsc`).
- Entry point `server/src/server.ts`; routes aggregated in `server/src/routes/index.ts`.
- **Route convention** (from `assignmentRoutes.ts`): `router.use(authMiddleware)` then
  `router.use(tenantMiddleware)` at the top, student routes declared **before** `:id` routes.
- **Config** resolves through `settingsService`: tenant override (DB) → platform value (DB) →
  `process.env`. **The database beats `.env`**, and platform values are mirrored into
  `process.env` at boot. Secrets are AES-256-CBC encrypted at rest under `ENCRYPTION_KEY`.
- **Logging** is `console.log` plus `morgan`; there is a `server/src/utils/logger.ts`.
- **No `prom-client`, no `/metrics`, no Prometheus or Datadog integration exists.**

### Queues

Two distinct mechanisms, easy to confuse:

| | `services/executionQueue.ts` | `services/aiCallQueueService.ts` |
|---|---|---|
| Kind | In-process semaphore, **not** BullMQ | **BullMQ** producer |
| Purpose | Admission control for code execution | Outbound AI calls |
| Persistence | None — dies with the process | Redis-backed |
| Worker | n/a | `workers/aiCallWorker.ts` |

`executionQueue` carries measured production tuning worth quoting, because it constrains
anything the visualizer does:

> one Java execution takes ~7 seconds and saturates a core, because every run pays for a fresh
> javac. Six concurrent runs on this 8-core box drove load from 1.2 to 7.6 and ALL SIX were
> SIGKILLed at ~32s — past Piston's 20s limit. Not one of them was a bad program.

It exposes `withExecutionSlot(fn, language)`, `poolFor(language)` (`heavy` | `light`) and
`queueStats()`, with limits from `CODE_EXEC_CONCURRENCY` and a wait cap from
`CODE_EXEC_MAX_WAIT_MS` (default 45 s).

### Real-time

**Socket.io 4.7.2 is already running** on the HTTP server (`server.ts:97`). Existing rooms:
`tenant_<id>`, `staff_<id>`, `course_<id>`, plus a `live_class:*` signalling namespace for the
classroom feature. `socket.io-client` is in the frontend. **No SSE anywhere.**

---

## 3. Frontend architecture **[verified]**

- **Create React App** (`react-scripts` 5.0.1), React 18, TypeScript 4.9.5, `react-router-dom` 6.
- **No Redux, Zustand, or React Query** — state is local plus React context (`src/contexts`).
- Structure: `src/{api,components,config,contexts,hooks,pages,styles,types,utils}`. Pages are
  registered as explicit `<Route>` entries in a single large `App.tsx`.
- **There is no `features/` directory.** The brief's `features/code-visualizer/` would be a new
  convention; `pages/CodeVisualizer/` matches what exists. Worth an explicit decision.
- Charting already present: `recharts`, `chart.js` + `react-chartjs-2`. **No D3.**
- UI kit: `react-bootstrap`, plus per-page CSS files.

### Monaco **[verified]**

`@monaco-editor/react` 4.6.0, used in **seven** pages:

```
pages/Assessment/Exam.tsx
pages/assignments/AssignmentWorkspace.tsx      (1,556 lines)
pages/CodePlayground/index.tsx                 (613 lines)
pages/HackathonExam/index.tsx
pages/LogicGym/index.tsx
pages/Passport/PracticeItem.tsx
pages/ThinkingLab/index.tsx
```

There is **no shared editor wrapper component** — each page configures Monaco itself. Decorations,
inlay hints and CodeLens are all available through `@monaco-editor/react`, but none are currently
used. Extracting a shared wrapper is desirable but is a refactor touching seven live pages, so it
should not be bundled into Phase 1.

---

## 4. Auth, roles and tenancy **[verified]**

- `middleware/auth.ts` → `authMiddleware`
- `middleware/tenantMiddleware.ts` → tenant resolution
- `middleware/roleGuard.ts` → `roleGuard([...permissions])`, driven by `PERMISSION_GROUPS`,
  `ALL_PERMISSIONS` and `ROLE_PERMISSIONS`
- `User.role` enum: `SUPER_ADMIN · TENANT_ADMIN · INSTRUCTOR · STAFF · STUDENT · GUEST`

Permissions are **data-driven**, so the visualizer adds permission keys to `PERMISSION_GROUPS`
rather than hard-coding role checks.

---

## 5. Question bank and coding problems **[verified]**

There is no single "coding problem" model. Coding content lives in several places:

| Model | Role |
|---|---|
| `Assignment.ts` | The main coding assignment. Carries `testCases[]` (`input`, `expectedOutput`, `isHidden`, `weight`), `starterCode`, `allowedLanguages`, `timeLimit`, `memoryLimit`, `comparisonMode`, `enableHints`, `maxAiHints`, `isInBank`, `bankCategory` |
| `Question.ts` | Quiz/exam question bank; has `codingLanguages`, `testCases` |
| `HackathonExam.ts` | Exam engine with drawn item sets |
| `ThinkingProblem.ts` | Logic lab bank, with an `audiences` filter |
| `CodeSnippetAssessment.ts` | Read-the-code MCQ assessment |

**Implication:** the brief's `visualization` metadata block cannot go on one model. Phase 1
should add it to `Assignment` only, and read it through a resolver so other content types can
opt in later without a second schema decision.

`Assignment` already has `enableHints` / `maxAiHints`, which the debugger's progressive hints
should extend rather than duplicate.

---

## 6. The judge **[verified]**

### `services/codeRunnerService.ts` (924 lines)

- Default export is a singleton class instance; the public surface is `execute(input)`,
  `getAvailableLanguages()`, `healthCheck()`.
- Talks to Piston at `PISTON_URL` (`http://piston:2000/api/v2`).
- **Falls back to a "smart simulation" mode** that pattern-matches common problems when
  `PISTON_URL` is unset. The visualizer must hard-refuse this path — a simulated trace would be
  fabricated runtime evidence, which violates the brief's core principle.
- Injects a `JS_PROMPT_PRELUDE` for JavaScript so `prompt()` works in Node. **This shifts line
  numbers by `JS_PROMPT_PRELUDE_LINES` (1)** and must be accounted for in any JS line mapping.
- Request shape sent to Piston:

```json
{ "language": "...", "version": "...",
  "files": [{ "name": "...", "content": "..." }],
  "stdin": "...", "run_timeout": 30000, "run_cpu_time": 30000,
  "compile_timeout": 20000, "compile_cpu_time": 20000 }
```

`files` is an **array** — Piston accepts multiple files, so an instrumentation harness can be
shipped alongside the student's source in the same request. This is the key enabler for Java.

Piston returns HTTP 429 when `PISTON_MAX_CONCURRENT_JOBS` is reached; the runner already
translates that into a "busy" result rather than an error.

### Sandbox configuration **[verified — read from the running container]**

```
PISTON_RUN_TIMEOUT       30000
PISTON_RUN_CPU_TIME      30000
PISTON_COMPILE_TIMEOUT   20000
PISTON_COMPILE_CPU_TIME  20000
PISTON_MAX_CONCURRENT_JOBS 6
```

Container hardening (from `docker-compose.yml`): `cap_add: SYS_ADMIN` (downgraded from
`privileged: true` on 2026-08-07), `apparmor=unconfined`, `tmpfs /piston/jobs:exec,size=256m`.

Installed runtimes: `gcc, go, java, mono, node, python, rust, sqlite3, typescript`.

| Language | Version |
|---|---|
| Java | **15.0.2** |
| Python | **3.10.0** |
| Node | **18.15.0** |

---

## 7. 🚨 Blocking finding: the 1 KB stdout ceiling **[verified by measurement]**

`PISTON_OUTPUT_MAX_SIZE` is **not set**, so Piston uses its default. Measured against the live
sandbox:

| Bytes written to stdout | Bytes returned | Result |
|---:|---:|---|
| 1024 | 1024 | ok |
| **1025** | **0** | **SIGKILL** |
| 1100 | 0 | SIGKILL |
| 32768 | 0 | SIGKILL |
| 1048576 | 0 | SIGKILL |

**The ceiling is exactly 1024 bytes, and crossing it destroys the entire output.** The process is
killed and `stdout` comes back empty — there is no partial result and no distinguishing error.

### Two consequences

**1. It blocks the visualizer outright.** Piston returns only `stdout`/`stderr`; it does not
return files from the job directory. stdout is therefore the *only* trace channel, and 1 KB holds
roughly eight trace events. The brief's 5,000-event budget needs on the order of 500 KB–1 MB.

**2. It is a live bug in the existing product.** Any student program printing more than 1 KB —
a loop printing 30 lines of output, a matrix dump, a verbose debug print — is SIGKILLed right
now, and the student sees "Killed" or a wrong-answer verdict rather than "your program printed
too much". Given the measured behaviour of Java under load, this has very likely been
misdiagnosed as timeouts before.

### Required action

Set `PISTON_OUTPUT_MAX_SIZE` in `docker-compose.yml` (Piston's `output_max_size`). Suggested
starting point **8 MB**, with the app enforcing its own tighter per-mode caps. **[assumed:** the
exact env var name — verify against the Piston image before relying on it, because a wrong name
fails silently by leaving the default in place.**]**

This change should ship and be verified **before** any visualizer code is written, and it
deserves its own test: a program printing 2 KB must return 2 KB.

---

## 8. Tests and CI **[verified]**

- `server/jest.config.js`, `ts-jest`, `testEnvironment: node`, roots `<rootDir>/src`.
- **113 test files** under `server/src/tests/`, including fourteen CareerPilot module suites
  written as executable specifications. The house style is pure functions tested without a
  database; that style suits trace normalisation extremely well.
- Frontend: `@testing-library/react` present; `react-scripts test`.
- **There is no `.github/workflows` directory. Nothing runs lint, typecheck or tests
  automatically.**

---

## 9. Environments **[verified]**

There is **no staging environment**. `scripts/provision-vps.sh`, `backup.sh` and `restore.sh`
exist and would stand one up quickly, but today all changes go from a developer machine to
production.

For a module that executes untrusted code and shares the sandbox with live classes and exams,
this is the single largest process risk in the plan.

---

## 10. Integration points

| Need | Reuse | Change required |
|---|---|---|
| Sandbox | Piston via `codeRunnerService` | Raise output cap; add a visualize path that refuses simulation mode |
| Concurrency | `withExecutionSlot()` | Add a third pool, or classify visualize runs as `heavy` |
| Async jobs | BullMQ, per `aiCallQueueService` pattern | New `visualizer-execution` queue + worker |
| Streaming | Socket.io, already wired | New room `visualizer_<sessionId>` |
| Trace storage | Redis | New keys with TTL |
| Editor | `@monaco-editor/react` | New wrapper for the visualizer only; do not refactor seven pages in Phase 1 |
| Auth | `authMiddleware`, `tenantMiddleware`, `roleGuard` | New permission keys |
| Config | `settingsService` | New keys, admin-editable |
| Problem metadata | `Assignment` | Additive `visualization` sub-document |
| Exam gating | `Assignment.enableHints`, exam settings | Extend, don't duplicate |

---

## 11. Proposed architecture

### Trace transport

The instrumented program writes **JSONL trace events to stdout**, each line prefixed with a
sentinel so program output and trace output can be separated deterministically:

```
##CBTRACE##{"sequence":14,"eventType":"CONDITION_EVALUATE",...}
```

Program `System.out` / `print` output is captured as `STDOUT` events by the instrumentation and
also passed through, so the console panel shows what the student expects.

The sentinel matters: a student program that prints something JSON-shaped must not be parsed as
a trace event.

### Java **[Java 15.0.2]**

The brief asks for AST instrumentation, not regex. Two viable routes:

| Option | Mechanics | Trade-off |
|---|---|---|
| **A. Instrument in Node** using a JS Java parser (`java-parser`, the Chevrotain grammar behind prettier-plugin-java) | Parse and rewrite in the API process, ship the instrumented file to Piston | No JVM needed server-side; parser fidelity for Java 15 must be validated |
| **B. Instrument inside the sandbox** with JavaParser, shipped as a second file | Uses the canonical Java tooling | Piston packages are self-contained; adding a JAR to the java package is non-trivial and couples the design to the sandbox image |

**Recommendation: A**, with a small hand-written `CBTrace` emitter class shipped as a second
entry in `files[]`. It keeps instrumentation in one language, keeps the sandbox image untouched,
and makes the instrumenter unit-testable without a JVM. The risk is parser coverage, which Phase 1
scopes to the constructs the acceptance test needs.

Original line numbers must be preserved in the emitted events — instrumentation may add
statements but must record the *student's* line, never the rewritten one.

### Python **[3.10.0]**

`sys.settrace()` gives `call` / `line` / `return` / `exception` with locals, and is shipped as a
wrapper file. It does **not** give sub-expression values, so `CONDITION_EVALUATE` with resolved
operands needs supplementary AST instrumentation (`ast` module, in-sandbox). Phase 2.

### JavaScript **[Node 18.15.0]**

Babel or Acorn AST instrumentation in the API process. **Must account for
`JS_PROMPT_PRELUDE_LINES`**, which already offsets student line numbers by 1. Phase 2.

### Event schema location

`shared/` exists as a workspace with its own `package.json` and holds `constants/roles.ts`. It is
thin but real, and is the correct home for the normalized event schema so frontend and backend
cannot drift. **[assumed:** that the shared package is actually built and consumed by both sides —
verify, because `shared/dist/index.js` looks minimal.**]**

### Data

- `VisualizationSession` (Mongo): `userId`, `tenantId`, `problemId`, `language`, `mode`, `status`,
  `startedAt`, `completedAt`, `executionTimeMs`, `memoryKb`, `eventCount`, `truncated`, `errorType`.
- Trace events: **Redis with TTL**, never Mongo. A 5,000-event trace per student per run would
  otherwise grow unboundedly on a standalone MongoDB already under memory pressure.

---

## 12. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **1 KB stdout ceiling** | **Blocking** | Raise `PISTON_OUTPUT_MAX_SIZE`; verify; add a regression test |
| Piston saturation — visualize runs are heavier than plain runs, on a box where 6 concurrent Java runs already caused mass SIGKILL | **High** | Separate, smaller concurrency pool for VISUALIZE; queue rather than reject; never let visualize starve exam Run/Submit |
| No staging | **High** | Stand up the QA box before Phase 1 merges |
| No CI | **High** | Add typecheck + lint + jest before this module lands |
| Instrumentation changes program semantics | High | Golden-trace tests; verify instrumented output equals uninstrumented output |
| Java parser coverage gaps | Medium | Constrain Phase 1 to the acceptance-test constructs; fail loudly with a clear message, never a wrong trace |
| Trace volume | Medium | Hard event cap → `TRACE_LIMIT_EXCEEDED`, partial trace still rendered |
| Simulation-mode fallback fabricating a trace | Medium | Refuse VISUALIZE when `PISTON_URL` is unset |
| Monaco duplicated an eighth time | Low | Accept for Phase 1; extract a shared wrapper in Phase 2 |
| No metrics substrate | Low | Counters behind a small interface; wire to Prometheus when it exists |

---

## 13. Proposed Phase 1 scope

**Prerequisites (ship and verify first):**
1. Raise the Piston output cap; regression test for a 2 KB print.
2. CI workflow: typecheck, lint, jest.
3. QA environment available.

**Then:**
- Normalized event schema in `shared/`, with types consumed by both sides.
- Java AST instrumenter in Node, covering: primitives, 1-D arrays, `if`/`else`, `for`, `while`,
  assignment, comparison, method call/return, `System.out`, exceptions.
- `visualizer-execution` BullMQ queue and worker, using `withExecutionSlot` with its own pool.
- `POST /api/visualizer/sessions`, `GET /api/visualizer/sessions/:id`, Socket.io room
  `visualizer_<sessionId>` emitting `execution.started|trace|stdout|error|completed`.
- `VisualizationSession` model; trace in Redis with TTL.
- Frontend `pages/CodeVisualizer/` with the component split from the brief; Monaco line
  highlighting and inline values via decorations.
- Generic fallback view — current line, variables, expressions, call stack, console, timeline.
- Compiler and runtime error panels with the index-out-of-bounds explanation from §17.
- Golden-trace tests for Bubble Sort, plus normalisation and sandbox-limit tests.

**Explicitly out of Phase 1:** Python, JavaScript, recursion, stack/queue/list/tree/graph
visualizers, reference-trace comparison, AI tutor, breakpoints, shared Monaco refactor.

---

## 14. Decisions needed before Phase 1

1. **Directory convention** — `features/code-visualizer/` (new) or `pages/CodeVisualizer/`
   (matches the existing codebase)?
2. **Java instrumentation** — Option A (parse in Node) or Option B (JavaParser in-sandbox)?
3. **Prerequisite sequencing** — do the output-cap fix, CI and QA box land before Phase 1, or in
   parallel? Recommendation: output cap first and alone, since it is also a live bug fix.
4. **Concurrency budget** — how many simultaneous VISUALIZE runs may the 8-core box accept while
   an exam is running? Recommendation: 1–2, hard-separated from the Run/Submit pool.
5. **Is the `shared/` package genuinely built and imported by both client and server today?**

---

## 15. What was inspected

Repository: `docker-compose.yml`, `server/package.json`, `client/package.json`,
`server/src/server.ts`, `routes/index.ts`, `routes/assignmentRoutes.ts`, `middleware/{auth,
roleGuard,tenantMiddleware}.ts`, `services/{codeRunnerService,executionQueue,settingsService,
aiCallQueueService}.ts`, `workers/aiCallWorker.ts`, `models/{Assignment,Question,User,
CodeSnippetAssessment,ThinkingProblem}.ts`, `server/jest.config.js`, `client/src/App.tsx`,
`pages/CodePlayground/index.tsx`, `pages/assignments/AssignmentWorkspace.tsx`, `shared/`,
`scripts/{fast-deploy,provision-vps,piston-init}.sh`, `deploy-image.sh`.

Live system: container inventory, Piston environment and installed runtimes, Java/Python/Node
versions, and the stdout-ceiling measurement in §7.

---

## 16. Follow-up: Piston least-privilege hardening

**Raised:** 24 September 2026. **Blocks:** CodeVisualizer production rollout.

`docker-compose.yml` now carries `privileged: true` for the `piston` service. This is the
configuration production has always actually run, and it was restored after a `cap_add:
SYS_ADMIN` block — written 2026-08-07, never exercised — crash-looped the container on its
first recreate seven weeks later.

**Why the narrower config failed.** Piston's entrypoint runs `cd /sys/fs/cgroup && mkdir
isolate/`. Docker mounts `/sys/fs/cgroup` **read-only** for an unprivileged container
regardless of what capabilities it is granted, so `CAP_SYS_ADMIN` alone can never satisfy it.

**Why it matters.** `privileged: true` grants effective root on the host to a container that
executes arbitrary student code, on a box that also runs the LMS, the CRM and VoicePilot with
no CPU or memory limits. The blast radius of a container escape is every product.

**What to investigate — on QA, never on production:**

1. Whether `cgroup: host` (host cgroup namespace) plus a read-write bind of `/sys/fs/cgroup`,
   with `cap_add: SYS_ADMIN`, satisfies the entrypoint without full privilege. This was the
   intended fix on 2026-09-24 and was not tested, because production was down at the time and
   it was the wrong moment to experiment.
2. Whether Piston API 3.1.1 documents a supported unprivileged mode.
3. Whether all **13** runtimes still execute correctly under any narrower configuration —
   a config that boots is not a config that works. Java in particular must be re-verified,
   since it is the heaviest and the Phase 1 target.
4. Longer term: move code execution to its own host, so a container escape reaches a machine
   that holds no student data, no CRM, and no production database.

**Acceptance for closing this item:** a configuration without `privileged: true` that boots,
passes the §7 output-ceiling regression set, and executes a Java, Python and JavaScript program
correctly — demonstrated on QA and then deployed with a verified rollback.
