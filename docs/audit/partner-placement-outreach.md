# Placement Partnership (formerly Partner / Placement Outreach)
**Completion:** 86%  |  **Priority:** P2  |  **Business Impact:** High

> **Change log (2026-07-14, AI-written copy):** Intro + follow-up emails are now **LLM-personalised per company** via `outreachAIService` (aiGateway, prefer Claude → OpenAI fallback, module `placement_outreach`, cost-logged). The AI writes only the message (greeting→pitch→ask); the fixed CodeBegun signature is appended (`outreachSignature`). Degrades gracefully to the hand-written template if AI is disabled/unconfigured/slow/returns junk — a send never fails on AI. Per-tenant toggle `PLACEMENT_AI_COPY` (default on). This lifts the module's **AI dimension off 0%**. Remaining AI gaps: reply classification/auto-routing + AI candidate↔company matching.

> **Change log (2026-07-14, Candidate Proof Profile):** New **shareable, HR-facing candidate proof page** — the "send proof, not a resume" artifact from the Placement Bridge vision. New `CandidateProofProfile` model (token per student), `candidateProofService.buildProofProfile()` aggregates live from Skill Assessment (readiness/percentile/sub-scores), best published `InterviewAttempt` (mock grade + strengths/weaknesses), `CommunicationAttempt`+streak, `CareerProfile` (resume/GitHub/LinkedIn scores), `ProjectPlan`, `Resume`, `Certificate` — respecting release gates + the candidateUserId/String-tenantId gotchas. Public route `GET /public/proof/:token` (no auth, mounted before generic /public) + client page `/candidate/:token`; contact routed via CodeBegun (no student email/phone leaked). Placement team publishes/copies the link from the **student detail page** (`ProofPanel` on `/users/:userId`). Admin routes `/candidate-proof/:studentId` (get/publish/unpublish), placement-gated.

> **Change log (2026-07-13, Phase 1):** Renamed to **Placement Partnership** and **simplified to a focused outreach-only flow**. Student-matching, candidate-PDF, interview-scheduling, and mark-placed removed (UI + endpoints) — recoverable from git history. New UI: contact list by status + drawer (send intro → auto follow-up → reply thread). Route `/admin/partners` → `/admin/placement-partnership`.
>
> **Change log (2026-07-14, openings/hiring signal):** "Add by Company" now also returns a **company card** — firmographics from Apollo org search (industry, employee count, LinkedIn, logo) + an open-roles badge if Apollo exposes one on the plan — and **one-click "View openings" deep-links** to the company's LinkedIn Jobs and Google Jobs. The openings links are constructed URLs (`buildHiringLinks`) that work **without any Apollo API/plan** (even on Free); firmographics/contacts need a paid Apollo plan. Also fixed the Apollo base URL (`/api/v1`) and header-only key + precise 401/402/403 error messages.
>
> **Change log (2026-07-13, polish):** **Branded email template + final copy.** Cold/follow-up/reply emails render through a redesigned `brandedHtml`: **white header with the CodeBegun logo** (`/assets/logo.png`, overridable via `PARTNER_EMAIL_LOGO_URL`) + tagline, teal accent, formatted paragraphs, "•" bullet lists, a styled signature block, compliant footer. Subject: *"Pre-screened Java Full Stack freshers ready for interview | CodeBegun"*. Copy is the founder's HR intro (skills list, screening, no-fee, clear ask) with a full signature (Siva Prasad Galaba · Founder — CodeBegun · Madhapur, Hyderabad · phone/email/site). **CodeBegun branding only** (no "Savas Tech" references). ⚠️ **Deliverability:** the sending domain was flagged by Hostinger for **missing SPF/DKIM/DMARC** — fix those DNS records or outreach may land in spam regardless of design.
>
> **Change log (2026-07-13, Phase 2 — BUILT):** **"Add by Company" Apollo enrichment.** New `contactEnrichmentService.ts` (Apollo People Search: company/domain → HR / talent / hiring-manager / decision-maker / CEO contacts with confidence from Apollo's email-verification status; best-effort org-domain resolve). New endpoint `POST /placement-partners/enrich` + `EnrichModal` UI (enter company → pick a contact → creates the partner → send intro). New per-tenant secret `APOLLO_API_KEY` in Platform Settings → Placement Outreach. Degrades gracefully (`configured:false`) until the key is set; locked Apollo emails are surfaced but flagged low-confidence. **Note:** revealing locked emails uses Apollo credits; multi-contact-per-company (one partner per company today) is a future enhancement.

## Purpose & Business Goal
Focused tool for the placements team to **reach out to hiring companies and convert them into placement partners**. Flow: add a contact (paste from LinkedIn, or — Phase 2 — enter a company and auto-enrich HR/decision-maker/CEO) → send a CodeBegun intro (who we are, our students, projects they've shipped) → **automated cold + follow-up cadence (paced/capped)** → replies pulled back via IMAP into a thread → reminders mirrored to Todoist. Student matching / interview / placement tracking are **out of scope here** (handled later, elsewhere). Directly drives placement revenue, hence High impact.

## Primary Users & Roles
- **TENANT_ADMIN / placement team** (`manage_leads` OR `manage_tenant`) — every management endpoint is guarded to this pair.
- **Public** (unauthenticated) — one-click unsubscribe only.

## Key Files (traced)
- Models: `PlacementPartner.ts` (148), `PartnerTask.ts` (39), `PartnerOutreachMessage.ts` (68), `PartnerInboundMessage.ts` (55), `PartnerSuppression.ts` (30). (`PlacementDrive.ts` is unrelated.)
- Services: `partnerOutreachService.ts` (371, nodemailer SMTP), `partnerReplyService.ts` (191, IMAP via imapflow+mailparser), `partnerRetentionService.ts` (36), `partnerTaskService.ts` (68, Todoist REST), `partnerEmailAssets.ts` (67), `outreachTemplates.ts` (static copy).
- Controllers: `placementPartnerController.ts` (404), `partnerOutreachController.ts` (210), `partnerTaskController.ts` (97), `partnerPublicController.ts` (33).
- Crons: `partnerOutreachCron.ts` (5 min), `partnerReplyCron.ts` (10 min), `partnerRetentionCron.ts` (daily) — all `setInterval`, wired in `server.ts:314-320`.
- Frontend: `PartnerPipeline/index.tsx` (726) — Kanban + drawer + approvals + analytics + reminders + threaded reply.

## Dependencies & Connected Modules
- **EmailService** (nodemailer, Hostinger SMTP — shared app mailbox), **Todoist** (direct REST, per-tenant token), **candidate PDF generator**, **User/Student** (matching + one-pagers). Separate from admissions `Lead`.

## Entry / Exit Points
- 35+ endpoints across 4 controllers: partner CRUD/import/analytics/stages/match-students/candidates/PDF/schedule-interview/mark-placed/attachments; outreach start/bulk/reply/thread/mark-replied/bounced/draft-vouch/queue/approve/cancel; tasks list/complete/snooze/add; public `GET /public/partner-unsubscribe/:token`.

## Database Tables & Relationships
- `PlacementPartner` (root): companyName + `companyKey` (dedupe), tier/priority/fresherFit, stage + stageHistory[], embedded `outreach{status,emailsSent,lastEmailAt,repliedAt,bouncedAt,stoppedReason}`, `placement{studentId,ctc,placedAt,guaranteeEndsAt}`, candidates[], interviews[]. Unique `(tenantId, companyKey)`.
- `PartnerTask` (kind reply/interested/checkin/guarantee/manual, todoistId, open), `PartnerOutreachMessage` (type cold/followup/vouch/candidate_profile/reply, status, requiresApproval, messageId for threading), `PartnerInboundMessage` (unique `(tenantId, messageId)`, matchedBy), `PartnerSuppression` (unique `(tenantId, email)`).
- Partner 1—N Task/OutreachMessage/InboundMessage; Suppression keyed on email (survives partner deletion).

## Events / Notifications / Emails / WhatsApp
- SMTP cold/follow-up (auto), vouch/candidate-profile (approval-gated), threaded replies. `List-Unsubscribe` + one-click headers + signed unsubscribe URL.
- Todoist tasks on: reply, stage→interested, interview scheduled, guarantee expiring, quarterly check-in, inbound after sequence, manual. **One-way push** (completing in-app doesn't sync back to Todoist).

## AI Features (which model, or "None")
**None.** All outreach copy is hand-written static templates (per-tier cold + follow-ups + vouch) with token substitution. Student matching is keyword/token-overlap scoring, not AI.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| Hostinger SMTP (nodemailer) | Outbound email | Near-free (mailbox incl.) | Daily cap 25 + 20-min gap for deliverability/throttle |
| Hostinger/Gmail IMAP (imapflow) | Reply polling | Near-free | Same mailbox; 10-min poll, BODY.PEEK keeps mail unread |
| Todoist REST API | Reminders mirror | ₹0 (free tier; optional, degrades gracefully) | Per-tenant token |
| Apollo.io People Search | "Add by Company" contact enrichment (HR/decision-maker/CEO) | ~₹4,000–6,500/mo (tiered; free trial) | Per-tenant `APOLLO_API_KEY`; email reveal uses credits |

## Validation Rules & Edge Cases
- Suppression checked at start AND every send (double); one-click unsubscribe.
- CSV import upsert by `companyKey` (never clobbers pipeline state); manual create 409 on dup; inbound deduped by messageId.
- `deliverMessage` claims via atomic `findOneAndUpdate` status guard (no double-send); daily cap + min-gap; one message per tick.
- Follow-ups chained +3 days up to 3, then sequence stopped. Missing contact name → held for approval.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 90 | Full send/cadence/suppression/reply/retention with atomic concurrency guards; gaps are auto-bounce + Todoist write-back. |
| Frontend/UI | 90 | Complete Kanban + drawer + approvals + analytics + reminders + threaded reply; no auto-refresh/websocket. |
| API | 95 | 35+ endpoints cover the entire lifecycle; consistent guarding + error handling. |
| Database | 95 | 5 well-indexed tenant-scoped models with correct unique/dedup indexes; one unused field (`nextEmailAt`). |
| Automation | 85 | 3 schedulers run end-to-end with caps + auto-stop + auto-tasks; docked for polling-only IMAP + no auto-bounce→suppression. |
| AI | 0 | No AI — static templates + keyword matching. |
| Testing | 0 | No tests. |
| **Overall** | **80** | Production-shaped, coherent, deployable; missing AI copy, automated bounce handling, bidirectional Todoist, and tests. |

## Gaps (mark "Not Implemented")
- **No AI copy generation** — every email is a static template; "personalization" = name/company/angle substitution.
- **No automated bounce detection** — bounces are manual button clicks; IMAP poller doesn't parse NDR/mailer-daemon into suppressions (`PartnerSuppression.reason:'bounced'` never auto-written).
- **Todoist sync one-way** — completing/snoozing in-app doesn't update Todoist; no webhook back.
- `toHtml` in `outreachTemplates.ts` exported+imported but unused (dead import); `nextEmailAt` declared but never written.
- No open/click tracking (deliberate — image-free for deliverability), no A/B testing, no send-time optimization.
- IMAP polling-only (10-min latency); no IDLE/push.
- **Testing:** Not Implemented.

## Technical Debt / Performance / Security / Scalability
- **Security:** unsubscribe token is HMAC-signed (good); management endpoints properly guarded.
- **Reliability:** manual bounce handling → suppression list can drift; deliverability risk mitigated by caps but not by real bounce feedback.
- **Debt:** dead `toHtml`/`nextEmailAt`; stale "scaffolded for later" model comments.
- **Scale:** per-tenant crons + one-message-per-tick pacing is conservative but safe.

## Suggestions & AI Opportunities
- Add NDR/bounce parsing in the IMAP poller → auto-suppress. Bidirectional Todoist sync (webhook). Move IMAP to IDLE for low-latency replies. Add tests for cadence/suppression/threading.
- **AI:** LLM-personalized cold/follow-up copy per company + role; AI reply classification (interested/not/OOO) to auto-route; AI candidate-to-partner matching (embeddings over JD + resume) replacing keyword overlap; AI-drafted reply suggestions in the thread composer.

## Estimated Dev Effort
- Auto-bounce → suppression: 2–3 days. Bidirectional Todoist + IMAP IDLE: 3–4 days. AI copy + reply classification: 4–6 days. Tests: 2–3 days. **Total to ~92%: ~2.5–3 weeks.**
