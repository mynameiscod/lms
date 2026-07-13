# Live Class Attendance

**Completion:** 66%  |  **Priority:** P2  |  **Business Impact:** Medium

## Purpose & Business Goal
Automatically derive attendance for a 100ms live class from peer join/leave webhook events (watch-time), then push qualifying students into the main Attendance sheet as 'present'. Removes manual marking for online classes and ties live engagement to the compliance record.

## Primary Users & Roles
- No direct UI — fully event-driven (100ms webhook → server).
- Beneficiaries: **STUDENT** (auto-marked present), **INSTRUCTOR/ADMIN** (no manual marking for online classes; see result in Attendance module).

## Key Files (traced)
- Model: `server/src/models/LiveClassAttendance.ts` (liveClassId, userId, role, firstJoinedAt, lastSeenAt, totalSeconds, present, finalized; unique (liveClassId,userId)).
- Service: `server/src/services/liveClassAttendanceService.ts` (`recordJoin`, `recordLeave`, `finalizeAttendance`).
- Trigger: `liveClassController.hmsWebhook` (peer.join/leave/session-close) and `endLiveClass` (calls finalizeAttendance).

## Dependencies & Connected Modules
- **Live Classes** (webhook + end lifecycle), **100ms** (peer events + durations), **Attendance** (`attendanceService.markAttendance`), **User** (role + batch verification).

## Entry / Exit Points
- Entry: webhook `peer.join.success` → `recordJoin`; `peer.leave.success` → `recordLeave` (accumulates duration); `session.close.success`/`room.end.success` or instructor `end` → `finalizeAttendance`.
- Exit: `present` flag per row + a 'present' record in the main `attendances` collection for batch students.

## Database Tables & Relationships
- `liveclassattendances` — liveClassId→LiveClass, userId→User, tenantId. Unique per (liveClassId,userId). Finalized rows push into `attendances`.

## Events / Notifications / Emails / WhatsApp
- None directly. Downstream `markAttendance('present')` does NOT email (email only fires for absent/leave), so a present auto-mark is silent (correct).

## AI Features
None.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| 100ms | peer.join/leave webhook events + per-leave duration | Covered under Live Classes 100ms billing | Relies on webhook delivery; no cost of its own |

## Validation Rules & Edge Cases
- **Present threshold:** ≥ max(5 min, 40% of durationMin). Reasonable.
- Host (role broadcaster OR userId == instructorId) excluded from present count.
- Only pushes to main Attendance if class has batchId AND user is a STUDENT whose batchId matches the class batch AND not already finalized (idempotent).
- `finalizeAttendance` is idempotent per-row via `finalized` flag; can be re-run.
- **Reliability risk:** `recordLeave` trusts 100ms-supplied `duration`. If leave events are missed/dropped (network, hard-close), `totalSeconds` under-counts and a present student is marked absent-by-omission. `lastSeenAt - firstJoinedAt` is stored but NOT used as a fallback for watch time.
- **No absent marking:** finalize only marks 'present'; students who never joined are left with NO record (not marked absent). So the batch sheet is incomplete for online classes unless combined with a separate absent job.
- **Webhook trust:** because `/hms/webhook` is unauthenticated (see Live Classes), attendance can be spoofed by forging peer.join/leave events for arbitrary userIds.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 75 | Join/leave accumulation + threshold + finalize + idempotency implemented. Missing leave-fallback (use lastSeen-firstJoin), no absent marking, no reconciliation for dropped events. |
| Frontend/UI | 20 | No dedicated UI; results appear only inside Attendance pages. No per-class live attendance panel for the host. |
| API | 40 | No query endpoint to fetch a class's live-attendance breakdown; only side-effects. |
| Database | 85 | Clean model + unique constraint. |
| Automation | 80 | Fully automated via webhook + end lifecycle. |
| AI | 0 | None. |
| Testing | 5 | No tests; threshold/edge logic untested. |
| **Overall** | **66** | Works on the happy path; fragile to dropped webhooks and lacks absent-marking + host visibility. |

## Gaps (Not Implemented)
- **APIs:** No endpoint to view per-class attendance (who watched, how long, present/absent) — data exists but isn't surfaced.
- **Absent marking:** Enrolled batch students who didn't join aren't marked absent.
- **Reliability:** No fallback watch-time from firstJoined/lastSeen; no reconciliation job if session-close webhook never arrives.
- **Security:** Spoofable via unauthenticated webhook.
- **Dashboard:** No live "who's watching" panel for the instructor.
- **Offline/hybrid:** For hybrid/offline classes, no way to combine in-room manual + online auto attendance.

## Technical Debt / Performance / Security / Scalability
- Depends entirely on 100ms webhook fidelity; no retry/reconciliation safety net.
- `finalizeAttendance` loops rows and does per-row User lookup + markAttendance (N+1); fine for class sizes but not batched.
- Duplicate finalize triggers (both instructor-end and room-close webhook) are safe due to `finalized`/idempotency, but do redundant work.

## Suggestions & AI Opportunities
- Fall back to `lastSeenAt - firstJoinedAt` when leave-duration missing; add a reconciliation cron that finalizes classes ended >X min ago without a close event.
- Add absent marking for non-joiners in the class's batch.
- Expose a GET endpoint + host panel showing live attendance breakdown.
- Secure the webhook (HMAC) so attendance can't be forged.

## Estimated Dev Effort
- Reliability (fallback + reconciliation) + absent marking: ~2–3 days.
- Attendance-breakdown API + host panel: ~2 days.
