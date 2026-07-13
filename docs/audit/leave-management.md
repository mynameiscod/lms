# Leave Management

**Completion:** 72%  |  **Priority:** P3  |  **Business Impact:** Medium

## Purpose & Business Goal
Let students apply for leave over a date range; let admins/instructors approve or reject. On approval, weekday dates in the range are auto-marked as 'leave' in the Attendance module so attendance % reflects sanctioned absence.

## Primary Users & Roles
- **STUDENT** — apply for leave, view own requests (`enroll_courses`/`view_courses`/`submit_assignments` perms).
- **TENANT_ADMIN / INSTRUCTOR** — list, approve (with note), reject (review perms).

## Key Files (traced)
- Model: `server/src/models/LeaveRequest.ts` (studentId, batchId, fromDate, toDate, reason, status pending/approved/rejected, reviewedBy/At/Note, daysMarked).
- Route: `server/src/routes/leaveRequestRoutes.ts`
- Controller: `server/src/controllers/leaveRequestController.ts`
- Cross-writes: `Attendance` (upsert 'leave' per weekday on approve).

## Dependencies & Connected Modules
- **User** (student name + batchId snapshot at apply time).
- **Attendance** (approval writes leave records).
- No email/notification service wired.

## Entry / Exit Points
- `POST /leave-requests` (apply), `GET /leave-requests/my`, `GET /leave-requests` (admin list, paginated), `POST /leave-requests/:id/approve`, `POST /leave-requests/:id/reject`.
- Exit: attendance 'leave' upserts on approval; response message states days marked.

## Database Tables & Relationships
- `leaverequests` — tenantId→Tenant, studentId→User, batchId→Batch (snapshot), reviewedBy→User. Indexes on (tenantId,status,createdAt) and (tenantId,studentId,createdAt).

## Events / Notifications / Emails / WhatsApp
- **None.** No email/in-app/WhatsApp on apply, approve, or reject. Student must poll "My Leave" to see status. This is a notable gap.

## AI Features
None.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| — | — | — | No third-party integration |

## Validation Rules & Edge Cases
- Requires fromDate, toDate, reason; rejects invalid dates and toDate < fromDate.
- Approval only from `pending` status (idempotency guard on approve/reject).
- Only weekdays (Mon–Fri) marked; Sat/Sun skipped. Holidays NOT considered (no holiday calendar).
- If student has no batchId, approval succeeds but marks 0 days (message tells admin).
- `daysMarked` stored for auditability.
- No overlap check (a student can file overlapping leave ranges).
- No max-days / balance / quota concept.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 80 | Full apply/list/approve/reject + attendance side-effect, idempotent. Missing overlap check, holiday calendar, notifications. |
| Frontend/UI | 65 | MyLeave + LeaveRequests pages exist (see client audit). |
| API | 85 | Clean, paginated list. |
| Database | 80 | Good indexes + snapshots; no unique/overlap constraint. |
| Automation | 60 | Auto-marks attendance on approval; no reminder/escalation for pending requests. |
| AI | 0 | None. |
| Testing | 5 | No tests found. |
| **Overall** | **72** | Functional workflow; missing notifications, holidays, quotas. |

## Gaps (Not Implemented)
- **Notifications:** No email/in-app/WhatsApp on submit or decision (biggest UX gap).
- **Validation:** No overlap detection, no leave balance/quota, no holiday-calendar awareness, no attachment/proof upload (e.g. medical certificate).
- **Automation:** No auto-escalation/reminder for stale pending requests.
- **Reports/Dashboard:** No leave analytics (per-student/per-batch leave counts), no calendar view.
- **Reversal:** No un-approve flow (approving marks attendance; there's no path to revert those 'leave' records if approval was a mistake).
- **Audit logs:** reviewedBy/reviewedAt captured; no full history.

## Technical Debt / Performance / Security / Scalability
- batchId is snapshotted at apply time from user; if the student changes batch before approval, leave marks against the old batch.
- Approval loop does one `findOneAndUpdate` per weekday (fine for short ranges; unbounded for long ranges — no max-range guard).
- No transaction wrapping the multi-day attendance writes + status flip (partial failure leaves inconsistent state).

## Suggestions & AI Opportunities
- Wire notifications (in-app + email, optional WhatsApp) on apply/approve/reject — reuse `createNotifications` and `EmailService`.
- Add holiday calendar + overlap + max-range validation; add un-approve that reverts attendance.
- AI: auto-classify leave reason (medical/personal), flag suspicious frequency patterns.

## Estimated Dev Effort
- Notifications + overlap/holiday validation: ~2–3 days.
- Un-approve/revert + transaction safety: ~1–2 days.
- Leave analytics/calendar view: ~2 days.
