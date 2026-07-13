# WhatsApp Automation
**Completion:** 50%  |  **Priority:** P1  |  **Business Impact:** High

## Purpose & Business Goal
Automate lead nurturing over Meta WhatsApp Cloud API: (1) an **inbound qualification bot** — when a prospect messages the business number, a state machine greets, asks configurable qualification questions, scores answers, creates/updates the Lead, and hands off to a human; (2) **outbound drip nurture** — D+1/D+3/D+7 follow-ups on stage entry; (3) **welcome-on-create** — new leads get an automatic welcome; (4) **cold-lead housekeeping** — abandoned chats marked cold after 24h. WhatsApp is the primary channel for this Indian EdTech audience, so business impact is high — but production-grade nurture is blocked by several gaps.

## Primary Users & Roles
- **Prospects** (inbound, unauthenticated via webhook).
- **TENANT_ADMIN** (`manage_leads`) — mark-cold, bulk cold-lead messages. Drip-config endpoints have **no role guard** (any authed tenant user).
- **STAFF** (`edit_leads`) — manual send.

## Key Files (traced)
- `server/src/models/WhatsAppConversationState.ts` (63, TTL 24h), `WhatsAppDripConfig.ts` (98).
- `server/src/services/whatsAppDripService.ts` (186), `whatsAppWelcomeService.ts` (118).
- `server/src/controllers/whatsappWebhookController.ts` (509) + `routes/whatsappRoutes.ts` (52).
- `server/src/controllers/whatsAppDripConfigController.ts` (99) + `routes/whatsappDripConfigRoutes.ts` (21).

## Dependencies & Connected Modules
- **Lead Management** (`ensureLeadExists`, `scoreAndAssignLead` on qualification finalize; welcome fired from `createLead`), **Lead Scoring**, **LeadSourceConfig** (`whatsApp.config.phoneNumberId` = tenant routing key, encrypted token, qualification language, autoActions), **QualificationQuestionConfig** (bot questions).

## Entry / Exit Points
- `GET /whatsapp/webhook` (public verify), `POST /whatsapp/webhook` (public inbound).
- `POST /whatsapp/mark-cold` (`manage_leads`), `POST /whatsapp/send` (`manage_leads`/`edit_leads`), `POST /whatsapp/bulk-cold-leads` (`manage_leads`).
- Drip config: `GET|PUT /whatsapp-drip-config/`, `PATCH /sequence/:stageName`, `POST /reset` (auth only, **no role guard**).
- Drip scheduled from `leadController.ts:731,807` (stage change/approval) — writes a `drip_entry:` marker into `Lead.activities`.

## Database Tables & Relationships
- `WhatsAppConversationState` (unique `{phone,tenantId}`, **TTL on `expiresAt` = 24h**): conversationStep, currentQuestionIndex, answers Map, scoreSoFar.
- `WhatsAppDripConfig` (unique tenantId): `sequences[]` each `{stageName, messages[{daysAfter 0-90, message ≤4096, enabled}], enabled}`. Exports `DEFAULT_DRIP_SEQUENCES` (5 stages).
- Drip "schedule" persisted as **string markers in `Lead.activities`**, not a job table. Reuses `Lead.whatsappStatus/whatsappEngagement`.

## Events / Notifications / Emails / WhatsApp
- All sends are Meta WhatsApp Cloud API `type:'text'` (free-form session) messages — **no template (HSM) messages anywhere in this cluster**.
- Inbound bot: welcome → questions → completion message → handoff. Welcome-on-create (source-gated). Drip D+1/D+3/D+7.

## AI Features (which model, or "None")
**None.** Fully rule-based: answer resolution by numeric-index/substring matching, scoring by static keyword rules. No LLM auto-reply.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| Meta WhatsApp Cloud API **v18.0** | Inbound bot + welcome + drip + manual | ~₹0.70–0.80 / marketing conversation (India); service conversations cheaper/partly free | Per 24h conversation, not per message. Only `/{phone_number_id}/messages` endpoint used |

Token source: Platform-Settings-first (`LeadSourceConfig.whatsApp`, encrypted) → env fallback. Note: manual/bulk send use **env-only** `WHATSAPP_PHONE_NUMBER_ID` (breaks multi-tenant).

## Validation Rules & Edge Cases
- Webhook verify: `hub.mode=subscribe` + `hub.verify_token` (fallback hardcoded `codebegun_whatsapp_verify`), echoes challenge.
- Inbound 200-ACKs immediately (no Meta retries); status callbacks skipped; empty text skipped; qualified users get canned reply.
- Drip idempotency via `drip:<stage>:d<days>` activity tag; conversation-state TTL 24h.
- Phone matching uses `$regex: phone.slice(-10)` (collision risk).

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 75 | Inbound bot + drip + welcome + cold-lead all implemented and wired; missing template send, opt-out, retry/queue robustness. |
| Frontend/UI | 20 | Qualification-questions UI exists; **drip-config endpoints have zero UI** (orphaned); no automation dashboard. |
| API | 70 | 9 endpoints incl. webhook; but no signature verification, drip-config lacks role guard, manual-send env-only. |
| Database | 80 | Clean schemas with unique + TTL indexes; drip "schedule" as parsed activity strings is the weak point. |
| Automation | 55 | Hourly `setInterval` runner + stage hooks work, but no locking/persistence; `markColdLeads` never auto-triggered; drips fail outside 24h window without templates. |
| AI | 0 | No LLM; purely rule-based. |
| Testing | 0 | No tests. |
| **Overall** | **50** | Inbound qualification + immediate welcome work end-to-end; production nurture blocked by no templates, no opt-out, no webhook security, no UI, fragile scheduler. |

## Gaps (mark "Not Implemented")
- **No template (HSM) support** → drips outside the 24h window silently fail at Meta (D+1/D+3/D+7 by definition often outside window). Failures logged, not retried/re-queued.
- **No opt-out/STOP handling** — no keyword detection, no suppression list — **Meta policy compliance risk**.
- **No webhook HMAC/signature verification** — public POST is forgeable → anyone can create/modify leads.
- **No frontend for drip config** — 4 endpoints orphaned.
- **`setInterval` "cron"** (in `app.ts`) — in-process, no persistence/locking (double-send risk under multi-instance/PM2 cluster).
- Drip schedule stored as brittle string markers in `Lead.activities` (unbounded scan each hour).
- `markColdLeads` manual-trigger only — no scheduler calls it.
- Manual/bulk send use env-only phone number ID (multi-tenant break).
- Hardcoded fallback verify token; no delivery/read-receipt persistence; no rate-limiting beyond 100ms sleep in bulk send.
- **Testing:** Not Implemented.

## Technical Debt / Performance / Security / Scalability
- **Security (high):** unauthenticated, unsigned webhook that mutates lead data.
- **Compliance (high):** no opt-out — WhatsApp policy violation risk.
- **Correctness:** no-template design makes late drips non-functional.
- **Scale:** hourly full scan of leads with drip markers; in-process scheduler without lock.

## Suggestions & AI Opportunities
- Add HMAC verification (app secret), STOP/opt-out + suppression list, and approved WhatsApp templates for out-of-window drips. Replace `setInterval` with a durable queue (BullMQ, already in the stack) + a real job table for drips. Build a drip-config UI. Use per-tenant phone ID for manual/bulk send.
- **AI:** LLM-driven conversational bot (replace rigid state machine) with intent detection + dynamic follow-ups; AI-drafted personalized drip copy; AI reply-suggestions for agents.

## Estimated Dev Effort
- Webhook security + opt-out + suppression: 3–4 days. Templates + durable drip queue + job table: 5–7 days. Drip-config UI: 3–4 days. Multi-tenant send fix: 1 day. Tests: 2–3 days. **Total to ~85%: ~3–4 weeks.**
