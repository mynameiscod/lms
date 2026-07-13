# Interview Legacy Q&A (Chapter Study Bank)
**Completion:** 90%  |  **Priority:** P4  |  **Business Impact:** Medium

## Purpose & Business Goal
A **separate, self-contained** chapter-scoped interview Q&A / flashcard study system (models `InterviewQuestion` + `StudentQuestionProgress`). Admins author curated interview Q&A per Chapter/Subject/Course (with answer, explanation, company tags, difficulty). Students study them, track personal confidence (`not_reviewed → reviewing → understood → confident`), take notes, and mark questions helpful. Business goal: interview *preparation reading* material tied to the curriculum — distinct from the gradeable AI interview pipeline.

> This is NOT the same as the modern `InterviewQuestionBank` that feeds templates/AI grading. It has no attempts, no scoring, no AI. Included for completeness of the interviews domain.

## Primary Users & Roles
- **TENANT_ADMIN / INSTRUCTOR** — CRUD via course permissions (`create_courses`/`edit_courses`/`delete_courses`).
- **STUDENT** — read questions, update own progress, mark helpful (any authenticated user).

## Key Files (traced)
- `server/src/models/InterviewQuestion.ts` — `InterviewQuestion` + `StudentQuestionProgress` schemas.
- `server/src/controllers/interviewQuestionController.ts` (482 lines) — 15 handlers (CRUD, bulk, reorder, query-by-chapter/subject/course, progress, helpful, chapter stats).
- `server/src/services/interviewQuestionService.ts` (243 lines) — business logic.
- `server/src/routes/interviewQuestionRoutes.ts` — mounted at `/interview-questions`.
- `client/src/pages/InterviewQuestions/index.tsx` (339 lines) — student accordion study UI.
- `client/src/pages/InterviewQuestionBank/index.tsx` (622 lines) — **admin manager for THIS legacy model** (naming is misleading).

## Dependencies & Connected Modules
- **Curriculum** — Course → Subject → Chapter hierarchy (hard dependency; every question requires all three ids).
- No connection to templates, attempts, or AI grading.

## Entry / Exit Points
- Entry: `/interview-questions` CRUD + `/progress/*` endpoints.
- Exit: purely read/study; feeds no downstream scoring.

## Database Tables & Relationships
- `interviewquestions` — refs Chapter, Subject, Course, Tenant, User; has `viewCount`, `helpfulCount`, `order`.
- `studentquestionprogresses` — unique `{studentId,questionId}`; per-student status/notes/reviewCount.
- Indexes on chapter/course/difficulty/companyTags + student progress compounds.

## Events / Notifications / Emails / WhatsApp
- None.

## AI Features (which model)
- **None.** Pure CRUD + progress tracking.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| — | None | ₹0 | No third-party usage |

## Validation Rules & Edge Cases
- Create requires chapterId, subjectId, courseId, question, answer.
- Progress status validated against whitelist (`not_reviewed/reviewing/understood/confident`).
- `getQuestionById` increments `viewCount`; `markHelpful` increments `helpfulCount`.
- Update blocks mutation of tenantId/createdBy/viewCount/helpfulCount.
- Edge gaps: no pagination (FE loads all filtered questions into DOM — perf risk at scale).

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 95 | Complete CRUD + reorder + progress + chapter stats |
| Frontend/UI | 82 | Student accordion + admin manager both solid; no pagination |
| API | 95 | All endpoints present & guarded |
| Database | 95 | Well-modelled with unique progress index |
| Automation | N/A | Not an automated flow by design |
| AI | N/A | Intentionally none |
| Testing | 5 | No tests |
| **Overall** | **90** | A finished, low-complexity study feature |

## Gaps
- **Features:** no pagination / lazy-load; no spaced-repetition scheduling; no export.
- **Analytics:** chapter confidence stats exist but no student-facing "readiness" rollup across course.
- **UX:** no search-by-company at course level; no bookmarking beyond confidence status.
- **Mobile:** accordion is likely mobile-OK but untested.
- **Audit logs — Not Implemented.**

## Technical Debt / Performance / Security / Scalability
- No pagination on question lists is the main scalability concern.
- Naming collision with the modern `InterviewQuestionBank` (the FE page `InterviewQuestionBank` manages THIS legacy model) is a real maintenance hazard.

## Suggestions & AI Opportunities
- Add spaced-repetition (SRS) scheduling for confidence review.
- AI-suggest which legacy Q&A to review before an assigned AI interview (bridge the two systems).
- Add pagination + course-level readiness dashboard.

## Estimated Dev Effort
- Pagination: ~0.5 day. SRS: ~2 days. Course readiness rollup: ~1 day. AI review-suggestions bridge: ~1.5 days. **Total ≈ 5 dev-days.**
