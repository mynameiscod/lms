# Platform Settings & System Configuration
**Completion:** 82%  |  **Priority:** P2  |  **Business Impact:** High

## Purpose & Business Goal
Move platform configuration (API keys, models, SMTP, OAuth, WhatsApp/Meta, Bunny storage, Razorpay, 100ms, ElevenLabs/D-ID, placement outreach) out of `.env` and into a SUPER_ADMIN UI, with AES-256-encrypted secrets at rest, per-tenant overrides for select keys, and transparent `.env` fallback. Secrets are mirrored into `process.env` at boot so existing `process.env.X` readers keep working with zero refactor. This is the operational control panel for the whole platform.

## Primary Users & Roles
- SUPER_ADMIN only — all system-settings routes gated by an inline `superAdminOnly` guard.
- Per-tenant overrides (email, WhatsApp, Razorpay, outreach, etc.) editable via the same UI with a tenant scope picker.

## Key Files (traced — real paths)
- `server/src/models/SystemSetting.ts` — `{key, value(enc), group, isSecret, scope, tenantId}`, unique `{key, tenantId}`.
- `server/src/config/settingsRegistry.ts` — catalogue: 10 groups, ~80 `SETTING_DEFS`, `SECRET_KEYS`, `PER_TENANT_KEYS`.
- `server/src/services/settingsService.ts` — encrypt/decrypt (AES-256-CBC via scrypt), caches, resolver (tenant→UI→env), `applyToEnv`, `setMany`, `loadAll`, `initSettings`.
- `server/src/routes/systemSettingsRoutes.ts` — get/put/test/test-email/tenants.
- `server/src/controllers/systemSettingsController.ts` — masked reads, filtered writes, provider tests (Anthropic/OpenAI/email).
- `client/src/pages/PlatformSettings/`.

## Dependencies & Connected Modules
- Consumed by nearly every integration: aiClients, emailService, oauthController, hmsService, razorpayService, whatsapp, bunnyStorage, partner outreach, ElevenLabs/D-ID.
- Multi-Tenancy (per-tenant scope + tenant picker).
- Auth (ENCRYPTION_KEY falls back to JWT_SECRET).

## Entry / Exit Points
- Entry: `GET /system-settings[?tenantId]`, `PUT /system-settings`, `GET /system-settings/tenants`, `POST /system-settings/test-email`, `POST /system-settings/test/:provider`.
- Exit: catalogue + resolved values (secrets masked, never plaintext) with `source` (tenant|ui|env|unset); live provider test results.

## Database Tables & Relationships
- `SystemSetting` (platform docs have `tenantId:null`; per-tenant docs set tenantId; unique per key+tenant).
- References Tenant (scope) and User (`updatedBy`).

## Events / Notifications / Emails / WhatsApp
- Test-email endpoint sends a real email via saved config.
- No change-notification or audit trail on settings edits.

## AI Features
- Provider connectivity tests call Claude (`INTERVIEW_AI_MODEL`, default `claude-sonnet-4-6`) and OpenAI (`OPENAI_MODEL`) with an 8-token "reply OK" probe. Configures models but doesn't itself run product AI.

## Third-Party Integrations & Cost (keys this module manages)
| Service | Purpose | Pricing (₹ INR) | Notes |
| Anthropic (Claude) | Interviews, assessments, lessons | Usage-based; Sonnet ≈ ₹250/1M in, ₹1,250/1M out | Default model claude-sonnet-4-6 |
| OpenAI (GPT) | Resume parsing, lead AI, voice | Usage-based; gpt-4o-mini ≈ ₹12/1M in | |
| Bunny Stream/Storage | Video + resource storage | From ~₹400/mo + egress | |
| WhatsApp Cloud / Meta | OTP, lead webhooks | Per-conversation ~₹0.5–0.8 | |
| Razorpay | Learning-plan unlock | ~2% + GST per txn | Key ID public, secret encrypted |
| 100ms | Live classes | ~₹0.25/participant-min | |
| ElevenLabs / D-ID | AI interviewer voice/face | ElevenLabs from ~₹400/mo; D-ID from ~₹470/mo | Optional |
| Brevo | Email API | Free ≤300/day, paid ~₹1,600/mo+ | |
| Todoist | Placement reminders | Free / ~₹340/mo | |

## Validation Rules & Edge Cases
- Secrets never returned in plaintext (masked hint + isSet + source).
- `__UNCHANGED__` sentinel leaves a masked secret untouched on save; empty string deletes the override (reverts to next level).
- Writes filtered to catalogue keys; tenant scope restricted to `PER_TENANT_KEYS`.
- Decrypt failures fall back to returning raw text (won't crash but could surface ciphertext).

## Completion Breakdown
| Dimension | % | Reasoning (from actual code) |
| Backend | 90 | Encrypt/decrypt, layered resolver, caches, env-mirroring, provider tests all implemented cleanly. |
| Frontend/UI | 82 | PlatformSettings page with groups, masking, tenant picker, test buttons. |
| API | 85 | Get/put/test endpoints, tenant filtering, masking — well designed. |
| Database | 85 | Clean model with unique key+tenant index. |
| Automation | 60 | Boot-load + env mirror; no reload endpoint across multi-instance, no change audit. |
| AI | 40 | Provider test probes only (configures AI). |
| Testing | 5 | No tests. |
| **Overall** | **82** | The strongest-built module in this domain. |

## Gaps (be specific; mark "Not Implemented" where truly absent)
Missing:
- **Encryption key mgmt:** `ENCRYPTION_KEY` falls back to `JWT_SECRET` then a hardcoded `'fallback-key-32-chars-minimum!!'` — if unset in prod, all secrets are encrypted with a public constant. No key rotation.
- **Audit:** no log of who changed which setting when (only `updatedBy` on the doc; no history) — Not Implemented.
- **Multi-instance cache coherence:** caches are per-process + `applyToEnv` mutates `process.env`; on blue/green two instances can diverge until restart — no pub/sub reload.
- **Silent decrypt fallback:** returns ciphertext/raw on failure instead of erroring/alerting.
- **Validation:** no server-side format validation per setting type (e.g., numeric/URL); UI-only.
- **Permissions:** correctly SUPER_ADMIN-only, but tenant-admins cannot manage even their own per-tenant keys (only SUPER_ADMIN can, via scope picker).
- **Testing:** none.

## Technical Debt / Performance / Security / Scalability issues
- Mutating global `process.env` at runtime is convenient but makes tenant-scoped resolution leaky for env-reading consumers (tenant values deliberately not mirrored — any consumer reading `process.env.X` gets platform value only).
- Registry duplicates key names that must stay in sync with every consumer's `process.env.X` string.
- No secret-access audit.

## Suggestions & AI Opportunities
- Require a strong `ENCRYPTION_KEY` at boot (fail fast if missing/weak); add key-rotation tooling.
- Add a settings-change audit log + optional Slack/email notify on secret changes.
- Add a lightweight pub/sub (or admin "reload settings" endpoint hitting all instances) for cache coherence.
- Let TENANT_ADMIN self-manage their own `PER_TENANT_KEYS`.
- AI opportunity: config validator/assistant that sanity-checks keys and explains cost impact.

## Estimated Dev Effort (to close gaps)
~4–6 dev-days: enforce/rotate encryption key (1–2d), settings audit trail (1d), tenant-admin self-service scope (1d), multi-instance reload (1d), per-type validation (0.5d).
