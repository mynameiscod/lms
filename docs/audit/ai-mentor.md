# AI Mentor
**Completion:** 72%  |  **Priority:** P2  |  **Business Impact:** Medium-High

## Purpose & Business Goal
"CareerPilot Mentor" — a context-aware AI career/coding mentor chat. Grounds each reply in the student's real data (profile, assessment scores, skill gaps, roadmap, enrollment progress) and deliberately coaches problem-solving (Understand→Plan→Code→Test→Reflect) rather than handing out full solutions. Drives engagement and points students to the platform's other tools.

## Primary Users & Roles
- **STUDENT** — one persistent conversation per user+tenant; sends messages, gets grounded replies, clears chat. No admin surface.

## Key Files (traced)
- Model: `server/src/models/MentorChat.ts` (35 lines) — one chat doc holding a bounded messages array; unique `{tenantId, studentId}`.
- Routes: `server/src/routes/mentorRoutes.ts` — `GET /`, `POST /message`, `DELETE /` (auth + tenant).
- Controller: `server/src/controllers/mentorController.ts` (59 lines).
- Service: `server/src/services/aiMentorService.ts` (123 lines) — `buildStudentContext`, `mentorReply`, system prompt, starter suggestions.
- Client: `client/src/pages/AIMentor/index.tsx` (chat UI + safe markdown-ish renderer).

## Dependencies & Connected Modules
- Reads (best-effort) **User**, **StudentProfile**, **AssessmentSubmission**, **CurriculumEnrollment**, **LearningCurriculum** to build grounding context.
- **aiClients / settingsService** for model selection.

## Entry / Exit Points
- Entry: `/ai-mentor` API; page `AIMentor/index.tsx`.
- Exit: none (chat only; no export/handoff).

## Database Tables & Relationships
- `mentorchats` — `tenantId` (string, indexed), `studentId → User`, unique `{tenantId, studentId}`. Embedded `messages[]` (`role` enum user/assistant, `content`, `at`); stored history bounded to last 100 messages.

## Events / Notifications / Emails / WhatsApp
- **None.**

## AI Features
| Feature | Provider / Model | Purpose |
|---|---|---|
| Mentor reply | **Claude (`ASSESSMENT_ROADMAP_MODEL`, default `claude-sonnet-4-6`)** → OpenAI (`OPENAI_MODEL`, default gpt-4o-mini) fallback | Grounded conversational coaching; last ~16 msgs (~8 turns) sent as context; max 1024 out tokens; non-streaming |
| Context assembly | **None (DB reads)** | Compact grounding block from profile/assessment/roadmap/enrollment |

Note: uses `ASSESSMENT_ROADMAP_MODEL` setting (not `INTERVIEW_AI_MODEL` like the other CareerPilot services) — inconsistent key.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| Anthropic Claude Sonnet 4.x | Chat replies (1024 out cap) | ~₹250 / 1M in, ~₹1,250 / 1M out | Per reply ≈ ₹1–3; **no usage recorded to aiGateway** (unlike eval services) |
| OpenAI GPT-4o-mini | Fallback | ~₹12–15 / 1M in, ~₹50 / 1M out | |

## Validation Rules & Edge Cases
- Message required, trimmed, ≤4000 chars; stored history capped at 100 messages; context assembly wrapped in try/catch (best-effort, never blocks reply).
- Client renders markdown via React elements (no dangerouslySetInnerHTML → XSS-safe).
- Gaps: no prompt-injection guardrails; no content moderation; no per-student rate limit / daily quota; no AI-call timeout; no context-window overflow handling; assumes a `text` content block exists in the Claude response.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 80 | Clean chat + strong grounding; no usage metering, no rate limit/moderation |
| Frontend/UI | 80 | Full chat UI, empty-state with starter prompts, thinking indicator, safe render |
| API | 75 | 3 endpoints cover the flow; no streaming, no regenerate/retry, no history/multi-convo |
| Database | 80 | Simple, bounded, unique-indexed; single conversation only |
| Automation | 0 | None |
| AI | 80 | Well-grounded, dual-provider; no streaming, no cost metering, wrong settings key |
| Testing | 0 | No tests |
| **Overall** | **72** | Genuinely useful and grounded; gaps = safety/rate-limit/cost-metering/streaming |

## Gaps (Not Implemented)
- **Features:** No streaming responses; no regenerate/retry; no message copy/edit; no code-block syntax highlighting; no multiple/named conversations or history list; no attachments.
- **APIs:** No admin view of mentor usage/quality; no export.
- **Validation:** Prompt-injection & content moderation absent; no rate limit / daily cap; no AI timeout; no context-window guard.
- **Automation/Notifications/Reports/Dashboard/Analytics:** None (no usage analytics, no aiGateway metering here).
- **Security:** No abuse throttling; relies on provider-side rate limits only.
- **Error/Loading/Empty states:** Present (empty-state suggestions, thinking indicator, error bubble).
- **Audit logs / Mobile:** None / not verified.

## Technical Debt / Performance / Security / Scalability
- Missing `recordUsage` call means Mentor AI spend is invisible in the cost dashboard other modules feed.
- Inconsistent settings key (`ASSESSMENT_ROADMAP_MODEL`) vs. the suite's `INTERVIEW_AI_MODEL`.
- Synchronous, non-streaming replies feel slow for longer answers; no perceived-latency mitigation beyond "thinking…".
- No abuse/rate controls — a single student could run up provider cost.

## Suggestions & AI Opportunities
- Add `recordUsage` metering + a per-student daily message cap.
- Stream responses (SSE) for better UX; add regenerate.
- Add lightweight prompt-injection / moderation guard.
- AI opportunity: proactive mentor nudges tied to Job Tracker interviewing-stage cards, low assessment sub-scores, or a broken communication streak; deep links that pre-open the recommended tool.

## Estimated Dev Effort
- Metering + rate limit + moderation: ~2 dev-days.
- Streaming + regenerate + code highlighting: ~3 dev-days.
- Proactive/context-triggered nudges: ~3 dev-days.
- Tests: ~1 dev-day. **Total to "88%": ~1.5–2 weeks.**
