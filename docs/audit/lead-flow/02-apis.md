# Lead Management APIs — Endpoint Audit

READ-ONLY documentation audit. No source was modified. All citations are `file:line` relative to the repo root `d:\Simple_CB_LMS\Codebegun\lms-saas`.

## Conventions

- **Auth chain:** every authed endpoint runs `authMiddleware` → `tenantResolver` → `roleGuard([perms])`. `roleGuard` grants access if the user holds **any one** of the listed permissions (OR semantics). `SUPER_ADMIN` / `TENANT_ADMIN` effectively hold all lead perms.
- **Mount prefixes** are taken from `server/src/routes/index.ts:137-206`. All prefixes below are under the API base (`/api/v1`).
- **Data scope:** most Core CRUD/read handlers apply `buildLeadScopeFilter(req)` (`leadController.ts:12`, `middleware/leadScope`) so a user only sees leads within their scope (`OWN` / `TEAM` / `ALL`). Notable exceptions that do **not** apply scope: `convertToStudent`, `approveStageChange`, `getDuplicateLeads`, `mergeDuplicateLeads`, `updateLeadFee` (tenant-only match).
- Route files live in `server/src/routes/`; controllers in `server/src/controllers/`.

---

## Area 1 — Core Lead CRUD (`/leads`)

Route file: `leadRoutes.ts`. Controller: `leadController.ts`.

| Method | Path | Perms | Purpose | Side effects |
|---|---|---|---|---|
| GET | `/leads` | `view_leads`\|`manage_leads` | Paginated, filtered, scope-limited lead list | none (read) |
| GET | `/leads/:leadId` | `view_leads`\|`manage_leads` | Fetch one lead (scope-enforced) | Sets `telecallerMetrics.firstViewedAt` on first view; fire-and-forget AI summary generation (`leadController.ts:353-360`) |
| POST | `/leads` | `create_leads`\|`manage_leads` | Create a lead | Stage-history init, campaign link, **auto-score + auto-assign**, WhatsApp welcome, auto-distribute, AI-call enqueue, audit, socket events (see prose) |
| PUT | `/leads/:leadId` | `edit_leads`\|`manage_leads` | Full update (scope-enforced) | Logs `assignment` + `stage_change` activities on change; audit `UPDATE`; `lead_updated` socket |
| DELETE | `/leads/:leadId` | `delete_leads`\|`manage_leads` | Delete lead (scope-enforced) | `findOneAndDelete`; audit `DELETE`; `lead_deleted` socket |
| PATCH | `/leads/:leadId/quick-update` | `edit_leads`\|`manage_leads`\|`create_leads` | Telecaller one-shot: stage + follow-up + notes + activity | Pushes `status_change` / activity; `lead_updated` socket; **no** stage-history record, **no** drip/sheet push |
| PATCH | `/leads/:leadId/stage` | `edit_leads`\|`manage_leads`\|`create_leads` | Change stage (approval-gated for lost stages) | Stage-history transition, drip schedule, Google Sheet push, audit `STAGE_CHANGE`; may return 202 pending-approval (see prose) |
| POST | `/leads/:leadId/approve-stage` | `manage_leads` | Approve/reject a pending stage change | Applies stage, stage-history, drip, sheet push, audit; **not scope-filtered** |
| POST | `/leads/:leadId/activities` | `edit_leads`\|`view_leads`\|`manage_leads` | Add activity (multer `recording` upload) | Pushes activity; updates `telecallerMetrics` (firstActionAt/lastActionAt/totalActions); attaches recording URL |
| POST | `/leads/:leadId/convert` | `convert_leads`\|`manage_leads` | Convert lead → STUDENT user | Creates `User`, moves to "Converted" stage, activities, audit `CONVERT`; **not scope-filtered** |
| PATCH | `/leads/:leadId/fee` | `edit_leads`\|`manage_leads` | Update fee/discount/payment fields (P5) | Records `feeDiscountApprovedBy`; `status_change` activity on payment status; audit `UPDATE` |
| GET | `/leads/sources` | `view_leads`\|`manage_leads` | Distinct source values present on leads | none |
| GET | `/leads/export` | `export_leads`\|`manage_leads` | XLSX export (Leads + Summary sheets), scope-filtered | none |
| POST | `/leads/import` | `export_leads`\|`manage_leads` | CSV bulk import (body `csvData`) | Bulk `Lead.create`; each new lead gets a `created` activity. **Note:** import does NOT scope, dedupe, score, assign, or write stage-history |
| GET | `/leads/analytics` | `view_lead_analytics`\|`manage_leads` | Dashboard counts (stage/source/priority/today) | none |
| GET | `/leads/funnel-analytics` | `view_lead_analytics`\|`manage_leads` | Deep funnel: drop-off, source perf, SLA | none |
| GET | `/leads/manager-board` | `view_lead_analytics`\|`manage_leads` | Per-employee lead/stage/follow-up board | none |
| GET | `/leads/audit-logs` | `manage_leads` | Paginated `AuditLog` (module=LEAD) | none |
| GET | `/leads/my-performance` | `view_leads`\|`manage_leads`\|`create_leads`\|`edit_leads` | Telecaller self-stats (today/week/month) | none |
| GET | `/leads/team-activity` | `manage_leads`\|`view_lead_analytics`\|`view_reports`\|`view_analytics` | Per-person daily activity report | none |
| GET | `/leads/team-activity/details` | (same as above) | Drill-down behind a clicked activity metric | none |
| GET | `/leads/aging` | `view_leads`\|`manage_leads` | Leads not updated in N days | none |
| GET | `/leads/stale-followups` | `view_lead_analytics`\|`manage_leads` | Follow-up-stage leads with no recent action, grouped by BDM | none |
| GET | `/leads/duplicates` | `manage_leads` | Groups leads by last-10 phone digits | none; **not scope-filtered** |
| POST | `/leads/duplicates/merge` | `manage_leads` | Merge duplicates into a primary lead | Moves activities/notes to primary, `deleteMany` duplicates, audit `MERGE`; **not scope-filtered** |

### Important handlers

**Create — `createLead` (`leadController.ts:369-527`).** Validates `name` + `phone` required (`:373`). Resolves stage: uses provided `stageId` or the lowest-`order` active stage; 400 if no stages configured (`:377-390`). **Duplicate guard:** rejects with **409** if a lead whose phone ends in the same last-10 digits already exists (`:392-406`, returns `existingLeadId`). After `Lead.create` it fires a large chain of side effects:
- `initializeLeadStageHistory` for time-tracking (`:433`).
- `linkLeadToCampaign` when UTM source/campaign present (`:442-448`).
- **`scoreAndAssignLead`** — synchronous-awaited; computes score, priority, eligibility, and may auto-assign an owner (`:456`; service `leadScoringService.ts:246-285` writes `assignedTo` + `assignment.assignedTo`).
- `sendLeadWelcomeWhatsApp` (fire-and-forget, `:463`).
- `autoAssignLead` distribution service (fire-and-forget, `:468`) — a **second** assignment path independent of scoring.
- AI voice qualification call: if `AICallConfig.enabled`, sets `aiCallStatus='pending'` and `enqueueAICall` (`:473-482`).
- Audit `CREATE` (`:491`), `lead_created` socket, plus `hot_lead_created` to the `staff_<tenant>` room when priority is hot (`:497-508`), and `lead_assigned` when assigned to someone other than the creator (`:511-521`).
- Returns **201** with populated lead.

**Update — `updateLead` (`leadController.ts:530-629`).** Scope-enforced `findOneAndUpdate` with a whitelist of `$set` fields. Detects `assignedTo` change → pushes an `assignment` activity with a human-readable label and `{from,to}` metadata (`:580-601`). Detects `stageId` change via the edit form → pushes a `stage_change` activity (`:604-620`). **Caveat:** editing the stage through this endpoint records an activity but does **not** call `recordStageTransition`, drip, or Google-Sheet push — only the dedicated `/stage` endpoint does. Audit `UPDATE`; `lead_updated` socket.

**Change stage — `changeLeadStage` (`leadController.ts:632-738`).** Requires `stageId` (`:637`). Enforces a mandatory reason when moving to a stage named "Not Interested" (`:648`). **Manager-approval gate:** a non-admin (`role` not in `TENANT_ADMIN`/`SUPER_ADMIN`) moving a lead into a stage flagged `isLostStage` does not apply the change — it stores `pendingApproval`, emits `stage_approval_requested`, and returns **202** (`:658-687`). Otherwise it applies the stage, clears `pendingApproval`, pushes a `status_change` activity, calls `recordStageTransition` (time tracking), pushes to Google Sheet (`pushLeadStageChange`), schedules WhatsApp drip (`scheduleDripOnStageEntry`), audit `STAGE_CHANGE`, `lead_stage_changed` socket.

**Approve stage change — `approveStageChange` (`leadController.ts:741-814`).** Manager-only. Reads `lead.pendingApproval`; if `approved=false` clears it and logs a rejection activity + `lead_stage_approval_rejected` socket. If approved, applies the pending stage with the same side-effect chain as `changeLeadStage` (stage-history, drip, sheet push, audit). Matches on tenant only (no scope filter).

**Convert to student — `convertToStudent` (`leadController.ts:1200-1279`).** Guards: lead exists (tenant-only), not already converted, has an email, and no `User` with that email exists (`:1210-1222`). Splits name, creates a `STUDENT` `User` (default password `Welcome@123` if none supplied — `:1234`), sets `lead.convertedStudentId`, moves lead to a stage literally named "Converted" if one exists, logs `status_change` + `note` activities, audit `CONVERT`. **Note:** the response is sent before the audit write (`:1273-1275`).

**Import — `importLeads` (`leadController.ts:224-303`).** Body-based CSV parser (custom `parseCSVLine`, quote-aware, `:306`). Requires header + ≥1 row; maps a fixed set of headers; rows missing `name` or `phone` are skipped. Creates leads into the first active stage with a `created` activity. Returns `{imported, skipped, errors}`. **Gaps vs create:** no duplicate check, no scoring/assignment, no stage-history, no distribution.

**Export — `exportLeads` (`leadController.ts:126-221`).** Scope-filtered XLSX with a rich header set (fee, payment, call counts) plus a computed Summary sheet (totals, converted count, conversion rate, stage breakdown).

---

## Area 2 — Assignment / Scoring / Distribution

### Priority scoring (`/lead-priority`) — `leadPriorityRoutes.ts` / `leadPriorityController.ts`

| Method | Path | Perms | Purpose | Side effects |
|---|---|---|---|---|
| GET | `/lead-priority/config` | `manage_leads`\|`view_leads` | Get priority config | none |
| PUT | `/lead-priority/config` | `manage_leads` | Replace priority config | writes config |
| POST | `/lead-priority/rules` | `manage_leads` | Add a scoring rule | writes config |
| PUT | `/lead-priority/rules/:ruleId` | `manage_leads` | Update a rule | writes config |
| DELETE | `/lead-priority/rules/:ruleId` | `manage_leads` | Delete a rule | writes config |
| PUT | `/lead-priority/thresholds` | `manage_leads` | Update hot/warm/cold thresholds | writes config |
| GET | `/lead-priority/leads/:leadId/score` | `view_leads`\|`manage_leads` | Compute a lead's score | may persist score on lead |
| GET | `/lead-priority/leads/:leadId/breakdown` | `view_leads`\|`manage_leads` | Score breakdown detail | none |
| POST | `/lead-priority/recalculate` | `manage_leads` | Bulk re-score all leads | mass lead updates |
| POST | `/lead-priority/reset` | `manage_leads` | Reset config to defaults | overwrites config |

### Scoring config (`/lead-scoring`) — `leadScoringRoutes.ts` / `leadScoringController.ts`

Whole router guarded by `roleGuard(['manage_leads'])` at `leadScoringRoutes.ts:9`.

| Method | Path | Perms | Purpose | Side effects |
|---|---|---|---|---|
| GET | `/lead-scoring/config` | `manage_leads` | Get scoring/qualification config | none |
| PUT | `/lead-scoring/config` | `manage_leads` | Update scoring config | writes config |
| GET | `/lead-scoring/team-members` | `manage_leads` | Assignable team members (for round-robin/rules) | none |
| POST | `/lead-scoring/rescore-all` | `manage_leads` | Re-score (and possibly re-assign) all leads | mass updates via `scoreAndAssignLead`; counts re-assignments |

### Distribution config (`/lead-distribution-config`) — `leadDistributionRoutes.ts` / `leadDistributionController.ts`

| Method | Path | Perms | Purpose | Side effects |
|---|---|---|---|---|
| GET | `/lead-distribution-config` | `manage_leads` | Get auto-distribution config | none |
| PUT | `/lead-distribution-config` | `manage_leads` | Upsert distribution config (round-robin/weighted) | writes config; governs `autoAssignLead` at lead create |

**Auto-assignment paths:** (1) `scoreAndAssignLead` inside `createLead` and the two bulk re-score endpoints (assigns via scoring rules), and (2) `autoAssignLead` (distribution service) fire-and-forget inside `createLead`. Both write `assignedTo`.

---

## Area 3 — Follow-ups & Seat Reservations

### Follow-ups (`/follow-ups`) — `followUpRoutes.ts` / `followUpController.ts`

Default perm set `leadPermissions = ['manage_leads','view_leads','edit_leads']` (`followUpRoutes.ts:22`).

| Method | Path | Perms | Purpose | Side effects |
|---|---|---|---|---|
| GET | `/follow-ups/my` | manage/view/edit_leads | My follow-ups (paginated) | none |
| GET | `/follow-ups/today` | manage/view/edit_leads | Today's follow-ups grouped by type | none |
| GET | `/follow-ups/overdue` | manage/view/edit_leads | Overdue (scheduled/pending, past due) | none |
| GET | `/follow-ups/calendar` | manage/view/edit_leads | Calendar-grouped follow-ups | none |
| GET | `/follow-ups/team-stats` | manage/view/edit_leads | Completed/scheduled/missed per user | none |
| POST | `/follow-ups` | manage/view/edit_leads | Create follow-up | Updates `lead.nextFollowUp`; pushes `note` activity |
| POST | `/follow-ups/quick` | manage/view/edit_leads | Quick schedule (call in 30m/1h, tomorrow, WhatsApp later) | Sets `lead.nextFollowUp`; `note` activity |
| GET | `/follow-ups/lead/:leadId` | manage/view/edit_leads | A lead's follow-ups | none |
| PUT | `/follow-ups/:id/complete` | manage/view/edit_leads | Complete follow-up | Sets completed; pushes call/whatsapp/email/note **activity to the lead** |
| PUT | `/follow-ups/:id/reschedule` | manage/view/edit_leads | Reschedule | Increments `rescheduleCount`, resets reminder; updates `lead.nextFollowUp` + `note` activity |
| PUT | `/follow-ups/:id/missed` | manage/view/edit_leads | Mark missed | `note` activity on lead |
| DELETE | `/follow-ups/:id` | `manage_leads` | Delete follow-up | hard delete |

### Seat reservations (`/seat-reservations`) — `seatReservationRoutes.ts` / `seatReservationController.ts`

Default `leadPermissions = ['manage_leads','view_leads','edit_leads']` (`seatReservationRoutes.ts:28`).

| Method | Path | Perms | Purpose | Side effects |
|---|---|---|---|---|
| GET | `/seat-reservations/stats` | `manage_leads` | Reservation funnel stats | none |
| GET | `/seat-reservations/me` | auth only | Current student's reservations | none (no roleGuard) |
| GET | `/seat-reservations` | manage/view/edit_leads | List reservations | none |
| POST | `/seat-reservations` | manage/view/edit_leads | Create reservation | **Creates/updates STUDENT `User` + reset token, sends confirmation+setup email** (see prose) |
| GET | `/seat-reservations/lead/:leadId` | manage/view/edit_leads | Reservation for a lead | none |
| GET | `/seat-reservations/:id` | manage/view/edit_leads | Reservation by id | none |
| POST | `/seat-reservations/:id/payment` | manage/view/edit_leads | Record a payment | updates paid amount/status |
| POST | `/seat-reservations/:id/send-receipt` | manage/view/edit_leads | Email receipt | sends email |
| POST | `/seat-reservations/:id/convert-to-student` | `manage_leads`\|`manage_tenant_users` | Enroll reserved student into batch | Sets `status='enrolled'`, batch on user, welcome flags |
| POST | `/seat-reservations/:id/send-confirmation` | manage/view/edit_leads | Booking confirmation email | sends email |
| POST | `/seat-reservations/:id/send-payment-reminder` | manage/view/edit_leads | Payment reminder email | sends email |
| POST | `/seat-reservations/:id/send-prejoining` | manage/view/edit_leads | Pre-joining info email | sends email |
| POST | `/seat-reservations/:id/send-joining-day` | manage/view/edit_leads | Joining-day email | sends email |
| PUT | `/seat-reservations/:id/cancel` | `manage_leads` | Cancel reservation | status change |
| POST | `/seat-reservations/:id/refund` | `manage_leads` | Record refund | refund record + status |
| POST | `/seat-reservations/:id/send-whatsapp-reminder` | manage/view/edit_leads | WhatsApp payment reminder | sends WhatsApp |
| PATCH | `/seat-reservations/:id/demo-status` | manage/view/edit_leads | Update demo-period status | field update |
| PUT | `/seat-reservations/:id/installment-plan` | manage/view/edit_leads | Set/update installment plan | field update |

**`createReservation` (`seatReservationController.ts:34-201`).** Validates name/email/phone/courseName/originalPrice. Rejects if an active reservation already exists for the same email+course. Then **creates a `STUDENT` `User`** if none exists (temp password + 7-day setup `resetToken`), or refreshes the setup token for an existing user (`:69-99`), computes `finalPrice`, sets up demo window and installment plan, saves the `SeatReservation`, and auto-sends a confirmation+account-setup email (`sendCustomEmail`, `:188`). Email failure is swallowed. Returns 201.

---

## Area 4 — Stages, History, Dispositions, Lost Reasons

### Lead stages (`/lead-stages`) — `leadStageRoutes.ts` / `leadStageController.ts`

| Method | Path | Perms | Purpose | Side effects |
|---|---|---|---|---|
| GET | `/lead-stages` | manage/view/create/edit_leads | List stages | none |
| POST | `/lead-stages/initialize` | `manage_leads` | Seed default stage pipeline | bulk create |
| POST | `/lead-stages` | `manage_leads` | Create stage | writes stage |
| PUT | `/lead-stages/:stageId` | `manage_leads` | Update stage | writes stage |
| PUT | `/lead-stages/reorder/all` | `manage_leads` | Reorder stages | bulk `order` update |
| DELETE | `/lead-stages/:stageId` | `manage_leads` | Delete stage | delete |

### Stage history / analytics (`/stage-history`) — `leadStageHistoryRoutes.ts` / `leadStageHistoryController.ts`

| Method | Path | Perms | Purpose | Side effects |
|---|---|---|---|---|
| GET | `/stage-history/analytics` | `manage_leads`\|`view_lead_analytics` | Stage-level analytics dashboard | none |
| GET | `/stage-history/bottlenecks` | `manage_leads`\|`view_lead_analytics` | Bottleneck analysis | none |
| GET | `/stage-history/velocity` | `manage_leads`\|`view_lead_analytics` | Stage velocity report | none |
| GET | `/stage-history/lead/:leadId/lifecycle` | `manage_leads`\|`view_leads`\|`view_lead_analytics` | One lead's stage timeline | none |

> `recordStageTransition` and `initializeLeadStageHistory` (`leadStageHistoryController.ts:266,312`) are internal helpers invoked by `leadController` — not HTTP endpoints.

### Dispositions (`/lead-dispositions`) — `leadDispositionRoutes.ts` / `leadDispositionController.ts`

Router-level `authMiddleware, tenantResolver` (`leadDispositionRoutes.ts:15`).

| Method | Path | Perms | Purpose | Side effects |
|---|---|---|---|---|
| GET | `/lead-dispositions` | view/manage/edit/create_leads | Active dispositions (telecaller dropdown) | none |
| GET | `/lead-dispositions/all` | `manage_leads` | All incl. inactive | none |
| POST | `/lead-dispositions` | `manage_leads` | Create disposition | write |
| PUT | `/lead-dispositions/:id` | `manage_leads` | Update disposition | write |
| DELETE | `/lead-dispositions/:id` | `manage_leads` | Delete disposition | delete |

### Lost reasons (`/lost-reasons`) — `lostReasonRoutes.ts` / `lostReasonController.ts`

| Method | Path | Perms | Purpose | Side effects |
|---|---|---|---|---|
| GET | `/lost-reasons/categories` | **auth only** | Lost-reason categories | none |
| GET | `/lost-reasons/active` | `view_leads`\|`manage_leads`\|`create_leads` | Active reasons (dropdown) | none |
| GET | `/lost-reasons/config` | `manage_leads` | Full config | none |
| PUT | `/lost-reasons/config` | `manage_leads` | Update config | write |
| POST | `/lost-reasons/reasons` | `manage_leads` | Add reason | write |
| PUT | `/lost-reasons/reasons/:reasonId` | `manage_leads` | Update reason | write |
| DELETE | `/lost-reasons/reasons/:reasonId` | `manage_leads` | Delete reason | delete |
| PUT | `/lost-reasons/reasons/reorder` | `manage_leads` | Reorder reasons | write |
| GET | `/lost-reasons/analytics` | `view_lead_analytics`\|`manage_leads` | Lost-reason analytics | none |
| GET | `/lost-reasons/reengagement` | `view_leads`\|`manage_leads` | Leads due for re-engagement | none |
| POST | `/lost-reasons/leads/:leadId/mark-lost` | `edit_leads`\|`manage_leads`\|`create_leads` | Mark a lead lost | Sets lost fields + re-engagement date, `note` activity, increments reason usage count |
| POST | `/lost-reasons/leads/:leadId/reengage` | `edit_leads`\|`manage_leads` | Re-engage a lost lead | clears/updates lost state, activity |
| POST | `/lost-reasons/reset` | `manage_leads` | Reset config to defaults | overwrite |

**`markLeadAsLost` (`lostReasonController.ts:261-324`).** Looks up the lost-reason config, sets `lead.lostReason`/`lostReasonCategory`/`lostReasonDetail`/`lostAt`, computes `reEngagementDate` from body or the reason's `suggestedReEngagementDays` (default 30d), pushes a `note` activity, and increments `usageCount`/`lastUsedAt` on the reason. **Note:** matched by `Lead.findById(leadId)` (tenant is not part of the lookup filter here).

---

## Area 5 — Config / Settings

### Form config (`/lead-form-config`) — `leadFormConfigRoutes.ts` / `leadFormConfigController.ts`

| Method | Path | Perms | Purpose | Side effects |
|---|---|---|---|---|
| GET | `/lead-form-config` | manage/view/create/edit_leads | Get form config | none |
| PUT | `/lead-form-config` | `manage_leads` | Update form config | write |
| POST | `/lead-form-config/fields` | `manage_leads` | Add custom field | write |
| DELETE | `/lead-form-config/fields/:fieldKey` | `manage_leads` | Delete custom field | write |
| GET | `/lead-form-config/stats-cards` | manage/view/create/edit_leads | Stats-cards config | none |
| PUT | `/lead-form-config/stats-cards` | `manage_leads` | Update stats-cards | write |
| GET | `/lead-form-config/table-columns` | manage/view/create/edit_leads | Table-columns config | none |
| PUT | `/lead-form-config/table-columns` | `manage_leads` | Update table-columns | write |

### Source config (`/lead-source-config`) — `leadSourceConfigRoutes.ts` / `leadSourceConfigController.ts`

Whole router guarded by `roleGuard(['manage_leads'])` (`leadSourceConfigRoutes.ts:15`).

| Method | Path | Perms | Purpose | Side effects |
|---|---|---|---|---|
| GET | `/lead-source-config` | `manage_leads` | Full source config (tokens masked) | none |
| PUT | `/lead-source-config/:source` | `manage_leads` | Update one source (metaAds, whatsApp, …) | writes config (may encrypt tokens) |
| POST | `/lead-source-config/:source/test` | `manage_leads` | Test connection to a source | external call |
| POST | `/lead-source-config/third-party` | `manage_leads` | Add third-party source (IndiaMART, Sulekha…) | write |
| DELETE | `/lead-source-config/third-party/:name` | `manage_leads` | Remove third-party source | write |

> `getDecryptedTokens` (`leadSourceConfigController.ts:308`) is an internal helper, not routed.

### AI assistants (`/lead-ai`) — `leadAIRoutes.ts` / `leadAIController.ts`

| Method | Path | Perms | Purpose | Side effects |
|---|---|---|---|---|
| GET | `/lead-ai/status` | **auth only** | Check AI service availability | none |
| GET | `/lead-ai/pending` | `manage_leads` | Leads needing a summary | none |
| POST | `/lead-ai/bulk-generate` | `manage_leads` | Bulk-generate summaries | AI calls; writes summaries |
| POST | `/lead-ai/leads/:leadId/generate` | `view_leads`\|`manage_leads` | Force-regenerate summary | AI call; writes summary |
| GET | `/lead-ai/leads/:leadId/summary` | `view_leads`\|`manage_leads` | Get (cache or generate) summary | may write summary |
| GET | `/lead-ai/leads/:leadId/insights` | `view_leads`\|`manage_leads` | Rule-based insights (no AI) | none |
| GET | `/lead-ai/leads/:leadId/next-action` | `view_leads`\|`manage_leads`\|`create_leads` | Next-best-action | AI call |
| GET | `/lead-ai/leads/:leadId/followup-message` | view/manage/create/edit_leads | AI follow-up message (english/telugu/hindi) | AI call |
| GET | `/lead-ai/leads/:leadId/talk-track` | `view_leads`\|`manage_leads`\|`create_leads` | AI talk-track | AI call |

---

## Area 6 — Public intake (unauthenticated)

Route file: `publicLeadRoutes.ts`, mounted at `/public` (`index.ts:105`). Controller: `publicLeadController.ts` (+ `publicQuizController.ts` for the quiz endpoints). **No auth, no roleGuard.** In-memory IP rate limit: 10 submissions/min (`publicLeadController.ts:9-22`). File uploads via multer `.any()`, 50 MB/file → 413 on overflow.

| Method | Path | Perms | Purpose | Side effects |
|---|---|---|---|---|
| GET | `/public/form/:tenantSlug` | **public** | Enabled form fields for embedding | none |
| POST | `/public/form/:tenantSlug` | **public** | Submit external-form lead | Dedupe by phone → resubmit activity OR create lead in default stage with UTM/custom fields |
| POST | `/public/:tenantSlug/website-lead` | **public** | Website contact/enquiry capture | Always **HOT** lead, source=`website`; dedupe by phone/email escalates existing lead to hot + adds activity |
| POST | `/public/:tenantSlug/weekly-quiz-register` | **public** | Register for weekly public quiz | quiz registration (publicQuizController) |
| GET | `/public/quiz/:token` | **public (token)** | Fetch quiz by token | none |
| POST | `/public/quiz/:token/start` | **public (token)** | Start quiz session | writes session |
| POST | `/public/quiz/:token/submit` | **public (token)** | Submit quiz | writes results |
| POST | `/public/quiz/:token/heartbeat` | **public (token)** | Quiz keep-alive | writes heartbeat |

**`submitWebsiteLead` (`publicLeadController.ts:27-117`).** Resolves tenant by active slug (404 if invalid). Requires name, and at least one of phone/email. On duplicate (phone or email match) it appends a "Re-enquired via website" note and bumps cold/warm → hot (`:65-77`). Otherwise creates a hot lead in the tenant's `isDefault` stage (falling back to any stage), `createdBy = tenant.adminId`, with UTM params and a `created` activity. **Note:** this public path does **not** run scoring, distribution, WhatsApp welcome, or AI-call enqueue (unlike the authed `createLead`).

**`submitPublicLeadForm` (`publicLeadController.ts:162-276`).** Validates required fields from `LeadFormConfig`, requires name+phone, sanitizes phone, dedupes by phone (resubmission → activity), else creates a lead in the `isDefault` stage with custom fields and UTM. Same missing side-effect caveat as above.

---

### FACTS

- **Total lead-area HTTP endpoints documented: 91.** By area: Core CRUD `/leads` 24; Priority 10; Scoring 4; Distribution 2; Follow-ups 12; Seat reservations 20; Stages 6; Stage-history 4; Dispositions 5; Lost-reasons 13; Form-config 8; Source-config 5; Lead-AI 9; Public 8. (Internal helpers `recordStageTransition`, `initializeLeadStageHistory`, `getDecryptedTokens` are NOT endpoints.)

- **Core Lead CRUD endpoints + roleGuard perms** (`leadRoutes.ts`):
  - `GET /leads` — `view_leads`|`manage_leads`
  - `GET /leads/:leadId` — `view_leads`|`manage_leads`
  - `POST /leads` — `create_leads`|`manage_leads`
  - `PUT /leads/:leadId` — `edit_leads`|`manage_leads`
  - `DELETE /leads/:leadId` — `delete_leads`|`manage_leads`
  - `PATCH /leads/:leadId/quick-update` — `edit_leads`|`manage_leads`|`create_leads`
  - `PATCH /leads/:leadId/stage` — `edit_leads`|`manage_leads`|`create_leads`
  - `POST /leads/:leadId/approve-stage` — `manage_leads`
  - `POST /leads/:leadId/activities` — `edit_leads`|`view_leads`|`manage_leads`
  - `POST /leads/:leadId/convert` — `convert_leads`|`manage_leads`
  - `PATCH /leads/:leadId/fee` — `edit_leads`|`manage_leads`

- **Auto-assignment triggers:** `POST /leads` (both `scoreAndAssignLead` and `autoAssignLead`); `POST /lead-scoring/rescore-all`; `POST /lead-priority/recalculate`. `PUT /leads/:leadId` and `PATCH /leads/:leadId/quick-update` set `assignedTo` only from the explicit request body (no auto-rule).

- **Auto-scoring triggers:** `POST /leads` (create), `POST /lead-scoring/rescore-all`, `POST /lead-priority/recalculate`, `GET /lead-priority/leads/:leadId/score`. Public intake endpoints do **not** score.

- **Stage-history (`recordStageTransition`/`initializeLeadStageHistory`) triggers:** `POST /leads` (init); `PATCH /leads/:leadId/stage`; `POST /leads/:leadId/approve-stage`. NOT triggered by `PUT /leads/:leadId`, `PATCH /leads/:leadId/quick-update`, `POST /leads/:leadId/convert`, or `POST /leads/import`.

- **Public / unauthenticated endpoints** (mount `/public`, no auth, no roleGuard, IP rate-limited 10/min): `GET /public/form/:tenantSlug`, `POST /public/form/:tenantSlug`, `POST /public/:tenantSlug/website-lead` (creates HOT lead), `POST /public/:tenantSlug/weekly-quiz-register`, and token-gated `GET|POST /public/quiz/:token[/start|/submit|/heartbeat]`.

- **Auth-only (authenticated but NO roleGuard) endpoints:** `GET /lead-ai/status`, `GET /lost-reasons/categories`, `GET /seat-reservations/me`.
