# Exams

**Completion:** 14%  |  **Priority:** P4  |  **Business Impact:** Low

## Purpose & Business Goal
Intended as an exam-record system (internal/external/certification/placement) with grade/percentage/result tracking. In practice an **orphaned data model** — the real "exam-taking" happens in the Skill Assessment funnel and Quizzes.

## Primary Users & Roles
Intended: students (takers), instructors (recorders). Actual: only read by `studentReportService.getExamData()`. No dedicated routes/UI.

## Key Files (traced)
- Model: `server/src/models/Exam.ts` (88 lines)
- Only usage: `server/src/services/studentReportService.ts`
- Note: `client/src/pages/Assessment/Exam.tsx` belongs to the **public assessment** flow, NOT this model.

## Dependencies & Connected Modules
Refs User/Tenant/Batch/conductedBy. Consumed only by Student Reports.

## Entry / Exit Points
**None.** No CRUD routes exist.

## Database Tables & Relationships
Exam: studentId, tenantId, batchId, examName, examType enum, date, maxScore, scoredMarks, percentage (pre-save calc), grade, result enum, remarks, conductedBy. No indexes.

## Events / Notifications / Emails / WhatsApp
None.

## AI Features
None.

## Third-Party Integrations & Cost
None.

## Validation Rules & Edge Cases
Auto percentage on save; stale percentage if maxScore changes later; no dedup; no validation layer (no routes).

## Completion Breakdown
| Dimension | % | Reasoning |
| Backend | 20 | Model only, no controllers/routes |
| Frontend/UI | 0 | No UI |
| API | 0 | Zero routes |
| Database | 100 | Schema + calc hook complete |
| Automation | 0 | None |
| AI | 0 | N/A |
| Testing | 0 | None |
| **Overall** | **14** | Barely functional data model with no access layer |

## Gaps
- **Not Implemented:** routes, UI, controller/grading logic, validation, notifications, audit, permissions, analytics, exam-specific reports, tests.

## Technical Debt / Performance / Security / Scalability
Orphaned code creates confusion with the real exam flows; no indexes for report queries; no soft delete.

## Suggestions & AI Opportunities
Decide: (a) wire up batch-level exam management UI/routes, or (b) **deprecate** and consolidate into `AssessmentSubmission`. Recommend (b) unless offline-exam recording is a real requirement.

## Estimated Dev Effort
Deprecate: ~0.5 d. Fully build out: ~1.5 wk.
