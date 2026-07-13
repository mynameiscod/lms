# Lessons & Lesson Progress
**Completion:** 55%  |  **Priority:** P3  |  **Business Impact:** Medium

## Purpose & Business Goal
The lesson-delivery substrate. In practice this module is a mix of: (1) a **dead legacy `Lesson` model** (course-scoped title/content/video, never imported/used), (2) the **active `LessonProgress`** model that tracks per-scene results for *Interactive Lessons* (its `lessonId` refs `InteractiveLesson`, not `Lesson`), and (3) **`ConceptLesson`** — a separate slide-based lesson format (narration/animation/code_reveal/analogy + final task) linked 1:1 to a content-library item. The business value flows through Interactive Lessons; the plain `Lesson` model is technical debt, and `ConceptLesson` is a lightly-used parallel format with no progress tracking.

## Primary Users & Roles
- **INSTRUCTOR / TENANT_ADMIN** — author ConceptLessons (via content library upsert).
- **STUDENT** — progress recorded through the Interactive Lesson flow (LessonProgress).

## Key Files (traced — real paths)
- `server/src/models/Lesson.ts` (44) — **DEAD**: `grep` confirms no imports anywhere in `server/src`. Legacy artifact.
- `server/src/models/LessonProgress.ts` (73) — active; belongs conceptually to Interactive Lessons (documented there too).
- `server/src/models/ConceptLesson.ts` (103) — slide-based lesson + finalTask (mcq/coding/theory).
- Routes: `server/src/routes/conceptLessonRoutes.ts` (14) — only `by-content/:contentId` GET/PUT/DELETE.
- Controller: `server/src/controllers/conceptLessonController.ts` (66).

## Dependencies & Connected Modules
- **Interactive Lessons** — owns the real lesson play/scoring; LessonProgress is written by `interactiveLessonController`.
- **Content Library** — ConceptLesson linked via `LearningContentLibrary.conceptLessonId` (unique per content item).
- **Enrollment** — LessonProgress carries optional `enrollmentId`/`dayNumber` (stored but not fed back to day completion).

## Entry / Exit Points
- ConceptLesson: `GET/PUT/DELETE /concept-lessons/by-content/:contentId` (auth+tenant, **no roleGuard**).
- LessonProgress has no routes of its own — mutated via `/interactive-lessons/:lessonId/progress*` (see Interactive Lessons doc).
- Plain `Lesson`: no routes, no controller, no usage.

## Database Tables & Relationships
- `lessonprogresses` — unique `(tenantId,studentId,lessonId→InteractiveLesson)`; `(tenantId,lessonId)`, `(tenantId,enrollmentId)`.
- `conceptlessons` — unique `(tenantId,contentId)`; embedded slides + finalTask.
- `lessons` (legacy) — schema exists; effectively unused collection.

## Events / Notifications / Emails / WhatsApp
None.

## AI Features (which model, or "None")
None directly in this module. (Interactive-lesson AI generation is documented under Interactive Lessons; ConceptLesson slides are authored manually.)

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| None (this module) | — | — | Piston/Claude belong to Interactive Lessons; ConceptLesson code test cases would use Piston if executed |

## Validation Rules & Edge Cases
- ConceptLesson upsert updates the back-reference on the content-library item; delete cleans it up.
- **Gaps:** ConceptLesson has **no progress model** (ConceptLessonProgress absent) — student completion of a ConceptLesson isn't tracked. `by-content` routes lack role guards. No validation of slides/finalTask structure. Dead `Lesson` model risks confusion (a future dev may wire it by mistake — LessonProgress.lessonId ref name "InteractiveLesson" is the only signal).

## Completion Breakdown
| Dimension | % | Reasoning (from actual code) |
| Backend | 60 | LessonProgress solid; ConceptLesson CRUD minimal; Lesson dead |
| Frontend/UI | 55 | ConceptLesson likely edited via content-library concept-lesson editor; no standalone player-progress UI |
| API | 50 | Only 3 ConceptLesson endpoints; LessonProgress has no direct API |
| Database | 70 | Good indexes on LessonProgress/ConceptLesson; dead `lessons` collection |
| Automation | 10 | No completion propagation, no events |
| AI | 0 | None here |
| Testing | 0 | None |
| **Overall** | **55** | Fragmented: one dead model, one un-tracked format, one active progress store owned by another module |

## Gaps (mark "Not Implemented" where absent)
- **Features:** ConceptLessonProgress tracking — Not Implemented. Remove/retire dead `Lesson` model — Not Done.
- **APIs:** ConceptLesson list/search endpoints — Not Implemented (only by-content).
- **Validation:** Slides/finalTask schema validation — Not Implemented; role guards — Not Implemented.
- **Automation:** LessonProgress → enrollment day completion — Not Implemented (fields exist, unused).
- **Notifications:** None.
- **Reports/Analytics:** ConceptLesson usage/completion — Not Implemented.
- **AI:** None.
- **Security:** by-content routes unguarded by role.
- **Audit logs:** None.

## Technical Debt / Performance / Security / Scalability
- Dead `Lesson.ts` should be deleted or clearly deprecated to avoid future mis-wiring.
- Two lesson formats (Interactive vs Concept) with only one having progress tracking is a consistency gap; decide whether ConceptLesson is retired or promoted.
- `enrollmentId`/`dayNumber` on LessonProgress are recorded but never used to advance the enrollment — the completion loop is open.

## Suggestions & AI Opportunities
- Delete `Lesson.ts` (confirmed unused) to reduce confusion.
- Either add `ConceptLessonProgress` + a player, or migrate ConceptLessons into the InteractiveLesson format and deprecate.
- Close the loop: on Interactive Lesson completion, use `enrollmentId`+`dayNumber` to mark the day item complete.
- AI opportunity: one-click "convert ConceptLesson → 7-scene Interactive Lesson" using Claude.

## Estimated Dev Effort
- Delete dead model + tidy references: **1 day**.
- Format consolidation decision + migration OR ConceptLessonProgress: **1.5–2 weeks**.
- Completion-loop wiring: **3 days**.
