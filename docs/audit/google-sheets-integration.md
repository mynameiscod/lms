# Google Sheets Integration
**Completion:** 80%  |  **Priority:** P2  |  **Business Impact:** Medium

## Purpose & Business Goal
One-way import of leads from public Google Sheets (especially Meta Lead Ads CSV exports) into the CRM on a schedule, with per-tab tracking, column mapping, dedupe, auto-scoring, and an optional opt-in push-back of lead stage changes to a Google Apps Script webhook. Lets non-technical staff funnel spreadsheet leads into the pipeline without any Google Cloud setup.

## Primary Users & Roles
- **TENANT_ADMIN** (`manage_leads`) — creates/edits integrations, maps columns, triggers sync. All endpoints `manage_leads`-guarded.

## Key Files (traced)
- `server/src/models/GoogleSheetIntegration.ts` (85).
- `server/src/services/googleSheetSyncService.ts` (553).
- `server/src/controllers/googleSheetController.ts` (304) + `routes/googleSheetRoutes.ts` (39).
- `client/src/pages/GoogleSheetIntegration/index.tsx` (640) — polished single-page CRUD.

## Dependencies & Connected Modules
- **Lead Management** (creates `Lead`), **Lead Scoring** (`scoreAndAssignLead` per new lead).
- Consumes public docs.google.com CSV/HTML endpoints — no Google API.

## Entry / Exit Points
- `POST /google-sheet-integrations/fetch-tabs`, `/fetch-headers` (discovery), `GET|POST /`, `GET|PUT|DELETE /:id`, `POST /:id/sync`, `POST /:id/reset-sync` (all `manage_leads`).
- Outbound (optional): `pushLeadStageChange` → POST to `pushWebhookUrl` (Apps Script), fire-and-forget, unsigned.

## Database Tables & Relationships
- `GoogleSheetIntegration` (per tenant): sheetId, sheetNames[], `columnMapping[{sheetColumn,leadField}]`, `lastSyncedRows: Map<tab,rowCursor>`, syncInterval (default 10, 1–1440), defaultSource/Priority/StageId, assignToUserId, `syncLogs[]` (capped 50), lastSyncAt/lastError, `pushBackEnabled`, `pushWebhookUrl`. Indexed on tenantId + isActive. Writes into `Lead`.

## Events / Notifications / Emails / WhatsApp
- None (import-only). Optional outbound stage-change webhook to Apps Script.

## AI Features (which model, or "None")
None native. Indirect: `scoreAndAssignLead` per imported lead.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| Google Sheets public CSV/HTML (`gviz/tq`, `/htmlview`) | Read rows/tabs | Free, no quota key | **Requires sheet shared "Anyone with link can view"** — privacy consideration |
| Google Apps Script Web App | Optional stage-change push-back | Free (user-hosted) | DIY, unsigned |

## Validation Rules & Edge Cases
- CSV parser handles quoted/escaped fields; redirect handling ≤5; clear "share publicly" error on non-200.
- Row skipped if no name/phone/email. Dedupe by phone-last-10 then case-insensitive email.
- Per-row priority override if sheet has a `priority` column. `custom:key` mappings → `customFields`.
- Meta export prefixes (`p:`,`l:`,`f:`…) stripped; `<test lead:` placeholders dropped.
- On URL change: resets `lastSyncedRows`.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 85 | Full incremental multi-tab sync + dedupe + scoring + logging; weak spot is fragile row-cursor + no real API. |
| Frontend/UI | 90 | Rich CRUD/mapping UI (fetch tabs → map columns → settings), loading/error/history states, enforces Name+Phone mapping. |
| API | 95 | All 9 endpoints implemented + role-guarded + tenant-scoped. |
| Database | 95 | Complete model with per-tab cursor, logs, push-back fields, indexes. |
| Automation | 85 | 5-min cron + per-integration interval works; push-back is DIY and not UI-configurable. |
| AI | 40 | Indirect scoring only. |
| Testing | 10 | No automated tests for sync/parsing. |
| **Overall** | **80** | Production-usable one-way importer with a strong UI; caveats are cursor fragility + public-sheet dependency. |

## Gaps (mark "Not Implemented")
- **Row-index cursor fragility:** inserting/deleting/reordering rows above the cursor skews sync (skips/dupes) — no stable row key/hash.
- **No Google Sheets API:** can't read private sheets; brittle `/htmlview` tab discovery.
- **Push-back webhook unsigned/unauthenticated** and DIY; `pushBackEnabled`/`pushWebhookUrl` **not exposed in the UI form** — can't be configured from frontend.
- `assignToUserId`, `defaultStageId`, `headerRow` in model/controller but **not in the create/edit form**.
- No retry/alerting on repeated sync failures beyond `lastError`.
- **Testing:** Not Implemented.

## Technical Debt / Performance / Security / Scalability
- **Correctness:** row-count cursor is the core fragility — a real deliverability bug at scale.
- **Security/privacy:** requires world-readable sheets (anyone with the link reads customer PII).
- **Scale:** fine for typical volumes; every-5-min cron across integrations is cheap.

## Suggestions & AI Opportunities
- Migrate to Google Sheets API (service account) for private sheets + stable row addressing (or hash-key each row to avoid cursor skew). Expose push-back + stage/assignee/headerRow in the UI. Add failure alerting. Add tests for the CSV parser + dedupe.
- **AI:** LLM-assisted column auto-mapping; AI dedupe/entity resolution across sheet + existing leads.

## Estimated Dev Effort
- Sheets API + stable row keys: 4–6 days. Expose hidden config in UI: 2 days. Failure alerting: 1 day. Tests: 2 days. **Total to ~92%: ~1.5–2 weeks.**
