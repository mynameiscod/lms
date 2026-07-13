# Speaking Practice (Legacy)
**Completion:** 80%  |  **Priority:** P4  |  **Business Impact:** Low (retired from students)

## Purpose & Business Goal
The original recurring speaking-practice feature: admins define scheduled recurring tasks (e.g. "Self Introduction, Mon & Thu, Batch X"); students record responses that are Whisper-transcribed and AI-scored across 6 dimensions; leaderboard + admin compliance tracking. **Superseded by the AI Communication Lab** (richer 14-dimension eval, streaks, gamification). Retained but retired from the student experience; still the source of the reusable Whisper transcription (`transcribeFile`) that Communication Lab depends on.

## Primary Users & Roles
- **STUDENT** — pending tasks (computed occurrences), record/submit, submission history, leaderboard.
- **TENANT_ADMIN / INSTRUCTOR** (roleGuard: `create_courses`/`edit_courses`/`manage_own_courses`/`manage_tenant`) — task CRUD, submission list, weekly compliance dashboard.

## Key Files (traced)
- Models: `server/src/models/SpeakingTask.ts` (44 lines), `SpeakingSubmission.ts` (55 lines).
- Route: `server/src/routes/speakingRoutes.ts` — 11 endpoints; multer 200 MB temp.
- Controller: `server/src/controllers/speakingController.ts` (249 lines).
- Service: `server/src/services/speakingService.ts` (121 lines) — occurrence math, **Whisper `transcribeFile` (shared infra)**, `evaluateSpeaking`, `weekKey`.
- Job: `server/src/jobs/speakingReminderCron.ts` (daily 08:00).
- Client: `client/src/pages/SpeakingPractice/index.tsx`, `client/src/pages/SpeakingAdmin/index.tsx`.

## Dependencies & Connected Modules
- **Whisper** (own `transcribeFile`, reused by Communication Lab), **Bunny Storage**, **aiClients/settingsService**, **notificationService**.

## Entry / Exit Points
- Entry: `/api/v1/speaking/*`. Exit: none.

## Database Tables & Relationships
- `speakingtasks` — `tenantId` (string), batch-scoped, `days[]` schedule, min/max seconds, status. Occurrences computed on the fly (no cron for scheduling).
- `speakingsubmissions` — `taskId → SpeakingTask`, `studentId → User`, unique `{tenantId, taskId, studentId, dueDate}`; embedded `score` (overall/fluency/clarity/structure/confidence/vocabulary) + `feedback`.

## Events / Notifications / Emails / WhatsApp
- **In-app only:** daily 08:00 cron reminds students in a task's batch who haven't recorded today's occurrence. No email/WhatsApp.

## AI Features
| Feature | Provider / Model | Purpose |
|---|---|---|
| Transcription | **OpenAI `whisper-1`** | Transcript + duration (usage recorded) |
| Evaluation | **Claude (`INTERVIEW_AI_MODEL`, default `claude-sonnet-4-6`)** → OpenAI (`OPENAI_MODEL`) fallback | 6-dimension score + summary/strengths/improvements; **eval usage NOT recorded** to aiGateway |

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| OpenAI Whisper | STT | ~₹0.5/audio-min | Usage metered |
| Claude Sonnet 4.x | Eval (1,200 out tokens) | ~₹250/1M in, ~₹1,250/1M out | ~₹1–2/submission; not metered |
| Bunny Storage | Recordings | ~₹0.85/GB/mo | Key `speaking/<tenant>/<student>/…`; key stripped from responses |

## Validation Rules & Edge Cases
- Submit requires file + taskId + dueDate; Bunny must be configured; upsert keyed on occurrence (one submission per task/day/student). Transcription failure non-fatal.
- Occurrence math bounds a -10..+7 day window, respects start/end dates; topic rotates weekly.
- Gaps: no server-side min/maxSeconds enforcement (client-only); no `endDate>=startDate` / `minSeconds<=maxSeconds` checks; deleting a task orphans submissions; no upload MIME validation.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 88 | Complete task/occurrence/submission/compliance logic; some validation gaps + no cascade |
| Frontend/UI | 85 | Full record modal, history with score bars, leaderboard, admin task form + compliance cards |
| API | 85 | 11 endpoints cover student + admin |
| Database | 85 | Good unique index; orphan-on-delete |
| Automation | 75 | Daily reminder cron (in-app) |
| AI | 85 | Whisper + Claude/GPT eval; eval not metered |
| Testing | 0 | No tests |
| **Overall** | **80** | Functionally complete but deprecated; low priority given Communication Lab supersedes it |

## Gaps (Not Implemented)
- **Features:** Superseded — no streaks/gamification (by design); no video body-language.
- **Validation:** Server-side duration enforcement, date/second ordering, cascade delete on task removal.
- **Automation:** In-app reminder only; no email/WhatsApp.
- **Notifications:** No score-ready notification (unlike Communication Lab).
- **Reports/Analytics:** Compliance dashboard exists; no export/trends.
- **AI:** Eval usage not recorded to cost dashboard.
- **Security:** OK (recordingKey stripped, tenancy-scoped). **Audit logs / Mobile:** None / not verified.

## Technical Debt / Performance / Security / Scalability
- Redundant with Communication Lab — candidate for consolidation/retirement once the shared `transcribeFile` is extracted to a neutral util.
- Synchronous submit (Whisper + Bunny + Claude) blocks the request.
- No cascade cleanup of submissions/Bunny objects on task delete.

## Suggestions & AI Opportunities
- Extract `transcribeFile` into a shared `sttService` so Communication Lab no longer imports from a legacy module, then formally retire Speaking Practice.
- If kept: add server-side duration enforcement, cascade delete, and eval metering.

## Estimated Dev Effort
- Extract shared STT util + retire student UI: ~2 dev-days.
- Or harden (validation/cascade/metering) if retained: ~2–3 dev-days.
