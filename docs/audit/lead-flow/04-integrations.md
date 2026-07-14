# Lead Flow Audit — 04: External Integrations

> **Scope:** Read-only audit of how external sources create/update leads in the CodeBegun LMS. All paths are relative to repo root `d:\Simple_CB_LMS\Codebegun\lms-saas`. Citations use `file:line`.
> **Security flags** in this document are **observations only** — no source was modified.

Route mounting (all under `/api/v1`, `server/src/routes/index.ts`):
- `/meta-leads` → `metaLeadAdsRoutes` (`routes/index.ts:108`)
- `/whatsapp` → `whatsappRoutes` (`routes/index.ts:144`)
- `/google-sheet-integrations` → `googleSheetRoutes` (`routes/index.ts:152`)
- `/whatsapp-drip-config` → `whatsappDripConfigRoutes` (`routes/index.ts:167`)
- `/google-leads` → `googleAdsRoutes` (`routes/index.ts:169`)
- `/ai-calls` → `aiCallRoutes` (`routes/index.ts:170`)

Credential storage: per-tenant tokens are stored **encrypted** in `LeadSourceConfig` via AES-256-CBC (`controllers/leadSourceConfigController.ts:11-38`), read back through `getDecryptedTokens()` (`leadSourceConfigController.ts:308`). Key is `process.env.ENCRYPTION_KEY || JWT_SECRET || 'fallback-key-32-chars-minimum!!'` (`leadSourceConfigController.ts:9`). **Observation:** encryption falls back to a hard-coded literal key if neither env var is set, and `encrypt()` silently stores plaintext if encryption throws (`leadSourceConfigController.ts:21`). AICallConfig stores Exotel creds as plain schema strings, **not** through this encryption layer (`models/AICallConfig.ts:78-82`).

---

## 1. Meta Lead Ads

**Files:** `controllers/metaLeadAdsController.ts`, `routes/metaLeadAdsRoutes.ts`
**Purpose:** Receive Facebook/Instagram Lead Ad form submissions in real time via webhook, plus a manual/backfill "sync" that pulls leads from the Graph API. Both create/update `Lead` documents.

### Endpoints
| Method | Path | Auth | Handler |
|---|---|---|---|
| GET | `/api/v1/meta-leads/webhook` | **none (public)** | `verifyMetaLeadWebhook` (`metaLeadAdsRoutes.ts:14`) |
| POST | `/api/v1/meta-leads/webhook` | **none (public)** | `handleMetaLeadWebhook` (`metaLeadAdsRoutes.ts:17`) |
| POST | `/api/v1/meta-leads/sync` | `authMiddleware` + `tenantResolver` | `syncMetaLeads` (`metaLeadAdsRoutes.ts:20`) |
| POST | `/api/v1/meta-leads/setup-webhook` | `authMiddleware` + `tenantResolver` | `setupMetaWebhook` (`metaLeadAdsRoutes.ts:23`) |

### Authentication / signature verification
- **GET verify (subscription handshake):** compares `hub.verify_token` against `META_LEAD_VERIFY_TOKEN || WHATSAPP_VERIFY_TOKEN || 'codebegun_whatsapp_verify'` (`metaLeadAdsController.ts:185`). Returns challenge on match, else 403 (`:193-201`). **Observation:** default verify token is a hard-coded literal.
- **POST HMAC (X-Hub-Signature-256):** verification is **conditional and fails-open** (`metaLeadAdsController.ts:222-235`):
  - Only runs `if (appSecret)` is set (`:224`) — if `META_APP_SECRET` unset, **no verification at all**.
  - Only runs `if (signature)` header present (`:226`) — a request **omitting the header entirely bypasses the check** and is processed.
  - On mismatch it logs and returns `200 EVENT_RECEIVED` but **does `return`**, so a forged-but-signed-wrong body is rejected (`:229-232`). However the two gating `if`s above mean the common bypass is simply not sending the signature.
  - **Flag:** unverified/fails-open when `META_APP_SECRET` unset OR signature header absent.

### Data flow into Lead
1. POST responds `200` immediately, then processes async (`:243-250`).
2. `processMetaLeadPayload` ignores non-`page` objects and non-`leadgen` fields (`:265-288`).
3. `fetchAndCreateLead` resolves the tenant: DB lookup by `metaAds.config.pageId` then fallback `formIds` (`:334-374`), then `.env` fallback `PAGE_ACCESS_TOKEN`/`WHATSAPP_ACCESS_TOKEN` + `DEFAULT_TENANT_ID` (`:377-390`). Token must start with `EAA` to be trusted from DB (`:344`).
4. Full lead fetched from Graph API v19.0: `GET graph.facebook.com/v19.0/{leadgenId}?access_token=…` (`:107`, `fetchLeadFromMeta` `:105-140`).
5. Field mapping via `extractFieldValue` with name variations for name/email/phone/city/course (`:144-170`). Phone normalized by `normalizeIndianPhone` (strips +91/91/0 trunk) (`:50-62`).
6. **Dedup** by last-10-digit phone regex `phone: { $regex: cleanPhone.slice(-10)+'$' }` (`:457-460`). Existing → `$push` activity note + `$set` sourceDetails (`:467-488`). New → `Lead` created with `source:'meta_form'`, `priority:'warm'`, sourceDetails/utmParams/customFields from `field_data` (`:512-551`).
7. Post-create fire-and-forget: `scoreAndAssignLead` (`:560`) and, if `AICallConfig.enabled`, sets `aiCallStatus:'pending'` and `enqueueAICall` (`:565-574`).

**`syncMetaLeads`** (authenticated pull): lists `{pageId}/leadgen_forms`, then `{formId}/leads` since last-lead-or-30-days (`:619-650`); per lead `createOrUpdateLeadFromData` with same dedup/scoring/AI-call logic (`:801-897`).

### Failure handling / retry
- Webhook always returns `200` to prevent Meta retries (`:243`, `:254`, `:231`). Per-lead errors are caught and logged, not retried (`:310-313`).
- No internal retry for a failed Graph fetch; the missed lead can be recovered later via the manual `/sync` (30-day window, `:635`).

### Config keys
`META_LEAD_VERIFY_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `META_APP_SECRET`, `PAGE_ACCESS_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `DEFAULT_TENANT_ID`; DB: `LeadSourceConfig.metaAds.{config.pageId, config.formIds, config.pageAccessToken, config.appId, config.appSecret}`, `metaAds.isConnected`.

---

## 2. Google Ads (Lead Form Extensions)

**Files:** `controllers/googleAdsController.ts`, `routes/googleAdsRoutes.ts`
**Purpose:** Receive Google Ads Lead Form webhook submissions and create/update leads.

### Endpoints
| Method | Path | Auth | Handler |
|---|---|---|---|
| GET | `/api/v1/google-leads/webhook` | `tenantMiddleware` only (public) | `verifyGoogleWebhook` — returns `"OK"` (`googleAdsRoutes.ts:12`, controller `:192-194`) |
| POST | `/api/v1/google-leads/webhook` | `tenantMiddleware` only (public) | `handleGoogleLeadWebhook` (`googleAdsRoutes.ts:15`) |

`tenantMiddleware` runs to resolve tenant from `X-Tenant-Id` header but is **not authentication** (`googleAdsRoutes.ts:9`).

### Authentication / verification
- **Key/HMAC — conditional, fails-open** (`googleAdsController.ts:76-84`):
  - Only checks `if (configuredKey)` i.e. `GOOGLE_ADS_WEBHOOK_KEY` is set (`:76`). If unset → **no verification, all leads accepted**.
  - When set: passes if `body.google_key === configuredKey` **OR** HMAC valid (`:79-83`).
  - `verifyGoogleSignature` itself **returns `true` (skips) when key unset** (`:56`), and uses `crypto.timingSafeEqual` on `x-goog-signature` when present (`:54-64`). **Observation:** `timingSafeEqual` will throw if buffer lengths differ (bad/absent signature of wrong length) — caught by the outer `try/catch` → 500, not a clean 401.
  - **Flag:** unverified/fails-open when `GOOGLE_ADS_WEBHOOK_KEY` unset (`:76`).

### Data flow into Lead
1. Extracts name/phone/email/course/city from `user_column_data` by column id (`:91-97`). Rejects if no phone AND no email (`:98-100`).
2. Tenant = `req.tenantId` (header) or `GOOGLE_ADS_DEFAULT_TENANT_ID` (`:105`); 400 if unresolved (`:106-109`).
3. Skips test leads in production (`:87-89`).
4. **Dedup** by last-10-digit phone (`:112-128`); existing → `$push` note, returns 200 duplicate. New → `Lead.create` with `source:'google_ads'`, gclid/campaign/adgroup as customFields, utmParams (google/cpc) (`:152-173`).
5. Fire-and-forget `scoreAndAssignLead` (`:176`) and **`sendLeadWelcomeWhatsApp`** if phone present (`:177`) — this is a WhatsApp send triggered from Google Ads intake.

### Failure handling / retry
- Synchronous handler; returns `201`/`200`/`4xx`/`500`. **No retry logic** — a 500 relies on Google's own webhook retry behavior. No queue.

### Config keys
`GOOGLE_ADS_WEBHOOK_KEY`, `GOOGLE_ADS_DEFAULT_TENANT_ID`, `NODE_ENV`.

---

## 3. WhatsApp (Cloud API)

**Files:** `routes/whatsappRoutes.ts`, `controllers/whatsappWebhookController.ts`, `services/whatsAppDripService.ts`, `services/whatsAppWelcomeService.ts`, `routes/whatsappDripConfigRoutes.ts`
**Purpose:** Two-way WhatsApp: inbound webhook drives a dynamic qualification conversation (creating/updating leads), plus outbound welcome messages and a drip follow-up scheduler.

### Endpoints
| Method | Path | Auth | Handler |
|---|---|---|---|
| GET | `/api/v1/whatsapp/webhook` | **none (public)** | `verifyWebhook` (`whatsappRoutes.ts:18`) |
| POST | `/api/v1/whatsapp/webhook` | **none (public)** | `handleWebhook` (`whatsappRoutes.ts:21`) |
| POST | `/api/v1/whatsapp/mark-cold` | auth + tenant + `roleGuard(['manage_leads'])` | `markColdLeads` (`whatsappRoutes.ts:26`) |
| POST | `/api/v1/whatsapp/send` | auth + tenant + `roleGuard(['manage_leads','edit_leads'])` | `sendManualMessage` (`whatsappRoutes.ts:35`) |
| POST | `/api/v1/whatsapp/bulk-cold-leads` | auth + tenant + `roleGuard(['manage_leads'])` | `sendBulkColdLeadMessages` (`whatsappRoutes.ts:44`) |
| GET/PUT/PATCH/POST | `/api/v1/whatsapp-drip-config/*` | `authMiddleware` + `tenantMiddleware` | drip config CRUD (`whatsappDripConfigRoutes.ts:13-19`) |

### Authentication / verification
- **GET verify:** `hub.verify_token` vs `WHATSAPP_VERIFY_TOKEN || 'codebegun_whatsapp_verify'` (`whatsappWebhookController.ts:198-206`). Hard-coded default literal.
- **POST webhook:** **NO signature verification at all.** `handleWebhook` reads `req.body`, immediately returns `200`, and processes async (`whatsappWebhookController.ts:211-223`). There is no `X-Hub-Signature-256`/HMAC check anywhere in this controller.
  - **Flag:** completely unverified inbound webhook — anyone who knows the URL can inject fake WhatsApp messages → creates/updates leads (`ensureLeadExists` `:353-380`) and triggers outbound sends.

### Data flow into Lead (inbound conversation)
1. `processWhatsAppMessage` ignores non-`whatsapp_business_account` objects; skips status-only updates (`:227-248`).
2. Tenant resolved by `phone_number_id` → `LeadSourceConfig.whatsApp.config.phoneNumberId` + decrypted token, else `.env DEFAULT_TENANT_ID`/`WHATSAPP_ACCESS_TOKEN` (`resolveTenantByPhoneNumberId` `:174-189`).
3. `handleConversation` loads DB-configured qualification questions (`QualificationQuestionConfig`, else `DEFAULT_QUESTIONS`) (`:99-109`, `:286`).
4. **Conversation state** persisted in `WhatsAppConversationState` (upsert, 24h `expiresAt` TTL) (`:67-83`); steps: `initial → in_progress → qualified` (`ConversationStep`).
5. New conversation → sends welcome, `ensureLeadExists` creates `Lead` (`source:'whatsapp'`, `whatsappStatus:'replied'`) (`:304-320`, `:353-380`). Each answer maps to a lead field via `updateLeadField` (`:145-170`) and accrues `scoreSoFar` (`:334`). Completion → `finalizeQualification` writes `whatsappEngagement` + score + activity, marks `qualified` (`:390-412`).
6. **STOP/opt-out:** **not implemented.** No handling of STOP/UNSUBSCRIBE keywords found; a qualified lead just gets a generic "team will get back" reply (`:297-301`).

### Outbound sends
- **Cloud API:** `POST graph.facebook.com/v18.0/{phoneNumberId}/messages` with plain `type:'text'` body (`whatsappWebhookController.ts:423-430`; welcome `whatsAppWelcomeService.ts:92-107`; drip `whatsAppDripService.ts:63-79`).
- **Template (HSM) usage:** **none for actual sends.** All outbound uses free-form `text` (only valid inside 24h session window). `AICallConfig.whatsappFallback.templateName` exists in schema but the fallback sender is a **stub that only logs** (`aiCallWorker.ts:234-246`). WhatsApp drip/welcome do **not** use approved templates.
- **Welcome** (`whatsAppWelcomeService.ts`): gated on `LeadSourceConfig[source].autoActions.sendWhatsAppWelcome` + `whatsApp.isConnected`; falls back to language default template text (english/telugu/hindi) (`:6-10`, `:40-118`). Called from Google Ads intake (`googleAdsController.ts:177`).

### Drip scheduler
- `scheduleDripOnStageEntry` pushes a `drip_entry:{stage}:{iso}` activity marker on stage entry (`whatsAppDripService.ts:93-117`; invoked from `leadController.ts:731,807`).
- `processDueMessages` scans leads with `drip_entry:` markers, sends D+N messages when due, dedups by activity tag `drip:{stage}:d{n}` (`:123-186`). Runs on `setInterval` every **60 min** (`app.ts:260-263`). **Observation:** `docs/MODULE_OVERVIEW.html:370` notes this cron historically produced "0 conversations in prod."

### Failure handling / retry
- Webhook always `200` (no WA retries) (`:215,:221`). Outbound send failures are logged only, **no retry** (`sendWhatsAppMessage` swallows errors `:431-434`; drip `sendWhatsApp` returns bool `:79-82`).

### Config keys
`WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `DEFAULT_TENANT_ID`; DB: `LeadSourceConfig.whatsApp.{config.phoneNumberId, config.accessToken, config.qualificationLanguage, isConnected}`, `WhatsAppDripConfig`, `QualificationQuestionConfig`.

---

## 4. Google Sheets

**Files:** `services/googleSheetSyncService.ts`, `routes/googleSheetRoutes.ts`, `models/GoogleSheetIntegration.ts`
**Purpose:** Poll a publicly-shared Google Sheet (CSV export), parse rows, and create leads. Optional push-back to an Apps Script webhook on stage change.

### Endpoints (all admin-only)
`router.use(authMiddleware, tenantResolver, roleGuard(['manage_leads']))` (`googleSheetRoutes.ts:20`). CRUD + `POST /:id/sync` (`triggerSync`), `POST /:id/reset-sync`, `POST /fetch-tabs`, `POST /fetch-headers` (`:23-37`). No public webhook — this is **outbound polling**, not an inbound webhook.

### Authentication / verification
- **Inbound:** N/A — the app pulls CSV from `https://docs.google.com/spreadsheets/d/{sheetId}/gviz/tq?tqx=out:csv&sheet={name}` (`:9-12`). Relies on the sheet being shared "Anyone with the link can view" (`:55-57`). No API key/OAuth.
- **Push-back (outbound):** POSTs stage-change JSON to a tenant-configured `pushWebhookUrl` (Apps Script) with **no signature/auth** (`pushLeadStageChange` `:497-553`). **Observation:** unsigned outbound webhook.

### Data flow into Lead
- **Polling interval:** per-integration `syncInterval` minutes (default 10, `models/GoogleSheetIntegration.ts:66`); driver cron `syncAllActiveSheets` runs every **5 min** (`server.ts:259-268`) and only syncs an integration when `minutesSinceLastSync >= syncInterval` (`:465-469`).
- **CSV parse:** custom quote-aware parser (`parseCsvLine` `:15-38`); Meta-export prefixes (`p:`,`l:`,`f:`,`ag:`,`as:`,`c:`) and `<test lead:` placeholders stripped (`cleanFieldValue` `:152-171`).
- **Incremental:** tracks `lastSyncedRows` per tab so only new rows are processed (`:316-318`, saved `:452`).
- **Dedup:** by last-10-digit phone regex, then by case-insensitive exact email (`:349-364`). Existing → append duplicate note, count as skipped (`:366-374`). New → `Lead` created with mapped fields, `source: mapped.source || defaultSource ('google_sheet')`, customFields from `custom:`-prefixed mappings, `sourceDetails.platform:'google_sheet'` (`:399-430`), then `scoreAndAssignLead` (`:434-438`).

### Failure handling / retry
- Per-row and per-tab errors caught and recorded in `syncLog.errorDetails` (`:245-249`, `:444-448`); `lastError` persisted (`:254,:271`). **No retry** — next scheduled poll re-attempts. `syncLogs` capped at 50 (`:257-259`).

### Config keys
No env keys. All config in `GoogleSheetIntegration` doc: `sheetId, sheetNames, columnMapping, headerRow, syncInterval, defaultSource, defaultPriority, defaultStageId, assignToUserId, isActive, pushBackEnabled, pushWebhookUrl`.

---

## 5. AI Voice Calling (Exotel)

**Files:** `services/exotelService.ts`, `services/aiCallQueueService.ts`, `workers/aiCallWorker.ts`, `controllers/aiCallWebhookController.ts`, `routes/aiCallRoutes.ts`, `models/AICallConfig.ts`
**Purpose:** On new-lead creation (Meta/sync), enqueue an outbound Exotel IVR call; after the call, download the recording, transcribe (Whisper), score with an LLM, update the lead priority, and auto-assign.

### Endpoints
| Method | Path | Auth | Handler |
|---|---|---|---|
| POST | `/api/v1/ai-calls/webhook/exotel` | **none (public)** | `handleExotelWebhook` (`aiCallRoutes.ts:30`) |
| GET/PUT | `/api/v1/ai-calls/config` | auth + tenant | get/update config (`aiCallRoutes.ts:35-36`) |
| GET | `/api/v1/ai-calls/stats`, `/leads` | auth + tenant | (`:37-38`) |
| POST | `/api/v1/ai-calls/trigger/:leadId` | auth + tenant | manual call trigger (`:39`) |

### Outbound call flow (BullMQ)
1. Producer `enqueueAICall` adds `'initiate'` job to queue `ai-lead-calls` with 5s delay (`aiCallQueueService.ts:47-58`). Queue-level `attempts: 1` — retries are **manual/self-scheduled**, not BullMQ automatic (`:31`).
2. Worker `processAICallJob` (concurrency 5, `aiCallWorker.ts:29`): loads `AICallConfig{enabled}` (`:100`), skips if lead already completed/skipped (`:114`), enforces `retry.maxAttempts` (`:120`) and IST **working hours/days** (`isWithinWorkingHours` `:35-48`; reschedules via `enqueueAICallRetry` `:147-152`).
3. `initiateExotelCall`: `POST https://api.exotel.com/v1/Accounts/{sid}/Calls/connect`, HTTP Basic auth (`apiKey`/`apiToken`), connects lead to IVR App URL, passes `CustomField = leadId|tenantId|attempt`, sets `StatusCallback = {API_BASE_URL}/api/v1/ai-calls/webhook/exotel` (`exotelService.ts:44-104`).
4. Saves `aiCallLogs` entry + activity, increments `stats.totalCallsInitiated` (`aiCallWorker.ts:174-198`).

### Inbound webhook (Exotel status callback)
- **Auth: none.** `handleExotelWebhook` ACKs `200` immediately then processes (`aiCallWebhookController.ts:29-31`). No signature/shared-secret/IP allowlist. **Flag:** unverified — a forged POST with a valid `CustomField`/`CallSid` could set a lead's recording URL and drive transcript processing.
- Parses `CustomField` (`leadId|tenantId|attempt`, legacy JSON fallback) (`:50-67`), finds lead by id or `aiCallLogs.callSid` (`:72-74`), updates the matching call log (`:87-97`).
- **Answered + recordingUrl** → `processCallTranscript`: `axios.get` recording, Whisper `whisper-1` transcription, LLM (`config.llmModel`, default `gpt-4o-mini`) scores 0-100 + HOT/WARM/COLD/JUNK, maps to priority via `hotThreshold`/`warmThreshold`, updates lead + `aiSummary`, and `autoAssignLead` if `score >= assignOnScore` (`:99-101,:151-308`).
- **not_answered/busy** → schedule retry via `enqueueAICallRetry` if `attempt < maxAttempts`, else mark failed + (log-only) WhatsApp fallback (`:103-136`).

### Recording
- Downloaded from Exotel `RecordingUrl` via `axios.get(responseType:'arraybuffer')`, 30s timeout (`aiCallWebhookController.ts:168-171`). Transcript truncated/stored in `aiCallLogs.$.transcript` (`:192-195`).

### Failure handling / retry
- **Retry logic present** (manual): worker retries transient network errors (`ECONNREFUSED/ETIMEDOUT/ENOTFOUND/socket hang up`) up to `maxAttempts` (`aiCallWorker.ts:218-227`); webhook schedules retries on no-answer/busy with `retryGapMinutes` gap (`:103-115`). Working-hours-aware rescheduling (`:147-152`). Transcription failure → `[Transcription unavailable]`, lead still marked answered/WARM (`:196-199,:250-255`). LLM failure → fallback score 30/WARM (`:244-249`).
- `getExotelCallDetails` exists for polling if webhook missed (`exotelService.ts:109-131`) but no scheduler was found calling it.

### Config keys
Env: `REDIS_HOST/PORT/PASSWORD/DB` (BullMQ), `API_BASE_URL` (StatusCallback), OpenAI via `getOpenAI()`/`aiClients`. DB `AICallConfig`: `enabled, exotelAccountSid, exotelApiKey, exotelApiToken, exotelVirtualNumber, exotelAppId, questions, retry.*, scoring.*, whatsappFallback.*, llmModel, systemPrompt` (`models/AICallConfig.ts`). **Observation:** Exotel creds stored as plain schema strings, not encrypted (`:78-82`).

---

## 6. Email / SMS

- **Email:** **No email is sent to leads in the intake/qualification flow.** `emailService`/`sendEmail`/`sendMail` are not referenced in `leadController`, `leadScoringService`, `leadDistributionService`, or any intake integration above (grep produced no matches). Email is used elsewhere (welcome emails for user accounts, daily summary scheduler `server.ts:283`) but not as a lead-nurture channel. The only automated first-touch to a lead is **WhatsApp welcome** (`whatsAppWelcomeService.ts`).
- **SMS:** **No SMS integration exists** — no `twilio`/`sendSMS`/SMS provider references in `services/**` (grep produced no matches). "AI Voice Calling" (Exotel) is the only telephony channel.

---

## Integration Map

| Integration | Direction | Verification | Creates/Updates Lead? | Retry |
|---|---|---|---|---|
| Meta Lead Ads (webhook) | Inbound (POST) | HMAC X-Hub-Signature-256 — **conditional, fails-open** (`metaLeadAdsController.ts:224,226`) | Yes (create + update, dedup by phone) | No (webhook always 200; recoverable via manual /sync) |
| Meta Lead Ads (sync) | Inbound pull | `authMiddleware` (admin) | Yes (create + update) | No (per-lead errors skipped) |
| Google Ads (webhook) | Inbound (POST) | `google_key` OR HMAC — **conditional, fails-open** (`googleAdsController.ts:76`) | Yes (create + update, dedup by phone) | No (relies on Google's retries) |
| WhatsApp (webhook) | Inbound (POST) | **NONE** (`whatsappWebhookController.ts:211`) | Yes (create + update via conversation) | No |
| WhatsApp welcome/drip | Outbound (Cloud API) | N/A (Bearer token) | Reads/annotates leads | No |
| Google Sheets (poll) | Inbound pull | N/A (public CSV link) | Yes (create, dedup by phone+email) | No (re-polls every 5-10 min) |
| Google Sheets push-back | Outbound (POST) | **NONE / unsigned** (`googleSheetSyncService.ts:497`) | Reads leads | No (fire-and-forget) |
| Exotel AI call (outbound) | Outbound (Exotel REST) | HTTP Basic (apiKey/apiToken) | Updates lead (status/score) | **Yes** (worker + webhook, working-hours-aware) |
| Exotel webhook (status) | Inbound (POST) | **NONE** (`aiCallWebhookController.ts:29`) | Yes (update score/priority/assign) | Yes (schedules retry on no-answer/busy) |
| Email | — | — | **Not used for leads** | — |
| SMS | — | — | **Not present** | — |

---

### FACTS

**Integration map (Integration | Direction | Verification | Creates/Updates Lead? | Retry):**
- Meta Lead Ads webhook | Inbound POST | HMAC, conditional/fails-open | Yes | No
- Meta Lead Ads /sync | Inbound pull | authMiddleware (admin) | Yes | No
- Google Ads webhook | Inbound POST | key OR HMAC, conditional/fails-open | Yes | No
- WhatsApp webhook | Inbound POST | NONE | Yes | No
- WhatsApp welcome/drip | Outbound Cloud API | Bearer token | Annotates | No
- Google Sheets poll | Inbound pull | public CSV link (none) | Yes | No (re-polls)
- Google Sheets push-back | Outbound POST | NONE/unsigned | reads | No
- Exotel AI call | Outbound REST | HTTP Basic | Updates | Yes
- Exotel webhook | Inbound POST | NONE | Yes | Yes
- Email | — | — | Not used | —
- SMS | — | — | Not present | —

**Unverified / fails-open webhooks:**
- WhatsApp POST `/api/v1/whatsapp/webhook` — no signature check at all (`whatsappWebhookController.ts:211-223`).
- Exotel POST `/api/v1/ai-calls/webhook/exotel` — no auth/signature (`aiCallWebhookController.ts:29-31`).
- Meta POST `/api/v1/meta-leads/webhook` — HMAC only runs if `META_APP_SECRET` set AND `x-hub-signature-256` header present; absent header bypasses (`metaLeadAdsController.ts:222-235`).
- Google Ads POST `/api/v1/google-leads/webhook` — verification skipped entirely if `GOOGLE_ADS_WEBHOOK_KEY` unset (`googleAdsController.ts:76-84`).
- Google Sheets push-back outbound POST — unsigned (`googleSheetSyncService.ts:497-553`).
- Verify tokens default to hard-coded literals: `'codebegun_whatsapp_verify'` (`metaLeadAdsController.ts:185`, `whatsappWebhookController.ts:198`).

**Integrations WITH retry logic:** Exotel AI Voice Calling only — manual/self-scheduled retries in `aiCallWorker.ts:218-227` (transient net errors) and `aiCallWebhookController.ts:103-115` (no-answer/busy), working-hours-aware (`aiCallWorker.ts:147-152`). BullMQ `attempts:1` — no automatic queue retry (`aiCallQueueService.ts:31`). All other integrations have NO retry; inbound webhooks always return 200 and drop failed leads (Meta recoverable via manual /sync; Sheets recoverable via next 5-10 min poll).

**Credential storage:** Meta/WhatsApp tokens AES-256-CBC encrypted in `LeadSourceConfig`, key falls back to hard-coded literal if `ENCRYPTION_KEY`/`JWT_SECRET` unset and silently stores plaintext on encrypt failure (`leadSourceConfigController.ts:9,21`). Exotel creds stored as plain (unencrypted) schema strings (`models/AICallConfig.ts:78-82`). No STOP/opt-out handling in WhatsApp. No approved-template (HSM) sends — all WhatsApp outbound is free-form text (24h-window only); AICallConfig WhatsApp fallback is a log-only stub (`aiCallWorker.ts:234-246`).
