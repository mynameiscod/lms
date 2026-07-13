# Scheduled / Manual Interviews
**Completion:** 85%  |  **Priority:** P2  |  **Business Impact:** High

## Purpose & Business Goal
The human-interviewer track: an admin schedules a real (in-person or online) mock interview, invites students (individually or by batch) with email + Google Calendar link, defines evaluation criteria, then a human interviewer submits per-criterion ratings (1–10, good/average/poor) with attendance. Absent candidates auto-score 0 and get a red-alert email. Results are released to students on demand (per-student or bulk). Business goal: run structured, human-graded placement/mock interviews with accountability (absent→0, red alerts) and controlled feedback release.

> Also note a **third, older `Interview` model** (`server/src/models/Interview.ts`: mock/technical/hr/communication/real with scores + result) exists but has **no dedicated controller/routes** in this domain — it appears legacy/analytics-only and is not wired into the scheduled flow.

## Primary Users & Roles
- **TENANT_ADMIN / STAFF / INSTRUCTOR** — create/manage interviews & feedback (guarded by `manage_tenant_courses`/`manage_leads`/`TENANT_ADMIN` for delete; most routes only auth+tenant).
- **Human interviewer** — submits feedback (via admin UI).
- **STUDENT** — sees own scheduled interviews + released feedback.

## Key Files (traced)
- `server/src/models/ScheduledInterview.ts` — interview + embedded criteria + students/batches + email fields.
- `server/src/models/InterviewScheduleFeedback.ts` — per-student ratings, attendance, overallScore, release flags; unique `{interviewId,studentId}`.
- `server/src/controllers/scheduledInterviewController.ts` (491 lines) — `createInterview` (L50), `submitFeedback` (L300, absent→0 + red-alert), `releaseFeedback`/`releaseAllFeedback` (L393/L418), `resendInvites` (L231), `addStudents` (L281), `getMyInterviews`/`getMyFeedback` (L438/L458), `getStudentInterviewsAdmin` (L249), `deleteInterview` (cascade, L265).
- `server/src/services/emailService.ts` — `sendInterviewInviteEmail` (L1183, w/ Google Calendar link), `sendGenericEmail` (L250, red-alert HTML).
- `client/src/pages/ScheduledInterviews/index.tsx` + `InterviewDetail.tsx` (admin), `MyInterviews/index.tsx` (student).

## Dependencies & Connected Modules
- **EmailService** — invite + red-alert emails (Hostinger SMTP, paced per MEMORY).
- **User / Batch** — targeting.
- Feeds the student **MyInterviews** results tab alongside AI attempts.

## Entry / Exit Points
- Entry: `/scheduled-interviews` CRUD; `/:id/feedback/:studentId` submit/get; `/:id/feedback/:studentId/release` + `/:id/release-all`; `/:id/resend-email`; `/:id/students`.
- Exit: student `/my`, `/my-feedback`, `/:id/my-feedback`; admin `/student/:studentId`.

## Database Tables & Relationships
- `scheduledinterviews` — refs Tenant, User(students/createdBy), Batch; embedded criteria + email content.
- `interviewschedulefeedbacks` — refs Tenant, ScheduledInterview, User(student/submittedBy/releasedBy); unique per interview+student.
- Indexes: `{tenantId,date}`, `{tenantId,students}`, unique `{interviewId,studentId}`.

## Events / Notifications / Emails / WhatsApp
- **Invite email** on create + resend — includes date/time/venue/meet-link/criteria + **Google Calendar link** (background bulk send).
- **Red-alert email** on fresh present→absent transition (`newlyAbsent`, one-time, red HTML, "0/10").
- **No notification/email on feedback release** — student must poll `MyInterviews` (gap).
- **No WhatsApp.** No in-app bell notifications for this track.

## AI Features (which model)
- **None.** Fully human-graded by design.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| Hostinger SMTP (EmailService) | Invite + red-alert + (no) release emails | ₹0 marginal (bundled with hosting; paced to avoid rate-limit) | Bulk invites sent in background; Google Calendar link built inline |

## Validation Rules & Edge Cases
- Create requires title/date/time/interviewerName + ≥1 student/batch; dedupes explicit + batch students.
- `submitFeedback`: absent → overallScore 0, no ratings stored; present → average of criterion scores (1 decimal); red-alert only on first absent transition (idempotent).
- `deleteInterview` cascades feedback deletion.
- `releaseAllFeedback` releases regardless of submission status (no guard — could release empty feedback).
- Edge gaps: no reminder before the slot for this track (the AI-track cron only handles conversational assignments); `addStudents` does NOT auto-send invites (needs manual resend).

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 92 | Full lifecycle, absent-scoring, red-alert, cascade delete, release controls |
| Frontend/UI | 84 | Admin list + detail feedback form + student MyInterviews all solid; inline-style mobile concerns |
| API | 90 | Complete; some routes lack tighter role guards (only auth+tenant on create/update/feedback) |
| Database | 92 | Clean model + unique feedback constraint |
| Automation | 55 | Invite + red-alert automated; no slot reminder, no release notification, no expiry/status auto-flip |
| AI | N/A | Intentionally none |
| Testing | 5 | No tests |
| **Overall** | **85** | A strong, mostly-complete human-interview track; notification gaps + weak role guards |

## Gaps
- **Notifications — Not Implemented:** no email/in-app when feedback is released; no pre-slot reminder for scheduled human interviews (only AI conversational assignments get reminders).
- **Permissions — Weak:** create/update/submit-feedback routes require only auth+tenant (any authenticated tenant user could hit them) — should be role-guarded like the template routes.
- **Validation:** `releaseAllFeedback` can release blank feedback; no check that feedback exists/submitted before release.
- **Reports/Dashboard:** no aggregate scheduled-interview analytics (attendance rate, avg criterion scores across cohort).
- **Legacy `Interview` model** unused/orphaned — dead code risk.
- **UX:** interviewer feedback form is admin-only (no dedicated interviewer login/role); mobile inline styles untested.
- **Audit logs — Not Implemented.**

## Technical Debt / Performance / Security / Scalability
- Route-level RBAC is looser here than the AI track — a real security gap (missing `roleGuard` on create/feedback/release).
- Bulk invite send is fire-and-forget (errors only logged) — no delivery tracking beyond `emailSent` boolean.
- Orphaned `Interview` model adds confusion.

## Suggestions & AI Opportunities
- Add role guards on all admin/feedback routes.
- Add feedback-released notification (email + in-app) and a pre-slot reminder reusing the existing cron tick.
- AI: auto-summarize human criterion ratings into a narrative + suggested practice (bridge to AI track's report style).
- Add cohort attendance + score analytics; auto-flag repeat absentees.
- Remove/merge the orphaned `Interview` model.

## Estimated Dev Effort
- Role guards + release/reminder notifications: ~1.5 days. Release-guard validation: ~0.5 day. Cohort analytics widget: ~1.5 days. AI narrative summary of ratings: ~1 day. Interviewer role/login: ~2 days. Cleanup orphaned model: ~0.5 day. Tests: ~1 day. **Total ≈ 8 dev-days.**
