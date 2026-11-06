# CRM Lead Lifecycle Redesign — Audit + Design

Status: **DESIGN — awaiting owner approval. No code changed yet.**
Branch: `new_crm` (no merge of `feature/ui-redesign`; current CRM styling is kept).
Date: 2026-11-06

## Owner decisions (locked)

| # | Decision |
|---|---|
| D1 | **Everything is configurable per institute** — stages, sub-stages, reasons. The product may be sold to other businesses, so nothing is a fixed code list. The 7 CodeBegun stages are an editable *starter set*, not hard-coded. |
| D2 | **No data migration.** Existing stages and leads stay as they are; the owner moves leads by hand. We provide bulk move to make that practical. |
| D3 | **Meta Conversions API: build it, ship it switched OFF + test mode.** Dataset/token to be worked out together. |
| D4 | **Ad spend sync from Meta Marketing API: build it.** |
| D5 | **Reasons belong to a sub-stage** (each sub-stage has its own reason list; reason can be mandatory). |

How configurability and Meta/reports coexist: each stage carries a **milestone** chosen from a dropdown
(`new · contacting · connected · qualified · demo · seat_reserved · enrolled · nurture · lost · none`).
Names are free text; reports, Meta events and automation read the milestone, never the name.

---

## Part A — Audit (what exists today)

### A1. What works and must be preserved
- Lead intake from Meta Lead Ads (webhook + 5-min recovery poller with lease lock), Google Ads webhook, website/public forms, Google Sheets, WhatsApp, CSV import, assessment funnel.
- Dedupe by Meta submission id + last-10-digit phone, re-enquiry tracking.
- Auto-assignment (`leadDistributionService`), priority scoring, AI summaries.
- Outpero AI-calling: forward outbox + call-result webhook that moves stages **by stage ID** (`OUTPERO_STAGE_MAPPING`, `OUTPERO_SENT_STAGE`). Stage IDs must survive.
- `LeadStageHistory` (enter/exit/duration) and its analytics routes; SLA cron.
- FollowUpReminder model + calendar; Meeting model; lead archive; WhatsApp broadcasts by stage; lead scope (ALL/TEAM/OWN) and permission keys (`manage_leads`, `manage_lead_stages`, …).
- Placement Program's Meta CAPI sender (`placementGrowthService.ts`) — separate, untouched.

### A2. Stage model — mostly unused rules
`LeadStage` has `category`, `allowedNextStages`, `allowedRoles`, `requiresNote`, `requiresReason`, `triggers`, `sla`, `isFinal`, `isLostStage`… but:
- The stage API and the Lead Stages page accept **only `name` + `color`** — none of the rule fields can be set.
- **Enforced:** `isLostStage` (non-admin → manager approval), `sla.alertAfterHours`, `isFinal`/category for Outpero stop. **Everything else is stored and never read.**
- Three different "default stage" lists exist (`STARTER_STAGES` in onboarding — the one actually used; `initializeDefaultStages`; unused `DEFAULT_STAGES`).
- No sub-stage concept. `LeadDisposition` exists (flat list, optional `stageIds`) but has no admin page and `stageIds` is never used.

### A3. Hard-coded stage names (break when stages are user-defined)
| Where | Hard-coded |
|---|---|
| `leadController.ts:690,737` + `Leads/index.tsx:455` | `'Not Interested'` → requires reason |
| `leadController.ts:1403` (convert) | `'Converted'` — silently skips the move if missing |
| `leadController.ts:2259` | regex `/follow.?up/` for stale follow-ups |
| `metaLeadAdsController.ts:650`, `assessmentLeadService.ts:25` | `name: /new/i` |
| `whatsAppDripService.ts:33` | drip matches fuzzy stage **name** (ignores its own `stageId` field) |
| `LeadMyPerformance:59` | conversion = stage name contains `'convert'` |
| `LeadDetailV2.tsx:614` | "visited stages" parsed from activity text with a regex |
| `publicLeadController.ts:228,253` | `isDefault` with no fallback → lead fails validation if no default stage |

### A4. Stage changes bypass each other
Seven code paths change a lead's stage; only two write history and only one enforces rules:
`changeLeadStage` (rules + history), `approveStageChange` (history), `updateLead` (**no tenant check, no rules, no history**), `quickUpdateLead` (no history), `convertToStudent` (no history), `reEngageLead` (unvalidated, no history), Outpero (history). Leads not created manually get **no initial history row**, so SLA cron never sees them.

### A5. Live bugs found (counsellors hit these today)
1. **Lead page call outcomes mostly fail.** `LeadDetailV2` offers `no_answer / voicemail / wrong_number / callback_requested`; the server accepts only `not_answered / not_connected / busy / rejected / connected` → 400. (Verified: `leadController.ts:963`, `LeadDetailV2.tsx:986-990`.)
2. **Moving to "Not Interested" from the lead page or Kanban fails** (no reason prompt → 400), and a lost-stage move that needs approval (202) is shown as "Stage updated".
3. Fee & payment, dispositions, lost-reason modal, payment link and meeting scheduler exist **only in the old, un-routed lead page** — invisible to users.
4. `createMeeting` pushes an activity with wrong field names → any later `lead.save()` on that lead fails.
5. `GET /leads/aging` and `/leads/duplicates` are registered after `/:leadId` and are swallowed by it (verified `leadRoutes.ts:84,109,112`).
6. `LostReasonConfig` default reasons use category `'contact'`, which the Lead schema rejects. `markLeadAsLost` is not tenant-scoped and uses `req.user._id` (undefined).
7. `nextFollowUp` is never cleared when a follow-up is completed → "overdue" counts are inflated.
8. Google Ads webhook writes `utmParams.utmCampaign` etc. — wrong keys, silently dropped.

### A6. Meta integration
- **Stored:** leadgen id (`metaSubmissionIds`), form id, ad id/name, ad-set name, campaign name, field data.
- **Not stored:** **ad-set id, Meta campaign id, page id** (adset_id is fetched then dropped; `sourceDetails.campaignId` is an ObjectId so it can't hold Meta's id). Campaign reporting can't join to Meta reliably until fixed.
- **Webhook signature check is weak:** skipped when secret/header missing, hashes re-serialised JSON instead of raw body (genuine events can fail), non-constant-time compare, silently drops on mismatch. WhatsApp already has the correct implementation to reuse.
- `/meta-leads/sync` and `/setup-webhook` have no permission guard (any signed-in user).
- **No Conversions API for leads.** **No Marketing API (spend) calls anywhere.** `AdCampaign` model + controller exist but the controller is not mounted.

### A7. UI
- Live pages: Leads list, LeadDetailV2, Lead Stages (name/colour only), Lead Sources, Archive, Team Activity. Hidden-but-routed: Kanban, Follow-ups calendar, Analytics, Manager board, Meetings, Aging, Duplicates, Approvals.
- Leads list: good filters, configurable columns/stat cards; **no saved views, no column sort, no bulk stage move, no bulk assign** (only bulk WhatsApp).
- No shared PageHeader/DataTable/StatCard components; CRM styles are page-local (`.crm-*`, `.ld2-*`) on the admin tokens in `AdminCore.css`. We reuse these.

### A8. Infrastructure to reuse
- Background jobs: `setInterval` runners in the job-runner process (`server/src/jobs`). BullMQ exists (one queue).
- **Outbox pattern:** `outperoForwardService` (pending/sent/failed, attempts, backoff, retry-failed, stats) — the template for the Meta outbox.
- Per-tenant secrets: `SystemSetting` via `settingsService.getCredential` (encrypted, per-tenant). ⚠ `ENCRYPTION_KEY` in prod is still the weak literal — new Meta tokens inherit that weakness until the re-key pass is done.

---

## Part B — Design

### B1. Data model (all additive; existing IDs untouched)

**`LeadStage` (extend)**
- `+ milestone` enum (see top). `category` kept and derived from milestone for old readers.
- `+ kind` derived: `active` | `nurture` | `lost`.
- Make the existing rule fields **real and editable**: `requiresNote`, `allowedNextStages` (empty = any), `allowedRoles`, `isFinal`, lost-approval (`isLostStage` → derived from milestone `lost`, plus a toggle "needs manager approval").
- `+ metaEventName` (optional, defaults per milestone — see B4).

**`LeadSubStage` (new)** — `tenantId, stageId, name, color, order, isActive, requiresReason, requiresNote, requiresFollowUp` (counsellor must set next follow-up date).

**`LeadReason` (new)** — `tenantId, stageId, subStageId, name, order, isActive, requiresDetail` (free-text box, for "Other").

**`Lead` (extend)**
- `+ subStageId, reasonId, reasonDetail, stageEnteredAt`
- `+ milestones: { contactingAt, connectedAt, qualifiedAt, demoAt, seatReservedAt, enrolledAt, lostAt, nurtureAt }` — **first time reached**, never overwritten. Used for funnel denominators and Meta dedupe.
- `+ nurture: { reactivateAt }`
- `+ sourceDetails.metaCampaignId, metaAdSetId, metaPageId, metaLeadCreatedAt` (fixes A6).

**`LeadStageHistory` (extend)** — `+ fromStageId, subStageId, reasonId, note, source` (`manual | bulk | outpero | automation | convert | reopen`).

**Configurable activity lists** — one generic collection `LeadPicklist { tenantId, list, label, order, isActive, flags }` with lists:
`call_outcome` (flag `countsAsConnected`, `suggestRetryHours`), `followup_reason`, `demo_status` (flag `attended`/`noShow`), `nurture_reason`. Starter values = the spec's lists. Replaces the hard-coded call-outcome enum (fixes A5-1).

`LeadDisposition`: kept read-only for old activities; no longer offered in the UI.

### B2. One stage-change service
`leadLifecycleService.changeStage(lead, { stageId, subStageId?, reasonId?, reasonDetail?, note?, nextFollowUp?, actor, source })`
used by **every** path (stage PATCH, updateLead, quick-update, approve, convert, re-engage, Outpero, bulk, Kanban). It:
1. Validates tenant, active stage, sub-stage belongs to stage, reason belongs to sub-stage, required reason/note/follow-up, `allowedNextStages`, `allowedRoles`.
2. Lost approval gate (configurable) → 202 + pending, UI shows "Sent for approval".
3. Closes/opens `LeadStageHistory`, writes `status_change` activity with structured metadata (no more text parsing).
4. Stamps first-reach `milestones.*`; enqueues Meta event (B4) only on first reach.
5. Existing side effects: Sheet push, drip (switched to stage **ID**), Outpero stop on final stages.

Hard-coded names (A3) replaced: "requires reason" → `requiresReason`; "Converted" → milestone `enrolled`; "new" → `isDefault` or milestone `new`; stale follow-ups → `nextFollowUp` overdue.
**Reopen** = moving a lost/nurture lead to an active stage; allowed for `manage_leads` (or a new `reopen_leads` key), history row `source: reopen`.

### B3. Qualification
Reuse the existing Qualification questions page. Add per-question `requiredForQualified`. Moving into a `qualified`-milestone stage requires those answered; evidence (answers + who + when) is stored with the history row. Answered calls never auto-qualify. Duplicate qualified events are impossible because `milestones.qualifiedAt` is set once.

### B4. Meta Conversions API (CRM / Conversion Leads)
- **Outbox** `MetaCrmEvent { tenantId, leadId, milestone, eventName, eventId, eventTime, status: pending|sent|failed|skipped, attempts, nextAttemptAt, httpStatus, response, testEventCode }`, unique `(tenantId, eventId)`; `eventId = crm-<leadId>-<milestone>` → never sent twice. Processed by a job every minute (Outpero pattern: retry on network/429/5xx with backoff, permanent fail otherwise). CRM never waits on Meta.
- **Which leads:** only leads with a Meta leadgen id (that's what Meta can match for Conversion Leads); `user_data.lead_id` = leadgen id, plus hashed phone/email. Others → `skipped`.
- **No `Lead` event** for Meta form leads (Meta already has them).
- **Event names:** per stage `metaEventName`, defaulting from milestone. Meta's CRM integration uses *your* stage names as events, so names like `Contacted`, `QualifiedLead`, `DemoAttended` work — **exact payload fields (`action_source`, `custom_data.event_source`, `lead_event_source`), API version and naming rules will be re-checked against Meta's current docs before Slice 5 is coded.**
- **Settings (per tenant, encrypted):** `META_CRM_DATASET_ID`, `META_CRM_ACCESS_TOKEN`, `META_CRM_TEST_EVENT_CODE`, `META_CRM_MODE = off | test | live` (default **off**). Migration-free → no historical events are ever back-sent; "test" mode attaches the test code.
- **Monitoring page:** counts by status/milestone, failed list with error + retry, last 7 days sent, test-send button, coverage ("x% of Meta leads reached Qualified").
- Also in this slice: store ad-set/campaign/page ids, fix webhook signature (raw body + timing-safe, log→enforce mode like WhatsApp), guard `/meta-leads/sync|setup-webhook` with `manage_leads`.

### B5. Ad spend sync (Marketing API)
- Settings: `META_AD_ACCOUNT_ID`, `META_ADS_ACCESS_TOKEN` (`ads_read`), per tenant.
- `AdSpendDaily { tenantId, date, campaignId, campaignName, adSetId, adId, spend, impressions, clicks, currency }`; nightly job pulls the last 3 days (Meta revises), "Backfill 90 days" button.
- Joins to leads by `metaCampaignId / metaAdSetId / adId` → CPL, cost per Qualified, cost per Enrolled, campaign quality.

### B6. UI (current CRM styling, no new design system)
1. **Pipeline settings** (`/lead-stages` rebuilt): three columns — Stages → Sub-stages → Reasons; drag order, colour, active, milestone dropdown, required toggles, allowed-next, approval. "Add starter stages" button (adds the 7 + Nurture + Lost as editable; does not touch existing stages). Activity lists (call outcomes, follow-up reasons, demo statuses, nurture reasons) on a second tab.
2. **Stage-change panel** (one component used on lead page, list row, Kanban): Stage → Sub-stage → Reason (+ detail) → Note → Next follow-up, showing only what that stage requires.
3. **Leads list:** columns per spec (latest call outcome, last contacted, lead age, sub-stage), column sort, **bulk move stage / bulk assign**, **saved views** (per user, server-side), stat strip by milestone + overdue.
4. **Lead detail (V2):** sections per spec; bring back fees/payment and meetings from the dead page; Meta sync history.
5. **Follow-up queue:** Due today · Overdue · Upcoming · Unassigned · Nurture reactivation.
6. **Admissions dashboard** (B7) and **Meta sync monitor** (B4).

### B7. Reporting
Funnel by milestone using `milestones.*At` (first reach, so reopened/duplicate leads aren't double-counted); denominators = leads **created** in the date range (cohort). Counsellor conversion, lead aging, follow-up SLA, campaign quality, cost metrics from B5.

### B8. Automation (configurable, all off by default)
First-contact SLA alert, unanswered-call retry scheduling (from `call_outcome.suggestRetryHours`), overdue follow-up reminders, demo reminders + no-show follow-up, seat-reserved follow-up, nurture reactivation, duplicate flagging, Meta retry. **Nothing ever auto-moves a lead to Lost.**

---

## Part C — Delivery plan (each slice: tests → push → owner reviews → owner deploys)

| Slice | Scope | Size |
|---|---|---|
| **0** | Live bug fixes A5-1…8 (call outcomes, reason prompt + 202 handling, meeting activity, route order, lost-reason bugs, follow-up clearing, Google UTM keys) | S |
| **1** | Milestone on stages, `LeadSubStage`, `LeadReason`, Pipeline settings page, starter set | M |
| **2** | `leadLifecycleService` + stage-change panel everywhere + history/milestones + bulk move/assign + hard-coded names removed | L |
| **3** | Picklists (call outcomes etc.), demo via Meeting (attendance), nurture reactivation, qualification gate | M |
| **4** | Leads list redesign: columns, sort, saved views; Follow-up queue; lead detail sections | L |
| **5** | Meta: attribution ids, webhook signature fix, CRM event outbox, monitor page (off/test) | M |
| **6** | Ad spend sync + cost metrics | M |
| **7** | Admissions dashboard | M |
| **8** | Automation rules | M |

## Part D — Risks / open items
- **Meta dataset + token:** to work out together (Events Manager → the dataset linked to the Lead Ads page; system-user token with `ads_management`/`ads_read`). Until then Meta runs in `off`.
- `ENCRYPTION_KEY` is still weak in prod → stored Meta tokens are only as safe as that key.
- With no migration, old leads have no sub-stage/reason/milestones; funnel reports are accurate from go-live onward, and old leads appear as "stage only".
- Outpero stage mapping uses stage IDs — if the owner deletes an old stage that Outpero maps to, Outpero will reject; the Pipeline page will warn before deleting a stage referenced by Outpero settings.
- Production read of current stage names/counts was blocked by the permission check; not needed now (no migration).
