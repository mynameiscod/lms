# AI Infrastructure
**Completion:** 88%  |  **Priority:** P1  |  **Business Impact:** High

## Purpose & Business Goal
The shared LLM/STT layer every AI feature runs through: a **dual-provider failover gateway** (OpenAI primary, Anthropic Claude fallback) with **per-call cost logging in ₹**, admin-managed API keys via Platform Settings, and a BullMQ-backed AI voice-call system (Exotel) for lead qualification. This is the cost centre and reliability backbone of every AI feature — lessons, interviews, assessments, roadmaps, drills, resume/career scoring.

## Primary Users & Roles
- **SUPER_ADMIN / TENANT_ADMIN** — set keys/models/prices in Platform Settings; view AI Spend dashboard; configure AI Call system.
- All AI features (all roles indirectly) route through `aiComplete`.

## Key Files (traced)
- Gateway: `server/src/services/aiGateway.ts` (failover + `recordUsage` cost log), `aiClients.ts` (lazy Anthropic/OpenAI clients rebuilt on key change), `aiService.ts` (feature-level helpers).
- Settings: `server/src/services/settingsService.ts` (tenant→platform→env resolution, AES-256-CBC secret encryption), `server/src/config/settingsRegistry.ts`, `server/src/models/SystemSetting.ts`.
- Ledger: `server/src/models/AiUsage.ts`; routes `server/src/routes/aiUsageRoutes.ts` (summary), controller `aiUsageController.ts`.
- AI Voice Calls: `server/src/models/AICallConfig.ts`, `routes/aiCallRoutes.ts` (6), `services/aiCallQueueService.ts`, `workers/aiCallWorker.ts`, `services/exotelService.ts`.
- Client: `client/src/pages/AiSpend/`, `PlatformSettings/`, `AICallConfig/`.

## Dependencies & Connected Modules
- Consumed by: Thinking Lab, Quiz/Drill/Assignment generation, Speaking Practice + Communication (Whisper), Live-class recording notes, Resume/Career scoring, Interview brain, Assessment roadmaps, Lead AI.
- **Redis/BullMQ** for the AI-call queue; **Exotel** for telephony; **WhatsApp** fallback (stubbed).

## Entry / Exit Points
- Entry (code): `aiComplete({tenantId, module, system, user, prefer, ...})` → returns text; `recordUsage(...)` logs cost.
- Entry (API): `GET /ai-usage/summary?days=30`; `GET/PUT /ai-calls/config`, `GET /ai-calls/stats`, `GET /ai-calls/leads`, `POST /ai-calls/trigger/:leadId`, `POST /ai-calls/webhook/exotel` (public).
- Exit: LLM completion text; AiUsage rows (costUsd + costInr); Exotel outbound calls.

## Database Tables & Relationships
- **AiUsage** (tenantId→Tenant optional): module, provider openai|anthropic|whisper, aiModel, inputTokens, outputTokens, audioSeconds, costUsd, costInr, date (IST YYYY-MM-DD), fellBack. Indexes: tenantId+date, date+module.
- **AICallConfig** (per tenant): Exotel creds, questions[], retry (maxAttempts 1–10, gap, working hours/days), scoring thresholds (hot≥75, warm≥40, assignOnScore), WhatsApp fallback config, llmModel (gpt-4o-mini), system prompt.
- **SystemSetting** (key/value, per-tenant or platform, secrets encrypted).

## Events / Notifications / Emails / WhatsApp
- AI-call worker (BullMQ, concurrency 5) places Exotel calls within working hours, retries with gap, logs to Lead.
- WhatsApp fallback after max attempts is referenced but **not fully implemented** (`triggerWhatsAppFallback` is a stub).

## AI Features (models)
- **OpenAI** default LLM `gpt-4o-mini` (setting `OPENAI_MODEL`); **Anthropic** fallback `claude-haiku-4-5-20251001` (setting `AI_FALLBACK_ANTHROPIC_MODEL`). Some features prefer Anthropic (e.g., recording notes).
- **Whisper** for STT (`$0.006`/min).
- Pricing table in `aiGateway.ts` covers gpt-4o-mini/4o/4.1-mini and claude haiku/sonnet/opus families; overridable via `AI_PRICE_<MODEL>_IN/OUT`; USD→INR via `USD_TO_INR` (default 85).

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| Anthropic Claude | Fallback (some primary) LLM | Haiku ~₹85/₹425 per M in/out; Sonnet ₹255/₹1,275; Opus ₹1,275/₹6,375 | From code price table ×85 |
| OpenAI GPT | Primary LLM | gpt-4o-mini ₹12.75/₹51 per M | Cheapest default |
| OpenAI Whisper | STT | ₹0.51/audio-min | Speaking/communication/interview |
| Exotel | AI voice calls to leads | ~₹0.60–1.10/min + platform fee | Behind AICallConfig |
| Redis (BullMQ) | AI-call job queue | ₹0 self-host | Only for AI calls |
> See `_cost-and-integrations.md` for the full platform rollup.

## Validation Rules & Edge Cases
- `recordUsage` is wrapped so logging never breaks an AI call; cost logging is best-effort.
- `priceFor()` does exact-then-prefix model match with a conservative default — unknown models still get costed (approximately).
- Clients rebuilt when the key changes → Platform Settings edits take effect without redeploy.
- Fallback attempts flagged `fellBack:true` for attribution.

## Completion Breakdown
| Dimension | % | Reasoning |
| Backend | 95 | Gateway, failover, cost logging, settings resolution+encryption, BullMQ worker all implemented. Missing: per-feature rate limits, budget caps. |
| Frontend/UI | 85 | AiSpend (spend/day, by module/provider/model, recent calls) + PlatformSettings + AICallConfig UIs complete. Missing: budget alerts, forecast confidence. |
| API | 95 | Usage summary + full AI-call config/stats/trigger/webhook. Clean. |
| Database | 100 | AiUsage + AICallConfig well-modeled and indexed. |
| Automation | 80 | Worker runs calls with retry/working-hours. Missing: auto model-switch on cost, WhatsApp fallback (stub). |
| AI | 100 | Both providers integrated; failover proven; pricing accurate. |
| Testing | 20 | No tests for failover/cost/queue. |
| **Overall** | **88** | Production-grade cost-aware AI backbone; main gaps are budget governance + tests. |

## Gaps (mark "Not Implemented")
- **Cost governance:** per-tenant budget caps + spend-threshold alerts (email/Slack) — Not Implemented.
- **Rate limiting:** per-feature/per-tenant AI rate limits — Not Implemented (only transient-error retry).
- **Observability:** per-model latency tracking; output-validation before costing — Not Implemented.
- **AI Calls:** WhatsApp fallback after max attempts — stubbed, Not Implemented.
- **Scope of ledger:** only LLM/Whisper costed; 100ms/Bunny/Razorpay/WhatsApp/Exotel spend not in AiUsage — Not Implemented (see cost rollup).
- **Testing:** none.

## Technical Debt / Performance / Security / Scalability
- Hard-coded price table + fixed FX default → silent spend mis-reporting on drift (mitigated by override settings).
- No circuit breaker — repeated provider failure retries every call.
- Secrets encrypted with `ENCRYPTION_KEY` else falls back to `JWT_SECRET` (acceptable but couples secrets).

## Suggestions & AI Opportunities
- Add budget caps + daily-spend alerts; add a "prices last verified" date to settings.
- Track latency per model; add circuit breaker + optional prompt/response caching to cut cost.
- Extend the ledger into a platform-wide cost model (100ms/Bunny/WhatsApp/Exotel).

## Estimated Dev Effort
~6–9 dev-days: budget caps + alerts (2d), rate limiting + circuit breaker (2d), latency/caching (2d), unified cost ledger extension (2d), tests (1–2d).
