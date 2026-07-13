# Lead Management
**Completion:** 88%  |  **Priority:** P1  |  **Business Impact:** High

## Purpose & Business Goal
Core CRM engine of CodeBegun LMS: capture, qualify, route, work, and convert sales leads (course enquiries) into enrolled students. This is the top-of-funnel revenue system — every ad lead, website enquiry, Google Sheet import, and WhatsApp contact lands here. It covers the full telecaller/sales workflow: pipeline (Kanban + table), stage transitions with approvals, dispositions, follow-ups, seat reservations, aging/duplicate hygiene, audit logs, and performance analytics. Bundles the config sub-features (scoring, priority, distribution, sources, stages, forms, dispositions, lost reasons, qualification) documented separately in `lead-configuration.md`.

## Primary Users & Roles
- **TENANT_ADMIN / manager** (`manage_leads`, `view_lead_analytics`, `export_leads`) — full pipeline, manager board, audit logs, approvals, duplicates/merge, fee/discount approval, team activity.
- **STAFF / Telecaller** (`view_leads`, `create_leads`, `edit_leads`, `convert_leads`) — work assigned leads, log calls/dispositions, quick-update, request stage change, book follow-ups, self-performance.
- **SUPER_ADMIN** — cross-tenant (implicit).
- Permissions are granular (`view_leads`, `create_leads`, `edit_leads`, `delete_leads`, `convert_leads`, `export_leads`, `view_lead_analytics`, `manage_leads`) enforced by `roleGuard` on every route.

## Key Files (traced)
- Model: `server/src/models/Lead.ts` (631 lines) — the richest schema in the CRM; ~60 fields.
- Model: `server/src/models/LeadStageHistory.ts` (85) — per-stage dwell tracking with live-duration virtual.
- Model: `server/src/models/LeadDisposition.ts` (28) — call outcome taxonomy.
- Sub-features folded in here (per audit grouping):
  - **Follow-Ups:** `FollowUpReminder.ts` (176), `followUpController.ts` (589), `followUpRoutes.ts` (136), `followUpCron.ts` (76, 5-min interval), `FollowUpCalendar/index.tsx` (814).
  - **Seat Reservations:** `SeatReservation.ts` (347), `seatReservationController.ts` (1027), `seatReservationRoutes.ts` (161), `SeatReservations/index.tsx` (978).
  - **Qualification Questions:** `QualificationQuestionConfig.ts` (284), `qualificationController.ts` (352), `QualificationSettings/index.tsx` (1147).
  - **SLA cron:** `slaCron.ts` (93, 30-min interval).
- Controller: `server/src/controllers/leadController.ts` (2145 lines, 26 exported handlers).
- Routes: `server/src/routes/leadRoutes.ts` (109), `publicLeadRoutes.ts` (62), `leadStageHistoryRoutes.ts` (50), `leadDispositionRoutes.ts` (25).
- Public capture: `server/src/controllers/publicLeadController.ts` (276) — `submitPublicLeadForm`, `submitWebsiteLead`, `getPublicFormConfig`.
- Frontend: `Leads/index.tsx` (1543), `LeadKanban/index.tsx` (237), `LeadDetail/` (index 1543 + LeadDetailModern 1076 + LeadDetailV2 1013 — 3 parallel versions), `LeadManagerBoard` (503), `LeadAnalytics` (350), `LeadAging` (192), `LeadApprovals` (248), `LeadAuditLogs` (113), `LeadDuplicates` (197), `LeadMyPerformance` (183), `TeamActivity` (238).

## Dependencies & Connected Modules
- **LeadStage / LeadStageHistory** — stage state machine + velocity.
- **Lead Scoring & AI** (`leadScoringService`, `leadAIService`) — auto-score/qualify on create; AI summaries/talk-tracks.
- **Lead Distribution** (`leadDistributionService.autoAssignLead`) — fire-and-forget auto-assign on create.
- **WhatsApp** (`whatsAppWelcomeService.sendLeadWelcomeWhatsApp`) — welcome message on create.
- **AdCampaign** — `linkLeadToCampaign` associates lead to campaign + UTM.
- **User** (student conversion via `convertToStudent`), **Notification** (Socket.io realtime `lead_assigned`, hot-lead alerts), **AICall** (aiCall* fields on Lead), **Seat Reservation / Follow-Up** sub-modules.

## Entry / Exit Points
- **Entry:** `POST /leads` (manual), `POST /public/form/:tenantSlug` + `POST /public/:tenantSlug/website-lead` (public, no auth), Meta webhook, Google Sheet sync, CSV `POST /leads/import`.
- **Exit:** `POST /leads/:leadId/convert` → creates Student user (converted funnel end); lost stages (mark-lost); `GET /leads/export` (CSV).
- **Work surface:** `GET /leads` (list/filter/paginate), `GET /leads/:leadId`, `PATCH /:leadId/quick-update`, `PATCH /:leadId/stage`, `POST /:leadId/approve-stage`, `POST /:leadId/activities` (multipart w/ call recording upload ≤100MB), `PATCH /:leadId/fee`.
- **Analytics:** `/analytics`, `/funnel-analytics`, `/manager-board`, `/aging`, `/duplicates` (+`/duplicates/merge`), `/my-performance`, `/team-activity` (+`/details`), `/audit-logs`, `/stale-followups`, `/sources`.
- Stage-history analytics: `GET /lead-stage-history/analytics|bottlenecks|velocity|lead/:leadId/lifecycle`.

## Database Tables & Relationships
- `leads` — central. FKs: `stageId→LeadStage`, `assignedTo/createdBy/convertedStudentId→User`, `campaignId→AdCampaign`, `tenantId→Tenant`. Embedded arrays: `activities[]` (notes/calls/whatsapp/status-change w/ call outcome+recordingUrl), `aiCallLogs[]`, `assignment.previousAssignees[]`. Maps: `customFields`, `qualificationAnswers`. 15 compound indexes all tenant-scoped.
- `leadstagehistories` — `leadId`, `stageId`, entered/exitedAt, durationMinutes; indexed `{leadId, exitedAt}` for active-stage lookup.
- `leaddispositions` — call-outcome config.
- Audit trail: written via internal `auditLog()` helper into an audit collection (surfaced by `/audit-logs`).

## Events / Notifications / Emails / WhatsApp
- Socket.io realtime: `lead_assigned`, hot-lead alert to `tenant_<id>` room on create.
- WhatsApp welcome auto-send on create (source-gated, fire-and-forget).
- Stage `triggers.onEnter` schema supports sendWhatsApp/sendEmail/notifyManager/setFollowUp (config present in `LeadStage`; execution partially wired — see gaps).
- No transactional email on lead events found in this controller (welcome path is WhatsApp only).

## AI Features (which model, or "None")
Auto-scoring on create is **rule-based (not LLM)** via `scoreAndAssignLead`. LLM features live in `leadAIService` (documented in `lead-scoring-ai.md`): AI summary, next-best-action, follow-up message (multilingual en/te/hi), talk-track — model per that doc (Claude via Anthropic/Platform Settings). `Lead.aiSummary` and `aiCallLogs`/`aiQualificationScore`/`aiCategory` persist AI output.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| Anthropic Claude | Lead AI summaries/talk-tracks (via leadAIService) | ~₹0.2–1.5 per lead summary (token-based) | Only on-demand; see scoring-ai doc |
| Meta WhatsApp Cloud API | Welcome message on create | ~₹0.7–0.8 / marketing conversation (India) | Per `whatsAppWelcomeService` |
| Multer/local disk | Call recording upload (≤100MB) | Self-hosted storage | Recordings on VPS disk, not S3 |

## Validation Rules & Edge Cases
- `name`, `phone`, `stageId`, `tenantId`, `createdBy` required; email lowercased; phone trimmed.
- Duplicate check on create (`Lead.findOne` by phone within tenant) — flags/short-circuits dup.
- Stage change respects `allowedNextStages`, `allowedRoles`, `requiresNote`, `requiresReason`, `requiredFields` (LeadStage rules). Telecaller stage changes can require manager approval → `pendingApproval` + `POST /approve-stage`.
- SLA breach flags (`slaBreach`, `slaBreachAt`) set by SLA cron.
- Duplicate detection + merge endpoint consolidates activities/history.
- Import handles CSV parsing; export streams CSV.
- Fee discount gated by `feeDiscountApproved`/`feeDiscountApprovedBy`.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 92 | 26 rich handlers, full CRUD+analytics+approvals+merge+convert+fee; mature. |
| Frontend/UI | 85 | Deep pages incl. Kanban, manager board, aging, duplicates, analytics. But 3 competing LeadDetail versions (index/Modern/V2) = tech debt/unclear canonical. |
| API | 90 | Granular, well-guarded REST surface; public capture + import/export. |
| Database | 95 | Very complete schema, 15 tenant-scoped indexes, stage-history velocity. |
| Automation | 80 | Auto-score/assign/WhatsApp on create, SLA cron, stage triggers schema present but onEnter email/whatsapp execution partial. |
| AI | 75 | Rule-scoring live; LLM summary/talk-track live but on-demand only (not auto). |
| Testing | 2 | **Zero** CRM test files in repo (repo has only 6 test files total, none touch leads). |
| **Overall** | **88** | Production-grade breadth; gaps are testing, LeadDetail consolidation, and full stage-trigger automation. |

## Sub-Feature Notes (Follow-Ups, Seat Reservations, Qualification, SLA)
- **Follow-Ups (~72%):** full CRUD + calendar + reschedule + team scorecard. Reminder cron fires **Socket.io only** (`followup_reminder`) — no email/WhatsApp despite typed intent; **no auto-aging** to missed/overdue (manual); Week view declared but unbuilt; query endpoints accept `assignedTo` without ownership check.
- **Seat Reservations (~70%):** rich payments/refunds/installments + 5-email onboarding journey + WhatsApp reminder + auto-creates STUDENT user with setup token. **Biggest gaps:** `expired` status/`expiresAt` exist but **no cron ever expires/releases a seat**; **no real batch capacity check** (`seatNumber` is free text, no decrement); **no online payment gateway** (Razorpay is an enum label only, payments manually recorded); Lead not advanced/linked on conversion; `convertToStudent` sets `welcomeEmailSent=true` without sending.
- **Qualification Questions (~50%):** well-modeled config builder, but two headline behaviors are **declared-but-not-executed**: `scoreImpact` is never computed into a lead score, and `fieldToUpdate` never writes lead fields (`saveLeadAnswers` only stores the answer Map + progress %). WhatsApp auto-qualify settings are config-only (no runtime consumer). No answer-type validation; cross-tenant risk in save/get answers (`Lead.findById` without tenantId); `reorder` route likely shadowed by `:questionId`.
- **SLA cron (~55%):** detects stage-dwell breaches and sets `Lead.slaBreach`; **Socket.io only** (`sla_breach`), no email/manager escalation (`notifyManager` unused); `escalateAfterHours`/tiered escalation not implemented; flag never cleared on stage exit; **no tenant scoping/batching** — full-collection scan every 30 min.

## Gaps (mark "Not Implemented")
- **Testing:** Not Implemented — no unit/integration tests for any lead flow.
- **Seat expiry/release automation:** Not Implemented — no cron; `expired`/`expiresAt` dead.
- **Seat batch-capacity management:** Not Implemented — no seat inventory/decrement.
- **Online payment gateway:** Not Implemented — Razorpay enum only; payments manual.
- **Qualification scoring + auto-field-update:** Not Implemented — `scoreImpact`/`fieldToUpdate` stored but never applied.
- **Follow-up/SLA email+WhatsApp delivery + status auto-aging:** Not Implemented — socket-only.
- **Stage onEnter automation:** Partially Implemented — schema supports sendEmail/assignToRole/notifyManager but execution not fully wired for all trigger types.
- **LeadDetail UX:** three parallel implementations (index.tsx, LeadDetailModern, LeadDetailV2) — dead-code/consolidation debt; unclear which ships.
- **Email notifications:** Not Implemented on lead lifecycle (WhatsApp-only welcome).
- **Empty/loading/error states:** Present in main pages; not verified exhaustively across all 11 pages.
- **Mobile:** No dedicated mobile/telecaller PWA view; desktop-first tables.
- **Bulk actions:** Bulk reassign/bulk-stage from list not confirmed (import/export exist; bulk-recalc lives in priority module).
- **Reports/exports:** CSV export present; no scheduled/emailed reports, no PDF.
- **Dedup:** phone-only on create; fuzzy name/email dedup only in `/duplicates` review, not at ingestion.

## Technical Debt / Performance / Security / Scalability
- **Debt:** 2145-line controller — should be split into services; 3 LeadDetail variants.
- **Performance:** `activities[]`/`aiCallLogs[]` embedded arrays grow unbounded on a hot lead → document bloat over time; consider capping/archiving.
- **Security:** Tenant scoping enforced via `tenantResolver`+indexes; public form endpoints are unauthenticated (rate-limiting/captcha not evident — spam risk on `/public/*`).
- **Scalability:** Heavy analytics aggregations (`funnel-analytics`, `manager-board`, `team-activity`) run on demand without materialized caching — could strain at high lead volume.
- Verbose `console.log` scoring instrumentation left in createLead (noise in prod logs).

## Suggestions & AI Opportunities
- Consolidate LeadDetail to one component; extract controller into service layer; add integration tests for stage/convert/merge.
- Add captcha + rate-limit to public capture endpoints.
- Materialize/cron-cache manager-board & funnel analytics.
- **AI:** auto-generate lead summary on ingestion (not just on-demand); AI duplicate/fuzzy-match at ingestion; AI-suggested next stage; AI call-recording transcription+scoring feeding `aiQualificationScore`; predictive conversion scoring model on historical outcomes.

## Estimated Dev Effort
- Testing suite (core flows): 5–7 days. LeadDetail consolidation: 2–3 days. Full stage-trigger automation engine: 3–4 days. Public-endpoint hardening: 1–2 days. Analytics caching: 2–3 days. **Total to reach ~95%: ~3–4 weeks.**
