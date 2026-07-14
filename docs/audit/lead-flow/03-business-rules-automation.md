# Lead Flow Audit — 03: Business Rules & Automation

READ-ONLY audit. Observations only, no redesign. All citations are `file:line` relative to repo root `d:\Simple_CB_LMS\Codebegun\lms-saas`.

Scope: lead permissions, duplicate detection, validation, scoring, distribution, stage-change rules, and cron/worker automations.

---

## 1. Permission Matrix

Lead permission keys are defined in the `leads` group at `server/src/middleware/roleGuard.ts:107-121`:

| Key | Label |
|---|---|
| `manage_leads` | Full Lead Management (Admin) |
| `view_leads` | View Leads |
| `create_leads` | Create Leads |
| `edit_leads` | Edit Leads |
| `delete_leads` | Delete Leads |
| `assign_leads` | Assign Leads to Users |
| `export_leads` | Export / Import Leads |
| `view_lead_analytics` | View Lead Analytics & Reports |
| `manage_lead_stages` | Manage Lead Stages & Form Config |
| `convert_leads` | Convert Leads to Students |

Role → permission assignments come from `ROLE_PERMISSIONS` (`server/src/middleware/roleGuard.ts:201-322`):

- `SUPER_ADMIN` = `ALL_PERMISSIONS` (every key, so all lead permissions) — `roleGuard.ts:202`.
- `TENANT_ADMIN` = all 10 lead keys explicitly — `roleGuard.ts:230-231`.
- `STAFF` (Manager level) = `view_leads, create_leads, edit_leads, assign_leads, view_lead_analytics, export_leads, convert_leads` — `roleGuard.ts:296-298`. **No** `manage_leads`, `delete_leads`, or `manage_lead_stages`.
- `INSTRUCTOR` = no lead permissions (lead keys absent from list `roleGuard.ts:253-285`).
- `STUDENT` = no lead permissions (`roleGuard.ts:300-320`).
- Also present: `ATTENDANCE_ADMIN` (no lead perms, `roleGuard.ts:286-288`) and `GUEST` (`view_public_courses` only, `roleGuard.ts:321`).

Custom roles: a user with `customRoleId` gets base-role permissions **unioned** with the custom role's permissions (custom extends, never replaces) — `roleGuard.ts:338-349`. `roleGuard(requiredPermissions)` grants access if the user holds **any one** of the required perms (`.some(...)`, `roleGuard.ts:351-353`).

### Matrix (Role × capability)

Legend: **Y** = granted directly by role; **—** = not granted. "manage_leads" is a superset that satisfies every route below (routes accept it as an alternative).

| Role | create | view | edit | assign | convert | manage-stages | analytics | delete | export/import |
|---|---|---|---|---|---|---|---|---|---|
| SUPER_ADMIN | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| TENANT_ADMIN | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| STAFF | Y | Y | Y | Y | Y | — | Y | — | Y |
| INSTRUCTOR | — | — | — | — | — | — | — | — | — |
| STUDENT | — | — | — | — | — | — | — | — | — |

Notes:
- STAFF lacks `manage_leads`, so admin-only routes are closed to STAFF even though STAFF can create/edit/assign/convert. Admin-only routes (require `manage_leads`): approve pending stage change (`leadRoutes.ts:91`), audit logs (`:64`), duplicates detect/merge (`:103-104`).
- `manage_lead_stages` is defined but is **not referenced** in `server/src/routes/leadRoutes.ts`; it guards stage/form-config routes in other route files (e.g. lead stage/form-config routers), not the core lead CRUD router.
- "assign" capability is `assign_leads`; note that manual assignment via `PUT /:leadId` actually only requires `edit_leads`/`manage_leads` (`leadRoutes.ts:81`), so `assign_leads` is primarily used to infer data scope (see §7), not as a hard route gate.

### Route-level guards (`server/src/routes/leadRoutes.ts`)

Each route passes an OR-list to `roleGuard([...])`:

| Route | Method | Required perms (any-of) | Line |
|---|---|---|---|
| `/stale-followups` | GET | `view_lead_analytics, manage_leads` | 60 |
| `/analytics` | GET | `view_lead_analytics, manage_leads` | 61 |
| `/funnel-analytics` | GET | `view_lead_analytics, manage_leads` | 62 |
| `/manager-board` | GET | `view_lead_analytics, manage_leads` | 63 |
| `/audit-logs` | GET | `manage_leads` | 64 |
| `/my-performance` | GET | `view_leads, manage_leads, create_leads, edit_leads` | 67 |
| `/team-activity` (+`/details`) | GET | `manage_leads, view_lead_analytics, view_reports, view_analytics` | 69-70 |
| `/sources` | GET | `view_leads, manage_leads` | 73 |
| `/export` | GET | `export_leads, manage_leads` | 74 |
| `/import` | POST | `export_leads, manage_leads` | 75 |
| `/` | GET | `view_leads, manage_leads` | 78 |
| `/:leadId` | GET | `view_leads, manage_leads` | 79 |
| `/` (create) | POST | `create_leads, manage_leads` | 80 |
| `/:leadId` (update) | PUT | `edit_leads, manage_leads` | 81 |
| `/:leadId` (delete) | DELETE | `delete_leads, manage_leads` | 82 |
| `/:leadId/quick-update` | PATCH | `edit_leads, manage_leads, create_leads` | 85 |
| `/:leadId/stage` | PATCH | `edit_leads, manage_leads, create_leads` | 88 |
| `/:leadId/approve-stage` | POST | `manage_leads` | 91 |
| `/:leadId/activities` | POST | `edit_leads, view_leads, manage_leads` | 94 |
| `/:leadId/convert` | POST | `convert_leads, manage_leads` | 97 |
| `/aging` | GET | `view_leads, manage_leads` | 100 |
| `/duplicates` | GET | `manage_leads` | 103 |
| `/duplicates/merge` | POST | `manage_leads` | 104 |
| `/:leadId/fee` | PATCH | `edit_leads, manage_leads` | 107 |

---

## 2. Duplicate Detection

Two mechanisms, both keyed on **phone last-10-digits**, tenant-scoped. No email-based dedup exists.

- **On create (block):** `server/src/controllers/leadController.ts:392-406`. Strips non-digits (`phone.replace(/\D/g,'')`), takes last 10 (`.slice(-10)`), and queries `Lead.findOne({ tenantId, phone: { $regex: lastTen + '$' } })`. If a match exists, returns **HTTP 409** with `existingLeadId` and does not create. Skipped only if `lastTen` is empty.
- **Bulk detect (report):** `getDuplicateLeads` — `leadController.ts:1768-1793`. Aggregates by `last10` (via `$substr` of `$replaceAll` on space) within tenant, groups where `count > 1`, sorts desc, limit 100. Requires `manage_leads` (`leadRoutes.ts:103`).
- **Merge:** `mergeDuplicateLeads` — `leadController.ts:1797-1833`. Takes `primaryLeadId` + `duplicateLeadIds[]`, logs a merge activity onto primary, then `Lead.deleteMany` on the duplicates (tenant-scoped). Requires `manage_leads` (`leadRoutes.ts:104`).

Note: the create-time regex `lastTen + '$'` matches any stored phone ending in those 10 digits, but does NOT normalize the stored side (a stored number with embedded spaces/dashes before the last 10 digits still matches on suffix). Import path (`importLeads`, `leadController.ts:224+`) does its own thing and is not covered by the create-time 409 guard.

---

## 3. Validation Rules

Validation is minimal and lives in the controller:

- **Create** (`leadController.ts:373-375`): only `name` **and** `phone` are required (400 otherwise). No email format check, no phone format/length check beyond the digit-strip used for dedup. `email` is optional; `source` defaults to `'other'`; `priority` defaults to `'cold'`.
- **Stage change** (`leadController.ts:637-650`): `stageId` required (400); target stage must exist in tenant (404); if target stage name is `'Not Interested'`, a non-empty `notInterestedReason` is mandatory (400).
- **Activity add** (`leadController.ts:823-833`): `type` and `description` required; `type` must be one of `note, call, email, whatsapp, status_change, assignment`; `callOutcome` (if present) validated against an allowed list.
- **Convert to student** (`leadController.ts:1210-1222`): lead must not already be converted (`convertedStudentId`, 400); lead **must have an email** (400); email must not already belong to a `User` (400). Password defaults to `'Welcome@123'` if none supplied (`:1234`).

There is no dedicated phone/email regex validator in `leadController.ts` — email validity is effectively enforced only at convert time via the unique-user check, and phone only via digit-strip for dedup.

---

## 4. Lead Scoring

Two independent scoring implementations exist in `server/src/services/leadScoringService.ts`.

### 4a. Function-based (used by the create flow) — `scoreAndAssignLead`
`leadScoringService.ts:201-286`.

- **Config source:** `LeadScoringConfig` — active first, else any config with rules, else none (`:210-230`). If no config: returns `score=0`, keeps lead's existing priority, `eligibility='needs_review'`.
- **Score:** `calculateScore` (`:84-96`) iterates `config.scoringRules`; for each rule, reads the field via `getFieldValue` (`:56-79`, supports `custom:` prefix + standard fields), evaluates `operator` against `rule.value` (`evaluateCondition`, `:15-51`; operators: equals/not_equals/contains/not_contains/greater_than/less_than/greater_equal/less_equal/not_empty/is_empty/in). Each matched rule **adds `rule.points`** (points can be negative). Total is the sum.
- **Priority:** `determinePriority` (`:101-105`): `score >= hotThreshold → hot`; `>= warmThreshold → warm`; else `cold`. If no scoring rules, falls back to lead's own priority (`:239-241`).
- **Eligibility:** `evaluateQualification` (`:110-132`): if any `required` qualification rule fails → `not_eligible` (reason lists failures); else `eligible`. No rules → `eligible`.
- **Output written** (`:268-283`): `$set` of `score, priority, eligibility, eligibilityReason` (and `assignedTo`/`assignment.*` when assignment picked one — see §5).

**One-line formula:** `score = Σ(rule.points for each scoringRule whose field matches its operator/value)`, then `priority = hot if score≥hotThreshold, warm if ≥warmThreshold, else cold`; eligibility = `not_eligible` if any required qualification rule fails else `eligible`.

### 4b. Class-based (`LeadScoringService`, used by leadPriorityController)
`leadScoringService.ts:335-486`. Uses `LeadPriorityConfig` (auto-creates defaults, `:336-348`). `calculateScore` (`:350-386`) sums `rule.scoreImpact` for enabled matched rules; a matched rule with `setPriority` **overrides** the threshold-derived priority (`:367,371-375`); final score floored at 0 (`:380`). Supports computed fields `noReplyHours`, `daysSinceCreated`, `daysSinceLastAction` and dotted-path lookups (`:410-436`). Separate operator set (equals/notEquals/contains/greaterThan/lessThan/…/between/exists/notExists). Eligibility rules are first-match-wins, default `needs_review` (`:438-448`). Used via `updateLeadScore`/`bulkUpdateScores`/`getScoreBreakdown`; **not** invoked in the lead create flow.

---

## 5. Lead Distribution / Assignment

There are **two distinct auto-assignment paths**, and both run in the create flow (see §8 race).

### 5a. Assignment inside `scoreAndAssignLead` (`leadScoringService.ts:248-283`)
Driven by `LeadScoringConfig.assignmentMode`:
- `round_robin` (`:251-253`): `getNextRoundRobinAssignee` atomically `$inc roundRobinIndex` on the config and returns `roundRobinMembers[(index-1) % len]` (`:147-154`).
- `rule_based` (`:254-266`): `findMatchingAssignmentRule` returns the first rule whose **all** conditions match (`:180-195`); round-robins within that rule's `assignToMembers` via `$inc assignmentRules.<i>.currentIndex` (`:163-171`); if no rule matches, falls back to `fallbackMembers` round-robin (`$inc fallbackIndex`).
- On assignment, writes `assignedTo`, `assignment.assignedTo`, `assignment.assignedAt` (`:275-281`).

### 5b. Assignment inside `autoAssignLead` (`leadDistributionService.ts:14-39`)
Driven by a **separate** model `LeadDistributionConfig` (`enabled`, `mode`):
- No-op if config missing/disabled or `mode==='manual'` (`:17`).
- Candidate pool (`getCandidates`, `:42-69`): users in tenant (optionally filtered to `eligibleRoles`), then **filtered by a per-day cap** — leads assigned today per user (aggregate on `createdAt >= todayStart`) must be `< maxLeadsPerDay` (per-agent override or `maxLeadsPerDayDefault`). This is the only **load-based** element.
- `round_robin` (`pickRoundRobin`, `:72-85`): pick the candidate after the stored `roundRobinPointer`, persist new pointer.
- `weighted` (`pickWeighted`, `:88-104`): probabilistic pick proportional to per-agent `weight` (default 1).
- Writes `Lead.findByIdAndUpdate(leadId, { assignedTo })` (`:32`).

**One-line algorithm:** distribution is config-driven — `scoreAndAssignLead` does round-robin OR rule-based-round-robin over `LeadScoringConfig` members (with atomic index increment), while the parallel `autoAssignLead` does round-robin OR weighted-random over `LeadDistributionConfig` candidates that are under their daily lead cap.

---

## 6. Status / Stage Change Rules

`changeLeadStage` — `leadController.ts:632-736`:
- `stageId` required; target stage must exist in tenant (`:637-645`).
- `'Not Interested'` stage requires `notInterestedReason` (`:648-650`).
- Scope enforcement: fetched via `buildLeadScopeFilter(req)` so a user can only move leads in their data scope (`:652-656`).
- **Manager approval gate** (`:658-687`): if the target stage has `isLostStage === true` **and** the actor is not `TENANT_ADMIN`/`SUPER_ADMIN`, the change is **not applied**; instead a `pendingApproval` object is stored on the lead, managers are notified via socket `stage_approval_requested`, and the API returns **HTTP 202** ("requires manager approval"). Admins bypass the gate and apply directly (also clearing any `pendingApproval`, `:693`).
- On applied change: records a `status_change` activity, saves, calls `recordStageTransition` for time tracking (`:699-716`), writes audit log `STAGE_CHANGE`, emits `lead_stage_changed`, pushes to Google Sheet if configured, and schedules WhatsApp drip on stage entry (`:723-731`).
- **Approve pending** (`approveStageChange`, `leadController.ts:741+`): `manage_leads`-only (`leadRoutes.ts:91`); applies the stored `pendingApproval.stageId`.
- **Convert** (`convertToStudent`, `:1200-1279`): creates a `STUDENT` user, sets `lead.convertedStudentId`, moves lead to `'Converted'` stage if it exists, logs activities + audit `CONVERT`.
- Assignment-change tracking: `updateLead` (`:530+`) detects `assignedTo` changes and logs an `assignment` activity (`:579-580`).

---

## 7. Data Scope (visibility) — `server/src/middleware/leadScope.ts`

Not a route gate but governs which leads a user sees/edits. `resolveLeadScope` (`leadScope.ts:18-43`):
- Explicit `user.leadDataScope` wins if set (`:24-26`).
- Else inferred from effective permissions: `manage_leads → ALL`; `assign_leads → TEAM`; any other lead perm → `OWN` (`:37-42`).
- `buildLeadScopeFilter` (`:49-73`): `ALL` = `{}`; `TEAM` = leads assigned to self + direct reports (`managerId === self`); `OWN` = `assignedTo === self`.

So by inference: TENANT_ADMIN/SUPER_ADMIN = ALL; STAFF (has `assign_leads`, no `manage_leads`) = TEAM; a plain telecaller-type custom role = OWN.

---

## 8. Automations (crons / workers)

All lead schedulers are wired as `setInterval`/`setTimeout` in `server/src/server.ts` (there is no external cron; timers live in-process).

| Name | Interval | Scans | Action | Wiring / file:line |
|---|---|---|---|---|
| Follow-up reminders | every **5 min** (+ 10s startup fire) | `FollowUpReminder` where `reminderSent=false, status='scheduled'` and (`reminderAt<=now` OR no `reminderAt` and `scheduledAt` within 15 min) | Emits `followup_reminder` to `tenant_<id>` socket room per due reminder; bulk-marks `reminderSent=true` | `server.ts:271-280`; logic `jobs/followUpCron.ts:15-74` (`CRON_INTERVAL_MS=5*60*1000` `:5`, `DEFAULT_REMIND_BEFORE_MINUTES=15` `:8`) |
| SLA breach checker | every **30 min** (+ 30s startup fire) | `LeadStageHistory` open entries (`exitedAt=null`); joins `LeadStage.sla` | If hours-in-stage ≥ `sla.alertAfterHours` (or `maxDurationHours`), bulk-sets `Lead.slaBreach=true, slaBreachAt`; emits `sla_breach` per tenant | `server.ts:286` → `startSlaCronScheduler`; logic `jobs/slaCron.ts:13-93` (`SLA_CHECK_INTERVAL_MS=30*60*1000` `:7`) |
| Daily lead summary email | checks **every 1 min**, fires at **20:00** local | Counts per tenant: new leads today, conversions today, overdue follow-ups (`FollowUpReminder` scheduled/missed before today), active hot leads | Emails HTML summary to each tenant's `TENANT_ADMIN`s (Brevo or nodemailer); dedupes per tenant per day | `server.ts:283` → `startDailySummaryScheduler`; logic `jobs/dailySummaryCron.ts:87-163` (`SUMMARY_HOUR=20` `:11`) |
| Google Sheets sync | every **5 min** | active sheet configs (`syncAllActiveSheets`) — imports leads from Sheets | Syncs sheet rows into leads (feeds the create flow) | `server.ts:260-268` (`GSHEET_SYNC_INTERVAL=5*60*1000`) |
| AI Voice Call worker | BullMQ worker (event-driven) | queued AI-qualification calls (enqueued at lead create when `AICallConfig.enabled`, `leadController.ts:472-482`) | Places/handles AI qualification call | `server.ts:288-290` → `startAICallWorker` |

AI service (`server/src/services/leadAIService.ts`): on-demand (not a cron). Uses OpenAI (`getOpenAI()`), model `gpt-4-turbo-preview` for `generateSummary` (`:41-59`, produces summary/keyInsights/seriousnessScore 1-10/conversionProbability/suggestedNextAction, cached ≤24h) and `generateFollowUpMessage` (`:306`, multilingual EN/TE/HI WhatsApp copy with fallbacks); `generateTalkTrack` uses `process.env.OPENAI_MODEL || 'gpt-4o-mini'` (`:363`). `generateQuickInsights` (`:195-248`) is rule-based (no AI call). Purpose: telecaller-facing lead insights, follow-up copy, and call talk-tracks.

---

## 9. Known Double-Assignment Race (confirmed)

In the create flow, **both** auto-assignment mechanisms run against the same freshly-created lead, each independently writing `assignedTo`:

1. `scoreAndAssignLead(lead, tenantId)` is **awaited** at `server/src/controllers/leadController.ts:456`. Inside it, when `assignmentMode` is `round_robin`/`rule_based`, it `$set`s `assignedTo` (+ `assignment.*`) on the lead — `server/src/services/leadScoringService.ts:275-281`.
2. Immediately after, `autoAssignLead(req.tenantId!, lead._id.toString())` is fired **without await** (fire-and-forget) at `server/src/controllers/leadController.ts:468-470`. It reads a **different** config (`LeadDistributionConfig`) and, if enabled, `$set`s `assignedTo` again — `server/src/services/leadDistributionService.ts:32`.

**Confirmation:** the two writers are `leadScoringService.ts:275-281` (via `scoreAndAssignLead`, called at `leadController.ts:456`) and `leadDistributionService.ts:32` (via `autoAssignLead`, called at `leadController.ts:468`). Because (b) is not awaited and uses a separate config/algorithm, if **both** `LeadScoringConfig` (mode ≠ manual with members) **and** `LeadDistributionConfig` (`enabled`, mode ≠ manual) are configured, the final `assignedTo` is a **last-writer-wins race** — the distribution write can overwrite the scoring write nondeterministically, and the value returned to the client (populated at `leadController.ts:484`) may not reflect the final stored assignee. Round-robin index counters in both configs are also both incremented, double-consuming rotation slots.

---

### FACTS

**Permission matrix (role · create/view/edit/assign/convert/manage-stages/analytics/delete/export):**
- SUPER_ADMIN · Y/Y/Y/Y/Y/Y/Y/Y/Y (`roleGuard.ts:202`, `ALL_PERMISSIONS`)
- TENANT_ADMIN · Y/Y/Y/Y/Y/Y/Y/Y/Y (`roleGuard.ts:230-231`)
- STAFF · Y/Y/Y/Y/Y/—/Y/—/Y (`roleGuard.ts:296-298`; no manage_leads, delete_leads, manage_lead_stages)
- INSTRUCTOR · —/—/—/—/—/—/—/—/— (`roleGuard.ts:253-285`)
- STUDENT · —/—/—/—/—/—/—/—/— (`roleGuard.ts:300-320`)

**Crons (name · interval · action):**
- Follow-up reminders · 5 min · emit `followup_reminder`, mark sent (`server.ts:271`, `followUpCron.ts:15`)
- SLA breach checker · 30 min · flag `Lead.slaBreach`, emit `sla_breach` (`server.ts:286`, `slaCron.ts:13`)
- Daily summary email · 1-min check, fires 20:00 · email lead KPIs to TENANT_ADMINs (`server.ts:283`, `dailySummaryCron.ts:153`)
- Google Sheets sync · 5 min · import sheet rows into leads (`server.ts:260`)
- AI Voice Call worker · BullMQ event-driven · run AI qualification calls (`server.ts:288`)

**Scoring formula (create flow):** `score = Σ rule.points` for each `LeadScoringConfig.scoringRule` matching its operator/value; `priority = hot(score≥hotThreshold) / warm(≥warmThreshold) / cold`; `eligibility = not_eligible` if any required qualification rule fails else `eligible` (`leadScoringService.ts:84-105,110-132`).

**Distribution algorithm:** config-driven dual-path — `scoreAndAssignLead` does round-robin or rule-based-round-robin over `LeadScoringConfig` members via atomic `$inc` index (`leadScoringService.ts:248-283`); `autoAssignLead` does round-robin or weighted-random over `LeadDistributionConfig` candidates under their daily cap (`leadDistributionService.ts:14-104`).

**Double-assignment race (confirmed):** both `scoreAndAssignLead` (awaited, writes `assignedTo` at `leadScoringService.ts:275-281`, called `leadController.ts:456`) and `autoAssignLead` (fire-and-forget, writes `assignedTo` at `leadDistributionService.ts:32`, called `leadController.ts:468`) set `assignedTo` on the same new lead using different configs → last-writer-wins, nondeterministic final assignee + double-incremented round-robin counters.
