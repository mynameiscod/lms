# Quizzes

**Completion:** 75%  |  **Priority:** P1  |  **Business Impact:** High

## Purpose & Business Goal
Educator-authored assessments with scheduling, proctoring, multiple question types, negative marking, randomization, timer auto-submit, and analytics. Core to the "class complete → take quiz" learning loop.

## Primary Users & Roles
SUPER_ADMIN / TENANT_ADMIN / INSTRUCTOR create/manage/grade (`create_quiz`, `edit_quiz`, `delete_quiz`, `view_reports`); STUDENT takes (`view_quiz`, gated by `accessibleTo`); STAFF reports-only. Full `authMiddleware → tenantMiddleware → roleGuard` chain.

## Key Files (traced)
- Models: `server/src/models/Quiz.ts` (58 fields), `QuizAttempt.ts`, `QuizSubmission.ts`
- Routes: `server/src/routes/quizRoutes.ts` (~35 endpoints)
- Services: `quizService.ts`, `quizAnalyticsService.ts`, `quizRandomizationService.ts`, `quizTimerService.ts`, `answerValidationService.ts`
- Controllers: `quizController.ts`, `quizReportController.ts`
- Pages: `Quizzes`, `QuizManagement`, `QuizTaking`, `QuizSession`, `QuizResults`, `QuizResultsAdmin`, `QuizReports`

## Dependencies & Connected Modules
User, Batch (batch-wise access), Content (auto-announcement), Question (Question Bank linking), Course/Subject/Chapter/Topic (hierarchy + topic mastery), EmailService (notifications). Feeds Reports & Analytics, Certificates (via shareToken), Student Progress.

## Entry / Exit Points
Entry: instructor create/clone/link-questions; student start-attempt → questions → submit. Exit: results (respecting showScore/allowReview), report exports (CSV), top-performers/distribution.

## Database Tables & Relationships
Quiz (index `{tenantId, archivedAt, endDate}`) → questionIds[] → Question. QuizAttempt (status in_progress|submitted|abandoned|grading; shareToken sparse) → QuizSubmission (per-question). Cascade delete of questions/attempts/submissions on quiz delete.

## Events / Notifications / Emails / WhatsApp
Email on quiz creation to accessible students (throttled 3s gap, async non-blocking); auto-announcement Content record. No WhatsApp. No in-app notification. No audit log.

## AI Features
None in Quiz itself (question generation lives in Question Bank).

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| SMTP/Brevo | Quiz notification email | ~₹0 (hosting plan) | Throttled; burst risk |
| Multer (local disk) | Proctoring video upload (500MB) | ₹0 | No file-type validation |

## Validation Rules & Edge Cases
IST→UTC availability windows; Fisher-Yates shuffle with original-index map; single vs multi-attempt enforcement; negative marking only on answered MCQ; MCQ set-equality, short-answer case-insensitive; idempotent submit (returns existing result on retry); admin preview bypasses gates.

## Completion Breakdown
| Dimension | % | Reasoning |
| Backend | 85 | Full CRUD + validation; coding grading is a stub (0 marks), short-answer manual grading has no UI |
| Frontend/UI | 70 | Taking/creation/analytics present; empty/loading states patchy |
| API | 90 | ~35 routes incl. reporting/exports |
| Database | 90 | Well-modeled; only one compound index |
| Automation | 80 | Timer auto-submit; email async |
| AI | 0 | None |
| Testing | 0 | No test files |
| **Overall** | **75** | Production-usable; advanced grading + proctoring enforcement incomplete |

## Gaps
- **Not Implemented:** coding-question execution/grading (auto-0), short-answer grading workflow UI, proctoring *enforcement* (tab-switch/fullscreen/copy-paste logged only), camera/mic client capture, audit logs, per-batch question analytics, skip/branching logic, instant per-question feedback, mobile-optimized taking UI, email retry/delivery reporting, a11y.

## Technical Debt / Performance / Security / Scalability
N+1 in `getStudentPerformances` and `getQuestionAnalytics` (per-record `findById`); no email queue (burst trips SMTP); dual embedded-vs-bank question model; client-only proctoring enforcement; hardcoded IST conversion; no transaction wrapping link ops.

## Suggestions & AI Opportunities
Batch-load related records; queue emails (BullMQ already in repo); wire coding grading through Code Execution Engine; AI short-answer grading; AI item-difficulty calibration from attempt data; enforce proctoring server-side; add audit log.

## Estimated Dev Effort
Coding grading + short-answer AI grading ~1.5 wk; proctoring enforcement ~1 wk; N+1/queue perf ~3 d; tests ~3 d.
