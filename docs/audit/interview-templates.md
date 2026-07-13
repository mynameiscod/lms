# Interview Templates
**Completion:** 88%  |  **Priority:** P2  |  **Business Impact:** High

## Purpose & Business Goal
The InterviewTemplate is the reusable blueprint for every AI Virtual / structured interview. An admin/instructor composes multi-section interviews (communication / HR / technical), each section pulling questions from the Question Bank (pre-selected or random-sampled), with per-section scoring, timing, answer modes (text/audio/video/mcq/code), proctoring rules, scheduling, attempt rules and assignment scope. It is the single artefact that drives the entire attempt + scoring pipeline and the sell-funnel "mock interview" milestones. Business goal: let a non-engineer build a realistic, gradeable interview once and reuse/assign it at scale.

## Primary Users & Roles
- **TENANT_ADMIN / INSTRUCTOR** — create, edit, publish, archive, duplicate templates (permission `manage_interview_templates`).
- **STAFF** — inherits `manage_interview_templates` per roleGuard defaults.
- **STUDENT** — indirect consumer: sees only slim published templates via `getPracticeTemplates`.

## Key Files (traced)
- `server/src/models/InterviewTemplate.ts` — full schema: sections (embedded `SectionDefinitionSchema`), scheduling, attempt rules, randomization, assignment scope, proctoring, video, lifecycle/version.
- `server/src/controllers/interviewTemplateController.ts` — `createTemplate` (L82), `getTemplates` (L94), `getTemplateById` (L113), `updateTemplate` (L124), `publishTemplate` (L135), `archiveTemplate` (L146), `duplicateTemplate` (L157), `uploadInterviewAvatar` (L786).
- `server/src/services/interviewTemplateService.ts` — `createTemplate` (L17), `getTemplates` (L38), `publishTemplate` (L94, validates ≥1 section with questions), `duplicateTemplate` (L122, resets to draft), `updateTemplate` (L81, strips protected fields).
- `server/src/routes/interviewTemplateRoutes.ts` — `/interview-module/templates*`, avatar multer upload (5MB image).
- `client/src/pages/InterviewTemplateCreate/index.tsx` (617 lines) — section builder.
- `client/src/pages/InterviewTemplateList/index.tsx` (218 lines) — list/manage.

## Dependencies & Connected Modules
- **Interview Question Bank** (`InterviewQuestionBankModel`) — sections reference `questionIds` or random-filter the bank.
- **AI Virtual Interview** (`InterviewAttempt`) — `startAttempt` snapshots template sections into an attempt.
- **Interview Assignments** (`InterviewAssignment`) — pushes a template to students.
- **Course / Batch / Chapter / Topic** — optional curriculum mapping (`courseId`, `batchId`, `chapterId`, `topicId`).
- **planMilestones.ts** (per MEMORY) — attaches a mockInterview milestone only if a *published* template exists.

## Entry / Exit Points
- Entry: `POST /interview-module/templates` and CRUD siblings; avatar upload `POST /interview-module/avatars`.
- Exit: template consumed by `startAttempt` (attempt pipeline) and by assignment push; `getPracticeTemplates` exposes published ones to students.

## Database Tables & Relationships
- `interviewtemplates` — 1 template → N embedded sections; each section → N `questionIds` (ref `InterviewQuestionBank`). Refs Tenant, User (createdBy), Course/Batch/Chapter/Topic, assigned Users/Batches/Courses.
- Indexes: `{tenantId,status}`, `{tenantId,createdBy}`, `{tenantId,interviewCategories}`, `{tenantId,assignmentScope}`, `{expiryDate,status}`.

## Events / Notifications / Emails / WhatsApp
- None fired directly on template CRUD. (Notifications happen at the assignment layer.) No email/WhatsApp on publish.

## AI Features (which model)
- None in template CRUD itself. (AI generation of questions belongs to the Question Bank module; template just references them.)

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| Multer / local disk | Section interviewer avatar image upload (5MB) | ₹0 (self-hosted VPS storage) | Stored `/uploads/interview-avatars`; not CDN-backed |

## Validation Rules & Edge Cases
- `publishTemplate` throws if no sections or a `question_bank` section has empty `questionIds` (service L94-112).
- `updateTemplate` defensively strips `tenantId`/`createdBy`/status override.
- `duplicateTemplate` clones and resets status → `draft`, bumps nothing else; strips IDs/timestamps.
- Rich schema defaults: maxAttempts 1, allowResume true, resumeWindow 30min, autoSubmitOnExpiry true.
- Edge gaps: no server-side validation that `randomQuestionCount` ≤ available bank size; no validation that section `passingThreshold` ∈ 0–100 beyond schema; `sectionNavigationMode`, `blockMultipleTabs`, `requireMicrophone` stored but enforcement lives in attempt UI (partial).

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 95 | Full CRUD + publish/archive/duplicate + strong publish validation |
| Frontend/UI | 82 | 617-line builder + list page exist; see FE agent notes (some advanced proctoring toggles may lack UI) |
| API | 95 | All template endpoints present & role-guarded |
| Database | 95 | Comprehensive schema, well-indexed, versioned |
| Automation | 60 | No auto-expire cron flips template `status` to `expired` (index exists but no job seen) |
| AI | N/A | Not applicable to this module |
| Testing | 5 | No test files found |
| **Overall** | **88** | Mature blueprint layer; gaps are automation (auto-expire) + tests |

## Gaps
- **Automation — Not Implemented:** no cron to transition `scheduled`→`active`→`expired` by dates (schema + index imply intent).
- **Validation — Not Implemented:** random count vs. bank availability; MCQ-only vs open-answer consistency check per section.
- **Reports/Dashboard widgets:** no "template usage" widget (how many attempts/pass-rate per template) surfaced on the template list.
- **Versioning:** `version` field exists but no version-history / rollback UI.
- **Audit logs — Not Implemented:** no record of who published/archived/edited.
- **Permissions:** single coarse permission `manage_interview_templates` (no create vs. publish split).
- **Mobile:** builder likely desktop-oriented (large form).

## Technical Debt / Performance / Security / Scalability
- Avatar images on local disk (not CDN) — will not survive blue/green container swaps unless a shared volume is mounted; scalability/persistence risk.
- Embedded sections keep templates small; fine at scale.
- No soft-delete distinction beyond `archived`; deleted templates route absent (only archive).

## Suggestions & AI Opportunities
- Add an "AI Template Draft" assist: given role + level, auto-propose sections + pull matching bank questions.
- Add auto-expire/auto-activate scheduler reusing the existing `interviewReminderCron` tick.
- Surface per-template analytics (attempts, avg %, pass rate) on the list.
- Move avatar storage to Bunny/CDN for durability.

## Estimated Dev Effort
- Auto-expire/activate cron + status transitions: ~1 day.
- Template usage analytics widget: ~1.5 days.
- AI template draft assistant: ~2–3 days.
- Audit log + version history UI: ~2 days.
- Tests: ~1.5 days. **Total ≈ 8–9 dev-days.**
