# Lead Management — Database Audit (01: Models & Schema)

READ-ONLY audit of the CodeBegun LMS Lead Management data layer. All models live under
`server/src/models/`. The app is multi-tenant Node/Express/Mongoose/MongoDB; nearly every
document carries a `tenantId` and Mongoose `{ timestamps: true }` (auto `createdAt`/`updatedAt`).

Citations use `file:line`. Where a feature (soft-delete, `updatedBy`, etc.) is absent it is
stated as **Not present**.

---

## 1. Lead (`server/src/models/Lead.ts`)

**Purpose:** Core CRM entity. Holds contact info, current pipeline stage, ownership/assignment,
priority/score, source & campaign attribution, WhatsApp/AI-call engagement, qualification answers,
lost-reason, fee/payment, and an embedded activity timeline. Converts to a `User` (student) via
`convertedStudentId`.

### Core fields

| Field | Type | Ref | Req/Null | Default | Enum / Notes |
|---|---|---|---|---|---|
| name | String | — | required | — | trimmed (`Lead.ts:297`) |
| email | String | — | optional | — | lowercase, trimmed (`Lead.ts:302`) |
| phone | String | — | required | — | trimmed; **dedup key with tenantId** (`Lead.ts:307`) |
| courseInterest | [String] | — | optional | — | (`Lead.ts:312`) |
| source | String | — | required | `'other'` | free-text label (`Lead.ts:316`) |
| stageId | ObjectId | LeadStage | required | — | current pipeline stage (`Lead.ts:322`) |
| assignedTo | ObjectId | User | optional | — | primary owner (`Lead.ts:327`) |
| nextFollowUp | Date | — | optional | — | (`Lead.ts:331`) |
| notes | String | — | optional | `''` | (`Lead.ts:334`) |
| notInterestedReason | String | — | optional | — | (`Lead.ts:339`) |
| interestConcerns | [String] | — | optional | — | enum: only_online, placements, check_with_parents, fee_issue, timing_issue, other (`Lead.ts:343`) |
| customFields | Map<String,Mixed> | — | optional | `new Map()` | (`Lead.ts:347`) |
| convertedStudentId | ObjectId | User | optional | — | **conversion linkage → student User** (`Lead.ts:352`) |
| activities | [LeadActivitySchema] | — | — | `[]` | embedded timeline, `_id: true` (`Lead.ts:356`) |
| campaignId | ObjectId | AdCampaign | optional | — | (`Lead.ts:359`) |
| utmParams | embedded | — | optional | — | source/medium/campaign/content/term, all lowercase (`Lead.ts:363`) |
| tenantId | ObjectId | Tenant | required | — | (`Lead.ts:601`) |
| createdBy | ObjectId | User | required | — | audit (`Lead.ts:606`) |
| createdAt / updatedAt | Date | — | — | auto | `{ timestamps: true }` (`Lead.ts:612`) |

### Priority / Scoring / Eligibility

| Field | Type | Req/Null | Default | Enum |
|---|---|---|---|---|
| priority | String | — | `'cold'` | hot, warm, cold (`Lead.ts:372`) |
| score | Number | — | `0` | numeric lead score (`Lead.ts:377`) |
| eligibility | String | — | `'needs_review'` | eligible, not_eligible, needs_review (`Lead.ts:381`) |
| eligibilityReason | String | optional | — | (`Lead.ts:386`) |

### WhatsApp engagement

| Field | Type | Default | Enum / Notes |
|---|---|---|---|
| whatsappStatus | String | `'not_sent'` | not_sent, sent, delivered, read, replied (`Lead.ts:392`) |
| whatsappReplied | Boolean | `false` | (`Lead.ts:397`) |
| whatsappRepliedAt | Date | — | (`Lead.ts:401`) |
| firstResponseTime | Number | — | minutes lead-created → first reply (`Lead.ts:404`) |
| whatsappEngagement | embedded | — | status(not_initiated…no_response), initiatedAt, lastMessageSentAt, lastReplyAt, questionsAsked, questionsAnswered, conversationSummary (`Lead.ts:407-419`) |

### Source / Cost tracking

| Field | Type | Ref | Notes |
|---|---|---|---|
| sourceDetails | embedded | — | platform enum (meta/google/linkedin/website/manual/whatsapp/google_sheet), campaignId→AdCampaign, campaignName, adSetId/Name, adId/Name, formId, landingPage, referrerUrl (`Lead.ts:422-436`) |
| costData | embedded | — | costPerLead, campaignSpend, visible (default false, admin-only) (`Lead.ts:439-443`) |

### Assignment tracking

| Field | Type | Ref | Notes |
|---|---|---|---|
| assignment.assignedTo | ObjectId | User | (`Lead.ts:447`) |
| assignment.assignedBy | ObjectId | User | (`Lead.ts:448`) |
| assignment.assignedAt | Date | — | (`Lead.ts:449`) |
| assignment.previousAssignees | [{userId→User, from, to, reason}] | User | reassignment history (`Lead.ts:450-455`) |

Note: two parallel assignment representations exist — top-level `assignedTo` (`Lead.ts:327`) and the
`assignment.*` sub-doc (`Lead.ts:446`). Both are indexed.

### Telecaller metrics (`Lead.ts:459-466`)
firstViewedAt, firstActionAt, firstCallAt, totalCalls (0), totalActions (0), lastActionAt.

### Qualification

| Field | Type | Notes |
|---|---|---|
| qualificationAnswers | Map<String, {questionId, answer(Mixed), answeredBy→User, answeredAt, skipped}> | default `new Map()` (`Lead.ts:469-479`) |
| qualificationProgress | {total, answered, percentage} | all default 0 (`Lead.ts:480-484`) |

### Structured interests (`Lead.ts:487-509`)
courses[], mode(online/offline/hybrid/undecided, default undecided), location, placement(false),
urgency(immediate/soon/exploring, default exploring), affordability(ready/needs_emi/budget_concern/unknown,
default unknown), demoInterest(false), campusVisitInterest(false), technologies[].

### Language, Lost, Demo, Approval, SLA

| Field | Type | Default | Enum / Notes |
|---|---|---|---|
| language | String | `'english'` | english, telugu, hindi (`Lead.ts:512`) |
| lostReason | String | — | (`Lead.ts:519`) |
| lostReasonCategory | String | — | financial, competitor, timing, quality, other (`Lead.ts:520`) |
| lostReasonDetail | String | — | (`Lead.ts:524`) |
| lostAt | Date | — | (`Lead.ts:525`) |
| reEngagementDate | Date | — | (`Lead.ts:526`) |
| demoBookedAt / demoNotes | Date / String | — | (`Lead.ts:529-530`) |
| pendingApproval | {stageId→LeadStage, stageName, requestedBy→User, requestedAt, reason} | — | manager approval for stage change (`Lead.ts:533-539`) |
| slaBreach / slaBreachAt | Boolean(false) / Date | — | (`Lead.ts:542-543`) |

### Fee & Payment (P5) (`Lead.ts:546-557`)
feeQuote, feeDiscount(0), feeDiscountApproved(false), feeDiscountApprovedBy→User,
paymentStatus(not_started/deposit_pending/deposit_paid/full_pending/full_paid/refunded, default
not_started), paymentNotes, depositAmount, depositPaidAt.

### AI Summary (`Lead.ts:560-571`)
generatedAt, summary, keyInsights[], suggestedNextAction, seriousnessScore(1-10),
conversionProbability(high/medium/low), generatedBy.

### AI Voice Call (`Lead.ts:574-599`)
aiCallStatus(pending/in_progress/answered/not_answered/failed/completed/skipped), aiCallAttempts(0),
aiCallLogs[{attemptNumber, callSid, startedAt, endedAt, duration, outcome(answered/not_answered/busy/failed/in_progress),
recordingUrl, transcript, error}], aiQualificationScore(0-100), aiCategory(HOT/WARM/COLD/JUNK), nextAICallAt.

### Embedded sub-doc — LeadActivity (`Lead.ts:243-293`, `_id: true`)
type(note/call/email/whatsapp/status_change/assignment/created/meeting/content_shared, required),
description(required), createdBy→User(required), createdAt(Date.now), callOutcome, callSubOutcome,
callStatus, callDuration(min 0), recordingUrl, disposition, metadata(Mixed).

### Indexes (`Lead.ts:615-629`)
Compound (all non-unique): `{tenantId,stageId}`, `{tenantId,assignedTo}`, `{tenantId,nextFollowUp}`,
`{tenantId,source}`, `{tenantId,createdAt:-1}`, `{tenantId,campaignId}`, `{'utmParams.source','utmParams.campaign'}`,
`{tenantId,priority}`, `{tenantId,score:-1}`, `{tenantId,whatsappStatus}`, `{tenantId,'assignment.assignedTo'}`,
`{tenantId,'telecallerMetrics.lastActionAt':-1}`, `{tenantId,aiCallStatus}`, `{tenantId,nextAICallAt}`.
**No unique index** (dedup is enforced in application code, not the DB — see §Lifecycle).

**Soft-delete:** Not present (no `isDeleted`/`deletedAt`). **updatedBy:** Not present (only `createdBy` + timestamps).

---

## 2. LeadStage (`server/src/models/LeadStage.ts`)

**Purpose:** Configurable pipeline stage (Kanban column) with movement rules, automation triggers, SLA.

| Field | Type | Ref | Req/Null | Default | Enum / Notes |
|---|---|---|---|---|---|
| name | String | — | required | — | (`LeadStage.ts:70`) |
| color | String | — | required | `'#005897'` | (`LeadStage.ts:75`) |
| order | Number | — | required | `0` | (`LeadStage.ts:80`) |
| isDefault | Boolean | — | — | `false` | seeds new leads (`LeadStage.ts:85`) |
| isActive | Boolean | — | — | `true` | (`LeadStage.ts:89`) |
| tenantId | ObjectId | Tenant | required | — | (`LeadStage.ts:93`) |
| description | String | — | optional | — | (`LeadStage.ts:100`) |
| category | String | — | — | `'new'` | new, engaging, qualified, negotiation, converted, lost (`LeadStage.ts:104`) |
| allowedNextStages | [ObjectId] | LeadStage | — | — | movement rule (`LeadStage.ts:111`) |
| allowedPreviousStages | [ObjectId] | LeadStage | — | — | (`LeadStage.ts:115`) |
| allowedRoles | [String] | — | — | — | roles allowed to move here (`LeadStage.ts:119`) |
| requiredFields | [String] | — | — | — | (`LeadStage.ts:125`) |
| requiresNote | Boolean | — | — | `false` | (`LeadStage.ts:129`) |
| requiresReason | Boolean | — | — | `false` | for lost stages (`LeadStage.ts:133`) |
| triggers.onEnter | embedded | — | — | — | sendWhatsApp, whatsAppTemplateId, sendEmail, emailTemplateId, assignToRole, setFollowUp(days), notifyManager (`LeadStage.ts:140-148`) |
| triggers.onExit | embedded | — | — | — | recordDuration(true), notifyManager (`LeadStage.ts:149-152`) |
| sla | embedded | — | — | — | maxDurationHours, urgencyLevel(low/medium/high, default medium), alertAfterHours, escalateAfterHours (`LeadStage.ts:156-165`) |
| icon | String | — | optional | — | (`LeadStage.ts:168`) |
| isFinal | Boolean | — | — | `false` | (`LeadStage.ts:172`) |
| isLostStage | Boolean | — | — | `false` | (`LeadStage.ts:176`) |
| showInKanban | Boolean | — | — | `true` | (`LeadStage.ts:180`) |
| showInTable | Boolean | — | — | `true` | (`LeadStage.ts:184`) |

**Indexes (`LeadStage.ts:192-195`):** `{tenantId,order}`; **`{tenantId,name}` UNIQUE**; `{tenantId,category}`; `{tenantId,isLostStage}`.

**Default stages** exported as `DEFAULT_STAGES` (`LeadStage.ts:198-231`) — 21 stages seeded per tenant
(see FACTS block for full list). **Soft-delete / audit fields:** Not present (only timestamps; deactivate via `isActive`).

---

## 3. LeadStageHistory (`server/src/models/LeadStageHistory.ts`)

**Purpose:** Append-only log of every stage a lead occupied, with entry/exit and duration — powers
funnel/velocity analytics.

| Field | Type | Ref | Req/Null | Default |
|---|---|---|---|---|
| leadId | ObjectId | Lead | required | — (`:19`) |
| stageId | ObjectId | LeadStage | required | — (`:24`) |
| stageName | String | — | required | — (`:29`) |
| enteredAt | Date | — | required | Date.now (`:34`) |
| exitedAt | Date | — | nullable | `null` (active stage) (`:39`) |
| durationMinutes | Number | — | nullable | `null` (`:43`) |
| enteredBy | ObjectId | User | required | — (`:47`) |
| exitedBy | ObjectId | User | optional | — (`:52`) |
| tenantId | ObjectId | Tenant | required | — (`:56`) |

**Virtual:** `currentDurationMinutes` — live duration if not yet exited (`:72-80`), exposed to JSON/Object.
**Indexes (`:66-69`):** `{tenantId,leadId}`, `{tenantId,stageId}`, `{tenantId,enteredAt:-1}`, `{leadId,exitedAt}` (find active stage).
**Soft-delete/updatedBy:** Not present.

---

## 4. LeadDisposition (`server/src/models/LeadDisposition.ts`)

**Purpose:** Tenant-configurable call/contact disposition labels, optionally scoped to specific stages.

| Field | Type | Ref | Req/Null | Default |
|---|---|---|---|---|
| tenantId | ObjectId | Tenant | required (indexed) | — (`:16`) |
| name | String | — | required | — (`:17`) |
| color | String | — | — | `'#6366f1'` (`:18`) |
| isActive | Boolean | — | — | `true` (`:19`) |
| order | Number | — | — | `0` (`:20`) |
| stageIds | [ObjectId] | LeadStage | — | `[]` = applies to ALL stages (`:21`) |

**Index (`:26`):** `{tenantId,order}`. **Soft-delete/audit:** Not present (timestamps only; `isActive` toggle).

---

## 5. LeadSourceConfig (`server/src/models/LeadSourceConfig.ts`)

**Purpose:** One document per tenant holding per-source connection state, credentials, auto-actions, and
lead-count stats for each channel (Meta Ads, WhatsApp, website form, Google Sheet, walk-in, referral,
Google Ads, and an array of third-party sources).

- `tenantId` → Tenant, **required + UNIQUE** (`:169`; also index `:265`).
- Each channel block = `{ isConnected, config, autoActions(AutoActionSchema), stats(StatsSchema) }`.
- **AutoActionSchema (`:152-159`, `_id:false`):** sendWhatsAppWelcome(false), whatsAppWelcomeTemplate(''),
  defaultPriority(hot/warm/cold, default warm), defaultStageId→LeadStage, autoAssign(true), notifyAdminOnNewLead(false).
- **StatsSchema (`:161-165`):** lastLeadAt, leadsThisMonth(0), leadsTotal(0).
- **metaAds.config (`:173-181`):** pageAccessToken, appId, appSecret, pageId, formIds[], verifyToken('codebegun_verify'), adAccountId. Credentials noted "encrypted at rest".
- **whatsApp.config (`:188-195`):** accessToken, phoneNumberId, verifyToken, businessAccountId, qualificationLanguage(english/telugu/hindi), enableQualificationBot(true).
- **websiteForm / googleSheet / walkin / referral / googleAds** each have their own config sub-blocks.
- **thirdParty[] (`:250-261`):** name(required), apiKey(''), fieldMapping{name,phone,email,courseInterest,city}, isActive(true).

**Soft-delete/updatedBy:** Not present.

---

## 6. LeadScoringConfig (`server/src/models/LeadScoringConfig.ts`)

**Purpose:** Per-tenant rule engine for scoring, qualification, and auto-assignment (round-robin / rule-based).

| Field | Type | Ref | Default | Notes |
|---|---|---|---|---|
| tenantId | ObjectId | Tenant | required + **UNIQUE** | (`:89`; index `:113`) |
| isActive | Boolean | — | `false` | (`:90`) |
| scoringRules | [ScoringRuleSchema] | — | `[]` | field, operator(11 ops), value, points, label (`:59-65`) |
| hotThreshold | Number | — | `12` | (`:94`) |
| warmThreshold | Number | — | `8` | (`:95`) |
| qualificationRules | [QualificationRuleSchema] | — | `[]` | field, operator, value, label, required(true) (`:67-73`) |
| assignmentMode | String | — | `'none'` | none, round_robin, rule_based (`:101`) |
| roundRobinMembers | [ObjectId] | User | — | (`:102`) |
| roundRobinIndex | Number | — | `0` | (`:103`) |
| assignmentRules | [AssignmentRuleSchema] | — | `[]` | name, conditions[], assignToMembers[]→User, currentIndex (`:81-86`) |
| fallbackMembers | [ObjectId] | User | — | (`:105`) |
| fallbackIndex | Number | — | `0` | (`:106`) |
| createdBy | ObjectId | User | — | audit (`:108`) |

**Soft-delete:** Not present.

---

## 7. LeadPriorityConfig (`server/src/models/LeadPriorityConfig.ts`)

**Purpose:** Per-tenant priority/score-impact rule engine + eligibility rules + auto-recalc settings.
Distinct from LeadScoringConfig (this one drives HOT/WARM/COLD via score thresholds and per-rule `setPriority`).

| Field | Type | Ref | Default | Notes |
|---|---|---|---|---|
| tenantId | ObjectId | Tenant | required + **UNIQUE** | (`:146`) |
| rules | [PriorityRuleSchema] | — | — | id, name, description, enabled(true), order(0), condition{field,operator(12 ops),value,secondValue}, scoreImpact, setPriority(hot/warm/cold), category(engagement/location/interest/source/urgency/custom) (`:80-113`, `_id:false`) |
| thresholds.hot | Number | — | `60` | score ≥ → HOT (`:156`) |
| thresholds.warm | Number | — | `30` | score ≥ → WARM (`:157`) |
| eligibilityRules | [EligibilityRuleSchema] | — | — | id, name, enabled, order, condition, result(eligible/not_eligible/needs_review), reason (`:115-142`) |
| settings | embedded | — | — | autoRecalculate(true), recalculateOnStageChange(true), recalculateOnWhatsAppReply(true), recalculateOnCall(true) (`:162-167`) |
| isActive | Boolean | — | `true` | (`:169`) |

**Exports:** `DEFAULT_PRIORITY_RULES` (14 rules, `:175-316`), `DEFAULT_THRESHOLDS` {hot:60, warm:30} (`:318`).
**Indexes:** only the unique `tenantId`. **Soft-delete/audit:** Not present.

---

## 8. LeadDistributionConfig (`server/src/models/LeadDistributionConfig.ts`)

**Purpose:** Alternate/parallel auto-distribution config (round_robin / weighted / manual). NOTE: `tenantId`
is typed **String** here, not ObjectId.

| Field | Type | Ref | Default | Notes |
|---|---|---|---|---|
| tenantId | String | — | required + **UNIQUE** | (`:34`) |
| mode | String | — | `'manual'` | round_robin, weighted, manual (`:35`) |
| eligibleRoles | [String] | — | — | (`:40`) |
| maxLeadsPerDayDefault | Number | — | `20` | (`:41`) |
| weights | [AgentWeightSchema] | — | — | userId(String), weight(1), maxLeadsPerDay (`:23-30`, `_id:false`) |
| roundRobinPointer | String | — | `null` | last-assigned userId (`:43`) |
| enabled | Boolean | — | `false` | (`:44`) |

**Soft-delete/audit:** Not present (no createdBy).

---

## 9. LeadFormConfig (`server/src/models/LeadFormConfig.ts`)

**Purpose:** Per-tenant definition of the lead form/table/kanban — field list, visibility toggles,
conditional logic, source list, stats cards, table columns, and **duplicate-check settings**.

| Field | Type | Ref | Default | Notes |
|---|---|---|---|---|
| tenantId | ObjectId | Tenant | required + **UNIQUE** | (`:246`) |
| fields | [LeadFormFieldSchema] | — | — | `_id:true` per field; see below (`:252`) |
| sources | [String] | — | — | (`:253`) |
| fieldGroups | [FieldGroupSchema] | — | — | key(contact/qualification/campaign/custom/internal), label, order, collapsed (`:193-205`) |
| settings.autoAssignEnabled | Boolean | — | `false` | (`:261`) |
| settings.autoAssignRoleId | String | — | — | (`:262`) |
| settings.duplicateCheckFields | [String] | — | — | **dedup config** (`:263`) |
| settings.duplicateAction | String | — | `'warn'` | block, warn, merge (`:264`) |
| settings.requirePhoneVerification | Boolean | — | `false` | (`:269`) |
| settings.requireEmailVerification | Boolean | — | `false` | (`:270`) |
| statsCards | [StatsCardSchema] | — | — | key,type(system/stage/priority/source/custom),label,icon,color,enabled,order,stageId,priority,source (`:207-225`) |
| tableColumns | [TableColumnSchema] | — | — | key,type(system/custom),label,enabled,order,width,fieldKey (`:227-242`) |

**LeadFormFieldSchema (`:158-191`):** fieldKey, label, type(14 field types), required(false), enabled(true),
isBuiltIn(false), options[], placeholder, order, visibility{form,detail,table,kanban,telecaller,export},
editable(true), defaultValue, validation{pattern,minLength,maxLength,min,max}, showWhen{fieldKey,operator,value},
group(contact/qualification/campaign/custom/internal), helpText, displayFormat.

**Exports:** `DEFAULT_FIELDS` (15 built-in fields incl. name, phone, email, source, courseInterest, stageId,
assignedTo, nextFollowUp, notes, city, graduationYear, budget, timeline, preferenceMode, employmentStatus)
(`:288-388`); `DEFAULT_SOURCES` (`:390`); `DEFAULT_FIELD_GROUPS` (`:392-398`).
**Soft-delete/audit:** Not present.

---

## 10. LostReasonConfig (`server/src/models/LostReasonConfig.ts`)

**Purpose:** Per-tenant catalogue of lost/drop reasons with categories, re-engagement rules, auto-actions.

| Field | Type | Ref | Default | Notes |
|---|---|---|---|---|
| tenantId | ObjectId | Tenant | required + **UNIQUE** | (`:73`) |
| reasons | [LostReasonSchema] | — | — | id, label, category(financial/competitor/timing/quality/contact/other), requiresDetail(false), order, enabled(true), allowReEngagement(true), suggestedReEngagementDays, autoActions{sendFeedbackEmail,notifyManager,addToReEngagementList(true)} (`:46-69`) |
| settings | embedded | — | — | requireReasonForLost(true), requireDetailForSelected(true), enableReEngagementReminders(true), defaultReEngagementDays(90) (`:82-87`) |
| reEngagementEmailTemplate | String | — | — | (`:89`) |
| isActive | Boolean | — | `true` | (`:91`) |

**Exports:** `DEFAULT_LOST_REASONS` (~21 reasons, `:97-315`), `LOST_REASON_CATEGORIES` (`:318-325`).
**Soft-delete/audit:** Not present.

---

## 11. QualificationQuestionConfig (`server/src/models/QualificationQuestionConfig.ts`)

**Purpose:** Per-tenant qualification question bank (manual + WhatsApp bot), each optionally updating a
Lead field and carrying per-answer score impacts.

| Field | Type | Ref | Default | Notes |
|---|---|---|---|---|
| tenantId | ObjectId | Tenant | required + **UNIQUE** | (`:113`) |
| questions | [QualificationQuestionSchema] | — | — | id, question, category(personal/education/career/financial/timeline/technical), answerType(text/select/multiselect/number/boolean/date/rating), options[], order, showInStages[]→LeadStage, required(false), enabled(true), fieldToUpdate, scoreImpact[{answerValue,impact}], helpText, validation{min,max,pattern}, skipKeywords[] (`:76-109`) |
| settings | embedded | — | — | showProgressBar(true), allowSkip(true), randomizeOrder(false) (`:122-126`) |
| whatsappSettings | embedded | — | — | enabled(true), welcomeMessage(default), completionMessage(default), noResponseTimeoutHours(24), maxQuestions(5) (`:128-140`) |
| isActive | Boolean | — | `true` | (`:142`) |

**Exports:** `DEFAULT_QUALIFICATION_QUESTIONS` (10 questions, `:148-282`). **Soft-delete/audit:** Not present.

---

## 12. FollowUpReminder (`server/src/models/FollowUpReminder.ts`)

**Purpose:** Scheduled follow-ups / reminders / 1-on-1 meetings tied to a lead + owner.

| Field | Type | Ref | Req/Null | Default | Enum |
|---|---|---|---|---|---|
| tenantId | ObjectId | Tenant | required | — | (`:69`) |
| leadId | ObjectId | Lead | required | — | (`:74`) |
| assignedTo | ObjectId | User | required | — | (`:79`) |
| type | String | — | required | — | call, whatsapp, email, one_on_one, demo, touch_base, payment_reminder, custom (`:84`) |
| title | String | — | required | — | (`:89`) |
| description | String | — | optional | — | (`:94`) |
| scheduledAt | Date | — | required | — | (`:98`) |
| reminderAt | Date | — | optional | — | (`:102`) |
| meetingLink / meetingLocation | String | — | optional | — | (`:105-112`) |
| meetingDuration | Number | — | — | `30` | minutes (`:113`) |
| status | String | — | — | `'scheduled'` | scheduled, completed, cancelled, rescheduled, missed, pending (`:117`) |
| priority | String | — | — | `'medium'` | low, medium, high, urgent (`:122`) |
| completedAt / outcome / notes / nextAction | mixed | — | optional | — | (`:127-141`) |
| rescheduledFrom / rescheduledReason | Date/String | — | optional | — | (`:142-148`) |
| rescheduleCount | Number | — | — | `0` | (`:149`) |
| reminderSent / reminderSentAt | Boolean(false)/Date | — | — | — | (`:153-159`) |
| createdBy | ObjectId | User | required | — | audit (`:160`) |

**Indexes (`:170-174`):** `{tenantId,assignedTo,scheduledAt}`, `{tenantId,leadId}`, `{tenantId,status,scheduledAt}`,
`{tenantId,reminderAt,reminderSent}`, `{tenantId,type}`. **Soft-delete:** Not present (cancel via status).

---

## 13. SeatReservation (`server/src/models/SeatReservation.ts`)

**Purpose:** Seat booking + payment ledger; bridges a Lead to enrolled student. Can be standalone
(direct student contact) or linked to a lead. Pre-save recomputes prices/status.

| Field | Type | Ref | Req/Null | Default | Notes |
|---|---|---|---|---|---|
| tenantId | ObjectId | Tenant | required | — | (`:171`) |
| leadId | ObjectId | Lead | optional | — | link to lead (`:176`) |
| studentName/Email/Phone | String | — | optional | — | standalone reservations (`:181-183`) |
| courseId | ObjectId | Course | optional | — | (`:184`) |
| batchId | ObjectId | Batch | optional | — | (`:188`) |
| courseName | String | — | required | — | (`:192`) |
| batchName | String | — | optional | — | (`:197`) |
| originalPrice | Number | — | required | — | min 0 (`:201`) |
| discountAmount | Number | — | — | `0` | (`:206`) |
| discountReason | String | — | optional | — | (`:211`) |
| finalPrice | Number | — | required | — | computed pre-save (`:215`) |
| paidAmount / balanceAmount | Number | — | — | `0` | computed pre-save (`:220-229`) |
| payments | [PaymentSchema] | — | — | — | `_id:true`; amount, method(8 enum), transactionId, paidAt, receiptNumber, receiptUrl, notes, proofUrl, installmentLabel, createdBy→User (`:120-167`) |
| refunds | [{amount, reason, refundedAt, createdBy→User}] | — | — | — | (`:231-238`) |
| status | String | — | — | `'pending'` | pending, partial_paid, paid, confirmed, enrolled, cancelled, expired (`:239`) |
| reservedAt | Date | — | — | Date.now | (`:244`) |
| expiresAt | Date | — | optional | — | (`:248`) |
| seatNumber | String | — | optional | — | (`:251`) |
| enrolledAt | Date | — | optional | — | (`:255`) |
| studentId | ObjectId | User | optional | — | **enrolled student linkage** (`:258`) |
| receiptSent / welcomeEmailSent (+ *At) | Boolean/Date | — | — | false | (`:262-274`) |
| demoEnabled / demoPeriodDays / demoStartDate / demoEndDate / demoStatus | mixed | — | — | false/3/…/none | demoStatus enum none/active/satisfied/refunded (`:277-285`) |
| installmentPlan | [{label,amount,dueDate,status(pending/paid/overdue),paidAt,paymentId}] | — | — | — | (`:288-301`) |
| notes | String | — | optional | — | (`:303`) |
| createdBy | ObjectId | User | required | — | audit (`:307`) |

**Pre-save (`:317-338`):** finalPrice = originalPrice − discountAmount; netPaid = payments − refunds;
sets status pending/partial_paid/paid (unless cancelled/enrolled).
**Indexes (`:341-345`):** `{tenantId,leadId}`, `{tenantId,status}`, `{tenantId,courseId}`, `{tenantId,batchId}`, `{tenantId,reservedAt:-1}`.
**Soft-delete:** Not present (cancel via status).

---

## 14. GoogleSheetIntegration (`server/src/models/GoogleSheetIntegration.ts`)

**Purpose:** Config + sync-log for pulling leads from a Google Sheet into the Lead pipeline; has per-tab
cursors and optional push-back webhook.

| Field | Type | Ref | Req/Null | Default | Notes |
|---|---|---|---|---|---|
| tenantId | ObjectId | Tenant | required | — | (`:58`) |
| name | String | — | required | — | (`:59`) |
| sheetId | String | — | required | — | (`:60`) |
| sheetNames | [String] | — | — | `['Sheet1']` | tabs to sync (`:61`) |
| sheetUrl | String | — | required | — | (`:62`) |
| columnMapping | [{sheetColumn,leadField}] | — | — | `[]` | (`:63`, `_id:false`) |
| headerRow | Number | — | — | `1` | min 1 (`:64`) |
| lastSyncedRows | Map<String,Number> | — | — | `new Map()` | per-tab cursor (`:65`) |
| syncInterval | Number | — | — | `10` | minutes, 1–1440 (`:66`) |
| isActive | Boolean | — | — | `true` | (`:67`) |
| defaultSource | String | — | — | `'google_sheet'` | (`:68`) |
| defaultPriority | String | — | — | `'warm'` | hot/warm/cold (`:69`) |
| defaultStageId | ObjectId | LeadStage | optional | — | (`:70`) |
| assignToUserId | ObjectId | User | optional | — | (`:71`) |
| createdBy | ObjectId | User | required | — | audit (`:72`) |
| syncLogs | [{syncedAt,rowsSynced,newLeads,duplicatesSkipped,errors,errorDetails[]}] | — | — | `[]` | (`:48-55`) |
| lastSyncAt / lastError | Date/String | — | optional | — | (`:74-75`) |
| pushBackEnabled / pushWebhookUrl | Boolean(false)/String | — | — | — | Apps Script push-back on stage change (`:76-77`) |

**Indexes (`:82-83`):** `{tenantId}`, `{tenantId,isActive}`. **Soft-delete:** Not present.

---

## 15. AdCampaign (`server/src/models/AdCampaign.ts`)

**Purpose:** Marketing campaign with UTM attribution + metrics; leads attribute back via `campaignId` and
`utmParams`. Pre-save derives CPL/CPC/CTR/conversion-rate; virtuals for ROI & budget utilization.

| Field | Type | Ref | Req/Null | Default | Enum |
|---|---|---|---|---|---|
| name | String | — | required | — | (`:77`) |
| description | String | — | optional | — | (`:82`) |
| platform | String | — | required | — | Facebook, Instagram, Google, LinkedIn, YouTube, WhatsApp, Twitter, Other (`:86`) |
| status | String | — | required | `'draft'` | draft, active, paused, completed, archived (`:91`) |
| objective | String | — | required | `'leads'` | awareness, traffic, leads, conversions, engagement (`:97`) |
| budget | Number | — | required | — | min 0 (`:103`) |
| spend | Number | — | — | `0` | (`:108`) |
| startDate | Date | — | required | — | (`:113`) |
| endDate | Date | — | optional | — | (`:117`) |
| utmSource/Medium/Campaign | String | — | required | — | lowercase (`:122-139`) |
| utmContent/Term | String | — | optional | — | (`:140-149`) |
| targetAudience/Locations/ageRange | mixed | — | optional | — | (`:152-163`) |
| metrics | CampaignMetricsSchema | — | — | zeros | impressions, reach, clicks, leads, conversions, cpl, cpc, ctr, conversionRate (`:60-73`, `_id:false`) |
| landingPageUrl / adAccountId / externalCampaignId | String | — | optional | — | (`:182-193`) |
| notes | String | — | optional | — | (`:195`) |
| tenantId | ObjectId | Tenant | required | — | (`:201`) |
| createdBy | ObjectId | User | required | — | audit (`:206`) |

**Virtuals:** `roi` (`:223`), `budgetUtilization` (`:232`). **Pre-save:** derives metrics (`:238-260`).
**Indexes (`:216-220`):** `{tenantId,status}`, `{tenantId,platform}`, `{tenantId,createdAt:-1}`,
`{tenantId,utmCampaign}`, `{utmSource,utmMedium,utmCampaign}` (attribution). **Soft-delete:** Not present (archive via status).

---

## 16. WhatsAppConversationState (`server/src/models/WhatsAppConversationState.ts`)

**Purpose:** Transient per-phone/per-tenant WhatsApp qualification-bot state; **TTL auto-expires after 24h**.

| Field | Type | Req/Null | Default | Notes |
|---|---|---|---|---|
| phone | String | required | — | (`:32`) |
| tenantId | String | required | — | (typed String) (`:33`) |
| conversationStep | String | — | `'initial'` | initial, in_progress, qualified, asked_name, asked_year, asked_course (`:34`) |
| currentQuestionIndex | Number | — | `0` | (`:39`) |
| answers | Map<String,String> | — | `{}` | keyed by question.id (`:40`) |
| scoreSoFar | Number | — | `0` | (`:41`) |
| name / yearOfGraduation / interestedCourse | String | optional | — | legacy (`:42-44`) |
| lastMessageAt | Date | — | Date.now | (`:45`) |
| expiresAt | Date | — | now+24h | **TTL** (`:46`) |

**`{ timestamps: false }`.** **Indexes (`:55-58`):** **`{phone,tenantId}` UNIQUE**; **`{expiresAt}` TTL (expireAfterSeconds:0)**.
**Soft-delete/audit:** Not present (auto-deleted by TTL).

---

## 17. WhatsAppDripConfig (`server/src/models/WhatsAppDripConfig.ts`)

**Purpose:** Per-tenant drip-message sequences keyed by stage name.

| Field | Type | Ref | Default | Notes |
|---|---|---|---|---|
| tenantId | ObjectId | Tenant | required + **UNIQUE** | (`:45`) |
| sequences | [DripSequenceSchema] | — | `[]` | stageName, stageId→LeadStage, messages[{daysAfter(0-90),message(≤4096),enabled}], enabled (`:24-41`, `_id:false`) |
| isActive | Boolean | — | `true` | (`:47`) |

**Exports:** `DEFAULT_DRIP_SEQUENCES` (`:53-96`). **Soft-delete/audit:** Not present.

---

## 18. AICallConfig (`server/src/models/AICallConfig.ts`)

**Purpose:** Per-tenant AI voice-call (Exotel) config — credentials, questions, retry, scoring, WhatsApp
fallback, LLM model, and cumulative stats.

| Field | Type | Ref | Default | Notes |
|---|---|---|---|---|
| tenantId | ObjectId | Tenant | required + **UNIQUE** (indexed) | (`:68`) |
| enabled | Boolean | — | `false` | (`:75`) |
| exotelAccountSid/ApiKey/ApiToken/VirtualNumber/AppId | String | — | `''` | credentials (`:78-82`) |
| questions | [{id,text,key,order,required}] | — | — | (`:85-91`) |
| retry | embedded | — | — | maxAttempts(3,1-10), retryGapMinutes(30), nextDayRetry(true), workingHoursStart(9), workingHoursEnd(18), workingDays([1-6]) (`:94-101`) |
| scoring | embedded | — | — | hotThreshold(75), warmThreshold(40), assignOnScore(40), assignRoleId→Role (`:104-109`) |
| whatsappFallback | embedded | — | — | enabled(false), templateName, triggerAfterMaxAttempts(true), message (`:112-117`) |
| llmModel | String | — | `'gpt-4o-mini'` | (`:120`) |
| systemPrompt | String | — | — | (`:121`) |
| stats | embedded | — | — | totalCallsInitiated, totalAnswered, totalQualified, lastUpdatedAt (`:124-129`) |

**Soft-delete/createdBy:** Not present. Note: `scoring.assignRoleId` → **Role** (only ref to Role model in this set).

---

## 19. SalesContent (`server/src/models/SalesContent.ts`)

**Purpose:** Sales collateral library (brochures, videos, etc.) with per-lead sharing history and usage counters.

| Field | Type | Ref | Req/Null | Default | Notes |
|---|---|---|---|---|---|
| tenantId | ObjectId | Tenant | required | — | (`:92`) |
| title | String | — | required | — | (`:98`) |
| description | String | — | optional | — | (`:103`) |
| category | String | — | required | — | curriculum, fee, placement, campus, testimonial, brochure, video, demo, faq, offer, other (`:107`) |
| contentType | String | — | required | — | pdf, image, video, link, document (`:114`) |
| fileUrl / externalUrl / thumbnailUrl | String | — | optional | — | (`:119-130`) |
| fileName / fileSize / mimeType / duration | mixed | — | optional | — | (`:133-136`) |
| visibleToRoles | [String] | — | — | — | (`:139`) |
| allowSharing / allowDownload | Boolean | — | `true` | (`:143-150`) |
| shareCount / viewCount / downloadCount | Number | — | `0` | (`:153-155`) |
| lastSharedAt | Date | — | optional | — | (`:156`) |
| shares | [ContentShareSchema] | — | — | leadId→Lead, sharedBy→User, sharedAt, channel(whatsapp/email/sms/manual), status(sent/delivered/viewed/failed), viewedAt, messageId (`:69-88`, `_id:true`) |
| tags | [String] | — | — | (`:162`) |
| order / isActive / isFeatured | mixed | — | 0/true/false | (`:166-177`) |
| linkedCourses | [String] | — | — | (`:180`) |
| validFrom / validUntil | Date | — | optional | — | (`:186-187`) |
| createdBy | ObjectId | User | required | — | audit (`:189`) |

**Indexes (`:199-203`):** `{tenantId,category}`, `{tenantId,isActive}`, `{tenantId,tags}`, `{tenantId,linkedCourses}`, `{tenantId,shareCount:-1}`.
**Soft-delete:** Not present (deactivate via `isActive`).

---

## 20. SalesCallRecording (`server/src/models/SalesCallRecording.ts`)

**Purpose:** Uploaded salesperson call recording + AI transcription/quality analysis, tied to a lead.

| Field | Type | Ref | Req/Null | Default | Notes |
|---|---|---|---|---|---|
| tenantId | ObjectId | Tenant | required | — | (`:83`) |
| leadId | ObjectId | Lead | required | — | (`:84`) |
| recordedBy | ObjectId | User | required | — | salesperson (`:85`) |
| audioUrl | String | — | required | — | (`:86`) |
| fileName | String | — | required | — | (`:87`) |
| fileSize | Number | — | — | `0` | (`:88`) |
| mimeType | String | — | — | `'audio/mpeg'` | (`:89`) |
| durationSeconds | Number | — | optional | — | (`:90`) |
| status | String | — | — | `'uploaded'` | uploaded, processing, processed, failed (`:91`) |
| processingProgress | Number | — | — | `0` | 0-100 (`:92`) |
| analysis | AnalysisSchema | — | optional | — | transcript, summary, qualityScore, scores{opening,needsDiscovery,productKnowledge,objectionHandling,closingAttempt,professionalism}, keyMoments[], improvements[], competitorsMentioned[], sentimentOverall, leadInterestLevel, callDurationSeconds, wordsPerMinute, processedAt, model (`:50-79`, `_id:false`) |
| errorMessage / notes | String | — | optional | — | (`:94-95`) |
| reviewedBy | ObjectId | User | optional | — | audit (`:96`) |
| reviewedAt | Date | — | optional | — | (`:97`) |

**Indexes (`:102-104`):** `{tenantId,leadId}`, `{tenantId,recordedBy}`, `{tenantId,status}`. **Soft-delete:** Not present.

---

## ER edges (every relationship as `Model.field → RefModel (cardinality)`)

Cardinality: N:1 unless the field is an array (N:M) or a logical 1:1.

- `Lead.stageId → LeadStage` (N:1)
- `Lead.assignedTo → User` (N:1)
- `Lead.convertedStudentId → User` (1:1 — conversion; a Lead maps to one student User)
- `Lead.campaignId → AdCampaign` (N:1)
- `Lead.sourceDetails.campaignId → AdCampaign` (N:1)
- `Lead.assignment.assignedTo → User` (N:1)
- `Lead.assignment.assignedBy → User` (N:1)
- `Lead.assignment.previousAssignees[].userId → User` (N:M)
- `Lead.qualificationAnswers{}.answeredBy → User` (N:1)
- `Lead.pendingApproval.stageId → LeadStage` (N:1)
- `Lead.pendingApproval.requestedBy → User` (N:1)
- `Lead.feeDiscountApprovedBy → User` (N:1)
- `Lead.activities[].createdBy → User` (N:M, embedded)
- `Lead.tenantId → Tenant` (N:1)
- `Lead.createdBy → User` (N:1)
- `LeadStage.tenantId → Tenant` (N:1)
- `LeadStage.allowedNextStages[] → LeadStage` (N:M, self-ref)
- `LeadStage.allowedPreviousStages[] → LeadStage` (N:M, self-ref)
- `LeadStageHistory.leadId → Lead` (N:1)
- `LeadStageHistory.stageId → LeadStage` (N:1)
- `LeadStageHistory.enteredBy → User` (N:1)
- `LeadStageHistory.exitedBy → User` (N:1)
- `LeadStageHistory.tenantId → Tenant` (N:1)
- `LeadDisposition.tenantId → Tenant` (N:1)
- `LeadDisposition.stageIds[] → LeadStage` (N:M)
- `LeadSourceConfig.tenantId → Tenant` (1:1, unique)
- `LeadSourceConfig.*.autoActions.defaultStageId → LeadStage` (N:1)
- `LeadScoringConfig.tenantId → Tenant` (1:1, unique)
- `LeadScoringConfig.roundRobinMembers[] → User` (N:M)
- `LeadScoringConfig.assignmentRules[].assignToMembers[] → User` (N:M)
- `LeadScoringConfig.fallbackMembers[] → User` (N:M)
- `LeadScoringConfig.createdBy → User` (N:1)
- `LeadPriorityConfig.tenantId → Tenant` (1:1, unique)
- `LeadDistributionConfig.tenantId` → Tenant (1:1, unique) — **stored as String, no Mongoose ref**
- `LeadDistributionConfig.weights[].userId` → User — **String, no ref**
- `LeadFormConfig.tenantId → Tenant` (1:1, unique)
- `LostReasonConfig.tenantId → Tenant` (1:1, unique)
- `QualificationQuestionConfig.tenantId → Tenant` (1:1, unique)
- `QualificationQuestionConfig.questions[].showInStages[] → LeadStage` (N:M)
- `FollowUpReminder.tenantId → Tenant` (N:1)
- `FollowUpReminder.leadId → Lead` (N:1)
- `FollowUpReminder.assignedTo → User` (N:1)
- `FollowUpReminder.createdBy → User` (N:1)
- `SeatReservation.tenantId → Tenant` (N:1)
- `SeatReservation.leadId → Lead` (N:1, optional)
- `SeatReservation.courseId → Course` (N:1)
- `SeatReservation.batchId → Batch` (N:1)
- `SeatReservation.studentId → User` (1:1 — enrolled student)
- `SeatReservation.payments[].createdBy → User` (N:M)
- `SeatReservation.refunds[].createdBy → User` (N:M)
- `SeatReservation.createdBy → User` (N:1)
- `GoogleSheetIntegration.tenantId → Tenant` (N:1)
- `GoogleSheetIntegration.defaultStageId → LeadStage` (N:1)
- `GoogleSheetIntegration.assignToUserId → User` (N:1)
- `GoogleSheetIntegration.createdBy → User` (N:1)
- `AdCampaign.tenantId → Tenant` (N:1)
- `AdCampaign.createdBy → User` (N:1)
- `WhatsAppConversationState.tenantId` → Tenant (N:1) — **stored as String, no ref**
- `WhatsAppDripConfig.tenantId → Tenant` (1:1, unique)
- `WhatsAppDripConfig.sequences[].stageId → LeadStage` (N:1)
- `AICallConfig.tenantId → Tenant` (1:1, unique)
- `AICallConfig.scoring.assignRoleId → Role` (N:1)
- `SalesContent.tenantId → Tenant` (N:1)
- `SalesContent.shares[].leadId → Lead` (N:M)
- `SalesContent.shares[].sharedBy → User` (N:M)
- `SalesContent.createdBy → User` (N:1)
- `SalesCallRecording.tenantId → Tenant` (N:1)
- `SalesCallRecording.leadId → Lead` (N:1)
- `SalesCallRecording.recordedBy → User` (N:1)
- `SalesCallRecording.reviewedBy → User` (N:1)

---

## Lifecycle-relevant fields (what drives stage / status / assignment / dedup / scoring)

**Stage (pipeline position):**
- `Lead.stageId → LeadStage` is the single source of truth for current stage (`Lead.ts:322`).
- Stage transitions are logged to `LeadStageHistory` (entry/exit + duration).
- `LeadStage.category` (new/engaging/qualified/negotiation/converted/lost), `isFinal`, `isLostStage`,
  `allowedNextStages`/`allowedPreviousStages`/`allowedRoles`, `requiresNote`/`requiresReason` gate movement.
- `Lead.pendingApproval` holds a requested stage change awaiting manager approval.

**Status-like flags (no single `status` field on Lead):** the lead does not have a top-level `status` enum;
status is expressed via `stageId` + `stageId→LeadStage.category`, plus `eligibility`, `paymentStatus`,
`aiCallStatus`, `whatsappStatus`, `slaBreach`, and `lostAt`/`lostReason`.

**Assignment (ownership):**
- Primary: `Lead.assignedTo → User` (`Lead.ts:327`).
- Secondary/history: `Lead.assignment.{assignedTo,assignedBy,assignedAt,previousAssignees[]}` (`Lead.ts:446`).
- Auto-assignment driven by `LeadScoringConfig.assignmentMode` (none/round_robin/rule_based) with
  `roundRobinMembers`/`assignmentRules`/`fallbackMembers`, and/or `LeadDistributionConfig` (round_robin/weighted/manual).
- Source-level `LeadSourceConfig.*.autoActions.autoAssign` and `LeadFormConfig.settings.autoAssignEnabled` toggle it.

**Score / Priority:**
- `Lead.score` (Number) + `Lead.priority` (hot/warm/cold) are the stored outputs.
- Computed by `LeadPriorityConfig` (rules + `thresholds.hot`/`thresholds.warm` + per-rule `setPriority`) and/or
  `LeadScoringConfig` (`scoringRules` + `hotThreshold`/`warmThreshold`). AI path sets `aiQualificationScore` + `aiCategory`.
- Recalc triggers in `LeadPriorityConfig.settings` (on stage change / WhatsApp reply / call).

**Source / Attribution:**
- `Lead.source` (String label) + `Lead.sourceDetails.platform` + `Lead.campaignId`/`utmParams`
  (attributed back to `AdCampaign` via `{utmSource,utmMedium,utmCampaign}`).

**Dedup key:**
- **Application-enforced (no DB unique index on Lead):** duplicate check is `{ tenantId, phone }` —
  `publicLeadController.ts:198-201` (`Lead.findOne({ tenantId, phone: sanitizedPhone })`).
- Configurable via `LeadFormConfig.settings.duplicateCheckFields` + `duplicateAction` (block/warn/merge).
- WhatsApp bot state deduped by **DB-unique** `{phone,tenantId}` on `WhatsAppConversationState`.

**Conversion (Lead → Student/User):**
- `Lead.convertedStudentId → User` set in `convertToStudent` (`leadController.ts:1245`); creates a
  `role:'STUDENT'` User (`:1230`), moves lead to the "Converted" stage (`:1243-1248`), pushes activities.
- Guard: refuses if `lead.convertedStudentId` already set (`:1210`) or email missing (`:1214`).
- `SeatReservation.studentId → User` is the payment-path linkage to the enrolled student.

**Activities (audit timeline):** `Lead.activities[]` (embedded, `_id:true`) records note/call/email/
whatsapp/status_change/assignment/created/meeting/content_shared with `createdBy` + `createdAt`.

**Audit / soft-delete pattern (whole module):** Consistent `{ timestamps: true }` (createdAt/updatedAt) on
all models except `WhatsAppConversationState` (timestamps:false, TTL-managed). `createdBy → User` present on
Lead, LeadStageHistory(enteredBy/exitedBy), LeadScoringConfig, FollowUpReminder, SeatReservation,
GoogleSheetIntegration, AdCampaign, SalesContent, SalesCallRecording. **No `updatedBy` field anywhere.**
**No soft-delete** (`isDeleted`/`deletedAt`) on any of the 20 models — records are hard-deleted or
deactivated via `isActive`/status enums; `WhatsAppConversationState` self-expires via TTL.
