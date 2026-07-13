# Job Tracker
**Completion:** 78%  |  **Priority:** P2  |  **Business Impact:** Medium

## Purpose & Business Goal
A personal Kanban board where a student tracks job/internship applications across five stages (Wishlist → Applied → Interviewing → Offer → Rejected). Reinforces placement discipline and gives the student a single view of their pipeline; referenced by the AI Mentor as a recommended tool.

## Primary Users & Roles
- **STUDENT** — sole user; owns their own cards. No admin/instructor visibility endpoint exists.

## Key Files (traced)
- Model: `server/src/models/JobApplication.ts` (52 lines).
- Routes: `server/src/routes/jobApplicationRoutes.ts` — auth + tenant middleware; base `/api/v1/job-applications`.
- Controller: `server/src/controllers/jobApplicationController.ts` (101 lines) — list/create/update/move/delete.
- Client: `client/src/pages/JobTracker/index.tsx` (single file), `client/src/api/jobApplicationApi.ts`.

## Dependencies & Connected Modules
- Standalone. No AI, no cross-module reads/writes. Only referenced narratively by AI Mentor's system prompt.

## Entry / Exit Points
- Entry: `/job-applications` API; page `JobTracker/index.tsx`.
- Exit: none (no export, no downstream consumers).

## Database Tables & Relationships
- `jobapplications` — `tenantId` (string, indexed), `studentId → User` (indexed). Compound index `{tenantId, studentId, status, order}` for efficient column retrieval. Fields: company*, role*, location, workMode enum, jobUrl, salary (free text), source, status enum, appliedAt, contactName/Email, nextAction, nextActionAt, notes, order (sort within column).

## Events / Notifications / Emails / WhatsApp
- **None.** No reminders even though `nextActionAt` exists (overdue is shown in UI only, never notified).

## AI Features
- **None.**

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| — | No third-party integrations | ₹0 | Pure CRUD; axios client only |

## Validation Rules & Edge Cases
- Server: `company` + `role` required; `status` validated against `JOB_STATUSES` enum; new card floats to top of column (`order - 1`); auto-sets `appliedAt` when a card leaves Wishlist. All queries scoped `{tenantId, studentId}` (tenancy + ownership).
- Editable fields whitelisted (`pickEditable`) — status/order/timestamps set server-side only.
- Gaps: no URL/email format validation; `salary` free-text unparsed; no duplicate prevention; no status-transition rules; no `nextActionAt >= appliedAt` check.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 90 | Clean, complete CRUD + move with sensible ordering/tenancy |
| Frontend/UI | 85 | Full drag-drop Kanban, modal editor, overdue indicator, per-column empty states |
| API | 85 | Covers all board actions; no filter/search/bulk/export endpoints |
| Database | 85 | Good compound index; no dedupe constraint |
| Automation | 0 | `nextActionAt` never drives a reminder |
| AI | 0 | N/A (no AI intended) |
| Testing | 0 | No tests |
| **Overall** | **78** | Solid, shippable single-user tool; missing reminders, admin insight, analytics |

## Gaps (Not Implemented)
- **Features:** No follow-up reminders (biggest miss given `nextActionAt`); no filters/search/sort options; no bulk actions; no CSV export or LinkedIn/Naukri import.
- **APIs:** No admin/instructor view of student pipelines; no analytics endpoint.
- **Validation:** URL/email format, salary parsing, duplicate detection, transition rules — all absent.
- **Notifications:** None.
- **Reports/Dashboard widgets:** No "applications this week", conversion funnel (applied→interview→offer), or placement-readiness signal.
- **Analytics:** No funnel metrics despite the data supporting them trivially.
- **Security:** OK (ownership-scoped). List errors swallowed silently in UI.
- **Error/Loading/Empty states:** Loading + empty present; save errors use `alert()`; list-load errors silent.
- **Audit logs / Mobile:** None / not verified.

## Technical Debt / Performance / Security / Scalability
- Silent error swallowing on list/move hides failures from the user.
- No pagination (fine at expected volumes, unbounded in theory).
- Overdue logic is client-only; server has no scheduled awareness.

## Suggestions & AI Opportunities
- Wire `nextActionAt` into the existing notification/cron infra (a `dueReminderCron` already exists) for follow-up nudges.
- Add a funnel-analytics widget (conversion rates per stage) — cheap given the schema.
- AI opportunity: auto-extract company/role/salary from a pasted job URL or JD; suggest next action per stage; surface interviewing-stage cards to the AI Mentor for tailored prep.

## Estimated Dev Effort
- Reminders + funnel analytics: ~2 dev-days.
- Filters/search/export + validation hardening: ~2 dev-days.
- AI URL/JD auto-fill: ~2 dev-days.
- Tests: ~1 dev-day. **Total to "90%+": ~1.5 weeks.**
