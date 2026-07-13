# Code Playground
**Completion:** 75%  |  **Priority:** P2  |  **Business Impact:** Medium

## Purpose & Business Goal
A free-form, multi-language online IDE for students to write, run, debug, save, and push code to GitHub — outside the graded assignment flow. Positions CodeBegun as a hands-on "learn by doing" platform, drives daily engagement, and builds a student's public GitHub portfolio (a placement lever).

## Primary Users & Roles
- **STUDENT** — primary user (write/run/debug/save/GitHub push).
- Any role with `enroll_courses`/`view_courses`/`submit_assignments`/`create_courses`/`edit_courses`/`manage_own_courses`/`manage_tenant` (broad permission set on routes).

## Key Files (traced)
- Model: `server/src/models/PlaygroundProgram.ts`
- Routes: `server/src/routes/playgroundRoutes.ts`
- Controller: `server/src/controllers/playgroundController.ts`
- Execution: `server/src/services/codeRunnerService.ts` (shared — see Code Execution Engine doc)
- OAuth: `server/src/controllers/oauthController.ts`, `server/src/routes/oauthRoutes.ts`
- GitHub token store: `server/src/models/StudentProfile.ts` (`oauthConnections.github.accessToken`)
- Client: `client/src/pages/CodePlayground/index.tsx`, `CodePlayground.css`, `client/src/api/playgroundApi.ts`, `client/src/api/studentProfileAPI.ts`

## Dependencies & Connected Modules
- **Code Execution Engine** (Piston self-hosted) for run.
- **PythonTutor** (external) for step-through debugging.
- **GitHub API** (OAuth2) for push; **StudentProfile** stores tokens.
- **StackBlitz** (external iframe) for framework sandboxes (React/Angular/Vue/Node).
- **Monaco Editor** (`@monaco-editor/react`) for the editor.

## Entry / Exit Points
`/api/v1/playground` (auth + tenantResolver + broad roleGuard):
- `POST /run` — execute code → stdout/stderr.
- `POST /trace` — step-through trace via PythonTutor.
- `GET /` list, `POST /` create, `GET /:id`, `PUT /:id` (whitelist: title/language/code/stdin/kind/framework/isPublic), `DELETE /:id`.
- `POST /:id/push-github`.
OAuth: `/api/v1/oauth/github/connect|callback|disconnect`, `/oauth/status`.
Exit: Piston HTTP, `pythontutor.com` HTTP (25s timeout), GitHub REST API (via Axios).

## Database Tables & Relationships
- **playgroundprograms** — tenantId, userId, title (default 'Untitled'), language, code, stdin, `kind` (single/web/sql/framework), framework, githubRepo, githubUrl, isPublic, timestamps. Index `(tenantId, userId, updatedAt desc)`.
- **studentprofiles.oauthConnections.github** — accessToken, refreshToken, username, profileUrl, connectedAt (token store).

## Events / Notifications / Emails / WhatsApp
- None (no notifications on save/push).

## AI Features (which model, or "None")
- **None** in the playground itself. (Boilerplate generation is templated, not AI.)

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| Piston (self-hosted) | Run code | ₹0 | Shared engine |
| PythonTutor (pythontutor.com) | Step-through debug (Java/Py/JS/C/C++) | ₹0 (public endpoint) | External dependency; 25s timeout; iframe fallback on client |
| GitHub API (OAuth2) | Push code to student repos | ₹0 (user's own account) | Axios calls, not Octokit; token in StudentProfile |
| StackBlitz | Framework sandboxes | ₹0 (embedded iframe) | Ephemeral — not persisted server-side |
| Monaco Editor | Editor UI | ₹0 (npm) | — |

## Validation Rules & Edge Cases
- `run`: code non-empty; language must be runnable/mapped; HTML/CSS treated as markup (no exec).
- STDIN capped at 1000 chars (client).
- `update`: whitelisted fields only; ownership enforced via `tenantId + userId`.
- GitHub push: requires connection (400 if not); repo name slugified (lowercase, alnum+hyphen, ≤80); creates repo w/ README if missing; file path URI-encoded; base64 content; updates SHA on re-push.
- Debug: only 5 languages (Java/Python/JS/C/C++); empty trace → error; client falls back to PythonTutor iframe embed.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 80 | Full CRUD, run, trace proxy, GitHub push (create/update/SHA), OAuth flow all implemented. |
| Frontend/UI | 82 | Rich Monaco IDE: tabs, language selector, run/debug/format/share/save, resizable panels, web preview, SQL results, debug panel (vars/callstack/breakpoints), status bar. |
| API | 78 | Complete surface; broad permissive roleGuard is a concern. |
| Database | 80 | Simple, indexed; no versioning. |
| Automation | 55 | Boilerplate gen; no auto-save history, no scheduled cleanup. |
| AI | 0 | None. |
| Testing | 5 | No tests. |
| **Overall** | **75** | Feature-rich and genuinely usable; gaps are versioning, collaboration, wired shortcuts, real metrics, and external-dependency fragility. |

## Gaps (mark "Not Implemented")
- **Keyboard shortcuts** (Ctrl+Enter run, Ctrl+S save) — shown in UI tip bar but NO handlers wired ("Not Implemented").
- **Watch expressions** — "+ Add watch" button has no handler.
- **Conditional breakpoints** — on/off only.
- **Code versioning / diff / history** — each save overwrites ("Not Implemented").
- **Real-time collaboration** — single-user only ("Not Implemented").
- **Framework code persistence** — StackBlitz sandboxes are ephemeral, not saved server-side.
- **Real execution metrics** — memory/time are randomized (from shared runner).
- **GitHub token refresh/expiry** — no rotation handling.
- **Piston health surfacing** — `healthCheck()` exists but never called.
- **Empty/error states** — GitHub OAuth errors lack retry UX.
- **Debugging coverage** — 7/12 languages have no step-debug.
- **Audit logs / analytics** — no usage tracking; no admin visibility into playground activity.
- **Automated tests** — Not Implemented.

## Technical Debt / Performance / Security / Scalability
- **Overly broad roleGuard** — a wide permission array gates every endpoint; effectively most roles; least-privilege not applied.
- **External hard dependency on pythontutor.com** — debugging breaks if the third party is down/rate-limits; code is also sent to a third party (privacy).
- **GitHub token in StudentProfile** — plaintext accessToken storage (should be encrypted at rest).
- **No code-size limit** on `run`/save (DoS vector).
- Framework projects give an inconsistent mental model (ephemeral vs saved).

## Suggestions & AI Opportunities
- Add Claude "explain error / suggest fix" and "generate starter from prompt" (AI opportunity, aligns with product Anthropic stack).
- Self-host a step-debugger or use a local tracer to remove PythonTutor dependency + privacy leak.
- Wire keyboard shortcuts + watch expressions (quick wins).
- Add versioning (snapshots) reusing the Submission.codeSnapshots pattern.
- Encrypt GitHub tokens; tighten roleGuard; add code-size caps.

## Estimated Dev Effort
- Wire shortcuts/watch/breakpoint polish: ~2 dev-days.
- Versioning + snapshots: ~3 dev-days.
- Self-hosted debugger: ~6–8 dev-days.
- AI assist (Claude): ~4 dev-days.
- Security (token encryption, roleGuard, caps): ~2 dev-days.
- **Total to ~90%: ~3–4 weeks.**
