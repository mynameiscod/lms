# Attendance

**Completion:** 68%  |  **Priority:** P2  |  **Business Impact:** High

## Purpose & Business Goal
Track daily student attendance per batch (present/absent/leave), compute attendance percentage, notify students on absence, and give admins/instructors reports and CSV export. Attendance % is a core compliance and placement-eligibility signal for a training LMS.

## Primary Users & Roles
- **ATTENDANCE_ADMIN / TENANT_ADMIN / INSTRUCTOR** — mark, bulk-mark, edit, delete, export (guarded by `mark_attendance` permission).
- **STUDENT** — view own attendance + summary (MyAttendance).
- **Admin/Instructor** — batch attendance, batch summary, date-range report.

## Key Files (traced)
- Model: `server/src/models/Attendance.ts` (studentId, batchId, date, inTime, outTime, status, markedBy, tenantId, remarks; 3 compound indexes).
- Route: `server/src/routes/attendanceRoutes.ts`
- Controller: `server/src/controllers/attendanceController.ts` (mark, bulk, student/batch/summary/range, delete, CSV export).
- Service: `server/src/services/attendanceService.ts`
- Consumed by: `liveClassAttendanceService.finalizeAttendance` (auto-marks 'present') and `leaveRequestController.approveLeave` (auto-marks 'leave').

## Dependencies & Connected Modules
- **Batch** (validates batchId), **User** (student lookup, email), **EmailService** (absence email).
- **Leave Management** writes 'leave' status here on approval.
- **Live Class Attendance** writes 'present' status here on class finalize.

## Entry / Exit Points
- `POST /attendance` (mark), `POST /attendance/bulk`, `GET /attendance/student/:id[/summary]`, `GET /attendance/batch/:batchId/date|summary`, `GET /attendance/range`, `GET /attendance/export/csv`, `DELETE /attendance/:id`.
- Exit: email notification (absent/leave), CSV download.

## Database Tables & Relationships
- `attendances` — studentId→User, batchId→Batch, markedBy→User, tenantId→Tenant. No unique constraint on (studentId, batchId, date); duplicate prevention is done in-app via a day-window `findOne` (race-prone).

## Events / Notifications / Emails / WhatsApp
- Email: `sendAttendanceNotificationEmail` on new absent/leave OR status change to absent/leave. No WhatsApp. No in-app notification. No email on 'present'.

## AI Features
None.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| SMTP (Hostinger) | Absence emails | Included in existing mail plan | Reuses shared EmailService; paced to avoid rate limits |

## Validation Rules & Edge Cases
- Requires studentId, batchId, date, status; status ∈ present/absent/leave.
- Existing-record dedupe via day window (`dayStart`/`dayEnd`) — NOTE bug: create path uses `$lt: dayEnd` where dayEnd is 23:59:59.999, so effectively `<=` end; acceptable but inconsistent with `getBatchAttendance` which uses `$lte`.
- `getStudentAttendance` applies a ±12h timezone fudge on date filters (hacky; can over-select adjacent days).
- Bulk mark uses `Promise.allSettled` and reports saved/failed counts; individual failures swallowed.
- Percentage = present / total (absent+leave lower it; leave is NOT excluded from denominator — arguably wrong for approved leave).

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 80 | Full CRUD, bulk, summaries, CSV, range. Missing: no unique index (race), leave excluded from %, no audit trail beyond markedBy. |
| Frontend/UI | 60 | Pages exist (Attendance, MyAttendance, AttendanceReports) — see client audit; state coverage partial. |
| API | 80 | Complete REST surface; no pagination on batch summary (loads all records into memory). |
| Database | 70 | Good indexes but no unique (studentId,batchId,date) constraint; date stored as Date (tz ambiguity). |
| Automation | 55 | Auto-mark from live class + leave approval works; no auto-absent job for un-marked days. |
| AI | 0 | None. |
| Testing | 5 | No tests found. |
| **Overall** | **68** | Solid core, gaps in integrity, %-math, and automation. |

## Gaps (Not Implemented)
- **Validation:** No DB unique constraint → concurrent double-mark possible; no future-date guard; no batch-membership check that studentId actually belongs to batchId.
- **Automation:** No scheduled auto-mark-absent for students with no record on a class day.
- **Reports/Dashboard:** No trend charts, no low-attendance alerts/widgets, no per-course rollup.
- **%-logic:** Approved 'leave' counts against attendance %; no configurable min-attendance threshold.
- **Notifications:** No WhatsApp, no in-app notification, no parent/guardian copy, no low-attendance warning email.
- **Audit logs:** Only `markedBy` on latest write; no history of edits/deletes.
- **Empty/Error/Loading states:** Depends on client (partial).
- **Mobile:** Not verified.

## Technical Debt / Performance / Security / Scalability
- `getBatchAttendanceSummary` loads all attendance records for a batch and aggregates in JS — O(n) memory, no pagination; should use aggregation pipeline.
- ±12h timezone hack in `getStudentAttendance` is fragile; store/query in a fixed tz.
- Missing unique index is a data-integrity risk.
- CSV export escapes commas by replacing with `;` but does not escape embedded quotes in name/remarks (CSV injection / breakage possible).

## Suggestions & AI Opportunities
- Add unique compound index and upsert to remove race + the in-app dedupe.
- Replace summary with Mongo aggregation; exclude approved leave from denominator (configurable).
- Scheduled job to auto-mark absent + trigger low-attendance nudges (email/WhatsApp).
- AI: predict at-risk students from attendance trend; auto-summarize batch attendance health for instructors.

## Estimated Dev Effort
- Integrity + %-fix + aggregation: ~2–3 days.
- Auto-absent job + low-attendance alerts (email/WhatsApp/in-app): ~3 days.
- Dashboard widgets/charts + tests: ~3–4 days.
