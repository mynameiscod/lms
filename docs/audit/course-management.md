# Course Management
**Completion:** 62%  |  **Priority:** P2  |  **Business Impact:** Medium

## Purpose & Business Goal
The classic academic content hierarchy: **Course → Subject → Topic → SubTopic → Chapter → Content**. It lets a tenant (college/institute) model a structured catalog of courses, break them into subjects/chapters, and attach learning material (videos, notes, assignments, snippets, cheatsheets, announcements). This is the *legacy* content model that predates the newer day-wise Curriculum / Content-Library system (see `curriculum-content-library.md`). It still backs `StudentProgress` (chapter completion, streaks) and the college-batch flow.

## Primary Users & Roles
- **TENANT_ADMIN / INSTRUCTOR / STAFF** — author and manage the hierarchy (permission-gated).
- **STUDENT** — consumes published content, marks chapter completion.
- **SUPER_ADMIN** — cross-tenant oversight.

## Key Files (traced — real paths)
- Models: `server/src/models/Course.ts` (102), `Subject.ts` (83), `Topic.ts` (87), `SubTopic.ts` (126), `Chapter.ts` (162), `Content.ts` (185)
- Routes: `server/src/routes/courseRoutes.ts`, `subjectRoutes.ts`, `topicRoutes.ts`, `subTopicRoutes.ts`, `chapterRoutes.ts`, `contentRoutes.ts`
- Controllers: `server/src/controllers/courseController.ts`, `contentController.ts`, plus subject/topic/subtopic/chapter controllers
- Services: `server/src/services/courseService.ts` (40), `subjectService.ts` (79), `topicService.ts` (77), `subTopicService.ts` (87), `chapterService.ts` (157)
- Middleware: `middleware/roleGuard.ts` (permission strings), `middleware/tenantResolver.ts`
- Client: hierarchy is surfaced in admin course/subject/chapter management pages and content library (see `client/src/pages/LearningContentLibrary/`)

## Dependencies & Connected Modules
- **StudentProgress** (`progressService.ts`) reads Subject/Chapter to build per-chapter progress records.
- **Batch** links to `courseId`; **Enrollment** (legacy) links `userId`+`courseId`.
- **Quiz / Assignment / Submission** referenced from `Content` and `StudentProgress.chapterProgress`.
- File uploads via `multer` disk storage to `uploads/content` (local disk — NOT Bunny for this legacy path).

## Entry / Exit Points
- `POST /courses` (roleGuard `create_courses`), `GET /courses`, `GET /courses/:courseId`, `PUT /courses/:courseId` (`edit_courses`), `DELETE /courses/:courseId` (`delete_courses`), `PATCH /courses/:courseId/status` (`edit_courses`).
- Subject/Topic/SubTopic routes: full CRUD, each with 5 roleGuard-protected mutations.
- `chapterRoutes`: 9 role-guarded routes (richest CRUD in this module).
- `contentRoutes`: `POST /content/admin` (multer, 5 attachments), `GET /content/admin`, `PUT/DELETE /content/admin/:id`, `GET /content/student`, `/content/student/type/:type`, `/content/chapter/:chapterId`, `GET /content/:id`. Only 1 route is roleGuard-wrapped — admin content routes rely on auth+tenant only (no explicit role check).

## Database Tables & Relationships
- `courses` — unique index `(tenantId, code)`; `(tenantId, isActive)`. Denormalized counters `enrollmentCount`, `subjectCount`.
- `subjects`, `topics`, `subtopics`, `chapters` — parent-id refs down the tree, tenant-scoped.
- `contents` — polymorphic `type` (announcement/note/assignment/cheatsheet/snippet/video/audio/pdf/image/document); optional `subjectId/chapterId/topicId`; `visibility` (all_students/specific_batch/enrolled_only) + `visibleTo` (Batch ids); conditional-required fields (`dueDate` for assignment, `code`+`language` for snippet). Good index coverage (5 compound indexes).

## Events / Notifications / Emails / WhatsApp
None in this module. No publish notifications, no due-date reminders wired to Content.dueDate/expiresAt.

## AI Features (which model, or "None")
**None.** This legacy hierarchy has no AI authoring (AI content generation lives in the newer Interactive Lesson / day-content path).

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| Local disk (multer) | Content file attachments (`uploads/content`, 50MB cap) | ₹0 (server storage) | Not CDN-backed; no signed URLs; single-server (not scalable/backed-up) |

## Validation Rules & Edge Cases
- Course `code` uppercased + unique per tenant; `level` enum; `duration.unit` enum.
- Content conditional-required (`dueDate` if assignment; `code`/`language` if snippet) — enforced at schema.
- Multer `fileFilter` whitelists mime types; 50MB limit.
- **Gaps:** no pagination on list endpoints; no soft-delete (hard delete leaves orphan child rows — deleting a Subject does not cascade to Chapters/Content); denormalized counters (`subjectCount`, `enrollmentCount`) can drift; no uniqueness on Subject/Chapter titles.

## Completion Breakdown
| Dimension | % | Reasoning (from actual code) |
| Backend | 70 | Full CRUD services for all 6 levels; clean tenant scoping; but thin business logic, no cascade delete, no pagination |
| Frontend/UI | 55 | Admin management UI exists but the newer Content Library is the primary authoring surface; legacy hierarchy UI is partial |
| API | 70 | Consistent REST CRUD; role guards on Course/Subject/Topic/SubTopic/Chapter; Content admin routes under-guarded |
| Database | 75 | Solid indexes + conditional validators; missing cascades/soft-delete |
| Automation | 10 | No reminders, no counter reconciliation jobs, no publish workflow automation |
| AI | 0 | None |
| Testing | 5 | No unit/integration tests found for these services |
| **Overall** | **62** | Mature CRUD backbone, but eclipsed by the newer curriculum system and light on automation/tests |

## Gaps (mark "Not Implemented" where absent)
- **Features:** Cascade delete / soft-delete — Not Implemented. Course versioning — Not Implemented. Bulk import (CSV) of courses/subjects — Not Implemented.
- **APIs:** List pagination & server-side filtering — Not Implemented. Content routes lack per-permission roleGuard.
- **Validation:** No cross-level integrity checks (e.g. content pointing at a chapter of another subject).
- **Automation:** Content `dueDate`/`expiresAt` reminders — Not Implemented.
- **Notifications:** New-content / announcement push — Not Implemented.
- **Reports / Analytics:** Content viewCount exists but no analytics dashboard.
- **AI:** None.
- **Security:** Content attachments served from disk with no signed access; visibility enforcement is query-time only.
- **UX:** Loading/empty/error states depend on generic admin components.
- **Audit logs:** No AuditLog wiring for course/content mutations.
- **Mobile:** Not specifically optimized.

## Technical Debt / Performance / Security / Scalability
- Two parallel content systems (`Content` + `LearningContentLibrary`) create conceptual overlap and duplicate authoring surfaces — consolidation debt.
- Local-disk uploads block horizontal scaling and are not CDN/backed-up (Bunny is used only by the newer library).
- Unbounded list queries (`find()` without limit) risk large payloads at scale.

## Suggestions & AI Opportunities
- Add cascade/soft-delete and a reconciliation job for denormalized counters.
- Migrate attachments to Bunny (already integrated elsewhere) for CDN + backup.
- AI opportunity: auto-generate chapter summaries / cheatsheets from uploaded notes (reuse Claude via `aiClients.ts`).
- Deprecate or bridge legacy `Content` into `LearningContentLibrary` to remove duplication.

## Estimated Dev Effort
- Cascade/soft-delete + pagination + counter reconciliation: **1.5 weeks**.
- Bunny migration for attachments: **1 week**.
- Content consolidation with library: **2–3 weeks** (design + migration).
