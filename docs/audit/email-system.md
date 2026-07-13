# Email System
**Completion:** 70%  |  **Priority:** P1  |  **Business Impact:** High

## Purpose & Business Goal
The transactional email backbone: welcome/onboarding, password reset, tenant-admin welcome, fee receipts/reminders, placement status, seat-reservation lifecycle, and generic notifications. Built on nodemailer/SMTP (Hostinger) with a Brevo API fallback path, per-tenant config, burst-pacing to avoid provider rate-limit trips, and transient-error retry. Email is the primary outbound channel — its reliability directly affects onboarding conversion and payment collection.

## Primary Users & Roles
- System-triggered (no direct user UI to send arbitrary email).
- SUPER_ADMIN/TENANT_ADMIN configure sender/SMTP/Brevo in Platform Settings.

## Key Files (traced)
- Service: `server/src/services/emailService.ts` (transport build, rate-limit pacing, retry, Brevo path).
- Templates: `server/src/services/emailTemplates.ts` (~795 lines — welcome, reset, tenant-admin welcome + subject A/B variants).
- Config: `server/src/config/settingsRegistry.ts` (email group); Brevo used in `jobs/dailySummaryCron.ts`.
- Consumers: authService, userController, feeController, seatReservationController, placementStatusService, and cron reminders.

## Dependencies & Connected Modules
- **Settings** (EMAIL_SERVICE/USER/PASSWORD/FROM, SMTP_*, BREVO_API_KEY — resolved via settingsService, transport rebuilt on key change).
- Consumed by Auth, Users, Fees/Payments, Placement, Seat Reservation, Notifications, Concerns (currently not), reminder crons.
- Related: `whatsAppDripService` (parallel WhatsApp channel).

## Entry / Exit Points
- Entry (code): `EmailService(tenantId).sendWelcomeEmail/sendPasswordResetEmail/sendTenantAdminWelcomeEmail/sendGenericEmail/sendTestEmail`.
- Exit: SMTP send (paced) or Brevo API POST; retries on transient errors; logs.

## Database Tables & Relationships
- No dedicated email model. Config in **SystemSetting** (encrypted secrets). No send-log/bounce/suppression table.

## Events / Notifications / Emails / WhatsApp
- Email families (HTML + text): (1) Student welcome (24h setup link, subject A/B), (2) Password reset (1h expiry), (3) Tenant-admin welcome (credentials + enabled modules), (4) Fee receipt/reminder (feeController), (5) Placement status/round (placementStatusService), (6) Seat-reservation lifecycle (confirmation/reminder/pre-joining/joining-day), (7) generic. Daily-summary email can route via Brevo.
- **Pacing:** `SMTP_MIN_SEND_GAP_MS` (default ~3s) serializes sends through a single chain → avoids Hostinger `451 ratelimit`.
- **Retry:** transient codes (421/450/451, ETIMEDOUT/ECONNRESET/ENOTFOUND/ESOCKET) retried up to 3× with 2s/5s/12s backoff; hard errors throw.

## AI Features
None (templates are static; no AI copy generation).

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| SMTP (Hostinger) | Primary transactional send | ~₹0 (bundled with hosting) | Rate-limited; paced |
| Brevo (Sendinblue) | Fallback/summary API path | Free ≤300/day; paid ~₹1,600+/mo | Only wired for daily-summary + testEmail; not a live auto-failover |
| IMAP (Hostinger) | (Partner replies — separate) | ~₹0 | Not this service |

## Validation Rules & Edge Cases
- Transport lazily rebuilt when key changes → Settings edits apply without redeploy.
- Best-effort sends in many callers (wrapped try/catch) so email failure doesn't break the parent action.
- **Anti-pattern:** tenant-admin welcome + convert-to-student emails include cleartext passwords (should be magic-link).
- seatReservationController builds its own nodemailer transport from `process.env` directly (bypasses the settings-based service).

## Completion Breakdown
| Dimension | % | Reasoning |
| Backend | 85 | SMTP+Brevo config, encrypted secrets, pacing, transient retry, multiple template families. Missing: active Brevo auto-failover, bounce handling, suppression list. |
| Frontend/UI | 20 | Config lives in PlatformSettings; no dedicated email admin/preview/template UI. |
| API | 60 | Test-send exists; no template-management or send-history API. |
| Database | 60 | Config persisted+encrypted, but no send-log/bounce/suppression tables. |
| Automation | 60 | Pacing + retry + drip/reminder crons. Missing: auto-failover to Brevo on repeated SMTP failure, queue/backpressure. |
| AI | 0 | None. |
| Testing | 5 | `sendTestEmail` manual only; no automated tests. |
| **Overall** | **70** | Reliable transactional core with smart pacing/retry; gaps in deliverability ops (bounce/suppression) and Brevo failover. |

## Gaps (mark "Not Implemented")
- **Deliverability:** bounce/complaint handling, suppression list, open/click tracking — Not Implemented.
- **Failover:** automatic SMTP→Brevo failover on repeated failure — Not Implemented (Brevo only for summary/test).
- **Queue:** durable send queue/backpressure beyond in-process chain — Not Implemented.
- **Drip:** email drip cadence engine (WhatsApp drip exists; email drip not centralized) — partial/Not Implemented.
- **Admin:** template management/preview UI, per-tenant branding editor — Not Implemented.
- **Security:** remove cleartext passwords from emails; unify seatReservation send onto the settings-based service — outstanding.

## Technical Debt / Performance / Security / Scalability
- In-process serial send chain is single-instance — won't scale horizontally and can back up under bursts (a real queue/provider is needed past ~500/day).
- Two transport code paths (emailService vs seatReservationController) risk config drift.
- Cleartext credentials in email is a security issue.

## Suggestions & AI Opportunities
- Add a durable queue + provider auto-failover; add bounce/suppression via Brevo webhooks.
- Replace credential emails with magic links; consolidate all sends onto EmailService.
- AI: generate/localize/A-B optimize subject lines and drip copy; summarize a user's activity into a digest email.

## Estimated Dev Effort
~6–9 dev-days: queue + Brevo failover + bounce/suppression (3–4d), consolidate transports + magic links (1–2d), template/preview UI (2d), tests (1d).
