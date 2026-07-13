# Lead Configuration
**Completion:** 85%  |  **Priority:** P2  |  **Business Impact:** Medium

## Purpose & Business Goal
The admin "control panel" of the CRM: a suite of per-tenant configuration models that let each institute customize its lead pipeline without code — pipeline stages, capture-form fields, scoring/priority rules, source integrations, dispositions, lost-reason taxonomy, and qualification questions. This is what makes the CRM multi-tenant-configurable. Grouped here as one file (per audit instruction) to summarize the whole config surface rather than 8 tiny files.

## Primary Users & Roles
- **TENANT_ADMIN / manager** (`manage_leads`) — sole writer for nearly all config (create/update/delete/reorder/reset).
- **STAFF / Telecaller** (`view_leads`, `create_leads`, `edit_leads`) — read-only access to active dispositions, active lost reasons, qualification questions for a stage, form config, and stages (for working leads).

## Key Files (traced)
Config models & their route/controller pairs:
- `LeadStage.ts` (233) — pipeline stages + `DEFAULT_STAGES` (21 seeded stages across 6 categories) + `triggers`/`sla` sub-schemas. `leadStageRoutes.ts` (34) / `leadStageController.ts` (149).
- `LeadFormConfig.ts` (400) — capture form fields, stats cards, table columns. `leadFormConfigRoutes.ts` (33) / `leadFormConfigController.ts` (338). UI: `LeadFormSettings/index.tsx` (1190).
- `LeadScoringConfig.ts` (115) — scoring/qualification/assignment rules (see `lead-scoring-ai.md`). UI: `LeadScoringSettings` (795).
- `LeadPriorityConfig.ts` (323) — a *second* scoring engine (priority rules, thresholds). `leadPriorityRoutes.ts` (110) / `leadPriorityController.ts` (295). UI: `LeadPrioritySettings` (783).
- `LeadSourceConfig.ts` (267) — per-source integration config (Meta/WhatsApp/Google/third-party IndiaMART/Sulekha), encrypted tokens, autoActions. `leadSourceConfigRoutes.ts` (30) / `leadSourceConfigController.ts` (414). UI: `LeadSources/index.tsx` (1153).
- `LeadDistributionConfig.ts` (52) — auto-assignment (see `lead-distribution.md`). UI: `LeadDistributionSettings` (211).
- `LostReasonConfig.ts` (327) — lost-reason categories/reasons + re-engagement. `lostReasonRoutes.ts` (139) / `lostReasonController.ts` (519). UI: within Leads/LeadDetail.
- `QualificationQuestionConfig.ts` (284) — qualification questions per stage, WhatsApp settings. `qualificationRoutes.ts` (110) / `qualificationController.ts` (352). UI: `QualificationSettings/index.tsx` (1147).
- `LeadDisposition.ts` (28) — call disposition taxonomy. `leadDispositionRoutes.ts` (25) / `leadDispositionController.ts` (73).

## Dependencies & Connected Modules
- Consumed by **Lead Management** (createLead reads form/scoring/stage config), **Lead Scoring/Priority** (two configs), **Lead Distribution**, **WhatsApp** (LeadSourceConfig holds phoneNumberId + qualification language + autoActions), **Meta/Google Ads** (LeadSourceConfig tokens), **SLA cron** (LeadStage.sla).
- `LeadSourceConfig.whatsApp.config.phoneNumberId` is the tenant-routing key for inbound WhatsApp.

## Entry / Exit Points
- Each config exposes GET config + PUT config + granular CRUD/reorder/reset endpoints (all `manage_leads`).
- Read endpoints for telecaller surfaces: `GET /lead-dispositions`, `GET /lost-reasons/active`, `GET /qualification/stage/:stageId`, `GET /lead-form-config` (+stats-cards, table-columns), `GET /lead-stages`.
- Notable actions: `POST /lead-stages/initialize` (seed defaults), `POST /lost-reasons/reset`, `POST /qualification/reset`, `POST /lead-priority/reset`, `POST /lead-source-config/:source/test` (connection test), `POST /lead-source-config/third-party` (add IndiaMART/Sulekha).

## Database Tables & Relationships
- All config models are **per-tenant** (most with `unique` index on `tenantId`), except `LeadStage`/`LostReason`/`QualificationQuestion` which are collections keyed by tenant.
- `LeadStage` FKs: `allowedNextStages[]`/`allowedPreviousStages[]→LeadStage`; drives `Lead.stageId`.
- `LeadSourceConfig` stores encrypted access tokens (masked on GET) — most security-sensitive config.
- `LostReasonConfig` categories: financial/competitor/timing/quality/other → mirrored on `Lead.lostReasonCategory`.

## Events / Notifications / Emails / WhatsApp
- `LeadStage.triggers.onEnter` declares sendWhatsApp/sendEmail/notifyManager/setFollowUp (schema-level; partial execution — see Lead Management gaps).
- `LeadSourceConfig.autoActions.sendWhatsAppWelcome` + `whatsAppWelcomeTemplate` drive the welcome message.
- `qualificationQuestionConfig.whatsappSettings` feeds the WhatsApp inbound bot questions.

## AI Features (which model, or "None")
None in the config layer itself (rule definitions). The rules are consumed by rule-based scoring (not LLM). AI model usage is in `leadAIService` (see scoring-ai doc).

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| Meta / Google / WhatsApp tokens | Stored (encrypted) in LeadSourceConfig | n/a (storage) | `test` endpoint validates connection |
| Third-party (IndiaMART, Sulekha) | Source config entries | Depends on vendor subscription | Config-only; sync not fully built |

## Validation Rules & Edge Cases
- Stage movement rules: `allowedNextStages`, `allowedRoles`, `requiresNote`, `requiresReason`, `requiredFields`, `isFinal`, `isLostStage` — enforced at stage-change in Lead Management.
- Stage delete guarded (can't delete stage with leads / default) — in controller.
- Tokens masked on read; encryption at rest for LeadSourceConfig.
- Reorder endpoints for stages/reasons/questions maintain `order`.
- `initializeDefaultStages` seeds 21 stages idempotently.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 90 | Every config has full CRUD + reorder + reset; mature controllers (519-line lostReason). |
| Frontend/UI | 90 | Very deep settings pages (Form 1190, Sources 1153, Qualification 1147, Priority 783, Scoring 795). |
| API | 88 | Complete, consistently guarded; a couple of read endpoints intentionally open to telecallers. |
| Database | 92 | Rich per-tenant schemas; encrypted tokens; good indexing. |
| Automation | 70 | Config supports triggers/autoActions but not all execute (stage onEnter partial). |
| AI | 0 | None by design (rule config). |
| Testing | 0 | No tests for any config module. |
| **Overall** | **85** | Config surface is broad and UI-complete; weak spots: two redundant scoring configs, untested, partial trigger execution. |

## Gaps (mark "Not Implemented")
- **Two competing scoring configs** (`LeadScoringConfig` vs `LeadPriorityConfig`) — redundant, confusing, no unification. Both have full UIs.
- **Stage onEnter automation:** trigger schema present, execution partial — Not Fully Implemented.
- **Third-party source sync** (IndiaMART/Sulekha): config entries exist, actual polling/ingestion Not Implemented (only Meta/Google/Sheets ingest).
- **Testing:** Not Implemented.
- **Audit logging** of config changes: not evident (Lead has audit logs; config changes largely unaudited).
- **Config versioning/rollback:** Not Implemented.
- **`eligibleRoles` picker** in distribution UI: Not Implemented (model field only).

## Technical Debt / Performance / Security / Scalability
- **Debt:** LeadScoringConfig + LeadPriorityConfig duplication is the biggest smell — two engines writing `Lead.priority`/`score`.
- **Security:** LeadSourceConfig token encryption is good; ensure decryption keys rotate. Config writes are `manage_leads`-gated (correct), but drip-config route (WhatsApp) lacks role guard (cross-module note).
- **Scalability:** config is small per-tenant; no concern.

## Suggestions & AI Opportunities
- Unify the two scoring configs into one engine + one settings page.
- Add config-change audit trail + versioning.
- Build third-party source connectors (IndiaMART API) to match config UI.
- **AI:** AI-suggested scoring rules from historical conversions; AI-generated qualification questions per course; AI stage-flow recommendations.

## Estimated Dev Effort
- Unify scoring configs: 4–6 days. Config audit+versioning: 3 days. Third-party connectors: 5–8 days each. Tests: 3–4 days. **Total to ~93%: ~3 weeks.**
