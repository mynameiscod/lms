# Code Visualizer
**Completion:** 45%  |  **Priority:** P1  |  **Business Impact:** High

## Purpose & Business Goal
A library of DSA problems and concept lessons where a student first UNDERSTANDS the problem (the
statement split five ways), then writes Java and watches it run line by line — variables, call stack,
output, and animated array compares/swaps — with time and space complexity shown against the real
operation count. Target: ~10,000 problems by topic and difficulty, plus animated concepts (time
complexity, space complexity, memory). Used by students and by instructors in class.

## Primary Users & Roles
- **STUDENT (LMS) and CareerPilot members** — only when assigned (default: no access).
- **SUPER_ADMIN / TENANT_ADMIN / INSTRUCTOR / STAFF** — always; author content, grant access, demo in class.

## Key Files (traced)
- Models: `server/src/models/VisualizerItem.ts` (kind problem|concept), `server/src/models/VisualizerAccess.ts`
- Routes/controller: `server/src/routes/visualizerRoutes.ts`, `server/src/controllers/visualizerController.ts`
- Pipeline: `server/src/services/visualizer/{visualizerService,javaInstrumenter,cbTraceHarness,visualizerSeed}.ts`
- Schema (CI-synced copies): `server/src/types/executionEvents.ts`, `client/src/types/executionEvents.ts`
- Client: `client/src/pages/CodeVisualizer/*` (library, Workspace, TracePlayer, ArrayView, ProblemBreakdown,
  traceModel, concepts/*), `client/src/pages/CodeVisualizerAdmin/index.tsx`, `client/src/api/visualizerApi.ts`

## Entry / Exit Points
`/api/v1/visualizer` (auth + tenant): `GET /access`, `GET /items`, `GET /items/:slug`, `POST /run`;
admin (`create_courses|edit_courses|manage_own_courses|manage_tenant`): items CRUD, `POST /admin/seed`,
`GET|POST|DELETE /admin/access`, `GET /admin/users`. UI: `/visualizer`, `/visualizer/:slug`,
`/admin/visualizer`, `/careerpilot/visualizer[/:slug]`. Exit: Piston via codeRunnerService (withExecutionSlot).

## Database
- **visualizeritems** — tenantId, kind, title, slug (unique per tenant), topic, difficulty, statement,
  examples, breakdown{plainEnglish,input,output,walkthrough[],steps[],edgeCases[]}, starter/solution code,
  animation, time/space complexity + note, conceptWidget, body, published.
- **visualizeraccesses** — tenantId, targetType (batch|user|all_lms|all_careerpilot), targetId, targetName.

## Exams
Hackathon Exam `runPolicy.allowVisualizer` (default **false**), set in the admin's Running-code card.
`POST /public/hackathon-exams/attempt/:token/visualize` — refused unless run + visualizer are on and the paper
is unsubmitted; spends one run from the same per-question budget and cooldown (`chargeRun`); stdin = first
visible sample, hidden cases never run.

## Validation / Safety
- Simulation mode is refused (a simulated trace would be fabricated evidence).
- Unsupported constructs are refused by name; never a partial trace.
- Tracer line numbers are correct by construction (no newlines injected).
- Runs share the exam execution cap, so visualizing cannot starve exam Run/Submit.

## Gaps
- `new int[n]`, objects, switch, try/catch, do-while, lambdas not traced — blocks most bulk DSA content.
- Java only (Python/JS planned). No AI-generated breakdowns / bulk import yet. 7 seed items.
- No usage analytics per student.

## Effort to complete
`new` arrays + 2-D ~1wk · bulk import + AI breakdown ~1wk · Python ~1–2wk.
