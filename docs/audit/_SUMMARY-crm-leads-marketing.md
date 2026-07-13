# CRM / Leads & Marketing — Audit Summary

Domain: **CRM / Leads & Marketing** cluster of CodeBegun LMS (multi-tenant Node/Express/Mongoose + React/TS). Audit date: 2026-07. 10 module docs in this folder. All percentages derived from traced source; no fabrication.

## Cross-Cutting Findings (apply to nearly every module)
- **Zero automated tests** across the entire CRM domain (repo has only 6 test files total, none touch CRM). Testing = 0% almost everywhere.
- **Two competing lead-assignment engines** race on `Lead.assignedTo` during create: `scoreAndAssignLead` (Lead Scoring) at `leadController.ts:456` and `autoAssignLead` (Lead Distribution) at `:468` — likely double-assignment bug.
- **Two competing scoring configs** (`LeadScoringConfig` vs `LeadPriorityConfig`), each with a full settings page.
- **Automation delivers via Socket.io only** for follow-up reminders and SLA breaches — no email/WhatsApp despite data models supporting those channels.
- **Public webhooks (Meta, Google, WhatsApp, Exotel) are unauthenticated / weakly verified** — several fail open or lack HMAC. This is the top security theme.
- **Built-but-unwired code:** AdCampaign controller (~490 lines, no routes), ad scraper (699 lines, dead), WhatsApp drip-config (4 endpoints, no UI), Lead AI talk-track/follow-up (no UI callers).
- **AI providers:** OpenAI (`gpt-4-turbo-preview`, `gpt-4o-mini`, `whisper-1`) is used for lead summaries, sales-call and AI-voice-call scoring. `getAnthropic()` exists in `aiClients.ts` but Claude is not used in this domain. Migrating `gpt-4-turbo-preview` → `gpt-4o-mini` would cut cost materially.

## Third-Party Cost Snapshot (₹ INR)
| Service | Where | Approx cost |
|---|---|---|
| Meta WhatsApp Cloud API v18.0 | WhatsApp, seat reminders | ~₹0.7–0.8 / marketing conversation (per 24h) |
| Meta Graph API v19.0 / Google Lead webhook | Ad intake | Free (rate-limited) |
| Exotel voice + ExoML | AI Voice Calling | ~₹0.6–1.2/min + ~₹500–2000/mo rental |
| OpenAI whisper-1 | Call transcription | ~₹0.50/min audio |
| OpenAI gpt-4o-mini / gpt-4-turbo-preview | Scoring, summaries | ~₹0.05–3 per unit |
| Hostinger SMTP/IMAP | Partner outreach, seat emails | Near-free |
| Todoist REST | Partner reminders | Free tier |
| Playwright (dead) | Ad scraper | Self-hosted (unused) |
| Redis/BullMQ | AI-call queue | Self-hosted VPS |

## SUMMARY TABLE
| Module | Overall% | BE% | FE% | API% | DB% | Auto% | AI% | Priority | Impact | Top-3 Gaps | Third-party + Cost ₹ | 1-line status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Lead Management | 88 | 92 | 85 | 90 | 95 | 80 | 75 | P1 | High | No tests; 3 LeadDetail versions; partial stage-trigger automation | Claude/WhatsApp (per-lead ~₹1) | Production-grade core CRM; testing + consolidation debt |
| Lead Configuration | 85 | 90 | 90 | 88 | 92 | 70 | 0 | P2 | Medium | Two redundant scoring configs; partial trigger exec; no config audit | Encrypted tokens (storage) | Broad, UI-complete config surface; untested, some redundancy |
| Lead Scoring & AI | 78 | 90 | 65 | 95 | 90 | 90 | 80 | P2 | High | Orphaned AI UI (talk-track/follow-up); broken `pending` query; two engines | OpenAI gpt-4-turbo/4o-mini (~₹1–3/summary) | Strong backend; AI half-surfaced with real bugs |
| Lead Distribution | 72 | 80 | 75 | 70 | 95 | 70 | N/A | P3 | Medium | Double-assignment race; String/ObjectId cap bug; no eligibleRoles UI | None (₹0) | Works but conflicts with scoring assignment |
| Meta & Google Ads | 50 | 65 | 20 | 55 | 90 | 45 | 30 | P1 | High | AdCampaign unrouted; scraper dead; flawed fail-open Meta HMAC | Meta/Google API free; Playwright self-host | Intake production-grade; analytics + scraper unwired |
| Google Sheets | 80 | 85 | 90 | 95 | 95 | 85 | 40 | P2 | Medium | Row-cursor fragility; public-sheet dependency; push-back not in UI | Google CSV free (₹0) | Solid one-way importer with polished UI |
| WhatsApp Automation | 50 | 75 | 20 | 70 | 80 | 55 | 0 | P1 | High | No templates (late drips fail); no opt-out; no webhook HMAC; no drip UI | WhatsApp ~₹0.7–0.8/conv | Inbound bot works; nurture blocked by compliance/security gaps |
| Sales Enablement | 60 | 75 | 55 | 80 | 95 | 30 | 85 | P3 | Medium | Share sends nothing (stub); upload unwired; content cross-tenant leak | OpenAI whisper+gpt (~₹3/5-min call) | Call-analysis production-grade; content sharing tracking-only |
| AI Voice Calling | 72 | 80 | 90 | 85 | 90 | 75 | 80 | P2 | High | Recording fetch likely 401; unauth webhook; WhatsApp fallback stub | Exotel ₹0.6–1.2/min + OpenAI (~₹4–6/call) | End-to-end built; unverified in prod, depends on Exotel IVR app |
| Partner / Placement Outreach | 80 | 90 | 90 | 95 | 95 | 85 | 0 | P2 | High | No AI copy; no auto-bounce→suppress; one-way Todoist | SMTP/IMAP near-free; Todoist free | Coherent, deployable outreach engine; no AI, no tests |

## Priority Recommendations (domain-wide)
1. **Security sweep (P1):** add HMAC/signature verification to Meta/WhatsApp/Exotel webhooks; add roleGuards to `/meta-leads/sync`, `/setup-webhook`, ai-call endpoints; fix Sales Content cross-tenant leak; encrypt Exotel creds; disable `DEBUG=true` token logging.
2. **Resolve the double-assignment race** and unify the two scoring engines/configs.
3. **WhatsApp compliance (P1):** approved templates + STOP/opt-out + suppression list; move drips to a durable queue.
4. **Wire or delete built-but-unwired code** (AdCampaign routes, ad scraper, WhatsApp drip UI, orphaned AI endpoints).
5. **Automation delivery:** make follow-up/SLA notifications go out over email/WhatsApp, not socket-only; add seat-expiry cron.
6. **Implement declared-but-dead behaviors:** qualification `scoreImpact`/`fieldToUpdate`; seat batch capacity.
7. **Add a test suite** — the domain has zero coverage.
