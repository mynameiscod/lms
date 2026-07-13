# Live Classes

**Completion:** 74%  |  **Priority:** P1  |  **Business Impact:** High

## Purpose & Business Goal
Deliver hybrid online/offline live classes on the 100ms "webinar" stage model: instructor broadcasts, 500+ students watch via HLS, and viewers can be brought "on stage" (raise-hand → two-way). Recording auto-starts and lands in the Class Hub; attendance is auto-derived from join/leave events. Core to the "live cohort" value prop.

## Primary Users & Roles
- **INSTRUCTOR / TENANT_ADMIN / SUPER_ADMIN** — schedule, start, host (broadcaster), bring-on-stage, end. Guard: `create_courses`/`edit_courses`/`manage_own_courses`/`manage_tenant`.
- **STUDENT** — list/view classes for THEIR batch, get join token (viewer/HLS).

> Note: two live systems coexist. **LiveClass** (`/hms-classes`, 100ms) is the current one. **LiveSession** (`/live-classes`, Jitsi room-name only) is a legacy stub (see live-classes-legacy note in Recordings/this file's Tech Debt). Meeting (`/meetings`) is a separate CRM lead-meeting concept.

## Key Files (traced)
- Model: `server/src/models/LiveClass.ts` (mode, instructor, batchId/courseId, scheduledAt, durationMin, hmsRoomId, hlsUrl, status scheduled/live/ended/cancelled, startedAt/endedAt, reminderSent, recording fields).
- Route: `server/src/routes/liveClassRoutes.ts`; Controller: `server/src/controllers/liveClassController.ts` (create/list/get/update/delete/start/join-token/change-role/hls-url/end + `hmsWebhook`).
- Service: `server/src/services/hmsService.ts` (JWT mgmt+auth tokens, createRoom, changeRole, endRoom, getRecordingDownloadUrl).
- Cron: `server/src/jobs/liveClassReminderCron.ts`.
- Legacy: `server/src/models/LiveSession.ts`, `liveSessionController.ts`, `liveSessionRoutes.ts`.

## Dependencies & Connected Modules
- **100ms** (rooms, tokens, HLS, recording, webhooks), **settingsService** (HMS keys/template per tenant), **User/Batch** (batch scoping), **Live Class Attendance** (finalizeAttendance), **Class Recordings** (importRecording, AI notes), **LearningContentLibrary** (Class Hub entry), **notificationService + EmailService** (reminders).

## Entry / Exit Points
- `POST/GET/PATCH/DELETE /hms-classes`, `POST /hms-classes/:id/start|end|hls-url|change-role`, `POST /hms-classes/:id/join-token`.
- Public webhook: `POST /hms/webhook` (recording.success, transcription.success, peer.join/leave.success, session/room close).
- Exit: 100ms room, HLS stream, recording → Class Hub, attendance, reminder email/in-app.

## Database Tables & Relationships
- `liveclasses` — tenantId, instructorId/createdBy→User, batchId→Batch, courseId→Course, recordingContentId→LearningContentLibrary. Indexes on (tenantId,status,scheduledAt), (tenantId,batchId), hmsRoomId.

## Events / Notifications / Emails / WhatsApp
- Reminder cron (every 5 min, 20-min window): in-app `createNotifications` + email `sendGenericEmail` to batch students; idempotent via `reminderSent`. No WhatsApp. No "class started now" push. No reminder if class has no batch.

## AI Features
- Post-class: Claude (`aiComplete`, `module: 'live_class_notes'`, `prefer: 'anthropic'`) generates summary + notes + Q&A + MCQ/theory practice from the 100ms transcript (see Class Recordings). Model = Anthropic (Claude) via aiGateway; skips if transcript <200 chars or Anthropic disabled.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| 100ms | Live rooms, HLS webinar, recording, transcription | Video-conf minutes ~₹0.35–₹0.90/participant-min (tier-dependent); HLS streaming + recording + transcription add-on billed separately. 10,000 free min/mo on free tier | Per-min cost scales with 500+ viewers — HLS is cheaper per-viewer than SFU; verify tenant plan |
| Bunny Stream | Store/serve recording (pull) | ~₹0.42/GB storage/mo + ~₹0.85/GB streamed (region-dependent) | Recording imported here (see Class Recordings) |
| Anthropic (Claude) | Notes/Q&A from transcript | ~₹0.20–₹1.25 per 1K output tokens (model-dependent) | maxTokens 3000/class |

## Validation Rules & Edge Cases
- Start requires 100ms configured (`isHmsConfigured`); room created lazily on start.
- join-token: 409 if not live; students blocked (403) if class batch ≠ their batch; host = admin or instructorId.
- Students list only shows classes for their batch; no batch → empty list.
- endClass clears hlsUrl, ends 100ms room (best-effort), finalizes attendance async.
- Webhook always returns 200 (avoids 100ms retry storms).
- **Security gap:** `POST /hms/webhook` has NO signature/HMAC verification — any actor can POST fake recording/peer events (spoof attendance, inject Class Hub content). 100ms supports webhook signing; not verified here.
- hlsUrl is client-reported (`setHlsUrl`) — trusts the host client.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 78 | Full lifecycle + tokens + webhook + reminder. Missing webhook auth, cancel flow (status enum has 'cancelled' but no endpoint), rejoin/host-transfer. |
| Frontend/UI | 85 | `HmsClasses/index.tsx` (schedule/list/lifecycle) + `HmsClasses/Room.tsx` (430 lines): host lobby/screen-share/mute/HLS go-live, on-stage panel, bring-on-stage, ask-unmute, chat; viewer HLS (hls.js), raise-hand, chat. Full state coverage. Legacy `LiveClass/index.tsx` = Jitsi. |
| API | 80 | Comprehensive; no pagination beyond limit 200; no analytics endpoint. |
| Database | 80 | Good model + indexes. |
| Automation | 75 | Reminder cron + auto-attendance + auto-recording import + AI notes are wired. No auto-end for abandoned live classes. |
| AI | 70 | Transcript→notes/Q&A implemented but depends on 100ms transcription add-on being enabled + webhook firing. |
| Testing | 5 | No tests found. |
| **Overall** | **74** | Strong architecture + polished room UI; key gaps = webhook security, cancel flow, no WhatsApp, legacy-system overlap. |

## Gaps (Not Implemented)
- **Security:** Webhook signature verification (critical), rate-limiting on public webhook.
- **Features:** No cancel endpoint (enum exists), no reschedule notification, no host transfer, no in-class chat/Q&A persistence, no attendance-visible-to-host live panel, no auto-end of stuck 'live' classes.
- **Notifications:** No WhatsApp, no "we're live now" push, no post-class "recording ready" notification to students.
- **Reports/Dashboard:** No per-class attendance/engagement report, no instructor dashboard widget.
- **Legacy debt:** LiveSession (Jitsi) system still mounted at `/live-classes` — dead/parallel path.
- **Permissions:** hlsUrl trust; webhook trust.
- **Mobile:** HLS viewer mobile support unverified.

## Technical Debt / Performance / Security / Scalability
- **Two parallel live systems** (LiveClass/100ms vs LiveSession/Jitsi) — confusing, LiveSession appears vestigial with no real join integration.
- Unauthenticated webhook is the top security risk.
- Reminder cron runs on every instance via setInterval — multi-instance (blue/green) could double-send (no distributed lock).
- No cleanup of orphaned 'live' classes if end is never called.

## Suggestions & AI Opportunities
- Add 100ms webhook HMAC verification immediately.
- Add cancel + reschedule (with notification) endpoints; auto-end classes stuck 'live' past scheduledAt+duration+grace.
- Retire or clearly separate LiveSession/Jitsi.
- AI: live auto-captions, post-class chapter markers, engagement scoring from watch-time, auto-generate a "class recap" WhatsApp/email.

## Estimated Dev Effort
- Webhook security + cancel/reschedule + auto-end: ~3–4 days.
- Notifications (WhatsApp + recording-ready): ~2 days.
- Retire legacy Jitsi + instructor analytics dashboard: ~3–4 days.
