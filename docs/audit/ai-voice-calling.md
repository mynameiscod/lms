# AI Voice Calling
**Completion:** 72%  |  **Priority:** P2  |  **Business Impact:** High

## Purpose & Business Goal
Automatically place **outbound AI qualification calls** to new leads: on lead creation (or manual trigger), a BullMQ job calls the lead via Exotel, connecting them to a pre-built Exotel IVR "App" that asks questions and records. On completion, Exotel webhooks back → the recording is transcribed (Whisper) and scored (GPT) 0–100 → lead classified HOT/WARM/COLD/JUNK → auto-assigned to a counselor if score ≥ threshold. Retries on no-answer within working hours; optional WhatsApp fallback. Scales lead qualification without human dialing — high business impact, but depends on an out-of-repo Exotel IVR App and has a likely-failing recording fetch.

## Primary Users & Roles
- Runs automatically (auto-enqueue on lead create when an enabled `AICallConfig` exists).
- **TENANT_ADMIN** — configures Exotel creds, questions, retry/scoring rules, manual trigger. Endpoints use auth+tenant only (**no roleGuard** despite "admin only" comments).

## Key Files (traced)
- `server/src/models/AICallConfig.ts` (134).
- `server/src/services/aiCallQueueService.ts` (89, BullMQ producer), `exotelService.ts` (161).
- `server/src/workers/aiCallWorker.ts` (BullMQ consumer, concurrency 5).
- `server/src/controllers/aiCallConfigController.ts` (188) + `routes/aiCallRoutes.ts` (41).
- `server/src/controllers/aiCallWebhookController.ts` (313) — transcribe + score.
- `client/src/pages/AICallConfig/index.tsx` (574) — strong 5-tab config UI.

## Dependencies & Connected Modules
- **Lead Management** (auto-enqueue at `leadController.ts:473-482`; writes aiCall* fields; auto-assign), **Lead Scoring**, **aiClients** (OpenAI SDK), **Redis/BullMQ**, **Exotel** (external IVR App).

## Entry / Exit Points
- `POST /ai-calls/webhook/exotel` (**public, no auth, no HMAC**).
- `GET|PUT /ai-calls/config`, `GET /ai-calls/stats`, `GET /ai-calls/leads`, `POST /ai-calls/trigger/:leadId` (auth+tenant, no roleGuard).
- Queue: `enqueueAICall` (5s delay), `enqueueAICallRetry` (custom delay).

## Database Tables & Relationships
- `AICallConfig` (unique tenantId): enabled, 5 Exotel creds (**plaintext despite "encrypted" comment**), `questions[]`, `retry{maxAttempts,retryGapMinutes,nextDayRetry,workingHoursStart/End,workingDays}`, `scoring{hotThreshold,warmThreshold,assignOnScore,assignRoleId}`, `whatsappFallback{...}`, `llmModel` (default gpt-4o-mini), `systemPrompt`, `stats{totalCallsInitiated,totalAnswered,totalQualified}`.
- `Lead`: `aiCallStatus`, `aiCallAttempts`, `aiQualificationScore`, `aiCategory`, `nextAICallAt`, embedded `aiCallLogs[]`, `aiSummary`.

## Events / Notifications / Emails / WhatsApp
- Outbound Exotel call. On qualify → auto-assign. WhatsApp fallback after max attempts is a **stub** (commented-out send; only console.log).

## AI Features (which model, or "None")
OpenAI via `getOpenAI()` (aiClients exposes `getAnthropic()` too but not used here):
- STT: **`whisper-1`** (language en) — `aiCallWebhookController.ts:186`. Audio downloaded from Exotel `RecordingUrl` via axios arraybuffer.
- LLM: **`config.llmModel || 'gpt-4o-mini'`** (temp 0.3, max 600, JSON mode) — `:209`. Prompt: "expert EdTech sales analyst… Return JSON {score, category HOT|WARM|COLD|JUNK, summary, keyPoints, suggestedAction}", customizable per tenant.
- No TTS in-repo — question audio is spoken by the Exotel dashboard App/ExoML, not generated here.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| Exotel Call/Connect + ExoML App | Outbound voice + IVR | ~₹0.60–1.20 / min + ExoPhone rental ~₹500–2000/mo | Basic auth (SID/key/token); IVR built in Exotel dashboard, not code |
| OpenAI Whisper | Transcription | ~₹0.50 / min | 3-min call ≈ ₹1.5 |
| OpenAI gpt-4o-mini | Scoring/classification | ~₹0.05 / call | Negligible |
| Redis / BullMQ | Job queue | Self-hosted VPS (~₹0 marginal) | Managed ~₹500–1500/mo |

Per fully-processed qualified call: **~₹4–6 all-in**; unanswered retries cost only ring attempts.

## Validation Rules & Edge Cases
- Working-hours gate (IST) with next-window rescheduling up to 7 days.
- Manual trigger requires enabled config + existing lead. Skips leads already completed/skipped.
- Webhook robust to missing CustomField (falls back to callSid lookup), always 200-ACKs.
- Worker retries on transient errors (ECONNREFUSED/ETIMEDOUT/etc.).

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 80 | Full queue→worker→Exotel→webhook→transcribe→score→assign chain; WhatsApp fallback + polling stubbed. |
| Frontend/UI | 90 | Rich 5-tab config + leads console; minor stats field mismatch (FE expects answeredCalls/rates, BE returns totalAnswered/rates{}). |
| API | 85 | Complete surface; webhook unauthenticated; no role guards. |
| Database | 90 | Well-modeled config + lead call fields. |
| Automation | 75 | Auto-enqueue, retry, working-hours real; IVR questions not synced to Exotel; no missed-webhook recovery. |
| AI | 80 | Real Whisper + GPT scoring; recording-URL auth likely breaks STT in prod; no TTS (delegated to Exotel). |
| Testing | 0 | No tests. |
| **Overall** | **72** | Architecturally complete end-to-end, but depends on out-of-repo Exotel IVR App, likely-failing recording fetch, unauthenticated webhook, stubbed WhatsApp — not production-verified. |

## Gaps (mark "Not Implemented")
- **WhatsApp fallback: stub** — `aiCallWorker.ts:244` "Integration point: call your existing WhatsApp service here"; send commented out.
- **Missed-webhook recovery: none** — `getExotelCallDetails()` polling defined but never called; a missed webhook strands the call in `in_progress` forever.
- **IVR questions not pushed to Exotel** — editing questions in the UI does NOT change what the caller hears (they only feed the LLM prompt); the actual flow is a hand-built Exotel dashboard App.
- **Recording fetch likely fails** — audio GET has no Basic auth; Exotel recording URLs typically require auth → 401 → "[Transcription unavailable]".
- **Webhook has no HMAC/secret** — anyone can POST fake results → move leads to HOT + auto-assign.
- **Exotel creds stored plaintext** despite "encrypted" comment.
- No dedup/rate-limit on outbound calls (jobId includes `Date.now()` → re-triggers not deduped).
- Bogus `createdBy: new ObjectId()` on activity logs pollutes audit trail.
- Stats field-name mismatch (UI cards render undefined).
- **Testing:** Not Implemented.

## Technical Debt / Performance / Security / Scalability
- **Security (high):** unauthenticated webhook mutating lead classification + assignment; plaintext Exotel credentials.
- **Correctness:** recording auth gap likely breaks the core STT step in production; IVR config drift (UI vs Exotel dashboard).
- **Reliability:** no polling fallback for missed webhooks.
- **Scale:** concurrency 5 worker + BullMQ is sound.

## Suggestions & AI Opportunities
- Add webhook HMAC + Basic-auth recording download; encrypt Exotel creds; fix stats fields; add missed-webhook polling reconciliation; wire the WhatsApp fallback. Consider syncing questions to Exotel via their API, or move to a programmable-voice provider that lets code drive the IVR + TTS directly.
- **AI:** real-time streaming STT + LLM dialog (dynamic questions instead of fixed IVR); AI voice (TTS) for natural multilingual questions; sentiment/intent detection mid-call; auto-summary into `aiSummary`.

## Estimated Dev Effort
- Security (webhook HMAC + cred encryption + recording auth): 3–4 days. Missed-webhook reconciliation + WhatsApp fallback: 2–3 days. Stats/audit fixes: 1 day. Tests: 2–3 days. **Total to ~88%: ~2 weeks** (excludes any move to programmable voice).
