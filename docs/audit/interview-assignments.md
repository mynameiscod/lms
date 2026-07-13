# Interview Assignments
**Completion:** 82%  |  **Priority:** P2  |  **Business Impact:** High

## Purpose & Business Goal
The "push" layer: distributes an InterviewTemplate to students individually, by batch, or by course, with schedule (available-from, due, expiry, optional fixed slot), attempt caps, mode (structured vs conversational AI), and push-reason context (e.g. `low_communication_score`, `placement_prep`). It tracks attempts-used, best/latest score, and status lifecycle. Business goal: let admins assign interviews at scale and drive the student's "Assigned" queue + reminders.

## Primary Users & Roles
- **TENANT_ADMIN / INSTRUCTOR / STAFF** — push/cancel/list assignments (permission `assign_interviews`).
- **STUDENT** — sees own assignments via `getStudentAssignments` (`attempt_interviews`), joins scheduled slots, downloads `.ics`.

## Key Files (traced)
- `server/src/models/InterviewAssignment.ts` — schedule, mode, attempt tracking, notification flags; unique `{tenantId,templateId,studentId}`.
- `server/src/controllers/interviewTemplateController.ts` — `pushAssignment` (L340), `pushAssignmentToBatch` (L367), `pushAssignmentToCourse` (L391), `getAssignments` (L415), `cancelAssignment` (L433), `getStudentAssignments` (L446), `getAssignmentCalendar` (L304, .ics generation with 30-min alarm).
- `server/src/services/interviewTemplateService.ts` — `pushAssignment` (L279, returns {created,duplicates,createdIds}, dedupes on unique index), batch/course fan-out (L337/L356, filters role=STUDENT active), `getStudentAssignments` (L419, availableFrom≤now).
- `server/src/jobs/interviewReminderCron.ts` — start-soon in-app reminder (30-min lead, idempotent via `notifiedBeforeStart`).
- `client/src/pages/InterviewAssignment/index.tsx` (373 lines) — admin push modal + list.

## Dependencies & Connected Modules
- **Interview Templates** — the artefact being pushed (must be active/published/scheduled).
- **AI Virtual Interview** — `startAttempt` validates against the assignment (attempts, scheduled join-window).
- **Notifications** — `notifyAssigned` (in-app bell) fires on each push; reminder cron fires start-soon.
- **User / Batch / Course** — targeting.

## Entry / Exit Points
- Entry: `POST /interview-module/assignments/push[-batch|-course]`; `GET /assignments`, `/student/assignments`, `/student/assignments/:id/calendar.ics`; `POST /assignments/:id/cancel`.
- Exit: consumed by attempt start; feeds student hub queue + reminder cron.

## Database Tables & Relationships
- `interviewassignments` — refs Tenant, InterviewTemplate, User(assignedBy/studentId), InterviewAttempt(lastAttemptId).
- Indexes: unique `{tenantId,templateId,studentId}`; `{tenantId,studentId,status}`; `{tenantId,assignedBy}`; `{tenantId,status,dueDate}`; `{expiresAt,status}`.

## Events / Notifications / Emails / WhatsApp
- **In-app notification** on push (`notifyAssigned` → `createNotifications`, controller).
- **In-app "starts soon" reminder** via `interviewReminderCron` (conversational mode only, 30-min window, IST-formatted, idempotent).
- **No email or WhatsApp** on assign/expiry. `notifiedBeforeExpiry` / `notifiedOnFeedback` flags exist but **no job sets them** — dormant.

## AI Features (which model)
- None directly. `mode: 'conversational'` routes the eventual attempt to the AI interviewer.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| — | Assignment layer itself has no paid third-party | ₹0 | .ics generated server-side; notifications in-app |

## Validation Rules & Edge Cases
- Duplicate push → caught via unique index, reported as `duplicates` (no throw).
- Push requires template in active/published/scheduled state.
- Batch/course fan-out filters STUDENT + active users.
- `cancelAssignment` only from `assigned` status.
- `startAttempt` enforces scheduled join-window (15-min early open, slot+2h grace) and attempt caps.
- Edge gaps: FE push modal validation is weak (no due<expiry cross-check); no expiry auto-flip job (index exists, unused).

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 90 | Individual/batch/course push, dedupe, cancel, calendar; solid |
| Frontend/UI | 82 | Rich push modal + list; weak form validation |
| API | 92 | All endpoints role-guarded |
| Database | 95 | Unique constraint + 5 indexes incl. expiry |
| Automation | 55 | Start-soon reminder cron works (in-app only); **no expiry auto-flip, no email/WhatsApp reminders, no feedback-notify** |
| AI | N/A | — |
| Testing | 5 | No tests |
| **Overall** | **82** | Distribution solid; automation is half-built (dormant notify flags) |

## Gaps
- **Automation — Not Implemented:** no cron flips `assigned`→`expired` on `expiresAt` (index present, unused); `notifiedBeforeExpiry`/`notifiedOnFeedback` never set.
- **Notifications — Not Implemented:** no email/WhatsApp on assign, upcoming, expiry, or feedback-ready; reminder cron is conversational-mode-only and in-app-only.
- **Validation:** push modal lacks due<expiry, slot-in-future checks.
- **Reports/Dashboard:** no "assignment completion funnel" widget (assigned→started→completed).
- **UX:** no bulk-cancel; no reassign/extend-deadline action.
- **Audit logs — Not Implemented.**
- **Mobile:** admin modal untested on small screens.

## Technical Debt / Performance / Security / Scalability
- Batch/course push creates N documents in a loop — fine for typical cohort sizes; consider bulk insert for very large batches.
- Reminder cron scans all tenants every 5 min — cheap now, but unindexed on `mode`+`scheduledAt` composite (relies on `{tenantId,studentId,status}`); add a `{mode,status,scheduledAt}` index if volume grows.

## Suggestions & AI Opportunities
- Add an expiry/auto-flip + escalation cron (reuse reminder tick) that also emails/WhatsApps students and sets the dormant flags.
- Add feedback-ready notification (`notifiedOnFeedback`) when an attempt is published.
- AI: auto-assign remedial interviews when a student's `communicationScores`/`technicalScores` dip below threshold (the `pushReason: low_communication_score` field already anticipates this).
- Add an assignment funnel analytics widget.

## Estimated Dev Effort
- Expiry cron + email/WhatsApp reminders + flag wiring: ~2 days. Feedback-ready notify: ~0.5 day. Auto-remedial-assign (AI-triggered): ~2 days. Funnel widget: ~1 day. Validation + bulk actions: ~1 day. Tests: ~1 day. **Total ≈ 7–8 dev-days.**
