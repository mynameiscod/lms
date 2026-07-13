# Batch Management
**Completion:** 62%  |  **Priority:** P2  |  **Business Impact:** Medium

## Purpose & Business Goal
Batches model cohorts: a named group tied to a course, with start/end dates, weekly class timings, instructors, capacity, mode (offline/online/hybrid), and — critically for the day-wise curriculum — a **schedule calendar** (`holidays`, `weeklyOffDays`, `specialDays`) that controls how curriculum "Days" advance for the whole cohort. Assigning a `courseId` to a batch auto-enrolls its students. Batches are the operational unit instructors run classes and track cohort progress against.

## Primary Users & Roles
- **TENANT_ADMIN / STAFF** — create/edit batches, manage instructors, set calendars.
- **INSTRUCTOR** — assigned to batches; teach cohorts.
- **STUDENT** — assigned via `User.batchId`; inherits cohort schedule.

## Key Files (traced — real paths)
- Model: `server/src/models/Batch.ts` (136) — timings, holidays, weeklyOffDays (getDay numbers), specialDays (holiday/mock_interview/event/off).
- Routes: `server/src/routes/batchRoutes.ts` (46) — 8 role-guarded routes.
- Controller: `server/src/controllers/batchController.ts` — validation + sanitizers.
- Service: `server/src/services/batchService.ts` (168) — CRUD + auto-enrollment.
- Client: `client/src/pages/Batches/index.tsx` (440) — 4-step wizard + list.

## Dependencies & Connected Modules
- **Course** (`courseId`) — auto-enroll trigger; **User** (`batchId`, `instructors`).
- **Enrollment** (legacy) — auto-created when a course is assigned.
- **BatchOffering / CurriculumEnrollment** — batch calendar (`holidays`/`weeklyOffDays`/`specialDays`) drives cohort day counting in the learning-plan scheduler (`resolveSchedule`).
- **Department** (`departmentId`), **StudentProgress** (`batchId`), **CohortProgress** view.

## Entry / Exit Points
- `POST /batches` (roleGuard `manage_tenant_courses`), `GET /batches` (**no guard**), `GET /batches/:id` (**no guard**), `PUT /batches/:id`, `DELETE /batches/:id`, `PATCH /:id/activate|/deactivate`, `POST /:id/instructors`, `DELETE /:id/instructors` — mutations role-guarded.

## Database Tables & Relationships
- `batches` — index `(tenantId,isActive)`. `enrolledCount` denormalized but recomputed live from `User.batchId` count in service (N+1 per batch).
- Related: User.batchId (no index noted), Enrollment (User↔Course).

## Events / Notifications / Emails / WhatsApp
- None. No instructor-assigned or student-added notifications; no batch start/end reminders (those surface only as Dashboard read-only reminders).

## AI Features (which model, or "None")
None.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| None | Pure CRUD/scheduling | ₹0 | — |

## Validation Rules & Edge Cases
- Validates name, start<end, non-empty timings; sanitizes `weeklyOffDays` (0–6, dedup, default [0,6]) and `specialDays` (date format, type enum, label ≤120 chars).
- Auto-enrollment on new `courseId`: enrolls all active STUDENT users in the batch, skips already-enrolled, increments Course.enrollmentCount.
- **Edge/gaps:**
  - Auto-enroll loop is **not transactional** — partial failure leaves batch updated but some students un-enrolled; uses a loop instead of insertMany.
  - No validation that `courseId`/`instructors`/`departmentId` exist, or `capacity > 0`, or timing HH:MM/`startTime<endTime`.
  - **Capacity not enforced** — batch can be over-enrolled (visual bar only).
  - Hard delete (no soft-delete/cascade); clearing `courseId` doesn't unwind old enrollments.
  - GET routes unguarded — batch names/dates/rosters readable by any authenticated tenant user.

## Completion Breakdown
| Dimension | % | Reasoning (from actual code) |
| Backend | 68 | Solid CRUD + calendar model + auto-enroll; no transactions, thin FK validation, N+1 counts |
| Frontend/UI | 72 | Polished 4-step wizard (info/schedule/instructors/review) + list with search/filter/pagination; no student-roster management UI |
| API | 68 | Full CRUD + instructor ops guarded; GET routes unguarded; no bulk ops |
| Database | 76 | `(tenantId,isActive)` index; missing User.batchId index; denormalized count drifts |
| Automation | 30 | Auto-enroll exists; no notifications, no schedule-conflict detection |
| AI | 0 | None |
| Testing | 15 | Attendance tests exist; no batch-service tests |
| **Overall** | **62** | Good schedule modeling + wizard UX; blocked for ops by missing student-roster UI, capacity enforcement, and transactional enrollment |

## Gaps (mark "Not Implemented" where absent)
- **Features:** Student roster management UI (add/remove/waitlist) — Not Implemented. Batch duplication — Not Implemented. Schedule-conflict (instructor double-booking) detection — Not Implemented.
- **APIs:** Bulk operations, GET route guards — Not Implemented.
- **Validation:** Capacity enforcement, FK existence checks, timing format checks — Not Implemented.
- **Automation:** Transactional auto-enroll, insertMany batching — Not Implemented; instructor/student notifications — Not Implemented.
- **Notifications:** None.
- **Reports:** Cohort progress exists via BatchOffering; batch-level analytics limited.
- **Dashboard widgets:** Batch-fill / at-capacity alerts — Not Implemented.
- **AI:** None.
- **Security:** GET `/batches` + `/batches/:id` unguarded.
- **UX:** Step-level loading/validation feedback in wizard — partial; auto end-date only on create.
- **Audit logs:** No AuditLog for batch create/edit/delete.

## Technical Debt / Performance / Security / Scalability
- N+1 enrolled-count recomputation per batch (store + maintain `enrolledCount` via Enrollment hooks instead).
- Non-transactional auto-enroll risks inconsistent state.
- Missing GET guards + no capacity enforcement are the main correctness/security gaps.
- `User.batchId` unindexed → slow roster queries at scale.

## Suggestions & AI Opportunities
- Add roleGuard to GET routes; add capacity check on assignment; validate FKs.
- Wrap auto-enroll in a Mongoose session + `insertMany`; maintain `enrolledCount` via hooks.
- Build a batch student-roster UI (add/remove/move/waitlist).
- AI opportunity: suggest optimal batch schedule from instructor availability + holiday calendar; predict cohort drop-off from early attendance/progress.

## Estimated Dev Effort
- GET guards + capacity + FK validation + transactional enroll: **1 week**.
- Student roster UI: **1–1.5 weeks**.
- Notifications + schedule-conflict detection: **1 week**.
