# Project Builder
**Completion:** 63%  |  **Priority:** P3  |  **Business Impact:** Medium

## Purpose & Business Goal
AI-driven "capstone project" recommender. Given a student's target role and known skills, Claude generates 3 progressively harder end-to-end project blueprints (title, tech stack, features, DB schema, API list, screens, README, deployment steps, task checklist). Students save one, track tasks, and link a GitHub repo — building a portfolio that supports placement outcomes.

## Primary Users & Roles
- **STUDENT** — primary (get recommendations, save, track tasks, link GitHub).
- Tenant-scoped via middleware; no admin curation UI.

## Key Files (traced)
- Model: `server/src/models/ProjectPlan.ts`
- Routes: `server/src/routes/projectRoutes.ts` (mounted `/api/v1/projects`)
- Controller: `server/src/controllers/projectController.ts`
- Service: `server/src/services/projectBuilderService.ts`
- Client: `client/src/pages/ProjectBuilder/index.tsx`, `client/src/api/projectApi.ts`

## Dependencies & Connected Modules
- **AI gateway** — Anthropic (`getAnthropic`) primary, OpenAI fallback (`getOpenAI`).
- **StudentProfile** — pulls `courseInterest.interestedCourse` + `technicalBackground` skills to personalize.
- **Platform Settings** — model config (`ASSESSMENT_ROADMAP_MODEL`, `OPENAI_MODEL`).

## Entry / Exit Points
`/api/v1/projects` (auth + tenant):
- `GET /recommend?role=` — AI recommendations (ephemeral, not saved).
- `GET /` list, `POST /` create (forces status `in_progress`), `GET /:id`.
- `PATCH /:id/task` toggle task + auto-recompute status.
- `PATCH /:id` update (githubUrl + status only).
- `DELETE /:id`.
Exit: Anthropic/OpenAI API calls.

## Database Tables & Relationships
- **projectplans** — tenantId, studentId, targetRole, title, description, difficulty (Beginner/Intermediate/Advanced), techStack[], features[], dbSchema, apiList[], frontendScreens[], readme, deploymentSteps[], tasks[{title,done}], status (planned/in_progress/completed), githubUrl, timestamps. Indexes: tenantId, studentId, `(tenantId, studentId, createdAt desc)`.
- Reads StudentProfile (not a hard FK).

## Events / Notifications / Emails / WhatsApp
- **None.** No email/WhatsApp/in-app on create, task completion, or project completion.

## AI Features (which model, or "None")
- **Anthropic Claude** — model from setting `ASSESSMENT_ROADMAP_MODEL` (default **`claude-sonnet-4-6`**), temp 0.5, max_tokens up to 8000 (needs high ceiling for 3-4 full projects or JSON truncates → fallback).
- **OpenAI gpt-4o-mini** fallback if Anthropic disabled.
- On parse/empty failure → hardcoded 3-project fallback catalog (Task Manager / Blog / Chat).
- Output normalized (title ≤120, desc ≤600, techStack ≤12, apiList ≤20, etc.).

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| Anthropic Claude (Sonnet) | Generate project blueprints | ~₹250/1M input, ~₹1,250/1M output tokens (Sonnet approx) | **NOT logged to AiUsage** — cost invisible on AI-spend dashboard |
| OpenAI gpt-4o-mini | Fallback generation | ~₹12/1M in, ~₹50/1M out (approx) | Fallback only |

## Validation Rules & Edge Cases
- `create`: title required (400 else); arrays coerced; status forced `in_progress`; tasks mapped to `{title, done:false}`.
- `toggleTask`: index bounds + boolean `done`; auto status: 0 done→planned, all done→completed, else in_progress.
- `update`: only githubUrl (trimmed, **no URL format validation**) + status enum.
- Tenant isolation via `tenantId + studentId` on every query.
- Edge: truncated AI JSON → silent fallback; concurrent task toggles = last-write-wins (no locking); deleting project with open modal → stale UI.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 80 | Clean CRUD + AI service + robust fallback + normalization. Missing AiUsage cost logging. |
| Frontend/UI | 82 | 7-tab detail modal, recommendation cards, progress bars, task checklist, README copy. |
| API | 78 | 7 endpoints, tenant-scoped. update limited to 2 fields by design. |
| Database | 78 | Well-indexed, simple. No versioning/audit. |
| Automation | 55 | Task→status auto-recompute; nothing else automated. |
| AI | 70 | Real Claude generation + fallback, but no cost tracking, no regenerate, no per-project chat/help. |
| Testing | 5 | No tests. |
| **Overall** | **63** | Core feature works well; missing observability, notifications, GitHub validation, cert/portfolio integration. |

## Gaps (mark "Not Implemented")
- **AI cost tracking** — recommend calls do NOT write AiUsage ("Not Implemented"); other modules do.
- **Notifications** — none (create/complete) ("Not Implemented").
- **GitHub integration** — URL is a free string; no validation, no OAuth/commit-history/portfolio sync ("Not Implemented").
- **Certificate integration** — completed projects don't issue a certificate.
- **Regenerate recommendations** — one-off; no refresh on role change.
- **Admin curation** — no admin project catalog/templates.
- **Collaboration / team projects** — Not Implemented.
- **Sub-tasks / burndown** — tasks are binary only.
- **Error UX** — client try-catch silently swallows failures (no toast/retry).
- **Analytics** — no data on popular/completed projects.
- **Accessibility** — inline styles, divs-as-buttons, no ARIA.
- **Automated tests** — Not Implemented.

## Technical Debt / Performance / Security / Scalability
- Missing AiUsage logging = unbounded, invisible Claude spend.
- Silent error handling hides AI/API failures from users and logs.
- High token ceiling (8000) per recommend call is costly; fallback path masks failures.
- No rate-limiting on `/recommend` — a student could spam expensive AI calls.
- githubUrl unvalidated (stored-XSS/phishing vector if surfaced elsewhere).

## Suggestions & AI Opportunities
- Log every recommend call to AiUsage (cost governance).
- Add rate-limit + caching of recommendations per role.
- AI "project mentor" chat per project (Claude) — answer questions, review commits.
- GitHub OAuth (reuse playground's flow) to auto-verify repo + pull commit progress.
- Issue certificate on completion (cert system already supports token types).
- Add error toasts + retry; validate githubUrl.

## Estimated Dev Effort
- AiUsage logging + rate-limit + caching: ~2 dev-days.
- Notifications + cert integration: ~2 dev-days.
- GitHub OAuth verify + progress sync: ~4 dev-days.
- AI project-mentor chat: ~4 dev-days.
- Error UX + validation + tests: ~3 dev-days.
- **Total to ~90%: ~3 weeks.**
