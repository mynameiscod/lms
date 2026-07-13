# AI Virtual Interview
**Completion:** 80%  |  **Priority:** P1  |  **Business Impact:** High

## Purpose & Business Goal
The flagship: a real Claude-powered mock interview in two flavours — **Structured** (section-by-section text/audio/video/MCQ/code questions, snapshotted from the template, each answer auto-graded) and **Conversational** (a live, spoken, voice+avatar interview driven turn-by-turn by Claude, graded from the transcript). Produces per-question + per-category scores (communication/HR/technical), overall %, pass/fail, readiness level, strengths/weaknesses, recommended practice, and a rich feedback report. Business goal: give candidates realistic, on-demand, AI-graded interview practice and readiness signal — the core differentiator of "CareerPilot by CodeBegun".

## Primary Users & Roles
- **STUDENT** — takes attempts (permission `attempt_interviews`): start, answer, converse, skip, complete-section, submit, upload recording, view report, view analytics.
- **TENANT_ADMIN / INSTRUCTOR** — evaluate/publish attempts (`evaluate_interviews`), view any report.

## Key Files (traced)
- `server/src/models/InterviewAttempt.ts` — deep schema: sectionAttempts → questionResponses (answer + evaluation + categoryScores), conversational `conversation[]`, communication/hr/technicalScores, AI cost fields, Bunny recording fields, session/tab tracking.
- `server/src/services/interviewAIService.ts` (504 lines) — the LLM brain: `evaluateAnswer` (L166), `summarizeAttempt` (L239), `generateQuestions` (L295), `nextInterviewerTurn` (L407, live), `evaluateTranscript` (L464), cost via `costOf` (L40); resilient model fallbacks (L27) resolving from Platform Settings.
- `server/src/services/interviewTemplateService.ts` — `startAttempt` (L442, snapshot+resume+join-window), `saveAnswer` (L747, auto-eval + cost accrual), `converseTurn` (L673, live loop), `evaluateConversationalAttempt` (L710), `submitAttempt` (L875, aggregation+pass/fail), `evaluateQuestionResponse` (L1331, MCQ→AI→keyword fallback), `calculateSectionCategoryScores` (L1487), `aiGenerateOverallFeedback`/`generateOverallFeedback` (L1533/L1571).
- `server/src/services/elevenLabsService.ts` (TTS), `server/src/services/didService.ts` (D-ID talking-head WebRTC proxy).
- `server/src/controllers/interviewTemplateController.ts` — `startAttempt`, `saveAnswer`, `converse`, `skipQuestion`, `completeSection`, `submitAttempt`, `getAttemptReport`, `getVoiceConfig`/`ttsSpeak`, `didCreate/Sdp/Ice/Talk/Close`, `uploadAnswerRecording`, `saveAttemptRecording`.
- Client: `TakeStructuredInterview/index.tsx` (641), `LiveInterview/index.tsx` (309) + `didAvatar.ts`, `StudentInterviewHub/index.tsx` (362).

## Dependencies & Connected Modules
- **Templates + Question Bank** — source of sections/questions.
- **Assignments** — attempt validated against assignment (attempts, join-window).
- **Bunny Stream** — continuous video recording (tus resumable upload from FE).
- **Platform Settings** — AI model, prices, voice/avatar provider + keys resolve live per-tenant.
- **Analytics & Feedback Reports** — downstream consumer.

## Entry / Exit Points
- Entry: `POST /student/attempts/start`; answer/converse/skip/complete-section/submit; `/upload-answer`, `/recording`; TTS + D-ID voice endpoints.
- Exit: `getAttemptReport` (student + admin), `getStudentAnalytics`, assignment best/latest score update, optional admin `evaluate`→`publish`.

## Database Tables & Relationships
- `interviewattempts` — refs Tenant, User(student/evaluatedBy), InterviewTemplate, InterviewAssignment; embedded sections/questions/conversation.
- Unique `{studentId,templateId,attemptNumber}`; indexes on status/submittedAt.

## Events / Notifications / Emails / WhatsApp
- **None on attempt submit/publish** — no "your result is ready" notification/email (gap). Reminders come from the assignment cron (start-soon, in-app only).

## AI Features (which model)
- **Claude** (Anthropic) — answer evaluation, attempt summary, live interviewer turns, transcript grading, question generation. Model configurable (`INTERVIEW_AI_MODEL` w/ sonnet fallbacks). Graceful deterministic fallback (MCQ exact-match; keyword-coverage 70/30 length scoring; canned readiness feedback) when AI disabled/failing.
- **ElevenLabs** — TTS voice for the interviewer (`eleven_turbo_v2_5`, low-latency), else browser Web Speech / Microsoft neural fallback.
- **D-ID** — optional talking-head avatar via WebRTC streams (server-proxied create/sdp/ice/talk/close).

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| Claude (Anthropic) | Grade answers, summarize, drive live interview, grade transcript | ≈ ₹250 in / ₹1250 out per 1M tokens (from `INTERVIEW_AI_PRICE_IN=3`/`_OUT=15` USD defaults). A structured attempt (~6 answers + summary) ≈ ₹3–8; a live conversational interview (~12 turns + transcript grade) ≈ ₹8–20 | Cost tracked per-attempt (`aiInputTokens`/`aiOutputTokens`/`aiCostUsd`) and rolled up in admin analytics |
| ElevenLabs TTS | Natural interviewer voice | ≈ ₹0.15–0.25 per 1K chars (Starter/Creator tiers) | Optional; browser TTS is free fallback. Live interview may synth ~2–5K chars → ≈ ₹1–2/interview |
| D-ID Streams | Talking-head avatar (WebRTC) | ≈ ₹1.2–1.8 per streamed minute (approx from ~$0.015–0.02/min) | Optional; animated emoji avatar is free fallback. A 20-min interview ≈ ₹25–35 if enabled |
| Bunny Stream | Continuous interview video recording + playback | ≈ ₹0.85/GB storage/mo + ₹0.85/GB delivery (approx $0.01/GB) | Structured attempts record one continuous video via tus upload |

## Validation Rules & Edge Cases
- Expiry, max-attempts, reattempt cooldown, resume-window (auto-submit on expiry), scheduled join-window all enforced in `startAttempt`.
- Snapshot never leaks correct answers / `isCorrect` to the student payload.
- MCQ auto-graded exactly; open answers AI-first with keyword fallback; skipped/unanswered → 0 (auto-marked skipped on submit).
- Pass/fail: all sections passed AND overall ≥50% → pass; nothing completed → incomplete.
- Tab-detection violations + disconnect count tracked; FE auto-submits on 3+ tab switches (if `blockMultipleTabs`).
- Conversational grading is **fully AI-dependent** — if `evaluateTranscript` fails, only a canned fallback (no partial scoring).
- Edge gaps: no server-side enforcement of `perQuestionTimeLimit`/`sectionTimeLimit` (FE timer only); AI cost has no per-tenant budget cap.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 90 | Robust lifecycle, dual-mode grading, cost tracking, deterministic fallbacks |
| Frontend/UI | 80 | Take (641) + Live (309) + Hub (362) are rich; stubbed rich-text toolbar, no live error-recovery button, mobile untested |
| API | 92 | Full attempt + voice + D-ID + recording endpoints |
| Database | 95 | Very complete attempt schema |
| Automation | 70 | Auto-submit on resume-expiry & tab-violations; no result-ready notification |
| AI | 85 | Real Claude grading + live interviewer + transcript grading; conversational scoring has no partial fallback; time-limits not server-enforced |
| Testing | 5 | No tests found for scoring/grading |
| **Overall** | **80** | Powerful, production-shaped feature; polish + notifications + tests are the gaps |

## Gaps
- **Notifications — Not Implemented:** no "result ready / feedback published" notification or email to the student on submit/publish.
- **AI — Partial:** conversational transcript grading has no partial fallback; follow-up triggers from bank unused; no server-enforced time limits.
- **UX — Not Implemented:** `TakeStructuredInterview` rich-text toolbar buttons are non-functional stubs; `LiveInterview` connection error has no retry button; mobile layout (multi-column, hard-coded canvas width) breaks on small screens.
- **Security:** AI cost has no tenant budget cap / rate limit; D-ID/ElevenLabs keys server-side (good) but no per-attempt spend ceiling.
- **Automation:** no async/queued grading — `saveAnswer` grades synchronously (each answer blocks on a Claude call, adding latency mid-interview).
- **Error/Loading/Empty states:** structured attempt handles most; live interview lacks recovery; report handles "not ready".
- **Audit logs — Not Implemented** for admin score overrides.

## Technical Debt / Performance / Security / Scalability
- **Synchronous grading in `saveAnswer`** means every "Save & Next" waits on Claude (~2–5s) — hurts UX at scale; move to background grade-on-submit or a queue.
- Large embedded attempt docs (video URLs, transcripts, per-question feedback) — fine, but watch 16MB doc limit for very long conversational interviews.
- Local-disk answer recordings (`/uploads/interview-recordings`) won't survive container swaps unless volume-mounted; Bunny path is the durable one.

## Suggestions & AI Opportunities
- Defer answer grading to submit-time (or a job queue) so mid-interview navigation is instant.
- Add result-ready notification (email + in-app + optional WhatsApp).
- Wire follow-up triggers into `nextInterviewerTurn` for adaptive probing.
- Enforce per-question/section time limits server-side (anti-cheat).
- Add per-tenant AI spend cap + alerting.
- AI: generate a personalized "study plan" from the report's weak areas (bridge to curriculum/legacy Q&A).

## Estimated Dev Effort
- Deferred/queued grading: ~2–3 days. Result-ready notifications: ~1 day. Live-interview error recovery + mobile responsive pass: ~2–3 days. Server-side time limits + anti-cheat: ~2 days. Tenant AI budget cap: ~1 day. Toolbar (make functional or remove): ~1 day. Tests for scoring: ~2 days. **Total ≈ 11–13 dev-days.**
