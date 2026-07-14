# Lead Lifecycle, User Journeys & Leads-Scoped Findings

READ-ONLY audit. All findings cite `file:line`. Observations only — no source was modified, no redesign proposed. Scope: the real lead lifecycle as implemented (not idealized), Lead→Student conversion, per-role journeys, and a performance/security/tech-debt pass.

Repo root: `d:\Simple_CB_LMS\Codebegun\lms-saas`. Paths below are relative to that root.

---

## 1. Real Lead Lifecycle

### 1.1 Stages are data, not code

A lead's position is a reference (`Lead.stageId → LeadStage`), not an enum. Each tenant owns its own `LeadStage` documents (`server/src/models/LeadStage.ts:29-66`, `93-97`). Stages carry rich metadata that is largely **declared but not enforced** (see §4/§6):

- `category` — one of `new | engaging | qualified | negotiation | converted | lost` (`LeadStage.ts:3`, `104-108`).
- `order` — integer used for sorting and "first stage" resolution (`LeadStage.ts:80-84`).
- `isDefault`, `isFinal`, `isLostStage`, `showInKanban`, `showInTable` (`LeadStage.ts:85-88`, `172-187`).
- Movement rules `allowedNextStages` / `allowedPreviousStages` / `allowedRoles` (`LeadStage.ts:110-122`) — **defined but never consulted** by any transition path.
- `requiredFields`, `requiresNote`, `requiresReason` (`LeadStage.ts:124-136`) — **not enforced generically**; only a hardcoded check for the literal name `"Not Interested"` exists (`leadController.ts:648-650`).
- `triggers.onEnter/onExit` (WhatsApp/email/assign/follow-up/notifyManager) and `sla` (`LeadStage.ts:138-165`) — **declared but not wired** into the transition code.

### 1.2 Default seeded stages (the actual canonical funnel)

Seeded from `DEFAULT_STAGES` (`server/src/models/LeadStage.ts:198-231`), ordered by `order`:

| order | Name | category | flags |
|------|------|----------|-------|
| 0 | New Lead | new | isDefault |
| 1 | Auto WhatsApp Sent | new | |
| 2 | WhatsApp Replied | new | |
| 3 | Priority Evaluated | engaging | |
| 4 | Assigned | engaging | |
| 5 | First Call Pending | engaging | |
| 6 | First Call Attempted | engaging | |
| 7 | Connected | engaging | |
| 8 | Qualified | qualified | requiresNote |
| 9 | Follow-up Scheduled | qualified | |
| 10 | Online Meeting Set | qualified | |
| 11 | Campus Visit Set | qualified | |
| 12 | Demo Completed | qualified | |
| 13 | Payment Link Sent | negotiation | |
| 14 | Seat Reserved | negotiation | |
| 15 | Demo Student | negotiation | |
| 16 | **Enrolled Student** | converted | isFinal |
| 17 | No Response | lost | isLostStage, requiresReason |
| 18 | Not Interested | lost | isLostStage, requiresReason |
| 19 | Lost to Competitor | lost | isLostStage, requiresReason |
| 20 | Wrong Number | lost | isLostStage |

> Naming gotcha: the terminal converted stage is literally **"Enrolled Student"**. But `leadController.convertToStudent` looks up a stage named `"Converted"` (`leadController.ts:1243`), which does not exist in the seed. See §2 / §6 — the stage move on lead-side conversion silently no-ops for default tenants.

### 1.3 How transitions are recorded

Two parallel record systems track stage movement, and they can diverge:

1. **`Lead.activities[]`** — an embedded array; each transition pushes a `status_change` activity with `{from, to}` metadata (`leadController.ts:699-705`, `776-782`, `1249-1255`, `1681-1688`). Human-readable audit trail on the lead itself.
2. **`LeadStageHistory`** — a separate collection for time-in-stage analytics (`server/src/models/LeadStageHistory.ts`). On create → `initializeLeadStageHistory` opens the first record (`leadStageHistoryController.ts:312-331`, invoked at `leadController.ts:433-439`). On transition → `recordStageTransition` closes the prior record (sets `exitedAt`, computes `durationMinutes`) and opens a new one (`leadStageHistoryController.ts:266-307`, invoked at `leadController.ts:709-716` and `785-792`).
3. **`AuditLog`** — a third tenant-wide log written via the local `auditLog` helper (`leadController.ts:24-47`) on CREATE/STAGE_CHANGE/CONVERT/UPDATE.

Divergence risk: `quickUpdateLead` changes the stage and pushes an activity (`leadController.ts:1676-1688`) but **does not call `recordStageTransition`** — so `LeadStageHistory` and stage-analytics silently miss quick-update transitions. Same for the lead-side `convertToStudent` (`leadController.ts:1246-1256`) which moves the stage without recording history. Public/webhook intakes also open no history record (see §2).

### 1.4 Transition rules that ARE enforced

- **stageId required + must exist in tenant** (`leadController.ts:637-645`).
- **Mandatory reason for the literal "Not Interested" name** (`leadController.ts:648-650`).
- **Manager-approval gate for lost stages by non-admins**: if `newStage.isLostStage` and the actor is not `TENANT_ADMIN`/`SUPER_ADMIN`, the move is **not applied** — instead `Lead.pendingApproval` is set and a `stage_approval_requested` socket event fires (`leadController.ts:658-687`). A manager later calls `approveStageChange` to apply or reject (`leadController.ts:741-814`).
- **Data-scope filter** on the lead lookup: OWN/TEAM/ALL restricts which leads a user can even load to transition (`leadController.ts:652-653` via `buildLeadScopeFilter`, `middleware/leadScope.ts:49-73`).

Rules NOT enforced anywhere: `allowedNextStages`/`allowedPreviousStages` (any stage → any stage is allowed), `allowedRoles`, generic `requiresNote`/`requiresReason`/`requiredFields`, `isFinal` (a lead in the final "Enrolled Student" stage can be moved back out), SLA breach auto-flagging.

### 1.5 Text flowchart (real paths)

```
                         INTAKE (multiple doors, all land on a "default/first" stage)
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ Manual   POST /leads            createLead           (leadController.ts:369)│
   │ Website  POST /public/:slug/website-lead  submitWebsiteLead  (publicLead:27)│  → priority forced HOT
   │ Form     POST /public/form/:slug          submitPublicLeadForm(publicLead:162)
   │ Meta Ads POST /meta-leads/webhook         handleMetaLeadWebhook (meta:211)  │  → priority "warm"
   │ Google   googleAdsController (parallel intake)                              │
   │ Import   POST /leads/import               importLeads       (leadController:224)
   │ Sheet    googleSheetSyncService                                            │
   └──────────────────────────────────────────────────────────────────────────┘
        │ dedup by phone last-10 (manual/meta) or phone-then-email (website)
        ▼
   [ default stage: isDefault=true, else lowest order ]  → LeadStageHistory opened (manual path only)
        │  auto-score (scoreAndAssignLead)  +  auto-assign (autoAssignLead)  ← BOTH fire (race, §4)
        │  optional: WhatsApp welcome, AI voice-call enqueue
        ▼
   [ New Lead ] → [ Auto WhatsApp Sent ] → [ WhatsApp Replied ]     (category: new)
        ▼
   [ Priority Evaluated ] → [ Assigned ] → [ First Call Pending/Attempted ] → [ Connected ]  (engaging)
        ▼
   [ Qualified ] → [ Follow-up Scheduled ] → [ Online Meeting Set | Campus Visit Set ] → [ Demo Completed ]  (qualified)
        ▼
   [ Payment Link Sent ] → [ Seat Reserved ] → [ Demo Student ]     (negotiation)
        ▼
   [ Enrolled Student ] (converted, isFinal)      ← via SeatReservation.convertToStudent OR lead.convertToStudent
        │
        └── any point → LOST stages: [No Response | Not Interested | Lost to Competitor | Wrong Number]
                         (non-admin move → pendingApproval → manager approve/reject)
```

Note: stage names above are the *seed*; the pipeline is fully tenant-editable, so transitions are free-form between whatever stages a tenant has.

---

## 2. Lead → Student Conversion Path

There are **two independent conversion paths** that produce a `User(role=STUDENT)`, plus a standalone reservation path. They do not share code and behave differently.

### Path A — Seat reservation with account creation (the "real" money path)

`seatReservationController.createReservation` (`server/src/controllers/seatReservationController.ts:34-201`):

1. Validate `studentName/email/phone/courseName/originalPrice` (`:45-49`).
2. Dedup: reject if an active `SeatReservation` already exists for `{tenantId, studentEmail, courseName}` in status `pending|partial_paid|paid|confirmed|enrolled` (`:53-66`). **Note: this is standalone — `leadId` is optional and not required/linked here** (`SeatReservation.ts:59`, `176-179`).
3. Find-or-create the `User` (`role=STUDENT`, `profileComplete:false`) with a random temp password and a hashed `resetToken` valid 7 days (`:68-99`). This is where a Student account is actually born.
4. Create the `SeatReservation` with pricing, demo period, installment plan (`:107-132`). Status is derived by the pre-save hook from net payments (`SeatReservation.ts:317-338`).
5. Fire a setup/welcome email with a `setup-password` link (`:134-191`). Email failure is swallowed (`:189-191`).

Payment progression is driven by `addPayment` (`:205-240`) → pre-save hook recomputes `paidAmount/balanceAmount` and moves status `pending → partial_paid → paid` (`SeatReservation.ts:317-338`). Then `convertToStudent` (`:309-350`) marks `status='enrolled'`, sets `enrolledAt`, optionally assigns `batchId` on the User. It does **not** create the User (assumes it exists from step 3) and does **not** touch any `Lead` document.

### Path B — Direct lead→student (`leadController.convertToStudent`, `leadController.ts:1200-1279`)

1. Load lead; reject if already `convertedStudentId` (`:1205-1212`) or missing email (`:1214-1216`).
2. Reject if a `User` with that email exists **globally (no `tenantId` filter)** (`:1219-1221`) — cross-tenant email collision blocks conversion (§5).
3. `User.create` with `password || 'Welcome@123'` default (`:1230-1240`) — weak default credential (§5).
4. Set `lead.convertedStudentId` and try to move the lead to a stage named `"Converted"` (`:1243-1256`) — **that stage name is not seeded** (`Enrolled Student` is), so for default tenants the stage move silently no-ops while the student is still created.
5. No `SeatReservation`, no payment, no `recordStageTransition`, no batch assignment. Response is sent *before* the audit log write (`:1273-1275`).

### Path linkage gap

The two paths are **not connected**: Path A creates a student + reservation but never sets `Lead.convertedStudentId` or moves the lead stage; Path B moves the lead but creates no reservation/payment. A lead that reserves+pays via Path A still shows as un-converted on the lead board unless separately moved. Conversion analytics count only `Lead.convertedStudentId` (`leadController.ts:191`, `1876`, `1890`), so Path A conversions are invisible to lead funnel metrics.

**Conversion path steps (canonical, money path A):** create/find User(STUDENT) → SeatReservation(pending) → addPayment(s) → status partial_paid/paid (pre-save hook) → convertToStudent → status=enrolled + batch assign + welcome emails.

---

## 3. Per-Role User Journeys

Roles are base enums plus optional custom roles; lead visibility is governed by **data scope** ALL/TEAM/OWN resolved in `middleware/leadScope.ts:18-73`. Scope precedence: explicit `user.leadDataScope` > custom-role permissions > base-role permissions. `manage_leads`→ALL, `assign_leads`→TEAM, otherwise OWN (`leadScope.ts:37-42`).

Base-role lead permissions (`middleware/roleGuard.ts`):
- **TENANT_ADMIN / SUPER_ADMIN (Owner/Admin)** — full set incl. `manage_leads`, `assign_leads`, `convert_leads`, `manage_lead_stages` (`roleGuard.ts:230-231`) → scope ALL.
- **STAFF (mapped to "Manager")** — `view_leads, create_leads, edit_leads, assign_leads, view_lead_analytics, export_leads, convert_leads` but **no `manage_leads`** (`roleGuard.ts:289-298`) → scope TEAM (sees self + direct reports via `managerId`).
- **Counsellor / Telecaller** — modeled as a **custom role** or a user with `leadDataScope='OWN'` and only `view/create/edit_leads`; no `assign_leads`/`manage_leads` → scope OWN (sees only leads where `assignedTo == self`, `leadScope.ts:71-72`).

### 3.1 Admin / Owner (scope ALL)
- Sees every lead in the tenant (`buildLeadScopeFilter` returns `{}`, `leadScope.ts:52-55`).
- Intake: creates leads (`createLead`), imports CSV (`importLeads`), receives webhook/website leads automatically.
- Assignment: manual `assignedTo` on create/update, or configures auto-distribution (`LeadDistributionConfig`, round_robin/weighted).
- Qualification/follow-up: full stage control; **bypasses the lost-stage approval gate** (`leadController.ts:660-661`) — admin moves apply immediately.
- Approvals: approves/rejects pending non-admin lost-stage moves (`approveStageChange`, route `POST /:leadId/approve-stage` guarded by `manage_leads`, `leadRoutes.ts:91`).
- Fee/seat: `updateLeadFee` (`leadController.ts:2025`), creates/cancels/refunds reservations (`seatReservationRoutes.ts:135-150` guard `manage_leads`), converts to student (both paths).
- Analytics: manager board, funnel, aging, stale-followups, duplicates+merge, stage velocity/bottleneck, reservation stats.

### 3.2 Manager (STAFF base role, scope TEAM)
- Sees own + direct-reports' leads (`leadScope.ts:57-68`, keyed on `managerId`).
- Can create/edit/assign/convert/export within scope; **cannot** hit `manage_leads`-only routes: audit-logs (`leadRoutes.ts:64`), duplicates/merge (`:103-104`), approve-stage (`:91`), reservation cancel/refund/stats (`seatReservationRoutes.ts:36,139,145`).
- Manager board is scoped to their reports (`getManagerBoard`, `leadController.ts:1047-1056`).
- Because they lack `manage_leads`, their own **lost-stage moves require approval** (`leadController.ts:660-661`) — but the approval route requires `manage_leads`, which a plain STAFF manager lacks, so **only an Admin can approve** (§6 debt).

### 3.3 Counsellor / Telecaller (custom role or OWN scope)
- Sees only leads assigned to them (`leadScope.ts:71-72`).
- Primary tool is `quickUpdateLead` (`PATCH /:leadId/quick-update`, guarded by `edit_leads|manage_leads|create_leads`, `leadRoutes.ts:85`) — set stage, next follow-up, note, and log a call outcome in one call (`leadController.ts:1664-1726`).
- Logs call activities with recording upload (`addLeadActivity` + multer, `leadRoutes.ts:94`, controller `817+`).
- `getMyPerformance` for self stats (`leadRoutes.ts:67`).
- Moving a lead to a lost stage triggers the approval gate rather than applying (`leadController.ts:661-687`).
- Telecaller effort is separately tracked in `Lead.telecallerMetrics` (`Lead.ts:65-72`, `458-466`) — firstView/firstCall/totalCalls — used by stale-followup grouping (`leadController.ts:2093-2135`).

### 3.4 Public / unauthenticated (website + ad platforms)
- No auth. `submitWebsiteLead` forces `priority='hot'` and `source='website'` (`publicLeadController.ts:27-117`); `submitPublicLeadForm` validates against `LeadFormConfig` required fields (`publicLeadController.ts:162-276`); Meta webhook creates `priority='warm'` leads server-to-server (`metaLeadAdsController.ts:511-551`).

---

## 4. Performance Findings (observations only)

- **F1 — Double auto-assignment race on create.** `createLead` fires BOTH `scoreAndAssignLead` (may set `assignedTo`, `leadController.ts:456`) AND `autoAssignLead` (also sets `assignedTo`, `leadController.ts:468`) concurrently, fire-and-forget. Last write wins non-deterministically; one assignment (and its notification) is lost. `autoAssignLead` does `findByIdAndUpdate(assignedTo)` (`leadDistributionService.ts:31-33`) with no guard that scoring didn't already assign.
- **F2 — Round-robin pointer race.** `pickRoundRobin` reads `config.roundRobinPointer`, computes next, then `findOneAndUpdate` (`leadDistributionService.ts:72-85`). Two concurrent leads read the same pointer → both assigned to the same agent; not atomic. Daily-cap counting (`getCandidates`, `:53-68`) reads counts before assignment with the same read-then-write gap.
- **F3 — aggregate `tenantId` type mismatch.** `getCandidates` runs `Lead.aggregate([{ $match: { tenantId, ... } }])` with `tenantId` as a **string** (`leadDistributionService.ts:57-58`), while `tenantId` is stored as ObjectId (`Lead.ts:601-605`). `$match` in aggregation does not auto-cast → the today-count is likely always empty, so daily caps never actually apply.
- **F4 — Missing pagination on hot lists.** `getAgingLeads` (`leadController.ts:1746-1752`) and `getStaleFollowupLeads` (`:2093-2107`) hard-cap at `.limit(200)` with no paging or total — silently truncated on large tenants. `getMyReservations`/`getLeadReservation` return unbounded arrays (`seatReservationController.ts:431-447`, `412-429`).
- **F5 — In-memory rate limiter (non-distributed, unbounded).** `publicLeadController` keeps a module-level `Map` keyed by IP (`publicLeadController.ts:8-22`). It is per-process (blue/green + multi-worker each have their own), resets on restart, and never evicts stale keys (unbounded memory growth). Webhook/import/Meta-sync endpoints have no rate limiting at all.
- **F6 — N+1 in bottleneck analysis.** `getBottleneckAnalysis` runs one `Lead.find` per stage inside `Promise.all(activeStages.map(...))` (`leadStageHistoryController.ts:216-224`). Scales with the number of stages; each call also `.toObject()`s.
- **F7 — Full-collection regex dedup + unindexed scan.** Duplicate detection by phone uses anchored regex `{ $regex: last10 + '$' }` (`leadController.ts:397`, `metaLeadAdsController.ts:459`) which cannot use the `phone` index → full collection scan on every create/webhook. `getDuplicateLeads` aggregates the entire lead collection with `$substr` per doc (`leadController.ts:1770-1787`), no tenant-scoped pre-limit beyond `$match`.
- **F8 — Manager board issues many aggregations serially.** `getManagerBoard` runs 4+ separate aggregations plus role/user lookups per request (`leadController.ts:1024-1114`) with no caching; called on dashboard load.
- **F9 — Debug logging always on in webhook.** `metaLeadAdsController.ts:17` sets `const DEBUG = true` and logs full headers + full payloads on every webhook (`:212-219`, `:239`), including PII, synchronously in the request path.

---

## 5. Security Findings (observations only)

- **S1 — Meta webhook HMAC verification is effectively broken.** Signature is computed over `JSON.stringify(req.body)` (`metaLeadAdsController.ts:227-228`), not the raw request bytes; re-serialization reorders/reformats and will not match Meta's signature over the original body → verification either fails or, more importantly, is **skipped entirely** when `META_APP_SECRET` is unset or the `x-hub-signature-256` header is absent (`:224`, `:226`). On mismatch it still returns 200 (`:231`). Net effect: unauthenticated actors can POST forged `leadgen` events.
- **S2 — Webhook verify-token falls back to a hardcoded default.** `VERIFY_TOKEN` defaults to the literal `'codebegun_whatsapp_verify'` when env is unset (`metaLeadAdsController.ts:185`) — a public, guessable secret.
- **S3 — Weak default student password.** `leadController.convertToStudent` sets `password: password || 'Welcome@123'` (`leadController.ts:1234`). If the caller omits a password, every converted student gets the same known credential.
- **S4 — Cross-tenant email leak on conversion check.** The existing-user check queries `User.findOne({ email })` with **no `tenantId`** (`leadController.ts:1219`), so a lead cannot be converted if the email exists in *any* tenant — a cross-tenant information/behavior leak (contrast the reservation path which scopes by tenant, `seatReservationController.ts:69`).
- **S5 — Multi-tenant webhook resolution falls back to a global default + shared env token.** When pageId/formId don't match, the handler uses `process.env.DEFAULT_TENANT_ID` and `process.env.PAGE_ACCESS_TOKEN` (`metaLeadAdsController.ts:377-390`), so an unmatched/forged event can be written into a default tenant. Combined with S1, forged leads land in a real tenant's pipeline.
- **S6 — SeatReservation setup email exposes temp password in plaintext.** The account-creation email embeds the 12-char temp password in the HTML body (`seatReservationController.ts:168`) alongside the setup link — password in transit/at-rest in mailboxes.
- **S7 — Public endpoints echo tenant existence.** `submitWebsiteLead`/form return distinct 404s for unknown tenant slugs (`publicLeadController.ts:37-39`, `125-127`) enabling slug enumeration; combined with F5's weak limiter, lead-spam/enumeration is cheap.
- **S8 — Response sent before side effects; swallowed failures.** Conversion responds before writing the audit log (`leadController.ts:1273-1275`); reservation swallows email errors (`:189-191`); webhook swallows processing errors after 200 (`metaLeadAdsController.ts:247-250`). Failures are invisible to callers and, for audit, may never be recorded if the process dies.

---

## 6. Missing Features / Technical Debt

- **D1 — Dead AdCampaign surface.** `adCampaignController.ts` exports full CRUD + analytics (`createCampaign`, `getCampaigns`, `updateCampaignMetrics`, `getCampaignAnalytics`, delete, etc., `adCampaignController.ts:9,64,150,196,233,...`) but **no route file imports them** — only `linkLeadToCampaign` is used, by `leadController.ts:14`. The `AdCampaign` model, its metrics pre-save hook, and campaign analytics are unreachable via the API.
- **D2 — Dead Playwright ad scraper.** `services/adScraperService.ts` (Meta/Google/LinkedIn competitor-ad scraping via `playwright` chromium, `:7,25,416,534,665`) is imported by **nothing** except itself — fully unwired dead code carrying a heavy `playwright` dependency.
- **D3 — Stage metadata declared but unenforced.** `allowedNextStages`, `allowedPreviousStages`, `allowedRoles`, generic `requiresNote`/`requiresReason`/`requiredFields`, `isFinal`, and all `triggers`/`sla` config on `LeadStage` (`LeadStage.ts:110-165`, `172-179`) are never read by the transition code (`leadController.ts:632-738`). Only the hardcoded `"Not Interested"` name check and the `isLostStage` approval gate are live.
- **D4 — Two disconnected conversion paths (§2).** Path A (reservation) never sets `Lead.convertedStudentId`/moves the stage; Path B (lead) never creates a reservation/payment and targets a non-existent `"Converted"` stage (`leadController.ts:1243`). Conversion analytics only see Path B.
- **D5 — Stage history gaps.** `quickUpdateLead` (`leadController.ts:1676-1688`) and lead-side `convertToStudent` (`:1246-1256`) change stages without `recordStageTransition`, so `LeadStageHistory`, stage-velocity, and bottleneck analytics under-count real movement. Public/website/Meta intakes open no history record at all (only manual `createLead` calls `initializeLeadStageHistory`, `:433`).
- **D6 — Meta lead writes unknown fields.** The Meta create payload sets `location` and `activityLog` (`metaLeadAdsController.ts:520`, `536-540`) which are **not** schema fields (`Lead.ts`) — silently dropped; the created activity is lost and city is not stored on `interests.location`.
- **D7 — Approval-gate deadlock for plain managers.** Non-admin lost-stage moves need approval (`leadController.ts:661`), but `approveStageChange` requires `manage_leads` (`leadRoutes.ts:91`), which STAFF managers don't have (`roleGuard.ts:289-298`) — only Admins can clear the queue.
- **D8 — Dedup inconsistency across intakes.** Manual/Meta dedup on phone last-10 anchored-regex (`leadController.ts:392-406`, `metaLeadAdsController.ts:455-460`); website dedup on exact `phone`+`email` (`publicLeadController.ts:56-77`); public form dedup on **exact** sanitized phone only (`publicLeadController.ts:197-201`). Different normalization → the same person can duplicate across channels. Website/form re-enquiry paths push an activity with an invalid `type: 'form_submission'` / `performedBy` field not in the activity schema (`publicLeadController.ts:66-71`, `206-211`).
- **D9 — WhatsApp drip config partially wired.** `scheduleDripOnStageEntry` is invoked on stage change (`leadController.ts:731`, `807`) and a runner (`processDueMessages`) is scheduled hourly (`app.ts:11,260`), but the drip depends on `WhatsAppDripConfig` per tenant (`services/whatsAppDripService.ts:14,21,93`) which must be configured; on default tenants with no config it is a no-op.
- **D10 — No optimistic locking / transactions.** Reservation payment math relies on a pre-save hook recomputing from arrays (`SeatReservation.ts:317-338`); concurrent `addPayment` calls can lose a payment (read-modify-write on the `payments[]` array with no version guard).

---

### FACTS

**Ordered lifecycle stages (seed, `LeadStage.ts:198-231`):** New Lead → Auto WhatsApp Sent → WhatsApp Replied → Priority Evaluated → Assigned → First Call Pending → First Call Attempted → Connected → Qualified → Follow-up Scheduled → Online Meeting Set → Campus Visit Set → Demo Completed → Payment Link Sent → Seat Reserved → Demo Student → Enrolled Student(final) → [lost: No Response | Not Interested | Lost to Competitor | Wrong Number].

**Conversion path (money path A):** find/create User(STUDENT, tempPass) `seatReservationController.ts:68-99` → SeatReservation(pending) `:107-132` → addPayment(s) `:205-240` → status pending→partial_paid→paid via pre-save hook `SeatReservation.ts:317-338` → convertToStudent → status=enrolled + batchId + welcome email `:309-350`. (Lead-side alt path: `leadController.convertToStudent:1200-1279`, does not create a reservation and targets a non-existent "Converted" stage.)

**Top 8 findings (one line each):**
1. Double auto-assignment race — scoring + distribution both set assignedTo — `leadController.ts:456` & `468`.
2. Meta webhook HMAC computed over `JSON.stringify(req.body)` and skipped if secret/header absent — `metaLeadAdsController.ts:224-231`.
3. Distribution daily-cap broken: string `tenantId` in aggregation `$match` never matches ObjectId — `leadDistributionService.ts:57-58`.
4. Weak default student password `'Welcome@123'` on lead conversion — `leadController.ts:1234`.
5. Two disconnected conversion paths; lead-side targets non-existent "Converted" stage — `leadController.ts:1243`.
6. Dead code: entire AdCampaign controller unrouted (`adCampaignController.ts:9+`) and Playwright ad scraper unimported (`adScraperService.ts:7,665`).
7. In-memory per-process, unbounded, non-distributed rate limiter on public intake — `publicLeadController.ts:8-22`.
8. Stage history under-counts: quickUpdate + lead convert change stage without `recordStageTransition` — `leadController.ts:1676-1688`, `1246-1256`.
