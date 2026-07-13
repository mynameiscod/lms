# AI Communication Lab
**Completion:** 90%  |  **Priority:** P1  |  **Business Impact:** High

## Purpose & Business Goal
Daily self-introduction speaking practice for Indian engineering freshers: record (audio/video) → Whisper transcription → server-computed speech metrics → Claude AI evaluation (14 scored dimensions) → streak + achievements + leaderboard → instructor review/override. Builds interview-ready spoken communication, a top placement blocker. The most complete and polished module in the CareerPilot suite.

## Primary Users & Roles
- **STUDENT** — fills a communication profile, gets a rotating daily challenge, records, sees scored feedback, streak, progress, achievements, batch leaderboard.
- **TENANT_ADMIN / INSTRUCTOR** (roleGuard: `manage_communication_lab`/`create_courses`/`edit_courses`/`manage_own_courses`/`manage_tenant`) — monitoring dashboard, per-student table with risk flags, challenge CRUD + reorder, per-attempt manual feedback + audited score override + re-attempt request.

## Key Files (traced)
- Models (7): `CommunicationProfile`, `CommunicationChallenge`, `CommunicationAttempt` (embedded `IEvaluation`), `CommunicationStreak`, `CommunicationAchievement`, `CommunicationInstructorFeedback`, `CommunicationAuditLog` (all in `server/src/models/`).
- Route: `server/src/routes/communicationRoutes.ts` — 20 endpoints (admin declared before `/:id` student routes); multer 200 MB temp upload.
- Controller: `server/src/controllers/communicationController.ts` (507 lines).
- Services: `communicationEvalService.ts` (215 lines — metrics + template + Claude/GPT eval), `communicationGamificationService.ts` (117 lines — achievements + leaderboard). Whisper via `speakingService.transcribeFile`.
- Job: `server/src/jobs/communicationReminderCron.ts` (hourly).
- Seed: `server/src/seed/communicationChallenges.ts` (30 self-intro variations).
- Client: `client/src/pages/CommunicationLab/index.tsx` (6-tab student UI + recorder + result modal), `client/src/pages/CommunicationLabAdmin/index.tsx` (dashboard/challenges/students).
- Test: `server/src/tests/communicationLab.test.ts` (~13 unit tests — metrics, template, achievements).

## Dependencies & Connected Modules
- **Whisper STT** (reuses `speakingService.transcribeFile`), **Bunny Storage** (recordings), **aiClients/settingsService** (Claude/GPT + leaderboard toggle), **aiGateway.recordUsage** (cost tracking), **notificationService** (in-app), **Tenant.modules.aiCommunicationLab** (module gating).

## Entry / Exit Points
- Entry: `/api/v1/communication/*`; student page (route `/ai-communication-lab`).
- Exit: `improvedIntroduction` text; instructor `interviewReady` flag; feeds mock-interview readiness narratively.

## Database Tables & Relationships
- `communicationprofiles` (1 per student, unique `{tenantId, studentId}`) → context for eval.
- `communicationchallenges` (admin-managed, batch-scoped, seeded) → `communicationattempts` (per challenge/day; embedded `IEvaluation` with 14 scores + speech metrics + qualitative arrays + `aiProvider/aiModel`).
- `communicationstreaks` (1 per student, server-authoritative).
- `communicationachievements` (1 per student+code, 10 badges).
- `communicationinstructorfeedbacks` (1 per attempt, unique) + `communicationauditlogs` (append-only override trail).

## Events / Notifications / Emails / WhatsApp
- **In-app only** (via notificationService): (1) on submit "practice was scored"; (2) hourly cron nudge for active streaks not completed today (dedup by `lastRemindedDate`, tenant-module-gated); (3) instructor re-attempt request.
- **No email / SMS / WhatsApp.**

## AI Features
| Feature | Provider / Model | Purpose |
|---|---|---|
| Transcription (STT) | **OpenAI `whisper-1`** (hardcoded, verbose_json, 300s timeout) | Transcript + duration |
| Evaluation | **Claude (`INTERVIEW_AI_MODEL`, default `claude-sonnet-4-6`)** → OpenAI (`OPENAI_MODEL`, json_object) fallback → empty safe-fallback | 14 scored dimensions + strengths/areas/missing + grammar/sentence fixes + improved intro + coach message; strict JSON, all clamped 0-100 |
| Speech metrics | **None (deterministic server code)** | WPM/status, filler counts (18-word list, boundary-safe), repeated 3-word phrases — authoritative, never AI/client-trusted |
| Personalized template | **None (string builder from profile)** | Fill-in self-intro scaffold |
| Visual metrics (eye contact/expression/posture) | **Not Implemented** | Always null → UI shows "Not Evaluated" |

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| OpenAI Whisper (`whisper-1`) | STT | ~₹0.5 / audio-minute (~$0.006/min) | Per 3-min practice ≈ ₹1.5; usage recorded to aiGateway |
| Anthropic Claude Sonnet 4.x | Evaluation (2,000 out tokens) | ~₹250 / 1M in, ~₹1,250 / 1M out | Per eval ≈ ₹2–4; usage recorded |
| OpenAI GPT-4o-mini | Eval fallback | ~₹12–15 / 1M in, ~₹50 / 1M out | Only if Anthropic disabled |
| Bunny Edge Storage | Recording storage | ~₹0.85/GB/mo storage (~$0.01/GB) + egress | Per-recording key path; streamed, never buffered; keys never sent to client |

Per-student-per-day cost ≈ ₹4–6 (Whisper + Claude + storage).

## Validation Rules & Edge Cases
- Max attempts/challenge/day enforced (429); profile strings ≤500 chars, arrays ≤30; recording ≤200 MB; score override clamped 0-100 and audited; batchIds ObjectId-validated; challenge title required.
- Streak idempotent per day (completedDates check), yesterday-continuity logic, bounded to last 400 days.
- Transcription failure is non-fatal (eval proceeds, notes low content).
- Gaps: no upload MIME validation; practiceDate trusts client timezone string; possible race on double-submit within one request; leaderboard has no anti-cheat/anomaly detection.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 95 | Full pipeline, streak/gamification, admin monitoring, audited overrides, module gating |
| Frontend/UI | 92 | 6-tab student UI, full recorder state machine (setup→countdown→rec→submit), rich result modal, admin dashboard/challenges/students + review form |
| API | 95 | 20 endpoints covering student + admin comprehensively |
| Database | 95 | 7 well-indexed models, unique constraints, append-only audit |
| Automation | 70 | Hourly streak reminder cron (in-app only; no email/WhatsApp) |
| AI | 90 | Whisper + Claude/GPT + deterministic metrics; visual analysis intentionally absent |
| Testing | 35 | Real unit tests for metrics/template/achievements; no API/DB/integration tests |
| **Overall** | **90** | Production-grade, deployed; gaps = video analysis, multi-channel reminders, deeper tests |

## Gaps (Not Implemented)
- **Features:** Video frame analysis (eye contact/expression/posture always null); per-challenge custom rubric; challenge progression tree; audio-vs-video leaderboard split; peer review; re-review recording before submit.
- **APIs:** No CSV/report export of batch performance.
- **Validation:** Upload MIME check; server-side timezone normalization; double-submit race guard.
- **Automation:** Reminders in-app only — no email/WhatsApp despite high drop-off risk on daily-habit product.
- **Notifications:** No multi-channel; no "streak lost" or milestone celebration email.
- **Reports/Dashboard widgets:** Admin dashboard exists (KPIs + batch bars) but no exportable reports, no trend-over-time charts.
- **Analytics:** No anomaly/cheat detection; no cohort trend analytics.
- **Security:** Solid (recordingKey stripped, ownership checks, audited overrides).
- **AI:** No visual/body-language scoring (biggest AI gap); single model across tenants.
- **Error/Loading/Empty states:** Comprehensive across all tabs and recorder.
- **Permissions:** Proper roleGuard on admin routes.
- **Audit logs:** Present for score overrides (append-only).
- **Mobile:** Recorder uses MediaRecorder; mobile behavior not verified.

## Technical Debt / Performance / Security / Scalability
- Submit is fully synchronous (Whisper + Bunny + Claude) — request can take 20–40s; no async job/queue, risks timeouts under load. A background-status pipeline (`status` enum already models it) would improve resilience.
- Whisper model hardcoded (bypasses Platform Settings).
- Leaderboard aggregates over all completed attempts per request — fine now, could need caching at scale.

## Suggestions & AI Opportunities
- Add email/WhatsApp reminder channels (habit product — retention hinges on nudges).
- Make submit async (return "evaluating", poll/notify) to remove request-time risk.
- AI opportunity: real video frame analysis (eye contact/expression/posture) to fill the null visual scores; per-challenge adaptive rubric; AI "interview readiness" gate that feeds the mock-interview milestone; cheat/anomaly detection on leaderboard.
- Export batch reports for trainers; trend charts.

## Estimated Dev Effort
- Async submit pipeline + status polling UX: ~3 dev-days.
- Email/WhatsApp reminders: ~2 dev-days.
- Video frame analysis (integrate a vision model/service): ~1.5–2 weeks.
- Reports/exports + integration tests: ~4 dev-days. **Total to "97%" (excl. video AI): ~2 weeks; with video AI: ~4 weeks.**
