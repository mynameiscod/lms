# Notifications
**Completion:** 55%  |  **Priority:** P2  |  **Business Impact:** Medium

## Purpose & Business Goal
In-app notification centre — deliver placement, learning, and general alerts to users (bell badge + list). Backs the "you're placed", "drive open", "assignment due", "class starts soon" nudges that drive engagement.

## Primary Users & Roles
- All authenticated roles receive notifications (STUDENT primarily; STAFF get hot-lead alerts via a separate socket room).
- No admin "compose & broadcast" UI — notifications are only created programmatically by services.

## Key Files (traced)
- Model: `server/src/models/Notification.ts`.
- Service: `server/src/notifications/notificationService.ts` (`createNotifications`, event-bus listeners).
- Controller/Routes: `server/src/notifications/notificationController.ts`, `notificationRoutes.ts` (4 endpoints).
- Client: `client/src/pages/NotificationCenter/`.
- Realtime socket rooms wired in `server/src/server.ts` (`tenant_`, `staff_`, `course_`).

## Dependencies & Connected Modules
- **Placement** (drive created/deadline/status → notifications + email).
- **Learning** (assignment/drill/interview/speaking/live-class/recording reminders via crons → `createNotifications`).
- **Communication Lab** (streak nudges).
- **Email** (placement drive email dispatched alongside in-app notification).
- 13+ files across the codebase call `createNotifications`.

## Entry / Exit Points
- Entry (read): `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`.
- Entry (write): internal only via `createNotifications(tenantId, userIds[], type, title, body, link)`.
- Exit: JSON list (50 cap), unread badge count.

## Database Tables & Relationships
- **Notification** (tenantId→Tenant, userId→User): type `placement_drive_new`|`placement_deadline`|`placement_status`|`general`, title, body, link, read; `createdAt` only. Indexes: userId+read+createdAt, tenantId+userId.

## Events / Notifications / Emails / WhatsApp
- Placement-drive-created event → in-app + `sendNewDriveEmail` (eligibility-filtered by branch/year/CGPA).
- Placement status/round → in-app + email (`placementStatusService`).
- Cron-driven reminders (due dates, live class, speaking, interview, recording, communication streak).
- **No Socket.io push of notifications** — client polls `/unread-count`. No SMS/push.

## AI Features
None.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| SMTP (Hostinger) | Email that accompanies placement notifications | ~₹0 (bundled) | Per-event, not batched |
| Socket.io | Realtime rooms exist but NOT used for notification delivery | ₹0 | Only live-class/hot-lead use it |

## Validation Rules & Edge Cases
- Type enum enforced at model level; no input validation on internal create (services insert directly).
- Read/unread tracked; bulk read-all supported.
- `createNotifications` wrapped in try/catch by callers (non-fatal) — a notification failure never breaks the parent action.

## Completion Breakdown
| Dimension | % | Reasoning |
| Backend | 60 | Create + retrieve + event listeners + email dispatch work. Missing: templates, per-user preferences, retries, admin broadcast. |
| Frontend/UI | 40 | NotificationCenter lists + badge. Missing: realtime update, filters, detail view, grouping. |
| API | 50 | 4 read endpoints. Missing: preferences, admin send, pagination beyond 50. |
| Database | 85 | Clean schema + right indexes. Missing: TTL/archival, soft-delete. |
| Automation | 70 | Cron + event-bus driven creation works. Missing: retry, digest batching. |
| AI | 0 | None. |
| Testing | 0 | No tests. |
| **Overall** | **55** | Works as a polled in-app centre; delivery is limited (no realtime push, email-only side channel). |

## Gaps (mark "Not Implemented")
- **Realtime:** Socket.io push delivery of notifications — Not Implemented (poll-only).
- **Channels:** SMS, mobile push, WhatsApp for generic notifications — Not Implemented.
- **Preferences:** per-user notification settings/opt-out — Not Implemented.
- **Admin:** compose/broadcast UI, targeted announcements — Not Implemented.
- **Automation:** email digest batching (currently one email per event), retry on failed send — Not Implemented.
- **Data:** TTL/archival, notification history export — Not Implemented.

## Technical Debt / Performance / Security / Scalability
- Client polling for unread-count adds request load at scale; a socket push would be cheaper.
- No pagination on list (hard 50 cap) — older notifications inaccessible.
- Per-event emails can burst SMTP (relies on emailService pacing).

## Suggestions & AI Opportunities
- Push notifications over the existing Socket.io `tenant_`/user rooms (infra already present).
- Add per-user preferences + daily digest option.
- AI opportunity: summarize a user's unread notifications into a single "here's what you missed" digest.

## Estimated Dev Effort
~4–6 dev-days: socket push (1–2d), preferences model+UI (1–2d), admin broadcast (1d), digest/pagination (1d).
