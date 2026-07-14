# Lead Management UI Flow — Audit (05)

READ-ONLY documentation audit of the CodeBegun LMS Lead Management UI. All citations are `file:line`. Where a documented feature is absent it is marked **Not present**.

- Source of routes: `client/src/App.tsx`
- Source of nav / role / permission gates: `client/src/components/layout/Sidebar.tsx`
- Lead API client: `client/src/api/index.ts` (`leadApi`, `leadStageApi`, `leadFormConfigApi`, `leadPriorityApi`, `qualificationApi`, `salesContentApi`, `googleSheetApi`, `leadSourceConfigApi`, `leadScoringApi`, `followUpApi`, `meetingApi`, `leadDistributionApi`, `seatReservationApi`)
- Pages audited: `client/src/pages/*/index.tsx`

Route gating uses the `<ProtectedRoute requiredRoles=[...] requiredPermissions=[...]>` wrapper in `App.tsx`. Sidebar entries carry their own `roles`/`permissions` arrays (`Sidebar.tsx:219-243`). Note: most routes are gated **by role only** in `App.tsx`; the Sidebar submenu adds the finer permission requirements for *visibility*. STAFF users can see a menu item on permission alone even when their role is not listed (`Sidebar.tsx:253-256`). SUPER_ADMIN bypasses permission checks (`Sidebar.tsx:262-266`).

---

## Leads Sidebar submenu (nav structure)

Defined in `Sidebar.tsx:219-244`. Group header **"Leads"** — `roles: [SUPER_ADMIN, TENANT_ADMIN, STAFF]`, `moduleKey: 'leads'`, group `permissions: [manage_leads, view_leads, create_leads, edit_leads]` (`Sidebar.tsx:220-224`). Submenu items in order:

| # | Label | Path | Roles | Permissions |
|---|-------|------|-------|-------------|
| 1 | All Leads | `/leads` | SUPER_ADMIN, TENANT_ADMIN, STAFF | manage_leads, view_leads (`Sidebar.tsx:226`) |
| 2 | Follow-up Calendar | `/follow-ups` | SUPER_ADMIN, TENANT_ADMIN, STAFF | view_leads, edit_leads (`Sidebar.tsx:227`) |
| 3 | Seat Reservations | `/seat-reservations` | SUPER_ADMIN, TENANT_ADMIN, STAFF | manage_leads, view_leads, convert_leads (`Sidebar.tsx:228`) |
| 4 | Analytics | `/leads/analytics` | SUPER_ADMIN, TENANT_ADMIN | manage_leads, view_lead_analytics (`Sidebar.tsx:229`) |
| 5 | My Performance | `/lead-my-performance` | STAFF | view_leads, edit_leads, create_leads (`Sidebar.tsx:230`) |
| 6 | Manager Board | `/lead-manager-board` | SUPER_ADMIN, TENANT_ADMIN, STAFF | manage_leads, view_lead_analytics (`Sidebar.tsx:231`) |
| 7 | Team Activity | `/team-activity` | SUPER_ADMIN, TENANT_ADMIN | view_lead_analytics (`Sidebar.tsx:232`) |
| 8 | Sales Content | `/sales-content` | SUPER_ADMIN, TENANT_ADMIN, STAFF | view_leads, create_leads (`Sidebar.tsx:233`) |
| 9 | Lead Sources | `/lead-sources` | SUPER_ADMIN, TENANT_ADMIN | manage_leads (`Sidebar.tsx:234`) |
| 10 | Lead Stages | `/lead-stages` | SUPER_ADMIN, TENANT_ADMIN | manage_leads, manage_lead_stages (`Sidebar.tsx:235`) |
| 11 | Priority Settings | `/lead-priority-settings` | SUPER_ADMIN, TENANT_ADMIN | manage_leads (`Sidebar.tsx:236`) |
| 12 | Qualification Questions | `/qualification-settings` | SUPER_ADMIN, TENANT_ADMIN | manage_leads (`Sidebar.tsx:237`) |
| 13 | Form Settings | `/lead-form-settings` | SUPER_ADMIN, TENANT_ADMIN | manage_leads (`Sidebar.tsx:238`) |
| 14 | Google Sheets | `/google-sheet-integration` | SUPER_ADMIN, TENANT_ADMIN | manage_leads (`Sidebar.tsx:239`) |
| 15 | Lead Scoring | `/lead-scoring-settings` | SUPER_ADMIN, TENANT_ADMIN | manage_leads (`Sidebar.tsx:240`) |
| 16 | Audit Logs | `/lead-audit-logs` | SUPER_ADMIN, TENANT_ADMIN | manage_leads (`Sidebar.tsx:241`) |
| 17 | AI Call Config | `/ai-call-config` | SUPER_ADMIN, TENANT_ADMIN | manage_leads (`Sidebar.tsx:242`) |

The Leads group sits in the admin nav section **"CRM & GROWTH"** alongside Placement Partnership (`Sidebar.tsx:375`).

**Pages NOT surfaced in the Leads submenu** (route exists in `App.tsx`, no Sidebar entry): `/leads/:leadId` (Lead Detail — reached by clicking a lead), `/lead-kanban` (`App.tsx:1552`), `/lead-aging` (`App.tsx:1522`), `/lead-duplicates` (`App.tsx:1532`), `/lead-approvals` (`App.tsx:1542`), `/lead-distribution-settings` (`App.tsx:1442`), `/meetings` (`App.tsx:1492`). "All Leads" (`/leads`) has its own in-page Table/Board toggle, so the standalone Kanban route is effectively redundant.

---

## Per-page documentation

### 1. All Leads — `/leads`
- **File:** `client/src/pages/Leads/index.tsx`
- **Route/gate:** `App.tsx:1322-1331` — roles `[SUPER_ADMIN, TENANT_ADMIN, STAFF]`, no `requiredPermissions` (role-gated at route; permissions applied by Sidebar for visibility).
- **Purpose:** Primary lead workspace — searchable/filterable lead list with switchable Table and Kanban Board views, stats dashboard, bulk actions, quick-capture.
- **Key components:** header + view toggle (`Leads/index.tsx:582-598`); configurable stats cards (`607-686`); "New Leads Today / by source / calls-by-assignee" widgets (`687-716`); BDM "Today's Activity" widget (`718-737`); toolbar with filters (`739-816`); Kanban board with per-stage columns and stale-day badges (`825-931`); Table view with configurable columns (`947-1153`); mobile card list (`1155-1211`); create/edit modal (`1215-1293+`).
- **Primary actions/buttons:** Table/Board toggle (`584-586`); **My Leads** filter toggle (`587-592` → `handleMyLeads` `486-493`); **Import** (`593` → modal → `leadApi.importLeads` `479`); **Export** (`594` → `handleExport`/`leadApi.exportLeads` `459-472`); **Walk-in** quick-capture (`595` → `leadApi.createLead` `426`); **+ New Lead** (`596` → `leadApi.createLead`/`updateLead` `407-408`); per-row stage change select (`1044-1049` → `leadApi.changeStage` `449`, with "Not Interested" reason modal `446-457`); row menu View/Edit/Delete (`1083-1104`, delete `leadApi.deleteLead` `415`); bulk **Send WhatsApp** (`939` → `wa.me` deep links `517-526`).
- **Filters:** search (name/email/phone, debounced 400ms `203-209`), stage, source, assignee (team-only `755-760`), priority, date-range presets all/today/week/month/custom (`768-791`). Active-filter chips + Clear all (`792-805`). Filters persisted to `sessionStorage` (`195-200`).
- **Search:** yes (`743-745`). **Sorting:** leads sorted by `createdAt` desc client-side (`272`); no column-sort UI. **Pagination:** yes, `limit:100`, Prev/Next (`1146-1152`, mobile `1204-1210`).
- **In-component gate:** `canViewTeam` (admin or `manage_leads`/`view_lead_analytics`) controls the All-Assignees filter (`101-104`, `755`); `canDelete` (admin or `delete_leads`/`manage_leads`) gates delete (`537-540`).
- **Bulk import/export:** **Import CSV** modal + **Export XLSX** live here (`593-594`, handlers `459-484`). **Bulk WhatsApp** on multi-select (`511-526`).
- **Activity timeline / notes / call-log:** Not on this page (lives in Lead Detail). Per-lead notes editable in the create/edit modal only.
- **API:** `leadApi.getLeads`, `leadApi.getAnalytics` (x2), `leadStageApi.getStages`, `leadFormConfigApi.getConfig/getStatsCardsConfig/getTableColumnsConfig`, `userApi.getUsers`, `leadApi.getSources`, `leadApi.getMyPerformance`, `createLead`, `updateLead`, `deleteLead`, `changeStage`, `exportLeads`, `importLeads`.

### 2. Lead Detail — `/leads/:leadId`
- **File:** `client/src/pages/LeadDetail/index.tsx`
- **Route/gate:** `App.tsx:1342-1351` — roles `[SUPER_ADMIN, TENANT_ADMIN, STAFF]`. Not in Sidebar (reached by clicking a lead).
- **Purpose:** Full lead profile — contact panel, activity timeline, qualification checklist, fee/meetings, AI insights, conversion.
- **Key components:** left contact/quick-actions panel + convert button (`766-932`); center activity feed + add-activity form (`935-1083`); right panel with stage selector, priority, qualification checklist, AI insights, concerns, content share, WhatsApp engagement, fee & meetings cards (`1086-1373`).
- **Primary actions:** **Add Activity** (note/call/email/WhatsApp, optional recording upload → `leadApi.addActivity` `492`); **Change Stage** (`leadApi.changeStage` `472`, Not-Interested reason modal); **Save Notes** (`leadApi.quickUpdate` `545`); Save Course Interest (`updateLead` `532`); Save Concerns (`updateLead` `521`); **Generate AI Summary** (`leadAIApi.generateSummary` `561`); **Save Qualification Answers** (`qualificationApi.saveLeadAnswers` `587`); **Share Content** (`salesContentApi.shareWithLead` `626`); Mark WhatsApp Reply (`662,671`); **Delete Lead** (`502`); **Convert to Student** (`leadApi.convertToStudent` `510`); update Fee/Payment (`leadFeeApi.update` `173`); Schedule Meeting (`meetingApi.create` via modal `278`).
- **Filters/search/sorting/pagination:** Timeline type filter tabs — all/note/call/email/whatsapp/status_change (`364`, `945-950`). No search/sort/pagination.
- **In-component gate:** Delete button gated on `TENANT_ADMIN`/`SUPER_ADMIN`/`delete_leads` (`746-751`).
- **Activity timeline / notes / call-log:** **This is the hub.** Timeline grouped by date (`709-714`); **call recordings playback** (`1069-1074`); call outcome + disposition on activities (`52-54` interface); notes editor (`893-918`); qualification checklist w/ progress (`1146-1243`); AI insights (seriousness/conversion `1245-1279`); WhatsApp engagement stats (`1344-1366`); fee & meetings cards (`1368-1372`).
- **API:** `leadApi.getLeadById/changeStage/addActivity/deleteLead/convertToStudent/updateLead/quickUpdate`, `leadStageApi.getStages`, `leadFormConfigApi.getConfig`, `qualificationApi.getConfig/saveLeadAnswers`, `salesContentApi.getAll/shareWithLead`, `leadAIApi.generateSummary`, `leadDispositionApi.getDispositions`, `leadFeeApi.update`, `meetingApi.list/update`.

### 3. Lead Kanban — `/lead-kanban`
- **File:** `client/src/pages/LeadKanban/index.tsx`
- **Route/gate:** `App.tsx:1552-1561` — roles `[SUPER_ADMIN, TENANT_ADMIN, STAFF]`. **Not in Sidebar** (redundant with the Board view inside `/leads`).
- **Purpose:** Standalone drag-and-drop board for moving leads across stages.
- **Key components:** stage columns (`139-233`), draggable lead cards (`169-218`), loading spinner (`129-134`).
- **Primary actions:** drag lead → `leadApi.changeStage(leadId, toStageId)` (`99`); Refresh (`122`).
- **Filters/search/sorting/pagination:** Not present.
- **In-component gate:** route-gated only.
- **Bulk / activity / notes / call-log:** Not present.
- **API:** `leadStageApi.getStages` (`44`), `leadApi.getLeads({limit:500})` (`45`), `leadApi.changeStage` (`99`).

### 4. Lead Analytics — `/leads/analytics`
- **File:** `client/src/pages/LeadAnalytics/index.tsx`
- **Route/gate:** `App.tsx:1482-1491` — roles `[SUPER_ADMIN, TENANT_ADMIN]`.
- **Purpose:** Funnel analytics dashboard — conversion, source performance, call outcomes, priority distribution, team SLA.
- **Key components:** summary cards (`165-178`); stage funnel with bottleneck badges (`181-218`); source performance table (`221-253`); call-outcomes chart (`256-274`); priority distribution (`277-300`); team SLA table (`303-344`).
- **Primary actions:** Refresh (`160`); filter controls.
- **Filters:** date From/To (`148-152`), Assigned-To dropdown (`154-159`). No search/sort/pagination.
- **In-component gate:** route-gated only.
- **Bulk / activity / notes / call-log:** Not present.
- **API:** `leadApi.getFunnelAnalytics` (`91`), `userApi.getUsers` (`77`).

### 5. Lead Aging — `/lead-aging`
- **File:** `client/src/pages/LeadAging/index.tsx`
- **Route/gate:** `App.tsx:1522-1531` — roles `[SUPER_ADMIN, TENANT_ADMIN, STAFF]`. **Not in Sidebar.**
- **Purpose:** Surfaces leads stuck in a stage past threshold, bucketed healthy/attention/critical/dead.
- **Key components:** urgency summary cards (`87-104`); aging table w/ days-stuck & urgency badge (`107-191`).
- **Primary actions:** Open lead → `/leads/{id}` (`177`); Refresh (`79`).
- **Filters:** days-threshold dropdown 3+/7+/14+/30+ (`68-78`). No search/sort/pagination.
- **In-component gate:** route-gated only.
- **Bulk / activity / notes / call-log:** Not present.
- **API:** `leadApi.getAgingLeads({days, stageId})` (`37`).

### 6. Lead Approvals — `/lead-approvals`
- **File:** `client/src/pages/LeadApprovals/index.tsx`
- **Route/gate:** `App.tsx:1542-1551` — roles `[SUPER_ADMIN, TENANT_ADMIN]`. **Not in Sidebar.**
- **Purpose:** Manager queue for pending stage-change requests.
- **Key components:** pending-requests table (`124-208`); Approve/Reject per row (`177-200`); reject-reason modal (`212-245`).
- **Primary actions:** Approve → `leadApi.approveStageChange(id, true)` (`52`); Reject → `approveStageChange(id, false, reason)` (`66`); Open lead (`196`); Refresh (`92`).
- **Filters/search/sorting/pagination:** Not present.
- **In-component gate:** route-gated only.
- **Bulk / activity / notes / call-log:** Not present.
- **API:** `leadApi.getPendingApprovals` (`34`), `leadApi.approveStageChange` (`52, 66`).

### 7. Lead Audit Logs — `/lead-audit-logs`
- **File:** `client/src/pages/LeadAuditLogs/index.tsx`
- **Route/gate:** `App.tsx:1392-1401` — roles `[SUPER_ADMIN, TENANT_ADMIN]`.
- **Purpose:** Audit trail of lead modifications with user attribution, action type, IP.
- **Key components:** audit-log table — time/user/action badge/details/IP (`73-99`).
- **Primary actions:** Refresh on filter change (`49`).
- **Filters:** Lead-ID text filter (`57-64`). **Pagination:** Prev/Next, 50/page (`38`, `104-106`). No search/sort beyond lead-ID filter.
- **In-component gate:** route-gated only.
- **Bulk / activity / notes / call-log:** This *is* the audit log (records CREATE/UPDATE/DELETE/ASSIGN/STAGE_CHANGE/CONVERT/EXPORT/IMPORT/VIEW `16-26`); not the per-lead activity timeline.
- **API:** `leadApi.getAuditLogs({page, limit, leadId})` (`40`).

### 8. Lead Distribution Settings — `/lead-distribution-settings`
- **File:** `client/src/pages/LeadDistributionSettings/index.tsx`
- **Route/gate:** `App.tsx:1442-1451` — roles `[SUPER_ADMIN, TENANT_ADMIN]`. **Not in Sidebar.**
- **Purpose:** Configure auto-distribution mode (round_robin / weighted / manual) and per-agent caps.
- **Key components:** enable toggle (`103-111`); mode cards (`121-139`); default max-leads/day (`142-152`); per-agent weight/cap table (`155-198`).
- **Primary actions:** Save Settings → `leadDistributionApi.update(config)` (`87`, button `203`).
- **Filters/search/sorting/pagination:** Not present.
- **In-component gate:** route-gated only.
- **Bulk / activity / notes / call-log:** Bulk per-agent config table; no activity/notes/call-log.
- **API:** `leadDistributionApi.get/update`, `userApi.getUsers`.

### 9. Lead Duplicates — `/lead-duplicates`
- **File:** `client/src/pages/LeadDuplicates/index.tsx`
- **Route/gate:** `App.tsx:1532-1541` — roles `[SUPER_ADMIN, TENANT_ADMIN]`. **Not in Sidebar.**
- **Purpose:** Detect & merge duplicate leads (match on last 10 digits of phone).
- **Key components:** duplicate-group cards (`120-194`); primary-selection radios (`156-167`); lead table per group (`143-188`); Refresh (`83-86`).
- **Primary actions:** Refresh → `leadApi.getDuplicateLeads` (`33`); **Merge Duplicates** → `leadApi.mergeDuplicateLeads(primaryId, dupeIds)` (`62`, button `131`).
- **Filters/search/sorting/pagination:** Not present (auto-sorts oldest as default primary `40-42`).
- **In-component gate:** route-gated only.
- **Bulk / activity / notes / call-log:** Bulk merge; activities consolidated into primary on merge (`191`). No timeline UI.
- **API:** `leadApi.getDuplicateLeads`, `leadApi.mergeDuplicateLeads`.

### 10. Lead Form Settings — `/lead-form-settings`
- **File:** `client/src/pages/LeadFormSettings/index.tsx`
- **Route/gate:** `App.tsx:1362-1371` — roles `[SUPER_ADMIN, TENANT_ADMIN]`.
- **Purpose:** Configure custom form fields, sources, stats cards, table columns, and an embeddable capture form.
- **Key components:** 5 tabs — Form Fields / Lead Sources / Stats Cards / Table Columns / Embed Form (`530-556`); fields table (`559-675`); sources badge list (`678-712`); stats-cards config (`715-800`); columns config (`803-898`); embed-code generator (`901-1103`); add-custom-field modal (`1106-1185`).
- **Primary actions:** Save Changes → `updateConfig` (`239`, btn `503`); Add Field (`500`); Save Stats Cards → `updateStatsCardsConfig` (`389`); Save Columns → `updateTableColumnsConfig` (`458`); Copy embed code (`1071`).
- **Filters/search/sorting/pagination:** Not present. Drag-to-reorder fields/cards/columns (`224-230, 346-352, 407-413`).
- **In-component gate:** route-gated only.
- **Bulk / activity / notes / call-log:** Not present. (Configures the columns/stats used by the All Leads table; provides embeddable external form.)
- **API:** `leadFormConfigApi.getConfig/updateConfig/addCustomField/deleteCustomField/getStatsCardsConfig/updateStatsCardsConfig/getTableColumnsConfig/updateTableColumnsConfig`, `leadStageApi.getStages`.

### 11. Lead Manager Board — `/lead-manager-board`
- **File:** `client/src/pages/LeadManagerBoard/index.tsx`
- **Route/gate:** `App.tsx:1372-1381` — roles `[SUPER_ADMIN, TENANT_ADMIN, STAFF]`.
- **Purpose:** Team performance dashboard — per-employee lead breakdown, reassignment, SLA & conversion widgets.
- **Key components:** header/team count (`215-224`); stats config panel (`227-243`); summary cards (`248-259`); Today's Meetings / SLA Breaches / 7-Day Conversion widgets (`262-337`); expandable employee cards w/ nested lead list (`340-476`); reassign modal (`479-498`).
- **Primary actions:** Stats config toggle (`221`); expand employee card (`352`); **Reassign** per lead → `leadApi.updateLead` (`160`, btn `462`); **View** lead (`463`).
- **Filters/search/sorting/pagination:** implicit `limit:200` (`144`); no search/sort UI.
- **In-component gate:** route-gated only. Stats config persisted to `localStorage` (`75-82, 196`).
- **Bulk / activity / notes / call-log:** No import/export. Per-employee activity timeline referenced in data model (`14`); reassignment is the main write.
- **API:** `leadApi.getManagerBoard/getLeads/updateLead/getFunnelAnalytics`, `meetingApi.list`.

### 12. Lead My Performance — `/lead-my-performance`
- **File:** `client/src/pages/LeadMyPerformance/index.tsx`
- **Route/gate:** `App.tsx:1382-1391` — roles `[SUPER_ADMIN, TENANT_ADMIN, STAFF]`. Sidebar restricts visibility to STAFF (`Sidebar.tsx:230`).
- **Purpose:** Individual telecaller's personal performance dashboard (read-only).
- **Key components:** key-stats cards (assigned / today's follow-ups / overdue / conversion `72-95`); activity summary today/week/month with progress bar (`98-125`); stage breakdown + recent activities timeline (`127-178`).
- **Primary actions:** None (read-only).
- **Filters/search/sorting/pagination:** Not present.
- **In-component gate:** route-gated; implicitly scoped to current user.
- **Bulk / activity / notes / call-log:** Read-only recent-activities timeline w/ per-type icons (`159-175`); no import/export.
- **API:** `leadApi.getMyPerformance`.

### 13. Lead Priority Settings — `/lead-priority-settings`
- **File:** `client/src/pages/LeadPrioritySettings/index.tsx`
- **Route/gate:** `App.tsx:1402-1411` — roles `[SUPER_ADMIN, TENANT_ADMIN]`.
- **Purpose:** Configure priority scoring rules and hot/warm/cold thresholds.
- **Key components:** header w/ Recalculate & Reset (`323-338`); 3 tabs Scoring Rules / Thresholds / Settings (`342-361`); rule list + quick-add templates (`365-557`); threshold diagram/inputs (`560-623`); settings toggles (`625-664`); rule-edit modal (`669-778`).
- **Primary actions:** **Recalculate All Scores** → `bulkRecalculate` (`280`, btn `326`); **Reset to Defaults** → `resetToDefaults` (`294`, btn `333`); Add/Edit/Delete rule → `addRule/updateRule/deleteRule` (`238/235, 268, 256`); Save Thresholds → `updateThresholds` (`173`).
- **Filters/search/sorting/pagination:** Not present.
- **In-component gate:** route-gated only.
- **Bulk / activity / notes / call-log:** Bulk recalculation of all lead scores; no activity/notes/call-log.
- **API:** `leadPriorityApi.getConfig/updateThresholds/addRule/updateRule/deleteRule/bulkRecalculate/resetToDefaults`, `leadFormConfigApi.getConfig`.

### 14. Lead Scoring Settings — `/lead-scoring-settings`
- **File:** `client/src/pages/LeadScoringSettings/index.tsx`
- **Route/gate:** `App.tsx:1432-1441` — roles `[SUPER_ADMIN, TENANT_ADMIN]`.
- **Purpose:** Configure scoring rules, qualification criteria, and assignment strategy (round-robin / rule-based).
- **Key components:** 3 tabs Scoring Rules / Qualification Criteria / Assignment Modes (`401-410`); thresholds (`420-445`); scoring-rule builder (`448-509`); qualification-rule builder (`514-579`); assignment mode + member routing + fallbacks (`590-766`).
- **Primary actions:** **Save Configuration** → `updateConfig` (`161`, btn `394`); **Re-score All Leads** → `rescoreAll` (`178`, btn `390`); Add Rule / Criterion / Assignment Rule (`453/521/655`).
- **Filters/search/sorting/pagination:** Not present.
- **In-component gate:** route-gated only.
- **Bulk / activity / notes / call-log:** Bulk re-scoring of all leads; no activity/notes/call-log.
- **API:** `leadScoringApi.getConfig/getTeamMembers/updateConfig/rescoreAll`, `leadFormConfigApi.getConfig`.

### 15. Lead Sources — `/lead-sources`
- **File:** `client/src/pages/LeadSources/index.tsx`
- **Route/gate:** `App.tsx:1422-1431` — roles `[SUPER_ADMIN, TENANT_ADMIN]`.
- **Purpose:** Manage lead source integrations (Meta Ads, WhatsApp, Website Form, Google Sheets, Walk-in, Referral, Google Ads, third-party portals) + per-source auto-actions.
- **Key components:** summary stats (`975-996`); source-cards grid for 7 built-in channels (`1046-1058`); ConfigModal for credentials & auto-actions (`140-620`); auto-actions tab w/ priority + WhatsApp welcome template (`479-575`); third-party portals w/ add/remove/copy-URL (`1061-1128`).
- **Primary actions:** Configure/Save → `leadSourceConfigApi.updateSource` (`864`, btn `792`); **Sync Now** (Meta) → `metaLeadsApi.syncLeads` (`935`); **Test Connection** → `testConnection` (`884`); **Auto-Setup Webhook** (Meta) → `metaLeadsApi.setupWebhook` (`922`); Add/Remove third-party portal (`897/911`); Refresh (`970`).
- **Filters/search/sorting/pagination:** Not present.
- **In-component gate:** route-gated only.
- **Bulk / activity / notes / call-log:** Meta lead sync is a bulk ingest; no activity/notes/call-log.
- **API:** `leadSourceConfigApi.getSources/updateSource/testConnection/addThirdPartySource/removeThirdPartySource`, `metaLeadsApi.setupWebhook/syncLeads`.

### 16. Lead Stages — `/lead-stages`
- **File:** `client/src/pages/LeadStages/index.tsx`
- **Route/gate:** `App.tsx:1352-1361` — roles `[SUPER_ADMIN, TENANT_ADMIN]`. Sidebar also requires `manage_lead_stages` (`Sidebar.tsx:235`).
- **Purpose:** Create/edit/reorder/delete lead lifecycle stages (name + color).
- **Key components:** empty state w/ Initialize Defaults or Create (`122-129`); stages list w/ up/down + color dot (`137-155`); create/edit modal (`159-189`).
- **Primary actions:** Initialize Default Stages → `initializeDefaults` (`45`, btn `126`); + Add Stage (`133`); Edit (`148`); Delete non-default (`88`, btn `150`); Move up/down → `reorderStages` (`103`); Create/Update → `createStage`/`updateStage` (`75/72`).
- **Filters/search/sorting/pagination:** Not present.
- **In-component gate:** route-gated only. Default (system) stages badged & undeletable (`146`).
- **Bulk / activity / notes / call-log:** Not present.
- **API:** `leadStageApi.getStages/initializeDefaults/createStage/updateStage/deleteStage/reorderStages`.

### 17. Follow-up Calendar — `/follow-ups`
- **File:** `client/src/pages/FollowUpCalendar/index.tsx`
- **Route/gate:** `App.tsx:1502-1511` — roles `[SUPER_ADMIN, TENANT_ADMIN, STAFF]`.
- **Purpose:** Calendar & day views of follow-ups, stale-lead surfacing, and inline activity logging.
- **Key components:** Calendar / Stale Leads tabs (`649-657`); month calendar (`798-804`); day view w/ overdue + today (`384-449`); stats pills (`668-678`); team scorecard w/ per-user bars (`681-779`); stale-leads tab w/ filters + BDM drilldown (`462-625`); **ActivityLogModal** (`27-120`).
- **Primary actions:** **Complete** follow-up → `followUpApi.completeFollowUp` (`286`, btn `435`); View lead (`410,434`); **+ Log** activity (`612`); Apply & Refresh stale (`521`); **Save Activity** → `leadApi.addActivity` (`50/114`); calendar nav (`789-795`).
- **Filters:** stage (`470-481`), days-stale selector + custom (`490-505`), BDM dropdown (`508-519`). No pagination.
- **In-component gate:** role check `user?.role !== 'STUDENT'` for team stats / stale tab (`213, 235`).
- **Bulk / activity / notes / call-log:** **Activity logging lives here** — ActivityLogModal logs note/call/WhatsApp/email w/ call outcome (`84`) and color-coded disposition (`94-99`); activity timeline shown in stale-lead drilldown (`181-202`). No import/export.
- **API:** `followUpApi.getCalendar/getTeamStats/completeFollowUp`, `leadStageApi.getStages`, `leadApi.getStaleFollowups/addActivity`, `leadDispositionApi.getDispositions`.

### 18. Seat Reservations — `/seat-reservations`
- **File:** `client/src/pages/SeatReservations/index.tsx`
- **Route/gate:** `App.tsx:1512-1521` — roles `[SUPER_ADMIN, TENANT_ADMIN, STAFF]`. Sidebar also lists `convert_leads` (`Sidebar.tsx:228`).
- **Purpose:** Reserve course seats, create student accounts, manage payments/refunds/installments, and run lifecycle email/WhatsApp campaigns.
- **Key components:** stats cards (`404-411`); search + status tabs (`413-424`); reservations table (`436-523`); New Reservation modal (`527-657`); Payment modal (`661-709`); email-template panels (`712-786`); Refund modal (`788-810`); per-row Actions dropdown (`477-505`).
- **Primary actions:** + New Reservation → `create` (`217`, btn `653`); Record Payment → `addPayment` (`250`); Send Email/WhatsApp (`271-284/339`); Record Refund → `refundReservation` (`309`); Cancel (`293`); **Mark as Enrolled** → `convertToStudent` (`327`); Update Demo Status (`354`); Set Installment Plan (`369`); Send Receipt (`284`); Refresh (`399`).
- **Filters:** search (`415`), status tabs (`419`). **Pagination:** Prev/Next/page (`516-521`).
- **In-component gate:** admin check (SUPER_ADMIN/TENANT_ADMIN) gates "Mark as Enrolled" (`95, 499`).
- **Bulk / activity / notes / call-log:** No import/export; 5-stage email campaign + WhatsApp reminders; auto student-account creation (`233`). No activity timeline.
- **API:** `seatReservationApi.getAll/getStats/create/addPayment/sendConfirmation/sendPaymentReminder/sendPreJoiningInfo/sendJoiningDay/sendReceipt/cancel/refundReservation/convertToStudent/sendWhatsAppReminder/updateDemoStatus/setInstallmentPlan`.

### 19. Team Activity — `/team-activity`
- **File:** `client/src/pages/TeamActivity/index.tsx`
- **Route/gate:** `App.tsx:1332-1341` — roles `[SUPER_ADMIN, TENANT_ADMIN]`, **`requiredPermissions=[manage_leads, view_lead_analytics]`** (the one route with explicit permission gating).
- **Purpose:** Team-wide activity metrics (calls/WhatsApp/notes/stage-moves/leads-touched) with drill-down into individual activities and per-lead timelines.
- **Key components:** date-range selector (`99-106`); summary totals (`109-117`); team table w/ metric columns (`123-148`); clickable MetricCell (`81-87`); drill-down modal w/ activity list or leads-touched timeline (`151-233`).
- **Primary actions:** date-range tabs (`99-106`); custom date (`105`); metric click → openDrill (`84`); close drill (`156`).
- **Filters:** date range today/week/month/custom (`99-106`). No search/sort/pagination.
- **In-component gate:** route-gated (route enforces permissions).
- **Bulk / activity / notes / call-log:** **Read-only activity timeline** per lead touched — type/call-outcome/description/performer (`181-202`). No import/export.
- **API:** `leadApi.getTeamActivity` (`53`), `leadApi.getTeamActivityDetails` (`70`).

### 20. Qualification Settings — `/qualification-settings`
- **File:** `client/src/pages/QualificationSettings/index.tsx`
- **Route/gate:** `App.tsx:1462-1471` — roles `[SUPER_ADMIN, TENANT_ADMIN]`. (Sidebar label "Qualification Questions".)
- **Purpose:** Manage configurable qualification questions BDMs ask on calls, with score-impact weights and WhatsApp auto-qualification.
- **Key components:** 3 tabs Questions / Settings / Preview (`453-938`); question list w/ enable/edit/delete/reorder (`453-598`); general + WhatsApp automation settings (`601-781`); live preview (BDM & WhatsApp mock) (`785-938`); question modal w/ score-impact table (`943-1141`).
- **Primary actions:** Reset to Defaults → `resetToDefaults` (`414`); Add Question → `addQuestion` (`460`); toggle/edit → `updateQuestion` (`314/286`); Delete → `deleteQuestion` (`304`); Reorder → `reorderQuestions` (`373`); Save Settings → `updateConfig` (`329`).
- **Filters:** category filter badges (`467`). No search/sort/pagination.
- **In-component gate:** route-gated only.
- **Bulk / activity / notes / call-log:** Not present. (Score-impact config + WhatsApp auto-qualification.)
- **API:** `qualificationApi.getConfig/addQuestion/updateQuestion/deleteQuestion/reorderQuestions/updateConfig/resetToDefaults`, `leadStageApi.getStages`.

### 21. Google Sheet Integration — `/google-sheet-integration`
- **File:** `client/src/pages/GoogleSheetIntegration/index.tsx`
- **Route/gate:** `App.tsx:1412-1421` — roles `[SUPER_ADMIN, TENANT_ADMIN]`.
- **Purpose:** Auto-import leads from Google Sheets via column mapping + scheduled sync.
- **Key components:** integration form (sheet/tab/mapping/sync settings `369-521`); integrations list w/ status & history (`535-634`); column-mapping table (`432-489`); sync-history logs (`608-630`).
- **Primary actions:** Add Sheet (`362`); Fetch Tabs → `fetchTabs` (`388`); Fetch Columns → `fetchHeaders` (`415`); Create/Update → `createIntegration`/`updateIntegration` (`518`); **Sync Now** → `triggerSync` (`546`); pause/toggle (`552`); Delete → `deleteIntegration` (`555`); Reset Sync → `resetSync` (`617`).
- **Filters/search/sorting/pagination:** Not present.
- **In-component gate:** route-gated only.
- **Bulk / activity / notes / call-log:** **Bulk import** (sheet sync) w/ duplicate detection + sync-history timeline (`619-626`). Auto-column mapping (`162-191`); custom-field support (`189`). No per-lead activity/notes/call-log.
- **API:** `googleSheetApi.getIntegrations/fetchTabs/fetchHeaders/createIntegration/updateIntegration/triggerSync/deleteIntegration/resetSync`.

### 22. AI Call Config — `/ai-call-config`
- **File:** `client/src/pages/AICallConfig/index.tsx`
- **Route/gate:** `App.tsx:1452-1461` — roles `[SUPER_ADMIN, TENANT_ADMIN]`.
- **Purpose:** Configure & monitor AI voice calls that auto-qualify leads (Exotel creds, retry rules, scoring thresholds, call history).
- **Key components:** 5 tabs Exotel Settings / Questions / Retry Rules / Scoring / Leads (`297-563`); call-activity stats (`262-275`); questions editor (`332-389`); retry rules + WhatsApp fallback (`393-465`); scoring thresholds (`469-499`); paginated leads table w/ AI call status/score/attempts + trigger (`503-563`).
- **Primary actions:** Enable/Disable (`242`); **Save Changes** → `PUT /ai-calls/config` (`250`); Add/Edit/Remove Question (`336/346-347`); **Trigger Call** → `POST /ai-calls/trigger/{leadId}` (`541`).
- **Filters:** none; **Pagination** on Leads tab, 15/page (`554-561`).
- **In-component gate:** route-gated only.
- **Bulk / activity / notes / call-log:** **Call log** — per-lead AI call attempts history (`518`, `aiCallAttempts`); call activity stats (`262-275`). Uses raw fetch, not a named `leadApi` method.
- **API (raw fetch):** `GET /ai-calls/config`, `GET /ai-calls/stats`, `GET /ai-calls/leads?page&limit=15`, `PUT /ai-calls/config`, `POST /ai-calls/trigger/{leadId}`.

### 23. Sales Content Library — `/sales-content`
- **File:** `client/src/pages/SalesContentLibrary/index.tsx`
- **Route/gate:** `App.tsx:1472-1481` — roles `[SUPER_ADMIN, TENANT_ADMIN]`. Sidebar exposes to STAFF too (`Sidebar.tsx:233`).
- **Purpose:** Manage shareable sales collateral (PDFs/videos/brochures/links) for telecallers, with per-item share/view/download tracking.
- **Key components:** header + Add Content (`218-226`); stats row (`229-248`); category tabs + search (`251-280`); content grid w/ badges/stats/actions (`283-363`); add/edit modal (`367-499`).
- **Primary actions:** Add Content (`223`); toggle featured/active → `update` (`333/340`); Edit (`347`); Delete → `delete` (`354`); Save → `create`/`update` (`490`).
- **Filters:** category filter (11 categories + All `254-268`), search title/desc/tags (`198-205`). No sort/pagination.
- **In-component gate:** route-gated only.
- **Bulk / activity / notes / call-log:** Not present. Tracks share/view/download counts per item (`324-328`); analytics via `getAnalytics` (`99-105`). (Actual per-lead share happens from Lead Detail.)
- **API:** `salesContentApi.getAll/getAnalytics/create/update/delete`.

---

## Navigation & Permissions table

| Page | Route | Roles (route gate, App.tsx) | Permissions (Sidebar visibility) |
|------|-------|------------------------------|----------------------------------|
| All Leads | `/leads` | SUPER_ADMIN, TENANT_ADMIN, STAFF | manage_leads, view_leads |
| Lead Detail | `/leads/:leadId` | SUPER_ADMIN, TENANT_ADMIN, STAFF | (not in Sidebar; opened from list) |
| Lead Kanban | `/lead-kanban` | SUPER_ADMIN, TENANT_ADMIN, STAFF | (not in Sidebar) |
| Lead Analytics | `/leads/analytics` | SUPER_ADMIN, TENANT_ADMIN | manage_leads, view_lead_analytics |
| Lead Aging | `/lead-aging` | SUPER_ADMIN, TENANT_ADMIN, STAFF | (not in Sidebar) |
| Lead Approvals | `/lead-approvals` | SUPER_ADMIN, TENANT_ADMIN | (not in Sidebar) |
| Lead Audit Logs | `/lead-audit-logs` | SUPER_ADMIN, TENANT_ADMIN | manage_leads |
| Lead Distribution Settings | `/lead-distribution-settings` | SUPER_ADMIN, TENANT_ADMIN | (not in Sidebar) |
| Lead Duplicates | `/lead-duplicates` | SUPER_ADMIN, TENANT_ADMIN | (not in Sidebar) |
| Lead Form Settings | `/lead-form-settings` | SUPER_ADMIN, TENANT_ADMIN | manage_leads |
| Lead Manager Board | `/lead-manager-board` | SUPER_ADMIN, TENANT_ADMIN, STAFF | manage_leads, view_lead_analytics |
| Lead My Performance | `/lead-my-performance` | SUPER_ADMIN, TENANT_ADMIN, STAFF | view_leads, edit_leads, create_leads (Sidebar: STAFF only) |
| Lead Priority Settings | `/lead-priority-settings` | SUPER_ADMIN, TENANT_ADMIN | manage_leads |
| Lead Scoring Settings | `/lead-scoring-settings` | SUPER_ADMIN, TENANT_ADMIN | manage_leads |
| Lead Sources | `/lead-sources` | SUPER_ADMIN, TENANT_ADMIN | manage_leads |
| Lead Stages | `/lead-stages` | SUPER_ADMIN, TENANT_ADMIN | manage_leads, manage_lead_stages |
| Follow-up Calendar | `/follow-ups` | SUPER_ADMIN, TENANT_ADMIN, STAFF | view_leads, edit_leads |
| Seat Reservations | `/seat-reservations` | SUPER_ADMIN, TENANT_ADMIN, STAFF | manage_leads, view_leads, convert_leads |
| Team Activity | `/team-activity` | SUPER_ADMIN, TENANT_ADMIN + perms `manage_leads`/`view_lead_analytics` | view_lead_analytics |
| Qualification Settings | `/qualification-settings` | SUPER_ADMIN, TENANT_ADMIN | manage_leads |
| Google Sheet Integration | `/google-sheet-integration` | SUPER_ADMIN, TENANT_ADMIN | manage_leads |
| AI Call Config | `/ai-call-config` | SUPER_ADMIN, TENANT_ADMIN | manage_leads |
| Sales Content Library | `/sales-content` | SUPER_ADMIN, TENANT_ADMIN | view_leads, create_leads |

Note: only `/team-activity` carries an explicit `requiredPermissions` on its `App.tsx` route (`App.tsx:1335`); all other lead routes are role-gated at the route level and permission-gated only for Sidebar visibility.

---

### FACTS

**Page inventory (page → route → Sidebar permissions):**
- All Leads → `/leads` → manage_leads|view_leads
- Lead Detail → `/leads/:leadId` → (opened from list; route roles SUPER_ADMIN/TENANT_ADMIN/STAFF)
- Lead Kanban → `/lead-kanban` → not in Sidebar
- Lead Analytics → `/leads/analytics` → manage_leads|view_lead_analytics
- Lead Aging → `/lead-aging` → not in Sidebar
- Lead Approvals → `/lead-approvals` → not in Sidebar
- Lead Audit Logs → `/lead-audit-logs` → manage_leads
- Lead Distribution Settings → `/lead-distribution-settings` → not in Sidebar
- Lead Duplicates → `/lead-duplicates` → not in Sidebar
- Lead Form Settings → `/lead-form-settings` → manage_leads
- Lead Manager Board → `/lead-manager-board` → manage_leads|view_lead_analytics
- Lead My Performance → `/lead-my-performance` → view_leads|edit_leads|create_leads (STAFF)
- Lead Priority Settings → `/lead-priority-settings` → manage_leads
- Lead Scoring Settings → `/lead-scoring-settings` → manage_leads
- Lead Sources → `/lead-sources` → manage_leads
- Lead Stages → `/lead-stages` → manage_leads|manage_lead_stages
- Follow-up Calendar → `/follow-ups` → view_leads|edit_leads
- Seat Reservations → `/seat-reservations` → manage_leads|view_leads|convert_leads
- Team Activity → `/team-activity` → view_lead_analytics (route also requires manage_leads|view_lead_analytics)
- Qualification Settings → `/qualification-settings` → manage_leads
- Google Sheet Integration → `/google-sheet-integration` → manage_leads
- AI Call Config → `/ai-call-config` → manage_leads
- Sales Content Library → `/sales-content` → view_leads|create_leads

**Leads Sidebar submenu order (Sidebar.tsx:226-242):** All Leads, Follow-up Calendar, Seat Reservations, Analytics, My Performance, Manager Board, Team Activity, Sales Content, Lead Sources, Lead Stages, Priority Settings, Qualification Questions, Form Settings, Google Sheets, Lead Scoring, Audit Logs, AI Call Config. (Group gate: roles SUPER_ADMIN/TENANT_ADMIN/STAFF, moduleKey `leads`.)

**Bulk import/export:** CSV **Import** + XLSX **Export** live on **All Leads** (`Leads/index.tsx:593-594`; `leadApi.importLeads`/`exportLeads`). Bulk **WhatsApp** to multi-selected leads also on All Leads (`Leads/index.tsx:511-526`). Bulk *ingest* sources: Google Sheet sync (`GoogleSheetIntegration`) and Meta lead sync (`LeadSources` → `metaLeadsApi.syncLeads`). Bulk merge on **Lead Duplicates**; bulk re-score on **Lead Scoring Settings** / **Lead Priority Settings**.

**Activity timeline / notes / call-log:**
- Primary per-lead **activity timeline + notes + call recordings** = **Lead Detail** (`LeadDetail/index.tsx`; timeline `709-714`, recording playback `1069-1074`, add-activity `492`, notes `893-918`, filter tabs `945-950`).
- Inline **activity logging** (note/call/WhatsApp/email + disposition) also in **Follow-up Calendar** ActivityLogModal (`FollowUpCalendar/index.tsx:27-120`, `leadApi.addActivity` `50/114`).
- Read-only cross-team activity timeline = **Team Activity** (`TeamActivity/index.tsx:181-202`).
- AI **call log** (attempt history) = **AI Call Config** Leads tab (`AICallConfig/index.tsx:518`).
- **Audit log** (system events, distinct from activity timeline) = **Lead Audit Logs** (`LeadAuditLogs/index.tsx`).
