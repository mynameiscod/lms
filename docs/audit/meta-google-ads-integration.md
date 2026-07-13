# Meta Lead Ads & Google Ads Integration
**Completion:** 50%  |  **Priority:** P1  |  **Business Impact:** High

## Purpose & Business Goal
Ingest paid-ad leads into the CRM automatically and track ad spend/ROI. Meta Lead Ads (Facebook/Instagram Lead Forms) arrive via real-time webhook or manual sync; Google Ads Lead Form Extension submissions arrive via webhook. Both create/dedupe `Lead` docs, auto-score/assign, and (Meta) can trigger an AI qualification call. `AdCampaign` tracks budget/spend/UTM/ROI. `adScraperService` (Playwright) harvests competitor ads for intelligence. This is the top-of-funnel paid-acquisition pipe — highest business impact, but two of its four pieces are built-but-unwired.

## Primary Users & Roles
- **TENANT_ADMIN** — configures tokens (in Lead Sources), triggers sync, sets up webhook.
- Runs automatically for lead intake (webhook is public, unauthenticated).

## Key Files (traced)
- `server/src/controllers/metaLeadAdsController.ts` (897) + `routes/metaLeadAdsRoutes.ts` (25).
- `server/src/controllers/googleAdsController.ts` (194) + `routes/googleAdsRoutes.ts` (17).
- `server/src/models/AdCampaign.ts` (265) + `controllers/adCampaignController.ts` (**orphaned — no route mounts it**).
- `server/src/services/adScraperService.ts` (699, Playwright) — **dead code, no route/controller/cron**.
- Tokens: `LeadSourceConfig.metaAds` (encrypted).

## Dependencies & Connected Modules
- **Lead Management** (`createOrUpdateLeadFromData`, `linkLeadToCampaign`), **Lead Scoring** (`scoreAndAssignLead`), **AI Voice Calling** (`enqueueAICall` on new Meta lead), **WhatsApp** (welcome on Google lead), **LeadSourceConfig** (encrypted tokens).

## Entry / Exit Points
- Meta: `GET /meta-leads/webhook` (public verify), `POST /meta-leads/webhook` (public handler), `POST /meta-leads/sync` (auth, **no roleGuard**), `POST /meta-leads/setup-webhook` (auth, **no roleGuard**).
- Google: `GET /google-leads/webhook` (public, returns "OK"), `POST /google-leads/webhook` (public, `google_key`/HMAC verified).
- AdCampaign CRUD/dashboard: controller exists but **no routes** → unreachable.

## Database Tables & Relationships
- `Lead` — created with `source:'meta_form'|'google_ads'`, `sourceDetails{platform,formId,adId,campaignName,adSetName,adName}`, `utmParams`, `campaignId`.
- `LeadSourceConfig.metaAds` — `pageId`, `formIds`, encrypted `pageAccessToken`/`appSecret`/`appId`.
- `AdCampaign` — budget/spend/dates/UTM (lowercased+required)/targeting/embedded `metrics` (impressions/reach/clicks/leads/cpl/cpc/ctr), virtuals `roi` (**hardcoded `estimatedLeadValue = ₹5000`**), `budgetUtilization`; 5 indexes incl. UTM attribution.

## Events / Notifications / Emails / WhatsApp
- New Meta lead → `enqueueAICall` (optional). New Google lead → WhatsApp welcome. Auto-score/assign on both.

## AI Features (which model, or "None")
No native LLM in this cluster. Indirect: enqueues an AI qualification voice call (see `ai-voice-calling.md`). Ad scraper is DOM-heuristic, not AI.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| Meta Graph API **v19.0** | Fetch leads, subscribe webhook | Free (rate-limited) | Page Access Token + App Secret; tokens encrypted in DB |
| Google Lead Form webhook | Receive Google Ads leads | Free | Shared-secret `google_key`; no Google Ads API/OAuth |
| Playwright (chromium headless) | Competitor ad scraping | Self-hosted VPS compute (free, heavy) | **Dead code** — never invoked; brittle anti-bot |

## Validation Rules & Edge Cases
- Phone normalization (`normalizeIndianPhone`) deliberately avoids naive `^91` strip. Dedupe by last-10-digit phone. Meta requires phone; Google requires phone OR email. Google skips `is_test` in prod. Many Meta field-name variants handled.
- Webhook 200-ACKs immediately, processes async.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 65 | Meta+Google intake production-grade; AdCampaign controller unrouted, scraper dead. |
| Frontend/UI | 20 | Only 2 Meta buttons (sync/setup-webhook); no campaign UI, no scraper UI. |
| API | 55 | Meta (4) + Google (2) solid; campaign/scraper endpoints entirely missing. |
| Database | 90 | Lead/LeadSourceConfig/AdCampaign fully modeled with indexes/virtuals. |
| Automation | 45 | Meta real-time webhook + Google webhook work; no Meta sync cron; scraper never scheduled. |
| AI | 30 | Only indirect AI-call enqueue. |
| Testing | 15 | Ad-hoc JS diagnostic scripts only (`diagnose-meta-leads.js`); no unit tests. |
| **Overall** | **50** | Lead-intake half is production-grade; campaign analytics + scraper are built-but-unwired. |

## Gaps (mark "Not Implemented")
- **Ad Scraper (699 lines): 100% dead code** — no controller/route/cron/import.
- **AdCampaign CRUD + dashboard: orphaned** — no route mounts it; no frontend. Only `linkLeadToCampaign` runs.
- **Meta HMAC verification flawed:** hashes `JSON.stringify(req.body)` (re-serialized) not raw bytes, uses `!==` (not `timingSafeEqual`), and **fails open** on mismatch/missing header. `req.rawBody` is captured in `app.ts` but unused.
- `/meta-leads/sync` & `/setup-webhook` lack roleGuard — any authed user (even student) can call.
- **Hardcoded:** webhook callback URL, verify-token fallback (`codebegun_whatsapp_verify`), ROI lead value ₹5000, `DEBUG=true` (logs partial tokens in prod).
- Google GET verification is bare `"OK"` (no challenge). Google verify skipped entirely if `GOOGLE_ADS_WEBHOOK_KEY` unset.
- No Meta sync cron (manual only); campaign metrics never auto-imported.
- **Testing:** Not Implemented (only ad-hoc scripts).

## Technical Debt / Performance / Security / Scalability
- **Security (high):** flawed/fail-open Meta HMAC, unauthenticated sync/setup, plaintext-token logging via `DEBUG=true`.
- **Debt:** ~1200 lines of built-but-unwired code (scraper + campaign) — decide wire-or-delete.
- **Scalability:** scraper is brittle to anti-bot and login walls (Google/LinkedIn largely fail).

## Suggestions & AI Opportunities
- Fix Meta HMAC to use `req.rawBody` + `timingSafeEqual`; add roleGuards; disable `DEBUG`. Wire AdCampaign routes + a spend/ROI dashboard, or remove. Add a Meta sync cron for missed webhooks. Make ROI lead value tenant-configurable.
- **AI:** AI ad-copy/creative analysis from scraped competitor ads; AI attribution/spend-optimization recommendations; auto-map ad form fields to CRM fields via LLM.

## Estimated Dev Effort
- Security fixes: 2–3 days. Wire AdCampaign + dashboard: 5–7 days. Decide/rebuild or remove scraper: 3–5 days. Meta sync cron: 1 day. Tests: 2–3 days. **Total to ~80%: ~3–4 weeks.**
