# Cost & Third-Party Integration Rollup

**Scope:** Every external service the CodeBegun LMS platform talks to, traced from `server/package.json`, `client/package.json`, `server/src/config/settingsRegistry.ts`, and `grep process.env.*` across `server/src`. Pricing in **₹ INR**. Monthly cost estimated at **small scale = 200 active students, single tenant** unless noted. USD→INR taken at the app's own default `USD_TO_INR = 85` (`aiGateway.ts:28`).

> **Key architectural fact:** Almost every integration key is read at call time from **Platform Settings (DB via `settingsService`)** with `process.env` fallback (`settingsService.get`). So most of these are *optional* and degrade gracefully (services return `null`/throw a "not configured" error and callers fall back). Only MongoDB, SMTP, and JWT secret are truly load-bearing at boot.

---

## 1. Master Integration Inventory

| # | Service | Category | Purpose | Where used (file) | Config keys | Load-bearing? |
|---|---------|----------|---------|-------------------|-------------|---------------|
| 1 | **Anthropic Claude** | AI/LLM | Primary/fallback LLM for lesson gen, interview brain, assessment scoring, career review, lead AI, roadmaps | `aiClients.ts`, `aiGateway.ts`, `aiService.ts`, many `*Service.ts` | `ANTHROPIC_API_KEY` | Feature-gated (optional) |
| 2 | **OpenAI (GPT + Whisper)** | AI/LLM + STT | Default cheap LLM (`gpt-4o-mini`) + Whisper transcription (speaking/communication/sales-call/interview) | `aiClients.ts`, `aiGateway.ts`, `speakingService.ts`, `salesCallRecordingService.ts` | `OPENAI_API_KEY`, `OPENAI_MODEL` | Feature-gated |
| 3 | **100ms (hundred-ms)** | Live video | Live Classes webinar (broadcaster/viewer/stage), HLS for 500+, recordings | `hmsService.ts`, `liveClassRecordingService.ts` | `HMS_APP_ACCESS_KEY`, `HMS_APP_SECRET`, `HMS_TEMPLATE_ID` | Feature-gated |
| 4 | **Bunny.net Storage** | Object storage | Resource Library (project ZIPs/docs, up to ~1 GB streamed) | `bunnyStorageService.ts`, `bunnyController.ts` | `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_ACCESSKEY`, `BUNNY_STORAGE_HOSTNAME` | Feature-gated |
| 5 | **Bunny.net Stream** | Video CDN | Live-class recording storage/playback (HLS, iframe embed) | `liveClassRecordingService.ts`, `bunnyController.ts` | `BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_API_KEY`, `BUNNY_STREAM_CDN_HOSTNAME` | Feature-gated |
| 6 | **Razorpay** | Payments | Fee/seat-reservation online payments (order create + signature verify) | `razorpayService.ts`, `seatReservationController.ts` | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (via settings) | Feature-gated |
| 7 | **UPI (manual)** | Payments | Fallback "pay to this UPI ID" for seat reservation (no gateway fee) | `seatReservationController.ts:699` | `UPI_ID` | Feature-gated |
| 8 | **ElevenLabs** | TTS | Natural voice for AI interviewer (turbo v2.5) | `elevenLabsService.ts` | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `INTERVIEW_VOICE_PROVIDER` | Feature-gated (default `browser` TTS = ₹0) |
| 9 | **D-ID** | AI avatar | Talking-head video avatar for AI interviewer (WebRTC Streams) | `didService.ts` | `DID_API_KEY`, `INTERVIEW_AVATAR_PROVIDER` | Feature-gated (default `animated` = ₹0) |
| 10 | **Exotel** | Telephony | Outbound AI voice calls to leads (IVR + record) | `exotelService.ts`, `aiCallWorker.ts` | `EXOTEL_*` (SID/token/subdomain via settings), `API_BASE_URL` | Feature-gated |
| 11 | **Piston (self-hosted)** | Code exec | Run/grade student code (playground, assignments, DSA practice) | `codeRunnerService.ts` | `PISTON_URL` | Self-hosted (₹0 marginal) |
| 12 | **GitHub API** | Dev / scoring | Candidate GitHub scoring (Career DNA), playground push, career review, OAuth login | `assessmentProfileScoreService.ts`, `careerReviewService.ts`, `playgroundController.ts`, `oauthController.ts` | `GITHUB_API_TOKEN`, `GITHUB_CLIENT_ID/SECRET/CALLBACK_URL` | Feature-gated (unauth 60/hr fallback) |
| 13 | **LinkedIn OAuth** | Auth | Student profile connect | `oauthController.ts` | `LINKEDIN_CLIENT_ID/SECRET/CALLBACK_URL` | Feature-gated |
| 14 | **Google Sheets** | Lead intake | Poll a public sheet CSV → import leads (every 5 min) | `googleSheetSyncService.ts` | (public CSV URL, **no API key**) | Feature-gated |
| 15 | **Meta WhatsApp Cloud API** | Messaging | OTP (assessment), welcome msgs, drip campaigns, seat-reservation confirmations, lead replies | `assessmentOtpService.ts`, `whatsAppDripService.ts`, `whatsAppWelcomeService.ts`, `whatsappWebhookController.ts`, `seatReservationController.ts` | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_OTP_TEMPLATE*` | Feature-gated |
| 16 | **Meta Lead Ads** | Lead intake | Webhook + Graph API sync of FB/IG lead-form submissions | `metaLeadAdsController.ts` | `META_APP_SECRET`, `PAGE_ACCESS_TOKEN`, `META_LEAD_VERIFY_TOKEN` | Feature-gated |
| 17 | **Google Ads** | Lead intake | Webhook (lead form extension) → create lead | `googleAdsController.ts` | `GOOGLE_ADS_WEBHOOK_KEY`, `GOOGLE_ADS_DEFAULT_TENANT_ID` | Feature-gated |
| 18 | **IMAP + SMTP (Hostinger)** | Email | Transactional/drip send (SMTP) + placement-partner reply polling (IMAP) | `emailService.ts`, `partnerReplyService.ts`, `partnerReplyCron.ts` | `EMAIL_SERVICE/USER/PASSWORD/FROM`, `SMTP_*`, IMAP creds via settings | **Load-bearing** (all transactional email) |
| 19 | **Brevo (Sendinblue)** | Email (fallback) | Daily-summary email API fallback path | `dailySummaryCron.ts:119` | `BREVO_API_KEY` | Optional fallback |
| 20 | **Playwright** | Scraping | Ad/competitor scraping (adScraperService) headless browser | `adScraperService.ts` (dep `playwright`) | — (self-run) | Optional (₹0 marginal) |
| 21 | **BullMQ + Redis** | Queue | AI voice-call job queue + worker | `aiCallQueueService.ts`, `aiCallWorker.ts` | `REDIS_HOST/PORT/PASSWORD/DB` | Required only if AI calls used |
| 22 | **Socket.io** | Realtime | In-app notifications, live-class WebRTC signaling, hot-lead alerts | `server.ts` (in-process) | — (bundled) | Bundled (₹0) |
| 23 | **MongoDB** | Database | Primary datastore (Mongoose) | `config/database.ts` | `MONGODB_URI`/`MONGO_URL` | **Load-bearing** |

---

## 2. Pricing Model & Monthly Cost Estimate (₹ INR, ~200 active students)

Assumptions: single VPS (already owned, `187.124.97.56`), one tenant, moderate AI usage, no paid live-class scale-out yet. USD converted at ₹85/USD.

| Service | Pricing model (₹) | Est. monthly @ 200 students | Notes / cost drivers |
|---------|-------------------|-----------------------------|----------------------|
| **Anthropic Claude** | Haiku 4.5 ~₹85/M in, ₹425/M out; Sonnet ₹255/₹1,275 per M; Opus ₹1,275/₹6,375 per M (from `PRICE` in `aiGateway.ts`) | **₹1,500–6,000** | Fallback model = Haiku (cheap). Heavy paths: lesson gen (~7 scenes), interview brain, roadmaps. Cost scales with lessons generated, not headcount. |
| **OpenAI GPT** | `gpt-4o-mini` ₹12.75/M in, ₹51/M out; `gpt-4o` ₹212/₹850 per M | **₹800–3,000** | Default provider for most `aiComplete` calls (cheap `gpt-4o-mini`). |
| **OpenAI Whisper** | ₹0.51/audio-min (`$0.006`, `aiGateway.ts:20`) | **₹300–1,500** | Speaking practice + communication lab + sales-call + interview transcription. Driver = minutes of audio. 200 students × ~15 min/mo ≈ 3,000 min ≈ ₹1,530. |
| **100ms** | ~₹0.24/participant-min (typical ₹/min); recordings extra | **₹0 (unused) → ₹15,000+** if live classes run daily | Big variable cost. 500-viewer HLS webinar for 2h ≈ heavy. Not active per memory. |
| **Bunny Storage** | ~₹0.85/GB/mo storage + ~₹0.85/GB egress | **₹200–800** | Project ZIPs/docs. Cheap. |
| **Bunny Stream** | ~₹0.85/GB storage + ~₹0.42–0.85/GB delivery | **₹500–3,000** if recordings on | Scales with recorded-class hours × viewers. |
| **Razorpay** | 2% per transaction (no monthly fee) | **~2% of collected fees** | e.g. ₹10L fees collected → ₹20,000 gateway fee. Pass-through cost, revenue-linked. |
| **UPI (manual)** | ₹0 | **₹0** | Manual reconciliation, no gateway. |
| **ElevenLabs** | ~₹1,800/mo Creator (100k chars) or usage | **₹0 (default browser TTS)** | Only if `INTERVIEW_VOICE_PROVIDER=elevenlabs`. |
| **D-ID** | ~₹1,500–4,000/mo tiered by video-min | **₹0 (default animated)** | Only if avatar provider = `did`. |
| **Exotel** | ~₹0.60–1.10/call-min + platform ~₹2,000+/mo | **₹0 (unless AI calls run)** | Lead qualification voice calls. |
| **Piston** | Self-hosted (docker-compose) | **₹0 marginal** | Runs on the VPS. Only CPU. |
| **GitHub API** | Free (5,000/hr with token) | **₹0** | Token only raises rate limit. |
| **LinkedIn / GitHub OAuth** | Free | **₹0** | OAuth apps free. |
| **Google Sheets** | Free (public CSV export) | **₹0** | No API key, no quota cost. |
| **Meta WhatsApp Cloud API** | Utility/auth conversations ~₹0.13–0.35 each; first 1,000 free/mo | **₹200–1,500** | OTP + welcome + drip. Marketing templates cost more. |
| **Meta Lead Ads** | Free (webhook/Graph) | **₹0** (ad spend separate) | Only Graph API, no per-call fee. |
| **Google Ads** | Free (webhook) | **₹0** (ad spend separate) | |
| **SMTP/IMAP (Hostinger)** | Bundled with hosting (~₹0) | **~₹0** | Rate-limited; paced via `SMTP_MIN_SEND_GAP_MS`. Volume cap risk. |
| **Brevo** | Free ≤300 emails/day; paid ~₹1,600+/mo | **₹0 (free tier)** | Only a summary-email fallback. |
| **Playwright** | Free (self-run) | **₹0** | CPU/bandwidth only. |
| **Redis (BullMQ)** | Self-host ₹0, or managed ~₹500–1,500/mo | **₹0–1,500** | Only needed for AI voice calls. |
| **Socket.io** | Bundled | **₹0** | In-process; single instance (no Redis adapter). |
| **MongoDB** | Self-host ₹0, or Atlas M10 ~₹4,800/mo | **₹0 (VPS) → ₹4,800 (Atlas)** | Currently VPS-hosted. |
| **VPS hosting** | Fixed | **~₹1,500–4,000** | Single VPS running blue/green. |

### Estimated realistic monthly total @ 200 students (current feature usage)
- **Active-today baseline (AI light, no live classes, no paid voice/avatar):** **≈ ₹4,000–12,000/mo** (dominated by Claude + OpenAI + Whisper + WhatsApp + VPS).
- **Plus Razorpay:** ~2% of any online fee collections (revenue-linked, not fixed).
- **If Live Classes (100ms) + recordings turn on daily:** add **₹15,000–30,000+/mo** — this becomes the single largest line item.
- **If AI voice calls (Exotel) + ElevenLabs + D-ID enabled:** add **₹5,000–15,000/mo**.

---

## 3. Cost-Control Observations (from real code)

- **Good:** `aiGateway` defaults to the cheapest models (`gpt-4o-mini` primary, `claude-haiku-4-5` fallback) and logs every call's cost to `AiUsage` in both USD and INR (`recordUsage`), so spend is observable in the **AiSpend** page.
- **Good:** almost all paid integrations are behind `settings.getStr(...)` "enabled" checks and fall back to free alternatives (browser TTS, animated avatar, simulation code-runner, public-CSV sheets) — nothing is force-on.
- **Risk:** `priceFor()` uses a hard-coded price table (`aiGateway.ts:8-19`) and a fixed `USD_TO_INR=85` default — model-price or FX drift silently mis-reports spend until someone updates the table/setting.
- **Risk:** SMTP is the only email path by default (Hostinger, rate-limited). At 200+ students a burst (welcome/drip) can trip throttling; mitigated by `SMTP_MIN_SEND_GAP_MS` pacing but there is no queue/backpressure — a true email provider (Brevo/SES paid) is advisable before scale.
- **Risk:** Socket.io runs single-instance in-memory (`liveSessions` Map in `server.ts`) with **no Redis adapter** — horizontal scaling of realtime/live-class signaling is not possible without refactor.
- **Risk:** 100ms and Bunny Stream are the cost bombs — usage-metered and unbounded. No per-tenant cost cap or budget alert exists.
- **Untracked spend:** 100ms, Bunny, Razorpay fees, WhatsApp, Exotel costs are **NOT** captured in `AiUsage` — only LLM/Whisper spend is dashboarded. There is no unified platform-cost dashboard.

## 4. Recommendations
1. Add a **unified cost ledger** (extend `AiUsage` or a new `PlatformCost` model) to capture 100ms minutes, Bunny GB, WhatsApp conversations, Razorpay fees, Exotel minutes — not just LLM tokens.
2. Add **per-tenant monthly budget caps + alerts** on the metered services (100ms, Bunny, LLM) before enabling live classes at scale.
3. Move transactional email to a **paid provider with a queue** (Brevo/SES) once volume > ~500 sends/day; keep SMTP as fallback.
4. Make the `PRICE`/`USD_TO_INR` table **admin-editable in Platform Settings** (partially supported via `AI_PRICE_*` overrides) and surface a "prices last verified" date.
5. Add a **Redis Socket.io adapter** before multi-instance scaling of realtime features.
