# Class Recordings

**Completion:** 64%  |  **Priority:** P2  |  **Business Impact:** Medium

## Purpose & Business Goal
Capture live-class recordings and surface them in the Class Hub as published, on-demand videos; enrich them with AI-generated notes/Q&A/practice from the transcript. Separately, provide end-to-end recording-pipeline telemetry (RecordingActivityLog) so admins can diagnose where a (browser-side) recording upload failed and recover it. Turns ephemeral live classes into reusable content and reduces "my recording vanished" support load.

## Primary Users & Roles
- **STUDENT** — watches imported recordings via Class Hub (LearningContentLibrary).
- **TENANT_ADMIN / INSTRUCTOR** — view Recording Diagnostics; get alerted on stale/lost recordings.
- **System** — importRecording + generateNotesFromTranscript run from the 100ms webhook.

## Key Files (traced)
- Service: `server/src/services/liveClassRecordingService.ts` (`importRecording`, `generateNotesFromTranscript`, `fetchTranscriptText`; Bunny pull).
- Model: `server/src/models/RecordingActivityLog.ts` (session telemetry timeline + derived status).
- Controller/Route: `server/src/controllers/recordingLogController.ts`, `server/src/routes/recordingLogRoutes.ts`.
- Cron: `server/src/jobs/recordingAlertCron.ts` (stale-recording alerts).
- Client: `client/src/pages/RecordingDiagnostics/index.tsx`.
- Entry: `hmsWebhook` (recording.success → importRecording; transcription.success → generateNotesFromTranscript).
- 100ms asset resolution: `hmsService.getRecordingDownloadUrl`.

## Dependencies & Connected Modules
- **100ms** (recording asset + presigned URL + transcript), **Bunny Stream** (pull/host recording), **Anthropic/Claude** (notes), **LearningContentLibrary** (Class Hub entry), **notificationService** (stale alerts), **LiveClass** (source).

## Entry / Exit Points
- Webhook: `recording.success`/`beam.recording.success` → set recordingUrl → `importRecording` (Bunny pull → published LearningContentLibrary video → link back to LiveClass).
- Webhook: `transcription/summary/transcript.success` → fetch text → `generateNotesFromTranscript`.
- Telemetry: `POST /recording-logs` (any user, per lifecycle event), `GET /recording-logs[/:sessionId]` (admin).
- Exit: published Class Hub video (+ AI notes/Q&A), admin diagnostics + stale alerts.

## Database Tables & Relationships
- `recordingactivitylogs` — tenantId, userId→User, sessionId (unique), events[] timeline, derived status. Indexes (tenantId,createdAt) & (tenantId,source,status).
- Recording output stored as `LearningContentLibrary` doc; `LiveClass.recordingContentId` links it.

## Events / Notifications / Emails / WhatsApp
- In-app admin alert (`createNotifications`) when a class_recording goes stale (>25 min, non-terminal) — via `recordingAlertCron` every 10 min; idempotent via `admin_alerted` event marker. No email/WhatsApp. No "recording ready" notice to students.

## AI Features
- **Claude (Anthropic)** via `aiComplete` (`module: 'live_class_notes'`, prefer anthropic, maxTokens 3000): transcript → summary + markdown notes + 5–8 Q&A + 3–5 MCQ/theory practice questions, attached to the Class Hub entry. Gracefully skips if transcript <200 chars or Anthropic disabled.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| 100ms | Recording asset + presigned URL + transcription add-on | Recording + transcription billed per 100ms plan (transcription is a paid add-on) | gs:// path resolved to HTTPS via API |
| Bunny Stream | Pull + host + stream recording | ~₹0.42/GB storage/mo + ~₹0.85/GB streamed | No server bandwidth (Bunny pulls source); falls back to time-limited presigned URL if Bunny unset |
| Anthropic (Claude) | Notes/Q&A/practice from transcript | ~₹0.20–₹1.25 per 1K output tokens (model-dependent) | Only when transcription webhook fires |

## Validation Rules & Edge Cases
- `importRecording` idempotent (skips if `recordingContentId` already set).
- Resolves gs:// → HTTPS presigned when needed; falls back to raw URL / upload source if Bunny not configured.
- Presigned URL is time-limited — if Bunny pull fails, the stored `videoUrl` will expire (broken playback later).
- Telemetry status never downgrades from a terminal state (saved/discarded).
- Telemetry endpoint always returns 200 even on error ("must never break recording flow").
- **Split responsibility:** the RecordingActivityLog pipeline (browser → Bunny direct upload) is a DIFFERENT recording path than the 100ms server-side recording import. Two recording mechanisms coexist (100ms auto-record vs client-side manual record telemetry).

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 70 | Import + AI notes + telemetry + stale alerts implemented. Missing: presigned-URL expiry safety, no retry if Bunny pull fails, no student notification. |
| Frontend/UI | 75 | RecordingDiagnostics page complete (filters + expandable event timeline). No student-facing "recording ready" surfacing beyond Class Hub. |
| API | 65 | Telemetry log + list/detail. No endpoint to re-trigger import or re-generate notes; no manual recover action. |
| Database | 85 | Rich telemetry model + good indexes. |
| Automation | 70 | Webhook-driven import + AI + stale-alert cron. No auto-retry/reconciliation for failed Bunny pulls. |
| AI | 70 | Notes pipeline solid but entirely dependent on the 100ms transcription add-on firing a webhook. |
| Testing | 5 | No tests. |
| **Overall** | **64** | Good telemetry + import + AI; fragile on Bunny-pull failure and transcript availability, dual recording paths. |

## Gaps (Not Implemented)
- **Recovery:** No admin action to re-trigger a failed import or re-run AI notes; diagnostics is read-only (can see the failure, not fix it).
- **Reliability:** No handling for Bunny pull failure (video ends up pointing at an expiring presigned URL), no retry/backfill.
- **Notifications:** No "recording ready" to students; stale alert is in-app only (no email/WhatsApp).
- **AI:** No fallback transcription if 100ms transcription add-on isn't enabled (e.g. own Whisper pass); notes silently never generate.
- **Reports/Dashboard:** No recording success-rate metrics/widget.
- **Security:** Import driven by unauthenticated webhook (spoofable content injection into Class Hub).

## Technical Debt / Performance / Security / Scalability
- Two recording paths (server 100ms import vs browser→Bunny telemetry) increase surface area and confusion.
- Presigned-URL expiry means fallback playback silently breaks after the URL TTL.
- Unauthenticated webhook can create arbitrary published Class Hub videos.
- `fetchTranscriptText` downloads up to 8MB into memory and JSON-parses heuristically.

## Suggestions & AI Opportunities
- Add "re-import" / "re-generate notes" admin actions + a Bunny-pull-status poller that retries and repoints videoUrl to the stable CDN URL.
- Notify students when a class recording is published.
- Own-Whisper transcription fallback so notes generate even without the 100ms add-on.
- AI: auto chapter markers, per-recording quiz auto-published, searchable transcript.

## Estimated Dev Effort
- Recovery actions + Bunny retry/repoint: ~3 days.
- Student notification + success-rate dashboard: ~2 days.
- Whisper transcription fallback: ~2–3 days.
