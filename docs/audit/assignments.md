# Assignments
**Completion:** 82%  |  **Priority:** P1  |  **Business Impact:** High

## Purpose & Business Goal
Core coursework engine of the LMS. Lets instructors/admins create, publish, schedule, and grade assignments across six types (coding, MCQ, theory, project, SQL, file upload, web/HTML-CSS), and lets students take them in a timed workspace with auto-save, live code runs against test cases, and auto/manual grading. Drives learning accountability, batch progress tracking, and completion reporting — a direct revenue/retention lever for a coding-education product.

## Primary Users & Roles
- **TENANT_ADMIN / INSTRUCTOR / STAFF** — create/edit/publish/clone/archive assignments (`manage_assignments`), grade + allow-reattempt (`grade_submissions`), view reports.
- **STUDENT** — list published assignments, start, save code, run, submit (coding/MCQ/theory), view results.
- **SUPER_ADMIN** — implicit via tenant scoping.

## Key Files (traced)
- Model: `server/src/models/Assignment.ts` (297 lines), `server/src/models/Submission.ts` (251 lines)
- Service: `server/src/services/assignmentService.ts` (596 lines), `server/src/services/submissionService.ts` (717 lines)
- Controllers: `server/src/controllers/assignmentController.ts` (988 lines), `server/src/controllers/submissionController.ts` (434 lines)
- Routes: `server/src/routes/assignmentRoutes.ts` (71 lines)
- Execution: `server/src/services/codeRunnerService.ts` (Piston / simulation — see Code Execution Engine doc)
- AI gen: `server/src/services/aiService.ts` → `generateCodingAssignmentWithAI` (OpenAI gpt-4o-mini)
- Client (admin): `client/src/pages/assignments/AdminAssignmentForm.tsx` (2029), `AdminAssignmentList.tsx` (1044), `AdminSubmissions.tsx` (579)
- Client (student): `AssignmentWorkspace.tsx` (1155), `StudentAssignmentList.tsx` (367), `AssignmentResult.tsx` (549)
- Client (reports): `client/src/pages/AssignmentReports/` (index 458, CompletionTab, AssignmentPreviewModal)

## Dependencies & Connected Modules
- **Code Execution Engine** (`codeRunnerService`) — runs coding submissions.
- **Chapter/Course/Subject/Batch** — assignment scope; auto-links `assignmentIds` on Chapter (`create`/`update`/`delete`).
- **Curriculum / Learning Plan** — assignments referenced as day items (per project memory on learning-plan unification).
- **EmailService** — publish + reminder notifications.
- **notificationService** — in-app reminders.
- **User** — student audience resolution by role/batch/`selectedStudents`.

## Entry / Exit Points
Entry (all under `/api/v1/assignments`, auth + tenant middleware):
- Student: `GET /student/list`, `GET /student/submissions`, `POST /:assignmentId/start`, `GET /:assignmentId/my-submission`, `POST /submissions/:id/save-code`, `.../run`, `.../submit-coding`, `.../submit-mcq`, `.../submit-theory`, `GET /submissions/:id`.
- Admin CRUD: `POST /`, `GET /`, `GET/PUT/DELETE /:id`, `POST /:id/publish|archive|clone`, `GET /bank`, `GET /topics`, `GET /tags`.
- AI: `POST /generate-ai`.
- CSV: `GET /template/download`, `POST /import`.
- Reports: `GET /reports/overall|by-assignment|by-student|completion`, `GET /:id/completion`, `POST /:id/remind`.
- Grading: `GET /:assignmentId/submissions|stats`, `POST /submissions/:id/grade|allow-reattempt`.
Exit: emails via SMTP (Hostinger), in-app notifications, Piston HTTP calls.

## Database Tables & Relationships
- **assignments** — tenant, type, difficulty, points, schedule (start/due/late), scope (course/subject/chapter/batch), access control (`accessibleTo` everyone/batch_wise/individual + `selectedBatches`/`selectedStudents`), coding fields (allowedLanguages, testCases[], starterCode[], time/memory limits), MCQ fields, rubric[], file-upload settings, settings (maxAttempts, showTestCaseResults, showExpectedOutput, showSyntaxErrors, enablePlagiarismCheck, hints, camera/mic), bank fields, cached `stats`. 7 indexes.
- **submissions** — tenant→assignment→student, attemptNumber, status enum, timing, code + `codeSnapshots[]` (playback, capped 50), testCaseResults[], mcqAnswers[], rubricScores[], scoring (auto/manual/total/penalty/final/percentage/isPassing), grading, plagiarism fields, `shareToken` (LinkedIn share). Unique compound index `(tenant, assignment, student, attemptNumber)`. Pre-save computes totalScore/finalScore; virtuals `score`/`feedback`.
- Relationship: **Chapter.assignmentIds** back-reference maintained by service.

## Events / Notifications / Emails / WhatsApp
- **Email (SMTP)**: `sendAssignmentNotificationEmail` on publish (paced, `ASSIGNMENT_EMAIL_DELAY_MS` default 700ms to avoid Hostinger burst limits); on edit that widens audience (`notifyNewlyAddedStudents`); on manual reminder (`remindStudents`).
- **In-app notifications**: `createNotifications` on reminder (`/assignments` link).
- **WhatsApp**: None.

## AI Features (which model, or "None")
- **`POST /generate-ai`** → `generateCodingAssignmentWithAI` uses **OpenAI gpt-4o-mini** (`aiService.ts:291`) to generate a coding problem + test cases from title/concept/language/difficulty. Note: error path checks `OPENAI_API_KEY` — this module is NOT on Claude/Anthropic.
- No AI grading, no AI feedback on submissions, no AI plagiarism.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| OpenAI gpt-4o-mini | Generate coding assignment + test cases | ~₹0.012/1K in, ~₹0.05/1K out tokens (approx) | Only on-demand from admin "Generate with AI" |
| Piston (self-hosted) | Run coding submissions | ₹0 (self-hosted in docker-compose) | See Code Execution Engine doc; public emkc.org explicitly disabled |
| SMTP (Hostinger) | Assignment emails | Bundled in hosting | Paced sends to avoid rate limits |

## Validation Rules & Edge Cases
- Publish validation: title + dueDate required; coding needs ≥1 language & ≥1 test case; MCQ needs ≥1 question.
- `startSubmission`: blocks if not published or before startDate; returns existing in-progress/last submission; respects `maxAttempts`; handles duplicate-key (11000) race.
- `submitCoding`: atomic `findOneAndUpdate` keyed on IN_PROGRESS to avoid Mongoose VersionError from concurrent 30s auto-save + double-submit guard.
- Late handling: status→LATE past dueDate; penalty only within lateSubmissionDeadline; percentage penalty applied.
- Delete blocked if submissions exist (must archive).
- `run` uses visible test cases only; falls back to empty-input run so student sees stdout even with no visible cases.
- Hidden test cases masked on submit (input/expected/actual blanked).
- `showSyntaxErrors` gates compile-error detail.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 88 | Full CRUD, publish/clone/archive, submission lifecycle, scoring, stats, reports, reminders, CSV import all implemented and hardened (race conditions handled). |
| Frontend/UI | 85 | Rich admin form (2029 lines), workspace with editor/auto-save/run, results, reports UI. Some empty/error states thin. |
| API | 90 | Comprehensive REST surface, role-guarded, tenant-scoped. |
| Database | 90 | Well-indexed, denormalized stats, snapshots. Minor: plagiarism fields unused. |
| Automation | 75 | Auto-grade (coding/MCQ), auto-stats, paced emails, reminders. No scheduled auto-publish or auto-close. |
| AI | 40 | AI generate-assignment only (OpenAI); no AI grading/feedback/plagiarism. |
| Testing | 5 | No automated tests found for this module. |
| **Overall** | **82** | Mature, production-used feature; gaps are AI grading, plagiarism, tests, deeper analytics. |

## Gaps (mark "Not Implemented")
- **Plagiarism detection** — `enablePlagiarismCheck`, `plagiarismScore`, `plagiarismReport` fields exist but NO detection logic ("Not Implemented").
- **File-upload submission grading** — `submitTheory` handles theory text; multer/file storage path exists in schema but end-to-end file upload + storage flow not confirmed in service ("Partial/Not Implemented").
- **AI grading & feedback** — Not Implemented (only OpenAI generation).
- **SQL/WEB auto-execution** — SQL mapped to sqlite3 in runner; HTML/CSS graded by string/tag matching (not real render) — limited fidelity.
- **Automated tests** — Not Implemented.
- **Analytics** — reports are aggregate counts/avg; no per-topic mastery, no cohort trend charts, no time-series.
- **Audit logs** — no explicit audit trail for grade overrides/reattempts.
- **Attempt UX** — new-attempt creation flow noted as "explicit different flow" in code but not fully wired.
- **Mobile** — responsiveness of the code workspace unverified.
- **Notifications** — no email on grade-completion to student; no WhatsApp.

## Technical Debt / Performance / Security / Scalability
- `getStudentAssignments` does N+1 `Submission.findOne` per assignment — should aggregate.
- `getTopics`/`getTags` scan all tenant assignments — should use distinct/index.
- Simulation fallback in runner can silently mis-grade if Piston env misconfigured (security/trust risk to scores).
- Randomized `executionTime`/`memoryUsed` values stored are fake metrics.
- `selectedStudents`/`selectedBatches` stored as strings, not ObjectId refs — weak referential integrity.

## Suggestions & AI Opportunities
- Add Claude-based AI grading for theory/rubric + AI code review feedback (align with product's Anthropic stack instead of OpenAI).
- Real plagiarism via MOSS-style token similarity across submissions (cheap, no third party).
- Replace N+1 with aggregation pipeline; add per-topic mastery analytics.
- Auto-publish/auto-close scheduler; student grade-ready email.
- Add integration tests around submit/grade race paths.

## Estimated Dev Effort
- AI grading + feedback (Claude): ~5–7 dev-days.
- Plagiarism engine: ~4 dev-days.
- Analytics dashboard + N+1 fixes: ~4 dev-days.
- File-upload end-to-end + tests: ~4 dev-days.
- **Total to ~95%: ~3–4 weeks.**
